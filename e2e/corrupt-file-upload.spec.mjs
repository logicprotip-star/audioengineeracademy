// G296 (bölüm 2, OLCUM-GUVENLIK-18-08 madde 11) — bozuk/kesik/tamamen
// sessiz bir ses dosyası SESSİZCE kabul edilmemeli (ölçüldü: önceden ~100
// baytlık kesik bir dosya "0:00" süreyle kütüphaneye SESSİZCE ekleniyordu).
// KABUL KRİTERİ: bozuk dosya yüklenince ANLAŞILIR bir mesaj çıkıyor,
// GEÇERLİ dosyalar (1-2sn'lik KISA dosyalar DAHİL — task'ın kendi kısıtı)
// ETKİLENMİYOR.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage } from "./helpers/app-fixtures.mjs";

let serverHandle, browser, tmpDir;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
  tmpDir = fs.mkdtempSync("/tmp/aea-corrupt-upload-");
});

after(async () => {
  await browser.close();
  await serverHandle.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeWav(fname, { numChannels = 1, sampleRate = 44100, numFrames, silent = false, truncateAfterBytes = null }) {
  const blockAlign = numChannels * 2;
  const dataSize = numFrames * blockAlign;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + dataSize, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numChannels, 22); buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * blockAlign, 28); buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(dataSize, 40);
  if (!silent) {
    for (let i = 0; i < numFrames; i++) {
      const v = Math.round(Math.sin(i * 0.1) * 20000);
      for (let ch = 0; ch < numChannels; ch++) buf.writeInt16LE(v, 44 + (i * numChannels + ch) * 2);
    }
  }
  const out = truncateAfterBytes != null ? buf.subarray(0, 44 + truncateAfterBytes) : buf;
  const filePath = path.join(tmpDir, fname);
  fs.writeFileSync(filePath, out);
  return filePath;
}

async function uploadAndObserve(page, filePath) {
  await page.locator('.tab[data-tab="tools"]').click();
  await page.waitForTimeout(300);
  await page.locator("#toolsGearBtn, #toolsUploadBtn").first().click();
  await page.waitForTimeout(300);
  const beforeCount = await page.locator("#toolsFilesList .tools-files-row").count();
  await page.locator("#toolsFileInput").setInputFiles(filePath);
  await page.waitForTimeout(1500);
  const toastText = await page.evaluate(() => document.querySelector(".toast")?.textContent || null);
  const afterCount = await page.locator("#toolsFilesList .tools-files-row").count();
  return { toastText, added: afterCount > beforeCount };
}

async function freshPage() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  return { page, errors };
}

test("KABUL KRİTERİ — 0 saniyelik dosya (0 veri çerçeveli WAV) reddedilir, ANLAŞILIR mesaj çıkar", async () => {
  // Not: 0 çerçeveli bir WAV, decodeAudioData/decodeWavPcm'in KENDİ ÖNCEDEN
  // VAR OLAN "boş data chunk" hatasına düşüyor (evaluateDecodedAudio'ya hiç
  // ULAŞMIYOR, `buffer` zaten null) — bu yüzden "Bu dosya açılamadı" (ESKİ,
  // G296'dan ÖNCE de var olan) mesajı görülüyor, "Dosya bozuk görünüyor"
  // (YENİ) DEĞİL. İKİSİ de kullanıcıya AÇIK/anlaşılır — hangi mesajın
  // çıktığı değil, dosyanın REDDEDİLMESİ bu testin KABUL KRİTERİ'si.
  const { page, errors } = await freshPage();
  const filePath = writeWav("zero_sec.wav", { numFrames: 0, silent: true });
  const { toastText, added } = await uploadAndObserve(page, filePath);
  assert.ok(!added, "0 saniyelik dosya kütüphaneye EKLENMEMELİYDİ");
  assert.ok(toastText && (/bozuk/i.test(toastText) || /açılamadı/i.test(toastText)), `mesaj anlaşılır/açık değil: ${toastText}`);
  assert.deepEqual(errors, []);
  await page.close();
});

test("KABUL KRİTERİ — kesik/yarım dosya (header 2sn vaat ediyor, ~100 bayt veriden sonra kesik) reddedilir", async () => {
  const { page, errors } = await freshPage();
  const filePath = writeWav("truncated.wav", { numFrames: 44100 * 2, truncateAfterBytes: 100 });
  const { toastText, added } = await uploadAndObserve(page, filePath);
  assert.ok(!added, "kesik dosya kütüphaneye EKLENMEMELİYDİ (önceden SESSİZCE '0:00' olarak ekleniyordu)");
  assert.ok(toastText && /bozuk/i.test(toastText), `mesaj anlaşılır/açık değil: ${toastText}`);
  assert.deepEqual(errors, []);
  await page.close();
});

test("KABUL KRİTERİ — tamamen sessiz dosya (2sn, tüm örnekler 0) reddedilir, ayrı bir mesajla", async () => {
  const { page, errors } = await freshPage();
  const filePath = writeWav("silent.wav", { numFrames: 44100 * 2, silent: true });
  const { toastText, added } = await uploadAndObserve(page, filePath);
  assert.ok(!added, "tamamen sessiz dosya kütüphaneye EKLENMEMELİYDİ");
  assert.ok(toastText && /sessiz/i.test(toastText), `mesaj 'sessiz' demiyor: ${toastText}`);
  assert.deepEqual(errors, []);
  await page.close();
});

test("REGRESYON KORUMASI — GEÇERLİ ama ÇOK KISA dosyalar (1sn, 2sn — gerçek ses içeren) REDDEDİLMEZ", async () => {
  for (const sec of [1, 2]) {
    const { page, errors } = await freshPage();
    const filePath = writeWav(`valid_${sec}s.wav`, { numFrames: Math.round(sec * 44100) });
    const { toastText, added } = await uploadAndObserve(page, filePath);
    assert.ok(added, `${sec}sn'lik GEÇERLİ dosya reddedildi (olmamalıydı) — mesaj: ${toastText}`);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test("REGRESYON KORUMASI — normal uzunlukta, 192kHz ve 8 kanallı GEÇERLİ dosyalar hâlâ sorunsuz kabul ediliyor", async () => {
  const cases = [
    { name: "normal_5s.wav", opts: { numFrames: 5 * 44100 } },
    { name: "hires_192k.wav", opts: { sampleRate: 192000, numFrames: 96000 } },
    { name: "eight_channel.wav", opts: { numChannels: 8, numFrames: 22050 } },
  ];
  for (const c of cases) {
    const { page, errors } = await freshPage();
    const filePath = writeWav(c.name, c.opts);
    const { toastText, added } = await uploadAndObserve(page, filePath);
    assert.ok(added, `[${c.name}] GEÇERLİ dosya reddedildi (olmamalıydı) — mesaj: ${toastText}`);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test("REGRESYON KORUMASI — tamamen bozuk (.wav uzantılı, RIFF header'ı bile yok) dosya hâlâ ESKİ mesajla reddediliyor ('Bu dosya açılamadı')", async () => {
  const { page, errors } = await freshPage();
  const filePath = path.join(tmpDir, "garbage.wav");
  fs.writeFileSync(filePath, Buffer.from(Array.from({ length: 500 }, () => Math.floor(Math.random() * 256))));
  const { toastText, added } = await uploadAndObserve(page, filePath);
  assert.ok(!added);
  assert.ok(toastText && /açılamadı/i.test(toastText), `mesaj beklenen ESKİ formatta değil: ${toastText}`);
  assert.deepEqual(errors, []);
  await page.close();
});

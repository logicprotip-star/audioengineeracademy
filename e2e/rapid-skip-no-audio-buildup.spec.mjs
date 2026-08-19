// G325 — OLCUM-SES-BIRIKME-2-19-08'in kanıtladığı bug: goToNextRound()'un
// reentrancy KİLİDİ YOKTU, SIFIRA yakın aralıklı (rapid-fire) "Atla"
// tıklamaları ÜST ÜSTE binip birden fazla ses zinciri kurabiliyordu — biri
// stopAudio()'nun erişemediği şekilde ASILI kalıp telafi anons ekranında
// KESİNTİSİZ (ölçülen: 8sn+, decay YOK) çalmaya devam ediyordu. Kontrol
// deneyi (AYNI ölçüm raporu): 250ms aralıklı NORMAL hızda sorun HİÇ
// oluşmuyordu — bug'ın kendisi hız-bağımlı bir yarış durumuydu.
//
// Doğrulama sinyali: AudioContext.prototype.createAnalyser'a takılan bir
// Proxy — uygulamanın KENDİ paylaşılan analyser'ını (masterGain→analyser→
// destination, audio-engine.js:409-423) yakalayıp getFloatTimeDomainData()
// ile RMS ölçüyor (recovered-round-audio.spec.mjs'in AYNI deseni).

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";

let serverHandle, browser;

const TAP_SCRIPT = `
window.__testAnalyser = null;
window.__testGainCreateCount = 0;
const origCreateAnalyser = AudioContext.prototype.createAnalyser;
AudioContext.prototype.createAnalyser = function (...a) {
  const node = origCreateAnalyser.apply(this, a);
  window.__testAnalyser = node;
  return node;
};
const origCreateGain = AudioContext.prototype.createGain;
AudioContext.prototype.createGain = function (...a) {
  window.__testGainCreateCount++;
  return origCreateGain.apply(this, a);
};
`;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

function rms(page) {
  return page.evaluate(() => {
    const a = window.__testAnalyser;
    if (!a) return null;
    const buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  });
}

async function enterKesimIdle(page) {
  await page.addInitScript(TAP_SCRIPT);
  await page.goto(serverHandle.baseUrl);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("eqEarTrainerProXDev", JSON.stringify({ simulatePro: true }));
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.querySelector('[data-mode-id="kesim-noktasi"]')?.click());
  await page.waitForTimeout(400);
  const spotlightSkip = page.locator("#spotlightSkip");
  if (await spotlightSkip.isVisible().catch(() => false)) await spotlightSkip.click();
  await page.waitForTimeout(200);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  if (await spotlightSkip.isVisible().catch(() => false)) await spotlightSkip.click();
  await page.waitForTimeout(200);
}

test("G325 KABUL KRİTERİ — 5(+) kez HIZLI art arda Atla → telafi anons ekranında ses BİRİKMİYOR (RMS ile ölçüldü)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterKesimIdle(page);

  // HIZLI, SIFIRA yakın aralıklı 10x Atla — OLCUM-SES-BIRIKME-2-19-08'in
  // bug'ı REPRODUCE eden AYNI senaryo (parkur 10 soru, TAMAMI atlanınca
  // telafi anonsu açılır).
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => document.getElementById("nextBtn")?.click());
  }

  // Tüm arka plan işlemenin bitmesini bekle (announce ekranı yerleşsin).
  await page.waitForTimeout(3000);

  const screenId = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(screenId, "screen-exam", `ön koşul: 10 atlama sonrası telafi anons ekranına ulaşılamadı — ölçülen ekran: ${screenId}`);

  // Anons ekranında 2 saniye BOYUNCA (kullanıcı HİÇBİR ŞEY yapmıyor) RMS
  // ölç — DÜZELTME ÖNCESİ bu pencerede RMS sabit ~0.11 idi (kesintisiz
  // ses), DÜZELTME SONRASI tam sessizlik beklenir.
  let maxRms = 0;
  for (let i = 0; i < 20; i++) {
    const v = await rms(page);
    if (v !== null) maxRms = Math.max(maxRms, v);
    await page.waitForTimeout(100);
  }

  assert.ok(maxRms < 0.01, `telafi anons ekranında ses BİRİKMEMELİ (sessiz kalmalı) — ölçülen max RMS: ${maxRms.toFixed(5)} (bozukken ~0.11 ölçülmüştü)`);

  await page.close();
});

test("G325 REGRESYON KORUMASI — normal hızda (250ms aralık) Atla AYNEN çalışıyor, telafi anons ekranı doğru açılıyor ve sessiz", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterKesimIdle(page);

  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => document.getElementById("nextBtn")?.click());
    await page.waitForTimeout(250);
  }

  const screenId = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(screenId, "screen-exam", `normal hızda 10 atlama sonrası telafi anons ekranına ulaşılamadı — ölçülen ekran: ${screenId}`);

  const kicker = await page.evaluate(() => document.getElementById("exKicker")?.textContent);
  assert.equal(kicker, "TELAFİ TURU", "normal hızda atlama sonrası doğru anons metni görünmedi (G325 kilidi normal akışı BOZMUŞ olabilir)");

  let maxRms = 0;
  for (let i = 0; i < 10; i++) {
    const v = await rms(page);
    if (v !== null) maxRms = Math.max(maxRms, v);
    await page.waitForTimeout(100);
  }
  assert.ok(maxRms < 0.01, `normal hızda da anons ekranı sessiz kalmalı — ölçülen max RMS: ${maxRms.toFixed(5)}`);

  await page.close();
});

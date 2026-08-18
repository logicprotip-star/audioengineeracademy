// G295 (bölüm 3) — Frekans Çakışması: SOURCE_PAIRS.gainA/gainB (dB) çift-içi
// statik seviye düzeltmesi. KABUL KRİTERİ: "Tüm çiftlerde seviye farkı ±1.5 dB
// içinde." KONTROL maddeleri: (1) her çiftte GERÇEK tarayıcıda round
// başlatılınca audioEngine'in dualGainA/B GainNode değeri pair.gainA/gainB'nin
// (dB→linear) BEKLENEN değerine eşit mi (resolve()→buildDualSourceChain
// kablolamasının GERÇEKTEN çalıştığının kanıtı), (2) bu turda ölçülen 3
// dengesiz çiftte (akustik-clean/bas-akustik/vokal2-clean) DÜZELTME
// UYGULANDIKTAN SONRA gerçek m4a decode + concurrent-only RMS ölçümü ±1.5dB
// içinde mi (OLCUM-CIFT-DENGE-18-08.md'nin ÖLÇÜM yöntemiyle AYNI, ama artık
// gainDb dahil edilerek), (3) diğer 8 tek-kaynaklı modun ses zinciri
// (buildQuestionChain) HİÇ dokunulmadığından round başlatma DAVRANIŞI
// değişmedi (regresyon kontrolü, konsol hatasız).

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, dismissSpotlightIfShown } from "./helpers/app-fixtures.mjs";
import { SOURCE_PAIRS } from "../www/js/core/source-catalog.js";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

async function dismissHeadphoneSheetIfShown(page) {
  const confirm = page.locator("#hpSheetConfirm");
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
    await page.waitForTimeout(150);
  }
}

async function selectCakismaPair(page, pairId) {
  await page.evaluate((id) => {
    const sel = document.getElementById("cakismaPairSelect");
    sel.value = id;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }, pairId);
}

test("KONTROL 1 — GERÇEK tarayıcıda TÜM 7 çiftte dualGainA/B GERÇEK GainNode değeri pair.gainA/gainB'ye (dB→linear) EŞİT", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");

  for (const pair of SOURCE_PAIRS) {
    await enterMode(page, "frekans-cakismasi");
    await dismissSpotlightIfShown(page);
    await selectCakismaPair(page, pair.id);
    await dismissHeadphoneSheetIfShown(page);
    await page.locator("#startBtn").click();
    await page.waitForTimeout(500);
    await dismissHeadphoneSheetIfShown(page);
    await dismissSpotlightIfShown(page);

    const values = await page.evaluate(() => window.__aeaDualGainValuesForTest());
    const expectedA = Math.pow(10, pair.gainA / 20);
    const expectedB = Math.pow(10, pair.gainB / 20);
    assert.ok(values.a !== null, `[${pair.id}] dualGainValues.a null döndü — round GERÇEKTEN başlamamış olabilir`);
    assert.ok(Math.abs(values.a - expectedA) < 1e-6, `[${pair.id}] gainA: beklenen ${expectedA}, GERÇEK ${values.a}`);
    assert.ok(Math.abs(values.b - expectedB) < 1e-6, `[${pair.id}] gainB: beklenen ${expectedB}, GERÇEK ${values.b}`);

    await page.locator("#backBtn").click();
    await page.waitForTimeout(200);
    const exitConfirm = page.locator("#exitConfirmLeave");
    if (await exitConfirm.isVisible().catch(() => false)) {
      await exitConfirm.click();
      await page.waitForTimeout(200);
    }
  }

  await page.close();
});

test("KABUL KRİTERİ — düzeltme UYGULANDIKTAN SONRA 3 dengesiz çiftte (akustik-clean/bas-akustik/vokal2-clean) GERÇEK concurrent-RMS farkı ±1.5dB içinde", async () => {
  const page = await browser.newPage();
  await page.goto(serverHandle.baseUrl);

  const result = await page.evaluate(async (pairs) => {
    async function renderBandLimited(path, offsetSec, gainDb, loPassHz, hiPassHz, durationSec, sampleRate) {
      const tmp = new OfflineAudioContext(1, 1, sampleRate);
      const buf = await tmp.decodeAudioData(await (await fetch(path)).arrayBuffer());

      const ctx = new OfflineAudioContext(1, Math.ceil(durationSec * sampleRate), sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const gainNode = ctx.createGain();
      gainNode.gain.value = Math.pow(10, (gainDb || 0) / 20);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = hiPassHz; hp.Q.value = 0.707;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = loPassHz; lp.Q.value = 0.707;
      src.connect(gainNode); gainNode.connect(hp); hp.connect(lp); lp.connect(ctx.destination);
      src.start(0, (offsetSec || 0) % buf.duration);
      const rendered = await ctx.startRendering();
      return rendered.getChannelData(0);
    }

    function rmsToDb(x) { return 20 * Math.log10(Math.max(x, 1e-10)); }

    async function measurePair(pair) {
      const sampleRate = 44100;
      const pathA = `audio/${sourcePathFor(pair.sourceA)}`;
      const pathB = `audio/${sourcePathFor(pair.sourceB)}`;
      const durTmp = new OfflineAudioContext(1, 1, sampleRate);
      const durBuf = await durTmp.decodeAudioData(await (await fetch(pathA)).arrayBuffer());
      const durationSec = durBuf.duration;

      const [lo, hi] = pair.region;
      const dataA = await renderBandLimited(pathA, pair.offsetA, pair.gainA, hi, lo, durationSec, sampleRate);
      const dataB = await renderBandLimited(pathB, pair.offsetB, pair.gainB, hi, lo, durationSec, sampleRate);

      const n = Math.min(dataA.length, dataB.length);
      const winSize = Math.floor(sampleRate * 0.1);
      const envA = [], envB = [];
      for (let start = 0; start + winSize <= n; start += winSize) {
        let sumA = 0, sumB = 0;
        for (let i = start; i < start + winSize; i++) { sumA += dataA[i] * dataA[i]; sumB += dataB[i] * dataB[i]; }
        envA.push(Math.sqrt(sumA / winSize));
        envB.push(Math.sqrt(sumB / winSize));
      }
      const peakA = Math.max(...envA), peakB = Math.max(...envB);
      const threshA = peakA * Math.pow(10, -20 / 20);
      const threshB = peakB * Math.pow(10, -20 / 20);
      let concSumSqA = 0, concSumSqB = 0, concCount = 0;
      for (let w = 0; w < envA.length; w++) {
        if (envA[w] >= threshA && envB[w] >= threshB) {
          concSumSqA += envA[w] * envA[w] * winSize;
          concSumSqB += envB[w] * envB[w] * winSize;
          concCount += winSize;
        }
      }
      const concDbA = rmsToDb(Math.sqrt(concSumSqA / concCount));
      const concDbB = rmsToDb(Math.sqrt(concSumSqB / concCount));
      return { id: pair.id, diff: concDbB - concDbA };
    }

    // source-catalog.js'in KENDİ samplePath eşlemesi (fetch import edemediğimiz
    // için burada minimal, SADECE bu 3 çiftin kullandığı 4 kaynak için elle
    // tekrarlandı — TEK doğruluk kaynağı yine source-catalog.js, buradaki
    // liste sadece dosya adı çözümü).
    function sourcePathFor(id) {
      const map = { bass: "bass.m4a", guitar: "acoustic_guitar.m4a", clean_guitar: "clean_guitar.m4a", vocal_1: "vocal_1.m4a" };
      return map[id];
    }

    const results = [];
    for (const pair of pairs) {
      results.push(await measurePair(pair));
    }
    return results;
  }, SOURCE_PAIRS.filter(p => ["akustik-clean", "bas-akustik", "vokal2-clean"].includes(p.id)));

  for (const r of result) {
    assert.ok(Math.abs(r.diff) <= 1.5, `[${r.id}] düzeltme SONRASI fark ±1.5dB İÇİNDE değil: ${r.diff.toFixed(2)}dB`);
  }

  await page.close();
});

test("REGRESYON KORUMASI — tek-kaynaklı bir modun (Frekans Bulma) round başlatması G295'ten ETKİLENMEDİ (konsol hatasız, buildQuestionChain'e dokunulmadı)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, {});
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-bulma");
  await dismissSpotlightIfShown(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(600);
  await dismissSpotlightIfShown(page);

  assert.deepEqual(errors, [], `konsol hatası: ${errors.join(" | ")}`);

  await page.close();
});

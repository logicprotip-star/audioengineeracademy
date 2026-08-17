// G277 — OLCUM-SATURATION-17-08 madde C'nin düzeltmesi ("EN CİDDİ"): G267'nin
// seamless A/B/C mimarisi (isSeamlessThreeWay — Kompresör/Distortion),
// playThreeWaySpecific()/cycleThreeWayPreview()'ın setThreeWayActive/
// unmuteOutput ile SADECE VAR OLAN bir zincirin gain'ini ayarladığını
// varsayıyordu — kendisi hiçbir zaman zincir KURMUYORDU. G203'ün tur-kurtarma
// yolu (applyRestoredRoundIfAny) zinciri BİLEREK erteliyordu ("bir SONRAKİ
// 'Tekrar Çal' playQuestion()'la kursun"), ama THREE_WAY modlarda #startBtn
// (o yol) activeQuestion doluyken HER ZAMAN gizli — kullanıcının erişebildiği
// TEK kontroller (kart-üstü play, DÖNGÜ) sessiz no-op'a çarpıyordu. Ölçüldü:
// kurtarma sonrası analyser sapması 0 (tam sessizlik), G267 geri alınınca 26
// (gerçek ses) — G267'nin KENDİSİ değil, kurtarma yoluyla ENTEGRASYONUNDAKİ
// boşluk sorumluydu.
//
// Doğrulama sinyali: AudioContext.prototype.createAnalyser'a takılan bir
// Proxy — uygulamanın KENDİ paylaşılan analyser'ını (masterGain→analyser→
// destination, audio-engine.js) yakalayıp getByteTimeDomainData() ile
// SESSİZLİKTEN (128 sabit) sapmayı ölçüyor. Bu, "ikon playing gösteriyor"
// gibi YALAN söyleyebilecek bir UI sinyaline DEĞİL, GERÇEK Web Audio
// sinyaline dayanıyor.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, dismissSpotlightIfShown } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

const TAP_SCRIPT = `
window.__testCtxs = [];
const OrigAC = window.AudioContext;
window.AudioContext = new Proxy(OrigAC, {
  construct(target, args) {
    const ctx = new target(...args);
    window.__testCtxs.push(ctx);
    const origCreateAnalyser = ctx.createAnalyser.bind(ctx);
    ctx.createAnalyser = function(...a) {
      const node = origCreateAnalyser(...a);
      if (!window.__testAnalyser) window.__testAnalyser = node;
      return node;
    };
    return ctx;
  }
});
`;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

async function signalDeviation(page) {
  return page.evaluate(() => {
    if (!window.__testAnalyser) return -1;
    const data = new Uint8Array(window.__testAnalyser.frequencyBinCount);
    window.__testAnalyser.getByteTimeDomainData(data);
    let maxDeviation = 0;
    for (let i = 0; i < data.length; i++) maxDeviation = Math.max(maxDeviation, Math.abs(data[i] - 128));
    return maxDeviation;
  });
}

async function verifyRecoveredRoundPlaysAudio(modeId) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(TAP_SCRIPT);
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, modeId);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(800);
  await dismissSpotlightIfShown(page);
  if (await page.evaluate(() => document.getElementById("abToggle")?.classList.contains("loop"))) {
    await page.locator("#abToggle").click();
    await page.waitForTimeout(150);
  }

  // G236 hook — visibilitychange'in hidden dalıyla AYNI eylem: pauseRound()
  // + persistInProgressRound() (bkz. app.js).
  const hookExists = await page.evaluate(() => typeof window.__aeaNativeInterruption === "function");
  assert.ok(hookExists, "__aeaNativeInterruption kancası bulunamadı (DEV_MODE=false olabilir)");
  await page.evaluate(() => window.__aeaNativeInterruption("began"));
  await page.waitForTimeout(300);

  // Uygulama kapatılıp açılma benzetimi.
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  const cardA = page.locator('.ans-m2-play[data-letter="A"]');
  assert.ok(await cardA.isVisible(), `${modeId}: kurtarma sonrası kart-üstü play butonu görünür olmalı`);

  // KABUL KRİTERİ — TEK basış SES üretmeli (ikinci basışa GEREK YOK).
  await cardA.click({ timeout: 5000 });
  await page.waitForTimeout(1200);
  const deviation = await signalDeviation(page);
  assert.ok(deviation > 3, `${modeId}: kurtarılan turda TEK basıştan sonra SES GELMEDİ (analyser sapması=${deviation}, REGRESYON — G267'nin kurtarma yolu boşluğu)`);

  await page.close();
}

test("G277: Saturation & Distortion — kurtarılan turda play'e TEK basış SES ÜRETİR", async () => {
  await verifyRecoveredRoundPlaysAudio("distortion");
});

test("G277: Kompresör — kurtarılan turda play'e TEK basış SES ÜRETİR (task'ın \"Kompresör'de sorun yok\" varsayımı ÖLÇÜMLE yanlışlanmıştı)", async () => {
  await verifyRecoveredRoundPlaysAudio("kompresor");
});

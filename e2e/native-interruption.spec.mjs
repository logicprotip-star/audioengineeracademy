// G236 (TUR3B bulgusu, EN KRİTİK) — AudioSessionPlugin.swift'in
// interruptionBegan/sessionActivated olayları (arama/Siri/alarm) ÖNCEDEN
// SADECE doğrulanmamış notifyListeners() proxy'sinden gönderiliyordu, JS'e
// HİÇ ulaşmıyordu (G135'in AYNI bulgusu). Route-change'in ALDIĞI
// evaluateJavaScript köprüsü artık kesinti olaylarına da uygulandı —
// window.__aeaNativeInterruption(type) global fonksiyonu bu testin
// simüle ettiği native → JS giriş noktası (gerçek cihazda Swift tarafından
// çağrılır, bu test JS ucundaki KABLOLAMAYI doğruluyor, native tarafın
// KENDİSİ bu ortamda test EDİLEMEZ — bkz. DURUM.md G236'nın CİHAZDA
// doğrulama listesi).

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, dismissSpotlightIfShown } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

test("G236: window.__aeaNativeInterruption('began') aktif bir turu pauseRound() ile duraklatır (visibilitychange'in hidden dalıyla AYNI eylem)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-bulma");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await dismissSpotlightIfShown(page);

  const beforeLabel = await page.locator("#startBtn").getAttribute("aria-label");
  assert.equal(beforeLabel, "Durdur", "tur aktifken buton 'Durdur' göstermeli (ön koşul)");

  await page.evaluate(() => window.__aeaNativeInterruption && window.__aeaNativeInterruption("began"));
  await page.waitForTimeout(150);

  const afterLabel = await page.locator("#startBtn").getAttribute("aria-label");
  assert.equal(afterLabel, "Oynat", "kesinti başlayınca pauseRound() tetiklenmeli — buton 'Oynat'a dönmeli");
  assert.equal(pageErrors.length, 0, `kesinti bildirimi hata fırlatmamalı: ${pageErrors.join("; ")}`);

  await page.close();
});

test("G236: window.__aeaNativeInterruption('ended') hata fırlatmadan çalışır (banner'ı tetiklemeden sessiz ısıtma)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-bulma");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await dismissSpotlightIfShown(page);

  await page.evaluate(() => window.__aeaNativeInterruption && window.__aeaNativeInterruption("began"));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.__aeaNativeInterruption && window.__aeaNativeInterruption("ended"));
  await page.waitForTimeout(150);

  assert.equal(pageErrors.length, 0, `kesinti bitiş bildirimi hata fırlatmamalı: ${pageErrors.join("; ")}`);

  await page.close();
});

test("G236: aktif tur YOKKEN (idle ekran) window.__aeaNativeInterruption('began') çağrısı çökmez", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-bulma");
  // BİLEREK #startBtn'e basılmadı — activeQuestion henüz null.

  await page.evaluate(() => window.__aeaNativeInterruption && window.__aeaNativeInterruption("began"));
  await page.waitForTimeout(100);

  assert.equal(pageErrors.length, 0, `idle ekranda kesinti bildirimi çökmemeli: ${pageErrors.join("; ")}`);

  await page.close();
});

// G247 (TUR710-PERF-ARAYUZ-15-08 bulgusu 🟡) — drawVisualizer()'ın rAF döngüsü
// ÖNCEDEN oyun ekranından ÇIKILDIKTAN SONRA da (Araçlar/Ayarlar/İlerleme
// dahil) durmadan çalışmaya devam ediyordu. `window.requestAnimationFrame`'i
// (uygulama yüklenmeden ÖNCE, page.addInitScript ile) bir sayaçla sarmalayıp
// oyun ekranındaki/dışındaki GERÇEK çağrı sıklığını ölçüyoruz — kabul
// kriteri: oyun ekranı dışındayken rAF döngüsü ÇALIŞMIYOR, geri dönünce
// SORUNSUZ yeniden başlıyor.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, dismissSpotlightIfShown, activeScreenId } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

// Bir pencere boyunca rAF çağrı sayısındaki ARTIŞI ölçer — sürekli bir 60fps
// döngü varsa bu WINDOW_MS başına ~WINDOW_MS/16 civarı olmalı (60fps), döngü
// duruyorsa (hiçbir sürekli rAF kalmadıysa) sıfıra YAKIN kalmalı (tek seferlik
// scroll/sheet-açılış animasyonları HARİÇ, bkz. app.js'in ONE-SHOT rAF'ları).
async function rafCallsDuring(page, windowMs) {
  const before = await page.evaluate(() => window.__rafCallCount);
  await page.waitForTimeout(windowMs);
  const after = await page.evaluate(() => window.__rafCallCount);
  return after - before;
}

test("G247: drawVisualizer() rAF döngüsü oyun ekranı DIŞINDAYKEN durur, GERİ dönünce sorunsuz yeniden başlar", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => {
    window.__rafCallCount = 0;
    const nativeRaf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      window.__rafCallCount++;
      return nativeRaf(cb);
    };
  });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await dismissSpotlightIfShown(page);

  await enterMode(page, "frekans-bulma");
  assert.equal(await activeScreenId(page), "screen-game");
  // G247'nin kendi notu: syncGameVisualizerLoop() bir round AKTİF olmadan da
  // (ses unlock edilmeden bile) güvenli çalışır — drawVisualizer()'ın "Visualizer
  // pasif" dalı bu durumu zaten ele alıyor, döngü SADECE ekranın aktif olmasına
  // bağlı — bu yüzden burada "Oyunu Başlat"a basmaya GEREK YOK (basılsaydı
  // #backBtn'in exit-confirm dalını da ele almak gerekirdi, gereksiz karmaşıklık).
  await page.waitForTimeout(300);

  const onGameScreenCalls = await rafCallsDuring(page, 500);
  assert.ok(onGameScreenCalls > 15, `oyun ekranındayken rAF döngüsü AKTİF olmalı, ${onGameScreenCalls} çağrı/500ms ölçüldü (60fps'te ~30 beklenir)`);

  // Oyun ekranından TAMAMEN çık — tabbar oyun ekranındayken GİZLİ (goScreen()'in
  // kendi "sadece data-tab taşıyan ekranlarda göster" kuralı), bu yüzden ÖNCE
  // #backBtn ("Menüye dön") ile menüye çıkılıyor, SONRA İlerleme sekmesine geçiliyor.
  await page.locator("#backBtn").click();
  await page.waitForTimeout(100);
  await page.locator('.tab[data-tab="progress"]').click();
  await page.waitForTimeout(100);
  assert.equal(await activeScreenId(page), "screen-progress");

  const offGameScreenCalls = await rafCallsDuring(page, 500);
  assert.ok(offGameScreenCalls < 5, `oyun ekranı DIŞINDAYKEN rAF döngüsü DURMALI (kabul kriteri), ${offGameScreenCalls} çağrı/500ms ölçüldü — 60fps'in ~30'u yerine yakın-sıfır bekleniyordu`);

  // Oyun ekranına GERİ dön — döngü SORUNSUZ yeniden başlamalı (⚠️ task'ın açık
  // uyarısı). GERÇEK bir UI yolu: Antrenman sekmesine (menü) dön, AYNI mod
  // kartına tekrar tıkla — goScreen("game") BUNUN üzerinden tetiklenir
  // (window.goScreen gibi bir test-only kısayol İCAT EDİLMEDİ).
  await page.locator('.tab[data-tab="train"]').click();
  await page.waitForTimeout(100);
  await enterMode(page, "frekans-bulma");
  await page.waitForTimeout(100);
  assert.equal(await activeScreenId(page), "screen-game");

  const resumedCalls = await rafCallsDuring(page, 500);
  assert.ok(resumedCalls > 15, `oyun ekranına DÖNÜNCE rAF döngüsü YENİDEN başlamalı, ${resumedCalls} çağrı/500ms ölçüldü`);

  await page.close();
});

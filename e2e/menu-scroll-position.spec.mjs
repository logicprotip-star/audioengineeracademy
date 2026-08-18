// G294 (OLCUM-DORT-18-08 madde C) — Ana Menü'ye özel kaydırma konumu
// koruma. Kök sebep (OLCUM-DORT'ta ölçüldü): `goScreen()` (app.js:2548)
// TÜM ekranlara geçişte `scrollEl.scrollTop = 0`'ı KOŞULSUZ uyguluyordu
// — tek sütun düzende 12 mod alt alta olduğu için (bkz. G293) kullanıcı
// moddan/başka bir sekmeden döndüğünde HER SEFERİNDE yeniden kaydırmak
// zorunda kalıyordu. Düzeltme: SADECE "menu" hedefi artık bellekte
// (localStorage DEĞİL) tutulan `menuScrollPosition`'a döner — diğer TÜM
// ekranlar (İlerleme/Araçlar/Ayarlar/oyun DAHİL) ESKİ koşulsuz sıfırlama
// davranışını AYNEN koruyor.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, dismissSpotlightIfShown } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

// Menü içeriği kaydırılabilir olsun diye DAR bir viewport (kısa yükseklik,
// tek-sütun 12 modun tamamı sığmıyor) — G293'ün eşiği (389px) bu genişlikte
// zaten tek sütuna düşürüyor, kaydırma GERÇEKTEN gerekiyor.
const NARROW_VIEWPORT = { width: 375, height: 700 };

test("G294 KABUL KRİTERİ — moddan #backBtn ile dönünce menü AYNI yerde", async () => {
  const page = await browser.newPage({ viewport: NARROW_VIEWPORT });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await dismissSpotlightIfShown(page);

  await page.evaluate(() => { document.querySelector(".menu-scroll").scrollTop = 400; });
  const before_ = await page.evaluate(() => document.querySelector(".menu-scroll").scrollTop);
  assert.ok(before_ > 0, "ön koşul: menü GERÇEKTEN kaydırılabilmeli (400'e kaydı)");

  await page.locator('.mode-card[data-mode-id="frekans-bulma"]').first().click();
  await page.waitForTimeout(300);
  await page.locator("#backBtn").click();
  await page.waitForTimeout(300);

  const after_ = await page.evaluate(() => document.querySelector(".menu-scroll").scrollTop);
  assert.equal(after_, before_, "menü konumu moddan dönünce KORUNMALI");

  await page.close();
});

test("G294 — sekme değiştirip (İlerleme/Araçlar) menüye dönünce de KORUNUYOR", async () => {
  const page = await browser.newPage({ viewport: NARROW_VIEWPORT });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await dismissSpotlightIfShown(page);

  await page.evaluate(() => { document.querySelector(".menu-scroll").scrollTop = 250; });
  await page.locator('.tab[data-tab="progress"]').click();
  await page.waitForTimeout(200);
  await page.locator('.tab[data-tab="tools"]').click();
  await page.waitForTimeout(200);
  await page.locator('.tab[data-tab="train"]').click();
  await page.waitForTimeout(200);

  const scrollTop = await page.evaluate(() => document.querySelector(".menu-scroll").scrollTop);
  assert.equal(scrollTop, 250, "İki sekme dolaşıp menüye dönünce konum AYNI kalmalı");

  await page.close();
});

test("G294 REGRESYON KORUMASI — uygulama YENİDEN başlayınca (reload) menü en üstten başlıyor", async () => {
  const page = await browser.newPage({ viewport: NARROW_VIEWPORT });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await dismissSpotlightIfShown(page);

  await page.evaluate(() => { document.querySelector(".menu-scroll").scrollTop = 300; });
  await page.reload();
  await page.waitForLoadState("networkidle");

  const scrollTop = await page.evaluate(() => document.querySelector(".menu-scroll").scrollTop);
  assert.equal(scrollTop, 0, "reload (yeniden başlatma) sonrası menü SIFIRDAN başlamalı — hafıza kalıcı OLMAMALI");

  await page.close();
});

test("G294 REGRESYON KORUMASI — DİĞER ekranların sıfırlama davranışı DEĞİŞMEDİ (İlerleme örneği)", async () => {
  const page = await browser.newPage({ viewport: NARROW_VIEWPORT });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true }, stats: { rounds: 50, correct: 30 } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await dismissSpotlightIfShown(page);

  await page.locator('.tab[data-tab="progress"]').click();
  await page.waitForTimeout(300);
  const scrollHeight = await page.evaluate(() => document.querySelector("#screen-progress .scroll")?.scrollHeight);
  const clientHeight = await page.evaluate(() => document.querySelector("#screen-progress .scroll")?.clientHeight);
  // İçerik GERÇEKTEN kaydırılabilir DEĞİLSE (kısa içerik) bu test anlamsız
  // olur — assert.ok ile bu ön koşul AÇIKÇA doğrulanıyor, sessizce
  // atlanmıyor.
  assert.ok(scrollHeight > clientHeight, `ön koşul: İlerleme içeriği kaydırılabilir olmalı (scrollHeight=${scrollHeight} clientHeight=${clientHeight}) — DEĞİLSE bu test mod hazırlığını GÜNCELLEMELİ`);

  await page.evaluate(() => { document.querySelector("#screen-progress .scroll").scrollTop = 80; });
  await page.locator('.tab[data-tab="tools"]').click();
  await page.waitForTimeout(200);
  await page.locator('.tab[data-tab="progress"]').click();
  await page.waitForTimeout(200);

  const scrollTop = await page.evaluate(() => document.querySelector("#screen-progress .scroll")?.scrollTop);
  assert.equal(scrollTop, 0, "İlerleme'nin KENDİ sıfırlama davranışı DEĞİŞMEMELİ (SADECE menü korunuyor)");

  await page.close();
});

// G337 (OLCUM-KOMPRESOR-KAYNAK-20-08) — saw/square/triangle Kompresör'den
// çıkarıldı (noTransient:true eklendi, source-catalog.js). Bu üç kaynak
// SIFIR transient taşıyor (8sn render'da ölçüldü), kompresör altında crest
// factor DÜŞMÜYOR (hatta +0.09...+0.21dB ARTIYOR) — kullanıcı SADECE statik
// dB farkını duyuyordu ("her soru bilindi" cihaz gözlemi). Distortion'da
// AYNI bayrak hiç okunmadığı için (requireTransient SADECE Kompresör'de)
// bu üçü ORADA KALDI — waveshaping genlik-tabanlı, saw'da bile ölçülebilir
// harmonik ekleniyor.

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

async function dismissHeadphoneSheetIfShown(page) {
  const confirm = page.locator("#hpSheetConfirm");
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
    await page.waitForTimeout(150);
  }
}

async function openGroupOptionTexts(page, groupLabel) {
  await dismissHeadphoneSheetIfShown(page);
  await page.locator("[data-sheet-select='sourceSelect']").first().click();
  await page.waitForTimeout(300);
  const header = page.locator(".sheet-group-header", { hasText: groupLabel }).first();
  const headerVisible = await header.isVisible().catch(() => false);
  if (!headerVisible) { await page.keyboard.press("Escape").catch(() => {}); return null; }
  await header.click();
  await page.waitForTimeout(200);
  const texts = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".sheet-option"))
      .filter(el => el.offsetParent !== null)
      .map(el => el.textContent || "")
  );
  await page.keyboard.press("Escape").catch(() => {});
  return texts;
}

test("KABUL KRİTERİ — Kompresör'de 'SENTETİK' grubu hiç görünmüyor (saw/square/triangle GÖRÜNMÜYOR)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, {});
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "kompresor");
  await dismissSpotlightIfShown(page);

  const texts = await openGroupOptionTexts(page, "SENTETİK");
  assert.equal(texts, null, "Kompresör'de 'SENTETİK' grubu HİÇ render edilmemeliydi (pink/white/saw/square/triangle hepsi noTransient)");

  await page.close();
});

test("KABUL KRİTERİ — Distortion'da 'SENTETİK' grubu HÂLÂ görünüyor (Saw/Square/Triangle GÖRÜNÜYOR)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  // Distortion Pro-only (paywall.FREE_MODE_IDS'te YOK, kompresor'ün AKSİNE).
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "distortion");
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);

  const texts = await openGroupOptionTexts(page, "SENTETİK");
  assert.ok(texts, "Distortion'da 'SENTETİK' grubu GÖRÜNMELİYDİ");
  for (const label of ["Saw", "Square", "Triangle"]) {
    assert.ok(texts.some(t => t.includes(label)), `"${label}" Distortion'da GÖRÜNMEDİ: ${texts.join(" | ")}`);
  }

  await page.close();
});

test("REGRESYON KORUMASI — Kompresör'de kick ile GERÇEK bir round konsol hatasız başlıyor (transient içeren kaynaklar etkilenmedi)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, {});
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "kompresor");
  await dismissSpotlightIfShown(page);

  await dismissHeadphoneSheetIfShown(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(600);
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);

  const activeScreen = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(activeScreen, "screen-game", "round başlamadı");
  assert.deepEqual(errors, [], `konsol hatası: ${errors.join(" | ")}`);

  await page.close();
});

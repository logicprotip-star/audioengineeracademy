// G335 (OLCUM-TONAL-KAYNAK-19-08) — Tonal Denge'nin "SADECE groove/upload"
// kısıtı (G44'ten beri) kaldırıldı. 6-bant Welch-ortalamalı FFT ölçümü
// mevcut TEK kaynağın (groove) BAND_SET_4'ün sadece 2/4'ünde -40dB üstü
// enerji taşıdığını buldu — bu ölçütle groove'dan İYİ/EŞİT çıkan 9 kaynak
// (hihat/vocal/vocal_1/snare/guitar/clean_guitar/arpeggio_guitar/
// acoustic_guitar_stereo/clean_guitar_stereo) eklendi. kick/bass (1-2/4,
// AÇIKÇA yetersiz) ve snare_late (spektral olarak snare'le özdeş + pairOnly)
// BİLEREK dışarıda bırakıldı.

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

// vocal1-source.spec.mjs'in AYNI deseni — bir grup açılmadan içindeki
// option'lar DOM'da mevcut ama görünmez (offsetParent null) kalır. Hi-Hat/
// Snare "DAVUL" grubunda, gitar/vokal çeşitleri "ENSTRÜMAN"da — gruplar
// birbirini KAPATIR (app.js collapseOtherGroups), bu yüzden İKİ grup AYRI
// AYRI açılıp metinleri BİRLEŞTİRİLİYOR.
async function openGroupOptionTexts(page, groupLabel) {
  await dismissHeadphoneSheetIfShown(page);
  await page.locator("[data-sheet-select='sourceSelect']").first().click();
  await page.waitForTimeout(300);
  await page.locator(".sheet-group-header", { hasText: groupLabel }).first().click();
  await page.waitForTimeout(200);
  const texts = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".sheet-option"))
      .filter(el => el.offsetParent !== null)
      .map(el => el.textContent || "")
  );
  await page.keyboard.press("Escape").catch(() => {});
  return texts;
}

async function openAllSourceGroupTexts(page) {
  const davul = await openGroupOptionTexts(page, "DAVUL");
  const enstruman = await openGroupOptionTexts(page, "ENSTRÜMAN");
  return [...davul, ...enstruman];
}

test("KABUL KRİTERİ — G335'te eklenen 9 kaynak Tonal Denge'nin seçicisinde GÖRÜNÜYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "tonal-denge");
  await dismissSpotlightIfShown(page);

  const texts = await openAllSourceGroupTexts(page);
  assert.ok(texts.length > 0, "DAVUL/ENSTRÜMAN grupları boş/görünmez geldi — ön koşul başarısız");
  const expectedLabels = ["Hi-Hat", "Vokal", "Vokal 2", "Snare", "Akustik Gitar", "Clean Gitar", "Arpej Gitar", "Akustik Gitar (Stereo)", "Clean Gitar (Stereo)"];
  for (const label of expectedLabels) {
    assert.ok(texts.some(t => t.includes(label)), `"${label}" Tonal Denge'nin seçicisinde GÖRÜNMEDİ: ${texts.join(" | ")}`);
  }

  await page.close();
});

test("KABUL KRİTERİ — kick/bass Tonal Denge'nin seçicisinde GÖRÜNMÜYOR (1-2/4 bant, G335'te yetersiz bulundu)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "tonal-denge");
  await dismissSpotlightIfShown(page);

  const texts = await openAllSourceGroupTexts(page);
  assert.ok(!texts.some(t => t.includes("Kick")), `Kick Tonal Denge'de GÖRÜNDÜ (EKLENMEMELİYDİ): ${texts.join(" | ")}`);
  assert.ok(!texts.some(t => t === "Bas" || t.startsWith("Bas")), `Bas Tonal Denge'de GÖRÜNDÜ (EKLENMEMELİYDİ): ${texts.join(" | ")}`);

  await page.close();
});

test("KABUL KRİTERİ — Hi-Hat kaynağıyla Tonal Denge round'u konsol hatasız başlıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "tonal-denge");
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);

  await dismissHeadphoneSheetIfShown(page);
  await page.locator("[data-sheet-select='sourceSelect']").first().click();
  await page.waitForTimeout(300);
  // Hi-Hat "DAVUL" grubunda (gitar/vokal çeşitlerinin AKSİNE, bkz. dosya
  // başı openAllSourceGroupTexts notu).
  await page.locator(".sheet-group-header", { hasText: "DAVUL" }).first().click();
  await page.waitForTimeout(200);
  await page.locator(".sheet-option", { hasText: "Hi-Hat" }).first().click();
  await page.waitForTimeout(300);

  await dismissHeadphoneSheetIfShown(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(600);
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);

  assert.deepEqual(errors, [], `Hi-Hat ile round başlatma sırasında konsol hatası: ${errors.join(" | ")}`);

  await page.close();
});

test("REGRESYON KORUMASI — groove hâlâ Tonal Denge'nin seçicisinde ve varsayılan, round GERÇEKTEN başlıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "tonal-denge");
  await dismissHeadphoneSheetIfShown(page);
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

// G295 — YENİ kaynak: vocal_1 (Vokal 2, ikinci vokal alımı). KABUL KRİTERİ:
// "vocal_1 katalogda, modlarda çalışıyor" — kısıtlı modlara (Pan, Reverb,
// Tonal Denge) "vocal"la BİREBİR AYNI muamele (bkz. source-catalog.test.mjs
// G295 blok — birim test seviyesinde uyumluKaynaklar zaten doğrulandı, bu
// dosya GERÇEK tarayıcıda seçici sheet'inde görünürlüğü + round başlatmayı
// doğrular).

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

// "ENSTRÜMAN" grubunu açıp İÇİNDEKİ (gerçekten GÖRÜNÜR) option metinlerini
// döner — sheet-option'lar TÜM gruplar için DOM'da mevcut ama SADECE açık
// grubun içindekiler görünür (textContent DOM sorgusu bunu AYIRT ETMEZ,
// bu yüzden .sheet-group-header'a önce tıklanıyor — source-change-no-penalty
// .spec.mjs'nin changeSourceViaSheet'iyle AYNI desen).
async function openInstrumentGroupOptionTexts(page) {
  await dismissHeadphoneSheetIfShown(page);
  await page.locator("[data-sheet-select='sourceSelect']").first().click();
  await page.waitForTimeout(300);
  await page.locator(".sheet-group-header", { hasText: "ENSTRÜMAN" }).first().click();
  await page.waitForTimeout(200);
  const texts = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".sheet-option"))
      .filter(el => el.offsetParent !== null)
      .map(el => el.textContent || "")
  );
  await page.keyboard.press("Escape").catch(() => {});
  return texts;
}

test("KABUL KRİTERİ — Vokal 2 (vocal_1) Frekans Bulma'nın genel kaynak seçicisinde GÖRÜNÜYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, {});
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-bulma");
  await dismissSpotlightIfShown(page);

  const texts = await openInstrumentGroupOptionTexts(page);
  assert.ok(texts.length > 0, "sheet-option listesi boş geldi — ön koşul başarısız");
  assert.ok(texts.some(t => t.includes("Vokal 2")), `Vokal 2 genel seçicide GÖRÜNMEDİ: ${texts.join(" | ")}`);

  await page.close();
});

test("vocal_1, 'vocal' ile AYNI şekilde Pan Konumu ve Reverb'ün seçicisinde GÖRÜNÜYOR", async () => {
  for (const modeId of ["pan-konumu", "reverb"]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(serverHandle.baseUrl);
    await seedLocalStorage(page, { dev: { simulatePro: true } });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await enterMode(page, modeId);
    await dismissSpotlightIfShown(page);

    const texts = await openInstrumentGroupOptionTexts(page);
    assert.ok(texts.some(t => t.includes("Vokal 2")), `[${modeId}] Vokal 2 seçicide GÖRÜNMEDİ: ${texts.join(" | ")}`);
    assert.ok(texts.some(t => t.includes("Vokal") && !t.includes("Vokal 2")), `[${modeId}] mevcut Vokal (vocal) seçicide GÖRÜNMEDİ — karşılaştırma tabanı bozuk`);

    await page.close();
  }
});

// G335 (OLCUM-TONAL-KAYNAK-19-08) — Tonal Denge'nin "SADECE groove/upload"
// kısıtı kaldırıldı, vocal/vocal_1 dahil 9 yeni kaynak EKLENDİ (6-bant FFT
// ölçümü groove'un kendisinden daha iyi/eşit bulduğu için). Bu test artık
// TERSİNİ doğruluyor — Vokal 2'nin GÖRÜNDÜĞÜNÜ.
test("vocal_1, Tonal Denge'nin seçicisinde GÖRÜNÜYOR (G335 — 'vocal' ile AYNI şekilde eklendi)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "tonal-denge");
  await dismissSpotlightIfShown(page);

  const texts = await openInstrumentGroupOptionTexts(page);
  assert.ok(texts.some(t => t.includes("Vokal 2")), `Vokal 2 Tonal Denge'de GÖRÜNMEDİ: ${texts.join(" | ")}`);
  assert.ok(texts.some(t => t.includes("Vokal") && !t.includes("Vokal 2")), `mevcut Vokal (vocal) Tonal Denge'de GÖRÜNMEDİ: ${texts.join(" | ")}`);

  await page.close();
});

test("KABUL KRİTERİ — vocal_1 kaynağıyla Frekans Bulma round'u konsol hatasız başlıyor", async () => {
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

  await page.locator("[data-sheet-select='sourceSelect']").first().click();
  await page.waitForTimeout(300);
  await page.locator(".sheet-group-header", { hasText: "ENSTRÜMAN" }).first().click();
  await page.waitForTimeout(200);
  await page.locator(".sheet-option", { hasText: "Vokal 2" }).first().click();
  await page.waitForTimeout(300);

  await page.locator("#startBtn").click();
  await page.waitForTimeout(600);
  await dismissSpotlightIfShown(page);

  assert.deepEqual(errors, [], `vocal_1 ile round başlatma sırasında konsol hatası: ${errors.join(" | ")}`);

  await page.close();
});

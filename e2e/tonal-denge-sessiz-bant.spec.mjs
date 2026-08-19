// G336 (OLCUM-TONAL-KAYNAK-19-08'in bulduğu boşluk) — bandsForQuestion()
// ARTIK kaynağın sessiz bantlarını bozmuyor. Birim testler (test/tonal-denge
// .test.mjs) 200-500 örnekle bunu SAF fonksiyon seviyesinde zaten kanıtlıyor
// — bu dosya GERÇEK tarayıcıda, GERÇEK bir round'da (app.js → mode.
// createQuestion → DOM) UÇTAN UCA doğruluyor.

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

test("KABUL KRİTERİ — groove kaynağıyla GERÇEK bir round'da ÜST-ORTA/TİZ hiçbir zaman bozuk değil", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true }, playMode: "challenge" });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "tonal-denge");
  await dismissHeadphoneSheetIfShown(page);

  // G335 sonrası varsayılan seçim ARTIK groove DEĞİL (DAVUL grubunda snare
  // groove'dan ÖNCE geliyor, bkz. source-catalog.js SOURCE_GROUPS sırası) —
  // bu test SPESİFİK olarak groove'u ölçmek istediği için AÇIKÇA seçiyor.
  await page.locator("[data-sheet-select='sourceSelect']").first().click();
  await page.waitForTimeout(300);
  await page.locator(".sheet-group-header", { hasText: "DAVUL" }).first().click();
  await page.waitForTimeout(200);
  await page.locator(".sheet-option", { hasText: "Davul Döngüsü" }).first().click();
  await page.waitForTimeout(300);

  await dismissHeadphoneSheetIfShown(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);

  const bands = await page.evaluate(() => window.__aeaActiveQuestionBandsForTest());
  assert.ok(Array.isArray(bands) && bands.length === 4, `BAND_SET_4 (4 bant) bekleniyordu, alınan: ${JSON.stringify(bands)}`);
  const ustOrta = bands.find(b => b.id === "ust-orta");
  const tiz = bands.find(b => b.id === "tiz");
  assert.equal(ustOrta.bugDb, 0, `ÜST-ORTA groove'da GERÇEK round'da bozuk çıktı: ${JSON.stringify(ustOrta)}`);
  assert.equal(tiz.bugDb, 0, `TİZ groove'da GERÇEK round'da bozuk çıktı: ${JSON.stringify(tiz)}`);

  await page.close();
});

test("REGRESYON KORUMASI — Hi-Hat (tüm bantlar dolu) ile round başlatınca hâlâ HERHANGİ bir bant bozulabiliyor (aşırı-filtreleme yok)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true }, playMode: "challenge" });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "tonal-denge");
  await dismissHeadphoneSheetIfShown(page);

  await page.locator("[data-sheet-select='sourceSelect']").first().click();
  await page.waitForTimeout(300);
  await page.locator(".sheet-group-header", { hasText: "DAVUL" }).first().click();
  await page.waitForTimeout(200);
  await page.locator(".sheet-option", { hasText: "Hi-Hat" }).first().click();
  await page.waitForTimeout(300);

  await dismissHeadphoneSheetIfShown(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);

  const bands = await page.evaluate(() => window.__aeaActiveQuestionBandsForTest());
  const disturbedCount = bands.filter(b => b.bugDb !== 0).length;
  assert.ok(disturbedCount >= 1, `hihat'ta EN AZ 1 bant bozulmalıydı, hiçbiri bozulmadı: ${JSON.stringify(bands)}`);

  await page.close();
});

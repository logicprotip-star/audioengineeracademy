// G326 (OLCUM-ATLA-KAYIT-19-08) — "Atla" ile geçilen (cevapsız) sorular
// ARTIK G285'in cevap geçmişine (1.1'in "Son Oyunlarım" listesinin veri
// kaynağı, core/answer-history.js) kaydediliyor: `skipped:true`, doğru
// cevap (params.correctAnswer) YİNE DE dolu (1.1'de dinletilebilsin diye).

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, dismissSpotlightIfShown, dismissFeedbackIfShown } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

async function readHistory(page) {
  return page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("eqEarTrainerProXAnswerHistory") || "null");
    return raw && Array.isArray(raw.records) ? raw.records : [];
  });
}

test("G326 KABUL KRİTERİ — 'Atla' ile geçilen soru cevap geçmişine 'skipped:true' olarak kaydediliyor, doğru cevap dolu", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "kesim-noktasi");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await dismissSpotlightIfShown(page);

  const before = await readHistory(page);
  assert.equal(before.length, 0, "ön koşul: geçmiş boş başlamalı");

  await page.locator("#nextBtn").click();
  await page.waitForTimeout(400);

  const after = await readHistory(page);
  assert.equal(after.length, 1, "Atla SONRASI TAM 1 kayıt oluşmalı");
  const rec = after[0];
  assert.equal(rec.modeId, "kesim-noktasi");
  assert.equal(rec.skipped, true, "atlanan kayıt skipped:true OLMALI");
  assert.equal(rec.correct, false, "atlama HÂLÂ yanlış cevap gibi işlenmeli (G324/G326 tutarlılığı)");
  assert.ok(rec.params && rec.params.correctAnswer, "doğru cevap (correctAnswer) EKSİKSİZ kaydedilmeli — 1.1'de dinletilecek");
  assert.ok(Number.isFinite(rec.params.correctAnswer.freq), `correctAnswer.freq GEÇERLİ bir sayı olmalı — ölçülen: ${JSON.stringify(rec.params.correctAnswer)}`);

  await page.close();
});

test("G326 REGRESYON KORUMASI — GERÇEK cevaplanan soru skipped:false olarak kaydediliyor (mevcut alanlar DEĞİŞMEDİ)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await dismissSpotlightIfShown(page);

  const choices = await page.evaluate(() => window.__aeaActiveQuestionChoices());
  const idx = choices.findIndex((c) => c.correct);
  await page.locator(".ans").nth(idx).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(600);
  await dismissFeedbackIfShown(page);

  const after = await readHistory(page);
  assert.equal(after.length, 1, "GERÇEK cevap SONRASI TAM 1 kayıt oluşmalı");
  const rec = after[0];
  assert.equal(rec.modeId, "boost-mu-cut-mu");
  assert.equal(rec.skipped, false, "GERÇEK cevap skipped:false OLMALI (G326 ÖNCESİ bu alan hiç YOKTU, şimdi açıkça false)");
  assert.equal(rec.correct, true);

  await page.close();
});

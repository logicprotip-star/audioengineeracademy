// G275 — OLCUM-CIHAZ2-17-08 madde B'nin düzeltmesi: syncUploadGate()'in
// upload-dosyasız dalı (`www/js/app.js`, needsGate) `.answers`'ı boşaltıp
// gizliyordu — ama kullanıcı GERİ, GEÇERLİ bir kaynağa dönünce `.answers`'ı
// geri getiren HİÇBİR satır YOKTU (`if (!sourceIsUpload)` dalı SADECE
// uploadGate/analyzer/gameSpectrumControls'u ele alıyordu). Sonuç: oyun
// sırasında kaynak "upload"a (dosyasız) çevrilip GERİ dönülünce soru/cevap
// alanı KALICI olarak boş/gizli kalıyordu, TEK çıkış "Atla" (G214'ten beri
// yanlış cevap sayılıyor). Düzeltme: `!sourceIsUpload` dalına syncAnswerArea()
// çağrısı eklendi — mevcut activeQuestion'a göre `.answers`'ı senkronlar,
// SORUYU DEĞİŞTİRMEZ (question.choices sabit kalır, sadece render tekrarlanır).

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

async function answersState(page) {
  return page.evaluate(() => {
    const a = document.getElementById("answers");
    return { hidden: a?.classList.contains("hidden"), childCount: a?.children.length };
  });
}

test("G275: kaynak upload'a (dosyasız) çevrilip GERİ geçerli bir kaynağa dönülünce #answers geri geliyor, soru DEĞİŞMİYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(600);
  await dismissSpotlightIfShown(page);

  const questionBefore = await page.evaluate(() => JSON.stringify(window.__aeaActiveQuestionChoices()));

  await page.evaluate(() => {
    const sel = document.getElementById("sourceSelect");
    sel.value = "upload";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(400);
  const duringUpload = await answersState(page);
  assert.equal(duringUpload.hidden, true, "upload+dosyasızKEN #answers görünür kalmamalı (dosya seçilene kadar gate paneli geçerli)");

  const sourceSelectRow = page.locator("[data-sheet-select='sourceSelect']");
  await sourceSelectRow.first().click();
  await page.waitForTimeout(300);
  await page.locator(".sheet-group-header", { hasText: "ENSTRÜMAN" }).first().click();
  await page.waitForTimeout(200);
  await page.locator(".sheet-option", { hasText: "Bas" }).first().click();
  await page.waitForTimeout(500);

  const afterRevert = await answersState(page);
  assert.equal(afterRevert.hidden, false, "REGRESYON: geçerli kaynağa dönünce #answers HÂLÂ gizli kaldı");
  assert.ok(afterRevert.childCount > 0, "REGRESYON: geçerli kaynağa dönünce #answers HÂLÂ boş kaldı");

  const questionAfter = await page.evaluate(() => JSON.stringify(window.__aeaActiveQuestionChoices()));
  assert.equal(questionAfter, questionBefore, "kaynak değişimi/geri dönüşü mevcut SORUYU değiştirmemeli");

  const choices = await page.evaluate(() => window.__aeaActiveQuestionChoices());
  const correctIdx = choices.findIndex((c) => c.correct);
  const ansBtn = page.locator(".ans").nth(correctIdx);
  assert.ok(await ansBtn.isVisible(), "doğru şık tıklanabilir/görünür olmalı");
  await ansBtn.click();
  await page.waitForTimeout(1000);
  const feedbackShown = await page.evaluate(() => document.getElementById("feedbackBox")?.classList.contains("show-result"));
  assert.ok(feedbackShown, "cevap normal şekilde işlenip geri bildirim göstermeli");

  await page.close();
});

test("G275 REGRESYON KORUMASI: upload GERÇEKTEN dosyasızken gizleme davranışı BOZULMADI", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(600);
  await dismissSpotlightIfShown(page);

  await page.evaluate(() => {
    const sel = document.getElementById("sourceSelect");
    sel.value = "upload";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(400);

  const gateVisible = await page.evaluate(() => !document.getElementById("uploadGate")?.classList.contains("hidden"));
  const state = await answersState(page);
  assert.equal(gateVisible, true, "upload+dosyasızken gate paneli GÖRÜNMELİ (davranış korunmalı)");
  assert.equal(state.hidden, true, "upload+dosyasızken #answers GİZLİ kalmalı (davranış korunmalı)");

  await page.close();
});

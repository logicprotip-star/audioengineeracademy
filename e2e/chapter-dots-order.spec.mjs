// G276 — OLCUM-CIHAZ2-17-08 madde A'nın düzeltmesi: BÖLÜM çubuğunun nokta
// çizimi challenge.correct/done SAYAÇLARINA (sıra bilgisi taşımayan) göre
// "önce N doğru sonra kalan yanlış" çiziyordu — GERÇEK cevap sırasını
// YANSITMIYORDU (cihazda ölçüldü: 1. ve 5. soru doğruysa çubukta 1. VE 2.
// nokta yeşil görünüyordu). challenge.results[] (core/challenge.js) artık
// HER pozisyonun KENDİ gerçek sonucunu tutuyor, renderGameHeader() bunu
// okuyor.

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

async function answer(page, wantCorrect) {
  await dismissSpotlightIfShown(page);
  const choices = await page.evaluate(() => window.__aeaActiveQuestionChoices());
  const idx = wantCorrect ? choices.findIndex((c) => c.correct) : choices.findIndex((c) => !c.correct);
  await page.locator(".ans").nth(idx).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await dismissFeedbackIfShown(page);
  await page.waitForTimeout(300);
}

async function dots(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("#gameChapterDots .game-chapter-dot")).map((d) => {
      if (d.classList.contains("on")) return "ON";
      if (d.classList.contains("wrong")) return "WRONG";
      return "-";
    })
  );
}

test("G276: BÖLÜM çubuğu GERÇEK cevap sırasını gösteriyor — DOĞRU,YANLIŞ,YANLIŞ,YANLIŞ,DOĞRU deseni [ON,WRONG,WRONG,WRONG,ON] üretmeli, [ON,ON,WRONG,-,-] DEĞİL", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } }); // playMode:"challenge"
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissSpotlightIfShown(page);

  // Kullanıcının kendi cihaz senaryosu: 1. ve 5. soru doğru, 2-3-4 yanlış.
  const pattern = [true, false, false, false, true];
  for (const wantCorrect of pattern) await answer(page, wantCorrect);

  const state = await dots(page);
  assert.deepEqual(
    state.slice(0, 5),
    ["ON", "WRONG", "WRONG", "WRONG", "ON"],
    `BÖLÜM çubuğu GERÇEK sırayı yansıtmalı — alınan: [${state.slice(0, 5).join(",")}]`
  );

  await page.close();
});

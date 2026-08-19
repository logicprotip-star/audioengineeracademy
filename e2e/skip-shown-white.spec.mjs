// G324 — "Atla" ARTIK ne doğru (yeşil/altın) ne yanlış (kırmızı) sayılıyor,
// BEYAZ (nötr) gösteriliyor: BÖLÜM çubuğunda (#gameChapterDots) VE sınav/
// telafi çubuğunda (#gameExamDots). KABUL KRİTERİ: sadece bu görsel işaret
// değişti — done/correct sayaçları, geçme eşiği FORMÜLÜ (atlama HÂLÂ
// "yanlış" olarak işleniyor, bkz. core/exam-system.js:recordAnswer G324
// notu) DEĞİŞMEDİ.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, dismissSpotlightIfShown, dismissFeedbackIfShown, dismissExamScreenIfShown } from "./helpers/app-fixtures.mjs";

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

async function chapterDots(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("#gameChapterDots .game-chapter-dot")).map((d) => {
      if (d.classList.contains("skip")) return "SKIP";
      if (d.classList.contains("on")) return "ON";
      if (d.classList.contains("wrong")) return "WRONG";
      return "-";
    })
  );
}

async function examDots(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("#gameExamDots .game-exam-dot")).map((d) => {
      if (d.classList.contains("skip")) return "SKIP";
      if (d.classList.contains("on")) return "ON";
      if (d.classList.contains("wrong")) return "WRONG";
      return "-";
    })
  );
}

test("G324 KABUL KRİTERİ — BÖLÜM çubuğunda Atla BEYAZ (skip), doğru YEŞİL/ALTIN, yanlış KIRMIZI kalıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } }); // playMode:"challenge" (varsayılan)
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissSpotlightIfShown(page);

  // 1. doğru, 2. yanlış, 3. Atla (COMBO_THRESHOLD=6'nın ÇOK altında,
  // erken-sınav teklifi tetiklenmez).
  await answer(page, true);
  await answer(page, false);
  await dismissSpotlightIfShown(page);
  await page.locator("#nextBtn").click();
  await page.waitForTimeout(500);

  const state = await chapterDots(page);
  assert.deepEqual(
    state.slice(0, 3),
    ["ON", "WRONG", "SKIP"],
    `BÖLÜM çubuğu Atla'yı BEYAZ göstermeli — alınan: [${state.slice(0, 3).join(",")}]`
  );

  await page.close();
});

test("G324 KABUL KRİTERİ — telafi çubuğunda Atla BEYAZ (skip), TELAFİ sayacı normal ilerliyor (sayaç FORMÜLÜ değişmedi)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);

  // PARKUR_LENGTH=10 — hepsi Atla (yanlış sayılır) → telafi anons ekranı.
  for (let i = 0; i < 10; i++) {
    await page.locator("#nextBtn").click();
    await page.waitForTimeout(200);
  }
  await dismissExamScreenIfShown(page);
  await dismissSpotlightIfShown(page);

  // Telafide İLK soruyu Atla ile geç.
  await page.locator("#nextBtn").click();
  await page.waitForTimeout(500);

  const state = await examDots(page);
  assert.equal(state[0], "SKIP", `telafi çubuğunun İLK noktası BEYAZ (skip) olmalı — alınan: [${state.join(",")}]`);

  const progress = await page.evaluate(() => document.getElementById("gameExamProgress")?.textContent || "");
  assert.equal(progress, "TELAFİ 2/5", `Atla sonrası TELAFİ sayacı normal ilerlemedi (sayaç FORMÜLÜ bozulmuş olabilir) — alınan: "${progress}"`);

  await page.close();
});

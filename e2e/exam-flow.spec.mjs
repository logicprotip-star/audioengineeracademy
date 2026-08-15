// E — Sınav/telafi bitişi → hangi ekran açılıyor (TEST-BOSLUGU-15-08.md,
// madde E). G214'ün kendi doğrulama script'inin (scratchpad'deki
// g214_skip_verify.py) kalıcı hâli — #54'ün yaşandığı TAM katman
// (handleExamOutcome()'un event'leri DOĞRU ekrana çeviriyor mu) artık
// her koşuda otomatik doğrulanıyor, bir daha commit'lenmemiş bir
// script'e bağımlı değil.
//
// core/exam-system.js'in KENDİSİ zaten çok iyi test edilmiş (test/exam-
// system.test.mjs, 31 test) — o testler event ÜRETİMİNİ (SAF state
// machine) doğruluyor. Bu dosya event'lerin app.js'te DOĞRU EKRANA
// çevrildiğini (goScreen/showExamScreen çağrıları) doğruluyor — o katman
// hiçbir zaman test görmemişti.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, activeScreenId, dismissExamScreenIfShown } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

test("parkur bitişi (10 yanlış) → telafi anons ekranı (screen-exam) açılır", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);

  // PARKUR_LENGTH=10 (core/exam-system.js) — "Atla" her cevabı yanlış
  // sayıyor (G214), 10'da bir remedial-start event'i doğar.
  for (let i = 0; i < 10; i++) {
    await page.locator("#nextBtn").click();
    await page.waitForTimeout(200);
  }

  assert.equal(await activeScreenId(page), "screen-exam", "10 yanlışlık parkur sonunda telafi anons ekranı açılmadı");
  const progress = await page.evaluate(() => document.getElementById("exBody")?.textContent || document.getElementById("exTitle")?.textContent || null);
  assert.ok(progress, "telafi anons ekranının gövde metni boş");
  await page.close();
});

test("telafi bitişi (5 yanlış, hepsi kaybedilir) → yeni parkur, screen-game'e döner, telafi satırı kapanır", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);

  for (let i = 0; i < 10; i++) {
    await page.locator("#nextBtn").click();
    await page.waitForTimeout(200);
  }
  assert.equal(await activeScreenId(page), "screen-exam", "ön koşul: telafi anons ekranı açılmadı");
  await dismissExamScreenIfShown(page);
  assert.equal(await activeScreenId(page), "screen-game", "telafi anonsu kapatılınca oyun ekranına dönmedi");

  // REMEDIAL_LENGTH=5 — 5 yanlış telafiyi BAŞARISIZ kapatır, yeni parkur
  // otomatik başlar (resetParkur zaten examSystem içinde çağrılır).
  for (let i = 0; i < 5; i++) {
    await page.locator("#nextBtn").click();
    await page.waitForTimeout(200);
    await dismissExamScreenIfShown(page);
  }

  const finalScreen = await activeScreenId(page);
  assert.equal(finalScreen, "screen-game", `telafi bitince kilitlenme/beklenmeyen ekran: ${finalScreen}`);
  const examRowHidden = await page.evaluate(() => document.getElementById("gameExamRow")?.classList.contains("hidden"));
  assert.equal(examRowHidden, true, "telafi bitti ama sınav satırı hâlâ açık görünüyor — kilitlenme belirtisi");
  await page.close();
});

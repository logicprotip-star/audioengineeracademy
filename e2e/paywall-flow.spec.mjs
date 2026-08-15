// A — Paywall matrisi (TEST-BOSLUGU-15-08.md, madde A).
// REGRESYON-15-08.md'nin scratchpad script'lerinin (reg_paywall_check.py/
// reg_lives_check.py) kalıcı hâli — o turda ELLE çalıştırılıp SONUCU
// rapora yazılan, sonra SİLİNEN doğrulamalar artık her `npm run test:e2e`
// çağrısında otomatik tekrarlanıyor.
//
// KİLİT: finalizeIfGameOver/blockIfLivesOut/blockIfSessionLimitReached —
// HİÇBİRİNE dokunulmadı, bu dosya SADECE onların GÖZLENEN davranışını
// assert ediyor.
//
// G220 GÜNCELLEMESİ (kullanıcı kararı) — "İlk oturumda paywall yok" kuralı
// (G63) KALDIRILDI: `openPaywallReason()`'daki `paywallSuppressedFirstSession`
// kontrolü söküldü (bkz. app.js). Dört senaryo hâlâ (soru hakkı bitti /
// canlar bitti) × (stats.rounds=0 / stats.rounds>0) matrisini kapsıyor —
// AMA artık DÖRDÜ DE aynı sonuca (GERÇEK paywall) varmalı. "İlk oturum"
// seed'i BİLEREK korundu: bu, kaldırmanın stats.rounds===0 durumunda da
// GERÇEKTEN tam çalıştığını (sadece "değil" durumunda değil) kanıtlıyor.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, dismissSpotlightIfShown, activeScreenId } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

async function newPage() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  return page;
}

// "Atla"ya basarak ücretsiz oturum limitine (5 soru) ulaşır — G185'in
// blockIfSessionLimitReached() yolu, startRound()'un başında.
async function exhaustFreeSessionLimit(page) {
  for (let i = 0; i < 6; i++) {
    const visible = await page.locator("#nextBtn").isVisible().catch(() => false);
    if (!visible) break;
    await page.locator("#nextBtn").click();
    await page.waitForTimeout(200);
  }
}

// Can 0'ken bir round başlatmaya ÇALIŞIR — blockIfLivesOut()'un
// startRound()/goToNextRound() başındaki kontrolünü tetikler.
async function triggerLivesOutCheck(page) {
  await page.locator("#startBtn").click();
  await page.waitForTimeout(300);
  await dismissSpotlightIfShown(page);
}

async function readOutcome(page) {
  return page.evaluate(() => ({
    screen: document.querySelector(".screen.active")?.id || null,
    resKicker: document.getElementById("resKicker")?.textContent || null,
    resCta: document.getElementById("resCta")?.textContent || null,
    paywallReasonTitle: document.getElementById("paywallReasonTitle")?.textContent || null,
  }));
}

test("soru hakkı bitti + İLK OTURUM (stats yok) → GERÇEK paywall açılır (G63 kaldırıldı)", async () => {
  const page = await newPage();
  await seedLocalStorage(page, { stats: null });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await exhaustFreeSessionLimit(page);

  const out = await readOutcome(page);
  assert.equal(out.screen, "screen-paywall", `beklenen screen-paywall, gelen: ${out.screen}`);
  assert.equal(out.paywallReasonTitle, "Ücretsiz oturumun bitti");
  await page.close();
});

test("soru hakkı bitti + İLK OTURUM DEĞİL (stats.rounds=50) → GERÇEK paywall açılır", async () => {
  const page = await newPage();
  await seedLocalStorage(page, { stats: { rounds: 50 } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await exhaustFreeSessionLimit(page);

  const out = await readOutcome(page);
  assert.equal(out.screen, "screen-paywall", `beklenen screen-paywall, gelen: ${out.screen}`);
  assert.equal(out.paywallReasonTitle, "Ücretsiz oturumun bitti");
  await page.close();
});

test("canlar bitti + İLK OTURUM (stats.rounds=0, lives=0) → GERÇEK paywall açılır (G63 kaldırıldı)", async () => {
  const page = await newPage();
  await seedLocalStorage(page, { stats: { rounds: 0, lives: 0 } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await triggerLivesOutCheck(page);

  const out = await readOutcome(page);
  assert.equal(out.screen, "screen-paywall", `beklenen screen-paywall, gelen: ${out.screen}`);
  assert.equal(out.paywallReasonTitle, "Devam etmek için bir yol seç");
  await page.close();
});

test("canlar bitti + İLK OTURUM DEĞİL (stats.rounds=50, lives=0) → GERÇEK paywall açılır", async () => {
  const page = await newPage();
  await seedLocalStorage(page, { stats: { rounds: 50, lives: 0 } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await triggerLivesOutCheck(page);

  const out = await readOutcome(page);
  assert.equal(out.screen, "screen-paywall", `beklenen screen-paywall, gelen: ${out.screen}`);
  assert.equal(out.paywallReasonTitle, "Devam etmek için bir yol seç");
  await page.close();
});

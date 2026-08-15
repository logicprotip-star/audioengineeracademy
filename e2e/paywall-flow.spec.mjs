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
import { seedLocalStorage, enterMode, dismissSpotlightIfShown, activeScreenId, dismissFeedbackIfShown, mockAdReward } from "./helpers/app-fixtures.mjs";

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

// G225 (madde 30 düzeltmesi) — "Atla" (#nextBtn) ile sessionLimit'e ulaşan
// kullanıcının ekranı temiz "Oyunu Başlat" (▶) idle durumuna düşüyor
// (feedback paneli hiç açılmadı) — reklam izleyip +5 soru kazandıktan
// SONRA #startBtn'e basmak `els.startBtn`'in `!activeQuestion` dalını
// (fresh-start) tetikliyordu, bu da kazanılan hakkı SİLİYORDU (madde 30,
// G224'te %100 tekrar üretildi). `paywallEndedRoundForResume` bayrağı bu
// ikisini artık ayırıyor — bu test o düzeltmeyi doğruluyor.
test("madde 30 (Atla yolu): sessionLimit paywall'ında reklam izleyip +5 soru kazanan kullanıcı, 'Oyunu Başlat'a basınca hakkı KAYBETMEZ", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mockAdReward(page);
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");

  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await exhaustFreeSessionLimit(page);

  const beforeAd = await readOutcome(page);
  assert.equal(beforeAd.screen, "screen-paywall", `ön koşul: 5. "Atla" sonrası paywall açılmadı (${beforeAd.screen})`);
  assert.equal(beforeAd.paywallReasonTitle, "Ücretsiz oturumun bitti");

  const adBtnVisible = await page.locator("#watchAdBtn").isVisible().catch(() => false);
  assert.equal(adBtnVisible, true, "ön koşul: #watchAdBtn görünür değil");
  const adDailyLabelBefore = await page.locator("#watchAdBtnLabel").textContent();
  assert.match(adDailyLabelBefore, /bugün 3 hakkın kaldı/, `ön koşul: günlük reklam sayacı beklenen 3 değil (${adDailyLabelBefore})`);
  await page.locator("#watchAdBtn").click();
  await page.waitForTimeout(1500);

  // Kaldığı yerden devam — ekran "Oyunu Başlat" (▶) idle durumunda olmalı
  // (feedback paneli YOK, "Atla" hiç açmadı).
  const startLabel = await page.locator("#startBtn").textContent();
  assert.equal(startLabel, "▶", `ön koşul: #startBtn 'Oyunu Başlat' (▶) göstermiyor (${startLabel})`);

  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);

  const after = await page.evaluate(() => ({
    screen: document.querySelector(".screen.active")?.id || null,
    qNum: document.getElementById("gameQNum")?.textContent || null,
    qMax: document.getElementById("gameQMax")?.textContent || null,
  }));
  assert.equal(after.screen, "screen-game", `resume sonrası screen-game bekleniyordu, gelen: ${after.screen}`);
  assert.equal(after.qMax, "10", `KABUL KRİTERİ: reklamla kazanılan +5 soru hakkı silinmiş — #gameQMax "10" değil "${after.qMax}"`);
  assert.equal(after.qNum, "6", `KABUL KRİTERİ: round sayacı sıfırlanmış — #gameQNum "6" değil "${after.qNum}"`);

  // 5 soru daha oynanabiliyor mu — "Atla" ile devam, paywall'a erken düşmemeli.
  for (let i = 0; i < 4; i++) {
    await page.locator("#nextBtn").click();
    await page.waitForTimeout(200);
  }
  const mid = await activeScreenId(page);
  assert.equal(mid, "screen-game", `9. sorudan önce paywall'a düşülmemeli, gelen: ${mid}`);

  // Günlük reklam sayacı doğru azaldı mı (3 → 2).
  await page.locator("#nextBtn").click(); // 10. "Atla" — sessionLimit'e (10/10) tekrar ulaşır
  await page.waitForTimeout(200);
  const finalScreen = await activeScreenId(page);
  assert.equal(finalScreen, "screen-paywall", `10 soru sonunda paywall tekrar açılmalı, gelen: ${finalScreen}`);
  const adDailyLabelAfter = await page.locator("#watchAdBtnLabel").textContent().catch(() => null);
  if (adDailyLabelAfter) {
    assert.match(adDailyLabelAfter, /bugün 2 hakkın kaldı/, `günlük reklam sayacı 3→2 azalmamış (${adDailyLabelAfter})`);
  }

  await page.close();
});

// G225 — cevaplayarak (`.ans`) limite ulaşan yol BOZULMADI mı doğrulanıyor
// (bu yol zaten `goToNextRound()` üzerinden resume ediyordu, madde 30'un
// reset koduna hiç uğramıyordu — G225 bu davranışa DOKUNMADI).
async function dismissAndAnswer(page) {
  await dismissSpotlightIfShown(page);
  await dismissFeedbackIfShown(page);
  await page.locator(".ans").first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

test("madde 30 (cevaplama yolu, regresyon): cevaplayarak sessionLimit'e ulaşan kullanıcı reklamla devam ederken BOZULMADI", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mockAdReward(page);
  await page.goto(serverHandle.baseUrl);
  // feedbackScreen:false — QUICK_ADVANCE_MS ile hızlı ilerler, `dismissAndAnswer`'ın
  // kendi #feedbackClose kapatma çağrısıyla YARIŞMAZ (feedbackScreen:true'da
  // 4000/6000ms'lik uzun otomatik-ilerleme zamanlayıcısı BU çağrıyla çakışıp
  // çift-ilerleme/yarış durumuna yol açtığı ölçüldü). Kritik olan (oyun bitince
  // panelin AÇIK kalması) feedbackScreen'DEN BAĞIMSIZ zaten doğru — gameOver
  // true iken scheduleNext() hiç çağrılmıyor (app.js:4059 deseni).
  await seedLocalStorage(page, { stats: { lives: 999, rounds: 50 }, feedbackScreen: false });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");

  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  for (let i = 0; i < 5; i++) await dismissAndAnswer(page);

  const beforeAd = await readOutcome(page);
  assert.equal(beforeAd.screen, "screen-paywall", `ön koşul: 5. cevap sonrası paywall açılmadı (${beforeAd.screen})`);
  assert.equal(beforeAd.paywallReasonTitle, "Ücretsiz oturumun bitti");

  await page.locator("#watchAdBtn").click();
  await page.waitForTimeout(1500);

  // Feedback paneli (5. sorudan kalma) hâlâ açık olmalı — kapatınca
  // goToNextRound() üzerinden OTOMATİK resume etmeli, #startBtn'e HİÇ
  // basmadan.
  const closed = await dismissFeedbackIfShown(page);
  assert.equal(closed, true, "ön koşul: feedback paneli açık değildi — bu test bu senaryoyu ölçemedi");

  const after = await page.evaluate(() => ({
    screen: document.querySelector(".screen.active")?.id || null,
    qNum: document.getElementById("gameQNum")?.textContent || null,
    qMax: document.getElementById("gameQMax")?.textContent || null,
  }));
  assert.equal(after.screen, "screen-game", `otomatik resume sonrası screen-game bekleniyordu, gelen: ${after.screen}`);
  assert.equal(after.qMax, "10", `regresyon: cevaplama yolunda #gameQMax "10" değil "${after.qMax}"`);
  assert.equal(after.qNum, "6", `regresyon: cevaplama yolunda #gameQNum "6" değil "${after.qNum}"`);

  await page.close();
});

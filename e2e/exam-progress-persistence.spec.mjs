// G307 (OLCUM-KESINTI-18-08 B1-B4 + OLCUM-SINAV-MIMARI-18-08) — sınav/telafi
// mekaniği (core/exam-system.js) TEK, global bir örneğe dayanıyordu, mod
// değişince (`enterMode()`'un `examSystem.setMode()` çağrısı) durum
// KOŞULSUZ sıfırlanıyordu — "TELAFİ 2/5" göstergesi başka moda gidip
// dönünce KAYBOLUYORDU (Playwright'ta ölçüldü). AYRICA `persistInProgressRound()`
// sınav/telafi fazında BİLEREK kayıt YAPMIYORDU (G203'ün kendi notu:
// "bilinçli dar kapsam") — uygulama kapanıp açılınca da AYNI şekilde
// kayboluyordu.
//
// Düzeltme İKİ katman: (a) exam-system.js İÇİNDE mod-başına AYRI durum
// (perModeState, İÇ bir Map — DIŞ API TEK SATIR değişmedi, bkz.
// test/exam-system.test.mjs'in 36 ESKİ testinin HİÇBİRİNİN kırılmadığı),
// (b) examSystem.getFullSnapshot()/restoreFullSnapshot() ile TÜM modların
// durumu localStorage'a (`eqEarTrainerProXExamProgress`, G233 şema
// damgalı, trySave()'in AYNI koruması) yazılıp uygulama açılışında geri
// yükleniyor — persistInProgressRound()'un AYNI "#53 tek kontrol noktası"
// (pauseRound()) checkpoint'inden.

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

async function reachRemedialAndStart(page, modeId) {
  await enterMode(page, modeId);
  await dismissHeadphoneSheetIfShown(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);
  for (let i = 0; i < 10; i++) {
    await dismissSpotlightIfShown(page);
    const screen = await page.evaluate(() => document.querySelector(".screen.active")?.id);
    if (screen === "screen-exam") break;
    await page.locator("#nextBtn").click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  const screen = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  if (screen !== "screen-exam") return false;
  await page.locator("#exCta").click({ timeout: 3000 });
  await page.waitForTimeout(300);
  return true;
}

async function examRowState(page) {
  return page.evaluate(() => ({
    examRowHidden: document.getElementById("gameExamRow")?.classList.contains("hidden"),
    examProgressText: document.getElementById("gameExamProgress")?.textContent,
  }));
}

async function leaveViaBackBtn(page) {
  await page.locator("#backBtn").click();
  await page.waitForTimeout(200);
  const exitConfirm = page.locator("#exitConfirmLeave");
  if (await exitConfirm.isVisible().catch(() => false)) await exitConfirm.click();
  await page.waitForTimeout(300);
}

test("G307 KABUL KRİTERİ (B1) — telafi turu başlatılıp BAŞKA moda gidilip GERİ dönülünce telafi KORUNUYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");

  const reached = await reachRemedialAndStart(page, "kesim-noktasi");
  assert.ok(reached, "ön koşul: telafi turu başlatılamadı");
  const before = await examRowState(page);
  assert.equal(before.examRowHidden, false, "ön koşul: telafi göstergesi görünür olmalıydı");
  assert.match(before.examProgressText, /TELAFİ/, "ön koşul: gösterge 'TELAFİ' yazmalıydı");

  await leaveViaBackBtn(page);
  await enterMode(page, "boost-mu-cut-mu");
  await page.waitForTimeout(300);
  await leaveViaBackBtn(page);

  await enterMode(page, "kesim-noktasi");
  await page.waitForTimeout(300);
  const after = await examRowState(page);
  assert.equal(after.examRowHidden, false, "DÜZELTME ÖNCESİ: telafi göstergesi GİZLENİYORDU (telafi silinmişti)");
  assert.equal(after.examProgressText, before.examProgressText, "DÜZELTME ÖNCESİ: telafi pozisyonu SIFIRLANIYORDU");

  await page.close();
});

test("G307 KABUL KRİTERİ (B2) — telafi turu başlatılıp SAYFA YENİLENİNCE (uygulama kapanıp açılma) telafi KORUNUYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");

  const reached = await reachRemedialAndStart(page, "kesim-noktasi");
  assert.ok(reached, "ön koşul: telafi turu başlatılamadı");
  const before = await examRowState(page);

  const rawExamProgress = await page.evaluate(() => localStorage.getItem("eqEarTrainerProXExamProgress"));
  assert.ok(rawExamProgress, "KABUL KRİTERİ — eqEarTrainerProXExamProgress DOLU olmalıydı (DÜZELTME ÖNCESİ: hiç yazılmıyordu)");
  const parsed = JSON.parse(rawExamProgress);
  assert.equal(parsed.schemaVersion, 1, "G233 şema damgası taşınmalı");
  assert.equal(parsed.byMode["kesim-noktasi"].phase, "remedial");

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  // G203'ün KENDİ round-kurtarma mekanizması (applyRestoredRoundIfAny) artık
  // telafi turunu da (persistInProgressRound()'un G307'de kaldırılan guard'ı
  // sayesinde) DOĞRUDAN screen-game'e geri getiriyor — menüye/mode-card'a
  // GEREK KALMADAN. Ekran zaten screen-game DEĞİLSE (G203'ün kurtaramadığı
  // bir durum) moda elle giriliyor.
  const screenAfterReload = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  if (screenAfterReload !== "screen-game") {
    await enterMode(page, "kesim-noktasi");
    await page.waitForTimeout(300);
  }
  const after = await examRowState(page);
  assert.equal(after.examRowHidden, false, "DÜZELTME ÖNCESİ: sayfa yenilenince telafi göstergesi GİZLENİYORDU");
  assert.equal(after.examProgressText, before.examProgressText, "DÜZELTME ÖNCESİ: sayfa yenilenince telafi pozisyonu SIFIRLANIYORDU");

  await page.close();
});

test("G307 KABUL KRİTERİ (B4) — iki modun telafi/parkur durumu AYNI ANDA, birbirini EZMEDEN korunuyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");

  const reached = await reachRemedialAndStart(page, "kesim-noktasi");
  assert.ok(reached);
  const kesimNoktasiState = await examRowState(page);

  await leaveViaBackBtn(page);
  await enterMode(page, "boost-mu-cut-mu");
  await page.waitForTimeout(300);
  // Boost mu Cut mu'da BİR soru cevapla (parkur pozisyonu ilerlesin).
  await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
  await page.waitForTimeout(300);
  await leaveViaBackBtn(page);

  await enterMode(page, "kesim-noktasi");
  await page.waitForTimeout(300);
  const kesimNoktasiAfter = await examRowState(page);
  // ÖNEMLİ: SADECE examProgressText'i karşılaştırmak YETERSİZ — #gameExamProgress'in
  // METNİ, satır SADECE CSS'le gizlendiğinde (examRowHidden=true) bile DOM'da
  // ESKİ hâliyle KALABİLİYOR (yeniden render edilmeyince silinmiyor) — bu,
  // DÜZELTME ÖNCESİ kodda bu testi YANLIŞLIKLA yeşile düşürüyordu (metin
  // aynıydı ama satır GİZLENMİŞTİ, yani telafi GERÇEKTE silinmişti).
  // examRowHidden'ı da AYRICA doğrulamak KABUL KRİTERİNİ gerçek bir
  // ayırt edici yapıyor (git stash ile doğrulandı).
  assert.equal(kesimNoktasiAfter.examRowHidden, kesimNoktasiState.examRowHidden, "KABUL KRİTERİ — Kesim Noktası'nın telafi GÖRÜNÜRLÜĞÜ Boost mu Cut mu'nun cevaplarından ETKİLENMEMELİ");
  assert.equal(kesimNoktasiAfter.examProgressText, kesimNoktasiState.examProgressText, "KABUL KRİTERİ — Kesim Noktası'nın telafisi, Boost mu Cut mu'nun cevaplarından ETKİLENMEMELİ");

  await page.close();
});

// REGRESYON KORUMASI — G174'ün (581f798, KİLİT'te korunan) "aynı moda
// dönüşte challenge SIZMAZ/SIFIRLANMAZ" ilkesi bu düzeltmeyle BOZULMADI:
// examSystem'in AYRI persist katmanı challenge'a hiç dokunmuyor.
test("G307 REGRESYON KORUMASI — normal (sınav/telafiye hiç uğramayan) bir moddan-çıkış/moda-dönüş davranışı DEĞİŞMEDİ", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await dismissSpotlightIfShown(page);

  await leaveViaBackBtn(page);
  await enterMode(page, "boost-mu-cut-mu");
  await dismissSpotlightIfShown(page);
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => document.getElementById("startBtn")?.textContent?.trim());
  assert.equal(state, "▶", "normal moddan-çıkış sonrası startBtn hâlâ doğru olmalı (regresyon yok)");
  assert.deepEqual(errors, [], `konsol hatası: ${errors.join(" | ")}`);

  await page.close();
});

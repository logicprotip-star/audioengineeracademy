// G320 (Logic'in kararı, OLCUM-KULAK-OGRETIM-19-08'in ardından) — Frekans
// Çakışması Aşama 3'ün "cevap sonrası ses DEVAM eder" istisnası (G51'den
// beri vardı, G306/G315'te AYRICA doğrulanmıştı) KALDIRILDI: G315'in
// "ekran açılınca ses kapansın" kuralına dahil edildi — geri bildirim
// paneli de "açılan bir şey" sayıldı. submitCakismaGuess() artık stage-3'te
// de KOŞULSUZ audioEngine.stopAudio() çağırıyor (diğer 11 modla/aşama 1-2
// ile AYNI).
//
// ⚠️ Bu değişiklik TEK BAŞINA kulak butonlarını (VE G321'de kaldırılan
// #cakismaBefore/#cakismaAfter'ı) SESSİZCE bozardı — ikisi de ÖNCEDEN
// "zincir hâlâ canlı" varsayımıyla SADECE audioEngine.setDualCut()
// çağırıyordu; stopAudio() dualFilterA/B'yi null'ladığı için bu artık
// no-op olurdu (ses HİÇ çalmaz, hata da fırlatmaz — SESSİZ bir bug).
// Düzeltme: kulak butonları artık TIKLANINCA zinciri buildDualSourceChain()
// ile YENİDEN KURUYOR, SONRA setDualCut() çağırıyor — Aşama 1'in kulak
// butonu deseniyle AYNI. (G321 — #cakismaBefore/#cakismaAfter'ın KENDİ
// düzeltmesi/testi ARTIK YOK, o kontrol TAMAMEN kaldırıldı — bkz.
// OLCUM-ONCE-SONRA-19-08.)
//
// Bu dosya ÜÇ KABUL KRİTERİNİ doğruluyor: (1) stage-3 cevap sonrası
// stopAudio() ARTIK çağrılıyor, (2) #cakismaCompare/#cakismaBefore/
// #cakismaAfter DOM'dan tamamen kaldırıldı (G321), (3) Aşama 1/2
// ETKİLENMEDİ (stopAudio() hâlâ hemen çağrılıyor, DEĞİŞMEDİ). G322
// (Logic'in kararı, OLCUM-KULAK-OGRETIM-19-08'in ardından) — kulak
// butonları da Frekans Çakışması'nda ARTIK GİZLİ (izolasyon olmadan
// öğretim değeri düşük, 1.1'de geri açılacak) — bu dosyanın "kulak
// butonu GERÇEKTEN ses üretiyor" testi bu YÜZDEN "GİZLİ" doğrulamasına
// çevrildi (ayrıntı: aşağıdaki testin kendi G322 notu).
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

async function stopAudioCallCount(page) {
  return page.evaluate(() => window.__aeaStopAudioCallCount());
}

async function enterCakismaAtStage(page, stage) {
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true }, playMode: "challenge" });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-cakismasi");
  await dismissHeadphoneSheetIfShown(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);

  // frekans-cakismasi.js:stageForIndex — idx<3→aşama1, idx<6→aşama2,
  // idx>=6→aşama3. #nextBtn/__aeaSubmitAnswerForTest deseni
  // cakisma-question-transition-stop.spec.mjs'ten BİREBİR (o dosyada 3
  // kez arka arkaya GÜVENİLİR çalıştığı doğrulandı — dismissSpotlightIfShown/
  // force:true EKLEMEK bu turda YENİ bir flakiness YARATTI, o YÜZDEN
  // buradan ÇIKARILDI, referans desene SADIK kalındı).
  const roundsToSkip = stage === 1 ? 0 : stage === 2 ? 3 : 6;
  for (let i = 0; i < roundsToSkip; i++) {
    await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
    await page.waitForTimeout(200);
    const nextBtn = page.locator("#nextBtn");
    if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  // G320 — __aeaActiveQuestionStageForTest ile hedef aşamaya GERÇEKTEN
  // ulaşıldığını DOĞRULA (sabit sayıma körü körüne güvenmek yerine) —
  // ulaşılmadıysa birkaç ek deneme (nextBtn'in ara sıra tek seferde
  // tetiklenmediği ölçüldü).
  const currentStage = async () => page.evaluate(() => window.__aeaActiveQuestionStageForTest && window.__aeaActiveQuestionStageForTest());
  let tries = 0;
  while ((await currentStage()) !== stage && tries < 5) {
    await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
    await page.waitForTimeout(200);
    const nextBtn = page.locator("#nextBtn");
    if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
    tries++;
  }
  assert.equal(await currentStage(), stage, `ön koşul: hedef aşamaya (${stage}) ulaşılamadı`);
}

test("G320 KABUL KRİTERİ — Aşama 3'te cevap verilince stopAudio() ARTIK çağrılıyor (istisna kaldırıldı)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterCakismaAtStage(page, 3);

  const before = await stopAudioCallCount(page);
  await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
  await page.waitForTimeout(400);
  const after = await stopAudioCallCount(page);
  assert.ok(after > before, `Aşama 3 cevabı SONRASI stopAudio() ARTMALIYDI (önce=${before}, sonra=${after}) — DÜZELTME ÖNCESİ hiç artmazdı`);

  await page.close();
});

// G322 (Logic'in kararı, OLCUM-KULAK-OGRETIM-19-08'in ardından) — kulak
// butonları Frekans Çakışması'nda artık GİZLİ (`CAKISMA_EAR_BUTTONS_
// ENABLED=false`, app.js) — bu test ESKİDEN #fbEarRight'a GERÇEK bir
// TIKLAMA ile ses ürettiğini doğruluyordu, artık buton GÖRÜNMEDİĞİ için
// bir kullanıcı tıklaması İMKANSIZ. ÖLÇÜLDÜ: click-handler'ın KENDİ
// `btn.classList.contains("hidden")` guard'ı (app.js, #feedbackBox
// delegasyonu) `.evaluate(el=>el.click())` ile de ATLATILAMIYOR — "hidden"
// iken mekanizma KASITLI olarak HİÇ tetiklenmiyor (RMS=0, hata YOK). Bu
// YÜZDEN G320'nin altındaki buildDualSourceChain+setDualCut mekanizmasını
// (1.1'de izolasyonla GERİ AÇILACAK) AYRICA canlı doğrulamak bu turda
// MÜMKÜN değil — `CAKISMA_EAR_BUTTONS_ENABLED` true'ya çekildiğinde
// e2e/ear-buttons.spec.mjs'in ESKİ "görünüyor/çalışıyor" testleri (bu
// commit'te GİZLİ-doğrulayan hâline çevrildi) GERİ ÇEVRİLİP mekanizma o
// zaman yeniden canlı doğrulanmalı.
test("G322 KABUL KRİTERİ — kulak butonu Aşama 3'te GİZLİ (artık görünmüyor)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterCakismaAtStage(page, 3);
  await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
  await page.waitForTimeout(400);

  const earVisible = await page.locator("#fbEarRight").isVisible().catch(() => false);
  assert.equal(earVisible, false, "kulak butonu (#fbEarRight) GÖRÜNÜYOR — G322'nin gizleme bayrağı çalışmıyor olabilir");

  await page.close();
});

test("G321 KABUL KRİTERİ — #cakismaCompare/#cakismaBefore/#cakismaAfter DOM'dan tamamen kaldırıldı", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterCakismaAtStage(page, 3);
  await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
  await page.waitForTimeout(400);

  const ids = ["cakismaCompare", "cakismaBefore", "cakismaAfter"];
  for (const id of ids) {
    const exists = await page.evaluate((elId) => document.getElementById(elId) !== null, id);
    assert.equal(exists, false, `#${id} HÂLÂ DOM'da — G321'in kaldırma işi tamamlanmamış olabilir`);
  }

  await page.close();
});

test("G320 REGRESYON KORUMASI — Aşama 1 ETKİLENMEDİ, cevap sonrası stopAudio() hâlâ hemen çağrılıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterCakismaAtStage(page, 1);

  const before = await stopAudioCallCount(page);
  await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
  await page.waitForTimeout(400);
  const after = await stopAudioCallCount(page);
  assert.ok(after > before, `[Aşama 1] cevap SONRASI stopAudio() ARTMALIYDI (önce=${before}, sonra=${after}) — bu DEĞİŞMEMELİYDİ`);

  await page.close();
});

test("G320 REGRESYON KORUMASI — Aşama 2 ETKİLENMEDİ, cevap sonrası stopAudio() hâlâ hemen çağrılıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterCakismaAtStage(page, 2);

  const before = await stopAudioCallCount(page);
  await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
  await page.waitForTimeout(400);
  const after = await stopAudioCallCount(page);
  assert.ok(after > before, `[Aşama 2] cevap SONRASI stopAudio() ARTMALIYDI (önce=${before}, sonra=${after}) — bu DEĞİŞMEMELİYDİ`);

  await page.close();
});

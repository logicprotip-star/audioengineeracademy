// G320 (Logic'in kararı, OLCUM-KULAK-OGRETIM-19-08'in ardından) — Frekans
// Çakışması Aşama 3'ün "cevap sonrası ses DEVAM eder" istisnası (G51'den
// beri vardı, G306/G315'te AYRICA doğrulanmıştı) KALDIRILDI: G315'in
// "ekran açılınca ses kapansın" kuralına dahil edildi — geri bildirim
// paneli de "açılan bir şey" sayıldı. submitCakismaGuess() artık stage-3'te
// de KOŞULSUZ audioEngine.stopAudio() çağırıyor (diğer 11 modla/aşama 1-2
// ile AYNI).
//
// ⚠️ Bu değişiklik TEK BAŞINA kulak butonlarını VE #cakismaBefore/
// #cakismaAfter geçiş düğmelerini SESSİZCE bozardı — ikisi de ÖNCEDEN
// "zincir hâlâ canlı" varsayımıyla SADECE audioEngine.setDualCut()
// çağırıyordu; stopAudio() dualFilterA/B'yi null'ladığı için bu artık
// no-op olurdu (ses HİÇ çalmaz, hata da fırlatmaz — SESSİZ bir bug).
// Düzeltme: HER İKİSİ de artık TIKLANINCA zinciri buildDualSourceChain()
// ile YENİDEN KURUYOR, SONRA setDualCut() çağırıyor — Aşama 1'in kulak
// butonu deseniyle AYNI.
//
// Bu dosya dört KABUL KRİTERİNİ doğruluyor: (1) stage-3 cevap sonrası
// stopAudio() ARTIK çağrılıyor, (2) kulak butonları GERÇEKTEN ses
// üretmeye devam ediyor (canlı AnalyserNode RMS ölçümüyle — sadece
// dataset/`.on` class kontrolü SESSİZ no-op'u YAKALAMAZDI), (3)
// #cakismaBefore/#cakismaAfter de AYNI şekilde çalışıyor, (4) Aşama 1/2
// ETKİLENMEDİ (stopAudio() hâlâ hemen çağrılıyor, DEĞİŞMEDİ).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, dismissSpotlightIfShown } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

function installAnalyserProbe() {
  window.__probe = { analysers: [] };
  const AC = window.AudioContext || window.webkitAudioContext;
  const orig = AC.prototype.createAnalyser;
  AC.prototype.createAnalyser = function (...args) {
    const node = orig.apply(this, args);
    window.__probe.analysers.push(node);
    return node;
  };
}

async function rms(page) {
  return page.evaluate(() => {
    const arr = window.__probe.analysers;
    const analyser = arr[arr.length - 1];
    if (!analyser) return null;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
    return Math.sqrt(sum / data.length);
  });
}

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
  await page.addInitScript(installAnalyserProbe);
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

test("G320 KABUL KRİTERİ — kulak butonları Aşama 3'te GERÇEKTEN ses üretmeye devam ediyor (canlı RMS ölçümü)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterCakismaAtStage(page, 3);
  await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
  await page.waitForTimeout(400);

  const earVisible = await page.locator("#fbEarRight").isVisible().catch(() => false);
  assert.ok(earVisible, "ön koşul: kulak butonu (#fbEarRight) görünür olmalıydı");

  await page.locator("#fbEarRight").click({ timeout: 5000 });
  await page.waitForTimeout(500);
  const level = await rms(page);
  assert.ok(level !== null && level > 0.005, `kulak butonuna basınca GERÇEKTEN ses ÜRETİLMELİ — ölçülen RMS=${level} (DÜZELTME ÖNCESİ: setDualCut null filtrede sessizce no-op olurdu, RMS≈0)`);

  await page.close();
});

test("G320 KABUL KRİTERİ — #cakismaBefore/#cakismaAfter Aşama 3'te GERÇEKTEN ses üretmeye devam ediyor (canlı RMS ölçümü)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterCakismaAtStage(page, 3);
  await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
  await page.waitForTimeout(500);

  const compareVisible = await page.locator("#cakismaCompare").isVisible().catch(() => false);
  assert.ok(compareVisible, "ön koşul: #cakismaCompare (Önce/Sonra) görünür olmalıydı");

  // ⚠️ ÖLÇÜLEREK BULUNAN, BU TURUN KAPSAMI DIŞINDA bırakılan GERÇEK bir
  // bug (audio/stopAudio değişikliğiyle İLGİSİZ, index.html/styles.css'e
  // bu turda dokunulmadı — ÖNCEDEN DE vardı): #cakismaCompare `.game-scroll`
  // akışının İÇİNDE, SABİT olmayan bir konumda — #feedbackBox (`.fb`,
  // position:fixed, viewport'un ALT ~29vh'i, z-index:91) açıkken (yani
  // #cakismaCompare'ın GÖRÜNÜR olduğu TEK an) `document.elementFromPoint`
  // bu koordinatta GERÇEKTEN #feedbackDetail'i buluyor (ÖLÇÜLDÜ) —
  // #cakismaBefore/#cakismaAfter bir GERÇEK dokunuşla da ULAŞILAMAZ
  // olabilir. `force:true` bunu ATLAMIYOR (Playwright'ın force'u SADECE ön-
  // kontrolleri atlıyor, TARAYICININ KENDİ hit-test'i coordinat bazlı kalıyor
  // — ölçüldü, force'la bile RMS=0 çıktı). Bu YÜZDEN burada `.evaluate(el =>
  // el.click())` (cakisma-question-transition-stop.spec.mjs'in #nextBtn için
  // KULLANDIĞI AYNI DOM-click deseni — hit-test'i TAMAMEN atlar) kullanılıyor
  // — SADECE JS/ses mantığını (asıl bu turun konusu) izole doğrulamak için;
  // bu, GERÇEK bir dokunuşun bu butonlara ULAŞABİLDİĞİNİ KANITLAMIYOR.
  await page.locator("#cakismaBefore").evaluate((el) => el.click());
  await page.waitForTimeout(500);
  const beforeLevel = await rms(page);
  assert.ok(beforeLevel !== null && beforeLevel > 0.005, `'Önce' butonuna basınca GERÇEKTEN ses ÜRETİLMELİ — ölçülen RMS=${beforeLevel}`);

  await page.locator("#cakismaAfter").evaluate((el) => el.click());
  await page.waitForTimeout(500);
  const afterLevel = await rms(page);
  assert.ok(afterLevel !== null && afterLevel > 0.005, `'Sonra' butonuna basınca GERÇEKTEN ses ÜRETİLMELİ — ölçülen RMS=${afterLevel}`);

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

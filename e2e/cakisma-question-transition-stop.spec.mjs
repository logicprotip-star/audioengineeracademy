// G306 (OLCUM-SES-BIRIKME-18-08 + OLCUM-GENIS-18-08 madde A4) — bir
// SONRAKİ soru GERÇEKTEN başladığında (startRound(), tüm erken-dönüş
// kapıları geçildikten SONRA, yeni round KESİN başlarken) KOŞULSUZ
// audioEngine.stopAudio() çağrılıyor. Ayrıca playQuestion()'ın cakisma
// dalı artık buildDualSourceChain()'i AWAIT EDİYOR (G51'den beri
// "BİLEREK await edilmiyordu") — playQuestion()'ın DÖNÜŞÜ artık zincirin
// GERÇEKTEN kurulduğu ANI yansıtıyor, hızlı ardışık çağrılarla YARIŞ
// penceresi daraltıldı.
//
// G320 GÜNCELLEMESİ (Logic'in kararı, OLCUM-KULAK-OGRETIM-19-08'in
// ardından) — "stage-3 cevabı SONRASI ses DEVAM eder" istisnası
// KALDIRILDI (G315'in "ekran açılınca ses kapansın" kuralına dahil
// edildi, bkz. e2e/cakisma-stage3-stops-audio.spec.mjs). KABUL KRİTERİ 1
// bu YÜZDEN TERSİNE çevrildi — ESKİDEN "stopAudio() ÇAĞIRMAMALI" derdi,
// ARTIK "ÇAĞIRMALI" diyor (G306/G315 dönemindeki DAVRANIŞ, o turlarda
// KASITLI korunmuştu — bu turda Logic'in AÇIK kararıyla değişti).
//
// KABUL KRİTERİ: (1) stage-3 cevap SONRASI stopAudio() ARTIK çağrılıyor
// (G320), (2) "Sonraki"ye basılıp YENİ soru başladığında
// stopAudioCallCount YİNE artıyor (koşulsuz temizlik GERÇEKTEN
// tetikleniyor — G320 SONRASI stage-3 cevabı KENDİSİ de +1 sayıyor, bu
// yüzden delta artık farklı bir SAYIYA denk geliyor, aşağı bkz.), (3) 12
// modun TAMAMINDA (temsilen tek-kaynaklı + three-way + cakisma) round
// geçişi konsol hatasız çalışıyor.

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

test("G306/G320 KABUL KRİTERİ — Frekans Çakışması aşama 3: cevap sonrası stopAudio() ARTIK çağrılıyor, 'Sonraki' ile YENİ soru başlayınca YİNE çağrılıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => assert.fail(`konsol hatası: ${e.message}`));
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-cakismasi");
  await dismissHeadphoneSheetIfShown(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);

  // Stage 3'e ulaşmak için ilk 6 soruyu geç.
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
    await page.waitForTimeout(200);
    const nextBtn = page.locator("#nextBtn");
    if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
  }

  const countBeforeAnswer = await page.evaluate(() => window.__aeaStopAudioCallCount());
  await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
  await page.waitForTimeout(400);
  const countAfterAnswer = await page.evaluate(() => window.__aeaStopAudioCallCount());
  // G320 — DÜZELTME ÖNCESİ burası `assert.equal(countAfterAnswer, countBeforeAnswer, ...)`
  // idi ("stage-3 cevabı stopAudio() ÇAĞIRMAMALI"). Logic'in kararıyla istisna
  // kaldırıldı — artık TERSİ doğru.
  assert.ok(countAfterAnswer > countBeforeAnswer, `KABUL KRİTERİ 1 — stage-3 cevabı ARTIK stopAudio() ÇAĞIRMALI (önce=${countBeforeAnswer}, sonra=${countAfterAnswer}) — G320: "önce/sonra" istisnası kaldırıldı`);

  const nextBtn = page.locator("#nextBtn");
  const nextVisible = await nextBtn.isVisible().catch(() => false);
  assert.ok(nextVisible, "ön koşul: 'Sonraki' butonu görünür olmalıydı");
  await nextBtn.evaluate((el) => el.click());
  await page.waitForTimeout(400);
  const countAfterNext = await page.evaluate(() => window.__aeaStopAudioCallCount());
  const delta = countAfterNext - countAfterAnswer;
  // KABUL KRİTERİ 2 — İKİ ayrı stopAudio() çağrısı bekleniyor: (a) startRound()'un
  // KENDİ, YENİ eklenen koşulsuz çağrısı (yeni round KESİN başlarken, chain-
  // builder'lardan BAĞIMSIZ/ERKEN) + (b) buildDualSourceChain()'in HER ZAMAN
  // var olan kendi başlangıç çağrısı. DÜZELTME ÖNCESİ SADECE (b) vardı — fark
  // 1'di (ölçüldü, git stash ile doğrulandı). DÜZELTME SONRASI fark 2 —
  // startRound()'un YENİ çağrısının GERÇEKTEN, HER "Sonraki"de tetiklendiğinin
  // doğrudan kanıtı (sadece ">0" değil, TAM sayı).
  assert.equal(delta, 2, `KABUL KRİTERİ 2 — 'Sonraki' ile yeni soru başlayınca stopAudio() TAM 2 KEZ artmalıydı (startRound()'un yeni çağrısı + chain-builder'ın kendi çağrısı) — önce=${countAfterAnswer}, sonra=${countAfterNext}, fark=${delta}`);

  await page.close();
});

test("G306 REGRESYON KORUMASI — tek-kaynaklı ve three-way modlarda round geçişi konsol hatasız, stopAudioCallCount HER geçişte artıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");

  for (const modeId of ["boost-mu-cut-mu", "kompresor"]) {
    await enterMode(page, modeId);
    await dismissHeadphoneSheetIfShown(page);
    await page.locator("#startBtn").click();
    await page.waitForTimeout(400);
    await dismissHeadphoneSheetIfShown(page);
    await dismissSpotlightIfShown(page);

    const before = await page.evaluate(() => window.__aeaStopAudioCallCount());
    await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
    await page.waitForTimeout(300);
    const nextBtn = page.locator("#nextBtn");
    if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.__aeaStopAudioCallCount());
    assert.ok(after > before, `[${modeId}] round geçişinde stopAudio() ARTMALIYDI (önce=${before}, sonra=${after})`);

    await page.locator("#backBtn").click();
    await page.waitForTimeout(200);
    const exitConfirm = page.locator("#exitConfirmLeave");
    if (await exitConfirm.isVisible().catch(() => false)) { await exitConfirm.click(); await page.waitForTimeout(200); }
  }
  assert.deepEqual(errors, [], `konsol hatası: ${errors.join(" | ")}`);

  await page.close();
});

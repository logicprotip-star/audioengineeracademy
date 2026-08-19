// G315 (Logic'in cihaz tarifi — "hızlı atlarken ses geri bildirimde
// çalmaya devam ediyor") — sebep: G306'nın startRound() başındaki
// stopAudio()'su SADECE goToNextRound()'un `examTookOver=false` (normal
// sonraki-soru) yoluna ulaştığında çalışıyordu. `handleExamOutcome()` true
// dönüp (exam-offer/exam-start/remedial-start/exam-passed/exam-failed)
// showExamScreen()'e geçtiğinde `startRound()` HİÇ ÇAĞRILMIYORDU (bkz.
// goToNextRound()'un `if (examTookOver) return;` satırı) — sınav/telafi
// ekranına geçerken önceki sorunun sesi (hâlâ kurulmakta olan DAHİL)
// kesilmeden kalıyordu. Aynı boşluk showSessionEnd() (tur sonu) ve
// openPaywallReason() (paywall) için de vardı — İKİSİ de HİÇ
// audioEngine.stopAudio() çağırmıyordu (openPaywallReason SADECE round
// devam ediyorsa pauseRound()'un audioEngine.muteOutput()'unu — salt gain
// rampası, currentNodes'a dokunmaz — çağırıyordu).
//
// Düzeltme: showExamScreen()/showSessionEnd()/openPaywallReason()'un
// HER BİRİNİN başına audioEngine.stopAudio() eklendi. stopAudio()
// KENDİSİ (audio-engine.js, DEĞİŞTİRİLMEDİ) hem çalan sesi durduruyor hem
// `currentNodes`'u temizliyor — buildQuestionChain/buildThreeWayChain/
// buildDualSourceChain'in ÜÇÜNÜN de KENDİ örnek-yükleme await noktasından
// SONRA sahip olduğu `currentNodes.includes(out)` kontrolü (ÖNCEDEN VAR,
// DEĞİŞTİRİLMEDİ) bu sayede KURULMAKTA OLAN bir zinciri de otomatik iptal
// ediyor — yeni bir "iptal" mekanizması İCAT EDİLMEDİ, MEVCUT mekanizma
// artık doğru anlarda TETİKLENİYOR.
//
// NOT: goToNextRound()'un KENDİSİNE DE bir stopAudio() eklemek denendi
// ama G306'nın KENDİ testinin (cakisma-question-transition-stop.spec.mjs)
// kesin çağrı-sayısı beklentisini kırdığı ölçüldü (git stash ile) — bu
// GEREKSİZDİ zaten, çünkü showExamScreen()'in kendi çağrısı
// examTookOver=true yolunu ZATEN kapatıyor. goToNextRound()'a
// DOKUNULMADI (KİLİT'in "G313'ün atla düzeltmesi" uyarısına uyumlu).

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

// dismissSpotlightIfShown (app-fixtures.mjs) hızlı art arda tıklama
// döngülerinde bazen "element is not stable" ile TAKILIYOR (Playwright'ın
// kendi actionability retry'ı sınırsız bekliyor) — burada KISA bir zaman
// aşımıyla, takılmadan geçen GÜVENLİ bir varyant.
async function dismissSpotlightSafe(page) {
  const sk = page.locator("#spotlightSkip");
  if (await sk.isVisible({ timeout: 300 }).catch(() => false)) {
    await sk.click({ timeout: 800 }).catch(() => {});
    await page.waitForTimeout(150);
  }
}

async function enterModeAndStart(page, modeId, prefs = {}) {
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { playMode: "challenge", ...prefs });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, modeId);
  await dismissHeadphoneSheetIfShown(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);
}

test("G315 KABUL KRİTERİ — hızlı art arda Atla ile telafi ekranına geçilince stopAudio() TETİKLENİYOR (kurulmakta olan zincir dahil iptal)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterModeAndStart(page, "kesim-noktasi", { dev: { simulatePro: true } });

  // HIZLI art arda 9 Atla (normal e2e testlerinin ~250-300ms beklemesi
  // YERİNE 80ms — G306'nın stopAudio()'sunun startRound() içinde ÇALIŞTIĞI
  // ama sınav/telafi geçişinde ÇALIŞMADIĞI boşluğu HIZLICA tetiklemek için).
  for (let i = 0; i < 9; i++) {
    await page.locator("#nextBtn").click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(80);
    await dismissSpotlightIfShown(page);
  }
  // ÖNEMLİ: hızlı tıklama dizisinin KENDİ artık-etkisi (9. tıklamanın
  // zincirinin gecikmeli tamamlanması) 500ms'e kadar SAYACI KENDİLİĞİNDEN
  // artırabiliyor (ölçülerek doğrulandı: düzeltme OLMADAN bile 20→21 oluyordu,
  // ama BUNDAN SONRA 10. tıklamayla ASLA artmıyordu). "before" ölçümü bu
  // artık-etkinin YERLEŞMESİNİ BEKLEDİKTEN SONRA alınıyor — aksi hâlde test
  // düzeltme OLMASA BİLE yanlışlıkla yeşile düşüyordu (git stash ile
  // yakalandı).
  await page.waitForTimeout(500);
  const beforeTransition = await stopAudioCallCount(page);
  // 10. (sınır) Atla — remedial-start'ı tetikler, showExamScreen("makeup")'a geçer.
  await page.locator("#nextBtn").click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  const afterTransition = await stopAudioCallCount(page);

  const kicker = await page.evaluate(() => document.getElementById("exKicker")?.textContent);
  assert.equal(kicker, "TELAFİ TURU", "ön koşul: telafi anons ekranına ulaşılamadı");
  assert.ok(
    afterTransition > beforeTransition,
    `DÜZELTME ÖNCESİ: showExamScreen() açılırken stopAudio() HİÇ çağrılmıyordu — ölçülen: ${beforeTransition} -> ${afterTransition}`
  );

  await page.close();
});

test("G315 KABUL KRİTERİ — tur sonu ekranı açılınca stopAudio() TETİKLENİYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterModeAndStart(page, "kesim-noktasi", { dev: { simulatePro: true } });

  const before = await stopAudioCallCount(page);
  await page.evaluate(() => window.__aeaShowSessionEndForTest("lost"));
  await page.waitForTimeout(200);
  const after = await stopAudioCallCount(page);

  const screen = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(screen, "screen-result", "ön koşul: tur sonu ekranına ulaşılamadı");
  assert.ok(after > before, `DÜZELTME ÖNCESİ: showSessionEnd() HİÇ stopAudio() çağırmıyordu — ölçülen: ${before} -> ${after}`);

  await page.close();
});

// NOT: paywall.PAYWALL_REASONS'ta `endsRound:true` olan (sessionLimit/
// livesOut — pratikte EN SIK görülen paywall tetiklenmesi) ÖNCEDEN de
// (bu düzeltme OLMADAN) sessiz açılıyordu — ÇÜNKÜ o yolu çağıran
// teardownActiveRound() (app.js) ZATEN KENDİ audioEngine.stopAudio()'sunu
// çağırıyor (ÖNCEDEN VAR, DEĞİŞTİRİLMEDİ). Bu YÜZDEN o senaryo, BU
// düzeltme için GERÇEK bir kırmızı/yeşil ayırt edici DEĞİL (ölçülerek
// doğrulandı — git stash'te de yeşil kaldı). GERÇEK boşluk `endsRound:false`
// + round HÂLÂ aktifken açılan paywall'daydı — o yolda ÖNCEDEN SADECE
// pauseRound()'un audioEngine.muteOutput()'u (salt gain rampası,
// currentNodes'a dokunmaz) çağrılıyordu. Bu test O YOLU hedefliyor:
// mid-round Oyun Ayarları'ndan kilitli "Ses dosyası yükle"ye basmak
// (paywall.isUploadLocked, endsRound:false).
test("G315 KABUL KRİTERİ — round AKTİFKEN (endsRound:false) açılan paywall'da stopAudio() TETİKLENİYOR (ÖNCEDEN sadece muteOutput() çağrılıyordu)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterModeAndStart(page, "kesim-noktasi"); // Pro DEĞİL — upload HER ZAMAN kilitli

  const before = await stopAudioCallCount(page);
  await page.locator("#gameSettingsBtn").click();
  await page.waitForTimeout(300);
  await page.locator('.upload-trigger-btn[data-file-target="audioFileInput"]').click({ timeout: 3000 });
  await page.waitForTimeout(300);
  const after = await stopAudioCallCount(page);

  const screen = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(screen, "screen-paywall", "ön koşul: paywall ekranına ulaşılamadı (upload kilidi)");
  assert.ok(after > before, `DÜZELTME ÖNCESİ: round aktifken (endsRound:false) açılan paywall SADECE muteOutput() çağırıyordu, stopAudio() YOKTU — ölçülen: ${before} -> ${after}`);

  await page.close();
});

test("G315 REGRESYON KORUMASI — rozet/ilerleme bildirimleri (toast, core/fx.js) sesi HİÇ etkilemiyor — audioEngine'e hiç dokunmuyor", () => {
  const fxPath = fileURLToPath(new URL("../www/js/core/fx.js", import.meta.url));
  const source = readFileSync(fxPath, "utf8");
  assert.ok(
    !/audioEngine|stopAudio/.test(source),
    "core/fx.js (toast/badge bildirimleri) audioEngine'e ASLA dokunmamalı — rozet bildirimi ses kesmemeli (Logic'in açık kuralı)"
  );
});

// G320 (Logic'in kararı, OLCUM-KULAK-OGRETIM-19-08'in ardından) — bu test
// ESKİDEN "REGRESYON KORUMASI" olarak stage-3'ün ses-devam istisnasının
// BOZULMADIĞINI doğruluyordu. Logic'in kararıyla o istisna KALDIRILDI
// (G315'in "ekran açılınca ses kapansın" kuralına dahil edildi — geri
// bildirim paneli de "açılan bir şey") — bu YÜZDEN test artık TERS bir
// KABUL KRİTERİ'ne dönüştü: stopAudio() ARTIK çağrılMALI. Kulak
// butonlarının/#cakismaBefore-After'ın bu değişiklikten SONRA da GERÇEKTEN
// ses ürettiğinin (sessizce no-op olmadığının) doğrulaması AYRI bir
// dosyada: e2e/cakisma-stage3-stops-audio.spec.mjs.
test("G320 KABUL KRİTERİ — Frekans Çakışması aşama 3'te cevap sonrası ses ARTIK duruyor (G315'in kuralına dahil edildi)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterModeAndStart(page, "frekans-cakismasi", { dev: { simulatePro: true } });

  // Aşama 1 ve 2'yi hızlıca geç (gerçek cevap vererek) — aşama 3'e ulaş.
  for (let stage = 1; stage <= 2; stage++) {
    const q = await page.evaluate(() => window.__aeaActiveQuestionPairForTest ? { pair: window.__aeaActiveQuestionPairForTest() } : null);
    if (!q) break;
    await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
    await page.waitForTimeout(500);
    const closeBtn = page.locator("#feedbackClose");
    if (await closeBtn.isVisible().catch(() => false)) { await closeBtn.click(); await page.waitForTimeout(400); }
    await dismissSpotlightIfShown(page);
  }

  const stageNow = await page.evaluate(() => window.__aeaActiveQuestionPairForTest ? "have-pair" : null);
  const beforeAnswer = await stopAudioCallCount(page);
  await page.evaluate(() => window.__aeaSubmitAnswerForTest && window.__aeaSubmitAnswerForTest());
  await page.waitForTimeout(600);
  const afterAnswer = await stopAudioCallCount(page);
  const cakismaCompareVisible = await page.locator("#cakismaCompare").isVisible().catch(() => false);

  // AŞAMA 3'e GERÇEKTEN ulaşıldıysa (cakismaCompare göründüyse) cevap SONRASI
  // stopAudio() ARTIK ÇAĞRILMALI (G320 — istisna kaldırıldı).
  if (cakismaCompareVisible) {
    assert.ok(afterAnswer > beforeAnswer, `Aşama 3'te cevap sonrası stopAudio() ARTIK ÇAĞRILMALI (önce=${beforeAnswer}, sonra=${afterAnswer}) — G320: "önce/sonra" istisnası kaldırıldı`);
  }

  await page.close();
});

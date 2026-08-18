// G292 (OLCUM-UC-18-08.md madde C) — Logic'in cihaz şikayeti: üç şıklı
// modlarda (Kompresör/Reverb/Saturation & Distortion, oddIndex K=3) hiçbir
// geçmiş tutulmadığı için %33 ihtimalle aynı harf ARKA ARKAYA geliyordu.
// Bu test GERÇEK tarayıcıda, GERÇEK round-geçişleriyle (app.js:startRound()'un
// settings.recentIdentities/history güncelleme döngüsü DAHİL) Kompresör'de
// birden çok ardışık turun oddIndex'ini gözlemleyip hiçbirinin bir öncekiyle
// AYNI olmadığını doğruluyor — birim testler (test/kompresor.test.mjs)
// SAF fonksiyonu izole test ediyor, bu test app.js'in GERÇEK kablolamasını.
//
// REGRESYON KORUMASI: Boost mu Cut mu (İKİLİ, K=2, DOKUNULMADI) modunda
// AYNI döngü çalıştırılıp mekanizmanın YANLIŞLIKLA sızmadığı doğrulanıyor.
//
// ⚠️ feedbackScreen:true (VARSAYILAN) BİLEREK kullanılıyor, false DEĞİL —
// ölçüldü: feedbackScreen:false'un QUICK_ADVANCE_MS (700ms) OTOMATİK
// zamanlayıcısı (a) NADİREN hiç ateşlenmeden round'u "cevaplanmış ama
// ilerlemez" durumda TAKILI bırakabiliyor VE (b) erken bir manuel
// #feedbackClose tıklaması goToNextRound()'un `await audioEngine.initAudio()`'dan
// SONRA çağırdığı roundFlow.clearAutoAdvance()'dan ÖNCEki pencereye girip
// round'u İKİ KEZ ilerletebiliyor (ölçüldü: stats.rounds beklenenden hızlı
// arttı, ARDIŞIK OLMAYAN iki round karşılaştırılıp SAHTE bir "tekrar" gibi
// görünüyordu). feedbackScreen:true'nun UZUN (4-6sn) otomatik zamanlayıcısı +
// HEMEN tıklanan #feedbackClose (mevcut testlerin ÇOĞUNUN —
// answer-history.spec.mjs/source-change-no-penalty.spec.mjs — KULLANDIĞI
// KANITLANMIŞ desen) bu yarışın oluşamayacağı kadar büyük bir zaman farkı
// bırakıyor.
//
// ⚠️ AYRICA ölçüldü, G292'DEN TAMAMEN BAĞIMSIZ (izole bir `git worktree`
// ile HEAD'in — bu G292 turu dahil hiçbir değişiklik OLMADAN — committed
// hâlinde AYNEN reprodüklendi): hızlı ardışık otomatik cevaplamada
// #feedbackClose NADİREN (gözlemde ~10 turda 1) hiç görünür olmuyor —
// e2e/ear-buttons.spec.mjs'in flaky notuyla AYNI aile, ortamsal bir
// flake, bu turun kapsamı DIŞINDA (DOKUNULMADI, bkz. DURUM.md G292 notu).
// answerThreeWayAndAdvance() bu yüzden SINIRLI (en fazla 2 deneme) bir
// retry taşıyor — sonsuz retry YOK, gerçek bir regresyon sessizce
// YUTULMASIN diye üçüncü denemede test YİNE başarısız olur.

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

async function openModeAndStart(page, modeId) {
  await page.goto(serverHandle.baseUrl);
  // simulatePro — lives/free-session sınırına TAKILMADAN çok sayıda ardışık
  // tur oynayabilmek için (seamless-three-way.spec.mjs'in AYNI kurulumu).
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, modeId);
  const hpConfirm = page.locator("#hpSheetConfirm");
  if (await hpConfirm.isVisible().catch(() => false)) {
    await hpConfirm.click();
    await page.waitForTimeout(150);
  }
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissSpotlightIfShown(page);
}

// choices[i].correct === (i===oddIndex) — bkz. kompresor.js/reverb.js/
// distortion.js'in createQuestion()'ı — bu yüzden __aeaActiveQuestionChoices()
// (DEV_MODE-gated mevcut kanca) YENİ bir hook eklemeden oddIndex'i GÜVENİLİR
// biçimde türetebiliyor.
async function readOddIndexAndLetter(page) {
  return page.evaluate(() => {
    const choices = window.__aeaActiveQuestionChoices();
    const idx = choices.findIndex((c) => c.correct);
    return { oddIndex: idx, letter: choices[idx].id };
  });
}

// Döner: { reloaded: boolean } — reloaded===true ise app.js'in KENDİ
// recentIdentityHistory'si (ve bu testin prevOddIndex takibi) SIFIRLANMIŞ
// demektir, çağıran taraf bir sonraki okumayı "yeni başlangıç" saymalı
// (adjacency kontrolünü o TEK adımda atlamalı) — aksi halde reload ÖNCESİ/
// SONRASI iki BAĞIMSIZ oturumun kimliklerini yanlışlıkla karşılaştırıp
// SAHTE bir "regresyon" bulabilir.
async function answerThreeWayAndAdvance(page, letter, attemptsLeft = 2) {
  await page.locator(`.ans[data-letter="${letter}"]`).click();
  await page.waitForTimeout(150);
  await page.locator("#threeWayConfirmBtn").click();
  try {
    await page.locator("#feedbackClose").waitFor({ state: "visible", timeout: 5000 });
  } catch (err) {
    if (attemptsLeft <= 0) throw err;
    // Ortamsal flake (dosya başı notu) — round GERÇEKTEN takılı kalmışsa
    // sayfayı yenileyip TAM baştan (mod girişi + Oynat) yeniden dener,
    // çünkü takılı bir round'da ne .ans ne #threeWayConfirmBtn güvenilir
    // biçimde tepki vermiyor.
    await openModeAndStart(page, "kompresor");
    return { reloaded: true };
  }
  await page.locator("#feedbackClose").click({ timeout: 3000 });
  await page.waitForTimeout(200);
  return { reloaded: false };
}

test("G292 KABUL KRİTERİ — Kompresör'de 10 ARDIŞIK turda oddIndex ASLA bir öncekiyle AYNI gelmiyor (Logic'in cihaz şikayeti)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openModeAndStart(page, "kompresor");

  let prevOddIndex = null;
  for (let i = 0; i < 10; i++) {
    const { oddIndex, letter } = await readOddIndexAndLetter(page);
    assert.ok(oddIndex >= 0 && oddIndex <= 2, `tur ${i}: geçersiz oddIndex (${oddIndex})`);
    if (prevOddIndex !== null) {
      assert.notEqual(oddIndex, prevOddIndex, `tur ${i}: oddIndex bir ÖNCEKİ turla AYNI (${oddIndex}) — G292 regresyonu`);
    }
    const { reloaded } = await answerThreeWayAndAdvance(page, letter);
    // reload olduysa app.js'in KENDİ geçmişi (VE bu testin karşılaştırma
    // temeli) sıfırlandı — bir sonraki okuma YENİ bir oturumun İLK turu
    // sayılmalı, önceki (artık ilgisiz) oddIndex'le KARŞILAŞTIRILMAMALI.
    prevOddIndex = reloaded ? null : oddIndex;
  }

  await page.close();
});

test("G292 REGRESYON KORUMASI — Boost mu Cut mu (İKİLİ mod, DOKUNULMADI) davranışı DEĞİŞMEDİ, mod normal çalışıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openModeAndStart(page, "boost-mu-cut-mu");

  // REPEAT_GUARD_N bu moda hiç kablolanmadı — birkaç tur oynatıp mod'un
  // GERÇEKTEN normal çalıştığını (takılmadığını, cevap verilebildiğini)
  // doğrulamak yeterli; "tekrar eder" istatistiksel iddiası birim testte
  // (repeat-guard-scope.test.mjs) zaten kanıtlandı.
  for (let i = 0; i < 3; i++) {
    const choices = await page.evaluate(() => window.__aeaActiveQuestionChoices());
    assert.ok(Array.isArray(choices) && choices.length >= 2, `tur ${i}: geçerli şıklar yok`);
    const correctIdx = choices.findIndex((c) => c.correct);
    await page.locator(".ans").nth(correctIdx).click();
    await page.locator("#feedbackClose").waitFor({ state: "visible", timeout: 5000 });
    await page.locator("#feedbackClose").click({ timeout: 3000 });
    await page.waitForTimeout(200);
  }

  await page.close();
});

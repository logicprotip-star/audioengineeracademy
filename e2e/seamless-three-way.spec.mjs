// G267 — Motor 2'nin Kompresör/Distortion modları ESKİDEN A/B/C geçişinde
// (kart tıklaması, otomatik döngü, kartın KENDİ play/pause butonu) audio-engine.js:
// buildQuestionChain()'i BAŞTAN çağırıyordu — stopAudio() + yeni source + yeni
// filtre, ses her geçişte pozisyon 0'dan başlıyordu (kullanıcı kendi dosyasını
// yüklediğinde baştaki sessizlik her geçişte tekrar çalınıyordu). Düzeltme:
// audio-engine.js:buildThreeWayChain/setThreeWayActive/muteThreeWayPreview —
// TEK source, ÜÇ paralel yol, HEPSİ HER ZAMAN bağlı, geçişte SADECE gain
// crossfade. Kaynak ASLA disconnect/reconnect edilmiyor.
//
// Doğrulama sinyali: audioEngine.stopAudioCallCount (window.__aeaStopAudioCallCount,
// DEV_MODE-gated, bkz. app.js) — buildQuestionChain/buildDualSourceChain/
// buildThreeWayChain'in ÜÇÜNÜN de başında çağırdığı stopAudio()'nun GLOBAL sayacı.
// setThreeWayActive()/muteThreeWayPreview() bu sayacı HİÇ artırmaz — "zincir
// yeniden mi kuruldu yoksa sadece crossfade mi oldu" sorusuna dışarıdan
// kanıtlanabilir bir cevap.
//
// ⚠️ Reverb KASITLI OLARAK bu testin KAPSAMI DIŞINDA bırakılmadı — tam tersi,
// Reverb'in ESKİ (rebuild) davranışının DEĞİŞMEDİĞİNİ AYRICA kanıtlıyoruz
// (regresyon testi: sayaç Reverb'de YİNE artmalı).

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
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, modeId);
  // kulaklikGerekli:true modlar (Reverb) round başlamadan ÖNCE bir uyarı
  // sheet'i gösterir ("Taktım" ile geçilir) — #startBtn o kapanana kadar
  // GÖRÜNMEZ (öteki modlarda bu sheet hiç açılmadığı için buton zaten
  // görünürse tıklama no-op).
  const hpConfirm = page.locator("#hpSheetConfirm");
  if (await hpConfirm.isVisible().catch(() => false)) {
    await hpConfirm.click();
    await page.waitForTimeout(150);
  }
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissSpotlightIfShown(page);
  // Motor 2 modları round başlar başlamaz OTOMATİK döngüyü (abLoopTimer)
  // ZATEN başlatıyor (startRound()'un isThreeWayModule dalı) — #abToggle'a
  // tek dokunuş bu yüzden bir "geçiş" DEĞİL, "döngüyü durdur" anlamına gelir
  // (click handler: `if (abLoopTimer) { stopAbLoop(); return; }`). Testlerin
  // KENDİ manuel geçiş ölçümü döngü DURDUKTAN SONRA, temiz bir başlangıç
  // durumundan yapılabilsin diye burada BİR KEZ tüketiliyor.
  if (await page.evaluate(() => document.getElementById("abToggle")?.classList.contains("loop"))) {
    await page.locator("#abToggle").click();
    await page.waitForTimeout(150);
  }
}

// assert.ok ile korunuyor — kanca YOKSA (DEV_MODE=false ya da audio-engine.js
// henüz stopAudioCallCount eklenmemiş bir sürüm) sayaçlar `undefined` döner ve
// `assert.equal(after, before)` bunu SESSİZCE (undefined===undefined) YEŞİL
// gösterirdi — bu fonksiyon o SAHTE-YEŞİL riskini HER çağrıda kapatıyor.
async function stopAudioCallCount(page) {
  const n = await page.evaluate(() => window.__aeaStopAudioCallCount && window.__aeaStopAudioCallCount());
  assert.equal(typeof n, "number", "stopAudioCallCount kancası bulunamadı/sayı dönmedi (DEV_MODE=false ya da audio-engine.js:stopAudioCallCount eksik)");
  return n;
}

function abLetter(page) {
  return page.evaluate(() => document.getElementById("abToggle")?.dataset.ab || null);
}

test("G267: Kompresör — #abToggle kısa dokunma A/B/C geçişinde zincir YENİDEN KURULMUYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openModeAndStart(page, "kompresor");

  const before_ = await stopAudioCallCount(page);
  const letterBefore = await abLetter(page);

  await page.locator("#abToggle").click();
  await page.waitForTimeout(200); // CROSSFADE_SEC (50ms) için bolca pay

  const after_ = await stopAudioCallCount(page);
  const letterAfter = await abLetter(page);

  assert.notEqual(letterAfter, letterBefore, "harf İLERLEMEDİ — geçiş hiç olmamış olabilir, test anlamsız");
  assert.equal(after_, before_, "Kompresör'de A/B/C geçişi stopAudio() ÇAĞIRDI — zincir hâlâ baştan kuruluyor (G267 regresyonu)");

  await page.close();
});

test("G267: Saturation & Distortion — #abToggle kısa dokunma A/B/C geçişinde zincir YENİDEN KURULMUYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openModeAndStart(page, "distortion");

  const before_ = await stopAudioCallCount(page);
  const letterBefore = await abLetter(page);

  await page.locator("#abToggle").click();
  await page.waitForTimeout(200);

  const after_ = await stopAudioCallCount(page);
  const letterAfter = await abLetter(page);

  assert.notEqual(letterAfter, letterBefore, "harf İLERLEMEDİ — geçiş hiç olmamış olabilir, test anlamsız");
  assert.equal(after_, before_, "Distortion'da A/B/C geçişi stopAudio() ÇAĞIRDI — zincir hâlâ baştan kuruluyor (G267 regresyonu)");

  await page.close();
});

test("G267: Reverb — ESKİ davranış DEĞİŞMEDİ, A/B/C geçişi HÂLÂ zinciri yeniden kuruyor (kasıtlı, kuyruk davranışı korunuyor)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openModeAndStart(page, "reverb");

  const before_ = await stopAudioCallCount(page);
  const letterBefore = await abLetter(page);

  await page.locator("#abToggle").click();
  await page.waitForTimeout(200);

  const after_ = await stopAudioCallCount(page);
  const letterAfter = await abLetter(page);

  assert.notEqual(letterAfter, letterBefore, "harf İLERLEMEDİ — geçiş hiç olmamış olabilir, test anlamsız");
  assert.equal(after_, before_ + 1, "Reverb'in kasıtlı korunan rebuild davranışı DEĞİŞMİŞ — kuyruk artık baştan başlamıyor olabilir (ürün kararına aykırı)");

  await page.close();
});

test("G267: Kompresör — otomatik döngü (abLoopTimer) A/B/C arasında zincir YENİDEN KURMADAN geçiyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openModeAndStart(page, "kompresor");

  const before_ = await stopAudioCallCount(page);
  const letterBefore = await abLetter(page);

  // Uzun-basma eşiği (520ms) — ab-loop-teardown.spec.mjs'in AYNI dispatchEvent
  // deseni (gerçek bir dokunuşun pointerdown'ı, pointerup BİLEREK gönderilmiyor —
  // döngü test bitene kadar sürsün, sayfa kapanınca zaten temizlenir).
  await page.locator("#abToggle").dispatchEvent("pointerdown");
  // 520ms eşik + en az bir 2000ms döngü tetiklemesi için bolca pay.
  await page.waitForTimeout(2600);

  const after_ = await stopAudioCallCount(page);
  const letterAfter = await abLetter(page);

  assert.notEqual(letterAfter, letterBefore, "döngü hiç harf DEĞİŞTİRMEDİ — abLoopTimer tetiklenmemiş olabilir, test anlamsız");
  assert.equal(after_, before_, "Kompresör'de otomatik döngü stopAudio() ÇAĞIRDI — zincir hâlâ baştan kuruluyor (G267 regresyonu, manuel geçişten FARKLI davranıyor)");

  await page.close();
});

test("G267: Kompresör — kartın KENDİ play/pause butonu (playThreeWaySpecific) zincir YENİDEN KURMADAN çalışıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openModeAndStart(page, "kompresor");

  const before_ = await stopAudioCallCount(page);
  const letterBefore = await abLetter(page);

  // B harfinin KENDİ play butonuna bas (letterBefore muhtemelen "A") — switch.
  await page.locator('.ans-m2-play[data-letter="B"]').click();
  await page.waitForTimeout(200);
  const afterSwitch = await stopAudioCallCount(page);
  const letterAfterSwitch = await abLetter(page);
  assert.notEqual(letterAfterSwitch, letterBefore, "kart butonu harfi DEĞİŞTİRMEDİ — test anlamsız");
  assert.equal(afterSwitch, before_, "kart butonuyla geçiş stopAudio() ÇAĞIRDI — zincir hâlâ baştan kuruluyor");

  // AYNI (B) butona TEKRAR bas — bu sefer duraklatma (pause).
  await page.locator('.ans-m2-play[data-letter="B"]').click();
  await page.waitForTimeout(200);
  const afterPause = await stopAudioCallCount(page);
  assert.equal(afterPause, before_, "kart pause'u stopAudio() ÇAĞIRDI — muteThreeWayPreview YERİNE eski pausePreview/rebuild yolu çalışmış olabilir");

  // AYNI butona ÜÇÜNCÜ kez bas — resume (kaldığı yerden devam).
  await page.locator('.ans-m2-play[data-letter="B"]').click();
  await page.waitForTimeout(200);
  const afterResume = await stopAudioCallCount(page);
  assert.equal(afterResume, before_, "kart resume'u stopAudio() ÇAĞIRDI — zincir hâlâ baştan kuruluyor");

  await page.close();
});

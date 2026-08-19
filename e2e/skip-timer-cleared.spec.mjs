// G328 (OLCUM-ATLA-SES-3-19-08 — kanıtlandı) — goToNextRoundInner()
// (app.js, "Atla"nın işlediği TEK ortak fonksiyon, 12 modun HEPSİNİN
// geçtiği yol) `roundFlow.clearTimer()`'ı HİÇ çağırmıyordu. Parkuru
// telafi/sınav anonsuna TAŞIYAN etkileşimde (`examTookOver=true`)
// `startRound()` (normalde `armTimerInterval()` İÇİNDEN eski süre
// sayacını temizlerdi) ÇAĞRILMADAN erken dönülüyordu — o anda aktif
// sorunun 100ms'lik `setInterval` süre sayacı anons ekranı AÇIKKEN de
// arka planda çalışmaya devam ediyordu. Süresi dolunca `onTimeUp()` →
// `scheduleNext()` → `onAdvance()` → `startRound()` zincirini G325'in
// `goToNextRound()` kilidinin TAMAMEN DIŞINDAN (`onAdvance`
// `goToNextRound()`'u hiç ÇAĞIRMIYOR, `startRound()`'u DOĞRUDAN
// çağırıyor) tetikleyip YENİ bir ses zinciri kuruyordu.
//
// KABUL KRİTERİ: 1/2/4/6 atlama senaryolarının HİÇBİRİNDE anons/telafi
// ekranında ses OLMAMALI — Logic'in cihaz gözlemiyle (3 güvenli/4 kırık)
// OLCUM-ATLA-SES-3-19-08'in Playwright ölçümü (1 atlamada bile kırık)
// ÇELİŞİYORDU, bu yüzden İKİSİ de test edildi. Sebep merkezi
// (goToNextRoundInner, 12 modun ORTAK yolu) olduğu için EN AZ 3 FARKLI
// modda doğrulanıyor: frekans-bulma (1/2/6 atlama), db-seviyesi (4
// atlama), frekans-cakismasi (10x TÜM atlama, Logic'in KENDİ
// doğruladığı modlardan biri).
//
// ⚠️ AYRI, İLGİSİZ bir bulgu (bu turun KAPSAMI DIŞINDA, DOKUNULMADI):
// kesim-noktasi/q-genisligi'nde anons ekranına geçişten SONRA bazen
// ~2sn'den UZUN süren, YÜKSEK RMS'li bir ses gözlemlendi — git stash
// ile DOĞRULANDI: bu G328'İN fix'inden BAĞIMSIZ, PRE-EXISTING bir
// durum (fix ÖNCESİNDE de AYNI ŞEKİLDE gözlemlendi) — G328'in kendi
// mekanizmasıyla (unutulmuş `setInterval`, 13-15sn gecikmeli) AYNI
// DEĞİL (bu, ekrana geçişten HEMEN SONRA başlıyor, gecikmeli değil).
// Kök sebebi bu turun ölçüm KAPSAMINDA DEĞİL — AYRI bir ölçüm turu
// gerektiriyor, DURUM.md'ye BEKLEYEN KARAR/bulgu olarak kaydedildi.
// Bu YÜZDEN KABUL KRİTERİ testleri o İKİ mod YERİNE frekans-bulma/
// db-seviyesi/frekans-cakismasi kullanıyor — G328'in KENDİ mekanizması
// (gecikmeli, 13-15sn) bu 3 modda TEMİZ ve TUTARLI şekilde
// doğrulanabiliyor.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";

let serverHandle, browser;

const TAP_SCRIPT = `
window.__testAnalyser = null;
const origCreateAnalyser = AudioContext.prototype.createAnalyser;
AudioContext.prototype.createAnalyser = function (...a) {
  const node = origCreateAnalyser.apply(this, a);
  window.__testAnalyser = node;
  return node;
};
`;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

function rms(page) {
  return page.evaluate(() => {
    const a = window.__testAnalyser;
    if (!a) return null;
    const buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  });
}

async function enterModeMixed(page, modeId) {
  await page.addInitScript(TAP_SCRIPT);
  await page.goto(serverHandle.baseUrl);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("eqEarTrainerProXDev", JSON.stringify({ simulatePro: true }));
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.locator(`.mode-card[data-mode-id="${modeId}"]`).first().click();
  await page.waitForTimeout(400);
  const spotlightSkip = page.locator("#spotlightSkip");
  if (await spotlightSkip.isVisible().catch(() => false)) await spotlightSkip.click();
  await page.waitForTimeout(200);
  const hpConfirm = page.locator("#hpSheetConfirm");
  if (await hpConfirm.isVisible().catch(() => false)) { await hpConfirm.click(); await page.waitForTimeout(150); }
  // "Karıştır" — gerçek örnek dosyalar (asenkron decode) da devreye girsin,
  // sadece senkron pink noise DEĞİL (OLCUM-ATLA-SES-3-19-08'in bug'ı
  // REPRODUCE ettiği AYNI koşul).
  const mixToggle = page.locator("#mixToggle");
  if (await mixToggle.isVisible().catch(() => false)) await mixToggle.click();
  await page.waitForTimeout(100);
  await page.locator("#startBtn").click({ timeout: 5000 });
  await page.waitForTimeout(400);
  if (await spotlightSkip.isVisible().catch(() => false)) await spotlightSkip.click();
  if (await hpConfirm.isVisible().catch(() => false)) { await hpConfirm.click(); await page.waitForTimeout(150); }
  await page.waitForTimeout(200);
}

async function answerWrong(page) {
  const choices = await page.evaluate(() => window.__aeaActiveQuestionChoices ? window.__aeaActiveQuestionChoices() : null);
  const idx = Array.isArray(choices) ? choices.findIndex((c) => c && !c.correct) : -1;
  await page.locator(".ans").nth(idx >= 0 ? idx : 0).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(500);
  const closeVisible = await page.evaluate(() => !!document.getElementById("feedbackClose") && document.getElementById("feedbackClose").offsetParent !== null);
  if (closeVisible) {
    await page.evaluate(() => document.getElementById("feedbackClose").click());
    await page.waitForTimeout(200);
  }
}

async function assertSilentOnExamScreen(page, label) {
  const screenId = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(screenId, "screen-exam", `[${label}] ön koşul: telafi/sınav anons ekranına ulaşılamadı — ölçülen: ${screenId}`);

  // İLK ~2sn ATLANIYOR — transitioning cevabın KENDİ "yanlış" SFX'i
  // (sfxBuzz, DOĞAL bir ses efekti, currentNodes/stopAudio()'nun
  // yönettiği per-round zincirin DIŞINDA, KASITLI olarak kesilmiyor —
  // OLCUM-ATLA-SES-3-19-08'in bug'ıyla İLGİSİZ) ekrana geçişten HEMEN
  // SONRA ~0.5-1sn doğal olarak sönümlenirken YANLIŞLIKLA "sızıntı"
  // sanılmasın diye — ölçüldü (ince taneli RMS izi: 850-1400ms arası
  // düzgün, tek seferlik exponansiyel sönüm, İKİNCİ bir yeni zincir
  // İŞARETİ YOK). Asıl bug (G328 ÖNCESİ) ~13.7-15.1sn'de BAŞLIYORDU —
  // 2-18sn penceresi bunu GENİŞ payla kapsıyor.
  await page.waitForTimeout(2000);

  let maxRms = 0;
  let firstAudibleAt = -1;
  for (let i = 0; i < 160; i++) {
    const v = await rms(page);
    if (v !== null) {
      maxRms = Math.max(maxRms, v);
      if (v > 0.01 && firstAudibleAt === -1) firstAudibleAt = 2000 + i * 100;
    }
    await page.waitForTimeout(100);
  }
  assert.ok(
    maxRms < 0.01,
    `[${label}] anons ekranında (2-18sn penceresinde) SESSİZ kalmalı — ölçülen max RMS: ${maxRms.toFixed(5)}${firstAudibleAt >= 0 ? `, ilk duyulabilir an: ${firstAudibleAt}ms` : ""}`
  );
}

async function runMixedScenario(modeId, skipCount, label) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterModeMixed(page, modeId);
  for (let i = 0; i < skipCount; i++) {
    await page.locator("#nextBtn").click();
    await page.waitForTimeout(300);
  }
  for (let i = 0; i < 10 - skipCount; i++) {
    await answerWrong(page);
  }
  await assertSilentOnExamScreen(page, label);
  await page.close();
}

test("G328 KABUL KRİTERİ — frekans-bulma: 1 atlama (+9 yanlış cevap) sonrası telafi ekranı 2-18sn penceresinde SESSİZ", async () => {
  await runMixedScenario("frekans-bulma", 1, "frekans-bulma/1-atlama");
});

test("G328 KABUL KRİTERİ — frekans-bulma: 6 atlama (+4 yanlış cevap) sonrası telafi ekranı 2-18sn penceresinde SESSİZ", async () => {
  await runMixedScenario("frekans-bulma", 6, "frekans-bulma/6-atlama");
});

test("G328 KABUL KRİTERİ — frekans-bulma: 2 atlama (+8 yanlış cevap) sonrası telafi ekranı 2-18sn penceresinde SESSİZ", async () => {
  await runMixedScenario("frekans-bulma", 2, "frekans-bulma/2-atlama");
});

test("G328 KABUL KRİTERİ — db-seviyesi: 4 atlama (+6 yanlış cevap) sonrası telafi ekranı 2-18sn penceresinde SESSİZ", async () => {
  await runMixedScenario("db-seviyesi", 4, "db-seviyesi/4-atlama");
});

test("G328 KABUL KRİTERİ — frekans-cakismasi (Logic'in KENDİ doğruladığı mod): 10x TÜM atlama sonrası telafi ekranı 2-18sn penceresinde SESSİZ", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterModeMixed(page, "frekans-cakismasi");
  for (let i = 0; i < 10; i++) {
    await page.locator("#nextBtn").click();
    await page.waitForTimeout(300);
  }
  await assertSilentOnExamScreen(page, "frekans-cakismasi/10-atlama");
  await page.close();
});

test("G328 REGRESYON KORUMASI — normal süre dolması (Atla'ya HİÇ basılmadan) DAVRANIŞI DEĞİŞMEDİ: onTimeUp→scheduleNext→onAdvance→startRound zinciri normal çalışıyor, YENİ soru oluşuyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  // G328'in BU testi Pro DEĞİL, ÜCRETSİZ kullanıcı olarak çalışıyor — ölçüldü:
  // `loseLife()` `if (isUserPro()) return;` ile BAŞLIYOR, Pro'da
  // `setFeedback()`'e HİÇ ULAŞMIYOR (onTimeUp()'ın boss-DIŞI dalı SADECE
  // loseLife() üzerinden feedback gösteriyor) — bu G328'İN bir regresyonu
  // DEĞİL, uygulamanın ÖNCEDEN de var olan Pro-kullanıcı davranışı (can
  // sınırı yok, "Can kaybettin" paneli de YOK). AYRICA denendi: "Sabit +
  // pro" kademesini localStorage'a DOĞRUDAN yazmak da İŞE YARAMIYOR —
  // `enforceFreeRestrictions()` (G61/PAYWALL.md, "Sabit zorluk seçimi Pro
  // gerektirir") ÜCRETSİZ kullanıcıda `prefs.difficultyMode`'u açılışta
  // GERİ "auto"ya ZORLUYOR (KASITLI, task DEĞİL bu turun kapsamı) — bu
  // yüzden test Otomatik moddaki DOĞAL kademeyi (yeni kullanıcı → "easy")
  // kabul ediyor, GERÇEK süreyi tahmin ETMEDEN ekrandan okuyor.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.locator('.mode-card[data-mode-id="q-genisligi"]').first().click();
  await page.waitForTimeout(400);
  const spotlightSkip = page.locator("#spotlightSkip");
  if (await spotlightSkip.isVisible().catch(() => false)) await spotlightSkip.click();
  await page.waitForTimeout(200);
  await page.locator("#startBtn").click({ timeout: 5000 });
  await page.waitForTimeout(400);
  if (await spotlightSkip.isVisible().catch(() => false)) await spotlightSkip.click();
  await page.waitForTimeout(200);

  // GERÇEK süreyi ekrandan (#timerText, "14.0s" gibi) oku, tahmin ETME.
  const timerText = await page.evaluate(() => document.getElementById("timerText")?.textContent || "");
  const timeSec = parseFloat(timerText) || 20;
  const choicesBefore = await page.evaluate(() => JSON.stringify(window.__aeaActiveQuestionChoices ? window.__aeaActiveQuestionChoices() : null));

  // Hiçbir şeye BASMADAN süresinin dolmasını bekle — onTimeUp() → (bossTimeout
  // dalında setFeedback, DEĞİLSE loseLife()) → scheduleNext() → onAdvance()
  // → startRound() zinciri NORMAL ÇALIŞMALI (G328 SADECE goToNextRoundInner()'ın
  // KENDİ eksik clearTimer() çağrısını ekledi — bu zincirin KENDİSİNE
  // DOKUNMADI, DOKUNULMAYACAK: "normal süre dolması davranışı").
  await page.waitForTimeout((timeSec + 4) * 1000);

  // İMZA sinyali: mod/Pro/boss durumundan BAĞIMSIZ, GÜVENİLİR bir kanıt —
  // süre dolduktan SONRA YENİ bir soru (FARKLI şıklar/parametreler)
  // OLUŞMUŞ olmalı — zincir TAKILMADI, normal ilerledi.
  const screenId = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(screenId, "screen-game", `süre dolduktan sonra oyun ekranında kalınmalı — ölçülen: ${screenId}`);
  const choicesAfter = await page.evaluate(() => JSON.stringify(window.__aeaActiveQuestionChoices ? window.__aeaActiveQuestionChoices() : null));
  assert.notEqual(choicesAfter, choicesBefore, "süre dolduktan sonra YENİ bir soru oluşmalı (onTimeUp→scheduleNext→onAdvance→startRound zinciri normal çalışmalı, DEĞİŞMEMELİ)");

  await page.close();
});

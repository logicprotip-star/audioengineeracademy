// G317 (Logic'in kararı, OLCUM-XP-SEANS-18-08'in ardından) — Tonal Denge'de
// kısmi doğruya ARTAN XP verilsin AMA "doğru" SAYILMASIN: sınav ilerlemesi/
// zayıf bölge raporu/istatistikler (stats.correct sayacı) ETKİLENMEYECEK,
// combo BOZULACAK (yanlış cevap gibi) — SADECE XP verilecek.
//
// DOKUNULMAYACAK doğrulaması: evaluateAnswer'ın "correct" tanımı (ortalama
// sapma <= tolerans) DEĞİŞMEDİ — bu test BUNU KANITLAMAK için, kısmi-doğru
// bir round'u TAM YANLIŞ bir round'la KARŞILAŞTIRIYOR: stats.correct/wrong/
// combo etkisi BİREBİR AYNI olmalı (ikisi de "yanlış" dalından geçiyor),
// SADECE kazanılan XP farklı (kısmi doğruda >0, tam yanlışta 0).

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

async function enterTonalDengeFirstRound(page) {
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true }, playMode: "challenge" });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "tonal-denge");
  await dismissHeadphoneSheetIfShown(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);
}

async function readBands(page) {
  return page.evaluate(() => window.__aeaActiveQuestionBandsForTest());
}

async function readStats(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("eqEarTrainerProXStats") || "{}"));
}

// N. banda (0-tabanlı index) MÜKEMMEL correction (-bugDb) uygular, KALAN
// bantları BİLEREK dokunulmamış (0) bırakır — averajın da toleransı aşması
// İÇİN en az bir bant KASITLI olarak büyük bir bugDb ile bozuk kalmalı;
// bandsForQuestion'ın ürettiği bugDb'ler ZATEN NEUTRAL_TOLERANCE_DB'nin
// (varsayılan zorlukta ~1.5dB) kat kat üstünde (disturbDb tabanlı) olduğu
// için "dokunmamak" YETERLİ.
// NOT: Playwright'ın locator.fill()'i range input'larda step'e UYMAYAN
// değerleri REDDEDİYOR ("Malformed value") — bugDb rastgele/ondalıklı
// olduğu için -bugDb NEREDEYSE HİÇBİR ZAMAN step (0.5) katı değil. TAM SIFIR
// residual (kesin "doğru") gerektiği için page.evaluate ile DOM value'sunu
// DOĞRUDAN atayıp "input" event'i dispatch ediyoruz — app.js'in KENDİ
// dinleyicisi (tonalDengeCorrections[bandId]=Number(slider.value)) bunu
// GERÇEK bir kullanıcı sürüklemesinden AYIRT ETMİYOR (aynı event, aynı
// handler), SADECE step-doğrulamasını atlıyor.
//
// ÖNEMLİ (ölçülerek bulundu): "yanlış bırakılacak" bantlara SADECE 0
// yazmak GÜVENİLİR DEĞİL — bandsForQuestion() bazı bantlara ZATEN bugDb=0
// üretebiliyor (rastgele), o zaman "dokunulmamış" bant da (residual=0)
// YANLIŞLIKLA doğru sayılıyor. Bunun yerine hedef correction'dan (-bugDb)
// KASITLI, BÜYÜK (8dB) bir SAPMA uygulanıyor — bugDb NE OLURSA OLSUN
// deviation=8 GARANTİ (slider aralığı [-12,12] içinde kalacak yönde).
const WRONG_OFFSET_DB = 8;
async function fillPartialCorrect(page, bands, correctCount) {
  for (let i = 0; i < bands.length; i++) {
    const bandId = bands[i].id;
    const target = -bands[i].bugDb;
    const value = i < correctCount ? target : (target + WRONG_OFFSET_DB <= 12 ? target + WRONG_OFFSET_DB : target - WRONG_OFFSET_DB);
    await page.evaluate(({ bandId, value }) => {
      const slider = document.querySelector(`.tonal-slider[data-band-id="${bandId}"]`);
      slider.value = String(value);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    }, { bandId, value });
    await page.waitForTimeout(30);
  }
}

test("G317 KABUL KRİTERİ — 4 bantta 3'ü doğru: XP alınıyor, 'doğru' SAYILMIYOR (stats.correct artmıyor, stats.wrong artıyor, combo sıfırlanıyor)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterTonalDengeFirstRound(page);

  const bands = await readBands(page);
  assert.equal(bands?.length, 4, `ön koşul: ilk sorunun 4 bantlı olması bekleniyordu, ölçülen: ${bands?.length}`);

  const statsBefore = await readStats(page);
  const correctBefore = statsBefore.correct || 0;
  const wrongBefore = statsBefore.wrong || 0;
  // NOT: XP kazanımı feedback PANEL METNİNDEN doğrulanamaz — setFeedback()
  // (app.js) "(+N XP)" ekini ekrana YAZILMADAN ÖNCE regex ile SİLİYOR
  // (ÖNCEDEN VAR olan davranış, result.correct===true dalında da AYNI —
  // bkz. tonal-denge.js:getFeedbackData'nın G317 notu). Bu YÜZDEN
  // stats.perMode["tonal-denge"].xp (modeState().xp'nin AYNI localStorage
  // yansıması) DOĞRUDAN kontrol ediliyor — GÜVENİLİR, UI metin ayrıştırma
  // KIRILGANLIĞINA bağımlı DEĞİL.
  const xpBefore = statsBefore.perMode?.["tonal-denge"]?.xp || 0;

  await fillPartialCorrect(page, bands, 3); // 3/4 doğru, 1 BİLEREK bozuk
  await page.locator(".tonal-submit").click();
  await page.waitForTimeout(500);

  const statsAfter = await readStats(page);
  const xpAfter = statsAfter.perMode?.["tonal-denge"]?.xp || 0;
  const gained = xpAfter - xpBefore;
  assert.ok(gained > 0, `DÜZELTME ÖNCESİ: 3/4 doğru cevap 0 XP kazandırıyordu — ölçülen kazanç: ${gained} (${xpBefore}→${xpAfter})`);

  assert.equal(statsAfter.correct || 0, correctBefore, "KRİTİK: 3 bant doğru bir cevap stats.correct'i ARTIRMAMALI — 'doğru' SAYILMAMALI");
  assert.equal((statsAfter.wrong || 0), wrongBefore + 1, "3 bant doğru bir cevap HÂLÂ stats.wrong'u artırmalı (yanlış cevap gibi davranmalı)");
  assert.equal(statsAfter.combo, 0, "combo BOZULMALI (yanlış cevap gibi)");

  await page.close();
});

test("G317 REGRESYON KORUMASI — TAM yanlış (0 bant doğru) cevapta XP 0, stats etkisi kısmi-doğruyla BİREBİR AYNI (SADECE XP farklı)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterTonalDengeFirstRound(page);

  const bands = await readBands(page);
  const statsBefore = await readStats(page);
  const xpBefore = statsBefore.perMode?.["tonal-denge"]?.xp || 0;

  await fillPartialCorrect(page, bands, 0); // 0/4 doğru — hepsi BİLEREK bozuk
  await page.locator(".tonal-submit").click();
  await page.waitForTimeout(500);

  const statsAfter = await readStats(page);
  const xpAfter = statsAfter.perMode?.["tonal-denge"]?.xp || 0;
  assert.equal(xpAfter, xpBefore, `0 bant doğru cevap XP KAZANDIRMAMALI — ölçülen: ${xpBefore}→${xpAfter}`);
  assert.equal(statsAfter.correct || 0, statsBefore.correct || 0, "0 bant doğru: stats.correct değişmemeli");
  assert.equal(statsAfter.wrong || 0, (statsBefore.wrong || 0) + 1, "0 bant doğru: stats.wrong artmalı");
  assert.equal(statsAfter.combo, 0, "0 bant doğru: combo sıfırlanmalı");

  await page.close();
});

test("G317 REGRESYON KORUMASI — TAM doğru (4/4 bant) davranışı DEĞİŞMEDİ: 'doğru' SAYILIYOR, stats.correct artıyor, proximityBoost hâlâ uygulanıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterTonalDengeFirstRound(page);

  const bands = await readBands(page);
  const statsBefore = await readStats(page);

  await fillPartialCorrect(page, bands, 4); // 4/4 — TAM doğru
  await page.locator(".tonal-submit").click();
  await page.waitForTimeout(500);

  const title = await page.evaluate(() => document.getElementById("fbTitle")?.textContent || "");
  assert.equal(title, "Nötüre yakın!", `4/4 doğru cevapta ESKİ "Nötüre yakın!" başlığı DEĞİŞMEMELİ — alınan: "${title}"`);

  const statsAfter = await readStats(page);
  assert.equal(statsAfter.correct || 0, (statsBefore.correct || 0) + 1, "4/4 doğru: stats.correct ARTMALI (ESKİ davranış)");
  assert.equal(statsAfter.combo, 1, "4/4 doğru: combo ARTMALI (ESKİ davranış)");

  await page.close();
});

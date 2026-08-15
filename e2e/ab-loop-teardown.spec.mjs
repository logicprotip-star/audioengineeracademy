// G235 (TUR3B bulgusu) — abPressTimer (A/B/Döngü butonunun 520ms uzun-basma
// eşiği) SADECE pointerup/pointerleave'de temizleniyordu; pauseRound()'un
// (Durdur/arka plana alınma/sheet açılışı/rota değişimi — #53'ün TEK kontrol
// noktası) HİÇBİRİNDE temizlenmiyordu. freqTapTimer'ın G187'de düzeltilen
// AYNI sınıfı: parmak basılıyken (520ms dolmadan) round duraklatılırsa,
// zamanlayıcı DURAKLAMIŞ bir ekranda ateşleyip startAbLoop()'u tetikleyip
// istenmeyen bir ses döngüsü başlatabiliyordu. Bu test #gameSettingsBtn'i
// (pauseRound()'u çağıran, gerçek bir UI yolu) kullanarak tam bu senaryoyu
// üretir.

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

test("G235: A/B düğmesine basılı tutulup 520ms dolmadan Durdur/ayarlar açılırsa, döngü DAHA SONRA kendiliğinden BAŞLAMAZ", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  // simulatePro — paywall/reklam araya girmesin, test SADECE abPressTimer'a odaklansın.
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  // boost-mu-cut-mu — Motor 2 (üç-yönlü A/B/C) modu, exam-flow.spec.mjs'te
  // ZATEN baştan sona oynanabildiği doğrulanmış.
  await enterMode(page, "boost-mu-cut-mu");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await dismissSpotlightIfShown(page);

  // pointerdown — abPressTimer'ı arm eder (520ms eşik). pointerup/leave
  // BİLEREK GÖNDERİLMİYOR (arka plana alınırken bu olayların güvenilir
  // ateşlenmediği senaryonun simülasyonu).
  await page.locator("#abToggle").dispatchEvent("pointerdown");
  await page.waitForTimeout(200); // 520ms eşiğinin ALTINDA

  // pauseRound()'u çağıran gerçek bir UI yolu: ayarlar sheet'ini aç/kapat.
  await page.locator("#gameSettingsBtn").click();
  await page.waitForTimeout(150);
  await page.locator("#gameSettingsCancel").click();

  // Toplam geçen süre (pointerdown'dan beri) 520ms eşiğini AŞANA kadar bekle.
  await page.waitForTimeout(600);

  const loopStarted = await page.evaluate(() => {
    const toggle = document.getElementById("abToggle");
    const badgeRow = document.getElementById("gameLoopBadgeRow");
    return (toggle && toggle.classList.contains("loop")) || (badgeRow && !badgeRow.classList.contains("hidden"));
  });
  assert.equal(loopStarted, false, "abPressTimer pauseRound()'da temizlenmediyse döngü kendiliğinden başlar (G235'in düzelttiği hayalet tetikleme)");

  await page.close();
});

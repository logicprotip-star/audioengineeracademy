// OLCUM-CIHAZ-16-08.md madde D — enterMode() #freqInfo/#answers/
// #freqGuessArea/başlık-meta/zamanlayıcı/challenge/#cakismaCompare/
// spotlight/analyzer class'larının HEPSİNİ mod değişiminde sıfırlıyordu
// AMA #feedbackBox/#feedbackOverlay'e HİÇ dokunmuyordu — bu class'lar
// SADECE pauseRound()'da ("#53 — TEK kontrol noktası") temizleniyordu,
// enterMode() pauseRound()'u ÇAĞIRMIYOR. Sonuç: canlar bitip paywall'a
// ZORLA yönlendirilen bir round'un geri bildirim paneli hiç kapanmadan
// "show-result"/"open" kalıyordu — kullanıcı paywall'dan çıkıp HANGİ moda
// girerse girsin (enterMode() her zaman bu yoldan geçer), #screen-game'e
// dönünce panel ESKİ içerikle YENİDEN görünür oluyordu (#feedbackBox/
// #feedbackOverlay #screen-game'in İÇİNDE, `.screen{display:none}`
// SADECE ekranı gizliyordu, class'ları DEĞİL).
//
// Düzeltme: enterMode() artık #feedbackBox'ın "show-result"/"bad"
// class'larını ve #feedbackOverlay'in "open" class'ını da temizliyor —
// diğer sekiz reset'le AYNI blokta, AYNI yerde.
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

// answerCorrectChoice()'un (app-fixtures.mjs, G261) TAM TERSİ — burada
// KASITLI olarak YANLIŞ cevap veriyoruz, çünkü senaryo "can bitince
// paywall açılsın" gerektiriyor. G261'in AYNI güvenilir mekanizmasını
// (window.__aeaActiveQuestionChoices) kullanıyor, sadece `!c.correct`
// arıyor.
async function answerWrongChoice(page) {
  await dismissSpotlightIfShown(page);
  const wrongIndex = await page.evaluate(() => {
    const choices = window.__aeaActiveQuestionChoices ? window.__aeaActiveQuestionChoices() : null;
    if (!Array.isArray(choices)) return -1;
    return choices.findIndex((c) => c && !c.correct);
  });
  const target = wrongIndex >= 0 ? page.locator(".ans").nth(wrongIndex) : page.locator(".ans").first();
  await target.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(500);
}

test("canlar bitir → paywall → çık → başka moda gir → geri bildirim paneli TEMİZ (OLCUM-CIHAZ-16-08 madde D)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  // lives:1 — bir sonraki YANLIŞ cevap canı 1→0 düşürüp finalizeIfGameOver()'ı
  // "livesOut" sebebiyle paywall'a yönlendirir (madde D'nin kendi tekrar-
  // üretimiyle AYNI seed).
  await seedLocalStorage(page, { stats: { lives: 1, lastRefillAt: Date.now() } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await answerWrongChoice(page);

  const afterWrongAnswer = await page.evaluate(() => ({
    activeScreen: document.querySelector(".screen.active")?.id,
    fbShowResult: document.getElementById("feedbackBox")?.classList.contains("show-result"),
    fbOverlayOpen: document.getElementById("feedbackOverlay")?.classList.contains("open"),
  }));
  assert.equal(afterWrongAnswer.activeScreen, "screen-paywall", "ön koşul: canlar bitince paywall açılmalı");
  assert.equal(afterWrongAnswer.fbShowResult, true, "ön koşul: yanlış cevap sonrası panel show-result olmalı (asıl bug'ı test etmek için)");
  assert.equal(afterWrongAnswer.fbOverlayOpen, true, "ön koşul: yanlış cevap sonrası overlay open olmalı");

  // Paywall'dan çık (gerçek kapatma yolu, DOM'a doğrudan dokunulmuyor).
  await page.locator("#paywallCloseBtn").click();
  await page.waitForTimeout(300);
  const afterClose = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(afterClose, "screen-menu", "ön koşul: paywall kapanınca ana menüye dönmeli");

  // Başka bir moda gir (enterMode()'un GERÇEK kod yolu — mode-card click).
  await page.locator('.mode-card[data-mode-id="kesim-noktasi"]').first().click();
  await page.waitForTimeout(300);

  const afterModeSwitch = await page.evaluate(() => ({
    activeScreen: document.querySelector(".screen.active")?.id,
    gameTitle: document.getElementById("gameTitle")?.textContent,
    fbShowResult: document.getElementById("feedbackBox")?.classList.contains("show-result"),
    fbBad: document.getElementById("feedbackBox")?.classList.contains("bad"),
    fbOverlayOpen: document.getElementById("feedbackOverlay")?.classList.contains("open"),
  }));
  assert.equal(afterModeSwitch.activeScreen, "screen-game", "yeni moda girince oyun ekranı açılmalı");
  assert.equal(afterModeSwitch.gameTitle, "Kesim Noktası", "ön koşul: gerçekten farklı bir moda girilmiş olmalı");
  assert.equal(afterModeSwitch.fbShowResult, false, "REGRESYON: eski modun geri bildirim paneli (show-result) yeni modun ekranında hâlâ açık");
  assert.equal(afterModeSwitch.fbBad, false, "REGRESYON: eski modun 'bad' (yanlış cevap) rengi yeni modun ekranında hâlâ açık");
  assert.equal(afterModeSwitch.fbOverlayOpen, false, "REGRESYON: eski modun karartma katmanı (#feedbackOverlay) yeni modun ekranında hâlâ açık");

  await page.close();
});

// Aynı moda GERİ dönüş de (menüden aynı karta tekrar basmak) enterMode()'dan
// geçiyor — panel orada da temizlenmeli, sadece FARKLI moda geçişte değil.
test("canlar bitir → paywall → çık → AYNI moda tekrar gir → geri bildirim paneli TEMİZ", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { stats: { lives: 1, lastRefillAt: Date.now() } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await answerWrongChoice(page);

  const preCheck = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(preCheck, "screen-paywall", "ön koşul: canlar bitince paywall açılmalı");

  await page.locator("#paywallCloseBtn").click();
  await page.waitForTimeout(300);
  await page.locator('.mode-card[data-mode-id="boost-mu-cut-mu"]').first().click();
  await page.waitForTimeout(300);

  const afterReturn = await page.evaluate(() => ({
    activeScreen: document.querySelector(".screen.active")?.id,
    fbShowResult: document.getElementById("feedbackBox")?.classList.contains("show-result"),
    fbOverlayOpen: document.getElementById("feedbackOverlay")?.classList.contains("open"),
  }));
  assert.equal(afterReturn.activeScreen, "screen-game");
  assert.equal(afterReturn.fbShowResult, false, "REGRESYON: aynı moda geri dönüşte de panel temizlenmeli");
  assert.equal(afterReturn.fbOverlayOpen, false, "REGRESYON: aynı moda geri dönüşte de overlay temizlenmeli");

  await page.close();
});

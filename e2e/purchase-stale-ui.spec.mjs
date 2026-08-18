// G291 (OLCUM-UC-18-08 madde A'nın bulduğu bug) — canlar bitip paywall
// açıldığında, Pro satın alınıp oyuna dönüldüğünde: (1) play/pause ikonu
// (#startBtn) GERÇEK durumu yansıtmalı (updateStartBtnLabel() ARTIK
// isUserPro()'ya bakıyor), (2) #feedbackOverlay ekranı ENGELLEMEMELİ
// (teardownActiveRound() ARTIK onu kapatıyor), (3) can göstergesi
// (#hearts) DOĞRU görünmeli (syncDevUI() ARTIK renderHearts()/
// renderGameHeader() çağırıyor). Kesim Noktası (tier:"free", THREE_WAY
// export ETMİYOR) kasıtlı seçildi — ücretsiz kullanıcı da girebiliyor VE
// #startBtn bu modda round aktifken HİÇ gizlenmiyor (Kompresör/Reverb/
// Distortion'ın AKSİNE, üçü de THREE_WAY=true), asıl "pause ikonu
// görünmüyor" şikayetinin GERÇEKTEN görünür olduğu, temsili bir mod.

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

async function mockNativePurchases(page) {
  await page.evaluate((productId) => {
    window.Capacitor = window.Capacitor || {};
    window.Capacitor.Plugins = window.Capacitor.Plugins || {};
    window.Capacitor.Plugins.NativePurchases = {
      purchaseProduct: async () => ({}),
      getPurchases: async () => ({ purchases: [{ productIdentifier: productId }] }),
      restorePurchases: async () => ({}),
    };
  }, "com.logicprotrick.audioengineeracademy.pro");
}

test("KABUL KRİTERİ — canlar bitti → paywall → Pro alındı → oyuna dönüldü: ikon/feedback/can GÖSTERGESİ DOĞRU", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { stats: { lives: 1 }, playMode: "challenge" });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await mockNativePurchases(page);

  await enterMode(page, "kesim-noktasi");
  await dismissSpotlightIfShown(page);
  const hpConfirm = page.locator("#hpSheetConfirm");
  if (await hpConfirm.isVisible().catch(() => false)) { await hpConfirm.click(); await page.waitForTimeout(150); }
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissSpotlightIfShown(page);

  // Ön koşul: round GERÇEKTEN aktif, "▶" DEĞİL "⏸" gösteriyor (tur çalıyor).
  const startBtnBeforeWrong = await page.locator("#startBtn").textContent();
  assert.equal(startBtnBeforeWrong, "⏸", "ön koşul: round aktifken ikon '⏸' göstermeliydi");

  // Yanlış cevap ver — TEK son can gider, finalizeIfGameOver() → paywall.
  // Index-bazlı seçim (answerCorrectChoice() ile AYNI kalıp) — .ans'ların
  // taşıdığı data-* alanı MODA göre değişiyor (cutoff: data-freq/data-filterType,
  // dblevel: data-db, boostcut: katmana göre), bu yüzden mod-agnostik.
  const wrongIndex = await page.evaluate(() => {
    const choices = window.__aeaActiveQuestionChoices();
    return choices.findIndex(c => c && !c.correct);
  });
  await page.locator(".ans").nth(wrongIndex).click();
  await page.waitForTimeout(500);

  const screenAfterWrong = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(screenAfterWrong, "screen-paywall", `ön koşul: canlar bitince paywall açılmalıydı, gelen: ${screenAfterWrong}`);

  // Satın al.
  await page.locator("#buyProBtn").click();
  await page.waitForTimeout(800);
  const screenAfterPurchase = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(screenAfterPurchase, "screen-game", `satın alma sonrası oyun ekranına dönmeliydi, gelen: ${screenAfterPurchase}`);

  // KABUL KRİTERİ 2 — feedback paneli ekranı ENGELLEMİYOR (force OLMADAN tıklanabilir).
  const feedbackOverlayOpen = await page.evaluate(() => document.getElementById("feedbackOverlay")?.classList.contains("open"));
  assert.equal(feedbackOverlayOpen, false, "#feedbackOverlay satın alma sonrası AÇIK KALMAMALIYDI");

  // KABUL KRİTERİ 3 — can göstergesi DOĞRU (Pro'da #hearts container'ı gizli).
  const heartsHidden = await page.evaluate(() => document.getElementById("hearts")?.classList.contains("hidden"));
  assert.equal(heartsHidden, true, "#hearts Pro'da GİZLİ olmalıydı (renderGameHeader() satın alma sonrası ÇAĞRILMALI)");

  // KABUL KRİTERİ 1 — '▶'a (force OLMADAN — feedback overlay ARTIK engellemiyor) basınca
  // YENİ bir round GERÇEKTEN başlıyor VE ikon '⏸'e dönüyor.
  await page.locator("#startBtn").click();
  await page.waitForTimeout(600);
  const activeQuestionAfterPlay = await page.evaluate(() => window.__aeaActiveQuestionChoices() !== null);
  assert.equal(activeQuestionAfterPlay, true, "'▶'a basınca YENİ bir round başlamalıydı");
  const startBtnAfterPlay = await page.locator("#startBtn").textContent();
  assert.equal(startBtnAfterPlay, "⏸", "round GERÇEKTEN aktifken/çalarken ikon '⏸' GÖSTERMELİYDİ (DÜZELTME ÖNCESİ: '▶' takılı kalıyordu)");

  await page.close();
});

test("REGRESYON KORUMASI — ücretsiz kullanıcıda (Pro DEĞİL) canlar biterse ikon/feedback davranışı DEĞİŞMEDİ", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { stats: { lives: 1 }, playMode: "challenge" });
  await page.reload();
  await page.waitForLoadState("networkidle");

  await enterMode(page, "kesim-noktasi");
  await dismissSpotlightIfShown(page);
  const hpConfirm = page.locator("#hpSheetConfirm");
  if (await hpConfirm.isVisible().catch(() => false)) { await hpConfirm.click(); await page.waitForTimeout(150); }
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissSpotlightIfShown(page);

  const wrongIndex = await page.evaluate(() => {
    const choices = window.__aeaActiveQuestionChoices();
    return choices.findIndex(c => c && !c.correct);
  });
  await page.locator(".ans").nth(wrongIndex).click();
  await page.waitForTimeout(500);

  const screenAfterWrong = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(screenAfterWrong, "screen-paywall");

  // Pro OLMADAN — "Sonra"/kapat, oyun ekranına DÖNMEZ ama #startBtn'in
  // KENDİ idle durumu (round yok) hâlâ DOĞRU olmalı — DOKUNULMAYACAK olan
  // can sistemi/paywall akışının KENDİSİ BOZULMADI.
  const startBtnStateStillIdle = await page.evaluate(() => {
    const btn = document.getElementById("startBtn");
    return { text: btn?.textContent, ariaLabel: btn?.getAttribute("aria-label") };
  });
  assert.equal(startBtnStateStillIdle.text, "▶", "Pro OLMADAN, can bitince ikon '▶' (idle) göstermeye DEVAM etmeli");
  assert.equal(startBtnStateStillIdle.ariaLabel, "Oyunu Başlat");

  await page.close();
});

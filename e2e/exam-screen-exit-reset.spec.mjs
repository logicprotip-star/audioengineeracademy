// G305 (OLCUM-GENIS-18-08 madde A1/B1, OLCUM-KESINTI-18-08 madde A1/A2) —
// "beşinci kapı": showExamScreen()'in "passed"/"failed"/"makeup"
// ekranlarının "Ana Ekran" butonu (secondaryHandler) G287/G300'ün
// düzelttiği 4 çıkış yolundan (performExit/quitGameBtn) BİRİ DEĞİL — kendi
// başına AYRI bir gedik. `activeQuestion=null`/`clearInProgressRound()`
// state'i temizliyordu ama `pauseRound()`'u (updateStartBtnLabel/timer/
// feedback-panel/"Atla ▶" sıfırlaması — #53'ün TEK kontrol noktası) HİÇ
// çağırmıyordu. Kullanıcı AYNI moda tekrar girdiğinde `enterMode()`'un
// `mode!==realMode` bloğu (TÜM UI-sıfırlama mantığını taşıyan tek yer,
// `app.js:2807-2940`) ÇALIŞMIYOR (mod hiç değişmemiş) — sonuç: "⏸" ikonu
// takılı kalmış play düğmesi, boş cevap alanı, eski bölüm/telafi noktaları
// ile YARIM bir ekran (Playwright'ta TAM tekrar üretildi, OLCUM-GENIS'in
// kendi ölçümü).
//
// Düzeltme: performExit()'in G300'de kanıtlanmış `if (activeQuestion &&
// !autoStopped) pauseRound();` deseni, üç "Ana Ekran" handler'ına da
// (app.js:3176/3193/3218) AYNEN eklendi.

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

// 10× "Atla" ile (hiç doğru cevap yok, kombo hiç oluşmaz) parkur toplamı
// <6'da kalır — "remedial-start" (telafi anons ekranı) tetiklenir.
async function reachRemedialScreen(page, modeId) {
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, modeId);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await dismissSpotlightIfShown(page);
  for (let i = 0; i < 10; i++) {
    await dismissSpotlightIfShown(page);
    const screen = await page.evaluate(() => document.querySelector(".screen.active")?.id);
    if (screen === "screen-exam") return true;
    await page.locator("#nextBtn").click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  return (await page.evaluate(() => document.querySelector(".screen.active")?.id)) === "screen-exam";
}

async function gameScreenSnapshot(page) {
  return page.evaluate(() => ({
    screen: document.querySelector(".screen.active")?.id,
    startBtnText: document.getElementById("startBtn")?.textContent?.trim(),
    startBtnClasses: document.getElementById("startBtn")?.className,
    nextBtnText: document.getElementById("nextBtn")?.textContent?.trim(),
  }));
}

test("G305 KABUL KRİTERİ — telafi (makeup) ekranından 'Ana Ekran', AYNI moda tekrar girince ekran YARIM KALMIYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const reached = await reachRemedialScreen(page, "boost-mu-cut-mu");
  assert.ok(reached, "ön koşul: telafi (screen-exam) ekranına ulaşılamadı");

  const secondaryLabel = await page.locator("#exSecondary").textContent();
  assert.equal(secondaryLabel.trim(), "Ana Ekran", `ön koşul: ikincil buton 'Ana Ekran' değil (${secondaryLabel})`);
  await page.locator("#exSecondary").click({ timeout: 3000 });
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.querySelector(".screen.active")?.id), "screen-menu");

  await enterMode(page, "boost-mu-cut-mu");
  await dismissSpotlightIfShown(page);
  await page.waitForTimeout(300);

  const state = await gameScreenSnapshot(page);
  assert.equal(state.screen, "screen-game");
  assert.equal(state.startBtnText, "▶", `DÜZELTME ÖNCESİ: "⏸" (takılı kalmış play ikonu) gösteriyordu, alınan: "${state.startBtnText}"`);
  assert.ok(!state.startBtnClasses.includes("breathing"), `DÜZELTME ÖNCESİ: "breathing" (aktif-çalma) sınıfı takılı kalıyordu — alınan class: "${state.startBtnClasses}"`);
  assert.equal(state.nextBtnText, "Atla ▶", `DÜZELTME ÖNCESİ: eski "Sonraki ▶" metni takılı kalabiliyordu, alınan: "${state.nextBtnText}"`);

  await page.close();
});

// REGRESYON KORUMASI — G174'ün "aynı moda dönüşte challenge/BÖLÜM
// ilerlemesi SIZMAZ/SIFIRLANMAZ" ilkesi (581f798, KİLİT'te korunan bir
// commit) bu düzeltmeyle BOZULMADI: pauseRound() `challenge`'a HİÇ
// dokunmuyor (SADECE UI/timer/ses), G305'in eklediği çağrı da SADECE
// pauseRound()'u çağırıyor — enterMode()'un mode!==realMode bloğuna hiç
// dokunulmadı.
test("G305 REGRESYON KORUMASI — normal (sınav/telafi'ye hiç uğramayan) bir moddan-çıkış davranışı DEĞİŞMEDİ", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "kesim-noktasi");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await dismissSpotlightIfShown(page);

  await page.locator("#backBtn").click();
  await page.waitForTimeout(200);
  const exitConfirm = page.locator("#exitConfirmLeave");
  if (await exitConfirm.isVisible().catch(() => false)) await exitConfirm.click();
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.querySelector(".screen.active")?.id), "screen-menu");

  await enterMode(page, "kesim-noktasi");
  await dismissSpotlightIfShown(page);
  await page.waitForTimeout(300);
  const state = await gameScreenSnapshot(page);
  assert.equal(state.startBtnText, "▶", "normal moddan-çıkış sonrası startBtn hâlâ doğru olmalı (regresyon yok)");

  await page.close();
});

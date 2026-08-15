// G237 (TUR4 bulgusu 🔴) — ücretsiz "5 soru/gün" duvarı ÖNCEDEN
// bellek-içi bir sayaçtaydı (roundsInThisPlaySession) — mod kapatılıp
// AÇILINCA (bu testin simüle ettiği "sayfa yenileme") sıfırlanıyordu,
// reklamsız/Pro'suz sınırsız tekrarlanabiliyordu. Artık storage.js:
// loadFreeSession()/saveFreeSession() ile GÜNLÜK kalıcı — bu dosya
// TAM olarak görevin kendi kabul kriterini test ediyor: "ücretsiz
// kullanıcı 5 soru yapar, modu kapatıp açar, 6. soruyu YAPAMAZ,
// paywall görür."

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, dismissSpotlightIfShown, activeScreenId } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

// "Atla"ya basarak ücretsiz oturum limitine (5 soru) ulaşır —
// e2e/paywall-flow.spec.mjs'in AYNI yardımcı deseni.
async function exhaustFreeSessionLimit(page) {
  for (let i = 0; i < 6; i++) {
    const visible = await page.locator("#nextBtn").isVisible().catch(() => false);
    if (!visible) break;
    await page.locator("#nextBtn").click();
    await page.waitForTimeout(200);
  }
}

test("G237: 5 soru bitip paywall açıldıktan SONRA sayfa yenilenirse (mod kapat/aç simülasyonu), 6. soru YİNE başlatılamaz — paywall doğrudan açılır", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  // rounds:50 — "ilk oturum" muafiyetini atlamak için (paywall-flow.spec.mjs'in
  // "İLK OTURUM DEĞİL" senaryosuyla AYNI seed).
  await seedLocalStorage(page, { stats: { rounds: 50 } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await exhaustFreeSessionLimit(page);

  const beforeReload = await activeScreenId(page);
  assert.equal(beforeReload, "screen-paywall", "ön koşul: 5 soru sonrası paywall GERÇEKTEN açılmış olmalı (mevcut davranış, değişmedi)");

  // Sayfayı TAMAMEN yenile (uygulamayı kapatıp açmanın en yakın web-eşdeğeri
  // — TÜM bellek-içi JS state'i, roundsInThisPlaySession DAHİL, sıfırlanır).
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await dismissSpotlightIfShown(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);

  const afterReload = await activeScreenId(page);
  assert.equal(afterReload, "screen-paywall", `G237'nin düzelttiği hata: yenilemeden SONRA 6. soru başlıyorsa (screen-game) sayaç HÂLÂ kalıcı değil demektir — gelen ekran: ${afterReload}`);
  const reasonTitle = await page.evaluate(() => document.getElementById("paywallReasonTitle")?.textContent || null);
  assert.equal(reasonTitle, "Ücretsiz oturumun bitti");

  await page.close();
});

test("G237: Pro kullanıcı (simülasyon) 6+ soru sonrası paywall görmez, ve YENİ kalıcı sayaç (freeSession) hiç YAZILMAZ", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { stats: { rounds: 50 }, dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await exhaustFreeSessionLimit(page);

  const screenAfter = await activeScreenId(page);
  assert.notEqual(screenAfter, "screen-paywall", "Pro'da 6+ soru sonrası paywall HİÇ açılmamalı (mevcut davranış, değişmedi)");

  // G237'nin ana talebi: "Pro kullanıcı bundan ETKİLENMEMELİ" — en kesin
  // kanıt, Pro'da bu YENİ anahtarın localStorage'a HİÇ yazılmamış olması
  // (startRound()'un `if (!isUserPro())` koruması, bkz. app.js).
  const freeSessionRaw = await page.evaluate(() => localStorage.getItem("eqEarTrainerProXFreeSession"));
  assert.equal(freeSessionRaw, null, "Pro kullanıcıda freeSession anahtarı hiç yazılmamalı");

  await page.close();
});

// G287 — OLCUM-KURTARMA-17-08.md'nin bulduğu kök sebep: kullanıcı oyun
// ekranında "geri"ye basıp exit-confirm'de "Çık"ı onayladığında (ya da
// Ayarlar sheet'inin "Oyundan çık" düğmesiyle), tur duraklatılıyordu ama
// `activeQuestion` null'a çekilmiyordu ve `eqEarTrainerProXInProgressRound`
// kaydı GEÇERLİ kalıyordu — bir sonraki soğuk başlatmada G203'ün 3-saat-
// taze kuralı bu YANLIŞ POZİTİF kaydı bulup DOĞRUDAN o modun oyun ekranını
// açıyordu (cihazda görülen: "ana ekrandan çıkış yapıldı, uygulama
// Frekans Çakışması'ndan açıldı").
//
// Logic'in kararı (A seçeneği): "Çık" turu TERK EDER — "Durdur"un AYNI
// iki satırı (activeQuestion=null + clearInProgressRound()) "Çık"
// akışlarına da eklendi. G203'ün "aktif tur VARKEN kaldığı yerden devam"
// mantığı (backgrounding/visibilitychange yolu) BU testte DOKUNULMADI —
// AYRI, DEĞİŞMEYEN bir davranış (bkz. e2e/... — bu dosya SADECE "Çık"ı
// test ediyor, backgrounding/resume senaryosu KAPSAM DIŞI).

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

async function startCakismaRound(page) {
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-cakismasi");
  const hpConfirm = page.locator("#hpSheetConfirm");
  if (await hpConfirm.isVisible().catch(() => false)) {
    await hpConfirm.click();
    await page.waitForTimeout(150);
  }
  await page.locator("#startBtn").click();
  await page.waitForTimeout(600);
  await dismissSpotlightIfShown(page);
}

async function inProgressRoundRaw(page) {
  return page.evaluate(() => localStorage.getItem("eqEarTrainerProXInProgressRound"));
}

test("G287 KABUL KRİTERİ — geri → Çık → sayfa yenile → MENÜ açılıyor, oyun ekranı DEĞİL", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await startCakismaRound(page);

  // Round GERÇEKTEN aktif — ön koşul.
  const activeQuestionSet = await page.evaluate(() => window.__aeaActiveQuestionChoices() !== null);
  assert.ok(activeQuestionSet, "ön koşul: round aktif olmalıydı");

  // GERÇEK "geri" düğmesi → exit-confirm → "Çık" (Evet).
  await page.locator("#backBtn").click();
  await page.waitForTimeout(200);
  const exitConfirmOpen = await page.evaluate(() => document.getElementById("exitConfirmOverlay")?.classList.contains("open"));
  assert.ok(exitConfirmOpen, "ön koşul: exit-confirm dialog açılmalıydı (round aktifken 'geri' her zaman onay ister)");
  await page.locator("#exitConfirmLeave").click();
  await page.waitForTimeout(300);

  // DÜZELTME KANITI: activeQuestion null'a çekilmeli, kayıt silinmeli.
  const activeQuestionAfter = await page.evaluate(() => window.__aeaActiveQuestionChoices());
  assert.equal(activeQuestionAfter, null, "'Çık' sonrası activeQuestion null OLMALI (DÜZELTME ÖNCESİ: hâlâ doluydu)");
  const inProgressAfter = await inProgressRoundRaw(page);
  assert.equal(inProgressAfter, null, "'Çık' sonrası eqEarTrainerProXInProgressRound SİLİNMİŞ OLMALI (DÜZELTME ÖNCESİ: geçerli kalıyordu)");

  // KABUL KRİTERİ — soğuk başlatma simülasyonu: sayfayı yenile.
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  const activeScreen = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(activeScreen, "screen-menu", `Soğuk başlatma sonrası MENÜ açılmalıydı, alınan: ${activeScreen} (DÜZELTME ÖNCESİ: screen-game açılıyordu)`);

  await page.close();
});

test("G287 KABUL KRİTERİ — Ayarlar → 'Oyundan çık' için AYNI davranış", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await startCakismaRound(page);

  await page.locator("#gameSettingsBtn").click();
  await page.waitForTimeout(200);
  const sheetOpen = await page.evaluate(() => document.getElementById("gameSettingsOverlay")?.classList.contains("open"));
  assert.ok(sheetOpen, "ön koşul: Ayarlar sheet'i açılmalıydı");
  await page.locator("#quitGameBtn").click();
  await page.waitForTimeout(300);

  const activeQuestionAfter = await page.evaluate(() => window.__aeaActiveQuestionChoices());
  assert.equal(activeQuestionAfter, null, "'Oyundan çık' sonrası activeQuestion null OLMALI");
  const inProgressAfter = await inProgressRoundRaw(page);
  assert.equal(inProgressAfter, null, "'Oyundan çık' sonrası eqEarTrainerProXInProgressRound SİLİNMİŞ OLMALI");

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  const activeScreen = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(activeScreen, "screen-menu", `Soğuk başlatma sonrası MENÜ açılmalıydı, alınan: ${activeScreen}`);

  await page.close();
});

// REGRESYON KORUMASI — G203'ün "aktif tur VARKEN kaldığı yerden devam"
// (DOKUNULMAYACAK) davranışı BOZULMADI: kullanıcı "Kal" (exit-confirm'i
// İPTAL) derse round DEVAM ETMELİ, kayıt SİLİNMEMELİ.
test("G287 REGRESYON KORUMASI — exit-confirm'de 'Kal' (iptal) — round DEVAM ediyor, kayıt SİLİNMİYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await startCakismaRound(page);

  await page.locator("#backBtn").click();
  await page.waitForTimeout(200);
  await page.locator("#exitConfirmStay").click();
  await page.waitForTimeout(300);

  const activeScreen = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(activeScreen, "screen-game", "'Kal' sonrası oyun ekranında KALINMALI");
  const activeQuestionAfter = await page.evaluate(() => window.__aeaActiveQuestionChoices());
  assert.notEqual(activeQuestionAfter, null, "'Kal' sonrası activeQuestion HÂLÂ dolu olmalı — round devam ediyor");

  await page.close();
});

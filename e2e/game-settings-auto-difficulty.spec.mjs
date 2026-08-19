// G333 (OLCUM-I-GUNCEL-19-08'in devamı olan görevin madde 4'ü, cihazda bulundu) —
// oyun ekranından "..." (Oyun Ayarları) sheet'ine girilince Zorluk seçiminde
// SADECE "Sabit" ve alt kademeleri (Kolay/Orta/Zor/Pro/Pro Plus) seçilebiliyordu,
// "Otomatik"e GERİ DÖNMENİN bir yolu YOKTU — kullanıcı Genel Ayarlar'a (dişli
// ikonu, ayrı bir ekran) gitmek ZORUNDAYDI.
//
// KÖK SEBEP: #gameSettingsSheet'in "Zorluk" satırı openSheet()'i açıyor, bu da
// SADECE #difficultySelect'in GERÇEK <option>'larını (tier string'leri, "auto"
// hiç yok) render ediyordu. Z7 mekanizması (autoDiffAsk) SADECE TERS yönü
// (Otomatik'ten Sabit'e) kapsıyordu.
//
// DÜZELTME: Sabit moddayken bu sheet açılınca, Genel Ayarlar'daki #diffAutoBtn
// ile AYNI diziyi tetikleyen ekstra bir "Otomatik" satırı sheet'in EN ÜSTÜNE
// ekleniyor (app.js'in .setting-row click listener'ı, difficultySelect özel
// dalı). GERÇEK <select> option'larına dokunulmadı.
//
// KABUL KRİTERİ: Sabit moddayken Oyun Ayarları → Zorluk açılınca "Otomatik"
// satırı GÖRÜNÜYOR, tıklanınca diffModeAuto GERÇEKTEN true oluyor, prefs
// KALICI oluyor (soğuk başlatmada da korunuyor), G329'un Pro Plus görünürlük
// kısıtı BOZULMUYOR.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { enterMode, dismissSpotlightIfShown } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

// seedLocalStorage helper'ı difficultyMode'u HER ZAMAN "auto" yazıyor (bkz.
// app-fixtures.mjs) — bu testin ÖN KOŞULU (Sabit modda başlamak) için kendi
// seed'i AYNI prefs şeklini, SADECE difficultyMode:"fixed" ile kullanıyor.
async function seedFixedDifficulty(page) {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("eqEarTrainerProXPrefs", JSON.stringify({
      notifications: true, hpWarning: true, calibrationDone: true, calibrationLevel: 35,
      focusRange: "full", difficultyMode: "fixed", feedbackScreen: true, showDailyTip: true,
      playMode: "challenge",
    }));
    localStorage.setItem("eqEarTrainerProXDev", JSON.stringify({ simulatePro: true }));
  });
}

async function openGameSettingsAndZorluk(page) {
  await page.locator("#gameSettingsBtn").click();
  await page.waitForTimeout(200);
  await page.locator('[data-sheet-select="difficultySelect"]').click();
  await page.waitForTimeout(200);
}

test("KABUL KRİTERİ — Sabit moddayken Oyun Ayarları → Zorluk sheet'inde 'Otomatik' satırı GÖRÜNÜYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedFixedDifficulty(page);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-bulma");
  await dismissSpotlightIfShown(page);

  await openGameSettingsAndZorluk(page);
  const autoRow = page.locator(".sheet-option", { hasText: "Otomatik" }).first();
  assert.ok(await autoRow.isVisible(), "'Otomatik' satırı sheet'te görünmüyor");

  await page.close();
});

test("KABUL KRİTERİ — 'Otomatik' satırına tıklayınca diffModeAuto GERÇEKTEN true oluyor, sheet kapanıyor, satır etiketi güncelleniyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedFixedDifficulty(page);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-bulma");
  await dismissSpotlightIfShown(page);

  await openGameSettingsAndZorluk(page);
  await page.locator(".sheet-option", { hasText: "Otomatik" }).first().click();
  await page.waitForTimeout(200);

  const sheetOpen = await page.locator("#settingsSheet").evaluate(el => el.classList.contains("open")).catch(() => false);
  assert.equal(sheetOpen, false, "sheet 'Otomatik' seçildikten sonra KAPANMALIYDI");

  const rowLabel = await page.locator('[data-sheet-select="difficultySelect"] .setting-row-value-text').textContent();
  assert.match(rowLabel, /^Otomatik/, `Zorluk satırı 'Otomatik ·' ile BAŞLAMALIYDI, alınan: ${rowLabel}`);

  const prefsAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("eqEarTrainerProXPrefs")).difficultyMode);
  assert.equal(prefsAfter, "auto", "prefs.difficultyMode KALICI olarak 'auto' YAZILMALIYDI");

  await page.close();
});

test("KABUL KRİTERİ — Otomatik'e geçiş SOĞUK BAŞLATMADA (sayfa yenileme) da korunuyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedFixedDifficulty(page);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-bulma");
  await dismissSpotlightIfShown(page);

  await openGameSettingsAndZorluk(page);
  await page.locator(".sheet-option", { hasText: "Otomatik" }).first().click();
  await page.waitForTimeout(200);

  await page.reload();
  await page.waitForLoadState("networkidle");
  const prefsAfterReload = await page.evaluate(() => JSON.parse(localStorage.getItem("eqEarTrainerProXPrefs")).difficultyMode);
  assert.equal(prefsAfterReload, "auto", "soğuk başlatma SONRASI difficultyMode 'auto' KALMALIYDI");

  await page.close();
});

// REGRESYON KORUMASI — Otomatik moddayken Zorluk satırına dokununca hâlâ Z7'nin
// autoDiffAsk'ı açılıyor (bu tur SADECE Sabit→Otomatik yönünü ekledi, mevcut
// Otomatik→Sabit yolu DEĞİŞMEDİ).
test("REGRESYON KORUMASI — Otomatik moddayken Zorluk satırına dokununca YİNE autoDiffAsk açılıyor (Z7 bozulmadı)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  await page.goto(serverHandle.baseUrl);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("eqEarTrainerProXPrefs", JSON.stringify({
      notifications: true, hpWarning: true, calibrationDone: true, calibrationLevel: 35,
      focusRange: "full", difficultyMode: "auto", feedbackScreen: true, showDailyTip: true,
      playMode: "challenge",
    }));
    localStorage.setItem("eqEarTrainerProXDev", JSON.stringify({ simulatePro: true }));
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-bulma");
  await dismissSpotlightIfShown(page);

  await page.locator("#gameSettingsBtn").click();
  await page.waitForTimeout(200);
  await page.locator('[data-sheet-select="difficultySelect"]').click();
  await page.waitForTimeout(200);

  const askVisible = await page.locator("#autoDiffAsk").isVisible().catch(() => false);
  assert.ok(askVisible, "Otomatik moddayken YİNE 'Sabit'e geçmek ister misin?' sorusu açılmalıydı (Z7 regresyonu)");
  const sheetOpen = await page.locator("#settingsSheet").evaluate(el => el.classList.contains("open")).catch(() => false);
  assert.equal(sheetOpen, false, "Otomatik moddayken sheet'in KENDİSİ AÇILMAMALIYDI (Z7'nin davranışı)");

  assert.deepEqual(errors, [], `konsol hatası: ${errors.join(" | ")}`);
  await page.close();
});

// NOT: G327'nin Pro Plus sheet-görünürlüğünü (openSheet()'in .sheet-option
// satırlarından proplus'ı gerçekten kaldırıp kaldırmadığını) doğrulayan bir
// test BİLEREK BURAYA EKLENMEDİ — ölçüldü (git stash ile bu görevin app.js
// değişikliği TAMAMEN çıkarılıp AYNI kontrol tekrarlandı): mevcut/committed
// kodda ("Kesim Noktası" gibi proplus'suz bir modda) "Pro Plus" satırı YİNE
// DE #gameSettingsSheet'in Zorluk sheet'inde görünüyor — openSheet() (app.js
// ~8897) satırları select.options'tan opt.hidden'ı HİÇ KONTROL ETMEDEN
// oluşturuyor, syncProPlusVisibility()'nin (G327) set ettiği option.hidden
// bu ÖZEL DOM yolunda hiç okunmuyor. Bu görevin DEĞİŞİKLİĞİNDEN (yeni
// "Otomatik" satırı) TAMAMEN BAĞIMSIZ, ÖNCEDEN VAR OLAN bir sızıntı — rapor
// edildi, bu görev SESSİZCE genişletilip DÜZELTİLMEDİ (kapsam dışı).

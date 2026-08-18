// G303 (OLCUM-CIHAZ3-18-08'in ardından cihazda bulundu) — Frekans Çakışması'nda
// moddan çıkıp girince (ya da sayfa yenilenince) seçilen kaynak çifti
// HATIRLANMIYORDU, her zaman ilk çifte (Akustik Gitar + Clean Gitar) düşüyordu.
// Kök sebep: #cakismaPairSelect'in "change" listener'ı (G51'den, 1c86464'ten
// beri) SADECE syncCakismaVisibility() çağırıyordu — diğer modların kaynak
// seçimini kalıcılaştıran sourceSelections/recordSourceSelection() (G138)
// mekanizmasına HİÇ bağlı değildi. Bu, "bugünkü offset/gain eklentisinin
// kırdığı" bir regresyon DEĞİL — git log -S ile doğrulandı, listener G51'den
// beri (mod ilk yaratıldığından beri) hiç değişmemiş, bug LATENT'ti.
//
// KABUL KRİTERİ: seçilen çift AYNI oturumda moddan çıkıp girince VE soğuk
// başlatmada (sayfa yenileme) KORUNUYOR.

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

async function enterCakisma(page) {
  await enterMode(page, "frekans-cakismasi");
  await dismissSpotlightIfShown(page);
  await dismissHeadphoneSheetIfShown(page);
}

test("G303 KABUL KRİTERİ — kaynak çifti seçimi AYNI oturumda moddan çıkıp girince korunuyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterCakisma(page);

  await page.locator('[data-sheet-select="cakismaPairSelect"]').click();
  await page.waitForTimeout(250);
  await page.locator('.sheet-option:has-text("Vokal 2 + Clean Gitar")').first().click();
  await page.waitForTimeout(250);
  assert.equal(await page.locator("#cakismaPairSelect").inputValue(), "vokal2-clean", "ön koşul: seçim uygulanmalıydı");

  // Menüye dön (activeQuestion yok, backBtn doğrudan performExit).
  await page.locator("#backBtn").click();
  await page.waitForTimeout(300);

  await enterCakisma(page);
  const value = await page.locator("#cakismaPairSelect").inputValue();
  assert.equal(value, "vokal2-clean", `moddan çıkıp girince çift KORUNMALIYDI, alınan: ${value} (DÜZELTME ÖNCESİ: her zaman ilk çifte dönüyordu)`);

  await page.close();
});

test("G303 KABUL KRİTERİ — kaynak çifti seçimi SOĞUK BAŞLATMADA (sayfa yenileme) korunuyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterCakisma(page);

  await page.locator('[data-sheet-select="cakismaPairSelect"]').click();
  await page.waitForTimeout(250);
  await page.locator('.sheet-option:has-text("Snare + Akustik Gitar")').first().click();
  await page.waitForTimeout(250);
  assert.equal(await page.locator("#cakismaPairSelect").inputValue(), "snare-akustik", "ön koşul: seçim uygulanmalıydı");

  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterCakisma(page);
  const value = await page.locator("#cakismaPairSelect").inputValue();
  assert.equal(value, "snare-akustik", `soğuk başlatma sonrası çift KORUNMALIYDI, alınan: ${value}`);

  await page.close();
});

// REGRESYON KORUMASI — diğer sekiz tek-kaynaklı modun sourceSelect hatırlaması
// (G138) bu değişiklikten ETKİLENMEDİ (AYNI sourceSelections haritası, AYRI anahtar).
test("REGRESYON KORUMASI — Frekans Bulma'nın kaynak hatırlaması (G138) bozulmadı", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, {});
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-bulma");
  await dismissSpotlightIfShown(page);

  await page.evaluate(() => {
    const sel = document.getElementById("sourceSelect");
    const opt = Array.from(sel.options).find(o => o.value !== sel.value);
    if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  const chosen = await page.locator("#sourceSelect").inputValue();

  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-bulma");
  await dismissSpotlightIfShown(page);
  const valueAfterReload = await page.locator("#sourceSelect").inputValue();
  assert.equal(valueAfterReload, chosen, "Frekans Bulma'nın KENDİ kaynak hatırlaması (G138) bozulmuş olabilir");

  await page.close();
});

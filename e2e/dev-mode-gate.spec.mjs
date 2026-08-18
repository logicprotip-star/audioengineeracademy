// G298 (OLCUM-BAYRAK-16-08 bulgusu) — 7-tık gizli geliştirici modu artık
// DEV_MODE'a bağlı. Repo'nun committed hâli HER ZAMAN DEV_MODE=true
// (build-flags.js'in kendi G239 tripwire kuralı) — bu yüzden "DEV_MODE=false
// (App Store Archive)'ta 7-tık gerçekten susuyor mu" sorusunu test etmek
// için core/build-flags.js'i `page.route()` ile YAKALAYIP DEV_MODE=false
// döndürecek şekilde DEĞİŞTİRİYORUZ (repo dosyası DEĞİŞMİYOR, SADECE bu
// test sayfasının ağ isteği — G296/G297'nin AYNI yöntemi).

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage } from "./helpers/app-fixtures.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_FLAGS_PATH = path.resolve(__dirname, "..", "www", "js", "core", "build-flags.js");
const REAL_BUILD_FLAGS_SRC = fs.readFileSync(BUILD_FLAGS_PATH, "utf8");

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

async function routeDevModeFalse(page) {
  await page.route("**/js/core/build-flags.js", (route) => {
    const fakeSrc = REAL_BUILD_FLAGS_SRC.replace("export const DEV_MODE = true;", "export const DEV_MODE = false;");
    assert.notEqual(fakeSrc, REAL_BUILD_FLAGS_SRC, "ön koşul: DEV_MODE=true satırı bulunamadı, route yakalama geçersiz");
    route.fulfill({ contentType: "text/javascript; charset=utf-8", body: fakeSrc });
  });
}

async function openApp(page, { stats = {}, dev = null } = {}) {
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { stats: { rounds: 5, correct: 3, ...stats }, dev });
  await page.reload();
  await page.waitForLoadState("networkidle");
}

async function openSettingsSheet(page) {
  await page.locator("#menuSettingsBtn").click();
  await page.waitForTimeout(200);
}

async function tapVersionRow(page, times) {
  for (let i = 0; i < times; i++) {
    await page.locator("#versionRow").click();
  }
  await page.waitForTimeout(150);
}

test("KABUL KRİTERİ — DEV_MODE=false iken 7 tık HİÇBİR ŞEY yapmıyor (menü açılmıyor, toast çıkmıyor)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const toastMessages = [];
  await routeDevModeFalse(page);
  await openApp(page);
  await openSettingsSheet(page);

  await tapVersionRow(page, 7);

  const devGroupHidden = await page.locator("#devGroup").evaluate(el => el.classList.contains("hidden"));
  assert.equal(devGroupHidden, true, "DEV_MODE=false iken 7 tık SONRASI devGroup AÇILMAMALIYDI");

  const toastVisible = await page.locator(".toast", { hasText: "Geliştirici modu açıldı" }).count();
  assert.equal(toastVisible, 0, "DEV_MODE=false iken 'Geliştirici modu açıldı' toast'ı GÖRÜNMEMELİYDİ");

  const unlockedAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("eqEarTrainerProXDev") || "{}").unlocked);
  assert.ok(!unlockedAfter, "DEV_MODE=false iken devFlags.unlocked YAZILMAMALIYDI");

  await page.close();
});

test("KABUL KRİTERİ — DEV_MODE=false iken ESKİ bir oturumdan KALMIŞ devFlags.unlocked=true bile menüyü AÇMIYOR (sadece tap handler'ı değil, görünürlüğü de kapatıyor)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await routeDevModeFalse(page);
  // DEV_MODE=true bir TestFlight oturumundan KALMIŞ gibi simüle et.
  await openApp(page, { dev: { unlocked: true, simulatePro: true } });
  await openSettingsSheet(page);

  const devGroupHidden = await page.locator("#devGroup").evaluate(el => el.classList.contains("hidden"));
  assert.equal(devGroupHidden, true, "ESKİDEN unlocked:true olsa bile DEV_MODE=false'ta devGroup GÖRÜNMEMELİYDİ");

  await page.close();
});

test("KABUL KRİTERİ — DEV_MODE=false iken devProSwitch'e (görünürlükten bağımsız, doğrudan) tıklamak simulatePro'yu DEĞİŞTİRMİYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await routeDevModeFalse(page);
  await openApp(page, { dev: { unlocked: true, simulatePro: false } });
  await openSettingsSheet(page);

  // Buton normalde GÖRÜNMEZ (devGroup hidden) — doğrudan DOM'a erişip
  // click() tetikleyerek "görünürlüğe güvenmeyen" ikinci koruma katmanını
  // (handler'ın KENDİ DEV_MODE kontrolü) izole test ediyoruz.
  await page.evaluate(() => document.getElementById("devProSwitch").click());
  await page.waitForTimeout(150);

  const simulateProAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("eqEarTrainerProXDev") || "{}").simulatePro);
  assert.equal(simulateProAfter, false, "DEV_MODE=false iken devProSwitch tıklaması simulatePro'yu DEĞİŞTİRMEMELİYDİ");

  await page.close();
});

test("REGRESYON KORUMASI — DEV_MODE=true (repo'nun GERÇEK committed hâli) iken 7 tık ESKİSİ GİBİ çalışıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openApp(page);
  await openSettingsSheet(page);

  const hiddenBefore = await page.locator("#devGroup").evaluate(el => el.classList.contains("hidden"));
  assert.equal(hiddenBefore, true, "ön koşul: devGroup İLK BAŞTA kapalı olmalıydı");

  await tapVersionRow(page, 7);

  const hiddenAfter = await page.locator("#devGroup").evaluate(el => el.classList.contains("hidden"));
  assert.equal(hiddenAfter, false, "DEV_MODE=true iken 7 tık SONRASI devGroup AÇILMALIYDI (regresyon)");

  const toastVisible = await page.locator(".toast", { hasText: "Geliştirici modu açıldı" }).count();
  assert.equal(toastVisible, 1, "DEV_MODE=true iken 'Geliştirici modu açıldı' toast'ı GÖRÜNMELİYDİ");

  // devProSwitch de ÇALIŞMALI (regresyon).
  await page.locator("#devProSwitch").click();
  await page.waitForTimeout(150);
  const simulateProAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("eqEarTrainerProXDev") || "{}").simulatePro);
  assert.equal(simulateProAfter, true, "DEV_MODE=true iken devProSwitch ÇALIŞMALIYDI (regresyon)");

  await page.close();
});

test("REGRESYON KORUMASI — GERÇEK Pro satın alma (proPurchased) DEV_MODE=false'ta ve devFlags TAMAMEN kapalıyken de ETKİLENMİYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await routeDevModeFalse(page);
  await openApp(page); // dev:null — devFlags.unlocked/simulatePro İKİSİ de false
  // Gerçek satın alma — devFlags'ten TAMAMEN AYRI bir anahtar
  // (storage.js:savePurchase/PURCHASE_KEY), G298'in DOKUNMADIĞI yol.
  await page.evaluate(() => {
    localStorage.setItem("eqEarTrainerProXPurchase", JSON.stringify({ proPurchased: true }));
  });
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Pro-kilitli bir modun (Reverb, tier:"pro") kart görünümünde ARTIK
  // kilitli GÖRÜNMEDİĞİNİ doğrula — isUserPro()'nun realPro dalının,
  // devFlags TAMAMEN kapalıyken bile, DEV_MODE=false'ta ÇALIŞMAYA devam
  // ettiğinin somut kanıtı (G298 SADECE devFlags/7-tık yolunu kapattı,
  // satın alma yoluna DOKUNMADI).
  const reverbLocked = await page.locator('.mode-card[data-mode-id="reverb"]').evaluate(el => el.classList.contains("locked"));
  assert.equal(reverbLocked, false, "GERÇEK satın alma DEV_MODE=false'ta bile Pro kilidini AÇMALIYDI");

  await page.close();
});

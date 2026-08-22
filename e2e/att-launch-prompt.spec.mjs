// G338 (Apple Guideline 2.1 REDDİ, 21 Ağustos 2026) — ATT izni AÇILIŞTA
// sorulmalı.
//
// REDDİN KÖK SEBEBİ (OLCUM-ATT-21-08.md, kanıtlı): ATT'nin TEK tetikleyicisi
// "5 soru oyna → paywall → reklam izle butonuna dokun" zinciriydi; incelemeci
// diyaloğu bulamadı. Bu testin KORUDUĞU regresyon TAM OLARAK budur:
// uygulama açılışında, HİÇBİR kullanıcı etkileşimi olmadan ATT isteniyor mu?
//
// ⚠️ KAPSAM SINIRI: ATT diyaloğunun KENDİSİ native, Playwright göremez.
// Test edilen şey JS→native KÖPRÜ ÇAĞRISI: `window.Capacitor.Plugins.AdMob`
// sahte bir köprüyle değiştirilip (addInitScript ile app.js'ten ÖNCE
// kurulur) hangi metotların, hangi sırayla çağrıldığı kaydedilir. Diyaloğun
// GERÇEKTEN göründüğü SADECE temiz kurulumlu gerçek cihazda doğrulanabilir
// (bkz. DURUM.md — cihaz doğrulaması bekleyen maddeler).

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

// app.js'ten ÖNCE çalışır — gerçek cihazdaki Capacitor köprüsünün yerine
// çağrıları kaydeden sahte bir AdMob eklentisi kurar.
async function installFakeCapacitorBridge(page, { platform = "ios", status = "notDetermined" } = {}) {
  await page.addInitScript(({ platform, status }) => {
    const log = [];
    window.__attCalls = log;
    const record = (name) => { log.push(name); };
    window.Capacitor = {
      getPlatform: () => platform,
      isPluginAvailable: () => true,
      // G339 — projeye ait native ATT köprüsü (AudioSessionPlugin). ATT
      // isteği ARTIK buradan geçiyor; "requestTrackingAuthorization" adı
      // altında kaydediliyor ki testler hangi köprüden geçtiğinden
      // BAĞIMSIZ olarak "ATT istendi mi" sorusunu sorabilsin.
      nativePromise: async (plugin, method) => {
        record(method === "requestTrackingAuthorization" ? "requestTrackingAuthorization" : `native:${method}`);
        if (method === "requestTrackingAuthorization") return { ok: true, status: "denied" };
        return { ok: true };
      },
      Plugins: {
        AdMob: {
          initialize: async () => { record("initialize"); },
          trackingAuthorizationStatus: async () => { record("trackingAuthorizationStatus"); return { status }; },
          requestTrackingAuthorization: async () => { record("requestTrackingAuthorization"); },
          requestConsentInfo: async () => { record("requestConsentInfo"); return { canRequestAds: true, isConsentFormAvailable: false, privacyOptionsRequirementStatus: "NOT_REQUIRED" }; },
          showConsentForm: async () => { record("showConsentForm"); return { canRequestAds: true }; },
        },
      },
    };
  }, { platform, status });
}

async function openApp(page) {
  await page.goto(serverHandle.baseUrl);
  await page.waitForLoadState("networkidle");
  // Açılış ATT çağrısı bir Promise zinciri (visibility → status → request);
  // mikro-görevlerin yerleşmesi için kısa bir tur beklenir.
  await page.waitForTimeout(300);
}

test("G338 KABUL KRİTERİ: temiz açılışta, HİÇBİR etkileşim olmadan ATT izni isteniyor", async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await installFakeCapacitorBridge(page, { platform: "ios", status: "notDetermined" });
  await openApp(page);

  const calls = await page.evaluate(() => window.__attCalls);
  assert.ok(
    calls.includes("requestTrackingAuthorization"),
    `açılışta ATT İSTENMELİ (reddin kök sebebi) — çağrılanlar: ${JSON.stringify(calls)}`
  );
  await context.close();
});

test("G338: ATT açılışta istenirken AdMob SDK'sı BAŞLATILMAZ (izinden önce veri toplama riski)", async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await installFakeCapacitorBridge(page, { platform: "ios", status: "notDetermined" });
  await openApp(page);

  const calls = await page.evaluate(() => window.__attCalls);
  assert.ok(calls.includes("requestTrackingAuthorization"), "ön koşul: ATT istenmiş olmalı");
  assert.equal(
    calls.includes("initialize"), false,
    `açılışta MobileAds.start() tetiklenmemeli — çağrılanlar: ${JSON.stringify(calls)}`
  );
  await context.close();
});

test("G338: kullanıcı ZATEN cevap vermişse açılışta tekrar SORULMAZ (iOS kararı saklıyor)", async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await installFakeCapacitorBridge(page, { platform: "ios", status: "denied" });
  await openApp(page);

  const calls = await page.evaluate(() => window.__attCalls);
  assert.ok(calls.includes("trackingAuthorizationStatus"), "durum yine de SORGULANMALI");
  assert.equal(
    calls.includes("requestTrackingAuthorization"), false,
    `zaten cevaplanmışken ATT TEKRAR istenmemeli — çağrılanlar: ${JSON.stringify(calls)}`
  );
  await context.close();
});

test("G338: iOS olmayan platformda açılışta hiçbir ATT çağrısı yapılmaz", async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await installFakeCapacitorBridge(page, { platform: "android", status: "notDetermined" });
  await openApp(page);

  const calls = await page.evaluate(() => window.__attCalls);
  assert.equal(
    calls.includes("requestTrackingAuthorization"), false,
    `Android'de ATT çağrılmamalı — çağrılanlar: ${JSON.stringify(calls)}`
  );
  await context.close();
});

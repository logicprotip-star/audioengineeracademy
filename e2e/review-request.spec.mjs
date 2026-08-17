// G283 — App Store yorum isteme kararının GERÇEK runtime'da doğru
// kapılardan geçtiğini kilitler. `window.__aeaMaybeRequestStoreReviewForTest`
// (DEV_MODE-gated kanca) GERÇEK `maybeRequestStoreReview()`'ı çağırır —
// hiçbir seviye-atlama/rozet/sınav akışını GERÇEK oynanarak üretmeye GEREK
// yok, çünkü test edilen şey o üç çağrı NOKTASININ KENDİSİ DEĞİL (onlar
// SADECE bu fonksiyonu doğru koşulda çağırıyor, statik olarak doğrulandı —
// bkz. test/review-request-callsites.test.mjs), roundsAtAppLaunch/
// stats.rounds/stats.lastReviewRequestAt kapılarının GERÇEK kalıcı state
// üzerinde doğru çalıştığı.
//
// Native çağrı (requestNativeStoreReview) BİLEREK NO-OP — DEV_MODE'da
// console.warn dışında hiçbir şey yapmıyor (Capacitor'da hazır bir plugin
// yok, bkz. DURUM.md G283) — bu yüzden "gerçekten iOS diyaloğu açıldı mı"
// DEĞİL, "stats.lastReviewRequestAt güncellendi mi" (fonksiyonun GERÇEKTEN
// tetiklenip tetiklenmediğinin GÜVENİLİR yan etkisi) ölçülüyor.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

async function lastReviewRequestAt(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("eqEarTrainerProXStats") || "{}").lastReviewRequestAt);
}

async function setupAndTrigger(statsOverrides) {
  const page = await browser.newPage();
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { stats: statsOverrides });
  await page.reload();
  await page.waitForLoadState("networkidle");
  const hookAvailable = await page.evaluate(() => typeof window.__aeaMaybeRequestStoreReviewForTest === "function");
  assert.ok(hookAvailable, "ön koşul: window.__aeaMaybeRequestStoreReviewForTest bulunamadı (DEV_MODE=false olabilir)");
  await page.evaluate(() => window.__aeaMaybeRequestStoreReviewForTest());
  const result = await lastReviewRequestAt(page);
  await page.close();
  return result;
}

test("G283: olgunluk eşiğini (30 tur) AŞMIŞ, ilk oturum DEĞİL, hiç istenmemiş → tetiklenir (lastReviewRequestAt YAZILIR)", async () => {
  const result = await setupAndTrigger({ rounds: 30, lastReviewRequestAt: null });
  assert.equal(typeof result, "number", `lastReviewRequestAt yazılmalıydı, alınan: ${result}`);
});

test("G283: olgunluk eşiğinin (30) ALTINDA → TETİKLENMEZ (rounds=10, ASLA erken sorulmasın)", async () => {
  const result = await setupAndTrigger({ rounds: 10, lastReviewRequestAt: null });
  assert.equal(result, null, `10 turda TETİKLENMEMELİYDİ, alınan: ${result}`);
});

test("G283: İLK OTURUM (rounds=0, roundsAtAppLaunch=0) → TETİKLENMEZ (task'ın ASLA kuralı, olgunluk eşiği aşılsa bile — bu senaryoda zaten aşılmıyor da, madde 0 olgunluğun KENDİSİ de reddediyor)", async () => {
  const result = await setupAndTrigger({ rounds: 0, lastReviewRequestAt: null });
  assert.equal(result, null, `ilk oturumda (rounds=0) TETİKLENMEMELİYDİ, alınan: ${result}`);
});

test("G283: cooldown İÇİNDE (yakın zamanda istenmiş) → TEKRAR TETİKLENMEZ, olgunluk yeterli olsa bile", async () => {
  const recentlyRequestedAt = Date.now() - 1000; // 1 saniye önce
  const result = await setupAndTrigger({ rounds: 500, lastReviewRequestAt: recentlyRequestedAt });
  assert.equal(result, recentlyRequestedAt, `cooldown içindeyken lastReviewRequestAt DEĞİŞMEMELİYDİ (yeniden yazılmamalıydı), alınan: ${result}`);
});

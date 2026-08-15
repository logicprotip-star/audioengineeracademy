// Ortak sahne kurulumu — bu oturum boyunca scratchpad script'lerinde
// tekrar tekrar el ile yazılan localStorage-seed + mod-giriş kalıbının
// TEK, paylaşılan hâli. app.js'in KENDİSİNE dokunmuyor, sadece test
// tarafındaki tekrarı azaltıyor.

// prefs: playMode "challenge" (varsayılan) — G206/G214'ün parkur/telafi
// akışı bu moda bağlı. calibrationDone:true splash/kalibrasyon akışını
// atlar (testin odağı DEĞİL).
export async function seedLocalStorage(page, { stats = null, dev = null, playMode = "challenge", feedbackScreen = true } = {}) {
  await page.evaluate(({ stats, dev, playMode, feedbackScreen }) => {
    localStorage.clear();
    localStorage.setItem("eqEarTrainerProXPrefs", JSON.stringify({
      notifications: true, hpWarning: true, calibrationDone: true, calibrationLevel: 35,
      focusRange: "full", difficultyMode: "auto", feedbackScreen, showDailyTip: true,
      playMode,
    }));
    if (stats) localStorage.setItem("eqEarTrainerProXStats", JSON.stringify(stats));
    if (dev) localStorage.setItem("eqEarTrainerProXDev", JSON.stringify(dev));
  }, { stats, dev, playMode, feedbackScreen });
}

export async function dismissSpotlightIfShown(page) {
  const sk = page.locator("#spotlightSkip");
  if (await sk.isVisible().catch(() => false)) {
    await sk.click();
    await page.waitForTimeout(150);
  }
}

export async function enterMode(page, modeId) {
  await page.locator(`.mode-card[data-mode-id="${modeId}"]`).first().click();
  await page.waitForTimeout(250);
  await dismissSpotlightIfShown(page);
}

export async function activeScreenId(page) {
  return page.evaluate(() => document.querySelector(".screen.active")?.id || null);
}

// Telafi/sınav anons ekranı (#screen-exam) açıksa CTA'ya basıp geçer —
// g214_skip_verify.py'nin AYNI yardımcı fonksiyonu.
export async function dismissExamScreenIfShown(page) {
  const screen = await activeScreenId(page);
  if (screen !== "screen-exam") return false;
  const cta = page.locator("#exCta");
  if (await cta.isVisible().catch(() => false)) {
    await cta.click();
    await page.waitForTimeout(300);
    return true;
  }
  return false;
}

// G225 (madde 30 düzeltmesi) — cevap sonrası panel (#feedbackOverlay) bazen
// sessionLimit/livesOut paywall'ı araya girdiğinde AÇIK kalıyor
// (`teardownActiveRound()` round'u kapatır ama panel-DOM'unu kapatmaz) —
// paywall'dan dönüldüğünde panel hâlâ "open" olup #startBtn'i engelleyebilir.
// Varsa #feedbackClose ile GERÇEK kapatma yolundan (goToNextRound()) geçilir.
export async function dismissFeedbackIfShown(page) {
  const closeBtn = page.locator("#feedbackClose");
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    return true;
  }
  return false;
}

// G225 (madde 30 düzeltmesi) — reklam mock'u: headless Chromium'da gerçek
// AdMob plugin'i olmadığı için `ads.js:watchRewardedAd()` GERÇEKTEN
// başarısız olur (`getAdMobPlugin()` null). `page.route()` ile sunucudan
// gelen `ads.js` gövdesinde SADECE bu fonksiyon `{ok:true}` dönecek şekilde
// değiştiriliyor — diğer TÜM export'lar (AD_TEST_MODE/pickRewardedAdUnitId/
// getPlatform/getAdMobPlugin/showPrivacyOptions) GERÇEK dosyadaki BİREBİR
// AYNI davranışla kalıyor. `watchRewardedAd` dosyanın SON export'u (ölçüldü:
// www/js/core/ads.js 189 satır) — marker'dan itibaren TÜM gövde güvenle
// atılıp yerine tek satırlık mock geçirilebiliyor.
const ADS_MOCK_MARKER = "export async function watchRewardedAd(hooks) {";
export async function mockAdReward(page) {
  await page.route("**/js/core/ads.js", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    const idx = body.indexOf(ADS_MOCK_MARKER);
    if (idx === -1) throw new Error("ads.js mock: watchRewardedAd imzası bulunamadı, dosya değişmiş olabilir");
    const patched = body.slice(0, idx) + "export async function watchRewardedAd(hooks) { return { ok: true }; } // (mock, e2e/helpers/app-fixtures.mjs)\n";
    await route.fulfill({ response, body: patched, headers: { ...response.headers(), "content-type": "text/javascript; charset=utf-8" } });
  });
}

// Ortak sahne kurulumu — bu oturum boyunca scratchpad script'lerinde
// tekrar tekrar el ile yazılan localStorage-seed + mod-giriş kalıbının
// TEK, paylaşılan hâli. app.js'in KENDİSİNE dokunmuyor, sadece test
// tarafındaki tekrarı azaltıyor.

// prefs: playMode "challenge" (varsayılan) — G206/G214'ün parkur/telafi
// akışı bu moda bağlı. calibrationDone:true splash/kalibrasyon akışını
// atlar (testin odağı DEĞİL).
export async function seedLocalStorage(page, { stats = null, dev = null, playMode = "challenge" } = {}) {
  await page.evaluate(({ stats, dev, playMode }) => {
    localStorage.clear();
    localStorage.setItem("eqEarTrainerProXPrefs", JSON.stringify({
      notifications: true, hpWarning: true, calibrationDone: true, calibrationLevel: 35,
      focusRange: "full", difficultyMode: "auto", feedbackScreen: true, showDailyTip: true,
      playMode,
    }));
    if (stats) localStorage.setItem("eqEarTrainerProXStats", JSON.stringify(stats));
    if (dev) localStorage.setItem("eqEarTrainerProXDev", JSON.stringify(dev));
  }, { stats, dev, playMode });
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

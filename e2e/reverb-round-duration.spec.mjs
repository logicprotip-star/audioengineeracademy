// G280 — OLCUM-CIHAZ2-17-08 madde C'nin devamı (Logic'in kararı: "C şıkkına
// ulaşmadan olmaz, hata olur"). G279'un 4500ms/harf otomatik döngüsü ile
// Reverb'in EN KISA turu (boss + pro/proplus, düzeltme ÖNCESİ 8sn) C'ye HİÇ
// ulaşamıyordu (ölçüldü: C ~9.1sn'de başlıyor, 8sn'lik tur çoktan bitmiş
// oluyordu). Düzeltme: reverb.js DIFFICULTY'nin `time` alanları (SADECE bu
// alan) yükseltildi — medium/hard/pro/proplus artık 16sn (was 10-14), easy
// zaten yeterliydi (17sn), DEĞİŞMEDİ. Saf aritmetik test/reverb.test.mjs'te
// (birim testi) — BU dosya GERÇEK runtime'da (boss+pro, en kısa/en riskli
// tur) C'nin GERÇEKTEN duyulabilir süre kadar aktif kaldığını kilitliyor.
//
// difficultyMode="fixed" (Sabit) ZORUNLU — "auto" (varsayılan) moddayken
// `els.difficultySelect.value`'yu round başlangıcında sürekli eğri EZİYOR
// (ölçüldü: manuel "pro" ataması C geçişine kadar "easy"ye geri dönüyordu),
// bu da testi güvenilmez kılardı.
// isBossRound(stats.rounds) = (rounds+1)%5===0, kademe bağımsız (frekans-
// bulma.js) — stats.rounds=4 seed'i round'u DETERMİNİSTİK boss yapıyor.

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

test("G280: Reverb'in EN KISA turunda (boss+pro) C'ye otomatik döngüyle ulaşılıyor VE round C'nin tam penceresi boyunca aktif kalıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true }, stats: { rounds: 4 } });
  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem("eqEarTrainerProXPrefs") || "{}");
    prefs.difficultyMode = "fixed";
    localStorage.setItem("eqEarTrainerProXPrefs", JSON.stringify(prefs));
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "reverb");

  const hpConfirm = page.locator("#hpSheetConfirm");
  if (await hpConfirm.isVisible().catch(() => false)) {
    await hpConfirm.click();
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => {
    const sel = document.getElementById("difficultySelect");
    if (sel) sel.value = "pro";
  });

  await page.locator("#startBtn").click();
  await page.waitForTimeout(300);
  await dismissSpotlightIfShown(page);

  const isBoss = await page.evaluate(() => !document.getElementById("gameBossRow")?.classList.contains("hidden"));
  assert.ok(isBoss, "ön-koşul: bu round BOSS olmalıydı (stats.rounds=4 seed'i (4+1)%5===0 üretmeli) — değilse test hiçbir şey KANITLAMAZ");
  const tier = await page.evaluate(() => document.getElementById("difficultySelect")?.value);
  assert.equal(tier, "pro", "ön-koşul: zorluk 'pro' olmalıydı (Sabit mod + manuel atama)");

  // C'ye ulaşılana kadar bekle (A->B->C, en fazla ~10sn sürmeli).
  let letter = await page.evaluate(() => document.getElementById("abToggle")?.dataset.ab);
  const deadline = Date.now() + 11000;
  while (letter !== "C" && Date.now() < deadline) {
    await page.waitForTimeout(50);
    letter = await page.evaluate(() => document.getElementById("abToggle")?.dataset.ab);
    const stillActive = await page.evaluate(() => !document.getElementById("feedbackOverlay")?.classList.contains("open"));
    assert.ok(stillActive, "KABUL KRİTERİ İHLALİ: round, C'ye ULAŞMADAN süresi dolup bitti (düzeltme ÖNCESİ davranış — REGRESYON)");
  }
  assert.equal(letter, "C", "C'ye 11sn içinde ulaşılamadı");

  // C'ye ulaşıldı — KENDİ TAM penceresini (G279: 4500ms) alabilmesi için
  // bekle, round HÂLÂ aktif olmalı (süresi dolmamalı).
  await page.waitForTimeout(4200);
  const stillActiveAfterFullC = await page.evaluate(() => !document.getElementById("feedbackOverlay")?.classList.contains("open"));
  assert.ok(stillActiveAfterFullC, "KABUL KRİTERİ İHLALİ: C'ye ulaşıldı ama kendi TAM penceresini (4500ms) alamadan round bitti");

  await page.close();
});

test("G280: Reverb'de Kolay (easy) zorlukta (zaten yeterliydi, DEĞİŞMEDİ) C'ye otomatik döngüyle ulaşılmaya devam ediyor — regresyon YOK", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem("eqEarTrainerProXPrefs") || "{}");
    prefs.difficultyMode = "fixed";
    localStorage.setItem("eqEarTrainerProXPrefs", JSON.stringify(prefs));
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "reverb");

  const hpConfirm = page.locator("#hpSheetConfirm");
  if (await hpConfirm.isVisible().catch(() => false)) {
    await hpConfirm.click();
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => {
    const sel = document.getElementById("difficultySelect");
    if (sel) sel.value = "easy";
  });

  await page.locator("#startBtn").click();
  await page.waitForTimeout(300);
  await dismissSpotlightIfShown(page);

  let letter = await page.evaluate(() => document.getElementById("abToggle")?.dataset.ab);
  const deadline = Date.now() + 11000;
  while (letter !== "C" && Date.now() < deadline) {
    await page.waitForTimeout(50);
    letter = await page.evaluate(() => document.getElementById("abToggle")?.dataset.ab);
  }
  assert.equal(letter, "C", "C'ye 11sn içinde ulaşılamadı (easy zaten önceden de yeterliydi)");
  const stillActive = await page.evaluate(() => !document.getElementById("feedbackOverlay")?.classList.contains("open"));
  assert.ok(stillActive, "easy: C'ye ulaşıldığı anda round hâlâ aktif olmalıydı");

  await page.close();
});

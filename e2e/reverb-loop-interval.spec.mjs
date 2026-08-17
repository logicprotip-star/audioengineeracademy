// G279 — OLCUM-CIHAZ2-17-08 madde C düzeltmesi (Logic'in kararı): Reverb'in
// otomatik A/B/C döngü aralığı 2000ms → 4500ms. Kök sebep: Reverb'in Hall
// tipi 3.2sn'ye kadar decay üretiyor, sabit 2000ms'lik eski döngü kuyruğu
// HER ZAMAN kesiyordu ("A→B/B→C geçişleri çok hızlı" — cihaz raporu).
// Kompresör/Saturation (SEAMLESS_THREE_WAY_MODE_IDS) KASITLI 2000ms'de
// KALDI — onlarda "bitmesi gereken bir kuyruk" kavramı YOK (task'ın kendi
// DOKUNULMAYACAK'ı). Saf hesap core/ab-loop-timing.js'te ayrıca birim
// testli (test/ab-loop-timing.test.mjs) — BU dosya GERÇEK runtime'da
// app.js'in o hesabı doğru mod için doğru şekilde UYGULADIĞINI kilitliyor.
//
// ÖLÇÜM TEKNİĞİ — İLK geçiş DEĞİL, İKİNCİ geçiş ölçülüyor: setInterval
// startAbLoop() çağrıldığı ANDA (round başlangıcında) tiklemeye başlıyor,
// ama script'in poll/timer-yakalama başlangıcı bundan ~birkaç yüz ms SONRA
// (waitForTimeout + dismissSpotlightIfShown) geliyor — bu da İLK geçiş
// ölçümünü sistematik olarak DÜŞÜK gösteriyor (ölçüldü: Reverb'de 3957ms
// görünüyordu, gerçek 4500ms). İKİNCİ geçiş (B→C) bu kurulum gecikmesinden
// ETKİLENMİYOR, gerçek aralığı ±birkaç ms hassasiyetle veriyor.

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

async function currentAbLetter(page) {
  return page.evaluate(() => document.getElementById("abToggle")?.dataset.ab);
}

// İlk harf değişiminden (gürültülü) SONRAKİ geçişin (B→C ya da C→B, hangisi
// önce gelirse) süresini ölçer — bkz. yukarıdaki ÖLÇÜM TEKNİĞİ notu.
async function measureSecondTransitionMs(page) {
  const first = await currentAbLetter(page);
  let letter = first;
  // 1) İlk geçişi bekle (süresi ÖLÇÜLMÜYOR — kurulum gecikmesiyle kirli).
  while (letter === first) {
    await page.waitForTimeout(50);
    letter = await currentAbLetter(page);
  }
  // 2) İkinci geçişi ÖLÇ.
  const afterFirst = letter;
  const t0 = Date.now();
  while (letter === afterFirst) {
    await page.waitForTimeout(20);
    letter = await currentAbLetter(page);
  }
  return Date.now() - t0;
}

async function startLoopedRound(page, modeId) {
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, modeId);
  // kulaklikGerekli:true modlar (Reverb) round başlamadan ÖNCE bir uyarı
  // sheet'i gösterir ("Taktım" ile geçilir) — #startBtn o kapanana kadar
  // GÖRÜNMEZ (bkz. e2e/seamless-three-way.spec.mjs'nin aynı deseni).
  const hpConfirm = page.locator("#hpSheetConfirm");
  if (await hpConfirm.isVisible().catch(() => false)) {
    await hpConfirm.click();
    await page.waitForTimeout(150);
  }
  await page.locator("#startBtn").click();
  await page.waitForTimeout(600);
  await dismissSpotlightIfShown(page);
  const isLooping = await page.evaluate(() => document.getElementById("abToggle")?.classList.contains("loop"));
  if (!isLooping) {
    await page.locator("#abToggle").click();
    await page.waitForTimeout(150);
  }
}

test("G279: Reverb'de otomatik döngü aralığı ~4500 ms (eski 2000 ms'den uzatıldı)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await startLoopedRound(page, "reverb");
  const ms = await measureSecondTransitionMs(page);
  assert.ok(ms > 4000 && ms < 5200, `Reverb döngü aralığı ~4500ms bekleniyordu, ölçülen: ${ms}ms`);
  await page.close();
});

test("G279: Kompresör'de otomatik döngü aralığı ~2000 ms (DOKUNULMAYACAK — değişmedi)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await startLoopedRound(page, "kompresor");
  const ms = await measureSecondTransitionMs(page);
  assert.ok(ms > 1600 && ms < 2600, `Kompresör döngü aralığı ~2000ms bekleniyordu (Reverb'in aralığından ETKİLENMEMELİ), ölçülen: ${ms}ms`);
  await page.close();
});

test("G279: Saturation (Distortion)'da otomatik döngü aralığı ~2000 ms (DOKUNULMAYACAK — değişmedi)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await startLoopedRound(page, "distortion");
  const ms = await measureSecondTransitionMs(page);
  assert.ok(ms > 1600 && ms < 2600, `Distortion döngü aralığı ~2000ms bekleniyordu, ölçülen: ${ms}ms`);
  await page.close();
});

test("G279: Reverb'de manuel kart tıklaması otomatik döngü aralığından (4500ms) ETKİLENMİYOR — anında tepki veriyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await startLoopedRound(page, "reverb");
  await page.waitForTimeout(300);

  const before_ = await currentAbLetter(page);
  const targetLetter = before_ === "B" ? "C" : "B";
  const card = page.locator(`.ans-m2-play[data-letter="${targetLetter}"]`);
  assert.ok(await card.isVisible(), "hedef kart görünür olmalı");

  const t0 = Date.now();
  await card.click();
  await page.waitForFunction(
    (expected) => document.getElementById("abToggle")?.dataset.ab === expected,
    targetLetter,
    { timeout: 2000 }
  );
  const elapsedMs = Date.now() - t0;
  assert.ok(elapsedMs < 1500, `manuel kart tıklaması 4500ms döngü aralığına TABİ OLMAMALI, anında tepki vermeli — geçen süre: ${elapsedMs}ms`);
  await page.close();
});

// G313 (OLCUM-ILKSORUATLA-CIHAZ-19-08 — cihaz [atla-diag] logu ile
// KANITLANDI) — kullanıcı bir moda girip #startBtn'e (▶) HİÇ basmadan
// doğrudan "Atla"ya (#nextBtn, idle'da bile HER ZAMAN görünür/tıklanabilir)
// basarsa, `startRound()` "arka kapıdan" (startChallenge() ÇAĞRILMADAN)
// başlıyordu — `challenge.active` KALICI OLARAK false kalıyordu (SADECE
// #startBtn'in "!activeQuestion" dalı bunu true yapıyordu, o dal
// activeQuestion dolduktan SONRA bir daha HİÇ tetiklenmiyordu). Sonuç:
// challengeTick()'in `if (!challenge.active) return;` guard'ı HER
// cevaptan/Atla'dan SONRA sessizce no-op oluyordu — BÖLÜM sayacı/çubuğu
// KALICI OLARAK kilitleniyordu, 12 modun hepsinde. Playwright'ta İKİ ÖNCEKİ
// turda (OLCUM-CANLI-BOLUM-19-08, OLCUM-ILKSORU-ATLA-19-08) tekrar
// üretilememişti çünkü o testler HER ZAMAN önce #startBtn'e basıyordu —
// gerçek belirti tam da "Start'a HİÇ basmadan" senaryosuydu.
//
// Düzeltme: `startRound()`'un GERÇEK ilk kurulum noktasına (bu round'dan
// önce activeQuestion yoktu VE isChallenge() VE !challenge.active),
// #startBtn'in kendi mantığının AYNISI (startChallenge() çağrısı) taşındı.
// NOT (kullanıcıya soruldu, "mevcut hâliyle bırak" seçildi): İLK Atla
// tıklaması turu BAŞLATIR (tıpkı #startBtn gibi) ama SAYACI ARTIRMAZ —
// SONRAKİ Atla/cevap GERÇEK ilk skip/answer olarak sayılır. Bu,
// challenge.done ile examSystem'in parkur pozisyonunu HER ZAMAN birebir
// senkron tutar (ikisi de AYNI `roundActive && activeQuestion` kod
// yolundan geçiyor) — G214-G311'in koruduğu davranışlara sıfır risk.

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

async function chapterState(page) {
  return page.evaluate(() => ({
    label: document.getElementById("gameChapterLabel")?.textContent || null,
    dots: Array.from(document.getElementById("gameChapterDots")?.children || []).map(
      (d) => d.className.replace("game-chapter-dot", "").trim() || "empty"
    ),
    startBtnLabel: document.getElementById("startBtn")?.textContent?.trim() || null,
  }));
}

async function enterModeIdle(page, modeId) {
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true }, playMode: "challenge" });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, modeId);
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);
}

test("G313 KABUL KRİTERİ — moda gir, HİÇ CEVAP VERME, doğrudan Atla (#startBtn'e HİÇ basılmadan): kilitlenmiyor, 5 GERÇEK atlama sonrası 5 nokta doluyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterModeIdle(page, "kesim-noktasi");

  const before1 = await chapterState(page);
  assert.equal(before1.label, "BÖLÜM 1/10", "ön koşul: idle'da BÖLÜM 1/10 boş görünmeli");
  assert.equal(before1.startBtnLabel, "▶", "ön koşul: Start'a HİÇ basılmadı, ▶ (idle) göstermeli");

  // İLK Atla — #startBtn'e HİÇ basılmadan. Turu BAŞLATIR (challenge.active
  // artık true), ama kendisi SAYILMAZ (tıpkı #startBtn'e basmak gibi).
  await page.locator("#nextBtn").click();
  await page.waitForTimeout(400);
  const afterBootstrap = await chapterState(page);
  assert.equal(afterBootstrap.startBtnLabel, "⏸", "ilk Atla turu BAŞLATMALI (round aktif)");
  assert.equal(afterBootstrap.label, "BÖLÜM 1/10", "ilk Atla (bootstrap) SAYILMAMALI — hâlâ 1/10");
  assert.deepEqual(afterBootstrap.dots, Array(10).fill("empty"), "ilk Atla'dan sonra hiçbir nokta dolu OLMAMALI");

  // ŞİMDİ 5 GERÇEK Atla — HER BİRİ artık kilitlenmeden sayılmalı (KABUL
  // KRİTERİ: "5 kez arka arkaya atla → 5 nokta").
  for (let i = 1; i <= 5; i++) {
    await page.locator("#nextBtn").click();
    await page.waitForTimeout(300);
    await dismissSpotlightIfShown(page);
    const s = await chapterState(page);
    assert.equal(s.label, `BÖLÜM ${i + 1}/10`, `${i}. GERÇEK atlamadan sonra BÖLÜM ${i + 1}/10 olmalı — ölçüldü: ${s.label}`);
    assert.equal(s.dots.filter((d) => d !== "empty").length, i, `${i}. GERÇEK atlamadan sonra tam ${i} nokta dolu olmalı`);
  }

  // Sonra bir cevap ver — 6. nokta.
  const correctIndex = await page.evaluate(() => {
    const choices = window.__aeaActiveQuestionChoices ? window.__aeaActiveQuestionChoices() : null;
    return Array.isArray(choices) ? choices.findIndex((c) => c && c.correct) : -1;
  });
  await page.locator(".ans").nth(correctIndex >= 0 ? correctIndex : 0).click();
  await page.waitForTimeout(400);
  const closeBtn = page.locator("#feedbackClose");
  if (await closeBtn.isVisible().catch(() => false)) { await closeBtn.click(); await page.waitForTimeout(300); }
  const finalState = await chapterState(page);
  assert.equal(finalState.label, "BÖLÜM 7/10", `cevaptan sonra 6. nokta (BÖLÜM 7/10) olmalı — ölçüldü: ${finalState.label}`);
  assert.equal(finalState.dots.filter((d) => d !== "empty").length, 6, "cevaptan sonra tam 6 nokta dolu olmalı");

  await page.close();
});

test("G313 — 3 modda AYNI davranış (12 modun hepsini etkileyen mod-bağımsız kod yolu)", async () => {
  for (const modeId of ["db-seviyesi", "boost-mu-cut-mu", "q-genisligi"]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await enterModeIdle(page, modeId);

    await page.locator("#nextBtn").click(); // bootstrap
    await page.waitForTimeout(400);
    await page.locator("#nextBtn").click(); // 1. gerçek atlama
    await page.waitForTimeout(300);
    await dismissSpotlightIfShown(page);

    const s = await chapterState(page);
    assert.equal(s.label, "BÖLÜM 2/10", `[${modeId}] bootstrap+1 gerçek atlamadan sonra BÖLÜM 2/10 olmalı — ölçüldü: ${s.label}`);
    // G324 — Atla ARTIK "wrong" (kırmızı) DEĞİL, "skip" (beyaz) gösteriliyor
    // — sayaç/mekanik (BÖLÜM 2/10'a ilerlemesi) DEĞİŞMEDİ, SADECE bu görsel.
    assert.equal(s.dots[0], "skip", `[${modeId}] 1. nokta "skip" olmalı`);

    await page.close();
  }
});

test("G313 REGRESYON KORUMASI — ÖNCE #startBtn'e basıp SONRA Atla (normal akış) DEĞİŞMEDİ", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterModeIdle(page, "kesim-noktasi");

  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);

  const afterStart = await chapterState(page);
  assert.equal(afterStart.label, "BÖLÜM 1/10", "Start'tan sonra hâlâ 1/10 (Start kendisi SAYILMAZ, DEĞİŞMEDİ)");

  await page.locator("#nextBtn").click();
  await page.waitForTimeout(400);
  const afterAtla = await chapterState(page);
  assert.equal(afterAtla.label, "BÖLÜM 2/10", "Start+Atla sonrası BÖLÜM 2/10 — ESKİ davranışla BİREBİR AYNI");
  // G324 — Atla ARTIK "wrong" DEĞİL, "skip" (beyaz) gösteriliyor.
  assert.equal(afterAtla.dots[0], "skip");

  await page.close();
});

test("G313 REGRESYON KORUMASI — telafi akışı DEĞİŞMEDİ (telafinin ilk sorusunda Atla hâlâ çalışıyor)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enterModeIdle(page, "kesim-noktasi");

  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);

  // 10 Atla — parkur biter, remedial-start (hepsi yanlış, parkurCorrect=0<6).
  for (let i = 0; i < 10; i++) {
    await page.locator("#nextBtn").click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(200);
    await dismissSpotlightIfShown(page);
  }
  const kicker = await page.evaluate(() => document.getElementById("exKicker")?.textContent);
  assert.equal(kicker, "TELAFİ TURU", "ön koşul: telafi anons ekranına ulaşılamadı");

  await page.locator("#exCta").click();
  await page.waitForTimeout(500);

  const examProgressBefore = await page.evaluate(() => document.getElementById("gameExamProgress")?.textContent);
  assert.equal(examProgressBefore, "TELAFİ 1/5", "G310/G311 KORUNDU — telafi 1/5'te başlamalı, fantom YOK");

  await page.locator("#nextBtn").click();
  await page.waitForTimeout(400);
  const examProgressAfter = await page.evaluate(() => document.getElementById("gameExamProgress")?.textContent);
  assert.equal(examProgressAfter, "TELAFİ 2/5", "telafinin ilk sorusunda Atla HÂLÂ normal ilerliyor");

  await page.close();
});

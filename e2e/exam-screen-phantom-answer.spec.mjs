// G310 (OLCUM-ILKSORU-ATLA-19-08) — showExamScreen()'in DÖRT ctaHandler'ı
// (announce/passed/failed/makeup) `goToNextRound()`'u activeQuestion'ı
// TEMİZLEMEDEN çağırıyordu — G214'ün "aktif soru + Atla = yanlış cevap"
// kısayolu (app.js:7254-7259), CTA'ya basıldığı anda hâlâ dolu olan BİR
// ÖNCEKİ (artık geçersiz) soruyu "cevapsız bırakılıp atlandı" sanıp
// FANTOM bir yanlış cevap sayıyordu — kullanıcı HENÜZ hiçbir şeye
// basmadan. Canlı ölçüldü: telafi sayacı beklenen "TELAFİ 1/5" yerine
// kullanıcının TEK tıklamasından sonra "TELAFİ 3/5" gösteriyordu (CTA'nın
// kendi fantom cevabı + kullanıcının gerçek cevabı = 2 artış, 1 yerine).
// Düzeltme: secondaryHandler'ların ZATEN yaptığı `activeQuestion = null`
// temizliği 4 ctaHandler'a da eklendi (`goToNextRound()`'un KENDİSİNE
// DOKUNULMADI — dar/güvenli yol, KİLİT'in "goToNextRound() riskli" uyarısı
// gereği).

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

// Tek-adımlı (.ans şıklı) modlarda güvenilir doğru/yanlış cevap —
// e2e/helpers/app-fixtures.mjs:answerCorrectChoice'ın AYNI __aeaActiveQuestionChoices
// deseni, ama yanlış cevap SEÇEBİLME esnekliğiyle.
async function answerOnce(page, wantCorrect) {
  await dismissSpotlightIfShown(page);
  const correctIndex = await page.evaluate(() => {
    const choices = window.__aeaActiveQuestionChoices ? window.__aeaActiveQuestionChoices() : null;
    if (!Array.isArray(choices)) return -1;
    return choices.findIndex((c) => c && c.correct);
  });
  const ansCount = await page.locator(".ans").count();
  let idx = correctIndex;
  if (!wantCorrect && ansCount > 1) idx = correctIndex >= 0 ? (correctIndex + 1) % ansCount : 1;
  if (idx < 0) idx = 0;
  await page.locator(".ans").nth(idx).click({ timeout: 3000 });
  await page.waitForTimeout(400);
  const closeBtn = page.locator("#feedbackClose");
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await dismissSpotlightIfShown(page);
}

async function examState(page) {
  return page.evaluate(() => ({
    screen: document.querySelector(".screen.active")?.id || null,
    progress: document.getElementById("gameExamProgress")?.textContent || null,
    dots: Array.from(document.getElementById("gameExamDots")?.children || []).map(
      (d) => d.className.replace("game-exam-dot", "").trim() || "empty"
    ),
  }));
}

async function chapterState(page) {
  return page.evaluate(() => ({
    screen: document.querySelector(".screen.active")?.id || null,
    label: document.getElementById("gameChapterLabel")?.textContent || null,
    dots: Array.from(document.getElementById("gameChapterDots")?.children || []).map(
      (d) => d.className.replace("game-chapter-dot", "").trim() || "empty"
    ),
  }));
}

async function setupChallengeSession(page, modeId) {
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true }, playMode: "challenge" });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, modeId);
  await dismissHeadphoneSheetIfShown(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await dismissHeadphoneSheetIfShown(page);
  await dismissSpotlightIfShown(page);
}

// TOTAL_THRESHOLD(6)'ya TAM ulaşan, 9 GERÇEK cevaplık bir parkur deseni
// (6 doğru/3 yanlış) — 10. (SINIR) soru BİLEREK Atla İLE geçiliyor
// (aşağıdaki testlerde ayrı ayrı). ÖNEMLİ: fantom-cevap hatası SADECE
// `roundActive` HÂLÂ true İKEN (yani sınırı GERÇEK bir cevapla DEĞİL
// Atla ile geçince, bkz. app.js'in "submit handler KENDİ BAŞINDA
// roundActive=false yapar" notu) ortaya çıkıyor — bu yüzden testin
// PRECONDITION'ı bunu BİLEREK Atla ile kuruyor, yoksa test (ölçülerek
// doğrulandı) DÜZELTME OLMADAN BİLE yanlışlıkla yeşile düşüyordu.
const PARKUR_PATTERN_9_REAL = [true, true, true, false, true, true, false, false, true];

// "passed"/"failed" testleri İÇİN — parkur TAMAMEN GERÇEK cevaplarla
// geçiliyor (10/10, Atla YOK) — "announce" ekranının KENDİ CTA'sı bu
// yüzden fantom almaz, testin odağı SADECE sınav SONRASI (passed/failed)
// CTA'sında kalır. Aksi hâlde (parkur sınırı da Atla ile geçilseydi)
// DÜZELTME OLMADAN "announce" CTA'sı DA fantom alır, sınav ERKEN biter,
// "passed"/"failed" testleri kırmızıda ÖNGÖRÜLEMEZ şekilde zaman aşımına
// uğrar (ölçülerek doğrulandı — ilk denemede TAM BUNU YAPTI).
const PARKUR_PATTERN_10_REAL = [true, true, true, false, true, true, false, false, true, false];

test("G310 KABUL KRİTERİ (announce/exam-start) — CTA'ya basınca SINAV sayacı fantom cevap ALMADAN 1/4'te başlıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await setupChallengeSession(page, "kesim-noktasi");

  for (const wantCorrect of PARKUR_PATTERN_9_REAL) await answerOnce(page, wantCorrect);
  // 10. (sınır) soru — BİLEREK Atla (roundActive=true kalır, exam-start'ı tetikler).
  await page.locator("#nextBtn").click({ timeout: 3000 });
  await page.waitForTimeout(400);
  const kicker = await page.evaluate(() => document.getElementById("exKicker")?.textContent);
  assert.equal(kicker, "SINAV HAKKI", "ön koşul: sınav anons ekranına ulaşılamadı");

  await page.locator("#exCta").click();
  await page.waitForTimeout(500);

  const state = await examState(page);
  assert.equal(state.screen, "screen-game", "CTA sonrası screen-game'e geçmeli");
  assert.equal(state.progress, "SINAV 1/4", `DÜZELTME ÖNCESİ: fantom cevap yüzünden "SINAV 1/4" DEĞİL daha ileri bir sayı gösterirdi — ölçüldü: ${state.progress}`);
  assert.deepEqual(state.dots, ["empty", "empty", "empty", "empty"], "hiçbir tıklama yapılmadan HİÇBİR nokta dolu olmamalı");

  await page.close();
});

test("G310 KABUL KRİTERİ (makeup/telafi) — CTA'ya basınca TELAFİ sayacı fantom cevap ALMADAN 1/5'te başlıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await setupChallengeSession(page, "kesim-noktasi");

  // 10 Atla — hepsi yanlış sayılır (G214), parkurCorrect=0<6 → remedial-start GARANTİ.
  for (let i = 0; i < 10; i++) {
    await page.locator("#nextBtn").click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(200);
    await dismissSpotlightIfShown(page);
  }
  const kicker = await page.evaluate(() => document.getElementById("exKicker")?.textContent);
  assert.equal(kicker, "TELAFİ TURU", "ön koşul: telafi anons ekranına ulaşılamadı");

  await page.locator("#exCta").click();
  await page.waitForTimeout(500);

  const state = await examState(page);
  assert.equal(state.screen, "screen-game", "CTA sonrası screen-game'e geçmeli");
  assert.equal(state.progress, "TELAFİ 1/5", `DÜZELTME ÖNCESİ (git stash ile doğrulandı): "TELAFİ 3/5" çıkıyordu — ölçüldü: ${state.progress}`);
  assert.deepEqual(state.dots, ["empty", "empty", "empty", "empty", "empty"], "hiçbir tıklama yapılmadan HİÇBİR nokta dolu olmamalı");

  await page.close();
});

test("G310 KABUL KRİTERİ (passed) — sınav geçilince CTA'ya basınca BÖLÜM sayacı fantom cevap ALMADAN 1/10'da başlıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await setupChallengeSession(page, "kesim-noktasi");

  for (const wantCorrect of PARKUR_PATTERN_10_REAL) await answerOnce(page, wantCorrect);
  await page.locator("#exCta").click(); // "Sınava başla"
  await page.waitForTimeout(300);

  // EXAM_PASS_COUNT(3)/EXAM_LENGTH(4) — 3 GERÇEK doğru yeter (geçer), 4.
  // (sınır) soru BİLEREK Atla — "passed" CTA'sının fantom-cevap koşulunu kurar.
  await answerOnce(page, true);
  await answerOnce(page, true);
  await answerOnce(page, true);
  await page.locator("#nextBtn").click({ timeout: 3000 });
  await page.waitForTimeout(400);
  const kicker = await page.evaluate(() => document.getElementById("exKicker")?.textContent);
  assert.equal(kicker, "SINAV GEÇİLDİ", "ön koşul: sınav geçildi ekranına ulaşılamadı");

  await page.locator("#exCta").click(); // "Devam"
  await page.waitForTimeout(500);

  // NOT: CTA sonrası İLK soru şansla bir "boss" round'a denk gelebilir
  // (mode.isBossRound(stats.rounds), her 5 turda bir — showChapter'ı AYRICA
  // false yapar, BÖLÜM satırı o TEK turda gizlenir, kod TARAFINDAN NORMAL/
  // kasıtlı). Bu yüzden KABUL KRİTERİ, boss'tan BAĞIMSIZ olsun diye,
  // CTA'dan sonraki İLK GERÇEK cevaptan SONRA "tam 1 artış" oldu mu diye
  // bakıyor — fantom bir cevap varsa bu "BÖLÜM 3/10 (2 nokta)" çıkardı,
  // yoksa "BÖLÜM 2/10 (1 nokta)" çıkar.
  await answerOnce(page, true);
  const state = await chapterState(page);
  assert.equal(state.screen, "screen-game", "CTA sonrası screen-game'e geçmeli");
  assert.equal(state.label, "BÖLÜM 2/10", `DÜZELTME ÖNCESİ: CTA'nın fantom cevabı + bu GERÇEK cevap = 2 artış (BÖLÜM 3/10) çıkardı — ölçüldü: ${state.label}`);
  assert.equal(state.dots.filter((d) => d !== "empty").length, 1, `tam 1 GERÇEK cevap verildi, tam 1 nokta dolu olmalı — ölçüldü: ${JSON.stringify(state.dots)}`);

  await page.close();
});

test("G310 KABUL KRİTERİ (failed) — sınav geçilemeyince CTA'ya basınca BÖLÜM sayacı fantom cevap ALMADAN 1/10'da başlıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await setupChallengeSession(page, "kesim-noktasi");

  for (const wantCorrect of PARKUR_PATTERN_10_REAL) await answerOnce(page, wantCorrect);
  await page.locator("#exCta").click(); // "Sınava başla"
  await page.waitForTimeout(300);

  // 4'ü de Atla — hepsi yanlış sayılır (EXAM_PASS_COUNT=3 tutturulamaz,
  // exam-failed GARANTİ), SON soru da Atla olduğu için fantom-cevap
  // koşulunu ("failed" CTA'sı) doğru kurar.
  for (let i = 0; i < 4; i++) {
    await page.locator("#nextBtn").click({ timeout: 3000 });
    await page.waitForTimeout(300);
  }
  const kicker = await page.evaluate(() => document.getElementById("exKicker")?.textContent);
  assert.equal(kicker, "SINAV GEÇİLEMEDİ", "ön koşul: sınav geçilemedi ekranına ulaşılamadı");

  await page.locator("#exCta").click(); // "Devam Et"
  await page.waitForTimeout(500);

  // NOT: bkz. "passed" testindeki AYNI boss-round notu — CTA'dan sonraki
  // İLK GERÇEK cevaptan sonra "tam 1 artış" kontrolü.
  await answerOnce(page, true);
  const state = await chapterState(page);
  assert.equal(state.screen, "screen-game", "CTA sonrası screen-game'e geçmeli");
  assert.equal(state.label, "BÖLÜM 2/10", `DÜZELTME ÖNCESİ: CTA'nın fantom cevabı + bu GERÇEK cevap = 2 artış (BÖLÜM 3/10) çıkardı — ölçüldü: ${state.label}`);
  assert.equal(state.dots.filter((d) => d !== "empty").length, 1, `tam 1 GERÇEK cevap verildi, tam 1 nokta dolu olmalı — ölçüldü: ${JSON.stringify(state.dots)}`);

  await page.close();
});

test("G310 REGRESYON KORUMASI — GERÇEK 'Atla' hâlâ yanlış cevap sayıyor (G214 BOZULMADI)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await setupChallengeSession(page, "kesim-noktasi");

  const before = await chapterState(page);
  assert.equal(before.label, "BÖLÜM 1/10");

  await page.locator("#nextBtn").click({ timeout: 3000 });
  await page.waitForTimeout(400);

  const after = await chapterState(page);
  assert.equal(after.label, "BÖLÜM 2/10", "gerçek Atla HÂLÂ ilerleme sayacını artırmalı (G214 davranışı korunmalı)");
  assert.equal(after.dots[0], "wrong", "gerçek Atla HÂLÂ yanlış cevap olarak işaretlenmeli (G214 davranışı korunmalı)");

  await page.close();
});

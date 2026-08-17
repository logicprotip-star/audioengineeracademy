// G285 — cevap geçmişi kaydının GERÇEK runtime'da 12 modun HEPSİNDE
// oluştuğunu kilitler (KABUL KRİTERİ: "12 modda cevap verilince kayıt
// oluşuyor, her mod için test"). `window.__aeaSubmitAnswerForTest`
// (DEV_MODE kancası, app.js) aktif sorunun DOĞRU cevabını hesaplayıp
// GERÇEK submit fonksiyonunu çağırır — Frekans Bulma'nın serbest-tıklama
// canvas'ı/Tonal Denge'nin sürükleme-çubukları gibi e2e'de GÜVENİLİR
// biçimde SÜRÜKLENMESİ/TIKLANMASI zor akışları atlamak için (round GERÇEK
// #startBtn ile başlar, GERÇEK activeQuestion/roundFlow durumuyla çalışır
// — SADECE son DOM-tıklama adımı atlanıyor).

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

async function answerHistoryBlob(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("eqEarTrainerProXAnswerHistory") || "null"));
}

// kulaklikGerekli:true olan 5 mod (mode-catalog.js) — #hpSheetConfirm
// kapatılmadan #startBtn tıklanamaz (bkz. e2e/seamless-three-way.spec.mjs
// ve e2e/reverb-round-duration.spec.mjs'nin AYNI deseni).
const HEADPHONE_MODES = new Set(["stereo-genislik", "pan-konumu", "reverb", "tonal-denge", "frekans-cakismasi"]);

async function playOneRoundAndSubmit(page, modeId) {
  await enterMode(page, modeId);
  if (HEADPHONE_MODES.has(modeId)) {
    const hpConfirm = page.locator("#hpSheetConfirm");
    if (await hpConfirm.isVisible().catch(() => false)) {
      await hpConfirm.click();
      await page.waitForTimeout(150);
    }
  }
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissSpotlightIfShown(page);
  const hookAvailable = await page.evaluate(() => typeof window.__aeaSubmitAnswerForTest === "function");
  assert.ok(hookAvailable, "ön koşul: window.__aeaSubmitAnswerForTest bulunamadı (DEV_MODE=false olabilir)");
  const submitted = await page.evaluate(() => window.__aeaSubmitAnswerForTest());
  assert.ok(submitted, `${modeId}: __aeaSubmitAnswerForTest false döndü (q.mode tanınmadı)`);
  await page.waitForTimeout(400);
}

const ALL_MODE_IDS = [
  "frekans-bulma", "kesim-noktasi", "db-seviyesi", "boost-mu-cut-mu", "q-genisligi",
  "kompresor", "reverb", "distortion", "tonal-denge", "frekans-cakismasi",
  "pan-konumu", "stereo-genislik",
];

for (const modeId of ALL_MODE_IDS) {
  test(`G285: ${modeId} — cevap verilince answerHistory'ye DOĞRU kayıt eklenir`, async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(serverHandle.baseUrl);
    await seedLocalStorage(page, { dev: { simulatePro: true } });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const before_ = await answerHistoryBlob(page);
    assert.equal(before_, null, "ön koşul: taze kurulumda answerHistory hiç yazılmamış olmalı");

    await playOneRoundAndSubmit(page, modeId);

    const after_ = await answerHistoryBlob(page);
    assert.ok(after_, "answerHistory yazılmış olmalı");
    assert.equal(after_.records.length, 1, `TAM 1 kayıt olmalı, alınan: ${after_.records.length}`);
    const rec = after_.records[0];
    assert.equal(rec.modeId, modeId, `modeId "${modeId}" olmalı, alınan: "${rec.modeId}"`);
    assert.equal(rec.correct, true, "DOĞRU cevap gönderildi, correct=true olmalı");
    assert.ok(typeof rec.timestamp === "number" && rec.timestamp > 0, "timestamp sayı ve pozitif olmalı");
    assert.ok(typeof rec.difficulty === "string" && rec.difficulty.length > 0, "difficulty string olmalı");
    assert.ok(typeof rec.timeSpentSec === "number" && rec.timeSpentSec >= 0, "timeSpentSec sayı ve negatif olmayan olmalı");
    assert.ok(rec.params && typeof rec.params === "object" && Object.keys(rec.params).length > 0, "params dolu olmalı");

    await page.close();
  });
}

test("G285: MEVCUT depolar (session.log/stats.history/zoneStats) cevap geçmişi eklenince BOZULMADI", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");

  const statsBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("eqEarTrainerProXStats")));
  const roundsBefore = statsBefore.rounds;

  await playOneRoundAndSubmit(page, "kesim-noktasi");

  const statsAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("eqEarTrainerProXStats")));
  assert.equal(statsAfter.rounds, roundsBefore + 1, "stats.rounds NORMAL şekilde artmalı — cevap geçmişi eklemesi MEVCUT sayaçları BOZMAMALI");
  assert.equal(statsAfter.correct, statsBefore.correct + 1, "stats.correct NORMAL şekilde artmalı");
  assert.ok(Array.isArray(statsAfter.history) && statsAfter.history.length > 0, "stats.history HÂLÂ yazılıyor (session.log/history'ye DOKUNULMADI)");

  const zoneStatsAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("fa_zonestats") || "{}"));
  assert.ok(Object.keys(zoneStatsAfter).length > 0, "zoneStats HÂLÂ yazılıyor (dokunulmadı)");

  await page.close();
});

test("G285: 200 sınırı GERÇEK runtime'da çalışıyor — 201. cevaptan sonra EN ESKİ kayıt silinir", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  // 200 SAHTE (ama şekli geçerli) kayıtla seed edip TEK bir GERÇEK cevap
  // daha veriyoruz — 201 kez GERÇEK round oynamak bu testi dakikalarca
  // sürdürürdü, sınır mantığı zaten test/answer-history.test.mjs'te
  // (birim testi) ayrıntılı doğrulandı — BURADA SADECE gerçek app.js'in
  // bu sınırı GERÇEKTEN UYGULADIĞI (200'ü aşan bir seed'le başlayınca
  // BİR SONRAKİ GERÇEK yazışta kırpma oluyor mu) kilitleniyor.
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.evaluate(() => {
    const records = [];
    for (let i = 0; i < 200; i++) {
      records.push({ modeId: "kesim-noktasi", timestamp: 1000 + i, difficulty: "easy", timeSpentSec: 1, correct: true, params: { seedIndex: i } });
    }
    localStorage.setItem("eqEarTrainerProXAnswerHistory", JSON.stringify({ schemaVersion: 1, records }));
  });
  await page.reload();
  await page.waitForLoadState("networkidle");

  await playOneRoundAndSubmit(page, "db-seviyesi");

  const after_ = await answerHistoryBlob(page);
  assert.equal(after_.records.length, 200, "200 sınırı AŞILMAMALI");
  assert.equal(after_.records[0].params.seedIndex, 1, "EN ESKİ (seedIndex=0) kayıt SİLİNMELİ");
  assert.equal(after_.records[after_.records.length - 1].modeId, "db-seviyesi", "YENİ cevap sonda olmalı");

  await page.close();
});

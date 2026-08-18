// G289 (OLCUM-XP-17-08.md'nin bulduğu sorun) — günlük görevlerin ilerlemesi
// artık ÖMÜR BOYU stats.rounds/correct/bestCombo'dan DEĞİL, GÜNE ÖZGÜ
// daily.dailyRounds/dailyCorrect/dailyBestCombo'dan okunuyor + gün
// değiştiğinde önceki günün özeti eqEarTrainerProXDailyLog'a arşivleniyor.
// GERÇEK runtime'da (Chromium) doğrulanıyor.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, dismissSpotlightIfShown, answerCorrectChoice } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

async function readLocalStorageJson(page, key) {
  return page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  }, key);
}

test("KABUL KRİTERİ — ömür boyu istatistikler ZATEN hedefleri aşmışken, YENİ günün İLK cevabı görevleri ANINDA tamamlamıyor (asıl bug)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  // Ömür boyu istatistikler ÜÇ hedefi de ZATEN aşıyor (5 tur/3 doğru/2 combo) —
  // DÜZELTME ÖNCESİ bu tek başına üç görevi de anında tamamlatırdı.
  await seedLocalStorage(page, { stats: { rounds: 100, correct: 80, bestCombo: 15 }, dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Ön koşul: bugün için HİÇ eqEarTrainerProXDaily kaydı yok (freshDaily()
  // devreye giriyor, dailyRounds/dailyCorrect/dailyBestCombo hepsi 0'dan başlıyor).
  const beforeDaily = await readLocalStorageJson(page, "eqEarTrainerProXDaily");
  assert.equal(beforeDaily, null, "ön koşul: bugün için daily kaydı olmamalıydı");

  await enterMode(page, "kesim-noktasi");
  await dismissSpotlightIfShown(page);
  const hpConfirm = page.locator("#hpSheetConfirm");
  if (await hpConfirm.isVisible().catch(() => false)) { await hpConfirm.click(); await page.waitForTimeout(150); }
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissSpotlightIfShown(page);
  await answerCorrectChoice(page);

  const daily = await readLocalStorageJson(page, "eqEarTrainerProXDaily");
  assert.ok(daily, "round sonrası eqEarTrainerProXDaily yazılmış olmalı");
  assert.equal(daily.dailyRounds, 1, "GÜNE özgü tur sayacı 1 olmalı (ömür boyu 100'den DEĞİL)");
  assert.equal(daily.dailyCorrect, 1, "GÜNE özgü doğru sayacı 1 olmalı (ömür boyu 80'den DEĞİL)");

  const d1 = daily.tasks.find(t => t.id === "d1"); // 5 tur oyna
  const d2 = daily.tasks.find(t => t.id === "d2"); // 3 doğru yap
  assert.equal(d1.value, 1, "'5 tur oyna' görevi 1/5 göstermeli, ANINDA tamamlanmamalı");
  assert.equal(d1.claimed, false, "'5 tur oyna' HENÜZ tamamlanmamalı");
  assert.equal(d2.value, 1, "'3 doğru yap' görevi 1/3 göstermeli, ANINDA tamamlanmamalı");
  assert.equal(d2.claimed, false, "'3 doğru yap' HENÜZ tamamlanmamalı");

  // Ömür boyu istatistikler BOZULMADI (hâlâ ayrı, hâlâ yüksek) — DOKUNULMAYACAK.
  const stats = await readLocalStorageJson(page, "eqEarTrainerProXStats");
  assert.equal(stats.rounds, 101, "ömür boyu stats.rounds normal şekilde artmaya devam etmeli");
  assert.equal(stats.correct, 81);

  await page.close();
});

test("KABUL KRİTERİ — gün değişince görevler sıfırlanıyor VE önceki günün özeti eqEarTrainerProXDailyLog'a arşivleniyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, {});
  // DÜN'e ait (bugünden FARKLI bir dailyKey()) bir daily kaydı elle yerleştiriliyor —
  // gün değişimini simüle etmek için.
  await page.evaluate(() => {
    localStorage.setItem("eqEarTrainerProXDaily", JSON.stringify({
      key: "2000-1-1",
      tasks: [
        { id: "d1", title: "5 tur oyna", desc: "Bugün 5 tur tamamla.", target: 5, value: 5, reward: 40, claimed: true },
        { id: "d2", title: "3 doğru yap", desc: "Bugün 3 doğru cevap ver.", target: 3, value: 3, reward: 50, claimed: true },
        { id: "d3", title: "2 combo yap", desc: "En az 2'lik combo kur.", target: 2, value: 2, reward: 35, claimed: true }
      ],
      tipDismissed: true,
      dailyRounds: 7,
      dailyCorrect: 5,
      dailyBestCombo: 4,
      dailyXp: 233
    }));
  });
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Dünün özeti arşivlenmiş olmalı — bu, app.js açılışında (storage.loadDaily()'DEN
  // ÖNCE) KOŞULSUZ yazılıyor, kullanıcı hiçbir şey yapmadan.
  const log = await readLocalStorageJson(page, "eqEarTrainerProXDailyLog");
  assert.ok(log, "eqEarTrainerProXDailyLog yazılmış olmalı");
  assert.equal(typeof log.schemaVersion, "number", "G233 şema sürüm damgası uygulanmalı");
  assert.ok(Array.isArray(log.records) && log.records.length >= 1);
  const archived = log.records[log.records.length - 1];
  assert.deepEqual(archived, { date: "2000-1-1", rounds: 7, correct: 5, bestCombo: 4, questions: 7, xp: 233 });

  // Canlı (bellek-içi) daily SIFIRLANMIŞ olmalı — bu SADECE bir round oynanınca
  // (persistDaily()'nin çağrıldığı an) localStorage'a yazılıyor, o yüzden bir
  // tur oynayıp KANITLIYORUZ (raw localStorage okuması ÖNCESİ hâlâ dünün
  // değerini gösterirdi, reset bellekte olur, storage.js:persistDaily()
  // TETİKLENENE kadar diske yazılmaz — bu KENDİSİ bir bug DEĞİL, mevcut
  // stats/zoneStats/answerHistory'nin AYNI "açılışta yükle, olayda kaydet"
  // deseni).
  await enterMode(page, "kesim-noktasi");
  await dismissSpotlightIfShown(page);
  const hpConfirm = page.locator("#hpSheetConfirm");
  if (await hpConfirm.isVisible().catch(() => false)) { await hpConfirm.click(); await page.waitForTimeout(150); }
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissSpotlightIfShown(page);
  await answerCorrectChoice(page);

  const daily = await readLocalStorageJson(page, "eqEarTrainerProXDaily");
  assert.notEqual(daily.key, "2000-1-1", "gün değişmiş olmalı");
  assert.equal(daily.dailyRounds, 1, "yeni günün sayacı SIFIRDAN başlayıp 1 olmalı (7'den DEVAM ETMEMELİ)");
  assert.equal(daily.dailyCorrect, 1);
  assert.equal(daily.tasks.every(t => !t.claimed), true, "yeni günün görevleri claimed=false olmalı (dünün claimed=true'su TAŞINMAMALI)");

  await page.close();
});

test("REGRESYON KORUMASI — bugüne ait bir daily kaydı VARSA (gün DEĞİŞMEMİŞ), arşivlenmiyor, sayaçlar KORUNUYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, {});
  const todayKey = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  });
  await page.evaluate((key) => {
    localStorage.setItem("eqEarTrainerProXDaily", JSON.stringify({
      key,
      tasks: [
        { id: "d1", title: "5 tur oyna", desc: "Bugün 5 tur tamamla.", target: 5, value: 2, reward: 40, claimed: false },
        { id: "d2", title: "3 doğru yap", desc: "Bugün 3 doğru cevap ver.", target: 3, value: 1, reward: 50, claimed: false },
        { id: "d3", title: "2 combo yap", desc: "En az 2'lik combo kur.", target: 2, value: 1, reward: 35, claimed: false }
      ],
      tipDismissed: false,
      dailyRounds: 2,
      dailyCorrect: 1,
      dailyBestCombo: 1,
      dailyXp: 20
    }));
  }, todayKey);
  await page.reload();
  await page.waitForLoadState("networkidle");

  const daily = await readLocalStorageJson(page, "eqEarTrainerProXDaily");
  assert.equal(daily.dailyRounds, 2, "bugüne ait sayaçlar KORUNMALI, sıfırlanmamalı");
  assert.equal(daily.dailyXp, 20);

  const log = await readLocalStorageJson(page, "eqEarTrainerProXDailyLog");
  assert.equal(log, null, "gün DEĞİŞMEDİYSE arşivleme YAPILMAMALI");

  await page.close();
});

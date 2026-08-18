// G289 — core/daily-log.js SAF fonksiyonları. test/answer-history.test.mjs'in
// appendAnswerRecord() describe'ıyla BİREBİR AYNI iskelet (DAILY_LOG_LIMIT=365
// dışında).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDailySummaryRecord, appendDailyLogRecord, DAILY_LOG_LIMIT } from "../www/js/core/daily-log.js";

describe("buildDailySummaryRecord() — storage.js:freshDaily() şeklindeki bir objeden özet üretir", () => {
  it("tüm 5 alanı (date/rounds/correct/bestCombo/questions/xp) doğru taşır", () => {
    const daily = { key: "2026-8-17", dailyRounds: 8, dailyCorrect: 6, dailyBestCombo: 4, dailyXp: 210 };
    assert.deepEqual(buildDailySummaryRecord(daily), {
      date: "2026-8-17", rounds: 8, correct: 6, bestCombo: 4, questions: 8, xp: 210
    });
  });

  it("questions ALANI rounds İLE AYNI DEĞERİ taşır (bu kod tabanında 1 tur=1 soru, ayrı bir sayaç YOK)", () => {
    const daily = { key: "2026-8-18", dailyRounds: 12, dailyCorrect: 9, dailyBestCombo: 5, dailyXp: 300 };
    const record = buildDailySummaryRecord(daily);
    assert.equal(record.questions, record.rounds);
  });

  it("eksik/undefined alanlar 0'a düşer, çökmez", () => {
    assert.deepEqual(buildDailySummaryRecord({ key: "2026-8-19" }), {
      date: "2026-8-19", rounds: 0, correct: 0, bestCombo: 0, questions: 0, xp: 0
    });
  });

  it("null/undefined daily ile çağrılırsa çökmeden date:null, hepsi 0 döner", () => {
    assert.deepEqual(buildDailySummaryRecord(null), { date: null, rounds: 0, correct: 0, bestCombo: 0, questions: 0, xp: 0 });
    assert.deepEqual(buildDailySummaryRecord(undefined), { date: null, rounds: 0, correct: 0, bestCombo: 0, questions: 0, xp: 0 });
  });
});

describe("appendDailyLogRecord() — 365 gün sınırı ve FIFO", () => {
  it("sınırın altındayken sadece ekler, hiçbir şey silmez", () => {
    const records = [{ date: "2026-8-15" }, { date: "2026-8-16" }];
    const next = appendDailyLogRecord(records, { date: "2026-8-17" }, 365);
    assert.equal(next.length, 3);
    assert.deepEqual(next, [{ date: "2026-8-15" }, { date: "2026-8-16" }, { date: "2026-8-17" }]);
  });

  it("orijinal diziyi MUTASYONA UĞRATMAZ (saf fonksiyon)", () => {
    const records = [{ date: "2026-8-15" }];
    const next = appendDailyLogRecord(records, { date: "2026-8-16" }, 365);
    assert.equal(records.length, 1, "orijinal dizi değişmemeli");
    assert.notEqual(next, records, "YENİ bir dizi dönmeli");
  });

  it("KABUL KRİTERİ — 365 gün sınırı: 366. kayıt eklenince EN ESKİ (dizinin başı) silinir", () => {
    let records = [];
    for (let i = 0; i < 365; i++) records = appendDailyLogRecord(records, { i }, 365);
    assert.equal(records.length, 365);
    assert.equal(records[0].i, 0, "ön koşul: ilk kayıt hâlâ 0");

    records = appendDailyLogRecord(records, { i: 365 }, 365);
    assert.equal(records.length, 365, "sınır AŞILMAMALI");
    assert.equal(records[0].i, 1, "EN ESKİ kayıt (i=0) SİLİNMELİ");
    assert.equal(records[records.length - 1].i, 365, "YENİ kayıt sonda olmalı");
  });

  it("varsayılan sınır DAILY_LOG_LIMIT=365", () => {
    assert.equal(DAILY_LOG_LIMIT, 365);
    let records = [];
    for (let i = 0; i < 370; i++) records = appendDailyLogRecord(records, { i });
    assert.equal(records.length, 365);
    assert.equal(records[0].i, 5);
  });
});

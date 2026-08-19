// G285 — cevap geçmişi kayıt formatı (1.1'in "Son Oyunlarım" replay listesi
// İÇİN, bkz. core/answer-history.js dosya başı notu). SAF fonksiyonlar test
// ediliyor — buildAnswerRecord'un 12 mod dalı (frekans-bulma İKİ questionType
// taşıyor: frequency+proplus) + appendAnswerRecord'un 200 sınırı/FIFO'su.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAnswerRecord, appendAnswerRecord, ANSWER_HISTORY_LIMIT } from "../www/js/core/answer-history.js";

describe("buildAnswerRecord() — ortak alanlar (mod bağımsız)", () => {
  it("modeId/timestamp/difficulty/timeSpentSec/correct doğru taşınır", () => {
    const q = { difficulty: "hard", freq: 500, source: "pink" };
    const result = { correct: true, guessHz: 505 };
    const rec = buildAnswerRecord("frekans-bulma", q, 505, result, { timeSpentSec: 3.2, timestamp: 123456 });
    assert.equal(rec.modeId, "frekans-bulma");
    assert.equal(rec.timestamp, 123456);
    assert.equal(rec.difficulty, "hard");
    assert.equal(rec.timeSpentSec, 3.2);
    assert.equal(rec.correct, true);
  });

  it("timestamp verilmezse Date.now() kullanılır", () => {
    const before = Date.now();
    const rec = buildAnswerRecord("frekans-bulma", { difficulty: "easy" }, 100, { correct: false });
    const after = Date.now();
    assert.ok(rec.timestamp >= before && rec.timestamp <= after);
  });

  it("timeSpentSec negatifse 0'a kırpılır (roundFlow'un ölçüm hatası ASLA negatif süre üretmemeli)", () => {
    const rec = buildAnswerRecord("frekans-bulma", { difficulty: "easy" }, 100, { correct: true }, { timeSpentSec: -5 });
    assert.equal(rec.timeSpentSec, 0);
  });

  it("timeSpentSec sonlu değilse null (yanlış bir sayı UYDURULMAZ)", () => {
    const rec = buildAnswerRecord("frekans-bulma", { difficulty: "easy" }, 100, { correct: true }, { timeSpentSec: NaN });
    assert.equal(rec.timeSpentSec, null);
  });
});

// G326 (OLCUM-ATLA-KAYIT-19-08) — "Atla" ile geçilen (cevapsız) sorular
// ARTIK kaydediliyor: extra.skipped:true, answer/result YOK (null). KABUL
// KRİTERİ: skipped alanı doğru yazılır, correct HÂLÂ false, doğru cevap
// (params.correctAnswer) result'a değil q'ya bağımlı olduğu için YİNE DE
// dolu, eski kayıtlar (skipped alanı OLMAYAN) güvenle "atlanmadı" okunur.
describe("buildAnswerRecord() — G326: skipped (Atla kaydı)", () => {
  it("extra.skipped:true → rec.skipped=true, rec.correct=false (result yok)", () => {
    const q = { difficulty: "hard", freq: 500, source: "pink" };
    const rec = buildAnswerRecord("frekans-bulma", q, null, null, { timeSpentSec: 2, skipped: true });
    assert.equal(rec.skipped, true);
    assert.equal(rec.correct, false);
  });

  it("extra.skipped VERİLMEZSE rec.skipped=false (11 gerçek submit handler'ın davranışı DEĞİŞMEDİ)", () => {
    const rec = buildAnswerRecord("frekans-bulma", { difficulty: "easy" }, 100, { correct: true });
    assert.equal(rec.skipped, false);
  });

  it("atlanan soruda doğru cevap (params.correctAnswer) YİNE DE dolu — result=null olsa BİLE q'dan türetiliyor", () => {
    const q = { difficulty: "hard", freq: 500, source: "pink", filterType: "lowpass" };
    const rec = buildAnswerRecord("kesim-noktasi", q, null, null, { skipped: true });
    assert.deepEqual(rec.params.correctAnswer, { freq: 500, filterType: "lowpass" });
    assert.equal(rec.params.guessFreq, null, "atlanan soruda GERÇEK bir tahmin OLMAMALI");
  });

  it("eski kayıtlarda (skipped alanı hiç YAZILMAMIŞ) okuma güvenli — undefined 'atlanmadı' gibi davranır", () => {
    const eskiKayit = { modeId: "frekans-bulma", correct: true, params: {} }; // G326 ÖNCESİ şekil
    assert.equal(!!eskiKayit.skipped, false);
  });
});

describe("buildAnswerRecord() — mod bazında params (12 mod, 12 dal)", () => {
  it("frekans-bulma (frequency): freq/gain/q/filterType/source/guessHz/correctAnswer", () => {
    const q = { mode: "frequency", difficulty: "medium", freq: 1000, gain: 6, q: 1.4, filterType: "peaking", source: "pink" };
    const result = { correct: true, guessHz: 1020 };
    const rec = buildAnswerRecord("frekans-bulma", q, 1020, result);
    assert.deepEqual(rec.params, {
      questionType: "frequency", source: "pink", freq: 1000, gain: 6, q: 1.4,
      filterType: "peaking", guessHz: 1020, correctAnswer: 1000,
    });
  });

  it("frekans-bulma (proplus): bands (freq/gain/q'ya kırpılmış) + hit/bandCount", () => {
    const q = { mode: "proplus", difficulty: "pro", source: "white", bands: [{ freq: 100, gain: 4, q: 3.2, matched: true, extra: "atılmalı" }] };
    const result = { correct: true, hit: 3, bandCount: 4 };
    const rec = buildAnswerRecord("frekans-bulma", q, [100], result);
    assert.equal(rec.params.questionType, "proplus");
    assert.deepEqual(rec.params.bands, [{ freq: 100, gain: 4, q: 3.2 }]);
    assert.equal(rec.params.hit, 3);
    assert.equal(rec.params.bandCount, 4);
  });

  it("kesim-noktasi: freq/filterType/guessFreq/guessType/correctAnswer", () => {
    const q = { difficulty: "easy", freq: 2000, filterType: "highpass", source: "snare" };
    const result = { correct: false, guessFreq: 1800, guessType: "highpass" };
    const rec = buildAnswerRecord("kesim-noktasi", q, { freq: 1800, filterType: "highpass" }, result);
    assert.deepEqual(rec.params, {
      source: "snare", freq: 2000, filterType: "highpass",
      guessFreq: 1800, guessType: "highpass",
      correctAnswer: { freq: 2000, filterType: "highpass" },
    });
  });

  it("db-seviyesi: dbDelta/guessValue/correctAnswer", () => {
    const q = { difficulty: "medium", dbDelta: -4.5, source: "groove" };
    const result = { correct: true, guessValue: -4.2 };
    const rec = buildAnswerRecord("db-seviyesi", q, -4.2, result);
    assert.deepEqual(rec.params, { source: "groove", dbDelta: -4.5, guessValue: -4.2, correctAnswer: -4.5 });
  });

  it("boost-mu-cut-mu: layer/freq/gainDb/guess(ham answer)/correctAnswer", () => {
    const q = { difficulty: "hard", layer: 3, freq: 300, gainDb: 5, source: "vocal" };
    const answer = { freq: 310, gainDb: 4.8 };
    const result = { correct: true };
    const rec = buildAnswerRecord("boost-mu-cut-mu", q, answer, result);
    assert.deepEqual(rec.params, {
      source: "vocal", layer: 3, freq: 300, gainDb: 5, guess: answer,
      correctAnswer: { freq: 300, gainDb: 5 },
    });
  });

  it("q-genisligi: freq/gainDb/q/guessId/correctId", () => {
    const q = { difficulty: "pro", freq: 800, gainDb: 6, q: 4, source: "bass" };
    const result = { correct: true, guessId: "dar", correctId: "dar" };
    const rec = buildAnswerRecord("q-genisligi", q, "dar", result);
    assert.deepEqual(rec.params, { source: "bass", freq: 800, gainDb: 6, q: 4, guessId: "dar", correctId: "dar" });
  });

  for (const modeId of ["kompresor", "reverb", "distortion"]) {
    it(`${modeId} (three-way): source/variants/oddIndex/guessLetter/correctLetter`, () => {
      const variants = [{ letter: "A" }, { letter: "B" }, { letter: "C" }];
      const q = { difficulty: "medium", source: "groove", variants, oddIndex: 1 };
      const result = { correct: true, guessLetter: "B", correctLetter: "B" };
      const rec = buildAnswerRecord(modeId, q, "B", result);
      assert.deepEqual(rec.params, { source: "groove", variants, oddIndex: 1, guessLetter: "B", correctLetter: "B" });
    });
  }

  it("tonal-denge: source/bandCount/bands/avgDeviation/proximityScore", () => {
    const bands = [{ id: "sub", bugDb: 2 }];
    const q = { difficulty: "hard", source: "vocal", bandCount: 1, bands };
    const result = { correct: true, avgDeviation: 0.4, proximityScore: 88 };
    const rec = buildAnswerRecord("tonal-denge", q, { sub: -2 }, result);
    assert.deepEqual(rec.params, { source: "vocal", bandCount: 1, bands, avgDeviation: 0.4, proximityScore: 88 });
  });

  it("frekans-cakismasi: stage/pair/trueCenter/cutStepDb/correctSource/correctCutDb/guess(ham answer)", () => {
    const pair = { id: "kick-bas", labelA: "Kick", labelB: "Bas" };
    const q = { difficulty: "pro", stage: 2, pair, trueCenter: 80, cutStepDb: 1, correctSource: "bass", correctCutDb: 3 };
    const answer = { source: "bass" };
    const result = { correct: true, guessSource: "bass" };
    const rec = buildAnswerRecord("frekans-cakismasi", q, answer, result);
    assert.deepEqual(rec.params, { stage: 2, pair, trueCenter: 80, cutStepDb: 1, correctSource: "bass", correctCutDb: 3, guess: answer });
  });

  it("pan-konumu: panPercent/guessValue/correctAnswer", () => {
    const q = { difficulty: "easy", panPercent: -40, source: "guitar" };
    const result = { correct: true, guessValue: -38 };
    const rec = buildAnswerRecord("pan-konumu", q, -38, result);
    assert.deepEqual(rec.params, { source: "guitar", panPercent: -40, guessValue: -38, correctAnswer: -40 });
  });

  it("stereo-genislik: widthPercent/guessValue/correctAnswer", () => {
    const q = { difficulty: "medium", widthPercent: 60, source: "acoustic_guitar_stereo" };
    const result = { correct: false, guessValue: 90 };
    const rec = buildAnswerRecord("stereo-genislik", q, 90, result);
    assert.deepEqual(rec.params, { source: "acoustic_guitar_stereo", widthPercent: 60, guessValue: 90, correctAnswer: 60 });
  });

  it("bilinmeyen bir modeId için boş params döner (çökmez)", () => {
    const rec = buildAnswerRecord("yok-boyle-bir-mod", { difficulty: "easy" }, 1, { correct: true });
    assert.deepEqual(rec.params, {});
  });
});

describe("appendAnswerRecord() — 200 sınırı ve FIFO", () => {
  it("sınırın altındayken sadece ekler, hiçbir şey silmez", () => {
    const records = [{ a: 1 }, { a: 2 }];
    const next = appendAnswerRecord(records, { a: 3 }, 200);
    assert.equal(next.length, 3);
    assert.deepEqual(next, [{ a: 1 }, { a: 2 }, { a: 3 }]);
  });

  it("orijinal diziyi MUTASYONA UĞRATMAZ (saf fonksiyon)", () => {
    const records = [{ a: 1 }];
    const next = appendAnswerRecord(records, { a: 2 }, 200);
    assert.equal(records.length, 1, "orijinal dizi değişmemeli");
    assert.notEqual(next, records, "YENİ bir dizi dönmeli");
  });

  it("KABUL KRİTERİ — 200 sınırı: 201. kayıt eklenince EN ESKİ (dizinin başı) silinir", () => {
    let records = [];
    for (let i = 0; i < 200; i++) records = appendAnswerRecord(records, { i }, 200);
    assert.equal(records.length, 200);
    assert.equal(records[0].i, 0, "ön koşul: ilk kayıt hâlâ 0");

    records = appendAnswerRecord(records, { i: 200 }, 200);
    assert.equal(records.length, 200, "sınır AŞILMAMALI");
    assert.equal(records[0].i, 1, "EN ESKİ kayıt (i=0) SİLİNMELİ");
    assert.equal(records[records.length - 1].i, 200, "YENİ kayıt sonda olmalı");
  });

  it("varsayılan sınır ANSWER_HISTORY_LIMIT=200", () => {
    assert.equal(ANSWER_HISTORY_LIMIT, 200);
    let records = [];
    for (let i = 0; i < 205; i++) records = appendAnswerRecord(records, { i });
    assert.equal(records.length, 200);
    assert.equal(records[0].i, 5);
  });
});

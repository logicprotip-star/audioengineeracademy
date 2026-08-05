// Boost/Cut moduna özel testler: üç katmanlı seans-içi bilinmeyen-ekleme rampası
// (Katman 1: sadece yön / Katman 2: yön+miktar / Katman 3: frekans+yön+miktar),
// her katmanın kendi şık üretimi (çakışmasız, en az bir yön-flip'li çeldirici),
// merkezi zorluk eğrisine SIFIRDAN doğru kalibre bağlanma + "kolaylaşma yok"
// invaryantı, evaluateAnswer'ın üç katman için ayrı mantığı, applyProcessing'in
// doğru peaking BiquadFilterNode kurması.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/boost-mu-cut-mu.js";
import { representativeLevelForTier } from "../www/js/core/difficulty-curve.js";

describe("Boost/Cut — createQuestion() genel sözleşme", () => {
  for (const level of Object.keys(mode.DIFFICULTY)) {
    it(`createQuestion("${level}") geçerli bir soru üretir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      assert.equal(q.mode, "boostcut");
      assert.equal(q.difficulty, level);
      assert.equal(typeof q.freq, "number");
      assert.ok(q.freq >= mode.FA_MIN && q.freq <= mode.FA_MAX);
      assert.equal(typeof q.gainDb, "number");
      assert.notEqual(q.gainDb, 0, "gainDb hiçbir zaman tam sıfır olmamalı (yön belirsizleşir)");
      assert.ok([1, 2, 3].includes(q.layer));
      assert.equal(q.hintUsed, false);
      assert.ok(Array.isArray(q.choices) && q.choices.length >= 2);
    });

    it(`createQuestion("${level}") SAF fonksiyondur: JSON'a sorunsuz serileşir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      const json = JSON.stringify(q);
      assert.ok(json.length > 0);
      assert.equal(typeof q.applyProcessing, "undefined");
    });
  }

  it("Katman 1'de HER ZAMAN tam 2 şık (Boost/Cut) — options curve/statik ne olursa olsun", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 20; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false, sessionQuestionIndex: 0 });
        assert.equal(q.layer, 1);
        assert.equal(q.choices.length, 2, `${level}: Katman 1'de ${q.choices.length} şık`);
      }
    }
  });

  it("Katman 2/3'te şık sayısı DIFFICULTY.options'a eşit (difficultyPosition verilmezse)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (const idx of [4, 8]) {
        const q = mode.createQuestion(level, { source: "pink", boss: false, sessionQuestionIndex: idx });
        assert.equal(q.choices.length, mode.DIFFICULTY[level].options, `${level}/idx${idx}: ${q.choices.length} şık`);
      }
    }
  });

  it("kolay(3) < orta(4) < zor(5) < pro(6) — DIFFICULTY tablosu bu sırayı garanti eder", () => {
    assert.ok(mode.DIFFICULTY.easy.options < mode.DIFFICULTY.medium.options);
    assert.ok(mode.DIFFICULTY.medium.options < mode.DIFFICULTY.hard.options);
    assert.ok(mode.DIFFICULTY.hard.options < mode.DIFFICULTY.pro.options);
  });

  it("kolaydan pro'ya gainDb (uygulanan büyüklük) KÜÇÜLÜR — istatistiksel olarak (N=300 örnek/zorluk, jitter var)", () => {
    const N = 300;
    let easySum = 0, proSum = 0;
    for (let i = 0; i < N; i++) {
      easySum += Math.abs(mode.createQuestion("easy", { source: "pink", boss: false }).gainDb);
      proSum += Math.abs(mode.createQuestion("pro", { source: "pink", boss: false }).gainDb);
    }
    assert.ok(proSum / N < easySum / N, "pro ortalama olarak easy'den DAHA KÜÇÜK |gainDb| üretmeliydi");
  });
});

describe("Boost/Cut — seans içi ÜÇ katmanlı rampa (Kesim Noktası/dB'nin binary rampasının genişletilmiş hali)", () => {
  it("layerForIndex: idx<LAYER1_QUESTION_COUNT→1, <LAYER2_QUESTION_COUNT→2, sonrası→3", () => {
    for (let idx = 0; idx < mode.LAYER1_QUESTION_COUNT; idx++) assert.equal(mode.layerForIndex(idx), 1, `idx${idx}`);
    for (let idx = mode.LAYER1_QUESTION_COUNT; idx < mode.LAYER2_QUESTION_COUNT; idx++) assert.equal(mode.layerForIndex(idx), 2, `idx${idx}`);
    for (const idx of [mode.LAYER2_QUESTION_COUNT, mode.LAYER2_QUESTION_COUNT + 5, 30]) assert.equal(mode.layerForIndex(idx), 3, `idx${idx}`);
  });

  it("createQuestion sessionQuestionIndex'e göre doğru katmanı üretir — tüm zorluklarda", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let idx = 0; idx <= 9; idx++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false, sessionQuestionIndex: idx });
        assert.equal(q.layer, mode.layerForIndex(idx), `${level}/idx${idx}`);
      }
    }
  });

  it("sessionQuestionIndex verilmezse Katman 1 gibi davranır (geriye dönük güvenli varsayılan)", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    assert.equal(q.layer, 1);
  });
});

describe("Boost/Cut — Katman 1 şıkları (generateLayer1Choices)", () => {
  it("her zaman TAM 2 şık, biri doğru, ikisi FARKLI yön taşır", () => {
    for (let i = 0; i < 100; i++) {
      const gainDb = Math.random() < 0.5 ? 3 : -3;
      const choices = mode.generateLayer1Choices(gainDb);
      assert.equal(choices.length, 2);
      const correct = choices.filter(c => c.correct);
      assert.equal(correct.length, 1);
      assert.equal(correct[0].direction, gainDb >= 0 ? "boost" : "cut");
      assert.notEqual(choices[0].direction, choices[1].direction);
    }
  });
});

describe("Boost/Cut — Katman 2 şıkları (generateLayer2Choices)", () => {
  it("doğru şık TAM BİR kez var, değeri true gainDb'ye eşit", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const resolved = { options: mode.DIFFICULTY[level].options, gainStepDb: mode.DIFFICULTY[level].gainStepDb };
      for (let i = 0; i < 30; i++) {
        const gainDb = (Math.random() < 0.5 ? 1 : -1) * (1 + Math.random() * 5);
        const choices = mode.generateLayer2Choices(gainDb, resolved);
        const correctChoices = choices.filter(c => c.correct);
        assert.equal(correctChoices.length, 1, `${level}: ${correctChoices.length} doğru şık`);
        assert.ok(Math.abs(correctChoices[0].gainDb - gainDb) < 1e-9);
      }
    }
  });

  it("hiçbir turda şıklar arasında ÇAKIŞMA yok — 1500 tur", () => {
    let dup = 0;
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const resolved = { options: mode.DIFFICULTY[level].options, gainStepDb: mode.DIFFICULTY[level].gainStepDb };
      for (let i = 0; i < 300; i++) {
        const gainDb = (Math.random() < 0.5 ? 1 : -1) * (1 + Math.random() * 5);
        const choices = mode.generateLayer2Choices(gainDb, resolved);
        const vals = choices.map(c => c.gainDb);
        if (new Set(vals).size !== vals.length) dup++;
      }
    }
    assert.equal(dup, 0, `${dup} turda çakışan şık değeri bulundu`);
  });

  it("options>=3 olduğu sürece en az bir ters işaretli çeldirici var (yön de test ediliyor)", () => {
    let sawMixed = 0;
    const N = 200;
    const resolved = { options: 5, gainStepDb: 1.0 };
    for (let i = 0; i < N; i++) {
      const gainDb = 3.0;
      const choices = mode.generateLayer2Choices(gainDb, resolved);
      const signs = new Set(choices.map(c => Math.sign(c.gainDb)));
      if (signs.size > 1) sawMixed++;
    }
    assert.ok(sawMixed / N > 0.9, `sadece ${sawMixed}/${N} turda karışık işaret görüldü`);
  });
});

describe("Boost/Cut — Katman 3 şıkları (generateLayer3Choices, KOMBİNE {freq,gainDb})", () => {
  it("doğru şık TAM BİR kez var, freq VE gainDb true değerlere eşit", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const resolved = { options: mode.DIFFICULTY[level].options, freqStepOct: mode.DIFFICULTY[level].freqStepOct, gainStepDb: mode.DIFFICULTY[level].gainStepDb };
      for (let i = 0; i < 30; i++) {
        const freq = 200 + Math.random() * 8000;
        const gainDb = (Math.random() < 0.5 ? 1 : -1) * (1 + Math.random() * 5);
        const choices = mode.generateLayer3Choices(freq, gainDb, resolved);
        const correctChoices = choices.filter(c => c.correct);
        assert.equal(correctChoices.length, 1, `${level}: ${correctChoices.length} doğru şık`);
        assert.ok(Math.abs(correctChoices[0].freq - freq) < 1e-6);
        assert.ok(Math.abs(correctChoices[0].gainDb - gainDb) < 1e-9);
      }
    }
  });

  it("hiçbir turda (freq,gainDb) çifti arasında ÇAKIŞMA yok — 1500 tur", () => {
    let dup = 0;
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const resolved = { options: mode.DIFFICULTY[level].options, freqStepOct: mode.DIFFICULTY[level].freqStepOct, gainStepDb: mode.DIFFICULTY[level].gainStepDb };
      for (let i = 0; i < 300; i++) {
        const freq = 200 + Math.random() * 8000;
        const gainDb = (Math.random() < 0.5 ? 1 : -1) * (1 + Math.random() * 5);
        const choices = mode.generateLayer3Choices(freq, gainDb, resolved);
        const vals = choices.map(c => `${c.freq.toFixed(4)}|${c.gainDb.toFixed(4)}`);
        if (new Set(vals).size !== vals.length) dup++;
      }
    }
    assert.equal(dup, 0, `${dup} turda çakışan (freq,gainDb) çifti bulundu`);
  });

  // Canlı testte bulunan GERÇEK hata: true frekans FA_MAX'a (17 kHz) yakınken
  // frekans-ekseni çeldiricisi naif k*step çarpımıyla 21.6 kHz gibi havuzun
  // TAMAMEN DIŞINDA bir değer üretiyordu — Kesim Noktası'nın maxBelow/maxAbove
  // desenine geçilerek düzeltildi.
  it("frekans-ekseni çeldiricileri HİÇBİR ZAMAN FA_MIN–FA_MAX havuzunun dışına taşmaz — true freq uç noktalara yakınken de (1000 tur)", () => {
    const resolved = { options: 6, freqStepOct: 1.0, gainStepDb: 1.6 };
    let violations = 0;
    for (let i = 0; i < 1000; i++) {
      // Bilerek uç noktalara YAKIN true frekanslar — havuzun dar kaldığı senaryo.
      const trueFreq = i % 2 === 0
        ? mode.FA_MAX * Math.pow(2, -Math.random() * 0.5)
        : mode.FA_MIN * Math.pow(2, Math.random() * 0.5);
      const choices = mode.generateLayer3Choices(trueFreq, 3.0, resolved);
      choices.forEach(c => { if (c.freq < mode.FA_MIN - 1e-6 || c.freq > mode.FA_MAX + 1e-6) violations++; });
    }
    assert.equal(violations, 0, `${violations} çeldirici FA_MIN–FA_MAX (${mode.FA_MIN}–${mode.FA_MAX}) dışına taştı`);
  });

  it("her çeldirici SADECE bir eksende (freq YA DA gainDb) true'dan ayrılır, ikisi birden DEĞİL", () => {
    const resolved = { options: 6, freqStepOct: 1.0, gainStepDb: 1.6 };
    for (let i = 0; i < 50; i++) {
      const freq = 1000, gainDb = 3.0;
      const choices = mode.generateLayer3Choices(freq, gainDb, resolved);
      choices.filter(c => !c.correct).forEach(c => {
        const freqDiffers = Math.abs(c.freq - freq) > 1e-6;
        const gainDiffers = Math.abs(c.gainDb - gainDb) > 1e-9;
        assert.notEqual(freqDiffers, gainDiffers, `çeldirici hem freq hem gain'de (ya da hiçbirinde) farklı: ${JSON.stringify(c)}`);
      });
    }
  });

  it("gain-ekseni çeldiricilerden en az biri işareti ters çevrilmiş (options>=4 olduğu sürece)", () => {
    let sawFlip = 0;
    const N = 150;
    const resolved = { options: 6, freqStepOct: 1.0, gainStepDb: 1.6 };
    for (let i = 0; i < N; i++) {
      const freq = 1000, gainDb = 3.0;
      const choices = mode.generateLayer3Choices(freq, gainDb, resolved);
      const gainAxisDistractors = choices.filter(c => !c.correct && Math.abs(c.freq - freq) < 1e-6);
      if (gainAxisDistractors.some(c => Math.sign(c.gainDb) !== Math.sign(gainDb))) sawFlip++;
    }
    assert.ok(sawFlip / N > 0.9, `sadece ${sawFlip}/${N} turda ters işaretli gain-ekseni çeldirici görüldü`);
  });
});

describe("Boost/Cut — evaluateAnswer (üç katman için ayrı mantık)", () => {
  it("Katman 1: doğru yön → correct=true", () => {
    const q = { layer: 1, gainDb: 3.0 };
    const r = mode.evaluateAnswer(q, { direction: "boost" });
    assert.equal(r.correct, true);
    assert.equal(r.directionOk, true);
  });

  it("Katman 1: yanlış yön → correct=false", () => {
    const q = { layer: 1, gainDb: 3.0 };
    const r = mode.evaluateAnswer(q, { direction: "cut" });
    assert.equal(r.correct, false);
    assert.equal(r.directionOk, false);
  });

  it("Katman 1: bare string ('boost'/'cut') de kabul eder (şıklı arayüzden gelen data-direction)", () => {
    const q = { layer: 1, gainDb: -2.0 };
    assert.equal(mode.evaluateAnswer(q, "cut").correct, true);
    assert.equal(mode.evaluateAnswer(q, "boost").correct, false);
  });

  it("Katman 2: tam isabet → correct=true", () => {
    const q = { layer: 2, gainDb: 2.5 };
    const r = mode.evaluateAnswer(q, { gainDb: 2.5 });
    assert.equal(r.correct, true);
    assert.equal(r.directionOk, true);
  });

  it("Katman 2: GAIN_TOLERANCE sınırı içeride doğru, dışarıda yanlış", () => {
    const q = { layer: 2, gainDb: 2.0 };
    const justInside = mode.evaluateAnswer(q, { gainDb: 2.0 + mode.GAIN_TOLERANCE * 0.99 });
    const justOutside = mode.evaluateAnswer(q, { gainDb: 2.0 + mode.GAIN_TOLERANCE * 1.5 });
    assert.equal(justInside.correct, true);
    assert.equal(justOutside.correct, false);
  });

  it("Katman 2: yön yanlış (ters işaret) → directionOk=false, correct=false", () => {
    const q = { layer: 2, gainDb: 2.0 };
    const r = mode.evaluateAnswer(q, { gainDb: -2.0 });
    assert.equal(r.directionOk, false);
    assert.equal(r.correct, false);
  });

  it("Katman 3: tam isabet (freq+gainDb) → correct=true, freqOk+gainOk+directionOk hepsi true", () => {
    const q = { layer: 3, freq: 1000, gainDb: 3.0 };
    const r = mode.evaluateAnswer(q, { freq: 1000, gainDb: 3.0 });
    assert.equal(r.correct, true);
    assert.equal(r.freqOk, true);
    assert.equal(r.gainOk, true);
    assert.equal(r.directionOk, true);
  });

  it("Katman 3: FREQ_TOLERANCE_OCT sınırı içeride/dışarıda (gain doğru sabit tutularak)", () => {
    const q = { layer: 3, freq: 1000, gainDb: 3.0 };
    const insideFreq = 1000 * Math.pow(2, mode.FREQ_TOLERANCE_OCT * 0.9);
    const outsideFreq = 1000 * Math.pow(2, mode.FREQ_TOLERANCE_OCT * 1.5);
    assert.equal(mode.evaluateAnswer(q, { freq: insideFreq, gainDb: 3.0 }).correct, true);
    assert.equal(mode.evaluateAnswer(q, { freq: outsideFreq, gainDb: 3.0 }).correct, false);
  });

  it("Katman 3: frekans doğru ama gain yanlışsa correct=false, freqOk=true", () => {
    const q = { layer: 3, freq: 1000, gainDb: 3.0 };
    const r = mode.evaluateAnswer(q, { freq: 1000, gainDb: 1.0 });
    assert.equal(r.correct, false);
    assert.equal(r.freqOk, true);
    assert.equal(r.gainOk, false);
  });

  it("Katman 3: frekans yanlışsa (gain doğru olsa bile) correct=false, freqOk=false", () => {
    const q = { layer: 3, freq: 1000, gainDb: 3.0 };
    const r = mode.evaluateAnswer(q, { freq: 4000, gainDb: 3.0 });
    assert.equal(r.correct, false);
    assert.equal(r.freqOk, false);
  });
});

describe("Boost/Cut — calculateXP sağlamlık + katman çarpanı", () => {
  it("yanlış cevapta 0 döner", () => {
    const q = { boss: false, layer: 1 };
    const result = { correct: false };
    assert.equal(mode.calculateXP(q, result, false, "medium", {}), 0);
  });

  it("doğru cevapta negatif olmaz, makul bir üst sınırı aşmaz (Katman 3)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const q = { boss: true, layer: 3 };
      const result = { correct: true };
      const gained = mode.calculateXP(q, result, false, level, { combo: 20, timeLeft: 100, roundDuration: 10, xpMultiplier: 1.5 });
      assert.ok(gained >= 0);
      const maxPlausible = mode.DIFFICULTY[level].xp * 1.5 * 2.4 * 1.65 * 1.2 * 1.5 + 5;
      assert.ok(gained <= maxPlausible, `${level}: XP mantıksız yüksek: ${gained} > ${maxPlausible}`);
    }
  });

  it("AYNI zorluk/koşulda Katman 3, Katman 2'den fazla; Katman 2, Katman 1'den fazla XP verir (daha fazla bilinmeyen = daha fazla ödül)", () => {
    const result = { correct: true };
    const ctx = { combo: 0, timeLeft: 0, roundDuration: 10, xpMultiplier: 1 };
    const xp1 = mode.calculateXP({ boss: false, layer: 1 }, result, false, "medium", ctx);
    const xp2 = mode.calculateXP({ boss: false, layer: 2 }, result, false, "medium", ctx);
    const xp3 = mode.calculateXP({ boss: false, layer: 3 }, result, false, "medium", ctx);
    assert.ok(xp1 < xp2, `Katman1 (${xp1}) < Katman2 (${xp2}) olmalıydı`);
    assert.ok(xp2 < xp3, `Katman2 (${xp2}) < Katman3 (${xp3}) olmalıydı`);
  });

  it("ipucu kullanınca XP yarıya iner (hintPenalty)", () => {
    const q = { boss: false, layer: 2 };
    const result = { correct: true };
    const withoutHint = mode.calculateXP(q, result, false, "medium", { combo: 0, timeLeft: 0, roundDuration: 10 });
    const withHint = mode.calculateXP(q, result, true, "medium", { combo: 0, timeLeft: 0, roundDuration: 10 });
    assert.ok(withHint < withoutHint);
  });
});

describe("Boost/Cut — öğretici metin (teachingText/getFeedbackData)", () => {
  it("DOĞRU durumda metin bozuk/boş değil, jargon (JND/RMS) yok — üç katmanda da", () => {
    const cases = [
      { q: { layer: 1, freq: 1000, gainDb: 3.0 }, a: { direction: "boost" } },
      { q: { layer: 2, freq: 1000, gainDb: 3.0 }, a: { gainDb: 3.0 } },
      { q: { layer: 3, freq: 1000, gainDb: 3.0 }, a: { freq: 1000, gainDb: 3.0 } }
    ];
    cases.forEach(({ q, a }) => {
      const text = mode.teachingText(q, a);
      assert.ok(text && text.length >= 10);
      assert.doesNotMatch(text, /undefined|NaN|\[object/i);
      assert.doesNotMatch(text, /JND|RMS|logaritmik|desibel formülü/i);
    });
  });

  it("Katman 1 YANLIŞ: 'Ters yön' ifadesi geçer", () => {
    const q = { layer: 1, freq: 1000, gainDb: 3.0 };
    const text = mode.teachingText(q, { direction: "cut" });
    assert.match(text, /Ters yön/i);
  });

  it("Katman 2 yön-doğru/miktar-yanlış: her iki dB değeri de metinde geçer", () => {
    const q = { layer: 2, freq: 1000, gainDb: 3.0 };
    const text = mode.teachingText(q, { gainDb: 1.0 });
    assert.match(text, /\+1\.00 dB/);
    assert.match(text, /\+3\.00 dB/);
  });

  it("Katman 3 frekans-yanlış: metin frekans hatasından bahseder, gain'den ÖNCE", () => {
    const q = { layer: 3, freq: 1000, gainDb: 3.0 };
    const text = mode.teachingText(q, { freq: 4000, gainDb: 3.0 });
    assert.match(text, /[Ff]rekans/);
  });

  it("getFeedbackData showResult HER ZAMAN true, panel HER ZAMAN null (bu modda zengin panel yok)", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false, sessionQuestionIndex: 8 });
    const answer = { freq: q.freq, gainDb: q.gainDb };
    const wrongAnswer = { freq: q.freq * 4, gainDb: -q.gainDb };
    const correctFb = mode.getFeedbackData(q, answer, { gained: 10 });
    const wrongFb = mode.getFeedbackData(q, wrongAnswer, { gained: 0 });
    assert.equal(correctFb.showResult, true);
    assert.equal(wrongFb.showResult, true);
    assert.equal(correctFb.panel, null);
    assert.equal(wrongFb.panel, null);
  });
});

describe("Boost/Cut — applyProcessing (doğru peaking BiquadFilterNode, sahte audioCtx ile)", () => {
  it("freq/gain doğru atanmış TEK peaking BiquadFilterNode döner", () => {
    const created = [];
    const fakeAudioCtx = {
      createBiquadFilter: () => {
        const f = { type: "", frequency: { value: 0 }, Q: { value: 0 }, gain: { value: 0 } };
        created.push(f);
        return f;
      }
    };
    const q = { freq: 1200, gainDb: -4.5 };
    const { filters } = mode.applyProcessing(q, { audioCtx: fakeAudioCtx });
    assert.equal(filters.length, 1);
    assert.equal(filters[0].type, "peaking");
    assert.equal(filters[0].frequency.value, 1200);
    assert.equal(filters[0].gain.value, -4.5);
    assert.equal(created.length, 1);
  });
});

// ADIM 1-3/G22'deki (Kesim Noktası/dB Seviyesi) AYNI merkezi eğri deseni — bu mod da
// SIFIRDAN bağlandığı için G24'ün SONRADAN öğrettiği dersler (dar jitter + floor
// garantisi) baştan uygulandı (bkz. dosya başı not, pickGainDb).
describe("Boost/Cut — paramsForDifficultyPosition() (merkezi zorluk eğrisi)", () => {
  it("position arttıkça gainDb PÜRÜZSÜZ (monoton) KÜÇÜLÜR", () => {
    let prev = Infinity;
    for (let p = 1; p <= 20; p += 0.25) {
      const { gainDb } = mode.paramsForDifficultyPosition(p);
      assert.ok(gainDb <= prev + 1e-9, `position ${p}'de gainDb azalmadı`);
      prev = gainDb;
    }
  });

  it("position=1'de AT_1, position=LEVEL_CAP'te AT_CAP değerlerini birebir döner", () => {
    const cfg = mode.BOOSTCUT_CURVE_CONFIG;
    const p1 = mode.paramsForDifficultyPosition(1);
    const pCap = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    assert.ok(Math.abs(p1.gainDb - cfg.GAIN_DB_AT_1) < 1e-9);
    assert.ok(Math.abs(pCap.gainDb - cfg.GAIN_DB_AT_CAP) < 1e-9);
  });

  it("LEVEL_CAP'in ÇOK ötesinde gainDb/freqStepOct/gainStepDb bir TABANIN altına inmez", () => {
    const cfg = mode.BOOSTCUT_CURVE_CONFIG;
    const far = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP + 1000);
    assert.ok(far.gainDb >= cfg.GAIN_DB_FLOOR - 1e-9);
    assert.ok(far.freqStepOct >= cfg.FREQ_STEP_FLOOR - 1e-9);
    assert.ok(far.gainStepDb >= cfg.GAIN_STEP_FLOOR - 1e-9);
  });

  it("options position arttıkça monoton artar, her zaman 3-6 arası tam sayı", () => {
    let prev = 0;
    for (let p = 1; p <= 20; p += 0.5) {
      const { options } = mode.paramsForDifficultyPosition(p);
      assert.ok(Number.isInteger(options) && options >= 3 && options <= 6);
      assert.ok(options >= prev);
      prev = options;
    }
  });

  it("position<1 veya ondalık için düşmez, position 1 gibi davranır", () => {
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(0));
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(-5));
    assert.equal(mode.paramsForDifficultyPosition(0).position, 1);
  });

  it("freqStepOct HER ZAMAN FREQ_TOLERANCE_OCT'tan büyük (çeldirici asla 'doğru' sayılmaz)", () => {
    for (let p = 1; p <= 20; p += 1) {
      const { freqStepOct } = mode.paramsForDifficultyPosition(p);
      assert.ok(freqStepOct > mode.FREQ_TOLERANCE_OCT, `position ${p}: freqStepOct ${freqStepOct} <= tolerans ${mode.FREQ_TOLERANCE_OCT}`);
    }
  });

  it("gainStepDb HER ZAMAN GAIN_TOLERANCE'tan büyük (çeldirici asla 'doğru' sayılmaz)", () => {
    for (let p = 1; p <= 20; p += 1) {
      const { gainStepDb } = mode.paramsForDifficultyPosition(p);
      assert.ok(gainStepDb > mode.GAIN_TOLERANCE, `position ${p}: gainStepDb ${gainStepDb} <= tolerans ${mode.GAIN_TOLERANCE}`);
    }
  });
});

describe("Boost/Cut — createQuestion(settings.difficultyPosition) entegrasyonu", () => {
  it("difficultyPosition VERİLİRSE, Katman 2/3'te üretilen şık sayısı paramsForDifficultyPosition().options'a eşit", () => {
    for (const p of [1, 5, 10, 15, 20]) {
      const expectedOptions = mode.paramsForDifficultyPosition(p).options;
      const q = mode.createQuestion("medium", { source: "pink", boss: false, sessionQuestionIndex: 8, difficultyPosition: p });
      assert.equal(q.choices.length, expectedOptions, `position ${p}: beklenen ${expectedOptions}, gelen ${q.choices.length}`);
    }
  });

  it("difficultyPosition VERİLMEZSE davranış eski statik tabloyla BİREBİR aynı kalır (proplus dahil)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 10; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false, sessionQuestionIndex: 8 });
        assert.equal(q.choices.length, mode.DIFFICULTY[level].options);
        assert.equal(q.timeSec, mode.DIFFICULTY[level].time);
      }
    }
  });

  it("proplus'ta difficultyPosition verilse BİLE eğri devreye girmez (Z5 kararıyla aynı çizgi)", () => {
    for (let i = 0; i < 10; i++) {
      const q = mode.createQuestion("proplus", { source: "pink", boss: false, sessionQuestionIndex: 8, difficultyPosition: 20 });
      assert.equal(q.choices.length, mode.DIFFICULTY.proplus.options);
    }
  });
});

// "Sabit" modun eğriye bağlanması — Kesim Noktası/dB Seviyesi'nin AYNI kompozisyonu.
describe("Boost/Cut — Sabit mod eğriye bağlı ('kolaylaşma yok' invaryantı)", () => {
  const TIERS = ["easy", "medium", "hard", "pro"];

  it("her tier'da: gainDb/freqStepOct/gainStepDb eski statikten BÜYÜK DEĞİL (kolaylaşma yok — küçük=zor)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      assert.ok(p.gainDb <= old.gainDb + 1e-9, `${tier}: gainDb ${p.gainDb} > eski ${old.gainDb}`);
      assert.ok(p.freqStepOct <= old.freqStepOct + 1e-9, `${tier}: freqStepOct ${p.freqStepOct} > eski ${old.freqStepOct}`);
      assert.ok(p.gainStepDb <= old.gainStepDb + 1e-9, `${tier}: gainStepDb ${p.gainStepDb} > eski ${old.gainStepDb}`);
    }
  });

  it("her tier'da: options eski statikten KÜÇÜK DEĞİL", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      assert.ok(p.options >= old.options, `${tier}: options ${p.options} < eski ${old.options}`);
    }
  });

  it("pro'nun temsilci seviyesi TAM LEVEL_CAP — eğrinin en zor noktası", () => {
    assert.equal(representativeLevelForTier("pro"), mode.BOOSTCUT_CURVE_CONFIG.LEVEL_CAP);
    const atCap = mode.paramsForDifficultyPosition(mode.BOOSTCUT_CURVE_CONFIG.LEVEL_CAP);
    const proRepr = mode.paramsForDifficultyPosition(representativeLevelForTier("pro"));
    assert.deepEqual(atCap, proRepr);
  });

  it("Sabit modun kompozisyonu uçtan uca doğru şık sayısını üretir (Katman 3)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const expectedOptions = mode.paramsForDifficultyPosition(level).options;
      for (let i = 0; i < 10; i++) {
        const q = mode.createQuestion(tier, { source: "pink", boss: false, sessionQuestionIndex: 8, difficultyPosition: level });
        assert.equal(q.choices.length, expectedOptions, `${tier}: beklenen ${expectedOptions}, gelen ${q.choices.length}`);
      }
    }
  });
});

describe("Boost/Cut — pickGainDb (dar jitter + G24'ün öğrettiği floor garantisi, BAŞTAN uygulandı)", () => {
  it("HİÇBİR ZAMAN GAIN_DB_FLOOR'un altına inmez — baseGain TAM floor'da bile (5000 örnek)", () => {
    const floor = mode.BOOSTCUT_CURVE_CONFIG.GAIN_DB_FLOOR;
    for (let i = 0; i < 5000; i++) {
      const v = mode.pickGainDb(floor);
      assert.ok(v >= floor - 1e-9, `floor ihlali: ${v} < ${floor}`);
    }
  });

  it("ortalaması (N=2000) baseGain'e YAKIN kalır — jitter sinyali BOĞMUYOR", () => {
    const N = 2000;
    for (const base of [8.0, 3.0, 1.4, mode.BOOSTCUT_CURVE_CONFIG.GAIN_DB_FLOOR + 0.1]) {
      let sum = 0;
      for (let i = 0; i < N; i++) sum += mode.pickGainDb(base);
      const avg = sum / N;
      assert.ok(Math.abs(avg - base) / base < 0.03, `base=${base}: ortalama ${avg.toFixed(4)}, sapma %${(Math.abs(avg - base) / base * 100).toFixed(1)}`);
    }
  });

  it("aynı baseGain'den farklı, ondalıklı değerler üretir (tekrarlama/durgunluk YOK)", () => {
    const values = new Set();
    for (let i = 0; i < 50; i++) values.add(mode.pickGainDb(5.0));
    assert.ok(values.size > 15, `50 örnekte sadece ${values.size} FARKLI değer — jitter etkisiz kalmış olabilir`);
  });
});

describe("Boost/Cut — getMeta() sözleşme alanları", () => {
  it("id/motor/kulaklikGerekli/uyumluKaynaklar/ucretsiz/videoUrl/difficulty/choiceOnly tanımlı", () => {
    const meta = mode.getMeta();
    assert.equal(meta.id, "boost-mu-cut-mu");
    assert.ok(Number.isInteger(meta.motor));
    assert.equal(typeof meta.kulaklikGerekli, "boolean");
    assert.ok(Array.isArray(meta.uyumluKaynaklar) && meta.uyumluKaynaklar.length > 5, "kaynak kısıtlaması olmamalıydı");
    assert.equal(typeof meta.ucretsiz, "boolean");
    assert.equal(typeof meta.videoUrl, "string");
    assert.equal(meta.choiceOnly, true);
    for (const level of Object.keys(meta.difficulty)) {
      assert.ok(meta.difficulty[level], `${level} DIFFICULTY'de yok`);
      assert.ok(typeof meta.difficulty[level].lives === "number");
      assert.ok(typeof meta.difficulty[level].time === "number" && meta.difficulty[level].time > 0);
    }
  });

  it("ad/aciklama BİLEREK yok — kart metni yalnızca mode-catalog.js'ten okunur", () => {
    const meta = mode.getMeta();
    assert.equal(meta.ad, undefined);
    assert.equal(meta.aciklama, undefined);
  });
});

describe("Boost/Cut — Kesim Noktası/dB Seviyesi'yle KARŞILAŞTIRMA (bağlantı mekanizması ORTAK)", () => {
  it("AYNI position'da üç modun da eğrisi aynı yönde (monoton azalan) hareket eder — Boost/Cut'a özgü bir kopukluk YOK", async () => {
    const kesim = await import("../www/js/modes/kesim-noktasi.js");
    const db = await import("../www/js/modes/db-seviyesi.js");
    const positions = [1, 2, 5, 10, 15, 20];
    let bcPrev = Infinity, kesimPrev = Infinity, dbPrev = Infinity;
    for (const p of positions) {
      const bcVal = mode.paramsForDifficultyPosition(p).gainDb;
      const kesimVal = kesim.paramsForDifficultyPosition(p).marginOct;
      const dbVal = db.paramsForDifficultyPosition(p).dbDelta;
      assert.ok(bcVal <= bcPrev + 1e-9, `Boost/Cut: position ${p}'de artış`);
      assert.ok(kesimVal <= kesimPrev + 1e-9, `Kesim: position ${p}'de artış`);
      assert.ok(dbVal <= dbPrev + 1e-9, `dB: position ${p}'de artış`);
      bcPrev = bcVal; kesimPrev = kesimVal; dbPrev = dbVal;
    }
  });
});

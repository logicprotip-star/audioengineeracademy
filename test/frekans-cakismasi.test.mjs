// Frekans Çakışması (G51, Motor 3) — TEMEL AT testleri. Kapsam: iki-kaynak
// çift üretimi (source-catalog.js:SOURCE_PAIRS), çakışma bölgesi seçimi,
// seans-içi AŞAMA ramp'i (stageForIndex, boost-mu-cut-mu.js'in layerForIndex'i
// ile AYNI eşik-mantığı), her aşamanın şık üretimi/evaluateAnswer'ı, merkezi
// zorluk eğrisi ("kolaylaşma yok" invaryantı), applyProcessing (İKİ filtre,
// sahte audioCtx ile), EXAM_* bayrakları, upload-a/upload-b sanal çift.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/frekans-cakismasi.js";
import { SOURCE_PAIRS, OWN_SOURCE_PAIR, findSourcePair } from "../www/js/core/source-catalog.js";
import { representativeLevelForTier } from "../www/js/core/difficulty-curve.js";
import { formatHz } from "../www/js/core/utils.js";

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("source-catalog.js — SOURCE_PAIRS / OWN_SOURCE_PAIR / findSourcePair (G51)", () => {
  it("SOURCE_PAIRS en az bir hazır çift içerir, her biri sourceA/sourceB/region taşır", () => {
    assert.ok(SOURCE_PAIRS.length >= 1);
    SOURCE_PAIRS.forEach(p => {
      assert.ok(p.sourceA && p.sourceB && p.labelA && p.labelB);
      assert.ok(Array.isArray(p.region) && p.region.length === 2 && p.region[0] < p.region[1]);
    });
  });

  it("kick-bas çifti mevcut (task'ın istediği TEMEL çift)", () => {
    const pair = SOURCE_PAIRS.find(p => p.id === "kick-bas");
    assert.ok(pair);
    assert.equal(pair.sourceA, "kick");
    assert.equal(pair.sourceB, "bass");
  });

  // G52: kütüphane task'ın kendi verdiği üç hazır setle genişledi — yeni ses
  // dosyası GEREKMEDİ, source-catalog.js'in mevcut vocal/guitar/snare
  // girdilerine işaret ediyorlar.
  it("vokal-gitar çifti mevcut, ORTA bölgede (task: ~2kHz orta)", () => {
    const pair = SOURCE_PAIRS.find(p => p.id === "vokal-gitar");
    assert.ok(pair);
    assert.equal(pair.sourceA, "vocal");
    assert.equal(pair.sourceB, "guitar");
    assert.deepEqual(pair.region, [500, 2000]);
  });

  it("snare-gitar çifti mevcut, task'ın verdiği ~200Hz-2kHz aralığında", () => {
    const pair = SOURCE_PAIRS.find(p => p.id === "snare-gitar");
    assert.ok(pair);
    assert.equal(pair.sourceA, "snare");
    assert.equal(pair.sourceB, "guitar");
    assert.deepEqual(pair.region, [200, 2000]);
  });

  it("üç hazır çiftin sourceA/sourceB'si source-catalog.js'in KENDİ SOURCE_GROUPS'unda gerçekten var (kod incelemesiyle: kick/bass/vocal/guitar/snare)", () => {
    const knownSourceIds = ["kick", "bass", "vocal", "guitar", "snare"];
    SOURCE_PAIRS.forEach(p => {
      assert.ok(knownSourceIds.includes(p.sourceA), `${p.id}.sourceA=${p.sourceA} bilinmiyor`);
      assert.ok(knownSourceIds.includes(p.sourceB), `${p.id}.sourceB=${p.sourceB} bilinmiyor`);
    });
  });

  it("findSourcePair ile id'sinden her üç hazır çift de doğru çözülür", () => {
    assert.equal(findSourcePair("kick-bas").id, "kick-bas");
    assert.equal(findSourcePair("vokal-gitar").id, "vokal-gitar");
    assert.equal(findSourcePair("snare-gitar").id, "snare-gitar");
  });

  it("OWN_SOURCE_PAIR sanal upload-a/upload-b id'leri taşır, region null (aralık ÖNCEDEN bilinemez)", () => {
    assert.equal(OWN_SOURCE_PAIR.sourceA, "upload-a");
    assert.equal(OWN_SOURCE_PAIR.sourceB, "upload-b");
    assert.equal(OWN_SOURCE_PAIR.region, null);
  });

  it("findSourcePair('own') OWN_SOURCE_PAIR'ı, bilinmeyen bir id İLK hazır çifti döner (güvenli varsayılan)", () => {
    assert.equal(findSourcePair("own"), OWN_SOURCE_PAIR);
    assert.equal(findSourcePair("yok-boyle-bir-cift"), SOURCE_PAIRS[0]);
    assert.equal(findSourcePair(undefined), SOURCE_PAIRS[0]);
  });
});

describe("stageForIndex() — seans içi AŞAMA ramp'i (boost-mu-cut-mu.js:layerForIndex'in AYNI eşik-mantığı)", () => {
  it("idx < STAGE1_QUESTION_COUNT → aşama 1", () => {
    for (let i = 0; i < mode.STAGE1_QUESTION_COUNT; i++) assert.equal(mode.stageForIndex(i), 1, `idx=${i}`);
  });
  it("STAGE1..STAGE2 arası → aşama 2", () => {
    for (let i = mode.STAGE1_QUESTION_COUNT; i < mode.STAGE2_QUESTION_COUNT; i++) assert.equal(mode.stageForIndex(i), 2, `idx=${i}`);
  });
  it("idx >= STAGE2_QUESTION_COUNT → aşama 3, SINIRSIZ üstte de SABİT kalır", () => {
    for (const i of [mode.STAGE2_QUESTION_COUNT, mode.STAGE2_QUESTION_COUNT + 5, 100]) assert.equal(mode.stageForIndex(i), 3, `idx=${i}`);
  });
  it("negatif/tanımsız index 0 gibi davranır (aşama 1)", () => {
    assert.equal(mode.stageForIndex(-3), 1);
    assert.equal(mode.stageForIndex(undefined), 1);
  });
});

describe("generateStage1Choices() — çakışma merkezi + oktav-uzaklaşan çeldiriciler", () => {
  it("doğru merkezi İÇERİR, istenen sayıda BENZERSİZ aday üretir", () => {
    const choices = mode.generateStage1Choices(100, 1.0, 4, [40, 400]);
    assert.equal(choices.length, 4);
    assert.ok(choices.some(c => c.correct && c.center === 100));
    assert.equal(choices.filter(c => c.correct).length, 1, "TEK bir doğru şık olmalı");
    const centers = new Set(choices.map(c => c.center));
    assert.equal(centers.size, choices.length, "adaylar benzersiz olmalı");
  });

  it("TÜM adaylar pair.region sınırları İÇİNDE kalır (asla dışına taşmaz)", () => {
    const region = [50, 160];
    for (let trial = 0; trial < 20; trial++) {
      const trueCenter = 60 + trial * 4;
      const choices = mode.generateStage1Choices(trueCenter, 1.4, 6, region);
      choices.forEach(c => assert.ok(c.center >= region[0] && c.center <= region[1], `${c.center} aralık dışı [${region}]`));
    }
  });
});

describe("generateStage3Choices() — kesim miktarı şıkları (HEP negatif, cutStepDb aralıklı)", () => {
  it("doğru kesimi İÇERİR (negatif işaretli), istenen sayıda BENZERSİZ aday üretir", () => {
    const choices = mode.generateStage3Choices(6, 2, 5);
    assert.equal(choices.length, 5);
    assert.ok(choices.some(c => c.correct && c.cutDb === -6));
    assert.equal(choices.filter(c => c.correct).length, 1);
    choices.forEach(c => assert.ok(c.cutDb <= 0, "kesim HEP negatif/sıfır olmalı"));
    const vals = new Set(choices.map(c => c.cutDb));
    assert.equal(vals.size, choices.length);
  });
});

describe("createQuestion() — genel sözleşme (SAF, ses/DOM'a dokunmaz)", () => {
  it("mode/stage/pair/trueCenter/correctSource/correctCutDb/choices/timeSec alanları dolu", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: 0, rng: mulberry32(1) });
    assert.equal(q.mode, "cakisma");
    assert.equal(q.stage, 1);
    assert.ok(q.pair && q.pair.labelA && q.pair.labelB);
    assert.ok(q.trueCenter >= 50 && q.trueCenter <= 160, "varsayılan kick-bas çiftinin region'ı içinde olmalı");
    assert.ok(q.correctSource === "a" || q.correctSource === "b");
    assert.ok(q.correctCutDb > 0, "correctCutDb POZİTİF büyüklük taşır (işaret evaluateAnswer'da eklenir)");
    assert.ok(Array.isArray(q.choices) && q.choices.length === mode.DIFFICULTY.medium.options);
    assert.ok(q.timeSec > 0);
    assert.equal(q.hintUsed, false);
  });

  // G52: yeni vokal-gitar/snare-gitar çiftleri de trueCenter'ı KENDİ
  // region'larına doğru üretiyor mu — pro tier (en dar regionWidthOct, en çok
  // şık) STRES testi, kick-bas'ın dar 50-160 aralığı için zaten yapılan
  // benzersizlik doğrulamasının AYNISI, DAHA GENİŞ iki region için de.
  it("vokal-gitar çiftinde trueCenter [500,2000] içinde, pro tier'de 50 tekrarda HEP benzersiz şık üretir", () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = mode.createQuestion("pro", { pairId: "vokal-gitar", sessionQuestionIndex: 0, rng: mulberry32(seed) });
      assert.ok(q.trueCenter >= 500 && q.trueCenter <= 2000, `seed=${seed} trueCenter=${q.trueCenter}`);
      assert.equal(new Set(q.choices.map(c => c.center)).size, q.choices.length, `seed=${seed}`);
    }
  });

  it("snare-gitar çiftinde trueCenter [200,2000] içinde, pro tier'de 50 tekrarda HEP benzersiz şık üretir", () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = mode.createQuestion("pro", { pairId: "snare-gitar", sessionQuestionIndex: 0, rng: mulberry32(seed) });
      assert.ok(q.trueCenter >= 200 && q.trueCenter <= 2000, `seed=${seed} trueCenter=${q.trueCenter}`);
      assert.equal(new Set(q.choices.map(c => c.center)).size, q.choices.length, `seed=${seed}`);
    }
  });

  it("settings.pairId='own' iken pair OWN_SOURCE_PAIR'e çözülür, region FA_MIN–400 havuzuna düşer", () => {
    const q = mode.createQuestion("medium", { pairId: "own", sessionQuestionIndex: 0, rng: mulberry32(2) });
    assert.equal(q.pair.id, "own");
    assert.equal(q.pair.sourceA, "upload-a");
    assert.ok(q.trueCenter >= mode.FA_MIN && q.trueCenter <= 400);
  });

  it("sessionQuestionIndex'e göre DOĞRU aşamayı üretir (stageForIndex ile TUTARLI)", () => {
    assert.equal(mode.createQuestion("medium", { sessionQuestionIndex: 0 }).stage, 1);
    assert.equal(mode.createQuestion("medium", { sessionQuestionIndex: mode.STAGE1_QUESTION_COUNT }).stage, 2);
    assert.equal(mode.createQuestion("medium", { sessionQuestionIndex: mode.STAGE2_QUESTION_COUNT }).stage, 3);
  });

  it("aşama 2'de şıklar TAM 2 (A/B), aşama 1/3'te diff.options kadar", () => {
    const q2 = mode.createQuestion("medium", { sessionQuestionIndex: mode.STAGE1_QUESTION_COUNT });
    assert.equal(q2.choices.length, 2);
    assert.ok(q2.choices.some(c => c.source === "a") && q2.choices.some(c => c.source === "b"));
  });

  it("rng ENJEKTE edilince DETERMİNİSTİK — aynı seed AYNI soruyu üretir", () => {
    const q1 = mode.createQuestion("medium", { sessionQuestionIndex: 0, rng: mulberry32(42) });
    const q2 = mode.createQuestion("medium", { sessionQuestionIndex: 0, rng: mulberry32(42) });
    assert.equal(q1.trueCenter, q2.trueCenter);
    assert.equal(q1.correctSource, q2.correctSource);
    assert.equal(q1.correctCutDb, q2.correctCutDb);
  });
});

describe("evaluateAnswer() — üç aşama için ayrı mantık", () => {
  it("AŞAMA 1: merkez TAM eşleşince doğru, ufak bir yuvarlama farkı bile YANLIŞ sayılır (şıklı, tolerans yok)", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: 0, rng: mulberry32(7) });
    const correctResult = mode.evaluateAnswer(q, { center: Math.round(q.trueCenter) });
    assert.equal(correctResult.correct, true);
    const wrongResult = mode.evaluateAnswer(q, { center: Math.round(q.trueCenter) + 50 });
    assert.equal(wrongResult.correct, false);
  });

  it("AŞAMA 2: doğru kaynak seçilince doğru, diğeri yanlış", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: mode.STAGE1_QUESTION_COUNT, rng: mulberry32(9) });
    const other = q.correctSource === "a" ? "b" : "a";
    assert.equal(mode.evaluateAnswer(q, { source: q.correctSource }).correct, true);
    assert.equal(mode.evaluateAnswer(q, { source: other }).correct, false);
  });

  it("AŞAMA 3: doğru (negatif) kesim değeri seçilince doğru + maskOpenedPct=100; uzak bir şık YANLIŞ + düşük skor", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: mode.STAGE2_QUESTION_COUNT, rng: mulberry32(11) });
    const correctCutDbNeg = -Math.round(q.correctCutDb * 10) / 10;
    const correctResult = mode.evaluateAnswer(q, { cutDb: correctCutDbNeg });
    assert.equal(correctResult.correct, true);
    assert.equal(correctResult.maskOpenedPct, 100);

    const farOff = correctCutDbNeg - q.cutStepDb * 3;
    const wrongResult = mode.evaluateAnswer(q, { cutDb: farOff });
    assert.equal(wrongResult.correct, false);
    assert.ok(wrongResult.maskOpenedPct < 100);
    assert.ok(wrongResult.maskOpenedPct >= 0);
  });
});

describe("calculateXP() — sağlamlık + aşama çarpanı", () => {
  it("yanlış cevapta 0 XP", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: 0 });
    assert.equal(mode.calculateXP(q, { correct: false }, false, "medium", {}), 0);
  });
  it("AŞAMA 3, AŞAMA 1'den daha fazla XP verir (AYNI zorluk/combo/context altında — daha çok bilgi/hassasiyet gerektiriyor)", () => {
    const q1 = mode.createQuestion("medium", { sessionQuestionIndex: 0 });
    const q3 = mode.createQuestion("medium", { sessionQuestionIndex: mode.STAGE2_QUESTION_COUNT });
    const ctx = { combo: 0, timeLeft: 0, roundDuration: 10, xpMultiplier: 1 };
    const xp1 = mode.calculateXP(q1, { correct: true }, false, "medium", ctx);
    const xp3 = mode.calculateXP(q3, { correct: true }, false, "medium", ctx);
    assert.ok(xp3 > xp1, `stage3 XP (${xp3}) stage1'den (${xp1}) fazla olmalı`);
  });
  it("XP hiçbir zaman negatif değil", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: 0 });
    const xp = mode.calculateXP(q, { correct: true }, true, "medium", { combo: 0, timeLeft: 0, roundDuration: 10, xpMultiplier: 0.1 });
    assert.ok(xp >= 0);
  });
});

describe("applyProcessing() — İKİ BAĞIMSIZ peaking BiquadFilterNode, sahte audioCtx ile", () => {
  it("filterA/filterB İKİSİ de trueCenter frekansında, gain=0 (ÖNCE durumu) ile başlar", () => {
    const created = [];
    const fakeAudioCtx = {
      createBiquadFilter: () => {
        const f = { type: "", frequency: { value: 0 }, Q: { value: 0 }, gain: { value: 0 } };
        created.push(f);
        return f;
      }
    };
    const q = mode.createQuestion("medium", { sessionQuestionIndex: 0 });
    const { filterA, filterB } = mode.applyProcessing(q, { audioCtx: fakeAudioCtx });
    assert.equal(created.length, 2, "İKİ ayrı filtre kurulmalı");
    [filterA, filterB].forEach(f => {
      assert.equal(f.type, "peaking");
      assert.equal(f.frequency.value, q.trueCenter);
      assert.equal(f.gain.value, 0, "başlangıçta HER İKİSİ de gain=0 — maskeleme HÂLÂ orada");
    });
    assert.notEqual(filterA, filterB, "filterA/filterB AYRI node'lar olmalı");
  });
});

// ADIM 1-3'ün (Kesim Noktası/dB Seviyesi/Boost-Cut) AYNI merkezi eğri deseni —
// bu mod da SIFIRDAN bağlandığı için "kolaylaşma yok" invaryantı node ile
// hesaplanıp KALIBRE EDİLDİ (bkz. mode dosyasının CAKISMA_CURVE_CONFIG notu).
describe("paramsForDifficultyPosition() — merkezi zorluk eğrisi", () => {
  it("position arttıkça regionWidthOct/cutStepDb PÜRÜZSÜZ (monoton) KÜÇÜLÜR (küçük=zor)", () => {
    let prevRegion = Infinity, prevCut = Infinity;
    for (let lvl = 1; lvl <= mode.CAKISMA_CURVE_CONFIG.LEVEL_CAP; lvl++) {
      const p = mode.paramsForDifficultyPosition(lvl);
      assert.ok(p.regionWidthOct <= prevRegion + 1e-9, `seviye ${lvl}'de regionWidthOct azalmadı`);
      assert.ok(p.cutStepDb <= prevCut + 1e-9, `seviye ${lvl}'de cutStepDb azalmadı`);
      prevRegion = p.regionWidthOct; prevCut = p.cutStepDb;
    }
  });

  it("seviye 1'de config'in AT_1 değerlerini birebir döner", () => {
    const p = mode.paramsForDifficultyPosition(1);
    assert.equal(p.regionWidthOct, mode.CAKISMA_CURVE_CONFIG.REGION_WIDTH_OCT_AT_1);
    assert.equal(p.cutStepDb, mode.CAKISMA_CURVE_CONFIG.CUT_STEP_DB_AT_1);
  });

  it("her representativeLevelForTier(tier)'da eğri değeri eski STATİK DIFFICULTY tablosundan KOLAY ÇIKMAZ ('kolaylaşma yok' invaryantı)", () => {
    ["easy", "medium", "hard", "pro"].forEach(tier => {
      const lvl = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(lvl);
      const staticDiff = mode.DIFFICULTY[tier];
      assert.ok(p.regionWidthOct <= staticDiff.regionWidthOct + 1e-9, `${tier}: regionWidthOct ${p.regionWidthOct} > statik ${staticDiff.regionWidthOct}`);
      assert.ok(p.cutStepDb <= staticDiff.cutStepDb + 1e-9, `${tier}: cutStepDb ${p.cutStepDb} > statik ${staticDiff.cutStepDb}`);
    });
  });
});

describe("createQuestion(settings.difficultyPosition) entegrasyonu", () => {
  it("difficultyPosition VERİLMEZSE davranış eski statik tabloyla BİREBİR aynı kalır (proplus dahil): timeSec statik", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const q = mode.createQuestion(level, { sessionQuestionIndex: 0 });
      assert.equal(q.timeSec, mode.DIFFICULTY[level].time);
    }
  });
  it("proplus'ta difficultyPosition verilse BİLE eğri devreye girmez (diğer sekiz modun AYNI Z5 kararı)", () => {
    const q = mode.createQuestion("proplus", { sessionQuestionIndex: 0, difficultyPosition: 20 });
    assert.equal(q.timeSec, mode.DIFFICULTY.proplus.time);
  });
});

describe("getMeta() sözleşme alanları", () => {
  it("id/motor/kulaklikGerekli/pairs/difficulty/choiceOnly tanımlı, motor=3", () => {
    const meta = mode.getMeta();
    assert.equal(meta.id, "frekans-cakismasi");
    assert.equal(meta.motor, 3);
    assert.equal(meta.kulaklikGerekli, true);
    assert.deepEqual(meta.uyumluKaynaklar, [], "TEK-kaynak listesi bu modda BİLEREK boş — pairs kullanılıyor");
    assert.ok(Array.isArray(meta.pairs) && meta.pairs.length >= 2, "en az bir hazır çift + own");
    assert.ok(meta.pairs.some(p => p.id === "own"));
    assert.equal(meta.choiceOnly, true);
  });
});

describe("sourcePeakFreq() / dominantSourceAt() — G57'nin dekoratif 'hangi kaynak orada güçlü' modeli", () => {
  it("sourcePeakFreq: A trueCenter'ın ALTINDA, B trueCenter'ın ÜSTÜNDE", () => {
    const trueCenter = 1000;
    assert.ok(mode.sourcePeakFreq(trueCenter, "a") < trueCenter);
    assert.ok(mode.sourcePeakFreq(trueCenter, "b") > trueCenter);
  });
  it("dominantSourceAt: A'nın kendi tepe noktasında A baskın, B'nin tepe noktasında B baskın", () => {
    const trueCenter = 1000;
    assert.equal(mode.dominantSourceAt(mode.sourcePeakFreq(trueCenter, "a"), trueCenter), "a");
    assert.equal(mode.dominantSourceAt(mode.sourcePeakFreq(trueCenter, "b"), trueCenter), "b");
  });
});

describe("teachingText() — YANLIŞ cevapta öğretici açıklama (G57: 'SoundGym yanlış der geçer, biz öğretiriz')", () => {
  it("AŞAMA 1 doğru cevap metni KORUNDU (regresyon) — 'Doğru!' ile başlar, iki kaynağı ve merkezi adlandırır", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: 0, rng: mulberry32(7) });
    const text = mode.teachingText(q, { center: Math.round(q.trueCenter) });
    assert.match(text, /^Doğru!/);
    assert.ok(text.includes(q.pair.labelA) && text.includes(q.pair.labelB));
  });

  it("AŞAMA 1 yanlış cevap: 'Yanlış' ile başlar, KULLANICININ seçtiği frekansı + doğru frekansı + hangi kaynağın orada güçlü/zayıf olduğunu adlandırır", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: 0, rng: mulberry32(7) });
    const guessAtA = mode.sourcePeakFreq(q.trueCenter, "a");
    const textA = mode.teachingText(q, { center: guessAtA });
    assert.match(textA, /^Yanlış/);
    assert.ok(textA.includes(q.pair.labelA), "A'nın tepesinde tahmin edilince A 'güçlü' olarak adlandırılmalı");
    assert.ok(textA.includes(q.pair.labelB), "diğer kaynak (B) 'zayıf' olarak adlandırılmalı");
    assert.ok(textA.includes(formatHz(q.trueCenter)), "doğru frekans metinde geçmeli");

    const guessAtB = mode.sourcePeakFreq(q.trueCenter, "b");
    const textB = mode.teachingText(q, { center: guessAtB });
    assert.match(textB, /^Yanlış/);
    assert.notEqual(textA, textB, "kullanıcının FARKLI seçimleri farklı (kişiselleşmiş) metin üretmeli");
  });

  it("AŞAMA 2 doğru cevap metni KORUNDU (regresyon) — 'Doğru!' ile başlar", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: mode.STAGE1_QUESTION_COUNT, rng: mulberry32(9) });
    const text = mode.teachingText(q, { source: q.correctSource });
    assert.match(text, /^Doğru!/);
  });

  it("AŞAMA 2 yanlış cevap: 'Yanlış' ile başlar, kullanıcının SEÇTİĞİ (yanlış) kaynağı VE doğru kaynağı adlandırır", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: mode.STAGE1_QUESTION_COUNT, rng: mulberry32(9) });
    const wrongSource = q.correctSource === "a" ? "b" : "a";
    const wrongLabel = wrongSource === "a" ? q.pair.labelA : q.pair.labelB;
    const correctLabelText = q.correctSource === "a" ? q.pair.labelA : q.pair.labelB;
    const text = mode.teachingText(q, { source: wrongSource });
    assert.match(text, /^Yanlış/);
    assert.ok(text.includes(wrongLabel), "kullanıcının seçtiği (yanlış) kaynak metinde geçmeli");
    assert.ok(text.includes(correctLabelText), "doğru kaynak da metinde geçmeli");
  });

  it("AŞAMA 3 doğru cevap metni KORUNDU (regresyon) — task'ın kendi örnek formatı ('...yer açıldı...')", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: mode.STAGE2_QUESTION_COUNT, rng: mulberry32(11) });
    const correctCutDbNeg = -Math.round(q.correctCutDb * 10) / 10;
    const text = mode.teachingText(q, { cutDb: correctCutDbNeg });
    assert.ok(text.includes("yer açıldı"));
  });

  it("AŞAMA 3 yanlış cevap — AZ kestiyse 'az kestin' + ayrışmadı anlatısı", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: mode.STAGE2_QUESTION_COUNT, rng: mulberry32(11) });
    const correctCutDbNeg = -Math.round(q.correctCutDb * 10) / 10;
    const underCutDb = correctCutDbNeg + q.cutStepDb * 2.5; // sıfıra daha yakın = daha AZ kesim (büyüklük küçük)
    const text = mode.teachingText(q, { cutDb: underCutDb });
    assert.ok(text.includes("az kestin"), text);
    assert.ok(text.includes("maske hâlâ duruyor"), text);
  });

  it("AŞAMA 3 yanlış cevap — ÇOK kestiyse 'çok kestin' + zayıflama anlatısı", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: mode.STAGE2_QUESTION_COUNT, rng: mulberry32(11) });
    const correctCutDbNeg = -Math.round(q.correctCutDb * 10) / 10;
    const overCutDb = correctCutDbNeg - q.cutStepDb * 2.5; // daha negatif = daha BÜYÜK büyüklük = daha ÇOK kesim
    const text = mode.teachingText(q, { cutDb: overCutDb });
    assert.ok(text.includes("çok kestin"), text);
    assert.ok(text.includes("gereksiz zayıfladı"), text);
  });

  it("AŞAMA 3 yanlış ama DOĞRUYA ÇOK YAKIN (maskOpenedPct>=75) — ince/nazik bir ton, kaba az/çok DEĞİL", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: mode.STAGE2_QUESTION_COUNT, rng: mulberry32(11) });
    const correctCutDbNeg = -Math.round(q.correctCutDb * 10) / 10;
    const closeCutDb = correctCutDbNeg + q.cutStepDb * 0.9; // stepsAway=1 → maskOpenedPct=75
    const result = mode.evaluateAnswer(q, { cutDb: closeCutDb });
    assert.ok(result.maskOpenedPct >= 75, `test önkoşulu: maskOpenedPct>=75 olmalıydı, ${result.maskOpenedPct} geldi`);
    const text = mode.teachingText(q, { cutDb: closeCutDb });
    assert.ok(text.includes("çok yakındın"), text);
  });

  it("üç aşamada da yanlış cevap metni DOĞRU cevap metninden FARKLI (gerçekten dallanıyor)", () => {
    const q1 = mode.createQuestion("medium", { sessionQuestionIndex: 0, rng: mulberry32(3) });
    assert.notEqual(
      mode.teachingText(q1, { center: Math.round(q1.trueCenter) }),
      mode.teachingText(q1, { center: Math.round(mode.sourcePeakFreq(q1.trueCenter, "a")) })
    );
    const q2 = mode.createQuestion("medium", { sessionQuestionIndex: mode.STAGE1_QUESTION_COUNT, rng: mulberry32(5) });
    const wrongSource2 = q2.correctSource === "a" ? "b" : "a";
    assert.notEqual(mode.teachingText(q2, { source: q2.correctSource }), mode.teachingText(q2, { source: wrongSource2 }));
  });
});

describe("getFeedbackData() — yanlış cevapta da title/detail dolu, showResult=true (getFeedbackData SAF kaldı)", () => {
  it("yanlış cevapta title='Iskaladın', detail teachingText'in YANLIŞ dalıyla AYNI metni taşır", () => {
    const q = mode.createQuestion("medium", { sessionQuestionIndex: 0, rng: mulberry32(7) });
    const answer = { center: Math.round(mode.sourcePeakFreq(q.trueCenter, "a")) };
    const fb = mode.getFeedbackData(q, answer, { gained: 0 });
    assert.equal(fb.title, "Iskaladın");
    assert.equal(fb.detail, mode.teachingText(q, answer));
    assert.equal(fb.showResult, true);
    assert.equal(fb.result.correct, false);
  });
});

describe("EXAM_* bayrakları (G50 şablonunun G51'e mirası)", () => {
  it("EXAM_ENABLED=true, EXAM_DIFFICULTY='pro', EXAM_WEAK_AREA='zone' (çakışma FREKANSTA)", () => {
    assert.equal(mode.EXAM_ENABLED, true);
    assert.equal(mode.EXAM_DIFFICULTY, "pro");
    assert.equal(mode.EXAM_WEAK_AREA, "zone");
    assert.ok(mode.DIFFICULTY[mode.EXAM_DIFFICULTY]);
  });
  it("FA_ZONES re-export edilir (getWeakArea'nın zone dalı bunu okur)", () => {
    assert.ok(Array.isArray(mode.FA_ZONES) && mode.FA_ZONES.length > 0);
  });
});

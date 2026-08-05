// dB Seviyesi moduna özel testler: seans içi soru sırasına bağlı yön-gizleme rampası
// (Kesim Noktası'ndaki tip-gizleme deseninin AYNISI), şık üretimi (ondalıklı, işaretli,
// çakışmasız, zorlukla yakınlaşan), merkezi zorluk eğrisine bağlanma + "Sabit modda
// kolaylaşma yok" invaryantı, evaluateAnswer'ın yön+miktar mantığı, applyProcessing'in
// doğru linear gain'i kurması.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/db-seviyesi.js";
import { representativeLevelForTier } from "../www/js/core/difficulty-curve.js";

describe("dB Seviyesi — createQuestion() genel sözleşme", () => {
  for (const level of Object.keys(mode.DIFFICULTY)) {
    it(`createQuestion("${level}") geçerli bir soru üretir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      assert.equal(q.mode, "dblevel");
      assert.equal(q.difficulty, level);
      assert.equal(typeof q.dbDelta, "number");
      assert.notEqual(q.dbDelta, 0, "dbDelta hiçbir zaman tam sıfır olmamalı (yön belirsizleşir)");
      assert.equal(typeof q.hintUsed, "boolean");
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

  it("her zorlukta üretilen şık sayısı DIFFICULTY.options'a TAM eşit (difficultyPosition verilmezse)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 30; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false, sessionQuestionIndex: i % 8 });
        assert.equal(q.choices.length, mode.DIFFICULTY[level].options, `${level}: ${q.choices.length} şık`);
      }
    }
  });

  it("kolay(3) < orta(4) < zor(5) < pro(6) — DIFFICULTY tablosu bu sırayı garanti eder", () => {
    assert.ok(mode.DIFFICULTY.easy.options < mode.DIFFICULTY.medium.options);
    assert.ok(mode.DIFFICULTY.medium.options < mode.DIFFICULTY.hard.options);
    assert.ok(mode.DIFFICULTY.hard.options < mode.DIFFICULTY.pro.options);
  });

  it("kolaydan pro'ya dbDelta (uygulanan büyüklük) KÜÇÜLÜR — istatistiksel olarak (N=300 örnek/zorluk, jitter var)", () => {
    const N = 300;
    let easySum = 0, proSum = 0;
    for (let i = 0; i < N; i++) {
      easySum += Math.abs(mode.createQuestion("easy", { source: "pink", boss: false }).dbDelta);
      proSum += Math.abs(mode.createQuestion("pro", { source: "pink", boss: false }).dbDelta);
    }
    assert.ok(proSum / N < easySum / N, "pro ortalama olarak easy'den DAHA KÜÇÜK |dbDelta| üretmeliydi");
  });
});

describe("dB Seviyesi — şık üretimi (ondalıklı, işaretli, çakışmasız)", () => {
  it("dbDelta HİÇBİR ZAMAN yuvarlak bir tam sayı DEĞİL (2 ondalık hane taşır) — 2000 örnek", () => {
    let allWhole = true;
    for (let i = 0; i < 2000; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      if (q.dbDelta !== Math.trunc(q.dbDelta)) { allWhole = false; break; }
    }
    assert.equal(allWhole, false, "2000 örnekte HİÇ ondalıklı değer çıkmadı — jitter çalışmıyor olabilir");
  });

  it("her turda doğru şık TAM BİR kez var, değeri q.dbDelta'ya eşit", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 40; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false, sessionQuestionIndex: i % 6 });
        const correctChoices = q.choices.filter(c => c.correct);
        assert.equal(correctChoices.length, 1, `${level}: ${correctChoices.length} doğru şık`);
        assert.ok(Math.abs(correctChoices[0].value - q.dbDelta) < 1e-9);
      }
    }
  });

  it("hiçbir turda şıklar arasında ÇAKIŞMA (aynı değer) yok — 3000 tur", () => {
    let dup = 0;
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 150; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false, sessionQuestionIndex: i % 8 });
        const vals = q.choices.map(c => c.value);
        if (new Set(vals).size !== vals.length) dup++;
      }
    }
    assert.equal(dup, 0, `${dup} turda çakışan şık değeri bulundu`);
  });

  it("directionRevealed=true iken TÜM şıklar dbDelta ile AYNI işareti taşır", () => {
    for (let i = 0; i < 200; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false, sessionQuestionIndex: 0 });
      assert.equal(q.directionRevealed, true);
      const trueSign = Math.sign(q.dbDelta);
      q.choices.forEach(c => assert.equal(Math.sign(c.value), trueSign, `karışık işaret: ${c.value} (doğru: ${q.dbDelta})`));
    }
  });

  it("directionRevealed=false iken şıklar arasında EN AZ bir ters işaretli çeldirici var (options>=3 olduğu sürece)", () => {
    let sawMixed = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const q = mode.createQuestion("hard", { source: "pink", boss: false, sessionQuestionIndex: 5 });
      assert.equal(q.directionRevealed, false);
      const signs = new Set(q.choices.map(c => Math.sign(c.value)));
      if (signs.size > 1) sawMixed++;
    }
    assert.ok(sawMixed / N > 0.9, `sadece ${sawMixed}/${N} turda karışık işaret görüldü — flip mekanizması çalışmıyor olabilir`);
  });

  it("çeldirici mesafesi HER ZAMAN DB_TOLERANCE'tan büyük (yanlış şık asla 'doğru' sayılmaz)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const step = mode.DISTRACTOR_STEP_DB[level];
      assert.ok(step > mode.DB_TOLERANCE, `${level}: step ${step} <= tolerans ${mode.DB_TOLERANCE}`);
    }
    assert.ok(mode.DB_CURVE_CONFIG.STEP_FLOOR > mode.DB_TOLERANCE);
    assert.ok(mode.DB_CURVE_CONFIG.STEP_AT_CAP > mode.DB_TOLERANCE);
  });
});

describe("dB Seviyesi — seans içi yön-gizleme rampası (Kesim Noktası'ndaki AYNI desen)", () => {
  it("ilk DIRECTION_REVEAL_QUESTION_COUNT soruda yön SÖYLENİR, sonrasında GİZLENİR — tüm zorluklarda", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let idx = 0; idx <= 7; idx++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false, sessionQuestionIndex: idx });
        assert.equal(q.directionRevealed, idx < mode.DIRECTION_REVEAL_QUESTION_COUNT, `${level}/idx${idx}`);
      }
    }
  });

  it("sessionQuestionIndex verilmezse ilk soru gibi davranır (directionRevealed=true, geriye dönük güvenli varsayılan)", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    assert.equal(q.directionRevealed, true);
  });
});

describe("dB Seviyesi — evaluateAnswer (yön + miktar)", () => {
  it("tam isabet: correct=true, directionOk=true, diff=0", () => {
    const q = { dbDelta: 2.5 };
    const r = mode.evaluateAnswer(q, 2.5);
    assert.equal(r.correct, true);
    assert.equal(r.directionOk, true);
    assert.equal(r.diff, 0);
  });

  it("DB_TOLERANCE sınırı: içeride doğru, dışarıda yanlış", () => {
    const q = { dbDelta: 2.0 };
    const justInside = mode.evaluateAnswer(q, 2.0 + mode.DB_TOLERANCE * 0.99);
    const justOutside = mode.evaluateAnswer(q, 2.0 + mode.DB_TOLERANCE * 1.5);
    assert.equal(justInside.correct, true);
    assert.equal(justOutside.correct, false);
  });

  it("yön doğru, miktar yanlış: directionOk=true, correct=false", () => {
    const q = { dbDelta: 3.0 };
    const r = mode.evaluateAnswer(q, 1.5);
    assert.equal(r.directionOk, true);
    assert.equal(r.correct, false);
  });

  it("yön yanlış (ters işaret): directionOk=false", () => {
    const q = { dbDelta: 2.0 };
    const r = mode.evaluateAnswer(q, -2.0);
    assert.equal(r.directionOk, false);
    assert.equal(r.correct, false);
  });

  it("cevap {value} nesnesi olarak da gelebilir (şıklı arayüzden)", () => {
    const q = { dbDelta: 1.5 };
    const r = mode.evaluateAnswer(q, { value: 1.5 });
    assert.equal(r.correct, true);
  });
});

describe("dB Seviyesi — calculateXP sağlamlık", () => {
  it("yanlış cevapta 0 döner", () => {
    const q = { boss: false };
    const result = { correct: false };
    assert.equal(mode.calculateXP(q, result, false, "medium", {}), 0);
  });

  it("doğru cevapta negatif olmaz, makul bir üst sınırı aşmaz", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const q = { boss: true };
      const result = { correct: true };
      const gained = mode.calculateXP(q, result, false, level, { combo: 20, timeLeft: 100, roundDuration: 10, xpMultiplier: 1.5 });
      assert.ok(gained >= 0);
      const maxPlausible = mode.DIFFICULTY[level].xp * 2.4 * 1.65 * 1.2 * 1.5 + 5;
      assert.ok(gained <= maxPlausible, `${level}: XP mantıksız yüksek: ${gained} > ${maxPlausible}`);
    }
  });

  it("ipucu kullanınca XP yarıya iner (hintPenalty)", () => {
    const q = { boss: false };
    const result = { correct: true };
    const withoutHint = mode.calculateXP(q, result, false, "medium", { combo: 0, timeLeft: 0, roundDuration: 10 });
    const withHint = mode.calculateXP(q, result, true, "medium", { combo: 0, timeLeft: 0, roundDuration: 10 });
    assert.ok(withHint < withoutHint);
  });
});

describe("dB Seviyesi — öğretici metin (teachingText/getFeedbackData)", () => {
  it("DOĞRU durumda metin işaretli dB değerini VE bir algısal-etki cümlesini içerir, teknik jargon (JND/RMS) yok", () => {
    const q = { dbDelta: 3.25 };
    const text = mode.teachingText(q, 3.25);
    assert.match(text, /\+3\.25 dB/);
    assert.doesNotMatch(text, /JND|RMS|logaritmik|desibel formülü/i);
  });

  it("YÖN DOĞRU, MİKTAR YANLIŞ durumda hem senin dediğin hem doğru değer geçer", () => {
    const q = { dbDelta: 3.0 };
    const text = mode.teachingText(q, 1.5);
    assert.match(text, /\+1\.50 dB/);
    assert.match(text, /\+3\.00 dB/);
  });

  it("YÖN YANLIŞ durumda 'Ters yön' ifadesi ve gerçek yön geçer, miktar hatası AYRICA anlatılmaz", () => {
    const q = { dbDelta: 2.0 };
    const text = mode.teachingText(q, -2.0);
    assert.match(text, /Ters yön/i);
    assert.match(text, /AÇILDI/);
  });

  it("üç durumun HİÇBİRİ boş/bozuk metin üretmez (6 örnek: 2 yön × 3 durum)", () => {
    for (const dbDelta of [2.0, -2.0]) {
      const q = { dbDelta };
      const cases = [
        mode.teachingText(q, dbDelta),               // doğru
        mode.teachingText(q, dbDelta > 0 ? dbDelta - 1 : dbDelta + 1), // yön doğru, miktar yanlış
        mode.teachingText(q, -dbDelta)                // yön yanlış
      ];
      cases.forEach((text, i) => {
        assert.ok(text && text.length >= 10, `dbDelta=${dbDelta} durum ${i}: kısa/boş metin`);
        assert.doesNotMatch(text, /undefined|NaN|\[object/i, `dbDelta=${dbDelta} durum ${i}: bozuk metin: ${text}`);
      });
    }
  });

  it("getFeedbackData showResult HER ZAMAN true (bu modda zengin panel yok, #feedbackBox TEK yüzey)", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    const correctFb = mode.getFeedbackData(q, q.dbDelta, { gained: 10 });
    const wrongFb = mode.getFeedbackData(q, q.dbDelta + 5, { gained: 0 });
    assert.equal(correctFb.showResult, true);
    assert.equal(wrongFb.showResult, true);
    assert.equal(correctFb.panel, null);
    assert.equal(wrongFb.panel, null);
  });

  it("getFeedbackData title'ı üç durumu ayırt eder (Doğru! / Yakın ama kaçtı / Ters yöne gittin)", () => {
    const q = { dbDelta: 2.0 };
    assert.equal(mode.getFeedbackData(q, 2.0).title, "Doğru!");
    assert.equal(mode.getFeedbackData(q, 1.0).title, "Yakın ama kaçtı");
    assert.equal(mode.getFeedbackData(q, -2.0).title, "Ters yöne gittin");
  });
});

describe("dB Seviyesi — applyProcessing (doğru linear gain, sahte audioCtx ile)", () => {
  it("dbDelta'yı 10^(dB/20) linear gain'e çevirip TEK GainNode döner", () => {
    const created = [];
    const fakeAudioCtx = {
      createGain: () => {
        const g = { gain: { value: 0 } };
        created.push(g);
        return g;
      }
    };
    for (const dbDelta of [3, -3, 0.5, -0.5, 6]) {
      const { filters } = mode.applyProcessing({ dbDelta }, { audioCtx: fakeAudioCtx });
      assert.equal(filters.length, 1);
      const expected = Math.pow(10, dbDelta / 20);
      assert.ok(Math.abs(filters[0].gain.value - expected) < 1e-9, `dbDelta=${dbDelta}: beklenen ${expected}, gelen ${filters[0].gain.value}`);
    }
    assert.equal(created.length, 5);
  });

  it("+dB'de linear gain 1'in üstünde, -dB'de 1'in altında (yön doğru uygulanıyor)", () => {
    const fakeAudioCtx = { createGain: () => ({ gain: { value: 0 } }) };
    const boost = mode.applyProcessing({ dbDelta: 3 }, { audioCtx: fakeAudioCtx }).filters[0];
    const cut = mode.applyProcessing({ dbDelta: -3 }, { audioCtx: fakeAudioCtx }).filters[0];
    assert.ok(boost.gain.value > 1);
    assert.ok(cut.gain.value < 1);
  });
});

// ADIM 1-3'teki (Kesim Noktası/Frekans Bulma) AYNI merkezi eğri deseni — ama bu mod
// SIFIRDAN bağlandığı için ADIM 3'ün SONRADAN kalibrasyon düzeltmesi burada baştan
// uygulandı (bkz. dosya başı not).
describe("dB Seviyesi — paramsForDifficultyPosition() (merkezi zorluk eğrisi)", () => {
  it("position arttıkça dbDelta PÜRÜZSÜZ (monoton) KÜÇÜLÜR", () => {
    let prev = Infinity;
    for (let p = 1; p <= 20; p += 0.25) {
      const { dbDelta } = mode.paramsForDifficultyPosition(p);
      assert.ok(dbDelta <= prev + 1e-9, `position ${p}'de dbDelta azalmadı`);
      prev = dbDelta;
    }
  });

  it("position=1'de AT_1, position=LEVEL_CAP'te AT_CAP değerlerini birebir döner", () => {
    const cfg = mode.DB_CURVE_CONFIG;
    const p1 = mode.paramsForDifficultyPosition(1);
    const pCap = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    assert.ok(Math.abs(p1.dbDelta - cfg.DB_AT_1) < 1e-9);
    assert.ok(Math.abs(pCap.dbDelta - cfg.DB_AT_CAP) < 1e-9);
  });

  it("LEVEL_CAP'in ÇOK ötesinde dbDelta/step bir TABANIN altına inmez", () => {
    const cfg = mode.DB_CURVE_CONFIG;
    const far = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP + 1000);
    assert.ok(far.dbDelta >= cfg.DB_FLOOR - 1e-9);
    assert.ok(far.step >= cfg.STEP_FLOOR - 1e-9);
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
});

describe("dB Seviyesi — createQuestion(settings.difficultyPosition) entegrasyonu", () => {
  it("difficultyPosition VERİLİRSE üretilen şık sayısı paramsForDifficultyPosition().options'a eşit", () => {
    for (const p of [1, 5, 10, 15, 20]) {
      const expectedOptions = mode.paramsForDifficultyPosition(p).options;
      const q = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: p });
      assert.equal(q.choices.length, expectedOptions, `position ${p}: beklenen ${expectedOptions}, gelen ${q.choices.length}`);
    }
  });

  it("difficultyPosition VERİLMEZSE davranış eski statik tabloyla BİREBİR aynı kalır (proplus dahil)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 15; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.choices.length, mode.DIFFICULTY[level].options);
        assert.equal(q.timeSec, mode.DIFFICULTY[level].time);
      }
    }
  });

  it("proplus'ta difficultyPosition verilse BİLE eğri devreye girmez (Z5 kararıyla aynı çizgi)", () => {
    for (let i = 0; i < 10; i++) {
      const q = mode.createQuestion("proplus", { source: "pink", boss: false, difficultyPosition: 20 });
      assert.equal(q.choices.length, mode.DIFFICULTY.proplus.options);
    }
  });
});

// "Sabit" modun eğriye bağlanması (app.js:currentDifficultyPosition'ın Sabit dalıyla
// AYNI kompozisyon: representativeLevelForTier(tier) → paramsForDifficultyPosition())
// — Kesim Noktası/Frekans Bulma'nın ADIM 3'te SONRADAN eklediği "kolaylaşma yok"
// invaryantı burada baştan var.
describe("dB Seviyesi — Sabit mod eğriye bağlı ('kolaylaşma yok' invaryantı)", () => {
  const TIERS = ["easy", "medium", "hard", "pro"];

  it("her tier'da: dbDelta/step eski statikten BÜYÜK DEĞİL (kolaylaşma yok — küçük=zor)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      const oldStep = mode.DISTRACTOR_STEP_DB[tier];
      assert.ok(p.dbDelta <= old.dbDelta + 1e-9, `${tier}: dbDelta ${p.dbDelta} > eski ${old.dbDelta}`);
      assert.ok(p.step <= oldStep + 1e-9, `${tier}: step ${p.step} > eski ${oldStep}`);
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
    assert.equal(representativeLevelForTier("pro"), mode.DB_CURVE_CONFIG.LEVEL_CAP);
    const atCap = mode.paramsForDifficultyPosition(mode.DB_CURVE_CONFIG.LEVEL_CAP);
    const proRepr = mode.paramsForDifficultyPosition(representativeLevelForTier("pro"));
    assert.deepEqual(atCap, proRepr);
  });

  it("Sabit modun kompozisyonu uçtan uca doğru şık sayısını üretir", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const expectedOptions = mode.paramsForDifficultyPosition(level).options;
      for (let i = 0; i < 10; i++) {
        const q = mode.createQuestion(tier, { source: "pink", boss: false, difficultyPosition: level });
        assert.equal(q.choices.length, expectedOptions, `${tier}: beklenen ${expectedOptions}, gelen ${q.choices.length}`);
      }
    }
  });
});

describe("dB Seviyesi — getMeta() sözleşme alanları", () => {
  it("id/motor/kulaklikGerekli/uyumluKaynaklar/ucretsiz/videoUrl/difficulty/choiceOnly tanımlı", () => {
    const meta = mode.getMeta();
    assert.equal(meta.id, "db-seviyesi");
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

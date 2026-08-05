// Frekans Bulma moduna özel testler: boost-only kolay/orta kuralı, oktav bazlı
// puanlama (lineer Hz DEĞİL), soru havuzunun frekans aralığı, Pro Plus bant ayrımı,
// odak aralığı (FOCUS_RANGES).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/frekans-bulma.js";
import { representativeLevelForTier } from "../www/js/core/difficulty-curve.js";

describe("Frekans Bulma — boost-only kolay/orta kuralı", () => {
  it("kolay ve orta seviyede gain HER ZAMAN pozitif (sadece boost, kesim yok)", () => {
    for (const level of ["easy", "medium"]) {
      let sawPositive = false;
      for (let i = 0; i < 200; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.ok(q.gain > 0, `${level} seviyede negatif gain üretildi: ${q.gain}`);
        if (q.gain > 0) sawPositive = true;
      }
      assert.ok(sawPositive);
    }
  });

  it("zor ve üstü seviyelerde hem boost hem kesim (negatif gain) görülebilir", () => {
    for (const level of ["hard", "pro"]) {
      let sawPositive = false, sawNegative = false;
      for (let i = 0; i < 200; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        if (q.gain > 0) sawPositive = true;
        if (q.gain < 0) sawNegative = true;
      }
      assert.ok(sawPositive, `${level}: hiç boost görülmedi (200 denemede)`);
      assert.ok(sawNegative, `${level}: hiç kesim görülmedi (200 denemede) — boost-only olmamalıydı`);
    }
  });

  it("boss round'da gain mutlak değeri normal round'dan küçük (daha zor/yakın)", () => {
    const diff = mode.DIFFICULTY.medium;
    const normal = mode.createQuestion("medium", { source: "pink", boss: false });
    const boss = mode.createQuestion("medium", { source: "pink", boss: true });
    assert.ok(Math.abs(normal.gain) <= diff.gain + 1e-9);
    assert.ok(Math.abs(boss.gain) <= diff.gain * 0.75 + 1e-9);
  });
});

describe("Frekans Bulma — puanlama OKTAV bazlı (lineer Hz değil)", () => {
  it("aynı oktav mesafesi, farklı frekans bölgelerinde aynı doğru/yanlış sonucunu verir", () => {
    // 100 Hz'den 0.5 oktav uzak: 100 * 2^0.5 ≈ 141.42 Hz
    // 10000 Hz'den 0.5 oktav uzak: 10000 * 2^0.5 ≈ 14142.1 Hz
    // Lineer Hz farkı KIYASLANAMAYACAK kadar farklı (41.4 Hz vs 4142.1 Hz) ama oktav
    // mesafesi eşit — ikisi de "doğru" sınırının TAM üstünde olmalı (dOct venue 0.5 ile aynı).
    const qLow = { mode: "frequency", freq: 100, gain: 6, q: 2 };
    const qHigh = { mode: "frequency", freq: 10000, gain: 6, q: 2 };

    const lowGuess = 100 * Math.pow(2, 0.5);
    const highGuess = 10000 * Math.pow(2, 0.5);

    const rLow = mode.evaluateAnswer(qLow, lowGuess);
    const rHigh = mode.evaluateAnswer(qHigh, highGuess);

    assert.ok(Math.abs(rLow.dOct - 0.5) < 1e-9);
    assert.ok(Math.abs(rHigh.dOct - 0.5) < 1e-9);
    assert.equal(rLow.correct, rHigh.correct); // ikisi de aynı eşikte aynı sonucu vermeli
  });

  it("0.5 oktav sınırı: içeride doğru, dışarıda yanlış", () => {
    const q = { mode: "frequency", freq: 1000, gain: 6, q: 2 };
    const justInside = mode.evaluateAnswer(q, 1000 * Math.pow(2, 0.49));
    const justOutside = mode.evaluateAnswer(q, 1000 * Math.pow(2, 0.51));
    assert.equal(justInside.correct, true);
    assert.equal(justOutside.correct, false);
  });

  it("lineer Hz farkı büyük ama oktav mesafesi küçükse yine de doğru sayılır (bas bölgesi)", () => {
    // 100 Hz'e göre +30 Hz (130 Hz) lineer olarak "büyük" görünebilir ama oktav mesafesi
    // log2(130/100) ≈ 0.379 oktav — 0.5 sınırının içinde, yani DOĞRU sayılmalı.
    const q = { mode: "frequency", freq: 100, gain: 6, q: 2 };
    const result = mode.evaluateAnswer(q, 130);
    assert.ok(result.dOct < 0.5);
    assert.equal(result.correct, true);
  });

  it("kalite etiketleri oktav eşiklerine göre değişir (0.17 / 0.33 / 0.5)", () => {
    const q = { mode: "frequency", freq: 1000, gain: 6, q: 2 };
    const tam = mode.evaluateAnswer(q, 1000 * Math.pow(2, 0.10));
    const cokIyi = mode.evaluateAnswer(q, 1000 * Math.pow(2, 0.25));
    const dogru = mode.evaluateAnswer(q, 1000 * Math.pow(2, 0.45));
    assert.equal(tam.quality, "🎯 Tam isabet!");
    assert.equal(cokIyi.quality, "Çok iyi!");
    assert.equal(dogru.quality, "Doğru!");
  });
});

describe("Frekans Bulma — soru havuzu aralığı (\"odak aralığı\" analogu)", () => {
  it(`tüm seviyelerde üretilen frekanslar sabit havuz aralığında kalır (${mode.FA_MIN}-${mode.FA_MAX} Hz)`, () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 40; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        const freqs = q.mode === "proplus" ? q.bands.map(b => b.freq) : [q.freq];
        freqs.forEach(f => {
          assert.ok(f >= mode.FA_MIN, `${f} < FA_MIN (${mode.FA_MIN})`);
          assert.ok(f <= mode.FA_MAX, `${f} > FA_MAX (${mode.FA_MAX})`);
        });
      }
    }
  });

  it("faXToF/faFToX havuz sınırlarıyla tutarlı (round-trip)", () => {
    const w = 1200;
    for (const f of [mode.FA_MIN, 1000, mode.FA_MAX]) {
      const x = mode.faFToX(f, w);
      const back = mode.faXToF(x, w);
      assert.ok(Math.abs(back - f) < 0.01);
    }
  });
});

describe("Frekans Bulma — Pro Plus bant üretimi", () => {
  it("buildProPlusBands istenen sayıda, birbirinden en az ~0.9 oktav ayrık bant üretir", () => {
    for (let i = 0; i < 30; i++) {
      const bands = mode.buildProPlusBands(4, 8);
      assert.equal(bands.length, 4);
      for (let a = 0; a < bands.length; a++) {
        for (let b = a + 1; b < bands.length; b++) {
          const dOct = Math.abs(Math.log2(bands[a].freq / bands[b].freq));
          assert.ok(dOct >= 0.9 - 1e-9, `bantlar çok yakın: ${bands[a].freq} / ${bands[b].freq}`);
        }
      }
    }
  });

  it("bantlar frekansa göre artan sırada döner", () => {
    const bands = mode.buildProPlusBands(4, 8);
    for (let i = 1; i < bands.length; i++) {
      assert.ok(bands[i].freq >= bands[i - 1].freq);
    }
  });

  it("evaluateAnswer proplus'ta her tahmini en yakın EŞLEŞMEMİŞ banda atar", () => {
    const q = mode.createQuestion("proplus", { source: "pink", boss: false });
    // sadece ilk 2 bandı doğru işaretle, kalan 2'yi hiç işaretleme
    const guesses = [q.bands[0].freq, q.bands[1].freq];
    const result = mode.evaluateAnswer(q, guesses);
    assert.equal(result.hit, 2);
    assert.equal(result.bands.filter(b => b.matched).length, 2);
  });
});

describe("Frekans Bulma — isBossRound", () => {
  it("her 5 turda bir boss round gelir (round index 0-tabanlı stats.rounds)", () => {
    assert.equal(mode.isBossRound(4), true);  // 5. round (0-tabanlı 4) boss
    assert.equal(mode.isBossRound(9), true);  // 10. round
    assert.equal(mode.isBossRound(0), false);
    assert.equal(mode.isBossRound(3), false);
  });
});

describe("Frekans Bulma — odak aralığı (FOCUS_RANGES)", () => {
  it("her odak seçeneğinde, tüm zorluklarda üretilen frekans(lar) SADECE seçilen aralıkta kalır (10 soru × zorluk × seçenek)", () => {
    const report = [];
    for (const focus of Object.values(mode.FOCUS_RANGES)) {
      for (const level of Object.keys(mode.DIFFICULTY)) {
        let n = 0;
        for (let i = 0; i < 10; i++) {
          const q = mode.createQuestion(level, { source: "pink", boss: false, focusRange: focus.range });
          const freqs = q.mode === "proplus" ? q.bands.map(b => b.freq) : [q.freq];
          freqs.forEach(f => {
            n++;
            assert.ok(f >= focus.range[0] - 1e-9, `${focus.id}/${level}: ${f} < ${focus.range[0]}`);
            assert.ok(f <= focus.range[1] + 1e-9, `${focus.id}/${level}: ${f} > ${focus.range[1]}`);
          });
        }
        report.push(`${focus.id}/${level}: ${n} freq kontrol edildi`);
      }
    }
    assert.equal(report.length, Object.keys(mode.FOCUS_RANGES).length * Object.keys(mode.DIFFICULTY).length);
  });

  it("şıklı moddaki cevap seçenekleri de odak aralığının DIŞINA çıkmaz (dar aralıkta bile)", () => {
    for (const focus of Object.values(mode.FOCUS_RANGES)) {
      for (const level of ["easy", "medium", "hard", "pro"]) {
        for (let i = 0; i < 20; i++) {
          const q = mode.createQuestion(level, { source: "pink", boss: false, focusRange: focus.range });
          q.choices.forEach(c => {
            assert.ok(c.freq >= focus.range[0] - 1e-9, `${focus.id}/${level}: şık ${c.freq} < ${focus.range[0]}`);
            assert.ok(c.freq <= focus.range[1] + 1e-9, `${focus.id}/${level}: şık ${c.freq} > ${focus.range[1]}`);
          });
        }
      }
    }
  });

  it("dar odak aralığında (Bas/Orta, ~2.3 oktav) generateChoices EN AZ 2 şık üretir, asla 1'e düşmez", () => {
    for (const focusId of ["bass", "mid"]) {
      const focus = mode.FOCUS_RANGES[focusId];
      for (const level of ["hard", "pro"]) {
        for (let i = 0; i < 30; i++) {
          const q = mode.createQuestion(level, { source: "pink", boss: false, focusRange: focus.range });
          assert.ok(q.choices.length >= 2, `${focusId}/${level}: sadece ${q.choices.length} şık`);
        }
      }
    }
  });

  it("focusRange verilmezse davranış TAMAMEN eskisiyle aynı (tüm spektrum, geriye dönük uyumlu)", () => {
    const q = mode.createQuestion("pro", { source: "pink", boss: false });
    assert.equal(q.choices.length, mode.DIFFICULTY.pro.options);
  });

  it("focusIdForZone her FA_ZONES bölgesi için geçerli bir FOCUS_RANGES anahtarı döndürür", () => {
    mode.FA_ZONES.forEach(z => {
      const key = z.t.split(" (")[0];
      const focusId = mode.focusIdForZone(key);
      assert.ok(Object.prototype.hasOwnProperty.call(mode.FOCUS_RANGES, focusId),
        `${key} → "${focusId}" FOCUS_RANGES'ta yok`);
    });
  });

  it("buildProPlusBands dar bir odak aralığında istenenden az bant dönebilir ama ASLA range dışına taşmaz", () => {
    const focus = mode.FOCUS_RANGES.bass; // ~2.3 oktav, 4 bant için ~2.7 oktav gerekir
    for (let i = 0; i < 20; i++) {
      const bands = mode.buildProPlusBands(4, 8, focus.range);
      assert.ok(bands.length <= 4);
      bands.forEach(b => {
        assert.ok(b.freq >= focus.range[0] - 1e-9 && b.freq <= focus.range[1] + 1e-9);
      });
    }
  });
});

// ADIM 2 — zorluk sisteminin merkezi bağlanması, Kesim Noktası'nın ADIM 1'de kurduğu
// AYNI desen. paramsForDifficultyPosition() SAF fonksiyon testleri + createQuestion'ın
// settings.difficultyPosition VARSA eğriyi, YOKSA (yukarıdaki testlerin TAMAMI gibi)
// eski statik DIFFICULTY[level] yolunu kullandığının doğrulanması.
describe("Frekans Bulma — paramsForDifficultyPosition() (ADIM 2 zorluk eğrisi)", () => {
  it("position arttıkça gainDb PÜRÜZSÜZ (monoton) KÜÇÜLÜR — ara adımlarda ATLAMA yok", () => {
    let prev = Infinity;
    for (let p = 1; p <= 20; p += 0.25) {
      const { gainDb } = mode.paramsForDifficultyPosition(p);
      assert.ok(gainDb <= prev + 1e-9, `position ${p}'de gainDb azalmadı`);
      prev = gainDb;
    }
  });

  it("position arttıkça q PÜRÜZSÜZ (monoton) ARTAR", () => {
    let prev = -Infinity;
    for (let p = 1; p <= 20; p += 0.25) {
      const { q } = mode.paramsForDifficultyPosition(p);
      assert.ok(q >= prev - 1e-9, `position ${p}'de q azaldı`);
      prev = q;
    }
  });

  it("q, LEVEL_CAP'ten SONRA SABİT kalır (Z1'in gain/Q asimetrisiyle aynı — applyPostCapFloor çağrılmıyor)", () => {
    const cfg = mode.FREKANS_CURVE_CONFIG;
    const atCap = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    const over5 = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP + 5);
    const farOver = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP + 500);
    assert.equal(over5.q, atCap.q);
    assert.equal(farOver.q, atCap.q);
  });

  it("gainDb/timeSec/hintBandOct/distractorStepOct LEVEL_CAP'ten SONRA azalır ama bir TABANIN altına inmez", () => {
    const cfg = mode.FREKANS_CURVE_CONFIG;
    const atCap = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    const farOver = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP + 1000);
    assert.ok(farOver.gainDb < atCap.gainDb);
    assert.ok(farOver.gainDb >= cfg.GAIN_DB_FLOOR - 1e-9);
    assert.ok(farOver.timeSec >= cfg.TIME_SEC_FLOOR - 1e-9);
    assert.ok(farOver.hintBandOct >= cfg.HINT_BAND_OCT_FLOOR - 1e-9);
    assert.ok(farOver.distractorStepOct >= cfg.STEP_OCT_FLOOR - 1e-9);
  });

  it("distractorStepOct HER ZAMAN 0.5 oktavlık evaluateAnswer toleransından büyük — tavanın ÇOK üzerinde bile", () => {
    for (const p of [1, 5, 10, 20, 50, 500]) {
      const { distractorStepOct } = mode.paramsForDifficultyPosition(p);
      assert.ok(distractorStepOct > 0.5, `position ${p}: step ${distractorStepOct} <= 0.5`);
    }
  });

  it("position arttıkça options MONOTON ARTAR ve her zaman 3-6 arası tam sayı", () => {
    let prev = 0;
    for (let p = 1; p <= 20; p += 0.5) {
      const { options } = mode.paramsForDifficultyPosition(p);
      assert.ok(Number.isInteger(options) && options >= 3 && options <= 6, `position ${p}: geçersiz options ${options}`);
      assert.ok(options >= prev, `position ${p}'de options azaldı`);
      prev = options;
    }
  });

  it("position=1'de config'in AT_1 değerlerini birebir döner (tavan aşılmadı)", () => {
    const cfg = mode.FREKANS_CURVE_CONFIG;
    const p = mode.paramsForDifficultyPosition(1);
    assert.ok(Math.abs(p.gainDb - cfg.GAIN_DB_AT_1) < 1e-9);
    assert.ok(Math.abs(p.q - cfg.Q_AT_1) < 1e-9);
    assert.ok(Math.abs(p.timeSec - cfg.TIME_SEC_AT_1) < 1e-9);
  });

  it("position=LEVEL_CAP'te config'in AT_CAP değerlerini birebir döner", () => {
    const cfg = mode.FREKANS_CURVE_CONFIG;
    const p = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    assert.ok(Math.abs(p.gainDb - cfg.GAIN_DB_AT_CAP) < 1e-9);
    assert.ok(Math.abs(p.q - cfg.Q_AT_CAP) < 1e-9);
  });

  it("position<1 veya ondalık için düşmez, position 1 gibi davranır", () => {
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(0));
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(-5));
    assert.equal(mode.paramsForDifficultyPosition(0).position, 1);
  });
});

describe("Frekans Bulma — createQuestion(settings.difficultyPosition) entegrasyonu", () => {
  it("difficultyPosition VERİLİRSE üretilen şık sayısı paramsForDifficultyPosition().options'a eşit (statik tablo DEĞİL)", () => {
    for (const p of [1, 5, 10, 15, 20]) {
      const expectedOptions = mode.paramsForDifficultyPosition(p).options;
      const q = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: p });
      assert.equal(q.choices.length, expectedOptions, `position ${p}: beklenen ${expectedOptions}, gelen ${q.choices.length}`);
    }
  });

  it("difficultyPosition VERİLMEZSE (geriye dönük uyumluluk) davranış eski statik tabloyla BİREBİR aynı kalır", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      if (level === "proplus") continue;
      for (let i = 0; i < 20; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.choices.length, mode.DIFFICULTY[level].options);
        assert.equal(q.hintBandOct, mode.DIFFICULTY[level].hintBandOct);
        assert.equal(q.timeSec, mode.DIFFICULTY[level].time);
      }
    }
  });

  it("difficultyPosition YÜKSEK (zor) verildiğinde |gain| istatistiksel olarak KÜÇÜK (eğriden geliyor, statikten değil)", () => {
    const N = 300;
    let easySum = 0, hardSum = 0;
    for (let i = 0; i < N; i++) {
      const easy = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: 1 });
      const hard = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: 20 });
      easySum += Math.abs(easy.gain);
      hardSum += Math.abs(hard.gain);
    }
    assert.ok(hardSum / N < easySum / N, "yüksek position ortalama olarak DAHA KÜÇÜK |gain| üretmeliydi");
  });

  it("hintBandOct/timeSec soru nesnesinde taşınır ve renderHintMask/DIFFICULTY[level] yerine BUNU kullanır", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: 10 });
    const expected = mode.paramsForDifficultyPosition(10);
    assert.ok(Math.abs(q.hintBandOct - expected.hintBandOct) < 1e-9);
    assert.ok(Math.abs(q.timeSec - expected.timeSec) < 1e-9);
  });

  it("boost-only kuralı (easy/medium HER ZAMAN pozitif gain) eğri modunda da KORUNUR — tier ismine bağlı, sürekliye çevrilmedi", () => {
    for (let i = 0; i < 100; i++) {
      const q = mode.createQuestion("easy", { source: "pink", boss: false, difficultyPosition: 15 });
      assert.ok(q.gain > 0, `easy+eğri modunda negatif gain: ${q.gain}`);
    }
  });

  it("proplus'ta difficultyPosition verilse BİLE eğri devreye girmez — her zaman kendi statik satırı kullanılır (Z5 kararıyla aynı çizgi)", () => {
    for (let i = 0; i < 10; i++) {
      const q = mode.createQuestion("proplus", { source: "pink", boss: false, difficultyPosition: 20 });
      assert.ok(Math.abs(q.bands[0].gain) <= mode.DIFFICULTY.proplus.gain + 1e-9);
    }
  });
});

// ADIM 3 — "Sabit" modu eğriye bağlama (app.js:currentDifficultyPosition'ın
// Sabit dalıyla AYNI kompozisyon: representativeLevelForTier(tier) →
// paramsForDifficultyPosition()). Kesim Noktası'nın AYNI test bloğu — burada
// gainDb↓ZOR, Q↑ZOR (yön TERS, bkz. FREKANS_CURVE_CONFIG notu).
describe("Frekans Bulma — Sabit mod eğriye bağlı (ADIM 3, 'kolaylaşma yok' invaryantı)", () => {
  const TIERS = ["easy", "medium", "hard", "pro"];

  it("her tier'da: gainDb/timeSec/hintBandOct/distractorStepOct eski statikten BÜYÜK DEĞİL (kolaylaşma yok — küçük=zor)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      const oldStep = mode.DISTRACTOR_STEP_OCT[tier];
      assert.ok(p.gainDb <= old.gain + 1e-9, `${tier}: gainDb ${p.gainDb} > eski ${old.gain}`);
      assert.ok(p.timeSec <= old.time + 1e-9, `${tier}: timeSec ${p.timeSec} > eski ${old.time}`);
      assert.ok(p.hintBandOct <= old.hintBandOct + 1e-9, `${tier}: hintBandOct ${p.hintBandOct} > eski ${old.hintBandOct}`);
      assert.ok(p.distractorStepOct <= oldStep + 1e-9, `${tier}: step ${p.distractorStepOct} > eski ${oldStep}`);
    }
  });

  it("her tier'da: q/options eski statikten KÜÇÜK DEĞİL (kolaylaşma yok — Q büyük=zor, çok şık=zor)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      assert.ok(p.q >= old.q - 1e-9, `${tier}: q ${p.q} < eski ${old.q}`);
      assert.ok(p.options >= old.options, `${tier}: options ${p.options} < eski ${old.options}`);
    }
  });

  it("pro'nun temsilci seviyesi TAM LEVEL_CAP — eğrinin en zor noktası, 'yakını' değil", () => {
    assert.equal(representativeLevelForTier("pro"), mode.FREKANS_CURVE_CONFIG.LEVEL_CAP);
    const atLevelCap = mode.paramsForDifficultyPosition(mode.FREKANS_CURVE_CONFIG.LEVEL_CAP);
    const proRepr = mode.paramsForDifficultyPosition(representativeLevelForTier("pro"));
    assert.deepEqual(atLevelCap, proRepr);
  });

  it("Sabit modun kompozisyonu (representativeLevelForTier → paramsForDifficultyPosition → createQuestion) uçtan uca doğru şık sayısını üretir", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const expectedOptions = mode.paramsForDifficultyPosition(level).options;
      for (let i = 0; i < 10; i++) {
        const q = mode.createQuestion(tier, { source: "pink", boss: false, difficultyPosition: level });
        assert.equal(q.choices.length, expectedOptions, `${tier}: beklenen ${expectedOptions}, gelen ${q.choices.length}`);
      }
    }
  });

  it("STEP_OCT_FLOOR (yeni, daraltılmış) hâlâ 0.5 oktavlık evaluateAnswer toleransından büyük — invaryant kırılmadı", () => {
    assert.ok(mode.FREKANS_CURVE_CONFIG.STEP_OCT_FLOOR > 0.5);
    assert.ok(mode.FREKANS_CURVE_CONFIG.STEP_OCT_AT_CAP > 0.5);
  });
});

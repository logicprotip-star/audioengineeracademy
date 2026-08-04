// Kesim Noktası moduna özel testler: zorlukla tip-ayrımı (kolay/orta'da tip
// söylenir, zor/pro'da gizlenir), şık sayısı zorlukla değişimi, çeldirici üretimi
// (frekans mesafesi + tip karışımı), evaluateAnswer'ın hem frekans HEM tip
// eşleşmesi arayan mantığı, kesim frekansının merkeze uzaklığı (marginOct).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/kesim-noktasi.js";

describe("Kesim Noktası — zorlukla tip ayrımı", () => {
  it("kolay ve orta seviyede typeRevealed HER ZAMAN true", () => {
    for (const level of ["easy", "medium"]) {
      for (let i = 0; i < 30; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.typeRevealed, true, `${level}: typeRevealed false olmamalıydı`);
      }
    }
  });

  it("zor ve pro seviyede typeRevealed HER ZAMAN false", () => {
    for (const level of ["hard", "pro"]) {
      for (let i = 0; i < 30; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.typeRevealed, false, `${level}: typeRevealed true olmamalıydı`);
      }
    }
  });

  it("typeRevealed=true iken TÜM şıklar doğru şıkla AYNI filtre tipini taşır (tip zaten söylendi, çeldirici sadece frekans)", () => {
    for (const level of ["easy", "medium"]) {
      for (let i = 0; i < 30; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        q.choices.forEach(c => assert.equal(c.filterType, q.filterType));
      }
    }
  });

  it("typeRevealed=false iken en az bir (doğru olmayan) şıkkın filtre tipi ÇEVRİLMİŞ — tip gerçekten test ediliyor", () => {
    for (const level of ["hard", "pro"]) {
      let sawFlipped = false;
      for (let i = 0; i < 60; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        const flipped = q.choices.some(c => !c.correct && c.filterType !== q.filterType);
        if (flipped) sawFlipped = true;
        assert.ok(flipped, `${level}: hiçbir şık tip çevrilmemiş (deneme ${i})`);
      }
      assert.ok(sawFlipped);
    }
  });

  it("doğru şık ASLA tip-çevrilmez (her zaman question.filterType ile aynı)", () => {
    for (const level of ["easy", "medium", "hard", "pro"]) {
      for (let i = 0; i < 30; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        const correctChoice = q.choices.find(c => c.correct);
        assert.ok(correctChoice, `${level}: doğru şık bulunamadı`);
        assert.equal(correctChoice.filterType, q.filterType);
        assert.ok(Math.abs(correctChoice.freq - q.freq) < 1e-9);
      }
    }
  });
});

describe("Kesim Noktası — şık sayısı zorlukla değişir", () => {
  it("her zorlukta üretilen şık sayısı DIFFICULTY.options'a eşit (tam spektrumda daralma yok)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 15; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.choices.length, mode.DIFFICULTY[level].options, `${level}: ${q.choices.length} şık`);
      }
    }
  });

  it("kolay(3) < orta(4) < zor(5) < pro(6) — DIFFICULTY tablosu bu sırayı garanti eder", () => {
    assert.ok(mode.DIFFICULTY.easy.options < mode.DIFFICULTY.medium.options);
    assert.ok(mode.DIFFICULTY.medium.options < mode.DIFFICULTY.hard.options);
    assert.ok(mode.DIFFICULTY.hard.options < mode.DIFFICULTY.pro.options);
  });
});

describe("Kesim Noktası — çeldirici frekans mesafesi", () => {
  it("her şık FA_MIN–FA_MAX havuzunda kalır", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 15; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        q.choices.forEach(c => {
          assert.ok(c.freq >= mode.FA_MIN - 1e-6 && c.freq <= mode.FA_MAX + 1e-6, `${level}: ${c.freq} havuz dışı`);
        });
      }
    }
  });

  it("şıklar arasında tekrarlanan frekans yok (her şık ayırt edilebilir)", () => {
    for (let i = 0; i < 20; i++) {
      const q = mode.createQuestion("pro", { source: "pink", boss: false });
      const freqs = q.choices.map(c => c.freq);
      assert.equal(new Set(freqs).size, freqs.length);
    }
  });
});

describe("Kesim Noktası — evaluateAnswer (frekans + tip)", () => {
  it("tam isabet (doğru frekans + doğru tip) → correct:true, freqOk:true, typeOk:true", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    const result = mode.evaluateAnswer(q, { freq: q.freq, filterType: q.filterType });
    assert.equal(result.correct, true);
    assert.equal(result.freqOk, true);
    assert.equal(result.typeOk, true);
  });

  it("doğru frekans ama YANLIŞ tip → correct:false (typeOk:false), freqOk hâlâ true", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    const wrongType = q.filterType === "highpass" ? "lowpass" : "highpass";
    const result = mode.evaluateAnswer(q, { freq: q.freq, filterType: wrongType });
    assert.equal(result.correct, false);
    assert.equal(result.freqOk, true);
    assert.equal(result.typeOk, false);
  });

  it("doğru tip ama UZAK frekans (2 oktav) → correct:false (freqOk:false), typeOk hâlâ true", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    const result = mode.evaluateAnswer(q, { freq: q.freq * 4, filterType: q.filterType });
    assert.equal(result.correct, false);
    assert.equal(result.freqOk, false);
    assert.equal(result.typeOk, true);
  });

  it("FREQ_TOLERANCE_OCT sınırı: içeride doğru, dışarıda yanlış (tip sabit doğru tutularak)", () => {
    const q = { mode: "cutoff", freq: 1000, filterType: "highpass" };
    const justInside = mode.evaluateAnswer(q, { freq: 1000 * Math.pow(2, mode.FREQ_TOLERANCE_OCT - 0.01), filterType: "highpass" });
    const justOutside = mode.evaluateAnswer(q, { freq: 1000 * Math.pow(2, mode.FREQ_TOLERANCE_OCT + 0.01), filterType: "highpass" });
    assert.equal(justInside.correct, true);
    assert.equal(justOutside.correct, false);
  });

  it("DISTRACTOR_STEP_OCT her zorlukta FREQ_TOLERANCE_OCT'tan büyük (yanlış şık asla 'doğru' sayılmaz)", () => {
    for (const level of Object.keys(mode.DISTRACTOR_STEP_OCT)) {
      assert.ok(mode.DISTRACTOR_STEP_OCT[level] > mode.FREQ_TOLERANCE_OCT,
        `${level}: step ${mode.DISTRACTOR_STEP_OCT[level]} <= tolerans ${mode.FREQ_TOLERANCE_OCT}`);
    }
  });
});

describe("Kesim Noktası — createQuestion genel sözleşme", () => {
  it("her zorlukta geçerli, saf (JSON serileşebilir) bir soru üretir", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      assert.equal(q.mode, "cutoff");
      assert.equal(q.difficulty, level);
      assert.equal(q.hintUsed, false);
      assert.ok(q.filterType === "highpass" || q.filterType === "lowpass");
      assert.ok(q.filterLabel === "HPF" || q.filterLabel === "LPF");
      assert.ok(q.freq >= mode.FA_MIN && q.freq <= mode.FA_MAX);
      const json = JSON.stringify(q);
      assert.ok(json.length > 0);
    }
  });

  it("her iki filtre tipi de (istatistiksel olarak) üretilebiliyor", () => {
    let sawHP = false, sawLP = false;
    for (let i = 0; i < 100; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      if (q.filterType === "highpass") sawHP = true;
      if (q.filterType === "lowpass") sawLP = true;
    }
    assert.ok(sawHP && sawLP, "100 denemede her iki tip de görülmeliydi");
  });

  it("boss round'da kesim frekansı merkeze normal round'dan daha yakın (daha zor/ince)", () => {
    const centerLog = Math.log2(Math.sqrt(mode.FA_MIN * mode.FA_MAX));
    let normalDistSum = 0, bossDistSum = 0;
    const N = 60;
    for (let i = 0; i < N; i++) {
      const normal = mode.createQuestion("medium", { source: "pink", boss: false });
      const boss = mode.createQuestion("medium", { source: "pink", boss: true });
      normalDistSum += Math.abs(Math.log2(normal.freq) - centerLog);
      bossDistSum += Math.abs(Math.log2(boss.freq) - centerLog);
    }
    assert.ok(bossDistSum / N < normalDistSum / N, "boss round ortalama olarak merkeze normal'den daha yakın olmalıydı");
  });

  it("calculateXP: doğru cevapta pozitif, yanlışta 0", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    const correctResult = mode.evaluateAnswer(q, { freq: q.freq, filterType: q.filterType });
    const gained = mode.calculateXP(q, correctResult, false, "medium", { combo: 1, timeLeft: 5, roundDuration: 10, xpMultiplier: 1 });
    assert.ok(gained > 0);

    const wrongResult = mode.evaluateAnswer(q, { freq: q.freq * 8, filterType: q.filterType });
    const zero = mode.calculateXP(q, wrongResult, false, "medium", { combo: 1, timeLeft: 5, roundDuration: 10, xpMultiplier: 1 });
    assert.equal(zero, 0);
  });

  it("getMeta(): kart metni yok, difficulty tüm 5 zorluk anahtarını (paylaşılan seçici) kapsar", () => {
    const meta = mode.getMeta();
    assert.equal(meta.ad, undefined);
    assert.equal(meta.aciklama, undefined);
    assert.equal(meta.id, "kesim-noktasi");
    for (const level of ["easy", "medium", "hard", "pro", "proplus"]) {
      assert.ok(meta.difficulty[level], `${level} DIFFICULTY'de yok`);
      assert.ok(typeof meta.difficulty[level].lives === "number");
    }
    assert.ok(Array.isArray(meta.uyumluKaynaklar) && meta.uyumluKaynaklar.length > 5, "kaynak kısıtlaması olmamalıydı");
  });
});

describe("Kesim Noktası — applyProcessing", () => {
  it("questionType'a göre doğru BiquadFilterNode type'ı kurar (sahte audioCtx ile)", () => {
    for (const filterType of ["highpass", "lowpass"]) {
      const created = [];
      const fakeAudioCtx = {
        createBiquadFilter: () => {
          const f = { type: null, frequency: { value: 0 }, Q: { value: 0 } };
          created.push(f);
          return f;
        }
      };
      const q = { freq: 1234, filterType };
      const { filters } = mode.applyProcessing(q, { audioCtx: fakeAudioCtx });
      assert.equal(filters.length, 1);
      assert.equal(filters[0].type, filterType);
      assert.equal(filters[0].frequency.value, 1234);
      assert.ok(filters[0].Q.value > 0);
      assert.equal(created.length, 1);
    }
  });
});

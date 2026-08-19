// Kompresör moduna özel testler: 3-sesli odd-one-out üretimi (iki AYNI
// kompresyon yoğunluğu k, biri FARKLI, konumu rastgele), ratio+threshold'un
// TEK bir k eksenine bağlı BİRLİKTE hareket ettiği (izolasyon: knee/attack/
// release HER ZAMAN sabit), zorlukla kGap'in (ve türetilen gain-reduction
// farkının) küçülmesi + K_GAP_FLOOR, merkezi zorluk eğrisine bağlanma +
// "kolaylaşma yok" invaryantı, evaluateAnswer'ın harf-eşleşme mantığı,
// applyProcessing'in previewLetter'a göre doğru DynamicsCompressorNode'u
// kurması.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/kompresor.js";
import { representativeLevelForTier } from "../www/js/core/difficulty-curve.js";

describe("Kompresör — createQuestion() genel sözleşme", () => {
  for (const level of Object.keys(mode.DIFFICULTY)) {
    it(`createQuestion("${level}") geçerli bir soru üretir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      assert.equal(q.mode, "kompresor");
      assert.equal(q.difficulty, level);
      assert.ok(Array.isArray(q.variants) && q.variants.length === 3, "HER ZAMAN tam 3 varyant");
      assert.ok(q.oddIndex >= 0 && q.oddIndex <= 2);
      assert.equal(typeof q.hintUsed, "boolean");
      assert.equal(q.hintUsed, false);
      assert.ok(Array.isArray(q.choices) && q.choices.length === 3, "şık sayısı HER ZAMAN 3 (A/B/C) — 2'den az/4'ten fazla OLMAMALI");
    });

    it(`createQuestion("${level}") SAF fonksiyondur: JSON'a sorunsuz serileşir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      const json = JSON.stringify(q);
      assert.ok(json.length > 0);
      assert.equal(typeof q.applyProcessing, "undefined");
    });
  }

  it("şık sayısı HİÇBİR zorlukta/pozisyonda 3'ten SAPMAZ — 200 örnek/zorluk (spec: '%33 şans kasıtlı zor')", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 200; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.choices.length, 3, `${level}: ${q.choices.length} şık`);
        assert.deepEqual(q.choices.map(c => c.id).sort(), ["A", "B", "C"]);
      }
    }
  });

  it("variants HER ZAMAN harf sırasında (A,B,C) — pozisyon karışmaz, SADECE oddIndex rastgele", () => {
    for (let i = 0; i < 50; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      assert.deepEqual(q.variants.map(v => v.letter), ["A", "B", "C"]);
    }
  });

  it("oddIndex İSTATİSTİKSEL olarak üç konuma da (0,1,2) dağılıyor — 300 örnek, hiçbiri asla sabitlenmiyor", () => {
    const counts = [0, 0, 0];
    for (let i = 0; i < 300; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      counts[q.oddIndex]++;
    }
    counts.forEach((c, i) => assert.ok(c > 50, `oddIndex=${i}: sadece ${c}/300 — konum sabitlenmiş olabilir`));
  });

  it("doğru şık (choices[].correct) TAM oddIndex'teki harfle eşleşir, TAM BİR kez var", () => {
    for (let i = 0; i < 100; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      const correctChoices = q.choices.filter(c => c.correct);
      assert.equal(correctChoices.length, 1);
      assert.equal(correctChoices[0].id, q.variants[q.oddIndex].letter);
    }
  });

  it("iki AYNI varyant TAM COMP_BASE_K'da (ratio+threshold+GR birebir eşit), FARKLI olan HİÇBİR ZAMAN buna eşit değil", () => {
    for (let i = 0; i < 200; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      const sameCount = q.variants.filter((v, i2) => i2 !== q.oddIndex).length;
      assert.equal(sameCount, 2);
      q.variants.forEach((v, i2) => {
        if (i2 !== q.oddIndex) {
          assert.equal(v.k, mode.COMP_BASE_K, "aynı çift base k'de olmalıydı");
          assert.equal(v.ratio, mode.ratioAtK(mode.COMP_BASE_K));
          assert.equal(v.threshold, mode.thresholdAtK(mode.COMP_BASE_K));
        } else {
          assert.notEqual(v.k, mode.COMP_BASE_K, "farklı olan base'e eşit OLMAMALI");
        }
      });
    }
  });

  it("ratio HER ZAMAN [COMP_RATIO_MIN_PRACTICAL, COMP_RATIO_MAX_PRACTICAL] ⊂ [RATIO_MIN, RATIO_MAX] aralığında kalır", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 100; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        q.variants.forEach(v => {
          assert.ok(v.ratio >= mode.COMP_RATIO_MIN_PRACTICAL - 1e-9 && v.ratio <= mode.COMP_RATIO_MAX_PRACTICAL + 1e-9, `${level}: ratio ${v.ratio} pratik aralık dışı`);
          assert.ok(v.ratio >= mode.RATIO_MIN && v.ratio <= mode.RATIO_MAX, `${level}: ratio ${v.ratio} node spesifikasyonu dışı`);
          assert.ok(v.threshold >= mode.COMP_THRESHOLD_LOW_DB - 1e-9 && v.threshold <= mode.COMP_THRESHOLD_HIGH_DB + 1e-9, `${level}: threshold ${v.threshold} aralık dışı`);
        });
      }
    }
  });

  it("kolaydan pro'ya FARKLI olanın |gainReductionDb - base GR| farkı KÜÇÜLÜR — istatistiksel olarak (N=300, jitter var)", () => {
    const N = 300;
    const baseGr = mode.gainReductionDb(mode.ratioAtK(mode.COMP_BASE_K), mode.thresholdAtK(mode.COMP_BASE_K));
    let easySum = 0, proSum = 0;
    for (let i = 0; i < N; i++) {
      const qEasy = mode.createQuestion("easy", { source: "pink", boss: false });
      const qPro = mode.createQuestion("pro", { source: "pink", boss: false });
      easySum += Math.abs(qEasy.variants[qEasy.oddIndex].gainReductionDb - baseGr);
      proSum += Math.abs(qPro.variants[qPro.oddIndex].gainReductionDb - baseGr);
    }
    assert.ok(proSum / N < easySum / N, "pro ortalama olarak easy'den DAHA KÜÇÜK GR farkı üretmeliydi");
  });
});

describe("Kompresör — RATIO + THRESHOLD BİRLİKTE hareket ediyor (araştırma dersi: tek algısal eksen)", () => {
  it("ratioAtK ve thresholdAtK k arttıkça İKİSİ de 'daha çok sıkışma' yönünde hareket eder (ratio↑, threshold↓)", () => {
    let prevRatio = -Infinity, prevThreshold = Infinity;
    for (let k = 0; k <= 1; k += 0.05) {
      const r = mode.ratioAtK(k), t = mode.thresholdAtK(k);
      assert.ok(r >= prevRatio - 1e-9, `k=${k}: ratio azaldı`);
      assert.ok(t <= prevThreshold + 1e-9, `k=${k}: threshold arttı`);
      prevRatio = r; prevThreshold = t;
    }
  });

  it("gainReductionDb k arttıkça KESİNTİSİZ/MONOTON artar — ratio+threshold'un BİRLEŞİK etkisi tek yönlü", () => {
    let prev = -Infinity;
    for (let k = 0; k <= 1; k += 0.02) {
      const gr = mode.gainReductionDb(mode.ratioAtK(k), mode.thresholdAtK(k));
      assert.ok(gr >= prev - 1e-9, `k=${k.toFixed(2)}'de GR azaldı: ${gr} < ${prev}`);
      prev = gr;
    }
  });

  it("createQuestion'da FARKLI olan varyantın ratio VE threshold'u AYNI ANDA base'ten sapar — biri sabit kalıp diğeri değişmiyor", () => {
    for (let i = 0; i < 200; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      const odd = q.variants[q.oddIndex];
      const baseRatio = mode.ratioAtK(mode.COMP_BASE_K);
      const baseThreshold = mode.thresholdAtK(mode.COMP_BASE_K);
      const ratioChanged = Math.abs(odd.ratio - baseRatio) > 1e-6;
      const thresholdChanged = Math.abs(odd.threshold - baseThreshold) > 1e-6;
      assert.equal(ratioChanged, thresholdChanged, "ratio ve threshold AYNI ANDA değişmeli — biri değişip diğeri sabit kalamaz (tek k ekseninden türetiliyorlar)");
      assert.ok(ratioChanged, "FARKLI varyantta İKİSİ de gerçekten değişmiş olmalı");
    }
  });

  it("knee/attack/release HİÇBİR zorlukta/varyantta DEĞİŞMEZ — SADECE ratio+threshold değişir (araştırma dersi: hız sabit kalmalı)", () => {
    const fakeAudioCtx = { createDynamicsCompressor: () => ({ threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 } }) };
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      for (const letter of ["A", "B", "C"]) {
        const { filters } = mode.applyProcessing({ ...q, previewLetter: letter }, { audioCtx: fakeAudioCtx });
        assert.equal(filters[0].knee.value, mode.COMP_KNEE_DB);
        assert.equal(filters[0].attack.value, mode.COMP_ATTACK_SEC);
        assert.equal(filters[0].release.value, mode.COMP_RELEASE_SEC);
      }
    }
  });
});

describe("Kompresör — pickKGap/pickOddK (dar jitter + FLOOR garantisi, BAŞTAN uygulandı)", () => {
  it("pickKGap HİÇBİR ZAMAN K_GAP_FLOOR'un altına inmez — baseKGap TAM floor'da bile (5000 örnek)", () => {
    const floor = mode.COMP_CURVE_CONFIG.K_GAP_FLOOR;
    for (let i = 0; i < 5000; i++) {
      const v = mode.pickKGap(floor);
      assert.ok(v >= floor - 1e-9, `floor ihlali: ${v} < ${floor}`);
    }
  });

  it("pickKGap'in ortalaması (N=2000) baseKGap'e YAKIN kalır — jitter sinyali BOĞMUYOR", () => {
    const N = 2000;
    for (const base of [0.45, 0.30, 0.15, mode.COMP_CURVE_CONFIG.K_GAP_FLOOR + 0.02]) {
      let sum = 0;
      for (let i = 0; i < N; i++) sum += mode.pickKGap(base);
      const avg = sum / N;
      assert.ok(Math.abs(avg - base) / base < 0.03, `base=${base}: ortalama ${avg.toFixed(4)}, sapma %${(Math.abs(avg - base) / base * 100).toFixed(1)}`);
    }
  });

  it("pickOddK [0,1] dışına ASLA taşmaz, iki yönde de (büyük kGap'lerde bile)", () => {
    for (let i = 0; i < 500; i++) {
      const k = mode.pickOddK(mode.COMP_BASE_K, 5); // bilerek aşırı büyük kGap
      assert.ok(k >= -1e-9 && k <= 1 + 1e-9, `k=${k} [0,1] dışında`);
    }
  });

  it("pickOddK her iki yönde de (daha çok/az sıkıştırılmış) değer üretir — tek yönlü SAPLANMAZ", () => {
    let above = 0, below = 0;
    for (let i = 0; i < 200; i++) {
      const k = mode.pickOddK(mode.COMP_BASE_K, 0.1);
      if (k > mode.COMP_BASE_K) above++; else if (k < mode.COMP_BASE_K) below++;
    }
    assert.ok(above > 50 && below > 50, `above=${above} below=${below} — bir yöne saplanmış olabilir`);
  });

  it("COMP_BASE_K=0.5 (ORTA) olduğu ve K_GAP_AT_1 < 0.5 olduğu İÇİN en kolay turda bile clamp'e gerek KALMAZ — iki yön SİMETRİK", () => {
    assert.ok(mode.COMP_CURVE_CONFIG.K_GAP_AT_1 < mode.COMP_BASE_K, "K_GAP_AT_1 taşarsa simetri bozulur");
    const N = 500;
    let upSum = 0, downSum = 0, upCount = 0, downCount = 0;
    for (let i = 0; i < N; i++) {
      const q = mode.createQuestion("easy", { source: "pink", boss: false });
      const odd = q.variants[q.oddIndex];
      if (odd.k > mode.COMP_BASE_K) { upSum += odd.k - mode.COMP_BASE_K; upCount++; }
      else { downSum += mode.COMP_BASE_K - odd.k; downCount++; }
    }
    const upAvg = upSum / upCount, downAvg = downSum / downCount;
    assert.ok(Math.abs(upAvg - downAvg) / upAvg < 0.1, `up ortalama ${upAvg.toFixed(3)} vs down ${downAvg.toFixed(3)} — simetri bozuk (clamp'e çarpıyor olabilir)`);
  });
});

describe("Kompresör — COMP_FLOOR (K_GAP_FLOOR'un gain-reduction karşılığı) — kulağın ayıramayacağı fark ASLA üretilmez", () => {
  it("K_GAP_FLOOR'da (jitter yok) |GR farkı| en az ~1.2dB — hesap DOĞRUDAN doğrulanır (tahmin değil)", () => {
    const floor = mode.COMP_CURVE_CONFIG.K_GAP_FLOOR;
    const baseGr = mode.gainReductionDb(mode.ratioAtK(mode.COMP_BASE_K), mode.thresholdAtK(mode.COMP_BASE_K));
    const upGr = mode.gainReductionDb(mode.ratioAtK(mode.COMP_BASE_K + floor), mode.thresholdAtK(mode.COMP_BASE_K + floor));
    const downGr = mode.gainReductionDb(mode.ratioAtK(mode.COMP_BASE_K - floor), mode.thresholdAtK(mode.COMP_BASE_K - floor));
    assert.ok(upGr - baseGr >= 1.0, `yukarı yön GR farkı ${(upGr - baseGr).toFixed(2)}dB < 1.0dB`);
    assert.ok(baseGr - downGr >= 1.0, `aşağı yön GR farkı ${(baseGr - downGr).toFixed(2)}dB < 1.0dB`);
  });

  it("LEVEL_CAP'in ÇOK ötesinde (pro'nun da ötesi) bile |GR farkı| asla algılanamaz bir düzeye (0dB'ye yakın) inmez", () => {
    const far = mode.paramsForDifficultyPosition(mode.COMP_CURVE_CONFIG.LEVEL_CAP + 1000);
    const baseGr = mode.gainReductionDb(mode.ratioAtK(mode.COMP_BASE_K), mode.thresholdAtK(mode.COMP_BASE_K));
    const oddGr = mode.gainReductionDb(mode.ratioAtK(mode.COMP_BASE_K + far.kGap), mode.thresholdAtK(mode.COMP_BASE_K + far.kGap));
    assert.ok(oddGr - baseGr >= 1.0, `far kGap'te GR farkı ${(oddGr - baseGr).toFixed(2)}dB < 1.0dB`);
  });

  it("gerçek createQuestion çıktısında (jitter dahil, 2000 örnek/pro) |GR farkı| ASLA 0.8dB'nin altına inmez", () => {
    let minDiff = Infinity;
    for (let i = 0; i < 2000; i++) {
      const q = mode.createQuestion("pro", { source: "pink", boss: false, difficultyPosition: mode.COMP_CURVE_CONFIG.LEVEL_CAP });
      const odd = q.variants[q.oddIndex];
      const same = q.variants.find((v, i2) => i2 !== q.oddIndex);
      minDiff = Math.min(minDiff, Math.abs(odd.gainReductionDb - same.gainReductionDb));
    }
    assert.ok(minDiff >= 0.8, `2000 örnekte en küçük GR farkı ${minDiff.toFixed(3)}dB < 0.8dB (floor delinmiş olabilir)`);
  });
});

describe("Kompresör — evaluateAnswer", () => {
  it("doğru harf → correct=true", () => {
    const q = { oddIndex: 1, variants: [{ letter: "A" }, { letter: "B" }, { letter: "C" }] };
    const r = mode.evaluateAnswer(q, "B");
    assert.equal(r.correct, true);
    assert.equal(r.correctLetter, "B");
  });

  it("yanlış harf → correct=false", () => {
    const q = { oddIndex: 1, variants: [{ letter: "A" }, { letter: "B" }, { letter: "C" }] };
    const r = mode.evaluateAnswer(q, "C");
    assert.equal(r.correct, false);
  });

  it("{id} nesnesi olarak da gelebilir (şıklı arayüzden)", () => {
    const q = { oddIndex: 2, variants: [{ letter: "A" }, { letter: "B" }, { letter: "C" }] };
    assert.equal(mode.evaluateAnswer(q, { id: "C" }).correct, true);
  });
});

describe("Kompresör — calculateXP sağlamlık", () => {
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

  it("ipucu kullanınca XP yarıya iner", () => {
    const q = { boss: false };
    const result = { correct: true };
    const withoutHint = mode.calculateXP(q, result, false, "medium", { combo: 0, timeLeft: 0, roundDuration: 10 });
    const withHint = mode.calculateXP(q, result, true, "medium", { combo: 0, timeLeft: 0, roundDuration: 10 });
    assert.ok(withHint < withoutHint);
  });
});

describe("Kompresör — öğretici metin (teachingText/getFeedbackData) — mix dilinde, gerçekçi", () => {
  it("FARKLI kademedeki varyantlarda metin harfi + ratio + threshold + mix anlamını içerir", () => {
    const q = { oddIndex: 1, variants: [
      { letter: "A", ratio: 7.65, threshold: -21, gainReductionDb: 13.0 },
      { letter: "B", ratio: 12.5, threshold: -29, gainReductionDb: 22.0 },
      { letter: "C", ratio: 7.65, threshold: -21, gainReductionDb: 13.0 }
    ] };
    const text = mode.teachingText(q, "B");
    assert.match(text, /B/);
    assert.match(text, /12\.5/);
    assert.match(text, /-29/);
    assert.match(text, /kompresyon/i);
  });

  it("AYNI kademedeki (ince nüans) varyantlarda 'ikisi de X, biri daha Y' dili kullanılır", () => {
    // ikisi de aynı COMPRESSION_TIERS aralığına düşecek şekilde (orta kademe, 3-9dB)
    const q = { oddIndex: 1, variants: [
      { letter: "A", ratio: 3, threshold: -12, gainReductionDb: 5.0 },
      { letter: "B", ratio: 3.5, threshold: -13, gainReductionDb: 7.0 },
      { letter: "C", ratio: 3, threshold: -12, gainReductionDb: 5.0 }
    ] };
    const text = mode.teachingText(q, "B");
    assert.match(text, /İkisi de/);
    assert.match(text, /daha ağır/);
  });

  it("YANLIŞ durumda kullanıcının seçtiği harf de metinde geçer", () => {
    const q = { oddIndex: 1, variants: [
      { letter: "A", ratio: 5, threshold: -20, gainReductionDb: 8 },
      { letter: "B", ratio: 12, threshold: -30, gainReductionDb: 20 },
      { letter: "C", ratio: 5, threshold: -20, gainReductionDb: 8 }
    ] };
    const text = mode.teachingText(q, "A");
    assert.match(text, /sen A dedin/);
    assert.match(text, /B farklıydı/);
  });

  it("hiçbir durum boş/bozuk metin üretmez (3 harf × 2 durum × gerçek createQuestion çıktıları)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 10; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        for (const guess of ["A", "B", "C"]) {
          const text = mode.teachingText(q, guess);
          assert.ok(text && text.length >= 10, `${level} guess=${guess}: kısa/boş metin`);
          assert.doesNotMatch(text, /undefined|NaN|\[object/, `${level} guess=${guess}: bozuk metin: ${text}`);
        }
      }
    }
  });

  // G66 (terminoloji denetimi): "compressor"/"ratio"/"threshold" GLOBAL mix
  // terimleri — "sıkıştırılmış"/"eşik" gibi tam Türkçe çevirilere ASLA
  // düşmemeli (bkz. DURUM.md G66). "kompresyon" (İngilizce'ye yakın ödünç
  // kelime, task'ın kendi kararı) KABUL edilir.
  it("hiçbir metin (teachingText/getHintText/modeDescription, HER İKİ dal + gerçek createQuestion) 'sıkıştır'/'eşik' İÇERMEZ — 'kompresyon'/'threshold' kullanır", () => {
    // FARKLI-kademe dalı (threshold'un teachingText'te göründüğü tek dal)
    const diffTierQ = { oddIndex: 1, variants: [
      { letter: "A", ratio: 7.65, threshold: -21, gainReductionDb: 13.0 },
      { letter: "B", ratio: 12.5, threshold: -29, gainReductionDb: 22.0 },
      { letter: "C", ratio: 7.65, threshold: -21, gainReductionDb: 13.0 }
    ] };
    const diffTierText = mode.teachingText(diffTierQ, "B");
    assert.doesNotMatch(diffTierText, /sıkıştır/i, `teachingText (farklı kademe): "${diffTierText}"`);
    assert.doesNotMatch(diffTierText, /\beşik\b/i, `teachingText (farklı kademe): "${diffTierText}"`);
    assert.match(diffTierText, /kompresyon/i);
    assert.match(diffTierText, /threshold/i);

    // AYNI-kademe dalı ("İkisi de X durumundaydı" — ÖNCEDEN "sıkıştırılmıştı")
    const sameTierQ = { oddIndex: 1, variants: [
      { letter: "A", ratio: 3, threshold: -12, gainReductionDb: 5.0 },
      { letter: "B", ratio: 3.5, threshold: -13, gainReductionDb: 7.0 },
      { letter: "C", ratio: 3, threshold: -12, gainReductionDb: 5.0 }
    ] };
    const sameTierText = mode.teachingText(sameTierQ, "B");
    assert.doesNotMatch(sameTierText, /sıkıştır/i, `teachingText (aynı kademe): "${sameTierText}"`);
    assert.match(sameTierText, /kompresyon/i);

    // getHintText — iki yön de
    const moreHint = mode.getHintText({ oddIndex: 0, variants: [{ letter: "A", gainReductionDb: 20 }, { letter: "B", gainReductionDb: 5 }, { letter: "C", gainReductionDb: 5 }] });
    const lessHint = mode.getHintText({ oddIndex: 0, variants: [{ letter: "A", gainReductionDb: 3 }, { letter: "B", gainReductionDb: 15 }, { letter: "C", gainReductionDb: 15 }] });
    [moreHint, lessHint].forEach(t => {
      assert.doesNotMatch(t, /sıkıştır/i, `getHintText: "${t}"`);
      assert.match(t, /kompresyon/i);
    });

    // modeDescription
    const desc = mode.modeDescription();
    assert.doesNotMatch(desc, /sıkıştır/i, `modeDescription: "${desc}"`);
    assert.match(desc, /kompresyon/i);

    // Gerçek createQuestion çıktılarıyla uçtan uca (mock DEĞİL) — 5 kademe × 15 tekrar
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 15; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        for (const guess of ["A", "B", "C"]) {
          const text = mode.teachingText(q, guess);
          assert.doesNotMatch(text, /sıkıştır/i, `${level} guess=${guess}: "${text}"`);
          assert.doesNotMatch(text, /\beşik\b/i, `${level} guess=${guess}: "${text}"`);
        }
      }
    }
  });

  it("getFeedbackData showResult HER ZAMAN true, panel HER ZAMAN null", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    const correctLetter = q.choices.find(c => c.correct).id;
    const wrongLetter = q.choices.find(c => !c.correct).id;
    const correctFb = mode.getFeedbackData(q, correctLetter, { gained: 10 });
    const wrongFb = mode.getFeedbackData(q, wrongLetter, { gained: 0 });
    assert.equal(correctFb.showResult, true);
    assert.equal(correctFb.panel, null);
    assert.equal(wrongFb.showResult, true);
    assert.equal(wrongFb.panel, null);
  });

  it("compressionWord dört kademeyi de (hafif/orta/belirgin/ağır) boş/bozuk metin ÜRETMEDEN kapsar", () => {
    for (const gr of [0.5, 2.9, 3.0, 8.9, 9.0, 16.9, 17.0, 26.0]) {
      const w = mode.compressionWord(gr);
      assert.ok(w && w.length >= 5, `gr=${gr}: kısa/boş metin`);
      assert.match(w, /kompresyon/);
    }
  });

  it("correctLabel ratio + GR değerini birlikte gösterir", () => {
    const q = { oddIndex: 0, variants: [{ letter: "A", ratio: 9.2, threshold: -28, gainReductionDb: 19.4 }] };
    const label = mode.correctLabel(q);
    assert.match(label, /A/);
    assert.match(label, /9\.2/);
    assert.match(label, /19\.4/);
  });
});

describe("Kompresör — applyProcessing (previewLetter'a göre doğru DynamicsCompressorNode, sahte audioCtx ile)", () => {
  it("previewLetter VERİLİRSE o harfin ratio+threshold'unu, verilmezse variants[0]'ınkini kullanan TEK DynamicsCompressorNode döner", () => {
    const created = [];
    const fakeAudioCtx = {
      createDynamicsCompressor: () => {
        const c = { threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 } };
        created.push(c);
        return c;
      }
    };
    const q = { variants: [{ letter: "A", ratio: 3.5, threshold: -18 }, { letter: "B", ratio: 12.0, threshold: -30 }, { letter: "C", ratio: 3.5, threshold: -18 }] };

    const { filters: f1 } = mode.applyProcessing(q, { audioCtx: fakeAudioCtx });
    assert.equal(f1.length, 1);
    assert.equal(f1[0].ratio.value, 3.5, "previewLetter yokken variants[0] (A) kullanılmalıydı");
    assert.equal(f1[0].threshold.value, -18);
    assert.equal(f1[0].knee.value, mode.COMP_KNEE_DB);
    assert.equal(f1[0].attack.value, mode.COMP_ATTACK_SEC);
    assert.equal(f1[0].release.value, mode.COMP_RELEASE_SEC);

    const { filters: f2 } = mode.applyProcessing({ ...q, previewLetter: "B" }, { audioCtx: fakeAudioCtx });
    assert.equal(f2[0].ratio.value, 12.0, "previewLetter='B' verilince O harfin ratio'su kullanılmalıydı");
    assert.equal(f2[0].threshold.value, -30, "previewLetter='B' verilince O harfin threshold'u da kullanılmalıydı");

    assert.equal(created.length, 2);
  });

  it("knee/attack/release HER ZAMAN sabit — ratio+threshold DEĞİŞSE bile (izolasyon ilkesi)", () => {
    const fakeAudioCtx = { createDynamicsCompressor: () => ({ threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 } }) };
    for (const [ratio, threshold] of [[1.3, -8], [5, -18], [9, -25], [14, -34]]) {
      const { filters } = mode.applyProcessing({ variants: [{ letter: "A", ratio, threshold }] }, { audioCtx: fakeAudioCtx });
      assert.equal(filters[0].knee.value, mode.COMP_KNEE_DB);
      assert.equal(filters[0].attack.value, mode.COMP_ATTACK_SEC);
      assert.equal(filters[0].release.value, mode.COMP_RELEASE_SEC);
    }
  });
});

describe("Kompresör — paramsForDifficultyPosition() (merkezi zorluk eğrisi)", () => {
  it("position arttıkça kGap PÜRÜZSÜZ (monoton) KÜÇÜLÜR", () => {
    let prev = Infinity;
    for (let p = 1; p <= 20; p += 0.25) {
      const { kGap } = mode.paramsForDifficultyPosition(p);
      assert.ok(kGap <= prev + 1e-9, `position ${p}'de kGap azalmadı`);
      prev = kGap;
    }
  });

  it("position=1'de AT_1, position=LEVEL_CAP'te AT_CAP değerlerini birebir döner", () => {
    const cfg = mode.COMP_CURVE_CONFIG;
    const p1 = mode.paramsForDifficultyPosition(1);
    const pCap = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    assert.ok(Math.abs(p1.kGap - cfg.K_GAP_AT_1) < 1e-9);
    assert.ok(Math.abs(pCap.kGap - cfg.K_GAP_AT_CAP) < 1e-9);
  });

  it("LEVEL_CAP'in ÇOK ötesinde kGap bir TABANIN altına inmez", () => {
    const cfg = mode.COMP_CURVE_CONFIG;
    const far = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP + 1000);
    assert.ok(far.kGap >= cfg.K_GAP_FLOOR - 1e-9);
  });

  it("position<1 veya ondalık için düşmez, position 1 gibi davranır", () => {
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(0));
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(-5));
    assert.equal(mode.paramsForDifficultyPosition(0).position, 1);
  });
});

describe("Kompresör — createQuestion(settings.difficultyPosition) entegrasyonu", () => {
  it("difficultyPosition VERİLMEZSE davranış eski statik tabloyla BİREBİR aynı kalır (proplus dahil): şık sayısı 3, timeSec statik", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 15; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.choices.length, 3);
        assert.equal(q.timeSec, mode.DIFFICULTY[level].time);
      }
    }
  });

  it("proplus'ta difficultyPosition verilse BİLE eğri devreye girmez (Z5 kararıyla aynı çizgi)", () => {
    for (let i = 0; i < 10; i++) {
      const q = mode.createQuestion("proplus", { source: "pink", boss: false, difficultyPosition: 20 });
      assert.equal(q.timeSec, mode.DIFFICULTY.proplus.time);
    }
  });
});

// Kesim Noktası/dB Seviyesi/Boost-Cut/Q Genişliği'nin AYNI kompozisyonu — "Sabit"
// modun eğriye bağlanması, hiçbir tier eski statikten kolay olmayacak şekilde
// ÖNCEDEN kalibre.
describe("Kompresör — Sabit mod eğriye bağlı ('kolaylaşma yok' invaryantı)", () => {
  const TIERS = ["easy", "medium", "hard", "pro"];

  it("her tier'da: kGap eski statikten BÜYÜK DEĞİL (kolaylaşma yok — küçük=zor)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      assert.ok(p.kGap <= old.kGap + 1e-9, `${tier}: kGap ${p.kGap} > eski ${old.kGap}`);
    }
  });

  it("pro'nun temsilci seviyesi TAM LEVEL_CAP — eğrinin en zor noktası", () => {
    assert.equal(representativeLevelForTier("pro"), mode.COMP_CURVE_CONFIG.LEVEL_CAP);
    const atCap = mode.paramsForDifficultyPosition(mode.COMP_CURVE_CONFIG.LEVEL_CAP);
    const proRepr = mode.paramsForDifficultyPosition(representativeLevelForTier("pro"));
    assert.deepEqual(atCap, proRepr);
  });

  it("Sabit modun kompozisyonu uçtan uca hâlâ TAM 3 şık üretir (kGap ne olursa olsun)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      for (let i = 0; i < 10; i++) {
        const q = mode.createQuestion(tier, { source: "pink", boss: false, difficultyPosition: level });
        assert.equal(q.choices.length, 3, `${tier}: beklenen 3, gelen ${q.choices.length}`);
      }
    }
  });

  it("EASY (temsilci seviye) → EKSTREM/bariz GR farkı, PRO (temsilci seviye) → ince/subtle GR farkı — öğretmen yöntemi (N=200/tier)", () => {
    const N = 200;
    const baseGr = mode.gainReductionDb(mode.ratioAtK(mode.COMP_BASE_K), mode.thresholdAtK(mode.COMP_BASE_K));
    let easySum = 0, proSum = 0;
    for (let i = 0; i < N; i++) {
      const qEasy = mode.createQuestion("easy", { source: "pink", boss: false, difficultyPosition: representativeLevelForTier("easy") });
      const qPro = mode.createQuestion("pro", { source: "pink", boss: false, difficultyPosition: representativeLevelForTier("pro") });
      easySum += Math.abs(qEasy.variants[qEasy.oddIndex].gainReductionDb - baseGr);
      proSum += Math.abs(qPro.variants[qPro.oddIndex].gainReductionDb - baseGr);
    }
    const easyAvg = easySum / N, proAvg = proSum / N;
    assert.ok(easyAvg >= 6, `easy ortalama GR farkı ${easyAvg.toFixed(2)}dB — EKSTREM/bariz olmalıydı (>=6dB)`);
    assert.ok(proAvg < 3, `pro ortalama GR farkı ${proAvg.toFixed(2)}dB — ince/subtle olmalıydı (<3dB)`);
    assert.ok(proAvg < easyAvg, "pro her zaman easy'den daha ince olmalı");
  });
});

describe("Kompresör — getMeta() sözleşme alanları", () => {
  it("id/motor/kulaklikGerekli/uyumluKaynaklar/ucretsiz/videoUrl/difficulty/choiceOnly tanımlı, motor=2", () => {
    const meta = mode.getMeta();
    assert.equal(meta.id, "kompresor");
    assert.equal(meta.motor, 2, "Motor 2'nin ilk modu olmalıydı");
    assert.equal(typeof meta.kulaklikGerekli, "boolean");
    // G337 (OLCUM-KOMPRESOR-KAYNAK-20-08) — "sadece gürültü dışlanır" ARTIK
    // TAM DOĞRU DEĞİL, saw/square/triangle de (AYNI noTransient gerekçesiyle)
    // dışlanıyor — liste yine de "çoğunlukla açık" (11/14 kaynak kalıyor).
    assert.ok(Array.isArray(meta.uyumluKaynaklar) && meta.uyumluKaynaklar.length > 5, "kaynak listesi çoğunlukla açık kalmalıydı — transient'siz kaynaklar dışlanır");
    assert.equal(typeof meta.ucretsiz, "boolean");
    assert.equal(typeof meta.videoUrl, "string");
    assert.equal(meta.choiceOnly, true);
    for (const level of Object.keys(meta.difficulty)) {
      assert.ok(meta.difficulty[level], `${level} DIFFICULTY'de yok`);
      assert.ok(typeof meta.difficulty[level].lives === "number");
      assert.ok(typeof meta.difficulty[level].time === "number" && meta.difficulty[level].time > 0);
      assert.equal(meta.difficulty[level].options, 3, `${level}: options HER ZAMAN 3 olmalıydı`);
    }
  });

  it("ad/aciklama BİLEREK yok — kart metni yalnızca mode-catalog.js'ten okunur", () => {
    const meta = mode.getMeta();
    assert.equal(meta.ad, undefined);
    assert.equal(meta.aciklama, undefined);
  });

  // G337 (OLCUM-KOMPRESOR-KAYNAK-20-08) — saw/square/triangle pembe/beyaz
  // gürültüye KATILDI: 8sn render'da SIFIR transient (davul/enstrümanda
  // 11-36), kompresör altında crest factor DÜŞMÜYOR (gerçek kaynaklarda
  // -3.3...-5.5dB, bunlarda +0.09...+0.21dB — pratikte YOK, hatta ARTIŞ).
  // Kullanıcı SADECE statik dB farkını duyuyordu (dB Seviyesi'yle AYNI
  // beceri) — cihazda "her soru bilindi" gözlemiyle örtüştü.
  it("pembe/beyaz gürültü + saw/square/triangle dışlanır — transient yok, kompresyon dinamik olarak duyulmaz", () => {
    const meta = mode.getMeta();
    for (const id of ["pink", "white", "saw", "square", "triangle"]) {
      assert.ok(!meta.uyumluKaynaklar.includes(id), `${id} listede OLMAMALIYDI`);
    }
  });

  it("transient içeren kaynaklar (davul/enstrüman/upload) kalır", () => {
    const meta = mode.getMeta();
    for (const id of ["kick", "snare", "hihat", "tom", "groove", "bass", "guitar", "vocal", "upload"]) {
      assert.ok(meta.uyumluKaynaklar.includes(id), `${id} listede olmalıydı`);
    }
  });
});

describe("Kompresör — diğer modlarla KARŞILAŞTIRMA (bağlantı mekanizması ORTAK)", () => {
  it("AYNI position'da altı modun da eğrisi aynı yönde (monoton) hareket eder — Kompresör'e özgü bir kopukluk YOK", async () => {
    const kesim = await import("../www/js/modes/kesim-noktasi.js");
    const db = await import("../www/js/modes/db-seviyesi.js");
    const boostCut = await import("../www/js/modes/boost-mu-cut-mu.js");
    const q = await import("../www/js/modes/q-genisligi.js");
    const positions = [1, 2, 5, 10, 15, 20];
    let compPrev = Infinity, kesimPrev = Infinity, dbPrev = Infinity, bcPrev = Infinity, qPrev = Infinity;
    for (const p of positions) {
      const compVal = mode.paramsForDifficultyPosition(p).kGap;
      const kesimVal = kesim.paramsForDifficultyPosition(p).marginOct;
      const dbVal = db.paramsForDifficultyPosition(p).dbDelta;
      const bcVal = boostCut.paramsForDifficultyPosition(p).gainDb;
      const qVal = q.paramsForDifficultyPosition(p).edgeMargin;
      assert.ok(compVal <= compPrev + 1e-9, `Kompresör: position ${p}'de artış`);
      assert.ok(kesimVal <= kesimPrev + 1e-9, `Kesim: position ${p}'de artış`);
      assert.ok(dbVal <= dbPrev + 1e-9, `dB: position ${p}'de artış`);
      assert.ok(bcVal <= bcPrev + 1e-9, `Boost/Cut: position ${p}'de artış`);
      assert.ok(qVal <= qPrev + 1e-9, `Q: position ${p}'de artış`);
      compPrev = compVal; kesimPrev = kesimVal; dbPrev = dbVal; bcPrev = bcVal; qPrev = qVal;
    }
  });
});

// G292 (OLCUM-UC-18-08 madde C) — oddIndex artık settings.recentIdentities'i
// (core/repeat-guard.js'in "kalan küme" SAF fonksiyonu) okuyor. K=3, N=1.
describe("Kompresör — G292 tekrar önleme (REPEAT_GUARD_N)", () => {
  it("REPEAT_GUARD_N=1 dışa aktarılıyor", () => {
    assert.equal(mode.REPEAT_GUARD_N, 1);
  });

  it("her createQuestion() repeatIdentity alanını oddIndex'le AYNI döner", () => {
    for (let i = 0; i < 30; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      assert.equal(q.repeatIdentity, q.oddIndex);
    }
  });

  it("500 ARDIŞIK turda oddIndex ASLA bir önceki turla AYNI gelmiyor (Logic'in şikayeti: '%33 ihtimalle arka arkaya aynı soru')", () => {
    let recent = [];
    for (let i = 0; i < 500; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false, recentIdentities: recent });
      if (recent.length > 0) assert.notEqual(q.oddIndex, recent[0], `tur ${i}: oddIndex bir ÖNCEKİYLE AYNI (${q.oddIndex})`);
      recent = [q.oddIndex]; // N=1 — app.js'in KENDİ geçmiş güncelleme deseniyle AYNI
    }
  });

  it("soru üretimi HİÇBİR turda takılmıyor/boş dönmüyor — 1000 tur, hepsi geçerli 0/1/2", () => {
    let recent = [];
    for (let i = 0; i < 1000; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false, recentIdentities: recent });
      assert.ok([0, 1, 2].includes(q.oddIndex));
      recent = [q.oddIndex];
    }
  });

  it("zorluk dağılımı bozulmadı — 3000 turda her oddIndex (0/1/2) YAKLAŞIK dengeli geliyor (N=1 ile bile, ±%15 tolerans)", () => {
    const counts = [0, 0, 0];
    let recent = [];
    for (let i = 0; i < 3000; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false, recentIdentities: recent });
      counts[q.oddIndex]++;
      recent = [q.oddIndex];
    }
    const expected = 3000 / 3;
    for (const c of counts) {
      assert.ok(Math.abs(c - expected) / expected < 0.15, `dağılım dengesiz: ${counts.join(",")} (beklenen ~${expected})`);
    }
  });

  it("recentIdentities VERİLMEZSE (mevcut testler/doğrudan çağrılar) davranış eskisiyle AYNI — hâlâ 0/1/2'den geçerli bir değer döner", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    assert.ok([0, 1, 2].includes(q.oddIndex));
  });
});

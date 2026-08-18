// Reverb moduna özel testler: 3-sesli odd-one-out üretimi (iki AYNI reverb,
// biri FARKLI, konumu rastgele), AYNI-tip miktar farkının (k ekseni) zorlukla
// küçülmesi + K_GAP_FLOOR, PRO/proplus katmanında TİP farkına geçiş, merkezi
// zorluk eğrisine bağlanma + "kolaylaşma yok" invaryantı, evaluateAnswer'ın
// harf-eşleşme mantığı, applyProcessing'in previewLetter'a göre doğru
// ConvolverNode+dry/wet zincirini kurması, sentetik IR üretimi.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/reverb.js";
import { representativeLevelForTier } from "../www/js/core/difficulty-curve.js";
import { AB_LOOP_INTERVAL_MS_REVERB } from "../www/js/core/ab-loop-timing.js";

describe("Reverb — createQuestion() genel sözleşme", () => {
  for (const level of Object.keys(mode.DIFFICULTY)) {
    it(`createQuestion("${level}") geçerli bir soru üretir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      assert.equal(q.mode, "reverb");
      assert.equal(q.difficulty, level);
      assert.ok(Array.isArray(q.variants) && q.variants.length === 3, "HER ZAMAN tam 3 varyant");
      assert.ok(q.oddIndex >= 0 && q.oddIndex <= 2);
      assert.equal(typeof q.hintUsed, "boolean");
      assert.equal(q.hintUsed, false);
      assert.ok(Array.isArray(q.choices) && q.choices.length === 3, "şık sayısı HER ZAMAN 3 (A/B/C)");
    });

    it(`createQuestion("${level}") SAF fonksiyondur: JSON'a sorunsuz serileşir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      const json = JSON.stringify(q);
      assert.ok(json.length > 0);
      assert.equal(typeof q.applyProcessing, "undefined");
    });
  }

  it("şık sayısı HİÇBİR zorlukta/pozisyonda 3'ten SAPMAZ — 200 örnek/zorluk", () => {
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

  it("oddIndex İSTATİSTİKSEL olarak üç konuma da (0,1,2) dağılıyor — 300 örnek", () => {
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

  it("AYNI-tip (easy/medium/hard) turlarında: iki AYNI varyant TAM COMP_BASE_K'da, FARKLI olan HİÇBİR ZAMAN buna eşit değil", () => {
    for (const level of ["easy", "medium", "hard"]) {
      for (let i = 0; i < 50; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        const same = q.variants.filter((v, i2) => i2 !== q.oddIndex);
        assert.equal(same.length, 2);
        same.forEach(v => assert.equal(v.k, mode.COMP_BASE_K, "aynı çift base k'de olmalıydı"));
        const odd = q.variants[q.oddIndex];
        assert.equal(odd.type, same[0].type, `${level}: AYNI-tip turunda TİP değişmemeliydi`);
        assert.notEqual(odd.k, mode.COMP_BASE_K, "farklı olan base'e eşit OLMAMALI");
      }
    }
  });
});

describe("Reverb — TEK ALGISAL EKSEN + BİRLEŞİK PARAMETRELER (araştırma dersi, Kompresör'ün AYNI ilkesi)", () => {
  it("decayAtK/preDelayAtK/sizeAtK k arttıkça İKİSİ de artıyor (tüm tipler için)", () => {
    for (const type of Object.values(mode.REVERB_TYPES)) {
      let prevDecay = -Infinity, prevPre = -Infinity, prevSize = -Infinity;
      for (let k = 0; k <= 1; k += 0.05) {
        const d = mode.decayAtK(type, k), p = mode.preDelayAtK(type, k), s = mode.sizeAtK(type, k);
        assert.ok(d >= prevDecay - 1e-9, `k=${k}: decay azaldı`);
        assert.ok(p >= prevPre - 1e-9, `k=${k}: preDelay azaldı`);
        assert.ok(s >= prevSize - 1e-9, `k=${k}: size azaldı`);
        prevDecay = d; prevPre = p; prevSize = s;
      }
    }
  });

  it("reverbAmountScore k arttıkça KESİNTİSİZ/MONOTON artar (tüm tipler için)", () => {
    for (const type of Object.values(mode.REVERB_TYPES)) {
      let prev = -Infinity;
      for (let k = 0; k <= 1; k += 0.02) {
        const score = mode.reverbAmountScore(mode.decayAtK(type, k), mode.sizeAtK(type, k), mode.wetMixAtK(k));
        assert.ok(score >= prev - 1e-9, `k=${k.toFixed(2)}'de score azaldı: ${score} < ${prev}`);
        prev = score;
      }
    }
  });

  it("createQuestion'da AYNI-tip FARKLI varyantın decay/preDelay/size/wetMix'i AYNI ANDA base'ten sapar — biri değişip diğeri sabit kalamaz", () => {
    for (let i = 0; i < 200; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      const odd = q.variants[q.oddIndex];
      const same = q.variants.find((v, i2) => i2 !== q.oddIndex);
      if (odd.type !== same.type) continue; // sadece AYNI-tip turlar bu testin kapsamında
      const decayChanged = Math.abs(odd.decaySec - same.decaySec) > 1e-6;
      const sizeChanged = Math.abs(odd.sizeNorm - same.sizeNorm) > 1e-6;
      const wetChanged = Math.abs(odd.wetMix - same.wetMix) > 1e-6;
      assert.equal(decayChanged, sizeChanged);
      assert.equal(sizeChanged, wetChanged);
      assert.ok(decayChanged, "FARKLI varyantta parametreler GERÇEKTEN değişmiş olmalı");
    }
  });
});

describe("Reverb — pickKGap/pickOddK (dar jitter + FLOOR garantisi)", () => {
  it("pickKGap HİÇBİR ZAMAN K_GAP_FLOOR'un altına inmez — baseKGap TAM floor'da bile (5000 örnek)", () => {
    const floor = mode.REVERB_CURVE_CONFIG.K_GAP_FLOOR;
    for (let i = 0; i < 5000; i++) {
      const v = mode.pickKGap(floor);
      assert.ok(v >= floor - 1e-9, `floor ihlali: ${v} < ${floor}`);
    }
  });

  it("pickKGap'in ortalaması (N=2000) baseKGap'e YAKIN kalır", () => {
    const N = 2000;
    for (const base of [0.45, 0.28, 0.14, mode.REVERB_CURVE_CONFIG.K_GAP_FLOOR + 0.02]) {
      let sum = 0;
      for (let i = 0; i < N; i++) sum += mode.pickKGap(base);
      const avg = sum / N;
      assert.ok(Math.abs(avg - base) / base < 0.03, `base=${base}: ortalama ${avg.toFixed(4)}`);
    }
  });

  it("pickOddK [0,1] dışına ASLA taşmaz, iki yönde de", () => {
    for (let i = 0; i < 500; i++) {
      const k = mode.pickOddK(mode.COMP_BASE_K, 5);
      assert.ok(k >= -1e-9 && k <= 1 + 1e-9, `k=${k} [0,1] dışında`);
    }
  });

  it("pickOddK her iki yönde de değer üretir — tek yönlü SAPLANMAZ", () => {
    let above = 0, below = 0;
    for (let i = 0; i < 200; i++) {
      const k = mode.pickOddK(mode.COMP_BASE_K, 0.1);
      if (k > mode.COMP_BASE_K) above++; else if (k < mode.COMP_BASE_K) below++;
    }
    assert.ok(above > 50 && below > 50, `above=${above} below=${below}`);
  });

  it("pickDifferentType HER ZAMAN baseType'tan FARKLI bir tip döner (300 örnek, üç tip için)", () => {
    for (const base of Object.keys(mode.REVERB_TYPES)) {
      for (let i = 0; i < 100; i++) {
        const t = mode.pickDifferentType(base);
        assert.notEqual(t, base);
        assert.ok(Object.keys(mode.REVERB_TYPES).includes(t));
      }
    }
  });
});

describe("Reverb — KADEMELİ zorluk: AYNI-tip miktar farkı (easy/medium/hard) → TİP farkı (pro/proplus)", () => {
  it("Sabit modda easy/medium/hard AYNI tip üretir, pro/proplus TİP farkı üretir (200 örnek/tier)", () => {
    for (const level of ["easy", "medium", "hard"]) {
      for (let i = 0; i < 50; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.typeSwap, false, `${level}: typeSwap olmamalıydı`);
        const types = new Set(q.variants.map(v => v.type));
        assert.equal(types.size, 1, `${level}: üçü de AYNI tip olmalıydı, gelen: ${[...types]}`);
      }
    }
    for (const level of ["pro", "proplus"]) {
      let typeSwapCount = 0;
      for (let i = 0; i < 200; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        if (q.typeSwap) typeSwapCount++;
      }
      assert.equal(typeSwapCount, 200, `${level}: HER turda typeSwap olmalıydı (Sabit mod)`);
    }
  });

  it("typeSwap=true turlarında FARKLI varyantın tipi diğer ikisinden GERÇEKTEN farklı", () => {
    for (let i = 0; i < 100; i++) {
      const q = mode.createQuestion("pro", { source: "pink", boss: false });
      const odd = q.variants[q.oddIndex];
      const same = q.variants.filter((v, i2) => i2 !== q.oddIndex);
      assert.notEqual(odd.type, same[0].type);
      assert.equal(same[0].type, same[1].type, "aynı çiftin tipi de birbiriyle eşleşmeli");
    }
  });

  it("Otomatik modda (difficultyPosition) TYPE_SWAP_POSITION_THRESHOLD altı AYNI-tip, üstü TİP farkı üretir", () => {
    const belowThreshold = mode.TYPE_SWAP_POSITION_THRESHOLD - 5;
    const aboveThreshold = mode.REVERB_CURVE_CONFIG.LEVEL_CAP;
    for (let i = 0; i < 50; i++) {
      const qBelow = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: belowThreshold });
      assert.equal(qBelow.typeSwap, false, `position=${belowThreshold}: typeSwap olmamalıydı`);
      const qAbove = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: aboveThreshold });
      assert.equal(qAbove.typeSwap, true, `position=${aboveThreshold}: typeSwap OLMALIYDI`);
    }
  });

  it("kolaydan zora (AYNI-tip) |amountScore farkı| KÜÇÜLÜR — istatistiksel olarak (N=200)", () => {
    const N = 200;
    let easySum = 0, hardSum = 0;
    for (let i = 0; i < N; i++) {
      const qEasy = mode.createQuestion("easy", { source: "pink", boss: false });
      const qHard = mode.createQuestion("hard", { source: "pink", boss: false });
      const eOdd = qEasy.variants[qEasy.oddIndex], eSame = qEasy.variants.find((v, i2) => i2 !== qEasy.oddIndex);
      const hOdd = qHard.variants[qHard.oddIndex], hSame = qHard.variants.find((v, i2) => i2 !== qHard.oddIndex);
      easySum += Math.abs(eOdd.amountScore - eSame.amountScore);
      hardSum += Math.abs(hOdd.amountScore - hSame.amountScore);
    }
    assert.ok(hardSum / N < easySum / N, "hard ortalama olarak easy'den DAHA KÜÇÜK fark üretmeliydi");
  });
});

describe("Reverb — FLOOR (K_GAP_FLOOR'un yankı-puanı karşılığı) — kulağın ayıramayacağı fark ASLA üretilmez", () => {
  it("K_GAP_FLOOR'da (jitter yok, room tipinde) |amountScore oransal farkı| en az ~%7", () => {
    const floor = mode.REVERB_CURVE_CONFIG.K_GAP_FLOOR;
    const room = mode.REVERB_TYPES.room;
    const base = mode.reverbAmountScore(mode.decayAtK(room, mode.COMP_BASE_K), mode.sizeAtK(room, mode.COMP_BASE_K), mode.wetMixAtK(mode.COMP_BASE_K));
    const up = mode.reverbAmountScore(mode.decayAtK(room, mode.COMP_BASE_K + floor), mode.sizeAtK(room, mode.COMP_BASE_K + floor), mode.wetMixAtK(mode.COMP_BASE_K + floor));
    const down = mode.reverbAmountScore(mode.decayAtK(room, mode.COMP_BASE_K - floor), mode.sizeAtK(room, mode.COMP_BASE_K - floor), mode.wetMixAtK(mode.COMP_BASE_K - floor));
    assert.ok((up - base) / base >= 0.07, `yukarı yön oransal fark %${((up - base) / base * 100).toFixed(1)} < %7`);
    assert.ok((base - down) / base >= 0.07, `aşağı yön oransal fark %${((base - down) / base * 100).toFixed(1)} < %7`);
  });

  it("LEVEL_CAP'in ÇOK ötesinde bile kGap bir TABANIN altına inmez", () => {
    const cfg = mode.REVERB_CURVE_CONFIG;
    const far = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP + 1000);
    assert.ok(far.kGap >= cfg.K_GAP_FLOOR - 1e-9);
  });

  it("gerçek createQuestion çıktısında (jitter dahil, 2000 örnek/hard) |amountScore farkı| ASLA sıfıra yaklaşmaz", () => {
    let minRelDiff = Infinity;
    for (let i = 0; i < 2000; i++) {
      const q = mode.createQuestion("hard", { source: "pink", boss: false, difficultyPosition: representativeLevelForTier("hard") });
      const odd = q.variants[q.oddIndex];
      const same = q.variants.find((v, i2) => i2 !== q.oddIndex);
      const relDiff = Math.abs(odd.amountScore - same.amountScore) / same.amountScore;
      minRelDiff = Math.min(minRelDiff, relDiff);
    }
    assert.ok(minRelDiff >= 0.05, `2000 örnekte en küçük oransal fark %${(minRelDiff * 100).toFixed(2)} < %5 (floor delinmiş olabilir)`);
  });
});

describe("Reverb — evaluateAnswer", () => {
  it("doğru harf → correct=true", () => {
    const q = { oddIndex: 1, variants: [{ letter: "A" }, { letter: "B" }, { letter: "C" }] };
    const r = mode.evaluateAnswer(q, "B");
    assert.equal(r.correct, true);
    assert.equal(r.correctLetter, "B");
  });

  it("yanlış harf → correct=false", () => {
    const q = { oddIndex: 1, variants: [{ letter: "A" }, { letter: "B" }, { letter: "C" }] };
    assert.equal(mode.evaluateAnswer(q, "C").correct, false);
  });

  it("{id} nesnesi olarak da gelebilir", () => {
    const q = { oddIndex: 2, variants: [{ letter: "A" }, { letter: "B" }, { letter: "C" }] };
    assert.equal(mode.evaluateAnswer(q, { id: "C" }).correct, true);
  });
});

describe("Reverb — calculateXP sağlamlık", () => {
  it("yanlış cevapta 0 döner", () => {
    assert.equal(mode.calculateXP({ boss: false }, { correct: false }, false, "medium", {}), 0);
  });

  it("doğru cevapta negatif olmaz, makul bir üst sınırı aşmaz", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const gained = mode.calculateXP({ boss: true }, { correct: true }, false, level, { combo: 20, timeLeft: 100, roundDuration: 10, xpMultiplier: 1.5 });
      assert.ok(gained >= 0);
      const maxPlausible = mode.DIFFICULTY[level].xp * 2.4 * 1.65 * 1.2 * 1.5 + 5;
      assert.ok(gained <= maxPlausible, `${level}: XP mantıksız yüksek: ${gained} > ${maxPlausible}`);
    }
  });

  it("ipucu kullanınca XP yarıya iner", () => {
    const withoutHint = mode.calculateXP({ boss: false }, { correct: true }, false, "medium", { combo: 0, timeLeft: 0, roundDuration: 10 });
    const withHint = mode.calculateXP({ boss: false }, { correct: true }, true, "medium", { combo: 0, timeLeft: 0, roundDuration: 10 });
    assert.ok(withHint < withoutHint);
  });
});

describe("Reverb — öğretici metin (teachingText/getFeedbackData) — tip + parametre + mix dili, SoundGym'in eksik bıraktığı kısım", () => {
  it("TİP farkında metin harfi + HER İKİ tip adını + decay değerini + mix anlamını içerir", () => {
    const q = { oddIndex: 1, variants: [
      { letter: "A", type: "room", ratio: 0, decaySec: 0.5, amountScore: 0.2 },
      { letter: "B", type: "plate", decaySec: 1.4, amountScore: 0.9 },
      { letter: "C", type: "room", decaySec: 0.5, amountScore: 0.2 }
    ] };
    const text = mode.teachingText(q, "B");
    assert.match(text, /B/);
    assert.match(text, /Plate/);
    assert.match(text, /Room/);
    assert.match(text, /1\.4/);
  });

  it("AYNI-tip ince farkta 'İkisi de X' dili kullanılır", () => {
    const q = { oddIndex: 1, variants: [
      { letter: "A", type: "room", decaySec: 0.5, amountScore: 0.3 },
      { letter: "B", type: "room", decaySec: 0.7, amountScore: 0.35 },
      { letter: "C", type: "room", decaySec: 0.5, amountScore: 0.3 }
    ] };
    const text = mode.teachingText(q, "B");
    assert.match(text, /İkisi de/);
  });

  it("YANLIŞ durumda kullanıcının seçtiği harf de metinde geçer", () => {
    const q = { oddIndex: 1, variants: [
      { letter: "A", type: "room", decaySec: 0.5, amountScore: 0.3 },
      { letter: "B", type: "hall", decaySec: 2.5, amountScore: 1.8 },
      { letter: "C", type: "room", decaySec: 0.5, amountScore: 0.3 }
    ] };
    const text = mode.teachingText(q, "A");
    assert.match(text, /sen A dedin/);
    assert.match(text, /B farklıydı/);
  });

  it("hiçbir durum boş/bozuk metin üretmez (3 harf × 2 durum × gerçek createQuestion çıktıları, her tier)", () => {
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

  // G66 (terminoloji denetimi): "reverb" GLOBAL mix terimi — "yankı" gibi
  // tam Türkçe çeviriye ASLA düşmemeli (bkz. DURUM.md G66).
  it("hiçbir metin (teachingText/getHintText/modeDescription, HER İKİ dal + gerçek createQuestion) 'yankı' İÇERMEZ — 'reverb' kullanır", () => {
    // TİP-farkı dalı
    const typeDiffQ = { oddIndex: 1, variants: [
      { letter: "A", type: "room", decaySec: 0.5, amountScore: 0.2 },
      { letter: "B", type: "plate", decaySec: 1.4, amountScore: 0.9 },
      { letter: "C", type: "room", decaySec: 0.5, amountScore: 0.2 }
    ] };
    const typeDiffText = mode.teachingText(typeDiffQ, "B");
    assert.doesNotMatch(typeDiffText, /yankı/i, `teachingText (tip farkı): "${typeDiffText}"`);
    assert.match(typeDiffText, /reverb/i);

    // AYNI-tip, miktar-farkı dalı (ÖNCEDEN "ince/hafif yankı" vb. kullanıyordu)
    const amountDiffQ = { oddIndex: 1, variants: [
      { letter: "A", type: "room", decaySec: 0.5, amountScore: 0.3 },
      { letter: "B", type: "room", decaySec: 2.5, amountScore: 1.8 },
      { letter: "C", type: "room", decaySec: 0.5, amountScore: 0.3 }
    ] };
    const amountDiffText = mode.teachingText(amountDiffQ, "B");
    assert.doesNotMatch(amountDiffText, /yankı/i, `teachingText (miktar farkı): "${amountDiffText}"`);
    assert.match(amountDiffText, /reverb/i);

    // getHintText — TİP farkı + miktar farkı (iki yön)
    const typeHint = mode.getHintText({ oddIndex: 0, variants: [{ letter: "A", type: "hall" }, { letter: "B", type: "room" }, { letter: "C", type: "room" }] });
    assert.doesNotMatch(typeHint, /yankı/i, `getHintText (tip): "${typeHint}"`);
    const moreHint = mode.getHintText({ oddIndex: 0, variants: [{ letter: "A", type: "room", amountScore: 2 }, { letter: "B", type: "room", amountScore: 0.3 }, { letter: "C", type: "room", amountScore: 0.3 }] });
    const lessHint = mode.getHintText({ oddIndex: 0, variants: [{ letter: "A", type: "room", amountScore: 0.1 }, { letter: "B", type: "room", amountScore: 1 }, { letter: "C", type: "room", amountScore: 1 }] });
    [moreHint, lessHint].forEach(t => {
      assert.doesNotMatch(t, /yankı/i, `getHintText: "${t}"`);
      assert.match(t, /reverb/i);
    });

    // modeDescription
    const desc = mode.modeDescription();
    assert.doesNotMatch(desc, /yankı/i, `modeDescription: "${desc}"`);
    assert.match(desc, /reverb/i);

    // Gerçek createQuestion çıktılarıyla uçtan uca (mock DEĞİL) — her kademe × 15 tekrar
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 15; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        for (const guess of ["A", "B", "C"]) {
          const text = mode.teachingText(q, guess);
          assert.doesNotMatch(text, /yankı/i, `${level} guess=${guess}: "${text}"`);
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

  it("correctLabel tip + decay değerini birlikte gösterir", () => {
    const q = { oddIndex: 0, variants: [{ letter: "A", type: "hall", decaySec: 2.4 }] };
    const label = mode.correctLabel(q);
    assert.match(label, /A/);
    assert.match(label, /Hall/);
    assert.match(label, /2\.4/);
  });
});

describe("Reverb — applyProcessing (previewLetter'a göre doğru ConvolverNode + kuru/ıslak zinciri, sahte audioCtx ile)", () => {
  function fakeAudioCtx() {
    const created = { gains: [], convolvers: [] };
    return {
      sampleRate: 44100,
      createGain: () => {
        const g = { gain: { value: 1 }, connect: () => {} };
        created.gains.push(g);
        return g;
      },
      createConvolver: () => {
        const c = { normalize: false, buffer: null, connect: () => {} };
        created.convolvers.push(c);
        return c;
      },
      createBuffer: (channels, length, sampleRate) => {
        const data = Array.from({ length: channels }, () => new Float32Array(length));
        return { getChannelData: (ch) => data[ch] };
      },
      __created: created
    };
  }

  it("previewLetter VERİLİRSE o harfin, verilmezse variants[0]'ınkini kullanan input/output gainleri döner (filters.length===2)", () => {
    const ctx = fakeAudioCtx();
    const q = {
      variants: [
        { letter: "A", type: "room", decaySec: 0.5, preDelaySec: 0.005, sizeNorm: 0.2, wetMix: 0.4, brightness: 0.65 },
        { letter: "B", type: "hall", decaySec: 2.5, preDelaySec: 0.03, sizeNorm: 0.8, wetMix: 0.8, brightness: 0.4 },
        { letter: "C", type: "room", decaySec: 0.5, preDelaySec: 0.005, sizeNorm: 0.2, wetMix: 0.4, brightness: 0.65 }
      ]
    };
    const { filters: f1 } = mode.applyProcessing(q, { audioCtx: ctx });
    assert.equal(f1.length, 2, "filters = [input, output] olmalı");
    assert.ok(Math.abs(f1[0].gain.value - (1 - 0.4)) < 1e-9, "previewLetter yokken variants[0] (A) kullanılmalıydı — kuru pay 1-wetMix");

    const ctx2 = fakeAudioCtx();
    const { filters: f2 } = mode.applyProcessing({ ...q, previewLetter: "B" }, { audioCtx: ctx2 });
    assert.ok(Math.abs(f2[0].gain.value - (1 - 0.8)) < 1e-9, "previewLetter='B' verilince O harfin wetMix'i kullanılmalıydı");
  });

  it("her applyProcessing çağrısı TAM BİR ConvolverNode oluşturur, normalize=false (Düzeltme 2, TUR8-OGRETIM-15-08 bulgusu 🔴 — ÖNCEDEN true'ydu, tarayıcının kendi enerji-normalizasyonu Room/Hall/Plate arasındaki GERÇEK enerji farkını eziyordu)", () => {
    const ctx = fakeAudioCtx();
    const q = { variants: [{ letter: "A", type: "room", decaySec: 0.5, preDelaySec: 0.005, sizeNorm: 0.2, wetMix: 0.4, brightness: 0.65 }] };
    mode.applyProcessing(q, { audioCtx: ctx });
    assert.equal(ctx.__created.convolvers.length, 1);
    assert.equal(ctx.__created.convolvers[0].normalize, false);
  });

  it("Düzeltme 2 KABUL KRİTERİ — dry/wet oranı (input/wetGain.gain.value) normalize değişikliğinden ETKİLENMEDİ", () => {
    const ctx = fakeAudioCtx();
    const q = { variants: [{ letter: "A", type: "hall", decaySec: 2.5, preDelaySec: 0.03, sizeNorm: 0.8, wetMix: 0.8, brightness: 0.4 }] };
    const { filters } = mode.applyProcessing(q, { audioCtx: ctx });
    assert.ok(Math.abs(filters[0].gain.value - (1 - 0.8)) < 1e-9, "kuru pay (input.gain) hâlâ 1-wetMix");
    const wetGainNode = ctx.__created.gains.find(g => Math.abs(g.gain.value - 0.8) < 1e-9);
    assert.ok(wetGainNode, "wetGain (0.8) hâlâ oluşturulan gain'ler arasında — ıslak pay DEĞİŞMEDİ");
  });
});

describe("Reverb — sentetik IR üretimi (generateImpulseResponse)", () => {
  function fakeAudioCtx(sampleRate = 44100) {
    return {
      sampleRate,
      createBuffer: (channels, length) => {
        const data = Array.from({ length: channels }, () => new Float32Array(length));
        return { getChannelData: (ch) => data[ch], length };
      }
    };
  }

  it("uzunluk preDelay+decay'e göre doğru hesaplanır (örnek sayısı = (preDelay+decay)*sampleRate)", () => {
    const ctx = fakeAudioCtx();
    const variant = { decaySec: 1.0, preDelaySec: 0.02, sizeNorm: 0.5, wetMix: 0.6, brightness: 0.6 };
    const buf = mode.generateImpulseResponse(ctx, variant);
    const expectedLen = Math.floor(0.02 * 44100) + Math.floor(1.0 * 44100);
    assert.equal(buf.getChannelData(0).length, expectedLen);
  });

  it("preDelay kısmı TAMAMEN sessiz (sıfır)", () => {
    const ctx = fakeAudioCtx();
    const variant = { decaySec: 0.5, preDelaySec: 0.01, sizeNorm: 0.3, wetMix: 0.5, brightness: 0.6 };
    const buf = mode.generateImpulseResponse(ctx, variant);
    const preDelaySamples = Math.floor(0.01 * 44100);
    const data = buf.getChannelData(0);
    for (let i = 0; i < preDelaySamples; i++) assert.equal(data[i], 0, `preDelay örneği ${i} sessiz olmalıydı`);
  });

  it("iki kanal (stereo) üretilir, ikisi de tamamen sıfır DEĞİL (gerçek gürültü içeriyor)", () => {
    const ctx = fakeAudioCtx();
    const variant = { decaySec: 0.5, preDelaySec: 0.005, sizeNorm: 0.4, wetMix: 0.5, brightness: 0.7 };
    const buf = mode.generateImpulseResponse(ctx, variant);
    for (const ch of [0, 1]) {
      const data = buf.getChannelData(ch);
      const hasNonZero = Array.from(data).some(v => Math.abs(v) > 1e-6);
      assert.ok(hasNonZero, `kanal ${ch} tamamen sıfır — gürültü üretilmemiş`);
    }
  });

  it("kuyruk genlik zarfı genel olarak AZALAN bir eğilimde (RT60 üstel sönüm) — başın enerjisi sonun ortalama enerjisinden BÜYÜK", () => {
    const ctx = fakeAudioCtx();
    const variant = { decaySec: 1.0, preDelaySec: 0, sizeNorm: 0.5, wetMix: 0.6, brightness: 1.0 }; // brightness=1 → lowpass'ın smoothing etkisi minimum, ham zarf daha görünür
    const buf = mode.generateImpulseResponse(ctx, variant);
    const data = buf.getChannelData(0);
    const chunk = Math.floor(data.length / 10);
    const rms = (arr, start, len) => Math.sqrt(arr.slice(start, start + len).reduce((s, v) => s + v * v, 0) / len);
    const earlyRms = rms(data, 0, chunk);
    const lateRms = rms(data, data.length - chunk, chunk);
    assert.ok(earlyRms > lateRms, `erken RMS (${earlyRms.toFixed(4)}) geç RMS'den (${lateRms.toFixed(4)}) BÜYÜK olmalıydı — sönüm yok gibi görünüyor`);
  });

  it("brightness farklı tiplerde farklı bir tını üretir (düşük brightness = daha yumuşak/az yüksek-frekans içerik) — ardışık örnekler arası fark daha küçük", () => {
    const ctx1 = fakeAudioCtx();
    const ctx2 = fakeAudioCtx();
    const dark = mode.generateImpulseResponse(ctx1, { decaySec: 0.5, preDelaySec: 0, sizeNorm: 0.5, wetMix: 0.5, brightness: 0.15 });
    const bright = mode.generateImpulseResponse(ctx2, { decaySec: 0.5, preDelaySec: 0, sizeNorm: 0.5, wetMix: 0.5, brightness: 0.95 });
    const roughness = (data) => {
      let sum = 0;
      for (let i = 1; i < data.length; i++) sum += Math.abs(data[i] - data[i - 1]);
      return sum / data.length;
    };
    const darkData = dark.getChannelData(0), brightData = bright.getChannelData(0);
    assert.ok(roughness(darkData) < roughness(brightData), "donuk (düşük brightness) IR'nin örnekler-arası farkı, parlak IR'den KÜÇÜK olmalıydı (daha çok süzülmüş)");
  });
});

describe("Reverb — paramsForDifficultyPosition() (merkezi zorluk eğrisi)", () => {
  it("position arttıkça kGap PÜRÜZSÜZ (monoton) KÜÇÜLÜR", () => {
    let prev = Infinity;
    for (let p = 1; p <= 20; p += 0.25) {
      const { kGap } = mode.paramsForDifficultyPosition(p);
      assert.ok(kGap <= prev + 1e-9, `position ${p}'de kGap azalmadı`);
      prev = kGap;
    }
  });

  it("position=1'de AT_1, position=LEVEL_CAP'te AT_CAP değerlerini birebir döner", () => {
    const cfg = mode.REVERB_CURVE_CONFIG;
    const p1 = mode.paramsForDifficultyPosition(1);
    const pCap = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    assert.ok(Math.abs(p1.kGap - cfg.K_GAP_AT_1) < 1e-9);
    assert.ok(Math.abs(pCap.kGap - cfg.K_GAP_AT_CAP) < 1e-9);
  });

  it("position<1 veya ondalık için düşmez, position 1 gibi davranır", () => {
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(0));
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(-5));
    assert.equal(mode.paramsForDifficultyPosition(0).position, 1);
  });
});

describe("Reverb — createQuestion(settings.difficultyPosition) entegrasyonu", () => {
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

// Kompresör'ün AYNI kompozisyonu — "Sabit" modun eğriye bağlanması, hiçbir
// tier eski statikten kolay olmayacak şekilde ÖNCEDEN kalibre.
describe("Reverb — Sabit mod eğriye bağlı ('kolaylaşma yok' invaryantı)", () => {
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
    assert.equal(representativeLevelForTier("pro"), mode.REVERB_CURVE_CONFIG.LEVEL_CAP);
  });

  it("Sabit modun kompozisyonu uçtan uca hâlâ TAM 3 şık üretir (her tier)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      for (let i = 0; i < 10; i++) {
        const q = mode.createQuestion(tier, { source: "pink", boss: false, difficultyPosition: level });
        assert.equal(q.choices.length, 3, `${tier}: beklenen 3, gelen ${q.choices.length}`);
      }
    }
  });
});

describe("Reverb — getMeta() sözleşme alanları", () => {
  it("id/motor/kulaklikGerekli/uyumluKaynaklar/ucretsiz/videoUrl/difficulty/choiceOnly tanımlı, motor=2", () => {
    const meta = mode.getMeta();
    assert.equal(meta.id, "reverb");
    assert.equal(meta.motor, 2, "Motor 2'nin ikinci modu olmalıydı");
    assert.equal(typeof meta.kulaklikGerekli, "boolean");
    assert.ok(Array.isArray(meta.uyumluKaynaklar) && meta.uyumluKaynaklar.length >= 4, "oynanabilirlik için en az birkaç kaynak kalmalıydı");
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

  it("G43: ELLE seçilmiş açık liste — SADECE gitar/clean_guitar/arpej gitar/vokal/snare/davul döngüsü/upload kalır (G270: clean_guitar/arpeggio_guitar eklendi)", () => {
    const meta = mode.getMeta();
    assert.deepEqual([...meta.uyumluKaynaklar].sort(), ["arpeggio_guitar", "clean_guitar", "groove", "guitar", "snare", "upload", "vocal"]);
  });

  it("gerçek mixte reverb VERİLEN kaynaklar (gitar/clean_guitar/arpej gitar/vokal/snare/davul döngüsü + upload) kalır", () => {
    const meta = mode.getMeta();
    for (const id of ["guitar", "clean_guitar", "arpeggio_guitar", "vocal", "snare", "groove", "upload"]) {
      assert.ok(meta.uyumluKaynaklar.includes(id), `${id} listede olmalıydı`);
    }
  });

  it("gerçek mixte reverb VERİLMEYEN kaynaklar (kick/hihat/tom/sentetik/gürültü/bas) dışlanır", () => {
    const meta = mode.getMeta();
    for (const id of ["kick", "hihat", "tom", "saw", "square", "triangle", "pink", "white", "bass"]) {
      assert.ok(!meta.uyumluKaynaklar.includes(id), `${id} listede olmamalıydı`);
    }
  });
});

describe("Reverb — Kompresör ŞABLONUNUN doğru miras alındığı (Motor 2 tutarlılığı)", () => {
  it("THREE_WAY=true export edilmiş — Kompresör'ün AYNI bayrağı", async () => {
    const kompresor = await import("../www/js/modes/kompresor.js");
    assert.equal(mode.THREE_WAY, true);
    assert.equal(kompresor.THREE_WAY, true);
  });

  it("AYNI position'da Kompresör VE Reverb'in eğrisi aynı yönde (monoton) hareket eder — Reverb'e özgü bir kopukluk YOK", async () => {
    const kompresor = await import("../www/js/modes/kompresor.js");
    const positions = [1, 2, 5, 10, 15, 20];
    let revPrev = Infinity, compPrev = Infinity;
    for (const p of positions) {
      const revVal = mode.paramsForDifficultyPosition(p).kGap;
      const compVal = kompresor.paramsForDifficultyPosition(p).kGap;
      assert.ok(revVal <= revPrev + 1e-9, `Reverb: position ${p}'de artış`);
      assert.ok(compVal <= compPrev + 1e-9, `Kompresör: position ${p}'de artış`);
      revPrev = revVal; compPrev = compVal;
    }
  });

  it("her ikisi de AYNI previewLetter deseniyle çalışır — applyProcessing imzası uyumlu (previewLetter opsiyonel, yoksa variants[0])", async () => {
    const kompresor = await import("../www/js/modes/kompresor.js");
    const fakeCompCtx = { createDynamicsCompressor: () => ({ threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 } }) };
    const compQ = { variants: [{ letter: "A", ratio: 3, threshold: -15 }, { letter: "B", ratio: 9, threshold: -25 }] };
    const compResult = kompresor.applyProcessing(compQ, { audioCtx: fakeCompCtx });
    assert.ok(compResult.filters.length >= 1);

    const fakeRevCtx = {
      sampleRate: 44100,
      createGain: () => ({ gain: { value: 1 }, connect: () => {} }),
      createConvolver: () => ({ normalize: false, buffer: null, connect: () => {} }),
      createBuffer: (ch, len) => { const d = Array.from({ length: ch }, () => new Float32Array(len)); return { getChannelData: (c) => d[c] }; }
    };
    const revQ = { variants: [{ letter: "A", type: "room", decaySec: 0.5, preDelaySec: 0.005, sizeNorm: 0.2, wetMix: 0.4, brightness: 0.65 }] };
    const revResult = mode.applyProcessing(revQ, { audioCtx: fakeRevCtx });
    assert.equal(revResult.filters.length, 2);
  });
});

describe("Reverb — Düzeltme 2 KABUL KRİTERİ (TUR8-OGRETIM-15-08 bulgusu 🔴): farklı reverb tipleri arasında GERÇEK enerji farkı korunuyor", () => {
  function fakeAudioCtx(sampleRate = 44100) {
    return {
      sampleRate,
      createBuffer: (channels, length) => {
        const data = Array.from({ length: channels }, () => new Float32Array(length));
        return { getChannelData: (ch) => data[ch], length };
      }
    };
  }
  function rms(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length);
  }
  // generateImpulseResponse'un KENDİ çıktısı — convolver.normalize KAPALIYKEN
  // (Düzeltme 2 sonrası) tarayıcı bu buffer'ı YENİDEN ÖLÇEKLENDİRMEZ, yani BURADA
  // ölçülen oran GERÇEK çıkış oranıyla BİREBİR aynı kalır (normalize=true olsaydı
  // bu oran tarayıcı tarafından bilinmeyen bir katsayıyla EZİLİRDİ — asıl bug buydu).
  const k = 0.5; // orta zorluk temsili nokta — REVERB_TYPES aralıklarının ortası

  it("Hall'ın IR'si (uzun decay) Room'unkinden (kısa decay) ANLAMLI ÖLÇÜDE daha fazla toplam enerji taşır", () => {
    const room = mode.REVERB_TYPES.room;
    const hall = mode.REVERB_TYPES.hall;
    const roomVariant = { decaySec: mode.decayAtK(room, k), preDelaySec: mode.preDelayAtK(room, k), sizeNorm: mode.sizeAtK(room, k), wetMix: 0.6, brightness: 0.6 };
    const hallVariant = { decaySec: mode.decayAtK(hall, k), preDelaySec: mode.preDelayAtK(hall, k), sizeNorm: mode.sizeAtK(hall, k), wetMix: 0.6, brightness: 0.6 };

    const roomIr = mode.generateImpulseResponse(fakeAudioCtx(), roomVariant);
    const hallIr = mode.generateImpulseResponse(fakeAudioCtx(), hallVariant);

    const roomRms = rms(roomIr.getChannelData(0));
    const hallRms = rms(hallIr.getChannelData(0));

    assert.ok(hallVariant.decaySec > roomVariant.decaySec * 1.5, `ön koşul: Hall decaySec (${hallVariant.decaySec.toFixed(2)}s) Room'dan (${roomVariant.decaySec.toFixed(2)}s) belirgin uzun olmalı`);
    assert.ok(hallRms > roomRms * 1.2, `Hall RMS (${hallRms.toFixed(4)}) Room RMS'den (${roomRms.toFixed(4)}) en az %20 büyük olmalı — normalize=false ile bu fark artık ÇIKIŞA YANSIYOR`);
  });

  it("AYNI tipte (Room), decaySec artınca (k=0→1) IR enerjisi de MONOTON artar", () => {
    const room = mode.REVERB_TYPES.room;
    const shortVariant = { decaySec: mode.decayAtK(room, 0), preDelaySec: mode.preDelayAtK(room, 0), sizeNorm: mode.sizeAtK(room, 0), wetMix: 0.6, brightness: 0.6 };
    const longVariant = { decaySec: mode.decayAtK(room, 1), preDelaySec: mode.preDelayAtK(room, 1), sizeNorm: mode.sizeAtK(room, 1), wetMix: 0.6, brightness: 0.6 };
    const shortRms = rms(mode.generateImpulseResponse(fakeAudioCtx(), shortVariant).getChannelData(0));
    const longRms = rms(mode.generateImpulseResponse(fakeAudioCtx(), longVariant).getChannelData(0));
    assert.ok(longRms > shortRms, `k=1 RMS (${longRms.toFixed(4)}) k=0 RMS'den (${shortRms.toFixed(4)}) büyük olmalı — enerji decaySec ile monoton artmalı`);
  });
});

describe("Reverb — G268 tepe telafisi (OLCUM-KALAN-17-08 madde B, OLCUM-REVERB-TEPE-17-08): Hall'ün +13.2dBFS'e ulaşan GERÇEK dijital kırpması", () => {
  function fakeAudioCtx(sampleRate = 44100) {
    const created = { gains: [] };
    return {
      sampleRate,
      createGain: () => {
        const g = { gain: { value: 1 }, connect: () => {} };
        created.gains.push(g);
        return g;
      },
      createConvolver: () => ({ normalize: false, buffer: null, connect: () => {} }),
      createBuffer: (channels, length) => {
        const data = Array.from({ length: channels }, () => new Float32Array(length));
        return { getChannelData: (ch) => data[ch] };
      },
      __created: created
    };
  }

  it("REVERB_OUTPUT_TRIM_LINEAR, REVERB_OUTPUT_TRIM_DB'nin doğru lineer karşılığı", () => {
    const expected = 10 ** (mode.REVERB_OUTPUT_TRIM_DB / 20);
    assert.ok(Math.abs(mode.REVERB_OUTPUT_TRIM_LINEAR - expected) < 1e-9);
    assert.ok(mode.REVERB_OUTPUT_TRIM_DB < 0, "telafi bir KISMA olmalı (negatif dB), makyaj kazancı DEĞİL");
  });

  it("applyProcessing() output gain'i REVERB_OUTPUT_TRIM_LINEAR'a eşitliyor — ÜÇ TİP de AYNI sabiti kullanıyor (tip bazında FARKLI DEĞİL — bkz. applyProcessing'in dosya başı notu: ayrı ayrı kalibre edilseydi Plate'in yüksek crest factor'ü Hall'ü RMS'te geçerdi)", () => {
    for (const typeId of Object.keys(mode.REVERB_TYPES)) {
      const ctx = fakeAudioCtx();
      const q = { variants: [{ letter: "A", type: typeId, decaySec: 1.5, preDelaySec: 0.02, sizeNorm: 0.5, wetMix: 0.625, brightness: mode.REVERB_TYPES[typeId].brightness }] };
      const { filters } = mode.applyProcessing(q, { audioCtx: ctx });
      const [, output] = filters;
      assert.ok(Math.abs(output.gain.value - mode.REVERB_OUTPUT_TRIM_LINEAR) < 1e-9, `${typeId}: output.gain.value (${output.gain.value}) REVERB_OUTPUT_TRIM_LINEAR'a (${mode.REVERB_OUTPUT_TRIM_LINEAR}) eşit değil`);
    }
  });

  it("output telafisi dry/wet ORANINA dokunmuyor — input.gain (kuru pay) ve wetGain.gain (ıslak pay) hâlâ SADECE wetMix'e bağlı, telafiden BAĞIMSIZ (Düzeltme 2'nin KENDİ kabul kriterinin aynısı, artık telafi için de geçerli)", () => {
    const ctx = fakeAudioCtx();
    const q = { variants: [{ letter: "A", type: "hall", decaySec: 2.4, preDelaySec: 0.03, sizeNorm: 0.75, wetMix: 0.7, brightness: 0.4 }] };
    const { filters } = mode.applyProcessing(q, { audioCtx: ctx });
    const [input, output] = filters;
    assert.ok(Math.abs(input.gain.value - (1 - 0.7)) < 1e-9, "kuru pay hâlâ 1-wetMix, telafi ORANI etkilemedi");
    const wetGainNode = ctx.__created.gains.find(g => g !== input && g !== output && Math.abs(g.gain.value - 0.7) < 1e-9);
    assert.ok(wetGainNode, "wetGain (0.7) hâlâ oluşturulan gain'ler arasında — telafi ıslak payın KENDİ değerini DEĞİŞTİRMEDİ, sadece output'ta AYRICA uygulandı");
  });

  it("git stash kırmızı/yeşil KANITI (task'ın kendi kabul kriteri) — telafi YOKKEN (output.gain=1, varsayılan) Hall'ün ÖLÇÜLEN en kötü tepesi (+13.2dBFS, bkz. dosya başı ölçüm notu) 0dBFS'İ AÇIKÇA aşıyordu; telafi VARKEN aynı ölçülen değer 0dBFS'İN AÇIKÇA altına düşüyor — bu test SADECE aritmetiği doğruluyor (gerçek ses ölçümü e2e/reverb-peak.spec.mjs'te, Playwright+OfflineAudioContext+gerçek ses dosyalarıyla)", () => {
    const measuredWorstPeakDbBeforeFix = { room: 6.84, hall: 13.2, plate: 10.0 }; // OLCUM-REVERB-TEPE-17-08: 4 kaynak × 40 deneme, k=0.5 (ölçülen en kötü nokta)
    for (const [type, peakDb] of Object.entries(measuredWorstPeakDbBeforeFix)) {
      assert.ok(peakDb > 0, `${type}: ön-koşul — düzeltme ÖNCESİ ölçülen tepe (${peakDb}dBFS) zaten 0dBFS'in üzerinde olmalıydı (aksi halde bu test hiçbir şey KANITLAMAZ)`);
      const afterFixDb = peakDb + mode.REVERB_OUTPUT_TRIM_DB;
      assert.ok(afterFixDb < -1, `${type}: telafi SONRASI tepe (${afterFixDb.toFixed(2)}dBFS) task'ın önerdiği -1dBFS tavanın ALTINDA olmalıydı`);
    }
  });
});

// G280 — OLCUM-CIHAZ2-17-08 madde C'nin devamı (Logic'in kararı: "C şıkkına
// ulaşmadan olmaz, hata olur"). Playwright ile ÖLÇÜLDÜ (e2e/_verify_reverb_*
// betikleri, çalıştırıldıktan sonra silindi — DURUM.md'de tam tablo):
// otomatik A/B/C döngüsünün (G279: 4500ms/harf) geçiş-başı ölü süresi
// (zincir yeniden kurulma + ramp) 108-117ms (4 örneklem, tutarlı). Üç harfin
// TAMAMININ bir turda duyulabilmesi için BARE minimum: 3×4500 + 2×117(en kötü
// ölçülen) = 13734ms. app.js:startTimerForCurrentQuestion()'ın boss indirimi
// (Math.max(6, baseTime-2), DOKUNULMADI/DOKUNULMAYACAK — burada AYNEN
// TEKRARLANIYOR, o formülü DEĞİL, reverb.js'in KENDİ `time` verisini test
// ediyoruz) HER ZORLUK KADEMESİNDE (boss HERHANGİ bir kademede çıkabilir,
// bkz. frekans-bulma.js isBossRound — kademe bağımsız) uygulanabildiği için
// 13734ms'lik BARE minimuma boss'un -2sn'si de EKLENEREK (yaklaşık 16sn)
// GÜVENLİ taban seçildi.
describe("Reverb — G280 tur süresi: otomatik A/B/C döngüsü HER kademede (boss dahil) turun İÇİNE sığıyor", () => {
  // app.js:startTimerForCurrentQuestion()'ın GERÇEK formülünün BİREBİR
  // kopyası (satır ~5853) — o dosya DOM'a bağımlı olduğu için Node'da
  // import EDİLEMİYOR, formül burada KASITLI olarak tekrarlanıyor. O
  // formül DEĞİŞİRSE (G280'in DOKUNULMAYACAK'ı, ama gelecekte biri
  // değiştirirse) bu test bunu YAKALAR (beklenen değerler eskimiş kalır).
  function bossReducedTimeSec(baseTimeSec) {
    return Math.max(6, baseTimeSec - 2);
  }

  // Ölçülen en kötü geçiş-başı ölü süre (bkz. dosya başı not) — 2 geçiş
  // (A→B, B→C) C'ye ulaşmak için gerekli.
  const MEASURED_WORST_TRANSITION_DEAD_TIME_MS = 117;
  const FULL_CYCLE_BARE_MIN_MS = 3 * AB_LOOP_INTERVAL_MS_REVERB + 2 * MEASURED_WORST_TRANSITION_DEAD_TIME_MS;

  it("AB_LOOP_INTERVAL_MS_REVERB hâlâ 4500ms (G279 — DOKUNULMAYACAK, bu testin KENDİ hesabının ön-koşulu)", () => {
    assert.equal(AB_LOOP_INTERVAL_MS_REVERB, 4500);
  });

  it("BARE minimum (3×4500 + 2×117) 13734ms — bu değer değişirse alttaki tier kontrolleri de YENİDEN değerlendirilmeli", () => {
    assert.equal(FULL_CYCLE_BARE_MIN_MS, 13734);
  });

  it("HER zorluk kademesinde, boss indirimi UYGULANDIKTAN SONRA bile tur süresi BARE minimumu KARŞILIYOR (KABUL KRİTERİ — en kısa turda bile A/B/C üçü de otomatik döngüde tam duyulabiliyor)", () => {
    for (const [tier, diff] of Object.entries(mode.DIFFICULTY)) {
      const bossTimeMs = bossReducedTimeSec(diff.time) * 1000;
      assert.ok(
        bossTimeMs >= FULL_CYCLE_BARE_MIN_MS,
        `${tier}: boss turu ${bossTimeMs}ms, BARE minimum ${FULL_CYCLE_BARE_MIN_MS}ms'nin ALTINDA — C'ye otomatik döngüyle ulaşılamayabilir`
      );
    }
  });

  it("kGap/options/lives/xp DOKUNULMADI — SADECE `time` alanı değişti (G280'in kendi DOKUNULMAYACAK'ı: zorluk hâlâ SADECE kGap'ten geliyor)", () => {
    const expectedKGap = { easy: 0.45, medium: 0.28, hard: 0.14, pro: 0.06, proplus: 0.06 };
    const expectedOptions = 3;
    const expectedLives = mode.MAX_LIVES;
    for (const [tier, diff] of Object.entries(mode.DIFFICULTY)) {
      assert.equal(diff.kGap, expectedKGap[tier], `${tier}: kGap değişmemeliydi`);
      assert.equal(diff.options, expectedOptions, `${tier}: options değişmemeliydi`);
      assert.equal(diff.lives, expectedLives, `${tier}: lives değişmemeliydi`);
    }
  });

  it("git stash kırmızı/yeşil KANITI (task'ın kendi kabul kriteri) — DÜZELTME ÖNCESİ değerlerle (easy:17,medium:14,hard:12,pro:10,proplus:10) medium/hard/pro/proplus'ın boss turu BARE minimumun AÇIKÇA altında kalıyordu; DÜZELTME SONRASI (16) açıkça üstünde", () => {
    const beforeFixTimes = { easy: 17, medium: 14, hard: 12, pro: 10, proplus: 10 };
    for (const [tier, timeSec] of Object.entries(beforeFixTimes)) {
      const bossMs = bossReducedTimeSec(timeSec) * 1000;
      const nowPasses = bossMs >= FULL_CYCLE_BARE_MIN_MS;
      const stillPasses = tier === "easy"; // easy zaten önceden de yeterliydi, DEĞİŞMEDİ
      assert.equal(nowPasses, stillPasses, `${tier}: düzeltme ÖNCESİ boss turu (${bossMs}ms) beklenenden FARKLI bir sonuç veriyor — bu test artık ANLAMSIZ olabilir`);
    }
  });
});

// G292 (OLCUM-UC-18-08 madde C) — Kompresör'ün AYNI tekrar-önleme testleri.
describe("Reverb — G292 tekrar önleme (REPEAT_GUARD_N)", () => {
  it("REPEAT_GUARD_N=1 dışa aktarılıyor", () => {
    assert.equal(mode.REPEAT_GUARD_N, 1);
  });

  it("her createQuestion() repeatIdentity alanını oddIndex'le AYNI döner", () => {
    for (let i = 0; i < 30; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      assert.equal(q.repeatIdentity, q.oddIndex);
    }
  });

  it("500 ARDIŞIK turda oddIndex ASLA bir önceki turla AYNI gelmiyor", () => {
    let recent = [];
    for (let i = 0; i < 500; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false, recentIdentities: recent });
      if (recent.length > 0) assert.notEqual(q.oddIndex, recent[0], `tur ${i}: oddIndex bir ÖNCEKİYLE AYNI (${q.oddIndex})`);
      recent = [q.oddIndex];
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

  it("zorluk dağılımı bozulmadı — 3000 turda her oddIndex (0/1/2) YAKLAŞIK dengeli geliyor (±%15 tolerans)", () => {
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

  it("recentIdentities VERİLMEZSE davranış eskisiyle AYNI", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    assert.ok([0, 1, 2].includes(q.oddIndex));
  });
});

// Tonal Denge moduna özel testler: 3-sesli odd-one-out üretimi (iki NÖTR/flat,
// biri DENGESİZ — Kompresör/Reverb'in "iki aynı, biri farklı" deseninin AKSİNE
// burada "aynı" ikili her zaman k=0), tilt'in low-shelf+high-shelf ile ZIT
// yönde uygulanması (tek algısal eksen: imbalanceScore), PRO katmanında %50
// ihtimalle "şekil değişimi" (smile/frown, Reverb'in TİP değişiminin AYNI
// öğretmen-yöntemi), merkezi zorluk eğrisine bağlanma + "kolaylaşma yok"
// invaryantı, evaluateAnswer'ın harf-eşleşme mantığı, applyProcessing'in
// previewLetter'a göre doğru üç BiquadFilterNode'u (low/mid/high) kurması,
// kaynak uyumluluğu (SADECE groove+upload — dolu bağlam şartı).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/tonal-denge.js";
import { representativeLevelForTier } from "../www/js/core/difficulty-curve.js";

describe("Tonal Denge — createQuestion() genel sözleşme", () => {
  for (const level of Object.keys(mode.DIFFICULTY)) {
    it(`createQuestion("${level}") geçerli bir soru üretir`, () => {
      const q = mode.createQuestion(level, { source: "groove", boss: false });
      assert.equal(q.mode, "tonal-denge");
      assert.equal(q.difficulty, level);
      assert.ok(Array.isArray(q.variants) && q.variants.length === 3, "HER ZAMAN tam 3 varyant");
      assert.ok(q.oddIndex >= 0 && q.oddIndex <= 2);
      assert.equal(typeof q.hintUsed, "boolean");
      assert.equal(q.hintUsed, false);
      assert.ok(Array.isArray(q.choices) && q.choices.length === 3, "şık sayısı HER ZAMAN 3 (A/B/C)");
    });

    it(`createQuestion("${level}") SAF fonksiyondur: JSON'a sorunsuz serileşir`, () => {
      const q = mode.createQuestion(level, { source: "groove", boss: false });
      const json = JSON.stringify(q);
      assert.ok(json.length > 0);
      assert.equal(typeof q.applyProcessing, "undefined");
    });
  }

  it("şık sayısı HİÇBİR zorlukta/pozisyonda 3'ten SAPMAZ — 200 örnek/zorluk", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 200; i++) {
        const q = mode.createQuestion(level, { source: "groove", boss: false });
        assert.equal(q.choices.length, 3, `${level}: ${q.choices.length} şık`);
        assert.deepEqual(q.choices.map(c => c.id).sort(), ["A", "B", "C"]);
      }
    }
  });

  it("variants HER ZAMAN harf sırasında (A,B,C) — pozisyon karışmaz, SADECE oddIndex rastgele", () => {
    for (let i = 0; i < 50; i++) {
      const q = mode.createQuestion("medium", { source: "groove", boss: false });
      assert.deepEqual(q.variants.map(v => v.letter), ["A", "B", "C"]);
    }
  });

  it("oddIndex İSTATİSTİKSEL olarak üç konuma da (0,1,2) dağılıyor — 300 örnek", () => {
    const counts = [0, 0, 0];
    for (let i = 0; i < 300; i++) {
      const q = mode.createQuestion("medium", { source: "groove", boss: false });
      counts[q.oddIndex]++;
    }
    counts.forEach((c, i) => assert.ok(c > 50, `oddIndex=${i}: sadece ${c}/300`));
  });

  it("doğru şık (choices[].correct) TAM oddIndex'teki harfle eşleşir, TAM BİR kez var", () => {
    for (let i = 0; i < 100; i++) {
      const q = mode.createQuestion("medium", { source: "groove", boss: false });
      const correctChoices = q.choices.filter(c => c.correct);
      assert.equal(correctChoices.length, 1);
      assert.equal(correctChoices[0].id, q.variants[q.oddIndex].letter);
    }
  });

  it("İKİ 'aynı' varyant HER ZAMAN TAM NÖTR (shape='flat', k=0, üç kazanç da 0) — Kompresör/Reverb'in AKSİNE baz nötr, ikisi de", () => {
    for (let i = 0; i < 200; i++) {
      const q = mode.createQuestion("medium", { source: "groove", boss: false });
      const sameOnes = q.variants.filter((v, i2) => i2 !== q.oddIndex);
      assert.equal(sameOnes.length, 2);
      sameOnes.forEach(v => {
        assert.equal(v.shape, "flat");
        assert.equal(v.k, 0);
        assert.equal(v.lowGainDb, 0);
        assert.equal(v.midGainDb, 0);
        assert.equal(v.highGainDb, 0);
        assert.equal(v.imbalanceScore, 0);
      });
    }
  });

  it("FARKLI olan varyant HİÇBİR ZAMAN flat DEĞİL — k>0, imbalanceScore>0", () => {
    for (let i = 0; i < 200; i++) {
      const q = mode.createQuestion("medium", { source: "groove", boss: false });
      const odd = q.variants[q.oddIndex];
      assert.notEqual(odd.shape, "flat");
      assert.ok(odd.k > 0, "odd k pozitif olmalıydı");
      assert.ok(odd.imbalanceScore > 0, "odd imbalanceScore pozitif olmalıydı");
    }
  });
});

describe("Tonal Denge — buildVariant / TEK ALGISAL EKSEN (imbalanceScore)", () => {
  it("shape='flat' TÜM kazançları 0 döndürür, k ne olursa olsun (baz nötr referans)", () => {
    for (const k of [0, 0.3, 0.95, 1]) {
      const v = mode.buildVariant("A", "flat", k);
      assert.equal(v.lowGainDb, 0);
      assert.equal(v.midGainDb, 0);
      assert.equal(v.highGainDb, 0);
      assert.equal(v.imbalanceScore, 0);
    }
  });

  it("tilt-bass: bas YUKARI, tiz AŞAĞI, orta 0 — ZIT yönde EŞİT büyüklük", () => {
    const v = mode.buildVariant("A", "tilt-bass", 0.5);
    assert.ok(v.lowGainDb > 0, "bas artmalıydı");
    assert.ok(v.highGainDb < 0, "tiz azalmalıydı");
    assert.equal(v.midGainDb, 0);
    assert.ok(Math.abs(v.lowGainDb - Math.abs(v.highGainDb)) < 1e-9, "iki bandın büyüklüğü EŞİT olmalıydı (tek eksen)");
  });

  it("tilt-treble: tiz YUKARI, bas AŞAĞI, orta 0 — tilt-bass'ın TAM TERSİ", () => {
    const v = mode.buildVariant("A", "tilt-treble", 0.5);
    assert.ok(v.highGainDb > 0, "tiz artmalıydı");
    assert.ok(v.lowGainDb < 0, "bas azalmalıydı");
    assert.equal(v.midGainDb, 0);
  });

  it("smile: bas VE tiz YUKARI, orta AŞAĞI (iki bölgeli)", () => {
    const v = mode.buildVariant("A", "smile", 0.5);
    assert.ok(v.lowGainDb > 0 && v.highGainDb > 0, "bas ve tiz İKİSİ de artmalıydı");
    assert.ok(v.midGainDb < 0, "orta azalmalıydı");
  });

  it("frown: bas VE tiz AŞAĞI, orta YUKARI — smile'ın TAM TERSİ", () => {
    const v = mode.buildVariant("A", "frown", 0.5);
    assert.ok(v.lowGainDb < 0 && v.highGainDb < 0, "bas ve tiz İKİSİ de azalmalıydı");
    assert.ok(v.midGainDb > 0, "orta artmalıydı");
  });

  it("imbalanceScore k arttıkça KESİNTİSİZ/MONOTON artar — HER şekil ailesinde", () => {
    for (const shape of mode.SHAPE_IDS) {
      let prev = -Infinity;
      for (let k = 0; k <= 1; k += 0.05) {
        const v = mode.buildVariant("A", shape, k);
        assert.ok(v.imbalanceScore >= prev - 1e-9, `${shape} k=${k.toFixed(2)}'de imbalanceScore azaldı`);
        prev = v.imbalanceScore;
      }
    }
  });

  it("imbalanceScore ŞEKİLDEN BAĞIMSIZ TEK bir eksen — AYNI k'de dört şeklin de imbalanceScore'u BİREBİR eşit", () => {
    for (const k of [0.1, 0.5, 0.9]) {
      const scores = mode.SHAPE_IDS.map(shape => mode.buildVariant("A", shape, k).imbalanceScore);
      scores.forEach(s => assert.ok(Math.abs(s - k * mode.TILT_MAX_DB) < 1e-9, `k=${k}: ${s} != ${k * mode.TILT_MAX_DB}`));
    }
  });
});

describe("Tonal Denge — pickKGap (dar jitter + FLOOR/ÜST clamp garantisi)", () => {
  it("pickKGap HİÇBİR ZAMAN K_GAP_FLOOR'un altına inmez — baseKGap TAM floor'da bile (5000 örnek)", () => {
    const floor = mode.TONAL_CURVE_CONFIG.K_GAP_FLOOR;
    for (let i = 0; i < 5000; i++) {
      const v = mode.pickKGap(floor);
      assert.ok(v >= floor - 1e-9, `floor ihlali: ${v} < ${floor}`);
    }
  });

  it("pickKGap HİÇBİR ZAMAN 1'i AŞMAZ — baseKGap K_GAP_AT_1'de (jitter üst ucu ~1.007) bile (5000 örnek)", () => {
    for (let i = 0; i < 5000; i++) {
      const v = mode.pickKGap(mode.TONAL_CURVE_CONFIG.K_GAP_AT_1);
      assert.ok(v <= 1 + 1e-9, `üst clamp ihlali: ${v} > 1`);
    }
  });

  it("pickKGap'in ortalaması (N=2000) baseKGap'e YAKIN kalır — jitter sinyali BOĞMUYOR", () => {
    const N = 2000;
    for (const base of [0.55, 0.28, 0.12, mode.TONAL_CURVE_CONFIG.K_GAP_FLOOR + 0.02]) {
      let sum = 0;
      for (let i = 0; i < N; i++) sum += mode.pickKGap(base);
      const avg = sum / N;
      assert.ok(Math.abs(avg - base) / base < 0.03, `base=${base}: ortalama ${avg.toFixed(4)}, sapma %${(Math.abs(avg - base) / base * 100).toFixed(1)}`);
    }
  });
});

describe("Tonal Denge — imbalanceScore FLOOR'u (kulağın ayıramayacağı fark ASLA üretilmez)", () => {
  it("K_GAP_FLOOR'da (jitter yok) imbalanceScore en az ~0.8dB — hesap DOĞRUDAN doğrulanır", () => {
    const floor = mode.TONAL_CURVE_CONFIG.K_GAP_FLOOR;
    const v = mode.buildVariant("A", "tilt-bass", floor);
    assert.ok(v.imbalanceScore >= 0.8, `imbalanceScore ${v.imbalanceScore.toFixed(2)}dB < 0.8dB`);
  });

  it("gerçek createQuestion çıktısında (jitter dahil, 2000 örnek/pro) imbalanceScore ASLA 0.7dB'nin altına inmez", () => {
    let minScore = Infinity;
    for (let i = 0; i < 2000; i++) {
      const q = mode.createQuestion("pro", { source: "groove", boss: false, difficultyPosition: mode.TONAL_CURVE_CONFIG.LEVEL_CAP });
      minScore = Math.min(minScore, q.variants[q.oddIndex].imbalanceScore);
    }
    assert.ok(minScore >= 0.7, `2000 örnekte en küçük imbalanceScore ${minScore.toFixed(3)}dB < 0.7dB`);
  });
});

describe("Tonal Denge — PRO katmanı 'şekil değişimi' (smile/frown, öğretmen yöntemi)", () => {
  it("easy/medium/hard'da ASLA smile/frown çıkmaz — SADECE tilt-bass/tilt-treble (300 örnek/tier)", () => {
    for (const level of ["easy", "medium", "hard"]) {
      for (let i = 0; i < 300; i++) {
        const q = mode.createQuestion(level, { source: "groove", boss: false });
        const shape = q.variants[q.oddIndex].shape;
        assert.ok(shape === "tilt-bass" || shape === "tilt-treble", `${level}: beklenmeyen şekil ${shape}`);
      }
    }
  });

  it("pro/proplus'ta smile/frown İSTATİSTİKSEL olarak ~%50 çıkar (1000 örnek, [%30,%70] toleransla)", () => {
    for (const level of ["pro", "proplus"]) {
      let complexCount = 0;
      const N = 1000;
      for (let i = 0; i < N; i++) {
        const q = mode.createQuestion(level, { source: "groove", boss: false });
        if (q.variants[q.oddIndex].shape === "smile" || q.variants[q.oddIndex].shape === "frown") complexCount++;
      }
      const ratio = complexCount / N;
      assert.ok(ratio > 0.3 && ratio < 0.7, `${level}: karmaşık şekil oranı %${(ratio * 100).toFixed(1)} — ~%50 bekleniyordu`);
    }
  });

  it("Otomatik modda position TONAL_COMPLEX_SHAPE_POSITION_THRESHOLD'un ALTINDAYSA smile/frown ASLA çıkmaz", () => {
    const belowThreshold = mode.TONAL_COMPLEX_SHAPE_POSITION_THRESHOLD - 1;
    for (let i = 0; i < 300; i++) {
      const q = mode.createQuestion("medium", { source: "groove", boss: false, difficultyPosition: belowThreshold });
      const shape = q.variants[q.oddIndex].shape;
      assert.ok(shape === "tilt-bass" || shape === "tilt-treble", `beklenmeyen şekil ${shape}`);
    }
  });

  it("q.complexShapeTier bayrağı doğru — pro/proplus'ta true, easy/medium/hard'da false (eğrisiz statik çağrı)", () => {
    for (const level of ["easy", "medium", "hard"]) {
      assert.equal(mode.createQuestion(level, { source: "groove" }).complexShapeTier, false, `${level}: false olmalıydı`);
    }
    for (const level of ["pro", "proplus"]) {
      assert.equal(mode.createQuestion(level, { source: "groove" }).complexShapeTier, true, `${level}: true olmalıydı`);
    }
  });
});

describe("Tonal Denge — evaluateAnswer", () => {
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

describe("Tonal Denge — calculateXP sağlamlık", () => {
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

describe("Tonal Denge — öğretici metin (teachingText/getFeedbackData) — mix dilinde, bölge+yön+dB", () => {
  it("tilt-bass: metin harfi + 'bas-ağır' + düşük/tiz dB değerlerini + mix anlamını içerir", () => {
    const q = { oddIndex: 1, variants: [
      { letter: "A", shape: "flat", lowGainDb: 0, midGainDb: 0, highGainDb: 0, imbalanceScore: 0 },
      { letter: "B", shape: "tilt-bass", lowGainDb: 4.2, midGainDb: 0, highGainDb: -4.2, imbalanceScore: 4.2 },
      { letter: "C", shape: "flat", lowGainDb: 0, midGainDb: 0, highGainDb: 0, imbalanceScore: 0 }
    ] };
    const text = mode.teachingText(q, "B");
    assert.match(text, /B/);
    assert.match(text, /bas-ağır/);
    assert.match(text, /\+4\.2dB/);
    assert.match(text, /-4\.2dB/);
    assert.match(text, /boğuk|çamurlu/);
  });

  it("smile (PRO): metin 'smile' + bas/orta/tiz ÜÇ değeri + 'havalı'/mixte kaybolma anlamını içerir", () => {
    const q = { oddIndex: 0, variants: [
      { letter: "A", shape: "smile", lowGainDb: 3.0, midGainDb: -3.0, highGainDb: 3.0, imbalanceScore: 3.0 },
      { letter: "B", shape: "flat", lowGainDb: 0, midGainDb: 0, highGainDb: 0, imbalanceScore: 0 },
      { letter: "C", shape: "flat", lowGainDb: 0, midGainDb: 0, highGainDb: 0, imbalanceScore: 0 }
    ] };
    const text = mode.teachingText(q, "A");
    assert.match(text, /smile/);
    assert.match(text, /orta -3\.0dB/);
    assert.match(text, /havalı/);
  });

  it("YANLIŞ durumda kullanıcının seçtiği harf de metinde geçer", () => {
    const q = { oddIndex: 1, variants: [
      { letter: "A", shape: "flat", lowGainDb: 0, midGainDb: 0, highGainDb: 0, imbalanceScore: 0 },
      { letter: "B", shape: "tilt-treble", lowGainDb: -5, midGainDb: 0, highGainDb: 5, imbalanceScore: 5 },
      { letter: "C", shape: "flat", lowGainDb: 0, midGainDb: 0, highGainDb: 0, imbalanceScore: 0 }
    ] };
    const text = mode.teachingText(q, "A");
    assert.match(text, /sen A dedin/);
    assert.match(text, /B dengesizdi/);
  });

  it("hiçbir durum boş/bozuk metin üretmez (3 harf × gerçek createQuestion çıktıları, HER şekil)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 15; i++) {
        const q = mode.createQuestion(level, { source: "groove", boss: false });
        for (const guess of ["A", "B", "C"]) {
          const text = mode.teachingText(q, guess);
          assert.ok(text && text.length >= 10, `${level} guess=${guess}: kısa/boş metin`);
          assert.doesNotMatch(text, /undefined|NaN|\[object/, `${level} guess=${guess}: bozuk metin: ${text}`);
        }
      }
    }
  });

  it("getFeedbackData showResult HER ZAMAN true, panel HER ZAMAN null", () => {
    const q = mode.createQuestion("medium", { source: "groove", boss: false });
    const correctLetter = q.choices.find(c => c.correct).id;
    const wrongLetter = q.choices.find(c => !c.correct).id;
    const correctFb = mode.getFeedbackData(q, correctLetter, { gained: 10 });
    const wrongFb = mode.getFeedbackData(q, wrongLetter, { gained: 0 });
    assert.equal(correctFb.showResult, true);
    assert.equal(correctFb.panel, null);
    assert.equal(wrongFb.showResult, true);
    assert.equal(wrongFb.panel, null);
  });

  it("correctLabel şekil etiketi + imbalanceScore'u birlikte gösterir", () => {
    const q = { oddIndex: 0, variants: [{ letter: "A", shape: "tilt-treble", imbalanceScore: 6.7 }] };
    const label = mode.correctLabel(q);
    assert.match(label, /A/);
    assert.match(label, /tiz-ağır/);
    assert.match(label, /6\.7/);
  });
});

describe("Tonal Denge — getHintText: HANGİ harf olduğunu ASLA vermez, sadece şekli söyler", () => {
  it("dört şeklin de kendine özgü, harf içermeyen bir ipucu metni var", () => {
    for (const shape of mode.SHAPE_IDS) {
      const q = { oddIndex: 0, variants: [{ letter: "A", shape }] };
      const hint = mode.getHintText(q);
      assert.ok(hint && hint.length > 5);
      assert.doesNotMatch(hint, /\bA\b/, `ipucu harfi (A) sızdırıyor: ${hint}`);
    }
  });
});

describe("Tonal Denge — applyProcessing (previewLetter'a göre doğru üç BiquadFilterNode, sahte audioCtx ile)", () => {
  function makeFakeAudioCtx() {
    const created = [];
    return {
      created,
      createBiquadFilter: () => {
        const f = { type: "", frequency: { value: 0 }, Q: { value: 0 }, gain: { value: 0 } };
        created.push(f);
        return f;
      }
    };
  }

  it("previewLetter VERİLMEZSE variants[0] (A), VERİLİRSE o harfin low/mid/high kazançlarını kullanan ÜÇ node döner (low→mid→high sırayla)", () => {
    const q = { variants: [
      { letter: "A", lowGainDb: 5, midGainDb: 0, highGainDb: -5 },
      { letter: "B", lowGainDb: -8, midGainDb: 8, highGainDb: -8 },
      { letter: "C", lowGainDb: 5, midGainDb: 0, highGainDb: -5 }
    ] };

    const ctx1 = makeFakeAudioCtx();
    const { filters: f1 } = mode.applyProcessing(q, { audioCtx: ctx1 });
    assert.equal(f1.length, 3, "low+mid+high — TAM 3 node");
    assert.equal(f1[0].type, "lowshelf");
    assert.equal(f1[1].type, "peaking");
    assert.equal(f1[2].type, "highshelf");
    assert.equal(f1[0].gain.value, 5, "previewLetter yokken variants[0] (A) kullanılmalıydı");
    assert.equal(f1[1].gain.value, 0);
    assert.equal(f1[2].gain.value, -5);
    assert.equal(f1[0].frequency.value, mode.SHELF_LOW_FREQ);
    assert.equal(f1[1].frequency.value, mode.MID_PEAK_FREQ);
    assert.equal(f1[2].frequency.value, mode.SHELF_HIGH_FREQ);

    const ctx2 = makeFakeAudioCtx();
    const { filters: f2 } = mode.applyProcessing({ ...q, previewLetter: "B" }, { audioCtx: ctx2 });
    assert.equal(f2[0].gain.value, -8, "previewLetter='B' verilince O harfin low kazancı kullanılmalıydı");
    assert.equal(f2[1].gain.value, 8, "previewLetter='B' verilince O harfin mid kazancı da kullanılmalıydı");
    assert.equal(f2[2].gain.value, -8, "previewLetter='B' verilince O harfin high kazancı da kullanılmalıydı");
  });

  it("flat (nötr) varyantta ÜÇ node'un da gain'i TAM 0 — filtreler KURULUR ama etkisiz kalır", () => {
    const q = { variants: [{ letter: "A", lowGainDb: 0, midGainDb: 0, highGainDb: 0 }] };
    const ctx = makeFakeAudioCtx();
    const { filters } = mode.applyProcessing(q, { audioCtx: ctx });
    assert.equal(filters.length, 3);
    filters.forEach(f => assert.equal(f.gain.value, 0));
  });
});

describe("Tonal Denge — paramsForDifficultyPosition() (merkezi zorluk eğrisi)", () => {
  it("position arttıkça kGap PÜRÜZSÜZ (monoton) KÜÇÜLÜR", () => {
    let prev = Infinity;
    for (let p = 1; p <= 20; p += 0.25) {
      const { kGap } = mode.paramsForDifficultyPosition(p);
      assert.ok(kGap <= prev + 1e-9, `position ${p}'de kGap azalmadı`);
      prev = kGap;
    }
  });

  it("position arttıkça timeSec PÜRÜZSÜZ (monoton) KÜÇÜLÜR", () => {
    let prev = Infinity;
    for (let p = 1; p <= 20; p += 0.25) {
      const { timeSec } = mode.paramsForDifficultyPosition(p);
      assert.ok(timeSec <= prev + 1e-9, `position ${p}'de timeSec azalmadı`);
      prev = timeSec;
    }
  });

  it("position=1'de AT_1, position=LEVEL_CAP'te AT_CAP değerlerini birebir döner", () => {
    const cfg = mode.TONAL_CURVE_CONFIG;
    const p1 = mode.paramsForDifficultyPosition(1);
    const pCap = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    assert.ok(Math.abs(p1.kGap - cfg.K_GAP_AT_1) < 1e-9);
    assert.ok(Math.abs(pCap.kGap - cfg.K_GAP_AT_CAP) < 1e-9);
  });

  it("LEVEL_CAP'in ÇOK ötesinde kGap/timeSec bir TABANIN altına inmez", () => {
    const cfg = mode.TONAL_CURVE_CONFIG;
    const far = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP + 1000);
    assert.ok(far.kGap >= cfg.K_GAP_FLOOR - 1e-9);
    assert.ok(far.timeSec >= cfg.TIME_SEC_FLOOR - 1e-9);
  });

  it("position<1 veya ondalık için düşmez, position 1 gibi davranır", () => {
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(0));
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(-5));
    assert.equal(mode.paramsForDifficultyPosition(0).position, 1);
  });
});

describe("Tonal Denge — createQuestion(settings.difficultyPosition) entegrasyonu", () => {
  it("difficultyPosition VERİLMEZSE davranış eski statik tabloyla BİREBİR aynı kalır (proplus dahil): şık sayısı 3, timeSec statik", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 15; i++) {
        const q = mode.createQuestion(level, { source: "groove", boss: false });
        assert.equal(q.choices.length, 3);
        assert.equal(q.timeSec, mode.DIFFICULTY[level].time);
      }
    }
  });

  it("proplus'ta difficultyPosition verilse BİLE eğri devreye girmez (diğer yedi modun AYNI Z5 kararı)", () => {
    for (let i = 0; i < 10; i++) {
      const q = mode.createQuestion("proplus", { source: "groove", boss: false, difficultyPosition: 20 });
      assert.equal(q.timeSec, mode.DIFFICULTY.proplus.time);
    }
  });
});

describe("Tonal Denge — Sabit mod eğriye bağlı ('kolaylaşma yok' invaryantı)", () => {
  const TIERS = ["easy", "medium", "hard", "pro"];

  it("her tier'da: kGap eski statikten BÜYÜK DEĞİL (kolaylaşma yok — küçük=zor)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      assert.ok(p.kGap <= old.kGap + 1e-9, `${tier}: kGap ${p.kGap} > eski ${old.kGap}`);
    }
  });

  it("her tier'da: timeSec eski statikten BÜYÜK DEĞİL (kolaylaşma yok — az süre=zor)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      assert.ok(p.timeSec <= old.time + 1e-9, `${tier}: timeSec ${p.timeSec} > eski ${old.time}`);
    }
  });

  it("pro'nun temsilci seviyesi TAM LEVEL_CAP — eğrinin en zor noktası", () => {
    assert.equal(representativeLevelForTier("pro"), mode.TONAL_CURVE_CONFIG.LEVEL_CAP);
    const atCap = mode.paramsForDifficultyPosition(mode.TONAL_CURVE_CONFIG.LEVEL_CAP);
    const proRepr = mode.paramsForDifficultyPosition(representativeLevelForTier("pro"));
    assert.deepEqual(atCap, proRepr);
  });

  it("Sabit modun kompozisyonu uçtan uca hâlâ TAM 3 şık üretir (kGap ne olursa olsun)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      for (let i = 0; i < 10; i++) {
        const q = mode.createQuestion(tier, { source: "groove", boss: false, difficultyPosition: level });
        assert.equal(q.choices.length, 3, `${tier}: beklenen 3, gelen ${q.choices.length}`);
      }
    }
  });

  it("EASY (temsilci seviye) → EKSTREM/bariz imbalanceScore, PRO (temsilci seviye) → ince/subtle imbalanceScore — öğretmen yöntemi (N=200/tier)", () => {
    const N = 200;
    let easySum = 0, proSum = 0;
    for (let i = 0; i < N; i++) {
      const qEasy = mode.createQuestion("easy", { source: "groove", boss: false, difficultyPosition: representativeLevelForTier("easy") });
      const qPro = mode.createQuestion("pro", { source: "groove", boss: false, difficultyPosition: representativeLevelForTier("pro") });
      easySum += qEasy.variants[qEasy.oddIndex].imbalanceScore;
      proSum += qPro.variants[qPro.oddIndex].imbalanceScore;
    }
    const easyAvg = easySum / N, proAvg = proSum / N;
    assert.ok(easyAvg >= 5, `easy ortalama imbalanceScore ${easyAvg.toFixed(2)}dB — EKSTREM/bariz olmalıydı (>=5dB)`);
    assert.ok(proAvg < 2.5, `pro ortalama imbalanceScore ${proAvg.toFixed(2)}dB — ince/subtle olmalıydı (<2.5dB)`);
    assert.ok(proAvg < easyAvg, "pro her zaman easy'den daha ince olmalı");
  });
});

describe("Tonal Denge — getMeta() sözleşme alanları", () => {
  it("id/motor/kulaklikGerekli/uyumluKaynaklar/ucretsiz/videoUrl/difficulty/choiceOnly tanımlı, motor=2", () => {
    const meta = mode.getMeta();
    assert.equal(meta.id, "tonal-denge");
    assert.equal(meta.motor, 2, "Motor 2'nin üçüncü modu olmalıydı");
    assert.equal(typeof meta.kulaklikGerekli, "boolean");
    assert.equal(meta.kulaklikGerekli, true, "ince tonal fark için kulaklık ÖNERİLİR (task kararı)");
    assert.ok(Array.isArray(meta.uyumluKaynaklar));
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

  it("kaynak listesi TAM OLARAK groove+upload — tilt SADECE dolu spektrumda duyulur, diğer HER ŞEY (tek-vuruş/tek-nota/sentetik/gürültü) dışlanır", () => {
    const meta = mode.getMeta();
    assert.deepEqual([...meta.uyumluKaynaklar].sort(), ["groove", "upload"]);
  });

  it("tek-vuruş/tek-nota/sentetik/gürültü kaynaklar TEK TEK dışlanır", () => {
    const meta = mode.getMeta();
    for (const id of ["kick", "snare", "hihat", "tom", "bass", "bass_alt", "guitar", "vocal", "pink", "white", "saw", "square", "triangle"]) {
      assert.ok(!meta.uyumluKaynaklar.includes(id), `${id} listede olmamalıydı`);
    }
  });

  it("oynanabilirlik korunur: en az BİR gerçek kaynak (groove) kalır", () => {
    const meta = mode.getMeta();
    assert.ok(meta.uyumluKaynaklar.length >= 1);
    assert.ok(meta.uyumluKaynaklar.includes("groove"));
  });
});

describe("Tonal Denge — diğer modlarla KARŞILAŞTIRMA (bağlantı mekanizması ORTAK)", () => {
  it("AYNI position'da Kompresör'ün eğrisiyle Tonal Denge'nin eğrisi de AYNI yönde (monoton) hareket eder", async () => {
    const kompresor = await import("../www/js/modes/kompresor.js");
    const positions = [1, 2, 5, 10, 15, 20];
    let tdPrev = Infinity, compPrev = Infinity;
    for (const p of positions) {
      const tdVal = mode.paramsForDifficultyPosition(p).kGap;
      const compVal = kompresor.paramsForDifficultyPosition(p).kGap;
      assert.ok(tdVal <= tdPrev + 1e-9, `Tonal Denge: position ${p}'de artış`);
      assert.ok(compVal <= compPrev + 1e-9, `Kompresör: position ${p}'de artış`);
      tdPrev = tdVal; compPrev = compVal;
    }
  });

  it("THREE_WAY=true export edilmiş — Kompresör/Reverb'in AYNI bayrağı", async () => {
    const kompresor = await import("../www/js/modes/kompresor.js");
    assert.equal(mode.THREE_WAY, true);
    assert.equal(kompresor.THREE_WAY, true);
  });

  it("renderAnswerChoices/markAnswerChoices/updateAnswerPlayState three-way-cards.js'ten MİRAS ALINDI — Kompresör/Reverb'le AYNI referans (gerçek delegasyon, kopya değil)", async () => {
    const threeWayCards = await import("../www/js/core/three-way-cards.js");
    assert.equal(mode.renderAnswerChoices, threeWayCards.renderThreeWayCards);
    assert.equal(mode.markAnswerChoices, threeWayCards.markThreeWayCards);
    assert.equal(mode.updateAnswerPlayState, threeWayCards.updateThreeWayCardsPlayState);
  });
});

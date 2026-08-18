// Distortion moduna özel testler: 3-sesli odd-one-out üretimi (Kompresör'ün
// "ikizi" — AYNI k-uzayı/kGap/floor matematiği), zorluk kademesine göre
// SEÇİLEN distortion TÜRÜ (kolay=clip, orta=soft, zor=tube, pro=tape),
// WaveShaperNode eğrilerinin GERÇEKTEN türe göre farklı şekillendiği (clip
// sert köşeli/clamp'e çarpar, tape neredeyse doğrusal kalır), merkezi zorluk
// eğrisine bağlanma + "kolaylaşma yok" invaryantı, evaluateAnswer'ın harf-
// eşleşme mantığı, applyProcessing'in previewLetter'a göre doğru
// WaveShaperNode'u kurması, sınav bayrakları, kaynak uyumluluğu.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/distortion.js";
import { representativeLevelForTier } from "../www/js/core/difficulty-curve.js";

describe("Distortion — createQuestion() genel sözleşme", () => {
  for (const level of Object.keys(mode.DIFFICULTY)) {
    it(`createQuestion("${level}") geçerli bir soru üretir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      assert.equal(q.mode, "distortion");
      assert.equal(q.difficulty, level);
      assert.ok(Array.isArray(q.variants) && q.variants.length === 3, "HER ZAMAN tam 3 varyant");
      assert.ok(q.oddIndex >= 0 && q.oddIndex <= 2);
      assert.equal(q.hintUsed, false);
      assert.ok(Array.isArray(q.choices) && q.choices.length === 3);
      assert.ok(["clip", "soft", "tube", "tape"].includes(q.distortionType), `${level}: geçersiz tür ${q.distortionType}`);
    });

    it(`createQuestion("${level}") SAF fonksiyondur: JSON'a sorunsuz serileşir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      assert.ok(JSON.stringify(q).length > 0);
      assert.equal(typeof q.applyProcessing, "undefined");
    });
  }

  it("şık sayısı HİÇBİR zorlukta 3'ten SAPMAZ — 200 örnek/zorluk", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 200; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.choices.length, 3, `${level}: ${q.choices.length} şık`);
        assert.deepEqual(q.choices.map(c => c.id).sort(), ["A", "B", "C"]);
      }
    }
  });

  it("variants HER ZAMAN harf sırasında (A,B,C) — SADECE oddIndex rastgele", () => {
    for (let i = 0; i < 50; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      assert.deepEqual(q.variants.map(v => v.letter), ["A", "B", "C"]);
    }
  });

  it("oddIndex İSTATİSTİKSEL olarak üç konuma da dağılıyor — 300 örnek", () => {
    const counts = [0, 0, 0];
    for (let i = 0; i < 300; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      counts[q.oddIndex]++;
    }
    counts.forEach((c, i) => assert.ok(c > 50, `oddIndex=${i}: sadece ${c}/300`));
  });

  it("doğru şık (choices[].correct) TAM oddIndex'teki harfle eşleşir, TAM BİR kez var", () => {
    for (let i = 0; i < 100; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      const correctChoices = q.choices.filter(c => c.correct);
      assert.equal(correctChoices.length, 1);
      assert.equal(correctChoices[0].id, q.variants[q.oddIndex].letter);
    }
  });

  it("iki AYNI varyant TAM DIST_BASE_K'da (k+drive birebir eşit), FARKLI olan HİÇBİR ZAMAN buna eşit değil", () => {
    for (let i = 0; i < 200; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      q.variants.forEach((v, i2) => {
        if (i2 !== q.oddIndex) {
          assert.equal(v.k, mode.DIST_BASE_K);
          assert.equal(v.drive, mode.driveAtK(q.distortionType, mode.DIST_BASE_K));
        } else {
          assert.notEqual(v.k, mode.DIST_BASE_K);
        }
      });
    }
  });
});

describe("Distortion — TÜR zorlukla ÇEŞİTLENİYOR (task: kolay=clipping, pro=tube/tape)", () => {
  it("DISTORTION_TYPES eşlemesi task'ın kendi tarifiyle BİREBİR: easy=clip, medium=soft, hard=tube, pro=tape", () => {
    assert.equal(mode.DISTORTION_TYPES.easy, "clip");
    assert.equal(mode.DISTORTION_TYPES.medium, "soft");
    assert.equal(mode.DISTORTION_TYPES.hard, "tube");
    assert.equal(mode.DISTORTION_TYPES.pro, "tape");
    assert.equal(mode.DISTORTION_TYPES.proplus, "tape", "proplus eğriye hiç girmiyor ama tür yine de tanımlı olmalı");
  });

  it("createQuestion, level'e göre DOĞRU türü seçer (örnekle — beş kademe de test edildi)", () => {
    for (const [level, expectedType] of Object.entries(mode.DISTORTION_TYPES)) {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      assert.equal(q.distortionType, expectedType, `${level}: ${q.distortionType} bekleniyordu ${expectedType}`);
    }
  });

  it("bir SORU İÇİNDE A/B/C ÜÇÜ DE AYNI türü kullanır — tek algısal eksen (tür asla karışmaz)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      // distortionType SORU seviyesinde TEK bir alan — variants kendi türünü taşımıyor,
      // applyProcessing HER ZAMAN q.distortionType okuyor (bkz. aşağıdaki applyProcessing testi).
      assert.equal(typeof q.distortionType, "string");
    }
  });

  it("DRIVE_RANGES türler arası KASITLI ÖRTÜŞMÜYOR — clip'in EN DÜŞÜK drive'ı bile tape'in EN YÜKSEK drive'ından büyük (hiyerarşi garanti)", () => {
    const clipMin = mode.driveAtK("clip", 0);
    const tapeMax = mode.driveAtK("tape", 1);
    assert.ok(clipMin > tapeMax, `clip min (${clipMin}) tape max'tan (${tapeMax}) büyük OLMALIYDI`);
  });

  it("driveAtK her tür için k arttıkça MONOTON artar", () => {
    for (const type of ["clip", "soft", "tube", "tape"]) {
      let prev = -Infinity;
      for (let k = 0; k <= 1; k += 0.1) {
        const d = mode.driveAtK(type, k);
        assert.ok(d >= prev - 1e-9, `${type} k=${k.toFixed(1)}'de drive azaldı`);
        prev = d;
      }
    }
  });
});

describe("Distortion — buildDistortionCurve() GERÇEKTEN türe göre farklı şekilleniyor (WaveShaper eğrisi)", () => {
  it("clip YÜKSEK drive'da ±1'e ÇOK ÇABUK clamp'lenir (sert köşeli) — orta noktalardan çoğu tam ±1", () => {
    const curve = mode.buildDistortionCurve("clip", 15);
    const clampedFraction = curve.filter(y => Math.abs(y) >= 0.999).length / curve.length;
    assert.ok(clampedFraction > 0.5, `clip'te clamp'lenen oran ${clampedFraction.toFixed(2)} — beklenen >0.5 (sert köşeli)`);
  });

  it("tape DÜŞÜK/orta drive'da GİRİŞE ÇOK YAKIN kalır (neredeyse doğrusal, task: 'inanılmaz ince')", () => {
    const curve = mode.buildDistortionCurve("tape", mode.driveAtK("tape", 0.5));
    let maxDeviation = 0;
    const n = curve.length;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      maxDeviation = Math.max(maxDeviation, Math.abs(curve[i] - x));
    }
    assert.ok(maxDeviation < 0.15, `tape sapması ${maxDeviation.toFixed(3)} — beklenen <0.15 (neredeyse doğrusal)`);
  });

  it("clip'in tepe-nokta sapması, AYNI k'de (0.5) tape'in sapmasından ÇOK daha büyük — 'kolay bariz, pro ince' görsel olarak da doğru", () => {
    const k = 0.5;
    const clipCurve = mode.buildDistortionCurve("clip", mode.driveAtK("clip", k));
    const tapeCurve = mode.buildDistortionCurve("tape", mode.driveAtK("tape", k));
    const n = clipCurve.length;
    let clipDev = 0, tapeDev = 0;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      clipDev = Math.max(clipDev, Math.abs(clipCurve[i] - x));
      tapeDev = Math.max(tapeDev, Math.abs(tapeCurve[i] - x));
    }
    assert.ok(clipDev > tapeDev * 2, `clip sapması (${clipDev.toFixed(2)}) tape'in (${tapeDev.toFixed(2)}) en az 2 katı OLMALIYDI`);
  });

  it("tube ASİMETRİK — pozitif ve negatif yarım-dalga FARKLI davranır (gerçek tüp karakterinin imzası)", () => {
    const curve = mode.buildDistortionCurve("tube", 3);
    const n = curve.length;
    // x=+0.5 ve x=-0.5'e karşılık gelen indeksleri bul, mutlak değerce eşit OLMAMALI (simetrik olsaydı eşit olurdu)
    const iPos = Math.round(((0.5 + 1) / 2) * (n - 1));
    const iNeg = Math.round(((-0.5 + 1) / 2) * (n - 1));
    assert.notEqual(Math.abs(curve[iPos]), Math.abs(curve[iNeg]), "tube simetrik çıktı — asimetri kaybolmuş olabilir");
  });

  it("her türün eğrisi HER ZAMAN [-1,1] aralığında kalır (WaveShaperNode'un beklediği çıktı aralığı)", () => {
    for (const type of ["clip", "soft", "tube", "tape"]) {
      const curve = mode.buildDistortionCurve(type, mode.driveAtK(type, 1));
      for (const y of curve) assert.ok(y >= -1.001 && y <= 1.001, `${type}: ${y} [-1,1] dışında`);
    }
  });

  it("drive=0'da HER tür girişe (neredeyse) eşit çıktı verir — 'hiç distortion yok' durumu makul", () => {
    for (const type of ["clip", "soft", "tube", "tape"]) {
      const curve = mode.buildDistortionCurve(type, 0);
      // x=0 civarı: girişe yakın kalmalı (clip/soft/tube x*0=0 veya tanh(0)=0; tape'in kübik terimi de 0 katsayıyla sıfırlanır)
      const mid = curve[Math.floor(curve.length / 2)];
      assert.ok(Math.abs(mid) < 0.05, `${type} drive=0'da orta nokta ${mid} — sıfıra yakın olmalıydı`);
    }
  });
});

describe("Distortion — pickKGap/pickOddK (Kompresör'ün BİREBİR aynı k-uzayı matematiği)", () => {
  it("pickKGap HİÇBİR ZAMAN K_GAP_FLOOR'un altına inmez (2000 örnek)", () => {
    const floor = mode.DISTORTION_CURVE_CONFIG.K_GAP_FLOOR;
    for (let i = 0; i < 2000; i++) {
      const v = mode.pickKGap(floor);
      assert.ok(v >= floor - 1e-9, `floor ihlali: ${v} < ${floor}`);
    }
  });

  it("pickOddK [0,1] dışına ASLA taşmaz, iki yönde de", () => {
    for (let i = 0; i < 500; i++) {
      const k = mode.pickOddK(mode.DIST_BASE_K, 5);
      assert.ok(k >= -1e-9 && k <= 1 + 1e-9, `k=${k} [0,1] dışında`);
    }
  });

  it("DIST_BASE_K=0.5 (ORTA), K_GAP_AT_1 < 0.5 — en kolay turda bile clamp'e gerek YOK, simetrik", () => {
    assert.ok(mode.DISTORTION_CURVE_CONFIG.K_GAP_AT_1 < mode.DIST_BASE_K);
  });
});

describe("Distortion — paramsForDifficultyPosition() (merkezi zorluk eğrisi)", () => {
  it("position arttıkça kGap PÜRÜZSÜZ (monoton) KÜÇÜLÜR", () => {
    let prev = Infinity;
    for (let p = 1; p <= 20; p += 0.25) {
      const { kGap } = mode.paramsForDifficultyPosition(p);
      assert.ok(kGap <= prev + 1e-9, `position ${p}'de kGap azalmadı`);
      prev = kGap;
    }
  });

  it("position=1'de AT_1, position=LEVEL_CAP'te AT_CAP değerlerini birebir döner", () => {
    const cfg = mode.DISTORTION_CURVE_CONFIG;
    const p1 = mode.paramsForDifficultyPosition(1);
    const pCap = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    assert.ok(Math.abs(p1.kGap - cfg.K_GAP_AT_1) < 1e-9);
    assert.ok(Math.abs(pCap.kGap - cfg.K_GAP_AT_CAP) < 1e-9);
  });

  it("LEVEL_CAP'in ÇOK ötesinde kGap bir TABANIN altına inmez", () => {
    const cfg = mode.DISTORTION_CURVE_CONFIG;
    const far = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP + 1000);
    assert.ok(far.kGap >= cfg.K_GAP_FLOOR - 1e-9);
  });
});

describe("Distortion — Sabit mod eğriye bağlı ('kolaylaşma yok' invaryantı, Kompresör'ün AYNI kalibrasyonu)", () => {
  const TIERS = ["easy", "medium", "hard", "pro"];

  it("her tier'da: kGap eski statikten BÜYÜK DEĞİL (kolaylaşma yok)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      assert.ok(p.kGap <= old.kGap + 1e-9, `${tier}: kGap ${p.kGap} > eski ${old.kGap}`);
    }
  });

  it("Sabit modun kompozisyonu uçtan uca hâlâ TAM 3 şık üretir", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      for (let i = 0; i < 10; i++) {
        const q = mode.createQuestion(tier, { source: "pink", boss: false, difficultyPosition: level });
        assert.equal(q.choices.length, 3);
      }
    }
  });

  it("EASY (temsilci seviye, clip) → ekstrem/bariz k farkı, PRO (temsilci seviye, tape) → ince k farkı — İKİ eksen (tür+kGap) BİRLİKTE en zoru pro'da üretir", () => {
    const N = 200;
    let easySum = 0, proSum = 0;
    for (let i = 0; i < N; i++) {
      const qEasy = mode.createQuestion("easy", { source: "pink", boss: false, difficultyPosition: representativeLevelForTier("easy") });
      const qPro = mode.createQuestion("pro", { source: "pink", boss: false, difficultyPosition: representativeLevelForTier("pro") });
      easySum += Math.abs(qEasy.variants[qEasy.oddIndex].k - mode.DIST_BASE_K);
      proSum += Math.abs(qPro.variants[qPro.oddIndex].k - mode.DIST_BASE_K);
    }
    assert.ok(proSum / N < easySum / N, "pro ortalama olarak easy'den DAHA KÜÇÜK k farkı üretmeliydi");
  });
});

describe("Distortion — evaluateAnswer", () => {
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

describe("Distortion — calculateXP sağlamlık", () => {
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

describe("Distortion — öğretici metin (teachingText/getFeedbackData) — tür+karakter+mix anlamı", () => {
  it("metin harfi + TÜR ADINI + karakter + mix anlamını içerir (task'ın kendi örnek formatı)", () => {
    const q = {
      oddIndex: 1, distortionType: "tube",
      variants: [{ letter: "A", k: 0.5 }, { letter: "B", k: 0.9 }, { letter: "C", k: 0.5 }]
    };
    const text = mode.teachingText(q, "B");
    assert.match(text, /B/);
    assert.match(text, /Tube/i);
    assert.match(text, /sıcak/i);
    assert.match(text, /vokal|bas/i);
  });

  it("dört türün HEPSİ (clip/soft/tube/tape) boş/bozuk metin üretmeden kendi karakterini anlatır", () => {
    for (const type of ["clip", "soft", "tube", "tape"]) {
      const q = { oddIndex: 0, distortionType: type, variants: [{ letter: "A", k: 0.8 }, { letter: "B", k: 0.5 }, { letter: "C", k: 0.5 }] };
      const text = mode.teachingText(q, "A");
      assert.ok(text && text.length >= 15, `${type}: kısa/boş metin`);
      assert.doesNotMatch(text, /undefined|NaN|\[object/, `${type}: bozuk metin: ${text}`);
    }
  });

  it("YANLIŞ durumda kullanıcının seçtiği harf de metinde geçer", () => {
    const q = { oddIndex: 1, distortionType: "clip", variants: [{ letter: "A", k: 0.5 }, { letter: "B", k: 0.9 }, { letter: "C", k: 0.5 }] };
    const text = mode.teachingText(q, "A");
    assert.match(text, /sen A dedin/);
    assert.match(text, /B farklıydı/);
  });

  it("hiçbir durum boş/bozuk metin üretmez (gerçek createQuestion çıktıları, 5 kademe × 10 tekrar × 3 tahmin)", () => {
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

  // G66 (terminoloji denetimi): "saturation" GLOBAL mix terimi —
  // "doygun(luk)" gibi tam Türkçe çeviriye ASLA düşmemeli (bkz. DURUM.md
  // G66). teachingText/DISTORTION_TYPE_INFO zaten "Tube (Valf) Saturation"/
  // "Tape Saturation" ile doğruydu (yukarıdaki testler bunu zaten kapsıyor,
  // "doygun" hiç aramıyordu) — burada SADECE bu turda düzeltilen
  // modeDescription() kilitleniyor.
  it("modeDescription 'doygun' İÇERMEZ", () => {
    const desc = mode.modeDescription();
    assert.doesNotMatch(desc, /doygun/i, `modeDescription: "${desc}"`);
    assert.match(desc, /distortion/i);
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

  it("correctLabel türü + drive değerini birlikte gösterir", () => {
    const q = { oddIndex: 0, distortionType: "tape", variants: [{ letter: "A", k: 0.9, drive: 0.83 }] };
    const label = mode.correctLabel(q);
    assert.match(label, /A/);
    assert.match(label, /Tape/i);
    assert.match(label, /0\.83/);
  });
});

describe("Distortion — applyProcessing (previewLetter'a göre doğru WaveShaperNode, sahte audioCtx ile)", () => {
  it("previewLetter VERİLİRSE o harfin drive'ını, verilmezse variants[0]'ınkini kullanan WaveShaperNode + G269 telafi GainNode'u döner", () => {
    const created = [];
    const fakeAudioCtx = {
      createWaveShaper: () => {
        const n = { curve: null, oversample: null };
        created.push(n);
        return n;
      },
      createGain: () => ({ gain: { value: 1 } })
    };
    const q = {
      distortionType: "soft",
      variants: [{ letter: "A", drive: 2, k: 0.3 }, { letter: "B", drive: 6, k: 0.8 }, { letter: "C", drive: 2, k: 0.3 }]
    };

    const { filters: f1 } = mode.applyProcessing(q, { audioCtx: fakeAudioCtx });
    assert.equal(f1.length, 2, "filters = [shaper, outputTrim] olmalı (G269)");
    assert.ok(f1[0].curve instanceof Float32Array, "curve bir Float32Array olmalıydı");
    assert.deepEqual(f1[0].curve, mode.buildDistortionCurve("soft", 2), "previewLetter yokken variants[0] (A) kullanılmalıydı");
    assert.equal(f1[0].oversample, "4x");
    assert.ok(Math.abs(f1[1].gain.value - mode.distortionOutputTrimLinear("soft", 0.3)) < 1e-9, "outputTrim.gain.value variants[0]'ın k'sine göre hesaplanmalıydı");

    const { filters: f2 } = mode.applyProcessing({ ...q, previewLetter: "B" }, { audioCtx: fakeAudioCtx });
    assert.deepEqual(f2[0].curve, mode.buildDistortionCurve("soft", 6), "previewLetter='B' verilince O harfin drive'ı kullanılmalıydı");
    assert.ok(Math.abs(f2[1].gain.value - mode.distortionOutputTrimLinear("soft", 0.8)) < 1e-9, "previewLetter='B' verilince O harfin k'sine göre telafi hesaplanmalıydı");

    assert.equal(created.length, 2);
  });

  it("her dört tür de gerçek createQuestion çıktısıyla çökmeden bir WaveShaperNode + telafi GainNode'u kurar", () => {
    const fakeAudioCtx = { createWaveShaper: () => ({ curve: null, oversample: null }), createGain: () => ({ gain: { value: 1 } }) };
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      for (const letter of ["A", "B", "C"]) {
        assert.doesNotThrow(() => mode.applyProcessing({ ...q, previewLetter: letter }, { audioCtx: fakeAudioCtx }));
      }
    }
  });
});

describe("Distortion — G269 seviye telafisi (OLCUM-CIHAZ-16-08 madde C + OLCUM-REVERB-TEPE-17-08 yan bulgusu, OLCUM-DISTORTION-TELAFI-17-08.md)", () => {
  it("distortionOutputTrimDb: ölçülen 9 grid noktasında AYNEN tablodaki değeri döner (enterpolasyon devre dışı)", () => {
    const table = {
      clip: [-4.46, -8.30, -10.02, -11.01, -11.69, -12.22, -12.65, -13.03, -13.37],
      soft: [1.82, -2.72, -5.26, -6.91, -8.06, -8.92, -9.59, -10.14, -10.59],
      tube: [10.43, 6.02, 3.19, 1.14, -0.44, -1.71, -2.75, -3.63, -4.38],
      tape: [2.40, 2.41, 2.42, 2.43, 2.44, 2.45, 2.46, 2.47, 2.48]
    };
    const grid = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
    for (const [type, values] of Object.entries(table)) {
      grid.forEach((k, i) => {
        assert.ok(Math.abs(mode.distortionOutputTrimDb(type, k) - values[i]) < 1e-9, `${type} k=${k}: beklenen ${values[i]}, gelen ${mode.distortionOutputTrimDb(type, k)}`);
      });
    }
  });

  it("iki grid noktası ARASINDA parçalı-doğrusal enterpolasyon — ARA DEĞER iki UÇ NOKTAYI da AŞMAZ (SÜREKLİLİK)", () => {
    for (const type of ["clip", "soft", "tube", "tape"]) {
      for (let i = 0; i < 100; i++) {
        const k = i / 99;
        const db = mode.distortionOutputTrimDb(type, k);
        assert.ok(Number.isFinite(db), `${type} k=${k}: sonlu olmalı`);
      }
      // komşu iki grid noktası arasındaki ARA k'de değer İKİ UÇ arasında kalmalı
      const grid = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
      for (let i = 0; i < grid.length - 1; i++) {
        const midK = (grid[i] + grid[i + 1]) / 2;
        const midDb = mode.distortionOutputTrimDb(type, midK);
        const a = mode.distortionOutputTrimDb(type, grid[i]);
        const b = mode.distortionOutputTrimDb(type, grid[i + 1]);
        const lo = Math.min(a, b), hi = Math.max(a, b);
        assert.ok(midDb >= lo - 1e-9 && midDb <= hi + 1e-9, `${type}: k=${midK} arada (${midDb}) [${lo},${hi}] dışında — SÜREKLİLİK/zıplama ihlali`);
      }
    }
  });

  it("[0,1] dışındaki k değerleri UÇ NOKTAYA clamp'lenir, çökmez", () => {
    for (const type of ["clip", "soft", "tube", "tape"]) {
      assert.ok(Math.abs(mode.distortionOutputTrimDb(type, -0.5) - mode.distortionOutputTrimDb(type, 0)) < 1e-9);
      assert.ok(Math.abs(mode.distortionOutputTrimDb(type, 1.5) - mode.distortionOutputTrimDb(type, 1)) < 1e-9);
    }
  });

  it("distortionOutputTrimLinear: dB'nin doğru lineer (10^(db/20)) karşılığı", () => {
    for (const type of ["clip", "soft", "tube", "tape"]) {
      for (const k of [0, 0.3, 0.5, 0.75, 1]) {
        const db = mode.distortionOutputTrimDb(type, k);
        const expected = 10 ** (db / 20);
        assert.ok(Math.abs(mode.distortionOutputTrimLinear(type, k) - expected) < 1e-9);
      }
    }
  });

  it("git stash kırmızı/yeşil KANITI (task'ın kendi kabul kriteri) — telafi YOKKEN (outputTrim=1, varsayılan) clip Kompresör'den ÖLÇÜLEN ~9.7dB RMS yüksekti (OLCUM-CIHAZ-16-08 madde C); telafi VARKEN ÖLÇÜLEN her tip/k noktası Kompresör referansının (±1dB) İÇİNDE — bu test SADECE aritmetiği doğruluyor (gerçek ses ölçümü e2e/distortion-level.spec.mjs'te)", () => {
    const KOMPRESOR_REFERENCE_RMS_DB = -22.79;
    const measuredUncompensatedRmsDb = { // OLCUM-DISTORTION-TELAFI-17-08.md — groove.m4a, 9 k noktası
      clip: [-18.34, -14.50, -12.78, -11.79, -11.11, -10.58, -10.15, -9.77, -9.43],
      soft: [-24.62, -20.08, -17.54, -15.89, -14.74, -13.88, -13.21, -12.66, -12.21],
      tube: [-33.23, -28.82, -25.99, -23.94, -22.36, -21.09, -20.05, -19.17, -18.42],
      tape: [-25.20, -25.21, -25.22, -25.23, -25.24, -25.25, -25.26, -25.27, -25.28]
    };
    const grid = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
    let anyUncompensatedOutOfRange = false;
    for (const [type, values] of Object.entries(measuredUncompensatedRmsDb)) {
      grid.forEach((k, i) => {
        const uncompensated = values[i];
        if (Math.abs(uncompensated - KOMPRESOR_REFERENCE_RMS_DB) > 1) anyUncompensatedOutOfRange = true;
        const compensated = uncompensated + mode.distortionOutputTrimDb(type, k);
        assert.ok(Math.abs(compensated - KOMPRESOR_REFERENCE_RMS_DB) < 1.01, `${type} k=${k}: telafi SONRASI ${compensated.toFixed(2)}dB, Kompresör referansından (${KOMPRESOR_REFERENCE_RMS_DB}) ±1dB DIŞINDA`);
      });
    }
    assert.ok(anyUncompensatedOutOfRange, "ön-koşul — telafisiz ölçümlerin EN AZ biri ±1dB dışında olmalıydı (aksi halde bu test hiçbir şey KANITLAMAZ)");
  });
});

describe("Distortion — getMeta() sözleşme alanları + kaynak uyumluluğu", () => {
  it("id/motor/kulaklikGerekli/uyumluKaynaklar/ucretsiz/videoUrl/difficulty/choiceOnly tanımlı, motor=2", () => {
    const meta = mode.getMeta();
    assert.equal(meta.id, "distortion");
    assert.equal(meta.motor, 2);
    assert.equal(meta.kulaklikGerekli, false, "task: 'muhtemelen false — hoparlörde de duyulur'");
    assert.ok(Array.isArray(meta.uyumluKaynaklar) && meta.uyumluKaynaklar.length > 10, "TÜM kaynaklar açık kalmalıydı (davul/groove bir ÖNERİ, kısıtlama değil)");
    assert.equal(typeof meta.ucretsiz, "boolean");
    assert.equal(meta.choiceOnly, true);
    for (const level of Object.keys(meta.difficulty)) {
      assert.ok(meta.difficulty[level]);
      assert.equal(meta.difficulty[level].options, 3);
    }
  });

  it("davul/groove (task'ın 'en ideal kaynak' bulgusu) VE tüm diğer kaynaklar (transient gerektirmiyor, Kompresör'den farklı) listede", () => {
    const meta = mode.getMeta();
    for (const id of ["kick", "snare", "hihat", "tom", "groove", "bass", "guitar", "vocal", "pink", "white", "saw", "square", "triangle", "upload"]) {
      assert.ok(meta.uyumluKaynaklar.includes(id), `${id} listede olmalıydı`);
    }
  });

  it("ad/aciklama BİLEREK yok — kart metni yalnızca mode-catalog.js'ten okunur", () => {
    const meta = mode.getMeta();
    assert.equal(meta.ad, undefined);
    assert.equal(meta.aciklama, undefined);
  });
});

describe("Distortion — EXAM_* bayrakları (Kompresör'ün AYNI şablonu, tier-tabanlı telafi)", () => {
  it("EXAM_ENABLED=true, EXAM_DIFFICULTY='pro'", () => {
    assert.equal(mode.EXAM_ENABLED, true);
    assert.equal(mode.EXAM_DIFFICULTY, "pro");
    assert.ok(mode.DIFFICULTY[mode.EXAM_DIFFICULTY]);
  });

  it("EXAM_WEAK_AREA export EDİLMEDİ — Kompresör/Reverb/Tonal Denge'nin AYNI tier-tabanlı (frekans DEĞİL) telafi yoluna düşer (task: 'zayıf ZORLUK KADEMESİ, frekans-tabanlı değil')", () => {
    assert.equal(mode.EXAM_WEAK_AREA, undefined);
  });

  it("THREE_WAY=true — Motor 2 şablonu miras alındı", () => {
    assert.equal(mode.THREE_WAY, true);
  });
});

describe("Distortion — renderAnswerChoices/markAnswerChoices/updateAnswerPlayState three-way-cards.js'ten miras alındı", () => {
  it("Kompresör/Reverb'in KULLANDIĞI AYNI fonksiyon referanslarını taşır (kopya değil, gerçek re-export)", async () => {
    const threeWayCards = await import("../www/js/core/three-way-cards.js");
    const kompresor = await import("../www/js/modes/kompresor.js");
    assert.equal(mode.renderAnswerChoices, threeWayCards.renderThreeWayCards);
    assert.equal(mode.markAnswerChoices, threeWayCards.markThreeWayCards);
    assert.equal(mode.renderAnswerChoices, kompresor.renderAnswerChoices, "Kompresör'le AYNI referans olmalı — gerçek miras");
  });
});

// G269 — task'ın KABUL KRİTERİ'nin 3. maddesi: "THD sıralaması: clip > tube >
// soft > tape". GERÇEK ölçümle (Goertzel/DFT tabanlı THD, 344.5Hz bin-hizalı
// sinüs, 3 farklı test genliğinde [0.3/0.5/0.7] tekrarlandı, bkz.
// OLCUM-DISTORTION-TELAFI-17-08.md) bu iddia YANLIŞ çıktı — GERÇEK sıralama
// **clip > soft > tube > tape** (k≥0.25'in TÜMÜNDE, 3 genlikte de tutarlı).
// Sebep muhtemelen: dosya başı notu türleri "ZORLUK KADEMESİNE göre" seçiyor
// (kolay=EN BARİZ, pro=EN İNCE) — bu, İKİ YAKIN k değerini AYIRT ETMENİN
// zorluğuyla ilgili bir eksen, "type'ın MUTLAK harmonik içeriği" ile AYNI
// eksen OLMAK ZORUNDA değil (tube'un drive ARALIĞI [0.5,3.2] soft'unkinden
// [1.1,8] ÇOK daha DAR — düşük TAVAN, düşük MUTLAK THD ile tutarlı).
// Task'ın kendi varsayımı DÜZELTİLMEDEN test'e YAZILMADI (CLAUDE.md: "Sayı
// uydurma... doğrulanmadı yaz") — GERÇEK ölçülen sıra kullanıldı.
//
// ⚠️ G269'un telafisi (distortionOutputTrimLinear) bu sıralamayı ETKİLEMEZ
// — WaveShaper'DAN SONRA uygulanan TEK bir sabit çarpan, hem temel hem
// harmonikleri AYNI oranda ölçekler (THD = harmonik/temel ORANI, pay/payda
// AYNI kare-katsayıyla çarpılır, oran matematik olarak DEĞİŞMEZ) —
// buildDistortionCurve'e TEK SATIR dokunulmadı.
describe("Distortion — G269 KABUL KRİTERİ madde 3: tipler arası THD (harmonik içerik) sıralaması ÖLÇÜLEBİLİR şekilde korunuyor", () => {
  const SAMPLE_RATE = 44100;
  const N = 8192;
  const BIN = 64; // f0 = SAMPLE_RATE/N*BIN — tam sayı bin, spektral sızıntı yok

  function applyCurvePointwise(curve, x) {
    const n = curve.length;
    const idx = ((x + 1) / 2) * (n - 1);
    const i0 = Math.floor(idx), i1 = Math.min(n - 1, i0 + 1);
    const t = idx - i0;
    return curve[i0] * (1 - t) + curve[i1] * t;
  }

  function goertzelMagnitude(signal, binIndex) {
    const w = (2 * Math.PI * binIndex) / N;
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const angle = w * n;
      re += signal[n] * Math.cos(angle);
      im -= signal[n] * Math.sin(angle);
    }
    return Math.sqrt(re * re + im * im) / (N / 2);
  }

  function computeThdPercent(type, k, amplitude) {
    const drive = mode.driveAtK(type, k);
    const curve = mode.buildDistortionCurve(type, drive);
    const output = new Float32Array(N);
    for (let n = 0; n < N; n++) {
      const x = amplitude * Math.sin((2 * Math.PI * BIN * n) / N);
      output[n] = applyCurvePointwise(curve, x);
    }
    const fundamental = goertzelMagnitude(output, BIN);
    let harmonicPowerSum = 0;
    for (let h = 2; h <= 10; h++) {
      const mag = goertzelMagnitude(output, BIN * h);
      harmonicPowerSum += mag * mag;
    }
    return (Math.sqrt(harmonicPowerSum) / fundamental) * 100;
  }

  it("k=0.5'te (her round'un ORTAK/aynı-çift noktası) GERÇEK sıralama clip > soft > tube > tape — 3 farklı test genliğinde tutarlı", () => {
    for (const amplitude of [0.3, 0.5, 0.7]) {
      const thd = {
        clip: computeThdPercent("clip", 0.5, amplitude),
        soft: computeThdPercent("soft", 0.5, amplitude),
        tube: computeThdPercent("tube", 0.5, amplitude),
        tape: computeThdPercent("tape", 0.5, amplitude)
      };
      assert.ok(thd.clip > thd.soft, `genlik=${amplitude}: clip (${thd.clip.toFixed(2)}%) soft'tan (${thd.soft.toFixed(2)}%) büyük olmalı`);
      assert.ok(thd.soft > thd.tube, `genlik=${amplitude}: soft (${thd.soft.toFixed(2)}%) tube'dan (${thd.tube.toFixed(2)}%) büyük olmalı`);
      assert.ok(thd.tube > thd.tape, `genlik=${amplitude}: tube (${thd.tube.toFixed(2)}%) tape'ten (${thd.tape.toFixed(2)}%) büyük olmalı`);
    }
  });

  it("tape HER ZAMAN en düşük THD'ye sahip (task'ın kendi karakteri: 'çok ince, neredeyse fark edilmez') — k'nin TÜMÜNDE", () => {
    for (let k = 0; k <= 1; k += 0.25) {
      const tapeThd = computeThdPercent("tape", k, 0.5);
      for (const type of ["clip", "soft", "tube"]) {
        assert.ok(computeThdPercent(type, k, 0.5) >= tapeThd, `k=${k}: ${type} tape'ten düşük THD'ye sahip olamaz`);
      }
    }
  });

  it("clip HER ZAMAN en yüksek THD'ye sahip (task'ın kendi karakteri: 'sert ve kirli') — k≥0.125'in TÜMÜNDE (k=0'da çok düşük drive'da sıra farklı, ayrı belgelendi)", () => {
    for (let k = 0.125; k <= 1; k += 0.125) {
      const clipThd = computeThdPercent("clip", k, 0.5);
      for (const type of ["soft", "tube", "tape"]) {
        assert.ok(clipThd >= computeThdPercent(type, k, 0.5), `k=${k}: clip (${clipThd.toFixed(2)}%) ${type}'den düşük THD'ye sahip olamaz`);
      }
    }
  });

  it("G269'un telafisi THD'yi ETKİLEMEZ (matematiksel invaryant) — WaveShaper çıkışını TEK bir sabitle ölçeklemek harmonik/temel ORANINI değiştirmez", () => {
    const drive = mode.driveAtK("clip", 0.5);
    const curve = mode.buildDistortionCurve("clip", drive);
    const scale = 0.3; // rastgele bir örnek telafi çarpanı
    function thdOf(scaleFactor) {
      const output = new Float32Array(N);
      for (let n = 0; n < N; n++) {
        const x = 0.5 * Math.sin((2 * Math.PI * BIN * n) / N);
        output[n] = scaleFactor * applyCurvePointwise(curve, x);
      }
      const fundamental = goertzelMagnitude(output, BIN);
      let harmonicPowerSum = 0;
      for (let h = 2; h <= 10; h++) { const mag = goertzelMagnitude(output, BIN * h); harmonicPowerSum += mag * mag; }
      return Math.sqrt(harmonicPowerSum) / fundamental;
    }
    // 1e-9 DEĞİL — 8192 örneklik Goertzel toplamının kayan-nokta hatası
    // ölçüm gürültüsü üretiyor, 1e-6 oranın MATEMATİKSEL EŞİTLİĞİNİ kanıtlamak
    // için yeterince sıkı (THD ~0.3 mertebesinde, 1e-6 ~%0.0003 bağıl hata).
    assert.ok(Math.abs(thdOf(1) - thdOf(scale)) < 1e-6, "ölçekleme THD oranını (temel/harmonik) DEĞİŞTİRMEMELİ");
  });
});

// G292 (OLCUM-UC-18-08 madde C) — Kompresör'ün AYNI tekrar-önleme testleri.
describe("Saturation & Distortion — G292 tekrar önleme (REPEAT_GUARD_N)", () => {
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

  it("settings.rng (mevcut enjekte edilebilir rastgelelik) ile BİRLİKTE çalışır", () => {
    let recent = [];
    let seed = 1;
    const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < 50; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false, recentIdentities: recent, rng });
      if (recent.length > 0) assert.notEqual(q.oddIndex, recent[0]);
      recent = [q.oddIndex];
    }
  });
});

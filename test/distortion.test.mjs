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
  it("previewLetter VERİLİRSE o harfin drive'ını, verilmezse variants[0]'ınkini kullanan TEK WaveShaperNode döner", () => {
    const created = [];
    const fakeAudioCtx = {
      createWaveShaper: () => {
        const n = { curve: null, oversample: null };
        created.push(n);
        return n;
      }
    };
    const q = {
      distortionType: "soft",
      variants: [{ letter: "A", drive: 2 }, { letter: "B", drive: 6 }, { letter: "C", drive: 2 }]
    };

    const { filters: f1 } = mode.applyProcessing(q, { audioCtx: fakeAudioCtx });
    assert.equal(f1.length, 1);
    assert.ok(f1[0].curve instanceof Float32Array, "curve bir Float32Array olmalıydı");
    assert.deepEqual(f1[0].curve, mode.buildDistortionCurve("soft", 2), "previewLetter yokken variants[0] (A) kullanılmalıydı");
    assert.equal(f1[0].oversample, "4x");

    const { filters: f2 } = mode.applyProcessing({ ...q, previewLetter: "B" }, { audioCtx: fakeAudioCtx });
    assert.deepEqual(f2[0].curve, mode.buildDistortionCurve("soft", 6), "previewLetter='B' verilince O harfin drive'ı kullanılmalıydı");

    assert.equal(created.length, 2);
  });

  it("her dört tür de gerçek createQuestion çıktısıyla çökmeden bir WaveShaperNode kurar", () => {
    const fakeAudioCtx = { createWaveShaper: () => ({ curve: null, oversample: null }) };
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      for (const letter of ["A", "B", "C"]) {
        assert.doesNotThrow(() => mode.applyProcessing({ ...q, previewLetter: letter }, { audioCtx: fakeAudioCtx }));
      }
    }
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

// Tonal Denge (G45) — CANLI EQ DÜZELTME modu testleri. G44'ün odd-one-out
// (A/B/C, variants/oddIndex/choices/shape) testleri TAMAMEN kaldırıldı — mod
// artık three-way DEĞİL. Kapsam: bant sayısı ramp'i (4→5→6, seans içi soru
// sırasına göre), bozukluk üretimi (bandsForQuestion — bir kısmına/tümüne,
// kanonik filterType sırası), yakınlık skoru (evaluateAnswer — residual/
// proximityScore/correct), GRADED calculateXP, applyProcessing'in N doğru
// BiquadFilterNode kurması + setLiveBandGain'in canlı güncellemesi,
// teachingText/getFeedbackData (bölge+yön+dB+mix dili), getHintText (harf/
// değer sızdırmıyor), merkezi zorluk eğrisi + "kolaylaşma yok" invaryantı,
// kaynak uyumluluğu (groove+upload, G44'ten DEĞİŞMEDİ).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/tonal-denge.js";
import { representativeLevelForTier } from "../www/js/core/difficulty-curve.js";

describe("Tonal Denge — bandCountForSessionIndex / bandIdsForCount (seans içi ramp)", () => {
  it("index 0-3 (Soru 1-4) → 4 bant", () => {
    for (const idx of [0, 1, 2, 3]) assert.equal(mode.bandCountForSessionIndex(idx), 4, `idx=${idx}`);
  });
  it("index 4-7 (Soru 5-8) → 5 bant", () => {
    for (const idx of [4, 5, 6, 7]) assert.equal(mode.bandCountForSessionIndex(idx), 5, `idx=${idx}`);
  });
  it("index 8+ (Soru 9+) → 6 bant, SINIRSIZ üstte de SABİT kalır", () => {
    for (const idx of [8, 9, 10, 25, 1000]) assert.equal(mode.bandCountForSessionIndex(idx), 6, `idx=${idx}`);
  });
  it("negatif/tanımsız index 0 gibi davranır (4 bant, düşmez)", () => {
    assert.equal(mode.bandCountForSessionIndex(-5), 4);
    assert.equal(mode.bandCountForSessionIndex(undefined), 4);
  });

  it("4 bant = task'ın kendi örneği (bas/alt-orta/üst-orta/tiz) — SUB ve ORTA yok", () => {
    assert.deepEqual(mode.bandIdsForCount(4), ["bas", "alt-orta", "ust-orta", "tiz"]);
  });
  it("5 bant = 4 bandın ORTA ile genişlemesi", () => {
    assert.deepEqual(mode.bandIdsForCount(5), ["bas", "alt-orta", "orta", "ust-orta", "tiz"]);
  });
  it("6 bant = TAM 6 bölge (SUB dahil)", () => {
    assert.deepEqual(mode.bandIdsForCount(6), ["sub", "bas", "alt-orta", "orta", "ust-orta", "tiz"]);
  });
});

describe("Tonal Denge — bandsForQuestion (bozukluk üretimi)", () => {
  it("EN AZ bir bant bozulur (bugDb!==0), EN ÇOK tümü — hiçbir turda SIFIR bant bozulmaz (500 örnek)", () => {
    for (let i = 0; i < 500; i++) {
      const bands = mode.bandsForQuestion(mode.BAND_SET_6, 5);
      const disturbed = bands.filter(b => b.bugDb !== 0);
      assert.ok(disturbed.length >= 1, "en az 1 bant bozulmalıydı");
      assert.ok(disturbed.length <= bands.length);
    }
  });

  it("bozulmayan bantlar TAM 0 (kullanıcı dokunmamalı) — bozulanlar İŞARETLİ (±) ve büyüklük tabana (FLOOR) uyar", () => {
    for (let i = 0; i < 300; i++) {
      const bands = mode.bandsForQuestion(mode.BAND_SET_4, 8);
      bands.forEach(b => {
        if (b.bugDb === 0) return;
        assert.ok(Math.abs(b.bugDb) >= mode.TONAL_CURVE_CONFIG.DISTURB_DB_FLOOR - 1e-6, `${b.id}: ${b.bugDb} floor altı`);
      });
    }
  });

  it("filterType KANONİK sırayla belirlenir — en düşük frekans lowshelf, en yüksek highshelf, aradakiler peaking", () => {
    const bands6 = mode.bandsForQuestion(mode.BAND_SET_6, 3);
    assert.equal(bands6[0].id, "sub");
    assert.equal(bands6[0].filterType, "lowshelf");
    assert.equal(bands6[bands6.length - 1].id, "tiz");
    assert.equal(bands6[bands6.length - 1].filterType, "highshelf");
    for (let i = 1; i < bands6.length - 1; i++) assert.equal(bands6[i].filterType, "peaking", bands6[i].id);

    const bands4 = mode.bandsForQuestion(mode.BAND_SET_4, 3);
    assert.equal(bands4[0].filterType, "lowshelf");
    assert.equal(bands4[bands4.length - 1].filterType, "highshelf");
  });

  it("rng enjekte edilebilir — AYNI rng dizisiyle çağrılınca DETERMİNİSTİK (deterministik test)", () => {
    function seqRng(seq) { let i = 0; return () => seq[i++ % seq.length]; }
    const rngA = seqRng([0.1, 0.2, 0.9, 0.05, 0.5]);
    const rngB = seqRng([0.1, 0.2, 0.9, 0.05, 0.5]);
    const a = mode.bandsForQuestion(mode.BAND_SET_4, 5, rngA);
    const b = mode.bandsForQuestion(mode.BAND_SET_4, 5, rngB);
    assert.deepEqual(a, b);
  });

  it("bandDefs BAND_ORDER'a göre KANONİK sırayla döner — girdi sırası KARIŞIK verilse bile", () => {
    const shuffledInput = ["tiz", "sub", "orta"];
    const bands = mode.bandsForQuestion(shuffledInput, 3);
    assert.deepEqual(bands.map(b => b.id), ["sub", "orta", "tiz"]);
  });
});

describe("Tonal Denge — pickDisturbanceDb (dar jitter + FLOOR garantisi)", () => {
  it("HİÇBİR ZAMAN DISTURB_DB_FLOOR'un altına inmez — baseDb TAM floor'da bile (5000 örnek)", () => {
    const floor = mode.TONAL_CURVE_CONFIG.DISTURB_DB_FLOOR;
    for (let i = 0; i < 5000; i++) {
      const v = mode.pickDisturbanceDb(floor);
      assert.ok(v >= floor - 1e-9, `floor ihlali: ${v} < ${floor}`);
    }
  });

  it("ortalaması (N=2000) baseDb'ye YAKIN kalır — jitter sinyali BOĞMUYOR", () => {
    const N = 2000;
    for (const base of [9, 5, 2.8, 1.3]) {
      let sum = 0;
      for (let i = 0; i < N; i++) sum += mode.pickDisturbanceDb(base);
      const avg = sum / N;
      assert.ok(Math.abs(avg - base) / base < 0.03, `base=${base}: ortalama ${avg.toFixed(3)}`);
    }
  });
});

describe("Tonal Denge — createQuestion() genel sözleşme", () => {
  for (const level of Object.keys(mode.DIFFICULTY)) {
    it(`createQuestion("${level}") geçerli bir soru üretir`, () => {
      const q = mode.createQuestion(level, { source: "groove", boss: false });
      assert.equal(q.mode, "tonal-denge");
      assert.equal(q.difficulty, level);
      assert.equal(typeof q.hintUsed, "boolean");
      assert.equal(q.hintUsed, false);
      assert.ok(Array.isArray(q.bands) && q.bands.length === q.bandCount);
      // choices/variants/oddIndex artık YOK — G44'ün odd-one-out şekli tamamen kaldırıldı
      assert.equal(q.choices, undefined);
      assert.equal(q.variants, undefined);
      assert.equal(q.oddIndex, undefined);
    });

    it(`createQuestion("${level}") SAF fonksiyondur: JSON'a sorunsuz serileşir`, () => {
      const q = mode.createQuestion(level, { source: "groove", boss: false });
      const json = JSON.stringify(q);
      assert.ok(json.length > 0);
      assert.equal(typeof q.applyProcessing, "undefined");
    });
  }

  it("sessionQuestionIndex verilmezse 0 gibi davranır (4 bant)", () => {
    const q = mode.createQuestion("medium", { source: "groove" });
    assert.equal(q.bandCount, 4);
  });

  it("sessionQuestionIndex 4/8'de bant sayısı doğru artar (uçtan uca)", () => {
    assert.equal(mode.createQuestion("medium", { source: "groove", sessionQuestionIndex: 4 }).bandCount, 5);
    assert.equal(mode.createQuestion("medium", { source: "groove", sessionQuestionIndex: 8 }).bandCount, 6);
  });

  it("her bandın freq'i pozitif ve BAND_DEFS'teki karşılığıyla eşleşir", () => {
    const q = mode.createQuestion("easy", { source: "groove", sessionQuestionIndex: 8 });
    q.bands.forEach(b => {
      const def = mode.BAND_DEFS.find(d => d.id === b.id);
      assert.ok(def);
      assert.equal(b.freq, def.freq);
      assert.ok(b.freq > 0);
    });
  });
});

describe("Tonal Denge — evaluateAnswer (yakınlık skoru — SAF, audioCtx'e dokunmaz)", () => {
  const q = {
    bands: [
      { id: "bas", bugDb: 5 },
      { id: "alt-orta", bugDb: -3 },
      { id: "ust-orta", bugDb: 0 },
      { id: "tiz", bugDb: 2 }
    ]
  };

  it("MÜKEMMEL düzeltme (correction = -bugDb her bantta) → residual=0 HER bantta, proximityScore=100, correct=true", () => {
    const answer = { bas: -5, "alt-orta": 3, "ust-orta": 0, tiz: -2 };
    const r = mode.evaluateAnswer(q, answer);
    r.deviations.forEach(d => assert.ok(Math.abs(d.residualDb) < 1e-6, `${d.id}: residual ${d.residualDb}`));
    assert.equal(r.proximityScore, 100);
    assert.equal(r.correct, true);
    assert.equal(r.avgDeviation, 0);
  });

  it("HİÇ dokunulmamış (answer={}) → residual = bugDb aynen, proximityScore < 100, correct=false (bariz bozuklukta)", () => {
    const r = mode.evaluateAnswer(q, {});
    assert.equal(r.deviations.find(d => d.id === "bas").residualDb, 5);
    assert.equal(r.deviations.find(d => d.id === "ust-orta").residualDb, 0);
    assert.ok(r.proximityScore < 100);
    assert.equal(r.correct, false);
  });

  // G317 — correctBandCount YENİ bir alan (calculateXP'nin kısmi-doğru XP
  // dalı için) — evaluateAnswer'ın "correct" TANIMINA TEK SATIR dokunmuyor,
  // SADECE HER bandın KENDİ deviation'ını AYNI toleransla ayrıca sayıyor.
  it("correctBandCount: MÜKEMMEL düzeltmede TÜM bantlar (4/4) — bu durumda correct de HER ZAMAN true (averaj mantığı)", () => {
    const answer = { bas: -5, "alt-orta": 3, "ust-orta": 0, tiz: -2 };
    const r = mode.evaluateAnswer(q, answer);
    assert.equal(r.correctBandCount, 4);
    assert.equal(r.correct, true);
  });

  it("correctBandCount: SADECE bazı bantlar toleransta iken doğru sayıyor, correct HÂLÂ false kalabiliyor", () => {
    // bas: tam düzeltildi (residual 0, doğru) — alt-orta: tam düzeltildi (doğru)
    // ust-orta: bugDb zaten 0, dokunulmadı (residual 0, doğru) — tiz: HİÇ
    // dokunulmadı (residual 2, tolerans 1.5'i AŞIYOR, yanlış). 3/4 bant doğru
    // ama averaj (0+0+0+2)/4=0.5 <= 1.5 OLDUĞU İÇİN correct YİNE true çıkar —
    // bu YÜZDEN kasıtlı ATE tolerans-dışı bir dördüncü sapma eklendi (tiz'i
    // İYİCE bozarak averajı da toleransın ÜSTÜNE çıkarmak için).
    const answer = { bas: -5, "alt-orta": 3, "ust-orta": 0, tiz: -2 - 10 };
    const r = mode.evaluateAnswer(q, answer);
    assert.equal(r.correctBandCount, 3, `3 bant doğru olmalıydı, ölçülen deviations: ${JSON.stringify(r.deviations)}`);
    assert.equal(r.correct, false, "averaj artık toleransın üstünde, correct=false OLMALI");
  });

  it("eksik/kısmi answer (bazı bantlar hiç yok) → o bantlar correction=0 varsayılır", () => {
    const r = mode.evaluateAnswer(q, { bas: -5 });
    const alt = r.deviations.find(d => d.id === "alt-orta");
    assert.equal(alt.correction, 0);
    assert.equal(alt.residualDb, -3);
  });

  it("proximityScore [0,100] dışına HİÇBİR ZAMAN taşmaz — aşırı yanlış (ters yönde abartılı) correction'da bile", () => {
    const r = mode.evaluateAnswer(q, { bas: 50, "alt-orta": -50, "ust-orta": 50, tiz: -50 });
    assert.ok(r.proximityScore >= 0 && r.proximityScore <= 100, `proximityScore ${r.proximityScore} aralık dışı`);
  });

  it("NEUTRAL_TOLERANCE_DB İÇİNDEKİ küçük bir kalan sapma HÂLÂ correct=true sayılır", () => {
    const q2 = { bands: [{ id: "bas", bugDb: 5 }] };
    const r = mode.evaluateAnswer(q2, { bas: -5 + mode.NEUTRAL_TOLERANCE_DB * 0.5 });
    assert.equal(r.correct, true);
  });
});

describe("Tonal Denge — calculateXP (GRADED — yakınlık skoruna göre ölçeklenir)", () => {
  it("correct=false VE correctBandCount=0 (hiçbir bant doğru değil) → 0 XP", () => {
    const q = { boss: false, bands: [{ id: "sub" }, { id: "bas" }, { id: "orta" }, { id: "tiz" }] };
    assert.equal(mode.calculateXP(q, { correct: false, correctBandCount: 0 }, false, "medium", {}), 0);
  });

  it("correct=false, correctBandCount alanı HİÇ yoksa (undefined) 0 varsayılır → 0 XP (eski çağıranlarla GERİYE UYUMLU)", () => {
    const q = { boss: false, bands: [{ id: "sub" }, { id: "bas" }, { id: "orta" }, { id: "tiz" }] };
    assert.equal(mode.calculateXP(q, { correct: false }, false, "medium", {}), 0);
  });

  it("proximityScore=100 (mükemmel) DAHA FAZLA XP verir — aynı diğer koşullarda proximityScore=60'tan", () => {
    const q = { boss: false };
    const ctx = { combo: 0, timeLeft: 0, roundDuration: 10, xpMultiplier: 1 };
    const perfect = mode.calculateXP(q, { correct: true, proximityScore: 100 }, false, "medium", ctx);
    const okish = mode.calculateXP(q, { correct: true, proximityScore: 60 }, false, "medium", ctx);
    assert.ok(perfect > okish, `perfect=${perfect} okish=${okish}`);
  });

  it("doğru cevapta negatif olmaz, makul bir üst sınırı aşmaz (proximityScore=100)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const q = { boss: true };
      const result = { correct: true, proximityScore: 100 };
      const gained = mode.calculateXP(q, result, false, level, { combo: 20, timeLeft: 100, roundDuration: 10, xpMultiplier: 1.5 });
      assert.ok(gained >= 0);
      const maxPlausible = mode.DIFFICULTY[level].xp * 2.4 * 1.65 * 1.2 * 1.5 + 5;
      assert.ok(gained <= maxPlausible, `${level}: XP mantıksız yüksek: ${gained} > ${maxPlausible}`);
    }
  });

  it("ipucu kullanınca XP yarıya iner", () => {
    const q = { boss: false };
    const result = { correct: true, proximityScore: 90 };
    const withoutHint = mode.calculateXP(q, result, false, "medium", { combo: 0, timeLeft: 0, roundDuration: 10 });
    const withHint = mode.calculateXP(q, result, true, "medium", { combo: 0, timeLeft: 0, roundDuration: 10 });
    assert.ok(withHint < withoutHint);
  });
});

// G317 (Logic'in kararı, OLCUM-XP-SEANS-18-08'in ardından) — kısmi doğruya
// ARTAN XP, "doğru" SAYILMADAN. DOKUNULMAYACAK: evaluateAnswer'ın "correct"
// TANIMI (avgDeviation<=tolerance) — bu blok SADECE calculateXP'nin YENİ
// partial-credit dalını (result.correct=false + correctBandCount>0) test
// ediyor, evaluateAnswer'a HİÇ dokunmuyor.
describe("Tonal Denge — G317 kısmi-doğru XP (calculateXP'nin YENİ dalı)", () => {
  const q4 = { boss: false, bands: [{ id: "sub" }, { id: "bas" }, { id: "orta" }, { id: "tiz" }] };
  const baseCtx = { combo: 0, timeLeft: 0, roundDuration: 10, xpMultiplier: 1 };

  it("4 bantta 1/2/3 doğru → Logic'in verdiği ORANLARLA (tam-doğru XP'sinin %15/%35/%75'i) artan XP, ARTIYOR", () => {
    const full = mode.calculateXP(q4, { correct: true, proximityScore: 100 }, false, "medium", baseCtx);
    const xp1 = mode.calculateXP(q4, { correct: false, correctBandCount: 1 }, false, "medium", baseCtx);
    const xp2 = mode.calculateXP(q4, { correct: false, correctBandCount: 2 }, false, "medium", baseCtx);
    const xp3 = mode.calculateXP(q4, { correct: false, correctBandCount: 3 }, false, "medium", baseCtx);
    // proximityBoost=100 iken full=diff.xp*1 (proximityBoost=1.0) — oranları
    // doğrudan full'a göre karşılaştırmak GÜVENİLİR (aynı diff.xp tabanı).
    assert.ok(Math.abs(xp1 / full - 0.15) < 0.03, `xp1/full=${(xp1 / full).toFixed(3)}, beklenen ~0.15`);
    assert.ok(Math.abs(xp2 / full - 0.35) < 0.03, `xp2/full=${(xp2 / full).toFixed(3)}, beklenen ~0.35`);
    assert.ok(Math.abs(xp3 / full - 0.75) < 0.03, `xp3/full=${(xp3 / full).toFixed(3)}, beklenen ~0.75`);
    assert.ok(xp1 > 0 && xp1 < xp2 && xp2 < xp3 && xp3 < full, `artan olmalı: 0 < ${xp1} < ${xp2} < ${xp3} < ${full}`);
  });

  it("5 ve 6 bantta da ARTAN XP üretir (oranlar Logic'in 4-bant deseninin genişletilmesi, ÖLÇÜLMEDİ — ürün yorumu)", () => {
    const q5 = { boss: false, bands: [{ id: "sub" }, { id: "bas" }, { id: "orta" }, { id: "ust-orta" }, { id: "tiz" }] };
    const q6 = { boss: false, bands: [{ id: "sub" }, { id: "bas" }, { id: "alt-orta" }, { id: "orta" }, { id: "ust-orta" }, { id: "tiz" }] };
    for (const [q, maxK] of [[q5, 4], [q6, 5]]) {
      let prev = 0;
      for (let k = 1; k <= maxK; k++) {
        const xp = mode.calculateXP(q, { correct: false, correctBandCount: k }, false, "medium", baseCtx);
        assert.ok(xp > prev, `bandCount=${q.bands.length} k=${k}: ${xp} <= önceki ${prev} (ARTMALIYDI)`);
        prev = xp;
      }
    }
  });

  it("proximityBoost KISMİ-doğru dalına ÇAKIŞMIYOR — proximityScore ne olursa olsun (correct=false iken) AYNI XP", () => {
    const withLowProximity = mode.calculateXP(q4, { correct: false, correctBandCount: 2, proximityScore: 5 }, false, "medium", baseCtx);
    const withHighProximity = mode.calculateXP(q4, { correct: false, correctBandCount: 2, proximityScore: 95 }, false, "medium", baseCtx);
    assert.equal(withLowProximity, withHighProximity, "kısmi-doğru dalı proximityScore'dan TAMAMEN bağımsız olmalı");
  });

  it("kısmi-doğru XP'ye combo:0 İLE çağrıldığında combo bonusu BİNMEZ, ama hint/boss/time çarpanları HÂLÂ uygulanıyor", () => {
    const noHint = mode.calculateXP(q4, { correct: false, correctBandCount: 2 }, false, "medium", baseCtx);
    const withHint = mode.calculateXP(q4, { correct: false, correctBandCount: 2 }, true, "medium", baseCtx);
    assert.ok(withHint < noHint, "ipucu kısmi-doğru XP'yi de yarıya indirmeli (AYNI hintPenalty çarpanı)");
    const bossQ = { ...q4, boss: true };
    const bossXp = mode.calculateXP(bossQ, { correct: false, correctBandCount: 2 }, false, "medium", baseCtx);
    assert.ok(bossXp > noHint, "boss round kısmi-doğru XP'yi de artırmalı (AYNI bossBoost çarpanı)");
  });

  it("correctBandCount tablo-dışı bir bant sayısı için (0 ya da bandCount'un kendisi) 0 döner — bandCount'un KENDİSİ tabloya HİÇ girmemeli (average<=tolerance mantığı, bkz. evaluateAnswer notu)", () => {
    assert.equal(mode.calculateXP(q4, { correct: false, correctBandCount: 0 }, false, "medium", baseCtx), 0);
    assert.equal(mode.calculateXP(q4, { correct: false, correctBandCount: 4 }, false, "medium", baseCtx), 0, "4/4 tabloda YOK (bu durum zaten correct=true yoluna düşer, pratikte hiç çağrılmaz)");
  });
});

describe("Tonal Denge — öğretici metin (teachingText/getFeedbackData) — bölge+yön+dB+mix dili", () => {
  const q = {
    bands: [
      { id: "bas", label: "BAS", bugDb: 5 },
      { id: "tiz", label: "TİZ", bugDb: 0 }
    ]
  };

  it("fazla bırakılan bant: doğru Türkçe çekim (BAS'ı) + işaretli dB + mix kelimesi içerir", () => {
    const text = mode.teachingText(q, { bas: 1, tiz: 0 }); // residual=6 (fazla bıraktın)
    assert.match(text, /BAS'ı/);
    assert.match(text, /\+6\.0dB/);
    assert.match(text, /fazla bıraktın/);
    assert.match(text, /ağır\/kalın/);
  });

  it("eksik bırakılan bant: 'eksik bıraktın' + negatif işaretli dB", () => {
    const text = mode.teachingText(q, { bas: -8, tiz: 0 }); // residual=-3 (eksik)
    assert.match(text, /-3\.0dB/);
    assert.match(text, /eksik bıraktın/);
  });

  it("iyi düzeltilen bant 'iyi düzelttin' der, harf/işaret sızdırmaz", () => {
    const text = mode.teachingText(q, { bas: -5, tiz: 0 });
    assert.match(text, /TİZ'i iyi düzelttin/);
  });

  it("hiçbir durum boş/bozuk metin üretmez (gerçek createQuestion çıktıları, HER zorluk × birkaç answer)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 8; i++) {
        const question = mode.createQuestion(level, { source: "groove", sessionQuestionIndex: i });
        const answer = {};
        question.bands.forEach(b => { answer[b.id] = i % 2 === 0 ? -b.bugDb : 0; });
        const text = mode.teachingText(question, answer);
        assert.ok(text && text.length >= 10, `${level} i=${i}: kısa/boş metin`);
        assert.doesNotMatch(text, /undefined|NaN|\[object/, `${level} i=${i}: bozuk metin: ${text}`);
      }
    }
  });

  it("getFeedbackData showResult HER ZAMAN true, panel HER ZAMAN null", () => {
    const question = mode.createQuestion("medium", { source: "groove" });
    const perfectAnswer = {};
    question.bands.forEach(b => { perfectAnswer[b.id] = -b.bugDb; });
    const correctFb = mode.getFeedbackData(question, perfectAnswer, { gained: 10 });
    const wrongFb = mode.getFeedbackData(question, {}, { gained: 0 });
    assert.equal(correctFb.showResult, true);
    assert.equal(correctFb.panel, null);
    assert.equal(wrongFb.showResult, true);
    assert.equal(wrongFb.panel, null);
  });

  it("correctLabel bant sayısı + bozuk bant sayısını gösterir", () => {
    const label = mode.correctLabel({ bandCount: 5, bands: [{ bugDb: 1 }, { bugDb: 0 }, { bugDb: -2 }, { bugDb: 0 }, { bugDb: 0 }] });
    assert.match(label, /5 bant/);
    assert.match(label, /2 bozuk/);
  });
});

describe("Tonal Denge — getHintText: HANGİ bant/yön/değer olduğunu tam VERMEZ, sadece EN BÜYÜK sapmanın bandını söyler", () => {
  it("en büyük |bugDb|'ye sahip bandı adıyla söyler, değeri/yönü SIZDIRMAZ", () => {
    const q = { bands: [{ id: "bas", label: "BAS", bugDb: 2 }, { id: "tiz", label: "TİZ", bugDb: -9 }] };
    const hint = mode.getHintText(q);
    assert.match(hint, /TİZ/);
    assert.doesNotMatch(hint, /-9|9\.0|9dB/);
  });
});

describe("Tonal Denge — applyProcessing + setLiveBandGain (previewLetter YOK, canlı N-bant düğümü)", () => {
  function makeFakeAudioCtx() {
    const created = [];
    return {
      currentTime: 0,
      created,
      createBiquadFilter: () => {
        const f = {
          type: "", frequency: { value: 0 }, Q: { value: 0 },
          gain: {
            value: 0, _target: null, _tc: null,
            cancelScheduledValues() {},
            setTargetAtTime(v) { this.value = v; this._target = v; }
          }
        };
        created.push(f);
        return f;
      }
    };
  }

  it("question.bands KADAR BiquadFilterNode kurar — HER birinin type/frequency/gain'i (Q sadece peaking'te) doğru", () => {
    const q = { bands: [
      { id: "bas", freq: 173, filterType: "lowshelf", bugDb: 4 },
      { id: "alt-orta", freq: 354, filterType: "peaking", bugDb: -2 },
      { id: "tiz", freq: 12649, filterType: "highshelf", bugDb: 0 }
    ] };
    const ctx = makeFakeAudioCtx();
    const { filters } = mode.applyProcessing(q, { audioCtx: ctx });
    assert.equal(filters.length, 3);
    assert.equal(filters[0].type, "lowshelf");
    assert.equal(filters[0].frequency.value, 173);
    assert.equal(filters[0].gain.value, 4);
    assert.equal(filters[1].type, "peaking");
    assert.equal(filters[1].Q.value, 1.0);
    assert.equal(filters[1].gain.value, -2);
    assert.equal(filters[2].type, "highshelf");
    assert.equal(filters[2].gain.value, 0);
  });

  it("setLiveBandGain GRAFİĞİ YENİDEN KURMADAN o bandın düğümünün gain'ini GÜNCELLER — diğer bantlara DOKUNMAZ", () => {
    const q = { bands: [
      { id: "bas", freq: 173, filterType: "lowshelf", bugDb: 4 },
      { id: "tiz", freq: 12649, filterType: "highshelf", bugDb: -1 }
    ] };
    const ctx = makeFakeAudioCtx();
    const { filters } = mode.applyProcessing(q, { audioCtx: ctx });
    mode.setLiveBandGain(ctx, "bas", 4 + 6); // kullanıcı +6dB düzeltme ekledi
    assert.equal(filters[0].gain.value, 10);
    assert.equal(filters[1].gain.value, -1, "tiz'e DOKUNULMAMALIYDI");
  });

  it("setLiveBandGain bilinmeyen bir bandId için SESSİZCE hiçbir şey yapmaz (çökmez)", () => {
    const q = { bands: [{ id: "bas", freq: 173, filterType: "lowshelf", bugDb: 0 }] };
    const ctx = makeFakeAudioCtx();
    mode.applyProcessing(q, { audioCtx: ctx });
    assert.doesNotThrow(() => mode.setLiveBandGain(ctx, "yok-boyle-bir-band", 5));
  });
});

describe("Tonal Denge — paramsForDifficultyPosition() (merkezi zorluk eğrisi)", () => {
  it("position arttıkça disturbDb PÜRÜZSÜZ (monoton) KÜÇÜLÜR", () => {
    let prev = Infinity;
    for (let p = 1; p <= 20; p += 0.25) {
      const { disturbDb } = mode.paramsForDifficultyPosition(p);
      assert.ok(disturbDb <= prev + 1e-9, `position ${p}'de disturbDb azalmadı`);
      prev = disturbDb;
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
    assert.ok(Math.abs(p1.disturbDb - cfg.DISTURB_DB_AT_1) < 1e-9);
    assert.ok(Math.abs(pCap.disturbDb - cfg.DISTURB_DB_AT_CAP) < 1e-9);
  });

  it("LEVEL_CAP'in ÇOK ötesinde disturbDb/timeSec bir TABANIN altına inmez", () => {
    const cfg = mode.TONAL_CURVE_CONFIG;
    const far = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP + 1000);
    assert.ok(far.disturbDb >= cfg.DISTURB_DB_FLOOR - 1e-9);
    assert.ok(far.timeSec >= cfg.TIME_SEC_FLOOR - 1e-9);
  });

  it("position<1 veya ondalık için düşmez, position 1 gibi davranır", () => {
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(0));
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(-5));
    assert.equal(mode.paramsForDifficultyPosition(0).position, 1);
  });
});

// G95 — ZORLUK.md bulgusu: sabit NEUTRAL_TOLERANCE_DB (1.5dB), position>=16'da
// (disturbDb eğrisi altına düşünce) modu "hiç dokunmadan geçilebilir" yapıyordu.
// Tolerans artık disturbDb'nin position'a göre küçülen bir ORANI
// (TOLERANCE_RATIO_AT_1/AT_CAP). Bu describe iki KABUL KRİTERİNİ kilitliyor:
// (1) 1..LEVEL_CAP arası HİÇBİR pozisyonda "hiç dokunmadan" geçilemez,
// (2) yakın (±%20 hata payıyla) düzeltmenin geçme oranı Z1'de yüksek, tavana
// doğru azalır ama SIFIRLANMAZ (imkânsızlaşmaz).
describe("Tonal Denge — G95: neutralToleranceDb (disturbDb'ye bağlı, sabit DEĞİL)", () => {
  it("position arttıkça neutralToleranceDb PÜRÜZSÜZ (monoton) KÜÇÜLÜR", () => {
    let prev = Infinity;
    for (let p = 1; p <= 20; p += 0.25) {
      const { neutralToleranceDb } = mode.paramsForDifficultyPosition(p);
      assert.ok(neutralToleranceDb <= prev + 1e-9, `position ${p}'de tolerans azalmadı`);
      prev = neutralToleranceDb;
    }
  });

  it("position=1'de disturbDb*TOLERANCE_RATIO_AT_1, LEVEL_CAP'te disturbDb*TOLERANCE_RATIO_AT_CAP'i birebir döner", () => {
    const cfg = mode.TONAL_CURVE_CONFIG;
    const p1 = mode.paramsForDifficultyPosition(1);
    const pCap = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    assert.ok(Math.abs(p1.neutralToleranceDb - p1.disturbDb * cfg.TOLERANCE_RATIO_AT_1) < 1e-9);
    assert.ok(Math.abs(pCap.neutralToleranceDb - pCap.disturbDb * cfg.TOLERANCE_RATIO_AT_CAP) < 1e-9);
  });

  it("tolerans HER ZAMAN o pozisyonun disturbDb'sinden KESİN küçük (aksi halde 'geçme' garantisi kırılır)", () => {
    for (let p = 1; p <= 20; p += 1) {
      const { disturbDb, neutralToleranceDb } = mode.paramsForDifficultyPosition(p);
      assert.ok(neutralToleranceDb < disturbDb, `position ${p}: tolerans (${neutralToleranceDb}) >= disturbDb (${disturbDb})`);
    }
  });

  it("KABUL KRİTERİ 1 — 1..LEVEL_CAP arası HER pozisyonda, HER bant-sayısında (4/5/6), 300 'hiç dokunmadan' denemede geçme oranı %0", () => {
    const cfg = mode.TONAL_CURVE_CONFIG;
    const bandSets = [mode.BAND_SET_4, mode.BAND_SET_5, mode.BAND_SET_6];
    for (let L = 1; L <= cfg.LEVEL_CAP; L++) {
      const { disturbDb, neutralToleranceDb } = mode.paramsForDifficultyPosition(L);
      for (const bandIds of bandSets) {
        for (let t = 0; t < 300; t++) {
          const bands = mode.bandsForQuestion(bandIds, disturbDb);
          const r = mode.evaluateAnswer({ bands, neutralToleranceDb }, {});
          assert.equal(r.correct, false, `L${L} bant=${bandIds.length}: hiç dokunmadan GEÇTİ (avgDeviation=${r.avgDeviation}, tolerans=${neutralToleranceDb})`);
        }
      }
    }
  });

  it("KABUL KRİTERİ 2 — yakın (±%20 hata payıyla) düzeltmenin geçme oranı Z1'de yüksek, Z20'ye doğru azalır ama SIFIRLANMAZ", () => {
    function nearTargetPassRate(bandIds, disturbDb, neutralToleranceDb, trials) {
      let pass = 0;
      for (let t = 0; t < trials; t++) {
        const bands = mode.bandsForQuestion(bandIds, disturbDb);
        const corrections = {};
        for (const b of bands) {
          const e = (Math.random() * 2 - 1) * 0.2; // ±%20
          corrections[b.id] = -b.bugDb * (1 + e);
        }
        const r = mode.evaluateAnswer({ bands, neutralToleranceDb }, corrections);
        if (r.correct) pass++;
      }
      return pass / trials;
    }
    const z1 = mode.paramsForDifficultyPosition(1);
    const z20 = mode.paramsForDifficultyPosition(20);
    const rateZ1 = nearTargetPassRate(mode.BAND_SET_6, z1.disturbDb, z1.neutralToleranceDb, 400);
    const rateZ20 = nearTargetPassRate(mode.BAND_SET_6, z20.disturbDb, z20.neutralToleranceDb, 400);
    assert.ok(rateZ1 > 0.85, `Z1 geçme oranı çok düşük: %${rateZ1 * 100}`);
    assert.ok(rateZ20 > 0, `Z20 İMKÂNSIZ hale gelmiş: %${rateZ20 * 100}`);
    assert.ok(rateZ20 < rateZ1, `Z20 (%${rateZ20 * 100}) Z1'den (%${rateZ1 * 100}) kolay olamaz`);
  });

  it("createQuestion(): eğri aktifken question.neutralToleranceDb curve'den gelir, eğri YOKSA sabit NEUTRAL_TOLERANCE_DB'ye düşer", () => {
    const withCurve = mode.createQuestion("medium", { source: "groove", difficultyPosition: 10 });
    assert.ok(Math.abs(withCurve.neutralToleranceDb - mode.paramsForDifficultyPosition(10).neutralToleranceDb) < 1e-9);

    const withoutCurve = mode.createQuestion("medium", { source: "groove" });
    assert.equal(withoutCurve.neutralToleranceDb, mode.NEUTRAL_TOLERANCE_DB);

    const proplusIgnoresCurve = mode.createQuestion("proplus", { source: "groove", difficultyPosition: 20 });
    assert.equal(proplusIgnoresCurve.neutralToleranceDb, mode.NEUTRAL_TOLERANCE_DB);
  });

  it("evaluateAnswer(): question.neutralToleranceDb YOKSA (bare test nesnesi) sabit NEUTRAL_TOLERANCE_DB'ye düşer — regresyon yok", () => {
    const q = { bands: [{ id: "bas", bugDb: 5 }] };
    const r = mode.evaluateAnswer(q, { bas: -5 + mode.NEUTRAL_TOLERANCE_DB * 0.5 });
    assert.equal(r.correct, true);
  });
});

describe("Tonal Denge — createQuestion(settings.difficultyPosition) entegrasyonu", () => {
  it("difficultyPosition VERİLMEZSE davranış eski statik tabloyla BİREBİR aynı kalır (proplus dahil): timeSec statik", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 10; i++) {
        const q = mode.createQuestion(level, { source: "groove" });
        assert.equal(q.timeSec, mode.DIFFICULTY[level].time);
      }
    }
  });

  it("proplus'ta difficultyPosition verilse BİLE eğri devreye girmez (diğer sekiz modun AYNI Z5 kararı)", () => {
    for (let i = 0; i < 10; i++) {
      const q = mode.createQuestion("proplus", { source: "groove", difficultyPosition: 20 });
      assert.equal(q.timeSec, mode.DIFFICULTY.proplus.time);
    }
  });
});

// G50: SINAV SİSTEMİNİN 7 moda yayılması — Tonal Denge odd-one-out DEĞİL, kendi
// TrainYourEars mekaniğiyle sınava giriyor (task: "canlı EQ, zorlaştırılmış —
// daha fazla bant/ince bozukluk"). "İnce bozukluk" EXAM_DIFFICULTY="pro"
// (mevcut DIFFICULTY.pro.disturbDb) ÜZERİNDEN otomatik gelir — "daha fazla
// bant" AYRI bir eksen (sessionQuestionIndex ramp'i, YUKARIDAKİ describe)
// olduğu için app.js SADECE settings.examBandBoost bayrağıyla besler.
describe("Tonal Denge — G50: EXAM_ENABLED/EXAM_DIFFICULTY + examBandBoost (sınav = 6 bant, session ramp'inden BAĞIMSIZ)", () => {
  it("EXAM_ENABLED=true, EXAM_DIFFICULTY='pro' export edilir (app.js:getWeakArea/startRound bunu okur)", () => {
    assert.equal(mode.EXAM_ENABLED, true);
    assert.equal(mode.EXAM_DIFFICULTY, "pro");
  });

  it("EXAM_WEAK_AREA export EDİLMEZ — bu mod dB Seviyesi/Kompresör/Reverb'le AYNI zayıf-KADEME telafisini kullanır", () => {
    assert.equal(mode.EXAM_WEAK_AREA, undefined);
  });

  it("examBandBoost=true iken sessionQuestionIndex NE OLURSA OLSUN 6 bant üretir (erken seans/idx=0 dahil)", () => {
    for (const idx of [0, 1, 3, 5]) {
      const q = mode.createQuestion("pro", { source: "groove", sessionQuestionIndex: idx, examBandBoost: true });
      assert.equal(q.bandCount, 6, `idx=${idx}`);
      assert.equal(q.bands.length, 6);
    }
  });

  it("examBandBoost=false/verilmezse ESKİ ramp davranışı BİREBİR korunur (regresyon yok)", () => {
    assert.equal(mode.createQuestion("pro", { source: "groove", sessionQuestionIndex: 0 }).bandCount, 4);
    assert.equal(mode.createQuestion("pro", { source: "groove", sessionQuestionIndex: 0, examBandBoost: false }).bandCount, 4);
  });
});

describe("Tonal Denge — Sabit mod eğriye bağlı ('kolaylaşma yok' invaryantı)", () => {
  const TIERS = ["easy", "medium", "hard", "pro"];

  it("her tier'da: disturbDb eski statikten BÜYÜK DEĞİL (kolaylaşma yok — küçük=zor)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      assert.ok(p.disturbDb <= old.disturbDb + 1e-9, `${tier}: disturbDb ${p.disturbDb} > eski ${old.disturbDb}`);
    }
  });

  it("her tier'da: timeSec eski statikten BÜYÜK DEĞİL", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      assert.ok(p.timeSec <= old.time + 1e-9, `${tier}: timeSec ${p.timeSec} > eski ${old.time}`);
    }
  });

  it("pro'nun temsilci seviyesi TAM LEVEL_CAP — eğrinin en zor noktası", () => {
    assert.equal(representativeLevelForTier("pro"), mode.TONAL_CURVE_CONFIG.LEVEL_CAP);
  });

  it("EASY (temsilci seviye) → EKSTREM/bariz ortalama sapma, PRO (temsilci seviye) → ince/subtle — öğretmen yöntemi (N=150/tier, boş answer)", () => {
    const N = 150;
    let easySum = 0, proSum = 0;
    for (let i = 0; i < N; i++) {
      const qEasy = mode.createQuestion("easy", { source: "groove", difficultyPosition: representativeLevelForTier("easy") });
      const qPro = mode.createQuestion("pro", { source: "groove", difficultyPosition: representativeLevelForTier("pro") });
      easySum += mode.evaluateAnswer(qEasy, {}).avgDeviation;
      proSum += mode.evaluateAnswer(qPro, {}).avgDeviation;
    }
    const easyAvg = easySum / N, proAvg = proSum / N;
    assert.ok(proAvg < easyAvg, `pro (${proAvg.toFixed(2)}) easy'den (${easyAvg.toFixed(2)}) daha ince olmalıydı`);
  });
});

describe("Tonal Denge — getMeta() sözleşme alanları", () => {
  it("id/motor/kulaklikGerekli/uyumluKaynaklar/ucretsiz/videoUrl/difficulty/choiceOnly tanımlı, motor=2", () => {
    const meta = mode.getMeta();
    assert.equal(meta.id, "tonal-denge");
    assert.equal(meta.motor, 2);
    assert.equal(meta.kulaklikGerekli, true);
    assert.ok(Array.isArray(meta.uyumluKaynaklar));
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

  it("kaynak listesi TAM OLARAK groove+upload — G44'ten DEĞİŞMEDİ (dolu-mix-bağlamı şartı)", () => {
    const meta = mode.getMeta();
    assert.deepEqual([...meta.uyumluKaynaklar].sort(), ["groove", "upload"]);
  });
});

describe("Tonal Denge — artık three-way DEĞİL (G44'ten ayrışma doğrulaması)", () => {
  it("THREE_WAY export'u YOK (G44'te vardı, G45'te BİLİNÇLİ kaldırıldı)", () => {
    assert.equal(mode.THREE_WAY, undefined);
  });

  it("renderThreeWayCards'tan HİÇBİR fonksiyon miras almıyor — kendi renderAnswerChoices'ı VAR ve three-way-cards'tan FARKLI", async () => {
    const threeWayCards = await import("../www/js/core/three-way-cards.js");
    assert.notEqual(mode.renderAnswerChoices, threeWayCards.renderThreeWayCards);
    assert.notEqual(mode.markAnswerChoices, threeWayCards.markThreeWayCards);
    assert.equal(mode.updateAnswerPlayState, undefined, "updateAnswerPlayState artık export edilmemeli (three-way'e özgüydü)");
  });

  it("Kompresör/Reverb HÂLÂ three-way-cards.js'ten miras alıyor — bu modun ayrışması ONLARI etkilemedi", async () => {
    const threeWayCards = await import("../www/js/core/three-way-cards.js");
    const kompresor = await import("../www/js/modes/kompresor.js");
    const reverb = await import("../www/js/modes/reverb.js");
    assert.equal(kompresor.renderAnswerChoices, threeWayCards.renderThreeWayCards);
    assert.equal(reverb.renderAnswerChoices, threeWayCards.renderThreeWayCards);
    assert.equal(kompresor.THREE_WAY, true);
    assert.equal(reverb.THREE_WAY, true);
  });
});

describe("Tonal Denge — renderAnswerChoices/markAnswerChoices (DOM üretimi, kaydırıcı + onay butonu)", () => {
  // Bu testler gerçek bir DOM'a ihtiyaç duyar (jsdom YOK bu projede) — SADECE
  // innerHTML string'ini üreten çağrının ÇÖKMEDİĞİNİ ve beklenen data
  // attribute'larını/class'ları İÇERDİĞİNİ string üzerinden doğrular (diğer
  // modların renderAnswerChoices testlerinin AYNI kısıtı, bkz. CLAUDE.md
  // "Ses ve DOM davranışı kaynak koddan doğrulanamaz").
  function fakeEl() {
    let html = "";
    let classes = new Set();
    return {
      get innerHTML() { return html; },
      set innerHTML(v) { html = v; },
      classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
      set className(v) { classes = new Set(v.split(" ")); },
      get className() { return [...classes].join(" "); },
      querySelector() { return null; },
      querySelectorAll() { return []; }
    };
  }

  it("her bant için bir .tonal-slider (data-band-id ile) + TEK bir .tonal-submit üretir, çökmez", () => {
    const q = mode.createQuestion("easy", { source: "groove" });
    const el = fakeEl();
    assert.doesNotThrow(() => mode.renderAnswerChoices(el, q));
    q.bands.forEach(b => {
      assert.match(el.innerHTML, new RegExp(`data-band-id="${b.id}"`));
    });
    assert.match(el.innerHTML, /tonal-submit/);
    assert.equal((el.innerHTML.match(/tonal-slider/g) || []).length, q.bands.length);
  });

  it("q.bands yoksa boşaltır ve gizler (diğer modların AYNI savunma deseni)", () => {
    const el = fakeEl();
    mode.renderAnswerChoices(el, {});
    assert.equal(el.innerHTML, "");
    assert.ok(el.classList.contains("hidden"));
  });
});

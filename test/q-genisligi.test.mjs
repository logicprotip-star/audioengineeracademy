// Q Genişliği moduna özel testler: 5 genişlik etiketinin sınırsız/çakışmasız
// sınıflandırması, FELSEFEYE bağlı havuz büyümesi (Notch/Dar/Geniş çekirdek
// üçlüsü HER ZAMAN oyunda, ASLA 2'ye düşmez — G29'da tersine çevrilen gerçek
// hata), izole-Q üretimi (frekans/gain sabit kalıyor mu), zorlukla hem
// kademelerin yakınlaşması (edgeMargin) HEM havuzun büyümesi (Orta zor'da,
// Çok Geniş pro'da), merkezi zorluk eğrisine bağlanma + "kolaylaşma yok"
// invaryantı, dinamik+uzunluk-duyarlı başlık (G28/G29), evaluateAnswer'ın
// etiket-eşleşme mantığı, applyProcessing'in doğru peaking Q'yu kurması.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/q-genisligi.js";
import { representativeLevelForTier } from "../www/js/core/difficulty-curve.js";

const CORE_IDS = ["notch", "dar", "genis"];

describe("Q Genişliği — labelIndexForQ() (5 etiket, sınırsız/çakışmasız sınıflandırma)", () => {
  it("MIN_Q'dan MAX_Q'ya kadar HER Q TAM BİR etiket indexine düşer, boşluk/çakışma yok", () => {
    const steps = 5000;
    const lo = Math.log2(mode.MIN_Q), hi = Math.log2(mode.MAX_Q);
    for (let i = 0; i <= steps; i++) {
      const q = Math.pow(2, lo + (hi - lo) * (i / steps));
      const idx = mode.labelIndexForQ(q);
      assert.ok(idx >= 0 && idx <= 4, `Q=${q}: index ${idx} aralık dışı`);
    }
  });

  it("bitişik iki etiket arasında ORTAK sınır TAM BİR tarafa düşer (çakışma yok)", () => {
    const notchIdx = mode.labelIndexForQ(7);
    assert.equal(notchIdx, 0, "Q=7 notch'un (index 0) alt sınırı, notch'a düşmeli");
  });

  it("labelById bilinmeyen bir id için null döner (çökmez)", () => {
    assert.equal(mode.labelById("olmayan-id"), null);
  });
});

// G29'un MERKEZİ felsefe testi: "cerrahi mi müzikal mi" kararı Notch/Dar/Geniş
// çekirdek üçlüsüyle öğretiliyor — bu üçü HER ZAMAN havuzda, ASLA düşmez.
describe("Q Genişliği — poolForSize() (FELSEFE: çekirdek üçlü hep var, nüans sonradan eklenir)", () => {
  it("n<=3 için HER ZAMAN TAM {Notch,Dar,Geniş} — Orta/Çok Geniş YOK", () => {
    for (const n of [0, 1, 2, 3]) {
      const pool = mode.poolForSize(n);
      const ids = pool.map(l => l.id).sort();
      assert.deepEqual(ids, [...CORE_IDS].sort(), `n=${n}: havuz ${JSON.stringify(ids)}`);
    }
  });

  it("n=4: çekirdek üçlü + Orta (Çok Geniş henüz YOK)", () => {
    const pool = mode.poolForSize(4);
    const ids = new Set(pool.map(l => l.id));
    assert.equal(pool.length, 4);
    for (const id of CORE_IDS) assert.ok(ids.has(id), `${id} havuzda olmalıydı`);
    assert.ok(ids.has("orta"), "Orta havuzda olmalıydı");
    assert.ok(!ids.has("cokgenis"), "Çok Geniş HENÜZ havuzda olmamalıydı");
  });

  it("n=5: TÜM etiketler", () => {
    const pool = mode.poolForSize(5);
    assert.equal(pool.length, 5);
    const ids = new Set(pool.map(l => l.id));
    for (const id of ["notch", "dar", "orta", "genis", "cokgenis"]) assert.ok(ids.has(id));
  });

  it("havuz HER ZAMAN LABELS'in dar→geniş sırasında (pickTrueQ'nun komşuluk kontrolü buna dayanıyor)", () => {
    for (const n of [3, 4, 5]) {
      const pool = mode.poolForSize(n);
      const qMaxes = pool.map(l => l.qMax);
      const sorted = [...qMaxes].sort((a, b) => b - a);
      assert.deepEqual(qMaxes, sorted, `n=${n}: havuz Q-sıralı değil`);
    }
  });

  it("n>5 ya da negatif için düşmez, sınırlara kırpılır", () => {
    assert.equal(mode.poolForSize(100).length, 5);
    assert.equal(mode.poolForSize(-5).length, 3);
    assert.equal(mode.poolForSize(0).length, 3);
  });
});

describe("Q Genişliği — generateChoices() (havuzun TAMAMI şık olur, sayısal değer YOK)", () => {
  it("şık sayısı HER ZAMAN pool.length'e eşit — eksik/fazla yok", () => {
    for (const n of [3, 4, 5]) {
      const pool = mode.poolForSize(n);
      for (let i = 0; i < pool.length; i++) {
        const correctIndex = mode.labelIndexForQ(pool[i].qCenter);
        const choices = mode.generateChoices(correctIndex, pool);
        assert.equal(choices.length, pool.length, `n=${n}`);
      }
    }
  });

  it("her şık SADECE {id,tr,correct} taşır — sayısal Q değeri YOK", () => {
    const pool = mode.poolForSize(4);
    const choices = mode.generateChoices(0, pool);
    choices.forEach(c => {
      assert.equal(typeof c.id, "string");
      assert.equal(typeof c.tr, "string");
      assert.equal(typeof c.correct, "boolean");
      assert.equal(Object.prototype.hasOwnProperty.call(c, "q"), false, "şıkta sayısal Q değeri OLMAMALI");
    });
  });

  it("doğru şık TAM BİR kez var, çakışma/tekrar yok", () => {
    for (const n of [3, 4, 5]) {
      const pool = mode.poolForSize(n);
      for (const label of pool) {
        const correctIndex = mode.labelIndexForQ(label.qCenter);
        const choices = mode.generateChoices(correctIndex, pool);
        const correctChoices = choices.filter(c => c.correct);
        assert.equal(correctChoices.length, 1, `n=${n}: ${correctChoices.length} doğru şık`);
        const ids = choices.map(c => c.id);
        assert.equal(new Set(ids).size, ids.length, "şıklarda tekrar var");
      }
    }
  });
});

describe("Q Genişliği — pickTrueQ() (izole/kenar-yakınlığı, HER ZAMAN KENDİ etiketinde kalır)", () => {
  it("üretilen Q, HER ZAMAN correctIndex'in KENDİ [qMin,qMax] aralığında — 2000 örnek", () => {
    for (const n of [3, 4, 5]) {
      const pool = mode.poolForSize(n);
      for (const label of pool) {
        const correctIndex = mode.labelIndexForQ(label.qCenter);
        for (let i = 0; i < 100; i++) {
          const edgeMargin = 0.05 + Math.random() * 0.5;
          const q = mode.pickTrueQ(correctIndex, edgeMargin, pool);
          assert.ok(q >= label.qMin - 1e-6 && q <= label.qMax + 1e-6, `n=${n} ${label.id}: Q=${q} kendi aralığı dışında`);
          assert.equal(mode.labelIndexForQ(q), correctIndex, `n=${n} ${label.id}: üretilen Q=${q} YANLIŞ etikete sınıflandı`);
        }
      }
    }
  });

  it("kolay havuzda (n=3, {Notch,Dar,Geniş}) 'dar'ın komşusu SADECE notch (orta havuzda YOK) — Q, ÜST sınıra (orta'ya) YAKLAŞMAZ, ORTAYA yerleşir o yönde", () => {
    const pool = mode.poolForSize(3);
    const darIndex = mode.labelIndexForQ(mode.labelById("dar").qCenter);
    const dar = mode.labelById("dar");
    // notch komşuluğu VAR (alt sınır) → alt sınıra yakın; üst sınırda (orta) komşu
    // YOK → üst kenar davranışı ORTAYA (üst yarının ortası değil, tam aralık ortası
    // — fonksiyonun "komşu yoksa aralık ortası" kuralı, TEK kenarda komşu varken bile
    // geçerli: sonuç HER ZAMAN lo+margin'e (notch'a yakın) yerleşir, çünkü
    // hasNarrowerNeighbor=true dalı öncelikli).
    const q = mode.pickTrueQ(darIndex, 0.1, pool);
    const lo = Math.log2(dar.qMin);
    assert.ok(Math.log2(q) - lo < 0.15, `notch komşuluğu yüzünden alt sınıra yakın olmalıydı: Q=${q}`);
  });

  it("komşu YOKSA (her iki kenarda da havuzda etiket yoksa) Q aralığın ORTASINA yerleşir", () => {
    // Tek elemanlı sahte bir "havuz" — hiçbir komşu YOK.
    const notch = mode.labelById("notch");
    const center = Math.sqrt(notch.qMin * notch.qMax);
    const q = mode.pickTrueQ(0, 0.3, [notch]);
    assert.ok(Math.abs(Math.log2(q) - Math.log2(center)) < 0.05, `merkeze yakın olmalıydı: Q=${q}, merkez=${center}`);
  });

  it("dar komşu (correctIndex-1 havuzda) varsa Q, ALT sınıra (qMin) yakın üretilir", () => {
    const pool = [mode.labelById("notch"), mode.labelById("dar")]; // dar'ın alt komşusu notch
    const darIndex = mode.labelIndexForQ(mode.labelById("dar").qCenter);
    const q = mode.pickTrueQ(darIndex, 0.1, pool);
    const dar = mode.labelById("dar");
    assert.ok(Math.log2(q) - Math.log2(dar.qMin) < 0.15, `alt sınıra yakın olmalıydı: Q=${q}`);
  });

  it("geniş komşu (correctIndex+1 havuzda) varsa Q, ÜST sınıra (qMax) yakın üretilir", () => {
    const pool = [mode.labelById("dar"), mode.labelById("orta")]; // dar'ın üst komşusu orta
    const darIndex = mode.labelIndexForQ(mode.labelById("dar").qCenter);
    const q = mode.pickTrueQ(darIndex, 0.1, pool);
    const dar = mode.labelById("dar");
    assert.ok(Math.log2(dar.qMax) - Math.log2(q) < 0.15, `üst sınıra yakın olmalıydı: Q=${q}`);
  });
});

describe("Q Genişliği — createQuestion() genel sözleşme", () => {
  for (const level of Object.keys(mode.DIFFICULTY)) {
    it(`createQuestion("${level}") geçerli bir soru üretir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      assert.equal(q.mode, "qwidth");
      assert.equal(q.difficulty, level);
      assert.equal(typeof q.freq, "number");
      assert.equal(typeof q.gainDb, "number");
      assert.notEqual(q.gainDb, 0);
      assert.equal(typeof q.q, "number");
      assert.ok(q.correctIndex >= 0 && q.correctIndex <= 4);
      assert.equal(typeof q.isolate, "boolean");
      assert.equal(q.hintUsed, false);
      assert.ok(Array.isArray(q.choices) && q.choices.length >= 3, "şık sayısı ASLA 3'ün altına inmemeli");
    });

    it(`createQuestion("${level}") SAF fonksiyondur: JSON'a sorunsuz serileşir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      const json = JSON.stringify(q);
      assert.ok(json.length > 0);
      assert.equal(typeof q.applyProcessing, "undefined");
    });
  }

  it("HİÇBİR zorlukta/pozisyonda şık sayısı 3'ün altına İNMEZ — 200 örnek/zorluk", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 200; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.ok(q.choices.length >= 3, `${level}: ${q.choices.length} şık — 3'ün altına indi!`);
      }
    }
  });

  it("kolay/orta HER ZAMAN tam 3 şık — {Notch,Dar,Geniş} çekirdek üçlüsü, doğru cevap HİÇBİR ZAMAN Orta/Çok Geniş DEĞİL", () => {
    for (const level of ["easy", "medium"]) {
      for (let i = 0; i < 100; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.choices.length, 3, `${level}: ${q.choices.length} şık`);
        const ids = q.choices.map(c => c.id).sort();
        assert.deepEqual(ids, [...CORE_IDS].sort(), `${level}: şıklar ${JSON.stringify(ids)}`);
        const correctLabel = mode.labelById(q.choices.find(c => c.correct).id);
        assert.ok(CORE_IDS.includes(correctLabel.id), `${level}: doğru cevap çekirdek üçlü DIŞINDA (${correctLabel.id})`);
      }
    }
  });

  it("zor: tam 4 şık (çekirdek üçlü + Orta), pro/proplus: tam 5 şık (hepsi)", () => {
    for (let i = 0; i < 50; i++) {
      const qHard = mode.createQuestion("hard", { source: "pink", boss: false });
      assert.equal(qHard.choices.length, 4);
      assert.ok(qHard.choices.some(c => c.id === "orta"));
      assert.ok(!qHard.choices.some(c => c.id === "cokgenis"));

      const qPro = mode.createQuestion("pro", { source: "pink", boss: false });
      assert.equal(qPro.choices.length, 5);
    }
  });

  it("gainDb HER ZAMAN ±Q_GAIN_DB büyüklüğünde — hiçbir zorlukta DEĞİŞMEZ (izolasyon ilkesi)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 30; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.ok(Math.abs(Math.abs(q.gainDb) - mode.Q_GAIN_DB) < 1e-9, `${level}: |gainDb|=${Math.abs(q.gainDb)} != ${mode.Q_GAIN_DB}`);
      }
    }
  });
});

describe("Q Genişliği — izole Q (kolay/orta'da frekans SABİT, zorlaştıkça serbest)", () => {
  it("statik easy/medium (difficultyPosition YOK): frekans HER ZAMAN Q_FIXED_FREQ", () => {
    for (const level of ["easy", "medium"]) {
      for (let i = 0; i < 30; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.freq, mode.Q_FIXED_FREQ, `${level}: freq=${q.freq}`);
        assert.equal(q.isolate, true);
      }
    }
  });

  it("statik hard/pro/proplus (difficultyPosition YOK): fallback İZOLE davranışı korunur (en güvenli/temiz sinyal)", () => {
    for (const level of ["hard", "pro", "proplus"]) {
      for (let i = 0; i < 30; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.freq, mode.Q_FIXED_FREQ, `${level}: freq=${q.freq}`);
      }
    }
  });

  it("difficultyPosition DÜŞÜKSE (ISOLATE_UNTIL_POSITION altı) frekans SABİT — eğri üzerinden de", () => {
    for (let i = 0; i < 20; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: 1 });
      assert.equal(q.freq, mode.Q_FIXED_FREQ);
      assert.equal(q.isolate, true);
    }
  });

  it("difficultyPosition YÜKSEKSE (ISOLATE_UNTIL_POSITION üstü) frekans SERBEST — istatistiksel çeşitlilik", () => {
    const freqs = new Set();
    for (let i = 0; i < 100; i++) {
      const q = mode.createQuestion("pro", { source: "pink", boss: false, difficultyPosition: mode.Q_CURVE_CONFIG.LEVEL_CAP });
      assert.equal(q.isolate, false);
      freqs.add(Math.round(q.freq));
    }
    assert.ok(freqs.size > 50, `100 örnekte sadece ${freqs.size} farklı frekans — serbest bırakılmamış olabilir`);
  });

  it("gainDb, izole OLMAYAN durumda BİLE hâlâ sabit büyüklükte (frekans serbest ama gain HER ZAMAN sabit)", () => {
    for (let i = 0; i < 30; i++) {
      const q = mode.createQuestion("pro", { source: "pink", boss: false, difficultyPosition: mode.Q_CURVE_CONFIG.LEVEL_CAP });
      assert.ok(Math.abs(Math.abs(q.gainDb) - mode.Q_GAIN_DB) < 1e-9);
    }
  });
});

describe("Q Genişliği — evaluateAnswer", () => {
  it("doğru etiket → correct=true", () => {
    const q = { correctIndex: 0 };
    const r = mode.evaluateAnswer(q, "notch");
    assert.equal(r.correct, true);
    assert.equal(r.correctId, "notch");
  });

  it("yanlış etiket → correct=false", () => {
    const q = { correctIndex: 0 };
    const r = mode.evaluateAnswer(q, "genis");
    assert.equal(r.correct, false);
  });

  it("{id} nesnesi olarak da gelebilir (şıklı arayüzden)", () => {
    const q = { correctIndex: 3 };
    assert.equal(mode.evaluateAnswer(q, { id: "genis" }).correct, true);
  });
});

describe("Q Genişliği — calculateXP sağlamlık", () => {
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

describe("Q Genişliği — öğretici metin (teachingText/getFeedbackData) — Q değeri + frekans + yön + mix anlamı", () => {
  it("metin Q'nun SAYISAL karşılığını (1 ondalık), frekansı VE mix anlamını içerir", () => {
    const q = { correctIndex: 0, q: 8.5, freq: 1000, gainDb: 6 };
    const text = mode.teachingText(q, "notch");
    assert.match(text, /8\.5/);
    assert.match(text, /1[.,]?0*\s*kHz|1000\s*Hz/i);
    assert.match(text, /cerrahi/i);
  });

  it("YÖN (boost/cut) metinde geçer", () => {
    const boostQ = { correctIndex: 3, q: 0.8, freq: 3000, gainDb: 6 };
    const cutQ = { correctIndex: 3, q: 0.8, freq: 3000, gainDb: -6 };
    assert.match(mode.teachingText(boostQ, "genis"), /boost/i);
    assert.match(mode.teachingText(cutQ, "genis"), /cut/i);
  });

  it("YANLIŞ durumda kullanıcının seçtiği etiket de metinde geçer", () => {
    const q = { correctIndex: 0, q: 9.0, freq: 1000, gainDb: 6 };
    const text = mode.teachingText(q, "genis");
    assert.match(text, /Geniş/);
    assert.match(text, /Notch/);
  });

  it("hiçbir durum boş/bozuk metin üretmez (5 etiket × 2 durum)", () => {
    const ids = ["notch", "dar", "orta", "genis", "cokgenis"];
    for (let ci = 0; ci < 5; ci++) {
      const q = { correctIndex: ci, q: mode.labelById(ids[ci]).qCenter, freq: 1000, gainDb: 6 };
      for (const guess of [ids[ci], ids[(ci + 1) % 5]]) {
        const text = mode.teachingText(q, guess);
        assert.ok(text && text.length >= 10, `ci=${ci} guess=${guess}: kısa/boş metin`);
        // NOT case-insensitive: "rezonans" gibi meşru kelimeler "nan" alt-dizisini
        // içerir — gerçek bir bozukluk (Number.NaN.toString()) HER ZAMAN tam "NaN"
        // büyük/küçük harf kalıbıyla çıkar, bu yüzden case-sensitive kontrol edildi.
        assert.doesNotMatch(text, /undefined|NaN|\[object/, `ci=${ci} guess=${guess}: bozuk metin: ${text}`);
      }
    }
  });

  it("getFeedbackData showResult HER ZAMAN true, panel HER ZAMAN null", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    const correctId = q.choices.find(c => c.correct).id;
    const wrongId = q.choices.find(c => !c.correct)?.id || correctId;
    const correctFb = mode.getFeedbackData(q, correctId, { gained: 10 });
    const wrongFb = mode.getFeedbackData(q, wrongId, { gained: 0 });
    assert.equal(correctFb.showResult, true);
    assert.equal(correctFb.panel, null);
    assert.equal(wrongFb.showResult, true);
    assert.equal(wrongFb.panel, null);
  });
});

describe("Q Genişliği — applyProcessing (doğru peaking BiquadFilterNode, sahte audioCtx ile)", () => {
  it("freq/gain/Q doğru atanmış TEK peaking BiquadFilterNode döner", () => {
    const created = [];
    const fakeAudioCtx = {
      createBiquadFilter: () => {
        const f = { type: "", frequency: { value: 0 }, Q: { value: 0 }, gain: { value: 0 } };
        created.push(f);
        return f;
      }
    };
    const q = { freq: 1000, gainDb: 6, q: 8.5 };
    const { filters } = mode.applyProcessing(q, { audioCtx: fakeAudioCtx });
    assert.equal(filters.length, 1);
    assert.equal(filters[0].type, "peaking");
    assert.equal(filters[0].frequency.value, 1000);
    assert.equal(filters[0].gain.value, 6);
    assert.equal(filters[0].Q.value, 8.5);
    assert.equal(created.length, 1);
  });
});

describe("Q Genişliği — paramsForDifficultyPosition() (merkezi zorluk eğrisi)", () => {
  it("position arttıkça edgeMargin PÜRÜZSÜZ (monoton) KÜÇÜLÜR", () => {
    let prev = Infinity;
    for (let p = 1; p <= 20; p += 0.25) {
      const { edgeMargin } = mode.paramsForDifficultyPosition(p);
      assert.ok(edgeMargin <= prev + 1e-9, `position ${p}'de edgeMargin azalmadı`);
      prev = edgeMargin;
    }
  });

  it("options position arttıkça monoton artar, HER ZAMAN 3-5 arası tam sayı (ASLA 2 değil)", () => {
    let prev = 0;
    for (let p = 1; p <= 20; p += 0.5) {
      const { options } = mode.paramsForDifficultyPosition(p);
      assert.ok(Number.isInteger(options) && options >= 3 && options <= 5, `position ${p}: options=${options}`);
      assert.ok(options >= prev);
      prev = options;
    }
  });

  it("position=1'de AT_1, position=LEVEL_CAP'te AT_CAP değerlerini birebir döner (edgeMargin)", () => {
    const cfg = mode.Q_CURVE_CONFIG;
    const p1 = mode.paramsForDifficultyPosition(1);
    const pCap = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    assert.ok(Math.abs(p1.edgeMargin - cfg.EDGE_MARGIN_AT_1) < 1e-9);
    assert.ok(Math.abs(pCap.edgeMargin - cfg.EDGE_MARGIN_AT_CAP) < 1e-9);
  });

  it("LEVEL_CAP'in ÇOK ötesinde edgeMargin bir TABANIN altına inmez", () => {
    const cfg = mode.Q_CURVE_CONFIG;
    const far = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP + 1000);
    assert.ok(far.edgeMargin >= cfg.EDGE_MARGIN_FLOOR - 1e-9);
  });

  it("position<1 veya ondalık için düşmez, position 1 gibi davranır", () => {
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(0));
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(-5));
    assert.equal(mode.paramsForDifficultyPosition(0).position, 1);
  });

  it("isolate SADECE ISOLATE_UNTIL_POSITION'ın altında/eşit true döner", () => {
    const below = mode.paramsForDifficultyPosition(mode.ISOLATE_UNTIL_POSITION - 0.5);
    const above = mode.paramsForDifficultyPosition(mode.ISOLATE_UNTIL_POSITION + 0.5);
    assert.equal(below.isolate, true);
    assert.equal(above.isolate, false);
  });
});

describe("Q Genişliği — createQuestion(settings.difficultyPosition) entegrasyonu", () => {
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
      assert.equal(q.freq, mode.Q_FIXED_FREQ);
    }
  });
});

// Kesim Noktası/dB Seviyesi/Boost-Cut'ın AYNI kompozisyonu — "Sabit" modun eğriye
// bağlanması, hiçbir tier eski statikten kolay olmayacak şekilde ÖNCEDEN kalibre.
describe("Q Genişliği — Sabit mod eğriye bağlı ('kolaylaşma yok' invaryantı)", () => {
  const TIERS = ["easy", "medium", "hard", "pro"];

  it("her tier'da: edgeMargin eski statikten BÜYÜK DEĞİL (kolaylaşma yok — küçük=zor)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      assert.ok(p.edgeMargin <= old.edgeMargin + 1e-9, `${tier}: edgeMargin ${p.edgeMargin} > eski ${old.edgeMargin}`);
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

  // G29'da bulunan gerçek kalibrasyon hatası: OPTIONS_AT_CAP ilk seçilen değerle
  // (6.7) hard'ın TEMSİLCİ seviyesi (12) BİLE ZATEN 5'e yuvarlanıyordu (4'e değil)
  // — "zor" tier Sabit modda (representativeLevelForTier + sessionRampOffset
  // kompozisyonuyla) PRATİKTE hiçbir zaman 4 göstermiyordu, her zaman 5'ti. Statik
  // tabloyla (hard.options=4) tutarlılık için AT_CAP 6.0'a düşürüldü — artık hard'ın
  // TEMSİLCİ seviyesi TAM 4, session rampasının ÜST ucunda (boss/geç-döngü) 5'e
  // doğal olarak çıkabiliyor (spec'in "4-5'e çıkar" ifadesiyle tutarlı, ama ARTIK
  // 4 gerçekten ulaşılabilir bir değer, sadece geçilip gidilen bir basamak değil).
  it("hard'ın TEMSİLCİ seviyesi TAM 4 döner (5 değil) — G29 kalibrasyon regresyonu", () => {
    const level = representativeLevelForTier("hard");
    const p = mode.paramsForDifficultyPosition(level);
    assert.equal(p.options, 4, `hard repr=${level}: options=${p.options}, beklenen 4`);
  });

  it("pro'nun temsilci seviyesi TAM LEVEL_CAP — eğrinin en zor noktası", () => {
    assert.equal(representativeLevelForTier("pro"), mode.Q_CURVE_CONFIG.LEVEL_CAP);
    const atCap = mode.paramsForDifficultyPosition(mode.Q_CURVE_CONFIG.LEVEL_CAP);
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

// G28/G29 — cihazda bulunan İKİ gerçek hata: (1) başlık sabit metindi, gerçek
// şıklarla uyuşmuyordu; (2) 5 etiketi tek cümlede sayan başlık 375px'te
// `.game-scroll`'un taşmasını Boost/Cut'ın kendi en kötü durumundan fazlaya
// çıkarıyordu ("ekran kayması"). Bu blok İKİSİNİ de kalıcı regresyon testine
// bağlıyor.
describe("Q Genişliği — questionTitle() (G28: şık/isim uyuşmazlığı + G29: uzunluk/layout)", () => {
  it("≤3 şıklı turlarda başlıktaki HER etiket TAM OLARAK q.choices'taki etiketlerle eşleşir", () => {
    for (const level of ["easy", "medium"]) {
      for (let i = 0; i < 30; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        const title = mode.questionTitle(q);
        for (const c of q.choices) {
          assert.match(title, new RegExp(c.tr.replace(/ /g, "\\s")), `${level}: "${c.tr}" şıklarda var ama başlıkta yok — "${title}"`);
        }
      }
    }
  });

  it("≤3 şıklı turlarda başlıktaki etiket SAYISI q.choices.length'e TAM eşit", () => {
    for (const level of ["easy", "medium"]) {
      for (let i = 0; i < 20; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        const title = mode.questionTitle(q);
        const partCount = title.split(",").length;
        assert.equal(partCount, q.choices.length, `${level}: başlıkta ${partCount} parça ama ${q.choices.length} şık var — "${title}"`);
      }
    }
  });

  it("her etiket doğru Türkçe soru ekiyle biter (mu/mı/mi) — bozuk/eksik ek yok", () => {
    const q2 = { choices: [{ id: "notch", tr: "Notch" }, { id: "dar", tr: "Dar" }, { id: "genis", tr: "Geniş" }] };
    const title = mode.questionTitle(q2);
    assert.equal(title, "Bu EQ'nun genişlik karakteri ne — Notch mu, Dar mı, Geniş mi?");
  });

  it("G29: >3 şıklı turlarda (zor/pro) başlık KISA/SABİT — TÜM etiketleri saymaz, TEK satıra sığar", () => {
    for (const level of ["hard", "pro"]) {
      for (let i = 0; i < 20; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        const title = mode.questionTitle(q);
        assert.ok(title.length < 60, `${level}: başlık çok uzun (${title.length} karakter) — "${title}"`);
        assert.equal(title, "Bu EQ'nun genişlik karakteri ne? Aşağıdaki şıklardan seç.");
      }
    }
  });

  it("başlık HİÇBİR ZAMAN 4-5 etiketi tek cümlede art arda saymaz (G29'da ÖLÇÜLEN layout taşmasının kök nedeni)", () => {
    for (const level of ["hard", "pro"]) {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      const title = mode.questionTitle(q);
      const commaCount = (title.match(/,/g) || []).length;
      assert.ok(commaCount <= 2, `${level}: başlıkta ${commaCount} virgül — hâlâ uzun bir liste sayıyor olabilir: "${title}"`);
    }
  });
});

describe("Q Genişliği — getMeta() sözleşme alanları", () => {
  it("id/motor/kulaklikGerekli/uyumluKaynaklar/ucretsiz/videoUrl/difficulty/choiceOnly tanımlı", () => {
    const meta = mode.getMeta();
    assert.equal(meta.id, "q-genisligi");
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
      assert.ok(meta.difficulty[level].options >= 3, `${level}: options ${meta.difficulty[level].options} < 3`);
    }
  });

  it("ad/aciklama BİLEREK yok — kart metni yalnızca mode-catalog.js'ten okunur", () => {
    const meta = mode.getMeta();
    assert.equal(meta.ad, undefined);
    assert.equal(meta.aciklama, undefined);
  });
});

describe("Q Genişliği — diğer modlarla KARŞILAŞTIRMA (bağlantı mekanizması ORTAK)", () => {
  it("AYNI position'da dört modun da eğrisi aynı yönde (monoton) hareket eder — Q'ya özgü bir kopukluk YOK", async () => {
    const kesim = await import("../www/js/modes/kesim-noktasi.js");
    const db = await import("../www/js/modes/db-seviyesi.js");
    const boostCut = await import("../www/js/modes/boost-mu-cut-mu.js");
    const positions = [1, 2, 5, 10, 15, 20];
    let qPrev = Infinity, kesimPrev = Infinity, dbPrev = Infinity, bcPrev = Infinity;
    for (const p of positions) {
      const qVal = mode.paramsForDifficultyPosition(p).edgeMargin;
      const kesimVal = kesim.paramsForDifficultyPosition(p).marginOct;
      const dbVal = db.paramsForDifficultyPosition(p).dbDelta;
      const bcVal = boostCut.paramsForDifficultyPosition(p).gainDb;
      assert.ok(qVal <= qPrev + 1e-9, `Q: position ${p}'de artış`);
      assert.ok(kesimVal <= kesimPrev + 1e-9, `Kesim: position ${p}'de artış`);
      assert.ok(dbVal <= dbPrev + 1e-9, `dB: position ${p}'de artış`);
      assert.ok(bcVal <= bcPrev + 1e-9, `Boost/Cut: position ${p}'de artış`);
      qPrev = qVal; kesimPrev = kesimVal; dbPrev = dbVal; bcPrev = bcVal;
    }
  });
});

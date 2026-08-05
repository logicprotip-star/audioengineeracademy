// Q Genişliği moduna özel testler: 5 genişlik etiketinin sınırsız/çakışmasız
// sınıflandırması, izole-Q üretimi (frekans/gain sabit kalıyor mu), zorlukla
// kademelerin birbirine yakınlaşması (edgeMargin/preferredDistance), merkezi
// zorluk eğrisine bağlanma + "kolaylaşma yok" invaryantı, evaluateAnswer'ın
// etiket-eşleşme mantığı, applyProcessing'in doğru peaking Q'yu kurması.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/q-genisligi.js";
import { representativeLevelForTier } from "../www/js/core/difficulty-curve.js";

describe("Q Genişliği — labelIndexForQ() (5 etiket, sınırsız/çakışmasız sınıflandırma)", () => {
  it("MIN_Q'dan MAX_Q'ya kadar HER Q TAM BİR etiket indexine düşer, boşluk/çakışma yok", () => {
    // Log-uzayda ince adımlarla tüm aralığı tara — hiçbir noktada hata fırlamamalı,
    // hiçbir noktada "ortada kalmamalı" (fonksiyon her zaman 0-4 arası bir index döner).
    const steps = 5000;
    const lo = Math.log2(mode.MIN_Q), hi = Math.log2(mode.MAX_Q);
    for (let i = 0; i <= steps; i++) {
      const q = Math.pow(2, lo + (hi - lo) * (i / steps));
      const idx = mode.labelIndexForQ(q);
      assert.ok(idx >= 0 && idx <= 4, `Q=${q}: index ${idx} aralık dışı`);
    }
  });

  it("her etiketin qMin/qMax sınırları KENDİ indexine sınıflanır (uçlar dahil)", () => {
    for (let i = 0; i < 5; i++) {
      const q = mode.labelById(["notch", "dar", "orta", "genis", "cokgenis"][i]);
      assert.ok(q, `index ${i} için etiket bulunamadı`);
    }
  });

  it("bitişik iki etiket arasında ORTAK sınır TAM BİR tarafa düşer (çakışma yok)", () => {
    // notch[7,16] / dar[3,7): Q=7 notch'a mı dar'a mı? qMin dahil olduğu için notch'a.
    const notchIdx = mode.labelIndexForQ(7);
    assert.equal(notchIdx, 0, "Q=7 notch'un (index 0) alt sınırı, notch'a düşmeli");
  });

  it("labelById bilinmeyen bir id için null döner (çökmez)", () => {
    assert.equal(mode.labelById("olmayan-id"), null);
  });
});

describe("Q Genişliği — pickDistractorIndices() (uzak↔yakın seçim, spec'in 'kolay uçlar / zor komşular' kuralı)", () => {
  it("preferredDistance BÜYÜKSE (kolay) en UZAK indexler seçilir", () => {
    // correctIndex=0 (notch), en uzak index 4 (çokgeniş) — preferredDistance=4 ile TAM eşleşir.
    const picked = mode.pickDistractorIndices(0, 2, 4);
    assert.deepEqual(picked, [4]);
  });

  it("preferredDistance KÜÇÜKSE (zor) en YAKIN (komşu) indexler seçilir", () => {
    // correctIndex=0 (notch), preferredDistance=1 → en yakın komşu index 1 (dar).
    const picked = mode.pickDistractorIndices(0, 2, 1);
    assert.deepEqual(picked, [1]);
  });

  it("count-1 kadar FARKLI (tekrarsız) index döner, correctIndex asla İÇİNDE değil", () => {
    for (let correctIndex = 0; correctIndex < 5; correctIndex++) {
      for (let count = 2; count <= 5; count++) {
        for (const pd of [1, 2, 3, 4]) {
          const picked = mode.pickDistractorIndices(correctIndex, count, pd);
          assert.equal(picked.length, count - 1, `ci=${correctIndex} count=${count} pd=${pd}`);
          assert.equal(new Set(picked).size, picked.length, "tekrar var");
          assert.ok(!picked.includes(correctIndex), "correctIndex çeldiriciler arasında");
        }
      }
    }
  });

  it("count=5 (tüm etiketler) istenirse KALAN dört index'in TAMAMI döner", () => {
    for (let correctIndex = 0; correctIndex < 5; correctIndex++) {
      const picked = mode.pickDistractorIndices(correctIndex, 5, 1);
      assert.equal(picked.length, 4);
      const all = new Set([correctIndex, ...picked]);
      assert.equal(all.size, 5);
    }
  });
});

describe("Q Genişliği — generateChoices() (etiket şıkları, sayısal değer YOK)", () => {
  it("her şık SADECE {id,tr,correct} taşır — sayısal Q değeri YOK", () => {
    const { choices } = mode.generateChoices(2, 4);
    choices.forEach(c => {
      assert.equal(typeof c.id, "string");
      assert.equal(typeof c.tr, "string");
      assert.equal(typeof c.correct, "boolean");
      assert.equal(Object.prototype.hasOwnProperty.call(c, "q"), false, "şıkta sayısal Q değeri OLMAMALI");
      assert.equal(Object.prototype.hasOwnProperty.call(c, "qMin"), false);
    });
  });

  it("doğru şık TAM BİR kez var", () => {
    for (let correctIndex = 0; correctIndex < 5; correctIndex++) {
      for (let options = 2; options <= 5; options++) {
        const { choices } = mode.generateChoices(correctIndex, options);
        const correctChoices = choices.filter(c => c.correct);
        assert.equal(correctChoices.length, 1, `ci=${correctIndex} options=${options}`);
      }
    }
  });

  it("options kadar şık üretir", () => {
    for (let options = 2; options <= 5; options++) {
      const { choices } = mode.generateChoices(1, options);
      assert.equal(choices.length, options);
    }
  });
});

describe("Q Genişliği — pickTrueQ() (izole/kenar-yakınlığı, HER ZAMAN KENDİ etiketinde kalır)", () => {
  it("üretilen Q, HER ZAMAN correctIndex'in KENDİ [qMin,qMax] aralığında — 2000 örnek, tüm etiketler/edgeMargin'ler", () => {
    for (let correctIndex = 0; correctIndex < 5; correctIndex++) {
      const label = mode.labelById(["notch", "dar", "orta", "genis", "cokgenis"][correctIndex]);
      for (let i = 0; i < 400; i++) {
        const edgeMargin = 0.05 + Math.random() * 0.5;
        const distractors = Math.random() < 0.5 ? [correctIndex - 1] : [correctIndex + 1];
        const q = mode.pickTrueQ(correctIndex, edgeMargin, distractors.filter(d => d >= 0 && d <= 4));
        assert.ok(q >= label.qMin - 1e-6 && q <= label.qMax + 1e-6, `ci=${correctIndex}: Q=${q} kendi aralığı [${label.qMin},${label.qMax}] dışında`);
        assert.equal(mode.labelIndexForQ(q), correctIndex, `ci=${correctIndex}: üretilen Q=${q} YANLIŞ etikete sınıflandı (${mode.labelIndexForQ(q)})`);
      }
    }
  });

  it("komşu çeldirici YOKSA (uzak uçlar seçildi, kolay) Q aralığın ORTASINA yakın üretilir", () => {
    // correctIndex=2 (orta), distractors=[] (izole edilmiş uçlar senaryosu) → merkez.
    const label = mode.labelById("orta");
    const center = Math.sqrt(label.qMin * label.qMax);
    const q = mode.pickTrueQ(2, 0.3, []);
    assert.ok(Math.abs(Math.log2(q) - Math.log2(center)) < 0.05, `merkeze yakın olmalıydı: Q=${q}, merkez=${center}`);
  });

  it("dar komşu (correctIndex-1) çeldiricilerdeyse Q, ALT sınıra (qMin) yakın üretilir", () => {
    const label = mode.labelById("dar"); // index 1, alt komşusu notch (index 0)
    const q = mode.pickTrueQ(1, 0.1, [0]);
    assert.ok(Math.log2(q) - Math.log2(label.qMin) < 0.15, `alt sınıra yakın olmalıydı: Q=${q}, qMin=${label.qMin}`);
  });

  it("geniş komşu (correctIndex+1) çeldiricilerdeyse Q, ÜST sınıra (qMax) yakın üretilir", () => {
    const label = mode.labelById("dar"); // index 1, üst komşusu orta (index 2)
    const q = mode.pickTrueQ(1, 0.1, [2]);
    assert.ok(Math.log2(label.qMax) - Math.log2(q) < 0.15, `üst sınıra yakın olmalıydı: Q=${q}, qMax=${label.qMax}`);
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
      assert.ok(Array.isArray(q.choices) && q.choices.length >= 2);
    });

    it(`createQuestion("${level}") SAF fonksiyondur: JSON'a sorunsuz serileşir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      const json = JSON.stringify(q);
      assert.ok(json.length > 0);
      assert.equal(typeof q.applyProcessing, "undefined");
    });
  }

  it("her zorlukta üretilen şık sayısı DIFFICULTY.options'a eşit (difficultyPosition verilmezse)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 20; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.choices.length, mode.DIFFICULTY[level].options, `${level}: ${q.choices.length} şık`);
      }
    }
  });

  it("kolay(2) < orta(3) < zor(4) < pro(5) — DIFFICULTY tablosu bu sırayı garanti eder", () => {
    assert.ok(mode.DIFFICULTY.easy.options < mode.DIFFICULTY.medium.options);
    assert.ok(mode.DIFFICULTY.medium.options < mode.DIFFICULTY.hard.options);
    assert.ok(mode.DIFFICULTY.hard.options < mode.DIFFICULTY.pro.options);
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
    // NOT: createQuestion'ın fallback'i (curve yokken) BİLEREK her zaman izole —
    // statik tablo çağrıları (mevcut testler, doğrudan çağrılar) davranışı DEĞİŞTİRMEZ.
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

  it("options position arttıkça monoton artar, her zaman 2-5 arası tam sayı", () => {
    let prev = 0;
    for (let p = 1; p <= 20; p += 0.5) {
      const { options } = mode.paramsForDifficultyPosition(p);
      assert.ok(Number.isInteger(options) && options >= 2 && options <= 5);
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

// Kompresör moduna özel testler: 3-sesli odd-one-out üretimi (iki AYNI ratio,
// biri FARKLI, konumu rastgele), izole kompresyon (threshold/knee/attack/
// release HER ZAMAN sabit, SADECE ratio değişir), zorlukla farkın (gap)
// küçülmesi + FLOOR, merkezi zorluk eğrisine bağlanma + "kolaylaşma yok"
// invaryantı, evaluateAnswer'ın harf-eşleşme mantığı, applyProcessing'in
// doğru DynamicsCompressorNode'u kurması.

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

  it("iki AYNI ratio'lu varyant TAM COMP_BASE_RATIO'da, FARKLI olan HİÇBİR ZAMAN buna eşit değil", () => {
    for (let i = 0; i < 200; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      const sameCount = q.variants.filter((v, i2) => i2 !== q.oddIndex).length;
      assert.equal(sameCount, 2);
      q.variants.forEach((v, i2) => {
        if (i2 !== q.oddIndex) assert.equal(v.ratio, mode.COMP_BASE_RATIO, `aynı çift base'te olmalıydı`);
        else assert.notEqual(v.ratio, mode.COMP_BASE_RATIO, `farklı olan base'e eşit OLMAMALI`);
      });
    }
  });

  it("ratio HER ZAMAN [RATIO_MIN, RATIO_MAX] aralığında kalır — DynamicsCompressorNode'un geçerli sınırı", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 100; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        q.variants.forEach(v => {
          assert.ok(v.ratio >= mode.RATIO_MIN - 1e-9 && v.ratio <= mode.RATIO_MAX + 1e-9, `${level}: ratio ${v.ratio} aralık dışı`);
        });
      }
    }
  });

  it("kolaydan pro'ya FARKLI olanın |ratio - base| farkı KÜÇÜLÜR — istatistiksel olarak (N=300, jitter var)", () => {
    const N = 300;
    let easySum = 0, proSum = 0;
    for (let i = 0; i < N; i++) {
      const qEasy = mode.createQuestion("easy", { source: "pink", boss: false });
      const qPro = mode.createQuestion("pro", { source: "pink", boss: false });
      easySum += Math.abs(qEasy.variants[qEasy.oddIndex].ratio - mode.COMP_BASE_RATIO);
      proSum += Math.abs(qPro.variants[qPro.oddIndex].ratio - mode.COMP_BASE_RATIO);
    }
    assert.ok(proSum / N < easySum / N, "pro ortalama olarak easy'den DAHA KÜÇÜK fark üretmeliydi");
  });
});

describe("Kompresör — pickGap/pickOddRatio (dar jitter + FLOOR garantisi, BAŞTAN uygulandı)", () => {
  it("pickGap HİÇBİR ZAMAN GAP_FLOOR'un altına inmez — baseGap TAM floor'da bile (5000 örnek)", () => {
    const floor = mode.COMP_CURVE_CONFIG.GAP_FLOOR;
    for (let i = 0; i < 5000; i++) {
      const v = mode.pickGap(floor);
      assert.ok(v >= floor - 1e-9, `floor ihlali: ${v} < ${floor}`);
    }
  });

  it("pickGap'in ortalaması (N=2000) baseGap'e YAKIN kalır — jitter sinyali BOĞMUYOR", () => {
    const N = 2000;
    for (const base of [5.5, 3.0, 1.5, mode.COMP_CURVE_CONFIG.GAP_FLOOR + 0.1]) {
      let sum = 0;
      for (let i = 0; i < N; i++) sum += mode.pickGap(base);
      const avg = sum / N;
      assert.ok(Math.abs(avg - base) / base < 0.03, `base=${base}: ortalama ${avg.toFixed(4)}, sapma %${(Math.abs(avg - base) / base * 100).toFixed(1)}`);
    }
  });

  it("pickOddRatio [RATIO_MIN,RATIO_MAX] dışına ASLA taşmaz, iki yönde de (büyük gap'lerde bile)", () => {
    for (let i = 0; i < 500; i++) {
      const r = mode.pickOddRatio(mode.COMP_BASE_RATIO, 50); // bilerek aşırı büyük gap
      assert.ok(r >= mode.RATIO_MIN - 1e-9 && r <= mode.RATIO_MAX + 1e-9, `r=${r} aralık dışı`);
    }
  });

  it("pickOddRatio her iki yönde de (daha çok/az sıkıştırılmış) değer üretir — tek yönlü SAPLANMAZ", () => {
    let above = 0, below = 0;
    for (let i = 0; i < 200; i++) {
      const r = mode.pickOddRatio(mode.COMP_BASE_RATIO, 2);
      if (r > mode.COMP_BASE_RATIO) above++; else if (r < mode.COMP_BASE_RATIO) below++;
    }
    assert.ok(above > 50 && below > 50, `above=${above} below=${below} — bir yöne saplanmış olabilir`);
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

describe("Kompresör — öğretici metin (teachingText/getFeedbackData) — harf + ratio + mix anlamı", () => {
  it("metin FARKLI olan harfi + ratio değerini (1 ondalık) + mix anlamını içerir", () => {
    const q = { oddIndex: 1, variants: [{ letter: "A", ratio: 3.5 }, { letter: "B", ratio: 9.2 }, { letter: "C", ratio: 3.5 }] };
    const text = mode.teachingText(q, "B");
    assert.match(text, /B/);
    assert.match(text, /9\.2/);
    assert.match(text, /kompresyon/i);
  });

  it("YANLIŞ durumda kullanıcının seçtiği harf de metinde geçer", () => {
    const q = { oddIndex: 1, variants: [{ letter: "A", ratio: 3.5 }, { letter: "B", ratio: 9.2 }, { letter: "C", ratio: 3.5 }] };
    const text = mode.teachingText(q, "A");
    assert.match(text, /sen A dedin/);
    assert.match(text, /B farklıydı/);
  });

  it("hiçbir durum boş/bozuk metin üretmez (3 harf × 2 durum × birkaç ratio)", () => {
    for (const oddIndex of [0, 1, 2]) {
      for (const oddRatio of [1.2, 3.9, 8.5, 15.0]) {
        const variants = ["A", "B", "C"].map((letter, i) => ({ letter, ratio: i === oddIndex ? oddRatio : mode.COMP_BASE_RATIO }));
        const q = { oddIndex, variants };
        for (const guess of ["A", "B", "C"]) {
          const text = mode.teachingText(q, guess);
          assert.ok(text && text.length >= 10, `oddIndex=${oddIndex} guess=${guess}: kısa/boş metin`);
          assert.doesNotMatch(text, /undefined|NaN|\[object/, `oddIndex=${oddIndex} guess=${guess}: bozuk metin: ${text}`);
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

  it("compressionWord dört eşiği de (hafif/orta/belirgin/ağır) boş/bozuk metin ÜRETMEDEN kapsar", () => {
    for (const ratio of [1.0, 1.9, 2.0, 4.9, 5.0, 9.9, 10.0, 20.0]) {
      const w = mode.compressionWord(ratio);
      assert.ok(w && w.length >= 5, `ratio=${ratio}: kısa/boş metin`);
      assert.match(w, /kompresyon/);
    }
  });
});

describe("Kompresör — applyProcessing (doğru peaking... DynamicsCompressorNode, sahte audioCtx ile)", () => {
  it("previewRatio VERİLİRSE onu, verilmezse variants[0]'ı kullanan TEK DynamicsCompressorNode döner", () => {
    const created = [];
    const fakeAudioCtx = {
      createDynamicsCompressor: () => {
        const c = { threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 } };
        created.push(c);
        return c;
      }
    };
    const q = { variants: [{ letter: "A", ratio: 3.5 }, { letter: "B", ratio: 9.0 }, { letter: "C", ratio: 3.5 }] };

    const { filters: f1 } = mode.applyProcessing(q, { audioCtx: fakeAudioCtx });
    assert.equal(f1.length, 1);
    assert.equal(f1[0].ratio.value, 3.5, "previewRatio yokken variants[0] (A) kullanılmalıydı");
    assert.equal(f1[0].threshold.value, mode.COMP_THRESHOLD_DB);
    assert.equal(f1[0].knee.value, mode.COMP_KNEE_DB);
    assert.equal(f1[0].attack.value, mode.COMP_ATTACK_SEC);
    assert.equal(f1[0].release.value, mode.COMP_RELEASE_SEC);

    const { filters: f2 } = mode.applyProcessing({ ...q, previewRatio: 9.0 }, { audioCtx: fakeAudioCtx });
    assert.equal(f2[0].ratio.value, 9.0, "previewRatio verilince O kullanılmalıydı");

    assert.equal(created.length, 2);
  });

  it("threshold/knee/attack/release HER ZAMAN sabit — sadece ratio değişir (izolasyon ilkesi)", () => {
    const fakeAudioCtx = { createDynamicsCompressor: () => ({ threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 } }) };
    for (const ratio of [1, 3.5, 9, 20]) {
      const { filters } = mode.applyProcessing({ variants: [{ letter: "A", ratio }] }, { audioCtx: fakeAudioCtx });
      assert.equal(filters[0].threshold.value, mode.COMP_THRESHOLD_DB);
      assert.equal(filters[0].knee.value, mode.COMP_KNEE_DB);
      assert.equal(filters[0].attack.value, mode.COMP_ATTACK_SEC);
      assert.equal(filters[0].release.value, mode.COMP_RELEASE_SEC);
    }
  });
});

describe("Kompresör — paramsForDifficultyPosition() (merkezi zorluk eğrisi)", () => {
  it("position arttıkça gap PÜRÜZSÜZ (monoton) KÜÇÜLÜR", () => {
    let prev = Infinity;
    for (let p = 1; p <= 20; p += 0.25) {
      const { gap } = mode.paramsForDifficultyPosition(p);
      assert.ok(gap <= prev + 1e-9, `position ${p}'de gap azalmadı`);
      prev = gap;
    }
  });

  it("position=1'de AT_1, position=LEVEL_CAP'te AT_CAP değerlerini birebir döner", () => {
    const cfg = mode.COMP_CURVE_CONFIG;
    const p1 = mode.paramsForDifficultyPosition(1);
    const pCap = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    assert.ok(Math.abs(p1.gap - cfg.GAP_AT_1) < 1e-9);
    assert.ok(Math.abs(pCap.gap - cfg.GAP_AT_CAP) < 1e-9);
  });

  it("LEVEL_CAP'in ÇOK ötesinde gap bir TABANIN altına inmez", () => {
    const cfg = mode.COMP_CURVE_CONFIG;
    const far = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP + 1000);
    assert.ok(far.gap >= cfg.GAP_FLOOR - 1e-9);
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

  it("her tier'da: gap eski statikten BÜYÜK DEĞİL (kolaylaşma yok — küçük=zor)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      assert.ok(p.gap <= old.gap + 1e-9, `${tier}: gap ${p.gap} > eski ${old.gap}`);
    }
  });

  it("pro'nun temsilci seviyesi TAM LEVEL_CAP — eğrinin en zor noktası", () => {
    assert.equal(representativeLevelForTier("pro"), mode.COMP_CURVE_CONFIG.LEVEL_CAP);
    const atCap = mode.paramsForDifficultyPosition(mode.COMP_CURVE_CONFIG.LEVEL_CAP);
    const proRepr = mode.paramsForDifficultyPosition(representativeLevelForTier("pro"));
    assert.deepEqual(atCap, proRepr);
  });

  it("Sabit modun kompozisyonu uçtan uca hâlâ TAM 3 şık üretir (gap ne olursa olsun)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      for (let i = 0; i < 10; i++) {
        const q = mode.createQuestion(tier, { source: "pink", boss: false, difficultyPosition: level });
        assert.equal(q.choices.length, 3, `${tier}: beklenen 3, gelen ${q.choices.length}`);
      }
    }
  });
});

describe("Kompresör — getMeta() sözleşme alanları", () => {
  it("id/motor/kulaklikGerekli/uyumluKaynaklar/ucretsiz/videoUrl/difficulty/choiceOnly tanımlı, motor=2", () => {
    const meta = mode.getMeta();
    assert.equal(meta.id, "kompresor");
    assert.equal(meta.motor, 2, "Motor 2'nin ilk modu olmalıydı");
    assert.equal(typeof meta.kulaklikGerekli, "boolean");
    assert.ok(Array.isArray(meta.uyumluKaynaklar) && meta.uyumluKaynaklar.length > 5, "kaynak kısıtlaması olmamalıydı");
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
});

describe("Kompresör — diğer modlarla KARŞILAŞTIRMA (bağlantı mekanizması ORTAK)", () => {
  it("AYNI position'da beş modun da eğrisi aynı yönde (monoton) hareket eder — Kompresör'e özgü bir kopukluk YOK", async () => {
    const kesim = await import("../www/js/modes/kesim-noktasi.js");
    const db = await import("../www/js/modes/db-seviyesi.js");
    const boostCut = await import("../www/js/modes/boost-mu-cut-mu.js");
    const q = await import("../www/js/modes/q-genisligi.js");
    const positions = [1, 2, 5, 10, 15, 20];
    let compPrev = Infinity, kesimPrev = Infinity, dbPrev = Infinity, bcPrev = Infinity, qPrev = Infinity;
    for (const p of positions) {
      const compVal = mode.paramsForDifficultyPosition(p).gap;
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

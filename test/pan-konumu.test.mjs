// Pan Konumu moduna özel testler (G120 — sürekli ölçek + curve-driven şık
// mesafesi, dB Seviyesi'nin AYNI deseni): createQuestion/evaluateAnswer
// saflığı, merkezi zorluk eğrisine bağlanma, applyProcessing'in
// StereoPannerNode kurması, 1000 denemelik "hiçbir kademede iki şık
// çakışmıyor + yanlış şık asla tolerans içine düşmüyor" invaryantı
// (Tonal Denge'nin G95 kaybedilemezlik hatasına benzer bir riskin BURADA
// olmadığını kanıtlar).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/pan-konumu.js";

describe("Pan Konumu — generateChoiceValues() (SAF çeldirici üretimi)", () => {
  it("trueValue etrafında count-1 çeldirici, TAM k·step mesafede üretir", () => {
    const values = mode.generateChoiceValues(10, 20, 5, -100, 100);
    assert.equal(values.length, 5);
    assert.equal(values[0], 10); // true değer her zaman ilk eleman
    const gaps = values.slice(1).map(v => Math.abs(v - 10));
    gaps.forEach(g => assert.ok(g % 20 === 0 || Math.abs(g % 20) < 1e-9, `${g} 20'nin katı değil`));
  });

  it("hiçbir çeldirici [min,max] sınırının dışına ÇIKMAZ — kenara yakın true değerlerde bile", () => {
    for (const trueValue of [-100, -95, -50, 0, 50, 95, 100]) {
      const values = mode.generateChoiceValues(trueValue, 15, 7, -100, 100);
      values.forEach(v => assert.ok(v >= -100 && v <= 100, `${v}, trueValue=${trueValue} sınır dışı`));
    }
  });

  it("bir yön sınıra dolarsa fazla adım DİĞER yöne devredilir — count-1 çeldirici HER ZAMAN üretilir (yeterli alan varsa)", () => {
    const values = mode.generateChoiceValues(95, 15, 7, -100, 100); // sağda çok az yer var
    assert.equal(values.length, 7, "sınıra yakın true değerde bile 7 şık üretilmeliydi");
    assert.equal(new Set(values).size, 7, "üretilen 7 değerin hepsi FARKLI olmalıydı");
  });

  it("500 rastgele (trueValue, step, count) kombinasyonunda üretilen değerlerin HEPSİ birbirinden FARKLI", () => {
    for (let i = 0; i < 500; i++) {
      const trueValue = Math.round(Math.random() * 200 - 100);
      const step = 6 + Math.random() * 40;
      const count = 3 + Math.floor(Math.random() * 5);
      const values = mode.generateChoiceValues(trueValue, step, count, -100, 100);
      assert.equal(new Set(values).size, values.length, `trueValue=${trueValue} step=${step.toFixed(1)} count=${count}: çakışan değer, values=${values}`);
    }
  });
});

describe("Pan Konumu — paramsForDifficultyPosition() (merkezi zorluk eğrisi)", () => {
  it("Z1'de en geniş şık mesafesi (STEP_AT_1), LEVEL_CAP'te en dar (STEP_AT_CAP)", () => {
    const cfg = mode.PAN_CURVE_CONFIG;
    const z1 = mode.paramsForDifficultyPosition(1);
    const zCap = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    assert.ok(Math.abs(z1.step - cfg.STEP_AT_1) < 1e-9);
    assert.ok(Math.abs(zCap.step - cfg.STEP_AT_CAP) < 1e-9);
  });

  it("Z1→Z20 tablosu: şık mesafesi (step) MONOTON küçülür (kolayda uzak, zorda yakın)", () => {
    let prev = Infinity;
    const rows = [];
    for (let p = 1; p <= 20; p++) {
      const { step, options } = mode.paramsForDifficultyPosition(p);
      rows.push([p, step.toFixed(1), options]);
      assert.ok(step <= prev + 1e-9, `Z${p}: step ${step} öncekinden büyüdü`);
      prev = step;
    }
    console.log("Pan Konumu Z1-Z20 tablosu (step %, şık sayısı):", rows.map(([p, s, o]) => `Z${p}=${s}%/${o}şık`).join(" "));
    assert.ok(Number(rows[0][1]) > Number(rows[19][1]));
  });

  it("şık mesafesi (step) HİÇBİR Z seviyesinde PAN_TOLERANCE'a eşit ya da altına İNMEZ (STEP_FLOOR invaryantı)", () => {
    for (let p = 1; p <= 20; p++) {
      const { step } = mode.paramsForDifficultyPosition(p);
      assert.ok(step > mode.PAN_TOLERANCE, `Z${p}: step ${step} <= tolerans ${mode.PAN_TOLERANCE}`);
    }
    assert.ok(mode.PAN_CURVE_CONFIG.STEP_FLOOR > mode.PAN_TOLERANCE);
  });

  it("LEVEL_CAP'in ÇOK ötesinde step bir TABANIN altına inmez", () => {
    const cfg = mode.PAN_CURVE_CONFIG;
    const far = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP + 1000);
    assert.ok(far.step >= cfg.STEP_FLOOR - 1e-9);
  });

  it("position<1 ya da ondalık için düşmez, güvenli bir değere kırpar", () => {
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(0));
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(-5));
    assert.equal(mode.paramsForDifficultyPosition(0).position, 1);
  });
});

describe("Pan Konumu — createQuestion() genel sözleşme", () => {
  for (const level of Object.keys(mode.DIFFICULTY)) {
    it(`createQuestion("${level}") geçerli bir soru üretir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      assert.equal(q.mode, "pan");
      assert.equal(q.difficulty, level);
      assert.equal(typeof q.panPercent, "number");
      assert.ok(q.panPercent >= -100 && q.panPercent <= 100);
      assert.equal(q.hintUsed, false);
      assert.ok(Array.isArray(q.choices) && q.choices.length >= 3);
    });

    it(`createQuestion("${level}") SAF fonksiyondur: JSON'a sorunsuz serileşir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      assert.ok(JSON.stringify(q).length > 0);
    });
  }

  it("her turda doğru şık TAM BİR kez var, değeri q.panPercent'e eşit", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 40; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        const correctChoices = q.choices.filter(c => c.correct);
        assert.equal(correctChoices.length, 1, `${level}: ${correctChoices.length} doğru şık`);
        assert.equal(correctChoices[0].value, q.panPercent);
      }
    }
  });

  it("true değer HER ZAMAN yuvarlak bir ızgara noktası OLMAK ZORUNDA DEĞİL — herhangi bir -100..100 tam sayısı üretilebilir (500 örnekte en az bir 'yuvarlak olmayan' değer)", () => {
    // "yuvarlak olmayan" = 25'in katı olmayan bir değer (eski ızgara -100/-50/0/50/100'ün DIŞINDA)
    let sawNonGrid = false;
    for (let i = 0; i < 500; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      if (q.panPercent % 25 !== 0) { sawNonGrid = true; break; }
    }
    assert.ok(sawNonGrid, "500 örnekte HİÇ ızgara-dışı değer çıkmadı — sürekli ölçek çalışmıyor olabilir");
  });

  it("difficultyPosition VERİLİRSE üretilen şık sayısı paramsForDifficultyPosition().options'a eşit", () => {
    for (const p of [1, 5, 10, 15, 20]) {
      const expected = mode.paramsForDifficultyPosition(p).options;
      const q = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: p });
      assert.equal(q.choices.length, expected, `position ${p}: beklenen ${expected}, gelen ${q.choices.length}`);
    }
  });

  it("proplus'ta difficultyPosition verilse BİLE eğri devreye girmez", () => {
    for (let i = 0; i < 10; i++) {
      const q = mode.createQuestion("proplus", { source: "pink", boss: false, difficultyPosition: 20 });
      assert.equal(q.choices.length, mode.DIFFICULTY.proplus.options);
    }
  });
});

// task'ın kendi doğrulama kriteri: "hiçbir kademede iki şık aynı değere denk
// gelmesin, en dar kademede bile şıklar arası fark algılanabilir sınırın
// üstünde kalsın" — Tonal Denge'nin (G95) sabit-tolerans/küçülen-sinyal
// kaybedilemezlik hatasının BENZERİ oluşmasın (bkz. dB Seviyesi'nin G97
// AYNI deseni).
describe("Pan Konumu — 1000 denemelik: hiçbir kademede iki şık çakışmıyor", () => {
  it("1000 rastgele soruda (position 1-20 arası) ŞIKLARIN KENDİ ARALARINDA hiçbir çift ÇAKIŞMAZ", () => {
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const position = 1 + Math.random() * 19;
      const q = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: position });
      const vals = q.choices.map(c => c.value);
      assert.equal(new Set(vals).size, vals.length, `position ${position.toFixed(2)}: çakışan şık değeri, values=${vals}`);
    }
  });

  it("1000 rastgele soruda TAM BİR doğru şık var, hiçbir yanlış şık PAN_TOLERANCE içine düşmez (en dar kademede bile fark algılanabilir sınırın üstünde)", () => {
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const position = 1 + Math.random() * 19;
      const q = mode.createQuestion("medium", { source: "pink", boss: Math.random() < 0.2, difficultyPosition: position });
      const correct = q.choices.filter(c => c.correct);
      assert.equal(correct.length, 1, `position ${position.toFixed(2)}: ${correct.length} doğru şık`);
      const wrong = q.choices.filter(c => !c.correct);
      wrong.forEach(c => {
        const gap = Math.abs(c.value - q.panPercent);
        assert.ok(gap > mode.PAN_TOLERANCE, `position ${position.toFixed(2)}: yanlış şık ${c.value} doğruya (${q.panPercent}) çok yakın (${gap})`);
      });
    }
  });

  it("1000 rastgele soruda şıkların İKİLİ karşılaştırmasında da hiçbir çift PAN_TOLERANCE içine düşmez", () => {
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const position = 1 + Math.random() * 19;
      const q = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: position });
      for (let a = 0; a < q.choices.length; a++) {
        for (let b = a + 1; b < q.choices.length; b++) {
          const gap = Math.abs(q.choices[a].value - q.choices[b].value);
          assert.ok(gap > mode.PAN_TOLERANCE, `position ${position.toFixed(2)}: şık ${q.choices[a].value} ile ${q.choices[b].value} arası ${gap} <= tolerans`);
        }
      }
    }
  });
});

describe("Pan Konumu — evaluateAnswer", () => {
  it("tam isabet: correct=true", () => {
    const r = mode.evaluateAnswer({ panPercent: 50 }, 50);
    assert.equal(r.correct, true);
    assert.equal(r.diff, 0);
  });
  it("PAN_TOLERANCE dışı: correct=false", () => {
    const r = mode.evaluateAnswer({ panPercent: 0 }, 33);
    assert.equal(r.correct, false);
  });
  it("PAN_TOLERANCE sınırı: içeride doğru, dışarıda yanlış", () => {
    const q = { panPercent: 10 };
    const justInside = mode.evaluateAnswer(q, 10 + mode.PAN_TOLERANCE * 0.99);
    const justOutside = mode.evaluateAnswer(q, 10 + mode.PAN_TOLERANCE * 1.5);
    assert.equal(justInside.correct, true);
    assert.equal(justOutside.correct, false);
  });
  it("cevap {value} nesnesi olarak da gelebilir", () => {
    const r = mode.evaluateAnswer({ panPercent: -100 }, { value: -100 });
    assert.equal(r.correct, true);
  });
});

describe("Pan Konumu — calculateXP sağlamlık", () => {
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
    const without = mode.calculateXP({ boss: false }, { correct: true }, false, "medium", { combo: 0, timeLeft: 0, roundDuration: 10 });
    const withHint = mode.calculateXP({ boss: false }, { correct: true }, true, "medium", { combo: 0, timeLeft: 0, roundDuration: 10 });
    assert.ok(withHint < without);
  });
});

describe("Pan Konumu — teachingText/getFeedbackData", () => {
  it("hiçbir durum boş/bozuk metin üretmez", () => {
    const q = { panPercent: -67 };
    for (const guess of [-67, 0, 100, -100]) {
      const text = mode.teachingText(q, guess);
      assert.ok(text && text.length >= 10, `guess=${guess}: kısa/boş metin`);
      assert.doesNotMatch(text, /undefined|NaN|\[object/i, `guess=${guess}: bozuk metin: ${text}`);
    }
  });
  it("mix gerçeği notu (kick/bas/vokal/snare merkez) HER metinde geçer", () => {
    const q = { panPercent: 33 };
    const text = mode.teachingText(q, -33);
    assert.match(text, /merkez/i);
  });
  it("getFeedbackData showResult HER ZAMAN true, panel null", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    const correctFb = mode.getFeedbackData(q, q.panPercent, { gained: 10 });
    const wrongFb = mode.getFeedbackData(q, q.panPercent === 100 ? -100 : 100, { gained: 0 });
    assert.equal(correctFb.showResult, true);
    assert.equal(wrongFb.showResult, true);
    assert.equal(correctFb.panel, null);
  });
});

describe("Pan Konumu — applyProcessing (StereoPannerNode, sahte audioCtx ile)", () => {
  it("panPercent'i -1..1 aralığına çevirip TEK StereoPannerNode döner (düz filters dizisi — decorrelation riski yok, branch GEREKMİYOR)", () => {
    const created = [];
    const fakeAudioCtx = {
      createStereoPanner: () => {
        const p = { pan: { value: 0 } };
        created.push(p);
        return p;
      }
    };
    for (const panPercent of [-100, -50, 0, 50, 100]) {
      const result = mode.applyProcessing({ panPercent }, { audioCtx: fakeAudioCtx });
      assert.equal(result.filters.length, 1);
      assert.ok(!result.branch, "Pan Konumu branch mekanizmasını KULLANMAMALI (tek kaynak, fan-out gerekmiyor)");
      assert.ok(Math.abs(result.filters[0].pan.value - panPercent / 100) < 1e-9);
    }
    assert.equal(created.length, 5);
  });
});

describe("Pan Konumu — getMeta() sözleşme alanları", () => {
  it("id/motor/kulaklikGerekli/uyumluKaynaklar/ucretsiz/videoUrl/difficulty/choiceOnly tanımlı", () => {
    const meta = mode.getMeta();
    assert.equal(meta.id, "pan-konumu");
    assert.ok(Number.isInteger(meta.motor));
    assert.equal(meta.kulaklikGerekli, true, "Pan Konumu kulaklık gerektirmeli");
    assert.equal(typeof meta.kulaklikMetni, "string");
    assert.ok(meta.kulaklikMetni.length > 10);
    assert.ok(Array.isArray(meta.uyumluKaynaklar) && meta.uyumluKaynaklar.length > 0);
    assert.ok(!meta.uyumluKaynaklar.includes("kick"), "tek vuruşluk kick DIŞLANMALIYDI");
    assert.ok(!meta.uyumluKaynaklar.includes("snare"), "tek vuruşluk snare DIŞLANMALIYDI");
    assert.ok(!meta.uyumluKaynaklar.includes("hihat"), "tek vuruşluk hihat DIŞLANMALIYDI");
    assert.ok(!meta.uyumluKaynaklar.includes("tom"), "tek vuruşluk tom DIŞLANMALIYDI");
    assert.ok(meta.uyumluKaynaklar.includes("upload"), "kullanıcı kendi dosyasını yükleyebilmeli");
    // G270 — clean_guitar (G259'da eklenmişti, bu listeye HİÇ girmemiş — eksik
    // liste girdisi düzeltildi) ve arpeggio_guitar (YENİ kaynak) eklendi —
    // İKİSİ de "guitar" (acoustic_guitar, zaten listede) ile AYNI gerekçeyi
    // (sürekli/uzayan enstrüman sesi, tek-vuruş DEĞİL) karşılıyor.
    assert.ok(meta.uyumluKaynaklar.includes("clean_guitar"), "clean_guitar eklenmeliydi (G270)");
    assert.ok(meta.uyumluKaynaklar.includes("arpeggio_guitar"), "arpeggio_guitar eklenmeliydi (G270)");
    assert.equal(meta.choiceOnly, true);
    for (const level of Object.keys(meta.difficulty)) {
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

describe("Pan Konumu — frekans-bulma.js zorunlu re-export sözleşmesi", () => {
  it("FA_ZONES/isBossRound/recordZone/faXToF app.js'in koşulsuz okuduğu şekilde mevcut", () => {
    assert.ok(Array.isArray(mode.FA_ZONES) && mode.FA_ZONES.length > 0);
    assert.equal(typeof mode.isBossRound, "function");
    assert.equal(typeof mode.recordZone, "function");
    assert.equal(typeof mode.faXToF, "function");
    assert.equal(typeof mode.faFToX, "function");
  });
});

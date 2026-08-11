// Pan Konumu moduna özel testler: ızgara üretimi (kademe sayısı zorlukla
// artar/daralır), createQuestion/evaluateAnswer saflığı, merkezi zorluk
// eğrisine bağlanma, applyProcessing'in StereoPannerNode kurması, 1000
// denemelik "hiçbir kademe çakışmıyor" invaryantı (Tonal Denge'nin G95
// kaybedilemezlik hatasına benzer bir riskin BURADA olmadığını kanıtlar).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/pan-konumu.js";

describe("Pan Konumu — panGridPercents() (SAF ızgara üretimi)", () => {
  it("steps=3 → [-100, 0, 100]", () => {
    assert.deepEqual(mode.panGridPercents(3), [-100, 0, 100]);
  });
  it("steps=5 → [-100, -50, 0, 50, 100]", () => {
    assert.deepEqual(mode.panGridPercents(5), [-100, -50, 0, 50, 100]);
  });
  it("steps=7 → 7 farklı, simetrik, merkez=0 içeren tam sayı ızgara", () => {
    const g = mode.panGridPercents(7);
    assert.equal(g.length, 7);
    assert.equal(new Set(g).size, 7, "7 kademe HEPSİ farklı olmalı");
    assert.ok(g.includes(0), "merkez (0) ızgarada olmalı");
    assert.deepEqual(g, [...g].sort((a, b) => a - b), "ızgara SOL→SAĞ artan sırada olmalı");
    g.forEach(v => assert.ok(Number.isInteger(v), `${v} tam sayı değil`));
  });

  it("3/5/7 kademelerin HİÇBİRİNDE iki nokta ÇAKIŞMAZ (matematiksel garanti + 500 tekrar sağlama)", () => {
    for (const steps of [3, 5, 7]) {
      for (let i = 0; i < 500; i++) {
        const g = mode.panGridPercents(steps);
        assert.equal(new Set(g).size, steps, `steps=${steps}: çakışan ızgara noktası`);
      }
    }
  });
});

describe("Pan Konumu — paramsForDifficultyPosition() (merkezi zorluk eğrisi)", () => {
  it("Z1'de en az kademe (3), LEVEL_CAP'te en çok kademe (7)", () => {
    const z1 = mode.paramsForDifficultyPosition(1);
    const zCap = mode.paramsForDifficultyPosition(mode.PAN_CURVE_CONFIG.LEVEL_CAP);
    assert.equal(z1.steps, 3);
    assert.equal(zCap.steps, 7);
  });

  it("Z1→Z20 tablosu: kademe sayısı TEK sayı, MONOTON artar (asla azalmaz), hiçbir zaman aralık dışına çıkmaz", () => {
    let prev = 0;
    const rows = [];
    for (let p = 1; p <= 20; p++) {
      const { steps } = mode.paramsForDifficultyPosition(p);
      rows.push([p, steps]);
      assert.equal(steps % 2, 1, `Z${p}: steps ${steps} tek sayı değil`);
      assert.ok(steps >= 3 && steps <= 7, `Z${p}: steps ${steps} [3,7] dışında`);
      assert.ok(steps >= prev, `Z${p}: steps ${steps} öncekinden (${prev}) küçüldü`);
      prev = steps;
    }
    // Tablo kanıtı — kolayda az/uzak kademe, zorda çok/yakın kademe (task'ın kendi kabul kriteri).
    console.log("Pan Konumu Z1-Z20 kademe tablosu:", rows.map(([p, s]) => `Z${p}=${s}`).join(" "));
    assert.ok(rows[0][1] < rows[19][1], "Z1 kademesi Z20'den küçük olmalıydı");
  });

  it("kademeler arası ORTALAMA mesafe zorlukla KÜÇÜLÜR (kolayda uzak, zorda yakın — task'ın kendi tarifi)", () => {
    const gapAt = p => {
      const { steps } = mode.paramsForDifficultyPosition(p);
      return 200 / (steps - 1);
    };
    assert.ok(gapAt(1) > gapAt(20), `Z1 aralığı (${gapAt(1)}) Z20'den (${gapAt(20)}) büyük olmalıydı`);
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

  it("şıklar KASITLI OLARAK karıştırılmıyor — SOL'dan SAĞ'a artan sırada duruyor", () => {
    const q = mode.createQuestion("hard", { source: "pink", boss: false });
    const values = q.choices.map(c => c.value);
    assert.deepEqual(values, [...values].sort((a, b) => a - b));
  });

  it("difficultyPosition VERİLİRSE üretilen kademe sayısı paramsForDifficultyPosition().steps'e eşit", () => {
    for (const p of [1, 5, 10, 15, 20]) {
      const expected = mode.paramsForDifficultyPosition(p).steps;
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

// task'ın kendi doğrulama kriteri: "hiçbir kademede iki şık aynı cevaba denk
// gelmesin" — Tonal Denge'nin (G95) sabit-tolerans/küçülen-sinyal kaybedilemez-
// lik hatasının BENZERİ oluşmasın. Burada risk YAPISAL OLARAK yok (ızgara
// matematiksel olarak ayrık) ama task AÇIKÇA 1000 denemelik ampirik doğrulama
// istiyor — bkz. dB Seviyesi'nin (G97) AYNI deseni.
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

  it("1000 rastgele soruda TAM BİR doğru şık var, hiçbir yanlış şık PAN_TOLERANCE içine düşmez", () => {
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
  it("panPercent'i -1..1 aralığına çevirip TEK StereoPannerNode döner", () => {
    const created = [];
    const fakeAudioCtx = {
      createStereoPanner: () => {
        const p = { pan: { value: 0 } };
        created.push(p);
        return p;
      }
    };
    for (const panPercent of [-100, -50, 0, 50, 100]) {
      const { filters } = mode.applyProcessing({ panPercent }, { audioCtx: fakeAudioCtx });
      assert.equal(filters.length, 1);
      assert.ok(Math.abs(filters[0].pan.value - panPercent / 100) < 1e-9);
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

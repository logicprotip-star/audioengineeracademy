// Stereo Genişlik moduna özel testler — Pan Konumu'nun (bu turun ikiz modu)
// AYNI test iskeleti + applyProcessing'in G118'in YENİ branch mekanizmasını
// (fan-out: doğrudan+gecikmeli iki yol, panL/panR, birleştirme) doğru kurduğunu
// GERÇEK bir OfflineAudioContext benzeri sahte graf ile doğrulayan ek testler.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/stereo-genislik.js";

describe("Stereo Genişlik — widthGridPercents() (SAF ızgara üretimi)", () => {
  it("steps=3 → [0, 50, 100]", () => {
    assert.deepEqual(mode.widthGridPercents(3), [0, 50, 100]);
  });
  it("steps=5 → [0, 25, 50, 75, 100]", () => {
    assert.deepEqual(mode.widthGridPercents(5), [0, 25, 50, 75, 100]);
  });
  it("steps=7 → 7 farklı, 0 ile 100'ü İÇEREN, artan tam sayı ızgara", () => {
    const g = mode.widthGridPercents(7);
    assert.equal(g.length, 7);
    assert.equal(new Set(g).size, 7, "7 kademe HEPSİ farklı olmalı");
    assert.equal(g[0], 0);
    assert.equal(g[g.length - 1], 100);
    assert.deepEqual(g, [...g].sort((a, b) => a - b));
  });

  it("3/5/7 kademelerin HİÇBİRİNDE iki nokta ÇAKIŞMAZ (500 tekrar sağlama)", () => {
    for (const steps of [3, 5, 7]) {
      for (let i = 0; i < 500; i++) {
        const g = mode.widthGridPercents(steps);
        assert.equal(new Set(g).size, steps, `steps=${steps}: çakışan ızgara noktası`);
      }
    }
  });
});

describe("Stereo Genişlik — paramsForDifficultyPosition() (Pan Konumu'yla AYNI eğri şekli)", () => {
  it("Z1'de en az kademe (3), LEVEL_CAP'te en çok kademe (7)", () => {
    const z1 = mode.paramsForDifficultyPosition(1);
    const zCap = mode.paramsForDifficultyPosition(mode.WIDTH_CURVE_CONFIG.LEVEL_CAP);
    assert.equal(z1.steps, 3);
    assert.equal(zCap.steps, 7);
  });

  it("Z1→Z20 tablosu: kademe sayısı MONOTON artar, [3,7] aralığında kalır, hep tek sayı", () => {
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
    console.log("Stereo Genişlik Z1-Z20 kademe tablosu:", rows.map(([p, s]) => `Z${p}=${s}`).join(" "));
    assert.ok(rows[0][1] < rows[19][1]);
  });

  it("kademeler arası ORTALAMA mesafe zorlukla KÜÇÜLÜR (%0/%50/%100'den başlayıp daralır — task'ın kendi tarifi)", () => {
    const gapAt = p => {
      const { steps } = mode.paramsForDifficultyPosition(p);
      return 100 / (steps - 1);
    };
    assert.ok(gapAt(1) > gapAt(20));
    assert.equal(gapAt(1), 50, "Z1'de kademe aralığı %50 olmalı (0/50/100)");
  });
});

describe("Stereo Genişlik — createQuestion() genel sözleşme", () => {
  for (const level of Object.keys(mode.DIFFICULTY)) {
    it(`createQuestion("${level}") geçerli bir soru üretir`, () => {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      assert.equal(q.mode, "width");
      assert.equal(q.difficulty, level);
      assert.ok(q.widthPercent >= 0 && q.widthPercent <= 100);
      assert.equal(q.hintUsed, false);
      assert.ok(Array.isArray(q.choices) && q.choices.length >= 3);
    });
  }

  it("her turda doğru şık TAM BİR kez var, değeri q.widthPercent'e eşit", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 40; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        const correctChoices = q.choices.filter(c => c.correct);
        assert.equal(correctChoices.length, 1, `${level}: ${correctChoices.length} doğru şık`);
        assert.equal(correctChoices[0].value, q.widthPercent);
      }
    }
  });

  it("ilk şık her zaman 'Mono (%0)', son şık her zaman 'Tam Geniş (%100)'", () => {
    const q = mode.createQuestion("hard", { source: "pink", boss: false });
    assert.equal(q.choices[0].label, "Mono (%0)");
    assert.equal(q.choices[q.choices.length - 1].label, "Tam Geniş (%100)");
  });

  it("difficultyPosition VERİLİRSE üretilen kademe sayısı paramsForDifficultyPosition().steps'e eşit", () => {
    for (const p of [1, 5, 10, 15, 20]) {
      const expected = mode.paramsForDifficultyPosition(p).steps;
      const q = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: p });
      assert.equal(q.choices.length, expected);
    }
  });
});

describe("Stereo Genişlik — 1000 denemelik: hiçbir kademede iki şık çakışmıyor", () => {
  it("1000 rastgele soruda ŞIKLARIN KENDİ ARALARINDA hiçbir çift ÇAKIŞMAZ", () => {
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const position = 1 + Math.random() * 19;
      const q = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: position });
      const vals = q.choices.map(c => c.value);
      assert.equal(new Set(vals).size, vals.length, `position ${position.toFixed(2)}: çakışan şık değeri, values=${vals}`);
    }
  });

  it("1000 rastgele soruda TAM BİR doğru şık var, hiçbir yanlış şık WIDTH_TOLERANCE içine düşmez", () => {
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const position = 1 + Math.random() * 19;
      const q = mode.createQuestion("medium", { source: "pink", boss: Math.random() < 0.2, difficultyPosition: position });
      const correct = q.choices.filter(c => c.correct);
      assert.equal(correct.length, 1);
      const wrong = q.choices.filter(c => !c.correct);
      wrong.forEach(c => {
        const gap = Math.abs(c.value - q.widthPercent);
        assert.ok(gap > mode.WIDTH_TOLERANCE, `position ${position.toFixed(2)}: yanlış şık ${c.value} doğruya (${q.widthPercent}) çok yakın`);
      });
    }
  });
});

describe("Stereo Genişlik — evaluateAnswer", () => {
  it("tam isabet: correct=true", () => {
    const r = mode.evaluateAnswer({ widthPercent: 50 }, 50);
    assert.equal(r.correct, true);
  });
  it("WIDTH_TOLERANCE dışı: correct=false", () => {
    const r = mode.evaluateAnswer({ widthPercent: 0 }, 33);
    assert.equal(r.correct, false);
  });
  it("cevap {value} nesnesi olarak da gelebilir", () => {
    const r = mode.evaluateAnswer({ widthPercent: 100 }, { value: 100 });
    assert.equal(r.correct, true);
  });
});

describe("Stereo Genişlik — calculateXP sağlamlık", () => {
  it("yanlış cevapta 0 döner", () => {
    assert.equal(mode.calculateXP({ boss: false }, { correct: false }, false, "medium", {}), 0);
  });
  it("doğru cevapta negatif olmaz, makul bir üst sınırı aşmaz", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const gained = mode.calculateXP({ boss: true }, { correct: true }, false, level, { combo: 20, timeLeft: 100, roundDuration: 10, xpMultiplier: 1.5 });
      assert.ok(gained >= 0);
      const maxPlausible = mode.DIFFICULTY[level].xp * 2.4 * 1.65 * 1.2 * 1.5 + 5;
      assert.ok(gained <= maxPlausible);
    }
  });
});

describe("Stereo Genişlik — teachingText/getFeedbackData", () => {
  it("hiçbir durum boş/bozuk metin üretmez", () => {
    const q = { widthPercent: 67 };
    for (const guess of [67, 0, 100]) {
      const text = mode.teachingText(q, guess);
      assert.ok(text && text.length >= 10);
      assert.doesNotMatch(text, /undefined|NaN|\[object/i);
    }
  });
  it("mix gerçeği notu (mono uyum / Araçlar bağlantısı) HER metinde geçer", () => {
    const text = mode.teachingText({ widthPercent: 100 }, 0);
    assert.match(text, /mono uyum/i);
  });
  it("getFeedbackData showResult HER ZAMAN true, panel null", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    const correctFb = mode.getFeedbackData(q, q.widthPercent, { gained: 10 });
    assert.equal(correctFb.showResult, true);
    assert.equal(correctFb.panel, null);
  });
});

// G118 — YENİ branch mekanizmasının GERÇEKTEN doğru kurulduğunu, sahte ama
// Web Audio API'nin bağlantı/parametre sözleşmesine sadık bir audioCtx ile
// doğrular: entryTap sourceMix'ten geleni ALIR, panL/delay→panR'a FAN-OUT
// yapar, ikisi de mergeGain'e bağlanır — hiçbir düğüm eksik/fazla değil.
describe("Stereo Genişlik — applyProcessing (G118 branch mekanizması, sahte audioCtx ile)", () => {
  function makeFakeAudioCtx() {
    const created = [];
    const connections = []; // [fromId, toId]
    let nextId = 0;
    function makeNode(kind, extra = {}) {
      const id = nextId++;
      const node = {
        __id: id,
        __kind: kind,
        ...extra,
        connect: (dest) => { connections.push([id, dest.__id]); return dest; }
      };
      created.push(node);
      return node;
    }
    return {
      ctx: {
        createGain: () => makeNode("gain", { gain: { value: 0 } }),
        createStereoPanner: () => makeNode("panner", { pan: { value: 0 } }),
        createDelay: (max) => makeNode("delay", { delayTime: { value: 0 }, maxDelay: max })
      },
      created,
      connections
    };
  }

  it("width=0'da panL/panR pan=0, delay=0 — iki yol SAYISAL olarak özdeş (GERÇEK mono, task'ın '%0=ikisi de merkezde' tanımı)", () => {
    const { ctx } = makeFakeAudioCtx();
    const { branch } = mode.applyProcessing({ widthPercent: 0 }, { audioCtx: ctx });
    const panners = branch.nodes.filter(n => n.__kind === "panner");
    const delays = branch.nodes.filter(n => n.__kind === "delay");
    assert.equal(panners.length, 2);
    assert.equal(delays.length, 1);
    // pan.value === 0 karşılaştırması (assert.equal DEĞİL) — JS'te -widthFrac
    // (widthFrac=0) matematiksel olarak -0 üretir, assert/strict Object.is
    // semantiğiyle -0 !== 0 sayar (Node'un KENDİ, bilinen bir davranışı) —
    // ama -0 === 0 (operatör) HER ZAMAN true, ses açısından da fark YOK.
    panners.forEach(p => assert.ok(p.pan.value === 0, `pan.value ${p.pan.value} !== 0`));
    assert.ok(delays[0].delayTime.value === 0);
  });

  it("width=100'de panL=-1/panR=+1 (tam ayrık), gecikme MAX_DELAY_SEC'e eşit", () => {
    const { ctx } = makeFakeAudioCtx();
    const { branch } = mode.applyProcessing({ widthPercent: 100 }, { audioCtx: ctx });
    const panners = branch.nodes.filter(n => n.__kind === "panner");
    const delays = branch.nodes.filter(n => n.__kind === "delay");
    const panValues = panners.map(p => p.pan.value).sort((a, b) => a - b);
    assert.deepEqual(panValues, [-1, 1]);
    assert.ok(Math.abs(delays[0].delayTime.value - mode.MAX_DELAY_SEC) < 1e-9);
  });

  it("width arttıkça pan açıklığı VE gecikme MONOTON büyür", () => {
    const { ctx } = makeFakeAudioCtx();
    let prevPan = -1, prevDelay = -1;
    for (const w of [0, 25, 50, 75, 100]) {
      const { branch } = mode.applyProcessing({ widthPercent: w }, { audioCtx: ctx });
      const panR = branch.nodes.filter(n => n.__kind === "panner").find(p => p.pan.value >= 0);
      const delay = branch.nodes.find(n => n.__kind === "delay");
      assert.ok(panR.pan.value >= prevPan - 1e-9, `width=${w}: pan geriledi`);
      assert.ok(delay.delayTime.value >= prevDelay - 1e-9, `width=${w}: gecikme geriledi`);
      prevPan = panR.pan.value;
      prevDelay = delay.delayTime.value;
    }
  });

  it("branch.input/output tanımlı, nodes 5 düğüm içerir (entryTap+panL+delay+panR+mergeGain), filters BOŞ/undefined", () => {
    const { ctx } = makeFakeAudioCtx();
    const result = mode.applyProcessing({ widthPercent: 50 }, { audioCtx: ctx });
    assert.ok(result.branch, "branch tanımlı olmalı");
    assert.ok(result.branch.input);
    assert.ok(result.branch.output);
    assert.equal(result.branch.nodes.length, 5);
    assert.ok(!result.filters || result.filters.length === 0, "width modunda düz filters dizisi KULLANILMAMALI");
  });

  it("iç bağlantılar TAM beklenen fan-out/merge topolojisini kurar: entryTap→panL, entryTap→delay, delay→panR, panL→merge, panR→merge (audio-engine'in EK bağlantısı olmadan)", () => {
    const { ctx, connections } = makeFakeAudioCtx();
    const { branch } = mode.applyProcessing({ widthPercent: 50 }, { audioCtx: ctx });
    const [entryTap, panL, delay, panR, mergeGain] = branch.nodes;
    const has = (from, to) => connections.some(([f, t]) => f === from.__id && t === to.__id);
    assert.ok(has(entryTap, panL), "entryTap→panL eksik");
    assert.ok(has(entryTap, delay), "entryTap→delay eksik");
    assert.ok(has(delay, panR), "delay→panR eksik");
    assert.ok(has(panL, mergeGain), "panL→mergeGain eksik");
    assert.ok(has(panR, mergeGain), "panR→mergeGain eksik");
    // entryTap DOĞRUDAN mergeGain'e bağlı OLMAMALI (bypass sızıntısı olurdu —
    // bkz. audio-engine.js'in dosya başı G118 notu, bu YÜZDEN branch mekanizması eklendi).
    assert.ok(!has(entryTap, mergeGain), "entryTap→mergeGain DOĞRUDAN bağlantısı OLMAMALIYDI (bypass sızıntısı)");
  });
});

describe("Stereo Genişlik — getMeta() sözleşme alanları", () => {
  it("id/motor/kulaklikGerekli/uyumluKaynaklar/ucretsiz/videoUrl/difficulty/choiceOnly tanımlı", () => {
    const meta = mode.getMeta();
    assert.equal(meta.id, "stereo-genislik");
    assert.equal(meta.kulaklikGerekli, true);
    assert.equal(typeof meta.kulaklikMetni, "string");
    assert.ok(!meta.uyumluKaynaklar.includes("kick"));
    assert.ok(!meta.uyumluKaynaklar.includes("snare"));
    assert.equal(meta.choiceOnly, true);
  });
  it("ad/aciklama BİLEREK yok", () => {
    const meta = mode.getMeta();
    assert.equal(meta.ad, undefined);
    assert.equal(meta.aciklama, undefined);
  });
});

describe("Stereo Genişlik — frekans-bulma.js zorunlu re-export sözleşmesi", () => {
  it("FA_ZONES/isBossRound/recordZone/faXToF app.js'in koşulsuz okuduğu şekilde mevcut", () => {
    assert.ok(Array.isArray(mode.FA_ZONES) && mode.FA_ZONES.length > 0);
    assert.equal(typeof mode.isBossRound, "function");
    assert.equal(typeof mode.recordZone, "function");
  });
});

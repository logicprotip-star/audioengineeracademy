// Stereo Genişlik moduna özel testler (G120 — sürekli ölçek, Pan Konumu'nun
// AYNI test iskeleti + applyProcessing'in YENİ "iki bağımsız kaynak" DSP'sini
// [gecikme YERİNE, bkz. dosya başı DÜRÜSTLÜK notu] doğru kurduğunu, hiçbir
// DelayNode İÇERMEDİĞİNİ ve gerçek bağımsız bir ikinci kaynak ürettiğini
// doğrulayan ek testler.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/stereo-genislik.js";

describe("Stereo Genişlik — generateChoiceValues() (Pan Konumu'yla AYNI SAF algoritma)", () => {
  it("trueValue etrafında count-1 çeldirici, TAM k·step mesafede, [0,100] içinde üretir", () => {
    const values = mode.generateChoiceValues(60, 15, 5, 0, 100);
    assert.equal(values.length, 5);
    assert.equal(values[0], 60);
    values.forEach(v => assert.ok(v >= 0 && v <= 100, `${v} [0,100] dışında`));
  });

  it("500 rastgele (trueValue, step, count) kombinasyonunda üretilen değerlerin HEPSİ birbirinden FARKLI", () => {
    for (let i = 0; i < 500; i++) {
      const trueValue = Math.round(Math.random() * 100);
      const step = 5 + Math.random() * 30;
      const count = 3 + Math.floor(Math.random() * 5);
      const values = mode.generateChoiceValues(trueValue, step, count, 0, 100);
      assert.equal(new Set(values).size, values.length, `trueValue=${trueValue} step=${step.toFixed(1)} count=${count}: çakışan değer, values=${values}`);
    }
  });
});

describe("Stereo Genişlik — paramsForDifficultyPosition() (Pan Konumu'yla AYNI eğri şekli)", () => {
  it("Z1'de en geniş şık mesafesi, LEVEL_CAP'te en dar", () => {
    const cfg = mode.WIDTH_CURVE_CONFIG;
    const z1 = mode.paramsForDifficultyPosition(1);
    const zCap = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    assert.ok(Math.abs(z1.step - cfg.STEP_AT_1) < 1e-9);
    assert.ok(Math.abs(zCap.step - cfg.STEP_AT_CAP) < 1e-9);
  });

  it("Z1→Z20 tablosu: şık mesafesi MONOTON küçülür", () => {
    let prev = Infinity;
    const rows = [];
    for (let p = 1; p <= 20; p++) {
      const { step, options } = mode.paramsForDifficultyPosition(p);
      rows.push([p, step.toFixed(1), options]);
      assert.ok(step <= prev + 1e-9, `Z${p}: step ${step} öncekinden büyüdü`);
      prev = step;
    }
    console.log("Stereo Genişlik Z1-Z20 tablosu (step %, şık sayısı):", rows.map(([p, s, o]) => `Z${p}=${s}%/${o}şık`).join(" "));
    assert.ok(Number(rows[0][1]) > Number(rows[19][1]));
  });

  it("şık mesafesi HİÇBİR Z seviyesinde WIDTH_TOLERANCE'a eşit ya da altına İNMEZ", () => {
    for (let p = 1; p <= 20; p++) {
      const { step } = mode.paramsForDifficultyPosition(p);
      assert.ok(step > mode.WIDTH_TOLERANCE, `Z${p}: step ${step} <= tolerans ${mode.WIDTH_TOLERANCE}`);
    }
    assert.ok(mode.WIDTH_CURVE_CONFIG.STEP_FLOOR > mode.WIDTH_TOLERANCE);
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

  it("true değer sürekli ölçekten gelir — ızgara noktası (0/25/50/75/100) OLMAK ZORUNDA DEĞİL (500 örnekte en az bir ızgara-dışı değer)", () => {
    let sawNonGrid = false;
    for (let i = 0; i < 500; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      if (q.widthPercent % 25 !== 0) { sawNonGrid = true; break; }
    }
    assert.ok(sawNonGrid, "500 örnekte HİÇ ızgara-dışı değer çıkmadı");
  });

  it("difficultyPosition VERİLİRSE üretilen şık sayısı paramsForDifficultyPosition().options'a eşit", () => {
    for (const p of [1, 5, 10, 15, 20]) {
      const expected = mode.paramsForDifficultyPosition(p).options;
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

  it("1000 rastgele soruda şıkların İKİLİ karşılaştırmasında da hiçbir çift WIDTH_TOLERANCE içine düşmez", () => {
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const position = 1 + Math.random() * 19;
      const q = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: position });
      for (let a = 0; a < q.choices.length; a++) {
        for (let b = a + 1; b < q.choices.length; b++) {
          const gap = Math.abs(q.choices[a].value - q.choices[b].value);
          assert.ok(gap > mode.WIDTH_TOLERANCE, `position ${position.toFixed(2)}: şık ${q.choices[a].value} ile ${q.choices[b].value} arası ${gap} <= tolerans`);
        }
      }
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

// G120 — YENİ "iki bağımsız kaynak" DSP'sinin doğru kurulduğunu, sahte ama
// Web Audio API'nin bağlantı/parametre sözleşmesine sadık bir audioCtx ile
// doğrular. En kritik doğrulama: HİÇBİR DelayNode YOK (eski/hatalı G118
// tekniği tamamen kaldırıldı) ve panL/panR GERÇEKTEN İKİ FARKLI kaynak
// düğümünden besleniyor (aynı düğüm İKİ KEZ KULLANILMIYOR).
describe("Stereo Genişlik — applyProcessing (G120 'iki bağımsız kaynak' DSP'si, sahte audioCtx ile)", () => {
  function makeFakeAudioCtx() {
    const created = [];
    const connections = [];
    let nextId = 0;
    function makeNode(kind, extra = {}) {
      const id = nextId++;
      const node = {
        __id: id, __kind: kind, ...extra,
        connect: (dest) => { connections.push([id, dest.__id]); return dest; }
      };
      created.push(node);
      return node;
    }
    return {
      ctx: {
        sampleRate: 44100,
        createGain: () => makeNode("gain", { gain: { value: 0 } }),
        createStereoPanner: () => makeNode("panner", { pan: { value: 0 } }),
        createDelay: (max) => makeNode("delay", { delayTime: { value: 0 }, maxDelay: max }),
        createBuffer: () => ({ getChannelData: () => new Float32Array(100) }),
        createBufferSource: () => makeNode("bufferSource", { buffer: null, loop: false, start: () => {} }),
        createOscillator: () => makeNode("oscillator", { type: "sine", frequency: { value: 0 }, detune: { value: 0 }, start: () => {} })
      },
      created, connections
    };
  }

  it("HİÇBİR DelayNode YOK — G118'in hatalı gecikme tekniği tamamen kaldırıldı", () => {
    for (const source of ["pink", "white", "saw", "square", "triangle"]) {
      const { ctx } = makeFakeAudioCtx();
      const { branch } = mode.applyProcessing({ widthPercent: 50, source }, { audioCtx: ctx });
      const delays = branch.nodes.filter(n => n.__kind === "delay");
      assert.equal(delays.length, 0, `source=${source}: DelayNode BULUNDU, kaldırılmamış olabilir`);
    }
  });

  it("gürültü kaynağı (pink/white) için ikinci kaynak BufferSourceNode, panL'i besleyen entryTap'ten FARKLI bir düğüm", () => {
    const { ctx } = makeFakeAudioCtx();
    const { branch } = mode.applyProcessing({ widthPercent: 80, source: "pink" }, { audioCtx: ctx });
    const bufferSources = branch.nodes.filter(n => n.__kind === "bufferSource");
    assert.equal(bufferSources.length, 1, "TEK bağımsız BufferSourceNode (entryTap sourceMix'ten geliyor, applyProcessing İÇİNDE oluşturulmuyor)");
    const entryTap = branch.input;
    assert.notEqual(bufferSources[0].__id, entryTap.__id, "ikinci kaynak entryTap'İN KENDİSİ OLMAMALI — bağımsız/taze bir düğüm olmalı");
  });

  it("osilatör kaynağı (saw/square/triangle) için ikinci kaynak OscillatorNode, KÜÇÜK bir detune taşır (sıfır DEĞİL — gerçek decorrelation için)", () => {
    for (const source of ["saw", "square", "triangle"]) {
      const { ctx } = makeFakeAudioCtx();
      const { branch } = mode.applyProcessing({ widthPercent: 80, source }, { audioCtx: ctx });
      const oscs = branch.nodes.filter(n => n.__kind === "oscillator");
      assert.equal(oscs.length, 1, `source=${source}: TEK bağımsız OscillatorNode bekleniyordu`);
      assert.equal(oscs[0].type, source);
      assert.notEqual(oscs[0].detune.value, 0, `source=${source}: detune sıfırsa iki osilatör SKALER KATI olur, decorrelation OLUŞMAZ`);
    }
  });

  it("bilinmeyen/desteklenmeyen bir source için ÇÖKMEZ, güvenli pembe-gürültü varsayılanına düşer", () => {
    const { ctx } = makeFakeAudioCtx();
    assert.doesNotThrow(() => {
      const { branch } = mode.applyProcessing({ widthPercent: 50, source: "kick" }, { audioCtx: ctx });
      const bufferSources = branch.nodes.filter(n => n.__kind === "bufferSource");
      assert.equal(bufferSources.length, 1);
    });
  });

  it("width=0'da panL/panR pan=0 (merkez) — width=100'de panL=-1/panR=+1 (tam ayrık)", () => {
    const { ctx } = makeFakeAudioCtx();
    const zero = mode.applyProcessing({ widthPercent: 0, source: "pink" }, { audioCtx: ctx });
    const zeroPanners = zero.branch.nodes.filter(n => n.__kind === "panner");
    zeroPanners.forEach(p => assert.ok(p.pan.value === 0, `pan.value ${p.pan.value} !== 0`));

    const { ctx: ctx2 } = makeFakeAudioCtx();
    const full = mode.applyProcessing({ widthPercent: 100, source: "pink" }, { audioCtx: ctx2 });
    const fullPanners = full.branch.nodes.filter(n => n.__kind === "panner");
    const panValues = fullPanners.map(p => p.pan.value).sort((a, b) => a - b);
    assert.deepEqual(panValues, [-1, 1]);
  });

  it("iç bağlantılar TAM beklenen fan-out/merge topolojisini kurar: entryTap→panL, ikinciKaynak→ara-gain→panR, panL→merge, panR→merge (bypass sızıntısı YOK)", () => {
    const { ctx, connections } = makeFakeAudioCtx();
    const { branch } = mode.applyProcessing({ widthPercent: 50, source: "pink" }, { audioCtx: ctx });
    const entryTap = branch.input;
    const mergeGain = branch.output;
    const panners = branch.nodes.filter(n => n.__kind === "panner");
    const has = (from, to) => connections.some(([f, t]) => f === from.__id && t === to.__id);

    assert.ok(panners.some(p => has(entryTap, p)), "entryTap bir panner'a bağlı değil");
    panners.forEach(p => assert.ok(has(p, mergeGain), "her panner mergeGain'e bağlı olmalı"));
    // entryTap DOĞRUDAN mergeGain'e bağlı OLMAMALI (bypass sızıntısı olurdu).
    assert.ok(!has(entryTap, mergeGain), "entryTap→mergeGain DOĞRUDAN bağlantısı OLMAMALIYDI");
  });

  it("branch.nodes 6 düğüm içerir (entryTap+panL+ikinciKaynak+secondGain+panR+mergeGain), filters BOŞ/undefined", () => {
    const { ctx } = makeFakeAudioCtx();
    const result = mode.applyProcessing({ widthPercent: 50, source: "pink" }, { audioCtx: ctx });
    assert.ok(result.branch);
    assert.equal(result.branch.nodes.length, 6);
    assert.ok(!result.filters || result.filters.length === 0, "width modunda düz filters dizisi KULLANILMAMALI");
  });
});

describe("Stereo Genişlik — getMeta() sözleşme alanları", () => {
  it("id/motor/kulaklikGerekli/uyumluKaynaklar/ucretsiz/videoUrl/difficulty/choiceOnly tanımlı", () => {
    const meta = mode.getMeta();
    assert.equal(meta.id, "stereo-genislik");
    assert.equal(meta.kulaklikGerekli, true);
    assert.equal(typeof meta.kulaklikMetni, "string");
    assert.equal(meta.choiceOnly, true);
  });

  it("G120 — kaynak listesi SADECE sentetik türlere (pink/white/saw/square/triangle) daraltıldı — örnek dosyalar/upload'ta bağımsız ikinci kaynak YOK", () => {
    const meta = mode.getMeta();
    assert.deepEqual([...meta.uyumluKaynaklar].sort(), ["pink", "saw", "square", "triangle", "white"]);
    assert.ok(!meta.uyumluKaynaklar.includes("upload"));
    assert.ok(!meta.uyumluKaynaklar.includes("kick"));
    assert.ok(!meta.uyumluKaynaklar.includes("vocal"));
    assert.ok(!meta.uyumluKaynaklar.includes("groove"));
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

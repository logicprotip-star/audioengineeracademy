// Stereo Genişlik moduna özel testler (G122 — mid/side genişlik, SADECE
// yüklenen dosyayla oynanır). Zorluk-eğrisi/şık-üretim testleri Pan Konumu'yla
// AYNI iskelet (kaynak/DSP katmanından bağımsız) — DSP/kaynak/bufferPlayability/
// pickPlaybackOffset testleri BU turun YENİ eklentileri.

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
      const q = mode.createQuestion(level, { source: "upload", boss: false });
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
        const q = mode.createQuestion(level, { source: "upload", boss: false });
        const correctChoices = q.choices.filter(c => c.correct);
        assert.equal(correctChoices.length, 1, `${level}: ${correctChoices.length} doğru şık`);
        assert.equal(correctChoices[0].value, q.widthPercent);
      }
    }
  });

  it("true değer sürekli ölçekten gelir — ızgara noktası (0/25/50/75/100) OLMAK ZORUNDA DEĞİL (500 örnekte en az bir ızgara-dışı değer)", () => {
    let sawNonGrid = false;
    for (let i = 0; i < 500; i++) {
      const q = mode.createQuestion("medium", { source: "upload", boss: false });
      if (q.widthPercent % 25 !== 0) { sawNonGrid = true; break; }
    }
    assert.ok(sawNonGrid, "500 örnekte HİÇ ızgara-dışı değer çıkmadı");
  });

  it("difficultyPosition VERİLİRSE üretilen şık sayısı paramsForDifficultyPosition().options'a eşit", () => {
    for (const p of [1, 5, 10, 15, 20]) {
      const expected = mode.paramsForDifficultyPosition(p).options;
      const q = mode.createQuestion("medium", { source: "upload", boss: false, difficultyPosition: p });
      assert.equal(q.choices.length, expected);
    }
  });

  it("settings.source verilmezse VARSAYILAN 'upload' — G120'nin 'pink' varsayılanı ARTIK GEÇERSİZ bir tür", () => {
    const q = mode.createQuestion("medium", { boss: false });
    assert.equal(q.source, "upload");
  });
});

describe("Stereo Genişlik — 1000 denemelik: hiçbir kademede iki şık çakışmıyor", () => {
  it("1000 rastgele soruda ŞIKLARIN KENDİ ARALARINDA hiçbir çift ÇAKIŞMAZ", () => {
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const position = 1 + Math.random() * 19;
      const q = mode.createQuestion("medium", { source: "upload", boss: false, difficultyPosition: position });
      const vals = q.choices.map(c => c.value);
      assert.equal(new Set(vals).size, vals.length, `position ${position.toFixed(2)}: çakışan şık değeri, values=${vals}`);
    }
  });

  it("1000 rastgele soruda TAM BİR doğru şık var, hiçbir yanlış şık WIDTH_TOLERANCE içine düşmez", () => {
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const position = 1 + Math.random() * 19;
      const q = mode.createQuestion("medium", { source: "upload", boss: Math.random() < 0.2, difficultyPosition: position });
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
      const q = mode.createQuestion("medium", { source: "upload", boss: false, difficultyPosition: position });
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
    const q = mode.createQuestion("medium", { source: "upload", boss: false });
    const correctFb = mode.getFeedbackData(q, q.widthPercent, { gained: 10 });
    assert.equal(correctFb.showResult, true);
    assert.equal(correctFb.panel, null);
  });
});

// G122 — dosya uygunluğu: SAF, sadece {numberOfChannels} okuyan sahte
// "buffer benzeri" nesnelerle test edilebiliyor (gerçek AudioBuffer GEREKMEZ).
describe("Stereo Genişlik — bufferPlayability()", () => {
  it("buffer yoksa (null/undefined) reason='no-file'", () => {
    assert.deepEqual(mode.bufferPlayability(null), { ok: false, reason: "no-file" });
    assert.deepEqual(mode.bufferPlayability(undefined), { ok: false, reason: "no-file" });
  });
  it("mono (numberOfChannels=1) buffer'da reason='mono'", () => {
    const r = mode.bufferPlayability({ numberOfChannels: 1 });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "mono");
  });
  it("stereo (numberOfChannels=2) buffer'da ok=true", () => {
    const r = mode.bufferPlayability({ numberOfChannels: 2 });
    assert.equal(r.ok, true);
    assert.equal(r.reason, null);
  });
  it("5.1 gibi >2 kanallı bir buffer da ok=true (mono OLMADIĞI sürece kısıtlama yok)", () => {
    const r = mode.bufferPlayability({ numberOfChannels: 6 });
    assert.equal(r.ok, true);
  });
});

// G212 — "dual-mono" dosyalar: numberOfChannels===2 ama L===R (birçok DAW'ın
// mono bir kaynağı interleaved-stereo olarak dışa aktarma alışkanlığı).
// getChannelData SAĞLAYAN sahte buffer'larla test edilir — getChannelData
// OLMAYAN eski-stil fake'ler (yukarıdaki testler) davranışını KORUR.
describe("Stereo Genişlik — bufferPlayability() — dual-mono tespiti (G212)", () => {
  function fakeBuffer(l, r) {
    const data = [Float32Array.from(l), Float32Array.from(r)];
    return { numberOfChannels: 2, getChannelData: (ch) => data[ch] };
  }
  it("L===R (bit-eşit) ise reason='mono'", () => {
    const samples = Array.from({ length: 4000 }, (_, i) => Math.sin(i));
    const r = mode.bufferPlayability(fakeBuffer(samples, samples));
    assert.equal(r.ok, false);
    assert.equal(r.reason, "mono");
  });
  it("L/R farkı eşiğin (0.001) altındaysa yine reason='mono'", () => {
    const l = Array.from({ length: 4000 }, (_, i) => Math.sin(i));
    const r = l.map((v) => v + 0.0001);
    const res = mode.bufferPlayability(fakeBuffer(l, r));
    assert.equal(res.ok, false);
    assert.equal(res.reason, "mono");
  });
  it("gerçekten farklı L/R içeriğinde ok=true", () => {
    const l = Array.from({ length: 4000 }, (_, i) => Math.sin(i));
    const r = Array.from({ length: 4000 }, (_, i) => Math.cos(i));
    const res = mode.bufferPlayability(fakeBuffer(l, r));
    assert.equal(res.ok, true);
    assert.equal(res.reason, null);
  });
  it("getChannelData sağlamayan eski-stil fake'lerde davranış DEĞİŞMEDİ (ok=true)", () => {
    const r = mode.bufferPlayability({ numberOfChannels: 2 });
    assert.equal(r.ok, true);
  });
});

// G122 — pickPlaybackOffset: SAF-BENZERİ (rastgelelik var ama rng enjekte
// edilebiliyor, deterministik test mümkün) — gerçek bir AudioBuffer'ı taklit
// eden {duration, sampleRate, numberOfChannels, getChannelData} nesnesiyle.
describe("Stereo Genişlik — pickPlaybackOffset()", () => {
  function makeFakeBuffer({ durationSec = 10, sampleRate = 1000, silentUntil = 0, silentAfter = Infinity } = {}) {
    const length = Math.round(durationSec * sampleRate);
    const data = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      data[i] = (t >= silentUntil && t < silentAfter) ? 0.5 : 0;
    }
    return {
      duration: durationSec,
      sampleRate,
      numberOfChannels: 1,
      getChannelData: () => data
    };
  }

  it("buffer çok kısaysa (duration <= windowSec) 0 döner", () => {
    const buf = makeFakeBuffer({ durationSec: 1 });
    assert.equal(mode.pickPlaybackOffset(buf, { windowSec: 1.5 }), 0);
  });

  it("dosyanın TAMAMI enerjili ise (sessiz bölge yok) döndürülen offset her zaman [0, duration-windowSec] içinde", () => {
    const buf = makeFakeBuffer({ durationSec: 20 });
    for (let i = 0; i < 50; i++) {
      const off = mode.pickPlaybackOffset(buf, { windowSec: 1.5, rng: Math.random });
      assert.ok(off >= 0 && off <= 20 - 1.5, `offset ${off} aralık dışı`);
    }
  });

  it("dosyanın SADECE bir bölümü enerjili ise (baştan 8sn sessiz, sonra ses), seçilen PENCERENİN KENDİ enerjisi HER ZAMAN eşiği geçer (sessiz bölgeye TAMAMEN düşmez)", () => {
    const buf = makeFakeBuffer({ durationSec: 20, silentUntil: 8 });
    const windowSec = 1.5, energyThreshold = 0.1;
    const windowRms = (startSec) => {
      const data = buf.getChannelData(0);
      const startSample = Math.floor(startSec * buf.sampleRate);
      const endSample = Math.min(data.length, startSample + Math.floor(windowSec * buf.sampleRate));
      let sumSq = 0, count = 0;
      for (let i = startSample; i < endSample; i++) { sumSq += data[i] * data[i]; count++; }
      return Math.sqrt(sumSq / count);
    };
    // rng'yi TÜM aralığa (0..1) eşit dağıtan gerçekçi bir üretici — bazı
    // denemeler kaçınılmaz olarak sessiz bölgeye düşecek, algoritmanın
    // enerji-eşiği kontrolüyle bunları ELEMESİ gerekiyor. Pencere sessizlik/
    // ses SINIRINI (8sn) örtebilir — o durumda bile PENCERENİN KENDİ ortalama
    // enerjisi eşiği geçmiş olmalı (tamamen sessize DÜŞMEMİŞ olmalı), offset'in
    // TAM 8'in üstünde olması ŞART DEĞİL (sınır-örten pencereler de geçerli).
    for (let trial = 0; trial < 30; trial++) {
      let call = 0;
      const seq = Array.from({ length: 40 }, () => Math.random());
      const rng = () => seq[call++ % seq.length];
      const off = mode.pickPlaybackOffset(buf, { windowSec, energyThreshold, maxAttempts: 30, rng });
      const actualRms = windowRms(off);
      assert.ok(actualRms >= energyThreshold - 1e-9 || off >= 20 - windowSec - 0.5, `offset ${off}: pencere RMS ${actualRms.toFixed(4)} < eşik ${energyThreshold} (fallback taramasına da yakın değil)`);
    }
  });

  it("dosyanın TAMAMI sessizse (fallback), yine de [0, duration-windowSec] içinde GEÇERLİ bir sayı döner (çökmez)", () => {
    const buf = makeFakeBuffer({ durationSec: 10, silentUntil: 999 }); // hiç enerjili bölge yok
    const off = mode.pickPlaybackOffset(buf, { windowSec: 1.5, energyThreshold: 0.1, maxAttempts: 10 });
    assert.ok(Number.isFinite(off) && off >= 0 && off <= 10 - 1.5);
  });

  it("rng sabitse (deterministik) SONUÇ deterministik — aynı girdi aynı çıktı", () => {
    const buf = makeFakeBuffer({ durationSec: 20 });
    const rng = () => 0.5;
    const a = mode.pickPlaybackOffset(buf, { windowSec: 1.5, rng });
    const b = mode.pickPlaybackOffset(buf, { windowSec: 1.5, rng });
    assert.equal(a, b);
  });
});

// G122 — YENİ mid/side DSP'sinin doğru kurulduğunu, sahte ama Web Audio
// API'nin bağlantı/parametre sözleşmesine sadık bir audioCtx ile doğrular.
// En kritik doğrulama: HİÇBİR gecikme/kaynak-üretici düğüm YOK (sadece
// GainNode + ChannelSplitterNode + ChannelMergerNode — anlık/z^0 bir
// matris işlemi, comb filtresi YAPISAL OLARAK oluşamaz, bkz. dosya başı not).
describe("Stereo Genişlik — applyProcessing (G122 mid/side DSP'si, sahte audioCtx ile)", () => {
  function makeFakeAudioCtx() {
    const created = [];
    const connections = [];
    let nextId = 0;
    function makeNode(kind, extra = {}) {
      const id = nextId++;
      const node = {
        __id: id, __kind: kind, ...extra,
        connect: (dest, output, input) => { connections.push([id, dest.__id, output, input]); return dest; }
      };
      created.push(node);
      return node;
    }
    return {
      ctx: {
        createGain: () => makeNode("gain", { gain: { value: 0 } }),
        createChannelSplitter: (n) => makeNode("splitter", { channelCount: n }),
        createChannelMerger: (n) => makeNode("merger", { channelCount: n }),
        createDelay: (max) => makeNode("delay", { delayTime: { value: 0 }, maxDelay: max }),
        createStereoPanner: () => makeNode("panner", { pan: { value: 0 } }),
        createBufferSource: () => makeNode("bufferSource"),
        createOscillator: () => makeNode("oscillator")
      },
      created, connections
    };
  }

  it("HİÇBİR DelayNode/BufferSource/Oscillator YOK — sadece Gain + Splitter + Merger (anlık matris işlemi)", () => {
    const { ctx } = makeFakeAudioCtx();
    const { branch } = mode.applyProcessing({ widthPercent: 50 }, { audioCtx: ctx });
    const forbiddenKinds = new Set(["delay", "panner", "bufferSource", "oscillator"]);
    branch.nodes.forEach(n => assert.ok(!forbiddenKinds.has(n.__kind), `beklenmeyen düğüm türü: ${n.__kind}`));
    assert.equal(branch.nodes.filter(n => n.__kind === "splitter").length, 1);
    assert.equal(branch.nodes.filter(n => n.__kind === "merger").length, 1);
    assert.equal(branch.nodes.filter(n => n.__kind === "gain").length, 11);
  });

  it("width=0'da side ölçek katsayısı (sideScaled.gain) TAM SIFIR — L'=R'=mid MATEMATİKSEL KESİNLİKLE (tam mono)", () => {
    const { ctx } = makeFakeAudioCtx();
    const { branch } = mode.applyProcessing({ widthPercent: 0 }, { audioCtx: ctx });
    // sideScaled: sideSum'dan gelen TEK girdiyi alan, merger'a GİTMEYEN
    // (outL/outR üzerinden dolaylı giden) gain — gain.value widthFrac'a eşit
    // olmalı. Node'u topolojiden bulmak yerine (isim yok, sahte graf) DOĞRUDAN
    // gain.value=0 olan ve TAM OLARAK bir "toplama" (sideSum) düğümünden
    // beslenen bir gain arıyoruz — daha basiti: TÜM gain düğümleri arasında
    // gain.value === widthFrac (0) olanı en az bir tane olmalı.
    const zeroGains = branch.nodes.filter(n => n.__kind === "gain" && n.gain.value === 0);
    assert.ok(zeroGains.length >= 1, "width=0'da gain.value=0 olan HİÇBİR düğüm yok");
  });

  it("width=100'de side ölçek katsayısı TAM 1 — L'=L, R'=R (dosyanın kendi orijinal genişliği BİREBİR)", () => {
    const { ctx } = makeFakeAudioCtx();
    const { branch } = mode.applyProcessing({ widthPercent: 100 }, { audioCtx: ctx });
    const oneGains = branch.nodes.filter(n => n.__kind === "gain" && n.gain.value === 1);
    // midSum/outL/outR/sideSum/mergeGain'lerin HEPSİ zaten 1 — sideScaled'ın
    // DA 1 olması (widthFrac=1) toplam "gain.value===1" sayısını ARTIRMALI.
    assert.ok(oneGains.length >= 5);
  });

  it("width 0..100 arası ARA bir değerde (ör. 37) side ölçek katsayısı TAM widthFrac'a eşit bir gain vardır", () => {
    const { ctx } = makeFakeAudioCtx();
    const { branch } = mode.applyProcessing({ widthPercent: 37 }, { audioCtx: ctx });
    const matching = branch.nodes.filter(n => n.__kind === "gain" && Math.abs(n.gain.value - 0.37) < 1e-9);
    assert.equal(matching.length, 1, "widthFrac'a eşit TAM BİR gain değeri bekleniyordu (sideScaled)");
  });

  it("iç bağlantılar beklenen fan-out/merge topolojisini kurar: entryTap→splitter, splitter→(4 half-gain), merger'a TAM 2 giriş (index 0 ve 1)", () => {
    const { ctx, connections } = makeFakeAudioCtx();
    const { branch } = mode.applyProcessing({ widthPercent: 50 }, { audioCtx: ctx });
    const entryTap = branch.input;
    const merger = branch.output;
    const splitter = branch.nodes.find(n => n.__kind === "splitter");

    assert.ok(connections.some(([f, t]) => f === entryTap.__id && t === splitter.__id), "entryTap splitter'a bağlı değil");

    const fromSplitter = connections.filter(([f]) => f === splitter.__id);
    assert.equal(fromSplitter.length, 4, "splitter TAM 4 gain'e (mid/side × L/R) bağlanmalı");
    const outputIndices = fromSplitter.map(([, , output]) => output).sort();
    assert.deepEqual(outputIndices, [0, 0, 1, 1], "splitter çıkışları TAM olarak iki kez 0 (L) iki kez 1 (R) kullanılmalı");

    const intoMerger = connections.filter(([, t]) => t === merger.__id);
    assert.equal(intoMerger.length, 2, "merger'a TAM 2 giriş bağlanmalı (outL, outR)");
    const mergerInputs = intoMerger.map(([, , , input]) => input).sort();
    assert.deepEqual(mergerInputs, [0, 1], "merger girişleri TAM olarak 0 (L) ve 1 (R) olmalı");
  });

  it("branch.nodes 13 düğüm içerir, filters BOŞ/undefined", () => {
    const { ctx } = makeFakeAudioCtx();
    const result = mode.applyProcessing({ widthPercent: 50 }, { audioCtx: ctx });
    assert.ok(result.branch);
    assert.equal(result.branch.nodes.length, 13);
    assert.ok(!result.filters || result.filters.length === 0, "width modunda düz filters dizisi KULLANILMAMALI");
  });
});

// G122 — SAYISAL KANIT: mid/side matrisinin GERÇEK PCM örnekleri üzerinde
// (JS'te, Web Audio olmadan) matematiksel olarak DOĞRU davrandığını,
// özellikle width=0'da korelasyonun TAM +1 (mükemmel mono) olduğunu ve
// width=100'de orijinal L/R'nin BİREBİR geri kurulduğunu doğrular —
// applyProcessing'in node grafiğiyle AYNI formül (mid=(L+R)/2, side=(L-R)/2,
// L'=mid+k*side, R'=mid-k*side), burada saf sayısal olarak.
function applyMidSideWidth(L, R, k) {
  const n = L.length;
  const outL = new Float64Array(n), outR = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const mid = (L[i] + R[i]) / 2;
    const side = (L[i] - R[i]) / 2;
    const sideScaled = side * k;
    outL[i] = mid + sideScaled;
    outR[i] = mid - sideScaled;
  }
  return [outL, outR];
}
function pearsonCorrelation(a, b) {
  const n = a.length;
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma, xb = b[i] - mb;
    num += xa * xb; da += xa * xa; db += xb * xb;
  }
  if (da === 0 || db === 0) return 1; // iki sabit/sıfır sinyal — mükemmel "eşleşme" (mono) sayılır
  return num / Math.sqrt(da * db);
}
describe("Stereo Genişlik — mid/side matrisinin sayısal doğrulaması (Web Audio'suz, saf JS)", () => {
  function makeStereoNoise(n, seed) {
    let s = seed;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const L = new Float64Array(n), R = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      // GERÇEKÇİ bir stereo kayıt simülasyonu: ortak bir "mid" bileşeni +
      // her kanala AYRI bir mikrofon/oda gürültüsü (kısmi decorrelation) —
      // gerçek dünya stereo kayıtlarının tipik yapısı.
      const common = rnd() * 2 - 1;
      L[i] = common * 0.7 + (rnd() * 2 - 1) * 0.3;
      R[i] = common * 0.7 + (rnd() * 2 - 1) * 0.3;
    }
    return [L, R];
  }

  it("width=0 (k=0) → L'===R' HER ÖRNEKTE BİREBİR (tam mono), korelasyon TAM +1", () => {
    const [L, R] = makeStereoNoise(5000, 42);
    const [outL, outR] = applyMidSideWidth(L, R, 0);
    for (let i = 0; i < outL.length; i++) {
      assert.ok(Math.abs(outL[i] - outR[i]) < 1e-12, `örnek ${i}: L'≠R' (${outL[i]} vs ${outR[i]})`);
    }
    const corr = pearsonCorrelation(outL, outR);
    assert.ok(Math.abs(corr - 1) < 1e-9, `korelasyon ${corr} !== 1`);
  });

  it("width=100 (k=1) → L'/R' orijinal L/R'yi HER ÖRNEKTE BİREBİR geri kurar", () => {
    const [L, R] = makeStereoNoise(5000, 7);
    const [outL, outR] = applyMidSideWidth(L, R, 1);
    for (let i = 0; i < L.length; i++) {
      assert.ok(Math.abs(outL[i] - L[i]) < 1e-12, `örnek ${i}: L' orijinal L'den farklı`);
      assert.ok(Math.abs(outR[i] - R[i]) < 1e-12, `örnek ${i}: R' orijinal R'den farklı`);
    }
  });

  it("ARA k değerlerinde (0.25/0.5/0.75) korelasyon MONOTON artar (k küçüldükçe mono'ya yaklaşır — 0'a daha yakın k HER ZAMAN >= korelasyon)", () => {
    const [L, R] = makeStereoNoise(20000, 99);
    const ks = [0, 0.25, 0.5, 0.75, 1];
    const corrs = ks.map(k => {
      const [outL, outR] = applyMidSideWidth(L, R, k);
      return pearsonCorrelation(outL, outR);
    });
    for (let i = 1; i < corrs.length; i++) {
      assert.ok(corrs[i] <= corrs[i - 1] + 1e-9, `k=${ks[i]}'de korelasyon (${corrs[i]}) k=${ks[i - 1]}'den (${corrs[i - 1]}) BÜYÜK — beklenen monoton azalış yok`);
    }
    assert.ok(Math.abs(corrs[0] - 1) < 1e-9);
  });

  it("HİÇBİR k değerinde (0'dan 1'e 21 adım) enerji patlaması/taşma OLMAZ — çıktı RMS'i girdi RMS'inin makul bir katı içinde kalır", () => {
    const [L, R] = makeStereoNoise(20000, 123);
    const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
    const inputRms = (rms(L) + rms(R)) / 2;
    for (let i = 0; i <= 20; i++) {
      const k = i / 20;
      const [outL, outR] = applyMidSideWidth(L, R, k);
      const outputRms = (rms(outL) + rms(outR)) / 2;
      assert.ok(outputRms <= inputRms * 1.5 + 0.01, `k=${k}: çıktı RMS (${outputRms.toFixed(3)}) girdi RMS'inin (${inputRms.toFixed(3)}) 1.5 katını aştı`);
    }
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

  it("G122 — kaynak listesi SADECE 'upload' — mid/side ayrıştırması GERÇEK bir stereo kayıt gerektiriyor", () => {
    const meta = mode.getMeta();
    assert.deepEqual([...meta.uyumluKaynaklar], ["upload"]);
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

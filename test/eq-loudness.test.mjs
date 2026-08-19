// A/B loudness eşitleme (Düzeltme 1, TUR8-OGRETIM-15-08 bulgusu 🔴) — RBJ biquad
// matematiğinin doğruluğu + telafi kazancının GERÇEKTEN boost/cut çıkışını eşitlediği
// ölçülüyor (tahmini bir sabit değil, gerçek matematik — kabul kriteri: bkz. son test).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { biquadMagnitudeDb, estimateChainGainDb, compensationGainLinear, bandpassPower, computeSourcePsd, estimateChainGainDbWeighted } from "../www/js/core/eq-loudness.js";

const SR = 48000;

describe("biquadMagnitudeDb() — RBJ formülünün temel doğrulukları", () => {
  it("peaking filtre TAM f0'da kendi gain'ini verir (RBJ'nin tanımlayıcı özelliği)", () => {
    for (const gain of [-12, -6, -3, 3, 6, 12]) {
      const db = biquadMagnitudeDb({ type: "peaking", frequency: 1000, Q: 1.4, gain }, 1000, SR);
      assert.ok(Math.abs(db - gain) < 0.05, `gain=${gain} beklenirdi, ${db} çıktı`);
    }
  });

  it("peaking filtre gain=0 iken HER frekansta ~0dB (etkisiz)", () => {
    for (const f of [50, 200, 1000, 5000, 15000]) {
      const db = biquadMagnitudeDb({ type: "peaking", frequency: 1000, Q: 1.4, gain: 0 }, f, SR);
      assert.ok(Math.abs(db) < 0.05, `f=${f} için ${db}dB (0 bekleniyordu)`);
    }
  });

  it("lowpass DC'ye yakında ~0dB, kesim üstünde belirgin negatif", () => {
    const nearDc = biquadMagnitudeDb({ type: "lowpass", frequency: 1000, Q: 0.707 }, 20, SR);
    const wayAbove = biquadMagnitudeDb({ type: "lowpass", frequency: 1000, Q: 0.707 }, 16000, SR);
    assert.ok(Math.abs(nearDc) < 0.5, `DC yakını ${nearDc}dB`);
    assert.ok(wayAbove < -20, `kesim üstü ${wayAbove}dB (belirgin negatif bekleniyordu)`);
  });

  it("highpass DC'ye yakında belirgin negatif, kesim altında ~0dB", () => {
    const nearDc = biquadMagnitudeDb({ type: "highpass", frequency: 1000, Q: 0.707 }, 20, SR);
    const wayAbove = biquadMagnitudeDb({ type: "highpass", frequency: 1000, Q: 0.707 }, 16000, SR);
    assert.ok(nearDc < -20, `DC yakını ${nearDc}dB (belirgin negatif bekleniyordu)`);
    assert.ok(Math.abs(wayAbove) < 0.5, `kesim altı ${wayAbove}dB`);
  });

  it("desteklenmeyen bir tip sessizce 0dB döner (güvenli varsayılan)", () => {
    assert.equal(biquadMagnitudeDb({ type: "bandpass", frequency: 1000, Q: 1, gain: 6 }, 1000, SR), 0);
  });
});

// G334 (OLCUM-FREKANS-DOGRULUK-19-08) — Web Audio'da lowpass/highpass TİPİNDE
// `Q`, klasik kalite faktörü DEĞİL, "kesim noktasındaki rezonansın dB cinsinden
// değeri" (MDN doğrulandı). RBJ cookbook'un alpha=sin(w0)/(2*Q) formülü KLASİK
// Q beklediği için, bu fonksiyon lowpass/highpass'ta Q'yu ÖNCE `10^(Q/20)` ile
// klasik değere çeviriyor (peaking/notch/bandpass/allpass'ta DOKUNULMADI, Q
// zaten klasik). Bu test, çevrimin GERÇEKTEN Chromium'un native
// `getFrequencyResponse()`'uyla eşleştiğini kesim-noktasi.js'in KENDİ
// FILTER_Q'suyla (20*log10(1/√2)) DOĞRULAR — canlı ölçüm
// (OLCUM-FREKANS-DOGRULUK-19-08.md) fark SIFIR bulmuştu.
describe("biquadMagnitudeDb() — G334: lowpass/highpass Q'nun dB-rezonans çevrimi", () => {
  it("Q=20*log10(1/√2) (kesim-noktasi.js'in Butterworth karşılığı) f0'da TAM -3.0103dB verir", () => {
    const butterworthQ = 20 * Math.log10(Math.SQRT1_2);
    for (const type of ["highpass", "lowpass"]) {
      for (const f0 of [100, 1000, 8000]) {
        const db = biquadMagnitudeDb({ type, frequency: f0, Q: butterworthQ }, f0, SR);
        assert.ok(Math.abs(db - -3.0103) < 0.001, `${type} f0=${f0}: ${db}dB (−3.0103 bekleniyordu)`);
      }
    }
  });

  it("Q'nun dB değeri f0'daki kazanca DOĞRUDAN eşit (Chromium'un ölçülen davranışıyla AYNI kimlik)", () => {
    for (const type of ["highpass", "lowpass"]) {
      for (const Qdb of [0.5, 1, 3, 5, 10]) {
        const db = biquadMagnitudeDb({ type, frequency: 1000, Q: Qdb }, 1000, SR);
        assert.ok(Math.abs(db - Qdb) < 0.0001, `${type} Q=${Qdb}dB: f0'daki kazanç ${db}dB (${Qdb} bekleniyordu)`);
      }
    }
  });
});

describe("estimateChainGainDb() — pembe-gürültü-ağırlıklı ortalama", () => {
  it("dar-Q bir peaking boost'un ortalama etkisi PİK gain'den KÜÇÜK büyüklükte (sadece dar bir bant etkileniyor)", () => {
    const peakGain = 6;
    const effective = estimateChainGainDb([{ type: "peaking", frequency: 1000, Q: 4, gain: peakGain }], { sampleRate: SR });
    assert.ok(effective > 0, "boost pozitif kalmalı");
    assert.ok(effective < peakGain, `ortalama etki (${effective}dB) pik gain'den (${peakGain}dB) küçük olmalı`);
  });

  it("gain'i büyütmek/Q'yu daraltmak ortalama etkiyi tutarlı yönde değiştirir (monoton)", () => {
    const wideQ = estimateChainGainDb([{ type: "peaking", frequency: 1000, Q: 1, gain: 6 }], { sampleRate: SR });
    const narrowQ = estimateChainGainDb([{ type: "peaking", frequency: 1000, Q: 8, gain: 6 }], { sampleRate: SR });
    assert.ok(wideQ > narrowQ, `geniş Q (${wideQ}dB) dar Q'dan (${narrowQ}dB) daha büyük ortalama etki taşımalı`);
  });

  it("boş zincir 0dB döner", () => {
    assert.equal(estimateChainGainDb([], { sampleRate: SR }), 0);
  });

  it("REF_POINTS yakınsaması: iç örnek sayısını artırmak sonucu <0.01dB değiştirir", () => {
    const params = [{ type: "peaking", frequency: 733, Q: 2.5, gain: 6 }];
    const at256 = estimateChainGainDb(params, { sampleRate: SR, points: 256 });
    const at2048 = estimateChainGainDb(params, { sampleRate: SR, points: 2048 });
    assert.ok(Math.abs(at256 - at2048) < 0.01, `256 örnek (${at256}dB) ile 2048 örnek (${at2048}dB) arasındaki fark <0.01dB olmalı`);
  });
});

describe("KABUL KRİTERİ — boost ve cut durumlarında telafi sonrası çıkış seviyesi ölçülebilir şekilde eşit", () => {
  // Boost mu Cut mu modunun GERÇEK parametreleriyle (FILTER_Q=1.4, gainDb ±).
  const FILTER_Q = 1.4;

  it("simetrik +6dB boost ile -6dB cut, telafi SONRASI aynı (~0dB) etkiye sahip", () => {
    const boostDb = estimateChainGainDb([{ type: "peaking", frequency: 1000, Q: FILTER_Q, gain: 6 }], { sampleRate: SR });
    const cutDb = estimateChainGainDb([{ type: "peaking", frequency: 1000, Q: FILTER_Q, gain: -6 }], { sampleRate: SR });

    const boostCompDb = 20 * Math.log10(compensationGainLinear(boostDb));
    const cutCompDb = 20 * Math.log10(compensationGainLinear(cutDb));

    const boostAfterComp = boostDb + boostCompDb;
    const cutAfterComp = cutDb + cutCompDb;

    assert.ok(Math.abs(boostAfterComp) < 0.01, `telafi sonrası boost etkisi ${boostAfterComp}dB (0'a yakın olmalı)`);
    assert.ok(Math.abs(cutAfterComp) < 0.01, `telafi sonrası cut etkisi ${cutAfterComp}dB (0'a yakın olmalı)`);
    assert.ok(Math.abs(boostAfterComp - cutAfterComp) < 0.01, "boost ve cut, telafi sonrası ÖLÇÜLEBİLİR şekilde eşit olmalı");
  });

  it("telafi kazancı trivial 1:1 tersi DEĞİL — dar-Q'da |effectiveDb| < |peakGain| (gerçek broadband hesap, sabit kopyalama değil)", () => {
    const effectiveDb = estimateChainGainDb([{ type: "peaking", frequency: 733, Q: FILTER_Q, gain: 6 }], { sampleRate: SR });
    assert.ok(Math.abs(effectiveDb) < 6, `broadband etki (${effectiveDb}dB) pik gain'in (6dB) TAMAMI değil, ağırlıklı bir kısmı olmalı`);
    assert.ok(Math.abs(effectiveDb) > 0.5, `broadband etki (${effectiveDb}dB) anlamlı büyüklükte olmalı, sıfıra yakın değil`);
  });

  it("kesim-noktası tipi bir HPF/LPF için de telafi hesaplanabilir (gain parametresi yok, sadece tip/frekans/Q)", () => {
    const hpfDb = estimateChainGainDb([{ type: "highpass", frequency: 2000, Q: 0.707 }], { sampleRate: SR });
    const lpfDb = estimateChainGainDb([{ type: "lowpass", frequency: 200, Q: 0.707 }], { sampleRate: SR });
    assert.ok(hpfDb < 0, "geniş bantlı bir HPF ortalama enerjiyi düşürmeli (düşük frekansları kesiyor)");
    assert.ok(lpfDb < 0, "geniş bantlı bir LPF ortalama enerjiyi düşürmeli (yüksek frekansları kesiyor)");
    assert.ok(Number.isFinite(compensationGainLinear(hpfDb)) && compensationGainLinear(hpfDb) > 1, "HPF telafisi kazancı ARTIRMALI (kayıp telafi ediliyor)");
    assert.ok(Number.isFinite(compensationGainLinear(lpfDb)) && compensationGainLinear(lpfDb) > 1, "LPF telafisi kazancı ARTIRMALI (kayıp telafi ediliyor)");
  });
});

// G271 — OLCUM-KESIM-17-08.md bulgusu: estimateChainGainDb'nin pembe-gürültü
// VARSAYIMI, bas-ağırlıklı GERÇEK kaynaklarda (HPF ile) ve tiz-ağırlıklı
// kaynaklarda (LPF ile, simetrik) çöküyor. Bu blok YENİ eklenen üç fonksiyonu
// (bandpassPower/computeSourcePsd/estimateChainGainDbWeighted) test ediyor —
// biquadMagnitudeDb/estimateChainGainDb/compensationGainLinear yukarıdaki
// testlerle DEĞİŞMEDEN kapsanmaya devam ediyor.
describe("bandpassPower() — RBJ bant-geçiren IIR'ın temel doğruluğu", () => {
  it("saf sinüs, KENDİ frekansına merkezlenmiş bantta merkezden UZAK bir bant geçenden çok daha güçlü ölçülür", () => {
    const sr = 44100;
    const n = sr; // 1 saniye
    const freq = 1000;
    const samples = new Float32Array(n);
    for (let i = 0; i < n; i++) samples[i] = Math.sin((2 * Math.PI * freq * i) / sr);
    const onBand = bandpassPower(samples, sr, 1000);
    const offBand = bandpassPower(samples, sr, 8000);
    assert.ok(onBand > offBand * 100, `1000Hz sinüs için 1000Hz bandı (${onBand}) 8000Hz bandından (${offBand}) çok daha güçlü olmalı`);
  });

  it("geçersiz girdide (boş dizi/sıfır örnekleme hızı) 0 döner, atmaz", () => {
    assert.equal(bandpassPower(new Float32Array(0), 44100, 1000), 0);
    assert.equal(bandpassPower(new Float32Array(100), 0, 1000), 0);
    assert.equal(bandpassPower(null, 44100, 1000), 0);
  });
});

describe("computeSourcePsd() — bant-geçiren filtre bankası PSD tahmini", () => {
  it("çıktı uzunluğu `points` ile eşleşir, TÜM güçler sonlu ve negatif değil", () => {
    const sr = 44100;
    const samples = new Float32Array(sr);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const psd = computeSourcePsd(samples, sr, 48);
    assert.equal(psd.freqs.length, 48);
    assert.equal(psd.powers.length, 48);
    for (const p of psd.powers) {
      assert.ok(Number.isFinite(p) && p >= 0, `güç ${p} sonlu ve negatif olmayan olmalı`);
    }
  });

  it("düşük frekanslı bir sinüs, PSD'de EN YÜKSEK gücü kendi frekansına yakın bantta verir", () => {
    const sr = 44100;
    const n = sr;
    const freq = 150;
    const samples = new Float32Array(n);
    for (let i = 0; i < n; i++) samples[i] = Math.sin((2 * Math.PI * freq * i) / sr);
    const psd = computeSourcePsd(samples, sr, 48);
    let maxIdx = 0;
    for (let i = 1; i < psd.powers.length; i++) if (psd.powers[i] > psd.powers[maxIdx]) maxIdx = i;
    assert.ok(Math.abs(psd.freqs[maxIdx] - freq) < freq, `en güçlü bant (${psd.freqs[maxIdx]}Hz) 150Hz'e yakın olmalı, uzak bir bant (ör. tiz) ÇIKMAMALI`);
  });
});

describe("estimateChainGainDbWeighted() — PSD-ağırlıklı telafi, KABUL KRİTERİ (OLCUM-KESIM-17-08.md madde D)", () => {
  const SR2 = 44100;

  it("geçersiz/eksik girdide null döner (çağıran tarafın eskiye düşme sinyali)", () => {
    const filterParams = [{ type: "highpass", frequency: 1000, Q: 0.707 }];
    assert.equal(estimateChainGainDbWeighted([], { freqs: [100], powers: [1] }, { sampleRate: SR2 }), null);
    assert.equal(estimateChainGainDbWeighted(filterParams, null, { sampleRate: SR2 }), null);
    assert.equal(estimateChainGainDbWeighted(filterParams, { freqs: [], powers: [] }, { sampleRate: SR2 }), null);
    assert.equal(estimateChainGainDbWeighted(filterParams, { freqs: [100], powers: [1] }, { sampleRate: 0 }), null);
    assert.equal(estimateChainGainDbWeighted(filterParams, { freqs: [100], powers: [0] }, { sampleRate: SR2 }), null, "TÜM güçler 0/negatifse (sumPower<=0) null dönmeli");
  });

  it("düz (flat) PSD ile estimateChainGainDb'nin log-uniform ortalamasına YAKIN sonuç verir (AYNI matematiğin özel bir hâli)", () => {
    const filterParams = [{ type: "highpass", frequency: 2000, Q: 0.707 }];
    const points = 256;
    const logMin = Math.log(20), logMax = Math.log(20000);
    const freqs = [], powers = [];
    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      freqs.push(Math.exp(logMin + (logMax - logMin) * t));
      powers.push(1); // DÜZ ağırlık — log-uniform ortalamanın KENDİSİ
    }
    const weighted = estimateChainGainDbWeighted(filterParams, { freqs, powers }, { sampleRate: SR2 });
    const uniform = estimateChainGainDb(filterParams, { sampleRate: SR2, points });
    assert.ok(Math.abs(weighted - uniform) < 0.05, `düz PSD ile ağırlıklı (${weighted}dB) log-uniform (${uniform}dB) ile ÖRTÜŞMELİ`);
  });

  it("KABUL KRİTERİ — bas-ağırlıklı PSD + HPF: PSD-ağırlıklı telafi, düz(pembe)-varsayımlı telafiden DAHA GÜÇLÜ (daha negatif) — OLCUM-KESIM-17-08'in bulduğu eksik-telafiyi KAPATMA yönünde", () => {
    // Bas-ağırlıklı PSD: güç düşük frekanslarda YÜKSEK, yükseldikçe düşüyor (1/f^2 benzeri).
    const points = 48;
    const logMin = Math.log(20), logMax = Math.log(20000);
    const freqs = [], bassHeavyPowers = [], flatPowers = [];
    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      const f = Math.exp(logMin + (logMax - logMin) * t);
      freqs.push(f);
      bassHeavyPowers.push(1 / (f * f));
      flatPowers.push(1);
    }
    const filterParams = [{ type: "highpass", frequency: 2000, Q: 0.707 }];
    const bassWeightedDb = estimateChainGainDbWeighted(filterParams, { freqs, powers: bassHeavyPowers }, { sampleRate: SR2 });
    const flatWeightedDb = estimateChainGainDbWeighted(filterParams, { freqs, powers: flatPowers }, { sampleRate: SR2 });
    assert.ok(bassWeightedDb < flatWeightedDb, `bas-ağırlıklı PSD'nin telafi-öncesi etkisi (${bassWeightedDb}dB) düz PSD'den (${flatWeightedDb}dB) DAHA NEGATİF olmalı — HPF gerçekte daha çok enerji siliyor`);
    assert.ok(compensationGainLinear(bassWeightedDb) > compensationGainLinear(flatWeightedDb), "bas-ağırlıklı kaynak için telafi kazancı düz varsayımdan DAHA BÜYÜK olmalı");
  });

  it("SİMETRİK — tiz-ağırlıklı PSD + LPF: AYNI desen ters yönde (bas-ağırlıklı+HPF'nin aynası)", () => {
    const points = 48;
    const logMin = Math.log(20), logMax = Math.log(20000);
    const freqs = [], trebleHeavyPowers = [], flatPowers = [];
    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      const f = Math.exp(logMin + (logMax - logMin) * t);
      freqs.push(f);
      trebleHeavyPowers.push(f * f);
      flatPowers.push(1);
    }
    const filterParams = [{ type: "lowpass", frequency: 500, Q: 0.707 }];
    const trebleWeightedDb = estimateChainGainDbWeighted(filterParams, { freqs, powers: trebleHeavyPowers }, { sampleRate: SR2 });
    const flatWeightedDb = estimateChainGainDbWeighted(filterParams, { freqs, powers: flatPowers }, { sampleRate: SR2 });
    assert.ok(trebleWeightedDb < flatWeightedDb, `tiz-ağırlıklı PSD'nin telafi-öncesi etkisi (${trebleWeightedDb}dB) düz PSD'den (${flatWeightedDb}dB) DAHA NEGATİF olmalı — LPF gerçekte daha çok enerji siliyor`);
  });
});

// A/B loudness eşitleme (Düzeltme 1, TUR8-OGRETIM-15-08 bulgusu 🔴) — RBJ biquad
// matematiğinin doğruluğu + telafi kazancının GERÇEKTEN boost/cut çıkışını eşitlediği
// ölçülüyor (tahmini bir sabit değil, gerçek matematik — kabul kriteri: bkz. son test).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { biquadMagnitudeDb, estimateChainGainDb, compensationGainLinear } from "../www/js/core/eq-loudness.js";

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

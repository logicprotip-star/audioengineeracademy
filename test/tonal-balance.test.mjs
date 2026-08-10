// tonal-balance.js testleri — SADECE saf kısımlar (summarizeDeviation, BANDS/
// BAND_EDGES/DRAFT_TARGET_CURVES tutarlılığı). measureSpectralDeviation()
// gerçek Web Audio OfflineAudioContext/AnalyserNode gerektirir — Node'da
// bu API YOK, bu yüzden SADECE tarayıcıda canlı test edilebilir (bkz.
// DURUM.md G101 kaydı, canlı doğrulama notu).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BANDS, BAND_EDGES, DRAFT_TARGET_CURVES, OFF_TARGET_THRESHOLD_DB, summarizeDeviation, bandDevsFromLiveSnapshot } from "../www/js/core/tonal-balance.js";
import { FA_ZONES } from "../www/js/modes/frekans-bulma.js";

describe("tonal-balance.js — BANDS/BAND_EDGES, Frekans Bulma'nın FA_ZONES'uyla TUTARLI mı", () => {
  it("6 bant, FA_ZONES ile AYNI sayıda", () => {
    assert.equal(BANDS.length, 6);
    assert.equal(BAND_EDGES.length, 7);
    assert.equal(FA_ZONES.length, 6);
  });

  it("BAND_EDGES, FA_ZONES'un a/b sınırlarıyla BİREBİR eşleşir (aynı 6 frekans bölgesi TEKRAR TANIMLANMADI)", () => {
    assert.equal(BAND_EDGES[0], FA_ZONES[0].a);
    for (let i = 0; i < FA_ZONES.length; i++) {
      assert.equal(BAND_EDGES[i + 1], FA_ZONES[i].b);
    }
  });

  it("BANDS etiketleri FA_ZONES'un kısa adlarıyla eşleşir (SUB/BAS/ALT-ORTA/ORTA/ÜST-ORTA/TİZ)", () => {
    assert.deepEqual(BANDS, ["SUB", "BAS", "ALT-ORTA", "ORTA", "ÜST-ORTA", "TİZ"]);
  });
});

describe("tonal-balance.js — DRAFT_TARGET_CURVES (taslak, Araçlar.dc.html'den birebir)", () => {
  it("üç taslak hedef (Pop/EDM/Akustik), her biri 6 bant için sayı", () => {
    for (const name of ["Pop", "EDM", "Akustik"]) {
      assert.ok(Array.isArray(DRAFT_TARGET_CURVES[name]));
      assert.equal(DRAFT_TARGET_CURVES[name].length, 6);
      for (const v of DRAFT_TARGET_CURVES[name]) assert.ok(Number.isFinite(v));
    }
  });
});

describe("tonal-balance.js — summarizeDeviation()", () => {
  it("tüm bantlar eşikte (±1.5dB içinde) → allWithinTarget=true, offBands boş", () => {
    const r = summarizeDeviation([0.5, -0.5, 1.0, -1.0, 1.4, -1.4]);
    assert.equal(r.allWithinTarget, true);
    assert.equal(r.offBands.length, 0);
  });

  it("bazı bantlar eşik dışı → doğru bantlar/isimler listelenir", () => {
    const r = summarizeDeviation([2.0, 0, 0, -2.0, 0, 0]);
    assert.equal(r.allWithinTarget, false);
    assert.equal(r.offBands.length, 2);
    assert.equal(r.offBands[0].name, "SUB");
    assert.equal(r.offBands[1].name, "ORTA");
  });

  it("eşik TAM sınırda (1.5) DAHİL SAYILMAZ (>1.5 kuralı, task'ın kendi eşiği)", () => {
    const r = summarizeDeviation([OFF_TARGET_THRESHOLD_DB, 0, 0, 0, 0, 0]);
    assert.equal(r.offBands.length, 0);
  });
});

// G102 — canlı analizör (Tonal Balance: mutlak gösterim + rAF akışı) için
// eklenen SAF fonksiyon. Node'da gerçek AnalyserNode yok — bu yüzden
// getFloatFrequencyData()'nın döndürdüğü şekli ELLE üretiyoruz (Float32Array,
// bin[i] = i*binHz frekansındaki dB değeri).
describe("tonal-balance.js — bandDevsFromLiveSnapshot() (G102, canlı kare → bant sapması)", () => {
  const sampleRate = 48000, fftSize = 8192;
  const binHz = sampleRate / fftSize;
  const binCount = fftSize / 2;

  function freqDataWithLoudBand(loudFrom, loudTo, loudDb, baseDb) {
    const data = new Float32Array(binCount).fill(baseDb);
    for (let bin = 1; bin < binCount; bin++) {
      const f = bin * binHz;
      if (f >= loudFrom && f < loudTo) data[bin] = loudDb;
    }
    return data;
  }

  it("measureSpectralDeviation ile AYNI tanımı kullanır: sadece SUB'da yüksek enerji → SUB pozitif, diğerleri negatif sapma", () => {
    const data = freqDataWithLoudBand(BAND_EDGES[0], BAND_EDGES[1], -20, -60);
    const devs = bandDevsFromLiveSnapshot(data, sampleRate, fftSize);
    assert.equal(devs.length, 6);
    assert.ok(devs[0] > 0, `SUB pozitif olmalı, geldi: ${devs[0]}`);
    for (let i = 1; i < 6; i++) assert.ok(devs[i] < 0, `bant ${i} negatif olmalı, geldi: ${devs[i]}`);
  });

  it("tüm bantlar eşit enerjideyse tüm sapmalar ~0'dır", () => {
    const data = new Float32Array(binCount).fill(-40);
    const devs = bandDevsFromLiveSnapshot(data, sampleRate, fftSize);
    devs.forEach((d) => assert.ok(Math.abs(d) < 1e-9, `sapma 0'a yakın olmalı, geldi: ${d}`));
  });

  it("hiçbir bin sonlu (finite) değilse (ör. sessizlik/dolmamış buffer) 6 elemanlı sıfır dizisi döner, NaN/undefined DEĞİL", () => {
    const data = new Float32Array(binCount).fill(-Infinity);
    const devs = bandDevsFromLiveSnapshot(data, sampleRate, fftSize);
    assert.deepEqual(devs, [0, 0, 0, 0, 0, 0]);
  });
});

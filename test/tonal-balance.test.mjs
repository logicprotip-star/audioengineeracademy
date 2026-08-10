// tonal-balance.js testleri — SADECE saf kısımlar (summarizeDeviation, BANDS/
// BAND_EDGES/DRAFT_TARGET_CURVES tutarlılığı). measureSpectralDeviation()
// gerçek Web Audio OfflineAudioContext/AnalyserNode gerektirir — Node'da
// bu API YOK, bu yüzden SADECE tarayıcıda canlı test edilebilir (bkz.
// DURUM.md G101 kaydı, canlı doğrulama notu).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BANDS, BAND_EDGES, DRAFT_TARGET_CURVES, OFF_TARGET_THRESHOLD_DB, summarizeDeviation } from "../www/js/core/tonal-balance.js";
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

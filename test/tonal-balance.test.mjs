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

  // G103: "nötr" giriş artık pembe eğimli (bkz. aşağıdaki pinkFreqData) —
  // SUB'u pembe tabanın ÜSTÜNE +20dB çıkarırsak SUB pozitif, DİĞER BEŞ bant
  // (ortalama SUB'un yukarı çekmesiyle) eşit ve makul negatif olmalı.
  function pinkFreqDataWithSubBoost(boostDb) {
    const data = new Float32Array(binCount).fill(-Infinity);
    for (let bin = 1; bin < binCount; bin++) {
      const f = bin * binHz;
      if (f < BAND_EDGES[0] || f >= BAND_EDGES[6]) continue;
      let db = -10 * Math.log10(f);
      if (f >= BAND_EDGES[0] && f < BAND_EDGES[1]) db += boostDb;
      data[bin] = db;
    }
    return data;
  }

  it("measureSpectralDeviation ile AYNI tanımı kullanır: SUB pembe tabanın üstüne çıkarılınca SUB pozitif, diğer beş bant negatif sapma", () => {
    const devs = bandDevsFromLiveSnapshot(pinkFreqDataWithSubBoost(20), sampleRate, fftSize);
    assert.equal(devs.length, 6);
    assert.ok(devs[0] > 0, `SUB pozitif olmalı, geldi: ${devs[0]}`);
    for (let i = 1; i < 6; i++) assert.ok(devs[i] < 0, `bant ${i} negatif olmalı, geldi: ${devs[i]}`);
  });

  // G103 — pembe-eğim telafisinden SONRA "nötr" (sapmasız) referans artık
  // DÜZ dB DEĞİL, PEMBE gürültü şeklidir (power(f) ∝ 1/f, doğrusal bin'de
  // −3dB/oktav) — gerçek geniş-bant programın doğal eğimini temsil eder.
  function pinkFreqData() {
    const data = new Float32Array(binCount).fill(-Infinity);
    for (let bin = 1; bin < binCount; bin++) {
      const f = bin * binHz;
      if (f < BAND_EDGES[0] || f >= BAND_EDGES[6]) continue;
      data[bin] = -10 * Math.log10(f);
    }
    return data;
  }

  it("pembe eğimli (1/f) giriş TÜM bantlarda ~0dB sapma verir (G103'ün telafi ettiği DOĞAL eğim)", () => {
    const devs = bandDevsFromLiveSnapshot(pinkFreqData(), sampleRate, fftSize);
    devs.forEach((d, i) => assert.ok(Math.abs(d) < 0.01, `bant ${i} ~0 olmalı, geldi: ${d}`));
  });

  it("DÜZ (her frekansta AYNI dB) giriş artık YUKARI eğimli okunur — pembe telafisi flat/white'ı DEĞİL pembe'yi nötr sayar", () => {
    const data = new Float32Array(binCount).fill(-Infinity);
    for (let bin = 1; bin < binCount; bin++) {
      const f = bin * binHz;
      if (f >= BAND_EDGES[0] && f < BAND_EDGES[6]) data[bin] = -40;
    }
    const devs = bandDevsFromLiveSnapshot(data, sampleRate, fftSize);
    for (let i = 1; i < 6; i++) assert.ok(devs[i] > devs[i - 1], `bant ${i} bir öncekinden yüksek olmalı (monoton artan), geldi: ${devs.map(v=>v.toFixed(1))}`);
  });

  it("hiçbir bin sonlu (finite) değilse (ör. sessizlik/dolmamış buffer) 6 elemanlı sıfır dizisi döner, NaN/undefined DEĞİL", () => {
    const data = new Float32Array(binCount).fill(-Infinity);
    const devs = bandDevsFromLiveSnapshot(data, sampleRate, fftSize);
    assert.deepEqual(devs, [0, 0, 0, 0, 0, 0]);
  });

  // G103 — REGRESYON: canlı cihaz testinde bulunan kök sebep. BAND_EDGES
  // logaritmik aralıklı olduğu için TİZ bandı SUB'dan YÜZLERCE kat fazla bin
  // içeriyor (binHz sabit). Eskiden bant ortalaması dB DEĞERLERİNİ doğrudan
  // aritmetik ortalıyordu (ESKİ, YANLIŞ yöntem) — TİZ'e serpiştirilmiş
  // neredeyse-sessiz (ama sıfır DEĞİL, gerçek bir gürültü tabanı gibi
  // −60dB daha sessiz) bin'ler ortalamayı GERÇEK enerjiden çok daha aşağı
  // çekiyordu. Kurulum: TÜM bantlar pembe-nötr (~0dB sapma verir, üstteki
  // teste bkz.) SEÇMELİ olarak TİZ'in bin'lerinin SADECE 1/10'u pembe
  // seviyesinde, kalanı −60dB daha sessiz (dijital sessizlik DEĞİL).
  it("Pembe-nötr TİZ bandına seyrek+gürültü-tabanlı dolgu eklenince güç-domeninde ortalama MAKUL bir sapma üretir, ESKİ yöntemin ürettiği aşırı sapmayı DEĞİL", () => {
    const data = new Float32Array(binCount).fill(-Infinity);
    for (let bin = 1; bin < binCount; bin++) {
      const f = bin * binHz;
      if (f < BAND_EDGES[0] || f >= BAND_EDGES[6]) continue;
      const pinkDb = -10 * Math.log10(f);
      if (f >= BAND_EDGES[5] && f < BAND_EDGES[6]) {
        data[bin] = (bin % 10 === 0) ? pinkDb : (pinkDb - 60);
      } else {
        data[bin] = pinkDb;
      }
    }
    const devs = bandDevsFromLiveSnapshot(data, sampleRate, fftSize);
    // Diğer 5 bant birbirine yakın (~+1.7dB, TİZ'in düşüşünün altışının
    // ortalamasını aşağı çekmesinden) kalmalı, TİZ belirgin ama MAKUL
    // negatif olmalı — eski (dB aritmetik ortalama) yöntem TİZ'i çok daha
    // aşırı (~−45dB mertebesinde) bir sapmaya iterdi.
    for (let i = 0; i < 5; i++) assert.ok(devs[i] > 0 && devs[i] < 5, `bant ${i} makul pozitif olmalı, geldi: ${devs[i].toFixed(2)}`);
    assert.ok(devs[5] < -3 && devs[5] > -15, `TİZ makul negatif olmalı (aşırı DEĞİL), geldi: ${devs[5].toFixed(2)}`);
  });
});

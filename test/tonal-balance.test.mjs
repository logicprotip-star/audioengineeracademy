// tonal-balance.js testleri — SADECE saf kısımlar (summarizeDeviation, BANDS/
// BAND_EDGES/DRAFT_TARGET_CURVES tutarlılığı). measureSpectralDeviation()
// gerçek Web Audio OfflineAudioContext/AnalyserNode gerektirir — Node'da
// bu API YOK, bu yüzden SADECE tarayıcıda canlı test edilebilir (bkz.
// DURUM.md G101 kaydı, canlı doğrulama notu).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BANDS, BAND_EDGES, DRAFT_TARGET_CURVES, OFF_TARGET_THRESHOLD_DB, summarizeDeviation, bandDevsFromLiveSnapshot, bandCenterFreqs, computeReferenceEqGainsDb, lufsMatchGainDb, dbToLinearGain, REFERENCE_EQ_GAIN_CLAMP_DB, LUFS_MATCH_GAIN_CLAMP_DB } from "../www/js/core/tonal-balance.js";
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

// G127 — "Kendi referansım" (devFlags.customTonalRef arkasında gizli) için
// eklenen SAF yardımcılar. Bu fonksiyonlar bayrak DURUMUNDAN BAĞIMSIZ HER
// ZAMAN var/testli — bayrak SADECE app.js'in bunları ÇAĞIRIP ÇAĞIRMAYACAĞINI
// (UI'dan erişim) kontrol eder, bkz. DURUM.md'nin bu turdaki Playwright
// doğrulama notu (flag kapalıyken kart/çip hiç render edilmiyor, bu saf
// fonksiyonlar hiç invoke edilmiyor).
describe("tonal-balance.js — bandCenterFreqs() (G127, EQ-eşleme zincirinin bant merkez frekansları)", () => {
  it("6 frekans, her biri kendi bandının [lo,hi) aralığında (geometrik ortalama)", () => {
    const centers = bandCenterFreqs();
    assert.equal(centers.length, 6);
    for (let i = 0; i < 6; i++) {
      assert.ok(centers[i] > BAND_EDGES[i] && centers[i] < BAND_EDGES[i + 1], `bant ${i} merkezi (${centers[i]}) [${BAND_EDGES[i]},${BAND_EDGES[i + 1]}) dışında`);
    }
  });
  it("frekans-bulma.js'in focusIdForZone'uyla AYNI formül (geometrik ortalama, log-orta nokta) — SUB için sqrt(20*120)", () => {
    const centers = bandCenterFreqs();
    assert.ok(Math.abs(centers[0] - Math.sqrt(20 * 120)) < 1e-9);
  });
  it("artan sırada (bant sırasıyla TUTARLI)", () => {
    const centers = bandCenterFreqs();
    for (let i = 1; i < 6; i++) assert.ok(centers[i] > centers[i - 1]);
  });
});

describe("tonal-balance.js — computeReferenceEqGainsDb() (G127 madde 5, 'Referans eğrisiyle dinle')", () => {
  it("mix ref'in altındaysa (daha az enerji) pozitif kazanç (yükseltme) üretir", () => {
    const gains = computeReferenceEqGainsDb([-2, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]);
    assert.equal(gains[0], 2);
    assert.deepEqual(gains.slice(1), [0, 0, 0, 0, 0]);
  });
  it("mix ref'in üstündeyse negatif kazanç (kısma) üretir", () => {
    const gains = computeReferenceEqGainsDb([0, 3, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]);
    assert.equal(gains[1], -3);
  });
  it("mix, ref'e UYGULANDIĞINDA (mixDevs+gains) TAM OLARAK refDevs'e eşit olur — bu, app.js'in ofline render testinin matematiksel garantisidir", () => {
    const mixDevs = [-1.2, 0.8, -2.1, 1.5, 0.3, -0.6];
    const refDevs = [0.4, -0.3, 1.1, -0.2, 2.0, -1.8];
    const gains = computeReferenceEqGainsDb(mixDevs, refDevs);
    const corrected = mixDevs.map((d, i) => d + gains[i]);
    corrected.forEach((v, i) => assert.ok(Math.abs(v - refDevs[i]) < 1e-9, `bant ${i}: ${v} !== ${refDevs[i]}`));
  });
});

describe("tonal-balance.js — lufsMatchGainDb() / dbToLinearGain() (G127 madde 4, A/B seviye eşitlemesi)", () => {
  it("kaynak hedeften SESSİZSE (daha düşük LUFS) pozitif dB (yükseltme) döner", () => {
    assert.equal(lufsMatchGainDb(-20, -14), 6);
  });
  it("kaynak hedeften YÜKSEKSE negatif dB (kısma) döner", () => {
    assert.equal(lufsMatchGainDb(-10, -14), -4);
  });
  it("aynı LUFS → 0 dB, kazanç değişmez", () => {
    assert.equal(lufsMatchGainDb(-16, -16), 0);
    assert.equal(dbToLinearGain(0), 1);
  });
  it("+6.02dB ≈ 2x doğrusal kazanç (standart dB↔lineer dönüşüm)", () => {
    assert.ok(Math.abs(dbToLinearGain(20 * Math.log10(2)) - 2) < 1e-9);
  });
  it("iki kaynağa AYNI hedefe göre hesaplanan kazanç uygulanınca AYNI seviyeye gelir — A/B'nin 'adil karşılaştırma' garantisi", () => {
    const targetLufs = -14;
    const aLufs = -18, bLufs = -11;
    const aGainDb = lufsMatchGainDb(aLufs, targetLufs);
    const bGainDb = lufsMatchGainDb(bLufs, targetLufs);
    const aResultLufs = aLufs + aGainDb; // dB alanında kazanç eklemek LUFS'u AYNI miktarda kaydırır
    const bResultLufs = bLufs + bGainDb;
    assert.ok(Math.abs(aResultLufs - targetLufs) < 1e-9);
    assert.ok(Math.abs(bResultLufs - targetLufs) < 1e-9);
    assert.ok(Math.abs(aResultLufs - bResultLufs) < 1e-9, "A ve B AYNI hedefe eşitlendiği için birbirine de eşit olmalı");
  });
});

describe("tonal-balance.js — Düzeltme 1 KABUL KRİTERİ (TUR9-ARACLAR-15-08 bulgusu 🔴): kazançlar ±12dB'ye kırpılıyor, işitme güvenliği", () => {
  it("REFERENCE_EQ_GAIN_CLAMP_DB / LUFS_MATCH_GAIN_CLAMP_DB ikisi de 12dB — tek/tutarlı politika", () => {
    assert.equal(REFERENCE_EQ_GAIN_CLAMP_DB, 12);
    assert.equal(LUFS_MATCH_GAIN_CLAMP_DB, 12);
  });

  it("computeReferenceEqGainsDb — ÇOK FARKLI iki dosya (bir bant neredeyse sessiz, biri çok baskın) ±12dB'nin İÇİNDE kalır", () => {
    // Gerçekçi bir aşırı senaryo: mix bir bantta -30dB (neredeyse sessiz),
    // referans o bantta +10dB (çok baskın) — ham fark 40dB olurdu.
    const gains = computeReferenceEqGainsDb([-30, 0, 0, 0, 0, 0], [10, 0, 0, 0, 0, 0]);
    assert.equal(gains[0], REFERENCE_EQ_GAIN_CLAMP_DB, "ham fark (40dB) sınıra KIRPILMALI");
    assert.ok(Math.abs(gains[0]) <= REFERENCE_EQ_GAIN_CLAMP_DB);
  });

  it("computeReferenceEqGainsDb — ters yönde de (mix çok baskın, ref sessiz) simetrik kırpılır", () => {
    const gains = computeReferenceEqGainsDb([25, 0, 0, 0, 0, 0], [-15, 0, 0, 0, 0, 0]);
    assert.equal(gains[0], -REFERENCE_EQ_GAIN_CLAMP_DB);
  });

  it("computeReferenceEqGainsDb — sınırın ALTINDAKİ farklar (normal kullanım, DRAFT_TARGET_CURVES'in kendi ±10.9dB uç değeri dahil) HİÇ kırpılmadan geçer", () => {
    const gains = computeReferenceEqGainsDb([0, 0, 0, 0, 0, 0], [10.9, -10.9, 5, -5, 1.5, -1.5]);
    assert.deepEqual(gains, [10.9, -10.9, 5, -5, 1.5, -1.5], "sınırın altındaki hiçbir değer değişmemeli");
  });

  it("computeReferenceEqGainsDb — bir bandın deviasyonu -Infinity/+Infinity olsa bile (tamamen sessiz bant) sonuç sınıra düşer, asla Infinity/NaN SIZMAZ", () => {
    const gains = computeReferenceEqGainsDb([-Infinity, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]);
    assert.equal(gains[0], REFERENCE_EQ_GAIN_CLAMP_DB);
    assert.ok(Number.isFinite(gains[0]));
  });

  it("lufsMatchGainDb — ÇOK FARKLI iki dosyanın (biri neredeyse sessiz -40 LUFS, biri yüksek -8 LUFS) ham farkı (32dB) ±12dB'ye kırpılır", () => {
    const gainDb = lufsMatchGainDb(-40, -8);
    assert.equal(gainDb, LUFS_MATCH_GAIN_CLAMP_DB);
  });

  it("lufsMatchGainDb — sourceLufs=-Infinity (tam sessizlik) durumunda Infinity/NaN SIZMAZ, sınıra düşer", () => {
    const gainDb = lufsMatchGainDb(-Infinity, -14);
    assert.equal(gainDb, LUFS_MATCH_GAIN_CLAMP_DB);
    assert.ok(Number.isFinite(gainDb));
  });

  it("lufsMatchGainDb — HEM source HEM target -Infinity ise (NaN üretecek matematiksel durum) güvenli 0 döner", () => {
    const gainDb = lufsMatchGainDb(-Infinity, -Infinity);
    assert.equal(gainDb, 0);
  });

  it("KABUL KRİTERİ — kırpılmış kazanç doğrusal alanda ÖLÇÜLEBİLİR şekilde güvenli sınırda kalır (±12dB = ~×3.98/×0.251 doğrusal kazanç, ×10 DEĞİL)", () => {
    const gainDb = computeReferenceEqGainsDb([-40], [10])[0];
    const linear = dbToLinearGain(gainDb);
    assert.ok(Math.abs(linear - 3.9811) < 0.001, `+12dB doğrusal kazancı ~3.98 olmalı, ${linear} çıktı`);
    assert.ok(linear < 10, "ham (kırpılmamış) 50dB'lik farkın doğrusal kazancı (~316x) ile KIYASLANAMAYACAK kadar küçük — güvenlik sınırı ÇALIŞIYOR");
  });
});

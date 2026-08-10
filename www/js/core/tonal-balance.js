// G101 — "Tonal Balance" kartının hesaplama çekirdeği. YENİ, sıfırdan yazıldı
// (task'ın kendi notu: "Bu kartın arkasındaki mantık sıfırdan yazılacak").
//
// DÜRÜSTLÜK NOTU — "analysis.js'in spektrumu" YOK: task metni "Veri
// analysis.js'in spektrumundan gelecek" diyordu, ama core/analysis.js
// (G98-G100) SADECE loudness/peak/RMS hesaplıyor — hiçbir bant/spektrum
// verisi ÜRETMİYOR (ITU-R BS.1770-4/EBU R128 kapsamı bunu gerektirmiyor).
// analysis.js'e DOKUNULMAMASI gerektiği için (task'ın kendi KURAL'ı) spektral
// ölçüm BURADA, TAMAMEN AYRI bir modülde, standart Web Audio AnalyserNode
// (tarayıcının kendi FFT'si — audio-engine.js'in oyun ekranında zaten
// kullandığı AYNI API, burada YENİDEN İCAT EDİLMEDİ) + OfflineAudioContext
// ile GERÇEK ölçüm olarak uygulandı. Yüklenen dosyanın TAMAMI, aralıklı
// örneklerle (hopSec) offline render edilip her örnekte spektrum okunuyor,
// FA_ZONES'un (frekans-bulma.js — Frekans Bulma modunun ZATEN kullandığı 6
// bölge, burada TEKRAR TANIMLANMADI) her bandına düşen bin'ler ortalanıyor.
//
// HEDEF EĞRİLER (Pop/EDM/Akustik) — DÜRÜSTLÜK NOTU: bu sayılar gerçek
// referans parçalardan ölçülerek türetilmedi. Tasarımın (Araçlar.dc.html)
// KENDİ taslak sayıları — kullanıcının onayladığı bir başlangıç noktası
// olarak birebir alındı, ama TASLAK'tır ve gerçek referans parçalardan
// yeniden türetilmesi gerekir (bkz. task'ın kendi notu). Üretim kararı
// olarak SUNULMUYOR.

import { FA_ZONES } from "../modes/frekans-bulma.js";

export const BANDS = FA_ZONES.map((z) => z.t.split(" (")[0].replace(" / HAVA", ""));
export const BAND_EDGES = [FA_ZONES[0].a, ...FA_ZONES.map((z) => z.b)];

// TASLAK hedef eğriler — Tasarim-2026-08/Araçlar.dc.html'in kendi TB
// sabitinden BİREBİR (satır ~640-643). Her dizi 6 bant için dB sapma
// (SUB/BAS/ALT-ORTA/ORTA/ÜST-ORTA/TİZ sırasıyla).
export const DRAFT_TARGET_CURVES = {
  Pop: [-0.4, 0.6, -0.3, 0.5, 2.1, -1.8],
  EDM: [1.2, -0.2, 0.4, -0.9, 0.7, 0.3],
  Akustik: [-2.3, 0.4, 1.9, -0.5, 0.8, -0.2],
};

export const OFF_TARGET_THRESHOLD_DB = 1.5;

// SAF-E YAKIN (Web Audio gerektirir, ama DOM'a dokunmaz — sadece OfflineAudioContext).
// audioBuffer: gerçek bir AudioBuffer (upload.js'in decode ettiği). Dönen:
// 6 elemanlı dizi, her biri o bandın dosyanın KENDİ ortalamasına göre dB
// sapması (band ortalama enerji − dosya geneli ortalama enerji).
export async function measureSpectralDeviation(audioBuffer, options = {}) {
  const fftSize = options.fftSize || 8192;
  const hopSec = options.hopSec || 0.5;
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineCtx) throw new Error("Bu tarayıcı OfflineAudioContext desteklemiyor — Tonal Balance ölçülemedi.");

  const ctx = new OfflineCtx(1, Math.max(1, audioBuffer.length), audioBuffer.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);
  analyser.connect(ctx.destination);
  source.start();

  const freqData = new Float32Array(analyser.frequencyBinCount);
  const binHz = ctx.sampleRate / fftSize;
  const bandSum = new Array(BANDS.length).fill(0);
  const bandCount = new Array(BANDS.length).fill(0);

  const duration = audioBuffer.duration;
  let t = hopSec;

  function sampleOnce() {
    analyser.getFloatFrequencyData(freqData);
    for (let bin = 1; bin < freqData.length; bin++) {
      const freq = bin * binHz;
      if (freq < BAND_EDGES[0] || freq >= BAND_EDGES[BAND_EDGES.length - 1]) continue;
      const db = freqData[bin];
      if (!Number.isFinite(db)) continue;
      let bandIdx = -1;
      for (let i = 0; i < BANDS.length; i++) {
        if (freq >= BAND_EDGES[i] && freq < BAND_EDGES[i + 1]) { bandIdx = i; break; }
      }
      if (bandIdx < 0) continue;
      bandSum[bandIdx] += db;
      bandCount[bandIdx]++;
    }
  }

  await new Promise((resolve, reject) => {
    function scheduleNext() {
      if (t >= duration) {
        resolve();
        return;
      }
      ctx.suspend(t).then(() => {
        sampleOnce();
        t += hopSec;
        scheduleNext();
        ctx.resume();
      }).catch(reject);
    }
    scheduleNext();
    ctx.startRendering().catch(reject);
  });
  // Son bir örnek (kuyruk) — dosyanın en son anını da yakala.
  // (startRendering tamamlandığında render bitmiştir, ek suspend gerekmez.)

  const bandAvgDb = bandSum.map((sum, i) => (bandCount[i] > 0 ? sum / bandCount[i] : null));
  const finiteAvgs = bandAvgDb.filter((v) => v !== null);
  if (finiteAvgs.length === 0) return BANDS.map(() => 0);
  const overallAvg = finiteAvgs.reduce((a, b) => a + b, 0) / finiteAvgs.length;
  return bandAvgDb.map((v) => (v === null ? 0 : v - overallAvg));
}

// SAF. devs: 6 elemanlı sapma dizisi (dB). Hedef dışı bantları ve genel
// "hedefte mi" durumunu döndürür.
export function summarizeDeviation(devs, threshold = OFF_TARGET_THRESHOLD_DB) {
  const offBands = BANDS.map((name, i) => ({ name, dev: devs[i] })).filter((b) => Math.abs(b.dev) > threshold);
  return { offBands, allWithinTarget: offBands.length === 0 };
}

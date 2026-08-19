// G334 (OLCUM-FREKANS-DOGRULUK-19-08 KÖK SEBEP) — Kesim Noktası'nın belirtilen
// kesim frekansı ile GERÇEK -3dB noktası arasında ~473 sente kadar (yarım
// oktava yakın) sapma bulunmuştu. Kök sebep: Web Audio'da lowpass/highpass
// TİPİNDE `Q`, klasik kalite faktörü DEĞİL — "kesim noktasındaki rezonansın
// dB cinsinden değeri" (MDN). Eski `FILTER_Q = Math.SQRT1_2` (0.707) klasik
// Butterworth Q sanılarak seçilmişti, GERÇEKTE "+0.71dB rezonans" demekti.
//
// DÜZELTME: `FILTER_Q = 20*log10(Math.SQRT1_2)` (≈ -3.0103 dB) — klasik
// Butterworth Q'yu (1/√2) ÖNCE dB'ye çevirip Web Audio'nun Q parametresine
// yazıyor. KABUL KRİTERİ (task'ın kendi eşiği): sapma 10 sent altına insin.
//
// Bu test GERÇEK tarayıcıda (`BiquadFilterNode.getFrequencyResponse()`,
// istatistiksel gürültüsüz, tarayıcının KENDİ implementasyonunu sorgular)
// applyProcessing()'in ÜRETTİĞİ GERÇEK filtre nesnesini ölçüyor — bir
// reimplementasyon DEĞİL, üretim kod yolunun kendisi.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

test("G334 KABUL KRİTERİ — Kesim Noktası'nın GERÇEK -3dB noktası, HPF+LPF, CUTOFF_MIN-CUTOFF_MAX arası, 44.1kHz+48kHz'de 10 sent altında", async () => {
  const page = await browser.newPage();
  await page.goto(serverHandle.baseUrl);
  await page.waitForLoadState("networkidle");

  const results = await page.evaluate(async () => {
    const mode = await import("/js/modes/kesim-noktasi.js");
    const testFreqs = [mode.CUTOFF_MIN, 300, 1000, 3000, mode.CUTOFF_MAX];
    const out = [];
    for (const sampleRate of [44100, 48000]) {
      for (const filterType of ["highpass", "lowpass"]) {
        for (const freq of testFreqs) {
          const ctx = new OfflineAudioContext(1, 1, sampleRate);
          const question = { freq, filterType };
          const { filters } = mode.applyProcessing(question, { audioCtx: ctx });
          const filt = filters[0];

          const n = 20000;
          const lo = 10, hi = Math.min(sampleRate / 2 - 1, 22000);
          const freqs = new Float32Array(n);
          for (let i = 0; i < n; i++) { const t = i / (n - 1); freqs[i] = lo * Math.pow(hi / lo, t); }
          const mag = new Float32Array(n), phase = new Float32Array(n);
          filt.getFrequencyResponse(freqs, mag, phase);
          const targetLin = Math.pow(10, -3 / 20);
          let bestIdx = 0, bestDiff = Infinity;
          for (let i = 0; i < n; i++) { const d = Math.abs(mag[i] - targetLin); if (d < bestDiff) { bestDiff = d; bestIdx = i; } }
          const measured = freqs[bestIdx];
          const deviationCents = 1200 * Math.log2(measured / freq);
          out.push({ sampleRate, filterType, nominalFreq: freq, measured3dBFreq: measured, deviationCents });
        }
      }
    }
    return out;
  });

  for (const r of results) {
    assert.ok(
      Math.abs(r.deviationCents) < 10,
      `[${r.sampleRate}Hz ${r.filterType} ${r.nominalFreq}Hz] sapma ${r.deviationCents.toFixed(2)} sent — 10 sent eşiğini AŞIYOR (ölçülen -3dB: ${r.measured3dBFreq.toFixed(2)}Hz)`
    );
  }

  await page.close();
});

test("G334 REGRESYON KORUMASI — diğer 11 modun peaking-tipi filtreleri BOZULMADI (Frekans Bulma spot-check)", async () => {
  const page = await browser.newPage();
  await page.goto(serverHandle.baseUrl);
  await page.waitForLoadState("networkidle");

  const result = await page.evaluate(async () => {
    const mode = await import("/js/modes/frekans-bulma.js");
    const ctx = new OfflineAudioContext(1, 1, 44100);
    const question = { mode: "frequency", freq: 2000, q: 4.2, gain: 4.5 };
    const { filters } = mode.applyProcessing(question, { audioCtx: ctx });
    const filt = filters[0];
    const testAtF0 = new Float32Array([2000]);
    const mag = new Float32Array(1), phase = new Float32Array(1);
    filt.getFrequencyResponse(testAtF0, mag, phase);
    return { type: filt.type, Q: filt.Q.value, gainAtF0Db: 20 * Math.log10(mag[0]) };
  });

  assert.equal(result.type, "peaking");
  // Float32Array-destekli AudioParam — 4.2 tam TEMSİL EDİLEMEZ (float32
  // yuvarlama, ~1e-7 mertebesinde), bu yüzden yakınlık karşılaştırması.
  assert.ok(Math.abs(result.Q - 4.2) < 1e-5, `Q=${result.Q} (4.2 bekleniyordu)`);
  assert.ok(Math.abs(result.gainAtF0Db - 4.5) < 0.01, `peaking filtre f0'da ${result.gainAtF0Db}dB (4.5 bekleniyordu) — G334'ün lowpass/highpass DÜZELTMESİ peaking'e SIZMAMALIYDI`);

  await page.close();
});

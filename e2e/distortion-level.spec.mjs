// G269 — İKİ SORUN, TEK KÖK: (1) OLCUM-CIHAZ-16-08 madde C — clip tipi
// Kompresör'den GERÇEKTEN çok yüksek RMS üretiyordu (algısal olarak iki
// katı). (2) OLCUM-REVERB-TEPE-17-08 yan bulgusu — kolay zorlukta vocal/
// snare kaynağıyla GERÇEK dijital kırpma (25 denemenin 20-22'si 0dBFS'i
// aşıyordu). www/js/modes/distortion.js'e WaveShaper'DAN SONRA drive-ve-
// tip bağımlı bir çıkış telafisi eklendi (distortionOutputTrimDb/Linear,
// ÖLÇÜLMÜŞ 9-noktalı k-grid tablosu — tam metodoloji
// OLCUM-DISTORTION-TELAFI-17-08.md'de). Bu test GERÇEK ses dosyalarıyla,
// GERÇEK bir tarayıcı OfflineAudioContext'inde, distortion.js'in
// DEĞİŞTİRİLMEMİŞ buildDistortionCurve()/applyProcessing()'ini çağırarak
// İKİ SORUNU DA doğruluyor.

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

const RMS_MATCH_JS = ({ kRef }) => {
  return (async () => {
    const distortion = await import("/js/modes/distortion.js");
    const kompresor = await import("/js/modes/kompresor.js");
    const probeCtx = new window.OfflineAudioContext(2, 1, 44100);
    const resp = await fetch("/audio/groove.m4a");
    const arr = await resp.arrayBuffer();
    const buffer = await probeCtx.decodeAudioData(arr.slice(0));

    function measureRms(nodeBuilder) {
      const ctx = new window.OfflineAudioContext(buffer.numberOfChannels, Math.ceil((buffer.duration + 0.5) * buffer.sampleRate), buffer.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const node = nodeBuilder(ctx);
      src.connect(node.input || node);
      (node.output || node).connect(ctx.destination);
      src.start();
      return ctx.startRendering().then(rendered => {
        let sumSq = 0, n = 0;
        for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
          const data = rendered.getChannelData(ch);
          for (let i = 0; i < data.length; i++) { sumSq += data[i] * data[i]; n++; }
        }
        return +(20 * Math.log10(Math.sqrt(sumSq / n) || 1e-12)).toFixed(2);
      });
    }

    const kompresorRms = await measureRms(ctx => {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = kompresor.thresholdAtK(kRef);
      comp.knee.value = kompresor.COMP_KNEE_DB;
      comp.ratio.value = kompresor.ratioAtK(kRef);
      comp.attack.value = kompresor.COMP_ATTACK_SEC;
      comp.release.value = kompresor.COMP_RELEASE_SEC;
      return comp;
    });

    const results = { kompresorRms };
    for (const type of ["clip", "soft", "tube", "tape"]) {
      results[type] = {};
      for (const k of [0, 0.25, 0.5, 0.75, 1]) {
        const drive = distortion.driveAtK(type, k);
        const rms = await measureRms(ctx => {
          const shaper = ctx.createWaveShaper();
          shaper.curve = distortion.buildDistortionCurve(type, drive);
          shaper.oversample = "4x";
          const trim = ctx.createGain();
          trim.gain.value = distortion.distortionOutputTrimLinear(type, k);
          shaper.connect(trim);
          return { input: shaper, output: trim };
        });
        results[type][k] = rms;
      }
    }
    return results;
  })();
};

test("G269 (KABUL KRİTERİ 1): 4 tip × 5 k noktasında telafi SONRASI çıkış RMS Kompresör referansının ±1dB İÇİNDE (groove.m4a, gerçek ölçüm)", async () => {
  const page = await browser.newPage();
  await page.goto(serverHandle.baseUrl);
  await page.waitForLoadState("networkidle");

  const results = await page.evaluate(RMS_MATCH_JS, { kRef: 0.5 });

  for (const type of ["clip", "soft", "tube", "tape"]) {
    for (const k of [0, 0.25, 0.5, 0.75, 1]) {
      const delta = Math.abs(results[type][k] - results.kompresorRms);
      assert.ok(delta <= 1.01, `${type} k=${k}: RMS ${results[type][k]}dB, Kompresör referansından (${results.kompresorRms}dB) ${delta.toFixed(2)}dB uzakta — ±1dB DIŞINDA`);
    }
  }

  await page.close();
});

const CLIPPING_SCENARIO_JS = () => {
  return (async () => {
    const distortion = await import("/js/modes/distortion.js");
    const probeCtx = new window.OfflineAudioContext(2, 1, 44100);
    async function loadBuffer(path) {
      const resp = await fetch(path);
      const arr = await resp.arrayBuffer();
      return probeCtx.decodeAudioData(arr.slice(0));
    }
    const sources = { vocal: await loadBuffer("/audio/vocal.m4a"), snare: await loadBuffer("/audio/snare.m4a") };

    function measurePeak(buffer, nodeBuilder) {
      const ctx = new window.OfflineAudioContext(buffer.numberOfChannels, Math.ceil((buffer.duration + 0.5) * buffer.sampleRate), buffer.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const node = nodeBuilder(ctx);
      src.connect(node.input || node);
      (node.output || node).connect(ctx.destination);
      src.start();
      return ctx.startRendering().then(rendered => {
        let peak = 0;
        for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
          const data = rendered.getChannelData(ch);
          for (let i = 0; i < data.length; i++) { const v = Math.abs(data[i]); if (v > peak) peak = v; }
        }
        return +(20 * Math.log10(peak || 1e-12)).toFixed(2);
      });
    }

    // "easy" zorluk (task'ın orijinal problem #2 senaryosu, DISTORTION_TYPES.easy="clip") —
    // TRIALS deneme, HER biri gerçek createQuestion() ile (rastgele k, kGap jitter dahil).
    const TRIALS = 15;
    const results = {};
    for (const [srcName, buffer] of Object.entries(sources)) {
      let maxPeak = -Infinity;
      for (let i = 0; i < TRIALS; i++) {
        const q = distortion.createQuestion("easy", { source: srcName, boss: false });
        const variant = q.variants[0];
        const peak = await measurePeak(buffer, ctx => {
          const shaper = ctx.createWaveShaper();
          shaper.curve = distortion.buildDistortionCurve(q.distortionType, variant.drive);
          shaper.oversample = "4x";
          const trim = ctx.createGain();
          trim.gain.value = distortion.distortionOutputTrimLinear(q.distortionType, variant.k);
          shaper.connect(trim);
          return { input: shaper, output: trim };
        });
        if (peak > maxPeak) maxPeak = peak;
      }
      results[srcName] = maxPeak;
    }
    return results;
  })();
};

test("G269 (KABUL KRİTERİ 2): 'easy' zorlukta vocal/snare kaynağıyla artık 0dBFS'i AŞMIYOR (orijinal problem #2 — OLCUM-REVERB-TEPE-17-08 yan bulgusu, 25 denemenin 20-22'si kırpıyordu)", async () => {
  const page = await browser.newPage();
  await page.goto(serverHandle.baseUrl);
  await page.waitForLoadState("networkidle");

  const results = await page.evaluate(CLIPPING_SCENARIO_JS);

  for (const [src, maxPeak] of Object.entries(results)) {
    assert.ok(maxPeak < 0, `${src}: en kötü ölçülen tepe ${maxPeak}dBFS — HÂLÂ 0dBFS'i aşıyor (G269 regresyonu)`);
  }

  await page.close();
});

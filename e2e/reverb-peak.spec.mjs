// G268 — OLCUM-KALAN-17-08 madde B'nin bulgusu: Reverb'in Hall tipi
// convolver.normalize=false (G243, KASITLI — Room/Hall/Plate arasındaki
// GERÇEK enerji farkını korumak için) yüzünden GERÇEK dijital kırpmaya
// ulaşıyordu. Bu test, test/reverb.test.mjs'in DETERMİNİSTİK gain-değeri
// testinin (aritmetik, git stash ile kırmızı/yeşil doğrulandı) TAMAMLAYICISI
// — GERÇEK ses dosyalarıyla (vocal/groove, reverb'in uyumlu kaynakları),
// GERÇEK bir tarayıcı OfflineAudioContext'inde, reverb.js'in DEĞİŞTİRİLMEMİŞ
// applyProcessing()/generateImpulseResponse()'unu çağırarak üç tipin de
// çıkış tepesinin 0 dBFS'İN (task'ın önerdiği -1dBFS tavanın) altında
// kaldığını kanıtlar. IR üretimi Math.random() kullandığı için (kasıtlı,
// KİLİT — generateImpulseResponse'a dokunulmadı) HER render'da farklı bir
// IR üretilir — bu YÜZDEN tek bir render YETERSİZ, birden çok deneme/kaynak
// kullanılıyor (aynı istatistiksel dürüstlük OLCUM-REVERB-TEPE-17-08'in
// ölçüm metodolojisiyle AYNI, sadece daha az deneme — e2e koşu süresi
// için, asıl 40-deneme×4-kaynak ölçümü DURUM.md'de kayıtlı).

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

const MEASURE_JS = ({ trials, ceilingDb }) => {
  return (async () => {
    const mode = await import("/js/modes/reverb.js");
    const probeCtx = new window.OfflineAudioContext(2, 1, 44100);
    async function loadBuffer(path) {
      const resp = await fetch(path);
      const arr = await resp.arrayBuffer();
      return probeCtx.decodeAudioData(arr.slice(0));
    }
    // vocal ölçülen en kötü kaynaktı (OLCUM-REVERB-TEPE-17-08), groove
    // ikinci kontrol — reverb'in uyumlu kaynak listesinden ikisi.
    const sources = {
      vocal: await loadBuffer("/audio/vocal.m4a"),
      groove: await loadBuffer("/audio/groove.m4a"),
    };

    const k = 0.5; // ölçülen en kötü nokta (k-taraması: 0/0.25/0.5/0.75/1)
    const results = [];
    for (const typeId of Object.keys(mode.REVERB_TYPES)) {
      const type = mode.REVERB_TYPES[typeId];
      const decaySec = mode.decayAtK(type, k);
      const preDelaySec = mode.preDelayAtK(type, k);
      const sizeNorm = mode.sizeAtK(type, k);
      const wetMix = mode.wetMixAtK(k);
      let maxPeakDb = -Infinity;
      for (const buffer of Object.values(sources)) {
        for (let trial = 0; trial < trials; trial++) {
          const variant = { letter: "A", type: typeId, k, decaySec, preDelaySec, sizeNorm, wetMix, brightness: type.brightness };
          const q = { variants: [variant] };
          const durationSec = buffer.duration + decaySec + preDelaySec + 0.5;
          const ctx = new window.OfflineAudioContext(buffer.numberOfChannels, Math.ceil(durationSec * buffer.sampleRate), buffer.sampleRate);
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          const { filters } = mode.applyProcessing(q, { audioCtx: ctx });
          const [input, output] = filters;
          src.connect(input);
          input.connect(output);
          output.connect(ctx.destination);
          src.start();
          const rendered = await ctx.startRendering();
          let peak = 0;
          for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
            const data = rendered.getChannelData(ch);
            for (let i = 0; i < data.length; i++) {
              const v = Math.abs(data[i]);
              if (v > peak) peak = v;
            }
          }
          const db = 20 * Math.log10(peak || 1e-12);
          if (db > maxPeakDb) maxPeakDb = db;
        }
      }
      results.push({ type: typeId, maxPeakDb: +maxPeakDb.toFixed(2), underCeiling: maxPeakDb < ceilingDb });
    }
    return results;
  })();
};

test("G268: Room/Hall/Plate'in ÜÇÜ de gerçek ses dosyalarıyla (vocal+groove) k=0.5'te (ölçülen en kötü nokta) -1dBFS tavanın altında kalıyor", async () => {
  const page = await browser.newPage();
  await page.goto(serverHandle.baseUrl);
  await page.waitForLoadState("networkidle");

  const results = await page.evaluate(MEASURE_JS, { trials: 6, ceilingDb: -1 });

  for (const r of results) {
    assert.ok(r.underCeiling, `${r.type}: ölçülen en kötü tepe ${r.maxPeakDb}dBFS — -1dBFS tavanının ÜZERİNDE (G268 regresyonu, GERÇEK dijital kırpma riski geri gelmiş olabilir)`);
  }

  await page.close();
});

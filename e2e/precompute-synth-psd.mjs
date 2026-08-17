// G272 — saw/square/triangle sentetik kaynaklarının PSD'sini OFFLINE
// hesaplayıp www/js/core/source-psd-data.js'e EKLEYEN script (var olan 12
// girdiye DOKUNMADAN — DOKUNULMAYACAK: "G271'in mevcut davranışı").
//
// Neden Playwright/gerçek tarayıcı (pink/white'ın AKSİNE, o pure-JS'te
// üretilebiliyordu)? audio-engine.js:buildSynthSource() GERÇEK
// OscillatorNode kullanıyor — square/triangle/sine dalga biçimleri
// tarayıcının KENDİ bant-sınırlı (band-limited) sentezine göre üretiliyor,
// naif bir formülle (ör. Math.sign(sin(...))) YENİDEN üretmek FARKLI
// harmonik içerik verir (aliasing farkı). Bu yüzden GERÇEK OscillatorNode
// + OfflineAudioContext render kullanıldı — buildSynthSource'un KENDİSİYLE
// BİREBİR AYNI kod (osc1.type=sourceType, osc2.type=sourceType==="square"
// ?"triangle":"sine", freq 110/220, gain 0.52/0.34).
//
// ⚠️ BULGU (bu script yazılırken keşfedildi, AYRI bir bug — bu turun
// kapsamı DIŞINDA, SADECE rapor edildi): sourceType="saw" iken
// `osc1.type = "saw"` GEÇERSİZ bir OscillatorType değeri (spec SADECE
// "sawtooth" kabul ediyor) — tarayıcı bunu SESSİZCE reddedip osc.type'ı
// ÖNCEKİ (varsayılan "sine") değerinde bırakıyor (empirik doğrulandı:
// `osc.type='saw'` sonrası `osc.type` HÂLÂ "sine" okunuyor). Yani "Saw"
// kaynağı ŞU AN gerçekte SİNÜS çalıyor, testere dişi DEĞİL. Bu script
// buildSynthSource'un KODUNU birebir kopyaladığı için bu GERÇEK (buggy)
// davranışı SADAKATLE ölçüyor — PSD'nin doğruluğu bundan ETKİLENMİYOR
// (telafi HER ZAMAN gerçekte çalınan sese göre doğru olmalı, "olması
// gereken" sese göre değil). Bug DÜZELTİLMEDİ (DOKUNULMAYACAK kapsamı
// dışı, ayrı bir ürün kararı).
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { readFileSync, writeFileSync } from "node:fs";

const SYNTH_TYPES = ["saw", "square", "triangle"];
const SAMPLE_RATE = 44100;
const RENDER_SECONDS = 10;

const JS = ({ synthTypes, sampleRate, seconds }) => {
  return (async () => {
    const eqLoudness = await import("/js/core/eq-loudness.js");
    const n = Math.round(sampleRate * seconds);
    const results = {};
    for (const sourceType of synthTypes) {
      const ctx = new window.OfflineAudioContext(1, n, sampleRate);
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g1 = ctx.createGain();
      const g2 = ctx.createGain();
      osc1.type = sourceType;
      osc2.type = sourceType === "square" ? "triangle" : "sine";
      osc1.frequency.value = 110;
      osc2.frequency.value = 220;
      g1.gain.value = 0.52;
      g2.gain.value = 0.34;
      osc1.connect(g1);
      osc2.connect(g2);
      g1.connect(ctx.destination);
      g2.connect(ctx.destination);
      osc1.start();
      osc2.start();
      const rendered = await ctx.startRendering();
      const samples = rendered.getChannelData(0);
      const psd = eqLoudness.computeSourcePsd(samples, sampleRate, 48);
      results[sourceType] = { psd, actualOsc1Type: osc1.type, actualOsc2Type: osc2.type };
    }
    return results;
  })();
};

const serverHandle = await startStaticServer();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(serverHandle.baseUrl);
await page.waitForLoadState("networkidle");
const results = await page.evaluate(JS, { synthTypes: SYNTH_TYPES, sampleRate: SAMPLE_RATE, seconds: RENDER_SECONDS });
await browser.close();
await serverHandle.close();

for (const t of SYNTH_TYPES) {
  console.error(`${t}: osc1.type GERÇEKTE="${results[t].actualOsc1Type}", osc2.type="${results[t].actualOsc2Type}"`);
}

const dataPath = new URL("../www/js/core/source-psd-data.js", import.meta.url);
let content = readFileSync(dataPath, "utf8");

const newLines = SYNTH_TYPES.map(t => {
  const psd = results[t].psd;
  const freqs = psd.freqs.map(f => f.toFixed(2)).join(",");
  const powers = psd.powers.map(p => p.toExponential(6)).join(",");
  return `  ${t}: { freqs: [${freqs}], powers: [${powers}] },`;
});

if (SYNTH_TYPES.some(t => new RegExp(`^\\s*${t}:`, "m").test(content))) {
  throw new Error("source-psd-data.js zaten saw/square/triangle içeriyor — script tekrar mı çalıştırıldı? Elle kontrol et.");
}

content = content.replace(/\n};\n$/, `\n${newLines.join("\n")}\n};\n`);
writeFileSync(dataPath, content);
console.error(`\nsource-psd-data.js güncellendi: +${SYNTH_TYPES.length} girdi (saw/square/triangle) — mevcut 12 girdi DOKUNULMADAN.`);

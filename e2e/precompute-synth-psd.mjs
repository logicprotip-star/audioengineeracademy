// G272/G273 — saw/square/triangle sentetik kaynaklarının PSD'sini OFFLINE
// hesaplayıp www/js/core/source-psd-data.js'e YAZAN script. Var olan bir
// girdi (`ONLY_TYPES` listesinde) REPLACE edilir, LİSTEDE OLMAYANLARA
// DOKUNULMAZ (G273'ün DOKUNULMAYACAK'ı: "diğer kaynak tipleri").
//
// Neden Playwright/gerçek tarayıcı (pink/white'ın AKSİNE, o pure-JS'te
// üretilebiliyordu)? audio-engine.js:buildSynthSource() GERÇEK
// OscillatorNode kullanıyor — square/triangle/sawtooth dalga biçimleri
// tarayıcının KENDİ bant-sınırlı (band-limited) sentezine göre üretiliyor,
// naif bir formülle (ör. Math.sign(sin(...))) YENİDEN üretmek FARKLI
// harmonik içerik verir (aliasing farkı). Bu yüzden GERÇEK OscillatorNode
// + OfflineAudioContext render kullanıldı — buildSynthSource'un KENDİSİYLE
// BİREBİR AYNI kod (resolveOscillatorType(sourceType) İLE AYNI eşleme,
// osc2.type=sourceType==="square"?"triangle":"sine", freq 110/220,
// gain 0.52/0.34).
//
// G273 GÜNCELLEMESİ: G272'de "saw" HENÜZ osc.type="saw" (geçersiz→sessizce
// "sine") bug'ıyla ölçülmüştü — audio-engine.js:resolveOscillatorType()
// artık "saw"→"sawtooth" eşliyor (bkz. DURUM.md G273), bu script de AYNI
// eşlemeyi kullanıyor. SADECE "saw" yeniden üretildi (ONLY_TYPES=["saw"]) —
// square/triangle zaten GEÇERLİ tipler kullanıyordu, sesleri DEĞİŞMEDİ,
// PSD'lerini yeniden üretmek gereksiz risk/fark yaratırdı.
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { readFileSync, writeFileSync } from "node:fs";

const ONLY_TYPES = ["saw"]; // G273: SADECE bug düzeltmesinden ETKİLENEN tip
const SAMPLE_RATE = 44100;
const RENDER_SECONDS = 10;

const JS = ({ synthTypes, sampleRate, seconds }) => {
  return (async () => {
    const eqLoudness = await import("/js/core/eq-loudness.js");
    const audioEngine = await import("/js/core/audio-engine.js");
    const n = Math.round(sampleRate * seconds);
    const results = {};
    for (const sourceType of synthTypes) {
      const ctx = new window.OfflineAudioContext(1, n, sampleRate);
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g1 = ctx.createGain();
      const g2 = ctx.createGain();
      osc1.type = audioEngine.resolveOscillatorType(sourceType);
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
const results = await page.evaluate(JS, { synthTypes: ONLY_TYPES, sampleRate: SAMPLE_RATE, seconds: RENDER_SECONDS });
await browser.close();
await serverHandle.close();

for (const t of ONLY_TYPES) {
  console.error(`${t}: osc1.type GERÇEKTE="${results[t].actualOsc1Type}", osc2.type="${results[t].actualOsc2Type}"`);
}

const dataPath = new URL("../www/js/core/source-psd-data.js", import.meta.url);
let content = readFileSync(dataPath, "utf8");

for (const t of ONLY_TYPES) {
  const psd = results[t].psd;
  const freqs = psd.freqs.map(f => f.toFixed(2)).join(",");
  const powers = psd.powers.map(p => p.toExponential(6)).join(",");
  const newLine = `  ${t}: { freqs: [${freqs}], powers: [${powers}] },`;
  const pattern = new RegExp(`^  ${t}: \\{ freqs: \\[.*?\\] \\},$`, "m");
  if (!pattern.test(content)) {
    throw new Error(`source-psd-data.js'de "${t}" girdisi bulunamadı — ilk kez mi ekleniyor? Bu script SADECE var olan bir girdiyi REPLACE eder.`);
  }
  content = content.replace(pattern, newLine);
}

writeFileSync(dataPath, content);
console.error(`\nsource-psd-data.js güncellendi: ${ONLY_TYPES.join(",")} REPLACE edildi — diğer girdiler DOKUNULMADAN.`);

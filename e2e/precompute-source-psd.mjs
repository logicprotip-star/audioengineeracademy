// G271 — 10 paketli "sample" kaynağın + pink/white gürültünün PSD'sini
// OFFLINE hesaplayıp www/js/core/source-psd-data.js'e yazan tek seferlik
// script (ffmpeg ile PCM'e çözüp computeSourcePsd'yi ÇAĞIRIYOR — dosyanın
// kendisi commit'e GİRMİYOR, sadece ürettiği data modülü giriyor). Bkz.
// DURUM.md G271.
//
// pink/white: SENTETİK — task'ın SİMETRİK SORUN uyarısı (LPF'de tiz-ağırlıklı
// white noise'un hihat İLE AYNI şekilde etkilendiği, "çözüm ikisini de
// kapsamalı") YÜZÜNDEN eklendi. Örnek üretimi audio-engine.js'in
// buildNoiseSource() İLE BİREBİR AYNI algoritma (Math.random() tabanlı,
// pink=tek-kutuplu sızdıran integratör last=0.985*last+0.015*white,
// data=last*2.5; white=white*0.7) — Math.random() SEED'İ HER ÇALIŞTIRMADA
// FARKLI ama PSD İSTATİSTİKSEL OLARAK DURAĞAN (seed'e bağlı değil, sadece
// filtrenin transfer fonksiyonuna bağlı) — 10 saniyelik örnek 48-bant
// ortalaması için yeterince kararlı (kısa doğrulama: iki ayrı çalıştırma
// arası fark <0.1dB, bkz. OLCUM raporu).
//
// saw/square/triangle KAPSAM DIŞI BIRAKILDI — task'ın SİMETRİK SORUN
// uyarısı SADECE white noise+hihat'ı adlandırıyor, "10 paketli kaynak"
// KABUL KRİTERİ de sadece dosya kaynaklarını kapsıyor. Bu üç sentetik
// kaynak ESKİ (pembe-gürültü varsayımlı) mekanizmada KALDI — BOZULMADI
// (davranış değişmedi), ama İYİLEŞMEDİ de. DURUM.md'ye açık madde olarak
// işlendi (triangle HPF@8000 eski ölçümde -50.68dB — bass'tan bile kötü).
import { execFileSync } from "node:child_process";
import { computeSourcePsd } from "../www/js/core/eq-loudness.js";

const SAMPLE_RATE = 44100;

const FILE_SOURCES = [
  ["kick", "www/audio/kick.m4a"],
  ["snare", "www/audio/snare.m4a"],
  ["hihat", "www/audio/hihat.m4a"],
  ["tom", "www/audio/tom.m4a"],
  ["groove", "www/audio/groove.m4a"],
  ["bass", "www/audio/bass.m4a"],
  ["guitar", "www/audio/acoustic_guitar.m4a"],
  ["clean_guitar", "www/audio/clean_guitar.m4a"],
  ["arpeggio_guitar", "www/audio/arpeggio_guitar.m4a"],
  ["vocal", "www/audio/vocal.m4a"],
];

function decodeToFloat32(path, sampleRate) {
  const raw = execFileSync("ffmpeg", [
    "-v", "error",
    "-i", path,
    "-f", "f32le",
    "-ac", "1",
    "-ar", String(sampleRate),
    "-",
  ], { maxBuffer: 1024 * 1024 * 1024 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
}

// buildNoiseSource() (audio-engine.js) İLE BİREBİR AYNI algoritma — SADECE
// buffer süresi (10s, kararlı PSD için) farklı, o 2s (loop için).
function generateNoise(kind, seconds) {
  const n = Math.round(SAMPLE_RATE * seconds);
  const data = new Float32Array(n);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === "pink") {
      last = 0.985 * last + 0.015 * white;
      data[i] = last * 2.5;
    } else {
      data[i] = white * 0.7;
    }
  }
  return data;
}

const result = {};
for (const [id, path] of FILE_SOURCES) {
  const samples = decodeToFloat32(path, SAMPLE_RATE);
  const psd = computeSourcePsd(samples, SAMPLE_RATE, 48);
  result[id] = psd;
  console.error(`${id}: ${samples.length} samples, ${(samples.length / SAMPLE_RATE).toFixed(1)}s`);
}
for (const kind of ["pink", "white"]) {
  const samples = generateNoise(kind, 10);
  const psd = computeSourcePsd(samples, SAMPLE_RATE, 48);
  result[kind] = psd;
  console.error(`${kind}: ${samples.length} samples, ${(samples.length / SAMPLE_RATE).toFixed(1)}s (sentetik)`);
}

const ALL_IDS = [...FILE_SOURCES.map(([id]) => id), "pink", "white"];

const lines = [];
lines.push("// G271 — 10 paketli \"sample\" kaynağın + pink/white gürültünün OFFLINE");
lines.push("// ÖN-HESAPLANMIŞ PSD'si (source-catalog.js'teki kind:\"sample\" id'lerle +");
lines.push("// sourceType \"pink\"/\"white\" ile EŞLEŞİR). ffmpeg (dosyalar) / audio-engine.js");
lines.push("// buildNoiseSource() İLE BİREBİR AYNI algoritma (pink/white) ile PCM üretilip");
lines.push("// computeSourcePsd(samples, 44100, 48) ile üretildi — bkz.");
lines.push("// e2e/precompute-source-psd.mjs (kaynak sesler değişirse `node");
lines.push("// e2e/precompute-source-psd.mjs > www/js/core/source-psd-data.js` ile");
lines.push("// yeniden üretilebilir — pink/white RASTGELE ÜRETİLİR, yeniden çalıştırma");
lines.push("// PSD'de <0.1dB fark yaratır, İSTATİSTİKSEL OLARAK DURAĞAN). ELLE DÜZENLEME:");
lines.push("// yapma, scripti tekrar çalıştır. saw/square/triangle BİLEREK YOK (bkz. script");
lines.push("// başı DURUM.md G271 notu — kapsam dışı bırakıldı, ESKİ mekanizmada kaldılar).");
lines.push("export const SOURCE_PSD = {");
for (const id of ALL_IDS) {
  const psd = result[id];
  const freqs = psd.freqs.map(f => f.toFixed(2)).join(",");
  const powers = psd.powers.map(p => p.toExponential(6)).join(",");
  lines.push(`  ${id}: { freqs: [${freqs}], powers: [${powers}] },`);
}
lines.push("};");
lines.push("");

process.stdout.write(lines.join("\n"));

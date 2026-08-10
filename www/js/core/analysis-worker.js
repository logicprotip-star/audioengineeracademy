// G99 — Araçlar ölçüm motoru ARAYÜZÜ. analyzeAudioBuffer() saf/senkron bir
// fonksiyon ama büyük dosyalarda birkaç saniye sürebiliyor (Node'da 300s
// stereo dosyada ~2.2sn ölçüldü, mobil cihazda daha uzun sürebilir) — ana
// thread'de çağrılırsa arayüz o süre boyunca DONAR. Bu dosya analysis.js'in
// KENDİSİNİ DEĞİŞTİRMEDEN sadece Worker içinden ÇAĞIRIYOR (app.js'teki
// runAnalysisInWorker bu worker'ı oluşturur, kanal verisini transfer eder).
import { analyzeAudioBuffer } from "./analysis.js";

self.onmessage = (e) => {
  const { sampleRate, numberOfChannels, length, channelBuffers } = e.data;
  try {
    const channels = channelBuffers.map((buf) => new Float32Array(buf));
    const bufferLike = {
      sampleRate,
      numberOfChannels,
      length,
      getChannelData: (ch) => channels[ch],
    };
    const result = analyzeAudioBuffer(bufferLike);
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({ ok: false, error: (err && err.message) || String(err) });
  }
};

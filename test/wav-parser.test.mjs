// wav-parser.js testleri — decodeAudioData'nın iOS'ta AÇAMADIĞI WAV alt-tiplerine
// (24-bit PCM, 32-bit float) düşülen elle ayrıştırıcı için. Sentetik WAV header'ları
// bu dosyada üretiliyor (gerçek dosya diskte tutulmuyor) — her bit derinliği için
// bilinen örnek değerler yazılıp decodeWavPcm'in bunları doğru Float32'ye çevirdiği
// doğrulanıyor.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeWavPcm } from "../www/js/core/wav-parser.js";

// numChannels: 1 veya 2. samples: kanal başına düz sayı dizisi (interleave EDİLMEMİŞ,
// tek kanal ise doğrudan, iki kanal ise [ [ch0...], [ch1...] ] bekleniyor — burada
// basitlik için hep 1 kanal kullanılıyor, çok kanallı ayrıştırma ayrı testte).
function buildWav({ audioFormat, bitsPerSample, sampleRate = 44100, numChannels = 1, writeSample, sampleCount }) {
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = sampleCount * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeAscii = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size (standart, extensible değil)
  view.setUint16(20, audioFormat, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // byteRate
  view.setUint16(32, numChannels * bytesPerSample, true); // blockAlign
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < sampleCount * numChannels; i++) {
    writeSample(view, 44 + i * bytesPerSample, i);
  }
  return buffer;
}

describe("decodeWavPcm()", () => {
  it("16-bit PCM: bilinen Int16 örnekleri doğru Float32'ye çevirir", async () => {
    const samples = [0, 32767, -32768, 16384, -16384];
    const buf = buildWav({
      audioFormat: 1, bitsPerSample: 16, sampleCount: samples.length,
      writeSample: (view, offset, i) => view.setInt16(offset, samples[i], true)
    });
    const result = await decodeWavPcm(buf);
    assert.equal(result.numChannels, 1);
    assert.equal(result.sampleRate, 44100);
    assert.equal(result.bitsPerSample, 16);
    assert.equal(result.audioFormat, 1);
    const ch0 = result.channelData[0];
    assert.equal(ch0.length, samples.length);
    for (let i = 0; i < samples.length; i++) {
      assert.ok(Math.abs(ch0[i] - samples[i] / 32768) < 1e-6, `sample ${i}: ${ch0[i]} !== ${samples[i] / 32768}`);
    }
  });

  it("24-bit PCM: 3-baytlık little-endian işaretli örnekleri doğru çevirir", async () => {
    const samples = [0, 8388607, -8388608, 4194304, -4194304]; // max, min, yarı
    const buf = buildWav({
      audioFormat: 1, bitsPerSample: 24, sampleCount: samples.length,
      writeSample: (view, offset, i) => {
        let raw = samples[i];
        if (raw < 0) raw += 0x1000000; // iki'nin tümleyeni
        view.setUint8(offset, raw & 0xff);
        view.setUint8(offset + 1, (raw >> 8) & 0xff);
        view.setUint8(offset + 2, (raw >> 16) & 0xff);
      }
    });
    const result = await decodeWavPcm(buf);
    assert.equal(result.bitsPerSample, 24);
    const ch0 = result.channelData[0];
    for (let i = 0; i < samples.length; i++) {
      assert.ok(Math.abs(ch0[i] - samples[i] / 8388608) < 1e-6, `sample ${i}: ${ch0[i]} !== ${samples[i] / 8388608}`);
    }
  });

  it("32-bit float (IEEE float, format tag 3): doğrudan Float32 olarak okur", async () => {
    const samples = [0, 1, -1, 0.5, -0.5, 0.999999];
    const buf = buildWav({
      audioFormat: 3, bitsPerSample: 32, sampleCount: samples.length,
      writeSample: (view, offset, i) => view.setFloat32(offset, samples[i], true)
    });
    const result = await decodeWavPcm(buf);
    assert.equal(result.bitsPerSample, 32);
    assert.equal(result.audioFormat, 3);
    const ch0 = result.channelData[0];
    for (let i = 0; i < samples.length; i++) {
      assert.ok(Math.abs(ch0[i] - samples[i]) < 1e-6, `sample ${i}: ${ch0[i]} !== ${samples[i]}`);
    }
  });

  it("WAVE_FORMAT_EXTENSIBLE (0xFFFE) + 24-bit PCM SubFormat: gerçek formatı GUID'den okur", async () => {
    const bitsPerSample = 24, bytesPerSample = 3, sampleCount = 3, numChannels = 1;
    const dataSize = sampleCount * numChannels * bytesPerSample;
    const fmtExtraSize = 22; // cbSize(2) sonrası: validBits(2)+channelMask(4)+GUID(16)
    const fmtChunkSize = 16 + 2 + fmtExtraSize; // temel 16 + cbSize alanı + uzantı
    const buffer = new ArrayBuffer(20 + fmtChunkSize + 8 + dataSize);
    const view = new DataView(buffer);
    const writeAscii = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
    writeAscii(0, "RIFF");
    view.setUint32(4, buffer.byteLength - 8, true);
    writeAscii(8, "WAVE");
    writeAscii(12, "fmt ");
    view.setUint32(16, fmtChunkSize, true);
    let o = 20;
    view.setUint16(o, 0xfffe, true); o += 2; // wFormatTag = EXTENSIBLE
    view.setUint16(o, numChannels, true); o += 2;
    view.setUint32(o, 48000, true); o += 4; // sampleRate
    view.setUint32(o, 48000 * numChannels * bytesPerSample, true); o += 4; // byteRate
    view.setUint16(o, numChannels * bytesPerSample, true); o += 2; // blockAlign
    view.setUint16(o, bitsPerSample, true); o += 2;
    view.setUint16(o, fmtExtraSize, true); o += 2; // cbSize
    view.setUint16(o, bitsPerSample, true); o += 2; // validBitsPerSample
    view.setUint32(o, 0, true); o += 4; // channelMask
    view.setUint16(o, 1, true); o += 2; // SubFormat GUID ilk 2 bayt = 1 (PCM)
    o += 14; // GUID'in geri kalanı (sabit son ek, testte önemsiz — sıfır bırakılıyor)
    writeAscii(o, "data"); o += 4;
    view.setUint32(o, dataSize, true); o += 4;
    const samples = [1000, -1000, 8000000];
    for (let i = 0; i < samples.length; i++) {
      let raw = samples[i];
      if (raw < 0) raw += 0x1000000;
      view.setUint8(o, raw & 0xff);
      view.setUint8(o + 1, (raw >> 8) & 0xff);
      view.setUint8(o + 2, (raw >> 16) & 0xff);
      o += 3;
    }
    const result = await decodeWavPcm(buffer);
    assert.equal(result.audioFormat, 1); // GUID'den PCM olarak çözüldü
    assert.equal(result.sampleRate, 48000);
    const ch0 = result.channelData[0];
    for (let i = 0; i < samples.length; i++) {
      assert.ok(Math.abs(ch0[i] - samples[i] / 8388608) < 1e-6);
    }
  });

  it("2 kanallı (stereo) 16-bit PCM: interleaved veriyi doğru ayırır", async () => {
    // L: 100, 200, 300 — R: -100, -200, -300 (interleaved: L0,R0,L1,R1,L2,R2)
    const left = [100, 200, 300], right = [-100, -200, -300];
    const buf = buildWav({
      audioFormat: 1, bitsPerSample: 16, numChannels: 2, sampleCount: left.length,
      writeSample: (view, offset, i) => {
        const isRight = i % 2 === 1;
        const frame = Math.floor(i / 2);
        view.setInt16(offset, isRight ? right[frame] : left[frame], true);
      }
    });
    const result = await decodeWavPcm(buf);
    assert.equal(result.numChannels, 2);
    for (let i = 0; i < left.length; i++) {
      assert.ok(Math.abs(result.channelData[0][i] - left[i] / 32768) < 1e-6);
      assert.ok(Math.abs(result.channelData[1][i] - right[i] / 32768) < 1e-6);
    }
  });

  it("RIFF/WAVE imzası yoksa hata fırlatır (sessizce yanlış sonuç üretmez)", async () => {
    const buf = new ArrayBuffer(20);
    await assert.rejects(() => decodeWavPcm(buf), /RIFF\/WAVE/);
  });

  it("desteklenmeyen format kodu (ör. A-law=6) hata fırlatır", async () => {
    const buf = buildWav({
      audioFormat: 6, bitsPerSample: 8, sampleCount: 2,
      writeSample: (view, offset) => view.setUint8(offset, 128)
    });
    await assert.rejects(() => decodeWavPcm(buf), /format kodu/);
  });

  it("fmt chunk'ından ÖNCE bilinmeyen bir chunk (ör. LIST) varsa yine de doğru ayrıştırır", async () => {
    // Bazı DAW'lar (Logic dahil) fmt'den önce metadata chunk'ları ekleyebilir —
    // ayrıştırıcı chunk boyutunu okuyup atlayabilmeli, fmt'yi sabit ofsette varsaymamalı.
    const listBody = new Uint8Array([1, 2, 3, 4, 5]); // 5 bayt, tek → 1 dolgu baytı gerekir
    const inner = buildWav({
      audioFormat: 1, bitsPerSample: 16, sampleCount: 2,
      writeSample: (view, offset, i) => view.setInt16(offset, i === 0 ? 1000 : -1000, true)
    });
    const innerView = new DataView(inner);
    // inner: 44 bayt header + 4 bayt data = 48 bayt. RIFF'ten sonrasını (12'den itibaren)
    // LIST chunk'ıyla birlikte yeniden paketle.
    const restLen = inner.byteLength - 12;
    const listChunkLen = 8 + listBody.length + (listBody.length % 2);
    const total = 12 + listChunkLen + restLen;
    const out = new ArrayBuffer(total);
    const outView = new DataView(out);
    const writeAscii = (offset, str) => { for (let i = 0; i < str.length; i++) outView.setUint8(offset + i, str.charCodeAt(i)); };
    writeAscii(0, "RIFF");
    outView.setUint32(4, total - 8, true);
    writeAscii(8, "WAVE");
    writeAscii(12, "LIST");
    outView.setUint32(16, listBody.length, true);
    for (let i = 0; i < listBody.length; i++) outView.setUint8(20 + i, listBody[i]);
    // rest (fmt + data) LIST'ten hemen sonra (dolgu baytı dahil boyutla) başlar
    const restStart = 12 + listChunkLen;
    for (let i = 0; i < restLen; i++) outView.setUint8(restStart + i, innerView.getUint8(12 + i));

    const result = await decodeWavPcm(out);
    assert.equal(result.channelData[0].length, 2);
    assert.ok(Math.abs(result.channelData[0][0] - 1000 / 32768) < 1e-6);
  });

  // G104 — REGRESYON: "dosya yükleyince Araçlar donuyor" raporu. Büyük bir
  // dosyada bu döngü ana iş parçacığını TEK BİR bloke bırakmamalı — periyodik
  // olarak `setTimeout(0)` ile nefes vermeli. Bunu ÖLÇMEK için: decode
  // ÇALIŞIRKEN paralel bir "kalp atışı" (setInterval, 5ms) kaç kez tetikleniyor
  // sayılıyor — döngü TEK BİR senkron blok olsaydı kalp atışı SIFIR kalırdı
  // (event loop decode bitene kadar hiç dönemezdi).
  it("büyük bir dosyada (24-bit stereo, ~8.7M çerçeve, ~50MB) ana iş parçacığına periyodik olarak nefes verir", async () => {
    const numChannels = 2, bitsPerSample = 24, sampleCount = 8_700_000; // ~50MB veri, YIELD_TARGET_MS'i (40ms) güvenle aşacak kadar büyük
    const buf = buildWav({
      audioFormat: 1, bitsPerSample, numChannels, sampleCount,
      writeSample: (view, offset, i) => {
        const raw = i % 8388608;
        view.setUint8(offset, raw & 0xff);
        view.setUint8(offset + 1, (raw >> 8) & 0xff);
        view.setUint8(offset + 2, (raw >> 16) & 0xff);
      }
    });
    let heartbeats = 0;
    const timer = setInterval(() => { heartbeats++; }, 5);
    const t0 = performance.now();
    const result = await decodeWavPcm(buf);
    const elapsedMs = performance.now() - t0;
    clearInterval(timer);
    assert.equal(result.channelData[0].length, sampleCount);
    assert.ok(heartbeats > 0, `ana iş parçacığı hiç nefes almadı (${elapsedMs.toFixed(1)}ms sürdü, kalp atışı: ${heartbeats}) — döngü TEK bir bloke halinde çalışmış olabilir`);
  });
});

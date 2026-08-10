// Elle WAV ayrıştırıcı — decodeAudioData'nın AÇAMADIĞI WAV alt-tiplerine (özellikle
// 24-bit PCM ve 32-bit float — Logic Pro/Pro Tools gibi DAW'ların export ettiği,
// iOS WKWebView'in decodeAudioData'sının reddettiği bilinen alt-tipler) düşülecek
// yedek yol. SAF fonksiyon — AudioContext/DOM bağımlılığı YOK, sadece ArrayBuffer
// alıp düz veri (kanal başına Float32Array) döndürür; AudioBuffer'a çevirmek
// (audioCtx.createBuffer) çağıran tarafın (upload.js) işi.
//
// Sadece PCM (formatTag 1) ve IEEE float (formatTag 3) destekleniyor — WAVE_FORMAT_
// EXTENSIBLE (0xFFFE) durumunda gerçek alt-format, fmt chunk'ının 24. baytından
// başlayan SubFormat GUID'inin İLK 2 baytından okunuyor (GUID'in geri kalanı sabit
// bir son ek: 00000000-0010-8000-00AA00389B71 — bu yüzden ilk 2 bayt tek başına
// format tag'ini belirlemeye yeterli).
//
// Desteklenen bit derinlikleri: 8/16/24/32-bit PCM, 32-bit float. Başka bir şey
// (ör. A-law/µ-law formatTag'leri, desteklenmeyen bit derinliği) Error fırlatır —
// çağıran taraf bunu yakalayıp kullanıcıya net bir mesaj gösterir.
//
// G104 — ASENKRON + İŞBİRLİKÇİ NEFES VERME (canlı cihazda "dosya yükleyince
// Araçlar donuyor" raporu üzerine eklendi). Bu döngü fmt/data chunk'ı DataView
// üzerinden ÖRNEK ÖRNEK okuyor — TypedArray toplu kopyalama YOK çünkü format
// (24-bit, big-endian dönüşüm, işaret genişletme) bunu gerektirmiyor. Ölçüldü:
// 50 MB'lık 24-bit stereo bir dosya bile masaüstü V8'de ~120ms — ama bu SENKRON
// bir döngü, hiç `await` içermiyordu; daha yavaş bir mobil JS motorunda (veya
// daha büyük/çok kanallı bir dosyada) 100ms sınırını AŞMASI olası. Şimdi her
// ~2048 çerçevede bir GEÇEN SÜRE ölçülüyor, YIELD_TARGET_MS'i (40ms — 100ms
// sınırının altında güvenli bir pay) aşınca `setTimeout(0)` ile ana iş
// parçacığına GERİ VERİLİYOR (tarayıcının olay döngüsü tıklama/kaydırma/çizim
// işleyebilsin diye) — bu, sabit sayıda küçük parçaya bölmek yerine cihaz
// hızına göre KENDİLİĞİNDEN uyarlanıyor (hızlı cihazda az yield, yavaş cihazda
// çok ama her biri küçük).

const YIELD_CHECK_FRAMES = 2048;
const YIELD_TARGET_MS = 40;

function readAscii(view, offset, length) {
  let s = "";
  for (let i = 0; i < length; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

export async function decodeWavPcm(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (arrayBuffer.byteLength < 12 || readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WAVE") {
    throw new Error("Geçerli bir WAV (RIFF/WAVE) dosyası değil");
  }

  let fmt = null;
  let dataOffset = -1, dataLength = 0;
  let offset = 12;
  while (offset + 8 <= arrayBuffer.byteLength) {
    const chunkId = readAscii(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const bodyOffset = offset + 8;
    if (chunkId === "fmt ") {
      const audioFormatRaw = view.getUint16(bodyOffset, true);
      const numChannels = view.getUint16(bodyOffset + 2, true);
      const sampleRate = view.getUint32(bodyOffset + 4, true);
      const bitsPerSample = view.getUint16(bodyOffset + 14, true);
      let audioFormat = audioFormatRaw;
      if (audioFormatRaw === 0xfffe && chunkSize >= 40) {
        // WAVE_FORMAT_EXTENSIBLE — gerçek format SubFormat GUID'in ilk 2 baytında.
        audioFormat = view.getUint16(bodyOffset + 24, true);
      }
      fmt = { audioFormat, numChannels, sampleRate, bitsPerSample };
    } else if (chunkId === "data") {
      dataOffset = bodyOffset;
      dataLength = Math.min(chunkSize, arrayBuffer.byteLength - bodyOffset);
    }
    // Chunk'lar çift bayt hizalı — tek boyutlu chunk'tan sonra 1 dolgu baytı gelir.
    offset = bodyOffset + chunkSize + (chunkSize % 2);
  }

  if (!fmt) throw new Error("WAV dosyasında fmt chunk'ı bulunamadı");
  if (dataOffset < 0) throw new Error("WAV dosyasında data chunk'ı bulunamadı");
  const { audioFormat, numChannels, sampleRate, bitsPerSample } = fmt;
  if (numChannels < 1) throw new Error("WAV kanal sayısı geçersiz");

  const bytesPerSample = bitsPerSample / 8;
  if (!Number.isInteger(bytesPerSample) || bytesPerSample < 1) {
    throw new Error(`Desteklenmeyen bit derinliği: ${bitsPerSample}`);
  }
  const frameSize = bytesPerSample * numChannels;
  const frameCount = Math.floor(dataLength / frameSize);
  if (frameCount <= 0) throw new Error("WAV data chunk'ı boş");

  const channelData = [];
  for (let ch = 0; ch < numChannels; ch++) channelData.push(new Float32Array(frameCount));

  const isFloat = audioFormat === 3;
  const isPcm = audioFormat === 1;
  if (!isFloat && !isPcm) {
    throw new Error(`Desteklenmeyen WAV format kodu: ${audioFormat} (sadece PCM=1/IEEE float=3 destekleniyor)`);
  }

  let lastYield = performance.now();
  for (let i = 0; i < frameCount; i++) {
    const frameStart = dataOffset + i * frameSize;
    for (let ch = 0; ch < numChannels; ch++) {
      const s = frameStart + ch * bytesPerSample;
      let v;
      if (isFloat && bitsPerSample === 32) {
        v = view.getFloat32(s, true);
      } else if (isFloat && bitsPerSample === 64) {
        v = view.getFloat64(s, true);
      } else if (isPcm && bitsPerSample === 8) {
        // 8-bit PCM WAV işaretsizdir (0..255, 128 sessizlik).
        v = (view.getUint8(s) - 128) / 128;
      } else if (isPcm && bitsPerSample === 16) {
        v = view.getInt16(s, true) / 32768;
      } else if (isPcm && bitsPerSample === 24) {
        const b0 = view.getUint8(s), b1 = view.getUint8(s + 1), b2 = view.getUint8(s + 2);
        let raw = b0 | (b1 << 8) | (b2 << 16);
        if (raw & 0x800000) raw -= 0x1000000; // işaret genişletme
        v = raw / 8388608;
      } else if (isPcm && bitsPerSample === 32) {
        v = view.getInt32(s, true) / 2147483648;
      } else {
        throw new Error(`Desteklenmeyen bit derinliği/format kombinasyonu: ${bitsPerSample}-bit, format ${audioFormat}`);
      }
      channelData[ch][i] = v;
    }
    if (i % YIELD_CHECK_FRAMES === 0 && i > 0) {
      const now = performance.now();
      if (now - lastYield > YIELD_TARGET_MS) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        lastYield = performance.now();
      }
    }
  }

  return { numChannels, sampleRate, channelData, bitsPerSample, audioFormat };
}

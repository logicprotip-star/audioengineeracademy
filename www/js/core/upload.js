// Kullanıcının yüklediği ses dosyasının yönetimi: File.arrayBuffer() (dosya zaten
// bellekte — ağ isteği ya da bundle sınırlaması yok) + decodeAudioData +
// AudioBufferSourceNode — gömülü örnek kaynaklarla (source-catalog.js kind:"sample",
// bkz. audio-engine.js buildSampleSource) AYNI çalma yolu.
//
// G8: önceki HTMLAudioElement + MediaElementAudioSourceNode yolu, cihazda (iOS) bir
// dosya yüklenince TÜM ses motorunu kilitleyen bir bug'a yol açıyordu — kod
// incelemesiyle tek AudioContext / tek createMediaElementSource çağrısı / null
// mediaSource ile buildQuestionChain'e ulaşan bir yol OLMADIĞI doğrulandı (bkz.
// DURUM.md E1); geriye kalan açıklama, gömülü örneklerin (AudioBufferSourceNode) ve
// kullanıcı dosyasının (MediaElementAudioSourceNode) AYNI ses grafiğinde İKİ FARKLI
// source-node tipi olarak karışmasıydı — iOS WebKit'te bilinen ama bu ortamda
// (masaüstü Chrome) yeniden üretilemeyen bir etkileşim sorunu. Tek yola indirgendi
// (kullanıcı kararı — bkz. MAX_AUDIO_FILE_MB notu).
//
// G10: decodeAudioData bazı WAV alt-tiplerini (özellikle 24-bit PCM ve 32-bit float —
// Logic Pro/Pro Tools'un export ettiği, WAVE_FORMAT_EXTENSIBLE ile paketlenmiş
// alt-tipler) iOS WKWebView'de AÇAMIYOR (bilinen WebKit sınırlaması). decodeAudioData
// başarısız olur ve dosya bir WAV (RIFF/WAVE imzalı) ise wav-parser.js'teki elle
// ayrıştırıcıya (decodeWavPcm) düşülüyor — PCM/float verisini kendisi Float32'ye
// çevirip audioCtx.createBuffer ile AYNI AudioBuffer sonucunu üretiyor, AYNI
// AudioBufferSourceNode çalma zincirine giriyor (iki yol da buildQuestionChain'e göre
// ayırt edilemez). decodeAudioData bir kopya üzerinde çalışır (bazı motorlar girdi
// ArrayBuffer'ı "neuter" edebiliyor) — orijinal arrayBuffer WAV yedeği için sağlam
// kalır.
//
// AudioBufferSourceNode PAUSE/RESUME DESTEKLEMEZ (sadece start/stop, start() ikinci
// kez çağrılamaz) — bu yüzden ÇALMA POZİSYONU elle takip ediliyor (offset/startedAt):
// getSourceNode() her çağrıldığında (yeni tur, karşılaştırma önizlemesi), varsa
// önceki node'un o ana kadar ne kadar çaldığı offset'e eklenir, YENİ node o
// pozisyondan start() edilir. Node'un KENDİSİNİN fiziksel olarak durdurulması
// audio-engine.js'in genel stopAudio() döngüsüne bırakılır (currentNodes üzerinden,
// tüm kaynak tipleri için tek/ortak mekanizma).
//
// G12: stopAudio() ARTIK (audio-engine.js'teki activeUploadManager referansı
// üzerinden) HER çağrıldığında bu modülün pausePlayback()'ini de çağırıyor — yani
// fiziksel susma ile mantıksal offset dondurma AYNI ANDA olur. Önceden stopAudio()
// sadece Web Audio node'unu durduruyordu, offset'i DONDURMUYORDU — bir sonraki
// getSourceNode() çağrısı GERÇEK (duvar saati) geçen süreyi offset'e eklediği için,
// kullanıcı cevap verip geri bildirimde kaldığı süre kadar şarkı "ileri sarılmış"
// gibi başlıyordu (bug, DURUM.md'de kayıtlı). Artık offset SADECE ses gerçekten
// çalarken ilerliyor — cevap verilince donuyor, oyuna dönünce kaldığı yerden devam
// ediyor, karşılaştırma önizlemeleri de aynı dondurulmuş noktadan başlıyor.

import { decodeWavPcm } from "./wav-parser.js";

export const ALLOWED_AUDIO_EXTENSIONS = ["wav", "mp3", "m4a", "aac", "aiff", "flac", "ogg"];
const MAX_AUDIO_FILE_MB = 100; // KULLANICI KARARI (G11) — G8'de 30 MB'a çekilmişti
// (decodeAudioData dosyayı SIKIŞTIRILMAMIŞ PCM'e açar, büyük bir mp3/m4a OOM ile
// iOS WKWebView'ı çökertebilir — try/catch bunu YAKALAYAMAZ, motor seviyesinde çöker).
// Kullanıcı gerçek WAV dosyalarının 30 MB'ı aştığını bildirdi, riski BİLEREK kabul
// ederek 100 MB'a çıkardı (WAV zaten sıkıştırılmamış — ~1:1 açılır, güvenli; ama bu
// sınır mp3/m4a/aac/ogg gibi SIKIŞTIRILMIŞ formatlara da uygulanıyor — 100 MB'lık
// sıkıştırılmış bir dosya OOM riskini geri getirebilir, kullanıcıya bu ayrım
// açıklanıp onaylandı).

// iOS WKWebView'de <input accept="audio/*"> TEK BAŞINA bazı formatları (özellikle WAV)
// native dosya seçicide hiç göstermeyebiliyor/seçilemez bırakabiliyor — audio/* MIME
// joker karakterinin WebKit'teki UTI (Uniform Type Identifier) karşılığı platforma göre
// eksik kalabiliyor (bilinen, belgelenmiş bir WebKit sınırlaması; bkz. E1). Bunu MIME
// joker + WAV'ın bilinen tüm MIME varyantları + dosya uzantısı listesiyle birleştirmek
// picker'a birden fazla eşleşme yolu veriyor. ALLOWED_AUDIO_EXTENSIONS ile TEK kaynaktan
// üretiliyor — validateAudioFile'ın kabul ettiğinden FARKLI bir liste asla oluşamaz.
export function audioAcceptAttr() {
  return [
    "audio/*",
    "audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave",
    ...ALLOWED_AUDIO_EXTENSIONS.map(ext => `.${ext}`)
  ].join(",");
}

export function validateAudioFile(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
    return { ok: false, title: "Desteklenmeyen dosya türü", detail: `".${ext || "?"}" uzantılı dosyalar desteklenmiyor. Desteklenenler: ${ALLOWED_AUDIO_EXTENSIONS.join(", ")}.` };
  }
  if (file.size > MAX_AUDIO_FILE_MB * 1024 * 1024) {
    return { ok: false, title: "Dosya çok büyük", detail: `Dosya ${MAX_AUDIO_FILE_MB} MB sınırını aşıyor. Lütfen daha kısa bir ses dosyası seç.` };
  }
  return { ok: true };
}

// getAudioCtx: () => AudioContext|null — audioCtx sadece ilk kullanıcı etkileşiminde
// (unlockAudio) oluşturulduğu için burada sabit değer değil, geç bağlanan bir
// erişimci alınır.
export function createUploadManager(getAudioCtx) {
  let buffer = null;     // decode edilmiş AudioBuffer — dosya değişene kadar sabit
  let offset = 0;        // mantıksal çalma pozisyonu (saniye), duraklatıldığında/yeni
                          // node kurulurken güncellenir
  let startedAt = 0;      // audioCtx.currentTime — en son getSourceNode() çağrıldığı an
  let playing = false;

  function pausePlayback() {
    if (!playing || !buffer) return;
    const ctx = getAudioCtx();
    offset = (offset + (ctx.currentTime - startedAt)) % buffer.duration;
    playing = false;
  }

  // audio-engine.js'in buildQuestionChain'i çağırır: TAZE bir AudioBufferSourceNode
  // döndürür (AudioBufferSourceNode tek kullanımlıktır, start() ikinci kez çağrılamaz),
  // kaldığı yerden devam eder. Dönen node HENÜZ bağlanmamıştır — çağıran taraf
  // sourceMix'e (ya da eşdeğerine) connect() etmeli.
  function getSourceNode() {
    if (!buffer) return null;
    const ctx = getAudioCtx();
    if (playing) {
      offset = (offset + (ctx.currentTime - startedAt)) % buffer.duration;
    }
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    node.start(0, offset);
    startedAt = ctx.currentTime;
    playing = true;
    return node;
  }

  // Yüklenen dosyayı BAŞINDAN çalmaya başlat. SADECE gerçek "yeni oturum" anlarında
  // çağrılmalı: Oyunu Başlat (sıfırdan), Tekrar Oyna.
  function startFromZero() {
    offset = 0;
    playing = false;
  }

  async function loadFile(file) {
    if (!file) return { ok: false };

    pausePlayback();
    buffer = null;
    offset = 0;
    playing = false;

    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (e) {
      console.error("[upload] dosya okunamadı:", e && e.name, e && e.message, e);
      return { ok: false, title: "Dosya okunamadı", detail: "Bu dosya açılamadı. Farklı bir mp3/wav/m4a dosyası dene." };
    }
    if (arrayBuffer.byteLength === 0) {
      return { ok: false, title: "Dosya boş", detail: "Bu dosyada okunacak veri yok. Farklı bir dosya dene." };
    }

    const ctx = getAudioCtx();
    let decodeErr = null;
    try {
      // Kopya üzerinde çalış — bazı motorlar decodeAudioData'ya verilen ArrayBuffer'ı
      // "neuter" edebiliyor; başarısız olursa orijinal arrayBuffer WAV yedeği için
      // sağlam kalmalı.
      buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    } catch (e) {
      decodeErr = e;
      buffer = null;
    }

    if (!buffer) {
      const isRiffWave = arrayBuffer.byteLength >= 12
        && String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4)) === "RIFF"
        && String.fromCharCode(...new Uint8Array(arrayBuffer, 8, 4)) === "WAVE";
      if (isRiffWave) {
        try {
          const wav = decodeWavPcm(arrayBuffer);
          const wavBuffer = ctx.createBuffer(wav.numChannels, wav.channelData[0].length, wav.sampleRate);
          for (let ch = 0; ch < wav.numChannels; ch++) wavBuffer.copyToChannel(wav.channelData[ch], ch);
          buffer = wavBuffer;
        } catch (wavErr) {
          console.error("[upload] decodeAudioData hatası:", decodeErr && decodeErr.name, decodeErr && decodeErr.message, decodeErr);
          console.error("[upload] elle WAV ayrıştırma hatası:", wavErr && wavErr.message, wavErr);
          buffer = null;
        }
      } else {
        console.error("[upload] decodeAudioData hatası:", decodeErr && decodeErr.name, decodeErr && decodeErr.message, decodeErr);
      }
    }

    if (!buffer) {
      return { ok: false, title: "Bu dosya açılamadı", detail: "Lütfen mp3, m4a veya WAV formatında bir dosya dene." };
    }

    return { ok: true };
  }

  return {
    loadFile,
    pausePlayback,
    startFromZero,
    getSourceNode,
    get hasBuffer() { return !!buffer; },
    // G88: Araçlar sekmesinin "Son yüklenenler" satırı gerçek dosya süresini
    // gösteriyor (bkz. app.js processToolsUploadFile) — hasBuffer'ın AYNI
    // deseni, buffer'ı dışarı SIZDIRMADAN (sadece türetilmiş bir sayı).
    get duration() { return buffer ? buffer.duration : 0; }
  };
}

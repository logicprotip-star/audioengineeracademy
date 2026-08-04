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
// AudioBufferSourceNode PAUSE/RESUME DESTEKLEMEZ (sadece start/stop, start() ikinci
// kez çağrılamaz) — bu yüzden ÇALMA POZİSYONU elle takip ediliyor (offset/startedAt):
// getSourceNode() her çağrıldığında (yeni tur, karşılaştırma önizlemesi), varsa
// önceki node'un o ana kadar ne kadar çaldığı offset'e eklenir, YENİ node o
// pozisyondan start() edilir — kullanıcı arka planda kesintisiz akan bir şarkı
// dinliyormuş gibi hissetsin diye (eski HTMLAudioElement'in doğal davranışıyla aynı
// sonuç). Node'un KENDİSİNİN fiziksel olarak durdurulması audio-engine.js'in genel
// stopAudio() döngüsüne bırakılır (currentNodes üzerinden, tüm kaynak tipleri için
// tek/ortak mekanizma) — burada SADECE mantıksal pozisyon güncellenir.

export const ALLOWED_AUDIO_EXTENSIONS = ["wav", "mp3", "m4a", "aac", "aiff", "flac", "ogg"];
const MAX_AUDIO_FILE_MB = 30; // KULLANICI KARARI (G8) — decodeAudioData dosyayı
// SIKIŞTIRILMAMIŞ PCM'e açar (120 MB'lık bir mp3 ~2+ GB'a çıkabilir, iOS WKWebView'ı
// OOM ile çökertebilir — try/catch bunu YAKALAYAMAZ, motor seviyesinde çöker). Kulak
// eğitimi için birkaç dakikalık bir referans parçası fazlasıyla yeterli, 30 MB tipik
// kullanımı kısıtlamıyor ama OOM riskini yapısal olarak önlüyor.

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

    try {
      buffer = await getAudioCtx().decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error("[upload] decodeAudioData hatası:", e && e.name, e && e.message, e);
      buffer = null;
      return { ok: false, title: "Bu dosya çözümlenemedi", detail: "Format desteklenmiyor olabilir. Farklı bir mp3/wav/m4a dosyası dene." };
    }

    return { ok: true };
  }

  return {
    loadFile,
    pausePlayback,
    startFromZero,
    getSourceNode,
    get hasBuffer() { return !!buffer; }
  };
}

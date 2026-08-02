// Kullanıcının yüklediği ses dosyasının yönetimi: HTMLAudioElement +
// MediaElementAudioSourceNode akışı (decodeAudioData yerine — büyük dosyalarda
// tüm PCM'i RAM'e açmadığı için iOS WKWebView'da çökmeye yol açmaz).
// uploadedMediaSource TUR DEĞİŞTİĞİNDE yeniden oluşturulmaz/kesilmez — sadece filtre
// zincirine yeniden bağlanır (bkz. audio-engine.js: buildQuestionChain).

export const ALLOWED_AUDIO_EXTENSIONS = ["wav", "mp3", "m4a", "aac", "aiff", "flac", "ogg"];
const MAX_AUDIO_FILE_MB = 120; // Kullanıcı onayı (D4): 150'den düşürüldü. HTMLAudioElement dosyayı akışla oynatır
// (decodeAudioData gibi tamamını RAM'e açmaz) — bu sınırın gerekçesi bellek çökmesi değil,
// kulak eğitimi için gereğinden büyük bir dosyanın kazara seçilmesini engellemek.

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
  let uploadedAudioEl = null;
  let uploadedObjectUrl = null;
  let uploadedMediaSource = null;

  function pausePlayback() {
    if (uploadedAudioEl) {
      try { uploadedAudioEl.pause(); } catch {}
    }
  }

  // Ham play() çağrısı — currentTime'a dokunmaz. Hem sıfırdan başlatma hem de kaldığı
  // yerden devam ettirme bunun üzerine kurulu.
  function playRaw(onRejected) {
    if (!uploadedAudioEl) return;
    const p = uploadedAudioEl.play();
    if (p && p.catch) {
      p.catch(err => {
        console.error("[upload] play() reddedildi:", err && err.name, err && err.message, err);
        if (onRejected) onRejected(err);
      });
    }
  }

  // Yüklenen dosyayı BAŞINDAN (currentTime=0) çalmaya başlat. SADECE gerçek "yeni oturum"
  // anlarında çağrılmalı: Oyunu Başlat (sıfırdan), Tekrar Oyna.
  function startFromZero(onRejected) {
    if (!uploadedAudioEl) return;
    try {
      uploadedAudioEl.currentTime = 0;
    } catch (e) {
      console.error("[upload] currentTime=0 ayarlanamadı:", e);
    }
    playRaw(onRejected);
  }

  async function loadFile(file, { onError, onStalled } = {}) {
    if (!file) return { ok: false };

    // Önceki dosyanın kaynaklarını serbest bırak (aynı element'ten ikinci kez
    // createMediaElementSource() çağrılamaz).
    if (uploadedMediaSource) {
      try { uploadedMediaSource.disconnect(); } catch {}
      uploadedMediaSource = null;
    }
    if (uploadedAudioEl) {
      // NOT: .src = "" YAPMA — elementin kendi "error" dinleyicisini (Empty src attribute)
      // tetikleyip yanlışlıkla bir hata mesajı gösterir. revokeObjectURL + referansı bırakmak
      // (GC) temizlik için yeterli.
      try { uploadedAudioEl.pause(); } catch {}
      uploadedAudioEl = null;
    }
    if (uploadedObjectUrl) {
      URL.revokeObjectURL(uploadedObjectUrl);
      uploadedObjectUrl = null;
    }

    const url = URL.createObjectURL(file);
    const audioEl = new Audio();
    audioEl.loop = true;
    audioEl.preload = "auto";
    audioEl.playsInline = true;
    audioEl.src = url;

    audioEl.addEventListener("error", () => {
      const err = audioEl.error;
      console.error("[upload] <audio> error event:", err && err.code, err && err.message);
      if (onError) onError();
    });
    audioEl.addEventListener("stalled", () => {
      if (onStalled) onStalled();
    });

    uploadedAudioEl = audioEl;
    uploadedObjectUrl = url;

    try {
      uploadedMediaSource = getAudioCtx().createMediaElementSource(audioEl);
    } catch (e) {
      console.error("[upload] createMediaElementSource hatası:", e && e.name, e && e.message, e);
      uploadedAudioEl = null;
      uploadedObjectUrl = null;
      URL.revokeObjectURL(url);
      return { ok: false, title: "Bu dosya çözümlenemedi", detail: "Ses kaynağı oluşturulamadı. Farklı bir mp3/wav/m4a dosyası dene." };
    }

    return { ok: true };
  }

  return {
    loadFile,
    pausePlayback,
    playRaw,
    startFromZero,
    get mediaSource() { return uploadedMediaSource; },
    get element() { return uploadedAudioEl; }
  };
}

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

// G108 — "copyFile sonrası donma, hiç log yok" teşhisi için EKLENDİ (task'ın
// kendi kuralı: SADECE günlük, düzeltme YOK). `[upload-diag]` önekli, app.js'
// teki AYNI desen — geçici, kök sebep bulununca kaldırılması BEKLENİR.
function uploadDiagMem() {
  if (typeof performance !== "undefined" && performance.memory) {
    const m = performance.memory;
    return ` | bellek: ${(m.usedJSHeapSize / 1048576).toFixed(1)}/${(m.jsHeapSizeLimit / 1048576).toFixed(1)} MB`;
  }
  return "";
}
function uploadDiagLog(step, label, phase, detail) {
  console.log(`[upload-diag] ${step}) ${label} ${phase}${detail ? ` — ${detail}` : ""}${uploadDiagMem()}`);
}

export const ALLOWED_AUDIO_EXTENSIONS = ["wav", "mp3", "m4a", "aac", "aiff", "flac", "ogg"];
// #52 DÜZELTMESİ — ".aif" reddediliyordu: "aiff" listede vardı ama uzantı
// KARŞILAŞTIRMASI TAM EŞLEŞME arıyordu, ".aif" (Logic Pro/macOS'un
// YAYGIN kısa AIFF uzantısı — Finder/Logic bounce'ları genelde BUNU
// üretir, ".aiff" değil) string olarak "aiff"e EŞİT DEĞİL. decodeAudioData
// dosyanın BAYTLARINI çözer, uzantıya hiç bakmaz — teknik bir engel YOKTU,
// SADECE string karşılaştırması eksikti. ".aif" AYRI bir format olarak
// EKLENMEDİ (ALLOWED_AUDIO_EXTENSIONS'a "aif" eklemek FULL_AUDIO_FORMAT_LIST'i
// "AIFF/AIF" gibi YANILTICI/tekrar eden gösterirdi) — bunun yerine
// validateAudioFile() ".aif"i doğrulama ÖNCESİ "aiff"e normalize ediyor,
// kullanıcıya görünen liste TEK "AIFF" olarak kalıyor.
const EXTENSION_ALIASES = { aif: "aiff" };
// G164 — kullanıcı raporu: format listesi 3 farklı yerde 3 farklı elle
// yazılmış metin olarak duruyordu ("mp3/wav", "mp3/wav/m4a", TAM 7'li liste)
// — biri değişince diğerleri sessizce ESKİ kalıyordu. Artık TEK kaynak:
// kullanıcıya görünen HER liste (kısa buton alt yazısı, uzun hata mesajı)
// ALLOWED_AUDIO_EXTENSIONS'tan TÜRETİLİYOR, elle bir daha yazılmıyor.
export const SHORT_AUDIO_FORMAT_LIST = ALLOWED_AUDIO_EXTENSIONS.slice(0, 3).map(e => e.toUpperCase()).join(", "); // "WAV, MP3, M4A"
export const FULL_AUDIO_FORMAT_LIST = ALLOWED_AUDIO_EXTENSIONS.map(e => e.toUpperCase()).join("/"); // "WAV/MP3/M4A/AAC/AIFF/FLAC/OGG"
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
    ...ALLOWED_AUDIO_EXTENSIONS.map(ext => `.${ext}`),
    // #52 — ".aif" (EXTENSION_ALIASES) picker'ın KENDİSİNDE de kabul
    // edilmeli, yoksa iOS'un native seçicisi dosyayı hiç GÖSTERMEYEBİLİR
    // (bkz. yukarıdaki WKWebView notu — validateAudioFile'a hiç ulaşmadan
    // seçilemez kalırdı).
    ...Object.keys(EXTENSION_ALIASES).map(ext => `.${ext}`)
  ].join(",");
}

export function validateAudioFile(file) {
  const rawExt = (file.name.split(".").pop() || "").toLowerCase();
  // #52 — ".aif" ".aiff"e normalize edilir (AYNI format, iki yazım) —
  // hata mesajında kullanıcının GERÇEKTEN yazdığı uzantı (rawExt) gösterilir.
  const ext = EXTENSION_ALIASES[rawExt] || rawExt;
  if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
    return { ok: false, title: "Desteklenmeyen dosya türü", detail: `".${rawExt || "?"}" uzantılı dosyalar desteklenmiyor. Desteklenenler: ${ALLOWED_AUDIO_EXTENSIONS.join(", ")}.` };
  }
  if (file.size > MAX_AUDIO_FILE_MB * 1024 * 1024) {
    return { ok: false, title: "Dosya çok büyük", detail: `Dosya ${MAX_AUDIO_FILE_MB} MB sınırını aşıyor. Lütfen daha kısa bir ses dosyası seç.` };
  }
  return { ok: true };
}

// TUR3A bulgusu (🔴) — 100 MB'lık boyut sınırı SIKIŞTIRILMIŞ (düşük bitrate)
// dosyalarda ~1-2 GB'a varan decode edilmiş PCM belleğine karşılık gelebiliyor
// (bkz. TUR3A-VERI-15-08.md, Bölüm A/C) — boyut GÜVENDE olsa bile SÜRE
// (dolayısıyla decode edilecek örnek sayısı) kontrolsüzdü. Süre, decodeAudioData
// ÇAĞRILMADAN ÖNCE, HTMLMediaElement'in KENDİ metadata-okuma yolundan (tam PCM
// decode DEĞİL, sadece container header/metadata) öğrenilir — amaç belleğin
// hiç şişmeden reddetmek.
export const MAX_AUDIO_DURATION_SEC = 7 * 60; // KULLANICI KARARI — kırpma YOK, kullanıcı kendi kırpar

// Metadata okunamazsa (bazı tarayıcı/format kombinasyonlarında "loadedmetadata"
// hiç ateşlenmeyebilir ya da duration Infinity/NaN dönebilir — bilinen bir
// HTMLMediaElement sınırlaması) null döner — bu durumda süre kontrolü SESSİZCE
// atlanır (decode aşaması zaten kendi hata yolunu taşıyor, burada YANLIŞ
// pozitif bir ret üretmemek tercih edildi).
export function getAudioDurationSec(file) {
  return new Promise((resolve) => {
    let settled = false;
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    const finish = (sec) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(sec);
    };
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () => {
      const d = audio.duration;
      finish(Number.isFinite(d) && d > 0 ? d : null);
    });
    audio.addEventListener("error", () => finish(null));
    audio.src = url;
  });
}

// SAF — sec bilinmeden (null) ya da sınır İÇİNDE her zaman ok:true; testler
// bu fonksiyonu doğrudan çağırır, `Audio`/`URL.createObjectURL` (Node'da
// mevcut değil, sadece tarayıcıda) gerektiren getAudioDurationSec'i atlar.
export function evaluateAudioDuration(sec) {
  if (sec == null) return { ok: true };
  if (sec > MAX_AUDIO_DURATION_SEC) {
    const fileMin = Math.round(sec / 60);
    const limitMin = Math.round(MAX_AUDIO_DURATION_SEC / 60);
    return {
      ok: false,
      title: "Dosya çok uzun",
      detail: `Bu dosya ${fileMin} dakika. En fazla ${limitMin} dakikalık dosya yükleyebilirsin — dinlemek istediğin bölümü kırpıp tekrar dene.`
    };
  }
  return { ok: true };
}

export async function validateAudioDuration(file) {
  const sec = await getAudioDurationSec(file);
  return evaluateAudioDuration(sec);
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

  // G122 — Stereo Genişlik'in "her yeni turda dosyanın FARKLI/enerjili bir
  // noktasından başla" ihtiyacı için: startFromZero()'nun AYNI deseni,
  // sadece 0 yerine keyfi bir saniyeye atlıyor. buffer.duration'a göre
  // sarılır (negatif/aşan bir saniye verilirse bile GEÇERSİZ bir offset'te
  // TAKILMAZ). Diğer modlar/Araçlar bu fonksiyonu HİÇ çağırmıyor — mevcut
  // pause/resume/loop davranışı (bkz. dosya başı notu) BİR SATIR değişmedi.
  function seekTo(sec) {
    if (!buffer || !Number.isFinite(sec)) return;
    offset = ((sec % buffer.duration) + buffer.duration) % buffer.duration;
    playing = false;
  }

  async function loadFile(file) {
    if (!file) return { ok: false };

    pausePlayback();
    buffer = null;
    offset = 0;
    playing = false;

    let arrayBuffer;
    const t2_0 = performance.now();
    uploadDiagLog(2, "ArrayBuffer'a dönüştürme (file.arrayBuffer)", "BAŞLIYOR", `${(file.size / 1048576).toFixed(1)} MB`);
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (e) {
      uploadDiagLog(2, "ArrayBuffer'a dönüştürme (file.arrayBuffer)", "HATA", `${(performance.now() - t2_0).toFixed(0)} ms — ${e && e.message}`);
      console.error("[upload] dosya okunamadı:", e && e.name, e && e.message, e);
      return { ok: false, title: "Dosya okunamadı", detail: `Bu dosya açılamadı. Farklı bir dosya dene — desteklenenler: ${FULL_AUDIO_FORMAT_LIST}.` };
    }
    uploadDiagLog(2, "ArrayBuffer'a dönüştürme (file.arrayBuffer)", "BİTTİ", `${(performance.now() - t2_0).toFixed(0)} ms, ${arrayBuffer.byteLength} bayt`);
    if (arrayBuffer.byteLength === 0) {
      return { ok: false, title: "Dosya boş", detail: "Bu dosyada okunacak veri yok. Farklı bir dosya dene." };
    }

    const ctx = getAudioCtx();
    let decodeErr = null;
    const t3_0 = performance.now();
    uploadDiagLog(3, "decodeAudioData", "BAŞLIYOR");
    try {
      // Kopya üzerinde çalış — bazı motorlar decodeAudioData'ya verilen ArrayBuffer'ı
      // "neuter" edebiliyor; başarısız olursa orijinal arrayBuffer WAV yedeği için
      // sağlam kalmalı.
      buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      uploadDiagLog(3, "decodeAudioData", "BİTTİ (başarılı)", `${(performance.now() - t3_0).toFixed(0)} ms`);
    } catch (e) {
      decodeErr = e;
      buffer = null;
      uploadDiagLog(3, "decodeAudioData", "BAŞARISIZ (WAV yedeğine düşülecek mi kontrol edilecek)", `${(performance.now() - t3_0).toFixed(0)} ms — ${e && e.name}: ${e && e.message}`);
    }

    if (!buffer) {
      const isRiffWave = arrayBuffer.byteLength >= 12
        && String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4)) === "RIFF"
        && String.fromCharCode(...new Uint8Array(arrayBuffer, 8, 4)) === "WAVE";
      if (isRiffWave) {
        const t3b_0 = performance.now();
        uploadDiagLog(3, "elle WAV ayrıştırıcıya düşme (decodeWavPcm)", "BAŞLIYOR");
        try {
          // G104 — decodeWavPcm ASENKRON (bkz. wav-parser.js'in kendi G104
          // notu) — büyük dosyalarda ana iş parçacığını bloklamadan periyodik
          // nefes veriyor.
          const wav = await decodeWavPcm(arrayBuffer);
          uploadDiagLog(3, "elle WAV ayrıştırıcıya düşme (decodeWavPcm)", "BİTTİ (ayrıştırma)", `${(performance.now() - t3b_0).toFixed(0)} ms, ${wav.numChannels}ch/${wav.sampleRate}Hz`);
          const t3c_0 = performance.now();
          const wavBuffer = ctx.createBuffer(wav.numChannels, wav.channelData[0].length, wav.sampleRate);
          for (let ch = 0; ch < wav.numChannels; ch++) wavBuffer.copyToChannel(wav.channelData[ch], ch);
          buffer = wavBuffer;
          uploadDiagLog(3, "elle WAV ayrıştırıcıya düşme (createBuffer+copyToChannel)", "BİTTİ", `${(performance.now() - t3c_0).toFixed(0)} ms`);
        } catch (wavErr) {
          uploadDiagLog(3, "elle WAV ayrıştırıcıya düşme (decodeWavPcm)", "HATA", `${(performance.now() - t3b_0).toFixed(0)} ms — ${wavErr && wavErr.message}`);
          console.error("[upload] decodeAudioData hatası:", decodeErr && decodeErr.name, decodeErr && decodeErr.message, decodeErr);
          console.error("[upload] elle WAV ayrıştırma hatası:", wavErr && wavErr.message, wavErr);
          buffer = null;
        }
      } else {
        console.error("[upload] decodeAudioData hatası:", decodeErr && decodeErr.name, decodeErr && decodeErr.message, decodeErr);
      }
    }

    if (!buffer) {
      return { ok: false, title: "Bu dosya açılamadı", detail: `Lütfen desteklenen bir formatta dosya dene: ${FULL_AUDIO_FORMAT_LIST}.` };
    }

    return { ok: true };
  }

  // G99: analysis.js'in (Araçlar ölçüm motoru) girdisi doğrudan bir
  // AudioBuffer — önceki tasarım (duration/hasBuffer) BİLEREK buffer'ı hiç
  // dışarı sızdırmıyordu (yukarıdaki eski not), ama ölçüm motoru GERÇEK PCM
  // veriye ihtiyaç duyduğu için bu artık kaçınılmaz — getSourceNode()'un AYNI
  // deseniyle (fonksiyon çağrısı, silent getter DEĞİL) açıkça isimlendirildi.
  function getBuffer() {
    return buffer;
  }

  // G123 — "dosya seçimi mod başına": bu uploadManager artık TEK bir paylaşılan
  // buffer'ı BİRDEN FAZLA bağlam (Araçlar + her mod) arasında GEÇİŞ YAPARAK
  // taşıyor (bkz. app.js ensureUploadSelectionLoaded) — bir bağlamın hiç
  // seçimi yoksa ya da başka bir bağlama geçilirken eski buffer'ın YANLIŞLIKLA
  // "bu bağlamın dosyası" gibi görünmemesi için AÇIKÇA boşaltan bir yol
  // gerekiyordu. startFromZero()'nun AKSİNE offset'i SIFIRLAMAKLA kalmaz,
  // buffer'ın KENDİSİNİ de null'lar (hasBuffer bundan sonra false döner).
  function clear() {
    buffer = null;
    offset = 0;
    playing = false;
  }

  return {
    loadFile,
    pausePlayback,
    startFromZero,
    seekTo,
    clear,
    getSourceNode,
    getBuffer,
    get hasBuffer() { return !!buffer; },
    // G88: Araçlar sekmesinin "Son yüklenenler" satırı gerçek dosya süresini
    // gösteriyor (bkz. app.js processToolsUploadFile) — hasBuffer'ın AYNI
    // deseni, buffer'ı dışarı SIZDIRMADAN (sadece türetilmiş bir sayı).
    get duration() { return buffer ? buffer.duration : 0; },
    // G159 — Araçlar'ın seek/süre göstergesi için: playing ise startedAt'tan
    // beri geçen süreyi offset'e ekleyip sarar (getSourceNode ile AYNI
    // hesap), durmuşsa doğrudan offset'i döner.
    get elapsed() {
      if (!buffer) return 0;
      if (!playing) return offset;
      const ctx = getAudioCtx();
      return (offset + (ctx.currentTime - startedAt)) % buffer.duration;
    }
  };
}

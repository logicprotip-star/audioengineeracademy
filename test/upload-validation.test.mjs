// validateAudioFile()/ALLOWED_AUDIO_EXTENSIONS/audioAcceptAttr() — #52
// DÜZELTMESİ (".aif" ".aiff"e normalize ediliyor, ayrı bir format olarak
// EKLENMEDİ ki FULL_AUDIO_FORMAT_LIST kullanıcıya "AIFF/AIF" gibi
// yanıltıcı bir tekrar göstermesin). Sahte bir File nesnesi yeterli — bu
// fonksiyon sadece file.name/file.size okuyor, gerçek bayt/decode YOK.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateAudioFile, audioAcceptAttr, ALLOWED_AUDIO_EXTENSIONS, FULL_AUDIO_FORMAT_LIST, evaluateAudioDuration, MAX_AUDIO_DURATION_SEC, evaluateDecodedAudio, MIN_AUDIO_DURATION_SEC, SILENCE_PEAK_THRESHOLD } from "../www/js/core/upload.js";

function fakeFile(name, sizeMb = 1) {
  return { name, size: sizeMb * 1024 * 1024 };
}

describe("validateAudioFile() — #52: .aif de .aiff kadar kabul edilmeli", () => {
  it(".aiff kabul edilir (zaten desteklenen format)", () => {
    assert.equal(validateAudioFile(fakeFile("mix.aiff")).ok, true);
  });

  it(".aif de KABUL EDİLİR — düzeltme ÖNCESİ reddediyordu (Logic Pro/macOS'un yaygın kısa AIFF uzantısı)", () => {
    assert.equal(validateAudioFile(fakeFile("mix.aif")).ok, true);
  });

  it("büyük/küçük harf .AIF/.Aif de kabul edilir (mevcut .toLowerCase() davranışıyla TUTARLI)", () => {
    assert.equal(validateAudioFile(fakeFile("mix.AIF")).ok, true);
    assert.equal(validateAudioFile(fakeFile("mix.Aif")).ok, true);
  });

  it("gerçekten desteklenmeyen bir uzantı (ör. .xyz) HÂLÂ reddedilir, hata mesajında YAZILAN uzantı görünür (normalize edilmiş DEĞİL)", () => {
    const res = validateAudioFile(fakeFile("mix.xyz"));
    assert.equal(res.ok, false);
    assert.match(res.detail, /\.xyz/);
  });

  it("FULL_AUDIO_FORMAT_LIST'te 'AIFF' bir kez geçer, 'AIF' AYRI bir girdi olarak GÖRÜNMEZ (yanıltıcı tekrar önlendi)", () => {
    assert.equal((FULL_AUDIO_FORMAT_LIST.match(/AIFF/g) || []).length, 1);
    assert.ok(!/\bAIF\//.test(FULL_AUDIO_FORMAT_LIST) && !/\/AIF\b/.test(FULL_AUDIO_FORMAT_LIST), "AIF ayrı bir liste girdisi olarak sızmamalı");
  });

  it("audioAcceptAttr() dosya seçici filtresi hem .aiff hem .aif içerir (iOS native seçici validateAudioFile'a hiç ulaşmadan filtreleyebilir)", () => {
    const accept = audioAcceptAttr();
    assert.ok(accept.includes(".aiff"));
    assert.ok(accept.includes(".aif"));
  });

  it("ALLOWED_AUDIO_EXTENSIONS (kullanıcıya görünen kanonik liste) 'aif' İÇERMEZ — sadece 'aiff', alias AYRI tutuluyor", () => {
    assert.ok(!ALLOWED_AUDIO_EXTENSIONS.includes("aif"));
    assert.ok(ALLOWED_AUDIO_EXTENSIONS.includes("aiff"));
  });
});

// evaluateAudioDuration() — TUR3A bulgusu (🔴): 100 MB'lık sıkıştırılmış bir
// dosya decode edilince ~1-2 GB RAM'e büyüyebiliyor, sadece BOYUT kontrol
// ediliyordu, SÜRE değil. Bu fonksiyon SAF (sec sayısı alır, `Audio`/
// `URL.createObjectURL` GEREKTİRMEZ) — asıl metadata-okuma yolu
// (getAudioDurationSec) tarayıcı-bağımlı olduğu için burada test EDİLMEDİ.
describe("evaluateAudioDuration() — 7 dakika sınırı (TUR3A)", () => {
  it("süre bilinmiyorsa (null, metadata okunamadı) SESSİZCE kabul edilir — yanlış pozitif ret üretilmez", () => {
    assert.equal(evaluateAudioDuration(null).ok, true);
  });

  it("sınırın altındaki bir süre (5 dakika) kabul edilir", () => {
    assert.equal(evaluateAudioDuration(5 * 60).ok, true);
  });

  it("TAM sınırda (7 dakika, 420sn) kabul edilir — sınırın kendisi dahil, boyut kontrolüyle AYNI '>' deseni", () => {
    assert.equal(evaluateAudioDuration(MAX_AUDIO_DURATION_SEC).ok, true);
  });

  it("sınırı 1 saniye aşan bir dosya (421sn) reddedilir", () => {
    const res = evaluateAudioDuration(MAX_AUDIO_DURATION_SEC + 1);
    assert.equal(res.ok, false);
  });

  it("12 dakikalık bir dosya reddedilir, mesaj kullanıcının örneğiyle TUTARLI ('Bu dosya 12 dakika... 7 dakikalık')", () => {
    const res = evaluateAudioDuration(12 * 60);
    assert.equal(res.ok, false);
    assert.match(res.detail, /12 dakika/);
    assert.match(res.detail, /7 dakikalık/);
  });

  it("hata başlığı boyut sınırı mesajından AYIRT EDİLEBİLİR ('Dosya çok uzun' ≠ 'Dosya çok büyük')", () => {
    const res = evaluateAudioDuration(12 * 60);
    assert.equal(res.title, "Dosya çok uzun");
    assert.notEqual(res.title, "Dosya çok büyük");
  });

  it("kırpma YOK — mesaj kullanıcıyı kendi kırpmasına yönlendiriyor, otomatik kırpma önermiyor", () => {
    const res = evaluateAudioDuration(12 * 60);
    assert.match(res.detail, /kırpıp tekrar dene/);
  });
});

// G296 (OLCUM-GUVENLIK-18-08 madde 11) — evaluateDecodedAudio(): decode
// BAŞARILI olduktan SONRA, gerçek ses TAŞIMAYAN (0sn/kesik/tamamen sessiz)
// bir buffer'ı reddeder. SAF (bkz. dosya başı notu — gerçek bir AudioBuffer
// GEREKMİYOR, aynı şekle sahip sahte bir nesne yeterli).
function fakeBuffer({ duration, sampleRate = 44100, samples }) {
  const data = samples instanceof Float32Array ? samples : new Float32Array(samples || []);
  return {
    duration,
    sampleRate,
    length: data.length,
    getChannelData: () => data,
  };
}

function silentSamples(n) {
  return new Float32Array(n); // varsayılan 0 — dizi zaten sıfırlarla dolu
}

function toneSamples(n, amp = 0.5) {
  const arr = new Float32Array(n);
  for (let i = 0; i < n; i++) arr[i] = Math.sin(i * 0.1) * amp;
  return arr;
}

describe("evaluateDecodedAudio() — bozuk/sessiz dosya tespiti (G296)", () => {
  it("null/undefined buffer reddedilir ('Dosya bozuk görünüyor')", () => {
    const res = evaluateDecodedAudio(null);
    assert.equal(res.ok, false);
    assert.equal(res.title, "Dosya bozuk görünüyor");
  });

  it("0 saniyelik (duration=0) buffer reddedilir", () => {
    const res = evaluateDecodedAudio(fakeBuffer({ duration: 0, samples: silentSamples(0) }));
    assert.equal(res.ok, false);
    assert.equal(res.title, "Dosya bozuk görünüyor");
  });

  it("MIN_AUDIO_DURATION_SEC'in (100ms) ALTINDA kalan bir süre (ör. kesik dosya, ~1ms) reddedilir", () => {
    const res = evaluateDecodedAudio(fakeBuffer({ duration: 0.001, sampleRate: 44100, samples: toneSamples(44) }));
    assert.equal(res.ok, false);
    assert.equal(res.title, "Dosya bozuk görünüyor");
  });

  it("TAM MIN_AUDIO_DURATION_SEC sınırında (100ms) — ses de varsa KABUL edilir (sınırın kendisi dahil)", () => {
    const n = Math.round(MIN_AUDIO_DURATION_SEC * 44100);
    const res = evaluateDecodedAudio(fakeBuffer({ duration: MIN_AUDIO_DURATION_SEC, sampleRate: 44100, samples: toneSamples(n) }));
    assert.equal(res.ok, true);
  });

  it("GEÇERLİ ama ÇOK KISA dosyalar (1-2sn, gerçek ses İÇEREN) REDDEDİLMEZ — task'ın kendi kısıtı", () => {
    for (const sec of [1, 1.5, 2]) {
      const n = Math.round(sec * 44100);
      const res = evaluateDecodedAudio(fakeBuffer({ duration: sec, sampleRate: 44100, samples: toneSamples(n) }));
      assert.equal(res.ok, true, `${sec}sn'lik geçerli dosya reddedilmemeliydi`);
    }
  });

  it("tamamen sessiz (tüm örnekler 0) bir dosya reddedilir, süre yeterli olsa bile", () => {
    const res = evaluateDecodedAudio(fakeBuffer({ duration: 3, sampleRate: 44100, samples: silentSamples(3 * 44100) }));
    assert.equal(res.ok, false);
    assert.equal(res.title, "Dosya sessiz görünüyor");
  });

  it("SILENCE_PEAK_THRESHOLD'un HEMEN ALTINDA kalan bir tepe değeri de sessiz sayılır", () => {
    const n = 44100;
    const samples = silentSamples(n);
    samples[100] = SILENCE_PEAK_THRESHOLD * 0.5; // eşiğin yarısı
    const res = evaluateDecodedAudio(fakeBuffer({ duration: 1, sampleRate: 44100, samples }));
    assert.equal(res.ok, false, "eşik altındaki tepe sessiz sayılmalıydı");
  });

  it("SILENCE_PEAK_THRESHOLD'u AŞAN bir tek örnek bile dosyayı KABUL ettirir", () => {
    const n = 44100;
    const samples = silentSamples(n);
    samples[100] = SILENCE_PEAK_THRESHOLD * 2; // eşiğin üstü
    const res = evaluateDecodedAudio(fakeBuffer({ duration: 1, sampleRate: 44100, samples }));
    assert.equal(res.ok, true);
  });

  it("normal/dolu bir ses (kataloğun kendi ~-6dBFS tepe seviyesine YAKIN) sorunsuz kabul edilir", () => {
    const n = 5 * 44100;
    const res = evaluateDecodedAudio(fakeBuffer({ duration: 5, sampleRate: 44100, samples: toneSamples(n, 0.5) }));
    assert.equal(res.ok, true);
  });

  it("hata başlıkları BİRBİRİNDEN ve diğer ret mesajlarından AYIRT EDİLEBİLİR ('Dosya bozuk görünüyor' ≠ 'Dosya sessiz görünüyor' ≠ 'Dosya çok uzun'/'Dosya çok büyük'/'Bu dosya açılamadı')", () => {
    const corrupt = evaluateDecodedAudio(fakeBuffer({ duration: 0.01, samples: toneSamples(4) }));
    const silent = evaluateDecodedAudio(fakeBuffer({ duration: 1, samples: silentSamples(44100) }));
    assert.equal(corrupt.title, "Dosya bozuk görünüyor");
    assert.equal(silent.title, "Dosya sessiz görünüyor");
    assert.notEqual(corrupt.title, silent.title);
    for (const other of ["Dosya çok uzun", "Dosya çok büyük", "Bu dosya açılamadı"]) {
      assert.notEqual(corrupt.title, other);
      assert.notEqual(silent.title, other);
    }
  });
});

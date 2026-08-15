// validateAudioFile()/ALLOWED_AUDIO_EXTENSIONS/audioAcceptAttr() — #52
// DÜZELTMESİ (".aif" ".aiff"e normalize ediliyor, ayrı bir format olarak
// EKLENMEDİ ki FULL_AUDIO_FORMAT_LIST kullanıcıya "AIFF/AIF" gibi
// yanıltıcı bir tekrar göstermesin). Sahte bir File nesnesi yeterli — bu
// fonksiyon sadece file.name/file.size okuyor, gerçek bayt/decode YOK.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateAudioFile, audioAcceptAttr, ALLOWED_AUDIO_EXTENSIONS, FULL_AUDIO_FORMAT_LIST, evaluateAudioDuration, MAX_AUDIO_DURATION_SEC } from "../www/js/core/upload.js";

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

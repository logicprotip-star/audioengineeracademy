// G283/G286 — App Store yorum isteme. SADECE SAF fonksiyonlar test
// ediliyor: `shouldRequestReview` (ŞİMDİ istemeli miyiz — olgunluk/cooldown)
// ve `canRequestNativeReview` (native köprü ÇAĞRILMAYA DEĞER mi — G286).
// GERÇEK native çağrı (app.js:requestNativeStoreReview,
// `window.Capacitor.nativePromise(...)`) DOM'a bağımlı, Node'da test
// EDİLEMEZ — o e2e/manuel cihaz doğrulamasının kapsamında (bkz. DURUM.md
// G286, Swift tarafı Logic'in Xcode kontrolüne bırakıldı).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldRequestReview, MATURITY_MIN_ROUNDS, REQUEST_COOLDOWN_MS, canRequestNativeReview } from "../www/js/core/review-request.js";

describe("shouldRequestReview() — olgunluk eşiği", () => {
  it("MATURITY_MIN_ROUNDS'un ALTINDA (hiç istenmemiş) — false", () => {
    assert.equal(shouldRequestReview({ totalRoundsEver: MATURITY_MIN_ROUNDS - 1, lastRequestedAt: null }), false);
  });
  it("TAM MATURITY_MIN_ROUNDS'ta (hiç istenmemiş) — true", () => {
    assert.equal(shouldRequestReview({ totalRoundsEver: MATURITY_MIN_ROUNDS, lastRequestedAt: null }), true);
  });
  it("0 tur (taze kurulum) — false", () => {
    assert.equal(shouldRequestReview({ totalRoundsEver: 0, lastRequestedAt: null }), false);
  });
});

describe("shouldRequestReview() — cooldown", () => {
  const now = 1_000_000_000_000;
  it("cooldown İÇİNDE (yakın zamanda istenmiş) — false, olgunluk yeterli olsa bile", () => {
    assert.equal(shouldRequestReview({ totalRoundsEver: 500, lastRequestedAt: now - 1000, now }), false);
  });
  it("cooldown TAM sınırında (== REQUEST_COOLDOWN_MS önce) — true (bekleme TAMAMEN doldu)", () => {
    assert.equal(shouldRequestReview({ totalRoundsEver: 500, lastRequestedAt: now - REQUEST_COOLDOWN_MS, now }), true);
  });
  it("cooldown sınırından 1ms ÖNCE (henüz dolmadı) — false", () => {
    assert.equal(shouldRequestReview({ totalRoundsEver: 500, lastRequestedAt: now - REQUEST_COOLDOWN_MS + 1, now }), false);
  });
  it("lastRequestedAt null (hiç istenmemiş) — cooldown UYGULANMAZ, sadece olgunluğa bakılır", () => {
    assert.equal(shouldRequestReview({ totalRoundsEver: 500, lastRequestedAt: null, now }), true);
  });
});

describe("shouldRequestReview() — girdi sağlamlığı", () => {
  it("parametre hiç verilmezse çökmez, false döner", () => {
    assert.equal(shouldRequestReview(), false);
  });
  it("totalRoundsEver undefined/NaN ise false (asla yanlışlıkla true'ya düşmez)", () => {
    assert.equal(shouldRequestReview({ totalRoundsEver: undefined, lastRequestedAt: null }), false);
    assert.equal(shouldRequestReview({ totalRoundsEver: NaN, lastRequestedAt: null }), false);
  });
});

// G286 — KABUL KRİTERİ: "JS tarafı test edilebilir (native yokken sessizce
// false)". `window.Capacitor`'ın GERÇEK/sahte şekillerini taklit eden
// nesnelerle — audio-engine.js:getAudioSessionPlugin()'in cihazda
// KANITLANMIŞ (G135) kontrol zincirinin AYNISI.
describe("canRequestNativeReview() — native köprü VARLIĞI (G286)", () => {
  it("capacitor hiç yoksa (Web/ilk yükleme) — false", () => {
    assert.equal(canRequestNativeReview(null, null), false);
    assert.equal(canRequestNativeReview(undefined, undefined), false);
  });

  it("platform iOS DEĞİLSE (web/android) — false, capacitor VAR olsa bile", () => {
    const capacitor = { nativePromise: () => {}, isPluginAvailable: () => true };
    assert.equal(canRequestNativeReview(capacitor, "web"), false);
    assert.equal(canRequestNativeReview(capacitor, "android"), false);
  });

  it("nativePromise fonksiyon DEĞİLSE (eski/bundler'lı Capacitor JS API'si, G135'in bulduğu boşluk) — false", () => {
    const capacitor = { nativePromise: undefined, isPluginAvailable: () => true };
    assert.equal(canRequestNativeReview(capacitor, "ios"), false);
    const capacitor2 = { nativePromise: "fonksiyon değil", isPluginAvailable: () => true };
    assert.equal(canRequestNativeReview(capacitor2, "ios"), false);
  });

  it("isPluginAvailable('AudioSessionPlugin') false dönerse — false (plugin native tarafta kayıtlı DEĞİL)", () => {
    const capacitor = { nativePromise: () => {}, isPluginAvailable: (name) => name !== "AudioSessionPlugin" };
    assert.equal(canRequestNativeReview(capacitor, "ios"), false);
  });

  it("isPluginAvailable HİÇ YOKSA (Capacitor'ın bazı sürümlerinde olmayabilir) — kontrol ATLANIR, diğer şartlar yeterliyse true", () => {
    const capacitor = { nativePromise: () => {} }; // isPluginAvailable YOK
    assert.equal(canRequestNativeReview(capacitor, "ios"), true);
  });

  it("HER ŞART sağlanıyorsa (iOS + nativePromise + plugin kayıtlı) — true", () => {
    const capacitor = { nativePromise: () => {}, isPluginAvailable: (name) => name === "AudioSessionPlugin" };
    assert.equal(canRequestNativeReview(capacitor, "ios"), true);
  });
});

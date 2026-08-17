// G283 — App Store yorum isteme kararı. SADECE karar fonksiyonu (SAF) test
// ediliyor; native çağrı (app.js:requestNativeStoreReview) BİLEREK NO-OP —
// Capacitor'da hazır bir plugin yok, bkz. DURUM.md G283.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldRequestReview, MATURITY_MIN_ROUNDS, REQUEST_COOLDOWN_MS } from "../www/js/core/review-request.js";

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

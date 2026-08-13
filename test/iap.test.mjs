// StoreKit / Google Play Billing — G168. SADECE saf fonksiyonlar test
// edilir (isUserCancelledError/isNetworkError/PRODUCT_ID): native IAP
// çağrıları (purchasePro/restorePro/checkProOwnership/fetchProPrice)
// window.Capacitor'a bağımlı — bu ortamda (node --test, DOM yok) test
// edilemez, Playwright'ta mock plugin ile ayrıca doğrulandı (bkz. DURUM.md).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_ID, isUserCancelledError, isNetworkError } from "../www/js/core/iap.js";

describe("iap: PRODUCT_ID", () => {
  it("App Store Connect'te tanımlanan ürün kimliğiyle BİREBİR eşleşir", () => {
    assert.equal(PRODUCT_ID, "com.logicprotrick.audioengineeracademy.pro");
  });
});

describe("iap: isUserCancelledError", () => {
  it("@capgo/native-purchases'ın 'User cancelled' mesajını tanır", () => {
    assert.equal(isUserCancelledError(new Error("User cancelled the purchase")), true);
  });
  it("başka bir hata mesajını YANLIŞ pozitif SAYMAZ", () => {
    assert.equal(isUserCancelledError(new Error("Network request failed")), false);
    assert.equal(isUserCancelledError(new Error("Product not found")), false);
  });
  it("null/undefined/mesajsız hata çökmez, false döner", () => {
    assert.equal(isUserCancelledError(null), false);
    assert.equal(isUserCancelledError(undefined), false);
    assert.equal(isUserCancelledError({}), false);
  });
});

describe("iap: isNetworkError", () => {
  it("mesajında 'Network' geçen hataları tanır", () => {
    assert.equal(isNetworkError(new Error("Network error occurred")), true);
  });
  it("iptal/başka hatalarla KARIŞMAZ", () => {
    assert.equal(isNetworkError(new Error("User cancelled the purchase")), false);
    assert.equal(isNetworkError(null), false);
  });
});

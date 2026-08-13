// AdMob ödüllü reklam — G165. SADECE saf fonksiyon test edilir
// (pickRewardedAdUnitId): platform+test modu → hangi birim ID. Native
// AdMob çağrıları (watchRewardedAd/showPrivacyOptions/ensureAdMobReady)
// window.Capacitor'a bağımlı — bu ortamda (node --test, DOM yok) test
// edilemez, Playwright'ta mock plugin ile ayrıca doğrulandı (bkz. DURUM.md).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickRewardedAdUnitId, AD_TEST_MODE } from "../www/js/core/ads.js";

describe("ads: pickRewardedAdUnitId", () => {
  it("test modunda Google'ın resmi test birim ID'lerini döner (hesaptan bağımsız)", () => {
    assert.equal(pickRewardedAdUnitId("ios", true), "ca-app-pub-3940256099942544/1712485313");
    assert.equal(pickRewardedAdUnitId("android", true), "ca-app-pub-3940256099942544/5224354917");
  });

  it("canlı modda kullanıcının verdiği GERÇEK birim ID'lerini döner", () => {
    assert.equal(pickRewardedAdUnitId("ios", false), "ca-app-pub-4668080539411473/5501723169");
    assert.equal(pickRewardedAdUnitId("android", false), "ca-app-pub-4668080539411473/1562478152");
  });

  it("bilinmeyen/web platformu android tablosuna düşer (varsayılan dal)", () => {
    assert.equal(pickRewardedAdUnitId("web", true), "ca-app-pub-3940256099942544/5224354917");
  });

  it("test ve canlı ID'ler HİÇ karışmaz — dört kombinasyon da birbirinden farklı", () => {
    const ids = [
      pickRewardedAdUnitId("ios", true),
      pickRewardedAdUnitId("android", true),
      pickRewardedAdUnitId("ios", false),
      pickRewardedAdUnitId("android", false),
    ];
    assert.equal(new Set(ids).size, 4);
  });

  it("AD_TEST_MODE varsayılan olarak AÇIK — yayına almadan önce tek satırla değiştirilir", () => {
    assert.equal(AD_TEST_MODE, true);
  });
});

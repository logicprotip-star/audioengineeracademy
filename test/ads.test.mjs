// AdMob ödüllü reklam — G165. Çoğu SAF fonksiyon test edilir
// (pickRewardedAdUnitId): platform+test modu → hangi birim ID.
// showPrivacyOptions()/ensureAdMobReady() (UMP form/ATT — kullanıcı
// etkileşimli akışlar) window.Capacitor'a bağımlı VE gerçek bir kullanıcı
// jesti/ekranı gerektirdiği için bu ortamda test edilemez, Playwright'ta
// mock plugin ile ayrıca doğrulanmalı. AMA watchRewardedAd() — G234'ün
// zaman aşımı testleri (aşağıda) — window.Capacitor'ı TAMAMEN sahte bir
// admob nesnesiyle kurup GERÇEK kodu (mock DEĞİL) node:test'in
// mock.timers'ıyla çalıştırıyor; DOM gerekmiyor, sadece window.Capacitor
// köprüsü.

import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { pickRewardedAdUnitId, AD_TEST_MODE, AD_LOAD_TIMEOUT_MS, watchRewardedAd } from "../www/js/core/ads.js";

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

// G234 (TUR3B bulgusu 🔴) — prepareRewardVideoAd() askıda kalırsa "İzle"
// butonu kalıcı kilitleniyordu (zaman aşımı YOKTU). Bu ortamda (node --test,
// DOM yok) `window.Capacitor.Plugins.AdMob`'un TAMAMEN sahte bir sürümü
// kurulup watchRewardedAd()'ın GERÇEK kodu (mock DEĞİL) çalıştırılıyor —
// dosya başı notunun aksine (o not eski, henüz mock.timers denenmemişken
// yazılmış) BU test GERÇEKTEN çalışıyor, node:test'in mock.timers'ı
// setTimeout'u sahteleyip 30sn'yi ANINDA "geçiriyor".
function installFakeAdmob({ prepareHangs = true } = {}) {
  const calls = { showRewardVideoAd: 0, prepareRewardVideoAd: 0 };
  const listeners = {};
  const admob = {
    initialize: async () => {},
    requestConsentInfo: async () => ({ canRequestAds: true, isConsentFormAvailable: false, privacyOptionsRequirementStatus: "NOT_REQUIRED" }),
    addListener: async (event, cb) => { listeners[event] = cb; return { remove: () => {} }; },
    prepareRewardVideoAd: async () => {
      calls.prepareRewardVideoAd++;
      if (prepareHangs) return new Promise(() => {}); // SONSUZA kadar askıda — G234'ün simüle ettiği senaryo
      return {};
    },
    showRewardVideoAd: async () => { calls.showRewardVideoAd++; listeners[REWARD_EVENT_DISMISSED] && listeners[REWARD_EVENT_DISMISSED](); },
  };
  globalThis.window = {
    Capacitor: {
      getPlatform: () => "android", // iOS ATT akışını (kullanıcı-etkileşimli, AYRI zaman karakteristiği) devre dışı bırakmak için
      Plugins: { AdMob: admob },
    },
  };
  return { admob, calls };
}
const REWARD_EVENT_DISMISSED = "onRewardedVideoAdDismissed";

describe("G234 — reklam yükleme zaman aşımı (prepareRewardVideoAd askıda kalırsa)", () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ["setTimeout"] });
  });
  afterEach(() => {
    mock.timers.reset();
    delete globalThis.window;
  });

  it("prepareRewardVideoAd() SONSUZA kadar askıda kalırsa watchRewardedAd() yine de ÇÖZÜLÜR (zaman aşımıyla), sonsuza kadar BEKLEMEZ", async () => {
    const { calls } = installFakeAdmob({ prepareHangs: true });
    const resultPromise = watchRewardedAd({});
    // watchRewardedAd()'ın İÇİNDEKİ await zinciri (ensureAdMobReady →
    // requestConsentInfo → addListener × 4 → prepareRewardVideoAd) TAMAMEN
    // mikro-görev tabanlı (gerçek I/O yok) — setImmediate (GERÇEK bir
    // makro-görev sınırı, mock.timers'ın apis:["setTimeout"] kapsamı
    // DIŞINDA) bekleyerek TÜM bu zincirin, setTimeout() ÇAĞRILANA kadar,
    // yerleşmesi garanti edilir.
    await new Promise((resolve) => setImmediate(resolve));
    mock.timers.tick(AD_LOAD_TIMEOUT_MS);
    const result = await resultPromise;
    assert.equal(result.ok, false, "zaman aşımında ok:false dönmeli — buton bu değere göre çözülüyor");
    assert.ok(result.title, "kullanıcıya anlaşılır bir başlık gösterilmeli");
    assert.equal(calls.showRewardVideoAd, 0, "zaman aşımından SONRA reklam aniden gösterilmemeli");
  });

  it("prepareRewardVideoAd() NORMAL süresinde çözülürse zaman aşımı hiç devreye girmez, reklam normal gösterilir", async () => {
    const { calls } = installFakeAdmob({ prepareHangs: false });
    const result = await watchRewardedAd({});
    assert.equal(calls.showRewardVideoAd, 1, "normal akışta showRewardVideoAd ÇAĞRILMALI (regresyon kontrolü)");
    assert.equal(result.ok, false, "bu testte Rewarded olayı hiç ateşlenmedi, sadece Dismissed — ok:false BEKLENEN (ödülsüz kapanma)");
  });
});

// AdMob ödüllü reklam — G165. @capacitor-community/admob global köprüden
// okunuyor (window.Capacitor.Plugins.AdMob) — storage.js:getPrefs()/
// app.js:getVolumeButtonsPlugin() İLE AYNI desen, bundler/ES-import YOK. Web'de
// (Capacitor bridge'i yokken) plugin hiç yok — getAdMobPlugin() null döner,
// çağıran taraf (app.js) bunu "reklamlar sadece mobil uygulamada" mesajına çevirir.
//
// Sonuç sözleşmesi upload.js:validateAudioFile İLE AYNI desen:
// { ok:true } / { ok:false, title, detail } — title/detail YOKSA (sadece
// "kullanıcı reklamı yarıda kapattı") sessizce { ok:false } döner, hata
// TOASTI gösterilmez (bu bir hata değil, beklenen bir sonuç).

// ═══════════════════════════════════════════════════════════════════════════
// CANLIYA ALMADAN ÖNCE: bu satırı false yap. Test modunda HER ZAMAN Google'ın
// resmi test birim ID'leri kullanılır (aşağıdaki TEST_UNIT_IDS) — gerçek
// birim ID'lerin (LIVE_UNIT_IDS) YAYINDA bile yanlışlıkla gösterilme riski
// yok, çünkü test modu AÇIKKEN gerçek ID'ler hiç OKUNMUYOR. Kendi reklamına
// tıklamak AdMob hesabı kapatma sebebi — bu yüzden varsayılan AÇIK.
// ═══════════════════════════════════════════════════════════════════════════
export const AD_TEST_MODE = true;

// Google'ın resmi, herkese açık test birim ID'leri (hesabından bağımsız,
// geçersiz trafik riski yok) — https://developers.google.com/admob/ios/test-ads
// ve .../android/test-ads, bu turda doğrudan doğrulandı.
const TEST_UNIT_IDS = {
  ios: "ca-app-pub-3940256099942544/1712485313",
  android: "ca-app-pub-3940256099942544/5224354917",
};

// Kullanıcının verdiği GERÇEK ödüllü reklam birim ID'leri.
const LIVE_UNIT_IDS = {
  ios: "ca-app-pub-4668080539411473/5501723169",
  android: "ca-app-pub-4668080539411473/1562478152",
};

// RewardAdPluginEvents enum'ının @capacitor-community/admob@8.0.0'daki GERÇEK
// runtime string değerleri (npm paketi indirilip dist/esm çıktısı okunarak
// doğrulandı — tahmin edilmedi). Bundler/ES-import olmadığı için enum'un
// KENDİSİ import edilemiyor, bu yüzden string değerleri burada sabit.
const REWARD_EVENTS = {
  Loaded: "onRewardedVideoAdLoaded",
  FailedToLoad: "onRewardedVideoAdFailedToLoad",
  Showed: "onRewardedVideoAdShowed",
  FailedToShow: "onRewardedVideoAdFailedToShow",
  Dismissed: "onRewardedVideoAdDismissed",
  Rewarded: "onRewardedVideoAdReward",
};

// Saf fonksiyon — platform + test modu → hangi birim ID'nin isteneceği.
// Test edilebilir (bkz. test/ads.test.mjs), DOM/native bağımlılığı yok.
export function pickRewardedAdUnitId(platform, testMode) {
  const table = testMode ? TEST_UNIT_IDS : LIVE_UNIT_IDS;
  return table[platform === "ios" ? "ios" : "android"];
}

export function getPlatform() {
  return (window.Capacitor && window.Capacitor.getPlatform) ? window.Capacitor.getPlatform() : "web";
}

export function getAdMobPlugin() {
  return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) || null;
}

// initialize() bir kez, kalıcı bellek-içi promise ile — uygulama HER açılışta
// değil, kullanıcı reklamla İLK etkileşime geçtiğinde (ilk watchRewardedAd()
// ya da ilk showPrivacyOptions() çağrısı) tetiklenir. Reklamı hiç izlemeyen
// bir kullanıcı AdMob SDK'sını/UMP formunu hiç görmez.
let initPromise = null;
function ensureInitialized() {
  const admob = getAdMobPlugin();
  if (!admob) return Promise.resolve(false);
  if (!initPromise) initPromise = admob.initialize().then(() => true).catch(() => { initPromise = null; return false; });
  return initPromise;
}

// UMP (GDPR) onayı + iOS ATT — "kullanıcı ilk kez reklam izlemeye karar
// verdiğinde" tetiklenir (Apple'ın önerdiği bağlamsal ATT zamanlaması, UMP de
// AYNI ana bağlandı — ads'siz hiçbir kullanıcı bu akışı hiç görmez). UMP'nin
// KENDİ SDK'sı onay durumunu native tarafta kalıcı tutar — "her açılışta
// tekrar sorulmasın" burada AYRI bir localStorage alanı GEREKTİRMİYOR,
// requestConsentInfo()/showConsentForm() zaten SADECE gerekiyorsa formu açar.
let readyPromise = null;
function ensureAdMobReady() {
  if (!readyPromise) readyPromise = doInitFlow();
  return readyPromise;
}
async function doInitFlow() {
  const admob = getAdMobPlugin();
  if (!admob) return { ok: false, title: "Reklam kullanılamıyor", detail: "Reklamlar sadece mobil uygulamada gösterilir." };
  try {
    await ensureInitialized();
    let consentInfo = await admob.requestConsentInfo();
    if (!consentInfo.canRequestAds && consentInfo.isConsentFormAvailable) {
      consentInfo = await admob.showConsentForm();
    }
    if (getPlatform() === "ios") {
      const tracking = await admob.trackingAuthorizationStatus();
      if (tracking.status === "notDetermined") {
        await admob.requestTrackingAuthorization();
      }
    }
    if (!consentInfo.canRequestAds) {
      return { ok: false, title: "Reklam gösterilemiyor", detail: "Gizlilik tercihin nedeniyle şu an reklam gösterilemiyor. Ayarlar'dan tercihini değiştirebilirsin." };
    }
    return { ok: true };
  } catch (e) {
    readyPromise = null; // bir dahaki denemede yeniden dene, kalıcı olarak KİLİTLENMESİN
    return { ok: false, title: "Reklam sistemi başlatılamadı", detail: "Bağlantını kontrol edip tekrar dene." };
  }
}

// Ayarlar'daki "Reklam Tercihleri" giriş noktası (madde 4 — kullanıcı onay
// tercihini sonradan değiştirebilsin). ensureAdMobReady()'nin TAM kapısını
// (canRequestAds şartı) kullanmıyor — bölgesine göre gösterilecek bir gizlilik
// seçeneği YOKSA (privacyOptionsRequirementStatus !== "REQUIRED") bunu AÇIKÇA
// bildirir, plugin'i "canRequestAds false" diye tekrar TIKAMAZ.
export async function showPrivacyOptions() {
  const admob = getAdMobPlugin();
  if (!admob) return { ok: false, title: "Kullanılamıyor", detail: "Bu özellik sadece mobil uygulamada çalışır." };
  try {
    await ensureInitialized();
    const info = await admob.requestConsentInfo();
    if (info.privacyOptionsRequirementStatus !== "REQUIRED") {
      return { ok: false, title: "Gizlilik seçeneği yok", detail: "Şu an değiştirilebilecek bir reklam gizlilik tercihin yok (bölgene göre gerekmeyebilir)." };
    }
    await admob.showPrivacyOptionsForm();
    return { ok: true };
  } catch (e) {
    return { ok: false, title: "Açılamadı", detail: "Reklam tercihleri şu an açılamadı. Bağlantını kontrol edip tekrar dene." };
  }
}

// G234 (TUR3B bulgusu 🔴) — SADECE `prepareRewardVideoAd()` (ağ-bağımlı,
// kullanıcı etkileşimi İÇERMEYEN SDK çağrısı — reklamı İNDİRİR) zaman
// aşımına alındı. `showRewardVideoAd()`/`Dismissed` BİLEREK dışarıda
// bırakıldı: reklam GERÇEKTEN gösterilmeye başladıktan sonra tam ekran
// native overlay kullanıcının önünde, "Yükleniyor…" butonu artık GÖRÜNMÜYOR
// bile — asıl risk (görev metninin kendi tarifi) SADECE yükleme
// aşamasında. `ensureAdMobReady()`'nin (UMP onay formu/ATT izni)
// KENDİSİNE dokunulmadı — o adımlar kullanıcının KENDİ hızında
// etkileşim GEREKTİRİYOR (form okuma/karar verme), audio-engine.js'in
// `activateNativeSession()`'ından (arka planda, kullanıcı etkileşimsiz
// bir SDK çağrısı) FARKLI bir zaman karakteristiği — kısa bir zaman
// aşımı orada YANLIŞ pozitif üretirdi (yavaş OKUYAN bir kullanıcıyı
// "zaman aşımı" sanardı).
export const AD_LOAD_TIMEOUT_MS = 30000;

// Reklamı hazırlayıp gösterir, ödül KESİN olarak "Rewarded" olayıyla belirlenir
// (showRewardVideoAd()'ın kendi promise çözünürlüğüne GÜVENİLMEDİ — plugin'in
// derlenmiş kaynağındaki enum yorumu "Dismissed"in ödülle İLGİSİZ olduğunu
// AÇIKÇA söylüyor, bu yüzden ödül SADECE Rewarded olayından okunuyor, ekranın
// kapanma anı SADECE Dismissed'ten). onBeforeShow/onAfterShow — app.js'in
// KENDİ ses duraklatma/canlandırma fonksiyonlarını (G155'in visibilitychange
// zinciriyle AYNI fonksiyonlar) buradan ÇAĞIRMASI için hook — ads.js app.js'in
// içine reach-in YAPMIYOR, audio-engine.js:onContextRecreated İLE AYNI desen.
function loadAndShowRewardedAd(admob, adId, hooks) {
  return new Promise((resolve, reject) => {
    let rewarded = false;
    let settled = false;
    const handles = [];
    const cleanup = () => handles.forEach((h) => { try { h.remove(); } catch (e) {} });
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(arg);
    };
    Promise.all([
      admob.addListener(REWARD_EVENTS.Rewarded, () => { rewarded = true; }),
      admob.addListener(REWARD_EVENTS.FailedToLoad, (err) => finish(reject, err)),
      admob.addListener(REWARD_EVENTS.FailedToShow, (err) => finish(reject, err)),
      admob.addListener(REWARD_EVENTS.Dismissed, () => {
        if (hooks && hooks.onAfterShow) { try { hooks.onAfterShow(); } catch (e) {} }
        finish(resolve, rewarded);
      }),
    ])
      .then((h) => {
        handles.push(...h);
        // G234 — prepareRewardVideoAd() SDK'nın kendi zaman aşımını
        // GARANTİ ETMİYOR (dokümante edilmemiş) — düşük fill-rate/yavaş
        // ağda hiç çözülmeyip "İzle" butonunu kalıcı olarak "Yükleniyor…"
        // yazılı/disabled bırakabiliyordu (adWatchBusy modül-seviyesi,
        // ekran geçişleriyle sıfırlanmıyor — bkz. app.js:handleWatchAd).
        // Timeout kazanırsa showRewardVideoAd() HİÇ ÇAĞRILMAZ (aşağıdaki
        // .then zincire GİRMEZ) — reklam GEÇ hazır olsa bile kullanıcıya
        // ZATEN hata gösterildikten SONRA aniden açılmaz.
        const preparePromise = admob.prepareRewardVideoAd({ adId, isTesting: AD_TEST_MODE });
        // Zaman aşımından SONRA geç gelen bir red, konsola "unhandled
        // rejection" olarak sızmasın diye — akışı ETKİLEMEZ (race zaten
        // kazananı belirledi), sadece gürültüyü önler.
        preparePromise.catch(() => {});
        return Promise.race([
          preparePromise,
          new Promise((_, rej) => setTimeout(
            () => rej(new Error(`prepareRewardVideoAd() ${AD_LOAD_TIMEOUT_MS}ms içinde yanıt vermedi (zaman aşımı)`)),
            AD_LOAD_TIMEOUT_MS
          )),
        ]);
      })
      .then(() => {
        if (hooks && hooks.onBeforeShow) { try { hooks.onBeforeShow(); } catch (e) {} }
        return admob.showRewardVideoAd();
      })
      .catch((err) => finish(reject, err));
  });
}

// Ana giriş noktası — grantAdLife()'ı ÇAĞIRMAZ (o app.js'te kalır, can
// ekonomisi bu modülün konusu değil), SADECE "ödül hak edildi mi" sonucunu
// döner. hooks: { onBeforeShow, onAfterShow } — app.js'in ses kesinti
// bağlama/geri alma fonksiyonlarına bağlanır.
export async function watchRewardedAd(hooks) {
  const admob = getAdMobPlugin();
  if (!admob) return { ok: false, title: "Reklam kullanılamıyor", detail: "Reklamlar sadece mobil uygulamada gösterilir." };
  const ready = await ensureAdMobReady();
  if (!ready.ok) return ready;
  const adId = pickRewardedAdUnitId(getPlatform(), AD_TEST_MODE);
  try {
    const rewarded = await loadAndShowRewardedAd(admob, adId, hooks);
    return rewarded ? { ok: true } : { ok: false };
  } catch (e) {
    return { ok: false, title: "Reklam yüklenemedi", detail: "Bağlantını kontrol edip tekrar dene." };
  }
}

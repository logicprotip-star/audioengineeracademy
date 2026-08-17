// G283 — App Store yorum isteme (SKStoreReviewController / Android
// ReviewManager). Apple'ın kuralları (App Store Review Guidelines 4.3(f) +
// Human Interface Guidelines "Requesting Ratings and Reviews"): sistem
// diyaloğu yılda en fazla 3 kez GÖSTERİLİR — bu SINIR İŞLETİM SİSTEMİNİN
// KENDİSİ tarafından uygulanır, bizim tarafımızdan SAYILAMAZ/GARANTİ
// EDİLEMEZ (istek her çağrıldığında iOS SESSİZCE hiçbir şey göstermeyebilir
// — kod bu olasılığa HAZIR olmalı, aşağıdaki `requestNativeStoreReview`
// notuna bkz.). Zorlayıcı dil/özel "Yorum yap" butonu YASAK — SADECE
// sistem diyaloğu.
//
// Bu dosya SADECE "şimdi istemeli miyiz" kararını (SAF, test edilebilir)
// verir. GERÇEK native çağrı app.js'te `requestNativeStoreReview()` —
// G286'da OLCUM-YORUM-17-08.md'nin ÖNERDİĞİ "Yol A" ile bağlandı: mevcut
// `ios/App/App/AudioSessionPlugin.swift`'e (ZATEN MainViewController.swift'te
// kayıtlı, YENİ plugin/Main.storyboard değişikliği GEREKMEDİ) yeni bir
// `requestReview` metodu eklendi — `SKStoreReviewController`/`AppStore.
// requestReview` (StoreKit, ZATEN bağlı framework). Swift bu ortamda
// DERLENEMEDİ (Logic Xcode'da ⌘B ile doğrulayacak) — JS tarafı ise
// `window.Capacitor.nativePromise("AudioSessionPlugin","requestReview",{})`
// çağırıyor, `AudioSessionPlugin.swift`'in `activate` metodunun (G132/G135)
// AYNI KANITLANMIŞ köprü deseni.

// Olgunluk eşiği: en az bu kadar tur (stats.rounds, TÜM zamanların toplamı)
// oynanmış olmalı — task'ın "kullanıcı belirli bir olgunluğa ulaşmadan
// sorulmasın" şartı, eşik KENDİ KARARIM: core/paywall.js:
// FREE_SESSION_QUESTION_LIMIT=5'in EN AZ 6 katı (30/5=6 — "bir kez dokunup
// çıkan" değil, GERÇEKTEN birkaç ücretsiz oturum tüketmiş bir kullanıcı)
// ya da "10 Soruluk Bölüm"den (challenge.total=10) 3 TAM geçiş — İKİ
// bağımsız çerçeveleme de AYNI sayıya (30) yakınsıyor.
export const MATURITY_MIN_ROUNDS = 30;

// İki istek arası minimum bekleme — Apple'ın "yılda 3" sistem sınırının ÇOK
// altında (60 gün ≈ yılda ~6 TEORİK deneme tavanı, GERÇEKTE OS kendi
// sınırını UYGULAYACAĞI için bu SADECE bizim tarafımızda gereksiz sık
// çağrı YAPMAMAK için bir öz-disiplin) — KENDİ KARARIM, task'ın "zorlayıcı
// olmasın" ruhuna uygun bir güvenlik payı.
export const REQUEST_COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;

// SAF FONKSİYON — DOM/native/localStorage bağımsız, test edilebilir.
// totalRoundsEver: stats.rounds. lastRequestedAt: stats.lastReviewRequestAt
// (number epoch ms, ya da null — hiç istenmemiş).
export function shouldRequestReview({ totalRoundsEver, lastRequestedAt, now = Date.now() } = {}) {
  if (!(totalRoundsEver >= MATURITY_MIN_ROUNDS)) return false;
  if (typeof lastRequestedAt === "number" && now - lastRequestedAt < REQUEST_COOLDOWN_MS) return false;
  return true;
}

// G286 — native köprünün ÇAĞRILMAYA DEĞER olup olmadığını (VARLIĞINI)
// kontrol eder, GERÇEK çağrıyı YAPMAZ (o app.js'te — `window.Capacitor.
// nativePromise(...)` DOM'a bağımlı, Node'da test edilemez). `ads.js:
// getAdMobPlugin()`/`audio-engine.js:getAudioSessionPlugin()`'in AYNI
// "global bridge, katman katman kontrol et, yoksa false/null" deseni —
// SAF hâle getirilmiş: `capacitor`/`platform` parametre olarak verilir
// (gerçek çağrıda `window.Capacitor`/`window.Capacitor.getPlatform()`,
// testte sahte bir nesne). Metodun (`requestReview`) native tarafta
// GERÇEKTEN var olup olmadığı BURADA kontrol EDİLEMEZ (sadece PLUGIN'in
// kayıtlı olduğu anlaşılır) — o, GERÇEK çağrının try/catch'i (app.js)
// tarafından, "metot yoksa" durumunda native köprünün reddettiği
// promise'i yakalayarak ele alınıyor.
export function canRequestNativeReview(capacitor, platform) {
  if (!capacitor) return false;
  if (platform !== "ios") return false;
  if (typeof capacitor.nativePromise !== "function") return false;
  if (typeof capacitor.isPluginAvailable === "function" && !capacitor.isPluginAvailable("AudioSessionPlugin")) return false;
  return true;
}

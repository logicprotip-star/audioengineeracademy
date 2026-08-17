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
// Capacitor'da HAZIR bir review-request plugin'i YOK (grep+npm ile
// doğrulandı: `@capacitor-community/in-app-review` gibi bir paket bu
// projede kurulu DEĞİL, Capacitor CORE'un kendisi review isteği için bir
// API SUNMUYOR — sadece üçüncü-parti plugin'lerle mümkün). Eklemek
// `npm install` + `npx cap sync` (Podfile/Xcode proje dosyalarını
// DEĞİŞTİRİR, derleme doğrulaması bu ortamdan YAPILAMAZ) gerektiriyor —
// bu NEDENLE native çağrı YAZILMADI, KOD YAZMADAN bildirildi (bkz.
// DURUM.md G283). `requestNativeStoreReview()` şimdilik NO-OP.

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

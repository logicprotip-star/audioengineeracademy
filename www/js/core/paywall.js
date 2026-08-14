// Ücretsiz/Pro ERİŞİM kısıtlama mantığı — SAF fonksiyonlar (ses/DOM bağımsız,
// CLAUDE.md'nin createQuestion/evaluateAnswer için istediği saflık burada TÜM
// modüle uygulandı: hiçbir fonksiyon Date.now()/localStorage'ı KENDİSİ okumaz,
// çağıran taraf (app.js) zaman/durumu PARAMETRE olarak geçirir — testler bu
// yüzden gerçek saat/DOM olmadan çalışabiliyor).
//
// Bu dosya SADECE kuralları temsil eder — satın alma (IAP), paywall EKRANI,
// reklam burada YOK (task: "Parça 1 — sadece kurallar"). isUserPro() hâlâ
// app.js'te (gerçek IAP sonraki parça); burada sadece "isPro true/false iken
// ne olmalı" sorusunun cevabı var. Kaynak: PAYWALL.md.

// ---- Seviye kilidi (G62 düzeltmesi, G163'te TAMAMEN KALDIRILDI) ----

// G62: Seviye/sınav kilidi SADECE Pro'da anlamlıydı (free'de sınav hiç
// devreye girmediği için seviye de hiç ilerlemiyordu) — ücretsiz kullanıcının
// hiç ulaşamayacağı bir eşiğe takılması ANLAMSIZDI, isPro=false'ta kilit
// HER ZAMAN açıktı.
// G163 — kullanıcı kararı: "Pro alan kullanıcı seviye ile uğraşmasın."
// Ücretsizde zaten kilit yoktu, artık Pro'da da yok — kilit KOŞULSUZ açık.
// mode-catalog.js'teki unlockLevel alanları SİLİNMEDİ (ileride geri
// açılabilsin diye, task'ın kendi kararı) ama artık HİÇBİR yerde okunmuyor
// (bkz. app.js renderExerciseGrid — "Seviye yetersiz" toast dalı kaldırıldı).
// İmza (isPro/academyLevel/unlockLevel) ÇAĞIRAN tarafta (app.js) kod
// churn'ü azaltmak için KORUNDU — üçü de artık kullanılmıyor.
export function meetsLevelRequirement() {
  return true;
}

// ---- Mod erişimi ----

// Ücretsizde TAM AÇIK 5 mod (task'ın kendi listesi) — mode-catalog.js'in
// `tier` alanından BAĞIMSIZ, tek doğruluk kaynağı burası (tier sadece kart
// rozeti için kullanılıyor, gerçek erişim kararı BURADAN okunmalı).
export const FREE_MODE_IDS = Object.freeze([
  "frekans-bulma",
  "kesim-noktasi",
  "q-genisligi",
  "boost-mu-cut-mu",
  "kompresor"
]);

// Ücretsizde günde 1 kez oynanabilen, sonra kilitlenen tek mod.
export const DAILY_TASTE_MODE_ID = "frekans-cakismasi";

export function isModeFree(modeId) {
  return FREE_MODE_IDS.includes(modeId);
}

export function isDailyTasteMode(modeId) {
  return modeId === DAILY_TASTE_MODE_ID;
}

// Yerel takvim günü anahtarı (YYYY-MM-DD) — UTC (toISOString) DEĞİL, cihazın
// KENDİ saat dilimi kullanılıyor: "günde 1" kullanıcı beklentisi cihazın
// gördüğü güne göredir (gece yarısına yakın UTC kayması yanlış gün üretirdi).
export function localDateKey(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// lastPlayedAt: epoch ms | null (hiç oynanmadıysa). now: epoch ms.
// Saat GERİYE alınırsa (now < lastPlayedAt) İSTİSMAR KORUMASI devreye girer —
// takvim günü karşılaştırması TEK BAŞINA yeterli değil (ör. bugün oynadıktan
// sonra saati dünkü güne çekmek "farklı gün" gibi görünürdü) — bu yüzden ÖNCE
// zaman yönü kontrol edilir, geri gidiş varsa HÂLÂ "bugün oynanmış" sayılır.
export function canPlayDailyTaste(lastPlayedAt, now) {
  if (lastPlayedAt == null) return true;
  if (now < lastPlayedAt) return false;
  return localDateKey(now) !== localDateKey(lastPlayedAt);
}

// reason: null (erişim var) | "level" (mevcut seviye-kilidi, bu modülün
// KAPSAMI DIŞI — çağıran taraf zaten kontrol ediyor) | "pro" | "daily-used".
export function checkModeAccess(modeId, { isPro, dailyTasteLastPlayedAt = null, now = 0 } = {}) {
  if (isPro) return { allowed: true, reason: null };
  if (isModeFree(modeId)) return { allowed: true, reason: null };
  if (isDailyTasteMode(modeId)) {
    return canPlayDailyTaste(dailyTasteLastPlayedAt, now)
      ? { allowed: true, reason: null }
      : { allowed: false, reason: "daily-used" };
  }
  return { allowed: false, reason: "pro" };
}

// ---- Oturum soru limiti ----

export const FREE_SESSION_QUESTION_LIMIT = 5;

// roundsPlayed: bu oturumda POSE EDİLMİŞ soru sayısı (app.js: roundsInThisPlaySession,
// her yeni soru kurulduğunda +1 — bkz. o değişkenin dosya başı notu). Free'de bu
// sayı limite ULAŞTIĞINDA (5. soru zaten posedilmiş/cevaplanmış) true döner —
// bir 6. soru KURULMADAN oturum kapanır. `limit` çağıran tarafta (app.js)
// reklamla kazanılan ek soru hakkını (bkz. SESSION_EXTENSION_QUESTIONS) da
// içerecek şekilde büyütülerek geçirilebilir — bu fonksiyon SADECE karşılaştırma
// yapar, uzatma MİKTARINI bilmez (saf kalması için).
export function isFreeSessionLimitReached(roundsPlayed, isPro, limit = FREE_SESSION_QUESTION_LIMIT) {
  if (isPro) return false;
  return roundsPlayed >= limit;
}

// ---- Bug 25 (G185) — sessionLimit'te reklamla oturum uzatma ----
// Kullanıcı kararı: "bu bir öğrenme uygulaması, oyun değil" — ücretsiz
// kullanıcı 5 soruda duvara toslarsa uygulamayı silmesin. Reklam Pro'yu
// İKAME ETMİYOR (12 modun 5'i, Araçlar, ilerleme geçmişi hâlâ kapalı) —
// SADECE "bugün biraz daha çalışayım" hakkı, günde en fazla 3 reklamla
// sınırlı (aksi hâlde "ücretsiz + reklam = sınırsız" Pro'yu anlamsızlaştırırdı).
export const SESSION_EXTENSION_QUESTIONS = 5;
export const MAX_SESSION_EXTENSION_ADS_PER_DAY = 3;

// watchesToday/watchesDate: stats.sessionAdWatchesToday/stats.sessionAdWatchesDate
// (kalıcı, app.js persistStats() ile yazılır). watchesDate bugünün takvim
// günüyle (localDateKey) EŞLEŞMİYORSA sayaç DÜNKÜ/eski bir güne ait demektir —
// 0'dan başlar (canPlayDailyTaste'in AYNI "yerel takvim günü" mantığı).
export function sessionAdWatchesRemainingToday(watchesToday, watchesDate, now, maxPerDay = MAX_SESSION_EXTENSION_ADS_PER_DAY) {
  const today = localDateKey(now);
  const countToday = watchesDate === today ? (watchesToday || 0) : 0;
  return Math.max(0, maxPerDay - countToday);
}

// SAF hesaplayıcı (applyLivesRefill'in AYNI deseni) — bir reklam izlemenin
// YENİ {sessionAdWatchesToday, sessionAdWatchesDate} çiftini döndürür, hiçbir
// yan etkisi yok (persistStats() çağıran tarafın işi).
export function recordSessionAdWatch(watchesToday, watchesDate, now) {
  const today = localDateKey(now);
  const countToday = watchesDate === today ? (watchesToday || 0) : 0;
  return { sessionAdWatchesToday: countToday + 1, sessionAdWatchesDate: today };
}

// ---- Can dolumu (gerçek zaman tabanlı, 30 dakikada 1) ----

export const TOTAL_LIVES = 5;
export const LIVES_REFILL_INTERVAL_MS = 30 * 60 * 1000;

// lives tam doluyken (>=totalLives) bir can kaybedilip totalLives'ın ALTINA
// düşüldüğü AN dolum sayacının referans noktası (lastRefillAt) "now"a çekilir —
// 30 dakikalık geri sayım TAM O ANDAN başlar. Tam doluyken hiçbir şey yapılmaz.
export function onLifeLost(prevLives, newLives, lastRefillAt, now, totalLives = TOTAL_LIVES) {
  if (prevLives >= totalLives && newLives < totalLives) return now;
  return lastRefillAt;
}

// SAF dolum hesaplayıcı — lives/lastRefillAt'ın YENİ değerlerini döndürür,
// hiçbir yan etkisi yok (storage'a yazma çağıranın işi). "saat geriye
// alınırsa istismarı engelleyen kontrol": now <= lastRefillAt ise (cihaz
// saati geri alınmış ya da hiç ilerlememiş) dolum SIFIR — referans noktası
// KORUNUR, gelecekte saat düzelince kaldığı yerden devam eder (ileri
// atlanan süre çalınmaz, sadece geri alınan süre HİÇ ödül vermez).
export function applyLivesRefill(lives, lastRefillAt, now, { totalLives = TOTAL_LIVES, intervalMs = LIVES_REFILL_INTERVAL_MS } = {}) {
  if (lives >= totalLives) return { lives: totalLives, lastRefillAt };
  if (lastRefillAt == null) return { lives, lastRefillAt: now };
  if (now <= lastRefillAt) return { lives, lastRefillAt };
  const elapsed = now - lastRefillAt;
  const ticks = Math.floor(elapsed / intervalMs);
  if (ticks <= 0) return { lives, lastRefillAt };
  const newLives = Math.min(totalLives, lives + ticks);
  const consumedTicks = newLives - lives;
  const newLastRefillAt = newLives >= totalLives ? now : lastRefillAt + consumedTicks * intervalMs;
  return { lives: newLives, lastRefillAt: newLastRefillAt };
}

// ---- Diğer kilitler (basit boolean'lar — hepsi isPro'nun tersi, ama task'ın
// her birini AYRI bir kural olarak saydığı için AYRI adlandırıldı: gelecekte
// biri diğerinden bağımsız gevşerse tek satır değişir, çağıranlar aramaz) ----

export function isUploadLocked(isPro) { return !isPro; }
export function isFixedDifficultyLocked(isPro) { return !isPro; }
export function isFocusRangeLocked(isPro) { return !isPro; }
export function isWeakZoneReportLocked(isPro) { return !isPro; }
export function isZoneHistoryBlurred(isPro) { return !isPro; }
export function isExamLocked(isPro) { return !isPro; }
export function isFreePlayModeLocked(isPro) { return !isPro; }
export function isToolsContentLocked(isPro) { return !isPro; }

// ---- Basit kilit mesajları (toast/sheet — GÜZEL paywall ekranı SONRAKİ parça,
// bu sadece "neden kilitli" metni) ----

export const LOCK_MESSAGES = Object.freeze({
  pro: { title: "Pro gerekli", detail: "Bu özellik Pro'da açılır." },
  "daily-used": { title: "Bugün oynadın", detail: "Frekans Çakışması ücretsizde günde 1 kez oynanır — yarın tekrar gel." },
  upload: { title: "Pro gerekli", detail: "Kendi dosyanı yükleyip çalışmak Pro'da açılır." },
  difficulty: { title: "Pro gerekli", detail: "Sabit zorluk seçimi Pro'da açılır — ücretsizde zorluk Otomatik çalışır." },
  focusRange: { title: "Pro gerekli", detail: "Bölge seçerek çalışmak Pro'da açılır." },
  weakZoneReport: { title: "Pro gerekli", detail: "Zayıf bölge raporu Pro'da açılır." },
  tools: { title: "Pro gerekli", detail: "Araçlar sekmesinin içeriği Pro'da açılır." },
  sessionLimit: { title: "Ücretsiz oturum bitti", detail: "Ücretsizde oturum başına 5 soru. Daha fazlası için Pro gerekli." },
  freePlayMode: { title: "Pro gerekli", detail: "Serbest (sonsuz) mod Pro'da açılır — ücretsizde oturum başına 5 soru." }
});

// ==========================================================================
// PARÇA 2 — Paywall EKRANI (satın alma/reklam hâlâ SİMÜLASYON, bkz. app.js)
// ==========================================================================

// "İlk oturumda paywall yok" (PAYWALL.md) — kullanıcı önce uygulamanın işe
// yaradığını görsün. totalRoundsEver: stats.rounds'ın bu RUNTIME BAŞLARKENKİ
// (henüz hiçbir tur bu çalıştırmada sayılmadan) değeri — 0 ise kullanıcı
// GERÇEKTEN hiç tur oynamamış demektir (temiz kurulum ya da menüde gezinip
// hiç oynamadan kapatılmış önceki ziyaretler — İKİSİ de "ilk oturum" sayılır,
// kasıtlı: "en az bir tam deneyim" garantisi, "en az bir process başlatma"
// değil).
export function isFirstSession(totalRoundsEver) {
  return totalRoundsEver === 0;
}

// Tek seferlik fiyat — GERÇEK IAP fiyatlandırması Parça 3, bu sadece
// gösterilen metin (mağaza fiyatı GERÇEK satın alma bağlanınca oradan gelir).
export const PRO_PRICE = "₺399";

// G169 — yayınlanan yasal metinlerin GERÇEK adresleri, tek kaynak. Ayarlar'ın
// #screen-legal'i (bkz. app.js:openLegal) VE paywall ekranı (Apple'ın
// zorunlu kıldığı, satın alma öncesi görünür olma şartı) İKİSİ de buradan
// okur — adres elle iki yerde TEKRAR yazılmaz.
export const LEGAL_URLS = Object.freeze({
  privacy: "https://audioengineeracademy.com/gizlilik.html",
  terms: "https://audioengineeracademy.com/kullanim-kosullari.html",
});

// Pro'nun sunduğu — paywall ekranının Pro kartı BU listeden üretilir (tek
// kaynak, task'ın kendi maddeleri, abartısız/sade).
// G89: Tasarim-2026-08/Prototip.dc.html "PAYWALL" bloğunun (satır 1384) 7
// maddesiyle hizalandı — "Araçlar: analiz + referans filtreleri" G88'de
// silinen sahte Analiz kartını anıyordu, ARTIK YANLIŞ (Araçlar'da analiz
// yok); "Zayıf bölge raporu ve geçmiş grafiği" (paywall.js:isWeakZoneReportLocked/
// isZoneHistoryBlurred'in GERÇEK Pro ayrıcalığı, İlerleme sekmesi) ÖNCEDEN
// bu listede HİÇ yoktu — eksikti, eklendi.
export const PRO_BENEFITS = Object.freeze([
  "12 modun tamamı",
  "Sınırsız soru",
  "Sınav ve seviye atlama",
  "Kendi dosyanı yükleme",
  "Araçlar sekmesi",
  "Zayıf bölge raporu ve geçmiş grafiği",
  "Reklamsız"
]);

// 7 tetikleme noktası (PAYWALL.md) — her biri kicker/title/detail (paywall
// ekranının üstündeki "neden buradasın" bandı) + hangi buton setinin
// gösterileceği (`buttons`): "pro" = Pro Al + Kapat, "livesOut" = Reklam
// İzle + Pro Al + Şimdi değil.
//
// G185 (Bug 25) — İKİ YENİ alan:
// - `endsRound`: bu sebep açılırken round ZATEN bitirilmiş miydi (finalizeIfGameOver()
//   üzerinden mi tetiklendi) — app.js paywallCloseBtn'in X'te "menu"ye mi
//   dönüleceğini, `openPaywallReason()`'ın round'u duraklatıp duraklatmayacağını
//   BUNDAN okur (Bug 20/25'in kök sebebi: eskiden SADECE `livesOut`'a özel bir
//   DOM-görünürlük kontrolüydü, artık HER sebep için doğru tanımlı).
// - `adGrant`: reklamın NE kazandırdığı — "life" (livesOut, +1 can, kotasız,
//   G165'ten beri VAR, DEĞİŞMEDİ) | "sessionExtension" (sessionLimit, +5 soru,
//   günde en fazla 3 — YENİ, bkz. SESSION_EXTENSION_QUESTIONS) | yoksa reklam
//   seçeneği YOK. Kullanıcı kararı: "reklam Pro'yu ikame etmiyor" — bu yüzden
//   sessionLimit'in reklamı SADECE soru sayısını uzatır, kilitli 5 modu/
//   Araçlar'ı/geçmişi AÇMAZ.
export const PAYWALL_REASONS = Object.freeze({
  sessionLimit: {
    kicker: "OTURUM SINIRI",
    title: "Ücretsiz oturumun bitti",
    detail: "Ücretsizde oturum başına 5 soru. Reklam izleyip 5 soru daha kazanabilir (günde en fazla 3) ya da Pro'yla sınırsız oynayabilirsin.",
    buttons: "pro",
    endsRound: true,
    adGrant: "sessionExtension"
  },
  livesOut: {
    kicker: "CANLARIN BİTTİ",
    title: "Devam etmek için bir yol seç",
    detail: "Bir can izleyeceğin reklamla hemen dolar, ya da Pro'yla can sınırı tamamen kalkar.",
    buttons: "livesOut",
    endsRound: true,
    adGrant: "life"
  },
  modeLocked: {
    kicker: "PRO MOD",
    title: "Bu mod Pro'da açılır",
    detail: "dB Seviyesi, Reverb, Tonal Denge ve Distortion — dördü de Pro'nun bir parçası.",
    buttons: "pro",
    endsRound: false
  },
  upload: {
    kicker: "PRO ÖZELLİĞİ",
    title: "Kendi dosyanı yükle",
    detail: "Kendi mix'ini/referansını yükleyip onunla çalışmak Pro'da açılır.",
    buttons: "pro",
    endsRound: false
  },
  dailyUsed: {
    kicker: "GÜNLÜK HAK",
    title: "Bugün Frekans Çakışması'nı oynadın",
    detail: "Ücretsizde günde 1 kez — yarın tekrar gel, ya da Pro'yla sınırsız oyna.",
    buttons: "pro",
    endsRound: false
  },
  zoneHistory: {
    kicker: "PRO RAPORU",
    title: "Zayıf bölge geçmişini gör",
    detail: "6 bölgenin detaylı isabet analizi ve zayıf bölge raporu Pro'da açılır.",
    buttons: "pro",
    endsRound: false
  },
  // G65: "Serbest/süresiz oynama YOK" (bkz. isFreePlayModeLocked, G61'de
  // TANIMLANMIŞ ama HİÇ BAĞLANMAMIŞTI — cihaz testinde kafa karıştırdığı
  // bulundu: "Serbest" ücretsizde SEÇİLEBİLİYORDU ama 5-soru sınırı yüzünden
  // 5'te duruyordu, "seçtim ama çalışmıyor" izlenimi veriyordu). Artık Oyun
  // Türü sheet'inde bu seçenek KİLİTLİ görünür, tıklanınca bu bant açılır.
  freePlayMode: {
    kicker: "SINIRSIZ OYNAMA",
    title: "Serbest (sonsuz) mod Pro'da açılır",
    detail: "Ücretsizde oturum başına 5 soru — sınırsız akış için Pro gerekli.",
    buttons: "pro",
    endsRound: false
  }
});

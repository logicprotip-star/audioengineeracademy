// localStorage kalıcılığı + Capacitor Preferences yedeği. Stats/daily/zoneStats
// şekli mod-bağımsızdır: perDiff anahtarları çağıran taraftan (mode'un difficulty
// tablosundan) gelir, bu dosya belirli bir moda dair difficulty adı bilmez.

const STATS_KEY = "eqEarTrainerProXStats";
const DAILY_KEY = "eqEarTrainerProXDaily";
const ZONESTATS_KEY = "fa_zonestats";
const PREFS_KEY = "eqEarTrainerProXPrefs";
const DAILY_ACC_KEY = "eqEarTrainerProXDailyAcc";
const DAILY_ACC_KEEP_DAYS = 35; // grafik son 30 günü gösterir, birkaç gün pay bırakılır
const DEV_KEY = "eqEarTrainerProXDev";
const UPLOAD_SELECTIONS_KEY = "eqEarTrainerProXUploadSelections";
const TONAL_REFS_KEY = "eqEarTrainerProXTonalRefs";
const SOURCE_SELECTIONS_KEY = "eqEarTrainerProXSourceSelections";
const ANSWER_FORMAT_SELECTIONS_KEY = "eqEarTrainerProXAnswerFormatSelections";
const PURCHASE_KEY = "eqEarTrainerProXPurchase";
// #53 — yarım kalan tur (uzun arka plan/uygulama sonlandırma sonrası "kaldığı
// yerden devam" için). Diğer kalıcı anahtarlarla AYNI localStorage deseni —
// stats/daily/zoneStats/prefs'in AKSİNE (bkz. mirrorSet/reconcileFromPreferences)
// Preferences'a YANSITILMIYOR: bu veri EPHEMERAL/düşük risk (kaybedilirse en
// kötü ihtimalle bir devam fırsatı kaçar, kalıcı ilerleme değil) — 4 kritik
// anahtarın "yedeklemeye değer" muamelesi burada BİLİNÇLİ olarak uygulanmadı.
const IN_PROGRESS_ROUND_KEY = "eqEarTrainerProXInProgressRound";

// Canlar artık zorluğa göre DEĞİL — tek, global bir havuz (bkz. freshStats().lives).
// Eskiden her zorluğun kendi canı vardı (perDiff[key].lives); bu yüzden zorluk
// değiştirmek ya da "Tekrar Oyna" basmak canı sıfırdan dolduruyordu — istenen
// davranış buydu ("can seans başına"), ama gerçek istek "5 can TOPLAM, hiç
// otomatik dolmaz" idi. freshDiffState() artık lives DÖNDÜRMÜYOR.
export const TOTAL_LIVES = 5;

// WKWebView bazen depolama baskısı altında localStorage'ı temizleyebiliyor;
// her yazımda sessizce Preferences'a da mirror atıp, açılışta eksikse oradan kurtarıyoruz.
export function getPrefs() {
  return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences) || null;
}

export function mirrorSet(key, value) {
  const p = getPrefs();
  if (p) p.set({ key, value }).catch(() => {});
}

export function mirrorRemove(key) {
  const p = getPrefs();
  if (p) p.remove({ key }).catch(() => {});
}

// G229 DÜZELTMESİ (TUR2-YARIM-15-08, "Satın Alma Kaybı") — `localStorage.setItem()`
// Safari private-browsing modunda VE depolama doluyken HATA FIRLATIR (WKKit'in
// dokümante edilmiş davranışı) — 12 `save*()` fonksiyonundan 10'u bunu HİÇ
// yakalamıyordu, en kritik örneği `savePurchase()` idi (satın alma GERÇEKLEŞSE
// bile kalıcı yazılamayıp bir sonraki açılışta "Pro" sessizce kaybolabiliyordu,
// HİÇBİR hata mesajı olmadan). Tek, paylaşılan yazma yardımcısı — HER `save*()`
// artık `true`/`false` DÖNÜYOR (mevcut çağıranların HİÇBİRİ dönüş değerini
// ÖNCEDEN okumuyordu — bu yüzden GERİYE UYUMLU, davranış SADECE dönüş
// değerini okuyan YENİ çağıranlar için değişti, bkz. app.js:grantRealPro()).
// `mirror:false` — SADECE `saveInProgressRound()` için: bu anahtar KASITLI
// olarak Preferences'a yansıtılmıyor (bkz. IN_PROGRESS_ROUND_KEY'in kendi notu).
// G232 — app.js'in storage.js DIŞINDA doğrudan localStorage yazan 3 anahtarı
// (TOOLS_LIBRARY_KEY/TOOLS_ACTIONS_KEY/TOOLS_MEASUREMENTS_KEY, TUR3A bulgusu)
// da BU fonksiyonu kullanabilsin diye dışa açıldı — YENİ bir kopya
// YAZILMADI. Bu 3 anahtar da `mirror:false` ile çağrılıyor (storage.js'in
// 12 anahtarının AKSİNE, bunlar ÖNCEDEN de Preferences'a yansıtılmıyordu —
// bu davranış DEĞİŞMEDİ, kapsam dışı).
export function trySave(key, value, { mirror = true } = {}) {
  try {
    const raw = JSON.stringify(value);
    localStorage.setItem(key, raw);
    if (mirror) mirrorSet(key, raw);
    return true;
  } catch (e) {
    console.error(`[storage] "${key}" yazılamadı:`, e && e.message);
    return false;
  }
}

export function freshDiffState() {
  return { xp: 0, score: 0, bestScore: 0 };
}

// Z3: mod başına XP — perDiff'ten AYRI bir eksen. perDiff zorluk-adı ile (easy/
// medium/...) anahtarlanıyor; birden fazla mod aynı zorluk adlarını kullanırsa
// (ör. iki modun da "easy" zorluğu varsa) perDiff'te XP'leri KARIŞIRDI — bu yüzden
// mod seviyesi perDiff'ten DEĞİL, kendi ad alanı olan perMode'dan hesaplanır.
// hintRoundsShown: "i" bilgi sistemi (core/guide-texts.js) için — o modda
// round-içi ipucu bandının BUGÜNE kadar gösterildiği round sayısı. İlk
// HINT_ROUNDS_LIMIT (2) round'dan sonra bir daha otomatik açılmaz. xp'den
// AYRI, kalıcı bir sayaç — kalıcı "i" ikonuna hiç dokunmaz (o her zaman açılır).
export function freshModeState() {
  return { xp: 0, hintRoundsShown: 0 };
}

// difficultyLives: { [difficultyKey]: defaultLives } — moddan gelir. Değerler artık
// SADECE anahtar kümesini (hangi zorluklar var) belirlemek için kullanılıyor;
// canlar bu haritadan bağımsız, tek bir global sayaç (bkz. TOTAL_LIVES/lives alanı).
// modeIds: oynanabilir mod id'lerinin listesi (bkz. app.js: registeredModes) — perMode
// anahtar kümesini belirler, difficultyLives'la aynı desende.
export function freshStats(difficultyLives, hintsPerGame, modeIds = []) {
  const perDiff = {};
  Object.keys(difficultyLives).forEach(key => {
    perDiff[key] = freshDiffState();
  });
  const perMode = {};
  modeIds.forEach(id => { perMode[id] = freshModeState(); });
  return {
    rounds: 0,
    correct: 0,
    wrong: 0,
    combo: 0,
    bestCombo: 0,
    unlocked: [],
    proCorrect: 0,
    hintsUsed: 0,
    hintsRemaining: hintsPerGame,
    bossWins: 0,
    history: [],
    perDiff,
    perMode,
    // G47: Sınav sistemi (core/exam-system.js) — mod başına { examLevel, tierStats }.
    // perMode/perDiff'ten AYRI, YENİ bir ad alanı (o ikisinin ŞEKLİNE hiç dokunulmadı,
    // "paralel sistem kurma" YASAĞI progress.js'in modeLevel()'ına eklenen tek bir
    // guard'lı dala uyularak karşılandı — bkz. o dosyadaki not). SADECE
    // mode.EXAM_ENABLED===true olan modlar için lazy doldurulur (app.js:examStatsFor);
    // sınav DESTEKLEMEYEN modlarda bu alan HİÇBİR ZAMAN yazılmaz, boş kalır.
    examState: {},
    lives: TOTAL_LIVES,
    // G61 (PAYWALL.md): "30 dakikada 1 can" — task'ın kendi tabiriyle
    // "mevcut geçici köprü" (aşağıdaki loadStats notuna bkz.) artık GERÇEK
    // zaman-tabanlı dolumla değişti (core/paywall.js:applyLivesRefill,
    // app.js'ten çağrılıyor). Bu alan o hesaplamanın referans noktası —
    // Date.now() BURADA (freshStats saf KALSIN diye değil, sadece "taze bir
    // kayıt AN itibarıyla başlar" anlamı taşıdığı için, freshDiffState/
    // freshModeState gibi diğer "fresh*" fonksiyonlardan FARKLI olarak zaten
    // zaman bağımlı bir alan taşıyor).
    livesLastRefillAt: Date.now(),
    // Frekans Çakışması'nın "günde 1 tadımlık" kilidi için son oynama zamanı —
    // core/paywall.js:canPlayDailyTaste. null = hiç oynanmadı (her zaman açık).
    dailyTasteLastPlayedAt: null,
    // G185 (Bug 25) — sessionLimit paywall'ının "reklam izle, +5 soru" kotası
    // (günde en fazla 3, core/paywall.js:sessionAdWatchesRemainingToday) —
    // dailyTasteLastPlayedAt'ın AYNI "yerel takvim günü" deseni, ama TARİH
    // (sessionAdWatchesDate, YYYY-MM-DD) + SAYAÇ (sessionAdWatchesToday) ayrı
    // tutuluyor çünkü günde 1 DEĞİL günde 3 hak var.
    sessionAdWatchesToday: 0,
    sessionAdWatchesDate: null
  };
}

// legacyModeId: perMode İLK KEZ oluşturulurken (yani daha önce hiç yoktu — eski bir
// kayıt) TÜM geçmiş XP'nin (perDiff toplamı) hangi mod'a ait sayılacağı. Bu SADECE
// perMode hiç yoksa (ilk göç anında) uygulanır — perMode zaten varsa (yeni bir mod
// id'si SONRADAN eklendiğinde) o yeni mod sıfırdan başlar, geçmiş XP'yi MİRAS ALMAZ
// (aksi hâlde ileride eklenecek her yeni mod bedavadan XP kazanmış olurdu).
export function loadStats(difficultyLives, hintsPerGame, modeIds = [], legacyModeId = null) {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const s = raw ? JSON.parse(raw) : freshStats(difficultyLives, hintsPerGame, modeIds);
    if (!s.perDiff) s.perDiff = freshStats(difficultyLives, hintsPerGame, modeIds).perDiff;
    Object.keys(difficultyLives).forEach(key => {
      if (!s.perDiff[key]) s.perDiff[key] = freshDiffState();
      // Eskiden (skor tabanı eklenmeden önce) kaydedilmiş negatif skorlar kalıcı
      // olarak sıfıra çekilir — taban kuralı sadece YENİ düşüşleri değil, daha
      // önce localStorage'a yazılmış değerleri de kapsamalı.
      const d = s.perDiff[key];
      if (typeof d.score === "number" && d.score < 0) d.score = 0;
      if (typeof d.bestScore === "number" && d.bestScore < 0) d.bestScore = 0;
    });
    // G47: sınav sistemi göçü — eski kayıtlarda bu alan hiç yoktu, boş nesneye düşer
    // (hiçbir mod için sınav ilerlemesi VARSAYILMAZ, app.js ilk dokunuşta lazy kurar).
    if (!s.examState) s.examState = {};
    const isFirstPerModeMigration = !s.perMode;
    if (!s.perMode) s.perMode = {};
    modeIds.forEach(id => {
      if (!s.perMode[id]) s.perMode[id] = freshModeState();
      // Eski kayıtlarda (bu alan eklenmeden önce) hintRoundsShown hiç yoktu —
      // eksikse 0'a çekilir (ipucu bandı ilk kez oynanıyormuş gibi görünür,
      // zararsız — en fazla 2 round fazladan ipucu gösterir).
      if (typeof s.perMode[id].hintRoundsShown !== "number") s.perMode[id].hintRoundsShown = 0;
    });
    if (isFirstPerModeMigration && legacyModeId && s.perMode[legacyModeId]) {
      const totalLegacyXp = Object.values(s.perDiff || {}).reduce((sum, d) => sum + ((d && d.xp) || 0), 0);
      s.perMode[legacyModeId].xp = totalLegacyXp;
    }
    if (typeof s.hintsRemaining !== "number") s.hintsRemaining = hintsPerGame;
    // Eski kayıtlarda (bu değişiklikten önce) top-level "lives" hiç yoktu —
    // SADECE bozuk/eksik veri için TOTAL_LIVES'a çekilir (veri BOZUKLUĞU
    // koruması, "otomatik dolum" DEĞİL). Eski perDiff[key].lives artık
    // okunmuyor (yoksayılır, silinmez).
    if (typeof s.lives !== "number") s.lives = TOTAL_LIVES;
    // G61 (PAYWALL.md): ÖNCEDEN burada `s.lives<=0 → TOTAL_LIVES` GEÇİCİ bir
    // köprü vardı (uygulama yeniden açılınca 0 canı sessizce dolduruyordu,
    // "gerçek dolum özelliği yok" ödünüyle) — bu köprü artık KALDIRILDI.
    // 0 (ya da eksik) can artık burada SIFIRLANMIYOR; gerçek zaman-tabanlı
    // dolum (core/paywall.js:applyLivesRefill, 30 dakikada 1) app.js'te
    // livesLastRefillAt'a göre hesaplanıyor — SADECE gerçekten 30+ dakika
    // geçmişse can dolar, anında değil.
    if (typeof s.livesLastRefillAt !== "number") s.livesLastRefillAt = Date.now();
    if (typeof s.dailyTasteLastPlayedAt !== "number") s.dailyTasteLastPlayedAt = null;
    // G185 — eski kayıtlarda (bu alan eklenmeden önce) hiç yoktu, "hiç reklam
    // izlenmemiş" varsayılanına düşer (canPlayDailyTaste'in null=her zaman açık
    // deseniyle TUTARLI — eksik veri asla bir hakkı SİLMEZ).
    if (typeof s.sessionAdWatchesToday !== "number") s.sessionAdWatchesToday = 0;
    if (typeof s.sessionAdWatchesDate !== "string") s.sessionAdWatchesDate = null;
    return s;
  } catch {
    return freshStats(difficultyLives, hintsPerGame, modeIds);
  }
}

export function saveStats(stats, history) {
  stats.history = history.slice(0, 12);
  return trySave(STATS_KEY, stats);
}

export function clearStats() {
  try {
    localStorage.removeItem(STATS_KEY);
    mirrorRemove(STATS_KEY);
  } catch (e) {}
}

export function dailyKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function freshDaily() {
  return {
    key: dailyKey(),
    tasks: [
      { id: "d1", title: "5 tur oyna", desc: "Bugün 5 tur tamamla.", target: 5, value: 0, reward: 40, claimed: false },
      { id: "d2", title: "3 doğru yap", desc: "Bugün 3 doğru cevap ver.", target: 3, value: 0, reward: 50, claimed: false },
      { id: "d3", title: "2 combo yap", desc: "En az 2’lik combo kur.", target: 2, value: 0, reward: 35, claimed: false }
    ],
    // "Bugünün önerisi" kartı bu gün için kapatıldı mı — key ile aynı güne bağlı,
    // gün değişince (loadDaily key kontrolüyle) otomatik sıfırlanır.
    tipDismissed: false
  };
}

export function loadDaily() {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return freshDaily();
    const parsed = JSON.parse(raw);
    if (parsed.key !== dailyKey()) return freshDaily();
    return parsed;
  } catch {
    return freshDaily();
  }
}

export function saveDaily(daily) {
  return trySave(DAILY_KEY, daily);
}

export function clearDaily() {
  try {
    localStorage.removeItem(DAILY_KEY);
    mirrorRemove(DAILY_KEY);
  } catch (e) {}
}

// Genel Ayarlar sheet'indeki basit tercihler. Bildirimler'in gerçek bir bildirim
// planlama altyapısı henüz yok (sadece tercih saklanır); Kulaklık uyarısı ise
// SADECE .mobile-warn banner'ının (Ana Menü'deki statik not) görünürlüğünü
// kontrol eder. G39 DÜZELTMESİ: G37'de mod-özel kulaklık uyarı sheet'i de bu
// alana bağlanmıştı ("hpWarning kapalıyken sheet de çıkmaz") — kullanıcı bunun
// YANLIŞ olduğuna karar verdi (sheet, toggle'dan BAĞIMSIZ her zaman çıkmalı) —
// bkz. app.js'teki mod kartı click handler'ı. "Bir daha gösterme" ARTIK bu
// objede DEĞİL (kalıcıydı, oturumluk olması istendi) — bkz. app.js
// hpSkippedThisSession (bellek, sayfa yenilenince sıfırlanır). Z5:
// difficultyMode — "auto" (VARSAYILAN, Z1+Z3'ten türetilir, kullanıcı müdahale
// etmez) | "fixed" (kullanıcının difficultySelect'ten kendi seçtiği zorluk
// geçerli).
// G141 — kullanıcının kendi kararı: G65'in "playModeSelect kalıcı bir prefs
// alanına YAZILMIYOR, her açılışta 'free'e döner" kararı GEÇERSİZ. Oyunun ASIL
// akışı "10 Soruluk Bölüm" (XP ile bölüm geçmek) — varsayılan "challenge",
// Serbest artık isteyerek seçilen bir kip. focusRange İLE AYNI desen (tek/
// global tercih — mod başına DEĞİL, bkz. app.js:playModeSelect'in change
// dinleyicisindeki G141 notu, gerekçesi orada).
// G144 — `answerFormat` alanı BURADAN KALDIRILDI: Cevap Biçimi artık KÜRESEL
// bir prefs alanı DEĞİL, `answerFormatSelections`'ta (sourceSelections İLE
// AYNI desen) mod başına kalıcı — bkz. storage.js'in
// loadAnswerFormatSelections notu. Eski kayıtlardaki (silinmeyen) yetim
// `answerFormat` alanı zararsız/okunmuyor.
export function freshPrefs() {
  return { notifications: true, hpWarning: true, calibrationDone: false, calibrationLevel: 35, focusRange: "full", difficultyMode: "auto", feedbackScreen: true, showDailyTip: true, playMode: "challenge" };
}

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...freshPrefs(), ...JSON.parse(raw) } : freshPrefs();
  } catch {
    return freshPrefs();
  }
}

export function savePrefs(prefs) {
  return trySave(PREFS_KEY, prefs);
}

// Geliştirici modu (Pro test anahtarı) — Genel Ayarlar/Hakkında/Sürüm numarasına
// 7 kez dokununca açılır (bkz. app.js initDevMode). Yayında da kalacak (normal
// kullanıcı bulamayacağı için sorun değil, görev tanımında böyle istendi) — bu
// yüzden AYRI bir anahtarda tutuluyor, prefs'e KARIŞTIRILMADI: prefs.js'i temizle/
// dışa aktar gibi bir işlem eklenirse geliştirici bayrakları yanlışlıkla kullanıcı
// tercihiymiş gibi görünmesin.
export function freshDevFlags() {
  return { unlocked: false, simulatePro: false };
}

export function loadDevFlags() {
  try {
    const raw = localStorage.getItem(DEV_KEY);
    return raw ? { ...freshDevFlags(), ...JSON.parse(raw) } : freshDevFlags();
  } catch {
    return freshDevFlags();
  }
}

export function saveDevFlags(devFlags) {
  return trySave(DEV_KEY, devFlags);
}

// G168 — GERÇEK satın alma durumu (StoreKit/Play Billing) — devFlags'ten
// BİLEREK AYRI: devFlags SADECE geliştirici test anahtarı (simulatePro),
// bu GERÇEK kullanıcı verisi. isUserPro() = proPurchased || devFlags.
// simulatePro (app.js) — simülasyon katmanı gerçek satın almanın ÜZERİNE
// eklendi, yerine geçmedi (PAYWALL.md'nin Parça 3 tarifiyle AYNI).
// proPurchased TEK YÖNLÜ bir bayrak: bir kez true olduktan sonra arka
// planda yapılan sessiz mülkiyet kontrolleri (core/iap.js:checkProOwnership)
// bunu ASLA false'a ÇEVİRMEZ — geçici bir ağ/hesap sorunu yüzünden
// GERÇEKTEN parasını ödemiş bir kullanıcının Pro'sunun rastgele
// kaybolmasını önler. Sadece EXPLICIT bir "geri yükleme bulamadı" durumu
// (kullanıcı kendi isteğiyle) mevcut değeri DEĞİŞTİRMEZ (false'a da
// çekmez) — bkz. app.js:handleRestorePurchase.
export function freshPurchase() {
  return { proPurchased: false };
}

export function loadPurchase() {
  try {
    const raw = localStorage.getItem(PURCHASE_KEY);
    return raw ? { ...freshPurchase(), ...JSON.parse(raw) } : freshPurchase();
  } catch {
    return freshPurchase();
  }
}

export function savePurchase(purchase) {
  return trySave(PURCHASE_KEY, purchase);
}

// G123 — "Dosya seçimi mod başına ayrılacak" (kullanıcının kendi kararı):
// dosya KÜTÜPHANESİ (Araçlar'ın toolsFiles'ı) PAYLAŞILAN kalıyor, ama HANGİ
// dosyanın seçili olduğu artık bağlam başına ({contextId: fileId} — "tools"
// Araçlar için, her modun kendi MODE_ID'si diğerleri için) ayrı ve KALICI.
// Şekil basit/düz bir obje — mod sayısı arttıkça büyümesi SORUN DEĞİL (birkaç
// on bayt/mod). loadDevFlags'ın AYNI dürüst try/catch + "bozuksa boş obje"
// deseni.
export function loadUploadSelections() {
  try {
    const raw = localStorage.getItem(UPLOAD_SELECTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveUploadSelections(selections) {
  return trySave(UPLOAD_SELECTIONS_KEY, selections);
}

// G138 — kullanıcının kendi kararı: G126'nın "kaynak TÜRÜ mod-agnostik kalsın"
// kararı GEÇERSİZ — kaynak türü de (ör. "upload"/"davul-dongusu"/"pink-noise")
// artık `uploadSelections` İLE AYNI desende, AYNI bağlam anahtarlarıyla
// (MODE_ID / "tools" / "tonal-ref") mod başına kalıcı. Bilinçli olarak AYRI
// bir localStorage anahtarı/obje — `uploadSelections` SADECE upload
// modundayken hangi DOSYA seçili olduğunu tutar (kaynak "upload" DEĞİLSE
// anlamsız), bu ise HER bağlamın kaynak TÜRÜNÜN kendisini tutar (upload
// olsun olmasın) — ikisi farklı kavramlar, aynı objede karıştırılmadı.
export function loadSourceSelections() {
  try {
    const raw = localStorage.getItem(SOURCE_SELECTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSourceSelections(selections) {
  return trySave(SOURCE_SELECTIONS_KEY, selections);
}

// G144 — kullanıcının kendi kararı: Dokunmalı/Şıklı (Cevap Biçimi) artık
// çip satırından kaldırılıp Oyun Ayarları sheet'ine taşındı (o satır zaten
// vardı, G79'dan beri #answerFormatSelect'e AYNI bağlıydı — bkz. app.js
// applyAnswerFormatForMode notu). `sourceSelections` İLE AYNI desen/bağlam
// anahtarları (mode.MODE_ID) — eski `prefs.answerFormat` (KÜRESEL, TEK
// değer) YERİNE geçti, o alan freshPrefs()'ten KALDIRILDI.
export function loadAnswerFormatSelections() {
  try {
    const raw = localStorage.getItem(ANSWER_FORMAT_SELECTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveAnswerFormatSelections(selections) {
  return trySave(ANSWER_FORMAT_SELECTIONS_KEY, selections);
}

// G127 — "Kendi referansım" (G157'de bayrak arkasından çıkarılıp yayına
// açıldı — bkz. app.js toolsTonalTargetNames notu). Kullanıcının ölçtüğü
// referans parçalar KALICI olsun
// diye ({list, activeId} — list: [{id,name,devs,lufs,numberOfChannels,
// sourceFileId,addedAt}]) — sourceFileId, Araçlar'ın toolsFiles kütüphanesindeki
// dosyanın id'si (A/B dinleme için ses BAYTLARI oradan, ihtiyaç anında,
// yeniden decode edilir — burada AudioBuffer/blob TUTULMAZ, localStorage'a
// asla sığmaz). Dosya kütüphaneden silinirse referansın EĞRİSİ/LUFS'u hâlâ
// kalır (grafik/karşılaştırma çalışmaya devam eder), sadece A/B'nin "A"
// (referans sesi) çalamaz hâle gelir — app.js bu durumu ayrıca kontrol eder.
export function loadToolsTonalReferences() {
  try {
    const raw = localStorage.getItem(TONAL_REFS_KEY);
    if (!raw) return { list: [], activeId: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.list)) return { list: [], activeId: null };
    return { list: parsed.list, activeId: parsed.activeId || null };
  } catch {
    return { list: [], activeId: null };
  }
}

export function saveToolsTonalReferences(state) {
  return trySave(TONAL_REFS_KEY, state);
}

// İlerleme sekmesindeki "son 30 gün" grafiği için günlük isabet oranı. dailyKey()
// ile aynı yerel-tarih anahtarını kullanır (daily görevlerle aynı gün sınırı).
export function loadDailyAcc() {
  try {
    return JSON.parse(localStorage.getItem(DAILY_ACC_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveDailyAcc(dailyAcc) {
  return trySave(DAILY_ACC_KEY, dailyAcc);
}

// dailyAcc'ı YERİNDE günceller (bugünün sayacını artırır) ve DAILY_ACC_KEEP_DAYS'ten
// eski günleri buda. Kaydetmeyi çağıran taraf yapar (saveDailyAcc).
export function recordDailyAccuracy(dailyAcc, correct) {
  const key = dailyKey();
  dailyAcc[key] = dailyAcc[key] || { correct: 0, total: 0 };
  dailyAcc[key].total++;
  if (correct) dailyAcc[key].correct++;
  const cutoff = Date.now() - DAILY_ACC_KEEP_DAYS * 24 * 60 * 60 * 1000;
  Object.keys(dailyAcc).forEach(k => {
    const [y, m, d] = k.split("-").map(Number);
    if (!y || !m || !d) { delete dailyAcc[k]; return; }
    if (new Date(y, m - 1, d).getTime() < cutoff) delete dailyAcc[k];
  });
  return dailyAcc;
}

// Geçiş notu (BAS 120–500 Hz → BAS 120–250 Hz + ALT-ORTA 250–500 Hz bölünmesi):
// burada kayıtlı veriyi taşıyan/dönüştüren bir işlem YOK — kasıtlı. Eski "BAS"
// anahtarı aynı isimle kalmaya devam ediyor (sadece üst sınırı kaydı), eski
// birikmiş isabet verisi bozulmadan okunmaya devam eder. "ALT-ORTA" anahtarı
// henüz hiç var olmadığı için okuyan taraf (frekans-bulma.js:faZoneOf/recordZone,
// app.js:zoneScores) zaten `zoneStats[key] || {n:0,ok:0}` ile eksik anahtarı
// sıfırdan başlatıyor — yeni bölge organik olarak, kullanıcı o aralıkta soru
// çözdükçe dolar. Eski aralığı geriye dönük ikiye bölmek (veriyi kaybetmeden)
// mümkün değil çünkü hangi tekil cevabın 120–250 mi yoksa 250–500 Hz mi
// olduğu ayrıca saklanmıyor.
export function loadZoneStats() {
  try {
    return JSON.parse(localStorage.getItem(ZONESTATS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

export function saveZoneStats(zoneStats) {
  return trySave(ZONESTATS_KEY, zoneStats);
}

export function clearZoneStats() {
  try {
    localStorage.removeItem(ZONESTATS_KEY);
    mirrorRemove(ZONESTATS_KEY);
  } catch (e) {}
}

// localStorage boşsa (ör. WKWebView temizlemişse) Preferences'taki yedekten kurtarmaya çalışır.
// recovered anahtarlarının haritasını döndürür ki çağıran taraf ilgili state'i yeniden yükleyip
// UI'ı tazeleyebilsin.
export async function reconcileFromPreferences() {
  const p = getPrefs();
  if (!p) return { stats: false, daily: false, zoneStats: false, prefs: false };
  const recovered = { stats: false, daily: false, zoneStats: false, prefs: false };
  try {
    if (!localStorage.getItem(STATS_KEY)) {
      const { value } = await p.get({ key: STATS_KEY });
      if (value) { localStorage.setItem(STATS_KEY, value); recovered.stats = true; }
    }
    if (!localStorage.getItem(DAILY_KEY)) {
      const { value } = await p.get({ key: DAILY_KEY });
      if (value) { localStorage.setItem(DAILY_KEY, value); recovered.daily = true; }
    }
    if (!localStorage.getItem(ZONESTATS_KEY)) {
      const { value } = await p.get({ key: ZONESTATS_KEY });
      if (value) { localStorage.setItem(ZONESTATS_KEY, value); recovered.zoneStats = true; }
    }
    if (!localStorage.getItem(PREFS_KEY)) {
      const { value } = await p.get({ key: PREFS_KEY });
      if (value) { localStorage.setItem(PREFS_KEY, value); recovered.prefs = true; }
    }
  } catch (e) {}
  return recovered;
}

// #53 — yarım kalan tur. Şekil: { modeId, examTier, source, activeQuestion,
// timeLeft, roundDuration, savedAt }. savedAt (Date.now()) çağıran tarafın
// (app.js) "3 saatten eskiyse bayat say" kararını uygulayabilmesi için —
// bayatlık EŞİĞİ bilerek BURADA değil, çağıran tarafta (ürün kararı, bkz.
// DURUM.md) tutuluyor; bu modül SADECE ham veriyi taşır.
export function loadInProgressRound() {
  try {
    const raw = localStorage.getItem(IN_PROGRESS_ROUND_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object") ? parsed : null;
  } catch {
    return null;
  }
}

export function saveInProgressRound(snapshot) {
  return trySave(IN_PROGRESS_ROUND_KEY, snapshot, { mirror: false });
}

export function clearInProgressRound() {
  try {
    localStorage.removeItem(IN_PROGRESS_ROUND_KEY);
  } catch (e) {}
}

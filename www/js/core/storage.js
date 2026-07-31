// localStorage kalıcılığı + Capacitor Preferences yedeği. Stats/daily/zoneStats
// şekli mod-bağımsızdır: perDiff anahtarları çağıran taraftan (mode'un difficulty
// tablosundan) gelir, bu dosya belirli bir moda dair difficulty adı bilmez.

const STATS_KEY = "eqEarTrainerProXStats";
const DAILY_KEY = "eqEarTrainerProXDaily";
const ZONESTATS_KEY = "fa_zonestats";
const PREFS_KEY = "eqEarTrainerProXPrefs";
const DAILY_ACC_KEY = "eqEarTrainerProXDailyAcc";
const DAILY_ACC_KEEP_DAYS = 35; // grafik son 30 günü gösterir, birkaç gün pay bırakılır

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

export function freshDiffState() {
  return { xp: 0, score: 0, bestScore: 0 };
}

// difficultyLives: { [difficultyKey]: defaultLives } — moddan gelir. Değerler artık
// SADECE anahtar kümesini (hangi zorluklar var) belirlemek için kullanılıyor;
// canlar bu haritadan bağımsız, tek bir global sayaç (bkz. TOTAL_LIVES/lives alanı).
export function freshStats(difficultyLives, hintsPerGame) {
  const perDiff = {};
  Object.keys(difficultyLives).forEach(key => {
    perDiff[key] = freshDiffState();
  });
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
    lives: TOTAL_LIVES
  };
}

export function loadStats(difficultyLives, hintsPerGame) {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const s = raw ? JSON.parse(raw) : freshStats(difficultyLives, hintsPerGame);
    if (!s.perDiff) s.perDiff = freshStats(difficultyLives, hintsPerGame).perDiff;
    Object.keys(difficultyLives).forEach(key => {
      if (!s.perDiff[key]) s.perDiff[key] = freshDiffState();
      // Eskiden (skor tabanı eklenmeden önce) kaydedilmiş negatif skorlar kalıcı
      // olarak sıfıra çekilir — taban kuralı sadece YENİ düşüşleri değil, daha
      // önce localStorage'a yazılmış değerleri de kapsamalı.
      const d = s.perDiff[key];
      if (typeof d.score === "number" && d.score < 0) d.score = 0;
      if (typeof d.bestScore === "number" && d.bestScore < 0) d.bestScore = 0;
    });
    if (typeof s.hintsRemaining !== "number") s.hintsRemaining = hintsPerGame;
    // Eski kayıtlarda (bu değişiklikten önce) top-level "lives" hiç yoktu — temiz
    // localStorage'da olduğu gibi TOTAL_LIVES'a çekilir. Eski perDiff[key].lives
    // artık okunmuyor (yoksayılır, silinmez).
    //
    // BİLİNÇLİ ÖDÜN: burada ayrıca <=0 da TOTAL_LIVES'a çekiliyor — bu, "otomatik
    // dolum YOK" kuralını SEANS İÇİNDE hâlâ tam koruyor (loseLife() burayı hiç
    // çağırmıyor, o yüzden bir turda canı biten kullanıcı o seansta dürüstçe
    // "Oyun Bitti" görür) ama UYGULAMA YENİDEN AÇILDIĞINDA 0 canı sıfırlıyor.
    // Sebep: bu alan yeni (önceki turda eklendi) ve şu an gerçek dolum özelliği
    // yok — kalıcı 0, kullanıcıyı kalıcı ve geri dönüşsüz şekilde kilitler.
    // Kalıcı-0-yasak istenirse: bu satır kaldırılıp gerçek bir dolum özelliği
    // eklenmeli (bkz. DURUM.md "Fiyat ve can ekonomisi").
    if (typeof s.lives !== "number" || s.lives <= 0) s.lives = TOTAL_LIVES;
    return s;
  } catch {
    return freshStats(difficultyLives, hintsPerGame);
  }
}

export function saveStats(stats, history) {
  stats.history = history.slice(0, 12);
  const raw = JSON.stringify(stats);
  localStorage.setItem(STATS_KEY, raw);
  mirrorSet(STATS_KEY, raw);
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
  const raw = JSON.stringify(daily);
  localStorage.setItem(DAILY_KEY, raw);
  mirrorSet(DAILY_KEY, raw);
}

export function clearDaily() {
  try {
    localStorage.removeItem(DAILY_KEY);
    mirrorRemove(DAILY_KEY);
  } catch (e) {}
}

// Genel Ayarlar sheet'indeki basit tercihler. Bildirimler'in gerçek bir bildirim
// planlama altyapısı henüz yok (sadece tercih saklanır); Kulaklık uyarısı ise
// gerçekten .mobile-warn banner'ının görünürlüğünü kontrol eder.
export function freshPrefs() {
  return { notifications: true, hpWarning: true, calibrationDone: false, calibrationLevel: 35 };
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
  const raw = JSON.stringify(prefs);
  localStorage.setItem(PREFS_KEY, raw);
  mirrorSet(PREFS_KEY, raw);
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
  const raw = JSON.stringify(dailyAcc);
  localStorage.setItem(DAILY_ACC_KEY, raw);
  mirrorSet(DAILY_ACC_KEY, raw);
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
  try {
    const raw = JSON.stringify(zoneStats);
    localStorage.setItem(ZONESTATS_KEY, raw);
    mirrorSet(ZONESTATS_KEY, raw);
  } catch (e) {}
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

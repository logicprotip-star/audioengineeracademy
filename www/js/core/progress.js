// Level/XP matematiği + başarımlar. Saf hesap fonksiyonları; DOM'a dokunmaz.

export function xpNeeded(level) {
  return 120 + (level - 1) * 70;
}

export function levelFromXp(xp) {
  let level = 1;
  let spent = 0;
  while (xp >= spent + xpNeeded(level)) {
    spent += xpNeeded(level);
    level++;
  }
  return level;
}

export function xpProgress(xp) {
  let level = 1;
  let spent = 0;
  while (xp >= spent + xpNeeded(level)) {
    spent += xpNeeded(level);
    level++;
  }
  return { level, current: xp - spent, required: xpNeeded(level) };
}

export function accuracy(stats) {
  return stats.rounds ? Math.round((stats.correct / stats.rounds) * 100) : 0;
}

// XP hiçbir zaman stats.xp'de tutulmadı — her zorluğun kendi perDiff[key].xp'si var,
// tek/global bir XP alanı yok. "Level 5 ol" başarımı bu yüzden hiç tetiklenmiyordu
// (levelFromXp(undefined) her zaman 1 döner). Zorluklar arası toplam XP — DİKKAT: bu,
// TÜM zorlukları TEK bir moda aitmiş gibi toplar; birden fazla mod perDiff'in aynı
// anahtar adlarını (easy/medium/...) paylaşırsa YANLIŞ sonuç verir. Sadece bu dosyanın
// İÇİNDE (başarım kontrolü) kullanılır — Z3 ile gelen mod-bazlı XP için bkz. modeXp/
// modeLevel/academyLevel altta, onlar stats.perMode'u (mod-adına göre AYRIŞTIRILMIŞ) okur.
function totalXp(stats) {
  if (!stats.perDiff) return 0;
  return Object.values(stats.perDiff).reduce((sum, d) => sum + ((d && d.xp) || 0), 0);
}

// Z3: MOD BAŞINA seviye. stats.perMode[modeId].xp'den (perDiff'in aksine, mod adına
// göre doğru şekilde ayrıştırılmış) hesaplanır — bkz. core/storage.js freshModeState/
// loadStats (migration).
export function modeXp(stats, modeId) {
  return (stats.perMode && stats.perMode[modeId] && stats.perMode[modeId].xp) || 0;
}
// G47: Sınav sistemi (core/exam-system.js) entegrasyonu — "paralel sistem kurma"
// YASAĞINA uyularak, XP/seviye hesabının KENDİSİ (levelFromXp/modeXp) HİÇ
// değişmedi, SADECE tek bir guard'lı üst sınır eklendi. stats.examState[modeId]
// SADECE mode.EXAM_ENABLED===true olan modlar için (app.js:examStatsFor) lazy
// dolduruluyor — sınav DESTEKLEMEYEN yedi mod için bu alan HİÇ var olmuyor, bu
// yüzden onların modeLevel()'ı ÖNCEKİ gibi SAF XP'den hesaplanmaya devam ediyor
// (davranış BİREBİR aynı, testle doğrulandı). Sınav destekleyen bir modda ise
// GERÇEK/ham XP seviyesi (rawLevel) her zaman hesaplanmaya DEVAM eder (XP
// "sessizce" birikmeye devam ediyor — task'ın "paralel sistem kurma" isteği) ama
// GÖSTERİLEN/KULLANILAN seviye examLevel'i AŞAMAZ — examLevel SADECE bir sınav
// geçildiğinde artar (bkz. core/exam-system.js). Bu, "sessiz XP artışını sınav
// olayına çevir" isteğini XP MEKANİĞİNİ DEĞİŞTİRMEDEN (aynı levelFromXp eğrisi,
// aynı xpNeeded merdiveni) sağlıyor.
export function modeLevel(stats, modeId) {
  const rawLevel = levelFromXp(modeXp(stats, modeId));
  const exam = stats.examState && stats.examState[modeId];
  if (!exam || typeof exam.examLevel !== "number") return rawLevel;
  return Math.min(rawLevel, exam.examLevel);
}

// AKADEMİ (genel) seviyesi — G75 KARARI (bkz. DURUM.md G75 raporu): ESKİ tanım
// (mod seviyelerinin TOPLAMI, bkz. git geçmişi) TERK EDİLDİ — 10 oynanabilir modla
// taze bir kullanıcı bile hiçbir şey yapmadan "Sv 10" gösteriyordu (her modLevel()
// sıfır XP'de bile 1 döner, 10 mod × 1 = 10) ve mod sayısı arttıkça bu taban KENDİLİĞİNDEN
// yükseliyordu. YENİ tanım: TÜM modların TOPLAM XP'sinden, mod eğrisinden (xpNeeded)
// AYRI/DAHA YAVAŞ bir eşik eğrisiyle hesaplanıyor — taze kullanıcı academyLevel=1'den
// başlar. ACADEMY_XP_MULTIPLIER TASLAK/TAHMİNİ bir sabit — playtest'le DOĞRULANMADI
// (CLAUDE.md "sayı uydurma" ilkesi gereği burada açıkça belirtiliyor). Çarpan=1 (saf
// xpNeeded eğrisi total XP'ye uygulansaydı) akademiyi TEK bir moddan bile DAHA HIZLI
// doldururdu (10 modun XP'si TOPLANDIĞI için) — task'ın "mod eğrisi akademi için çok
// hızlı dolar" gerekçesiyle TERS bir sonuç olurdu, bu yüzden çarpan >1 zorunlu.
// YAN ETKİ (ürün kararı, BURADA ÇÖZÜLMEDİ): paywall.meetsLevelRequirement bu AYNI
// academyLevel'ı Pro seviye kilidi (mode-catalog.js unlockLevel, 1..20 aralığı) için
// de kullanıyor — çarpanın büyümesi bu kilitlerin açılma HIZINI da yavaşlatır, bu
// task'ın kapsamı DEĞİL, kullanıcıya bırakıldı (bkz. DURUM.md G75 BEKLEYEN KARARLAR).
const ACADEMY_XP_MULTIPLIER = 5;

export function academyXpNeeded(level) {
  return ACADEMY_XP_MULTIPLIER * xpNeeded(level);
}

export function academyTotalXp(stats, modeIds) {
  return (modeIds || []).reduce((sum, id) => sum + modeXp(stats, id), 0);
}

// levelFromXp/xpProgress'in AYNI merdiven mantığı, sadece academyXpNeeded eğrisiyle.
export function academyXpProgress(xp) {
  let level = 1;
  let spent = 0;
  while (xp >= spent + academyXpNeeded(level)) {
    spent += academyXpNeeded(level);
    level++;
  }
  return { level, current: xp - spent, required: academyXpNeeded(level) };
}

export function academyLevel(stats, modeIds) {
  return academyXpProgress(academyTotalXp(stats, modeIds)).level;
}

// G74 — Ana ekranın yeni kullanıcı kartı bir "seviye unvanı" (ör. "Kalibre
// Kulak") istiyor. Kodda BÖYLE bir tablo YOKTU (rapor edildi, bkz. DURUM.md
// G74) — task'ın kendi isteğiyle burada OLUŞTURULDU. TASLAK/tahmini: kesin
// isim/eşik DEĞİL, kullanıcı cihazda görüp düzeltecek (guide-texts.js'in
// AYNI "taslak" ilkesi).
// G75: eşikler YENİDEN KALİBRE EDİLDİ — academyLevel artık mod seviyelerinin
// TOPLAMI DEĞİL (eski taban: HİÇ oynanmamış kullanıcıda bile 10), TOPLAM XP'den
// KENDİ (yavaş) eğrisiyle hesaplanan bir sayı (bkz. academyLevel notu) — taze
// kullanıcı academyLevel=1'den başlıyor, eski eşikler (0/20/35/...) artık
// ANLAMSIZ (asla erişilemez) olurdu. Yeni eşikler academyLevel'ın YENİ 1-tabanlı
// ölçeğine göre TASLAK/TAHMİNİ seçildi — playtest'le DOĞRULANMADI.
export const LEVEL_TITLES = [
  { min: 1, title: "Çırak Kulak" },
  { min: 3, title: "Kalibre Kulak" },
  { min: 6, title: "Keskin Kulak" },
  { min: 10, title: "Uzman Kulak" },
  { min: 15, title: "Usta Kulak" },
  { min: 22, title: "Prodüksiyon Ustası" },
  { min: 30, title: "Altın Kulak" }
];

// SAF FONKSİYON — academyLevel'a karşılık gelen unvanı döndürür (eşiği
// AŞAN en yüksek kademe). LEVEL_TITLES boş/tanımsız bir seviyeyle
// çağrılırsa (ör. henüz veri yokken) en düşük kademeye düşer, asla
// undefined dönmez.
export function levelTitle(academyLvl) {
  const lvl = academyLvl || 0;
  let current = LEVEL_TITLES[0].title;
  for (const tier of LEVEL_TITLES) {
    if (lvl >= tier.min) current = tier.title;
  }
  return current;
}

// G198 DÜZELTMESİ (rozet revizyonu, kullanıcı kararı) — 9 rozet 6'ya indi.
// Silinen 3'ü (combo_10/round_100/level_5) KENDİ koşulları zaten kalan
// bir rozetle (sırasıyla combo_5/round_25) AYNIYDI, sadece eşik sayısı
// farklıydı — level_5 de ana ekranda ZATEN görünen seviye bilgisini
// tekrar ediyordu. id'LER DEĞİŞMEDİ (first_blood/combo_5/round_25/
// accuracy_70/pro_clear/boss_win) — kazanılmış rozetler (stats.unlocked,
// id bazlı) bu yüzden BOZULMADI, sadece isim/ikon güncellendi. `titleEn`
// alanı 1.1'in (İngilizce çeviri) HAZIRLIĞI — şu an HİÇBİR YERDE
// OKUNMUYOR, kod bilerek önden yazıldı.
export const ACHIEVEMENTS = [
  { id: "first_blood", icon: "🎧", title: "Dinleyici", titleEn: "Listener", desc: "İlk doğru cevabı ver.", check: s => s.correct >= 1 },
  { id: "combo_5", icon: "🧭", title: "Ses Kaşifi", titleEn: "Sound Explorer", desc: "5 combo yap.", check: s => s.bestCombo >= 5 },
  { id: "round_25", icon: "🎚️", title: "Miksçi", titleEn: "Mixer", desc: "25 tur tamamla.", check: s => s.rounds >= 25 },
  { id: "accuracy_70", icon: "🎛️", title: "Ses Mühendisi", titleEn: "Engineer", desc: "En az 20 turda %70 doğruluk yakala.", check: s => s.rounds >= 20 && accuracy(s) >= 70 },
  { id: "pro_clear", icon: "🔊", title: "Mastering Mühendisi", titleEn: "Mastering Engineer", desc: "Pro zorlukta 8 doğru yap.", check: s => s.proCorrect >= 8 },
  { id: "boss_win", icon: "👂", title: "Altın Kulak", titleEn: "Golden Ear", desc: "Bir boss round kazan.", check: s => s.bossWins >= 1 }
];

// stats üzerinde mutasyon yapar (unlocked listesine ekler), yeni açılan başarımları döndürür.
export function checkAchievements(stats) {
  if (!stats.unlocked) stats.unlocked = [];
  const newlyUnlocked = [];
  ACHIEVEMENTS.forEach(a => {
    if (!stats.unlocked.includes(a.id) && a.check(stats)) {
      stats.unlocked.push(a.id);
      newlyUnlocked.push(a);
    }
  });
  return newlyUnlocked;
}

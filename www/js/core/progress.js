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
export function modeLevel(stats, modeId) {
  return levelFromXp(modeXp(stats, modeId));
}

// AKADEMİ (genel) seviyesi — KARAR (Z3): mod seviyelerinin TOPLAMI (her modLevel()
// levelFromXp gibi her zaman >=1 döner — sıfır XP'li bir mod bile "seviye 1" sayılır).
// Bu, tek oynanabilir mod olduğu SÜRECE academyLevel === modeLevel(o mod) demektir
// (mevcut davranışla birebir tutarlı). NOT (gelecek için): yeni modlar eklendikçe
// HİÇ OYNANMAMIŞ modlar da +1 katkı yapacak ("bedava seviye şişmesi") — bugün bunu
// önleyecek bir eşik (ör. sadece xp>0 olan modları say) EKLENMEDİ, çünkü mevcut tek-mod
// gerçekliğinde unlockLevel:1 kilidinin her zaman >=1 seviyeyle geçmesi gerekiyor
// (0 tabanlı bir toplam, sıfır-XP'li yeni kullanıcıyı ilk moddan bile kilitlerdi).
// İkinci mod eklendiğinde bu ödün yeniden değerlendirilmeli.
export function academyLevel(stats, modeIds) {
  return (modeIds || []).reduce((sum, id) => sum + modeLevel(stats, id), 0);
}

export const ACHIEVEMENTS = [
  { id: "first_blood", icon: "🎧", title: "İlk Kulak", desc: "İlk doğru cevabı ver.", check: s => s.correct >= 1 },
  { id: "combo_5", icon: "🔥", title: "Alev Zinciri", desc: "5 combo yap.", check: s => s.bestCombo >= 5 },
  { id: "combo_10", icon: "⚡", title: "Şimşek Kulak", desc: "10 combo yap.", check: s => s.bestCombo >= 10 },
  { id: "round_25", icon: "🏁", title: "Dayanıklılık", desc: "25 tur tamamla.", check: s => s.rounds >= 25 },
  { id: "round_100", icon: "🧠", title: "EQ Beyni", desc: "100 tur tamamla.", check: s => s.rounds >= 100 },
  { id: "accuracy_70", icon: "🎯", title: "Keskin Hedef", desc: "En az 20 turda %70 doğruluk yakala.", check: s => s.rounds >= 20 && accuracy(s) >= 70 },
  { id: "level_5", icon: "🚀", title: "Yükseliş", desc: "Level 5 ol.", check: s => levelFromXp(totalXp(s)) >= 5 },
  { id: "pro_clear", icon: "👑", title: "Pro Kulak", desc: "Pro zorlukta 8 doğru yap.", check: s => s.proCorrect >= 8 },
  { id: "boss_win", icon: "💀", title: "Boss Avcısı", desc: "Bir boss round kazan.", check: s => s.bossWins >= 1 }
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

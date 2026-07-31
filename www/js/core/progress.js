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

export const ACHIEVEMENTS = [
  { id: "first_blood", icon: "🎧", title: "İlk Kulak", desc: "İlk doğru cevabı ver.", check: s => s.correct >= 1 },
  { id: "combo_5", icon: "🔥", title: "Alev Zinciri", desc: "5 combo yap.", check: s => s.bestCombo >= 5 },
  { id: "combo_10", icon: "⚡", title: "Şimşek Kulak", desc: "10 combo yap.", check: s => s.bestCombo >= 10 },
  { id: "round_25", icon: "🏁", title: "Dayanıklılık", desc: "25 tur tamamla.", check: s => s.rounds >= 25 },
  { id: "round_100", icon: "🧠", title: "EQ Beyni", desc: "100 tur tamamla.", check: s => s.rounds >= 100 },
  { id: "accuracy_70", icon: "🎯", title: "Keskin Hedef", desc: "En az 20 turda %70 doğruluk yakala.", check: s => s.rounds >= 20 && accuracy(s) >= 70 },
  { id: "level_5", icon: "🚀", title: "Yükseliş", desc: "Level 5 ol.", check: s => levelFromXp(s.xp) >= 5 },
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

// localStorage kalıcılığı + Capacitor Preferences yedeği. Stats/daily/zoneStats
// şekli mod-bağımsızdır: perDiff anahtarları çağıran taraftan (mode'un difficulty
// tablosundan) gelir, bu dosya belirli bir moda dair difficulty adı bilmez.

const STATS_KEY = "eqEarTrainerProXStats";
const DAILY_KEY = "eqEarTrainerProXDaily";
const ZONESTATS_KEY = "fa_zonestats";

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

export function freshDiffState(lives) {
  return { xp: 0, score: 0, bestScore: 0, lives };
}

// difficultyLives: { [difficultyKey]: defaultLives } — moddan gelir.
export function freshStats(difficultyLives, hintsPerGame) {
  const perDiff = {};
  Object.entries(difficultyLives).forEach(([key, lives]) => {
    perDiff[key] = freshDiffState(lives);
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
    perDiff
  };
}

export function loadStats(difficultyLives, hintsPerGame) {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const s = raw ? JSON.parse(raw) : freshStats(difficultyLives, hintsPerGame);
    if (!s.perDiff) s.perDiff = freshStats(difficultyLives, hintsPerGame).perDiff;
    Object.entries(difficultyLives).forEach(([key, lives]) => {
      if (!s.perDiff[key]) s.perDiff[key] = freshDiffState(lives);
    });
    if (typeof s.hintsRemaining !== "number") s.hintsRemaining = hintsPerGame;
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
    ]
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
  if (!p) return { stats: false, daily: false, zoneStats: false };
  const recovered = { stats: false, daily: false, zoneStats: false };
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
  } catch (e) {}
  return recovered;
}

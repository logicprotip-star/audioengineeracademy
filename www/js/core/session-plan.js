// ZORLUK MİMARİSİ (Z2) — seans içi zorluk rampası. SAF fonksiyonlar, ses/DOM'a
// dokunmaz. DIFFICULTY_CONFIG (difficulty-curve.js) gibi burada da TEK yapılandırma
// nesnesi (SESSION_RAMP_WEIGHTS) — sabah kulakla/oranla ayarlanabilsin.

import { shuffle } from "./utils.js";

// Karar (DURUM.md ZORLUK MİMARİSİ): 10 soru → 3 kolay/3 orta/3 zor/1 pro = %30/%30/%30/%10.
// Bu oranlar herhangi bir seans uzunluğuna (5, 10, ...) ölçeklenir — bkz. buildSessionPlan.
export const SESSION_RAMP_WEIGHTS = { easy: 0.3, medium: 0.3, hard: 0.3, pro: 0.1 };

// En kolaydan en zora — buildSessionPlan'ın "ilk soru en kolaydan" kuralı ve
// pickWeightedDifficulty'nin sırası için kullanılır.
const TIER_ORDER = ["easy", "medium", "hard", "pro"];

// En büyük kalan yöntemi (Hare-Niemeyer/largest remainder) — ağırlıklardan tam
// sayı adet üretir, TOPLAM her zaman tam totalQuestions'a eşit olur (basit
// yuvarlamada — ör. 5 soruda 1.5/1.5/1.5/0.5 → naif yuvarlama 2/2/2/1=7 verirdi).
function apportion(totalQuestions, weights) {
  const entries = Object.entries(weights).map(([key, w]) => {
    const exact = w * totalQuestions;
    const count = Math.floor(exact);
    return { key, count, remainder: exact - count };
  });
  let remaining = totalQuestions - entries.reduce((sum, e) => sum + e.count, 0);
  entries.slice()
    .sort((a, b) => b.remainder - a.remainder) // stable sort — eşit kalanlarda TIER_ORDER/insertion sırası korunur
    .forEach(e => {
      if (remaining > 0) { e.count++; remaining--; }
    });
  const result = {};
  entries.forEach(e => { result[e.key] = e.count; });
  return result;
}

// SAF FONKSİYON. totalQuestions uzunluğunda bir zorluk-anahtarı dizisi üretir
// (ör. ["easy","hard","medium",...,"pro"]).
//
// KARAR — sabit sıra mı karışık mı: NE İKİSİ DE TAM OLARAK DEĞİL. İlk soru HER
// ZAMAN en kolay (mevcut) kademeden — zor bir soruyla açılmak kullanıcıyı
// caydırabilir (Z2'nin kendi notu). Kalan (totalQuestions-1) soru TAMAMEN
// karıştırılır — sabit 3-3-3-1 blok sırası (hep kolay→orta→zor→pro) tahmin
// edilebilir ve tekdüze hissettirir, tam karışıklık da (ilk soru dahil) zor bir
// açılış riski taşır. Bu ikisinin ortası: öngörülebilir güvenli açılış +
// öngörülemez devam.
export function buildSessionPlan(totalQuestions, weights = SESSION_RAMP_WEIGHTS) {
  if (totalQuestions <= 0) return [];
  const counts = apportion(totalQuestions, weights);
  const pool = [];
  TIER_ORDER.forEach(tier => {
    for (let i = 0; i < (counts[tier] || 0); i++) pool.push(tier);
  });
  const firstTier = TIER_ORDER.find(t => (counts[t] || 0) > 0) || TIER_ORDER[0];
  const firstIdx = pool.indexOf(firstTier);
  pool.splice(firstIdx, 1);
  return [firstTier, ...shuffle(pool)];
}

// Serbest (sonsuz) mod KARARI: sabit bir totalQuestions yok, bu yüzden önceden bir
// dizi kurmak yerine HER SORUDA bağımsız ağırlıklı seçim yapılır — bu, uzun
// vadede AYNI oranlara (yasalar of large numbers) yaklaşır ama sabit bir sona
// bağlı değildir, sonsuz akışa doğal uyar. rng parametresi test edilebilirlik
// için (varsayılan Math.random).
export function pickWeightedDifficulty(weights = SESSION_RAMP_WEIGHTS, rng = Math.random) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [key, w] of entries) {
    if (r < w) return key;
    r -= w;
  }
  return entries[entries.length - 1][0];
}

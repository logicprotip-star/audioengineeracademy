// ZORLUK MİMARİSİ (Z1) — sayısal "seviye" → oyun parametreleri.
// SAF fonksiyonlar: ses/DOM'a hiç dokunmaz, sadece hesap yapar. Mode-agnostic —
// frekans-bulma.js'in DIFFICULTY tablosunu (easy/medium/hard/pro/proplus) DEĞİŞTİRMEZ,
// yanında paralel bir eksen olarak durur ("Otomatik" zorluk modu — bkz. Z5 — bu
// modülden beslenir; "Sabit" mod hâlâ eski DIFFICULTY tablosunu kullanır).
//
// TÜM SAYISAL DEĞERLER BURADA (DIFFICULTY_CONFIG) — sabah kulakla ayarlanacaksa
// TEK yer burası. Hiçbir değerin "kesin doğru" olduğu iddia edilmiyor, makul
// başlangıç noktaları.

export const DIFFICULTY_CONFIG = {
  // Seviye 1..LEVEL_CAP arası LOGARİTMİK (oransal) ilerler. LEVEL_CAP'ten sonra
  // hassasiyet (gain/Q/tolerans) SABİTLENİR — bkz. difficultyParams() altındaki not.
  LEVEL_CAP: 20,

  // Değişim miktarı (dB) — seviye 1'de en belirgin (kolay duyulur), tavanda en ince.
  GAIN_DB_AT_LEVEL_1: 10,
  GAIN_DB_AT_CAP: 3,

  // Filtre Q (bant darlığı) — seviye 1'de geniş/kolay ayırt edilir, tavanda dar/zor.
  Q_AT_LEVEL_1: 0.8,
  Q_AT_CAP: 5.0,

  // Kabul toleransı (oktav) — evaluateAnswer'daki "doğru" sınırı burada DEĞİL
  // (o sabit 0.5 oktav kalıyor, mevcut testler buna dayanıyor) — bu, Otomatik modun
  // gelecekte tolerans daraltması için ayrı bir eksen (henüz createQuestion'a
  // bağlanmadı, bkz. Z1 SON RAPOR notu).
  TOLERANCE_OCT_AT_LEVEL_1: 0.6,
  TOLERANCE_OCT_AT_CAP: 0.35,

  // Soru süresi (sn) — seviye arttıkça kısalır.
  TIME_SEC_AT_LEVEL_1: 16,
  TIME_SEC_AT_CAP: 8,

  // TAVANDAN SONRA (level > LEVEL_CAP) BAĞLAM ZORLUĞU — Z1'in istediği üç
  // mekanizmadan (gain azalması / katman ekleme / süre kısaltma) UYGULANAN ikisi:
  //   1) gain azalması: cap'teki gain'den her ekstra seviyede biraz daha azalır
  //   2) süre kısaltma: cap'teki süreden her ekstra seviyede biraz daha kısalır
  // "Katman ekleme" (soruya ikinci bir gürültü/enstrüman katmanı karıştırmak)
  // UYGULANMADI — bu, audio-engine.js'te yeni bir kaynak-karıştırma yolu gerektiren
  // ayrı bir ses-mimarisi işi (saf bir veri fonksiyonunun sınırları dışında);
  // burada sadece bir TODO olarak bırakıldı, bkz. contextLayering alanı (hep false).
  CONTEXT_GAIN_REDUCTION_PER_STEP_DB: 0.15,
  CONTEXT_GAIN_FLOOR_DB: 1.5,
  CONTEXT_TIME_REDUCTION_PER_STEP_SEC: 0.2,
  CONTEXT_TIME_FLOOR_SEC: 5,

  // Sayısal seviyeyi (1..N) DIFFICULTY.options/hintBandOct/lives gibi ADIM
  // DEĞERİ olmayan (kesikli) alanlar için 5 isimli kademeden birine eşlemek üzere
  // kullanılan sınırlar — frekans-bulma.js'in DIFFICULTY anahtarlarıyla birebir
  // (easy/medium/hard/pro), proplus bu eşlemenin DIŞINDA (ayrı bir mod, doğrusal
  // hassasiyet merdiveninin bir noktası değil — bkz. tierForLevel).
  TIER_BOUNDARIES: [
    { max: 4, tier: "easy" },
    { max: 8, tier: "medium" },
    { max: 12, tier: "hard" },
    { max: Infinity, tier: "pro" }
  ]
};

function logLerp(atLevel1, atCap, t) {
  // t=0 → atLevel1, t=1 → atCap, ARADA ORANSAL (geometrik) ilerler — kulak
  // logaritmik algıladığı için doğrusal interpolasyon DEĞİL.
  if (atLevel1 <= 0 || atCap <= 0) return atLevel1 + (atCap - atLevel1) * t; // sıfır/negatifte log tanımsız, güvenli düşüş
  return atLevel1 * Math.pow(atCap / atLevel1, t);
}

// SAF FONKSİYON. level: 1'den başlayan tam sayı (veya ondalık, kırpılmaz —
// çağıran taraf isterse XP'den kesirli bir "ilerleme" türetebilir).
// Dönen: { level, gainDb, q, toleranceOct, timeSec, capped, contextApplied }
export function difficultyParams(level, config = DIFFICULTY_CONFIG) {
  const safeLevel = Math.max(1, level);
  const cappedLevel = Math.min(safeLevel, config.LEVEL_CAP);
  const t = config.LEVEL_CAP > 1 ? (cappedLevel - 1) / (config.LEVEL_CAP - 1) : 1;

  const gainDbAtCurve = logLerp(config.GAIN_DB_AT_LEVEL_1, config.GAIN_DB_AT_CAP, t);
  const q = logLerp(config.Q_AT_LEVEL_1, config.Q_AT_CAP, t);
  const toleranceOct = logLerp(config.TOLERANCE_OCT_AT_LEVEL_1, config.TOLERANCE_OCT_AT_CAP, t);
  const timeSecAtCurve = logLerp(config.TIME_SEC_AT_LEVEL_1, config.TIME_SEC_AT_CAP, t);

  const capped = safeLevel >= config.LEVEL_CAP;
  const over = capped ? safeLevel - config.LEVEL_CAP : 0;
  const contextApplied = over > 0;

  const gainDb = contextApplied
    ? Math.max(config.CONTEXT_GAIN_FLOOR_DB, gainDbAtCurve - over * config.CONTEXT_GAIN_REDUCTION_PER_STEP_DB)
    : gainDbAtCurve;
  const timeSec = contextApplied
    ? Math.max(config.CONTEXT_TIME_FLOOR_SEC, timeSecAtCurve - over * config.CONTEXT_TIME_REDUCTION_PER_STEP_SEC)
    : timeSecAtCurve;

  return {
    level: safeLevel,
    gainDb,
    q,
    toleranceOct,
    timeSec,
    capped,
    contextApplied,
    contextLayering: false // bkz. dosya başı not — uygulanmadı, her zaman false
  };
}

// safeLevel: 1..N → 5 isimli kademeden biri (easy/medium/hard/pro). "proplus"
// bu merdivenin bir noktası değil, ayrı seçilir (Otomatik modda proplus'a hiç
// geçilmez — bkz. Z5 kararı).
export function tierForLevel(level, config = DIFFICULTY_CONFIG) {
  const safeLevel = Math.max(1, level);
  const hit = config.TIER_BOUNDARIES.find(b => safeLevel <= b.max);
  return hit ? hit.tier : config.TIER_BOUNDARIES[config.TIER_BOUNDARIES.length - 1].tier;
}

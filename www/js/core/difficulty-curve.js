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

// ADIM 1 (merkezi zorluk bağlanması): bu dosya artık TEK bir global eğri değil,
// PAYLAŞILAN, mod-agnostik bir MATEMATİK KÜTÜPHANESİ — logLerp/applyPostCapFloor/
// continuousLevel/sessionRampOffset/representativeLevelForTier hiçbir sayı
// TAŞIMAZ, her mod (bkz. kesim-noktasi.js: KESIM_CURVE_CONFIG + paramsForDifficultyPosition)
// KENDİ AT_1/AT_CAP/FLOOR sayılarıyla bu fonksiyonları çağırır. difficultyParams()
// (yukarıdaki, Frekans Bulma'nın bilgi kartı için kullandığı) bu ikisini KENDİ
// DIFFICULTY_CONFIG'iyle çağıran BİR ÖRNEK haline geldi (aşağıda dogfood edilir) —
// davranışı/çıktısı DEĞİŞMEDİ (difficulty-curve.test.mjs aynı kalıyor).

// SAF FONKSİYON, export edilir (ADIM 1'den önce private'tı). t=0 → atLevel1,
// t=1 → atCap, ARADA ORANSAL (geometrik) ilerler — kulak logaritmik algıladığı
// için doğrusal interpolasyon DEĞİL.
export function logLerp(atLevel1, atCap, t) {
  if (atLevel1 <= 0 || atCap <= 0) return atLevel1 + (atCap - atLevel1) * t; // sıfır/negatifte log tanımsız, güvenli düşüş
  return atLevel1 * Math.pow(atCap / atLevel1, t);
}

// SAF FONKSİYON. difficultyParams()'ın "tavandan sonra bağlam zorluğu" desenini
// (gain/süre için tekrarlanan Math.max(floor, curveVal - over*reductionPerStep)
// kalıbı) genellemesi — ARTIK herhangi bir mod, kendi eğri değeri/tabanı/adım
// büyüklüğüyle çağırabilir. level<=levelCap ise curveValue AYNEN döner (henüz
// tavan aşılmadı).
export function applyPostCapFloor(curveValue, level, levelCap, floor, reductionPerStep) {
  const safeLevel = Math.max(1, level);
  const over = safeLevel > levelCap ? safeLevel - levelCap : 0;
  if (over <= 0) return curveValue;
  return Math.max(floor, curveValue - over * reductionPerStep);
}

// SAF FONKSİYON. progress.js:xpProgress()'in {level, current, required} çıktısını
// KESİRLİ bir seviyeye çevirir (ör. seviye 6'nın %40'ı → 6.4) — YUVARLAMA YOK.
// Bu, "zorlukKonumu = sürekliSeviye + seansRampaOfseti" birleşiminin taban
// (baseline) terimi (bkz. ADIM 1 tasarımı). required<=0 (teorik olarak
// xpNeeded hep >0 döner, ama savunmacı) ise sadece tam seviyeye düşer.
export function continuousLevel(xpProg) {
  if (!xpProg) return 1;
  if (!(xpProg.required > 0)) return Math.max(1, xpProg.level);
  const frac = Math.max(0, Math.min(1, xpProg.current / xpProg.required));
  return Math.max(1, xpProg.level + frac);
}

// Seans içi zorluk rampasının şekli — ısınma (negatif ofset, seans/döngünün
// başı) → zorlaşma (pozitif ofset, döngünün sonuna doğru) → boss (en yüksek,
// {boss:true} geldiğinde döngüdeki konumdan BAĞIMSIZ olarak). CYCLE_LENGTH=5,
// isBossRound()'un (frekans-bulma.js) KULLANDIĞI AYNI periyot — bilerek: iki
// kavram (boss round'un GERÇEK belirlenmesi — stats.rounds, ÖMÜR BOYU sayaç —
// ile rampanın seans-içi şekli — roundsInThisPlaySession, HER DENEMEDE sıfırlanan
// yerel sayaç) FARKLI sayaçlara dayanır (bkz. app.js roundsInThisPlaySession
// tanımındaki not) ve HER ZAMAN hizalı olmayabilir — bu yüzden ramp kendi
// "hangi index boss" tahminini YAPMAZ, çağıran tarafın (app.js, mode.isBossRound
// sonucunu) verdiği GERÇEK {boss} bayrağına güvenir.
export const SESSION_RAMP_CONFIG = {
  CYCLE_LENGTH: 5,
  MIN_OFFSET: -1.5,  // döngü başı (ısınma) — taban seviyeden bir miktar KOLAY
  MAX_OFFSET: 1.0,   // döngü sonu, boss OLMAYAN son soru — taban seviyeden ZOR
  BOSS_OFFSET: 2.0   // boss round — döngüdeki konumdan bağımsız, HER ZAMAN en yüksek
};

// SAF FONKSİYON. sessionIndex: 0-tabanlı, seans/deneme İÇİNDEKİ soru sırası
// (app.js: roundsInThisPlaySession, resetSession()'da sıfırlanır). Dönen ofset,
// continuousLevel()'ın SEVİYE BİRİMİYLE AYNI birimde (mod-agnostik) — çağıran
// taraf "zorlukKonumu = continuousLevel(...) + sessionRampOffset(...)" ile toplar.
export function sessionRampOffset(sessionIndex, { boss = false } = {}, config = SESSION_RAMP_CONFIG) {
  if (boss) return config.BOSS_OFFSET;
  const idx = Math.max(0, Math.floor(sessionIndex || 0));
  const cycleLen = Math.max(1, config.CYCLE_LENGTH);
  const p = idx % cycleLen;
  const t = cycleLen > 1 ? p / (cycleLen - 1) : 0;
  return config.MIN_OFFSET + (config.MAX_OFFSET - config.MIN_OFFSET) * t;
}

// SAF FONKSİYON. "Sabit" zorluk modunda kullanıcı bir İSİM (ör. "hard") seçtiğinde,
// zorlukKonumu'nun taban terimi ne olacak? — o kademenin TIER_BOUNDARIES'teki
// ARALIĞININ ORTA NOKTASI (ör. hard: 9-12 → 10.5). Üst sınırı Infinity olan son
// kademe (pro) için üst sınır olarak LEVEL_CAP-4 kullanılır (tavana yakın ama
// tam tavan değil — "pro"nun tipik/temsilci bir noktası, tavanın kendisi değil).
// config PARAMETRESİ verilirse (bkz. kesim-noktasi.js) o modun KENDİ TIER_BOUNDARIES'i
// yerine geçebilir — bugün tüm modlar difficulty-curve.js'in TEK TIER_BOUNDARIES'ini
// paylaşıyor (bkz. dosya başı not), bu yüzden varsayılan DIFFICULTY_CONFIG yeterli.
export function representativeLevelForTier(tier, config = DIFFICULTY_CONFIG) {
  let prevMax = 0;
  for (const b of config.TIER_BOUNDARIES) {
    if (b.tier === tier) {
      const upper = Number.isFinite(b.max) ? b.max : config.LEVEL_CAP - 4;
      return (prevMax + 1 + upper) / 2;
    }
    prevMax = b.max;
  }
  return 1;
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
  const contextApplied = capped && safeLevel > config.LEVEL_CAP;

  // ADIM 1: artık paylaşılan applyPostCapFloor() üzerinden (dogfood) — davranış/
  // çıktı DEĞİŞMEDİ (safeLevel<=LEVEL_CAP'te applyPostCapFloor curveVal'i aynen
  // döner, difficulty-curve.test.mjs bunu doğruluyor), sadece "tavandan sonra
  // taban" kalıbı artık TEK yerde (bkz. dosya başı not).
  const gainDb = applyPostCapFloor(gainDbAtCurve, safeLevel, config.LEVEL_CAP, config.CONTEXT_GAIN_FLOOR_DB, config.CONTEXT_GAIN_REDUCTION_PER_STEP_DB);
  const timeSec = applyPostCapFloor(timeSecAtCurve, safeLevel, config.LEVEL_CAP, config.CONTEXT_TIME_FLOOR_SEC, config.CONTEXT_TIME_REDUCTION_PER_STEP_SEC);

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

// Z6 (lvlSheet): difficultyParams().q bir biquad Q faktörü — kullanıcıya "bant
// genişliği" olarak GÖSTERMEK için oktava çevrilmesi gerekiyor. Standart RBJ audio-EQ
// cookbook ilişkisi: Q = 1 / (2*sinh(ln2/2 * BW)) → BW = 2*asinh(1/(2Q))/ln2.
export function qToOctaveBandwidth(q) {
  if (!(q > 0)) return 0;
  return (2 * Math.asinh(1 / (2 * q))) / Math.LN2;
}

// 1 oktavın altında "1/N oktav" (prototipteki "1/3 oktav" gibi), üstünde "X.X oktav"
// biçiminde. Sadece GÖRÜNTÜLEME içindir — hesaplamalarda kullanılmaz.
export function formatOctaveBandwidth(bwOctaves) {
  if (!(bwOctaves > 0)) return "0 oktav";
  if (bwOctaves >= 1) return `${bwOctaves.toFixed(1)} oktav`;
  const denom = Math.max(1, Math.round(1 / bwOctaves));
  return `1/${denom} oktav`;
}

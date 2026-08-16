// "Frekans Çakışması" — Motor 3 (G51), TEMEL AT. Mevcut sekiz modun HİÇBİRİ
// gibi değil: Motor 1 ("değeri bul") tek kaynağın kendi parametresini
// (frekans/dB/genişlik) sorar, Motor 2 ("farkı bul") üç varyanttan FARKLI
// olanı sorar — Motor 3 İKİ AYRI kaynağın AYNI ANDA çalıp birbirini
// MASKELEDİĞİ (aynı frekans bölgesinde çakışıp bulanıklaştırdığı) durumu
// TEŞHİS ETTİRİP ÇÖZDÜRÜR. SoundGym'de ve incelenen rakiplerde bu KONSEPTİN
// hiç karşılığı yok (task'ın kendi araştırması) — projenin en özgün modu.
//
// ═══════════════════════════════════════════════════════════════════════════
// MEKANİK — "3 AŞAMA", HANGİ ANLAMDA?
// ═══════════════════════════════════════════════════════════════════════════
// task'ın görev metni AŞAMA 1/2/3'ü TEK bir sorunun İÇİNDE ardışık üç adım
// gibi tarif ediyor (teşhis→karar→çöz, hepsi bir round'da). AMA prototip
// (Dizayn/prototype.html, "MOTOR 3 AŞAMA SHEET") aynı üç aşamayı AÇIKÇA
// "Aşamalar SEVİYEYE GÖRE açılır" diye tarif ediyor — Aşama 1: Seviye 1+,
// Aşama 2: Seviye 4+, Aşama 3: Seviye 7+ — yani HER ROUND TEK bir aşama,
// hangi aşamanın geleceği İLERLEMEYE göre değişiyor. Bu İKİ kaynak ÇELİŞİYOR.
//
// KARAR (bu turda verildi, task'ın "TEMEL AT" çerçevesiyle tutarlı en düşük
// riskli yol): boost-mu-cut-mu.js'in KANITLANMIŞ "katman" deseni izlendi —
// `stageForIndex(sessionQuestionIndex)` SEANS İÇİNDEKİ soru sırasına göre
// (boost-mu-cut-mu'nun layerForIndex'iyle BİREBİR AYNI eşik-mantığı) hangi
// aşamanın sorulacağını seçer, HER ROUND TEK bir aşamayı SAF bir soru+cevap
// olarak çalıştırır (createQuestion→evaluateAnswer→calculateXP, diğer sekiz
// modla AYNI çevrim). Bu, (a) mevcut app.js round-döngüsüne (startRound→
// scheduleNext) TEK SATIR yeni state-machine EKLEMEDEN oturur, (b) prototipin
// KENDİ "seviyeye göre açılır" notuyla örtüşür, (c) task'ın "ZORLUK
// (kademeli...)" beklentisiyle (aşama karmaşıklığı seviyeyle artar) DOĞRUDAN
// uyumludur. Bedeli: tek bir round'da üçünü ARDIŞIK gösteren bir "mega-soru"
// YOK — bu SONRAKİ bir tur için AÇIK bırakıldı (bkz. DURUM.md).
//
// AŞAMA 1 (Teşhis): iki kaynak birlikte çalar, kullanıcı ÇAKIŞMA bölgesini
//   şıklardan seçer — bölge GENİŞLİĞİ zorlukla daralır (CAKISMA_CURVE_CONFIG).
// AŞAMA 2 (Karar): çakışma bölgesi VERİLİR (artık bilgi), kullanıcı HANGİ
//   kaynaktan kesilmesi gerektiğini (A/B, iki şık) seçer.
// AŞAMA 3 (Çöz): bölge+doğru kaynak VERİLİR, kullanıcı NE KADAR kesileceğini
//   (dB, şıklı) seçer — doğru cevap sonrası ÖNCESİ/SONRASI dinlenebilir
//   (bkz. app.js "Frekans Çakışması" bölümü — audio-engine.js:buildDualSourceChain).
//
// ═══════════════════════════════════════════════════════════════════════════
// KAYNAK ÇİFTLERİ
// ═══════════════════════════════════════════════════════════════════════════
// Bu mod TEK bir kaynak değil bir ÇİFT kullanır (core/source-catalog.js:
// SOURCE_PAIRS/OWN_SOURCE_PAIR — SEKİZ modun paylaştığı SOURCE_GROUPS'a
// dokunulmadı, TAMAMEN AYRI/EK bir liste). getMeta().uyumluKaynaklar bu
// yüzden BİLEREK boş — pairs alanı gerçek seçimi taşır.
//
// KULAKLA/ÜRÜN DOĞRULANMADI (diğer sekiz modun AYNI dürüstlük notu): hangi
// kaynağın "kesilmesi gerektiği" (correctSource) gerçek bir mix kuralından
// (ör. "kick'e sub bırakılır, bas ondan biraz yukarıda tutulur") DEĞİL,
// v1'de RASTGELE (50/50) seçiliyor — mekanik otursun diye BİLİNÇLİ bir
// basitleştirme, SONRAKİ bir turda çift-özel "hangisi genelde kesilir" bir
// kural eklenebilir (bkz. DURUM.md).

import { logLerp, applyPostCapFloor } from "../core/difficulty-curve.js";
import { getWeakZone } from "../core/personalization.js";
import { SOURCE_PAIRS, OWN_SOURCE_PAIR, findSourcePair } from "../core/source-catalog.js";
import { shuffle, formatHz } from "../core/utils.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound } from "./frekans-bulma.js";
import { GUESS_COLOR, CORRECT_COLOR } from "../core/feedback-colors.js";

// app.js'in GENEL görselleştiricisi diğer sekiz modla AYNI re-export deseni
// (drawSpectrumBars BU modda kullanılmıyor — SHOW_SPECTRUM=false, bkz. altta —
// ama axis yardımcıları KENDİ drawOverlay'imizde hâlâ gerekli).
export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound };

export const MODE_ID = "frekans-cakismasi";
export const MAX_LIVES = 5;

// dB Seviyesi'nin (G39) AYNI mode-agnostik bayrak deseni — bu modun KENDİ
// çift-spektrum + çakışma-vurgulu görseli var (bkz. drawOverlay altta),
// app.js'in genel tek-kaynak spektrum çubukları burada ANLAMSIZ.
export const SHOW_SPECTRUM = false;

// G50'nin AYNI EXAM_ENABLED/EXAM_DIFFICULTY deseni. EXAM_WEAK_AREA="zone" —
// çakışma FREKANSTA olduğu için (task'ın kendi kararı) telafi zayıf FREKANS
// BÖLGESİ üzerinden kurulur (personalization.js:getWeakZone, PAYLAŞILAN
// zoneStats + bu dosyanın re-export ettiği FA_ZONES üzerinden — Frekans
// Bulma/Kesim Noktası/Boost-Cut'ın BESLEDİĞİ AYNI çapraz-mod sinyal).
export const EXAM_ENABLED = true;
export const EXAM_DIFFICULTY = "pro";
export const EXAM_WEAK_AREA = "zone";

// ═══════════════════════════════════════════════════════════════════════════
// SEANS İÇİ AŞAMA RAMP'İ — boost-mu-cut-mu.js:layerForIndex'in BİREBİR AYNI
// eşik-mantığı (bkz. dosya başı "3 AŞAMA" notu).
// ═══════════════════════════════════════════════════════════════════════════
export const STAGE1_QUESTION_COUNT = 3;
export const STAGE2_QUESTION_COUNT = 6;

export function stageForIndex(sessionQuestionIndex) {
  const idx = Number.isFinite(sessionQuestionIndex) ? sessionQuestionIndex : 0;
  if (idx < STAGE1_QUESTION_COUNT) return 1;
  if (idx < STAGE2_QUESTION_COUNT) return 2;
  return 3;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATİK DIFFICULTY — diğer sekiz modla AYNI ikili rol: (a) settings.
// difficultyPosition verilmezse fallback, (b) Sabit modun tier-adı çapası,
// (c) proplus için tek kaynak (bu modda proplus'a özel bir ek mekanik YOK —
// pro'yla AYNI değerler, sadece "5 tier" yapısal tutarlılığı için var, diğer
// sekiz modun HEPSİNİN AYNI kararı).
//
// regionWidthOct: AŞAMA 1'in çakışma bölgesi GENİŞLİĞİ (oktav) — küçük=zor
// (dar bölge, ince çakışma). cutStepDb: AŞAMA 3'ün şık ARALIĞI (dB) —
// küçük=zor (yakın şıklar, ince kesim farkı ayırt edilmeli).
//
// KULAKLA DOĞRULANMADI — diğer sekiz modun AYNI dürüstlük notu.
export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 16, options: 3, time: 18, lives: MAX_LIVES, regionWidthOct: 1.6, cutStepDb: 4.0 },
  medium: { label: "Orta", xp: 24, options: 4, time: 14, lives: MAX_LIVES, regionWidthOct: 1.1, cutStepDb: 2.5 },
  hard: { label: "Zor", xp: 36, options: 5, time: 11, lives: MAX_LIVES, regionWidthOct: 0.7, cutStepDb: 1.5 },
  pro: { label: "Pro", xp: 52, options: 6, time: 9, lives: MAX_LIVES, regionWidthOct: 0.4, cutStepDb: 0.8 },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 52, options: 6, time: 9, lives: MAX_LIVES, regionWidthOct: 0.4, cutStepDb: 0.8 }
};

// ═══════════════════════════════════════════════════════════════════════════
// ZORLUK EĞRİSİ — dB Seviyesi/Boost-Cut'ın BAŞTAN-doğru-kalibrasyon yöntemi
// (AT_1 statik easy'yle birebir, AT_CAP/FLOOR representativeLevelForTier'ın
// HİÇBİR temsilci seviyesinde eski statikten kolay çıkmayacak şekilde
// SEÇİLDİ — node ile doğrudan hesaplandı, test bunu doğruluyor).
export const CAKISMA_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  REGION_WIDTH_OCT_AT_1: 1.6,
  // AT_CAP/FLOOR statik pro'nun (0.4) altında — representativeLevelForTier
  // ("hard"=12) eski statik hard'ı (0.7) AŞMAMASI için ikili aramayla ÇÖZÜLDÜ
  // (node ile doğrudan hesaplandı, diğer modların "kolaylaşma yok" kalibrasyon
  // yöntemiyle AYNI): easy(4)=1.275≤1.6, medium(8)=0.942≤1.1, hard(12)=
  // 0.696≤0.7, pro(20)=0.38≤0.4 — hepsi eski statikten en az o kadar zor.
  REGION_WIDTH_OCT_AT_CAP: 0.38,
  REGION_WIDTH_OCT_FLOOR: 0.3,
  REGION_WIDTH_OCT_REDUCTION_PER_STEP: 0.01,

  CUT_STEP_DB_AT_1: 4.0,
  // AYNI ikili arama, cutStepDb için: easy(4)=3.051≤4.0, medium(8)=2.127≤2.5,
  // hard(12)=1.482≤1.5, pro(20)=0.72≤0.8.
  CUT_STEP_DB_AT_CAP: 0.72,
  CUT_STEP_DB_FLOOR: 0.55,
  CUT_STEP_DB_REDUCTION_PER_STEP: 0.03,

  TIME_SEC_AT_1: 18,
  // AYNI ikili arama: easy(4)=15.68≤18, medium(8)=13.04≤14, hard(12)=10.84≤11,
  // pro(20)=7.5 (statik pro'nun [9] altında — hızlı bir "gerçekten en zor"
  // hedefi, diğer sekiz modun representativeLevelForTier kararıyla AYNI çizgide).
  TIME_SEC_AT_CAP: 7.5,
  TIME_SEC_FLOOR: 6,
  TIME_SEC_REDUCTION_PER_STEP: 0.2
};

// SAF FONKSİYON. position: zorlukKonumu — diğer sekiz modun
// paramsForDifficultyPosition'ıyla AYNI mod-agnostik girdi.
export function paramsForDifficultyPosition(position, config = CAKISMA_CURVE_CONFIG) {
  const safePos = Math.max(1, position);
  const cappedPos = Math.min(safePos, config.LEVEL_CAP);
  const t = config.LEVEL_CAP > 1 ? (cappedPos - 1) / (config.LEVEL_CAP - 1) : 1;

  const regionCurve = logLerp(config.REGION_WIDTH_OCT_AT_1, config.REGION_WIDTH_OCT_AT_CAP, t);
  const cutStepCurve = logLerp(config.CUT_STEP_DB_AT_1, config.CUT_STEP_DB_AT_CAP, t);
  const timeCurve = logLerp(config.TIME_SEC_AT_1, config.TIME_SEC_AT_CAP, t);

  return {
    position: safePos,
    regionWidthOct: applyPostCapFloor(regionCurve, safePos, config.LEVEL_CAP, config.REGION_WIDTH_OCT_FLOOR, config.REGION_WIDTH_OCT_REDUCTION_PER_STEP),
    cutStepDb: applyPostCapFloor(cutStepCurve, safePos, config.LEVEL_CAP, config.CUT_STEP_DB_FLOOR, config.CUT_STEP_DB_REDUCTION_PER_STEP),
    timeSec: applyPostCapFloor(timeCurve, safePos, config.LEVEL_CAP, config.TIME_SEC_FLOOR, config.TIME_SEC_REDUCTION_PER_STEP)
  };
}

// Gerçek kesim büyüklüğü — tier/eğriden BAĞIMSIZ, sabit-ish bir taban (task:
// zorluk bölge GENİŞLİĞİNİ ve kesim ŞIK ARALIĞINI etkiler, kesim byüklüğünün
// KENDİSİNİ değil). ±%15 dar jitter (diğer modların pickX fonksiyonlarıyla
// AYNI desen) + jitter SONRASI taban garantisi.
export const BASE_CUT_DB = 6;
export const CUT_DB_FLOOR = 3;
export function pickCutDb(baseDb = BASE_CUT_DB, rng = Math.random) {
  const jitter = 0.85 + rng() * 0.3; // 0.85x – 1.15x
  return Math.max(CUT_DB_FLOOR, Math.round(baseDb * jitter * 100) / 100);
}

// SAF FONKSİYON — logFreq(min,max)'ın (core/utils.js) AYNI matematiği, ama
// rng ENJEKTE EDİLEBİLİR (test edilebilirlik için — diğer modların pickX
// fonksiyonlarıyla AYNI "rng parametresi" felsefesi, kompresor.js:pickOddK).
export function pickCenterFreq(regionMin, regionMax, rng = Math.random) {
  const a = Math.log(regionMin);
  const b = Math.log(regionMax);
  return Math.exp(a + rng() * (b - a));
}

// G57 — G52'nin drawOverlay'inde İKİ kaynağın dekoratif "varlık eğrisi"
// (trueCenter'ın hafifçe altına/üstüne kaydırılmış tepe noktaları) için
// kullanılan sabitler YUKARI taşındı — artık SADECE görsel değil, YANLIŞ
// cevap öğretimi de (teachingText, aşağıda) "kullanıcının seçtiği frekansta
// hangi kaynak baskın/zayıf" sorusunu AYNI dekoratif modelden cevaplıyor
// (gerçek ses FFT'si DEĞİL — dosya başı computeRegionCurveDb notuyla AYNI
// "dekoratif ama tutarlı" ilke, görsel ile öğretim metni ARTIK AYNI zihinsel
// modeli paylaşıyor, birbirinden SAPMIYOR).
export const SOURCE_CURVE_WIDTH_OCT = 1.1;
export const SOURCE_CURVE_OFFSET_OCT = 0.55;

// SAF FONKSİYON: kaynak A/B'nin dekoratif "tepe" frekansı — trueCenter'ın
// altına (A) ya da üstüne (B) SOURCE_CURVE_OFFSET_OCT kadar kaydırılmış.
export function sourcePeakFreq(trueCenter, which) {
  return which === "a" ? trueCenter / Math.pow(2, SOURCE_CURVE_OFFSET_OCT) : trueCenter * Math.pow(2, SOURCE_CURVE_OFFSET_OCT);
}

// SAF FONKSİYON: verilen bir frekansta (ör. kullanıcının AŞAMA 1 tahmini)
// hangi kaynağın (a/b) dekoratif tepesine DAHA YAKIN olduğu — "orada hangisi
// güçlü/var, hangisi zayıf" öğretim anlatısının temeli (bkz. teachingText
// AŞAMA 1 yanlış-cevap dalı).
export function dominantSourceAt(freq, trueCenter) {
  const distA = Math.abs(Math.log2(freq / sourcePeakFreq(trueCenter, "a")));
  const distB = Math.abs(Math.log2(freq / sourcePeakFreq(trueCenter, "b")));
  return distA <= distB ? "a" : "b";
}

// ═══════════════════════════════════════════════════════════════════════════
// AŞAMA 1 ŞIKLARI — çakışma merkezini içeren N aday merkez (biri doğru,
// diğerleri oktav biriminde uzaklaşan çeldiriciler) — Kesim Noktası'nın
// distractor-uzaklık deseninin AYNISI, tek eksende (frekans).
// ═══════════════════════════════════════════════════════════════════════════
export function generateStage1Choices(trueCenter, regionWidthOct, optionsCount, pairRegion) {
  const [lo, hi] = pairRegion;
  const used = new Set([Math.round(trueCenter)]);
  const candidates = [{ center: Math.round(trueCenter), correct: true }];
  // ANA strateji: oktav-uzaklaşan çeldiriciler (regionWidthOct'a göre —
  // zorluk BURADAN geliyor, dar regionWidthOct = birbirine YAKIN/ayırt
  // edilmesi zor şıklar).
  let i = 1;
  let guard = 0;
  while (candidates.length < optionsCount && guard < optionsCount * 15) {
    guard++;
    const octOffset = regionWidthOct * (0.9 + i * 0.55);
    const sign = candidates.length % 2 === 0 ? 1 : -1;
    const center = Math.round(Math.max(lo, Math.min(hi, trueCenter * Math.pow(2, sign * octOffset))));
    if (!used.has(center)) { used.add(center); candidates.push({ center, correct: false }); }
    i++;
  }
  // GÜVENLİK TAMAMLAMASI: dar bir pairRegion'da (ör. kick-bas'ın 50-160 Hz'i)
  // çok sayıda şık istenince oktav-adımları sınıra ÇARPIP kenetlenebilir,
  // ANA strateji optionsCount'a ULAŞAMAYABİLİR — kalan slotlar [lo,hi]
  // içinde EŞİT ARALIKLI, henüz kullanılmamış Hz noktalarıyla doldurulur
  // (deterministik, sonsuz döngü riski YOK, optionsCount'un ALTINDA asla
  // kalmaz — bir çiftin region'ı optionsCount kadar TAM SAYI Hz içerdiği
  // sürece, ki gerçekçi TÜM çiftler için doğru).
  if (candidates.length < optionsCount) {
    const span = hi - lo;
    const slots = optionsCount * 4;
    for (let k = 0; k < slots && candidates.length < optionsCount; k++) {
      const center = Math.round(lo + (span * (k + 0.5)) / slots);
      if (!used.has(center)) { used.add(center); candidates.push({ center, correct: false }); }
    }
  }
  return shuffle(candidates);
}

// AŞAMA 3 ŞIKLARI — dB Seviyesi'nin pickChoices deseniyle AYNI: doğru değer +
// cutStepDb aralıklarla uzaklaşan negatif (KESİM, hep negatif — bu modda
// "boost" kavramı yok, sadece maskeleyen kaynaktan kesiliyor) çeldiriciler.
// G240 (BEYAN-DENETIM-15-08 bulgusu 🟡) — bu döngü ÖNCEDEN korumasızdı,
// kardeş fonksiyonun (generateStage2Choices, yukarıda) `guard` deseninden
// YOKSUNDU. `cutStepDb` DIFFICULTY tablolarında/eğrisinde HER ZAMAN pozitif
// olduğu sürece bu SONLU adımda biter (matematiksel olarak doğrulandı,
// BEYAN-DENETIM-15-08.md Bölüm C) — ama kod bunu GARANTİ ETMİYORDU, gelecekte
// bir eğri ayarı `cutStepDb`'yi sıfır/negatif üretirse GERÇEK bir sonsuz
// döngü olurdu. Kardeş fonksiyonun AYNI `guard` sınırlaması eklendi.
export function generateStage3Choices(trueCutDb, cutStepDb, optionsCount) {
  const candidates = [{ cutDb: -Math.round(trueCutDb * 10) / 10, correct: true }];
  let step = 1;
  let guard = 0;
  while (candidates.length < optionsCount && guard < optionsCount * 15) {
    guard++;
    const mag = trueCutDb + step * cutStepDb * (1 + Math.floor((step - 1) / 2) * 0.4);
    const cutDb = -Math.max(CUT_DB_FLOOR * 0.4, Math.round(mag * 10) / 10);
    if (!candidates.some(c => Math.abs(c.cutDb - cutDb) < 1e-6)) candidates.push({ cutDb, correct: false });
    step++;
  }
  // GÜVENLİK TAMAMLAMASI — kardeş fonksiyonun AYNI ilkesi: guard tükenip
  // optionsCount'a ulaşılamazsa (NORMAL cutStepDb>0 değerleriyle ASLA
  // gerçekleşmez), kalan slotlar SABİT SAYIDA (`for`, kendi başına sonlu)
  // adımda, CUT_DB_FLOOR'un altına inen deterministik değerlerle doldurulur
  // — sonsuz döngü riski YOK (for'un kendi üst sınırı YETERLİ), optionsCount'un
  // ALTINDA kalma riski en aza indirilir.
  for (let f = 1; candidates.length < optionsCount && f <= optionsCount * 2; f++) {
    const cutDb = -(CUT_DB_FLOOR * 0.4 + f * 0.1);
    if (!candidates.some(c => Math.abs(c.cutDb - cutDb) < 1e-6)) candidates.push({ cutDb, correct: false });
  }
  return shuffle(candidates);
}

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    motor: 3,
    // Bas/sub bölgesi (kick+bas çiftinin doğal aralığı) kulaklıkta belirgin
    // ölçüde daha net ayrışır (telefon hoparlörü bu bölgeyi zayıf/topaklı
    // verir) — Tonal Denge/Reverb'in AYNI gerekçesi. KULAKLA DOĞRULANMADI.
    kulaklikGerekli: true,
    // Bu mod TEK kaynak değil bir ÇİFT kullanıyor — diğer sekiz modun
    // uyumluKaynaklar'ı (TEK-kaynak listesi) burada ANLAMSIZ, BİLEREK boş
    // (bkz. dosya başı "KAYNAK ÇİFTLERİ" notu). Gerçek seçim `pairs`'ten.
    uyumluKaynaklar: [],
    pairs: [...SOURCE_PAIRS, OWN_SOURCE_PAIR],
    ucretsiz: true, // diğer sekiz modun AYNI kararı — gerçek kilit mode-catalog.js'in "tier" alanında (bkz. o dosyanın notu, Kompresör'ün AYNI deseni)
    videoUrl: "",
    difficulty: DIFFICULTY,
    choiceOnly: true
  };
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz. settings: { pairId, boss,
// sessionQuestionIndex — bkz. stageForIndex; difficultyPosition — verilirse
// regionWidthOct/cutStepDb/timeSec EĞRİDEN gelir; rng — test edilebilirlik }.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const rng = settings.rng || Math.random;
  const pair = findSourcePair(settings.pairId);
  const pairRegion = pair.region || [FA_MIN, 400]; // "own" (region:null) → geniş, güvenli bir varsayılan havuz
  const sessionQuestionIndex = Number.isFinite(settings.sessionQuestionIndex) ? settings.sessionQuestionIndex : 0;
  const stage = stageForIndex(sessionQuestionIndex);

  const curve = (level !== "proplus" && Number.isFinite(settings.difficultyPosition))
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  const regionWidthOct = curve ? curve.regionWidthOct : diff.regionWidthOct;
  const cutStepDb = curve ? curve.cutStepDb : diff.cutStepDb;
  const timeSec = curve ? curve.timeSec : diff.time;

  const trueCenter = pickCenterFreq(pairRegion[0], pairRegion[1], rng);
  const correctSource = rng() < 0.5 ? "a" : "b"; // bkz. dosya başı "KULAKLA/ÜRÜN DOĞRULANMADI" notu
  const correctCutDb = pickCutDb(BASE_CUT_DB, rng);

  const choices = stage === 1 ? generateStage1Choices(trueCenter, regionWidthOct, diff.options, pairRegion)
    : stage === 2 ? shuffle([{ source: "a", correct: correctSource === "a" }, { source: "b", correct: correctSource === "b" }])
    : generateStage3Choices(correctCutDb, cutStepDb, diff.options);

  return {
    mode: "cakisma",
    difficulty: level,
    stage,
    pair: { id: pair.id, labelA: pair.labelA, labelB: pair.labelB, sourceA: pair.sourceA, sourceB: pair.sourceB },
    trueCenter,
    regionWidthOct,
    cutStepDb,
    correctSource,
    correctCutDb,
    hintUsed: false,
    boss,
    timeSec,
    choices
  };
}

export function questionTitle(q) {
  if (q.stage === 1) return `${q.pair.labelA} ve ${q.pair.labelB} hangi frekansta çakışıyor?`;
  if (q.stage === 2) return `${formatHz(q.trueCenter)}'de çakışıyorlar — hangisinden kesmeli?`;
  const cutLabel = q.correctSource === "a" ? q.pair.labelA : q.pair.labelB;
  return `${formatHz(q.trueCenter)}'de ${cutLabel}'dan ne kadar kesmeli?`;
}

export function modeDescription(q) {
  if (q.stage === 1) return "İkisini birlikte dinle, çakıştıkları bölgeyi şıklardan seç.";
  if (q.stage === 2) return "Hangi kaynaktan kesilirse mix açılır? Şıklardan seç.";
  return "Doğru kaynaktan ne kadar kesilmeli? Şıklardan seç — sonra öncesi/sonrasını dinle.";
}

export function correctLabel(q) {
  if (q.stage === 1) return `${formatHz(q.trueCenter)}`;
  if (q.stage === 2) return q.correctSource === "a" ? q.pair.labelA : q.pair.labelB;
  return `${q.correctCutDb.toFixed(2)} dB kes`;
}

// AŞAMA 3'te uygulanacak (ya da "önce" durumunda gain=0 kalan) filtreleri
// KOŞULSUZ kurar — İKİ kaynağın HER BİRİNE bir filtre (diğer sekiz modun
// "filtreler her zaman kurulur, A/B sadece crossfade" ilkesinin AYNISI).
// audio-engine.js:buildDualSourceChain bunları kaynak zincirlerine ekler,
// app.js SADECE q.correctSource'a karşılık gelen filtrenin gain'ini
// (setDualCut ile) q.correctCutDb'ye ANİMASYONLAR — diğer filtre HER ZAMAN 0.
const CUT_FILTER_Q = 1.1;
// OLCUM-KULAK-16-08 — Aşama 1'in kulak butonu ("senin seçtiğin merkez" vs
// "gerçek merkez") için: normal oyunda filtreler HER ZAMAN gain=0 ile
// başlar (kullanıcı KULAKLA bulmalı, ipucu YOK) — kulak-önizlemesi BUNUN
// DIŞINDA, GERİ BİLDİRİM ekranında, cevap ZATEN verildikten SONRA çalışan
// AYRI bir çağrı. `previewGainDb` SADECE o önizleme çağrısı BİLEREK verdiğinde
// var olan, OPSİYONEL bir alan — normal soru objelerinde HİÇ set edilmiyor,
// bu yüzden varsayılan (undefined → 0) DAVRANIŞ TEK BİR SATIR bile değişmedi.
export function applyProcessing(question, { audioCtx }) {
  const previewGainDb = Number.isFinite(question.previewGainDb) ? question.previewGainDb : 0;

  const filterA = audioCtx.createBiquadFilter();
  filterA.type = "peaking";
  filterA.frequency.value = question.trueCenter;
  filterA.Q.value = CUT_FILTER_Q;
  filterA.gain.value = previewGainDb;

  const filterB = audioCtx.createBiquadFilter();
  filterB.type = "peaking";
  filterB.frequency.value = question.trueCenter;
  filterB.Q.value = CUT_FILTER_Q;
  filterB.gain.value = previewGainDb;

  return { filterA, filterB };
}

// SAF FONKSİYON. answer AŞAMAYA göre değişir:
//   AŞAMA 1: sayı (Hz, şıkkın taşıdığı center) ya da { center }
//   AŞAMA 2: "a"|"b" ya da { source }
//   AŞAMA 3: sayı (işaretli dB, negatif) ya da { cutDb }
export function evaluateAnswer(question, answer) {
  if (question.stage === 1) {
    const guessCenter = answer && typeof answer === "object" ? answer.center : Number(answer);
    const correct = Math.round(guessCenter) === Math.round(question.trueCenter);
    const dOct = Number.isFinite(guessCenter) && guessCenter > 0 ? Math.abs(Math.log2(guessCenter / question.trueCenter)) : null;
    return { mode: "cakisma", stage: 1, correct, guessCenter, dOct, zone: faZoneOf(question.trueCenter) };
  }

  if (question.stage === 2) {
    const guessSource = answer && typeof answer === "object" ? answer.source : answer;
    const correct = guessSource === question.correctSource;
    return { mode: "cakisma", stage: 2, correct, guessSource };
  }

  // AŞAMA 3
  const guessCutDb = answer && typeof answer === "object" ? answer.cutDb : Number(answer);
  const correctCutDbNeg = -Math.round(question.correctCutDb * 10) / 10;
  const correct = Math.abs(guessCutDb - correctCutDbNeg) < 1e-6;
  // maskOpenedPct: doğru değerden dB farkı, bu sorunun ŞIK ARALIĞINA (cutStepDb)
  // göre "kaç adım uzakta" olduğuna çevrilir (task'ın istediği "maske ne kadar
  // açıldı" ekseni) — tam doğruysa 100, her adım uzaklaştıkça -25, 0'ın altına
  // inmez.
  const stepDb = Math.max(0.1, question.cutStepDb || 1);
  const stepsAway = correct ? 0 : Math.max(1, Math.round(Math.abs(guessCutDb - correctCutDbNeg) / stepDb));
  const maskOpenedPct = correct ? 100 : Math.max(0, 100 - Math.min(4, stepsAway) * 25);
  return { mode: "cakisma", stage: 3, correct, guessCutDb, maskOpenedPct };
}

const STAGE_XP_MULTIPLIER = { 1: 0.8, 2: 0.9, 3: 1.3 };

// SÖZLEŞMENİN DIŞINDA (G81): bkz. boost-mu-cut-mu.js:xpBase'in AYNI notu —
// geri bildirim kartının XP kırılımı için calculateXP'nin `base`ini (aşama
// çarpanı DAHİL) UYDURMADAN okuyabilmek için ayrı bir pure export.
// calculateXP'nin KENDİSİ değişmedi.
export function xpBase(question, level) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  return diff.xp * (STAGE_XP_MULTIPLIER[question.stage] || 1);
}

export function calculateXP(question, result, hintUsed, level, context = {}) {
  if (!result || !result.correct) return 0;
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const combo = context.combo || 0;
  const timeLeft = context.timeLeft || 0;
  const roundDuration = context.roundDuration || 0;
  const xpMultiplier = context.xpMultiplier || 1;

  const base = diff.xp * (STAGE_XP_MULTIPLIER[question.stage] || 1);
  const comboBoost = Math.min(2.4, 1 + combo * 0.12);
  const hintPenalty = hintUsed ? 0.5 : 1;
  const bossBoost = question.boss ? 1.65 : 1;
  const timeBoost = timeLeft > roundDuration * 0.55 ? 1.2 : 1;

  const raw = Math.round(base * comboBoost * hintPenalty * bossBoost * timeBoost * xpMultiplier);
  return Math.max(0, raw);
}

// ═══════════════════════════════════════════════════════════════════════════
// ÖĞRETİCİ METİN — task'ın kendi örnek formatı: "kick ve bas 80Hz'de
// çakışıyordu. Bası 80Hz'den kestin, kick'e yer açıldı — artık ikisi de net.
// Gerçek mixte kick'e sub'ı bırak, bası biraz yukarıdan tut."
//
// G57 — YANLIŞ cevapta da AYNI derinlikte öğretim (task: "SoundGym 'yanlış'
// der geçer — bizim ayrıştırıcımız hatadan öğretmek"). Doğru cevap dalları
// (yukarıdaki task metninin kendisi) HİÇ değişmedi — SADECE yanlış dallar
// kullanıcının SEÇTİĞİ değere göre KİŞİSELLEŞTİRİLMİŞ, "neden yanlış + neden
// doğrusu doğru" açıklamasına genişletildi. getFeedbackData/evaluateAnswer
// SAF kaldı — bu fonksiyon SADECE metin üretir, mekanik/puanlama DOKUNULMADI.
// ═══════════════════════════════════════════════════════════════════════════
export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);
  const centerLabel = formatHz(question.trueCenter);
  const cutLabel = question.correctSource === "a" ? question.pair.labelA : question.pair.labelB;
  const keepLabel = question.correctSource === "a" ? question.pair.labelB : question.pair.labelA;

  if (question.stage === 1) {
    if (result.correct) return `Doğru! ${question.pair.labelA} ve ${question.pair.labelB} ${centerLabel}'de çakışıyor — ikisi de aynı bölgede güçlü, mix orada bulanıklaşıyor.`;
    // Kullanıcının seçtiği frekansta (dekoratif "varlık eğrisi" modeline göre,
    // bkz. dosya başı sourcePeakFreq/dominantSourceAt) HANGİ kaynağın baskın
    // olduğu — "orada X var ama Y zayıf, çakışma olmaz" anlatısının temeli.
    if (Number.isFinite(result.guessCenter) && result.guessCenter > 0) {
      const guessLabel = formatHz(result.guessCenter);
      const dominant = dominantSourceAt(result.guessCenter, question.trueCenter);
      const strongLabel = dominant === "a" ? question.pair.labelA : question.pair.labelB;
      const weakLabel = dominant === "a" ? question.pair.labelB : question.pair.labelA;
      return `Yanlış — senin seçtiğin ${guessLabel}'de ${strongLabel} var ama ${weakLabel} zayıf, orada çakışma olmaz. Asıl çakışma ${centerLabel}'de — ikisi de orada güçlü, mix bulanıklaşıyor.`;
    }
    return `Yanlış — çakışma aslında ${centerLabel}'deydi. İkisini birlikte dinlerken hangi bölgede ayırt edemediğine odaklan.`;
  }

  if (question.stage === 2) {
    if (result.correct) return `Doğru! ${cutLabel}'dan kesmek mix'i açar — ${keepLabel} o bölgede daha belirleyici, yerini korumalı.`;
    const guessLabel = result.guessSource === "a" ? question.pair.labelA : question.pair.labelB;
    return `Yanlış — ${guessLabel}'dan kesmek çakışmayı çözmez, çünkü asıl maskeleyen kaynak ${cutLabel.toLowerCase()}, ${guessLabel.toLowerCase()} değil. ${cutLabel}'dan kesmeliydin — ${keepLabel} o bölgede daha belirleyici/önemli, yerini korumalı.`;
  }

  // AŞAMA 3
  if (result.correct) {
    return `${question.pair.labelA} ve ${question.pair.labelB} ${centerLabel}'de çakışıyordu. ${cutLabel}'ı ${centerLabel}'den ${Math.abs(question.correctCutDb).toFixed(2)} dB kestin, ${keepLabel}'e yer açıldı — artık ikisi de net. Gerçek mixte ${keepLabel.toLowerCase()}e o bölgeyi bırak, ${cutLabel.toLowerCase()}ı biraz yukarıdan tut.`;
  }
  // Yön (az mı çok mu kesildi) + yakınlığa göre ince/kaba geri bildirim —
  // task'ın üç alt-senaryosu (az kestin / çok kestin / yakın ama tam değil).
  const correctAbs = Math.abs(question.correctCutDb);
  const guessAbs = Math.abs(result.guessCutDb);
  const underCut = guessAbs < correctAbs;
  const base = `${cutLabel}'dan ${correctAbs.toFixed(2)} dB kesilmesi gerekiyordu, sen ${guessAbs.toFixed(2)} dB dedin`;
  if (result.maskOpenedPct >= 75) {
    // Doğruya YAKIN ama tam değil — task'ın "uygun ince geri bildirim" isteği,
    // kaba az/çok mesajı yerine yakınlığı ÖNE çıkaran daha nazik bir ton.
    return `${base} — çok yakındın (yakınlık %${result.maskOpenedPct}), ${underCut ? "biraz daha kesmen" : "biraz daha az kesmen"} yeterliydi.`;
  }
  if (underCut) {
    return `${base} — az kestin, maske hâlâ duruyor, ${question.pair.labelA} ve ${question.pair.labelB} tam ayrışmadı. Yakınlık %${result.maskOpenedPct}.`;
  }
  return `${base} — çok kestin, ${cutLabel} gereksiz zayıfladı, mixte kayboldu. Yakınlık %${result.maskOpenedPct}.`;
}

export function getFeedbackData(question, answer, context = {}) {
  const result = evaluateAnswer(question, answer);
  const gained = context.gained || 0;
  const text = teachingText(question, answer);

  if (result.correct) {
    return { result, title: question.stage === 3 ? "Maske açıldı!" : "Doğru!", detail: `${text} (+${gained} XP)`, showResult: true, panel: null };
  }
  return { result, title: "Iskaladın", detail: text, showResult: true, panel: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// SÖZLEŞMENİN DIŞINDA: bu moda özgü render/UI yardımcıları.
// ═══════════════════════════════════════════════════════════════════════════

export function getHintText(question) {
  if (question.stage === 1) {
    const zone = faZoneOf(question.trueCenter);
    return `Çakışma ${zone.t.split(" (")[0]} bölgesinde`;
  }
  if (question.stage === 2) return `İpucu: genelde ritim/temel gövdeyi taşıyan kaynak kalır, diğeri kesilir`;
  return `İpucu: ${Math.abs(question.correctCutDb) < 5 ? "ince bir kesim yeterli" : "belirgin bir kesim gerekiyor"}`;
}

export function renderHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}
export function clearHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}

// Dinleme kontrolü #freqGuessArea'da DEĞİL — diğer choiceOnly modlarla AYNI
// desen (bkz. tonal-denge.js), gerçek kontroller app.js'in kendi "Kick/Bas/
// İkisi birlikte" satırında (bkz. app.js "Frekans Çakışması" bölümü).
export function renderGuessAreaControls(freqGuessAreaEl) {
  if (!freqGuessAreaEl) return;
  freqGuessAreaEl.textContent = "";
  freqGuessAreaEl.classList.add("hidden");
}

export function renderAnswerChoices(answersEl, q) {
  if (!answersEl) return;
  if (!q.choices) { answersEl.innerHTML = ""; answersEl.classList.add("hidden"); return; }
  answersEl.classList.remove("hidden");
  answersEl.className = "answers";

  if (q.stage === 1) {
    answersEl.innerHTML = q.choices.map(c => `<button type="button" class="ans" data-center="${c.center}"><b>${formatHz(c.center)}</b></button>`).join("");
    return;
  }
  if (q.stage === 2) {
    answersEl.innerHTML = q.choices.map(c => {
      const label = c.source === "a" ? q.pair.labelA : q.pair.labelB;
      return `<button type="button" class="ans" data-source="${c.source}"><b>${label}</b></button>`;
    }).join("");
    return;
  }
  // AŞAMA 3
  answersEl.innerHTML = q.choices.map(c => `<button type="button" class="ans" data-cut="${c.cutDb}"><b>${c.cutDb.toFixed(2)} dB</b></button>`).join("");
}

export function markAnswerChoices(answersEl, q, picked) {
  if (!answersEl || !q.choices) return;
  Array.from(answersEl.querySelectorAll(".ans")).forEach(btn => {
    btn.classList.remove("pick");
    btn.disabled = true;

    if (q.stage === 1) {
      const center = Number(btn.dataset.center);
      const pickedCenter = picked && typeof picked === "object" ? picked.center : Number(picked);
      if (Math.round(center) === Math.round(q.trueCenter)) btn.classList.add("right");
      else if (Math.round(center) === Math.round(pickedCenter)) btn.classList.add("wrong");
      return;
    }
    if (q.stage === 2) {
      const source = btn.dataset.source;
      const pickedSource = picked && typeof picked === "object" ? picked.source : picked;
      if (source === q.correctSource) btn.classList.add("right");
      else if (source === pickedSource) btn.classList.add("wrong");
      return;
    }
    // AŞAMA 3
    const cutDb = Number(btn.dataset.cut);
    const pickedCut = picked && typeof picked === "object" ? picked.cutDb : Number(picked);
    const correctCutDbNeg = -Math.round(q.correctCutDb * 10) / 10;
    if (Math.abs(cutDb - correctCutDbNeg) < 1e-6) btn.classList.add("right");
    else if (Math.abs(cutDb - pickedCut) < 1e-6) btn.classList.add("wrong");
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GÖRSEL — iki kaynağın SPEKTRUMU üst üste + çakışma bölgesi vurgusu (task:
// "kırmızı=çakışma"). Gerçek zamanlı FFT ikiye ayrılamadığı için (audio-
// engine.js:analyser TEK, karışık sinyali ölçer — iki kaynağı ayrı ayrı analiz
// etmek AYRI bir analyser node ZİNCİRİ gerektirirdi, bu turun kapsamı dışında,
// bkz. DURUM.md) burada GERÇEK spektrum DEĞİL, boost-mu-cut-mu.js'in
// computeEqCurveDb TEKNİĞİYLE (GERÇEK BiquadFilterNode.getFrequencyResponse,
// elle yaklaşıklık DEĞİL) çakışma bölgesinin KENDİSİNİ (dar bir peaking
// eğrisi olarak) çizen dekoratif ama DOĞRU bir görsel kullanılıyor — diğer
// sekiz modun "spektrum dekoratif, gerçek bozukluğu göstermez" ilkesiyle
// AYNI çizgide.
// ═══════════════════════════════════════════════════════════════════════════
const CURVE_POINTS = 160;
function computeRegionCurveDb(audioCtx, centerFreq, widthOct, w) {
  if (!audioCtx) return null;
  const q = 1 / Math.max(0.05, widthOct); // dar bölge → yüksek Q, geniş bölge → düşük Q
  const filter = audioCtx.createBiquadFilter();
  filter.type = "peaking";
  filter.frequency.value = centerFreq;
  filter.Q.value = Math.max(0.4, Math.min(8, q));
  filter.gain.value = 10;
  const freqs = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) freqs[i] = faXToF((i / (CURVE_POINTS - 1)) * w, w);
  const mag = new Float32Array(CURVE_POINTS);
  const phase = new Float32Array(CURVE_POINTS);
  filter.getFrequencyResponse(freqs, mag, phase);
  const db = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) db[i] = 20 * Math.log10(Math.max(mag[i], 1e-6));
  return db;
}

// G83: Tasarim-2026-08/Prototip.dc.html:dualSpectrum() birebir — kick/bass
// eğrileri hem ALTLARINDA yarı saydam bir dolgu HEM ÜSTLERİNDE 2px'lik dolu
// bir çizgiyle çiziliyor (iki ayrı path: kapalı dolgu + açık çizgi). Bu
// fonksiyon ÖNCEDEN sadece dolguyu çiziyordu (kenar tanımsızdı) — çizgi
// katmanı G83'te eklendi. Renkler (amber/mor) BİLİNÇLİ DEĞİŞMEDİ — Kaynak
// A/B'nin kendi marka renkleri (bkz. dosya başı SOURCE_A_COLOR/SOURCE_B_COLOR
// notu, "mavi YOK" kararı) tasarımın cyan/gold'undan daha ÖNCELİKLİ, gerçek
// bir ürün kararı zaten belgelenmiş.
function drawRegionCurve(ctx2d, w, h, db, color, alpha) {
  const plotBottom = h - AXIS_H;
  const top = CURVE_TOP;
  const pts = [];
  for (let i = 0; i < CURVE_POINTS; i++) {
    const x = (i / (CURVE_POINTS - 1)) * w;
    const norm = Math.max(0, Math.min(1, db[i] / 10));
    const y = plotBottom - norm * (plotBottom - top);
    pts.push([x, y]);
  }
  ctx2d.save();
  ctx2d.beginPath();
  pts.forEach((p, i) => { if (i === 0) ctx2d.moveTo(p[0], p[1]); else ctx2d.lineTo(p[0], p[1]); });
  ctx2d.lineTo(w, plotBottom);
  ctx2d.lineTo(0, plotBottom);
  ctx2d.closePath();
  ctx2d.fillStyle = color;
  ctx2d.globalAlpha = alpha;
  ctx2d.fill();

  ctx2d.beginPath();
  pts.forEach((p, i) => { if (i === 0) ctx2d.moveTo(p[0], p[1]); else ctx2d.lineTo(p[0], p[1]); });
  ctx2d.strokeStyle = color;
  ctx2d.lineWidth = 2;
  ctx2d.globalAlpha = Math.min(1, alpha + 0.35);
  ctx2d.stroke();
  ctx2d.restore();
}

// G52: çakışma VURGUSU artık üçüncü bir dolgu-eğrisi DEĞİL (iki kaynağın
// dolgu renkleriyle aynı alanı paylaşınca amber/mor'u BASTIRIYORDU, "net
// ayrışsın" isteğiyle çelişiyordu) — bunun yerine centerFreq±widthOct/2
// aralığını kaplayan DİKEY bir vurgu şeridi + üst kenarda parlak bir çizgi.
// İki kaynağın eğrileri bunun ÜSTÜNE çizildiği için (bkz. drawOverlay sırası)
// amber/mor HER ZAMAN görünür kalıyor, kırmızı şerit sadece "burada" diyor.
function drawCollisionBand(ctx2d, w, h, centerFreq, widthOct, color, alpha) {
  const plotBottom = h - AXIS_H;
  const top = CURVE_TOP;
  const xLo = faFToX(centerFreq / Math.pow(2, widthOct / 2), w);
  const xHi = faFToX(centerFreq * Math.pow(2, widthOct / 2), w);
  ctx2d.save();
  ctx2d.fillStyle = color;
  ctx2d.globalAlpha = alpha;
  ctx2d.fillRect(xLo, top, Math.max(2, xHi - xLo), plotBottom - top);
  ctx2d.globalAlpha = Math.min(1, alpha + 0.4);
  ctx2d.fillRect(xLo, top, Math.max(2, xHi - xLo), 3);
  ctx2d.restore();
}

function drawAxis(ctx2d, w, h) {
  const plotBottom = h - AXIS_H;
  const ticks = [40, 80, 160, 320, 640, 1280];
  ctx2d.font = "600 13px Inter, sans-serif";
  ctx2d.textAlign = "center";
  ticks.forEach(f => {
    if (f < FA_MIN || f > FA_MAX) return;
    const x = faFToX(f, w);
    ctx2d.strokeStyle = "rgba(255,255,255,.08)";
    ctx2d.beginPath(); ctx2d.moveTo(x, 6); ctx2d.lineTo(x, plotBottom); ctx2d.stroke();
    ctx2d.fillStyle = "#8C95AB";
    ctx2d.fillText(f >= 1000 ? (f / 1000) + "k" : String(f), x, h - 12);
  });
  ctx2d.textAlign = "left";
  // G83: Tasarim-2026-08/Prototip.dc.html:dualSpectrum()'ün 3 ETİKETSİZ yatay
  // ızgara çizgisi (y-oranları .204/.444/.685, H=216 üzerinden) — dualSpectrum
  // spectrum()'ün AKSİNE dB etiketi TAŞIMIYOR (sadece dekoratif doku), o
  // yüzden burada da etiket UYDURULMADI, sadece çizgiler eklendi.
  ctx2d.strokeStyle = "rgba(255,255,255,.05)";
  [0.204, 0.444, 0.685].forEach(frac => {
    const y = 6 + frac * (plotBottom - 6);
    ctx2d.beginPath(); ctx2d.moveTo(0, y); ctx2d.lineTo(w, y); ctx2d.stroke();
  });
}

// G52 — İKİ KAYNAK FARKLI RENKTE, ÇAKIŞAN BÖLGE VURGULU (task kararı, önceki
// tek-eğrilik görsel bunu karşılamıyordu — iki kaynak AYRIŞMIYORDU). Gerçek
// ses içeriğinin FFT'si DEĞİL (diğer sekiz modun "dekoratif ama filtre-
// matematiği gerçek" ilkesiyle AYNI çizgide, bkz. dosya başı computeRegionCurveDb
// notu) — her kaynağın trueCenter'ın HAFİFÇE altına/üstüne kaydırılmış GENİŞ
// bir "varlık eğrisi" çizilir, ikisi de tam trueCenter'da örtüşecek şekilde
// (mekanik zaten "ikisi BURADA çakışıyor" diyor). Renkler: Kaynak A = amber
// (--am, uygulamanın ana vurgu rengi), Kaynak B = mor (--pu, Motor 3'ün KENDİ
// marka rengi — MOTOR_INFO[3] ve kaynak-çifti chip'iyle AYNI, bkz. index.html
// #cakismaPairChipLabel) — ikisi net ayrışıyor, mavi YOK (task: "iZotope
// mavisine yaklaşma"). Asıl (dar, regionWidthOct'a göre zorlukla daralan)
// ÖLÇÜM eğrisi bunların ÜSTÜNE canlı kırmızı (COLLISION_COLOR) ile "vurgu"
// olarak çizilir — GUESS_COLOR'dan (kullanıcının stage-1 seçimi, AYNI kırmızı
// aile ama farklı ton) BİLEREK ayrı bir kırmızı tonu (feedback-colors.js'in
// GUESS_COLOR'ıyla KARIŞTIRILMASIN diye, ikisi aynı anda görünebiliyor).
// SOURCE_CURVE_WIDTH_OCT/OFFSET_OCT G57'de dosya başına taşındı (bkz.
// pickCenterFreq'in altı) — artık teachingText de AYNI sabitleri okuyor.
const SOURCE_A_COLOR = "#FFC246"; // --am
const SOURCE_B_COLOR = "#A855F7"; // --pu
const COLLISION_COLOR = "#FF3D6B"; // --rd'ye yakın ama GUESS_COLOR'dan (#FF4D6D) ayrı bir ton

// state: { audioCtx, activeQuestion, roundActive, cakismaGuess } — cakismaGuess
// SADECE bu modun okuduğu alan (app.js overlayState'ine eklenir, diğer sekiz
// mod görmezden gelir — diğer modların KENDİ guess alanlarıyla AYNI desen).
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  drawAxis(ctx2d, w, h);
  const { audioCtx, activeQuestion: q, roundActive, cakismaGuess } = state;
  if (!q) return;

  // Çizim SIRASI ÖNEMLİ: önce çakışma şeridi (arka plan), SONRA iki kaynağın
  // eğrileri ÜSTÜNE — amber/mor HER ZAMAN üstte/görünür kalır, kırmızı şerit
  // sadece "bölge burada" diyen bir arka plan vurgusu (task'ın "çakışan bölge
  // vurgulu" isteği). Soru sırasında (roundActive) da görünür kalır — hangi
  // kaynaktan/ne kadar kesileceği SIZDIRILMIYOR, sadece "burada üst üste
  // biniyorlar" vurgusu, kulakla bulma ilkesini bozmuyor.
  drawCollisionBand(ctx2d, w, h, q.trueCenter, q.regionWidthOct, COLLISION_COLOR, roundActive ? 0.22 : 0.32);

  // İki kaynağın KENDİ (dekoratif) eğrileri — HER ZAMAN çizilir (roundActive
  // dahil), çünkü hangi İKİ kaynağın çaldığı zaten baştan bilinen bir bilgi
  // (kulakla bulma ilkesini bozmuyor — SIZDIRILAN şey çakışmanın TAM merkezi
  // DEĞİL, sadece "bunlar iki kaynak" gösterimi).
  const aDb = computeRegionCurveDb(audioCtx, sourcePeakFreq(q.trueCenter, "a"), SOURCE_CURVE_WIDTH_OCT, w);
  if (aDb) drawRegionCurve(ctx2d, w, h, aDb, SOURCE_A_COLOR, 0.45);
  const bDb = computeRegionCurveDb(audioCtx, sourcePeakFreq(q.trueCenter, "b"), SOURCE_CURVE_WIDTH_OCT, w);
  if (bDb) drawRegionCurve(ctx2d, w, h, bDb, SOURCE_B_COLOR, 0.45);

  if (!roundActive && cakismaGuess && q.stage === 1 && Number.isFinite(cakismaGuess.center)) {
    const guessDb = computeRegionCurveDb(audioCtx, cakismaGuess.center, q.regionWidthOct, w);
    if (guessDb) drawRegionCurve(ctx2d, w, h, guessDb, GUESS_COLOR, 0.5);
  }

  ctx2d.font = "700 12px Inter, sans-serif";
  ctx2d.textAlign = "left";
  ctx2d.fillStyle = SOURCE_A_COLOR;
  ctx2d.fillText(`● ${q.pair.labelA}`, 10, 22);
  ctx2d.fillStyle = SOURCE_B_COLOR;
  ctx2d.fillText(`● ${q.pair.labelB}`, 10 + ctx2d.measureText(`● ${q.pair.labelA}`).width + 14, 22);
  ctx2d.fillStyle = COLLISION_COLOR;
  ctx2d.fillText("● Çakışma bölgesi", 10, 42);
  if (!roundActive && cakismaGuess && q.stage === 1) {
    ctx2d.fillStyle = GUESS_COLOR;
    ctx2d.fillText("● Senin seçimin", 10 + ctx2d.measureText("● Çakışma bölgesi").width + 14, 42);
  }
}

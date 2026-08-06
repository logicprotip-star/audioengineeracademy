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
export function generateStage3Choices(trueCutDb, cutStepDb, optionsCount) {
  const candidates = [{ cutDb: -Math.round(trueCutDb * 10) / 10, correct: true }];
  let step = 1;
  while (candidates.length < optionsCount) {
    const mag = trueCutDb + step * cutStepDb * (1 + Math.floor((step - 1) / 2) * 0.4);
    const cutDb = -Math.max(CUT_DB_FLOOR * 0.4, Math.round(mag * 10) / 10);
    if (!candidates.some(c => Math.abs(c.cutDb - cutDb) < 1e-6)) candidates.push({ cutDb, correct: false });
    step++;
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
  return `${q.correctCutDb.toFixed(1)} dB kes`;
}

// AŞAMA 3'te uygulanacak (ya da "önce" durumunda gain=0 kalan) filtreleri
// KOŞULSUZ kurar — İKİ kaynağın HER BİRİNE bir filtre (diğer sekiz modun
// "filtreler her zaman kurulur, A/B sadece crossfade" ilkesinin AYNISI).
// audio-engine.js:buildDualSourceChain bunları kaynak zincirlerine ekler,
// app.js SADECE q.correctSource'a karşılık gelen filtrenin gain'ini
// (setDualCut ile) q.correctCutDb'ye ANİMASYONLAR — diğer filtre HER ZAMAN 0.
const CUT_FILTER_Q = 1.1;
export function applyProcessing(question, { audioCtx }) {
  const filterA = audioCtx.createBiquadFilter();
  filterA.type = "peaking";
  filterA.frequency.value = question.trueCenter;
  filterA.Q.value = CUT_FILTER_Q;
  filterA.gain.value = 0;

  const filterB = audioCtx.createBiquadFilter();
  filterB.type = "peaking";
  filterB.frequency.value = question.trueCenter;
  filterB.Q.value = CUT_FILTER_Q;
  filterB.gain.value = 0;

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
// ═══════════════════════════════════════════════════════════════════════════
export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);
  const centerLabel = formatHz(question.trueCenter);
  const cutLabel = question.correctSource === "a" ? question.pair.labelA : question.pair.labelB;
  const keepLabel = question.correctSource === "a" ? question.pair.labelB : question.pair.labelA;

  if (question.stage === 1) {
    if (result.correct) return `Doğru! ${question.pair.labelA} ve ${question.pair.labelB} ${centerLabel}'de çakışıyor — ikisi de aynı bölgede güçlü, mix orada bulanıklaşıyor.`;
    return `Çakışma aslında ${centerLabel}'deydi, sen farklı bir bölge işaretledin. İkisini birlikte dinlerken hangi bölgede ayırt edemediğine odaklan.`;
  }

  if (question.stage === 2) {
    if (result.correct) return `Doğru! ${cutLabel}'dan kesmek mix'i açar — ${keepLabel} o bölgede daha belirleyici, yerini korumalı.`;
    const guessLabel = result.guessSource === "a" ? question.pair.labelA : question.pair.labelB;
    return `Aslında ${cutLabel}'dan kesilmeliydi, sen ${guessLabel}'ı seçtin — ${guessLabel}'dan kesmek ${keepLabel}'i zayıflatır, çakışma çözülmez.`;
  }

  // AŞAMA 3
  if (result.correct) {
    return `${question.pair.labelA} ve ${question.pair.labelB} ${centerLabel}'de çakışıyordu. ${cutLabel}'ı ${centerLabel}'den ${Math.abs(question.correctCutDb).toFixed(1)} dB kestin, ${keepLabel}'e yer açıldı — artık ikisi de net. Gerçek mixte ${keepLabel.toLowerCase()}e o bölgeyi bırak, ${cutLabel.toLowerCase()}ı biraz yukarıdan tut.`;
  }
  return `${cutLabel}'dan ${Math.abs(question.correctCutDb).toFixed(1)} dB kesilmesi gerekiyordu, sen ${Math.abs(result.guessCutDb).toFixed(1)} dB dedin — yakınlık %${result.maskOpenedPct}, maske tam açılmadı.`;
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
  answersEl.innerHTML = q.choices.map(c => `<button type="button" class="ans" data-cut="${c.cutDb}"><b>${c.cutDb.toFixed(1)} dB</b></button>`).join("");
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

function drawRegionCurve(ctx2d, w, h, db, color, alpha) {
  const plotBottom = h - AXIS_H;
  const top = CURVE_TOP;
  ctx2d.save();
  ctx2d.beginPath();
  for (let i = 0; i < CURVE_POINTS; i++) {
    const x = (i / (CURVE_POINTS - 1)) * w;
    const norm = Math.max(0, Math.min(1, db[i] / 10));
    const y = plotBottom - norm * (plotBottom - top);
    if (i === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
  }
  ctx2d.lineTo(w, plotBottom);
  ctx2d.lineTo(0, plotBottom);
  ctx2d.closePath();
  ctx2d.fillStyle = color;
  ctx2d.globalAlpha = alpha;
  ctx2d.fill();
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
}

// state: { audioCtx, activeQuestion, roundActive, cakismaGuess } — cakismaGuess
// SADECE bu modun okuduğu alan (app.js overlayState'ine eklenir, diğer sekiz
// mod görmezden gelir — diğer modların KENDİ guess alanlarıyla AYNI desen).
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  drawAxis(ctx2d, w, h);
  const { audioCtx, activeQuestion: q, roundActive, cakismaGuess } = state;
  if (!q) return;

  // Soru sırasında (roundActive) SADECE gerçek çakışma bölgesi (kırmızı) —
  // kulakla bulma ilkesi, cevap SIZDIRILMAZ; cevap sonrası kullanıcının
  // seçtiği bölge/kaynak/kesim de (mavi) üst üste çizilir.
  const trueDb = computeRegionCurveDb(audioCtx, q.trueCenter, q.regionWidthOct, w);
  if (trueDb) drawRegionCurve(ctx2d, w, h, trueDb, "#FF7A9B", roundActive ? 0.35 : 0.55);

  if (!roundActive && cakismaGuess && q.stage === 1 && Number.isFinite(cakismaGuess.center)) {
    const guessDb = computeRegionCurveDb(audioCtx, cakismaGuess.center, q.regionWidthOct, w);
    if (guessDb) drawRegionCurve(ctx2d, w, h, guessDb, GUESS_COLOR, 0.5);
  }

  ctx2d.font = "700 12px Inter, sans-serif";
  ctx2d.fillStyle = "#FF9FB2";
  ctx2d.textAlign = "left";
  ctx2d.fillText("● Çakışma bölgesi", 10, 22);
  if (!roundActive && cakismaGuess && q.stage === 1) {
    ctx2d.fillStyle = GUESS_COLOR;
    ctx2d.fillText("● Senin seçimin", 150, 22);
  }
}

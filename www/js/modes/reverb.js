// "Reverb" — Motor 2'nin İKİNCİ modu (Kompresör şablonundan TÜRETİLDİ).
// AYNI oyun tipi: 3 ses (A/B/C), aynı kaynak, ikisi AYNI reverb biri FARKLI —
// kullanıcı FARKLI olanı üç şıktan (%33 şans) bulur.
//
// KOMPRESÖR ŞABLONUNDAN MİRAS ALINANLAR (G33'ün "MOTOR 2 ŞABLONU" notu,
// bkz. kompresor.js dosya başı):
//   1. TEK ALGISAL EKSEN + BİRLEŞİK PARAMETRELER — burada k ∈ [0,1] decay/
//      preDelay/size'ı BİRLİKTE sürüyor (Kompresör'de ratio+threshold'u
//      sürdüğü gibi), tek bir "yankı puanı" (reverbAmountScore) türetiliyor.
//   2. previewLetter — applyProcessing HANGİ harfin TÜM parametrelerini
//      okuyacağını previewLetter'dan öğreniyor (Kompresör'ün AYNI mekanizması,
//      farklı parametre sayısıyla da çalıştığını KANITLIYOR — 3 parametre:
//      decay+preDelay+size, Kompresör'ün 2'sine [ratio+threshold] karşı).
//   3. Öğretim şablonları TEK yerde (REVERB_AMOUNT_TIERS + REVERB_TYPES'ın
//      mixMeaning alanı).
//   4. Merkezi zorluk eğrisi (REVERB_CURVE_CONFIG + paramsForDifficultyPosition,
//      logLerp + applyPostCapFloor, "kolaylaşma yok" invaryantı) — AYNI kalıp.
//
// KOMPRESÖR'DEN FARKLI, REVERB'E ÖZGÜ bir katman: KADEMELİ zorluk — kolay/orta/
// zor AYNI TİP içinde (Room/Hall/Plate) miktar farkı (k ekseninde), ama PRO
// (ve proplus) TİP farkına geçiyor (ikisi Hall biri Plate gibi) — bu, Kompresör'de
// olmayan bir "kategori değişimi" zorluk katmanı; SoundGym Reverb Wizard'ın
// forum eleştirisine ("reverb TÜRÜNÜ öğretmiyor") karşı bizim ayrıştırıcımız.
//
// SoundGym Reverb Wizard'ın zayıflığı: sadece "hangisi farklı"yı buldurup
// TÜRÜ hiç açıklamıyor. Bizim cevap sonrası öğretimimiz (teachingText) HER
// zaman tip + parametre + mix anlamını birlikte veriyor.
//
// IR (impulse response) SENTETİK üretiliyor — hazır dosya YOK (bkz. dosya
// sonundaki generateImpulseResponse): üstel sönümlü gürültü + tip-özgü bir
// tek-kutuplu lowpass (parlaklık) + pre-delay boşluğu. Gerçek bir akustik
// mekan ölçümü DEĞİL, algoritmik bir yaklaşıklık.

import { compatibleSourceIds } from "../core/source-catalog.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound } from "./frekans-bulma.js";
import { logLerp, applyPostCapFloor } from "../core/difficulty-curve.js";
import { GUESS_COLOR, CORRECT_COLOR } from "../core/feedback-colors.js";
import { renderThreeWayCards, markThreeWayCards, updateThreeWayCardsPlayState } from "../core/three-way-cards.js";

// app.js'in GENEL görselleştiricisi (drawVisualizer/drawSpectrumBars) BU sabitleri
// HER moddan mode-agnostik olarak okur — diğer altı modla AYNI re-export deseni.
export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound };

export const MODE_ID = "reverb";
export const MAX_LIVES = 5;
// Motor 2'nin ("A/B/C odd-one-out") HANGİ modları kapsadığını app.js TEK
// yerde (THREE_WAY_MODE_IDS) tutuyor — bu bayrak SADECE dokümantasyon/
// kendi-kendini-açıklama amaçlı, app.js kendi listesini kullanıyor (bkz. o
// dosyadaki not) ama gelecekteki bir mod bu dosyayı ŞABLON alırken aynı ismi
// aramalı.
export const THREE_WAY = true;

// ═══════════════════════════════════════════════════════════════════════════
// REVERB TİPLERİ — üç KARAKTER (Room/Hall/Plate), her biri kendi decay/
// preDelay/size ARALIĞINA ve brightness'ına (lowpass sertliği) sahip. k∈[0,1]
// bir tipin KENDİ aralığı içinde nerede olduğunu belirler (Kompresör'ün
// ratioAtK/thresholdAtK'sinin AYNI deseni, üç parametre için).
// KULAKLA DOĞRULANMADI — diğer altı modun AYNI dürüstlük notu.
// ═══════════════════════════════════════════════════════════════════════════
export const REVERB_TYPES = {
  room: {
    label: "Room",
    decayRange: [0.3, 0.9], // sn
    preDelayRange: [0.003, 0.012], // sn
    sizeRange: [0.15, 0.35], // [0,1] — mekan büyüklüğü normu
    brightness: 0.65, // 0=donuk/karanlık, 1=parlak — lowpass sertliğini belirler
    mixMeaning: "kısa, yakın/kuru bir mekan hissi — sesi öne, dinleyiciye yakın tutar"
  },
  hall: {
    label: "Hall",
    decayRange: [1.6, 3.2],
    preDelayRange: [0.02, 0.045],
    sizeRange: [0.55, 0.95],
    brightness: 0.4,
    mixMeaning: "geniş, yumuşak, uzun bir mekan hissi — sesi geriye/derine iter, doğal konser-salonu havası"
  },
  plate: {
    label: "Plate",
    decayRange: [0.9, 2.0],
    preDelayRange: [0.0, 0.006],
    sizeRange: [0.25, 0.45],
    brightness: 0.85,
    mixMeaning: "parlak, yoğun, metalik bir kuyruk — vokal/snare'de parlaklık/enerji katar, gerçek bir mekan hissi vermez"
  }
};
const TYPE_IDS = Object.keys(REVERB_TYPES); // ["room","hall","plate"]

// NOT: Kompresör'ün attack/release'i gibi "hız" kavramı bu modda YOK —
// Motor 2 şablonunun HER parametresi zorunlu değil, sadece "tek algısal
// eksen + previewLetter + tek-yerde öğretim" ÜÇLÜSÜ zorunlu.
export const COMP_BASE_K = 0.5; // "aynı" ikilinin sabit referans yoğunluğu — [0,1]'in ORTASI (Kompresör'ün AYNI simetri kararı)

function lerp(a, b, t) { return a + (b - a) * t; }
// SAF FONKSİYON.
export function decayAtK(type, k) { return lerp(type.decayRange[0], type.decayRange[1], k); }
export function preDelayAtK(type, k) { return lerp(type.preDelayRange[0], type.preDelayRange[1], k); }
export function sizeAtK(type, k) { return lerp(type.sizeRange[0], type.sizeRange[1], k); }
export function wetMixAtK(k) { return 0.35 + k * 0.55; } // k=0'da bile hafif bir yankı kalır (tam kuru YOK, Kompresör'ün "limiter'da bile mikro-dinamik var" dersiyle AYNI dürüstlük)

// SAF FONKSİYON. Decay+size+wetMix'in BİRLEŞİK etkisini TEK bir "yankı puanı"na
// indirger (Kompresör'ün gainReductionDb'sinin AYNI rolü — GERÇEK bir akustik
// birim DEĞİL, zorluk/floor kalibrasyonu ve öğretim-kademesi sınıflandırması
// İÇİN tasarlanmış bir tasarım sabiti). k arttıkça decay/size/wetMix ÜÇÜ de
// artıyor, bu yüzden reverbAmountScore k'de KESİNTİSİZ/MONOTON artıyor
// (testle doğrulandı).
export function reverbAmountScore(decaySec, sizeNorm, wetMix) {
  return decaySec * (0.4 + 0.6 * sizeNorm) * (0.5 + 0.5 * wetMix);
}

// ═══════════════════════════════════════════════════════════════════════════
// STATİK DIFFICULTY — diğer altı modla AYNI ikili rol (fallback + Sabit mod
// çapası + proplus kaynağı). `options` HER ZAMAN 3 (A/B/C). kGap: FARKLI
// olanın k'sinin COMP_BASE_K'dan ne kadar uzakta olacağı — SADECE AYNI-tip
// (easy/medium/hard) turlarında kullanılır; pro/proplus'ta odd varyant TİP
// değiştirir (bkz. TYPE_SWAP_POSITION_THRESHOLD), kGap değeri o turlarda
// YOKSAYILIR (tabloda SADECE yapısal tutarlılık için tutuluyor).
//
// KULAKLA DOĞRULANMADI — diğer altı modun AYNI dürüstlük notu.
export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 15, options: 3, time: 17, lives: MAX_LIVES, kGap: 0.45 },
  medium: { label: "Orta", xp: 23, options: 3, time: 14, lives: MAX_LIVES, kGap: 0.28 },
  hard: { label: "Zor", xp: 33, options: 3, time: 12, lives: MAX_LIVES, kGap: 0.14 },
  pro: { label: "Pro", xp: 48, options: 3, time: 10, lives: MAX_LIVES, kGap: 0.06 },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 48, options: 3, time: 10, lives: MAX_LIVES, kGap: 0.06 }
};

// ═══════════════════════════════════════════════════════════════════════════
// ZORLUK EĞRİSİ — Kompresör'ün (G33) BAŞTAN-doğru-kalibrasyon yöntemiyle
// bağlı. AT_1 statik easy değeriyle birebir aynı. AT_CAP + FLOOR ikili
// aramayla İKİ koşul birlikte sağlanacak şekilde ÖNCEDEN çözüldü (node ile
// doğrudan doğrulandı): representativeLevelForTier'ın HİÇBİR temsilci
// seviyesinde (easy=4→0.3229, medium=8→0.2074, hard=12→0.1333, pro=20→0.0550)
// eski statik tablodan kolay çıkmıyor; K_GAP_FLOOR'da (0.05) bile "room"
// tipinde base'ten ~%7.6 oransal yankı-puanı farkı kalıyor (sıfıra/algılanamaz
// bir farka ASLA inmiyor — kulağın ayırt edebileceği varsayılan bir alt sınır,
// KULAKLA DOĞRULANMADI).
export const REVERB_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  K_GAP_AT_1: 0.45,
  K_GAP_AT_CAP: 0.055,
  K_GAP_FLOOR: 0.05,
  K_GAP_REDUCTION_PER_STEP: 0.001,

  TIME_SEC_AT_1: 17,
  TIME_SEC_AT_CAP: 10,
  TIME_SEC_FLOOR: 7,
  TIME_SEC_REDUCTION_PER_STEP: 0.15
};

// position >= bu eşikte odd varyant AYNI-tip miktar farkı YERİNE TİP farkına
// geçer ("PRO: TİP farkı odd-one-out" — öğretmen yöntemi, en ince/zor katman).
// representativeLevelForTier("pro")=LEVEL_CAP=20 bunun BELİRGİN üstünde,
// ("hard")=12 BELİRGİN altında — iki tier arasında net bir ayrım payı var.
export const TYPE_SWAP_POSITION_THRESHOLD = 18;

// SAF FONKSİYON. position: zorlukKonumu — diğer altı modun
// paramsForDifficultyPosition'ıyla AYNI mod-agnostik girdi.
export function paramsForDifficultyPosition(position, config = REVERB_CURVE_CONFIG) {
  const safePos = Math.max(1, position);
  const cappedPos = Math.min(safePos, config.LEVEL_CAP);
  const t = config.LEVEL_CAP > 1 ? (cappedPos - 1) / (config.LEVEL_CAP - 1) : 1;

  const kGapCurve = logLerp(config.K_GAP_AT_1, config.K_GAP_AT_CAP, t);
  const timeCurve = logLerp(config.TIME_SEC_AT_1, config.TIME_SEC_AT_CAP, t);

  return {
    position: safePos,
    kGap: applyPostCapFloor(kGapCurve, safePos, config.LEVEL_CAP, config.K_GAP_FLOOR, config.K_GAP_REDUCTION_PER_STEP),
    timeSec: applyPostCapFloor(timeCurve, safePos, config.LEVEL_CAP, config.TIME_SEC_FLOOR, config.TIME_SEC_REDUCTION_PER_STEP)
  };
}

// SAF FONKSİYON. Kompresör'ün pickKGap'iyle AYNI (±%6 dar jitter + jitter
// SONRASI FLOOR garantisi, G24'te ÖĞRENİLEN dersler BAŞTAN uygulandı).
export function pickKGap(baseKGap, rng = Math.random) {
  const jitter = 0.94 + rng() * 0.12;
  const jittered = baseKGap * jitter;
  return Math.max(REVERB_CURVE_CONFIG.K_GAP_FLOOR, jittered);
}

// SAF FONKSİYON. Kompresör'ün pickOddK'sıyla AYNI (COMP_BASE_K=0.5 ORTADA
// olduğu ve K_GAP_AT_1<0.5 olduğu için pratikte clamp'e hiç gerek kalmıyor).
export function pickOddK(base, kGap, rng = Math.random) {
  const direction = rng() < 0.5 ? 1 : -1;
  const raw = base + direction * kGap;
  return Math.min(1, Math.max(0, raw));
}

// SAF FONKSİYON. baseType DIŞINDA rastgele bir tip seçer (2 seçenekten biri).
export function pickDifferentType(baseType, rng = Math.random) {
  const others = TYPE_IDS.filter(t => t !== baseType);
  return others[Math.floor(rng() * others.length)];
}

function buildVariant(letter, typeId, k) {
  const type = REVERB_TYPES[typeId];
  const decaySec = decayAtK(type, k);
  const preDelaySec = preDelayAtK(type, k);
  const sizeNorm = sizeAtK(type, k);
  const wetMix = wetMixAtK(k);
  return {
    letter,
    type: typeId,
    k,
    decaySec,
    preDelaySec,
    sizeNorm,
    wetMix,
    brightness: type.brightness,
    amountScore: reverbAmountScore(decaySec, sizeNorm, wetMix)
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    motor: 2,
    // G37: true — reverb kuyruğunun ince decay/pre-delay farkları (özellikle AYNI-tip
    // turlarda, bkz. G35) telefon hoparlöründe kolayca kaybolur; kulaklık derinlik/
    // mekan hissini net verir. G35'te bu alan YANLIŞLIKLA false bırakılmıştı (Kompresör
    // şablonundan kopyalanırken düzeltilmemiş) — kulaklikGerekli o zaman HİÇBİR YERDE
    // okunmadığı için etkisizdi, G37'de gerçek bir uyarı sheet'i buna bağlandığı için
    // DOĞRU değere düzeltildi (mode-catalog.js'teki reverb girdisi zaten true'ydu).
    kulaklikGerekli: true,
    // G43: ELLE seçilmiş açık liste (mixte GERÇEKTEN reverb verilen kaynaklar) —
    // G42'nin "tek-vuruş dışla" otomatik kuralının YERİNE geçti, çünkü o kural
    // snare'i de dışlıyordu (snare, gerçek mixte NEREDEYSE HER ZAMAN reverb alan
    // bir kaynak — "tek vuruş" heuristiği burada yanlış öngörüyordu). Kalan dört
    // kaynak (+upload) gerçek mix pratiğinde reverb'in duyulabilir/anlamlı olduğu
    // kaynaklar: gitar (oda/plate ambiyansı), vokal (klasik reverb kaynağı), snare
    // (kısa room/plate — vuruş sonrası kuyruk NET duyulur), davul döngüsü (bağlam
    // içinde mekan hissi). Bas (mud riski), kick/hi-hat/tom (tek vuruşun geri kalanı
    // çok kısa/net değil bu üçünde), sentetik/gürültü (mixte hiç reverb verilmeyen
    // test tonları) BİLEREK dışarıda — kullanıcı ürün kararı, bkz. DURUM.md G43.
    uyumluKaynaklar: compatibleSourceIds({ only: ["guitar", "vocal", "snare", "groove", "upload"] }),
    // NOT (Kompresör'le AYNI karar): mode-catalog.js'te tier:"pro" — ama bu
    // alan GERÇEK kilitlemede KULLANILMIYOR (asıl kaynak mode-catalog.js'in
    // `tier` alanı), mevcut altı modun HEPSİYLE tutarlı kalmak için true.
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY,
    choiceOnly: true
  };
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz. settings: { source, boss,
// difficultyPosition — verilirse kGap/timeSec EĞRİDEN gelir, verilmezse
// (mevcut testler, doğrudan çağrılar, proplus) statik DIFFICULTY[level]
// davranışı korunur }.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "pink";

  const curve = (level !== "proplus" && Number.isFinite(settings.difficultyPosition))
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  const baseKGap = curve ? curve.kGap : diff.kGap;
  const timeSec = curve ? curve.timeSec : diff.time;

  // PRO/PRO PLUS (Sabit) YA DA eğri-konumu eşiği aştıysa (Otomatik) → TİP
  // farkı katmanı. Öğretmen yöntemi: en ince/zor katman, "miktar" yerine
  // "karakter" ayrımı.
  const isTypeSwapTier = level === "pro" || level === "proplus" || !!(curve && curve.position >= TYPE_SWAP_POSITION_THRESHOLD);

  const baseType = TYPE_IDS[Math.floor(Math.random() * TYPE_IDS.length)];
  const oddIndex = Math.floor(Math.random() * 3);

  let oddType, oddK, kGap;
  if (isTypeSwapTier) {
    oddType = pickDifferentType(baseType);
    oddK = COMP_BASE_K; // tip zaten farklı — miktar AYRICA uçlara çekilmiyor, "tipik" bir örnek yeterli
    kGap = 0; // bu turda kullanılmadı (yapısal alan, testler için raporlanıyor)
  } else {
    oddType = baseType;
    kGap = pickKGap(baseKGap);
    oddK = pickOddK(COMP_BASE_K, kGap);
  }

  const letters = ["A", "B", "C"];
  const variants = letters.map((letter, i) =>
    i === oddIndex ? buildVariant(letter, oddType, oddK) : buildVariant(letter, baseType, COMP_BASE_K)
  );
  const choices = letters.map((letter, i) => ({ id: letter, tr: letter, correct: i === oddIndex }));

  return {
    mode: "reverb",
    difficulty: level,
    source,
    variants,
    oddIndex,
    typeSwap: isTypeSwapTier,
    kGap,
    hintUsed: false,
    boss,
    timeSec,
    choices
  };
}

export function modeDescription() {
  return "A/B/C ile üçünü de dinle, FARKLI yankılanan (reverb) sesi şıklardan seç.";
}

export function correctLabel(question) {
  const odd = question.variants[question.oddIndex];
  return `${odd.letter} (${REVERB_TYPES[odd.type].label}, decay ${odd.decaySec.toFixed(1)}s)`;
}

// Soruda uygulanan reverb'i audioCtx üzerinde kurar. question.previewLetter
// VERİLİRSE (app.js'in 3-yönlü abToggle'ının o an dinletmek istediği harf) O
// harfin TÜM parametreleri (decay/preDelay/size/wetMix/brightness/type)
// question.variants'tan okunur; verilmezse variants[0] (harf A) çalar —
// Kompresör'ün BİREBİR AYNI previewLetter deseni (parametre sayısı fark
// etmiyor, MOTOR 2 ŞABLONU).
//
// KURU/ISLAK KARIŞIMI TEK bir "filters" zincirinde (audio-engine.js'in genel
// "sourceMix→filters[0]→filters[1]→...→localWetGain" seri-bağlama sözleşmesi
// DEĞİŞTİRİLMEDEN): filters=[input, output]. Dış döngü OTOMATİK olarak
// sourceMix→input VE input→output bağlantılarını kurar — input.gain=(1-wetMix)
// olduğu için bu OTOMATİK ikinci bağlantı KURU payı taşır. Biz AYRICA (bu
// fonksiyon içinde, dışarıdan görünmeden) input→convolver→wetGain→output
// bağlantısını kuruyoruz — output düğümü İKİ kaynaktan (kuru+ıslak) gelen
// sinyali TOPLAR (GainNode'un varsayılan davranışı). Sonuç: audio-engine.js'e
// HİÇ dokunmadan doğru kuru/ıslak karışımı.
export function applyProcessing(question, { audioCtx }) {
  const letter = question.previewLetter || question.variants[0].letter;
  const variant = question.variants.find(v => v.letter === letter) || question.variants[0];

  const input = audioCtx.createGain();
  input.gain.value = 1 - variant.wetMix; // KURU pay — filters dizisinin OTOMATİK seri bağlantısı (input→output) üzerinden gider
  const wetGain = audioCtx.createGain();
  wetGain.gain.value = variant.wetMix; // ISLAK pay
  const output = audioCtx.createGain();
  const convolver = audioCtx.createConvolver();
  convolver.normalize = true;
  convolver.buffer = generateImpulseResponse(audioCtx, variant);

  input.connect(convolver);
  convolver.connect(wetGain);
  wetGain.connect(output);

  return { filters: [input, output] };
}

// SAF FONKSİYON. answer: harf ("A"/"B"/"C") ya da {id}.
export function evaluateAnswer(question, answer) {
  const guessLetter = answer && typeof answer === "object" ? answer.id : answer;
  const correctLetter = question.variants[question.oddIndex].letter;
  const correct = guessLetter === correctLetter;
  return { mode: "reverb", correct, guessLetter, correctLetter };
}

export function calculateXP(question, result, hintUsed, level, context = {}) {
  if (!result || !result.correct) return 0;
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const combo = context.combo || 0;
  const timeLeft = context.timeLeft || 0;
  const roundDuration = context.roundDuration || 0;
  const xpMultiplier = context.xpMultiplier || 1;

  const comboBoost = Math.min(2.4, 1 + combo * 0.12);
  const hintPenalty = hintUsed ? 0.5 : 1;
  const bossBoost = question.boss ? 1.65 : 1;
  const timeBoost = timeLeft > roundDuration * 0.55 ? 1.2 : 1;

  const raw = Math.round(diff.xp * comboBoost * hintPenalty * bossBoost * timeBoost * xpMultiplier);
  return Math.max(0, raw);
}

// ═══════════════════════════════════════════════════════════════════════════
// ÖĞRETİCİ METİN — soru SADE, geri bildirim ZENGİN: FARKLI olanın tip +
// parametreleri + mix anlamı TEK yerde. SoundGym Reverb Wizard'ın forumda
// eleştirilen zayıflığı ("türü öğretmiyor") burada AÇIKÇA giderilmeye
// çalışıldı — TİP HER ZAMAN adıyla söyleniyor.
// ═══════════════════════════════════════════════════════════════════════════

// SAF VERİ. Kademe sınırları amountScore üzerinde (Kompresör'ün
// COMPRESSION_TIERS'ıyla AYNI desen) — AYNI-tip (miktar farkı) turlarında
// "ikisi de aynı kademede mi" ayrımı için.
const REVERB_AMOUNT_TIERS = [
  { max: 0.4, word: "ince/hafif yankı", detail: "ses öne yakın kalır, mekan hissi belli belirsiz" },
  { max: 1.0, word: "orta yankı", detail: "dengeli bir mekan hissi, ne çok kuru ne çok ıslak" },
  { max: 2.0, word: "belirgin/geniş yankı", detail: "ses geriye/derine çekilir, mekan net hissedilir" },
  { max: Infinity, word: "çok uzun/derin yankı", detail: "ses neredeyse mekanın içinde kayboluyor, kuyruk uzun sürüyor" }
];

function amountTier(score) {
  return REVERB_AMOUNT_TIERS.find(t => score < t.max) || REVERB_AMOUNT_TIERS[REVERB_AMOUNT_TIERS.length - 1];
}

export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);
  const odd = question.variants[question.oddIndex];
  const same = question.variants.find((v, i) => i !== question.oddIndex);
  const oddTypeInfo = REVERB_TYPES[odd.type];
  const sameTypeInfo = REVERB_TYPES[same.type];

  let base;
  if (odd.type !== same.type) {
    // TİP farkı (pro/proplus katmanı) — SoundGym'in eksik bıraktığı kısım:
    // TÜR açıkça adıyla söyleniyor, ikisinin mix anlamı KARŞILAŞTIRMALI.
    base = `${odd.letter} farklıydı — ${oddTypeInfo.label} reverb (decay ${odd.decaySec.toFixed(1)}s) — ${oddTypeInfo.mixMeaning}. Diğerleri ${sameTypeInfo.label} — ${sameTypeInfo.mixMeaning}.`;
  } else {
    const oddTier = amountTier(odd.amountScore);
    const sameTier = amountTier(same.amountScore);
    if (oddTier === sameTier) {
      const heavier = odd.amountScore > same.amountScore;
      const yonMetni = heavier ? "daha uzun/derin" : "daha kısa/yakın";
      base = `İkisi de ${oddTypeInfo.label} (${sameTier.word}) sesti, ${odd.letter} ${yonMetni} (decay ${odd.decaySec.toFixed(1)}s) — ${heavier ? "mixte daha geride durur" : "biraz daha öne/kuruya yakın kalır"}.`;
    } else {
      base = `${odd.letter} farklıydı (${oddTypeInfo.label}, decay ${odd.decaySec.toFixed(1)}s) — ${amountTier(odd.amountScore).detail}. Diğerleri decay ${same.decaySec.toFixed(1)}s'lik ${amountTier(same.amountScore).word} bir ${sameTypeInfo.label}'daydı.`;
    }
  }

  if (result.correct) return `Doğru! ${base}`;
  return `Yanlış — sen ${result.guessLetter} dedin. ${base}`;
}

export function getFeedbackData(question, answer, context = {}) {
  const result = evaluateAnswer(question, answer);
  const gained = context.gained || 0;
  const text = teachingText(question, answer);

  if (result.correct) {
    return { result, title: "Doğru!", detail: `${text} (+${gained} XP)`, showResult: true, panel: null };
  }
  return { result, title: "Yanlış ses", detail: text, showResult: true, panel: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// SÖZLEŞMENİN DIŞINDA: bu moda özgü render/UI yardımcıları.
// ═══════════════════════════════════════════════════════════════════════════

// İpucu — HANGİ harf olduğunu ASLA vermez, sadece YÖNÜ/karakteri söyler
// (Kompresör'ün/Q Genişliği'nin AYNI kısmi-yardım ilkesi).
export function getHintText(question) {
  const odd = question.variants[question.oddIndex];
  const same = question.variants.find((v, i) => i !== question.oddIndex);
  if (odd.type !== same.type) return `Farklı olan BAŞKA bir tip reverb (${REVERB_TYPES[same.type].label} değil)`;
  return odd.amountScore > same.amountScore ? "Farklı olan DAHA UZUN/derin yankılı" : "Farklı olan DAHA KISA/yakın yankılı";
}

export function renderHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}
export function clearHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}

// Dinleme kontrolü #freqGuessArea'da DEĞİL — Kompresör'ün AYNI deseni,
// app.js'in mevcut A/B butonu (#abToggle) bu mod aktifken 3-yönlü döngüye
// genişletiliyor.
export function renderGuessAreaControls(freqGuessAreaEl) {
  if (!freqGuessAreaEl) return;
  freqGuessAreaEl.textContent = "";
  freqGuessAreaEl.classList.add("hidden");
}

// G41: büyük kart görseli (harf+isim+waveform+durum) — core/three-way-cards.js'e
// delege edilir (Kompresör'le PAYLAŞILAN, gerçek bir mod-özel fark YOK). Mod
// sözleşmesi bu isimlerle export edilmesini istiyor, gövde ORTAK modülde.
export const renderAnswerChoices = renderThreeWayCards;
export const markAnswerChoices = markThreeWayCards;
export const updateAnswerPlayState = updateThreeWayCardsPlayState;

// ═══════════════════════════════════════════════════════════════════════════
// GÖRSEL — diğer modların frekans-yanıtı eğrisinin AKSİNE reverb'in frekans
// ekseni YOK — burada gösterilen "KUYRUK ZARFI" (basit bir genlik-zaman
// temsili): SOLDAN SAĞA sönen bir zarf — kısa/hızlı sönen = kuru/Room, uzun/
// yavaş sönen = ıslak/Hall. Kompresör'ün SİMETRİK (ortadan başlayan) zarfının
// AKSİNE burada zarf SOLDAN başlayıp sağa doğru sönüyor — "kuyruk" kavramını
// (zamanla azalan enerji) daha doğru temsil ediyor. Gerçek bir ses ANALİZİ
// DEĞİL — sentetik, SADECE decaySec'ten türetilen İLLÜSTRATİF bir eğri.
// RENK: senin cevabın KIRMIZI, doğru YEŞİL (G34 standardı, core/feedback-
// colors.js'ten import).
// ═══════════════════════════════════════════════════════════════════════════

const ENV_POINTS = 200;
const MAX_PLAUSIBLE_DECAY_SEC = 3.5; // Hall'ın en uzunu (~3.2s) — görsel ölçekleme İÇİN
function computeTailY(decaySec, w, h) {
  const plotBottom = h - AXIS_H;
  const curveTop = CURVE_TOP, curveBottom = plotBottom - 6;
  const midY = (curveTop + curveBottom) / 2;
  const bandH = (curveBottom - curveTop) * 0.42;
  const normDecay = Math.min(1, decaySec / MAX_PLAUSIBLE_DECAY_SEC);
  // Kısa decay (normDecay~0) → BÜYÜK sönüm oranı (hızlı biter), uzun decay
  // (normDecay~1) → KÜÇÜK sönüm oranı (kuyruk ekranın sonuna kadar sürer).
  const decayRate = 8 - normDecay * 6.5;
  const ys = new Float32Array(ENV_POINTS + 1);
  for (let i = 0; i <= ENV_POINTS; i++) {
    const t = i / ENV_POINTS;
    const envelope = Math.exp(-decayRate * t); // SOLDAN SAĞA sönen zarf
    const ripple = Math.sin(t * Math.PI * 60);
    ys[i] = midY - bandH * envelope * ripple;
  }
  return ys;
}

function drawTail(ctx2d, w, ys, color, alpha) {
  ctx2d.save();
  ctx2d.beginPath();
  for (let i = 0; i <= ENV_POINTS; i++) {
    const x = (i / ENV_POINTS) * w;
    if (i === 0) ctx2d.moveTo(x, ys[i]); else ctx2d.lineTo(x, ys[i]);
  }
  ctx2d.strokeStyle = color;
  ctx2d.lineWidth = 2;
  ctx2d.globalAlpha = alpha;
  ctx2d.lineJoin = "round";
  ctx2d.stroke();
  ctx2d.restore();
}

function drawTailLegend(ctx2d, showGuess) {
  const y = 22;
  let x = 10;
  ctx2d.font = "700 12px Inter, sans-serif";
  ctx2d.textAlign = "left";
  if (showGuess) {
    ctx2d.fillStyle = GUESS_COLOR;
    ctx2d.fillText("●", x, y);
    x += 12;
    ctx2d.fillStyle = "#C7CEDD";
    ctx2d.fillText("Senin cevabın", x, y);
    x += ctx2d.measureText("Senin cevabın").width + 16;
  }
  ctx2d.fillStyle = CORRECT_COLOR;
  ctx2d.fillText("●", x, y);
  x += 12;
  ctx2d.fillStyle = "#C7CEDD";
  ctx2d.fillText("Doğru", x, y);
}

// Soru sırasında (roundActive) zarf BİLEREK gizli — kulakla bulma ilkesi.
// state: { activeQuestion, roundActive, guessLetter } — guessLetter app.js'in
// (Kompresör'le PAYLAŞILAN, mode-agnostik) submitThreeWayGuess'te sakladığı
// harf.
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  const { activeQuestion: q, roundActive, guessLetter } = state;
  if (!q || roundActive) return;

  const correctVariant = q.variants[q.oddIndex];
  const guessVariant = guessLetter ? q.variants.find(v => v.letter === guessLetter) : null;

  const correctYs = computeTailY(correctVariant.decaySec, w, h);
  const guessYs = guessVariant ? computeTailY(guessVariant.decaySec, w, h) : null;

  if (guessYs) drawTail(ctx2d, w, guessYs, GUESS_COLOR, 0.85);
  drawTail(ctx2d, w, correctYs, CORRECT_COLOR, 0.85);

  drawTailLegend(ctx2d, !!guessYs);
}

// ═══════════════════════════════════════════════════════════════════════════
// SENTETİK IMPULSE RESPONSE (IR) ÜRETİMİ — hazır dosya YOK. Algoritmik:
//   1. preDelaySamples kadar SESSİZLİK (kuru/ıslak arası boşluk — mekan
//      büyüdükçe/tipe göre uzuyor).
//   2. Ardından üstel sönümlü (RT60 formülü: -60dB'ye decaySec'te iner) beyaz
//      gürültü — GERÇEK bir difüz reverb kuyruğunun temel yapısı budur (rastgele
//      yansımaların üst üste binmesi istatistiksel olarak beyaz gürültüye
//      yakınsar, klasik "sentetik reverb" tekniği).
//   3. size'a bağlı bir "yoğunluk" çarpanı — büyük mekanlarda erken yansımalar
//      daha SIK/yoğun (basit bir yaklaşıklık, GERÇEK erken-yansıma modellemesi
//      DEĞİL).
//   4. Tek-kutuplu (one-pole) IIR alçak geçiren filtre — TİPİN brightness'ına
//      göre kuyruğun tizliğini kısar (Plate=az filtre/parlak, Hall=çok
//      filtre/donuk, Room=orta).
// ═══════════════════════════════════════════════════════════════════════════

function applyOnePoleLowpass(data, brightness) {
  const alpha = 0.15 + brightness * 0.75; // 0.15 (çok donuk) .. 0.90 (çok parlak)
  let prev = 0;
  for (let i = 0; i < data.length; i++) {
    prev = prev + alpha * (data[i] - prev);
    data[i] = prev;
  }
}

export function generateImpulseResponse(audioCtx, variant) {
  const sampleRate = audioCtx.sampleRate;
  const preDelaySamples = Math.max(0, Math.floor(variant.preDelaySec * sampleRate));
  const tailSamples = Math.max(1, Math.floor(variant.decaySec * sampleRate));
  const length = preDelaySamples + tailSamples;
  const impulse = audioCtx.createBuffer(2, length, sampleRate);
  const RT60_DECAY_CONST = Math.log(10 ** (-60 / 20)); // ~-6.908 — decaySec sonunda -60dB'ye iner
  const density = 0.6 + variant.sizeNorm * 0.4;

  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < preDelaySamples; i++) data[i] = 0;
    for (let i = 0; i < tailSamples; i++) {
      const t = i / tailSamples;
      const envelope = Math.exp(RT60_DECAY_CONST * t);
      data[preDelaySamples + i] = (Math.random() * 2 - 1) * envelope * density;
    }
    applyOnePoleLowpass(data, variant.brightness);
  }
  return impulse;
}

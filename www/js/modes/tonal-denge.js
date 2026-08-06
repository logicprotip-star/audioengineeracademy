// "Tonal Denge" — Motor 2'nin ÜÇÜNCÜ modu (Kompresör/Reverb şablonundan
// TÜRETİLDİ, bkz. kompresor.js dosya başındaki "MOTOR 2 ŞABLONU" notu).
// AYNI oyun tipi: 3 ses (A/B/C), AYNI kaynak, İKİSİ NÖTR (dengeli), biri
// DENGESİZ (spektral tilt uygulanmış) — kullanıcı dengesiz olanı üç şıktan
// (%33 şans) bulur.
//
// KOMPRESÖR/REVERB'DEN FARKLI, TONAL DENGE'YE ÖZGÜ BİR KATMAN: "aynı" ikili
// Kompresör'de COMP_BASE_K=0.5 (hafif kompresyonlu), Reverb'de her zaman BİR
// reverb tipi uygulanmış — burada ise "aynı" ikili TAMAMEN NÖTR (k=0, hiçbir
// filtre etkisi yok). Gerçek mixte bozuk tonal denge İSTİSNA, dengeli mix
// KURALDIR — bu yüzden referans iki ses "temiz", tek ses "bozuk" (task'ın
// açık kararı). Bu, oddK'nin bir BAZ değerden İKİ yöne uzaklaşması yerine
// (Kompresör'ün pickOddK'sı) DOĞRUDAN kGap kadar (0'dan) uzaklaşması demek —
// clamp'e hiç gerek yok, negatif/pozitif taşma riski YOK (aşağıdaki
// pickKGap'in [FLOOR,1] clamp'i sadece jitter'ın 1'i AŞMASINA karşı savunma).
//
// KOMPRESÖR ŞABLONUNDAN MİRAS ALINANLAR:
//   1. TEK ALGISAL EKSEN — düşük/orta/tiz kazançların HEPSİ k'den TÜRER
//      (buildVariant), "imbalanceScore" (en büyük mutlak sapma, dB) TEK bir
//      "ne kadar dengesiz" ekseni (Kompresör'ün gainReductionDb'siyle AYNI rol).
//   2. previewLetter — applyProcessing HANGİ harfin parametrelerini
//      okuyacağını previewLetter'dan öğrenir.
//   3. Öğretim şablonları TEK yerde (SHAPE_INFO).
//   4. Merkezi zorluk eğrisi (TONAL_CURVE_CONFIG + logLerp + applyPostCapFloor,
//      "kolaylaşma yok" invaryantı, node ile doğrulandı — bkz. TONAL_CURVE_CONFIG
//      üstündeki not) — AYNI kalıp.
//
// REVERB'DEN MİRAS ALINAN KADEMELİ KATMAN: kolay/orta/zor AYNI "şekil ailesi"
// içinde (tilt) miktar farkı; PRO (ve proplus)'ta %50 ihtimalle YA çok ince
// bir tilt YA DA "şekil değişimi" — iki-bölgeli karmaşık bozukluk (smile/
// frown, bkz. TONAL_COMPLEX_SHAPE_POSITION_THRESHOLD) — Reverb'in TİP
// değişiminin (Room/Hall/Plate) AYNI "öğretmen yöntemi" felsefesi, burada
// "şekil" (tilt/smile/frown) ekseninde.
//
// TILT UYGULAMASI: low-shelf (250 Hz) + high-shelf (4000 Hz) BİRLİKTE, ZIT
// yönde hareket eder (gerçek bir "mastering tilt EQ"nun AYNI tekniği — TEK
// bant değil, GENİŞ bir eğim). smile/frown'da ARAYA bir orta-bant peaking
// (1000 Hz) eklenir (bkz. buildVariant) — bas+tiz aynı yöne, orta ZIT yöne.
//
// KAYNAK: tilt SADECE dolu spektrumda (çok sayıda eş zamanlı frekans
// bileşeni) duyulur — tek nota bir bas/gitar/vokal ya da tek bir davul
// vuruşu tonal dengeyi GÖSTERMEZ (görece "boş" bir spektrumda "eğim" diye bir
// şey algılanamaz). Kataloğumuzda BUNU karşılayan TEK örnek "groove" (90 BPM
// davul döngüsü — kick+snare+hihat AYNI ANDA, gerçek bir "mix bağlamı").
// Diğer tüm örnekler (bas/gitar/vokal TEK nota/tek fraz, kick/snare/hihat/tom
// TEK vuruş, sentetik/gürültü TEST tonu) BİLİNÇLİ dışlandı — bkz. getMeta.
// KULAKLA DOĞRULANMADI — diğer yedi modun AYNI dürüstlük notu.

import { compatibleSourceIds } from "../core/source-catalog.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound } from "./frekans-bulma.js";
import { logLerp, applyPostCapFloor } from "../core/difficulty-curve.js";
import { GUESS_COLOR, CORRECT_COLOR } from "../core/feedback-colors.js";
import { renderThreeWayCards, markThreeWayCards, updateThreeWayCardsPlayState } from "../core/three-way-cards.js";

// app.js'in GENEL görselleştiricisi (drawVisualizer/drawSpectrumBars) BU sabitleri
// HER moddan mode-agnostik olarak okur — diğer yedi modla AYNI re-export deseni.
// Tonal Denge'nin AKSİNE Kompresör/Reverb'in tersine burada frekans ekseni
// GERÇEKTEN kullanılıyor (bkz. drawOverlay) — tilt bir frekans-yanıtı eğrisi.
export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound };

export const MODE_ID = "tonal-denge";
export const MAX_LIVES = 5;
// Motor 2'nin ("A/B/C odd-one-out") HANGİ modları kapsadığını app.js TEK
// yerde (THREE_WAY_MODE_IDS) tutuyor — bu bayrak SADECE dokümantasyon/
// kendi-kendini-açıklama amaçlı, app.js kendi listesini kullanıyor.
export const THREE_WAY = true;

// ═══════════════════════════════════════════════════════════════════════════
// TİLT PARAMETRELERİ — k ∈ [0,1] "dengesizlik miktarı" (Kompresör'ün k'sının
// AYNI rolü, ama BAZ=0 — bkz. dosya başı not). SHAPE_IDS dört "aile":
//   tilt-bass    — bas↑ tiz↓ (low-shelf +, high-shelf -)
//   tilt-treble  — tiz↑ bas↓ (low-shelf -, high-shelf +)
//   smile        — bas+tiz↑ orta↓ (iki bölgeli, PRO katmanı)
//   frown        — bas+tiz↓ orta↑ ("ters smile", PRO katmanı)
// KULAKLA DOĞRULANMADI — diğer yedi modun AYNI dürüstlük notu.
// ═══════════════════════════════════════════════════════════════════════════
export const SHAPE_IDS = ["tilt-bass", "tilt-treble", "smile", "frown"];
export const TILT_MAX_DB = 10; // k=1'de her bandın (low/mid/high) ULAŞABİLECEĞİ azami kazanç/kesinti
export const SHELF_LOW_FREQ = 250; // Hz — bas/orta sınırı (low-shelf)
export const SHELF_HIGH_FREQ = 4000; // Hz — orta/tiz sınırı (high-shelf)
export const MID_PEAK_FREQ = 1000; // Hz — smile/frown'un orta-bant peaking'i
export const MID_PEAK_Q = 0.7; // geniş bir tümsek/çukur (dar bir tek-bant EQ DEĞİL)

// SAF FONKSİYON. shape="flat" (k=0 ya da hiç fark etmez) TÜM kazançları 0
// döndürür — "nötr/dengeli" referans ikili BUNU kullanır. imbalanceScore =
// en büyük mutlak banda-kazancı (Kompresör'ün gainReductionDb'sinin AYNI
// rolü) — HER şekil ailesinde bantlar EŞİT büyüklükte hareket ettiği için
// (bkz. aşağıdaki dallar) bu skor şekilden BAĞIMSIZ, TEK bir "ne kadar
// dengesiz" ekseni.
export function buildVariant(letter, shape, k) {
  let lowGainDb = 0, midGainDb = 0, highGainDb = 0;
  if (shape === "tilt-bass") {
    lowGainDb = k * TILT_MAX_DB;
    highGainDb = -k * TILT_MAX_DB;
  } else if (shape === "tilt-treble") {
    lowGainDb = -k * TILT_MAX_DB;
    highGainDb = k * TILT_MAX_DB;
  } else if (shape === "smile") {
    lowGainDb = k * TILT_MAX_DB;
    highGainDb = k * TILT_MAX_DB;
    midGainDb = -k * TILT_MAX_DB;
  } else if (shape === "frown") {
    lowGainDb = -k * TILT_MAX_DB;
    highGainDb = -k * TILT_MAX_DB;
    midGainDb = k * TILT_MAX_DB;
  }
  const imbalanceScore = Math.max(Math.abs(lowGainDb), Math.abs(midGainDb), Math.abs(highGainDb));
  return { letter, shape, k, lowGainDb, midGainDb, highGainDb, imbalanceScore };
}

// ═══════════════════════════════════════════════════════════════════════════
// STATİK DIFFICULTY — diğer yedi modla AYNI ikili rol: (a) settings.
// difficultyPosition verilmezse fallback, (b) "Sabit" modun tier-adı çapası,
// (c) proplus için tek kaynak. `options` HER ZAMAN 3 (A/B/C).
// kGap: dengesiz olanın k'sinin 0'dan (NÖTR baz) ne kadar UZAKTA olacağı —
// küçük=zor (tilt neredeyse fark edilmez). Kolay = EKSTREM (k'ye yakın 1,
// bariz eğim), zorlukla ince nüansa iniyor (öğretmen yöntemi, Kompresör/
// Reverb'in AYNI dersi).
//
// KULAKLA DOĞRULANMADI — diğer yedi modun AYNI dürüstlük notu.
export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 16, options: 3, time: 18, lives: MAX_LIVES, kGap: 0.95 },
  medium: { label: "Orta", xp: 24, options: 3, time: 15, lives: MAX_LIVES, kGap: 0.55 },
  hard: { label: "Zor", xp: 34, options: 3, time: 13, lives: MAX_LIVES, kGap: 0.28 },
  pro: { label: "Pro", xp: 50, options: 3, time: 10, lives: MAX_LIVES, kGap: 0.12 },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 50, options: 3, time: 10, lives: MAX_LIVES, kGap: 0.12 }
};

// ═══════════════════════════════════════════════════════════════════════════
// ZORLUK EĞRİSİ — Kompresör/Reverb'in BAŞTAN-doğru-kalibrasyon yöntemiyle
// bağlı. AT_1 statik easy değeriyle birebir aynı. AT_CAP + FLOOR node ile
// DOĞRUDAN hesaplanıp İKİ koşulu birlikte sağlayacak şekilde ÖNCEDEN çözüldü:
//   (1) representativeLevelForTier'ın HİÇBİR temsilci seviyesinde eski
//       statik tablodan kolay çıkmıyor ("kolaylaşma yok" — bkz. test):
//       kGap → easy(4)=0.6658≤0.95, medium(8)=0.4145≤0.55, hard(12)=0.2580≤0.28,
//       pro(20)=0.1000≤0.12; timeSec → easy(4)=16.272≤18, medium(8)=14.224≤15,
//       hard(12)=12.433≤13, pro(20)=9.500≤10 (hepsi rahat bir marjla).
//   (2) K_GAP_FLOOR'da (0.085) bile imbalanceScore = 0.085*10 = 0.85dB —
//       sıfıra/algılanamaz bir farka ASLA inmiyor (kulağın ayırt edebileceği
//       varsayılan bir alt sınır — KULAKLA DOĞRULANMADI).
export const TONAL_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  K_GAP_AT_1: 0.95,
  K_GAP_AT_CAP: 0.10,
  K_GAP_FLOOR: 0.085,
  K_GAP_REDUCTION_PER_STEP: 0.001,

  TIME_SEC_AT_1: 18,
  TIME_SEC_AT_CAP: 9.5,
  TIME_SEC_FLOOR: 6.5,
  TIME_SEC_REDUCTION_PER_STEP: 0.15
};

// position >= bu eşikte odd varyant %50 ihtimalle "şekil" değiştirir (tilt
// YERİNE smile/frown) — Reverb'in TYPE_SWAP_POSITION_THRESHOLD'unun (18)
// AYNI değeri/AYNI ayrım mantığı: representativeLevelForTier("pro")=
// LEVEL_CAP=20 bunun BELİRGİN üstünde, ("hard")=12 BELİRGİN altında.
export const TONAL_COMPLEX_SHAPE_POSITION_THRESHOLD = 18;

// SAF FONKSİYON. position: zorlukKonumu — diğer yedi modun
// paramsForDifficultyPosition'ıyla AYNI mod-agnostik girdi.
export function paramsForDifficultyPosition(position, config = TONAL_CURVE_CONFIG) {
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

// SAF FONKSİYON. Kompresör'ün pickKGap'iyle AYNI desen (±%6 dar jitter +
// jitter SONRASI FLOOR garantisi) + ÜST clamp (1) — burada BAZ=0 olduğu için
// (Kompresör'ün BAZ=0.5 + iki-yönlü clamp'inin AKSİNE) SADECE üst sınır
// riski var: K_GAP_AT_1=0.95 * 1.06 jitter ÜST ucu ~1.007, [0,1] dışına
// taşabilir — bu satır olmadan k=1'i aşan bir kazanç (TILT_MAX_DB'nin
// ÜSTÜNE çıkan bir dB) üretilebilirdi.
export function pickKGap(baseKGap, rng = Math.random) {
  const jitter = 0.94 + rng() * 0.12; // 0.94x – 1.06x
  const jittered = baseKGap * jitter;
  return Math.min(1, Math.max(TONAL_CURVE_CONFIG.K_GAP_FLOOR, jittered));
}

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    motor: 2,
    // task kararı: ince tonal fark (özellikle "zor"/"pro" katmanında bas/tiz
    // hangisi ağır belirsizleşiyor) telefon hoparlöründe kolayca kaybolur —
    // kulaklık ayrımı netleştirir (Reverb'in AYNI gerekçesi).
    kulaklikGerekli: true,
    // Tilt SADECE dolu spektrumda duyulur (bkz. dosya başı not) — kataloğumuzda
    // bunu karşılayan TEK örnek "groove" (kick+snare+hihat aynı anda, gerçek
    // bir mix bağlamı); tek-vuruş (kick/snare/hihat/tom) ve izole tek-nota/
    // tek-fraz kaynaklar (bas/gitar/vokal) ile sentetik/gürültü (test tonu,
    // "mix" değil) BİLİNÇLİ dışlandı. Kullanıcının kendi dosyası (upload)
    // içeriği bilinmediği için varsayılan olarak açık kalıyor (diğer Motor 2
    // modlarıyla AYNI karar, bkz. reverb.js G43 notu).
    uyumluKaynaklar: compatibleSourceIds({ only: ["groove", "upload"] }),
    // NOT (Kompresör/Reverb'le AYNI karar): mode-catalog.js'te tier:"pro" —
    // ama bu alan GERÇEK kilitlemede KULLANILMIYOR (asıl kaynak
    // mode-catalog.js'in `tier` alanı), mevcut yedi modun HEPSİYLE tutarlı
    // kalmak için true.
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY,
    choiceOnly: true
  };
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz. settings: { source, boss,
// difficultyPosition — verilirse kGap/timeSec EĞRİDEN gelir, verilmezse
// (mevcut testler, doğrudan çağrılar, proplus) statik DIFFICULTY[level]
// davranışı korunur }. Varsayılan kaynak "groove" (Kompresör/Reverb'in "pink"
// varsayılanının AKSİNE) — BİLİNÇLİ fark: pink/white bu modun uyumluKaynaklar
// listesinde HİÇ yok (tek-vuruş/tek-nota kısıtlamasından FARKLI bir gerekçeyle,
// bkz. dosya başı "KAYNAK" notu), "pink" varsayılanı burada anlamsız/yanıltıcı
// olurdu — "groove" listenin GERÇEK bir üyesi, tutarlı bir varsayılan.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "groove";

  const curve = (level !== "proplus" && Number.isFinite(settings.difficultyPosition))
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  const baseKGap = curve ? curve.kGap : diff.kGap;
  const timeSec = curve ? curve.timeSec : diff.time;

  // PRO/PRO PLUS (Sabit) YA DA eğri-konumu eşiği aştıysa (Otomatik) → %50
  // ihtimalle "şekil değişimi" katmanı (Reverb'in TİP değişimi katmanının
  // AYNI öğretmen-yöntemi felsefesi, burada "VEYA" — task'ın istediği gibi
  // rastgele ince-tilt/karmaşık-şekil arası).
  const isComplexShapeTier = level === "pro" || level === "proplus" || !!(curve && curve.position >= TONAL_COMPLEX_SHAPE_POSITION_THRESHOLD);

  const oddIndex = Math.floor(Math.random() * 3);
  const kGap = pickKGap(baseKGap);
  const useComplexShape = isComplexShapeTier && Math.random() < 0.5;
  const oddShape = useComplexShape
    ? (Math.random() < 0.5 ? "smile" : "frown")
    : (Math.random() < 0.5 ? "tilt-bass" : "tilt-treble");

  const letters = ["A", "B", "C"];
  const variants = letters.map((letter, i) =>
    i === oddIndex ? buildVariant(letter, oddShape, kGap) : buildVariant(letter, "flat", 0)
  );
  const choices = letters.map((letter, i) => ({ id: letter, tr: letter, correct: i === oddIndex }));

  return {
    mode: "tonal-denge",
    difficulty: level,
    source,
    variants,
    oddIndex,
    complexShapeTier: isComplexShapeTier,
    kGap,
    hintUsed: false,
    boss,
    timeSec,
    choices
  };
}

export function modeDescription() {
  return "A/B/C ile üçünü de dinle, tonal dengesi BOZUK olanı (bas/tiz eğimi kaymış) şıklardan seç.";
}

export function correctLabel(question) {
  const odd = question.variants[question.oddIndex];
  return `${odd.letter} (${SHAPE_INFO[odd.shape].label}, ${odd.imbalanceScore.toFixed(1)}dB)`;
}

// Soruda uygulanan tilt'i audioCtx üzerinde kurar. question.previewLetter
// VERİLİRSE (app.js'in 3-yönlü abToggle'ının o an dinletmek istediği harf) O
// harfin TÜM parametreleri (low/mid/high kazançları) question.variants'tan
// okunur; verilmezse variants[0] (harf A) çalar — Kompresör/Reverb'in BİREBİR
// AYNI previewLetter deseni.
//
// ÜÇ BiquadFilterNode SERİ bağlanır (audio-engine.js'in genel "sourceMix→
// filters[0]→filters[1]→...→localWetGain" seri-bağlama sözleşmesi
// DEĞİŞTİRİLMEDEN): low-shelf → mid-peaking → high-shelf. "flat" varyantta
// (nötr referans) üçünün de gain'i 0 — filtreler KURULUR ama SESSİZCE
// etkisiz kalır (Kompresör'ün "limiter'da bile mikro-dinamik var" dürüstlük
// dersiyle AYNI çizgide: hiçbir zorlukta/varyantta "filtre yok" durumuna
// düşülmez, her zaman AYNI üç node'lu zincir kurulur — sadece parametreleri
// nötr).
export function applyProcessing(question, { audioCtx }) {
  const letter = question.previewLetter || question.variants[0].letter;
  const variant = question.variants.find(v => v.letter === letter) || question.variants[0];

  const low = audioCtx.createBiquadFilter();
  low.type = "lowshelf";
  low.frequency.value = SHELF_LOW_FREQ;
  low.gain.value = variant.lowGainDb;

  const mid = audioCtx.createBiquadFilter();
  mid.type = "peaking";
  mid.frequency.value = MID_PEAK_FREQ;
  mid.Q.value = MID_PEAK_Q;
  mid.gain.value = variant.midGainDb;

  const high = audioCtx.createBiquadFilter();
  high.type = "highshelf";
  high.frequency.value = SHELF_HIGH_FREQ;
  high.gain.value = variant.highGainDb;

  return { filters: [low, mid, high] };
}

// SAF FONKSİYON. answer: harf ("A"/"B"/"C") ya da {id}.
export function evaluateAnswer(question, answer) {
  const guessLetter = answer && typeof answer === "object" ? answer.id : answer;
  const correctLetter = question.variants[question.oddIndex].letter;
  const correct = guessLetter === correctLetter;
  return { mode: "tonal-denge", correct, guessLetter, correctLetter };
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
// ÖĞRETİCİ METİN — soru SADE, geri bildirim ZENGİN: hangi mix bozuktu + nasıl
// (yön/şekil + gerçek dB'ler) + mix anlamı TEK yerde, HER zaman gösterilir.
// MOTOR 2 ŞABLONU: şekil tablosu (SHAPE_INFO) TEK yerde — Kompresör'ün
// COMPRESSION_TIERS'ıyla/Reverb'in REVERB_TYPES'ıyla AYNI desen.
// ═══════════════════════════════════════════════════════════════════════════

const SHAPE_INFO = {
  "tilt-bass": {
    label: "bas-ağır eğim",
    mixMeaning: "mix boğuk/çamurlu duyulur, tizler geride kalır"
  },
  "tilt-treble": {
    label: "tiz-ağır eğim",
    mixMeaning: "mix sert/ince duyulur, bas zayıf/cılız kalır"
  },
  smile: {
    label: "smile eğrisi (bas ve tiz şişkin, orta çukur)",
    mixMeaning: "kulağa 'havalı' gelir ama mixte orta kaybolur, karar bulanıklaşır"
  },
  frown: {
    label: "ters smile / çukur eğrisi (orta şişkin, bas ve tiz zayıf)",
    mixMeaning: "mix donuk/telefon hoparlörü gibi duyulur, öne çıkmaz"
  }
};

function fmtDb(db) {
  return `${db >= 0 ? "+" : ""}${db.toFixed(1)}dB`;
}

// SAF FONKSİYON. "aynı" ikili HER ZAMAN flat (k=0) olduğu için Kompresör/
// Reverb'in "ikisi de aynı kademede mi" nüans dalına GEREK YOK (o dal, İKİ
// varyantın da nötr-olmayan bir baz paylaşmasından doğuyordu) — burada
// karşılaştırma HER ZAMAN "flat vs dengesiz", tek bir dil yeterli.
export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);
  const odd = question.variants[question.oddIndex];
  const info = SHAPE_INFO[odd.shape];
  const isComplex = odd.shape === "smile" || odd.shape === "frown";

  const base = isComplex
    ? `${odd.letter} dengesizdi — ${info.label} (bas ${fmtDb(odd.lowGainDb)}, orta ${fmtDb(odd.midGainDb)}, tiz ${fmtDb(odd.highGainDb)}) — ${info.mixMeaning}.`
    : `${odd.letter} dengesizdi — ${info.label} (düşük bölge ${fmtDb(odd.lowGainDb)}, tiz ${fmtDb(odd.highGainDb)}) — ${info.mixMeaning}. Dengeli mixte bas ve tiz orantılı, gerçek mixte referans şarkıyla tonal dengeyi böyle karşılaştırırsın.`;

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

// İpucu — HANGİ harf olduğunu ASLA vermez, sadece ŞEKLİ söyler (Kompresör'ün/
// Reverb'in AYNI kısmi-yardım ilkesi).
export function getHintText(question) {
  const odd = question.variants[question.oddIndex];
  if (odd.shape === "tilt-bass") return "Farklı olan BAS ağır (tiz zayıf kalıyor)";
  if (odd.shape === "tilt-treble") return "Farklı olan TİZ ağır (bas zayıf kalıyor)";
  if (odd.shape === "smile") return "Farklı olanda ORTA çukur (bas ve tiz şişkin)";
  return "Farklı olanda ORTA şişkin (bas ve tiz zayıf)"; // frown
}

export function renderHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}
export function clearHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}

// Dinleme kontrolü #freqGuessArea'da DEĞİL — Kompresör/Reverb'in AYNI deseni,
// app.js'in mevcut A/B butonu (#abToggle) bu mod aktifken 3-yönlü döngüye
// genişletiliyor.
export function renderGuessAreaControls(freqGuessAreaEl) {
  if (!freqGuessAreaEl) return;
  freqGuessAreaEl.textContent = "";
  freqGuessAreaEl.classList.add("hidden");
}

// G41'in ortak modülü — büyük kart görseli (harf+isim+waveform+durum).
// Kompresör/Reverb'le PAYLAŞILAN, gerçek bir mod-özel fark YOK (bkz. o
// dosyanın dosya başı notu: "Üçüncü bir Motor 2 modu SADECE bu modülü import
// edip re-export etmesi yeter" — tam olarak bu).
export const renderAnswerChoices = renderThreeWayCards;
export const markAnswerChoices = markThreeWayCards;
export const updateAnswerPlayState = updateThreeWayCardsPlayState;

// ═══════════════════════════════════════════════════════════════════════════
// GÖRSEL — Kompresör'ün (zaman-genlik zarfı) / Reverb'in (kuyruk zarfı)
// AKSİNE burada GERÇEK bir frekans-yanıtı eğrisi çiziliyor (Boost/Cut'ın
// computeEqCurveDb'siyle AYNI teknik: GERÇEK BiquadFilterNode +
// getFrequencyResponse, elle yaklaşıklık DEĞİL) — çünkü "tilt" ZATEN bir
// frekans ekseni kavramı (Kompresör'ün zaman ekseni/Reverb'in decay
// ekseninin AKSİNE). Üç filtrenin (low/mid/high) etkisi KASKAT birleştirilir:
// cascaded filtrelerin genlikleri ÇARPILIR → dB'leri TOPLANIR (20*log10
// çarpımsal → toplamsal dönüşüm, standart DSP). RENK: senin cevabın KIRMIZI,
// doğru YEŞİL (G34 standardı, core/feedback-colors.js'ten import).
// ═══════════════════════════════════════════════════════════════════════════

const CURVE_POINTS = 160;
const CURVE_STAGES = [
  { type: "lowshelf", frequency: SHELF_LOW_FREQ, field: "lowGainDb" },
  { type: "peaking", frequency: MID_PEAK_FREQ, q: MID_PEAK_Q, field: "midGainDb" },
  { type: "highshelf", frequency: SHELF_HIGH_FREQ, field: "highGainDb" }
];

function computeTiltCurveDb(audioCtx, variant, w) {
  if (!audioCtx) return null;
  const freqs = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) freqs[i] = faXToF((i / (CURVE_POINTS - 1)) * w, w);
  const totalDb = new Float32Array(CURVE_POINTS);
  CURVE_STAGES.forEach(stage => {
    const filter = audioCtx.createBiquadFilter();
    filter.type = stage.type;
    filter.frequency.value = stage.frequency;
    if (stage.q) filter.Q.value = stage.q;
    filter.gain.value = variant[stage.field];
    const mag = new Float32Array(CURVE_POINTS);
    const phase = new Float32Array(CURVE_POINTS);
    filter.getFrequencyResponse(freqs, mag, phase);
    for (let i = 0; i < CURVE_POINTS; i++) totalDb[i] += 20 * Math.log10(Math.max(mag[i], 1e-6));
  });
  return totalDb;
}

const AXIS_TICKS = [100, 200, 400, 800, 1600, 3200, 6400, 12800];
function drawAxis(ctx2d, w, h) {
  const plotBottom = h - AXIS_H;
  ctx2d.font = "600 14px Inter, sans-serif";
  ctx2d.textAlign = "center";
  AXIS_TICKS.forEach(f => {
    const x = faFToX(f, w);
    ctx2d.strokeStyle = "rgba(255,255,255,.08)";
    ctx2d.beginPath(); ctx2d.moveTo(x, 6); ctx2d.lineTo(x, plotBottom); ctx2d.stroke();
    const label = f >= 1000 ? (f / 1000) + "k" : String(f);
    ctx2d.fillStyle = "#8C95AB";
    ctx2d.fillText(label, x, h - 12);
  });
  ctx2d.textAlign = "left";
}

// Boost/Cut'ın drawBellCurve'üyle AYNI ±maxAbsDb/merkez-çizgi eşlemesi —
// MAX_ABS_DB=14, TILT_MAX_DB=10'un ÜSTÜNDE bir headroom (kaskat filtrelerin
// belirli frekanslarda üst üste binip 10dB'yi hafifçe aşabileceği ihtimaline
// karşı, çizgi tepeden KIRPILMASIN diye).
const MAX_ABS_DB = 14;
function drawTiltCurve(ctx2d, w, h, db, color, alpha) {
  const plotBottom = h - AXIS_H;
  const curveTop = CURVE_TOP, curveBottom = plotBottom - 6;
  const midY = curveTop + (curveBottom - curveTop) * 0.5;
  const bandH = (curveBottom - curveTop) * 0.42;
  const yAt = i => {
    const d = Math.max(-MAX_ABS_DB, Math.min(MAX_ABS_DB, db[i]));
    return midY - (d / MAX_ABS_DB) * bandH;
  };
  ctx2d.save();
  ctx2d.beginPath();
  for (let i = 0; i < CURVE_POINTS; i++) {
    const x = (i / (CURVE_POINTS - 1)) * w;
    if (i === 0) ctx2d.moveTo(x, yAt(i)); else ctx2d.lineTo(x, yAt(i));
  }
  ctx2d.strokeStyle = color;
  ctx2d.lineWidth = 3;
  ctx2d.globalAlpha = alpha;
  ctx2d.lineJoin = "round";
  ctx2d.stroke();
  ctx2d.restore();
}

function drawCurveLegend(ctx2d, showGuess) {
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

// Soru sırasında (roundActive) eğri BİLEREK gizli — kulakla bulma ilkesi.
// Eksen HER ZAMAN çizilir (Boost/Cut'ın AYNI deseni — spektrum çubuklarının
// altında/arkasında tutarlı bir frekans ekseni). state: { audioCtx,
// activeQuestion, roundActive, guessLetter } — guessLetter Kompresör/
// Reverb'le PAYLAŞILAN, app.js'in submitThreeWayGuess'te sakladığı harf.
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  drawAxis(ctx2d, w, h);
  const { audioCtx, activeQuestion: q, roundActive, guessLetter } = state;
  if (!q || roundActive) return;

  const correctVariant = q.variants[q.oddIndex];
  const guessVariant = guessLetter ? q.variants.find(v => v.letter === guessLetter) : null;

  const correctDb = computeTiltCurveDb(audioCtx, correctVariant, w);
  const guessDb = guessVariant ? computeTiltCurveDb(audioCtx, guessVariant, w) : null;
  if (!correctDb && !guessDb) return;

  if (guessDb) drawTiltCurve(ctx2d, w, h, guessDb, GUESS_COLOR, 0.85);
  if (correctDb) drawTiltCurve(ctx2d, w, h, correctDb, CORRECT_COLOR, 0.85);

  drawCurveLegend(ctx2d, !!guessDb);
}

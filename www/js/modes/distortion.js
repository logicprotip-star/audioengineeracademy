// "Distortion" — Motor 2'nin DÖRDÜNCÜ modu ("Hangisi Farklı", A/B/C
// karşılaştırma). Kompresör'ün (G30/G33) KANITLANMIŞ üç-ses/odd-one-out
// şablonunun BİREBİR bir "ikizi" — task'ın kendi tabiri. three-way-cards.js
// (büyük A/B/C kartları) ve core/exam-system.js (parkur/kombo/sınav/telafi)
// TEK SATIR değişmeden miras alınıyor.
//
// MODUN FELSEFESİ (gerçek mix): distortion/saturation = renk, karakter,
// sıcaklık. Tube saturation sıcaklık/yumuşaklık, clipping sertlik/kirlilik
// katar — SoundGym ve rakiplerde bu konsept "hangisi daha doygun" gibi tek
// eksenli sorulur, TÜRÜ (clipping/soft/tube/tape) hiç ÖĞRETMEZ; bu mod
// ayrıştırıcımızın "hatadan öğret" ilkesiyle türü + karakteri + mix anlamını
// da öğretir (bkz. teachingText).
//
// MEKANİK: Kompresör'ün "TEK ALGISAL EKSEN" dersinin AYNISI — üç ses (A/B/C),
// AYNI kaynak, AYNI distortion TÜRÜ (clip/soft/tube/tape — zorluk kademesine
// göre SEÇİLİR, bkz. DISTORTION_TYPES), ikisi AYNI yoğunlukta (k=DIST_BASE_K),
// biri (oddIndex) farklı yoğunlukta. "Tür" kademe SEÇER (araştırma dersi:
// kolay=en bariz tür/clipping, pro=en ince tür/tape), "yoğunluk" (k) SORUNUN
// KENDİSİNDEKİ ayırt edilebilirliği kontrol eder (Kompresör'ün kGap'ı
// BİREBİR aynı matematikle) — iki eksen ayrı roller üstleniyor, biri
// asla diğerinin yerini almıyor.
//
// KULAKLA/ÜRÜN DOĞRULANMADI (diğer dokuz modun AYNI dürüstlük notu): drive
// aralıkları/tip eşleştirmeleri/kGap eğrisi makul bir başlangıç, kesin nihai
// sayı iddia edilmiyor.

import { compatibleSourceIds } from "../core/source-catalog.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound, drawSpectrumBackground } from "./frekans-bulma.js";
import { logLerp, applyPostCapFloor } from "../core/difficulty-curve.js";
import { GUESS_COLOR, CORRECT_COLOR } from "../core/feedback-colors.js";
import { renderThreeWayCards, markThreeWayCards, updateThreeWayCardsPlayState, selectThreeWayCard } from "../core/three-way-cards.js";

// app.js'in GENEL görselleştiricisi diğer dokuz modla AYNI re-export
// deseni — Distortion'ın KENDİSİ frekansla ilgilenmiyor ama paylaşılan arka
// plan çizimi (drawAxis vb. için faXToF/faFToX) bunları koşulsuz okuyor.
export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound, drawSpectrumBackground };

export const MODE_ID = "distortion";
export const MAX_LIVES = 5;
// Motor 2'nin ("A/B/C odd-one-out") HANGİ modları kapsadığını app.js TEK
// yerde (THREE_WAY_MODE_IDS) tutuyor — Kompresör/Reverb'in AYNI bayrağı.
export const THREE_WAY = true;

// G86: Kompresör/Reverb'in AYNI kararı — Motor 2'de spektrum HİÇ YOK.
export const HIDE_ANALYZER = true;

// G47/G50'nin AYNI mode-agnostik sınav bayrağı. EXAM_WEAK_AREA export
// EDİLMEDİ — Kompresör/Reverb/Tonal Denge'nin AYNI zayıf-KADEME (frekans
// DEĞİL, tier-tabanlı) yoluna düşer (bkz. app.js:getWeakArea dispatcher'ı,
// G50) — task'ın kendi kararı: "zayıf ZORLUK KADEMESİ (frekans-tabanlı
// değil)".
export const EXAM_ENABLED = true;
export const EXAM_DIFFICULTY = "pro";

// ═══════════════════════════════════════════════════════════════════════════
// DİSTORTİON TÜRÜ — zorluk kademesi HANGİ WaveShaper eğri-ailesinin
// kullanılacağını SEÇER (task'ın kendi eşlemesi — "araştırma dersi"):
//   Kolay  → clip  (sert kırpma, EN BARİZ/tanınabilir — "sert/kirli")
//   Orta   → soft  (yumuşak kırpma/overdrive — orta karakterde)
//   Zor    → tube  (tüp/valf doygunluğu — İNCE, sıcak/yumuşak, zor duyulur)
//   Pro    → tape  (bant doygunluğu — SoundGym forum: "yüksek seviyede
//            inanılmaz ince") + Pro Plus AYNI (proplus eğriye hiç girmiyor,
//            diğer üç Motor 2 modunun Z5 kararıyla AYNI çizgide)
// Bir SORU İÇİNDE A/B/C ÜÇÜ DE AYNI türü kullanır (tek algısal eksen ilkesi
// BOZULMASIN diye) — SADECE yoğunluk (k) farklıdır, Kompresör'ün AYNI deseni.
//
// G97 (madde 7) — KADEME SINIRINDA TÜRÜN SIÇRAMASI (clip→soft→tube→tape)
// KASITLI, kod-tabanlı bir sınırlama DEĞİL: ZORLUK.md bu eksenin (kGap'in
// aksine) SÜREKLİ olmadığını, tier adına (DISTORTION_TYPES[level], bir sayı
// DEĞİL bir STRING anahtarla) sabit eşlendiğini tespit etmişti — kullanıcı
// KARARI bunun KALMASI: gerçek bir mix'te de doygunluk TEK bir tür olarak
// akıp gitmez (kick'te tape, vokalde tube, master'da clip — HEPSİ AYNI
// projede bir arada olabilir), kulağın kademeler arasında tür değiştirerek
// GEÇİŞ yapması gerçek stüdyo pratiğini yansıtıyor — pürüzsüz/sürekli bir
// eksene ZORLAMAK burada YAPAY olurdu.
// ═══════════════════════════════════════════════════════════════════════════
export const DISTORTION_TYPES = { easy: "clip", medium: "soft", hard: "tube", pro: "tape", proplus: "tape" };

// SAF VERİ — her türün İNSAN dilinde adı + karakteri + mix anlamı (task'ın
// kendi örnek formatı: "B farklıydı — tube saturation. Sıcak, yumuşak,
// üst-ortada dolgunluk katar. Vokal/bas'ı 'analog' yapar."). SoundGym
// Tips'inden alınan "ne dinlenir" ipuçları (dolgunluk, davulda uzayan kuyruk,
// düşük frekansta kirlenme) mixNote'lara işlendi.
export const DISTORTION_TYPE_INFO = {
  clip: {
    label: "Distortion: Clipping",
    character: "sert ve kirli",
    mixNote: "dalga tepeleri düz kesiliyor — agresif ama kontrolsüz, tizlerde sertlik/tıslama artar, davulda atak daha da 'patlar'"
  },
  soft: {
    label: "Distortion: Soft Clip / Overdrive",
    character: "ortada — hafif sıcak ama hâlâ belirgin",
    mixNote: "gitar/bas'a itki ve 'dolgunluk' katar (ses daha büyük/dolu duyulur), abartılırsa yine kirlenmeye kayar"
  },
  tube: {
    label: "Saturation: Tube (Valf)",
    character: "sıcak ve yumuşak",
    mixNote: "üst-ortada dolgunluk katar, vokal/bas'ı 'analog' yapar — clipping'in aksine sert/kirli değil"
  },
  tape: {
    label: "Saturation: Tape",
    character: "çok ince, neredeyse fark edilmez",
    mixNote: "sesi biraz daha 'dolgun/büyük' hissettirir, düşük frekanslar hafifçe 'kirlenir', davul kuyruğu az uzar — dinlerken bunlara odaklan"
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// DRIVE (WaveShaper sürücü miktarı) — Kompresör'ün ratioAtK/thresholdAtK'sinin
// AYNI "k ∈ [0,1] → gerçek parametre" deseni. Her türün KENDİ [düşük,yüksek]
// aralığı var — task: "Kolay ekstrem, pro ince" — clip'in EN DÜŞÜK drive'ı
// bile tape'in EN YÜKSEK drive'ından kat kat daha belirgin (aralıklar
// KASITLI OLARAK örtüşmüyor, türler arası "kolay/zor" hiyerarşisi bu şekilde
// GARANTİ ediliyor, sadece kGap'e bağlı KALMIYOR). KULAKLA DOĞRULANMADI.
// ═══════════════════════════════════════════════════════════════════════════
const DRIVE_RANGES = {
  clip: [2.2, 15],
  soft: [1.1, 8],
  tube: [0.5, 3.2],
  tape: [0.12, 0.9]
};

// SAF FONKSİYON.
export function driveAtK(type, k) {
  const [lo, hi] = DRIVE_RANGES[type] || DRIVE_RANGES.soft;
  return lo + k * (hi - lo);
}

// ═══════════════════════════════════════════════════════════════════════════
// WAVESHAPER EĞRİLERİ — SAF FONKSİYONLAR, audioCtx'e hiç ihtiyaç duymuyor
// (Float32Array üretip döner, WaveShaperNode.curve'e DOĞRUDAN atanabilir).
// Dört türün MATEMATİKSEL karakteri task'ın kendi tarifiyle uyumlu:
//   clip — SERT köşeli (donanım kırpma: |x*drive| clamp(-1,1))
//   soft — YUMUŞAK köşeli (tanh: simetrik, orta-yoğun harmonik)
//   tube — ASİMETRİK yumuşak (pozitif/negatif yarım-dalga FARKLI drive —
//          gerçek tüp doygunluğunun karakteristik asimetrisi, ÇİFT harmonik
//          katar, bu yüzden "sıcak" algılanır)
//   tape — NEREDEYSE DOĞRUSAL, sadece tepe noktalarına yakın hafif bir
//          yumuşatma (kübik terim, küçük katsayı) — task: "inanılmaz ince"
// ═══════════════════════════════════════════════════════════════════════════
const CURVE_SAMPLES = 1024;

function clipCurve(drive) {
  const curve = new Float32Array(CURVE_SAMPLES);
  for (let i = 0; i < CURVE_SAMPLES; i++) {
    const x = (i / (CURVE_SAMPLES - 1)) * 2 - 1;
    curve[i] = Math.max(-1, Math.min(1, x * drive));
  }
  return curve;
}

function softCurve(drive) {
  const curve = new Float32Array(CURVE_SAMPLES);
  for (let i = 0; i < CURVE_SAMPLES; i++) {
    const x = (i / (CURVE_SAMPLES - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive);
  }
  return curve;
}

function tubeCurve(drive) {
  const curve = new Float32Array(CURVE_SAMPLES);
  for (let i = 0; i < CURVE_SAMPLES; i++) {
    const x = (i / (CURVE_SAMPLES - 1)) * 2 - 1;
    const d = x >= 0 ? drive : drive * 0.72; // asimetri — gerçek tüp karakterinin İMZASI
    curve[i] = Math.tanh(x * d) * 0.92;
  }
  return curve;
}

function tapeCurve(drive) {
  const curve = new Float32Array(CURVE_SAMPLES);
  for (let i = 0; i < CURVE_SAMPLES; i++) {
    const x = (i / (CURVE_SAMPLES - 1)) * 2 - 1;
    curve[i] = x - Math.sign(x) * drive * 0.15 * Math.pow(Math.abs(x), 3);
  }
  return curve;
}

const CURVE_BUILDERS = { clip: clipCurve, soft: softCurve, tube: tubeCurve, tape: tapeCurve };

// SAF FONKSİYON — WaveShaperNode.curve'e atanabilecek Float32Array döner.
export function buildDistortionCurve(type, drive) {
  const builder = CURVE_BUILDERS[type] || softCurve;
  return builder(Math.max(0, drive));
}

// ═══════════════════════════════════════════════════════════════════════════
// STATİK DIFFICULTY — diğer dokuz modla AYNI ikili rol (fallback + Sabit
// mod çapası + proplus kaynağı). `options` HER ZAMAN 3 (A/B/C) — G97
// (madde 6): Kompresör/Reverb'in AYNI KASITLI kararı (bkz. kompresor.js'in
// DIFFICULTY notu) — kulak yorgunluğu riski nedeniyle Motor 2'de şık sayısı
// ekseni HİÇ kullanılmaz, zorluk sadece kGap'ten gelir.
// kGap: Kompresör'ün K_GAP değerleriyle
// BİREBİR aynı (bkz. dosya başı "iki eksen" notu — kGap KESİRLİ [0,1]
// k-uzayında, hangi türe (drive aralığına) çevrileceğinden BAĞIMSIZ, bu
// yüzden Kompresör'ün ZATEN kalibre edilmiş sayıları buraya DOĞRUDAN
// taşınabilir, yeniden icat edilmedi).
// ═══════════════════════════════════════════════════════════════════════════
export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 14, options: 3, time: 16, lives: MAX_LIVES, kGap: 0.45 },
  medium: { label: "Orta", xp: 22, options: 3, time: 13, lives: MAX_LIVES, kGap: 0.30 },
  hard: { label: "Zor", xp: 32, options: 3, time: 11, lives: MAX_LIVES, kGap: 0.15 },
  pro: { label: "Pro", xp: 46, options: 3, time: 9, lives: MAX_LIVES, kGap: 0.06 },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 46, options: 3, time: 9, lives: MAX_LIVES, kGap: 0.06 }
};

export const DIST_BASE_K = 0.5; // Kompresör'ün COMP_BASE_K'sıyla AYNI gerekçe: aralığın ORTASI, simetrik ayrışma

// ═══════════════════════════════════════════════════════════════════════════
// ZORLUK EĞRİSİ — Kompresör'ün COMP_CURVE_CONFIG'iyle AYNI sayılar (bkz.
// yukarıdaki "kGap k-uzayında" notu — matematiksel yapı BİREBİR aynı
// olduğu için Kompresör'ün ZATEN doğrulanmış kalibrasyonu GEÇERLİ kalıyor,
// "kolaylaşma yok" invaryantı testle YENİDEN doğrulandı).
// ═══════════════════════════════════════════════════════════════════════════
export const DISTORTION_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  K_GAP_AT_1: 0.45,
  K_GAP_AT_CAP: 0.058,
  K_GAP_FLOOR: 0.046,
  K_GAP_REDUCTION_PER_STEP: 0.001,

  TIME_SEC_AT_1: 16,
  TIME_SEC_AT_CAP: 9,
  TIME_SEC_FLOOR: 6,
  TIME_SEC_REDUCTION_PER_STEP: 0.15
};

// SAF FONKSİYON.
export function paramsForDifficultyPosition(position, config = DISTORTION_CURVE_CONFIG) {
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

// SAF FONKSİYON — Kompresör'ün pickKGap'ıyla AYNI ±%6 dar jitter + floor garantisi.
export function pickKGap(baseKGap, rng = Math.random) {
  const jitter = 0.94 + rng() * 0.12;
  const jittered = baseKGap * jitter;
  return Math.max(DISTORTION_CURVE_CONFIG.K_GAP_FLOOR, jittered);
}

// SAF FONKSİYON — Kompresör'ün pickOddK'sıyla AYNI: base'den rastgele bir
// yönde kGap kadar uzaklaşan k, [0,1] dışına ASLA taşmaz.
export function pickOddK(base, kGap, rng = Math.random) {
  const direction = rng() < 0.5 ? 1 : -1;
  const raw = base + direction * kGap;
  return Math.min(1, Math.max(0, raw));
}

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    motor: 2,
    // task: "kulaklikGerekli değerlendir (muhtemelen false — hoparlörde de
    // duyulur)" — Kompresör'ün AYNI gerekçesi: distortion ince olsa bile
    // (tape/tube) genelde hoparlörde de fark edilir, Reverb/Tonal Denge'nin
    // aksine (onlarda mekân/derinlik algısı kulaklık GEREKTİRİYOR).
    kulaklikGerekli: false,
    // TÜM kaynaklar açık — Reverb'in "only" kısıtının AKSİNE, distortion
    // HEMEN HEMEN her kaynakta duyulabilir (Kompresör'ün transient şartı da
    // burada geçerli değil, distortion transient GEREKTİRMEZ). task'ın
    // "davul/groove ideal" notu bir ÖNERİ/araştırma bulgusu — sabit bir
    // KISITLAMA değil (kullanıcı istediğini seçebilir, bkz. Kompresör'ün
    // AYNI kararı).
    uyumluKaynaklar: compatibleSourceIds(),
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY,
    choiceOnly: true
  };
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz. settings: { source, boss,
// difficultyPosition — verilirse kGap/timeSec EĞRİDEN gelir }.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "pink"; // diğer dokuz modla PAYLAŞILAN varsayılan (bkz. Kompresör'ün AYNI notu)
  const rng = settings.rng || Math.random;

  const distortionType = DISTORTION_TYPES[level] || DISTORTION_TYPES.medium;

  const curve = (level !== "proplus" && Number.isFinite(settings.difficultyPosition))
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  const baseKGap = curve ? curve.kGap : diff.kGap;
  const timeSec = curve ? curve.timeSec : diff.time;

  const oddIndex = Math.floor(rng() * 3);
  const kGap = pickKGap(baseKGap, rng);
  const oddK = pickOddK(DIST_BASE_K, kGap, rng);

  const letters = ["A", "B", "C"];
  const variants = letters.map((letter, i) => {
    const k = i === oddIndex ? oddK : DIST_BASE_K;
    return { letter, k, drive: driveAtK(distortionType, k) };
  });
  const choices = letters.map((letter, i) => ({ id: letter, tr: letter, correct: i === oddIndex }));

  return {
    mode: "distortion",
    difficulty: level,
    source,
    distortionType,
    variants,
    oddIndex,
    hintUsed: false,
    boss,
    timeSec,
    choices
  };
}

export function modeDescription() {
  return "A/B/C ile üçünü de dinle, saturation/distortion'ı farklı olanı şıklardan seç.";
}

export function correctLabel(question) {
  const odd = question.variants[question.oddIndex];
  const info = DISTORTION_TYPE_INFO[question.distortionType];
  return `${odd.letter} (${info.label}, drive ${odd.drive.toFixed(2)})`;
}

// Soruda uygulanan distortion'ı audioCtx üzerinde kurar — Kompresör'ün
// previewLetter deseninin BİREBİR aynısı: question.previewLetter VERİLİRSE
// (app.js'in 3-yönlü abToggle'ı) o harfin GERÇEK drive'ı question.variants'tan
// okunur, verilmezse (turun İLK çalışı) variants[0] (harf A) çalar.
export function applyProcessing(question, { audioCtx }) {
  const letter = question.previewLetter || question.variants[0].letter;
  const variant = question.variants.find(v => v.letter === letter) || question.variants[0];
  const shaper = audioCtx.createWaveShaper();
  shaper.curve = buildDistortionCurve(question.distortionType, variant.drive);
  shaper.oversample = "4x"; // WaveShaperNode'un standart pratiği — aliasing/yapay tizlik azaltır
  return { filters: [shaper] };
}

// SAF FONKSİYON. answer: harf ("A"/"B"/"C") ya da {id}.
export function evaluateAnswer(question, answer) {
  const guessLetter = answer && typeof answer === "object" ? answer.id : answer;
  const correctLetter = question.variants[question.oddIndex].letter;
  const correct = guessLetter === correctLetter;
  return { mode: "distortion", correct, guessLetter, correctLetter };
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
// ÖĞRETİCİ METİN — task'ın kendi örnek formatı: "B farklıydı — tube
// saturation. Sıcak, yumuşak, üst-ortada dolgunluk katar. Vokal/bas'ı
// 'analog' yapar." k'ye göre bir YOĞUNLUK sözcüğü (hafif/orta/belirgin/ağır)
// + DISTORTION_TYPE_INFO'nun karakter/mix metni BİRLEŞTİRİLİYOR — Kompresör'ün
// COMPRESSION_TIERS'ıyla AYNI "tek yerde şablon" felsefesi, ama burada tek
// tür SORUNUN TAMAMINDA sabit olduğu için (bkz. dosya başı "iki eksen" notu)
// "aynı kademe/farklı kademe" ayrımına GEREK YOK — sadece yoğunluk YÖNÜ
// (odd daha ağır mı hafif mi) belirtiliyor.
// ═══════════════════════════════════════════════════════════════════════════

function intensityWord(k) {
  if (k < 0.25) return "hafif";
  if (k < 0.5) return "orta";
  if (k < 0.75) return "belirgin";
  return "ağır";
}

export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);
  const odd = question.variants[question.oddIndex];
  const same = question.variants.find((v, i) => i !== question.oddIndex);
  const info = DISTORTION_TYPE_INFO[question.distortionType];
  const heavier = odd.k > same.k;
  const yonMetni = heavier ? "daha ağır" : "daha hafif";

  const base = `${odd.letter} farklıydı — ${intensityWord(odd.k)} ${info.label.toLowerCase()} (${same.letter}'den ${yonMetni}). Karakteri ${info.character} — ${info.mixNote}.`;

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

// İpucu — HANGİ harf olduğunu ASLA vermez, sadece YÖNÜ söyler (Kompresör'ün
// AYNI kısmi-yardım ilkesi).
export function getHintText(question) {
  const odd = question.variants[question.oddIndex];
  const same = question.variants.find((v, i) => i !== question.oddIndex);
  return odd.k > same.k ? "Farklı olan daha çok bozulmuş" : "Farklı olan daha az bozulmuş";
}

export function renderHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}
export function clearHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}

// G86 DÜZELTMESİ: Kompresör/Reverb'in AYNI kararı — #freqGuessArea artık
// Motor 2 onay butonunu taşıyor (bkz. app.js updateThreeWayConfirmButton).
export function renderGuessAreaControls(freqGuessAreaEl) {
  if (!freqGuessAreaEl) return;
  freqGuessAreaEl.classList.remove("hidden");
  freqGuessAreaEl.innerHTML = `<button type="button" class="btn game-threeway-confirm" id="threeWayConfirmBtn" disabled>Bir kart seç</button>`;
}

// G41'in büyük kart görseli — core/three-way-cards.js'e delege (Kompresör/
// Reverb'le PAYLAŞILAN, gerçek bir mod-özel fark YOK).
export const renderAnswerChoices = renderThreeWayCards;
export const markAnswerChoices = markThreeWayCards;
export const updateAnswerPlayState = updateThreeWayCardsPlayState;
export { selectThreeWayCard };

// ═══════════════════════════════════════════════════════════════════════════
// GÖRSEL — task: "distortion karakterini göster — dalga şekli (clipping
// sert köşeli, saturation yumuşak yuvarlak) ya da harmonik içerik." Kompresör'ün
// SENTETİK zarfının AKSİNE burada GERÇEK bir şey çiziliyor: WaveShaperNode'un
// KENDİ transfer eğrisi (giriş x ∈[-1,1] → çıkış y∈[-1,1], buildDistortionCurve
// ile TAM AYNI matematik, applyProcessing'in kurduğu node'la BİREBİR aynı
// eğri) — clip GERÇEKTEN sert köşeli çizilir, tube/tape GERÇEKTEN yumuşak/
// yuvarlak, çünkü ikisi de AYNI fonksiyondan geliyor (boost-mu-cut-mu.js'in
// "gerçek BiquadFilterNode.getFrequencyResponse çiz" ilkesiyle AYNI çizgide
// — burada WaveShaper'ın kendi eğrisi zaten "gerçek", ekstra bir hesaba
// GEREK YOK).
// ═══════════════════════════════════════════════════════════════════════════

function drawTransferCurve(ctx2d, w, h, curveArr, color, alpha) {
  const plotBottom = h - AXIS_H;
  const top = CURVE_TOP;
  const plotH = plotBottom - top;
  const n = curveArr.length;
  ctx2d.save();
  ctx2d.beginPath();
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * w;
    const norm = (curveArr[i] + 1) / 2; // [-1,1] → [0,1]
    const y = plotBottom - norm * plotH;
    if (i === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
  }
  ctx2d.strokeStyle = color;
  ctx2d.lineWidth = 2.5;
  ctx2d.globalAlpha = alpha;
  ctx2d.lineJoin = "round";
  ctx2d.stroke();
  ctx2d.restore();
}

function drawTransferLegend(ctx2d, showGuess) {
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
// state: { activeQuestion, roundActive, guessLetter } — guessLetter
// Kompresör/Reverb'in AYNI paylaşılan alanı (app.js:threeWayGuessLetter,
// submitThreeWayGuess'in mode-agnostik kaydı).
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  const { activeQuestion: q, roundActive, guessLetter } = state;
  if (!q || roundActive) return;

  const correctVariant = q.variants[q.oddIndex];
  const guessVariant = guessLetter ? q.variants.find(v => v.letter === guessLetter) : null;

  const correctCurve = buildDistortionCurve(q.distortionType, correctVariant.drive);
  const guessCurve = guessVariant ? buildDistortionCurve(q.distortionType, guessVariant.drive) : null;

  if (guessCurve) drawTransferCurve(ctx2d, w, h, guessCurve, GUESS_COLOR, 0.85);
  drawTransferCurve(ctx2d, w, h, correctCurve, CORRECT_COLOR, 0.85);

  drawTransferLegend(ctx2d, !!guessCurve);
}

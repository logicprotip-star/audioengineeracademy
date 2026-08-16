// "Boost mu Cut mu" — üç katmanlı EQ tanıma modu. Bir frekans bandına bell
// (peaking) EQ ile ya BOOST (+dB) ya CUT (-dB) uygulanır; kullanıcı A/B ile
// karşılaştırıp cevabı bulur. Frekans Bulma'nın EQ motorunu (peaking, FA_MIN–
// FA_MAX havuzu) + dB Seviyesi'nin yön/miktar mantığını (işaretli, ondalıklı
// şıklar) BİRLEŞTİRİR — SoundGym bunu 3 ayrı oyuna böler (frekans/dB ayrı ayrı),
// biz TEK modda, SEANS İÇİ ÜÇ KATMANLA (kolaydan zora bir bilinmeyen daha
// eklenerek) birleştiriyoruz — bu, task'ın "özgün fark" dediği kısım.
//
// Mod sözleşmesi diğer üçüyle AYNI (getMeta/createQuestion/applyProcessing/
// evaluateAnswer/calculateXP/getFeedbackData) + aynı-isimli render yardımcıları.
// Kesim Noktası/dB Seviyesi ŞABLONU izlendi: statik DIFFICULTY tablosu (geriye
// dönük uyumluluk + Sabit modun çapası + proplus) + merkezi eğriye SIFIRDAN
// doğru kalibre edilmiş bağlantı (dB Seviyesi'nin G24'te SONRADAN düzelttiği
// "temsilci seviyede kolaylaşma" hatası burada BAŞTAN ikili aramayla önlendi,
// bkz. BOOSTCUT_CURVE_CONFIG notu) + G24'ün öğrettiği İKİ ders BAŞTAN uygulandı:
// (1) pickGainDb'nin jitter'ı DAR (±%6, seans rampasının sinyalini boğmasın),
// (2) jitter'dan SONRA taban (GAIN_DB_FLOOR) HER ZAMAN kontrol edilir.
//
// SADECE ŞIKLI (choiceOnly:true) — diğer iki yeni modla AYNI karar.

import { shuffle, formatHz, logFreq } from "../core/utils.js";
import { compatibleSourceIds } from "../core/source-catalog.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound, drawSpectrumBackground } from "./frekans-bulma.js";
import { logLerp, applyPostCapFloor } from "../core/difficulty-curve.js";
import { GUESS_COLOR, CORRECT_COLOR } from "../core/feedback-colors.js";

// app.js'in GENEL görselleştiricisi (drawVisualizer/drawSpectrumBars) BU sabitleri
// HER moddan mode-agnostik olarak okur — diğer iki modla AYNI re-export deseni.
export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound, drawSpectrumBackground };

export const MODE_ID = "boost-mu-cut-mu";
export const MAX_LIVES = 5;

// G50: Sınav sistemi — frekans-bulma.js'in AYNI notu. EXAM_WEAK_AREA="zone":
// recordZone SADECE Katman 3'te çağrılır (bkz. app.js submitBoostCutGuess
// notu) ama telafi'nin okuduğu zoneStats PAYLAŞILAN/çapraz-mod bir sinyal
// (Frekans Bulma/Kesim Noktası'nın da beslediği) — bu modun kendi Katman 3
// verisi HİÇ yoksa bile telafi diğer modlardan gelen zayıf bölge sinyaline
// göre daraltılabilir, ya da veri hiç yoksa (getWeakZone null) app.js normal
// (daraltılmamış) aralığa düşer.
export const EXAM_ENABLED = true;
export const EXAM_DIFFICULTY = "pro";
export const EXAM_WEAK_AREA = "zone";

// ═══════════════════════════════════════════════════════════════════════════
// SEANS İÇİ ÜÇ KATMAN — Kesim Noktası'nın tip-gizleme rampasının GENİŞLETİLMİŞ
// hali: tek bir eşik yerine İKİ eşik, her katmanda bir bilinmeyen daha eklenir.
//   Katman 1 (idx < LAYER1_QUESTION_COUNT):  frekans+miktar BELLİ, sadece YÖN
//   Katman 2 (idx < LAYER2_QUESTION_COUNT):  frekans BELLİ, YÖN+MİKTAR gizli
//   Katman 3 (idx >= LAYER2_QUESTION_COUNT): hepsi gizli (FREKANS+YÖN+MİKTAR)
// "Soru 10 boss/pro en zor" AYRI bir 4. katman DEĞİL — boss zaten Katman 3
// aralığına düşer (10 soruluk bir Bölüm'de idx=9), zorluğu curve'ün position'ı
// (sessionRampOffset'in BOSS_OFFSET'i) sağlıyor; reveal-katmanları sadece
// idx'e bağlı, boss'tan bağımsız (dB Seviyesi'ndeki AYNI ayrım: yön-gizleme
// sayacı ile zorluk-eğrisi position'ı FARKLI eksenler).
export const LAYER1_QUESTION_COUNT = 3;
export const LAYER2_QUESTION_COUNT = 6;

export function layerForIndex(sessionQuestionIndex) {
  const idx = Number.isFinite(sessionQuestionIndex) ? sessionQuestionIndex : 0;
  if (idx < LAYER1_QUESTION_COUNT) return 1;
  if (idx < LAYER2_QUESTION_COUNT) return 2;
  return 3;
}

// gainDb (uygulanan GERÇEK büyüklük, işaretsiz) seviye arttıkça küçülür=zorlaşır
// — dB Seviyesi'nin DIFFICULTY.dbDelta'sıyla AYNI felsefe. freqStepOct/gainStepDb
// çeldirici MESAFESİ (Kesim Noktası'nın DISTRACTOR_STEP_OCT'uyla AYNI kavram,
// iki eksen için ayrı ayrı). options SADECE Katman 2/3'te kullanılır (Katman 1
// her zaman TAM 2 şık: Boost/Cut, curve'den bağımsız — ikili bir seçim zaten
// daha fazla şıkla anlamsızlaşır).
//
// KULAKLA DOĞRULANMADI — diğer üç modun AYNI dürüstlük notu, makul bir
// başlangıç noktası.
export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 16, options: 3, time: 16, lives: MAX_LIVES, gainDb: 8.0, freqStepOct: 1.4, gainStepDb: 2.5 },
  medium: { label: "Orta", xp: 24, options: 4, time: 13, lives: MAX_LIVES, gainDb: 5.5, freqStepOct: 1.0, gainStepDb: 1.6 },
  hard: { label: "Zor", xp: 36, options: 5, time: 11, lives: MAX_LIVES, gainDb: 3.2, freqStepOct: 0.75, gainStepDb: 1.0 },
  pro: { label: "Pro", xp: 52, options: 6, time: 9, lives: MAX_LIVES, gainDb: 1.8, freqStepOct: 0.55, gainStepDb: 0.6 },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 52, options: 6, time: 9, lives: MAX_LIVES, gainDb: 1.8, freqStepOct: 0.55, gainStepDb: 0.6 }
};

// ═══════════════════════════════════════════════════════════════════════════
// ZORLUK EĞRİSİ — merkezi kütüphaneye SIFIRDAN, dB Seviyesi'nin (G24'te
// SONRADAN düzelttiği) İKİ dersini BAŞTAN uygulayarak bağlanan 3. mod (dB
// Seviyesi'nden sonra). AT_1'ler statik easy değerleriyle birebir aynı.
// AT_CAP'lar statik pro'yla BİREBİR AYNI DEĞİL — representativeLevelForTier
// (her tier'ı kendi üst sınırında değerlendiren, easy=4/medium=8/hard=12/
// pro=LEVEL_CAP) temsilci seviyelerinde HİÇBİR tier'ın eski statikten kolay
// çıkmaması için ikili aramayla çözüldü (bkz. commit mesajı — Kesim Noktası'nın
// ADIM 3'te, dB Seviyesi'nin BAŞTAN yaptığı AYNI hesap).
export const BOOSTCUT_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  // Uygulanan GERÇEK gain büyüklüğü (dB, işaretsiz) — küçük=zor. AT_CAP=1.4
  // (statik pro'nun [1.8] altında — representativeLevelForTier("hard")=12'de
  // eski hard'ı [3.2] aşmamak için ~1.64 gerekti, 1.4 güvenlik payı bırakıyor).
  // FLOOR=1.0: kulağın mix bağlamında GERÇEKTEN ayırt edebildiği kabul edilen
  // en küçük boost/cut (KESİN ölçülmedi, makul bir başlangıç) — applyPostCapFloor
  // eğrinin bunun altına inmesini engelliyor.
  GAIN_DB_AT_1: 8.0,
  GAIN_DB_AT_CAP: 1.4,
  GAIN_DB_FLOOR: 1.0,
  GAIN_DB_REDUCTION_PER_STEP: 0.02,

  // Katman 3'te frekans çeldiricilerinin mesafesi (oktav) — FREQ_TOLERANCE_OCT'tan
  // (0.3) HER ZAMAN büyük kalacak şekilde AT_CAP/FLOOR seçildi.
  FREQ_STEP_AT_1: 1.4,
  FREQ_STEP_AT_CAP: 0.42,
  FREQ_STEP_FLOOR: 0.38,
  FREQ_STEP_REDUCTION_PER_STEP: 0.01,

  // Katman 2/3'te dB çeldiricilerinin mesafesi — GAIN_TOLERANCE'tan (0.1) HER
  // ZAMAN büyük kalacak şekilde AT_CAP/FLOOR seçildi.
  GAIN_STEP_AT_1: 2.5,
  GAIN_STEP_AT_CAP: 0.45,
  GAIN_STEP_FLOOR: 0.4,
  GAIN_STEP_REDUCTION_PER_STEP: 0.01,

  // Soru süresi — diğer üç modla AYNI kapsam kararı: HENÜZ round-timer'a
  // bağlanmadı, sadece hesaplanıyor/test ediliyor.
  TIME_SEC_AT_1: 16,
  TIME_SEC_AT_CAP: 9,
  TIME_SEC_FLOOR: 6,
  TIME_SEC_REDUCTION_PER_STEP: 0.15,

  // Katman 2/3 şık sayısı — Katman 1'de HİÇ kullanılmaz (her zaman 2 şık).
  OPTIONS_AT_1: 3,
  OPTIONS_AT_CAP: 6.15
};

// SAF FONKSİYON. position: zorlukKonumu (continuousLevel + sessionRampOffset) —
// diğer üç modun paramsForDifficultyPosition'ıyla AYNI mod-agnostik girdi.
export function paramsForDifficultyPosition(position, config = BOOSTCUT_CURVE_CONFIG) {
  const safePos = Math.max(1, position);
  const cappedPos = Math.min(safePos, config.LEVEL_CAP);
  const t = config.LEVEL_CAP > 1 ? (cappedPos - 1) / (config.LEVEL_CAP - 1) : 1;

  const gainCurve = logLerp(config.GAIN_DB_AT_1, config.GAIN_DB_AT_CAP, t);
  const freqStepCurve = logLerp(config.FREQ_STEP_AT_1, config.FREQ_STEP_AT_CAP, t);
  const gainStepCurve = logLerp(config.GAIN_STEP_AT_1, config.GAIN_STEP_AT_CAP, t);
  const timeCurve = logLerp(config.TIME_SEC_AT_1, config.TIME_SEC_AT_CAP, t);
  const optionsCurve = logLerp(config.OPTIONS_AT_1, config.OPTIONS_AT_CAP, t);

  return {
    position: safePos,
    gainDb: applyPostCapFloor(gainCurve, safePos, config.LEVEL_CAP, config.GAIN_DB_FLOOR, config.GAIN_DB_REDUCTION_PER_STEP),
    freqStepOct: applyPostCapFloor(freqStepCurve, safePos, config.LEVEL_CAP, config.FREQ_STEP_FLOOR, config.FREQ_STEP_REDUCTION_PER_STEP),
    gainStepDb: applyPostCapFloor(gainStepCurve, safePos, config.LEVEL_CAP, config.GAIN_STEP_FLOOR, config.GAIN_STEP_REDUCTION_PER_STEP),
    timeSec: applyPostCapFloor(timeCurve, safePos, config.LEVEL_CAP, config.TIME_SEC_FLOOR, config.TIME_SEC_REDUCTION_PER_STEP),
    options: Math.max(3, Math.min(6, Math.round(optionsCurve)))
  };
}

// evaluateAnswer'da "doğru" sayılmanın toleransları.
export const GAIN_TOLERANCE = 0.1; // dB
export const FREQ_TOLERANCE_OCT = 0.3; // oktav

// Filtre eğimi (Q) — bu modun test ettiği eksenlerden biri DEĞİL (sabit),
// Frekans Bulma'nın orta zorluk Q'suna yakın makul bir değer.
const FILTER_Q = 1.4;

// G230 NOTU (TUR2-YARIM-15-08, "Negatif Sıfır") — db-seviyesi.js'in AYNI
// (birebir kopya) fonksiyonuyla AYNI gerekçe: bu, "-0.0" hatasını
// GÖSTERMİYORDU (Math.round'un ÜRETTİĞİ -0 üzerinde toFixed(2) çağırmak
// tesadüfen koruyordu) ama artık AÇIKÇA normalize ediliyor. Davranış
// DEĞİŞMEDİ.
export function formatDb(value) {
  const rounded = Math.round(value * 100) / 100;
  const safe = rounded === 0 ? 0 : rounded;
  const sign = safe >= 0 ? "+" : "";
  return `${sign}${safe.toFixed(2)} dB`;
}

// SAF FONKSİYON. dB Seviyesi'nin pickDbDelta'sıyla AYNI (G24'te ÖĞRENİLEN
// dersler BAŞTAN uygulandı): ±%6 dar jitter (seans rampasının küçük ama
// gerçek eğilimini BOĞMASIN) + jitter SONRASI GAIN_DB_FLOOR garantisi
// (Math.max) — floor'un jitter'la delinmesi G24'te ÖLÇÜLEN gerçek bir hataydı,
// burada baştan önleniyor.
export function pickGainDb(baseGain, rng = Math.random) {
  const jitter = 0.94 + rng() * 0.12; // 0.94x – 1.06x
  const jittered = baseGain * jitter;
  return Math.round(Math.max(BOOSTCUT_CURVE_CONFIG.GAIN_DB_FLOOR, jittered) * 100) / 100;
}

// SAF FONKSİYON. Katman 1: her zaman TAM 2 şık (Boost/Cut) — curve'den
// bağımsız, ikili bir seçim şık sayısıyla zorlaşmaz.
export function generateLayer1Choices(trueGainDb) {
  const trueDirection = trueGainDb >= 0 ? "boost" : "cut";
  const otherDirection = trueDirection === "boost" ? "cut" : "boost";
  return shuffle([
    { direction: trueDirection, correct: true },
    { direction: otherDirection, correct: false }
  ]);
}

// SAF FONKSİYON. Katman 2: dB Seviyesi'nin generateChoices'ıyla AYNI algoritma
// (işaretli büyüklükler, TAM k*step mesafede, en az bir çeldirici işareti ters
// çevrilir) — yön BURADA da hep gizli olduğu için directionRevealed parametresi
// yok, her zaman "gizli" davranışı uygulanır.
export function generateLayer2Choices(trueGainDb, resolved) {
  const step = resolved.gainStepDb;
  const count = Math.max(2, resolved.options);
  const sign = trueGainDb >= 0 ? 1 : -1;
  const absTrue = Math.abs(trueGainDb);

  const magnitudes = [absTrue];
  let k = 1;
  while (magnitudes.length < count) magnitudes.push(Math.round((absTrue + k++ * step) * 100) / 100);

  const flippableIdx = shuffle(magnitudes.map((_, i) => i).filter(i => i !== 0));
  const flipSet = new Set();
  flippableIdx.forEach((idx, n) => { if (n === 0 || Math.random() < 0.5) flipSet.add(idx); });

  const choices = magnitudes.map((m, i) => {
    if (i === 0) return { gainDb: trueGainDb, correct: true };
    const s = flipSet.has(i) ? -sign : sign;
    return { gainDb: Math.round(m * s * 100) / 100, correct: false };
  });
  return shuffle(choices);
}

// SAF FONKSİYON. Katman 3: KOMBİNE şıklar {freq, gainDb} — çeldiriciler İKİ
// EKSENDEN biri boyunca (frekans YA DA gain, asla ikisi birden) true'dan
// ayrılır, eksenler sırayla değişir. Bu yüzden hiçbir çeldirici true'yla
// ÇAKIŞMAZ (frekans-ekseni çeldiricileri true'nun gain'ini TAŞIR ama freq'i
// FARKLI; gain-ekseni çeldiricileri true'nun freq'ini TAŞIR ama gain'i FARKLI
// — ikisi de true'dan en az bir bileşende ayrılır). Gain-ekseni çeldiricilerin
// EN AZ biri işareti ters çevrilir (yön de test edilsin diye, Katman 2'nin
// AYNI kuralı) — frekans-ekseni çeldiriciler işareti/büyüklüğü KORUR (sadece
// frekans testi saf kalsın diye).
//
// Frekans-ekseni çeldiricileri Kesim Noktası'nın generateChoices'ıyla AYNI
// "havuz sınırına göre kırp" deseniyle FA_MIN–FA_MAX içinde tutulur (bkz. o
// dosyanın maxBelow/maxAbove yorumu) — canlı testte true frekans FA_MAX'a
// (17 kHz) yakınken NAİF k*step çarpımı 21.6 kHz gibi havuzun tamamen DIŞINDA
// bir çeldirici üretiyordu (gerçek bulunan hata, tahmin değil). Havuz bir
// yönde dar kalırsa fazla adım GAIN eksenine devrediliyor, frekans ekseni asla
// aşılmıyor.
export function generateLayer3Choices(trueFreq, trueGainDb, resolved) {
  const count = Math.max(2, resolved.options);
  const sign = trueGainDb >= 0 ? 1 : -1;
  const absTrue = Math.abs(trueGainDb);
  const step = resolved.freqStepOct;

  const trueOct = Math.log2(trueFreq);
  const minOct = Math.log2(FA_MIN), maxOct = Math.log2(FA_MAX);
  const maxBelow = Math.max(0, Math.floor((trueOct - minOct) / step));
  const maxAbove = Math.max(0, Math.floor((maxOct - trueOct) / step));

  const freqOffsetsOct = [];
  let below = 1, above = 1;
  while (below <= maxBelow || above <= maxAbove) {
    if (above <= maxAbove) freqOffsetsOct.push(above++ * step);
    if (below <= maxBelow) freqOffsetsOct.push(-(below++) * step);
  }

  const candidates = [{ freq: trueFreq, gainDb: trueGainDb, correct: true }];
  let freqIdx = 0, gainSteps = 0, gainDistractors = 0;
  let useFreqAxis = true;
  while (candidates.length < count) {
    if (useFreqAxis && freqIdx < freqOffsetsOct.length) {
      const f = trueFreq * Math.pow(2, freqOffsetsOct[freqIdx++]);
      candidates.push({ freq: f, gainDb: trueGainDb, correct: false });
    } else {
      gainSteps++;
      const magnitude = absTrue + gainSteps * resolved.gainStepDb;
      const flip = gainDistractors === 0 || Math.random() < 0.5;
      gainDistractors++;
      const g = Math.round(magnitude * (flip ? -sign : sign) * 100) / 100;
      candidates.push({ freq: trueFreq, gainDb: g, correct: false });
    }
    useFreqAxis = !useFreqAxis;
  }
  return shuffle(candidates);
}

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    motor: 1,
    kulaklikGerekli: false,
    // Kaynak kısıtlaması YOK — boost/cut her kaynakta duyulur, compatibleSourceIds()
    // parametresiz tüm SOURCE_GROUPS'u döner (bkz. Kesim Noktası'ndaki AYNI karar).
    uyumluKaynaklar: compatibleSourceIds(),
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY,
    choiceOnly: true
  };
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz. settings: { source, boss,
// sessionQuestionIndex — bkz. layerForIndex, 0-tabanlı; difficultyPosition —
// verilirse gainDb/freqStepOct/gainStepDb/options EĞRİDEN gelir, verilmezse
// (mevcut testler, doğrudan çağrılar, proplus) statik DIFFICULTY[level]
// davranışı korunur }.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "pink";
  const sessionQuestionIndex = Number.isFinite(settings.sessionQuestionIndex) ? settings.sessionQuestionIndex : 0;
  const layer = layerForIndex(sessionQuestionIndex);

  const curve = (level !== "proplus" && Number.isFinite(settings.difficultyPosition))
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  const baseGain = curve ? curve.gainDb : (boss ? diff.gainDb * 0.6 : diff.gainDb);
  const resolved = curve
    ? { options: curve.options, freqStepOct: curve.freqStepOct, gainStepDb: curve.gainStepDb }
    : { options: diff.options, freqStepOct: diff.freqStepOct, gainStepDb: diff.gainStepDb };
  const timeSec = curve ? curve.timeSec : diff.time;

  const direction = Math.random() < 0.5 ? 1 : -1;
  const gainDb = pickGainDb(baseGain) * direction;
  const freq = logFreq(FA_MIN, FA_MAX);

  let choices;
  if (layer === 1) choices = generateLayer1Choices(gainDb);
  else if (layer === 2) choices = generateLayer2Choices(gainDb, resolved);
  else choices = generateLayer3Choices(freq, gainDb, resolved);

  return {
    mode: "boostcut",
    difficulty: level,
    freq,
    gainDb,
    layer,
    source,
    hintUsed: false,
    boss,
    timeSec,
    choices
  };
}

export function questionTitle(q) {
  if (q.layer === 1) {
    return `${formatHz(q.freq)}'de ${formatDb(Math.abs(q.gainDb)).replace("+", "")}'lik bir değişiklik var. Boost mu, cut mu?`;
  }
  if (q.layer === 2) {
    return `${formatHz(q.freq)}'de ne oldu? Boost mu cut mu, kaç dB?`;
  }
  return "Hangi frekans, boost mu cut mu, kaç dB?";
}

export function modeDescription(q) {
  if (q.layer === 1) return "A/B ile karşılaştır, sadece yönü (boost/cut) şıklardan seç.";
  if (q.layer === 2) return "A/B ile karşılaştır, yönü ve miktarı şıklardan seç.";
  return "A/B ile karşılaştır, frekansı, yönü ve miktarı şıklardan seç.";
}

export function correctLabel(q) {
  const dir = q.gainDb >= 0 ? "Boost" : "Cut";
  return `${formatHz(q.freq)} ${formatDb(q.gainDb)} (${dir})`;
}

// Soruda uygulanan peaking EQ'yu audioCtx üzerinde kurar.
export function applyProcessing(question, { audioCtx }) {
  const f = audioCtx.createBiquadFilter();
  f.type = "peaking";
  f.frequency.value = question.freq;
  f.Q.value = FILTER_Q;
  f.gain.value = question.gainDb;
  // Düzeltme 1 (TUR8-OGRETIM-15-08 bulgusu 🔴, core/eq-loudness.js) — bu modun
  // TEK amacı boost/cut yönünü KULAKLA ayırt ettirmek, loudness ipucu vermemeli.
  // matchLoudness:true → audio-engine.js filtrenin GERÇEK RBJ frekans tepkisinden
  // (tahmini bir sabit DEĞİL) bir telafi kazancı hesaplayıp wet yola ekler.
  return { filters: [f], matchLoudness: true };
}

// SAF FONKSİYON. answer şekli katmana göre değişir:
//   Katman 1: "boost"|"cut" ya da { direction }
//   Katman 2: sayı (işaretli dB) ya da { gainDb }
//   Katman 3: { freq, gainDb }
export function evaluateAnswer(question, answer) {
  const trueDirection = question.gainDb >= 0 ? "boost" : "cut";

  if (question.layer === 1) {
    const guessDirection = answer && typeof answer === "object" ? answer.direction : answer;
    const correct = guessDirection === trueDirection;
    return { mode: "boostcut", layer: 1, correct, directionOk: correct, guessDirection };
  }

  if (question.layer === 2) {
    const guessGain = answer && typeof answer === "object" ? answer.gainDb : answer;
    const diff = Math.abs(guessGain - question.gainDb);
    const correct = diff <= GAIN_TOLERANCE;
    const directionOk = Math.sign(guessGain) === Math.sign(question.gainDb);
    return { mode: "boostcut", layer: 2, correct, directionOk, diff, guessGain };
  }

  // Katman 3
  const guessFreq = answer && typeof answer === "object" ? answer.freq : NaN;
  const guessGain = answer && typeof answer === "object" ? answer.gainDb : NaN;
  const dOct = Math.abs(Math.log2(guessFreq / question.freq));
  const freqOk = dOct <= FREQ_TOLERANCE_OCT;
  const diff = Math.abs(guessGain - question.gainDb);
  const gainOk = diff <= GAIN_TOLERANCE;
  const directionOk = Math.sign(guessGain) === Math.sign(question.gainDb);
  const correct = freqOk && gainOk;
  return {
    mode: "boostcut", layer: 3, correct, freqOk, gainOk, directionOk,
    dOct, diff, guessFreq, guessGain, zone: faZoneOf(question.freq)
  };
}

// Katman ne kadar zorsa (daha fazla bilinmeyen) o kadar fazla XP — AYNI zorluk
// tier'ında Katman 1 (yalnızca ikili bir seçim) ile Katman 3'ü (üç bilinmeyen)
// eşit ödüllendirmek adaletsiz olurdu, bkz. dosya başı not.
const LAYER_XP_MULTIPLIER = { 1: 0.6, 2: 1.0, 3: 1.5 };

// SÖZLEŞMENİN DIŞINDA (G81): geri bildirim kartındaki XP kırılımı ("taban XP ×
// comboBoost × ...") gerçek sayılardan gelsin diye — calculateXP'nin İÇİNDEKİ
// `base` hesabının (katman çarpanı DAHİL) AYNI kopyası, app.js'in UYDURMADAN
// okuyabilmesi için ayrı bir pure export. calculateXP'nin KENDİSİ TEK SATIR
// değişmedi (davranış/testler etkilenmez).
export function xpBase(question, level) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  return diff.xp * (LAYER_XP_MULTIPLIER[question.layer] || 1);
}

export function calculateXP(question, result, hintUsed, level, context = {}) {
  if (!result || !result.correct) return 0;
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const combo = context.combo || 0;
  const timeLeft = context.timeLeft || 0;
  const roundDuration = context.roundDuration || 0;
  const xpMultiplier = context.xpMultiplier || 1;

  const base = diff.xp * (LAYER_XP_MULTIPLIER[question.layer] || 1);
  const comboBoost = Math.min(2.4, 1 + combo * 0.12);
  const hintPenalty = hintUsed ? 0.5 : 1;
  const bossBoost = question.boss ? 1.65 : 1;
  const timeBoost = timeLeft > roundDuration * 0.55 ? 1.2 : 1;

  const raw = Math.round(base * comboBoost * hintPenalty * bossBoost * timeBoost * xpMultiplier);
  return Math.max(0, raw);
}

// ═══════════════════════════════════════════════════════════════════════════
// ÖĞRETİCİ METİN ŞABLONLARI — TEK YERDE. Diğer üç modla AYNI dürüstlük notu:
// makul bir BAŞLANGIÇ, kesin nihai metin iddia edilmiyor. Teknik jargon yok,
// mix diliyle algısal etki anlatılıyor.
// ═══════════════════════════════════════════════════════════════════════════

const DIRECTION_WORD = { boost: "boost", cut: "cut" };
const DIRECTION_EFFECT = {
  boost: "Boost sesi öne çıkarır, mix'te daha baskın yapar",
  cut: "Cut sesi geri çeker, mix'te daha az yer kaplatır"
};
function magnitudeWord(absDb) {
  if (absDb < 2) return "ince bir dokunuş — dikkatli dinlemeden fark edilmez";
  if (absDb < 5) return "belirgin bir değişim — o bölgeyi net biçimde öne çıkarır/geri çeker";
  return "çok belirgin bir değişim — mix dengesini gözle görülür şekilde değiştirir";
}

// SAF FONKSİYON. Katmana göre 4 olası durum: doğru / yön yanlış / miktar
// yanlış / frekans yanlış (sadece Katman 3'te mümkün).
export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);
  const trueDir = question.gainDb >= 0 ? "boost" : "cut";
  const zone = faZoneOf(question.freq);
  const zoneName = zone.t.split(" (")[0];

  if (result.correct) {
    return `${correctLabel(question)} — ${zoneName} bölgesinde ${magnitudeWord(Math.abs(question.gainDb))}.`;
  }

  if (question.layer === 1) {
    const guessDir = result.guessDirection === "boost" || result.guessDirection === "cut" ? result.guessDirection : "?";
    return `Ters yön — bu ${DIRECTION_WORD[trueDir]}'tu, sen ${DIRECTION_WORD[guessDir] || guessDir} dedin. ${DIRECTION_EFFECT[trueDir]}.`;
  }

  if (question.layer === 2) {
    if (!result.directionOk) {
      const guessDir = result.guessGain >= 0 ? "boost" : "cut";
      return `Ters yön — bu ${DIRECTION_WORD[trueDir]}'tu, sen ${DIRECTION_WORD[guessDir]} dedin. ${DIRECTION_EFFECT[trueDir]}.`;
    }
    return `${formatDb(result.guessGain)} dedin ama ${formatDb(question.gainDb)}'ti — ${magnitudeWord(Math.abs(question.gainDb))}.`;
  }

  // Katman 3
  if (!result.freqOk) {
    return `Frekansı kaçırdın — doğru ${formatHz(question.freq)} (${zoneName}), sen ${Number.isFinite(result.guessFreq) ? formatHz(result.guessFreq) : "?"} dedin.`;
  }
  if (!result.directionOk) {
    const guessDir = result.guessGain >= 0 ? "boost" : "cut";
    return `Frekansı doğru buldun ama yön ters — bu ${DIRECTION_WORD[trueDir]}'tu, sen ${DIRECTION_WORD[guessDir]} dedin. ${DIRECTION_EFFECT[trueDir]}.`;
  }
  return `Frekans ve yön doğruydu, miktarı kaçırdın — ${formatDb(result.guessGain)} dedin ama ${formatDb(question.gainDb)}'ti (${zoneName}).`;
}

export function getFeedbackData(question, answer, context = {}) {
  const result = evaluateAnswer(question, answer);
  const gained = context.gained || 0;
  const text = teachingText(question, answer);

  if (result.correct) {
    return { result, title: "Doğru!", detail: `${text} (+${gained} XP)`, showResult: true, panel: null };
  }
  const title = question.layer === 3 && !result.freqOk ? "Frekansı kaçırdın"
    : !result.directionOk ? "Ters yöne gittin"
    : "Yakın ama kaçtı";
  return { result, title, detail: text, showResult: true, panel: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// SÖZLEŞMENİN DIŞINDA: bu moda özgü render/UI yardımcıları.
// ═══════════════════════════════════════════════════════════════════════════

// İpucu, katmana göre kısmi yardım — hiçbir zaman tam cevabı vermez:
// Katman 1/2'de yönü söyler (zaten bulunması gereken şeyin bir kısmı); Katman
// 3'te frekans BÖLGESİNİ söyler (Kesim Noktası'nın bölge ipucuyla AYNI seviye).
export function getHintText(question) {
  if (question.layer === 3) return faZoneOf(question.freq).t.split(" (")[0];
  return question.gainDb >= 0 ? "Boost (+)" : "Cut (−)";
}

// Bu modda frekans-bandı ipucu maskesi kavramı yok — sadece metin ipucu yeterli.
export function renderHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}
export function clearHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}

export function renderGuessAreaControls(freqGuessAreaEl) {
  if (!freqGuessAreaEl) return;
  freqGuessAreaEl.textContent = "";
  freqGuessAreaEl.classList.add("hidden");
}

// Şıklı cevap grid'ini katmana göre kurar — data-attribute'lar app.js'in
// click-delegasyonunda answer'ı yeniden kurmak için okunur.
export function renderAnswerChoices(answersEl, q) {
  if (!answersEl) return;
  if (!q.choices) { answersEl.innerHTML = ""; answersEl.classList.add("hidden"); return; }
  answersEl.className = "answers";

  if (q.layer === 1) {
    answersEl.innerHTML = q.choices.map(c => {
      const label = c.direction === "boost" ? "Boost" : "Cut";
      return `<button type="button" class="ans" data-direction="${c.direction}"><b>${label}</b></button>`;
    }).join("");
    return;
  }

  if (q.layer === 2) {
    answersEl.innerHTML = q.choices.map(c => {
      const dir = c.gainDb >= 0 ? "Boost" : "Cut";
      return `<button type="button" class="ans" data-gain="${c.gainDb}"><b>${formatDb(c.gainDb)}</b><span>${dir}</span></button>`;
    }).join("");
    return;
  }

  // Katman 3
  answersEl.innerHTML = q.choices.map(c => {
    const dir = c.gainDb >= 0 ? "Boost" : "Cut";
    return `<button type="button" class="ans" data-freq="${c.freq}" data-gain="${c.gainDb}">` +
      `<b>${formatHz(c.freq)}</b><span>${formatDb(c.gainDb)} ${dir}</span></button>`;
  }).join("");
}

// Cevap verildikten sonra .ans butonlarını doğru/yanlış/seçili olarak işaretler.
export function markAnswerChoices(answersEl, q, picked) {
  if (!answersEl || !q.choices) return;
  Array.from(answersEl.querySelectorAll(".ans")).forEach(btn => {
    btn.classList.remove("pick");
    btn.disabled = true;

    if (q.layer === 1) {
      const dir = btn.dataset.direction;
      const trueDir = q.gainDb >= 0 ? "boost" : "cut";
      if (dir === trueDir) btn.classList.add("right");
      else if (picked && (typeof picked === "object" ? picked.direction : picked) === dir) btn.classList.add("wrong");
      return;
    }

    if (q.layer === 2) {
      const g = Number(btn.dataset.gain);
      const pickedGain = picked && typeof picked === "object" ? picked.gainDb : picked;
      if (Math.abs(g - q.gainDb) <= GAIN_TOLERANCE) btn.classList.add("right");
      else if (pickedGain != null && Math.abs(g - pickedGain) < 1e-9) btn.classList.add("wrong");
      return;
    }

    // Katman 3
    const f = Number(btn.dataset.freq);
    const g = Number(btn.dataset.gain);
    const pickedFreq = picked && typeof picked === "object" ? picked.freq : null;
    const pickedGain = picked && typeof picked === "object" ? picked.gainDb : null;
    if (Math.abs(f - q.freq) < 1e-6 && Math.abs(g - q.gainDb) < 1e-6) btn.classList.add("right");
    else if (pickedFreq != null && Math.abs(f - pickedFreq) < 1e-6 && Math.abs(g - pickedGain) < 1e-6) btn.classList.add("wrong");
  });
}

// G83: eski YEREL eksen çizici (AXIS_TICKS/drawAxis) kaldırıldı — artık
// frekans-bulma.js:drawSpectrumBackground'ın MERKEZİ eksenini kullanıyor
// (bkz. app.js:drawVisualizer).

// Cevap sonrası bell-eğrisi — Frekans Bulma'nın getEqCurveForQuestion'ıyla AYNI
// teknik (GERÇEK BiquadFilterNode + getFrequencyResponse, elle yaklaşıklık
// değil), Kesim Noktası'nın İKİ RENKLİ (senin/doğru) deseniyle birleştirilmiş.
const CURVE_POINTS = 160;
function computeEqCurveDb(audioCtx, freq, gainDb, w) {
  if (!audioCtx || !Number.isFinite(freq) || !Number.isFinite(gainDb)) return null;
  const freqs = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) freqs[i] = faXToF((i / (CURVE_POINTS - 1)) * w, w);
  const mag = new Float32Array(CURVE_POINTS);
  const phase = new Float32Array(CURVE_POINTS);
  const filter = audioCtx.createBiquadFilter();
  filter.type = "peaking";
  filter.frequency.value = freq;
  filter.Q.value = FILTER_Q;
  filter.gain.value = gainDb;
  filter.getFrequencyResponse(freqs, mag, phase);
  const db = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) db[i] = 20 * Math.log10(Math.max(mag[i], 1e-6));
  return db;
}

// Frekans Bulma'nın drawEqResponseCurve'üyle AYNI ±maxAbsDb/merkez-çizgi eşlemesi
// (peaking İKİ yönlü — boost yukarı çıkıntı, cut aşağı çukur, Kesim Noktası'nın
// HPF/LPF'i için kullandığı tek-yönlü eşlemenin AKSİNE).
const MAX_ABS_DB = 12;
function drawBellCurve(ctx2d, w, h, db, color, alpha) {
  const plotBottom = h - AXIS_H;
  const curveTop = CURVE_TOP, curveBottom = plotBottom - 6;
  const midY = curveTop + (curveBottom - curveTop) * 0.55;
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

function drawCurveLegend(ctx2d, w, showGuess) {
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
// Sadece cevap sonrası çizilir. state: { audioCtx, activeQuestion, roundActive,
// boostCutGuess } — boostCutGuess app.js'te submitBoostCutGuess'in KATMANA göre
// normalize ettiği {freq, gainDb} (bkz. o fonksiyonun notu) — Katman 1/2'de
// freq her zaman question.freq (kullanıcı guess ETMEDİ), Katman 3'te
// kullanıcının guess ettiği freq.
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  // G83: eksen artık app.js'ten MERKEZİ çiziliyor — burada TEKRAR çağrılırsa
  // ızgara İKİ KEZ çizilirdi.
  const { audioCtx, activeQuestion: q, roundActive, boostCutGuess } = state;
  if (!q || roundActive) return;

  const correctDb = computeEqCurveDb(audioCtx, q.freq, q.gainDb, w);
  const guessDb = boostCutGuess ? computeEqCurveDb(audioCtx, boostCutGuess.freq, boostCutGuess.gainDb, w) : null;
  if (!correctDb && !guessDb) return;

  if (guessDb) drawBellCurve(ctx2d, w, h, guessDb, GUESS_COLOR, 0.85);
  if (correctDb) drawBellCurve(ctx2d, w, h, correctDb, CORRECT_COLOR, 0.85);

  drawCurveLegend(ctx2d, w, !!guessDb);
}

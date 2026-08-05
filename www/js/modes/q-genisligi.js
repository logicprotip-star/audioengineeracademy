// "Q Genişliği" — EQ bandının GENİŞLİK KARAKTERİNİ tanıma modu. Boost mu Cut mu
// ile AYNI peaking-EQ motorunu kullanır ama sorulan eksen FARKLI: orada boost/cut
// yönü+miktarı+frekans soruluyordu, burada Q (genişlik) — kullanıcı SAYISAL bir
// değer değil, MİX DİLİNDE bir ETİKET (Notch/Dar/Orta/Geniş/Çok Geniş) seçiyor.
// SoundGym'de Q/bandwidth ölçen bir oyun YOK — bu ÖZGÜN.
//
// İZOLASYON İLKESİ (öğrenme sinyali temiz kalsın): gain HER ZAMAN sabit büyüklükte
// (Q_GAIN_DB) — genişlik algısını gölgelemesin. Frekans kolay/orta zorlukta SABİT
// (Q_FIXED_FREQ, 1 kHz — kullanıcı SAF Q'yu duysun), zorlaştıkça (ISOLATE_UNTIL_
// POSITION'ın ÜSTÜNDE) tüm spektruma (FA_MIN–FA_MAX, Frekans Bulma'nın havuzu)
// yayılır — gerçekçilik zorlukla birlikte artan bir DEĞİŞKEN, "hangi tür" değil
// "ne kadar" ekseninde bir zorluk kararı (Frekans Bulma'nın BOOST_ONLY_
// DIFFICULTIES'iyle AYNI kategori — tier'a bağlı nitel bir kural).
//
// Soru SADE (sadece 2-5 etiket şıkkı), geri bildirim ZENGİN: Q'nun SAYISAL
// karşılığı + frekans + yön + mix anlamı cevap sonrası açıklanıyor — kullanıcının
// kulağı zamanla "Notch = ~Q8-16" gibi kalibre olsun diye.
//
// Mod sözleşmesi diğer dördüyle AYNI (getMeta/createQuestion/applyProcessing/
// evaluateAnswer/calculateXP/getFeedbackData) + aynı-isimli render yardımcıları.
// Merkezi zorluk eğrisine Boost/Cut'ın (G25) BAŞTAN-doğru-kalibrasyon yöntemiyle
// bağlandı — "kolaylaşma yok" invaryantı ikili aramayla ÖNCEDEN sağlandı.
//
// SADECE ŞIKLI (choiceOnly:true) — diğer üç yeni modla AYNI karar.

import { shuffle, formatHz, logFreq } from "../core/utils.js";
import { SOURCE_GROUPS } from "../core/source-catalog.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound } from "./frekans-bulma.js";
import { logLerp, applyPostCapFloor, representativeLevelForTier } from "../core/difficulty-curve.js";

// app.js'in GENEL görselleştiricisi (drawVisualizer/drawSpectrumBars) BU sabitleri
// HER moddan mode-agnostik olarak okur — diğer üç modla AYNI re-export deseni.
export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound };

export const MODE_ID = "q-genisligi";
export const MAX_LIVES = 5;

// ═══════════════════════════════════════════════════════════════════════════
// GENİŞLİK ETİKETLERİ — TEK doğruluk kaynağı. Sınırlar Q ekseninde (büyük=dar/
// cerrahi, küçük=geniş/müzikal) ARDIŞIK ve BİTİŞİK aralıklar — her Q değeri TAM
// BİR etikete düşer, iki etiket arasında boşluk/çakışma YOK (labelIndexForQ'nun
// doğruluğu buna dayanıyor). Sayılar KULAKLA DOĞRULANMADI — spec'in "Notch ~8-12/
// Dar ~3-5/Geniş ~0.5-1" aralıklarına makul bir başlangıç noktası, "Orta" ve "Çok
// Geniş" (spec'in "belki 4-5 kademe" notuyla istenen granülerlik) araya/uca eklendi.
const LABELS = [
  { id: "notch", tr: "Notch", qMin: 7, qMax: 16, mixText: "cerrahi bir müdahale — tek bir rezonansı/uğultuyu avlar, mix'in geri kalanına neredeyse hiç dokunmaz" },
  { id: "dar", tr: "Dar", qMin: 3, qMax: 7, mixText: "hedefli bir düzeltme — dar bir bölgeyi düzeltir, komşu frekanslara sızma az" },
  { id: "orta", tr: "Orta", qMin: 1.3, qMax: 3, mixText: "dengeli bir müdahale — ne çok cerrahi ne çok müzikal, genel amaçlı" },
  { id: "genis", tr: "Geniş", qMin: 0.5, qMax: 1.3, mixText: "müzikal bir renklendirme — geniş bir bölgenin genel tonunu şekillendirir" },
  { id: "cokgenis", tr: "Çok Geniş", qMin: 0.2, qMax: 0.5, mixText: "çok geniş bir ton eğimi — neredeyse bir shelf gibi davranır, tüm bölgeyi yumuşakça renklendirir" }
].map(l => ({ ...l, qCenter: Math.sqrt(l.qMin * l.qMax) }));

export const MIN_Q = LABELS[LABELS.length - 1].qMin;
export const MAX_Q = LABELS[0].qMax;

// SAF FONKSİYON. Her Q TAM BİR etikete düşer (üst sınır bir SONRAKİ etiketin alt
// sınırıyla ORTAK — dizinin en sonunda son etiketin qMax'ı DAHİL, gerisi hariç).
export function labelIndexForQ(q) {
  for (let i = 0; i < LABELS.length; i++) {
    const isLast = i === LABELS.length - 1;
    if (q >= LABELS[i].qMin && (isLast ? q <= LABELS[i].qMax : q < LABELS[i].qMax)) return i;
  }
  return q < MIN_Q ? LABELS.length - 1 : 0;
}

export function labelById(id) {
  return LABELS.find(l => l.id === id) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// İZOLASYON + GAIN — Q dışındaki her şey sabit tutulur ki öğrenme sinyali saf
// kalsın. Frekans SADECE zorluk ISOLATE_UNTIL_POSITION'ı GEÇİNCE serbest kalır.
export const Q_FIXED_FREQ = 1000; // Hz — nötr bir referans (1 kHz)
export const Q_GAIN_DB = 6; // dB — her zaman aynı büyüklük, yön (boost/cut) rastgele

// gainDb HİÇBİR ZAMAN eğriden gelmiyor (bilerek — Q dışındaki HER eksen sabit
// kalmalı, "izole Q" ilkesinin bir parçası, zorlukla da DEĞİŞMEZ).
const FILTER_Q_MIN_SAFE = 0.1; // BiquadFilterNode.Q'nun pratik alt sınırı

// ═══════════════════════════════════════════════════════════════════════════
// STATİK DIFFICULTY — diğer dört modla AYNI ikili rol: (a) settings.
// difficultyPosition verilmezse fallback, (b) "Sabit" modun tier-adı çapası,
// (c) proplus için tek kaynak (eğri proplus'a hiç uygulanmıyor, Z5 kararı).
// options: kaç etiket şık olarak gösteriliyor (2..5). edgeMargin: true Q'nun
// KENDİ etiketinin en yakın komşu-sınırına ne kadar YAKLAŞABİLECEĞİ (log2(Q)
// biriminde) — küçük=zor (sınıra daha yakın, ayırt etmesi zor).
//
// KULAKLA DOĞRULANMADI — diğer dört modun AYNI dürüstlük notu.
export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 14, options: 2, time: 14, lives: MAX_LIVES, edgeMargin: 0.55 },
  medium: { label: "Orta", xp: 22, options: 3, time: 12, lives: MAX_LIVES, edgeMargin: 0.35 },
  hard: { label: "Zor", xp: 32, options: 4, time: 10, lives: MAX_LIVES, edgeMargin: 0.20 },
  pro: { label: "Pro", xp: 46, options: 5, time: 8, lives: MAX_LIVES, edgeMargin: 0.08 },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 46, options: 5, time: 8, lives: MAX_LIVES, edgeMargin: 0.08 }
};

// ═══════════════════════════════════════════════════════════════════════════
// ZORLUK EĞRİSİ — Boost/Cut'ın (G25) BAŞTAN-doğru-kalibrasyon yöntemiyle bağlanan
// 3. mod (dB Seviyesi/Boost-Cut'tan sonra). AT_1'ler statik easy değerleriyle
// birebir aynı. AT_CAP'lar ikili aramayla, representativeLevelForTier'ın HİÇBİR
// temsilci seviyesinde eski statik tablodan kolay çıkmayacak şekilde çözüldü
// (options: ikili arama >=6.7 gerektirdi — Math.round'un kaba/tamsayı yuvarlaması
// yüzünden hard'ın [12] TAM 4'e ulaşması için 5.15 gibi "ince" bir AT_CAP yetmedi,
// bkz. commit mesajı).
export const Q_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  OPTIONS_AT_1: 2,
  OPTIONS_AT_CAP: 6.7,

  EDGE_MARGIN_AT_1: 0.55,
  EDGE_MARGIN_AT_CAP: 0.065,
  EDGE_MARGIN_FLOOR: 0.05,
  EDGE_MARGIN_REDUCTION_PER_STEP: 0.002,

  TIME_SEC_AT_1: 14,
  TIME_SEC_AT_CAP: 8,
  TIME_SEC_FLOOR: 6,
  TIME_SEC_REDUCTION_PER_STEP: 0.1
};

// Frekans SADECE bu zorluk konumunu (temsilci "medium" seviyesi, 8) GEÇİNCE
// serbest kalır — "hangi tür" (izole mi serbest mi) kararı, "ne kadar" değil,
// Frekans Bulma'nın BOOST_ONLY_DIFFICULTIES'iyle AYNI kategori bir eşik.
export const ISOLATE_UNTIL_POSITION = representativeLevelForTier("medium");

// SAF FONKSİYON. position: zorlukKonumu — diğer dört modun
// paramsForDifficultyPosition'ıyla AYNI mod-agnostik girdi.
export function paramsForDifficultyPosition(position, config = Q_CURVE_CONFIG) {
  const safePos = Math.max(1, position);
  const cappedPos = Math.min(safePos, config.LEVEL_CAP);
  const t = config.LEVEL_CAP > 1 ? (cappedPos - 1) / (config.LEVEL_CAP - 1) : 1;

  const optionsCurve = logLerp(config.OPTIONS_AT_1, config.OPTIONS_AT_CAP, t);
  const edgeMarginCurve = logLerp(config.EDGE_MARGIN_AT_1, config.EDGE_MARGIN_AT_CAP, t);
  const timeCurve = logLerp(config.TIME_SEC_AT_1, config.TIME_SEC_AT_CAP, t);

  return {
    position: safePos,
    options: Math.max(2, Math.min(LABELS.length, Math.round(optionsCurve))),
    edgeMargin: applyPostCapFloor(edgeMarginCurve, safePos, config.LEVEL_CAP, config.EDGE_MARGIN_FLOOR, config.EDGE_MARGIN_REDUCTION_PER_STEP),
    timeSec: applyPostCapFloor(timeCurve, safePos, config.LEVEL_CAP, config.TIME_SEC_FLOOR, config.TIME_SEC_REDUCTION_PER_STEP),
    isolate: safePos <= ISOLATE_UNTIL_POSITION
  };
}

// SAF FONKSİYON. correctIndex'e göre count-1 çeldirici index seçer — tercih
// edilen index-mesafesi (preferredDistance) BÜYÜKSE (kolay) UÇLARDAN, KÜÇÜKSE
// (zor) KOMŞU etiketlerden seçilir (spec: "kolay: Notch vs Geniş = uçlar,
// bariz; zor: Notch vs Dar = komşu, ayırt zor" — birebir bu davranış).
export function pickDistractorIndices(correctIndex, count, preferredDistance) {
  const others = LABELS.map((_, i) => i).filter(i => i !== correctIndex);
  const sorted = others
    .map(i => ({ i, d: Math.abs(i - correctIndex) }))
    .sort((a, b) => Math.abs(a.d - preferredDistance) - Math.abs(b.d - preferredDistance) || a.i - b.i);
  return sorted.slice(0, Math.max(0, count - 1)).map(x => x.i);
}

// options (2-5 arası) → preferredDistance (LABELS.length - options + 1) —
// options=2'de 4 (en uzak iki uç), options=5'te 1 (hepsi zaten gösteriliyor,
// mesafe kararı anlamsızlaşır). Kapalı-form türetildi, ayrı bir eğri
// parametresi GEREKMEDİ.
function preferredDistanceForOptions(options) {
  return Math.max(1, LABELS.length - options + 1);
}

// SAF FONKSİYON. correctIndex'in KENDİ aralığı içinde, komşu çeldiricilerden
// birine (varsa) doğru sınıra edgeMargin kadar YAKLAŞAN bir Q üretir — komşu
// çeldirici YOKSA (kolay, uzak uçlar seçildiğinde) aralığın TAM ORTASINA
// (belirsizlik sıfır) yerleştirir. Hangi Q ÜRETİLİRSE üretilsin, HER ZAMAN
// KENDİ etiketinin sınırları İÇİNDE kalır (labelIndexForQ ile ÇAKIŞMASIZ) —
// FLOOR (edgeMargin'in asla sıfırlanmaması) bunu HİÇBİR zaman ihlal etmez,
// sadece "ne kadar sınıra yakın" ayarlar.
export function pickTrueQ(correctIndex, edgeMargin, distractorIndices, rng = Math.random) {
  const label = LABELS[correctIndex];
  const lo = Math.log2(label.qMin);
  const hi = Math.log2(label.qMax);
  const eps = Math.min(0.01, (hi - lo) * 0.05);
  const safeMargin = Math.min(edgeMargin, (hi - lo) / 2 - eps);

  const hasNarrowerNeighbor = distractorIndices.includes(correctIndex - 1);
  const hasWiderNeighbor = distractorIndices.includes(correctIndex + 1);

  let logQ;
  if (hasNarrowerNeighbor && hasWiderNeighbor) {
    logQ = rng() < 0.5 ? lo + safeMargin : hi - safeMargin;
  } else if (hasNarrowerNeighbor) {
    logQ = lo + safeMargin;
  } else if (hasWiderNeighbor) {
    logQ = hi - safeMargin;
  } else {
    logQ = (lo + hi) / 2;
  }
  logQ = Math.max(lo + eps, Math.min(hi - eps, logQ));
  return Math.max(FILTER_Q_MIN_SAFE, Math.pow(2, logQ));
}

// SAF FONKSİYON.
export function generateChoices(correctIndex, options) {
  const preferredDistance = preferredDistanceForOptions(options);
  const distractorIndices = pickDistractorIndices(correctIndex, options, preferredDistance);
  const all = [correctIndex, ...distractorIndices];
  const choices = all.map(i => ({ id: LABELS[i].id, tr: LABELS[i].tr, correct: i === correctIndex }));
  return { choices: shuffle(choices), distractorIndices };
}

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    motor: 1,
    kulaklikGerekli: false,
    uyumluKaynaklar: SOURCE_GROUPS.flatMap(g => g.sources.map(s => s.id)),
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY,
    choiceOnly: true
  };
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz. settings: { source, boss,
// difficultyPosition — verilirse options/edgeMargin/isolate EĞRİDEN gelir,
// verilmezse (mevcut testler, doğrudan çağrılar, proplus) statik
// DIFFICULTY[level] davranışı korunur }.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "pink";

  const curve = (level !== "proplus" && Number.isFinite(settings.difficultyPosition))
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  const options = curve ? curve.options : diff.options;
  const edgeMargin = curve ? curve.edgeMargin : diff.edgeMargin;
  const timeSec = curve ? curve.timeSec : diff.time;
  const isolate = curve ? curve.isolate : true; // statik/proplus fallback: HER ZAMAN izole (en güvenli/temiz sinyal)

  const correctIndex = Math.floor(Math.random() * LABELS.length);
  const { choices, distractorIndices } = generateChoices(correctIndex, options);
  const q = pickTrueQ(correctIndex, edgeMargin, distractorIndices);

  const direction = Math.random() < 0.5 ? 1 : -1;
  const gainDb = Q_GAIN_DB * direction;
  const freq = isolate ? Q_FIXED_FREQ : logFreq(FA_MIN, FA_MAX);

  return {
    mode: "qwidth",
    difficulty: level,
    freq,
    gainDb,
    q,
    correctIndex,
    isolate,
    source,
    hintUsed: false,
    boss,
    timeSec,
    choices
  };
}

export function modeDescription() {
  return "A/B ile karşılaştır, EQ'nun GENİŞLİK karakterini (Notch/Dar/Orta/Geniş) şıklardan seç.";
}

export function correctLabel(question) {
  const label = LABELS[question.correctIndex];
  const dir = question.gainDb >= 0 ? "Boost" : "Cut";
  return `${label.tr} (Q: ${question.q.toFixed(1)}, ${formatHz(question.freq)}, ${dir})`;
}

// Soruda uygulanan peaking EQ'yu audioCtx üzerinde kurar.
export function applyProcessing(question, { audioCtx }) {
  const f = audioCtx.createBiquadFilter();
  f.type = "peaking";
  f.frequency.value = question.freq;
  f.Q.value = question.q;
  f.gain.value = question.gainDb;
  return { filters: [f] };
}

// SAF FONKSİYON. answer: etiket id'si (string, "notch"/"dar"/...) ya da {id}.
export function evaluateAnswer(question, answer) {
  const guessId = answer && typeof answer === "object" ? answer.id : answer;
  const correctId = LABELS[question.correctIndex].id;
  const correct = guessId === correctId;
  return { mode: "qwidth", correct, guessId, correctId };
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
// ÖĞRETİCİ METİN — soru SADE, geri bildirim ZENGİN: Q'nun SAYISAL karşılığı +
// frekans + yön + mix anlamı TEK yerde, HER zaman (doğru/yanlış fark etmeksizin)
// gösterilir — kullanıcının kulağı "Notch = ~Q8-16" gibi zamanla kalibre olsun.
// ═══════════════════════════════════════════════════════════════════════════

export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);
  const correctLbl = LABELS[question.correctIndex];
  const dirWord = question.gainDb >= 0 ? "boost" : "cut";
  const base = `Bu bir ${correctLbl.tr}'tı (Q: ${question.q.toFixed(1)}) — ${formatHz(question.freq)}'de ${dirWord}. ${correctLbl.mixText}.`;

  if (result.correct) return `Doğru! ${base}`;

  const guessLbl = labelById(result.guessId);
  const guessTxt = guessLbl ? guessLbl.tr : "?";
  return `Yanlış — sen ${guessTxt} dedin. ${base}`;
}

export function getFeedbackData(question, answer, context = {}) {
  const result = evaluateAnswer(question, answer);
  const gained = context.gained || 0;
  const text = teachingText(question, answer);

  if (result.correct) {
    return { result, title: "Doğru!", detail: `${text} (+${gained} XP)`, showResult: true, panel: null };
  }
  return { result, title: "Yanlış genişlik", detail: text, showResult: true, panel: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// SÖZLEŞMENİN DIŞINDA: bu moda özgü render/UI yardımcıları.
// ═══════════════════════════════════════════════════════════════════════════

// İpucu — genişlik etiketini ASLA vermez (o zaten sorunun kendisi), sadece
// YÖNÜ söyler (Boost/Cut modundaki Katman 1/2'nin AYNI kısmi-yardım ilkesi).
export function getHintText(question) {
  return question.gainDb >= 0 ? "Boost (+)" : "Cut (−)";
}

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

// Şıklar SADECE etiket metni taşır — sayısal Q değeri şıklarda YOK (spec'in
// açık isteği, kullanıcı DEĞERİ değil KARAKTERİ tanısın).
export function renderAnswerChoices(answersEl, q) {
  if (!answersEl) return;
  if (!q.choices) { answersEl.innerHTML = ""; answersEl.classList.add("hidden"); return; }
  answersEl.className = "answers";
  answersEl.innerHTML = q.choices.map(c =>
    `<button type="button" class="ans" data-label-id="${c.id}"><b>${c.tr}</b></button>`
  ).join("");
}

export function markAnswerChoices(answersEl, q, picked) {
  if (!answersEl || !q.choices) return;
  const pickedId = picked && typeof picked === "object" ? picked.id : picked;
  const correctId = LABELS[q.correctIndex].id;
  Array.from(answersEl.querySelectorAll(".ans")).forEach(btn => {
    btn.classList.remove("pick");
    btn.disabled = true;
    const id = btn.dataset.labelId;
    if (id === correctId) btn.classList.add("right");
    else if (id === pickedId) btn.classList.add("wrong");
  });
}

// Paylaşılan frekans ekseni — diğer üç modla AYNI (spektrum çubuklarının
// altında/arkasında tutarlı bir eksen kalsın diye).
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

// Cevap sonrası bell-eğrisi — Boost/Cut'ın (G25) computeEqCurveDb/drawBellCurve
// TEKNİĞİYLE AYNI (gerçek BiquadFilterNode + getFrequencyResponse), ama BURADA
// değişen eksen FREKANS/GAIN DEĞİL, Q — dar (yüksek Q) sivri-dik bir tepe/çukur,
// geniş (düşük Q) yayvan bir tümsek üretir; kullanıcı genişlik farkını GÖRSEL de
// görsün diye (spec'in açık isteği).
const CURVE_POINTS = 160;
function computeEqCurveDb(audioCtx, freq, gainDb, qValue, w) {
  if (!audioCtx || !Number.isFinite(freq) || !Number.isFinite(gainDb) || !Number.isFinite(qValue)) return null;
  const freqs = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) freqs[i] = faXToF((i / (CURVE_POINTS - 1)) * w, w);
  const mag = new Float32Array(CURVE_POINTS);
  const phase = new Float32Array(CURVE_POINTS);
  const filter = audioCtx.createBiquadFilter();
  filter.type = "peaking";
  filter.frequency.value = freq;
  filter.Q.value = qValue;
  filter.gain.value = gainDb;
  filter.getFrequencyResponse(freqs, mag, phase);
  const db = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) db[i] = 20 * Math.log10(Math.max(mag[i], 1e-6));
  return db;
}

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

const GUESS_COLOR = "#FFC246"; // --am
const CORRECT_COLOR = "#2BD9A8"; // --gr

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
// Sadece cevap sonrası çizilir. state: { audioCtx, activeQuestion, roundActive,
// qGuessLabelId } — qGuessLabelId app.js'in submitQWidthGuess'te sakladığı,
// kullanıcının SEÇTİĞİ etiket id'si; guess eğrisi o etiketin TEMSİLİ Q'suyla
// (qCenter, kendi aralığının geometrik ortalaması) çizilir — freq/gain HER
// ZAMAN true değerlerle AYNI (kullanıcı onları guess ETMEDİ, sadece genişliği).
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  drawAxis(ctx2d, w, h);
  const { audioCtx, activeQuestion: q, roundActive, qGuessLabelId } = state;
  if (!q || roundActive) return;

  const correctDb = computeEqCurveDb(audioCtx, q.freq, q.gainDb, q.q, w);
  const guessLabel = qGuessLabelId ? labelById(qGuessLabelId) : null;
  const guessDb = guessLabel ? computeEqCurveDb(audioCtx, q.freq, q.gainDb, guessLabel.qCenter, w) : null;
  if (!correctDb && !guessDb) return;

  if (guessDb) drawBellCurve(ctx2d, w, h, guessDb, GUESS_COLOR, 0.85);
  if (correctDb) drawBellCurve(ctx2d, w, h, correctDb, CORRECT_COLOR, 0.85);

  drawCurveLegend(ctx2d, !!guessDb);
}

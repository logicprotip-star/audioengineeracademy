// "Pan Konumu" — tek bir kaynak stereo alanın belirli bir noktasında çalar,
// kullanıcı konumu bulur. dB Seviyesi ŞABLONU izlendi (SHOW_SPECTRUM=false,
// BARE_ANALYZER=true, kendi görseli, choiceOnly:true, difficulty-curve.js'e
// SIFIRDAN bağlanan zorluk eğrisi) — mod sözleşmesi diğer 10 modla BİREBİR aynı.
//
// KAYNAK SORUNU YOK: Web Audio'nun kendi StereoPannerNode'u (pan: -1..1) TEK
// bir mono kaynağı stereo alanda konumlandırmak için ZATEN yeterli — yeni ses
// dosyası GEREKMEDİ.
//
// ŞIK TASARIMI (task'ın kendi tarifi): "tam sol, sol, hafif sol, merkez,
// hafif sağ, sağ, tam sağ gibi — kademe sayısı zorluğa göre artsın." Bu,
// dB Seviyesi'nin "doğru değer + rastgele mesafeli çeldiriciler" desenden
// FARKLI bir mekanik: burada şıkların KENDİSİ -100%..+100% aralığında EŞİT
// ARALIKLI, isimlendirilmiş bir IZGARA (3, 5 ya da 7 kademe) — doğru cevap
// HER ZAMAN ızgaranın TAM ÜZERİNDE bir nokta, hiçbir çeldirici üretme/mesafe
// hesabı YOK. Kademe sayısı arttıkça (3→7) aynı -100%..+100% aralığına daha
// çok nokta sığar, komşu kademeler DOĞAL olarak birbirine yaklaşır — task'ın
// "kolayda uzak, zorda yakın" isteği bu ızgara yoğunluğuyla KARŞILANIYOR,
// ayrı bir tolerans/mesafe eğrisi gerekmiyor. Izgara noktaları MATEMATİKSEL
// olarak birbirinden FARKLI (kesin tam sayı, floating-point risk yok) —
// Tonal Denge'nin (G95) "sabit tolerans, küçülen sinyal" kaybedilemezlik
// hatasına benzer bir risk BURADA YAPISAL OLARAK YOK (bkz. test dosyası).
//
// ŞIKLAR KASITLI OLARAK KARIŞTIRILMIYOR (diğer modların shuffle'ının AKSİNE):
// etiketler ZATEN uzamsal bir sıra taşıyor (Tam Sol→...→Tam Sağ) — bu sırayı
// bozmak gerçek bir pan potunun okunuşunu taklit etmek yerine kafa karıştırırdı.
// Sıra cevabı SIZDIRMIYOR (kullanıcı hangi ETİKETİN doğru olduğunu YİNE
// dinleyerek bulmak zorunda), sadece HANGİ SIRADA gösterildiğini sabitliyor.

import { compatibleSourceIds } from "../core/source-catalog.js";
import { logLerp, applyPostCapFloor } from "../core/difficulty-curve.js";
import { GUESS_COLOR, CORRECT_COLOR } from "../core/feedback-colors.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound } from "./frekans-bulma.js";

// app.js'in GENEL kodu (drawVisualizer/isBossRound/vb.) BU sabitleri HER
// moddan mode-agnostik olarak okur — dB Seviyesi'nin (SHOW_SPECTRUM=false
// olmasına RAĞMEN) AYNI zorunlu re-export deseni (bkz. o dosyanın dosya başı
// notu). mode.isBossRound/mode.FA_ZONES app.js'te KOŞULSUZ çağrılıyor —
// bunlar eksik olsaydı hangi mod aktif olursa olsun ÇÖKERDİ.
export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound };

export const MODE_ID = "pan-konumu";
export const MAX_LIVES = 5;

// G39/dB Seviyesi'nin AYNI deseni — bu mod frekans spektrumu değil, YATAY
// stereo alan konumu sorguluyor, arkadaki FFT spektrum çubukları anlamsız.
export const SHOW_SPECTRUM = false;
export const BARE_ANALYZER = true;

export const EXAM_ENABLED = true;
export const EXAM_DIFFICULTY = "pro";

// dbDelta/gainDb gibi diğer modların KULAKLA DOĞRULANMADI notu burada da
// geçerli — makul bir başlangıç, kesin nihai değer iddia edilmiyor.
export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 16, options: 3, time: 14, lives: MAX_LIVES },
  medium: { label: "Orta", xp: 24, options: 5, time: 12, lives: MAX_LIVES },
  hard: { label: "Zor", xp: 38, options: 7, time: 10, lives: MAX_LIVES },
  pro: { label: "Pro", xp: 54, options: 7, time: 8, lives: MAX_LIVES },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 54, options: 7, time: 8, lives: MAX_LIVES }
};

// ═══════════════════════════════════════════════════════════════════════════
// ZORLUK EĞRİSİ — merkezi kütüphaneye (difficulty-curve.js) diğer modlarla AYNI
// mod-agnostik girdiyle (position) bağlanır. Tek eksen: ızgara KADEME sayısı
// (3→7, tek sayı — merkez noktası her zaman olsun diye). AT_1/AT_CAP statik
// easy/pro ile hizalı.
// ═══════════════════════════════════════════════════════════════════════════
export const PAN_CURVE_CONFIG = {
  LEVEL_CAP: 20,
  STEPS_AT_1: 3,
  STEPS_AT_CAP: 7,
  TIME_SEC_AT_1: 14,
  TIME_SEC_AT_CAP: 8,
  TIME_SEC_FLOOR: 6,
  TIME_SEC_REDUCTION_PER_STEP: 0.1
};

// SAF FONKSİYON. position: zorlukKonumu (continuousLevel + sessionRampOffset) —
// diğer modların paramsForDifficultyPosition'ıyla AYNI mod-agnostik girdi.
export function paramsForDifficultyPosition(position, config = PAN_CURVE_CONFIG) {
  const safePos = Math.max(1, position);
  const cappedPos = Math.min(safePos, config.LEVEL_CAP);
  const t = config.LEVEL_CAP > 1 ? (cappedPos - 1) / (config.LEVEL_CAP - 1) : 1;

  const stepsCurve = logLerp(config.STEPS_AT_1, config.STEPS_AT_CAP, t);
  const timeCurve = logLerp(config.TIME_SEC_AT_1, config.TIME_SEC_AT_CAP, t);

  let steps = Math.round(stepsCurve);
  if (steps % 2 === 0) steps += 1; // her zaman TEK sayı — merkez ("Merkez") her ızgarada bulunsun
  steps = Math.max(3, Math.min(7, steps));

  return {
    position: safePos,
    steps,
    timeSec: applyPostCapFloor(timeCurve, safePos, config.LEVEL_CAP, config.TIME_SEC_FLOOR, config.TIME_SEC_REDUCTION_PER_STEP)
  };
}

// SAF. Kademe sayısına göre isim ızgarası — task'ın kendi "tam sol, sol,
// hafif sol, merkez, hafif sağ, sağ, tam sağ" örneğiyle BİREBİR (7 kademede).
export const PAN_LABELS_BY_STEPS = {
  3: ["Tam Sol", "Merkez", "Tam Sağ"],
  5: ["Tam Sol", "Sol", "Merkez", "Sağ", "Tam Sağ"],
  7: ["Tam Sol", "Sol", "Hafif Sol", "Merkez", "Hafif Sağ", "Sağ", "Tam Sağ"]
};

// SAF. steps kademeyi -100..+100 arasına EŞİT ARALIKLI, TAM SAYIYA yuvarlanmış
// olarak yerleştirir (steps=3/5/7 için hiçbir iki nokta ÇAKIŞMAZ — bkz. test
// dosyasının "hiçbir kademede iki şık aynı cevaba denk gelmiyor" doğrulaması).
export function panGridPercents(steps) {
  const arr = [];
  for (let i = 0; i < steps; i++) {
    const frac = steps === 1 ? 0 : (i / (steps - 1)) * 2 - 1; // -1..1
    arr.push(Math.round(frac * 100));
  }
  return arr;
}

export const PAN_TOLERANCE = 0.5; // ızgara tam sayı — bu SADECE float-güvenlik payı

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    motor: 1,
    kulaklikGerekli: true,
    kulaklikMetni: "Pan konumunu doğru duymak için kulaklık şart — hoparlörde sol/sağ ayrımı odaya, mesafeye göre bozulur.",
    // Tek vuruşluk çok kısa kaynaklar (kick/snare/hihat/tom) konum algısı için
    // YETERSİZ (kulak yönü/genişliği ancak sürekli/uzayan bir sesle net
    // algılar) — G43'ün ("otomatik tek-vuruş bayrağı YANLIŞ dışlama yaptı,
    // Reverb'de snare'i haksız yere elemişti") dersiyle AYNI gerekçeyle
    // otomatik bir bayrak yerine ELLE seçilmiş bir liste (bkz. source-
    // catalog.js compatibleSourceIds'in "only" notu).
    // "upload" HER ZAMAN dahil — Reverb'in AYNI kararı (bkz. reverb.js
    // getMeta): uygulama kullanıcının kendi yüklediği dosyanın süresini
    // yargılayamaz, kısıtlama SADECE gömülü/sentetik kataloğa uygulanır.
    uyumluKaynaklar: compatibleSourceIds({ only: ["pink", "white", "saw", "square", "triangle", "groove", "bass", "bass_alt", "guitar", "vocal", "upload"] }),
    // Diğer on modun AYNI kararı — bu alan GERÇEK kilitlemede kullanılmıyor
    // (grep ile doğrulandı, tek gerçek kaynak core/paywall.js:FREE_MODE_IDS +
    // mode-catalog.js:tier, bkz. frekans-cakismasi.js'in AYNI notu).
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY,
    // Bir pan konumunu "dalgaya tıklayarak" işaretlemenin doğal bir karşılığı
    // yok (dB Seviyesi/Kesim Noktası'yla AYNI karar) — SADECE şıklı.
    choiceOnly: true
  };
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz. settings: { source, boss,
// difficultyPosition — verilirse steps/timeSec EĞRİDEN gelir, verilmezse
// (mevcut testler, doğrudan çağrılar, proplus) statik DIFFICULTY[level]
// davranışı korunur }.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "pink";

  const curve = (level !== "proplus" && Number.isFinite(settings.difficultyPosition))
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  let steps = curve ? curve.steps : diff.options;
  if (steps % 2 === 0) steps += 1;
  steps = Math.max(3, Math.min(7, steps));
  const timeSec = curve ? curve.timeSec : diff.time;

  const percents = panGridPercents(steps);
  const labels = PAN_LABELS_BY_STEPS[steps] || PAN_LABELS_BY_STEPS[7];
  const trueIdx = Math.floor(Math.random() * steps);
  const panPercent = percents[trueIdx];

  // KASITLI OLARAK karıştırılmadı — bkz. dosya başı notu.
  const choices = percents.map((p, i) => ({ value: p, label: labels[i], correct: i === trueIdx }));

  return {
    mode: "pan",
    difficulty: level,
    panPercent,
    steps,
    source,
    hintUsed: false,
    boss,
    timeSec,
    choices
  };
}

function positionWord(panPercent) {
  if (panPercent === 0) return "tam merkezde";
  const side = panPercent < 0 ? "sol" : "sağ";
  const abs = Math.abs(panPercent);
  if (abs >= 90) return `tamamen ${side}da`;
  if (abs >= 50) return `belirgin biçimde ${side}da`;
  return `hafifçe ${side}da`;
}

export function formatPanPercent(panPercent) {
  if (panPercent === 0) return "Merkez";
  const side = panPercent < 0 ? "Sol" : "Sağ";
  return `%${Math.abs(panPercent)} ${side}`;
}

export function correctLabel(q) {
  return formatPanPercent(q.panPercent);
}

export function modeDescription(q) {
  return "A/B ile karşılaştır, sesin stereo alandaki konumunu şıklardan seç.";
}

// Soruda uygulanan pan konumunu audioCtx üzerinde kurar — DÜZ tek node
// (StereoPannerNode), diğer modların tek-BiquadFilterNode zincirleriyle AYNI
// basit "filters" şekli, audio-engine.js'in genel seri-zincir sözleşmesine
// TAM uyar, hiçbir özel kablolama gerekmiyor.
export function applyProcessing(question, { audioCtx }) {
  const p = audioCtx.createStereoPanner();
  p.pan.value = question.panPercent / 100;
  return { filters: [p] };
}

// SAF FONKSİYON. answer: { value } ya da doğrudan sayı (pan yüzdesi, -100..100).
export function evaluateAnswer(question, answer) {
  const guessValue = answer && typeof answer === "object" ? answer.value : answer;
  const diff = Math.abs(guessValue - question.panPercent);
  const correct = diff <= PAN_TOLERANCE;
  return {
    mode: "pan",
    correct,
    diff,
    guessValue
  };
}

export function calculateXP(question, result, hintUsed, level, context = {}) {
  if (!result || !result.correct) return 0;
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const combo = context.combo || 0;
  const timeLeft = context.timeLeft || 0;
  const roundDuration = context.roundDuration || 0;
  const xpMultiplier = context.xpMultiplier || 1;

  const base = diff.xp;
  const comboBoost = Math.min(2.4, 1 + combo * 0.12);
  const hintPenalty = hintUsed ? 0.5 : 1;
  const bossBoost = question.boss ? 1.65 : 1;
  const timeBoost = timeLeft > roundDuration * 0.55 ? 1.2 : 1;

  const raw = Math.round(base * comboBoost * hintPenalty * bossBoost * timeBoost * xpMultiplier);
  return Math.max(0, raw);
}

// ═══════════════════════════════════════════════════════════════════════════
// ÖĞRETİCİ METİN — MİX GERÇEKLİĞİ (task'ın kendi notu): pan kararı mix'te alan
// açmak içindir. İki enstrüman aynı frekans bandında çakışıyorsa biri sağa
// biri sola alınır. Merkez kick, bas, vokal ve snare'e ayrılır. Diğer
// modların "makul başlangıç, kesin nihai metin iddia edilmiyor" dürüstlük
// notu burada da geçerli.
// ═══════════════════════════════════════════════════════════════════════════

const MIX_REALITY_NOTE = "Kick, bas, vokal ve snare genelde merkezde kalır — enerjinin çoğu orada, yana alınırsa mix dengesizleşir. İki enstrüman aynı frekans bandında çakışıyorsa biri sağa biri sola alınarak alan açılır.";

export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);
  if (result.correct) {
    return `Doğru — ses ${positionWord(question.panPercent)}. ${MIX_REALITY_NOTE}`;
  }
  const guessLabel = Number.isFinite(result.guessValue) ? formatPanPercent(result.guessValue) : "?";
  return `"${guessLabel}" dedin ama ses ${positionWord(question.panPercent)} (${correctLabel(question)}). ${MIX_REALITY_NOTE}`;
}

export function getFeedbackData(question, answer, context = {}) {
  const result = evaluateAnswer(question, answer);
  const gained = context.gained || 0;
  const text = teachingText(question, answer);

  if (result.correct) {
    return { result, title: "Doğru!", detail: `${text} (+${gained} XP)`, showResult: true, panel: null };
  }
  return { result, title: "Yakın ama kaçtı", detail: text, showResult: true, panel: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// SÖZLEŞMENİN DIŞINDA: bu moda özgü render/UI yardımcıları.
// ═══════════════════════════════════════════════════════════════════════════

export function getHintText(question) {
  return `${question.steps} kademeden biri — ${question.panPercent < 0 ? "sol" : question.panPercent > 0 ? "sağ" : "merkez"} tarafta`;
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

// Şıklı cevap grid'ini kurar — data-value app.js'in click-delegasyonunda
// answer={value} kurmak için okunur. KASITLI SIRALAMA (shuffle YOK, bkz.
// dosya başı notu).
export function renderAnswerChoices(answersEl, q) {
  if (!answersEl) return;
  if (!q.choices) { answersEl.innerHTML = ""; answersEl.classList.add("hidden"); return; }
  answersEl.className = "answers";
  answersEl.innerHTML = q.choices.map(c => {
    return `<button type="button" class="ans" data-value="${c.value}"><b>${c.label}</b></button>`;
  }).join("");
}

export function markAnswerChoices(answersEl, q, picked) {
  if (!answersEl || !q.choices) return;
  const pickedValue = picked && typeof picked === "object" ? picked.value : picked;
  Array.from(answersEl.querySelectorAll(".ans")).forEach(btn => {
    const v = Number(btn.dataset.value);
    btn.classList.remove("pick");
    btn.disabled = true;
    if (Math.abs(v - q.panPercent) <= PAN_TOLERANCE) btn.classList.add("right");
    else if (pickedValue != null && Math.abs(v - pickedValue) < 1e-9) btn.classList.add("wrong");
  });
}

// ---- Cevap sonrası görsel: YATAY stereo alan (SOL–MERKEZ–SAĞ), db-seviyesi.js
// drawDbBars'ın DİKEY yerine YATAY versiyonu — AYNI kırmızı(senin)/yeşil(doğru)
// dil (feedback-colors.js), AYNI "soru sırasında hiçbir ipucu göstermez, sadece
// cevap sonrası" ilkesi.
const FIELD_SIDE_MARGIN = 26;
const FIELD_LABEL_GAP = 26;

function panToX(panPercent, plotLeft, plotRight) {
  const frac = (panPercent + 100) / 200; // 0..1
  return plotLeft + frac * (plotRight - plotLeft);
}

function drawPanField(ctx2d, w, h, opts) {
  const y = h * 0.42;
  const plotLeft = FIELD_SIDE_MARGIN, plotRight = w - FIELD_SIDE_MARGIN;

  ctx2d.strokeStyle = "rgba(255,255,255,.16)";
  ctx2d.lineWidth = 2;
  ctx2d.beginPath();
  ctx2d.moveTo(plotLeft, y);
  ctx2d.lineTo(plotRight, y);
  ctx2d.stroke();

  // ızgara tikleri (soru sırasında da görünür — nötr, cevap SIZDIRMAZ)
  ctx2d.strokeStyle = "rgba(255,255,255,.12)";
  ctx2d.lineWidth = 1;
  [-100, -50, 0, 50, 100].forEach(p => {
    const x = panToX(p, plotLeft, plotRight);
    ctx2d.beginPath();
    ctx2d.moveTo(x, y - 6);
    ctx2d.lineTo(x, y + 6);
    ctx2d.stroke();
  });

  ctx2d.font = "700 11px Inter, sans-serif";
  ctx2d.fillStyle = "#6c7178";
  ctx2d.textAlign = "left";
  ctx2d.fillText("SOL", plotLeft, y + FIELD_LABEL_GAP);
  ctx2d.textAlign = "center";
  ctx2d.fillText("MERKEZ", (plotLeft + plotRight) / 2, y + FIELD_LABEL_GAP);
  ctx2d.textAlign = "right";
  ctx2d.fillText("SAĞ", plotRight, y + FIELD_LABEL_GAP);
  ctx2d.textAlign = "left";

  if (!opts.answered) return;

  // lejant
  let lx = 10;
  const ly = 16;
  const showGuess = opts.guessPercent != null;
  ctx2d.font = "700 12px Inter, sans-serif";
  if (showGuess) {
    ctx2d.fillStyle = GUESS_COLOR; ctx2d.fillText("●", lx, ly); lx += 12;
    ctx2d.fillStyle = "#C7CEDD"; ctx2d.fillText("Senin cevabın", lx, ly);
    lx += ctx2d.measureText("Senin cevabın").width + 16;
  }
  ctx2d.fillStyle = CORRECT_COLOR; ctx2d.fillText("●", lx, ly); lx += 12;
  ctx2d.fillStyle = "#C7CEDD"; ctx2d.fillText("Doğru", lx, ly);

  const cx = panToX(opts.truePercent, plotLeft, plotRight);
  ctx2d.beginPath();
  ctx2d.arc(cx, y, 9, 0, Math.PI * 2);
  ctx2d.fillStyle = "#0a0c0e";
  ctx2d.fill();
  ctx2d.strokeStyle = CORRECT_COLOR;
  ctx2d.lineWidth = 2.5;
  ctx2d.stroke();
  ctx2d.font = "800 12px 'JetBrains Mono', monospace";
  ctx2d.textAlign = "center";
  ctx2d.fillStyle = CORRECT_COLOR;
  ctx2d.fillText(formatPanPercent(opts.truePercent), cx, y - 16);

  if (showGuess) {
    const gx = panToX(opts.guessPercent, plotLeft, plotRight);
    ctx2d.beginPath();
    ctx2d.arc(gx, y, 6, 0, Math.PI * 2);
    ctx2d.fillStyle = GUESS_COLOR;
    ctx2d.fill();
    const closeToTrue = Math.abs(gx - cx) < 26;
    ctx2d.fillStyle = GUESS_COLOR;
    ctx2d.font = "800 11px 'JetBrains Mono', monospace";
    ctx2d.fillText(formatPanPercent(opts.guessPercent), gx, closeToTrue ? y + 32 : y + 22);
  }
  ctx2d.textAlign = "left";
}

// state: { activeQuestion, roundActive, panGuess } — panGuess app.js'te
// submitPanGuess'in kaydettiği KULLANICI cevabı, yeni soru başında null'a döner.
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  const { activeQuestion: q, roundActive, panGuess } = state;
  if (!q) return;
  if (roundActive) {
    drawPanField(ctx2d, w, h, { answered: false });
    return;
  }
  drawPanField(ctx2d, w, h, {
    answered: true,
    truePercent: q.panPercent,
    guessPercent: panGuess != null ? panGuess : null
  });
}

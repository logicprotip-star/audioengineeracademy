// "Pan Konumu" — tek bir kaynak stereo alanın belirli bir noktasında çalar,
// kullanıcı konumu bulur. dB Seviyesi ŞABLONU izlendi (SHOW_SPECTRUM=false,
// BARE_ANALYZER=true, kendi görseli, choiceOnly:true, difficulty-curve.js'e
// SIFIRDAN bağlanan zorluk eğrisi) — mod sözleşmesi diğer 10 modla BİREBİR aynı.
//
// KAYNAK SORUNU YOK: Web Audio'nun kendi StereoPannerNode'u (pan: -1..1) TEK
// bir mono kaynağı stereo alanda konumlandırmak için ZATEN yeterli — yeni ses
// dosyası GEREKMEDİ. (Stereo Genişlik'in AKSİNE, tek kaynaklı panlamada
// hiçbir decorrelation/tarak-filtresi riski YOK — bkz. o dosyanın G120 notu.)
//
// G120 DÜZELTMESİ — ŞIK TASARIMI YENİDEN YAPILDI: İLK sürüm (G118) sabit,
// isimlendirilmiş bir ızgara kullanıyordu ("Tam Sol/Sol/.../Tam Sağ", 3/5/7
// kademe). Task'ın kendi kararıyla artık dB Seviyesi'nin AYNI deseni: pan
// değeri SÜREKLİ bir ölçekte (-100..100 arası herhangi bir tam sayı), şıklar
// bu değerin ETRAFINDA curve-driven bir STEP mesafesinde üretiliyor — kolayda
// şıklar arası fark büyük, zorda küçük (task'ın kendi örneği: "gerçek pan
// %10 ise şıklar %5, %10, %18, %25 gibi"). Doğru cevap ARTIK bir ızgara
// noktası OLMAK ZORUNDA DEĞİL — herhangi bir gerçekçi sayı.

import { shuffle } from "../core/utils.js";
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
// G120 — ZORLUK EĞRİSİ — dB Seviyesi'nin AYNI deseni: SÜREKLİ pan değeri +
// curve-driven şık-mesafesi (STEP). Kademe SAYISI (options) İKİNCİL bir eksen
// olarak KORUNDU (Stereo Genişlik'in AYNI kararı, bkz. o dosyanın notu).
// ═══════════════════════════════════════════════════════════════════════════
export const PAN_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  // Şıklar arası mesafe (yüzde puanı, -100..100 aralığının üzerinde) —
  // AT_1=45 (çok belirgin), AT_CAP=8, FLOOR=6 (PAN_TOLERANCE'tan [2] HER
  // ZAMAN büyük kalacak şekilde seçildi — bkz. aşağıdaki invaryant notu).
  STEP_AT_1: 45,
  STEP_AT_CAP: 8,
  STEP_FLOOR: 6,
  STEP_REDUCTION_PER_STEP: 0.05,

  TIME_SEC_AT_1: 14,
  TIME_SEC_AT_CAP: 8,
  TIME_SEC_FLOOR: 6,
  TIME_SEC_REDUCTION_PER_STEP: 0.1,

  OPTIONS_AT_1: 3,
  OPTIONS_AT_CAP: 7
};

// SAF FONKSİYON. position: zorlukKonumu (continuousLevel + sessionRampOffset) —
// diğer modların paramsForDifficultyPosition'ıyla AYNI mod-agnostik girdi.
export function paramsForDifficultyPosition(position, config = PAN_CURVE_CONFIG) {
  const safePos = Math.max(1, position);
  const cappedPos = Math.min(safePos, config.LEVEL_CAP);
  const t = config.LEVEL_CAP > 1 ? (cappedPos - 1) / (config.LEVEL_CAP - 1) : 1;

  const stepCurve = logLerp(config.STEP_AT_1, config.STEP_AT_CAP, t);
  const timeCurve = logLerp(config.TIME_SEC_AT_1, config.TIME_SEC_AT_CAP, t);
  const optionsCurve = logLerp(config.OPTIONS_AT_1, config.OPTIONS_AT_CAP, t);

  return {
    position: safePos,
    step: applyPostCapFloor(stepCurve, safePos, config.LEVEL_CAP, config.STEP_FLOOR, config.STEP_REDUCTION_PER_STEP),
    timeSec: applyPostCapFloor(timeCurve, safePos, config.LEVEL_CAP, config.TIME_SEC_FLOOR, config.TIME_SEC_REDUCTION_PER_STEP),
    options: Math.max(3, Math.min(7, Math.round(optionsCurve)))
  };
}

// evaluateAnswer'da "doğru" sayılmanın toleransı — STEP_FLOOR'dan (6) HER
// ZAMAN küçük kalacak şekilde seçildi (Kesim Noktası'nın FREQ_TOLERANCE_OCT/
// DISTRACTOR_STEP_OCT AYNI invaryantı) — yanlış bir şıkka basmak asla
// "doğru" sayılmaz (bkz. test dosyasının 1000 denemelik doğrulaması).
export const PAN_TOLERANCE = 2;

// SAF. trueValue etrafında, [min,max] içinde, k·step mesafesinde (k=1,2,...)
// alternan sağa/sola yayılan count-1 çeldirici üretir — Boost/Cut'ın Katman
// 3'teki frekans-havuzu deseniyle AYNI "sınıra göre kırp, taşan adımı diğer
// yöne devret" mantığı: bir yön dolarsa fazla adım DİĞER yöne aktarılır,
// hiçbir çeldirici [min,max] DIŞINA taşmaz. Adımlar TAM k·step mesafede —
// Stereo Genişlik'in generateChoiceValues'ıyla BİREBİR AYNI (bilerek AYRI
// kopya, diğer mod-çiftlerinin (dB Seviyesi/Boost-Cut) desenine UYGUN).
export function generateChoiceValues(trueValue, step, count, min, max) {
  const maxBelow = Math.max(0, Math.floor((trueValue - min) / step));
  const maxAbove = Math.max(0, Math.floor((max - trueValue) / step));
  const offsets = [];
  let below = 1, above = 1;
  while (offsets.length < count - 1 && (below <= maxBelow || above <= maxAbove)) {
    if (above <= maxAbove) { offsets.push(trueValue + above * step); above++; }
    if (offsets.length < count - 1 && below <= maxBelow) { offsets.push(trueValue - below * step); below++; }
  }
  return [trueValue, ...offsets].map(v => Math.round(v));
}

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
    // catalog.js compatibleSourceIds'in "only" notu). "upload" HER ZAMAN
    // dahil — Reverb'in AYNI kararı: uygulama kullanıcının kendi yüklediği
    // dosyanın süresini yargılayamaz. (Stereo Genişlik'in G120'de kaynak
    // listesini daraltmasının AKSİNE, tek-kaynaklı panlamada decorrelation
    // riski hiç yok — bu liste GENİŞ kalabiliyor.)
    // G259 — "bass_alt" kütüphaneden ÇIKARILDI (kaynak dosyası silindi), listeden
    // de düşürüldü — başka HİÇBİR alan/karar değişmedi.
    // G270 — "clean_guitar" (G259'da eklenmişti ama bu listeye HİÇ girmemiş —
    // eksik/unutulmuş bir liste girdisiydi, ölçülen bir davranış değişikliği
    // DEĞİL) ve "arpeggio_guitar" (YENİ kaynak) eklendi — İKİSİ de "guitar"
    // (acoustic_guitar) ile AYNI gerekçeyi karşılıyor: sürekli/uzayan bir
    // enstrüman sesi (tek-vuruş DEĞİL), pan/genişlik algısı için yeterli.
    // Davul kaynakları (kick/snare/hihat/tom) BİLEREK EKLENMEDİ (task'ın
    // kendi sınırı + G43'ün KİLİTLİ kararı, dokunulmadı).
    uyumluKaynaklar: compatibleSourceIds({ only: ["pink", "white", "saw", "square", "triangle", "groove", "bass", "guitar", "clean_guitar", "arpeggio_guitar", "vocal", "upload"] }),
    // Diğer on bir modun AYNI kararı — bu alan GERÇEK kilitlemede
    // kullanılmıyor (grep ile doğrulandı, tek gerçek kaynak core/paywall.js:
    // FREE_MODE_IDS + mode-catalog.js:tier, bkz. frekans-cakismasi.js'in
    // AYNI notu).
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY,
    // Bir pan konumunu "dalgaya tıklayarak" işaretlemenin doğal bir karşılığı
    // yok (dB Seviyesi/Kesim Noktası'yla AYNI karar) — SADECE şıklı.
    choiceOnly: true
  };
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz. settings: { source, boss,
// difficultyPosition — verilirse step/options/timeSec EĞRİDEN gelir,
// verilmezse (mevcut testler, doğrudan çağrılar, proplus) statik
// DIFFICULTY[level] davranışı korunur }.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "pink";

  const curve = (level !== "proplus" && Number.isFinite(settings.difficultyPosition))
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  const step = curve ? curve.step : Math.max(8, Math.round(200 / (diff.options + 1)));
  const options = curve ? curve.options : diff.options;
  const timeSec = curve ? curve.timeSec : diff.time;

  // SÜREKLİ ölçek — herhangi bir -100..100 tam sayısı (task madde 3'ün kendi
  // örneği: "gerçek pan %10 ise şıklar %5, %10, %18, %25 gibi" — true değer
  // YUVARLAK bir ızgara noktası OLMAK ZORUNDA DEĞİL).
  const panPercent = Math.round(Math.random() * 200 - 100);

  const values = generateChoiceValues(panPercent, step, Math.max(3, options), -100, 100);
  const choices = shuffle(values.map(v => ({ value: v, correct: v === panPercent })));
  // Yuvarlama sonrası TEORİK olarak (çok küçük step + kenar durumu) iki
  // değer çakışabilirse diye TEK bir savunma — PRATİKTE STEP_FLOOR>PAN_
  // TOLERANCE invaryantı bunu zaten engelliyor (bkz. test dosyası), yine de
  // sessizce yanlış bir "iki doğru şık" durumuna düşmek yerine engellenir.
  const seen = new Set();
  const dedupedChoices = choices.filter(c => {
    if (seen.has(c.value)) return false;
    seen.add(c.value);
    return true;
  });

  return {
    mode: "pan",
    difficulty: level,
    panPercent,
    source,
    hintUsed: false,
    boss,
    timeSec,
    choices: dedupedChoices
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
  return `%${Math.abs(Math.round(panPercent))} ${side}`;
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
  return question.panPercent === 0 ? "Merkez" : question.panPercent < 0 ? "Sol taraf" : "Sağ taraf";
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
// answer={value} kurmak için okunur.
export function renderAnswerChoices(answersEl, q) {
  if (!answersEl) return;
  if (!q.choices) { answersEl.innerHTML = ""; answersEl.classList.add("hidden"); return; }
  answersEl.className = "answers";
  answersEl.innerHTML = q.choices.map(c => {
    return `<button type="button" class="ans" data-value="${c.value}"><b>${formatPanPercent(c.value)}</b></button>`;
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

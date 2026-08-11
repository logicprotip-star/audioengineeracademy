// "Stereo Genişlik" — iki mono kaynak zıt yönlere yerleştirilir, kullanıcı
// stereo görüntünün genişliğini bulur. %100 = biri tam solda biri tam sağda.
// %0 = ikisi de merkezde (mono). Mod sözleşmesi/zorluk-eğrisi deseni Pan
// Konumu'yla (bu turun ikiz modu) BİREBİR aynı — bkz. o dosyanın dosya başı
// notu, burada TEKRARLANMIYOR, sadece FARKLAR belgelendi.
//
// KAYNAK SORUNU ÇÖZÜLDÜ (task'ın kendi notu): SoundGym'in Stereohead oyunu
// stereo dosya kullanmıyor — İKİ MONO KAYNAĞI zıt yönlere yerleştirip aradaki
// açıklığı değiştiriyor. Yeni ses dosyası eklenmedi, mevcut mono kaynaklar
// yeterli.
//
// DÜRÜSTLÜK NOTU — "iki mono kaynak" NEDEN aynı buffer'ın iki kopyası DEĞİL:
// AYNI mono sinyali ikiye ayırıp bire pan=-1 birine pan=+1 vererek toplamak
// MATEMATİKSEL olarak L=kaynak, R=kaynak (BİREBİR aynı sayı dizisi) üretir —
// bu, bu projenin KENDİ Araçlar mono-uyum ölçümünün (bkz. core/tonal-
// balance.js'in kardeşi, core/analysis.js'in korelasyon ölçümü) tanımıyla
// TAM MONO'dur (korelasyon=1), yani "genişlik" hiç OLUŞMAZ (elle doğrulandı).
// Gerçek/algılanabilir genişlik için iki yol ÇALIŞAN kopyanın ARASINDA
// GERÇEK bir SAYISAL FARK olmalı. Burada standart bir stüdyo tekniği
// kullanıldı ("Haas/mikro-gecikmeli genişletme" — mono kaynağı bir yol
// DOĞRUDAN, diğer yolu KÜÇÜK bir gecikmeyle [≤22ms, füzyon eşiğinin altında
// — hâlâ TEK bir ses gibi algılanır, YANKI gibi değil] çalıp zıt yönlere
// panlamak): width arttıkça HEM pan açıklığı HEM gecikme büyür, width=0'da
// gecikme=0 VE pan=0 olduğu için iki yol yine SAYISAL OLARAK özdeş (GERÇEK
// mono, task'ın "%0 = ikisi de merkezde" tanımıyla TUTARLI), width=100'de
// L SADECE doğrudan yolu, R SADECE gecikmeli yolu taşır (GERÇEKTEN farklı
// sayılar, GERÇEK/ölçülebilir bir stereo görüntü — bkz. test dosyası ve
// DURUM.md'deki korelasyon ölçümü).
//
// MİMARİ NOTU — audio-engine.js:buildQuestionChain'in `filters:[...]` sözleşmesi
// SADECE düz bir seri zincir kurabiliyor, bir kaynağı İÇERDE ikiye ayırıp
// (fan-out) SONRA birleştirmesi (branching) bu döngüyle KURULAMIYOR (elle
// doğrulandı, ara elemanlar arasına audio-engine HER ZAMAN ek bir bypass
// bağlantısı da ekliyor). Bu YÜZDEN G118'de audio-engine.js'e TEK bir yeni
// uzantı noktası eklendi: applyProcessing `{branch:{input,output,nodes}}`
// döndürebilir — mod kendi alt-grafiğini (fan-out+birleştir dahil) TAMAMEN
// kendi içinde kurar, SADECE giriş/çıkış uçlarını dışa verir. Diğer 10+1
// (Pan Konumu) mod bunu hiç kullanmıyor, davranışları değişmedi.

import { compatibleSourceIds } from "../core/source-catalog.js";
import { logLerp, applyPostCapFloor } from "../core/difficulty-curve.js";
import { GUESS_COLOR, CORRECT_COLOR } from "../core/feedback-colors.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound } from "./frekans-bulma.js";

// Pan Konumu'yla AYNI zorunlu re-export — bkz. o dosyanın dosya başı notu
// (app.js mode.isBossRound/mode.FA_ZONES'u HER moddan KOŞULSUZ okuyor).
export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound };

export const MODE_ID = "stereo-genislik";
export const MAX_LIVES = 5;

export const SHOW_SPECTRUM = false;
export const BARE_ANALYZER = true;

export const EXAM_ENABLED = true;
export const EXAM_DIFFICULTY = "pro";

export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 16, options: 3, time: 14, lives: MAX_LIVES },
  medium: { label: "Orta", xp: 24, options: 5, time: 12, lives: MAX_LIVES },
  hard: { label: "Zor", xp: 38, options: 7, time: 10, lives: MAX_LIVES },
  pro: { label: "Pro", xp: 54, options: 7, time: 8, lives: MAX_LIVES },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 54, options: 7, time: 8, lives: MAX_LIVES }
};

// Pan Konumu'nun PAN_CURVE_CONFIG'iyle AYNI şekil (kademe sayısı 3→7) —
// tek fark eksen -100..100 değil 0..100 (genişlik yönsüz, bkz. widthGridPercents).
export const WIDTH_CURVE_CONFIG = {
  LEVEL_CAP: 20,
  STEPS_AT_1: 3,
  STEPS_AT_CAP: 7,
  TIME_SEC_AT_1: 14,
  TIME_SEC_AT_CAP: 8,
  TIME_SEC_FLOOR: 6,
  TIME_SEC_REDUCTION_PER_STEP: 0.1
};

export function paramsForDifficultyPosition(position, config = WIDTH_CURVE_CONFIG) {
  const safePos = Math.max(1, position);
  const cappedPos = Math.min(safePos, config.LEVEL_CAP);
  const t = config.LEVEL_CAP > 1 ? (cappedPos - 1) / (config.LEVEL_CAP - 1) : 1;

  const stepsCurve = logLerp(config.STEPS_AT_1, config.STEPS_AT_CAP, t);
  const timeCurve = logLerp(config.TIME_SEC_AT_1, config.TIME_SEC_AT_CAP, t);

  let steps = Math.round(stepsCurve);
  if (steps % 2 === 0) steps += 1;
  steps = Math.max(3, Math.min(7, steps));

  return {
    position: safePos,
    steps,
    timeSec: applyPostCapFloor(timeCurve, safePos, config.LEVEL_CAP, config.TIME_SEC_FLOOR, config.TIME_SEC_REDUCTION_PER_STEP)
  };
}

// SAF. steps kademeyi 0..100 arasına EŞİT ARALIKLI, TAM SAYIYA yuvarlanmış
// yerleştirir (steps=3/5/7 için hiçbir iki nokta ÇAKIŞMAZ — bkz. test dosyası).
export function widthGridPercents(steps) {
  const arr = [];
  for (let i = 0; i < steps; i++) {
    const frac = steps === 1 ? 0 : i / (steps - 1); // 0..1
    arr.push(Math.round(frac * 100));
  }
  return arr;
}

export const WIDTH_TOLERANCE = 0.5; // ızgara tam sayı — SADECE float-güvenlik payı

// Mikro-gecikme genişletme parametresi — bkz. dosya başı DÜRÜSTLÜK notu.
// 22ms, klasik Haas füzyon eşiğinin (~30ms) altında — hâlâ TEK bir geniş ses
// gibi duyulur, ayrı bir yankı/eko olarak DEĞİL. KULAKLA DOĞRULANMADI, diğer
// tüm sayısal sabitlerle AYNI dürüstlük notu — makul bir başlangıç.
export const MAX_DELAY_SEC = 0.022;
// Birleştirme kazancı — width=0'da iki yol SAYISAL olarak özdeş olduğu için
// toplamda 2x genlik oluşur (kırpılmayı önlemek için 0.5 ile dengelenir);
// width=100'de her kanal SADECE bir yoldan geldiği için biraz daha sessiz
// duyulur (kabul edilebilir bir basitleştirme — task'ın kendi "değerleri sen
// belirle" izniyle, mükemmel seviye telafisi bu modun konusu DEĞİL).
export const MERGE_GAIN = 0.5;

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    motor: 1,
    kulaklikGerekli: true,
    kulaklikMetni: "Genişliği doğru duymak için kulaklık şart — hoparlörde stereo görüntü odaya karışır, fark edilmez.",
    // Pan Konumu'yla AYNI gerekçe/liste — konum/genişlik algısı için süre
    // gerekir, tek vuruşluk kaynaklar (kick/snare/hihat/tom) dışlandı.
    // "upload" HER ZAMAN dahil — Reverb'in AYNI kararı (bkz. o dosyanın
    // getMeta'sı): uygulama kullanıcının kendi dosyasının süresini yargılayamaz.
    uyumluKaynaklar: compatibleSourceIds({ only: ["pink", "white", "saw", "square", "triangle", "groove", "bass", "bass_alt", "guitar", "vocal", "upload"] }),
    ucretsiz: true, // diğer on bir modun AYNI kararı — bkz. pan-konumu.js'in AYNI notu
    videoUrl: "",
    difficulty: DIFFICULTY,
    choiceOnly: true
  };
}

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

  const percents = widthGridPercents(steps);
  const trueIdx = Math.floor(Math.random() * steps);
  const widthPercent = percents[trueIdx];

  // KASITLI OLARAK karıştırılmadı — Pan Konumu'yla AYNI gerekçe: %0→%100
  // artan sırası bir "genişlik kadranı" okur gibi doğal, cevabı SIZDIRMIYOR.
  const choices = percents.map((p, i) => ({
    value: p,
    label: i === 0 ? "Mono (%0)" : i === percents.length - 1 ? "Tam Geniş (%100)" : `%${p}`,
    correct: i === trueIdx
  }));

  return {
    mode: "width",
    difficulty: level,
    widthPercent,
    steps,
    source,
    hintUsed: false,
    boss,
    timeSec,
    choices
  };
}

function widthWord(widthPercent) {
  if (widthPercent === 0) return "tamamen mono (%0)";
  if (widthPercent >= 90) return "tam açık (%100'e yakın)";
  if (widthPercent >= 50) return "belirgin biçimde geniş";
  return "hafif bir genişlik";
}

export function formatWidthPercent(widthPercent) {
  return `%${Math.round(widthPercent)}`;
}

export function correctLabel(q) {
  return formatWidthPercent(q.widthPercent);
}

export function modeDescription(q) {
  return "A/B ile karşılaştır, stereo görüntünün genişliğini şıklardan seç.";
}

// G118 — audio-engine.js'in YENİ branch uzantısı (bkz. dosya başı mimari
// notu). entryTap sourceMix'ten TEK sinyali alır, İKİ yola ayırır: doğrudan
// (panL) ve mikro-gecikmeli (delay→panR) — width büyüdükçe HEM pan açıklığı
// HEM gecikme büyür, width=0'da ikisi de sıfır (iki yol SAYISAL özdeş, GERÇEK
// mono).
export function applyProcessing(question, { audioCtx }) {
  const widthFrac = question.widthPercent / 100;

  const entryTap = audioCtx.createGain();
  entryTap.gain.value = 1;

  const panL = audioCtx.createStereoPanner();
  panL.pan.value = -widthFrac;

  const delayNode = audioCtx.createDelay(0.05);
  delayNode.delayTime.value = widthFrac * MAX_DELAY_SEC;

  const panR = audioCtx.createStereoPanner();
  panR.pan.value = widthFrac;

  const mergeGain = audioCtx.createGain();
  mergeGain.gain.value = MERGE_GAIN;

  entryTap.connect(panL);
  entryTap.connect(delayNode);
  delayNode.connect(panR);
  panL.connect(mergeGain);
  panR.connect(mergeGain);

  return {
    branch: {
      input: entryTap,
      output: mergeGain,
      nodes: [entryTap, panL, delayNode, panR, mergeGain]
    }
  };
}

export function evaluateAnswer(question, answer) {
  const guessValue = answer && typeof answer === "object" ? answer.value : answer;
  const diff = Math.abs(guessValue - question.widthPercent);
  const correct = diff <= WIDTH_TOLERANCE;
  return {
    mode: "width",
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
// ÖĞRETİCİ METİN — MİX GERÇEKLİĞİ (task'ın kendi notu): genişlik kararı mix'te
// derinlik ve alan yaratır ama abartılırsa mono uyumu bozulur — kulüpte ve
// telefonda mix çöker. Bu mod Araçlar'daki mono uyum ölçümüyle (bkz.
// core/analysis.js'in korelasyon/mono-loss ölçümü, Araçlar → Ölçüm Sonuçları
// kartı) AYNI konuyu öğretiyor — bağlantı burada AÇIKÇA kuruluyor.
// ═══════════════════════════════════════════════════════════════════════════

const MIX_REALITY_NOTE = "Genişlik derinlik ve alan katar ama abartılırsa mono uyumu bozulur — kulüpte (sub genelde mono çalar) ve telefonda (tek hoparlör HER ŞEYİ mono çalar) fazla geniş bir mix çöker. Araçlar'daki Ölçüm Sonuçları'nın mono uyum ölçümü tam bu riski gösterir.";

export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);
  if (result.correct) {
    return `Doğru — görüntü ${widthWord(question.widthPercent)}. ${MIX_REALITY_NOTE}`;
  }
  const guessLabel = Number.isFinite(result.guessValue) ? formatWidthPercent(result.guessValue) : "?";
  return `"${guessLabel}" dedin ama görüntü ${widthWord(question.widthPercent)} (${correctLabel(question)}). ${MIX_REALITY_NOTE}`;
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
  return `${question.steps} kademeden biri — ${question.widthPercent === 0 ? "tamamen mono" : question.widthPercent >= 50 ? "geniş taraf" : "dar taraf"}`;
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
    if (Math.abs(v - q.widthPercent) <= WIDTH_TOLERANCE) btn.classList.add("right");
    else if (pickedValue != null && Math.abs(v - pickedValue) < 1e-9) btn.classList.add("wrong");
  });
}

// ---- Cevap sonrası görsel: YATAY stereo alan, Pan Konumu'nun tek-nokta
// deseninin İKİ NOKTALI (±genişlik, simetrik) versiyonu — "iki yana açılan
// iki nokta" (task'ın kendi tarifi, ana ekran ikonuyla AYNI görsel fikir).
const FIELD_SIDE_MARGIN = 26;
const FIELD_LABEL_GAP = 26;

function widthToX(signedPercent, plotLeft, plotRight) {
  const frac = (signedPercent + 100) / 200;
  return plotLeft + frac * (plotRight - plotLeft);
}

function drawWidthField(ctx2d, w, h, opts) {
  const y = h * 0.42;
  const plotLeft = FIELD_SIDE_MARGIN, plotRight = w - FIELD_SIDE_MARGIN;

  ctx2d.strokeStyle = "rgba(255,255,255,.16)";
  ctx2d.lineWidth = 2;
  ctx2d.beginPath();
  ctx2d.moveTo(plotLeft, y);
  ctx2d.lineTo(plotRight, y);
  ctx2d.stroke();

  ctx2d.strokeStyle = "rgba(255,255,255,.12)";
  ctx2d.lineWidth = 1;
  [-100, -50, 0, 50, 100].forEach(p => {
    const x = widthToX(p, plotLeft, plotRight);
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

  // Doğru genişlik — ÇİZGİDE (y), iki simetrik halka.
  const trueXL = widthToX(-opts.truePercent, plotLeft, plotRight);
  const trueXR = widthToX(opts.truePercent, plotLeft, plotRight);
  [trueXL, trueXR].forEach(x => {
    ctx2d.beginPath();
    ctx2d.arc(x, y, 8, 0, Math.PI * 2);
    ctx2d.fillStyle = "#0a0c0e";
    ctx2d.fill();
    ctx2d.strokeStyle = CORRECT_COLOR;
    ctx2d.lineWidth = 2.5;
    ctx2d.stroke();
  });
  ctx2d.font = "800 12px 'JetBrains Mono', monospace";
  ctx2d.textAlign = "center";
  ctx2d.fillStyle = CORRECT_COLOR;
  ctx2d.fillText(formatWidthPercent(opts.truePercent), (trueXL + trueXR) / 2, y - 16);

  if (showGuess) {
    // Senin cevabın — ÇİZGİNİN HEMEN ÜSTÜNDE (yG offset), yeşil halkalarla
    // ÇAKIŞMASIN diye — Pan Konumu'nun tek-nokta deseninden farklı olarak
    // burada İKİ ÇİFT nokta aynı satırda üst üste binebilir, dikey ayrım şart.
    const yG = y - 20;
    const guessXL = widthToX(-opts.guessPercent, plotLeft, plotRight);
    const guessXR = widthToX(opts.guessPercent, plotLeft, plotRight);
    [guessXL, guessXR].forEach(x => {
      ctx2d.beginPath();
      ctx2d.arc(x, yG, 5, 0, Math.PI * 2);
      ctx2d.fillStyle = GUESS_COLOR;
      ctx2d.fill();
    });
    ctx2d.font = "800 11px 'JetBrains Mono', monospace";
    ctx2d.fillStyle = GUESS_COLOR;
    ctx2d.fillText(formatWidthPercent(opts.guessPercent), (guessXL + guessXR) / 2, yG - 10);
  }
  ctx2d.textAlign = "left";
}

// state: { activeQuestion, roundActive, widthGuess } — widthGuess app.js'te
// submitWidthGuess'in kaydettiği KULLANICI cevabı, yeni soru başında null'a döner.
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  const { activeQuestion: q, roundActive, widthGuess } = state;
  if (!q) return;
  if (roundActive) {
    drawWidthField(ctx2d, w, h, { answered: false });
    return;
  }
  drawWidthField(ctx2d, w, h, {
    answered: true,
    truePercent: q.widthPercent,
    guessPercent: widthGuess != null ? widthGuess : null
  });
}

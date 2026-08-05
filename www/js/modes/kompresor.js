// "Kompresör" — Motor 2'nin İLK modu ("Hangisi Farklı", A/B/C karşılaştırma).
// Motor 1'in beş modundan (Frekans Bulma/Kesim Noktası/Q/Boost-Cut/dB) FARKLI bir
// OYUN TİPİ — orada "bir DEĞERİ bul" soruluyordu, burada "ÜÇ sesten FARKLI olanı
// bul" (odd-one-out). Aynı merkezi zorluk eğrisi + geri bildirim akışı + mod
// sözleşmesi ALTYAPISINI kullanıyor — SoundGym'in "Dr. Compressor" oyununun
// felsefesine yakın (ratio farkını tanıma) ama üç-şıklı (%33 şans, BİLEREK zor)
// odd-one-out formatında.
//
// Bu dosya bir ŞABLON niyetiyle yazıldı — Motor 2'nin SONRAKİ modları (Reverb,
// Distortion) AYNI üç-ses/odd-one-out iskeletini (createQuestion'ın variants[]
// şekli, applyProcessing'in previewRatio deseni, app.js'in abToggle 3-yönlü
// genişletmesi) izleyebilir. Şimdilik ortak bir soyutlama ÇIKARILMADI (bu
// projenin YERLEŞİK kararı — "3. modda bile ortak bir özütlemeyi haklı
// çıkaracak kadar gerçek tekrar ağrısı netleşmedi", bkz. submitCutoffGuess/
// submitLevelGuess'in dosya başı notları) — gerçek tekrar ağrısı Motor 2'nin
// 2. modunda netleşirse o zaman ortak bir çekirdek çıkarılabilir.
//
// MANTIK: 3 ses (A/B/C) çalınır, AYNI kaynaktan (kompresyon İZOLE duyulsun —
// kaynak/frekans/gain farkı YOK, SADECE dinamik). İkisi AYNI ratio'da
// sıkıştırılmış, biri (oddIndex, rastgele konumda) FARKLI. Kullanıcı A/B/C
// dinleme kontrolüyle (bkz. app.js: mevcut abToggle 3'e genişletildi) üçünü de
// dinleyip FARKLI olanı üç şıktan (A/B/C, HER ZAMAN tam 3 — 2'ye inmez/4'e
// çıkmaz, "%33 şans kasıtlı zor" spec'in açık isteği) işaretler.
//
// İZOLASYON İLKESİ (Q Genişliği'nin AYNI felsefesi): threshold/knee/attack/
// release HER ZAMAN sabit (COMP_THRESHOLD_DB/KNEE_DB/ATTACK_SEC/RELEASE_SEC) —
// SADECE ratio değişir, zorlukla da SADECE ratio farkı (gap) küçülür. Attack/
// release BİLEREK kısa (SoundGym Dr. Compressor deseni: hızlı attack + orta
// release, pumping/dinamik daralması KOLAY duyulsun).
//
// Soru SADE (3 şık, hep A/B/C), geri bildirim ZENGİN: FARKLI olanın ratio
// değeri + mix anlamı (cerrahi/müzikal DİLİNİN kompresyon karşılığı: ağır/
// hafif kompresyon) cevap sonrası açıklanıyor.
//
// Mod sözleşmesi diğer beşiyle AYNI (getMeta/createQuestion/applyProcessing/
// evaluateAnswer/calculateXP/getFeedbackData) + aynı-isimli render yardımcıları.
// Merkezi zorluk eğrisine Boost/Cut'ın (G25) BAŞTAN-doğru-kalibrasyon + Q
// Genişliği'nin (G29) FELSEFE-öncelikli tasarım dersleriyle bağlandı.
//
// SADECE ŞIKLI (choiceOnly:true) — diğer dört yeni modla AYNI karar.

import { SOURCE_GROUPS } from "../core/source-catalog.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound } from "./frekans-bulma.js";
import { logLerp, applyPostCapFloor } from "../core/difficulty-curve.js";

// app.js'in GENEL görselleştiricisi (drawVisualizer/drawSpectrumBars) BU sabitleri
// HER moddan mode-agnostik olarak okur — diğer beş modla AYNI re-export deseni
// (Kompresör'ün KENDİSİ frekansla İLGİLENMİYOR ama paylaşılan arka plan çizimi
// bunları koşulsuz okuyor).
export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound };

export const MODE_ID = "kompresor";
export const MAX_LIVES = 5;

// ═══════════════════════════════════════════════════════════════════════════
// İZOLASYON + SABİT KOMPRESYON PARAMETRELERİ — Q Genişliği'nin "gain HER ZAMAN
// sabit" ilkesinin bu moddaki karşılığı: ratio DIŞINDAKİ HER şey sabit, hiçbir
// zorlukta değişmez.
export const COMP_THRESHOLD_DB = -20; // dB — orta bir eşik, üç varyantta da AYNI
export const COMP_KNEE_DB = 6; // dB — orta-sert diz, üç varyantta da AYNI
export const COMP_ATTACK_SEC = 0.003; // 3ms — HIZLI, pumping/daralma kolay duyulsun
export const COMP_RELEASE_SEC = 0.15; // 150ms — SoundGym Dr. Compressor'a yakın orta değer
export const COMP_BASE_RATIO = 3.5; // "aynı" ikilinin ratio'su — sabit referans nokta
export const RATIO_MIN = 1; // DynamicsCompressorNode.ratio'nun pratik/spesifikasyon alt sınırı
export const RATIO_MAX = 20; // DynamicsCompressorNode.ratio'nun spesifikasyon üst sınırı

// ═══════════════════════════════════════════════════════════════════════════
// STATİK DIFFICULTY — diğer beş modla AYNI ikili rol: (a) settings.
// difficultyPosition verilmezse fallback, (b) "Sabit" modun tier-adı çapası,
// (c) proplus için tek kaynak (eğri proplus'a hiç uygulanmıyor, Z5 kararı).
// `options` alan adı diğer modlarla AYNI SEBEPTEN korunuyor (app.js:
// renderLevelSheet TÜM modların DIFFICULTY[level].options'ını GENERİK okuyor,
// bkz. q-genisligi.js'in AYNI notu) — Kompresör'de HER ZAMAN 3 (A/B/C, hiç
// değişmiyor, "%33 şans kasıtlı" spec'in AÇIK isteği — Q'nun kademe-büyüyen
// tasarımının AKSİNE, burada büyüyen şey gap'in KENDİSİ/küçülmesi, şık sayısı
// değil).
// gap: FARKLI olanın COMP_BASE_RATIO'dan ne kadar UZAKTA olacağı (ratio
// biriminde) — küçük=zor (üç ses birbirine benziyor).
//
// KULAKLA DOĞRULANMADI — diğer beş modun AYNI dürüstlük notu.
export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 14, options: 3, time: 16, lives: MAX_LIVES, gap: 5.5 },
  medium: { label: "Orta", xp: 22, options: 3, time: 13, lives: MAX_LIVES, gap: 3.0 },
  hard: { label: "Zor", xp: 32, options: 3, time: 11, lives: MAX_LIVES, gap: 1.5 },
  pro: { label: "Pro", xp: 46, options: 3, time: 9, lives: MAX_LIVES, gap: 0.6 },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 46, options: 3, time: 9, lives: MAX_LIVES, gap: 0.6 }
};

// ═══════════════════════════════════════════════════════════════════════════
// ZORLUK EĞRİSİ — Boost/Cut'ın (G25) BAŞTAN-doğru-kalibrasyon yöntemiyle
// bağlanan 5. mod. AT_1 statik easy değeriyle birebir aynı. AT_CAP ikili
// aramayla, representativeLevelForTier'ın HİÇBİR temsilci seviyesinde eski
// statik tablodan kolay çıkmayacak şekilde ÖNCEDEN çözüldü.
export const COMP_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  GAP_AT_1: 5.5,
  GAP_AT_CAP: 0.55,
  GAP_FLOOR: 0.4,
  GAP_REDUCTION_PER_STEP: 0.01,

  TIME_SEC_AT_1: 16,
  TIME_SEC_AT_CAP: 9,
  TIME_SEC_FLOOR: 6,
  TIME_SEC_REDUCTION_PER_STEP: 0.15
};

// SAF FONKSİYON. position: zorlukKonumu — diğer beş modun
// paramsForDifficultyPosition'ıyla AYNI mod-agnostik girdi.
export function paramsForDifficultyPosition(position, config = COMP_CURVE_CONFIG) {
  const safePos = Math.max(1, position);
  const cappedPos = Math.min(safePos, config.LEVEL_CAP);
  const t = config.LEVEL_CAP > 1 ? (cappedPos - 1) / (config.LEVEL_CAP - 1) : 1;

  const gapCurve = logLerp(config.GAP_AT_1, config.GAP_AT_CAP, t);
  const timeCurve = logLerp(config.TIME_SEC_AT_1, config.TIME_SEC_AT_CAP, t);

  return {
    position: safePos,
    gap: applyPostCapFloor(gapCurve, safePos, config.LEVEL_CAP, config.GAP_FLOOR, config.GAP_REDUCTION_PER_STEP),
    timeSec: applyPostCapFloor(timeCurve, safePos, config.LEVEL_CAP, config.TIME_SEC_FLOOR, config.TIME_SEC_REDUCTION_PER_STEP)
  };
}

// SAF FONKSİYON. dB Seviyesi'nin pickDbDelta'sıyla AYNI (G24'te ÖĞRENİLEN
// dersler BAŞTAN uygulandı): ±%6 dar jitter (seans rampasının küçük ama
// gerçek eğilimini BOĞMASIN) + jitter SONRASI GAP_FLOOR garantisi (Math.max) —
// floor'un jitter'la delinmesi G24'te ÖLÇÜLEN gerçek bir hataydı, burada
// baştan önleniyor. Jitter olmasaydı AYNI gap HER ZAMAN AYNI ratio çiftini
// üretirdi (ör. hep "3.5 vs 9.0") — tekrar/ezber riski, dB Seviyesi'nde
// AYNI gerekçeyle çözülmüştü.
export function pickGap(baseGap, rng = Math.random) {
  const jitter = 0.94 + rng() * 0.12; // 0.94x – 1.06x
  const jittered = baseGap * jitter;
  return Math.round(Math.max(COMP_CURVE_CONFIG.GAP_FLOOR, jittered) * 100) / 100;
}

// SAF FONKSİYON. base'den (COMP_BASE_RATIO) rastgele bir yönde (daha ÇOK ya da
// daha AZ sıkıştırılmış) gap kadar uzaklaşan bir ratio üretir — [RATIO_MIN,
// RATIO_MAX] dışına ASLA taşmaz (DynamicsCompressorNode'un geçerli aralığı).
// Kırpma (clamp) FARKLI olanı BAZEN gap'ten daha da belirgin yapabilir (ör.
// gap=5.5, base-gap=-2 → 1'e kırpılır, fark aslında 2.5 olur) — bu YÖNDE bir
// sapma HER ZAMAN daha KOLAY (daha büyük fark) tarafına düşer, asla daha zor
// tarafına, "kolaylaşma yok" invaryantını BOZMAZ.
export function pickOddRatio(base, gap, rng = Math.random) {
  const direction = rng() < 0.5 ? 1 : -1;
  const raw = base + direction * gap;
  return Math.round(Math.min(RATIO_MAX, Math.max(RATIO_MIN, raw)) * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    motor: 2,
    kulaklikGerekli: false,
    uyumluKaynaklar: SOURCE_GROUPS.flatMap(g => g.sources.map(s => s.id)),
    // NOT: mode-catalog.js'te tier:"pro" — ama diğer Pro modlar da (ör. dB
    // Seviyesi) BURADA ucretsiz:true yazıyor; bu alan GERÇEK kilitlemede
    // KULLANILMIYOR (asıl kaynak mode-catalog.js'in `tier` alanı) — mevcut
    // beş modun HEPSİYLE tutarlı kalmak için AYNI değer korundu.
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY,
    choiceOnly: true
  };
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz. settings: { source, boss,
// difficultyPosition — verilirse gap/timeSec EĞRİDEN gelir, verilmezse
// (mevcut testler, doğrudan çağrılar, proplus) statik DIFFICULTY[level]
// davranışı korunur }.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "pink";

  const curve = (level !== "proplus" && Number.isFinite(settings.difficultyPosition))
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  const baseGap = curve ? curve.gap : diff.gap;
  const timeSec = curve ? curve.timeSec : diff.time;

  const oddIndex = Math.floor(Math.random() * 3);
  const gap = pickGap(baseGap);
  const oddRatio = pickOddRatio(COMP_BASE_RATIO, gap);

  const letters = ["A", "B", "C"];
  const variants = letters.map((letter, i) => ({
    letter,
    ratio: i === oddIndex ? oddRatio : COMP_BASE_RATIO
  }));
  const choices = letters.map((letter, i) => ({ id: letter, tr: letter, correct: i === oddIndex }));

  return {
    mode: "kompresor",
    difficulty: level,
    source,
    variants,
    oddIndex,
    hintUsed: false,
    boss,
    timeSec,
    choices
  };
}

export function modeDescription() {
  return "A/B/C ile üçünü de dinle, FARKLI sıkıştırılmış olanı (cerrahi mi müzikal mi) şıklardan seç.";
}

export function correctLabel(question) {
  const odd = question.variants[question.oddIndex];
  return `${odd.letter} (ratio ${odd.ratio.toFixed(1)}:1)`;
}

// Soruda uygulanan kompresyonu audioCtx üzerinde kurar. question.previewRatio
// VERİLİRSE (app.js'in 3-yönlü abToggle'ının o an dinletmek istediği varyant)
// O ratio kullanılır; verilmezse (turun İLK çalışı, henüz hiçbir A/B/C
// butonuna basılmamış) variants[0] (harf A) çalar — kullanıcı A'yı dinleyerek
// başlar, sonra B/C'ye geçebilir.
export function applyProcessing(question, { audioCtx }) {
  const ratio = Number.isFinite(question.previewRatio) ? question.previewRatio : question.variants[0].ratio;
  const comp = audioCtx.createDynamicsCompressor();
  comp.threshold.value = COMP_THRESHOLD_DB;
  comp.knee.value = COMP_KNEE_DB;
  comp.ratio.value = ratio;
  comp.attack.value = COMP_ATTACK_SEC;
  comp.release.value = COMP_RELEASE_SEC;
  return { filters: [comp] };
}

// SAF FONKSİYON. answer: harf ("A"/"B"/"C") ya da {id}.
export function evaluateAnswer(question, answer) {
  const guessLetter = answer && typeof answer === "object" ? answer.id : answer;
  const correctLetter = question.variants[question.oddIndex].letter;
  const correct = guessLetter === correctLetter;
  return { mode: "kompresor", correct, guessLetter, correctLetter };
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
// ÖĞRETİCİ METİN — soru SADE, geri bildirim ZENGİN: FARKLI olanın ratio
// değeri + mix anlamı TEK yerde, HER zaman gösterilir.
// ═══════════════════════════════════════════════════════════════════════════

// SAF FONKSİYON. Mix dili — Kesim Noktası'nın ZONE_EFFECT/Q Genişliği'nin
// mixText desenindeki AYNI TEK-YERDE-şablon felsefesi.
export function compressionWord(ratio) {
  if (ratio < 2) return "hafif kompresyon — dinamik geniş kalır, ses canlı ama kontrolsüz kalabilir, mixte öne fırlayabilir";
  if (ratio < 5) return "orta kompresyon — dengeli, dinamiği hafifçe kontrol altına alır";
  if (ratio < 10) return "belirgin kompresyon — dinamik gözle görülür şekilde daralır, ses mixte oturmaya başlar";
  return "ağır kompresyon — dinamik ÇOK dar, ses tamamen mixte oturur, öne fırlamaz ama tutarlı kalır";
}

export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);
  const odd = question.variants[question.oddIndex];
  const base = `${odd.letter} farklıydı (ratio ${odd.ratio.toFixed(1)}:1) — ${compressionWord(odd.ratio)}.`;

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

// İpucu — HANGİ harf olduğunu ASLA vermez (o zaten sorunun kendisi), sadece
// YÖNÜ söyler (Q Genişliği'nin/Boost-Cut'ın AYNI kısmi-yardım ilkesi).
export function getHintText(question) {
  const odd = question.variants[question.oddIndex];
  return odd.ratio > COMP_BASE_RATIO ? "Farklı olan DAHA ÇOK sıkıştırılmış" : "Farklı olan DAHA AZ sıkıştırılmış";
}

export function renderHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}
export function clearHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}

// Dinleme kontrolü artık #freqGuessArea'da DEĞİL — app.js'in mevcut A/B
// butonu (#abToggle) bu mod aktifken 3-yönlü döngüye genişletiliyor (bkz.
// app.js: toggleAB/updateAbToggleUI'nin "kompresor" dalı, "mevcut A/B
// altyapısını 3'e genişlet" spec isteğinin BİREBİR karşılığı). Bu yüzden
// #freqGuessArea diğer dört modla AYNI şekilde gizli kalıyor.
export function renderGuessAreaControls(freqGuessAreaEl) {
  if (!freqGuessAreaEl) return;
  freqGuessAreaEl.textContent = "";
  freqGuessAreaEl.classList.add("hidden");
}

export function renderAnswerChoices(answersEl, q) {
  if (!answersEl) return;
  if (!q.choices) { answersEl.innerHTML = ""; answersEl.classList.add("hidden"); return; }
  answersEl.className = "answers";
  // Şıklar HER ZAMAN tam 3 (A/B/C) — tek harf olduğu için Boost/Cut'ın Layer1
  // "Boost"/"Cut" düğmeleriyle AYNI 21px tabular-nums varsayılanı kullanılıyor,
  // Q Genişliği'nin `.ans-word` küçültmesine GEREK yok (tek karakter asla sarmaz).
  answersEl.innerHTML = q.choices.map(c =>
    `<button type="button" class="ans" data-letter="${c.id}"><b>${c.tr}</b></button>`
  ).join("");
}

export function markAnswerChoices(answersEl, q, picked) {
  if (!answersEl || !q.choices) return;
  const pickedLetter = picked && typeof picked === "object" ? picked.id : picked;
  const correctLetter = q.variants[q.oddIndex].letter;
  Array.from(answersEl.querySelectorAll(".ans")).forEach(btn => {
    btn.classList.remove("pick");
    btn.disabled = true;
    const letter = btn.dataset.letter;
    if (letter === correctLetter) btn.classList.add("right");
    else if (letter === pickedLetter) btn.classList.add("wrong");
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GÖRSEL — diğer modların frekans-yanıtı eğrisinin AKSİNE, kompresyonun
// frekans ekseni YOK — burada gösterilen "DİNAMİK ZARF" (basit bir genlik-
// zaman temsili, spec'in "waveform zarfı ya da dinamik aralık çubuğu — basit
// ve net" isteğine karşılık): dar/düz zarf = sıkışmış (yüksek ratio), geniş/
// dalgalı zarf = açık (düşük ratio). Gerçek bir ses ANALİZİ DEĞİL — sentetik,
// SADECE ratio değerinden türetilen İLLÜSTRATİF bir eğri (audioCtx'e HİÇ
// ihtiyaç yok, diğer modların getFrequencyResponse'undan FARKLI).
// ═══════════════════════════════════════════════════════════════════════════

const ENV_POINTS = 200;
function computeEnvelopeY(ratio, w, h) {
  const plotBottom = h - AXIS_H;
  const curveTop = CURVE_TOP, curveBottom = plotBottom - 6;
  const midY = (curveTop + curveBottom) / 2;
  const bandH = (curveBottom - curveTop) * 0.42;
  // Ratio arttıkça genlik küçülür (dinamik daralır) ama HİÇBİR ZAMAN sıfıra
  // inmez (ratio=20'de bile hafif bir kıpırtı kalır — "tamamen düz çizgi"
  // gerçekçi değil, limiter'da bile mikro-dinamik vardır).
  const compressionFactor = 1 / (1 + (ratio - 1) * 0.15);
  const ys = new Float32Array(ENV_POINTS + 1);
  for (let i = 0; i <= ENV_POINTS; i++) {
    const t = i / ENV_POINTS;
    const slowEnvelope = 0.35 + 0.65 * Math.abs(Math.sin(t * Math.PI * 3));
    const fastRipple = Math.sin(t * Math.PI * 44);
    ys[i] = midY - bandH * compressionFactor * slowEnvelope * fastRipple;
  }
  return ys;
}

function drawEnvelope(ctx2d, w, ys, color, alpha) {
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

const GUESS_COLOR = "#FFC246"; // --am
const CORRECT_COLOR = "#2BD9A8"; // --gr

function drawEnvelopeLegend(ctx2d, showGuess) {
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
// Sadece cevap sonrası çizilir. state: { activeQuestion, roundActive,
// kompresorGuessLetter } — kompresorGuessLetter app.js'in submitKompresorGuess'te
// sakladığı, kullanıcının SEÇTİĞİ harf; guess zarfı o harfin GERÇEK ratio'suyla
// çizilir (diğer modların AKSİNE burada "temsili" bir değere gerek yok — her
// harfin GERÇEK ratio'su zaten question.variants içinde mevcut).
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  const { activeQuestion: q, roundActive, kompresorGuessLetter } = state;
  if (!q || roundActive) return;

  const correctVariant = q.variants[q.oddIndex];
  const guessVariant = kompresorGuessLetter ? q.variants.find(v => v.letter === kompresorGuessLetter) : null;

  const correctYs = computeEnvelopeY(correctVariant.ratio, w, h);
  const guessYs = guessVariant ? computeEnvelopeY(guessVariant.ratio, w, h) : null;

  if (guessYs) drawEnvelope(ctx2d, w, guessYs, GUESS_COLOR, 0.85);
  drawEnvelope(ctx2d, w, correctYs, CORRECT_COLOR, 0.85);

  drawEnvelopeLegend(ctx2d, !!guessYs);
}

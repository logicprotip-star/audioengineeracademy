// "Kesim Noktası" — HPF/LPF kesim frekansı bulma modu. İKİ SESLİ moddan biri
// (Frekans Bulma'dan sonra), bu yüzden aynı zamanda bir ŞABLON: app.js'in
// `mode.X()` genel dispatch mekanizmasının GERÇEKTEN birden fazla mod arasında
// çalıştığı ilk yer. Mod sözleşmesi Frekans Bulma ile AYNI (getMeta/createQuestion/
// applyProcessing/evaluateAnswer/calculateXP/getFeedbackData) + app.js'in oyun
// ekranını çizebilmesi için birkaç aynı-isimli opsiyonel render yardımcısı daha
// (renderAnswerChoices/markAnswerChoices/drawOverlay/vb. — bkz. frekans-bulma.js
// dosya başındaki "SÖZLEŞMENİN DIŞINDA" notu, burada da geçerli).
//
// KAPSAM (bu iskelet turunda BİLEREK YOK, sonraki bir promptta eklenecek):
// - Filtre eğrisi görseli — drawOverlay burada SADECE frekans eksenini çizer.
// - Öğretici "neden" geri bildirimi — getFeedbackData zone/tip metni ÜRETMEZ.
// - Karşılaştırma-önizleme butonları (Senin cevabın/Doğru cevap/Temiz) — app.js'in
//   #freqInfo click-delegasyonu hâlâ SADECE "frequency" moduna kilitli, bilerek
//   dokunulmadı; bu mod hiç zengin panel göstermiyor (submitCutoffGuess sadece
//   setFeedback'in kısa metnini kullanıyor).
//
// SADECE ŞIKLI: bu mod dalga üzerine tıklamayı DESTEKLEMİYOR (isChoiceFormat()
// app.js'te "cutoff" için hep true döner) — kesim noktası için "dalgaya tıkla"
// affordance'ı EQ bandı kadar doğal değil, task bunu şıklı cevaba bağladı.

import { formatHz, shuffle, logFreq } from "../core/utils.js";
import { SOURCE_GROUPS } from "../core/source-catalog.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound } from "./frekans-bulma.js";

export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound };

export const MODE_ID = "kesim-noktasi";

// MAX_LIVES: Frekans Bulma ile AYNI sabit (bkz. o dosyanın notu — can sayısı
// zorluğa göre değişmez).
export const MAX_LIVES = 5;

// typeRevealed BURADA YOK — G18'de zorluktan AYRILDI, artık SEANS İÇİ SORU
// SIRASINA bağlı (bkz. TYPE_REVEAL_QUESTION_COUNT ve createQuestion). Kullanıcı
// raporu: tip her zaman söyleniyordu, ilerlemiş sorularda bile — istenen davranış
// her zorlukta AYNI: ilk birkaç soru "ısınma" (tip belli), sonrası "ters köşe"
// (tip gizli). marginOct/hintBandOct hâlâ zorluğa bağlı (bkz. aşağıdaki not).
//
// proplus BURADA çok-bantlı bir varyant DEĞİL — sadece paylaşılan (global,
// mod-bağımsız) Zorluk seçicisinde (index.html #difficultySelect, 5 sabit
// seçenek) bu değer HER ZAMAN seçilebildiği için mode.DIFFICULTY[level]'in HER
// zorluk anahtarında tanımlı dönmesi gerekiyor (aksi halde currentDifficultyConfig()
// çöker) — pro ile AYNI davranır (6 şık).
//
// marginOct/hintBandOct KULAKLA DOĞRULANMADI — Z1'in hassasiyet eğrisiyle AYNI
// durum (bkz. DURUM.md "ZORLUK MİMARİSİ — OTOMATİK VERİLEN KARARLAR"): makul bir
// başlangıç noktası, gerçek algı testiyle ayarlanmalı. marginOct, kesim frekansının
// havuzun (bkz. CUTOFF_MIN/CUTOFF_MAX) log-orta noktasından en az kaç oktav UZAKTA
// seçileceğini belirler — kolayda büyük (kesim net bir şekilde bir UCA yakın, etkisi
// bariz varsayılıyor), zorlaştıkça küçülüp ORTA'ya yaklaşır (etkisi daha ince
// varsayılıyor). Bu bir PSİKOAKUSTİK VARSAYIM, ölçülmedi.
export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 14, options: 3, time: 14, lives: MAX_LIVES, marginOct: 1.6, hintBandOct: 2.0 },
  medium: { label: "Orta", xp: 20, options: 4, time: 12, lives: MAX_LIVES, marginOct: 1.0, hintBandOct: 1.4 },
  hard: { label: "Zor", xp: 32, options: 5, time: 11, lives: MAX_LIVES, marginOct: 0.55, hintBandOct: 0.9 },
  pro: { label: "Pro", xp: 46, options: 6, time: 9, lives: MAX_LIVES, marginOct: 0.3, hintBandOct: 0.5 },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 46, options: 6, time: 9, lives: MAX_LIVES, marginOct: 0.3, hintBandOct: 0.5 }
};

// G18: seans içi rampa — her SEANSTA (resetSession() ile sınırlanır, bkz. app.js:
// Oyunu Başlat/Tekrar Oyna/10 Soru Daha) ilk TYPE_REVEAL_QUESTION_COUNT soru tipi
// SÖYLER (ısınma), sonrasında tip GİZLENİR. Zorluktan BAĞIMSIZ — kolay/pro fark
// etmez, tek belirleyici seans içindeki soru sırası. session-plan.js'teki
// buildSessionPlan/pickWeightedDifficulty ile AYNI "seans içi rampa" felsefesini
// paylaşır (10 soruluk zorluk rampası) ama o dosyadan bir şey İTHAL ETMİYORUZ —
// orada "tip gizleme" diye bir kavram yok (sadece zorluk-kademesi dağılımı), sahte
// bir bağımlılık kurmak yerine kendi tek-satırlık eşiği burada tutuluyor. app.js
// `session.correct + session.wrong`'u (0-tabanlı, cevaplanan soru sayısı — resetSession
// ile sıfırlanır) `settings.sessionQuestionIndex` olarak geçirir.
export const TYPE_REVEAL_QUESTION_COUNT = 3;

// Şıklardaki frekans çeldiricilerinin doğru cevaptan oktav cinsinden minimum
// mesafesi — evaluateAnswer'daki FREQ_TOLERANCE_OCT'tan (0.5) her zaman büyük
// olmalı (bkz. frekans-bulma.js DISTRACTOR_STEP_OCT'un AYNI invaryantı).
export const DISTRACTOR_STEP_OCT = { easy: 1.2, medium: 0.9, hard: 0.75, pro: 0.65, proplus: 0.65 };

// evaluateAnswer'da "doğru" sayılmanın frekans toleransı (oktav) — DISTRACTOR_STEP_OCT'un
// HER değerinden küçük olmalı, yoksa yanlış bir şıkka basmak yine "doğru" sayılabilir.
export const FREQ_TOLERANCE_OCT = 0.5;

// Filtre eğimi (Q) — başlangıç için makul, SABİT bir değer (2. derece/"12 dB/oktav"
// biquad, ~Butterworth). Zorlukla eğim değişimi bu iskeletin kapsamı dışında,
// sonraki bir iş (bkz. dosya başı not).
const FILTER_Q = Math.SQRT1_2; // ≈ 0.707

// G18 bug taraması bulgusu: FA_MIN–FA_MAX (80 Hz–17 kHz) Frekans Bulma'nın PEAKING
// bant merkezleri için seçilmişti (bkz. o dosyanın notu) — bir HPF/LPF KESİMİ için
// bu havuzun mutlak uçlarına çok yakın bir değer (ör. FA_MIN'e yakın bir HPF, FA_MAX'a
// yakın bir LPF) filtrenin etkisini neredeyse hiç yok kılar (geçen bant zaten
// baskındır); öbür uçta (FA_MIN'e yakın bir LPF, FA_MAX'a yakın bir HPF) filtre AŞIRI
// agresif olur — kalan dar bant içinde şıklar arasında kulakla ayrım yapmak
// zorlaşabilir (kullanıcı raporu: "172 Hz LPF ayırt edilemeyebilir"). Bu yüzden kesim
// noktası artık TÜM FA_MIN–FA_MAX'tan değil, dar bir CUTOFF_MIN–CUTOFF_MAX
// havuzundan seçiliyor — mix'te HPF/LPF'in gerçekten anlamlı olduğu aralığa daha
// yakın. Bu sınırlar da KULAKLA DOĞRULANMADI, makul bir başlangıç noktası.
export const CUTOFF_MIN = 100;
export const CUTOFF_MAX = 8000;

// Kesim frekansı havuzunun (log) geometrik ortası (100*8000'in karekökü ≈ 894 Hz,
// ALT-ORTA/ORTA sınırına yakın düşer). marginOct bu noktadan itibaren ölçülür.
const CENTER_FREQ = Math.sqrt(CUTOFF_MIN * CUTOFF_MAX);
const CENTER_LOG = Math.log2(CENTER_FREQ);

// SAF FONKSİYON. Log-havuzdan (CUTOFF_MIN–CUTOFF_MAX) merkeze en az marginOct oktav
// uzak bir frekans çeker (reddet-örnekle). marginOct değerleri (bkz. DIFFICULTY)
// havuzun yarı log-genişliğinin (~3.16 oktav) altında kaldığı için 200 denemede
// pratikte HER ZAMAN başarılı olur; güvenlik ağı olarak son denemeyi (kısıtlamayı
// gözardı ederek) döndürür — sessizce hatalı bir frekans üretmek yerine en azından
// havuz İÇİNDE kalır.
export function pickCutoffFreq(marginOct, rng = Math.random) {
  for (let i = 0; i < 200; i++) {
    const f = logFreq(CUTOFF_MIN, CUTOFF_MAX);
    if (Math.abs(Math.log2(f) - CENTER_LOG) >= marginOct) return f;
  }
  return CUTOFF_MIN * Math.pow(CUTOFF_MAX / CUTOFF_MIN, rng());
}

// SAF FONKSİYON. correctFreq etrafında (options-1) çeldirici üretir — frekans
// mesafesi frekans-bulma.js:generateChoices ile AYNI "tam k*step oktav, taraf taraf"
// algoritması (range her zaman CUTOFF_MIN–CUTOFF_MAX, bu modun odak aralığı kavramı
// yok). typeRevealed=false ise en az bir çeldiricinin filtre TİPİ çevrilir (doğru şık
// ASLA) — tip gizliyken kullanıcı gerçekten hem tip hem frekans ayrımı yapmak zorunda
// kalsın diye; typeRevealed=true ise TÜM şıklar doğru tiple aynı kalır (tip zaten
// söylendi).
export function generateChoices(correctFreq, correctType, level, typeRevealed) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const step = DISTRACTOR_STEP_OCT[level] || DISTRACTOR_STEP_OCT.medium;
  const correctOct = Math.log2(correctFreq);
  const minOct = Math.log2(CUTOFF_MIN), maxOct = Math.log2(CUTOFF_MAX);
  const maxBelow = Math.max(0, Math.floor((correctOct - minOct) / step));
  const maxAbove = Math.max(0, Math.floor((maxOct - correctOct) / step));
  const count = Math.max(2, Math.min(diff.options, maxBelow + maxAbove + 1));

  const offsetsOct = [];
  let below = 1, above = 1;
  while (offsetsOct.length < count - 1 && (below <= maxBelow || above <= maxAbove)) {
    if (above <= maxAbove) offsetsOct.push(above++ * step);
    if (offsetsOct.length >= count - 1) break;
    if (below <= maxBelow) offsetsOct.push(-(below++) * step);
  }
  const freqs = [correctFreq, ...offsetsOct.map(o => correctFreq * Math.pow(2, o))];
  let choices = freqs.map(f => ({ freq: f, filterType: correctType, correct: f === correctFreq }));

  if (!typeRevealed) {
    const otherType = correctType === "highpass" ? "lowpass" : "highpass";
    const flippable = shuffle(choices.map((_, i) => i).filter(i => !choices[i].correct));
    flippable.forEach((idx, n) => {
      if (n === 0 || Math.random() < 0.5) choices[idx] = { ...choices[idx], filterType: otherType };
    });
  }
  return shuffle(choices);
}

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

// ad/aciklama BİLEREK yok — Frekans Bulma ile AYNI kural (bkz. o dosyanın notu),
// kart metni yalnızca core/mode-catalog.js'ten okunur.
export function getMeta() {
  return {
    id: MODE_ID,
    motor: 1,
    kulaklikGerekli: false,
    // Kaynak kısıtlaması YOK (task kararı) — tüm SOURCE_GROUPS'tan üretilir, tek
    // kaynaktan (source-catalog.js) beslenir, elle liste tutulmaz.
    uyumluKaynaklar: SOURCE_GROUPS.flatMap(g => g.sources.map(s => s.id)),
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY,
    // G18 bug taraması: bu mod "Dokunmalı" (dalgaya tıklama) DESTEKLEMİYOR — SADECE
    // şıklı. app.js bu bayrağı okuyup "Cevap biçimi" toggle'ını (chip + Oyun Ayarları
    // satırı) bu mod aktifken GİZLİYOR (kullanıcı raporu: toggle görünüyordu ama
    // "Dokunmalı"ya bağlı hiçbir şey yoktu, seçilince sessizce hiçbir şey olmuyordu).
    choiceOnly: true
  };
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz. settings: { source, boss,
// sessionQuestionIndex — bkz. TYPE_REVEAL_QUESTION_COUNT notu, 0-tabanlı, verilmezse
// 0 (yani ilk soru gibi davranır — typeRevealed=true, geriye dönük güvenli varsayılan) }.
// Bu modun odak aralığı (FOCUS_RANGES) kavramı yok — her zaman CUTOFF_MIN–CUTOFF_MAX havuzu.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "pink";
  const filterType = Math.random() < 0.5 ? "highpass" : "lowpass";
  // Boss round'da merkeze daha yakın (daha ince/zor) bir kesim — frekans-bulma.js'in
  // "boss'ta gain/q daha yakın/zor" desenine paralel (bkz. o dosyanın createQuestion'ı).
  const marginOct = boss ? diff.marginOct * 0.6 : diff.marginOct;
  const freq = pickCutoffFreq(marginOct);
  const sessionQuestionIndex = Number.isFinite(settings.sessionQuestionIndex) ? settings.sessionQuestionIndex : 0;
  const typeRevealed = sessionQuestionIndex < TYPE_REVEAL_QUESTION_COUNT;

  return {
    mode: "cutoff",
    difficulty: level,
    filterType,
    filterLabel: filterType === "highpass" ? "HPF" : "LPF",
    typeRevealed,
    freq,
    source,
    hintUsed: false,
    boss,
    choices: generateChoices(freq, filterType, level, typeRevealed)
  };
}

export function modeDescription(q) {
  return q.typeRevealed
    ? "A/B ile karşılaştır, kesim frekansının nerede olduğunu şıklardan seç."
    : "A/B ile karşılaştır, filtre tipini ve kesim frekansını şıklardan seç.";
}

export function correctLabel(q) {
  return `${formatHz(q.freq)} ${q.filterLabel}`;
}

// Soruda uygulanan HPF/LPF'i audioCtx üzerinde kurar (audio-engine.js bunu
// sourceMix→...→compressor arasına bağlar — bkz. o dosyanın buildQuestionChain'i).
export function applyProcessing(question, { audioCtx }) {
  const f = audioCtx.createBiquadFilter();
  f.type = question.filterType;
  f.frequency.value = question.freq;
  f.Q.value = FILTER_Q;
  return { filters: [f] };
}

// SAF FONKSİYON. answer: { freq, filterType } — şıklı arayüzden gelen seçimin HER
// İKİ bileşeni de taşınır (tip gizliyken kullanıcının seçtiği şık yanlış TİPİ de
// içerebilir). "Doğru" sayılması için hem frekans (oktav toleransı içinde) HEM tip
// eşleşmeli — biri tutup diğeri tutmazsa yanlıştır (freqOk/typeOk ayrı ayrı
// getFeedbackData'da hangi kısmın kaçırıldığını anlatmak için taşınır).
export function evaluateAnswer(question, answer) {
  const guessFreq = answer && typeof answer === "object" ? answer.freq : answer;
  const guessType = (answer && typeof answer === "object" && answer.filterType) || question.filterType;
  const dOct = Math.abs(Math.log2(guessFreq / question.freq));
  const freqOk = dOct <= FREQ_TOLERANCE_OCT;
  const typeOk = guessType === question.filterType;
  return {
    mode: "cutoff",
    correct: freqOk && typeOk,
    freqOk, typeOk, dOct,
    zone: faZoneOf(question.freq),
    guessFreq, guessType
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

// Zengin panel/zone-tip BİLEREK yok (bkz. dosya başı not) — sadece kısa bir başlık/
// detay metni, app.js'in genel setFeedback() satırında gösterilir.
export function getFeedbackData(question, answer, context = {}) {
  const result = evaluateAnswer(question, answer);
  const gained = context.gained || 0;
  const label = correctLabel(question);

  if (result.correct) {
    return { result, title: "Doğru!", detail: `${label} (+${gained} XP)`, showResult: true, panel: null };
  }
  const guessLabel = `${formatHz(result.guessFreq)} ${result.guessType === "highpass" ? "HPF" : "LPF"}`;
  return {
    result,
    title: "Kaçtı",
    detail: `Doğru: ${label}. Sen: ${guessLabel} dedin.`,
    showResult: true,
    panel: null
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SÖZLEŞMENİN DIŞINDA: bu moda özgü render/UI yardımcıları (opsiyonel, ama app.js'in
// PAYLAŞILAN oyun ekranı bunları "mode.X()" ile genel olarak çağırıyor — bkz.
// frekans-bulma.js'in aynı başlıklı bölümü).
// ═══════════════════════════════════════════════════════════════════════════

export function getHintText(question) {
  return faZoneOf(question.freq).t.split(" (")[0];
}

export function renderHintMask(hintMaskLayerEl, question) {
  if (!hintMaskLayerEl || !question) return;
  const diff = DIFFICULTY[question.difficulty] || DIFFICULTY.medium;
  const halfOct = (diff.hintBandOct || 1.4) / 2;
  const lo = Math.max(FA_MIN, question.freq / Math.pow(2, halfOct));
  const hi = Math.min(FA_MAX, question.freq * Math.pow(2, halfOct));
  // NOT: FA_MIN/FA_MAX (eksen tam görünür aralığı) ile kırpılıyor, CUTOFF_MIN/MAX
  // (soru havuzu) ile DEĞİL — ipucu maskesi ekranın TAMAMINI kapsayan bir katman,
  // dar soru havuzuna kırpılırsa maskenin geri kalanı (hiç soru gelemeyecek ama
  // ekranda GÖRÜNEN) bölgede yanlışlıkla "açık" görünüp ipucunu gevşetirdi.
  const a = faFToX(lo, 1), b = faFToX(hi, 1);

  hintMaskLayerEl.innerHTML = "";
  [[0, a], [b, 1]].forEach(([x0, x1]) => {
    if (x1 - x0 <= 0.001) return;
    const div = document.createElement("div");
    div.className = "hint-mask-seg";
    div.style.left = `${(x0 * 100).toFixed(2)}%`;
    div.style.width = `${((x1 - x0) * 100).toFixed(2)}%`;
    hintMaskLayerEl.appendChild(div);
  });
  // bkz. frekans-bulma.js:renderHintMask AYNI not — offsetHeight zorla reflow +
  // hemen .show, rAF yerine (sekme arka plandayken rAF ertelenebiliyor).
  void hintMaskLayerEl.offsetHeight;
  hintMaskLayerEl.querySelectorAll(".hint-mask-seg").forEach(el => el.classList.add("show"));
}

export function clearHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}

// Bu mod proplus'un çok-hedefli işaretleme alanını hiç kullanmıyor — her zaman gizli.
export function renderGuessAreaControls(freqGuessAreaEl) {
  if (!freqGuessAreaEl) return;
  freqGuessAreaEl.textContent = "";
  freqGuessAreaEl.classList.add("hidden");
}

// Şıklı cevap grid'ini kurar (app.js'in isChoiceFormat() bu mod için HER ZAMAN true
// döner, dokunmalı arayüz yok). data-filter-type app.js'in click-delegasyonunda
// answer={freq,filterType} kurmak için okunur (bkz. app.js .ans click dinleyicisi).
// typeRevealed olsa da olmasa da tip etiketi (HPF/LPF) gösterilir — revealed'da tüm
// şıklar zaten AYNI tipte olduğu için bu bir "ipucu sızıntısı" değil, sadece
// hatırlatma; hidden'da ise gösterilenin ta kendisi (o ŞIKKIN taşıdığı tip).
export function renderAnswerChoices(answersEl, q) {
  if (!answersEl) return;
  if (!q.choices) { answersEl.innerHTML = ""; answersEl.classList.add("hidden"); return; }
  answersEl.className = "answers";
  answersEl.innerHTML = q.choices.map(c => {
    const typeLabel = c.filterType === "highpass" ? "HPF" : "LPF";
    return `<button type="button" class="ans" data-freq="${c.freq}" data-filter-type="${c.filterType}">` +
      `<b>${formatHz(c.freq)}</b><span>${typeLabel}</span></button>`;
  }).join("");
}

// Cevap verildikten sonra .ans butonlarını doğru/yanlış/seçili olarak işaretler.
// picked: {freq, filterType} — hem frekans HEM tip eşleşmeli ki bir şık "doğru"
// (right) sayılsın, aksi halde sadece frekansı tutan yanlış-tipli bir şık de
// (typeRevealed=false'ta mümkün) "sen bunu seçtin" (wrong) olarak işaretlenir.
export function markAnswerChoices(answersEl, q, picked) {
  if (!answersEl || !q.choices) return;
  const pickedFreq = picked && typeof picked === "object" ? picked.freq : picked;
  const pickedType = picked && typeof picked === "object" ? picked.filterType : null;
  Array.from(answersEl.querySelectorAll(".ans")).forEach(btn => {
    const f = Number(btn.dataset.freq);
    const t = btn.dataset.filterType;
    btn.classList.remove("pick");
    btn.disabled = true;
    if (f === q.freq && t === q.filterType) btn.classList.add("right");
    else if (pickedFreq != null && f === pickedFreq && t === pickedType) btn.classList.add("wrong");
  });
}

// Filtre eğrisi görseli BİLEREK yok (bkz. dosya başı not) — sadece paylaşılan
// frekans ekseni (gridline + tik etiketleri), spektrum çubuklarının altında/
// arkasında aynı ölçekte dursun diye (drawVisualizer her zaman mode.drawOverlay
// çağırır, bkz. app.js).
const AXIS_TICKS = [100, 200, 400, 800, 1600, 3200, 6400, 12800];
export function drawOverlay(ctx2d, canvasEl, w, h) {
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

// Giriş noktası: çekirdeği (core/*.js) ve modları (modes/*.js) birbirine bağlar.
// DOM cache, event listener'lar, oyun döngüsü orkestrasyonu burada yaşar — asıl
// mantık (ses zinciri, soru üretimi/puanlama, kalıcılık) core/ ve modes/ içindedir.

import { createAudioEngine } from "./core/audio-engine.js";
import { createUploadManager, validateAudioFile } from "./core/upload.js";
import { createRoundFlow } from "./core/round-flow.js";
import * as storage from "./core/storage.js";
import * as progress from "./core/progress.js";
import { toast, spawnXp, burst, shake } from "./core/fx.js";
import { formatHz } from "./core/utils.js";
import { registerMode, getMode } from "./core/registry.js";
import * as frekansBulma from "./modes/frekans-bulma.js";

registerMode(frekansBulma);
const mode = getMode(frekansBulma.MODE_ID);

const HINTS_PER_GAME = 3;

function difficultyLivesMap() {
  const map = {};
  Object.entries(mode.DIFFICULTY).forEach(([k, v]) => { map[k] = v.lives; });
  return map;
}

function labelSource(s) {
  return {
    pink: "Pink Noise",
    white: "White Noise",
    saw: "Saw Synth",
    square: "Square Synth",
    triangle: "Triangle Synth",
    upload: "Yüklenen Ses"
  }[s] || s;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOM cache
// ═══════════════════════════════════════════════════════════════════════════

const els = {
  startBtn: document.getElementById("startBtn"),
  nextBtn: document.getElementById("nextBtn"),
  playACleanBtn: document.getElementById("playACleanBtn"),
  playBFilteredBtn: document.getElementById("playBFilteredBtn"),
  abAutoBtn: document.getElementById("abAutoBtn"),
  seriChip: document.getElementById("seriChip"),
  hintBtn: document.getElementById("hintBtn"),
  hintMaskLayer: document.getElementById("hintMaskLayer"),
  resetStatsBtn: document.getElementById("resetStatsBtn"),
  difficultySelect: document.getElementById("difficultySelect"),
  playModeSelect: document.getElementById("playModeSelect"),
  sourceSelect: document.getElementById("sourceSelect"),
  audioFileInput: document.getElementById("audioFileInput"),
  questionTitle: document.getElementById("questionTitle"),
  questionMeta: document.getElementById("questionMeta"),
  answers: document.getElementById("answers"),
  feedbackBox: document.getElementById("feedbackBox"),
  feedbackDetail: document.getElementById("feedbackDetail"),
  roundChip: document.getElementById("roundChip"),
  scoreChip: document.getElementById("scoreChip"),
  bossChip: document.getElementById("bossChip"),
  comboValue: document.getElementById("comboValue"),
  xpValue: document.getElementById("xpValue"),
  levelValue: document.getElementById("levelValue"),
  accuracyValue: document.getElementById("accuracyValue"),
  xpBar: document.getElementById("xpBar"),
  progressText: document.getElementById("progressText"),
  roundsValue: document.getElementById("roundsValue"),
  correctValue: document.getElementById("correctValue"),
  wrongValue: document.getElementById("wrongValue"),
  avgScoreValue: document.getElementById("avgScoreValue"),
  bestComboValue: document.getElementById("bestComboValue"),
  bestScoreValue: document.getElementById("bestScoreValue"),
  streakText: document.getElementById("streakText"),
  achievementList: document.getElementById("achievementList"),
  historyList: document.getElementById("historyList"),
  hearts: document.getElementById("hearts"),
  timerText: document.getElementById("timerText"),
  timerBar: document.getElementById("timerBar"),
  dailyList: document.getElementById("dailyList"),
  canvas: document.getElementById("visualizer"),
  freqGuessArea: document.getElementById("freqGuessArea"),
  freqInfo: document.getElementById("freqInfo"),
  timerModeSelect: document.getElementById("timerModeSelect"),
  gameoverOverlay: document.getElementById("gameoverOverlay"),
  gameoverCard: document.getElementById("gameoverCard"),
  gameoverStats: document.getElementById("gameoverStats"),
  gameoverClose: document.getElementById("gameoverClose"),
  gameoverRetryBtn: document.getElementById("gameoverRetryBtn")
};

const ctx2d = els.canvas.getContext("2d");

// ═══════════════════════════════════════════════════════════════════════════
// Çekirdek altyapı
// ═══════════════════════════════════════════════════════════════════════════

const audioEngine = createAudioEngine();
const uploadManager = createUploadManager(() => audioEngine.audioCtx);
audioEngine.onReady = () => drawVisualizer();

const revealAnimator = mode.createRevealAnimator({
  sfxDing: audioEngine.sfxDing,
  sfxBuzz: audioEngine.sfxBuzz
});

function updateTimerUI(timeLeft = roundFlow.timeLeft, roundDuration = roundFlow.roundDuration) {
  els.timerText.textContent = `${timeLeft.toFixed(1)}s`;
  const pct = roundDuration ? (timeLeft / roundDuration) * 100 : 0;
  els.timerBar.style.width = `${Math.max(0, pct)}%`;
}

const roundFlow = createRoundFlow({
  onTimerTick: (t, d) => updateTimerUI(t, d),
  onTimeUp: () => onTimeUp(),
  onAutoAdvanceLabel: (text) => { if (els.nextBtn) els.nextBtn.textContent = text; },
  onAdvance: () => { if (!autoStopped) startRound(); }
});

// ═══════════════════════════════════════════════════════════════════════════
// Oyun durumu
// ═══════════════════════════════════════════════════════════════════════════

let stats = storage.loadStats(difficultyLivesMap(), HINTS_PER_GAME);
let history = stats.history || [];
let daily = storage.loadDaily();
let zoneStats = storage.loadZoneStats();

let activeQuestion = null;
let roundActive = false;
let currentPlayMode = "filtered";
let visualizerOn = true;
let currentLives = 4;
let session = { correct: 0, wrong: 0, xp: 0, hints: 0 };
function resetSession() { session = { correct: 0, wrong: 0, xp: 0, hints: 0 }; }

let freqGuessHz = null;
let freqHoverHz = null;

let autoPlaying = false;
let autoStopped = false;
let pausedAutoAdvanceRemainingMs = null;

let gameOverVisible = false;
let gameOverOpenedAt = 0;
const GAMEOVER_CLICK_GUARD_MS = 400;
function gameOverGuardActive() {
  return Date.now() - gameOverOpenedAt < GAMEOVER_CLICK_GUARD_MS;
}

let abDemoLock = false;

// 10 soruluk bölüm (challenge) durumu
let challenge = { active: false, total: 10, done: 0, correct: 0, xp: 0 };
const CHALLENGE_XP_MULT = 1.5;
function isChallenge() { return els.playModeSelect && els.playModeSelect.value === "challenge"; }
function xpMult() { return (challenge.active && isChallenge()) ? CHALLENGE_XP_MULT : 1; }

function persistStats() { storage.saveStats(stats, history); }
function persistDaily() { storage.saveDaily(daily); }

// localStorage boşsa (ör. WKWebView temizlemişse) Preferences'taki yedekten kurtar.
(async function reconcileFromPreferences() {
  const recovered = await storage.reconcileFromPreferences();
  if (recovered.stats) { stats = storage.loadStats(difficultyLivesMap(), HINTS_PER_GAME); history = stats.history || []; }
  if (recovered.daily) { daily = storage.loadDaily(); }
  if (recovered.zoneStats) { zoneStats = storage.loadZoneStats(); }
  if (recovered.stats || recovered.daily || recovered.zoneStats) {
    updateUI(); renderHistory(); renderDaily(); renderAnalysis();
  }
})();

// seçili zorluğun kendi durumu (xp/score/bestScore/lives)
function diffState() {
  const key = els.difficultySelect ? els.difficultySelect.value : "medium";
  if (!stats.perDiff) stats.perDiff = storage.freshStats(difficultyLivesMap(), HINTS_PER_GAME).perDiff;
  if (!stats.perDiff[key]) stats.perDiff[key] = storage.freshDiffState(mode.DIFFICULTY[key].lives);
  return stats.perDiff[key];
}

function currentDifficultyConfig() {
  return mode.DIFFICULTY[els.difficultySelect.value];
}

function timerOff() {
  return els.timerModeSelect && els.timerModeSelect.value === "off";
}

// ═══════════════════════════════════════════════════════════════════════════
// Can / seri / puan / XP
// ═══════════════════════════════════════════════════════════════════════════

function renderHearts() {
  const maxLives = currentDifficultyConfig().lives;
  els.hearts.innerHTML = "";
  for (let i = 0; i < maxLives; i++) {
    const span = document.createElement("span");
    span.className = `heart ${i < currentLives ? "" : "off"}`;
    span.textContent = "♥";
    els.hearts.appendChild(span);
  }
}

function resetLives() {
  currentLives = currentDifficultyConfig().lives;
  diffState().lives = currentLives;
  renderHearts();
  resetSession();
}

// seçili zorluğun kayıtlı canını yükle (zorluk değişince)
function syncLives() {
  const d = diffState();
  if (typeof d.lives !== "number") d.lives = currentDifficultyConfig().lives;
  currentLives = d.lives;
  renderHearts();
}

// Bir önceki oturumda canlar tükenip "Tekrar Oyna"ya basılmadan kapatılmışsa,
// perDiff'te lives:0 kalıcı olarak saklı kalır. Aktif bir oyun-bitti kartı yokken
// bunu otomatik doldur (XP/skor gibi diğer alanlara dokunmadan).
function syncLivesEnsureAlive() {
  syncLives();
  if (currentLives <= 0 && !gameOverVisible) {
    resetLives();
    persistStats();
  }
}

function loseLife(reasonText) {
  currentLives = Math.max(0, currentLives - 1);
  diffState().lives = currentLives;
  renderHearts();
  if (currentLives <= 0) {
    setFeedback("Oyun bitti", `${reasonText} Bu zorluktaki canların tükendi. Tekrar başlatabilirsin.`, true);
    toast("💔 Oyun Bitti", "Bu zorlukta canların tükendi.");
  } else {
    setFeedback("Can kaybettin", `${reasonText} Kalan can: ${currentLives}`, true);
  }
}

function finalizeIfGameOver() {
  if (currentLives > 0) return false;
  autoPlaying = false;
  autoStopped = true;
  roundFlow.clearAutoAdvance();
  pausedAutoAdvanceRemainingMs = null;
  if (els.nextBtn) els.nextBtn.textContent = "Atla ▶";
  roundActive = false;
  roundFlow.clearTimer();
  audioEngine.stopAudio();
  uploadManager.pausePlayback();
  activeQuestion = null;
  updateStartBtnLabel();
  showGameOverCard();
  return true;
}

function showGameOverCard() {
  gameOverVisible = true;
  gameOverOpenedAt = Date.now();
  if (els.gameoverStats) {
    els.gameoverStats.textContent = `${session.correct} doğru · ${session.wrong} yanlış · +${session.xp} XP · ${session.hints} ipucu`;
  }
  if (els.gameoverOverlay) els.gameoverOverlay.classList.add("open");
  if (els.gameoverCard) els.gameoverCard.classList.add("open");
}
function hideGameOverCard() {
  gameOverVisible = false;
  if (els.gameoverOverlay) els.gameoverOverlay.classList.remove("open");
  if (els.gameoverCard) els.gameoverCard.classList.remove("open");
}

// ═══════════════════════════════════════════════════════════════════════════
// Geri bildirim / genel UI yardımcıları
// ═══════════════════════════════════════════════════════════════════════════

function setFeedback(title, detail, showResult = false) {
  els.feedbackBox.querySelector("strong").textContent = title;
  els.feedbackDetail.textContent = detail;
  els.feedbackBox.classList.toggle("show-result", !!showResult);
}

function updateStartBtnLabel() {
  if (!els.startBtn) return;
  if (!activeQuestion || currentLives <= 0) {
    els.startBtn.textContent = "▶ Oyunu Başlat";
    els.startBtn.classList.remove("warning");
    return;
  }
  els.startBtn.classList.add("warning");
  els.startBtn.textContent = autoStopped ? "🔄 Tekrar Çal" : "⏸ Durdur";
}

function updateHintChipLabel() {
  if (!els.hintBtn) return;
  const used = !!(activeQuestion && activeQuestion.hintUsed);
  els.hintBtn.textContent = used && activeQuestion.hintText
    ? activeQuestion.hintText
    : `İpucu Ver (${stats.hintsRemaining})`;
  els.hintBtn.disabled = stats.hintsRemaining <= 0 || !activeQuestion || !roundActive || used;
}

function switchToOyunTab() {
  const btn = document.querySelector('.tab-btn[data-tab="oyun"]');
  if (btn && !btn.classList.contains('active')) btn.click();
}

function updateUI() {
  const xp = progress.xpProgress(diffState().xp);
  const percent = Math.max(0, Math.min(100, (xp.current / xp.required) * 100));

  els.levelValue.textContent = xp.level;
  els.xpValue.textContent = diffState().xp;
  els.comboValue.textContent = `${stats.combo}x`;
  els.accuracyValue.textContent = `%${progress.accuracy(stats)}`;
  els.progressText.textContent = `${xp.current} / ${xp.required} XP`;
  els.xpBar.style.width = `${percent}%`;

  if (els.seriChip) els.seriChip.textContent = 'Seri ' + stats.rounds;
  els.roundsValue.textContent = stats.rounds;
  els.correctValue.textContent = stats.correct;
  if (els.wrongValue) els.wrongValue.textContent = stats.wrong;
  if (els.avgScoreValue) els.avgScoreValue.textContent = stats.rounds > 0 ? Math.round(diffState().score / stats.rounds) : 0;
  els.bestComboValue.textContent = `${stats.bestCombo}x`;
  els.bestScoreValue.textContent = diffState().bestScore;
  els.scoreChip.textContent = `Skor ${diffState().score}`;
  els.streakText.textContent = stats.combo > 1 ? `${stats.combo}x combo aktif` : "Akışta kal";

  renderAchievements();
  renderHearts();
  renderAnalysis();
  updateHintChipLabel();
}

function renderDaily() {
  els.dailyList.innerHTML = "";
  daily.tasks.forEach(task => {
    const div = document.createElement("div");
    div.className = "daily-card";
    div.innerHTML = `
      <h4>${task.title}</h4>
      <p>${task.desc}</p>
      <div class="progress-shell" style="margin-top:10px;padding:10px;">
        <div class="progress-label">
          <span>${task.value} / ${task.target}</span>
          <span>${task.claimed ? "Tamamlandı" : "+" + task.reward + " XP"}</span>
        </div>
        <div class="progress"><span style="width:${Math.min(100, (task.value / task.target) * 100)}%"></span></div>
      </div>
    `;
    els.dailyList.appendChild(div);
  });
}

function renderAchievements() {
  const unlocked = new Set(stats.unlocked || []);
  els.achievementList.innerHTML = "";
  progress.ACHIEVEMENTS.forEach(a => {
    const div = document.createElement("div");
    div.className = `achievement ${unlocked.has(a.id) ? "" : "locked"}`;
    div.innerHTML = `
      <div class="icon">${a.icon}</div>
      <div>
        <h4>${a.title}</h4>
        <p>${a.desc}</p>
      </div>
    `;
    els.achievementList.appendChild(div);
  });
}

function renderHistory() {
  els.historyList.innerHTML = "";
  if (!history.length) {
    const div = document.createElement("div");
    div.className = "history";
    div.innerHTML = `<div class="icon">📝</div><div><h4>Henüz kayıt yok</h4><p>İlk turdan sonra son cevapların burada görünür.</p></div>`;
    els.historyList.appendChild(div);
    return;
  }
  history.forEach(h => {
    const div = document.createElement("div");
    div.className = "history";
    div.innerHTML = `<div class="icon">${h.icon}</div><div><h4>${h.title}</h4><p>${h.desc}</p></div>`;
    els.historyList.appendChild(div);
  });
}

function renderAnalysis() {
  const body = document.getElementById("analysisBody");
  if (!body) return;
  body.innerHTML = mode.renderAnalysisHtml(zoneStats);
}

function pushHistory(correct) {
  const desc = activeQuestion.mode === "proplus"
    ? `Pro Plus · ${labelSource(activeQuestion.source)}${activeQuestion.boss ? " · Boss" : ""}`
    : `${activeQuestion.filterLabel} · ${formatHz(activeQuestion.freq)} · ${labelSource(activeQuestion.source)}${activeQuestion.boss ? " · Boss" : ""}`;
  history.unshift({
    icon: correct ? "✅" : "❌",
    title: correct ? `${mode.correctLabel(activeQuestion)} doğru bulundu` : `${mode.correctLabel(activeQuestion)} kaçırıldı`,
    desc
  });
  history = history.slice(0, 12);
  renderHistory();
}

function updateDaily(correct) {
  daily.tasks.forEach(task => {
    if (task.id === "d1") task.value = Math.min(task.target, stats.rounds);
    if (task.id === "d2") task.value = Math.min(task.target, stats.correct);
    if (task.id === "d3") task.value = Math.min(task.target, stats.bestCombo);
  });
  daily.tasks.forEach(task => {
    if (!task.claimed && task.value >= task.target) {
      task.claimed = true;
      diffState().xp += task.reward;
      toast("📅 Günlük görev tamamlandı", `${task.title} · +${task.reward} XP`);
    }
  });
  renderDaily();
}

function notifyNewAchievements() {
  progress.checkAchievements(stats).forEach(a => toast(`${a.icon} ${a.title}`, a.desc));
}

// ═══════════════════════════════════════════════════════════════════════════
// İpucu
// ═══════════════════════════════════════════════════════════════════════════

function giveHint() {
  if (!activeQuestion || !roundActive) return;
  if (stats.hintsRemaining <= 0 || activeQuestion.hintUsed) return;

  activeQuestion.hintUsed = true;
  stats.hintsRemaining--;
  stats.hintsUsed++;
  session.hints++;
  persistStats();

  activeQuestion.hintText = mode.getHintText(activeQuestion);

  mode.renderHintMask(els.hintMaskLayer, activeQuestion);
  updateHintChipLabel();
}

// ═══════════════════════════════════════════════════════════════════════════
// Soru render / gönderim
// ═══════════════════════════════════════════════════════════════════════════

function renderQuestion() {
  const q = activeQuestion;
  roundActive = true;

  mode.clearHintMask(els.hintMaskLayer);
  updateHintChipLabel();

  els.questionTitle.textContent =
    q.mode !== "proplus"
      ? "Hangi frekansla oynandı? Dalga üzerine tıkla."
      : "4 frekansla oynandı — dördünü de dalga üzerinde işaretle.";

  els.questionMeta.textContent = mode.modeDescription(q);
  els.streakText.textContent = q.boss ? "Boss round aktif" : (stats.combo > 1 ? `${stats.combo}x combo aktif` : "Yeni challenge");
  els.roundChip.textContent = `Round ${stats.rounds + 1}`;
  els.scoreChip.textContent = `Skor ${diffState().score}`;
  els.bossChip.textContent = q.boss ? "Boss" : "Normal";
  els.bossChip.className = `chip ${q.boss ? "boss" : ""}`;

  freqGuessHz = null; freqHoverHz = null;
  if (q.mode === "proplus") { q.guesses = []; q._result = null; }
  revealAnimator.reset();
  els.answers.innerHTML = "";
  els.answers.classList.add("hidden");
  els.freqGuessArea.classList.remove("hidden");
  mode.renderGuessAreaControls(els.freqGuessArea, q);
  if (els.freqInfo) els.freqInfo.classList.add("hidden");

  setFeedback(
    q.boss ? "Boss round başladı!" : "Hazır mısın?",
    q.mode !== "proplus"
      ? "A/B ile karşılaştır, sonra dalga üzerine tıklayıp doğru frekansı işaretle."
      : "A/B ile karşılaştır. 4 frekansla oynandı (kimi açık, kimi kısık). Dört noktaya da tıkla."
  );
}

function onTimeUp() {
  if (!roundActive || !activeQuestion) return;
  roundActive = false;
  if (activeQuestion.mode === "frequency") activeQuestion.freqRevealed = true;
  stats.rounds++;
  stats.wrong++;
  stats.combo = 0;
  diffState().score -= 20;
  session.wrong++;
  audioEngine.stopAudio();
  loseLife(`Süre doldu. Doğru cevap: ${mode.correctLabel(activeQuestion)}.`);
  pushHistory(false);
  updateDaily(false);
  updateUI();
  persistStats();
  persistDaily();
  if (!finalizeIfGameOver()) scheduleNext();
}

function submitFrequencyGuess(guessHz) {
  if (!roundActive || !activeQuestion || activeQuestion.mode !== "frequency") return;
  if (guessHz == null) return;
  roundActive = false;
  roundFlow.clearTimer();

  const q = activeQuestion;
  q.freqRevealed = true;
  const result = mode.evaluateAnswer(q, guessHz);

  stats.rounds++;
  let gained = 0;

  if (result.correct) {
    stats.correct++;
    stats.combo++;
    stats.bestCombo = Math.max(stats.bestCombo, stats.combo);
    gained = mode.calculateXP(q, result, q.hintUsed, q.difficulty, {
      combo: stats.combo, timeLeft: roundFlow.timeLeft, roundDuration: roundFlow.roundDuration, xpMultiplier: xpMult()
    });
    diffState().xp += gained;
    diffState().score += gained * Math.max(1, stats.combo);
    diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
    if (q.difficulty === "pro") stats.proCorrect++;
    if (q.boss) stats.bossWins++;
    session.correct++; session.xp += gained;

    const feedback = mode.getFeedbackData(q, guessHz, { gained });
    setFeedback(feedback.title, feedback.detail, feedback.showResult);
    mode.showFreqInfoPanel(els.freqInfo, feedback);
    mode.recordZone(zoneStats, q.freq, true);
    audioEngine.sfxDing();
    spawnXp(`+${gained} XP`, els.canvas);
    burst(els.canvas);
    challengeTick(true, gained);
  } else {
    stats.wrong++;
    stats.combo = 0;
    diffState().score -= 20;
    session.wrong++;

    const feedback = mode.getFeedbackData(q, guessHz, { gained: 0 });
    setFeedback(feedback.title, feedback.detail, feedback.showResult);
    mode.showFreqInfoPanel(els.freqInfo, feedback);
    mode.recordZone(zoneStats, q.freq, false);
    audioEngine.sfxBuzz();
    shake(els.canvas);
    loseLife("Frekansı ıskaladın."); // NOT: bu, yukarıdaki setFeedback'i BİLEREK ezer (orijinal davranış) —
    // ayrıntılı geri bildirim freqInfo panelinde kalıcı olarak görünür durur.
    challengeTick(false, 0);
  }

  storage.saveZoneStats(zoneStats);
  audioEngine.stopAudio();
  pushHistory(result.correct);
  updateDaily(result.correct);
  notifyNewAchievements();
  updateUI();
  persistStats();
  persistDaily();
  if (!finalizeIfGameOver()) scheduleNext();
}

function submitProPlusGuess() {
  if (!roundActive || !activeQuestion || activeQuestion.mode !== "proplus") return;
  roundActive = false;
  roundFlow.clearTimer();

  const q = activeQuestion;
  q.freqRevealed = true;
  const result = mode.evaluateAnswer(q, q.guesses);

  result.bands.forEach(b => mode.recordZone(zoneStats, b.freq, b.correct));
  storage.saveZoneStats(zoneStats);

  stats.rounds++;
  let gained = 0;
  let feedback;

  if (result.correct) {
    stats.correct++;
    stats.combo++;
    stats.bestCombo = Math.max(stats.bestCombo, stats.combo);
    gained = mode.calculateXP(q, result, q.hintUsed, q.difficulty, {
      combo: stats.combo, timeLeft: roundFlow.timeLeft, roundDuration: roundFlow.roundDuration, xpMultiplier: xpMult()
    });
    diffState().xp += gained;
    diffState().score += gained * Math.max(1, stats.combo);
    diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
    if (q.boss) stats.bossWins++;
    session.correct++; session.xp += gained;

    feedback = mode.getFeedbackData(q, q.guesses, { gained });
    setFeedback(feedback.title, feedback.detail, feedback.showResult);
    spawnXp(`+${gained} XP`, els.canvas);
    burst(els.canvas);
  } else {
    stats.wrong++;
    stats.combo = 0;
    diffState().score -= 15;
    session.wrong++;

    feedback = mode.getFeedbackData(q, q.guesses, { gained: 0 });
    setFeedback(feedback.title, feedback.detail, feedback.showResult);
    shake(els.canvas);
    loseLife("Bantları ıskaladın."); // NOT: yukarıdaki setFeedback'i BİLEREK ezer (orijinal davranış)
  }

  challengeTick(result.correct, gained);
  mode.showProPlusInfoPanel(els.freqInfo, feedback);
  els.freqGuessArea.innerHTML = `<span style="color:var(--muted);font-size:13px">Tur bitti · "Yeni Soru" ile devam.</span>`;

  q._result = result.bands.map(b => ({ freq: b.freq, gain: b.gain, correct: b.correct })).sort((a, z) => a.freq - z.freq);
  revealAnimator.start(q._result);

  audioEngine.stopAudio();
  pushHistory(result.correct);
  updateDaily(result.correct);
  notifyNewAchievements();
  updateUI();
  persistStats();
  persistDaily();
  if (!finalizeIfGameOver()) scheduleNext();
}

// ═══════════════════════════════════════════════════════════════════════════
// Ses oynatma
// ═══════════════════════════════════════════════════════════════════════════

function playQuestion(processed = true) {
  if (!audioEngine.audioReady || !activeQuestion) return;
  if (audioEngine.audioCtx && audioEngine.audioCtx.state === "suspended") {
    try { audioEngine.audioCtx.resume(); } catch (e) {}
  }
  currentPlayMode = processed ? "filtered" : "clean";
  audioEngine.buildQuestionChain(activeQuestion, processed, els.sourceSelect.value, uploadManager.mediaSource, mode.applyProcessing);
}

async function playABDemo() {
  if (!activeQuestion || abDemoLock) return;
  abDemoLock = true;
  await audioEngine.initAudio();
  playQuestion(false);
  setFeedback("A çalıyor", "Şu an temiz referans sesi dinliyorsun.");
  setTimeout(() => {
    if (!activeQuestion) return;
    playQuestion(true);
    setFeedback("B çalıyor", "Şu an işlenmiş sesi dinliyorsun.");
  }, 1400);
  setTimeout(() => {
    abDemoLock = false;
    setFeedback("A/B tamamlandı", "İstersen tekrar A veya B düğmeleriyle ayrı ayrı dinleyebilirsin.");
  }, 2900);
}

// ═══════════════════════════════════════════════════════════════════════════
// Tur akışı: timer / otomatik geçiş / duraklat-devam / 10 soruluk bölüm
// ═══════════════════════════════════════════════════════════════════════════

function ensureAutoNext(durationMs) {
  if (autoStopped) return;
  if (currentLives <= 0) return;
  if (challenge.active && challenge.done >= challenge.total) {
    finishChallenge();
    return;
  }
  autoPlaying = true;
  updateStartBtnLabel();
  const label = challenge.active ? `Soru ${challenge.done + 1}/10` : "Sonraki";
  roundFlow.ensureAutoNext(durationMs, label);
}

function scheduleNext() {
  ensureAutoNext();
}

// "Durdur" — hiçbir kaynağı/node'u durdurmaz, sadece sesi/zamanlayıcıyı askıya alır.
function pauseRound() {
  autoPlaying = false;
  autoStopped = true;
  pausedAutoAdvanceRemainingMs = roundFlow.captureRemainingAndClear();
  roundFlow.clearTimer(); // timeLeft'e DOKUNMAZ
  audioEngine.muteOutput();
  els.feedbackBox.classList.remove("show-result");
  if (els.nextBtn) els.nextBtn.textContent = "Atla ▶";
  updateStartBtnLabel();
}

function resumeTimerRespectingSettings() {
  if (timerOff()) {
    els.timerText.textContent = "∞";
    els.timerBar.style.width = "100%";
    return;
  }
  roundFlow.resumeTimer();
}

function startTimerForCurrentQuestion() {
  if (timerOff()) {
    roundFlow.clearTimer();
    els.timerText.textContent = "∞";
    els.timerBar.style.width = "100%";
  } else {
    const baseTime = currentDifficultyConfig().time;
    const time = activeQuestion.boss ? Math.max(6, baseTime - 2) : baseTime;
    roundFlow.startTimer(time);
  }
}

function startRound() {
  if (gameOverVisible) return; // kart açıkken hiçbir tetikleyici yeni tur başlatamaz
  if (currentLives <= 0) { showGameOverCard(); return; }
  if (els.sourceSelect.value === "upload" && !uploadManager.mediaSource) {
    setFeedback("Önce ses yükle", "Kaynak olarak yüklenen ses seçiliyse bir mp3/wav dosyası seçmelisin.");
    return;
  }

  autoStopped = false;
  autoPlaying = true;

  activeQuestion = mode.createQuestion(els.difficultySelect.value, {
    source: els.sourceSelect.value,
    boss: mode.isBossRound(stats.rounds)
  });
  renderQuestion();
  playQuestion(true);
  updateStartBtnLabel();
  scrollToAnalyzer();
  startTimerForCurrentQuestion();
}

// Mobilde oyun başlayınca dalgayı görünür yap (tıklama alanına hızlı erişim)
function scrollToAnalyzer() {
  const isTouch = window.matchMedia("(hover:none) and (pointer:coarse)").matches;
  if (!isTouch) return;
  const wrap = els.canvas && els.canvas.closest(".visualizer-wrap");
  const target = wrap || els.canvas;
  if (!target) return;
  requestAnimationFrame(() => {
    const rect = target.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const gorunur = rect.top >= 0 && rect.top < vh * 0.5 && rect.bottom <= vh;
    if (gorunur) return;
    const y = window.scrollY + rect.top - 70;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  });
}

function setAutoPlay(on) {
  autoPlaying = on;
  autoStopped = !on;
  roundFlow.clearAutoAdvance();
  pausedAutoAdvanceRemainingMs = null;
  if (on) {
    // NOT: ipucu hakkı BURADA sıfırlanmaz (bkz. gameoverRetryBtn) — reload sonrası
    // "Oyunu Başlat"a tekrar basmak sınırsız ipucu üretmemeli.
    if (els.sourceSelect.value === "upload") {
      uploadManager.startFromZero(err => {
        setFeedback("Ses oynatılamadı", "Tarayıcı sesi başlatmayı engelledi. 'Oyunu Başlat'a tekrar dokun.");
      });
    }
    startRound();
  } else {
    roundFlow.clearTimer();
    audioEngine.stopAudio();
    uploadManager.pausePlayback();
    activeQuestion = null;
    roundActive = false;
    updateStartBtnLabel();
    setFeedback("Durduruldu", "Kaldığın yerden 'Oyunu Başlat' ile devam edebilirsin.");
  }
}

function startChallenge() {
  challenge = { active: true, total: 10, done: 0, correct: 0, xp: 0 };
  setFeedback("10 Soruluk Bölüm başladı", "10 soru, +%50 XP. Bol şans!");
}
function finishChallenge() {
  challenge.active = false;
  autoStopped = true;
  roundFlow.clearAutoAdvance();
  audioEngine.stopAudio();
  activeQuestion = null;
  updateStartBtnLabel();
  if (els.nextBtn) els.nextBtn.textContent = "Atla ▶";
  const acc = Math.round((challenge.correct / challenge.total) * 100);
  setFeedback(`🏁 Bölüm bitti — ${challenge.correct}/10 doğru`, `Toplam +${challenge.xp} XP (%${acc} isabet). Yeni bölüm için 'Oyunu Başlat'.`);
  toast("🏁 10 Soruluk Bölüm bitti", `${challenge.correct}/10 doğru · +${challenge.xp} XP`);
}
function challengeTick(wasCorrect, gainedXp) {
  if (!challenge.active) return;
  challenge.done++;
  if (wasCorrect) challenge.correct++;
  challenge.xp += Math.max(0, gainedXp || 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// Görselleştirici (spektrum + modun dalga/eksen katmanı)
// ═══════════════════════════════════════════════════════════════════════════

function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);

  const w = els.canvas.width;
  const h = els.canvas.height;
  ctx2d.clearRect(0, 0, w, h);

  ctx2d.fillStyle = "rgba(255,255,255,.04)";
  for (let x = 0; x < w; x += 40) ctx2d.fillRect(x, 0, 1, h);
  for (let y = 0; y < h; y += 36) ctx2d.fillRect(0, y, w, 1);

  const overlayState = {
    audioCtx: audioEngine.audioCtx,
    activeQuestion,
    roundActive,
    freqGuessHz,
    freqHoverHz,
    revealAnimator
  };

  if (!visualizerOn || !audioEngine.audioReady) {
    ctx2d.fillStyle = "rgba(255,255,255,.22)";
    ctx2d.font = "700 22px Inter, sans-serif";
    ctx2d.fillText("Visualizer pasif", 30, 46);
    mode.drawOverlay(ctx2d, els.canvas, w, h, overlayState);
    return;
  }

  const data = new Uint8Array(audioEngine.analyser.frequencyBinCount);
  audioEngine.analyser.getByteFrequencyData(data);

  const plotBottom = h - mode.AXIS_H;

  const grad = ctx2d.createLinearGradient(0, 0, w, plotBottom);
  grad.addColorStop(0, "rgba(111,211,255,.95)");
  grad.addColorStop(1, "rgba(139,125,255,.95)");

  ctx2d.beginPath();
  ctx2d.lineWidth = 3;
  ctx2d.strokeStyle = grad;

  const step = w / data.length;
  for (let i = 0; i < data.length; i++) {
    const x = i * step;
    const y = plotBottom - (data[i] / 255) * (plotBottom - 18) - 8;
    if (i === 0) ctx2d.moveTo(x, y);
    else ctx2d.lineTo(x, y);
  }
  ctx2d.stroke();

  for (let i = 0; i < data.length; i += 8) {
    const x = i * step;
    const barH = (data[i] / 255) * (plotBottom * 0.75);
    ctx2d.fillStyle = i % 16 === 0 ? "rgba(111,211,255,.32)" : "rgba(139,125,255,.18)";
    ctx2d.fillRect(x, plotBottom - barH, Math.max(2, step * 3.5), barH);
  }

  mode.drawOverlay(ctx2d, els.canvas, w, h, overlayState);
}

// Canvas tıklama/hover — sadece tur aktifken (aktif mod her zaman dalga tabanlı)
function faCanvasPos(e) {
  const r = els.canvas.getBoundingClientRect();
  const cssX = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  return Math.max(0, Math.min(els.canvas.width, cssX * (els.canvas.width / r.width)));
}
const isWaveMode = () => !!activeQuestion;

els.canvas.addEventListener("pointermove", e => {
  if (!isWaveMode() || !roundActive) return;
  freqHoverHz = mode.faXToF(faCanvasPos(e), els.canvas.width);
});
els.canvas.addEventListener("pointerleave", () => { freqHoverHz = null; });
els.canvas.addEventListener("pointerdown", e => {
  if (!isWaveMode() || !roundActive) return;
  const hz = mode.faXToF(faCanvasPos(e), els.canvas.width);
  const q = activeQuestion;

  if (q.mode !== "proplus") {
    freqGuessHz = hz;
    try { submitFrequencyGuess(hz); } catch (err) { console.error(err); }
    ensureAutoNext();
    return;
  }

  q.guesses.push(hz);
  const kalan = 4 - q.guesses.length;
  const cnt = els.freqGuessArea.querySelector("#ppCount");
  if (kalan > 0) {
    if (cnt) cnt.textContent = `👆 Dört ayrı frekansı işaretle · kalan: ${kalan}`;
  } else {
    try { submitProPlusGuess(); } catch (err) { console.error(err); }
    ensureAutoNext();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Ses dosyası yükleme
// ═══════════════════════════════════════════════════════════════════════════

els.audioFileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const validation = validateAudioFile(file);
  if (!validation.ok) {
    setFeedback(validation.title, validation.detail);
    e.target.value = ""; // aynı (geçersiz) dosya tekrar seçilirse change event'i yine tetiklensin
    return;
  }
  try {
    await audioEngine.initAudio();
    const res = await uploadManager.loadFile(file, {
      onError: () => setFeedback("Ses oynatılamadı", "Dosya oynatılırken bir hata oluştu. Farklı bir dosya dene."),
      onStalled: () => setFeedback("Yükleme takıldı", "Ses dosyası okunurken takıldı. Bağlantıyı/dosyayı kontrol edip tekrar dene.")
    });
    if (!res.ok) {
      setFeedback(res.title, res.detail);
      return;
    }

    // Kaynağı otomatik "Yüklenen Ses Dosyası"na geçir (oyunu otomatik başlatmadan).
    if (els.sourceSelect.value !== "upload") {
      els.sourceSelect.value = "upload";
      els.sourceSelect.dispatchEvent(new Event("change", { bubbles: true }));
      const rowText = document.querySelector('.setting-row[data-sheet-select="sourceSelect"] .setting-row-value-text');
      if (rowText) rowText.textContent = els.sourceSelect.options[els.sourceSelect.selectedIndex].text;
    }

    setFeedback("Ses yüklendi", `${file.name} başarıyla yüklendi. "Oyunu Başlat" ile çalmaya başlar.`);
  } catch (err) {
    console.error("[upload] loadUploadedAudio dışında beklenmeyen hata:", err && err.name, err && err.message, err);
    setFeedback("Yükleme hatası", "Bu ses dosyası açılamadı. Farklı bir mp3/wav dene.");
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Kontrol düğmeleri
// ═══════════════════════════════════════════════════════════════════════════

// startBtn duruma göre 3 iş yapar: Oyunu Başlat / Tekrar Çal / Durdur (bkz. updateStartBtnLabel)
els.startBtn.addEventListener("click", async () => {
  await audioEngine.initAudio();
  switchToOyunTab();
  if (currentLives <= 0) { showGameOverCard(); return; }

  if (!activeQuestion) {
    if (isChallenge()) startChallenge();
    setAutoPlay(true);
    return;
  }

  if (autoStopped) {
    // Tekrar Çal: hiçbir şey yeniden kurulmuyor/başlatılmıyor — ses zaten arka planda
    // akıyordu (Durdur sadece muteGain'i kısmıştı), sadece geri açılıyor.
    autoStopped = false;
    autoPlaying = true;
    audioEngine.unmuteOutput();
    if (pausedAutoAdvanceRemainingMs !== null) {
      const remain = pausedAutoAdvanceRemainingMs;
      pausedAutoAdvanceRemainingMs = null;
      ensureAutoNext(remain);
    } else {
      resumeTimerRespectingSettings();
    }
    updateStartBtnLabel();
  } else {
    // Durdur: soruyu/otomatik geçişi ekranda/durumda BOZMADAN sadece sesi/zamanlayıcıyı duraklatır.
    pauseRound();
  }
});

els.nextBtn.addEventListener("click", async () => {
  await audioEngine.initAudio();
  switchToOyunTab();
  if (currentLives <= 0) { showGameOverCard(); return; }
  autoStopped = false;
  roundFlow.clearAutoAdvance();
  pausedAutoAdvanceRemainingMs = null;
  startRound();
});

els.playACleanBtn.addEventListener("click", async () => {
  await audioEngine.initAudio();
  if (!activeQuestion) {
    setAutoPlay(true);
    return;
  }
  playQuestion(false);
  setFeedback("A modu", "Şu an temiz referans sesi dinliyorsun.");
});

els.playBFilteredBtn.addEventListener("click", async () => {
  await audioEngine.initAudio();
  if (!activeQuestion) {
    setAutoPlay(true);
    return;
  }
  playQuestion(true);
  setFeedback("B modu", "Şu an işlenmiş sesi dinliyorsun.");
});

els.abAutoBtn.addEventListener("click", async () => {
  await audioEngine.initAudio();
  if (!activeQuestion) {
    setAutoPlay(true);
    return;
  }
  playABDemo();
});

els.hintBtn.addEventListener("click", giveHint);

// Kart X ile ya da dışına tıklanarak kapatılırsa: canlar yenilensin, yeni seriye hazır
// olunsun ama oyun OTOMATİK başlamasın — kullanıcı "Oyunu Başlat"a basmalı.
function closeGameOverAndReset() {
  if (gameOverGuardActive()) return; // kartı açan tıklama overlay'e sızmış olabilir
  hideGameOverCard();
  resetLives(); // resetSession()'ı da içeride çağırır
  setFeedback("Yeni seriye hazır", "Kaldığın yerden 'Oyunu Başlat' ile devam edebilirsin.");
}
if (els.gameoverClose) els.gameoverClose.addEventListener("click", closeGameOverAndReset);
if (els.gameoverOverlay) els.gameoverOverlay.addEventListener("click", closeGameOverAndReset);
if (els.gameoverRetryBtn) els.gameoverRetryBtn.addEventListener("click", async () => {
  if (gameOverGuardActive()) return;
  hideGameOverCard();
  await audioEngine.initAudio();
  switchToOyunTab();
  resetLives();
  stats.hintsRemaining = HINTS_PER_GAME; // gerçek "Tekrar Oyna" — ipucu hakkı burada sıfırlanır
  persistStats();
  if (isChallenge()) startChallenge();
  setAutoPlay(true);
});

els.resetStatsBtn.addEventListener("click", () => {
  if (!confirm("Tüm istatistikler, ilerleme ve görevler sıfırlansın mı?")) return;
  storage.clearStats();
  storage.clearDaily();
  stats = storage.freshStats(difficultyLivesMap(), HINTS_PER_GAME);
  history = [];
  daily = storage.freshDaily();
  activeQuestion = null;
  roundActive = false;
  freqGuessHz = null; freqHoverHz = null;
  syncLives();
  roundFlow.clearTimer();
  audioEngine.stopAudio();
  persistStats();
  persistDaily();
  updateUI();
  renderHistory();
  renderDaily();
  renderAchievements();
  renderHearts();
  updateTimerUI();
  setFeedback("Sıfırlandı", "Tüm ilerleme, XP, skor ve görevler temizlendi.");
  toast("🔄 Sıfırlandı", "Her şey baştan.");
});

renderAnalysis();
(function () {
  const ar = document.getElementById("analysisReset");
  if (ar) ar.addEventListener("click", () => {
    if (!confirm("Kişisel analiz verisi (bölge başarıların) sıfırlansın mı?")) return;
    zoneStats = {};
    storage.clearZoneStats();
    renderAnalysis();
  });
})();

els.difficultySelect.addEventListener("change", () => {
  // zorluk değişti → o zorluğun kendi canı/puanı/level'i yüklensin
  syncLivesEnsureAlive();
  updateUI();
  setFeedback("Zorluk değişti", `${els.difficultySelect.options[els.difficultySelect.selectedIndex].text} — bu zorluğun kendi puanı, level'i ve canı geldi.`);
});

[els.sourceSelect, els.playModeSelect].forEach(el => {
  el.addEventListener("change", () => {
    if (el === els.playModeSelect) {
      challenge.active = false;
      setAutoPlay(false);
      setFeedback("Oyun türü değişti", isChallenge() ? "10 Soruluk Bölüm seçili. 'Oyunu Başlat' ile bölümü başlat." : "Serbest oyun seçili. 'Oyunu Başlat' ile sınırsız akış.");
    } else if (activeQuestion) {
      setFeedback("Ayar değişti", "Yeni ayarlar bir sonraki turda uygulanacak.");
    }
    updateStartBtnLabel();
  });
});

window.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    audioEngine.stopAudio();
    uploadManager.pausePlayback();
  } else if (audioEngine.audioCtx && audioEngine.audioCtx.state === "suspended") {
    try { audioEngine.audioCtx.resume(); } catch (e) {}
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Açılış
// ═══════════════════════════════════════════════════════════════════════════

syncLivesEnsureAlive();
renderHistory();
renderAchievements();
renderDaily();
updateTimerUI();
updateUI();
updateStartBtnLabel();
updateHintChipLabel();

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tabContent === target));
  });
});

// Ayarlar bottom sheet: select'leri gizleyip yerine tıklanabilir satır koyduk,
// seçim yapılınca gizli select'in value'su güncellenip change event tetikleniyor.
(function initSettingsSheet() {
  const overlay = document.getElementById('sheetOverlay');
  const sheet = document.getElementById('settingsSheet');
  const sheetTitle = document.getElementById('sheetTitle');
  const sheetOptions = document.getElementById('sheetOptions');
  const sheetCancel = document.getElementById('sheetCancel');
  if (!overlay || !sheet) return;

  function updateRowText(select) {
    const row = document.querySelector(`.setting-row[data-sheet-select="${select.id}"]`);
    const txt = row && row.querySelector('.setting-row-value-text');
    if (txt && select.options[select.selectedIndex]) {
      txt.textContent = select.options[select.selectedIndex].text;
    }
  }

  function closeSheet() {
    overlay.classList.remove('open');
    sheet.classList.remove('open');
  }

  function openSheet(select, title) {
    sheetTitle.textContent = title;
    sheetOptions.innerHTML = '';
    Array.from(select.options).forEach(opt => {
      const row = document.createElement('div');
      row.className = 'sheet-option' + (opt.selected ? ' selected' : '');
      row.innerHTML = `<span>${opt.text}</span><span class="check">✓</span>`;
      row.addEventListener('click', () => {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        updateRowText(select);
        closeSheet();
      });
      sheetOptions.appendChild(row);
    });
    overlay.classList.add('open');
    sheet.classList.add('open');
  }

  document.querySelectorAll('.setting-row').forEach(row => {
    const select = document.getElementById(row.dataset.sheetSelect);
    if (!select) return;
    updateRowText(select);
    row.addEventListener('click', () => openSheet(select, row.dataset.sheetTitle || ''));
  });

  overlay.addEventListener('click', closeSheet);
  sheetCancel.addEventListener('click', closeSheet);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
})();

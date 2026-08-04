// Giriş noktası: çekirdeği (core/*.js) ve modları (modes/*.js) birbirine bağlar.
// DOM cache, event listener'lar, oyun döngüsü orkestrasyonu burada yaşar — asıl
// mantık (ses zinciri, soru üretimi/puanlama, kalıcılık) core/ ve modes/ içindedir.

import { createAudioEngine } from "./core/audio-engine.js";
import { createUploadManager, validateAudioFile, audioAcceptAttr } from "./core/upload.js";
import { createRoundFlow } from "./core/round-flow.js";
import * as storage from "./core/storage.js";
import * as progress from "./core/progress.js";
import { toast, spawnXp, burst, shake } from "./core/fx.js";
import { formatHz, turkishLocative } from "./core/utils.js";
import { registerMode, getMode, listModes } from "./core/registry.js";
import { MODE_CATALOG, MOTOR_INFO } from "./core/mode-catalog.js";
import { SOURCE_GROUPS, findSource } from "./core/source-catalog.js";
import { tierForLevel, difficultyParams, qToOctaveBandwidth, formatOctaveBandwidth, DIFFICULTY_CONFIG } from "./core/difficulty-curve.js";
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
  return findSource(s)?.label || s;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOM cache
// ═══════════════════════════════════════════════════════════════════════════

const els = {
  // ekran yönlendirme
  modeGrid: document.getElementById("modeGrid"),
  modeCount: document.getElementById("modeCount"),
  backBtn: document.getElementById("backBtn"),
  tabbar: document.getElementById("tabbar"),
  dailyTipCard: document.getElementById("dailyTipCard"),
  dailyTipClose: document.getElementById("dailyTipClose"),
  dailyTipText: document.getElementById("dailyTipText"),
  dailyTipStartBtn: document.getElementById("dailyTipStartBtn"),

  // genel ayarlar (dişli) + yardım/bilgi ekranları
  menuSettingsBtn: document.getElementById("menuSettingsBtn"),
  progressSettingsBtn: document.getElementById("progressSettingsBtn"),
  toolsSettingsBtn: document.getElementById("toolsSettingsBtn"),
  toolsFileName: document.getElementById("toolsFileName"),
  toolsFileMeta: document.getElementById("toolsFileMeta"),
  toolsUploadBtn: document.getElementById("toolsUploadBtn"),
  toolsFileInput: document.getElementById("toolsFileInput"),
  toolBars: document.getElementById("toolBars"),
  filterChips: document.getElementById("filterChips"),
  filterName: document.getElementById("filterName"),
  filterDesc: document.getElementById("filterDesc"),
  filterListen: document.getElementById("filterListen"),
  filterResetBtn: document.getElementById("filterResetBtn"),
  analyzeLock: document.getElementById("analyzeLock"),
  filtersLock: document.getElementById("filtersLock"),
  mainSettingsOverlay: document.getElementById("mainSettingsOverlay"),
  mainSettingsSheet: document.getElementById("mainSettingsSheet"),
  mainSettingsBack: document.getElementById("mainSettingsBack"),
  mainSettingsClose: document.getElementById("mainSettingsClose"),
  langSeg: document.getElementById("langSeg"),
  notifSwitch: document.getElementById("notifSwitch"),
  hpWarnSwitch: document.getElementById("hpWarnSwitch"),
  feedbackScreenSwitch: document.getElementById("feedbackScreenSwitch"),
  calibRow: document.getElementById("calibRow"),
  diffAutoBtn: document.getElementById("diffAutoBtn"),
  diffFixedBtn: document.getElementById("diffFixedBtn"),
  diffSublist: document.getElementById("diffSublist"),
  accountVerLine: document.getElementById("accountVerLine"),
  goProBtn: document.getElementById("goProBtn"),
  versionRow: document.getElementById("versionRow"),
  devGroup: document.getElementById("devGroup"),
  devProSwitch: document.getElementById("devProSwitch"),
  devModeOffBtn: document.getElementById("devModeOffBtn"),
  restoreRow: document.getElementById("restoreRow"),
  feedbackRow: document.getElementById("feedbackRow"),
  faqRow: document.getElementById("faqRow"),
  contactRow: document.getElementById("contactRow"),
  privacyRow: document.getElementById("privacyRow"),
  termsRow: document.getElementById("termsRow"),

  calibBackBtn: document.getElementById("calibBackBtn"),
  calStep: document.getElementById("calStep"),
  calStepDots: document.getElementById("calStepDots"),
  calHead: document.getElementById("calHead"),
  calBody: document.getElementById("calBody"),
  calGuide: document.getElementById("calGuide"),
  calPlayBtn: document.getElementById("calPlayBtn"),
  calMeter: document.getElementById("calMeter"),
  calLevelTrack: document.getElementById("calLevelTrack"),
  calLevelFill: document.getElementById("calLevelFill"),
  calLevelThumb: document.getElementById("calLevelThumb"),
  calLevelValue: document.getElementById("calLevelValue"),
  calCtaBtn: document.getElementById("calCtaBtn"),
  calSkipBtn: document.getElementById("calSkipBtn"),

  faqBackBtn: document.getElementById("faqBackBtn"),
  faqList: document.getElementById("faqList"),

  feedbackBackBtn: document.getElementById("feedbackBackBtn"),
  feedbackTextarea: document.getElementById("feedbackTextarea"),
  feedbackSendBtn: document.getElementById("feedbackSendBtn"),

  contactBackBtn: document.getElementById("contactBackBtn"),

  legalBackBtn: document.getElementById("legalBackBtn"),
  legalTitle: document.getElementById("legalTitle"),
  legalKicker: document.getElementById("legalKicker"),

  paywallCloseBtn: document.getElementById("paywallCloseBtn"),
  payFreeModes: document.getElementById("payFreeModes"),
  payProModes: document.getElementById("payProModes"),
  proPrice: document.getElementById("proPrice"),
  buyProBtn: document.getElementById("buyProBtn"),
  restorePurchaseBtn: document.getElementById("restorePurchaseBtn"),
  payFreeContinueBtn: document.getElementById("payFreeContinueBtn"),

  // oyun başlığı / durum
  bossChip: document.getElementById("bossChip"),
  hearts: document.getElementById("hearts"),
  gameSettingsBtn: document.getElementById("gameSettingsBtn"),
  seriChip: document.getElementById("seriChip"),
  hintStatCount: document.getElementById("hintStatCount"),
  gameAccValue: document.getElementById("gameAccValue"),
  roundChip: document.getElementById("roundChip"),
  scoreChip: document.getElementById("scoreChip"),
  streakText: document.getElementById("streakText"),

  // kaynak / karıştır
  sourceSelect: document.getElementById("sourceSelect"),
  mixToggle: document.getElementById("mixToggle"),
  gameScroll: document.getElementById("gameScroll"),
  gameActionbar: document.getElementById("gameActionbar"),
  gameScreen: document.getElementById("screen-game"),
  sourceChipLabel: document.getElementById("sourceChipLabel"),

  // odak aralığı
  focusSelect: document.getElementById("focusSelect"),
  focusChipWrap: document.getElementById("focusChipWrap"),
  focusChipLabel: document.getElementById("focusChipLabel"),

  // soru / spektrum
  questionTitle: document.getElementById("questionTitle"),
  questionMeta: document.getElementById("questionMeta"),
  analyzer: document.getElementById("analyzer"),
  analyzerLabel: document.getElementById("analyzerLabel"),
  gainValue: document.getElementById("gainValue"),
  hintTag: document.getElementById("hintTag"),
  hintMaskLayer: document.getElementById("hintMaskLayer"),
  canvas: document.getElementById("visualizer"),
  freqGuessArea: document.getElementById("freqGuessArea"),
  freqInfo: document.getElementById("freqInfo"),

  // süre / geri bildirim
  timerText: document.getElementById("timerText"),
  timerBar: document.getElementById("timerBar"),
  feedbackBox: document.getElementById("feedbackBox"),
  feedbackDetail: document.getElementById("feedbackDetail"),

  // alt aksiyon çubuğu
  startBtn: document.getElementById("startBtn"),
  abToggle: document.getElementById("abToggle"),
  abTitle: document.getElementById("abTitle"),
  hintBtn: document.getElementById("hintBtn"),
  nextBtn: document.getElementById("nextBtn"),

  // oyun ayarları sheet (dots)
  gameSettingsOverlay: document.getElementById("gameSettingsOverlay"),
  gameSettingsSheet: document.getElementById("gameSettingsSheet"),
  gameSettingsCancel: document.getElementById("gameSettingsCancel"),

  // Z6: seviye bilgisi sheet'i
  levelChip: document.getElementById("levelChip"),
  lvlSheetOverlay: document.getElementById("lvlSheetOverlay"),
  lvlSheet: document.getElementById("lvlSheet"),
  lvlSheetTitle: document.getElementById("lvlSheetTitle"),
  lvlSheetClose: document.getElementById("lvlSheetClose"),
  lvlSheetBody: document.getElementById("lvlSheetBody"),
  quitGameBtn: document.getElementById("quitGameBtn"),
  autoDiffAsk: document.getElementById("autoDiffAsk"),
  autoDiffSwitchBtn: document.getElementById("autoDiffSwitchBtn"),
  autoDiffDismissBtn: document.getElementById("autoDiffDismissBtn"),
  difficultySelect: document.getElementById("difficultySelect"),
  playModeSelect: document.getElementById("playModeSelect"),
  timerModeSelect: document.getElementById("timerModeSelect"),
  answerFormatSelect: document.getElementById("answerFormatSelect"),
  answers: document.getElementById("answers"),
  audioFileInput: document.getElementById("audioFileInput"),
  resetStatsBtn: document.getElementById("resetStatsBtn"),

  // ilerleme ekranı
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
  achievementList: document.getElementById("achievementList"),
  achievementCount: document.getElementById("achievementCount"),
  historyList: document.getElementById("historyList"),
  dailyList: document.getElementById("dailyList"),

  // ilerleme: ek istatistikler / şu an neredesin / frekans bölgesi / mod seviyeleri / grafik
  totalPracticeValue: document.getElementById("totalPracticeValue"),
  totalRoundsValue: document.getElementById("totalRoundsValue"),
  whereNowText: document.getElementById("whereNowText"),
  zonePanelToggle: document.getElementById("zonePanelToggle"),
  zoneCaret: document.getElementById("zoneCaret"),
  zoneWrap: document.getElementById("zoneWrap"),
  zoneSub: document.getElementById("zoneSub"),
  zoneList: document.getElementById("zoneList"),
  modeLevelsToggle: document.getElementById("modeLevelsToggle"),
  modeLevelsCaret: document.getElementById("modeLevelsCaret"),
  modeLevelsWrap: document.getElementById("modeLevelsWrap"),
  modeLevelsSub: document.getElementById("modeLevelsSub"),
  modeLevelsList: document.getElementById("modeLevelsList"),
  accChartSvg: document.getElementById("accChartSvg"),
  accChartEmpty: document.getElementById("accChartEmpty"),
  accChartLabels: document.getElementById("accChartLabels"),
  accChartFirst: document.getElementById("accChartFirst"),
  accChartLast: document.getElementById("accChartLast"),

  // seans sonu ekranı
  resKicker: document.getElementById("resKicker"),
  resRing: document.getElementById("resRing"),
  resPct: document.getElementById("resPct"),
  resScore: document.getElementById("resScore"),
  resHead: document.getElementById("resHead"),
  resLead: document.getElementById("resLead"),
  resLevelUp: document.getElementById("resLevelUp"),
  resLevelUpBadge: document.getElementById("resLevelUpBadge"),
  resXp: document.getElementById("resXp"),
  resXpBar: document.getElementById("resXpBar"),
  resLvl: document.getElementById("resLvl"),
  resXpNum: document.getElementById("resXpNum"),
  resStreakMax: document.getElementById("resStreakMax"),
  resStreak: document.getElementById("resStreak"),
  resHints: document.getElementById("resHints"),
  resSumTitle: document.getElementById("resSumTitle"),
  resFreqMap: document.getElementById("resFreqMap"),
  resDots: document.getElementById("resDots"),
  resSeqMap: document.getElementById("resSeqMap"),
  resBoxes: document.getElementById("resBoxes"),
  resComment: document.getElementById("resComment"),
  resCta: document.getElementById("resCta"),
  resRetryBtn: document.getElementById("resRetryBtn"),
  resMenuBtn: document.getElementById("resMenuBtn")
};

// sourceSelect'in <option>/<optgroup> listesi SOURCE_GROUPS'tan üretilir — kaynak
// sheet'i tek kaynaktan (source-catalog.js) beslenir, HTML'de ayrıca elle tutulmaz.
// Boş gruplar (sources:[]) hiç render edilmez — bugün için hepsi dolu ama yeni
// bir motor/grup boş eklenirse yine otomatik gizlenir.
function populateSourceSelect() {
  if (!els.sourceSelect) return;
  els.sourceSelect.innerHTML = SOURCE_GROUPS
    .filter(g => g.sources.length > 0)
    .map(g => `<optgroup label="${g.label}">${g.sources.map(s => `<option value="${s.id}">${s.label}</option>`).join("")}</optgroup>`)
    .join("");
}
populateSourceSelect();

// focusSelect'in <option> listesi mode.FOCUS_RANGES'tan üretilir (frekans-bulma.js) —
// odak aralığı bu modun kendine özgü bir kavramı, SOURCE_GROUPS gibi global bir
// kataloğa taşınmadı. Mod bunu dışa açmıyorsa (gelecekte odak kavramı olmayan bir mod)
// chip'in kendisi de hiç gösterilmez.
function populateFocusSelect() {
  if (!els.focusSelect) return;
  if (!mode.FOCUS_RANGES) { if (els.focusChipWrap) els.focusChipWrap.classList.add("hidden"); return; }
  els.focusSelect.innerHTML = Object.values(mode.FOCUS_RANGES)
    .map(f => `<option value="${f.id}">${f.label}</option>`)
    .join("");
  if (els.focusChipWrap) els.focusChipWrap.classList.remove("hidden");
}
populateFocusSelect();

const ctx2d = els.canvas.getContext("2d");

// Canvas'ın çizim koordinat uzayı CSS piksel cinsindendir (canvasCssW/H) — bitmap
// çözünürlüğü devicePixelRatio ile çarpılıp ctx2d.setTransform ile ölçeklenir, böylece
// hem Retina ekranlarda net çizim olur hem de eksen/etiket boyutları dar telefon
// ekranlarında küçülüp okunmaz hale gelmez (sabit 1200x320 iç çözünürlüğün CSS'e göre
// küçülmesi yerine, gerçek CSS piksel boyutunda çizim yapılır).
let canvasCssW = 1200;
let canvasCssH = 320;
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = els.canvas.getBoundingClientRect();
  // Ekran henüz gizliyken (ör. oyun ekranına hiç girilmediyse) genişlik/yükseklik 0
  // ölçülebilir — bu durumda önceki bilinen boyutu koru, canvas'ı çökertme.
  if (rect.width > 0) canvasCssW = rect.width;
  if (rect.height > 0) canvasCssH = rect.height;
  const targetW = Math.max(1, Math.round(canvasCssW * dpr));
  const targetH = Math.max(1, Math.round(canvasCssH * dpr));
  if (els.canvas.width !== targetW || els.canvas.height !== targetH) {
    els.canvas.width = targetW;
    els.canvas.height = targetH;
  }
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);

// Oyun ekranındaki .game-scroll'un alt boşluğu artık ÖLÇÜLMÜYOR — CSS'teki
// --actionbar-h değişkeninden margin-bottom ile türetiliyor (bkz. styles.css
// .game-scroll). Burada eskiden bir ResizeObserver/syncGameScrollPadding vardı;
// cihazda ilk saniyelerde negatif fark bırakıyordu (actionbar henüz ölçülmeden
// önceki kare) — CSS çözümü bu tür bir zamanlama penceresi bırakmıyor.

// E3: cevap verildikten (veya süre dolduktan) sonra actionbar'daki hiçbir kontrol
// (Durdur/A-B/İpucu/Atla) işlevsiz kalıyordu — çubuğu geçici olarak aşağı kaydırıp
// geri bildirim kartına o alanı da bırakır. Sadece bir CSS sınıfı değiştirir;
// gerçek kayma/boşluk animasyonu styles.css'teki .actionbar-tucked geçişleriyle
// olur (D1'in --actionbar-h tabanlı, ölçüme dayanmayan boşluk sistemi bozulmaz —
// sadece iki durum arasında GEÇİŞ ekleniyor, mekanizma aynı kalıyor).
// instant=true: sınıf animasyonsuz (bir kare) uygulanır — SADECE yeni tur açılışında
// (renderQuestion) kullanılır, çünkü .game-scroll'un margin-bottom geçişi devam
// ederken şıklı moddaki otomatik kaydırma (scrollFeedbackIntoView) scrollHeight'ı
// SENKRON okuyor; geçiş yarıda yakalanırsa yanlış (eski) değeri görür (bkz.
// styles.css .actionbar-no-transition yorumu — gerçek bulunmuş bir bug). Cevap
// verilince gizlenme (tuck) HER ZAMAN animasyonlu kalır, instant SADECE geri
// gelirken (untuck) ve SADECE bu tek race'i önlemek için var.
function setActionbarTucked(tucked, { instant = false } = {}) {
  if (!els.gameScreen) return;
  if (!instant) {
    els.gameScreen.classList.toggle("actionbar-tucked", tucked);
    return;
  }
  els.gameScreen.classList.add("actionbar-no-transition");
  els.gameScreen.classList.toggle("actionbar-tucked", tucked);
  void els.gameScreen.offsetHeight; // stilin (margin/transform) bu karede kesinleşmesini zorla
  els.gameScreen.classList.remove("actionbar-no-transition");
}

// Cevap sonrası geri bildirim kartının TAMAMI görünür olsun diye scroll alanını
// alta kaydırır. requestAnimationFrame: DOM içerik güncellemesi (setFeedback)
// senkron olsa da, .game-scroll'un gerçek scrollHeight'ı ancak reflow'dan SONRA
// doğru okunur.
// Senkron çalışır — requestAnimationFrame KULLANMAZ. scrollHeight/getBoundingClientRect
// okumak zaten DOM az önce değiştiyse tarayıcıyı senkron reflow'a zorluyor, yani rAF
// beklemeye gerek yok; üstelik rAF arka plandaki/pasif sekmelerde geciktirilebiliyor
// (bu da doğrulama sırasında ölçümlerin tutarsız çıkmasına neden olmuştu).
//
// iOS WKWebView KÖK SEBEP (telefonda ölçümle bulundu — padding değil, ZAMANLAMA
// sorunuydu): .scroll'daki -webkit-overflow-scrolling:touch, programatik scrollTop
// atamasını ANİMASYONLU/gecikmeli uyguluyor (native momentum scroll devreye giriyor).
// scrollTop = scrollHeight satırı senkron çalışsa da görsel kaydırma 1-2 saniyeye
// yayılıyordu (ölçüm: fark -209 → -170 → -170 → +21, kademeli düzeliyordu). Momentum'u
// atama anında geçici kapatmak sıçramayı gerçekten anlık yapar; bir sonraki frame'de
// geri açılır ki kullanıcının kendi parmak kaydırması yumuşak/native kalsın.
function scrollFeedbackIntoView() {
  if (!els.gameScroll) return;
  els.gameScroll.style.setProperty("-webkit-overflow-scrolling", "auto");
  els.gameScroll.scrollTop = els.gameScroll.scrollHeight;
  requestAnimationFrame(() => {
    els.gameScroll.style.setProperty("-webkit-overflow-scrolling", "touch");
  });
}

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

// Z3: mod başına XP takibi için oynanabilir mod id'leri (registry.js'te KAYITLI
// olanlar — MODE_CATALOG'taki 14 girdinin çoğu henüz kodlanmadı, onlar için perMode
// girdisi açılmaz). legacyModeId: perMode İLK KEZ oluşturulurken (göç) tüm geçmiş
// XP'nin frekans-bulma'ya ait sayılması için — bugüne kadar oynanabilir TEK mod oydu.
function playableModeIds() { return listModes().map(m => m.getMeta().id); }
let stats = storage.loadStats(difficultyLivesMap(), HINTS_PER_GAME, playableModeIds(), frekansBulma.MODE_ID);
let history = stats.history || [];
// loadStats negatif skorları belleğe yüklerken 0'a çeker — düzeltilmiş değer hemen
// kalıcı hale gelsin diye (kullanıcı ilk aksiyonunu almadan önce bile) burada yazılır.
storage.saveStats(stats, history);
let daily = storage.loadDaily();
let zoneStats = storage.loadZoneStats();
let prefs = storage.loadPrefs();
let dailyAcc = storage.loadDailyAcc();
let devFlags = storage.loadDevFlags();

let activeQuestion = null;
let roundActive = false;
let currentPlayMode = "filtered";
let visualizerOn = true;
// A/B uzun basma döngüsü (prototype.html: pointerdown + 520ms eşik + setInterval 2000ms).
// abPressTimer: 520ms eşik zamanlayıcısı (pointerup/leave'de iptal edilir).
// abHeld: eşik dolup döngü başladıysa true — ardından gelen "click" olayının (pointerup
// sonrası tarayıcının kendiliğinden ürettiği) normal kısa-dokunma davranışını tekrar
// tetiklemesini engeller.
let abPressTimer = null;
let abHeld = false;
let abLoopTimer = null;
// KÖK SEBEP DÜZELTMESİ: eskiden burada sabit "4" vardı (stats henüz okunmadan) —
// temiz localStorage'da ilk kalp render'ı gerçek candan ÖNCE 4 ile çiziliyordu.
// stats zaten yukarıda (satır ~329) yüklendiği için burada doğrudan gerçek
// değerden başlatılabilir; syncLives() zaten çağrılacak ama ilk boya da doğru olsun.
let currentLives = stats.lives;
// log: bu oturumdaki HER turun {correct, freq} kaydı — Seans Sonu ekranındaki
// bölge haritası (dokunmalı/tek frekans) ya da soru sırası (proplus/çok bantlı)
// görselleştirmesi buradan besleniyor. freq sadece "frequency" tipi sorularda
// dolar (proplus'ta null) — pushHistory() ile birlikte doldurulur.
let session = { correct: 0, wrong: 0, xp: 0, hints: 0, log: [] };
// Seans Sonu'nda "Seviye atladın" kartı için: bu oturum/deneme BAŞLARKEN hangi
// seviyedeydi. resetSession() her yeni deneme başında (Oyunu Başlat/Tekrar Oyna/
// 10 Soru Daha) çağrıldığında güncellenir; burada da (currentLives ile aynı mantık)
// açılıştaki GERÇEK seviyeden başlatılır — yoksa kullanıcının ilk oturumunda
// (hiç resetSession() tetiklenmeden 10 Soruluk Bölüm bitirse bile) "Seviye atladın"
// kartı hiç çıkmazdı (null !== null her zaman false döner).
let sessionStartLevel = progress.xpProgress(diffState().xp).level;
function resetSession() {
  session = { correct: 0, wrong: 0, xp: 0, hints: 0, log: [] };
  sessionStartLevel = progress.xpProgress(diffState().xp).level;
}

let freqGuessHz = null;
let freqHoverHz = null;

// İlerleme sekmesindeki "toplam antrenman süresi" istatistiği: her tur startRound()'da
// başlar, cevap/timeout ile biter — soru ekranda GERÇEKTEN açık kaldığı süreyi toplar.
let roundStartedAt = null;
function accumulatePracticeTime() {
  if (!roundStartedAt) return;
  stats.totalPracticeMs = (stats.totalPracticeMs || 0) + Math.max(0, Date.now() - roundStartedAt);
  roundStartedAt = null;
}

// Kalibrasyon durumu — burada (dosyanın başında) tanımlı çünkü goScreen() (aşağıda)
// ekrandan çıkışta stopCalibrationTone()'u çağırır; goScreen boot sırasında bu
// let'lerin tanımlandığı satırdan ÖNCE çağrılıyorsa TDZ hatası olurdu.
let calStep = 1;
let calPlaying = false;
let calOsc = null;
let calGain = null;
let calMeterRaf = null;
let calLevel = typeof prefs.calibrationLevel === "number" ? prefs.calibrationLevel : 35;
// Aynı TDZ nedeniyle burada: goScreen() donanım ses tuşu dinleyicisinin durumunu
// (watchVolume()'un döndürdüğü CallbackID) okuyup clearWatch() çağırıp çağırmayacağına
// karar veriyor — tanım aşağıda (kalibrasyon bölümünde) kalıyor, sadece değişken burada.
let volumeButtonsWatchId = null;

let autoPlaying = false;
let autoStopped = false;
let pausedAutoAdvanceRemainingMs = null;

// F2: karşılaştırma butonuna (cmp) basılınca otomatik-geçiş sayacı duraklar, önizleme
// penceresi bitince kaldığı yerden devam eder. pausedAutoAdvanceRemainingMs'den AYRI
// tutuluyor çünkü ikisi aynı anda (Durdur + cmp önizleme) tetiklenirse birbirini
// ezmemeli — pratikte nadiren çakışır ama iki farklı duraklatma nedeni birbirinden
// bağımsız izlenmeli.
let cmpPreviewRemainingMs = null;
let cmpPreviewStopTimer = null;

// G13: geri bildirim ekranı (prefs.feedbackScreen) kapalıyken cevap sonrası bu kadar
// bekleyip sıradaki soruya geçilir — 0 değil, ding/buzz sfx'i duyulabilsin diye kısa
// bir pay bırakılıyor (F2'nin 4000/6000'ine kıyasla "hızlı akış").
const QUICK_ADVANCE_MS = 700;

// G15: karşılaştırma önizlemesine (Senin cevabın/Doğru cevap/Temiz) basıldıktan bu
// kadar sonra otomatik-geçiş zamanlayıcısı YENİDEN kurulur — kaynağın (upload'ta
// dakikalarca olabilen) döngü uzunluğuna DEĞİL, sabit bu süreye bağlı (bkz. DURUM.md
// madde 13). Önizleme sesinin kendisi bu noktada durdurulmuyor, sadece geçiş
// beklemesi başlıyor — kullanıcı hâlâ dinliyorsa X ile istediği an atlayabilir.
const CMP_PREVIEW_RESUME_MS = 3000;

// Seans Sonu artık gerçek bir ekran (goScreen("result")) — eski "Oyun Bitti"
// KARTI'nın tam ekranı kaplayan yarı saydam overlay'i ve o overlay'e sızan
// gecikmeli tıklamalar (bkz. önceki turdaki "3.9 saniye gecikmeli click" bulgusu)
// artık mümkün değil: normal bir ekran, sadece butonlarla kapanıyor. Bu yüzden
// eski gameOverGuardActive()/GAMEOVER_CLICK_GUARD_MS koruması tamamen kaldırıldı.
let sessionEndVisible = false;

// "Kullanıcı Pro mu?" — TEK cevap noktası. Gerçek bir satın alma/IAP altyapısı
// henüz yok (bkz. buyProBtn — sadece "Yakında" toast'ı gösteriyor), bu yüzden
// gerçekPro her zaman false. devFlags.simulatePro — gizli geliştirici anahtarı
// (Hakkında/Sürüm numarasına 7 dokunuş, bkz. initDevMode) — SADECE test için,
// IAP yazılınca `gerçekPro || devFlags.simulatePro` deseni KORUNMALI (simülasyon
// katmanı gerçek satın alma mantığının ÜZERİNE eklendi, yerine geçmedi).
function isUserPro() {
  const realPro = false; // gerçek satın alma durumu — IAP yazılınca buraya bağlanacak
  return realPro || devFlags.simulatePro;
}

// "Karıştır": açıkken her tur rastgele bir kaynak seçilir (yüklenen dosya hariç);
// kapalıyken kaynak seçicideki değer kullanılır. Oturum içi, kalıcı değil.
let mixSources = false;

// 10 soruluk bölüm (challenge) durumu
let challenge = { active: false, total: 10, done: 0, correct: 0, xp: 0 };
const CHALLENGE_XP_MULT = 1.5;
function isChallenge() { return els.playModeSelect && els.playModeSelect.value === "challenge"; }
function xpMult() { return (challenge.active && isChallenge()) ? CHALLENGE_XP_MULT : 1; }

function persistStats() { storage.saveStats(stats, history); }
function persistDaily() { storage.saveDaily(daily); }
function recordAndPersistDailyAccuracy(correct) {
  storage.recordDailyAccuracy(dailyAcc, correct);
  storage.saveDailyAcc(dailyAcc);
}

// localStorage boşsa (ör. WKWebView temizlemişse) Preferences'taki yedekten kurtar.
(async function reconcileFromPreferences() {
  const recovered = await storage.reconcileFromPreferences();
  if (recovered.stats) { stats = storage.loadStats(difficultyLivesMap(), HINTS_PER_GAME, playableModeIds(), frekansBulma.MODE_ID); history = stats.history || []; }
  if (recovered.daily) { daily = storage.loadDaily(); }
  if (recovered.zoneStats) { zoneStats = storage.loadZoneStats(); }
  if (recovered.prefs) { prefs = storage.loadPrefs(); applyPrefs(); }
  if (recovered.stats || recovered.daily || recovered.zoneStats) {
    updateUI(); renderHistory(); renderDaily(); renderAnalysis();
  }
})();

// seçili zorluğun kendi durumu (xp/score/bestScore) — can artık burada DEĞİL,
// bkz. stats.lives (global, tek havuz).
function diffState() {
  const key = els.difficultySelect ? els.difficultySelect.value : "medium";
  if (!stats.perDiff) stats.perDiff = storage.freshStats(difficultyLivesMap(), HINTS_PER_GAME, playableModeIds()).perDiff;
  if (!stats.perDiff[key]) stats.perDiff[key] = storage.freshDiffState();
  return stats.perDiff[key];
}

// Z3: şu an OYNANAN modun kendi XP durumu — diffState() zorluk-adına göre, bu MOD
// adına göre ayrışır (bkz. core/storage.js freshModeState notu: perDiff birden fazla
// mod arasında çakışabilir, perMode çakışmaz).
function modeState() {
  const id = mode.getMeta().id;
  if (!stats.perMode) stats.perMode = storage.freshStats(difficultyLivesMap(), HINTS_PER_GAME, playableModeIds()).perMode;
  if (!stats.perMode[id]) stats.perMode[id] = storage.freshModeState();
  return stats.perMode[id];
}

function currentDifficultyConfig() {
  return mode.DIFFICULTY[els.difficultySelect.value];
}

function timerOff() {
  return els.timerModeSelect && els.timerModeSelect.value === "off";
}

// proplus'ta şıklı arayüz yok (4 bandı aynı anda işaretlemek gerekiyor) — o modda
// bu her zaman false döner, dokunmalı akış değişmeden çalışır.
function isChoiceFormat() {
  return !!(els.answerFormatSelect && els.answerFormatSelect.value === "choice"
    && activeQuestion && activeQuestion.mode !== "proplus");
}

// Aktif sorunun .ans grid'ini görünür/gizli tutar — hem yeni soru render'ında hem
// de "Cevap biçimi" ayarı değiştiğinde (bkz. answerFormatSelect'in change dinleyicisi)
// çağrılır.
function syncAnswerArea() {
  if (!els.answers) return;
  if (activeQuestion && isChoiceFormat()) {
    mode.renderAnswerChoices(els.answers, activeQuestion);
  } else {
    els.answers.innerHTML = "";
    els.answers.classList.add("hidden");
  }
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

// Canlar GLOBAL ve TEK bir havuz (stats.lives) — zorluktan, seanstan bağımsız.
// Otomatik dolum YOK: 0'a inince bir sonraki tur/seans/zorluk değişikliği/uygulama
// yeniden açılışı hiçbiri canı geri getirmez (ayrı bir "dolum" özelliği bekliyor).
// Bu yüzden eski resetLives() (canı zorluğun MAX'ına doldururdu) kaldırıldı —
// hiçbir çağıran artık canı "doldurma" davranışı istemiyor.

// currentLives'ı kalıcı depodan (stats.lives) okur ve kalpleri çizer. Zorluk
// değişikliğinde de çağrılabilir ama artık canı DEĞİŞTİRMEZ (global olduğu için).
function syncLives() {
  if (typeof stats.lives !== "number") stats.lives = storage.TOTAL_LIVES;
  currentLives = stats.lives;
  renderHearts();
}

// silent: F1 — frekans/proplus modunda zengin #freqInfo paneli zaten gösterileceği
// için buradaki #feedbackBox panelini AYRICA göstermez (can kaybı bilgisi çağıran
// tarafından appendFreqInfoNote ile #freqInfo'nun içine taşınıyor). onTimeUp gibi
// #freqInfo göstermeyen yerlerde silent VERİLMEZ — oradaki tek geri bildirim hâlâ bu.
function loseLife(reasonText, { silent = false } = {}) {
  // Pro (gerçek ya da geliştirici simülasyonu): can sınırı yok — DURUM.md'deki
  // ürün notu ("Pro'da can sınırı yok") + bu görevin isteği. currentLives hiç
  // AZALMAZ, bu yüzden aşağı akıştaki TÜM `currentLives<=0` kontrolleri (7 yer)
  // Pro'da doğal olarak hiç tetiklenmez — onları tek tek değiştirmek yerine kökten
  // (can hiç bitmiyor) çözüldü.
  if (isUserPro()) return;
  currentLives = Math.max(0, currentLives - 1);
  stats.lives = currentLives;
  renderHearts();
  if (currentLives <= 0) {
    if (!silent) setFeedback("Oyun bitti", `${reasonText} Canların tükendi.`, true, true);
    toast("💔 Oyun Bitti", "Canların tükendi.");
  } else if (!silent) {
    setFeedback("Can kaybettin", `${reasonText} Kalan can: ${currentLives}`, true, true);
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
  // "Canların bitti" varyasyonu SADECE ücretsiz sürümde gösterilir (kullanıcı kararı) —
  // Pro'da (gerçek ya da simüle) loseLife() zaten currentLives'ı hiç 0'a düşürmüyor
  // (bkz. loseLife tanımı) — bu satır o yüzden Pro'da pratikte hiç tetiklenmez, ama
  // yine de isUserPro() üzerinden doğru cevaba bakıyor (savunmacı, tek kaynak).
  if (!isUserPro()) showSessionEnd("lost");
  return true;
}

// zoneScores() DÜZ bir dizi döndürür (renderZonePanel() bunu {scores,enough}'a
// sarıp ayrıca DOM'a da yazıyor — burada o yan etkiyi istemediğimiz için aynı
// "n>=2 yeterli veri" filtresi lokal olarak tekrarlanıyor, renderDailyTip()'teki
// desenin aynısı). "Şu An Neredesin" (renderWhereNow) ile aynı cümle kalıbını üretir.
function zoneInsightSentence(enough) {
  if (enough.length < 2) return "";
  const sorted = enough.slice().sort((a, b) => a.pct - b.pct);
  const weak = sorted[0], strong = sorted[sorted.length - 1];
  return `${strong.label} bölgesinde iyisin (%${strong.pct}), ${weak.label.toLowerCase()} bölgesinde zorlanıyorsun (%${weak.pct}).`;
}

// kind: "lost" (canlar bitti) | "normal" (10 Soruluk Bölüm tamamlandı).
// Tasarımdaki (Dizayn/prototype.html #s-result) alanların TAMAMI gerçek oyun
// state'inden okunur — karşılığı olmayanlar (bkz. rapor: "önceki seansa göre +N
// puan" ve "odak setini aç" önerisi) BİLEREK atlandı, uydurulmadı.
function showSessionEnd(kind) {
  sessionEndVisible = true;
  const lost = kind === "lost";
  const xp = progress.xpProgress(diffState().xp);
  const nowLevel = xp.level;
  const leveledUp = !lost && sessionStartLevel !== null && nowLevel > sessionStartLevel;

  els.resKicker.textContent = lost ? "CANLARIN BİTTİ" : "SEANS TAMAMLANDI";
  els.resKicker.style.color = lost ? "var(--rd)" : "var(--gr)";

  const total = lost ? (session.correct + session.wrong) : challenge.total;
  const correctCount = lost ? session.correct : challenge.correct;
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  els.resPct.textContent = `%${pct}`;
  els.resScore.textContent = `${correctCount} / ${total} doğru`;
  const ringColor = lost ? "var(--rd)" : "var(--gr)";
  els.resRing.style.background = `conic-gradient(${ringColor} 0turn ${(pct / 100).toFixed(3)}turn, rgba(255,255,255,.08) ${(pct / 100).toFixed(3)}turn 1turn)`;

  const zoneEnough = zoneScores().filter(s => s.n >= 2);
  const insight = zoneInsightSentence(zoneEnough);
  const weakest = zoneEnough.length ? zoneEnough.slice().sort((a, b) => a.pct - b.pct)[0] : null;

  els.resHead.textContent = lost
    ? "Canların bitti, seans burada kapandı"
    : (weakest ? `${weakest.label} bölgede ilerleme var` : "Frekans Bulma seansını bitirdin");

  // Tasarımdaki "Son seansına göre +N puan" karşılaştırması VERİ KAYNAĞI YOK —
  // önceki seansın skor anlık görüntüsü hiçbir yerde tutulmuyor. Uydurmak yerine
  // sadece "lost" durumunda gerçek veriye dayanan bir cümle gösteriliyor, "normal"
  // durumda bu satır boş/gizli kalıyor.
  if (lost) {
    els.resLead.textContent = `${total} soruda bitti. Canların tükendi — can dolum özelliği henüz eklenmedi.`;
    els.resLead.classList.remove("hidden");
  } else {
    els.resLead.textContent = "";
    els.resLead.classList.add("hidden");
  }

  els.resLevelUp.classList.toggle("hidden", !leveledUp);
  if (leveledUp) els.resLevelUpBadge.textContent = nowLevel;

  els.resXp.textContent = `+${session.xp}`;
  els.resXpBar.style.width = `${Math.max(0, Math.min(100, (xp.current / xp.required) * 100))}%`;
  els.resLvl.textContent = `Seviye ${nowLevel}`;
  els.resXpNum.textContent = `${xp.current} / ${xp.required}`;

  els.resStreakMax.textContent = stats.bestCombo;
  els.resStreak.textContent = stats.combo;
  els.resHints.textContent = session.hints;

  const freqEntries = session.log.filter(e => e.freq != null);
  const hasFreqData = freqEntries.length > 0;
  els.resSumTitle.textContent = hasFreqData ? "BÖLGE HARİTASI" : "SORU SIRASI";
  els.resFreqMap.classList.toggle("hidden", !hasFreqData);
  els.resSeqMap.classList.toggle("hidden", hasFreqData);
  if (hasFreqData) {
    els.resDots.innerHTML = freqEntries.map((e, i) => {
      const x = mode.faFToX(e.freq, 1) * 100;
      const top = i % 2 ? 34 : 8;
      const color = e.correct ? "var(--gr)" : "var(--rd)";
      const glow = e.correct ? "rgba(43,217,168,.18)" : "rgba(255,77,109,.18)";
      return `<span style="position:absolute;left:${x}%;top:${top}px;width:14px;height:14px;margin-left:-7px;border-radius:99px;background:${color};box-shadow:0 0 0 3px ${glow}"></span>`;
    }).join("");
  } else if (session.log.length) {
    els.resBoxes.innerHTML = session.log.map(e =>
      `<span style="flex:1;height:26px;border-radius:7px;background:${e.correct ? "rgba(43,217,168,.85)" : "rgba(255,77,109,.8)"}"></span>`
    ).join("");
  } else {
    els.resBoxes.innerHTML = "";
  }

  els.resComment.textContent = insight || (weakest ? `${weakest.label} bölgesinde %${weakest.pct} isabetin var.` : "");

  goScreen("result");
}

function hideSessionEnd() {
  sessionEndVisible = false;
}

// ═══════════════════════════════════════════════════════════════════════════
// Geri bildirim / genel UI yardımcıları
// ═══════════════════════════════════════════════════════════════════════════

function setFeedback(title, detail, showResult = false, bad = false) {
  els.feedbackBox.querySelector("strong").textContent = title;
  els.feedbackDetail.textContent = detail;
  els.feedbackBox.classList.toggle("show-result", !!showResult);
  els.feedbackBox.classList.toggle("bad", !!bad);
  // Gerçek bir sonuç kartı gösterildiğinde (ambient/durum mesajları değil) kartın
  // tamamı görünür olsun diye alan yeniden ölçülür ve en alta kaydırılır.
  if (showResult) scrollFeedbackIntoView();
}

// F1: cevap sonrası #feedbackBox (basit başlık+metin) ve #freqInfo (mode.showFreqInfoPanel/
// showProPlusInfoPanel — karşılaştırma butonlu zengin panel) AYNI bilgiyi tekrar
// ediyordu, iki ayrı kart olarak görünüyordu. Tek kart kalsın diye submitFrequencyGuess/
// submitProPlusGuess artık #feedbackBox'ı GÖSTERMİYOR (showResult=false) — ama eski
// panelde olup yeni panelde HİÇ olmayan iki bilgi vardı (kalite sözcüğü: "🎯 Tam
// isabet!"/"Çok iyi!"/"Doğru!", ve yanlışta "Kalan can: N") — mode dosyalarına
// dokunmadan (bkz. iş kuralları) bunlar burada, #freqInfo'nun İÇİNE küçük bir not
// olarak ekleniyor. Var olan .cmprow'un (karşılaştırma butonları) hemen üstüne
// yerleşir; proplus'ta .cmprow yok, o zaman panelin sonuna eklenir.
function appendFreqInfoNote(text, ok) {
  if (!els.freqInfo || !text) return;
  const note = document.createElement("div");
  note.className = "freq-info-note";
  note.style.cssText = `margin-top:8px;font-size:14px;font-weight:700;color:${ok ? "var(--gr)" : "var(--rd)"}`;
  note.textContent = text;
  const cmprow = els.freqInfo.querySelector(".cmprow");
  if (cmprow) els.freqInfo.insertBefore(note, cmprow);
  else els.freqInfo.appendChild(note);
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
  if (els.hintStatCount) els.hintStatCount.textContent = stats.hintsRemaining;
  if (!els.hintBtn) return;
  const used = !!(activeQuestion && activeQuestion.hintUsed);
  els.hintBtn.textContent = used && activeQuestion.hintText
    ? activeQuestion.hintText
    : `İpucu Ver (${stats.hintsRemaining})`;
  els.hintBtn.disabled = stats.hintsRemaining <= 0 || !activeQuestion || !roundActive || used;
}

function setAnalyzerPhase(phase) {
  if (els.analyzer) els.analyzer.dataset.phase = phase;
}

function formatGainDb(gain) {
  const rounded = Math.round(gain * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded} dB`;
}

// A/B tek buton durumunu (A|B göstergesi + spektrum başlığı) currentPlayMode'a göre günceller.
function updateAbToggleUI() {
  if (!els.abToggle) return;
  const ab = currentPlayMode === "clean" ? "A" : "B";
  els.abToggle.dataset.ab = ab;
  if (els.analyzerLabel) els.analyzerLabel.textContent = ab === "A" ? "SPEKTRUM · A TEMİZ" : "SPEKTRUM · B İŞLENMİŞ";
}

// ═══════════════════════════════════════════════════════════════════════════
// Ekran yönlendirme (menü / oyun / ilerleme / araçlar)
// ═══════════════════════════════════════════════════════════════════════════

const TAB_TO_SCREEN = { train: "menu", progress: "progress", tools: "tools" };

// Ayarlar sheet'inden açılan yardım/bilgi ekranları (kalibrasyon, SSS, geri bildirim,
// iletişim, yasal metin, satın alma) tek seviye derinlikte — hangi ekrandan açıldığını
// hatırlayıp geri okuyla oraya dönmek için minik bir gezinme yığını yeterli.
let screenStack = ["menu"];
function goScreen(name) {
  const targetId = `screen-${name}`;
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === targetId));
  const target = document.getElementById(targetId);
  const tab = target && target.dataset.tab;
  if (els.tabbar) els.tabbar.classList.toggle("hide", !tab);
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", !!tab && t.dataset.tab === tab));
  if (target) {
    const scrollEl = target.querySelector(".scroll");
    if (scrollEl) scrollEl.scrollTop = 0;
  }
  if (name === "game") {
    // Oyun ekranı bir önceki karede "display:none" idi (canvas 0 yükseklikte
    // ölçülürdü). .active sınıfı yukarıda SENKRON uygulandığı için getBoundingClientRect
    // okumak tarayıcıyı güncel layout'u hesaplamaya zorlar — rAF'a gerek yok (rAF arka
    // planda/pasif sekmelerde ertelenebiliyor, bu da güvenilmez ölçümlere yol açıyordu).
    resizeCanvas();
    // E3 güvenlik ağı: cevap verilip actionbar tucked'ken kullanıcı "Geri"ye basıp
    // menüye çıkarsa (sonraki tur hiç renderQuestion() çağırmadan), bu sınıf DOM'da
    // takılı kalırdı — bir dahaki oyun ekranı girişinde "Oyunu Başlat" butonu bile
    // görünmez olurdu. Ekrana her girişte kayıtsız şartsız sıfırlanır; instant çünkü
    // bu bir ekran GİRİŞİ, kullanıcı çubuğun içeri kaymasını izlemiyor olmalı zaten.
    setActionbarTucked(false, { instant: true });
  } else if (abLoopTimer) {
    // Oyun ekranından çıkılınca A/B döngüsü arka planda dönmeye devam etmesin
    // (prototype.html: go() içindeki aynı temizlik, "s-game1" dışına çıkınca stopAbLoop).
    stopAbLoop();
  }
  closeMainSettingsSheet();
  // Kalibrasyon tonu sadece o ekrandayken çalsın — başka bir ekrana geçilince arka
  // planda çalmaya devam etmesin (geri, sekme değişimi, sheet üzerinden nav vb. hepsi
  // buradan geçtiği için tek bir kontrol noktası yeterli).
  if (name !== "calib" && calPlaying) stopCalibrationTone();
  // Donanım ses tuşu dinleyicisi de AYNI tek kontrol noktasından yönetilir — sadece
  // kalibrasyon ekranındayken aktif olsun, başka ekranda (özellikle oyun sırasında)
  // ses tuşları normal sistem davranışına dokunmasın.
  if (name === "calib") startVolumeButtonsWatch();
  else if (volumeButtonsWatchId) stopVolumeButtonsWatch();
  if (screenStack[screenStack.length - 1] !== name) screenStack.push(name);
  // HER doğrudan ekran geçişi bu bayrağı sıfırlar (tab tıklama, mod kartı, Araçlar'daki
  // kilit örtüsü → paywall, vb.). SADECE goToSettingsSubpage() kendi çağrısından SONRA
  // true'ya çeker — böylece bayrak her zaman "en son navigasyon ayarlardan mıydı?"
  // sorusuna doğru cevap verir, unutulmuş eski bir true değeri asla sızmaz.
  cameFromSettingsSheet = false;
}
function goBack(fallback = "menu") {
  screenStack.pop();
  goScreen(screenStack.pop() || fallback);
}

// Ayarlar sheet'inden açılan alt sayfalar (Kalibrasyon/SSS/Geri bildirim/Bize ulaşın/
// Gizlilik/Kullanım şartları/Pro'ya geç) için: geri tuşu doğrudan ana ekrana ATLAMAMALI,
// sheet'in açıldığı ekrana dönüp sheet'i TEKRAR açmalı. Paywall AYRICA Araçlar
// sekmesindeki kilit örtülerinden de açılabiliyor — o yol goScreen() üzerinden gittiği
// için bayrak otomatik false'a döner, goBackFromSubpage normal goBack() davranışına düşer.
let settingsReturnScreen = "menu";
let cameFromSettingsSheet = false;
function goToSettingsSubpage(name) {
  const active = document.querySelector(".screen.active");
  const returnScreen = active ? active.id.replace("screen-", "") : "menu";
  goScreen(name); // içeride cameFromSettingsSheet'i false yapar — sırayla ÖNCE bu çağrılır
  settingsReturnScreen = returnScreen;
  cameFromSettingsSheet = true; // ...sonra burada true'ya çekilir, kalıcı olan bu olur
}
function goBackFromSubpage(fallback = "menu") {
  if (cameFromSettingsSheet) {
    cameFromSettingsSheet = false;
    goScreen(settingsReturnScreen);
    openMainSettingsSheet();
    return;
  }
  goBack(fallback);
}

// Şimdilik tek mod var; kayıt defterinden beslenir, elle yazılmaz (bkz. core/registry.js).
// Menü ızgarası: core/mode-catalog.js'teki TÜM egzersiz listesinden (14 kayıt)
// besleniyor, motorlara göre gruplanıyor. Sadece registry.js'te GERÇEKTEN kayıtlı
// olan mod (listModes()) tıklanabilir/oynanabilir; diğerleri kilitli kart olarak
// görünür, tıklanınca "yakında" mesajı gösterir — oyun mantığı içermezler.
function renderModeGrid() {
  if (!els.modeGrid) return;
  const registeredModes = listModes();
  const motorCount = new Set(MODE_CATALOG.map(e => e.motor)).size;
  if (els.modeCount) els.modeCount.textContent = `${MODE_CATALOG.length} egzersiz · ${motorCount} oyun tipi`;

  const byMotor = new Map();
  MODE_CATALOG.forEach(entry => {
    if (!byMotor.has(entry.motor)) byMotor.set(entry.motor, []);
    byMotor.get(entry.motor).push(entry);
  });

  els.modeGrid.innerHTML = "";
  [...byMotor.keys()].sort((a, b) => a - b).forEach(motorNum => {
    const info = MOTOR_INFO[motorNum] || { label: "", color: "var(--tx)", bg: "rgba(255,255,255,.08)" };
    const entries = byMotor.get(motorNum);
    const group = document.createElement("div");
    group.className = "motor-group";
    // Başlıkta sadece oyun-tipi etiketi görünür — "Motor N" iç mimari jargonu,
    // kullanıcıya anlamsız (bkz. 6-düzeltme maddesi 4). Gruplama/renk mantığı AYNI,
    // sadece görünen metin değişti.
    group.innerHTML = `<div class="motor-group-head" style="color:${info.color}">${info.label}</div><div class="mode-grid${entries.length === 1 ? " single" : ""}"></div>`;
    const grid = group.querySelector(".mode-grid");
    entries.forEach(entry => {
      // Kart başlığı/açıklaması YALNIZCA katalogdan okunur — getMeta() artık bunları
      // döndürmüyor (bkz. frekans-bulma.js). Tek kaynak: 14 kart da aynı uzunluk
      // bandında, ızgara eşit duruyor. playable SADECE tıklama davranışı/kilit
      // görünümü için registry.js'teki gerçek kayda bakılarak belirlenir.
      const realMode = registeredModes.find(m => m.getMeta().id === entry.id);
      // Z3 KARARI: "Seviye N'de açılır" kilidi AKADEMİ (toplam) seviyesine bakar,
      // mod'un KENDİ seviyesine değil — unlockLevel'lar (1..20) henüz kodlanmamış
      // 13 modu da kapsayan genel bir içerik yol haritasını temsil ediyor; o modların
      // kendi XP kaynağı olmadığı için mod-bazlı seviyeye bakmak anlamsız olurdu.
      // Bugün TEK oynanabilir mod (frekans-bulma, unlockLevel:1) academyLevel her
      // zaman >=1 olduğu için bu kontrolden HER ZAMAN geçer — görünür bir değişiklik
      // yok, ama ikinci mod kodlandığında doğru mekanizma hazır olacak.
      const meetsLevel = progress.academyLevel(stats, playableModeIds()) >= entry.unlockLevel;
      const playable = !!realMode && meetsLevel;
      const card = document.createElement("button");
      card.type = "button";
      card.className = `mode-card${playable ? "" : " locked"}`;
      // "Motor N" rozeti kaldırıldı — kullanıcıya anlamsız iç mimari terimi, aynı
      // bilgi zaten grup başlığında ve renk kodunda var (bkz. madde 4). Pro rozeti
      // (tier==="pro") ile seviye kilidi (unlockLevel) AYRI iki gösterge — biri
      // kart üstünde, diğeri alt satırda; ikisi de gerektiğinde birlikte görünür.
      const proBadge = entry.tier === "pro" ? `<div class="mode-chip mode-chip-pro">Pro</div>` : "";
      const lockRow = playable
        ? `<div class="mode-mini"><i style="width:0%"></i></div>`
        : `<div class="mode-lock-row">🔒 Seviye ${turkishLocative(entry.unlockLevel)} açılır</div>`;
      card.innerHTML = `
        <div class="mode-top">
          <div class="mode-glyph" style="background:${info.bg}"><i style="height:12px;background:${info.color}"></i><i style="height:22px;background:${info.color}"></i><i style="height:16px;background:${info.color}"></i></div>
          ${proBadge}
        </div>
        <span class="mode-engine" style="color:${info.color}">${info.label}</span>
        <h4>${entry.ad}</h4>
        <p>${entry.aciklama}</p>
        ${lockRow}
      `;
      card.addEventListener("click", () => {
        if (playable) { goScreen("game"); return; }
        if (realMode && !meetsLevel) { toast("Seviye yetersiz", `Bu egzersiz Seviye ${entry.unlockLevel}'de açılır.`); return; }
        toast("Yakında", "Bu egzersiz yakında eklenecek.");
      });
      grid.appendChild(card);
    });
    els.modeGrid.appendChild(group);
  });
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
  // Z3/Z6: bu MOD seviyesi — diffState()'in yukarıdaki (perDiff, zorluk-bazlı) xp'sinden
  // FARKLI, progress.modeLevel() perMode'dan (mod-bazlı) okur.
  if (els.levelChip) els.levelChip.textContent = 'Seviye ' + progress.modeLevel(stats, mode.getMeta().id);
  if (els.gameAccValue) els.gameAccValue.textContent = `%${progress.accuracy(stats)}`;
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
  renderDailyTip();
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
  if (els.achievementCount) els.achievementCount.textContent = `${unlocked.size} / ${progress.ACHIEVEMENTS.length} kazanıldı`;
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

// ═══════════════════════════════════════════════════════════════════════════
// İlerleme sekmesi — Frekans bölgesi / Mod seviyeleri / Son 30 gün / Şu an neredesin
// mode.FA_ZONES zaten dışa açık (mod dosyasına dokunmadan içe aktarılıyor) — burada
// SADECE zoneStats'ı bu bölge tanımına göre bir "harita"ya çeviriyoruz.
// ═══════════════════════════════════════════════════════════════════════════

const ZONE_SHORT_LABEL = { "SUB": "Sub", "BAS": "Bas", "ALT-ORTA": "Alt-orta", "ORTA": "Orta", "ÜST-ORTA": "Üst-orta", "TİZ / HAVA": "Tiz" };

function zoneScores() {
  return mode.FA_ZONES.map(z => {
    const key = z.t.split(" (")[0];
    const v = zoneStats[key] || { n: 0, ok: 0 };
    const pct = v.n > 0 ? Math.round((v.ok / v.n) * 100) : null;
    return { key, label: ZONE_SHORT_LABEL[key] || key, n: v.n, pct };
  });
}

function renderZonePanel() {
  const scores = zoneScores();
  if (els.zoneList) {
    els.zoneList.innerHTML = scores.map(s => {
      const hasData = s.pct !== null;
      const pct = hasData ? s.pct : 0;
      const color = !hasData ? "rgba(255,255,255,.18)" : pct >= 70 ? "var(--gr)" : pct >= 45 ? "var(--am)" : "var(--rd)";
      return `<div class="zone-bar-row">
        <span style="width:76px;flex:none;font-size:14px;color:var(--tx-3)">${s.label}</span>
        <div class="zone-bar-track"><i style="width:${pct}%;background:${color}"></i></div>
        <span class="num" style="width:42px;flex:none;text-align:right;font-size:14px;font-weight:700;color:${hasData ? color : "var(--tx-3)"}">${hasData ? "%" + s.pct : "—"}</span>
      </div>`;
    }).join("");
  }
  const enough = scores.filter(s => s.n >= 2);
  const weakest = enough.length ? enough.slice().sort((a, b) => a.pct - b.pct)[0] : null;
  if (els.zoneSub) els.zoneSub.textContent = weakest ? `en zayıf: ${weakest.label.toLowerCase()} · %${weakest.pct}` : "henüz yeterli veri yok";
  return { scores, enough };
}

function renderWhereNow(zoneResult) {
  if (!els.whereNowText) return;
  const enough = zoneResult.enough;
  if (enough.length < 2) {
    els.whereNowText.textContent = "Birkaç tur daha oynayınca burada kişisel bir özet göreceksin.";
    return;
  }
  const sorted = enough.slice().sort((a, b) => a.pct - b.pct);
  const weak = sorted[0], strong = sorted[sorted.length - 1];
  els.whereNowText.textContent = `${strong.label} bölgesinde iyisin (%${strong.pct}), ${weak.label.toLowerCase()} bölgesinde zorlanıyorsun (%${weak.pct}).`;
}

// Ana menüdeki "Bugünün Önerisi" kartı — en zayıf bölgeyi zoneScores()'tan (İlerleme
// sekmesiyle aynı hesap) okuyup tek cümlelik öneri üretir. Yeterli veri yoksa
// (en az 1 bölgede n>=2) kart hiç gösterilmez — genel bir karşılama mesajı YAZMADIK,
// çünkü "Başla" butonu odak-aralığı özelliği olmadan anlamsız bir vaat olurdu.
function renderDailyTip() {
  if (!els.dailyTipCard) return;
  if (daily.tipDismissed) { els.dailyTipCard.classList.add("hidden"); return; }
  const enough = zoneScores().filter(s => s.n >= 2);
  if (!enough.length) { els.dailyTipCard.classList.add("hidden"); return; }
  const weakest = enough.slice().sort((a, b) => a.pct - b.pct)[0];
  if (els.dailyTipText) els.dailyTipText.textContent = `${weakest.label} bölgede isabetin %${weakest.pct}. Bugün oraya odaklanmayı dene.`;
  els.dailyTipCard.classList.remove("hidden");
}

// Bir modun "seviyesi": stats.perMode[modId].xp'den hesaplanır (bkz. progress.modeXp).
// Z3 ÖNCESİ bu fonksiyon mode.DIFFICULTY anahtarlarının perDiff'teki XP'sini
// TOPLUYORDU — tek mod varken doğru sonuç veriyordu ama YAPISAL OLARAK YANLIŞTI:
// perDiff zorluk-ADINA göre anahtarlanıyor (easy/medium/...), MOD'a göre değil; iki
// farklı mod aynı zorluk adını kullanırsa (çoğu MODE_CATALOG girdisi muhtemelen
// kullanacak) XP'leri KARIŞIRDI. perMode (Z3) her modun kendi ad alanı olduğu için
// bu çakışmayı yapısal olarak önlüyor. İsabet yüzdesi hâlâ GENEL istatistik
// (progress.accuracy(stats)) — mod-bazlı isabet takibi Z3'ün kapsamı dışında.
function modeTotalXp(modeApi) {
  return progress.modeXp(stats, modeApi.getMeta().id);
}

function renderModeLevels() {
  const modes = listModes();
  if (els.modeLevelsList) {
    els.modeLevelsList.innerHTML = modes.map(m => {
      const meta = m.getMeta();
      // Ad, getMeta()'da yok (kart metni yalnızca MODE_CATALOG'tan okunur) — burada
      // da aynı tek kaynağa bakılır, id üzerinden eşleştirilir.
      const catalogEntry = MODE_CATALOG.find(e => e.id === meta.id);
      const displayName = catalogEntry ? catalogEntry.ad : meta.id;
      const totalXp = modeTotalXp(m);
      const played = totalXp > 0;
      const xp = progress.xpProgress(totalXp);
      const pct = played ? Math.max(0, Math.min(100, Math.round((xp.current / xp.required) * 100))) : 0;
      const acc = played ? progress.accuracy(stats) : null;
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;${played ? "" : "opacity:.45"}">
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:600">${displayName}</div>
          <div style="margin-top:8px;height:6px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden">
            <i style="display:block;height:100%;width:${pct}%;border-radius:99px;background:linear-gradient(90deg,var(--gr),#16C79A)"></i>
          </div>
        </div>
        <div style="flex:none;text-align:right">
          <div style="display:inline-block;padding:4px 9px;border-radius:99px;background:rgba(255,255,255,.08);font-size:14px;font-weight:700">${played ? `Sv ${xp.level}` : "Yeni"}</div>
          <div class="num" style="margin-top:6px;font-size:14px;font-weight:700;color:${played ? "var(--tx-2)" : "var(--tx-3)"}">${played ? `%${acc}` : "—"}</div>
        </div>
      </div>`;
    }).join("");
  }
  const playedCount = modes.filter(m => modeTotalXp(m) > 0).length;
  if (els.modeLevelsSub) els.modeLevelsSub.textContent = `${playedCount} / ${modes.length} mod oynandı`;
}

function last30DailyAccPoints() {
  const today = new Date();
  const points = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const v = dailyAcc[key];
    if (v && v.total > 0) points.push({ key, pct: Math.round((v.correct / v.total) * 100) });
  }
  return points;
}

function renderAccuracyChart() {
  const points = last30DailyAccPoints();
  const hasChart = points.length >= 3;
  if (els.accChartSvg) els.accChartSvg.classList.toggle("hidden", !hasChart);
  if (els.accChartLabels) els.accChartLabels.classList.toggle("hidden", !hasChart);
  if (els.accChartEmpty) els.accChartEmpty.classList.toggle("hidden", hasChart);
  if (!hasChart) return;
  const W = 320, H = 110;
  const xs = points.map((p, i) => (i / (points.length - 1)) * W);
  const ys = points.map(p => H - (p.pct / 100) * H);
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const fill = `${line} L${xs[xs.length - 1].toFixed(1)} ${H} L${xs[0].toFixed(1)} ${H} Z`;
  if (els.accChartSvg) {
    els.accChartSvg.innerHTML =
      `<path d="${fill}" fill="rgba(43,217,168,.12)" stroke="none"></path>` +
      `<path d="${line}" fill="none" stroke="var(--gr)" stroke-width="2.5" stroke-linejoin="round"></path>` +
      `<circle cx="${xs[xs.length - 1].toFixed(1)}" cy="${ys[ys.length - 1].toFixed(1)}" r="4.5" fill="var(--gr)"></circle>`;
  }
  if (els.accChartFirst) els.accChartFirst.textContent = `%${points[0].pct}`;
  if (els.accChartLast) els.accChartLast.textContent = `bugün %${points[points.length - 1].pct}`;
}

function formatPracticeDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}s ${m}d` : `${m}d`;
}

function renderExtraStats() {
  if (els.totalRoundsValue) els.totalRoundsValue.textContent = stats.rounds;
  if (els.totalPracticeValue) els.totalPracticeValue.textContent = formatPracticeDuration(stats.totalPracticeMs || 0);
}

function renderAnalysis() {
  const zoneResult = renderZonePanel();
  renderWhereNow(zoneResult);
  renderModeLevels();
  renderAccuracyChart();
  renderExtraStats();
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
  // Seans Sonu'ndaki bölge haritası/soru sırası için — freq sadece tek-frekanslı
  // sorularda (proplus DEĞİL) dolu olur, bkz. session.log tanımındaki not.
  session.log.push({ correct, freq: activeQuestion.mode === "frequency" ? activeQuestion.freq : null });
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
  if (els.hintTag) els.hintTag.textContent = "İPUCU · " + activeQuestion.hintText;
  setAnalyzerPhase("hint");

  mode.renderHintMask(els.hintMaskLayer, activeQuestion);
  updateHintChipLabel();
}

// ═══════════════════════════════════════════════════════════════════════════
// Soru render / gönderim
// ═══════════════════════════════════════════════════════════════════════════

function renderQuestion() {
  const q = activeQuestion;
  roundActive = true;
  // instant:true — bkz. setActionbarTucked tanımı: birazdan aynı fonksiyon içinde
  // şıklı modda scrollFeedbackIntoView senkron scrollHeight okuyacak, margin geçişi
  // yarıda yakalanmasın diye bu tek çağrı animasyonsuz.
  setActionbarTucked(false, { instant: true }); // yeni soru — kontroller tekrar anlamlı, çubuk geri gelsin

  mode.clearHintMask(els.hintMaskLayer);
  updateHintChipLabel();

  els.questionTitle.textContent =
    q.mode !== "proplus"
      ? "Hangi frekansla oynandı? Dalga üzerine tıkla."
      : "4 frekansla oynandı — dördünü de dalga üzerinde işaretle.";

  els.questionMeta.textContent = mode.modeDescription(q);
  els.streakText.textContent = q.boss ? "Boss round aktif" : (stats.combo > 1 ? `${stats.combo}x combo aktif` : "Yeni challenge");
  // prototype.html'de sayaç her zaman "Soru N/10" — ama tasarımda "Serbest (sonsuz)"
  // diye bir kavram hiç yok, oradaki "10" sabit varsayılan seans uzunluğu. Bizde bu
  // ayrım gerçek (challenge.active), bu yüzden "/10" SADECE 10 Soruluk Bölüm'de
  // gösteriliyor — Serbest'te sonsuz bir "/10" yanıltıcı olurdu.
  els.roundChip.textContent = challenge.active
    ? `Soru ${challenge.done + 1}/${challenge.total}`
    : `Soru ${stats.rounds + 1}`;
  els.scoreChip.textContent = `Skor ${diffState().score}`;
  els.bossChip.textContent = q.boss ? "Boss" : "Normal";
  els.bossChip.className = `chip ${q.boss ? "boss" : ""}`;

  freqGuessHz = null; freqHoverHz = null;
  if (q.mode === "proplus") { q.guesses = []; q._result = null; }
  revealAnimator.reset();
  setAnalyzerPhase("ask");
  if (els.gainValue) els.gainValue.textContent = "";
  if (els.hintTag) els.hintTag.textContent = "";
  els.freqGuessArea.classList.remove("hidden");
  mode.renderGuessAreaControls(els.freqGuessArea, q);
  if (els.freqInfo) els.freqInfo.classList.add("hidden");
  syncAnswerArea();
  // Şıklı cevap modunda 4-6 şık iki satıra taşıyor (.answers: 3 sütunlu grid) — bu,
  // dokunmalı moddaki analizöre göre EKSTRA yükseklik demek. Dokunmalı modda scroll
  // ETMİYORUZ (kullanıcının tıklaması gereken dalga/analizör görünür kalmalı); şıklı
  // modda ise analizör sadece dekoratif, cevap kullanıcının GÖRMESİ gereken asıl
  // içerik — son şıkkın altbar arkasında kalmaması için tur başlar başlamaz
  // scrollFeedbackIntoView'ın AYNI momentum-scroll-güvenli mekanizmasıyla aşağı kaydır.
  if (isChoiceFormat()) scrollFeedbackIntoView();

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
  setActionbarTucked(true); // süre doldu — cevap verilmemiş olsa da tur bitti, kontroller aynı şekilde işlevsiz
  if (activeQuestion.mode === "frequency") activeQuestion.freqRevealed = true;
  setAnalyzerPhase("done");
  if (els.gainValue) els.gainValue.textContent = activeQuestion.mode === "frequency" ? formatGainDb(activeQuestion.gain) : "";
  stats.rounds++;
  stats.wrong++;
  stats.combo = 0;
  diffState().score = Math.max(0, diffState().score - 20); // skor 0 altına inmez
  session.wrong++;
  audioEngine.stopAudio();
  loseLife(`Süre doldu. Doğru cevap: ${mode.correctLabel(activeQuestion)}.`);
  pushHistory(false);
  updateDaily(false);
  accumulatePracticeTime();
  recordAndPersistDailyAccuracy(false);
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
  setActionbarTucked(true);

  const q = activeQuestion;
  q.freqRevealed = true;
  const result = mode.evaluateAnswer(q, guessHz);
  setAnalyzerPhase("done");
  if (els.gainValue) els.gainValue.textContent = formatGainDb(q.gain);
  if (isChoiceFormat()) mode.markAnswerChoices(els.answers, q, guessHz);

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
    modeState().xp += gained; // Z3: mod-bazlı seviye buradan besleniyor (bkz. progress.modeLevel)
    diffState().score += gained * Math.max(1, stats.combo);
    diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
    if (q.difficulty === "pro") stats.proCorrect++;
    if (q.boss) stats.bossWins++;
    session.correct++; session.xp += gained;

    const feedback = mode.getFeedbackData(q, guessHz, { gained });
    // F1: #feedbackBox artık GÖSTERİLMİYOR (showResult zorla false) — #freqInfo aynı
    // bilgiyi zaten veriyor. feedback.title'daki kalite sözcüğü ("🎯 Tam isabet!" vb.)
    // #freqInfo'nun kendi içeriğinde YOK, kaybolmasın diye panelin içine taşınıyor.
    setFeedback(feedback.title, feedback.detail, false, false);
    if (prefs.feedbackScreen) {
      mode.showFreqInfoPanel(els.freqInfo, feedback);
      appendFreqInfoNote(feedback.title, true);
      scrollFeedbackIntoView();
    }
    mode.recordZone(zoneStats, q.freq, true, result.dOct);
    audioEngine.sfxDing();
    spawnXp(`+${gained} XP`, els.canvas);
    burst(els.canvas);
    challengeTick(true, gained);
  } else {
    stats.wrong++;
    stats.combo = 0;
    diffState().score = Math.max(0, diffState().score - 20); // skor 0 altına inmez
    session.wrong++;

    const feedback = mode.getFeedbackData(q, guessHz, { gained: 0 });
    // F1: aynı — #feedbackBox gösterilmiyor, loseLife de silent (kendi panelini
    // göstermiyor); "Kalan can: N" bilgisi kaybolmasın diye #freqInfo'nun içine
    // taşınıyor (currentLives, loseLife çağrısından SONRA okunuyor — güncel değer).
    setFeedback(feedback.title, feedback.detail, false, true);
    if (prefs.feedbackScreen) mode.showFreqInfoPanel(els.freqInfo, feedback);
    mode.recordZone(zoneStats, q.freq, false, result.dOct);
    audioEngine.sfxBuzz();
    shake(els.canvas);
    loseLife("Frekansı ıskaladın.", { silent: true });
    if (prefs.feedbackScreen) {
      appendFreqInfoNote(currentLives > 0 ? `Kalan can: ${currentLives}` : "Canların tükendi.", false);
      scrollFeedbackIntoView();
    }
    challengeTick(false, 0);
  }

  storage.saveZoneStats(zoneStats);
  audioEngine.stopAudio();
  pushHistory(result.correct);
  updateDaily(result.correct);
  accumulatePracticeTime();
  recordAndPersistDailyAccuracy(result.correct);
  notifyNewAchievements();
  updateUI();
  persistStats();
  persistDaily();
  // F2 (kullanıcı kararı): doğru cevapta 4sn, yanlışta 6sn — içerik yoğun kart artık
  // 1.5sn'de okunamıyordu. G13: geri bildirim ekranı kapalıyken kart hiç gösterilmediği
  // için bu süreye gerek yok — QUICK_ADVANCE_MS sadece ding/buzz'ın duyulmasına yetecek
  // kadar kısa bir bekleme.
  if (!finalizeIfGameOver()) scheduleNext(prefs.feedbackScreen ? (result.correct ? 4000 : 6000) : QUICK_ADVANCE_MS);
}

function submitProPlusGuess() {
  if (!roundActive || !activeQuestion || activeQuestion.mode !== "proplus") return;
  roundActive = false;
  roundFlow.clearTimer();
  setActionbarTucked(true);

  const q = activeQuestion;
  q.freqRevealed = true;
  const result = mode.evaluateAnswer(q, q.guesses);
  setAnalyzerPhase("done");
  if (els.gainValue) els.gainValue.textContent = ""; // çok bantlı: tek bir gain değeri anlamlı değil

  result.bands.forEach(b => mode.recordZone(zoneStats, b.freq, b.correct, b.dOct));
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
    modeState().xp += gained; // Z3: mod-bazlı seviye buradan besleniyor (bkz. progress.modeLevel)
    diffState().score += gained * Math.max(1, stats.combo);
    diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
    if (q.boss) stats.bossWins++;
    session.correct++; session.xp += gained;

    feedback = mode.getFeedbackData(q, q.guesses, { gained });
    // F1: aynı desen — #feedbackBox gösterilmiyor, kaybolan bilgi (kalite başlığı)
    // aşağıda showProPlusInfoPanel'den SONRA #freqInfo'ya taşınıyor.
    setFeedback(feedback.title, feedback.detail, false, false);
    spawnXp(`+${gained} XP`, els.canvas);
    burst(els.canvas);
  } else {
    stats.wrong++;
    stats.combo = 0;
    diffState().score = Math.max(0, diffState().score - 15); // skor 0 altına inmez
    session.wrong++;

    feedback = mode.getFeedbackData(q, q.guesses, { gained: 0 });
    setFeedback(feedback.title, feedback.detail, false, true);
    shake(els.canvas);
    loseLife("Bantları ıskaladın.", { silent: true });
  }

  challengeTick(result.correct, gained);
  mode.showProPlusInfoPanel(els.freqInfo, feedback);
  // F1: showProPlusInfoPanel'in kendi içeriğinde olmayan bilgi — doğruysa kalite
  // başlığı, yanlışsa kalan can sayısı — panelin sonuna not olarak ekleniyor.
  appendFreqInfoNote(
    result.correct ? feedback.title : (currentLives > 0 ? `Kalan can: ${currentLives}` : "Canların tükendi."),
    result.correct
  );
  scrollFeedbackIntoView();
  els.freqGuessArea.innerHTML = `<span style="color:var(--tx-3);font-size:13px">Tur bitti · "Yeni Soru" ile devam.</span>`;

  q._result = result.bands.map(b => ({ freq: b.freq, gain: b.gain, correct: b.correct })).sort((a, z) => a.freq - z.freq);
  revealAnimator.start(q._result);

  audioEngine.stopAudio();
  pushHistory(result.correct);
  updateDaily(result.correct);
  accumulatePracticeTime();
  recordAndPersistDailyAccuracy(result.correct);
  notifyNewAchievements();
  updateUI();
  persistStats();
  persistDaily();
  // F2 (kullanıcı kararı): doğru cevapta 4sn, yanlışta 6sn.
  if (!finalizeIfGameOver()) scheduleNext(result.correct ? 4000 : 6000);
}

// ═══════════════════════════════════════════════════════════════════════════
// Ses oynatma
// ═══════════════════════════════════════════════════════════════════════════

// Turun sesini SIFIRDAN kurar — sadece round başlangıcında (ve F2'nin karşılaştırma
// önizleme butonlarında) çağrılmalı. A/B toggle'ı ARTIK bunu çağırmıyor (bkz. toggleAB) —
// kaynak/filtre grafiği bir kez kurulup tur boyunca bozulmuyor.
function playQuestion(processed = true) {
  if (!audioEngine.audioReady || !activeQuestion) return;
  if (audioEngine.audioCtx && audioEngine.audioCtx.state === "suspended") {
    try { audioEngine.audioCtx.resume(); } catch (e) {}
  }
  currentPlayMode = processed ? "filtered" : "clean";
  audioEngine.buildQuestionChain(activeQuestion, processed, activeQuestion.source, uploadManager, mode.applyProcessing);
  updateAbToggleUI();
}

// A/B tek buton: GERÇEK kesintisiz bypass — grafiği yeniden KURMUYOR, sadece
// audioEngine.setProcessed() ile paralel kuru/işlenmiş yollar arasında gain crossfade
// yapıyor (bkz. audio-engine.js buildQuestionChain'in üstündeki not). Kök sebep (tarihsel):
// eski MediaElementAudioSourceNode tabanlı upload yolunda (bkz. G8 — artık
// AudioBufferSourceNode'a taşındı) canlı çalan node'un A/B döngüsünde 2sn'de bir
// disconnect/reconnect edilmesi WebKit'te JS'ten gözlemlenemeyen bir motor-düzeyi
// pitch/hız sapmasına yol açabiliyordu (kullanıcı raporu + teşhis) — reconnect deseni
// tamamen kaldırıldı, hâlâ geçerli (kaynak tipi değişse de A/B'nin grafiği yeniden
// kurmaması gerekliliği aynı).
function toggleAB() {
  const processed = currentPlayMode !== "filtered";
  currentPlayMode = processed ? "filtered" : "clean";
  audioEngine.setProcessed(processed);
  updateAbToggleUI();
}

// A/B uzun basma döngüsü: her 2000ms'de bir toggleAB() çağırıp A/B arasında otomatik
// gidip gelir (prototype.html ile aynı zamanlama). toggleAB() zaten playQuestion()
// üzerinden çalıyor — döngü SADECE bu çağrıyı periyodik tekrarlıyor, A/B geçişinin
// kesintisiz bypass olmayışı (ses baştan başlıyor) burada ÇÖZÜLMEDİ, ayrı bir iş.
function startAbLoop() {
  if (abLoopTimer) return;
  abLoopTimer = setInterval(toggleAB, 2000);
  if (els.abToggle) els.abToggle.classList.add("loop");
  if (els.abTitle) els.abTitle.textContent = "Döngü";
}
function stopAbLoop() {
  if (!abLoopTimer) return;
  clearInterval(abLoopTimer);
  abLoopTimer = null;
  if (els.abToggle) els.abToggle.classList.remove("loop");
  if (els.abTitle) els.abTitle.textContent = "A/B Test";
  updateAbToggleUI();
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

function scheduleNext(durationMs) {
  ensureAutoNext(durationMs);
}

// F2: bekleyen bir cmp-önizleme duraklatması varsa iptal eder (zamanlayıcıyı VE
// biriktirilmiş kalan süreyi atar, geri YÜKLEMEZ). Yeni bir tur başlarken ya da manuel
// "Durdur"/"Atla" ile akış değiştiğinde çağrılır — aksi halde önizleme zamanlayıcısı
// birkaç saniye sonra ateşlenip YENİ turun sesini durdurup sahte bir ensureAutoNext()
// tetikleyebilir.
function cancelCmpPreviewPause() {
  clearTimeout(cmpPreviewStopTimer);
  cmpPreviewStopTimer = null;
  cmpPreviewRemainingMs = null;
}

// "Durdur" — hiçbir kaynağı/node'u durdurmaz, sadece sesi/zamanlayıcıyı askıya alır.
function pauseRound() {
  autoPlaying = false;
  autoStopped = true;
  // F2: bir cmp-önizleme duraklatması zaten aktifse (autoAdvance zamanlayıcısı onun
  // tarafından temizlenmiş durumda) roundFlow'dan captureRemainingAndClear() null
  // dönerdi — biriktirilmiş cmpPreviewRemainingMs'i buraya devral, önizleme
  // zamanlayıcısını iptal et (Durdur bittiğinde "Tekrar Çal" zaten kendi akışıyla
  // devam ettirecek, önizlemenin kendi resume'u tekrar tetiklenmesin).
  pausedAutoAdvanceRemainingMs = roundFlow.captureRemainingAndClear();
  if (pausedAutoAdvanceRemainingMs === null && cmpPreviewRemainingMs !== null) {
    pausedAutoAdvanceRemainingMs = cmpPreviewRemainingMs;
  }
  cancelCmpPreviewPause();
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
  if (sessionEndVisible) return; // seans sonu ekranı açıkken hiçbir tetikleyici yeni tur başlatamaz
  if (currentLives <= 0) { if (!isUserPro()) showSessionEnd("lost"); return; }
  if (els.sourceSelect.value === "upload" && !uploadManager.hasBuffer) {
    setFeedback("Önce ses yükle", "Kaynak olarak yüklenen ses seçiliyse bir mp3/wav dosyası seçmelisin.");
    return;
  }

  cancelCmpPreviewPause();
  autoStopped = false;
  autoPlaying = true;
  roundStartedAt = Date.now();
  applyAutoDifficulty(); // Z5: Otomatik modda els.difficultySelect.value burada güncellenir

  activeQuestion = mode.createQuestion(els.difficultySelect.value, {
    source: pickRoundSource(),
    boss: mode.isBossRound(stats.rounds),
    focusRange: currentFocusRange(),
    zoneStats // Z4: zayıf bölgelere ağırlıklı test frekansı — proplus/çeldiriciler etkilenmez
  });
  // Karıştır açıkken çalan kaynak sourceSelect'ten farklı olabilir — chip her zaman
  // o turda GERÇEKTEN çalan kaynağın adını göstersin.
  if (els.sourceChipLabel) els.sourceChipLabel.textContent = labelSource(activeQuestion.source);
  renderQuestion();
  playQuestion(true);
  updateStartBtnLabel();
  scrollToAnalyzer();
  startTimerForCurrentQuestion();
}

// Kaynak seçimi: "Karıştır" açıksa her tur rastgele bir üretici kaynak seçilir
// (yüklenen dosya hariç); kapalıyken kaynak seçicideki değer kullanılır.
function pickRoundSource() {
  const sel = els.sourceSelect.value;
  if (mixSources && sel !== "upload") {
    const pool = SOURCE_GROUPS.flatMap(g => g.sources).filter(s => s.kind !== "upload").map(s => s.id);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return sel;
}

// Seçili odak aralığının [min, max] Hz'ini döndürür. Mod odak kavramını desteklemiyorsa
// (mode.FOCUS_RANGES yok) veya chip/select henüz kurulmadıysa undefined döner —
// createQuestion bunu "tüm spektrum" olarak yorumlar (bkz. frekans-bulma.js).
function currentFocusRange() {
  if (!mode.FOCUS_RANGES || !els.focusSelect) return undefined;
  const focus = mode.FOCUS_RANGES[els.focusSelect.value];
  return focus ? focus.range : undefined;
}

// Mobilde oyun başlayınca dalgayı görünür yap (tıklama alanına hızlı erişim)
function scrollToAnalyzer() {
  const isTouch = window.matchMedia("(hover:none) and (pointer:coarse)").matches;
  if (!isTouch) return;
  const wrap = els.canvas && els.canvas.closest(".analyzer");
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
    // NOT: ipucu hakkı BURADA sıfırlanmaz (bkz. startFreshAttempt) — reload sonrası
    // "Oyunu Başlat"a tekrar basmak sınırsız ipucu üretmemeli.
    if (els.sourceSelect.value === "upload") {
      uploadManager.startFromZero();
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
  // "Normal" (kaybetmeden biten) Seans Sonu SADECE burada, 10 Soruluk Bölüm
  // tamamlanınca tetiklenir (kullanıcı kararı) — serbest modun doğal bir bitişi
  // olmadığı için serbest modda bu ekran hiç çıkmaz.
  showSessionEnd("normal");
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

  const w = canvasCssW;
  const h = canvasCssH;
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
  drawSpectrumBars(data, w, plotBottom);

  mode.drawOverlay(ctx2d, els.canvas, w, h, overlayState);
}

// Prototipteki spektrum paneliyle aynı dil: ~40 kalın, aralıklı, üstü yuvarlatılmış
// çubuk (FFT bin'lerinin bitişik ince çizgileri değil). Çubuklar FA_MIN–FA_MAX
// arasında LOGARİTMİK olarak yerleştirilir — bu, eksen etiketleriyle (drawFreqAxis)
// ve tıklama→Hz dönüşümüyle (faXToF) AYNI ölçektir; aksi halde enerji sol uçta
// sıkışır ve tıklanan yer ile ölçülen frekans uyuşmaz.
const SPEC_BAR_COUNT = 40;
// Çubuk:boşluk oranı prototipteki gibi ~3:1 (kalın, tıknaz çubuklar — ince dikey
// çizgiler değil). Tepe yüksekliği CURVE_TOP..plotBottom bölgesinin %75'i kadar —
// prototipteki panelle aynı oranda (üstte bir miktar nefes payı bırakır ama
// çubukları alt yarıya sıkıştırmaz), yine de CURVE_TOP'un üstüne (etiket şeridine)
// taşmaz.
function drawSpectrumBars(data, w, plotBottom) {
  const sampleRate = (audioEngine.audioCtx && audioEngine.audioCtx.sampleRate) || 44100;
  const fftSize = (audioEngine.analyser && audioEngine.analyser.fftSize) || 2048;
  const hzPerBin = sampleRate / fftSize;
  const maxBin = data.length - 1;
  const slotW = w / SPEC_BAR_COUNT;
  const barW = Math.max(1, slotW * 0.75);
  const barRegion = Math.max(20, plotBottom - mode.CURVE_TOP);
  const maxBarH = barRegion * 0.75;

  for (let b = 0; b < SPEC_BAR_COUNT; b++) {
    // Bu çubuğun kapsadığı Hz aralığı — eksenle birebir aynı log ölçek (bkz. mode.faFToX),
    // bu yüzden aralık sınırları w üzerinde her zaman eşit genişlikte düşer.
    const f0 = mode.FA_MIN * Math.pow(mode.FA_MAX / mode.FA_MIN, b / SPEC_BAR_COUNT);
    const f1 = mode.FA_MIN * Math.pow(mode.FA_MAX / mode.FA_MIN, (b + 1) / SPEC_BAR_COUNT);
    const bin0 = Math.max(0, Math.floor(f0 / hzPerBin));
    const bin1 = Math.max(bin0, Math.min(maxBin, Math.ceil(f1 / hzPerBin)));
    let sum = 0;
    for (let k = bin0; k <= bin1; k++) sum += data[k];
    const avg = sum / (bin1 - bin0 + 1);

    const barH = (avg / 255) * maxBarH;
    if (barH < 1) continue;
    const x = b * slotW + (slotW - barW) / 2;
    drawSpectrumBar(x, plotBottom - barH, barW, barH);
  }
}

function drawSpectrumBar(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  ctx2d.beginPath();
  ctx2d.moveTo(x, y + h);
  ctx2d.lineTo(x, y + r);
  ctx2d.arcTo(x, y, x + r, y, r);
  ctx2d.lineTo(x + w - r, y);
  ctx2d.arcTo(x + w, y, x + w, y + r, r);
  ctx2d.lineTo(x + w, y + h);
  ctx2d.closePath();
  const grad = ctx2d.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, "rgba(108,140,255,.85)");
  grad.addColorStop(1, "rgba(108,140,255,.15)");
  ctx2d.fillStyle = grad;
  ctx2d.fill();
}

// Canvas tıklama/hover — sadece tur aktifken (aktif mod her zaman dalga tabanlı).
// Çizim koordinat uzayı CSS piksel cinsinden olduğu için (bkz. resizeCanvas), tıklama
// pozisyonu da doğrudan CSS piksele göre hesaplanır — ayrı bir iç-çözünürlük çevrimi gerekmez.
function faCanvasPos(e) {
  const r = els.canvas.getBoundingClientRect();
  const cssX = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  return Math.max(0, Math.min(canvasCssW, cssX));
}
const isWaveMode = () => !!activeQuestion;

els.canvas.addEventListener("pointermove", e => {
  if (!isWaveMode() || !roundActive) return;
  freqHoverHz = mode.faXToF(faCanvasPos(e), canvasCssW);
});
els.canvas.addEventListener("pointerleave", () => { freqHoverHz = null; });
els.canvas.addEventListener("pointerdown", e => {
  if (!isWaveMode() || !roundActive) return;
  const q = activeQuestion;
  // Şıklı biçimde spektrum sadece görsel — cevap .ans butonlarından verilir,
  // dalgaya dokunma ayrıca (ikinci, çelişen) bir cevap göndermemeli.
  if (isChoiceFormat()) return;
  const hz = mode.faXToF(faCanvasPos(e), canvasCssW);

  if (q.mode !== "proplus") {
    freqGuessHz = hz;
    // F2: submitFrequencyGuess kendi içinde scheduleNext(duration) çağırıyor
    // (doğru/yanlışa göre 4sn/6sn) — burada tekrar ensureAutoNext() çağırmak
    // varsayılan 1500ms ile üzerine yazardı, o yüzden KALDIRILDI.
    try { submitFrequencyGuess(hz); } catch (err) { console.error(err); }
    return;
  }

  q.guesses.push(hz);
  const kalan = 4 - q.guesses.length;
  const cnt = els.freqGuessArea.querySelector("#ppCount");
  if (kalan > 0) {
    if (cnt) cnt.textContent = `👆 Dört ayrı frekansı işaretle · kalan: ${kalan}`;
  } else {
    // F2: submitProPlusGuess de kendi scheduleNext(duration)'ını çağırıyor, aynı sebeple
    // burada ikinci bir ensureAutoNext() yok.
    try { submitProPlusGuess(); } catch (err) { console.error(err); }
  }
});

if (els.answers) els.answers.addEventListener("click", e => {
  if (!isChoiceFormat() || !roundActive) return;
  const btn = e.target.closest(".ans");
  if (!btn || btn.disabled) return;
  btn.classList.add("pick");
  const hz = Number(btn.dataset.freq);
  freqGuessHz = hz;
  // F2: bkz. yukarıdaki pointerdown handler'daki not — submitFrequencyGuess kendi
  // scheduleNext(duration)'ını çağırıyor, ikinci ensureAutoNext() burada yok.
  try { submitFrequencyGuess(hz); } catch (err) { console.error(err); }
});

// ═══════════════════════════════════════════════════════════════════════════
// Ses dosyası yükleme
// ═══════════════════════════════════════════════════════════════════════════

// accept özniteliği validateAudioFile'ın kabul ettiği listeyle AYNI kaynaktan (bkz. E1) —
// native dosya seçicinin WAV gibi formatları elemesini önlemek için MIME joker + WAV
// MIME varyantları + uzantı listesi birleşimi kullanılıyor.
if (els.audioFileInput) els.audioFileInput.accept = audioAcceptAttr();
if (els.toolsFileInput) els.toolsFileInput.accept = audioAcceptAttr();

els.audioFileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  // E1 teşhis logu: seçim native picker'dan GERÇEKTEN geçti mi, hangi ad/MIME/boyutla?
  // Bu log hiç görünmüyorsa dosya JS'e hiç ulaşmadan native seçicide elenmiş demektir
  // (accept/UTI sorunu); görünüp de sonrası başarısız oluyorsa sorun doğrulama/oynatmadadır.
  console.log("[upload] dosya seçildi:", file.name, "| tip:", file.type || "(boş)", "|", Math.round(file.size / 1024), "KB");
  const validation = validateAudioFile(file);
  if (!validation.ok) {
    setFeedback(validation.title, validation.detail);
    e.target.value = ""; // aynı (geçersiz) dosya tekrar seçilirse change event'i yine tetiklensin
    return;
  }
  try {
    await audioEngine.initAudio();
    const res = await uploadManager.loadFile(file);
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
  if (currentLives <= 0) { if (!isUserPro()) showSessionEnd("lost"); return; }

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

// "Atla ▶" — sıradaki soruya elle geçiş. Karşılaştırma önizlemesinin kendi bekleyen
// zamanlayıcısını (cmpPreviewStopTimer/cmpPreviewRemainingMs — roundFlow.
// clearAutoAdvance()'in KAPSAMI DIŞINDA, app.js seviyesinde ayrı tutulur) da iptal
// eder — aksi halde yeni turun ortasında eski önizlemenin zamanlayıcısı tetiklenip
// yanlışlıkla ikinci bir otomatik-geçiş kurabilirdi.
async function goToNextRound() {
  await audioEngine.initAudio();
  if (currentLives <= 0) { if (!isUserPro()) showSessionEnd("lost"); return; }
  clearTimeout(cmpPreviewStopTimer);
  cmpPreviewStopTimer = null;
  cmpPreviewRemainingMs = null;
  autoStopped = false;
  roundFlow.clearAutoAdvance();
  pausedAutoAdvanceRemainingMs = null;
  startRound();
}
els.nextBtn.addEventListener("click", goToNextRound);

// A/B uzun basma döngüsü: 520ms eşik dolmadan bırakılırsa (pointerup/leave) zamanlayıcı
// iptal edilir ve aşağıdaki "click" normal kısa-dokunma gibi davranır (prototype.html
// ile aynı 520ms/2000ms zamanlaması).
els.abToggle.addEventListener("pointerdown", () => {
  clearTimeout(abPressTimer);
  abPressTimer = setTimeout(() => {
    // Henüz hiç round başlamadıysa uzun basma bir şey yapmaz — kısa dokunma zaten
    // oyunu başlatıyor (aşağıdaki click'teki setAutoPlay(true) dalı), döngünün
    // karşılaştıracağı bir ses yok.
    if (!activeQuestion) return;
    abHeld = true;
    startAbLoop();
  }, 520);
});
els.abToggle.addEventListener("pointerup", () => clearTimeout(abPressTimer));
els.abToggle.addEventListener("pointerleave", () => clearTimeout(abPressTimer));
els.abToggle.addEventListener("contextmenu", e => e.preventDefault());

// A/B tek buton: ilk A/B'ye kesintisiz geçiş, henüz round yoksa taze başlangıç yapar.
els.abToggle.addEventListener("click", async () => {
  // Uzun basma döngüyü zaten başlattı — pointerup'ın ürettiği bu click'i yut, kısa
  // dokunma davranışı bir kez daha tetiklenmesin.
  if (abHeld) { abHeld = false; return; }
  // Döngü çalışırken dokunmak onu durdurur (prototype.html: abTap → stopAbLoop).
  if (abLoopTimer) { stopAbLoop(); return; }
  await audioEngine.initAudio();
  if (!activeQuestion) {
    setAutoPlay(true);
    return;
  }
  toggleAB();
  setFeedback(
    currentPlayMode === "clean" ? "A modu" : "B modu",
    currentPlayMode === "clean" ? "Şu an temiz referans sesi dinliyorsun." : "Şu an işlenmiş sesi dinliyorsun."
  );
});

// Geri bildirim kartındaki karşılaştırma butonları (prototype.html: cmprow/setCmp).
// mode.showFreqInfoPanel her cevaptan sonra #freqInfo'yu YENİDEN kurduğu için
// (innerHTML tamamen değişiyor) tek tek buton değil, sabit kalan #freqInfo üzerinde
// delegasyon kullanılıyor. Prototipte butonlar sadece görsel toggle'dı (statik
// mockup); burada üçü de GERÇEK ses çalıyor — activeQuestion'ın kendisini
// MUTASYONA UĞRATMADAN geçici bir soru kopyası üzerinden buildQuestionChain'i
// yeniden kuruyor (aynı desen: her önizleme sıfırdan bir zincir, kalıcı graf
// mutasyonu yok — bkz. CLAUDE.md "Ses motoru notları").
// G15: X (kapat) butonu OTOMATİK geçişle BİRLİKTE çalışır (G14'te kaldırılmıştı,
// kullanıcı kararıyla geri getirildi) — üç durum: X'e basan hemen sıradaki soruya
// geçer; hiçbir şeye basmayan otomatik geçişi bekler; karşılaştırma dinleyen kişi
// için otomatik geçiş dinleme bitene kadar ertelenir. Ses hâlâ çalıyorsa X ile
// her zaman atlanabilir.
if (els.freqInfo) els.freqInfo.addEventListener("click", async (e) => {
  if (e.target.closest(".freq-info-close")) {
    goToNextRound();
    return;
  }
  const btn = e.target.closest(".cmp");
  if (!btn || !activeQuestion || activeQuestion.mode !== "frequency") return;

  const preview = btn.dataset.preview;
  let guessQuestion = null;
  if (preview === "mine") {
    const guessHz = Number(btn.dataset.guessHz);
    if (!Number.isFinite(guessHz)) return;
    guessQuestion = { ...activeQuestion, freq: guessHz };
  } else if (preview !== "clean" && preview !== "correct") {
    return;
  }

  els.freqInfo.querySelectorAll(".cmp").forEach(c => c.classList.remove("on"));
  btn.classList.add("on");

  await audioEngine.initAudio();
  if (preview === "clean") {
    await audioEngine.buildQuestionChain(activeQuestion, false, activeQuestion.source, uploadManager, mode.applyProcessing);
  } else if (preview === "correct") {
    await audioEngine.buildQuestionChain(activeQuestion, true, activeQuestion.source, uploadManager, mode.applyProcessing);
  } else {
    await audioEngine.buildQuestionChain(guessQuestion, true, activeQuestion.source, uploadManager, mode.applyProcessing);
  }

  // F2 (kullanıcı kararı): önizleme sırasında otomatik-geçiş sayacı duraklar.
  // G15: bu bekleme ARTIK kaynağın döngü uzunluğuna DEĞİL, SABİT CMP_PREVIEW_RESUME_MS
  // süresine bağlı (bkz. DURUM.md madde 13 — eskiden loopAwarePreviewMs uzun bir
  // yüklenen dosyada bu süreyi dakikalarca sürecek şekilde buffer'ın TAM UZUNLUĞUNA
  // yuvarlıyordu). Önizleme sesi (loop:true) burada DURDURULMUYOR — kesilmeden çalmaya
  // devam eder, sadece otomatik-geçiş zamanlayıcısı bu sabit süre sonunda yeniden
  // kurulur; asıl susturma bir sonraki turun buildQuestionChain'indeki stopAudio()
  // ile (ya da kullanıcı X'e basarsa hemen) gerçekleşir.
  clearTimeout(cmpPreviewStopTimer);
  if (cmpPreviewRemainingMs === null) {
    cmpPreviewRemainingMs = roundFlow.captureRemainingAndClear();
  }
  cmpPreviewStopTimer = setTimeout(() => {
    cmpPreviewStopTimer = null;
    els.freqInfo.querySelectorAll(".cmp").forEach(c => c.classList.remove("on"));
    // G15 düzeltme: captureRemainingAndClear() orijinal otomatik-geçiş zamanlayıcısı bu
    // önizlemeye basılana kadar zaten ateşlenmişse (gerçek dünyada birkaç saniye sürebilir)
    // null döner. Eskiden bu null değeri "yeniden kurma" adımını tamamen atlatıyordu ve tur
    // kalıcı olarak asılı kalıyordu (X/Atla dışında çıkış yolu yoktu). remain null/0 olsa
    // bile ensureAutoNext her zaman çağrılır — roundFlow zaten null/0 durumunda 1500ms
    // varsayılana düşüyor (bkz. round-flow.js ensureAutoNext).
    const remain = cmpPreviewRemainingMs;
    cmpPreviewRemainingMs = null;
    if (activeQuestion && !autoStopped) ensureAutoNext(remain);
  }, CMP_PREVIEW_RESUME_MS);
});

els.hintBtn.addEventListener("click", giveHint);

els.backBtn.addEventListener("click", () => {
  if (activeQuestion && !autoStopped) pauseRound();
  goScreen("menu");
});

els.mixToggle.addEventListener("click", () => {
  mixSources = !mixSources;
  els.mixToggle.classList.toggle("on", mixSources);
});

function openGameSettingsSheet() {
  els.gameSettingsOverlay.classList.add("open");
  els.gameSettingsSheet.classList.add("open");
}
function closeGameSettingsSheet() {
  els.gameSettingsOverlay.classList.remove("open");
  els.gameSettingsSheet.classList.remove("open");
  // Z7: sheet kapanınca autoDiffAsk'ı da sıfırla — bir sonraki açılışta stale
  // (önceki oturumdan açık kalmış) görünmesin.
  if (els.autoDiffAsk) els.autoDiffAsk.classList.add("hidden");
}
els.gameSettingsBtn.addEventListener("click", openGameSettingsSheet);
els.gameSettingsCancel.addEventListener("click", closeGameSettingsSheet);
els.gameSettingsOverlay.addEventListener("click", closeGameSettingsSheet);

// Z6: seviye bilgisi sheet'i — levelChip'e tıklanınca açılır, içeriği Z1
// (difficulty-curve.js) + Z3'ten (progress.js) HER AÇILIŞTA taze hesaplanır
// (statik/sabit metin YOK).
function renderLevelSheet() {
  const modeId = mode.getMeta().id;
  const level = progress.modeLevel(stats, modeId);
  const xpProg = progress.xpProgress(progress.modeXp(stats, modeId));
  const tier = tierForLevel(level);
  const diff = mode.DIFFICULTY[tier];
  const params = difficultyParams(level);
  const bw = formatOctaveBandwidth(qToOctaveBandwidth(params.q));
  const gainStr = `${params.gainDb.toFixed(1)} dB`;
  const percent = Math.max(0, Math.min(100, (xpProg.current / xpProg.required) * 100));

  let nextLevelText;
  if (params.capped) {
    nextLevelText = `En üst hassasiyettesin (Seviye ${DIFFICULTY_CONFIG.LEVEL_CAP}). Bundan sonra bant/tolerans SABİT kalıyor — bunun yerine süre kısalıyor, değişim miktarı küçülmeye devam ediyor.`;
  } else {
    const nextParams = difficultyParams(level + 1);
    const nextBw = formatOctaveBandwidth(qToOctaveBandwidth(nextParams.q));
    nextLevelText = `Seviye ${level + 1}'te bant ${nextBw}'a daralacak ve değişim ${nextParams.gainDb.toFixed(1)} dB'ye düşecek.`;
  }

  if (els.lvlSheetTitle) els.lvlSheetTitle.textContent = `Seviye ${level}`;
  if (!els.lvlSheetBody) return;
  els.lvlSheetBody.innerHTML = `
    <p style="margin:8px 2px 0;font-size:15px;line-height:1.5;color:var(--tx-2)">Bant ${bw} genişliğinde, değişim ${gainStr}. Şu anki hassasiyetin bu.</p>
    <div class="card" style="margin-top:16px;padding:14px 16px">
      <div style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--tx-3)">Bant genişliği</span><b>${bw}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--tx-3)">Değişim miktarı</span><b>${gainStr}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--tx-3)">Şık sayısı</span><b>${diff ? diff.options : "—"}</b></div>
    </div>
    <div style="margin-top:18px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:14px;font-weight:600">
        <span style="color:var(--tx-3)">Seviye ${level + 1}'e kalan</span>
        <span class="num" style="color:var(--am);font-weight:700">${xpProg.current} / ${xpProg.required} XP</span>
      </div>
      <div class="bar" style="margin-top:8px"><i style="width:${percent}%"></i></div>
    </div>
    <div class="card" style="margin-top:16px;padding:14px 16px;background:rgba(108,140,255,.1);border-color:rgba(108,140,255,.26)">
      <div style="font-size:12px;font-weight:700;letter-spacing:.05em;color:#AFC0FF">SIRADAKİ SEVİYE</div>
      <p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:var(--tx-2)">${nextLevelText}</p>
    </div>
  `;
}
function openLevelSheet() {
  renderLevelSheet();
  if (els.lvlSheetOverlay) els.lvlSheetOverlay.classList.add("open");
  if (els.lvlSheet) els.lvlSheet.classList.add("open");
}
function closeLevelSheet() {
  if (els.lvlSheetOverlay) els.lvlSheetOverlay.classList.remove("open");
  if (els.lvlSheet) els.lvlSheet.classList.remove("open");
}
if (els.levelChip) els.levelChip.addEventListener("click", openLevelSheet);
if (els.lvlSheetClose) els.lvlSheetClose.addEventListener("click", closeLevelSheet);
if (els.lvlSheetOverlay) els.lvlSheetOverlay.addEventListener("click", closeLevelSheet);

// "Oyundan çık" (prototype.html: gameSettingsSheet içindeki kırmızı buton, go('s-menu')).
// backBtn ile aynı güvenli çıkış deseni: round aktifse önce duraklat, sonra menüye dön —
// prototipteki "ilerleme kaydedilmez" uyarısı buraya taşınmadı çünkü YANLIŞ olurdu: bu
// uygulamada her tur persistStats()/persistDaily() ile anında kalıcılaşıyor, prototipin
// aksine gerçekten kaybolan bir "seans ilerlemesi" yok.
if (els.quitGameBtn) els.quitGameBtn.addEventListener("click", () => {
  closeGameSettingsSheet();
  if (activeQuestion && !autoStopped) pauseRound();
  goScreen("menu");
});

// Seans Sonu ekranının 3 CTA'sı — G2 karar (kullanıcı onaylı):
// - "10 soru daha": hangi modda bitmiş olursa olsun HER ZAMAN yeni bir 10 Soruluk
//   Bölüm başlatır (bu yüzden tasarımdaki gibi "Tekrar dene"/"10 soru daha" arası
//   metin değişmiyor — davranış hep aynı olduğu için etiket de hep aynı).
// - "Tekrar oyna": seans hangi moddaysa (serbest/bölüm) O modda yeniden başlar.
// - "Menüye dön": ana menüye çıkar.
// Üçü de: OTOMATİK CAN DOLUMU YOK — can hâlâ 0 ise dürüstçe "can dolum özelliği
// henüz eklenmedi" mesajıyla kalır, sessizce yeni tur başlatmaz.
function startFreshAttempt({ forceChallenge }) {
  hideSessionEnd();
  if (currentLives <= 0) {
    resetSession();
    // Önceki turun kalıntı UI'ı (soru başlığı + sonuç kartı) startRound()
    // çağrılmadığı için burada temizlenmezse ekranda "canların bitti" mesajı
    // yerine eski soru metni/yanlış-doğru cevap kartı görünmeye devam eder —
    // bkz. G2 doğrulaması.
    if (els.freqInfo) els.freqInfo.classList.add("hidden");
    if (els.questionTitle) els.questionTitle.textContent = "Canların bitti";
    if (els.questionMeta) els.questionMeta.textContent = "";
    setFeedback("Canların bitti", "Şu an devam edemezsin — can dolum özelliği henüz eklenmedi.");
    goScreen("game");
    return;
  }
  resetSession();
  stats.hintsRemaining = HINTS_PER_GAME;
  persistStats();
  if (forceChallenge || isChallenge()) startChallenge();
  goScreen("game");
  setAutoPlay(true);
}
if (els.resCta) els.resCta.addEventListener("click", async () => {
  await audioEngine.initAudio();
  startFreshAttempt({ forceChallenge: true });
});
if (els.resRetryBtn) els.resRetryBtn.addEventListener("click", async () => {
  await audioEngine.initAudio();
  startFreshAttempt({ forceChallenge: false });
});
if (els.resMenuBtn) els.resMenuBtn.addEventListener("click", () => {
  hideSessionEnd();
  resetSession();
  goScreen("menu");
});

els.resetStatsBtn.addEventListener("click", () => {
  if (!confirm("Tüm istatistikler, ilerleme ve görevler sıfırlansın mı?")) return;
  storage.clearStats();
  storage.clearDaily();
  stats = storage.freshStats(difficultyLivesMap(), HINTS_PER_GAME, playableModeIds());
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

// İlerleme sekmesindeki katlanır paneller (Frekans bölgesi / Mod seviyeleri) — varsayılan
// kapalı, kapalıyken bile üst satırda özet bilgi (renderAnalysis zaten dolduruyor).
function bindCollapsiblePanel(toggleBtn, wrapEl, caretEl) {
  if (!toggleBtn || !wrapEl) return;
  toggleBtn.addEventListener("click", () => {
    const opening = wrapEl.classList.contains("hidden");
    wrapEl.classList.toggle("hidden", !opening);
    if (caretEl) caretEl.style.transform = opening ? "rotate(180deg)" : "none";
  });
}
bindCollapsiblePanel(els.zonePanelToggle, els.zoneWrap, els.zoneCaret);
bindCollapsiblePanel(els.modeLevelsToggle, els.modeLevelsWrap, els.modeLevelsCaret);

els.difficultySelect.addEventListener("change", () => {
  // zorluk değişti → o zorluğun kendi puanı/level'i yüklensin. Canlar GLOBAL
  // olduğu için zorluk değişince değişmez, sadece ekranı güncel tutmak için
  // yeniden çizilir.
  renderHearts();
  updateUI();
  setFeedback("Zorluk değişti", `${els.difficultySelect.options[els.difficultySelect.selectedIndex].text} — bu zorluğun kendi puanı ve level'i geldi.`);
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

if (els.answerFormatSelect) els.answerFormatSelect.addEventListener("change", () => {
  prefs.answerFormat = els.answerFormatSelect.value;
  storage.savePrefs(prefs);
  // Cevaplanmamış bir soru ortasında biçim değişirse görünümü hemen senkronla —
  // soru/timer/skor state'ine dokunmaz, sadece .ans grid'i gösterir/gizler.
  if (activeQuestion && roundActive) {
    syncAnswerArea();
    if (isChoiceFormat()) scrollFeedbackIntoView();
  }
});

if (els.focusSelect) els.focusSelect.addEventListener("change", () => {
  prefs.focusRange = els.focusSelect.value;
  storage.savePrefs(prefs);
});

// KÖK SEBEP: "visibilitychange" olayı SADECE document üzerinde ateşlenir, window
// üzerinde DEĞİL (konsolda doğrulandı: document.dispatchEvent ile tetiklendiğinde
// window.addEventListener hiç çalışmadı). Bu satır eskiden window'a bağlıydı — yani
// bu handler hiçbir zaman çalışmıyordu: uygulama arka plana alındığında NE ses
// durduruluyordu NE DE tur zamanlayıcısı duraklatılıyordu. Arka planda WKWebView/
// tarayıcı setInterval/setTimeout'ları kısıtlar (throttle); ön plana dönüldüğünde
// birikmiş tur zamanlayıcıları arka arkaya patlayarak birden çok "süre doldu" turunu
// neredeyse anında tüketebilir — kalp/can arayüzünün tutarsız görünmesinin ve
// "Oyun Bitti"den sonra sayaçların artmaya devam etmesinin en olası açıklaması bu.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    audioEngine.stopAudio();
    uploadManager.pausePlayback();
    // Aktif bir tur varsa zamanlayıcıyı/otomatik-geçişi duraklat — "Durdur" butonuyla
    // AYNI mekanizma (pauseRound). Arka planda tur zamanlayıcısının çalışmaya devam
    // edip biriken tikleri ön plana dönünce art arda boşaltması engellenir.
    if (activeQuestion && !autoStopped) pauseRound();
  } else if (audioEngine.audioCtx && audioEngine.audioCtx.state === "suspended") {
    try { audioEngine.audioCtx.resume(); } catch (e) {}
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Açılış
// ═══════════════════════════════════════════════════════════════════════════

// KÖK SEBEP DÜZELTMESİ: burada eskiden syncLivesEnsureAlive() vardı — can<=0 ise
// açılışta hangi ekran aktifse (genelde menü) onun üstünde zorla "Oyun Bitti"
// kartını açıyordu. Kart oyun ekranına ait değil; sadece EKRANI günceli tutan
// syncLives() yeterli — "Oyun Bitti" artık SADECE kullanıcı gerçekten oynamaya
// çalıştığında (Oyunu Başlat/cevap ver) ilgili guard'lardan tetikleniyor.
syncLives();
renderHistory();
renderAchievements();
renderDaily();
updateTimerUI();
updateUI();
updateStartBtnLabel();
updateHintChipLabel();
updateAbToggleUI();
renderModeGrid();
goScreen("menu");
resizeCanvas();

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => goScreen(TAB_TO_SCREEN[btn.dataset.tab] || "menu"));
});

if (els.dailyTipClose) els.dailyTipClose.addEventListener("click", () => {
  daily.tipDismissed = true;
  persistDaily();
  renderDailyTip();
});
// "Bugünün Önerisi" kartındaki "Başla" — renderDailyTip() ile AYNI hesabı (zoneScores()
// üzerinden en zayıf bölge) kullanıp odak aralığını o bölgeye kilitler, sonra oyun
// ekranına geçer. mode.focusIdForZone yoksa (odak özelliği olmayan bir mod) veya
// yeterli veri yoksa (renderDailyTip zaten kartı gizler ama buton yine de tıklanabilir
// kalabilir) sadece ekran değiştirir — eskisi gibi tüm spektrumda başlar.
if (els.dailyTipStartBtn) els.dailyTipStartBtn.addEventListener("click", () => {
  if (mode.FOCUS_RANGES && mode.focusIdForZone && els.focusSelect) {
    const enough = zoneScores().filter(s => s.n >= 2);
    if (enough.length) {
      const weakest = enough.slice().sort((a, b) => a.pct - b.pct)[0];
      const focusId = mode.focusIdForZone(weakest.key);
      if (mode.FOCUS_RANGES[focusId]) {
        els.focusSelect.value = focusId;
        els.focusSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }
  goScreen("game");
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

  // E2: Cevap biçimi artık İKİ yerden değiştirilebiliyor (oyun ekranındaki chip +
  // Oyun Ayarları sheet'indeki satır), ikisi de AYNI answerFormatSelect'e bağlı —
  // querySelectorAll ile TÜMÜ güncellenir, tek eşleşmeli querySelector'da sadece
  // DOM'daki ilk satır güncellenip diğeri eski değerde donuk kalırdı.
  function updateRowText(select) {
    document.querySelectorAll(`.setting-row[data-sheet-select="${select.id}"]`).forEach(row => {
      const txt = row.querySelector('.setting-row-value-text');
      if (txt && select.options[select.selectedIndex]) {
        txt.textContent = select.options[select.selectedIndex].text;
      }
    });
  }

  function closeSheet() {
    overlay.classList.remove('open');
    sheet.classList.remove('open');
  }

  function openSheet(select, title) {
    sheetTitle.textContent = title;
    sheetOptions.innerHTML = '';
    // Kaynak sheet'i gibi <optgroup> ile gruplanmış select'lerde grup başlığı
    // (.kicker) araya serpiştirilir; gruplanmamış select'lerde (Zorluk/Oyun Türü/
    // Süre/Cevap biçimi) hiç fark etmez, düz liste olarak kalır.
    let lastGroup = null;
    Array.from(select.options).forEach(opt => {
      const groupLabel = opt.parentElement && opt.parentElement.tagName === "OPTGROUP"
        ? opt.parentElement.label : null;
      if (groupLabel && groupLabel !== lastGroup) {
        const header = document.createElement('div');
        header.className = 'kicker';
        header.style.margin = lastGroup === null ? '4px 4px 6px' : '18px 4px 6px';
        header.textContent = groupLabel;
        sheetOptions.appendChild(header);
        lastGroup = groupLabel;
      }
      const row = document.createElement('div');
      row.className = 'sheet-option' + (opt.selected ? ' selected' : '');
      // "Dosya seç" (upload) bir dosya seçilene kadar diğer şıklar gibi anında
      // işaretlenemez — tıklanınca native dosya seçiciyi açar (prototype.html'de
      // bu satır ✓ yerine › ile ayrılmıştı, aynı ayrım burada davranışa taşındı).
      const isUnloadedUpload = select.id === 'sourceSelect' && opt.value === 'upload' && !uploadManager.hasBuffer;
      const checkStyle = isUnloadedUpload ? ' style="opacity:1"' : '';
      row.innerHTML = `<span>${opt.text}</span><span class="check"${checkStyle}>${isUnloadedUpload ? '›' : '✓'}</span>`;
      row.addEventListener('click', () => {
        if (isUnloadedUpload) {
          closeSheet();
          els.audioFileInput.click();
          return;
        }
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
    row.addEventListener('click', () => {
      // Z7: Otomatik zorluk modundayken "Zorluk" satırına dokunmak seçim listesini
      // AÇMAZ — kullanıcı zaten müdahale etmiyor demektir (Z5 kararı); bunun yerine
      // "Sabit'e geçmek ister misin?" sorusu gösterilir (prototype.html: gameDiffTap/
      // autoDiffAsk). diffModeAuto module-level `let` İLE bu IIFE'DEN SONRA
      // tanımlanıyor ama bu satır sadece TIKLAMA anında çalışıyor — o ana kadar
      // script'in tamamı (diffModeAuto dahil) zaten değerlendirilmiş olur, TDZ
      // sorunu yok.
      if (select.id === 'difficultySelect' && diffModeAuto) {
        if (els.autoDiffAsk) els.autoDiffAsk.classList.remove('hidden');
        return;
      }
      openSheet(select, row.dataset.sheetTitle || '');
    });
    // select'in değeri BAŞKA bir yerden değişse bile (ör. Genel Ayarlar sheet'indeki
    // Zorluk → Sabit alt listesi) bu satırın metni senkron kalsın.
    select.addEventListener('change', () => updateRowText(select));
  });

  // Z7: autoDiffAsk'ın iki butonu.
  if (els.autoDiffSwitchBtn) els.autoDiffSwitchBtn.addEventListener('click', () => {
    if (els.autoDiffAsk) els.autoDiffAsk.classList.add('hidden');
    diffModeAuto = false;
    prefs.difficultyMode = "fixed";
    storage.savePrefs(prefs);
    syncDiffSheetUI(); // Genel Ayarlar'daki Otomatik/Sabit görünümü de senkron kalsın
    openSheet(document.getElementById('difficultySelect'), 'Zorluk'); // hemen seçim yapabilsin (prototype.html: switchToFixed)
  });
  if (els.autoDiffDismissBtn) els.autoDiffDismissBtn.addEventListener('click', () => {
    if (els.autoDiffAsk) els.autoDiffAsk.classList.add('hidden');
  });

  overlay.addEventListener('click', closeSheet);
  sheetCancel.addEventListener('click', closeSheet);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
})();

// ═══════════════════════════════════════════════════════════════════════════
// Genel Ayarlar sheet'i + yardım/bilgi ekranları
// Dizayn/prototype.html'deki gruplu liste dilinden taşındı. Sadece 3 ana sekmenin
// (Antrenman/İlerleme/Araçlar) dişli ikonundan açılır; oyun ekranının kendi
// "oyun ayarları" sheet'ine (gameSettingsSheet) dokunmaz.
// ═══════════════════════════════════════════════════════════════════════════

// Ücretsiz/Pro mod sayısı sihirli sayı DEĞİL — MODE_CATALOG'taki tier alanından
// sayılır (bkz. core/mode-catalog.js üstündeki not). Kaç modun ŞU AN gerçekten
// oynanabilir olduğu ayrı bir şey (registry.listModes()) — bu sayı ürün/paywall
// vaadi, kodlanma durumundan bağımsız.
const FREE_MODE_COUNT = MODE_CATALOG.filter(e => e.tier === "free").length;
const PRO_PRICE = "₺199";

function openMainSettingsSheet() {
  if (!els.mainSettingsOverlay) return;
  syncDiffSheetUI();
  els.mainSettingsOverlay.classList.add("open");
  els.mainSettingsSheet.classList.add("open");
}
function closeMainSettingsSheet() {
  if (!els.mainSettingsOverlay) return;
  els.mainSettingsOverlay.classList.remove("open");
  els.mainSettingsSheet.classList.remove("open");
}
[els.menuSettingsBtn, els.progressSettingsBtn, els.toolsSettingsBtn].forEach(btn => {
  if (btn) btn.addEventListener("click", openMainSettingsSheet);
});
if (els.mainSettingsOverlay) els.mainSettingsOverlay.addEventListener("click", closeMainSettingsSheet);
if (els.mainSettingsClose) els.mainSettingsClose.addEventListener("click", closeMainSettingsSheet);

// aşağı kaydırarak kapatma (prototipteki .sheet[data-drag] davranışı)
if (els.mainSettingsSheet) {
  let dragY0 = null;
  els.mainSettingsSheet.addEventListener("touchstart", e => {
    dragY0 = els.mainSettingsSheet.scrollTop <= 0 ? e.touches[0].clientY : null;
  }, { passive: true });
  els.mainSettingsSheet.addEventListener("touchmove", e => {
    if (dragY0 === null) return;
    const dy = e.touches[0].clientY - dragY0;
    if (dy > 0) els.mainSettingsSheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  els.mainSettingsSheet.addEventListener("touchend", () => {
    const dy = parseFloat((els.mainSettingsSheet.style.transform.match(/([\d.]+)px/) || [0, 0])[1]);
    els.mainSettingsSheet.style.transform = "";
    dragY0 = null;
    if (dy > 90) closeMainSettingsSheet();
  });
}

// ---- ZORLUK: Otomatik/Sabit + Sabit alt listesi ----
// Z5: "Otomatik" ARTIK GERÇEK — applyAutoDifficulty() (aşağıda) her round
// başlangıcında Z1 (difficulty-curve.js: tierForLevel) + Z3'ten (progress.js:
// modeLevel) türetilen zorluğu els.difficultySelect.value'ya YAZAR. "Sabit"
// alt listesi hâlâ bunu doğrudan değiştirir; ikisi de AYNI tek kaynaktan (aynı
// <select>) okur — Otomatik'te sadece o kaynağı KİM yazdığı değişir (kullanıcı
// yerine applyAutoDifficulty). Tercih (auto/fixed) prefs.difficultyMode'da kalıcı.
let diffModeAuto = prefs.difficultyMode !== "fixed";
let diffSublistOpen = false;

// Z5 KARAR: Otomatik modda Z1'in TAM sürekli (logaritmik) eğrisi (difficultyParams'ın
// ondalık gain/Q değerleri) createQuestion/evaluateAnswer'a DOĞRUDAN enjekte
// EDİLMEDİ — bu, evaluateAnswer'ın sabit 0.5 oktav tolerans sınırını ve DIFFICULTY
// tablosunun okunduğu HER yeri (generateChoices, hint mask, round timer) parametrik
// hale getirmeyi gerektirirdi; kapsamı "ayarlar arayüzü" maddesinin çok ötesine
// taşıyan ayrı bir refactor (bkz. DURUM.md). Bunun yerine Z1'in tierForLevel()
// köprüsü kullanılıyor: mod seviyesi (Z3) → en yakın isimli kademe (easy/medium/
// hard/pro) → o kademenin MEVCUT DIFFICULTY parametreleri. proplus bu merdivenin
// dışında (tierForLevel hiç "proplus" döndürmez) — Otomatik modda asla seçilmez.
function applyAutoDifficulty() {
  if (!diffModeAuto || !els.difficultySelect) return;
  const level = progress.modeLevel(stats, mode.getMeta().id);
  const tier = tierForLevel(level);
  if (els.difficultySelect.value !== tier) {
    els.difficultySelect.value = tier;
    renderHearts();
    updateUI();
    syncDiffSheetUI();
    // "change" event BİLEREK dispatch edilmiyor (2205 civarındaki listener her
    // değişiklikte "Zorluk değişti" toast'ı gösteriyor — Otomatik'te her turda
    // spam olurdu). Ama initSettingsSheet IIFE'indeki updateRowText() de SADECE o
    // "change" event'ini dinliyor — bu yüzden Oyun Ayarları sheet'indeki "Zorluk"
    // satırının metnini BURADA elle güncelliyoruz (aynı DOM deseni: upload.js'in
    // change handler'ında da kullanılan .setting-row[data-sheet-select] sorgusu).
    document.querySelectorAll('.setting-row[data-sheet-select="difficultySelect"] .setting-row-value-text').forEach(txt => {
      const opt = els.difficultySelect.options[els.difficultySelect.selectedIndex];
      if (opt) txt.textContent = opt.text;
    });
  }
}
// Açılışta da uygula (ilk round'u beklemeden) — Otomatik varsayılan olduğu için
// taze bir kullanıcıda difficultySelect'in HTML varsayılanı ("Orta") yerine
// gerçek (seviye 1 → "easy") değeri göstermesi gerekir.
applyAutoDifficulty();

function syncDiffSheetUI() {
  const cur = els.difficultySelect ? els.difficultySelect.value : "medium";
  if (els.diffSublist) {
    els.diffSublist.querySelectorAll(".item").forEach(btn => {
      btn.classList.toggle("pick", btn.dataset.diff === cur);
    });
    els.diffSublist.classList.toggle("on", diffSublistOpen);
  }
  if (els.diffAutoBtn) els.diffAutoBtn.classList.toggle("pick", diffModeAuto);
  if (els.diffFixedBtn) els.diffFixedBtn.classList.toggle("pick", !diffModeAuto);
  if (els.mainSettingsBack) els.mainSettingsBack.classList.toggle("hidden", !diffSublistOpen);
}
if (els.diffAutoBtn) els.diffAutoBtn.addEventListener("click", () => {
  diffModeAuto = true;
  diffSublistOpen = false;
  prefs.difficultyMode = "auto";
  storage.savePrefs(prefs);
  applyAutoDifficulty(); // hemen o anki seviyeye göre uygula, bir sonraki turu bekleme
  syncDiffSheetUI();
});
if (els.diffFixedBtn) els.diffFixedBtn.addEventListener("click", () => {
  diffModeAuto = false;
  diffSublistOpen = true;
  prefs.difficultyMode = "fixed";
  storage.savePrefs(prefs);
  syncDiffSheetUI();
});
if (els.diffSublist) {
  els.diffSublist.querySelectorAll(".item").forEach(btn => {
    btn.addEventListener("click", () => {
      els.difficultySelect.value = btn.dataset.diff;
      els.difficultySelect.dispatchEvent(new Event("change", { bubbles: true }));
      syncDiffSheetUI();
    });
  });
}
if (els.mainSettingsBack) els.mainSettingsBack.addEventListener("click", () => {
  diffSublistOpen = false;
  syncDiffSheetUI();
});
// Oyun ekranındaki mevcut zorluk seçici değişirse (dots → Oyun Ayarları → Zorluk)
// bu sheet'teki Sabit alt listesi de anında senkron kalsın.
if (els.difficultySelect) els.difficultySelect.addEventListener("change", syncDiffSheetUI);

// ---- GENEL: tercihler (Dil görsel, Bildirimler/Kulaklık uyarısı kalıcı) ----
function applyPrefs() {
  document.body.classList.toggle("hp-warn-off", !prefs.hpWarning);
  if (els.notifSwitch) els.notifSwitch.classList.toggle("on", prefs.notifications);
  if (els.hpWarnSwitch) els.hpWarnSwitch.classList.toggle("on", prefs.hpWarning);
  if (els.feedbackScreenSwitch) els.feedbackScreenSwitch.classList.toggle("on", prefs.feedbackScreen);
  if (els.answerFormatSelect && prefs.answerFormat) {
    els.answerFormatSelect.value = prefs.answerFormat;
    els.answerFormatSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (els.focusSelect && prefs.focusRange && mode.FOCUS_RANGES && mode.FOCUS_RANGES[prefs.focusRange]) {
    els.focusSelect.value = prefs.focusRange;
    els.focusSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
  updateCalibRowLabel();
}
applyPrefs();
if (els.notifSwitch) els.notifSwitch.addEventListener("click", () => {
  // Not: gerçek bir bildirim planlama altyapısı yok, sadece tercih saklanıyor.
  prefs.notifications = !prefs.notifications;
  applyPrefs();
  storage.savePrefs(prefs);
});
if (els.hpWarnSwitch) els.hpWarnSwitch.addEventListener("click", () => {
  prefs.hpWarning = !prefs.hpWarning;
  applyPrefs();
  storage.savePrefs(prefs);
});
if (els.feedbackScreenSwitch) els.feedbackScreenSwitch.addEventListener("click", () => {
  prefs.feedbackScreen = !prefs.feedbackScreen;
  applyPrefs();
  storage.savePrefs(prefs);
});
if (els.langSeg) {
  els.langSeg.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      // Dil seçimi şimdilik yalnızca görsel — i18n altyapısı sonraki adımda eklenecek.
      els.langSeg.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === btn));
    });
  });
}

// ---- HESAP / DESTEK / HAKKINDA satırları ----
function syncAccountLine() {
  // Pro vaadi TÜM katalog (14) içindir — kaçının şu an kodlandığı/oynanabilir
  // olduğu (listModes()) ayrı bir şey, paywall metnine karışmaz.
  const total = MODE_CATALOG.length;
  if (els.accountVerLine) {
    els.accountVerLine.textContent = isUserPro()
      ? `Pro${devFlags.simulatePro ? " (simüle)" : ""} — ${total} mod, seans başına 10 soru, can sınırsız`
      : `Ücretsiz — ${FREE_MODE_COUNT} mod, seans başına 5 soru`;
  }
  if (els.payFreeModes) els.payFreeModes.textContent = `${FREE_MODE_COUNT} egzersiz modu`;
  if (els.payProModes) els.payProModes.textContent = `${total} egzersiz modunun tamamı`;
  if (els.proPrice) els.proPrice.textContent = PRO_PRICE;
  if (els.buyProBtn) els.buyProBtn.textContent = `Satın al · ${PRO_PRICE}`;
}
syncAccountLine();

// ---- Geliştirici modu (gizli Pro test anahtarı) ----
// "Hakkında" → "Sürüm numarası" satırına 7 kez ÜST ÜSTE (art arda 1.2sn içinde)
// dokununca açılır. Amaç: Pro özelliklerini (Araçlar kilidi, can sınırsız) yayın
// öncesi test edebilmek — gerçek bir satın alma/IAP DEĞİL, sadece isUserPro()'nun
// okuduğu bir simülasyon bayrağı (bkz. isUserPro tanımı).
function syncDevUI() {
  if (els.devGroup) els.devGroup.classList.toggle("hidden", !devFlags.unlocked);
  if (els.devProSwitch) els.devProSwitch.classList.toggle("on", devFlags.simulatePro);
  applyProLockVisibility();
  syncAccountLine();
  renderModeGrid();
}
let versionTapCount = 0;
let versionTapTimer = null;
if (els.versionRow) els.versionRow.addEventListener("click", () => {
  versionTapCount++;
  clearTimeout(versionTapTimer);
  versionTapTimer = setTimeout(() => { versionTapCount = 0; }, 1200);
  if (versionTapCount >= 7) {
    versionTapCount = 0;
    clearTimeout(versionTapTimer);
    if (!devFlags.unlocked) {
      devFlags.unlocked = true;
      storage.saveDevFlags(devFlags);
      syncDevUI();
      toast("🛠️ Geliştirici modu açıldı", "Ayarlar'ın altında yeni bir bölüm var.");
    }
  }
});
if (els.devProSwitch) els.devProSwitch.addEventListener("click", () => {
  devFlags.simulatePro = !devFlags.simulatePro;
  storage.saveDevFlags(devFlags);
  syncDevUI();
});
if (els.devModeOffBtn) els.devModeOffBtn.addEventListener("click", () => {
  // Kapatınca simülasyonu da sıfırla — "kapalı" durum yarı-Pro bir state
  // bırakmasın (bir sonraki açılışta devFlags.unlocked=false, simulatePro=false
  // olarak baştan başlar).
  devFlags.unlocked = false;
  devFlags.simulatePro = false;
  storage.saveDevFlags(devFlags);
  syncDevUI();
  toast("Geliştirici modu kapatıldı", "");
});
syncDevUI();

if (els.calibRow) els.calibRow.addEventListener("click", () => goToSettingsSubpage("calib"));
if (els.feedbackRow) els.feedbackRow.addEventListener("click", () => goToSettingsSubpage("feedback"));
if (els.faqRow) els.faqRow.addEventListener("click", () => goToSettingsSubpage("faq"));
if (els.contactRow) els.contactRow.addEventListener("click", () => goToSettingsSubpage("contact"));
if (els.goProBtn) els.goProBtn.addEventListener("click", () => goToSettingsSubpage("paywall"));
if (els.restoreRow) els.restoreRow.addEventListener("click", () => {
  toast("Kontrol edildi", "Bu cihazda geri yüklenecek bir satın alım bulunamadı.");
});

function openLegal(kind) {
  const privacy = kind === "privacy";
  if (els.legalTitle) els.legalTitle.textContent = privacy ? "Gizlilik politikası" : "Kullanım şartları";
  if (els.legalKicker) els.legalKicker.textContent = privacy ? "GİZLİLİK" : "KULLANIM ŞARTLARI";
  goToSettingsSubpage("legal");
}
if (els.privacyRow) els.privacyRow.addEventListener("click", () => openLegal("privacy"));
if (els.termsRow) els.termsRow.addEventListener("click", () => openLegal("terms"));

// Ayarlar sheet'inden açılan yardım ekranlarının geri okları/kapatma düğmeleri —
// goBackFromSubpage() sheet'i tekrar açar (bkz. goToSettingsSubpage tanımı).
[els.faqBackBtn, els.feedbackBackBtn, els.contactBackBtn, els.legalBackBtn, els.paywallCloseBtn, els.payFreeContinueBtn]
  .forEach(btn => { if (btn) btn.addEventListener("click", () => goBackFromSubpage()); });

// ---- Kalibrasyon ----
// Referans ton audioEngine'in KENDİ audioCtx/analyser'ını kullanır — buildQuestionChain'in
// tam soru/filtre zincirini kurmaya gerek yok, ama analyser'a bağlanınca metre GERÇEK
// veriyi okur ve genel çıkış zincirinden (masterGain/destination) geçer.
const CAL_STEPS = [
  ["Kulaklığını tak, ortamı sessizleştir", "Egzersizlerdeki dB farkları küçüktür. Seviyeyi bir kez ayarlarsan tüm sorular aynı referansla çalar; sonuçların karşılaştırılabilir olur.", "Alttaki kaydırıcıyı sürükleyip rahat duyduğun bir seviyeye getir, sonra onayla.", "Seviye doğru, devam et"],
  ["Referans tonu çal ve seviyeyi ayarla", "Ton sabit çalıyor. Yorucu olmayan, konuşma sesinden biraz yüksek bir seviye hedefle.", "Sesi çok açma; ince farkları duymak için yüksek seviye gerekmez.", "Bu seviye iyi"],
  ["Hazırsın", "Bu seviye tüm egzersizlerde referans alınacak. Kulaklığını değiştirirsen kalibrasyonu tekrarla.", "Ayarlar → Kalibrasyon ile her zaman geri dönebilirsin.", "Kalibrasyonu bitir"]
];

function drawCalMeterIdle() {
  if (!els.calMeter) return;
  els.calMeter.classList.remove("playing");
  let html = "";
  for (let i = 0; i < 22; i++) html += `<i style="height:10px"></i>`;
  els.calMeter.innerHTML = html;
}

// GERÇEK bir SEVİYE metresi (spektrum değil) — audioEngine.analyser'ın zaman-alanı
// verisinden RMS hesaplanır. Sabit 1 kHz sinüs çaldığı için seviye doğal olarak
// neredeyse sabit çıkar; bu DOĞRUdur (Math.sin ile sahte "canlı" animasyon değil).
// Not: getByteFrequencyData ile bin-bazlı örnekleme denendi ama 1 kHz'in enerjisi
// tek bir dar bin'e düştüğü için çubukların çoğu boş görünüyordu — RMS tüm çubuklara
// aynı gerçek seviyeyi yansıtır.
function animateCalMeter() {
  if (!calPlaying || !audioEngine.analyser || !els.calMeter) return;
  els.calMeter.classList.add("playing");
  const analyser = audioEngine.analyser;
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sumSq = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / data.length);
  const level = Math.min(1, rms * 3.2); // okunaklı bir görsel aralığa ölçekle
  const bars = 22;
  const h = 10 + Math.round(level * 34);
  let html = "";
  for (let i = 0; i < bars; i++) html += `<i style="height:${h}px"></i>`;
  els.calMeter.innerHTML = html;
  calMeterRaf = requestAnimationFrame(animateCalMeter);
}

// initAudio()'nun await'i sırasında kullanıcı tekrar tıklayıp durdurabilir/yeniden
// başlatabilir — calRequestId, o an EN GÜNCEL tıklamanın sonucu olmayan bir
// startCalibrationTone() çağrısının node'ları sessizce kurup bırakmasını engeller.
let calRequestId = 0;
// Referans seviyesi (%0-100) ↔ gerçek kazanç. %0 tamamen sessiz değil (çizgiyi
// kaybetmemek için), %100 rahat dinlenebilir üst sınır — aşırı yüksek değil.
function calLevelToGain(pct) {
  return 0.01 + (pct / 100) * 0.29;
}

async function startCalibrationTone(requestId) {
  await audioEngine.initAudio();
  if (requestId !== calRequestId) return; // bu arada durduruldu/başka istek geldi
  const ctx = audioEngine.audioCtx;
  const analyser = audioEngine.analyser;
  if (!ctx || !analyser) return;
  calOsc = ctx.createOscillator();
  calOsc.type = "sine";
  calOsc.frequency.value = 1000;
  calGain = ctx.createGain();
  calGain.gain.value = 0.0001;
  calOsc.connect(calGain);
  calGain.connect(analyser); // analyser zaten destination'a bağlı — sesi de duyulur yapar
  calGain.gain.exponentialRampToValueAtTime(calLevelToGain(calLevel), ctx.currentTime + 0.05);
  calOsc.start();
}

// Sürükleme sırasında hem UI'ı hem (çalıyorsa) GERÇEK ton seviyesini günceller,
// prefs'e kalıcı yazar. persist:false yalnızca açılışta UI'ı senkronlamak için.
function setCalLevel(pct, { persist = true } = {}) {
  calLevel = Math.max(0, Math.min(100, Math.round(pct)));
  if (els.calLevelFill) els.calLevelFill.style.width = `${calLevel}%`;
  if (els.calLevelThumb) els.calLevelThumb.style.left = `${calLevel}%`;
  if (els.calLevelValue) els.calLevelValue.textContent = `%${calLevel}`;
  if (calPlaying && calGain && audioEngine.audioCtx) {
    const now = audioEngine.audioCtx.currentTime;
    try {
      calGain.gain.cancelScheduledValues(now);
      calGain.gain.setValueAtTime(calGain.gain.value, now);
      calGain.gain.linearRampToValueAtTime(calLevelToGain(calLevel), now + 0.03);
    } catch (e) {}
  }
  if (persist) {
    prefs.calibrationLevel = calLevel;
    storage.savePrefs(prefs);
  }
}

function calLevelPctFromClientX(clientX) {
  const rect = els.calLevelTrack.getBoundingClientRect();
  if (rect.width <= 0) return calLevel;
  return ((clientX - rect.left) / rect.width) * 100;
}
if (els.calLevelTrack) {
  let dragging = false;
  els.calLevelTrack.addEventListener("pointerdown", e => {
    dragging = true;
    try { els.calLevelTrack.setPointerCapture(e.pointerId); } catch (err) {}
    setCalLevel(calLevelPctFromClientX(e.clientX));
  });
  els.calLevelTrack.addEventListener("pointermove", e => {
    if (!dragging) return;
    setCalLevel(calLevelPctFromClientX(e.clientX));
  });
  els.calLevelTrack.addEventListener("pointerup", () => { dragging = false; });
  els.calLevelTrack.addEventListener("pointercancel", () => { dragging = false; });
}
setCalLevel(calLevel, { persist: false }); // açılışta UI'ı kayıtlı değere senkronla

// Donanım ses tuşları → kalibrasyon slider'ı (@capacitor-community/volume-buttons).
// Web'de (Capacitor bridge'i yokken) bu eklenti hiç yok — storage.js'teki getPrefs()
// ile AYNI desen: global köprüden güvenli okuma, yoksa sessizce no-op.
function getVolumeButtonsPlugin() {
  return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.VolumeButtons) || null;
}
// watchVolume() bir CallbackID döndürür ve dinleme aktif olduğu sürece elde tutulur;
// null olması "şu an dinlemiyoruz" anlamına gelir — goScreen()'deki tek kontrol
// noktası bunu okuyarak clearWatch()'u sadece gerçekten dinlenirken çağırır.
// (volumeButtonsWatchId'nin let tanımı dosya başında — bkz. calLevel yanındaki not.)
async function startVolumeButtonsWatch() {
  const vb = getVolumeButtonsPlugin();
  if (!vb || volumeButtonsWatchId) return;
  const platform = window.Capacitor && window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : "web";
  const options = {};
  // iOS: sistem ses HUD'ının çıkmaması için ZORUNLU (aksi halde her basışta ekrana
  // taşan bir gösterge belirir). Android'de karşılığı suppressVolumeIndicator.
  if (platform === "ios") options.disableSystemVolumeHandler = true;
  else if (platform === "android") options.suppressVolumeIndicator = true;
  try {
    volumeButtonsWatchId = await vb.watchVolume(options, (result) => {
      if (!result || !result.direction) return;
      setCalLevel(calLevel + (result.direction === "up" ? 2 : -2));
    });
  } catch (e) {}
}
async function stopVolumeButtonsWatch() {
  const vb = getVolumeButtonsPlugin();
  volumeButtonsWatchId = null;
  if (!vb) return;
  try { await vb.clearWatch(); } catch (e) {}
}

function stopCalibrationTone() {
  calRequestId++; // devam eden bir startCalibrationTone() varsa artık geçersiz
  if (calMeterRaf) { cancelAnimationFrame(calMeterRaf); calMeterRaf = null; }
  calPlaying = false;
  if (els.calPlayBtn) {
    els.calPlayBtn.textContent = "Referans tonu çal";
    els.calPlayBtn.classList.remove("on");
  }
  const osc = calOsc, gain = calGain;
  calOsc = null; calGain = null;
  if (gain && audioEngine.audioCtx) {
    const now = audioEngine.audioCtx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
    } catch (e) {}
  }
  if (osc && audioEngine.audioCtx) {
    try { osc.stop(audioEngine.audioCtx.currentTime + 0.08); } catch (e) {}
  }
  setTimeout(() => {
    try { if (osc) osc.disconnect(); } catch (e) {}
    try { if (gain) gain.disconnect(); } catch (e) {}
  }, 150);
  drawCalMeterIdle();
}

function renderCalStep() {
  const s = CAL_STEPS[calStep - 1];
  if (els.calStep) els.calStep.textContent = calStep;
  if (els.calStepDots) {
    [...els.calStepDots.children].forEach((dot, i) => {
      const n = i + 1;
      dot.classList.toggle("active", n === calStep);
      dot.classList.toggle("done", n < calStep);
    });
  }
  if (els.calHead) els.calHead.textContent = s[0];
  if (els.calBody) els.calBody.textContent = s[1];
  if (els.calGuide) els.calGuide.textContent = s[2];
  if (els.calCtaBtn) els.calCtaBtn.textContent = s[3];
  drawCalMeterIdle();
}
function resetCalibration() {
  stopCalibrationTone();
  calStep = 1;
  renderCalStep();
}
function updateCalibRowLabel() {
  const row = els.calibRow;
  if (!row) return;
  const p = row.querySelector("p");
  if (p) p.textContent = prefs.calibrationDone
    ? "Tamamlandı ✓ · Referans tonla tekrar eşitle"
    : "Tamamlanmadı · Referans tonla kulaklık seviyesini eşitle";
}
if (els.calPlayBtn) els.calPlayBtn.addEventListener("click", async () => {
  if (calPlaying) { stopCalibrationTone(); return; }
  calPlaying = true;
  const requestId = ++calRequestId;
  els.calPlayBtn.textContent = "Tonu durdur";
  els.calPlayBtn.classList.add("on");
  await startCalibrationTone(requestId);
  if (calPlaying && requestId === calRequestId) animateCalMeter();
});
if (els.calCtaBtn) els.calCtaBtn.addEventListener("click", () => {
  if (calStep < 3) { calStep++; renderCalStep(); return; }
  prefs.calibrationDone = true;
  storage.savePrefs(prefs);
  updateCalibRowLabel();
  resetCalibration();
  goBackFromSubpage();
});
if (els.calSkipBtn) els.calSkipBtn.addEventListener("click", () => { resetCalibration(); goBackFromSubpage(); });
if (els.calibBackBtn) els.calibBackBtn.addEventListener("click", () => { resetCalibration(); goBackFromSubpage(); });
renderCalStep();
updateCalibRowLabel();

// ---- Sık sorulan sorular (uygulamanın GERÇEK davranışına göre yazıldı) ----
const FAQ = [
  ["İpucu puanımı düşürür mü?", "Evet — ipucu kullandığın sorularda kazanılan XP yarıya iner. Doğru/yanlış değerlendirmeni ya da isabet oranını etkilemez."],
  ["Zorluk seviyeleri birbirinden nasıl farklı?", "Kolay'dan Sınırsız'a gittikçe frekans/bant farkları daralır ve süre kısalır. Ayarlar → Zorluk → Sabit'ten istediğin seviyeyi seçebilirsin; oyun ekranındaki zorluk göstergesiyle her zaman senkrondur."],
  ["Canlar neye yarıyor, nasıl dolar?", "Her zorluğun kendi can hakkı var. Canların biterse o zorlukta 'Oyun Bitti' kartı çıkar; otomatik dolma yoktur, 'Tekrar Oyna' ile yeniden dolar."],
  ["Kendi ses dosyamı yükleyince ne oluyor?", "Dosya yalnızca cihazında kalır, hiçbir sunucuya gönderilmez. Kaynak olarak seçili kaldığı sürece sorularda o dosya çalar; Karıştır (⇄) açıksa her turda rastgele bir kaynağa geçilir."],
  ["Neden kulaklık öneriliyor?", "Filtre/frekans farkları genelde incedir; telefon hoparlörü bunu kolayca maskeleyebilir. Kulaklık zorunlu değil ama çok daha güvenilir ve tutarlı sonuç verir."]
];
function renderFaq() {
  if (!els.faqList) return;
  els.faqList.innerHTML = "";
  FAQ.forEach(([q, a]) => {
    const card = document.createElement("div");
    card.className = "card faq-item";
    card.innerHTML = `
      <button class="faq-q" type="button"><h5>${q}</h5><span class="caret">＋</span></button>
      <p class="faq-a">${a}</p>
    `;
    const btn = card.querySelector(".faq-q");
    const answer = card.querySelector(".faq-a");
    const caret = card.querySelector(".caret");
    btn.addEventListener("click", () => {
      const open = answer.classList.toggle("open");
      caret.textContent = open ? "－" : "＋";
    });
    els.faqList.appendChild(card);
  });
}
renderFaq();

// ---- Geri bildirim gönder (backend yok — yerel onay + temizleme) ----
if (els.feedbackSendBtn) els.feedbackSendBtn.addEventListener("click", () => {
  const text = els.feedbackTextarea ? els.feedbackTextarea.value.trim() : "";
  if (!text) {
    toast("Boş görünüyor", "Göndermeden önce birkaç kelime yaz.");
    return;
  }
  if (els.feedbackTextarea) els.feedbackTextarea.value = "";
  toast("Teşekkürler", "Geri bildirimin alındı.");
  goBackFromSubpage();
});

// ---- Satın alma (gerçek IAP kapsam dışı — dürüst placeholder'lar) ----
syncAccountLine();
if (els.buyProBtn) els.buyProBtn.addEventListener("click", () => {
  toast("Yakında", "Satın alma bu sürümde henüz açık değil.");
});
if (els.restorePurchaseBtn) els.restorePurchaseBtn.addEventListener("click", () => {
  toast("Kontrol edildi", "Bu cihazda geri yüklenecek bir satın alım bulunamadı.");
});

// ═══════════════════════════════════════════════════════════════════════════
// Araçlar sekmesi — iskelet (Dizayn/prototype.html'den taşındı). Analiz ve Referans
// Filtreleri gerçek DSP/analiz içermiyor, sadece düzen + Pro kilit davranışı —
// gerçek satın alma bu sürümde yok, o yüzden kilit her zaman devrede kalacak.
// ═══════════════════════════════════════════════════════════════════════════

const TOOL_FILTERS = [
  ["Düz", "Referans — hiçbir renklendirme yok.", "miksin kendi dengesi."],
  ["Araba", "Bas vurgulu, orta bölgede çukur.", "Bas fazla mı, vokal kayboluyor mu?"],
  ["Kulüp / PA", "Aşırı bas, uzun kuyruk.", "Alt bölge dağılıyor mu, kick belirgin mi?"],
  ["Laptop", "Bas zayıf, orta ağırlıklı.", "Bas hiç duyulmuyorsa gövde yeterli mi?"],
  ["Teyp / Radyo", "Dar bant, hafif doygunluk.", "Şarkı dar bantta da anlaşılıyor mu?"],
  ["Ucuz kulaklık", "Bas ve tiz vurgulu.", "Tizler cırlıyor mu, S sesleri batıyor mu?"],
  ["Bluetooth hoparlör", "Dar bant, sıkıştırılmış.", "Dinamik kalıyor mu, itiliyor mu?"],
  ["Mono", "Kanallar toplanmış.", "Faz kaybı var mı, enstrüman kayboluyor mu?"]
];

function renderToolBars() {
  if (!els.toolBars) return;
  let html = "";
  for (let i = 0; i < 34; i++) {
    const t = i / 33;
    const v = 20 + 50 * Math.exp(-Math.pow((t - 0.2) / 0.3, 2)) + 16 * Math.exp(-Math.pow((t - 0.78) / 0.18, 2)) + 6 * Math.sin(i * 2.1);
    html += `<i style="height:${Math.round(Math.max(8, Math.min(74, v)))}px"></i>`;
  }
  els.toolBars.innerHTML = html;
}
renderToolBars();

function renderFilterChips() {
  if (!els.filterChips) return;
  els.filterChips.innerHTML = TOOL_FILTERS.map((f, i) => `<button type="button" class="fchip${i === 0 ? " on" : ""}">${f[0]}</button>`).join("");
  if (els.filterName) els.filterName.textContent = TOOL_FILTERS[0][0];
  if (els.filterDesc) els.filterDesc.textContent = TOOL_FILTERS[0][1];
  if (els.filterListen) els.filterListen.textContent = `Ne dinlemeli: ${TOOL_FILTERS[0][2]}`;
}
renderFilterChips();

if (els.toolsUploadBtn && els.toolsFileInput) {
  els.toolsUploadBtn.addEventListener("click", () => els.toolsFileInput.click());
  els.toolsFileInput.addEventListener("change", () => {
    const file = els.toolsFileInput.files && els.toolsFileInput.files[0];
    if (!file) return;
    if (els.toolsFileName) els.toolsFileName.textContent = file.name;
    if (els.toolsFileMeta) els.toolsFileMeta.textContent = `${Math.max(1, Math.round(file.size / 1024))} KB`;
  });
}

// Gerçek satın alma bu sürümde yok — Analiz/Referans Filtreleri normalde her zaman
// kilitli görünür, dokununca paywall'a yönlendirir. isUserPro() true ise (gerçek ya
// da geliştirici simülasyonu) kilit örtüsü gizlenir, altındaki .card görünür/
// dokunulabilir olur — İÇERİK hâlâ statik örnek veri (gerçek analiz motoru bu
// görevin kapsamı dışı), sadece ERİŞİM engeli kaldırılıyor.
function applyProLockVisibility() {
  const pro = isUserPro();
  [els.analyzeLock, els.filtersLock].forEach(btn => {
    if (!btn) return;
    btn.classList.toggle("hidden", pro);
  });
}
[els.analyzeLock, els.filtersLock].forEach(btn => {
  if (!btn) return;
  btn.addEventListener("click", () => { closeMainSettingsSheet(); goScreen("paywall"); });
});
applyProLockVisibility();

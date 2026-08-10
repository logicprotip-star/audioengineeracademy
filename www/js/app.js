// Giriş noktası: çekirdeği (core/*.js) ve modları (modes/*.js) birbirine bağlar.
// DOM cache, event listener'lar, oyun döngüsü orkestrasyonu burada yaşar — asıl
// mantık (ses zinciri, soru üretimi/puanlama, kalıcılık) core/ ve modes/ içindedir.

import { createAudioEngine } from "./core/audio-engine.js";
import { createUploadManager, validateAudioFile, audioAcceptAttr } from "./core/upload.js";
import { createRoundFlow } from "./core/round-flow.js";
import { createExamSystem, getWeakTier, recordTierResult, EXAM_CONFIG } from "./core/exam-system.js";
import * as storage from "./core/storage.js";
import * as progress from "./core/progress.js";
import * as paywall from "./core/paywall.js";
import { toast, spawnXp, burst, shake } from "./core/fx.js";
import { formatHz } from "./core/utils.js";
import { registerMode, getMode, listModes } from "./core/registry.js";
import { MODE_CATALOG } from "./core/mode-catalog.js";
import { modeVisualSvg } from "./core/mode-visuals.js";
import { SOURCE_GROUPS, findSource, findSourcePair } from "./core/source-catalog.js";
import { tierForLevel, DIFFICULTY_CONFIG, continuousLevel, sessionRampOffset, representativeLevelForTier, examCappedLevel } from "./core/difficulty-curve.js";
import { levelSheetTermsFor } from "./core/level-sheet-terms.js";
import { GENERAL_GUIDE, MODE_GUIDE_TEXTS, MODE_OPTIONS_TEXTS, shouldShowRoundHint, spotlightStepsFor } from "./core/guide-texts.js";
import { getWeakZone } from "./core/personalization.js";
import * as frekansBulma from "./modes/frekans-bulma.js";
import * as kesimNoktasi from "./modes/kesim-noktasi.js";
import * as dbSeviyesi from "./modes/db-seviyesi.js";
import * as boostMuCutMu from "./modes/boost-mu-cut-mu.js";
import * as qGenisligi from "./modes/q-genisligi.js";
import * as kompresor from "./modes/kompresor.js";
import * as reverb from "./modes/reverb.js";
import * as tonalDenge from "./modes/tonal-denge.js";
import * as frekansCakismasi from "./modes/frekans-cakismasi.js";
import * as distortion from "./modes/distortion.js";

registerMode(frekansBulma);
registerMode(kesimNoktasi);
registerMode(dbSeviyesi);
registerMode(boostMuCutMu);
registerMode(qGenisligi);
registerMode(kompresor);
registerMode(reverb);
registerMode(tonalDenge);
registerMode(frekansCakismasi);
registerMode(distortion);
// Motor 2'nin ("A/B/C odd-one-out") HANGİ mod id'lerini kapsadığını TEK yerde
// tutar — yeni bir Motor 2 modu (ör. Distortion) eklenince SADECE bu listeye
// eklenir, aşağıdaki TÜM çağıranlar (toggle/döngü/submit/önizleme/overlay)
// otomatik kapsar. G30'da SADECE Kompresör vardı (activeQuestion.mode==="kompresor"
// hardcoded), G35'te Reverb eklenince bu liste + iki yardımcı fonksiyon
// (isThreeWayModule/isThreeWayQuestion) çıkarıldı — G33'ün "MOTOR 2 ŞABLONU"
// notunun öngördüğü ikinci-modda-genelleştirme adımı budur.
// G45: "tonal-denge" BURADAN ÇIKARILDI — artık bir odd-one-out (A/B/C) modu
// DEĞİL, canlı EQ-düzeltme (kaydırıcı) moduna dönüştü (bkz. modes/tonal-denge.js
// dosya başı). Kompresör/Reverb bu listede AYNEN kalmaya devam ediyor.
// G59: "distortion" eklendi — Motor 2'nin dördüncü modu, AYNI şablon.
const THREE_WAY_MODE_IDS = ["kompresor", "reverb", "distortion"];
function isThreeWayModule(m) { return !!m && THREE_WAY_MODE_IDS.includes(m.MODE_ID); }
function isThreeWayQuestion(q) { return !!q && THREE_WAY_MODE_IDS.includes(q.mode); }
// Artık birden fazla oynanabilir mod var — `mode` menüden hangi karta basıldığına
// göre DEĞİŞİR (bkz. renderModeGrid'in kart click handler'ı). Başlangıç değeri
// Frekans Bulma (ilk açılışta menüde gösterilen ekran budur, henüz hiçbir kart
// tıklanmamış olsa bile modül-seviyesi kod — difficultyLivesMap() vb. — bir
// varsayılana ihtiyaç duyuyor).
let mode = getMode(frekansBulma.MODE_ID);

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
  comingGrid: document.getElementById("comingGrid"),
  gameTitle: document.getElementById("gameTitle"),
  gameInfoBtn: document.getElementById("gameInfoBtn"),
  answerFormatChipWrap: document.getElementById("answerFormatChipWrap"),
  answerFormatSettingsRow: document.getElementById("answerFormatSettingsRow"),
  backBtn: document.getElementById("backBtn"),
  // G90 (madde 1) — Tasarim-2026-08/Prototip.dc.html "ÇIKIŞ ONAYI", SIFIRDAN.
  exitConfirmOverlay: document.getElementById("exitConfirmOverlay"),
  exitConfirmBox: document.getElementById("exitConfirmBox"),
  exitConfirmStay: document.getElementById("exitConfirmStay"),
  exitConfirmLeave: document.getElementById("exitConfirmLeave"),
  tabbar: document.getElementById("tabbar"),
  dailyTipCard: document.getElementById("dailyTipCard"),
  // G91 (madde 1): #dailyTipClose (✕) KALDIRILDI — yerine akordiyon
  // (dailyTipToggle/dailyTipWrap/dailyTipChevron, bkz. bindCollapsiblePanel).
  dailyTipToggle: document.getElementById("dailyTipToggle"),
  dailyTipWrap: document.getElementById("dailyTipWrap"),
  dailyTipChevron: document.getElementById("dailyTipChevron"),
  showDailyTipSwitch: document.getElementById("showDailyTipSwitch"),
  dailyTipText: document.getElementById("dailyTipText"),
  dailyTipStartBtn: document.getElementById("dailyTipStartBtn"),
  dailyTipSkipBtn: document.getElementById("dailyTipSkipBtn"),
  // G36: Ana Menü seviye rozeti (Dizayn/prototype.html .lvl-badge'den) — G40'tan beri
  // İlerleme sekmesindeki AYNI desenli rozetle (progLevelValue/progXpBar/
  // progNextLevelText) AYNI veriyi (updateUI() içinde AYNI xp = progress.xpProgress
  // (diffState().xp) hesabından) gösterir, ayrı bir kaynak DEĞİL.
  menuLevelValue: document.getElementById("menuLevelValue"),
  menuLevelTitle: document.getElementById("menuLevelTitle"),
  menuXpText: document.getElementById("menuXpText"),
  menuXpBar: document.getElementById("menuXpBar"),
  menuNextLevelText: document.getElementById("menuNextLevelText"),

  // genel ayarlar (dişli) + yardım/bilgi ekranları
  menuInfoBtn: document.getElementById("menuInfoBtn"),
  guideSheetOverlay: document.getElementById("guideSheetOverlay"),
  guideSheet: document.getElementById("guideSheet"),
  guideSheetTitle: document.getElementById("guideSheetTitle"),
  guideSheetClose: document.getElementById("guideSheetClose"),
  guideSheetBody: document.getElementById("guideSheetBody"),
  spotlightOverlay: document.getElementById("spotlightOverlay"),
  spotlightHole: document.getElementById("spotlightHole"),
  spotlightCallout: document.getElementById("spotlightCallout"),
  spotlightStepLabel: document.getElementById("spotlightStepLabel"),
  spotlightDots: document.getElementById("spotlightDots"),
  spotlightTitle: document.getElementById("spotlightTitle"),
  spotlightText: document.getElementById("spotlightText"),
  spotlightSkip: document.getElementById("spotlightSkip"),
  spotlightNext: document.getElementById("spotlightNext"),
  menuSettingsBtn: document.getElementById("menuSettingsBtn"),
  progressSettingsBtn: document.getElementById("progressSettingsBtn"),
  // G88: Araçlar sekmesi Prototip.dc.html'in ARAÇLAR bloğuna göre yeniden
  // giydirildi (bkz. DURUM.md + index.html'in AYNI G88 notu) — eski
  // toolsSettingsBtn/toolsFileName/toolsFileMeta/toolBars/filterChips/
  // filterName/filterDesc/filterListen/filterResetBtn/analyzeLock/
  // filtersLock (tasarımda YOK olan dişli + sahte Analiz kartı + eski
  // filtre-chip/panel deseni) KALDIRILDI. toolsSettingsBtn'in kaldırılması
  // BİR erişim noktasının kaybı DEĞİL — Ayarlar'a Ana Menü/İlerleme'nin
  // KENDİ dişlisinden ZATEN ulaşılıyor (bkz. menuSettingsBtn/
  // progressSettingsBtn), tasarım da bu ekranda dişli göstermiyor.
  toolsUploadBtn: document.getElementById("toolsUploadBtn"),
  toolsUploadBtnLabel: document.getElementById("toolsUploadBtnLabel"),
  toolsFileInput: document.getElementById("toolsFileInput"),
  toolsProContent: document.getElementById("toolsProContent"),
  toolsFreeLock: document.getElementById("toolsFreeLock"),
  toolsProBtn: document.getElementById("toolsProBtn"),
  toolsRecentEmpty: document.getElementById("toolsRecentEmpty"),
  toolsRecentList: document.getElementById("toolsRecentList"),
  toolsFilterGrid: document.getElementById("toolsFilterGrid"),
  // G88: #toolBars artık HTML'de YOK (sahte Analiz kartı kaldırıldı, bkz.
  // aşağıdaki renderToolBars() notu) — cache burada BİLEREK tutuluyor,
  // fonksiyon kendi null-guard'ıyla zararsızca no-op kalır.
  toolBars: document.getElementById("toolBars"),
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
  diffHintV2: document.getElementById("diffHintV2"),
  accountVerLine: document.getElementById("accountVerLine"),
  goProBtn: document.getElementById("goProBtn"),
  versionRow: document.getElementById("versionRow"),
  settingsResetBtn: document.getElementById("settingsResetBtn"),
  devGroup: document.getElementById("devGroup"),
  devProSwitch: document.getElementById("devProSwitch"),
  devModeOffBtn: document.getElementById("devModeOffBtn"),
  filePickerTestBtn: document.getElementById("filePickerTestBtn"),
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

  // G89: Paywall Prototip.dc.html'in PAYWALL bloğuna göre yeniden giydirildi
  // (bkz. index.html + core/paywall.js'in AYNI G89 notu) — eski payFreeModes/
  // paywallReasonBanner/paywallReasonKicker/payFreeContinueBtn (tasarımda YOK
  // olan iki-kart karşılaştırması + ayrı kicker satırı + "ücretsiz devam"
  // butonu, paywallCloseBtn'le AYNI goBackFromSubpage() davranışını
  // tekrarlıyordu) KALDIRILDI.
  paywallCloseBtn: document.getElementById("paywallCloseBtn"),
  payProBenefits: document.getElementById("payProBenefits"),
  proPrice: document.getElementById("proPrice"),
  buyProBtn: document.getElementById("buyProBtn"),
  watchAdBtn: document.getElementById("watchAdBtn"),
  restorePurchaseBtn: document.getElementById("restorePurchaseBtn"),
  paywallReasonTitle: document.getElementById("paywallReasonTitle"),
  paywallReasonDetail: document.getElementById("paywallReasonDetail"),
  paywallBadgeWrap: document.getElementById("paywallBadgeWrap"),
  paywallLivesStrip: document.getElementById("paywallLivesStrip"),
  paywallLivesCountdown: document.getElementById("paywallLivesCountdown"),
  paywallPriceCard: document.getElementById("paywallPriceCard"),

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
  // G77: üst bar — bkz. index.html .ghead notu
  gameExamRow: document.getElementById("gameExamRow"),
  gameExamDots: document.getElementById("gameExamDots"),
  gameExamProgress: document.getElementById("gameExamProgress"),
  // G84: #screen-exam (announce/passed/failed/makeup) — bkz. showExamScreen()
  exPill: document.getElementById("exPill"),
  exPillIcon: document.getElementById("exPillIcon"),
  exKicker: document.getElementById("exKicker"),
  exBadgeOuter: document.getElementById("exBadgeOuter"),
  exBadgeInner: document.getElementById("exBadgeInner"),
  exBadgeTop: document.getElementById("exBadgeTop"),
  exBadgeMain: document.getElementById("exBadgeMain"),
  exTitle: document.getElementById("exTitle"),
  exBody: document.getElementById("exBody"),
  exFacts: document.getElementById("exFacts"),
  exCta: document.getElementById("exCta"),
  exSecondary: document.getElementById("exSecondary"),
  gameComboChip: document.getElementById("gameComboChip"),
  gameComboLabel: document.getElementById("gameComboLabel"),
  gameQCounter: document.getElementById("gameQCounter"),
  gameQNum: document.getElementById("gameQNum"),
  levelChipValue: document.getElementById("levelChipValue"),
  gameDiffChip: document.getElementById("gameDiffChip"),
  gameChapterRow: document.getElementById("gameChapterRow"),
  gameChapterDots: document.getElementById("gameChapterDots"),
  gameChapterLabel: document.getElementById("gameChapterLabel"),
  gameSpeedRow: document.getElementById("gameSpeedRow"),
  gameSpeedBarFill: document.getElementById("gameSpeedBarFill"),
  gameSpeedLabel: document.getElementById("gameSpeedLabel"),
  gameBossRow: document.getElementById("gameBossRow"),
  gameBossBarFill: document.getElementById("gameBossBarFill"),

  // kaynak / karıştır
  sourceSelect: document.getElementById("sourceSelect"),
  mixToggle: document.getElementById("mixToggle"),
  gameScroll: document.getElementById("gameScroll"),
  gameActionbar: document.getElementById("gameActionbar"),
  gameScreen: document.getElementById("screen-game"),
  sourceChipLabel: document.getElementById("sourceChipLabel"),
  sourceChipWrap: document.getElementById("sourceChipWrap"),

  // odak aralığı
  focusSelect: document.getElementById("focusSelect"),
  focusChipWrap: document.getElementById("focusChipWrap"),
  focusChipLabel: document.getElementById("focusChipLabel"),

  // G51 — Motor 3 (Frekans Çakışması): kaynak ÇİFTİ seçici + çift-upload + öncesi/sonrası
  cakismaPairSelect: document.getElementById("cakismaPairSelect"),
  cakismaPairChipWrap: document.getElementById("cakismaPairChipWrap"),
  cakismaPairChipLabel: document.getElementById("cakismaPairChipLabel"),
  uploadRowSingle: document.getElementById("uploadRowSingle"),
  cakismaOwnUploadBlock: document.getElementById("cakismaOwnUploadBlock"),
  cakismaUploadRowA: document.getElementById("cakismaUploadRowA"),
  cakismaUploadRowB: document.getElementById("cakismaUploadRowB"),
  cakismaFileInputA: document.getElementById("cakismaFileInputA"),
  cakismaFileInputB: document.getElementById("cakismaFileInputB"),
  cakismaCompare: document.getElementById("cakismaCompare"),
  cakismaBefore: document.getElementById("cakismaBefore"),
  cakismaAfter: document.getElementById("cakismaAfter"),

  // soru / spektrum
  questionTitle: document.getElementById("questionTitle"),
  questionMeta: document.getElementById("questionMeta"),
  analyzer: document.getElementById("analyzer"),
  analyzerLabel: document.getElementById("analyzerLabel"),
  gainValue: document.getElementById("gainValue"),
  hintTag: document.getElementById("hintTag"),
  analyzerFootMin: document.getElementById("analyzerFootMin"),
  analyzerFootCaption: document.getElementById("analyzerFootCaption"),
  analyzerFootMax: document.getElementById("analyzerFootMax"),
  hintMaskLayer: document.getElementById("hintMaskLayer"),
  canvas: document.getElementById("visualizer"),
  freqGuessArea: document.getElementById("freqGuessArea"),
  freqInfo: document.getElementById("freqInfo"),

  // süre / geri bildirim
  timerText: document.getElementById("timerText"),
  timerBar: document.getElementById("timerBar"),
  feedbackBox: document.getElementById("feedbackBox"),
  feedbackOverlay: document.getElementById("feedbackOverlay"),
  feedbackDetail: document.getElementById("feedbackDetail"),
  fbIcon: document.getElementById("fbIcon"),
  fbTitle: document.getElementById("fbTitle"),
  fbSubtitle: document.getElementById("fbSubtitle"),
  fbXpBlock: document.getElementById("fbXpBlock"),
  fbXpValue: document.getElementById("fbXpValue"),
  fbComboRow: document.getElementById("fbComboRow"),
  fbComboText: document.getElementById("fbComboText"),
  fbAdvance: document.getElementById("fbAdvance"),
  fbAdvanceBar: document.getElementById("fbAdvanceBar"),
  fbEarLeft: document.getElementById("fbEarLeft"),
  fbEarRight: document.getElementById("fbEarRight"),

  // alt aksiyon çubuğu
  startBtn: document.getElementById("startBtn"),
  abToggle: document.getElementById("abToggle"),
  abTitle: document.getElementById("abTitle"),
  abLoopBtn: document.getElementById("abLoopBtn"),
  gameLoopBadgeRow: document.getElementById("gameLoopBadgeRow"),
  gameLoopCaption: document.getElementById("gameLoopCaption"),
  gameSpectrumControls: document.getElementById("gameSpectrumControls"),
  audioErrorRow: document.getElementById("audioErrorRow"),
  audioErrorRetry: document.getElementById("audioErrorRetry"),
  audioLoadingRow: document.getElementById("audioLoadingRow"),
  gameM2HintUsedRow: document.getElementById("gameM2HintUsedRow"),
  hintBtn: document.getElementById("hintBtn"),
  hintBtnLabel: document.getElementById("hintBtnLabel"),
  nextBtn: document.getElementById("nextBtn"),
  answerFormatTouchBtn: document.getElementById("answerFormatTouchBtn"),
  answerFormatChoiceBtn: document.getElementById("answerFormatChoiceBtn"),

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
  // G37: kulaklık uyarı sheet'i (Dizayn/prototype.html #hpSheet'ten)
  hpSheetOverlay: document.getElementById("hpSheetOverlay"),
  hpSheet: document.getElementById("hpSheet"),
  hpSheetDesc: document.getElementById("hpSheetDesc"),
  hpSheetConfirm: document.getElementById("hpSheetConfirm"),
  hpSheetCancel: document.getElementById("hpSheetCancel"),
  hpSheetAgain: document.getElementById("hpSheetAgain"),
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

  // G87: İlerleme sekmesi Prototip.dc.html'in İLERLEME bloğuna göre yeniden
  // giydirildi (bkz. DURUM.md) — eski progLevelValue/progXpBar/accuracyValue/
  // roundsValue/wrongValue/avgScoreValue/bestComboValue/bestScoreValue/
  // totalPracticeValue/totalRoundsValue/whereNowText/zonePanelToggle/zoneCaret/
  // zoneWrap/zoneSub (tasarımda YOK olan lvl-badge/3'lü-stat/"Şu An Neredesin"/
  // "Canlı İstatistikler" kartları) KALDIRILDI — bu id'leri okuyan updateUI()/
  // renderExtraStats()/renderWhereNow() satırları da SÖKÜLDÜ.
  progEmptyState: document.getElementById("progEmptyState"),
  progContent: document.getElementById("progContent"),
  progStartFreqBtn: document.getElementById("progStartFreqBtn"),
  dailyCounter: document.getElementById("dailyCounter"),
  achievementList: document.getElementById("achievementList"),
  achievementCount: document.getElementById("achievementCount"),
  historyList: document.getElementById("historyList"),
  dailyList: document.getElementById("dailyList"),
  // G91 (madde 10): Günlük Görevler + Zayıf Bölge Raporu artık akordiyon.
  dailyToggle: document.getElementById("dailyToggle"),
  dailyWrap: document.getElementById("dailyWrap"),
  dailyChevron: document.getElementById("dailyChevron"),
  zoneToggle: document.getElementById("zoneToggle"),
  zoneWrap2: document.getElementById("zoneWrap2"),
  zoneChevron: document.getElementById("zoneChevron"),
  recentToggle: document.getElementById("recentToggle"),
  recentWrap: document.getElementById("recentWrap"),
  recentChevron: document.getElementById("recentChevron"),
  clearRecentBtn: document.getElementById("clearRecentBtn"),
  badgesToggle: document.getElementById("badgesToggle"),
  badgesChevron: document.getElementById("badgesChevron"),
  zoneList: document.getElementById("zoneList"),
  zoneLock: document.getElementById("zoneLock"),
  zoneProBtn: document.getElementById("zoneProBtn"),
  accChartFilterWrap: document.getElementById("accChartFilterWrap"),
  accChartLock: document.getElementById("accChartLock"),
  accChartProBtn: document.getElementById("accChartProBtn"),
  modeLevelsToggle: document.getElementById("modeLevelsToggle"),
  modeLevelsChevron: document.getElementById("modeLevelsChevron"),
  modeLevelsList: document.getElementById("modeLevelsList"),
  accChartSvg: document.getElementById("accChartSvg"),
  accChartEmpty: document.getElementById("accChartEmpty"),
  accChartLabels: document.getElementById("accChartLabels"),
  accChartFirst: document.getElementById("accChartFirst"),
  accChartLast: document.getElementById("accChartLast"),

  // seans sonu ekranı
  resPill: document.getElementById("resPill"),
  resPillIcon: document.getElementById("resPillIcon"),
  resKicker: document.getElementById("resKicker"),
  // G82: resRing ARTIK statik değil — her showSessionEnd() çağrısında
  // innerHTML'i TAMAMEN yeniden kuruluyor (animasyonlu SVG halka + merkez
  // metin, bkz. buildResultRing). Eski resPct/resScore statik div'leri bu
  // yüzden els{} önbelleğinden KALDIRILDI — module-load anında cache'lenmiş
  // bir referans, ilk yeniden kurmadan SONRA BAYATLARDI (detached node'a
  // yazardı, els.freqInfo'nun İÇİNİN her zaman TAZE sorgulanması gerektiği
  // AYNI G81 dersi). Değerler artık DOĞRUDAN buildResultRing'in ürettiği
  // HTML string'ine gömülüyor, ayrı bir "bul ve yaz" adımı YOK.
  resRing: document.getElementById("resRing"),
  resHead: document.getElementById("resHead"),
  resLead: document.getElementById("resLead"),
  resBonusRow: document.getElementById("resBonusRow"),
  resLevelUp: document.getElementById("resLevelUp"),
  resLevelUpBadge: document.getElementById("resLevelUpBadge"),
  resXpRows: document.getElementById("resXpRows"),
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
  resBadge: document.getElementById("resBadge"),
  resBadgeIcon: document.getElementById("resBadgeIcon"),
  resBadgeName: document.getElementById("resBadgeName"),
  resBadgeDesc: document.getElementById("resBadgeDesc"),
  resCta: document.getElementById("resCta"),
  resWaitRow: document.getElementById("resWaitRow"),
  resWaitCountdown: document.getElementById("resWaitCountdown"),
  resRetryBtn: document.getElementById("resRetryBtn"),
  resMenuBtn: document.getElementById("resMenuBtn")
};

// sourceSelect'in <option>/<optgroup> listesi SOURCE_GROUPS'tan üretilir — kaynak
// sheet'i tek kaynaktan (source-catalog.js) beslenir, HTML'de ayrıca elle tutulmaz.
// Boş gruplar (sources:[]) hiç render edilmez — bugün için hepsi dolu ama yeni
// bir motor/grup boş eklenirse yine otomatik gizlenir.
//
// AKTİF MODUN kaynak uyumluluğu (getMeta().uyumluKaynaklar, bkz. source-catalog.js
// compatibleSourceIds) listeyi süzer — bir modda anlamsız bir kaynak (Reverb'de
// kick gibi tek-vuruşlar, Kompresör'de pembe/beyaz gürültü gibi transient'sız
// kaynaklar) seçim listesinde hiç GÖRÜNMEZ, dolayısıyla seçilemez de. enterMode()
// mod değiştiğinde bu fonksiyonu YENİDEN çağırır.
function populateSourceSelect() {
  if (!els.sourceSelect) return;
  const compatible = new Set(mode.getMeta().uyumluKaynaklar);
  const previousValue = els.sourceSelect.value;
  els.sourceSelect.innerHTML = SOURCE_GROUPS
    .map(g => ({ label: g.label, sources: g.sources.filter(s => compatible.has(s.id)) }))
    .filter(g => g.sources.length > 0)
    .map(g => `<optgroup label="${g.label}">${g.sources.map(s => `<option value="${s.id}">${s.label}</option>`).join("")}</optgroup>`)
    .join("");
  // Önceki seçim yeni modda da uyumluysa korunur; değilse (ör. Reverb'den
  // Kompresör'e geçilirken seçili kaynak gürültüydü) listedeki İLK uyumlu kaynağa
  // düşülür — kullanıcı hiç var olmayan bir <option>'da "takılı" kalmaz. "change"
  // event'i elle tetiklenir ki Ayarlar sheet'indeki satır metni (updateRowText)
  // senkron kalsın.
  if (compatible.has(previousValue)) {
    els.sourceSelect.value = previousValue;
  } else if (els.sourceSelect.options.length > 0) {
    els.sourceSelect.selectedIndex = 0;
    els.sourceSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
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
// G86 DÜZELTMESİ: BURADAKİ erken çağrı SÖKÜLDÜ — updateAnalyzerFoot() artık
// currentFocusRange() üzerinden isUserPro()'yu (devFlags okur) da çağırıyor,
// devFlags bu SATIRDAN SONRA (satır ~643) tanımlanıyor — TDZ ReferenceError
// (canlı konsolda YAKALANDI). #analyzer zaten #screen-game aktif olmadan
// GÖRÜNMEZ, enterMode() içindeki GERÇEK çağrı (mod gerçekten girilince)
// yeterli — bu ilk/erken çağrının GÖZLENEBİLİR hiçbir etkisi yoktu.

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
  // G31 (bug 2 düzeltmesi): tur bitti (cevap verildi/süre doldu) diye çubuk
  // tucked oluyorsa, hâlâ dönen bir A/B döngüsü de (varsa) burada durur —
  // Motor 2 modlarının cycleThreeWayPreview'ı (diğer modların setProcessed'inin
  // AKSİNE) buildQuestionChain'i YENİDEN çağırıp SESİ BAŞTAN başlatıyor;
  // döngü zamanlayıcısı roundActive/actionbar durumuna hiç bakmadan 2sn'de
  // bir tetiklenmeye devam ederse geri bildirim kartı AÇIKKEN yeni ses
  // duyulabiliyordu (canlı cihazda YAKALANDI). Bu fonksiyon HER modun HER
  // cevap-sonrası/süre-dolumu yolunda tucked=true ile çağrıldığı TEK ortak
  // nokta (bkz. çağıran satırlar) — diğer beş modda abLoopTimer zaten bu
  // noktada sesli bir etkisi olmayan (setProcessed dryGain/wetGain null
  // olunca no-op) bir zamanlayıcıydı, burada durdurmak onlar için davranış
  // DEĞİŞTİRMİYOR, sadece artık gerçekten temizleniyor.
  if (tucked && abLoopTimer) stopAbLoop();
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
// G51 — Motor 3 (Frekans Çakışması): "kendi dosyalarım" çifti İKİ AYRI dosya
// gerektirir (task: "iki kaynak çakışma iki kaynak arası, ikisini de kendi
// yüklesin") — createUploadManager BİR FABRİKA (modül-seviyesi paylaşılan
// durum YOK, bkz. core/upload.js), bu yüzden SADECE İKİNCİ bir örnek yaratmak
// yeterli, core/upload.js'e TEK SATIR dokunulmadı. Diğer sekiz mod (ve
// cakisma'nın kendi "kick-bas" hazır çifti) uploadManagerA/B'yi HİÇ görmez.
const uploadManagerA = createUploadManager(() => audioEngine.audioCtx);
const uploadManagerB = createUploadManager(() => audioEngine.audioCtx);
audioEngine.onReady = () => drawVisualizer();

// G47: Sınav sistemi (core/exam-system.js) — TEK örnek, round-flow.js/audio-engine.js
// ile AYNI "bir kez yarat, elde tut" deseni. mode.EXAM_ENABLED export ETMEYEN
// modlarda (bugün Kompresör HARİÇ hepsi) examSystem.phase HER ZAMAN "parkur" kalır
// ve HİÇBİR app.js dalı onu okumaz — var olması bile o modları ETKİLEMEZ.
const examSystem = createExamSystem();

const revealAnimator = mode.createRevealAnimator({
  sfxDing: audioEngine.sfxDing,
  sfxBuzz: audioEngine.sfxBuzz
});

function updateTimerUI(timeLeft = roundFlow.timeLeft, roundDuration = roundFlow.roundDuration) {
  els.timerText.textContent = `${timeLeft.toFixed(1)}s`;
  const pct = roundDuration ? (timeLeft / roundDuration) * 100 : 0;
  els.timerBar.style.width = `${Math.max(0, pct)}%`;
  // G77: üst barın "hızlı cevap 1.2x" çubuğu (bölüm göstergesi satırı) + boss
  // "SÜRE" çubuğu — AYNI timeLeft/roundDuration'ı okur (#timerBar'ın KENDİSİ,
  // bkz. yukarıdaki satır). Eşik (0.55) modların calculateXP()'indeki AYNI
  // timeBoost formülüyle BİREBİR aynı (bkz. frekans-bulma.js:510 vb.) — çubuk
  // dekoratif DEĞİL, gerçek kalan süreyi gösterir.
  const clampedPct = Math.max(0, pct);
  if (els.gameSpeedBarFill) els.gameSpeedBarFill.style.width = `${clampedPct}%`;
  if (els.gameSpeedLabel) els.gameSpeedLabel.classList.toggle("active", roundDuration > 0 && timeLeft > roundDuration * 0.55);
  if (els.gameBossBarFill) els.gameBossBarFill.style.width = `${clampedPct}%`;
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
// G63 (PAYWALL.md Parça 2): "İlk oturumda paywall yok" — stats.rounds'ın BU
// runtime BAŞLARKENKİ (henüz hiçbir tur bu çalıştırmada sayılmadan) değeri
// "hiç oynamamış" mı sorusuna cevap veriyor. BİLEREK const — bu runtime'ın
// TAMAMI boyunca sabit kalır, kullanıcı bu ziyarette 5-6 tur oynayıp
// stats.rounds arttırsa bile "ilk oturum" durumu İÇİNDE kalınır; sadece
// uygulama YENİDEN açılınca (stats.rounds artık >0) paywall aktif olur.
const paywallSuppressedFirstSession = paywall.isFirstSession(stats.rounds);

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
// G82: xpBaseSum/newBadges Seans Sonu ekranının XP kırılımı/rozet kartı için
// eklendi (bkz. showSessionEnd) — xpBaseSum her doğru cevapta xpBaseFor() ile
// (G81'in AYNI gerçek-taban okuyucusu) artıyor, newBadges her notifyNewAchievements()
// çağrısında bu OTURUMDA açılan başarımları biriktiriyor.
let session = { correct: 0, wrong: 0, xp: 0, hints: 0, log: [], xpBaseSum: 0, newBadges: [] };
// Seans Sonu'nda "Seviye atladın" kartı için: bu oturum/deneme BAŞLARKEN hangi
// seviyedeydi. resetSession() her yeni deneme başında (Oyunu Başlat/Tekrar Oyna/
// 10 Soru Daha) çağrıldığında güncellenir; burada da (currentLives ile aynı mantık)
// açılıştaki GERÇEK seviyeden başlatılır — yoksa kullanıcının ilk oturumunda
// (hiç resetSession() tetiklenmeden 10 Soruluk Bölüm bitirse bile) "Seviye atladın"
// kartı hiç çıkmazdı (null !== null her zaman false döner).
let sessionStartLevel = progress.xpProgress(diffState().xp).level;
function resetSession() {
  session = { correct: 0, wrong: 0, xp: 0, hints: 0, log: [], xpBaseSum: 0, newBadges: [] };
  sessionStartLevel = progress.xpProgress(diffState().xp).level;
  roundsInThisPlaySession = 0;
}

// G18 bug taraması bulgusu: `session` (yukarıda) sadece Seans Sonu ekranının 3
// CTA'sında (startFreshAttempt → resetSession) sıfırlanıyor — normal "Oyunu Başlat"
// tuşuna basmak `session.correct+wrong`'a HİÇ dokunmuyordu (updateStartBtnLabel'ın
// !activeQuestion dalı sadece setAutoPlay(true) çağırıyor). İlk denemede
// `sessionQuestionIndex: session.correct+session.wrong` kullanılmıştı — bu, Durdur→
// Oyunu Başlat ile devam eden GERÇEKTEN yeni bir "oturumda" bile tip-gizleme
// eşiğinin (bkz. kesim-noktasi.js TYPE_REVEAL_QUESTION_COUNT) daha ilk turda
// tetiklenmesine yol açıyordu (canlı doğrulandı: Durdur+Oyunu Başlat sonrası soru 1
// hep "Ne tür filtre" gösterdi). Bu yüzden AYRI, dar kapsamlı bir sayaç: her GERÇEK
// fresh-start noktasında (resetSession() + "Oyunu Başlat"ın !activeQuestion dalı,
// bkz. aşağıdaki startBtn click handler'ı) sıfırlanır, her startRound()'da 1 artar.
// `session`'ın kendisine (Seans Sonu ekranı istatistikleri) DOKUNULMADI.
let roundsInThisPlaySession = 0;

let freqGuessHz = null;
let freqHoverHz = null;
// G19: Kesim Noktası'nın cevap-sonrası filtre eğrisi görseli için — kullanıcının
// verdiği cevap {freq, filterType} (bkz. submitCutoffGuess). frekans-bulma.js'in
// freqGuessHz'i sadece bir Hz sayısı taşıyor, bu modun cevabı hem frekans HEM tip
// içerdiği (tip gizli sorularda yanlış tip seçilebiliyor) için AYRI bir alan —
// drawVisualizer'ın overlayState'ine geçiyor, mode.drawOverlay bunu okur. Her yeni
// soruda (renderQuestion) null'a döner, submitCutoffGuess cevaplanınca doldurur.
let cutoffGuess = null;
// dB Seviyesi'nin cevap-sonrası dB göstergesi için — kullanıcının verdiği cevabın
// SAYISAL değeri (bkz. submitLevelGuess). cutoffGuess'in AYNI deseni — her yeni
// soruda (renderQuestion) null'a döner, submitLevelGuess cevaplanınca doldurur.
let dbGuess = null;
// Boost/Cut'ın cevap-sonrası bell-eğrisi görseli için — dbGuess/cutoffGuess'in
// AYNI deseni, ama KATMANA göre normalize edilmiş {freq, gainDb} (bkz.
// submitBoostCutGuess'in notu: Katman 1/2'de freq her zaman question.freq'tir,
// çünkü kullanıcı onu guess ETMEDİ — sadece Katman 3'te gerçek bir guess'tir).
let boostCutGuess = null;
// Q Genişliği'nin cevap-sonrası bell-eğrisi görseli için — kullanıcının SEÇTİĞİ
// genişlik etiketinin id'si (freq/gain her zaman true değerlerle aynı, bkz.
// q-genisligi.js:drawOverlay'in notu — kullanıcı burada sadece GENİŞLİĞİ guess
// ediyor, frekans/gain'i değil).
let qGuessLabelId = null;
// Motor 2'nin (A/B/C odd-one-out — Kompresör + G35'ten beri Reverb) cevap-
// sonrası görseli için — kullanıcının SEÇTİĞİ harfin ("A"/"B"/"C") id'si;
// mode.drawOverlay bu harfin GERÇEK parametrelerini (question.variants'tan)
// okuyor. TEK bir değişken — aynı anda sadece BİR three-way mod aktif
// olabildiği için Kompresör'le Reverb arasında PAYLAŞILIYOR (dbGuess/
// boostCutGuess gibi her modun KENDİ değişkeni olduğu desenin AKSİNE — burada
// iki modun TAMAMEN aynı anlamda kullandığı, gerçek bir ortak durum).
let threeWayGuessLetter = null;
// Motor 2'nin 3-yönlü dinleme durumu — diğer modların currentPlayMode'undan
// (o "clean"/"filtered" İKİLİ semantiği taşıyor) BİLEREK AYRI: burası "A"/"B"/
// "C" harfleri taşıyor. Her yeni turda (renderQuestion) "A"ya döner — turun
// İLK çalışı zaten variants[0] (A) ile başlıyor (bkz. kompresor.js/reverb.js:
// applyProcessing'in notu), bu ikisi HER ZAMAN senkron kalmalı.
let threeWayPlayLetter = "A";
// G86 YENİ — Motor 2 kartlarının SEÇİLİ (henüz gönderilmemiş) harfi. Kart
// tıklanınca değişir (bkz. #answers click delegasyonu), gönderim AYRI bir
// onay butonuyla olur (kompresor.js/reverb.js/distortion.js
// renderGuessAreaControls). Her yeni turda null'a döner.
let threeWaySelectedLetter = null;

// G45: Tonal Denge'nin CANLI EQ kaydırıcı durumu — {bandId: correctionDb}.
// dbGuess/boostCutGuess gibi bu modun KENDİ değişkeni (three-way'in paylaşılan
// threeWayGuessLetter'ından FARKLI — Tonal Denge artık three-way DEĞİL). Her
// yeni turda (renderQuestion) {}'ya döner; kaydırıcı input event'lerinde
// CANLI güncellenir (bkz. "Tonal Denge — canlı EQ kaydırıcıları" bölümü);
// submitTonalDengeGuess'te DONDURULUR (cevap-sonrası görsel bunu okur).
let tonalDengeCorrections = {};

// G51 — Motor 3 (Frekans Çakışması) AŞAMA 1'in (Teşhis) cevap-sonrası görseli
// için — diğer modların guess değişkenleriyle AYNI desen. Her yeni turda
// (renderQuestion) null'a döner, submitCakismaGuess'te DONDURULUR.
let cakismaGuess = null;

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

// G61 (PAYWALL.md): "Sınav + seviye atlama YOK (ücretsizde)" — sınav SİSTEMİNİN
// kendisi (core/exam-system.js) HİÇ değiştirilmedi (task: "sınav Pro'da çalışan,
// DOKUNULMAZ"), sadece app.js'in onu NE ZAMAN devreye aldığı bu TEK noktadan
// kısıldı. `mode.EXAM_ENABLED`'ı DOĞRUDAN okuyan ~15 karar noktası (examHandled/
// examActive/examTier/roundChip label/vb.) artık BUNUN ÜZERİNDEN okuyor — free
// kullanıcıda examGateActive() HER ZAMAN false, dolayısıyla stats.examState o
// modId için hiç kurulmaz/yazılmaz (mode-level XP/Sv rozeti ETKİLENMEZ — task'ın
// "KISITLANMAYAN: XP/streak/rozet" maddesiyle ÇAKIŞMAZ, sadece exam-TETİKLİ tier
// ilerlemesi durur).
function examGateActive() {
  return !!mode.EXAM_ENABLED && isUserPro();
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

// G47: SADECE mode.EXAM_ENABLED olan modlar için ÇAĞRILIR (bkz. çağıranlar) —
// stats.examState[modeId]'i lazy kurar. examLevel'in İLK değeri progress.
// modeLevel()'ın O ANKİ (henüz examState yokken hesaplanan, yani SAF XP'den
// gelen) sonucu — kullanıcı zaten bir seviyedeyse sınav sistemi onu SIFIRA
// ÇEKMEZ, olduğu yerden devam eder (bkz. progress.js modeLevel notu).
function examStatsFor(modeId) {
  if (!stats.examState) stats.examState = {};
  if (!stats.examState[modeId]) {
    stats.examState[modeId] = { examLevel: progress.modeLevel(stats, modeId), tierStats: {} };
  }
  return stats.examState[modeId];
}

// ADIM 1 (zorluk sisteminin merkezi bağlanması — bkz. core/difficulty-curve.js
// dosya başı not): zorlukKonumu = taban (Otomatik'te sürekli/kesirli seviye —
// XP'nin İÇİNDEKİ ilerlemeyi de sayar, bkz. continuousLevel; Sabit'te seçili
// tier'ın TIER_BOUNDARIES'teki temsilci noktası, bkz. representativeLevelForTier)
// + seans içi rampa ofseti (ısınma→zorlaşma→boss, bkz. sessionRampOffset).
//
// MOD-AGNOSTİK — createQuestion çağrısına HER moda geçiyor (sessionQuestionIndex'le
// AYNI desen, tek taraflı okunur). ADIM 1'de SADECE Kesim Noktası bunu okuyordu;
// ADIM 2 ile Frekans Bulma da kendi paramsForDifficultyPosition'ını yazıp bağlandığı
// için BU FONKSİYONA hiç dokunulmadı — ikisi de AYNI zorlukKonumu'nu, AYNI baseline/
// rampa formülüyle okuyor (bkz. DURUM.md tutarlılık doğrulaması). `applyAutoDifficulty()`
// (hangi tier'ı `els.difficultySelect.value`'ya yazdığı) hâlâ DEĞİŞMEDİ — tier-seçim
// akışı (hangi turda hangi ADI görürsün) BİREBİR eskisi gibi, sadece o tier İÇİNDEKİ
// gerçek sayılar artık her iki modda da eğriden geliyor.
//
// proplus BİLEREK bu eğrinin DIŞINDA (undefined döner, createQuestion o zaman
// eski statik DIFFICULTY[level] yoluna düşer) — Z5 kararıyla aynı çizgide
// (proplus Otomatik'te zaten hiç seçilmiyor, Sabit'te elle seçilirse de eğri
// değil kendi statik satırı kullanılır) — bu HER İKİ mod için de geçerli.
// G49: Otomatik-mod taban terimi artık examLevel'e de bağlı — bkz.
// difficulty-curve.js:examCappedLevel() dosya başı notu (ÇELİŞKİ teşhisi:
// modeLevel()/tierForLevel() ÜZERİNDEN kademe adı DONUYORDU ama bu fonksiyonun
// ham-XP tabanı sınırsız artmaya devam ediyordu — sınavı geçemeyen kullanıcıda
// "Seviye N" sabitken gerçek kGap/gainDb/Q artmaya devam ediyordu). SADECE
// mode.EXAM_ENABLED modlarda (ve o modda examState kurulduktan SONRA) etkili —
// diğer yedi mod examLevel=undefined ile examCappedLevel'den DEĞİŞMEDEN geçer.
function currentDifficultyPosition(boss) {
  const tier = els.difficultySelect ? els.difficultySelect.value : "medium";
  if (tier === "proplus") return undefined;
  const baseline = diffModeAuto
    ? examCappedLevel(
        continuousLevel(progress.xpProgress(progress.modeXp(stats, mode.getMeta().id))),
        currentModeExamLevel()
      )
    : representativeLevelForTier(tier);
  // G97 (madde 1): ücretsiz oturum SADECE 5 soru (paywall.FREE_SESSION_
  // QUESTION_LIMIT) — 10 soruya yayılan ramp (−1.5→+1.0, bkz. G96) ücretsizde
  // HER ZAMAN yarım kalıyordu (en fazla index 0-4, yani ramp'in SADECE ısınma
  // yarısı — hiçbir ücretsiz oturum "zorlaşma" ucunu HİÇ görmüyordu, bkz.
  // ZORLUK.md'nin bu tespiti — kullanıcının kendi kararı). Ücretsizde
  // artık ramp UYGULANMIYOR — zorluk konumu DÜZ tabandan gelir (offset 0).
  // Boss ofseti (+2.0) İSTİSNA: `boss` true'ysa sessionRampOffset zaten
  // roundsInThisPlaySession'dan BAĞIMSIZ olarak SESSION_RAMP_CONFIG.
  // BOSS_OFFSET'i döner (bkz. o fonksiyonun `if (boss) return...` dalı) —
  // bu yüzden `isUserPro() || boss` tek koşulu hem "Pro'da tam ramp" hem
  // "ücretsizde bile boss'ta +2.0" davranışını AYNI satırda doğru veriyor,
  // boss'un GERÇEK sabiti (2.0) burada AYRICA hardcode edilmedi.
  const ramp = (isUserPro() || boss) ? sessionRampOffset(roundsInThisPlaySession, { boss }) : 0;
  return baseline + ramp;
}

// examStatsFor()'un AYNI okuma deseni ama YAZMIYOR (lazy-init YOK) — sınav
// sistemi bu moda HİÇ dokunmadıysa (mode.EXAM_ENABLED false, ya da bu oturumda
// henüz ilk cevap verilmediği için stats.examState[modeId] henüz kurulmadıysa)
// undefined döner, examCappedLevel() bunu "sınırsız" olarak yorumlar.
function currentModeExamLevel() {
  if (!mode.EXAM_ENABLED) return undefined;
  const es = stats.examState && stats.examState[mode.getMeta().id];
  return es && typeof es.examLevel === "number" ? es.examLevel : undefined;
}

function timerOff() {
  return els.timerModeSelect && els.timerModeSelect.value === "off";
}

// proplus'ta şıklı arayüz yok (4 bandı aynı anda işaretlemek gerekiyor) — o modda
// bu her zaman false döner, dokunmalı akış değişmeden çalışır. Kesim Noktası'nda
// ("cutoff") ise TERSİ: dalgaya tıklama affordance'ı yok, "Cevap biçimi" ayarından
// BAĞIMSIZ olarak her zaman şıklı (bkz. kesim-noktasi.js dosya başı not).
function isChoiceFormat() {
  if (activeQuestion && (activeQuestion.mode === "cutoff" || activeQuestion.mode === "dblevel" || activeQuestion.mode === "boostcut" || activeQuestion.mode === "qwidth" || activeQuestion.mode === "tonal-denge" || activeQuestion.mode === "cakisma" || isThreeWayQuestion(activeQuestion))) return true;
  return !!(els.answerFormatSelect && els.answerFormatSelect.value === "choice"
    && activeQuestion && activeQuestion.mode !== "proplus");
}

// G18 bug taraması: Kesim Noktası'nda "Dokunmalı" hiçbir şeye bağlı değildi (mod
// dalgaya tıklamayı hiç desteklemiyor, isChoiceFormat() zaten hep şıklıya zorluyor)
// — ama toggle GÖRÜNÜR kalıyordu, seçilince sessizce hiçbir etkisi olmuyordu. Aktif
// modun getMeta().choiceOnly bayrağına göre (bkz. kesim-noktasi.js) chip + Oyun
// Ayarları satırının İKİSİNİ birden gizler/gösterir — Frekans Bulma'da (choiceOnly
// yok/false) davranış DEĞİŞMEDİ.
function syncAnswerFormatVisibility() {
  const hide = !!mode.getMeta().choiceOnly;
  if (els.answerFormatChipWrap) els.answerFormatChipWrap.classList.toggle("hidden", hide);
  if (els.answerFormatSettingsRow) els.answerFormatSettingsRow.classList.toggle("hidden", hide);
}

// G51 — Motor 3 (Frekans Çakışması): diğer sekiz modun TEK-kaynak "Kaynak"
// chip'i/upload satırı burada ANLAMSIZ (bir ÇİFT kullanılıyor, bkz.
// frekans-cakismasi.js dosya başı notu) — bu fonksiyon o chip'i gizleyip
// YERİNE kaynak-çifti chip'ini + (sadece "own" çifti seçiliyse) İKİ AYRI
// upload satırını gösterir. Diğer sekiz modda `isCakisma` hep false, TÜM
// dallar ÖNCEKİ davranışla BİREBİR aynı kalır (sourceChipWrap/uploadRowSingle
// hep görünür, cakisma-özel satırlar hep gizli).
function currentCakismaPairId() {
  return els.cakismaPairSelect ? els.cakismaPairSelect.value : "kick-bas";
}
function syncCakismaVisibility() {
  const isCakisma = mode.MODE_ID === "frekans-cakismasi";
  if (els.sourceChipWrap) els.sourceChipWrap.classList.toggle("hidden", isCakisma);
  if (els.cakismaPairChipWrap) els.cakismaPairChipWrap.classList.toggle("hidden", !isCakisma);
  if (els.abToggle) els.abToggle.classList.toggle("hidden", isCakisma);
  const isOwnPair = isCakisma && currentCakismaPairId() === "own";
  // G56 düzeltmesi: uploadRowSingle (diğer sekiz modun TEK-kaynak yükleme
  // satırı, Oyun Ayarları sheet'inde) Motor 3'te (pair="own" OLSUN OLMASIN)
  // HİÇ anlamlı değil — ESKİ kod SADECE isOwnPair'e bakıyordu, yani Motor
  // 3'te BİR YERLEŞİK çift (ör. Kick+Bas) seçiliyken bu satır YANLIŞLIKLA
  // görünür kalıyordu. Artık isCakisma'nın KENDİSİNE bakıyor.
  if (els.uploadRowSingle) els.uploadRowSingle.classList.toggle("hidden", isCakisma);
  // G56: İKİ GENEL yükleme yuvası artık AYRI satırlar değil, TEK bir blok
  // (#cakismaOwnUploadBlock, ana oyun ekranında — kaynak-çifti chip'inin
  // hemen altında, "..." Oyun Ayarları'na gitmeye GEREK YOK). cakismaUploadRowA/B
  // KENDİLERİ artık her zaman görünür (blok içinde), sadece BLOK toggle edilir.
  if (els.cakismaOwnUploadBlock) els.cakismaOwnUploadBlock.classList.toggle("hidden", !isOwnPair);
  if (els.cakismaCompare) els.cakismaCompare.classList.add("hidden"); // yeni moda/round'a girerken her zaman kapalı başlar
}

// Aktif sorunun .ans grid'ini görünür/gizli tutar — hem yeni soru render'ında hem
// de "Cevap biçimi" ayarı değiştiğinde (bkz. answerFormatSelect'in change dinleyicisi)
// çağrılır.
function syncAnswerArea() {
  // G85: spektrum yüksekliği — Tasarim-2026-08/Prototip.dc.html'in LİTERAL
  // ölçüleri (dokunmalı 252px, şıklı/kademeli 188px, satır 641/670) —
  // .analyzer-compact (Tonal Denge, G46) İLE ÇAKIŞMAZ, CSS kaynak sırası
  // onu ÖNCELİKLİ tutuyor (bkz. styles.css). resizeCanvas() ZORUNLU —
  // #visualizer'ın gerçek piksel tamponu CSS yüksekliği değişince YENİDEN
  // ölçülmezse çizim eski (yanlış) boyutta kalır (G83'ün AYNI deseni).
  if (els.analyzer) els.analyzer.classList.toggle("analyzer-choice", isChoiceFormat());
  resizeCanvas();
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

// G91 (madde 6) — Tasarim-2026-08/Prototip.dc.html satır 470-476 birebir:
// 12x12 SVG kalp (AYNI path — "canların bitti" bannerındaki BÜYÜK kalple
// AYNI çizim, sadece 12x12'ye küçültülmüş), stroke-width HER ZAMAN 1.5.
// ÖNCEDEN "♥" metin glyph'i .heart{background:var(--rd);border-radius:99px}
// (bir NOKTA için tasarlanmış CSS) İÇİNE basılıyordu — glyph'in KENDİ beyaz
// rengi + arkasındaki dairenin kırmızı background'u ÜST ÜSTE biniyordu
// ("beyaz kalp + kırmızı leke" — canlı testte yakalandı). Artık DOĞRUDAN
// SVG çiziliyor, arkaplan/leke YOK.
const HEART_PATH = "M12 21C7 16.5 3 13 3 8.8 3 5.9 5.2 4 7.7 4 9.4 4 11 4.9 12 6.3 13 4.9 14.6 4 16.3 4 18.8 4 21 5.9 21 8.8 21 13 17 16.5 12 21Z";
// G92 (madde 12a): loseAnimIndex verilirse (SADECE loseLife()'ın çağrısı) o
// index'teki kalp heartOut'la (Prototip.dc.html satır 20/476 birebir: 420ms
// 150ms cubic-bezier(.3,.7,.4,1) both) oynar — diğer 5 çağrı yeri (mod
// değişimi/round başlangıcı/vb.) parametresiz çağırıyor, animasyon YOK
// (spurious replay olmasın diye SADECE gerçek can kaybında tetiklenir).
// G92 düzeltme: loseLife() renderHearts(prevLives-1)'i çağırıp heartOut'u
// DOM'a yazdıktan hemen sonra, AYNI senkron tick içinde updateUI()'nin
// KENDİ renderHearts()'ı (parametresiz) tekrar çağrılıyor — innerHTML=""
// ile TÜM kalpler sıfırdan (animasyonsuz) yeniden kuruluyor, henüz boyanmamış
// animasyonlu node'u paint'ten ÖNCE siliyordu (canlı testte yakalandı: can
// azaldığı halde .heart svg'lerinde style="animation:..." hiç görünmüyordu).
// Çözüm: imza (maxLives+currentLives) değişmediyse ve loseAnimIndex
// verilmediyse (yani "gerçek bir değişiklik yok, sadece rutin re-render")
// hiçbir şey yapma — az önce loseAnimIndex'li çağrının yazdığı animasyonlu
// DOM aynen kalsın.
let lastRenderedHeartsSignature = null;
function renderHearts(loseAnimIndex = null) {
  const maxLives = currentDifficultyConfig().lives;
  const signature = `${maxLives}:${currentLives}`;
  if (loseAnimIndex === null && signature === lastRenderedHeartsSignature) return;
  lastRenderedHeartsSignature = signature;
  els.hearts.innerHTML = "";
  for (let i = 0; i < maxLives; i++) {
    const filled = i < currentLives;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "12");
    svg.setAttribute("height", "12");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.classList.add("heart");
    if (i === loseAnimIndex) svg.style.animation = "heartOut 420ms 150ms cubic-bezier(.3,.7,.4,1) both";
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", HEART_PATH);
    path.setAttribute("fill", filled ? "#ef4a5e" : "none");
    path.setAttribute("stroke", filled ? "#ef4a5e" : "rgba(255,255,255,.22)");
    path.setAttribute("stroke-width", "1.5");
    svg.appendChild(path);
    els.hearts.appendChild(svg);
  }
}

// Canlar GLOBAL ve TEK bir havuz (stats.lives) — zorluktan, seanstan bağımsız.
// G61 (PAYWALL.md): "Can 5, 30 dakikada 1 dolar" — GERÇEK zaman tabanlı dolum
// artık VAR (core/paywall.js:applyLivesRefill, referans noktası stats.
// livesLastRefillAt). Eski resetLives() (canı zorluğun MAX'ına doldururdu) hâlâ
// yok — dolum SADECE bu tek mekanizmadan, anlık/elle değil.

// currentLives'ı kalıcı depodan (stats.lives) okur ve kalpleri çizer. ÖNCE
// applyLivesRefill'i uygular (geçen GERÇEK süreye göre can dolmuş olabilir) —
// bu yüzden syncLives() artık canı DEĞİŞTİREBİLİR (eski yorumun aksine),
// SADECE artış yönünde (loseLife dışında hiçbir yerde azalma yok).
function syncLives() {
  if (typeof stats.lives !== "number") stats.lives = storage.TOTAL_LIVES;
  if (typeof stats.livesLastRefillAt !== "number") stats.livesLastRefillAt = Date.now();
  const refilled = paywall.applyLivesRefill(stats.lives, stats.livesLastRefillAt, Date.now(), { totalLives: storage.TOTAL_LIVES });
  if (refilled.lives !== stats.lives || refilled.lastRefillAt !== stats.livesLastRefillAt) {
    stats.lives = refilled.lives;
    stats.livesLastRefillAt = refilled.lastRefillAt;
    persistStats();
  }
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
  const prevLives = currentLives;
  currentLives = Math.max(0, currentLives - 1);
  stats.lives = currentLives;
  // G61 (PAYWALL.md): dolum sayacı (30dk) TAM doluluktan düşüldüğü ANDA
  // başlasın diye referans noktası burada güncellenir — bkz. paywall.
  // onLifeLost'un kendi notu (zaten dolu DEĞİLKEN kaybedilen bir can sayacı
  // SIFIRLAMAZ, kaldığı yerden devam eder).
  stats.livesLastRefillAt = paywall.onLifeLost(prevLives, currentLives, stats.livesLastRefillAt, Date.now(), storage.TOTAL_LIVES);
  // G92 (madde 12a): kaybedilen kalp (prevLives-1 index'i — az önce dolu→boş
  // geçen kalp) heartOut ile oynasın.
  renderHearts(prevLives - 1);
  if (currentLives <= 0) {
    if (!silent) setFeedback("Oyun bitti", `${reasonText} Canların tükendi.`, true, true);
    toast("💔 Oyun Bitti", "Canların tükendi.");
  } else if (!silent) {
    setFeedback("Can kaybettin", `${reasonText} Kalan can: ${currentLives}`, true, true);
  }
}

// G63 (PAYWALL.md Parça 2): startRound()/startBtn/goToNextRound'un ÜÇÜNÜN de
// (bkz. çağıranlar) girişinde AYNI "hâlâ 0 can mı" kontrolü vardı — kullanıcı
// paywall'ı kapatıp (reklam izlemeden/Pro almadan) tekrar denerse burası
// tetiklenir. Tek noktadan: paywall'ı YENİDEN aç (ilk oturumda değilsek),
// olmazsa ESKİ sade "lost" ekranına düş.
function blockIfLivesOut() {
  if (currentLives > 0) return false;
  if (!isUserPro() && !openPaywallReason("livesOut")) showSessionEnd("lost");
  return true;
}

// G61 (PAYWALL.md): "5 soru/oturum (sonra dur)" — currentLives<=0 (canlar
// bitti) ile AYNI ÇIKIŞ NOKTASI, farklı bir SEBEP. roundsInThisPlaySession
// (bkz. tanımındaki not) her YENİ soru KURULDUĞUNDA +1 olur — 5. soru zaten
// posedildikten SONRA true'ya döner, bir 6. soru HİÇ kurulmaz.
function freeSessionLimitReached() {
  return paywall.isFreeSessionLimitReached(roundsInThisPlaySession, isUserPro());
}
function finalizeIfGameOver() {
  const livesOut = currentLives <= 0;
  const sessionLimitOut = !livesOut && freeSessionLimitReached();
  if (!livesOut && !sessionLimitOut) return false;
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
  // G63 (PAYWALL.md Parça 2): tetikleme #1 (5. soru bitince) ve #2 (canlar
  // bitince) — ARTIK toast/sade session-end DEĞİL, paywall ekranı DOĞRUDAN
  // açılır. openPaywallReason() "ilk oturumda paywall yok" kuralını KENDİSİ
  // uyguluyor (false dönerse ilk oturumdayız demektir) — o durumda G61'in
  // ESKİ (Parça 1) davranışına, sade "lost"/"freeLimit" seans-sonu ekranına
  // DÜŞÜLÜR (oturum yine de bir şekilde kapanmalı, sadece Pro pitch'i
  // GÖRMEDEN). Pro'da (gerçek ya da simüle) loseLife() currentLives'ı hiç
  // 0'a düşürmez VE freeSessionLimitReached() isUserPro() içinden HER ZAMAN
  // false döner (bkz. tanımları), bu blok o yüzden Pro'da pratikte hiç
  // tetiklenmez, ama yine de isUserPro() üzerinden doğru cevaba bakıyor
  // (savunmacı, tek kaynak).
  if (!isUserPro()) {
    const reasonKey = livesOut ? "livesOut" : "sessionLimit";
    if (!openPaywallReason(reasonKey)) showSessionEnd(livesOut ? "lost" : "freeLimit");
  }
  return true;
}

// zoneScores() DÜZ bir dizi döndürür (renderZonePanel() bunu {scores,enough}'a
// sarıp ayrıca DOM'a da yazıyor — burada o yan etkiyi istemediğimiz için aynı
// "n>=2 yeterli veri" filtresi lokal olarak tekrarlanıyor, renderDailyTip()'teki
// desenin aynısı). Seans Sonu ekranındaki "güçlü/zayıf bölge" cümlesini üretir.
function zoneInsightSentence(enough) {
  if (enough.length < 2) return "";
  const sorted = enough.slice().sort((a, b) => a.pct - b.pct);
  const weak = sorted[0], strong = sorted[sorted.length - 1];
  return `${strong.label} bölgesinde iyisin (%${strong.pct}), ${weak.label.toLowerCase()} bölgesinde zorlanıyorsun (%${weak.pct}).`;
}

// kind: "lost" (canlar bitti) | "normal" (10 Soruluk Bölüm tamamlandı) |
// "freeLimit" (G61/PAYWALL.md: ücretsiz 5 soru/oturum sınırına ulaşıldı).
// Tasarımdaki (Dizayn/prototype.html #s-result) alanların TAMAMI gerçek oyun
// state'inden okunur — karşılığı olmayanlar (bkz. rapor: "önceki seansa göre +N
// puan" ve "odak setini aç" önerisi) BİLEREK atlandı, uydurulmadı.
// G82: Tasarim-2026-08/Prototip.dc.html'in "SEANS SONU" bloğu (SS objesi) +
// Seans Özeti.dc.html'in halka/rozet kartı BİREBİR — R=76 sabiti styles.css'teki
// @keyframes ringDraw'ın "from" değeriyle (478≈2*PI*76) EŞLEŞMELİ. G92
// (madde 12): animasyon ismi ringDraw'a (Prototip.dc.html'in KENDİ ismi)
// yeniden adlandırıldı, "from" DEĞERİ (478) BİLEREK 490'a ÇEVRİLMEDİ — bu
// app'in GERÇEK R=76 halkasının çevresi, tasarımın kendi (farklı R'li)
// halkasının 490'ı DEĞİL (bkz. styles.css'teki AYNI not).
function buildResultRing(pct, scoreTop, pctLabel, color) {
  const R = 76, C = 2 * Math.PI * R;
  const off = C * (1 - Math.max(0, Math.min(1, pct)));
  // Tasarımın KENDİ tekniği (Seans Özeti.dc.html:ring()) — animasyonun SADECE
  // "from" karesi var (styles.css @keyframes ringDraw, C'ye eşit), "to"
  // hedefi buradaki inline stroke-dashoffset'in KENDİSİ (CSS animation'ın
  // fill-mode:both'u iki ucu böyle birleştiriyor, ayrı bir "to" keyframe'i
  // GEREKMİYOR).
  return `<svg width="162" height="162" viewBox="0 0 162 162" style="display:block;transform:rotate(-90deg)">
    <circle cx="81" cy="81" r="${R}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="11"></circle>
    <circle cx="81" cy="81" r="${R}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round"
      stroke-dasharray="${C.toFixed(2)}" style="stroke-dashoffset:${off.toFixed(2)};filter:drop-shadow(0 0 8px ${color});animation:ringDraw 800ms 150ms cubic-bezier(.2,.8,.2,1) both"></circle>
  </svg>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
    <div class="num" style="font-size:36px;font-weight:800;letter-spacing:-1.4px;color:var(--tx);line-height:1" id="resScore">${scoreTop}</div>
    <div style="font-size:12.5px;font-weight:600;color:var(--tx-3);margin-top:4px" id="resScoreLabel">doğru</div>
    <div class="num" style="font-size:11px;font-weight:700;letter-spacing:.8px;color:${color};margin-top:5px" id="resPct">${pctLabel}</div>
  </div>`;
}

// Temel XP/Combo bonusu/[Bölüm bonusu]/Toplam — G81'in xpBaseFor()'uyla
// session.xpBaseSum'dan (her doğru cevapta gerçek zamanlı biriktirilir, bkz.
// submit fonksiyonları) türetiliyor. challengeMult SADECE "normal" kind'de
// >1 olabilir çünkü showSessionEnd("normal") TEK bir yerden (finishChallenge)
// çağrılıyor ve o SADECE challenge.active iken tetiklenebiliyor (grep ile
// doğrulandı) — yani "normal" HER ZAMAN tamamlanmış bir 10 Soruluk Bölüm'dür,
// çarpanı YENİDEN sormaya/saklamaya gerek yok. "lost"/"freeLimit"te bölüm
// yarıda kesilmiş olsa bile (nadir) tasarımın KENDİSİ bu iki durumda bonus
// satırı hiç göstermiyor (Prototip'in SS.lives/SS.free'si bonus:false) —
// AYNI basitleştirme burada da uygulanıyor, DÜRÜSTLÜK NOTU: bu durumda
// (kesintiye uğramış bölüm) "Combo bonusu" satırı o +%50'yi de İÇİNDE
// taşıyabilir, Toplam GERÇEK kalır (session.xp, hiç dokunulmadı).
function buildXpRows(kind, totalXp, baseSum) {
  const base = Math.round(baseSum);
  const challengeMult = kind === "normal" ? CHALLENGE_XP_MULT : 1;
  const subtotal = challengeMult > 1 ? totalXp / challengeMult : totalXp;
  const comboBonus = Math.max(0, Math.round(subtotal - base));
  const rows = [
    { label: "Temel XP", val: String(base) },
    { label: "Combo bonusu", val: `+${comboBonus}` }
  ];
  if (challengeMult > 1) {
    rows.push({ label: `Bölüm bonusu %${Math.round((challengeMult - 1) * 100)}`, val: `+${Math.round(totalXp - subtotal)}` });
  }
  rows.push({ label: "Toplam", val: `${totalXp} XP`, total: true });
  return rows;
}

let resWaitTimer = null;
function stopResWaitTicker() {
  if (resWaitTimer) { clearInterval(resWaitTimer); resWaitTimer = null; }
}
// Can geri sayımı — SADECE görüntü zamanlayıcısı. paywall.applyLivesRefill/
// LIVES_REFILL_INTERVAL_MS'e (dolum mekaniğinin KENDİSİ) TEK SATIR dokunulmuyor,
// bu fonksiyon SADECE stats.livesLastRefillAt'tan kalan GERÇEK süreyi her
// saniye yeniden okuyup ekrana yazıyor. Süre dolunca syncLives() (mevcut,
// applyLivesRefill'i ZATEN çağıran fonksiyon) BİR KEZ tetiklenip satır kapanır.
function startResWaitTicker() {
  stopResWaitTicker();
  const tick = () => {
    const msLeft = Math.max(0, (stats.livesLastRefillAt || Date.now()) + paywall.LIVES_REFILL_INTERVAL_MS - Date.now());
    if (msLeft <= 0) {
      syncLives();
      stopResWaitTicker();
      if (currentLives > 0 && els.resWaitRow) els.resWaitRow.classList.add("hidden");
      return;
    }
    const totalSec = Math.ceil(msLeft / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    if (els.resWaitCountdown) els.resWaitCountdown.textContent = `${mm}:${ss}`;
  };
  tick();
  resWaitTimer = setInterval(tick, 1000);
}

// showSessionEnd'in çağrıldığı kind — resCta'nın tıklama davranışı duruma göre
// FARKLI (Yeni Seans/Reklam İzle/Pro'ya geç), bkz. resCta'nın kendi dinleyicisi.
let sessionEndKind = null;

function showSessionEnd(kind) {
  sessionEndVisible = true;
  sessionEndKind = kind;
  const lost = kind === "lost";
  const freeLimit = kind === "freeLimit";
  // "lost"/"freeLimit" İKİSİ de bir 10-soruluk bölümün TAMAMLANMASI değil, bu
  // OTURUMDA gerçekten ne olduysa (session.correct+wrong) onu gösterir —
  // SADECE "normal" (10 Soruluk Bölüm bitti) challenge.total/correct'e bakar.
  const endedEarly = lost || freeLimit;
  const xp = progress.xpProgress(diffState().xp);
  const nowLevel = xp.level;
  // XP/seviye ücretsizde de KISITLANMAYAN (task'ın kendi listesi) — "freeLimit"te
  // de gerçekten seviye atlandıysa gösterilir, SADECE "lost" (canlar bitti,
  // olumsuz kapanış) bunu bastırır — ÖNCEKİ davranış.
  const leveledUp = !lost && sessionStartLevel !== null && nowLevel > sessionStartLevel;

  // Tasarım (Prototip.dc.html SS objesi) — accent/pill/ikon/buton renkleri
  // birebir: yeşil (done) / kırmızı (lives) / amber (free).
  const accent = lost ? "var(--rd)" : freeLimit ? "var(--am)" : "var(--gr)";
  const pillBg = lost ? "rgba(255,77,109,.1)" : freeLimit ? "rgba(240,180,66,.1)" : "rgba(43,217,168,.1)";
  const pillBorder = lost ? "rgba(255,77,109,.4)" : freeLimit ? "rgba(240,180,66,.4)" : "rgba(43,217,168,.4)";
  const pillIconPath = lost
    ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="' + accent + '"><path d="M12 21C7 16.5 3 13 3 8.8 3 5.9 5.2 4 7.7 4 9.4 4 11 4.9 12 6.3 13 4.9 14.6 4 16.3 4 18.8 4 21 5.9 21 8.8 21 13 17 16.5 12 21Z"></path></svg>'
    : freeLimit
    ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="' + accent + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11h14v9H5zM8 11V7a4 4 0 0 1 8 0v4"></path></svg>'
    : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="' + accent + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"></path></svg>';
  if (els.resPill) { els.resPill.style.background = pillBg; els.resPill.style.border = `1px solid ${pillBorder}`; }
  if (els.resPillIcon) els.resPillIcon.innerHTML = pillIconPath;
  els.resKicker.textContent = lost ? "CANLARIN BİTTİ" : freeLimit ? "ÜCRETSİZ OTURUM BİTTİ" : "SEANS TAMAMLANDI";
  els.resKicker.style.color = accent;

  const total = endedEarly ? (session.correct + session.wrong) : challenge.total;
  const correctCount = endedEarly ? session.correct : challenge.correct;
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  els.resRing.innerHTML = buildResultRing(total > 0 ? correctCount / total : 0, `${correctCount}/${total}`, `%${pct} İSABET`, accent);

  const zoneEnough = zoneScores().filter(s => s.n >= 2);
  const insight = zoneInsightSentence(zoneEnough);
  const weakest = zoneEnough.length ? zoneEnough.slice().sort((a, b) => a.pct - b.pct)[0] : null;

  const activeModeCatalogEntry = MODE_CATALOG.find(e => e.id === mode.getMeta().id);
  // Tasarımın statusSub'ı (pill'in HEMEN altındaki kısa cümle) — gerçek
  // sayılarla (storage.TOTAL_LIVES/paywall.FREE_SESSION_QUESTION_LIMIT),
  // Prototip'in KENDİ cümle kalıbına birebir yakın.
  els.resHead.textContent = lost
    ? `${storage.TOTAL_LIVES} canı da kullandın. Seans ${total}. soruda kapandı.`
    : freeLimit
    ? `Günlük ${paywall.FREE_SESSION_QUESTION_LIMIT} ücretsiz sorunu tamamladın.`
    : `${total} soruyu can kaybetmeden bitirdin.`;

  // Tasarımdaki "Son seansına göre +N puan" karşılaştırması VERİ KAYNAĞI YOK —
  // önceki seansın skor anlık görüntüsü hiçbir yerde tutulmuyor. Uydurmak yerine
  // bu satır (resLead) SADECE zayıf-bölge içgörüsü varsa dolduruluyor, aksi
  // halde boş/gizli — tasarımın TEK-satırlık statusSub'ına (resHead) sadık
  // kalmak için "N dakikada can dolacak" cümlesi BURADAN kaldırıldı, o bilgi
  // artık kendi CANLI satırında (bkz. #resWaitRow/startResWaitTicker).
  els.resLead.textContent = "";
  els.resLead.classList.add("hidden");

  if (els.resBonusRow) els.resBonusRow.classList.toggle("hidden", kind !== "normal");

  els.resLevelUp.classList.toggle("hidden", !leveledUp);
  if (leveledUp) els.resLevelUpBadge.textContent = nowLevel;

  if (els.resXpRows) {
    els.resXpRows.innerHTML = buildXpRows(kind, session.xp, session.xpBaseSum).map(r =>
      `<div class="row${r.total ? " total" : ""}"><span class="lbl">${r.label}</span><span class="val">${r.val}</span></div>`
    ).join("");
  }

  // Mod ilerleme çubuğu — G80'de kurulan perMode/perDiff ayrımının AYNISI:
  // Seans Sonu'nun "hangi moddasın" bilgisi diffState() (zorluk-bazlı) DEĞİL
  // progress.modeLevel/modeXp (mod-bazlı) okumalı, tasarımın "Frekans Bulma ·
  // Sv 4" satırıyla BİREBİR.
  const modeId = mode.getMeta().id;
  const modeLevel = progress.modeLevel(stats, modeId);
  const modeXpProg = progress.xpProgress(progress.modeXp(stats, modeId));
  els.resLvl.textContent = `${activeModeCatalogEntry ? activeModeCatalogEntry.ad : modeId} · Sv ${modeLevel}`;
  els.resXpNum.textContent = `${modeXpProg.current} / ${modeXpProg.required} XP`;
  els.resXpBar.style.width = `${Math.max(0, Math.min(100, (modeXpProg.current / modeXpProg.required) * 100))}%`;

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

  // Rozet kartı — Seans Özeti.dc.html'de var, Prototip'in canlı özet ekranında
  // yok (çeliştikleri yer, task'ın kendi maddesinde AÇIKÇA istendi) — bu
  // OTURUMDA gerçekten açılan bir başarım varsa (session.newBadges, bkz.
  // notifyNewAchievements) EN SON açılanı gösterir; yoksa kart HİÇ görünmez
  // (tasarımdaki sabit "Kusursuz Kulak" örneği UYDURULMADI/kopyalanmadı —
  // mevcut progress.ACHIEVEMENTS'ta böyle bir başarım YOK).
  if (els.resBadge) {
    const badge = session.newBadges.length ? session.newBadges[session.newBadges.length - 1] : null;
    els.resBadge.classList.toggle("hidden", !badge);
    if (badge) {
      if (els.resBadgeIcon) els.resBadgeIcon.textContent = badge.icon;
      if (els.resBadgeName) els.resBadgeName.textContent = badge.title;
      if (els.resBadgeDesc) els.resBadgeDesc.textContent = badge.desc;
    }
  }

  // Butonlar — duruma göre birincil CTA (bkz. resCta'nın kendi dinleyicisi,
  // sessionEndKind'i okuyor) + can geri sayımı SADECE "lost"ta.
  if (els.resCta) {
    els.resCta.textContent = lost ? "Reklam izle, +1 can" : freeLimit ? "Pro ile sınırsız devam et" : "Yeni Seans";
    els.resCta.style.background = freeLimit ? "var(--gold-grad)" : "var(--green-grad)";
    els.resCta.style.color = freeLimit ? "#1a1305" : "#06230e";
  }
  if (els.resWaitRow) {
    els.resWaitRow.classList.toggle("hidden", !lost);
    if (lost) startResWaitTicker(); else stopResWaitTicker();
  }

  goScreen("result");
}

function hideSessionEnd() {
  sessionEndVisible = false;
  stopResWaitTicker();
}

// ═══════════════════════════════════════════════════════════════════════════
// Geri bildirim / genel UI yardımcıları
// ═══════════════════════════════════════════════════════════════════════════

// G81: Tasarim-2026-08/Geri Bildirim.dc.html'in ikon SVG'leri — dosyadaki
// renderVals()'ın check/cross path'leriyle BİREBİR aynı (path verisi
// kopyalandı, sadece boyut/stroke rengi burada CSS'ten geliyor).
const FB_ICON_CHECK = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06230e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"></path></svg>`;
const FB_ICON_CROSS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2a0d09" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>`;

// title/detail: setFeedback()'İN ESKİ imzası TEK SATIR değişmedi (10 mod × ~20
// çağrı sitesi hâlâ AYNI 4 parametreyi geçiyor) — SADECE #feedbackBox'ın
// İÇİNDEKİ yapı G81'de yeniden kuruldu (bkz. index.html). detail'in sonundaki
// " (+N XP)" (9 modun getFeedbackData'sının ORTAK deseni, bkz. o dosyaların
// dosya başı notu) burada KIRPILIYOR — XP artık ayrı #fbXpBlock'ta gösteriliyor,
// mode dosyalarına DOKUNULMADI (metin aynı üretiliyor, sadece EKRANDA tekrar
// etmesin diye görüntüleme katmanında bir kez kesiliyor).
// Her çağrı XP/combo/kulak bloklarını SIFIRLAR — bunlar SADECE showXpBreakdown()/
// showEarButtons() ile (setFeedback'TEN SONRA, ayrı bir satırda) açılır; bu
// yüzden "yanlış" dalları hiçbir şey çağırmadan otomatik gizli kalır.
function setFeedback(title, detail, showResult = false, bad = false) {
  els.fbTitle.textContent = title;
  els.feedbackDetail.textContent = (detail || "").replace(/\s*\(\+\d+ XP\)$/, "");
  els.fbIcon.innerHTML = bad ? FB_ICON_CROSS : FB_ICON_CHECK;
  els.feedbackBox.classList.toggle("show-result", !!showResult);
  els.feedbackBox.classList.toggle("bad", !!bad);
  // G85: karartma katmanı — #feedbackBox'ın AYNI show-result durumuyla
  // senkron (bkz. index.html #feedbackOverlay notu).
  if (els.feedbackOverlay) els.feedbackOverlay.classList.toggle("open", !!showResult);
  if (els.fbSubtitle) { els.fbSubtitle.textContent = ""; els.fbSubtitle.classList.add("hidden"); }
  if (els.fbXpBlock) els.fbXpBlock.classList.add("hidden");
  if (els.fbComboRow) els.fbComboRow.classList.add("hidden");
  if (els.fbEarLeft) els.fbEarLeft.classList.add("hidden");
  if (els.fbEarRight) els.fbEarRight.classList.add("hidden");
  stopFeedbackAdvanceBar();
  // G86 DÜZELTMESİ: G85'ten ÖNCE #feedbackBox .game-scroll akışının İÇİNDEYDİ
  // — "en alta kaydır" O ZAMAN kartı görünür kılmak içindi. G85 onu
  // position:fixed'e taşıdı (artık scroll'dan BAĞIMSIZ, HER ZAMAN görünür) —
  // bu satır ARTIK gereksiz VE ZARARLI hale gelmişti: .game-scroll'u en alta
  // kaydırmak spektrumdaki cevap işaretlerini (üstte) EKRAN DIŞINA İTİYORDU
  // (task'ın kendi raporu — "geri bildirim paneli cevap işaretlerini
  // örtüyor", GERÇEK kök sebep BUYDU). SÖKÜLDÜ.
}

// G81: #fbSubtitle — SADECE yapısal (panel: {zone,guessHz,...}) veri taşıyan
// modlarda anlamlı bir kısa özet üretilebiliyor (bugün SADECE Frekans Bulma,
// bkz. showFrequencyFeedback). Diğer 9 modun getFeedbackData'sı TEK bir
// detail metni döndürüyor (ayrı bir "özet" alanı YOK) — UYDURMAMAK için o
// modlarda bu satır hiç çağrılmıyor, alt başlık boş/gizli kalıyor.
function setFeedbackSubtitle(text) {
  if (!els.fbSubtitle || !text) return;
  els.fbSubtitle.textContent = text;
  els.fbSubtitle.classList.remove("hidden");
}

// G81: "kulak" omuz butonları — kullanıcının kendi isteği (tasarımda YOK).
// Sol omuz: yanlışta "Senin cevabın" (kırmızı, data-preview="mine" +
// data-guess-hz), doğruda "Temiz" (nötr, data-preview="clean"). Sağ omuz HER
// ZAMAN "Doğru cevap" (yeşil, data-preview="correct"). Tıklama app.js'in
// #feedbackBox click delegasyonunda (bkz. aşağı) — preview semantiği
// #freqInfo'nun ESKİ .cmp'siyle BİREBİR aynı (buildQuestionChain). SADECE
// Frekans Bulma'nın "frequency" sorularında çağrılır (Kesim Noktası/proplus/
// diğer sekiz mod bu butonları hiç görmez).
// G85 DÜZELTMESİ: doğru cevapta sol omuzun "Temiz"e (preview="clean", dry/
// işlenmemiş referans) dönme davranışı KALDIRILDI — böyle bir ürün kararı
// hiç verilmedi (task'ın kendi uyarısı). Sol omuz artık HER ZAMAN "Senin
// cevabın" (preview="mine", guessHz), doğru/yanlış fark etmeksizin.
function showFrequencyEars(ok, guessHz) {
  if (!els.fbEarLeft || !els.fbEarRight) return;
  els.fbEarLeft.classList.remove("hidden");
  els.fbEarRight.classList.remove("hidden");
  els.fbEarLeft.classList.remove("neutral");
  els.fbEarLeft.textContent = "Senin cevabın";
  els.fbEarLeft.dataset.preview = "mine";
  els.fbEarLeft.dataset.guessHz = String(guessHz);
  els.fbEarRight.dataset.preview = "correct";
  els.fbEarLeft.classList.remove("on");
  els.fbEarRight.classList.remove("on");
}

// Gerçek XP kırılımı — CLAUDE.md/task kuralı: "uydurma sayı yazma". Tüm
// çarpanlar calculateXP()'ye GEÇİLEN AYNI context'ten (bkz. her submit
// fonksiyonunun kendi calculateXP çağrısı) veya mode'un KENDİ DIFFICULTY/
// xpBase'inden okunuyor — burada YENİDEN icat edilen hiçbir sayı yok.
// extraFactor: {label, value} — SADECE Tonal Denge'nin proximityBoost'u gibi
// calculateXP içinde combo/boss/hız/ipucu/bölüm'ün DIŞINDA GERÇEKTEN var olan
// bir 6. çarpanı taşıyan modlar için (bkz. submitTonalDengeGuess). Diğer 9
// modda undefined — hiçbir şey eklemez.
function xpBaseFor(q, level) {
  const diff = mode.DIFFICULTY[level] || mode.DIFFICULTY.medium;
  return typeof mode.xpBase === "function" ? mode.xpBase(q, level) : diff.xp;
}
function fmtFactor(v) {
  return String(Math.round(v * 100) / 100);
}
function showXpBreakdown(q, level, gained, extraFactor) {
  if (!els.fbXpBlock || !gained) return;
  els.fbXpValue.textContent = `+${gained}`;
  els.fbXpBlock.classList.remove("hidden");

  const base = xpBaseFor(q, level);
  const comboBoost = Math.min(2.4, 1 + (stats.combo || 0) * 0.12);
  const hintPenalty = q.hintUsed ? 0.5 : 1;
  const bossBoost = q.boss ? 1.65 : 1;
  const timeBoost = roundFlow.timeLeft > roundFlow.roundDuration * 0.55 ? 1.2 : 1;
  const challengeBoost = xpMult();

  const parts = [];
  if (comboBoost > 1.001) parts.push(`<b>${fmtFactor(comboBoost)} combo</b>`);
  if (bossBoost > 1) parts.push(`<b>${fmtFactor(bossBoost)} boss</b>`);
  if (timeBoost > 1) parts.push(`<b>${fmtFactor(timeBoost)} hız</b>`);
  if (hintPenalty < 1) parts.push(`<b>${fmtFactor(hintPenalty)} ipucu</b>`);
  if (challengeBoost > 1) parts.push(`<b>${fmtFactor(challengeBoost)} bölüm</b>`);
  if (extraFactor) parts.push(`<b>${fmtFactor(extraFactor.value)} ${extraFactor.label}</b>`);

  if (!parts.length) { els.fbComboRow.classList.add("hidden"); return; }
  els.fbComboText.innerHTML = `${Math.round(base)} XP ${parts.map(p => `× ${p}`).join(" ")}`;
  els.fbComboRow.classList.remove("hidden");
}

// G81: otomatik-geçiş çubuğu — scheduleNext'e VERİLEN gerçek süreyle (4000/6000/
// QUICK_ADVANCE_MS) senkron başlar, karşılaştırma önizlemesi (cmp preview)
// duraklattığında JS ile AYNI anda paused/resumed (bkz. #feedbackBox click
// delegasyonu ve cancelCmpPreviewPause). Süreler KODDAN — burada icat edilmiş
// yeni bir zamanlama sistemi YOK, SADECE var olan setTimeout süresiyle aynı
// CSS animation-duration.
function startFeedbackAdvanceBar(ms) {
  if (!els.fbAdvanceBar || !ms) return;
  els.fbAdvanceBar.classList.remove("run", "paused");
  void els.fbAdvanceBar.offsetWidth; // animasyonu yeniden BAŞLATMAK için zorla reflow
  els.fbAdvanceBar.style.animationDuration = `${ms}ms`;
  els.fbAdvanceBar.classList.add("run");
}
function pauseFeedbackAdvanceBar() {
  if (els.fbAdvanceBar) els.fbAdvanceBar.classList.add("paused");
}
function resumeFeedbackAdvanceBar() {
  if (els.fbAdvanceBar) els.fbAdvanceBar.classList.remove("paused");
}
function stopFeedbackAdvanceBar() {
  if (!els.fbAdvanceBar) return;
  els.fbAdvanceBar.classList.remove("run", "paused");
}

// F1 (G81'de daraltıldı): Pro Plus HÂLÂ #freqInfo + #feedbackBox'ı AYNI ANDA
// kullanıyor (#feedbackBox showResult=false, sade), showProPlusInfoPanel'in
// kendi içeriğinde olmayan bir bilgiyi (kalite başlığı/kalan can) panelin
// İÇİNE not olarak ekler — bkz. submitProPlusGuess. Frekans Bulma'nın tek-bant
// "frequency" sorusu G81'de #feedbackBox'a taşındığı için (bkz. showFrequencyEars/
// setFeedbackSubtitle) ARTIK bu fonksiyonu kullanmıyor, mode dosyalarına
// dokunmadan aynı ihtiyacı doğrudan #feedbackBox'ın kendi alanlarından
// karşılıyor.
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

// G79: tasarım #startBtn'i büyük yuvarlak İKON butonu istiyor ("yazılı buton
// değil") — 3 durumun METNİ (Oyunu Başlat/Durdur/Tekrar Çal) kaldırılıp SADECE
// glyph bırakıldı, aria-label ile bilgi KAYBOLMADI (ekran okuyucular hâlâ
// "Oyunu Başlat"/"Durdur"/"Tekrar Çal" duyar). Fonksiyonun KENDİSİ/çağrıldığı
// yerler/koşulları TEK SATIR değişmedi.
function updateStartBtnLabel() {
  if (!els.startBtn) return;
  // G86: Motor 2'de büyük yuvarlak play/durdur kontrolü control satırında YOK
  // (bkz. styles.css .controls-m2 notu) — ama activeQuestion HENÜZ yokken
  // (idle/"Oyunu Başlat" durumu) bu buton turu başlatan TEK tetikleyici,
  // gizlenirse mod hiç oynanamaz hale gelirdi (canlı testte yakalandı).
  // Bu yüzden SADECE round gerçekten aktifken gizleniyor.
  els.startBtn.classList.toggle("hidden", !!(mode.THREE_WAY && activeQuestion));
  if (!activeQuestion || currentLives <= 0) {
    els.startBtn.textContent = "▶";
    els.startBtn.setAttribute("aria-label", "Oyunu Başlat");
    // G94: idle'a dönerken (mod değişimi/tur sonu) kalıntı kırmızı çerçeve
    // kalmasın diye güvenlik sıfırlaması — GERÇEK aç/kapa artık showAudioError/
    // hideAudioError'da (bkz. o fonksiyonların notu), burada SADECE reset.
    els.startBtn.classList.remove("warning");
    return;
  }
  // G94: "warning" (kırmızı çerçeve) BURADAN kaldırıldı — round aktifken
  // koşulsuz eklemek TÜM modlarda "her tur kırmızı" bug'ına sebep oluyordu
  // (G93'te dB Seviyesi'nde bulunup SADECE o modda `.neutral-play` ile
  // ezilerek "düzeltilmişti", kullanıcı bu turda kök sebebin TÜM modlarda
  // giderilmesini istedi). Artık SADECE showAudioError()/hideAudioError()
  // (playQuestion()'ın GERÇEK sampleLoadFailed sonucuna göre) bu class'ı
  // yönetiyor.
  // G91 (madde 4): "🔄" (Tekrar Çal) İKONU KALDIRILDI — task'ın kendi kararı:
  // duraklatılmışken PLAY (▶), çalarken PAUSE (⏸) görünmeli, tasarımın
  // playIcon mantığıyla (Prototip.dc.html satır 2615-2621 — SADECE playing
  // boolean'ına göre play/pause SVG'si, ayrı bir "replay" durumu YOK) BİREBİR.
  // aria-label GERÇEK davranışı anlatmaya devam ediyor ("Tekrar Çal" yerine
  // "Oynat", çünkü tekrar basınca artık GERÇEKTEN play'e dönüyor).
  els.startBtn.textContent = autoStopped ? "▶" : "⏸";
  els.startBtn.setAttribute("aria-label", autoStopped ? "Oynat" : "Durdur");
  // G92 (madde 12 TEMEL KURAL): sessizlik alanında İZİN VERİLEN tek hareket
  // süre çubuğu + "çalan kartın nefes alması" — Motor 1'in büyük yuvarlak
  // butonu ÖNCEDEN hiç nefes almıyordu (Motor 2'nin .ans-m2-playing'i
  // ZATEN vardı, bkz. styles.css breathe). autoStopped=false → GERÇEKTEN
  // çalıyor (⏸ gösteriyor).
  els.startBtn.classList.toggle("breathing", !autoStopped);
}

function updateHintChipLabel() {
  if (els.hintStatCount) els.hintStatCount.textContent = stats.hintsRemaining;
  if (!els.hintBtn) return;
  const used = !!(activeQuestion && activeQuestion.hintUsed);
  // G86: Motor 2'de buton metni SABİT "İpucu" (Prototip.dc.html satır 776) —
  // "kullanıldı" bilgisi ayrı bir satırda (#gameM2HintUsedRow, aşağı).
  const isM2 = !!(mode && mode.THREE_WAY);
  // G78: hedef #hintBtn (artık kalıcı bir ampul SVG'si taşıyor, bkz. index.html)
  // DEĞİL #hintBtnLabel (nested span) — levelChip'in G77'deki AYNI retarget
  // deseni, mantık/koşul TEK SATIR değişmedi.
  const label = isM2 ? "İpucu"
    : used && activeQuestion.hintText
    ? activeQuestion.hintText
    : `İpucu Ver (${stats.hintsRemaining})`;
  if (els.hintBtnLabel) els.hintBtnLabel.textContent = label;
  else els.hintBtn.textContent = label;
  els.hintBtn.disabled = stats.hintsRemaining <= 0 || !activeQuestion || !roundActive || used;
  if (els.gameM2HintUsedRow) els.gameM2HintUsedRow.classList.toggle("hidden", !(isM2 && used));
}

function setAnalyzerPhase(phase) {
  if (els.analyzer) els.analyzer.dataset.phase = phase;
}

function formatGainDb(gain) {
  const rounded = Math.round(gain * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded} dB`;
}

// A/B tek buton durumunu (A|B göstergesi + spektrum başlığı) currentPlayMode'a göre günceller.
// G30: Motor 2 modları (Kompresör, G35'ten beri Reverb) aktifken bu buton
// "A/B" (temiz/işlenmiş İKİLİSİ) DEĞİL, "A/B/C" (üç FARKLI varyant) gösteriyor
// — bkz. toggleAB'nin three-way dalı, spec'in "mevcut A/B altyapısını 3'e
// genişlet" isteğinin BİREBİR karşılığı. `.three-way` class'ı CSS'te 3. (C)
// pill'i görünür yapıyor (bkz. styles.css).
// G31 (bug 1 düzeltmesi): isThreeWay ARTIK activeQuestion'a değil, seçili MOD
// MODÜLÜNE (mode.MODE_ID, bkz. isThreeWayModule) bakıyor — activeQuestion
// "Oyunu Başlat"a kadar null (bkz. renderModeGrid'in mod-değiştirme bloğu), o
// pencerede eskiden HER ZAMAN A/B (yanlış) gösteriyordu. `mode` değişkeni kart
// tıklamasında ANINDA güncellendiği için artık ilk render dahil HER ZAMAN doğru.
function updateAbToggleUI() {
  if (!els.abToggle) return;
  const isThreeWay = isThreeWayModule(mode);
  els.abToggle.classList.toggle("three-way", isThreeWay);
  if (!abLoopTimer && els.abTitle) els.abTitle.textContent = isThreeWay ? "A/B/C Test" : "A/B Test";
  if (isThreeWay) {
    els.abToggle.dataset.ab = threeWayPlayLetter;
    if (els.analyzerLabel) els.analyzerLabel.textContent = `SPEKTRUM · ${threeWayPlayLetter} DİNLENİYOR`;
    // G41: o an çalan büyük kartı vurgular (bkz. core/three-way-cards.js) — bu
    // fonksiyon HER threeWayPlayLetter değişiminde çağrıldığı için (round başlangıcı +
    // döngü + manuel A/B/C) ayrı bir çağrı noktası eklemeye GEREK yok.
    if (mode.updateAnswerPlayState) mode.updateAnswerPlayState(els.answers, threeWayPlayLetter);
    return;
  }
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

// G83: Tasarim-2026-08/Prototip.dc.html:spectrum()'ün alt kenar satırı — sol/
// sağ uçlar mode.FA_MIN/FA_MAX'tan GERÇEK okunuyor (tasarımın literal "20 Hz"/
// "20 kHz"si DEĞİL, bizim soru havuzumuzun GERÇEK sınırı 80Hz-17kHz, uydurulmadı).
// SHOW_SPECTRUM===false modlarda satırın KENDİSİ CSS ile gizli (bkz. enterMode/
// styles.css .analyzer-no-foot) — bu fonksiyon o durumda erken çıkar, boş yazmaz.
// G86 DÜZELTMESİ: G85 tasarımın LİTERAL "20 Hz"/"20 kHz"sine dönmüştü — bu
// turun kendi talimatı BİLEREK tasarımdan AYRILDIĞINI belirtiyor: gerçek
// mod/odak aralığı yazılsın (task: "PROTOTİPTEN BİLEREK AYRILIYORUZ").
// currentFocusRange() aktif bir odak seçiliyse [a,b] döner (ör. "Bas"),
// yoksa mod.FA_MIN/FA_MAX'a düşülür — G83'ün kararının AYNISI, SADECE
// artık odak aralığını da hesaba katıyor (o zaman yoktu/kullanılmamıştı).
function updateAnalyzerFoot() {
  if (!els.analyzerFootMin || !els.analyzerFootMax) return;
  if (mode.SHOW_SPECTRUM === false) return;
  const range = currentFocusRange();
  const lo = range ? range[0] : mode.FA_MIN;
  const hi = range ? range[1] : mode.FA_MAX;
  els.analyzerFootMin.textContent = formatHz(lo);
  els.analyzerFootMax.textContent = formatHz(hi);
  if (els.analyzerFootCaption) els.analyzerFootCaption.textContent = "SPEKTRUM ANALİZÖRÜ";
}

// G37: mod kartına tıklanınca GERÇEKTEN oyuna girme adımı — önceden renderModeGrid'in
// click handler'ı İÇİNE gömülüydü, kulaklık uyarı sheet'i (bkz. openHeadphoneSheet)
// "Kulaklığım takılı, başla" onayından SONRA da AYNI adımı çalıştırması gerektiği için
// (prototipin hpConfirm()'ünün AYNI deseni) dışarı çıkarıldı — davranış DEĞİŞMEDİ,
// sadece iki çağıran (doğrudan tıklama / sheet onayı) PAYLAŞIYOR.
function enterMode(entry, realMode) {
  // #gameTitle statik HTML'de "Frekans Bulma" — tek mod varken hiç güncellenmesi
  // gerekmiyordu, artık her kart tıklamasında (moda özgü "eski başlık asılı kalır"
  // riskini önden kapatmak için mod DEĞİŞMESE bile) doğru isimle senkronlanıyor.
  if (els.gameTitle) els.gameTitle.textContent = entry.ad;
  if (mode !== realMode) {
    // Farklı bir moda geçiliyor — önceki modun round'u/sesi/ekran metni yeni moda
    // SIZMASIN diye temiz bir sayfayla başlanır (aksi halde "Oyunu Başlat"a
    // basılana kadar eski modun BAŞLIĞI/şıkları ekranda asılı kalırdı — bu, tek
    // mod varken hiç mümkün olmayan bir geçişti).
    audioEngine.stopAudio();
    roundFlow.stopAll();
    activeQuestion = null;
    roundActive = false;
    autoStopped = true;
    mode = realMode;
    populateSourceSelect(); // yeni modun kaynak uyumluluğuna göre kaynak listesini süz
    // G79 DÜZELTMESİ (canlı testte bulundu, ÖNCEDEN VARDI): populateFocusSelect()
    // SADECE modül yüklenirken (satır ~440) BİR KEZ çağrılıyordu — o an varsayılan
    // mod frekans-bulma olduğu için (bkz. dosya başı `let mode = getMode(...)`)
    // odak çipi İLK açılışta doğru görünüyordu ama BAŞKA hiçbir moda geçince BİR
    // DAHA HİÇ gizlenmiyordu (odak SADECE frekans-bulma'da olmalı) — populateSourceSelect/
    // syncAnswerFormatVisibility/syncCakismaVisibility'nin AYNI "mod değişince
    // yeniden değerlendir" deseni burada EKSİKTİ, eklendi.
    populateFocusSelect();
    syncAnswerFormatVisibility();
    syncCakismaVisibility();
    // G46: Tonal Denge'nin altı kaydırıcıya kadar çıkabilen kart listesi spektrumun
    // altında yer sıkışıklığına yol açıyordu — mode.COMPACT_ANALYZER (SHOW_SPECTRUM'un
    // AYNI mode-agnostik bayrak deseni, bkz. db-seviyesi.js) true dönen bir mod için
    // #analyzer'a bir modifier class eklenir (styles.css #visualizer yüksekliğini
    // küçültür). class değişikliği goScreen("game")'in çağıracağı resizeCanvas()'tan
    // ÖNCE uygulanıyor — canvas'ın GERÇEK (CSS'ten okunan) boyutu ilk çizimden
    // itibaren doğru.
    if (els.analyzer) els.analyzer.classList.toggle("analyzer-compact", !!mode.COMPACT_ANALYZER);
    // G83: alt kenar satırı (20Hz/caption/kHz) SADECE SHOW_SPECTRUM!==false
    // modlarda anlamlı — dB Seviyesi/Frekans Çakışması kendi görsellerini
    // kullanıyor (bkz. updateAnalyzerFoot).
    if (els.analyzer) els.analyzer.classList.toggle("analyzer-no-foot", mode.SHOW_SPECTRUM === false);
    // G91 (madde 9): dB Seviyesi'nin "SPEKTRUM · B İŞLENMİŞ" kart çerçevesi
    // (bg/border/gölge/başlık) kaldırılıyor — SADECE canvas/barlar kalıyor
    // (bkz. mode.BARE_ANALYZER, db-seviyesi.js + styles.css #analyzer.analyzer-bare).
    if (els.analyzer) els.analyzer.classList.toggle("analyzer-bare", !!mode.BARE_ANALYZER);
    // G86: Motor 2'de (Kompresör/Reverb/Distortion) spektrum kartı HİÇ YOK
    // (Tasarim-2026-08/Prototip.dc.html isCompMode, task'ın kendi talimatı) —
    // SHOW_SPECTRUM'dan (grid çizimi, dB Seviyesi/Frekans Çakışması'nda hâlâ
    // KART görünür kalır) AYRI bir bayrak: mode.HIDE_ANALYZER kartın
    // TAMAMINI gizler.
    if (els.analyzer) els.analyzer.classList.toggle("hidden", !!mode.HIDE_ANALYZER);
    // G86: Motor 2'nin kontrol satırı farklı ölçüler/öğeler taşıyor (bkz.
    // styles.css .controls-m2 override'ları + index.html'in bu turdaki notu).
    if (els.gameSpectrumControls) els.gameSpectrumControls.classList.toggle("controls-m2", !!mode.THREE_WAY);
    updateAnalyzerFoot();
    // G47: farklı bir moda geçince sınav sistemi de sıfırlanır (bir modun yarım
    // parkuru başka bir moda SIZMAZ) — examSystem.setMode kendi içinde SADECE
    // modId GERÇEKTEN değiştiyse resetler (bkz. core/exam-system.js), aynı moda
    // geri dönmek (menüden çıkıp aynı karta basmak) yarım parkuru KORUR.
    examSystem.setMode(realMode.MODE_ID);
    // G79: "Başlamak için 'Oyunu Başlat'a dokun." kutusu KALDIRILDI (task'ın
    // kararı — altındaki play butonu ZATEN aynı şeyi söylüyor). #questionTitle
    // SİLİNMEDİ, idle durumda SADECE boş+gizli — renderQuestion() ilk turda
    // GERÇEK soru metnini yazıp .hidden'ı kaldırır (bkz. o fonksiyon).
    els.questionTitle.textContent = "";
    els.questionTitle.classList.add("hidden");
    els.questionMeta.textContent = "";
    // Önceki modun spotlight turu yeni moda SIZMASIN — startSpotlightTourIfNeeded
    // zaten her startRound()'da yeniden değerlendirir, ama "Oyunu Başlat"a basılana
    // kadarki idle görünümde eski modun karartması/deliği asılı kalmasın diye
    // burada da kapatılır (tamamlanmamış sayılır, sayaç ETKİLENMEZ).
    closeSpotlightTour(false);
    if (els.freqInfo) els.freqInfo.classList.add("hidden");
    if (els.answers) { els.answers.innerHTML = ""; els.answers.classList.add("hidden"); }
    // G86 DÜZELTMESİ (canlı testte bulundu): #freqGuessArea BURADA hiç
    // temizlenmiyordu — Motor 2'nin #threeWayConfirmBtn'i ("Bir kart seç")
    // artık GERÇEK, tıklanabilir görünen bir buton olduğu için, Kompresör'den
    // Tonal Denge'ye (veya herhangi başka bir moda) geçilince bu ESKİ buton
    // yeni modun idle ekranında ASILI kalıyordu. #answers'la AYNI desen.
    if (els.freqGuessArea) { els.freqGuessArea.innerHTML = ""; els.freqGuessArea.classList.add("hidden"); }
    updateStartBtnLabel();
    updateAbToggleUI();
    // G80 DÜZELTMESİ (populateFocusSelect ile AYNI desen taranırken bulundu):
    // #levelChipValue (üst bar seviye pentagonu) SADECE updateUI() içinde yazılıyor
    // (satır ~1836, mode.getMeta().id okur) — updateUI() ise SADECE açılışta VE
    // submit-sonrası noktalarda çağrılıyordu, enterMode()'da YOKTU. Sonuç: bir moddan
    // diğerine geçilince pentagon YENİ modun değil ESKİ modun seviyesini göstermeye
    // devam ediyordu (ilk soru cevaplanana kadar). updateUI() activeQuestion'a
    // BAĞIMLI değil (yukarıda null'landı, güvenli) — burada çağrılması yeterli.
    updateUI();
  }
  goScreen("game");
}

// G37: kulaklık uyarı sheet'i — Dizayn/prototype.html'in #hpSheet/askHeadphones/
// hpConfirm ÜÇLÜSÜNÜN AYNI deseni (bkz. o dosyadaki notlar). Sadece
// mode.getMeta().kulaklikGerekli===true olan modlarda, o mod için "bir daha gösterme"
// işaretlenmemişken araya giriyor.
//
// G39 DÜZELTMESİ: prefs.hpWarning (Ayarlar'daki genel toggle) ARTIK bu sheet'i
// KONTROL ETMİYOR — SADECE Ana Menü'deki statik .mobile-warn banner'ını
// gösterip/gizliyor (bkz. updateSettingsUI). Kulaklık gerektiren bir moda girildiğinde
// sheet toggle'ın durumundan BAĞIMSIZ olarak HER ZAMAN çıkar; kullanıcı sadece
// "bir daha gösterme" ile SUSTURABİLİR (bkz. hpSkippedThisSession altı).
//
// "bir daha gösterme" artık OTURUMLUK — prefs.hpSkip (localStorage, kalıcı) DEĞİL,
// modül-seviyesi bir Set (bellek). Sayfa/uygulama yeniden yüklenince JS modülü sıfırdan
// çalışır, Set boşalır, uyarı GERİ GELİR — task'ın istediği tam olarak bu.
const hpSkippedThisSession = new Set();
let pendingHpEntry = null, pendingHpRealMode = null;
// Metin BİLEREK genel/basit tutuldu (spec: "mod bazlı metin ya da genel yeterli") —
// prototipin "stereo bilgisi duyulmaz" ifadesi Reverb için YANLIŞ olurdu (reverb mono-
// uyumlu bir efekt, stereo değil). Gelecekteki bir mod (Stereo Genişlik/Pan Konumu gibi
// GERÇEKTEN kanal-ayrımına dayanan) kendi getMeta()'sına bir `kulaklikMetni` alanı
// eklerse BURADAKİ genel metnin YERİNE geçer — mekanizma zaten hazır, yeni bir kod
// değişikliği GEREKMEZ.
const DEFAULT_HP_TEXT = "İnce farkları (derinlik, mekân hissi) doğru duymak için kulaklık kullan — telefon hoparlöründe bu detaylar kolayca kaybolur.";
function openHeadphoneSheet(entry, realMode) {
  pendingHpEntry = entry;
  pendingHpRealMode = realMode;
  const meta = realMode.getMeta();
  if (els.hpSheetDesc) els.hpSheetDesc.textContent = meta.kulaklikMetni || DEFAULT_HP_TEXT;
  if (els.hpSheetAgain) els.hpSheetAgain.classList.remove("on");
  if (els.hpSheetOverlay) els.hpSheetOverlay.classList.add("open");
  if (els.hpSheet) els.hpSheet.classList.add("open");
}
function closeHeadphoneSheet() {
  if (els.hpSheetOverlay) els.hpSheetOverlay.classList.remove("open");
  if (els.hpSheet) els.hpSheet.classList.remove("open");
  pendingHpEntry = null;
  pendingHpRealMode = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// G47/G84 — Sınav sistemi: mode.EXAM_ENABLED olan modlarda submitThreeWayGuess
// vb.'nin çağırdığı orkestrasyon + tam ekran #screen-exam (announce/passed/
// failed/makeup, bkz. showExamScreen()). Mekanik core/exam-system.js'te;
// burası SADECE o modülün event'lerine göre DOM/ses tepkisi üretir.
//
// G84: ÖNCEDEN (G47) "erken sınav teklifi" ve "BÖLÜM GEÇTİN" birer küçük
// bottom-sheet'ti (hpSheet'in AYNI .open class deseni); "exam-failed"/
// "remedial-start" hiç EKRAN değildi, SADECE appendExamNote (feedback
// kartına eklenen tek satır) vardı. Tasarim-2026-08/Prototip.dc.html'in
// examSets objesi dört alt-durumu TAM EKRAN gösteriyor — bu tur o birebir
// uygulandı, mekanik (acceptEarlyExam/declineEarlyExam/acknowledgePassed/
// startRemedial) TEK SATIR değişmedi.
// ═══════════════════════════════════════════════════════════════════════════

// Sınav fazında kazanılan XP — examSystem KENDİSİ XP'ye hiç dokunmuyor (mode-
// agnostic, bkz. o dosyanın notu), "passed" ekranının "Kazanılan XP" gerçeği
// bu yüzden AYRI, küçük bir biriktiriciyle tutuluyor (session.xpBaseSum'un
// AYNI deseni, G81/G82) — SADECE examSystem.phase==="exam" iken artıyor,
// telafi/parkur XP'si karışmaz. handleExamOutcome'daki "announce" açılışında
// sıfırlanır (yeni bir sınavın başlangıcı).
let examXpSum = 0;

// G50 — SINAV SİSTEMİNİN 7 moda yayılması: telafinin HANGİ eksende kişisel-
// leştirileceğini seçen dispatcher (task'ın kendi ismi/imzası). mode.
// EXAM_WEAK_AREA==="zone" iken zayıf FREKANS BÖLGESİ (personalization.js:
// getWeakZone, PAYLAŞILAN zoneStats + modun kendi FA_ZONES'u üzerinden) —
// aksi halde ESKİ zayıf ZORLUK KADEMESİ (exam-system.js:getWeakTier,
// tierStats üzerinden, G47'den beri DEĞİŞMEDİ). Dönen `value`
// examSystem.startRemedial()'a AYNEN geçirilir.
function getWeakArea(stats, modeId) {
  if (mode.EXAM_WEAK_AREA === "zone") {
    const weak = mode.FA_ZONES ? getWeakZone(zoneStats, mode.FA_ZONES) : null;
    return { type: "zone", value: weak ? weak.zone : null, label: weak ? weak.zone.t : null };
  }
  const es = examStatsFor(modeId);
  const weak = getWeakTier(es.tierStats);
  const tier = (weak && weak.tier) || "medium";
  return { type: "tier", value: tier, label: mode.DIFFICULTY[tier]?.label || tier };
}

// {{ exFacts }}'ın (Prototip.dc.html satır 2428) AYNI satırı — renk
// verilmezse tasarımın varsayılanı (#d6d9dd → --tx).
function exFactRow(k, v, color) {
  return `<div class="ex-fact"><div class="ex-fact-k">${k}</div><div class="ex-fact-v" style="color:${color || "var(--tx)"}">${v}</div></div>`;
}
// ico(p,sz,color) — Prototip.dc.html'in AYNI helper'ı (satır ~1781), fill
// argümanı hiçbir exPillIcon çağrısında verilmiyor → hepsi stroke-only.
function exPillIconSvg(d, color) {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"></path></svg>`;
}

// showExamScreen(kind, ctx) — kind: "announce"|"passed"|"failed"|"makeup".
// showSessionEnd()'in AYNI "tek DOM, parametrik doldurma" deseni. ctx:
//   announce: { source: "offer"|"start" } — hangi tetikleyiciden geldiği,
//     "Sınava başla"/"Sonra" butonlarının GERÇEK mekaniği bu ikisinde FARKLI
//     (bkz. aşağıdaki ctaHandler/secondaryHandler).
//   failed: { examCorrect } — resetParkur() examSystem.examCorrect/examIndex'i
//     SIFIRLADIKTAN SONRA bu fonksiyon çağrıldığı için (bkz. exam-system.js
//     recordAnswer), gerçek sonuç ÇAĞIRAN TARAFTAN (handleExamOutcome,
//     recordAnswer'dan ÖNCE) anlık görüntü olarak taşınır.
//   makeup: { area } — getWeakArea()'nın döndüğü nesne, AYNEN.
function showExamScreen(kind, ctx = {}) {
  const modeId = mode.getMeta().id;
  const es = examStatsFor(modeId);
  const activeModeCatalogEntry = MODE_CATALOG.find(e => e.id === modeId);
  const modeName = activeModeCatalogEntry ? activeModeCatalogEntry.ad : modeId;
  const GOLD = "#f6d878", RED = "var(--rd)", CYAN = "var(--cyan)";
  // Prototip.dc.html'in examSets'inin AYNI pbg/pc çiftleri — SADECE announce
  // altın (pill/badge'iyle AYNI vurgu), passed/failed/failed/makeup ÜÇÜ de
  // YEŞİL (sonucu ne olursa olsun birincil buton "ileri" bir eylem, tasarımın
  // kendi literal renk seçimi — ilk uygulamada UNUTULMUŞTU, canlı doğrulamada
  // yakalandı: buton varsayılan .btn.primary rengini [cyan] gösteriyordu).
  const GOLD_BTN = { pbg: "linear-gradient(180deg,#f6d878,#d9a83c)", pc: "#1a1305" };
  const GREEN_BTN = { pbg: "linear-gradient(180deg,#46d968,#27a63e)", pc: "#06230e" };
  let accent, pillBg, pillBorder, pillIconD, kicker, badgeFill, badgeStroke, badgeInnerStroke,
    badgeTop, badgeMain, title, body, facts, ctaLabel, ctaHandler, ctaBtn, secondaryLabel, secondaryHandler;

  if (kind === "announce") {
    accent = GOLD; pillBg = "rgba(240,180,66,.12)"; pillBorder = "rgba(240,180,66,.4)";
    pillIconD = "M6 3h12v18l-6-4-6 4Z"; kicker = "SINAV HAKKI";
    badgeFill = "url(#examBadgeGrad)"; badgeStroke = "#fbe9a8"; badgeInnerStroke = "#c79a33";
    badgeTop = "SINAV"; badgeMain = es.examLevel; ctaBtn = GOLD_BTN;
    title = "Sınav hakkı kazandın!";
    body = `${modeName} modunda Sv ${es.examLevel} sınavına girmeye hak kazandın.`;
    facts = [
      exFactRow("Soru sayısı", `${EXAM_CONFIG.EXAM_LENGTH} soru`),
      exFactRow("Geçme koşulu", `${EXAM_CONFIG.EXAM_PASS_COUNT} doğru`, "var(--gr)"),
      // G84: examGateActive() zaten isUserPro() gerektiriyor (bkz. o
      // fonksiyon) VE loseLife() Pro'da HİÇ can azaltmıyor (bkz. o fonksiyonun
      // dosya başı notu, "Pro'da can sınırı yok") — yani sınav GERÇEKTEN can
      // harcamıyor, sınava özgü bir istisna İCAT EDİLMEDİ.
      exFactRow("Can", "Sınavda can harcanmaz")
    ];
    ctaLabel = "Sınava başla";
    ctaHandler = () => {
      examXpSum = 0;
      if (ctx.source === "offer") examSystem.acceptEarlyExam();
      goScreen("game");
      goToNextRound();
    };
    secondaryLabel = "Sonra";
    secondaryHandler = () => {
      if (ctx.source === "offer") { examSystem.declineEarlyExam(); goScreen("game"); goToNextRound(); }
      else goScreen("home");
    };
  } else if (kind === "passed") {
    accent = GOLD; pillBg = "rgba(240,180,66,.12)"; pillBorder = "rgba(240,180,66,.45)";
    pillIconD = "M4 12.5l5 5L20 6.5"; kicker = "SINAV GEÇİLDİ";
    badgeFill = "url(#examBadgeGrad)"; badgeStroke = "#fbe9a8"; badgeInnerStroke = "#c79a33";
    badgeTop = "SEVİYE"; badgeMain = es.examLevel; ctaBtn = GREEN_BTN;
    title = `Seviye ${es.examLevel - 1} → ${es.examLevel}`;
    body = `${modeName} modunda bir üst seviyeye geçtin. Yeni bir 10 soruluk parkur başlıyor.`;
    facts = [
      exFactRow("Sınav sonucu", `${examSystem.examCorrect} / ${EXAM_CONFIG.EXAM_LENGTH} doğru`, "var(--gr)"),
      exFactRow("Kazanılan XP", `+${examXpSum}`, "var(--gr)")
    ];
    // G82'nin AYNI "sadece gerçekten açıldıysa göster" kuralı — tasarımın
    // sabit "İlk Sınav" örneği UYDURULMADI/kopyalanmadı.
    const badge = session.newBadges.length ? session.newBadges[session.newBadges.length - 1] : null;
    if (badge) facts.push(exFactRow("Yeni rozet", badge.title, GOLD));
    ctaLabel = "Devam";
    ctaHandler = () => { examSystem.acknowledgePassed(); goScreen("game"); goToNextRound(); };
    secondaryLabel = "Ana Ekran";
    secondaryHandler = () => { examSystem.acknowledgePassed(); goScreen("home"); };
  } else if (kind === "failed") {
    accent = RED; pillBg = "rgba(248,113,96,.1)"; pillBorder = "rgba(248,113,96,.4)";
    pillIconD = "M6 6l12 12M18 6L6 18"; kicker = "SINAV GEÇİLEMEDİ";
    badgeFill = "#22252a"; badgeStroke = "rgba(255,255,255,.14)"; badgeInnerStroke = "rgba(255,255,255,.1)";
    badgeTop = "SEVİYE"; badgeMain = es.examLevel; ctaBtn = GREEN_BTN;
    title = "Parkur baştan";
    body = `Sınavı geçemedin — Sv ${es.examLevel} parkuru baştan başlıyor. Kazandığın XP duruyor, hiçbir şey silinmiyor.`;
    facts = [
      exFactRow("Sınav sonucu", `${ctx.examCorrect} / ${EXAM_CONFIG.EXAM_LENGTH} doğru`, RED),
      exFactRow("XP'in", "Korundu", "var(--gr)"),
      exFactRow("Yeni hak", `${EXAM_CONFIG.TOTAL_THRESHOLD} doğruda tekrar`)
    ];
    ctaLabel = "Devam Et";
    ctaHandler = () => { goScreen("game"); goToNextRound(); };
    secondaryLabel = "Ana Ekran";
    secondaryHandler = () => goScreen("home");
  } else { // makeup
    accent = CYAN; pillBg = "rgba(34,211,238,.1)"; pillBorder = "rgba(34,211,238,.35)";
    pillIconD = "M3 12a9 9 0 1 0 2.6-6.3M3 4v5h5"; kicker = "TELAFİ TURU";
    badgeFill = "#1b2a2e"; badgeStroke = "rgba(34,211,238,.5)"; badgeInnerStroke = "rgba(34,211,238,.35)";
    badgeTop = "SORU"; badgeMain = EXAM_CONFIG.REMEDIAL_LENGTH; ctaBtn = GREEN_BTN;
    const area = ctx.area || { type: "tier", label: null };
    const isZone = area.type === "zone";
    const areaLabel = area.label || (isZone ? "genel spektrum" : "orta");
    title = `Zayıf ${isZone ? "bölgen" : "kademen"}: ${areaLabel}`;
    // G84 KRİTİK DÜZELTME (task'ın uyarısı, core/exam-system.js'ten
    // doğrulandı): tasarımın "Sınavdaki üç hatanın da..." metni YANLIŞ
    // eksene bağlıydı — telafi SINAVDA kalınca DEĞİL, 10 soruluk PARKUR
    // toplamda <6 doğruyla bitince başlıyor (bkz. core/exam-system.js
    // recordAnswer, "remedial-start" event'i SADECE parkur dalından döner).
    body = `10 soruluk parkurda en az ${EXAM_CONFIG.TOTAL_THRESHOLD} doğru yapılamadı — telafi turu ${isZone ? (area.label ? `${area.label} bölgesine` : "genel spektruma") : `${areaLabel} kademesine`} odaklanacak.`;
    facts = [
      exFactRow(isZone ? "Bölge" : "Kademe", areaLabel, RED),
      exFactRow("Soru sayısı", `${EXAM_CONFIG.REMEDIAL_LENGTH} soru`),
      exFactRow("Geçme koşulu", `${EXAM_CONFIG.REMEDIAL_PASS_COUNT} doğru`, "var(--gr)")
    ];
    ctaLabel = "Telafi turunu başlat";
    ctaHandler = () => { goScreen("game"); goToNextRound(); };
    secondaryLabel = "Ana Ekran";
    secondaryHandler = () => goScreen("home");
  }

  if (els.exPill) { els.exPill.style.background = pillBg; els.exPill.style.border = `1px solid ${pillBorder}`; }
  if (els.exPillIcon) els.exPillIcon.innerHTML = exPillIconSvg(pillIconD, accent);
  if (els.exKicker) { els.exKicker.textContent = kicker; els.exKicker.style.color = accent; }
  if (els.exBadgeOuter) { els.exBadgeOuter.setAttribute("fill", badgeFill); els.exBadgeOuter.setAttribute("stroke", badgeStroke); }
  if (els.exBadgeInner) els.exBadgeInner.setAttribute("stroke", badgeInnerStroke);
  if (els.exBadgeTop) { els.exBadgeTop.textContent = badgeTop; els.exBadgeTop.style.color = accent; }
  if (els.exBadgeMain) { els.exBadgeMain.textContent = badgeMain; els.exBadgeMain.style.color = accent; }
  if (els.exTitle) els.exTitle.textContent = title;
  if (els.exBody) els.exBody.textContent = body;
  if (els.exFacts) els.exFacts.innerHTML = facts.join("");
  // exCta/exSecondary'nin onclick'i (addEventListener DEĞİL) BİLEREK — her
  // showExamScreen() çağrısı öncekini birikmeden DEĞİŞTİRİR (showSessionEnd'in
  // resCta'sıyla AYNI tek-atama deseni).
  if (els.exCta) {
    els.exCta.textContent = ctaLabel;
    els.exCta.onclick = ctaHandler;
    els.exCta.style.background = ctaBtn.pbg;
    els.exCta.style.color = ctaBtn.pc;
  }
  if (els.exSecondary) { els.exSecondary.textContent = secondaryLabel; els.exSecondary.onclick = secondaryHandler; }

  goScreen("exam");
}

// submitThreeWayGuess vb.'nin (8 çağrı noktası, bkz. grep) SONUNDA, SADECE
// mode.EXAM_ENABLED true iken çağrılır. `gained` — bu turda kazanılan GERÇEK
// XP (çağıran fonksiyonun KENDİ `gained` değişkeni, G84: examXpSum için).
// Dönen boolean: true ise çağıran taraf normal scheduleNext(...)'ü ATLAMALI
// (bu fonksiyon #screen-exam açıp akışı KENDİSİ yönetiyor demektir) — false
// ise normal akış (scheduleNext) DEVAM ETMELİ.
function handleExamOutcome(q, result, gained) {
  const modeId = mode.getMeta().id;
  const es = examStatsFor(modeId);
  // tierStats SADECE normal parkur cevaplarından beslenir — sınav/telafi
  // sonuçları BİLEREK dışarıda (zaten "zorlaştırılmış" bir örneklem, zayıf-
  // kademe tespitini ÇARPITIRDI, bkz. core/exam-system.js dosya başı notu).
  if (examSystem.phase === "parkur") {
    es.tierStats = recordTierResult(es.tierStats, q.difficulty, result.correct);
  }
  // G84: examXpSum SADECE sınav fazındaki sorularda artıyor — recordAnswer()
  // fazı DEĞİŞTİRMEDEN ÖNCE okunuyor (bu satır "exam"in SON sorusu için de
  // doğru çalışır, çünkü faz geçişi recordAnswer'IN İÇİNDE olur).
  if (examSystem.phase === "exam") examXpSum += gained || 0;
  // G84: "failed" ekranının "Sınav sonucu" gerçeği — resetParkur()
  // (recordAnswer'IN İÇİNDE, "exam-failed" dalında) examCorrect/examIndex'i
  // SIFIRLAR; o yüzden BU cevabın sonucu recordAnswer'DAN ÖNCE, elle
  // hesaplanıp yakalanıyor (recordAnswer'ın kendi examIndex++/examCorrect++
  // mantığının AYNISI).
  const examCorrectSnapshot = examSystem.examCorrect + (result.correct ? 1 : 0);

  const outcome = examSystem.recordAnswer(result.correct, q.difficulty);

  switch (outcome.event) {
    case "exam-offer":
      showExamScreen("announce", { source: "offer" });
      return true; // scheduleNext YOK — kullanıcı ekranda karar verene kadar bekler
    case "exam-start":
      examXpSum = 0;
      showExamScreen("announce", { source: "start" });
      return true;
    // G48 DÜZELTMESİ: telafi BURADA (parkur TOPLAM<6, ne kombo ne toplam
    // yolu tetiklendi) başlıyor. G50: tier YERİNE getWeakArea() — moda göre
    // zon ya da kademe döner (bkz. o fonksiyonun notu). value null olabilir
    // (zone tipinde, yeterli veri yoksa) — startRemedial(null) GÜVENLİ
    // (startRound() bunu "daraltma yok" olarak yorumlar).
    case "remedial-start": {
      const area = getWeakArea(stats, modeId);
      examSystem.startRemedial(area.value);
      showExamScreen("makeup", { area });
      return true;
    }
    case "exam-passed": {
      es.examLevel = (es.examLevel || 1) + 1;
      persistStats();
      updateUI();
      // "Belirgin, ödül hissi" (task) — doğru cevaptaki AYNI flörtür fx'leri
      // (ding+burst), sıradan bir doğru cevaptan AYRIŞSIN diye kutlama
      // ekranıyla BİRLİKTE.
      audioEngine.sfxDing();
      burst(els.canvas);
      showExamScreen("passed");
      return true;
    }
    // G48: sınavda kalmak BASİT (task: "sınav tekrar ya da parkur baştan") —
    // telafi YOK, doğrudan parkur baştan (core/exam-system.js resetParkur'u
    // ZATEN çağırdı).
    case "exam-failed":
      showExamScreen("failed", { examCorrect: examCorrectSnapshot });
      return true;
    // G84: remedial-passed/remedial-failed'ın kendi bir tam ekranı YOK —
    // task'ın "beş durum" listesi bunları KAPSAMIYOR (announce/run/passed/
    // failed/makeup) — mevcut appendExamNote deseni KORUNDU.
    case "remedial-passed":
      appendExamNote("Telafiyi geçtin — parkura devam.");
      return false;
    case "remedial-failed":
      appendExamNote("Telafiyi geçemedin — parkur baştan başlıyor.");
      return false;
    default:
      return false;
  }
}

// Cevap sonrası feedback kartının metnine (setFeedback ZATEN çağrılmış) sınav-
// ilgili bir NOT ekler — remedial-passed/remedial-failed için hâlâ kullanılıyor
// (bkz. yukarı), announce/passed/failed/makeup artık kendi tam ekranını
// kullanıyor (G84).
function appendExamNote(note) {
  if (!note || !els.feedbackDetail) return;
  els.feedbackDetail.textContent = `${els.feedbackDetail.textContent} ${note}`;
}

// Şimdilik tek mod var; kayıt defterinden beslenir, elle yazılmaz (bkz. core/registry.js).
// Menü ızgarası: core/mode-catalog.js'teki TÜM egzersiz listesinden (14 kayıt)
// besleniyor, motorlara göre gruplanıyor. Sadece registry.js'te GERÇEKTEN kayıtlı
// olan mod (listModes()) tıklanabilir/oynanabilir; diğerleri kilitli kart olarak
// görünür, tıklanınca "yakında" mesajı gösterir — oyun mantığı içermezler.
// G74: ana ekran görsel sistemi — Tasarim-2026-08/Ana Ekran.dc.html. Motor
// gruplaması KALDIRILDI (yeni tasarımda "Motor N" kavramı hiç yok, tek düz
// 2 sütunlu ızgara) — renderModeGrid() ikiye ayrıldı: renderExerciseGrid()
// (10 GERÇEK/oynanabilir mod, playable:true) ve renderComingGrid() (henüz
// kodlanmamış 4 katalog girdisi, AYRI "Yakında" bölümü). Erişim/kilit
// MANTIĞI (meetsLevel/playable/access, paywall.checkModeAccess,
// openHeadphoneSheet, enterMode) TEK SATIR değişmedi — SADECE render edilen
// HTML ve "Sv N'de açılır" rozetinin GÖRÜNÜRLÜĞÜ değişti (task'ın kendi
// kararı: ücretsizde seviye kilidi zaten hiç tetiklenmiyor, G62).
function renderExerciseGrid() {
  if (!els.modeGrid) return;
  const registeredModes = listModes();
  const exerciseEntries = MODE_CATALOG.filter(e => e.playable);
  if (els.modeCount) els.modeCount.textContent = `${exerciseEntries.length} mod`;

  els.modeGrid.innerHTML = "";
  exerciseEntries.forEach(entry => {
    const realMode = registeredModes.find(m => m.getMeta().id === entry.id);
    // Z3/G62 KARARI — DEĞİŞMEDİ: bkz. önceki sürümün AYNI yorumu (git geçmişi) —
    // "Sv N'de açılır" akademi-seviyesi kilidi ücretsizde hiç tetiklenmiyor
    // (meetsLevelRequirement free'de her zaman true döner), Pro'da bile bu 10
    // mod için pratikte neredeyse hiç ulaşılmayan bir kenar durum. Mantık
    // KORUNDU, SADECE görsel rozeti (aşağıda) artık render EDİLMİYOR.
    const meetsLevel = devFlags.simulatePro || paywall.meetsLevelRequirement(isUserPro(), progress.academyLevel(stats, playableModeIds()), entry.unlockLevel);
    const playable = !!realMode && meetsLevel;
    const access = playable
      ? paywall.checkModeAccess(entry.id, { isPro: isUserPro(), dailyTasteLastPlayedAt: stats.dailyTasteLastPlayedAt, now: Date.now() })
      : { allowed: true, reason: null };
    const card = document.createElement("button");
    card.type = "button";
    card.className = `mode-card${(playable && access.allowed) ? "" : " locked"}`;
    // G87: İlerleme'nin boş-durum "İlk seansını başlat" CTA'sı Frekans Bulma
    // kartına PROGRAMATİK tıklıyor (bkz. progStartFreqBtn) — erişim/paywall/
    // kulaklık-uyarısı mantığını TEKRARLAMAMAK için, aynı elemente ihtiyaç var.
    card.dataset.modeId = entry.id;
    const viz = modeVisualSvg(entry.id) || "";
    // "i" bilgi rozeti (bkz. core/guide-texts.js) — SADECE gerçek metni olan
    // 10 mod için (hepsi burada zaten, MODE_GUIDE_TEXTS[entry.id] HER ZAMAN
    // var — savunma amaçlı kontrol yine de KORUNDU).
    const infoBadge = MODE_GUIDE_TEXTS[entry.id] ? `<button type="button" class="mode-info-btn" data-guide-mode="${entry.id}" aria-label="${entry.ad} bilgisi">i</button>` : "";
    // Sağ-üst rozet — tasarımın KENDİ statik "PRO" etiketi: entry.tier'a göre
    // (erişim durumundan BAĞIMSIZ, Pro kullanıcıda bile "bu içerik Pro" bilgisi
    // kalır — mode-catalog.js'in tier'ı zaten core/paywall.js:FREE_MODE_IDS'le
    // BİLEREK senkron tutuluyor, bkz. o dosyanın G61 notu — "kilit dağılımında
    // kod kazanır" kuralı burada ZATEN sağlanmış durumda).
    const proBadge = entry.tier === "pro"
      ? `<div class="mode-card-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg><span>PRO</span></div>`
      : "";
    // Günlük-tadımlık etiketi (SADECE Frekans Çakışması, dailyTaste:true) —
    // tasarımın statik "günde 1 ücretsiz" metnini TABAN alır, ama GERÇEK erişim
    // durumu (access.reason==="daily-used") o gün zaten oynanmışsa metni
    // "Bugün oynadın"a çevirir — aynı rozet slotu, dinamik metin (eski
    // .mode-lock-row'un "Bugün oynadın" bilgisini KAYBETMEDEN, yeni tasarımın
    // rozet diline taşınmış hali).
    const dailyBadge = entry.dailyTaste
      ? `<div class="mode-card-daily">${access.reason === "daily-used" ? "Bugün oynadın" : "günde 1 ücretsiz"}</div>`
      : "";
    // "Sv N" rozeti — progress.modeLevel (Z3/Z6'dan beri var, oyun içi
    // #levelChip'in AYNI kaynağı), erişim durumundan BAĞIMSIZ HER ZAMAN
    // gösterilir (tasarımın kendi statik davranışı, bkz. Ana Ekran.dc.html
    // ex.lv — kilitli/kilitsiz ayrımı YOK).
    const levelNum = progress.modeLevel(stats, entry.id);
    card.innerHTML = `
      <div class="mode-card-viz">${viz}${infoBadge}${proBadge}</div>
      <div class="mode-card-body">
        <div class="mode-card-head">
          <div class="mode-card-name">${entry.ad}</div>
          <div class="mode-chip-level">Sv ${levelNum}</div>
        </div>
        <div class="mode-card-desc">${entry.aciklama}</div>
        ${dailyBadge}
        <div class="mode-card-progress hidden"><i style="width:0%"></i></div>
      </div>
    `;
    // "i" rozeti kartın KENDİ tıklamasından BAĞIMSIZ — kilitli bir kartta bile
    // (mod bilgisi kilitliyken de merak edilebilir) çalışmalı, bu yüzden
    // card.addEventListener("click", ...) aşağıdaki asıl navigasyon handler'ından
    // ÖNCE stopPropagation ile ayrılıyor.
    const infoBtn = card.querySelector(".mode-info-btn");
    if (infoBtn) infoBtn.addEventListener("click", e => {
      e.stopPropagation();
      openGuideSheet(entry.id);
    });
    card.addEventListener("click", () => {
      if (playable) {
        // G63 (PAYWALL.md Parça 2): tetikleme #3 (kilitli mod: dB/Reverb/
        // Tonal/Distortion) ve #5 (Frekans Çakışması günde-1 bitti) —
        // ARTIK toast DEĞİL, paywall ekranı DOĞRUDAN açılır. İlk oturumda
        // (openPaywallReason false döner) G61'in ESKİ toast'ına düşülür.
        if (!access.allowed) {
          const reasonKey = access.reason === "daily-used" ? "dailyUsed" : "modeLocked";
          if (!openPaywallReason(reasonKey)) {
            const msg = access.reason === "daily-used" ? paywall.LOCK_MESSAGES["daily-used"] : paywall.LOCK_MESSAGES.pro;
            toast(msg.title, msg.detail, "pro");
          }
          return;
        }
        // G37: mod-özel kulaklık uyarısı — bkz. openHeadphoneSheet dosya başı notu.
        // meta.kulaklikGerekli her modun KENDİ getMeta()'sından (mode-catalog.js'in
        // alanı sadece referans, diğer mod alanları gibi — bkz. o dosyanın başındaki
        // yorum) — Reverb HARİÇ altı mod bunu false döndürüyor, sheet ONLARDA hiç
        // açılmıyor. G39: prefs.hpWarning ARTIK burada KONTROL EDİLMİYOR (genel toggle
        // sheet'i etkilemiyor, bkz. hpSkippedThisSession dosya başı notu).
        const meta = realMode.getMeta();
        const skipped = hpSkippedThisSession.has(entry.id);
        if (meta.kulaklikGerekli && !skipped) {
          openHeadphoneSheet(entry, realMode);
          return;
        }
        enterMode(entry, realMode);
        return;
      }
      if (realMode && !meetsLevel) { toast("Seviye yetersiz", `Bu egzersiz Seviye ${entry.unlockLevel}'de açılır.`); return; }
      toast("Yakında", "Bu egzersiz yakında eklenecek.", "soon");
    });
    els.modeGrid.appendChild(card);
  });
}

// Task'ın kendi verdiği "Yakında" sırası (mode-catalog.js'in KENDİ dizi
// sırasından — hiz-modu/stereo-genislik/pan-konumu/hangisi-farkli — FARKLI,
// bilerek — task madde 4'ün açık isteği). cIcon path verileri Ana
// Ekran.dc.html'den AYNEN taşındı.
const COMING_MODE_ORDER = ["stereo-genislik", "pan-konumu", "hiz-modu", "hangisi-farkli"];
const COMING_ICON_PATH = {
  "hiz-modu": "M12 8v4l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z",
  "stereo-genislik": "M7 12h10M4 8v8M20 8v8M9 5v14M15 5v14",
  "pan-konumu": "M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9ZM12 12l4-5",
  "hangisi-farkli": "M4 8h5v8H4zM10 6h5v12h-5zM16 9h4v6h-4z"
};
// Bu 4 kart HİÇ kodlanmadı (realMode yok) — eski tek-ızgara sürümündeki
// "Yakında" toast'ı davranışı (tıklanınca bilgilendirme) KORUNDU, sadece
// artık AYRI bir bölümde, tasarımın kesikli-kenarlıklı sade kartıyla.
function renderComingGrid() {
  if (!els.comingGrid) return;
  els.comingGrid.innerHTML = "";
  COMING_MODE_ORDER.forEach(id => {
    const entry = MODE_CATALOG.find(e => e.id === id);
    if (!entry) return;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "coming-card";
    const path = COMING_ICON_PATH[id] || "";
    card.innerHTML = `
      <div class="coming-card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"></path></svg></div>
      <div style="flex:1;min-width:0">
        <div class="coming-card-name">${entry.ad}</div>
        <div class="coming-card-label">Yakında</div>
      </div>
    `;
    card.addEventListener("click", () => toast("Yakında", "Bu egzersiz yakında eklenecek.", "soon"));
    els.comingGrid.appendChild(card);
  });
}

function updateUI() {
  // G87: İlerleme sekmesinin KENDİ Sv/XP rozeti KALDIRILDI (Prototip.dc.html'in
  // İLERLEME bloğunda böyle bir kart yok, bkz. index.html'in G87 notu) — Ana
  // Menü'nün rozeti (aşağıdaki menuLevelValue/menuXpText/...) TEK kaynak
  // olmaya devam ediyor, hesap DEĞİŞMEDİ (madde 10'un "tutarlılık" doğrulaması
  // bu yüzden artık tek taraflı: sadece Ana Menü'nün kendisi doğru mu diye).
  const academyXp = progress.academyXpProgress(progress.academyTotalXp(stats, playableModeIds()));
  const academyPercent = Math.max(0, Math.min(100, (academyXp.current / academyXp.required) * 100));

  if (els.menuLevelValue) els.menuLevelValue.textContent = academyXp.level;
  if (els.menuLevelTitle) els.menuLevelTitle.textContent = progress.levelTitle(academyXp.level);
  if (els.menuXpText) els.menuXpText.textContent = `${academyXp.current}/${academyXp.required} XP`;
  if (els.menuXpBar) els.menuXpBar.style.width = `${academyPercent}%`;
  if (els.menuNextLevelText) els.menuNextLevelText.innerHTML = `Sonraki seviyeye <b style="color:var(--cyan)">${academyXp.required - academyXp.current} XP</b>`;

  if (els.seriChip) els.seriChip.textContent = 'Seri ' + stats.rounds;
  // Z3/Z6: bu MOD seviyesi — diffState()'in yukarıdaki (perDiff, zorluk-bazlı) xp'sinden
  // FARKLI, progress.modeLevel() perMode'dan (mod-bazlı) okur.
  // G77: hedef #levelChip (buton, düz metin) DEĞİL #levelChipValue (pentagon
  // SVG'sinin içindeki nested span) — #levelChip artık bir SVG taşıyor,
  // .textContent'e yazılsaydı SVG'yi SİLERDİ. Hesap/mantık AYNI, SADECE
  // hangi DOM node'a yazıldığı değişti (bkz. index.html .ghead notu).
  if (els.levelChipValue) els.levelChipValue.textContent = progress.modeLevel(stats, mode.getMeta().id);
  if (els.gameAccValue) els.gameAccValue.textContent = `%${progress.accuracy(stats)}`;
  els.scoreChip.textContent = `Skor ${diffState().score}`;
  els.streakText.textContent = stats.combo > 1 ? `${stats.combo}x combo aktif` : "Akışta kal";

  if (els.progEmptyState) els.progEmptyState.classList.toggle("hidden", stats.rounds > 0);
  if (els.progContent) els.progContent.classList.toggle("hidden", stats.rounds === 0);

  renderAchievements();
  renderHearts();
  renderAnalysis();
  renderDailyTip();
  updateHintChipLabel();
  // G77: combo/hearts değişince (submit sonrası, updateUI HER submit'te
  // çağrılıyor) üst bar ANINDA senkron kalsın — sonraki round'u BEKLEMEZ.
  renderGameHeader();
}

// G87: Prototip.dc.html'in Günlük Görevler satırı (satır 194-208) — 26x26 ikon
// kutusu istiyor, mevcut daily.tasks veri modelinde (storage.js freshDaily())
// ikon YOK — burada task.id'ye göre SABİT, üç görevle BİREBİR eşleşen üç ikon
// tanımlandı (uydurma veri DEĞİL, sadece görsel bir eşleme).
const DAILY_TASK_ICON = {
  d1: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14v-2a9 9 0 0 1 18 0v2"></path><rect x="1" y="14" width="6" height="7" rx="2"></rect><rect x="17" y="14" width="6" height="7" rx="2"></rect></svg>`,
  d2: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"></path></svg>`,
  d3: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4-4 5.5-4 9.5a4 4 0 0 0 8 .3c1.2 1 2 2.6 2 4.2a6 6 0 1 1-12 0C6 10 12 8 12 2Z"></path></svg>`
};

function renderDaily() {
  els.dailyList.innerHTML = daily.tasks.map(task => {
    const pct = Math.min(100, Math.round((task.value / task.target) * 100));
    const done = task.claimed;
    return `<div class="prog-daily-row${done ? " done" : ""}">
      <div class="prog-daily-icon${done ? " done" : ""}">${DAILY_TASK_ICON[task.id] || ""}</div>
      <div class="prog-daily-body">
        <div class="prog-daily-title${done ? " done" : ""}">${task.title}</div>
        <div class="prog-daily-progress-row">
          <div class="prog-daily-track"><i style="width:${pct}%${done ? ";background:linear-gradient(90deg,#2fbf46,#4ade80)" : ""}"></i></div>
          <div class="prog-daily-count">${task.value} / ${task.target}</div>
        </div>
      </div>
      <div class="prog-daily-xp${done ? " done" : ""}">${done ? "✓" : "+" + task.reward}</div>
    </div>`;
  }).join("");
  if (els.dailyCounter) {
    const claimedCount = daily.tasks.filter(t => t.claimed).length;
    els.dailyCounter.textContent = `bugün · ${claimedCount}/${daily.tasks.length}`;
  }
}

// G87: Prototip.dc.html'in rozet pentagon'u (satır 311-317) — 9 başarımın
// (progress.js ACHIEVEMENTS) HİÇBİRİNİN kendi rengi/kategorisi YOK, bu yüzden
// TÜMÜ aynı (uygulama genelinde ZATEN kullanılan, bkz. index.html Sv rozeti)
// altın pentagon paletini paylaşıyor — kazanılmamışlarda soluk/gri varyant.
function renderAchievements() {
  const unlocked = new Set(stats.unlocked || []);
  if (els.achievementCount) els.achievementCount.textContent = `${unlocked.size}/${progress.ACHIEVEMENTS.length}`;
  els.achievementList.innerHTML = progress.ACHIEVEMENTS.map(a => {
    const won = unlocked.has(a.id);
    const outerFill = won ? "var(--gold-grad)" : "rgba(255,255,255,.05)";
    const outerStroke = won ? "#fbe9a8" : "rgba(255,255,255,.15)";
    const innerFill = won ? "#2a2013" : "#1a1b1e";
    const innerStroke = won ? "#c79a33" : "rgba(255,255,255,.08)";
    return `<div class="prog-badge${won ? "" : " locked"}">
      <div class="prog-badge-icon">
        <svg width="52" height="52" viewBox="0 0 52 52">
          <polygon points="26,3 48,19 40,46 12,46 4,19" fill="${outerFill}" stroke="${outerStroke}" stroke-width="1.4"></polygon>
          <polygon points="26,9 42.5,21 36.5,41 15.5,41 9.5,21" fill="${innerFill}" stroke="${innerStroke}" stroke-width="1"></polygon>
        </svg>
        <div class="prog-badge-glyph">${a.icon}</div>
      </div>
      <div class="prog-badge-name">${a.title}</div>
      <div class="prog-badge-cond">${a.desc}</div>
    </div>`;
  }).join("");
}

function relativeTime(ts) {
  if (!ts) return "—";
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "az önce";
  if (min < 60) return `${min}dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s`;
  return `${Math.floor(hr / 24)}g`;
}

// G87: Prototip.dc.html'in sola-kaydır→Sil deseni (satır 220-230) — GERÇEK
// dokunma cihazında çalışsın diye Pointer Events'le (calibLevelTrack'in AYNI
// pointerdown/move/up deseni) kuruldu, prototipin kendi click-simülasyonu
// (onClick:{{ra.swipe}}) DEĞİL — bu bir statik demo'ydu, burada gerçek sürükleme var.
const HIST_DEL_WIDTH = 84;
function bindHistorySwipe(rowEl, onDelete) {
  const content = rowEl.querySelector(".prog-hist-content");
  const delBtn = rowEl.querySelector(".prog-hist-del");
  if (!content) return;
  let startX = 0, curX = 0, dragging = false, open = false;
  const setX = (x, animate) => {
    content.style.transition = animate ? "transform 220ms cubic-bezier(0.3,0.8,0.3,1)" : "none";
    content.style.transform = `translateX(${x}px)`;
  };
  content.addEventListener("pointerdown", e => {
    dragging = true; startX = e.clientX; curX = open ? -HIST_DEL_WIDTH : 0;
    content.setPointerCapture(e.pointerId);
  });
  content.addEventListener("pointermove", e => {
    if (!dragging) return;
    const dx = Math.max(-HIST_DEL_WIDTH, Math.min(0, curX + (e.clientX - startX)));
    setX(dx, false);
  });
  const finish = e => {
    if (!dragging) return;
    dragging = false;
    const dx = Math.max(-HIST_DEL_WIDTH, Math.min(0, curX + (e.clientX - startX)));
    open = dx < -HIST_DEL_WIDTH / 2;
    setX(open ? -HIST_DEL_WIDTH : 0, true);
  };
  content.addEventListener("pointerup", finish);
  content.addEventListener("pointercancel", finish);
  if (delBtn) delBtn.addEventListener("click", onDelete);
}

function renderHistory() {
  if (!history.length) {
    els.historyList.innerHTML = `<div class="prog-hist-empty">Liste temizlendi</div>`;
    return;
  }
  els.historyList.innerHTML = history.map(h => `
    <div class="prog-hist-row">
      <div class="prog-hist-del">Sil</div>
      <div class="prog-hist-content">
        <div class="prog-hist-icon" style="background:${h.correct ? "rgba(74,222,128,.16)" : "rgba(248,113,96,.16)"};color:${h.correct ? "#4ade80" : "#f87160"}">${h.correct ? "✓" : "✕"}</div>
        <div class="prog-hist-body">
          <div class="prog-hist-mode">${h.label}</div>
          <div class="prog-hist-q">${h.detail}</div>
        </div>
        <div class="prog-hist-time">${relativeTime(h.ts)}</div>
      </div>
    </div>
  `).join("");
  Array.from(els.historyList.children).forEach((rowEl, idx) => {
    bindHistorySwipe(rowEl, () => {
      history.splice(idx, 1);
      persistStats();
      renderHistory();
    });
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
    // G87: Zayıf Bölge Raporu satırının "aralık" alt metni (Prototip.dc.html
    // satır 278) — FA_ZONES.t'nin ZATEN taşıdığı "(20–120 Hz)" parçası,
    // yeni bir Hz formatlaması İCAT EDİLMEDİ.
    const rangeMatch = z.t.match(/\(([^)]+)\)/);
    return { key, label: ZONE_SHORT_LABEL[key] || key, range: rangeMatch ? rangeMatch[1] : "", n: v.n, pct };
  });
}

// G87: Prototip.dc.html'in Zayıf Bölge Raporu satırı (satır 274-284) — tasarımda
// bu kart ARTIK katlanır DEĞİL (Frekans bölgesi panelinin eski "zonePanelToggle"
// aç/kapa'sı KALDIRILDI, task'ın 7. maddesi collapsble İSTEMİYOR), her zaman açık
// 6 satır. Kilit — madde 7 "FREE'DE KİLİTLİ (madde 6'daki katmanın aynısı)" diyor,
// paywall.isWeakZoneReportLocked TAM kilit (bulanık DEĞİL — task'ın kendi "aynı
// katman" talimatı üzerine G61'in ESKİ "sadece bulanık" kararı bu ekranda BİLEREK
// GENİŞLETİLDİ, aşağıdaki overlay artık dokunulamaz karartma+kilit halkası).
function renderZonePanel() {
  const scores = zoneScores();
  const locked = paywall.isWeakZoneReportLocked(isUserPro());
  if (els.zoneList) {
    els.zoneList.innerHTML = scores.map(s => {
      const hasData = s.pct !== null;
      const pct = hasData ? s.pct : 0;
      const weak = hasData && pct < 45;
      const nameColor = weak ? "#f87160" : "#9ba0a8";
      const barBg = weak ? "linear-gradient(90deg,#d9553e,#f88a6e)" : "linear-gradient(90deg,#2fbf46,#4ade80)";
      const barGlow = weak ? "0 0 10px rgba(248,113,96,.4)" : "none";
      const trackBorder = weak ? "rgba(248,113,96,.35)" : "rgba(255,255,255,.06)";
      const pctColor = !hasData ? "#4a4f56" : weak ? "#f87160" : "#c9cdd3";
      return `<div class="prog-zone-row">
        <div class="prog-zone-name">
          <div style="color:${nameColor}">${s.label}</div>
          <div class="prog-zone-range">${s.range}</div>
        </div>
        <div class="prog-zone-track" style="border-color:${trackBorder}"><i style="width:${pct}%;background:${barBg};box-shadow:${barGlow}"></i></div>
        <div class="prog-zone-pct" style="color:${pctColor}">${hasData ? "%" + s.pct : "—"}</div>
      </div>`;
    }).join("");
  }
  if (els.zoneList) els.zoneList.classList.toggle("prog-blurred", locked);
  if (els.zoneLock) els.zoneLock.classList.toggle("hidden", !locked);
  const enough = scores.filter(s => s.n >= 2);
  return { scores, enough };
}

// Ana menüdeki "Bugünün Önerisi" kartı — en zayıf bölgeyi zoneScores()'tan (İlerleme
// sekmesiyle aynı hesap) okuyup tek cümlelik öneri üretir. Yeterli veri yoksa
// (en az 1 bölgede n>=2) kart hiç gösterilmez — genel bir karşılama mesajı YAZMADIK,
// çünkü "Başla" butonu odak-aralığı özelliği olmadan anlamsız bir vaat olurdu.
function renderDailyTip() {
  if (!els.dailyTipCard) return;
  // G91 (madde 1): Ayarlar'daki "Bugünün önerisini göster" kapalıysa kart
  // HİÇ görünmez — daily.tipDismissed'in (günlük "şimdi değil") AKSİNE bu
  // KALICI bir tercih.
  if (!prefs.showDailyTip) { els.dailyTipCard.classList.add("hidden"); return; }
  if (daily.tipDismissed) { els.dailyTipCard.classList.add("hidden"); return; }
  const enough = zoneScores().filter(s => s.n >= 2);
  if (!enough.length) { els.dailyTipCard.classList.add("hidden"); return; }
  const weakest = enough.slice().sort((a, b) => a.pct - b.pct)[0];
  // G74: metin İÇERİĞİ/verisi DEĞİŞMEDİ (aynı weakest.label/pct) — SADECE
  // zayıf bölge adı tasarımın kendi vurgu rengiyle (--red) işaretlendi
  // (Ana Ekran.dc.html'in "ÜST-ORTA" örneğiyle AYNI görsel dil). textContent
  // yerine innerHTML kullanılıyor ama tek enjekte edilen değer BU fonksiyonun
  // kendi hesapladığı weakest.label/pct — dışarıdan gelen serbest metin YOK.
  if (els.dailyTipText) els.dailyTipText.innerHTML = `Zayıf bölgen <b style="color:var(--red)">${weakest.label}</b> — isabet %${weakest.pct}. Bugün oraya odaklanmayı dene.`;
  // G58: buton artık GERÇEKTEN challenge.total kadar soruda duruyor (bkz.
  // dailyTipStartBtn click handler) — etiket challenge.total'dan OKUNUYOR
  // (sabit "10" yazıp unutmak yerine tek doğruluk kaynağından), böylece sayı
  // asla koddaki gerçek davranıştan SAPAMAZ.
  if (els.dailyTipStartBtn) els.dailyTipStartBtn.textContent = `Seti başlat · ${challenge.total} soru`;
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

// G87: Prototip.dc.html'in Mod Seviyeleri satırı (satır 333-344) solda ayrıca
// küçük bir "sınav durumu" rozeti de gösteriyor (m.exam/m.examColor/...) — bu
// uygulamada kalıcı, moda özel bir sınav-geçti/kaldı geçmişi TUTULMUYOR
// (examSystem oturum-içi/bellek durumu, bkz. exam-system.js dosya başı notu;
// stats.examState[modeId].examLevel zaten "Sv N" rozetiyle AYNI sayı).
// Var olmayan bir durumu uydurmak yerine (CLAUDE.md "sayı uydurma") bu rozet
// BİLİNÇLİ olarak atlandı — satır sadece ilerleme çubuğu + "Sv N" taşıyor.
function renderModeLevels() {
  const modes = listModes();
  if (els.modeLevelsList) {
    els.modeLevelsList.innerHTML = modes.map(m => {
      const meta = m.getMeta();
      const catalogEntry = MODE_CATALOG.find(e => e.id === meta.id);
      const displayName = catalogEntry ? catalogEntry.ad : meta.id;
      const totalXp = modeTotalXp(m);
      const played = totalXp > 0;
      const xp = progress.xpProgress(totalXp);
      const pct = played ? Math.max(0, Math.min(100, Math.round((xp.current / xp.required) * 100))) : 0;
      return `<div class="prog-mode-row">
        <div class="prog-mode-body">
          <div class="prog-mode-name">${displayName}</div>
          <div class="prog-mode-track-row">
            <div class="prog-mode-track"><i style="width:${pct}%"></i></div>
          </div>
        </div>
        <div class="prog-mode-lv">${played ? `Sv ${xp.level}` : "Yeni"}</div>
      </div>`;
    }).join("");
  }
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

// G87: madde 6 "FREE'DE KİLİTLİ" — isZoneHistoryBlurred (zaten "geçmiş
// veri" adını taşıyan tek predicate, ESKİDEN sadece zone bar'larını
// bulanıklaştırmak için kullanılıyordu) İsabet Grafiği kartına da uygulandı.
function renderChartLock() {
  const locked = paywall.isZoneHistoryBlurred(isUserPro());
  if (els.accChartFilterWrap) els.accChartFilterWrap.classList.toggle("prog-blurred", locked);
  if (els.accChartLock) els.accChartLock.classList.toggle("hidden", !locked);
}

function renderAnalysis() {
  renderZonePanel();
  renderModeLevels();
  renderAccuracyChart();
  renderChartLock();
}

function pushHistory(correct) {
  // dblevel/boostcut'ın filterLabel'ı yok — ELSE dalına düşselerdi
  // "undefined · NaN Hz · ..." üretirdi (bkz. G22'de bulunan gerçek hata),
  // bu yüzden HER YENİ mod AYRI bir dal gerektiriyor.
  const desc = activeQuestion.mode === "proplus"
    ? `Pro Plus · ${labelSource(activeQuestion.source)}${activeQuestion.boss ? " · Boss" : ""}`
    : activeQuestion.mode === "dblevel"
    ? `dB Seviyesi · ${mode.correctLabel(activeQuestion)} · ${labelSource(activeQuestion.source)}${activeQuestion.boss ? " · Boss" : ""}`
    : activeQuestion.mode === "boostcut"
    ? `Boost/Cut · Katman ${activeQuestion.layer} · ${labelSource(activeQuestion.source)}${activeQuestion.boss ? " · Boss" : ""}`
    : activeQuestion.mode === "qwidth"
    ? `Q Genişliği · ${mode.correctLabel(activeQuestion)} · ${labelSource(activeQuestion.source)}${activeQuestion.boss ? " · Boss" : ""}`
    : activeQuestion.mode === "kompresor"
    ? `Kompresör · ${mode.correctLabel(activeQuestion)} · ${labelSource(activeQuestion.source)}${activeQuestion.boss ? " · Boss" : ""}`
    : activeQuestion.mode === "reverb"
    ? `Reverb · ${mode.correctLabel(activeQuestion)} · ${labelSource(activeQuestion.source)}${activeQuestion.boss ? " · Boss" : ""}`
    : activeQuestion.mode === "distortion"
    ? `Distortion · ${mode.correctLabel(activeQuestion)} · ${labelSource(activeQuestion.source)}${activeQuestion.boss ? " · Boss" : ""}`
    : activeQuestion.mode === "tonal-denge"
    ? `Tonal Denge · ${mode.correctLabel(activeQuestion)} · ${labelSource(activeQuestion.source)}${activeQuestion.boss ? " · Boss" : ""}`
    : `${activeQuestion.filterLabel} · ${formatHz(activeQuestion.freq)} · ${labelSource(activeQuestion.source)}${activeQuestion.boss ? " · Boss" : ""}`;
  // G87: desc'in KENDİSİ (yukarıdaki, her mod için AYRI test edilmiş dal
  // zinciri) DEĞİŞMEDİ — sadece "Son Cevaplar" kartının iki satırlık
  // (mod/detay + zaman) düzenine bölünüyor. ts YENİ alan — İLK KEZ eklendi,
  // "{{ ra.time }}" (Prototip.dc.html satır 228) için gerekli; ts'siz eski
  // (bu turdan önce kaydedilmiş) kayıtlar renderHistory'de "—" gösterir.
  const [firstSeg, ...restSeg] = desc.split(" · ");
  history.unshift({
    correct,
    label: firstSeg,
    detail: (correct ? "Doğru · " : "Kaçırıldı · ") + restSeg.join(" · "),
    ts: Date.now()
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
      toast("📅 Günlük görev tamamlandı", `${task.title} · +${task.reward} XP`, "daily");
    }
  });
  renderDaily();
}

function notifyNewAchievements() {
  const newly = progress.checkAchievements(stats);
  // G90 (madde 6): "badge" toast türü artık KENDİ altın rozet ikon kutusunu
  // çiziyor — a.icon emojisi başlığa BASILMIYOR (ikili ikon görünmesin diye),
  // ama a.icon'un KENDİSİ (achievementler listesi/İlerleme sekmesi) DEĞİŞMEDİ.
  newly.forEach(a => toast(a.title, a.desc, "badge"));
  // G82: Seans Sonu'nun "Yeni Rozet" kartı için — bu OTURUMDA açılan HER
  // başarım (toast'la aynı, mevcut rozet sistemine bkz. progress.ACHIEVEMENTS).
  session.newBadges.push(...newly);
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
// G77: Oyun ekranı ÜST BAR — Tasarim-2026-08/Oyun Ekranı Varyantları.dc.html +
// Prototip.dc.html (satır ~460-520) referansıyla. renderQuestion() (her yeni
// soru) VE updateUI() (her genel senkron — submit sonrası DAHİL, combo/hearts
// ANINDA güncellensin diye) içinden çağrılıyor. SAF DOM render — state
// mutasyonu YAPMAZ, sadece OKUR. #hearts/#levelChip/#gameInfoBtn/
// #gameSettingsBtn/#bossChip'in KENDİ güncelleme kodlarına (renderHearts(),
// updateUI() içindeki levelChipValue satırı, renderQuestion() içindeki
// bossChip satırları) DOKUNMAZ — SADECE onlarla birlikte görünecek YENİ
// öğeleri (combo/sayaç/zorluk/bölüm/sınav/hız) besler.
// ═══════════════════════════════════════════════════════════════════════════
// G92 (madde 12d): "çip SADECE seri arttığı anda tek seferlik flameGlow
// yapar (sürekli titremez)" — ÖNCEDEN combo>2 olduğu SÜRECE `infinite`
// animasyon çalışıyordu (sessizlik alanını ihlal ediyordu, DENETIM/G92'nin
// kendi doğrulama gerekçesi). Artık SADECE combo bir ÖNCEKİ render'a göre
// ARTMIŞSA bir kerelik (styles.css: .game-combo-chip.flame, sonlu
// iterasyon) tetikleniyor — lastRenderedCombo modül-seviyeli, SADECE bunun
// için tutuluyor.
let lastRenderedCombo = 0;
function renderGameHeader() {
  // G86 DÜZELTMESİ: Tasarim-2026-08/Prototip.dc.html satır 2579 —
  // comboLabel 'x'+GERÇEK stats.combo (TAM SAYI seri sayacı), comboBoost'un
  // (XP çarpanı, ondalıklı) DEĞİL — ikisi FARKLI kavramlar, eskiden
  // birbirine karıştırılmıştı ("x1.12" gösteriyordu, tasarım "x2"/"x3"
  // istiyor). Renkler tasarımın KENDİ eşiği (satır 2580-2583): combo<=1 sönük
  // amber, combo>1 parlak amber (boss'ta altın), combo>2 flameGlow.
  const combo = stats.combo || 0;
  const bossNow = !!(activeQuestion && activeQuestion.boss);
  // G93 (madde 4): Prototip.dc.html satır 2579-2582 — comboLabel/comboFill/
  // comboBg/comboBorder'ın HEPSİ `s.comboBreak` (SADECE seri kırıldığı
  // render'da true olan, bir sonrakinde otomatik false'a dönen GEÇİCİ bir
  // bayrak) tarafından yönetiliyor: comboBreak'te "x0" + kırmızı, aksi halde
  // "x{combo}" + amber. ÖNCEDEN (G86'dan beri) label HER ZAMAN ham
  // stats.combo'yu basıyordu — bu, seri hiç başlamamışken/kırıldıktan SONRA
  // (break flaşı bittikten sonra da) SÜREKLİ "x0" gösteriyordu (kullanıcı
  // raporu). isBreakMoment aşağıdaki "flame/break" tetikleyicisiyle AYNI
  // `combo===0 && lastRenderedCombo>0` ifadesi — SADECE o TEK render'da true,
  // bir sonraki render'da lastRenderedCombo zaten 0 olacağından kendiliğinden
  // "x1" tabanına döner (comboBreak'in prototipteki geçiciliğiyle AYNI etki,
  // ayrı bir zamanlayıcı GEREKMEDİ).
  const isBreakMoment = combo === 0 && lastRenderedCombo > 0;
  const displayCombo = isBreakMoment ? 0 : Math.max(1, combo);
  if (els.gameComboLabel) els.gameComboLabel.textContent = `x${displayCombo}`;
  if (els.gameComboChip) {
    const bright = combo > 1;
    const fill = isBreakMoment ? "#f87160" : bright ? (bossNow ? "#f6d878" : "#f0b442") : "#a8842f";
    els.gameComboChip.style.color = fill;
    els.gameComboChip.style.background = isBreakMoment ? "rgba(248,113,96,.16)" : bright ? "rgba(240,180,66,.14)" : "rgba(240,180,66,.07)";
    els.gameComboChip.style.borderColor = isBreakMoment ? "rgba(248,113,96,.55)" : bright ? "rgba(240,180,66,.45)" : "rgba(240,180,66,.2)";
    // Her render'da ÖNCE temizle + reflow zorla — AYNI class art arda iki
    // artışta da (flame flame) YENİDEN tetiklensin diye (CSS animasyonu
    // class zaten VARKEN tekrar eklenirse çalışmaz).
    els.gameComboChip.classList.remove("flame", "break");
    if (combo > 2 && combo > lastRenderedCombo) {
      void els.gameComboChip.offsetWidth;
      els.gameComboChip.classList.add("flame");
    } else if (isBreakMoment) {
      void els.gameComboChip.offsetWidth;
      els.gameComboChip.classList.add("break");
    }
    lastRenderedCombo = combo;
  }

  // Soru sayacı — ücretsiz oturum limiti (paywall.FREE_SESSION_QUESTION_LIMIT=5).
  // Pro'da anlamsız (sınır yok) — gizlenir.
  const pro = isUserPro();
  if (els.gameQCounter) els.gameQCounter.classList.toggle("hidden", pro);
  if (els.gameQNum) {
    els.gameQNum.textContent = Math.max(1, Math.min(roundsInThisPlaySession, paywall.FREE_SESSION_QUESTION_LIMIT));
  }

  // Zorluk göstergesi — SADECE bilgi (#difficultySelect'i okur, YAZMAZ —
  // oyun ortasında zorluk bu ÇİPTEN değiştirilemez, task'ın kendi kuralı).
  // G79: Otomatik moddaysa tasarımdaki gibi "OTOMATİK" yazar — module-level
  // `diffModeAuto` DEĞİL, AYNI koşulun (prefs.difficultyMode !== "fixed")
  // KENDİSİ okunuyor: renderGameHeader() updateUI() üzerinden SAYFA
  // AÇILIŞINDA senkron çağrılıyor, o an diffModeAuto HENÜZ TDZ'de (kendi
  // `let`i script'in çok daha AŞAĞISINDA) — canlı test bunu YAKALADI
  // (ReferenceError). prefs ise çok daha ERKEN (satır ~603) tanımlı, güvenli.
  // Türkçe büyük harf İ/i dönüşümü CSS text-transform'a GÜVENİLMEDİ (bilinen
  // hata, bkz. progress.js academyLevel yorumları), literal doğru-case string
  // burada yazılı. Sabit zorlukta gerçek tier adı (Kolay/Orta/Zor/Pro/Pro
  // Plus) — bu 5 metnin HİÇBİRİ noktalı küçük "i" içermediği için .toUpperCase()
  // güvenle kullanılabiliyor.
  if (els.gameDiffChip && els.difficultySelect && els.difficultySelect.selectedIndex >= 0) {
    els.gameDiffChip.textContent = prefs.difficultyMode !== "fixed"
      ? "OTOMATİK"
      : els.difficultySelect.options[els.difficultySelect.selectedIndex].text.toUpperCase();
    // G85: boss turunda zorluk çipi altına dönüyor (Prototip.dc.html'in genel
    // boss altın paleti, diffColor'ın kendisi koddan görünmüyor ama TUTARLI).
    els.gameDiffChip.classList.toggle("boss", !!(activeQuestion && activeQuestion.boss));
  }

  // Sınav/telafi fazı — kalpler YERİNE nokta göstergesi. EXAM_CONFIG.
  // EXAM_LENGTH(4)/REMEDIAL_LENGTH(5) kullanılır — PARKUR_LENGTH(10) İLE
  // KARIŞTIRILMAZ (o AYRI bir sistem, task'ın kendi uyarısı).
  const examActive = examGateActive() && examSystem.phase !== "parkur";
  if (els.hearts) els.hearts.classList.toggle("hidden", examActive);
  if (els.gameExamRow) els.gameExamRow.classList.toggle("hidden", !examActive);
  if (examActive && els.gameExamDots && els.gameExamProgress) {
    const isRemedial = examSystem.phase === "remedial";
    const total = isRemedial ? EXAM_CONFIG.REMEDIAL_LENGTH : EXAM_CONFIG.EXAM_LENGTH;
    const current = isRemedial ? examSystem.remedialIndex : examSystem.examIndex;
    // G84 DÜZELTMESİ: Prototip.dc.html'in examDots'u (satır ~2395) ÜÇ durumu
    // ayırt ediyor — i<correctCount ALTIN (doğru cevaplanmış), i<current
    // KIRMIZI (cevaplanmış ama YANLIŞ), kalanı GRİ (henüz cevaplanmamış).
    // G77 SADECE current'a bakıyordu (tek "on" durumu) — yanlış cevaplanan
    // sorular da altın görünüyordu, DÜZELTİLDİ.
    const correctCount = isRemedial ? examSystem.remedialCorrect : examSystem.examCorrect;
    els.gameExamDots.innerHTML = "";
    for (let i = 0; i < total; i++) {
      const dot = document.createElement("div");
      dot.className = `game-exam-dot${i < correctCount ? " on" : i < current ? " wrong" : ""}`;
      els.gameExamDots.appendChild(dot);
    }
    els.gameExamProgress.textContent = `${isRemedial ? "TELAFİ" : "SINAV"} ${Math.min(current + 1, total)}/${total}`;
  }

  // İkinci satır — boss SÜRE satırı > bölüm göstergesi. boss
  // activeQuestion.boss'tan okunur (startRound()'un ZATEN hesapladığı GERÇEK
  // değer, burada YENİDEN hesaplanmıyor).
  // G78: bölüm göstergesi artık challenge.active'e BAĞLI DEĞİL — tasarımda
  // HEP görünür (task'ın kendi kararı, G77'nin "sadece 10 Soruluk Bölüm'de"
  // kuralını DEĞİŞTİRİYOR). challenge PASİFKEN (Serbest) noktalar sönük
  // (.dim) + "BÖLÜM —"; AKTİFKEN normal challenge.done/total.
  // G84 DÜZELTMESİ: tasarımın showChapter'ı (`!boss && s.exam !== 'run'`,
  // Prototip.dc.html satır 2373) sınav/telafi fazında bölüm satırını da
  // GİZLİYOR — G77/G78 sadece `!boss` uyguluyordu, sınav/telafi sırasında
  // "BÖLÜM 10/10" ile "SINAV 2/4" ÇAKIŞIYORDU (aynı satırın altında,
  // ikisi de görünür kalıyordu). examActive eklendi.
  const boss = !!(activeQuestion && activeQuestion.boss);
  if (els.gameBossRow) els.gameBossRow.classList.toggle("hidden", !boss);
  // G85: spektrum kartının boss altın kenarlığı + alt şerit ortası
  // ("SPEKTRUM ANALİZÖRÜ" → "PRO ZORLUK · Q 4.0", Prototip.dc.html satır
  // 2594) — "Q 4.0" tasarımın KENDİ literal örnek değeri, GERÇEK bir Q
  // parametresi değil (bu genel bir zorluk rozeti, mod-spesifik bir Q
  // değeri YOK — uydurma sayılmaz, tasarımın AYNEN kopyası).
  if (els.analyzer) els.analyzer.classList.toggle("boss", boss);
  if (els.analyzerFootCaption && mode.SHOW_SPECTRUM !== false) {
    els.analyzerFootCaption.textContent = boss ? "PRO ZORLUK · Q 4.0" : "SPEKTRUM ANALİZÖRÜ";
  }
  const showChapter = !boss && !examActive;
  if (els.gameChapterRow) els.gameChapterRow.classList.toggle("hidden", !showChapter);
  if (els.gameSpeedRow) els.gameSpeedRow.classList.toggle("hidden", !showChapter);
  if (showChapter && els.gameChapterDots && els.gameChapterLabel) {
    els.gameChapterRow.classList.toggle("dim", !challenge.active);
    els.gameChapterDots.innerHTML = "";
    const total = challenge.active ? challenge.total : 10;
    for (let i = 0; i < total; i++) {
      const dot = document.createElement("div");
      dot.className = `game-chapter-dot${challenge.active && i < challenge.done ? " on" : ""}`;
      els.gameChapterDots.appendChild(dot);
    }
    els.gameChapterLabel.textContent = challenge.active
      ? `BÖLÜM ${Math.min(challenge.done + 1, challenge.total)}/${challenge.total}`
      : "BÖLÜM —";
  }
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

  // G86 DÜZELTMESİ: Frekans Bulma'nın DOKUNMALI (tek-işaret, choice DEĞİL)
  // biçiminde bu kutu Tasarim-2026-08/Prototip.dc.html'in isFreqMode
  // bloğunda (satır 530-740, TAMAMI okunup doğrulandı) HİÇ yok — kaldırıldı,
  // yerini #freqGuessArea'nın "Cevabını vermek için spektruma dokun" metni
  // alıyor (zaten oradaydı). Şıklı biçimde (isChoiceFormat) DOKUNULMADI —
  // task'ın kapsamı SADECE "dokunmalı" diyor, tasarımın showChoices bloğunda
  // da böyle bir kutu yok ama bu turun talimatı o kapsamı GENİŞLETMİYOR.
  const isFreqTouch = q.mode === "frequency" && !isChoiceFormat();
  els.questionTitle.classList.toggle("hidden", isFreqTouch);
  // G86: Motor 2 (Kompresör/Reverb/Distortion) — Prototip.dc.html'in
  // isCompMode başlığı (satır 759) "Farklı olanı bul", HER ÜÇ modda AYNI
  // (hangisinin FARKLI olduğunu soran eski mod-özel cümleler yerine) — alt
  // satır (questionMeta) da tasarımda YOK, boşaltıldı.
  const isM2 = q.mode === "kompresor" || q.mode === "reverb" || q.mode === "distortion";
  els.questionTitle.textContent = isFreqTouch ? ""
    : isM2 ? "Farklı olanı bul"
    : q.mode === "proplus" ? "4 frekansla oynandı — dördünü de dalga üzerinde işaretle."
    : q.mode === "cutoff" ? (q.typeRevealed
        ? `Bu bir ${q.filterLabel}, kesim frekansı nerede?`
        : "Ne tür filtre, hangi frekansta?")
    : q.mode === "dblevel" ? (q.directionRevealed
        ? `Bu ses ${q.directionLabel}, ne kadar?`
        : "Açıldı mı kısıldı mı, ne kadar?")
    : q.mode === "boostcut" ? mode.questionTitle(q)
    : q.mode === "qwidth" ? mode.questionTitle(q)
    : q.mode === "tonal-denge" ? `${q.bandCount} bant — kaydırıcılarla sesi nötüre getir.`
    : q.mode === "cakisma" ? mode.questionTitle(q)
    : "Hangi frekansla oynandı? Dalga üzerine tıkla.";
  if (isM2) els.questionTitle.classList.add("qline-m2"); else els.questionTitle.classList.remove("qline-m2");

  els.questionMeta.textContent = isFreqTouch || isM2 ? "" : mode.modeDescription(q);
  // G51: yeni bir cakisma sorusu render edilirken önceki sorunun öncesi/sonrası
  // karşılaştırma butonları KAPALI başlamalı (bkz. syncCakismaVisibility notu —
  // burada AYRICA çağrılıyor çünkü renderQuestion() her round'da tetiklenir,
  // enterMode() SADECE mod DEĞİŞİNCE).
  if (els.cakismaCompare) els.cakismaCompare.classList.add("hidden");
  els.streakText.textContent = q.boss ? "Boss round aktif" : (stats.combo > 1 ? `${stats.combo}x combo aktif` : "Yeni challenge");
  // prototype.html'de sayaç her zaman "Soru N/10" — ama tasarımda "Serbest (sonsuz)"
  // diye bir kavram hiç yok, oradaki "10" sabit varsayılan seans uzunluğu. Bizde bu
  // ayrım gerçek (challenge.active), bu yüzden "/10" SADECE 10 Soruluk Bölüm'de
  // gösteriliyor — Serbest'te sonsuz bir "/10" yanıltıcı olurdu.
  //
  // G47: mode.EXAM_ENABLED olan bir modda (bugün SADECE Kompresör) bu ayrım
  // GEÇERSİZ — kullanıcının onayladığı görev kararı gereği sınav sistemi HER
  // oyun uzunluğunda (Serbest DAHİL) arka planda 10'ar sorudan parkur sayar,
  // bu yüzden challenge.active'DEN BAĞIMSIZ HER ZAMAN examSystem.label()
  // kullanılır ("Soru N/10" / "Sınav N/4" / "Telafi N/5" — bkz. core/
  // exam-system.js). Export etmeyen diğer yedi modda mode.EXAM_ENABLED
  // undefined → bu dal hiç çalışmaz, ÖNCEKİ davranış BİREBİR aynı kalır.
  els.roundChip.textContent = examGateActive()
    ? examSystem.label()
    : challenge.active
    ? `Soru ${challenge.done + 1}/${challenge.total}`
    : `Soru ${stats.rounds + 1}`;
  els.scoreChip.textContent = `Skor ${diffState().score}`;
  els.bossChip.textContent = q.boss ? "Boss" : "Normal";
  // G92 (madde 12e): "bossPulse sadece boss rozetinde" — TEMEL KURAL'ın
  // sessizlik alanı gereği SÜREKLİ/infinite DEĞİL, bu YENİ round'un başında
  // BİR KEZ (className zaten her yeni soruda TEK sefer yeniden yazılıyor,
  // "pulse" da onunla birlikte tazeleniyor) — birkaç saniyede biter, kullanıcı
  // dinleme/karar fazına geçtiğinde ekranda hiçbir şey animasyonlu değildir.
  els.bossChip.className = `chip ${q.boss ? "boss pulse" : ""}`;

  freqGuessHz = null; freqHoverHz = null;
  cutoffGuess = null;
  dbGuess = null;
  boostCutGuess = null;
  qGuessLabelId = null;
  threeWayGuessLetter = null;
  threeWayPlayLetter = "A";
  threeWaySelectedLetter = null;
  tonalDengeCorrections = {};
  cakismaGuess = null;
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
    q.mode === "proplus" ? "A/B ile karşılaştır. 4 frekansla oynandı (kimi açık, kimi kısık). Dört noktaya da tıkla."
    : q.mode === "cutoff" ? "A/B ile karşılaştır, sonra aşağıdaki şıklardan kesim frekansını seç."
    : q.mode === "dblevel" ? "A/B ile karşılaştır, sonra aşağıdaki şıklardan dB farkını seç."
    : q.mode === "boostcut" ? mode.modeDescription(q)
    : q.mode === "qwidth" ? "A/B ile karşılaştır, sonra aşağıdaki şıklardan genişlik karakterini seç."
    : q.mode === "kompresor" ? "A/B/C ile üçünü de dinle, sonra aşağıdaki şıklardan FARKLI olanı seç."
    : q.mode === "reverb" ? "A/B/C ile üçünü de dinle, sonra aşağıdaki şıklardan reverb'i FARKLI olanı seç."
    : q.mode === "distortion" ? "A/B/C ile üçünü de dinle, sonra aşağıdaki şıklardan distortion'ı FARKLI olanı seç."
    : q.mode === "tonal-denge" ? "Dinle, kaydırıcılarla düzelt, sesi nötr/dengeli hale getirmeye çalış — sonra onayla."
    : q.mode === "cakisma" ? mode.modeDescription(q)
    : "A/B ile karşılaştır, sonra dalga üzerine tıklayıp doğru frekansı işaretle."
  );
  renderGameHeader();
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
  // G97 (madde 3): boss round'da combo YİNE sıfırlanır — bu turun kendi
  // kararı (task "combo'yu sen değerlendir" dedi). Gerekçe: combo "art arda
  // DOĞRU cevap" sayacı, süresi dolan bir soru DOĞRU cevaplanmadı — can
  // BAĞIŞLANIYOR (boss orantısız zor olduğu için cezası ağır olmasın diye)
  // ama bu, sorunun GERÇEKTEN kaçtığı gerçeğini değiştirmiyor. Combo'yu da
  // korumak boss'u "Atla" ile ayrımsız, sıfır bedelli bir buton yapardı —
  // boss YİNE bir meydan okuma olarak kalsın diye SADECE can ekseni
  // yumuşatıldı, combo ekseni DOKUNULMADI (mevcut davranışla AYNI).
  stats.combo = 0;
  diffState().score = Math.max(0, diffState().score - 20); // skor 0 altına inmez
  session.wrong++;
  audioEngine.stopAudio();
  // G97 (madde 3): boss sorusunda süre dolması artık can GÖTÜRMÜYOR — boss
  // zaten ramp'in en zor noktasından (+2.0 ofset, bkz. G96) çalıyor, süre de
  // kısalıyor (Math.max(6,...) — normal sorudan kısa) — süre yetişememe
  // ihtimali orantısız yüksek, bunu normal bir "yanlış cevap" gibi
  // cezalandırmak (can + combo + XP kaybı üstüne) haksız buluyordu (task'ın
  // kendi kararı). XP zaten timeout'ta HİÇBİR ZAMAN verilmiyordu (calculateXP
  // bu fonksiyondan hiç çağrılmıyor) — "XP verilmesin"/"boss çarpanı
  // uygulanmasın" kriterleri bu yüzden EK bir değişiklik gerektirmeden zaten
  // sağlanıyor, tek GERÇEK davranış değişikliği loseLife()'ın atlanması.
  // Normal (boss olmayan) sorularda TEK SATIR değişmedi — loseLife() AYNEN
  // çağrılmaya devam ediyor.
  const bossTimeout = !!activeQuestion.boss;
  if (bossTimeout) {
    setFeedback("Boss süresi doldu", `Soru kaçtı, can gitmedi. Doğru cevap: ${mode.correctLabel(activeQuestion)}.`, true, true);
  } else {
    loseLife(`Süre doldu. Doğru cevap: ${mode.correctLabel(activeQuestion)}.`);
  }
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
    // G82: Seans Sonu'nun XP kırılımı ("Temel XP" satırı) için — G81'in
    // xpBaseFor()'u burada da TEK gerçek kaynak, UYDURULMUŞ bir sayı yok
    // (bkz. showSessionEnd/buildXpRows).
    session.xpBaseSum = (session.xpBaseSum || 0) + xpBaseFor(q, q.difficulty);

    const feedback = mode.getFeedbackData(q, guessHz, { gained });
    // G81: Frekans Bulma artık DİĞER DOKUZ modla AYNI yüzeyi (#feedbackBox)
    // kullanıyor — #freqInfo SADECE Pro Plus için kalıyor (bkz. submitProPlusGuess).
    // Bu, #freqInfo'nun display:none aç/kapa'sının yol açtığı ~201px ekran
    // kaymasını da kapatıyor (G58'de diğer sekiz mod için yapılan visibility
    // düzeltmesi artık Frekans Bulma'ya da uygulanmış oluyor, bkz. .fb CSS).
    // title/detail feedback.title/detail'İN KENDİSİ (mode dosyası DEĞİŞMEDİ);
    // subtitle/açıklama result.zone/act/quality gibi ZATEN VAR OLAN yapılı
    // veriden türetiliyor, UYDURULMUŞ metin yok.
    setFeedback(feedback.title, feedback.detail, true, false);
    setFeedbackSubtitle(`${formatHz(q.freq)} ${result.act} · ${result.zone.t.split(" (")[0]}`);
    showXpBreakdown(q, q.difficulty, gained);
    showFrequencyEars(true, guessHz);
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
    // G81: aynı — #freqInfo yerine #feedbackBox. "Kalan can: N" (loseLife
    // SONRASI okunan GÜNCEL değer) appendExamNote'un AYNI deseniyle
    // #feedbackDetail'e eklenir (bkz. o fonksiyon).
    setFeedback(feedback.title, feedback.detail, true, true);
    setFeedbackSubtitle(`Sen ${formatHz(result.guessHz)} dedin (${mode.closenessWord(result.dOct)}, ${result.dir})`);
    showFrequencyEars(false, result.guessHz);
    mode.recordZone(zoneStats, q.freq, false, result.dOct);
    audioEngine.sfxBuzz();
    shake(els.canvas);
    loseLife("Frekansı ıskaladın.", { silent: true });
    // "Kalan can: N" — appendExamNote'un (bkz. o fonksiyon) AYNI "zaten
    // yazılmış karta ekle" deseni, SADECE isim sınav'a özgü olduğu için
    // burada aynı tek satır tekrarlanıyor (currentLives, loseLife SONRASI
    // okunan GÜNCEL değer).
    if (els.feedbackDetail) {
      const note = currentLives > 0 ? `Kalan can: ${currentLives}` : "Canların tükendi.";
      els.feedbackDetail.textContent = `${els.feedbackDetail.textContent} ${note}`;
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
  const gameOver = finalizeIfGameOver();
  // G50: sınav sistemi — submitThreeWayGuess'in AYNI kablolaması (bkz. o
  // fonksiyondaki not) — SADECE mode.EXAM_ENABLED true iken (G50'den beri
  // Frekans Bulma) çağrılır.
  const examHandled = !gameOver && examGateActive() && handleExamOutcome(q, result, gained);
  if (!gameOver && !examHandled) scheduleNext(prefs.feedbackScreen ? (result.correct ? 4000 : 6000) : QUICK_ADVANCE_MS);
}

// Kesim Noktası ("cutoff") için submitFrequencyGuess'in YAPISAL PARALELİ — bilerek
// AYRI bir fonksiyon (paylaşılan bir "submitAnswer" özütlemesi yerine): iki modun
// soru şekli (freq+gain'e karşı freq+filterType) ve geri bildirimi (zengin panel'e
// karşı sade metin — bkz. kesim-noktasi.js dosya başı not) yeterince farklı ki ortak
// bir gövde ya dallanmayla karmaşıklaşır ya da yanlışlıkla frekans-bulma'yı bozma
// riski taşır. ŞABLON niyeti tam olarak bu: bir SONRAKİ mod da muhtemelen kendi
// submitXGuess'ini yazacak, gerçek tekrar ağrısı 3. modda netleşince ortak bir
// çekirdek çıkarılabilir.
// answer: { freq, filterType } — bkz. .ans click-delegasyonu ve kesim-noktasi.js
// evaluateAnswer.
function submitCutoffGuess(answer) {
  if (!roundActive || !activeQuestion || activeQuestion.mode !== "cutoff") return;
  if (!answer || answer.freq == null) return;
  roundActive = false;
  roundFlow.clearTimer();
  setActionbarTucked(true);

  const q = activeQuestion;
  const result = mode.evaluateAnswer(q, answer);
  setAnalyzerPhase("done");
  if (els.gainValue) els.gainValue.textContent = ""; // bu modda "gain" kavramı yok
  if (isChoiceFormat()) mode.markAnswerChoices(els.answers, q, answer);
  // G19: filtre eğrisi görseli için — drawVisualizer'ın overlayState'ine geçiyor
  // (bkz. cutoffGuess tanımındaki not). answer.filterType tip-gizli sorularda
  // YANLIŞ olabilir — bilerek AYNEN taşınıyor, eğri de o yanlış tipte çizilsin diye.
  cutoffGuess = { freq: answer.freq, filterType: answer.filterType };

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
    modeState().xp += gained;
    diffState().score += gained * Math.max(1, stats.combo);
    diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
    if (q.difficulty === "pro") stats.proCorrect++;
    if (q.boss) stats.bossWins++;
    session.correct++; session.xp += gained;
    // G82: Seans Sonu'nun XP kırılımı ("Temel XP" satırı) için — G81'in
    // xpBaseFor()'u burada da TEK gerçek kaynak, UYDURULMUŞ bir sayı yok
    // (bkz. showSessionEnd/buildXpRows).
    session.xpBaseSum = (session.xpBaseSum || 0) + xpBaseFor(q, q.difficulty);

    const feedback = mode.getFeedbackData(q, answer, { gained });
    // G20: Kesim Noktası'nın zengin bir #freqInfo paneli YOK (bilerek, bkz.
    // kesim-noktasi.js dosya başı not) — #feedbackBox bu modun TEK geri
    // bildirim yüzeyi, o yüzden showResult:true (Frekans Bulma'nın #freqInfo
    // kullandığı için showResult:false geçtiği yerlerle KARIŞTIRILMASIN —
    // buradaki `false` öğretici metnin hiç görünmemesine yol açan bir hataydı).
    setFeedback(feedback.title, feedback.detail, feedback.showResult, false);
    showXpBreakdown(q, q.difficulty, gained);
    mode.recordZone(zoneStats, q.freq, true, result.dOct);
    audioEngine.sfxDing();
    spawnXp(`+${gained} XP`, els.canvas);
    burst(els.canvas);
    challengeTick(true, gained);
  } else {
    stats.wrong++;
    stats.combo = 0;
    diffState().score = Math.max(0, diffState().score - 20);
    session.wrong++;

    const feedback = mode.getFeedbackData(q, answer, { gained: 0 });
    setFeedback(feedback.title, feedback.detail, feedback.showResult, true);
    mode.recordZone(zoneStats, q.freq, false, result.dOct);
    audioEngine.sfxBuzz();
    shake(els.canvas);
    loseLife("Kesim noktasını ıskaladın.", { silent: true });
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
  // G21: Frekans Bulma'nın #freqInfo süresiyle AYNI formül — G20'de eklenen
  // öğretici metin + iki renkli filtre eğrisi (bkz. drawOverlay) okunacak
  // içerik-yoğun bir kart, eskisi gibi hep QUICK_ADVANCE_MS (700ms) kullanmak
  // kullanıcı metni okumadan geçiyordu (kullanıcı raporu). "Geri bildirim
  // ekranı" ayarı kapalıyken (prefs.feedbackScreen=false) Frekans Bulma'da da
  // zengin panel hiç açılmadan hızlı geçildiği için AYNI mantık burada da
  // geçerli — kart yoksa/istenmiyorsa hızlı geç. Her zaman "Atla ▶" (els.
  // nextBtn → goToNextRound()) İLE ya da G27'den beri #feedbackBox'ın KENDİ
  // X'iyle (bkz. #feedbackClose, merkezi delegasyon) ANINDA atlanabilir.
  const gameOver = finalizeIfGameOver();
  // G50: sınav sistemi — submitThreeWayGuess'in AYNI kablolaması.
  const examHandled = !gameOver && examGateActive() && handleExamOutcome(q, result, gained);
  if (!gameOver && !examHandled) scheduleNext(prefs.feedbackScreen ? (result.correct ? 4000 : 6000) : QUICK_ADVANCE_MS);
}

// dB Seviyesi ("dblevel") için submitCutoffGuess'in YAPISAL PARALELİ — aynı ŞABLON
// gerekçesi (bkz. submitCutoffGuess dosya başı not): 3. modda bile gerçek tekrar
// ağrısı ortak bir "submitAnswer" özütlemesini haklı çıkaracak kadar netleşmedi
// (üç modun da soru şekli/geri bildirimi farklı — freq+gain / freq+filterType /
// tek işaretli sayı), bu yüzden ayrı bir fonksiyon.
// answer: value (Number, işaretli dB) — bkz. .ans click-delegasyonu ve
// db-seviyesi.js evaluateAnswer. Bu modda mode.recordZone HİÇ çağrılmıyor —
// seviye değişimi tek bir frekans BÖLGESİNE ait değil (tüm spektrumu eşit
// etkiler), zoneStats'ın "hangi bölgede zayıfsın" kavramı burada anlamsız.
function submitLevelGuess(value) {
  if (!roundActive || !activeQuestion || activeQuestion.mode !== "dblevel") return;
  if (!Number.isFinite(value)) return;
  roundActive = false;
  roundFlow.clearTimer();
  setActionbarTucked(true);

  const q = activeQuestion;
  const result = mode.evaluateAnswer(q, value);
  setAnalyzerPhase("done");
  if (els.gainValue) els.gainValue.textContent = ""; // bu modda ayrı bir "gain" göstergesi yok, kendi dB göstergesi var (bkz. drawOverlay)
  if (isChoiceFormat()) mode.markAnswerChoices(els.answers, q, value);
  // Cevap sonrası dB göstergesi için — drawVisualizer'ın overlayState'ine geçiyor
  // (bkz. dbGuess tanımındaki not, Kesim Noktası'nın cutoffGuess'iyle AYNI desen).
  dbGuess = value;

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
    modeState().xp += gained;
    diffState().score += gained * Math.max(1, stats.combo);
    diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
    if (q.difficulty === "pro") stats.proCorrect++;
    if (q.boss) stats.bossWins++;
    session.correct++; session.xp += gained;
    // G82: Seans Sonu'nun XP kırılımı ("Temel XP" satırı) için — G81'in
    // xpBaseFor()'u burada da TEK gerçek kaynak, UYDURULMUŞ bir sayı yok
    // (bkz. showSessionEnd/buildXpRows).
    session.xpBaseSum = (session.xpBaseSum || 0) + xpBaseFor(q, q.difficulty);

    const feedback = mode.getFeedbackData(q, value, { gained });
    setFeedback(feedback.title, feedback.detail, feedback.showResult, false);
    showXpBreakdown(q, q.difficulty, gained);
    audioEngine.sfxDing();
    spawnXp(`+${gained} XP`, els.canvas);
    burst(els.canvas);
    challengeTick(true, gained);
  } else {
    stats.wrong++;
    stats.combo = 0;
    diffState().score = Math.max(0, diffState().score - 20);
    session.wrong++;

    const feedback = mode.getFeedbackData(q, value, { gained: 0 });
    setFeedback(feedback.title, feedback.detail, feedback.showResult, true);
    audioEngine.sfxBuzz();
    shake(els.canvas);
    loseLife("dB farkını ıskaladın.", { silent: true });
    challengeTick(false, 0);
  }

  audioEngine.stopAudio();
  pushHistory(result.correct);
  updateDaily(result.correct);
  accumulatePracticeTime();
  recordAndPersistDailyAccuracy(result.correct);
  notifyNewAchievements();
  updateUI();
  persistStats();
  persistDaily();
  // Diğer iki modla AYNI hizalı geçiş formülü (bkz. G21) — öğretici metin +
  // görsel dB göstergesi okunacak içerik taşıyor, eskisi gibi hep 700ms kullanmak
  // kullanıcı metni okumadan geçirirdi. G27'den beri #feedbackBox'ın KENDİ X'i
  // (#feedbackClose) de var — merkezi delegasyon, bu mod hiçbir şey eklemedi.
  const gameOver = finalizeIfGameOver();
  // G50: sınav sistemi — submitThreeWayGuess'in AYNI kablolaması.
  const examHandled = !gameOver && examGateActive() && handleExamOutcome(q, result, gained);
  if (!gameOver && !examHandled) scheduleNext(prefs.feedbackScreen ? (result.correct ? 4000 : 6000) : QUICK_ADVANCE_MS);
}

// Boost/Cut ("boostcut") için submitLevelGuess'in YAPISAL PARALELİ — aynı ŞABLON
// gerekçesi. answer şekli KATMANA göre değişir (bkz. .ans click-delegasyonu ve
// boost-mu-cut-mu.js evaluateAnswer): Katman 1 → { direction }, Katman 2 →
// { gainDb }, Katman 3 → { freq, gainDb }. mode.recordZone SADECE Katman 3'te
// çağrılır — Katman 1/2'de frekans zaten VERİLMİŞ, "hangi bölgede zayıfsın"
// ölçümü ancak kullanıcı frekansı GERÇEKTEN aradığında (Katman 3) anlamlı.
function submitBoostCutGuess(answer) {
  if (!roundActive || !activeQuestion || activeQuestion.mode !== "boostcut") return;
  if (!answer) return;
  roundActive = false;
  roundFlow.clearTimer();
  setActionbarTucked(true);

  const q = activeQuestion;
  const result = mode.evaluateAnswer(q, answer);
  setAnalyzerPhase("done");
  if (els.gainValue) els.gainValue.textContent = "";
  if (isChoiceFormat()) mode.markAnswerChoices(els.answers, q, answer);
  // Cevap-sonrası bell-eğrisi için — Katman 1/2'de kullanıcı frekansı guess
  // ETMEDİ (verilmişti), o yüzden guess eğrisinin freq'i her zaman q.freq;
  // sadece Katman 3'te answer.freq gerçek bir guess'tir (bkz. boostCutGuess
  // tanımındaki not).
  const guessGainDb = q.layer === 1
    ? (Math.abs(q.gainDb) * (answer.direction === "cut" ? -1 : 1))
    : answer.gainDb;
  const guessFreq = q.layer === 3 ? answer.freq : q.freq;
  boostCutGuess = { freq: guessFreq, gainDb: guessGainDb };

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
    modeState().xp += gained;
    diffState().score += gained * Math.max(1, stats.combo);
    diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
    if (q.difficulty === "pro") stats.proCorrect++;
    if (q.boss) stats.bossWins++;
    session.correct++; session.xp += gained;
    // G82: Seans Sonu'nun XP kırılımı ("Temel XP" satırı) için — G81'in
    // xpBaseFor()'u burada da TEK gerçek kaynak, UYDURULMUŞ bir sayı yok
    // (bkz. showSessionEnd/buildXpRows).
    session.xpBaseSum = (session.xpBaseSum || 0) + xpBaseFor(q, q.difficulty);

    const feedback = mode.getFeedbackData(q, answer, { gained });
    setFeedback(feedback.title, feedback.detail, feedback.showResult, false);
    showXpBreakdown(q, q.difficulty, gained);
    if (q.layer === 3) mode.recordZone(zoneStats, q.freq, true, result.dOct);
    audioEngine.sfxDing();
    spawnXp(`+${gained} XP`, els.canvas);
    burst(els.canvas);
    challengeTick(true, gained);
  } else {
    stats.wrong++;
    stats.combo = 0;
    diffState().score = Math.max(0, diffState().score - 20);
    session.wrong++;

    const feedback = mode.getFeedbackData(q, answer, { gained: 0 });
    setFeedback(feedback.title, feedback.detail, feedback.showResult, true);
    if (q.layer === 3) mode.recordZone(zoneStats, q.freq, false, result.dOct);
    audioEngine.sfxBuzz();
    shake(els.canvas);
    loseLife("Boost/Cut'ı ıskaladın.", { silent: true });
    challengeTick(false, 0);
  }

  if (q.layer === 3) storage.saveZoneStats(zoneStats);
  audioEngine.stopAudio();
  pushHistory(result.correct);
  updateDaily(result.correct);
  accumulatePracticeTime();
  recordAndPersistDailyAccuracy(result.correct);
  notifyNewAchievements();
  updateUI();
  persistStats();
  persistDaily();
  // Diğer üç modla AYNI hizalı geçiş formülü (bkz. G21). G27: "en sonda merkezi
  // eklenecek" notu artık gerçekleşti — #feedbackBox'ın KENDİ X'i (#feedbackClose)
  // bu mod hiçbir şey eklemeden otomatik geldi.
  const gameOver = finalizeIfGameOver();
  // G50: sınav sistemi — submitThreeWayGuess'in AYNI kablolaması.
  const examHandled = !gameOver && examGateActive() && handleExamOutcome(q, result, gained);
  if (!gameOver && !examHandled) scheduleNext(prefs.feedbackScreen ? (result.correct ? 4000 : 6000) : QUICK_ADVANCE_MS);
}

// Q Genişliği ("qwidth") için submitBoostCutGuess'in YAPISAL PARALELİ — aynı
// ŞABLON gerekçesi. answer: etiket id'si (string, "notch"/"dar"/"orta"/"genis"/
// "cokgenis") — bkz. .ans click-delegasyonu ve q-genisligi.js evaluateAnswer.
// mode.recordZone HİÇ ÇAĞRILMIYOR — dB Seviyesi'nin AYNI kararı: frekans bu
// modda kullanıcıya hiç açıklanmıyor/guess ettirilmiyor (sadece genişlik
// sorulur), "hangi bölgede zayıfsın" ölçümü burada anlamsız.
function submitQWidthGuess(labelId) {
  if (!roundActive || !activeQuestion || activeQuestion.mode !== "qwidth") return;
  if (!labelId) return;
  roundActive = false;
  roundFlow.clearTimer();
  setActionbarTucked(true);

  const q = activeQuestion;
  const result = mode.evaluateAnswer(q, labelId);
  setAnalyzerPhase("done");
  if (els.gainValue) els.gainValue.textContent = "";
  if (isChoiceFormat()) mode.markAnswerChoices(els.answers, q, labelId);
  // Cevap-sonrası bell-eğrisi için — drawVisualizer'ın overlayState'ine geçiyor
  // (bkz. qGuessLabelId tanımındaki not).
  qGuessLabelId = labelId;

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
    modeState().xp += gained;
    diffState().score += gained * Math.max(1, stats.combo);
    diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
    if (q.difficulty === "pro") stats.proCorrect++;
    if (q.boss) stats.bossWins++;
    session.correct++; session.xp += gained;
    // G82: Seans Sonu'nun XP kırılımı ("Temel XP" satırı) için — G81'in
    // xpBaseFor()'u burada da TEK gerçek kaynak, UYDURULMUŞ bir sayı yok
    // (bkz. showSessionEnd/buildXpRows).
    session.xpBaseSum = (session.xpBaseSum || 0) + xpBaseFor(q, q.difficulty);

    const feedback = mode.getFeedbackData(q, labelId, { gained });
    setFeedback(feedback.title, feedback.detail, feedback.showResult, false);
    showXpBreakdown(q, q.difficulty, gained);
    audioEngine.sfxDing();
    spawnXp(`+${gained} XP`, els.canvas);
    burst(els.canvas);
    challengeTick(true, gained);
  } else {
    stats.wrong++;
    stats.combo = 0;
    diffState().score = Math.max(0, diffState().score - 20);
    session.wrong++;

    const feedback = mode.getFeedbackData(q, labelId, { gained: 0 });
    setFeedback(feedback.title, feedback.detail, feedback.showResult, true);
    audioEngine.sfxBuzz();
    shake(els.canvas);
    loseLife("Genişlik karakterini ıskaladın.", { silent: true });
    challengeTick(false, 0);
  }

  audioEngine.stopAudio();
  pushHistory(result.correct);
  updateDaily(result.correct);
  accumulatePracticeTime();
  recordAndPersistDailyAccuracy(result.correct);
  notifyNewAchievements();
  updateUI();
  persistStats();
  persistDaily();
  // Diğer dört modla AYNI hizalı geçiş formülü (bkz. G21). #feedbackBox'ın
  // KENDİ X'i (#feedbackClose, G27) de merkezi delegasyondan otomatik geldi.
  const gameOver = finalizeIfGameOver();
  // G50: sınav sistemi — submitThreeWayGuess'in AYNI kablolaması.
  const examHandled = !gameOver && examGateActive() && handleExamOutcome(q, result, gained);
  if (!gameOver && !examHandled) scheduleNext(prefs.feedbackScreen ? (result.correct ? 4000 : 6000) : QUICK_ADVANCE_MS);
}

// Motor 2'nin (A/B/C odd-one-out) HER modu için ORTAK submit fonksiyonu —
// G30'da Kompresör'e özgü submitKompresorGuess olarak yazılmıştı, G35'te
// Reverb eklenirken gövdesinin ZATEN tamamen mode-agnostik olduğu görüldü
// (mode.evaluateAnswer/getFeedbackData/calculateXP/markAnswerChoices'ın
// GENERİK dispatch'i sayesinde) — SADECE guard koşulu ve değişken isimleri
// mod-özeldi, o yüzden burada genelleştirildi (diğer Motor 1 modlarının
// KENDİ submit fonksiyonlarını KORUDUĞU "3. modda bile ortak özütleme
// haklı çıkmadı" kararından FARKLI: Motor 2'nin 2. modu bu tekrar ağrısını
// GERÇEKTEN netleştirdi). answer: harf ("A"/"B"/"C") — bkz. .ans click-
// delegasyonu. mode.recordZone HİÇ ÇAĞRILMIYOR — Motor 2 modlarının bir
// frekans-bölgesi kavramı yok (dB Seviyesi'yle AYNI karar).
function submitThreeWayGuess(letter) {
  if (!roundActive || !isThreeWayQuestion(activeQuestion)) return;
  if (!letter) return;
  roundActive = false;
  roundFlow.clearTimer();
  setActionbarTucked(true);

  const q = activeQuestion;
  const result = mode.evaluateAnswer(q, letter);
  setAnalyzerPhase("done");
  if (els.gainValue) els.gainValue.textContent = "";
  if (isChoiceFormat()) mode.markAnswerChoices(els.answers, q, letter);
  // Cevap-sonrası görsel için — drawVisualizer'ın overlayState'ine geçiyor
  // (bkz. threeWayGuessLetter tanımındaki not).
  threeWayGuessLetter = letter;

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
    modeState().xp += gained;
    diffState().score += gained * Math.max(1, stats.combo);
    diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
    if (q.difficulty === "pro") stats.proCorrect++;
    if (q.boss) stats.bossWins++;
    session.correct++; session.xp += gained;
    // G82: Seans Sonu'nun XP kırılımı ("Temel XP" satırı) için — G81'in
    // xpBaseFor()'u burada da TEK gerçek kaynak, UYDURULMUŞ bir sayı yok
    // (bkz. showSessionEnd/buildXpRows).
    session.xpBaseSum = (session.xpBaseSum || 0) + xpBaseFor(q, q.difficulty);

    const feedback = mode.getFeedbackData(q, letter, { gained });
    setFeedback(feedback.title, feedback.detail, feedback.showResult, false);
    showXpBreakdown(q, q.difficulty, gained);
    audioEngine.sfxDing();
    spawnXp(`+${gained} XP`, els.canvas);
    burst(els.canvas);
    challengeTick(true, gained);
  } else {
    stats.wrong++;
    stats.combo = 0;
    diffState().score = Math.max(0, diffState().score - 20);
    session.wrong++;

    const feedback = mode.getFeedbackData(q, letter, { gained: 0 });
    setFeedback(feedback.title, feedback.detail, feedback.showResult, true);
    audioEngine.sfxBuzz();
    shake(els.canvas);
    loseLife("Farklı sesi ıskaladın.", { silent: true });
    challengeTick(false, 0);
  }

  audioEngine.stopAudio();
  pushHistory(result.correct);
  updateDaily(result.correct);
  accumulatePracticeTime();
  recordAndPersistDailyAccuracy(result.correct);
  notifyNewAchievements();
  updateUI();
  persistStats();
  persistDaily();
  // Canlar burada bittiyse (Pro/simüle Pro'da HİÇ tetiklenmez, bkz. loseLife notu)
  // seans-sonu ekranı ÖNCELİKLİ — sınav sheet'leri bir game-over ekranının
  // ÜSTÜNE açılmamalı, o yüzden gameOver ÖNCE kontrol edilir.
  const gameOver = finalizeIfGameOver();
  // G47: sınav sistemi — SADECE mode.EXAM_ENABLED true iken (bugün Kompresör)
  // çağrılır, Reverb (AYNI fonksiyonu paylaşıyor) tamamen ETKİLENMEDEN eski
  // yoldan devam eder. handleExamOutcome true dönerse (sheet açıldı, akış
  // KENDİSİ yönetiyor demek) normal scheduleNext ATLANIR.
  const examHandled = !gameOver && examGateActive() && handleExamOutcome(q, result, gained);
  // Diğer beş modla AYNI hizalı geçiş formülü (bkz. G21). #feedbackBox'ın
  // KENDİ X'i (#feedbackClose, G27) de merkezi delegasyondan otomatik geldi.
  if (!gameOver && !examHandled) scheduleNext(prefs.feedbackScreen ? (result.correct ? 4000 : 6000) : QUICK_ADVANCE_MS);
}

// Tonal Denge (G45) — submitThreeWayGuess'in YAPISAL PARALELİ (AYNI genel
// akış: sonuç hesapla → XP/can/combo → feedback → geçiş) ama answer bir HARF
// DEĞİL, kaydırıcılardan toplanan {bandId: correctionDb} haritası
// (tonalDengeCorrections, bkz. tanımındaki not). "Cevabı Onayla" butonuna
// basınca çağrılır (bkz. "Tonal Denge — canlı EQ kaydırıcıları" bölümü).
function submitTonalDengeGuess() {
  if (!roundActive || !activeQuestion || activeQuestion.mode !== "tonal-denge") return;
  roundActive = false;
  roundFlow.clearTimer();
  setActionbarTucked(true);

  const q = activeQuestion;
  const answer = { ...tonalDengeCorrections };
  const result = mode.evaluateAnswer(q, answer);
  setAnalyzerPhase("done");
  if (els.gainValue) els.gainValue.textContent = "";
  mode.markAnswerChoices(els.answers, q, answer);

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
    modeState().xp += gained;
    diffState().score += gained * Math.max(1, stats.combo);
    diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
    if (q.difficulty === "pro") stats.proCorrect++;
    if (q.boss) stats.bossWins++;
    session.correct++; session.xp += gained;
    // G82: Seans Sonu'nun XP kırılımı ("Temel XP" satırı) için — G81'in
    // xpBaseFor()'u burada da TEK gerçek kaynak, UYDURULMUŞ bir sayı yok
    // (bkz. showSessionEnd/buildXpRows).
    session.xpBaseSum = (session.xpBaseSum || 0) + xpBaseFor(q, q.difficulty);

    const feedback = mode.getFeedbackData(q, answer, { gained });
    setFeedback(feedback.title, feedback.detail, feedback.showResult, false);
    // Tonal Denge'nin calculateXP'si (bkz. modes/tonal-denge.js) combo/boss/hız/
    // ipucu/bölüm'ün DIŞINDA GERÇEK bir 6. çarpan taşıyor: proximityBoost —
    // doğru sayılan bir cevapta bile nötüre ne kadar yakın kalındığına göre
    // (result.proximityScore) XP'yi ölçekler. Diğer 9 modda YOK — sadece burada,
    // AYNI formülle (Math.max(.55, proximityScore/100)) kırılıma eklendi; mode'un
    // KENDİ "Yakınlık %N" terminolojisi (bkz. getFeedbackData/o dosyanın notu)
    // kullanıldı, UYDURULMUŞ bir etiket değil.
    showXpBreakdown(q, q.difficulty, gained, { label: "yakınlık", value: Math.max(0.55, (result.proximityScore || 0) / 100) });
    audioEngine.sfxDing();
    spawnXp(`+${gained} XP`, els.canvas);
    burst(els.canvas);
    challengeTick(true, gained);
  } else {
    stats.wrong++;
    stats.combo = 0;
    diffState().score = Math.max(0, diffState().score - 20);
    session.wrong++;

    const feedback = mode.getFeedbackData(q, answer, { gained: 0 });
    setFeedback(feedback.title, feedback.detail, feedback.showResult, true);
    audioEngine.sfxBuzz();
    shake(els.canvas);
    loseLife("Sesi nötüre getiremedin.", { silent: true });
    challengeTick(false, 0);
  }

  audioEngine.stopAudio();
  pushHistory(result.correct);
  updateDaily(result.correct);
  accumulatePracticeTime();
  recordAndPersistDailyAccuracy(result.correct);
  notifyNewAchievements();
  updateUI();
  persistStats();
  persistDaily();
  // Diğer sekiz modla AYNI hizalı geçiş formülü (bkz. G21).
  const gameOver = finalizeIfGameOver();
  // G50: sınav sistemi — submitThreeWayGuess'in AYNI kablolaması. Bu mod
  // odd-one-out DEĞİL (bkz. dosya başı not) ama handleExamOutcome q/result
  // şeklinden BAĞIMSIZ (sadece result.correct + q.difficulty okur) — three-way
  // olmayan diğer beş submit fonksiyonuyla AYNI şekilde generic çalışır.
  const examHandled = !gameOver && examGateActive() && handleExamOutcome(q, result, gained);
  if (!gameOver && !examHandled) scheduleNext(prefs.feedbackScreen ? (result.correct ? 4000 : 6000) : QUICK_ADVANCE_MS);
}

// G51 — Motor 3 (Frekans Çakışması). answer AŞAMAYA göre değişir (bkz. mode
// dosyasının evaluateAnswer notu): AŞAMA 1 → { center }, AŞAMA 2 → { source },
// AŞAMA 3 → { cutDb }. Diğer altı "generic" submit fonksiyonuyla (submitLevelGuess
// vb.) AYNI iskelet — TEK fark: mode.recordZone SADECE AŞAMA 1'de çağrılır
// (çakışma FREKANSI sadece o aşamada soruluyor, Boost/Cut'ın "sadece Katman
// 3'te" kararının AYNISI) VE AŞAMA 3'ten sonra öncesi/sonrası karşılaştırma
// butonları açılır (bkz. cakismaBefore/After click handler'ları).
function submitCakismaGuess(answer) {
  if (!roundActive || !activeQuestion || activeQuestion.mode !== "cakisma") return;
  if (!answer) return;
  roundActive = false;
  roundFlow.clearTimer();
  setActionbarTucked(true);

  const q = activeQuestion;
  const result = mode.evaluateAnswer(q, answer);
  setAnalyzerPhase("done");
  if (els.gainValue) els.gainValue.textContent = "";
  if (q.stage === 1 && answer.center != null) cakismaGuess = { center: answer.center };
  if (isChoiceFormat()) mode.markAnswerChoices(els.answers, q, answer);

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
    modeState().xp += gained;
    diffState().score += gained * Math.max(1, stats.combo);
    diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
    if (q.difficulty === "pro") stats.proCorrect++;
    if (q.boss) stats.bossWins++;
    session.correct++; session.xp += gained;
    // G82: Seans Sonu'nun XP kırılımı ("Temel XP" satırı) için — G81'in
    // xpBaseFor()'u burada da TEK gerçek kaynak, UYDURULMUŞ bir sayı yok
    // (bkz. showSessionEnd/buildXpRows).
    session.xpBaseSum = (session.xpBaseSum || 0) + xpBaseFor(q, q.difficulty);

    const feedback = mode.getFeedbackData(q, answer, { gained });
    setFeedback(feedback.title, feedback.detail, feedback.showResult, false);
    showXpBreakdown(q, q.difficulty, gained);
    if (q.stage === 1) mode.recordZone(zoneStats, q.trueCenter, true, result.dOct);
    audioEngine.sfxDing();
    spawnXp(`+${gained} XP`, els.canvas);
    burst(els.canvas);
    challengeTick(true, gained);
  } else {
    stats.wrong++;
    stats.combo = 0;
    diffState().score = Math.max(0, diffState().score - 20);
    session.wrong++;

    const feedback = mode.getFeedbackData(q, answer, { gained: 0 });
    setFeedback(feedback.title, feedback.detail, feedback.showResult, true);
    if (q.stage === 1) mode.recordZone(zoneStats, q.trueCenter, false, result.dOct);
    audioEngine.sfxBuzz();
    shake(els.canvas);
    loseLife("Iskaladın.", { silent: true });
    challengeTick(false, 0);
  }

  if (q.stage === 1) storage.saveZoneStats(zoneStats);

  // AŞAMA 3 (Çöz) — task'ın "Sonuç dinlenir (öncesi/sonrası)" isteği: ses
  // DURDURULMAZ (audioEngine.stopAudio() diğer sekiz modun aksine burada
  // BİLEREK çağrılmıyor), İKİ kaynak çalmaya DEVAM eder — kullanıcı "Önce"/
  // "Sonra" ile DOĞRU çözümü (kullanıcının kendi cevabı YANLIŞ olsa bile)
  // dinleyebilsin diye butonlar HER ZAMAN gösterilir. "Sonra"nın varsayılan
  // AÇIK başlaması (bkz. index.html #cakismaAfter'ın "on" class'ı) maskenin
  // GERÇEKTEN açıldığını hemen duyurur.
  if (q.stage === 3) {
    if (els.cakismaCompare) els.cakismaCompare.classList.remove("hidden");
    if (els.cakismaBefore) els.cakismaBefore.classList.remove("on");
    if (els.cakismaAfter) els.cakismaAfter.classList.add("on");
    audioEngine.setDualCut(q.correctSource, -Math.abs(q.correctCutDb));
  } else {
    audioEngine.stopAudio();
  }

  pushHistory(result.correct);
  updateDaily(result.correct);
  accumulatePracticeTime();
  recordAndPersistDailyAccuracy(result.correct);
  notifyNewAchievements();
  updateUI();
  persistStats();
  persistDaily();
  const gameOver = finalizeIfGameOver();
  // G51: sınav sistemi — diğer sekiz modla AYNI kablolama.
  const examHandled = !gameOver && examGateActive() && handleExamOutcome(q, result, gained);
  if (!gameOver && !examHandled) scheduleNext(prefs.feedbackScreen ? (result.correct ? 4000 : 6000) : QUICK_ADVANCE_MS);
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
    // G82: Seans Sonu'nun XP kırılımı ("Temel XP" satırı) için — G81'in
    // xpBaseFor()'u burada da TEK gerçek kaynak, UYDURULMUŞ bir sayı yok
    // (bkz. showSessionEnd/buildXpRows).
    session.xpBaseSum = (session.xpBaseSum || 0) + xpBaseFor(q, q.difficulty);

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

// G90 (madde 10) — Tasarim-2026-08/Prototip.dc.html "SES DURUMLARI" notu:
// "Ses yüklenemedi · Tekrar dene" satırı + yükleniyor göstergesi. #gameSpectrumControls'ün
// hemen ALTINDA (bkz. index.html) — playQuestion() her çağrıldığında (round başı, A/B,
// vb.) senkronize edilir, KENDİ state değişkeni İCAT EDİLMEDİ.
// G94: `.warning` (büyük play butonunun kırmızı çerçevesi, styles.css
// .game-ctrl-play.warning) artık BU İKİ fonksiyona bağlı — Prototip.dc.
// html'de (satır 2385: playBtnBorder) kırmızı çerçeve SADECE `s.audio===
// 'error'` (gerçek ses yükleme hatası) iken çıkar. ÖNCEDEN (G79'dan beri)
// updateStartBtnLabel() round aktifken KOŞULSUZ ekliyordu — TÜM modlarda
// (dB Seviyesi'nde G93'te SADECE o mod için `.neutral-play` ile ezilerek
// "düzeltilmişti") her tur kırmızı görünüyordu. Artık showAudioError/
// hideAudioError'ın ZATEN TEK doğru çağrıldığı iki yer (playQuestion()'ın
// cakisma dalı + normal dal, bkz. aşağıda) sampleLoadFailed'e göre
// `#startBtn`'i de senkronize ediyor — `#audioErrorRow` banner'ıyla AYNI
// yaşam döngüsü, ayrı bir state değişkeni İCAT EDİLMEDİ.
function showAudioError() {
  if (els.audioErrorRow) els.audioErrorRow.classList.remove("hidden");
  if (els.startBtn) els.startBtn.classList.add("warning");
}
function hideAudioError() {
  if (els.audioErrorRow) els.audioErrorRow.classList.add("hidden");
  if (els.startBtn) els.startBtn.classList.remove("warning");
}
function showAudioLoading() { if (els.audioLoadingRow) els.audioLoadingRow.classList.remove("hidden"); }
function hideAudioLoading() { if (els.audioLoadingRow) els.audioLoadingRow.classList.add("hidden"); }
if (els.audioErrorRetry) els.audioErrorRetry.addEventListener("click", () => { playQuestion(currentPlayMode !== "clean"); });

// Turun sesini SIFIRDAN kurar — sadece round başlangıcında (ve F2'nin karşılaştırma
// önizleme butonlarında) çağrılmalı. A/B toggle'ı ARTIK bunu çağırmıyor (bkz. toggleAB) —
// kaynak/filtre grafiği bir kez kurulup tur boyunca bozulmuyor.
// G51 — Motor 3 (Frekans Çakışması): question.pair'in sourceA/sourceB'sini
// audio-engine.js:buildDualSourceChain'in beklediği {sourceType, uploadManager}
// çiftine çözer. "upload-a"/"upload-b" (bkz. source-catalog.js:OWN_SOURCE_PAIR)
// SOURCE_GROUPS'ta YOK — bunlar BURADA, tek yerde, app.js'in KENDİ iki
// uploadManager'ına eşlenir (audio-engine.js bu iki sanal id'yi HİÇ bilmez).
function cakismaSourcesSpec(pair) {
  const resolve = (sourceId, uploadMgr) =>
    (sourceId === "upload-a" || sourceId === "upload-b")
      ? { sourceType: "upload", uploadManager: uploadMgr }
      : { sourceType: sourceId, uploadManager: null };
  return { a: resolve(pair.sourceA, uploadManagerA), b: resolve(pair.sourceB, uploadManagerB) };
}

async function playQuestion(processed = true) {
  if (!audioEngine.audioReady || !activeQuestion) return;
  if (audioEngine.audioCtx && audioEngine.audioCtx.state === "suspended") {
    try { audioEngine.audioCtx.resume(); } catch (e) {}
  }
  currentPlayMode = processed ? "filtered" : "clean";
  // G51: Motor 3 — TEK-kaynak buildQuestionChain'in YERİNE buildDualSourceChain
  // (bkz. audio-engine.js). Diğer sekiz modda activeQuestion.mode hiçbir zaman
  // "cakisma" olmadığı için bu dal ÇALIŞMAZ, ÖNCEKİ davranış BİREBİR aynı kalır.
  if (activeQuestion.mode === "cakisma") {
    hideAudioError();
    audioEngine.buildDualSourceChain(activeQuestion, cakismaSourcesSpec(activeQuestion.pair), mode.applyProcessing);
    return;
  }
  // G90 (madde 10): örnek-dosya kaynağı decode/ağ hatasıyla başarısız olursa
  // (audio-engine.js buildQuestionChain'in sampleLoadFailed'i — round SESSİZ
  // kalmasın diye motor hâlâ pembe gürültüye düşüyor, KALDIRILMADI) artık
  // BUNU da kullanıcıya gösteriyoruz. showAudioLoading() await SIRASINDA kısa
  // görünür (senkron kaynaklarda anlık kapanır, GERÇEK gecikme — uydurma
  // bir minimum süre YOK).
  showAudioLoading();
  const result = await audioEngine.buildQuestionChain(activeQuestion, processed, activeQuestion.source, uploadManager, mode.applyProcessing);
  hideAudioLoading();
  if (result && result.sampleLoadFailed) showAudioError(); else hideAudioError();
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
// G30: Motor 2 modlarında (Kompresör, G35'ten beri Reverb) bu buton İKİLİ
// crossfade (setProcessed) DEĞİL, ÜÇ farklı varyant arasında dönüyor — dry/wet
// paralel yol kavramı burada anlamsız (üçü de "wet", sadece parametreleri
// farklı). Bu yüzden HER basışta audioEngine.buildQuestionChain'i (cmprow'un
// post-answer önizleme butonlarıyla AYNI teknik: geçici bir soru kopyası,
// activeQuestion MUTASYONA UĞRAMADAN) YENİDEN çağırıyor — ses o an baştan
// başlar (crossfade'siz), ama bu zaten mevcut önizleme butonlarının da kabul
// ettiği bir ödün (bkz. o butonların dosya başı notu). G33: previewRatio (TEK
// parametreye özel) yerine previewLetter geçti — her modun applyProcessing'i
// o harfin TÜM parametrelerini question.variants'tan okuyor; G35'te Reverb
// bunu 3 parametreyle (decay/preDelay/size) MİRAS ALARAK previewLetter'ın
// gerçekten parametre-sayısından bağımsız olduğunu doğruladı. G35: fonksiyonun
// GÖVDESİ zaten tamamen mode-agnostikti (SADECE değişken isimleri Kompresör'e
// özeldi) — genelleştirildi, isThreeWayModule listesindeki HER mod bunu
// PAYLAŞIYOR.
// G58 — teşhis: "A şıkkı renklenmiyor" raporu — canlı testte (masaüstü tarayıcı,
// A doğruyken/yanlışken ayrı ayrı) markThreeWayCards'ın letter===correctLetter/
// pickedLetter mantığı DOĞRU çalıştığı doğrulandı (regresyon YOK, kod incelemesi +
// canlı test). Ama BURADA gerçek/kapatılmamış bir koşul EKSİKLİĞİ bulundu:
// abLoopTimer'ın 2sn'lik setInterval'i cevap ANINDA stopAbLoop()'la temizleniyor
// (bkz. setActionbarTucked), AMA JS'in tek-thread'li event loop'unda interval'in
// callback'i (toggleAB→cycleThreeWayPreview) TAM O ANDA (kullanıcının cevap
// click'iyle AYNI mikro-pencerede) ZATEN kuyruğa alınmış olabilir — clearInterval
// GELECEKTEKİ tetiklenmeleri durdurur, kuyrukta BEKLEYEN bir çağrıyı GERİ ÇEKMEZ.
// markThreeWayCards() ZATEN her butonu disabled=true yapıyor ve
// updateThreeWayCardsPlayState() disabled butonları atlıyor (bkz. o dosyanın
// notu) — yani DOM sınıfları için koruma VARDI, ama cycleThreeWayPreview kendisi
// hiçbir roundActive kontrolü YAPMADAN buildQuestionChain'i (SES çalmaya
// başlayan asıl işlem) yine de çalıştırabiliyordu — cevap sonrası KISA bir an
// için istenmeyen bir ses/kaynak değişimi (task'ın 4. maddesindeki "kaynak
// değişimi... anları" ile AYNI aile). Savunma amaçlı, en baştaki koşulla kapatıldı.
function cycleThreeWayPreview() {
  if (!roundActive) return;
  const q = activeQuestion;
  const idx = q.variants.findIndex(v => v.letter === threeWayPlayLetter);
  const next = q.variants[(idx + 1) % q.variants.length];
  threeWayPlayLetter = next.letter;
  audioEngine.buildQuestionChain({ ...q, previewLetter: next.letter }, true, q.source, uploadManager, mode.applyProcessing);
  updateAbToggleUI();
}

// G86 YENİ — kartın KENDİ play butonuna basılınca o harfi DOĞRUDAN çalar
// (cycleThreeWayPreview'ın "sıradakine geç" davranışından FARKLI — burada
// hangi harf isteniyorsa O çalar, Tasarim-2026-08/Prototip.dc.html'in
// card.play'i ile AYNI: play: ev => { ev.stopPropagation();
// this.setState({playingCard:i}) }).
function playThreeWaySpecific(letter) {
  if (!roundActive || !isThreeWayQuestion(activeQuestion)) return;
  const q = activeQuestion;
  if (!q.variants.some(v => v.letter === letter)) return;
  threeWayPlayLetter = letter;
  audioEngine.buildQuestionChain({ ...q, previewLetter: letter }, true, q.source, uploadManager, mode.applyProcessing);
  updateAbToggleUI();
}

// G86 YENİ — Motor 2'nin onay butonu (#freqGuessArea içinde, kompresor.js/
// reverb.js/distortion.js renderGuessAreaControls tarafından basılıyor).
// Seçim değişince (kart tıklanınca) çağrılır — buton HTML'i ZATEN DOM'da,
// sadece metin/renk güncellenir (showSessionEnd/resCta'nın AYNI "tek DOM,
// parametrik güncelleme" deseni).
function updateThreeWayConfirmButton() {
  const btn = document.getElementById("threeWayConfirmBtn");
  if (!btn) return;
  const sel = threeWaySelectedLetter;
  btn.textContent = sel ? `${sel} olarak onayla` : "Bir kart seç";
  btn.disabled = !sel;
  btn.classList.toggle("ready", !!sel);
}
if (els.freqGuessArea) els.freqGuessArea.addEventListener("click", e => {
  if (!e.target.closest("#threeWayConfirmBtn")) return;
  if (!roundActive || !threeWaySelectedLetter) return;
  try { submitThreeWayGuess(threeWaySelectedLetter); } catch (err) { console.error(err); }
});

function toggleAB() {
  if (isThreeWayQuestion(activeQuestion)) {
    cycleThreeWayPreview();
    return;
  }
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
  if (els.gameLoopBadgeRow) els.gameLoopBadgeRow.classList.remove("hidden");
  // G86: Motor 2'nin AYRI döngü metni (Prototip.dc.html satır 697 vs 793).
  if (els.gameLoopCaption) {
    els.gameLoopCaption.textContent = isThreeWayQuestion(activeQuestion)
      ? "Seçili kart kesintisiz tekrar" : "A ↔ B kesintisiz geçiş";
  }
}
function stopAbLoop() {
  if (!abLoopTimer) return;
  clearInterval(abLoopTimer);
  abLoopTimer = null;
  if (els.abToggle) els.abToggle.classList.remove("loop");
  if (els.abTitle) els.abTitle.textContent = "A/B Test";
  if (els.gameLoopBadgeRow) els.gameLoopBadgeRow.classList.add("hidden");
  updateAbToggleUI();
}

// ═══════════════════════════════════════════════════════════════════════════
// Tur akışı: timer / otomatik geçiş / duraklat-devam / 10 soruluk bölüm
// ═══════════════════════════════════════════════════════════════════════════

function ensureAutoNext(durationMs) {
  if (autoStopped) return;
  if (currentLives <= 0) return;
  // G47: mode.EXAM_ENABLED bir modda (bugün Kompresör) "10 Soruluk Bölüm"ün
  // KENDİ "10 soru bitti → seansı kapat" mantığı DEVRE DIŞI — parkur/sınav/telafi
  // akışı 10'un ÖTESİNE geçebiliyor (erken sınav + telafi turları), bunu
  // challenge.done>=10'da kesmek sınavı YARIDA keserdi. challenge.active/
  // xpMult()'un +%50 bonusu HÂLÂ çalışıyor (kullanıcı "10 Soruluk Bölüm"ü
  // seçtiyse), SADECE otomatik bitirme bastırıldı. Diğer yedi modda
  // mode.EXAM_ENABLED undefined → bu koşul ÖNCEKİ davranışla BİREBİR aynı.
  //
  // G97 (madde 4) — ÜRÜN KARARI, HATA DEĞİL: `examGateActive()` SADECE
  // `isUserPro()` iken true dönebilir (bkz. o fonksiyonun tanımı) — yani bu
  // bastırma SADECE Pro kullanıcıyı, SADECE sınava girebilen bir moddayken
  // etkiler. Sonuç: Pro'da (sınav aktifken) kayıpsız bir "10 Soruluk Bölüm"
  // bitirilse bile bölüm bitiş ekranı (showSessionEnd) HİÇ tetiklenmez —
  // ESKİDEN bu G50 REGRESYONU sanılıyordu, ARTIK KASITLI: Pro'da bir bölümü
  // "bitirmenin" ödülü zaten SINAV EKRANIDIR (seviye atlama/kademe ilerlemesi
  // oradan geçer) — bölüm bitiş ekranının (halka/rozet/"tekrar oyna") AYRICA
  // gösterilmesi burada gereksiz/çakışan bir ikinci ödül olurdu. Ücretsiz
  // kullanıcıda (`examGateActive()` HER ZAMAN false) bu bastırma HİÇ
  // devreye girmez — bölüm bitiş ekranı ONLARDA aynen görünmeye devam eder.
  // +%50 bölüm bonusu (yukarıdaki not) ekran gösterilmese bile Pro'da
  // UYGULANMAYA DEVAM EDER — sadece GÖRÜNÜRLÜK kısıtlandı, KAZANIM değil.
  if (challenge.active && !examGateActive() && challenge.done >= challenge.total) {
    finishChallenge();
    return;
  }
  autoPlaying = true;
  updateStartBtnLabel();
  // G48: "10/5 tutarsızlığı" düzeltmesi — bu buton önceden "Sonraki"
  // (jenerik) diyordu, üstteki els.roundChip ise (G47'den beri)
  // examSystem.label()'dan "Soru N/10"/"Sınav N/4"/"Telafi N/5" okuyordu.
  // "Sonraki (5) ▶" görüldüğünde ("(5)" aslında SANİYE geri sayımı, soru
  // sayacı DEĞİL) üstteki "Soru 6/10" ile YAN YANA iki farklı "5"/"10"
  // görünüp ÇAKIŞIYORMUŞ gibi okunuyordu. Artık mode.EXAM_ENABLED bir modda
  // (bugün Kompresör) bu buton da AYNI examSystem.label()'ı önek olarak
  // kullanıyor — "Soru 7/10 (5) ▶" gibi, İKİ sayı da NE anlama geldiği
  // açık. Diğer yedi modda mode.EXAM_ENABLED undefined → ÖNCEKİ davranış
  // (challenge.active ? "Soru N/10" : "Sonraki") BİREBİR aynı kalır.
  const label = examGateActive() ? examSystem.label() : challenge.active ? `Soru ${challenge.done + 1}/10` : "Sonraki";
  roundFlow.ensureAutoNext(durationMs, label);
  // G81: geri bildirim kartının otomatik-geçiş çubuğu — SADECE kart GERÇEKTEN
  // görünürken (show-result) başlatılır, tam olarak BURADA kurulan JS
  // zamanlayıcısıyla AYNI durationMs ile (örn. QUICK_ADVANCE_MS/onTimeUp gibi
  // kart göstermeyen çağrılarda show-result zaten yok, çubuk hiç başlamaz).
  if (els.feedbackBox && els.feedbackBox.classList.contains("show-result")) {
    startFeedbackAdvanceBar(durationMs);
  }
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
  // G31 (bug 3 düzeltmesi): Durdur bu fonksiyonda setActionbarTucked'ı HİÇ
  // çağırmıyor (çubuk görünür kalmalı ki "Tekrar Çal" basılabilsin) — bu
  // yüzden yukarıdaki merkezi tucked=true noktası (bkz. setActionbarTucked)
  // buraya ulaşmıyor, döngü AYRICA burada durdurulmalı. Motor 2 modlarında bu
  // olmadan: abLoopTimer 2sn'de bir cycleThreeWayPreview→buildQuestionChain
  // çağırmaya devam ediyordu, o da HER ÇAĞRIDA muteGain'i "güvenlik" amaçlı
  // 1'e geri açıyordu (bkz. audio-engine.js buildQuestionChain başındaki
  // not) — Durdur'un birazdan aşağıda uyguladığı muteOutput() bir sonraki
  // döngü tetiklemesinde SESSİZCE iptal oluyordu, "Durdur" görünürde
  // basılmamış gibi ses geri geliyordu (canlı cihazda YAKALANDI).
  if (abLoopTimer) stopAbLoop();
  roundFlow.clearTimer(); // timeLeft'e DOKUNMAZ
  audioEngine.muteOutput();
  els.feedbackBox.classList.remove("show-result");
  if (els.feedbackOverlay) els.feedbackOverlay.classList.remove("open");
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
  if (blockIfLivesOut()) return;
  if (els.sourceSelect.value === "upload" && !uploadManager.hasBuffer) {
    setFeedback("Önce ses yükle", "Kaynak olarak yüklenen ses seçiliyse bir mp3/wav dosyası seçmelisin.");
    return;
  }
  // G51: Motor 3 (Frekans Çakışması) — "own" (kendi dosyalarım) çifti İKİ AYRI
  // dosya gerektirir, üstteki guard'ın AYNI mantığı ama İKİ uploadManager için.
  if (mode.MODE_ID === "frekans-cakismasi" && currentCakismaPairId() === "own" && (!uploadManagerA.hasBuffer || !uploadManagerB.hasBuffer)) {
    setFeedback("Önce iki kaynağı da yükle", "Kendi dosyalarım seçiliyse A ve B için ayrı ayrı bir ses dosyası seçmelisin.");
    return;
  }

  cancelCmpPreviewPause();
  autoStopped = false;
  autoPlaying = true;
  roundStartedAt = Date.now();
  applyAutoDifficulty(); // Z5: Otomatik modda els.difficultySelect.value burada güncellenir

  // G47: sınav sistemi — SADECE mode.EXAM_ENABLED olan modlarda (bugün sadece
  // Kompresör) examSystem'in FAZI parkur DIŞINDAYSA (sınav/telafi/tekrar-sınav)
  // kullanıcının kendi zorluk seçimi/eğrisi YERİNE modun EXAM_DIFFICULTY'si
  // (statik, "zorlaştırılmış") kullanılır — boss round VE Otomatik/Sabit eğrisi
  // bu fazlarda BİLEREK devre dışı (task: "o modun ZORLAŞTIRILMIŞ soruları",
  // ekstra bir boss-zorluğu çakışması istenmedi). Diğer yedi mod için
  // `mode.EXAM_ENABLED` undefined → examActive HER ZAMAN false, bu blok
  // ÖNCEKİ davranışla BİREBİR aynı kalır (hiç çalışmaz).
  const examActive = examGateActive() && examSystem.phase !== "parkur";
  // G50: zon-tabanlı telafi (Frekans Bulma/Kesim Noktası/Boost-Cut/Q Genişliği,
  // bkz. getWeakArea) fazında examSystem.remedialTier bir ZORLUK adı DEĞİL bir
  // ZONE nesnesi taşır — questionTier()'a (difficulty bekler) DOĞRUDAN
  // geçirilirse mode.DIFFICULTY[level] undefined'a düşerdi. Bunun yerine
  // zorluk "medium"da SABİTLENİR (telafi burada ZORLUKLA değil BÖLGEYLE
  // ilgili — sınavın "zorlaştırılmış" ekseni telafide devrede DEĞİL, sadece
  // gerçek sınavda) ve zone [a,b]'si aşağıda focusRange'e taşınır.
  const zoneRemedial = examGateActive() && mode.EXAM_WEAK_AREA === "zone" && examSystem.phase === "remedial";
  const examTier = examGateActive()
    ? (zoneRemedial ? "medium" : examSystem.questionTier(els.difficultySelect.value, mode.EXAM_DIFFICULTY))
    : els.difficultySelect.value;
  const boss = examActive ? false : mode.isBossRound(stats.rounds);
  activeQuestion = mode.createQuestion(examTier, {
    source: pickRoundSource(),
    // G51: Motor 3 (Frekans Çakışması) — SADECE o modun createQuestion'ı okur
    // (settings.pairId), diğer sekiz mod bu alanı hiç bilmediği için YOK SAYAR
    // (aynı sessionQuestionIndex/examBandBoost deseni).
    pairId: currentCakismaPairId(),
    boss,
    // G50: zon-tabanlı telafide (yeterli veri varsa, remedialTier dolu) kullanıcının
    // kendi odak seçimi YERİNE zayıf bölgenin [a,b]'si kullanılır — telafi HER
    // ZAMAN o bölgede yoğunlaşsın diye kullanıcının o anki focusRange seçimi
    // BİLEREK GEÇERSİZ kılınır (bkz. getWeakArea). Veri yoksa (remedialTier null,
    // yeni kullanıcı) normal currentFocusRange()'a düşer — daraltma YOK, tüm
    // spektrumda/kullanıcının seçtiği aralıkta telafi (güvenli varsayılan).
    focusRange: (zoneRemedial && examSystem.remedialTier) ? [examSystem.remedialTier.a, examSystem.remedialTier.b] : currentFocusRange(),
    zoneStats, // Z4: zayıf bölgelere ağırlıklı test frekansı — proplus/çeldiriciler etkilenmez
    // G18: bu OYUN OTURUMUNDAKİ (bkz. roundsInThisPlaySession tanımındaki not) 0-tabanlı
    // soru sırası. Kesim Noktası bunu tip-gizleme rampası için okuyor (bkz.
    // kesim-noktasi.js TYPE_REVEAL_QUESTION_COUNT); diğer modlar görmezden gelir
    // (frekans-bulma.js createQuestion bu alanı hiç okumuyor).
    sessionQuestionIndex: roundsInThisPlaySession,
    // G50: Tonal Denge'nin "sınav zorlaştırılmış (daha fazla bant)" isteği —
    // SADECE gerçek sınav fazında true (telafi DEĞİL — telafi zorluk değil
    // bölge/kademe ekseninde, daha kolay bir pratik olmalı). Diğer yedi mod bu
    // alanı hiç okumadığı için ETKİLENMEZ (bkz. tonal-denge.js createQuestion notu).
    examBandBoost: examGateActive() && examSystem.phase === "exam",
    // ADIM 1+2 (zorluk sisteminin merkezi bağlanması, bkz. currentDifficultyPosition
    // altındaki not): HER İKİ mod da (Kesim Noktası + Frekans Bulma) kendi
    // paramsForDifficultyPosition'ı üzerinden bunu okuyor — proplus (undefined
    // döndüğünde) HARİÇ, o zaman ilgili mod eski statik DIFFICULTY[level] yoluna düşer.
    // examActive'te de BİLEREK undefined — sınav/telafi eğriyi DEĞİL modun statik
    // DIFFICULTY[examTier]'ını kullanır (bkz. examTier notu).
    difficultyPosition: examActive ? undefined : currentDifficultyPosition(boss)
  });
  roundsInThisPlaySession++;
  // Karıştır açıkken çalan kaynak sourceSelect'ten farklı olabilir — chip her zaman
  // o turda GERÇEKTEN çalan kaynağın adını göstersin. Frekans Çakışması'nda
  // (G51) bu chip zaten gizli (bkz. syncCakismaVisibility) VE activeQuestion'ın
  // "source" alanı hiç yok (pair var) — labelSource(undefined) çağırmamak için
  // BİLEREK atlanıyor.
  if (els.sourceChipLabel && activeQuestion.mode !== "cakisma") els.sourceChipLabel.textContent = labelSource(activeQuestion.source);
  if (els.cakismaPairChipLabel && activeQuestion.mode === "cakisma") els.cakismaPairChipLabel.textContent = `${activeQuestion.pair.labelA} + ${activeQuestion.pair.labelB}`;
  renderQuestion();
  startSpotlightTourIfNeeded();
  playQuestion(true);
  // G32: Motor 2 modlarında (Kompresör, G35'ten beri Reverb) A/B/C
  // karşılaştırması modun ÖZÜ (odd-one-out ancak üçünü de dinleyince
  // bulunabilir) — diğer modların AKSİNE kullanıcının döngüyü elle (uzun
  // basma) açması BEKLENMİYOR, ses zaten A ile başladığı (playQuestion'ın
  // varsayılanı, bkz. applyProcessing) gibi döngü de otomatik başlıyor.
  // Motor 1'in beş modunda BİLEREK dokunulmadı — onlarda A/B tek bir dry/wet
  // karşılaştırması, döngü hâlâ isteğe bağlı bir kısayol.
  if (isThreeWayModule(mode)) startAbLoop();
  updateStartBtnLabel();
  scrollToAnalyzer();
  startTimerForCurrentQuestion();
}

// Kaynak seçimi: "Karıştır" açıksa her tur rastgele bir üretici kaynak seçilir
// (yüklenen dosya hariç); kapalıyken kaynak seçicideki değer kullanılır. Havuz
// AKTİF MODUN uyumlu kaynaklarıyla sınırlı — aksi halde "Karıştır" kaynak
// sheet'inde hiç görünmeyen (o modda anlamsız) bir kaynağı sessizce çalabilirdi.
function pickRoundSource() {
  const sel = els.sourceSelect.value;
  if (mixSources && sel !== "upload") {
    const compatible = new Set(mode.getMeta().uyumluKaynaklar);
    const pool = SOURCE_GROUPS.flatMap(g => g.sources).filter(s => s.kind !== "upload" && compatible.has(s.id)).map(s => s.id);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return sel;
}

// Seçili odak aralığının [min, max] Hz'ini döndürür. Mod odak kavramını desteklemiyorsa
// (mode.FOCUS_RANGES yok) veya chip/select henüz kurulmadıysa undefined döner —
// createQuestion bunu "tüm spektrum" olarak yorumlar (bkz. frekans-bulma.js).
function currentFocusRange() {
  if (!mode.FOCUS_RANGES || !els.focusSelect) return undefined;
  // G61 (PAYWALL.md): "bölge seçerek çalışma: kilitli (otomatik zorluk çalışır)".
  // SAVUNMACI okuma-anı kontrolü — .setting-row gate'i (bkz. yukarısı) free
  // kullanıcının SEÇİMİ değiştirmesini zaten engelliyor, ama Pro'dan free'ye
  // İNEN bir kullanıcının prefs'te KALMIŞ eski seçimi (ör. "Bas") burada
  // yoksayılır, tam spektruma düşülür — UI select'in DEĞERİNE dokunmadan
  // (sadece burada, gerçek kullanılan aralık için).
  if (paywall.isFocusRangeLocked(isUserPro())) return undefined;
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
    // G51: Motor 3 (Frekans Çakışması) — "kendi dosyalarım" çiftinin İKİ
    // uploadManager'ı, üstteki AYNI "yeni oturum/Tekrar Oyna" mantığıyla.
    if (mode.MODE_ID === "frekans-cakismasi" && currentCakismaPairId() === "own") {
      uploadManagerA.startFromZero();
      uploadManagerB.startFromZero();
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

  // G93 (madde 1): dB Seviyesi'nde (mode.BARE_ANALYZER) bu GENEL nokta-ızgara
  // arka planı da "ızgara çizgileri" kapsamına giriyor — kullanıcı raporu
  // ("barların arkasında ızgara duruyor") bu genel çizimden geliyordu, mod
  // dosyasındaki drawAxis'in (zaten kaldırıldı) DIŞINDA, TÜM modlarda
  // ortak PAYLAŞILAN bir kod yolu. Diğer modlarda (Frekans Bulma vb.) bu
  // ızgara İSTENİYOR, bu yüzden mode.BARE_ANALYZER'a bağlı koşullu.
  if (!mode.BARE_ANALYZER) {
    ctx2d.fillStyle = "rgba(255,255,255,.04)";
    for (let x = 0; x < w; x += 40) ctx2d.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 36) ctx2d.fillRect(0, y, w, 1);
  }

  const overlayState = {
    audioCtx: audioEngine.audioCtx,
    activeQuestion,
    roundActive,
    freqGuessHz,
    freqHoverHz,
    revealAnimator,
    cutoffGuess, // G19: bkz. Kesim Noktası'nın drawOverlay'i — diğer modlar okumuyor
    dbGuess, // bkz. dB Seviyesi'nin drawOverlay'i — diğer modlar okumuyor
    boostCutGuess, // bkz. Boost/Cut'ın drawOverlay'i — diğer modlar okumuyor
    qGuessLabelId, // bkz. Q Genişliği'nin drawOverlay'i — diğer modlar okumuyor
    guessLetter: threeWayGuessLetter, // bkz. Motor 2 modlarının (Kompresör/Reverb) drawOverlay'i — diğer modlar okumuyor
    tonalCorrections: tonalDengeCorrections, // bkz. Tonal Denge'nin (G45) drawOverlay'i — diğer modlar okumuyor
    cakismaGuess // bkz. Frekans Çakışması'nın (G51) drawOverlay'i — diğer modlar okumuyor
  };

  if (!visualizerOn || !audioEngine.audioReady) {
    ctx2d.fillStyle = "rgba(255,255,255,.22)";
    ctx2d.font = "700 22px Inter, sans-serif";
    ctx2d.fillText("Visualizer pasif", 30, 46);
    mode.drawOverlay(ctx2d, els.canvas, w, h, overlayState);
    return;
  }

  // G83: Tasarim-2026-08/Prototip.dc.html:spectrum() birebir — çubuk YERİNE
  // çizgi grafik, cyan/boss'ta altın, soru sırasında NÖTR (gerçek FFT verisi
  // ASLA çizilmez, bkz. drawSpectrumBackground'ın kendi notu). G39'un
  // SHOW_SPECTRUM===false deseni AYNI kaldı (dB Seviyesi kendi bar görselini,
  // Frekans Çakışması kendi ikili eğrisini kullanıyor, ikisine de dokunulmadı).
  if (mode.SHOW_SPECTRUM !== false) {
    mode.drawSpectrumBackground(ctx2d, els.canvas, w, h, {
      revealed: !roundActive && !!activeQuestion,
      boss: !!(activeQuestion && activeQuestion.boss),
      playing: autoPlaying && roundActive
    });
  }

  mode.drawOverlay(ctx2d, els.canvas, w, h, overlayState);
}

// G83: eski çubuk-tabanlı spektrum çizici (drawSpectrumBars/drawSpectrumBar,
// GERÇEK canlı FFT verisini doğrudan çiziyordu — soru sırasında tepe noktası
// doğru cevabı ele veriyordu) kaldırıldı. Yerini mode.drawSpectrumBackground
// (bkz. frekans-bulma.js, yukarıdaki drawVisualizer'daki çağrı) aldı — çizgi
// grafik, soru sırasında NÖTR/sese kör, cevap sonrası modun KENDİ gerçek
// eğrisine yer açıyor.

// Canvas tıklama/hover — sadece tur aktifken (aktif mod her zaman dalga tabanlı).
// Çizim koordinat uzayı CSS piksel cinsinden olduğu için (bkz. resizeCanvas), tıklama
// pozisyonu da doğrudan CSS piksele göre hesaplanır — ayrı bir iç-çözünürlük çevrimi gerekmez.
function faCanvasPos(e) {
  const r = els.canvas.getBoundingClientRect();
  const cssX = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  return Math.max(0, Math.min(canvasCssW, cssX));
}
const isWaveMode = () => !!activeQuestion;

// G86 DÜZELTMESİ: G78'in "işaretle→onayla" akışı (onay butonu) İKİ TUR
// UYGULANMAMIŞ bir talimatı geri alıyor — Tasarim-2026-08/Prototip.dc.html
// onMark (satır 2596-2605) dokunuşta DOĞRUDAN cevabı gönderiyor: markX
// ayarlanır, 180ms sonra answer() çağrılır (clearTimeout ile her yeni
// dokunuş öncekini iptal eder — kullanıcı parmağını gezdirirken ara
// dokunuşlar gönderilmez, SADECE son dokunuştan 180ms sonraki GERÇEK
// olur). Onay butonu (renderFreqConfirmButton, SÖKÜLDÜ) SADECE Pro Plus'ta
// vardı zaten (aşağıdaki q.guesses akışı, bu turun kapsamı DIŞINDA —
// DEĞİŞMEDİ, hâlâ 4. işarette otomatik gönderiyor).
let freqTapTimer = null;

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
    clearTimeout(freqTapTimer);
    freqTapTimer = setTimeout(() => {
      if (!roundActive) return;
      try { submitFrequencyGuess(hz); } catch (err) { console.error(err); }
    }, 180);
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
  // G86 YENİ — Motor 2 kartının play butonu: KENDİ dinleme tetikleyicisi,
  // dışarıdaki kart SEÇİMİ click'iyle karışmasın diye burada erken durdurulur
  // (nested <button> HTML'de geçersiz olduğu için dış kapsayıcı artık <div>,
  // bkz. core/three-way-cards.js).
  const playBtn = e.target.closest(".ans-m2-play");
  if (playBtn) {
    if (playBtn.disabled || !isThreeWayQuestion(activeQuestion)) return;
    playThreeWaySpecific(playBtn.dataset.letter);
    return;
  }
  const btn = e.target.closest(".ans");
  if (!btn || btn.disabled || btn.classList.contains("ans-m2-disabled")) return;
  // G86 DÜZELTMESİ: Motor 2 kartı artık DOĞRUDAN göndermiyor — SADECE seçer
  // (Tasarim-2026-08/Prototip.dc.html'in card.select/confirmCard ayrımı,
  // satır 2645/2652). Gönderim #freqGuessArea'daki onay butonuyla olur (bkz.
  // kompresor.js/reverb.js/distortion.js renderGuessAreaControls +
  // updateThreeWayConfirmButton).
  if (isThreeWayQuestion(activeQuestion)) {
    threeWaySelectedLetter = btn.dataset.letter;
    mode.selectThreeWayCard(els.answers, threeWaySelectedLetter);
    updateThreeWayConfirmButton();
    return;
  }
  btn.classList.add("pick");
  // Kesim Noktası'nda ("cutoff") şıklar frekans+filtre tipi TAŞIR (data-filter-type) —
  // ayrı bir gönderim fonksiyonuna yönlendirilir (bkz. submitCutoffGuess dosya başı not).
  if (activeQuestion && activeQuestion.mode === "cutoff") {
    const freq = Number(btn.dataset.freq);
    const filterType = btn.dataset.filterType || activeQuestion.filterType;
    try { submitCutoffGuess({ freq, filterType }); } catch (err) { console.error(err); }
    return;
  }
  // dB Seviyesi ("dblevel") — şıklar tek bir işaretli dB sayısı taşır (bkz.
  // data-db, kesim'in data-freq'iyle AYNI desen).
  if (activeQuestion && activeQuestion.mode === "dblevel") {
    const value = Number(btn.dataset.db);
    try { submitLevelGuess(value); } catch (err) { console.error(err); }
    return;
  }
  // Boost/Cut ("boostcut") — şıkların taşıdığı veri KATMANA göre değişir (bkz.
  // boost-mu-cut-mu.js renderAnswerChoices): Katman 1 sadece data-direction,
  // Katman 2 sadece data-gain, Katman 3 hem data-freq hem data-gain.
  if (activeQuestion && activeQuestion.mode === "boostcut") {
    const layer = activeQuestion.layer;
    const answer = layer === 1
      ? { direction: btn.dataset.direction }
      : layer === 2
      ? { gainDb: Number(btn.dataset.gain) }
      : { freq: Number(btn.dataset.freq), gainDb: Number(btn.dataset.gain) };
    try { submitBoostCutGuess(answer); } catch (err) { console.error(err); }
    return;
  }
  // Q Genişliği ("qwidth") — şıklar SADECE etiket id'si taşır (bkz. data-label-id,
  // q-genisligi.js renderAnswerChoices — sayısal Q değeri şıklarda BİLEREK yok).
  if (activeQuestion && activeQuestion.mode === "qwidth") {
    const labelId = btn.dataset.labelId;
    try { submitQWidthGuess(labelId); } catch (err) { console.error(err); }
    return;
  }
  // G51 — Motor 3 (Frekans Çakışması) — şıkların taşıdığı veri AŞAMAYA göre
  // değişir (bkz. frekans-cakismasi.js renderAnswerChoices): AŞAMA 1 sadece
  // data-center, AŞAMA 2 sadece data-source, AŞAMA 3 sadece data-cut.
  if (activeQuestion && activeQuestion.mode === "cakisma") {
    const stage = activeQuestion.stage;
    const answer = stage === 1 ? { center: Number(btn.dataset.center) }
      : stage === 2 ? { source: btn.dataset.source }
      : { cutDb: Number(btn.dataset.cut) };
    try { submitCakismaGuess(answer); } catch (err) { console.error(err); }
    return;
  }
  // Motor 2 (Kompresör/Reverb/Distortion) artık BURAYA hiç düşmüyor — kendi
  // seçim dalı yukarıda ERKEN dönüyor (bkz. bu handler'ın başı).
  const hz = Number(btn.dataset.freq);
  freqGuessHz = hz;
  // F2: bkz. yukarıdaki pointerdown handler'daki not — submitFrequencyGuess kendi
  // scheduleNext(duration)'ını çağırıyor, ikinci ensureAutoNext() burada yok.
  try { submitFrequencyGuess(hz); } catch (err) { console.error(err); }
});

// Tonal Denge (G45) — CANLI EQ kaydırıcıları. .ans'lı butonların TEK-tıkla-
// cevapla deseninin AKSİNE burada kullanıcı N kaydırıcıyı istediği kadar
// oynatıp EN SONUNDA "Cevabı Onayla"ya basar — bu yüzden İKİ AYRI event türü
// gerekiyor: "input" (kaydırıcı her hareket ettiğinde, CANLI ses + değer
// güncellemesi, submit YOK) ve "click" (SADECE "Cevabı Onayla" butonunda,
// submit VAR). Yukarıdaki .ans click-delegasyonundan BİLEREK AYRI tutuldu —
// submit butonu .ans class'ı TAŞIMIYOR (bkz. tonal-denge.js
// renderAnswerChoices), o yüzden yukarıdaki blok bunu hiç görmüyor, iki
// mekanizma birbirine karışmıyor.
if (els.answers) els.answers.addEventListener("input", e => {
  if (!roundActive || !activeQuestion || activeQuestion.mode !== "tonal-denge") return;
  const slider = e.target.closest(".tonal-slider");
  if (!slider) return;
  const bandId = slider.dataset.bandId;
  const correctionDb = Number(slider.value);
  tonalDengeCorrections[bandId] = correctionDb;

  const row = slider.closest(".tonal-band");
  const valueEl = row && row.querySelector('[data-role="value"]');
  if (valueEl) valueEl.textContent = `${correctionDb >= 0 ? "+" : ""}${correctionDb.toFixed(1)} dB`;

  // GRAFİĞİ YENİDEN KURMADAN — sadece bu bandın CANLI düğümünün gain'ini
  // (bugDb + correctionDb TOPLAMI) günceller (bkz. tonal-denge.js
  // setLiveBandGain dosya başı notu: tıklama riski yok, ses kesintisiz).
  const band = activeQuestion.bands.find(b => b.id === bandId);
  if (band && audioEngine.audioCtx) {
    mode.setLiveBandGain(audioEngine.audioCtx, bandId, band.bugDb + correctionDb);
  }
});

if (els.answers) els.answers.addEventListener("click", e => {
  if (!roundActive || !activeQuestion || activeQuestion.mode !== "tonal-denge") return;
  if (!e.target.closest(".tonal-submit")) return;
  try { submitTonalDengeGuess(); } catch (err) { console.error(err); }
});

// ═══════════════════════════════════════════════════════════════════════════
// Ses dosyası yükleme
// ═══════════════════════════════════════════════════════════════════════════

// accept özniteliği validateAudioFile'ın kabul ettiği listeyle AYNI kaynaktan (bkz. E1) —
// native dosya seçicinin WAV gibi formatları elemesini önlemek için MIME joker + WAV
// MIME varyantları + uzantı listesi birleşimi kullanılıyor.
if (els.audioFileInput) els.audioFileInput.accept = audioAcceptAttr();
if (els.toolsFileInput) els.toolsFileInput.accept = audioAcceptAttr();

// G53 — KÖK ÇÖZÜM: G52'nin "transform ataları" düzeltmesi cihazda YETMEDİ
// (kullanıcı raporu) — web `<input type="file">` iOS WKWebView/Capacitor'da
// güvenilir DEĞİL (transform hariç başka WebKit/Capacitor tuhaflıkları da
// var, kesin teşhis edilemedi). KÖK ÇÖZÜM: Capacitor'ın NATIVE dosya seçici
// plugin'i (@capawesome/capacitor-file-picker, `FilePicker.pickFiles()`,
// UIDocumentPickerViewController kullanır — iOS'ta izin GEREKTİRMEZ, bkz.
// plugin README "Do I need any runtime permissions?"). Native shell'de
// (gerçek iOS/Android build) Capacitor bu plugin'i `window.Capacitor.
// Plugins.FilePicker`'a otomatik kaydeder — projenin KENDİ yerleşik deseni
// (bkz. storage.js:getPreferencesPlugin, app.js:getVolumeButtonsPlugin) HİÇ
// bundler/ES-import kullanmıyor, global `window.Capacitor.Plugins.*`'tan
// okuyor, burada da AYNI desen izlendi. Masaüstü/tarayıcı geliştirme
// ortamında (bu proje bundler'sız, `python3 -m http.server` ile servis
// ediliyor) `window.Capacitor` YOK — o zaman G52'nin transform-dışı,
// relocated `<input type="file">` + proxy-buton yolu FALLBACK olarak AYNEN
// KORUNDU (aşağıdaki `change` listener'ları hâlâ bağlı, hiç silinmedi).
// G55 — DERİN TEŞHİS: G53'ün native plugin'i cihazda YİNE açılmadı (kullanıcı
// raporu, G52'nin web-input düzeltmesi de tutmamıştı). Kök sebep zinciri
// DÖRT ayrı halkadan oluşuyor ve HANGİSİNİN kırık olduğu bu ortamdan (masaüstü,
// window.Capacitor doğal olarak yok) AYIRT EDİLEMEZ — bu yüzden HER halka
// kendi net, tek başına anlaşılır console.log/console.error satırına VE
// (kullanıcı Xcode/Safari Inspector'a bakmasa bile GÖREBİLSİN diye) bir
// toast()'a bağlandı:
//   1) window.Capacitor tanımlı mı — DEĞİLSE bu bir native build/WebView
//      köprüsü sorunu (Capacitor'ın KENDİSİ hiç yüklenmemiş).
//   2) window.Capacitor.Plugins.FilePicker tanımlı mı — DEĞİLSE plugin native
//      tarafta (Package.swift/CapApp-SPM/Xcode paket çözümü) KAYITLI DEĞİL.
//      EN OLASI kök sebep budur (bkz. DURUM.md G55 BİTTİ "XCODE TARAFI" notu) —
//      npx cap sync ios SADECE Package.swift'i günceller, Xcode'un YENİ yerel
//      paketi GERÇEKTEN derlemesi için ya otomatik yeniden-çözümlemesi ya da
//      "File > Packages > Reset Package Caches" + temiz build GEREKİR.
//   3) pickFiles() çağrısı yapılıyor mu, hangi anda — çağrıdan HEMEN ÖNCE ayrı
//      bir log (önceki sürümde YOKTU — "buton mu ölü, çağrı mı hiç olmuyor"
//      ayrımı bu satır olmadan YAPILAMAZDI).
//   4) pickFiles() dönüyor mu (sonuç/iptal) yoksa reddediyor mu (hata) — ikisi
//      AYRI loglanıyor.
function getFilePickerPlugin() {
  if (!window.Capacitor) {
    console.warn("[filepicker-diag] 1) window.Capacitor TANIMSIZ — Capacitor native köprüsü bu WebView'de hiç yüklenmemiş (masaüstü tarayıcıdaysan bu NORMAL, web fallback'e düşülecek).");
    return null;
  }
  const plugin = window.Capacitor.Plugins && window.Capacitor.Plugins.FilePicker;
  if (!plugin) {
    console.error("[filepicker-diag] 2) window.Capacitor VAR ama window.Capacitor.Plugins.FilePicker TANIMSIZ — plugin native tarafta KAYITLI DEĞİL. Xcode'da 'CapApp-SPM' paketinin yeniden çözümlendiğinden (File > Packages > Reset Package Caches) ve temiz build alındığından emin ol.");
    toast("Dosya seçici bulunamadı", "FilePicker plugin'i native tarafta yüklenmemiş görünüyor — Xcode'da paketleri yeniden çözümleyip temiz build almak gerekebilir.");
    return null;
  }
  console.log("[filepicker-diag] 1-2) window.Capacitor VE Plugins.FilePicker TANIMLI — plugin doğru kayıtlı.");
  return plugin;
}

// Native picker'dan dönen PickedFile'ı (blob/path) upload.js'in beklediği
// gerçek bir `File` nesnesine köprüler — böylece validateAudioFile/
// uploadManager.loadFile (İKİSİ de sadece .name/.size/.arrayBuffer()
// bekliyor) TEK SATIR bile değişmeden AYNEN çalışmaya devam ediyor (web
// fallback'iyle TAM AYNI işleme fonksiyonlarını paylaşıyorlar, bkz. altta).
// Dönüş: File nesnesi (başarılı) | null (kullanıcı iptal etti ya da hata —
// hata zaten loglandı/feedback gösterildi, çağıran tarafın AYRICA bir şey
// YAPMASINA gerek yok) | undefined (native plugin bu ortamda YOK — çağıran
// taraf web fallback'ine düşmeli).
async function pickNativeAudioFile() {
  const plugin = getFilePickerPlugin();
  if (!plugin) return undefined;
  console.log("[filepicker-diag] 3) pickFiles() ÇAĞRILIYOR — buton→fonksiyon zinciri buraya kadar SAĞLAM, şimdi native picker açılmalı.");
  try {
    const result = await plugin.pickFiles({ limit: 1 });
    console.log("[filepicker-diag] 4) pickFiles() DÖNDÜ (reddetmedi) — ham sonuç:", JSON.stringify(result));
    const picked = result && result.files && result.files[0];
    if (!picked) {
      console.log("[filepicker-diag] Dosya seçilmedi (kullanıcı iptal etti ya da picker boş sonuç döndürdü) — hata DEĞİL.");
      return null;
    }
    let blob;
    if (picked.blob) {
      blob = picked.blob; // web implementasyonu (plugin kendi içinde input kullanıyor)
    } else if (picked.path && window.Capacitor && window.Capacitor.convertFileSrc) {
      // iOS/Android: path var, blob yok — plugin'in KENDİ önerdiği fetch+
      // convertFileSrc deseni (bkz. plugin README "Upload a picked file").
      const resp = await fetch(window.Capacitor.convertFileSrc(picked.path));
      blob = await resp.blob();
    } else {
      throw new Error("dosya verisine (blob/path) erişilemedi");
    }
    console.log("[filepicker] dosya seçildi:", picked.name, "| tip:", picked.mimeType || "(boş)", "|", Math.round((picked.size || blob.size) / 1024), "KB");
    return new File([blob], picked.name || "ses-dosyasi", { type: picked.mimeType || blob.type || "" });
  } catch (err) {
    // Kullanıcının seçiciyi iptal etmesi bazı platformlarda reject olarak
    // gelir (ör. "cancel" içeren bir mesajla) — bu bir HATA değil, sessizce
    // çık. Gerçek hatalarda kullanıcıya bilgi ver.
    if (err && /cancel/i.test(err.message || err.errorMessage || "")) {
      console.log("[filepicker-diag] pickFiles() reddetti ama mesaj 'cancel' içeriyor — kullanıcı iptali, hata DEĞİL.");
      return null;
    }
    console.error("[filepicker-diag] 4) pickFiles() REDDETTİ (native tarafta hata) —", err && err.name, err && err.message, err);
    toast("Yükleme hatası", `Dosya seçilemedi: ${(err && err.message) || "bilinmeyen hata"}`);
    return null;
  }
}

// accept özniteliği validateAudioFile'ın kabul ettiği listeyle AYNI kaynaktan (bkz. E1) —
// native dosya seçicinin WAV gibi formatları elemesini önlemek için MIME joker + WAV
// MIME varyantları + uzantı listesi birleşimi kullanılıyor. SADECE web fallback
// input'ları için anlamlı (native FilePicker kendi UTI/tip filtresini kullanır,
// buraya types VERİLMEDİ — task'ın "audio/*" kadar geniş serbestliği korunsun diye).
if (els.audioFileInput) els.audioFileInput.accept = audioAcceptAttr();
if (els.toolsFileInput) els.toolsFileInput.accept = audioAcceptAttr();

// Tek upload'ın (Tonal Denge dahil TÜM tek-kaynak modlar) GERÇEK işleme
// mantığı — hem native picker hem web fallback'in `change` listener'ı BU
// fonksiyonu çağırır, iki yol da TEK bir doğrulama/yükleme/geri-bildirim
// kod yoluna çıkar.
async function processSingleUploadFile(file) {
  if (!file) return;
  const validation = validateAudioFile(file);
  if (!validation.ok) {
    setFeedback(validation.title, validation.detail);
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
    const nameEl = document.getElementById("audioFileInputName");
    if (nameEl) nameEl.textContent = file.name;
    setFeedback("Ses yüklendi", `${file.name} başarıyla yüklendi. "Oyunu Başlat" ile çalmaya başlar.`);
  } catch (err) {
    console.error("[upload] loadUploadedAudio dışında beklenmeyen hata:", err && err.name, err && err.message, err);
    setFeedback("Yükleme hatası", "Bu ses dosyası açılamadı. Farklı bir mp3/wav dene.");
  }
}
els.audioFileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  e.target.value = ""; // aynı (geçersiz) dosya tekrar seçilirse change event'i yine tetiklensin
  processSingleUploadFile(file);
});

// G51 — Motor 3 (Frekans Çakışması): "kendi dosyalarım" çiftinin İKİ AYRI
// yükleme yolu — processSingleUploadFile'ın AYNI doğrulama/hata deseni,
// SADECE hedef uploadManager (A/B) ve geri bildirim metni farklı. Her ikisi
// de KENDİ 100 MB sınırını KENDİ dosyasına uygular (core/upload.js:
// MAX_AUDIO_FILE_MB, validateAudioFile her çağrıda BAĞIMSIZ çalışır) — TOPLAM
// bir sınır YOK, task'ın "her biri 100 MB" isteği. G53: native/web'in İKİSİ
// de bu fonksiyonu çağırır (bkz. processSingleUploadFile notu).
async function processCakismaUploadFile(file, uploadMgr, inputId, slotLabel) {
  if (!file) return;
  const validation = validateAudioFile(file);
  if (!validation.ok) {
    setFeedback(validation.title, validation.detail);
    return;
  }
  try {
    await audioEngine.initAudio();
    const res = await uploadMgr.loadFile(file);
    if (!res.ok) {
      setFeedback(res.title, res.detail);
      return;
    }
    const nameEl = document.getElementById(`${inputId}Name`);
    if (nameEl) nameEl.textContent = file.name;
    setFeedback(`Kaynak ${slotLabel} yüklendi`, `${file.name} başarıyla yüklendi. "Oyunu Başlat" ile çalmaya başlar.`);
  } catch (err) {
    console.error(`[cakisma-upload-${slotLabel}] beklenmeyen hata:`, err && err.name, err && err.message, err);
    setFeedback("Yükleme hatası", "Bu ses dosyası açılamadı. Farklı bir mp3/wav dene.");
  }
}
function wireCakismaUpload(inputEl, uploadMgr, slotLabel) {
  if (!inputEl) return;
  inputEl.accept = audioAcceptAttr();
  inputEl.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    processCakismaUploadFile(file, uploadMgr, inputEl.id, slotLabel);
  });
}
wireCakismaUpload(els.cakismaFileInputA, uploadManagerA, "A");
wireCakismaUpload(els.cakismaFileInputB, uploadManagerB, "B");

// G53: proxy dosya-seçici butonları — ÖNCE native FilePicker dener (gerçek
// iOS/Android build), plugin bu ortamda YOKSA (masaüstü/web geliştirme)
// G52'nin relocated (transform'suz) `<input type="file">`'ına SENKRON
// `.click()` ile düşer — `await pickNativeAudioFile()` İÇİNDE plugin yoksa
// HİÇBİR native köprü/await zinciri kurulmadan hemen `undefined` döndüğü
// için (senkron erken çıkış), fallback dalındaki `.click()` HÂLÂ orijinal
// kullanıcı jestine yeterince yakın kalıyor (aynı olay-handler'ın devamı).
// G56: her butonun İLK satırı KENDİ hedefini logluyor — bu, task'ın "buton mu
// ölü" sorusuna KESİN cevap verir: cihazda bir Frekans Çakışması upload
// butonuna basılınca bu log HİÇ görünmüyorsa sorun DOM/event-binding'te
// (buton ölü); görünüyorsa sorun pickNativeAudioFile()'ın kendi zincirinde
// (bkz. G55'in [filepicker-diag] logları) — ikisi ARTIK ayırt edilebiliyor.
document.querySelectorAll(".upload-trigger-btn").forEach(btn => {
  const targetId = btn.dataset.fileTarget;
  btn.addEventListener("click", async () => {
    // G63 (PAYWALL.md Parça 2, tetikleme #4): "Kendi dosya yükleme: kilitli" —
    // Oyun Ayarları'nın tekli upload satırı VE Motor 3'ün iki upload yuvası
    // AYNI TEK yolu (bu forEach) paylaşıyor, tek noktadan paywall'a açılıyor.
    if (paywall.isUploadLocked(isUserPro())) {
      if (!openPaywallReason("upload")) toast(paywall.LOCK_MESSAGES.upload.title, paywall.LOCK_MESSAGES.upload.detail, "pro");
      return;
    }
    console.log(`[filepicker-diag] 0) buton tıklandı: data-file-target="${targetId}"`);
    const picked = await pickNativeAudioFile();
    if (picked === undefined) {
      const input = document.getElementById(targetId);
      if (input) input.click();
      return;
    }
    if (!picked) return; // iptal/hata — pickNativeAudioFile zaten loglayıp gerekirse feedback gösterdi
    if (targetId === "audioFileInput") processSingleUploadFile(picked);
    else if (targetId === "cakismaFileInputA") processCakismaUploadFile(picked, uploadManagerA, "cakismaFileInputA", "A");
    else if (targetId === "cakismaFileInputB") processCakismaUploadFile(picked, uploadManagerB, "cakismaFileInputB", "B");
  });
});

// Kaynak çifti değişince (Kick+Bas ↔ Kendi dosyalarım) upload satırlarının
// görünürlüğü YENİDEN hesaplanır — initSettingsSheet'in GENERİK sheet-seçim
// mekanizması bu select'in "change" event'ini zaten dispatch ediyor (diğer
// tüm data-sheet-select'lerle AYNI), buraya SADECE görünürlük senkronu ekleniyor.
if (els.cakismaPairSelect) els.cakismaPairSelect.addEventListener("change", () => syncCakismaVisibility());

// AŞAMA 3 (Çöz) sonrası öncesi/sonrası — audio-engine.js:setDualCut'ı SADECE
// doğru kaynağın filtresine (question.correctSource) uygular, grafiği YENİDEN
// KURMADAN (bkz. submitCakismaGuess notu).
if (els.cakismaBefore) els.cakismaBefore.addEventListener("click", () => {
  if (!activeQuestion || activeQuestion.mode !== "cakisma") return;
  audioEngine.setDualCut(activeQuestion.correctSource, 0);
  els.cakismaBefore.classList.add("on");
  if (els.cakismaAfter) els.cakismaAfter.classList.remove("on");
});
if (els.cakismaAfter) els.cakismaAfter.addEventListener("click", () => {
  if (!activeQuestion || activeQuestion.mode !== "cakisma") return;
  audioEngine.setDualCut(activeQuestion.correctSource, -Math.abs(activeQuestion.correctCutDb));
  els.cakismaAfter.classList.add("on");
  if (els.cakismaBefore) els.cakismaBefore.classList.remove("on");
});

// ═══════════════════════════════════════════════════════════════════════════
// Kontrol düğmeleri
// ═══════════════════════════════════════════════════════════════════════════

// startBtn duruma göre 3 iş yapar: Oyunu Başlat / Tekrar Çal / Durdur (bkz. updateStartBtnLabel)
els.startBtn.addEventListener("click", async () => {
  await audioEngine.initAudio();
  if (blockIfLivesOut()) return;

  if (!activeQuestion) {
    // G61 (PAYWALL.md): SAVUNMACI ikinci kontrol — mod-kartı tıklaması (bkz.
    // renderModeGrid) çakışma'nın günlük hakkını ÖNDEN engelliyor ama "Tekrar
    // Oyna"/"10 soru daha" (startFreshAttempt) mod-kartına HİÇ uğramadan
    // doğrudan buraya (goScreen("game")+setAutoPlay) düşüyor — aynı moddayken
    // günün hakkı bu SIRADA tükenmiş olabilir (ör. Pro simülasyonu kapatılıp
    // aynı oturumda tekrar denendi). Tek doğruluk kaynağı YİNE paywall.js.
    if (!isUserPro() && paywall.isDailyTasteMode(mode.getMeta().id) && !paywall.canPlayDailyTaste(stats.dailyTasteLastPlayedAt, Date.now())) {
      if (!openPaywallReason("dailyUsed")) {
        const msg = paywall.LOCK_MESSAGES["daily-used"];
        toast(msg.title, msg.detail, "pro");
      }
      return;
    }
    // Gerçek bir fresh-start (bkz. roundsInThisPlaySession tanımındaki not) —
    // Tekrar Çal (autoStopped dalı, aşağıda) BUNU sıfırlamaz, sadece burası.
    roundsInThisPlaySession = 0;
    // G61: günlük tadımlık BURADA (gerçek round başlarken), mod kartına
    // dokunulduğu anda DEĞİL işaretleniyor — yanlışlıkla karta basıp geri
    // çıkan bir kullanıcı günün hakkını KAYBETMESİN diye.
    if (!isUserPro() && paywall.isDailyTasteMode(mode.getMeta().id)) {
      stats.dailyTasteLastPlayedAt = Date.now();
      persistStats();
    }
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
  if (blockIfLivesOut()) return;
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

// G79: tasarımın "döngü ikonu" — mevcut startAbLoop/stopAbLoop'u ÇAĞIRIR
// (uzun-basmanın AYNI fonksiyonları, YENİ bir durum makinesi EKLENMEDİ).
// Aktif/pasif görünümü #abToggle'daki .loop class'ının kardeş seçicisiyle
// (bkz. styles.css) — o class ZATEN startAbLoop/stopAbLoop tarafından
// yönetiliyor, burada TEKRAR yönetilmiyor.
if (els.abLoopBtn) els.abLoopBtn.addEventListener("click", () => {
  if (abLoopTimer) stopAbLoop();
  else startAbLoop();
});

// G81: Frekans Bulma'nın tek-bant karşılaştırma önizlemesi #feedbackBox'a
// (.fb-ear "kulak" omuz butonları) TAŞINDI — #freqInfo artık SADECE Pro Plus
// için kullanılıyor (bkz. submitProPlusGuess/showProPlusInfoPanel, o modun
// KENDİ cmprow'u/önizlemesi YOK, SADECE kapat butonu var). Bu yüzden burada
// SADECE .freq-info-close kaldı.
if (els.freqInfo) els.freqInfo.addEventListener("click", (e) => {
  if (e.target.closest(".freq-info-close")) goToNextRound();
});

// G81: Geri bildirim kartındaki karşılaştırma önizlemesi ("kulak" omuz
// butonları, bkz. index.html #fbEarLeft/#fbEarRight + showFrequencyFeedback).
// ESKİDEN #freqInfo'nun .cmp'siydi (G15/F2) — mantık BİREBİR aynı taşındı,
// SADECE hedef eleman (#freqInfo → #feedbackBox) ve buton class'ı (.cmp →
// .fb-ear) değişti. Butonlar #feedbackBox'ın SABİT çocukları (showFrequencyFeedback
// innerHTML'i YENİDEN KURMAZ, SADECE textContent/dataset günceller) — yine de
// delegasyon kullanılıyor (diğer .fb-close deseniyle TUTARLI).
if (els.feedbackBox) els.feedbackBox.addEventListener("click", async (e) => {
  if (e.target.closest(".fb-close")) {
    goToNextRound();
    return;
  }
  const btn = e.target.closest(".fb-ear");
  if (!btn || btn.classList.contains("hidden") || !activeQuestion || activeQuestion.mode !== "frequency") return;

  const preview = btn.dataset.preview;
  let guessQuestion = null;
  if (preview === "mine") {
    const guessHz = Number(btn.dataset.guessHz);
    if (!Number.isFinite(guessHz)) return;
    guessQuestion = { ...activeQuestion, freq: guessHz };
  } else if (preview !== "clean" && preview !== "correct") {
    return;
  }

  els.feedbackBox.querySelectorAll(".fb-ear").forEach(c => c.classList.remove("on"));
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
  // G81: otomatik-geçiş ÇUBUĞU da (fbAdvanceBar) AYNI anda paused — JS
  // zamanlayıcısıyla görsel olarak SENKRON kalsın diye.
  pauseFeedbackAdvanceBar();
  clearTimeout(cmpPreviewStopTimer);
  if (cmpPreviewRemainingMs === null) {
    cmpPreviewRemainingMs = roundFlow.captureRemainingAndClear();
  }
  cmpPreviewStopTimer = setTimeout(() => {
    cmpPreviewStopTimer = null;
    els.feedbackBox.querySelectorAll(".fb-ear").forEach(c => c.classList.remove("on"));
    // G15 düzeltme: captureRemainingAndClear() orijinal otomatik-geçiş zamanlayıcısı bu
    // önizlemeye basılana kadar zaten ateşlenmişse (gerçek dünyada birkaç saniye sürebilir)
    // null döner. Eskiden bu null değeri "yeniden kurma" adımını tamamen atlatıyordu ve tur
    // kalıcı olarak asılı kalıyordu (X/Atla dışında çıkış yolu yoktu). remain null/0 olsa
    // bile ensureAutoNext her zaman çağrılır — roundFlow zaten null/0 durumunda 1500ms
    // varsayılana düşüyor (bkz. round-flow.js ensureAutoNext).
    const remain = cmpPreviewRemainingMs;
    cmpPreviewRemainingMs = null;
    if (activeQuestion && !autoStopped) ensureAutoNext(remain);
    // G81: JS zamanlayıcısı remain kadar bir süre için YENİDEN kurulduğu anda
    // çubuk da devam eder — animation-play-state:paused sırasında GEÇEN zaman
    // sıfırlanmadığı için (tarayıcı animasyonu kaldığı yerden sürdürür) kalan
    // görsel süre JS'in remain'iyle KENDİLİĞİNDEN eşleşir, ayrı bir hesap YOK.
    resumeFeedbackAdvanceBar();
  }, CMP_PREVIEW_RESUME_MS);
});

els.hintBtn.addEventListener("click", giveHint);

// G90 (madde 1): geri butonu artık DOĞRUDAN çıkmıyor — SADECE round GERÇEKTEN
// aktifken ("kaybedecek" bir şey varken) onay penceresi araya giriyor. Boş/
// idle ekranda (activeQuestion yok — "Oyunu Başlat" bekleniyor) doğrudan
// çıkış KORUNDU, orada onay istemek gereksiz sürtünme olurdu.
function performExit() {
  if (activeQuestion && !autoStopped) pauseRound();
  goScreen("menu");
}
function openExitConfirm() {
  if (els.exitConfirmOverlay) els.exitConfirmOverlay.classList.add("open");
  if (els.exitConfirmBox) els.exitConfirmBox.classList.add("open");
}
function closeExitConfirm() {
  if (els.exitConfirmOverlay) els.exitConfirmOverlay.classList.remove("open");
  if (els.exitConfirmBox) els.exitConfirmBox.classList.remove("open");
}
els.backBtn.addEventListener("click", () => {
  if (activeQuestion) openExitConfirm();
  else performExit();
});
if (els.exitConfirmOverlay) els.exitConfirmOverlay.addEventListener("click", closeExitConfirm);
if (els.exitConfirmStay) els.exitConfirmStay.addEventListener("click", closeExitConfirm);
if (els.exitConfirmLeave) els.exitConfirmLeave.addEventListener("click", () => {
  closeExitConfirm();
  performExit();
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
// G64: mod-başına terminoloji core/level-sheet-terms.js'te (TEK yer, çeviriye
// zemin — bkz. o dosyanın başlık notu). Değerler core/difficulty-curve.js'in
// JENERİK difficultyParams()'ından DEĞİL, AKTİF modun KENDİ
// paramsForDifficultyPosition(level)'ından okunuyor — 10 mod da bu fonksiyonu
// AYNI imzayla (level girdisi) dışa aktarıyor (bkz. o fonksiyonların kendi
// dosya başı notları, "diğer modların paramsForDifficultyPosition'ıyla AYNI
// mod-agnostik girdi"), sadece DÖNDÜRDÜKLERİ alanlar mod-spesifik.
function renderLevelSheet() {
  const modeId = mode.getMeta().id;
  const level = progress.modeLevel(stats, modeId);
  const xpProg = progress.xpProgress(progress.modeXp(stats, modeId));
  const tier = tierForLevel(level);
  const diff = mode.DIFFICULTY[tier];
  const terms = levelSheetTermsFor(modeId);
  const params = mode.paramsForDifficultyPosition(level);
  const sensVal = terms.formatSensitivity(params);
  const amountVal = terms.amountLabel ? terms.formatAmount(params) : null;
  const percent = Math.max(0, Math.min(100, (xpProg.current / xpProg.required) * 100));
  // core/difficulty-curve.js:difficultyParams()'ın döndürdüğü "capped" alanı
  // ARTIK burada YOK (mode.paramsForDifficultyPosition çıktısında hiçbir modda
  // bu alan tanımlı değil) — ama ölçüt AYNI (10 modun HEPSİ LEVEL_CAP=20
  // kullanıyor, `grep` ile doğrulandı), o yüzden burada DOĞRUDAN hesaplanıyor.
  const capped = level >= DIFFICULTY_CONFIG.LEVEL_CAP;

  let nextLevelText;
  if (capped) {
    nextLevelText = `En üst hassasiyettesin (Seviye ${DIFFICULTY_CONFIG.LEVEL_CAP}). Bundan sonra ${terms.sensitivityLabel.toLowerCase()} SABİT kalıyor — bunun yerine süre kısalıyor${terms.amountLabel ? `, ${terms.amountLabel.toLowerCase()} küçülmeye devam ediyor` : ""}.`;
  } else {
    const nextParams = mode.paramsForDifficultyPosition(level + 1);
    const nextSensVal = terms.formatSensitivity(nextParams);
    nextLevelText = `Seviye ${level + 1}'de ${terms.sensitivityLabel.toLowerCase()} ${nextSensVal} olacak${terms.amountLabel ? `, ${terms.amountLabel.toLowerCase()} ${terms.formatAmount(nextParams)} olacak` : ""}.`;
  }

  if (els.lvlSheetTitle) els.lvlSheetTitle.textContent = `Seviye ${level}`;
  if (!els.lvlSheetBody) return;
  const amountRow = terms.amountLabel
    ? `<div style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--tx-3)">${terms.amountLabel}</span><b>${amountVal}</b></div>`
    : "";
  // G90 (madde 4): "Mod Adı · Seviye N" — MODE_CATALOG'un AYNI entry.ad'ı
  // (openGuideSheet'in de kullandığı kaynak, bkz. yukarısı).
  const catalogEntry = MODE_CATALOG.find(e => e.id === modeId);
  const modeName = catalogEntry ? catalogEntry.ad : "Bu mod";
  const idCard = `
    <div class="lvl-sheet-id-card">
      <div class="lvl-sheet-pentagon">
        <svg width="54" height="54" viewBox="0 0 52 52">
          <polygon points="26,3 48,19 40,46 12,46 4,19" fill="var(--gold-grad)" stroke="#fbe9a8" stroke-width="1.5"></polygon>
          <polygon points="26,9 42.5,21 36.5,41 15.5,41 9.5,21" fill="#2a2013" stroke="#c79a33" stroke-width="1"></polygon>
        </svg>
        <div class="lvl-sheet-pentagon-label">
          <div class="lvl-sheet-pentagon-sv">Sv</div>
          <div class="lvl-sheet-pentagon-num">${level}</div>
        </div>
      </div>
      <div class="lvl-sheet-id-text"><h5>${modeName} · Seviye ${level}</h5><p>${catalogEntry ? catalogEntry.aciklama : ""}</p></div>
    </div>`;
  els.lvlSheetBody.innerHTML = `
    ${idCard}
    <p style="margin:14px 2px 0;font-size:15px;line-height:1.5;color:var(--tx-2)">${terms.sensitivityLabel}: ${sensVal}${amountVal !== null ? ` · ${terms.amountLabel}: ${amountVal}` : ""}. Şu anki hassasiyetin bu.</p>
    <div class="card" style="margin-top:16px;padding:14px 16px">
      <div style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--tx-3)">${terms.sensitivityLabel}</span><b>${sensVal}</b></div>
      ${amountRow}
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
// G77: zorluk göstergesi çipi — levelChip'İN AYNI sheet'ini açar, KENDİ
// #difficultySelect'i DEĞİŞTİRME davranışı YOK (SADECE bilgi, bkz. index.html notu).
if (els.gameDiffChip) els.gameDiffChip.addEventListener("click", openLevelSheet);

// "i" bilgi/rehber sistemi (bkz. core/guide-texts.js) — KALICI, tıkla-aç/tıkla-kapa.
// TEK sheet (guideSheet), lvlSheet'in AYNI deseni: ana ekranın "i"si GENERAL_GUIDE'ı,
// her mod kartının "i"si o modun MODE_GUIDE_TEXTS[modeId]'ini doldurur. modeId=null
// ise genel rehber gösterilir.
function openGuideSheet(modeId) {
  // [guide-i-diag] G71: mod içi "i" cihazda tepkisiz görünüyordu (kök sebep:
  // guideSheet DOM'da #screen-menu'nün İÇİNDEYDİ, .screen{display:none}
  // yüzünden oyun ekranından AÇILAMIYORDU — aşağıya bkz. index.html'in
  // taşınan blok notu). Bu log KALICI (filepicker-diag'ın AYNI deseni,
  // bkz. app.js "[filepicker-diag]" satırları) — "i" tepkisiz görünürse
  // ilk bakılacak yer: bu log hiç ÇIKMIYORSA sorun event-binding'te
  // (buton DOM'da yok/listener bağlanmadı), ÇIKIYOR ama sheet GÖRÜNMÜYORSA
  // sorun guideSheet'in DOM konumunda/CSS'inde.
  console.log(`[guide-i-diag] openGuideSheet çağrıldı — modeId: ${modeId || "(null, genel rehber)"}, guideSheetBody bulundu: ${!!els.guideSheetBody}`);
  if (!els.guideSheetBody) return;
  if (modeId && MODE_GUIDE_TEXTS[modeId]) {
    const entry = MODE_CATALOG.find(e => e.id === modeId);
    if (els.guideSheetTitle) els.guideSheetTitle.textContent = entry ? entry.ad : "Bu mod";
    // G90 (madde 5): 96px görsel kutusu — o modun ana ekran kart görseli
    // (modeVisualSvg, mode-visuals.js — mode-card-viz'in AYNI kaynağı).
    // MODE_GUIDE_TEXTS'in (ne öğretir) ALTINA MODE_OPTIONS_TEXTS (oyun
    // seçenekleri) artık tasarımın çip madde listesi stilinde TEK madde.
    const visualBox = `<div class="guide-visual-box">${modeVisualSvg(modeId) || ""}</div>`;
    const optionsPoint = MODE_OPTIONS_TEXTS[modeId]
      ? `<div class="guide-point"><i></i><span><b style="color:var(--am);font-weight:700">Oyun seçenekleri:</b> ${MODE_OPTIONS_TEXTS[modeId]}</span></div>`
      : "";
    els.guideSheetBody.innerHTML = `
      ${visualBox}
      <p style="margin:14px 2px 0;font-size:13.5px;line-height:1.6;color:#b8bdc4">${MODE_GUIDE_TEXTS[modeId]}</p>
      <div class="guide-point-list">${optionsPoint}</div>`;
  } else {
    if (els.guideSheetTitle) els.guideSheetTitle.textContent = GENERAL_GUIDE.title;
    // G90 (madde 5): genel rehberde tek bir moda özel görsel YOK (visual box
    // atlandı, uydurulmadı) — ilk bölüm (title'la aynı başlık) gövde metni,
    // kalan 4 bölüm çip madde listesi olarak sunuluyor. guide-texts.js'in
    // KENDİSİ değişmedi, SADECE burada nasıl render edildiği değişti.
    const [intro, ...rest] = GENERAL_GUIDE.sections;
    els.guideSheetBody.innerHTML = `
      <p style="margin:8px 2px 0;font-size:13.5px;line-height:1.6;color:#b8bdc4">${intro.body}</p>
      <div class="guide-point-list">${rest.map(s => `<div class="guide-point"><i></i><span><b style="color:var(--am);font-weight:700">${s.heading}:</b> ${s.body}</span></div>`).join("")}</div>`;
  }
  if (els.guideSheetOverlay) els.guideSheetOverlay.classList.add("open");
  if (els.guideSheet) els.guideSheet.classList.add("open");
}
function closeGuideSheet() {
  if (els.guideSheetOverlay) els.guideSheetOverlay.classList.remove("open");
  if (els.guideSheet) els.guideSheet.classList.remove("open");
}
if (els.menuInfoBtn) els.menuInfoBtn.addEventListener("click", () => openGuideSheet(null));
// G70: mod İÇİ (oyun ekranı) "i" — mod kartındaki .mode-info-btn'in AYNI
// openGuideSheet(modeId) çağrısı, YENİ bir içerik/sheet İCAT edilmedi.
// mode.getMeta().id TIKLAMA ANINDA okunuyor (statik yakalanmadı) — kullanıcı
// oyun ekranındayken HANGİ mod aktifse (enterMode() zaten `mode`'u güncelledi)
// o modun bilgisini açar.
if (els.gameInfoBtn) {
  els.gameInfoBtn.addEventListener("click", () => {
    console.log(`[guide-i-diag] #gameInfoBtn tıklandı — aktif mod: ${mode.getMeta().id}`);
    openGuideSheet(mode.getMeta().id);
  });
} else {
  // [guide-i-diag] Buton DOM'da HİÇ bulunamadıysa (id yanlış/element yok)
  // bu satır uygulama açılışında BİR KEZ konsola düşer — sessiz başarısızlık
  // yerine görünür bir sinyal.
  console.warn("[guide-i-diag] #gameInfoBtn DOM'da bulunamadı — click dinleyicisi bağlanamadı.");
}
if (els.guideSheetClose) els.guideSheetClose.addEventListener("click", closeGuideSheet);
if (els.guideSheetOverlay) els.guideSheetOverlay.addEventListener("click", closeGuideSheet);

// "i" bilgi sistemi, GEÇİCİ SPOTLIGHT rehber turu (G68 — basit ipucu
// bandından YÜKSELTİLDİ, bkz. core/guide-texts.js:SPOTLIGHT_STEPS). Bir
// modun İLK HINT_ROUNDS_LIMIT round'unda görünür, sonra otomatik açılmaz.
// Kalıcı sayaç (stats.perMode[modeId].hintRoundsShown) G67'den DEĞİŞMEDİ —
// AYNI alan, artık banner yerine turu tetikliyor.
//
// MİMARİ (KORUMA: mekanik/ses/puanlamaya HİÇ dokunmaz, salt görsel bir
// katman): #spotlightOverlay'in TAMAMI pointer-events:none (styles.css) —
// karartma/delik hiçbir gerçek tıklamayı ENGELLEMEZ, gerçek oyun elementi
// deliğin altında NORMAL çalışmaya devam eder. Adım ilerlemesi İKİ yoldan:
// (1) #spotlightNext ("İleri") — sıradaki adıma geçer; (2) o anki adımın
// GERÇEK hedefiyle kullanıcı etkileşince (aşağıdaki document click
// capture-listener, preventDefault/stopPropagation YOK — gerçek tıklama
// NORMAL kendi handler'ına da ulaşır) — bu durumda sonraki adımın hedefi
// AYNI elemente çözülüyorsa (çoğu modda "select"="confirm", choiceOnly
// modların hepsinde TEK tıkla submit) tur doğrudan TAMAMLANMIŞ sayılır,
// aynı kutuyu ikinci kez göstermez.
let spotlightSteps = [];
let spotlightIndex = 0;
let spotlightModeId = null;
let spotlightInteractionTarget = null;
let spotlightResizeBound = false;

// G90 (madde 7): tasarımın balon başlığı (16.5px/800) — SPOTLIGHT_STEPS'in
// KENDİSİNDE yok (sadece {target, text}), bu yüzden guide-texts.js'e YENİ bir
// alan İCAT ETMEDEN, zaten var olan target anahtarına (4 sabit değer) kısa
// bir Türkçe etiket eşlendi. "select"/"confirm" modların çoğunda AYNI hedefe
// çözülüyor (resolveSpotlightTarget notu) ama BURADA hâlâ kendi target
// string'ine göre ayrı başlıklandırılıyor — o adımlar zaten AYNI turda ardı
// ardına gösterilmiyor (çözüm aynıysa tur tıklamayla doğrudan tamamlanıyor).
const SPOTLIGHT_TARGET_TITLES = {
  listen: "Önce dinle",
  abControl: "A/B Test",
  select: "Seç",
  confirm: "Onayla"
};

// step.target ("listen"/"abControl"/"select"/"confirm") → GERÇEK DOM
// elementi. guide-texts.js bu dosyaya hiç dokunmuyor (saf veri), çözüm
// burada — isChoiceFormat/els zaten bu dosyanın kendi çalışma zamanı durumu.
function resolveSpotlightTarget(targetKey, modeId) {
  if (targetKey === "listen") return els.analyzer;
  // G69: "abControl" — #abToggle'ın KENDİSİ (updateAbToggleUI'ın AYNI mantığı):
  // three-way 3 modda A/B/C döngü, diğerlerinde dry/işlenmiş A/B karşılaştırma.
  // Frekans Çakışması'nda #abToggle GİZLİ (syncCakismaVisibility) — o modun
  // SPOTLIGHT_STEPS dizisinde zaten "abControl" adımı YOK, buraya hiç gelmez.
  if (targetKey === "abControl") return els.abToggle;
  if (targetKey === "confirm" && modeId === "tonal-denge") {
    return els.answers ? els.answers.querySelector(".tonal-submit") : null;
  }
  // "select" ve (tonal-denge DIŞINDAKİ) "confirm": choiceOnly modların
  // HEPSİNDE (frekans-bulma HARİÇ) tek tıkla submit — seçmek zaten
  // onaylamak demek, bkz. isChoiceFormat() notu. Aynı hedefe BİLEREK
  // çözülüyor, ayrı bir "onayla" kontrolü İCAT edilmedi.
  return isChoiceFormat() ? els.answers : els.analyzer;
}

function startSpotlightTourIfNeeded() {
  if (!els.spotlightOverlay) return;
  const modeId = mode.getMeta().id;
  const steps = spotlightStepsFor(modeId);
  const ms = modeState();
  if (!steps || !shouldShowRoundHint(ms.hintRoundsShown)) {
    closeSpotlightTour(false);
    return;
  }
  spotlightSteps = steps;
  spotlightModeId = modeId;
  spotlightIndex = 0;
  ms.hintRoundsShown = (ms.hintRoundsShown || 0) + 1;
  storage.saveStats(stats, history);
  renderSpotlightStep();
}

function renderSpotlightStep() {
  const step = spotlightSteps[spotlightIndex];
  if (!step) { closeSpotlightTour(true); return; }
  const targetEl = resolveSpotlightTarget(step.target, spotlightModeId);
  // Hedef şu an DOM'da yoksa (ör. beklenmedik bir UI durumu) o adımı ATLA —
  // turu yarıda BOZUK göstermektense sessizce ilerlemek daha güvenli.
  if (!targetEl) { spotlightIndex++; renderSpotlightStep(); return; }
  spotlightInteractionTarget = targetEl;
  els.spotlightOverlay.classList.remove("hidden");
  // ÖNCE metni/etiketleri yaz, SONRA konumla — positionSpotlightCallout()
  // callout'un offsetHeight/offsetWidth'ini okuyor, bu YENİ metnin
  // boyutuyla ölçülmeli (önceki adımın stale boyutuyla DEĞİL).
  if (els.spotlightTitle) els.spotlightTitle.textContent = SPOTLIGHT_TARGET_TITLES[step.target] || "";
  if (els.spotlightText) els.spotlightText.textContent = step.text;
  if (els.spotlightStepLabel) els.spotlightStepLabel.textContent = `ADIM ${spotlightIndex + 1}/${spotlightSteps.length}`;
  if (els.spotlightDots) {
    els.spotlightDots.innerHTML = spotlightSteps.map((_, i) =>
      `<div class="spotlight-dot${i === spotlightIndex ? " on" : ""}"></div>`
    ).join("");
  }
  if (els.spotlightNext) els.spotlightNext.textContent = spotlightIndex === spotlightSteps.length - 1 ? "Anladım" : "İleri";
  positionSpotlightHole(targetEl);
  if (!spotlightResizeBound) {
    spotlightResizeBound = true;
    window.addEventListener("resize", () => {
      if (!els.spotlightOverlay || els.spotlightOverlay.classList.contains("hidden")) return;
      const el = resolveSpotlightTarget(spotlightSteps[spotlightIndex].target, spotlightModeId);
      if (el) positionSpotlightHole(el);
    });
  }
}

function positionSpotlightHole(targetEl) {
  if (!els.spotlightHole) return;
  const pad = 8;
  const rect = targetEl.getBoundingClientRect();
  els.spotlightHole.style.top = `${Math.max(0, rect.top - pad)}px`;
  els.spotlightHole.style.left = `${Math.max(0, rect.left - pad)}px`;
  els.spotlightHole.style.width = `${rect.width + pad * 2}px`;
  els.spotlightHole.style.height = `${rect.height + pad * 2}px`;
  positionSpotlightCallout(rect, pad);
}

// G90 (madde 7): balon artık left:16px/right:16px SABİT TAM GENİŞLİK (CSS,
// tasarımın ölçüsü) — SADECE dikey konum (hedefin altı/üstü) burada JS'ten
// hesaplanmaya devam ediyor, yatay hesap KALDIRILDI (artık gereksiz).
function positionSpotlightCallout(rect, pad) {
  if (!els.spotlightCallout) return;
  const vh = window.innerHeight;
  const calloutH = els.spotlightCallout.offsetHeight || 110;
  const spaceBelow = vh - (rect.bottom + pad);
  const top = spaceBelow > calloutH + 16
    ? rect.bottom + pad + 12
    : Math.max(12, rect.top - pad - calloutH - 12);
  els.spotlightCallout.style.top = `${top}px`;
}

// GERÇEK oyun elementiyle etkileşim (dinlemek dışındaki adımlar — "select"/
// "confirm") turu İLERLETİR, hiçbir zaman preventDefault/stopPropagation
// ÇAĞIRMAZ (asıl click handler'lar NORMAL çalışmaya devam eder).
document.addEventListener("click", e => {
  if (!spotlightInteractionTarget) return;
  if (!spotlightInteractionTarget.contains(e.target)) return;
  const completedTarget = spotlightInteractionTarget;
  const nextStep = spotlightSteps[spotlightIndex + 1];
  const nextTarget = nextStep ? resolveSpotlightTarget(nextStep.target, spotlightModeId) : null;
  // Sıradaki adım AYNI elemente çözülüyorsa (çoğu modda select===confirm),
  // ikinci kez AYNI kutuyu göstermek yerine tur burada TAMAMLANMIŞ sayılır.
  if (!nextStep || nextTarget === completedTarget) { closeSpotlightTour(true); return; }
  spotlightIndex++;
  renderSpotlightStep();
}, true);

function advanceSpotlightStep() {
  spotlightIndex++;
  if (spotlightIndex >= spotlightSteps.length) { closeSpotlightTour(true); return; }
  renderSpotlightStep();
}

function closeSpotlightTour() {
  if (els.spotlightOverlay) els.spotlightOverlay.classList.add("hidden");
  spotlightInteractionTarget = null;
  spotlightSteps = [];
  spotlightIndex = 0;
}

if (els.spotlightNext) els.spotlightNext.addEventListener("click", advanceSpotlightStep);
if (els.spotlightSkip) els.spotlightSkip.addEventListener("click", () => closeSpotlightTour(false));

// G37: kulaklık uyarı sheet'i — "Bir daha gösterme" kutusunun durumu, prototipin
// hpConfirm()'üyle AYNI şekilde SADECE onay (Kulaklığım takılı, başla) anında okunuyor,
// checkbox'a tıklamanın kendisi HİÇBİR ŞEY kaydetmiyor — kullanıcı işaretleyip sonra
// "Geri dön" derse hiçbir kalıcı değişiklik olmaz (prototipteki AYNI davranış).
if (els.hpSheetAgain) els.hpSheetAgain.addEventListener("click", () => {
  els.hpSheetAgain.classList.toggle("on");
});
if (els.hpSheetCancel) els.hpSheetCancel.addEventListener("click", closeHeadphoneSheet);
if (els.hpSheetOverlay) els.hpSheetOverlay.addEventListener("click", closeHeadphoneSheet);
if (els.hpSheetConfirm) els.hpSheetConfirm.addEventListener("click", () => {
  if (!pendingHpEntry || !pendingHpRealMode) { closeHeadphoneSheet(); return; }
  // G39: OTURUMLUK — localStorage'a (prefs) DEĞİL, bellekteki hpSkippedThisSession'a
  // yazılıyor; sayfa/uygulama yeniden yüklenince sıfırlanır, uyarı geri gelir.
  if (els.hpSheetAgain && els.hpSheetAgain.classList.contains("on")) {
    hpSkippedThisSession.add(pendingHpEntry.id);
  }
  const entry = pendingHpEntry, realMode = pendingHpRealMode;
  closeHeadphoneSheet();
  enterMode(entry, realMode);
});

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
// G61 (PAYWALL.md): "can dolum özelliği henüz eklenmedi" ARTIK YANLIŞ — gerçek
// zaman-tabanlı dolum var (30 dakikada 1). syncLives() burada TEKRAR çağrılıyor
// çünkü kullanıcı Seans Sonu ekranında dakikalarca oturmuş OLABİLİR — canlar
// menüde/oyun ekranında hiç render edilmeden arka planda dolmuş olabilir, bu
// çağrı olmadan currentLives BAYAT kalırdı.
function startFreshAttempt({ forceChallenge }) {
  hideSessionEnd();
  syncLives();
  if (currentLives <= 0) {
    resetSession();
    // Önceki turun kalıntı UI'ı (soru başlığı + sonuç kartı) startRound()
    // çağrılmadığı için burada temizlenmezse ekranda "canların bitti" mesajı
    // yerine eski soru metni/yanlış-doğru cevap kartı görünmeye devam eder —
    // bkz. G2 doğrulaması.
    if (els.freqInfo) els.freqInfo.classList.add("hidden");
    if (els.questionTitle) {
      els.questionTitle.classList.remove("hidden");
      els.questionTitle.textContent = "Canların bitti";
    }
    if (els.questionMeta) els.questionMeta.textContent = "";
    const msLeft = Math.max(0, (stats.livesLastRefillAt || Date.now()) + paywall.LIVES_REFILL_INTERVAL_MS - Date.now());
    const minsLeft = Math.max(1, Math.ceil(msLeft / 60000));
    setFeedback("Canların bitti", `Şu an devam edemezsin — ${minsLeft} dakikada 1 can dolacak.`);
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
// G82: birincil buton artık DURUMA göre üç farklı gerçek eylem — tasarımın
// "Yeni Seans"/"Reklam izle, +1 can"/"Pro ile sınırsız devam et" ayrımı,
// sessionEndKind (bkz. showSessionEnd) üzerinden. "lives" dalı grantAdLife()'ı
// (G63'ün KENDİ simüle reklam mekaniği, bkz. watchAdBtn) ÇAĞIRIYOR — YENİ bir
// ödül sistemi İCAT EDİLMEDİ. "free" dalı openPaywallReason("sessionLimit")
// (mevcut, GERÇEK paywall giriş noktalarından biri) açıyor.
if (els.resCta) els.resCta.addEventListener("click", async () => {
  if (sessionEndKind === "lost") {
    grantAdLife();
    if (els.resWaitRow && currentLives > 0) { els.resWaitRow.classList.add("hidden"); stopResWaitTicker(); }
    return;
  }
  if (sessionEndKind === "freeLimit") {
    openPaywallReason("sessionLimit");
    return;
  }
  await audioEngine.initAudio();
  startFreshAttempt({ forceChallenge: true });
});
if (els.resRetryBtn) els.resRetryBtn.addEventListener("click", async () => {
  stopResWaitTicker();
  await audioEngine.initAudio();
  startFreshAttempt({ forceChallenge: false });
});
if (els.resMenuBtn) els.resMenuBtn.addEventListener("click", () => {
  stopResWaitTicker();
  hideSessionEnd();
  resetSession();
  goScreen("menu");
});

// G90 (madde 3): Ayarlar sheet'indeki "İlerlemeyi sıfırla" satırı (#settingsResetBtn)
// AYNI resetAllProgress()'i çağırır — İlerleme sekmesindeki #resetStatsBtn'in
// (G87) mantığı burada TEKRARLANMADI, tek fonksiyona çıkarıldı.
function resetAllProgress() {
  storage.clearStats();
  storage.clearDaily();
  // G87: İlerleme'nin AYRI "bölge verisini temizle" bağlantısı (Zayıf Bölge
  // Raporu kartı artık tasarımda katlanır DEĞİL, o bağlantının yeri yok)
  // KALDIRILDIĞI için, "Tüm istatistikler" sözü GERÇEKTEN tutulsun diye
  // zoneStats de burada temizleniyor — ÖNCEDEN bu buton zoneStats'a hiç
  // dokunmuyordu, kullanıcı SADECE o ayrı bağlantıyla temizleyebiliyordu.
  storage.clearZoneStats();
  zoneStats = {};
  stats = storage.freshStats(difficultyLivesMap(), HINTS_PER_GAME, playableModeIds());
  history = [];
  daily = storage.freshDaily();
  activeQuestion = null;
  roundActive = false;
  freqGuessHz = null; freqHoverHz = null;
  cutoffGuess = null;
  dbGuess = null;
  boostCutGuess = null;
  qGuessLabelId = null;
  threeWayGuessLetter = null;
  threeWayPlayLetter = "A";
  threeWaySelectedLetter = null;
  tonalDengeCorrections = {};
  cakismaGuess = null;
  syncLives();
  roundFlow.clearTimer();
  audioEngine.stopAudio();
  persistStats();
  persistDaily();
  updateUI();
  renderHistory();
  renderDaily();
  renderAchievements();
  renderAnalysis();
  renderHearts();
  updateTimerUI();
  setFeedback("Sıfırlandı", "Tüm ilerleme, XP, skor ve görevler temizlendi.");
  toast("🔄 Sıfırlandı", "Her şey baştan.");
}
els.resetStatsBtn.addEventListener("click", () => {
  if (!confirm("Tüm istatistikler, ilerleme ve görevler sıfırlansın mı?")) return;
  resetAllProgress();
});
if (els.settingsResetBtn) els.settingsResetBtn.addEventListener("click", () => {
  if (!confirm("Tüm istatistikler, ilerleme ve görevler sıfırlansın mı?")) return;
  resetAllProgress();
});

renderAnalysis();

// G87: İlerleme sekmesindeki açılır-kapanır kartlar (Son Cevaplar/Rozetler/
// Mod Seviyeleri, madde 5/8/9) — chevron 180° döner, varsayılan kapalı.
function bindCollapsiblePanel(toggleBtn, wrapEl, chevronEl) {
  if (!toggleBtn || !wrapEl) return;
  toggleBtn.addEventListener("click", () => {
    const opening = wrapEl.classList.contains("hidden");
    wrapEl.classList.toggle("hidden", !opening);
    if (chevronEl) chevronEl.style.transform = opening ? "rotate(180deg)" : "none";
  });
}
bindCollapsiblePanel(els.recentToggle, els.recentWrap, els.recentChevron);
bindCollapsiblePanel(els.badgesToggle, els.achievementList, els.badgesChevron);
bindCollapsiblePanel(els.modeLevelsToggle, els.modeLevelsList, els.modeLevelsChevron);
// G91 (madde 1): "Bugünün Önerisi" — AYNI fonksiyon, ama VARSAYILAN AÇIK
// (dailyTipWrap HTML'de "hidden" TAŞIMIYOR, dailyTipChevron rotate(180deg)
// ile başlıyor — bkz. index.html).
bindCollapsiblePanel(els.dailyTipToggle, els.dailyTipWrap, els.dailyTipChevron);
// G91 (madde 10): "Günlük Görevler" + "Zayıf Bölge Raporu" — AYNI desen,
// AYNI varsayılan-açık kurulumu (wrap hidden'sız, chevron rotate(180deg)).
bindCollapsiblePanel(els.dailyToggle, els.dailyWrap, els.dailyChevron);
bindCollapsiblePanel(els.zoneToggle, els.zoneWrap2, els.zoneChevron);

// Madde 5: "Tümünü temizle" — SADECE Son Cevaplar listesini boşaltır
// (resetStatsBtn'in AKSİNE XP/seviye/görevlere DOKUNMAZ).
if (els.clearRecentBtn) els.clearRecentBtn.addEventListener("click", e => {
  e.stopPropagation();
  history = [];
  persistStats();
  renderHistory();
});

// Madde 6/7: "Pro ile aç" butonları — G63 (PAYWALL.md Parça 2, tetikleme #6)
// "İlerleme'de kilitli veriye basınca → paywall" ile AYNI karar, artık tüm
// karta değil SADECE bu iki düğmeye bağlı (tasarımın kendi buton konumu).
// Tek "zoneHistory" nedeni İKİ butonu da kapsıyor — paywall.js:PAYWALL_REASONS.
// zoneHistory'nin metni ZATEN hem grafiği hem zayıf bölge raporunu anıyor
// ("6 bölgenin detaylı isabet analizi VE zayıf bölge raporu"), ayrı bir
// "weakZoneReport" paywall-ekranı nedeni HİÇ TANIMLI DEĞİL (o isim sadece
// LOCK_MESSAGES'ta, toast'a düşen AYRI/daha basit bir katalog — burada
// openPaywallReason PAYWALL_REASONS'ı okuyor, ikisi karıştırılmadı).
if (els.accChartProBtn) els.accChartProBtn.addEventListener("click", () => openPaywallReason("zoneHistory"));
if (els.zoneProBtn) els.zoneProBtn.addEventListener("click", () => openPaywallReason("zoneHistory"));

// Madde 2: boş-durumun "İlk seansını başlat" CTA'sı — Frekans Bulma kartına
// PROGRAMATİK tıklar (bkz. renderExerciseGrid'in card.dataset.modeId notu),
// erişim/kulaklık-uyarısı mantığını burada TEKRARLAMAZ.
if (els.progStartFreqBtn) els.progStartFreqBtn.addEventListener("click", () => {
  goScreen("home");
  const card = document.querySelector(`.mode-card[data-mode-id="${frekansBulma.MODE_ID}"]`);
  if (card) card.click();
});

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

// G79: cevap biçimi çipi artık sheet açan bir buton DEĞİL, doğrudan görünen
// İKİLİ segmented toggle (Dokunmalı|Şıklı) — hangisinin cyan/aktif olduğunu
// gösterir. #answerFormatSelect'İN KENDİSİ hâlâ TEK doğruluk kaynağı (Oyun
// Ayarları sheet'indeki satır da ONU okuyor/yazıyor) — bu fonksiyon SADECE
// görünümü senkronlar, state TUTMAZ.
function syncAnswerFormatToggleUI() {
  if (!els.answerFormatSelect) return;
  const val = els.answerFormatSelect.value;
  if (els.answerFormatTouchBtn) els.answerFormatTouchBtn.classList.toggle("active", val === "touch");
  if (els.answerFormatChoiceBtn) els.answerFormatChoiceBtn.classList.toggle("active", val === "choice");
}
if (els.answerFormatSelect) els.answerFormatSelect.addEventListener("change", () => {
  prefs.answerFormat = els.answerFormatSelect.value;
  storage.savePrefs(prefs);
  syncAnswerFormatToggleUI();
  // Cevaplanmamış bir soru ortasında biçim değişirse görünümü hemen senkronla —
  // soru/timer/skor state'ine dokunmaz, sadece .ans grid'i gösterir/gizler.
  if (activeQuestion && roundActive) {
    syncAnswerArea();
    if (isChoiceFormat()) scrollFeedbackIntoView();
  }
});
// G79: iki YENİ toggle butonu — #answerFormatSelect'e yazıp AYNI "change"
// event'ini tetikliyor (yukarıdaki listener + initSettingsSheet'in KENDİ
// sync'i ÇALIŞMAYA devam eder, ikinci bir mekanizma İCAT EDİLMEDİ).
if (els.answerFormatTouchBtn) els.answerFormatTouchBtn.addEventListener("click", () => {
  if (!els.answerFormatSelect || els.answerFormatSelect.value === "touch") return;
  els.answerFormatSelect.value = "touch";
  els.answerFormatSelect.dispatchEvent(new Event("change", { bubbles: true }));
});
if (els.answerFormatChoiceBtn) els.answerFormatChoiceBtn.addEventListener("click", () => {
  if (!els.answerFormatSelect || els.answerFormatSelect.value === "choice") return;
  els.answerFormatSelect.value = "choice";
  els.answerFormatSelect.dispatchEvent(new Event("change", { bubbles: true }));
});

if (els.focusSelect) els.focusSelect.addEventListener("change", () => {
  prefs.focusRange = els.focusSelect.value;
  storage.savePrefs(prefs);
  // G86: spektrum alt satırı odak aralığına göre değişiyor (bkz.
  // updateAnalyzerFoot) — odak değişince YENİDEN yazılmalı.
  updateAnalyzerFoot();
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
  // G61 (PAYWALL.md): "30 dakikada 1 can" — ön plana HER dönüşte yeniden
  // hesaplanır (arka planda geçirilen GERÇEK süre burada devreye girer, bu
  // olayın KENDİSİ zaten "kullanıcı uzun süre uzaklaştı mı" sinyali).
  if (!document.hidden) syncLives();
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
renderExerciseGrid();
renderComingGrid();
goScreen("menu");
resizeCanvas();

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => goScreen(TAB_TO_SCREEN[btn.dataset.tab] || "menu"));
});

// G36: "Şimdi değil" — GÜNLÜK kapatma (daily.tipDismissed, gece yarısı sıfırlanır).
// G91 (madde 1): eski ✕ butonu (AYNI davranışı taşıyordu) KALDIRILDI, kart artık
// akordiyon — "Şimdi değil" bu günlük kapatmayı TEK BAŞINA taşıyor; KALICI
// kapatma için ayrı bir yol var (Ayarlar → "Bugünün önerisini göster", prefs.showDailyTip).
if (els.dailyTipSkipBtn) els.dailyTipSkipBtn.addEventListener("click", () => {
  daily.tipDismissed = true;
  persistDaily();
  renderDailyTip();
});
// "Bugünün Önerisi" kartındaki "Başla" — renderDailyTip() ile AYNI hesabı (zoneScores()
// üzerinden en zayıf bölge) kullanıp odak aralığını o bölgeye kilitler, sonra oyun
// ekranına geçer. mode.focusIdForZone yoksa (odak özelliği olmayan bir mod) veya
// yeterli veri yoksa (renderDailyTip zaten kartı gizler ama buton yine de tıklanabilir
// kalabilir) sadece ekran değiştirir — eskisi gibi tüm spektrumda başlar.
// G58 DÜZELTMESİ: ÖNCEDEN sadece goScreen("game") çağrılıyordu — playModeSelect
// kullanıcının SON seçtiği neyse OYNANIYORDU (genelde "Serbest/sonsuz"), ama
// buton hep sabit "Seti başlat" yazıyordu, bir soru SAYISI VAAT ETMİYORDU
// (bu yüzden yalan/eksik değildi, ama "kaç soru" belirsizdi). Artık
// startFreshAttempt({forceChallenge:true}) çağrılıyor — "Tekrar oyna"nın
// (bkz. els.resCta) AYNI mekanizması: playModeSelect'in KALICI tercihine
// DOKUNMADAN (o select'in value'su DEĞİŞMİYOR, sadece bu TEK deneme için
// challenge.active zorlanıyor) +%50 XP bonusu + "10 Soruluk Bölüm başladı"
// bildirimini aktif eder — buton artık GERÇEKTEN vaat ettiği kadar (challenge.
// total=10) bir seti başlatıyor.
// DÜRÜSTLÜK NOTU (sınav sistemine DOKUNULMADI): G50'den beri TÜM 9 mod
// EXAM_ENABLED — bu yüzden 10. soruda challenge'ın KENDİ "otomatik bitir"
// mantığı (ensureAutoNext'teki !mode.EXAM_ENABLED koşulu, G47'den beri
// BİLEREK böyle) devreye GİRMEZ, examSystem'in KENDİ 10 soruluk parkuru
// (PARKUR_LENGTH=10) devralır — pozisyon 10'a ulaşınca sınav teklifi/toplam
// sınav/telafiye GEÇER (session'ı SESSİZCE YARIDA KESMEZ). "10 soru" vaadi bu
// yüzden LİTERAL bir "menüye dön" değil, examSystem'in KENDİ gerçek/dürüst
// "Soru N/10" parkuruna GİRMEK anlamına geliyor — sınav akışını YARIDA
// KESMEMEK için BİLİNÇLİ bir tercih (task: "sınav... DOKUNULMAZ").
if (els.dailyTipStartBtn) els.dailyTipStartBtn.addEventListener("click", async () => {
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
  await audioEngine.initAudio();
  startFreshAttempt({ forceChallenge: true });
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

  // Bir grup açılınca (tek açık kuralı) diğer açık grupları kapatır — grup
  // başlıklarının click handler'ından çağrılır, groupEl kapatılan grubun DIŞINDA
  // tutulacaksa (yani onu YENİDEN açacaksak) skip parametresiyle atlanır.
  function collapseOtherGroups(exceptGroupEl) {
    sheetOptions.querySelectorAll('.sheet-group.open').forEach(g => {
      if (g === exceptGroupEl) return;
      g.classList.remove('open');
      g.querySelector('.sheet-group-body').classList.add('collapsed');
    });
  }

  function openSheet(select, title) {
    sheetTitle.textContent = title;
    sheetOptions.innerHTML = '';
    // Kaynak sheet'i gibi <optgroup> ile gruplanmış select'lerde her grup
    // açılır/kapanır bir başlığa (chevron'lu, tıklanabilir) sarılır — VARSAYILAN
    // KAPALI, bir grup açılınca diğeri otomatik kapanır (collapseOtherGroups).
    // Gruplanmamış select'lerde (Zorluk/Oyun Türü/Süre/Cevap biçimi) hiç fark
    // etmez, düz liste olarak kalır (currentBody hep sheetOptions'ın kendisi).
    let lastGroup = null;
    let currentBody = sheetOptions;
    Array.from(select.options).forEach(opt => {
      const groupLabel = opt.parentElement && opt.parentElement.tagName === "OPTGROUP"
        ? opt.parentElement.label : null;
      if (groupLabel && groupLabel !== lastGroup) {
        lastGroup = groupLabel;
        const groupEl = document.createElement('div');
        groupEl.className = 'sheet-group';
        const header = document.createElement('button');
        header.type = 'button';
        header.className = 'sheet-group-header';
        header.innerHTML = `<span class="kicker">${groupLabel}</span><span class="chev">▸</span>`;
        const body = document.createElement('div');
        body.className = 'sheet-group-body collapsed';
        header.addEventListener('click', () => {
          const willOpen = !groupEl.classList.contains('open');
          collapseOtherGroups(willOpen ? groupEl : null);
          groupEl.classList.toggle('open', willOpen);
          body.classList.toggle('collapsed', !willOpen);
        });
        groupEl.appendChild(header);
        groupEl.appendChild(body);
        sheetOptions.appendChild(groupEl);
        currentBody = body;
      } else if (!groupLabel) {
        currentBody = sheetOptions;
      }
      const row = document.createElement('div');
      row.className = 'sheet-option' + (opt.selected ? ' selected' : '');
      // "Dosya seç" (upload) bir dosya seçilene kadar diğer şıklar gibi anında
      // işaretlenemez — tıklanınca native dosya seçiciyi açar (prototype.html'de
      // bu satır ✓ yerine › ile ayrılmıştı, aynı ayrım burada davranışa taşındı).
      const isUnloadedUpload = select.id === 'sourceSelect' && opt.value === 'upload' && !uploadManager.hasBuffer;
      // G65 (PAYWALL.md): "Serbest (sonsuz)" ücretsizde SEÇİLEBİLİYORDU ama
      // 5-soru sınırı yüzünden pratikte 5'te duruyordu — "seçtim ama
      // çalışmıyor" karışıklığı (cihaz testinde bulundu). isUnloadedUpload'un
      // AYNI görsel deseni: onay yerine kilit + Pro rozeti.
      const isLockedFreePlay = select.id === 'playModeSelect' && opt.value === 'free' && paywall.isFreePlayModeLocked(isUserPro());
      const checkStyle = (isUnloadedUpload || isLockedFreePlay) ? ' style="opacity:1"' : '';
      // .sheet-option 2 flex çocuğu (text/check) VARSAYIYOR (space-between,
      // bkz. CSS) — Pro rozeti üçüncü bir top-level çocuk OLMASIN diye metnin
      // İÇİNE, kendi mini-flex kutusuna sarılıyor.
      const proBadgeHtml = isLockedFreePlay ? '<span class="mode-chip mode-chip-pro" style="margin-left:8px">Pro</span>' : '';
      row.innerHTML = `<span style="display:flex;align-items:center">${opt.text}${proBadgeHtml}</span><span class="check"${checkStyle}>${isUnloadedUpload ? '›' : isLockedFreePlay ? '🔒' : '✓'}</span>`;
      row.addEventListener('click', async () => {
        // G61 (PAYWALL.md): "Kendi dosya yükleme: kilitli" — Ses Kaynağı
        // sheet'indeki "Dosya seç" satırı, .upload-trigger-btn'in AYRI (bu
        // dosyanın en başındaki not, bkz. isUnloadedUpload) kod yolu — DAHA
        // ÖNCE yüklenmiş bir dosya varsa (uploadManager.hasBuffer=true) bile
        // free kullanıcı onu seçemez, indirgeme (downgrade) sonrası kalıntı
        // bir seçim olası (bkz. enforceFreeRestrictions'ın AYNI motivasyonu).
        if (select.id === 'sourceSelect' && opt.value === 'upload' && paywall.isUploadLocked(isUserPro())) {
          closeSheet();
          if (!openPaywallReason("upload")) toast(paywall.LOCK_MESSAGES.upload.title, paywall.LOCK_MESSAGES.upload.detail, "pro");
          return;
        }
        if (isLockedFreePlay) {
          closeSheet();
          if (!openPaywallReason("freePlayMode")) toast(paywall.LOCK_MESSAGES.freePlayMode.title, paywall.LOCK_MESSAGES.freePlayMode.detail, "pro");
          return;
        }
        if (isUnloadedUpload) {
          closeSheet();
          // G53: AYNI native-önce/web-fallback deseni (bkz. .upload-trigger-btn
          // wiring'i) — bu satır ARTIK doğrudan input'a değil, o ortak yola gidiyor.
          const picked = await pickNativeAudioFile();
          if (picked === undefined) els.audioFileInput.click();
          else if (picked) processSingleUploadFile(picked);
          return;
        }
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        updateRowText(select);
        closeSheet();
      });
      currentBody.appendChild(row);
    });
    overlay.classList.add('open');
    sheet.classList.add('open');
  }

  document.querySelectorAll('.setting-row').forEach(row => {
    const select = document.getElementById(row.dataset.sheetSelect);
    if (!select) return;
    updateRowText(select);
    row.addEventListener('click', () => {
      // G61 (PAYWALL.md): "Sabit zorluk seçimi + bölge seçerek çalışma: kilitli
      // (otomatik zorluk çalışır)" — Z7'nin auto-mode özel dalından ÖNCE kontrol
      // edilir (free'de zaten HER ZAMAN auto'da kalınacağı için o dal hiç
      // tetiklenmemeli, kafa karıştıran "Sabit'e geçmek ister misin?" sorusu
      // YERİNE net "Pro gerekli" mesajı gösterilir).
      if (select.id === 'difficultySelect' && !isUserPro()) {
        toast(paywall.LOCK_MESSAGES.difficulty.title, paywall.LOCK_MESSAGES.difficulty.detail, "pro");
        return;
      }
      if (select.id === 'focusSelect' && !isUserPro()) {
        toast(paywall.LOCK_MESSAGES.focusRange.title, paywall.LOCK_MESSAGES.focusRange.detail, "pro");
        return;
      }
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
    // G61: bu buton normalde artık AÇILMAZ bile (yukarıdaki .setting-row gate'i
    // free'de autoDiffAsk'ı hiç göstermiyor) — savunmacı ikinci kontrol.
    if (!isUserPro()) { toast(paywall.LOCK_MESSAGES.difficulty.title, paywall.LOCK_MESSAGES.difficulty.detail, "pro"); return; }
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

// G89 DÜZELTMESİ (canlı raporda bulundu — "6 egzersiz modu" yazıyor ama
// gerçek ücretsiz mod sayısı 5): ÖNCEDEN MODE_CATALOG'un tier==="free"
// filtresinden sayılıyordu — bu "hiz-modu"yu (tier:"free" AMA playable:false,
// henüz kodlanmamış bir "yakında" girdisi) da SAYIYORDU, 6 çıkıyordu.
// paywall.js:FREE_MODE_IDS zaten GERÇEK erişim kararının TEK kaynağı (bkz. o
// dosyanın "kilit dağılımında kod kazanır" notu) — 5 gerçek/oynanabilir
// ücretsiz modu tutuyor, burası da ARTIK ondan sayıyor, iki kaynak birbirinden
// SAPAMAZ.
const FREE_MODE_COUNT = paywall.FREE_MODE_IDS.length;
// G63: fiyat artık core/paywall.js:PRO_PRICE'tan (tek kaynak, PAYWALL.md) —
// lokal bir kopya TUTULMUYOR, iki yerin senkron kalması riskiyle uğraşılmıyor.

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
[els.menuSettingsBtn, els.progressSettingsBtn].forEach(btn => {
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

// G61 (PAYWALL.md): "Sabit zorluk seçimi + bölge seçerek çalışma: kilitli
// (otomatik zorluk çalışır)" — yukarıdaki UI gate'leri (diffFixedBtn/
// autoDiffSwitchBtn/.setting-row) kullanıcının YENİ bir kısıtlı seçim
// YAPMASINI engelliyor, ama Pro'yken kaydedilmiş bir tercih (prefs.
// difficultyMode="fixed" ya da prefs.focusRange="bass" gibi) sonradan Pro
// düşerse STATE'te KALIR — split-brain'i (UI kilitli görünür ama gerçek
// state hâlâ eski Pro tercihini taşır) önlemek için bu, isUserPro() DEĞİŞEBİLECEK
// her noktada (devProSwitch/devModeOffBtn, bkz. syncDevUI) + açılışta çağrılır,
// state'i GERÇEKTEN düzeltir (sadece görünümü değil).
function enforceFreeRestrictions() {
  if (isUserPro()) return;
  if (!diffModeAuto) {
    diffModeAuto = true;
    prefs.difficultyMode = "auto";
    storage.savePrefs(prefs);
    applyAutoDifficulty();
    syncDiffSheetUI();
  }
  if (els.focusSelect && els.focusSelect.value !== "full") {
    els.focusSelect.value = "full";
    prefs.focusRange = "full";
    storage.savePrefs(prefs);
    els.focusSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
  // G65: playModeSelect kalıcı bir prefs alanına YAZILMIYOR (HTML'deki
  // <option selected> her sayfa açılışında "free"e döner) — o yüzden
  // downgrade riski difficulty/focusRange kadar büyük DEĞİL, ama Pro'dan
  // düşen bir kullanıcı bu OTURUM içinde "Serbest" seçili KALABİLİR (artık
  // sheet'te yeniden SEÇİLEMEZ ama halihazırda seçiliyse dokunulmamış olur).
  // "Kilitli göster" niyetiyle TUTARLI kalsın diye burada da 10 Soruluk
  // Bölüm'e zorlanıyor.
  if (els.playModeSelect && els.playModeSelect.value === "free") {
    els.playModeSelect.value = "challenge";
    els.playModeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

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
    els.diffSublist.querySelectorAll(".chip-v2").forEach(btn => {
      btn.classList.toggle("pick", btn.dataset.diff === cur);
    });
    els.diffSublist.classList.toggle("on", diffSublistOpen);
  }
  if (els.diffAutoBtn) els.diffAutoBtn.classList.toggle("on", diffModeAuto);
  if (els.diffFixedBtn) els.diffFixedBtn.classList.toggle("on", !diffModeAuto);
  if (els.mainSettingsBack) els.mainSettingsBack.classList.toggle("hidden", !diffSublistOpen);
  if (els.diffHintV2) els.diffHintV2.textContent = diffModeAuto
    ? "Önerilen · performansına göre kendini ayarlar"
    : "Hassasiyeti kendin seç";
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
  // G61 (PAYWALL.md): "Sabit zorluk seçimi kilitli" — Genel Ayarlar'daki
  // Otomatik/Sabit anahtarının Sabit ucu.
  if (!isUserPro()) { toast(paywall.LOCK_MESSAGES.difficulty.title, paywall.LOCK_MESSAGES.difficulty.detail, "pro"); return; }
  diffModeAuto = false;
  diffSublistOpen = true;
  prefs.difficultyMode = "fixed";
  storage.savePrefs(prefs);
  syncDiffSheetUI();
});
if (els.diffSublist) {
  els.diffSublist.querySelectorAll(".chip-v2").forEach(btn => {
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
  if (els.showDailyTipSwitch) els.showDailyTipSwitch.classList.toggle("on", prefs.showDailyTip);
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
// G79: taze kullanıcıda prefs.answerFormat HENÜZ yok — applyPrefs() o durumda
// "change" event'ini HİÇ tetiklemiyor (bkz. yukarıdaki if), toggle butonları
// HTML'in kendi varsayılan seçili option'ını (touch) hiç yansıtmadan kalırdı.
// Güvenlik ağı — koşulsuz TEK çağrı.
syncAnswerFormatToggleUI();
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
if (els.showDailyTipSwitch) els.showDailyTipSwitch.addEventListener("click", () => {
  prefs.showDailyTip = !prefs.showDailyTip;
  applyPrefs();
  storage.savePrefs(prefs);
  renderDailyTip();
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
// G63: Pro kartının madde listesi core/paywall.js:PRO_BENEFITS'ten üretilir —
// HTML'de sabit bir kopya TUTULMUYOR (tek kaynak, PAYWALL.md).
// G89: Prototip.dc.html'in tek yeşil-nokta+metin satırı (bkz. index.html
// .pw-feature-row) — eski ".li" (küçük nokta ikonu) YERİNE 19px yeşil
// yuvarlak + beyaz ✓ SVG.
function renderProBenefits() {
  if (!els.payProBenefits) return;
  els.payProBenefits.innerHTML = paywall.PRO_BENEFITS.map(b => `<div class="pw-feature-row">
    <div class="pw-feature-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#06230e" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"></path></svg></div>
    <div class="pw-feature-text">${b}</div>
  </div>`).join("");
}

// G89: Prototip.dc.html'in "Sabit zorluk Pro" haricindeki 6 gerçek tetikleme
// noktası için pwBadgeSize/pwRowPad/pwPricePad değişkenlerinin AYNI
// standart/can-bitti ikilisi — tek bir CSS sınıfıyla (.lives) uygulanıyor.
function setPaywallLivesVariant(isLivesOut) {
  if (els.paywallBadgeWrap) els.paywallBadgeWrap.classList.toggle("lives", isLivesOut);
  if (els.payProBenefits) els.payProBenefits.classList.toggle("lives", isLivesOut);
  if (els.paywallPriceCard) els.paywallPriceCard.classList.toggle("lives", isLivesOut);
}

// G63 (PAYWALL.md Parça 2): paywall EKRANI tek bir DOM — bu fonksiyon onu
// GENEL navigasyona (Ayarlar → "Pro'ya geç", Araçlar'ın kilit ekranı) göre
// sıfırlar: bağlam başlığı genel metne döner, can şeridi/"Reklam İzle" gizli,
// "Geri yükle" görünür — bir önceki openPaywallReason() çağrısından kalan
// bağlamsal durum bu genel yola SIZMASIN diye HER genel giriş noktası bunu
// ÖNCE çağırır.
function resetPaywallToGeneric() {
  if (els.paywallReasonTitle) els.paywallReasonTitle.textContent = "Tam sürüm sadece sınırları kaldırır";
  if (els.paywallReasonDetail) els.paywallReasonDetail.textContent = "Ücretsiz sürümle çalışmaya devam edebilirsin. Acele etmene gerek yok.";
  if (els.paywallLivesStrip) els.paywallLivesStrip.classList.add("hidden");
  stopPaywallLivesTicker();
  setPaywallLivesVariant(false);
  if (els.watchAdBtn) els.watchAdBtn.classList.add("hidden");
  if (els.restorePurchaseBtn) els.restorePurchaseBtn.classList.remove("hidden");
}

// G89: can geri sayımı — startResWaitTicker()'ın (Seans Sonu ekranı) AYNI
// deseni, GERÇEK stats.livesLastRefillAt/paywall.LIVES_REFILL_INTERVAL_MS'ten
// (uydurma sayı YOK). Süre dolunca syncLives() BİR KEZ tetiklenip satır kapanır.
let paywallLivesTimer = null;
function stopPaywallLivesTicker() {
  if (paywallLivesTimer) { clearInterval(paywallLivesTimer); paywallLivesTimer = null; }
}
function startPaywallLivesTicker() {
  stopPaywallLivesTicker();
  const tick = () => {
    const msLeft = Math.max(0, (stats.livesLastRefillAt || Date.now()) + paywall.LIVES_REFILL_INTERVAL_MS - Date.now());
    if (msLeft <= 0) {
      syncLives();
      if (currentLives > 0) {
        stopPaywallLivesTicker();
        if (els.paywallLivesStrip) els.paywallLivesStrip.classList.add("hidden");
        return;
      }
    }
    const totalSec = Math.ceil(msLeft / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    if (els.paywallLivesCountdown) els.paywallLivesCountdown.textContent = `${mm}:${ss}`;
  };
  tick();
  paywallLivesTimer = setInterval(tick, 1000);
}

// G63: 7 kilit tetikleme noktasının (PAYWALL.md) TEK ortak giriş kapısı —
// core/paywall.js:PAYWALL_REASONS'tan bağlam başlığını + buton setini kurup
// paywall ekranını DOĞRUDAN açar (toast YOK). "İlk oturumda paywall yok"
// kuralı BURADA uygulanıyor (task'ın kendi kuralı) — false dönerse çağıran
// taraf ESKİ (Parça 1) davranışına (toast/session-end ekranı) düşmeli, bu
// yüzden dönen boolean ÖNEMLİ, göz ardı edilemez.
function openPaywallReason(reasonKey) {
  if (paywallSuppressedFirstSession) return false;
  const cfg = paywall.PAYWALL_REASONS[reasonKey];
  if (!cfg) return false;
  if (els.paywallReasonTitle) els.paywallReasonTitle.textContent = cfg.title;
  if (els.paywallReasonDetail) els.paywallReasonDetail.textContent = cfg.detail;
  const isLivesOut = cfg.buttons === "livesOut";
  setPaywallLivesVariant(isLivesOut);
  if (els.paywallLivesStrip) els.paywallLivesStrip.classList.toggle("hidden", !isLivesOut);
  if (isLivesOut) startPaywallLivesTicker(); else stopPaywallLivesTicker();
  if (els.watchAdBtn) els.watchAdBtn.classList.toggle("hidden", !isLivesOut);
  // Bağlamsal (bir kilitten gelen) ekranda "Geri yükle" gürültü — o an satın
  // almayı GERİ YÜKLEMEK değil, YENİ bir kilidi AŞMAK istiyor (task: "sade,
  // abartısız").
  if (els.restorePurchaseBtn) els.restorePurchaseBtn.classList.add("hidden");
  goScreen("paywall");
  return true;
}

function syncAccountLine() {
  // Pro vaadi TÜM katalog (14) içindir — kaçının şu an kodlandığı/oynanabilir
  // olduğu (listModes()) ayrı bir şey, paywall metnine karışmaz.
  const total = MODE_CATALOG.length;
  if (els.accountVerLine) {
    els.accountVerLine.textContent = isUserPro()
      ? `Pro${devFlags.simulatePro ? " (simüle)" : ""} — ${total} mod, seans başına 10 soru, can sınırsız`
      : `Ücretsiz — ${FREE_MODE_COUNT} mod, seans başına 5 soru`;
  }
  if (els.proPrice) els.proPrice.textContent = paywall.PRO_PRICE;
  renderProBenefits();
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
  enforceFreeRestrictions(); // G61: isUserPro() burada değişmiş OLABİLİR, state'i senkronla
  syncAccountLine();
  renderExerciseGrid();
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
// G55 — en basit, izole dosya seçici testi: Motor 3/tekli-upload'ın hiçbirine
// dokunmadan, TEK butonla pickNativeAudioFile()'ın TÜM zincirini (Capacitor
// var mı → plugin kayıtlı mı → pickFiles() çağrıldı mı → sonuç/hata) dener ve
// SONUCU (hangisinde durduysa) hem console'a hem toast'a yazar — kullanıcı
// Xcode/Safari Inspector'a bakmadan da "buton ölü mü / plugin eksik mi /
// picker açılıp iptal mi edildi / gerçek bir hata mı" ayrımını görebilsin diye.
if (els.filePickerTestBtn) els.filePickerTestBtn.addEventListener("click", async () => {
  console.log("[filepicker-diag] === TEST BAŞLADI ===");
  toast("Test başladı", "Konsolu izliyorsan [filepicker-diag] etiketli satırlara bak.");
  const hadCapacitor = !!window.Capacitor;
  const hadPlugin = !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FilePicker);
  const file = await pickNativeAudioFile();
  console.log("[filepicker-diag] === TEST BİTTİ ===", { hadCapacitor, hadPlugin, sonuc: file === undefined ? "plugin yok (web fallback gerekir)" : file === null ? "iptal/hata (yukarıdaki loga bak)" : `dosya alındı: ${file.name}` });
  if (!hadCapacitor) {
    toast("Sonuç: Capacitor YOK", "window.Capacitor tanımsız — bu masaüstü/web ortamıysa NORMAL, cihazdaysa native köprü hiç yüklenmemiş demektir.");
  } else if (!hadPlugin) {
    toast("Sonuç: Plugin KAYITLI DEĞİL", "window.Capacitor var ama FilePicker plugin'i yok — Xcode'da paketleri yeniden çözümleyip temiz build gerekiyor.");
  } else if (file) {
    toast("Sonuç: BAŞARILI ✓", `Seçici açıldı ve "${file.name}" seçildi — zincir tam çalışıyor.`);
  } else {
    toast("Sonuç: Plugin kayıtlı, ama dosya gelmedi", "Seçici muhtemelen AÇILDI ve iptal edildi (bu iyi bir işaret) — ya da native tarafta bir hata oldu, yukarıdaki toast'a/konsola bak.");
  }
});
syncDevUI();

if (els.calibRow) els.calibRow.addEventListener("click", () => goToSettingsSubpage("calib"));
if (els.feedbackRow) els.feedbackRow.addEventListener("click", () => goToSettingsSubpage("feedback"));
if (els.faqRow) els.faqRow.addEventListener("click", () => goToSettingsSubpage("faq"));
if (els.contactRow) els.contactRow.addEventListener("click", () => goToSettingsSubpage("contact"));
if (els.goProBtn) els.goProBtn.addEventListener("click", () => { resetPaywallToGeneric(); goToSettingsSubpage("paywall"); });
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
[els.faqBackBtn, els.feedbackBackBtn, els.contactBackBtn, els.legalBackBtn]
  .forEach(btn => { if (btn) btn.addEventListener("click", () => goBackFromSubpage()); });
// G89: paywallCloseBtn AYRI tutuluyor — kapanışta can-bitti sayacı da dursun
// diye (arka planda sonsuza dek dönmesin).
if (els.paywallCloseBtn) els.paywallCloseBtn.addEventListener("click", () => {
  stopPaywallLivesTicker();
  goBackFromSubpage();
});

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

// ---- Satın alma (gerçek IAP Parça 3 — "Pro Al" şimdilik SİMÜLASYON) ----
syncAccountLine();
// G63 (PAYWALL.md Parça 2): "Pro Al" → devFlags.simulatePro=true (task'ın
// kendi tarifi, harfiyen) — GERÇEK bir satın alma DEĞİL, sadece isUserPro()'nun
// okuduğu simülasyon bayrağını (bkz. isUserPro tanımı) AÇIYOR. devFlags.unlocked
// (gizli geliştirici menüsünün GÖRÜNÜRLÜĞÜ) BİLEREK dokunulmuyor — isUserPro()
// SADECE simulatePro'ya bakıyor, menünün görünür olması GEREKMİYOR. syncDevUI()
// zaten var olan TEK yeniden-senkron noktasını (renderModeGrid/
// enforceFreeRestrictions/applyProLockVisibility/syncAccountLine) tetikliyor —
// Pro'nun etkisi UYGULAMANIN HER YERİNDE anında görünür.
if (els.buyProBtn) els.buyProBtn.addEventListener("click", () => {
  devFlags.simulatePro = true;
  storage.saveDevFlags(devFlags);
  syncDevUI();
  toast("🎉 Pro açıldı (simülasyon)", "10 mod, sınırsız oynama, sınav, kendi mix, Araçlar — hepsi açık.");
  stopPaywallLivesTicker();
  goBackFromSubpage();
});
if (els.restorePurchaseBtn) els.restorePurchaseBtn.addEventListener("click", () => {
  toast("Kontrol edildi", "Bu cihazda geri yüklenecek bir satın alım bulunamadı.");
});
// G63: "Reklam İzle" → SADECE "livesOut" tetiklemesinde görünür (bkz.
// openPaywallReason). Gerçek ödüllü reklam Parça 4 — burada +1 can (TOTAL_
// LIVES'ı aşmaz), paywall.onLifeLost'un TERSİ bir "can kazanıldı" olayı: tam
// dolarsa dolum referansı da "şimdi"ye çekilir (applyLivesRefill'in kendi
// "tam doluyken referans sabit" kuralıyla TUTARLI kalsın diye).
// G82: aynı gerçek (simüle) mekanik Seans Sonu'nun "lives" durumundaki
// birincil butonundan da (bkz. showSessionEnd/resCta) çağrılabilsin diye
// paylaşılan bir fonksiyona çıkarıldı — davranış TEK SATIR değişmedi, SADECE
// iki çağıran arasında tekrar etmesin diye.
function grantAdLife() {
  const now = Date.now();
  if (typeof stats.lives !== "number") stats.lives = 0;
  stats.lives = Math.min(storage.TOTAL_LIVES, stats.lives + 1);
  if (stats.lives >= storage.TOTAL_LIVES) stats.livesLastRefillAt = now;
  persistStats();
  syncLives();
  toast("🎬 Reklam izlendi (simülasyon)", "+1 can");
}
if (els.watchAdBtn) els.watchAdBtn.addEventListener("click", () => {
  grantAdLife();
  stopPaywallLivesTicker();
  goBackFromSubpage();
});

// ═══════════════════════════════════════════════════════════════════════════
// Araçlar sekmesi — G88'de Prototip.dc.html'in ARAÇLAR bloğuna göre yeniden
// giydirildi. Referans Filtreleri hâlâ gerçek DSP içermiyor (seçim SADECE
// görsel/bilgilendirici — G53'ten beri değişmedi, bu turun kapsamı bunu
// eklemek DEĞİLDİ) ama artık GERÇEK uploadManager'a bağlı: "Mixini Yükle"
// dosyayı GERÇEKTEN decode edip çalınabilir hale getiriyor (ÖNCEDEN sadece
// ad/boyut gösteren bir vitrindi, hiçbir yere yüklenmiyordu).
// ═══════════════════════════════════════════════════════════════════════════

// G88 (madde 6, "ANALİZ MOTORU BU TURDA YOK"): sahte/statik Analiz kartı
// (LUFS/LRA/dBTP/mono-uyum — hepsi G53'ten beri sabit, gerçek bir dosyayı
// HİÇ ölçmüyordu) index.html'den KALDIRILDI, kullanıcı artık göremiyor —
// ama task'ın kendi talimatı "kodunu silme" gereği bu fonksiyon BİLEREK
// silinmedi, sadece hedefi (#toolBars) yok — çağrıldığında zararsızca no-op.
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

// G88: her filtrenin ad/açıklama/"ne dinlemeli" metni G53'ten beri GERÇEK,
// DEĞİŞMEDİ — sadece tasarımın istediği ikon + 26px eğri görseli EKLENDİ.
// Bunlar ÖLÇÜM DEĞİL (Referans Filtreleri'nin kendisi gerçek DSP içermiyor,
// yukarı bkz.) — süsleme, o filtrenin AYNI satırdaki gerçek metniyle
// tutarlı bir eğri şekli (ör. "bas vurgulu, orta çukur" → sol yüksek/orta
// çukur). Kompresör kartlarının sabit dalga barlarıyla AYNI felsefe (G86).
const TOOLS_FILTER_ICONS = {
  duz: `<path d="M3 12h18"></path>`,
  araba: `<path d="M3 16l1.6-5.2A2 2 0 0 1 6.5 9.4h11a2 2 0 0 1 1.9 1.4L21 16"></path><rect x="2" y="16" width="20" height="4" rx="1.3"></rect><circle cx="7" cy="20" r="1.3"></circle><circle cx="17" cy="20" r="1.3"></circle>`,
  club: `<rect x="6" y="2.5" width="12" height="19" rx="2"></rect><circle cx="12" cy="8" r="2"></circle><circle cx="12" cy="15.5" r="3"></circle>`,
  laptop: `<rect x="3" y="4" width="18" height="12" rx="1.5"></rect><path d="M2 19.5h20"></path>`,
  radyo: `<rect x="3" y="6" width="18" height="12" rx="1.5"></rect><circle cx="8" cy="12" r="2.3"></circle><circle cx="16" cy="12" r="2.3"></circle>`,
  earbud: `<path d="M5 13v-1a7 7 0 0 1 14 0v1"></path><rect x="3" y="13" width="4.5" height="7" rx="2"></rect><rect x="16.5" y="13" width="4.5" height="7" rx="2"></rect>`,
  bluetooth: `<path d="M8 7l8 5-8 5V2l8 5-8 5"></path>`,
  mono: `<circle cx="12" cy="12" r="8"></circle><path d="M12 8v8M8.5 12h7"></path>`
};

// y=2 en yüksek (boost), y=24 en düşük (cut), 13 nötr — 6 noktalık düz çizgi
// eğrisi (curveSvg() interpolasyonu için).
const TOOLS_FILTER_CURVES = {
  duz: [13, 13, 13, 13, 13, 13],
  araba: [8, 10, 18, 20, 16, 12],
  club: [4, 6, 13, 18, 16, 13],
  laptop: [20, 16, 9, 8, 10, 14],
  radyo: [22, 12, 8, 8, 12, 22],
  earbud: [8, 14, 20, 20, 14, 7],
  bluetooth: [20, 10, 9, 9, 10, 20],
  mono: [13, 13, 13, 13, 13, 13]
};

function curveSvg(points) {
  const w = 70, h = 26;
  const step = w / (points.length - 1);
  const d = points.map((y, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y.toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
}

const TOOL_FILTERS = [
  { icon: "duz", name: "Düz", desc: "Referans — hiçbir renklendirme yok.", listen: "miksin kendi dengesi." },
  { icon: "araba", name: "Araba", desc: "Bas vurgulu, orta bölgede çukur.", listen: "Bas fazla mı, vokal kayboluyor mu?" },
  { icon: "club", name: "Kulüp / PA", desc: "Aşırı bas, uzun kuyruk.", listen: "Alt bölge dağılıyor mu, kick belirgin mi?" },
  { icon: "laptop", name: "Laptop", desc: "Bas zayıf, orta ağırlıklı.", listen: "Bas hiç duyulmuyorsa gövde yeterli mi?" },
  { icon: "radyo", name: "Teyp / Radyo", desc: "Dar bant, hafif saturation.", listen: "Şarkı dar bantta da anlaşılıyor mu?" },
  { icon: "earbud", name: "Ucuz kulaklık", desc: "Bas ve tiz vurgulu.", listen: "Tizler cırlıyor mu, S sesleri batıyor mu?" },
  { icon: "bluetooth", name: "Bluetooth hoparlör", desc: "Dar bant, kompresyonlu.", listen: "Dinamik kalıyor mu, itiliyor mu?" },
  { icon: "mono", name: "Mono", desc: "Kanallar toplanmış.", listen: "Faz kaybı var mı, enstrüman kayboluyor mu?" }
];
let toolsActiveFilterIdx = 0;

function renderToolsFilters() {
  if (!els.toolsFilterGrid) return;
  els.toolsFilterGrid.innerHTML = TOOL_FILTERS.map((f, i) => {
    const active = i === toolsActiveFilterIdx;
    return `<div class="tools-filter-card${active ? " active" : ""}" data-idx="${i}">
      <div class="tools-filter-top">
        <div class="tools-filter-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${TOOLS_FILTER_ICONS[f.icon]}</svg></div>
        ${active ? `<div class="tools-filter-on">AÇIK</div>` : ""}
      </div>
      <div class="tools-filter-curve">${curveSvg(TOOLS_FILTER_CURVES[f.icon])}</div>
      <div>
        <div class="tools-filter-name">${f.name}</div>
        <div class="tools-filter-range">${f.desc}</div>
      </div>
    </div>`;
  }).join("");
}
if (els.toolsFilterGrid) els.toolsFilterGrid.addEventListener("click", e => {
  const card = e.target.closest(".tools-filter-card");
  if (!card) return;
  toolsActiveFilterIdx = Number(card.dataset.idx);
  renderToolsFilters();
});
renderToolsFilters();

// G88: "Son yüklenenler" — uploadManager TEK bir buffer tutuyor (bkz.
// core/upload.js dosya başı notu, çoklu dosya geçmişi YOK) — bu yüzden liste
// en fazla TEK satır taşıyabilir, sahte bir "geçmiş" İCAT EDİLMEDİ.
let toolsUploadedFile = null; // { name, sizeKb }
let toolsPreviewPlaying = false;
let toolsPreviewNode = null;
let toolsPreviewGain = null;

function formatToolsDuration(sec) {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function renderToolsRecent() {
  const hasFile = !!toolsUploadedFile && uploadManager.hasBuffer;
  if (els.toolsRecentEmpty) els.toolsRecentEmpty.classList.toggle("hidden", hasFile);
  if (!els.toolsRecentList) return;
  if (!hasFile) { els.toolsRecentList.innerHTML = ""; return; }
  const meta = `${toolsUploadedFile.sizeKb} KB · ${formatToolsDuration(uploadManager.duration)}`;
  els.toolsRecentList.innerHTML = `<div class="tools-recent-row">
    <button type="button" class="tools-recent-play${toolsPreviewPlaying ? " playing" : ""}" id="toolsPreviewBtn" aria-label="${toolsPreviewPlaying ? "Durdur" : "Dinle"}">
      ${toolsPreviewPlaying
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4.2" height="14" rx="1"></rect><rect x="13.8" y="5" width="4.2" height="14" rx="1"></rect></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-left:1px"><path d="M7 4.8v14.4c0 .9 1 1.5 1.8 1L20 13c.8-.5.8-1.6 0-2.1L8.8 3.8C8 3.3 7 3.9 7 4.8Z"></path></svg>`}
    </button>
    <div class="tools-recent-body">
      <div class="tools-recent-name">${toolsUploadedFile.name}</div>
      <div class="tools-recent-meta">${meta}</div>
    </div>
    <div class="tools-recent-wave">${curveSvg([16, 10, 20, 8, 18, 12]).replace("width=\"100%\" height=\"26\"", "width=\"62\" height=\"26\"")}</div>
  </div>`;
  const playBtn = document.getElementById("toolsPreviewBtn");
  if (playBtn) playBtn.addEventListener("click", toggleToolsPreview);
}

// G88: önizleme çalması OYUN TURUNUN ses zincirinden AYRI — calibLevelTrack'in
// startCalibrationTone()'unun AYNI deseni (audioEngine.analyser zaten
// destination'a bağlı, kendi gain node'unu ORAYA takar). uploadManager'ın
// GERÇEK offset/duraklatma mantığını (pausePlayback/getSourceNode) kullanır —
// yeni bir çalma durumu İCAT EDİLMEDİ.
async function toggleToolsPreview() {
  if (!uploadManager.hasBuffer) return;
  await audioEngine.initAudio();
  const ctx = audioEngine.audioCtx, analyser = audioEngine.analyser;
  if (!ctx || !analyser) return;
  if (toolsPreviewPlaying) {
    uploadManager.pausePlayback();
    if (toolsPreviewNode) { try { toolsPreviewNode.stop(); } catch (e) {} toolsPreviewNode = null; }
    toolsPreviewPlaying = false;
  } else {
    toolsPreviewGain = toolsPreviewGain || ctx.createGain();
    toolsPreviewGain.gain.value = 0.85;
    toolsPreviewGain.connect(analyser);
    toolsPreviewNode = uploadManager.getSourceNode();
    if (!toolsPreviewNode) return;
    toolsPreviewNode.connect(toolsPreviewGain);
    toolsPreviewPlaying = true;
  }
  renderToolsRecent();
}

function processToolsUploadFile(file) {
  if (!file) return;
  const validation = validateAudioFile(file);
  if (!validation.ok) { toast(validation.title, validation.detail); return; }
  if (els.toolsUploadBtnLabel) els.toolsUploadBtnLabel.textContent = "Yükleniyor…";
  audioEngine.initAudio().then(() => uploadManager.loadFile(file)).then(res => {
    if (!res.ok) { toast(res.title, res.detail); return; }
    toolsPreviewPlaying = false;
    toolsUploadedFile = { name: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)) };
    renderToolsRecent();
    toast("Dosya yüklendi", `${file.name} — dinlemek için oynat, modlarda kaynak olarak da seçilebilir.`);
  }).finally(() => {
    if (els.toolsUploadBtnLabel) els.toolsUploadBtnLabel.textContent = "Dosya seç";
  });
}
if (els.toolsUploadBtn && els.toolsFileInput) {
  els.toolsUploadBtn.addEventListener("click", async () => {
    // G61 (PAYWALL.md): "Araçlar sekmesi içeriği: kilitli" — kart Pro-only
    // dalında (toolsProContent) zaten render edilmiyor ama bu buton yine de
    // savunmacı olarak kontrol ediyor (applyProLockVisibility'nin ÜSTÜNDE).
    if (paywall.isToolsContentLocked(isUserPro())) {
      if (!openPaywallReason("upload")) toast(paywall.LOCK_MESSAGES.tools.title, paywall.LOCK_MESSAGES.tools.detail, "pro");
      return;
    }
    const picked = await pickNativeAudioFile();
    if (picked === undefined) els.toolsFileInput.click();
    else if (picked) processToolsUploadFile(picked);
  });
  els.toolsFileInput.addEventListener("change", () => {
    const file = els.toolsFileInput.files && els.toolsFileInput.files[0];
    els.toolsFileInput.value = "";
    processToolsUploadFile(file);
  });
}
if (els.toolsProBtn) els.toolsProBtn.addEventListener("click", () => { resetPaywallToGeneric(); goScreen("paywall"); });

// Gerçek satın alma bu sürümde yok — Araçlar sekmesi normalde her zaman
// kilitli görünür (toolsFreeLock), dokununca paywall'a yönlendirir. isUserPro()
// true ise (gerçek ya da geliştirici simülasyonu) toolsProContent görünür
// olur — Referans Filtreleri hâlâ statik örnek/bilgilendirici veri (gerçek
// DSP bu görevin kapsamı dışı), sadece ERİŞİM engeli kaldırılıyor.
function applyProLockVisibility() {
  const pro = isUserPro();
  if (els.toolsProContent) els.toolsProContent.classList.toggle("hidden", !pro);
  if (els.toolsFreeLock) els.toolsFreeLock.classList.toggle("hidden", pro);
}
applyProLockVisibility();
enforceFreeRestrictions(); // G61: temiz açılışta da (Pro'dan düşmüş eski bir localStorage kaydı olabilir)

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
// G120 DÜZELTMESİ — İLK SÜRÜMÜN (G118) mikro-gecikme tekniği CİHAZDA
// KULAKLA test edilince gerçek bir hata bulundu: pembe gürültüde %50
// genişlikte FAZ SORUNU/tarak filtresi duyuluyordu. KÖK SEBEP: mikro-gecikme
// (bkz. eski MAX_DELAY_SEC notu) sadece width=100'de (tam ayrık pan) güvenliydi
// — width=100'ün ALTINDAKİ HER değerde, StereoPannerNode'un equal-power
// yasası GEREĞİ her iki panner de HER İKİ kanala da KISMİ enerji gönderiyor,
// yani her KULAK aynı anda hem doğrudan hem gecikmeli kopyayı (kısmi
// oranlarda) ALIYORDU — bu, GENİŞ BANTLI/gürültü-benzeri içerikte KLASİK bir
// tarak filtresi (comb filter): H(f) = 1 + k·e^(-j2πfτ), |H(f)| düzenli
// aralıklarla f=(2n+1)/(2τ)'da SIFIRA iniyor. Matematiksel olarak "L≠R"
// (decorrelated) doğruydu ama YANLIŞ TÜRDE bir fark — periyodik, işitilebilir
// bir renklendirme, GERÇEK bir stereo GENİŞLİĞİ HİSSİ değil.
//
// YENİ TEKNİK — GERÇEKTEN İKİ BAĞIMSIZ KAYNAK (task'ın kendi önerisi,
// SoundGym'in "two audio sources are panned to opposite sides" tarifiyle
// BİREBİR): gecikme YERİNE, HER SORUDA taze/bağımsız üretilen İKİNCİ bir
// jeneratör (aynı kaynak TÜRÜNDEN — pembe/pembe, kare/kare vb. — ama
// SAYISAL olarak FARKLI) panR'ı besliyor, panL'i ise resmi/seçili kaynak
// (audio-engine.js'in kurduğu sourceMix) besliyor. İKİ BAĞIMSIZ rastgele
// süreç arasında GECİKME/FAZ İLİŞKİSİ YOKTUR — matematiksel olarak HİÇBİR
// genişlikte periyodik tarak notch'u OLUŞAMAZ (bkz. dosya sonu doğrulama
// notu + test dosyasının FFT karşılaştırması). Bu, "iki mono kaynak"ı
// GERÇEKTEN iki AYRI, birbirinden bağımsız kaynak yapıyor — G118'in "aynı
// buffer'ın iki kopyası DEĞİL" DÜRÜSTLÜK notunun bu kez GERÇEKTEN karşılandığı
// yer burası (o zamanki mikro-gecikme versiyonu bunu sadece KISMEN
// sağlıyordu, decorrelation'ı DELAY'DEN alıyordu, decorrelation'ın KENDİSİ
// artefaktlıydı).
//
// KAYNAK KISITLAMASI DARALTILDI (bu YÜZDEN): "ikinci bağımsız kaynak"
// SADECE SENTETİK türler için (gürültü/osilatör) ucuza/güvenle üretilebilir
// — gerçek bir örnek-dosya (kick/bas/vokal/groove vb.) için "bağımsız İKİNCİ
// bir kayıt" YOKTUR (yeni dosya eklenmeyecek, task'ın kendi kuralı), ve
// AYNI dosyayı iki kez çalmak G118'in başındaki dejenere-mono sorununu
// GERİ getirir. Bu yüzden uyumlu kaynaklar artık SADECE pink/white/saw/
// square/triangle — Pan Konumu'nun geniş listesi (örnek dosyalar dahil)
// BUNDAN ETKİLENMEDİ, tek kaynaklı panlamada decorrelation riski YOK.
// "upload" da AYNI gerekçeyle (kullanıcının kendi dosyasının bağımsız bir
// ikinci kopyası YOK) çıkarıldı — bkz. DURUM.md'deki BEKLEYEN KARAR notu.
//
// MİMARİ NOTU — audio-engine.js:buildQuestionChain'in `filters:[...]` sözleşmesi
// SADECE düz bir seri zincir kurabiliyor, bir kaynağı İÇERDE ikiye ayırıp
// (fan-out) SONRA birleştirmesi (branching) bu döngüyle KURULAMIYOR (elle
// doğrulandı, ara elemanlar arasına audio-engine HER ZAMAN ek bir bypass
// bağlantısı da ekliyor). Bu YÜZDEN G118'de audio-engine.js'e TEK bir yeni
// uzantı noktası eklendi: applyProcessing `{branch:{input,output,nodes}}`
// döndürebilir — mod kendi alt-grafiğini (fan-out+birleştir dahil) TAMAMEN
// kendi içinde kurar, SADECE giriş/çıkış uçlarını dışa verir. G120'de BU
// MEKANİZMA DEĞİŞMEDİ, sadece `output`'a giden İÇ yapı (gecikme yerine
// bağımsız ikinci kaynak) değişti.

import { compatibleSourceIds } from "../core/source-catalog.js";
import { shuffle } from "../core/utils.js";
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

// ═══════════════════════════════════════════════════════════════════════════
// G120 — ZORLUK EĞRİSİ YENİDEN TASARLANDI: eskiden "kademe SAYISI" (3→7,
// isimlendirilmiş sabit ızgara) tek eksendi. Task'ın kendi kararıyla artık
// dB Seviyesi'nin AYNI deseni: genişlik SÜREKLİ bir değer (herhangi bir
// 0-100 sayısı), şıklar bu değerin ETRAFINDA curve-driven bir STEP mesafesinde
// üretiliyor — kolayda şıklar arası fark büyük, zorda küçük. Kademe SAYISI
// (options) ayrı, İKİNCİL bir eksen olarak KORUNDU (daha fazla şık = daha
// zor karar, dB Seviyesi'nin AKSİNE — o modun G97'de "options sabit 3"
// kararı BURADA uygulanmadı, bu modun kendi kararı: iki eksen birlikte).
// ═══════════════════════════════════════════════════════════════════════════
export const WIDTH_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  // Şıklar arası mesafe (yüzde puanı) — AT_1=30 (0-100 aralığının %30'u,
  // çok belirgin), AT_CAP=6, FLOOR=5 (WIDTH_TOLERANCE'tan [2] HER ZAMAN
  // büyük kalacak şekilde seçildi — bkz. aşağıdaki invaryant notu).
  STEP_AT_1: 30,
  STEP_AT_CAP: 6,
  STEP_FLOOR: 5,
  STEP_REDUCTION_PER_STEP: 0.04,

  TIME_SEC_AT_1: 14,
  TIME_SEC_AT_CAP: 8,
  TIME_SEC_FLOOR: 6,
  TIME_SEC_REDUCTION_PER_STEP: 0.1,

  OPTIONS_AT_1: 3,
  OPTIONS_AT_CAP: 7
};

// SAF FONKSİYON. position: zorlukKonumu — Pan Konumu'nun (ve diğer 10 modun)
// paramsForDifficultyPosition'ıyla AYNI mod-agnostik girdi.
export function paramsForDifficultyPosition(position, config = WIDTH_CURVE_CONFIG) {
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

// evaluateAnswer'da "doğru" sayılmanın toleransı — STEP_FLOOR'dan (5) HER
// ZAMAN küçük kalacak şekilde seçildi (Kesim Noktası'nın FREQ_TOLERANCE_OCT/
// DISTRACTOR_STEP_OCT AYNI invaryantı) — yanlış bir şıkka basmak asla
// "doğru" sayılmaz (bkz. test dosyasının 1000 denemelik doğrulaması).
export const WIDTH_TOLERANCE = 2;

// SAF. trueValue etrafında, [min,max] içinde, k·step mesafesinde (k=1,2,...)
// alternan sağa/sola yayılan count-1 çeldirici üretir — Boost/Cut'ın Katman
// 3'teki frekans-havuzu deseniyle AYNI "sınıra göre kırp, taşan adımı diğer
// yöne devret" mantığı (bkz. o dosyanın notu): bir yön dolarsa fazla adım
// DİĞER yöne aktarılır, hiçbir çeldirici [min,max] DIŞINA taşmaz. Adımlar
// TAM k·step mesafede (dB Seviyesi'nin generateChoices'ıyla AYNI karar —
// ekstra rastgelelik EKLENMEDİ, minimum-aralık GARANTİSİ matematiksel kalsın
// diye, bkz. test dosyasının 1000 denemelik çakışma testi).
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
// G120 — İKİ BAĞIMSIZ KAYNAK ÜRETİMİ (bkz. dosya başı DÜRÜSTLÜK notu).
// Gürültü: audio-engine.js:buildNoiseSource'un AYNI algoritması — HER
// ÇAĞRIDA taze Math.random() akışı kullanıldığı için doğası gereği
// bağımsız/decorrelated (iki BAĞIMSIZ rastgele süreç arasında GECİKME/FAZ
// ilişkisi YOK, periyodik tarak notch'u OLUŞAMAZ — bkz. test dosyasının
// FFT kanıtı).
// ═══════════════════════════════════════════════════════════════════════════
function buildIndependentNoiseNode(audioCtx, sourceType) {
  const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (sourceType === "pink") {
      last = 0.985 * last + 0.015 * white;
      data[i] = last * 2.5;
    } else {
      data[i] = white * 0.7;
    }
  }
  const node = audioCtx.createBufferSource();
  node.buffer = buffer;
  node.loop = true;
  node.start();
  return node;
}

// Osilatör (saw/square/triangle): iki AYNI-parametre osilatör TEK BAŞINA
// yetmez — matematiksel olarak SKALER KATLARI (L=k1·A(t), R=k2·A(t)) olur,
// korelasyon HER ZAMAN 1 (elle doğrulandı, bkz. dosya başı DÜRÜSTLÜK notu).
// Küçük bir DETUNE (frekans farkı, ±7 cent) GERÇEK decorrelation sağlar —
// bu, gecikmeden YAPISAL olarak farklı: iki farklı frekans arasındaki
// girişim ZAMANLA YAVAŞÇA KAYAN bir "beating" deseni üretir (STATİK/sabit
// bir frekans-domeni tarak DEĞİL — bkz. test dosyasının zaman-pencereli FFT
// karşılaştırması, ardışık pencereler arasında notch konumunun SABİT
// KALMADIĞI doğrulanıyor), gerçek prodüksiyonda "detuned unison/chorus
// genişletme" olarak bilinen standart bir teknik.
const DETUNE_CENTS = 7;
function buildIndependentOscNode(audioCtx, sourceType) {
  const osc = audioCtx.createOscillator();
  osc.type = sourceType;
  osc.frequency.value = 220;
  osc.detune.value = DETUNE_CENTS;
  osc.start();
  return osc;
}

function buildSecondSourceNode(audioCtx, sourceType) {
  if (sourceType === "pink" || sourceType === "white") return buildIndependentNoiseNode(audioCtx, sourceType);
  if (sourceType === "saw" || sourceType === "square" || sourceType === "triangle") return buildIndependentOscNode(audioCtx, sourceType);
  // Güvenli varsayılan — uyumluKaynaklar dışı bir tür asla buraya düşmemeli
  // (compatibleSourceIds sınırlıyor), ama ÇÖKMEK yerine sessizce pembe
  // gürültüye düşer (audio-engine.js'in "sample yüklenemezse pink noise'a
  // düş" AYNI savunma deseni).
  return buildIndependentNoiseNode(audioCtx, "pink");
}

// Birleştirme kazancı — iki BAĞIMSIZ kaynak toplandığında (güç toplamı,
// genlik DEĞİL) beklenen RMS artışı ~√2 — 0.72 (≈1/√2) ile dengelenir,
// kırpılma riski KALMADAN her genişlikte tutarlı bir seviye korunur (G118'in
// eski 0.5'i, aynı-kaynak-iki-kopya matematiğine göre seçilmişti, artık
// UYGULANAMAZ — bu değer de KULAKLA DOĞRULANMADI, makul bir başlangıç).
export const MERGE_GAIN = 0.72;

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    motor: 1,
    kulaklikGerekli: true,
    kulaklikMetni: "Genişliği doğru duymak için kulaklık şart — hoparlörde stereo görüntü odaya karışır, fark edilmez.",
    // G120 — SADECE sentetik kaynaklar (bkz. dosya başı notu): "bağımsız
    // ikinci kaynak" tekniği gürültü/osilatör türlerinde ucuza/güvenle
    // üretilebiliyor, örnek-dosya (kick/bas/vokal/groove) ve upload'ta
    // GERÇEK bir ikinci/bağımsız kayıt YOK — o kaynaklar bu moddan
    // ÇIKARILDI (Pan Konumu'nun geniş listesi ETKİLENMEDİ, tek-kaynaklı
    // panlamada decorrelation riski hiç yok).
    uyumluKaynaklar: compatibleSourceIds({ only: ["pink", "white", "saw", "square", "triangle"] }),
    ucretsiz: true, // diğer on bir modun AYNI kararı — bkz. pan-konumu.js'in AYNI notu
    videoUrl: "",
    difficulty: DIFFICULTY,
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

  const step = curve ? curve.step : Math.max(6, Math.round(100 / (diff.options + 1)));
  const options = curve ? curve.options : diff.options;
  const timeSec = curve ? curve.timeSec : diff.time;

  // SÜREKLİ ölçek — herhangi bir 0..100 tam sayısı (task madde 3'ün kendi
  // örneği: "gerçek pan %10 ise şıklar %5, %10, %18, %25 gibi" — true değer
  // YUVARLAK bir ızgara noktası OLMAK ZORUNDA DEĞİL).
  const widthPercent = Math.round(Math.random() * 100);

  const values = generateChoiceValues(widthPercent, step, Math.max(3, options), 0, 100);
  const choices = shuffle(values.map(v => ({ value: v, correct: v === widthPercent })));
  // Yuvarlama sonrası TEORİK olarak (çok küçük step + kenar durumu) iki
  // değer çakışabilirse diye TEK bir savunma: tekrarları at (STEP_FLOOR
  // WIDTH_TOLERANCE'ın hep üstünde olduğu için PRATİKTE hiç tetiklenmez,
  // bkz. test dosyasının 1000 denemelik doğrulaması — yine de sessizce
  // yanlış bir "iki doğru şık" durumuna düşmek yerine açıkça engellenir).
  const seen = new Set();
  const dedupedChoices = choices.filter(c => {
    if (seen.has(c.value)) return false;
    seen.add(c.value);
    return true;
  });

  return {
    mode: "width",
    difficulty: level,
    widthPercent,
    source,
    hintUsed: false,
    boss,
    timeSec,
    choices: dedupedChoices
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

// G120 — audio-engine.js'in G118'de eklenen branch uzantısı (bkz. dosya başı
// mimari notu) — entryTap RESMİ/seçili kaynağı (sourceMix) alıp panL'e
// besler, TAMAMEN BAĞIMSIZ (taze üretilmiş) bir ikinci kaynak panR'ı besler.
// İki panner'ın açıklığı width'e göre büyür — width=0'da HER İKİ panner de
// merkezde (pan=0), width=100'de tam ayrık.
export function applyProcessing(question, { audioCtx }) {
  const widthFrac = question.widthPercent / 100;

  const entryTap = audioCtx.createGain();
  entryTap.gain.value = 1;

  const panL = audioCtx.createStereoPanner();
  panL.pan.value = -widthFrac;

  const secondSourceNode = buildSecondSourceNode(audioCtx, question.source);
  const secondGain = audioCtx.createGain();
  secondGain.gain.value = 1;
  secondSourceNode.connect(secondGain);

  const panR = audioCtx.createStereoPanner();
  panR.pan.value = widthFrac;

  const mergeGain = audioCtx.createGain();
  mergeGain.gain.value = MERGE_GAIN;

  entryTap.connect(panL);
  secondGain.connect(panR);
  panL.connect(mergeGain);
  panR.connect(mergeGain);

  return {
    branch: {
      input: entryTap,
      output: mergeGain,
      nodes: [entryTap, panL, secondSourceNode, secondGain, panR, mergeGain]
    }
  };
}

// SAF FONKSİYON. answer: { value } ya da doğrudan sayı (genişlik yüzdesi, 0..100).
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
  return question.widthPercent === 0 ? "Tamamen mono" : question.widthPercent >= 50 ? "Geniş taraf" : "Dar taraf";
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
// answer={value} kurmak için okunur. Alt satır her zaman "Mono"/"Tam Geniş"
// gibi bağlamsal bir ipucu YOK artık (sürekli ölçekte anlamsız) — SADECE
// yüzde.
export function renderAnswerChoices(answersEl, q) {
  if (!answersEl) return;
  if (!q.choices) { answersEl.innerHTML = ""; answersEl.classList.add("hidden"); return; }
  answersEl.className = "answers";
  answersEl.innerHTML = q.choices.map(c => {
    return `<button type="button" class="ans" data-value="${c.value}"><b>${formatWidthPercent(c.value)}</b></button>`;
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

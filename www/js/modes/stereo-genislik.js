// "Stereo Genişlik" — kullanıcının kendi yüklediği STEREO dosyanın mid/side
// dengesini değiştirip kullanıcı gerçek genişliği bulmaya çalışıyor. %100 =
// dosyanın kendi (orijinal) genişliği, %0 = tamamen mono. Mod sözleşmesi/
// zorluk-eğrisi deseni Pan Konumu'yla (bu turun ikiz modu) BİREBİR aynı —
// bkz. o dosyanın dosya başı notu, burada TEKRARLANMIYOR, sadece FARKLAR
// belgelendi.
//
// G122 — KAYNAK TAMAMEN DEĞİŞTİ (task'ın kendi kararı, kullanıcı raporu):
// G120'nin "iki bağımsız sentetik kaynak" tekniği comb filter'ı MATEMATİKSEL
// olarak çözmüştü, ama bedeli modu SOYUTLAŞTIRMAK oldu — gürültü/osilatör
// dinleterek "genişlik" öğretmek projenin "her mod gerçek bir mix
// durumundan doğmalı" ilkesine aykırıydı (kullanıcının kendi gerekçesi).
//
// YENİ TEKNİK — MID/SIDE GENİŞLİK, tek (gerçek, kullanıcının kendi) stereo
// kaynak üzerinde: mid=(L+R)/2, side=(L−R)/2. side bir katsayıyla (widthFrac,
// 0..1) ölçeklenir, sonra L'=mid+side', R'=mid−side' olarak geri birleştirilir.
// widthFrac=0 → side'=0 → L'=R'=mid (TAM MONO, korelasyon=+1 MATEMATİKSEL
// KESİNLİKLE — bkz. dosya sonu doğrulama notu). widthFrac=1 → side'=side →
// L'=mid+side=L, R'=mid−side=R (dosyanın TAM KENDİ orijinal genişliği,
// birebir geri kurulur).
//
// NEDEN COMB FILTER YAPISAL OLARAK İMKÂNSIZ (G120'nin sentetik-kaynak
// çözümünden bile daha güçlü bir garanti): bu işlem HİÇBİR GECİKME
// ELEMANI İÇERMİYOR — sadece [L,R]'nin ANLIK (örnek-eşleşmeli, z^0) bir 2x2
// matris dönüşümü:
//   [L']   [ 1-k/2  ... ]   (aşağıdaki node grafiği matematiksel olarak
//   [R'] = [ ...        ]    L'=mid+k·side, R'=mid−k·side'i üretir)
// H(f) formülünde hiçbir z^-τ terimi YOK — dolayısıyla |H(f)|'de periyodik
// bir sıfırlanma (comb notch) OLUŞAMAZ, herhangi bir k (=widthFrac) değerinde.
// G120'nin "iki bağımsız kaynak" çözümü comb'u İSTATİSTİKSEL olarak
// (korelasyonsuzluk) engelliyordu; bu çözüm YAPISAL olarak (gecikme
// elemanının kendisi yok) engelliyor — daha güçlü, daha basit bir garanti.
//
// KAYNAK KISITLAMASI: artık SADECE "upload" — mid/side ayrıştırması ANLAMLI
// olması için GERÇEK, kullanıcının kendi stereo kaydı gerekiyor (task'ın
// kendi kararı: "bu mod SADECE kullanıcının yüklediği dosyayla oynanacak").
// Sentetik kaynaklar (gürültü/osilatör, G120'nin çözümü) ve gömülü örnek
// dosyalar (kick/bas/vokal/groove) listeden TAMAMEN ÇIKARILDI — Pan
// Konumu'nun geniş listesi ETKİLENMEDİ (o mod StereoPannerNode kullanıyor,
// mid/side'a hiç ihtiyacı yok).
//
// MONO DOSYA KORUMASI: bufferPlayability() bir AudioBuffer'ın
// numberOfChannels'ını kontrol eder — mono bir dosyada side HER ZAMAN
// sıfırdır (L=R matematiksel olarak), "genişlik" kavramı hiç YOK, bu yüzden
// mono dosyalar AÇIKÇA reddedilir (bkz. app.js syncUploadGate — G126'dan
// beri 11 upload-destekli modun HEPSİ için genellenmiş, bu fonksiyonu
// SADECE Stereo Genişlik için ekstra mono kontrolüyle tüketen taraf).
//
// SEGMENT SEÇİMİ: pickPlaybackOffset() dosyanın İÇİNDE enerji eşiğini geçen
// rastgele bir başlangıç noktası bulur (sessiz bir bölüme denk gelmesin diye)
// — app.js startRound()'da her yeni turda uploadManager.seekTo() ile
// uygulanır (upload.js'in AYRI, kalıcı pause/resume offset takibinden
// BAĞIMSIZ bir "yeni tur = yeni nokta" sıçraması, bkz. upload.js'in
// seekTo() notu).
//
// MİMARİ NOTU — audio-engine.js:buildQuestionChain'in `filters:[...]`
// sözleşmesi SADECE düz bir seri zincir kurabiliyor; mid/side ayrıştırması
// (ChannelSplitterNode ile fan-out, ChannelMergerNode ile birleştirme) bu
// döngüyle KURULAMIYOR — G118'de eklenen `branch:{input,output,nodes}`
// uzantı noktası (mod kendi alt-grafiğini TAMAMEN kendi içinde kurar)
// burada da kullanılıyor, mekanizma DEĞİŞMEDİ.

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
// ZORLUK EĞRİSİ — G120'den DEĞİŞMEDİ (kaynak/DSP değişikliği şık-üretim
// mantığını ETKİLEMEZ, ikisi bağımsız katmanlar). dB Seviyesi'nin AYNI
// deseni: genişlik SÜREKLİ bir değer (0-100), şıklar bu değerin ETRAFINDA
// curve-driven bir STEP mesafesinde üretiliyor.
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
// G122 — DOSYA UYGUNLUĞU (SAF, DOM/audio bağımsız — sadece bir AudioBuffer'ın
// alanlarını okur). app.js hem "Oynat"a basmadan ÖNCE gate panelini
// kurmak hem de round'u fiilen engellemek için AYNI fonksiyonu okur — tek
// doğruluk kaynağı, iki yerde farklı mantık YOK.
// ═══════════════════════════════════════════════════════════════════════════
export function bufferPlayability(buffer) {
  if (!buffer) return { ok: false, reason: "no-file" };
  if (buffer.numberOfChannels < 2) return { ok: false, reason: "mono" };
  return { ok: true, reason: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// G122 — SEGMENT SEÇİMİ (buffer'ın GERÇEK PCM verisini okur — bu yüzden
// createQuestion'ın SAF sözleşmesinin DIŞINDA, app.js startRound()'da
// createQuestion'dan ÖNCE çağrılıyor, bkz. dosya başı notu). rng
// enjekte edilebilir (varsayılan Math.random) — testler deterministik bir
// üretici verip sonucu ÖNGÖRÜLEBİLİR şekilde doğrulayabiliyor.
// ═══════════════════════════════════════════════════════════════════════════
export function pickPlaybackOffset(buffer, opts = {}) {
  const windowSec = opts.windowSec || 1.5;
  const energyThreshold = opts.energyThreshold != null ? opts.energyThreshold : 0.015;
  const maxAttempts = opts.maxAttempts || 30;
  const scanSteps = opts.scanSteps || 40;
  const rng = opts.rng || Math.random;

  if (!buffer || !Number.isFinite(buffer.duration) || buffer.duration <= windowSec) return 0;

  const windowRms = (startSec) => {
    const startSample = Math.max(0, Math.floor(startSec * buffer.sampleRate));
    const windowSamples = Math.max(1, Math.floor(windowSec * buffer.sampleRate));
    let sumSq = 0, count = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      const end = Math.min(data.length, startSample + windowSamples);
      // hop=4 — tam örnek-hassasiyeti GEREKMİYOR (sadece kaba bir enerji
      // tahmini), büyük dosyalarda (ör. 5 dk) ana iş parçacığını gereksiz
      // yormamak için her 4. örnek örneklenir.
      for (let i = startSample; i < end; i += 4) { sumSq += data[i] * data[i]; count++; }
    }
    return count > 0 ? Math.sqrt(sumSq / count) : 0;
  };

  const maxStart = buffer.duration - windowSec;
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = rng() * maxStart;
    if (windowRms(candidate) >= energyThreshold) return candidate;
  }
  // Hiçbir rastgele deneme eşiği geçemedi (dosyanın TAMAMI sessize yakın
  // OLABİLİR) — güvenlik ağı: kaba bir tarama ile en yüksek enerjili
  // pencereyi bul, "sessizliğe düşme" garantisi (dosya gerçekten TAMAMEN
  // sessizse bile en azından en az kötü noktaya düşülür, ÇÖKMEZ).
  let best = 0, bestRms = -1;
  for (let i = 0; i <= scanSteps; i++) {
    const candidate = (maxStart * i) / scanSteps;
    const rms = windowRms(candidate);
    if (rms > bestRms) { bestRms = rms; best = candidate; }
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    motor: 1,
    kulaklikGerekli: true,
    kulaklikMetni: "Genişliği doğru duymak için kulaklık şart — hoparlörde stereo görüntü odaya karışır, fark edilmez.",
    // G122 — SADECE "upload": mid/side ayrıştırması GERÇEK bir stereo
    // kayıt gerektiriyor, sentetik kaynaklarda (G120) ya da gömülü örnek
    // dosyalarda (mono) bu kavram anlamsız/yok. Bu YÜZDEN Pan Konumu'nun
    // (aynı ekranda yan yana görünen ikiz modun) geniş listesiyle KASITLI
    // bir kapsam farkı var (bkz. DURUM.md G120 BEKLEYEN KARAR-L, artık
    // bu kararla ÇÖZÜLDÜ — task'ın kendi kararı).
    uyumluKaynaklar: compatibleSourceIds({ only: ["upload"] }),
    ucretsiz: true, // diğer on bir modun AYNI kararı — bkz. pan-konumu.js'in AYNI notu (mod zaten Pro tier, bkz. mode-catalog.js)
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
  // G122 — bu modun TEK uyumlu kaynağı "upload" (bkz. getMeta) — varsayılan
  // da buna göre güncellendi (G120'de "pink" idi, artık geçersiz bir tür).
  const source = settings.source || "upload";

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
  return "Kendi dosyanla dinle, stereo görüntünün genişliğini şıklardan seç.";
}

// G122 — MID/SIDE GENİŞLİK (bkz. dosya başı notu, tam matematiksel gerekçe
// orada). entryTap sourceMix'i (audio-engine.js'in KURDUĞU, GERÇEK stereo
// upload sinyali) alır, ChannelSplitterNode'la L/R'ye ayırır. mid=(L+R)/2
// ve side=(L−R)/2 iki AYRI toplama zinciriyle hesaplanır (splitter'ın HER
// iki çıkışı da HER iki zincire bağlanır — GainNode'a birden fazla bağlantı
// otomatik TOPLAR, Web Audio'nun kendi "fan-in" davranışı). side widthFrac
// (0..1) ile ölçeklenir, mid+side'/mid−side' ChannelMergerNode'la geri
// stereo'ya birleştirilir. HİÇBİR DelayNode/gecikme YOK.
export function applyProcessing(question, { audioCtx }) {
  const widthFrac = question.widthPercent / 100;

  const entryTap = audioCtx.createGain();
  entryTap.gain.value = 1;

  const splitter = audioCtx.createChannelSplitter(2);
  entryTap.connect(splitter);

  // mid = 0.5*L + 0.5*R
  const halfLMid = audioCtx.createGain(); halfLMid.gain.value = 0.5;
  const halfRMid = audioCtx.createGain(); halfRMid.gain.value = 0.5;
  splitter.connect(halfLMid, 0);
  splitter.connect(halfRMid, 1);
  const midSum = audioCtx.createGain(); midSum.gain.value = 1;
  halfLMid.connect(midSum);
  halfRMid.connect(midSum);

  // side = 0.5*L − 0.5*R
  const halfLSide = audioCtx.createGain(); halfLSide.gain.value = 0.5;
  const halfRSide = audioCtx.createGain(); halfRSide.gain.value = -0.5;
  splitter.connect(halfLSide, 0);
  splitter.connect(halfRSide, 1);
  const sideSum = audioCtx.createGain(); sideSum.gain.value = 1;
  halfLSide.connect(sideSum);
  halfRSide.connect(sideSum);

  // side' = widthFrac * side
  const sideScaled = audioCtx.createGain();
  sideScaled.gain.value = widthFrac;
  sideSum.connect(sideScaled);

  // L' = mid + side'
  const outL = audioCtx.createGain(); outL.gain.value = 1;
  midSum.connect(outL);
  sideScaled.connect(outL);

  // R' = mid − side'
  const sideScaledNeg = audioCtx.createGain(); sideScaledNeg.gain.value = -1;
  sideScaled.connect(sideScaledNeg);
  const outR = audioCtx.createGain(); outR.gain.value = 1;
  midSum.connect(outR);
  sideScaledNeg.connect(outR);

  const merger = audioCtx.createChannelMerger(2);
  outL.connect(merger, 0, 0);
  outR.connect(merger, 0, 1);

  return {
    branch: {
      input: entryTap,
      output: merger,
      nodes: [entryTap, splitter, halfLMid, halfRMid, midSum, halfLSide, halfRSide, sideSum, sideScaled, outL, sideScaledNeg, outR, merger]
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

const MIX_REALITY_NOTE = "Genişlik derinlik ve alan katar ama abartılırsa mono uyumu bozulur — kulüpte (sub genelde mono çalar) ve telefonda (tek hoparlör HER ŞEYİ mono çalar) fazla geniş bir mix çöker. Araçlar'daki Ölçüm Sonuçları'nın mono uyum ölçümü tam bu riski gösterir — burada dinlediğin şey, o ölçümün kulakla karşılığı.";

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

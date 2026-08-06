// "dB Seviyesi" — kaynağa uygulanan bir seviye (gain) değişiminin BÜYÜKLÜĞÜNÜ ve
// YÖNÜNÜ (açıldı mı kısıldı mı) kulakla bulma modu. Frekans Bulma + Kesim Noktası'ndan
// sonra 3. oynanabilir mod — ŞABLON olarak Kesim Noktası izlendi (aynı mod sözleşmesi,
// aynı seans-içi rampa/eğri deseni). Bu, difficulty-curve.js'in merkezi kütüphanesine
// SIFIRDAN bağlanan İLK mod — ne bir statik-tablo-öncelikli geçiş dönemi (Kesim
// Noktası/Frekans Bulma'nın ADIM 1/2'de yaşadığı) ne de sonradan kalibrasyon
// düzeltmesi (ADIM 3) gerekmedi; DB_CURVE_CONFIG baştan "Sabit modda hiçbir tier
// eskisinden kolay olmasın" invaryantını sağlayacak şekilde kuruldu (bkz. commit
// mesajındaki ikili-arama hesaplaması).
//
// Mod sözleşmesi diğer ikisiyle AYNI (getMeta/createQuestion/applyProcessing/
// evaluateAnswer/calculateXP/getFeedbackData) + aynı-isimli render yardımcıları
// (renderAnswerChoices/markAnswerChoices/drawOverlay/vb.).
//
// SADECE ŞIKLI (choiceOnly:true) — Kesim Noktası'yla AYNI karar: bir dB farkını
// "dalgaya tıklayarak" işaretlemenin doğal bir karşılığı yok.

import { shuffle } from "../core/utils.js";
import { SOURCE_GROUPS } from "../core/source-catalog.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound } from "./frekans-bulma.js";
import { logLerp, applyPostCapFloor } from "../core/difficulty-curve.js";
import { GUESS_COLOR, CORRECT_COLOR } from "../core/feedback-colors.js";

// app.js'in GENEL görselleştiricisi (drawVisualizer/drawSpectrumBars) BU sabitleri
// HER moddan mode-agnostik olarak okur (spektrum çubukları frekans ekseninde çizilir,
// bu modun KENDİSİ frekans ekseni kullanmasa bile) — Kesim Noktası'nın AYNI re-export
// deseni, bkz. o dosyanın dosya başı notu.
export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound };

export const MODE_ID = "db-seviyesi";

// G39: bu mod artık kendi dikey bar görselini (drawDbBars) çiziyor — arkadaki
// FFT spektrum çubukları (app.js drawVisualizer) bu modda ANLAMSIZ (mod bir
// frekans dağılımını değil, TEK bir seviye/gain farkını sorguluyor) ve iki
// görsel aynı canvas'ta çakışıyordu. THREE_WAY'in (kompresor.js/reverb.js)
// AYNI deseni: mode-agnostik bir bayrak, app.js `mode.SHOW_SPECTRUM !== false`
// ile okuyor — export ETMEYEN modlarda varsayılan true (davranış değişmiyor).
export const SHOW_SPECTRUM = false;

// MAX_LIVES: diğer iki modla AYNI sabit (can sayısı zorluğa göre değişmez).
export const MAX_LIVES = 5;

// directionRevealed BURADA YOK — Kesim Noktası'nın typeRevealed'ıyla AYNI desen,
// seans içi soru sırasına bağlı (bkz. DIRECTION_REVEAL_QUESTION_COUNT/createQuestion).
// dbDelta (uygulanan gerçek büyüklük) hâlâ zorluğa bağlı (bkz. DB_CURVE_CONFIG).
//
// proplus BURADA çok-bantlı bir varyant DEĞİL — Kesim Noktası'ndaki AYNI zorunluluk:
// paylaşılan (mod-bağımsız) Zorluk seçicisi 5 sabit seçenek sunuyor, mode.DIFFICULTY
// HER anahtarda tanımlı dönmeli (aksi halde currentDifficultyConfig() çöker) — pro
// ile AYNI davranır.
//
// dbDelta/DISTRACTOR_STEP_DB KULAKLA DOĞRULANMADI — Z1'in hassasiyet eğrisiyle AYNI
// durum: makul bir başlangıç noktası. "Kolay"da bile ±3 dB (bariz ama yuvarlak DEĞİL
// bir gerçek değere jitter'lanır, bkz. pickDbDelta), "Pro"da ±0.5 dB (kulağın gerçek
// ayırt sınırına yakın).
export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 14, options: 3, time: 14, lives: MAX_LIVES, dbDelta: 3.0 },
  medium: { label: "Orta", xp: 20, options: 4, time: 12, lives: MAX_LIVES, dbDelta: 1.75 },
  hard: { label: "Zor", xp: 32, options: 5, time: 11, lives: MAX_LIVES, dbDelta: 0.9 },
  pro: { label: "Pro", xp: 46, options: 6, time: 9, lives: MAX_LIVES, dbDelta: 0.5 },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 46, options: 6, time: 9, lives: MAX_LIVES, dbDelta: 0.5 }
};

// ═══════════════════════════════════════════════════════════════════════════
// ZORLUK EĞRİSİ — merkezi kütüphaneye (difficulty-curve.js) SIFIRDAN bağlanan İLK
// mod. Yukarıdaki statik DIFFICULTY tablosu KALDIRILMADI — geriye dönük uyumluluk +
// "Sabit" modun tier-isim çapası + proplus için gerekli (bkz. core/difficulty-curve.js
// dosya başı not).
//
// AT_1'ler statik easy değerleriyle birebir aynı. AT_CAP'lar statik pro'yla BİREBİR
// AYNI DEĞİL — Kesim Noktası'nın ADIM 3'te SONRADAN düzeltmek zorunda kaldığı
// "representativeLevelForTier artık her tier'ı kendi üst sınırında (easy=4, medium=8,
// hard=12, pro=LEVEL_CAP) değerlendiriyor, salt AT_CAP=statik-pro ile ARADA eski
// statikten KOLAY çıkıyor" sorunu burada BAŞTAN hesaba katıldı (ikili aramayla
// AT_CAP'ler öyle seçildi ki representative seviyelerin (4/8/12/20) HİÇBİRİNDE eski
// statik değer aşılmıyor — bkz. commit mesajındaki karşılaştırma tablosu).
export const DB_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  // Uygulanan GERÇEK dB büyüklüğü — küçük=zor. AT_1=DIFFICULTY.easy.dbDelta.
  // AT_CAP=0.32 (DIFFICULTY.pro.dbDelta'dan [0.5] daha zor — representativeLevelForTier
  // ("hard")=12'de eski hard'ı [0.9] aşmamak için 0.32 gerekti, hesaplandı). FLOOR=0.25:
  // kulak ~0.25 dB altını pratikte ayırt edemez (psikoakustik JND'ye yakın kabul
  // edilen bir değer, KESİN ölçülmedi) — applyPostCapFloor eğrinin bunun altına
  // inmesini engelliyor.
  DB_AT_1: 3.0,
  DB_AT_CAP: 0.32,
  DB_FLOOR: 0.25,
  DB_REDUCTION_PER_STEP: 0.01,

  // Şıklar arası dB mesafesi — DB_TOLERANCE'tan (0.1) HER ZAMAN büyük kalacak şekilde
  // (bkz. o sabitin invaryant notu) AT_CAP/FLOOR seçildi.
  STEP_AT_1: 1.5,
  STEP_AT_CAP: 0.28,
  STEP_FLOOR: 0.22,
  STEP_REDUCTION_PER_STEP: 0.01,

  // Soru süresi (sn) — diğer iki modla AYNI kapsam kararı: HENÜZ round-timer'a
  // bağlanmadı (G21'in hizalı geçiş süresini riske atmamak için), sadece hesaplanıyor/
  // test ediliyor.
  TIME_SEC_AT_1: 14,
  TIME_SEC_AT_CAP: 9,
  TIME_SEC_FLOOR: 6,
  TIME_SEC_REDUCTION_PER_STEP: 0.1,

  OPTIONS_AT_1: 3,
  OPTIONS_AT_CAP: 6.15 // round(logLerp(...)) hard=12'de TAM 5'e ulaşsın diye >6, çıktı yine 6'da kırpılır
};

// SAF FONKSİYON. position: zorlukKonumu (continuousLevel + sessionRampOffset, bkz.
// app.js currentDifficultyPosition) — diğer iki modun paramsForDifficultyPosition'ıyla
// AYNI mod-agnostik girdi, AYNI merkezi logLerp/applyPostCapFloor'u KENDİ sayılarıyla
// çağırır. boss'un etkisi BURADA DEĞİL — position'ın KENDİSİ zaten app.js'te
// sessionRampOffset(...,{boss}) ile yükseltilmiş gelir (çifte ceza olmasın diye).
export function paramsForDifficultyPosition(position, config = DB_CURVE_CONFIG) {
  const safePos = Math.max(1, position);
  const cappedPos = Math.min(safePos, config.LEVEL_CAP);
  const t = config.LEVEL_CAP > 1 ? (cappedPos - 1) / (config.LEVEL_CAP - 1) : 1;

  const dbCurve = logLerp(config.DB_AT_1, config.DB_AT_CAP, t);
  const stepCurve = logLerp(config.STEP_AT_1, config.STEP_AT_CAP, t);
  const timeCurve = logLerp(config.TIME_SEC_AT_1, config.TIME_SEC_AT_CAP, t);
  const optionsCurve = logLerp(config.OPTIONS_AT_1, config.OPTIONS_AT_CAP, t);

  return {
    position: safePos,
    dbDelta: applyPostCapFloor(dbCurve, safePos, config.LEVEL_CAP, config.DB_FLOOR, config.DB_REDUCTION_PER_STEP),
    step: applyPostCapFloor(stepCurve, safePos, config.LEVEL_CAP, config.STEP_FLOOR, config.STEP_REDUCTION_PER_STEP),
    timeSec: applyPostCapFloor(timeCurve, safePos, config.LEVEL_CAP, config.TIME_SEC_FLOOR, config.TIME_SEC_REDUCTION_PER_STEP),
    options: Math.max(3, Math.min(6, Math.round(optionsCurve)))
  };
}

// Kesim Noktası'nın TYPE_REVEAL_QUESTION_COUNT'uyla AYNI desen: her SEANSTA
// (resetSession() ile sınırlanır) ilk N soru YÖNÜ söyler (ısınma), sonrasında yön
// GİZLENİR — kullanıcı hem yönü (+/-) hem miktarı bulmak zorunda kalır.
export const DIRECTION_REVEAL_QUESTION_COUNT = 3;

// Şıklardaki dB çeldiricilerinin doğru cevaptan minimum mesafesi — DB_TOLERANCE'tan
// (0.1) HER ZAMAN büyük olmalı (Kesim Noktası'nın DISTRACTOR_STEP_OCT/FREQ_TOLERANCE_OCT
// AYNI invaryantı).
export const DISTRACTOR_STEP_DB = { easy: 1.5, medium: 1.0, hard: 0.6, pro: 0.35, proplus: 0.35 };

// evaluateAnswer'da "doğru" sayılmanın dB toleransı — DISTRACTOR_STEP_DB'nin HER
// değerinden (ve DB_CURVE_CONFIG.STEP_FLOOR'dan) küçük olmalı, yoksa yanlış bir
// şıkka basmak yine "doğru" sayılabilir.
export const DB_TOLERANCE = 0.1;

export function formatDb(value) {
  const rounded = Math.round(value * 100) / 100;
  const sign = rounded >= 0 ? "+" : "";
  return `${sign}${rounded.toFixed(2)} dB`;
}

// SAF FONKSİYON. baseDelta (curve'ün ürettiği "tipik" büyüklük) etrafında ±%20
// rastgelelik uygulayıp 2 ondalığa yuvarlar — Kesim Noktası'nın pickCutoffFreq'inin
// havuzdan RASTGELE çekmesiyle AYNI felsefe (her soru curve'ün ürettiği TEK bir sabit
// sayı DEĞİL, o zorluk seviyesinin civarında farklı bir gerçek değer taşır). Bu aynı
// zamanda görev kararının istediği "ondalıklı, gerçekçi (2.30, 5.25 gibi) — yuvarlak
// sayı YOK" sonucunu doğal olarak üretir.
//
// G24 DÜZELTMESİ — İKİ GERÇEK HATA BURADAYDI (kullanıcı raporu: "zorluk rampası
// çalışmıyor, 10-12 soru boyunca hep kolay kalıyor"). Kesim Noktası'yla karşılaştırmalı
// kanıtla (bkz. commit mesajı) BAĞLANTININ kendisi (currentDifficultyPosition →
// paramsForDifficultyPosition) SAĞLAMDI — iki mod da AYNI continuousLevel/
// sessionRampOffset'i okuyor, position BİREBİR aynı şekilde hesaplanıyor. Asıl sorun
// BURADAYDI:
//   1) ±%20 (0.8x-1.2x) jitter, seans rampasının seviye-1 bir oyuncuda ürettiği
//      GERÇEK ama KÜÇÜK eğilimi (position 1→2 arası ~%11 düşüş — matematiksel olarak
//      KANITLANDI, bkz. commit mesajı) BOĞUYORDU: gürültü (±%20) sinyalden (~%11)
//      BÜYÜKTÜ, kullanıcı "hiç değişmiyor" hissediyordu. ±%6'ya indirildi — hâlâ her
//      soru farklı (asla tekrar YOK, jitter'ın asıl amacı buydu, o korunuyor) ama artık
//      seans rampasının ürettiği eğilim GÖRÜLEBİLİYOR.
//   2) DB_FLOOR (0.25 dB, "kulağın gerçek ayırt sınırı") jitter'dan SONRA HİÇ
//      kontrol edilmiyordu — pro'da (dbDelta=0.32) ±%20 jitter değeri 0.256'ya kadar
//      düşürebiliyordu (0.32*0.8=0.256 < 0.32 ama FLOOR'un [0.25] altına da
//      inebiliyordu — ölçüldü: 5000 örnekte %45 floor ihlali). Şimdi jitter'dan SONRA
//      Math.max(DB_FLOOR,...) ile taban GARANTİ ediliyor.
export function pickDbDelta(baseDelta, rng = Math.random) {
  const jitter = 0.94 + rng() * 0.12; // 0.94x – 1.06x (G24: eskiden 0.8x-1.2x)
  const jittered = baseDelta * jitter;
  return Math.round(Math.max(DB_CURVE_CONFIG.DB_FLOOR, jittered) * 100) / 100;
}

// SAF FONKSİYON. trueDbDelta (İŞARETLİ) etrafında (options-1) çeldirici üretir.
// Büyüklükler (mutlak değer) trueDbDelta'nın etrafında TAM k*step mesafede, hep
// pozitif offsetli üretilir (Kesim Noktası'nın "üstten/alttan sırayla tam adım"
// deseniyle AYNI) — böylece hiçbir iki büyüklük ÇAKIŞMAZ. directionRevealed=true
// ise TÜM şıklar trueDbDelta'yla AYNI işareti taşır (sadece büyüklük yarışır);
// directionRevealed=false ise en az bir çeldiricinin İŞARETİ ters çevrilir (doğru
// şık ASLA) — Kesim Noktası'nın "en az bir çeldiricinin filtre tipi ters" kuralının
// dB karşılığı. Büyüklükler farklı olduğu için işaret çevirme ASLA bir değer
// çakışmasına yol açmaz (|m1|≠|m2| ⇒ ±m1≠±m2 her zaman).
export function generateChoices(trueDbDelta, resolved, directionRevealed) {
  const step = resolved.step;
  const count = Math.max(2, resolved.options);
  const sign = trueDbDelta >= 0 ? 1 : -1;
  const absTrue = Math.abs(trueDbDelta);

  const magnitudes = [absTrue];
  let k = 1;
  while (magnitudes.length < count) magnitudes.push(Math.round((absTrue + k++ * step) * 100) / 100);

  let choices;
  if (directionRevealed) {
    choices = magnitudes.map((m, i) => ({ value: Math.round(m * sign * 100) / 100, correct: i === 0 }));
  } else {
    const flippableIdx = shuffle(magnitudes.map((_, i) => i).filter(i => i !== 0));
    const flipSet = new Set();
    flippableIdx.forEach((idx, n) => { if (n === 0 || Math.random() < 0.5) flipSet.add(idx); });
    choices = magnitudes.map((m, i) => {
      if (i === 0) return { value: Math.round(m * sign * 100) / 100, correct: true };
      const s = flipSet.has(i) ? -sign : sign;
      return { value: Math.round(m * s * 100) / 100, correct: false };
    });
  }
  return shuffle(choices);
}

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

// ad/aciklama BİLEREK yok — diğer iki modla AYNI kural, kart metni yalnızca
// core/mode-catalog.js'ten okunur.
export function getMeta() {
  return {
    id: MODE_ID,
    motor: 1,
    kulaklikGerekli: false,
    // Kaynak kısıtlaması YOK — Kesim Noktası'ndaki AYNI karar: tüm SOURCE_GROUPS'tan
    // üretilir (gain her kaynakta duyulur), elle liste tutulmaz.
    uyumluKaynaklar: SOURCE_GROUPS.flatMap(g => g.sources.map(s => s.id)),
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY,
    // Kesim Noktası'yla AYNI karar: bir dB farkını "dalgaya tıklayarak" işaretlemenin
    // doğal bir karşılığı yok — SADECE şıklı.
    choiceOnly: true
  };
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz. settings: { source, boss,
// sessionQuestionIndex — bkz. DIRECTION_REVEAL_QUESTION_COUNT notu, 0-tabanlı,
// verilmezse 0 (ilk soru gibi davranır — directionRevealed=true, geriye dönük
// güvenli varsayılan); difficultyPosition — verilirse dbDelta/options/step EĞRİDEN
// (paramsForDifficultyPosition) gelir, verilmezse (mevcut testler, doğrudan
// çağrılar, proplus) ESKİ statik DIFFICULTY[level] davranışı korunur }.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "pink";
  const direction = Math.random() < 0.5 ? 1 : -1;

  // proplus BİLEREK eğri DIŞINDA TUTULUR — diğer iki modla AYNI savunma katmanı
  // (Z5 kararı: proplus merdivenin dışında, app.js zaten proplus için
  // difficultyPosition hiç üretmez, ama createQuestion doğrudan çağrılırsa bile
  // proplus'un kendi statik satırına sadık kalması garanti olsun diye).
  const curve = (level !== "proplus" && Number.isFinite(settings.difficultyPosition))
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  // Eğri YOKSA (statik yol): boss round'da daha ince (daha zor) bir fark — diğer
  // iki modun "boss'ta gerçek değer daha zor/yakın" desenine paralel. Eğri VARSA bu
  // çarpan UYGULANMAZ — boss'un etkisi zaten position'ın İÇİNDE.
  const baseDelta = curve ? curve.dbDelta : (boss ? diff.dbDelta * 0.6 : diff.dbDelta);
  const resolved = curve
    ? { options: curve.options, step: curve.step }
    : { options: diff.options, step: DISTRACTOR_STEP_DB[level] || DISTRACTOR_STEP_DB.medium };
  const timeSec = curve ? curve.timeSec : diff.time;

  const dbDelta = pickDbDelta(baseDelta) * direction;
  const sessionQuestionIndex = Number.isFinite(settings.sessionQuestionIndex) ? settings.sessionQuestionIndex : 0;
  const directionRevealed = sessionQuestionIndex < DIRECTION_REVEAL_QUESTION_COUNT;

  return {
    mode: "dblevel",
    difficulty: level,
    dbDelta,
    directionLabel: dbDelta >= 0 ? "AÇILDI" : "KISILDI",
    directionRevealed,
    source,
    hintUsed: false,
    boss,
    timeSec,
    choices: generateChoices(dbDelta, resolved, directionRevealed)
  };
}

export function modeDescription(q) {
  return q.directionRevealed
    ? "A/B ile karşılaştır, dB farkının miktarını şıklardan seç."
    : "A/B ile karşılaştır, yönü (açıldı/kısıldı) ve miktarı şıklardan seç.";
}

export function correctLabel(q) {
  return formatDb(q.dbDelta);
}

// Soruda uygulanan seviye değişimini audioCtx üzerinde kurar — audio-engine.js bunu
// sourceMix→...→compressor arasına bağlar (bkz. o dosyanın buildQuestionChain'i).
// Clipping notu: paylaşılan zincirde GainNode'dan SONRA, dry/wet birleştikten sonra
// bir DynamicsCompressor (threshold -16dB, ratio 2.2) var — bu, +dB'de (en fazla
// ~+3.6 dB, DIFFICULTY.easy.dbDelta*jitter üst sınırı) oluşabilecek tepe seviyeleri
// zaten yumuşatıyor; audio-engine.js'e ayrıca dokunulmadı.
export function applyProcessing(question, { audioCtx }) {
  const g = audioCtx.createGain();
  g.gain.value = Math.pow(10, question.dbDelta / 20);
  return { filters: [g] };
}

// SAF FONKSİYON. answer: { value } ya da doğrudan sayı — şıklı arayüzden gelen
// seçimin dB değeri. "Doğru" sayılması için DB_TOLERANCE içinde eşleşmeli.
// directionOk: işaret (yön) tutuyor mu — yön yanlışken de büyüklük yakın olabilir,
// getFeedbackData'da hangi kısmın kaçırıldığını anlatmak için taşınır.
export function evaluateAnswer(question, answer) {
  const guessValue = answer && typeof answer === "object" ? answer.value : answer;
  const diff = Math.abs(guessValue - question.dbDelta);
  const correct = diff <= DB_TOLERANCE;
  const directionOk = Math.sign(guessValue) === Math.sign(question.dbDelta);
  return {
    mode: "dblevel",
    correct,
    directionOk,
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
// ÖĞRETİCİ METİN ŞABLONLARI — TEK YERDE, kolay düzenlenebilir. Diğer iki modla AYNI
// dürüstlük notu: makul bir BAŞLANGIÇ, kesin nihai metin iddia edilmiyor. Teknik
// jargon (JND, RMS vb.) HİÇ verilmiyor — sadece mix dilinde algısal etki.
// ═══════════════════════════════════════════════════════════════════════════

// dB büyüklüğüne göre (mutlak değer) mix'teki algısal karşılığı — üç kaba kademe
// yeterli (çok ince/fark edilir/belirgin), tam eşiği tartışmalı ama makul.
function magnitudeWord(absDb) {
  if (absDb < 1) return "çok ince bir fark — dikkatli dinlemeden fark edilmez";
  if (absDb < 3) return "fark edilir bir değişim — bir enstrümanı öne çıkarır ya da geri çeker";
  return "belirgin bir fark — mix'teki dengeyi gözle görülür şekilde değiştirir";
}

const DIRECTION_WORD = { up: "açıldı", down: "kısıldı" };
// Yön yanlışken (case 3) ters yönün ne anlama geldiğini hatırlatan ifadeler.
const DIRECTION_EFFECT = {
  up: "açılınca sesin öne çıkması, mix'te daha baskın olması demek",
  down: "kısılınca sesin geri çekilmesi, mix'te daha az yer kaplaması demek"
};

// SAF FONKSİYON. Cevap sonrası öğretici Türkçe metin gövdesi — ÜÇ durum: (1) doğru
// — kısa onay + bu büyüklüğün mix'te ne işe yaradığı; (2) yön doğru, büyüklük yanlış
// — ne kadar kaçırdığını + doğru büyüklüğün algısal karşılığını anlatır; (3) yön
// yanlış — açılma/kısılma farkını karşılaştırmalı hatırlatır (bu durumda büyüklük
// hatası AYRICA anlatılmaz, kısa tutmak için — Kesim Noktası'ndaki AYNI task kararı).
export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);
  const trueDir = question.dbDelta >= 0 ? "up" : "down";

  if (result.correct) {
    return `${formatDb(question.dbDelta)} ${DIRECTION_WORD[trueDir]} — ${magnitudeWord(Math.abs(question.dbDelta))}.`;
  }

  if (!result.directionOk) {
    const guessDir = result.guessValue >= 0 ? "up" : "down";
    return `Ters yön — bu ses ${DIRECTION_WORD[trueDir].toUpperCase()}, sen ${DIRECTION_WORD[guessDir]} dedin. ${trueDir === "up" ? DIRECTION_EFFECT.up : DIRECTION_EFFECT.down}.`;
  }

  // directionOk && !correct
  return `${formatDb(result.guessValue)} dedin ama ${formatDb(question.dbDelta)}'ti — ${magnitudeWord(Math.abs(question.dbDelta))}, ${magnitudeWord(Math.abs(result.guessValue))}.`;
}

// getFeedbackData: teachingText'in gövdesini title/detail'e böler — panel BİLEREK
// yok (Kesim Noktası'yla AYNI, karşılaştırma-önizleme butonları ayrı bir iş),
// showResult:true (bu modun #freqInfo gibi zengin bir paneli yok, #feedbackBox TEK
// geri bildirim yüzeyi — Kesim Noktası'nın G20'de düzelttiği hatayı BAŞTAN doğru
// yaparak tekrarlamıyoruz).
export function getFeedbackData(question, answer, context = {}) {
  const result = evaluateAnswer(question, answer);
  const gained = context.gained || 0;
  const text = teachingText(question, answer);

  if (result.correct) {
    return { result, title: "Doğru!", detail: `${text} (+${gained} XP)`, showResult: true, panel: null };
  }
  const title = result.directionOk ? "Yakın ama kaçtı" : "Ters yöne gittin";
  return { result, title, detail: text, showResult: true, panel: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// SÖZLEŞMENİN DIŞINDA: bu moda özgü render/UI yardımcıları (opsiyonel, ama app.js'in
// PAYLAŞILAN oyun ekranı bunları "mode.X()" ile genel olarak çağırıyor — bkz.
// frekans-bulma.js'in aynı başlıklı bölümü).
// ═══════════════════════════════════════════════════════════════════════════

// İpucu: yönü açıkça söyler (Kesim Noktası'nın "bölge" ipucuyla AYNI seviyede kısmi
// yardım — tam cevabı değil, cevabın bir BOYUTUNU verir). directionRevealed zaten
// true olan sorularda bu bilgi zaten ekranda, hint burada gereksiz tekrar olur ama
// zararsız.
export function getHintText(question) {
  return question.dbDelta >= 0 ? "Açıldı (+)" : "Kısıldı (−)";
}

// Bu modda frekans-bandı ipucu maskesi kavramı yok (seviye değişimi tüm spektrumu
// eşit etkiler, tek bir bölgeye ait değil) — sadece metin ipucu (getHintText) yeterli,
// bkz. app.js:giveHint (hintTag'i zaten mode-agnostik günceller).
export function renderHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
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
// döner). data-db, app.js'in click-delegasyonunda answer={value} kurmak için okunur.
// Alt satır (span) her zaman yön KELİMESİNİ gösterir — bu bir ipucu SIZINTISI değil,
// zaten üstteki işaretli sayının (+/-) sözel karşılığı, ekstra bilgi taşımıyor.
export function renderAnswerChoices(answersEl, q) {
  if (!answersEl) return;
  if (!q.choices) { answersEl.innerHTML = ""; answersEl.classList.add("hidden"); return; }
  answersEl.className = "answers";
  answersEl.innerHTML = q.choices.map(c => {
    const dirWord = c.value >= 0 ? "Açıldı" : "Kısıldı";
    return `<button type="button" class="ans" data-db="${c.value}"><b>${formatDb(c.value)}</b><span>${dirWord}</span></button>`;
  }).join("");
}

// Cevap verildikten sonra .ans butonlarını doğru/yanlış/seçili olarak işaretler.
export function markAnswerChoices(answersEl, q, picked) {
  if (!answersEl || !q.choices) return;
  const pickedValue = picked && typeof picked === "object" ? picked.value : picked;
  Array.from(answersEl.querySelectorAll(".ans")).forEach(btn => {
    const v = Number(btn.dataset.db);
    btn.classList.remove("pick");
    btn.disabled = true;
    if (Math.abs(v - q.dbDelta) <= DB_TOLERANCE) btn.classList.add("right");
    else if (pickedValue != null && Math.abs(v - pickedValue) < 1e-9) btn.classList.add("wrong");
  });
}

// Paylaşılan frekans ekseni — Kesim Noktası'nın drawAxis'iyle AYNI (spektrum
// çubuklarının altında/arkasında aynı ölçekte dursun diye, bkz. app.js drawVisualizer
// HER modda mode.drawOverlay çağırır). Bu modun KENDİSİ frekans ekseni kullanmıyor
// ama paylaşılan spektrum görselinin altında tutarlı bir eksen kalsın diye çizilir.
const AXIS_TICKS = [100, 200, 400, 800, 1600, 3200, 6400, 12800];
function drawAxis(ctx2d, w, h) {
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

// G38: prototipteki #vizDb'ye (Dizayn/prototype.html) çevrilen İKİ DİKEY BAR görseli
// ("A · Referans" / "B · İşlenmiş"). -DB_RANGE..+DB_RANGE, eski yatay göstergeyle AYNI
// SABİT görsel ölçek (gerçek değerler bu aralıkta rahatça kalır, ölçek taşmaz).
const DB_RANGE = 5;

// SORU SIRASINDA (roundActive) her iki bar da REF_FRAC'te NÖTR duruyor — B barın
// yüksekliği gerçek dbDelta'ya göre değişseydi, mod'un directionRevealed mekaniğini
// (3. sorudan sonra yön BİLEREK gizlenir, bkz. dosya başı + createQuestion) görsel
// olarak deşifre ederdi. Kullanıcı ONAYIYLA netleşen karar: bar SADECE cevap
// SONRASI gerçek değerleri gösterir, soru sırasında ipucu vermez.
const REF_FRAC = 0.55;
const MAX_SWING_FRAC = 0.38;
const BAR_MIN_FRAC = 0.12;
const BAR_MAX_FRAC = 0.95;
const BAR_TOP_MARGIN = 34;
const BAR_LABEL_GAP = 8;
const BAR_LABEL_H = 20;

const REF_PALETTE = { container: "rgba(255,255,255,.05)", gradTop: "#9AA3B8", gradBottom: "#5A6377" };
const PROC_PALETTE = { container: "rgba(108,140,255,.1)", gradTop: "#8FA6FF", gradBottom: "#4E6BE0" };
const PROC_ANSWERED_PALETTE = { ...PROC_PALETTE, outline: CORRECT_COLOR };

function dbToBarFrac(db) {
  const clamped = Math.max(-DB_RANGE, Math.min(DB_RANGE, db));
  const frac = REF_FRAC + (clamped / DB_RANGE) * MAX_SWING_FRAC;
  return Math.max(BAR_MIN_FRAC, Math.min(BAR_MAX_FRAC, frac));
}

function roundedRectPath(ctx2d, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx2d.beginPath();
  ctx2d.moveTo(x + rr, y);
  ctx2d.lineTo(x + w - rr, y);
  ctx2d.arcTo(x + w, y, x + w, y + rr, rr);
  ctx2d.lineTo(x + w, y + h - rr);
  ctx2d.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx2d.lineTo(x + rr, y + h);
  ctx2d.arcTo(x, y + h, x, y + h - rr, rr);
  ctx2d.lineTo(x, y + rr);
  ctx2d.arcTo(x, y, x + rr, y, rr);
  ctx2d.closePath();
}

function drawBarBox(ctx2d, x, boxTop, boxW, boxH, fillFrac, palette) {
  ctx2d.fillStyle = palette.container;
  roundedRectPath(ctx2d, x, boxTop, boxW, boxH, 12);
  ctx2d.fill();
  ctx2d.save();
  roundedRectPath(ctx2d, x, boxTop, boxW, boxH, 12);
  ctx2d.clip();
  const fillH = Math.max(2, boxH * fillFrac);
  const fillY = boxTop + boxH - fillH;
  const grad = ctx2d.createLinearGradient(0, fillY, 0, boxTop + boxH);
  grad.addColorStop(0, palette.gradTop);
  grad.addColorStop(1, palette.gradBottom);
  ctx2d.fillStyle = grad;
  ctx2d.fillRect(x, fillY, boxW, fillH);
  ctx2d.restore();
  if (palette.outline) {
    ctx2d.strokeStyle = palette.outline;
    ctx2d.lineWidth = 2;
    roundedRectPath(ctx2d, x + 1, boxTop + 1, boxW - 2, boxH - 2, 11);
    ctx2d.stroke();
  }
}

// opts.answered=false → iki bar da REF_FRAC (nötr, soru sırasında). answered=true →
// A sabit referansta, B gerçek dbDelta'da (yeşil kontur = "doğru"); guessFrac verilmişse
// B'nin üstünde kesikli kırmızı çizgi + sayı ("senin cevabın") eklenir.
function drawDbBars(ctx2d, w, h, opts) {
  const plotBottom = h - AXIS_H;
  const boxTop = BAR_TOP_MARGIN;
  const boxH = Math.max(60, plotBottom - BAR_TOP_MARGIN - BAR_LABEL_GAP - BAR_LABEL_H);
  const gap = Math.min(28, w * 0.07);
  const boxW = Math.min(120, Math.max(50, (w - gap - 40) / 2));
  const totalW = boxW * 2 + gap;
  const startX = (w - totalW) / 2;
  const aX = startX;
  const bX = startX + boxW + gap;

  drawBarBox(ctx2d, aX, boxTop, boxW, boxH, opts.refFrac, REF_PALETTE);
  drawBarBox(ctx2d, bX, boxTop, boxW, boxH, opts.procFrac, opts.answered ? PROC_ANSWERED_PALETTE : PROC_PALETTE);

  const labelY = boxTop + boxH + BAR_LABEL_GAP + 14;
  ctx2d.font = "700 13px Inter, sans-serif";
  ctx2d.textAlign = "center";
  ctx2d.fillStyle = "#8C95AB";
  ctx2d.fillText("A · Referans", aX + boxW / 2, labelY);
  ctx2d.fillStyle = "#AFC0FF";
  ctx2d.fillText("B · İşlenmiş", bX + boxW / 2, labelY);
  ctx2d.textAlign = "left";

  if (!opts.answered) return;

  // Lejant (kırmızı=senin cevabın, yeşil=doğru) — G34'ten beri AYNI renkler/desen.
  let lx = 10;
  const ly = 16;
  const showGuess = opts.guessFrac != null;
  ctx2d.font = "700 12px Inter, sans-serif";
  if (showGuess) {
    ctx2d.fillStyle = GUESS_COLOR; ctx2d.fillText("●", lx, ly); lx += 12;
    ctx2d.fillStyle = "#C7CEDD"; ctx2d.fillText("Senin cevabın", lx, ly);
    lx += ctx2d.measureText("Senin cevabın").width + 16;
  }
  ctx2d.fillStyle = CORRECT_COLOR; ctx2d.fillText("●", lx, ly); lx += 12;
  ctx2d.fillStyle = "#C7CEDD"; ctx2d.fillText("Doğru", lx, ly);

  const trueY = boxTop + boxH - boxH * opts.procFrac;
  ctx2d.textAlign = "center";
  ctx2d.font = "800 13px 'JetBrains Mono', monospace";
  ctx2d.fillStyle = CORRECT_COLOR;
  ctx2d.fillText(formatDb(opts.trueValue), bX + boxW / 2, Math.max(trueY - 8, boxTop - 6));

  if (showGuess) {
    const guessY = boxTop + boxH - boxH * opts.guessFrac;
    ctx2d.save();
    ctx2d.setLineDash([4, 3]);
    ctx2d.strokeStyle = GUESS_COLOR;
    ctx2d.lineWidth = 2;
    ctx2d.beginPath(); ctx2d.moveTo(bX - 6, guessY); ctx2d.lineTo(bX + boxW + 6, guessY); ctx2d.stroke();
    ctx2d.restore();
    const closeToTrue = Math.abs(guessY - trueY) < 22;
    ctx2d.font = "800 12px 'JetBrains Mono', monospace";
    ctx2d.fillStyle = GUESS_COLOR;
    ctx2d.fillText(formatDb(opts.guessValue), bX + boxW / 2, closeToTrue ? guessY + 26 : guessY - 8);
  }
  ctx2d.textAlign = "left";
}

// state: { activeQuestion, roundActive, dbGuess } — dbGuess app.js'te
// submitLevelGuess'in kaydettiği KULLANICI cevabı, yeni soru başında null'a döner.
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  drawAxis(ctx2d, w, h);
  const { activeQuestion: q, roundActive, dbGuess } = state;
  if (!q) return;
  if (roundActive) {
    drawDbBars(ctx2d, w, h, { refFrac: REF_FRAC, procFrac: REF_FRAC, answered: false });
    return;
  }
  const guessValue = dbGuess != null ? dbGuess : null;
  drawDbBars(ctx2d, w, h, {
    refFrac: REF_FRAC,
    procFrac: dbToBarFrac(q.dbDelta),
    guessFrac: guessValue != null ? dbToBarFrac(guessValue) : null,
    trueValue: q.dbDelta,
    guessValue,
    answered: true
  });
}

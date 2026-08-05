// "Frekans Bulma" modu — mevcut (tek/çok bantlı) EQ ear-training oyununun izole
// edilmiş hâli. Mod sözleşmesi: getMeta, createQuestion, applyProcessing,
// evaluateAnswer, calculateXP, getFeedbackData (bkz. README niteliğindeki yorumlar
// altta). createQuestion ve evaluateAnswer SAF fonksiyondur: ses çalmaz, DOM'a
// dokunmaz, sadece veri üretir/değerlendirir.
//
// Kontratın 6 fonksiyonunun ÜSTÜNE, bu modun kendine özgü dalga-tıklama arayüzünü
// (canvas eksen/EQ eğrisi çizimi, ipucu maskesi, bant-bilgi paneli) çalıştırmak için
// birkaç EK (opsiyonel) yardımcı fonksiyon daha dışa açılır. Bunlar sözleşmenin
// parçası değildir — sadece bu modun app.js tarafından nasıl render edileceğini
// tarif eder. Gelecekteki modların böyle bir arayüze ihtiyacı olmayabilir.

import { logFreq, shuffle, formatHz, hexToRgba } from "../core/utils.js";
import { personalizedRange } from "../core/personalization.js";
import { logLerp, applyPostCapFloor } from "../core/difficulty-curve.js";

export const MODE_ID = "frekans-bulma";

// hintBandOct: ipucu maskesinde doğru bandın etrafında AÇIK bırakılan tam genişlik
// (oktav). Kolayda geniş (bulması kolay), zorda dar (yine de zorlayıcı).
//
// MAX_LIVES: can sayısı zorluğa göre değişmez — tek bir sabitten üretilir (kalp
// ızgarası da bu sayıyı kullanır, bkz. app.js renderHearts).
export const MAX_LIVES = 5;
export const DIFFICULTY = {
  easy: { label: "Kolay", gain: 10, q: 0.9, xp: 16, options: 3, time: 16, lives: MAX_LIVES, hintBandOct: 2.4 },
  medium: { label: "Orta", gain: 8, q: 1.3, xp: 24, options: 4, time: 13, lives: MAX_LIVES, hintBandOct: 1.6 },
  hard: { label: "Zor", gain: 6, q: 2.5, xp: 36, options: 5, time: 11, lives: MAX_LIVES, hintBandOct: 1.0 },
  pro: { label: "Pro", gain: 4.5, q: 4.2, xp: 52, options: 6, time: 9, lives: MAX_LIVES, hintBandOct: 0.6 },
  proplus: { label: "Pro Plus (Çok Bantlı)", gain: 8, q: 3.2, xp: 45, options: 4, time: 20, lives: MAX_LIVES, hintBandOct: 1.0 }
};

// Şıklı cevap modunda çeldiricilerin doğru cevaptan oktav cinsinden minimum
// mesafesi. evaluateAnswer'daki doğruluk toleransı (dOct <= 0.5) burada SERT bir
// alt sınır — bu değerler her zaman 0.5'in üstünde kalmalı, yoksa "yanlış" bir
// şıkka basmak evaluateAnswer'da yine "doğru" sayılır. hintBandOct'un pro'daki
// değeri (0.6) bu sınıra çok yakın olduğu için ayrı bir sabit tanımlandı — doğrudan
// hintBandOct'tan türetilmedi.
export const DISTRACTOR_STEP_OCT = { easy: 1.2, medium: 0.9, hard: 0.75, pro: 0.65 };

// ═══════════════════════════════════════════════════════════════════════════
// ZORLUK EĞRİSİ (ADIM 2 — zorluk sisteminin merkezi bağlanması, Kesim Noktası'nın
// ADIM 1'de kurduğu AYNI desen). Yukarıdaki statik DIFFICULTY tablosu KALDIRILMADI
// (geriye dönük uyumluluk + "Sabit" modun çapası + proplus için hâlâ gerekli, bkz.
// core/difficulty-curve.js dosya başı not) — YANINA FREKANS_CURVE_CONFIG +
// paramsForDifficultyPosition eklendi.
//
// AT_1'ler statik easy değerleriyle BİREBİR aynı seçildi (Kesim Noktası'nda
// kullanılan AYNI kalibrasyon yöntemi). AT_CAP'lar ARTIK statik pro'yla BİREBİR
// AYNI DEĞİL — bkz. kesim-noktasi.js:KESIM_CURVE_CONFIG'in "AT_CAP KALİBRASYONU"
// notuyla AYNI gerekçe: representativeLevelForTier artık her tier'ı KENDİ üst
// sınırında (easy=4, medium=8, hard=12, pro=LEVEL_CAP) değerlendiriyor, salt
// AT_CAP=eski-pro ile ARADA (özellikle hard'da) eski statikten KOLAY çıkıyordu
// (bkz. ADIM 2 sonrası DURUM.md'deki ilk karşılaştırma tablosu). Bu ADIM'da
// AT_CAP'lar, hiçbir tier eskisinden kolay olmayacak (eşit ya da zor) şekilde
// yeniden çözüldü — bkz. DURUM.md'deki YENİ karşılaştırma tablosu. KULAKLA
// DOĞRULANMALI. Q, Z1'in ORİJİNAL asimetrisiyle AYNI: tavandan (LEVEL_CAP)
// SONRA SABİT kalır (bkz. difficulty-curve.js: difficultyParams — "tavandan SONRA
// hassasiyet (gain/Q/tolerans) SABİT kalır, sadece gain/süre bağlam zorluğuyla
// azalır") — bu yüzden Q için applyPostCapFloor ÇAĞRILMAZ, gainDb/timeSec/
// hintBandOct/distractorStepOct için çağrılır.
export const FREKANS_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  // AT_CAP KALİBRASYONU: eski pro (4.5) yerine 3.8 — representativeLevelForTier
  // ("hard")=12'de eğrinin eski hard'ı (6) AŞMAMASI için gereken en gevşek tavan
  // ~4.14'tü (hesaplandı, bkz. commit mesajı), 3.8 güvenlik payı bırakıyor.
  GAIN_DB_AT_1: 10,   // DIFFICULTY.easy.gain
  GAIN_DB_AT_CAP: 3.8,
  GAIN_DB_FLOOR: 1.5,
  GAIN_DB_REDUCTION_PER_STEP: 0.15,

  // AT_CAP KALİBRASYONU: eski pro (4.2) yerine 5.5 — hard=12'de eski hard'ı
  // (2.5) ALTINDA KALMAMASI için gereken en gevşek tavan ~5.26'ydı, 5.5 güvenlik
  // payı bırakıyor (Q'da BÜYÜK=ZOR, bu yüzden diğerlerinin tersine YUKARI ayarlandı).
  Q_AT_1: 0.9,  // DIFFICULTY.easy.q
  Q_AT_CAP: 5.5, // tavandan sonra SABİT (bkz. yukarıdaki not)

  // AT_CAP KALİBRASYONU: eski pro (9) yerine 8.0 (hesaplanan en gevşek tavan ~8.38).
  TIME_SEC_AT_1: 16,  // DIFFICULTY.easy.time
  TIME_SEC_AT_CAP: 8,
  TIME_SEC_FLOOR: 5,
  TIME_SEC_REDUCTION_PER_STEP: 0.2,

  // AT_CAP KALİBRASYONU: eski pro (0.6) yerine 0.48 (hesaplanan en gevşek tavan ~0.529).
  HINT_BAND_OCT_AT_1: 2.4,  // DIFFICULTY.easy.hintBandOct
  HINT_BAND_OCT_AT_CAP: 0.48,
  HINT_BAND_OCT_FLOOR: 0.3,
  HINT_BAND_OCT_REDUCTION_PER_STEP: 0.02,

  // DISTRACTOR_STEP_OCT'un eğri hali — AT_CAP KALİBRASYONU: eski pro (0.65)
  // yerine 0.52 (Kesim Noktası'yla AYNI hesap, aynı eski tablo). FLOOR de
  // BİRLİKTE indirildi (0.55→0.51) — AT_CAP'in ALTINDA kalması gerekiyordu;
  // 0.51 hâlâ evaluateAnswer'ın 0.5 oktavlık toleransından HER ZAMAN büyük
  // (invaryant KIRILMADI, sadece güvenlik payı 0.05'ten 0.01'e daraldı).
  STEP_OCT_AT_1: 1.2,  // DISTRACTOR_STEP_OCT.easy
  STEP_OCT_AT_CAP: 0.52,
  STEP_OCT_FLOOR: 0.51,
  STEP_OCT_REDUCTION_PER_STEP: 0.002,

  // AT_CAP KALİBRASYONU: 6→6.15 — round(logLerp(...)) hard=12'de TAM 5'e (eski
  // hard) ulaşsın diye (6 ile 4'e yuvarlanıyordu). Son değer yine
  // Math.min(6,...) ile kırpılıyor, oyuna hiçbir zaman 6'dan fazla şık yansımaz.
  OPTIONS_AT_1: 3,
  OPTIONS_AT_CAP: 6.15
};

// SAF FONKSİYON. position: zorlukKonumu (continuousLevel + sessionRampOffset,
// bkz. app.js currentDifficultyPosition) — Kesim Noktası'nın paramsForDifficultyPosition'ıyla
// AYNI mod-agnostik girdi, AYNI merkezi logLerp/applyPostCapFloor'u KENDİ sayılarıyla
// çağırır. boss'un etkisi BURADA DEĞİL — position'ın KENDİSİ zaten app.js'te
// sessionRampOffset(...,{boss}) ile yükseltilmiş gelir (çifte ceza olmasın diye,
// Kesim Noktası'yla AYNI kural).
export function paramsForDifficultyPosition(position, config = FREKANS_CURVE_CONFIG) {
  const safePos = Math.max(1, position);
  const cappedPos = Math.min(safePos, config.LEVEL_CAP);
  const t = config.LEVEL_CAP > 1 ? (cappedPos - 1) / (config.LEVEL_CAP - 1) : 1;

  const gainCurve = logLerp(config.GAIN_DB_AT_1, config.GAIN_DB_AT_CAP, t);
  const timeCurve = logLerp(config.TIME_SEC_AT_1, config.TIME_SEC_AT_CAP, t);
  const hintCurve = logLerp(config.HINT_BAND_OCT_AT_1, config.HINT_BAND_OCT_AT_CAP, t);
  const stepCurve = logLerp(config.STEP_OCT_AT_1, config.STEP_OCT_AT_CAP, t);
  const optionsCurve = logLerp(config.OPTIONS_AT_1, config.OPTIONS_AT_CAP, t);

  return {
    position: safePos,
    gainDb: applyPostCapFloor(gainCurve, safePos, config.LEVEL_CAP, config.GAIN_DB_FLOOR, config.GAIN_DB_REDUCTION_PER_STEP),
    q: logLerp(config.Q_AT_1, config.Q_AT_CAP, t), // tavandan sonra SABİT (applyPostCapFloor çağrılmıyor)
    timeSec: applyPostCapFloor(timeCurve, safePos, config.LEVEL_CAP, config.TIME_SEC_FLOOR, config.TIME_SEC_REDUCTION_PER_STEP),
    hintBandOct: applyPostCapFloor(hintCurve, safePos, config.LEVEL_CAP, config.HINT_BAND_OCT_FLOOR, config.HINT_BAND_OCT_REDUCTION_PER_STEP),
    distractorStepOct: applyPostCapFloor(stepCurve, safePos, config.LEVEL_CAP, config.STEP_OCT_FLOOR, config.STEP_OCT_REDUCTION_PER_STEP),
    options: Math.max(3, Math.min(6, Math.round(optionsCurve)))
  };
}

// SAF FONKSİYON. correctFreq etrafında (options-1) çeldirici üretir, hepsini
// karıştırıp döndürür — her eleman { freq, correct }. proplus için kullanılmaz
// (4 bandı aynı anda işaretlemek şıklı tek-seçim arayüzüne uymuyor, dokunmalı kalır).
//
// Çeldiriciler TAM k*step oktav mesafede üretilir (k>=1 tam sayı) — range'e hiç
// KIRPMA yapılmaz. Kırpma yapılsaydı (örn. correctFreq alt sınıra çok yakınken bir
// çeldirici sınıra yapıştırılsaydı) o çeldirici DISTRACTOR_STEP_OCT'tan çok daha yakın
// düşüp evaluateAnswer'ın 0.5 oktavlık tolerans sınırının içine sızabilirdi. Bunun
// yerine hangi tarafta (aşağı/yukarı) kaç tam adımlık yer olduğu hesaplanır, iki
// taraftan sırayla en yakın müsait adım kullanılır.
//
// range: [min, max] — varsayılan tüm spektrum (FA_MIN–FA_MAX, ~7.7 oktav), bu modun
// en büyük ihtiyacından (pro: 5 çeldirici × 0.65 oktav = en çok 3.25 oktav tek taraflı)
// kat kat geniş olduğu için taraflardan biri her zaman yeterli yer bulur. Odak
// aralığıyla (bkz. FOCUS_RANGES) çağrıldığında range çok daha dar olabilir (Bas/Orta
// ~2.3 oktav) — üst zorluklarda istenen şık sayısı için geometrik olarak yeterli yer
// olmayabilir. Bu durumda count, iki taraftan toplam üretilebilecek MAKSİMUMLA
// sınırlanır (en az 2: doğru cevap + 1 çeldirici) — aksi halde fonksiyon sessizce
// diff.options'tan az eleman döndürüp UI'da tutarsız bir şık sayısına yol açardı.
// ADIM 2: `level` string yerine ÇÖZÜLMÜŞ {options, step} alıyor (Kesim Noktası'ndaki
// AYNI refactor) — createQuestion ister statik DIFFICULTY[level]'den ister
// paramsForDifficultyPosition()'dan doldurup buraya geçiriyor.
export function generateChoices(correctFreq, resolved, range = [FA_MIN, FA_MAX]) {
  const step = resolved.step;
  const correctOct = Math.log2(correctFreq);
  const minOct = Math.log2(range[0]), maxOct = Math.log2(range[1]);
  const maxBelow = Math.max(0, Math.floor((correctOct - minOct) / step));
  const maxAbove = Math.max(0, Math.floor((maxOct - correctOct) / step));
  const count = Math.max(2, Math.min(resolved.options, maxBelow + maxAbove + 1));

  const offsetsOct = [];
  let below = 1, above = 1;
  while (offsetsOct.length < count - 1 && (below <= maxBelow || above <= maxAbove)) {
    if (above <= maxAbove) offsetsOct.push(above++ * step);
    if (offsetsOct.length >= count - 1) break;
    if (below <= maxBelow) offsetsOct.push(-(below++) * step);
  }
  const freqs = [correctFreq, ...offsetsOct.map(o => correctFreq * Math.pow(2, o))];
  const choices = freqs.map(f => ({ freq: f, correct: f === correctFreq }));
  return shuffle(choices);
}

// Kolay/Orta'da EQ değişimi sadece boost (pozitif gain) olsun — dar bir kesim komşu
// bandın yükselmiş gibi duyulmasına yol açıp yeni başlayanı kafa karıştırıyor.
export const BOOST_ONLY_DIFFICULTIES = new Set(["easy", "medium"]);

// --- Frekans bölgesi bilgileri — cevap sonrası öğretici ipucu ---
// BAS eskiden 120–500 Hz'i tek bölge olarak kapsıyordu; ALT-ORTA eklenirken ikiye
// bölündü (120–250 / 250–500). BAS'ın "200–400 Hz birikirse çamur" ipucu artık
// ALT-ORTA'yı tarif ediyordu, bu yüzden BAS'ın metni de 120–250 Hz'e göre yeniden
// yazıldı — sadece sınır kaydırılıp eski metin bırakılsaydı yanlış bilgi olurdu.
export const FA_ZONES = [
  { a: 20, b: 120, t: "SUB (20–120 Hz)", tip: "Gövde ve güç. Kick ve bas burada yaşar. Yükseltince ağırlık/derinlik gelir; fazlası çamur ve boğukluk, azı cılızlık yapar." },
  { a: 120, b: 250, t: "BAS (120–250 Hz)", tip: "Sıcaklık ve doluluk. Bas ve kick'in temel gövdesi burada oturur. Yükseltmek sesi ısıtır ve kalınlaştırır; fazlası ağırlaşır, azı ince ve zayıf kalır." },
  { a: 250, b: 500, t: "ALT-ORTA (250–500 Hz)", tip: "Doluluk ve gövde. Birikirse 'çamur' hissi verir; mix'te en çok kesilen aralıklardan biri. Yükseltmek sesi kalınlaştırır, kesmek temizler ve açar." },
  { a: 500, b: 2000, t: "ORTA (500 Hz–2 kHz)", tip: "Enstrümanların gövdesi ve vokal netliği. 800 Hz–1 kHz fazlaysa 'kutu / telefon' sesi olur. Kesmek açar, yükseltmek öne çıkarır ama abartısı burun sesi yapar." },
  { a: 2000, b: 8000, t: "ÜST-ORTA (2–8 kHz)", tip: "Netlik, atak, sertlik. Kulağın en hassas bölgesi (2–4 kHz). Yükseltmek anlaşılırlık ve parlaklık katar; fazlası yorucu ve batıcı olur, tıslama artar." },
  { a: 8000, b: 20000, t: "TİZ / HAVA (8–20 kHz)", tip: "Parlaklık ve hava. Yükseltmek açıklık ve 'pahalı' his verir; azı boğuk, fazlası tiz ve cırtlak. Vokale hava burada eklenir." }
];

export function faZoneOf(f) {
  return FA_ZONES.find(z => f >= z.a && f < z.b) || FA_ZONES[FA_ZONES.length - 1];
}

// İpucu chip'inde gösterilecek kısa bölge adı (FA_ZONES'un uzun tip metninden bağımsız).
const HINT_ZONE_SHORT = { SUB: "Sub bas", BAS: "Bas", "ALT-ORTA": "Alt-orta", ORTA: "Orta", "ÜST-ORTA": "Üst-orta", "TİZ / HAVA": "Tiz" };
export function hintZoneLabel(freq) {
  const zone = faZoneOf(freq);
  return HINT_ZONE_SHORT[zone.t.split(" (")[0]] || zone.t.split(" (")[0];
}

// --- wave üzerine tıklayarak tahmin: eksen sabitleri ---
// FA_MIN/FA_MAX, createQuestion()/buildProPlusBands()'teki GERÇEK soru havuzuyla
// (logFreq(80, 17000)) birebir eşleşir.
export const FA_MIN = 80, FA_MAX = 17000;

// Odak aralığı (prototype.html: focusChip/focusSheet) — soruyu ve cevap şıklarını
// FA_MIN–FA_MAX'ın bir alt kümesine sınırlar. createQuestion'a settings.focusRange
// olarak geçilir; verilmezse tüm spektrum kullanılır (mevcut testlerin FA_MIN–FA_MAX
// beklentisiyle geriye dönük uyumlu). Sınırlar FA_MIN/FA_MAX'a kenetlenir — prototipin
// "50 Hz" / "16 kHz" gibi yuvarlak sayıları burada kullanılmadı, çünkü eksen çizimi
// (faXToF/faFToX) ve çeldirici üretimi FA_MIN/FA_MAX'ın DIŞINA hiç çıkmıyor; "Bas"ı
// 50 Hz'den başlatmak üretilen frekansı ekseninin sol kenarının dışına düşürebilirdi.
export const FOCUS_RANGES = {
  full: { id: "full", label: "Tüm spektrum", desc: `${FA_MIN} Hz – ${Math.round(FA_MAX / 1000)} kHz`, range: [FA_MIN, FA_MAX] },
  bass: { id: "bass", label: "Bas", desc: `${FA_MIN} – 400 Hz · gövde ve çamur bölgesi`, range: [FA_MIN, 400] },
  mid: { id: "mid", label: "Orta", desc: "400 Hz – 2 kHz · vokal ve enstrüman gövdesi", range: [400, 2000] },
  high: { id: "high", label: "Tiz", desc: `2 – ${Math.round(FA_MAX / 1000)} kHz · sertlik, hava ve tıslama`, range: [2000, FA_MAX] }
};

// FA_ZONES analiz bölgesini (İlerleme sekmesi / "Bugünün Önerisi") en yakın odak
// aralığına eşler — elle yazılmış bir tablo yerine bölgenin (log ölçekte) orta
// frekansının hangi FOCUS_RANGES aralığına düştüğü hesaplanır. Yeni bir FA_ZONES veya
// FOCUS_RANGES sınırı eklendiğinde tablo bayatlamaz, otomatik doğru kalır.
export function focusIdForZone(zoneKey) {
  const zone = FA_ZONES.find(z => z.t.split(" (")[0] === zoneKey);
  if (!zone) return "full";
  const mid = Math.sqrt(zone.a * zone.b);
  const candidates = Object.values(FOCUS_RANGES).filter(f => f.id !== "full");
  const hit = candidates.find(f => mid >= f.range[0] && mid <= f.range[1]);
  return hit ? hit.id : "full";
}

export const faXToF = (x, w) => FA_MIN * Math.pow(FA_MAX / FA_MIN, x / w);
export const faFToX = (f, w) => w * Math.log(f / FA_MIN) / Math.log(FA_MAX / FA_MIN);
const FA_TICKS_ALL = [100, 200, 400, 800, 1600, 3200, 6400, 12800];
// app.js'in spektrum çubuklarını eksen şeridiyle hizalayabilmesi için dışa açık
// (bkz. drawVisualizer: barlar AXIS_H kadar üstte durur, eksen etiketleri altta kalır).
export const AXIS_H = 50;
const AXIS_FONT_PX = 14;
// Bu boyutlar/konumlar CSS-piksel çizim uzayında (bkz. app.js resizeCanvas) — dar
// telefon panellerinde bile okunaklı ama paneli işgal etmeyecek ölçüde küçük tutulur.
// Tahmin ("sen") ve doğru cevap etiketleri her zaman FARKLI satırlarda çizilir
// (biri üstte, biri altta) — yatay olarak ne kadar yakın olurlarsa olsunlar asla
// üst üste binmezler (bkz. drawOverlay tek-bant bloğu).
const LABEL_FONT_PX = 15;
const GUESS_LABEL_Y = 22;
const ANSWER_LABEL_Y = 48;
// app.js'in spektrum çubuklarını EQ eğrisi/etiket şeridiyle aynı bölgede tutabilmesi
// için dışa açık (bkz. drawSpectrumBars: çubuklar bu çizginin ÜSTÜNE taşmaz).
export const CURVE_TOP = 88;
// Geriye dönük uyumluluk: proplus reveal etiketleri "üst satır" için bunu kullanır.
const LABEL_Y = GUESS_LABEL_Y;

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

// ad/aciklama BİLEREK yok — kart başlığı/açıklaması yalnızca core/mode-catalog.js'ten
// okunur (tek görüntü kaynağı). getMeta() sadece oyun mantığının ihtiyaç duyduğu
// meta'yı döndürür (id/motor/kulaklikGerekli/uyumluKaynaklar/ucretsiz/videoUrl/difficulty).
export function getMeta() {
  return {
    id: MODE_ID,
    motor: 1,
    kulaklikGerekli: true,
    uyumluKaynaklar: ["pink", "white", "saw", "square", "triangle", "upload"],
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY
  };
}

export function isBossRound(roundsCompleted) {
  return (roundsCompleted + 1) % 5 === 0;
}

// Pro Plus için birbirinden ayrık `count` bant üret (frekanslar üst üste binmesin).
// range: [min, max] — varsayılan tüm spektrum. Dar bir odak aralığında (bkz.
// FOCUS_RANGES) `count` bandı ~0.9 oktav aralıkla sığdırmak için yeterli yer
// olmayabilir (Bas/Orta ~2.3 oktav, 4 bant için ~2.7 oktav gerekir) — bu durumda
// 200 deneme sonunda `count`'tan az bant dönebilir; bu bilerek böyle bırakıldı
// (dar aralıkla dörtten az bant, çakışan/ayırt edilemez dört banttan iyidir) ve
// createQuestion çağıranı buna göre `bands.length` okur.
export function buildProPlusBands(count, gainAbs, range = [FA_MIN, FA_MAX]) {
  const bands = [];
  let tries = 0;
  while (bands.length < count && tries < 200) {
    tries++;
    const f = logFreq(range[0], range[1]);
    // en az ~0.9 oktav aralık bırak ki ayırt edilebilsin
    if (bands.some(b => Math.abs(Math.log2(f / b.freq)) < 0.9)) continue;
    const sign = Math.random() > 0.5 ? 1 : -1;
    bands.push({ freq: f, gain: gainAbs * sign, q: 3.2, matched: false });
  }
  bands.sort((a, b) => a.freq - b.freq);
  return bands;
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz — sadece veri üretir (zoneStats/rng birer
// VERİ/enjekte-edilebilir fonksiyon parametresi, dış duruma dokunmaz — saflık bozulmaz).
// level: DIFFICULTY anahtarlarından biri ("easy" | "medium" | "hard" | "pro" | "proplus")
// settings: { source: "pink"|"white"|"saw"|"square"|"triangle"|"upload", boss: boolean,
//             focusRange: [min, max] — bkz. FOCUS_RANGES, verilmezse tüm spektrum,
//             zoneStats — Z4: verilirse SADECE tek-bant "frequency" modunda test edilen
//             frekans zayıf bölgelere doğru ağırlıklanır (proplus'ın çok-bantlı üretimi
//             KAPSAM DIŞI bırakıldı — bkz. personalization.js yorumu); ÇELDİRİCİLER
//             (generateChoices) HER ZAMAN tam focusRange kullanır, daralmış kişisel
//             aralığı DEĞİL — aksi hâlde şıklar zayıf bölgeye sıkışıp doğru cevabı
//             fazla belli ederdi. rng — test edilebilirlik, verilmezse Math.random. }
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "pink";
  const range = settings.focusRange || [FA_MIN, FA_MAX];

  // ---- PRO PLUS: 4 bant, sadece frekans işaretleme ----
  if (level === "proplus") {
    const gainAbs = boss ? diff.gain * 0.85 : diff.gain;
    const bands = buildProPlusBands(4, Math.max(6, gainAbs), range);
    return {
      mode: "proplus",
      difficulty: level,
      bands,
      guesses: [],
      source, hintUsed: false, boss
    };
  }

  // ADIM 2: settings.difficultyPosition varsa (app.js'in gerçek oyun akışı HER ZAMAN
  // verir, proplus hariç — bkz. app.js currentDifficultyPosition) gain/q/hintBandOct/
  // options/step EĞRİDEN gelir; yoksa (mevcut testler, doğrudan çağrılar) eski statik
  // DIFFICULTY[level] davranışı BİREBİR korunur (Kesim Noktası'ndaki AYNI kural).
  const curve = Number.isFinite(settings.difficultyPosition)
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  const resolvedGain = curve ? curve.gainDb : (boss ? diff.gain * 0.75 : diff.gain);
  const resolvedQ = curve ? curve.q : (boss ? diff.q * 1.35 : diff.q);
  const resolvedTimeSec = curve ? curve.timeSec : diff.time;
  const resolvedHintBandOct = curve ? curve.hintBandOct : diff.hintBandOct;
  const resolvedChoiceParams = curve
    ? { options: curve.options, step: curve.distractorStepOct }
    : { options: diff.options, step: DISTRACTOR_STEP_OCT[level] || DISTRACTOR_STEP_OCT.medium };

  // ---- FREKANS (tek bant) ----
  const personalizedFreqRange = settings.zoneStats
    ? personalizedRange(settings.zoneStats, FA_ZONES, range, settings.rng)
    : range;
  const freq = logFreq(personalizedFreqRange[0], personalizedFreqRange[1]);
  // Kolay/Orta'da sadece boost (kesim yok) — dar bir kesim komşu bandın yükselmiş gibi
  // duyulmasına yol açıp yeni başlayanı kafa karıştırıyor. Zor ve üstünde ikisi de var.
  // Bu, TİER İSMİNE bağlı (isim/çapa) kalitatif bir kural — eğri/statik ayrımından
  // BAĞIMSIZ, sürekliye çevrilmedi (bkz. dosya başı ADIM 2 notu, madde 5).
  const gainSign = BOOST_ONLY_DIFFICULTIES.has(level) ? 1 : (Math.random() > 0.5 ? 1 : -1);
  const gain = resolvedGain * gainSign;
  const q = resolvedQ;

  return {
    mode: "frequency",
    difficulty: level,
    filterType: "peaking",
    filterLabel: "Bell",
    freq,
    gain,
    q,
    source,
    hintUsed: false,
    boss,
    // ADIM 1'deki (kesim-noktasi.js) AYNI desen — renderHintMask artık DIFFICULTY[level]
    // yerine BUNA bakabilir.
    hintBandOct: resolvedHintBandOct,
    timeSec: resolvedTimeSec,
    // Şıklı cevap modu bunu kullanır; dokunmalı modda görmezden gelinir — ikisi de
    // aynı soru nesnesini okur, giriş biçimi farkı sadece UI katmanındadır.
    choices: generateChoices(freq, resolvedChoiceParams, range)
  };
}

export function modeDescription(q) {
  if (q.mode === "proplus") {
    return `A/B ile karşılaştır: 4 frekansla oynandı (kimi açık, kimi kısık). Dört noktayı da işaretle.`;
  }
  return `A/B ile karşılaştır, farkın en belirgin olduğu frekansı dalga üzerinde işaretle.`;
}

export function correctLabel(q) {
  if (q.mode === "proplus") return "4 bant";
  return formatHz(q.freq);
}

// Soruda uygulanan peaking filtre(leri) audioCtx üzerinde kurar. Ses zinciri BURADA
// devreye girer (audio-engine.js bu filtreleri sourceMix→...→compressor arasına bağlar).
export function applyProcessing(question, { audioCtx }) {
  const filters = [];
  if (question.mode === "proplus" && question.bands) {
    question.bands.forEach(b => {
      const f = audioCtx.createBiquadFilter();
      f.type = "peaking";
      f.frequency.value = b.freq;
      f.Q.value = b.q;
      f.gain.value = b.gain;
      filters.push(f);
    });
  } else {
    const f = audioCtx.createBiquadFilter();
    f.type = "peaking";
    f.frequency.value = question.freq;
    f.Q.value = question.q;
    f.gain.value = question.gain;
    filters.push(f);
  }
  return { filters };
}

// SAF FONKSİYON: sadece hesap yapar.
// answer: "frequency" modunda tek bir Hz sayısı; "proplus" modunda Hz dizisi (guesses).
// Dönen sonuç nesnesi getFeedbackData ve calculateXP tarafından tekrar kullanılır.
export function evaluateAnswer(question, answer) {
  if (question.mode === "proplus") {
    const bands = question.bands.map(b => ({ ...b, matched: false, guessHz: null, dOct: null }));
    const guesses = Array.isArray(answer) ? answer.slice() : [];
    guesses.forEach(gHz => {
      let bi = -1, best = Infinity;
      bands.forEach((b, i) => {
        if (b.matched) return;
        const d = Math.abs(Math.log2(gHz / b.freq));
        if (d < best) { best = d; bi = i; }
      });
      if (bi >= 0) { bands[bi].matched = true; bands[bi].guessHz = gHz; bands[bi].dOct = best; }
    });

    let hit = 0;
    bands.forEach(b => {
      b.correct = b.dOct !== null && b.dOct <= 0.5;
      if (b.correct) hit++;
    });
    const allOk = hit === bands.length;

    return {
      mode: "proplus",
      correct: hit >= 3,
      allOk,
      hit,
      bandCount: bands.length,
      bands
    };
  }

  const guessHz = answer;
  const dOct = Math.abs(Math.log2(guessHz / question.freq));
  const ok = dOct <= 0.5; // yarım oktav içi = doğru
  const zone = faZoneOf(question.freq);
  const act = question.gain >= 0 ? "yükseltildi ▲" : "kesildi ▼";
  const dir = guessHz > question.freq ? "daha tiz seçtin" : "daha pes seçtin";
  const quality = dOct <= 0.17 ? "🎯 Tam isabet!" : (dOct <= 0.33 ? "Çok iyi!" : "Doğru!");

  return { mode: "frequency", correct: ok, dOct, zone, act, dir, quality, guessHz };
}

// context: { combo, timeLeft, roundDuration, xpMultiplier } — round-flow/challenge
// tarafından yürütülen ANLIK durum. Bu değerler soru nesnesinin bir parçası DEĞİLDİR
// (dolayısıyla createQuestion'da yer almazlar); XP formülü tur içi combo/süre/bölüm
// çarpanına bağlı olduğu için burada ayrı parametre olarak alınır.
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

  if (question.mode === "proplus") {
    const ratio = result.hit / result.bandCount;
    return Math.max(0, Math.round(raw * ratio * 1.5));
  }
  return Math.max(0, raw);
}

// context: { gained } — calculateXP çıktısı (metinde "+N XP" göstermek için gerekir,
// bu yüzden çağrı sırası her zaman evaluateAnswer → calculateXP → getFeedbackData'dır).
export function getFeedbackData(question, answer, context = {}) {
  const result = evaluateAnswer(question, answer);
  const gained = context.gained || 0;

  if (result.mode === "proplus") {
    if (result.correct) {
      return {
        result,
        title: result.allOk ? "🎯 Dördü de doğru!" : `İyi! ${result.hit}/4 doğru`,
        detail: `+${gained} XP kazandın.`,
        showResult: true,
        panel: { ok: true, hit: result.hit, bands: result.bands }
      };
    }
    return {
      result,
      title: "Kaçtı — ama öğren:",
      detail: `${result.hit}/4 doğru. Aşağıda dört bandın yerini gör.`,
      showResult: true,
      panel: { ok: false, hit: result.hit, bands: result.bands }
    };
  }

  if (result.correct) {
    return {
      result,
      title: result.quality,
      detail: `${formatHz(question.freq)} ${result.act} · ${result.zone.t}. ${result.zone.tip} (+${gained} XP)`,
      showResult: true,
      panel: {
        ok: true,
        color: "var(--gr)",
        head: `✅ ${formatHz(question.freq)} ${result.act} · +${gained} XP`,
        zone: result.zone,
        guessHz: result.guessHz
      }
    };
  }
  const closeness = closenessWord(result.dOct);
  return {
    result,
    title: "Kaçtı — ama öğren:",
    detail: `Doğru ${formatHz(question.freq)} ${result.act}, sen ${formatHz(result.guessHz)} dedin (${result.dOct.toFixed(2)} oktav, ${closeness} — ${result.dir}). ${result.zone.t}: ${result.zone.tip}`,
    showResult: true,
    panel: {
      ok: false,
      color: "var(--rd)",
      head: `❌ Doğru: ${formatHz(question.freq)} ${result.act} · sen ${formatHz(result.guessHz)} dedin (${closeness}, ${result.dir})`,
      zone: result.zone,
      guessHz: result.guessHz
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SÖZLEŞMENİN DIŞINDA: bu moda özgü render/UI yardımcıları (opsiyonel).
// Sözleşmenin 6 fonksiyonu bunlara bağımlı DEĞİLDİR; app.js bu modu ekrana
// dökebilmek için ayrıca bunları kullanır.
// ═══════════════════════════════════════════════════════════════════════════

export function getHintText(question) {
  const centers = question.mode === "proplus" && question.bands
    ? question.bands.map(b => b.freq)
    : [question.freq];
  return centers.map(hintZoneLabel).join(" / ");
}

// dOct (Z4): tahminin doğru frekanstan oktav cinsinden sapması (evaluateAnswer'dan) —
// opsiyonel, verilmezse sadece n/ok güncellenir (geriye dönük uyumlu, eski çağıranlar
// bozulmaz). Bölge bazlı zayıflık skoru (core/personalization.js) hem isabet oranını
// (ok/n) hem ortalama sapmayı (sumDOct/dOctCount) kullanır.
export function recordZone(zoneStats, freq, correct, dOct = null) {
  const z = FA_ZONES.find(zz => freq >= zz.a && freq < zz.b);
  if (!z) return zoneStats;
  const key = z.t.split(" (")[0];
  zoneStats[key] = zoneStats[key] || { n: 0, ok: 0, sumDOct: 0, dOctCount: 0 };
  zoneStats[key].n++;
  if (correct) zoneStats[key].ok++;
  if (typeof dOct === "number" && Number.isFinite(dOct)) {
    zoneStats[key].sumDOct = (zoneStats[key].sumDOct || 0) + dOct;
    zoneStats[key].dOctCount = (zoneStats[key].dOctCount || 0) + 1;
  }
  return zoneStats;
}

// Kişisel analiz: bölge bölge başarıyı okuyup güçlü/zayıf bölgeyi anlatan HTML döndürür.
export function renderAnalysisHtml(zoneStats) {
  const entries = Object.entries(zoneStats).filter(([, v]) => v.n >= 2);
  if (entries.length < 2) {
    const total = Object.values(zoneStats).reduce((s, v) => s + v.n, 0);
    return total === 0
      ? `Birkaç tur oyna, kulağının hangi frekans bölgesinde güçlü/zayıf olduğunu burada göstereceğim.`
      : `Analiz için biraz daha veri topluyorum… (${total} deneme)`;
  }
  const scored = entries.map(([k, v]) => ({ k, pct: Math.round((v.ok / v.n) * 100), n: v.n }))
    .sort((a, b) => a.pct - b.pct);
  const weak = scored[0], strong = scored[scored.length - 1];
  const bars = scored.map(s => {
    const col = s.pct >= 70 ? "var(--gr)" : s.pct >= 45 ? "var(--am)" : "var(--rd)";
    return `<div style="display:flex;align-items:center;gap:8px;margin-top:6px">
      <span style="width:76px;flex:none;color:var(--tx-3);font-size:14px">${s.k}</span>
      <div style="flex:1;height:7px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden">
        <i style="display:block;height:100%;width:${s.pct}%;background:${col}"></i></div>
      <span style="width:42px;flex:none;text-align:right;font-size:14px;font-weight:700;color:${col}">${s.pct}%</span>
    </div>`;
  }).join("");
  return `<div style="margin-bottom:8px">En zayıf bölgen <b style="color:var(--rd)">${weak.k}</b> (%${weak.pct}). En güçlü: <b style="color:var(--gr)">${strong.k}</b> (%${strong.pct}).</div>` +
    bars +
    `<div style="margin-top:10px;color:var(--am);font-size:14px">💡 Öneri: bir süre <b>${weak.k}</b> aralığına odaklan; A/B'yi bol kullanıp farkı yakala.</div>`;
}

export function renderHintMask(hintMaskLayerEl, question) {
  if (!hintMaskLayerEl || !question) return;
  // ADIM 2: question.hintBandOct (createQuestion'ın koyduğu, eğri/statik farkını
  // zaten çözmüş değer) ÖNCELİKLİ — Kesim Noktası'ndaki AYNI kural. proplus'ta
  // hintBandOct hiç set edilmiyor (bkz. createQuestion'ın proplus dalı), o yüzden
  // DIFFICULTY[question.difficulty] fallback'i proplus için hâlâ gerekli.
  const diff = DIFFICULTY[question.difficulty] || DIFFICULTY.medium;
  const halfOct = (question.hintBandOct != null ? question.hintBandOct : (diff.hintBandOct || 1.4)) / 2;
  const centers = question.mode === "proplus" && question.bands
    ? question.bands.map(b => b.freq)
    : [question.freq];

  const clearRanges = centers.map(f => {
    const lo = Math.max(FA_MIN, f / Math.pow(2, halfOct));
    const hi = Math.min(FA_MAX, f * Math.pow(2, halfOct));
    return [faFToX(lo, 1), faFToX(hi, 1)];
  }).sort((a, b) => a[0] - b[0]);

  const merged = [];
  clearRanges.forEach(r => {
    if (merged.length && r[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], r[1]);
    } else merged.push(r.slice());
  });

  const segs = [];
  let cursor = 0;
  merged.forEach(([a, b]) => {
    if (a > cursor) segs.push([cursor, a]);
    cursor = Math.max(cursor, b);
  });
  if (cursor < 1) segs.push([cursor, 1]);

  hintMaskLayerEl.innerHTML = "";
  segs.forEach(([a, b]) => {
    const div = document.createElement("div");
    div.className = "hint-mask-seg";
    div.style.left = `${(a * 100).toFixed(2)}%`;
    div.style.width = `${((b - a) * 100).toFixed(2)}%`;
    hintMaskLayerEl.appendChild(div);
  });

  // Segmentler opacity:0 ile DOM'a eklendi; zorla reflow + hemen ardından .show
  // eklemek CSS transition'ı tetikler (requestAnimationFrame yerine — sekme arka
  // plandayken/odaksızken rAF ertelenebiliyor, offsetHeight okuması ise her zaman senkron).
  void hintMaskLayerEl.offsetHeight;
  hintMaskLayerEl.querySelectorAll(".hint-mask-seg").forEach(el => el.classList.add("show"));
}

export function clearHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}

// Tek bant modunda soru metni ("Hangi frekansla oynandı? Dalga üzerine tıkla.") zaten
// aynı yönergeyi veriyor — burada tekrar etmiyoruz. Pro Plus'ta ise bu satır statik
// değil, canlı bir sayaç ("kalan: N") taşıdığı için ayrı tutuluyor.
export function renderGuessAreaControls(freqGuessAreaEl, q) {
  if (q.mode !== "proplus") {
    freqGuessAreaEl.textContent = "";
    freqGuessAreaEl.classList.add("hidden");
    return;
  }
  freqGuessAreaEl.classList.remove("hidden");
  freqGuessAreaEl.innerHTML = `<span id="ppCount">👆 Dört ayrı frekansı işaretle · kalan: 4</span>`;
}

// Şıklı cevap modunun .ans grid'ini kurar. Tıklama app.js'te delege edilir
// (butonların dataset.freq'i okunup submitFrequencyGuess'e geçilir) — bu fonksiyon
// sadece DOM'u kurar, cevabı DEĞERLENDİRMEZ (evaluateAnswer saf kalır).
export function renderAnswerChoices(answersEl, q) {
  if (!answersEl) return;
  if (q.mode === "proplus" || !q.choices) {
    answersEl.innerHTML = "";
    answersEl.classList.add("hidden");
    return;
  }
  answersEl.className = "answers";
  answersEl.innerHTML = q.choices.map(c => {
    const zone = faZoneOf(c.freq);
    return `<button type="button" class="ans" data-freq="${c.freq}">` +
      `<b>${formatHz(c.freq)}</b><span>${hintZoneLabel(c.freq) || zone.t.split(" (")[0]}</span></button>`;
  }).join("");
}

// Cevap verildikten sonra .ans butonlarını doğru/yanlış/seçili olarak işaretler.
export function markAnswerChoices(answersEl, q, pickedFreq) {
  if (!answersEl || q.mode === "proplus" || !q.choices) return;
  Array.from(answersEl.querySelectorAll(".ans")).forEach(btn => {
    const f = Number(btn.dataset.freq);
    btn.classList.remove("pick");
    btn.disabled = true;
    if (f === q.freq) btn.classList.add("right");
    else if (pickedFreq != null && f === pickedFreq) btn.classList.add("wrong");
  });
}

// prototype.html'deki cmprow: "Senin cevabın" doğru bilindiyse gösterilmez (Doğru
// cevap ile aynı sesi çalardı, bkz. fillCmp'teki mine.classList.toggle('hide', right)).
// Butonların gerçek ses çalma davranışı app.js'te delege ediliyor (bkz. #freqInfo
// click dinleyicisi) — bu fonksiyon SADECE DOM kurar, ses/DOM saflığı ihlal etmez
// (sözleşmenin DIŞINDaki render yardımcılarından biri, bkz. dosya başındaki not).
export function showFreqInfoPanel(freqInfoEl, feedback) {
  if (!freqInfoEl || !feedback.panel) return;
  const { ok, head, zone, guessHz } = feedback.panel;
  const color = ok ? "var(--gr)" : "var(--rd)";
  freqInfoEl.style.borderColor = color;
  freqInfoEl.style.background = ok ? "rgba(43,217,168,.10)" : "rgba(255,77,109,.10)";
  freqInfoEl.innerHTML =
    `<button type="button" class="freq-info-close" aria-label="Kapat, sıradaki soruya geç">✕</button>` +
    `<div style="font-weight:800;color:${color};margin-bottom:6px;font-size:16px">${head}</div>` +
    `<div style="font-weight:700;color:var(--tx);margin-bottom:4px;font-size:14px">${zone.t}</div>` +
    `<div style="color:var(--tx-3);font-size:14px;line-height:1.55">${zone.tip}</div>` +
    `<div class="cmprow">` +
    `<button type="button" class="cmp${ok ? " hide" : ""}" data-preview="mine" data-guess-hz="${guessHz}">Senin cevabın</button>` +
    `<button type="button" class="cmp on" data-preview="correct">Doğru cevap</button>` +
    `<button type="button" class="cmp" data-preview="clean">Temiz</button>` +
    `</div>`;
  freqInfoEl.classList.remove("hidden");
}

export function showProPlusInfoPanel(freqInfoEl, feedback) {
  if (!freqInfoEl || !feedback.panel) return;
  const { ok, hit, bands } = feedback.panel;
  const color = ok ? "var(--gr)" : "var(--rd)";
  freqInfoEl.style.borderColor = color;
  freqInfoEl.style.background = ok ? "rgba(43,217,168,.10)" : "rgba(255,77,109,.10)";
  const rows = bands.map(b => {
    const act = b.gain >= 0 ? "▲ açık" : "▼ kısık";
    const zone = faZoneOf(b.freq);
    const dogru = b.dOct !== null && b.dOct <= 0.5;
    const mark = dogru ? "✅" : "❌";
    const senin = b.guessHz ? `sen: ${formatHz(b.guessHz)}` : "işaretlemedin";
    return `<div style="padding:7px 0;border-top:1px solid rgba(255,255,255,.08);font-size:14px">
      <b style="color:${dogru ? "var(--gr)" : "var(--rd)"}">${mark} ${formatHz(b.freq)} ${act}</b>
      <span style="color:var(--tx-3)">· ${zone.t.split(" (")[0]} · ${senin}</span></div>`;
  }).join("");
  freqInfoEl.innerHTML =
    `<button type="button" class="freq-info-close" aria-label="Kapat, sıradaki soruya geç">✕</button>` +
    `<div style="font-weight:800;color:${color};margin-bottom:4px;font-size:16px">${hit}/4 doğru</div>` + rows;
  freqInfoEl.classList.remove("hidden");
}

// 4 bandı tek tek aç: her açılışta ding/buzz + parlama animasyonu.
export function createRevealAnimator({ sfxDing, sfxBuzz }) {
  let count = 0;
  let glow = 0;
  let resultBands = null;

  function start(bandsSortedByFreq) {
    resultBands = bandsSortedByFreq;
    count = 0;
    glow = 0;
    openNext();
  }

  function openNext() {
    if (!resultBands || count >= resultBands.length) return;
    count++;
    const b = resultBands[count - 1];
    if (b.correct) sfxDing(); else sfxBuzz();
    glow = 1;
    const t0 = performance.now();
    (function fade(t) {
      glow = Math.max(0, 1 - (t - t0) / 300);
      if (glow > 0) requestAnimationFrame(fade);
    })(t0);
    if (count < resultBands.length) setTimeout(openNext, 340);
  }

  function reset() {
    count = 0;
    glow = 0;
    resultBands = null;
  }

  return {
    start,
    reset,
    get count() { return count; },
    get glow() { return glow; }
  };
}

// --- canvas çizim yardımcıları ---

function roundRectPath(ctx2d, x, y, w, h, r) {
  ctx2d.beginPath();
  ctx2d.moveTo(x + r, y);
  ctx2d.arcTo(x + w, y, x + w, y + h, r);
  ctx2d.arcTo(x + w, y + h, x, y + h, r);
  ctx2d.arcTo(x, y + h, x, y, r);
  ctx2d.arcTo(x, y, x + w, y, r);
  ctx2d.closePath();
}

function drawPillLabel(ctx2d, text, x, y, bg, fg, font, fontSizePx, clampW) {
  ctx2d.font = font;
  ctx2d.textAlign = "center";
  const padX = 8, padY = 5;
  const tw = ctx2d.measureText(text).width;
  const rw = tw + padX * 2;
  const rh = fontSizePx + padY * 2;
  let cx = x;
  if (typeof clampW === "number") {
    const half = rw / 2;
    if (cx - half < 4) cx = 4 + half;
    if (cx + half > clampW - 4) cx = clampW - 4 - half;
  }
  roundRectPath(ctx2d, cx - rw / 2, y - fontSizePx - padY + 2, rw, rh, rh / 2);
  ctx2d.fillStyle = bg;
  ctx2d.fill();
  ctx2d.fillStyle = fg;
  ctx2d.fillText(text, cx, y);
  ctx2d.textAlign = "left";
}

let _faTicksCache = { key: null, ticks: FA_TICKS_ALL };
function pickFreqTicks(ctx2d, canvasEl, w) {
  const cssW = canvasEl.getBoundingClientRect().width || w;
  const cacheKey = w + ":" + Math.round(cssW);
  if (_faTicksCache.key === cacheKey) return _faTicksCache.ticks;

  ctx2d.font = `600 ${AXIS_FONT_PX}px Inter, sans-serif`;
  const scale = cssW / w;
  // Pill zemini yok artık — sade metin için daha dar bir minimum boşluk yeterli.
  const minGapInternal = 34 / Math.max(0.05, scale);

  function fits(arr) {
    let lastRight = -Infinity;
    for (const f of arr) {
      const label = f >= 1000 ? (f / 1000) + "k" : String(f);
      const halfW = ctx2d.measureText(label).width / 2;
      const x = faFToX(f, w);
      if (x - halfW < lastRight) return false;
      lastRight = x + halfW + minGapInternal;
    }
    return true;
  }
  let ticks = FA_TICKS_ALL.slice();
  while (ticks.length > 3 && !fits(ticks)) {
    ticks = ticks.filter((_, i) => i % 2 === 0);
  }
  _faTicksCache = { key: cacheKey, ticks };
  return ticks;
}

// Eksen etiketleri: prototipteki gibi sade metin, panelin alt kenarına yakın, pill
// zemin YOK — sadece dikey ızgara çizgisi + küçük gri rakam.
function drawFreqAxis(ctx2d, canvasEl, w, h) {
  const plotBottom = h - AXIS_H;
  const labelY = h - 12;
  ctx2d.font = `600 ${AXIS_FONT_PX}px Inter, sans-serif`;
  ctx2d.textAlign = "center";
  pickFreqTicks(ctx2d, canvasEl, w).forEach(f => {
    const x = faFToX(f, w);
    ctx2d.strokeStyle = "rgba(255,255,255,.08)";
    ctx2d.beginPath(); ctx2d.moveTo(x, 6); ctx2d.lineTo(x, plotBottom); ctx2d.stroke();
    const label = f >= 1000 ? (f / 1000) + "k" : String(f);
    ctx2d.fillStyle = "#8C95AB";
    ctx2d.fillText(label, x, labelY);
  });
  ctx2d.textAlign = "left";
}

// Soruda uygulanan peaking filtre(ler)in gerçek frekans yanıtını (dB) hesaplar.
// Pro Plus'ta bantlar seri bağlı olduğundan toplam yanıt dB'lerin TOPLAMIdır.
function getEqCurveForQuestion(audioCtx, q, w) {
  if (!audioCtx) return null;
  if (q._eqCurveCache && q._eqCurveCache.w === w) return q._eqCurveCache.db;
  const specs = q.mode === "proplus" && q.bands
    ? q.bands.map(b => ({ freq: b.freq, q: b.q, gain: b.gain }))
    : [{ freq: q.freq, q: q.q, gain: q.gain }];
  const N = 160;
  const freqs = new Float32Array(N);
  for (let i = 0; i < N; i++) freqs[i] = faXToF((i / (N - 1)) * w, w);
  const totalDb = new Float32Array(N);
  const mag = new Float32Array(N);
  const phase = new Float32Array(N);
  specs.forEach(spec => {
    const filter = audioCtx.createBiquadFilter();
    filter.type = "peaking";
    filter.frequency.value = spec.freq;
    filter.Q.value = spec.q;
    filter.gain.value = spec.gain;
    filter.getFrequencyResponse(freqs, mag, phase);
    for (let i = 0; i < N; i++) totalDb[i] += 20 * Math.log10(Math.max(mag[i], 1e-6));
  });
  q._eqCurveCache = { w, db: totalDb };
  return totalDb;
}

function drawEqResponseCurve(ctx2d, audioCtx, w, h, q) {
  const db = getEqCurveForQuestion(audioCtx, q, w);
  if (!db) return;
  const N = db.length;
  const maxAbsDb = 15;
  const plotBottom = h - AXIS_H;
  const curveTop = CURVE_TOP, curveBottom = plotBottom - 6;
  const midY = curveTop + (curveBottom - curveTop) * 0.55;
  const bandH = (curveBottom - curveTop) * 0.42;
  const yAt = i => {
    const d = Math.max(-maxAbsDb, Math.min(maxAbsDb, db[i]));
    return midY - (d / maxAbsDb) * bandH;
  };

  ctx2d.save();
  ctx2d.beginPath();
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * w;
    if (i === 0) ctx2d.moveTo(x, yAt(i)); else ctx2d.lineTo(x, yAt(i));
  }
  ctx2d.lineTo(w, midY);
  ctx2d.lineTo(0, midY);
  ctx2d.closePath();
  ctx2d.fillStyle = "rgba(43,217,168,.14)";
  ctx2d.fill();

  ctx2d.beginPath();
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * w;
    if (i === 0) ctx2d.moveTo(x, yAt(i)); else ctx2d.lineTo(x, yAt(i));
  }
  ctx2d.strokeStyle = "#2BD9A8";
  ctx2d.lineWidth = 2;
  ctx2d.globalAlpha = 0.85;
  ctx2d.stroke();
  ctx2d.restore();
}

// Tahmin ile doğru cevap arasındaki mesafeyi OKTAV cinsinden değerlendirip (lineer Hz
// DEĞİL) renkli bir bant + kısa metinle gösterir. Eşikler puanlamayla aynı (0.17/0.5 oktav).
// Tahmin/cevap oktav mesafesinin sözel karşılığı — canvas panelindeki pill KALDIRILDI
// (dar panelde tahmin/cevap etiketleriyle çakışıyordu); artık aynı kelime geri
// bildirim kartının metnine gömülüyor (bkz. getFeedbackData).
export function closenessWord(dOct) {
  if (dOct <= 0.17) return "çok yakın";
  if (dOct <= 0.5) return "yakın";
  return "uzak";
}
function closenessColor(dOct) {
  if (dOct <= 0.17) return "#2BD9A8";
  if (dOct <= 0.5) return "#FFC246";
  return "#FF4D6D";
}

// Sadece renkli "mesafe bandı" (arka plan dolgusu) — sözel etiket (chip) artık
// buraya çizilmiyor.
function drawClosenessBand(ctx2d, w, h, q, guessHz) {
  const dOct = Math.abs(Math.log2(guessHz / q.freq));
  const color = closenessColor(dOct);

  const plotBottom = h - AXIS_H;
  const x1 = faFToX(guessHz, w);
  const x2 = faFToX(q.freq, w);
  const left = Math.min(x1, x2), right = Math.max(x1, x2);
  const top = CURVE_TOP, bottom = plotBottom - 6;

  ctx2d.fillStyle = hexToRgba(color, 0.16);
  ctx2d.fillRect(left, top, Math.max(2, right - left), bottom - top);
}

// Tur boyunca canvas üzerine dalga/EQ eğrisinin ÜSTÜNE binen; tahmin/cevap/hint
// katmanı. drawVisualizer (core/app.js) tarafından her karede çağrılır.
// state: { audioCtx, activeQuestion, roundActive, freqGuessHz, freqHoverHz, revealAnimator }
export function drawOverlay(ctx2d, canvasEl, w, h, state) {
  const { audioCtx, activeQuestion: q, roundActive, freqGuessHz, freqHoverHz, revealAnimator } = state;
  drawFreqAxis(ctx2d, canvasEl, w, h);
  if (!q) return;

  const plotBottom = h - AXIS_H;

  if (freqHoverHz && roundActive) {
    const x = faFToX(freqHoverHz, w);
    ctx2d.strokeStyle = "rgba(255,194,70,.55)";
    ctx2d.setLineDash([4, 4]);
    ctx2d.beginPath(); ctx2d.moveTo(x, 4); ctx2d.lineTo(x, plotBottom); ctx2d.stroke();
    ctx2d.setLineDash([]);
  }

  // ---- PRO PLUS çok bantlı ----
  if (q.mode === "proplus" && q.bands) {
    if (!roundActive && q.freqRevealed && q._result) {
      drawEqResponseCurve(ctx2d, audioCtx, w, h, q);
    }
    (q.guesses || []).forEach(gHz => {
      const x = faFToX(gHz, w);
      ctx2d.strokeStyle = roundActive ? "#FFC246" : "rgba(255,194,70,.85)";
      ctx2d.lineWidth = roundActive ? 3 : 2;
      ctx2d.beginPath(); ctx2d.moveTo(x, 4); ctx2d.lineTo(x, plotBottom); ctx2d.stroke();
      if (!roundActive) {
        drawPillLabel(ctx2d, "sen", x, plotBottom - 12, "rgba(15,23,32,.82)", "rgba(255,194,70,.95)",
          "700 14px 'JetBrains Mono', monospace", 14, w);
      }
    });
    if (!roundActive && q.freqRevealed && q._result && revealAnimator) {
      q._result.forEach((b, i) => {
        if (i >= revealAnimator.count) return;
        const x = faFToX(b.freq, w);
        const col = b.correct ? "#2BD9A8" : "#FF4D6D";
        const up = b.gain >= 0;
        if (i === revealAnimator.count - 1 && revealAnimator.glow > 0) {
          ctx2d.save();
          ctx2d.globalAlpha = revealAnimator.glow;
          ctx2d.strokeStyle = col; ctx2d.lineWidth = 10;
          ctx2d.beginPath(); ctx2d.moveTo(x, 4); ctx2d.lineTo(x, plotBottom); ctx2d.stroke();
          ctx2d.restore();
        }
        ctx2d.strokeStyle = col; ctx2d.lineWidth = 3; ctx2d.setLineDash([5, 4]);
        ctx2d.beginPath(); ctx2d.moveTo(x, 4); ctx2d.lineTo(x, plotBottom); ctx2d.stroke(); ctx2d.setLineDash([]);
        drawPillLabel(ctx2d, (b.correct ? "✓ " : "✗ ") + (up ? "▲" : "▼") + formatHz(b.freq), x, up ? LABEL_Y : h / 2,
          "rgba(15,23,32,.82)", col, "800 15px 'JetBrains Mono', monospace", 15, w);
      });
    }
    return;
  }

  // ---- TEK BANT (frekans modu) ----
  const showGuess = freqGuessHz;
  const revealed = !roundActive && q.freqRevealed;

  if (revealed) {
    drawEqResponseCurve(ctx2d, audioCtx, w, h, q);
    if (showGuess) drawClosenessBand(ctx2d, w, h, q, showGuess);
  }

  const guessX = showGuess ? faFToX(showGuess, w) : null;
  const answerX = revealed ? faFToX(q.freq, w) : null;

  // Tahmin ve doğru cevap etiketleri YATAY mesafeden bağımsız olarak her zaman farklı
  // satırlarda çizilir (tahmin üstte, cevap altta) — bu yüzden ne kadar yakın olurlarsa
  // olsunlar asla üst üste binmezler. Yatay kenar taşması drawPillLabel'ın clampW'ü ile
  // ayrıca önlenir.
  const labelFont = `800 ${LABEL_FONT_PX}px 'JetBrains Mono', monospace`;
  if (showGuess) {
    ctx2d.strokeStyle = "#FFC246"; ctx2d.lineWidth = 3;
    ctx2d.beginPath(); ctx2d.moveTo(guessX, 4); ctx2d.lineTo(guessX, plotBottom); ctx2d.stroke();
    drawPillLabel(ctx2d, formatHz(showGuess), guessX, GUESS_LABEL_Y, "rgba(15,23,32,.9)", "#FFC246",
      labelFont, LABEL_FONT_PX, w);
  }
  if (revealed) {
    const up = q.gain >= 0;
    ctx2d.strokeStyle = "#2BD9A8"; ctx2d.lineWidth = 3; ctx2d.setLineDash([5, 4]);
    ctx2d.beginPath(); ctx2d.moveTo(answerX, 4); ctx2d.lineTo(answerX, plotBottom); ctx2d.stroke(); ctx2d.setLineDash([]);
    drawPillLabel(ctx2d, (up ? "▲ " : "▼ ") + formatHz(q.freq), answerX, ANSWER_LABEL_Y, "rgba(15,23,32,.9)", "#2BD9A8",
      labelFont, LABEL_FONT_PX, w);
  }
}

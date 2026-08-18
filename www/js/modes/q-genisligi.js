// "Q Genişliği" — EQ bandının GENİŞLİK KARAKTERİNİ tanıma modu. Boost mu Cut mu
// ile AYNI peaking-EQ motorunu kullanır ama sorulan eksen FARKLI: orada boost/cut
// yönü+miktarı+frekans soruluyordu, burada Q (genişlik) — kullanıcı SAYISAL bir
// değer değil, MİX DİLİNDE bir ETİKET (Notch/Dar/Orta/Geniş/Çok Geniş) seçiyor.
// SoundGym'de Q/bandwidth ölçen bir oyun YOK — bu ÖZGÜN.
//
// İZOLASYON İLKESİ (öğrenme sinyali temiz kalsın): gain HER ZAMAN sabit büyüklükte
// (Q_GAIN_DB) — genişlik algısını gölgelemesin. Frekans kolay/orta zorlukta SABİT
// (Q_FIXED_FREQ, 1 kHz — kullanıcı SAF Q'yu duysun), zorlaştıkça (ISOLATE_UNTIL_
// POSITION'ın ÜSTÜNDE) tüm spektruma (FA_MIN–FA_MAX, Frekans Bulma'nın havuzu)
// yayılır — gerçekçilik zorlukla birlikte artan bir DEĞİŞKEN, "hangi tür" değil
// "ne kadar" ekseninde bir zorluk kararı (Frekans Bulma'nın BOOST_ONLY_
// DIFFICULTIES'iyle AYNI kategori — tier'a bağlı nitel bir kural).
//
// FELSEFE: modun öğrettiği asıl mix kararı "cerrahi mi müzikal mi EQ" — Notch
// (rezonans avı) / Dar (hedefli düzeltme) / Geniş (ton şekillendirme). Bu ÜÇÜ
// çekirdek kategori, HER ZAMAN havuzda (kolay dahil — ASLA 2'ye inmez, bkz.
// G29 notu). Orta/Çok Geniş birer NÜANS, zorlukla SONRADAN eklenir (bkz.
// poolForSize/INTRODUCTION_ORDER) — önce 3 çekirdek karar ustalaşılır, sonra
// ince ayrım öğretilir.
//
// Soru SADE (3-5 etiket şıkkı, hiçbir zaman daha az), geri bildirim ZENGİN:
// Q'nun SAYISAL karşılığı + frekans + yön + mix anlamı cevap sonrası
// açıklanıyor — kullanıcının kulağı zamanla "Notch = ~Q8-16" gibi kalibre
// olsun diye.
//
// Mod sözleşmesi diğer dördüyle AYNI (getMeta/createQuestion/applyProcessing/
// evaluateAnswer/calculateXP/getFeedbackData) + aynı-isimli render yardımcıları.
// Merkezi zorluk eğrisine Boost/Cut'ın (G25) BAŞTAN-doğru-kalibrasyon yöntemiyle
// bağlandı — "kolaylaşma yok" invaryantı ikili aramayla ÖNCEDEN sağlandı.
//
// SADECE ŞIKLI (choiceOnly:true) — diğer üç yeni modla AYNI karar.

import { shuffle, formatHz, logFreq } from "../core/utils.js";
import { compatibleSourceIds } from "../core/source-catalog.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound, drawSpectrumBackground } from "./frekans-bulma.js";
import { logLerp, applyPostCapFloor, representativeLevelForTier } from "../core/difficulty-curve.js";
import { GUESS_COLOR, CORRECT_COLOR } from "../core/feedback-colors.js";
import { pickAvoidingRecent } from "../core/repeat-guard.js";

// app.js'in GENEL görselleştiricisi (drawVisualizer/drawSpectrumBars) BU sabitleri
// HER moddan mode-agnostik olarak okur — diğer üç modla AYNI re-export deseni.
export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound, drawSpectrumBackground };

export const MODE_ID = "q-genisligi";
export const MAX_LIVES = 5;
// G292 (OLCUM-UC-18-08 madde C) — correctLabel'ın kimlik uzayı K=6-12
// (kademeye göre pool 3-5 etiket) — Kompresör'den DAHA GENİŞ ama Logic'in
// ölçümde YENİ bulduğu ikinci dar mod. N=1 SADECE ardışık tekrarı engelliyor
// (rapor N=1-2'yi de güvenli sayıyor, N=1 diğer üç modla TUTARLILIK için
// seçildi).
export const REPEAT_GUARD_N = 1;

// G50: Sınav sistemi — frekans-bulma.js'in AYNI notu. EXAM_WEAK_AREA="zone":
// bu mod recordZone'u HİÇ ÇAĞIRMIYOR (frekans kullanıcıya hiç açıklanmıyor,
// bkz. app.js submitQWidthGuess notu) — ama telafi'nin okuduğu zoneStats
// PAYLAŞILAN/çapraz-mod bir sinyal (Frekans Bulma/Kesim Noktası'nın beslediği,
// "genel olarak hangi bölgede zayıfsın"), Q Genişliği'nin KENDİ verisi
// olmasa da bu sinyalden faydalanabilir; veri hiç yoksa (getWeakZone null)
// app.js normal (daraltılmamış) aralığa düşer.
export const EXAM_ENABLED = true;
export const EXAM_DIFFICULTY = "pro";
export const EXAM_WEAK_AREA = "zone";

// ═══════════════════════════════════════════════════════════════════════════
// GENİŞLİK ETİKETLERİ — TEK doğruluk kaynağı. Sınırlar Q ekseninde (büyük=dar/
// cerrahi, küçük=geniş/müzikal) ARDIŞIK ve BİTİŞİK aralıklar — her Q değeri TAM
// BİR etikete düşer, iki etiket arasında boşluk/çakışma YOK (labelIndexForQ'nun
// doğruluğu buna dayanıyor). Sayılar KULAKLA DOĞRULANMADI — spec'in "Notch ~8-12/
// Dar ~3-5/Geniş ~0.5-1" aralıklarına makul bir başlangıç noktası, "Orta" ve "Çok
// Geniş" (spec'in "belki 4-5 kademe" notuyla istenen granülerlik) araya/uca eklendi.
const LABELS = [
  { id: "notch", tr: "Notch", qMin: 7, qMax: 16, mixText: "Cerrahi bir müdahale — tek bir rezonansı/uğultuyu avlar, mix'in geri kalanına neredeyse hiç dokunmaz" },
  { id: "dar", tr: "Dar", qMin: 3, qMax: 7, mixText: "Hedefli bir düzeltme — dar bir bölgeyi düzeltir, komşu frekanslara sızma az" },
  { id: "orta", tr: "Orta", qMin: 1.3, qMax: 3, mixText: "Dengeli bir müdahale — ne çok cerrahi ne çok müzikal, genel amaçlı" },
  { id: "genis", tr: "Geniş", qMin: 0.5, qMax: 1.3, mixText: "Müzikal bir renklendirme — geniş bir bölgenin genel tonunu şekillendirir" },
  { id: "cokgenis", tr: "Çok Geniş", qMin: 0.2, qMax: 0.5, mixText: "Çok geniş bir ton eğimi — neredeyse bir shelf gibi davranır, tüm bölgeyi yumuşakça renklendirir" }
].map(l => ({ ...l, qCenter: Math.sqrt(l.qMin * l.qMax) }));

export const MIN_Q = LABELS[LABELS.length - 1].qMin;
export const MAX_Q = LABELS[0].qMax;

// SAF FONKSİYON. Her Q TAM BİR etikete düşer (üst sınır bir SONRAKİ etiketin alt
// sınırıyla ORTAK — dizinin en sonunda son etiketin qMax'ı DAHİL, gerisi hariç).
export function labelIndexForQ(q) {
  for (let i = 0; i < LABELS.length; i++) {
    const isLast = i === LABELS.length - 1;
    if (q >= LABELS[i].qMin && (isLast ? q <= LABELS[i].qMax : q < LABELS[i].qMax)) return i;
  }
  return q < MIN_Q ? LABELS.length - 1 : 0;
}

export function labelById(id) {
  return LABELS.find(l => l.id === id) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HAVUZ (pool) BÜYÜMESİ — modun FELSEFESİ burada kodlanıyor: "cerrahi mi
// müzikal mi EQ" kararı ÜÇ çekirdek kategoriyle öğretilir — Notch (rezonans
// avı) / Dar (hedefli) / Geniş (ton şekillendirme). Bu üçü HER ZAMAN havuzda
// (kolay dahil, ASLA 2'ye düşmez — G29'da bulunan gerçek hata: eskiden kolayda
// havuz "en uzak iki uç" mantığıyla 2'ye iniyordu, açıklama da buna
// uydurulmuştu; bu TERSİNE ÇEVRİLDİ). Orta/Çok Geniş birer NÜANS — zorlukla
// SONRADAN eklenirler (Orta: zor'da, Çok Geniş: pro'da), Q ekseninde bitişik
// olmasalar bile (Orta, Dar/Geniş ARASINA girer) TANITILMA sırası buna göre.
// Bu, `LABELS`'in Q'ya göre sıralı (dar→geniş) dizisinden BİLEREK AYRI bir
// kavram — biri "bu Q hangi etikete düşer" (labelIndexForQ), diğeri "bu turda
// HANGİ etiketler oyunda" (poolForSize).
const INTRODUCTION_ORDER = ["notch", "dar", "genis", "orta", "cokgenis"];

// SAF FONKSİYON. n=3 → {Notch,Dar,Geniş} (çekirdek), n=4 → +Orta, n=5 → +Çok
// Geniş. Dönen dizi LABELS'in KENDİ (dar→geniş) sırasında — pickTrueQ'nun
// komşuluk kontrolü buna bağlı.
export function poolForSize(n) {
  const size = Math.max(3, Math.min(LABELS.length, n));
  const ids = new Set(INTRODUCTION_ORDER.slice(0, size));
  return LABELS.filter(l => ids.has(l.id));
}

// ═══════════════════════════════════════════════════════════════════════════
// İZOLASYON + GAIN — Q dışındaki her şey sabit tutulur ki öğrenme sinyali saf
// kalsın. Frekans SADECE zorluk ISOLATE_UNTIL_POSITION'ı GEÇİNCE serbest kalır.
export const Q_FIXED_FREQ = 1000; // Hz — nötr bir referans (1 kHz)
export const Q_GAIN_DB = 6; // dB — her zaman aynı büyüklük, yön (boost/cut) rastgele

// gainDb HİÇBİR ZAMAN eğriden gelmiyor (bilerek — Q dışındaki HER eksen sabit
// kalmalı, "izole Q" ilkesinin bir parçası, zorlukla da DEĞİŞMEZ).
const FILTER_Q_MIN_SAFE = 0.1; // BiquadFilterNode.Q'nun pratik alt sınırı

// ═══════════════════════════════════════════════════════════════════════════
// STATİK DIFFICULTY — diğer dört modla AYNI ikili rol: (a) settings.
// difficultyPosition verilmezse fallback, (b) "Sabit" modun tier-adı çapası,
// (c) proplus için tek kaynak (eğri proplus'a hiç uygulanmıyor, Z5 kararı).
// `options` alan adı BİLEREK korundu (rename EDİLMEDİ) — app.js:renderLevelSheet
// TÜM modların DIFFICULTY[level]'ından `.options`'ı GENERİK okuyup "Şık sayısı"
// diye gösteriyor (bkz. app.js ~2751); adı değiştirmek o paneli SESSİZCE "—"
// gösterir hale getirirdi — anlamı ARTIK "havuzdaki/gösterilen etiket sayısı".
//
// G29'da TERSİNE ÇEVRİLEN gerçek hata: kolayda havuz "en uzak iki uç" mantığıyla
// 2'ye düşüyordu (Notch/Dar/Geniş çekirdek üçlüsünden BİRİNİ atlayarak) — soru
// metni de buna uydurulmuştu. Artık `options` (=havuz boyutu) ASLA 3'ün altına
// inmiyor — kolay/orta HER ZAMAN {Notch,Dar,Geniş} çekirdek üçlüsü (bkz.
// poolForSize/INTRODUCTION_ORDER), zorlaştıkça hem bu üçlü İÇİNDE kademeler
// yakınlaşıyor (edgeMargin küçülüyor) HEM DE zor'da Orta, pro'da Çok Geniş
// EKLENEREK havuz 4'e, 5'e büyüyor — spec'in "yakınlaşır VEYA 4-5'e çıkar"
// isteğinin İKİSİ de, aşamalı (önce 3 çekirdek ustalaşılır, sonra nüans
// eklenir) — kolayla pro arasında pedagojik bir sıra izliyor.
//
// KULAKLA DOĞRULANMADI — diğer dört modun AYNI dürüstlük notu.
export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 14, options: 3, time: 14, lives: MAX_LIVES, edgeMargin: 0.55 },
  medium: { label: "Orta", xp: 22, options: 3, time: 12, lives: MAX_LIVES, edgeMargin: 0.32 },
  hard: { label: "Zor", xp: 32, options: 4, time: 10, lives: MAX_LIVES, edgeMargin: 0.18 },
  pro: { label: "Pro", xp: 46, options: 5, time: 8, lives: MAX_LIVES, edgeMargin: 0.08 },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 46, options: 5, time: 8, lives: MAX_LIVES, edgeMargin: 0.08 }
};

// ═══════════════════════════════════════════════════════════════════════════
// ZORLUK EĞRİSİ — Boost/Cut'ın (G25) BAŞTAN-doğru-kalibrasyon yöntemiyle bağlanan
// 3. mod (dB Seviyesi/Boost-Cut'tan sonra). AT_1'ler statik easy değerleriyle
// birebir aynı. AT_CAP'lar ikili aramayla, representativeLevelForTier'ın HİÇBİR
// temsilci seviyesinde eski statik tablodan kolay çıkmayacak şekilde ÖNCEDEN
// (G29'da yeni statik tabloyla BİRLİKTE) yeniden çözüldü.
export const Q_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  OPTIONS_AT_1: 3,
  OPTIONS_AT_CAP: 6.0,

  EDGE_MARGIN_AT_1: 0.55,
  EDGE_MARGIN_AT_CAP: 0.07,
  EDGE_MARGIN_FLOOR: 0.05,
  EDGE_MARGIN_REDUCTION_PER_STEP: 0.002,

  TIME_SEC_AT_1: 14,
  TIME_SEC_AT_CAP: 8,
  TIME_SEC_FLOOR: 6,
  TIME_SEC_REDUCTION_PER_STEP: 0.1
};

// Frekans SADECE bu zorluk konumunu (temsilci "medium" seviyesi, 8) GEÇİNCE
// serbest kalır — "hangi tür" (izole mi serbest mi) kararı, "ne kadar" değil,
// Frekans Bulma'nın BOOST_ONLY_DIFFICULTIES'iyle AYNI kategori bir eşik.
export const ISOLATE_UNTIL_POSITION = representativeLevelForTier("medium");

// SAF FONKSİYON. position: zorlukKonumu — diğer dört modun
// paramsForDifficultyPosition'ıyla AYNI mod-agnostik girdi.
export function paramsForDifficultyPosition(position, config = Q_CURVE_CONFIG) {
  const safePos = Math.max(1, position);
  const cappedPos = Math.min(safePos, config.LEVEL_CAP);
  const t = config.LEVEL_CAP > 1 ? (cappedPos - 1) / (config.LEVEL_CAP - 1) : 1;

  const optionsCurve = logLerp(config.OPTIONS_AT_1, config.OPTIONS_AT_CAP, t);
  const edgeMarginCurve = logLerp(config.EDGE_MARGIN_AT_1, config.EDGE_MARGIN_AT_CAP, t);
  const timeCurve = logLerp(config.TIME_SEC_AT_1, config.TIME_SEC_AT_CAP, t);

  return {
    position: safePos,
    options: Math.max(3, Math.min(LABELS.length, Math.round(optionsCurve))),
    edgeMargin: applyPostCapFloor(edgeMarginCurve, safePos, config.LEVEL_CAP, config.EDGE_MARGIN_FLOOR, config.EDGE_MARGIN_REDUCTION_PER_STEP),
    timeSec: applyPostCapFloor(timeCurve, safePos, config.LEVEL_CAP, config.TIME_SEC_FLOOR, config.TIME_SEC_REDUCTION_PER_STEP),
    isolate: safePos <= ISOLATE_UNTIL_POSITION
  };
}

// SAF FONKSİYON. correctIndex'in KENDİ aralığı içinde, POOL'daki komşu
// etiketlerden birine (varsa) doğru sınıra edgeMargin kadar YAKLAŞAN bir Q
// üretir — komşu YOKSA (o kenarda havuzda hiç etiket yoksa, ör. kolayda
// "dar"ın Q-uzayındaki komşusu "orta" havuzda değilse) o kenar aralığın TAM
// ORTASI gibi davranır (o yönde belirsizlik yok, çünkü konfüze edilecek bir
// şık zaten yok). Komşuluk LABELS'in Q-SIRALI dizisine göre kontrol edilir —
// pool'da olup olmama ile (INTRODUCTION_ORDER'a göre), ikisi FARKLI kavramlar
// (ör. kolayda "dar" ile "geniş" pool'da birlikte var ama Q-uzayında bitişik
// DEĞİLLER — aralarında "orta" boşluğu var, o yüzden birbirlerine yakın
// pozisyonlanmaları GEREKMEZ). Hangi Q üretilirse üretilsin, HER ZAMAN KENDİ
// etiketinin sınırları İÇİNDE kalır (labelIndexForQ ile ÇAKIŞMASIZ) — FLOOR
// (edgeMargin'in asla sıfırlanmaması) bunu HİÇBİR zaman ihlal etmez, sadece
// "ne kadar sınıra yakın" ayarlar.
export function pickTrueQ(correctIndex, edgeMargin, pool, rng = Math.random) {
  const label = LABELS[correctIndex];
  const lo = Math.log2(label.qMin);
  const hi = Math.log2(label.qMax);
  const eps = Math.min(0.01, (hi - lo) * 0.05);
  const safeMargin = Math.min(edgeMargin, (hi - lo) / 2 - eps);

  const poolIds = new Set(pool.map(l => l.id));
  const hasNarrowerNeighbor = correctIndex > 0 && poolIds.has(LABELS[correctIndex - 1].id);
  const hasWiderNeighbor = correctIndex < LABELS.length - 1 && poolIds.has(LABELS[correctIndex + 1].id);

  let logQ;
  if (hasNarrowerNeighbor && hasWiderNeighbor) {
    logQ = rng() < 0.5 ? lo + safeMargin : hi - safeMargin;
  } else if (hasNarrowerNeighbor) {
    logQ = lo + safeMargin;
  } else if (hasWiderNeighbor) {
    logQ = hi - safeMargin;
  } else {
    logQ = (lo + hi) / 2;
  }
  logQ = Math.max(lo + eps, Math.min(hi - eps, logQ));
  return Math.max(FILTER_Q_MIN_SAFE, Math.pow(2, logQ));
}

// SAF FONKSİYON. Şıklar HER ZAMAN pool'un TAMAMI (çeldirici SEÇİMİ artık yok —
// hangi etiketlerin "oyunda" olduğuna havuz büyümesi [poolForSize] karar
// veriyor, generateChoices sadece onları {id,tr,correct} şıklarına çevirip
// karıştırıyor).
export function generateChoices(correctIndex, pool) {
  const correctId = LABELS[correctIndex].id;
  const choices = pool.map(l => ({ id: l.id, tr: l.tr, correct: l.id === correctId }));
  return shuffle(choices);
}

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    motor: 1,
    kulaklikGerekli: false,
    // Kaynak kısıtlaması YOK — Q genişliği her kaynakta duyulur, compatibleSourceIds()
    // parametresiz tüm SOURCE_GROUPS'u döner (bkz. Kesim Noktası'ndaki AYNI karar).
    uyumluKaynaklar: compatibleSourceIds(),
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY,
    choiceOnly: true
  };
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz. settings: { source, boss,
// difficultyPosition — verilirse options/edgeMargin/isolate EĞRİDEN gelir,
// verilmezse (mevcut testler, doğrudan çağrılar, proplus) statik
// DIFFICULTY[level] davranışı korunur }.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "pink";

  const curve = (level !== "proplus" && Number.isFinite(settings.difficultyPosition))
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  const options = curve ? curve.options : diff.options;
  const edgeMargin = curve ? curve.edgeMargin : diff.edgeMargin;
  const timeSec = curve ? curve.timeSec : diff.time;
  const isolate = curve ? curve.isolate : true; // statik/proplus fallback: HER ZAMAN izole (en güvenli/temiz sinyal)

  // Doğru cevap HER ZAMAN o turun havuzundan seçilir (options=havuz boyutu,
  // bkz. poolForSize) — kolayda bu havuz HER ZAMAN {Notch,Dar,Geniş} çekirdek
  // üçlüsü, correctIndex ASLA Orta/Çok Geniş olamaz o zorlukta (bkz. dosya
  // başı G29 notu).
  const pool = poolForSize(options);
  // G292 — Kompresör'ün AYNI "kalan küme" düzeltmesi (bkz. o dosyanın notu).
  // candidates HER TURUN KENDİ havuzundan (pool, zorluk/kademeye göre 3-5
  // etiket) — recentIdentities'deki bir önceki turun id'si o havuzda hiç
  // yoksa (kademe değiştiyse) hiçbir şeyi filtrelemez, normal seçime düşer.
  const correctLabelId = pickAvoidingRecent(pool.map((l) => l.id), settings.recentIdentities || []);
  const correctIndex = LABELS.findIndex((l) => l.id === correctLabelId);
  const choices = generateChoices(correctIndex, pool);
  const q = pickTrueQ(correctIndex, edgeMargin, pool);

  const direction = Math.random() < 0.5 ? 1 : -1;
  const gainDb = Q_GAIN_DB * direction;
  const freq = isolate ? Q_FIXED_FREQ : logFreq(FA_MIN, FA_MAX);

  return {
    mode: "qwidth",
    difficulty: level,
    freq,
    gainDb,
    q,
    correctIndex,
    repeatIdentity: correctLabelId, // G292 — app.js'in mod-agnostik geçmiş güncelleme okuduğu TEK sabit alan adı
    isolate,
    source,
    hintUsed: false,
    boss,
    timeSec,
    choices
  };
}

// Türkçe soru eki ("mu/mı/mi/mü") her etiketin SON ünlüsüne göre SABİT — sadece
// 5 olası etiket olduğu için elle bir tablo, dinamik ünlü uyumu hesaplamaya
// gerek yok. Notch→son ünlü "o" (yuvarlak-kalın)→mu; Dar/Orta→"a" (düz-kalın)→
// mı; Geniş/Çok Geniş→"i" (düz-ince, "Geniş"in son ünlüsü)→mi.
const QUESTION_PARTICLE = { notch: "mu", dar: "mı", orta: "mı", genis: "mi", cokgenis: "mi" };

// Başlıkta etiketleri SAYMANIN üst sınırı — G28'de bulunan gerçek hata
// (sabit metin gerçek q.choices'la uyuşmuyordu) düzeltilirken, G29'da
// cihazda bulunan İKİNCİ bir gerçek hata ortaya çıktı: 5 etiketi TEK cümlede
// sayan başlık 3 satıra sarıyor, bu da (375px'te ÖLÇÜLDÜ) `.game-scroll`'un
// taşma miktarını Boost/Cut'ın KENDİ en kötü durumundan (6 şık/tek satır
// başlık, 47px taşma) BELİRGİN fazlaya (63px) çıkarıyordu — kullanıcının
// "ekran yukarı kayıyor" tarifiyle örtüşen, ÖLÇÜLEBİLİR bir fark. Kök neden
// tek: BAŞLIK boyu, diğer hiçbir modun ASLA yapmadığı şekilde değişken sayıda
// etiketi TEK cümlede art arda diziyor. Çözüm: sadece havuz KÜÇÜKKEN (≤3,
// modun çekirdek/kolay-orta katmanı) etiketleri say — o zaman zaten tek
// satıra sığıyor VE "cerrahi mi müzikal mi" öğretisiyle en çok bu katmanda
// karşılaşılıyor. Havuz büyüdüğünde (zor/pro, 4-5) kısa/sabit bir cümleye
// düş — bu seviyedeki oyuncu etiketleri ZATEN biliyor, tekrar saymak sadece
// yer kaplıyor.
const TITLE_ENUMERATION_LIMIT = 3;

// SAF FONKSİYON. Başlık HER ZAMAN o SORUNUN gerçek q.choices'ını sayar/adlandırır
// (≤3 şıkta) — Boost/Cut'ın (G25) katman-bazlı mode.questionTitle(q) deseniyle
// AYNI, app.js bunu hardcoded bir metin yerine ÇAĞIRIR (bkz. app.js
// questionTitle ternary). Etiketler GÖSTERİM sırasında (renderAnswerChoices)
// shuffle'lanır ama başlıkta doğal okunuş için LABELS'in KENDİ (dar→geniş)
// sırasıyla listelenir.
export function questionTitle(q) {
  if (q.choices.length > TITLE_ENUMERATION_LIMIT) {
    return "Bu EQ'nun genişlik karakteri ne? Aşağıdaki şıklardan seç.";
  }
  const idsInQuestion = new Set(q.choices.map(c => c.id));
  const ordered = LABELS.filter(l => idsInQuestion.has(l.id));
  const parts = ordered.map(l => `${l.tr} ${QUESTION_PARTICLE[l.id]}`);
  return `Bu EQ'nun genişlik karakteri ne — ${parts.join(", ")}?`;
}

export function modeDescription() {
  return "A/B ile karşılaştır, EQ'nun cerrahi mi müzikal mi olduğuna (Notch/Dar/Geniş) karar ver.";
}

export function correctLabel(question) {
  const label = LABELS[question.correctIndex];
  const dir = question.gainDb >= 0 ? "Boost" : "Cut";
  return `${label.tr} (Q: ${question.q.toFixed(1)}, ${formatHz(question.freq)}, ${dir})`;
}

// Soruda uygulanan peaking EQ'yu audioCtx üzerinde kurar.
export function applyProcessing(question, { audioCtx }) {
  const f = audioCtx.createBiquadFilter();
  f.type = "peaking";
  f.frequency.value = question.freq;
  f.Q.value = question.q;
  f.gain.value = question.gainDb;
  // Düzeltme 1 (TUR8-OGRETIM-15-08 bulgusu 🔴, core/eq-loudness.js) — boost/cut
  // genel seviyeyi değiştirip bant genişliği (Q) ayrımına loudness ipucu
  // katmasın diye. audio-engine.js filtrenin GERÇEK RBJ frekans tepkisinden bir
  // telafi kazancı hesaplar — tahmini bir sabit değil.
  return { filters: [f], matchLoudness: true };
}

// SAF FONKSİYON. answer: etiket id'si (string, "notch"/"dar"/...) ya da {id}.
export function evaluateAnswer(question, answer) {
  const guessId = answer && typeof answer === "object" ? answer.id : answer;
  const correctId = LABELS[question.correctIndex].id;
  const correct = guessId === correctId;
  return { mode: "qwidth", correct, guessId, correctId };
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
// ÖĞRETİCİ METİN — soru SADE, geri bildirim ZENGİN: Q'nun SAYISAL karşılığı +
// frekans + yön + mix anlamı TEK yerde, HER zaman (doğru/yanlış fark etmeksizin)
// gösterilir — kullanıcının kulağı "Notch = ~Q8-16" gibi zamanla kalibre olsun.
// ═══════════════════════════════════════════════════════════════════════════

export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);
  const correctLbl = LABELS[question.correctIndex];
  const dirWord = question.gainDb >= 0 ? "boost" : "cut";
  const base = `Bu bir ${correctLbl.tr}'tı (Q: ${question.q.toFixed(1)}) — ${formatHz(question.freq)}'de ${dirWord}. ${correctLbl.mixText}.`;

  if (result.correct) return `Doğru! ${base}`;

  const guessLbl = labelById(result.guessId);
  const guessTxt = guessLbl ? guessLbl.tr : "?";
  return `Yanlış — sen ${guessTxt} dedin. ${base}`;
}

export function getFeedbackData(question, answer, context = {}) {
  const result = evaluateAnswer(question, answer);
  const gained = context.gained || 0;
  const text = teachingText(question, answer);

  if (result.correct) {
    return { result, title: "Doğru!", detail: `${text} (+${gained} XP)`, showResult: true, panel: null };
  }
  return { result, title: "Yanlış genişlik", detail: text, showResult: true, panel: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// SÖZLEŞMENİN DIŞINDA: bu moda özgü render/UI yardımcıları.
// ═══════════════════════════════════════════════════════════════════════════

// İpucu — genişlik etiketini ASLA vermez (o zaten sorunun kendisi), sadece
// YÖNÜ söyler (Boost/Cut modundaki Katman 1/2'nin AYNI kısmi-yardım ilkesi).
export function getHintText(question) {
  return question.gainDb >= 0 ? "Boost (+)" : "Cut (−)";
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

// Şıklar SADECE etiket metni taşır — sayısal Q değeri şıklarda YOK (spec'in
// açık isteği, kullanıcı DEĞERİ değil KARAKTERİ tanısın). `.ans-word` (styles.css):
// diğer dört modun TÜM şık metinleri kısa sayı/tek-kelime (ör. "1.33 kHz",
// "Boost", "LPF") — HİÇBİRİ 375px'lik dar bir telefonda `.ans b`'nin 21px
// tabular-nums boyutunda sarmıyor. "Çok Geniş" bu modun TEK iki-kelimelik
// etiketi — cihazda ÖLÇÜLEN gerçek hata: o genişlikte "Çok"/"Geniş" iki satıra
// bölünüyor, o satırdaki diğer (tek satırlık) şıklarla eşit kalmayan bir kutu
// yüksekliği üretiyor. `.ans-word` daha küçük/tabular-olmayan bir font-size'la
// bunu tek satıra sığdırıyor — SADECE bu modun şıklarını etkiler, diğer dört
// modun `.ans b` varsayılanına dokunulmadı.
export function renderAnswerChoices(answersEl, q) {
  if (!answersEl) return;
  if (!q.choices) { answersEl.innerHTML = ""; answersEl.classList.add("hidden"); return; }
  answersEl.className = "answers";
  answersEl.innerHTML = q.choices.map(c =>
    `<button type="button" class="ans" data-label-id="${c.id}"><b class="ans-word">${c.tr}</b></button>`
  ).join("");
}

export function markAnswerChoices(answersEl, q, picked) {
  if (!answersEl || !q.choices) return;
  const pickedId = picked && typeof picked === "object" ? picked.id : picked;
  const correctId = LABELS[q.correctIndex].id;
  Array.from(answersEl.querySelectorAll(".ans")).forEach(btn => {
    btn.classList.remove("pick");
    btn.disabled = true;
    const id = btn.dataset.labelId;
    if (id === correctId) btn.classList.add("right");
    else if (id === pickedId) btn.classList.add("wrong");
  });
}

// G83: eski YEREL eksen çizici (AXIS_TICKS/drawAxis) kaldırıldı — artık
// frekans-bulma.js:drawSpectrumBackground'ın MERKEZİ eksenini kullanıyor
// (bkz. app.js:drawVisualizer).

// Cevap sonrası bell-eğrisi — Boost/Cut'ın (G25) computeEqCurveDb/drawBellCurve
// TEKNİĞİYLE AYNI (gerçek BiquadFilterNode + getFrequencyResponse), ama BURADA
// değişen eksen FREKANS/GAIN DEĞİL, Q — dar (yüksek Q) sivri-dik bir tepe/çukur,
// geniş (düşük Q) yayvan bir tümsek üretir; kullanıcı genişlik farkını GÖRSEL de
// görsün diye (spec'in açık isteği).
const CURVE_POINTS = 160;
function computeEqCurveDb(audioCtx, freq, gainDb, qValue, w) {
  if (!audioCtx || !Number.isFinite(freq) || !Number.isFinite(gainDb) || !Number.isFinite(qValue)) return null;
  const freqs = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) freqs[i] = faXToF((i / (CURVE_POINTS - 1)) * w, w);
  const mag = new Float32Array(CURVE_POINTS);
  const phase = new Float32Array(CURVE_POINTS);
  const filter = audioCtx.createBiquadFilter();
  filter.type = "peaking";
  filter.frequency.value = freq;
  filter.Q.value = qValue;
  filter.gain.value = gainDb;
  filter.getFrequencyResponse(freqs, mag, phase);
  const db = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) db[i] = 20 * Math.log10(Math.max(mag[i], 1e-6));
  return db;
}

const MAX_ABS_DB = 12;
function drawBellCurve(ctx2d, w, h, db, color, alpha) {
  const plotBottom = h - AXIS_H;
  const curveTop = CURVE_TOP, curveBottom = plotBottom - 6;
  const midY = curveTop + (curveBottom - curveTop) * 0.55;
  const bandH = (curveBottom - curveTop) * 0.42;
  const yAt = i => {
    const d = Math.max(-MAX_ABS_DB, Math.min(MAX_ABS_DB, db[i]));
    return midY - (d / MAX_ABS_DB) * bandH;
  };
  ctx2d.save();
  ctx2d.beginPath();
  for (let i = 0; i < CURVE_POINTS; i++) {
    const x = (i / (CURVE_POINTS - 1)) * w;
    if (i === 0) ctx2d.moveTo(x, yAt(i)); else ctx2d.lineTo(x, yAt(i));
  }
  ctx2d.strokeStyle = color;
  ctx2d.lineWidth = 3;
  ctx2d.globalAlpha = alpha;
  ctx2d.lineJoin = "round";
  ctx2d.stroke();
  ctx2d.restore();
}

function drawCurveLegend(ctx2d, showGuess) {
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

// Soru sırasında (roundActive) eğri BİLEREK gizli — kulakla bulma ilkesi.
// Sadece cevap sonrası çizilir. state: { audioCtx, activeQuestion, roundActive,
// qGuessLabelId } — qGuessLabelId app.js'in submitQWidthGuess'te sakladığı,
// kullanıcının SEÇTİĞİ etiket id'si; guess eğrisi o etiketin TEMSİLİ Q'suyla
// (qCenter, kendi aralığının geometrik ortalaması) çizilir — freq/gain HER
// ZAMAN true değerlerle AYNI (kullanıcı onları guess ETMEDİ, sadece genişliği).
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  // G83: eksen artık app.js'ten MERKEZİ çiziliyor — burada TEKRAR çağrılırsa
  // ızgara İKİ KEZ çizilirdi.
  const { audioCtx, activeQuestion: q, roundActive, qGuessLabelId } = state;
  if (!q || roundActive) return;

  const correctDb = computeEqCurveDb(audioCtx, q.freq, q.gainDb, q.q, w);
  const guessLabel = qGuessLabelId ? labelById(qGuessLabelId) : null;
  const guessDb = guessLabel ? computeEqCurveDb(audioCtx, q.freq, q.gainDb, guessLabel.qCenter, w) : null;
  if (!correctDb && !guessDb) return;

  if (guessDb) drawBellCurve(ctx2d, w, h, guessDb, GUESS_COLOR, 0.85);
  if (correctDb) drawBellCurve(ctx2d, w, h, correctDb, CORRECT_COLOR, 0.85);

  drawCurveLegend(ctx2d, !!guessDb);
}

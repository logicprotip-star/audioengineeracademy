// "Kompresör" — Motor 2'nin İLK modu ("Hangisi Farklı", A/B/C karşılaştırma).
// Motor 1'in beş modundan (Frekans Bulma/Kesim Noktası/Q/Boost-Cut/dB) FARKLI bir
// OYUN TİPİ — orada "bir DEĞERİ bul" soruluyordu, burada "ÜÇ sesten FARKLI olanı
// bul" (odd-one-out). Aynı merkezi zorluk eğrisi + geri bildirim akışı + mod
// sözleşmesi ALTYAPISINI kullanıyor — SoundGym'in "Dr. Compressor" oyununun
// felsefesine yakın (kompresyon miktarını tanıma) ama üç-şıklı (%33 şans,
// BİLEREK zor) odd-one-out formatında.
//
// ═══════════════════════════════════════════════════════════════════════════
// MOTOR 2 ŞABLONU — bu dosya G30'da ilk yazıldı, G33'te (derin araştırma
// sonrası) mimarisi OTURTULDU. Gelecekteki Motor 2 modları (Reverb, Distortion,
// Tonal Denge) buradaki ÜÇ deseni miras almalı:
//
//   1. TEK ALGISAL EKSEN + BİRLEŞİK PARAMETRELER: gerçek ses işleme tek bir
//      parametreyle tanımlanmaz (kompresyonda ratio+threshold EL ELE çalışır —
//      "ne kadar VE nereden"). Ama odd-one-out'un net kalması için kullanıcıya
//      TEK bir algısal fark sunulmalı. Çözüm: parametreleri tek bir "yoğunluk"
//      kontrol değişkenine (k ∈ [0,1]) bağla — k arttıkça TÜM alt parametreler
//      birlikte "daha fazla efekt" yönünde hareket eder (bkz. aşağıda ratioAtK/
//      thresholdAtK). Zorluk eğrisi SADECE k'nin farkını (kGap) üretir, ama
//      gerçek ses motoru İKİ (ya da daha fazla) gerçek parametre kullanır.
//      Reverb için bu decay+mix+size olabilir, hepsi kendi r(k)/m(k)/s(k)
//      fonksiyonlarıyla TEK bir k'ye bağlanır.
//   2. previewLetter (previewRatio DEĞİL): app.js'in A/B/C önizleme butonu
//      hangi varyantı dinleteceğini `question.previewLetter` ile bildirir —
//      `applyProcessing` o harfin TÜM parametrelerini `question.variants`'tan
//      okur. Tek bir "previewX" alanı YOK — kaç parametre olursa olsun aynı
//      mekanizma çalışır (bkz. applyProcessing).
//   3. Öğretim şablonları TEK yerde (bkz. COMPRESSION_TIERS) — mix dilinde,
//      "ikisi de X kademesindeyse nüans dili, farklı kademedeyse net dil"
//      ayrımı (bkz. teachingText) gelecekteki modlarda da aynı desen.
// ═══════════════════════════════════════════════════════════════════════════
//
// Bu dosya bir ŞABLON niyetiyle yazıldı — Motor 2'nin SONRAKİ modları (Reverb,
// Distortion) AYNI üç-ses/odd-one-out iskeletini (createQuestion'ın variants[]
// şekli, app.js'in abToggle 3-yönlü genişletmesi) izleyebilir. Şimdilik ortak
// bir soyutlama ÇIKARILMADI (bu projenin YERLEŞİK kararı — "3. modda bile
// ortak bir özütlemeyi haklı çıkaracak kadar gerçek tekrar ağrısı netleşmedi",
// bkz. submitCutoffGuess/submitLevelGuess'in dosya başı notları) — gerçek
// tekrar ağrısı Motor 2'nin 2. modunda netleşirse o zaman ortak bir çekirdek
// çıkarılabilir (app.js'in `activeQuestion.mode === "kompresor"` dallarının
// "bu mod 3-yönlü önizleme destekliyor mu" gibi bir yetenek bayrağına
// genelleştirilmesi dahil).
//
// MANTIK: 3 ses (A/B/C) çalınır, AYNI kaynaktan (kompresyon İZOLE duyulsun —
// kaynak/frekans/gain farkı YOK, SADECE dinamik). İkisi AYNI kompresyon
// yoğunluğunda (k), biri (oddIndex, rastgele konumda) FARKLI. Kullanıcı A/B/C
// dinleme kontrolüyle (bkz. app.js: mevcut abToggle 3'e genişletildi, YENİ
// soruda OTOMATİK döngüye giriyor — bkz. G32) üçünü de dinleyip FARKLI olanı
// üç şıktan (A/B/C, HER ZAMAN tam 3) işaretler.
//
// İZOLASYON İLKESİ (Q Genişliği'nin AYNI felsefesi, ARAŞTIRMA DERSİ): knee/
// attack/release HER ZAMAN sabit (COMP_KNEE_DB/ATTACK_SEC/RELEASE_SEC) — hız
// DEĞİŞMEZ, çünkü değişirse "hangisi daha sıkışmış" sorusunun net cevabı
// kalmaz (yavaş attack'lı ses daha AZ sıkışmış DUYULUR ama daha ÇOK
// sıkışmıştır — sinyal bulanır, SoundGym Dr. Compressor'ın attack/release'i
// sabit-hızlı tutma sebebi budur). SADECE ratio+threshold (BİRLİKTE, tek k
// ekseninden türetilerek) değişir — gerçek kompresyonda bu ikili EL ELE
// çalışır ("ne kadar VE nereden sıkışıyor"), G30'un SADECE-ratio tasarımı
// yarı-gerçekçiydi.
//
// Soru SADE (3 şık, hep A/B/C), geri bildirim ZENGİN: FARKLI olanın ratio+
// threshold+gain-reduction değeri + mix anlamı cevap sonrası açıklanıyor.
//
// Mod sözleşmesi diğer beşiyle AYNI (getMeta/createQuestion/applyProcessing/
// evaluateAnswer/calculateXP/getFeedbackData) + aynı-isimli render yardımcıları.
// Merkezi zorluk eğrisine Boost/Cut'ın (G25) BAŞTAN-doğru-kalibrasyon + Q
// Genişliği'nin (G29) FELSEFE-öncelikli tasarım dersleriyle bağlandı.
//
// KAYNAK: kompresyon en zor duyulan beceri; ince kompresyon transient-olmayan
// kaynakta (vokal/string) neredeyse duyulmaz. Tüm kaynaklar AÇIK kalıyor
// (kullanıcı istediğini seçebilir, bu bir kısıtlama DEĞİL) — ama davul/
// perküsyon/groove gibi TRANSIENT kaynaklar kompresyonu çok daha net ortaya
// çıkarır (transient'in "ezilmesi" kulakla kolayca duyulur). Varsayılan kaynak
// (pink noise, diğer beş modla PAYLAŞILAN varsayılan) BİLEREK değiştirilmedi —
// hangi belirli örnek dosyasının "doğru" varsayılan olacağı bir ürün kararı
// (bkz. CLAUDE.md "Ürün kararı verme"), burada sadece NOT edildi.
//
// SADECE ŞIKLI (choiceOnly:true) — diğer dört yeni modla AYNI karar.

import { compatibleSourceIds } from "../core/source-catalog.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound, drawSpectrumBackground } from "./frekans-bulma.js";
import { logLerp, applyPostCapFloor } from "../core/difficulty-curve.js";
import { GUESS_COLOR, CORRECT_COLOR } from "../core/feedback-colors.js";
import { renderThreeWayCards, markThreeWayCards, updateThreeWayCardsPlayState } from "../core/three-way-cards.js";

// app.js'in GENEL görselleştiricisi (drawVisualizer/drawSpectrumBars) BU sabitleri
// HER moddan mode-agnostik olarak okur — diğer beş modla AYNI re-export deseni
// (Kompresör'ün KENDİSİ frekansla İLGİLENMİYOR ama paylaşılan arka plan çizimi
// bunları koşulsuz okuyor).
export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound, drawSpectrumBackground };

export const MODE_ID = "kompresor";
export const MAX_LIVES = 5;
// Motor 2'nin ("A/B/C odd-one-out") HANGİ modları kapsadığını app.js TEK
// yerde (THREE_WAY_MODE_IDS) tutuyor — bu bayrak SADECE dokümantasyon/
// kendi-kendini-açıklama amaçlı (G35'te Reverb bunu MİRAS ALDI).
export const THREE_WAY = true;

// G47: Sınav sistemi (core/exam-system.js) PİLOT modu — SHOW_SPECTRUM/
// COMPACT_ANALYZER'ın AYNI mode-agnostik bayrak deseni: app.js
// `mode.EXAM_ENABLED` okuyup parkur/sınav/telafi akışını devreye sokuyor,
// `mode.EXAM_DIFFICULTY` sınav sorularının HANGİ statik DIFFICULTY[level]
// zorluğunda üretileceğini belirliyor ("zorlaştırılmış" — task'ın kararı).
// Export ETMEYEN diğer yedi mod bu turda HİÇ etkilenmiyor (varsayılan
// undefined/false, app.js'in exam dalları hiç çalışmıyor).
export const EXAM_ENABLED = true;
export const EXAM_DIFFICULTY = "pro";

// ═══════════════════════════════════════════════════════════════════════════
// KOMPRESYON YOĞUNLUĞU (k) — RATIO + THRESHOLD'un TEK bir algısal eksene
// (k ∈ [0,1], "ne kadar sıkışmış") bağlı BİRLİKTE hareket etmesini sağlayan
// TEK kontrol değişkeni (bkz. dosya başındaki "MOTOR 2 ŞABLONU" notu). k
// arttıkça:
//   - ratio yükselir (COMP_RATIO_MIN_PRACTICAL → COMP_RATIO_MAX_PRACTICAL)
//   - threshold DÜŞER (COMP_THRESHOLD_HIGH_DB → COMP_THRESHOLD_LOW_DB) —
//     daha az sinyal eşiğin üstünde kalır, kompresör daha ERKEN devreye girer
// İkisi BİRLİKTE "sıkışma miktarı"nı (gain reduction, dB — bkz. gainReductionDb)
// belirler. Aralıklar DynamicsCompressorNode'un GERÇEK [RATIO_MIN,RATIO_MAX]
// sınırının (spesifikasyon) İÇİNDE kalan, oyun için "pratik" bir alt küme.
// KULAKLA DOĞRULANMADI — diğer beş modun AYNI dürüstlük notu, makul bir
// başlangıç noktası, kesin nihai sayı iddia edilmiyor.
export const RATIO_MIN = 1; // DynamicsCompressorNode.ratio'nun spesifikasyon ALT sınırı
export const RATIO_MAX = 20; // DynamicsCompressorNode.ratio'nun spesifikasyon ÜST sınırı
export const COMP_RATIO_MIN_PRACTICAL = 1.3; // k=0 — neredeyse sıkıştırılmamış
export const COMP_RATIO_MAX_PRACTICAL = 14; // k=1 — ekstrem, bariz ezme
export const COMP_THRESHOLD_HIGH_DB = -8; // k=0 — sadece en tepe darbeleri yakalar
export const COMP_THRESHOLD_LOW_DB = -34; // k=1 — sinyalin çoğu eşiğin üstünde kalır
export const COMP_KNEE_DB = 6; // dB — orta-sert diz, HER ZAMAN sabit (izolasyon ilkesi)
export const COMP_ATTACK_SEC = 0.003; // 3ms — HIZLI, HİÇBİR zorlukta değişmez (araştırma dersi)
export const COMP_RELEASE_SEC = 0.15; // 150ms — SoundGym Dr. Compressor'a yakın, HİÇBİR zorlukta değişmez
export const COMP_BASE_K = 0.5; // "aynı" ikilinin sabit referans yoğunluğu — [0,1]'in ORTASI,
// böylece FARKLI olan k=0.5'ten iki yöne de (daha çok/az sıkışmış) SİMETRİK
// uzaklaşabilir, hiçbir zorlukta clamp'e (0 ya da 1 sınırına) çarpmaz (bkz.
// pickOddK) — G30'un merkezi olmayan COMP_BASE_RATIO=3.5 tasarımının aksine,
// buradaki simetri "kolaylaşma yok" hesaplarını da BASİTLEŞTİRİYOR.
// Gain-reduction HESABI için varsayılan/nominal bir "sinyal eşiğin ne kadar
// üstünde" değeri — GERÇEK ses ölçümü DEĞİL, ratio+threshold'u TEK bir dB
// farkına indirgemek için kullanılan bir TASARIM sabiti (KULAKLA/ÖLÇÜMLE
// DOĞRULANMADI).
export const COMP_REF_LEVEL_DB = -6;

// SAF FONKSİYON.
export function ratioAtK(k) {
  return COMP_RATIO_MIN_PRACTICAL + k * (COMP_RATIO_MAX_PRACTICAL - COMP_RATIO_MIN_PRACTICAL);
}
// SAF FONKSİYON.
export function thresholdAtK(k) {
  return COMP_THRESHOLD_HIGH_DB + k * (COMP_THRESHOLD_LOW_DB - COMP_THRESHOLD_HIGH_DB);
}
// SAF FONKSİYON. Statik bir kompresör transfer eğrisi yaklaşıklığı: sinyal
// eşiğin (threshold) refLevel kadar üstündeyse, "aşan" kısım (refLevel-
// threshold) ratio'ya göre azaltılır — azaltılan miktar (dB) = gain
// reduction. refLevel HER ZAMAN COMP_THRESHOLD_HIGH_DB'nin üstünde kalacak
// şekilde seçildi (bkz. COMP_REF_LEVEL_DB notu) — bu yüzden k arttıkça
// (ratio↑ VE threshold↓ ikisi de) gainReductionDb KESİNTİSİZ/MONOTON artar,
// asla küçülmez (testle doğrulandı).
export function gainReductionDb(ratio, threshold, refLevel = COMP_REF_LEVEL_DB) {
  if (refLevel <= threshold) return 0;
  return (refLevel - threshold) * (1 - 1 / ratio);
}

// ═══════════════════════════════════════════════════════════════════════════
// STATİK DIFFICULTY — diğer beş modla AYNI ikili rol: (a) settings.
// difficultyPosition verilmezse fallback, (b) "Sabit" modun tier-adı çapası,
// (c) proplus için tek kaynak (eğri proplus'a hiç uygulanmıyor, Z5 kararı).
// `options` alan adı diğer modlarla AYNI SEBEPTEN korunuyor (app.js:
// renderLevelSheet TÜM modların DIFFICULTY[level].options'ını GENERİK okuyor).
// kGap: FARKLI olanın k'sinin COMP_BASE_K'dan ne kadar UZAKTA olacağı —
// küçük=zor (üç ses birbirine benziyor). ARAŞTIRMA DERSİ (öğretmen yöntemi):
// kolay = EKSTREM fark (bariz ezme), zorlukla ince nüansa iniyor.
//
// KULAKLA DOĞRULANMADI — diğer beş modun AYNI dürüstlük notu.
export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 14, options: 3, time: 16, lives: MAX_LIVES, kGap: 0.45 },
  medium: { label: "Orta", xp: 22, options: 3, time: 13, lives: MAX_LIVES, kGap: 0.30 },
  hard: { label: "Zor", xp: 32, options: 3, time: 11, lives: MAX_LIVES, kGap: 0.15 },
  pro: { label: "Pro", xp: 46, options: 3, time: 9, lives: MAX_LIVES, kGap: 0.06 },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 46, options: 3, time: 9, lives: MAX_LIVES, kGap: 0.06 }
};

// ═══════════════════════════════════════════════════════════════════════════
// ZORLUK EĞRİSİ — Boost/Cut'ın (G25) BAŞTAN-doğru-kalibrasyon yöntemiyle
// bağlı. AT_1 statik easy değeriyle birebir aynı. AT_CAP + FLOOR ikili
// aramayla İKİ koşulu birlikte sağlayacak şekilde ÖNCEDEN çözüldü:
//   (1) representativeLevelForTier'ın HİÇBİR temsilci seviyesinde eski
//       statik tablodan kolay çıkmıyor ("kolaylaşma yok" — bkz. test),
//   (2) K_GAP_FLOOR'da bile |gainReductionDb farkı| >= ~1.2 dB (kulağın
//       ayırt edebileceği varsayılan bir alt sınır — KULAKLA DOĞRULANMADI,
//       ama sıfıra/algılanamaz bir farka ASLA inmiyor).
// Hesap (node ile doğrudan doğrulandı): K_GAP_FLOOR=0.046 → GR farkı 1.20dB;
// representativeLevelForTier: easy(4)=0.3256≤0.45, medium(8)=0.2115≤0.30,
// hard(12)=0.1374≤0.15, pro(20)=0.0580≤0.06 — hepsi eski statikten en az o
// kadar zor.
export const COMP_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  K_GAP_AT_1: 0.45,
  K_GAP_AT_CAP: 0.058,
  K_GAP_FLOOR: 0.046,
  K_GAP_REDUCTION_PER_STEP: 0.001,

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

  const kGapCurve = logLerp(config.K_GAP_AT_1, config.K_GAP_AT_CAP, t);
  const timeCurve = logLerp(config.TIME_SEC_AT_1, config.TIME_SEC_AT_CAP, t);

  return {
    position: safePos,
    kGap: applyPostCapFloor(kGapCurve, safePos, config.LEVEL_CAP, config.K_GAP_FLOOR, config.K_GAP_REDUCTION_PER_STEP),
    timeSec: applyPostCapFloor(timeCurve, safePos, config.LEVEL_CAP, config.TIME_SEC_FLOOR, config.TIME_SEC_REDUCTION_PER_STEP)
  };
}

// SAF FONKSİYON. dB Seviyesi'nin pickDbDelta'sıyla AYNI (G24'te ÖĞRENİLEN
// dersler BAŞTAN uygulandı): ±%6 dar jitter (seans rampasının küçük ama
// gerçek eğilimini BOĞMASIN) + jitter SONRASI K_GAP_FLOOR garantisi (Math.max) —
// floor'un jitter'la delinmesi G24'te ÖLÇÜLEN gerçek bir hataydı, burada
// baştan önleniyor.
export function pickKGap(baseKGap, rng = Math.random) {
  const jitter = 0.94 + rng() * 0.12; // 0.94x – 1.06x
  const jittered = baseKGap * jitter;
  return Math.max(COMP_CURVE_CONFIG.K_GAP_FLOOR, jittered);
}

// SAF FONKSİYON. base'den (COMP_BASE_K) rastgele bir yönde (daha ÇOK ya da
// daha AZ sıkıştırılmış) kGap kadar uzaklaşan bir k üretir — [0,1] dışına
// ASLA taşmaz. COMP_BASE_K=0.5 (aralığın ORTASI) ve K_GAP_AT_1=0.45 < 0.5
// olduğu İÇİN pratikte clamp'e hiç gerek kalmıyor (en kolay turda bile
// 0.5±0.45 = [0.05, 0.95], [0,1] içinde) — G30'un merkezi-olmayan tasarımının
// AKSİNE iki yön SİMETRİK zorluk üretir.
export function pickOddK(base, kGap, rng = Math.random) {
  const direction = rng() < 0.5 ? 1 : -1;
  const raw = base + direction * kGap;
  return Math.min(1, Math.max(0, raw));
}

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    motor: 2,
    kulaklikGerekli: false,
    // Pembe/beyaz gürültü dışlanır — transient (atak) içermiyor, kompresyonun
    // gain-reduction'ı (atağı bastırma) kulakla ayırt edilemiyor. Transient içeren
    // kaynaklar (davul/enstrüman/synth/upload) kalıyor (bkz. source-catalog.js
    // noTransient notu).
    uyumluKaynaklar: compatibleSourceIds({ requireTransient: true }),
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
// difficultyPosition — verilirse kGap/timeSec EĞRİDEN gelir, verilmezse
// (mevcut testler, doğrudan çağrılar, proplus) statik DIFFICULTY[level]
// davranışı korunur }.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "pink";

  const curve = (level !== "proplus" && Number.isFinite(settings.difficultyPosition))
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  const baseKGap = curve ? curve.kGap : diff.kGap;
  const timeSec = curve ? curve.timeSec : diff.time;

  const oddIndex = Math.floor(Math.random() * 3);
  const kGap = pickKGap(baseKGap);
  const oddK = pickOddK(COMP_BASE_K, kGap);

  const letters = ["A", "B", "C"];
  const variants = letters.map((letter, i) => {
    const k = i === oddIndex ? oddK : COMP_BASE_K;
    const ratio = ratioAtK(k);
    const threshold = thresholdAtK(k);
    return { letter, k, ratio, threshold, gainReductionDb: gainReductionDb(ratio, threshold) };
  });
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
  return "A/B/C ile üçünü de dinle, FARKLI kompresyonlu olanı (dinamiği ne kadar daraltılmış) şıklardan seç.";
}

export function correctLabel(question) {
  const odd = question.variants[question.oddIndex];
  return `${odd.letter} (ratio ${odd.ratio.toFixed(1)}:1, GR ${odd.gainReductionDb.toFixed(1)}dB)`;
}

// Soruda uygulanan kompresyonu audioCtx üzerinde kurar. question.previewLetter
// VERİLİRSE (app.js'in 3-yönlü abToggle'ının o an dinletmek istediği harf) O
// harfin TÜM parametreleri (ratio+threshold) question.variants'tan okunur;
// verilmezse (turun İLK çalışı, henüz hiçbir A/B/C butonuna basılmamış)
// variants[0] (harf A) çalar. previewLetter (previewRatio DEĞİL) — MOTOR 2
// ŞABLONU: kaç parametre olursa olsun AYNI mekanizma çalışır, bkz. dosya başı
// not.
export function applyProcessing(question, { audioCtx }) {
  const letter = question.previewLetter || question.variants[0].letter;
  const variant = question.variants.find(v => v.letter === letter) || question.variants[0];
  const comp = audioCtx.createDynamicsCompressor();
  comp.threshold.value = variant.threshold;
  comp.knee.value = COMP_KNEE_DB;
  comp.ratio.value = variant.ratio;
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
// ÖĞRETİCİ METİN — soru SADE, geri bildirim ZENGİN: FARKLI olanın kompresyon
// karakteri + mix anlamı TEK yerde, HER zaman gösterilir. MOTOR 2 ŞABLONU:
// kademe tablosu (COMPRESSION_TIERS) + "aynı kademe mi farklı kademe mi"
// ayrımı (teachingText) — gelecekteki modlar (reverb/distortion) kendi
// kademe tablolarıyla AYNI deseni izleyebilir.
// ═══════════════════════════════════════════════════════════════════════════

// SAF VERİ. Kademe sınırları gainReductionDb üzerinde — COMP_BASE_K=0.5'in
// GR'si (~13dB) "orta" kademenin İÇİNDE düşecek şekilde seçildi (node ile
// doğrulandı), aralık [~0.5dB, ~26dB] arasında dört kademeyi kapsar.
const COMPRESSION_TIERS = [
  { max: 3, word: "hafif kompresyon", detail: "dinamik geniş kalır, ses canlı ama kontrolsüz kalabilir, mixte öne fırlayabilir" },
  { max: 9, word: "orta kompresyon", detail: "dengeli, dinamiği hafifçe kontrol altına alır" },
  { max: 17, word: "belirgin kompresyon", detail: "dinamik gözle görülür şekilde daralır, ses mixte oturmaya başlar" },
  { max: Infinity, word: "ağır kompresyon", detail: "dinamik ÇOK dar, ses tamamen mixte oturur, öne fırlamaz ama tutarlı kalır" }
];

function compressionTier(gr) {
  return COMPRESSION_TIERS.find(t => gr < t.max) || COMPRESSION_TIERS[COMPRESSION_TIERS.length - 1];
}

// SAF FONKSİYON. Mix dili — Kesim Noktası'nın ZONE_EFFECT/Q Genişliği'nin
// mixText desenindeki AYNI TEK-YERDE-şablon felsefesi.
export function compressionWord(gr) {
  const tier = compressionTier(gr);
  return `${tier.word} — ${tier.detail}`;
}

// SAF FONKSİYON. İki varyant AYNI kademedeyse (ince nüans — kolaylık aynı
// KELİMEyle iki kere geçmesin diye "ikisi de X, biri daha Y" dili), FARKLI
// kademedeyse net "bu tür kompresyon" dili (araştırma dersi: kolay/ekstrem
// turlarda net kontrast, zor/ince turlarda nüans dili).
export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);
  const odd = question.variants[question.oddIndex];
  const same = question.variants.find((v, i) => i !== question.oddIndex);
  const oddTier = compressionTier(odd.gainReductionDb);
  const sameTier = compressionTier(same.gainReductionDb);

  let base;
  if (oddTier === sameTier) {
    const heavier = odd.gainReductionDb > same.gainReductionDb;
    const yonMetni = heavier ? "daha ağır" : "daha hafif";
    const mixMetni = heavier ? "mixte daha geride/oturmuş durur" : "biraz daha dinamik/canlı kalır";
    base = `İkisi de ${sameTier.word} durumundaydı, ${odd.letter} ${yonMetni} — ${mixMetni}.`;
  } else {
    base = `${odd.letter} farklıydı (ratio ${odd.ratio.toFixed(1)}:1, threshold ${odd.threshold.toFixed(0)} dB) — ${compressionWord(odd.gainReductionDb)}.`;
  }

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
  const same = question.variants.find((v, i) => i !== question.oddIndex);
  return odd.gainReductionDb > same.gainReductionDb ? "Farklı olan DAHA ÇOK kompresyonlu" : "Farklı olan DAHA AZ kompresyonlu";
}

export function renderHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}
export function clearHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}

// Dinleme kontrolü artık #freqGuessArea'da DEĞİL — app.js'in mevcut A/B
// butonu (#abToggle) bu mod aktifken 3-yönlü döngüye genişletiliyor (bkz.
// app.js: toggleAB/updateAbToggleUI'nin "kompresor" dalı). Bu yüzden
// #freqGuessArea diğer dört modla AYNI şekilde gizli kalıyor.
export function renderGuessAreaControls(freqGuessAreaEl) {
  if (!freqGuessAreaEl) return;
  freqGuessAreaEl.textContent = "";
  freqGuessAreaEl.classList.add("hidden");
}

// G41: büyük kart görseli (harf+isim+waveform+durum) — core/three-way-cards.js'e
// delege edilir (Reverb'le PAYLAŞILAN, gerçek bir mod-özel fark YOK). Mod
// sözleşmesi bu isimlerle export edilmesini istiyor, gövde ORTAK modülde.
export const renderAnswerChoices = renderThreeWayCards;
export const markAnswerChoices = markThreeWayCards;
export const updateAnswerPlayState = updateThreeWayCardsPlayState;

// ═══════════════════════════════════════════════════════════════════════════
// GÖRSEL — diğer modların frekans-yanıtı eğrisinin AKSİNE, kompresyonun
// frekans ekseni YOK — burada gösterilen "DİNAMİK ZARF" (basit bir genlik-
// zaman temsili): dar/düz zarf = sıkışmış (yüksek gain reduction), geniş/
// dalgalı zarf = açık (düşük gain reduction). Gerçek bir ses ANALİZİ DEĞİL —
// sentetik, SADECE gainReductionDb değerinden türetilen İLLÜSTRATİF bir eğri
// (audioCtx'e HİÇ ihtiyaç yok, diğer modların getFrequencyResponse'undan
// FARKLI). ratio TEK BAŞINA değil, ratio+threshold'un BİRLEŞİK etkisi
// (gainReductionDb) çiziliyor — G30'un sadece-ratio tasarımının aksine artık
// görsel de "tek algısal eksen" ilkesini yansıtıyor.
// ═══════════════════════════════════════════════════════════════════════════

const ENV_POINTS = 200;
const MAX_PLAUSIBLE_GR_DB = 30; // gainReductionDb'nin pratik üst sınırı (k=1'de ~26dB) — görsel ölçekleme İÇİN
function computeEnvelopeY(gr, w, h) {
  const plotBottom = h - AXIS_H;
  const curveTop = CURVE_TOP, curveBottom = plotBottom - 6;
  const midY = (curveTop + curveBottom) / 2;
  const bandH = (curveBottom - curveTop) * 0.42;
  // GR arttıkça genlik küçülür (dinamik daralır) ama HİÇBİR ZAMAN sıfıra
  // inmez (GR=30dB'de bile hafif bir kıpırtı kalır — "tamamen düz çizgi"
  // gerçekçi değil, limiter'da bile mikro-dinamik vardır).
  const compressionFactor = Math.max(0.08, 1 - gr / MAX_PLAUSIBLE_GR_DB);
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
// guessLetter } — guessLetter app.js'in (G35'ten beri Reverb'le PAYLAŞILAN,
// mode-agnostik) submitThreeWayGuess'te sakladığı, kullanıcının SEÇTİĞİ harf;
// guess zarfı o harfin GERÇEK gainReductionDb'siyle çizilir (diğer modların
// AKSİNE burada "temsili" bir değere gerek yok — her harfin GERÇEK
// parametreleri zaten question.variants içinde mevcut).
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  const { activeQuestion: q, roundActive, guessLetter } = state;
  if (!q || roundActive) return;

  const correctVariant = q.variants[q.oddIndex];
  const guessVariant = guessLetter ? q.variants.find(v => v.letter === guessLetter) : null;

  const correctYs = computeEnvelopeY(correctVariant.gainReductionDb, w, h);
  const guessYs = guessVariant ? computeEnvelopeY(guessVariant.gainReductionDb, w, h) : null;

  if (guessYs) drawEnvelope(ctx2d, w, guessYs, GUESS_COLOR, 0.85);
  drawEnvelope(ctx2d, w, correctYs, CORRECT_COLOR, 0.85);

  drawEnvelopeLegend(ctx2d, !!guessYs);
}

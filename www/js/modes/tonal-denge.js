// "Tonal Denge" — G45: TrainYourEars tarzı CANLI EQ DÜZELTME modu. Motor 2'de
// duruyor (menüde "Hangisi farklı" grubunun altında, G44'ten miras) ama ARTIK bir
// "hangisi farklı" (odd-one-out) oyunu DEĞİL — three-way-cards.js'i HİÇ KULLANMIYOR,
// Kompresör/Reverb'in A/B/C şablonundan TAMAMEN AYRIŞTI (task'ın açık kararı).
// G44'ün odd-one-out kodu (variants/oddIndex/choices/shape/imbalanceScore, three-way
// render delegasyonu) BURADAN TAMAMEN KALDIRILDI — ölü kod bırakılmadı.
//
// ═══════════════════════════════════════════════════════════════════════════
// MEKANİK
// ═══════════════════════════════════════════════════════════════════════════
// Ses çalar (groove/upload — dolu mix bağlamı, bkz. getMeta). Uygulama GİZLİ bir
// tonal bozukluk uygular: N bandın (4/5/6, SEANS İÇİ soru sırasına göre artar —
// bkz. bandCountForSessionIndex) bir KISMINA ya da TÜMÜNE EQ kayması (peaking/shelf
// gain, bkz. bandsForQuestion). Kullanıcı HER bant için bir kaydırıcıyı CANLI
// oynatarak sesi nötüre (düz/dengeli) geri getirmeye çalışır — kaydırdıkça ses
// GERÇEK ZAMANLI değişir. Bu, audio-engine.js'in filtre zincirini YENİDEN
// KURMADAN çalışır: applyProcessing SADECE round başında BİR KEZ çağrılır (üç-yönlü
// modların aksine burada bir A/B/C önizleme döngüsü YOK), N BiquadFilterNode kurar
// ve referanslarını modül-seviyesi bir değişkende (liveBandNodes) SAKLAR — app.js
// kaydırıcı her hareket ettiğinde setLiveBandGain() ile O DÜĞÜMÜN gain'ini DOĞRUDAN
// (grafiği bozmadan, tıklama riski olmadan, setTargetAtTime ile yumuşak) günceller.
//
// Puanlama: her bantta KALAN sapma (bugDb + kullanıcının düzeltmesi) HESAPLANIR —
// mükemmel düzeltme residual=0 demektir. Ortalama sapma → yakınlık skoru (0-100).
// evaluateAnswer SAF kalır (audioCtx'e hiç dokunmaz, sadece question.bands +
// kullanıcının {bandId: correctionDb} haritasını karşılaştırır).
//
// ═══════════════════════════════════════════════════════════════════════════
// KOMPRESÖR/REVERB'DEN MİRAS ALINANLAR (Motor 2 şablonunun HÂLÂ geçerli kısmı)
// ═══════════════════════════════════════════════════════════════════════════
//   - Merkezi zorluk eğrisi (TONAL_CURVE_CONFIG + logLerp + applyPostCapFloor,
//     "kolaylaşma yok" invaryantı, node ile doğrudan hesaplandı).
//   - Öğretim şablonları TEK yerde (BAND_MIX_WORDS).
//   - previewLetter YOK artık (tek "canlı" ses var, A/B/C varyant kavramı yok) —
//     applyProcessing HER ZAMAN question.bands'i okur, previewLetter parametresi
//     G30'dan beri ilk kez bu modda YOK.
//
// three-way-cards.js'in ARTIK kullanılmadığı, THREE_WAY_MODE_IDS'ten çıkarıldığı
// (bkz. app.js) — Kompresör/Reverb DOKUNULMADAN kendi A/B/C akışlarını sürdürüyor,
// bu SADECE Tonal Denge'nin ayrışması.
//
// KAYNAK (G44'ten DEĞİŞMEDİ): tilt/EQ düzeltmesi SADECE dolu spektrumda anlamlı —
// SADECE "groove" (davul döngüsü, gerçek mix bağlamı) + "upload" (kullanıcının
// kendi dosyası, içeriği bilinmediği için varsayılan AÇIK).
//
// KULAKLA DOĞRULANMADI — diğer sekiz modun AYNI dürüstlük notu: sayılar makul bir
// BAŞLANGIÇ noktası, kesin nihai değer iddia edilmiyor.

import { compatibleSourceIds } from "../core/source-catalog.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound, drawSpectrumBackground } from "./frekans-bulma.js";
import { logLerp, applyPostCapFloor } from "../core/difficulty-curve.js";
import { GUESS_COLOR, CORRECT_COLOR } from "../core/feedback-colors.js";

// app.js'in GENEL görselleştiricisi (drawVisualizer/drawSpectrumBars) BU sabitleri
// HER moddan mode-agnostik olarak okur — diğer sekiz modla AYNI re-export deseni.
export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound, drawSpectrumBackground };

export const MODE_ID = "tonal-denge";
export const MAX_LIVES = 5;
// G44'ün THREE_WAY=true export'u BİLEREK KALDIRILDI — bu mod artık three-way
// DEĞİL, app.js THREE_WAY_MODE_IDS listesinden de çıkarıldı (bkz. o dosya).

// G46: SHOW_SPECTRUM'un (db-seviyesi.js) AYNI mode-agnostik bayrak deseni —
// app.js `mode.COMPACT_ANALYZER` okuyup #analyzer'a bir modifier class ekliyor
// (styles.css: #visualizer'ın yüksekliğini küçültüyor). Gerekçe: altı bandlık
// (SUB→TİZ) kaydırıcı listesi normal (280px) spektrumun ALTINDA kalıp fazladan
// kaydırma gerektiriyordu — spektrum GÖRSEL/dekoratif olarak KALIYOR (gerçek
// bozukluğu göstermiyor, sadece "ses akıyor" hissi veriyor), sadece daha az yer
// kaplıyor. Export ETMEYEN diğer sekiz mod varsayılan false/undefined ile
// ETKİLENMEDİ.
export const COMPACT_ANALYZER = true;

// G50: Sınav sistemi — Kompresör pilotunun AYNI EXAM_ENABLED/EXAM_DIFFICULTY
// deseni. EXAM_WEAK_AREA export EDİLMEDİ — bu mod dB Seviyesi/Kompresör/
// Reverb'le AYNI zayıf-KADEME telafisini kullanır (task kararı: "dB/Reverb/
// Tonal Denge → zayıf ZORLUK KADEMESİ"). Bu mod odd-one-out DEĞİL (bkz. dosya
// başı not) — submitTonalDengeGuess kendi handleExamOutcome çağrısını
// SahibiDİR (bkz. app.js). EXAM_DIFFICULTY="pro" disturbDb'yi (ince bozukluk)
// zaten zorlaştırır; "daha fazla bant" AYRI bir eksen olduğu için app.js
// SADECE bu modun okuduğu settings.examBandBoost bayrağıyla (bkz. createQuestion
// altındaki not) sınav sorularını HER ZAMAN 6 banda (BAND_SET_6) sabitler —
// diğer yedi mod bu bayrağı hiç okumadığı için ETKİLENMEZ.
export const EXAM_ENABLED = true;
export const EXAM_DIFFICULTY = "pro";

// ═══════════════════════════════════════════════════════════════════════════
// BANT TANIMLARI — frekans-bulma.js'in FA_ZONES'undaki (SUB/BAS/ALT-ORTA/ORTA/
// ÜST-ORTA/TİZ) AYNI 6 bölgeden TÜRETİLİR (tek kaynak — sınırlar orada değişirse
// burada da otomatik güncellenir). FA_ZONES kendisi bir MERKEZ frekans TUTMUYOR
// (sadece [a,b) aralığı) — centerFreq burada geometrik ortadan (log ölçekte
// algısal olarak doğru merkez, standart EQ pratiği) TÜRETİLİR.
// ═══════════════════════════════════════════════════════════════════════════
const ZONE_META = [
  { id: "sub", label: "SUB" },
  { id: "bas", label: "BAS" },
  { id: "alt-orta", label: "ALT-ORTA" },
  { id: "orta", label: "ORTA" },
  { id: "ust-orta", label: "ÜST-ORTA" },
  { id: "tiz", label: "TİZ" }
];
export const BAND_DEFS = FA_ZONES.map((zone, i) => ({
  id: ZONE_META[i].id,
  label: ZONE_META[i].label,
  freq: Math.round(Math.sqrt(zone.a * zone.b) * 100) / 100
}));
const BAND_DEFS_BY_ID = Object.fromEntries(BAND_DEFS.map(b => [b.id, b]));
const BAND_ORDER = BAND_DEFS.map(b => b.id); // düşükten yükseğe, KANONİK sıra

// 4 bant = task'ın kendi örneği ("bas/alt-orta/üst-orta/tiz gibi") — SUB ve ORTA
// dışarıda. 5 bant = ORTA geri eklenir (mix netliği için en kritik bölgelerden).
// 6 bant = SUB de eklenir, TAM liste. Kademeli EKLEME (çıkarma değil) — task'ın
// "bant sayısı arttıkça zorlaşır" isteğiyle örtüşür: her yeni bant ekstra bir
// kaydırıcı + ekstra bir "bunu da nötr tut" sorumluluğu demek.
export const BAND_SET_4 = ["bas", "alt-orta", "ust-orta", "tiz"];
export const BAND_SET_5 = ["bas", "alt-orta", "orta", "ust-orta", "tiz"];
export const BAND_SET_6 = ["sub", "bas", "alt-orta", "orta", "ust-orta", "tiz"];

// SAF FONKSİYON.
export function bandIdsForCount(count) {
  if (count <= 4) return BAND_SET_4;
  if (count === 5) return BAND_SET_5;
  return BAND_SET_6;
}

// SAF FONKSİYON. task'ın kararı: Soru 1-4 (index 0-3) → 4 bant, Soru 5-8 (index
// 4-7) → 5 bant, Soru 9+ (index 8+) → 6 bant — "10 Soruluk Bölüm"ün DIŞINDA
// (Serbest/sonsuz modda) da index 8'den sonra 6 bantta SABİT kalır, yeni bir üst
// sınır İCAT EDİLMEDİ (task SADECE soru 9-10'u belirtti, 11+ için doğal uzantı).
export function bandCountForSessionIndex(sessionQuestionIndex) {
  const idx = Math.max(0, Math.floor(sessionQuestionIndex || 0));
  if (idx < 4) return 4;
  if (idx < 8) return 5;
  return 6;
}

// ═══════════════════════════════════════════════════════════════════════════
// KAYDIRICI ARALIĞI — task'ın kendi önerisi (±12dB), orta nokta 0 = nötr.
// ═══════════════════════════════════════════════════════════════════════════
export const SLIDER_MIN_DB = -12;
export const SLIDER_MAX_DB = 12;
export const SLIDER_STEP_DB = 0.5;
const BAND_PEAK_Q = 1.0; // orta bantlar (peaking) için sabit Q — geniş bir "bölge" eğrisi, cerrahi dar bant DEĞİL

// ═══════════════════════════════════════════════════════════════════════════
// STATİK DIFFICULTY — diğer sekiz modla AYNI ikili rol: (a) settings.
// difficultyPosition verilmezse fallback, (b) "Sabit" modun tier-adı çapası,
// (c) proplus için tek kaynak. `options` alanı bu modda SEMANTİK OLARAK
// ANLAMSIZ (renderLevelSheet'in TÜM modlarda GENERİK okuduğu bir "şık sayısı"
// alanı — burada şık YOK, kaydırıcı var; bkz. DURUM.md'nin ÖNCEDEN kaydedilmiş
// "renderLevelSheet TEK bir dil konuşuyor" notu, bu mod da AYNI bilinen boşluğu
// miras alıyor) — SADECE "undefined" yazmasın diye nominal bir değer.
//
// disturbDb: gizli bozukluğun büyüklüğü — küçük=zor (ince, fark edilmesi güç).
// time: diğer modlardan BİLEREK daha UZUN — bu görev TEK bir tıklama değil, N
// kaydırıcıyı dinleye dinleye ayarlamak; tek-cevaplı modların süresiyle
// KIYASLANAMAZ (task'ın "canlı EQ" isteği doğal olarak daha yavaş bir etkileşim).
//
// KULAKLA DOĞRULANMADI — diğer sekiz modun AYNI dürüstlük notu.
export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 18, options: 5, time: 26, lives: MAX_LIVES, disturbDb: 9 },
  medium: { label: "Orta", xp: 28, options: 5, time: 22, lives: MAX_LIVES, disturbDb: 5 },
  hard: { label: "Zor", xp: 40, options: 5, time: 18, lives: MAX_LIVES, disturbDb: 2.8 },
  pro: { label: "Pro", xp: 58, options: 5, time: 15, lives: MAX_LIVES, disturbDb: 1.3 },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 58, options: 5, time: 15, lives: MAX_LIVES, disturbDb: 1.3 }
};

// ═══════════════════════════════════════════════════════════════════════════
// ZORLUK EĞRİSİ — Kompresör/Reverb/dB Seviyesi'nin BAŞTAN-doğru-kalibrasyon
// yöntemiyle bağlı. AT_1'ler statik easy değerleriyle birebir aynı. AT_CAP/FLOOR
// node ile DOĞRUDAN hesaplanıp "kolaylaşma yok" invaryantını sağlayacak şekilde
// ÖNCEDEN çözüldü: disturbDb → easy(4)=6.257≤9, medium(8)=3.853≤5, hard(12)=
// 2.373≤2.8, pro(20)=0.900≤1.3; timeSec → easy(4)=23.3≤26, medium(8)=20.1≤22,
// hard(12)=17.4≤18, pro(20)=13.0≤15 (hepsi rahat bir marjla, testle doğrulandı).
export const TONAL_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  DISTURB_DB_AT_1: 9,
  DISTURB_DB_AT_CAP: 0.9,
  DISTURB_DB_FLOOR: 0.8,
  DISTURB_DB_REDUCTION_PER_STEP: 0.02,

  TIME_SEC_AT_1: 26,
  TIME_SEC_AT_CAP: 13,
  TIME_SEC_FLOOR: 10,
  TIME_SEC_REDUCTION_PER_STEP: 0.3,

  // G95: ZORLUK.md bulgusu — NEUTRAL_TOLERANCE_DB (1.5) SABİT kalırken disturbDb
  // eğrisi position>=16'da (temsilci "pro" aralığının İÇİNDE) bunun ALTINA
  // düşüyordu: 2000 GERÇEK bandsForQuestion+evaluateAnswer denemesinde, HİÇBİR
  // kaydırıcıya dokunmadan en yüksek ortalama sapma 0.958dB ölçüldü (tolerans
  // 1.5dB) — yani en zor kademede mod hiç kaybedilemiyordu. Tolerans artık
  // SABİT DEĞİL, disturbDb'nin KENDİSİNİN bir ORANI (neutralToleranceDb =
  // disturbDb * oran, bkz. paramsForDifficultyPosition) — oran da position'a
  // göre logLerp ile küçülüyor (Z1'de gevşek, Z20'de sıkı).
  //
  // ORAN TAVANI (0.14) YAPISAL bir sınırla belirlendi, keyfi DEĞİL: en kötü
  // durum (bandsForQuestion'ın disturbCount=1 seçtiği, yani 6 banttan SADECE 1
  // TANESİ bozukken diğer 5'i bugDb=0 — avgDeviation bu TEK bandın değeriyle
  // 6'ya BÖLÜNEREK sulanıyor) + jitter'ın en düşük ucu (0.9x) birleşince,
  // "hiç dokunmadan" elde edilebilecek MİNİMUM avgDeviation ≈ disturbDb*0.9/6
  // ≈ disturbDb*0.15'e iniyor — oran bunun ÜSTÜNE çıkarsa "dokunmadan geçme"
  // olasılığı sıfır OLMAKTAN çıkar. 0.14 bu yapısal tavanın altında güvenlik
  // payı bırakıyor; 1.2 milyon denemelik (20 seviye × 3 bant-sayısı × 20000)
  // bir stres testinde HİÇBİR "dokunmadan geçme" bulunamadı (en dar marj
  // pozisyon 1'de: minAvgDeviation - tolerance = 0.09dB, hep pozitif).
  //
  // TOLERANCE_RATIO_AT_CAP (0.045) ise "yakın (±%20 hata payıyla) düzeltmenin
  // Z20'de de İMKÂNSIZLAŞMAMASI" gereksinimini karşılayacak şekilde seçildi —
  // gerçek simülasyonla (±%20 hatalı düzeltme, 3×1000 deneme/seviye) ölçülen
  // geçme oranı Z1'de %98.4, Z20'de %38.6 — kademeli düşüyor ama sıfırlanmıyor.
  TOLERANCE_RATIO_AT_1: 0.14,
  TOLERANCE_RATIO_AT_CAP: 0.045
};

// SAF FONKSİYON. position: zorlukKonumu — diğer sekiz modun
// paramsForDifficultyPosition'ıyla AYNI mod-agnostik girdi.
export function paramsForDifficultyPosition(position, config = TONAL_CURVE_CONFIG) {
  const safePos = Math.max(1, position);
  const cappedPos = Math.min(safePos, config.LEVEL_CAP);
  const t = config.LEVEL_CAP > 1 ? (cappedPos - 1) / (config.LEVEL_CAP - 1) : 1;

  const disturbCurve = logLerp(config.DISTURB_DB_AT_1, config.DISTURB_DB_AT_CAP, t);
  const timeCurve = logLerp(config.TIME_SEC_AT_1, config.TIME_SEC_AT_CAP, t);
  const toleranceRatio = logLerp(config.TOLERANCE_RATIO_AT_1, config.TOLERANCE_RATIO_AT_CAP, t);

  const disturbDb = applyPostCapFloor(disturbCurve, safePos, config.LEVEL_CAP, config.DISTURB_DB_FLOOR, config.DISTURB_DB_REDUCTION_PER_STEP);

  return {
    position: safePos,
    disturbDb,
    timeSec: applyPostCapFloor(timeCurve, safePos, config.LEVEL_CAP, config.TIME_SEC_FLOOR, config.TIME_SEC_REDUCTION_PER_STEP),
    // G95: bkz. TONAL_CURVE_CONFIG.TOLERANCE_RATIO_AT_1/AT_CAP notu — SABİT
    // NEUTRAL_TOLERANCE_DB'nin YERİNE, o pozisyondaki GERÇEK disturbDb'nin bir
    // oranı. applyPostCapFloor'un DIŞINDA tutuldu (disturbDb zaten floor'lanmış
    // haliyle çarpılıyor) — LEVEL_CAP ötesinde disturbDb sabitlenince tolerans
    // da onunla birlikte doğal olarak sabitlenir, ayrı bir floor GEREKMEZ.
    neutralToleranceDb: disturbDb * toleranceRatio
  };
}

// SAF FONKSİYON. Kompresör/Reverb/dB Seviyesi'nin pickX fonksiyonlarıyla AYNI
// desen (dar jitter + jitter SONRASI FLOOR garantisi) — ±%10 (diğerlerinin ±%6'
// sından biraz DAHA GENİŞ: burada TEK bir sayı değil HER bant AYRI AYRI
// jitter'lanacak, çok dar bir jitter tüm bozuk bantları neredeyse AYNI
// büyüklükte üretirdi, gerçekçi olmazdı).
export function pickDisturbanceDb(baseDb, rng = Math.random) {
  const jitter = 0.9 + rng() * 0.2; // 0.9x – 1.1x
  const jittered = baseDb * jitter;
  return Math.max(TONAL_CURVE_CONFIG.DISTURB_DB_FLOOR, jittered);
}

// SAF FONKSİYON. rng enjekte edilebilir Fisher-Yates — core/utils.js'in
// shuffle()'ı BİLEREK kullanılmadı (Math.random'a sabit, deterministik testle
// doğrulanamaz) — Kompresör'ün pickOddK'sının AYNI "rng parametresi" felsefesi.
function shuffleWithRng(arr, rng) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// SAF FONKSİYON. bandIds'in EN AZ BİRİNE, EN ÇOK TÜMÜNE bozukluk uygular (task:
// "bir kısmına ya da tümüne") — hangi bantların bozulacağı VE büyüklükleri/
// yönleri (±) rastgele. Bozulmayan bantlar bugDb=0 (kullanıcı onları OLDUĞU
// GİBİ, dokunmadan bırakmalı — sıfır zaten kaydırıcının başlangıç konumu).
// filterType KANONİK sırayla (BAND_ORDER) belirlenir: en düşük frekanslı bant
// low-shelf, en yüksek high-shelf, aradakiler peaking — standart parametrik EQ
// tasarımı (Boost/Cut'ın TEK bandının aksine burada GERÇEK bir "bant zinciri").
export function bandsForQuestion(bandIds, baseDisturbDb, rng = Math.random) {
  const sortedIds = BAND_ORDER.filter(id => bandIds.includes(id));
  const disturbCount = 1 + Math.floor(rng() * sortedIds.length);
  const disturbedSet = new Set(shuffleWithRng(sortedIds, rng).slice(0, disturbCount));

  return sortedIds.map((id, i) => {
    const def = BAND_DEFS_BY_ID[id];
    const filterType = i === 0 ? "lowshelf" : i === sortedIds.length - 1 ? "highshelf" : "peaking";
    let bugDb = 0;
    if (disturbedSet.has(id)) {
      const sign = rng() < 0.5 ? 1 : -1;
      bugDb = Math.round(sign * pickDisturbanceDb(baseDisturbDb, rng) * 100) / 100;
    }
    return { id, label: def.label, freq: def.freq, filterType, bugDb };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    motor: 2,
    // İnce EQ farkları (özellikle "zor"/"pro" katmanında, disturbDb~1-3dB)
    // telefon hoparlöründe kolayca kaybolur — kulaklık ayrımı netleştirir
    // (task'ın açık kararı, Reverb'in G37'den beri AYNI gerekçesi).
    kulaklikGerekli: true,
    // G44'ten DEĞİŞMEDİ — EQ düzeltmesi SADECE dolu spektrumda (çok sayıda eş
    // zamanlı frekans bileşeni) anlamlı, tek-vuruş/tek-nota kaynaklar tonal
    // denge göstermez (bkz. dosya başı "KAYNAK" notu).
    // G270 — KONTROL EDİLDİ, BİLEREK DEĞİŞTİRİLMEDİ: "clean_guitar" ve YENİ
    // "arpeggio_guitar" da TEK ENSTRÜMAN (dolu mix DEĞİL) — G44'ün AYNI
    // gerekçesiyle dışarıda kalmaları GEREKİYOR. Zaten mevcut TEK bir
    // enstrüman/kaynak (guitar/clean_guitar/vocal/bass/snare/vb.) bu listede
    // YOK — sadece groove (tam davul döngüsü) ve upload (kullanıcının kendi
    // mix'i) var, ikisi de "dolu spektrum" şartını sağlıyor. Bu TUTARLILIK
    // KORUNDU, liste DEĞİŞMEDİ.
    uyumluKaynaklar: compatibleSourceIds({ only: ["groove", "upload"] }),
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY,
    // SADECE ŞIKLI/kaydırıcılı — dalgaya tıklamanın doğal bir karşılığı yok
    // (diğer Motor 2 modlarıyla/Kesim Noktası'yla AYNI karar).
    choiceOnly: true
  };
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz. settings: { source, boss,
// sessionQuestionIndex — bant sayısı ramp'i BUNA bağlı (bkz.
// bandCountForSessionIndex), verilmezse 0 (4 bant); difficultyPosition —
// verilirse disturbDb/timeSec EĞRİDEN gelir, verilmezse (mevcut testler,
// doğrudan çağrılar, proplus) statik DIFFICULTY[level] davranışı korunur;
// examBandBoost — G50: SADECE sınav sistemi tarafından geçirilir (bkz. dosya
// başı EXAM_ENABLED notu), true olunca sessionQuestionIndex'i YOK SAYIP
// DOĞRUDAN 6 bandı (BAND_SET_6) zorlar — "sınav zorlaştırılmış" isteğinin
// bant-sayısı ekseni, diğer yedi mod bu alanı hiç okumadığı için etkilenmez }.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "groove";

  const curve = (level !== "proplus" && Number.isFinite(settings.difficultyPosition))
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  const baseDisturbDb = curve ? curve.disturbDb : diff.disturbDb;
  const timeSec = curve ? curve.timeSec : diff.time;
  // G95: eğri aktifken tolerans da o pozisyonun neutralToleranceDb'si — eğri
  // YOKSA (proplus, statik doğrudan çağrılar, mevcut testler) ESKİ SABİT
  // NEUTRAL_TOLERANCE_DB'ye düşer, davranış BİREBİR korunur (regresyon yok).
  const neutralToleranceDb = curve ? curve.neutralToleranceDb : NEUTRAL_TOLERANCE_DB;

  const sessionQuestionIndex = Number.isFinite(settings.sessionQuestionIndex) ? settings.sessionQuestionIndex : 0;
  const bandCount = settings.examBandBoost ? 6 : bandCountForSessionIndex(sessionQuestionIndex);
  const bandIds = bandIdsForCount(bandCount);
  const bands = bandsForQuestion(bandIds, baseDisturbDb);

  return {
    mode: "tonal-denge",
    difficulty: level,
    source,
    bandCount,
    bands,
    hintUsed: false,
    boss,
    timeSec,
    neutralToleranceDb
  };
}

export function modeDescription() {
  return "Her bant için kaydırıcıyı ayarla — sesi dinleye dinleye nötr/dengeli hale getirmeye çalış, sonra onayla.";
}

export function correctLabel(question) {
  const disturbedCount = question.bands.filter(b => b.bugDb !== 0).length;
  return `${question.bandCount} bant, ${disturbedCount} bozuk`;
}

// Soruda uygulanan GİZLİ bozukluğu audioCtx üzerinde kurar — question.bands
// KADAR BiquadFilterNode SERİ bağlanır (audio-engine.js'in genel filters-seri-
// bağlama sözleşmesi DEĞİŞTİRİLMEDEN). Her düğüm BAŞLANGIÇTA sadece bugDb'yi
// taşır (kullanıcı düzeltmesi henüz 0) — canlı düğüm referansları liveBandNodes'a
// KAYDEDİLİR (bkz. dosya başı notu + setLiveBandGain) ki app.js kaydırıcı
// hareket ettikçe GRAFİĞİ YENİDEN KURMADAN bu düğümlerin gain'ini güncelleyebilsin.
// ÖNEMLİ: previewLetter YOK — Kompresör/Reverb'in aksine burada tek bir "canlı"
// ses var, A/B/C değişkeni yok, applyProcessing HER ZAMAN question.bands'i okur.
let liveBandNodes = null;
export function applyProcessing(question, { audioCtx }) {
  const nodes = {};
  const filters = question.bands.map(band => {
    const f = audioCtx.createBiquadFilter();
    f.type = band.filterType;
    f.frequency.value = band.freq;
    if (band.filterType === "peaking") f.Q.value = BAND_PEAK_Q;
    f.gain.value = band.bugDb;
    nodes[band.id] = f;
    return f;
  });
  liveBandNodes = nodes;
  return { filters };
}

// app.js kaydırıcı HER hareket ettiğinde çağırır — GRAFİĞİ YENİDEN KURMADAN, o
// bandın CANLI düğümünün gain'ini (bugDb + kullanıcının o andaki correctionDb'si
// TOPLAMI, netGainDb olarak DIŞARIDAN hesaplanıp verilir — bu fonksiyon "bug"
// kavramını hiç bilmez, SADECE mekanik) YUMUŞAK bir rampayla (audio-engine.js'in
// STOP_RAMP_TIME_CONSTANT'ıyla AYNI felsefede kısa bir zaman sabiti — tıklama
// riski YOK) günceller. Round'un applyProcessing'i HENÜZ çağrılmadıysa (liveBandNodes
// null/eski turdan) ya da o bandın düğümü yoksa SESSİZCE hiçbir şey yapmaz.
const LIVE_RAMP_TIME_CONSTANT = 0.02;
export function setLiveBandGain(audioCtx, bandId, netGainDb) {
  const node = liveBandNodes && liveBandNodes[bandId];
  if (!node || !audioCtx) return;
  const now = audioCtx.currentTime;
  node.gain.cancelScheduledValues(now);
  node.gain.setTargetAtTime(netGainDb, now, LIVE_RAMP_TIME_CONSTANT);
}

// ═══════════════════════════════════════════════════════════════════════════
// DEĞERLENDİRME — SAF FONKSİYON, audioCtx'e HİÇ dokunmaz. answer: kullanıcının
// {bandId: correctionDb} haritası (eksik/olmayan bant id'si → correction=0
// varsayılır, yani "dokunulmadı" — bkz. dosya başı not). Her bantta residualDb
// = bugDb + correction (MÜKEMMEL düzeltme residual=0 demek). avgDeviation =
// TÜM bantların |residual|'ının ORTALAMASI — TEK bir "ne kadar nötre yakın"
// ekseni (Kompresör'ün gainReductionDb'sinin AYNI rolü). proximityScore (0-100)
// kullanıcıya gösterilecek, XP'yi ÖLÇEKLEYECEK yakınlık skoru.
// ═══════════════════════════════════════════════════════════════════════════
// G95: ARTIK SABİT DEĞİL — bkz. TONAL_CURVE_CONFIG.TOLERANCE_RATIO_AT_1/AT_CAP
// notu. Bu sabit KALDIRILMADI, iki rolü var: (1) question.neutralToleranceDb
// YOKSA (eğri hiç çalışmadıysa — proplus, statik doğrudan çağrılar, question
// nesnesi createQuestion'dan GEÇMEDEN elle kurulan testler) FALLBACK değeri,
// (2) createQuestion'ın KENDİSİNİN eğri yokken düştüğü statik değer (bkz. o
// fonksiyondaki not) — ESKİ "tek sabit tolerans" davranışı bu iki yolda
// BİREBİR korunuyor, SADECE eğri aktifken (gerçek oyun) tolerans artık
// disturbDb'nin oranı.
export const NEUTRAL_TOLERANCE_DB = 1.5; // ortalama sapma bunun altındaysa "doğru" sayılır — KULAKLA DOĞRULANMADI
const PROXIMITY_MAX_DEVIATION_DB = 12; // avgDeviation bu değerde/üstündeyse proximityScore=0 (slider'ın uç-uca aralığı)

export function evaluateAnswer(question, answer) {
  const corrections = answer || {};
  const deviations = question.bands.map(b => {
    const correction = Number(corrections[b.id]) || 0;
    const residualDb = Math.round((b.bugDb + correction) * 100) / 100;
    return { id: b.id, correction, residualDb, deviation: Math.abs(residualDb) };
  });
  const avgDeviation = deviations.reduce((sum, d) => sum + d.deviation, 0) / deviations.length;
  const proximityScore = Math.max(0, Math.min(100, Math.round(100 * (1 - avgDeviation / PROXIMITY_MAX_DEVIATION_DB))));
  const tolerance = Number.isFinite(question.neutralToleranceDb) ? question.neutralToleranceDb : NEUTRAL_TOLERANCE_DB;
  // G317 — "doğru" (correct) TANIMI DEĞİŞMEDİ, HÂLÂ ortalama sapmaya göre
  // (DOKUNULMAYACAK: "Tonal Denge'de tam bilmek gerekiyor"). correctBandCount
  // SADECE kısmi-doğru XP'si (calculateXP) için EKLENEN, AYRI bir sayaç — HER
  // bandın KENDİ sapmasının AYNI toleransla karşılaştırılması (tüm bantlar
  // bunu geçseydi averaj da geçerdi, yani correctBandCount===bands.length
  // İKEN correct HER ZAMAN true'dur — bu dal calculateXP'nin "correct" yoluna
  // düşer, kısmi-XP tablosunun bandCount anahtarı bu yüzden GEREKMEZ).
  const correct = avgDeviation <= tolerance;
  const correctBandCount = deviations.filter(d => d.deviation <= tolerance).length;
  return { mode: "tonal-denge", correct, avgDeviation, proximityScore, deviations, correctBandCount };
}

// G317 (Logic'in kararı, OLCUM-XP-SEANS-18-08'in ardından) — "4 bandı tek
// seferde doğru yapan çıkmaz, o bölümde seviye atlayan olmaz. Kısmi doğruya
// artan XP verilsin AMA 'doğru' sayılmasın." Oranlar TAM-doğru XP'sinin
// YÜZDESİ (SABİT SAYI DEĞİL — Tonal Denge'nin taban XP'si ÖLÇÜLMEDİĞİ için
// mevcut formülün ÜSTÜNE çarpan olarak biniyor, talimatın kendi sözü).
// 4 bant SABİT, Logic'in KENDİ verdiği: 1→%15, 2→%35, 3→%75 (4/4 zaten
// result.correct=true yoluna düşer, aşağı bkz. — bu tablo hiç kullanılmaz).
// Artışlar (+15,+20,+40) 4-bant tablosunun KENDİ "neredeyse tama yakınken
// BÜYÜK sıçrama" deseni. 5/6 bant İÇİN ölçülmüş bir referans YOK — AYNI
// deseni (düşük başlangıç, tam-doğruya YAKINKEN en büyük sıçrama, k=n-1'de
// hâlâ tama ulaşmamış) ELLE genişleterek uygulandı, bu bir ÜRÜN YORUMU
// (ölçüm değil, "oranları sen belirle" talimatı gereği):
//   5 bant: 1→%10, 2→%22, 3→%42, 4→%72 (artışlar +10,+12,+20,+30)
//   6 bant: 1→%8,  2→%18, 3→%32, 4→%52, 5→%78 (artışlar +8,+10,+14,+20,+26)
// (bandCount, k) → k=bandCount HİÇ anahtar OLARAK YOK: tüm bantlar kendi
// toleransıyla "doğru" ise averaj da HER ZAMAN toleransın altındadır (averaj,
// hepsi <= T olan değerlerin averajı <= T'dir) — yani correctBandCount===
// bandCount İKEN result.correct HER ZAMAN true'dur, bu tabloya hiç gelinmez.
const PARTIAL_CREDIT_FRACTION = {
  4: { 1: 0.15, 2: 0.35, 3: 0.75 },
  5: { 1: 0.10, 2: 0.22, 3: 0.42, 4: 0.72 },
  6: { 1: 0.08, 2: 0.18, 3: 0.32, 4: 0.52, 5: 0.78 }
};

// XP GRADED — task'ın "puanlama: yakınlık skoru" isteği: diğer sekiz modun
// binary (doğru=tam XP/yanlış=0) davranışının AKSİNE, "doğru" (tolerans içinde)
// sayılan bir cevapta bile XP proximityScore'a göre ÖLÇEKLENİR (proximityBoost) —
// tam nötre (skor 100) daha yakın bir düzeltme daha çok XP kazandırır. Taban
// %55 (result.correct zaten en az bir dereceye kadar başarı demek, tam sıfıra
// İNMEMELİ).
export function calculateXP(question, result, hintUsed, level, context = {}) {
  if (!result) return 0;
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const combo = context.combo || 0;
  const timeLeft = context.timeLeft || 0;
  const roundDuration = context.roundDuration || 0;
  const xpMultiplier = context.xpMultiplier || 1;

  const comboBoost = Math.min(2.4, 1 + combo * 0.12);
  const hintPenalty = hintUsed ? 0.5 : 1;
  const bossBoost = question.boss ? 1.65 : 1;
  const timeBoost = timeLeft > roundDuration * 0.55 ? 1.2 : 1;

  // G317 — kısmi-doğru dalı: result.correct false (DEĞİŞMEDİ) ama en az 1
  // bant kendi toleransında ise, TAM-doğru formülünün (proximityBoost HARİÇ —
  // "onunla çakışmasın" talimatı, proximityBoost SADECE result.correct=true
  // yolunda kalıyor) ÜSTÜNE PARTIAL_CREDIT_FRACTION çarpanı biniyor.
  if (!result.correct) {
    const bandCount = question.bands.length;
    const fraction = PARTIAL_CREDIT_FRACTION[bandCount]?.[result.correctBandCount || 0];
    if (!fraction) return 0;
    const raw = Math.round(diff.xp * comboBoost * hintPenalty * bossBoost * timeBoost * fraction * xpMultiplier);
    return Math.max(0, raw);
  }

  const proximityBoost = Math.max(0.55, (result.proximityScore || 0) / 100);
  const raw = Math.round(diff.xp * comboBoost * hintPenalty * bossBoost * timeBoost * proximityBoost * xpMultiplier);
  return Math.max(0, raw);
}

// ═══════════════════════════════════════════════════════════════════════════
// ÖĞRETİCİ METİN — soru SADE (sadece kaydırıcılar), geri bildirim ZENGİN: HER
// bant için ne kadar/hangi yönde saptığı + mix anlamı TEK yerde (BAND_MIX_WORDS).
// task'ın örnek formatıyla BİREBİR: "SUB'ı +5dB fazla bıraktın, mix hâlâ
// bas-ağır. TİZ'i iyi düzelttin."
// ═══════════════════════════════════════════════════════════════════════════
const BAND_MIX_WORDS = {
  sub: { over: "gümbürtülü/boğuk", under: "ince/güçsüz" },
  bas: { over: "ağır/kalın", under: "zayıf/soğuk" },
  "alt-orta": { over: "çamurlu/kalın", under: "ince/boş" },
  orta: { over: "kutu/telefon sesi gibi", under: "içi boş/uzak" },
  "ust-orta": { over: "sert/yorucu", under: "donuk/kapalı" },
  tiz: { over: "tiz/cırtlak", under: "parlaklıksız/kapalı" }
};

// Türkçe belirtme durumu (accusative) eki bant etiketine göre DEĞİŞİR (ünlü
// uyumu: SUB'u/BAS'ı/ALT-ORTA'yı/ORTA'yı/ÜST-ORTA'yı/TİZ'i) — generic bir
// "'i" eki YANLIŞ çıkardı (ör. "BAS'i" değil "BAS'ı"), bu yüzden TEK yerde
// elle doğru çekimlendi.
const BAND_ACCUSATIVE = {
  sub: "SUB'u", bas: "BAS'ı", "alt-orta": "ALT-ORTA'yı",
  orta: "ORTA'yı", "ust-orta": "ÜST-ORTA'yı", tiz: "TİZ'i"
};

function fmtSigned(db) {
  const rounded = Math.round(db * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded.toFixed(1)}`;
}

export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);
  const ordered = [...result.deviations].sort((a, b) => b.deviation - a.deviation);
  // G95: bant-başı "iyi düzelttin" eşiği artık evaluateAnswer'ın KULLANDIĞI
  // AYNI toleransla (question.neutralToleranceDb, yoksa sabit fallback) —
  // eskiden HER ZAMAN sabit 1.5dB kullanıyordu, bu da yüksek pozisyonlarda
  // (tolerans ~0.04-0.1dB) genel sonuç "yanlış" derken bant satırının "iyi
  // düzelttin" demesine (tutarsız geri bildirim) yol açardı.
  const tolerance = Number.isFinite(question.neutralToleranceDb) ? question.neutralToleranceDb : NEUTRAL_TOLERANCE_DB;

  const bandLines = ordered.map(d => {
    const label = BAND_ACCUSATIVE[d.id] || BAND_DEFS_BY_ID[d.id].label;
    if (d.deviation <= tolerance) return `${label} iyi düzelttin.`;
    const overshoot = d.residualDb > 0;
    const verb = overshoot ? "fazla bıraktın" : "eksik bıraktın";
    const words = BAND_MIX_WORDS[d.id] || { over: "dengesiz", under: "dengesiz" };
    const mixWord = overshoot ? words.over : words.under;
    return `${label} ${fmtSigned(d.residualDb)}dB ${verb} — mix hâlâ ${mixWord}.`;
  });

  const header = result.correct
    ? `Doğru! Yakınlık %${result.proximityScore} (ortalama sapma ${result.avgDeviation.toFixed(1)}dB) — nötüre çok yakınsın.`
    : `Henüz nötr değil — yakınlık %${result.proximityScore} (ortalama sapma ${result.avgDeviation.toFixed(1)}dB).`;

  return `${header} ${bandLines.join(" ")}`;
}

export function getFeedbackData(question, answer, context = {}) {
  const result = evaluateAnswer(question, answer);
  const gained = context.gained || 0;
  const text = teachingText(question, answer);

  if (result.correct) {
    return { result, title: "Nötüre yakın!", detail: `${text} (+${gained} XP)`, showResult: true, panel: null };
  }
  // G317 — kısmi-doğru XP kazanıldıysa (gained>0) DETAIL'e result.correct===true
  // dalıyla AYNI "(+N XP)" eki eklendi (SATIR 576'nın BİREBİR deseni,
  // TUTARLILIK için). ÖLÇÜLDÜ: app.js:setFeedback() bu eki ekranda
  // GÖRÜNMEDEN ÖNCE regex ile SİLİYOR (`.replace(/\s*\(\+\d+ XP\)$/, "")`)
  // — bu, KORREKT dalda da AYNI, ÖNCEDEN VAR olan davranış (benim eklediğim
  // bir kısıtlama DEĞİL). Kullanıcı partial-XP'yi ŞU AN SADECE canvas'taki
  // spawnXp() animasyonundan ("+N XP" uçan yazı, app.js) görüyor — metin
  // panelinde HİÇBİR yerde YAZILI görünmüyor (correct cevapta da AYNI durum).
  // BANT-BAZLI "kaç bandı doğru bildin" DETAYI BİLEREK EKLENMEDİ (task'ın
  // kendi talimatı: "ölç ve öner, bu turda uygulama, sor" — bkz. rapor).
  const detail = gained > 0 ? `${text} (+${gained} XP)` : text;
  return { result, title: `Yakınlık %${result.proximityScore}`, detail, showResult: true, panel: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// SÖZLEŞMENİN DIŞINDA: bu moda özgü render/UI yardımcıları.
// ═══════════════════════════════════════════════════════════════════════════

// İpucu — HANGİ yönde/ne kadar olduğunu ASLA vermez, SADECE en büyük sapmanın
// HANGİ bantta olduğunu söyler (Kompresör'ün/Reverb'in AYNI kısmi-yardım
// ilkesi — cevabın bir BOYUTUNU verir, tamamını değil).
export function getHintText(question) {
  const worst = [...question.bands].sort((a, b) => Math.abs(b.bugDb) - Math.abs(a.bugDb))[0];
  if (!worst) return "Bu turda bozukluk yok gibi görünüyor.";
  return `En büyük sapma ${worst.label} bölgesinde`;
}

export function renderHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}
export function clearHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}

// Dinleme kontrolü #freqGuessArea'da DEĞİL — diğer choiceOnly modlarla AYNI
// desen, gizli kalır (kaydırıcılar #answers'a render edilir, bkz.
// renderAnswerChoices).
export function renderGuessAreaControls(freqGuessAreaEl) {
  if (!freqGuessAreaEl) return;
  freqGuessAreaEl.textContent = "";
  freqGuessAreaEl.classList.add("hidden");
}

// N kaydırıcı (question.bands kadar) + "Cevabı Onayla" butonu. Slider'ların
// CANLI (input event) ve submit'in (click) GERÇEK kablolanması app.js'te (bu
// dosya audioCtx/audioEngine'e ERİŞEMEZ, sadece markup üretir) — bkz. app.js
// "Tonal Denge — canlı EQ kaydırıcıları" bölümü. data-band-id her iki tarafta
// da (burada + app.js'in delegasyonunda) EŞLEŞTİRME anahtarı.
export function renderAnswerChoices(answersEl, q) {
  if (!answersEl) return;
  if (!q.bands) { answersEl.innerHTML = ""; answersEl.classList.add("hidden"); return; }
  answersEl.classList.remove("hidden");
  answersEl.className = "answers answers-tonal";
  const sliders = q.bands.map(b => `
    <div class="tonal-band" data-band-id="${b.id}">
      <div class="tonal-band-head">
        <span class="tonal-band-label">${b.label}</span>
        <span class="tonal-band-value" data-role="value">0.0 dB</span>
      </div>
      <input type="range" class="tonal-slider" data-band-id="${b.id}"
        min="${SLIDER_MIN_DB}" max="${SLIDER_MAX_DB}" step="${SLIDER_STEP_DB}" value="0"
        aria-label="${b.label} düzeltme">
    </div>`).join("");
  answersEl.innerHTML = `
    <div class="tonal-bands">${sliders}</div>
    <button type="button" class="btn primary tonal-submit">Cevabı Onayla</button>
  `;
}

// Cevap verildikten sonra kaydırıcıları/butonu kilitler, her bandın KALAN
// sapmasını (residualDb) satırın yanına yazar + doğru/yanlış renk sınıfı ekler
// (CSS: .tonal-band.right/.wrong — styles.css'teki .ans.right/.wrong'un AYNI
// renk dilini kullanır).
export function markAnswerChoices(answersEl, q, answer) {
  if (!answersEl) return;
  const result = evaluateAnswer(q, answer || {});
  // G95: teachingText'teki AYNI gerekçe — satır rengi de soru-özel toleransı
  // kullanmalı, yoksa yüksek pozisyonda genel sonuç "yanlış" iken bir bant
  // yeşil (right) görünebilirdi.
  const tolerance = Number.isFinite(q.neutralToleranceDb) ? q.neutralToleranceDb : NEUTRAL_TOLERANCE_DB;
  answersEl.querySelectorAll(".tonal-slider").forEach(input => { input.disabled = true; });
  const submitBtn = answersEl.querySelector(".tonal-submit");
  if (submitBtn) submitBtn.disabled = true;
  result.deviations.forEach(d => {
    const row = answersEl.querySelector(`.tonal-band[data-band-id="${d.id}"]`);
    if (!row) return;
    row.classList.add(d.deviation <= tolerance ? "right" : "wrong");
    const valueEl = row.querySelector('[data-role="value"]');
    if (valueEl) valueEl.textContent = `kalan: ${fmtSigned(d.residualDb)}dB`;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GÖRSEL — Boost/Cut'ın computeEqCurveDb tekniğiyle AYNI (GERÇEK
// BiquadFilterNode.getFrequencyResponse, elle yaklaşıklık DEĞİL), G44'ün tilt
// eğrisinden MİRAS — ama HEDEF artık düz bir çizgi (task: "hedef düz çizgi"),
// KULLANICI eğrisi kalan sapmayı (residual = bugDb+correction) gösterir.
// RENK: task'ın açık isteği — kullanıcının EQ'su KIRMIZI (GUESS_COLOR),
// hedef YEŞİL (CORRECT_COLOR) — G34 standardının AYNI renk dilinde, ama
// rolleri G44'ten (kırmızı=senin SEÇİMİN, yeşil=doğru CEVAP) DEĞİL, burada
// "kırmızı=SENİN SONUCUN, yeşil=HEDEF" olarak okunmalı — task'ın kendi
// tanımı bu.
// ═══════════════════════════════════════════════════════════════════════════

const CURVE_POINTS = 160;
function computeResidualCurveDb(audioCtx, question, corrections, w) {
  if (!audioCtx) return null;
  const freqs = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) freqs[i] = faXToF((i / (CURVE_POINTS - 1)) * w, w);
  const totalDb = new Float32Array(CURVE_POINTS);
  question.bands.forEach(band => {
    const correction = Number(corrections[band.id]) || 0;
    const filter = audioCtx.createBiquadFilter();
    filter.type = band.filterType;
    filter.frequency.value = band.freq;
    if (band.filterType === "peaking") filter.Q.value = BAND_PEAK_Q;
    filter.gain.value = band.bugDb + correction;
    const mag = new Float32Array(CURVE_POINTS);
    const phase = new Float32Array(CURVE_POINTS);
    filter.getFrequencyResponse(freqs, mag, phase);
    for (let i = 0; i < CURVE_POINTS; i++) totalDb[i] += 20 * Math.log10(Math.max(mag[i], 1e-6));
  });
  return totalDb;
}

// G83: eski YEREL eksen çizici (AXIS_TICKS/drawAxis) kaldırıldı — artık
// frekans-bulma.js:drawSpectrumBackground'ın MERKEZİ eksenini kullanıyor
// (bkz. app.js:drawVisualizer, curveTop hesaplaması ORADA da COMPACT_ANALYZER
// için güvenli küçülüyor — bkz. o fonksiyonun notu).

const MAX_ABS_DB = 14; // TILT/residual max ~12dB (SLIDER_MAX_DB) — headroom kaskat filtrelerin üst üste binmesi için
// G46: paylaşılan CURVE_TOP (88px — frekans-bulma.js, spektrum çubuklarının
// TAVANI olarak app.js:drawSpectrumBars'ta HÂLÂ kullanılıyor, DOKUNULMADI)
// COMPACT_ANALYZER'ın küçülttüğü (140px) canvas'ta EĞRİYE neredeyse hiç yer
// bırakmazdı (88 + AXIS_H[50] + 6 ≈ canvas'ın tamamı). Bu eğri SADECE bu
// modun KENDİ overlay'i — spektrum çubuklarının paylaşılan tavanından
// BAĞIMSIZ, kendi küçük/sabit bir üst boşluk kullanır.
const OVERLAY_TOP_MARGIN = 20;
function bandDbToY(db, curveTop, curveBottom) {
  const midY = curveTop + (curveBottom - curveTop) * 0.5;
  const bandH = (curveBottom - curveTop) * 0.42;
  const d = Math.max(-MAX_ABS_DB, Math.min(MAX_ABS_DB, db));
  return midY - (d / MAX_ABS_DB) * bandH;
}

function drawFlatTargetLine(ctx2d, w, h, color) {
  const plotBottom = h - AXIS_H;
  const y = bandDbToY(0, OVERLAY_TOP_MARGIN, plotBottom - 6);
  ctx2d.save();
  ctx2d.strokeStyle = color;
  ctx2d.lineWidth = 3;
  ctx2d.globalAlpha = 0.85;
  ctx2d.beginPath();
  ctx2d.moveTo(0, y);
  ctx2d.lineTo(w, y);
  ctx2d.stroke();
  ctx2d.restore();
}

function drawResidualCurve(ctx2d, w, h, db, color) {
  const plotBottom = h - AXIS_H;
  const curveTop = OVERLAY_TOP_MARGIN, curveBottom = plotBottom - 6;
  ctx2d.save();
  ctx2d.beginPath();
  for (let i = 0; i < CURVE_POINTS; i++) {
    const x = (i / (CURVE_POINTS - 1)) * w;
    const y = bandDbToY(db[i], curveTop, curveBottom);
    if (i === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
  }
  ctx2d.strokeStyle = color;
  ctx2d.lineWidth = 3;
  ctx2d.globalAlpha = 0.9;
  ctx2d.lineJoin = "round";
  ctx2d.stroke();
  ctx2d.restore();
}

function drawLegend(ctx2d) {
  const y = 22;
  let x = 10;
  ctx2d.font = "700 12px Inter, sans-serif";
  ctx2d.textAlign = "left";
  ctx2d.fillStyle = GUESS_COLOR;
  ctx2d.fillText("●", x, y);
  x += 12;
  ctx2d.fillStyle = "#C7CEDD";
  ctx2d.fillText("Senin sonucun", x, y);
  x += ctx2d.measureText("Senin sonucun").width + 16;
  ctx2d.fillStyle = CORRECT_COLOR;
  ctx2d.fillText("●", x, y);
  x += 12;
  ctx2d.fillStyle = "#C7CEDD";
  ctx2d.fillText("Hedef (nötr)", x, y);
}

// Soru sırasında (roundActive) eğri BİLEREK gizli — kulakla bulma ilkesi
// (diğer sekiz modun AYNI invaryantı: kaydırıcı DEĞERLERİ zaten görünür ama
// "sonuç ne kadar doğru" görsel olarak SIZDIRILMAZ, kullanıcı KULAĞIYLA karar
// vermeli). state: { audioCtx, activeQuestion, roundActive, tonalCorrections } —
// tonalCorrections app.js'in kaydırıcı input'larından canlı topladığı
// {bandId: correctionDb} haritası (submitTonalDengeGuess'te DONDURULUR, yeni
// soruda {}'ya döner).
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  // G83: eksen artık app.js'ten MERKEZİ çiziliyor — burada TEKRAR çağrılırsa
  // ızgara İKİ KEZ çizilirdi.
  const { audioCtx, activeQuestion: q, roundActive, tonalCorrections } = state;
  if (!q || roundActive) return;

  drawFlatTargetLine(ctx2d, w, h, CORRECT_COLOR);
  const residualDb = computeResidualCurveDb(audioCtx, q, tonalCorrections || {}, w);
  if (residualDb) drawResidualCurve(ctx2d, w, h, residualDb, GUESS_COLOR);
  drawLegend(ctx2d);
}

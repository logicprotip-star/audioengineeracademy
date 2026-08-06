// "Kesim Noktası" — HPF/LPF kesim frekansı bulma modu. İKİ SESLİ moddan biri
// (Frekans Bulma'dan sonra), bu yüzden aynı zamanda bir ŞABLON: app.js'in
// `mode.X()` genel dispatch mekanizmasının GERÇEKTEN birden fazla mod arasında
// çalıştığı ilk yer. Mod sözleşmesi Frekans Bulma ile AYNI (getMeta/createQuestion/
// applyProcessing/evaluateAnswer/calculateXP/getFeedbackData) + app.js'in oyun
// ekranını çizebilmesi için birkaç aynı-isimli opsiyonel render yardımcısı daha
// (renderAnswerChoices/markAnswerChoices/drawOverlay/vb. — bkz. frekans-bulma.js
// dosya başındaki "SÖZLEŞMENİN DIŞINDA" notu, burada da geçerli).
//
// KAPSAM (bu iskelet turunda BİLEREK YOK, sonraki bir promptta eklenecek):
// - Öğretici "neden" geri bildirimi — getFeedbackData zone/tip metni ÜRETMEZ (G19'da
//   sadece GÖRSEL filtre eğrisi eklendi — bkz. drawOverlay — metin geri bildirimi ayrı).
// - Filtre eğrisi görseli G19'da eklendi (bkz. drawOverlay) — SADECE cevap sonrası,
//   soru sırasında (roundActive) eksen dışında hiçbir şey çizilmez (kulakla bulma
//   ilkesi bozulmasın diye, task kararı).
// - Karşılaştırma-önizleme butonları (Senin cevabın/Doğru cevap/Temiz) — app.js'in
//   #freqInfo click-delegasyonu hâlâ SADECE "frequency" moduna kilitli, bilerek
//   dokunulmadı; bu mod hiç zengin panel göstermiyor (submitCutoffGuess sadece
//   setFeedback'in kısa metnini kullanıyor).
//
// SADECE ŞIKLI: bu mod dalga üzerine tıklamayı DESTEKLEMİYOR (isChoiceFormat()
// app.js'te "cutoff" için hep true döner) — kesim noktası için "dalgaya tıkla"
// affordance'ı EQ bandı kadar doğal değil, task bunu şıklı cevaba bağladı.

import { formatHz, shuffle, logFreq } from "../core/utils.js";
import { compatibleSourceIds } from "../core/source-catalog.js";
import { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound } from "./frekans-bulma.js";
import { logLerp, applyPostCapFloor } from "../core/difficulty-curve.js";
import { GUESS_COLOR, CORRECT_COLOR } from "../core/feedback-colors.js";

export { FA_MIN, FA_MAX, AXIS_H, CURVE_TOP, faXToF, faFToX, FA_ZONES, faZoneOf, recordZone, isBossRound };

export const MODE_ID = "kesim-noktasi";

// G50: Sınav sistemi — frekans-bulma.js'in AYNI notu (EXAM_WEAK_AREA="zone":
// bu mod da recordZone çağırır, telafi zayıf FREKANS BÖLGESİ üzerinden kurulur).
export const EXAM_ENABLED = true;
export const EXAM_DIFFICULTY = "pro";
export const EXAM_WEAK_AREA = "zone";

// MAX_LIVES: Frekans Bulma ile AYNI sabit (bkz. o dosyanın notu — can sayısı
// zorluğa göre değişmez).
export const MAX_LIVES = 5;

// typeRevealed BURADA YOK — G18'de zorluktan AYRILDI, artık SEANS İÇİ SORU
// SIRASINA bağlı (bkz. TYPE_REVEAL_QUESTION_COUNT ve createQuestion). Kullanıcı
// raporu: tip her zaman söyleniyordu, ilerlemiş sorularda bile — istenen davranış
// her zorlukta AYNI: ilk birkaç soru "ısınma" (tip belli), sonrası "ters köşe"
// (tip gizli). marginOct/hintBandOct hâlâ zorluğa bağlı (bkz. aşağıdaki not).
//
// proplus BURADA çok-bantlı bir varyant DEĞİL — sadece paylaşılan (global,
// mod-bağımsız) Zorluk seçicisinde (index.html #difficultySelect, 5 sabit
// seçenek) bu değer HER ZAMAN seçilebildiği için mode.DIFFICULTY[level]'in HER
// zorluk anahtarında tanımlı dönmesi gerekiyor (aksi halde currentDifficultyConfig()
// çöker) — pro ile AYNI davranır (6 şık).
//
// marginOct/hintBandOct KULAKLA DOĞRULANMADI — Z1'in hassasiyet eğrisiyle AYNI
// durum (bkz. DURUM.md "ZORLUK MİMARİSİ — OTOMATİK VERİLEN KARARLAR"): makul bir
// başlangıç noktası, gerçek algı testiyle ayarlanmalı. marginOct, kesim frekansının
// havuzun (bkz. CUTOFF_MIN/CUTOFF_MAX) log-orta noktasından en az kaç oktav UZAKTA
// seçileceğini belirler — kolayda büyük (kesim net bir şekilde bir UCA yakın, etkisi
// bariz varsayılıyor), zorlaştıkça küçülüp ORTA'ya yaklaşır (etkisi daha ince
// varsayılıyor). Bu bir PSİKOAKUSTİK VARSAYIM, ölçülmedi.
export const DIFFICULTY = {
  easy: { label: "Kolay", xp: 14, options: 3, time: 14, lives: MAX_LIVES, marginOct: 1.6, hintBandOct: 2.0 },
  medium: { label: "Orta", xp: 20, options: 4, time: 12, lives: MAX_LIVES, marginOct: 1.0, hintBandOct: 1.4 },
  hard: { label: "Zor", xp: 32, options: 5, time: 11, lives: MAX_LIVES, marginOct: 0.55, hintBandOct: 0.9 },
  pro: { label: "Pro", xp: 46, options: 6, time: 9, lives: MAX_LIVES, marginOct: 0.3, hintBandOct: 0.5 },
  proplus: { label: "Pro Plus (Çok Bantlı)", xp: 46, options: 6, time: 9, lives: MAX_LIVES, marginOct: 0.3, hintBandOct: 0.5 }
};

// ═══════════════════════════════════════════════════════════════════════════
// ZORLUK EĞRİSİ (ADIM 1 — zorluk sisteminin merkezi bağlanması, Kesim Noktası
// PİLOT modu; ADIM 3'te — bkz. altta "AT_CAP KALİBRASYONU" notu — AT_CAP'lar
// "Sabit mod hiçbir tier'da eskisinden kolay olmasın" kararıyla yeniden
// ayarlandı). Yukarıdaki statik DIFFICULTY tablosu KALDIRILMADI — hem geriye
// dönük uyumluluk (mevcut testler, doğrudan createQuestion çağrıları, proplus,
// app.js'in currentDifficultyConfig()/renderLevelSheet'i) HEM "Sabit" zorluk
// modunun/tier isimlerinin ÇAPASI olarak duruyor (bkz. core/difficulty-curve.js
// dosya başı not: tier isimleri artık DEĞER kaynağı değil, sadece GÖSTERİM/ÇAPA
// — ama artık DEĞER kaynağı OLARAK da hiç okunmuyor, bkz. app.js
// currentDifficultyPosition: Sabit modda representativeLevelForTier(tier) →
// paramsForDifficultyPosition() — Otomatik'le TAMAMEN AYNI yol).
//
// AT_1'ler statik DIFFICULTY.easy değerleriyle birebir aynı (uçta davranış
// korunsun diye). AT_CAP'lar ARTIK statik DIFFICULTY.pro'yla birebir AYNI
// DEĞİL — bkz. "AT_CAP KALİBRASYONU" notu altta: representativeLevelForTier
// artık her tier'ı KENDİ üst sınırında (easy=4, medium=8, hard=12, pro=
// LEVEL_CAP) değerlendirdiği için, salt AT_CAP=eski-pro ile eğri ARADA
// (özellikle hard'da) eski statikten KOLAY çıkıyordu (bkz. ADIM 2 sonrası
// DURUM.md'deki ilk karşılaştırma tablosu) — bu ADIM'da AT_CAP'lar, hard/
// medium/pro'nun HİÇBİRİ eskisinden kolay olmayacak şekilde (gerekirse eski
// pro'dan daha da zor) yeniden çözüldü (bkz. DURUM.md'deki YENİ karşılaştırma
// tablosu — TÜM tier'lar eşit ya da zor). KULAKLA DOĞRULANMALI (bu hâlâ
// makul bir başlangıç noktası, kesin doğru iddia edilmiyor). LEVEL_CAP,
// global DIFFICULTY_CONFIG'inkiyle (20) AYNI seçildi ama BİLEREK KENDİ ALANI.
export const KESIM_CURVE_CONFIG = {
  LEVEL_CAP: 20,

  // Kesim frekansının havuzun log-merkezinden minimum uzaklığı (oktav) — bkz.
  // pickCutoffFreq/CENTER_LOG. AT_CAP KALİBRASYONU: eski pro (0.3) yerine 0.22 —
  // representativeLevelForTier("hard")=12'de eğrinin 0.55'i (eski hard) AŞMAMASI
  // için gereken en gevşek tavan ~0.253'tü (hesaplandı, bkz. commit mesajı); 0.22
  // güvenlik payı bırakıyor. Sonuç: pro artık eski pro'dan ~%27 daha zor (0.22<0.3).
  MARGIN_OCT_AT_1: 1.6,
  MARGIN_OCT_AT_CAP: 0.22,
  MARGIN_OCT_FLOOR: 0.15,
  MARGIN_OCT_REDUCTION_PER_STEP: 0.01,

  // İpucu maskesinin açık bıraktığı bant genişliği (oktav) — bkz. renderHintMask.
  // AT_CAP KALİBRASYONU: 0.5→0.45 (aynı gerekçe — hard=12'de eski hard'ı (0.9)
  // aşmasın, hesaplanan en gevşek tavan ~0.500'dü, 0.45 güvenlik payı bırakıyor).
  HINT_BAND_OCT_AT_1: 2.0,
  HINT_BAND_OCT_AT_CAP: 0.45,
  HINT_BAND_OCT_FLOOR: 0.2,
  HINT_BAND_OCT_REDUCTION_PER_STEP: 0.01,

  // Soru süresi (sn) — HENÜZ round-timer'a BAĞLANMADI (bkz. app.js
  // currentDifficultyPosition notu) — G21'in hizalı süre davranışını riske
  // atmamak için bilinçli bir kapsam kararı, bu turda SADECE hesaplanıyor/
  // test ediliyor, oyun ekranına yansımıyor.
  TIME_SEC_AT_1: 14,
  TIME_SEC_AT_CAP: 9,
  TIME_SEC_FLOOR: 6,
  TIME_SEC_REDUCTION_PER_STEP: 0.1,

  // Çeldiricilerin doğru cevaptan minimum oktav mesafesi — bkz. generateChoices/
  // DISTRACTOR_STEP_OCT. AT_CAP KALİBRASYONU: 0.65→0.52 (hesaplanan en gevşek
  // tavan ~0.533'tü). FLOOR de BİRLİKTE indirildi (0.55→0.51) — AT_CAP'in
  // ALTINDA kalması gerekiyordu (aksi halde applyPostCapFloor hiç anlamlı
  // azalma yapamazdı); 0.51 hâlâ FREQ_TOLERANCE_OCT'tan (0.5) HER ZAMAN büyük
  // (bkz. o sabitin invaryant notu, test.mjs bunu doğruluyor) — tavanın çok
  // üzerinde bile (marjinal) yanlış bir şık asla "doğru" sayılamaz, sadece
  // eski GÜVENLİK PAYI (0.05) daralıp (0.01) oldu, invaryant KIRILMADI.
  STEP_OCT_AT_1: 1.2,
  STEP_OCT_AT_CAP: 0.52,
  STEP_OCT_FLOOR: 0.51,
  STEP_OCT_REDUCTION_PER_STEP: 0.002,

  // Şık sayısı — tam sayıya yuvarlanır (bkz. paramsForDifficultyPosition), 3-6
  // arası kırpılır (dar CUTOFF_MIN-CUTOFF_MAX havuzunda generateChoices zaten
  // kendi içinde MEVCUT/sığdırılabilir sayıya düşürüyor, bkz. o fonksiyonun
  // notu). AT_CAP KALİBRASYONU: 6→6.15 — round(logLerp(...)) hard=12'de TAM 5'e
  // (eski hard) ulaşsın diye (6 ile 4'e yuvarlanıyordu, eskisinden AZ şık
  // demekti); son değer yine Math.min(6,...) ile 6'da kırpılıyor, oyun ekranına
  // hiçbir zaman 6'dan fazla şık YANSIMAZ, sadece ARA hesaplama 6'yı geçebiliyor.
  OPTIONS_AT_1: 3,
  OPTIONS_AT_CAP: 6.15
};

// SAF FONKSİYON. position: zorlukKonumu (continuousLevel + sessionRampOffset,
// bkz. app.js currentDifficultyPosition) — MOD-AGNOSTİK bir sayı, bu fonksiyon
// onu KESİM NOKTASI'NIN kendi parametrelerine çevirir (bkz. difficulty-curve.js
// dosya başı not: "mod kendi çeviri fonksiyonunu yazar"). boss'un etkisi BURADA
// DEĞİL — position'ın KENDİSİ zaten app.js'te sessionRampOffset(...,{boss}) ile
// yükseltilmiş olarak gelir (çifte ceza olmasın diye, bkz. o fonksiyonun notu).
export function paramsForDifficultyPosition(position, config = KESIM_CURVE_CONFIG) {
  const safePos = Math.max(1, position);
  const cappedPos = Math.min(safePos, config.LEVEL_CAP);
  const t = config.LEVEL_CAP > 1 ? (cappedPos - 1) / (config.LEVEL_CAP - 1) : 1;

  const marginCurve = logLerp(config.MARGIN_OCT_AT_1, config.MARGIN_OCT_AT_CAP, t);
  const hintCurve = logLerp(config.HINT_BAND_OCT_AT_1, config.HINT_BAND_OCT_AT_CAP, t);
  const timeCurve = logLerp(config.TIME_SEC_AT_1, config.TIME_SEC_AT_CAP, t);
  const stepCurve = logLerp(config.STEP_OCT_AT_1, config.STEP_OCT_AT_CAP, t);
  const optionsCurve = logLerp(config.OPTIONS_AT_1, config.OPTIONS_AT_CAP, t);

  return {
    position: safePos,
    marginOct: applyPostCapFloor(marginCurve, safePos, config.LEVEL_CAP, config.MARGIN_OCT_FLOOR, config.MARGIN_OCT_REDUCTION_PER_STEP),
    hintBandOct: applyPostCapFloor(hintCurve, safePos, config.LEVEL_CAP, config.HINT_BAND_OCT_FLOOR, config.HINT_BAND_OCT_REDUCTION_PER_STEP),
    timeSec: applyPostCapFloor(timeCurve, safePos, config.LEVEL_CAP, config.TIME_SEC_FLOOR, config.TIME_SEC_REDUCTION_PER_STEP),
    distractorStepOct: applyPostCapFloor(stepCurve, safePos, config.LEVEL_CAP, config.STEP_OCT_FLOOR, config.STEP_OCT_REDUCTION_PER_STEP),
    options: Math.max(3, Math.min(6, Math.round(optionsCurve)))
  };
}

// G18: seans içi rampa — her SEANSTA (resetSession() ile sınırlanır, bkz. app.js:
// Oyunu Başlat/Tekrar Oyna/10 Soru Daha) ilk TYPE_REVEAL_QUESTION_COUNT soru tipi
// SÖYLER (ısınma), sonrasında tip GİZLENİR. Zorluktan BAĞIMSIZ — kolay/pro fark
// etmez, tek belirleyici seans içindeki soru sırası. session-plan.js'teki
// buildSessionPlan/pickWeightedDifficulty ile AYNI "seans içi rampa" felsefesini
// paylaşır (10 soruluk zorluk rampası) ama o dosyadan bir şey İTHAL ETMİYORUZ —
// orada "tip gizleme" diye bir kavram yok (sadece zorluk-kademesi dağılımı), sahte
// bir bağımlılık kurmak yerine kendi tek-satırlık eşiği burada tutuluyor. app.js
// `session.correct + session.wrong`'u (0-tabanlı, cevaplanan soru sayısı — resetSession
// ile sıfırlanır) `settings.sessionQuestionIndex` olarak geçirir.
export const TYPE_REVEAL_QUESTION_COUNT = 3;

// Şıklardaki frekans çeldiricilerinin doğru cevaptan oktav cinsinden minimum
// mesafesi — evaluateAnswer'daki FREQ_TOLERANCE_OCT'tan (0.5) her zaman büyük
// olmalı (bkz. frekans-bulma.js DISTRACTOR_STEP_OCT'un AYNI invaryantı).
export const DISTRACTOR_STEP_OCT = { easy: 1.2, medium: 0.9, hard: 0.75, pro: 0.65, proplus: 0.65 };

// evaluateAnswer'da "doğru" sayılmanın frekans toleransı (oktav) — DISTRACTOR_STEP_OCT'un
// HER değerinden küçük olmalı, yoksa yanlış bir şıkka basmak yine "doğru" sayılabilir.
export const FREQ_TOLERANCE_OCT = 0.5;

// Filtre eğimi (Q) — başlangıç için makul, SABİT bir değer (2. derece/"12 dB/oktav"
// biquad, ~Butterworth). Zorlukla eğim değişimi bu iskeletin kapsamı dışında,
// sonraki bir iş (bkz. dosya başı not).
const FILTER_Q = Math.SQRT1_2; // ≈ 0.707

// G18 bug taraması bulgusu: FA_MIN–FA_MAX (80 Hz–17 kHz) Frekans Bulma'nın PEAKING
// bant merkezleri için seçilmişti (bkz. o dosyanın notu) — bir HPF/LPF KESİMİ için
// bu havuzun mutlak uçlarına çok yakın bir değer (ör. FA_MIN'e yakın bir HPF, FA_MAX'a
// yakın bir LPF) filtrenin etkisini neredeyse hiç yok kılar (geçen bant zaten
// baskındır); öbür uçta (FA_MIN'e yakın bir LPF, FA_MAX'a yakın bir HPF) filtre AŞIRI
// agresif olur — kalan dar bant içinde şıklar arasında kulakla ayrım yapmak
// zorlaşabilir (kullanıcı raporu: "172 Hz LPF ayırt edilemeyebilir"). Bu yüzden kesim
// noktası artık TÜM FA_MIN–FA_MAX'tan değil, dar bir CUTOFF_MIN–CUTOFF_MAX
// havuzundan seçiliyor — mix'te HPF/LPF'in gerçekten anlamlı olduğu aralığa daha
// yakın. Bu sınırlar da KULAKLA DOĞRULANMADI, makul bir başlangıç noktası.
export const CUTOFF_MIN = 100;
export const CUTOFF_MAX = 8000;

// Kesim frekansı havuzunun (log) geometrik ortası (100*8000'in karekökü ≈ 894 Hz,
// ALT-ORTA/ORTA sınırına yakın düşer). marginOct bu noktadan itibaren ölçülür.
const CENTER_FREQ = Math.sqrt(CUTOFF_MIN * CUTOFF_MAX);
const CENTER_LOG = Math.log2(CENTER_FREQ);

// SAF FONKSİYON. Log-havuzdan (CUTOFF_MIN–CUTOFF_MAX) merkeze en az marginOct oktav
// uzak bir frekans çeker (reddet-örnekle). marginOct değerleri (bkz. DIFFICULTY)
// havuzun yarı log-genişliğinin (~3.16 oktav) altında kaldığı için 200 denemede
// pratikte HER ZAMAN başarılı olur; güvenlik ağı olarak son denemeyi (kısıtlamayı
// gözardı ederek) döndürür — sessizce hatalı bir frekans üretmek yerine en azından
// havuz İÇİNDE kalır.
export function pickCutoffFreq(marginOct, rng = Math.random) {
  for (let i = 0; i < 200; i++) {
    const f = logFreq(CUTOFF_MIN, CUTOFF_MAX);
    if (Math.abs(Math.log2(f) - CENTER_LOG) >= marginOct) return f;
  }
  return CUTOFF_MIN * Math.pow(CUTOFF_MAX / CUTOFF_MIN, rng());
}

// SAF FONKSİYON. correctFreq etrafında (options-1) çeldirici üretir — frekans
// mesafesi frekans-bulma.js:generateChoices ile AYNI "tam k*step oktav, taraf taraf"
// algoritması (range her zaman CUTOFF_MIN–CUTOFF_MAX, bu modun odak aralığı kavramı
// yok). typeRevealed=false ise en az bir çeldiricinin filtre TİPİ çevrilir (doğru şık
// ASLA) — tip gizliyken kullanıcı gerçekten hem tip hem frekans ayrımı yapmak zorunda
// kalsın diye; typeRevealed=true ise TÜM şıklar doğru tiple aynı kalır (tip zaten
// söylendi). ADIM 1: level STRING yerine ÇÖZÜLMÜŞ {options, step} alıyor — createQuestion
// bunu ister statik DIFFICULTY[level]'den ister paramsForDifficultyPosition()'dan
// doldurup buraya geçiriyor, generateChoices'in KENDİSİ eğri/statik farkını bilmiyor.
export function generateChoices(correctFreq, correctType, resolved, typeRevealed) {
  const step = resolved.step;
  const correctOct = Math.log2(correctFreq);
  const minOct = Math.log2(CUTOFF_MIN), maxOct = Math.log2(CUTOFF_MAX);
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
  let choices = freqs.map(f => ({ freq: f, filterType: correctType, correct: f === correctFreq }));

  if (!typeRevealed) {
    const otherType = correctType === "highpass" ? "lowpass" : "highpass";
    const flippable = shuffle(choices.map((_, i) => i).filter(i => !choices[i].correct));
    flippable.forEach((idx, n) => {
      if (n === 0 || Math.random() < 0.5) choices[idx] = { ...choices[idx], filterType: otherType };
    });
  }
  return shuffle(choices);
}

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

// ad/aciklama BİLEREK yok — Frekans Bulma ile AYNI kural (bkz. o dosyanın notu),
// kart metni yalnızca core/mode-catalog.js'ten okunur.
export function getMeta() {
  return {
    id: MODE_ID,
    motor: 1,
    kulaklikGerekli: false,
    // Kaynak kısıtlaması YOK (task kararı, frekans/EQ her kaynakta duyulur) —
    // compatibleSourceIds() parametresiz çağrıldığında tüm SOURCE_GROUPS'u döner
    // (bkz. source-catalog.js) — mekanizma Reverb/Kompresör'le AYNI, sadece bu
    // modda hiçbir bayrak filtrelenmiyor.
    uyumluKaynaklar: compatibleSourceIds(),
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY,
    // G18 bug taraması: bu mod "Dokunmalı" (dalgaya tıklama) DESTEKLEMİYOR — SADECE
    // şıklı. app.js bu bayrağı okuyup "Cevap biçimi" toggle'ını (chip + Oyun Ayarları
    // satırı) bu mod aktifken GİZLİYOR (kullanıcı raporu: toggle görünüyordu ama
    // "Dokunmalı"ya bağlı hiçbir şey yoktu, seçilince sessizce hiçbir şey olmuyordu).
    choiceOnly: true
  };
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz. settings: { source, boss,
// sessionQuestionIndex — bkz. TYPE_REVEAL_QUESTION_COUNT notu, 0-tabanlı, verilmezse
// 0 (yani ilk soru gibi davranır — typeRevealed=true, geriye dönük güvenli varsayılan);
// difficultyPosition — ADIM 1: app.js'in GERÇEK oyun akışı (startRound) HER ZAMAN
// bir sayı verir (bkz. o dosyadaki currentDifficultyPosition) — verilirse marginOct/
// hintBandOct/options/step EĞRİDEN (paramsForDifficultyPosition) gelir, 4 sabit
// basamak yerine SÜREKLİ zorlukKonumu'ndan beslenir. VERİLMEZSE (mevcut testler,
// doğrudan çağrılar, proplus — bkz. app.js'in proplus'u eğri dışında bırakma kararı)
// ESKİ statik DIFFICULTY[level] davranışı BİREBİR korunur — geriye dönük uyumluluk }.
// Bu modun odak aralığı (FOCUS_RANGES) kavramı yok — her zaman CUTOFF_MIN–CUTOFF_MAX havuzu.
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "pink";
  const filterType = Math.random() < 0.5 ? "highpass" : "lowpass";

  // proplus BİLEREK eğri DIŞINDA TUTULUR — app.js'in currentDifficultyPosition()'ı
  // proplus için zaten difficultyPosition hiç ÜRETMEZ (undefined geçer), ama bu
  // kontrol BURADA da (savunma katmanı) tekrarlanıyor — createQuestion doğrudan
  // (app.js dışından, ör. testten) çağrılırsa bile proplus'un kendi statik satırına
  // sadık kalması GARANTİ olsun diye (bkz. Z5 kararı: proplus merdivenin dışında).
  const curve = (level !== "proplus" && Number.isFinite(settings.difficultyPosition))
    ? paramsForDifficultyPosition(settings.difficultyPosition)
    : null;

  // Eğri YOKSA (statik yol): boss round'da merkeze daha yakın (daha ince/zor) bir
  // kesim — frekans-bulma.js'in "boss'ta gain/q daha yakın/zor" desenine paralel.
  // Eğri VARSA bu çarpan UYGULANMAZ — boss'un etkisi zaten position'ın İÇİNDE
  // (app.js sessionRampOffset(...,{boss}) ile position'ı yükseltmiş olarak verir,
  // burada TEKRAR küçültmek çifte ceza olurdu, bkz. paramsForDifficultyPosition notu).
  const marginOct = curve ? curve.marginOct : (boss ? diff.marginOct * 0.6 : diff.marginOct);
  const resolved = curve
    ? { options: curve.options, step: curve.distractorStepOct }
    : { options: diff.options, step: DISTRACTOR_STEP_OCT[level] || DISTRACTOR_STEP_OCT.medium };
  const hintBandOct = curve ? curve.hintBandOct : diff.hintBandOct;
  const timeSec = curve ? curve.timeSec : diff.time;

  const freq = pickCutoffFreq(marginOct);
  const sessionQuestionIndex = Number.isFinite(settings.sessionQuestionIndex) ? settings.sessionQuestionIndex : 0;
  const typeRevealed = sessionQuestionIndex < TYPE_REVEAL_QUESTION_COUNT;

  return {
    mode: "cutoff",
    difficulty: level,
    filterType,
    filterLabel: filterType === "highpass" ? "HPF" : "LPF",
    typeRevealed,
    freq,
    source,
    hintUsed: false,
    boss,
    // ADIM 1: soru üzerinde taşınır ki renderHintMask DIFFICULTY[level]'e değil
    // BUNA baksın (eğri/statik farkını bilmeden) — bkz. o fonksiyonun notu.
    hintBandOct,
    timeSec,
    choices: generateChoices(freq, filterType, resolved, typeRevealed)
  };
}

export function modeDescription(q) {
  return q.typeRevealed
    ? "A/B ile karşılaştır, kesim frekansının nerede olduğunu şıklardan seç."
    : "A/B ile karşılaştır, filtre tipini ve kesim frekansını şıklardan seç.";
}

export function correctLabel(q) {
  return `${formatHz(q.freq)} ${q.filterLabel}`;
}

// Soruda uygulanan HPF/LPF'i audioCtx üzerinde kurar (audio-engine.js bunu
// sourceMix→...→compressor arasına bağlar — bkz. o dosyanın buildQuestionChain'i).
export function applyProcessing(question, { audioCtx }) {
  const f = audioCtx.createBiquadFilter();
  f.type = question.filterType;
  f.frequency.value = question.freq;
  f.Q.value = FILTER_Q;
  return { filters: [f] };
}

// SAF FONKSİYON. answer: { freq, filterType } — şıklı arayüzden gelen seçimin HER
// İKİ bileşeni de taşınır (tip gizliyken kullanıcının seçtiği şık yanlış TİPİ de
// içerebilir). "Doğru" sayılması için hem frekans (oktav toleransı içinde) HEM tip
// eşleşmeli — biri tutup diğeri tutmazsa yanlıştır (freqOk/typeOk ayrı ayrı
// getFeedbackData'da hangi kısmın kaçırıldığını anlatmak için taşınır).
export function evaluateAnswer(question, answer) {
  const guessFreq = answer && typeof answer === "object" ? answer.freq : answer;
  const guessType = (answer && typeof answer === "object" && answer.filterType) || question.filterType;
  const dOct = Math.abs(Math.log2(guessFreq / question.freq));
  const freqOk = dOct <= FREQ_TOLERANCE_OCT;
  const typeOk = guessType === question.filterType;
  return {
    mode: "cutoff",
    correct: freqOk && typeOk,
    freqOk, typeOk, dOct,
    zone: faZoneOf(question.freq),
    guessFreq, guessType
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
// ÖĞRETİCİ METİN ŞABLONLARI (G20) — TEK YERDE, kolay düzenlenebilir. Bunlar
// makul/doğru bir BAŞLANGIÇ — kullanıcı ("kanalın sesi") sonradan kendi
// üslubuyla değiştirecek, KESİN NİHAİ metin iddia edilmiyor (Z1'in hassasiyet
// tablosuyla AYNI durum, bkz. o dosyanın notu). Teknik değer (dB/oct, Q) HİÇ
// verilmiyor — sadece frekans + sesin üzerindeki etki (mix dili).
//
// ZONE_EFFECT: bölge anahtarları FA_ZONES'un kısa adlarıyla (faZoneOf(...).t.
// split(" (")[0]) BİREBİR AYNI — frekans-bulma.js'e yeni bir bölge eklenirse
// burası da güncellenmeli (bu modun havuzu CUTOFF_MIN–CUTOFF_MAX olduğu için
// pratikte SUB'ın üst kısmından ÜST-ORTA'nın alt kısmına kadar kullanılıyor,
// TİZ/HAVA ve SUB'ın tamamı CUTOFF_MAX/MIN dışında kaldığı için nadiren/hiç
// tetiklenmez — yine de havuz sınırları ilerde genişlerse diye TÜM 6 bölge
// dolduruldu, boş bırakılmadı).
const ZONE_EFFECT = {
  highpass: {
    "SUB": "rumble/masa gürültüsünü ve gereksiz alt uğultuyu temizler, gövdeye dokunmaz",
    "BAS": "bas/kick gövdesinin bir kısmını da alır — dikkatli kullan, ince bir alt kalır",
    "ALT-ORTA": "gövdeyi ciddi inceltir, ses zayıflamaya başlar",
    "ORTA": "sesin gövdesinin çoğu gider, ince/telefon gibi bir ton kalır",
    "ÜST-ORTA": "neredeyse her şeyi keser, sadece en tiz kısım kalır",
    "TİZ / HAVA": "sesin neredeyse tamamını keser, çok az bir tıslama kalır"
  },
  lowpass: {
    "SUB": "neredeyse her şeyi keser, sadece en pes uğultu kalır",
    "BAS": "sesi ciddi boğar, sadece bas/gövde bölgesi kalır",
    "ALT-ORTA": "netlik ve tizlik gider, ses kalınlaşıp boğuklaşır",
    "ORTA": "sesi boğar, netlik gider",
    "ÜST-ORTA": "tiz sertliğini/parlaklığı alır, ses yumuşar",
    "TİZ / HAVA": "sadece en tepedeki havayı/parlaklığı alır, ses neredeyse aynı kalır"
  }
};
const ZONE_EFFECT_FALLBACK = "sesi belirgin şekilde değiştirir";

// Tip yanlış seçilince (case 3) HPF/LPF'in ne yaptığını karşılaştırmalı hatırlatan
// ifadeler — filterType'a göre.
const TYPE_EXPLAIN = { highpass: "altı kesiyor, üstü geçiyor", lowpass: "üstü kesiyor, altı geçiyor" };
const TYPE_REMINDER = { highpass: "HPF'de tiz kalır, alt gider", lowpass: "LPF'de alt kalır, tiz gider" };

// Tip doğru ama frekans yanlışken (case 2) YÖNE göre (kullanıcı doğrudan daha
// yukarıda mı aşağıda mı dedi) ses üzerindeki etki — HPF'de yukarı gitmek daha
// AGRESİF kesim (gövde de gider), LPF'de yukarı gitmek daha AZ agresif (gereğinden
// fazla tiz kalır) demek — bu yüzden iki filtre tipi için yön↔etki eşlemesi TERS.
const DIRECTION_EFFECT = {
  highpass: {
    higher: "gövdenin bir kısmı da gider, ses inceleşir",
    lower: "istenen kısım tam temizlenmez, biraz gürültü/gövde kalır"
  },
  lowpass: {
    higher: "gereğinden fazla tiz kalır, sertlik tam gitmez",
    lower: "gereğinden fazla boğuklaşır, netlik daha çok gider"
  }
};

function typeLabelOf(filterType) {
  return filterType === "highpass" ? "HPF" : "LPF";
}

// SAF FONKSİYON. Cevap sonrası öğretici Türkçe metin gövdesi (1-2 cümle) — ÜÇ
// durum: (1) doğru — kısa onay + o filtrenin bu bölgede mix'te ne işe yaradığı;
// (2) tip doğru, frekans yanlış — hangi YÖNE kaçtığını + o yöndeki ses etkisini
// anlatır; (3) tip yanlış — HPF/LPF farkını karşılaştırmalı hatırlatır (bu
// durumda frekans hatası AYRICA anlatılmaz, kısa tutmak için — task kararı).
// getFeedbackData bunu çağırıp title/detail'e böler (bkz. altı).
export function teachingText(question, answer) {
  const result = evaluateAnswer(question, answer);

  if (result.correct) {
    const effect = (ZONE_EFFECT[question.filterType] && ZONE_EFFECT[question.filterType][faZoneOf(question.freq).t.split(" (")[0]]) || ZONE_EFFECT_FALLBACK;
    return `${correctLabel(question)} — ${effect}.`;
  }

  if (!result.typeOk) {
    const guessLabel = typeLabelOf(result.guessType);
    return `Bu bir ${question.filterLabel}'ti — ${TYPE_EXPLAIN[question.filterType]}. Sen ${guessLabel} dedin, o ${TYPE_EXPLAIN[result.guessType]}. Dinle: ${TYPE_REMINDER[question.filterType]}.`;
  }

  // typeOk && !freqOk
  const direction = result.guessFreq > question.freq ? "higher" : "lower";
  const directionWord = direction === "higher" ? "çok yukarı" : "çok aşağı";
  const effect = DIRECTION_EFFECT[question.filterType][direction];
  return `${question.filterLabel}'yi doğru duydun ama kesimi ${directionWord} koydun. ${formatHz(question.freq)}'di, sen ${formatHz(result.guessFreq)} dedin — ${effect}.`;
}

// getFeedbackData: teachingText'in gövdesini title (kısa başlık, #feedbackBox'ın
// kalın satırı) ve detail (açıklama, #feedbackBox'ın gövde metni) arasında
// böler — panel BİLEREK yok (bkz. dosya başı not, karşılaştırma-önizleme
// butonları ayrı bir iş), showResult:true — app.js bunu artık GÖSTERİYOR
// (G20 düzeltmesi: önceki commit'lerde showResult:false yanlışlıkla kartı
// hep gizli bırakıyordu, bkz. DURUM.md).
export function getFeedbackData(question, answer, context = {}) {
  const result = evaluateAnswer(question, answer);
  const gained = context.gained || 0;
  const text = teachingText(question, answer);

  if (result.correct) {
    return { result, title: "Doğru!", detail: `${text} (+${gained} XP)`, showResult: true, panel: null };
  }
  const title = result.typeOk ? "Yakın ama kaçtı" : "Ters yöne gittin";
  return { result, title, detail: text, showResult: true, panel: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// SÖZLEŞMENİN DIŞINDA: bu moda özgü render/UI yardımcıları (opsiyonel, ama app.js'in
// PAYLAŞILAN oyun ekranı bunları "mode.X()" ile genel olarak çağırıyor — bkz.
// frekans-bulma.js'in aynı başlıklı bölümü).
// ═══════════════════════════════════════════════════════════════════════════

export function getHintText(question) {
  return faZoneOf(question.freq).t.split(" (")[0];
}

export function renderHintMask(hintMaskLayerEl, question) {
  if (!hintMaskLayerEl || !question) return;
  // ADIM 1: question.hintBandOct (createQuestion'ın koyduğu, eğri/statik farkını
  // zaten çözmüş değer) ÖNCELİKLİ — DIFFICULTY[question.difficulty] sadece question
  // nesnesi elle kurulmuş (ör. eski bir test) ve hintBandOct hiç yoksa devreye girer.
  const diff = DIFFICULTY[question.difficulty] || DIFFICULTY.medium;
  const halfOct = (question.hintBandOct != null ? question.hintBandOct : (diff.hintBandOct || 1.4)) / 2;
  const lo = Math.max(FA_MIN, question.freq / Math.pow(2, halfOct));
  const hi = Math.min(FA_MAX, question.freq * Math.pow(2, halfOct));
  // NOT: FA_MIN/FA_MAX (eksen tam görünür aralığı) ile kırpılıyor, CUTOFF_MIN/MAX
  // (soru havuzu) ile DEĞİL — ipucu maskesi ekranın TAMAMINI kapsayan bir katman,
  // dar soru havuzuna kırpılırsa maskenin geri kalanı (hiç soru gelemeyecek ama
  // ekranda GÖRÜNEN) bölgede yanlışlıkla "açık" görünüp ipucunu gevşetirdi.
  const a = faFToX(lo, 1), b = faFToX(hi, 1);

  hintMaskLayerEl.innerHTML = "";
  [[0, a], [b, 1]].forEach(([x0, x1]) => {
    if (x1 - x0 <= 0.001) return;
    const div = document.createElement("div");
    div.className = "hint-mask-seg";
    div.style.left = `${(x0 * 100).toFixed(2)}%`;
    div.style.width = `${((x1 - x0) * 100).toFixed(2)}%`;
    hintMaskLayerEl.appendChild(div);
  });
  // bkz. frekans-bulma.js:renderHintMask AYNI not — offsetHeight zorla reflow +
  // hemen .show, rAF yerine (sekme arka plandayken rAF ertelenebiliyor).
  void hintMaskLayerEl.offsetHeight;
  hintMaskLayerEl.querySelectorAll(".hint-mask-seg").forEach(el => el.classList.add("show"));
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
// döner, dokunmalı arayüz yok). data-filter-type app.js'in click-delegasyonunda
// answer={freq,filterType} kurmak için okunur (bkz. app.js .ans click dinleyicisi).
// typeRevealed olsa da olmasa da tip etiketi (HPF/LPF) gösterilir — revealed'da tüm
// şıklar zaten AYNI tipte olduğu için bu bir "ipucu sızıntısı" değil, sadece
// hatırlatma; hidden'da ise gösterilenin ta kendisi (o ŞIKKIN taşıdığı tip).
export function renderAnswerChoices(answersEl, q) {
  if (!answersEl) return;
  if (!q.choices) { answersEl.innerHTML = ""; answersEl.classList.add("hidden"); return; }
  answersEl.className = "answers";
  answersEl.innerHTML = q.choices.map(c => {
    const typeLabel = c.filterType === "highpass" ? "HPF" : "LPF";
    return `<button type="button" class="ans" data-freq="${c.freq}" data-filter-type="${c.filterType}">` +
      `<b>${formatHz(c.freq)}</b><span>${typeLabel}</span></button>`;
  }).join("");
}

// Cevap verildikten sonra .ans butonlarını doğru/yanlış/seçili olarak işaretler.
// picked: {freq, filterType} — hem frekans HEM tip eşleşmeli ki bir şık "doğru"
// (right) sayılsın, aksi halde sadece frekansı tutan yanlış-tipli bir şık de
// (typeRevealed=false'ta mümkün) "sen bunu seçtin" (wrong) olarak işaretlenir.
export function markAnswerChoices(answersEl, q, picked) {
  if (!answersEl || !q.choices) return;
  const pickedFreq = picked && typeof picked === "object" ? picked.freq : picked;
  const pickedType = picked && typeof picked === "object" ? picked.filterType : null;
  Array.from(answersEl.querySelectorAll(".ans")).forEach(btn => {
    const f = Number(btn.dataset.freq);
    const t = btn.dataset.filterType;
    btn.classList.remove("pick");
    btn.disabled = true;
    if (f === q.freq && t === q.filterType) btn.classList.add("right");
    else if (pickedFreq != null && f === pickedFreq && t === pickedType) btn.classList.add("wrong");
  });
}

// Paylaşılan frekans ekseni (gridline + tik etiketleri) — spektrum çubuklarının
// altında/arkasında aynı ölçekte dursun diye (drawVisualizer her zaman
// mode.drawOverlay çağırır, bkz. app.js).
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

// Cevap sonrası filtre eğrisi — GERÇEK bir BiquadFilterNode kurup getFrequencyResponse()
// okuyor (frekans-bulma.js:getEqCurveForQuestion ile AYNI teknik — ses motoruyla
// BİREBİR aynı matematik, elle yaklaşıklık değil). N=160 nokta, eksenle (faXToF) AYNI
// log ölçekte örnekleniyor ki eğri gerçekten doğru x konumuna otursun.
const CURVE_POINTS = 160;
function computeFilterCurveDb(audioCtx, freq, filterType, w) {
  if (!audioCtx) return null;
  const freqs = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) freqs[i] = faXToF((i / (CURVE_POINTS - 1)) * w, w);
  const mag = new Float32Array(CURVE_POINTS);
  const phase = new Float32Array(CURVE_POINTS);
  const filter = audioCtx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = freq;
  filter.Q.value = FILTER_Q;
  filter.getFrequencyResponse(freqs, mag, phase);
  const db = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) db[i] = 20 * Math.log10(Math.max(mag[i], 1e-6));
  return db;
}

// HPF/LPF yanıtı peaking'in aksine SINIRSIZ tek yönlü (0 dB geçen bantta, -∞'a
// yaklaşan durdurma bandında) — bu yüzden frekans-bulma.js'in "±maxAbsDb, merkez
// çizgi" eşlemesi yerine 0 dB'yi ÜSTE (geçen bant, düz), -DB_RANGE'i ALTA (durdurma
// bandı, çubukların hemen üstü) oturtan tek-yönlü bir eşleme kullanılıyor — "HPF
// solda iner sağda düz, LPF sağda iner solda düz" görünümü doğal olarak bundan çıkıyor.
const DB_RANGE = 30;
function drawFilterCurve(ctx2d, w, h, db, color, alpha) {
  const plotBottom = h - AXIS_H;
  const curveTop = CURVE_TOP, curveBottom = plotBottom - 6;
  const yAt = i => {
    const d = Math.max(-DB_RANGE, Math.min(0, db[i]));
    const t = (d + DB_RANGE) / DB_RANGE; // 0 = tam kesilmiş, 1 = tam geçen bant
    return curveBottom - t * (curveBottom - curveTop);
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

function drawCurveLegend(ctx2d, w, showGuess) {
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

// Soru sırasında (roundActive) eğri BİLEREK gösterilmez — kullanıcı kesim noktasını
// KULAĞIYLA bulmalı, göz hile olur (task kararı). Sadece cevap verildikten SONRA
// (roundActive=false) hem kullanıcının seçtiği (freq+TİP — tip gizliyken yanlış tip
// seçtiyse eğri de o YANLIŞ tipte çizilir, öğretici) hem doğru cevabın eğrisi çizilir;
// doğru bilinmişse ikisi aynı yerde üst üste biner. state: { audioCtx, activeQuestion,
// roundActive, cutoffGuess } — cutoffGuess app.js'te submitCutoffGuess'in {freq,
// filterType} olarak kaydettiği KULLANICI cevabı (bkz. app.js dosyasındaki tanım notu),
// yeni soru başında null'a döner.
export function drawOverlay(ctx2d, canvasEl, w, h, state = {}) {
  drawAxis(ctx2d, w, h);
  const { audioCtx, activeQuestion: q, roundActive, cutoffGuess } = state;
  if (!q || roundActive) return;

  const correctDb = computeFilterCurveDb(audioCtx, q.freq, q.filterType, w);
  const guessDb = cutoffGuess ? computeFilterCurveDb(audioCtx, cutoffGuess.freq, cutoffGuess.filterType, w) : null;
  if (!correctDb && !guessDb) return;

  // Kullanıcının eğrisi ÖNCE (altta), doğru cevap SONRA (üstte) — tam isabette
  // üstteki yeşil baskın görünür ("bu doğruydu"), ıskalamada ikisi ayrı ayrı seçilir.
  if (guessDb) drawFilterCurve(ctx2d, w, h, guessDb, GUESS_COLOR, 0.85);
  if (correctDb) drawFilterCurve(ctx2d, w, h, correctDb, CORRECT_COLOR, 0.85);

  drawCurveLegend(ctx2d, w, !!guessDb);
}

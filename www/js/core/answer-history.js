// G285 — 1.1'in "Son Oyunlarım" listesi (kullanıcı geçmiş bir soruya basınca
// kendi cevabıyla doğru cevabı arka arkaya dinleyecek) İÇİN kayıt formatı.
// ŞİMDİ açılıyor çünkü sonradan eklenirse geçmiş veri OLMAZ — kullanıcı
// 1.1'e geçtiğinde liste BOŞ kalırdı (task'ın kendi gerekçesi). Bu SADECE
// KAYIT — 1.1'in kendi replay UI'ı bu turun KAPSAMI DIŞINDA.
//
// OLCUM-KALAN-17-08 E.6'nın bulduğu gibi: zorluk/süre ZATEN submit anında
// yerel kapsamda duruyor (XP hesabı için kullanılıyor), SADECE hiçbir
// yere YAZILMIYOR — bu dosya o boşluğu dolduruyor, YENİ bir hesaplama
// İCAT ETMİYOR.
//
// SAF FONKSİYONLAR — DOM/localStorage bağımsız, test edilebilir. Gerçek
// okuma/yazma core/storage.js'te (ANSWER_HISTORY_KEY, G229/G232'nin
// trySave() koruması + G233'ün şema sürümü).

export const ANSWER_HISTORY_LIMIT = 200;

// SAF FONKSİYON. modeId: mode-catalog.js id'si (12 sabit değerden biri —
// "Son Oyunlarım"ın mod-bazlı filtrelemesi/gruplaması BUNA göre olacak).
// question: mode.evaluateAnswer'a geçirilen aktif soru (q). answer: HAM
// kullanıcı cevabı (submit handler'ın aldığı argüman, AYNEN). result:
// mode.evaluateAnswer(question, answer)'ın döndürdüğü nesne. extra:
// { timeSpentSec, timestamp (verilmezse Date.now()) }.
//
// `params`: MOD BAZINDA seçilmiş, 1.1'in sesi yeniden üretmesine yetecek
// alanlar (question'ın applyProcessing()'in okuduğu alt kümesi) + kullanıcı
// cevabı + doğru cevap — HİÇBİR alan UYDURULMADI, hepsi ilgili mod
// dosyasının GERÇEK createQuestion()/evaluateAnswer() dönüş şeklinden
// (www/js/modes/*.js, doğrudan okunarak) alındı.
// G326 (OLCUM-ATLA-KAYIT-19-08) — `extra.skipped` (varsayılan false)
// "Atla" ile geçilen (cevapsız) sorular İÇİN YENİ, TEK bir alan —
// MEVCUT alanlar (modeId/timestamp/difficulty/timeSpentSec/correct/
// params) TEK SATIR değişmedi, eski kayıtlarda bu alan YOK ve `!!undefined
// === false` olduğu için "atlanmadı" olarak GÜVENLE okunuyor (migrasyon
// GEREKMİYOR). `correct` atlamada HÂLÂ `false` (result=null →
// `!!(null && ...)` = false) — G324/G326'nın "atlama yanlış cevap gibi
// işlenir" kuralıyla TUTARLI. `params` (doğru cevap DAHİL) `q`'dan
// türetiliyor, `result`'tan DEĞİL — atlanan sorularda da EKSİKSİZ kalır
// (1.1'in "doğru cevabı dinlet" özelliği atlamalarda da ÇALIŞIR).
export function buildAnswerRecord(modeId, question, answer, result, extra = {}) {
  const timestamp = typeof extra.timestamp === "number" ? extra.timestamp : Date.now();
  const timeSpentSec = Number.isFinite(extra.timeSpentSec) ? Math.max(0, extra.timeSpentSec) : null;
  const difficulty = (question && question.difficulty) || null;
  const correct = !!(result && result.correct);
  const skipped = !!extra.skipped;

  return {
    modeId,
    timestamp,
    difficulty,
    timeSpentSec,
    correct,
    skipped,
    params: modeParams(modeId, question, answer, result),
  };
}

// SAF FONKSİYON. records: mevcut dizi (mutasyona UĞRAMAZ, YENİ dizi döner —
// diğer core/*.js saf fonksiyonlarıyla AYNI ilke). En eskiler (dizinin
// BAŞI) sınır aşılırsa silinir — kayıtlar ZATEN kronolojik sırayla
// (push) ekleniyor.
export function appendAnswerRecord(records, record, limit = ANSWER_HISTORY_LIMIT) {
  const next = Array.isArray(records) ? records.slice() : [];
  next.push(record);
  if (next.length > limit) next.splice(0, next.length - limit);
  return next;
}

function modeParams(modeId, q, answer, result) {
  switch (modeId) {
    case "frekans-bulma":
      if (q && q.mode === "proplus") {
        return {
          questionType: "proplus",
          source: q.source,
          // bands: applyProcessing'in okuduğu freq/gain/q ÇİFTİ, matched
          // sonucu KÜÇÜK tutmak için sadece freq+gain (guessHz sonradan
          // bandın kendisinde result.bands'te var, o da eklendi).
          bands: (q.bands || []).map(b => ({ freq: b.freq, gain: b.gain, q: b.q })),
          hit: result ? result.hit : null,
          bandCount: result ? result.bandCount : null,
        };
      }
      return {
        questionType: "frequency",
        source: q && q.source,
        freq: q && q.freq,
        gain: q && q.gain,
        q: q && q.q,
        filterType: q && q.filterType,
        guessHz: result && result.guessHz,
        correctAnswer: q && q.freq,
      };

    case "kesim-noktasi":
      return {
        source: q && q.source,
        freq: q && q.freq,
        filterType: q && q.filterType,
        guessFreq: result && result.guessFreq,
        guessType: result && result.guessType,
        correctAnswer: { freq: q && q.freq, filterType: q && q.filterType },
      };

    case "db-seviyesi":
      return {
        source: q && q.source,
        dbDelta: q && q.dbDelta,
        guessValue: result && result.guessValue,
        correctAnswer: q && q.dbDelta,
      };

    case "boost-mu-cut-mu":
      return {
        source: q && q.source,
        layer: q && q.layer,
        freq: q && q.freq,
        gainDb: q && q.gainDb,
        guess: answer,
        correctAnswer: { freq: q && q.freq, gainDb: q && q.gainDb },
      };

    case "q-genisligi":
      return {
        source: q && q.source,
        freq: q && q.freq,
        gainDb: q && q.gainDb,
        q: q && q.q,
        guessId: result && result.guessId,
        correctId: result && result.correctId,
      };

    // kompresor/reverb/distortion — ÜÇÜ de submitThreeWayGuess (app.js)
    // ÜZERİNDEN, AYNI evaluateAnswer şekliyle ({correct,guessLetter,
    // correctLetter}) geliyor (kompresor.js/reverb.js/distortion.js'in
    // ÜÇÜ de doğrulandı, BİREBİR aynı dönüş şekli) — variants applyProcessing'in
    // previewLetter'a göre okuduğu TAM alt küme, 1.1'in HER üç sesi ayrı ayrı
    // yeniden üretebilmesi için hepsi tutuluyor (3 küçük nesne).
    case "kompresor":
    case "reverb":
    case "distortion":
      return {
        source: q && q.source,
        variants: q && q.variants,
        oddIndex: q && q.oddIndex,
        guessLetter: result && result.guessLetter,
        correctLetter: result && result.correctLetter,
      };

    case "tonal-denge":
      return {
        source: q && q.source,
        bandCount: q && q.bandCount,
        bands: q && q.bands,
        avgDeviation: result && result.avgDeviation,
        proximityScore: result && result.proximityScore,
      };

    case "frekans-cakismasi":
      return {
        stage: q && q.stage,
        pair: q && q.pair,
        trueCenter: q && q.trueCenter,
        cutStepDb: q && q.cutStepDb,
        correctSource: q && q.correctSource,
        correctCutDb: q && q.correctCutDb,
        guess: answer,
      };

    case "pan-konumu":
      return {
        source: q && q.source,
        panPercent: q && q.panPercent,
        guessValue: result && result.guessValue,
        correctAnswer: q && q.panPercent,
      };

    case "stereo-genislik":
      return {
        source: q && q.source,
        widthPercent: q && q.widthPercent,
        guessValue: result && result.guessValue,
        correctAnswer: q && q.widthPercent,
      };

    default:
      return {};
  }
}

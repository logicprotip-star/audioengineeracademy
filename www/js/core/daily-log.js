// G289 — Günlük özet kaydı (OLCUM-XP-17-08.md'nin bulduğu sorunun düzeltmesi
// İÇİN eklendi, ama İLERİSİ İÇİN AYRICA açılıyor: seri/streak, aylık-yıllık
// özet, uzun vadeli gelişim grafiği, alışkanlık analizi gibi 1.1 özellikleri
// bu veriden türetilecek — task'ın kendi gerekçesi: "şimdi açılmazsa geçmiş
// veri olmaz". core/answer-history.js'in (G285) BİREBİR AYNI mimarisi: SAF
// fonksiyonlar burada (DOM/localStorage bağımsız, test edilebilir), gerçek
// okuma/yazma core/storage.js'te (DAILY_LOG_KEY, G229/G232'nin trySave()
// koruması + G233'ün şema sürümü).
//
// Her GÜN için EN FAZLA bir kayıt üretilir (app.js açılışta
// storage.peekStaleDaily() ile ÖNCEKİ günün objesini bulup BURADAKİ
// buildDailySummaryRecord()'a geçirir) — bu yüzden "365 gün sakla" ile
// "son 365 kaydı sakla" AYNI şey, answerHistory'nin appendAnswerRecord'ıyla
// BİREBİR aynı basit FIFO-splice yeterli (ayrı bir tarih-aritmetiği
// GEREKMEDİ).

export const DAILY_LOG_LIMIT = 365;

// SAF FONKSİYON. daily: storage.js:freshDaily()'nin ürettiği ŞEKİLDE bir
// obje (staleDaily — bir ÖNCEKİ günden kalma, henüz freshDaily() ile
// üzerine yazılmamış). `questions` alanı `rounds` ile AYNI DEĞERİ taşıyor
// — bu kod tabanında 1 tur = 1 soru (her submit handler `stats.rounds`'ı
// TAM BİR KEZ artırıyor, ayrı bir "soru" sayacı YOK, grep ile doğrulandı)
// — task'ın istediği iki AYRI alan burada BİLEREK aynı sayıyı taşıyor,
// UYDURULMUŞ farklı bir sayı değil.
export function buildDailySummaryRecord(daily) {
  const rounds = (daily && daily.dailyRounds) || 0;
  return {
    date: (daily && daily.key) || null,
    rounds,
    correct: (daily && daily.dailyCorrect) || 0,
    bestCombo: (daily && daily.dailyBestCombo) || 0,
    questions: rounds,
    xp: (daily && daily.dailyXp) || 0
  };
}

// SAF FONKSİYON. records: mevcut dizi (mutasyona UĞRAMAZ, YENİ dizi döner
// — answer-history.js:appendAnswerRecord'ın BİREBİR aynı ilkesi). En eski
// günler (dizinin BAŞI) sınır aşılırsa silinir — kayıtlar KRONOLOJİK
// sırayla (push) ekleniyor.
export function appendDailyLogRecord(records, record, limit = DAILY_LOG_LIMIT) {
  const next = Array.isArray(records) ? records.slice() : [];
  next.push(record);
  if (next.length > limit) next.splice(0, next.length - limit);
  return next;
}

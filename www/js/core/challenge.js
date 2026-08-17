// "10 Soruluk Bölüm" (challenge) ilerleme durumunun SAF varsayılan şekli —
// G174: bir moddan başka bir moda geçilince app.js:enterMode() BU şekle
// sıfırlar (chiprow/BÖLÜM göstergesi ÖNCEKİ modun ilerlemesini göstermesin
// diye) — startChallenge() ise gerçek bir tur başlarken AYNI şekli
// {...freshChallenge(), active:true} olarak kullanır. Tek kaynak: iki
// çağıran da AYNI varsayılan alan kümesini (total/done/correct/xp/results)
// elle TEKRAR yazmaz.
//
// G276 — OLCUM-CIHAZ2-17-08 madde A düzeltmesi: `done`/`correct` SAYAÇLARI
// (KORUNDU, TEK SATIR değişmedi — başka yerler HÂLÂ bunları okuyor, bkz.
// app.js:xpMult/roundChip/showSessionEnd/finishChallenge) HANGİ POZİSYONUN
// doğru/yanlış olduğunu TUTMUYORDU — BÖLÜM çubuğu bu yüzden "önce N doğru,
// sonra kalan yanlış" çiziyordu, GERÇEK cevap SIRASINI YANSITMIYORDU. YENİ
// `results` dizisi (her elemanı bir cevabın `wasCorrect` bool'u,
// app.js:challengeTick() sırayla push ediyor) BUNU çözüyor — `done`/`correct`
// PARALEL/TÜRETİLEBİLİR alanlar olarak KALDI (results.length===done,
// results.filter(Boolean).length===correct HER ZAMAN doğru olmalı, ama
// AYRI tutuldu — mevcut okuyucuları BOZMAMAK için).
//
// `challenge` HİÇBİR YERDE localStorage'a persist EDİLMİYOR (grep ile
// doğrulandı — storage.js'te "challenge" anahtarlı bir kayıt YOK, sadece
// prefs.playMode="challenge" STRING'İ kalıcı, o AYRI/ilgisiz bir alan) —
// bu yüzden G233'ün şema sürümü/geriye dönük uyumluluk endişesi BURADA
// UYGULANMIYOR: eski/yeni HİÇBİR kayıtta `results` YOK ki göç gereksin,
// her yeni oturum/mod-girişi HER ZAMAN bu fonksiyondan (results:[] DAHİL)
// taze başlıyor.
export function freshChallenge() {
  return { active: false, total: 10, done: 0, correct: 0, xp: 0, results: [] };
}

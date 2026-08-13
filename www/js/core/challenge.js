// "10 Soruluk Bölüm" (challenge) ilerleme durumunun SAF varsayılan şekli —
// G174: bir moddan başka bir moda geçilince app.js:enterMode() BU şekle
// sıfırlar (chiprow/BÖLÜM göstergesi ÖNCEKİ modun ilerlemesini göstermesin
// diye) — startChallenge() ise gerçek bir tur başlarken AYNI şekli
// {...freshChallenge(), active:true} olarak kullanır. Tek kaynak: iki
// çağıran da AYNI varsayılan alan kümesini (total/done/correct/xp) elle
// TEKRAR yazmaz.
export function freshChallenge() {
  return { active: false, total: 10, done: 0, correct: 0, xp: 0 };
}

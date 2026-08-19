# OLCUM-ATLA-KAYIT-19-08

GÖREV: ÖLÇÜM. Kod yazılmadı, commit atılmadı. OLCUM-ATLA-RENK-19-08'in
yan bulgusu — G285'in cevap geçmişi (core/answer-history.js, 1.1'in
"Son Oyunlarım" listesinin veri kaynağı) atlamayı hiç kaydetmiyor mu?
Kaynak koddan doğrulandı.

## ÖLÇ 1 — G285'in kayıt mekanizması atlamada neden çalışmıyor?

DOĞRULANDI: `recordAnswerHistoryEntry()` (app.js:1318-1323) SADECE
12 modun ~11 GERÇEK submit handler'ından çağrılıyor (grep ile
doğrulandı — 11 çağrı noktası: `submitFrequencyGuess`,
`submitCutoffGuess`, `submitDbGuess`, ..., `submitCakismaGuess`,
`submitProPlusGuess`; `submitThreeWayGuess` Kompresör/Reverb/
Saturation&Distortion'ın ÜÇÜNÜ birden kapsıyor). "Atla"
(`goToNextRound()`, app.js:7372) bu handler'ların HİÇBİRİNİ
ÇAĞIRMIYOR — kendi ayrı yolundan `challengeTick(false, 0, true)` +
`handleExamOutcome(...)` çağırıyor (bkz. G324 bu turun 1. işi).
`recordAnswerHistoryEntry` çağrısı bu yolun HİÇBİR YERİNDE YOK —
kayıt mekanizması atlamada "bozuk" değil, basitçe HİÇ ÇAĞRILMIYOR.

## ÖLÇ 2 — Kayıt hangi noktada oluşuyor, atlama o noktaya uğruyor mu?

Kayıt, her mod dosyasının `evaluateAnswer(question, answer)`'ı
GERÇEK bir kullanıcı cevabıyla çalıştırdıktan HEMEN SONRA, submit
handler'ın İÇİNDE oluşuyor (`result = mode.evaluateAnswer(...)` →
`recordAnswerHistoryEntry(modeId, q, answer, result)`). Atlama bu
NOKTAYA HİÇ UĞRAMIYOR — kullanıcı bir cevap SEÇMEDİĞİ için
`evaluateAnswer` hiç çağrılmıyor, `result` diye bir şey YOK. Bu,
"kayıt bozuk" değil "kayıt YOLU tanımlı değil" durumu.

## ÖLÇ 3 — Atlama kaydedilirse ne yazılmalı?

`buildAnswerRecord(modeId, question, answer, result, extra)`
(core/answer-history.js:28) İNCELENDİ — kritik gözlem: `result`
parametresi HER modeParams() dalında `result && result.x` deseniyle
OKUNUYOR (ör. `guessHz: result && result.guessHz`) — yani fonksiyon
**ZATEN `result=null` ile güvenli** (mevcut 12 dal da kontrol edildi,
HİÇBİRİ `result.x` diye çıplak erişmiyor). `correct: !!(result &&
result.correct)` de `result=null`'da `false` döner — bu G324'ün
"atlama yanlış sayılsın" kuralıyla ZATEN TUTARLI, ek kod GEREKMİYOR.

Kalan iki soru — ÜRÜN KARARI gerektiriyor, KOD SORUSU DEĞİL:

- **Kullanıcının cevabı:** boş mu, "atlandı" mı? — `buildAnswerRecord`
  şu an `answer` parametresini DOĞRUDAN kaydetmiyor (SADECE
  `modeParams()` üzerinden, `result`'un içindeki `guessX` alanları ile
  BİRLİKTE türetiyor) — `result=null` geçilirse `guessX` alanları zaten
  `undefined` olur, bu "cevap YOK" anlamına doğal olarak geliyor. Ayrı
  bir `skipped: true` bayrağı EKLENMEDEN "Son Oyunlarım" listesi
  `undefined` guess'i "cevap verilmedi" ile "cevap 0/boş" ARASINDA
  AYIRT EDEMEZ (ör. dB Seviyesi'nde guessValue=0 GERÇEK bir cevap
  olabilir) — bu YÜZDEN `skipped: true` gibi AÇIK bir alan gerekli,
  UYDURULMADI, MEVCUT `buildAnswerRecord` imzasına EKLENMESİ gereken
  YENİ bir alan.
- **Doğru cevap yazılmalı mı? (1.1'de dinletilecek)** — EVET, zaten
  YAZILIYOR: her `modeParams()` dalı `correctAnswer`/`freq`/`dbDelta`
  gibi alanları `q`'DAN (activeQuestion, atlansa da HER ZAMAN dolu)
  okuyor, `result`'a değil `q`'ya bağımlı — yani `result=null` olsa
  BİLE doğru cevap eksiksiz kaydedilir, 1.1'in "doğru cevabı dinlet"
  özelliği atlanan sorularda da ÇALIŞIR.

## ÖLÇ 4 — İş yükü: kaç dosya, kaç satır, kaç test?

Mevcut dosyalar ölçüldü: `core/answer-history.js` 177 satır,
`test/answer-history.test.mjs` 178 satır/20 test.

Tahmini iş yükü (KOD YAZILMADI, TAHMİN):
- **core/answer-history.js** (~3-5 satır): `buildAnswerRecord`'un
  `extra` parametresine `skipped` okuması eklenir (`skipped:
  !!extra.skipped`), dönen nesneye tek alan eklenir. `modeParams()`
  dalları DEĞİŞMEZ (zaten `result`-güvenli, ÖLÇ 3).
- **app.js** (~5-10 satır): `goToNextRound()`'un skip dalına
  `recordAnswerHistoryEntry(modeId, q, null, null, { skipped: true })`
  benzeri TEK bir çağrı (modeId zaten `mode.getMeta().id` ile HER
  YERDE mevcut desen) + `recordAnswerHistoryEntry`'nin kendi imzasına
  `extra` geçirme desteği.
- **test/answer-history.test.mjs** (~5-8 YENİ test): `skipped:true`
  alanının doğru yazıldığı, `correct:false` olduğu, `correctAnswer`'ın
  YİNE DE dolu olduğu, `skipped` ALANI OLMADAN eski kayıtların HÂLÂ
  geçerli (varsayılan `skipped:false`) okunduğu.
- **e2e** (~1-2 YENİ test): gerçek bir "Atla" sonrası
  `storage.loadAnswerHistory()`'nin YENİ bir `skipped:true` kayıt
  içerdiği.

Toplam kaba tahmin: **2-3 dosya değişikliği + 1 test dosyasına ekleme,
~15-25 satır ÜRETİM kodu, ~6-10 YENİ test.** Küçük-orta ölçekli bir iş
— G285'in KENDİ `result`-güvenli tasarımı sayesinde beklenenden DAHA
küçük (asıl iş modeParams()'ta DEĞİL, tek bir yeni çağrı noktasında).

## ÖLÇ 5 — Kayıt formatı değişirse eski kayıtlar bozulur mu?

HAYIR. `storage.loadAnswerHistory()` (storage.js:664-671) SADECE
`raw.records`'un bir Array OLUP OLMADIĞINI kontrol ediyor — TEK TEK
kayıt alanlarının şemasını DOĞRULAMIYOR. Yeni `skipped` alanı
EKLENDİĞİNDE eski kayıtlarda bu alan `undefined` olur — okuyucu
tarafında (1.1'in henüz yazılmamış UI'ı) `record.skipped` kontrolü
`undefined` için `falsy` döner, "atlanmadı" (normal cevap) olarak
YORUMLANIR — bu, projede ZATEN kurulu "eksik alan → güvenli
varsayılan" deseniyle (bkz. exam-system.js:applySnapshot,
core/challenge.js) BİREBİR TUTARLI. Migrasyon GEREKMEZ.

## ÖLÇ 6 — 200 kayıt sınırı etkilenir mi?

EVET, DAVRANIŞSAL bir etki var (kod BOZULMUYOR, ama ÜRÜN sonucu
DEĞİŞİYOR): `ANSWER_HISTORY_LIMIT=200`, FIFO (en eski kayıt silinir,
`appendAnswerRecord`, core/answer-history.js:47-52). Atlama
kaydedilmeye BAŞLARSA, sık atlayan bir kullanıcının 200'lük penceresi
GERÇEK cevaplarla DEĞİL atlama kayıtlarıyla DOLABİLİR — "Son
Oyunlarım" listesinin GERÇEK cevaplı kısmı daha ÇABUK dışarı
itilir. Bu bir HATA DEĞİL, bir ÜRÜN TERCİHİ sorusu: atlamalar 200'e
DAHİL mi sayılsın (basit, TEK bir dizi) yoksa AYRI/ağırlıklı mı
tutulsun (ör. atlamalar kendi ayrı, daha küçük bir pencerede)?
**BEKLEYEN KARAR — bu turun kapsamı DIŞINDA, DURUM.md'ye
kaydedildi.**

## KABUL — bu turun kapsamı

- [x] G285'in atlamayı neden kaydetmediği KESİN olarak DOĞRULANDI
      (kayıt yolu HİÇ ÇAĞRILMIYOR, bozuk bir mekanizma DEĞİL).
- [x] Kaydedilirse ne yazılması gerektiği tanımlandı — `skipped:true`
      bayrağı + `correctAnswer` (zaten `result`-bağımsız, ÇALIŞIR).
- [x] İş yükü tahmin edildi (~15-25 satır üretim + ~6-10 test).
- [x] Geriye dönük uyumluluk DOĞRULANDI (migrasyon gerekmiyor).
- [ ] 200 kayıt penceresinin atlamalara nasıl davranacağı — ÜRÜN
      KARARI, kullanıcıya SORULACAK.
- [ ] Kod YAZILMADI — bu turun kapsamı SADECE ölçümdü.

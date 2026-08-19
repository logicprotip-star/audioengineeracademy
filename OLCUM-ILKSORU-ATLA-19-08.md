# OLCUM-ILKSORU-ATLA-19-08 — "İlk soruda Atla → ilerleme kilitleniyor"

**Görev tipi:** ÖLÇÜM (CANLI İZLEME, Playwright gerçek DOM tıklaması). Kod
DEĞİŞTİRİLMEDİ, commit ATILMADI. Geçici script'ler çalıştırıldıktan hemen
sonra silindi — `git status --short` bu turun sonunda sadece önceki `cap
sync`'ten kalan `pbxproj` + bu rapor + önceki turların OLCUM-*.md
dosyalarını gösteriyor.

---

## ⚠️ ÖNCE DÜRÜST BİR UYUŞMAZLIK

Görevin tarif ettiği KESİN senaryo — *"moda gir, HİÇ CEVAP VERMEDEN ilk
soruda Atla'ya bas → ilerleme kilitleniyor"* — bu turda **3 modda, 0ms
gecikmeyle (Start'a basar basmaz Atla), gerçek DOM tıklamasıyla,
TEKRAR ÜRETİLEMEDİ.** Bunun yerine, AYNI kod ailesinde (challenge/
handleExamOutcome), **FARKLI ama gerçek, kanıtlanmış, dosya:satır
kesinliğinde bir hata bulundu** — sınav/telafi ekranından ("SINAV
HAKKI"/"SINAV GEÇİLEMEDİ"/"SEVİYE ATLADIN"/"TELAFİ TURU") "Devam Et"
tarzı bir CTA'ya basıldığı AN, kullanıcı henüz TEK bir tıklama bile
yapmadan, sayaçlara BİR fantom "yanlış cevap" ekleniyor. Bu, görevin
tarif ettiği "İLK SORUDA henüz kurulmamış bir şey var" ipucuyla
KISMEN örtüşüyor ama TAM eşleşmiyor — aşağıda hem NEDEN eşleşmediği
hem NEDEN ilgili olduğu açıklanıyor. **Sayı/sonuç uydurulmadı — ikisi
de gerçek çalıştırmadan, farkı GÖRÜLEREK raporlanıyor.**

---

## 1) Moda gir, HİÇ CEVAP VERMEDEN ilk soruda Atla — SONUÇ: TEKRAR ÜRETİLEMEDİ

**Yöntem:** 3 mod (`boost-mu-cut-mu`, `kesim-noktasi`, `db-seviyesi`),
Pro simüle, "10 Soruluk Bölüm". `#startBtn`'e tıklandıktan HEMEN sonra
(Playwright'ın kendi action-wait'i DIŞINDA EK bir `waitForTimeout`
KONULMADAN) `#nextBtn` ("Atla ▶") tıklandı — bu, görevin "önceki ölçüm
bu yüzden kaçırmış olabilir" uyarısını doğrudan test etti (önceki
OLCUM-CANLI-BOLUM-19-08'de Start'tan sonra 400ms bekleniyordu).

**Ölçülen (3 mod × 1 senaryo, HAM veri scratchpad'de saklı):**

| Adım | `#gameChapterLabel` | `#gameChapterDots` | Konsol hatası |
|---|---|---|---|
| Start'a basar basmaz (0ms) | `BÖLÜM 1/10` | 10 boş | — |
| Atla'ya basıldı | `BÖLÜM 2/10` | `[wrong, boş×9]` | **YOK** |
| +4 normal cevap daha | `3/10→6/10`, HER adımda +1 | sırayla doğru işaretleniyor | **YOK** |

Üç modun ÜÇÜNDE de BİREBİR AYNI — ekran hep `screen-game`'de kaldı,
`startBtn`/`nextBtn` etiketleri normal (⏸/Atla ▶), `#gameExamRow` hiç
açılmadı (beklenmedik bir sınav/telafi tetiklenmesi yok), **hiçbir
konsol hatası/uncaught exception görülmedi.**

**Kök neden bulgusu (kod okuyarak doğrulandı):** `startBtn`'in click
handler'ı (`www/js/app.js`, "Oyunu Başlat" dalı) `startChallenge()`'ı
(challenge={...fresh,active:true}) ve ardından `setAutoPlay(true)`'yı
**SENKRON, aynı event handler içinde, hiçbir `await` olmadan** çağırıyor;
`setAutoPlay(true)` de `startRound()`'u **senkron** çağırıyor
(`www/js/app.js:6449`), o da `activeQuestion`'ı **senkron** atayıp
(`mode.createQuestion(...)`) `renderQuestion()`'ı (roundActive=true
yapan) **senkron** çalıştırıyor — JS tek iş parçacıklı olduğu için
Playwright'ın (ya da gerçek bir kullanıcının) bir SONRAKİ tıklaması
(Atla) bu senkron zincir TAMAMEN bitmeden İŞLENEMEZ. Yani "ilk sorunun
kurulması" (activeQuestion/roundActive) Atla tıklanabilir hâle
gelmeden ÖNCE zaten TAMAMLANMIŞ oluyor — **bu yüzden GERÇEKTEN 'ilk
soru, sıfırdan mod girişi' senaryosunda yarış durumu YOK.**

---

## 2) Önce 1 cevap ver, SONRA atla — kıyas

Aynı 3 modda: gerçek cevap → BÖLÜM 1/10→2/10 (`on`), sonra Atla →
2/10→3/10 (`wrong`). **Fark yok, ikisi de senaryo (1)'le AYNI şekilde
temiz.** Bu kıyas, sıfırdan mod-girişi bağlamında "önce cevapla sonra
atla" ile "direkt atla" arasında GERÇEKTEN bir davranış farkı
olmadığını gösteriyor — ki bu da görevin "fark nerede?" sorusuna
verilebilecek en dürüst cevap: **bu ölçülen koşulda fark YOK.**

---

## 3) Telafinin ilk sorusunda atla — BULUNAN GERÇEK ANOMALİ BURADA

**Yöntem:** Parkuru 10 Atla ile bitirip (hepsi "yanlış" sayılıyor,
G214) `remedial-start` (telafi) tetiklendi, `#screen-exam` ("TELAFİ
TURU") açıldı, `#exCta` ("Telafi turunu başlat") tıklandı, SONRA
telafinin (görünüşte) ilk sorusunda TEK bir Atla tıklandı.

**Ölçülen (boost-mu-cut-mu, ama mekanizma koddan TÜM modlar için
aynı — aşağıda açıklanıyor):**

```
CTA'ya basıldı (0ms) → exam.hidden=true, progress="" (henüz render yok)
CTA'dan HEMEN SONRA, İLK Atla tıklandı → exam.progress = "TELAFİ 3/5"
                                          exam.dots = ["wrong","wrong",boş,boş,boş]
İKİNCİ Atla tıklandı → "TELAFİ 4/5", dots=["wrong","wrong","wrong",boş,boş]
```

**Beklenen (kullanıcının GERÇEKTE yaptığı TEK tıklamaya göre):**
`"TELAFİ 2/5"`, `dots=["wrong",boş,boş,boş,boş]` — yani telafi
sayacı, kullanıcının HİÇ dokunmadığı bir "yanlış cevap" ile ÖNCEDEN
1 artmış geliyor. **Konsol hatası YOK** (bu sessiz bir mantık hatası,
exception değil) — bu yüzden ne Logic'in ne de bu ölçümün konsolda
göremeyeceği bir sınıf hata.

### Kök sebep — dosya:satır + commit

**Mekanizma:** `goToNextRound()` (`www/js/app.js:7226`), satır
7254-7259:
```js
let examTookOver = false;
if (roundActive && activeQuestion) {
  const q = activeQuestion;
  challengeTick(false, 0);
  if (examGateActive()) examTookOver = handleExamOutcome(q, { correct: false }, 0);
}
```
Bu blok **HER `goToNextRound()` çağrısında** çalışır — `roundActive`
VE `activeQuestion` HÂLÂ (bir ÖNCEKİ sorudan) DOLU ise, "cevapsız
bırakılmış bir soru Atla'yla geçildi" varsayar ve BİR "yanlış cevap"
sayar. Bu satırlar **G214**'te (`82f94e68`, 2026-08-15,
*"#54 - 'Atla' artık parkur/sınav/telafi sayaçlarını ilerletiyor"*)
eklendi.

**Çakıştığı yer:** `showExamScreen()`'in (`www/js/app.js:3107`) BEŞ
`ctaHandler`'ı — `announce/offer` (satır 3140), `passed` (3181),
`failed` (3207), `makeup`/telafi (3233) — hepsi AYNI kalıp:
```js
ctaHandler = () => { goScreen("game"); goToNextRound(); };
```
Bu satırlar **G84**'te (`07a2c056`, 2026-08-09,
*"Sınav Ekranları giydirildi"*) yazıldı — G214'ten **6 gün ÖNCE.**
G84 yazıldığında `goToNextRound()`'un henüz `activeQuestion`'a
dokunan bir yan etkisi YOKTU — CTA'nın onu çağırması ZARARSIZDI.
G214 bu yan etkiyi (Atla=yanlış cevap) `goToNextRound()`'un PAYLAŞILAN
giriş noktasına ekledi, ama G84'ün BEŞ CTA'sının (hâlâ SADECE
`secondaryHandler`'ların — G287/G305'in eklediği
`activeQuestion=null` KORUMASINA sahip, `ctaHandler`'ların DEĞİL,
`www/js/app.js:3193/3211/3237` — sadece "Ana Ekran" dalı) bu yeni
tehlikeye karşı GÜNCELLENMESİ UNUTULDU.

**Sonuç:** kullanıcı bir sınav/telafi/geçti/kaldı ekranından "Devam
Et"/"Telafi turunu başlat"/"Sınava başla" gibi bir CTA'ya bastığı AN
(HENÜZ hiçbir soruya dokunmadan), `activeQuestion` bir ÖNCEKİ (artık
GEÇERSİZ) sorudan hâlâ DOLU olduğu için, o CTA'nın KENDİ tetiklediği
`goToNextRound()` çağrısı BU stale soruyu "az önce Atla'yla geçildi"
sanıp `challengeTick(false,0)` + `handleExamOutcome(staleQ,
{correct:false},0)`'ı **fazladan bir kez** çalıştırıyor — kullanıcının
GERÇEK ilk tıklaması bundan SONRA gelip sayacı BİR DAHA artırıyor.

**Neden "makeup" (telafi) özelinde en görünür:** `case
"remedial-start"` (`exam-system.js`'in döndürdüğü olay, `app.js:3311-
3316`) `resetChallengeForNewParkur()` ÇAĞIRMIYOR (remedial-passed/
remedial-failed/exam-failed'ın AKSİNE) — yani `challenge` NESNESİ
parkurdan KALAN hâliyle kalıyor, ama `examSystem.remedialIndex`
YENİ (`startRemedial()` ile sıfırlanmış) — bu YÜZDEN fantom cevap
BURADA `examSystem.recordAnswer()` üzerinden **doğrudan, canlı
render edilen** `#gameExamProgress`'e yansıyor ve ÖLÇÜLEBİLİYOR.
`exam-failed`/`remedial-passed`/`remedial-failed` durumlarında AYNI
fantom mekanizma `resetChallengeForNewParkur()`'un SIFIRLADIĞI
`challenge` nesnesine yazıyor OLABİLİR (kod yapısı AYNI — G214'in
bloğu HER `goToNextRound()` çağrısında koşulsuz çalışıyor) ama
`showChapter` (BÖLÜM satırının görünürlüğü, `!boss && !examActive &&
isChallenge()`) o an muhtemelen FALSE olduğu için (`examActive` henüz
tam düşmemiş/görüntü henüz güncellenmemiş olabilir) DOM'da GÖZLE
DOĞRULANAMADI — bu kısım **BELİRSİZ**, `challenge` nesnesinin
kendisine (kapalı değişken, dışa açık bir test kancası YOK) doğrudan
erişilemediği için sadece render edilen DOM'dan dolaylı gözlemlendi
ve `showChapter=false` olan yollarda kanıt TOPLANAMADI. Bu, KOD
OKUMASIYLA aynı mekanizmanın diğer 4 CTA'da da (announce/passed/
failed) ÇALIŞACAĞINI güçlü şekilde düşündürüyor ama DOM'da GÖRÜLEREK
DOĞRULANDI diyemem — sadece "makeup" (telafi) YOLU görsel olarak
kanıtlandı.

### Neden "12 modun HEPSİNDE" iddiasıyla tutarlı

`goToNextRound()` TÜM modlar için PAYLAŞILAN, tek fonksiyon
(`www/js/app.js:7226`) — mod-özel bir dal YOK. `showExamScreen()`'in
5 `ctaHandler`'ı da AYNI şekilde mod-bağımsız (`www/js/app.js:3107`
tek fonksiyon, TÜM modlar için çağrılıyor, çünkü `EXAM_ENABLED` artık
12 modun 12'sinde de `true`). **Bu yüzden mekanizma GERÇEKTEN 12
modun hepsini etkiler** — bu kısım görevin iddiasıyla TAM örtüşüyor.

### Neden "İLK SORUDA" ile TAM örtüşmüyor

Görev "moda YENİ girip HİÇ CEVAP VERMEDEN ilk soruda Atla" diyor —
bu ölçümde (bölüm 1) BU TAM SENARYO temiz çıktı, çünkü mod'a YENİ
girişte `activeQuestion` GERÇEKTEN `null`'dur (hiç soru kurulmamıştır)
— fantom mekanizma sadece `activeQuestion` STALE (bir ÖNCEKİ,
sınav/telafi ekranına GEÇİLMEDEN önceki) bir soruyla DOLUYKEN
çalışır. **Bulunan gerçek tetikleyici "moda yeni giriş" DEĞİL,
"sınav/telafi ekranından CTA ile dönüş"tür.** Bu ikisi bir kullanıcı
için KOLAYCA KARIŞABİLİR: her iki durumda da ekran "temiz, yeni bir
tur başlıyor" HİSSİ verir (BÖLÜM/TELAFİ göstergesi düşük bir sayıda
başlar), bu yüzden Logic'in "İLK SORUDA" tanımı muhtemelen "gözle
YENİ görünen İLK soru" anlamına geliyor OLABİLİR — bu YORUM, KANIT
DEĞİL, **BELİRSİZ** olarak işaretleniyor.

---

## 4) İlk soruda ne henüz kurulmamış? (Görevin 4. sorusu)

**Ölçülen/kod-okunan cevap:** "moda yeni giriş" bağlamında HİÇBİR ŞEY
eksik kurulmuyor (bölüm 1) — `activeQuestion`/`roundActive` Atla
tıklanabilir olmadan ÖNCE senkron olarak TAMAMLANMIŞ oluyor.

**Ama sınav/telafi CTA'sı bağlamında** eksik olan şey şu: **CTA'nın
KENDİSİ, `activeQuestion`'ı YENİ bir soru için TEMİZLEMEDEN
`goToNextRound()`'u çağırıyor** — "henüz kurulmamış" olan aslında
YENİ sorunun kendisi değil, **ESKİ sorunun TEMİZLENMEMİŞ OLMASI.**
G214'ün eklediği "aktif soru + Atla = yanlış cevap" kısayolu, bu
STALE referansı "gerçek, cevapsız bırakılmış bir soru" ile ayırt
edemiyor.

---

## 5) Kilitlendikten sonra ne oluyor — kalıcı mı?

**Ölçülen:** Hayır, bu bir "kilitlenme" (donma) DEĞİL — bir **sayaç
şişmesi/kayması** (off-by-one, TEK fazlaya kayıyor). `challenge.done`
ve `challenge.results`/`examSystem.remedialIndex` ve
`remedialResults` HER ZAMAN BİRLİKTE artıyor (`challengeTick`/
`recordAnswer`'ın kendi iç tutarlılığı KORUNUYOR) — yani render
zinciri bozulmuyor, SADECE "gerçek tıklama sayısı" ile "gösterilen
sayı" arasında KALICI bir birim fark oluşuyor. **Pratik sonucu:**
telafi 5 soruluk — fantom 1 slot yediği için kullanıcı sadece 4 GERÇEK
tıklamayla telafiyi "bitirebilir", 5. tıklaması ya HİÇ ulaşmadığı bir
soruya (zaten kapanmış bir telafiye) gider ya da beklenmedik şekilde
YENİ bir ekrana (remedial-passed/failed) düşer — kullanıcı buna
"ilerleme garip davranıyor/kilitleniyor gibi" diyebilir, ama teknik
anlamda DONMA değil, **kalıcı bir SAYAÇ KAYMASI.**

---

## KÖK SEBEP — ÖZET

| | |
|---|---|
| **Dosya:satır (tetikleyen)** | `www/js/app.js:7254-7259` (`goToNextRound()`'un koşulsuz "stale activeQuestion = Atla" varsayımı) |
| **Ekleyen commit** | G214, `82f94e68`, 2026-08-15, "#54 - Atla artık parkur/sınav/telafi sayaçlarını ilerletiyor" |
| **Dosya:satır (çakışan)** | `www/js/app.js:3140` (announce/offer), `3181` (passed), `3207` (failed), `3233` (makeup) — `showExamScreen()`'in `ctaHandler`'ları |
| **Yazan commit** | G84, `07a2c056`, 2026-08-09, "Sınav Ekranları giydirildi" — G214'ten 6 gün ÖNCE, bu yeni tehlikeyi bilemezdi |
| **Etkilenen modlar** | Kod mod-bağımsız (`goToNextRound()`/`showExamScreen()` paylaşılan) — 12 modun 12'si de `EXAM_ENABLED=true`, hepsi teorik olarak etkilenir |
| **Canlı doğrulanan yol** | SADECE "makeup" (telafi anonsu → CTA), `#gameExamProgress` üzerinden ÖLÇÜLDÜ (TELAFİ 1/5 beklenirken 3/5 çıktı) |
| **Kod-okumayla-çıkarsanan ama DOM'da GÖRÜLEMEYEN yollar** | announce/passed/failed CTA'ları — `showChapter`/render zamanlaması yüzünden DOM'da doğrudan izlenemedi, **BELİRSİZ** |
| **Görevin "moda yeni giriş, ilk soru" senaryosu** | Bu turda 3 modda, 0ms gecikmeyle TEKRAR ÜRETİLEMEDİ — kod okuması da bunun neden GÜVENLİ olduğunu (senkron kurulum) doğruluyor |

## DÜZELTME YÖNÜ (uygulanmadı, sadece yön — ürün/kapsam kararı gerektirir)

İki olası yön, ikisi de bu turda YAZILMADI:

1. **CTA'ları düzelt** — 5 `ctaHandler`'ın (3140/3181/3207/3233 ve
   "offer" içindeki 3300/3304 çağrıları besleyen kod) HER BİRİNE,
   `secondaryHandler`'ların ZATEN yaptığı gibi (`www/js/app.js:3193/
   3211/3237`) `activeQuestion = null;` (ve muhtemelen
   `roundActive = false;`) eklemek — `goToNextRound()`'un KENDİSİNE
   dokunmadan, sadece çağıranları "temiz" bırakmak. Daha DAR kapsamlı,
   ama 5 ayrı yer, hepsinde AYNI unutmanın TEKRARLANMAMASI gerekiyor.
2. **`goToNextRound()`'un kendisini sağlamlaştır** — G214'ün bloğunu
   (7254-7259) "bu GERÇEKTEN aynı soru mu, yoksa exam-screen'den mi
   geldik" ayrımı yapacak şekilde (ör. bir bayrak/flag) güçlendirmek.
   Tek yerden düzelir ama `goToNextRound()`'un TÜM çağrı yollarını
   (submit handler'lardan gelen dahil) etkileme riski taşır, DAHA
   GENİŞ kapsamlı.

**Risk değerlendirmesi (ölçüm, karar DEĞİL):** Yön 1 daha DAR ve daha
GÜVENLİ görünüyor (sadece 5 nokta, `secondaryHandler`'ların ZATEN
kanıtlanmış deseniyle BİREBİR aynı) ama görevin KİLİT'i olmadığı için
hangi yönün seçileceği, kapsamı, test stratejisi kullanıcıya
SORULMALI — bu rapor bir ÖLÇÜM, uygulama YAPILMADI.

## AÇIK KALAN BELİRSİZLİK

Logic'in TAM tarif ettiği "moda yeni giriş, ilk soru, Atla → kilitlenme"
senaryosu bu ortamda (headless Chromium, yerel sunucu, Pro simüle,
0ms gecikme, 3 mod) **hâlâ tekrar üretilemedi.** Bulunan bug GERÇEK
ve KANITLANMIŞ ama FARKLI bir tetikleyiciye (sınav/telafi CTA dönüşü)
sahip. İki İHTİMAL AÇIK: (a) Logic'in "ilk soru" tanımı aslında
"sınav/telafi sonrası YENİ görünen ilk soru"yu kapsıyor olabilir
(yukarıda tartışıldı, KANITLANAMADI), (b) GERÇEKTEN AYRI, bu ortamda
reprodüklenemeyen üçüncü bir mekanizma (cihaza/WKWebView'a özgü bir
zamanlama farkı) olabilir — bu ihtimal ELENEMEDİ, sadece BULUNAMADI.

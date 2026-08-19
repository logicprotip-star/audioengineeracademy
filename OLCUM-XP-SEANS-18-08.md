# OLCUM-XP-SEANS-18-08 — Tonal Denge kısmi-doğru XP + seans sonu ekranı: iş yükü + risk ölçümü

**Görev tipi:** ÖLÇÜM. Kod değiştirilmedi, commit atılmadı. `git status --short`
bu turun sonunda sadece `ios/App/App.xcodeproj/project.pbxproj`'u (önceki
`cap sync`'ten kalma, DOKUNULMADI) + bu raporu gösteriyor.

---

## A) TONAL DENGE — KISMİ DOĞRUYA XP

### A.1 Soru yapısı — kaç bant sorulabiliyor?

Bant sayısı **sabit 4 DEĞİL**, oturum içindeki soru sırasına göre otomatik
artıyor — zorluk seviyesinden (easy/medium/hard/pro/proplus) BAĞIMSIZ:

- `bandCountForSessionIndex()` (`www/js/modes/tonal-denge.js:129-134`):
  1-4. soru → **4 bant**, 5-8. soru → **5 bant**, 9. sorudan itibaren
  (Serbest/sonsuz mod dahil) → **6 bant**, orada sabit kalıyor.
- Bant kümeleri (`tonal-denge.js:114-123`): `BAND_SET_4`
  (bas/alt-orta/üst-orta/tiz), `BAND_SET_5` (+orta), `BAND_SET_6` (+sub).
- Sınav soruları HER ZAMAN 6 banda zorlanıyor (`settings.examBandBoost`,
  `tonal-denge.js:80-82`, `346`).
- `proplus` seviyesi bant sayısını DEĞİL, sadece zorluk eğrisini
  etkisiz kılıyor (`tonal-denge.js:334`).

**Sonuç: aynı zorlukta bile 4, 5 ve 6 bantlı sorular art arda çıkabiliyor** —
bir XP tablosu bant-sayısına duyarlı olmak ZORUNDA.

### A.2 Cevap değerlendirmesi — tamamen mi ikili?

`evaluateAnswer()` (`tonal-denge.js:432-444`): her bandın sapmasını
(`deviation`) hesaplıyor, **ORTALAMASINI** alıp `correct = avgDeviation
<= tolerance` diye TEK bir boolean üretiyor (satır 439/442). **Kısmi
doğru YOK** — OLCUM-GENIS-18-08 A5 bulgusu doğrulandı: "1 bandı
MÜKEMMEL, 3 bandı HİÇ dokunulmamış" bile `correct=false` → 0 XP
üretiyor, çünkü ortalama tek kötü/dokunulmamış banttan bozuluyor.

**Kısmen kullanılabilir bir temel VAR:** `deviations` dizisi (satır
434-438) zaten bant-başına `{id, correction, residualDb, deviation}`
üretiyor — sadece `correct`/`calculateXP` bunu OKUMUYOR. Yani "hangi
bant doğru" verisi zaten hesaplanıyor, kullanılmıyor.

### A.3 "Hassasiyet çarpanı" 0.55×–1.0× — ne bu, hâlâ var mı?

**Var ve AKTİF** — ama kısmi doğruluk DEĞİL, farklı bir şey.
`calculateXP()` içinde `proximityBoost` (`tonal-denge.js:452-468`):

```
if (!result || !result.correct) return 0;         // satır 453 — ÖNCE ikili kapı
...
const proximityBoost = Math.max(0.55, (result.proximityScore || 0) / 100);  // satır 464
```

`result.correct===true` OLMADAN bu satıra hiç ulaşılmıyor — yani
"zaten doğru sayılan bir cevap NE KADAR mükemmel" ölçüsü, "kısmen
doğru bir cevaba KISMİ XP" değil. `app.js:5236-5238`'de tek çağrı
noktası, `app.js:5260`'ta aynı formül SADECE XP-döküm ekranı
("yakınlık" etiketi) için tekrar hesaplanıyor — ikinci bir tüketici.

**Sonuç: Logic'in istediği tablo (15/35/75/100), mevcut ikili kapıdan
ÖNCE devreye girmesi gereken YENİ bir mekanizma — proximityBoost'un
UZANTISI değil, ONUNLA BİRLİKTE var olması gereken AYRI bir katman.**

### A.4 Kısmi doğru eklemek için gereken değişiklik

**`evaluateAnswer` dönüş şekli:** bugün `{mode, correct, avgDeviation,
proximityScore, deviations}`. Eklenmesi gereken: bant-başına
`perBandCorrect` (`deviation <= tolerance`) + `correctBandCount` tally
— `deviations` zaten var olan `.map`/reduce'un içine küçük bir ek.

**XP nereden geçiyor:** `calculateXP` (`tonal-denge.js:452-468`),
TEK çağıran `app.js:5236` (`submitTonalDengeGuess`'in `if
(result.correct)` dalında, `app.js:5232-5264`). **KRİTİK:** `else`
dalı (`app.js:5265-5277`, "yanlış" yolu) `calculateXP`'yi HİÇ
ÇAĞIRMIYOR, `gained=0`'ı doğrudan yazıyor — yani bugün "kısmen doğru
ama genel olarak yanlış" bir cevabın `calculateXP`'ye ulaştığı TEK bir
kod yolu YOK. Bu, XP tablosunun kendisinden daha büyük bir yapısal
değişiklik demek: `submitTonalDengeGuess`'in doğru/yanlış dal ayrımı
YENİDEN kurulmalı.

**`result`'ı tüketen diğer yerler** (hepsi bugün `result.correct`
boolean'ına göre dallanıyor, `app.js:5216-5297` içinde): `stats.correct/
combo/bestCombo`, `diffState().score`, `session.correct/wrong/xp`,
`mode.getFeedbackData` (kendi içinde de `result.correct` dallanıyor,
`tonal-denge.js:531-534`), `pushHistory(result.correct)` (boolean-only
parametre), `updateDaily(result.correct, gained)` (boolean-only),
`recordAndPersistDailyAccuracy(result.correct)`,
`recordAnswerHistoryEntry(...)`, ve **`handleExamOutcome`**
(`app.js:5295` → `exam-system.js:recordTierResult`/`recordAnswer`,
ikisi de imza düzeyinde SALT boolean `correct` alıyor — sınav
zayıf-bölge takibi de ikili tipli).

**Dosya/satır tahmini:** `tonal-denge.js` (evaluateAnswer +
calculateXP + muhtemelen getFeedbackData/teachingText metni, ~20-30
satır ek/değişiklik) + `app.js`'te `submitTonalDengeGuess`'in
doğru/yanlış dal ayrımının yeniden yapılandırılması (~46 satırlık blok,
`app.js:5232-5277` — en büyük maliyet BURADA, tablo formülünün
kendisinde değil). `exam-system.js`/`answer-history.js`'e dokunmak
GEREKİP GEREKMEDİĞİ ürün kararına bağlı: "correct" kavramının sınav/
geçmiş amaçları için ne anlama geleceği (tüm bantlar toleransta mı,
yoksa XP'den bağımsız mı kalacak) netleşmeden BELİRSİZ.

**Kaç test kırılır:** `test/tonal-denge.test.mjs` (67 test) içinde
**~15-20 test** doğrudan ikili doğruluk/XP-kapısı varsayımını
kodluyor — özellikle satır 205: `calculateXP(q, {correct:false}, ...)
=== 0` (bu, "yanlış ⇒ 0 XP"yi doğrudan spesifikasyon olarak yazıyor),
satır 437-517 arası iki büyük istatistiksel kabul-kriteri simülasyonu
(2000+ deneme), ve teachingText/feedback metin testleri (satır
244-274). Geri kalan ~47 test (bant-sayısı rampası, eğri matematiği,
`applyProcessing`, DOM render) ETKİLENMEZ. `test/source-catalog.test.mjs`,
`test/paywall.test.mjs`, `test/exam-coverage.test.mjs` vb. sadece
metadata için tonal-denge'ye değiniyor, skor mantığına dokunmuyor —
ETKİLENMEZ.

### A.5 Bant sayısına göre ayrı XP tablosu — nasıl kurulur?

Bant sayısı 4/5/6 arası değişiyor (A.1), zorluk seviyesinden bağımsız —
yani tablo **bant-sayısına duyarlı** olmalı (Logic'in verdiği örnek
sadece 4 bant için). Kod tabanında **iki benzer emsal** var, ikisi de
Tonal Denge'nin ihtiyacıyla tam örtüşmüyor:

- **Oran-bazlı (en yakın emsal):** Frekans Bulma'nın `proplus`
  alt-modu, `hit`/`bandCount` oranını (`frekans-bulma.js:473-477`,
  `523`) `ratio * 1.5` çarpanıyla (satır 524) DOĞRUSAL ölçekliyor —
  Logic'in istediği ARTAN/doğrusal-olmayan eğri DEĞİL.
- **Ayrık tablo (yapısal emsal):** Frekans Çakışması'nın
  `STAGE_XP_MULTIPLIER = {1:0.8, 2:0.9, 3:1.3}`
  (`frekans-cakismasi.js:451`, kullanım: `459`/`470`) — küçük, ayrık
  bir anahtara (orada `stage`, burada `correctBandCount`) göre çarpan
  tablosu. Bu desen doğrudan uyarlanabilir AMA bant-sayısına göre
  AYRI tablo (4-bantlık/5-bantlık/6-bantlık) gerektiği için üç ayrı
  tablo ya da bant-sayısı parametreli bir formül gerekir.

**BELİRSİZ:** 5 ve 6 bantlık sorular için Logic'ten sadece 4 bantlık
örnek geldi (15/35/75/100) — 5/6 bant tabloları için henüz bir tasarım
notu YOK, kod tabanında da böyle bir emsal bulunamadı.

### A.6 Zorluk eğrisine dokunuyor mu?

**Dolaylı olarak, evet — toplam XP üzerinden.** Otomatik zorluk
pozisyonu (`app.js:1410-1433`, satır 1415) doğrudan `continuousLevel
(progress.xpProgress(modeXp))` — yani mod başına BİRİKMİŞ XP'nin bir
fonksiyonu, bu da `createQuestion`'a geri besleniyor
(`disturbDb`/`timeSec`/`neutralToleranceDb`, `tonal-denge.js:334-343`).
**İkili doğruluk KENDİSİ eğriyi değil, "XP kazanılıp kazanılmadığını"
etkiliyor — kısmi XP eklenirse bu XP otomatik olarak eğriye akar**
(yeni kablolama gerekmez) ama **ilerleme HIZI değişir**: bugün 0 XP
üreten "kısmen doğru" cevaplar artık ilerlemeye katkı yapar, yani
kullanıcılar bugüne göre biraz daha hızlı seviye atlar.

Ayrıca `handleExamOutcome`'un zayıf-bölge takibi
(`exam-system.js:recordTierResult`, `app.js:3277`) `result.correct`'i
HAM boolean olarak tüketiyor — bu, zorluk eğrisinin KENDİSİ değil ama
sınav/telafi tetikleme mantığının bir parçası, ve "correct" tanımı
değişirse burası da AYRI bir ürün kararı gerektirir (A.4'te not
edildi).

### A.7 Geri bildirim ekranı değişmeli mi?

**Bant-bazlı doğru/yanlış zaten gösteriliyor** — bu kısım için EK iş
GEREKMİYOR: `markAnswerChoices()` (`tonal-denge.js:596-613`) her bandı
kendi toleransına göre `right`/`wrong` CSS sınıfıyla işaretliyor (satır
609), kalan sapmayı yazıyor (satır 611); CSS zaten var
(`styles.css:1313-1316`). `teachingText()` (`tonal-denge.js:499-524`)
bant-başına Türkçe geri bildirim metni üretiyor.

**Değişmesi gereken sadece BAŞLIK/XP alanı:** `getFeedbackData`
(`tonal-denge.js:531-534`) başlığı `result.correct`'e göre seçiyor —
"3/4 doğru" gibi bir ara durumun başlık metni YOK, eklenmesi gerekir.
Gösterilen XP sayısı da bugün sadece doğru-dalında hesaplanıyor
(A.4) — kısmi XP UI'da görünmesi için `submitTonalDengeGuess`'in
yeniden yapılandırılmasına bağımlı.

### A.8 ÖZET — iş yükü, risk, öneri

- **İş yükü:** `tonal-denge.js` ~20-30 satır (evaluateAnswer + yeni
  bant-sayısına-duyarlı XP tablosu/formülü) + `app.js`'te
  `submitTonalDengeGuess`'in doğru/yanlış ayrımının yeniden kurulması
  (~46 satırlık blok, en maliyetli kısım) + `exam-system.js`/
  `answer-history.js`'e dokunup dokunmama kararı (BELİRSİZ, ürün
  kararına bağlı). ~15-20 test güncellenmeli (67'den).
- **Risk:** ORTA-YÜKSEK. Sebep kod karmaşıklığı değil — `result.correct`
  bugün TEK bir anlam taşıyor (stats/combo/exam-tier/history/XP hepsi
  aynı boolean'a bakıyor) ve kısmi XP eklemek bu anlamı EN AZINDAN XP
  için ikiye ayırıyor ("XP-doğruluğu" vs "sınav/istatistik-doğruluğu").
  Bu ayrım netleşmeden yazılacak kod, sınav zayıf-bölge tespitini veya
  combo/streak sayaçlarını farkında olmadan bozabilir.
- **Zorluk eğrisine risk:** DÜŞÜK-ORTA — kablolama gerekmiyor ama
  ilerleme hızı sessizce değişir (kısmi cevaplar artık XP üretir).
- **Öneri (ölçüm bulgusuna dayalı, ÜRÜN KARARI kullanıcıya bırakılır):**
  Yayına 6 gün kala bu, "ürün kararı + orta ölçekli refactor" — TEK
  oturumda AYRI COMMIT'le yapılabilir görünüyor AMA önce şu soru
  netleşmeli: **kısmi-doğru bir cevap sınav/telafi'de "doğru" mu
  sayılacak, yoksa SADECE XP'de mi kısmi olacak?** Bu netleşmeden
  koda başlamak, `handleExamOutcome`'un davranışını istemeden
  değiştirme riski taşır.

---

## B) SEANS SONU EKRANI — BAŞARISIZLIKTA GÖSTERİLSİN

### B.1 Şu an sınav/telafi kalınca ne oluyor?

**İki farklı yol var, ikisi de FARKLI davranıyor — görev metninin
"sınav ya da telafi" tek bir şeymiş gibi ele alması YANLIŞ varsayım
olabilir, ayrı ayrı ölçüldü:**

- **Sınav başarısız (`exam-failed`):** ZATEN özel bir "başarısız" ekranı
  VAR. `exam-system.js:307-321`'in `recordAnswer()`'ı `{event:
  "exam-failed"}` döndürüyor → `app.js:3332-3335`'te
  `handleExamOutcome` `showExamScreen("failed", {...})` çağırıyor →
  `app.js:3194-3211`, `#screen-exam` üzerinde "SINAV GEÇİLEMEDİ" /
  "Parkur baştan" metni + "Devam Et" CTA'sı (yeni tura döner). **Bu
  showSessionEnd DEĞİL, ayrı ve zaten var olan bir ekran.**
- **Telafi başarısız (`remedial-failed`):** **HİÇBİR ekran YOK.**
  `exam-system.js:324-334`'ün kendi yorumu (satır 329-331): "İKİ
  durumda da (geçti/geçemedi) SONUÇ aynı — taze bir parkur." Sadece
  `event` string'i farklı. `app.js:3343-3346`'daki `remedial-failed`
  dalı `appendExamNote(...)` ile geri bildirim paneline TEK satır not
  ekliyor ve `false` DÖNDÜRÜYOR — yani çağıranın normal
  `scheduleNext(...)` akışı devam ediyor, oyun KESİNTİSİZ sürüyor.
  `e2e/exam-flow.spec.mjs:54-85` bunu AÇIKÇA doğruluyor: 5 başarısız
  telafi sorusundan sonra final ekran `"screen-game"` olarak
  ASSERT EDİLMİŞ — yani bu, TESTLE KİLİTLENMİŞ mevcut/kasıtlı
  davranış.

**Sonuç: sınav tarafında zaten bir "başarısız" UI var (showSessionEnd
değil); telafi tarafında HİÇBİR kesinti yok. Logic'in isteği
gerçekleşirse en büyük davranış değişikliği TELAFİ tarafında olur.**

### B.2 `showSessionEnd` nerede, ne kadar, canlı mı?

Tanım: `app.js:1881-2039` — **159 satır** (verilen "~220 satır" rakamı
DOĞRULANAMADI, muhtemelen bitişik `hideSessionEnd()` (`app.js:2041-2044`)
veya yorum bloklarını da sayan eski bir tahmindi — BELİRSİZ, kesin
kaynağı bulunamadı). `#screen-result` (`index.html:1512-1611`) altında
~25 DOM ID'sini dolduruyor.

**Çağrı noktaları (4 tanesi, hepsi `app.js` içinde):**
- `app.js:1673` (`blockIfLivesOut`) — `showSessionEnd("lost")`,
  `openPaywallReason("livesOut")` `false` DÖNERSE (pratikte HEMEN HEMEN
  HİÇ, çünkü `"livesOut"` `paywall.js:291`'de tanımlı bir reasonKey).
- `app.js:1754`/`1774` — aynı desen, `"freeLimit"`/`"sessionLimit"`
  için, aynı şekilde pratikte erişilemez (`paywall.js:283`'te tanımlı).
- `app.js:6490` (`finishChallenge`) — `showSessionEnd("normal")`,
  TEK çağıran `app.js:5997-5999`'da `!examGateActive()` şartına bağlı
  — TÜM modlarda `EXAM_ENABLED=true` olduğu için **Pro kullanıcıda
  ASLA tetiklenmiyor** (kasıtlı, `app.js:5983-5994`'ün kendi yorumu:
  Pro'da bölüm bitirme ödülü zaten sınav ekranı).

**Ölü kod mu?** Harfiyen değil (4 gerçek çağrı noktası var, test kancası
`window.__aeaShowSessionEndForTest`, `app.js:12625`, üzerinden de canlı
tutuluyor) ama **gerçek UI akışından PRATİKTE erişilemez** —
`e2e/layout-geometry.spec.mjs:107-112`'nin kendi yorumu bunu doğruluyor:
"üç dalı da normal akıştan BİR DAHA erişilemez hâle geldi... kod
KALICI, sadece UI'dan tetiklenemiyor." Free kullanıcıda `"normal"` dalı
hâlâ (10 soruyu can kaybetmeden bitirince) çalışıyor; Pro'da hiçbir dal
gerçek akıştan tetiklenmiyor.

### B.3 Fonksiyonel mi — çürüme riski?

**DÜŞÜK.** Yazdığı TÜM DOM ID'leri (`resPill`, `resKicker`, `resRing`,
`resXpRows`, `resCta`, `resWaitRow` vb.) `index.html:1512-1611`'de
GÜNCEL/bakımlı markup olarak MEVCUT — kendi kontrat yorumu
(`index.html:1498-1512`) güncel ID setini listeliyor.
`e2e/layout-geometry.spec.mjs:128-151` fonksiyonu DOĞRUDAN
(`window.__aeaShowSessionEndForTest("lost")` ile) çağırıp gerçek
içerik render edildiğini doğruluyor. **Bakımlı ama UI'dan
erişilemeyen kod — çürümüş DEĞİL.**

### B.4 Başarısızlıkta göstermek için ne gerekiyor?

**İki AYRI çağrı noktası dokunulmalı** (A ve B ayrı yollar, B.1):
- Sınav-başarısız: `app.js:3332-3335` — bugün `showExamScreen("failed",
  ...)` çağırıyor. `showSessionEnd` eklemek/değiştirmek, ZATEN VAR olan
  özel bir ekranın YERİNE ya da YANINA yeni bir ekran koymak demek —
  tasarım kararı gerektirir (bu rapor kapsamı DIŞI).
- Telafi-başarısız: `app.js:3343-3346` — bugün HİÇBİR ekran yok, sadece
  metin notu. En büyük NET YENİ iş burada.

**Veri erişilebilirliği:**
- Sınav tarafı: `examCorrectSnapshot`, `es.examLevel`, `examXpSum` —
  ÇAĞRI NOKTASINDA zaten mevcut.
- Telafi tarafı: **DEĞİL** — `exam-system.js:recordAnswer()`
  `resetParkur()`'u (satır 207-211, remedialIndex/remedialCorrect
  sıfırlanıyor) `{event: "remedial-failed"}` döndürmeden ÖNCE
  çağırıyor, yani `handleExamOutcome`'a ulaştığında bu sayılar zaten
  0. "Telafi'de X/5 doğru" verisi için `recordAnswer()` çağrılmadan
  ÖNCE bir anlık görüntü (snapshot) alınmalı — TAM OLARAK
  `examCorrectSnapshot`'ın (`app.js:3288`) bugün zaten yaptığı desen,
  küçük ve emsalli bir ek.
- `session.correct/wrong/xp/log` (showSessionEnd'in asıl gösterdiği
  veri, B.6) hiçbir yerde sınav/telafi akışında SIFIRLANMIYOR
  (`resetSession()` sadece menüye dönüş/yeni deneme yollarında
  çağrılıyor) — yani gösterilecek sayılar SADECE o başarısız
  sınav/telafiye değil, TÜM oyun oturumuna ait olur (B.6'da içerik
  uyuşmazlığı olarak ayrıca not edildi).

### B.5 Mevcut akışı bozar mı?

- **(a) Sınav'da başarısız olan Pro kullanıcı:** zaten özel bir ekran
  var (`showExamScreen("failed")`) — buraya `showSessionEnd` eklemek
  akışa İKİNCİ bir tam-ekran geçiş sokmak demek, tasarım çakışması
  riski taşır.
- **(b) Telafi'de başarısız olan Pro kullanıcı:** bugün HİÇBİR
  kesinti yok (oyun kesintisiz sürüyor, `e2e/exam-flow.spec.mjs:81`
  ile TESTLE kilitli). Ekran eklemek "kesintisiz devam"dan "dur ve
  ekran göster"e geçiş — davranış deltası burada (a)'dan BÜYÜK.
- **(c) Ücretsiz kullanıcı:** `examGateActive()` = `EXAM_ENABLED &&
  isUserPro()` — ücretsiz kullanıcıda HER ZAMAN `false`, yani
  `handleExamOutcome` ücretsiz kullanıcı için HİÇ ÇAĞRILMIYOR
  (`app.js`'teki TÜM 11 çağrı noktası aynı `examGateActive()` şartına
  bağlı). **Bu değişiklik pratikte SADECE Pro kullanıcıyı etkiler.**
  **Bir düzeltme:** görev metni "ücretsiz kullanıcı 10. soruda
  paywall'a düşüyor" diyordu — ölçülen gerçek sınır
  `paywall.js:113`'teki `FREE_SESSION_QUESTION_LIMIT = 5`, yani
  **5. soru**, 10 DEĞİL. Kod tabanındaki tek "10" `EXAM_CONFIG.
  PARKUR_LENGTH = 10` (`exam-system.js:57`) — bu da Pro-only.
  BELİRSİZ: görev metnindeki "10" başka bir şeye mi atıfta bulunuyordu,
  yoksa yanlış mı hatırlanmıştı — bu konuda başka bir "10" sınırı
  bulunamadı.

### B.6 İçerik yeterli mi?

`showSessionEnd` bugün gösteriyor: isabet halkası (doğru/toplam/%),
`kind`'e göre TEK satır başlık (SADECE 3 varyant: `"lost"`, `"freeLimit"`,
varsayılan "normal"), seviye-atlama rozeti, XP dökümü, mevcut
seviye/XP çubuğu, en iyi/güncel streak + ipucu sayısı, frekans/sıra
cevap haritası, zayıf-bölge yorumu, yeni rozet kartı, TEK CTA butonu.

**"Başarısız" bağlamı için YETERSİZ, iki sebepten:**
- **Veri kapsamı uyuşmuyor:** `session.*` alanları TÜM oyun oturumunu
  kapsıyor (birden fazla parkur/sınav/telafi döngüsü olabilir), SADECE
  başarısız olunan sınav/telafi turunu DEĞİL — "az önce nasıl gittim"
  sorusuna cevap vermiyor.
- **CTA'nın "başarısız"a özel davranışı YOK:** `app.js:8085-8101`'deki
  tıklama işleyicisi sadece `"lost"`/`"freeLimit"`/varsayılan
  ("normal" → yeni 10 soruluk bölüm başlat) davranışlarını biliyor —
  tanınmayan bir `kind` sessizce "normal" davranışına düşer. "Sınavı
  TEKRAR dene" / "Telafiyi TEKRAR dene" gibi bir eylem YOK; oysa
  `showExamScreen`'in kendi "failed" dalı ZATEN aynı parkura devam eden
  bir CTA sunuyor (`app.js:3207`). Başlık metinleri de (3 varyant)
  "sınav/telafi geçilemedi" için özel bir metin İÇERMİYOR.

### B.7 Dosya/satır tahmini + etkilenen testler

**Muhtemel dosyalar:** `app.js` (`handleExamOutcome`'un `exam-failed`
(3332-3335) ve `remedial-failed` (3343-3346) dalları + gerekirse
`showSessionEnd`'e yeni bir `kind` ve CTA dalı, 8085-8101) — ana yük
BURADA. `exam-system.js` SADECE telafi-skor verisi farklı şekilde
sunulmalıysa (gerekmeyebilir, B.4). `index.html` SADECE yeni
başlık/metin varyantı için ayrı markup gerekirse (gerekmeyebilir, aynı
parametrik şablon yeniden kullanılabilir). iOS/Android derleme
kopyaları (`ios/App/App/public/`, `android/.../assets/public/`) ayrıca
güncellenmeli mi — bu turda derleme betiği incelenmedi, BELİRSİZ.

Gerçek koda bakıldığında (iki `case` dalına dokunmak + mevcut 159
satırlık fonksiyona bir `kind` eklemek) **satır sayısı olarak KÜÇÜK,
cerrahi bir değişiklik** gibi görünüyor (onlarca satır mertebesinde,
yüzlerce DEĞİL) — ama bu KOD YAZILMADAN yapılmış bir tahmin, kesin
değil.

**Etkilenecek/kırılma riski taşıyan testler:**
- `test/exam-system.test.mjs:176-185, 230-238, 388` — `exam-failed`/
  `remedial-failed` OLAYLARININ üretildiğini test ediyor
  (`core/exam-system.js` saf durum makinesi). `app.js`'in ekran
  yönlendirmesi DEĞİŞSE bile bu testler ETKİLENMEZ (olaylar aynı
  kalabilir).
- **`e2e/exam-flow.spec.mjs:54-85` — KIRILIR.** 5 başarısız telafi
  sorusundan sonra final ekranın `"screen-game"` olduğunu (satır 81) VE
  `#gameExamRow`'un gizli olduğunu (82-83) doğrudan ASSERT EDİYOR —
  telafi-başarısızında herhangi bir engelleyici ekran göstermek bu
  testle DOĞRUDAN ÇELİŞİR, güncellenmesi ZORUNLU.
- `e2e/exam-screen-exit-reset.spec.mjs:67-96, 97-122` — `showExamScreen`'in
  "failed" dalının çıkış davranışını test ediyor; sınav-başarısız
  akışı değiştirilirse GÖZDEN GEÇİRİLMELİ (kırılacağı KESİN değil,
  uygulama seçimine bağlı).
- `e2e/layout-geometry.spec.mjs:128-151` — `showSessionEnd("lost")`'u
  doğrudan test kancasıyla çağırıyor; fonksiyonun kendisi/kanca
  değişmezse muhtemelen ETKİLENMEZ.
- `test/review-request-callsites.test.mjs:37-70` — `kind === "normal"`
  gibi metin bitişikliğine dayalı statik kontroller; yeni `kind` dalları
  dikkatsizce eklenirse dolaylı olarak etkilenebilir, doğrudan
  başarısızlık davranışını test ETMİYOR.

**Sayı özeti:** kesin kırılacağı ölçülen **1 e2e testi**
(`exam-flow.spec.mjs`), gözden geçirilmesi gereken **2 e2e testi**
(`exam-screen-exit-reset.spec.mjs`), dolaylı/gevşek bağlı **2 dosya**
daha (`layout-geometry.spec.mjs`, `review-request-callsites.test.mjs`).
`exam-system.test.mjs`'in ETKİLENMEMESİ bekleniyor (saf durum
makinesi testleri, ekran yönlendirmesine dokunmuyor).

### B.8 ÖZET — iş yükü, risk, öneri

- **İş yükü:** KÜÇÜK-ORTA. Kod tarafı (`app.js`'te iki dal + bir yeni
  `kind`) tahminen onlarca satır. Asıl iş ÜRÜN/TASARIM kararlarında:
  sınav-başarısızında ZATEN VAR olan `showExamScreen("failed")`'in
  yerini mi alacak yoksa yanına mı eklenecek; telafi-başarısızında
  hangi CTA davranışı olacak (yeni tabanlı bir "tekrar dene" mi, yoksa
  showSessionEnd'in bugünkü "normal" CTA'sı "yeni bölüm başlat" mı
  kullanılacak — ki bu, telafi bağlamında YANLIŞ olabilir).
- **Risk:** DÜŞÜK-ORTA. En büyük somut risk: `e2e/exam-flow.spec.mjs`'in
  KİLİTLEDİĞİ "telafi başarısızı SESSİZCE devam eder" davranışının
  BİLEREK, testle birlikte değiştirilmesi gerekiyor (bu testin ESKİ
  hâli artık YANLIŞ sayılacak — testi güncellemek görevin DOĞAL bir
  parçası, ama KİLİT'in "e2e kırılmayacak" ilkesiyle nasıl uzlaştırılacağı
  konuda ürün onayı gerekir, çünkü bu test ŞU AN bilinçli/kasıtlı bir
  davranışı doğruluyor).
- **İçerik riski:** showSessionEnd'in mevcut içeriği (tüm-oturum
  istatistiği + "yeni bölüm başlat" CTA'sı) "başarısız oldun" bağlamı
  için YAZILMAMIŞ — ya yeni bir `kind`'e özel başlık/CTA metni
  eklenmeli ya da bu ekran yerine `showExamScreen`'in zaten var olan
  desenine (parkura devam eden CTA) daha yakın YENİ bir varyant
  düşünülmeli. Bu bir ÜRÜN KARARI, ölçümle belirlenemez.
- **Öneri:** Sınav tarafı DÜŞÜK öncelikli — zaten çalışan bir
  "başarısız" ekranı var, dokunmadan bırakmak DAHA GÜVENLİ. Telafi
  tarafı, Logic'in isteğinin GERÇEK karşılığı — küçük, iyi
  sınırlanmış bir değişiklik ama `exam-flow.spec.mjs`'in kasıtlı
  bilinen davranışını AÇIKÇA değiştirdiği için önce onaylanmalı.
  Yayına 6 gün kala, veri-kapsamı (B.6) netleşmeden uygulanırsa
  kullanıcıya "10 sorudan 3 doğru" gibi YANLIŞ/yanıltıcı bir özet
  gösterme riski var — bu içerik sorunu koddan ÖNCE çözülmeli.

---

## GENEL NOT

İki iş de kod olarak KÜÇÜK-ORTA ölçekli görünüyor ama İKİSİ DE asıl
maliyeti üründe taşıyor: (A) "correct" kavramının XP/sınav/istatistik
için AYNI mı KALACAK yoksa AYRILACAK mı sorusu, (B) telafi-başarısızı
ekranının hangi veriyi/CTA'yı göstereceği. Kod tarafı ÖLÇÜLDÜ ve
sınırlı; ürün kararları ÖLÇÜLEMEDİ, kullanıcıya sorulmalı.

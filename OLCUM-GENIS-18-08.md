# OLCUM-GENIS-18-08 — Kapsamlı ölçüm (tur yaşam döngüsü + 9 doğrulama)

**Görev tipi:** ÖLÇÜM. Kod değiştirilmedi, commit atılmadı. `git status --short`
bu turun sonunda SADECE `ios/App/App.xcodeproj/project.pbxproj`'u gösteriyor
(önceki `npx cap sync ios` çalıştırmasından kalma, bu turun DOKUNMADIĞI bir
dosya) + bu raporun kendisi.

**Önce okunan:** son 6 tur yaşam döngüsü dokunuşu doğrulandı (`git log`):
G276 (bölüm çubuğu sırası), G277 (kurtarılan tur çalmıyor), G287 ("Çık" turu
terk eder), G267 (seamless ses), G300 (çıkış temizliği), G304 (sınav/telafi
çubuğu). **B1'in cevabı baştan söylensin:** A1/A2'nin ortak kökü VAR ve tek
bir noktada — aşağıya bkz.

---

## BÖLÜM A — Cihazda görülen hatalar

### A1) Ertelenmiş sınav/telafi yarım durum 🔴 — TAM TEKRAR ÜRETİLDİ

**Playwright'ta üretildi** (Boost mu Cut mu, 10× "Atla" → telafi tetiklendi →
`#exSecondary` ["Ana Ekran"] tıklandı → AYNI moda tekrar girildi):

```
startBtnText: "⏸"                         ← "Play tuşu pause'a dönmüş" — BİREBİR
startBtnClasses: "game-ctrl-play breathing" ← "nefes alan" (aktif) animasyon TAKILI KALMIŞ
answersVisible: false, answersChildCount: 0 ← "İçerik (bantlar) görünmüyor" — BİREBİR
gameChapterDotsState: 9× WRONG, 1× "-"      ← "Soru barı eski yanlış cevaplarla duruyor" — BİREBİR
questionTitle: (eski soru metni)            ← ekran GERÇEKTEN yarım kalmış
```

**Kök sebep:** `enterMode(entry, realMode)` (`app.js:2785`) TÜM UI-sıfırlama
mantığını (`updateStartBtnLabel()`, `challenge = freshChallenge()`,
`updateTimerUI(0,0)`, `updateUI()`, `#answers`/`#freqGuessArea` temizliği —
`app.js:2807-2939`) **SADECE `mode !== realMode` iken** çalıştırıyor
(`if (mode !== realMode) { ... }` bloğu `app.js:2807`'de başlıyor, `2940`'ta
kapanıyor). `goScreen("game")` (`2941`) bloğun DIŞINDA, KOŞULSUZ.

Kullanıcı sınav/telafi teklifiyle karşılaştığında MOD HİÇ DEĞİŞMEMİŞ olur
(`mode` module-level değişkeni hep aynı kalır, ekran `#screen-exam`'e geçer
ama `mode` X kalır). `showExamScreen()`'in "Ana Ekran" (`kind==="passed"/
"failed"/"makeup"`) `secondaryHandler`'ı (`app.js:3176`, `3193`, `3218`)
SADECE `activeQuestion = null; storage.clearInProgressRound(); goScreen("menu");`
yapıyor — `pauseRound()` (`updateStartBtnLabel`/timer/feedback-panel
sıfırlamasının GERÇEK kaynağı) HİÇ ÇAĞRILMIYOR. Kullanıcı SONRA AYNI mod
kartına basınca, `enterMode(entry, X)` çağrılıyor ama `mode===X===realMode`
olduğu için TÜM sıfırlama bloğu ATLANIYOR — sadece `goScreen("game")` çalışıp
kullanıcıyı SIFIRLANMAMIŞ bir ekranda bırakıyor.

**Dosya:satır:** `app.js:2785` (`enterMode`), `app.js:2807-2940` (sadece
mode-değişiminde çalışan blok), `app.js:2941` (koşulsuz `goScreen("game")`),
`app.js:3176/3193/3218` (üç "Ana Ekran" handler'ı).
**Hangi commit:** `enterMode`'un "aynı moda dönüşte sıfırlama atlanır"
optimizasyonu G174/G176 civarı (kod içi yorumlarla doğrulandı, tam commit
taranmadı — kapsam dışı). Üç "Ana Ekran" handler'ının GÜNCEL hâli
`b8e9067` (**G287**, "Çık turu terk eder") — G287 `activeQuestion=null`/
`clearInProgressRound()` eklerken `pauseRound()`'u BURAYA hiç eklemedi.
`showExamScreen()`'in kendisi çok daha eski (`07a2c05`, G84).
**Düzeltme yolu (uygulanmadı, ÜRÜN KARARI GEREKTİRMEZ — teknik gap):** üç
"Ana Ekran" handler'ına `pauseRound()` (ya da en azından `updateStartBtnLabel()`
+ `roundFlow.clearTimer()` + feedback-panel sıfırlama) eklemek — G300'ün
`performExit()`'e eklediği `stopAudio()` ile AYNI ruhta ama bu sefer SES
DEĞİL, UI/state kapsıyor. **Alternatif/daha kökten çözüm:** `enterMode()`'un
`goScreen("game")`'den ÖNCE, mode eşleşse BİLE `activeQuestion===null`
durumunda minimum bir "temiz idle ekran" sıfırlamasını GARANTİ etmesi (yani
"aynı moda dönüşte sıfırlama atlanır" varsayımının, "AMA activeQuestion zaten
null'sa yine de temizle" istisnasıyla güçlendirilmesi).
**Risk:** DÜŞÜK — `pauseRound()` zaten "Durdur"un HER ZAMAN çalışan, güvenli
tek kontrol noktası (#53); bu üç handler'a eklenmesi sadece EKSİK bir
temizliği TAMAMLAR, mevcut davranışı BOZMAZ. **Neyi bozabilir:** eğer
`pauseRound()` `persistInProgressRound()` çağırıyorsa (çağırıyor,
`app.js:6029`'daki notlara göre) ve bu an "round GERÇEKTEN terk ediliyor"
anıysa, `pauseRound()`'un persist ettiği kayıt HEMEN ARDINDAN
`storage.clearInProgressRound()` ile zaten SİLİNECEK — sıralama ÖNEMLİ
(önce pauseRound, SONRA clearInProgressRound — mevcut performExit() deseniyle
AYNI sıra).

---

### A2) Atlayınca Bölüm çubuğu donuyor 🔴 — İZOLE HÂLDE TEKRAR ÜRETİLEMEDİ, A1'in SONUCU OLARAK BEKLENİYOR

**İzole test (Boost mu Cut mu, TEMİZ bir Bölüm'de 5× "Atla" + 1 doğru
cevap):** çubuk HER "Atla"da doğru ilerledi (`WRONG,WRONG,WRONG,WRONG,WRONG`
sonra `ON`), G276'nın kendi testiyle (`chapter-dots-order.spec.mjs`)
UYUMLU — **bu senaryoda hata YOK.**

**Ama A1'in ÜRETTİĞİ yarım durumda ("ekran YARIM KALIYOR") "Atla" BAŞKA bir
şey yapıyor olabilir — BELİRSİZ, bu turda AYRICA test EDİLMEDİ.** A1'in kendi
ölçümünde görülen `gameChapterDotsState` (9× WRONG, önceki Bölüm'den kalma)
zaten `challenge` modül değişkeninin `enterMode()`'un atladığı
`challenge = freshChallenge()` satırı (`app.js:2925`) YÜZÜNDEN sıfırlanmadığını
KANITLIYOR — yani A1'in yarım durumunda kullanıcı "Atla"ya bassa bile, ESKİ
(zaten 9/10 dolu) `challenge` nesnesi üzerinde ilerlemeye çalışıyor olurdu.
`scheduleNext()`'in `challenge.done >= challenge.total` kontrolü
(`app.js:5954` civarı, önceki oturumdan biliniyor) BU DURUMDA hemen
`finishChallenge()`'ı tetikleyebilir — çubuk "ilerlemiyormuş" gibi
GÖRÜNEBİLİR çünkü ZATEN neredeyse dolu bir çubuğa bakılıyor.
**BELİRSİZ — bu zincir Playwright'ta doğrudan doğrulanmadı, sadece A1'in
verisinden MANTIKSAL çıkarım.**

**Dosya:satır:** `app.js:2925` (`challenge = freshChallenge()`, atlanan
satır).
**Hangi commit:** aynı `enterMode()` optimizasyonu, A1 ile AYNI.
**Düzeltme yolu:** A1'in düzeltmesiyle AYNI — `pauseRound()`/eşdeğeri üç
"Ana Ekran" handler'ına eklenirse, kullanıcı BİR DAHA bu yarım duruma hiç
DÜŞMEZ, A2'nin bu SPESİFİK tetikleyicisi de ortadan kalkar. **Ayrı bir kod
değişikliği GEREKMEYEBİLİR** — bu A2'nin BAĞIMSIZ bir hata değil, A1'in bir
SONUCU olma ihtimalinin YÜKSEK olduğunu gösteriyor (B1'e bkz.).
**Risk:** A1 ile aynı.

---

### A3) Snare offset (G302) — ⚠️ ÜRÜN/KULAK KARARI GEREKİYOR, ÖLÇÜM ÇELİŞMİYOR AMA KRİTER FARKLI OLABİLİR

**Ölçüm TEKRARLANDI, farklı eşiklerle (RMS/peak, -20dB/-30dB, 1ms/5ms
çözünürlük) çapraz kontrol edildi — G302'nin sayıları DOĞRU ölçüldü,
hesap hatası YOK:**

| Kaynak | Ölçülen ilk onset (tüm yöntemler ~aynı) |
|---|---|
| `snare_late.m4a` | 1.530-1.541s (yöntemden bağımsız SABİT) |
| `acoustic_guitar.m4a` | 1.103-1.119s |
| `clean_guitar.m4a` | 0.363s (TÜM yöntemlerde AYNI) |

**Fark nereden geliyor — OLCUM-CIFT-OFFSET-17-08.md'nin KENDİ metninden
bulundu:** o raporun 4. satırı "her çiftin np.roll ile kulakla onaylanmış
**FARKLI** bir kaydırma" diyor — yani ORİJİNAL niyet HER ÇİFT için AYRI bir
kulak-onaylı değerdi. Ama AYNI raporun 151. satırı: "`snare+akustik` VE
`snare+clean`: ikisi de snare **+377ms** → AYNI shifted-snare" — yani
UYGULAMA, niyetin AKSİNE, İKİ snare çiftine de AYNI (377ms) değeri verdi.
377ms'in kendisi raporun 79. satırına göre `bas+akustik`/`bas+clean`
çiftlerinin (gitar tarafının) değeri — **snare için BAĞIMSIZ bir kulak
onayı bulunamadı, sadece bas çiftlerinden ÖDÜNÇ alınmış bir sayı olduğu
GÜÇLÜ ŞEKİLDE görünüyor** (G302'nin kendi raporunun vardığı sonuçla AYNI).

**Öyleyse "Logic dün 377ms'i kulakla onaylamıştı" iddiasıyla nasıl
UYUŞTURULUR? BELİRSİZ — üç olasılık, hiçbiri bu turda kesin doğrulanamadı:**
1. Onay muhtemelen BAS çiftleri (ya da GENEL "377ms mantıklı bir sayı"
   izlenimi) içindi, snare_late.m4a'nın KENDİ yapısıyla AYRICA kontrol
   edilmemiş olabilir (yukarıdaki raporun kendi çelişkisiyle TUTARLI).
2. G302'nin seçtiği HİZALAMA KRİTERİ ("snare'in ilk vuruşu gitarın ilk
   atağıyla ÇAKIŞSIN") YANLIŞ kriter olabilir — belki asıl istenen "offset
   sadece sessizliği aşacak KADAR küçük olsun" (minimal müdahale), snare'in
   TAM olarak gitarla senkron olması DEĞİL. Bu bir ÜRÜN/KULAK tercihi,
   ölçümle karar VERİLEMEZ.
3. `snare-clean`'in değişimi (377ms→1175ms, ~800ms fark) `snare-akustik`'inkinden
   (377ms→425ms, ~48ms fark) ÇOK DAHA BÜYÜK — eğer "bozuk geliyor" ifadesi
   SADECE snare-clean için geçerliyse, bu asimetri açıklayıcı olabilir.

**Düzeltme yolu (uygulanmadı — ÜRÜN KARARI):** Logic'in KENDİSİ yeni
değerlerle (0.425/1.175) GERÇEK cihazda kulakla dinleyip onaylamalı ya da
REDDETMELİ. Reddederse: (a) eski 377ms'e dönülür (ama OLCUM-CIFT-OFFSET'in
KENDİ tespitine göre bu, sessizlikte başlıyor demekti), (b) YA DA üçüncü bir
değer (minimal-offset yaklaşımı — sadece dosyanın 500ms'lik sessiz-başını
aşacak kadar, örn. ~0.5-0.6s, snare'in TAM vuruşuna denk gelmeden ama en
azından "hemen bir şey duyuluyor" hissi vermek için) kulakla aranmalı.
**Risk:** düşük teknik risk (tek sayı değişimi, `source-catalog.js`), YÜKSEK
ÜRÜN riski (yanlış değer kalırsa kullanıcı deneyimi bozuk kalır — bu yüzden
kod DEĞİŞTİRİLMEDİ, sadece rapor edildi).

---

### A4) Hızlı cevapta ses örtüşmesi — OLCUM-SES-BIRIKME-18-08'İN TEKRARI + İKİ YENİ SORUYA CEVAP

(Önceki turda TAM ölçüldü — kök sebep zaten OLCUM-SES-BIRIKME-18-08.md'de
belgeli, burada SADECE bu turun İKİ yeni sorusuna cevap veriliyor.)

**Düzeltilirse "önce/sonra karşılaştırması" bozulur mu?** EVET, DOĞRUDAN
BOZULUR — `submitCakismaGuess()`'in stage-3 dalı (`app.js:5358-5362`)
`stopAudio()`'yu TAM OLARAK bu özelliği (kullanıcının cevap SONRASI iki
kaynağı "Önce"/"Sonra" ile karşılaştırabilmesi, `#cakismaBefore`/
`#cakismaAfter` butonları) çalışır tutmak için atlıyor — stopAudio()
eklenirse İKİ kaynak da anında susar, "Sonra" butonu (index.html:585,
`class="btn on"` — VARSAYILAN AÇIK) hiçbir şey duyurmaz.

**Hangi modlarda bu karar geçerli?** SADECE Frekans Çakışması — grep ile
doğrulandı, `#cakismaBefore`/`#cakismaAfter`/`#cakismaCompare` SADECE bu
modda var (`app.js:415-417`, `index.html:583-585`), başka HİÇBİR modda
"önce/sonra" karşılaştırma UI'ı YOK. Yani bu KISITLAMA cakisma'ya ÖZGÜ ama
"await edilmiyor" (`app.js:5630`) mimari farkı da cakisma'ya özgü — İKİSİ
BİRLİKTE cakisma'nın stage-3 sorularında (10 soruluk bir Bölüm'ün SON 4
sorusu) örtüşmeyi YAPISAL olarak MÜMKÜN kılıyor, diğer 8 tek-kaynaklı modda
ise (OLCUM-SES-BIRIKME'nin ölçtüğü gibi) ölçülen örtüşme submitXGuess()'in
HER ZAMAN stopAudio() çağırmasına RAĞMEN var — yani o modlardaki örtüşme
"kasıtlı skip" YÜZÜNDEN değil, `startRound()`/`playQuestion()`'ın hiçbir
zaman birbirini `await` etmemesinden (mod-agnostik, TÜM modlarda aynı)
kaynaklanıyor.

**Düzeltme yolu:** ÜRÜN KARARI gerekiyor — "önce/sonra" özelliği (a)
KORUNUR, örtüşme cakisma'nın stage-3'ünde KABUL EDİLİR (mevcut durum), ya da
(b) "önce/sonra" farklı bir mekanizmaya taşınır (örn. `stopAudio()` ÇAĞRILIR
ama "Önce"/"Sonra" butonları AYRI, KÜÇÜK bir preview-chain kurar — G267'nin
`playThreeWaySpecific()`'inin yaptığına benzer, seamless olmayan bir
yeniden-kurma), ya da (c) sadece `playQuestion()`'ın `await` EDİLMEMESİ
(tüm modlarda ortak kök) düzeltilir — bu TEK BAŞINA "önce/sonra"yı BOZMAZ
(stage-3'ün KENDİ skip kararına dokunmaz), sadece soru-GEÇİŞLERİNDEKİ
(stage 1/2→sonraki soru, ya da stage 3→stage 3 arası KENDİ chain-build'in
stopAudio()'sunun ÇALIŞMASINI beklemeden ikinci bir build'in başlamasını)
race penceresini daraltır.

---

### A5) Tonal Denge XP — TASARIM (kod DEĞİŞTİRİLMEDİ, sadece mevcut durum belgelendi)

**Şu an kısmi doğru veriliyor mu?** **HAYIR.** `calculateXP()`
(`tonal-denge.js:452`) satır 453: `if (!result || !result.correct) return 0;`
— **BİNARY kapı.** `result.correct` (`evaluateAnswer`, satır 432-444)
TÜM 4 bandın **ORTALAMA** sapması (`avgDeviation`) tolerans içindeyse
`true` — yani "1 bandı MÜKEMMEL, 3 bandı HİÇ dokunmadı" gibi bir cevap,
ortalama YÜKSEK sapma ürettiği için `correct=false` olur ve **XP=0**, kaç
bandın doğru olduğundan BAĞIMSIZ. Bu, Logic'in "4 bandı tek seferde yapan
çıkmaz, o bölümde seviye atlayan olmaz" gözlemiyle TAM örtüşüyor.

**Hassasiyet çarpanı (proximityBoost, 0.55×-1.0×) nasıl çalışıyor?**
`proximityBoost = Math.max(0.55, proximityScore/100)` (satır 464) —
`proximityScore` (`evaluateAnswer`, satır 440) `avgDeviation`'ın
`PROXIMITY_MAX_DEVIATION_DB=12`'ye göre TERS orantılı bir ölçeği (0-100).
**AMA bu çarpan SADECE `result.correct===true` İKEN devreye giriyor**
(satır 453'ün binary kapısından SONRA) — yani "kısmi doğruluk" DEĞİL,
"zaten-doğru-sayılan bir cevabın NE KADAR mükemmel olduğu" ölçüsü. Taban
%55, tavan %100 — "doğru" sayılan en kötü cevap bile tam XP'nin en az
%55'ini alır, ama BU eşiğin ALTINDA (yanlış sayılan) bir cevap SIFIR alır.

**Logic'in istediği yapı (1 bant 15, 2 bant 35, 3 bant 75, 4 bant 100)
mevcut sisteme nasıl oturur?** **OTURMAZ — mimari bir değişim gerekir.**
Mevcut `evaluateAnswer()` her bandı `deviations` dizisinde AYRI AYRI tutuyor
(`{id, correction, residualDb, deviation}`, satır 434-438) — yani PER-BAND
veri ZATEN VAR, sadece `correct`/`calculateXP` bunu KULLANMIYOR (sadece
ORTALAMASINI kullanıyor). Logic'in istediği yapı için EK olarak: (1) her
bandın KENDİ toleransı içinde olup olmadığını AYRI AYRI değerlendiren bir
`perBandCorrect` (`deviation <= tolerance`) hesaplanmalı, (2) doğru bant
SAYISI (`correctBandCount`) çıkarılmalı, (3) `calculateXP` bu sayıya göre
(15/35/75/100 gibi bir tablo, ya da bir formül) XP dönmeli — `result.correct`
alanının ANLAMI da muhtemelen DEĞİŞMELİ ("kaç bant" bilgisini taşıyacak
şekilde) — bu SADECE `calculateXP`'nin İÇİNİ değil, `evaluateAnswer`'ın
DÖNÜŞ ŞEKLİNİ ve muhtemelen "correct" kavramının seviye-atlama/istatistik
tarafındaki (stats.correct++ vb.) KULLANIMINI da etkiler — **ÜRÜN KARARI +
orta ölçekli bir refactor**, bu turun kapsamı DIŞINDA, kod YAZILMADI.

---

## BÖLÜM B — Bağlantı ve kök

### B1) Ortak kök var mı?

**EVET, A1 ve A2 için TEK bir nokta:** `enterMode()`'un "aynı moda dönüşte
UI sıfırlaması atlanır" optimizasyonu (`app.js:2807-2940`) + üç "Ana Ekran"
handler'ının (`app.js:3176/3193/3218`) `pauseRound()`'u atlaması — İKİSİ
AYRI AYRI zararsız (biri makul bir performans optimizasyonu, diğeri "sadece
state temizle, UI'a dokunma" gibi görünen bir tercih) ama BİRLİKTE, AYNI
modda kalıp exam/telafi ekranından "Ana Ekran"la çıkan kullanıcı için, HİÇBİR
sıfırlama YOLU KALMIYOR. **A4 (hızlı cevap örtüşmesi) FARKLI, BAĞIMSIZ bir
kök** — `playQuestion()`'ın await-etmemesi + cakisma'nın stage-3 skip'i,
`enterMode()`/exam-screen ile HİÇ ilgisi yok. **Beş ayrı yama yerine: A1/A2
İÇİN TEK bir yama (üç handler'a pauseRound() eklemek) YETERLİ olabilir.**

### B2) Bugünkü değişiklikler birbirini çürüttü mü?

**Doğrudan biri diğerini BOZMADI — ama G300'ün "tarama" kapsamı EKSİK
kaldı, bu turun BULDUĞU asıl şey bu:**
- G84 (eski) → `showExamScreen()`'in üç ekranını (passed/failed/makeup)
  KURDU, "Ana Ekran" o zamandan beri var.
- G287 (`b8e9067`, dün) → performExit()'in `activeQuestion=null`/
  `clearInProgressRound()` eksikliğini KEŞFETTİ ve DÜZELTTİ — üç
  showExamScreen handler'ını da AYNI iki satırla GÜNCELLEDİ (`state`
  temizliği tutarlı hâle geldi) ama `pauseRound()`'u (UI temizliği)
  HİÇBİRİNE eklemedi — bu G287'nin KENDİ kapsam sınırı, sonradan
  fark edilmedi.
- G300 (bugün, bu OTURUM) → `performExit()`/`quitGameBtn`'e `stopAudio()`
  ekledi, "AYNI KALIP başka yerde var mı?" diye TARADI ve üç
  showExamScreen handler'ını BULDU — ama **SADECE SES açısından**
  kontrol edip "submitThreeWayGuess() zaten stopAudio() çağırıyor,
  GÜVENLİ" diye İŞARETLEDİ. Bu değerlendirme SES için DOĞRUYDU ama
  **UI/state temizliği (pauseRound()'un DİĞER görevleri) hiç
  SORULMADI** — A1'in bulduğu asıl eksik BU.

**Sonuç: bir commit diğerinin VARSAYIMINI bozmadı — G300'ün KENDİ taraması,
"stopAudio() var mı" sorusuna DAR bir yanıt aradığı için, AYNI üç
handler'daki DAHA GENİŞ bir eksiği (pauseRound()'un TÜMÜ) kaçırdı.**

### B3) Cihaz-ölçüm uyuşmazlığı ⚠️

**Bu turda YENİ, somut bir aday bulundu ama TAM eşleşme DEĞİL — dikkatle
okunmalı:**

G300'ün kendi ölçümünde (`OLCUM-CIHAZ3-18-08`/G300 commit mesajı) "çıkışta
ses durmuyor" senaryosu SADECE `#backBtn`→`#exitConfirmLeave` ve
`#quitGameBtn` yollarıyla test edilmişti — **bu turda BULUNAN üçüncü/
dördüncü/beşinci "Ana Ekran" kapısı (showExamScreen'in passed/failed/makeup
ekranları) HİÇ test edilmemiş.** Eğer kullanıcının cihaz testi sınav/telafi
SONUCUNU (passed/failed) ya da telafi BAŞLANGICINI (makeup) görüp "Ana
Ekran"a bastıysa, VE o an cakisma'nın stage-3'ündeyse (stopAudio ATLANMIŞ,
ses HÂLÂ çalıyor) — bu handler `stopAudio()` çağırmadığı için ses GERÇEKTEN
durmaz. **BU KOMBİNASYON (sınav/telafi sonuç ekranı + cakisma stage 3) BU
TURDA Playwright'ta TEST EDİLMEDİ** (zaman kısıtı) — güçlü bir ADAY ama
KANITLANMIŞ değil, **BELİRSİZ** olarak işaretleniyor.

**Ama dikkat:** A1'in KENDİ raporu "Ses çalmıyor" diyor (sesin DURMAMASI
değil, hiç BAŞLAMAMASI) — yani A1/B3 AYNI ŞEY DEĞİL, TERS yönde iki farklı
semptom. B3'ün ("G300 tutmadı, ses duruyor... hayır DURMUYOR" — çıkışta
kalıcı ses) en olası İKİ açıklaması hâlâ: (1) OLCUM-SES-BIRIKME-18-08'in
ölçtüğü OYNANIŞ-SIRASI örtüşmesi (RMS gerçek, sınırlı ama duyulabilir), (2)
YUKARIDAKİ, bu turda BULUNAN ama TEST EDİLMEMİŞ beşinci-kapı+stage-3
kombinasyonu. **İkisi de olası, hiçbiri KESİN doğrulanmadı — cihazda
GERÇEK bir tekrar üretim (hangi ekrandan/hangi butona basılarak çıkıldığı
NET biçimde not edilerek) olmadan kesinleşmez.**

### B4) Sınav ekranından çıkış hangi buton?

**BEŞİNCİ BİR KAPI, doğrulandı.** G287/G300'ün dokunduğu 4 nokta:
`performExit()` (`#backBtn`→onay), `quitGameBtn` (Ayarlar→"Oyundan çık"),
ve showExamScreen'in "announce/offer" dalının "Sonra" butonu (ki bu AYRI —
`ctx.source==="offer"` iken menüye DEĞİL, oyuna GERİ dönüyor, `app.js:3140`).
**"passed"/"failed"/"makeup" ekranlarının "Ana Ekran" butonu (`3176`/`3193`/
`3218`) bunların HİÇBİRİ DEĞİL — BEŞİNCİ, AYRI bir çıkış noktası,** G287'de
state-temizliği alması DIŞINDA G300'e kadar (ve G300'de de) hiç
`pauseRound()`/ekstra bir dokunuş almadı.

---

## BÖLÜM C — Dokunuldu ama hiç görülmedi (bu turda doğrulandı)

**Yöntem:** `npm test` (1630/1630) + `npm run test:e2e` (128/128, TAM YEŞİL —
tek istisna: `ear-buttons.spec.mjs`'in Frekans Çakışması Aşama 3 testi TAM
paket koşulurken 1 kez zamanlamaya bağlı flake verdi, İZOLE çalıştırıldığında
9/9 YEŞİL — bu oturumun ÖNCEKİ turlarında da AYNI dosya AYNI şekilde
flake verdiği zaten belgelenmişti, gerçek bir regresyon DEĞİL).

| Madde | Test dosyası | Sonuç |
|---|---|---|
| **C1** Kulak butonları (8 mod) | `ear-buttons.spec.mjs` | ✅ 9/9 (izole) |
| **C2** Tekrar önleme (4 mod) | `repeat-guard.spec.mjs` + `test/repeat-guard-scope.test.mjs` | ✅ 2/2 e2e + unit paketi yeşil |
| **C3** Yorum isteme — KARAR MANTIĞI | `review-request.spec.mjs` | ✅ 2/2 — **AMA bkz. aşağıdaki uyarı** |
| **C4** Günlük görev sayacı | `daily-quest-counter.spec.mjs` | ✅ 2/2 |
| **C5** Hata analizi kaydı (12 mod + 200 limit) | `answer-history.spec.mjs` + `test/answer-history.test.mjs` | ✅ 12 mod TEK TEK + genel testler yeşil |
| **C6** İlerleme özet satırları | `progress-summary-collapsed.spec.mjs` | ✅ 4/4 |
| **C7** Bozuk dosya reddi | `corrupt-file-upload.spec.mjs` | ✅ (regresyon testi dahil) |
| **C8** Reverb tur süresi + XP | `reverb-round-duration.spec.mjs` + `reverb-peak.spec.mjs` + `reverb-loop-interval.spec.mjs` | ✅ tümü yeşil |
| **C9** Vokal 2 kaynağı (12 mod) | `vocal1-source.spec.mjs` | ✅ 4/4 |

**⚠️ C3 için ÖNEMLİ sınır:** bu testler SADECE JS-tarafı KARAR mantığını
(`maybeRequestStoreReview()`'un "tetiklenmeli mi" hesaplamasını) doğruluyor
— **native App Store yorum PENCERESİNİN GERÇEKTEN açıldığını DOĞRULAMIYOR**
(bu, `@capacitor-community` bir native köprü çağrısı, tarayıcıda
test EDİLEMEZ). Logic'in "sınav geçti, pencere çıkmadı" gözlemi native
tarafla (iOS'un KENDİ `SKStoreReviewController` gösterim sıklığı
sınırlaması dahil — Apple bunu App SEVİYESİNDE, kodun kontrolü DIŞINDA
haftada birkaç kez ile sınırlıyor) ilgili olabilir — **BELİRSİZ, bu
turda native taraf HİÇ test edilmedi/edilemedi.**

---

## Özet

**1. Ortak kök var mı — varsa hangisi:**
A1+A2 → EVET, TEK kök: `enterMode()`'un aynı-mod-atla optimizasyonu +
showExamScreen'in 3 "Ana Ekran" handler'ının `pauseRound()` eksikliği
(`app.js:2807-2940` + `3176/3193/3218`). A4 → AYRI, bağımsız kök (cakisma'nın
await-etmeyen playQuestion + BİLEREK skip edilen stage-3 stopAudio'su). A3 →
kök zaten G302'de doğru tanımlanmış, bu SEFER anlaşmazlık ÖLÇÜM değil KRİTER/
kulak. B3 → YENİ bir aday (beşinci kapı + cakisma stage-3 kombinasyonu)
bulundu ama KANITLANMADI.

**2. Düzeltme sırası önerisi:**
1) A1/A2'nin ortak kökü (3 handler'a `pauseRound()` eklemek) — EN UCUZ, EN
   GENİŞ etkili, B3'ün beşinci-kapı adayını da AYRICA kapatır (pauseRound
   zaten `stopAudio()` çağırmaz ama en azından `muteOutput()`'la SESİ
   susturur — TAM G300-seviyesi bir `stopAudio()` de ayrıca eklenmeli, aynı
   commit'te, G300'ün deseniyle).
2) A3 — kod değişikliği YOK, önce Logic'in kulak kararı gerekiyor.
3) A4 — ÜRÜN KARARI gerekiyor ("önce/sonra" korunsun mu, nasıl).
4) A5 — orta ölçekli refactor, ayrı bir GÖREV olarak planlanmalı.

**3. Çalıştığı doğrulananlar (Bölüm C, temiz çıkanlar):** C1, C2, C4, C5,
C6, C7, C8, C9 — TAMAMI teknik/JS seviyesinde YEŞİL. C3 SADECE JS karar
mantığı seviyesinde yeşil, native pencerenin gerçekten göründüğü bu turda
DOĞRULANAMADI.

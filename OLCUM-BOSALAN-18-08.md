# OLCUM-BOSALAN-18-08

Ölçüm görevi. Kod YAZILMADI, dosya DEĞİŞTİRİLMEDİ, commit ATILMADI —
`git status --short` bu turun SONUNDA sadece `OLCUM-SIMULATOR-18-08.md`/
`OLCUM-UC-18-08.md` (önceki turlar) dışında değişiklik göstermiyor.

**⚠️ ÖNCE BU — OLCUM-SIMULATOR-18-08'in kendi kendini düzeltmesi:** O
raporun "diğer 11 mod etkilenmiyor" sonucu **YANLIŞTI — ölçüm eksikti,
kod hatası değil.** O ölçüm SADECE `#gameSpectrumControls`'ün (play/
ipucu/döngü sırası) görünürlüğünü kontrol etti; cevap şıklarının/
kartlarının (`.ans`) görünürlüğünü HİÇ ölçmedi. Bu turda o ölçüm
TAMAMLANDI — sonuç: **12 modun 11'i** SE'de (kartsız Frekans Bulma
Dokunmalı DAHİL, kendi kontrol-sırası semptomuyla) etkileniyor, SADECE
Tonal Denge'nin BU spesifik semptomu (kart kesilmesi) YOK (kendi, AYRI,
zaten bilinen bir taşma sorunu VAR — aşağıda). Logic'in "tersini gördüm"
notu DOĞRU ÇIKTI. Metodoloji notu: bu, `git log -S` taramasının
G149/G150'yi bulmasıyla BAĞLANTILI bir örüntü — bkz. Madde A.

---

# A) GEÇMİŞ — bu sorun daha önce yaşandı mı

## Evet — BİREBİR aynı semptom, iki tur önce (12 Ağustos 2026)

`git log --oneline -i --grep="taşma\|actionbar\|kesiliyor"` taraması:

- **`45992c5` G149** — "Frekans Bulma Şıklı modda soru başlığı düzeltildi;
  **3. şık taşması kök nedeniyle raporlandı**" (teşhis/ölçüm turu).
- **`63ef0f7` G150** — "**Frekans Bulma Şıklı modda 3. şık artık
  kaydırmadan sığıyor**" (düzeltme turu).

Task'ın kendi tarifiyle ("Şıklı formatta: 3. şık kesiliyor") KELİMESİ
KELİMESİNE aynı şikayet.

## Düzeltme (G150) ne yaptı — dosya:satır

`www/styles.css:112` — yeni `--actionbar-h-compact:92px` (mevcut
`--actionbar-h:168px`'e — G73 kuralı gereği DOKUNULMADI — İKİNCİ, KOŞULLU
bir sabit). `www/styles.css:761` —
`#screen-game.actionbar-compact .game-scroll{margin-bottom:calc(var(--actionbar-h-compact) + env(safe-area-inset-bottom))}`.
`www/js/app.js:779-786` — `syncActionbarCompact()`: `#freqGuessArea`'nın
`.hidden` durumunu okuyup `#screen-game`'e `.actionbar-compact` sınıfını
senkron uyguluyor. İki çağrı noktası: `renderQuestion()`
(`app.js:3555` civarı) ve `#answerFormatSelect`'in "change" dinleyicisi.

**Mekanizma DOĞRU ve HÂLÂ ÇALIŞIYOR** — bu turun kendi ölçümü
(aşağıdaki tablo) `.actionbar-compact` sınıfının 8/12 modda GERÇEKTEN
uygulandığını, gerçek `.actionbar` yüksekliğini 168px'ten 81-92px'e
indirdiğini doğruluyor. **Kalıntı/ölü kod YOK** — `--actionbar-h-compact`
kullanılıyor, `syncActionbarCompact()` çağrılıyor.

## Düzeltme NEDEN sadece geniş ekranda işe yaradı — KANIT

G150'nin KENDİ commit mesajı: *"Playwright: 12 modun 11'inde round-aktif
durumda TAM doğrulandı ... G149/G150'de Playwright'le masaüstünde
ÖLÇÜLEN gerçek yükseklik 81px (**3 ayrı genişlikte: 375/390/430, hepsi
aynı**)"* — **SADECE GENİŞLİK test edildi, YÜKSEKLİK hiç değişkenlenmedi.**
DURUM.md'nin G150 kaydındaki asıl kabul kriteri: *"3 şık da
`getBoundingClientRect` `top>=0 && bottom<=844` ... `.game-scroll.
scrollHeight(672) <= clientHeight(672)`"* — **844/672, SE'nin 667px'i
DEĞİL.** `grep -rn "390, height: 844" e2e/*.spec.mjs` → **onlarca dosyada
tekrarlanan, e2e paketinin STANDART/VARSAYILAN viewport'u** (`390×844` —
iPhone 12/13/14 taban boyutu). **G150'nin "TAM doğrulandı" dediği
Playwright turu, SE'DEN 177px DAHA UZUN bir viewport'ta koşmuş** —
`--actionbar-h-compact:92px`'in kazandırdığı ~76px (168→92), 844
yükseklikte 3. şıkkı kurtarmaya YETERLİ oldu, ama SE'nin 667px'inde
(bu turda ÖLÇÜLDÜ) q-genisligi'de HÂLÂ **153px** taşma kalıyor —
G150'nin optimizasyonu GERÇEK ama SE için TEK BAŞINA YETERSİZ.

**Kendi dürüstlük notu bunu ÖNCEDEN işaretlemişti:** G150'nin commit
mesajının SON cümlesi — *"npm test: 1250/1250 ... **Cihazda henüz
doğrulanmadı.**"* — SE'de gerçek doğrulama hiç yapılmamış, bu turun
kendisi o eksik doğrulamayı TAMAMLIYOR (2 tur sonra, olumsuz sonuçla).

## Aynı sorunun başka örnekleri var mı — EVET

**`b2ad01e` G160** — "Tonal Denge taşma düzeltmesi" — AYNI genel
kategori (SE'nin kısıtlı yüksekliği + oyun ekranının sabit actionbar
rezervi), ama FARKLI kök sebep (`.tonal-slider`'ın `display:inline-block`
hayalet boşluğu). DURUM.md'nin KENDİ notu: *"scrollHeight 792 vs
clientHeight 672 ... G150 bunu KÖTÜLEŞTİRMEDİ, KISMEN İYİLEŞTİRDİ — TAM
ÇÖZÜM BU TURUN KAPSAMI DIŞINDA"* — yani Tonal Denge'nin KENDİ taşması
BİLEREK yarım bırakılmış, bu turda da (896px'te bile 11px kalıntı
taşma, `>> BOYUT VE TAŞMA` bölümüne bkz.) HÂLÂ TAM çözülmedi.

**Ana menüde de BENZER bir desen var** (DURUM.md, "Dar-ekran (`@media
max-width:420px`...) senaryosu" notu): o ölçüm turu GERÇEK `resize_window`
ile viewport GENİŞLİĞİNİ değiştiremediği için (masaüstü Chrome, 1728px'te
sabit kalmış) `.app-shell`'i GEÇİCİ olarak 375px'e SIKIŞTIRIP ölçmüş —
**YÜKSEKLİK hiç 667px'e indirilmemiş.** Bu, kod tabanı genelinde
tekrarlanan bir ÖRÜNTÜ: **dar GENİŞLİK (375-430px) sık test edildi, kısa
YÜKSEKLİK (667px, SE) neredeyse HİÇ test edilmedi** — e2e paketinin TEK
tip 390×844 viewport kullanması + masaüstü tarayıcı tabanlı ölçüm
turlarının "genişliği sıkıştır, yüksekliği SABİT bırak" alışkanlığı,
BİRLİKTE bu kör noktayı yaratmış.

---

# B) BOŞ ALAN NE İŞE YARIYOR

## Hangi element — GÖRSEL + DOM İNCELEMESİYLE BULUNDU

**Bu, tek bir "element" DEĞİL — bir RENDER BOŞLUĞU.**
`document.elementFromPoint()` bu bölgenin tam ortasında **`#screen-game`
(`<section>`) elementinin KENDİSİNİ** döndürüyor — yani orada AYRI bir
DOM düğümü YOK, `.game-scroll`'un klip sınırı (`overflow-y:auto`) ile
sabit `.actionbar`'ın (`position:fixed`) üst kenarı ARASINDA kalan,
`#screen-game`'in KENDİ (siyaha yakın, `rgb(12,13,15)` — `body`'den
miras) arka planının göründüğü BOŞ ARALIK.

## Neden var — ölçüldü, kesin sayılarla

`www/styles.css:97` — `--actionbar-h:168px` (SABİT, `.game-scroll`'un
`margin-bottom`'u bunu REZERVE eder, `styles.css:753`). Frekans Bulma
**Dokunmalı** formatta `#freqGuessArea` HER ZAMAN DOLU (`"Cevabını vermek
için spektruma dokun"`, `frekans-bulma.js:716`) — bu yüzden
`.actionbar-compact` (92px'lik küçük rezerv) HİÇ devreye girmiyor
(`syncActionbarCompact()`, `app.js:781`: `compact = freqGuessArea.
classList.contains("hidden")` → Dokunmalı'da HER ZAMAN `false`).
**Ölçülen GERÇEK `.actionbar` yüksekliği: 124px.** Rezerve edilen: 168px.
**Fark = 44px — BU, boş alanın KENDİSİ.**

## Hangi koşulda doluyor/boşalıyor — kod yolu izlendi

- **Dokunmalı format (Frekans Bulma, tek mod):** `#freqGuessArea` HER
  ZAMAN dolu → `.actionbar` 124px → rezerv 168px → **boşluk 44px.**
- **Şıklı format (11 mod, HER ZAMAN zorunlu — `isChoiceFormat()`,
  `app.js:1437-1439`):** `#freqGuessArea` boş/gizli →
  `.actionbar-compact` devrede → `.actionbar` 81px → rezerv 92px →
  **boşluk 11px** (küçük ama SIFIR DEĞİL — 92px'in KENDİSİ de G149'da
  ölçülen 81px'e ~12px güvenlik payıyla yuvarlanmıştı, `styles.css:98-111`
  notu).
- **M2 (Kompresör/Reverb/Distortion, "Bir kart seç" onay butonu):**
  `.actionbar` 161px → rezerv 168px (compact DEVRE DIŞI, 161px zaten
  168'e sığıyor) → **boşluk 7px.**

**Yani boşluk HİÇBİR formatta TAM SIFIR değil** — Dokunmalı'da (44px)
en büyük, Şıklı'da (11px)/M2'de (7px) küçük ama var. Task'ın "hiç
dolmuyor mu, nadir bir durumda mı" sorusuna cevap: **hiçbir zaman
"dolmuyor" — bu bir GERİ BİLDİRİM/UYARI/İPUCU ALANI DEĞİL, sadece bir
sabit-sayı REZERVASYON HATASI** (gerçek ihtiyaçtan büyük ayrılan pay).

## Boşken neden yer kaplıyor

Çünkü kaplayan "boş alan" aslında BİR ELEMENTİN yüksekliği DEĞİL —
`.game-scroll`'un `margin-bottom`'unun (SABİT `calc(--actionbar-h +
safe-area)`) `.actionbar`'ın GERÇEK içerik yüksekliğinden BÜYÜK olması.
`.game-scroll` bu fazladan payı "boş" bırakıyor (hiçbir içerik onu
doldurmaya ÇALIŞMIYOR), `.actionbar` (position:fixed, KENDİ yüksekliğine
göre) bu payın SADECE bir kısmını kaplıyor — ARADA kalan `#screen-game`'in
çıplak arka planı görünüyor.

---

# C) BOYUT VE TAŞMA — 12 MOD, İKİ FORMAT, TAM TABLO

**SE (375×667), `scrollTop=0`, tüm sayılar Playwright/WebKit ile
ölçüldü:**

| Mod | Format | `.game-scroll` taşma | actionbar (gerçek/rezerv/**boşluk**) | Kontrol sırası gizli | Son kart/şık gizli |
|---|---|---|---|---|---|
| **frekans-bulma** | Dokunmalı | **84px** | 124/168/**44px** | **64px (%94)** | (kart yok, canvas) |
| frekans-bulma | Şıklı | 136px | 81/92/11px | 0px | **116px (TAM gizli, 3/3 şık)** |
| kesim-noktasi | Şıklı (zorunlu) | 136px | 81/92/11px | 0px | **116px (TAM gizli)** |
| q-genisligi | Şıklı (zorunlu) | **153px** (EN KÖTÜ) | 81/92/11px | 0px | **133px (TAM gizli)** |
| boost-mu-cut-mu | Şıklı (zorunlu) | 86px | 81/92/11px | 0px | **66px (TAM gizli)** |
| db-seviyesi | Şıklı (zorunlu) | 47px | 81/92/11px | 0px | 27px (kısmi, 33/60px görünür) |
| stereo-genislik | Şıklı (zorunlu) | 117px | 81/92/11px | 0px | **97px (TAM gizli)** |
| pan-konumu | Şıklı (zorunlu) | 43px | 81/92/11px | 0px | 23px (kısmi, 35/58px görünür) |
| kompresor (M2) | Şıklı (zorunlu) | 75px | 161/168/7px | 0px | 55px (kısmi, 27/82px görünür — Kart C) |
| reverb (M2) | Şıklı (zorunlu) | 149px | 161/168/7px | 0px | **129px (TAM gizli — Kart C)** |
| tonal-denge | Şıklı (zorunlu) | **240px** (mutlak EN KÖTÜ) | 81/92/11px | 0px | (kart yok, kaydırıcı arayüz) |
| distortion (M2) | Şıklı (zorunlu) | 75px | 161/168/7px | 0px | 55px (kısmi, 27/82px görünür — Kart C) |
| frekans-cakismasi | Şıklı (zorunlu) | 122px | 81/92/11px | 0px | **102px (TAM gizli)** |

**Sonuç: 12 modun 10'unda 3. (son) şık/kart YA TAMAMEN gizli YA DA
%50'den fazlası gizli.** İSTİSNALAR: Tonal Denge (kartsız, kendi taşması
VAR ama bu semptomla ölçülemez) ve — kısmi görünürlükte olsalar da HÂLÂ
gerçek anlamda "kesik" olan db-seviyesi/pan-konumu/kompresor/distortion
(27-35px/58-82px görünür, yani şıkkın/kartın ALT YARISI kesik).

## Boş alan + "dokun" metni birlikte ne kadar (Dokunmalı, Frekans Bulma)

`#gameSpectrumControls` alanı (68px) + boş alan (44px) = **112px** —
Dokunmalı formatın 84px'lik TOPLAM taşmasından BÜYÜK (aşağıda Madde E'de
bunun ne anlama geldiği açıklanıyor: boşluğu KAPATMAK taşmayı FAZLASIYLA
kapatabilir, AMA kontrol sırasının GÖRÜNÜR OLMASI için TÜMÜNÜN
kapanması GEREKMEZ, kısmi kapanma bile yeterli olabilir — Madde E'de
kesin hesap var).

---

# D) HANGİ EKRANLARDA — 5 viewport, TAM eşik ölçüldü

⚠️ **Etiket notu:** Task'ın verdiği `375×812 "(11)"` eşleşmesi **GERÇEK
iPhone 11 boyutuyla UYUŞMUYOR** — iPhone 11 GERÇEKTE **414×896**'dır
(bu ölçüm de ayrıca test edildi). `375×812` aslında iPhone XS/11 Pro/
12 mini/13 mini'nin CSS boyutu. **Tahmin yürütülmedi** — task'ın verdiği
SAYI ölçüldü, etiket UYARILARAK kullanıldı.

| Viewport | Eşleşen cihaz (GERÇEK) | Sonuç (12 mod) |
|---|---|---|
| **375×667** | SE (1-3.gen) | 🔴 **11/12 mod etkilendi** (Tonal Denge hariç, o da AYRI taşıyor) |
| 375×812 | XS/11 Pro/12-13 mini (task "11" dedi, YANLIŞ eşleşme) | ✅ 12/12 temiz (Tonal Denge'nin KENDİ taşması 95px olarak sürüyor ama kart semptomu yok) |
| 393×852 | 14/15/16 Pro | ✅ 12/12 temiz (Tonal Denge 55px) |
| 414×896 | 11/XR/11 Pro Max/XS Max (GERÇEK "11") | ✅ 12/12 temiz (Tonal Denge 11px) |
| 430×932 | 14 Pro Max | ✅ 12/12 temiz (Tonal Denge de 0px) |

## Eşik — TAM olarak nerede (genişlik 375 sabit, yükseklik taranarak)

**En kötü mod (Frekans Bulma, Dokunmalı — kontrol sırası):**

| Yükseklik | Taşma | Kontrol sırası gizli |
|---|---|---|
| 667 | 84px | 64px 🔴 |
| 700 | 51px | 31px 🔴 |
| 720 | 31px | 11px 🔴 |
| **740** | 11px | **0px ✅ (eşik)** |
| 751 | 0px | 0px ✅ |

**En kötü şıklı mod (q-genisligi/reverb — son kart):**

| Yükseklik | Taşma | Son kart gizli |
|---|---|---|
| 667 | 153px | 133px 🔴 |
| 780 | 40px | 20px 🔴 |
| **800** | 20px | **0px ✅ (eşik)** |
| 850 | 0px | 0px ✅ |

**Genel eşik (12 modun HEPSİ temizleniyor): ~800px yükseklik (375px
genişlikte).** SE'nin 667px'i bu eşiğin **133px altında** — mevcut
Apple ürün gamında **667px yüksekliğe sahip TEK model SE**'dir (bu
ölçümde doğrudan test edilen diğer 4 boyutun HİÇBİRİ 800px eşiğinin
altında değil). Yani bu sorun fiilen **"sadece SE'de"** — task'ın kendi
gözlemiyle TUTARLI.

---

# E) ÇÖZÜM YOLLARI — hesaplandı (KOD YAZILMADI)

## Boş alan (44px, SADECE Dokunmalı) kaldırılırsa ne kırılır

**Muhtemelen HİÇBİR ŞEY** — `.actionbar-compact` mekanizması (G150)
ZATEN 11 modda ÇALIŞIYOR, sadece Dokunmalı format bunu KULLANMIYOR
(`syncActionbarCompact()`'ın `#freqGuessArea.hidden` kontrolü Dokunmalı'da
HER ZAMAN `false` döner). Dokunmalı'ya ÖZEL, `--actionbar-h-compact`'tan
(92px) FARKLI ÜÇÜNCÜ bir sabit (ölçülen gerçek 124px'e AYNI ~12% payla
~139px) eklenip Dokunmalı formatta O kullanılırsa: **44px'in ~29px'i
(168→139) geri kazanılır** — G150'nin AYNI, KANITLANMIŞ yöntemiyle
(yeni CSS sabiti + `app.js`'te bir `if` dalı, `getBoundingClientRect`/
`ResizeObserver` YOK) — DÜŞÜK RİSK, AMA TEK BAŞINA YETERSİZ (aşağıda).

## "Cevabını vermek için dokunun" küçültülebilir mi

Metnin KENDİSİ `.actionbar`'ın 124px'lik gerçek yüksekliğinin bir
kısmını oluşturuyor (padding-top 12 + metin bloğu + margin + `#nextBtn`
56 + padding-bottom). Şıklı formatta bu metin YOK ve `.actionbar`
81px'e iniyor — **fark ~43px, YAKLAŞIK metnin kendi payı.** Metin daha
kısa bir cümleye ("Spektruma dokun" gibi) indirilir/tek satıra
sıkıştırılırsa BİR MİKTAR kazanç olur ama TAM 43px'in kazanılması İÇİN
muhtemelen metnin TAMAMEN kaldırılması (ki bu bir UX/erişilebilirlik
kararı — ilk kez oynayan kullanıcı "spektruma dokun" bilgisini BAŞKA
NEREDEN alacak, `index.html:406-410`'un notu: bu metin zaten DAHA UZUN
bir açıklamanın YERİNE geçmişti) gerekir — **ÜRÜN KARARI, kod riski
DÜŞÜK ama İÇERİK/erişilebilirlik riski VAR.**

## İkisi birlikte ne kadar açar — taşmayı ÇÖZER Mİ (hesaplandı)

**Frekans Bulma (Dokunmalı) — EVET, ÇÖZEBİLİR:** Boşluk-fix (~29px) +
metin TAMAMEN kaldırılırsa `.actionbar` ~81px'e iner (diğer modlarla
AYNI) → rezerv de 92px'e inebilir → toplam kazanç 168-92=**76px** —
Dokunmalı'nın **84px'lik taşmasının %90'ı**, kontrol sırasının (64px
gizli) TAMAMEN kurtulması için YETERLİ (68px'lik satırın SADECE 64px'i
kurtarılması gerekiyordu). **Metin KISMEN kısaltılırsa (tam kaldırma
DEĞİL) kazanç 76px'ten AZ olur, tam kurtarma garantisi YOK — bu ölçüm
metnin TAM kaldırılması senaryosunu hesaplıyor, kısmi kısaltmanın kesin
etkisi ÖLÇÜLMEDİ.**

**Diğer 8 "her zaman şıklı" mod — HAYIR, ÇÖZMEZ:** Bu modlar ZATEN
`.actionbar-compact`'ı (81/92px, boşluk sadece 11px) KULLANIYOR — boş-
alan fixi burada UYGULANAMAZ (zaten uygulanmış durumda) ve "dokunun"
metni bu modlarda zaten YOK. Bu modların 47-153px'lik taşması **başka
bir yerden geliyor** — bu turda `q-genisligi` için parçalandı (SE'de,
`scrollTop=0`):

| Parça | Yükseklik |
|---|---|
| Çip satırı (Kaynak/Karıştır) | 44px |
| Soru başlığı (`#questionTitle`) | 64px |
| Analizör kartı (Şıklı, kompakt) | 277px |
| Kontrol sırası | 68px |
| Cevap şıkları (3 satır) | 125px |
| **Toplam içerik + boşluklar** | **648px (scrollHeight)** |
| Kullanılabilir alan (`clientHeight`) | 495px |
| **Taşma** | **153px** |

**Bu 153px'in HİÇBİRİ "boş"/gereksiz DEĞİL** — hepsi gerçek, görünmesi
gereken içerik (soru metni, analizör, şıklar). Boş-alan/metin fixi
BURADA hiç işe yaramaz (zaten sıfıra yakın boşluk var) — gerçek düzeltme
bu İÇERİKLERİN (analizör 277px, çip satırı 44px, şık grid'i 125px)
KENDİSİNİN küçültülmesini gerektirir — **daha büyük kapsamlı, ORTA-
YÜKSEK riskli bir iş** (her modun kendi analizör/grid boyutu ayrı ayrı
gözden geçirilmeli).

**M2 modları (Kompresör/Reverb/Distortion) — KISMEN:** Boşluk sadece
7px (zaten neredeyse optimal), ama Kart C 55-129px gizli — üç kartlı
`.ans-m2` listesinin KENDİSİ (her kart ~82px, 3 kart + gap ~270px+)
SE'de sığmıyor; kart yüksekliği küçültülmeden ÇÖZÜLEMEZ.

## Geniş ekranlarda düzen bozulur mu

**Boş-alan fixi (Dokunmalı'ya özel 3. sabit ekleme):** HAYIR — G150'nin
AYNI deseni (mevcut `--actionbar-h`/`--actionbar-h-compact` İKİLİSİNE
üçüncü bir KOŞULLU sabit eklemek, VAR OLAN ikisine DOKUNMADAN) diğer
formatları/genişlikleri ETKİLEMEZ, sadece Dokunmalı formatın KENDİ
rezervini küçültür — geniş ekranlarda zaten taşma YOK, küçülen rezerv
sadece FAZLADAN boş alanı azaltır (görsel olarak İYİLEŞTİRME, bozulma
DEĞİL).

**Analizör/çip/grid küçültme (8 mod için gereken asıl düzeltme):** Bu
EVET risk taşır — `resizeCanvas()` ile senkron olmalı (analizör
boyutu DEĞİŞİRSE canvas'ın piksel tamponu YENİDEN ölçülmezse eski/yanlış
boyutta çizim kalır, G83'ün BİLİNEN dersi), dokunma hedefi boyutları
(Apple HIG 44×44 min) AYRICA doğrulanmalı, geniş ekranlarda GEREKSİZ bir
küçülme kullanıcı deneyimini KÖTÜLEŞTİRMEMESİ için `@media (max-height:
...)` gibi YÜKSEKLİK-duyarlı bir sorguya BAĞLANMALI (sadece SE gibi kısa
ekranlarda devreye girsin, 800px+ yükseklikte ESKİ/geniş boyutlar
korunsun) — **ORTA-YÜKSEK risk, kapsamlı test gerektirir.**

---

# ÇIKTI ÖZETİ

| Soru | Cevap |
|---|---|
| Daha önce oldu mu | **EVET** — G149/G150 (`45992c5`/`63ef0f7`), BİREBİR aynı "3. şık kesiliyor" şikayeti |
| Düzeltme neden yetersiz kaldı | G150'nin KENDİ doğrulaması **390×844**'te yapıldı (e2e paketinin standart viewport'u), SE'nin **667px**'i HİÇ test edilmedi — commit'in kendi notu "Cihazda henüz doğrulanmadı" |
| Kalıntı var mı | HAYIR, mekanizma (`--actionbar-h-compact`/`.actionbar-compact`) SAĞLAM ve ÇALIŞIYOR — sadece Dokunmalı formatta KULLANILMIYOR |
| Boş alan nedir | AYRI bir element DEĞİL — `.game-scroll`'un REZERVE ettiği pay (168px) ile `.actionbar`'ın GERÇEK yüksekliği (124px Dokunmalı'da) arasındaki **44px fark** |
| 12 modun kaçı etkileniyor | **11/12** (SADECE Tonal Denge'nin BU semptomu yok, kendi AYRI taşması var) — Logic'in raporu DOĞRU, önceki ölçüm EKSİKTİ |
| Eşik nerede | **375px genişlikte ~800px yükseklik** — SE'nin 667px'i 133px altında, diğer TÜM test edilen boyutlar (812/852/896/932) eşiğin üstünde |
| Boş-alan fixi taşmayı çözer mi | Frekans Bulma (Dokunmalı) için **EVET, neredeyse tamamen** (76/84px); diğer 8 "her zaman şıklı" mod için **HAYIR** (taşmaları başka yerden — gerçek içerik yüksekliğinden — geliyor) |

Kod yazılmadı. Bu tur sadece ölçüm.

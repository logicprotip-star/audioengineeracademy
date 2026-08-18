# OLCUM-SIMULATOR-18-08

Ölçüm görevi. Kod YAZILMADI, dosya DEĞİŞTİRİLMEDİ, commit ATILMADI —
`git status --short` bu turun SONUNDA da `OLCUM-UC-18-08.md` (önceki
tur, bu turdan BAĞIMSIZ) dışında değişiklik göstermiyor.

**Yöntem:** Kaynak kod okuması (index.html/styles.css/app.js/
frekans-bulma.js) + Playwright, GERÇEK viewport boyutlarıyla, HEM
Chromium HEM WebKit motorunda (WebKit — Playwright'ın masaüstü Safari
motoru, gerçek iOS Simülatörünün WKWebView'ından FARKLI bir motor ama
Chromium'dan daha yakın bir yaklaşıklık; DÜRÜSTLÜK NOTU altta). Sunucu:
`python3 -m http.server` ile `www/` kökünden servis edildi.

---

# A) SE'DE OYUN KONTROLLERİ KESİLİYOR 🔴

## Sonuç (özet)

**DOĞRULANDI — ama SADECE Frekans Bulma'nın VARSAYILAN (Dokunmalı)
formatında ve SADECE SE boyutunda.** Diğer 11 mod ZORUNLU olarak "şıklı"
formatta çalıştığı için (aşağıda ölçüldü) aynı derecede etkilenmiyor —
kontrol sırası onlarda TAMAMEN görünür kalıyor (taşma başka bir yerde,
cevap/geri-bildirim alanında oluşuyor). iPhone 11 ve "17 Pro" boyutunda
(bkz. BOYUT NOTU) hiçbir modda taşma YOK (Tonal Denge hariç, küçük bir
kalıntı — aşağıda ayrı not).

## Oyun ekranının dikey yerleşimi — ÖLÇÜLDÜ

`.app-shell` (`www/styles.css:210`) `height:var(--app-vh)` alır —
`--app-vh` `index.html:23`'teki senkron script'in yazdığı GERÇEK
`window.innerHeight` (100dvh DEĞİL — WKWebView farkı için, bkz. o
dosyanın G-notu). `.screen` (`styles.css:318`) `height:100%` ile bu
kutuyu doldurur, `display:flex;flex-direction:column`. İçinde İKİ
parça: `.ghead` (`flex:none`, sabit — `styles.css:509`) + `.game-scroll`
(`.scroll`'dan miras, `flex:1;min-height:0;overflow-y:auto` —
`styles.css:329`, kendi ek kuralları `styles.css:752`).

**Yani: flex sütun, `.ghead` SABİT yükseklik, `.game-scroll` ESNEYEN
(kalan alanı dolduran) VE kendi içinde bağımsız kaydırılabilen kutu.**
`#gameSpectrumControls` (play/ipucu/döngü sırası, `index.html:478`)
`.game-scroll`'un İÇİNDE — spektrum kartının (`.card.analyzer`,
`index.html:446`) HEMEN ALTINDA, DOM sırasına göre.

## "Cevabı vermek için dokunun" alanı — kimlik + yükseklik ÖLÇÜLDÜ

Task'ın tarif ettiği metin BİREBİR: **"Cevabını vermek için spektruma
dokun"** — `www/js/modes/frekans-bulma.js:716`, `renderGuessAreaControls()`
(satır 708-721) içinde, SADECE `isChoice===false` (Dokunmalı format)
iken `#freqGuessArea`'ya yazılıyor. `#freqGuessArea` `index.html:641-649`'un
notuna göre `.game-scroll`'un İÇİNDE DEĞİL, SABİT konumlu alt
`.actionbar`'ın İÇİNDE (G78'de taşındı) — yani kullanıcının "siyah
çerçeve" dediği şey muhtemelen bu metin kutusu DEĞİL, hemen üstündeki
`.card.analyzer` (spektrum kartı, `bg:#0a0c0e` — GERÇEKTEN siyah,
`index.html:432-462` notu) — BELİRSİZ, kullanıcının tam neyi kastettiği
teyit edilmedi ama ALTINDA kalan öğe (`#gameSpectrumControls`) KESİN.

**Yükseklik kısaltılabilir mi?** `.actionbar` (`styles.css:1607`)
`position:fixed`, gerçek içerik yüksekliği `#freqGuessArea`'nın boş/dolu
oluşuna göre değişiyor — Dokunmalı formatta (metin dolu)
**GERÇEKTEN ÖLÇÜLEN yükseklik 124px**, ama `.game-scroll`'un ayırdığı
boşluk (`margin-bottom`) HER ZAMAN `--actionbar-h` (**168px sabit**,
`styles.css:97`) + safe-area — yani Dokunmalı formatta **44px FAZLADAN
boşluk rezerve ediliyor, gerçek ihtiyaçtan büyük.** (`--actionbar-h-compact`,
92px, SADECE `#freqGuessArea` boşken devreye giriyor — `syncActionbarCompact()`,
`app.js:779-786` — Dokunmalı formatta `#freqGuessArea` HER ZAMAN dolu
olduğu için bu daha küçük değer HİÇ kullanılmıyor.)

## SE yüksekliğinde (667px) hangi öğeler taşıyor — PLAYWRIGHT'TA ÖLÇÜLDÜ

Frekans Bulma, Dokunmalı format, `scrollTop=0` (kullanıcı henüz
kaydırmadan):

| Ölçü | Değer |
|---|---|
| `.game-scroll` scrollHeight | 503px |
| `.game-scroll` clientHeight (görünür alan) | 419px |
| **Taşma** | **84px** |
| `#gameSpectrumControls` yüksekliği | 68px |
| `#gameSpectrumControls`'ün GÖRÜNMEYEN (klip altında) kısmı | **64px** |
| `#gameSpectrumControls`'ün GÖRÜNEN kısmı | **4px (%6)** |

**%94'ü kesiliyor** — task'ın "altında kalıyor" tarifiyle BİREBİR
örtüşüyor.

## ⚠️ Önemli ikincil bulgu — tarayıcının kendiliğinden yaptığı kısmi kaydırma

`#startBtn`'e tıklandıktan ~50ms sonra `.game-scroll.scrollTop` KENDİLİĞİNDEN
**0'dan 62'ye** çıkıyor (bu davranış app.js'İN HİÇBİR SATIRINDAN gelmiyor —
`grep -n "scrollIntoView\|\.scrollTop\s*="` app.js'te SADECE 4 sonuç
verdi, hiçbiri bu senaryoyla eşleşmiyor: `app.js:807` `scrollFeedbackIntoView()`
SADECE şıklı formatta çağrılıyor, `app.js:2599`/`10479`/`10548`
SIFIRLIYOR, 62'YE ÇIKARMIYOR). **HEM Chromium HEM WebKit'te AYNI 62px**
ölçüldü — tıklanan/odaklanan `#startBtn`'in (round başlayınca layout
değiştiği için) tarayıcının KENDİ odak-görünürlük sezgisiyle görünüre
kaydırılması gibi görünüyor. Bu kaydırmadan SONRA `#gameSpectrumControls`'ün
sadece 2px'i kesili kalıyor (~%97 görünür) — yani EĞER bu davranış
GERÇEK cihazda/simülatörde de oluşuyorsa, sorun kullanıcının bildirdiği
kadar ağır olmayabilir.

**BELİRSİZ — DOĞRULANMADI:** Bu davranış (a) sentetik `page.click()`'in
GERÇEK bir parmak dokunuşuyla (touchstart/touchend) AYNI odak/kaydırma
semantiğini üretip ÜRETMEDİĞİ, (b) iOS WKWebView'in (gerçek Simülatör,
Capacitor içinde, chrome'suz) masaüstü WebKit'le AYNI odak-kaydırma
sezgisini paylaşıp PAYLAŞMADIĞI konusunda KANITLANMADI. **Kullanıcının
KENDİ raporu** ("ekranı yukarı kaydırmak gerekiyor") bu otomatik
kaydırmanın gerçek Simülatörde ya HİÇ olmadığını ya da YETERSİZ kaldığını
düşündürüyor — bu yüzden rapor, BU otomatik davranışa GÜVENMEDEN, altta
verilen kalıcı düzeltmeyi öneriyor.

## Hangi öğe sabit, hangisi esniyor

- **Sabit:** `.ghead` (`flex:none`, ölçülen yükseklik **80px**), 
  `.actionbar` (`position:fixed`, Dokunmalı formatta ölçülen **124px**),
  `--actionbar-h` REZERVE payı (**168px + safe-area**, `.game-scroll`'un
  `margin-bottom`'u — `styles.css:753`).
- **Esneyen:** `.game-scroll` (`flex:1;min-height:0`) — kalan TÜM alanı
  alır, içeriği KENDİ İÇİNDE `overflow-y:auto` ile kaydırır
  (`styles.css:329`).
- **İçerik (esnemeyen, sabit boyutlu kartlar):** `.card.analyzer`
  (Dokunmalı formatta ölçülen **341px** — SE'de TEK BAŞINA `.game-scroll`'un
  görünür alanının [419px] neredeyse TAMAMI), `#gameSpectrumControls`
  (**68px**).

## Güvenli alan (safe area) hesaba katılıyor mu

**Katılıyor** (`viewport-fit=cover` — `index.html:10` — + `env(safe-area-inset-*)`
CSS'te birden çok yerde: `.game-scroll` `margin-bottom`de, `.actionbar`
`padding-bottom`de, `.scroll` `padding-bottom`de) — AMA **Playwright/Chromium/WebKit
(masaüstü derlemeleri) `env(safe-area-inset-*)`'i HER ZAMAN 0 döndürür**,
gerçek bir çentik/Dynamic Island/home-indicator EMÜLE EDEMEZ. Bu ÖLÇÜMÜN
BİLİNEN SINIRI: **iPhone SE'nin KENDİSİ Touch ID/klasik kasa kullanıyor —
çentik/Dynamic Island YOK, home indicator YOK** — bu, SE için
`safe-area-inset-top/bottom`'un GERÇEK CİHAZDA DA 0 olduğu, YAYGIN BİLİNEN
bir donanım gerçeği (bu ölçümde DOĞRUDAN doğrulanmadı ama Apple'ın
kendi cihaz özellikleriyle TUTARLI) — yani **SE için bu ölçüm sınırı
pratikte önemli bir fark YARATMIYOR OLABİLİR**. iPhone 11/17 Pro
(çentik/Dynamic Island + home indicator VAR) için ise GERÇEK
safe-area-inset-bottom (~34px tahmini, TEYİT EDİLMEDİ) `--actionbar-h`'ın
ÜSTÜNE eklenecek — bu ölçümdeki "taşma=0" sonuçları bu iki cihaz için
GERÇEKTE biraz daha AZ boş alan bulacak (yaklaşık 34px daha az), ama
onlardaki BOŞ PAY (iPhone 11'de clientHeight=648, hiç taşma yok, SE'ye
göre 229px fazla alan) bunu fazlasıyla karşılıyor — BELİRSİZ ama
DÜŞÜK RİSKLİ.

## 12 modun hepsinde aynı sorun var mı — ÖLÇÜLDÜ (WebKit, SE, `scrollTop=0`)

| Mod | `.game-scroll` taşması | `#gameSpectrumControls` görünmeyen | Not |
|---|---|---|---|
| **frekans-bulma** | 84px | **64px (%94 gizli)** | 🔴 Dokunmalı (varsayılan) format |
| kesim-noktasi | 136px | 0px | Her zaman şıklı (isChoiceFormat zorunlu) |
| q-genisligi | 153px | 0px | Her zaman şıklı |
| boost-mu-cut-mu | 86px | 0px | Her zaman şıklı |
| db-seviyesi | 47px | 0px | Her zaman şıklı + BARE_ANALYZER (daha kısa kart) |
| stereo-genislik | 117px | 0px | Her zaman şıklı |
| pan-konumu | 43px | 0px | Her zaman şıklı + BARE_ANALYZER |
| kompresor | 75px | 0px | THREE_WAY → her zaman şıklı |
| reverb | 149px | 0px | THREE_WAY → her zaman şıklı |
| tonal-denge | 240px | 0px | THREE_WAY + COMPACT_ANALYZER, ama taşma EN BÜYÜK (çok-slider arayüzü) |
| distortion | 75px | 0px | THREE_WAY → her zaman şıklı |
| frekans-cakismasi | 122px | 0px | Her zaman şıklı |

**Sonuç: `#gameSpectrumControls`'ün kesilmesi SADECE Frekans Bulma'da,
SADECE Dokunmalı formatta oluyor.** Diğer 11 modun HEPSİ (kök sebep,
aşağıda) taşıyor ama taşma `.game-scroll`'un DAHA AŞAĞISINDA (cevap
şıkları/kaydırma ile ilgili, ayrı bir — daha az kritik, çünkü kullanıcı
zaten "aşağı kaydır" beklentisiyle bir cevap listesi görüyor — konu).

**Kök sebep (neden SADECE Frekans Bulma):** `isChoiceFormat()`
(`app.js:1437-1439`) **cutoff/dblevel/boostcut/qwidth/tonal-denge/
cakisma/pan/width VE her THREE_WAY soru için "şıklı"yı ZORLUYOR** —
kullanıcının Ayarlar'daki "Cevap Biçimi" seçimi bu 11 modda HİÇ
OKUNMUYOR. SADECE Frekans Bulma kullanıcının GERÇEK seçimini
(varsayılan: **"touch"**, `app.js:665`) okuyor. Doğrulanan İKİ yan
etki: (1) `.analyzer-choice` (şıklı formatta) spektrum kartını
KÜÇÜLTÜYOR (kod içi yorum, `app.js:1489`: "dokunmalı 252px, şıklı/kademeli
188px") — ölçülen tam kart yüksekliği Dokunmalı'da 341px, (2)
`isChoiceFormat()` TRUE iken `scrollFeedbackIntoView()` (`app.js:4302`,
`8133`) OTOMATİK ateşleniyor (Dokunmalı'da BİLEREK ateşlenmiyor — kod
yorumu `app.js:4297-4299`: "kullanıcının tıklaması gereken dalga/analizör
görünür kalmalı").

**Doğrulayıcı deney (aynı SE boyutunda, Frekans Bulma'nın KENDİSİ
Şıklı'ya çevrildiğinde):**

| | Dokunmalı (varsayılan) | Şıklı |
|---|---|---|
| `.actionbar` gerçek yüksekliği | 124px | 81px (`actionbar-compact` devrede) |
| `.game-scroll` taşması | 84px | 136px |
| `#gameSpectrumControls` görünmeyen | **64px** | **0px** |

Yani Frekans Bulma'yı Şıklı'ya çevirmek `#gameSpectrumControls`'ü
TAMAMEN kurtarıyor (taşma YİNE VAR ama daha aşağıda — cevap şıkları
alanında) — bu bir DÜZELTME YOLU DEĞİL (varsayılan davranışı bozar,
task'ın kapsamı dışı bir ürün kararı), sadece kök sebebi doğrulayan
bir deney.

## iPhone 11 ve "17 Pro"da var mı — ÖLÇÜLDÜ

**iPhone 11 (414×896):** TÜM 12 modda taşma **0px** — Tonal Denge
HARİÇ (**11px** taşma, ama `#gameSpectrumControls` YİNE tam görünür,
taşma başka yerde — muhtemelen çok sayıda düzeltme kaydırıcısı içeren
kendi kart yapısı, BU TUR AYRICA İNCELENMEDİ, kapsam dışı).

**"17 Pro" (393×852, ⚠️ BOYUT NOTU'na bkz.):** Aynı desen — Tonal Denge
**55px** taşma (diğer 11 mod 0px). SADECE Frekans Bulma'nın
`#gameSpectrumControls`'ü BU İKİ cihazda da her zaman **TAM görünür**.

## ⚠️ BOYUT NOTU — "iPhone 17 Pro" DOĞRULANMADI

Bu modelin TAM CSS viewport boyutu bu ortamda TEYİT EDİLEMEDİ (bilgi
kesme tarihi/erişim sınırı). Ölçümde **393×852** kullanıldı — 14/15/16
Pro serisiyle AYNI, YAKIN BİR TAHMİN, iPhone 17 Pro'nun GERÇEK değeri
FARKLI olabilir. **BELİRSİZ.** Sonuç YORUMU şuna dayanıyor: iPhone
11/17 Pro TAHMİNİ boyutunun İKİSİ DE SE'den (667px) ÖNEMLİ ÖLÇÜDE
yüksek (852-896px) — gerçek "17 Pro" değeri bu aralıkta KALDIĞI sürece
(makul, Apple'ın Pro-hattı hiçbir zaman 700px'in altına inmedi) sonuç
DEĞİŞMEZ; kullanıcının KENDİ cihaz teyidi (Ayarlar'dan ekran çözünürlüğü
ya da `window.innerHeight`'i konsoldan okuması) ile KESİNLEŞTİRİLMELİ.

## Düzeltme yolu (KOD YAZILMADI — sadece yön)

1. **En düşük riskli:** Dokunmalı formatta da `--actionbar-h-compact`
   (92px) kullanılabilecek bir ÜÇÜNCÜ, Dokunmalı'ya özel sabit
   eklenebilir (ölçülen gerçek `.actionbar` yüksekliği 124px, aynı
   `~12%` güvenlik payıyla ~139px'e yuvarlanabilir) — `--actionbar-h`'ın
   (168px, G73 kuralı, "DOKUNULMAYACAK") KENDİSİNE dokunmadan,
   `#screen-game`'e Dokunmalı-özel bir class eklenip `.game-scroll`
   `margin-bottom`'u o durumda küçültülebilir. Bu TEK BAŞINA **~29px**
   kazandırır (168→139) — 84px'lik taşmanın ~%35'i, YETERSİZ ama
   YARDIMCI.
2. **Muhtemelen gereken asıl düzeltme:** SE'de (`.card.analyzer`
   Dokunmalı formatta 341px — tek başına mevcut alanın (419px) %81'i)
   analizör kartının kendisi KISALTILMALI — ör. dar/kısa viewport'larda
   (`@media (max-height:...)`) SADECE Dokunmalı formatın kart
   yüksekliğini Şıklı'nın kullandığı 188px'e (ya da arada bir değere)
   indiren YENİ bir medya sorgusu. Bu, "Dokunmalı modda dalga/analizör
   görünür kalmalı" ilkesini (`app.js:4297-4299`) BOZMAZ — kart küçülür
   ama görünür KALIR, dokunma hedefi büyüklüğü ayrıca doğrulanmalı.
3. **Alternatif/tamamlayıcı:** `#gameSpectrumControls`'ün KENDİSİ
   Dokunmalı formatta `#freqGuessArea` gibi SABİT `.actionbar`'a
   taşınabilir (spektrumun HEMEN ALTI yerine, ekranın EN ALTI) — bu
   `index.html:464-477`'nin KENDİ notunun ("tasarımın kendi kararı,
   alt bara YAPIŞMIYOR") TERSİNE çevrilmesi, tasarım kararı gerektirir,
   ÜRÜN KARARI.
4. Auto-scroll'un GERÇEK simülatörde/cihazda çalışıp çalışmadığı
   `console.log(gameScroll.scrollTop)` ile TEK satırlık bir tanı
   koduyla doğrulanabilir — eğer GERÇEKTEN 62px'e yakın bir değere
   ulaşıyorsa (yukarıdaki ölçümdeki gibi), sorun BEKLENENDEN küçük
   olabilir; ulaşmıyorsa (0'da kalıyorsa), tarayıcı-motoru farkı
   TEYİT EDİLMİŞ olur.

**Risk:** Madde 1 düşük risk (sadece Dokunmalı formata özel yeni bir
class + sabit sayı, mevcut G73/G150 desenleriyle AYNI yöntem — DAHA
ÖNCE İKİ KEZ kullanılmış). Madde 2 orta risk (analizör boyut
değişikliği, canvas `resizeCanvas()` ile senkron olmalı, dokunma
hassasiyeti/hedef boyutu AYRICA test edilmeli). Madde 3 büyük/ürün
kararı gerektirir.

---

# B) ANA MENÜ TEK SÜTUN 🟡

## Sonuç (özet)

**Bu bir BUG DEĞİL — media query DOĞRU çalışıyor, sadece eşiği
(420px) test edilen ÜÇ simülatörün (375/393/414, hepsi ≤420) ÜÇÜNÜN DE
ALTINDA kalıyor.** Logic'in kendi cihazı (iPhone 14 Pro Max, **430px**
CSS genişlik) eşiğin ÜSTÜNDE — bu yüzden 2 sütun görüyor. Davranış
TUTARLI, "simülatörde farklı" değil, "test edilen simülatör modelleri
DAR" (breakpoint'in AŞAĞI tarafında).

## Mod kartları ızgarası — tanım ÖLÇÜLDÜ

`www/styles.css:377-379`:
```css
.mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:stretch}
.mode-grid.single{grid-template-columns:1fr}
@media (max-width:420px){.mode-grid{grid-template-columns:1fr}}
```
`#modeGrid` (`index.html:130`) `renderExerciseGrid()` (`app.js:3305`)
tarafından dolduruluyor — **JS HİÇBİR YERDE `.single` class'ını
eklemiyor/çıkarmıyor** (`grep -n "mode-grid\|modeGrid"` app.js'te
SADECE 3 sonuç: element referansı + iki `innerHTML`/`appendChild`
çağrısı — class manipülasyonu YOK). **TEK mekanizma media query.**
`.mode-grid.single` kuralı şu an **ÖLÜ KOD** (hiçbir JS yolundan
tetiklenmiyor) — muhtemelen ileride (ör. tek bir "Yakında" girdisi
kaldığında) kullanılmak üzere bırakılmış, DOĞRULANMADI.

## Hangi genişlikte tek sütuna düşüyor — TAM EŞİK ÖLÇÜLDÜ

Playwright (WebKit), `#modeGrid`'in GERÇEK `getComputedStyle().gridTemplateColumns`'ı:

| Genişlik | Karşılık gelen cihaz | Sütun |
|---|---|---|
| 375px | SE 1-3.gen, 12/13 mini | **1** |
| 390px | 12/13/14 (temel) | **1** |
| 393px | 14/15/16 Pro | **1** |
| 402px | 16 (temel, 2024) | **1** |
| 414px | 11, XR, 11 Pro Max, XS Max | **1** |
| 420px | (eşiğin TAM üzeri, dahil) | **1** |
| **421px** | (eşiğin tam altı) | **2** |
| 428px | 12/13 Pro Max | **2** |
| **430px** | **14/15/16 Plus, 14/15/16 Pro Max — Logic'in cihazı** | **2** |

**Eşik TAM OLARAK 420/421px'te** — CSS'in kendi tanımıyla birebir
(`max-width:420px`, dahil).

## Eşik mantıklı mı

**Fiili sonucu:** eşik, Apple'ın "temel/mini/Pro" (375-414px) hattını
1 sütuna, SADECE "Plus/Pro Max" (428-430px) hattını 2 sütuna ayırıyor.
Bu, RASTGELE bir sayı DEĞİL — 420, bu iki grup arasında GERÇEKTEN
boşlukta duran bir değer (414'ten büyük, 428'den küçük, ARADA hiçbir
gerçek iPhone modeli YOK) — yani teknik olarak "yanlış" bir eşik
DEĞİL, ama **kapsadığı cihaz sayısı dengesiz**: 1-sütuna düşen liste
(SE, mini, temel, Pro — 375-414px) MEVCUT iPhone hattının BÜYÜK
ÇOĞUNLUĞU, 2-sütuna düşen liste (SADECE Plus/Pro Max, 428-430px) AZINLIK.

## Simülatörde farklı davranmasının sebebi — ÖLÇÜLDÜ, TEK sebep bulundu

- **Piksel oranı (DPR):** ETKİSİ YOK — aynı CSS genişliğinde (390px)
  DPR=1/2/3 üçü de AYNI (1 sütun) sonucu verdi. Media query SADECE CSS
  px genişliğine bakıyor, cihazın fiziksel çözünürlüğüne/DPR'ına HİÇ
  bakmıyor (CSS `@media width` spesifikasyonunun standart davranışı).
- **Viewport meta:** `width=device-width` (`index.html:10`) CSS
  viewport genişliğini cihazın CSS-px genişliğine EŞİTLİYOR — ekstra
  bir küçültme/büyütme YOK, bu normal/beklenen davranış.
- **Safe area:** Portre modda `env(safe-area-inset-left/right)` TÜM
  iPhone'larda 0 (çentik/Dynamic Island ÜST'te, home indicator
  ALT'ta — YANLARDA hiçbir zaman güvenli-alan kesintisi yok) — grid
  GENİŞLİĞİNİ etkilemiyor.
- **TEK gerçek sebep: test edilen ÜÇ simülatör modelinin (SE/11/17 Pro
  yaklaşık) HEPSİ 420px eşiğinin AYNI (dar) tarafında.** Bu "simülatörün
  farklı davranması" DEĞİL — simülatörde SEÇİLEN cihazların hiçbiri
  Plus/Pro Max hattında değil.

## Kasıtlı mı, yanlış eşik mi — BELİRSİZ (kod tabanında kanıt YOK)

`git log --oneline -S "max-width:420px"` ve `-S ".mode-grid{"` — İKİSİ
DE SADECE TEK bir commit'e (`8476b91`, "feat: tasarım aktarımı, ayarlar
ve ilerleme ekranları") işaret ediyor — yani grid VE eşik AYNI ANDA,
İLK tasarım aktarım turunda geldi. Bu turdan SONRA (`DURUM.md`'de 3
ayrı `mode-grid` referansı var: hizalama düzeltmesi, `height:100%`
override, bir "dar-ekran senaryosu" testi notu — hiçbiri 420 DEĞERİNİN
KENDİSİNİ TARTIŞMIYOR/DEĞİŞTİRMİYOR) `DURUM.md`'de bu eşiğin NEDEN 420
seçildiğine dair bir kullanıcı kararı/tartışma kaydı BULUNAMADI.
`Dizayn/prototype.html` (CLAUDE.md'nin referans verdiği tasarım
kaynağı) bu ortamda MEVCUT DEĞİL (repoda yok) — eşiğin tasarım
aracından mı geldiği yoksa geliştirici tahmini mi olduğu da
DOĞRULANAMADI. **BELİRSİZ — kullanıcıya sorulmalı.**

## Düzeltme yolu (KOD YAZILMADI — sadece yön, İKİ SEÇENEK, ürün kararı gerektiriyor)

1. **Eşiği yükselt** (ör. `max-width:420px` → `max-width:400px` ya da
   daha da düşür) — 393/402/414px gibi "orta-geniş" modelleri de
   2-sütuna alır. Risk: 375px (SE/mini) genişliğinde 2×kart GERÇEKTEN
   sığar mı ÖLÇÜLMEDİ (bu turun kapsamı dışı — kart içeriği/padding'i
   AYRICA test edilmeli, "sığar" varsayımı YAPILMADI).
2. **Eşiği DÜŞÜR/hiç değiştirme, "kasıtlı" olarak belgele** — mevcut
   davranış KORUNUR, sadece DURUM.md'ye "SADECE Plus/Pro Max 2 sütun
   görür, kasıtlı" notu düşülür.
**Hangisi doğru — bu ölçüm KARAR VEREMEZ, ürün kararı.**

---

# ÇIKTI ÖZETİ

| Madde | Kök sebep | Dosya:satır | Hangi genişlik/yükseklikte | Düzeltme yolu | Risk |
|---|---|---|---|---|---|
| **A** 🔴 | Dokunmalı formatın (SADECE Frekans Bulma) analizör kartı (341px) + sabit 168px actionbar rezervi, SE'nin 667px'lik alanına (419px kullanılabilir `.game-scroll`) SIĞMIYOR — 84px taşma, kontrol sırasının %94'ü klip altında | `frekans-bulma.js:716` (metin), `app.js:1437-1439` (isChoiceFormat), `app.js:4297-4302` (bilerek-scroll-etmeme), `styles.css:97/752-761` (--actionbar-h, margin-bottom) | SADECE ≤~700px yükseklikte (SE, 667px) VE SADECE Dokunmalı formatta; iPhone 11 (896px)/17 Pro~ (852px) etkilenmiyor | Dokunmalı'ya özel kompakt actionbar sabiti (düşük risk) + kısa-viewport'ta analizör kartını küçültme (orta risk) | Düşük-orta |
| **B** 🟡 | `@media (max-width:420px)` eşiği test edilen 3 simülatörün (375/393~/414, hepsi ≤420) ÜÇÜNÜ DE kapsıyor; Logic'in cihazı (430px) eşiğin ÜSTÜNDE | `styles.css:379` (media query), `styles.css:377-378` (.mode-grid/.single — .single ÖLÜ KOD) | ≤420px genişlik (SE/mini/temel/Pro TÜMÜ) 1 sütun, ≥421px (Plus/Pro Max) 2 sütun — eşik TAM 420/421'de doğrulandı | Eşiği düşür (2 sütunu daha çok cihaza aç) YA DA mevcut davranışı kasıtlı olarak belgele — ÜRÜN KARARI | Değişirse orta (kart sığma testi gerekir) |

⚠️ **A maddesi önceliklidir** (task'ın kendi notu) — oynanabilirliği
bozuyor, B kozmetik.

## BELİRSİZ bırakılan noktalar (dürüstlük notu)

1. iPhone 17 Pro'nun TAM CSS viewport boyutu TEYİT EDİLMEDİ (393×852
   YAKLAŞIK kullanıldı, 14/15/16 Pro'yla aynı).
2. `#startBtn` tıklamasından sonraki 62px'lik OTOMATİK kaydırmanın
   gerçek iOS Simülatöründe (WKWebView) de oluşup OLUŞMADIĞI
   doğrulanamadı — Chromium VE masaüstü WebKit'te AYNI ölçüldü ama
   HİÇBİRİ gerçek mobil WKWebView'in birebir yerine geçmez.
3. `env(safe-area-inset-*)` Playwright'ta HER ZAMAN 0 — gerçek
   çentik/Dynamic Island/home-indicator etkisi EMÜLE EDİLEMEDİ (SE için
   muhtemelen ÖNEMSİZ, çünkü SE'nin kendisi bunlara sahip değil —
   donanım bilgisi, bu ölçümde DOĞRUDAN doğrulanmadı).
4. B maddesindeki 420px eşiğinin KASITLI mı yoksa geliştirici tahmini
   mi olduğu — kod geçmişinde kanıt YOK, kullanıcıya SORULMALI.
5. Eşik değiştirilirse 2 kartın 375px genişlikte GERÇEKTEN sığıp
   sığmadığı bu turda ÖLÇÜLMEDİ (kapsam dışı, "kod yazma" kısıtı).

Kod yazılmadı. Bu tur sadece ölçüm.

# OLCUM-DORT-18-08

Ölçüm görevi. Kod YAZILMADI, dosya DEĞİŞTİRİLMEDİ, commit ATILMADI —
`git status --short` bu turun SONUNDA sadece önceki turların OLCUM-*.md
dosyaları dışında değişiklik göstermiyor. Önerilen CSS değişiklikleri
(Madde D) HİÇBİR DOSYAYA yazılmadı, Playwright'ın `addStyleTag()`'ı ile
runtime'da enjekte edildi.

---

# A) "i" BUTONU AKORDİYON OKUNU KAPATIYOR 🔴

## ⚠️ Etiket düzeltmesi — kaynak G292 DEĞİL, G290

`git log --oneline -S "mode-info-btn-lg"` → **`51a31a6` G290**, TEK
sonuç. **G292 bu oturumdaki "Tekrar önleme" (repeat-guard) commit'im —
buton/CSS/akordiyon ile HİÇ İLGİSİ YOK.** Kod ETKİSİ aynı kalıyor,
sadece kaynak numarası yanlış — bu turda düzeltiliyor.

## Genişletilmiş alan gerçekten okun üstüne taşıyor mu — EVET, ÖLÇÜLDÜ

`www/styles.css:568-569`:
```css
.mode-info-btn-lg{position:relative}
.mode-info-btn-lg::before{content:"";position:absolute;top:50%;left:50%;width:44px;height:44px;transform:translate(-50%,-50%)}
```

İlerleme sekmesindeki 3 akordiyon satırının (Günlük Görevler/Zayıf
Bölge/Rozetler) GERÇEK, Playwright'ta ölçülen koordinatları (`390×844`,
üçünde de BİREBİR AYNI):

| Öğe | x aralığı | Not |
|---|---|---|
| "i" butonu (görsel, 22×22) | 309-331 | `www/index.html:875/906/934/954` |
| **"i" butonunun 44×44 görünmez ::before'u** | **287-353** | Merkez=butonun merkezi, ±22px |
| Boşluk (buton ile ok arası) | 331-341 (10px) | |
| **Ok (chevron, 16×16)** | **341-357** | `.prog-chevron` |

`elementFromPoint()` x-ekseni TARAMASI (y=butonun/okun dikey merkezi):

```
x=305-339  -> dailyInfoBtn   (i-butonun GÖRÜNMEZ ::before'u — BUTONUN
                              KENDİSİ 309-331, ama ::before 287-353'e
                              kadar UZANIYOR, GAP'İN TAMAMINI (331-339)
                              KAPLIYOR)
x=341-357  -> dailyChevron   (okun KENDİ 16px'lik gövdesi TEMİZ)
```

**Kesin bulgu: okun kendi 16×16 gövdesi TEK BAŞINA etkilenmiyor** (bu
noktalarda `elementFromPoint` doğru şekilde chevron'u döndürüyor,
Playwright'ın `locator.click()`'i de akordiyonu GERÇEKTEN
toggluyor — 3 buton da test edildi, `wrap.hidden` başarıyla değişti).
**AMA ok ile "i" butonu arasındaki 10px'lik TÜM BOŞLUK (331-341) ve
okun kendi sol kenarının 1-2px'i, görünmez ::before'un içinde** —
buton ile ok GÖRSEL OLARAK ayrı iki hedef gibi görünse de aralarında
"güvenli" bir boşluk YOK, ::before ikisini neredeyse KAYNAŞTIRIYOR.
**Gerçek parmak dokunuşu (fare imlecinden çok daha geniş temas alanı,
16px'lik bir hedefte hassas nişan alma güçlüğü) okun TAM merkezini
değil, biraz SOLUNU/kenarını hedeflemesi YÜKSEK ihtimal** — bu, PIXEL-
PERFECT tıklama testinin YAKALAYAMADIĞI ama GEOMETRİK olarak KANITLANMIŞ
bir risk penceresi. **BELİRSİZ (bu ölçümde doğrudan kanıtlanamadı):**
gerçek cihazda parmağın TAM olarak hangi x-koordinatına bastığı — ama
"boşluk + okun sol kenarı" toplamda ~11px'lik bir tuzak bölgesi
GEOMETRİK OLARAK KANITLANDI.

## Araçlar'da neden sorun yok — YAPI FARKI, konum DEĞİL

`www/index.html:1015/1061/1131/1189` (Araçlar'ın 4 "i" butonu) —
HEPSİ `.tools-card-top` İÇİNDE, `style="margin-left:auto"` ile SAĞA
YASLANMIŞ, **YANLARINDA hiçbir sibling YOK** (ne chevron ne başka bir
buton — bu kartlar akordiyon DEĞİL, koddaki kendi yorumu: *"bu kart
akordiyon DEĞİL... stopPropagation KULLANILMADI"*). "i" butonunun
44×44 alanı sağa/sola taştığında ÇARPIŞACAK bir KOMŞU HEDEF yok —
İlerleme'nin 3 akordiyonundaki spesifik "ok bitişik" YERLEŞİMİ Araçlar'da
YOK. **Yapı farkı, konum farkı DEĞİL** (ikisi de row-sonu/sağ taraf
yerleşimi, TEK fark: Araçlar'da sağında BAŞKA bir interaktif eleman yok).

## İlerleme'deki 4 butonun hepsinde mi — HAYIR, 3/4

| Buton | Akordiyon mu | Yanında chevron var mı | Risk |
|---|---|---|---|
| `dailyInfoBtn` (Günlük Görevler) | EVET | EVET (10px boşluk + ::before) | 🔴 VAR |
| `zoneInfoBtn` (Zayıf Bölge) | EVET | EVET (AYNI 10px) | 🔴 VAR |
| `badgesInfoBtn` (Rozetler) | EVET | EVET (AYNI 10px) | 🔴 VAR |
| `accChartInfoBtn` (İsabet Grafiği) | **HAYIR** (`index.html:903` kendi notu: "bu kart akordiyon DEĞİL") | **chevron YOK** | ✅ YOK |

"Bugünün Önerisi" (`dailyTipCard`, Ana Menü) — kendi chevron'u (`dailyTipChevron`)
VAR ama **"i" butonu HİÇ YOK** (`www/index.html:105-119` — bu kartta
`mode-info-btn`/`mode-info-btn-lg` class'ı hiç kullanılmıyor) — sorunun
OLUŞMASI için gereken İKİ öğeden (i-butonu + bitişik chevron) biri
STRÜKTÜREL olarak YOK, bu yüzden "sorun YOK" raporu koddan DOĞRULANIYOR.

## Düzeltme yolu — üç seçenek, 44×44 hedefi KISMEN korunabilir

**Geometrik kısıt:** "i" butonu (309-331, 22px) ile solundaki metin
(299'da biter) ve sağındaki chevron (341'de başlar) arasında TOPLAM
sadece **42px** yatay boşluk var (10+22+10) — simetrik 44×44 bu boşluğa
SIĞMIYOR, HANGİ yöne kaydırılırsa kaydırılsın bir komşuya değiyor.

1. **Sadece bu 3 buton için `::before` genişliğini küçült** (ör. dikey
   44px KORUNUP yatay ~30px'e indirilir — HIG'in "en az 44pt" kuralı
   İKİ boyutta da istiyor, bu TEKNİK OLARAK tam uyumu BOZAR ama mevcut
   22px'ten YİNE DE %36 daha büyük). Scoped seçici
   (`.prog-card-head-row .mode-info-btn-lg::before`) — SADECE bu 3
   satırı etkiler, `gameInfoBtn`/Araçlar'ın 4 butonu DOKUNULMAZ. **Düşük
   risk.**
2. **Asimetrik kaydırma** — ::before'u SOLA kaydır (chevron'dan uzaklaş,
   count metnine yaklaş). Hesaplandı: sağ kenarı butonun kendi sağ
   kenarına (331) sabitlenirse zon 287-331 olur, chevron'a (341+) hiç
   değmez AMA count metninin (299'da biter) SON birkaç pikseline
   (287-299, 12px) girer — count DÜZ METİN, ayrı bir handler'ı YOK, bu
   satırda ZATEN her yer akordiyonu tetikliyor (`prog-clickable`) — bu
   kaydırma "i" ile "toggle" arasındaki çakışmayı "i" ile "count
   metnine yanlışlıkla i-paneli açma" riskine DÖNÜŞTÜRÜR, ama count
   kasıtlı bir dokunma HEDEFİ olmadığı için (kullanıcı ORAYA nişan
   almaz) pratik risk DAHA DÜŞÜK. **Düşük-orta risk.**
3. **z-index artırma — İŞE YARAMAZ, ölçüldü.** Chevron zaten `::before`'dan
   SONRA gelen DOM sırasına sahip DEĞİL (aksine "i" butonu chevron'dan
   ÖNCE) ama chevron KENDİ 16px sınırları İÇİNDE zaten kazanıyor
   (ölçüldü: x=341-357 temiz) — sorun bir STACKING/z-index çakışması
   DEĞİL, ::before'un chevron'un dışına, BOŞ ALANA taşması. z-index
   chevron'a eklense bile BOŞ ALANDA (331-341) hâlâ ::before TEK
   eleman olacağı için hiçbir şey değişmez.

**En düşük riskli/en hedefli:** Seçenek 1 (scoped daraltma, SADECE 3
akordiyon satırı) — `gameInfoBtn`/Araçlar'ın 4 butonu/`accChartInfoBtn`
TEK SATIR değişmez, sadece bu 3 butonun ::before'u.

**İş yükü:** ~5-10 satır CSS (yeni scoped seçici), 0 satır JS/HTML.
**Risk:** Düşük — sadece 3 satırı etkiler, geniş ekranı/diğer 5 butonu
etkilemez (BELİRSİZ: bu turda geniş-ekran izolasyonu AYRICA
kanıtlanmadı, ama değişiklik zaten YATAY boyuta özgü ve GENİŞLİK-
bağımsız bir sabit piksel azaltımı olduğu için ekran boyutundan
BAĞIMSIZ çalışır — mantıken izole, ama OLCUM-SIKISTIRMA'daki gibi
enjekte-edip-ölçme YAPILMADI, zaman kısıtı).

---

# B) TONAL DENGE'DE İÇERİK YUKARI TAŞIYOR 🔴

## Kök sebep — auto-scroll-to-bottom + büyüyen içerik

Tonal Denge `isChoiceFormat()`'ın (`app.js:1437`) ZORUNLU listesinde —
HER yeni soruda `scrollFeedbackIntoView()` (`app.js:804-811`,
`gameScroll.scrollTop = gameScroll.scrollHeight`) OTOMATİK çalışıyor.
Bant sayısı arttıkça (`bandCountForSessionIndex`, `tonal-denge.js:129-133`
— 4/5/6 bant, oturum soru sırasına göre DETERMİNİSTİK) `.game-scroll`'un
`scrollHeight`'i BÜYÜYOR — "en alta kaydır" HER SEFERİNDE DAHA UZAĞA
gidiyor, bu da içeriğin ÜST kısmının (kaynak seçici, analizör) görünür
pencereden GİDEREK DAHA FAZLA yukarı/dışarı itilmesi anlamına geliyor.
**Bu, "kaynak seçici/analizör'ün KENDİ konumu değişiyor" DEĞİL — sabit
kalıyorlar, DEĞİŞEN scroll penceresinin NEREYE baktığı.**

## Hangi öğeler itiliyor, kaç px — ÖLÇÜLDÜ (doğal/otomatik scrollTop'ta)

| Viewport | 4 bant | 5 bant | 6 bant |
|---|---|---|---|
| **375×667 (SE)** | scrollTop=128, kaynakSeçici.top=**-76** (EKRAN DIŞI), analizör 11px kırpık | scrollTop=236, kaynakSeçici=**-184**, analizör **119px kırpık** | scrollTop=297, kaynakSeçici=**-233**, analizör **180px KIRPIK (TAMAMI — 180px'lik analizörün TAMAMI ekran dışı)** |
| 393×852 | scrollTop=0, kaynakSeçici=52, analizör TEMİZ | scrollTop=51, kaynakSeçici=1 (sınırda), analizör TEMİZ | scrollTop=112, kaynakSeçici=**-48** (dışarı), analizör TEMİZ |
| 414×896 | scrollTop=0, kaynakSeçici=52, TEMİZ | scrollTop=7, kaynakSeçici=45, TEMİZ | scrollTop=56, kaynakSeçici=**-4** (az dışarı), analizör TEMİZ |
| 430×932 | scrollTop=0, TEMİZ | scrollTop=0, TEMİZ | scrollTop=20, kaynakSeçici=32, analizör TEMİZ |

## Analizör kırpılması hangi bant sayısından SONRA başlıyor

**SADECE 375×667 (SE)'de** — 4 bantta BİLE (11px) başlıyor, 5 bantta
(119px) ve 6 bantta (180px, TAMAMI) DRAMATİK kötüleşiyor. **393-430px
genişlik aralığında (852-932px yükseklik) bu ölçümde HİÇ analizör
kırpılması REPRODÜKLENMEDİ** — sadece kaynak seçicinin birkaç-onlarca
piksel yukarı kayması (393px'te 6 bantta -48px, 414px'te 6 bantta
sadece -4px).

## ⚠️ Logic'in "iPhone 17 Pro, 414px" raporu — TAM REPRODÜKLENEMEDİ, BELİRSİZ

414×896'da (bu ölçümün "17 Pro" için kullandığı YAKLAŞIK boyut — KENDİSİ
TEYİT EDİLMEDİ, bkz. önceki OLCUM-SIMULATOR raporu) analizör KIRPILMIYOR,
sadece kaynak seçici 4px dışarı taşıyor — Logic'in "analizör kırpılıyor"
raporuyla TAM UYUŞMUYOR. **Olası açıklama (test edildi, KISMEN
doğrulandı, TAM değil):** bu ölçüm ortamı `env(safe-area-inset-top)`'u
HER ZAMAN **0px** döndürüyor (doğrudan ölçüldü) — SE'nin AKSİNE (o
GERÇEKTEN çentiksiz/Dynamic-Island'sız), 17 Pro'nun GERÇEK donanımında
üstte ~44-59px'lik bir çentik/Dynamic-Island payı VAR, bu ölçüm ortamı
bunu SİMÜLE EDEMİYOR. Bu payı YAKLAŞIK olarak DÜŞÜP (414×837, 430×873)
tekrar ölçüldü: kaynak seçici DAHA FAZLA dışarı taşıyor (414px'te 6
bantta -63px, önceden -4px'ti) AMA **analizör YİNE DE kırpılmıyor**
(analizörGizliÜst/Alt hâlâ 0px). **Sonuç: safe-area-top varsayımı
KISMEN AÇIKLIYOR (kötüleşme yönünde, ölçülen) ama TAM UYUŞMAYI
SAĞLAMIYOR — BELİRSİZ, kapanmayan bir boşluk var.** Olası TAMAMLAYICI
açıklamalar (HİÇBİRİ bu ortamda doğrulanamadı): (a) iPhone 17 Pro'nun
GERÇEK CSS yüksekliği 896'dan KISA olabilir (boyut teyit edilmedi), (b)
gerçek WKWebView'in font/spacing render'ı bu masaüstü WebKit'ten
farklı olabilir, (c) kullanıcının cihazında farklı bir Dinamik Yazı
Tipi (accessibility text size) ayarı olabilir (test edilmedi).
**Öneri: kullanıcıdan/Logic'ten `window.innerHeight`'i cihazın kendi
Safari konsolundan okuması istenmeli** — bu boşluğu kapatacak TEK kesin
yol.

## Bu Tonal Denge'ye özgü mü

**EVET, BELİRGİN ŞEKİLDE** — önceki ölçüm (OLCUM-BOSALAN) Tonal Denge'yi
"196px ile EN İNATÇI mod" olarak işaretlemişti (o ölçüm SABİT 4-bant
durumunda, sıkıştırma önlemleri UYGULANDIKTAN SONRA bile). Bu turun
ölçümü bunu DOĞRULUYOR VE DERİNLEŞTİRİYOR: taşma SABİT DEĞİL, bant
sayısıyla (kullanıcının OYNADIKÇA DOĞAL olarak ARTAN bir değer)
KATLANARAK büyüyor — 375×667'de 4 bantta zaten kırpık, 6 bantta
TAMAMEN görünmez. Diğer 11 modun HİÇBİRİNDE bu "oturum ilerledikçe
İÇERİK BÜYÜYOR" dinamiği YOK (hepsinde soru-başına içerik SABİT).

## Düzeltme yolu var mı, riski ne

**KOD YAZILMADI, sadece yön:** (1) `scrollFeedbackIntoView()`'ın
Tonal Denge'ye ÖZGÜ bir varyantı — "en alta kaydır" yerine "cevap
alanını (sliderlar) görünür kılacak KADAR kaydır, daha fazla değil" —
`sliderWrap`'in KENDİ `getBoundingClientRect()`'ine göre hedefli bir
scroll hesabı gerekir, ORTA risk (G150'nin kaçındığı "ölçüm-tabanlı"
yaklaşıma daha yakın, D1'in ÜÇ kez başarısız olduğu tuzak sınıfı —
DİKKATLİ tasarlanmalı). (2) Bant başına slider yüksekliğinin
küçültülmesi (`.tonal-slider` — bu turda ÖLÇÜLMEDİ, kapsam dışı). (3)
6 bandın kendisinin SE'de/dar ekranlarda farklı (ör. 2 sütunlu slider
ızgarası) düzenlenmesi — BÜYÜK bir mimari değişiklik, ÜRÜN KARARI.
**Bu tur SADECE ölçtü, hangi yönün doğru olduğuna KARAR VERMEDİ.**

---

# C) ANA MENÜ KAYDIRMA KONUMU 🟡

## Kaydırma konumu hiç saklanmıyor mu — DOĞRULANDI, HİÇ SAKLANMIYOR

`www/js/app.js:2597-2600`, `goScreen(name)` fonksiyonunun İÇİNDE,
**KOŞULSUZ**:
```js
if (target) {
  const scrollEl = target.querySelector(".scroll");
  if (scrollEl) scrollEl.scrollTop = 0;
}
```
Bu, `goScreen()` çağrılan **HER** ekran geçişinde çalışır — hiçbir
"önceki pozisyonu hatırla" mekanizması YOK, KASITLI olarak HER ZAMAN
sıfırlanıyor.

## Menüye dönüşte hangi fonksiyon çalışıyor

`#backBtn` (oyun ekranı geri tuşu) → `goBack()` (`app.js:2686-2689`) →
`goScreen(screenStack.pop() || "menu")` → yukarıdaki KOŞULSUZ reset.
Playwright'ta DOĞRULANDI: menü `scrollTop=400`'e kaydırıldı, bir moda
girilip `#backBtn` ile çıkıldı → `scrollTop=0`.

## Konum hatırlanabilir mi, ne kadar iş

**EVET, teknik olarak basit.** Gerekli: (1) menüden AYRILIRKEN scroll
pozisyonunu bir değişkende sakla (`let menuScrollPosition = 0`,
`.menu-scroll`'un `scrollTop`'unu okuyarak — mod kartına tıklanınca
VEYA sekme değişince), (2) `goScreen("menu")` çağrıldığında (SADECE
menüye dönüşte, DİĞER ekranlarda DEĞİL) bu sakli değeri geri yaz. **İş
yükü: ~5-10 satır** — YENİ bir değişken + `goScreen()`'in "menu" dalına
özel bir `if`. **Risk: DÜŞÜK** — SADECE menü ekranını etkiler (koşullu,
`name==="menu"` kontrolüyle), diğer ekranların KOŞULSUZ sıfırlama
davranışı DEĞİŞMEZ (task'ın "başka ekranlarda sorun var mı" sorusuna
bkz. — o ekranlarda sıfırlama muhtemelen KASITLI/istenen davranış,
BURADA dokunulmamalı).

## Başka ekranlarda da aynı sorun var mı

**Mekanik olarak EVET** — `goScreen()`'in resetleme satırı `.scroll`
İÇEREN HER ekran için AYNI şekilde çalışır (İlerleme/Araçlar/Ayarlar
DAHİL, kod yolu TEK VE PAYLAŞILAN). **Playwright'ta DOĞRUDAN
gözlemlenemedi** (İlerleme sekmesinde test edilen içerik bu turun kısa
viewport'unda kaydırılacak kadar UZUN değildi, `scrollTop` ataması
etkisiz kaldı — BELİRSİZ, AYRI bir turda daha uzun içerikle/gerçek
veri ile doğrulanmalı). **Ama kod okumasına dayanarak: EVET, aynı
mekanizma, aynı sonuç bekleniyor** — sadece kullanıcı raporu SADECE
Ana Menü'yü işaret ediyor, çünkü Ana Menü'nün 12-kart tek-sütun listesi
İlerleme/Araçlar'dan DAHA UZUN (daha çok kaydırma gerektiriyor, sorun
DAHA belirgin).

---

# D) IZGARA EŞİĞİ 420 → 390 🟡

## Önceki (ekran görüntüsünden piksel sayılan) analiz — DOĞRULANDI/YANLIŞLANDI

Playwright'ta GERÇEK render ile 12 mod × 5 genişlik (375/390/393/414/430,
2 sütun ZORLANARAK — mevcut 420px eşiği bu genişliklerin TÜMÜNDE zaten
1 sütuna düşürüyor, "eşik 390 olsaydı" senaryosunu görmek için enjekte
edildi):

| Önceki analizin iddiası | Bu ölçümün bulgusu |
|---|---|
| "390px'de kart 172px, başlık alanı 100px" | **YANLIŞ/EKSİK** — kart yüksekliği 156-208px arası DEĞİŞKEN (satır içeriğine göre), TEK bir "172px" sabiti YOK |
| "'Boost mu Cut mu' 109 CSS → 9px taşar" | **YANLIŞLANDI** — 390px'de 2 satıra WRAP EDİYOR (kırpılmıyor/taşmıyor), `scrollWidth>clientWidth` testi (`nameOverflowsOwnBox`) **12 kartın 5 genişlikteki 60 ölçümünün TAMAMINDA `false`** |
| "'Frekans Bulma' 93.3 CSS → 6.7px pay, sınırda" | **YANLIŞLANDI** — 375-390px'de 2 satıra wrap ediyor (taşmıyor), 393px+'te 1 satıra sığıyor, HİÇBİR YERDE taşma YOK |
| "Sv N rozeti 34.7px sabit, başlık alanını yiyor" | **YAPISAL OLARAK İMKANSIZ** — rozet (`www/styles.css:419-424`) `position:absolute`, `.mode-card-viz` (GÖRSEL/resim alanı) İÇİNDE, `.mode-card-body`/`.mode-card-name` (BAŞLIK metni) TAMAMEN AYRI bir kutuda — rozet BAŞLIK ALANINA hiç GİREMEZ (farklı ebeveyn kutu). Ölçülen genişlik 35px (Sv N) / 51px (PRO ikon+yazı) — "34.7"ye YAKIN ama "başlığı yediği" iddiası YAPISAL OLARAK yanlış. |

**Genel sonuç: "önceki analiz" (ekran görüntüsünden piksel sayma)
KÖRÜ KÖRÜNE ALINMAMALI — bu turun gerçek-render ölçümü SIFIR taşma/
kırpılma buldu, tüm 5 genişlikte, tüm 12 modda.**

## 390px'de 12 mod kartının başlığı sığıyor mu — TABLO

| Mod | 375px başlık | 390px başlık | 393px başlık | 414px başlık | 430px başlık |
|---|---|---|---|---|---|
| Frekans Bulma | 2 satır | 2 satır | 1 satır | 1 satır | 1 satır |
| Kesim Noktası | 2 satır | 1 satır | 1 satır | 1 satır | 1 satır |
| Q Genişliği | 1 satır | 1 satır | 1 satır | 1 satır | 1 satır |
| Boost mu Cut mu | 2 satır | 2 satır | 2 satır | 2 satır | 1 satır |
| dB Seviyesi | 1 satır | 1 satır | 1 satır | 1 satır | 1 satır |
| Stereo Genişlik | 2 satır | 2 satır | 2 satır | 1 satır | 1 satır |
| Pan Konumu | 1 satır | 1 satır | 1 satır | 1 satır | 1 satır |
| Kompresör | 1 satır | 1 satır | 1 satır | 1 satır | 1 satır |
| Reverb | 1 satır | 1 satır | 1 satır | 1 satır | 1 satır |
| Tonal Denge | 1 satır | 1 satır | 1 satır | 1 satır | 1 satır |
| Saturation & Distortion | 2 satır | 2 satır | 2 satır | 2 satır | 2 satır |
| Frekans Çakışması | 2 satır | 2 satır | 2 satır | 2 satır | 1 satır |

**Taşan/kırpılan: SIFIR (0/60 ölçüm).** 2 satıra düşenler GRACEFUL
wrap — kart CSS Grid'in `align-items:stretch` + `.mode-card{height:100%}`
mekanizmasıyla (`www/styles.css:377/389-390`) satır arkadaşıyla AYNI
yüksekliğe geriliyor (**60 kartlık ölçümde TEK BİR satır-içi yükseklik
uyuşmazlığı bulunmadı**).

## Kart yükseklikleri düzensizleşiyor mu — HAYIR (satır İÇİNDE)

Grid stretch garantisi: AYNI satırdaki 2 kart HER ZAMAN eşit yükseklik
(60/60 ölçümde doğrulandı). Satır-DIŞI (farklı satırlar arası) yükseklik
FARKLI olabilir (ör. "Saturation & Distortion" satırı 201-208px, DİĞER
satırlar 156-172px) — ama bu genişlikten BAĞIMSIZ, HER ZAMAN böyle
(uzun açıklama metni yüzünden), 390 eşiğiyle İLGİSİZ bir gözlem.

## Açıklama metinleri kaç satır — 1-3 arası, DEĞİŞKEN

En uzun: "Saturation & Distortion" açıklaması TÜM genişliklerde 3 satır
(kart adı DEĞİL, açıklama metni uzun). Çoğu mod 1-2 satır. Genişlik
ARTTIKÇA satır sayısı azalma EĞİLİMİNDE ama SABİT bir kural yok (kart
genişliği arttıkça daha az sarma bekleniyor, ölçüm bunu genel olarak
doğruluyor).

## Rozetler/ikonlar/PRO etiketi sıkışıyor mu — HAYIR

`badgeOverflowsCard` (rozetin kart sınırını AŞIP AŞMADIĞI) **60/60
ölçümde `false`.**

## 390 yerine 393 olsa fark eder mi

**Küçük bir fark VAR ama FONKSİYONEL değil, KOZMETİK:** 390px'de 5
mod 2-satırlı başlık gösteriyor (Frekans Bulma/Boost-Cut/Stereo
Genişlik/Saturation&Distortion/Frekans Çakışması), 393px'te bunlardan
2'si (Frekans Bulma/Stereo Genişlik) 1 satıra düşüyor — **393, 390'dan
BİRAZ daha ferah**, ama HİÇBİRİNDE taşma/kırpılma olmadığı için bu bir
"düzeltme" DEĞİL, sadece estetik bir tercih farkı. **Task'ın "393"ü de
denenmeye değer bir alternatif — fonksiyonel olarak İKİSİ DE güvenli.**

## ⚠️ SORU: eşik değişince GENİŞ ekranlarda (430px) düzen DEĞİŞİR Mİ

**HAYIR — KANITLANDI.** Gerçek önerilen değişiklik (`max-width:420px`
kuralının YERİNE `max-width:390px` — ARADAKİ 391-420px bandını ESKİDEN
1 sütuna düşüren kuralı SÖKÜP o bandı 2 sütuna GEÇİREN bir override
enjekte edilerek) ÖNCESİ/SONRASI `getComputedStyle(#modeGrid).
gridTemplateColumns` karşılaştırıldı:

| Genişlik | ÖNCE | SONRA | Değişti mi |
|---|---|---|---|
| 375px (SE) | `343px` (1 sütun) | `343px` | HAYIR |
| 390px (yeni eşiğin TAM sınırı) | `358px` | `358px` | HAYIR |
| 405px (391-420 arası — YENİ etkilenen bant) | `373px` | `180.5px 180.5px` | **EVET (1→2 sütun, İSTENEN etki)** |
| 420px (eski eşiğin sınırı) | `388px` | `188px 188px` | **EVET (İSTENEN etki)** |
| 421px (eski eşiğin bir üstü) | `188.5px 188.5px` | `188.5px 188.5px` | HAYIR |
| **430px (Logic'in cihazı)** | `193px 193px` | `193px 193px` | **HAYIR** |

**375/390/421/430px'te TEK BİR PİKSEL değişmiyor** — değişiklik SADECE
391-420px bandında (Logic'in ZATEN "2 sütun görmeli" dediği aralığın
GENİŞLETİLMİŞ hali) etkili. 430px (Logic'in kendi cihazı) dahil TÜM
geniş ekranlar ZATEN 2 sütundaydı, ÖNCESİ/SONRASI AYNI kalıyor.

## İş yükü ve risk

**İş yükü: 1 satır** — `www/styles.css:379`'daki `@media (max-width:420px)`
sayısının `390` (ya da `393`) ile değiştirilmesi. **Risk: ÇOK DÜŞÜK** —
kanıtlanmış izolasyon (391-420 bandı DIŞINDA hiçbir genişlik
etkilenmiyor) + bu turun 60 ölçümlü tablosu (taşma/kırpılma/rozet-
taşması SIFIR, 375-430px aralığının TAMAMINDA) TEK riski ortadan
kaldırıyor: "2 sütun görsel olarak bozulur mu" sorusunun cevabı HAYIR.

---

# ÇIKTI ÖZETİ

| Madde | Kök sebep | Dosya:satır | Düzeltme yolu | İş yükü | Risk | Geniş ekranı etkiler mi |
|---|---|---|---|---|---|---|
| **A** 🔴 (G290, G292 DEĞİL) | `.mode-info-btn-lg::before`'un 44×44 alanı, İlerleme'nin 3 akordiyon satırında (buton-ok arası SADECE 42px) chevron'a bitişik boşluğun TAMAMINI kaplıyor | `styles.css:568-569`, `index.html:875/934/954` | Scoped daraltma (SADECE 3 satır) YA DA asimetrik kaydırma | ~5-10 satır CSS | Düşük | Genişlikten bağımsız (BELİRSİZ, izolasyon AYRICA kanıtlanmadı) |
| **B** 🔴 | `scrollFeedbackIntoView()`'ın "en alta kaydır"ı, bant sayısı (4→5→6) arttıkça BÜYÜYEN içeriği DAHA FAZLA kaydırıyor, üst öğeleri (kaynak seçici/analizör) görünür pencereden İTİYOR | `app.js:804-811`, `tonal-denge.js:129-133` | Hedefli scroll (sadece cevap alanını göster) — TASARLANMADI, kapsam dışı | Belirsiz, orta-büyük | Orta (D1'in kaçındığı tuzak sınıfı) | SE'de dramatik, 393-430px'te HAFİF (analizör kırpılmadı, ⚠️ Logic'in "17 Pro"da analizör kırpıldı raporu TAM reprodüklenemedi — BELİRSİZ) |
| **C** 🟡 | `goScreen()`'in KOŞULSUZ `scrollTop=0` resetlemesi (TÜM `.scroll` ekranları) | `app.js:2597-2600` | Menüye ÖZEL, koşullu hatırlama (`name==="menu"` dalı) | ~5-10 satır | Düşük | Etkilemez (sadece menü scroll davranışı) |
| **D** 🟡 | Eşik (420px) mevcut iPhone hattının BÜYÜK ÇOĞUNLUĞUNU (375-414px) 1 sütuna düşürüyor, SADECE Plus/Pro Max (428-430px) 2 sütun görüyor | `styles.css:379` | Eşiği 390 (ya da 393) yap | 1 satır | Çok düşük (izolasyon KANITLANDI, taşma/kırpılma SIFIR) | **HAYIR — kanıtlandı (430px dahil TEK piksel değişmiyor)** |

⚠️ A maddesi bugünkü hatamız, öncelikli — diğer 3 madde önceden var
olan, bu turda İLK KEZ tam ölçülen sorunlar.

Kod yazılmadı. Bu tur sadece ölçüm.

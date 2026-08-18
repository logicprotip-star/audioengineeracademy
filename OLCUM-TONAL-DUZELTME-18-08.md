# OLCUM-TONAL-DUZELTME-18-08

`OLCUM-DORT-18-08.md` madde B'nin (Tonal Denge) tekrar ölçümü —
kullanıcının cihazdan verdiği GERÇEK `window.innerHeight` (414px
genişlikte **874px**) ile. Kod YAZILMADI, dosya DEĞİŞTİRİLMEDİ, commit
ATILMADI. `git status --short` bu turun SONUNDA yine sadece önceki
turların OLCUM-*.md dosyalarını gösteriyor.

## Önce: neden düzeltme gerekiyordu

`OLCUM-DORT-18-08.md`'de "17 Pro" için kullanılan **414×896** — iPhone
11'in BİLİNEN CSS spesifikasyonuna dayanan bir TAHMİNDİ, kendi raporunda
"TEYİT EDİLMEDİ" olarak işaretlenmişti. Kullanıcının cihazdan okuduğu
GERÇEK değer **874px** — tahminden **22px KISA**. Aynı sorun `393×852`
("14/15/16 Pro") ve `430×932` ("14 Pro Max") için de geçerli — o ikisi
de HİÇBİR GERÇEK cihazdan doğrulanmamış, sadece Apple'ın YAYINLADIĞI CSS
nokta boyutlarına dayanan tahminlerdi.

## 414×874 (GERÇEK, kullanıcı-doğrulamalı) — Tonal Denge, 4/5/6 bant

| Bant | `scrollTop` | Taşma | Kaynak seçici | Analizör | KIRPILIYOR |
|---|---|---|---|---|---|
| 4 | 0 | 0px | top=52 (temiz) | top=159, temiz | **HAYIR** |
| 5 | **29** | 44px | top=23 (temiz, sınıra yakın) | top=130, temiz | **HAYIR** |
| 6 | **78** | 93px | top=**-26** (26px EKRAN DIŞI) | top=81, **temiz** (gizliÜst=0px, gizliAlt=0px) | **HAYIR** |

**`scrollFeedbackIntoView()` bu yükseklikte ne kadar kaydırıyor:** 5
bantta 29px, 6 bantta 78px (`.game-scroll.scrollTop`, DOĞAL/otomatik
değer — `app.js:804-811`'in `scrollTop = scrollHeight` davranışının
SONUCU).

**Kırpılma hangi bant sayısından sonra başlıyor — 874px'te: HİÇBİRİNDE.**
6 bantta bile analizör TAM görünür kalıyor (`analyzerHiddenAbove=0px,
analyzerHiddenBelow=0px`) — SADECE kaynak seçici 26px ekran dışına
çıkıyor.

## ⚠️ SONUÇ DEĞİŞMEDİ — gerçek yükseklikle de tam reprodüksiyon YOK

**Bu ölçüm, GERÇEK cihaz değeriyle bile Logic'in "6 bant açılınca
ANALİZÖR KIRPILIYOR" raporunu TAM OLARAK ÜRETEMEDİ.** Önceki
raporun BELİRSİZ notu (yükseklik tahmini yanlış olabilir) bu turda
KAPANDI (gerçek değer artık elde) ama asıl semptom (analizör kırpılması)
HÂLÂ reprodüklenemedi — yani kök sebep SADECE "yanlış viewport
yüksekliği tahmini" DEĞİLMİŞ, en azından TEK BAŞINA değil. **BELİRSİZ,
bu turda da KAPANMADI.** Olası açıklamalar (HİÇBİRİ bu ortamda test
EDİLEMEDİ):
- Gerçek oturumda kullanıcının o ana kadar oynadığı round SAYISI/YOLU
  bu ölçümdeki (`__aeaSubmitAnswerForTest` + sınav-atlama ile hızlandırılmış,
  "free" mod) senaryodan farklı olabilir — ör. bir "boss" turu, ipucu
  kullanımı (`#gameM2HintUsedRow`) ya da combo rozeti EKSTRA bir satır
  eklemiş olabilir (bu turda TETİKLENMEDİ/test edilmedi).
- Gerçek WKWebView'in font/satır-yükseklik render'ı masaüstü WebKit'ten
  farklı olabilir (ör. Dinamik Yazı Tipi/erişilebilirlik metin boyutu
  ayarı büyütülmüş olabilir — test edilmedi, cihazda kontrol
  edilmeli).
- Kullanıcının cihazında Ayarlar'dan farklı bir kalibrasyon/ölçüm
  geçmişi olabilir (bu ölçüm HER ZAMAN temiz/sıfır localStorage'la
  başlıyor).

**Öneri:** Bu boşluğu kapatmanın TEK kesin yolu — kullanıcının 6.
bantta GERÇEKTEN gördüğü ekran görüntüsü YA DA o anki
`document.getElementById("gameScroll").scrollHeight/clientHeight/scrollTop`
değerlerinin cihazdan (Safari uzaktan hata ayıklama ya da bir konsol
`alert`/log ile) okunması.

## Diğer viewport'lar — GERÇEK vs TAHMİN karşılaştırması

⚠️ **393px ve 430px için GERÇEK bir cihaz değeri YOK** — sadece TEK
doğrulanan nokta (414→874, -22px) esas alınarak EKSTRAPOLE edilmiş
tahminler aşağıda AYRI işaretlendi. **Bunlar DOĞRULANMAMIŞ, "aynı -22px
farkı diğerlerinde de olabilir" varsayımına dayanıyor.**

| Genişlik | ESKİ tahmin | DÜZELTİLMİŞ tahmin (−22px, DOĞRULANMAMIŞ) | 6 bantta analizör kırpılıyor mu (eski→yeni) |
|---|---|---|---|
| 375 (SE) | 667 (GERÇEK, Apple speki — çentiksiz cihaz, bu düzeltme SE'ye uygulanmaz) | *(değişmedi)* | EVET → EVET (zaten en kötü durum, ikisi de aynı) |
| 393 (14/15/16 Pro) | 852 | **830** | HAYIR → **EVET (17px kırpılıyor, 6 bantta)** |
| 414 (17 Pro) | 896 | **874 (GERÇEK)** | HAYIR → HAYIR (değişmedi — yukarıdaki ⚠️ nota bkz.) |
| 430 (14 Pro Max) | 932 | **910** | HAYIR → HAYIR (35px→57px taşma büyüdü ama analizör hâlâ temiz) |

**Not:** 393px'in düzeltilmiş (830px, DOĞRULANMAMIŞ) tahmininde 6
bantta analizör 17px kırpılmaya BAŞLIYOR — eski (852px) tahmininde bu
GÖRÜNMÜYORDU. Bu, "-22px düzeltmesi doğruysa" 14/15/16 Pro sınıfı
cihazların da (SADECE 17 Pro değil) 6 bantta HAFİF bir kırpma riski
taşıyabileceğini gösteriyor — **ama bu SATIR bütünüyle DOĞRULANMAMIŞ
bir ekstrapolasyona dayanıyor, gerçek cihaz verisi YOK.**

## Tam ölçüm tablosu (4/5/6 bant, TÜM viewportlar)

| Viewport | Bant | scrollTop | Taşma | Kaynak seçici gizliÜst | Analizör gizliÜst/Alt | Kırpılıyor |
|---|---|---|---|---|---|---|
| 375×667 (SE) | 4 | 128 | 202px | 118px | 11px/0px | EVET |
| | 5 | 236 | 251px | 226px | 119px/0px | EVET |
| | 6 | 297 | 312px | 287px | **180px/0px (TAMAMI)** | EVET |
| 393×852 (eski) | 4 | 0 | 17px | 0px | 0px/0px | HAYIR |
| | 5 | 51 | 66px | 41px | 0px/0px | HAYIR |
| | 6 | 112 | 127px | 102px | 0px/0px | HAYIR |
| 393×830 (düzeltilmiş, DOĞRULANMAMIŞ) | 4 | 0 | 39px | 0px | 0px/0px | HAYIR |
| | 5 | 73 | 88px | 63px | 0px/0px | HAYIR |
| | 6 | 134 | 149px | 124px | **17px/0px** | **EVET** |
| 414×896 (eski, YANLIŞ) | 4 | 0 | 0px | 0px | 0px/0px | HAYIR |
| | 5 | 7 | 22px | 0px | 0px/0px | HAYIR |
| | 6 | 56 | 71px | 46px | 0px/0px | HAYIR |
| **414×874 (GERÇEK)** | 4 | 0 | 0px | 0px | 0px/0px | HAYIR |
| | 5 | 29 | 44px | 19px | 0px/0px | HAYIR |
| | 6 | 78 | 93px | 68px | 0px/0px | HAYIR |
| 430×932 (eski) | 4 | 0 | 0px | 0px | 0px/0px | HAYIR |
| | 5 | 0 | 0px | 0px | 0px/0px | HAYIR |
| | 6 | 20 | 35px | 10px | 0px/0px | HAYIR |
| 430×910 (düzeltilmiş, DOĞRULANMAMIŞ) | 4 | 0 | 0px | 0px | 0px/0px | HAYIR |
| | 5 | 0 | 8px | 0px | 0px/0px | HAYIR |
| | 6 | 42 | 57px | 32px | 0px/0px | HAYIR |

## Güncellenmiş sonuç (OLCUM-DORT madde B'nin YERİNE geçer)

1. **SE (375×667) — DEĞİŞMEDİ, HÂLÂ EN KÖTÜ DURUM.** 4 bantta bile
   kırpık, 6 bantta analizörün TAMAMI (180px) ekran dışı. Bu bulgu
   GERÇEK bir cihaz boyutuna dayanıyor (SE'nin çentiksiz/Dynamic-
   Island'sız donanımı iyi bilinen bir gerçek), sağlam.
2. **414×874 (GERÇEK, 17 Pro) — analizör KIRPILMIYOR, sadece kaynak
   seçici 26px ekran dışına çıkıyor.** Kullanıcının rapor ettiği
   "analizör kırpılıyor" semptomu bu ölçümde GERÇEK cihaz yüksekliğiyle
   bile üretilemedi — **BELİRSİZLİK KAPANMADI**, yükseklik tahmini
   düzeltildi ama asıl semptom AÇIKLANAMADI.
3. **393px (14/15/16 Pro) için TEK bir DOĞRULANMAMIŞ ekstrapolasyon
   var** — eğer aynı -22px farkı geçerliyse, bu sınıf cihazlar da 6
   bantta HAFİF (17px) bir kırpma görebilir. **Gerçek veri OLMADAN bu
   satır kesin sayılmamalı.**
4. **430px (14 Pro Max) — düzeltilmiş tahminle de analizör TEMİZ
   kalıyor**, sadece taşma büyüyor (0→57px, hep sadece kaynak seçici
   alanında).

Kod yazılmadı. Bu tur sadece ölçüm.

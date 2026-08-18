# OLCUM-SIKISTIRMA-18-08

Ölçüm görevi. Kod YAZILMADI, dosya DEĞİŞTİRİLMEDİ, commit ATILMADI —
`git status --short` bu turun SONUNDA sadece önceki turların OLCUM-*.md
dosyaları dışında değişiklik göstermiyor.

**Yöntem:** Önerilen CSS kuralları HİÇBİR DOSYAYA yazılmadı — Playwright'ın
`page.addStyleTag()`'ı ile ÇALIŞAN sayfaya RUNTIME'da enjekte edildi
(devtools'ta "add rule" ile aynı teknik), ölçüldü, sayfa kapatıldı. Bu,
"bu kural EKLENSEYDİ ne olurdu"yu koda hiç dokunmadan ölçmenin yolu.

**⚠️ Ölçüm sırasında BULUNAN, düzeltilen bir tasarım hatası (kendi
kendini düzeltme, kod DOSYAYA yazılmadı):** İlk denenen seçici
(`#screen-game:not(.actionbar-compact):not(.actionbar-tucked)`) M2
modlarını (Kompresör/Reverb/Distortion) YANLIŞLIKLA de kapsıyordu —
onların GERÇEK actionbar yüksekliği (161px) yeni değerden (139px)
BÜYÜK, yani bu YANLIŞ kapsam onları DAHA KISA bir rezervasyona
düşürüp içeriğin sabit çubuğun ARKASINDA kalmasına (kaydırmayla bile
düzelmeyen, KALICI bir kesilme) yol açardı — ÖLÇÜLEREK YAKALANDI (aşağıda
Madde A'da tam kanıt var), `:has(.controls-m2)` ile DÜZELTİLDİ. Bu
raporun TÜMÜ düzeltilmiş (v2) sürümün ölçümlerini kullanıyor.

---

# A) İZOLASYON — ⚠️ EN ÖNEMLİ SORU

## Mümkün mü — EVET, `@media (max-height:700px)` ile

Test edilen (enjekte edilen, dosyaya YAZILMAYAN) kural:

```css
@media (max-height: 700px) {
  #screen-game:not(.actionbar-compact):not(.actionbar-tucked):not(:has(.controls-m2)) .game-scroll {
    margin-bottom: calc(139px + env(safe-area-inset-bottom)) !important;
  }
}
```

`max-height` medya sorgusu CSS spesifikasyonunun standart, iyi
desteklenen bir özelliği — SADECE viewport yüksekliği eşiğin altındaysa
kural devreye girer, ÜSTÜNDEyse HİÇ PARSE bile edilmiş gibi davranılmaz
(tarayıcı kuralı DEĞERLENDİRMEZ). Bu, `--actionbar-h`'ın (168px, TÜM
formatlarda/genişliklerde kullanılan TEMEL sabit) KENDİSİNE hiç
dokunmuyor — SADECE dar yükseklikte, ÜÇ ek koşulu (compact DEĞİL, tucked
DEĞİL, M2 DEĞİL) sağlayan tek bir alt-durum için AYRI bir override
ekliyor.

## Kanıt — Playwright, ÖNCE/SONRA, geniş ekranlarda piksel-piksel karşılaştırma

**4 geniş viewport (390×844, 414×896, 430×932, 393×852) × 3 temsilci mod
(Frekans Bulma-Dokunmalı, Kompresör-M2, Kesim Noktası-Şıklı) = 12 test,
HER BİRİNDE önerilen kuralın TAMAMI (bu raporun B+C bölümlerindeki HER
CSS'i BİRLİKTE) enjekte edildi, 7 elementin (`{.ghead, .chiprow,
#questionTitle, #analyzer, #gameSpectrumControls, #answers, .actionbar}`
— top/height/width) + `.game-scroll`'un (overflow, margin-bottom)
TAMAMI ölçülüp JSON olarak karşılaştırıldı:**

| Viewport | frekans-bulma(touch) | kompresor | kesim-noktasi |
|---|---|---|---|
| 390×844 | AYNI ✅ | AYNI ✅ | AYNI ✅ |
| 414×896 | AYNI ✅ | AYNI ✅ | AYNI ✅ |
| 430×932 | AYNI ✅ | AYNI ✅ | AYNI ✅ |
| 393×852 | AYNI ✅ | AYNI ✅ | AYNI ✅ |

**12/12 test — TEK BİR PİKSEL bile değişmedi.** Ölçülen HER değer
(pozisyon, boyut, margin-bottom'un GERÇEK hesaplanan değeri, taşma)
enjeksiyon ÖNCESİ ve SONRASI BİREBİR AYNI JSON'u üretti.

## Paylaşılan CSS değişkeni değişiyor mu — HAYIR

`--actionbar-h:168px`'in KENDİSİ HİÇ değişmedi (mevcut G73 kuralına
uyumlu, ölçüm bunu doğruluyor: geniş ekranda `margin-bottom` HER
senaryoda `168px` OLARAK KALDI — enjekte edilen kural sadece dar
yükseklikte, ayrı bir override). Yeni bir "paylaşılan" değişken
EKLENMEDİ — G150'nin AYNI yöntemiyle (`--actionbar-h-compact` örneği)
KOŞULLU, tek-amaçlı bir sabit (139px) kullanıldı.

## ⚠️ Önemli sınırlama — BELİRSİZ, dürüstlük notu

`:has(.controls-m2)` M2 modlarını EXCLUDE etmenin TEK CSS-only yolu
(`.controls-m2` sınıfı `#gameSpectrumControls`'e — `#screen-game`'in
KENDİSİNE DEĞİL — uygulanıyor, ata seçici olmadan CSS'te "bu alt öğeye
sahip ata"yı seçmenin BAŞKA yolu yok, JS'e dokunmadan). `:has()` Safari/
WebKit'te **15.4+**'ta destekleniyor (bu ortamda test edilen WebKit
sürümü `CSS.supports("selector(:has(*))")` → **true** döndürdü).
`ios/App/App.xcodeproj/project.pbxproj:253` — **`IPHONEOS_DEPLOYMENT_
TARGET = 15.0`** — yani uygulamanın KENDİ minimum hedefi `:has()`'in
GEREKTİRDİĞİ 15.4'ten DAHA DÜŞÜK. **BELİRSİZ/RİSK:** iOS 15.0-15.3
aralığındaki (GERÇEKTE kaç kullanıcı bu aralıkta — ÖLÇÜLEMEDİ, App
Store/analytics verisi bu ortamda YOK) bir cihazda `:has()` içeren
kural CSS spesifikasyonuna göre GEÇERSİZ sayılır ve TÜM kural
(BAŞTAN SONA) YOK sayılır — **bu GÜVENLİ bir başarısızlık modudur**
(mevcut 168px davranışı AYNEN kalır, HİÇBİR ŞEY BOZULMAZ), sadece o
alt-kümedeki kullanıcılar bu iyileştirmeyi ALMAZ. Eğer bu risk kabul
edilemezse, ALTERNATİF: `app.js`'e (G150'nin `syncActionbarCompact()`
ile AYNI desende) küçük bir JS class-toggle eklemek `:has()`
gerektirmeden AYNI izolasyonu sağlar — ama bu "kod yazma" gerektirir,
bu turun kapsamı DIŞINDA.

---

# B) 44 PX ÖLÜ ALAN — TEK BAŞINA KAPATILIRSA

## 12 modda taşma ne kadar azalır — ÖLÇÜLDÜ

| Mod | Taban taşma | +44px-fix SONRASI | Azalma |
|---|---|---|---|
| **frekans-bulma (Dokunmalı)** | 84px | **55px** | **29px** |
| frekans-bulma (Şıklı) | 136px | 136px | 0px |
| kesim-noktasi | 136px | 136px | 0px |
| q-genisligi | 153px | 153px | 0px |
| boost-mu-cut-mu | 86px | 86px | 0px |
| db-seviyesi | 47px | 47px | 0px |
| stereo-genislik | 117px | 117px | 0px |
| pan-konumu | 43px | 43px | 0px |
| kompresor (M2) | 75px | 75px | 0px |
| reverb (M2) | 149px | 149px | 0px |
| tonal-denge | 240px | 240px | 0px |
| distortion (M2) | 75px | 75px | 0px |
| frekans-cakismasi | 122px | 122px | 0px |

## Kaç mod TAMAMEN düzelir — 0/13

**HİÇBİRİ.** Frekans Bulma (Dokunmalı) 84px'ten 55px'e iner ama SIFIRA
İNMEZ (29px kalır) — bu turun kendi hesabı: 168px'in gerçek 124px'e
(sadece ~12px güvenlik payıyla) indirilmesi GEREKİRdi TAM kapatmak için,
139px (G150'nin AYNI ~%12 payı UYGULANARAK seçilen, KEYFİ DEĞİL bir
değer) bunun ORTASINDA kalıyor — daha AGRESİF bir sabit (ör. 139
yerine, güvenlik payını azaltıp ~130px) taşmayı SIFIRA indirebilir ama
bu, G150'nin KENDİ metodolojisinin (~12% pay, WKWebView font/render
farkına karşı) ÇİĞNENMESİ anlamına gelir — RİSK ARTAR.

## Geniş ekranı etkiler mi

**HAYIR** — Madde A'daki 12/12 "AYNI ✅" kanıtı bunu KAPSIYOR (bu
enjekte edilen kural TAM OLARAK "44px'i kapat" kuralıydı).

## Alt bar rezervasyonu geniş ekranda da 168px mi

**EVET** — `--actionbar-h:168px` GENİŞLİKTEN/YÜKSEKLİKTEN BAĞIMSIZ,
TÜM viewport'larda AYNI (G73 kuralı: "bu değere DOKUNULMADI"). Geniş
ekranlarda 168px rezerv ZATEN yeterli boş alan bıraktığı için (`.game-
scroll`'un 812px+ yükseklikte KENDİSİ TAŞMIYOR) bu 44px'lik "israf"
geniş ekranlarda GÖRÜNMÜYOR/SORUN YARATMIYOR — sadece SE'nin 667px'i
gibi KISITLI alanlarda HİSSEDİLİYOR.

## Tek başına yapılabilir mi

**EVET, teknik olarak** (Madde A'nın kanıtladığı gibi izole) — AMA
**TEK BAŞINA hiçbir modu TAM olarak düzeltmiyor**, sadece Frekans
Bulma'nın (Dokunmalı) 84px'lik taşmasının 1/3'ünü kapatıyor. **Diğer
11 mod/format kombinasyonunu HİÇ ETKİLEMİYOR** (onlar zaten kendi
`.actionbar-compact`/M2 rezervasyonlarını kullanıyor, bu fix onları
kapsam dışı bırakıyor — kasıtlı, Madde A'nın M2-hatası bulgusunun
DOĞRUDAN sonucu).

---

# C) EK SIKIŞTIRMA — İKİ ADAY, AYRI AYRI ÖLÇÜLDÜ

## Aday 1 — Yapısal boşluk sıkıştırma (DÜŞÜK RİSK)

```css
@media (max-height: 700px) {
  .game-scroll { gap: 6px; padding-top: 6px; padding-bottom: 12px; }
  .qline { padding: 6px 13px; }
}
```

`.game-scroll`'un flex `gap`'i (10→6px), üst/alt padding'i (10→6,
20→12px), soru başlığı kartının (`.qline`) iç dolgusu (10→6px, sadece
dikey). **Dokunma hedefi/okunabilirlik ETKİLENMİYOR** — bunlar İÇERİK
DEĞİL, İÇERİK ARASI boşluk. Metin boyutu/satır yüksekliği TEK SATIR
değişmiyor.

**Kaç px kazandırır (44px-fix'in ÜSTÜNE, kümülatif):**

| Mod | +44px-fix sonrası | +yapısal sonrası | Ek kazanç |
|---|---|---|---|
| frekans-bulma (Dokunmalı) | 55px | 35px | 20px |
| frekans-bulma (Şıklı) | 136px | 100px | 36px |
| kesim-noktasi | 136px | 100px | 36px |
| q-genisligi | 153px | 117px | 36px |
| boost-mu-cut-mu | 86px | 50px | 36px |
| db-seviyesi | 47px | 11px | 36px |
| stereo-genislik | 117px | 77px | 40px |
| pan-konumu | 43px | 7px | 36px |
| kompresor (M2) | 75px | 53px | 22px |
| reverb (M2) | 149px | 123px | 26px |
| tonal-denge | 240px | 200px | 40px |
| distortion (M2) | 75px | 53px | 22px |
| frekans-cakismasi | 122px | 86px | 36px |

Geniş ekranda değişmeden kalır mı: **EVET** (Madde A'nın kanıtı bu
adayı da KAPSIYOR — enjekte edilen tam kural setinin parçasıydı).
Risk: DÜŞÜK — hiçbir dokunma hedefi/font boyutu değişmiyor.

## Aday 2 — Kart/çip boyutu sıkıştırma (ORTA-YÜKSEK RİSK)

```css
@media (max-height: 700px) {
  .ans { min-height: 48px; }        /* şimdi: 58px */
  .answers { gap: 6px; }            /* şimdi: 9px */
  .ans-m2 { padding: 10px; }        /* şimdi: 14px */
  .answers.answers-m2 { gap: 8px; } /* şimdi: 12px */
}
```

**Dokunma hedefi:** `.ans` (Şıklı format kartları) `min-height:58px`'ten
`48px`'e iniyor — Apple HIG'in **44px** ALT SINIRININ hâlâ **4px
ÜSTÜNDE**, ama payı 14px'ten 4px'e düşürüyor (RİSK: gerçek metin/ikon
içeriği bazı modlarda `min-height`'i zaten AŞABİLİR, bu durumda bu
değer HİÇ etkili olmaz — bu turda İÇERİĞE göre GERÇEK yükseklik
AYRICA ölçülmedi, sadece CSS min-height değeri test edildi). `.ans-m2`
padding'i 14→10px (kart İÇİ dolgu, dokunma ALANINI değil kartın
GÖRSEL yüksekliğini küçültüyor — kartın KENDİSİ zaten `min-height:0`,
tüm yüksekliği içeriğe göre şekilleniyor, padding azalması dokunma
alanını da AYNI oranda küçültür).

**Kaç px kazandırır (yapısal fix'in ÜSTÜNE, kümülatif):**

| Mod | +yapısal sonrası | +kart sonrası | Ek kazanç |
|---|---|---|---|
| frekans-bulma (Dokunmalı) | 35px | 35px | 0px (kart yok, canvas) |
| frekans-bulma (Şıklı) | 100px | 97px | 3px |
| kesim-noktasi | 100px | 97px | 3px |
| q-genisligi | 117px | 94px | 23px |
| boost-mu-cut-mu | 50px | 40px | 10px |
| db-seviyesi | 11px | 8px | 3px |
| stereo-genislik | 77px | 54px | 23px |
| pan-konumu | 7px | **0px** | 7px |
| kompresor (M2) | 53px | 21px | 32px |
| reverb (M2) | 123px | 91px | 32px |
| tonal-denge | 200px | 196px | 4px |
| distortion (M2) | 53px | 21px | 32px |
| frekans-cakismasi | 86px | 63px | 23px |

Geniş ekranda değişmeden kalır mı: **EVET** (AYNI Madde A kanıtı).
Risk: **ORTA-YÜKSEK** — dokunma hedefi payı daralıyor (14px→4px pay),
GERÇEK içerikle (metin uzunluğu, font rendering farkı iOS'ta) kartın
FİİLEN 48px'in altına DÜŞMEDİĞİ bu ölçümde DOĞRULANMADI (sadece
`min-height` CSS değeri test edildi, gerçek `.ans` içeriğinin (2-6
karakter etiket + opsiyonel ikon) doğal yüksekliği AYRICA cihazda/
gerçek fontla ölçülmeli).

---

# D) 12 MOD TABLOSU — TÜM AŞAMALAR BİRLİKTE

**375×667 (SE), `scrollTop=0`:**

| Mod | Format | Taban | +B (44px) | +B+C1 (yapısal) | +B+C1+C2 (kart) |
|---|---|---|---|---|---|
| frekans-bulma | Dokunmalı | 84 | 55 | 35 | 35 |
| frekans-bulma | Şıklı | 136 | 136 | 100 | 97 |
| kesim-noktasi | Şıklı (zorunlu) | 136 | 136 | 100 | 97 |
| q-genisligi | Şıklı (zorunlu) | 153 | 153 | 117 | 94 |
| boost-mu-cut-mu | Şıklı (zorunlu) | 86 | 86 | 50 | 40 |
| db-seviyesi | Şıklı (zorunlu) | 47 | 47 | 11 | **8** |
| stereo-genislik | Şıklı (zorunlu) | 117 | 117 | 77 | 54 |
| pan-konumu | Şıklı (zorunlu) | 43 | 43 | 7 | **0 ✅** |
| kompresor | M2 | 75 | 75 | 53 | 21 |
| reverb | M2 | 149 | 149 | 123 | 91 |
| tonal-denge | Şıklı (zorunlu) | 240 | 240 | 200 | 196 |
| distortion | M2 | 75 | 75 | 53 | 21 |
| frekans-cakismasi | Şıklı (zorunlu) | 122 | 122 | 86 | 63 |

**TÜM önlemler BİRLİKTE uygulansa bile: 13 satırdan SADECE 1'i
(pan-konumu) taşmayı TAM SIFIRA indiriyor.** Geri kalan 12'si HÂLÂ
8-196px arası bir taşma taşıyor — yani kullanıcı BU ÖNLEMLERİN
TAMAMIYLA bile HÂLÂ kaydırmak ZORUNDA (daha az, ama SIFIR DEĞİL).

---

# E) NET SONUÇ

## 1. Geniş ekran bozulur mu — **HAYIR**

12/12 ölçümde (4 viewport × 3 temsilci mod, TAM önerilen CSS seti
enjekte edilerek) **piksel-piksel BİREBİR AYNI** sonuç. `@media
(max-height:700px)` gate'i GARANTİ ediyor — SE'nin altındaki HİÇBİR
GERÇEK cihaz (667px, en yakın üstteki gerçek boyut 812px) bu eşiğin
yanlış tarafına düşmüyor (133px pay var). **TEK KOŞULLU RİSK** (BELİRSİZ
olarak işaretli): `:has()` seçicisi iOS 15.0-15.3'te desteklenmiyor —
ama bu durumda kural TAMAMEN devre dışı kalıyor (GÜVENLİ başarısızlık,
BOZULMA değil, sadece o alt-kümede İYİLEŞME olmuyor).

## 2. Sadece 44px kapatmak yeterli mi — **HAYIR, 0/13 mod TAM düzelir**

Frekans Bulma (Dokunmalı) için 84px'in 29px'ini (%35) kapatıyor, DİĞER
12 satırın (11 mod + Frekans Bulma Şıklı) **HİÇBİRİNİ ETKİLEMİYOR**
(0px değişim) — çünkü onlar zaten KENDİ (7-11px'lik, İNTENTİONAL
güvenlik-payı) rezervasyonlarını kullanıyor, "44px" onlara HİÇ
uygulanmıyor.

## 3. Tam çözüm için ne gerekiyor, riski ne

**Tam çözüm YOK — bu turda TEST edilen ÜÇ önlemin (44px-fix + yapısal
sıkıştırma + kart sıkıştırma) TOPLAMI bile SADECE 1/13'ü sıfırlıyor.**
Kalan 12 satırın en kötüsü (Tonal Denge, 196px) bu önlemlerin HİÇBİRİYLE
pratikte çözülemez boyutta — kendi (bu turun kapsamı DIŞINDA bırakılan,
G160'ın da "kısmen" bıraktığı) kaydırıcı-yoğun arayüzü AYRICA ele
alınmalı. Diğer 11 satır (8-97px arası kalan taşma) için TAM çözüm
İKİ yoldan biri gerektirir:

- **(a) Daha agresif sıkıştırma** — bu turda test edilenden BÜYÜK
  kesintiler (ör. analizör kartının KENDİ yüksekliğinin küçültülmesi,
  bu turda HİÇ test edilmedi/hesaplanmadı) — risk ORTA-YÜKSEK,
  `resizeCanvas()` senkronizasyonu + görsel okunabilirlik AYRICA
  doğrulanmalı.
- **(b) Mimari değişiklik** — `#gameSpectrumControls`'ü sabit
  `.actionbar`'a taşımak (önceki OLCUM-SIMULATOR raporunun 3. seçeneği)
  — ÜRÜN KARARI gerektirir, bu ölçümün kapsamı DIŞINDA.

**Risk özeti — üç aday, üç risk seviyesi:**
| Aday | Kazanç (frekans-bulma dokunmalı) | Risk | Geniş ekran |
|---|---|---|---|
| B (44px) | 29/84px | DÜŞÜK (G150 ile AYNI kanıtlanmış yöntem) | Etkilenmiyor (ölçüldü) |
| C1 (yapısal) | +20px (toplam 49/84px) | DÜŞÜK (sadece boşluk, içerik YOK) | Etkilenmiyor (ölçüldü) |
| C2 (kart) | +0px (Dokunmalı'da kart yok) | ORTA-YÜKSEK (dokunma hedefi payı daralıyor, gerçek içerik yüksekliği DOĞRULANMADI) | Etkilenmiyor (ölçüldü) |

Kod yazılmadı. Bu tur sadece ölçüm.

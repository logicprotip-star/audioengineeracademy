# TERİM KURALI — kendi senaryondan çıkarıldı

_Kaynak: `mix_mastering_4katman_senaryo.pages` (4 katmanlı terim videosu)._
_Bu artık öneri değil — senin kendi kullanımın._

---

## BULGU

Senaryoda tutarlı bir kalıp var: **terim İngilizce, açıklama Türkçe.**
Türkçeleştirme yapılan yerler istisna, kural değil.

Örnekler senin kendi cümlelerinden:

> "Gain staging'in temelidir."
> "Sinyal ile noise floor arasındaki fark..."
> "en az 6 dB headroom bırakmak..."
> "Çok hızlı attack transient'i ezer ve punch'ı kaybettirir."
> "Çok hızlı release pompalama efekti yaratır."
> "%100 wet = tamamen efektli, %0 wet = hiç efekt yok."

Yani zaten doğru yapıyorsun. Uygulamadaki metinler bu kalıba
uymuyorsa, uygulama senin dilinden sapmış demektir.

---

## KURAL

### 1. İngilizce kalır — terimin kendisi

Senaryonda İngilizce geçen terimler (hepsi doğrudan alıntı):

**Sinyal / seviye**
`gain` · `gain staging` · `headroom` · `noise floor` · `clipping` ·
`dBFS` · `dBTP` · `peak` · `RMS` · `LUFS` · `true peak` · `ceiling` ·
`unity gain` · `normalization`

**Dinamik**
`threshold` · `ratio` · `attack` · `release` · `knee` · `gate` ·
`sidechain` · `ducking` · `punch` · `transient` ·
`gain reduction` · `parallel compression` · `glue compression` ·
`multiband compressor` · `dynamic EQ` · `de-esser` ·
`transient designer`

**EQ / frekans**
`EQ` · `HPF` · `LPF` · `high-shelf` · `low-shelf` · `Q` ·
`linear phase EQ` · `masking`

**Mekân / efekt**
`reverb` · `pre-delay` · `early reflections` · `delay` ·
`wet` / `dry` · `saturation` · `soft clipping` · `exciter` ·
`harmonic distortion`

**Stereo / faz**
`phase` · `polarity invert` · `comb filtering` ·
`mono compatibility` · `M/S processing` · `stereo width`

**Akış**
`bus` · `send` / `return` · `aux` · `solo` · `mute` · `fader` ·
`pan` · `signal chain` · `vocal chain` · `reference track` ·
`A/B test` · `automation` · `stem`

**Teknik**
`sample rate` · `bit depth` · `dithering` · `oversampling` ·
`aliasing` · `Nyquist` · `latency` · `buffer` · `DC offset` ·
`ISRC` · `K-System` · `ADSR`

---

### 2. Türkçe kalır — kavramın kendisi

Senaryonda Türkçe geçenler:

`frekans` · `dalga formu` · `sinyal` · `desibel` · `mono` ·
`stereo` · `derinlik` · `genişlik` · `dinamik aralık` ·
`akustik` · `oda modları`

---

### 3. Karma — ikisi birlikte

Senaryonda ilk geçişte İngilizce + parantez Türkçe:

> `Compression (Kompresyon)`
> `Signal Chain (Sinyal Zinciri)`
> `EQ (Equalizer)`
> `Bit Depth`

Uygulamada da aynısı yapılabilir: **ilk geçişte parantezli,
sonra sadece terim.**

---

## "HAVA" MESELESİ — nüans

Senaryonda "hava" **kullanıyorsun**, ama sıfat olarak:

> "Side kanalına **hava vermek** için kullanılır."
> "tiz frekanslara parlaklık ve **hava katan** efekt işlemcisidir."

Yani "hava" bir **nitelik** — sesin karakterini tarif ediyor.

Uygulamada ise **bant adı** olarak kullanılmış: "tiz/hava".
Bu farklı bir iş. Bant adı bir ölçüm etiketi, nitelik değil.

**Önerim:**
- Bant adı → `air` (10-16 kHz bandı, sektör standardı)
- Açıklama metinlerinde → "hava" kalabilir
  ("bu bölge sese hava katar")

Böylece hem senin dilin korunur hem etiket doğru olur.

---

## UYGULAMA İÇİN SONUÇ

Terim taraması artık kurala göre yapılabilir:

1. Uygulamadaki her terimi bu listeyle karşılaştır
2. Listede İngilizce olan bir terim uygulamada Türkçeleştirilmişse
   → düzelt
3. Listede olmayan bir terim varsa → senaryodaki mantıkla karar ver:
   *Türkiye'deki stüdyoda bu kelime İngilizce mi söyleniyor?*

---

## AYRICA — bu senaryo başka işlere de yarar

**Geri bildirim metinleri.** Senaryodaki açıklamalar uygulamadaki
feedback metinlerinden daha iyi. Örnek:

> "Çok hızlı attack transient'i ezer ve punch'ı kaybettirir.
> Çok yavaş attack ise sesin ilk darbesi geçtikten sonra
> sıkıştırmayı başlatır. Davul için 10-30 ms iyi bir başlangıç
> noktasıdır."

Kompresör modunun geri bildirimi bu seviyede olabilir.

**"i" metinleri.** Aynı kaynak.

**Reverb modunun tip öğretimi.** Senaryoda Room/Hall/Plate/Spring
ayrımı var — devirdeki "reverb motoru zenginleştirilmeden tip
sorusu eklenmemeli" notuyla birlikte değerlendirilebilir.

**İçerik–uygulama tutarlılığı.** YouTube'da bir terimi şöyle
anlatıp uygulamada başka türlü yazmak kafa karıştırır. Bu senaryo
ikisini hizalamak için ölçü olabilir.

---

## SENDEN GEREKEN

Bu belge kuralı belirliyor ama **taramayı yapmadım** — uygulamadaki
metinler bende yok.

İki yol:
1. Claude Code'a tarattır: "uygulamadaki tüm kullanıcı metinlerini
   bu kurala göre kontrol et, sapan yerleri listele"
2. Ya da metin dosyalarını (`guide-texts.js` ve geri bildirim
   metinleri) bana at, ben karşılaştırayım

İkincisi daha kontrollü — ben liste çıkarırım, sen bakarsın,
sonra tek prompt'la uygulanır.

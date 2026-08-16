# OLCUM-DISTORTION-16-08 — Distortion Modunun DSP Karakteri Ölçümü

_Kapsam: SADECE ÖLÇÜM, kod YAZILMADI/DEĞİŞTİRİLMEDİ. `distortion.js`'in
GERÇEK export ettiği sabit/fonksiyonlar (DISTORTION_TYPES, DRIVE_RANGES'in
kendisi export edilmiyor — `driveAtK()` ile uçlardan geri türetildi,
`buildDistortionCurve()`, `paramsForDifficultyPosition()`) doğrudan Node'da
çağrılıp bir test sinyaliyle (1 kHz sinüs) harmonik içerik ÖLÇÜLDÜ — tahmin
edilmedi. Ölçüm scripti repoya DAHİL EDİLMEDİ (scratchpad'te kaldı),
`distortion.js` TEK bir satır bile değişmedi (bkz. `git log -1` bu dosya
için — son commit hâlâ G97, bugünkü hiçbir commit'te yok)._

---

## a) WaveShaper eğrisi — TAM formül (kaynaktan alıntı, `distortion.js:142-177`)

Dört tip, dördü de `x∈[-1,1]` girdiyi `y∈[-1,1]` çıktıya eşleyen 1024
örneklik bir lookup-table (`CURVE_SAMPLES=1024`) olarak kuruluyor —
WaveShaperNode'un GERÇEKTEN kullandığı tablo bu, elle yaklaşıklık değil:

| Tip | Formül | Karakter |
|---|---|---|
| `clip` | `y = clamp(x·drive, -1, 1)` | **SERT kırpma** — donanım/dijital kırpmanın matematiksel tanımı, simetrik |
| `soft` | `y = tanh(x·drive)` | **Yumuşak diz** — klasik tanh saturasyonu, simetrik |
| `tube` | `d = x≥0 ? drive : drive·0.72; y = tanh(x·d)·0.92` | **ASİMETRİK yumuşak diz** — pozitif/negatif yarım-dalga FARKLI drive (0.72 oranı), gerçek tüp devrelerinin imzası |
| `tape` | `y = x − sign(x)·drive·0.15·|x|³` | **Neredeyse doğrusal** — küçük kübik düzeltme, sadece tepe noktalarına yakın hafif yumuşatma |

**Sonuç:** `clip` GERÇEKTEN sert kırpma (donanım limiter matematiği).
`soft`/`tube`/`tape` ÜÇÜ de yumuşak diz ailesinde (tanh ya da kübik) —
aralarındaki fark FORMÜL TÜRÜ değil, (1) simetri (tube asimetrik, diğer
ikisi simetrik) ve (2) drive aralığının BÜYÜKLÜĞÜ (aşağıya bkz. madde b).

## b) Drive aralığı — TAM tablo

`DRIVE_RANGES` doğrudan export edilmiyor, `driveAtK(type,0)`/`driveAtK(type,1)`
(GERÇEK, export edilen saf fonksiyon) ile uçlardan geri türetildi:

| Tip | drive (k=0) | drive (k=1) | Oran (max/min) |
|---|---|---|---|
| clip | 2.2 | 15.0 | 6.8× |
| soft | 1.1 | 8.0 | 7.3× |
| tube | 0.5 | 3.2 | 6.4× |
| tape | 0.12 | 0.9 | 7.5× |

**Dört aralık KASITLI OLARAK örtüşmüyor** (dosya başı yorumu doğrulandı):
clip'in EN DÜŞÜK drive'ı (2.2) tape'in EN YÜKSEK drive'ından (0.9) hâlâ
~2.4× daha büyük — türler arası "kolay/zor" hiyerarşisi salt kGap'e değil,
aralıkların KENDİSİNE gömülü.

**`driveAtK(type,k)` tam tablo (k=0..1, adım 0.1, GERÇEK fonksiyon çağrısı):**

| k | clip | soft | tube | tape |
|---|---|---|---|---|
| 0.0 | 2.200 | 1.100 | 0.500 | 0.120 |
| 0.1 | 3.480 | 1.790 | 0.770 | 0.198 |
| 0.2 | 4.760 | 2.480 | 1.040 | 0.276 |
| 0.3 | 6.040 | 3.170 | 1.310 | 0.354 |
| 0.4 | 7.320 | 3.860 | 1.580 | 0.432 |
| 0.5 | 8.600 | 4.550 | 1.850 | 0.510 |
| 0.6 | 9.880 | 5.240 | 2.120 | 0.588 |
| 0.7 | 11.160 | 5.930 | 2.390 | 0.666 |
| 0.8 | 12.440 | 6.620 | 2.660 | 0.744 |
| 0.9 | 13.720 | 7.310 | 2.930 | 0.822 |
| 1.0 | 15.000 | 8.000 | 3.200 | 0.900 |

**"Z1-Z7" (ZORLUK.md'nin tanımıyla — sürekli zorluk `position`'ının İLK 7
tam sayı değeri, tier ADI DEĞİL) — `paramsForDifficultyPosition()` GERÇEK
çağrısıyla ölçüldü:**

| Z | kGap | oddK aralığı (DIST_BASE_K=0.5 ± kGap) | timeSec |
|---|---|---|---|
| Z1 | 0.4500 | [0.050, 0.950] | 16.00 |
| Z2 | 0.4040 | [0.096, 0.904] | 15.52 |
| Z3 | 0.3627 | [0.137, 0.863] | 15.06 |
| Z4 | 0.3256 | [0.174, 0.826] | 14.61 |
| Z5 | 0.2923 | [0.208, 0.792] | 14.17 |
| Z6 | 0.2625 | [0.238, 0.762] | 13.75 |
| Z7 | 0.2356 | [0.264, 0.736] | 13.34 |

**ÖNEMLİ NÜANS — kGap sürekli daralıyor ama TİP kendisi SÜREKLİ değil,
BASAMAKLI değişiyor:** `kGap` (yukarıdaki tablo) Z1'den Z7'ye pürüzsüzce
daralıyor, ama hangi TİPİN (clip/soft/tube/tape) kullanılacağı `kGap`'ten
BAĞIMSIZ, `DISTORTION_TYPES[level]` üzerinden `level` STRING'ine (easy/
medium/hard/pro) bağlı — bu, ZORLUK.md'nin dokümante ettiği
`TIER_BOUNDARIES` (easy≤4, medium≤8, hard≤12, pro≤20) ile birlikte
okunursa: **Z1-Z4 → clip, Z5-Z7 → soft** (Otomatik zorlukta `level` string'i
position'a göre türetiliyor — bu belirli eşleme app.js'in position→level
mantığından, bu turda o dosya tekrar okunmadı, ZORLUK.md'nin TIER_BOUNDARIES
tablosuna dayanıyor). **Yani "Z1-Z7" aralığının kendisi TEK bir tip DEĞİL,
İKİ farklı tipi (clip'ten soft'a) kapsıyor** — diğer bazı modların Z1-Z7'de
"aynı mekanizma, sadece kGap daralıyor" deseninden FARKLI, burada Z1-Z7
içinde bile bir "kademe sıçraması" var.

## c) Harmonik içerik — GERÇEK ölçüm (1 kHz sinüs, 96 kHz örnekleme, `buildDistortionCurve()`'ün ürettiği GERÇEK lookup-table WaveShaperNode'un kendi lineer-enterpolasyon kuralıyla uygulandı)

| Tip | drive | THD % | H2 (dB) | H3 (dB) | H4 (dB) | H5 (dB) | Çift/tek enerji oranı |
|---|---|---|---|---|---|---|---|
| clip | 2.2 (k=0) | 25.30% | −302.7 (yok) | −12.2 | −310.2 (yok) | −23.6 | ~0.000 |
| clip | 8.6 (k=0.5) | 37.83% | −293.6 (yok) | −9.7 | −294.5 (yok) | −14.5 | ~0.000 |
| clip | 15.0 (k=1) | 38.66% | −288.9 (yok) | −9.6 | −289.5 (yok) | −14.1 | ~0.000 |
| soft | 1.1 (k=0) | 7.80% | −310.3 (yok) | −22.2 | −311.7 (yok) | −42.4 | ~0.000 |
| soft | 4.55 (k=0.5) | 31.20% | −300.8 (yok) | −10.9 | −303.3 (yok) | −17.8 | ~0.000 |
| soft | 8.0 (k=1) | 36.02% | −297.3 (yok) | −10.0 | −298.8 (yok) | −15.3 | ~0.000 |
| tube | 0.5 (k=0) | 6.27% | **−24.7** | −36.1 | −35.8 | −69.8 | **14.911 (ÇİFT baskın)** |
| tube | 1.85 (k=0.5) | 13.45% | −52.7 | −17.7 | −35.8 | −32.6 | 0.023 (tek baskın) |
| tube | 3.2 (k=1) | 23.17% | −33.0 | −13.2 | −60.3 | −23.0 | 0.011 (tek baskın) |
| tape | 0.12 (k=0) | 0.46% | −314.7 (yok) | −46.8 | −313.5 (yok) | −166.1 | ~0.000 |
| tape | 0.51 (k=0.5) | 2.03% | −314.1 (yok) | −33.9 | −313.1 (yok) | −161.5 | ~0.000 |
| tape | 0.9 (k=1) | 3.76% | −312.6 (yok) | −28.5 | −312.8 (yok) | −158.4 | ~0.000 |

**"(yok)" = ölçüm gürültü tabanında (−280dB altı), matematiksel olarak SIFIR** — bu
üç tip (clip/soft/tape) formülleri TEK EKSEN etrafında TAM simetrik/tek
(odd) fonksiyonlar (`clamp`, `tanh`, kübik-imzalı) olduğu için ÇİFT harmonik
GERÇEKTEN üretemiyor, tahmin değil, matematiksel zorunluluk (odd
function ⇒ sadece odd harmonik).

**En dikkat çekici bulgu — `clip`'in yüksek drive'da OLUŞTURDUĞU harmonik
oranları GERÇEK bir kare dalganınkine neredeyse BİREBİR uyuyor:** ideal kare
dalganın H3'ü teorik olarak −9.54dB, H5'i −13.98dB'dir — ölçülen (drive=8.6)
H3=−9.7dB, H5=−14.5dB, **fark 0.2-0.5dB içinde**. Bu, `clip` tipinin YÜKSEK
zorlukta (pro/proplus DEĞİL ama easy'nin ÜST ucunda) GERÇEKTEN sert bir
kırpma/kare-dalga karakterine ULAŞTIĞINI gösteriyor — "distortion" adının
en haklı olduğu nokta burası.

**İkinci dikkat çekici bulgu — `tube`'un çift/tek harmonik dengesi drive'a
göre TERS DÖNÜYOR:** düşük drive'da (k=0) ÇİFT harmonik BASKIN
(oran=14.9, "sıcak tüp rengi" beklentisiyle TUTARLI — 2. harmonik ağırlıklı
renk klasik tüp/analog karakteridir), ama drive artınca (k=0.5, k=1) TEK
harmonik baskın hale geliyor (oran 0.01-0.02) — çünkü sabit 0.72 asimetri
oranı, her iki yarım-dalga da güçlü şekilde doyurulunca (tanh tavana
yaklaşınca) NİSPİ önemini kaybediyor. **Sonuç: "tube"un karakteristik
çift-harmonik sıcaklığı SADECE düşük-orta drive'da (yaklaşık k<0.3) belirgin,
oyun-içi TİPİK "aynı" varyant (k=0.5) zaten büyük ölçüde tek-harmonik
ağırlıklı.**

## d) Bu karakter hangi isme uyuyor?

**Ne SAF "Distortion" ne SAF "Saturation" — mod GERÇEKTEN bir SÜREKLİLİĞİ
(kontinyum) kapsıyor, uçları net biçimde AYRIŞIYOR:**

- **`tape` (pro/proplus, THD 0.46%–3.76%):** ders kitabı "saturation" —
  neredeyse doğrusal, kübik bir renklendirme, çok ince. Bu THD aralığı
  profesyonel ses mühendisliğinde "saturation"/"tape coloration" olarak
  anılan aralıkla ÖRTÜŞÜYOR.
- **`clip` (easy, THD 25%–39%, kare-dalgaya yakın):** ders kitabı
  "distortion" — sert, agresif, GERÇEKTEN kare dalga harmoniklerine
  yakınsıyor. Bu, "saturation" kelimesiyle ANLATILAMAYACAK kadar sert.
- **`soft`/`tube` (medium/hard):** ARADA — `soft` düşük drive'da hafif
  overdrive (THD 7.8%), yüksek drive'da neredeyse clip kadar sert
  (THD 36%). `tube` asimetrik/tüp karakterini TAŞIYOR ama THD'si
  (6-23%) "saturation"dan daha yüksek, klasik "soft distortion"/
  "overdrive" bandında.

**Modun KENDİ mevcut metinleri de bu SÜREKLİLİĞİ zaten kabul ediyor —
bu ölçümden BAĞIMSIZ, ÖNCEDEN yazılmış üç yerde:**
1. `core/guide-texts.js:170` (modun "ne öğretir" metni): *"İki sesten
   hangisinin daha çok **saturation/distortion** taşıdığını bulursun.
   **Saturation** sıcaklık ve karakter katar (tube, tape), **distortion**
   sertlik. Türü ve miktarı duymak analog renk ile kontrolsüz bozulmayı
   ayırmaktır."* — bu cümle İKİ kavramı zaten AYRI AYRI tanımlıyor.
2. `core/mode-catalog.js:46` (kart açıklaması, `aciklama` alanı):
   *"Hangisinin **saturation**'ı daha fazla?"* — kartın kendisi
   "distortion" DEĞİL "saturation" kelimesini kullanıyor.
3. `core/level-sheet-terms.js:104` (zorluk sayfası hassasiyet etiketi):
   `sensitivityLabel: "Saturation ayrımı"` — yine "saturation".

**Sonuç/öneri (karar Logic'e ait, kod DEĞİŞTİRİLMEDİ):** Mod adı
"Distortion" kalırsa, kartın/rehberin KENDİ metni zaten "saturation"
kelimesini kullanmaya devam edecek — bu MEVCUT bir tutarsızlık (bu
ölçümden ÖNCE de vardı). "Saturation"a TAM geçiş de yanıltıcı olur —
`clip` tipi (easy kademesi) GERÇEKTEN kare-dalgaya yakın sert bir
distortion, "saturation" bunu hafife alır. Üçüncü bir seçenek: modun
"iki-uçlu" doğasını AÇIKÇA isimde yansıtmak (ör. "Distortion &
Saturation" ya da rehber metninde zaten kullanılan "renk/karakter"
çerçevesini kart adına da taşımak) — ama bu bir ÜRÜN/isimlendirme
kararı, bu rapor sadece ölçümü ve mevcut iç-tutarsızlığı belgeliyor.

## e) Oversampling

`applyProcessing()` (`distortion.js:348`): **`shaper.oversample = "4x"`**
— açık, doğrudan koddan okundu. Bu, WaveShaperNode'un standart aliasing-
azaltma pratiği (4× iç örnekleme, sonra decimate) — yukarıdaki harmonik
ölçüm bunu MODELLEMEDİ (ölçüm scripti `buildDistortionCurve()`'ün ürettiği
tabloyu DOĞRUDAN, oversample'sız uyguladı, çünkü Node'da gerçek
WaveShaperNode yok). **Pratik etkisi:** 1 kHz temel frekans + 6. harmoniğe
kadar (6 kHz) 44.1/48kHz örnekleme hızının Nyquist'inin (22.05/24kHz) ÇOK
altında kaldığı için bu ÖZEL test sinyalinde aliasing riski zaten düşüktü
— ama `clip`/`soft`'un yüksek drive'da ürettiği YÜKSEK-MERTEBE harmonikler
(kare-dalgaya yakın sinyaller teorik olarak SONSUZ harmonik içerir) YÜKSEK
frekanslı kaynaklarla (ör. tiz bir gitar/synth) birleşirse gerçek/oversample'sız
bir WaveShaper'da katlanma (aliasing) riski YÜKSEK olurdu — `oversample:
"4x"` tam da bunun İÇİN var, doğru bir mühendislik kararı. Bu değer 4
zorluğun/tipin TAMAMINDA SABİT (koşullu bir ayarlama YOK).

## f) Kaç "tip" var, gerçek karakter farkı mı sadece miktar mı?

**4 GERÇEK tip** (`clip`/`soft`/`tube`/`tape`), her biri KENDİ formülü,
KENDİ drive aralığı ve (madde a/c'de ölçülen) KENDİ harmonik imzasıyla —
bu SADECE bir "aynı eğri, farklı miktar" değil, GERÇEK matematiksel
farklılık: `tube` TEK asimetrik (çift+tek harmonik üretebilen) formül,
diğer üçü simetrik (sadece tek harmonik) ama üç FARKLI matematiksel aile
(clamp/tanh/kübik). **Ama bir SORUDA (A/B/C) sadece BİR tip kullanılıyor**
(dosya başı notu: "Bir SORU İÇİNDE A/B/C ÜÇÜ DE AYNI türü kullanır") —
kullanıcı asla iki FARKLI tipi yan yana KARŞILAŞTIRMIYOR, sadece AYNI
tipin İKİ farklı YOĞUNLUĞUNU (k) ayırt ediyor. Tip SEÇİMİ zorluk
kademesine (easy→clip, medium→soft, hard→tube, pro/proplus→tape) bağlı,
kullanıcı TERCİH edemiyor. **Sonuç:** 4 GERÇEK karakter var ama oyun İÇİ
deneyim olarak kullanıcı bunları YAN YANA duymuyor, SIRAYLA (zorlukla)
karşılaşıyor — "tip çeşitliliği" mod TANITIMINDA/rehberinde VURGULANABİLİR
ama ANLIK oyun deneyiminde (bir sorudaki A/B/C) HER ZAMAN tek-tip bir
"miktar" ayrımı.

## g) Feedback/"i" metinleri modu nasıl anlatıyor?

Madde (d)'de alıntılanan ÜÇ metin (guide-texts.js'in "ne öğretir" metni,
mode-catalog.js'in kart açıklaması, level-sheet-terms.js'in hassasiyet
etiketi) — **ÜÇÜ DE "saturation" kelimesini kullanıyor, biri (guide-texts)
"distortion"u da AYRI bir kavram olarak tanımlıyor.** `teachingText()`'in
KENDİSİ (distortion.js:395-407) her sorunun içinde `DISTORTION_TYPE_INFO[
question.distortionType].label.toLowerCase()`'ı gömüyor — yani gerçek
geri bildirim metni "clipping"/"soft clip / overdrive"/"tube (valf)
saturation"/"tape saturation" ifadelerinden BİRİNİ kullanıyor (hangi
tip aktifse) — **modun KENDİSİ hiçbir yerde genel/jenerik olarak
"distortion" kelimesini kullanmıyor, HER ZAMAN o anki TİPİN kendi
(saturation/clip ağırlıklı) adını söylüyor.** Yani feedback metni zaten
"Saturation"a daha yakın bir dil kullanıyor — sadece MOD BAŞLIĞI/kartı
"Distortion".

**Ek not (bu ölçüm sırasında GÖRÜLDÜ, KOD DEĞİŞTİRİLMEDİ):**
`app.js:3959`'da distortion moduna özel bir soru-başlığı metninde
("...distortion'ı FARKLI olanı seç.") G249'da `distortion.js`'in
KENDİSİNDE düzeltilen ALL-CAPS "FARKLI" sızıntısının AYNISI hâlâ duruyor
— ama bu app.js'te, distortion.js'te DEĞİL, bu yüzden G249'un "distortion
moduna dokunma" kısıtına GİRMEDİ, düzeltilmedi. Logic'in bilgisine.

---

# İSİM DEĞİŞİRSE NE GEREKİR

## h) Kaç yerde değişiklik gerekir — GERÇEK grep sonucu

**Sadece GÖRÜNEN AD değişirse (MODE_ID "distortion" olarak KALIRSA)** —
EN UCUZ/EN DÜŞÜK RİSKLİ seçenek:
- `core/mode-catalog.js:46` — `ad: "Distortion"` → yeni ad, `aciklama`
  gerekirse güncellenir.
- Mağaza metni/ekran görüntüleri (bu repodan doğrulanamaz, App Store
  Connect tarafı — RET-RISKI-15-08.md'nin daha önce işaretlediği "5 ekran
  görüntüsü" bu modu gösteriyorsa etkilenir, "doğrulanmadı" olarak
  bırakılıyor).
- **Persistence/migration RİSKİ SIFIR** — `MODE_ID` değişmediği için
  `stats.perMode.distortion`/`stats.examState.distortion` aynı kalır.

**MODE_ID de değişirse (ör. "distortion" → "saturation", dosya adı dahil)**
— grep ile SAYILDI, TAHMİN edilmedi:

| Dosya | Ne değişir |
|---|---|
| `www/js/modes/distortion.js` | Dosya adı + `MODE_ID` sabiti (içerik/DSP DEĞİŞMEZ) |
| `www/js/app.js` | import yolu (satır 37), `THREE_WAY_MODE_IDS` dizisi (satır 64), en az 3 string karşılaştırması (`q.mode === "distortion"`, satır 3547/3860/3959), birkaç yorum |
| `www/js/core/mode-catalog.js` | `id`/`ad`/`aciklama` alanları (satır 46) |
| `www/js/core/guide-texts.js` | 3 yer: `MODE_GUIDE_TEXTS.distortion` (170), `MODE_OPTIONS_TEXTS.distortion` (220), `SPOTLIGHT_STEPS.distortion` (298) |
| `www/js/core/mode-visuals.js` | ikon anahtarı (satır 228, `distortion: "dist"`) |
| `www/js/core/level-sheet-terms.js` | zorluk-sayfası terimleri (satır 103-108) |
| `www/js/core/feedback-colors.js` | SADECE yorum, kod değişmez |
| `www/js/modes/kompresor.js` | SADECE yorum, kod değişmez |
| `test/distortion.test.mjs` (473 satır) | dosya adı + iç içe geçmiş `mode.MODE_ID`/açıklama string'leri |
| `e2e/` | **SIFIR referans bulundu** (grep ile doğrulandı) — e2e suite'i bu moda özel bir test İÇERMİYOR, hiçbir e2e dosyası etkilenmez |
| `www/js/core/paywall.js` | SADECE yorum (2 yer), kod değişmez |

**Toplam: 6 dosyada GERÇEK kod/string değişikliği + 1 test dosyası + dosya
adının kendisi = 8 dosya.** (feedback-colors.js/kompresor.js/paywall.js
SADECE yorum, zorunlu değil ama tutarlılık için güncellenebilir.)

## i) Kayıtlı kullanıcı verisi mod ID'sine bağlı mı? Migration gerekir mi?

**EVET, doğrudan bağlı — koddan doğrulandı (`core/storage.js`, `core/progress.js`):**

- `core/progress.js:46-47` (`modeXp()`): `stats.perMode[modeId].xp` —
  mod başına XP/seviye DOĞRUDAN `modeId` string'iyle (yani `"distortion"`)
  anahtarlanıyor.
- `core/progress.js:62-64` (`modeLevel()`): AYNI `stats.perMode[modeId]`
  + `stats.examState[modeId]` (sınav/parkur ilerlemesi de AYNI anahtarla).
- `core/storage.js:224-227` (`loadStats()`): `modeIds.forEach(id => { if
  (!s.perMode[id]) s.perMode[id] = freshModeState(); })` — yeni bir id
  görülünce SIFIRDAN bir kayıt AÇAR, eskisini SİLMEZ ama bir daha hiç
  OKUMAZ.

**`loadStats()`'ın kendi `legacyModeId` parametresi bu senaryoyu
ÇÖZMÜYOR** — o parametre SADECE `perMode` alanı HİÇ yokken (çok eski,
per-mode XP takibinden ÖNCEKİ kayıtlarda) tüm geçmiş XP'yi TEK bir moda
atamak için, TEK SEFERLİK bir göç. Distortion zaten `perMode`'u OLAN
(oynanmış) bir kullanıcı için bu dal HİÇ ÇALIŞMAZ — kodun kendi yorumu
(`storage.js:203-204`) AÇIKÇA söylüyor: *"perMode zaten varsa (yeni bir
mod id'si SONRADAN eklendiğinde) o yeni mod sıfırdan başlar, geçmiş XP'yi
MİRAS ALMAZ."*

**Sonuç: MODE_ID değişirse, distortion modunda önceden XP/seviye/sınav
ilerlemesi kazanmış bir kullanıcı, YENİ id altında SIFIRDAN başlar —
eski `stats.perMode.distortion`/`stats.examState.distortion` verisi
localStorage'da KALIR ama bir daha hiç OKUNMAZ (silinmez, sadece
erişilemez hâle gelir).** Akademi-geneli toplam XP'yi de etkiler
(`academyTotalXp()` tüm `modeIds` üzerinden `modeXp()` topluyor — yeni id
0'dan başlayınca toplam XP de o kadar DÜŞER).

**Migration YAZILABİLİR** (bu turda YAZILMADI, sadece gerekliliği
ölçüldü) — kavramsal olarak basit: `loadStats()`'a "eski id → yeni id"
eşlemesi verilip `s.perMode[eskiId]`/`s.examState[eskiId]` varsa VE
`s.perMode[yeniId]` YOKSA bir kereliğine KOPYALANIR (mevcut
`legacyModeId` deseninin YANINA, ONU DEĞİŞTİRMEDEN, AYRI bir dal olarak)
— küçük, tek seferlik bir iş, ama YAZILMADAN yayınlanırsa GERÇEK bir
kullanıcı-kaybı senaryosu.

---

# ÖZET

**Ölçülen gerçek:** Mod 4 matematiksel olarak GERÇEKTEN farklı WaveShaper
eğrisi kullanıyor (clamp/tanh/asimetrik-tanh/kübik), 4× oversample ile
aliasing korumalı, THD %0.46'dan (tape, en düşük) %38.66'ya (clip, en
yüksek) kadar GERÇEK bir yelpaze kapsıyor — bu yelpazenin İKİ UCU
(tape≈saf saturation, clip≈gerçek kare-dalga distortion) net biçimde
FARKLI kategoriler, ORTASI (soft/tube) GERÇEKTEN "arada".

**İsim önerisi (Logic'in kararı için VERİ, TALİMAT değil):** Mod TEK bir
isme ("Distortion" ya da "Saturation") indirgenirse UÇLARDAN biri
yanlış temsil edilir — kod bunu zaten BİLİYOR (guide-texts.js hem
"saturation" hem "distortion"u AYRI AYRI anıyor). "Saturation"a TAM
geçiş MODE_ID'yi de değiştirirse **GERÇEK bir kullanıcı-veri-kaybı
riski** taşıyor (madde i) — sadece kart adı ("ad" alanı) değişirse bu
risk SIFIR.

**Kod DEĞİŞTİRİLMEDİ.** `npm test`/`npm run test:e2e` bu turda
ÇALIŞTIRILMADI (gerek yoktu, hiçbir kaynak dosya değişmedi) — G249'un
son ölçümü (1390/1390, 19/19) hâlâ geçerli.

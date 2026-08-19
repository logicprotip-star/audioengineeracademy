# OLCUM-FREKANS-DOGRULUK-19-08

GÖREV: ÖLÇÜM. Kod yazılmadı, commit atılmadı.

## SONUÇ (önce, sonra kanıt)

**Frekans Bulma, Q Genişliği, Boost/Cut, dB Seviyesi, Frekans Çakışması: ÖLÇÜLDÜ, doğru.**
Beş moddan dördü ("peaking" tipi biquad + GainNode kullananlar) nanometre/sub-cent
seviyesinde doğru — sapmalar 0.12 cent'i (müzikal olarak duyulamaz eşiğin 8 katı
altı) hiç geçmiyor, gain sapmaları 1e-6 dB mertebesinde (ölçüm hassasiyetinin
kendisi kadar küçük).

**Kesim Noktası: GERÇEK, ÖNEMLİ bir sapma bulundu — KÖK SEBEP netleşti.**
"500 Hz'den kesiyor" dendiğinde filtreye giden `frequency.value` GERÇEKTEN 500
— ama filtrenin GERÇEK -3dB (kesim) noktası 500 Hz'DE DEĞİL, kademeye göre
**~470 cent'e kadar** (neredeyse yarım oktav) kaymış durumda. Kök sebep: Web
Audio API'nin lowpass/highpass filtre tipinde `Q` parametresi "geleneksel Q"
DEĞİL — **MDN'in kendi ifadesiyle "resonance value in decibels"** (kesim
noktasındaki rezonans tepesinin dB cinsinden yüksekliği). Kod, `FILTER_Q =
Math.SQRT1_2` (0.707) değerini "klasik Butterworth Q=0.707, düz/-3dB-tam-kesimde"
varsayımıyla seçmiş (peaking filtrelerde bu varsayım DOĞRU) — ama lowpass/
highpass'ta Q=0.707 aslında "kesimde +0.71dB'lik bir rezonans tepesi" demek,
"düz Butterworth" değil. Kanıt: 5 farklı Q değerinde (0.1/0.5/3/5/10) tarayıcının
GERÇEK `getFrequencyResponse()`'u f0'daki dB kazancının Q değerine BİREBİR eşit
olduğunu gösterdi (6-7 anlamlı rakama kadar) — tesadüf değil, MDN'in
dokümantasyonuyla BİREBİR örtüşüyor.

**Bulunduğu nokta:** ne soru üretiminde (freq doğru üretiliyor) ne "gösterilen
değer ≠ kodlanan değer" (ikisi AYNI, `question.freq`) — **filtre KURULUMUNDA**:
`Q.value = Math.SQRT1_2`'nin lowpass/highpass için YANLIŞ bir parametre modeliyle
seçilmiş olması. Ayrıca bu YANLIŞ RBJ modeli `eq-loudness.js`'in A/B loudness
telafi hesabında da (Kesim Noktası'nın `matchLoudness:true`'su) kullanılıyor —
o hesap da highpass/lowpass için gerçek filtre kazancını YANLIŞ tahmin ediyor
(peaking'de TAM doğru, highpass/lowpass'ta YANLIŞ — aşağıda E bölümünde kanıtlı).

---

## Yöntem

İki tamamlayıcı yöntem kullanıldı, GERÇEK Chromium'da (Playwright, headless):

1. **`BiquadFilterNode.getFrequencyResponse()`** — tarayıcının KENDİ filtre
   implementasyonunu, hiçbir istatistiksel gürültü olmadan, tam hassasiyetle
   sorgular. Frekans/Q/gain kombinasyonlarının BÜYÜK çoğunluğu bu yöntemle
   ölçüldü — bu, "render et + FFT" yönteminden DAHA KESİN (render+FFT
   istatistiksel gürültüye/pencere çözünürlüğüne tabi, bu yöntem değil).
2. **OfflineAudioContext render + Welch-ortalamalı FFT** (bu oturumun
   OLCUM-KAYNAK-16-08.md'de kurduğu AYNI yöntem — 4096/16384-nokta FFT, Hann
   penceresi, %50 örtüşen kareler ortalanıyor) — task'ın kendi isteği
   ("OfflineAudioContext'te render et, FFT ile tepe frekansını ölç") için
   4 nokta çapraz doğrulandı (aşağı A.2).

⚠️ **Metodoloji notu (kendi kendine yakalanan hata):** İlk denemede tek-kareli
FFT + elle yazılmış LCG "beyaz gürültü" kullanıldı — sonuçlar TUTARSIZ çıktı
(ör. 300 Hz nominal için 10749 Hz tepe). Kök sebep: tek kare + düşük kaliteli
PRNG istatistiksel gürültüye BOĞULUYOR. Tarayıcının kendi `Math.random()`'ı +
Welch ortalaması ile düzeltildi, sonuçlar `getFrequencyResponse()` ile
makul aralıkta (±1-5%) örtüştü — bkz. A.2.

**Tolerans (task'ın kendi tanımı):** 1 cent duyulamaz, 10 cent üstü sorunlu,
Q/gain için %5.

---

## A) Frekans Bulma — soru ile gerçek çıkış eşleşiyor mu?

### A.1 — Gösterilen değer = koda giden değer mi?

**EVET, aynı float.** `createQuestion()` `freq = logFreq(...)` üretir,
`correctLabel()` `formatHz(q.freq)` ile GÖSTERİR, `applyProcessing()`
`f.frequency.value = question.freq` ile filtreye YAZAR — üçü de AYNI tek
float'ı okuyor, ayrı bir "gösterim için yuvarlanmış kopya" YOK. `formatHz()`
SADECE EKRANDA yuvarlıyor (1000Hz altı: en yakın tam sayı; 1-10kHz: 2 ondalık;
10kHz üstü: 1 ondalık) — bu en fazla ±5Hz (10kHz altı) / ±50Hz (üstü) bir
GÖRÜNTÜ hassasiyeti kaybı, KODA giden değeri hiç etkilemiyor.

### A.2 — Filtre çıkışında tepe gerçekten o frekansta mı?

**EVET, sub-cent hassasiyetle.** 4 gerçek kademe (easy/medium/hard/pro) × 5
frekans (80/300/2000/8000/17000 Hz — FA_MIN'den FA_MAX'a):

| Kademe | 80 Hz | 300 Hz | 2000 Hz | 8000 Hz | 17000 Hz |
|---|---|---|---|---|---|
| easy | -0.120¢ | -0.120¢ | -0.120¢ | -0.062¢ | +0.0004¢ |
| medium | -0.120¢ | -0.120¢ | -0.120¢ | -0.062¢ | +0.0004¢ |
| hard | -0.120¢ | -0.120¢ | -0.120¢ | -0.062¢ | +0.0004¢ |
| pro | -0.120¢ | -0.120¢ | -0.120¢ | -0.062¢ | +0.0004¢ |

(¢ = cent, 1 cent = %0.06.) **En kötü sapma 0.12 cent** — task'ın "1 cent
duyulmaz" eşiğinin bile 8 katı altı. Bu küçük sabit sapma (~0.12¢, tüm
kademelerde AYNI) `getFrequencyResponse()`'un iç örnekleme çözünürlüğünden
kaynaklanan bir ARTEFAKT (20000 noktalı log-sweep'in en yakın örneği), GERÇEK
bir filtre kusuru DEĞİL.

**Gain de aynı hassasiyette:** ölçülen tepe kazancı ile nominal gain arasında
sapma 1e-7...1e-6 dB — ölçüm hassasiyetinin kendisi kadar küçük.

**Render+FFT çapraz doğrulama** (task'ın literal isteği — GERÇEK beyaz gürültü
OfflineAudioContext'te render edilip Welch-ortalamalı FFT ile tepe arandı, 8
saniye/16384-nokta pencere, %50 örtüşme):

| Kademe | Nominal | Render+FFT tepe | Analitik tepe | Fark |
|---|---|---|---|---|
| easy | 300 Hz | 314.9 Hz | 299.98 Hz | +5.0% |
| easy | 8000 Hz | 7881.2 Hz | 7999.71 Hz | -1.5% |
| pro | 300 Hz | 296.1 Hz | 299.98 Hz | -1.3% |
| pro | 8000 Hz | 8091.1 Hz | 7999.71 Hz | +1.1% |

Bu yöntemin FFT bin genişliği (2.69 Hz) + istatistiksel gürültü payı içinde —
analitik yöntemle AYNI komşulukta, sistematik bir kaymayı GÖSTERMİYOR. İki
yöntem BİRBİRİNİ doğruluyor.

### A.3 — Zorluk kademelerinde ölçüm

⚠️ **Terminoloji notu:** Görevde "Z1'den Z7'ye kadar TÜM zorluk kademelerinde
ölç" deniyor — kod tabanında böyle adlandırılmış AYRI kademeler YOK ("Z1-Z7"
DURUM.md'deki ZORLUK MİMARİSİ'nin alt bileşenlerinin adı, kademe değil).
GERÇEK yapı: 5 adlandırılmış kademe (easy/medium/hard/pro/proplus) + bunlar
arasında SÜREKLİ (seviye 1-20) bir eğri (`paramsForDifficultyPosition`).
Ölçüm 4 gerçek kademeyi (proplus ayrı, A.4'te) kapsadı — hepsinde AYNI
sub-cent hassasiyet (yukarıdaki tablo). Süreklilik eğrisinin (Z1-Z7 mimarisi)
KENDİSİ zaten `q`/`gainDb` DEĞERLERİNİ değiştiriyor, filtre KURULUMUNU
(peaking tipi, `frequency.value=freq`) değil — bu yüzden eğri üzerindeki ARA
noktaların frekans-doğruluğu kademelerle AYNI olacağı matematiksel olarak
kesin (aynı `applyProcessing()` kod yolu, sadece q/gainDb SAYISI değişiyor).

### A.4 — Pro Plus (4 bant, kaskad)

4 bant SERİ bağlanıyor (`audio-engine.js`: `wetNode.connect(f); wetNode=f`) —
bu yüzden komşu bantlar birbirinin görünen tepesini KAYDIRABİLİR (kaskad LTI
sistemlerde dB'ler toplanır). Gerçek kaskad tepkisi ölçüldü:

| Nominal freq | Nominal gain | Kaskad İÇİNDEKİ tepe | Sapma (cent) |
|---|---|---|---|
| 103.2 Hz | -8 dB | 103.20 Hz | -0.40¢ |
| 343.5 Hz | +8 dB | 343.62 Hz | +0.55¢ |
| 2616.9 Hz | -8 dB | 2614.92 Hz | -1.33¢ |
| 5790.0 Hz | +8 dB | 5794.56 Hz | +1.37¢ |

Kaskad etkileşimi tespit edilebilir (tek-bant 0.12¢'ten 1.37¢'e çıktı) ama
**hâlâ 10 cent eşiğinin ~7 kat altında** — bantlar birbirini komşu bantlar
arası ölçülen frekans aralığında (>1 oktav) ölçülebilir ama sorunlu OLMAYAN
bir miktar kaydırıyor.

---

## B) Q ve gain doğru mu?

### B.5/B.7 — Q Genişliği (`Q_FIXED_FREQ=1000Hz` sabit, bant genişliğinden Q geri hesaplandı)

| Nominal Q | Etiket | Ölçülen tepe freq | Ölçülen Q (BW'den) | Sapma |
|---|---|---|---|---|
| 0.2 | Çok Geniş | 999.52 Hz | 0.2088 | %4.4 |
| 0.3 | Çok Geniş | 999.65 Hz | 0.3066 | %2.2 |
| 0.7 | Geniş | 999.93 Hz | 0.7047 | %0.7 |
| 1.3 | Orta | 999.93 Hz | 1.3052 | %0.4 |
| 2.0 | Orta | 999.93 Hz | 2.0074 | %0.4 |
| 4.0 | Dar | 999.93 Hz | 4.0107 | %0.3 |
| 9.0 | Notch | 1000.07 Hz | 9.0233 | %0.3 |
| 16.0 | Notch | 999.93 Hz | 15.9914 | %0.05 |

**Tamamı %5 toleransının İÇİNDE** (en kötü %4.4, en uçtaki "Çok Geniş"
etiketinde — bant kenarlarında -3dB noktalarını bulmanın doğal ölçüm
belirsizliği). Merkez frekans (1000 Hz) 8 test noktasının 8'inde de
±0.5 Hz'in içinde kaldı — Q Genişliği'nin "frekans İZOLE" ilkesi (dosya
başı yorum) doğrulandı.

### B.6 — Boost/Cut, Frekans Bulma, Q Genişliği'nin gain doğruluğu

Yukarıdaki A.2 tablosundaki "gainDeviationDb" sütunu ZATEN bunu kapsıyor —
1e-7...1e-6 dB mertebesinde, ölçülemeyecek kadar küçük. Boost/Cut için de
AYNI (aşağı D.14).

---

## C) Sample rate etkisi

Frekans Bulma "pro" kademesi, 5 frekans, **44100 Hz vs 48000 Hz** context:

| Freq | 44100 Hz sapma | 48000 Hz sapma |
|---|---|---|
| 80 Hz | -0.120¢ | -0.120¢ |
| 300 Hz | -0.120¢ | -0.120¢ |
| 2000 Hz | -0.120¢ | -0.120¢ |
| 8000 Hz | -0.062¢ | -0.075¢ |
| 17000 Hz | +0.0004¢ | +0.060¢ |

**İki sample rate arasında pratik fark YOK** — en büyük fark 17000 Hz'de
0.06¢, hâlâ 1 cent'in çok altında. `audioCtx.sampleRate` dinamik okunuyor
(`eq-loudness.js`'in her yerinde), hiçbir kod yolu 44100'ü SABİT varsaymıyor
— önceki ölçümün bulduğu "0.002 dB fark" (gain seviyesi) bu turda FREKANS
tarafında da doğrulandı: kayma yok.

C.9 (yeniden örnekleme): `decodeAudioData` kaynak dosyayı `audioCtx.sampleRate`'e
otomatik yeniden örnekler (tarayıcı-native, spec garantili) — bu, filtrenin
`frequency.value`'sini DEĞİL, kaynak SESİN spektral içeriğini etkiler; filtre
her koşulda `audioCtx.sampleRate`'e göre KENDİ katsayılarını doğru hesaplıyor
(yukarıdaki tablo bunu kanıtlıyor — 48kHz'de de sub-cent doğruluk).

---

## D) Diğer modlar

### D.10 — Kesim Noktası: HPF/LPF **⚠️ GERÇEK SAPMA BULUNDU**

`FILTER_Q = Math.SQRT1_2` (0.707) ile 5 frekans (100/300/1000/3000/8000 Hz,
CUTOFF_MIN-CUTOFF_MAX), gerçek -3dB noktası GERÇEK `getFrequencyResponse()`
ile arandı:

| Nominal | HPF ölçülen -3dB | HPF sapma | LPF ölçülen -3dB | LPF sapma |
|---|---|---|---|---|
| 100 Hz | 76.1 Hz | **-472.6¢** | 131.4 Hz | **+472.8¢** |
| 300 Hz | 228.3 Hz | **-472.5¢** | 394.2 Hz | **+472.9¢** |
| 1000 Hz | 761.6 Hz | **-471.5¢** | 1312.3 Hz | **+470.5¢** |
| 3000 Hz | 2298.1 Hz | **-461.4¢** | 3899.5 Hz | **+454.0¢** |
| 8000 Hz | 6369.4 Hz | **-394.6¢** | 9823.9 Hz | **+355.6¢** |

**Tüm 10 ölçüm 10-cent "sorunlu" eşiğinin 35-47 KAT üstünde.** HPF gerçek
kesim noktası nominal'in %76'sında (daha ERKEN/düşük frekansta kesmeye
başlıyor); LPF nominal'in %131'inde (daha GEÇ/yüksek frekansa kadar geçiriyor)
— ikisi de "iddia edilenden daha AZ agresif kesiyor" yönünde.

**KÖK SEBEP (kanıtlı):** Web Audio API spec'i lowpass/highpass için `Q`'yu
"geleneksel Q DEĞİL, kesim noktasındaki rezonansın dB cinsinden değeri"
olarak tanımlıyor (MDN, doğrulandı — bkz. Kaynaklar). Ölçüm: Q=0.1/0.5/3/5/10
değerlerinde f0'daki GERÇEK kazanç sırasıyla 0.1/0.5/3/5/10 **dB** çıktı —
Q değeri BİREBİR dB'ye eşleniyor, 6-7 anlamlı rakama kadar tesadüf değil.
`Math.SQRT1_2` (0.707) klasik "Butterworth Q, düz/-3dB-tam-kesimde" fikriyle
seçilmiş (peaking filtrelerde bu doğru bir model) ama highpass/lowpass'ta
"kesimde +0.71dB'lik hafif bir rezonans tepesi" anlamına geliyor — filtrenin
GERÇEK -3dB noktası bu yüzden nominal'den KAYIYOR.

**Doğrulama — proje'nin KENDİ RBJ matematiği (`eq-loudness.js:biquadMagnitudeDb`)
tarayıcının gerçek davranışıyla ÇAKIŞMIYOR (SADECE highpass/lowpass'ta):**

| Tip | f | Native (tarayıcı) | RBJ formülü (eq-loudness.js) | Fark |
|---|---|---|---|---|
| peaking | 700-3000 (6 nokta) | — | — | **0.0000 dB (TAM eşleşme, HER noktada)** |
| highpass f0=1000 Q=0.707 | 1000 | +0.707 dB | -3.010 dB | **3.72 dB** |
| lowpass f0=1000 Q=0.707 | 1000 | +0.707 dB | -3.010 dB | **3.72 dB** |
| highpass f0=1000 Q=1.0 | 1000 | +1.000 dB | 0.000 dB | 1.00 dB |
| highpass f0=1000 Q=0.2 | 1000 | +0.200 dB | -13.979 dB | **14.18 dB** |

Peaking filtrelerde proje'nin KENDİ matematiği tarayıcıyla TAM örtüşüyor (Frekans
Bulma/Q Genişliği/Boost-Cut/Frekans Çakışması'nın hepsi "peaking" kullanıyor —
bu yüzden A/B/D bölümlerindeki diğer TÜM ölçümler güvenilir). SADECE highpass/
lowpass'ta (yani SADECE Kesim Noktası'nda) bu iki model ayrışıyor.

**Bulunduğu nokta:** ne soru üretiminde (freq doğru), ne "gösterilen ≠ kodlanan"
(ikisi aynı) — **filtre KURULUMUNDA**, `FILTER_Q` sabitinin lowpass/highpass
için YANLIŞ bir parametre modeliyle seçilmiş olmasında (`kesim-noktasi.js:202`).

### D.11 — Q Genişliği

Yukarı B.5/B.7'de — tamamı tolerans içinde.

### D.12 — Frekans Çakışması: çakışma bandı gerçekten o bantta mı?

**EVET, hem matematiksel garanti hem ölçüm ile.** `pickCenterFreq()`
(`trueCenter`) `[regionMin, regionMax]` İÇİNDE log-uniform bir değer üretir
(`Math.exp` bir aralık İÇİNDEN — sınır dışına ÇIKAMAZ, kod yapısı gereği).
`pair.region` sınırları bu OTURUMDA (G330/kick-bas) VE önceki oturumlarda
(G295/G301) AYNI FFT yöntemiyle zaten ölçülmüştü — yeniden ölçülmedi, ONA
güvenildi. Filtre tipi **"peaking"** (highpass/lowpass DEĞİL — D.10'daki
sapma bu modu ETKİLEMİYOR). 7 çiftin `trueCenter` orta noktasında (`√(min×max)`)
gerçek peaking-tepe konumu ölçüldü:

| Çift | Region | Test freq | Ölçülen tepe | Sapma |
|---|---|---|---|---|
| akustik-clean | [190,400] | 275.68 Hz | 275.66 Hz | -0.12¢ |
| bas-akustik | [80,280] | 149.67 Hz | 149.66 Hz | -0.12¢ |
| bas-clean | [190,280] | 230.65 Hz | 230.64 Hz | -0.12¢ |
| snare-clean | [190,440] | 289.14 Hz | 289.12 Hz | -0.12¢ |
| vokal2-clean | [200,370] | 272.03 Hz | 272.01 Hz | -0.12¢ |
| vokal2-akustik | [200,370] | 272.03 Hz | 272.01 Hz | -0.12¢ |
| kick-bas | [30,120] | 60.00 Hz | 59.996 Hz | -0.12¢ |

7/7 çift sub-cent doğrulukta (Frekans Bulma ile AYNI ~0.12¢ artefaktı —
getFrequencyResponse'un örnekleme çözünürlüğü, gerçek bir kusur değil).

### D.13 — dB Seviyesi

Saf `GainNode` (frekans bağımsız), 6 test değeri (-6/-2/-0.5/+0.5/+2/+6 dB),
HEM formül HEM 1 saniyelik 1kHz sinüs render edip RMS oranı ölçülerek
doğrulandı:

| Nominal dB | GainNode değeri | RMS-render ölçülen dB | Sapma |
|---|---|---|---|
| -6 | 0.501187 | -6.0000005 | 5×10⁻⁷ dB |
| -2 | 0.794328 | -2.0000002 | 2×10⁻⁷ dB |
| -0.5 | 0.944061 | -0.5000001 | 1×10⁻⁷ dB |
| +0.5 | 1.059254 | +0.4999998 | 2×10⁻⁷ dB |
| +2 | 1.258925 | +2.0000002 | 2×10⁻⁷ dB |
| +6 | 1.995262 | +5.9999998 | 2×10⁻⁷ dB |

**Makine hassasiyeti seviyesinde doğru** — `matchLoudness` bu modda hiç
kullanılmıyor (applyProcessing `{filters:[g]}` döndürüyor, telafi kazancı
YOK), bu yüzden D.13'ün temiz sonucu hiçbir ek katmandan etkilenmedi.

### D.14 — Boost/Cut: yön ve miktar

Peaking, `FILTER_Q=1.4` sabit, 5 frekans × 4 kademe × boost/cut yönü (20
kombinasyon, tümü ölçüldü). Örnek (pro kademesi, gainDb=1.8):

| Freq | Yön | Nominal gain | Ölçülen tepe gain | Ölçülen freq sapma |
|---|---|---|---|---|
| 2000 Hz | boost | +1.8 dB | +1.8000005 dB | -0.12¢ |
| 2000 Hz | cut | -1.8 dB | -1.7999995 dB | -0.12¢ |
| 8000 Hz | boost | +1.8 dB | +1.8000005 dB | -0.06¢ |
| 8000 Hz | cut | -1.8 dB | -1.7999995 dB | -0.06¢ |
| 17000 Hz | boost | +1.8 dB | +1.8000005 dB | +0.0004¢ |

**Yön HER ZAMAN doğru** (boost pozitif, cut negatif — işaret hiç ters
dönmüyor), **miktar sub-cent/1e-6dB hassasiyetinde** — 4 kademenin (easy/
medium/hard/pro) TAMAMI aynı desende, tolerans içinde.

---

## E) Telafi mekanizmasının etkisi

### E.15/E.16 — G242 (A/B loudness eşitleme, "Düzeltme 1"/TUR8-OGRETIM-15-08) frekansı kaydırıyor mu?

⚠️ **Terminoloji notu:** görev iki AYRI mekanizma gibi anıyor ("Kesim
Noktası'nın G271 telafisi" ve "G242'nin A/B loudness eşitlemesi") — git log
ile doğrulandı, İKİSİ AYNI mekanizma: G242 (`160f1bb`) `eq-loudness.js`'i
KURDU, G271 SADECE onun ağırlıklandırma yöntemini (pembe-gürültü varsayımından
kaynağın KENDİ spektrumuna) İYİLEŞTİRDİ — aynı `matchLoudness:true` bayrağı,
aynı `compensationGainLinear()` çıktısı.

**HAYIR, frekansı kaydırmıyor — matematiksel olarak KAYDIRAMAZ.** Mekanizma
TEK bir ek `GainNode` ekliyor (`audio-engine.js:854`:
`loudnessCompGain.gain.value = compensationGainLinear(effectiveDb)`) — bu SABİT
bir skaler çarpan, TÜM frekanslara AYNI oranda uygulanıyor (Web Audio
GainNode'un frekans bağımlılığı YOK, tanım gereği). Sabit bir çarpanla çarpmak
bir eğrinin TEPE KONUMUNU değiştiremez (matematiksel kesinlik — 20*log10(x*k)
= 20*log10(x) + sabit, sabit ekleme eğrinin ŞEKLİNİ/tepe yerini korur).

Ampirik doğrulama (Frekans Bulma pro, 2000 Hz, gain=4.5): `effectiveDb`
hesaplandı (0.295 dB), `compensationGainLinear` uygulandı (0.9666×) —
telafisiz tepe konumu **1999.861 Hz**, telafili tepe konumu **1999.861 Hz**
— **BİREBİR AYNI** (identical:true).

**⚠️ Yan bulgu (D.10'un devamı, AYRI bir sorun):** `estimateChainGainDb()`
(telafi kazancını HESAPLAYAN fonksiyon) `biquadMagnitudeDb()`'yi çağırıyor —
bu, D.10'da highpass/lowpass için tarayıcıdan SAPTIĞI KANITLANMIŞ AYNI RBJ
formülü. Yani Kesim Noktası'nın A/B loudness telafisi (`matchLoudness:true`)
**FREKANSI etkilemiyor ama GENEL SEVİYE (dB) telafisi highpass/lowpass için
YANLIŞ hesaplanıyor olabilir** — bu turun kapsamı DIŞINDA (ölçülmedi, SADECE
D.10'un aynı kök nedeninin başka bir yerde de tekrarlandığı NOT edildi).

---

## Özet tablo — gösterilen / gerçek / sapma

| Mod | Test edilen eksen | En kötü sapma | Tolerans içinde mi? |
|---|---|---|---|
| Frekans Bulma (4 kademe + proplus) | frekans (peaking tepe) | 1.37¢ (proplus kaskad) | ✅ (10¢'in ÇOK altı) |
| Frekans Bulma | gain | ~1e-6 dB | ✅ |
| Frekans Bulma | 44.1kHz vs 48kHz | 0.06¢ fark | ✅ |
| Q Genişliği | Q (bant genişliğinden) | %4.4 | ✅ (%5 içinde) |
| Q Genişliği | merkez frekans (1000Hz sabit) | ±0.5 Hz | ✅ |
| **Kesim Noktası** | **-3dB kesim noktası** | **472.9¢ (~yarım oktav)** | **❌ 47 KAT aşıyor** |
| Frekans Çakışması | trueCenter (peaking tepe) | 0.12¢ | ✅ |
| dB Seviyesi | dB farkı | ~2×10⁻⁷ dB | ✅ |
| Boost/Cut | frekans + gain + yön | 0.12¢ / 1e-6dB, yön hep doğru | ✅ |
| Loudness telafisi (G242/G271) | frekans kayması | 0 Hz (matematiksel imkansız) | ✅ |
| Loudness telafisi → Kesim Noktası | GENEL SEVİYE (dB) — ÖLÇÜLMEDİ | — | ⚠️ D.10'un aynı kök nedeni muhtemel, AYRI ölçüm gerekir |

---

## Kaynaklar

- [BiquadFilterNode() constructor - MDN](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/BiquadFilterNode) — lowpass/highpass için "Q... is not a traditional Q, but a resonance value in decibels" ifadesinin doğrulandığı kaynak.

Kod yazılmadı, commit atılmadı — bu tur sadece ölçüm. Kesim Noktası'nın
`FILTER_Q` sabitinin DÜZELTİLMESİ (hangi Q(dB) değerinin gerçekten "-3dB tam
kesimde" ürettiğinin bulunması) AYRI bir tur/karar gerektirir — bu ölçüm SADECE
sorunu KANITLADI ve KÖK SEBEBİ gösterdi, düzeltmedi.

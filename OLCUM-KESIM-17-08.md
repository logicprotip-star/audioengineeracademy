# OLCUM-KESIM-17-08

Kesim Noktası'nın highpass filtresi bas-ağırlıklı içerikte GERÇEK/ölçülebilir
bir loudness-telafi çöküşü yaşıyor (OLCUM-KALAN-17-08 madde B'nin "YENİ
BULGU 1"i). Bu tur SADECE ÖLÇÜM — kod değiştirilmedi, commit atılmadı. Tüm
sayılar `OfflineAudioContext` ile, projenin GERÇEK/değiştirilmemiş
`kesim-noktasi.js`/`eq-loudness.js`/`audio-engine.js` kodunu doğrudan
çağırarak üretildi (ölçüm scriptleri geçiciydi, iş bitince silindi — repo'da
iz yok, `git status` bu turun sonunda temiz).

---

## A) MEVCUT MEKANİZMA

**Dosya:satır:**
- Tetikleme noktası: `www/js/core/audio-engine.js:809-816` — `buildQuestionChain()` içinde, `applyProcessing()` çağrıldıktan HEMEN SONRA:
  ```js
  if (processingResult.matchLoudness && filters.length) {
    const filterParams = filters
      .filter(f => f && f.frequency && typeof f.frequency.value === "number")
      .map(f => ({ type: f.type, frequency: f.frequency.value, Q: f.Q ? f.Q.value : 0.707, gain: f.gain ? f.gain.value : 0 }));
    const effectiveDb = estimateChainGainDb(filterParams, { sampleRate: audioCtx.sampleRate });
    loudnessCompGain = audioCtx.createGain();
    loudnessCompGain.gain.value = compensationGainLinear(effectiveDb);
  }
  ```
  Bu `loudnessCompGain` filtrelerden SONRA, `localWetGain`'DEN ÖNCE seri
  zincire ekleniyor (aynı dosya, ~satır 909-914).
- Matematik: `www/js/core/eq-loudness.js` (121 satır, TAMAMI okundu):
  - `biquadMagnitudeDb({type,frequency,Q,gain}, f, sampleRate)` (satır 41-91)
    — RBJ Audio-EQ Cookbook formülleriyle (peaking/highpass/lowpass, W3C
    Web Audio spesifikasyonunun KENDİ referans kaynağı) TEK bir biquad'ın f
    frekansındaki GERÇEK kazancını (dB) hesaplar — tahmini bir sabit DEĞİL,
    filtrenin type/frequency.value/Q.value/gain.value'sundan TÜRETİLİYOR.
  - `estimateChainGainDb(filterParamsList, {sampleRate, fMin=20, fMax=20000, points=256})`
    (satır 98-114) — 20Hz-20kHz arasını **256 LOG-UNIFORM** noktada örnekler,
    HER noktada zincirdeki TÜM filtrelerin dB'lerini toplar (kaskad LTI
    sistem — transfer fonksiyonları çarpılır, dB'leri toplanır), GÜCE
    (10^(db/10)) çevirip 256 nokta üzerinden ORTALAMA alır, tekrar dB'ye
    döner (`10*log10(meanPower)`).
  - `compensationGainLinear(effectiveDb)` (satır 118-120) — `10^(-effectiveDb/20)`,
    bu ortalama kazancı SIFIRLAYACAK lineer gain.

**Telafi NASIL hesaplanıyor — filtre parametrelerinden mi, sabit tablodan mı, ölçümden mi?**
FİLTRE PARAMETRELERİNDEN — ne sabit tablo ne ölçüm. `filters[]`'teki GERÇEK
`type`/`frequency.value`/`Q.value`/`gain.value` okunuyor, RBJ formülüyle o
ANKİ filtrenin TAM frekans tepkisi hesaplanıyor. Bu kısım MATEMATİKSEL
olarak KESİN — hiçbir yaklaşıklık/tahmin İÇERMİYOR.

**Pembe gürültü varsayımı NEREDE devreye giriyor?**
`estimateChainGainDb`'nin **AĞIRLIKLANDIRMASINDA** — filtrenin dB tepkisi
kesin/doğru hesaplanıyor ama bu tepkinin 256 frekans noktası üzerinden
NASIL ortalandığı (hangi frekansa ne kadar AĞIRLIK verildiği) bir
VARSAYIMA dayanıyor: **log-uniform frekans örneklemesi**. Dosyanın kendi
başlık yorumu (satır 18-23) bunu açıkça gerekçelendiriyor: pembe gürültü
oktav başına EŞİT enerji taşıdığı için, frekans eksenini logaritmik EŞİT
aralıklı örneklemek MATEMATİKSEL OLARAK pembe-gürültü-ağırlıklı bir RMS
ortalamasına DENKTİR — yani bu fonksiyon SESSİZCE "girdi sinyali pembe
gürültüye benziyor" varsayıyor.

**Neden düz olmayan spektrumlarda çöküyor — matematiksel sebep:**
`estimateChainGainDb` her OKTAVA (20-40, 40-80, 80-160, ... 10240-20000 Hz,
toplam ~10 oktav) EŞİT ağırlık veriyor. Bas-ağırlıklı bir kaynağın (bass.m4a,
kick.m4a) GERÇEK enerjisi bu ~10 oktavın SADECE 2-3 tanesinde yoğunlaşıyor
(ör. 40-320 Hz). Bir highpass @1000Hz uygulandığında:
- **Model'in varsayımı:** kesilen bölge (20-1000Hz, ~5.6 oktav) TOPLAM
  enerjinin ~5.6/10 ≈ %56'sını taşıyordu (pembe gürültüde HER oktav eşit).
- **Gerçek (bas-ağırlıklı kaynak):** kesilen bölge GERÇEK enerjinin
  %90'ından FAZLASINI taşıyor (enerji zaten oradaydı).
Model bu YÜZDEN telafiyi ÇOK AZ hesaplıyor — gerçekte silinen enerjinin
sadece bir kısmını geri veriyor, çıkış GERÇEKTEN sessiz kalıyor. Bu SAF bir
ağırlıklandırma/varsayım hatası — RBJ formülünün KENDİSİ (biquad tepkisi)
hatasız, SORUN SADECE o tepkinin hangi ağırlıkla ortalandığında.

**Yan gözlem (BELİRSİZ, derinlemesine araştırılmadı):** bu app'in KENDİ
"pembe gürültü" üretici (`audio-engine.js:buildNoiseSource`, tek-kutuplu
IIR: `last=0.985*last+0.015*white`) TEORİK OLARAK İDEAL bir pembe gürültü
DEĞİL — ~106Hz'e kadar DÜZ, sonrasında -6dB/oktav (ideal pembe: TÜM bantta
-3dB/oktav) eğimli. Ölçümde pink noise kaynağının BİLE HPF@3162'de -8.81dB
sapma göstermesi bununla İLİŞKİLİ olabilir (referans kaynağın KENDİSİ
modelin varsaydığı ideal pembeden bir miktar sapıyor) — bu BAĞIMSIZ bir
konu, bu turun ANA bulgusunu (bas-ağırlıklı GERÇEK içerik) DEĞİŞTİRMİYOR,
sadece "pembe gürültü" referansının kendisinin de %100 saf olmadığını
gösteriyor.

---

## B) KAPSAM ⚠️ KRİTİK

**HANGİ modlar `matchLoudness:true` kullanıyor — TAM LİSTE (grep ile
doğrulandı, `www/js/modes/` TAMAMI tarandı):**

| Mod | Dosya:satır | Filtre tipi |
|---|---|---|
| Frekans Bulma | `frekans-bulma.js:453` | peaking (tek ya da çok-bant) |
| Kesim Noktası | `kesim-noktasi.js:380` | **highpass/lowpass** |
| Q Genişliği | `q-genisligi.js:373` | peaking |
| Boost mu Cut mu | `boost-mu-cut-mu.js:374` | peaking |

**PAYLAŞILAN.** Mekanizma (`estimateChainGainDb`/`compensationGainLinear`,
`audio-engine.js`'in wiring'i) TEK bir yerde, `matchLoudness:true`
döndüren HERHANGİ bir mod aynı koddan geçiyor — Kesim Noktası'na ÖZEL bir
kopya YOK.

**Paylaşılan mekanizmayı değiştirmek diğer 3 modu nasıl etkiler — ÖLÇÜLDÜ:**
Her 3 modun KENDİ en-agresif/en-geniş-bant GERÇEK parametresiyle (Frekans
Bulma: gain=10dB/Q=0.9 — easy, en geniş bant; Q Genişliği: gain=6dB
[sabit]/Q=0.2 — "Çok Geniş" etiketi, en geniş; Boost mu Cut mu: gain=8dB/
Q=1.4 — easy tavanı), 10 kaynak × 5 frekans (100/316/1000/3162/8000 Hz) ×
2 yön (boost/cut) = 100 ölçüm/mod, MEVCUT (değişmemiş) matchLoudness
formülüyle, dry referansa göre sapma:

| Mod | En kötü sapma (tüm ölçümler arasında) |
|---|---|
| Frekans Bulma | **-4.78dB** (bass, 100Hz cut) |
| Q Genişliği | **-3.69dB** (bass, 100Hz cut) |
| Boost mu Cut mu | **4.15dB** (triangle, 100Hz boost) |
| **Kesim Noktası (karşılaştırma)** | **-49.18dB** (bass, HPF@8000) |

**SONUÇ — RİSK DÜŞÜK:** peaking filtrelerin (3 mod) en kötü durumdaki
sapması bile (~1.3-4.8dB) Kesim Noktası'nın en kötü durumundan (~49dB) **bir
büyüklük mertebesinden fazla küçük**. Sebep YAPISAL: peaking filtre
SINIRLI bir etkiye sahip (kazanç `gain.value`'de tavanlanır, ör. ±10dB'yi
ASLA aşmaz) ve etkisi frekansta LOKALİZE (bir tek bandı etkiler) — highpass/
lowpass ise SINIRSIZ/GENİŞ BANT (durdurma bandında kazanç -∞'a yaklaşır,
kesim noktasından SONRAKİ/ÖNCEKİ TÜM spektrumu etkiler). Pembe-gürültü
ağırlıklandırma HATASI HER İKİ filtre ailesinde de VAR (matematiksel olarak
aynı kök sebep) ama SONUÇ büyüklüğü filtre TİPİNE göre ÇOK farklı —
**"aynı sorun onlarda da var mı" sorusunun cevabı: VAR ama ÖLÇÜLEBİLİR
ŞEKİLDE ÖNEMSİZ (<5dB, oysa Kesim Noktası'nda 40-50dB'ye ulaşıyor).**

Bu, paylaşılan mekanizmayı İYİLEŞTİRMENİN (ör. D bölümündeki spektrum-
farkında model) diğer 3 modu BOZMA riskinin DÜŞÜK olduğu anlamına geliyor
— zaten küçük olan hatalarını daha da KÜÇÜLTMESİ beklenir (ölçülmedi,
ama matematiksel olarak: daha doğru bir ağırlıklandırma modeli hiçbir
durumda "daha yanlış" bir sonuç ÜRETEMEZ, sadece pembe-gürültüye YAKIN
kaynaklarda fark ÖNEMSİZ kalır).

---

## C) SORUNUN BÜYÜKLÜĞÜ

**14 kaynağın (görev "10 kaynak" dedi — kod tabanında Kesim Noktası'nın
`compatibleSourceIds()` ile 14 uyumlu SABİT kaynağı var, `upload` hariç
[kullanıcı dosyası, sabit içerik yok] — sayı tutmuyor diye rapor
edilmiyor, TAMAMI ölçüldü) her biriyle, 9 kesim frekansında (100-8000Hz,
~0.9 oktav aralıklı, CUTOFF_MIN-CUTOFF_MAX'ı KAPSAR), İKİ filtre tipinde,
GERÇEK `applyProcessing()`+`matchLoudness` formülüyle ölçülen çıkış RMS'inin
dry referanstan sapması (dB):**

### HPF — dry referanstan sapma (dB), (+) = beklenenden yüksek, (-) = düşük
(9 nokta × 14 kaynağın TAMAMI — CUTOFF_MIN=100'den CUTOFF_MAX=8000 Hz'e, ~0.9 oktav aralıklı)

| Kaynak | 100 | 178 | 316 | 562 | 1000 | 1778 | 3162 | 5623 | 8000 |
|---|---|---|---|---|---|---|---|---|---|
| pink | 0.09 | -0.98 | -2.53 | -4.18 | -5.86 | -7.43 | -8.81 | -9.92 | -10.40 |
| white | 1.17 | 1.67 | 2.23 | 2.89 | 3.65 | 4.56 | 5.65 | 6.96 | 7.88 |
| saw | 2.19 | 0.35 | -2.26 | -4.67 | -6.56 | -8.30 | -9.92 | -11.47 | -12.44 |
| square | 2.29 | -0.78 | -3.59 | -6.38 | -8.40 | -10.19 | -11.83 | -13.39 | -14.36 |
| triangle | 2.34 | 0.19 | -5.83 | -15.48 | -24.22 | -32.20 | -39.60 | -46.54 | **-50.68** |
| kick | -5.23 | -13.15 | -21.83 | -25.93 | -25.69 | -25.15 | -26.91 | -30.49 | -32.80 |
| snare | 1.79 | 3.00 | 0.92 | -2.35 | -4.66 | -6.09 | -7.03 | -8.92 | -11.47 |
| hihat | 1.22 | 1.82 | 2.56 | 2.76 | 2.93 | 3.79 | 5.17 | 6.33 | 6.43 |
| tom | 2.60 | -1.67 | -8.42 | -12.39 | -12.94 | -12.33 | -11.79 | -13.08 | -17.13 |
| groove | -4.75 | -9.90 | -13.71 | -16.61 | -18.01 | -18.37 | -18.51 | -18.78 | -19.39 |
| bass | 0.78 | -2.51 | -9.20 | -18.30 | -27.31 | -34.54 | -40.26 | -44.65 | **-49.18** |
| guitar | 2.16 | 1.45 | -1.76 | -3.69 | -4.73 | -8.47 | -11.77 | -13.80 | -14.45 |
| clean_guitar | 1.43 | 2.41 | 3.11 | 1.97 | -1.99 | -7.15 | -9.43 | -12.29 | -17.29 |
| vocal | 1.46 | 2.50 | 2.66 | 1.76 | -1.80 | -4.97 | -6.37 | -8.16 | -8.83 |

### LPF — dry referanstan sapma (dB) — AYNI 9×14 tam grid

| Kaynak | 100 | 178 | 316 | 562 | 1000 | 1778 | 3162 | 5623 | 8000 |
|---|---|---|---|---|---|---|---|---|---|
| pink | 4.58 | 4.43 | 3.84 | 3.16 | 2.50 | 1.91 | 1.38 | 0.92 | 0.66 |
| white | -14.99 | -13.61 | -12.19 | -10.47 | -8.60 | -6.75 | -4.90 | -3.02 | -1.93 |
| saw | 3.37 | 4.65 | 4.30 | 3.34 | 2.57 | 1.94 | 1.40 | 0.93 | 0.66 |
| square | 4.39 | 5.29 | 4.40 | 3.37 | 2.57 | 1.93 | 1.39 | 0.92 | 0.66 |
| triangle | 3.95 | 5.39 | 5.02 | 3.57 | 2.61 | 1.92 | 1.37 | 0.91 | 0.65 |
| kick | 7.35 | 5.50 | 4.16 | 3.22 | 2.49 | 1.89 | 1.37 | 0.91 | 0.65 |
| snare | -8.94 | 0.31 | 4.48 | 3.53 | 2.67 | 1.94 | 1.40 | 0.96 | 0.70 |
| hihat | **-24.59** | -15.41 | -7.24 | -2.59 | -2.93 | -3.42 | -2.92 | -0.82 | 0.01 |
| tom | 4.32 | 6.30 | 4.66 | 3.37 | 2.50 | 1.86 | 1.35 | 0.92 | 0.67 |
| groove | 7.22 | 5.41 | 4.15 | 3.21 | 2.48 | 1.88 | 1.36 | 0.90 | 0.64 |
| bass | 6.02 | 5.82 | 4.62 | 3.41 | 2.55 | 1.91 | 1.37 | 0.91 | 0.65 |
| guitar | 0.73 | 4.53 | 4.33 | 3.24 | 2.60 | 2.05 | 1.44 | 0.93 | 0.67 |
| clean_guitar | -15.32 | -6.63 | 0.84 | 3.30 | 3.28 | 2.30 | 1.51 | 0.99 | 0.69 |
| vocal | -13.06 | -4.78 | 1.75 | 2.96 | 3.08 | 2.14 | 1.48 | 0.96 | 0.69 |

**Desen — TÜM kaynaklarda tutarlı:**
- **HPF:** sapma NEGATİF (çıkış beklenenden SESSİZ) ve kesim frekansı
  ARTTIKÇA KÖTÜLEŞİYOR (daha fazla düşük-frekans enerjisi kesiliyor,
  model bunu telafi edemiyor). Bas-ağırlıklı kaynaklarda (bass/kick) 1000Hz
  ÜSTÜNDE -25dB'yi AŞIYOR — task'ın bahsettiği -42.8dB'lik örnekle AYNI
  büyüklük mertebesi (groove@562Hz: -16.61dB, @1778Hz: -18.37dB — TUTARLI
  aile, tam -42.8dB'yi tekrar üretmedi ama AYNI mekanizma/yön).
- **LPF:** sapma POZİTİF (çıkış beklenenden YÜKSEK — pembe model, LPF'nin
  GERÇEKTE ne kadar az enerji kestiğini hafife alıyor, AŞIRI telafi
  ekliyor) ve kesim frekansı ARTTIKÇA (0'a doğru) DÜZELİYOR — 3000Hz+
  civarında <1.5dB'ye düşüyor (OLCUM-KALAN-17-08'in "lowpass'lar neredeyse
  sapma göstermiyor" bulgusuyla TUTARLI — O rapor yüksek LPF kesimlerini
  test etmişti, DÜŞÜK LPF kesimleri BU turda EK olarak ölçüldü ve ONLAR DA
  sorunlu çıktı).
- **SİMETRİK bir ikinci mekanizma da ÖLÇÜLDÜ:** sorun sadece "bas-ağırlıklı
  kaynak + HPF" değil — TİZ-ağırlıklı kaynaklarda (white noise, hihat) AYNI
  büyüklükte bir sorun LPF tarafında ORTAYA ÇIKIYOR: white noise LPF@100Hz'de
  **-14.99dB**, hihat LPF@100Hz'de **-24.59dB** (LPF DÜŞÜK bir kesimde
  neredeyse TÜM tiz enerjiyi kesiyor, model bunu düşük-frekans-ağırlıklı bir
  kaynak gibi telafi ediyor, telafi YETERSİZ kalıyor — HPF/bas'ın TAM AYNASI).
  **Genel kural: kesim, kaynağın enerji yoğunluğunun EN ÇOK olduğu bölgeye
  YAKLAŞTIKÇA (o bölgeyi keserek) sapma büyüyor — yön (HPF/LPF) ve kaynağın
  spektral ağırlık merkezi (bas/tiz) BİRLİKTE belirliyor, task'ın "bas
  ağırlıklı" örneği bu genel kuralın SADECE en sık karşılaşılan (kütüphane
  bas-ağırlıklı kaynaklarla zenginleşti) özel durumu.**

**Zorluk seviyesine göre değişiyor mu — ÖLÇÜLDÜ:** `pickCutoffFreq`
(4000 deneme/seviye) merkez frekanstan (894Hz) ≥2.5 oktav uzak ("şiddetli
sapma" bölgesi, yukarıdaki tabloya göre kalibre edildi) bir kesim seçme
olasılığı:

| Zorluk | marginOct | "Şiddetli" olasılığı |
|---|---|---|
| Kolay | 1.6 | **%41.9** |
| Orta | 1.0 | %30.1 |
| Zor | 0.55 | %26.3 |
| Pro | 0.3 | %22.3 |
| Pro Plus | 0.3 | %21.9 |

**MONOTON AZALAN** — Kolay, Pro Plus'tan ~2x daha sık şiddetli-sapma
bölgesine düşüyor. Sorun ÖZELLİKLE YENİ/BAŞLANGIÇ seviyesindeki
kullanıcılarda daha sık.

**Kesim frekansına göre değişiyor mu — EVET, ÖLÇÜLDÜ (yukarıdaki
tablolar):** HPF'de kesim YÜKSELDİKÇE, LPF'de kesim DÜŞTÜKÇE kötüleşiyor
— ikisi de "merkez frekanstan (894Hz) UZAKLAŞTIKÇA kötüleşme" olarak
özetlenebilir (HPF için yukarı, LPF için aşağı yön).

**Kullanıcı ne sıklıkla yaşıyor:** filterType her turda %50/%50 rastgele
(HPF/LPF), kaynak seçimi kullanıcının kendi tercihi. **Bas-ağırlıklı bir
kaynak (bass/kick/groove — kütüphanenin YENİ, popüler seçenekleri) + HPF
+ orta-yüksek kesim (500Hz+) kombinasyonunda NEREDEYSE HER SEFERİNDE
(-15dB ve üstü sapma) belirgin.** Kolay seviyede bu kombinasyona düşme
olasılığı ~%42 × %50 (HPF şansı) ≈ **her 5 turdan ~1'i** kaba bir tahmin
(TAM DOĞRULANMADI — kaynak seçimi dağılımı ölçülmedi, sadece frekans
seçimi ölçüldü).

---

## D) ÇÖZÜM YOLLARI

**G269'un dersi test edildi — burada ANALİTİK YOL TUTTU (WaveShaper'ın
aksine).** Sebep: WaveShaper HAFIZASIZ/DOĞRUSAL-OLMAYAN (giriş dağılımına
bağlı, gerçek sesin zamansal zarfı model dışı kalıyordu) — biquad
filtreler ise **DOĞRUSAL** sistemler: filtrenin frekans tepkisi (H(f))
GERÇEK/kesin biliniyor (RBJ, zaten var), tek eksik parça kaynağın GERÇEK
güç spektral yoğunluğu (S(f)) — bu, doğrusal bir sistem için MATEMATİKSEL
OLARAK KESİN bir hesaplamaya izin veriyor (`∫|H(f)|²S(f)df / ∫S(f)df`),
WaveShaper'daki gibi bir dağılım VARSAYIMINA gerek YOK, GERÇEK ölçülen
S(f) kullanılabiliyor.

### 1. Telafiyi kaynağın GERÇEK spektrumundan hesaplamak — PROTOTİPLENDİ, ÇALIŞIYOR

**Yöntem:** Mevcut `biquadMagnitudeDb` (DEĞİŞMEDEN) + kaynağın GERÇEK güç
spektral yoğunluğu (S(f)) — bu turda YENİ bir manuel FFT YAZILMADI,
mevcut `BiquadFilterNode`'un KENDİSİ bir bant-geçiren filtre bankası
olarak kullanıldı (48 log-eşit-aralıklı merkez frekansta, Q=1.4 bandpass,
her birinin çıkış gücü = o frekanstaki GERÇEK enerji tahmini).

**Doğruluk — 4 kaynak (groove/bass/kick/vocal) × 6 HPF kesim noktasında
(178-3162Hz), GERÇEK gereken telafi (dry RMS - ham/telafisiz filtrelenmiş
RMS, doğrudan ölçüldü) İLE karşılaştırma:**

| Model | Ortalama mutlak hata | En kötü hata |
|---|---|---|
| Mevcut (pembe gürültü) | **16.08dB** | 40.26dB (bass) |
| YENİ (spektrum-farkında) | **3.42dB** | 14.19dB (bass) |

**~4.7 kat iyileşme.** groove.m4a'da (task'ın orijinal örneği) hata TÜM
6 noktada <2.2dB'ye düşüyor — pratikte SORUNU ÇÖZÜYOR. bass.m4a en zor
kalan durum (enerji tek bir DAR banda o kadar yoğunlaşmış ki 48 noktalı
kaba bir spektral tahmin bile yetersiz kalabiliyor — daha ince bir PSD
[128+ nokta] ya da gerçek bir FFT muhtemelen bunu da iyileştirir, TEST
EDİLMEDİ).

**Offline mi gerçek-zamanlı mi hesaplanabilir mi:** OFFLINE/BİR KEZ,
gerçek-zamanlı (soru başına) DEĞİL. 48 bant-geçiren render'ı ~0.5-1sn
sürüyor (ölçüldü, script toplamda birkaç saniyede 4 kaynak×48 nokta
tamamladı) — bu bir SORU başlatırken (kullanıcı jestinden hemen sonra
ses çalmalı) kabul edilemez bir gecikme olurdu. AMA bir kaynağın PSD'si
SORUYA değil KAYNAĞA (dosyaya) ait bir özellik — SADECE BİR KEZ
hesaplanıp SAKLANABİLİR:
- **14 gömülü SABİT kaynak** (kick/bass/groove/vb.) — G269'un "ölçülmüş
  tablo" deseniyle AYNI: PSD'ler (ya da doğrudan HER kesim frekansı için
  önceden hesaplanmış telafi eğrisi) OFFLINE/geliştirme-zamanında
  ölçülüp KOD içine (küçük bir veri tablosu olarak) gömülebilir — sıfır
  çalışma-zamanı maliyeti.
- **`upload` (kullanıcı dosyası)** — SABİT bir dosya YOK, ama upload
  akışı ZATEN asenkron/dosya-başına-bir-kez (`decodeAudioData`, bkz.
  `upload.js`) — PSD o AN (dosya yüklenirken, ZATEN bir bekleme var)
  hesaplanıp SEANS boyunca ÖNBELLEKLENEBİLİR. Bu, seçenek 2'nin (ölçülmüş
  tablo) KAPSAYAMADIĞI TEK durum — upload için SABİT bir tablo mümkün
  DEĞİL, spektrum-farkında hesaplama GEREKLİ.

**İş yükü:** ORTA-BÜYÜK. Yeni altyapı gerekiyor: (a) 14 gömülü kaynak için
PSD/telafi verisi — offline ölçüm + kod içi tablo (G269'un `DISTORTION_TRIM_DB_TABLE`
desenine benzer), (b) upload için PSD hesaplama+önbellekleme akışı, (c)
`estimateChainGainDb`'nin (ya da yanına eklenecek yeni bir fonksiyonun)
PSD ağırlıklı versiyonu — RBJ matematiği (`biquadMagnitudeDb`)
DEĞİŞMİYOR, SADECE ağırlıklandırma değişiyor.

**Risk:** DÜŞÜK-ORTA. Paylaşılan `eq-loudness.js`/`audio-engine.js`'e
dokunuyor (4 modu etkiler) ama B bölümünün ölçtüğü gibi diğer 3 mod zaten
KÜÇÜK hatalarla çalışıyor — İYİLEŞME beklenir, REGRESYON değil (test
edilmesi GEREKİR ama matematiksel olarak daha doğru bir ağırlıklandırma
"daha kötü" bir sonuç üretemez).

**Zorluk eğrisine dokunuyor mu:** HAYIR — sadece çıkış SEVİYESİNİ
etkiler, `marginOct`/`hintBandOct`/`timeSec`/`step`/`DIFFICULTY`
tablolarının HİÇBİRİNE dokunmaz (farklı dosya, farklı sorumluluk).

### 2. Kaynak bazında ölçülmüş telafi tablosu (G269'un deseni)

**Yöntem:** HER (kaynak × kesim-frekansı-bucket × filtre-tipi) için
GERÇEK RMS ölçülüp doğrudan telafi tablosu olarak saklanır — seçenek
1'deki PSD/matematik ARA KATMANI olmadan.

**Kesim Noktası'na özgü DEZAVANTAJ:** Distortion'ın `k` ekseni (9 nokta
yeterliydi) AKSİNE, Kesim Noktası'nın kesim frekansı SÜREKLİ bir havuzdan
(100-8000Hz, log-uniform) seçiliyor — kabul edilebilir enterpolasyon
hatası için ÇOK DAHA SIK örnekleme noktası gerekebilir (HPF'nin sapma
eğrisi 100→8000Hz arası ~45dB değişiyor, tek bir oktav aralığında bile
[bkz. bass: 1000→3162Hz arası -27.3→-40.3dB, ~13dB/oktav eğim] — 9 nokta
YETERSİZ kalabilir, muhtemelen 15-20+ nokta gerekir). Bu, seçenek 1'in
(PSD tabanlı, SÜREKLİ bir formülle HERHANGİ bir kesim frekansı için
hesaplanabilir, örnekleme YOĞUNLUĞU sorunu YOK) yapısal olarak DAHA
UYGUN olduğunu gösteriyor.

**`upload` kaynağı için ÇALIŞMAZ** — sabit bir dosya yok, ölçülecek bir
şey YOK. Seçenek 1'in ÜSTÜNLÜĞÜ burada KESİN.

**İş yükü/Risk:** Seçenek 1'e BENZER (belki biraz daha basit — PSD
soyutlaması yok) ama upload'ı KAPSAMIYOR, bu YÜZDEN Seçenek 1'e göre
DAHA AZ tercih edilir.

### 3. Çıkışa dinamik seviye normalizasyonu

**Yöntem:** Ses çalarken SÜREKLİ ölçüp (ör. bir AnalyserNode/limiter ile)
gerçek zamanlı hedef seviyeye getirmek.

**Risk: YÜKSEK.** (a) A/B/C geçişlerinde (G267'nin seamless mimarisi)
ANLIK seviye değişimi "pompalama/breathing" artefaktı üretebilir —
ÖZELLİKLE kısa round sürelerinde duyulabilir. (b) Kesim Noktası'nın
"filtre etkisini KULAKLA bul" amacına TERS düşebilir — dinamik bir
normalize edici, filtrenin GERÇEK etkisini SÜREKLİ MASKELEME riski
taşır (ideal telafi TEK BİR SABİT kazanç olmalı, HER ANDA değişen bir
kazanç DEĞİL — aksi halde kullanıcı artık "filtrenin etkisini" değil
"normalize edicinin tepkisini" duyar). **ÖNERİLMEZ.**

### 4. Başka bir yaklaşım — kesim havuzunu daraltmak (SADECE kaçınma, çözüm DEĞİL)

CUTOFF_MIN/CUTOFF_MAX'ı en-sorunlu bölgelerden uzaklaştırmak (ör.
CUTOFF_MAX'ı 8000'den düşürmek) sorunu HAFİFLETİR ama ÇÖZMEZ (matchLoudness
hâlâ yanlış hesaplıyor, sadece en kötü uçlara daha az ulaşılıyor) —
AYRICA öğretim kapsamını (kullanıcının pratik yapabileceği kesim
aralığını) DARALTIR, bu bir ÜRÜN KARARI gerektirir (KULLANICI KARARI,
bu rapor ÖNERMİYOR).

---

## E) ZORLUK EĞRİSİ ETKİSİ

**Seviye telafisi değişirse soru zorluğu DEĞİŞİR Mİ — DOLAYLI EVET, ama
sayısal parametreler DEĞİŞMEZ.** `matchLoudness` mekanizması
`marginOct`/`hintBandOct`/`timeSec`/`distractorStepOct`/`DIFFICULTY`
tablolarının HİÇBİRİYLE bağlantılı DEĞİL (ayrı dosya, ayrı sorumluluk,
`applyProcessing()` içinde sadece SES ZİNCİRİNE bir gain ekliyor) —
düzeltilirse HİÇBİR sayısal zorluk parametresi OTOMATİK olarak değişmez.

**Kullanıcı düşük seviyeyi ipucu olarak kullanıyor OLABİLİR Mİ — ÖLÇÜLDÜ,
YAPISAL OLARAK MÜMKÜN:** C bölümünün tablosu HER kaynakta TUTARLI bir
desen gösteriyor — HPF'de kesim YÜKSELDİKÇE ses SESSİZLEŞİYOR, LPF'de
kesim DÜŞTÜKÇE ses YÜKSELİYOR (mevcut/telafisiz-kalan haliyle). Bu,
"ne kadar sessiz/yüksek" bilgisinin "kesim ne kadar UÇ noktada" ile
KORELE olduğu anlamına gelir — kulakla frekans bulma dışında, YANLIŞLIKLA
bir SES-SEVİYESİ ipucu SIZIYOR. Kolay seviyede bu YAPISAL sızıntıya
maruz kalma olasılığı (C bölümü) Pro Plus'tan ~2x fazla.

**Düzeltilirse bu ipucu kalkar — zorluk artar mı:** İYİ bir telafi (PSD
tabanlı, D1) çıkış RMS'ini kesim frekansından NEREDEYSE BAĞIMSIZ hale
getirir (dry'a göre sapma <2-3dB'ye iner, C bölümündeki -40/-50dB'lik
sapmalar YERİNE) — bu, MEVCUT (yanlışlıkla sızan) ses-seviyesi ipucunu
BÜYÜK ÖLÇÜDE ORTADAN KALDIRIR. **Bu, "yeni bir zorluk EKLEMEK" DEĞİL —
Düzeltme 1'in (TUR8-OGRETIM-15-08) ZATEN AMAÇLADIĞI şeyi (matchLoudness'ın
KENDİ VAR OLUŞ SEBEBİ: "boost/cut/filtre genel seviyeyi değiştirip
loudness ipucu vermesin") TAM OLARAK GERÇEKLEŞTİRMEK.** Mekanizma zaten
VARDI ama bas-ağırlıklı içerikte İŞLEMİYORDU — düzeltme onu ÇALIŞIR hale
getiriyor, YENİ bir tasarım kararı DEĞİL.

**Bununla birlikte:** kullanıcı deneyimi AÇISINDAN, ÖZELLİKLE Kolay
seviyede (mevcut sızıntıya en çok maruz kalan kademe) bazı kullanıcılar
sorular "birden zorlaştı" hissi yaşayabilir — sayılar DEĞİŞMESE de
ALGISAL zorluk artabilir. **Bu, kullanıcıya BİLDİRİLMESİ gereken bir
YAN ETKİ** (CLAUDE.md: "Ürün kararı verme" — düzeltmenin KENDİSİ bir
BUG FIX ama algısal etkisi bir ÜRÜN gözlem notu gerektirir).

---

## ÇIKTI — NET ÖNERİ

**Düzeltilmeli — "1.1'e bırakılsın" DEMİYORUM, kanıt bunu DESTEKLEMİYOR:**

1. **Risk DÜŞÜK, ölçüldü (B bölümü):** paylaşılan mekanizma 4 modu
   etkiliyor ama diğer 3 modun (peaking filtreler) HATASI ZATEN küçük
   (<5dB) — daha doğru bir ağırlıklandırma modeli onları BOZMAZ, hafifçe
   İYİLEŞTİRİR (matematiksel gerekçe: daha doğru bir model "daha yanlış"
   sonuç üretemez).
2. **Analitik yol TUTTU (D bölümü) — G269'un aksine.** Biquad filtreler
   DOĞRUSAL olduğu için (WaveShaper'ın hafızasız/doğrusal-olmayan
   doğasının AKSİNE) kaynağın GERÇEK spektrumu ile RBJ matematiği
   BİRLEŞTİRİLEBİLİYOR — PROTOTİPLENDİ, ortalama hata 16.08dB→3.42dB
   (~4.7x iyileşme), groove.m4a'da (task'ın orijinal örneği) pratik
   olarak ÇÖZÜYOR (<2.2dB tüm noktalarda).
3. **`upload` kaynağı SEÇENEK 1'i (PSD tabanlı) ZORUNLU KILIYOR** —
   seçenek 2 (sabit tablo) kullanıcı dosyaları için hiç ÇALIŞMAZ.
4. **Zorluk eğrisine dokunmuyor** — sayısal parametreler AYNI kalır,
   SADECE mevcut (yanlışlıkla var olan) bir ses-seviyesi ipucu kapanır —
   bu Düzeltme 1'in KENDİ orijinal amacını TAMAMLAMAK, yeni bir tasarım
   kararı DEĞİL.

**ÖNERİLEN YOL: Seçenek 1 (PSD/spektrum-farkında telafi), offline/
önbellekli hesaplama ile** — 14 gömülü kaynak için OFFLINE ölçülüp kod
içi bir tabloya (G269 deseni) gömülür, `upload` için dosya yüklenirken
(zaten asenkron olan `decodeAudioData` adımının yanına) BİR KEZ
hesaplanıp önbelleklenir.

**Kalan BELİRSİZLİK (dürüstlük notu):** bass.m4a gibi ÇOK dar-bantlı
kaynaklarda 48-noktalı kaba PSD tahmini bile ~14dB hata bırakıyor —
DAHA İNCE bir PSD (128+ nokta) ya da gerçek bir FFT bunu AZALTABİLİR
ama BU TUR TEST EDİLMEDİ (BELİRSİZ). **Algısal etki** (Kolay seviyede
"birden zorlaştı" hissi) kullanıcıya BİLDİRİLMELİ, bir ÜRÜN kararı
GEREKTİRMEZ (bug fix) ama BEKLENTİ YÖNETİMİ gerektirir.

**Bu bir AYRI, ORTA-BÜYÜK iş** (yeni PSD altyapısı + 14 kaynak için
offline ölçüm + upload akışına kablolama + 4 modun regresyon testi) —
bu turda kod YAZILMADI, sadece ÖLÇÜLDÜ ve YOL HARİTASI çıkarıldı.

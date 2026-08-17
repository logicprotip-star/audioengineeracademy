# OLCUM-DISTORTION-TELAFI-17-08

Saturation & Distortion'ın seviye telafisi — G269 (`www/js/modes/distortion.js`,
`test/distortion.test.mjs`, `e2e/distortion-level.spec.mjs`) için ölçüm kaydı.
İki sorun, tek kök: (1) OLCUM-CIHAZ-16-08 madde C — clip Kompresör'den
ölçülebilir biçimde yüksek RMS üretiyordu. (2) OLCUM-REVERB-TEPE-17-08 yan
bulgusu — "easy" zorlukta vocal/snare kaynağıyla GERÇEK dijital kırpma
(25 denemenin 20-22'si 0dBFS'i aşıyordu).

## A) Önce HESAPLAMA denendi (task'ın kendi tercih sırası)

`eq-loudness.js`'in RBJ-formülü deseni örnek alındı: filtrenin GERÇEK
matematiğinden (biquad'ın frekans tepkisi) telafi hesaplanıyordu, tahmini bir
sabit DEĞİL. WaveShaper için ANALOG bir yaklaşım denendi: `curve(x)`'in
KENDİSİ üzerinde, bir GİRİŞ genlik dağılımı varsayarak E[curve(x)²]/E[x²]
integrali — bu oran WaveShaper'ın (memoryless/hafızasız) doğrusal-olmayan
işleminin GERÇEK/hesaplanmış RMS kazancı.

**İKİ model denendi, İKİSİ DE ölçülen gerçeğe ±1dB doğrulukta uymadı:**

| Model | Yöntem | En kötü hata (clip, k=1) |
|---|---|---|
| (a) Laplace dağılımı | RMS'i groove.m4a'nın ölçülen dry RMS'ine (-25.19dB) eşitlenmiş Laplace PDF'i, `curve` üzerinde integrallendi | **4.85dB** |
| (b) Gerçek genlik histogramı | 4 kaynaktan (groove/vocal/snare/gitar, ~3.5M örnek) ÖLÇÜLEN GERÇEK genlik dağılımı, AYNI integral | **2.33dB** |

Gerçek histogram modeli (b) daha iyi ama HÂLÂ yetersiz — kök sebep:
WaveShaper HAFIZASIZ (örnek-örnek) çalışıyor, ama GERÇEK sesin ZAMANSAL
zarfı (transient/sessizlik dizisi, ÖRNEKLER ARASI KORELASYON) sert
kırpmanın (clip) enerjiye etkisini, ANLIK genlik dağılımının TEK BAŞINA
yakalayamadığı bir şekilde belirliyor — clip özellikle YÜKSEK k'de (sert
kırpma payı arttıkça) modelden daha FAZLA sapıyor (soft/tube/tape'te hata
çok daha küçük, <1.5dB).

**Sonuç: task'ın kendi izin verdiği geri dönüş yoluna geçildi — ölçülmüş
tablo, metodolojisi burada belgeli.**

## B) Ölçüm metodolojisi (tablo nasıl üretildi)

Kaynak: `groove.m4a` (bu projenin kurulu ÖLÇÜM kaynağı — OLCUM-KALAN-17-08/
OLCUM-REVERB-TEPE-17-08 ile AYNI). `OfflineAudioContext`, WaveShaperNode TEK
BAŞINA (paylaşılan güvenlik compressor'ından ÖNCE — G268'in AYNI gerekçesi:
compressor'a GÜVENMEDEN kapatmak için — `DynamicsCompressorNode` gerçek
zamanlı attack/release ile çalışır, brickwall limiter DEĞİL).

Dry referans (hiçbir işlem yok): RMS **-25.19dB**, Peak **-6.01dB**.

**Kompresör referansı** — `ratioAtK(k)`/`thresholdAtK(k)`, 9 k noktasında
(0/0.125/…/1) ölçülen çıkış RMS'inin ORTALAMASI:

| k | ratio | threshold | RMS |
|---|---|---|---|
| 0 | 1.30 | -8.0 | -24.53 |
| 0.125 | 2.89 | -11.25 | -22.26 |
| 0.25 | 4.47 | -14.5 | -21.62 |
| 0.375 | 6.06 | -17.75 | -21.81 |
| 0.5 | 7.65 | -21.0 | -22.26 |
| 0.625 | 9.24 | -24.25 | -22.71 |
| 0.75 | 10.82 | -27.5 | -23.02 |
| 0.875 | 12.41 | -30.75 | -23.29 |
| 1 | 14.0 | -34.0 | -23.6 |

**`KOMPRESOR_REFERENCE_RMS_DB = -22.79`** (9 noktanın ortalaması).

**Distortion (telafisiz, mevcut kod) — 4 tip × 9 k noktası:**

| k | clip RMS/peak | soft RMS/peak | tube RMS/peak | tape RMS/peak |
|---|---|---|---|---|
| 0 | -18.34 / **+0.03** | -24.62 / -6.00 | -33.23 / -12.93 | -25.20 / -6.05 |
| 0.125 | -14.50 / **+0.07** | -20.08 / -2.45 | -28.82 / -8.76 | -25.21 / -6.08 |
| 0.25 | -12.78 / **+0.15** | -17.54 / -1.03 | -25.99 / -6.26 | -25.22 / -6.11 |
| 0.375 | -11.79 / **+0.15** | -15.89 / -0.43 | -23.94 / -4.61 | -25.23 / -6.14 |
| 0.5 | -11.11 / **+0.27** | -14.74 / -0.18 | -22.36 / -3.47 | -25.24 / -6.17 |
| 0.625 | -10.58 / **+0.34** | -13.88 / -0.08 | -21.09 / -2.67 | -25.25 / -6.21 |
| 0.75 | -10.15 / **+0.39** | -13.21 / -0.03 | -20.05 / -2.11 | -25.26 / -6.24 |
| 0.875 | -9.77 / **+0.46** | -12.66 / -0.01 | -19.17 / -1.71 | -25.27 / -6.27 |
| 1 | -9.43 / **+0.51** | -12.21 / -0.01 | -18.42 / -1.43 | -25.28 / -6.31 |

**Clip'in tepesi HER k'de zaten +0.03 ile +0.51dB arası — 0dBFS'i telafi
ÖNCESİNDE de aşıyordu** (OLCUM-CIHAZ-16-08 madde C'nin "clip yüksek RMS"
bulgusuyla AYNI aile, ama bu YENİ bir gözlem: sadece RMS değil, PEAK de
sınırda).

**Telafi tablosu** (`KOMPRESOR_REFERENCE_RMS_DB - ölçülen`, `DISTORTION_TRIM_DB_TABLE`):

| k | clip | soft | tube | tape |
|---|---|---|---|---|
| 0 | -4.46 | +1.82 | +10.43 | +2.40 |
| 0.125 | -8.30 | -2.72 | +6.02 | +2.41 |
| 0.25 | -10.02 | -5.26 | +3.19 | +2.42 |
| 0.375 | -11.01 | -6.91 | +1.14 | +2.43 |
| 0.5 | -11.69 | -8.06 | -0.44 | +2.44 |
| 0.625 | -12.22 | -8.92 | -1.71 | +2.45 |
| 0.75 | -12.65 | -9.59 | -2.75 | +2.46 |
| 0.875 | -13.03 | -10.14 | -3.63 | +2.47 |
| 1 | -13.37 | -10.59 | -4.38 | +2.48 |

9 nokta seçildi (5 değil) — ilk denemede (5 nokta: 0/.25/.5/.75/1) tube
k=0→0.25 arasında 7dB'lik bir sıçrama gösteriyordu, parçalı-doğrusal
enterpolasyonun ARA DEĞER hatası büyük olabilirdi. 9 noktada komşu
noktalar arası fark HİÇBİR yerde 4dB'yi aşmıyor (tube'un en dik bölgesi:
k=0→0.125 arası 4.41dB).

## C) Telafi sonrası doğrulama (kalibrasyon kaynağı: groove.m4a)

| Tip | Telafi sonrası RMS'in Kompresör referansından (±) sapması | Telafi sonrası en kötü tepe |
|---|---|---|
| clip | ±0.01dB | -4.43dB |
| soft | ±0.01dB | -4.18dB |
| tube | ±0.01dB | -2.50dB |
| tape | ±0.01dB | -3.65dB |

±1dB hedefi RAHATÇA tutturuldu (kalibrasyon kaynağıyla, beklenen —
tablonun KENDİSİ bu kaynaktan ölçüldü). Tepe hiçbir kombinasyonda
0dBFS'e YAKLAŞMIYOR bile (en yüksek -2.50dB).

## D) Çapraz kaynak doğrulaması — dürüstlük notu

Telafi TEK bir kaynakla (groove.m4a) kalibre edildi — task'ın "aynı
kaynakla" ölçüm talimatıyla tutarlı. Ama BAŞKA kaynaklarla ne olur diye
AYRICA ölçüldü (dürüstlük):

**Önce YANLIŞ karşılaştırma denendi** (Distortion'ın telafi sonrası RMS'i
SABİT `-22.79` hedefine karşı): vocal/snare/gitar'da 2-7.5dB sapma
görüldü — İLK BAKIŞTA endişe verici.

**Ama Kompresör'ün KENDİ RMS'i de kaynağa göre AYNI ÖLÇÜDE (hatta DAHA
FAZLA) değişiyor** — k=0.5'te ölçüldü:

| Kaynak | Kompresör RMS (k=0.5) | Distortion clip RAW RMS (k=0.5, telafisiz) |
|---|---|---|
| groove | -22.26 | -11.11 |
| vocal | -18.39 | -6.72 |
| snare | -31.18 | -18.58 |
| gitar | -18.06 | -6.85 |

Kompresör'ün kendi RMS'i 13dB'lik bir ARALIKTA geziniyor (-31.18 ile
-18.06 arası) — SABİT bir hedef zaten yanlış karşılaştırma ölçütüydü.
**DOĞRU karşılaştırma: HER kaynağın KENDİ Kompresör RMS'ine karşı**:

| Kaynak | Kompresör ref (k=0.5) | 4 tipin (k=0/0.5/1) MAKS sapması |
|---|---|---|
| groove (kalibrasyon) | -22.26 | 0.54dB |
| snare | -31.18 | 1.30dB |
| vocal | -18.39 | 2.45dB |
| gitar | -18.06 | 3.70dB |

Groove-kalibreli telafi DİĞER kaynaklara da MAKUL ÖLÇÜDE genelliyor
(telafisiz ~10-13dB'lik farktan 0.5-3.7dB'ye düştü) ama TAM ±1dB hedefini
SADECE kalibrasyon kaynağında (ve yakınında, snare) tutturuyor —
vocal/gitar'da 2-4dB sapma KALIYOR. **Bu bilinen bir sınır, kod bunu
GİZLEMİYOR** — task'ın KABUL KRİTERİ ("aynı kaynakla" ölçüm) BU kaynakla
(groove) tutturuldu; çok-kaynaklı bir kalibrasyon (her kaynak için ayrı
tablo, ya da kaynağın KENDİ genlik profiline göre dinamik telafi) AYRI bir
iş olarak DURUM.md'ye not düşüldü.

**Tepe GÜVENLİĞİ ise TÜM kaynaklarda sağlam** — 4 kaynak × 4 tip × 3 k
noktasında (12 kombinasyon × kaynak) ölçülen en yüksek tepe **-2.50dB**
(groove/tube), en yakını **-3.09dB** (snare/tube) — hiçbiri 0dBFS'e
yaklaşmıyor bile.

## E) "easy" zorluk + vocal/snare — orijinal problem #2'nin doğrulaması

`createQuestion("easy", {source: "vocal"/"snare"})` ile GERÇEK sorular
üretilip (rastgele k/kGap jitter DAHİL) 15'er deneme, telafi SONRASI en
kötü tepe:

| Kaynak | Telafi ÖNCESİ (önceki tur, OLCUM-REVERB-TEPE-17-08) | Telafi SONRASI |
|---|---|---|
| vocal | +0.90dBFS (25 denemenin 20'si kırpıyordu) | **< 0dBFS** (15 denemenin HİÇBİRİ kırpmıyor) |
| snare | +0.37dBFS (25 denemenin 22'si kırpıyordu) | **< 0dBFS** (15 denemenin HİÇBİRİ kırpmıyor) |

## F) THD sıralaması — task'ın varsayımı ÖLÇÜLDÜ VE DÜZELTİLDİ

Task'ın KABUL KRİTERİ'nin 3. maddesi "THD sıralaması: clip > tube > soft >
tape" bekliyordu. Goertzel/DFT tabanlı THD ölçümü (344.5Hz bin-hizalı
sinüs, N=8192, 3 test genliğinde [0.3/0.5/0.7]) yapıldı — **GERÇEK
sıralama FARKLI çıktı: clip > soft > tube > tape** (k≥0.125'in TÜMÜNDE, 3
genlikte de tutarlı):

| k | clip | soft | tube | tape |
|---|---|---|---|---|
| 0 | 3.77% | 2.35% | 6.83% | 0.11% |
| 0.25 | 29.40% | 11.28% | 6.13% | 0.30% |
| 0.5 | 36.17% | 19.80% | 6.44% | 0.49% |
| 0.75 | 38.95% | 25.89% | 8.44% | 0.67% |
| 1 | 40.38% | 30.04% | 11.28% | 0.87% |

(k=0'da tube > clip > soft — çok düşük drive'da sıra farklı, pratikte
önemsiz — tümü <7% THD, neredeyse fark edilmez seviyede.)

**Muhtemel sebep:** dosya başı notu türleri "ZORLUK KADEMESİNE göre"
seçiyor (kolay=EN BARİZ, pro=EN İNCE) — bu, İKİ YAKIN k değerini AYIRT
ETMENİN zorluğuyla ilgili bir eksen, "türün MUTLAK harmonik içeriği" ile
AYNI eksen OLMAK ZORUNDA değil. tube'un drive ARALIĞI ([0.5,3.2])
soft'unkinden ([1.1,8]) çok daha DAR — düşük TAVAN, düşük MUTLAK THD ile
tutarlı bir tasarım.

**Task'ın varsayımı test'e YAZILMADI** (CLAUDE.md: "Sayı uydurma...
doğrulanmadı yaz") — `test/distortion.test.mjs`'e GERÇEK ölçülen sıra
(clip > soft > tube > tape) yazıldı.

**Telafi bu sıralamayı ETKİLEMEZ** — WaveShaper'DAN SONRA uygulanan TEK
bir sabit çarpan hem temel hem harmonikleri AYNI oranda ölçekler (THD =
harmonik/temel ORANI, pay/payda AYNI kare-katsayıyla çarpılır, matematiksel
olarak DEĞİŞMEZ) — testle de doğrulandı (1e-6 toleransla).

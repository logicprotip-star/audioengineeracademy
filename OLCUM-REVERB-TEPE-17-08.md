# OLCUM-REVERB-TEPE-17-08

Reverb'in Hall tipinin (ve ölçüldüğünde Room/Plate'in de) 0 dBFS'i aşan GERÇEK
dijital kırpması — G268 (`www/js/modes/reverb.js`, `test/reverb.test.mjs`,
`e2e/reverb-peak.spec.mjs`) için ölçüm kaydı. Metodoloji: `OfflineAudioContext`,
GERÇEK ses dosyaları (vocal/gitar/groove/snare — reverb'in uyumlu kaynak
listesi), reverb.js'in DEĞİŞTİRİLMEMİŞ `applyProcessing()`/
`generateImpulseResponse()`'u. Kaynak: OLCUM-KALAN-17-08.md madde B'nin
"YENİ BULGU 2"si (Hall k=0.5, groove.m4a, FULL CHAIN: +1.0dBFS peak).

## A) k-taraması — hangi k en kötü tepeyi üretiyor

vocal.m4a, 12 deneme/nokta, `applyProcessing()`'in KENDİ çıkışı (paylaşılan
güvenlik compressor'ından ÖNCE — bkz. gerekçe aşağıda madde D):

| k | Room | Hall | Plate |
|---|---|---|---|
| 0 | +2.11 | +9.56 | +7.46 |
| 0.25 | +4.65 | +12.04 | +8.33 |
| **0.5** | **+5.58** | **+12.77** | **+9.06** |
| 0.75 | +3.98 | +11.32 | +8.49 |
| 1 | -0.43 | +4.55 | +2.32 |

**k=0.5 ÜÇ TİP İÇİN DE en kötü nokta** — kısa decay/az yoğunluk (k→0) kadar
iyi sönmüyor, uzun decay/yüksek yoğunluk (k→1) kadar da yayılıp düzleşmiyor,
ortada en dik/tepeli. Bu ÖNEMLİ: `COMP_BASE_K=0.5`, HER round'da 2/3
varyantın (AYNI çift) SABİT k değeri — yani en kötü durum, TEORİK bir uç
değil, HER round'da fiilen kullanılan nokta.

## B) k=0.5'te en kötü durum — 4 kaynak × 40 deneme

IR üretimi `Math.random()` kullanıyor (KİLİT, `generateImpulseResponse`'a
dokunulmadı) — HER `applyProcessing()` çağrısı FARKLI bir IR üretiyor, tek
ölçüm istatistiksel olarak yetersiz kalırdı (bkz. madde C'nin varyans notu).

| Tip | vocal | gitar | groove | snare | **En kötü** |
|---|---|---|---|---|---|
| Room | +5.59 | **+6.84** | +6.72 | +2.49 | **+6.84** |
| Hall | **+13.20** | +10.91 | +10.68 | +6.64 | **+13.20** |
| Plate | **+10.00** | +7.96 | +9.43 | +4.53 | **+10.00** |

**ÜÇ TİP DE 0 dBFS'i geçiyor** — Hall en kötüsü ama Room ve Plate de
GERÇEKTEN kırpıyor, sadece "Hall'e özgü" bir sorun değil.

## C) Run-to-run varyans (neden tek ölçüm yetersiz)

3 hızlı tekrar (groove.m4a, worst-of-3-k tek run):

| Tip | run 1 | run 2 | run 3 |
|---|---|---|---|
| Room | +3.97 | +2.99 | -1.39 |
| Hall | +6.54 | +6.09 | +6.67 |
| Plate | +6.22 | +4.78 | +3.66 |

Room'un tek-run yayılımı ~5.4dB — `Math.random()`'ın tek-sample IR
gürültüsü, EXTREME-VALUE (max) istatistiği olarak GERÇEK varyans taşıyor.
Bu yüzden telafi kararı TEK bir ölçüme değil, madde B'nin 160-örneklemli
(4 kaynak×40 deneme) worst-case'ine dayandırıldı.

## D) Neden compressor'dan ÖNCE ölçüldü

Önceki rapor (OLCUM-KALAN-17-08) FULL CHAIN'i (paylaşılan güvenlik
compressor DAHİL, threshold=-16dB/ratio=2.2:1) ölçmüştü ve Hall'ü SADECE
+1.0dBFS bulmuştu — bu turun ÖN-compressor ölçümü (+13.2dBFS worst-case)
çok daha yüksek. Fark GERÇEK: compressor bir miktar yardımcı oluyor ama
`DynamicsCompressorNode` gerçek zamanlı attack/release ile çalışıyor,
brickwall limiter DEĞİL — hızlı transientler compressor tepki vermeden
kırpabiliyor (önceki raporun ÖLÇTÜĞÜ +1.0dBFS bunun KANITI: compressor
VARKEN bile kırpma oluyordu). Bu yüzden telafi, compressor'ın yardımına
GÜVENMEDEN, modun KENDİ çıkışında (paylaşılan compressor'dan önce)
uygulandı — OLCUM-KALAN-17-08 madde B'nin kendi önerisiyle AYNI gerekçe
("paylaşılan compressor'ı değiştirmek TÜM 12 modu etkiler, moda özel
telafi daha güvenli").

## E) Telafi kararı — TEK ortak sabit, tip bazında DEĞİL

Ayrı ayrı (sadece kendi tepesine göre) kalibre edilseydi: Room ~-9dB,
Hall ~-15.5dB, Plate ~-12dB gerekirdi. Bu ÖLÇÜLDÜ VE REDDEDİLDİ: Plate'in
brightness'ı (0.85) Hall'ünkinden (0.4) çok yüksek — bu Plate'in IR'sine
Hall'den DAHA YÜKSEK bir crest factor (tepe/RMS oranı) veriyor. Ayrı
telafi sonrası RMS'ler (k=0.5 taban RMS: Room -18.7dB/Hall -8.4dB/
Plate -10.2dB): Room -27.7dB, Hall -23.9dB, Plate -22.2dB — **Plate,
Hall'ü GEÇERDİ**, G243'ün amacını (Hall gerçekten büyük duyulsun) ezerdi.

**Karar: TEK ortak sabit, `REVERB_OUTPUT_TRIM_DB = -16`** — ÜÇÜ de AYNI
dB kadar kısıldığı için aralarındaki fark MATEMATİKSEL OLARAK BİREBİR
korunuyor (Düzeltme 2'nin normalize=false ile koruduğu enerji farkından
TAMAMEN bağımsız). `applyProcessing()`'in `output` GainNode'una (kuru+ıslak
TOPLAMININ AYNI anda AKTIĞI nokta) uygulanıyor — dry/wet ORANI (Düzeltme
2'nin kendi kabul kriteri) tek satır etkilenmiyor, sadece bu tipin/
varyantın TOPLAM seviyesi düşüyor.

Telafi sonrası (madde B'nin worst-case'i - 16dB): Room -9.16dB, Hall
-2.80dB, Plate -6.00dB — üçü de task'ın önerdiği -1dBFS tavanın AÇIKÇA
altında, ekstra pay bırakıyor (160 örneklem sonsuz değil, madde C'nin
gösterdiği varyansa karşı marj).

## F) AYNI KALIP BAŞKA NEREDE — 12 modun tepe taraması

groove.m4a, FULL CHAIN (mod + paylaşılan güvenlik compressor), "medium"
zorluk (Distortion ayrıca TÜM zorluklarda + 3 kaynakla ayrı test edildi,
aşağıda):

| Mod | Peak (dB) | RMS (dB) |
|---|---|---|
| Frekans Bulma | -5.64 | -24.29 |
| Kesim Noktası | -5.74 | -24.31 |
| Q Genişliği | -5.75 | -24.31 |
| Boost mu Cut mu | -5.72 | -24.31 |
| dB Seviyesi | -4.31 | -22.78 |
| Stereo Genişlik | -11.43 | -30.12 |
| Pan Konumu | -10.39 | -28.91 |
| Kompresör | -5.84 | -21.38 |
| **Reverb (düzeltme SONRASI)** | **-12.16** | -26.68 |
| Tonal Denge | -5.91 | -24.51 |
| Distortion (medium) | -0.86 | -14.98 |
| Frekans Çakışması (3 çift) | -2.71 .. -4.48 | — |

**11/12 mod güvenli** (Distortion "medium"'da bile en yakını, ama HÂLÂ
0dBFS'in altında).

**🔴 YENİ BULGU — Distortion "easy" zorlukta, vocal/snare kaynağıyla
GERÇEKTEN 0dBFS'i AŞIYOR** (OLCUM-CIHAZ-16-08 madde C'nin ölçtüğü
"clip k=0.5, groove, -4.2dB peak"den FARKLI bir kombinasyon — o rapor
"easy" zorluğu VEYA vocal/snare kaynağını test ETMEMİŞTİ):

| Kaynak | Deneme | En kötü tepe | 0dBFS üstü sayısı |
|---|---|---|---|
| vocal | 25 | **+0.90 dBFS** | 20/25 |
| snare | 25 | **+0.37 dBFS** | 22/25 |
| groove | 25 | -0.32 dBFS | 0/25 |

"easy" zorluk düşük drive'a karşılık gelir ama düşük drive'da makyaj
kazancı telafisi de YOK (OLCUM-KALAN-17-08 madde B'nin kendi bulgusu:
telafi drive'a bağlı, "soft" tipte k=0'da telafi ~0dB) — düşük-drive
sinyalin KENDİSİ (WaveShaper'dan NEREDEYSE değişmeden geçen kaynak) zaten
vocal/snare gibi tepe-yoğun kaynaklarda kendi başına 0dBFS'e yakın/üstünde
olabiliyor. **Bu turda DÜZELTİLMEDİ** (task'ın kendi sınırı — "düzeltme
AYRI iş olur, bu turda sadece tespit") — DURUM.md AÇIK İŞLER'e eklendi.

**Frekans Çakışması** (kick-bas/vokal-gitar/snare-gitar, previewGainDb
verilmediği normal soru akışı — filtreler gain=0/no-op) güvenli.

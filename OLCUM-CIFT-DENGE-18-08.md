# OLCUM-CIFT-DENGE-18-08

Ölçüm görevi. Kod YAZILMADI, dosya DEĞİŞTİRİLMEDİ, commit ATILMADI —
`git status --short` bu turun SONUNDA sadece önceki turların OLCUM-*.md
dosyalarını gösteriyor.

## Yöntem

**Gerçek m4a decode + gerçek render** — Chromium + Web Audio API
(`AudioContext.decodeAudioData` + `OfflineAudioContext`), projenin
KENDİ e2e paketinin kanıtlanmış yöntemiyle AYNI (`e2e/reverb-peak.spec.mjs`
"Playwright+OfflineAudioContext+gerçek ses dosyalarıyla" — bu ölçüm de
AYNI yaklaşımı, geçici bir script'te, kullanıyor).

**Bant-sınırlı seviye:** her kaynak `highpass(bölge-alt-sınırı, Q=0.707)`
+ `lowpass(bölge-üst-sınırı, Q=0.707)` (2. derece kademeli, standart
bandpass) zincirinden AYRI AYRI render edilip RMS→dBFS hesaplandı.

**Zamansal (concurrent) ölçüm — task'ın kendi uyarısı gereği:**
`offsetA`/`offsetB` (SOURCE_PAIRS'ten, G288) UYGULANARAK (gerçek
uygulamanın `buildSampleSource(path, offsetSec)` mantığıyla BİREBİR —
`AudioBufferSourceNode.start(0, offsetSec % duration)` + `loop=true`)
100ms'lik pencerelerde HER İKİ kaynağın KENDİ zarfının tepesine göre
-20dB üstünde olduğu anlar "eşzamanlı" sayıldı, SADECE o pencerelerdeki
örneklerden RMS hesaplandı. **"Tüm sinyal" (whole) ORTALAMASI da AYRICA
hesaplanıp KARŞILAŞTIRILDI** — aşağıda GÖRÜLECEĞİ gibi bu ikisi BAZI
çiftlerde ÇARPICI ŞEKİLDE farklı çıktı, task'ın "sadece biri çalarken
ölçmek yanıltıcı olur" uyarısı SOMUT OLARAK doğrulandı.

**Pair 6 (vokal+arpej) region-bulma:** Welch periodogramı (4096-nokta
FFT, Hann pencere, %50 örtüşme — G288/G281 ile AYNI yöntem), HER İKİ
kaynağın TÜM (SADECE tepeyi içeren TEK küme DEĞİL) -15dB-üstü kümeleri
bulunup ARALARINDAKİ TÜM çakışan bölgeler listelendi (vokal ÇOK-
formantlı olduğu için TEK küme yöntemi YANLIŞ SONUÇ verirdi — aşağıda
detay).

---

## 1-5: MEVCUT SOURCE_PAIRS'in region'larıyla ölçüldü

⚠️ **Task'ın verdiği referans bantlar SOURCE_PAIRS'teki GÜNCEL
değerlerle UYUŞMUYORDU** (task madde 1: "195–1114 Hz" — koddaki GERÇEK
değer `[190,400]`; madde 2/3 YAKINDI). Bu, kod tabanının KENDİ G288
notunda ZATEN belgelenmiş bir durum ("task'ın referansı [195,1114]Hz —
üst sınırda büyük fark... task'ın kendi talimatı 'farklı çıkarsa kendi
ölçümünü kullan' gereği BENİM ölçümüm kullanıldı") — bu tur da AYNI
kuralı izledi: **SOURCE_PAIRS'teki (koddaki) region kullanıldı, task'ın
mesajındaki eski/farklı sayılar DEĞİL.**

| Çift | Region (Hz, kod) | A seviyesi (whole/conc) | B seviyesi (whole/conc) | Fark (conc, B−A) | Yüksek olan |
|---|---|---|---|---|---|
| **akustik-clean** (Akustik Gitar A / Clean Gitar B) | [190,400] | -24.59 / **-22.72** | -21.23 / **-19.83** | **+2.89 dB** | Clean Gitar |
| **bas-akustik** (Bas A / Akustik Gitar B) | [80,280] | -20.20 / **-18.93** | -22.65 / **-20.85** | **-1.92 dB** | Bas |
| **bas-clean** (Bas A / Clean Gitar B) | [190,280] | -25.22 / **-24.06** | -24.01 / **-23.07** | **+0.99 dB** | Clean Gitar |
| **snare-akustik** (Snare Geç A / Akustik Gitar B) | [170,400] | -30.47 / **-20.10** | -23.90 / **-20.04** | **+0.06 dB** | (eşit) |
| **snare-clean** (Snare Geç A / Clean Gitar B) | [190,440] | -30.54 / **-19.95** | -20.80 / **-18.79** | **+1.16 dB** | Clean Gitar |

(dB değerleri o çiftin KENDİ bandındaki dBFS — mutlak seviye, iki kaynak
ARASINDAKİ farkı okumak için kullanılıyor, SOURCE_PAIRS'in kendisi
KARŞILAŞTIRMALI bir "master" seviyeye sahip değil.)

## ⚠️ EN ÇARPICI BULGU — "sadece biri çalarken ölçmek" GERÇEKTEN yanıltıyor

Snare çiftlerinde **whole-signal ölçüm ile concurrent (eşzamanlı) ölçüm
TAMAMEN FARKLI bir tabloya işaret ediyor:**

| Çift | Whole fark (B−A) | Concurrent fark (B−A) | Fark-arası-fark |
|---|---|---|---|
| snare-akustik | **+6.58 dB** | **+0.06 dB** | **6.5 dB'lik yanılgı** |
| snare-clean | **+9.74 dB** | **+1.16 dB** | **8.6 dB'lik yanılgı** |

**Sebep:** Snare_late KISA/vurgulu bir örnek — gitar SÜREKLİ çalarken
snare SADECE arada bir "vuruyor". Sinyalin TAMAMI üzerinden ortalama
alınırsa gitarın "sessiz aralıklardaki de dahil" sürekliliği snare'i
GERÇEKTEN OLDUĞUNDAN ÇOK DAHA SESSİZ gösteriyor (%9'dan az bir zaman
dilimi HER İKİSİ de gerçekten sesliyken — `concWindows: 11/120` ve
`9/120`, yani ~%9/%7.5). **AMA gerçekten İKİSİ birlikte çaldığında
(snare vurduğu anda) denge NEREDEYSE MÜKEMMEL** (0.06dB/1.16dB). Bu,
task'ın kendi öngörüsünü (whole-signal yanıltıcı olur) SOMUT sayılarla
doğruluyor — snare çiftlerinde whole-signal'e bakıp "gitar ÇOK yüksek"
sonucuna varmak YANLIŞ olurdu.

⚠️ **Düşük örneklem uyarısı:** snare çiftlerinin concurrent ölçümü
SADECE 9-11 pencereye (0.9-1.1 saniye toplam ses) dayanıyor — bu az
sayıda "gerçek vuruş anı" örneği, sonuç YÖN olarak GÜVENİLİR (task'ın
kendi -15/-20dB eşleşme mantığıyla TUTARLI, "geç başlayan" snare'in
GERÇEK vuruş anlarını yakalıyor) ama TEK bir dB rakamı olarak (0.06 ya
da 1.16) AŞIRI kesin okunmamalı — BELİRSİZLİK PAYI VAR.

---

## 6: vokal + arpej gitar (SOURCE_PAIRS'ta HENÜZ YOK)

### Region — kendi ölçümüm task'ın verdiği 250-500Hz'DEN FARKLI çıktı

Vokal ÇOK-formantlı (kendi global tepesi **1087Hz**'de) — TEK "tepeyi
içeren küme" yöntemi (diğer 5 çiftte kullanılan) burada **YANLIŞ
SONUÇ VERİRDİ** (vokal'in global-tepe kümesi [980,1152]Hz, arpej'inkiyle
[86,398]Hz HİÇ ÇAKIŞMIYOR). Düzeltme: vokal'in TÜM -15dB kümeleri
(sadece tepeyi içeren DEĞİL) arpej'in TÜM kümeleriyle çaprazlandı —
**EN GENİŞ çakışan bölge: [215.3, 366.1] Hz** (150.7Hz genişlik). İKİ
KÜÇÜK ek çakışma daha var ([1098,1120]Hz ve [581,592]Hz, ikisi de
<25Hz genişlikte, ANLAMLI/kullanılabilir bir bant için ÇOK dar).

**Bu [215,366]Hz aralığı, kod tabanının KENDİ (kaldırılmış) vokal-
akustik-gitar çiftinin belgelenmiş region'ıyla NEREDEYSE BİREBİR
ÖRTÜŞÜYOR** (`source-catalog.js:145-149`'un kendi notu: *"vocal.m4a'nın
YENİ kaydı acoustic_guitar ile SADECE 215-366Hz aralığında -15dB üstü
ORTAK enerji taşıyor"*) — acoustic_guitar/arpeggio_guitar "AYNI
enstrüman/akort, tepe İKİSİNDE de ~194Hz" olduğu için (aynı dosyanın
G270 notu) bu ÖRTÜŞME BEKLENEN/TUTARLI, yöntemimin GÜÇLÜ bir
CAPRAZ-DOĞRULAMASI.

**Task'ın verdiği 250-500Hz İLE benim ölçtüğüm [215,366]Hz KISMEN
örtüşüyor** (250-366 ortak) ama task'ın üst sınırı (500) benim -15dB
eşiğimde HİÇ desteklenmiyor (arpej'in enerjisi 398Hz'den sonra -15dB'nin
ALTINA düşüyor) — **task'ın kendi talimatı ("farklı çıkarsa kendi
ölçümünü kullan") gereği BENİM ölçtüğüm [215,366]Hz kullanıldı**, ama
İKİSİ de aşağıda AYRI AYRI ölçüldü (şeffaflık için):

| Region kaynağı | A (Vokal) whole/conc | B (Arpej Gitar) whole/conc | Fark (conc) | concWindows |
|---|---|---|---|---|
| **Ölçülen [215,366]Hz** | -29.57 / **-27.44** | -23.49 / **-21.80** | **+5.63 dB** (gitar yüksek) | 72/120 (%60) |
| Task'ın verdiği [250,500]Hz | -29.07 / -27.05 | -24.58 / -22.96 | +4.09 dB (gitar yüksek) | 72/120 (%60) |

**İKİ region'da da AYNI YÖNDE, GÜÇLÜ bir dengesizlik var** — Arpej
Gitar, Vokal'den **4.1-5.6 dB** daha yüksek. Bu, task'ın kendi
ölçümüyle ("ALT-ORTA bandında gitar vokalden 3.2 dB yüksek") AYNI
YÖNDE ve BENZER büyüklükte — yöntem farkına rağmen (hangi bant/hangi
eşik) SONUÇ YÖNÜ ve KABAca BÜYÜKLÜĞÜ TUTARLI, task'ın orijinal
şikayetini DOĞRULUYOR.

---

## SONUÇ

### Hangi çiftlerde denge var, hangilerinde yok (±1.5dB önerisiyle, concurrent ölçüme göre)

| Çift | Fark (conc) | ±1.5dB içinde mi |
|---|---|---|
| akustik-clean | +2.89 dB | ❌ HAYIR |
| bas-akustik | -1.92 dB | ❌ HAYIR (sınıra yakın) |
| bas-clean | +0.99 dB | ✅ EVET |
| snare-akustik | +0.06 dB | ✅ EVET (⚠️ düşük örneklem) |
| snare-clean | +1.16 dB | ✅ EVET (⚠️ düşük örneklem) |
| **vokal-arpej** | **+5.63 dB** | ❌ **HAYIR — EN BÜYÜK dengesizlik** |

**3/6 çift dengesiz** (akustik-clean, bas-akustik, vokal-arpej) —
vokal-arpej AÇIK ARA en kötüsü (task'ın orijinal şikayetiyle TUTARLI).

### Kaç dB fark kabul edilebilir — ±1.5dB öneri DEĞERLENDİRİLDİ

Task'ın önerdiği **±1.5dB** MAKUL bir eşik — 2 sınırda-kalan çift
(bas-clean +0.99dB, snare-akustik +0.06dB, snare-clean +1.16dB) bu
eşiğin RAHATÇA içinde kalıyor, 3 dengesiz çift (2.89/-1.92/+5.63dB) ise
AÇIKÇA dışında — eşiğin KENDİSİ AYRIM YAPMAYA YETERLİ görünüyor, BAŞKA
bir sayı ÖNERİLMEDİ (bu ölçümün kapsamı DIŞINDA — kaç dB'nin
"algılanabilir/rahatsız edici" olduğu psikoakustik bir eşik, KULAKLA
doğrulanmadı, sadece ölçülen farkların dağılımına göre bu eşiğin
AYRIM GÜCÜ değerlendirildi).

### Ayar gereken çiftlere önerilen düzeltme (concurrent farkı SIFIRLAYACAK kadar)

| Çift | Öneri |
|---|---|
| akustik-clean | Clean Gitar'ı **-2.9dB** kıs (YA DA Akustik Gitar'ı +2.9dB yükselt — kısma tercih edilir, headroom riski YOK) |
| bas-akustik | Bas'ı **-1.9dB** kıs |
| **vokal-arpej** | Arpej Gitar'ı **-5.6dB** kıs (EN BÜYÜK düzeltme) |
| bas-clean/snare-akustik/snare-clean | Düzeltme GEREKMİYOR (±1.5dB içinde) |

### SOURCE_PAIRS'a çift bazında gain alanı eklenebilir mi — EVET, DÜŞÜK RİSK, PRESEDENSİ VAR

**Mimari HAZIR, offsetA/offsetB (G288) İLE BİREBİR AYNI kalıp:**
- `www/js/core/audio-engine.js:1159-1161` — `buildDualSourceChain()`
  ZATEN her çift için `gainA`/`gainB` adında İKİ ayrı `GainNode`
  oluşturuyor (şu an `.gain.value=1`, sabit/unity).
- `www/js/core/audio-engine.js:1231-1239` — `setDualSolo(which)`
  bu İKİ node'un değerini `[1,1]` (ikisi birlikte), `[1,0.0001]`/
  `[0.0001,1]` (solo) arasında değiştiriyor — "ikisi birlikte" DURUMUNDA
  YENİ bir per-pair dB değeri buraya `Math.pow(10,gainDb/20)` olarak
  ÇARPILABİLİR (SIFIR yeni node, mevcut gainA/gainB'nin DEĞERİ
  değişir).
- `www/js/app.js:5460-5472` — `offsetA`/`offsetB`'yi `sourcesSpec`'e
  taşıyan `resolve()` yardımcı fonksiyonu — `gainA`/`gainB` (dB) AYNI
  yerden, AYNI desenle geçirilebilir (`offsetSec || 0` deseninin AYNISI,
  `gainDb || 0`).

**İş yükü tahmini (offsetA/offsetB'nin G288'deki KENDİ boyutuyla
KIYASLANARAK):** SOURCE_PAIRS'e 2 yeni alan (dB, HER ZAMAN sayı) +
`resolve()`'a 1 satır + `audio-engine.js`'in "ikisi birlikte" gain
atamasına ~3-5 satır — **G288'in offsetA/offsetB eklemesiyle AYNI
BOYUT sınıfı** (o da benzer bir "yeni alan + resolve() + audio-engine.js
kullanım noktası" üçlüsüydü).

### Bu ayar diğer modları etkiler mi — HAYIR, YAPISAL OLARAK İZOLE

`audio-engine.js:1121-1124`'ün KENDİ yorumu: *"buildQuestionChain'e
TEK SATIR dokunulmadı, diğer sekiz modun ses zinciri BİREBİR aynı
kalıyor"* — `buildDualSourceChain()` **TAMAMEN AYRI** bir fonksiyon,
`gainA`/`gainB` bu fonksiyonun İÇİNDE HER round'da YENİDEN oluşturulan
GEÇİCİ node'lar (SOURCE_GROUPS'un/`findSource()`'un kalıcı bir
durumuna YAZMIYOR). Bir çiftin `gainA`/`gainB`'sine dokunmak: (1)
`www/audio/*.m4a` DOSYALARINI değiştirmez, (2) AYNI kaynağı (ör.
"guitar") TEK-kaynak modda (Kesim Noktası/Boost mu Cut mu vb.)
kullanan `buildQuestionChain()`'i HİÇ etkilemez (o TAMAMEN farklı bir
kod yolu), (3) `OWN_SOURCE_PAIR` ("Kendi dosyalarım") region'ı `null`
olduğu için gain alanı da o çiftte ANLAMSIZ/uygulanamaz — SADECE
`SOURCE_PAIRS`'in 5(+1) SABİT çiftini etkiler.

Kod yazılmadı. Bu tur sadece ölçüm.

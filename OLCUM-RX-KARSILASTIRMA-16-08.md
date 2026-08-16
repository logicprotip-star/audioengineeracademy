# OLCUM-RX-KARSILASTIRMA-16-08 — RX 11 Karşılaştırmasının Kök Sebep Analizi

_Kapsam: SADECE ÖLÇÜM. Kod YAZILMADI, hiçbir dosya DEĞİŞTİRİLMEDİ, commit
atılmadı (`git status` bu turun sonunda `www/js/core/analysis.js` için
TEMİZ). `core/analysis.js` (753 satır) TAM okundu. Bazı sayılar GERÇEK
ölçümle üretildi: Node'da `analyzeAudioBuffer()`'ı doğrudan çağırarak
(60sn sentetik stereo sinyal) + BİR scratch kopya üzerinde (repoya
HİÇBİR ZAMAN yazılmadı, `/private/tmp/.../scratchpad/` altında, ölçüm
sonrası SİLİNDİ) gating granülerliğini değiştirip yeniden ölçerek. Canlı
tarayıcıda `decodeAudioData`/`AudioContext.sampleRate` gerçek davranışı
doğrulandı. K-weighting/true-peak/LRA'nın ITU-R BS.1770-4 ve EBU Tech
3342 UYUMU bu turda SORGULANMADI (TUR9'da doğrulanmıştı, task'ın kendi
kısıtı) — burada SADECE uygulama detayları (pencere/örtüşme/örnekleme)
incelendi._

---

## A) MAX MOMENTARY (0.88 LUFS — en büyük sapma)

**Pencere boyutu:** `MOMENTARY_BLOCKS = 4` × `GATING_BLOCK_MS = 100` =
**400ms** — EBU Tech 3341'in istediği DEĞERLE BİREBİR aynı.

**Kaydırma adımı / örtüşme:** `computeMomentarySeries()`
(`analysis.js:348-358`) `blockPowers` dizisinin HER İNDEKSİNDE (yani her
100ms'de) bir momentary değeri üretiyor — pencere 400ms, adım 100ms →
**örtüşme = (400-100)/400 = %75, TAM olarak spesifikasyona uyuyor.**
Task'ın "örtüşme %75'ten azsa tepe kaçırılıyor olabilir" varsayımı
**DOĞRULANMADI — örtüşme TAM %75, EKSİK DEĞİL.**

**K-weighting:** `preFilterCoeffs`/`rlbFilterCoeffs`'in ürettiği
katsayılar HER örnekte (`applyBiquad`, Faz B döngüsü, `analysis.js:508-516`)
uygulanıyor — momentary hesabı bu K-ağırlıklı güçten türüyor. TUR9'da
doğrulanan uyum bu turda TEKRAR SORGULANMADI (task'ın kısıtı).

**O halde 0.88 LUFS'un olası kaynağı nedir?** Kod, momentary değerlerini
SADECE dosya başına göre SABİT, 100ms'e hizalı bir IZGARADA üretiyor
(`gatingAccum`/`gatingAccumCount` her tam `gatingBlockSamples`'te
sıfırlanıp bir blok gücü kaydediyor — bu SÜREKLİ kayan bir pencere DEĞİL,
100ms'lik AYRIK bloklardan kayan bir ORTALAMA). Bu, spesifikasyona
TAMAMEN UYUYOR (Tech 3341 100ms'lik gating bloklarını AÇIKÇA öngörüyor)
— ama **MAX gibi bir EKSTREMUM istatistiği, tanımı gereği, gerçek en
yüksek anlık değerin bu 100ms-hizalı ızgaranın TAM ÜZERİNE denk gelip
gelmediğine DUYARLI.** Eğer RX'in kendi iç uygulaması (kapalı kaynak,
BİLİNMİYOR) daha ince bir çözünürlükte örnekliyorsa (ya da farklı bir
faz hizalamasıyla), gerçek 400ms'lik en yüksek pencereyi bu app'in sabit
ızgarasının kaçırdığı bir an YAKALAYABİLİR. Bu, INTEGRATED'in (bütün
kaydın ORTALAMASI, ızgara-fazından neredeyse hiç etkilenmez, ölçülen
fark sadece 0.03 LUFS) neden neredeyse MÜKEMMEL eşleştiğini, ama MAX'ın
(tek bir anlık ekstremum, ızgara-fazına ÇOK duyarlı) neden en büyük
sapmayı gösterdiğini TUTARLI biçimde açıklıyor — **bu bir standart
İHLALİ değil, bir ızgara-KUANTALAMA etkisi.**

**Düzeltilirse hesaplama maliyeti ne kadar artar?** **GERÇEK ölçüm
yapıldı** — `GATING_BLOCK_MS`'i 100'den 10'a (ve bağımlı sabitleri
orantılı) düşüren bir SCRATCH kopya (repoya YAZILMADI) 60 saniyelik
sentetik stereo bir sinyalde ölçüldü:

| Izgara | Analiz süresi (60sn stereo) |
|---|---|
| 100ms (mevcut) | 710.5 ms |
| 10ms (10× daha ince) | 715.7 ms |

**Fark ~%0.7 — pratikte ÖLÇÜLEMEYECEK kadar küçük.** Bunun sebebi: asıl
maliyeti örnek-başına True Peak FIR'ı (8×12=96 çarpma/örnek/kanal) ve
K-weighting biquad'ları (~10 çarpma/örnek/kanal) taşıyor — 60sn stereo
44.1kHz'de bu **5.29 milyon örnek-yinelemesi**; ızgara ince/kaba fark
etmeksizin blok-toplama döngüsü sadece 600-6000 girdi işliyor, ana
maliyetin yanında İHMAL EDİLEBİLİR.

---

## B) LRA (0.42 LU)

**Pencere:** `LRA_WINDOW_BLOCKS = 30` × 100ms = **3000ms** — spesifikasyona
uyuyor.

**Adım/örtüşme — SPESİFİKASYONDAN BİLİNÇLİ/BELGELİ bir SAPMA VAR:**
`LRA_STEP_BLOCKS = 1` → adım **100ms**, örtüşme **%96.7**
((3000-100)/3000) — task'ın andığı "Tech 3342: %66 örtüşme" (1 saniyelik
adım) DEĞİL. Kodun kendi yorumu (`analysis.js:252-260`) bunun G100'de
BİLİNÇLİ yapıldığını AÇIKÇA belgeliyor: *"libebur128 (...) LRA gating
bloklarını momentary/short-term ile AYNI 100ms adımda üretiyor... 100ms'e
çekmek RX 11 karşılaştırmasında LRA'yı DOĞRU YÖNDE (yukarı) hareket
ettirdi... ama TEK BAŞINA gözlenen 0.8 LU farkın tamamını KAPATMADI
(ölçülen katkı ~0.1 LU)."* Yani: **bu değişiklik ZATEN bir kez RX ile
karşılaştırılıp DOĞRULANMIŞ, kısmi bir iyileştirme sağlamış** — bugünkü
0.42 LU'luk kalan fark, o zamanki 0.8 LU'dan sonraki DURUM (aynı dosya
olup olmadığı bu rapordan bilinmiyor, ama YÖN/BÜYÜKLÜK TUTARLI).

**İki kapı da uygulanıyor mu?** **EVET, ikisi de var, eşikler DOĞRU:**
mutlak `ABSOLUTE_GATE_LUFS = -70` ✓, göreli `LRA_RELATIVE_GATE_OFFSET_LU
= -20` ✓ — task'ın andığı değerlerle BİREBİR eşleşiyor.

**Yüzdelik dilim — interpolasyon YOK, "en yakın rütbe" (nearest-rank)
kullanılıyor:** `percentileNearestRank()` (`analysis.js:336-341`), DOĞRUSAL
interpolasyon yapan `percentile()` fonksiyonu DEĞİL. Kodun kendi yorumu
bunu da G100'de BİLİNÇLİ seçildiğini belirtiyor ("çoğu referans
uygulamada" — libebur128 tarzı). Yüzdelikler `LRA_LOW_PERCENTILE=10`/
`LRA_HIGH_PERCENTILE=95` — task'ın andığı %10-%95 ile BİREBİR eşleşiyor.

**Standarttan sapan bir adım var mı?** **EVET, adım boyutu** (100ms,
literal spesifikasyonun 1000ms'i DEĞİL) — ama bu SAPMA, bir HATA değil,
DAHA ÖNCE RX ile karşılaştırılıp doğrulanmış, YÖNÜ DOĞRU bir kalibrasyon
kararı. Kalan fark muhtemelen RX'in kendi (kapalı kaynak) LRA
uygulamasının BAŞKA bir detayından (kodun kendi yorumu bunu zaten
öngörüyor).

**Hesaplama maliyeti:** A maddesindeki AYNI ölçüm (10ms ızgara testi
`LRA_WINDOW_BLOCKS`/`LRA_STEP_BLOCKS`'u da orantılı içeriyordu) — **~%0.7,
İHMAL EDİLEBİLİR.**

---

## C) SAMPLE PEAK (0.11 dB) ⚠ EN ÖNEMLİ BULGU

**Dosya hangi bit derinliğinde okunuyor?** `decodeAudioData` (tarayıcı
native API, bu modülün kontrolünde DEĞİL) kaynak bit derinliğinden
BAĞIMSIZ olarak HER ZAMAN Float32 PCM üretir — `analysis.js`'in kendisi
bit derinliğiyle hiç ilgilenmiyor, `getChannelData()`'nın döndürdüğü
Float32Array'i OLDUĞU GİBİ okuyor.

**`decodeAudioData` resample yapıyor mu?** **EVET, YAPABİLİR — ve kod
bunu ÖNLEMİYOR.** `audio-engine.js:362`: `audioCtx = new
(window.AudioContext || window.webkitAudioContext)()` — **HİÇBİR açık
`sampleRate` seçeneği YOK.** Web Audio spesifikasyonuna göre bu,
AudioContext'in CİHAZ/TARAYICI VARSAYILANINI kullanacağı, ve
`decodeAudioData`'nın kaynak dosyanın örnekleme hızı bu varsayılandan
FARKLIYSA dosyayı SESSİZCE yeniden örnekleyeceği (resample) anlamına
gelir — **yeniden örnekleme ALGORİTMASI tarayıcıya özgü, DOKÜMANTE
EDİLMEMİŞ, bu kod tarafından hiç KONTROL EDİLMİYOR.**

**Bu turda GERÇEK canlı tarayıcı ölçümü yapıldı** (masaüstü Chrome):
| | Değer |
|---|---|
| `AudioContext.sampleRate` (varsayılan, bu makinede) | 44100 Hz |
| `vocal.m4a`'nın kendi örnekleme hızı (ffprobe) | 44100 Hz |
| decode SONRASI `buffer.sampleRate` | 44100 Hz |

**Bu ÖZEL makinede/dosyada bir uyuşmazlık YOK** (ikisi de 44.1kHz) —
ama RX karşılaştırmasında kullanılan dosyanın örnekleme hızı VE o
ölçümün yapıldığı cihaz/tarayıcının VARSAYILAN `AudioContext.sampleRate`'i
BU RAPORDA BİLİNMİYOR. Yaygın senaryo: 48kHz'e varsayılan bir cihazda
44.1kHz'lik (ya da tersi) bir dosya açılırsa resample KAÇINILMAZ olur.

**Float32 dönüşümünde ölçekleme kaybı var mı?** Muhtemelen HAYIR —
16-bit PCM'den Float32'ye dönüşüm (int16/32768) Float32'nin ~7 ondalık
basamak hassasiyetinin YANINDA ihmal edilebilir bir hata taşır, 0.11dB
(%1.3) büyüklüğünde bir fark üretmesi BEKLENMEZ.

**Sample peak tam olarak nasıl hesaplanıyor?** **Tam olarak
`max(abs(x))`** (`analysis.js:477-478`: `const ax = Math.abs(x); if (ax >
s.peakAbs) s.peakAbs = ax;`), sonra `linearToDb()` (`20·log10(x)`) ile
dB'ye çevriliyor. **FORMÜLDE hiçbir hata/sapma YOK** — ders kitabı
doğru bir uygulama.

**0.11 dB (~%1.3) bir resample izi olabilir mi?** **EVET, GÜÇLÜ bir
aday** — ama TEK aday değil. **İKİNCİ, EŞİT DERECEDE GEÇERLİ bir aday:**
kaynak dosya AAC/M4A (kayıplı bir codec) İSE, tarayıcının KENDİ AAC
decoder'ı ile RX'in KENDİ (muhtemelen farklı) AAC decoder'ı **BİT-BİRE-BİR
AYNI PCM'i üretme GARANTİSİ TAŞIMAZ** — WAV/PCM'in AKSİNE, kayıplı codec
decode'u (ters MDCT + spektral işleme) uygulamalar arası TAM
DETERMİNİSTİK DEĞİLDİR, özellikle bir tepe noktasının HEMEN yakınında.
**Bu iki aday BİRBİRİNİ DIŞLAMIYOR** — ikisi de aynı anda gerçekleşebilir.
**Ayırt etmek için gereken bilgi (bu raporda YOK, sonraki adım):** (1)
karşılaştırmada kullanılan dosyanın FORMATI (WAV ise SADECE resample
adayı geçerli kalır, decoder-farkı adayı DÜŞER — PCM decode determinist
olmalı; AAC/MP3 ise İKİSİ de olası), (2) o dosyanın KENDİ örnekleme
hızı, (3) ölçümün yapıldığı cihazın `AudioContext.sampleRate`'i (DevTools
konsolunda `new AudioContext().sampleRate` ile TEK satırda okunabilir).

**Kanal asimetrisi bir ipucu:** L 0.11dB / R 0.07dB — SİSTEMATİK, HER
İKİ kanalı da AYNI ölçüde etkileyen kaba bir hata (ör. yanlış bir
ölçekleme sabiti) OLSAYDI L/R BİREBİR AYNI sapmayı gösterirdi. Kanal
başına FARKLI büyüklük, hem resample hem de kayıplı-decoder farkının
İKİSİYLE de TUTARLI (ikisi de sinyalin GERÇEK İÇERİĞİNE bağlı, kanal
başına farklı sonuç üretebilir) — bu SİSTEMATİK bir kod hatasını
DIŞLAMAYA yardımcı oluyor (formülün kendisi ZATEN doğru, madde
"Sample peak nasıl hesaplanıyor" bunu doğruladı).

---

## D) MIN RMS (1.20 dB / 0.66 dB)

**Pencere boyutu:** `DEFAULT_RMS_WINDOW_MS = 100` — task'ın kendisinin
de belirttiği gibi **bir STANDART YOK**, kodun kendi yorumu
(`analysis.js:234-243`) bunu AÇIKÇA kabul ediyor: RX'in TAM pencere
değeri BİLİNMİYOR (kapalı kaynak), 100ms G100'de 50/100/300ms
karşılaştırmasından **en iyi ampirik uyumla** seçildi.

**Sessizlik eşiği var mı?** **HAYIR.** Windowed RMS hesabı
(`analysis.js:484-494`) HER 100ms penceresi için `linearToDb()`'yi
KOŞULSUZ çağırıyor — momentary/integrated/LRA'nın kullandığı -70 LUFS
mutlak kapısına BENZER bir eşik burada YOK.

**Tam sessizlik (dijital sıfır) nasıl ele alınıyor?** **ÖZEL olarak ele
ALINMIYOR — bu gerçek bir sağlamlık açığı.** Bir 100ms pencere TAMAMEN
sıfırsa `sqrt(0/count)=0`, `linearToDb(0)` fonksiyonu (`x>0 ? ... :
-Infinity`) tam olarak **`-Infinity`** döner. Bu turda ölçülen değerler
(-80.59/-79.70 dB) SONLU olduğu için BU dosyada tetiklenmedi, ama
GERÇEK dijital sessizlik içeren bir dosyada `minRmsDb` **-∞** çıkar —
karşılaştırılabilir bir sayı ÜRETMEZ, arayüzde muhtemelen "−∞ dB" ya da
bozuk bir gösterim olur. **Bu, MEVCUT sapmanın nedeni DEĞİL** (dosyada
tetiklenmedi) ama AYRI, gerçek bir bulgu.

**RX'in penceresi bilinmiyor — hizalamak mümkün mü?** **Kesin/garanti
edilebilir bir hizalama YOK** (kapalı kaynak) — ama YÖNE dair
GEREKÇELENDİRİLMİŞ (kanıtlanmamış) bir hipotez var: mevcut pencere
**ÖRTÜŞMEYEN** (`w.sumSq`/`w.count` her `rmsWindowSamples`'te SIFIRLANIYOR,
`analysis.js:485-494`) SERT bloklardan oluşuyor — bu, TEK bir kısa
sessiz/alçak anı TAM olarak izole edip en düşük değeri YAKALAMAYA
eğilimlidir. RX **ÖRTÜŞEN/kayan** bir pencere kullanıyorsa (birçok "hızlı
RMS" metre böyle çalışır), kısa sessiz anlar KOMŞU (daha yüksek enerjili)
örneklerle ORTALANIP "yumuşatılır" — bu da RX'in min RMS'inin neden bu
app'inkinden DAHA YÜKSEK (daha az negatif) çıktığını (gözlemlenen YÖNLE
TUTARLI: -79.39 RX vs -80.59 bu app, L kanalı) açıklardı. **Bu bir
HİPOTEZ, KANITLANMADI** — test etmenin yolu: örtüşen bir pencereye
geçip AYNI dosyayla yeniden karşılaştırmak.

---

## E) MAX RMS ve TRUE PEAK (0.05-0.09 dB — zaten iyi)

**True peak oversampling:** `TRUE_PEAK_L = 8` — BS.1770-4'ün istediği
minimum 4×'in **2 katı**. Filtre parametreleri (`halfWidth=6`,
`beta=26`) G100'de AYRI bir frekans-taraması turuyla ÖNCEDEN
karakterize edilmiş (`analysis.js:46-75`): kendi ölçülen sınırı
saf tonlarda **en fazla ~0.04dB üstünden, ~0.17dB altından** okuyor
(Nyquist yakını hariç, orada HİÇBİR filtre örnekleme teorisi gereği tam
düzeltemez). Gözlemlenen 0.05-0.09dB'lik fark bu ÖNCEDEN KARAKTERİZE
EDİLMİŞ belirsizlik bandının İÇİNDE — **beklenmedik bir sonuç DEĞİL.**

**Max RMS penceresi:** Min RMS ile **AYNI** mekanizma (100ms, örtüşmeyen)
— ama Max RMS ZATEN iyi eşleşiyor (0.07-0.09dB), Min RMS DEĞİL
(1.20/0.66dB). Bu ASİMETRİ, D maddesindeki hipotezi DESTEKLİYOR: bir
kaydın EN YÜKSEK 100ms penceresi genelde mix/mastering tavanına
(headroom) yakın, GÖRECELİ OLARAK KARARLI bir değerdir — pencere tam
hizası ÖNEMİ AZ. EN DÜŞÜK pencere ise sessizliğe/decay kuyruklarına çok
daha DUYARLI, pencere hizası/örtüşmesi SONUCU BELİRGİN ŞEKİLDE
etkiler. **Aynı mekanizma, İKİ farklı istatistiksel DAVRANIŞ üretiyor —
tutarlı bir açıklama.**

**Daha da yaklaşmak mümkün mü?** **Marjinal olarak, EVET ama ÖNCELİK
DÜŞÜK** — kodun kendi notu L'yi 4→8→16'ya çıkarmanın OVERSHOOT'u
NEREDEYSE HİÇ etkilemediğini (0.549→0.542→0.549dB, SABİT
halfWidth/beta'da) zaten ÖLÇMÜŞ; asıl kazanç halfWidth/beta'dan geldi
(ZATEN uygulandı). L=16'ya çıkmak SADECE Nyquist-yakını UNDERSHOOT'u
azaltır (0.169→0.043dB, ölçülmüş) — True Peak ZATEN hedefin (<0.1dB)
altında olduğu için bu **gerekli DEĞİL.**

---

## F) ÖNCELİK VE MALİYET

| Metrik | Fark | Kök sebep | Düzeltilebilir mi? | İş yükü | Hesaplama maliyeti | Beklenen yeni fark |
|---|---|---|---|---|---|---|
| **Sample Peak L** | 0.11 dB | Resample (kanıtlanmadı, mekanizma DOĞRULANDI) VE/VEYA kayıplı-codec decoder farkı | **KISMEN** — resample'sa evet, decoder-farkıysa HAYIR | Resample fix: ~10-30 satır (`audio-engine.js`/`upload.js`, AudioContext'i dosyanın native rate'inde açmak) | Yok/ihmal edilebilir (decode zaten tek seferlik) | Resample ise **<0.05dB'ye inebilir**; decoder-farkıysa **DEĞİŞMEZ** — önce test dosyasının formatı/sample rate'i DOĞRULANMALI |
| **Sample Peak R** | 0.07 dB | (aynı, zaten <0.1) | — | — | — | Zaten hedefte |
| **Min RMS L** | 1.20 dB | Standart YOK, pencere örtüşmesi farkı (HİPOTEZ) | **BELİRSİZ** | Örtüşen pencereye geçiş: ~15-25 satır (`analysis.js`, kayan toplam) | İhmal edilebilir (GERÇEK ölçüldü, ~%1 mertebesi benzer bir değişiklik için) | **Kanıtlanmamış** — RX'in kendi penceresi bilinmeden garanti YOK |
| **Min RMS R** | 0.66 dB | (aynı) | Belirsiz | (aynı) | İhmal edilebilir | Kanıtlanmamış |
| **Max Momentary** | 0.88 LUFS | Pencere/örtüşme SPEC'e UYUYOR (400ms/%75) — kalan fark muhtemelen ızgara-kuantalama (faz) etkisi | **KISMEN** — ince ızgara YÖNÜ düzeltir, TAM kapatmayı GARANTİ ETMEZ | Orta (~20-40 satır, paralel ince-ızgara birikimi, MEVCUT 100ms pipeline'a DOKUNMADAN) | **GERÇEK ölçüldü: ~%0.7 (710.5→715.7ms, 60sn stereo)** — ihmal edilebilir | Yön DOĞRU ama miktar KANITLANMAMIŞ |
| **Max Short-term** | 0.06 LUFS | (zaten iyi) | — | — | — | Zaten hedefte |
| **Integrated** | 0.03 LUFS | (zaten mükemmel) | — | — | — | Zaten hedefte |
| **LRA** | 0.42 LU | Adım boyutu (100ms, DAHA ÖNCE G100'de RX'e göre BİLİNÇLİ ayarlanmış, kısmi iyileştirme sağlamış) — kalan fark RX'in kapalı-kaynak detayları | **BELİRSİZ** — ÖNCEDEN bir kez denendi, sadece ~0.1 LU'luk kısmi katkı sağladı | Düşük (sabitler zaten izole/adlandırılmış) | İhmal edilebilir (aynı ölçüm) | **Önceki deneyim düşük güven veriyor** — büyük bir ek kazanç BEKLENMEMELİ |
| **Max/Total RMS, True Peak** (5 metrik) | 0.00-0.09 | Zaten karakterize edilmiş belirsizlik bandı İÇİNDE | Gerekmiyor | — | — | Zaten hedefte, DOKUNULMASI ÖNERİLMEZ |

**Hedef ("14 metriğin en az 12'sinde fark <0.1"):** **Şu an 9/14 zaten
<0.1.** Hedefe ulaşmak için EN AZ 3 metriğin daha eşiğin altına inmesi
gerekiyor. **Dürüst değerlendirme:** Sample Peak L (0.11) eşiğe ÇOK
yakın — kaynağı resample ise DÜZELTİLEBİLİR görünüyor, kesin SONUÇ test
dosyasının formatı doğrulanmadan VERİLEMEZ. Diğer 4 metriğin (Min RMS
×2, Max Momentary, LRA) kök sebebi kısmen ya da tamamen **RX'in kendi
kapalı-kaynak/belgelenmemiş uygulama detaylarına** dayanıyor — kod
tarafında YAPILABİLECEK değişiklikler YÖNÜ doğru hareket ettirebilir
(LRA'nın G100 geçmişi bunu KANITLADI) ama TAM kapanmayı GARANTİ ETMEZ.
**12/14 hedefi ULAŞILABİLİR ama GARANTİ EDİLEMEZ** — bu, standarttan
sapan bir HATA değil, iki BAĞIMSIZ, bazı noktalarda ÖZGÜRCE
yorumlanabilir bir standardın (BS.1770-4/Tech 3342, ikisi de belli
uygulama detaylarını AÇIK bırakıyor) iki FARKLI uygulaması arasındaki
KAÇINILMAZ bir kalıntı.

---

## Dürüstlük notu

- Sample Peak'in resample-mi/decoder-farkı-mı ayrımı, karşılaştırmada
  kullanılan dosyanın FORMATI/örnekleme hızı VE ölçüm cihazının
  `AudioContext.sampleRate`'i BİLİNMEDEN KESİNLEŞTİRİLEMEZ — bu rapor
  İKİ olası nedeni de eşit ağırlıkla sunuyor, birini SEÇMEDİ.
- Min RMS'in örtüşen-pencere hipotezi TEST EDİLMEDİ (kod
  DEĞİŞTİRİLMEDİ) — sadece gerekçelendirilmiş bir varsayım.
- Max Momentary'nin ızgara-kuantalama açıklaması RX'in kendi algoritması
  BİLİNMEDEN doğrudan DOĞRULANAMAZ — dolaylı/çıkarımsal bir açıklama.
- Hesaplama maliyeti ölçümleri (A/B) GERÇEK, masaüstü Node'da ölçüldü —
  mobil/tarayıcı ortamında ORANTISAL olarak benzer davranması BEKLENİR
  (aynı O(n) yapı) ama bu turda AYRICA doğrulanmadı.

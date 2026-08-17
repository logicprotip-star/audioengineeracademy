# OLCUM-CPU-17-08 — Motor 2 Taşınmasının CPU/Bellek Riski

_Kapsam: **SADECE ÖLÇÜM — KOD YAZILMADI, DOSYA DEĞİŞTİRİLMEDİ, COMMIT ATILMADI**
(`git status` bu turun sonunda TEMİZ, tek yeni dosya bu raporun kendisi).
OLCUM-KALAN-17-08.md'nin madde C'sinin BELİRSİZ bıraktığı tek riski
(3 eşzamanlı convolver'ın eski cihazlarda maliyeti) hedefliyor. Yöntem:
gerçek `OfflineAudioContext` render'ları (wall-clock süre — bu, Web
Audio motorunun GERÇEKTEN harcadığı işlemci zamanının DOĞRUDAN bir
ölçüsü, tahmini bir sabit DEĞİL), gerçek (real-time) `AudioContext` +
`AudioWorklet` denemeleri, Chrome DevTools Protokolü'nün
`Emulation.setCPUThrottlingRate`'i (Playwright CDP session üzerinden).
Ölçüm scriptleri repoya dahil edilmedi (geçici `scratch_*.mjs`,
çalıştırılıp SİLİNDİ). Bazı sorular bu ortamdan GERÇEKTEN ÖLÇÜLEMEDİ —
her biri BELİRSİZ olarak işaretlendi, cihazda nasıl ölçüleceği
yazıldı, tahmini bir sayı UYDURULMADI._

---

## A) MEVCUT CPU/BELLEK TABANI

**Yöntem:** `reverb.js:generateImpulseResponse()`'un GERÇEK çıktısı
(3 tip — room/hall/plate) ölçüldü, `groove.m4a`'nın (24.615sn, GERÇEK
-6dBFS kaynak) TAM SÜRESİ bir `OfflineAudioContext` ile render edilip
wall-clock süre kaydedildi (bu değer, motorun rendering'i tamamlamak
için GERÇEKTEN harcadığı işlemci zamanı — Offline context "olabildiğince
hızlı" render eder, gerçek zamanlı bir hızlandırma/yavaşlatma YOKTUR).

**IR (impulse response) uzunluğu — gerçek `createQuestion()` çıktısından:**

| Tip | decaySec (gerçek varyant) | IR uzunluğu (örnek) | IR uzunluğu (sn) | IR boyutu (Float32, stereo) |
|---|---|---|---|---|
| Room | 0.77sn | 34.602 | 0.785sn | ~277 KB |
| Plate | 1.15sn | 50.870 | 1.154sn | ~407 KB |
| Hall | 2.40sn | 107.273 | 2.432sn | ~858 KB |

**Tek convolver'ın render maliyeti (Hall, en kötü durum — 24.6sn ses,
wall-clock):** **163.2ms**.

**Kompresör ve Distortion'ın maliyeti — DOĞRULANDI, convolver'dan çok
daha ucuz:**

| Node tipi | Render süresi (24.6sn ses) | Hall convolver'a göre |
|---|---|---|
| `DynamicsCompressorNode` (Kompresör) | **44.9ms** | **~3.6× DAHA UCUZ** |
| `WaveShaperNode` + `oversample:"4x"` (Distortion) | **51.7ms** | **~3.2× DAHA UCUZ** |
| `ConvolverNode` (Reverb, Hall) | 163.2ms | (referans) |

**Sonuç:** task'ın varsayımı ("DynamicsCompressor ve WaveShaper
convolver'dan çok daha ucuz olmalı") **DOĞRULANDI, GERÇEK ölçümle**.
Bu, Motor 2'nin 3 modundan SADECE Reverb'in taşınması gerçek bir CPU
riski taşıyor — Kompresör/Distortion'ın 3-paralel hâli bile (3×52ms≈156ms
mertebesinde) TEK bir Hall convolver'dan (163ms) DAHA UCUZ olurdu.

**Bellek — `performance.memory` ile ölçüm GİRİŞİMİ, SONUÇ GÜVENİLMEZ:**
Chrome'un `performance.memory.usedJSHeapSize`'ı GC zamanlamasına
bağlı, `--expose-gc` ile zorla GC tetiklense bile 3 convolver
oluşturmadan ÖNCE/SONRA ölçülen fark **NEGATİF** çıktı (gürültü,
gerçek bir "bellek azaldı" anlamına gelmiyor) — **bu yöntemle JS heap
üzerinden GÜVENİLİR bir ölçüm ALINAMADI**, BELİRSİZ olarak işaretlendi.
**Güvenilir/GERÇEK olan tek sayı:** IR buffer'larının KENDİ boyutu
(yukarıdaki tablo, `AudioBuffer.length` ile DOĞRUDAN ölçüldü) — 3 farklı
tip (room+plate+hall) TOPLAM **~1.54MB** ham IR verisi, 3× Hall
(en kötü senaryo) **~2.57MB**. `ConvolverNode`'un bunun ÜSTÜNE
ekleyeceği İÇSEL DSP tamponları (FFT parçalı-konvolüsyon için tipik
olarak birkaç kat) bu ortamdan ÖLÇÜLEMEDİ — **BELİRSİZ**, cihazda
Xcode Instruments'ın "Allocations"/"VM Tracker" enstrümanıyla
ölçülmeli.

---

## B) ÜÇ PARALEL DAL SİMÜLASYONU — GERÇEK KURULUP ÖLÇÜLDÜ

**Kurulum:** ÖNERİLEN Motor-1-tarzı mimarinin BİREBİR eşdeğeri — TEK
bir `AudioBufferSourceNode`'dan (groove.m4a) 3 AYRI `ConvolverNode`'a
fan-out, ÜÇÜ DE aktif/bağlı, çıkışları TEK bir `GainNode`'da toplanıyor
(gerçek toplam çıkış, sadece "kurulu ama sessiz" değil).

| Senaryo | Wall-clock süre | Tek convolver'a göre |
|---|---|---|
| 1× Hall (referans) | 163.2ms | 1.0× |
| **3× karışık (room+plate+hall)** | **405.3ms** | **2.48×** |
| **3× Hall (EN KÖTÜ durum — üçü de en uzun IR)** | **484.9ms** | **2.97× (≈3×)** |

**Kaç kat — DOĞRUDAN CEVAP:** En kötü durumda (3'ü de Hall) **~3 kat**,
neredeyse tam ORANTILI (paralel/bağımsız konvolüsyon işlemleri için
beklenen, sağlıklı bir ölçek). Karışık 3 tipte (gerçek A/B/C
senaryosu, room+plate+hall) **~2.5 kat** — hall'ün TEK BAŞINA maliyeti
zaten baskın olduğu için 3'e tam ulaşmıyor.

**Bellek — kaç kat:** IR buffer boyutu üzerinden GÜVENİLİR ölçülebilen
kısım: 3× Hall = 3×858KB ≈ **2.57MB** (~3× tek convolver). İçsel DSP
tamponları dahil TOPLAM bellek **BELİRSİZ** (yukarı bkz.).

**Ses kesintisi (glitch/dropout) oluyor mu:** **BU ORTAMDAN GÜVENİLİR
ÖLÇÜLEMEDİ — BELİRSİZ.** Denendi: gerçek zamanlı bir `AudioContext` +
özel bir `AudioWorkletProcessor` ile her `process()` çağrısının
zamanlaması (`currentTime` deltaları) 0/1/3/6 convolver yüküyle
karşılaştırıldı. **Sonuç: deltalar TÜM senaryolarda birebir aynı
(2.902ms, 128 örnek/44.1kHz'in teorik değeri) — YÜK ARTIRILDIKÇA HİÇ
DEĞİŞMEDİ, 6 convolverde bile.** Bu, gerçek bir "sorun yok" kanıtı
DEĞİL — `AudioContext.currentTime` ses SAATİNE (nominal render
quantum sayacına) bağlı ilerliyor, motorun GERÇEKTEN yetişip
yetişmediğini YANSITMIYOR; headless Chromium'un sanal/boş ses çıkışı
gerçek donanımın dayattığı KESİN real-time teslim tarihini
UYGULAMIYOR. **Yöntem GENİŞ ölçüde denendi ama bu metrikle glitch
tespiti bu ortamda MÜMKÜN DEĞİL** — sonuç BELİRSİZ olarak bırakıldı,
"3 convolver güvenli" ANLAMINA GELMEZ.
**Cihazda nasıl test edilir:** (1) Xcode → Instruments → "Core Audio"
şablonu (ya da genel "Time Profiler" + ses I/O geri çağrılarının
süresi) ile gerçek bir iPhone'da 3-paralel yapı çalışırken audio
render thread'in her callback'i BÜTÇESİ (genelde ~2.9-10ms, buffer
boyutuna göre) İÇİNDE bitirip bitirmediği İZLENMELİ; (2) daha basit —
Logic'in KENDİSİ gerçek cihazda Kompresör/Reverb/Distortion'ı A/B/C
döngüsünde birkaç dakika dinleyip KULAKLA çatırtı/kesinti arasın.

**`baseLatency`/`outputLatency` değişiyor mu:** **EVET, ÖLÇÜLDÜ,
GERÇEK bir sinyal:** `outputLatency` 1 convolverde **0**, 3 convolverde
**0.032sn (32ms)** — `baseLatency` DEĞİŞMEDİ (donanım/arabellek
boyutuna bağlı, motor karmaşıklığından etkilenmiyor). `outputLatency`'nin
ARTMASI, tarayıcının ses alt sistemi 3-convolver yükünü "daha fazla
tampon payı gerektiren" bir durum olarak DEĞERLENDİRDİĞİNİN dolaylı
bir işareti — KESİN bir glitch kanıtı değil ama YÜKÜN ALGILANDIĞINA
dair GERÇEK, ölçülmüş bir veri noktası. (Not: bu ölçüm headless/sanal
ses aygıtıyla yapıldı, GERÇEK donanımdaki mutlak değer FARKLI olabilir
— değişimin YÖNÜ/varlığı önemli, mutlak 32ms sayısı cihaza taşınamaz.)

---

## C) ESKİ CİHAZ TAHMİNİ

**CPU kısıtlaması simüle edilebilir mi (DevTools throttling):**
**EVET, API çalışıyor — ama Web Audio render'ı İÇİN İŞE YARAMIYOR.**
Playwright'ın CDP oturumu üzerinden `Emulation.setCPUThrottlingRate`
GERÇEKTEN çağrıldı (1×/4×/6×), bir KONTROL ölçümüyle DOĞRULANDI:

| Throttle | Kontrol: saf JS döngüsü (200M yineleme) | 1× convolver render | 3× convolver render | 6× convolver render |
|---|---|---|---|---|
| 1× (kapalı) | 190.4ms | 167.6ms | 510.9ms | 1054.8ms |
| 4× | **793.0ms** (4.2×) | 168.7ms (**değişmedi**) | 511.4ms (**değişmedi**) | 1046.7ms (**değişmedi**) |
| 6× | **1188.6ms** (6.2×) | 177.7ms (**değişmedi**) | 550.5ms (**değişmedi**) | 1142.7ms (**değişmedi**) |

**Kritik bulgu:** Saf JS döngüsü throttle ORANIYLA BİREBİR yavaşladı
(4×→4.2×, 6×→6.2×, throttling'in GERÇEKTEN çalıştığının kanıtı) AMA
`OfflineAudioContext` render süreleri **6× throttle'da bile
DEĞİŞMEDİ** (±8% — ölçüm gürültüsü sınırında). **Sonuç: Chrome
DevTools CPU throttling, Web Audio render motorunu SİMÜLE ETMİYOR** —
muhtemelen ayrı bir thread/süreçte çalışıyor ve renderer'ın ana-thread
throttle'undan ETKİLENMİYOR. **Bu YÖNTEM eski cihaz tahmini İÇİN
KULLANILAMAZ** — task'ın "4x yavaşlatmada 3 convolver ne yapıyor"
sorusunun DÜRÜST cevabı: "aynısını yapıyor, çünkü bu ARAÇ Web Audio'yu
hiç yavaşlatmıyor," tahmini bir sayı BURADAN türetilemez.

**Ses kesintisi eşiği nerede:** **BELİRSİZ** (B maddesindeki glitch
tespiti sınırlamasıyla AYNI sebep — bu ortamda ÖLÇÜLEMEDİ).

**iPhone SE (A13, 3GB RAM) için makul bir tahmin yapılabilir mi:**
**HAYIR, bu turda YAPILMADI — CLAUDE.md'nin "sayı uydurma" kuralı.**
Bu makine (geliştirme ortamı) ile bir A13 çipi arasındaki GERÇEK
tek-iş-parçacıklı kayan-nokta/konvolüsyon performans FARKI bu ortamdan
ÖLÇÜLEMEZ — genel/kamuya açık CPU karşılaştırma puanlarından bir ORAN
"ödünç almak" task'ın kendi kuralına (uydurma yasak) AYKIRI olurdu.
**Ölçülebilen TEK şey — gerçek-zamanlı payı (headroom oranı), BU
makinede:** 24.615sn'lik sesi en kötü durumda (3× Hall) render etmek
**484.9ms** sürdü → bu makinede **~50.8× gerçek-zamanlı pay** var
(24615ms/484.9ms). **Bu oranın iPhone SE'ye NASIL taşınacağı BELİRSİZ**
— SADECE şunu söylemek mümkün: geliştirme makinesi muhtemelen bir A13
çipinden BELİRGİN ölçüde hızlı (yaygın bilgi, kesin kat SAYISI
iddia edilmiyor), bu yüzden 50.8×'lik pay cihazda KESİNLİKLE daha
düşük olacak — ne kadar düşük, ÖLÇÜLMEDEN bilinemez.
**Cihazda nasıl test edilir (somut adımlar):**
1. Safari Web Inspector'ı gerçek bir iPhone SE'ye bağlayıp (Mac'ten,
   Develop menüsü) Console'da BU RAPORUN AYNI `OfflineAudioContext`
   render-süresi testini (groove.m4a + 3× Hall convolver) ÇALIŞTIRIP
   wall-clock süreyi doğrudan OKUMAK — bu rapordaki 484.9ms sayısıyla
   DOĞRUDAN karşılaştırılabilir bir sonuç verir, tahmine gerek KALMAZ.
2. Xcode Instruments'ın "Time Profiler" ya da "Core Audio" şablonuyla
   gerçek 3-paralel A/B/C döngüsünü birkaç dakika çalıştırıp CPU
   yüzdesini/audio thread doluluğunu İZLEMEK.
3. En basit/en ucuz: Logic'in kendisi gerçek cihazda dinleyip KULAKLA
   çatırtı/kesinti olup olmadığını bildirmesi — kesin bir "iyi/kötü"
   sinyali, hiçbir profil aracı GEREKTİRMEZ.

---

## D) AZALTMA YOLLARI

**1) IR uzunluğu kısaltılabilir mi — GERÇEK ölçüldü, ORANTISIZ bir
kazanç:**

| decaySec | Render süresi | Kısalma | CPU kazancı |
|---|---|---|---|
| 0.6sn | 98.5ms | (referans, Room'a yakın) | — |
| 1.2sn | 119.8ms | — | — |
| 2.4sn (Hall) | 155.8ms | (referans) | — |
| 4.8sn | 235.4ms | — | — |

Decay'i Hall'ün 2.4sn'sinden 1.2sn'ye (**%50 kısaltma**) indirmek
render süresini SADECE 155.8→119.8ms'ye (**%23 kazanç**) düşürüyor —
**doğrusal DEĞİL**, sabit bir kurulum/FFT-altyapı maliyeti (~85-90ms)
IR uzunluğundan BAĞIMSIZ olarak HER ZAMAN var, SADECE üstüne eklenen
kısım IR'la orantılı büyüyor. **Sonuç: IR kısaltmak yardımcı olur ama
azalan getiriyle** — Hall'ü YARI yapmak CPU'yu YARIYA İNDİRMEZ, ~%23
düşürür. **Öğretim değeri bozulur mu:** bu turda ÖLÇÜLMEDİ/değerlendirilmedi
(ürün/pedagoji kararı, `reverbAmountScore()`'un decay'e verdiği ağırlık
göz önüne alınarak AYRICA değerlendirilmeli) — BELİRSİZ.

**2) Sadece Reverb için farklı bir çözüm (Kompresör/Distortion tam
taşıma, Reverb kısmi) — GÜÇLÜ BİR SEÇENEK, ölçümle DESTEKLENİYOR:**
Madde A'nın bulgusu bunu doğrudan haklı çıkarıyor — Kompresör
(`DynamicsCompressorNode`) ve Distortion (`WaveShaperNode`) TEK
BAŞINA convolver'dan 3-3.6× daha ucuz, 3-paralel hâlleri bile
(≈130-155ms toplam) TEK bir Hall convolver'dan (163ms) daha ucuz —
bu ikisi İÇİN "3× kaynak" endişesi PRATİKTE ÖNEMSİZ. Reverb'e ÖZEL
bir kısıtlama/hibrit yaklaşım uygulamak (aşağıdaki madde 4) mantıklı,
Kompresör/Distortion TAM taşınabilir.

**3) Aktif olmayan dalların convolver'ı disconnect edilip sadece gain
sıfırlanabilir mi — GERÇEK ölçüldü, NET CEVAP: HAYIR, gain sıfırlamak
YETMEZ:**

| Yaklaşım | Render süresi | Yorum |
|---|---|---|
| 3 convolver bağlı, gain'i 2'si ~0'a çekilmiş (SADECE 1'i "duyulur") | **454.9ms** | CPU maliyeti HÂLÂ ~3× — gain DEĞERİ konvolüsyon işleminin KENDİSİNİ ETKİLEMİYOR, node yine TAM işleniyor |
| 1 convolver bağlı, diğer 2 HİÇ kurulmamış/disconnect | **149.4ms** | ~1× maliyet, GERÇEK tasarruf |

**Bu, task'ın kendi varsayımını ("o zaman kuyruk enerjisi kaybolur ama
CPU düşer") GERÇEK ölçümle DOĞRULUYOR** — disconnect GERÇEKTEN CPU
düşürüyor (gain sıfırlamanın AKSİNE), bedeli o convolver'ın kuyruk/
devamlılık durumunun kaybolması (yeniden bağlanınca convolver "sıfırdan"
başlar, tıpkı mevcut sorunun bir MİNİK versiyonu gibi — ama SADECE
ISLAK/reverb kuyruğu için, KAYNAK/KURU sinyal hâlâ KESİNTİSİZ devam
edebilir, bkz. aşağıdaki hibrit öneri).

**4) Lazy kurulum (ilk geçişte kurulsun, sonra kalsın) — mimari olarak
mantıklı, bu turda AYRICA ölçülmedi ama madde 3'ün sonucuyla TUTARLI:**
Her 3 convolver'ı round BAŞINDA bir kez kurup SÜREKLİ bağlı bırakmak
madde B'nin ölçtüğü ~3× maliyeti KALICI hâle getirir (round boyunca).
"Lazy" (sadece ilk kez o harfe geçilince kur, SONRA bağlı kalsın)
YİNE DE nihayetinde tüm 3'ü kurmuş olur (kullanıcı A/B/C'nin hepsini
gezerse) — CPU açısından TAM kurulumdan farksız hâle gelir, SADECE
"hiç dinlenmeyen harf hiç kurulmaz" senaryosunda (kullanıcı SADECE
A'yı dinleyip cevap verirse) tasarruf sağlar — GERÇEK KULLANICI
DAVRANIŞINA bağlı, bu turda ölçülmedi/BELİRSİZ.

**🏆 EN GÜÇLÜ HİBRİT ÖNERİ (madde 2+3'ün BİRLEŞİMİ, bu turun kendi
sonucu):** KAYNAK + KURU sinyali Motor 1 gibi SÜREKLİ/hiç yeniden
kurulmadan tut (topallamanın ASIL sebebi — "offset=0'a dönme" — TAMAMEN
çözülür), ama ISLAK/convolver tarafını SADECE aktif harf İÇİN kur,
diğer ikisini DISCONNECT bırak (madde 3'ün ölçtüğü ~1× maliyette
kalır). Bedel: switch anında SADECE o convolver'ın kuyruğu "sıfırdan"
başlar (kısa bir yeniden-atak, ESKİ sorunun KAYNAK-yeniden-başlama
boyutundan ÇOK DAHA KÜÇÜK bir kusur) — Kompresör/Distortion'da bu
kısıtlama bile GEREKMEZ (madde 2, ucuzlar, TAM 3-paralel yapılabilir).

---

## E) KARŞILAŞTIRMA

| | **1) TAM TAŞIMA (3 dal her zaman aktif)** | **2) KISMİ ÇÖZÜM (offset devri)** | **3) HİBRİT (bu turun önerisi — D.4)** |
|---|---|---|---|
| **Kesintisizlik** | Tam — hem kaynak hem TÜM 3 dal sürekli | Kaynak sürekli DEĞİL — HER switch'te hâlâ `buildQuestionChain()` + 50ms ramp | Kaynak sürekli (Motor 1 gibi), SADECE ıslak convolver switch'te yeniden atak |
| **"Topallama" biter mi** | EVET, TAMAMEN | KISMEN — offset korunur ama yeniden-kurulma/ramp KALIR | EVET (kaynak asla durmuyor) |
| **CPU (Reverb)** | **~3×** (ÖLÇÜLDÜ: 484.9ms vs 163.2ms) | ~1× (bugünkünün AYNISI, sadece offset ekleniyor) | **~1×** (madde D.3 ile ÖLÇÜLDÜ) |
| **CPU (Kompresör/Distortion)** | ~3× ama MUTLAK olarak küçük (≈130-155ms, tek Hall'den bile ucuz) | ~1× | Gerek YOK — bunlar zaten ucuz, TAM taşınabilir |
| **Bellek** | ~3× IR (2.57MB en kötü durum, ÖLÇÜLDÜ) + İÇSEL DSP tamponu BELİRSİZ | Değişmez | ~1× (aktif olmayan convolver'lar disconnect) |
| **İş yükü** | **Yüksek** — 3 mod dosyası + `audio-engine.js`'e YENİ N-paralel-dal mimarisi + `threeWayPreviewOffsets`'ın YENİDEN DÜŞÜNÜLMESİ | **Düşük-Orta** — `cycleThreeWayPreview()`'a birkaç satır, mevcut mimariye ek | **Orta** — TAM taşımanın mimarisi (fan-out) gerekir AMA sadece 1 convolver AKTİF tutulur (Kompresör/Distortion'da hiç kısıtlama gerekmez, oralarda TAM taşıma zaten ucuz) |
| **Regresyon yüzeyi** | Geniş — Motor 2'nin PAUSE/resume, `threeWayPreviewOffsets`, kompresör zarfının/convolver kuyruğunun SÜREKLİ canlı kalmasının yan etkileri (ör. Kompresör'ün gain-reduction'ı artık GERÇEK zamanlı sürekli izliyor — DAHA GERÇEKÇİ ama davranış DEĞİŞİR, test edilmeli) | Dar — SADECE offset hesaplama eklenir, mevcut rebuild mekanizması AYNEN kalır | Orta — yeni fan-out mimarisi (Kompresör/Distortion) + Reverb'e ÖZEL disconnect/reconnect mantığı |
| **Kullanıcı deneyimi farkı** | En iyi — GERÇEK Motor-1 hissi | Orta — "baştan başlama" biter ama switch hâlâ 50ms'lik bir "yeniden atak" hissi verebilir (ramp kalıyor) | En iyi Kompresör/Distortion'da (tam), Reverb'de "neredeyse en iyi" (kuru sinyal kesintisiz, ıslak kuyruk switch'te kısa bir yeniden-atak) |

---

## ÖNERİ

**Net öneri: (3) HİBRİT — Kompresör/Distortion'ı TAM Motor-1-tarzı
taşı, Reverb'i KAYNAK-sürekli + TEK-AKTİF-convolver (disconnect
tabanlı) olarak taşı. TAM 3-paralel-convolver mimarisi (seçenek 1)
ÖNERİLMİYOR.**

**Gerekçe (bu turun GERÇEK ölçümlerine dayanarak):**
1. Kompresör ve Distortion'ın 3-paralel maliyeti (≈130-155ms) TEK bir
   Hall convolver'dan (163ms) bile DÜŞÜK — bu ikisi için "3× kaynak"
   riski PRATİKTE YOK, tam taşıma GÜVENLE yapılabilir.
2. Reverb'in 3-paralel maliyeti GERÇEKTEN ~3× (484.9ms vs 163.2ms,
   2.57MB vs 858KB) — bu, task'ın şüphesini DOĞRULUYOR, ölçülmeden
   "sorun yok" denemezdi.
3. AMA aynı turda GERÇEK ölçümle bulundu: gain-sıfırlama İŞE
   YARAMIYOR (hâlâ ~3×), disconnect GERÇEKTEN ~1×'e DÖNÜYOR — yani
   Reverb'in "topallama" sorunu (kaynağın her switch'te sıfırdan
   başlaması) TAMAMEN Motor-1-tarzı KAYNAK sürekliliğiyle çözülebilir,
   convolver'ların HEPSİNİN sürekli paralel çalışmasına GEREK YOK —
   bu ikisi (kaynak sürekliliği ile convolver sürekliliği) BAĞIMSIZ
   sorunlar, sadece BİRİNCİSİ asıl "topallama" şikâyetinin kaynağı.
4. Kompresör/Distortion için AYNI kısıtlamaya bile gerek yok (madde 1)
   — hibrit yaklaşım SADECE Reverb'e ÖZEL bir istisna, mimari
   karmaşıklığı sınırlı tutuyor.
5. Kesinti/glitch riski bu ortamdan ÖLÇÜLEMEDİ (BELİRSİZ) — ama
   CPU maliyetini KÜÇÜLTMEK (hibrit, ~1×) bu BİLİNMEYEN riski TAM
   taşımaya (~3×) göre DOĞAL olarak azaltır, aynı kesinlik derecesiyle
   olmasa da mantıksal bir güvenlik payı sağlar.

**Cihazda DOĞRULANMASI gereken (öneri UYGULANMADAN ÖNCE ya da sonra):**
Yukarıdaki C bölümünün 3 maddesi (Safari Web Inspector'da AYNI
render-süresi testi, Instruments'ta gerçek profil, kulakla dinleme) —
bu rapor hibrit yaklaşımı GÜÇLÜ ÖLÇÜMLERLE destekliyor ama "gerçek
cihazda glitch YOK" iddiasını KANITLAMIYOR, sadece riski matematiksel
olarak KÜÇÜLTÜYOR.

**İş yükü/risk sıralaması (küçükten büyüğe):** Kısmi çözüm (offset
devri, tek başına) < Hibrit < Tam taşıma.
**Bu turun önerisi Hibrit'i işaret ediyor** çünkü Kısmi Çözüm
"topallama"yı SADECE HAFİFLETİYOR (rebuild/ramp kalıyor), Hibrit ise
AYNI CPU güvenliğiyle sorunu KÖKTEN çözüyor — iş yükü farkı (Kısmi'ye
göre) makul bir bedel.

---

**Dokunulan:** Sadece bu rapor dosyası (`OLCUM-CPU-17-08.md`, YENİ).
**Dokunulmayan:** `www/js/` altında hiçbir kod dosyası, hiçbir test
dosyası, `DURUM.md` — task'ın kendi kuralı harfiyen uygulandı.

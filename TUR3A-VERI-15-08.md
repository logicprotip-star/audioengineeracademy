# TUR 3A — VERİ VE DEPOLAMA DAYANIKLILIĞI

_15 Ağustos 2026 · commit `4bf0329`'a kadar._

**Kapsam notu (dürüstlük, Tur 1/2'nin AYNI kuralı):** 7 bölüm, her biri
onlarca alt soru istiyor. Gerçek dosya biçim/bit-derinliği/sample-rate
kombinasyonlarının TAMAMINI (wav/aiff/m4a/mp3/flac/caf/ogg × 16/24/32bit ×
5 sample rate × 4 kanal düzeni) GERÇEKTEN üretip yükleyip test etmek bu
ortamda YAPILAMADI (gerçek cihaz/ikili dosya envanteri yok) — kod
YOLLARI izlenip HESAPLANABİLEN yerlerde (bayt/RAM matematiği gibi)
GERÇEK sayılar üretildi, cihaz gerektiren yerler BELİRSİZ bırakıldı.

---

## A) DOSYA YÜKLEME MATRİSİ

### 🟢 Format kabul/ret — KODDAN kesin
`core/upload.js:61`: `ALLOWED_AUDIO_EXTENSIONS = ["wav", "mp3", "m4a",
"aac", "aiff", "flac", "ogg"]` (+ `aif`→`aiff` alias, satır 72).
**`.caf` LİSTEDE YOK — REDDEDİLİR**, `validateAudioFile()`
(satır 109-121) "Desteklenmeyen dosya türü" mesajıyla, ÇÖKME YOK.
Uzantı kontrolü SADECE `file.name`'in son parçasına bakıyor — dosya
İÇERİĞİNİN gerçekte o formatta olup OLMADIĞI (ör. `.mp3` uzantılı ama
içi WAV) bu aşamada KONTROL EDİLMİYOR, `decodeAudioData()`'ya bırakılıyor
(aşağıya bkz.) — yanlış kabul RİSKİ yok, çünkü decode aşaması GERÇEK
formatı doğruluyor.

### 🟢 Bozuk header / DRM'li / sıfır uzunluk / uzantısı yanlış dosya — ÇÖKMEZ, KODLA doğrulandı
`upload.js:loadFile()` (178-251): HER adım `try/catch` içinde —
`file.arrayBuffer()` hatası → "Dosya okunamadı" (194), sıfır bayt →
"Dosya boş" (198), `decodeAudioData()` hatası → RIFF/WAVE imzası
kontrolü (218-220) ile elle WAV ayrıştırıcıya (`decodeWavPcm`) düşme
denemesi, O DA başarısız olursa "Bu dosya açılamadı" (247). **DRM'li bir
dosya (Apple Music) `decodeAudioData()`'da GERÇEKTEN başarısız OLUR**
(şifreli/korumalı ses verisi çözülemez) — bu da AYNI "Bu dosya açılamadı"
yoluna düşer, ÇÖKME YOK. Hiçbir dalda çıplak (yakalanmamış) bir istisna
YOK — 3 katmanlı savunma (decodeAudioData → RIFF kontrolü → decodeWavPcm
→ "başarısız" mesajı).

### BELİRSİZ — iCloud'da indirilmemiş dosya
Kod, `<input type=file>`/native dosya seçicinin (FilePicker plugin)
DÖNDÜRDÜĞÜ bir `File`/yol nesnesiyle çalışıyor — seçici KENDİSİ
iCloud'da henüz indirilmemiş bir dosyayı seçtirmeye İZİN VERİR mi,
verirse boş/kısmi veri mi döner, bu SEÇİCİNİN (iOS sistem UI'ı, bu
repoda YOK) davranışına bağlı — koddan DOĞRULANAMAZ, cihaz testi
gerektirir.

### 🟢 100 MB sınırı — TAM boyut, KESİN
`upload.js:117`: `if (file.size > MAX_AUDIO_FILE_MB * 1024 * 1024)` —
`MAX_AUDIO_FILE_MB=100` (satır 80), karşılaştırma `>` (`>=` DEĞİL).
**99.9 MB: KABUL. TAM 100.0 MB (104857600 bayt): KABUL (sınırda değil,
sınırın kendisi dahil). 100.1 MB: RET.** Bu turda node ile AYRICA
doğrulandı (`104857600 > 104857600` → `false`, kabul; `104857601 >
104857600` → `true`, ret).

### 🟢 Aynı dosyayı iki kez yükleme — DEDUP YOK, kasıtlı görünüyor
`toolsGenerateId()` her yüklemede benzersiz bir id üretiyor (timestamp+
random) — aynı dosya iki kez yüklenirse İKİ AYRI kayıt oluşuyor (aynı
isim, farklı id), `TOOLS_LIBRARY_MAX=5` kotasına İKİSİ DE sayılıyor.
Çökme/veri bozulması YOK, sadece bir UX tercihi (içerik-bazlı
tekilleştirme yapılmıyor) — düzeltme GEREKTİRMEZ, bilgi amaçlı.

### BELİRSİZ — emoji/çok uzun isim/özel karakter dosya adı
Kod dosya adını (`file.name`) OLDUĞU GİBİ saklıyor/gösteriyor — JS
string'leri Unicode'u native destekler, bir ÇÖKME beklenmiyor. Sabit
genişlikli bir kart/liste satırında ÇOK UZUN bir ismin CSS ile nasıl
kırpıldığı (`text-overflow`/`ellipsis` var mı) bu turda GÖRSEL olarak
doğrulanmadı — BELİRSİZ, düşük risk.

### 🔴 CİDDİ, HESAPLANDI — 100 MB'lık SIKIŞTIRILMIŞ bir dosya GB mertebesinde RAM'e açılabilir (kod KENDİSİ bunu ZATEN biliyor, kullanıcıya İLETİLMİYOR)
`upload.js:82-87`'nin KENDİ yorumu bunu ÖNCEDEN kabul ediyor: "100 MB'lık
sıkıştırılmış bir dosya OOM riskini geri getirebilir." Bu turda TAM
sayı HESAPLANDI: Web Audio `AudioBuffer` HER ZAMAN Float32 (kanal başına
4 bayt/örnek) tutar, kaynağın sıkıştırma/bit-derinliğinden BAĞIMSIZ.
100 MB'lık bir M4A/AAC dosyası, DÜŞÜK bitrate'te (128 kbps) ~104 dakika
sürebilir — 44.1kHz/stereo'da decode edilince: `104×60×44100×2×4 ≈ 2.2
GB`. 256 kbps'te (~52 dk) bile `~1.1 GB`. **Boyut sınırı (100 MB) dosyanın
KENDİSİNİ sınırlıyor, DECODE EDİLMİŞ boyutu DEĞİL** — hiçbir SÜRE/UZUNLUK
sınırı YOK (grep ile doğrulandı, `www/js/**` genelinde dakika/süre bazlı
bir kontrol YOK). iPhone SE (2-3 GB toplam RAM) gibi bir cihazda bu,
neredeyse KESİN bir JetSam (bellek baskısı) sonlandırmasıdır. **Kod
bunu BİLEREK kabul etmiş** ("kullanıcıya bu ayrım açıklanıp onaylandı"
yorumu) ama kullanıcıya GÖSTERİLEN metin (`"Dosya çok büyük... ${MAX_AUDIO_FILE_MB}
MB sınırını aşıyor"`) SADECE bayt boyutundan bahsediyor, SÜRE/bitrate
riskinden HİÇ bahsetmiyor — kullanıcı 100MB'lık 2 saatlik düşük-bitrate
bir podcast/mix yüklerse hiçbir uyarı ALMADAN OOM'a çarpabilir.

### Sample rate dönüşümü — 🟢 doğru, ölçüm bozulmuyor
`ctx.decodeAudioData()` (tarayıcı-native) dosyayı OTOMATİK OLARAK
AudioContext'in KENDİ `sampleRate`'ine resample eder (Web Audio
spesifikasyonu). Elle WAV yolu (`decodeWavPcm`) İSE `ctx.createBuffer(...,
wav.sampleRate)` (upload.js:231) — dosyanın KENDİ sample rate'inde bir
buffer oluşturuyor, ctx'inkiyle EŞLEŞMEYEBİLİR. **Bu bir ölçüm hatası
YARATMIYOR** çünkü `tonal-balance.js:measureSpectralDeviation()`
(satır 162) offline context'i `audioBuffer.sampleRate`'DEN (buffer'ın
KENDİ, dinamik değeri) kuruyor — HANGİ yoldan geldiği FARK ETMİYOR,
analiz HER ZAMAN buffer'ın gerçek sample rate'iyle tutarlı çalışıyor
(koddan doğrulandı, iki yol da AYNI dinamik-okuma deseniyle güvenli).

---

## B) DEPOLAMA YAŞAM DÖNGÜSÜ

### 🔴 CİDDİ, YENİ BULUNDU — 3 localStorage anahtarı `storage.js`'in TAMAMEN DIŞINDA, G229'un KORUMASI DIŞINDA kaldı
`app.js`'te (core/storage.js'İ HİÇ ÇAĞIRMADAN) DOĞRUDAN
`localStorage.setItem()`/`getItem()` kullanan TAM 3 anahtar bulundu
(grep ile tam liste çıkarıldı — bunların DIŞINDA app.js'te başka bir
doğrudan çağrı YOK):
- `TOOLS_LIBRARY_KEY` ("Dosyalarım" manifesti, `toolsSaveLibraryManifest()`,
  app.js:9179-9185)
- `TOOLS_ACTIONS_KEY` / `TOOLS_MEASUREMENTS_KEY` ("Son İşlemlerim"/"Son
  Ölçümlerim", `toolsSaveJson()`, app.js:9600-9601)

ÜÇÜ de `try { localStorage.setItem(...) } catch (e) {}` — G229'un
`storage.js`'e getirdiği `trySave()` korumasının (log + `false` dönüşü)
**HİÇBİRİNİ TAŞIMIYOR** — G229'DAN ÖNCEKİ storage.js fonksiyonlarıyla
BİREBİR AYNI sessiz-hata deseni, ama G229'un TARAMASI SADECE
`storage.js`'e bakmıştı, bu 3 anahtar `storage.js`'in DIŞINDA olduğu
için KAÇTI. **Somut etki:** "Dosyalarım" listesine bir dosya eklenince
(depolama doluyken) manifest SESSİZCE yazılamayabilir — kullanıcı dosyayı
"eklemiş" görür (bu oturumda `toolsFiles` bellek-içi diziye zaten
`push` edilmiş, satır 9295 — `saveFile()` başarısız olsa bile BU push
ÇALIŞIR), ama bir sonraki açılışta liste eski hâline döner, HİÇBİR
UYARI olmadan.

### 🟢 Ama: "yetim kayıt" senaryosu ZATEN başka bir katmanda yakalanıyor
`fileStorage.saveFile()`'ın KENDİSİ ayrı bir korumaya sahip — app.js:9286-9293
`try/catch` ile SARILI, başarısızlıkta "Dosya kaydedilemedi — Dosya bu
oturumda kullanılabilir ama kalıcı olarak saklanamadı" toast'ı GÖSTERİYOR
(G229'un TAM deseni, muhtemelen ONDAN önce de vardı). Yani dosyanın
KENDİSİ (byte'ları) yazılamazsa kullanıcı HABER ALIYOR — sorun SADECE
manifest'in (metadata listesinin) kendisi. VE: dosya gerçekten eksikse
(silinmiş/hiç yazılmamış), kullanıcı o kaydı KULLANMAYA çalıştığında 9
AYRI yerde (grep ile sayıldı: app.js:885, 9394, 9585, 10888, 11022,
11072, 12283, 12326, 12454) "Dosya bulunamadı — X artık cihazda yok"
kontrolü VAR, çoğu OTOMATİK olarak kütüphaneden de kaldırıyor —
**GORSEL-TEST #49/G202'nin "kapandı" iddiası bu turda KODDAN DOĞRULANDI,
DOĞRU** — silinmiş/eksik bir dosyaya bağlı mod ÇÖKMÜYOR, temiz bir
mesajla self-heal ediyor.

### 🟢 Dosyalar NEREDE duruyor — `Directory.Data`, iOS'ta = Documents (BAĞIMSIZ kaynaktan doğrulandı)
`file-storage.js:17-18`: `FS_DIRECTORY = "DATA"`. Bu iddia app.js'in
KENDİ yorumuna GÜVENİLMEDİ — `node_modules/@capacitor/filesystem`'in
KENDİ (Capacitor'ın resmi) `definitions.js`'i okundu: *"The Data
directory. On iOS it will use the Documents directory... Files will be
deleted when the application is uninstalled."* **Documents klasörü iCloud/
iTunes YEDEĞİNE DAHİL** (Caches'in aksine). `TOOLS_LIBRARY_MAX=5` × 100MB
= **teorik en kötü durumda ~500 MB kullanıcı yedeğine ekleniyor** —
Apple'ın KENDİ ayrımına göre (kullanıcı-üretimi içerik → Documents,
yeniden-indirilebilir önbellek → Caches) bu SEMANTİK OLARAK DOĞRU bir
seçim (yüklenen ses dosyaları GERÇEKTEN kullanıcı içeriği, önbellek
DEĞİL) — bir guideline İHLALİ değil, ama büyük yedekler kullanıcının
iCloud kotasını tüketebilir. **Bilgi amaçlı, düzeltme ÖNERİLMİYOR**
(Apple'ın kendi tavsiyesiyle ZATEN uyumlu).

### BELİRSİZ — yedekten geri yükleme / uygulama güncelleme / "Uygulamayı Boşalt" sonrası
Documents klasörünün yedeklenip GERİ YÜKLENDİĞİNDE dosyaların GERÇEKTEN
geri geldiği, güncelleme sırasında KORUNDUĞU, "Uygulamayı Boşalt"
(offload — kullanıcı verisi/Documents'ı KORUR, sadece ikili dosyayı
siler, Apple'ın KENDİ dokümantasyonu) sonrası YENİDEN kurulumda
localStorage'ın (WKWebView'ın KENDİ depolama alanı, Documents'tan AYRI)
NE OLDUĞU — BU ÜÇÜ de GERÇEK bir cihaz/App Store test döngüsü
gerektiriyor, koddan KANITLANAMAZ. **Önemli ayrım (koddan çıkarılan
TEK somut sonuç):** dosyalar (Documents, Filesystem plugin) ve
localStorage (WKWebView depolama) FARKLI ALT SİSTEMLER — "Uygulamayı
Boşalt" senaryosunda biri KORUNUP diğeri SIFIRLANABİLİR, bu KOMBİNASYON
(dosya var ama manifest yok, ya da manifest var ama dosya yok) HER İKİ
yönde de zaten 9-noktalı "dosya bulunamadı" ağıyla KISMEN karşılanıyor
— ama bu SENARYO ÖZELİNDE hiç TEST EDİLMEDİ.

### 🟢 localStorage kotası — kaç KB kullanılıyor
Doğrudan ölçülemedi (gerçek cihaz/tarayıcı YOK) ama BÜYÜKLÜK
MERTEBESİ hesaplanabilir: en büyük kalıcı alan `stats` (12-kayıtlı
`history` + `perMode`/`perDiff`/`examState` — 12 mod × birkaç sayısal
alan) muhtemelen birkaç KB; `zoneStats` (6 bant × birkaç sayı) < 1KB;
`toolsFiles` manifesti (5 dosya × ~15 alan, `peaks` dizisi DAHİL —
`toolsWaveformPeaks(buffer, 15)` sadece 15 sayı, küçük) birkaç KB.
**Toplam muhtemelen ONLARCA KB mertebesinde, tarayıcıların TİPİK
5-10MB localStorage sınırının ÇOK altında** — kesin ölçüm YAPILMADI,
ama BÜYÜK bir risk gibi GÖRÜNMÜYOR, hata analizi (G227'de tartışılan,
henüz YOK) eklenirse bu MERTEBE değişir (o turun kendi "büyüme riski"
notuna bkz.).

---

## C) BELLEK

### 🔴 (A'da detaylandırıldı) 100 MB sıkıştırılmış dosya → 1-2 GB decode edilmiş RAM
Bkz. yukarısı — bu bölümün de merkezi bulgusu.

### 🔴 CİDDİ, KODDAN SAYILDI — 7 AYRI `createUploadManager()` örneği, HER BİRİ kendi buffer'ını AYRI tutuyor
Grep ile TAM olarak sayıldı: `uploadManager` (798), `uploadManagerA`/
`uploadManagerB` (932-933, Frekans Çakışması), `tonalRefUploadManager`
(10701), `tonalMixUploadManager` (10716), `toolsRefFilterUploadManager`
(11930), `toolsRawMixUploadManager` (12395) — **7 tanesi de MODÜL
SEVİYESİNDE `const`, uygulamanın TÜM ömrü boyunca YAŞIYOR** (asla
garbage-collect edilmiyor, SADECE kendi `clear()`'ları çağrılırsa
buffer'ları boşalıyor). Bir kullanıcı Mixini Yükle'ye BİR dosya,
Referans Filtreleri'ne BAŞKA bir dosya, Tonal Balance'ın hem referans
hem mix'ine BAŞKA dosyalar yüklerse — TEORİK olarak 4-7 TAM boyutlu
decode edilmiş buffer AYNI ANDA bellekte durabilir. **Somut senaryo
(A'daki hesaplamayla birleşince):** 3 farklı bağlama 3 ayrı ~50MB'lık
düşük-bitrate dosya yüklense (hâlâ 100MB sınırının altında, HER BİRİ
TEK BAŞINA "kabul edilebilir" görünse bile) toplam decode edilmiş RAM
GB'ları bulabilir.

### BELİRSİZ — decode sırasında arka plana atılırsa
Kodda decode-sırasında-arka-plana-alınma için ÖZEL bir durum/kurtarma
YOK (`visibilitychange` dinleyicisi VAR ama SES ÇALMA bağlamının
yaşam döngüsüne odaklı, `decodeAudioData()`'nın KENDİSİNİN askıda
kalıp kalmadığını İZLEMİYOR). iOS'un JS çalıştırmayı arka planda
DURDURUP DURDURMADIĞI/işlemi TAMAMEN öldürüp öldürmediği WKWebView'ın
kendi arka-plan-yürütme politikasına bağlı — **cihaz testi gerektirir,
BELİRSİZ**.

### 🟡 AudioBuffer serbest bırakma — JS'in KENDİ GC'sine bırakılmış, sızıntı KANITLANMADI ama garanti de EDİLMEDİ
`clear()` (upload.js:269-273) `buffer = null` yapıyor — bu, JS motoruna
"bu nesneye artık referans yok" sinyalini VERİYOR (garbage collection
İÇİN gerekli ama YETERLİ koşul), GERÇEK bellek serbest bırakımı GC'nin
kendi zamanlamasına bağlı (WebKit'in JSC'si genelde HIZLI toplar ama
KESİN bir zamanlama garantisi YOK). `clear()` HER YERDE tutarlı ÇAĞRILIYOR
mu (yani bir bağlamdan AYRILINCA buffer GERÇEKTEN null'lanıyor mu, yoksa
sadece bazı yollarda mı) — bu turda TEK TEK 7 yöneticinin HER çağrı
sitesinin tam envanteri ÇIKARILMADI (kapsam dışı bırakıldı) — BELİRSİZ.

---

## D) VERİ KALICILIĞI VE MIGRATION

### 🟢 localStorage anahtar envanteri — TAM SAYIM
**15 anahtar** (12'si `storage.js`'te, 3'ü doğrudan `app.js`'te — bkz.
B bölümü): `eqEarTrainerProXStats`, `eqEarTrainerProXDaily`,
`fa_zonestats` (TEK isim-uyumsuzu — `eqEarTrainerProX*` önekini
TAŞIMIYOR, kozmetik/düşük risk), `eqEarTrainerProXPrefs`,
`eqEarTrainerProXDailyAcc`, `eqEarTrainerProXDev`,
`eqEarTrainerProXUploadSelections`, `eqEarTrainerProXTonalRefs`,
`eqEarTrainerProXSourceSelections`, `eqEarTrainerProXAnswerFormatSelections`,
`eqEarTrainerProXPurchase`, `eqEarTrainerProXInProgressRound`,
`eqEarTrainerProXToolsLibrary`, `eqEarTrainerProXToolsActions`,
`eqEarTrainerProXToolsMeasurements`.

### 🟢 Bozuk JSON — uygulama AÇILIYOR, ÇÖKMÜYOR (KODDAN, TAMAMI için)
`loadStats`/`loadPrefs`/`loadPurchase`/`loadDevFlags`/`loadUploadSelections`/
`loadSourceSelections`/`loadAnswerFormatSelections`/`loadToolsTonalReferences`/
`loadZoneStats`/`loadInProgressRound` (`storage.js`) — **HEPSİ**
`try/catch` + fresh-default fallback taşıyor (G229'dan ÖNCE de böyleydi
— bu YÜK tarafının ZATEN sağlam olduğunu doğruluyor, sadece YAZMA
tarafı G229'a kadar korumasızdı). `toolsLoadLibraryManifest()`/
`toolsLoadJson()` (app.js, storage.js DIŞI) da AYNI korumayı taşıyor
(satır 9172-9178, 9597-9599) — **G229'un "yazma tarafı" bulgusuNUN
AKSİNE, OKUMA tarafı hem `storage.js`'te hem app.js'in DOĞRUDAN
kullandığı 3 anahtarda ZATEN korumalı** — G229'un dersi (task'ın kendi
sorusu "trySave() okuma tarafında da var mı?") burada TERSİNE dönüyor:
okuma HİÇ bozulmamıştı, SADECE yazma bozuktu (ve o da artık DÜZELTİLDİ,
storage.js için).

### 🟢 Eksik anahtar / beklenmedik tip — TEK TEK doğrulandı (mevcut testler ÜZERİNDEN)
`test/storage.test.mjs`'in ZATEN var olan testleri (bu turda YENİDEN
okundu, YENİ yazılmadı) tam olarak BUNU kapsıyor: "hiç kayıt yoksa boş
obje döner", "bozuk JSON'da boş objeye düşer", "bir DİZİ kayıtlıysa
(beklenmeyen şekil) boş objeye düşer" — 3 yükleme fonksiyonu için AYRI
AYRI test edilmiş. `loadStats()`'ın KENDİSİ eksik `perDiff`/`perMode`/
`examState` alanlarını AYRI AYRI dolduruyor (satır 129-149 civarı,
önceki turlarda okunmuştu) — kısmi/eski kayıtlar İÇİN AYRI bir göç
mantığı VAR.

### 🟡 Migration'lar — BAS/ALT-ORTA bölünmesi KASITLI OLARAK veri taşımıyor (belgeli, ama okuma tarafında test EDİLMEDİ bu turda)
`storage.js:466-475`'in KENDİ notu: eski "BAS" (120-500Hz) anahtarı
YENİ "BAS" (120-250Hz) + "ALT-ORTA" (250-500Hz) ikiliğine BÖLÜNMEDİ —
eski birikmiş veri YENİ "BAS"a (üst sınırı değişmiş haliyle) ait
sayılmaya DEVAM EDİYOR, "ALT-ORTA" sıfırdan başlıyor. **Bu KASITLI bir
ürün kararı** (verinin GERÇEKTEN nereye ait olduğu bilinmiyor, tahmin
UYDURULMADI) — ama SONUCU: eski bir kullanıcının "BAS" isabet oranı
GERÇEKTE 120-500Hz aralığının KARIŞIMI iken YENİ UI'da "120-250Hz" diye
etiketleniyor, hafif YANILTICI olabilir. Düşük risk, zaten belgeli.

### 🔴 Sürüm/şema numarası HİÇ TUTULMUYOR — ölçüldü (grep, sıfır sonuç)
`www/js/**` genelinde "appVersion"/"schemaVersion"/"dataVersion" gibi
bir alan HİÇ YOK. Migration'lar TAMAMEN STRUKTÜREL algılamaya dayanıyor
(`if (!s.perMode) ...` gibi "alan yoksa doldur" desenleri) — bu ŞU ANA
KADAR yeterli olmuş (mevcut testler bunu doğruluyor) ama **1.1'de
büyük bir şema değişikliği (ör. G227'nin önerdiği hata-analizi kayıt
formatı) gelirse "bu kayıt HANGİ sürümden kaldı" sorusunu cevaplayacak
HİÇBİR alan YOK** — yapısal algılama (alan var/yok) HER migration için
yeterli olmayabilir (ör. bir alanın ANLAMI değişirse, varlığı/yokluğu
bunu AYIRT EDEMEZ).

---

## E) GERİ ALINABİLİRLİK

### 🟢 Reklam ödülü verildi, kayıt patladı — G229'DAN SONRA artık TUTARLI
`grantAdLife()`/`grantSessionExtension()` (app.js) `persistStats()`
üzerinden `storage.saveStats()`'a gidiyor — bu ARTIK G229'un koruması
ALTINDA (try/catch + false dönüş). AMA: `grantAdLife()`/
`grantSessionExtension()`'ın KENDİLERİ `saveStats()`'ın dönüş değerini
OKUMUYOR (G229 SADECE `savePurchase()`'ın çağıranlarını güncelledi,
DİĞER `save*()` çağıranları — XP/can/reklam ödülü dahil — G229'un
"ölçülü" kapsamı GEREĞİ dokunulmadı, bkz. DURUM.md G229 notu). **Sonuç:**
`localStorage.setItem()` hata fırlatırsa artık en azından ÇÖKMÜYOR
(G229'un try/catch'i) ve `console.error` ile LOGLANIYOR — ama can/XP
KAZANIMI bellek-içi `stats` nesnesinde ZATEN GERÇEKLEŞMİŞ olur (`stats.lives++`
gibi satırlar `persistStats()`'TAN ÖNCE çalışıyor) — kayıt başarısız
olsa bile GEÇERLİ oturumda kullanıcı ödülü GÖRÜR/KULLANIR, sadece
kalıcı olmaz (savePurchase'daki GİBİ bir "geri alma" YOK, çünkü XP/can
`purchaseState.proPurchased` gibi TEK-YÖNLÜ kritik bir bayrak DEĞİL —
bir sonraki cevapta yeniden hesaplanan, kümülatif bir sayı). **Bu G229'un
davranışıYLA TUTARLI bir tasarım** (task'ın "ölçülü ol" talimatının
DOĞRUDAN sonucu) ama kullanıcıya HİÇBİR bildirim YOK (sadece console.error)
— XP/can kaybı G229'un `savePurchase()` kadar KRİTİK değil (para
kaybı DEĞİL) ama YİNE DE sessiz.

### 🟡 Dosya yüklendi, listeye yazılamadı → (B bölümünde detaylandırıldı)
Bkz. B bölümü — "yetim liste kaydı" senaryosu, DÜŞÜK-ORTA risk (9
noktalı "dosya bulunamadı" ağı VAR ama İLK anlık kafa karışıklığı
mümkün).

### 🟢 Yarım kalan işlem temizliği — `inProgressRound` ÖRNEĞİ ile doğrulandı
`storage.js`'in KENDİ notu (satır 17-22): bu anahtar KASITLI olarak
Preferences'a YANSITILMIYOR ("EPHEMERAL/düşük risk... 4 kritik
anahtarın 'yedeklemeye değer' muamelesi burada BİLİNÇLİ uygulanmadı") —
yarım kalan bir tur kaybolsa bile en KÖTÜ SONUÇ "kaldığı yerden devam"
fırsatının kaçması, kalıcı veri KAYBI değil. `#53`'ün (önceki turlarda
kapatılmış) "3 saatten eskiyse bayat say" mantığı da ZATEN VAR.

---

## F) İLK KURULUM vs GÜNCELLEME

### 🔴 (D'de detaylandırıldı) Sürüm numarası HİÇ tutulmuyor
Bkz. yukarısı — bu bölümün de merkezi bulgusu, "bugün öğrenilen"
(stats.rounds sıfırlanması) olayın YAPISAL kök nedeni: kayıtta hangi
sürümden kaldığına dair HİÇBİR iz yok, bu yüzden "regresyon mu temiz
kurulum mu" ayrımı SADECE HARİCİ bağlamdan (kullanıcının kendi hafızası/
TestFlight kaydı) yapılabiliyor, KODDAN değil.

### BELİRSİZ — temiz kurulum vs güncelleme farkı, TestFlight build'leri arası veri
Kod SEVİYESİNDE bir "ilk kurulum" algılama YOK (`loadStats()` sadece
"kayıt yoksa fresh üret" yapıyor — bu hem GERÇEK ilk kurulumda hem
"birisi localStorage'ı elle temizlediyse" AYNI DAVRANIYOR, AYIRT
EDEMİYOR). TestFlight build'leri arası (AYNI bundle ID, farklı
`CFBundleVersion`) verinin korunup KORUNMADIĞI — bu Apple'ın KENDİ
TestFlight altyapısının davranışı (genelde AYNI bundle ID = AYNI
sandbox = veri KORUNUR, ama KESİN teyit bu repodan YAPILAMAZ) — BELİRSİZ.

---

## G) AYNI HATANIN DİĞER ÖRNEKLERİ (sınıf taraması)

### 🔴 Sınıf: "korumasız localStorage yazımı" — TAM 3 örnek bulundu (B/D bölümünde detaylandırıldı)
`TOOLS_LIBRARY_KEY`/`TOOLS_ACTIONS_KEY`/`TOOLS_MEASUREMENTS_KEY` —
G229'un TARAMASI `storage.js`'e ÖZELDİ, bu 3 anahtar app.js'te
DOĞRUDAN yazıldığı için KAÇTI. **Bu turun EN SOMUT, TEK-CÜMLELİK
bulgusu: G229'un deseni (`trySave`) bu 3 yere de UYGULANMALI.**

### 🟢 Sınıf: "korumasız async işlem" — GENİŞ TARAMA yapılmadı, örneklem alındı
`upload.js`/`file-storage.js`'in KENDİ kritik yolları (loadFile,
saveFile) İYİ korunuyor (yukarıda doğrulandı). `ads.js`/`iap.js`'in
TÜM public fonksiyonları (önceki turlarda okunmuştu) `try/catch` +
`{ok,title,detail}` sözleşmesi taşıyor. **12 mod dosyasının HER
BİRİNİN KENDİ async kodu (ör. ses zinciri kurma) TEK TEK taranmadı**
— BELİRSİZ, kapsamlı bir statik analiz gerektirir.

### 🟢 Sınıf: "iki yerde tanımlı aynı sabit/mantık" — TUR2'de ZATEN bulunmuştu, yeni örnek ARANMADI
TUR2'nin THREE_WAY + formatDb (db-seviyesi.js/boost-mu-cut-mu.js,
birebir kopya) bulguları hâlâ GEÇERLİ. Bu turda YENİ bir örnek için
AYRICA arama YAPILMADI (kapsam dışı bırakıldı, TUR2'nin BULGUSU
tekrarlanmadı).

### 🟡 Sınıf: "sessizce yutulan hata" — TAM SAYIM yapılmadı, örneklem güçlü
`grep "catch (e) {}"` `www/js/app.js`+`core/*.js` genelinde **35 EŞLEŞME**
(bu turda YENİDEN sayıldı, TUR2'nin sayısıyla TUTARLI). Bunların
BÜYÜK ÇOĞUNLUĞU (örneklem alındı) Web Audio node `disconnect()`/`stop()`
çağrıları — ZATEREN-durmuş bir node'u tekrar durdurmanın attığı
ZARARSIZ istisnaları yutuyor, GERÇEK bir veri/hata kaybı DEĞİL. Kalan
küçük bir kısmı (mirrorSet/mirrorRemove'un Preferences `.catch(()=>{})`'i)
BİLEREK "en kötü ihtimalle yedek başarısız, ana kayıt YİNE de var"
mantığıyla tasarlanmış — G229'un asıl bulduğu (ANA kayıt ÖZELLİKLE
korumasız) tipten FARKLI. **35'in TAMAMININ tek tek "veri kaybı riski
taşıyor mu" sınıflandırması bu turda YAPILMADI** — BELİRSİZ, TUR2'nin
zaten yaptığı örneklem ÖTESİNDE yeni bir tarama gerekir.

---

# ÖNCELİK LİSTELERİ

## Yayın öncesi düzeltilecekler (öncelik sırasıyla)
1. **🔴 3 localStorage anahtarı (`TOOLS_LIBRARY_KEY`/`TOOLS_ACTIONS_KEY`/
   `TOOLS_MEASUREMENTS_KEY`) G229'un `trySave()` desenine ALINMALI** —
   somut, dar kapsamlı, G229'un AYNI çözümünün 3 yeni yere uygulanması.
2. **🔴 100 MB dosya boyutu sınırının YANINDA bir SÜRE/bitrate uyarısı**
   — kullanıcı düşük-bitrate uzun bir dosya yüklerse GB mertebesinde
   RAM'e OOM riski taşıdığını GÖRMÜYOR. Minimum: mesaj metnine bir not
   eklemek; daha güçlü çözüm: decode ÖNCESİ dosyanın YAKLAŞIK süresini
   (bitrate tahminiyle) kontrol etmek — ürün kararı gerekir.

## 1.1'e bırakılabilir
- 7 `createUploadManager()` örneğinin AYNI ANDA birden fazla dolu
  buffer tutabilmesi — nadir bir kombinasyon gerektirir (birden fazla
  bağlama ayrı ayrı büyük dosya), düşük olasılık.
- Sürüm/şema numarası eklenmesi — G227'nin hata-analizi kayıt formatı
  genişletmesiyle BİRLİKTE ele alınabilir (aynı "1.0'da temel at" mantığı).
- `fa_zonestats` anahtarının isim tutarlılığı (`eqEarTrainerProX*`
  önekine uydurma) — kozmetik, migration gerektirir (dikkatli olunmalı).

## Sadece belgelenecekler
- Documents/iCloud yedek boyutu (~500MB en kötü durum) — guideline
  ihlali DEĞİL, kullanıcıya "yer açma" bağlamında bilgi verilebilir.
- Sürüm numarası eksikliğinin gelecekteki migration'lara etkisi —
  DURUM.md'ye not düşülebilir (bu rapor ZATEN bunu yapıyor).

**Bu turda hiçbir kod DEĞİŞTİRİLMEDİ — sadece ölçüldü.**

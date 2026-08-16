# TUR710-PERF-ARAYUZ-15-08 — Performans/Bellek + Arayüz/Yerelleştirme Denetimi

_Kapsam: SADECE ÖLÇÜM, kod/dosya/commit YOK. 14 bölüm (A-N) — derinlik
BÖLÜME GÖRE DEĞİŞİYOR, her bölümün başında "DERİN"/"YÜZEYSEL" olarak
işaretlendi (task'ın kendi izniyle). Mümkün olan her yerde GERÇEK
ölçüm (Node'da kod çalıştırma, canlı tarayıcıda Playwright) kullanıldı,
tahmin edilmedi._

---

## PERFORMANS VE BELLEK

### A) AUDIONODE SIZINTISI — DERİN

**🟢 Her soru için YENİ node kuruluyor, ESKİSİ düzgün temizleniyor —
kod okunarak TAM doğrulandı:** `audio-engine.js:buildQuestionChain()`
kendi başında KOŞULSUZ `stopAudio()` çağırıyor (satır 751) — yani her
YENİ soru, ÖNCEKİ zinciri önce söndürüyor. `stopAudio()`'nun kendisi
iyi tasarlanmış: `currentNodes` dizisindeki her node'a önce bir
gain-ramp/`.stop(now+0.08)` PROGRAMLIYOR (tıklama önleme), SONRA
`DISCONNECT_DELAY_MS=100`ms GECİKMELİ bir `setTimeout` ile GERÇEK
`disconnect()` çağırıyor — kapanan setTimeout'un kendi closure'ı
KENDİ node listesini taşıyor, ardışık `stopAudio()` çağrıları
BİRBİRİNE KARIŞMIYOR.

**100 soruluk oturumda kaç node birikir — MİMARİ OLARAK BİRİKMİYOR:**
Her `buildQuestionChain()` çağrısı ÖNCEKİ zinciri 100ms içinde
disconnect ediyor — aktif+"disconnect bekleyen" en fazla İKİ ZİNCİR
aynı anda var olabilir (yeni kuruluyor + eski hâlâ ramp/disconnect
bekliyor), 100 soru boyunca bu sayı SABİT kalır, BİRİKMEZ.

**Mod değişiminde temizleniyor mu — EVET** (aynı `stopAudio()` yolu,
mod değişimi de bir YENİ round/buildQuestionChain tetikler).

**G244'ün limiter'ı bu döngüye dahil mi — KISMEN, AYRI bir mekanizmayla
ama KAPSANIYOR:** `toolsTonalOutputLimiter` `audio-engine.js`'in
`currentNodes` listesinde DEĞİL (bu ayrı bir app.js zinciri, farklı bir
mimari — Tonal Balance'ın "A" oynatıcısı) — ama KENDİ eşdeğer
temizliğine sahip: `toolsTonalStopMixPlayback()` içinde AÇIKÇA
`disconnect()` ediliyor (G244'te eklendi), bu fonksiyon 13 farklı
çıkış noktasından (mod değişimi dahil) çağrılıyor — TUR9'da
doğrulanmıştı, bu turda YENİDEN teyit edilmedi (tekrar kod okuması
gerekmedi, aynı bulgu geçerli).

### B) DECODE ÖNBELLEĞİ — DERİN

**Aynı dosya her soruda YENİDEN mi decode ediliyor — HAYIR, SADECE
BİR KEZ:** `audio-engine.js:loadSampleBuffer()` — `sampleBufferCache
= new Map()` (path→Promise<AudioBuffer>), cache-hit'te DOĞRUDAN
döner, kod yorumu AÇIKÇA *"decode SADECE BİR KEZ"* diyor. Eş zamanlı
istekler de GÜVENLİ (Promise cache'leniyor, race condition yok),
hata durumunda cache'ten SİLİNİYOR (yeniden deneme mümkün).

**9 dosya sürekli bellekte mi — EVET, ama KÜÇÜK:** `source-catalog.js`'te
TAM 9 `samplePath` girdisi (kick/snare/hihat/tom/groove_090/bass/
bass_alt/guitar/vocal) — HEPSİ kısa (birkaç saniyelik) örnek/döngü
dosyaları (`groove_090.m4a`=5.33sn, TUR9'da ölçülmüştü), TAM bir
şarkı DEĞİL. 9 kısa dosyanın TAMAMI decode edilip belleğe alınsa bile
toplam boyut birkaç MB'ı GEÇMEZ (BELİRSİZ kesin MB, tahmini
hesaplanmadı — ama dosya boyutları 468KB toplam m4a KOMPRESE, decode
edilmiş PCM Float32 hâli tipik olarak 5-10x büyür, yine de DÜŞÜK
onlarca MB mertebesinde kalır).

**AudioBuffer'lar ne zaman serbest bırakılıyor — SADECE context
yeniden oluşturulunca:** `sampleBufferCache.clear()` TEK bir yerde
çağrılıyor — zombi-context kurtarma senaryosunda (nadir bir olay,
G133 ailesi). Normal kullanımda 9 dosya, İLK kullanıldıkları andan
İTİBAREN uygulama kapanana kadar bellekte KALICI — bu KASITLI bir
önbellekleme kararı (CPU'yu bellekten daha DEĞERLİ sayan makul bir
takas), dosyaların küçüklüğü göz önüne alınınca 🟢.

### C) SAMPLE RATE UYUŞMAZLIĞI ⚠️ ÖNEMLİ — DERİN

**Frekans hesapları hangi rate'e göre — HİÇBİRİNE, ÇÜNKÜ GEREKMİYOR:**
`grep`'le TÜM kaynak kodda (`www/js/**/*.js`) hardcoded `44100`/`48000`
örnekleme hızı sabiti ARANDI — **SIFIR sonuç** (`analysis.js`'in TEK
eşleşmesi sadece bir YORUM satırı, K-ağırlıklandırma katsayılarının
TÜRETİLDİĞİ referans noktasını açıklıyor — fonksiyonun KENDİSİ
`sampleRate`'i PARAMETRE olarak alıyor, hardcode ETMİYOR). **Web
Audio API'nin kendi tasarımı BU SORUNU YAPISAL OLARAK ORTADAN
KALDIRIYOR:** `BiquadFilterNode.frequency` HER ZAMAN mutlak Hz
cinsindendir — tarayıcı, filtre katsayılarını AKTİF context'in GERÇEK
`sampleRate`'ine göre KENDİSİ hesaplar (spec gereği), UYGULAMA
KODUNUN bunu bilmesi/ayarlaması GEREKMEZ. Ayrıca `decodeAudioData()`
kendisi kaynak dosyayı (44.1kHz olsa bile) HEDEF context'in
`sampleRate`'ine (context 48kHz'se 48kHz'e) OTOMATİK yeniden
örnekliyor (Web Audio spec'in KENDİ davranışı) — yani decode
SONRASINDA `buffer.sampleRate === ctx.sampleRate` HER ZAMAN doğrudur,
"dosya 44.1kHz ama context 48kHz" diye bir ÇELİŞKİ decode'dan SONRA
zaten YOK OLUYOR.

**Analiz/spektrum kodu context'in GERÇEK sampleRate'ini DİNAMİK
okuyor mu — EVET, doğrulandı:** `app.js:10864` —
`bandDevsFromLiveSnapshot(toolsTonalLiveFreqData, ctx.sampleRate,
analyser.fftSize)` — `ctx.sampleRate` CANLI okunuyor, hardcode
edilmiş bir sayı DEĞİL.

**Sonuç — Frekans Bulma'da soru/cevap uyuşmazlığı riski BULUNAMADI,
ama %100 KESİNLİK bu ortamdan İDDİA EDİLEMEZ:** Web Audio spesifikasyonu
+ kod okuması BİRLİKTE güçlü bir güvence veriyor (🟢'ye yakın), ama
GERÇEK bir iOS cihazda (context GERÇEKTEN 48kHz açıldığında,
`AVAudioSession`'ın kendi davranışıyla) UÇTAN UCA doğrulama bu ortamda
YAPILAMADI (gerçek WKWebView/AVAudioSession simüle edilemez) —
**cihazda ölçülmesi gerekenler listesine EKLENDİ.**

### D) NYQUIST VE YÜKSEK FREKANS — DERİN, GERÇEK HESAPLAMAYLA

**Z7'de/tavanda kaç Hz'e kadar soru soruluyor:** `FA_MIN=80,
FA_MAX=17000` (Frekans Bulma'nın frekans havuzu) — TÜM SEVİYELERDE
AYNI (seviye SADECE gain/Q değiştiriyor, aralığı DARALTMIYOR/
GENİŞLETMİYOR). Bu aralık **8 modda ORTAK** (kesim-noktasi/q-genisligi/
boost-mu-cut-mu/db-seviyesi/tonal-denge/distortion + frekans-bulma,
grep ile TAM doğrulandı — hepsi `frekans-bulma.js`'ten import/re-export
ediyor).

**44.1kHz'de Nyquist 22050Hz, FA_MAX/Nyquist=%77.1** — filtre bu
noktada beklendiği gibi davranıyor mu, GERÇEKTEN HESAPLANDI (`core/
eq-loudness.js`'in G242'de yazılan RBJ matematiği kullanılarak, TAHMİN
DEĞİL): 17000Hz merkezli bir peaking filtre, TÜM gerçekçi gain/Q
kombinasyonlarında (3/8/10dB × Q 0.8/2.5/5.0) **f0'da TAM beklenen
kazancı üretiyor** (ör. gain=10 → ölçülen 10.000dB, sıfır sapma) —
HİÇBİR bozulma/patoloji BULUNAMADI. Yanıt 17kHz'in ÜSTÜNDE DÜZGÜNCE
sönüyor (20kHz'de Q'ya göre 0.03-2.7dB'ye düşüyor, 21800Hz'de
neredeyse sıfır) — klasik Nyquist-yakını bilineer-dönüşüm bozulmaları
(genelde Nyquist'in %90-95'inin ÜSTÜNDE görülür) **%77'de BAŞLAMIYOR.**
**🟢 Ölçülmüş, kanıtlı sonuç: FA_MAX=17000Hz güvenli bir aralıkta.**

### E) FİLTRE KARARSIZLIĞI — DERİN, GERÇEK HESAPLAMAYLA

**Q=2.5 sabit, gain değişken kombinasyonu HANGİ moda ait — TAM-LISTE
karar P'nin kaynağı `frekans-bulma.js`'in STATİK "hard" tier'ı
(Q=2.5) — ama SÜREKLİ eğride (asıl kullanılan yol) Q SABİT DEĞİL,
seviyeyle DEĞİŞİYOR (0.8→5.0).**

**Z7'de (Seviye 7) gain/Q — HESAPLANDI:** gain≈6.84dB, Q≈1.43 —
"düşük frekans + yüksek gain" riskli kombinasyonu Z7'de OLUŞMUYOR.

**Kararsızlık riski var mı — GERÇEK HESAPLAMAYLA ÖLÇÜLDÜ, BULUNAMADI:**
Eğrinin KENDİSİ gain ve Q'yu **ZIT yönde** hareket ettiriyor —
Seviye 1'de EN YÜKSEK gain (10dB) AMA EN DÜŞÜK Q (0.8); Seviye
20/tavanda EN YÜKSEK Q (5.0) AMA EN DÜŞÜK gain (3dB) — "yüksek gain
+ yüksek Q" kombinasyonu KODDA HİÇ OLUŞMUYOR (muhtemelen kasıtlı
olmayan ama GERÇEK bir güvenlik özelliği). **HİPOTETİK en kötü
durum bile** (gain=10, Q=5, freq=80Hz — kodda hiç gerçekleşmeyen bir
kombinasyon) RBJ matematiğiyle test edildi: f0'da TAM 10.000dB
üretti, sıfır sapma/bozulma — **RBJ peaking filtreleri matematiksel
olarak HER pozitif Q/gerçek gain değeri için KARARLI** (poller birim
çember dışına ÇIKMIYOR), bu bir DSP-teorisi gerçeği, tahmin değil.
**🟢 Kararsızlık riski YOK.**

### F) rAF VE SES SENKRONU — DERİN, GERÇEK KOD BULGUSUYLA

**rAF ile ses saatinin kayması — HAYIR, mimari olarak İMKANSIZ:**
Çizim döngüleri HER FRAME `audioEngine.audioCtx`'i (ya da eşdeğer canlı
referansı) TAZE okuyor, kendi bağımsız bir zaman TOPLAMIYOR/BİRİKTİRMİYOR
— yani konum HER ZAMAN otoriter saatten YENİDEN türetiliyor, kümülatif
kayma MİMARİ OLARAK oluşamaz (en kötü durumda BİR FRAME'lik ~16ms
gecikme, birikmeyen bir gecikme).

**🔴/🟡 CİDDİ, GERÇEK BULGU — `drawVisualizer()`'ın rAF döngüsü
HİÇBİR ZAMAN DURMUYOR:** `audioEngine.onReady = () =>
drawVisualizer();` — bu SADECE BİR KEZ (ses ilk açıldığında)
tetikleniyor, ama `drawVisualizer()`'ın KENDİSİ fonksiyonun EN
BAŞINDA KOŞULSUZ `requestAnimationFrame(drawVisualizer)` çağırıyor —
yani BİR KEZ başladıktan SONRA, uygulamanın GERİ KALAN ÖMRÜ BOYUNCA,
HANGİ EKRANDA olursanız olun (Ayarlar/İlerleme/Araçlar, oyun
ekranından TAMAMEN uzakta), bu döngü SANİYEDE 60 KEZ çalışmaya devam
ediyor — kod içinde `document.hidden`/aktif-ekran kontrolü ARANDI,
**BULUNAMADI** (fonksiyonun TEK erken-dönüşü bile önce clearRect +
fillText + `mode.drawOverlay()` YAPTIKTAN SONRA dönüyor — "pasif"
dalı bile TAM İŞ yapıyor). **Not:** tarayıcı SEKME/UYGULAMA
arka plana alınınca (`document.hidden=true`) rAF'ı KENDİLİĞİNDEN
durdurur (standart davranış) — yani BU risk SADECE uygulama ÖN
PLANDAYKEN ama kullanıcı OYUN DIŞI bir ekranda (Araçlar/Ayarlar/
İlerleme) gezinirken geçerli, arka plana alınmada DEĞİL.

**Kaç canvas aynı anda — TAM 10 `requestAnimationFrame(` çağrı
noktası** (`drawVisualizer`/`drawCalMeterIdle`/`toolsDrawBigWave`/
`drawCorrelationChart`/`drawTonalChartCustomRef` + adı geçmeyen 5
daha, BU turda TEK TEK sınıflandırılmadı — YÜZEYSEL kaldı). Normal
oyun ekranında SADECE `drawVisualizer` aktif olmalı (diğerleri
Araçlar/kalibrasyon'a özgü, EKRAN DEĞİŞİNCE durup durmadıkları TEK
TEK doğrulanmadı) — **ama yukarıdaki bulgu gereği `drawVisualizer`
Araçlar'dayken de ARKA PLANDA çalışmaya devam ediyor**, yani Araçlar'ın
KENDİ rAF'ları (Tonal Balance canlı ölçek, dalga formu) AÇIKKEN
GERÇEKTEN 2+ eş zamanlı 60fps döngü olabilir.

**Eski cihazda pil/ısı riski — BELİRSİZ (ölçülemedi) ama YUKARIDAKİ
bulgu bu riski ARTIRIYOR:** `drawVisualizer`'ın HİÇ durmaması, TEK
BAŞINA bile (Araçlar'ın kendi döngüleri hiç açılmasa bile) uygulamanın
TÜM ömrü boyunca sürekli bir 60fps canvas-redraw yükü demek — eski/
düşük güçlü bir cihazda ölçülebilir bir pil etkisi YARATABİLİR,
KESİN bir sayı bu ortamdan verilemez.

### G) ANA THREAD BLOKLAMASI — DERİN

**localStorage yazma sıklığı/boyutu — ÖLÇÜLDÜ:** `persistStats()`
**26** farklı çağrı noktasından tetikleniyor (her cevaptan sonra DAHİL
— tam frekans TEK TEK sayılmadı, YÜZEYSEL). Taze `stats` nesnesi
Node'da GERÇEKTEN üretilip ölçüldü: **1042 byte**. `stats.history`
(12 ile), Araçlar'ın "Son İşlemlerim"/"Son Ölçümlerim" (10'ar ile)
gibi TÜM büyüyebilir diziler FIFO-CAP'Lİ — uzun vadeli boyut BİRKAÇ
KB'ı GEÇMEMELİ (kesin üst sınır bu turda hesaplanmadı, YÜZEYSEL).
**🟢 Bu boyutlarda senkron `localStorage.setItem()` işitilir/görülür
bir donmaya yol AÇMAZ** (birkaç KB'lık string yazma, modern donanımda
mikrosaniyeler mertebesinde) — TUR9'un 5-dakikalık-analiz (~3.3sn)
bulgusuyla KIYASLANAMAYACAK kadar küçük bir işlem.

**JSON serialize/parse maliyeti — aynı gerekçeyle DÜŞÜK,** ayrıca
BENCHMARK edilmedi (gereksiz görüldü, boyut zaten küçük).

**iOS watchdog 10sn sınırına yaklaşan senkron işlem var mı —
TUR9'DA ZATEN BULUNDU, BU TURDA TEKRARLANMADI:** Analiz worker
fallback'inin main-thread'de ~3.3sn (desktop, ölçülmüştü) sürmesi —
BU turun kapsamına GİRMEDİ, TUR9'un kendi bulgusu olarak KALDI, burada
sadece REFERANS verildi.

### H) ZAMANLAYICI ÇİFT KURULUMU — DERİN, TAM DOĞRULAMA

**Tüm `setInterval(` çağrı noktaları TEK TEK bulundu ve HER BİRİNİN
guard'ı doğrulandı (5 fiziksel çağrı, kod okunarak):**
1. `resWaitTimer` — `if (resWaitTimer) clearInterval(...)`
   KURULUMDAN ÖNCE — GÜVENLİ.
2. `abLoopTimer` (`startAbLoop`) — `if (abLoopTimer) return;`
   fonksiyonun EN BAŞINDA — GÜVENLİ, çifte çağrı SESSİZ no-op.
3. `paywallLivesTimer` — `resWaitTimer` İLE AYNI desen — GÜVENLİ.
4. `timerInterval` (`round-flow.js:armTimerInterval`) — `clearTimer()`
   HER ZAMAN önce çağrılıyor (koşulsuz) — GÜVENLİ.
5. `autoCountdownTimer` — **ARTIK KULLANILMIYOR** (kod yorumu: "hep
   null, DOM'a saniyede 5 kez aynı metni yazma ihtiyacı kaldırıldığı
   için silindi" — `clearInterval(null)` zararsız no-op) — RİSK YOK.

**🟢 Sonuç: "startTimer() iki kez çağrılınca iki interval çalışır"
klasik hatası KODDA HİÇBİR YERDE OLUŞMUYOR — 5 çağrı noktasının 5'i
de KENDİ KENDİNİ KORUYOR.** Bu, TUR3B'nin bulduğu 11 zamanlayıcının
TAMAMI değil (SADECE `setInterval` tabanlı olanlar bu turda
incelendi, `setTimeout` tabanlı olanlar — ör. `autoAdvanceTimer` —
KAPSAM DIŞI bırakıldı, YÜZEYSEL).

### I) AÇILIŞ SÜRESİ VE BOYUT — DERİN, GERÇEK ÖLÇÜMLERLE

**İlk açılışta 9 dosya yükleniyor mu — HAYIR, İHTİYAÇ ANINDA (Bölüm
B'de zaten kanıtlandı):** `loadSampleBuffer()` LAZY, cache-miss'te
decode ediyor — açılışta HİÇBİRİ ÖNCEDEN yüklenmiyor.

**Bundle boyutu — GERÇEKTEN ÖLÇÜLDÜ (`du -sh`):** `www/` (web
varlıkları, native paketleme ÖNCESİ) = **2.4MB** toplam (`js/`=1.6MB,
`audio/`=468KB). **BELİRSİZ:** bu SADECE web katmanı — GERÇEK .ipa/
.apk boyutu (Capacitor runtime + AdMob SDK + StoreKit + Swift/Kotlin
çalışma zamanı dahil) bu ortamdan ÖLÇÜLEMEZ, Xcode/Android Studio'da
GERÇEK bir build alınmalı.

**Kaynak kütüphanesi 12-15sn'lik dosyalarla yenilenirse — KABA
TAHMİN (KESİN DEĞİL):** Mevcut 9 dosya ort. ~52KB/dosya (468KB/9,
şu anki kısa klipler). 12-15sn + 256kbps AAC hedefiyle dosya başına
~200-400KB tahmin edilebilir (256kbps × 13sn ≈ 416KB teorik üst
sınır) — 9 dosya toplamda **~2-4MB** civarına çıkabilir. **200MB
hücresel indirme sınırından ÇOK UZAK** — bu değişiklik TEK BAŞINA
sınırı zorlamaz (BELİRSİZ/tahmini, gerçek dosyalar gelince
DOĞRULANMALI).

**index.html DOM/boyut — GERÇEKTEN SAYILDI:** 1880 satır, **~1093**
açılış HTML etiketi (kaba tag sayımı) — **12 modun TÜMÜNÜN markup'ı
TEK dosyada** (task'ın kendi sorusunun cevabı: EVET). 1093 node
mobil bir WebView için ORTA-DÜŞÜK bir sayı (tipik "DOM şişkinliği"
eşiği 5000-10000+ node'da başlar) — 🟢 kendi başına endişe verici
DEĞİL, ama Bölüm F'nin sürekli-rAF bulgusuyla BİRLEŞİNCE (her zaman
render edilen, çoğu gizli DOM) toplam yük artıyor.

---

## ARAYÜZ VE YERELLEŞTİRME

### J) TÜRKÇE toUpperCase() SORUNU ⚠️ ÖNEMLİ — DERİN, GERÇEK ÖLÇÜMLE

**Kodda `.toUpperCase()`/`.toLocaleUpperCase()` — TAM 3 çağrı noktası
(grep ile TÜM kaynak tarandı, TAMAMI bulundu):**

1. **`upload.js:81-82`** — dosya UZANTILARINI ("wav"→"WAV" vb.)
   büyütüyor. **🟢 DOĞRU KULLANIM** — bunlar İNGİLİZCE/uluslararası
   kısaltmalar (WAV/MP3/M4A/AAC/AIFF/FLAC/OGG), Türkçe locale
   kullanmak burada YANLIŞ olurdu (ör. "AIFF" İngilizce kısaltmasında
   Türkçe kural İSTENMEZ). Dokunulmamalı.

2. **`db-seviyesi.js:433`** — `DIRECTION_WORD[trueDir].toUpperCase()`,
   değerler `{up:"açıldı", down:"kısıldı"}`. **🟡 ŞU AN GÜVENLİ (KANIT:
   GERÇEKTEN ÇALIŞTIRILDI), AMA KIRILGAN:** `"açıldı".toUpperCase()`
   ve `"açıldı".toLocaleUpperCase("tr-TR")` **AYNI** sonucu veriyor
   ("AÇILDI") — ÇÜNKÜ bu SPESİFİK kelimeler NOKTASIZ "ı" içeriyor
   (Türkçe hatası SADECE NOKTALI "i"yi etkiler, "ı" zaten locale-
   bağımsız doğru dönüşüyor). **Şu an bug YOK ama bu KOD gelecekte bir
   geliştirici `DIRECTION_WORD`'e "iniyor"/"iyileşti" gibi noktalı-i
   içeren bir kelime eklerse SESSİZCE bozulur** — `toLocaleUpperCase
   ("tr")` kullanmak DAHA GÜVENLİ olurdu, ACİL DEĞİL ama İYİLEŞTİRME.

**CSS `text-transform:uppercase` — 12 kullanım (`styles.css`'te
sayıldı), AYRI/DAHA İYİ bir durumda:** `<html lang="tr">` KOD'da
DOĞRULANDI (canlı tarayıcıda `document.documentElement.lang`
kontrol edildi = "tr") — CSS Text Module Level 3 spec'i, `lang`
niteliği Türkçe iken `text-transform:uppercase`'in Türkçe-duyarlı
BÜYÜTME (noktalı i→İ) yapmasını TANIMLIYOR, JS'in AKSİNE (JS
locale'i OTOMATİK almaz, AÇIKÇA `toLocaleUpperCase` istenmeli). **Test
edilebilir GERÇEK bir örnek bulundu:** İlerleme sekmesindeki
`"İsabet Grafiği"` etiketi (`.prog-card-label`, text-transform:
uppercase) — `.toUpperCase()` bunu YANLIŞ ("İSABET GRAFIĞI", sonda
noktasız I) üretirdi, `.toLocaleUpperCase("tr-TR")` DOĞRU üretir
("İSABET GRAFİĞİ") — GERÇEK, ölçülmüş bir fark (Node'da
doğrulandı). **BELİRSİZ (bu ortamdan KAPANAMAYAN kısım):** CSS
motorunun (WebKit/Safari, iOS'un GERÇEK render motoru) bu spec
kuralını FİİLEN doğru uyguladığını PİKSEL SEVİYESİNDE bu ortamda
DOĞRULAYAMADIM (metin transform'u DOM'a yansımıyor, sadece görsel —
OCR/ekran görüntüsü karşılaştırması bu turun kapsamı DIŞINDA
bırakıldı) — **cihazda GERÇEK Safari'de "İSABET GRAFİĞİ" yazısının
SONUNDAKİ harfin noktalı (İ, doğru) mu noktasız (I, yanlış) mı
olduğuna GÖZLE bakılmalı** — precondition (lang="tr") DOĞRU KURULU,
WebKit'in bunu spec'e uygun uyguladığı GENEL BİLGİYLE (KESİN
doğrulanmadı) beklenir.

### K) METİN TAŞMASI — YÜZEYSEL (kısmi canlı test)

**375px genişlikte (iPhone SE) canlı Playwright testi yapıldı** —
Ana Menü ekranında mod kartı isimleri (`.mode-card-name`, "Frekans
Çakışması" DAHİL) + `[class*='title']` seçicili TÜM elemanlar
tarandı: **taşma BULUNAMADI** (`scrollWidth > clientWidth` sıfır
eleman), body-seviyesi yatay kaydırma da YOK. **YÜZEYSEL kalan
kısım (test EDİLMEDİ):** "Mastering Mühendisi" (rozet başlığı) ve
"Referans Kulak" (Seviye 22 unvanı) GERÇEKTEN render edilip
TEST EDİLMEDİ — bu ikisi YÜKSEK XP/rozet durumu gerektiriyor, taze
bir test profiliyle GÖRÜNMEZLER, bu turda AYRICA seed edilmedi.
**Dinamik metin (dosya adları) test edilmedi** — kapsam dışı
bırakıldı, zaman sınırı.

### L) SAYI BİÇİMLENDİRME — DERİN

**`toLocaleString(` — TÜM kaynak kodda SIFIR kullanım** (grep ile
doğrulandı). Tüm sayısal biçimlendirme `.toFixed(N)` + şablon
string kullanıyor (ör. `formatDb()`: `` `${sign}${safe.toFixed(2)} dB` ``)
— bu HER ZAMAN NOKTA ondalık ayırıcı üretir (JS'in `toFixed()`'i
locale-bağımsızdır). **🟢 TUTARLI (karışık DEĞİL) — HER YERDE nokta,
HİÇBİR YERDE virgül.** Bu "yanlış" mı — KISMEN ÜRÜN KARARI: proje
CLAUDE.md'sinin KENDİ "DİL PRENSİBİ" kuralı zaten dB/Hz/kHz gibi
birimlerin İNGİLİZCE/uluslararası biçimde KALMASINI istiyor — nokta
ondalık bu felsefeyle TUTARLI okunabilir (ses mühendisliğinin
ULUSLARARASI pratiğinde de nokta yaygın), ama KESİN bir "doğru/yanlış"
hükmü BU TURUN YETKİSİ DIŞINDA (ürün kararı, CLAUDE.md'nin "ürün
kararı verme" kuralı).

### M) ERİŞİLEBİLİRLİK — YÜZEYSEL/KISMİ

**VoiceOver ile oynanabilir mi — BELİRSİZ, bu ortamda TEST EDİLEMEZ**
(gerçek VoiceOver + gerçek cihaz gerektirir, statik kod analiziyle
SADECE "etiket VAR MI" ölçülebilir, "SEMANTİK OLARAK YETERLİ Mİ"
ölçülemez). **Ölçülebilen kısım:** toplam **36** `aria-label`
kullanımı (`index.html`), `#startBtn` (Oynat/Durdur) DAHİL kritik
kontrollerin BAZILARI etiketli. **YÜZEYSEL kalan:** 12 modun HER
BİRİNİN dinamik olarak (JS template string ile) ÜRETİLEN şık/cevap
butonlarının aria-label kapsamı TEK TEK doğrulanmadı — zaman
sınırı, BELİRSİZ bırakıldı.

**Kritik butonlar baş parmak erişim alanında mı — TEST EDİLMEDİ**
(bu, fiziksel ergonomi/elde tutuş açısı gerektirir, otomatik testle
ölçülemez, kapsam dışı bırakıldı).

**Koyu tema zorunlu mu — EVET, ÖLÇÜLDÜ:** `prefers-color-scheme`
`styles.css`/`index.html`'de **SIFIR** kullanım — uygulama iOS'un
sistem aydınlık/koyu ayarını HİÇ OKUMUYOR, HER ZAMAN koyu render
ediyor. **🟢 muhtemelen KASITLI** (birçok pro-ses/müzik aracı SADECE
koyu tema sunar, stüdyo/loudness-hassas bir bağlamda YAYGIN bir
tercih) — bug DEĞİL, ürün kararı; kullanıcı aydınlık istiyorsa AYRI
bir özellik talebi.

### N) TUTARSIZLIKLAR — DERİN

**Eski bundle ID (`com.logicprotrick.eqeartrainer`) — SIFIR kalıntı,
doğrulandı:** grep TÜM `.json/.plist/.xml/.js/.swift` dosyalarını
taradı, hiçbir eşleşme yok — G60'ın düzeltmesi HÂLÂ geçerli.

**localStorage anahtarları eski önekte (`eqEarTrainerPro...`) —
DOĞRU, KODDA HÂLÂ BÖYLE — bu bir SORUN DEĞİL, kasıtlı bir "dokunma"
kararı:** Bu önek KULLANICIYA GÖRÜNMÜYOR (localStorage anahtarları
UI'da hiçbir yerde gösterilmiyor), DEĞİŞTİRMEK ise TÜM mevcut
kullanıcıların verisini (istatistik/XP/satın alma) SIFIRLARDI (eski
anahtarla YENİ anahtar arasında migration YAZILMADIĞI sürece) —
**değiştirilMEMESİ önerilir**, kozmetik bir isim tutarsızlığı,
GERÇEK bir risk taşımıyor.

**🔴 CİDDİ — iCloud yedeği, `isExcludedFromBackup` HİÇ AYARLANMAMIŞ,
KOD OKUNARAK KANITLANDI:** `grep -rn "isExcludedFromBackup\|
NSURLIsExcludedFromBackupKey" ios/` **SIFIR sonuç.** Kullanıcının
yüklediği dosyalar `core/file-storage.js:FS_DIRECTORY = "DATA"` —
yani Capacitor'ın `Directory.Data`'sı, iOS'ta bu **`Library/`**
altına (Cache DEĞİL) yazılıyor ve **VARSAYILAN OLARAK iCloud/iTunes
yedeğine DAHİL**. `isExcludedFromBackup` ayarlanmadığı için, bir
kullanıcı 5 dosyalık kütüphanesini (her biri 100MB'a kadar,
`upload.js`'in kendi sınırı) doldurursa, **TEORİK OLARAK 500MB'a
kadar** iCloud yedeğine EKLENEBİLİR — kullanıcının SINIRLI (genelde
ücretsiz 5GB) iCloud kotasını YİYEBİLİR, yedekleme süresini uzatabilir,
"neden yedeğim bu kadar büyük" tarzı destek talepleri doğurabilir.
**Bu GERÇEK bir bulgu, tahmin değil** — hem kodun kendisi (dizin
seçimi) hem eksik ayarın (`grep` sıfır sonuç) İKİSİ de DOĞRUDAN
doğrulandı.

---

# ÖNCELİK LİSTELERİ

## Yayın öncesi düzeltilecekler
1. **🔴 `isExcludedFromBackup`/`NSURLIsExcludedFromBackupKey`
   ayarlanmalı** (Bölüm N) — kullanıcının yüklediği dosyaların
   iCloud yedeğini şişirmesini önler, native (Swift/Capacitor
   Filesystem plugin config) tarafında bir değişiklik gerektirir.
2. **🟡 `drawVisualizer()`'ın rAF döngüsüne bir durdurma/duraklama
   koşulu eklenmeli** (Bölüm F) — en azından oyun ekranından
   ÇIKILDIĞINDA (Araçlar/Ayarlar/İlerleme'deyken) durmalı, "aktif
   ekran DEĞİLSE `requestAnimationFrame` çağırma" deseni.

## TestFlight/cihazda ölçülmesi gerekenler
- **Bölüm C (sample rate):** Gerçek bir iOS cihazda (context 48kHz
  açıldığında) Frekans Bulma'da bir soru üretilip GERÇEK cevabın
  hedeflenen frekansla eşleştiği doğrulanmalı — bu ortamda Web Audio
  spec analiziyle GÜÇLÜ bir güvence var ama uçtan uca KANIT yok.
- **Bölüm J (Türkçe uppercase):** İlerleme sekmesinde "İsabet
  Grafiği" etiketinin (CSS text-transform:uppercase) GERÇEK Safari'de
  sonundaki harfin noktalı İ mi noktasız I mı olduğuna GÖZLE
  bakılmalı.
- **Bölüm F (pil/ısı):** Eski bir cihazda uzun bir oturumda (Araçlar
  sekmesinde uzun süre kalarak) pil/ısı etkisi gözlemlenmeli —
  `drawVisualizer`'ın hiç durmaması bu riski artırıyor.
- **Bölüm I (bundle boyutu):** Gerçek bir Xcode/Android Studio
  build'inde .ipa/.apk boyutu ölçülmeli (bu ortamdan sadece web
  katmanı — 2.4MB — ölçülebildi).
- **Bölüm K (metin taşması):** "Mastering Mühendisi"/"Referans
  Kulak" gibi yüksek-XP/rozet metinlerinin GERÇEKTEN render edildiği
  bir profil ile 375px genişlikte taşma kontrolü.
- **Bölüm M (VoiceOver):** Gerçek VoiceOver oturumuyla oyunun uçtan
  uca oynanabilirliği.

## 1.1'e bırakılabilirler
- `db-seviyesi.js`'in `DIRECTION_WORD.toUpperCase()`'ini
  `toLocaleUpperCase("tr")`'ye çevirmek (Bölüm J) — ŞU AN bug değil,
  gelecekteki kelime değişiklikleri için kırılganlık önlemi.
- 10 `requestAnimationFrame` çağrı noktasının TAMAMININ ekran-bazlı
  duraklama kapsamının gözden geçirilmesi (Bölüm F) — sadece
  `drawVisualizer` bu turda TAM incelendi, diğer 9'u YÜZEYSEL kaldı.
- 12 modun dinamik şık/cevap butonlarının aria-label kapsamının
  TEK TEK denetlenmesi (Bölüm M).
- Aydınlık tema desteği (Bölüm M) — muhtemelen kasıtlı, ürün kararı
  gerektirir.

# TUR 3B — ZAMANLAMA VE DIŞ DÜNYA

_15 Ağustos 2026 · commit `78271fb`'e kadar._

**Kapsam notu (dürüstlük):** 11 bölüm istendi, her biri onlarca alt soru
içeriyor. Bu turda GERÇEK cihaz gerektiren senaryolar (arama/Siri/alarm
kesintisi, AdMob fill-rate, uçak modu, saat dilimi değişimi) KODDAN
İZLENEBİLDİĞİ kadar analiz edildi — kod, "bu olay geldiğinde NE
ÇALIŞIR" sorusuna kesin cevap veriyor, ama "iOS bu olayı GERÇEKTEN NE
ZAMAN/NASIL tetikler" sorusu cihaz testi gerektirir, BELİRSİZ
bırakıldı. K bölümü (zamanlayıcılar) tam kapsamlı KOD taraması ile
kesin sonuçlar üretti — bu turun en sağlam bölümü.

---

## A) YARIŞ DURUMLARI

### 🟢 Decode bitmeden play'e basma — İKİ KATMANLI korumalı
`syncUploadGate()` (app.js:2223) `uploadManager.getBuffer()`'ın (decode
bitmeden `null`) `playability`'sini kontrol eder, `needsGate` true ise
oyun UI'ını (analizör/kontroller/şıklar) GİZLER. Kod KENDİ yorumunda
İKİNCİ bir katmanı da belirtiyor: "'Oynat'a basılabilir ama geçersiz
bir dosyayla round BAŞLATILAMAZ — aşağıdaki `startRound()` guard'ı
ZATEN bunu engelliyor" — yani gate UI'ı atlatılsa bile (ör. hızlı
tıklama) `startRound()` KENDİSİ ikinci bir kontrol noktası.

### 🟢 Çift/hızlı tıklama — 3 kritik buton NOKTA ÖLÇÜLDÜ, korumalı
- **Satın alma** (`buyProBtn`): `buyProBusy` bayrağı + `finally` bloğu
  (app.js:8840-8875) — ikinci tıklama `if (buyProBusy) return;` ile
  ENGELLENİYOR.
- **Reklam izleme** (`handleWatchAd`): `adWatchBusy` bayrağı + `finally`
  (app.js:8976-9001) — AYNI desen, hem paywall hem "Seans Sonu"
  ekranındaki İKİ ayrı çağıran PAYLAŞIYOR.
- **A/B toggle uzun-basma**: `abPressTimer` HER `pointerdown`'da ÖNCE
  `clearTimeout` ediliyor (app.js:6445) — art arda hızlı basışlarda
  BİRİKMEZ.

### 🟡 Aynı anda iki dosya/iki ölçüm — kısmen korumalı, TEK bir kilit YOK
`toolsAddFile()`'ın kendisinde eşzamanlı ikinci bir çağrıyı engelleyen
bir `busy` bayrağı GÖRÜLMEDİ (satın alma/reklamın AKSİNE). Kullanıcı
"Dosyalarım" sheet'inde ÇOK HIZLI art arda iki dosya seçse (`change`
olayı iki kez, örtüşen `await`'lerle) — her ikisi de `uploadManager`
(TEK, paylaşılan) üzerinden `loadFile()` çağırır, İKİNCİ çağrı
BİRİNCİNİN `buffer`'ını EZER (son yazan kazanır, `loadFile()`'ın
kendisi `buffer = null` ile BAŞLIYOR — bkz. upload.js:182). Sonuç
muhtemelen ZARARSIZ (iki dosyadan biri "kazanır", çökme YOK — `toolsFiles`
dizisine HER İKİSİ de `push` edilir, sadece AKTİF/decode edilmiş buffer
son çağrınınki olur) ama TEK BİR busy-kilidi (satın alma/reklamdaki
GİBİ) YOK — DOM'da gerçekten iki `change` olayının bu kadar hızlı art
arda tetiklenip tetiklenemeyeceği (native dosya seçici genelde MODAL,
ikinci seçim İLKİ kapanmadan açılamaz) BELİRSİZ, native seçicinin
KENDİ modal doğası muhtemelen bunu zaten engelliyor — düşük risk.

### BELİRSİZ — reklam yüklenirken uygulamayı kapatma
Bu, iOS'un kendisinin uygulamayı SONLANDIRMASI (process kill) —
JS'in hiçbir "önce kaydet" fırsatı YOK (senkron bir olay değil).
`adWatchBusy` bellek-içi bir bayrak, PERSIST edilmiyor — uygulama
yeniden açılınca `false`'a sıfırlanmış olarak başlar (normal, sorun
DEĞİL). Ödül SADECE `Rewarded` olayı GERÇEKTEN geldiyse verilir (bkz.
E) — yarıda kapatılan bir reklam ödül VERMEZ, can/XP kaybı YOK. Kod
seviyesinde risk görülmedi.

---

## B) AĞ UÇLARI

### 🔴 CİDDİ — Reklam yüklenirken zaman aşımı YOK, buton SONSUZA kadar kilitli kalabilir
`core/ads.js:loadAndShowRewardedAd()` (140-171) `admob.prepareRewardVideoAd()`/
`showRewardVideoAd()`'ın çözülmesini BEKLER — HİÇBİR `setTimeout`/
`Promise.race` YOK (audio-engine.js'in `activateNativeSession()`'ının
KENDİ 2000ms zaman aşımıyla TAM TERSİ — bkz. D). Eğer AdMob SDK'sı
(düşük fill rate/yavaş bağlantı/ağ tıkanıklığı) `FailedToLoad`'u HİÇ
ateşlemeden askıda kalırsa, `watchRewardedAd()`'ın döndürdüğü promise
SONSUZA kadar bekler. Çağıran taraf (`handleWatchAd`, app.js:8977-9001)
bunu `await`'liyor — `adWatchBusy=true` + buton "Yükleniyor…" metniyle
disabled KALIR, `finally` bloğu SADECE promise SETTLE olunca çalışır.
**Kullanıcı için sonuç: buton kalıcı olarak "Yükleniyor…" yazıp
DEVRE DIŞI kalabilir, hiçbir kaçış yolu (iptal/geri) YOK** — ekranı
kapatıp AÇMAK (paywall'ı kapat-aç) `adWatchBusy`'yi sıfırlar mı,
YOKSA modül-seviyesi değişken olduğu için (uygulama YENİDEN
BAŞLAMADIKÇA) kalıcı mı kalır — koddan bakıldığında `adWatchBusy`
`let` ile app.js modül kapsamında, ekran geçişleriyle SIFIRLANMIYOR —
**paywall kapatılıp yeniden açılsa bile buton YENİDEN "Yükleniyor…"
görünür kalır**, tek çıkış YOLU uygulamayı tamamen kapatıp açmak. AdMob
SDK'sının KENDİ dahili zaman aşımı olup olmadığı (dokümantasyonda
GARANTİ EDİLMEMİŞ) BELİRSİZ — ama uygulama tarafında HİÇBİR güvenlik
ağı yok, bu KESİN.

### 🟢 Satın alma sırasında ağ kopması — try/catch korumalı
`iap.js:purchasePro()` StoreKit'in fırlattığı hatayı yakalayıp
`isNetworkError()` ile ayırt ediyor, "Bağlantını kontrol edip tekrar
dene" mesajı gösteriyor (app.js'in `buyProBusy`/`finally`'si ile
BİRLİKTE — buton her durumda tekrar aktif olur, B'deki reklam
sorunundan FARKLI çünkü StoreKit'in KENDİ ödeme sayfası/promise'i
native platformun sorumluluğunda, muhtemelen kendi zaman aşımı VAR
— BELİRSİZ, ama en azından JS tarafı bloklanmıyor, StoreKit hatası
HER ZAMAN ya resolve ya reject ile döner (Apple'ın payment sheet UI'ı
kullanıcıya ayrıca "İptal" seçeneği sunar, JS'in kendi kodu buna
gerek DUYMUYOR).

### BELİRSİZ — VPN/kurumsal ağ AdMob'u engellerse
Muhtemelen `FailedToLoad` (ya da B'deki zaman aşımsız askıda kalma)
yolundan geçer — kesin ayrım (engellenmiş DNS vs. yavaş bağlantı vs.
gerçek fill-rate-yok) SDK'nın kendi hata sınıflandırmasına bağlı,
koddan ayırt EDİLEMEZ, cihaz/ağ testi gerektirir.

### BELİRSİZ — uçak modundan çıkınca toparlanma
Kod seviyesinde AĞ durumu (`navigator.onLine`/`online`/`offline`
olayı) HİÇ dinlenmiyor (grep, sıfır sonuç) — toparlanma TAMAMEN
kullanıcının bir SONRAKİ aksiyonuna (yeniden reklam/satın alma
denemesi) bağlı, PROAKTİF bir "bağlantı geldi, otomatik dene" mekanizması
YOK. Bu bir EKSİKLİK olarak mı görülmeli yoksa kasıtlı bir sadelik mi
— ürün kararı, kod bunu AÇIKÇA yapmıyor diye BELGELENDİ.

---

## C) ZAMAN VE TARİH

### 🟡 (ZATEN BİLİNEN, AÇIK KARAR — YENİ DEĞİL) Cihaz saati ileri alınırsa can/reklam hakkı erken dolabilir
`paywall.js:applyLivesRefill()` **GERİYE** saat alma istismarına karşı
AÇIKÇA korumalı (`now <= lastRefillAt` ise dolum SIFIR, referans
KORUNUR — kod yorumu bunu "istismarı engelleyen kontrol" diye
adlandırıyor). **İLERİ** saat alma İSE KORUNMUYOR — kod yorumunun
KENDİSİ bunu kabul ediyor: "ileri atlanan süre çalınmaz" (yani
HONOR EDİLİR). Saati 30dk ileri alıp geri almak bir can dolumunu
"çalabilir". **Bu YENİ bir bulgu DEĞİL** — DURUM.md'nin BEKLEYEN
KARARLAR **D** maddesi (saat manipülasyonu, SUNUCU ZAMANI mimari
yönü, reklam entegrasyonuyla birlikte ayrı bir iş) bunu ZATEN
kapsıyor, bilinçli olarak ERTELENMİŞ — bu tur SADECE aynı riskin
`applyLivesRefill()`'de somut biçimde VAR OLDUĞUNU teyit etti.

### 🟡 AYNI risk sınıfı: günlük reklam hakkı (3 hak) VE günlük görevler de yerel saate bağlı
`paywall.js:sessionAdWatchesRemainingToday()`/`recordSessionAdWatch()`
`localDateKey(now)` kullanıyor; `storage.js:dailyKey()` de AYNI
desende (`new Date()`'in yerel gün/ay/yıl'ı). **İkisi de** saat
dilimi değişimi/saat ileri alma ile "gün" sınırını erken/tekrar
geçirmeye AÇIK — C'nin "3 örnek" istediği tam bu: `applyLivesRefill`,
`sessionAdWatchesRemainingToday`, `dailyKey()` — ÜÇÜ de AYNI
"cihaz yerel saatine güven" mimarisinin parçası, ÜÇÜ de AYNI
BEKLEYEN KARARLAR D kapsamında, ayrı ayrı "bulundu" sayılmamalı —
tek bir mimari kök sebep.

### 🟡 Gece yarısı geçişi (oyun AÇIKKEN) — günlük görevler CANLI yeniden hesaplanmıyor
`daily` (günlük görev nesnesi) SADECE uygulama AÇILIŞINDA
`storage.loadDaily()` ile yükleniyor (app.js:987) — `loadDaily()`
İÇİNDE `parsed.key !== dailyKey()` kontrolü VAR (gün değiştiyse
sıfırdan başlar) ama bu kontrol SADECE YÜKLEME anında çalışıyor.
Uygulama AÇIK kalıp gece yarısı geçilirse (`daily` yeniden
YÜKLENMİYOR — grep: `storage.loadDaily()`'nin app.js'teki TEK diğer
çağrısı SADECE bir "recovered.daily" kurtarma dalında, #53'ün crash-
recovery senaryosu, GECE YARISI geçişiyle İLGİSİZ), `renderDaily()`
(3163) bellek-içi `daily`'yi DOĞRUDAN okuyor, `dailyKey()`'e karşı
YENİDEN doğrulamıyor. **Sonuç:** gece yarısından SONRA oynanan turlar
DÜN'ün görev sayaçlarına (`daily.tasks[].value`) yazılmaya devam
eder — kullanıcı ekranda "bugünün görevleri" sanıp DÜNKÜ (artık
stale) sete ilerleme kaydeder, uygulamayı KAPATIP AÇMADAN yeni günün
GERÇEK görevlerini GÖRMEZ. Veri kaybı/istismar DEĞİL (sadece
YANLIŞ gün etiketlenmiş ilerleme), ama kafa karıştırıcı — düşük-orta
risk.

### BELİRSİZ — saat dilimi değişimi (uçakla başka ülke), yaz saati
Mekanizma AYNI (`new Date()`'in yerel saatine bağlı), YUKARIDAKİ
maddelerin bir UZANTISI — timezone/DST geçişinin TAM olarak HANGİ
yönde (erken/geç resetleme) etki ettiği cihazın işletim sistemi
saat/timezone senkronizasyon DAVRANIŞINA bağlı, koddan KESİN
öngörülemez, cihaz testi gerektirir.

---

## D) SES MOTORU UÇLARI

### 🟢 Zombi AudioContext sınırı — DEĞER GÜNCEL DEĞİL sanılıyor olabilir, DÜZELTİLMİŞ hâli 20
Görev metni "MAX_CONTEXT_RECREATE=2" diyor — bu ESKİ bir değer,
GÜNCEL DEĞİL. Kod (audio-engine.js:103) `MAX_CONTEXT_RECREATE = 20`
— G133'te CİHAZDA "2 kesintiden sonra ses bir daha gelmiyordu"
bulgusu ÜZERİNE 20'ye çıkarılmış (kod yorumu: "20 kesinti bir
kullanıcı oturumunda gerçekçi değil"), AYRICA `RECREATE_COOLDOWN_MS`
(2sn) hız sınırı eklenmiş. **Sınıra ulaşınca ne oluyor:**
`recreateContext()` `false` döner (268-271), `ensureAudioAliveInner()`
`setAudioDead(true)` çağırır → app.js'in "Devam etmek için ekrana
dokunun" banner'ı GÖRÜNÜR (mevcut, GENEL "ses ölü" kurtarma mesajı) —
kullanıcı SESSİZCE terk edilmiyor, ama banner metni "20 kez kesinti
yaşadın, artık kurtarılamaz" gibi ÖZEL bir mesaj VERMİYOR, genel
mesajla AYNI. 20 kesinti bir oturumda son derece nadir — düşük risk.

### 🔴 CİDDİ — Native ses kesintisi (arama/Siri/alarm) bildirimi JS'e HİÇ ULAŞMIYOR (bilinçli, ama sonucu YENİDEN değerlendirilmedi)
`AudioSessionPlugin.swift` `AVAudioSession.interruptionNotification`'ı
DOĞRU dinliyor (`handleInterruption`, satır 100-115) ve
`notifyListeners("interruptionBegan"/"sessionActivated", ...)` İLE JS'e
bildirmeye ÇALIŞIYOR — ama bu `notifyListeners` Capacitor'ın
`registerPlugin`-tabanlı proxy katmanını KULLANIYOR, ve bu app'in
KENDİ G135 bulgusu bu proxy'nin (`addListener`/`registerPlugin`) BU
UYGULAMADA (düz-script bridge, `nativePromise` tabanlı) HİÇ
DOĞRULANMADIĞINI/muhtemelen ÇALIŞMADIĞINI GÖSTERİYOR — route-change
(#50/#51) TAM BU YÜZDEN `notifyListeners` YERİNE doğrudan
`evaluateJavaScript` enjeksiyonuna geçti (audio-engine.js:117-119'un
KENDİ notu bunu AÇIKÇA anlatıyor). **`interruptionBegan`/
`sessionActivated` bu geçişi HİÇ almadı** — grep (bu turda tekrar
doğrulandı) JS tarafında `addListener` çağrısının SADECE AdMob için
var olduğunu, `AudioSessionPlugin` için HİÇ olmadığını gösteriyor.
**Kod'un KENDİ savunması** ("FONKSİYONEL KAYIP YOK" — audio-engine.js:475-491):
her `playQuestion`/Araçlar play denemesi VE her `visibilitychange`
zaten `ensureAudioAlive()`'ı çağırıyor, bu yüzden bir SONRAKİ
etkileşimde ses HER HÂLÜKÂRDA kurtarılıyor — kayıp SADECE "native'in
PROAKTİF erken uyarısı" (hız avantajı), doğruluk DEĞİL. **BU
SAVUNMANIN GÖZ ARDI ETTİĞİ nokta (bu turun YENİ bulgusu):** kesinti
SIRASINDA aktif bir TUR/ZAMANLAYICI varsa VE kesinti `document.hidden`'ı
TETİKLEMİYORSA (ör. arama gelip ekranda SADECE bir banner/CallKit
overlay'i görünüyorsa, uygulama TEKNİK olarak arka plana ALINMAMIŞ
olabilir — bu ihtimal BELİRSİZ, cihaz testi gerektirir), `visibilitychange`
HİÇ ateşlenmez, `pauseRound()` ÇAĞRILMAZ, **round zamanlayıcısı
(`roundFlow`'un 100ms'lik `setInterval`'i) kesinti boyunca ÇALIŞMAYA
DEVAM EDER** — kullanıcı arama/Siri ile meşgulken süre dolup "süre
bitti" turu otomatik kaydedilebilir, HABERSİZ can gidebilir. Bu,
"FONKSİYONEL KAYIP YOK" savunmasının kapsamadığı bir senaryo (o
savunma SADECE SES kurtarmayı ele alıyor, ROUND ZAMANLAYICISI'nı
DEĞİL) — **BELİRSİZ olan TEK şey**: iOS'ta bir arama/Siri/alarm
`document.visibilitychange`'i GERÇEKTEN tetikler mi tetiklemez mi
(cihaz davranışı, Apple'ın CallKit/Siri UI'sinin app'i GERÇEKTEN arka
plana ALIP almadığına bağlı) — **eğer tetiklemiyorsa bu 🔴 CİDDİ**
(süre/can haksız kaybı), **eğer tetikliyorsa 🟢** (I bölümünün
visibilitychange zinciri zaten kapsıyor). Ölçülemedi, cihaz testi
ZORUNLU.

### 🟢 Route değişimi (G203 sonrası) — kapsamlı, kalan uç görülmedi
`#50/#51`'in `evaluateJavaScript` köprüsü + `window.__aeaNativeRouteChanged`
→ `onRouteChanged` → app.js'in `pauseRound()`/tools-pause çağrıları
(grep'te 12686 civarı doğrulandı) — G203/#50/#51'in kapsamlı testleriyle
TUTARLI, bu turda YENİ bir uç bulunmadı.

### 🟢 43 tanı logu — yayın build'inde ÇÖKME/gizlilik riski YOK, sadece gürültü
`audioDiagLog()`/`uploadDiagLog()` gated DEĞİL (dev-flag/`if` YOK) —
her çağrı KOŞULSUZ `console.log` çalıştırıyor (grep: app.js'te 39,
audio-engine.js'te 22, upload.js'te 13, TOPLAM ~74 çağrı sitesi —
görev metninin "43" sayısı muhtemelen farklı bir sayma yöntemiyle
— DOĞRULANAMADI, ama mertebe olarak DOĞRU: onlarca). Apple App Store
incelemesi `console.log` varlığı için ret SEBEBİ değildir, kişisel
veri içermiyor (teknik durum/zamanlama bilgisi) — **fonksiyonel/
gizlilik riski YOK**, sadece 1.1'de temizlik adayı (kod YORUMUNUN
KENDİSİ bunu "task'ın kendi isteğiyle KALICI teşhis günlüğü, kaldırma
GEREKMİYOR" diye zaten açıklıyor — bilinçli tasarım, bug DEĞİL).

### BELİRSİZ — başka uygulama ses çalarken açılış, ses oturumu kategorisi çakışmaları
`AudioSessionPlugin.swift:76`: `.playback` kategorisi + `.mixWithOthers`
seçeneği — KASITLI olarak başka bir uygulamanın sesini KESMİYOR (kod
yorumu: "kulaklık/hoparlör davranışı korunacak şekilde" kullanıcı
kararı). Bu NİYETİ doğru YANSITIYOR ama GERÇEK cihazda iki ses
kaynağının (bu app + Spotify/Müzik) AYNI ANDA çalışıp çalışmadığı,
GÜNLÜK sesin diğerini KISMASI/DUCK etmesi gibi ince davranışlar
test EDİLEMEDİ — BELİRSİZ.

---

## E) EŞ ZAMANLI YÜK VE ADMOB

### 🔴 (B'de detaylandırıldı) Zaman aşımı yok, buton kalıcı kilitlenebilir
Bkz. B — bu bölümün de merkezi bulgusu.

### 🟢 Ödül verilmeden reklam kapanırsa — DOĞRU davranıyor
`loadAndShowRewardedAd()` ödülü SADECE `Rewarded` olayından okuyor
(`rewarded` bayrağı), `Dismissed` (kapanma) OLAYINDAN DEĞİL — kod
yorumu bunun BİLEREK yapıldığını, plugin dokümantasyonunun
"Dismissed'in ödülle İLGİSİZ" olduğunu AÇIKÇA belirttiğini söylüyor.
Yarıda kapatılan reklam `{ok:false}` döner, can/XP VERİLMEZ,
`adWatchBusy` yine de `finally` ile TEMİZLENİR (bu YOL zaman aşımı
sorunundan ETKİLENMEZ çünkü `Dismissed` olayı NORMAL şekilde gelir).

### 🟢 Reklam yüklenirken ikinci kez basılırsa — korumalı
`adWatchBusy` guard'ı (bkz. A) — ikinci tıklama `handleWatchAd`'a HİÇ
girmiyor bile.

### BELİRSİZ — fill rate düşerse (envanter yok)
`FailedToLoad` olayı ateşlenir VARSAYIMI ile `{ok:false, title:"Reklam
yüklenemedi", ...}` mesajı GÖSTERİLİR — AMA fill-rate-yok durumunun
SDK tarafından `FailedToLoad` İLE mi yoksa sonsuz bir "yükleniyor"
askıda kalma İLE mi sonuçlandığı (B'nin ana sorusu) SDK'nın kendi
davranışına bağlı, KOD BUNU AYIRT EDEMİYOR (her ikisi de aynı
kod-yolunda BAŞLAR).

### 🟢 Günlük 3 hak sayacı reklam GELMEZSE düşmüyor
`recordSessionAdWatch()` SADECE `grantSessionExtension()` (ödül
GERÇEKTEN verildiğinde) çağrılıyor — grep ile doğrulandı, `handleWatchAd`'ın
`onSuccess` callback'i İÇİNDE, yani reklam BAŞARISIZ/yarıda kesilirse
sayaç HİÇ artmıyor, kullanıcı hakkını "boşa harcamıyor".

---

## F) BOŞ DURUMLAR

**Kapsam notu:** tam bir görsel/UI taraması (her sekme/panel/grafik
tek tek açılıp boş veriyle gözlemlenerek) bu ölçüm-turunda YAPILMADI
— G221 gibi bulgular GÖRSEL doğrulama gerektiriyordu. Bu turda SADECE
KOD üzerinden bölme/yüzde hesaplarının sıfır-koruması TARANDI.

### 🟢 Yüzde hesaplarının ikisi de sıfır-korumalı
`Math.round((correctCount/total)*100)` deseni (app.js:1790,
"İlerleme" sekmesinin genel isabet oranı) ve `v.correct/v.total`
(app.js:3454, bant bazlı isabet) — İKİSİ de `total > 0 ? ... : 0`
ile korunuyor, `NaN`/`Infinity` görünme riski YOK.

### BELİRSİZ — geri kalan tüm panellerin ilk-açılış görünümü
G221'in kapattığı "boş kırmızı uyarı kutusu" gibi başka örnekler
olabilir — bu, HER sekmeyi sıfır veriyle AÇIP gözlemlemeyi
gerektirir, bu turun kapsamında YAPILMADI, BELİRSİZ.

---

## G) HATA YOLU TARAMASI

Bu bölüm Tur 2/3A'nın DEVAMI — bu turda B/D/E bölümlerinde YENİ
bulunan hata yolları (reklam zaman aşımı, native kesinti köprüsü)
zaten kendi bölümlerinde işlendi, burada TEKRAR EDİLMEDİ. Ek olarak
taranan, daha önce değinilmemiş kritik adımlar:

### 🟢 checkProOwnership()/fetchProPrice() — sessiz başarısızlık KABUL EDİLEBİLİR
`iap.js:80-89`/`96-106` — HATA durumunda `false`/`null` dönüyor,
ÇAĞIRAN taraf zaten bunu "Pro değil"/"fiyat YOK, yedek göster"
şeklinde YORUMLUYOR (app.js) — bu iki fonksiyon İÇİN sessizlik DOĞRU
davranış (G229'un "checkProOwnership de korumaya alınsın" isteği
zaten G229'da karşılanmıştı — grep ile TEKRAR doğrulandı, hâlâ öyle).

---

## H) AYNI HATANIN DİĞER ÖRNEKLERİ

### 🟡 Sınıf: "yerel cihaz saatine güvenen sayaç" — 3 örnek (C'de detaylandırıldı)
`applyLivesRefill`/`sessionAdWatchesRemainingToday`/`dailyKey()` — TEK
mimari kök sebep, BEKLEYEN KARARLAR D kapsamında zaten AÇIK.

### 🔴 Sınıf: "Capacitor addListener/notifyListeners köprüsü doğrulanmamış" — G135'in AYNI ailesi, 1 YENİ örnek
Route change (#50/#51) BU SORUNU zaten `evaluateJavaScript`'e geçerek
ÇÖZMÜŞTÜ — ama `AudioSessionPlugin`'in DİĞER İKİ olayı
(`interruptionBegan`/`sessionActivated`) AYNI geçişi ALMADI, hâlâ
doğrulanmamış `notifyListeners` üzerinden gönderiliyor (bkz. D). Bu,
G135'in TAM olarak tarif ettiği köprü sorununun BAŞKA bir örneği,
route-change'in kapsamı DIŞINDA bırakılmış.

### 🟡 Sınıf: "bir yerde korunmuş, benzerinde korunmamış" — abPressTimer (K'de detaylandırıldı, GÖREVİN kendi bilinen açığı)
`freqTapTimer` (G187) TAM 5 farklı teardown noktasında temizleniyor,
`abPressTimer` SADECE `pointerup`/`pointerleave`'de — mod değişimi/
arka plana alma/pause YOLLARININ HİÇBİRİNDE temizlenmiyor. AYNI "uzun
basma zamanlayıcısı" deseni, FARKLI koruma seviyesi.

### BELİRSİZ — "korumasız async işlem" / "sessizce yutulan hata" sınıflarının TAM sayımı
TUR2'nin `catch (e) {}` sayımı (35 eşleşme) bu turda TEKRARLANMADI —
o sayım hâlâ GEÇERLİ kabul ediliyor, YENİ bir tarama YAPILMADI
(kapsam tekrarı önlemek için).

---

## I) KESİNTİ SONRASI DEVAM NOKTASI

### 🟢 Ele alınanlar (koddan KESİN)
- **Backgrounding (home/app switch)**: `visibilitychange` → `stopAudio()`
  + 4 Araçlar oynatıcısının duraklatılması + `pauseRound()` (aktif
  turda) — KAPSAMLI, G155/G136/G133/G137'nin katmanlı düzeltmeleri.
- **Route değişimi (kulaklık/Bluetooth)**: `#50/#51`, native →
  `evaluateJavaScript` → `pauseRound()` — KAPSAMLI.
- **Panel/sheet açılışları** (Ayarlar, Rehber, satın alma, dosya
  seçimi vb.): HEPSİ kendi `xPausedRound` bayraklarıyla `pauseRound()`
  çağırıyor (grep: 12+ çağrı noktası) — G180/G181 dahil KAPSAMLI.

### 🔴 Hiç ele ALINMAMIŞ (D'de detaylandırıldı, BELİRSİZ derecesi cihaza bağlı)
- **Arama/Siri/alarm (AVAudioSession interruption)**: native tarafı
  DOĞRU algılıyor ama JS'e bildirim köprüsü ÇALIŞMIYOR (H). Kesinti
  `visibilitychange`'i DE tetiklemiyorsa, `pauseRound()` HİÇ
  çağrılmaz.
- **Kilit ekranı**: muhtemelen `visibilitychange`'i tetikler (iOS'un
  genel davranışı, ekran kilitlenince WKWebView "hidden" sayılır) —
  BELİRSİZ ama YÜKSEK olasılıkla zaten I'nın "ele alınan" listesine
  giriyor, cihazda doğrulanmadı.
- **Ekran kaydı/AirPlay**: kod seviyesinde HİÇ bir referans/özel
  işlem YOK (grep, sıfır sonuç) — bunlar `visibilitychange`'i
  TETİKLEMEZ (ekran hâlâ görünür) — eğer AirPlay ses çıkışını
  BAŞKA bir cihaza yönlendiriyorsa bu aslında bir ROUTE DEĞİŞİMİ
  sayılır (#50/#51 kapsamına girebilir, `AVAudioSession.routeChangeNotification`
  AirPlay geçişlerini de KAPSAR — Apple dokümantasyonuna göre teorik
  olarak evet, cihazda DOĞRULANMADI).

### 🔴 Kesinti TAM CEVAP VERİRKEN gelirse (D'nin sorduğu)
Cevap SÜRECİ (`evaluateAnswer` çağrısı) SENKRON — bir kesinti
ORTASINDA yarım kalamaz (JS tek iş parçacığı). Asıl risk kesinti
CEVAP BEKLERKEN (soru açık, süre işlerken) gelirse: `visibilitychange`
tetiklenirse `pauseRound()` süreyi/otomatik-geçişi DONDURUR (roundFlow.js
`clearTimer()`/`clearAutoAdvance()`), can GİTMEZ. **Tetiklenmezse**
(arama/Siri senaryosu, BELİRSİZ) süre İŞLEMEYE DEVAM EDER, "süre
doldu" otomatik tetiklenebilir, can gidebilir — kullanıcı kesinti
sırasında MEŞGUL olduğu için buna MÜDAHALE EDEMEZ.

---

## J) SAYAÇLARIN BİRBİRİYLE TUTARLILIĞI

### Envanter (koddan çıkarıldı, TAM liste)
| Sayaç | Neyi sayar | Kaynak | Ne zaman sıfırlanır |
|---|---|---|---|
| `challenge.done`/`.total` (BÖLÜM) | "10 Soruluk Bölüm" modundaki soru sırası | app.js, SADECE `isChallenge()` true iken görünür | `startChallenge()`'da / parkur bitince |
| `examSystem.examIndex`/`examCorrect` (SINAV) | Sınav fazındaki soru sırası | app.js, `examGateActive()` sırasında | sınav fazı girişinde |
| `examSystem.remedialIndex`/`remedialCorrect` (TELAFİ) | Telafi fazındaki soru sırası | app.js, `phase==="remedial"` | telafi fazı girişinde |
| `stats.lives` (CAN) | Global, TEK havuz, zorluktan bağımsız | storage.js, `TOTAL_LIVES=5` | `applyLivesRefill` (zaman-tabanlı) |
| `stats.combo` (SERİ/streak DEĞİL — session-içi ardışık doğru) | Ardışık doğru cevap | app.js, XP çarpanı için | yanlış cevapta sıfırlanır |
| `daily.tasks[].value` (GÜNLÜK GÖREV) | Günlük 3 görevin ilerlemesi | storage.js, `dailyKey()` bazlı | gün değişince (SADECE app AÇILIŞINDA, bkz. C) |
| `sessionAdWatchesToday` (REKLAM HAKKI) | Günde en fazla 3 seans-uzatma reklamı | paywall.js, `localDateKey` bazlı | gün değişince |
| `stats.perMode[id].xp` (XP) | Mod başına toplam XP | storage.js | HİÇ (kalıcı, birikimli) |
| `roundFlow.timeLeft` (SÜRE) | Aktif turun geri sayımı | round-flow.js, 100ms `setInterval` | her yeni soru |
| `stats.rounds` (SEANS/toplam tur) | Toplam oynanan tur sayısı | storage.js | HİÇ (kalıcı) |

### 🟡 "5 soru bitti ama sayaç 0/0" — muhtemel açıklama (KESİN DOĞRULANAMADI, gerçek ekran görüntüsü/tekrar senaryosu YOK)
`challenge`/`examSystem` sayaçları SADECE kendi moduna ÖZGÜ
(`isChallenge()`/`examGateActive()` false iken görünen "BÖLÜM"/"SINAV"
satırı hiç YOK ya da 0/0 gösterir — çünkü `freshChallenge()`'ın
varsayılanı `done:0` olabilir). **En olası açıklama:** kullanıcı
"Serbest" ya da farklı bir Oyun Türü'nde 5 soru oynadı (bu turlar
`stats.rounds`'u VE `daily.tasks`'ı artırıyor, GERÇEK ilerleme VAR),
ama ekranda GÖRDÜĞÜ "BÖLÜM"/"SINAV" sayacı O MOD için hiç
AKTİF/ilerleyen bir sayaç DEĞİLDİ — kullanıcı "5 soru = 5/? bir yerde
görünmeli" bekledi, göremedi. **Bu bir VERİ KAYBI DEĞİL** (her sayaç
kendi doğru yerinde doğru artıyor, koddan doğrulandı) — bir GÖRÜNÜRLÜK/
İLETİŞİM sorunu: aynı ekranda "5 soru oynadın" diyen TEK bir birleşik
sayaç YOK, kullanıcı hangi sayacın NEYİ izlediğini AYIRT EDEMİYOR.
KESİN teşhis İÇİN kullanıcının HANGİ Oyun Türü'nde/hangi ekranda "0/0"
gördüğü GEREKİYOR — bu bilgi olmadan KESİN "bu satırdaki bug" diye
İŞARETLEMEK tahmin olur, YAPILMADI.

---

## K) ZAMANLAYICILARIN YAŞAM DÖNGÜSÜ ⚠️ ÖNCELİKLİ

**TAM envanter** (grep, `setTimeout`/`setInterval`, www/js/ genelinde
— `requestAnimationFrame` AYRI değerlendirildi):

| Zamanlayıcı | Tür | Kuruluş | Temizlenme noktaları | Durum |
|---|---|---|---|---|
| `freqTapTimer` | setTimeout | app.js:5872 | **5 nokta**: round-teardown (1582), skip-next/KATMAN1 (2476), genel reset (5367), Oyun Türü değişimi (5687, G187), cevap gönderme (6403) | 🟢 KAPSAMLI (G187'nin düzeltmesi) |
| `abPressTimer` | setTimeout | app.js:6446 | **SADECE** `pointerup`/`pointerleave` — mod değişimi/arka plan/pause YOK | 🔴 AÇIK (görevin kendi bilinen açığı, DETAYLANDIRILDI) |
| `cmpPreviewStopTimer` | setTimeout | app.js:6568 | 3 nokta: genel reset (5357), kendi başlatma öncesi (6408), yeniden kurulmadan önce (6564) | 🟢 yeterli görünüyor |
| `versionTapTimer` | setTimeout | app.js:8384 | kendi eşiği + yeniden kurulmadan önce | 🟢 dar kapsamlı (Ayarlar ekranına özgü), düşük risk |
| `toolsFilesSheetHideTimer` | setTimeout | app.js:9773 | sheet açılışında + yeniden kurulmadan önce | 🟢 yeterli |
| `routeChangeDebounceTimer` | setTimeout | app.js:12680 | **SADECE** kendi yeniden-kurulmadan önce (self-clear) — mod değişimi/arka plana özel bir temizlik YOK | 🟡 aşağıda detaylı |
| `autoAdvanceTimer`/`autoCountdownTimer` | setTimeout/setInterval | round-flow.js:87 | `clearAutoAdvance()`, `stopAll()` üzerinden ÇOK sayıda çağrı noktasından (her cevap-değerlendirme fonksiyonu + `pauseRound`) | 🟢 KAPSAMLI |
| `resWaitTimer` | setInterval | app.js:1750 | guard fonksiyonu (1727) — çağrı noktaları AYRICA doğrulanmadı | 🟢 muhtemelen yeterli |
| `abLoopTimer` | setInterval | app.js:5262 | `stopAbLoop()`, **9+ çağrı noktası** (pause, mod değişimi, cevap, teardown) | 🟢 KAPSAMLI |
| `paywallLivesTimer` | setInterval | app.js:8138 | guard fonksiyonu (8140) | 🟢 muhtemelen yeterli |
| `timerInterval` (roundFlow) | setInterval | round-flow.js:23 | `clearTimer()`, `stopAll()` üzerinden | 🟢 KAPSAMLI |

### 🔴 CİDDİ — `abPressTimer`: G187'nin AYNI sınıfı, DETAYLI senaryo
Görev metninin kendi ifadesiyle "bilinen açık" — bu turda MEKANİZMA
netleştirildi: `pointerdown` → 520ms sonra `abHeld=true; startAbLoop()`
(2sn'de bir ses değiştiren bir DÖNGÜ başlatır). Eğer kullanıcı parmağı
BASILI TUTARKEN (520ms dolmadan) uygulama ARKA PLANA alınırsa (ör.
home-swipe, gelen bir bildirim tam basılı tutarken tıklanırsa) —
mobil dokunmatik olaylarda arka plana alma SIRASINDA `pointerup`/
`pointerleave` GÜVENİLİR şekilde ATEŞLENMEYEBİLİR (BELİRSİZ, cihaza
bağlı, ama YAYGIN bilinen bir web-platformu tuhaflığı) — bu durumda
`abPressTimer` arka planda/dönüşte ateşler, `if (!activeQuestion)
return;` kontrolü turun HÂLÂ aktif olduğu durumda GEÇMEZ, `startAbLoop()`
ÇALIŞIR. `visibilitychange`'in `pauseRound()`'u bu ANDAN ÖNCE
çalışmışsa (arka plana girerken) `abLoopTimer` varsa DURDURUR — ama
BEKLEYEN `abPressTimer`'ı temizlemez, bu yüzden `pauseRound()`'DAN
SONRA gelen `abPressTimer` ateşlemesi YENİ bir `abLoopTimer` BAŞLATIR
— tam G187'nin "ölü ekrana ateş eden zamanlayıcı, istenmeyen ses/state
değişikliği" sınıfı. **Düzeltme ÖNERİSİ (kod YAZILMADI, sadece
belirtiliyor):** `pauseRound()`'a (ya da `visibilitychange`'in hidden
dalına) `clearTimeout(abPressTimer)` eklemek — freqTapTimer'ın G187'de
aldığı TAM aynı tedavi.

### 🟡 `routeChangeDebounceTimer` — mod değişiminde/arka plana alınca temizlenmiyor
Sadece kendi kendini temizliyor (yeniden kurulmadan önce). Bir route-
değişimi debounce'u (300ms mertebesinde tahmin edilir, KESİN süre
DOĞRULANMADI) beklerken kullanıcı HIZLICA mod değiştirirse/arka plana
alırsa, zamanlayıcı YİNE DE ateşler ve `onRouteChanged` çağrılır — bu
fonksiyonun İÇİ (`pauseRound()` vb.) kendi güvenlik kontrollerini
(`activeQuestion && !autoStopped`) taşıdığı için muhtemelen ZARARSIZ
(yanlış bir round'u DUR-durmaz, çünkü `activeQuestion` o an zaten
NULL/farklı olabilir) — ama bu KESİN olarak İZLENMEDİ, düşük-orta risk.

### 🟢 requestAnimationFrame kullanımları — kendi kendini iptal eden desen
`frekans-bulma.js`/`app.js`'teki rAF döngüleri (spektrum çizimi,
waveform) genelde `cancelAnimationFrame` İLE değil, kendi koşul
kontrolüyle (ör. `if (!roundActive) return;` sonraki karede) durduruluyor
— bu, G192'nin (waveform rAF/seek/pause/dolgu düzeltmesi) ZATEN
kapsamlı olarak ele aldığı alan, bu turda YENİ bir uç bulunmadı.

---

# ÖNCELİK LİSTELERİ

## Yayın öncesi düzeltilecekler (öncelik sırasıyla)
1. **🔴 Reklam yükleme zaman aşımı** (B/E) — `loadAndShowRewardedAd()`'a
   bir `Promise.race` + zaman aşımı eklenmeli (audio-engine.js'in
   `activateNativeSession()`'ının 2000ms deseniyle AYNI), aksi halde
   buton kalıcı kilitlenebilir, uygulamayı kapatmadan kurtarma YOK.
2. **🔴 `abPressTimer` temizliği** (K) — G187'nin AYNI tedavisi,
   `pauseRound()`/`visibilitychange`'e tek satır `clearTimeout` eklemek,
   düşük riskli/dar kapsamlı bir düzeltme.
3. **🔴 Native ses kesintisi köprüsü** (D/H/I) — `interruptionBegan`/
   `sessionActivated`'ın route-change'in ALDIĞI `evaluateJavaScript`
   tedavisini alması gerekip gerekmediği CİHAZDA doğrulanmalı ÖNCE
   (kesinti `visibilitychange`'i tetikliyor mu?) — tetiklemiyorsa bu
   madde 1 numaraya çıkmalı (can/süre haksız kaybı).

## 1.1'e bırakılabilir
- Gece yarısı geçişinde günlük görevlerin canlı yeniden hesaplanması
  (C) — düşük risk, sadece kafa karıştırıcı.
- `routeChangeDebounceTimer`'ın mod-değişimi/arka-plan temizliği (K) —
  muhtemelen zararsız, doğrulama ile birlikte ele alınabilir.
- Sayaçların (J) kullanıcıya TEK bir birleşik "bugün X soru oynadın"
  görünümünde sunulması — ürün kararı gerektirir.
- 74 tanı logunun (D) production'da azaltılması/gated hale getirilmesi
  — fonksiyonel risk yok, sadece temizlik.

## Sadece belgelenecekler
- Saat/timezone manipülasyonu sınıfının 3 örneği (C/H) — BEKLEYEN
  KARARLAR D'de ZATEN açık, bu rapor sadece somut örnekleri ekliyor.
- AirPlay/ekran kaydı/kilit ekranı davranışlarının BELİRSİZ kalan
  kısımları (I) — cihaz testi olmadan kapatılamaz.
- Aynı-anda-iki-dosya-yükleme'nin native seçicinin modal doğasına
  güvenmesi (A) — düşük risk, ayrı bir kilit gerektirmeyebilir.

**Bu turda hiçbir kod DEĞİŞTİRİLMEDİ — sadece ölçüm.**

# RET RİSKİ DENETİMİ — TUR 1

_15 Ağustos 2026 · commit `38f9a03`'e kadar (G214-G227 arası ~14 commit,
G220/G221/G223/G225'in üstünden YENİDEN ölçüldü — MAGAZA-DENETIM.md
14/15 Ağustos'ta yazılmıştı, bu turda hiçbir maddesi doğru varsayılmadı,
her biri koddan tekrar doğrulandı)._

**Yöntem notu:** Bu rapor SADECE bu repodaki koddan/yapılandırmadan
doğrulanabilenleri kapsıyor. App Store Connect'e yüklü ekran görüntüleri,
mağaza açıklaması metni, gizlilik.html/kullanim-kosullari.html'nin GERÇEK
hosted içeriği, Paid Apps Agreement durumu, gerçek bir Xcode
archive/pod install çıktısı — bunların HİÇBİRİ bu repodan görülemiyor,
her biri **BELİRSİZ** olarak işaretlendi, tahmin YÜRÜTÜLMEDİ.

---

## A) GUIDELINE 2.1 — TAMAMLANMIŞLIK

### 🟢 "Yakında" bölümü — GİZLİ, doğrulandı
`www/index.html:146` — `<div id="comingSection" class="hidden">`. Grep ile
doğrulandı: `www/js/app.js`'de `comingSection` stringi HİÇ geçmiyor —
hiçbir kod yolu bu `hidden` class'ını kaldırmıyor. `MODE_CATALOG`'un 14
kaydından 12'si `playable:true` (registry.js'te TAM 12 `registerMode()`
çağrısıyla BİREBİR eşleşiyor — grep ile sayıldı), 2'si (`hiz-modu`,
`hangisi-farkli`) `playable:false` — bunlar SADECE gizli `#comingSection`
içinde render ediliyor (`renderComingGrid()`, app.js:3078-3098).
`renderExerciseGrid()`'in (app.js:2926-2929) `MODE_CATALOG.filter(e =>
e.playable)` filtresi bu ikisini ANA `#modeGrid`'e HİÇ almıyor — oradaki
"Yakında" toast'ı (app.js:3056, `!realMode` dalı) `playable:true ⟹
registered` invaryantı koruduğu sürece PRATİKTE ERİŞİLEMEZ (savunmacı
kod, ölü değil ama tetiklenemez).

### 🟢 "TASLAK" ibaresi — kullanıcı metninde YOK
Grep: `TASLAK` kelimesi `guide-texts.js`/`app.js`/`index.html`'in
KULLANICIYA GÖSTERİLEN hiçbir string'inde geçmiyor — sadece kod
yorumlarında (bkz. G226/G223 kayıtları, DURUM.md). Tonal Balance'ın
eski "taslak" metni G207'de zaten değiştirilmişti, G223 sayıları
gerçek ölçüme çevirdi, G226 "i" metnine yöntem notu ekledi — üçü de
kullanıcıya "bitmemiş" izlenimi vermiyor.

### 🟡 "Liste temizlendi" — fresh-install'da yanıltıcı boş-durum metni
`app.js:3252-3254`, `renderHistory()`: geçmişi boş bir kullanıcıya (hiç
oynamamış, YENİ kurulum) "**Liste temizlendi**" gösteriyor — bu ifade
"bir şey vardı, silindi" çağrışımı yapıyor, "henüz oynamadın"
DEMİYOR. Reddedilme sebebi DEĞİL (boş bir metin/placeholder değil,
sadece isim yanlış), ama bir inceleyicinin ilk açılışta gördüğü ilk
şeylerden biri olabilir. **Düzeltme önerilir, ret riski taşımıyor.**

### 🟢 Diğer boş-durum ekranları kontrol edildi
- Zayıf Bölge Raporu (`progress.renderAnalysisHtml`, frekans-bulma.js:613-618):
  veri yokken "Birkaç tur oyna, kulağının hangi frekans bölgesinde
  güçlü/zayıf olduğunu burada göstereceğim." — açık, placeholder DEĞİL.
- Stereo Genişlik / dosya seçilmemiş (`syncUploadGate()`, app.js:2210-2249):
  "Bu mod kendi dosyanla oynanır — Gerçek bir mix üzerinde çalışır.
  Dosyalarım'dan bir şarkı seç ya da cihazından yeni bir dosya seç."
  + net bir CTA butonu. **Kaynağı olmayan TEK mod (madde 29, AÇIK
  İŞLER'de KAYITLI, bilinen bir sınır) ama "çalışmıyor" GİBİ
  GÖRÜNMÜYOR — yönlendirici bir mesajla karşılanıyor.**

### 🟡 Restore-purchase asimetrisi (bkz. B, aynı bulgu 3.1.1'de de geçerli)
Bkz. Bölüm B — burada da tekrarlanmıyor, çapraz referans.

### 🟢 Çalışmayan buton taraması (sınırlı doğrulama)
Bu oturumda zaten çalıştırılan geniş Playwright testleri (G214-G225
arası onlarca senaryo: 12 modun hepsinde soru başlatma/cevaplama/Atla,
paywall'ın 4 tetikleme yolu, sınav/telafi akışı, Araçlar sekmesinin
Tonal Balance/Referans Filtreleri/Mixini Yükle kartları) hiçbir tıklanan
öğede "hiçbir şey olmuyor" bulgusu üretmedi. **Bu KAPSAMLI bir buton
envanteri DEĞİL** — sistematik "her butona bas" turu bu görevin
kapsamında YAPILMADI, BELİRSİZ bırakılıyor (öneri: Tur 2'de böyle bir
envanter çıkarılabilir).

---

## B) GUIDELINE 3.1.1 — SATIN ALMA

### ✅ DÜZELTİLDİ (G228) — Restore Purchase, kullanıcının GERÇEKTE göreceği ilk paywall'da GİZLİ idi
`app.js:8221` (`openPaywallReason()`, satır 8207-8230): **HER**
bağlamsal paywall açılışında (`sessionLimit`/`livesOut`/`modeLocked`/
`upload`/`dailyUsed`/`zoneHistory`/`freePlayMode` — 7 tetikleyicinin
TAMAMI) `els.restorePurchaseBtn.classList.add("hidden")` çalışıyor.
Buna karşılık `#buyProBtn` (`index.html:1395`) HİÇBİR koşula bağlı
DEĞİL — grep ile doğrulandı, `buyProBtn` için TEK BİR
`classList.add/toggle("hidden")` çağrısı YOK, HER ZAMAN görünür.

**Sonuç:** G220'den beri (paywall artık İLK oturumda da açılıyor) bir
kullanıcının/incelemecinin GERÇEKTE karşılaşacağı İLK paywall ekranı
— 5 soru bitince ya da canlar bitince açılan, "Ücretsiz oturumun
bitti"/"Devam etmek için bir yol seç" — "Pro'ya Geç" butonunu
gösterirken "Satın alımı geri yükle"yi GÖSTERMİYOR. Restore SADECE
`resetPaywallToGeneric()` (Ayarlar → "Pro'ya Geç") üzerinden
ulaşılan, AYRI bir navigasyon adımı gerektiren ekranda var.

Apple'ın 3.1.1 metni: *"apps... must also include a 'Restore'
mechanism... that restores previously purchased items"* — kesin
kural "AYNI ekranda" demiyor ama yerleşik inceleme pratiği "Buy"
butonunun göründüğü YERDE "Restore"un da erişilebilir olmasını
bekliyor. **MAGAZA-DENETIM.md'nin ("İKİ yerde var... ✅") bu
asimetriyi test ETMEDİĞİ, bu turda bulundu — eski raporun bu maddesi
GEÇERSİZ.**
**Düzeltme yönü (uygulanmadı, kullanıcı kararı):** `openPaywallReason()`
içinde restore butonunu HER ZAMAN görünür bırakmak (ya da en azından
`buttons==="pro"` olan reasonlar için) — kod DEĞİŞTİRİLMEDİ, bu bir
ölçüm raporu.

### 🟢 Fiyat mağazadan okunuyor
`core/iap.js:fetchProPrice()` → `iap.getProducts()` → `priceString`.
`app.js:8266-8271`: açılışta bir kez çağrılıyor, sonucu `#proPrice`'a
yazıyor. `paywall.PRO_PRICE = "₺399"` (core/paywall.js:236) SADECE
plugin yokken/istek başarısız olursa (`liveProPrice===null`) YEDEK —
hardcoded fiyat kalıcı olarak GÖSTERİLMİYOR. 🟢, G168'in kendi notu
"You MUST display... Hardcoded values will cause App Store rejection"
diyor, kod bu kurala uyuyor.

### 🟢 Ürün tipi doğru
`core/iap.js:16`: `PRODUCT_ID = "com.logicprotrick.audioengineeracademy.pro"`,
`PRODUCT_TYPE_INAPP = "inapp"` — Non-Consumable, abonelik DEĞİL. Kodun
KENDİ yorumu bunu doğru tanımlıyor.

### 🟢 Harici ödeme yönlendirmesi yok
Grep: `www/js/**` içinde "sitemizden"/"web sitemizden satın al" gibi bir
ifade YOK, `href`'lerin tamamı `LEGAL_URLS` (gizlilik/koşullar,
BİLGİLENDİRME amaçlı, satın alma DEĞİL) ya da uygulama içi navigasyon.

### 🟢 Zorunlu bilgilendirme metinleri mevcut
`index.html:1402`: "Ödeme App Store hesabınızdan tahsil edilir. Tek
seferlik satın alma; otomatik yenileme yoktur." — fiyat + tek-seferlik +
otomatik-yenileme-yok ÜÇÜ de tek satırda. `index.html:1406-1410`:
Gizlilik Politikası/Kullanım Koşulları linkleri (`target="_blank"`,
`LEGAL_URLS`'ten `href` set ediliyor, app.js grep ile doğrulandı).
**Bu metinler paywall ekranının TEK DOM'unda (`#screen-paywall`) —
HANGİ reasonKey ile açılırsa açılsın (ilk oturum DAHİL) aynı,
`openPaywallReason()`'ın hiçbir dalı bunları gizlemiyor.** 🟢 G220
sonrası da BOZULMADI.

### 🟢 Pro kilitleri — isUserPro() dışında bir kontrol taraması
Grep (`grep -rn "isUserPro\|proPurchased\|simulatePro"`) ile TÜM kilit
noktaları tarandı: `applyProLockVisibility`/`renderZonePanel`/
`renderChartLock`/Araçlar kilidi/mod-kartı erişimi — HEPSİ tek kaynak
`isUserPro()` (`purchaseState.proPurchased || devFlags.simulatePro`,
app.js:1187-1189) üzerinden okuyor. G178'in kendi notu (Bug 22) BUNU
zaten "TEK doğruluk kaynağı" ilkesiyle merkezi hâle getirdiğini
söylüyor — bu turda AYRI bir kilit yolu (ör. eski bir `devFlags.pro`
kalıntısı, ayrı bir "unlockLevel" kontrolü) BULUNAMADI. **#22'nin
kendisi sandbox'ta CANLI test edilmedi (task'ın kendi notu) — kod
TARAMASI 🟢, canlı doğrulama BELİRSİZ.**

---

## C) GUIDELINE 3.2.2 / 4.2 — REKLAM VE İŞLEVSELLİK

### 🔴 RET SEBEBİ OLABİLİR (business-kritik, guideline-ihlali DEĞİL ama görev bunu 🔴 diye işaretlememi gerektiriyor çünkü inceleme build'inde de false olması istendi) — `AD_TEST_MODE = true`, HÂLÂ
`core/ads.js:19` — `export const AD_TEST_MODE = true;`. Dosyanın KENDİ
yorumu (satır 13-18) "CANLIYA ALMADAN ÖNCE: bu satırı false yap"
diyor — HÂLÂ `true`. MAGAZA-DENETIM.md bunu 14 Ağustos'ta zaten
🔴 işaretlemişti (madde 3), G214-G227 arası HİÇBİR commit bunu
DEĞİŞTİRMEDİ (grep ile doğrulandı, tek tanım noktası bu satır).
**Bu bir Apple guideline metni İHLALİ değil** (test reklamı göstermek
başlı başına 3.2.2/4.2 reddi SEBEBİ değil) **ama Google AdMob
politikasının kendisi canlı hesapta test reklamı göstermeyi
yasaklıyor, VE task'ın kendi talimatı** ("incelemeye giden build'de
de false olmalı") **açıkça bunu gerektiriyor — YAYIN ÖNCESİ MUTLAKA
kapatılması gereken TEK SATIR.**

### 🟢 Reklam yüklenemezse akış kırılmıyor, ödül hakkı düşmüyor
`app.js:handleWatchAd()` (~8871-8896): `try/finally` — `finally`
bloğu HER durumda `adWatchBusy=false` + buton etiketini geri
yüklüyor, kilitlenme YOK. `onSuccess()` (ödül fonksiyonu —
`grantSessionExtension()`/`grantAdLife()`) SADECE `result.ok===true`
İKEN çağrılıyor (`ads.js:177-189`, `watchRewardedAd()`'ın dönüş
sözleşmesi). `grantSessionExtension()` (app.js:8901-8908) günlük
sayacı (`recordSessionAdWatch`) SADECE bu başarı dalında artırıyor —
reklam yüklenemezse/kullanıcı yarıda kapatırsa günlük hak
TÜKETİLMİYOR. 🟢, koddan doğrulandı.

### 🟢 Reklam sıklığı — günde 3 sınırı, kotasız "+1 can" AYRI
`core/paywall.js:134`: `MAX_SESSION_EXTENSION_ADS_PER_DAY = 3` —
SADECE sessionLimit'in "+5 soru" ödülü için. `livesOut`'un "+1 can"
ödülü (`grantAdLife`) KOTASIZ (G165'ten beri, kod yorumuyla
doğrulandı) — rahatsız edicilik riski DÜŞÜK, kullanıcı kendi isteğiyle
tıkladığı SÜRECE gösterilen ödüllü reklam (interstitial/zorla-izlet
DEĞİL).

### 🟢 Minimum işlevsellik — ücretsiz kullanıcı gerçek bir deneyim yaşıyor
5 mod ücretsiz (`FREE_MODE_COUNT`, tier:"free" — grep: frekans-bulma/
kesim-noktasi/q-genisligi/boost-mu-cut-mu/kompresor), oturum başına 5
soru + günde 3 reklamla +5 soru daha, XP/seviye sistemi ücretsizde
KISITLANMIYOR (task'ın kendi listesi, önceki turlarda doğrulandı) —
"sadece ödeme duvarı" izlenimi vermiyor.

---

## D) GUIDELINE 5.1.1 / 5.1.2 — GİZLİLİK

### 🟢 Ağ çağrısı — sıfır, AdMob/native-purchases SDK'ları HARİÇ
Grep (`fetch\(|XMLHttpRequest|analytics|sendBeacon`) TÜM `www/js/`
üzerinde: TEK eşleşme grubu `audio-engine.js`/`source-catalog.js`'te,
İKİSİ de YEREL/bundle ses dosyalarını okumak için (WKWebView'ın
`fetch()`'in yerel bundle dosyasını çekemediği zaten belgelenmiş bir
kısıt, XMLHttpRequest bu yüzden kullanılıyor) — HİÇBİR dış/analitik
endpoint'i YOK. G224'ün "sıfır ağ çağrısı" ölçümü bu turda AYNI
sonuçla DOĞRULANDI. AdMob/StoreKit SDK'larının KENDİ ağ trafiği
(reklam sunumu, satın alma doğrulama) bu kapsamın DIŞINDA — onlar
zaten App Privacy'de "Third-Party Advertising" olarak beyan edilmiş
olmalı (BELİRSİZ — App Store Connect'teki GERÇEK beyanı bu repodan
göremiyorum).

### 🟢 ATT zamanlaması ve UMP sırası
`core/ads.js:doInitFlow()` (86-109): UMP (`requestConsentInfo`/
`showConsentForm`) ÖNCE, ATT (`trackingAuthorizationStatus`/
`requestTrackingAuthorization`, SADECE `getPlatform()==="ios"`) SONRA
— doğru sıra. Tetiklenme noktası `ensureAdMobReady()` → `watchRewardedAd()`
İLK çağrıldığında (kullanıcı ilk reklam izleme kararı verdiğinde) —
uygulama AÇILIŞINDA DEĞİL. `Info.plist:79-80`'deki
`NSUserTrackingUsageDescription` metni de bunu doğru anlatıyor:
"İzin vermezsen reklamlar yine gösterilir, sadece kişiselleştirilmez."

### 🟢 ATT reddedilirse uygulama çalışmaya devam ediyor
`doInitFlow()` ATT'nin SONUCUNA (`tracking.status`) göre erken
DÖNMÜYOR — akış her durumda `consentInfo.canRequestAds` kontrolüne
devam ediyor. Reddedilse bile (non-personalized reklam UMP/AdMob'un
kendi mantığıyla hâlâ mümkünse) fonksiyon `{ok:true}` dönebiliyor,
uygulamanın GERİ KALANI (12 mod, tüm oyun akışı) ATT'den TAMAMEN
bağımsız — reddetmek uygulamayı hiçbir yerde kilitlemiyor.

### 🔴 App Privacy beyanı — beyan doğru mu, BELİRSİZ (repodan görülemiyor)
Task'ın kendi iddiası ("7 veri tipi, hepsi Third-Party Advertising,
tracking=EVET") App Store Connect'e GİRİLEN bir form — bu repoda
KARŞILIĞI YOK, doğrulanamaz. Kod tarafında söyleyebileceğim TEK şey:
uygulamanın KENDİ kodu (AdMob/StoreKit SDK'ları HARİÇ) hiçbir veri
toplamıyor/göndermiyor (yukarıdaki ağ-çağrısı bulgusu) — yani beyan
edilen 7 veri tipinin TAMAMI, varsa, AdMob SDK'sının KENDİ davranışından
geliyor olmalı, uygulama koduNDAN değil. **Beyanın AdMob'un GERÇEKTEN
topladıklarıyla eşleşip eşleşmediği bu repodan doğrulanamaz — Google'ın
kendi AdMob Privacy beyanı referans alınmalı, BELİRSİZ bırakıldı.**

### BELİRSİZ — Gizlilik politikası/kullanım koşulları metni
`#screen-legal` (index.html:1316) ve paywall'ın yasal linkleri SADECE
DIŞARI (`LEGAL_URLS.privacy`/`LEGAL_URLS.terms`,
`https://audioengineeracademy.com/...`) yönlendiriyor — GERÇEK metin
bu repoda YOK, hosted bir sayfada. Bu sayfaların kodun GERÇEKTEN
yaptığını (reklam/satın alma/veri) doğru anlatıp anlatmadığı
DOĞRULANAMAZ.

### 🟢 Yaş derecelendirmesi 4+ ile içerik uyumlu (kod tarafı)
Kullanıcı-üretimi içerik YOK, sohbet/mesajlaşma YOK, harici
link/tarayıcı SADECE yasal metinlere (`target="_blank"`, sistem
tarayıcısında) — grep'le doğrulandı, uygulama içi WebView/iframe
YOK. İçerik ses eğitimi, şiddet/cinsellik/kullanıcı içeriği hiçbiri
YOK.

### 🟢 Çocuk verisi / hesap sistemi / konum — hiçbiri yok
Grep (`geolocation|login|sign.?in|create.*account`) www/js genelinde:
eşleşme YOK (yanlış pozitifler hariç tutuldu). Hesap sistemi/giriş
YOK — tüm veri `localStorage`'da, kullanıcı kimliği/e-posta/isim
TOPLANMIYOR.

---

## E) METADATA VE MAĞAZA TUTARLILIĞI

### BELİRSİZ — G216 seviye başlıkları vs App Store ekran görüntüleri
G216 (`www/js/core/progress.js`) 7 seviye başlığını değiştirdi (ör.
"Çırak Kulak" → "Yeni Kulak"). **App Store Connect'e yüklü 5 ekran
görüntüsünün İÇERİĞİ bu repodan HİÇ görülemiyor** — eski başlıkları mı
gösteriyorlar bilinmiyor. Bu, kodun kendisinde doğrulanamayan, TAMAMEN
dış bir kontrol gerektiren madde — **BELİRSİZ, App Store Connect'ten
elle kontrol edilmeli** (task'ın kendi ⚠️ işaretiyle uyumlu).

### BELİRSİZ — Mağaza açıklaması vaatleri
"12 mod"/"sınırsız"/"reklamsız" gibi ifadelerin GERÇEK mağaza
açıklaması metni bu repoda YOK (App Store Connect'te ayrı tutuluyor,
CLAUDE.md'nin kendi notu da bunu doğruluyor). Kod tarafında
doğrulanabilen: **12 mod GERÇEKTEN var ve oynanabilir** (registry.js,
12 `registerMode()`), **Pro "reklamsız"** (grep: `isUserPro()` reklam
kodunun (`handleWatchAd`) HİÇBİR çağrı noktasında zorunlu/otomatik
gösterim YOK — reklamlar HER ZAMAN kullanıcının kendi "izle" tıklamasıyla
başlıyor, Pro'da zaten watchAdBtn'in KENDİSİ paywall'a bağlı olduğu
için Pro asla görmüyor). "Sınırsız" (Pro'da soru/oturum sınırı yok) —
`paywall.isFreeSessionLimitReached` `isPro` true iken koşulsuz false
(G215'te zaten doğrulanmıştı). **Vaatlerin KENDİSİ (mağaza metninin
TAM cümleleri) görülemediği için TEK TEK eşleştirme YAPILAMADI —
BELİRSİZ, sadece kodun DESTEKLEDİĞİ iddialar listelendi.**

### BELİRSİZ — Destek URL'i, e-posta
`destek@audioengineeracademy.com` (MAGAZA-DENETIM.md'nin daha önce
doğruladığı) bu repoda BAĞLAM olarak YOK (mağaza metninde geçiyor
olmalı, koda gömülü değil) — çalışıp çalışmadığı DOĞRULANAMAZ (dış
e-posta sunucusu kontrolü, bu ortamdan yapılamaz).

### 🟢 Uygulama adı tutarlılığı
`capacitor.config.json:appName` = "Audio Engineer Academy",
`Info.plist:CFBundleDisplayName` = "AE Academy" (BİLEREK farklı, G171
kararı — ana ekran ikonu altında kesilme sorunu için, `CFBundleName`/
uygulama-içi başlıklar DEĞİŞMEDİ, kod yorumuyla doğrulandı) — bu bir
tutarsızlık DEĞİL, belgeli bir kasıtlı ayrım. App Store Connect'teki
"ad" alanının hangisiyle eşleştiği BELİRSİZ (dış kayıt).

---

## F) TEKNİK YAPILANDIRMA

### 🟢 Info.plist — arm64/yön/iPhone-only tutarlı
`UIRequiredDeviceCapabilities` = `arm64` (G207'de armv7'den
düzeltilmiş, doğrulandı). `UISupportedInterfaceOrientations` SADECE
Portrait, iPad-özel yön bloğu YOK (G207'de kaldırılmış, doğrulandı).
Gereksiz izin YOK — `NSUserTrackingUsageDescription` DIŞINDA hiçbir
`NS*UsageDescription` anahtarı yok (mikrofon/konum/kamera/rehber
istenmiyor, dosya seçici `UIDocumentPickerViewController` kullanıyor
olmalı — bu API iOS'ta izin açıklaması GEREKTİRMEZ, ama plugin'in
KENDİ davranışı bu repodan %100 doğrulanamıyor, düşük risk).

### BELİRSİZ — Privacy Manifest (PrivacyInfo.xcprivacy), "required reason API" uyumu
Apple Mayıs 2024'ten beri üçüncü taraf SDK'ların (ve "required reason"
API kullanan kodun) bir Privacy Manifest taşımasını ZORUNLU kılıyor —
build-doğrulama aşamasında (insan incelemesinden ÖNCE) otomatik
reddedebiliyor. `@capacitor/ios`'un KENDİ `PrivacyInfo.xcprivacy`'si
VAR (doğrulandı, node_modules içinde). **AdMob (GoogleMobileAds)/
native-purchases pod'larının KENDİ manifest'lerini taşıyıp
taşımadığı bu repodan DOĞRULANAMAZ** — `Podfile.lock` bu ortamda YOK
(hiç `pod install` çalıştırılmamış), gerçek bir Xcode archive/build
gerektiriyor. **Bu, bu turun EN ÖNEMLİ BELİRSİZ maddesi olabilir** —
SDK sürümleri güncel değilse (AdMob SDK <11.x gibi eski sürümler
manifest taşımayabilir) build reddi riski var, ama package.json'daki
`@capacitor-community/admob@^8.0.0` sürümünün ALTINDA hangi
GoogleMobileAds-iOS sürümünü çektiği de KANITLANAMADI.

### 🟢 SKAdNetwork / AdMob App ID
`Info.plist:66-74`: `GADApplicationIdentifier` dolu, `SKAdNetworkItems`
TEK kayıt (`cstr6suwn9.skadnetwork`, AdMob'un KENDİ minimum listesi) —
mediation KULLANILMADIĞI için (kod yorumuyla doğrulandı) bu YETERLİ,
eksik DEĞİL. Android `AndroidManifest.xml:36-38`:
`com.google.android.gms.ads.APPLICATION_ID` meta-data mevcut.

### 🟢 Android AD_ID izni — G207'de elle eklenmiş, hâlâ duruyor
`AndroidManifest.xml:63`: `com.google.android.gms.permission.AD_ID` —
MAGAZA-DENETIM.md'nin "Manifest'te YOK" uyarısı (madde altı,
"📋 PLAY STORE") ARTIK GEÇERSİZ, G207'de zaten elle eklenmiş
(kod yorumu bunu "Java/Gradle bu ortamda yok, gerçek merge sonucu
KANITLANAMADI ama zararsız/idempotent" diye açıkça belirtiyor —
DÜRÜST bir BELİRSİZLİK notu, bu turda AYNEN korunuyor).

### 🟡 Yayın build'i kalıntıları — geliştirici modu, test kancaları, console.log
- **Geliştirici modu (7 tık):** `app.js:8357` — "Hakkında" → sürüm
  numarası satırına 7 kez üst üste dokununca `devFlags.unlocked=true`,
  Pro simülasyon anahtarı açılıyor. **StoreKit/IAP'ı DOLANDIRMIYOR**
  (sadece LOKAL bir görüntüleme bayrağı, gerçek satın alma ayrı) —
  Apple'ın kendisi GENELLİKLE bunu reddetmiyor (yaygın bir geliştirici
  paterni) ama bir incelemeci TESADÜFEN bulursa "gizli özellik" izlenimi
  verebilir. **Düşük risk, bilgilendirme amaçlı not.**
- **Test kancaları:** `window.__aeaShowSessionEndForTest`
  (app.js:~11469), `window.__tonalDebugState`/`window.__tonalRefVerify`
  (app.js:~11420-11460) — global `window` nesnesine asılı, ÇAĞRILMAZSA
  hiçbir çalışma-zamanı etkisi YOK, kullanıcı arayüzünde HİÇBİR İZ
  bırakmıyor (buton/menü/link YOK). Bir incelemeci Safari Web Inspector
  ile JS kaynağını AÇIP ARARSA görülebilir ama bu App Review'ın
  standart pratiği DEĞİL. **Çok düşük risk.**
- **console.log/console.error:** 41 `console.log` + 35 `console.error`
  çağrısı `www/js/**` genelinde (bu turda GERÇEKTEN sayıldı — task'ın
  "43" tahmini yaklaşık doğru, TAM sayı 41). Kullanıcı arayüzünde
  GÖRÜNMÜYOR, sadece Safari/Chrome DevTools konsoluna yazıyor —
  App Review guideline'larında bu başlı başına bir ret sebebi DEĞİL
  (yaygın bir geliştirme kalıntısı, temizlik önerilir ama zorunlu
  değil). **Düşük risk.**

### 🟢 Capacitor/AdMob/native-purchases sürümleri — bilinen kritik açık taraması
`package.json`: Capacitor `^8.4.2` (güncel major), `@capacitor-community/admob@^8.0.0`,
`@capgo/native-purchases@^8.6.5` — bu ortamda `npm audit`/CVE
veritabanı erişimi YOK, bu repodan "bilinen güvenlik açığı var/yok"
KESİN olarak söylenemez. **Sürüm numaralarının kendisi (8.x, güncel
major) eski/terk edilmiş bir sürüm İZLENİMİ vermiyor — ama kesin CVE
taraması BELİRSİZ bırakıldı** (tahmin yürütülmedi).

---

## G) ÇÖKME VE DONMA

### 🟢 "Atla" spam'i — G214/G185'te ÖLÇÜLEREK kapatılmıştı, bu turda tekrar doğrulandı
`e2e/paywall-flow.spec.mjs`'in `exhaustFreeSessionLimit()` yardımcı
fonksiyonu (6 ardışık "Atla" tıklaması) bu OTURUMDA G225'in
doğrulanması sırasında DEFALARCA çalıştırıldı (10/10 e2e testi
GEÇİYOR) — hızlı/ardışık "Atla" tıklaması ne bir hata fırlatıyor ne
bir kilitlenmeye yol açıyor.

### 🟢 Hızlı mod değişimi / yarım kalan yükleme — kısmen doğrulandı
Bu oturumun G220-G225 arası Playwright testleri mod-girişi/round-başlatma/
paywall-kesintisi/reklam-izleme kombinasyonlarını onlarca kez ardışık
çalıştırdı (`node --test e2e/*.spec.mjs`, hepsi 10/10 GEÇTİ) —
spotlight overlay'in/feedback panelinin yarım kalmış durumlarının
(bu oturumda AYRICA keşfedilen, `dismissFeedbackIfShown` gerektiren
senaryolar) İKİSİ de test edildi, kilitlenme YOK. **Bu, "her şeye
rastgele bas" tarzı bir kaos testi DEĞİL** — belirli, tekrarlanabilir
senaryolar. Sistematik bir "inceleyici gibi rastgele davran" turu
YAPILMADI, **BELİRSİZ** bırakılıyor.

### 🟢 Çıkışsız ekran taraması (sınırlı)
Her ekranın bir "geri"/"kapat" yolu olduğu bu oturum boyunca
(paywall'ın X'i, ekranların back butonları, feedback panelinin
close'u) tekrar tekrar KULLANILDI, hiçbiri tıklanamaz/geri
dönülemez bulunmadı. **Sistematik bir envanter DEĞİL** — BELİRSİZ.

---

# ÖNCELİK SIRASIYLA — YAYIN ÖNCESİ MUTLAKA

1. **🔴 `AD_TEST_MODE = true` → `false`** (`core/ads.js:19`) — hem
   gerçek yayın hem incelemeye giden build için. TEK SATIR.
2. **✅ DÜZELTİLDİ (G228)** — Restore Purchase artık `openPaywallReason()`'ın
   HİÇBİR dalında gizlenmiyor, bağlamsal paywall'da da görünüyor.
   `e2e/paywall-flow.spec.mjs` 11/11 (`git stash` ile kırmızı/yeşil
   doğrulandı). Bkz. DURUM.md G228.
3. **BELİRSİZ ama YÜKSEK ETKİ — Privacy Manifest (PrivacyInfo.xcprivacy)
   uyumu** — gerçek bir `pod install` + Xcode archive ile
   doğrulanmalı, bu repodan görülemiyor. Build-doğrulama aşamasında
   insan incelemesinden ÖNCE reddedebilir.
4. **BELİRSİZ — App Store Connect'teki 5 ekran görüntüsü, G216'nın
   yeni seviye başlıklarını mı gösteriyor** — elle kontrol edilmeli.
5. **BELİRSİZ — Paid Apps Agreement imzalı mı** (MAGAZA-DENETIM.md'nin
   "EN BÜYÜK RİSK" maddesi — bu turda TEKRAR doğrulanamadı, süreç
   sorunu, koddan görülmüyor, hâlâ geçerli bir kontrol maddesi).
6. **🟡 "Liste temizlendi" boş-durum metni** — düşük öncelik, kolay
   düzeltme.
7. **🟡 Yayın kalıntıları (dev modu/test kancaları/console.log)** —
   çok düşük risk, isteğe bağlı temizlik.

**Bu turda DÜZELTİLEN/DEĞİŞTİRİLEN kod YOK — bu SADECE bir ölçüm
raporudur.**

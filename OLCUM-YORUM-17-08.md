# OLCUM-YORUM-17-08

GÖREV: ÖLÇÜM. KOD YAZMA, COMMIT ATMA.

G283'te yorum isteme KARAR mantığı eklendi ama gerçek native çağrı
yazılmadı — "Capacitor'da hazır plugin yok, native proje değişikliği
gerekiyor" denilmişti. Bu ölçüm o iddiayı somutlaştırıyor: NE KADAR
değişiklik, hangi YOL, ne RİSK.

**Yöntem:** Kod okuma (`ios/App/App/*.swift`, `*.pbxproj`,
`CapApp-SPM/Package.swift`, `www/js/core/audio-engine.js`,
`www/js/app.js`) + bu projenin KENDİ geçmişindeki native-plugin-ekleme
vakalarının (G132/G134/G135, AdMob/FilePicker/VolumeButtons/
NativePurchases) DURUM.md kayıtları + `@capacitor-community/in-app-review`
paketinin GitHub/npm sayfaları (WebFetch/WebSearch, 17.08.2026).

---

## 1) SKStoreReviewController'ı bağlamak için TAM OLARAK ne gerekiyor?

**Bu proje CocoaPods DEĞİL, SPM (Swift Package Manager) kullanıyor**
(`ios/App/CapApp-SPM/Package.swift`, Podfile YOK — `find ios -iname
"Podfile*"` boş döndü) — bu, hem "hazır plugin" hem "kendi yaz" yolunu
etkiliyor, aşağıda ayrı ayrı.

### YOL A — Mevcut `AudioSessionPlugin.swift`'e eklemek (KENDİ KOD)

**EVET, oraya eklenebilir, AYRI plugin GEREKMEZ.** `AudioSessionPlugin`
zaten `MainViewController.swift`'te `registerPluginInstance()` ile
KAYITLI (bkz. madde 1.1) — yeni bir `@objc func requestReview(...)`
metodu eklemek bu kaydı YENİDEN KULLANIR, YENİ bir kayıt/Main.storyboard
değişikliği GEREKMEZ (G134'ün acı verdiği kısım — bkz. altta — BU YOLDA
TEKRARLANMAZ).

**Değişecek dosya sayısı: 2** (`AudioSessionPlugin.swift` + bir JS
dosyası, aşağıda).

**Swift tarafı (~15-20 satır, TEK dosyada):**
```swift
// AudioSessionPlugin.swift'in EN ÜSTÜNE:
import StoreKit

// pluginMethods dizisine BİR satır:
CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise)

// Sınıfın içine YENİ bir metod (referans: capacitor-community/in-app-review'ın
// KENDİ Swift'i — bkz. madde 2 — BİREBİR aynı desen):
@objc func requestReview(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
        if let scene = UIApplication.shared.connectedScenes
            .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
            if #available(iOS 17.0, *) {
                AppStore.requestReview(in: scene)
            } else {
                SKStoreReviewController.requestReview(in: scene)
            }
        }
        call.resolve()
    }
}
```
`StoreKit.framework` **ZATEN BAĞLI** (project.pbxproj, `@capgo/native-purchases`
IAP için — G283'te doğrulanmıştı) — yeni bir framework linki GEREKMEZ.

**JS tarafı (~10-15 satır):** `core/audio-engine.js`'in
`getAudioSessionPlugin()` sarmalayıcısına (satır 232-258) `activate`'in
YANINA bir satır (`requestReview: () => window.Capacitor.nativePromise("AudioSessionPlugin", "requestReview", {})`),
sonra `app.js:requestNativeStoreReview()`'daki `console.warn` NO-OP'u bu
çağrıya bağlanır. `nativePromise` köprüsü **CİHAZDA ÖLÇÜLDÜ, ÇALIŞTIĞI
KANITLANDI** (G135 — `activate()` için, AYNI mekanizma).

**Podfile/`npx cap sync`/`.xcodeproj` DEĞİŞMEZ** — `AudioSessionPlugin.swift`
App target'ının İÇİNDE zaten derlenen bir dosya, satır eklemek yeni bir
build-fazı girdisi GEREKTİRMEZ (SADECE YENİ bir dosya eklemek gerektirirdi
— G134'ün acı verdiği TAM OLARAK bu, madde 3'te detaylı).

### YOL B — Ayrı bir yeni yerel plugin dosyası (KENDİ KOD, YOL A'DAN KAÇINILDI)

Mümkün ama **GEREKSİZ RİSK** — G134'ün kendi kaydı: bu proje "eski-format
.xcodeproj kullanıyor, `PBXFileSystemSynchronizedRootGroup` YOK, yeni
dosyalar OTOMATİK derlenmiyor" — yeni bir `.swift` dosyası ELLE
`project.pbxproj`'a (`PBXBuildFile`/`PBXFileReference` + Sources build
fazı) eklenmeli, VE yeni sınıf `MainViewController.swift`'te AYRICA
`registerPluginInstance()` ile kaydedilmeli. G134 TAM OLARAK bunu
YAPMAYI UNUTTUĞU için G135'e kadar plugin hiç çalışmadı (cihazda
kanıtlandı). **YOL A bu riski TAMAMEN atlıyor** (mevcut, zaten kayıtlı
sınıfı genişletiyor) — bu yüzden YOL B ÖNERİLMİYOR.

---

## 2) Hazır bir üçüncü taraf plugin var mı?

**EVET: `@capacitor-community/in-app-review`** (17.08.2026, WebSearch/
WebFetch ile doğrulandı):
- **v8.0.0**, Capacitor 8 desteğiyle (bu projenin `@capacitor/core` sürümü
  `^8.4.2` — EŞLEŞİYOR).
- **Bakım durumu:** 84 commit, 0 açık issue, 7 bekleyen PR — v7.0.1
  ÖZELLİKLE "deprecated iOS SKStoreReviewController usage" düzeltmesi
  yapmış (Apple'ın API değişikliklerine TEPKİ VERDİĞİNİN kanıtı), v7.1.0
  SPM desteği eklemiş.
- **iOS implementasyonu** (kaynak koddan doğrudan okundu,
  `ios/Sources/InAppReviewPlugin/InAppReview.swift`) BİREBİR YOL A'daki
  ile AYNI desen — iOS 17+'ta `AppStore.requestReview`, altında
  `SKStoreReviewController.requestReview` — TOPLAM ~20 satır, 2 dosya.
- **iOS 18 uyumluluğu AÇIKÇA doğrulanamadı** (release notlarında "iOS 18"
  geçmiyor) ama kullandığı API'ler (`AppStore.requestReview`/
  `SKStoreReviewController.requestReview`) Apple tarafından iOS 18'de
  KALDIRILMADI/deprecate EDİLMEDİ — bilinen bir uyumsuzluk YOK, sadece
  "iOS 18'de AÇIKÇA test edildi" diye bir kayıt bulunamadı (DOĞRULANMADI
  olarak işaretleniyor).

**SPM desteği bu projenin kurulumuyla UYUMLU** (`ios/Sources/` +
`Package.swift` klasör yapısı GitHub'da doğrulandı) — `npx cap sync ios`
`CapApp-SPM/Package.swift`'e (bu proje bunu **7 farklı plugin için ZATEN
BAŞARIYLA yapmış** — AdMob/VolumeButtons/Filesystem/Preferences/
SplashScreen/FilePicker/NativePurchases, `Package.swift` satır 15-21)
YENİ bir `.package`/`.product` girdisi ekler — bu **YENİ/denenmemiş bir
mekanizma DEĞİL**, bu projede 7 kez ÇALIŞMIŞ bir işlem.

**Değişecek dosya sayısı: 3** — `package.json` (bağımlılık satırı),
`CapApp-SPM/Package.swift` (`npx cap sync ios` OTOMATİK günceller,
dosyanın kendi başlığı "DO NOT MODIFY — managed by Capacitor CLI"),
`app.js` (`requestNativeStoreReview()`'ı `window.Capacitor.Plugins.InAppReview.requestReview()`'a
bağlamak).

⚠️ **DÜZELTME (G283'ün kendi notuna göre):** G283 "npm install NEREDEYSE
her zaman native proje dosyalarını (Podfile/Xcode) DEĞİŞTİRİR, bu
ortamdan derleme doğrulanamaz" diyordu — bu HÂLÂ doğru (Podfile yok ama
`CapApp-SPM/Package.swift` YİNE DE değişir) ama **"YÜKSEK RİSK" ÇAĞRIŞIMI
ABARTILIYORDU** — bu proje AYNI mekanizmayı 7 kez BAŞARIYLA kullanmış,
DENENMEMİŞ bir yol DEĞİL.

---

## 3) Risk

**Native değişiklik iOS build'ini bozar mı?**
- YOL A (AudioSessionPlugin genişletme): ÇOK DÜŞÜK — var olan, ÇALIŞAN
  bir dosyaya EKLEME yapılıyor, mevcut metodlara (`activate`/
  `handleInterruption`/`handleRouteChange`) DOKUNULMUYOR. En kötü
  senaryo: Swift söz dizimi hatası → Xcode derlemeyi REDDEDER (net,
  görünür hata — SESSİZCE bozulan bir şey YOK).
- YOL B (npm plugin): DÜŞÜK-ORTA — `npx cap sync ios` paket çözümlemesi
  başarısız olabilir (versiyon çakışması vb.) ama bu HATA Xcode'da AÇIKÇA
  görünür ("Missing package product"/"could not resolve package
  dependencies") — bu proje AYNI adımı 7 kez sorunsuz atlatmış.

**Bu ortamdan derlenemiyor — Logic Xcode'da derleyecek, hata çıkarsa nasıl anlar?**
Xcode'un **Issue Navigator**'ında (⌘5) kırmızı hata ikonuyla dosya:satır
GÖSTERİLİR — Swift söz dizimi hataları/eksik import'lar derlemeyi
DURDURUR, ÇALIŞAN bir binary ÜRETİLMEZ (yani "yanlışlıkla bozuk bir sürüm
yayınlama" riski YOK, derleme BAŞARISIZ olursa hiçbir şey çalıştırılamaz).
SPM paket çözümleme hataları AYRI bir kırmızı banner olarak (Xcode'un üst
kısmında, "Package Resolution Failed") görünür. **Somut kontrol listesi**
(Logic için): (1) Xcode'da ⌘B (Build) — kırmızı hata YOKSA devam, (2)
simülatörde/cihazda ⌘R ile çalıştır, Xcode konsolunda `[audio-diag-native]`
benzeri bir log (ya da yeni eklenen bir `print()`) ARA, (3) sınav geçme/
seviye atlama gibi bir anı simüle et (dev modda `stats.rounds`'ı 30+
yapan bir localStorage manipülasyonu + bir seviye atlaması), sistem
diyaloğunun (ya da SESSİZ no-op'un — Apple'ın kendi sınırı) davranışını
GÖZLEMLE.

**Geri alınabilir mi?**
**EVET, İKİSİ de trivially geri alınabilir** — hiçbir kalıcı/native
state (veritabanı göçü, keychain, vb.) DEĞİŞMİYOR. YOL A: eklenen
satırları `git revert`/silme. YOL B: `npm uninstall` + `npx cap sync ios`
(Package.swift'ten girdi otomatik kalkar).

---

## 4) G283'ün karar mantığı — native çağrı eklenirse BAŞKA bir şey gerekir mi?

**HAYIR.** `app.js:requestNativeStoreReview()` (satır 2925-2927) ZATEN
`maybeRequestStoreReview()`'ın TEK native-çağrı noktası — gating
(olgunluk/cooldown/ilk-oturum/3-onaylı-an) TAMAMEN bundan ÖNCE, AYRI
katmanda çalışıyor. Bu fonksiyonun GÖVDESİNİ (şu an SADECE
`console.warn`) gerçek bir `window.Capacitor.nativePromise(...)` (YOL A)
ya da `window.Capacitor.Plugins.InAppReview.requestReview()` (YOL B)
çağrısıyla DEĞİŞTİRMEK **YETERLİ** — çağrı noktaları/gating/persist
mantığının HİÇBİRİNE dokunmaya GEREK YOK.

---

## 5) Native olmadan yapılabilecek bir alternatif var mı?

**VAR — App Store ürün sayfasının "yorum yaz" URL'sine DOĞRUDAN link**
(`https://apps.apple.com/app/id<APP_ID>?action=write-review`), `window.open()`
ile açılır. Bu, Apple'ın 4.3(f) kısıtlamasının HEDEFİ OLAN şey DEĞİL —
o kural SKStoreReviewController'ı KENDİ özel "Yorum Yap" UI'ınla
İKİLEME (kullanıcıyı SİSTEM diyaloğuna ZORLAMA/manipüle etme) hakkında;
App Store'a DÜZ bir link SAYISIZ uygulamada kullanılan, YAYGIN VE İZİNLİ
bir örüntü (kullanıcı UYGULAMADAN ÇIKIP mağazaya gidiyor, oradan
İSTERSE yorum yazıyor — sistem diyaloğuyla AYNI eylemi TAKLİT ETMİYOR).

**Ama bu Logic'in istediği ŞEYİN YERİNE GEÇMEZ, daha ZAYIF bir
alternatif:** kullanıcı uygulamadan ÇIKMAK, App Store'da gezinip
"Yorum Yaz"a AYRICA basmak ZORUNDA — sürtünme ÇOK daha yüksek, dönüşüm
oranı GERÇEK sistem diyaloğundan (tek dokunuşla, uygulamadan HİÇ
çıkmadan) ÇOK daha düşük olacaktır (SAYISAL bir dönüşüm-oranı
karşılaştırması bu ortamdan YAPILAMAZ/ölçülemez — bu bir TASARIM
gerçeği, ölçülmüş bir veri DEĞİL).

⚠️ **Ön koşul eksik:** Bu link `<APP_ID>` gerektiriyor — uygulama henüz
1.0'a çıkmadığı için App Store Connect'teki NUMERİK app id BU ORTAMDAN
bilinmiyor/doğrulanamadı, Logic'in App Store Connect hesabından
alınması gerekiyor.

---

## SONUÇ

**Yapılabilir mi:** EVET, İKİ yolla da (YOL A: kendi kod, YOL B: hazır
plugin) — ikisi de bu projenin KENDİ geçmişinde ZATEN kanıtlanmış
mekanizmaları kullanıyor (nativePromise köprüsü YOL A için, SPM-plugin-
ekleme akışı YOL B için 7 kez başarılı).

**Ne kadar iş:**
- YOL A (ÖNERİLEN — mevcut AudioSessionPlugin'e ekleme): **2 dosya,
  ~25-35 satır toplam** (Swift ~15-20 + JS ~10-15), YENİ bağımlılık YOK,
  `npx cap sync` GEREKMEZ.
- YOL B (`@capacitor-community/in-app-review`): **3 dosya**
  (`package.json` + otomatik-üretilen `Package.swift` + `app.js`),
  `npm install` + `npx cap sync ios` gerekir, ama bakımlı/güncel bir
  paket olduğu için Apple'ın gelecekteki API değişikliklerini KENDİSİ
  takip eder (YOL A'da bu takip BİZE kalır).

**Risk:** DÜŞÜK (her iki yol da) — geri alınabilir, bu ortamdan
derlenemediği için Xcode'da ⌘B ile AÇIKÇA görünür şekilde
doğrulanmalı (somut kontrol listesi madde 3'te), hiçbir kalıcı/silinemez
native state değişikliği YOK.

**Tercih (teknik değerlendirme, ürün kararı DEĞİL):** YOL A biraz daha
az iş ve SIFIR yeni bağımlılık, ama YOL B (bakımlı paket) Apple'ın API
değişikliklerini uzun vadede daha az bakım yüküyle takip eder — ikisi
de makul, karar Logic'in.

Kod yazılmadı, commit atılmadı.

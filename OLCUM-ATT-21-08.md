# OLCUM-ATT-21-08 — Apple Guideline 2.1 reddi: ATT diyaloğu neden çıkmıyor

**Bağlam:** v1.0 (2) reddedildi. Apple: *"unable to locate the App Tracking
Transparency permission request"* — inceleme cihazları iPhone 17 Pro Max +
iPad Air 11" (M3), iPadOS/iOS 26.6.

**Yöntem:** Kod okuma + Info.plist + eklenti native kaynağı + Capacitor köprü
kaynağı. Playwright/çalıştırma YOK (native diyalog otomatize edilemez).
Kod DEĞİŞTİRİLMEDİ, commit atılmadı.

---

## A) ATT ÇAĞRISI VAR MI, NEREDE?

**1. Çağrılıyor. TEK yer:**
`www/js/core/ads.js:100` — `await admob.requestTrackingAuthorization();`
(senkron kopyası `ios/App/App/public/js/core/ads.js:100` — `diff` ile
BİREBİR aynı doğrulandı, yani `cap sync ios` güncel, bayat kopya sorunu YOK.)

Durum sorgusu ayrıca `ads.js:98` — `admob.trackingAuthorizationStatus()`.

**2. Ne zaman: uygulama açılışında DEĞİL.**
Çağrı `doInitFlow()` (`ads.js:88-111`) içinde. Bu fonksiyona tek giriş
`ensureAdMobReady()` (`ads.js:84-87`), ona da tek çağrı `watchRewardedAd()`
(`ads.js:216`).

`www/js/app.js` genelinde `ensureAdMobReady`/`watchRewardedAd` araması: tek
gerçek çağrı `app.js:10333` (`ads.watchRewardedAd`), o da `handleWatchAd()`
içinden. **Açılış/`DOMContentLoaded` yolunda ATT'ye giden hiçbir çağrı YOK.**

> Ayrıca: Ayarlar → "Reklam Tercihleri" (`app.js:9808` → `ads.showPrivacyOptions()`)
> ATT'yi **çağırmıyor** — o fonksiyon (`ads.js:118-132`) `ensureInitialized()`
> kullanıyor, `ensureAdMobReady()` DEĞİL. Yani ikinci bir ATT yolu yok.

**3. Koşullara bağlı. Zincirin tamamı (hepsi sağlanmalı):**

| # | Koşul | Kanıt |
|---|---|---|
| a | Kullanıcı Pro DEĞİL | `app.js:10326` — `if (isUserPro()) return;` |
| b | Paywall `livesOut` veya `sessionLimit` sebebiyle AÇIK | `paywall.js:283-296`, `app.js:9488-9503` |
| c | "reklam izle" butonu görünür | `app.js:9490-9500` (`adGrant` alanı olan sebepler) |
| d | Kullanıcı butona **DOKUNUR** | `app.js:10357` click handler |
| e | AdMob eklentisi mevcut | `ads.js:89-90` |
| f | `getPlatform() === "ios"` | `ads.js:97` |
| g | `tracking.status === "notDetermined"` | `ads.js:99` |

**4. Temiz kurulumda sağlanıyor mu? — Teknik olarak EVET, pratikte İNCELEMECİ
İÇİN HAYIR.**

Yeni kullanıcı 5 canla başlıyor (`storage.js:193`, `TOTAL_LIVES = 5`) ve
ücretsiz oturum limiti 5 soru (`paywall.js:113`,
`FREE_SESSION_QUESTION_LIMIT = 5`). Yani diyaloğa ulaşmak için gereken **en
kısa** yol:

> Uygulamayı aç → bir mod seç → **5 soru oyna** → oturum limiti paywall'ı
> açılır (`app.js:1769-1775`) → **"veya reklam izle, +5 soru hakkı kazan"
> butonuna DOKUN** → ATT diyaloğu.

Koşul (g) da temiz kurulumda sağlanır (`AuthorizationStatusEnum.swift:4` —
`case NotDetermined = "notDetermined"`, JS'in `ads.js:99`'daki string
karşılaştırmasıyla **BİREBİR eşleşiyor**; burada bir enum uyuşmazlığı hatası
YOK, kontrol edildi).

**5. Yapay gecikme YOK** — ama ATT'den önce aynı `async` fonksiyonda iki iş
sırayla `await` ediliyor: `ensureInitialized()` (`ads.js:92`) ve UMP akışı
(`ads.js:93-96`). Bkz. C ve F.

---

## B) INFO.PLIST

**6. Anahtar VAR:** `ios/App/App/Info.plist:79`.

**7. Metin (satır 80), boş değil:**
> "Reklamların sana daha uygun olması için kullanılır. İzin vermezsen
> reklamlar yine gösterilir, sadece kişiselleştirilmez."

**8. Değerlendirme:** Metin verinin neden istendiğini (reklam
kişiselleştirme) ve reddedilirse ne olacağını açıkça söylüyor — Apple'ın
biçimsel beklentisini karşılıyor görünüyor.

> **B, reddin sebebi DEĞİL.** Anahtar var, metin dolu ve anlamlı. Ayrıca
> `IPHONEOS_DEPLOYMENT_TARGET = 15.0` (`project.pbxproj:253,304,322,345`) —
> ATT'nin gerektirdiği iOS 14+ şartı sağlanıyor.

---

## C) UMP İLE ÇAKIŞMA

**9. UMP ne zaman:** ATT ile **tamamen aynı** fonksiyonda, ATT'den hemen
önce — `ads.js:93-95`:
```
let consentInfo = await admob.requestConsentInfo();
if (!consentInfo.canRequestAds && consentInfo.isConsentFormAvailable) {
  consentInfo = await admob.showConsentForm();
}
```

**10. Sıra: ÖNCE UMP, SONRA ATT.** (`ads.js:93-96` → `ads.js:97-102`.)

**11. Engelliyor olabilir mi:** `showConsentForm()` `await` ediliyor, yani
form kapanmadan ATT satırına geçilmiyor — kod seviyesinde iki modalin **üst
üste binmesi beklenmez**. Ancak native tarafta formun "kapandı" callback'i
ile ekranın gerçekten boşalması arasında bir yarış olup olmadığı bu turda
**ÖLÇÜLEMEDİ** (cihaz gerekir). **BELİRSİZ.**

**12. Google'ın önerdiği sıra:** Bu ortamdan doğrulanamadı (canlı
dokümantasyona erişilmedi, tahmin yazılmıyor). **BELİRSİZ — doğrulanmalı.**

> Not: Türkiye GDPR bölgesinde olmadığı için `canRequestAds` büyük olasılıkla
> ilk çağrıda `true` döner ve `showConsentForm()` hiç çalışmaz — bu durumda
> C maddesi pratikte devre dışı kalır. Bu **çıkarım**, ölçülmedi.

---

## D) ZAMANLAMA

**13. Uygulama "active" değilken çağrılma riski: YOK — bu hipotez ELENDİ.**
Çağrı zinciri bir `click` handler'ından başlıyor (`app.js:10357`), yani
kullanıcı ekrana dokunduğu an uygulama kesinlikle ön planda ve
`UIApplicationStateActive`. Açılışta hiçbir ATT çağrısı olmadığı için (A2)
"uygulama açılmadan çağrılıyor" senaryosu bu kod tabanında **oluşamaz.**

**14. AppDelegate/SceneDelegate:** ATT'nin native yaşam döngüsünde **hiçbir
kancası yok** — `grep` ile `ios/App/App/` altında `ATTrackingManager` sadece
eklenti içinde bulundu, uygulamanın kendi Swift dosyalarında (AppDelegate,
SceneDelegate, MainViewController, AudioSessionPlugin) ATT'ye dair **tek satır
kod yok.**

**15. WebView yüklenmesiyle çakışma: YOK** — çağrı WebView tamamen
yüklendikten ve kullanıcı 5 soru oynadıktan sonra tetikleniyor.

---

## E) NATIVE KÖPRÜ

**16. Çağrı JS'ten yapılıyor** (native tarafta uygulamaya ait ATT kodu yok —
bkz. D14).

**17. Eklenti:** `@capacitor-community/admob` — `window.Capacitor.Plugins.AdMob`
üzerinden (`ads.js:61-63`).

**18. Kayıtlı mı: EVET.**
- SPM paketi: `ios/App/CapApp-SPM/Package.swift:15` —
  `.package(name: "CapacitorCommunityAdmob", path: "../../../node_modules/@capacitor-community/admob")`
- Metot köprü sözleşmesinde beyan edilmiş:
  `AdMobPlugin.swift:17` — `CAPPluginMethod(name: "requestTrackingAuthorization", returnType: CAPPluginReturnPromise)`

> AudioSessionPlugin'de yaşanan "pluginMethods'a eklemeyi unutma" tuzağı
> **burada YOK** — metot beyan edilmiş.

**19. Çağrı native'e ulaşıyor mu? — Ulaşıyor, AMA CİDDİ BİR ŞÜPHE VAR:**

`AdMobPlugin.swift:62-74`:
```swift
@objc func requestTrackingAuthorization(_ call: CAPPluginCall) {
    if #available(iOS 14, *) {
        #if canImport(AppTrackingTransparency)
        ATTrackingManager.requestTrackingAuthorization(completionHandler: { _ in
            call.resolve([:])
        })
        ...
```

**Bu metot ana thread'e geçmiyor.** Buna karşılık **aynı dosyadaki**
`trackingAuthorizationStatus` (`AdMobPlugin.swift:188-189`) **geçiyor**:
```swift
@objc func trackingAuthorizationStatus(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
```

Ve Capacitor plugin çağrılarını **arka plan kuyruğunda** koşturuyor:
- `CapacitorBridge.swift:131` — `open private(set) var dispatchQueue = DispatchQueue(label: "bridge")`
- `CapacitorBridge.swift:507` — `dispatchQueue.async { ... }` (plugin metodunun çalıştırıldığı yer)

**Sonuç:** `ATTrackingManager.requestTrackingAuthorization` **arka plan
thread'inden** çağrılıyor; eklentinin kendi kodundaki bu asimetri (biri main'e
geçiyor, diğeri geçmiyor) kasıtlı görünmüyor. UI sunumu gerektiren bir API'nin
arka plan thread'inden çağrılması diyaloğun sessizce gösterilmemesinin bilinen
bir sebebidir. **Ancak bunun bu cihazlarda GERÇEKTEN diyaloğu bastırdığı bu
turda ÇALIŞTIRILARAK KANITLANAMADI** — cihazda Xcode konsoluyla doğrulanmalı.
Eklentinin kendi yorumu ayrıca metodu `DEPRECATED` olarak işaretliyor
(`AdMobPlugin.swift:59-61`).

---

## F) REKLAM SIRASI

**20/21. AdMob SDK, ATT yanıtından ÖNCE başlatılıyor — İHLAL RİSKİ.**

`ads.js:92` → `ensureInitialized()` → `ads.js:73` → `admob.initialize()` →
native `AdMobPlugin.swift:55` → **`MobileAds.shared.start(completionHandler: nil)`**

Bu satır, `ads.js:97-101`'deki ATT çağrısından **önce** çalışıyor. Yani Google
Mobile Ads SDK, kullanıcı izin diyaloğunu görmeden başlatılıyor.

SDK'nın başlatılma anında IDFA'ya erişip erişmediği (SKAdNetwork yapılandırması
`Info.plist:71-74`'te mevcut) bu turda **ÖLÇÜLEMEDİ** — ama sıralama Apple'ın
"izleme verisi toplanmadan önce diyalog" beklentisiyle **ters yönde** ve
reddin ikinci bir gerekçesine dönüşebilir.

---

## KÖK SEBEP

**Birincil (yüksek güven, kanıtlı): ATT diyaloğu, incelemecinin ulaşamayacağı
kadar derin ve İSTEĞE BAĞLI bir etkileşimin arkasına gizlenmiş.**

Diyalog uygulama açılışında, ilk oyunda, ayarlarda ya da herhangi bir pasif
akışta **hiç** tetiklenmiyor. Tek tetikleyici: 5 soru oynayıp paywall'ı
açtıktan sonra **"reklam izle" butonuna dokunmak** (A3/A4). Reklam izlemeyi
seçmeyen bir kullanıcı — ve incelemeci — diyaloğu **hiçbir zaman görmez**.
Bu, Apple'ın "unable to locate" ifadesiyle birebir örtüşüyor.

Bu davranış bir hata değil, **kasıtlı bir tasarım kararı**: `Info.plist:75-78`
ve `ads.js:77-79` yorumları bunu "Apple'ın önerdiği bağlamsal yaklaşım" diye
açıkça gerekçelendiriyor. Niyet doğru, ama incelemeci için keşfedilebilir
değil.

**İkincil (şüpheli, cihazda doğrulanmadı): arka plan thread'inden ATT çağrısı**
(E19). Birincil sebep düzeltilse bile bu ayakta kalırsa diyalog yine
çıkmayabilir.

**Üçüncül (uyum riski): AdMob SDK'sı ATT yanıtından önce başlatılıyor** (F20).

**Elenen hipotezler (kanıtla):**
- ~~Kod hiç çağırmıyor~~ → çağırıyor (`ads.js:100`).
- ~~Info.plist eksik/boş~~ → var ve dolu (`Info.plist:79-80`).
- ~~Native köprü kopuk~~ → SPM'de kayıtlı, `pluginMethods`'ta beyan edilmiş.
- ~~Enum/string uyuşmazlığı~~ → `"notDetermined"` birebir eşleşiyor.
- ~~Uygulama "active" değilken çağrılıyor~~ → çağrı bir click handler'ından, ön planda.
- ~~Bayat `cap sync` kopyası~~ → `www/` ile `ios/.../public/` birebir aynı.

---

## DÜZELTME YOLU / RİSK / İŞ YÜKÜ

> Bu bölüm **seçenek sunar, karar vermez** — hangisinin uygulanacağı ürün
> kararıdır (CLAUDE.md: "Ürün kararı verme").

**Y1 — ATT'yi keşfedilebilir bir ana taşı (birincil sebebi kapatır).**
Diyaloğu, incelemecinin kaçınamayacağı bir noktaya bağlamak: ör. ilk açılışta
(onboarding/kalibrasyon sonrası) ya da ana menünün ilk gösteriminde bir kez.
*Risk:* mevcut "bağlamsal ATT" tasarım kararı bilinçli olarak terk edilmiş
olur; erken sorulan ATT'de izin oranı genelde düşer (bu proje için
ÖLÇÜLMEDİ). *İş yükü:* küçük — tetikleyici noktanın değişmesi; ATT çağrısının
UMP'den ayrılıp kendi başına çağrılabilir hale gelmesi gerekir (`doInitFlow`
şu an ikisini tek pakette tutuyor).

**Y2 — ATT çağrısını ana thread'e taşı (ikincil şüpheyi kapatır).**
Eklenti kodu `node_modules` altında olduğu için doğrudan düzenlenemez;
seçenekler: (a) projenin kendi Swift eklentisine (`AudioSessionPlugin.swift`
deseninde) `DispatchQueue.main.async` ile saran bir ATT metodu eklemek ve
JS'i ona yönlendirmek, (b) upstream'e yama. *Risk:* (a) yeni native metot —
`pluginMethods` dizisine eklemeyi unutma tuzağı (dosyanın kendi 38-43
satırlarındaki uyarı) burada geçerli. *İş yükü:* küçük-orta; **cihazda
doğrulama zorunlu**, bu ortamdan test edilemez.

**Y3 — `MobileAds.shared.start()`'ı ATT yanıtından sonraya al (F20).**
`ads.js:92`'deki `ensureInitialized()` çağrısını ATT bloğundan sonraya taşımak.
*Risk:* `requestConsentInfo()` SDK başlatılmadan çalışır mı — **doğrulanmadı**,
UMP akışının init'e bağımlılığı ölçülmeli. *İş yükü:* küçük, ama sıralama
değişikliği reklam akışının tamamını etkilediği için e2e + cihaz testi ister.

**Hepsi için ortak:** ATT native bir diyalog olduğundan **hiçbiri Playwright
ile doğrulanamaz**; doğrulama ancak temiz kurulumlu gerçek cihazda (ya da
Ayarlar → Gizlilik → İzleme sıfırlanarak) yapılabilir.

---

## ÖLÇÜLEMEYENLER VE NEDEN

| Konu | Sebep |
|---|---|
| Arka plan thread'inin diyaloğu GERÇEKTEN bastırdığı | Cihazda çalıştırma gerekir; bu ortamda Xcode/cihaz yok |
| Google'ın önerdiği UMP↔ATT sırası | Canlı dokümantasyona erişilmedi; tahmin yazılmadı |
| `canRequestAds`'in TR bölgesinde ne döndüğü | Gerçek UMP sunucu yanıtı gerekir |
| `MobileAds.start()`'ın IDFA'ya erişip erişmediği | SDK ikili; kaynak kodu okunamadı |
| UMP formu ile ATT arasında sunum yarışı olup olmadığı | Cihazda gözlem gerekir |
| İncelemecinin uygulamada tam olarak nereye kadar gittiği | Apple bildirmiyor |

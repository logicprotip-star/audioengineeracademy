# MAĞAZA UYUMLULUK DENETİMİ

_14 Ağustos 2026 · Info.plist · AndroidManifest.xml · index.html ·_
_paywall.js · iap.js · ads.js · guide-texts.js · package.json ·_
_capacitor.config.json_

---

# 🔴 CİDDİ — ret sebebi olabilir

## 1. "Yakında" bölümü — Apple 2.1 / 4.2

`index.html`'de ana ekranda **"Yakında"** başlığı altında
kodlanmamış modlar listeleniyor. Kod yorumunda **4 katalog girdisi**
diyor ama katalogda 2 tane var (`hiz-modu`, `hangisi-farkli`).

**Risk:** Apple, henüz var olmayan özellikleri tanıtan ekranları
"placeholder içerik" sayabiliyor. App Store Review Guideline 2.1
kapsamında ret gelebilir — özellikle *"bu uygulama tamamlanmamış
görünüyor"* gerekçesiyle.

**Play tarafı daha gevşek** ama aynı risk küçük ölçüde var.

**Öneri:** 1.0'da bu bölüm gizlensin. Tek satırlık iş. Modlar
gerçekten geldiğinde açılır.

Sen "kalsın" demiştin — kararı bilerek vermen için riski
yazıyorum. Yayına çıktıktan sonra da kaldırılabilir, ama ilk
incelemede risk almamak daha güvenli.

---

## 2. "TASLAK" ibaresi — Apple 2.1

Tonal Balance "i" metninde:

> *"Bu üç hazır hedef eğri şu an TASLAK — gerçek referans
> parçalardan yeniden türetilecek, kesin ölçüm değil."*

Bu **dürüst** ve kullanıcıyı korumak için doğru. Ama inceleyicinin
gözünde *"geliştirici kendisi bu özelliğin bitmediğini söylüyor"*
anlamına gelir.

**Öneri:** Metni yeniden yaz — dürüstlüğü koru, "bitmemiş"
çağrışımını kaldır:

> *"Bu üç hazır eğri genel bir tür referansıdır. En doğru sonuç
> için 'Kendi Referansım' ile beğendiğin bir şarkıyı yükle."*

Aynı bilgiyi veriyor, yarım iş izlenimi vermiyor.

---

## 3. `AD_TEST_MODE = true` — canlıya çıkarsa Apple 3.2.2

`ads.js:31` → `export const AD_TEST_MODE = true;`

Test modunda Google'ın test reklamları gösteriliyor. **İnceleyici
bunu görürse** "test içeriği" olarak değerlendirebilir.

Zaten yayın öncesi `false` yapılacak ama **incelemeye gönderilen
build'de de `false` olmalı** — inceleyici gerçek reklamı görmeli.

⚠️ Kendi reklamına tıklama riski: inceleme sırasında Apple
personeli tıklarsa AdMob geçersiz trafik sayabilir. Bu normal
kabul edilir, endişelenme.

---

# 🟡 ORTA — düzeltilmeli ama ret sebebi değil

## 4. `UIRequiredDeviceCapabilities` = `armv7`

`Info.plist`'te hâlâ **`armv7`** yazıyor. Bu 32-bit mimari,
2017'den beri desteklenmiyor. Modern iOS uygulamaları `arm64`
kullanır.

Apple bunu genelde reddetmiyor ama **doğru olan `arm64`.**
Yanlış değer bazı cihazlarda uygulamanın App Store'da
görünmemesine yol açabilir.

**Öneri:** `armv7` → `arm64`

## 5. iPad yön ayarı — iPhone-only'ye rağmen duruyor

`TARGETED_DEVICE_FAMILY = 1` (iPhone-only) yapıldı ama
`Info.plist`'te hâlâ:

```
UISupportedInterfaceOrientations~ipad
  UIInterfaceOrientationPortrait
  UIInterfaceOrientationPortraitUpsideDown
```

Zararsız ama gereksiz. iPhone-only bir uygulamada iPad yön
anahtarı olmamalı — tutarsızlık.

## 6. `SKAdNetworkItems` sadece 1 kayıt

Sadece AdMob'un kendi kimliği (`cstr6suwn9.skadnetwork`) var.

Mediation kullanmıyorsan doğru. Ama **AdMob mediation olmadan da**
Google'ın önerdiği liste daha uzun. Eksik SKAdNetwork kimliği ret
sebebi değil, sadece attribution kaybı — gelir raporun eksik olur.

**Karar:** mediation yoksa böyle kalabilir.

## 7. `package.json` metadata boş

```
"name": "eq-bu"        ← eski proje adı
"description": ""      ← boş
"author": ""           ← boş
"license": "ISC"       ← varsayılan
"main": "app.js"       ← SİLİNEN ölü dosyayı işaret ediyor
```

Mağazaya gitmiyor ama `main` alanı artık **var olmayan bir
dosyayı** gösteriyor (G200'de silindi). Temizlenmeli.

---

# 🟢 DOĞRU — kontrol edildi, sorun yok

| Konu | Durum |
|---|---|
| **ATT zamanlaması** | ✅ İlk açılışta değil, kullanıcı ilk kez reklam izlemeye karar verdiğinde. Apple'ın önerdiği bağlamsal yaklaşım |
| **ATT açıklama metni** | ✅ Net, Türkçe, ne olduğunu ve izin verilmezse ne olacağını söylüyor |
| **UMP (GDPR) onayı** | ✅ ATT'den önce, doğru sırada |
| **"Satın alımı geri yükle"** | ✅ İKİ yerde var: paywall + Ayarlar. Apple 3.1.1 zorunluluğu karşılanıyor |
| **Yasal bağlantılar** | ✅ Paywall'da gizlilik + kullanım koşulları görünür. Apple'ın satın alma öncesi zorunluluğu |
| **Ödeme açıklaması** | ✅ "Ödeme App Store hesabınızdan tahsil edilir. Tek seferlik satın alma; otomatik yenileme yoktur." Doğru ve zorunlu |
| **Fiyat kaynağı** | ✅ `fetchProPrice()` mağazadan gerçek `priceString` okuyor, `PRO_PRICE = "₺399"` sadece yedek. Apple'ın "hardcoded fiyat = ret" kuralına uygun |
| **Ürün tipi** | ✅ Non-Consumable, `inapp` — abonelik değil, doğru |
| **Harici ödeme yönlendirmesi** | ✅ YOK. Apple 3.1.1 ihlali yok |
| **Üçüncü taraf içerik** | ✅ YOK. YouTube/streaming indirme yok |
| **Yasal metin açılışı** | ✅ `target="_blank"` ile sistem tarayıcısında. Uygulama içi tarayıcı yok |
| **Dikey kilit** | ✅ Tutarlı — iOS ve Android'de aynı |
| **Android BILLING izni** | ✅ Var |
| **Android INTERNET izni** | ✅ Var, tek izin — minimum |
| **AdMob App ID** | ✅ İki platformda da tanımlı |
| **Gereksiz izin** | ✅ YOK. Mikrofon, konum, kamera, rehber — hiçbiri istenmiyor |
| **`allowBackup`** | ✅ `true` — Play için sorun değil |
| **E-posta adresi** | ✅ `destek@audioengineeracademy.com`, doğru |

---

# 📋 PLAY STORE — ayrıca gerekecekler

Android'e geçince bunlar sorulacak, şimdiden bil:

| İş | Not |
|---|---|
| **Veri güvenliği formu** | App Privacy'nin karşılığı. AdMob'un topladıkları beyan edilecek — iOS'takiyle aynı 7 veri tipi |
| **Hedef API seviyesi** | Play her yıl yükseltiyor. Capacitor 8 güncel, sorun çıkmaz ama derleme öncesi kontrol et |
| **Reklam kimliği izni** | Android 13+ için `com.google.android.gms.permission.AD_ID` gerekiyor. **Manifest'te YOK** — AdMob eklentisi kendi manifest'inden ekliyor olabilir, derlemede kontrol et |
| **İçerik derecelendirme anketi** | Play'in kendi formu, IARC |
| **Uygulama erişimi** | Pro özellikleri incelemeci için nasıl açılacak — test hesabı ya da açıklama gerekiyor |

⚠️ **AD_ID izni** en olası takılma noktası. Reklam gösteren
uygulamalar bunu beyan etmek zorunda.

---

# ⚠️ EN BÜYÜK RİSK — satın alma incelenemez

Bu bir dosya sorunu değil, süreç sorunu:

**Paid Apps Agreement imzalanmadan inceleyici Pro'yu satın
alamaz.** Apple bu durumda tipik olarak şu retle döner:

> *"We were unable to review your in-app purchase because it is
> not available for review."*

**Yani sözleşme gelmeden incelemeye gönderme.** Pazartesi
imzalanacak, sonra gönder.

---

# 📌 YAPILACAKLAR — öncelik sırası

| # | İş | Süre |
|---|---|---|
| 1 | `AD_TEST_MODE = false` (incelemeye gönderilen build'de) | 1 satır |
| 2 | `armv7` → `arm64` | 1 satır |
| 3 | "TASLAK" metnini yeniden yaz | 1 metin |
| 4 | **"Yakında" bölümü kararı** — kalsın mı, gizlensin mi | karar |
| 5 | `package.json` temizliği (`main`, `name`, `description`) | 3 satır |
| 6 | iPad yön anahtarını kaldır | 3 satır |
| 7 | Android: AD_ID izni kontrolü | Android turunda |

1-2-5-6 tek prompt'ta gider. 3 ve 4 senin kararın.

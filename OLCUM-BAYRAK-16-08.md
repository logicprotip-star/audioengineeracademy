# OLCUM-BAYRAK-16-08 — Yayın Bayrağı / Geliştirici Modu Ölçümü

_Kapsam: SADECE ÖLÇÜM. Kod YAZILMADI, commit atılmadı. `build-flags.js`,
`ads.js`, `storage.js`, `app.js`'in ilgili bölümleri (7-tık mekanizması,
`isUserPro`, `devFlags`), `test/build-flags.test.mjs`,
`node_modules/@capgo/native-purchases` tip tanımları, `ios/App/App/
AppDelegate.swift` TAM okundu/grep edildi. **Not:** görevde "G250'de
kuruldu" denmişti — kod TARANDI, gerçek G-numarası **G239**'dur
(`build-flags.js:1`, `test/build-flags.test.mjs:1` — ikisi de AÇIKÇA
"G239" yazıyor); rapor boyunca doğru numara kullanıldı, karışıklığa
düşülmesin diye baştan belirtiliyor._

---

## 1) G239'UN YAYIN BAYRAĞI NASIL KURULMUŞ

**Adı ve konumu:** `DEV_MODE`, `www/js/core/build-flags.js:27` — TEK
satırlık bir modül:
```js
export const DEV_MODE = true;
```

**Kaç durumu var — 2 (boolean), ARADA DEĞER YOK:**
- `true` — repo'nun **HER ZAMAN committed hâli** (geliştirme VE
  TestFlight AYNI, aralarında ayrım YOK — bkz. madde 3).
- `false` — SADECE App Store Archive'ından hemen önce, elle, GEÇİCİ.

**Nasıl değiştiriliyor — TAMAMEN ELLE, otomatik bir mekanizma YOK:**
Kod yorumu (`build-flags.js:15-18`) AÇIKÇA tarif ediyor: *"SADECE App
Store Archive'ından HEMEN ÖNCE, TEK satır elle flip edilir, Archive
alınır, HEMEN geri true'ya alınır — bu hâl repo'ya KOMMİT EDİLMEZ."*
Otomatik bir build-config/env-var mekanizması **YOK** (bkz. madde 4).

**Korunma mekanizması — 2 test "tripwire"ı (kod-seviyesi, belge DEĞİL):**
1. `test/build-flags.test.mjs` — `DEV_MODE === true` olduğunu
   DOĞRUDAN zorluyor, `false` commit edilirse `npm test` EN BAŞTA
   kırmızı çıkar.
2. `e2e/layout-geometry.spec.mjs` — `window.__aeaShowSessionEndForTest`
   hook'unun VARLIĞINI zorluyor; bu hook `DEV_MODE=false`'ta hiç
   KURULMUYOR (bkz. madde 2/app.js:11629), dolayısıyla bu test de
   kırmızı çıkar.

**AD_TEST_MODE ona bağlandı mı — EVET, GERÇEKTEN, doğrulandı iki
yerden:**
- Kod: `www/js/core/ads.js:21` — `export const AD_TEST_MODE = DEV_MODE;`
  (ayrı bir sabit DEĞİL, DOĞRUDAN aynı değeri taşıyan bir referans).
- Test: `test/build-flags.test.mjs`'in KENDİSİ `assert.equal(AD_TEST_MODE,
  DEV_MODE, ...)` ile bunu AYRICA zorluyor — ikisi birbirinden
  SAPARSA test kırmızı çıkar.

**Şu an hangi konumda — `true` (repo'nun committed hâli, doğrulandı,
`git status` bu dosyada değişiklik GÖSTERMİYOR).**

**DEV_MODE `false` iken TAM OLARAK ne susuyor — 3 gate noktası, HEPSİ
`grep` ile bulundu, BAŞKA yer YOK:**
1. `audioDiagLog()` (`app.js:5063-5066`) — `[audio-diag]` tanı logları.
2. `uploadDiagLog()` (`app.js:6197-6200`) — `[upload-diag]` tanı logları.
3. `if (DEV_MODE) { window.__tonalDebugState = ...; window.__aeaShowSessionEndForTest
   = ...; window.__tonalRefVerify = ...; }` (`app.js:11629` civarı) —
   3 test kancası, `DEV_MODE=false`'ta HİÇ TANIMLANMIYOR (Safari Web
   Inspector'la bağlanan biri bile bunları GÖREMEZ, kod yorumu bunu
   AÇIKÇA amaçlıyor).

---

## 2) GELİŞTİRİCİ MODU NASIL ÇALIŞIYOR

**7 tık mekanizması — `app.js:8488-8504`, `els.versionRow` (Ayarlar/
Hakkında'daki sürüm satırı) click listener'ı:**
```js
let versionTapCount = 0;
let versionTapTimer = null;
if (els.versionRow) els.versionRow.addEventListener("click", () => {
  versionTapCount++;
  clearTimeout(versionTapTimer);
  versionTapTimer = setTimeout(() => { versionTapCount = 0; }, 1200);
  if (versionTapCount >= 7) {
    versionTapCount = 0;
    devFlags.unlocked = true;
    storage.saveDevFlags(devFlags);
    syncDevUI();
    toast("🛠️ Geliştirici modu açıldı", "...");
  }
});
```
1200ms içinde 7 dokunuş gerekiyor (sayaç zaman aşımıyla sıfırlanıyor).

**⚠️ EN ÖNEMLİ BULGU — bu mekanizma `DEV_MODE`'a HİÇ BAĞLI DEĞİL,
BAĞIMSIZ ÇALIŞIYOR:** `grep -n "DEV_MODE" www/js/app.js` yukarıdaki 3
gate noktası (madde 1) DIŞINDA hiçbir sonuç vermiyor —
`versionTapCount`/`devFlags`/`devGroup`/`devProSwitch`/`devModeOffBtn`
kodunun HİÇBİR YERİNDE `if (DEV_MODE)` gibi bir koşul YOK. **Yani
bugün `DEV_MODE` `false`'a çevrilip bir App Store Archive alınsa BİLE,
7-tık gizli menüsü O BUILD'DE DE AYNEN erişilebilir kalır** —
görevin asıl sorduğu şey (mevcut bayrak geliştirici modunu da
yönetiyor mu) için doğrudan, ölçülmüş cevap: **HAYIR, şu an
yönetmiyor.**

**Açılınca ne oluyor — İKİ AYRI, birbirini TAKİP EDEN bayrak:**
1. `devFlags.unlocked = true` — SADECE gizli geliştirici bölümünün
   (`#devGroup`) GÖRÜNÜRLÜĞÜNÜ açar (`app.js:8459`:
   `els.devGroup.classList.toggle("hidden", !devFlags.unlocked)`).
   **Bu TEK BAŞINA Pro VERMEZ.**
2. O bölüm içindeki AYRI bir anahtar (`devProSwitch`, `app.js:8505-8509`)
   elle tıklanınca `devFlags.simulatePro = !devFlags.simulatePro` olur
   — **Pro'yu VEREN gerçek bayrak BU.**

**`isUserPro()` (`app.js:1215-1218`):**
```js
function isUserPro() {
  const realPro = purchaseState.proPurchased;
  return realPro || devFlags.simulatePro;
}
```
`simulatePro=true` iken `isUserPro()` `true` DÖNÜYOR — **ayrı bir
bayrak DEĞİL, gerçek satın alma bayrağıyla AYNI OR ifadesinin bir
parçası.** Gerçek satın almanın YERİNE değil ÜZERİNE ekleniyor (kod
yorumu, `storage.js:406-410`, PAYWALL.md'nin Parça 3 tarifiyle AYNI
— DURUM.md G168 kaydında da BİREBİR bu şekilde belgelenmiş).

**Kalıcı mı — EVET, `localStorage`'da, `prefs`'ten AYRI bir anahtarda:**
`storage.js:383-401` — `DEV_KEY` (localStorage anahtarı
`eqEarTrainerProXDev`, `storage.js`'te tanımlı) altında
`{unlocked, simulatePro}` saklanıyor. Kod yorumu bunun BİLİNÇLİ bir
ayrım olduğunu açıklıyor: *"prefs.js'i temizle/dışa aktar gibi bir
işlem eklenirse geliştirici bayrakları yanlışlıkla kullanıcı
tercihiymiş gibi görünmesin."* Sayfa yenilense, uygulama kapatılıp
açılsa BİLE KALICI (oturumla SINIRLI DEĞİL).

**Kapatma yolu var mı — EVET, `devModeOffBtn` (`app.js:8510-8519`):**
`devFlags.unlocked=false` VE `devFlags.simulatePro=false` İKİSİNİ
BİRDEN sıfırlıyor (yorum: *"kapalı durum yarı-Pro bir state
bırakmasın"*) — ama bu SADECE gizli menü İÇİNDEN, kullanıcı KENDİ
tıklarsa çalışır, dışarıdan/otomatik bir mekanizma YOK.

**Pro'nun HANGİ özelliklerini açıyor — HEPSİNİ, doğrulandı:**
`grep -c "isUserPro()" www/js/app.js` → **68 çağrı yeri** — `isUserPro()`
uygulamanın TEK, TÜM Pro-kilit kararlarında kullandığı ORTAK fonksiyon
(Referans Filtreleri, Tonal Balance, sınav geçişi, Pro modlar, vb).
`simulatePro=true` bu 68 noktanın HEPSİNİ AYNI ANDA açıyor — **kısmi/
kademeli bir Pro simülasyonu YOK, ya HEPSİ ya HİÇBİRİ.**

---

## 3) ÜÇ DURUMLU BAYRAK MÜMKÜN MÜ

**İhtiyaç hatırlatması:** geliştirme (her şey açık) · TestFlight
(geliştirici modu açık, tanı logları açık) · App Store (hepsi kapalı).

**Mevcut bayrak buna genişletilebilir mi — MİMARİ OLARAK EVET, ama
BUGÜN İKİ AYRI DEĞİŞİKLİK GEREKTİRİYOR (kod yazılmadı, sadece
ölçüldü):**
1. `DEV_MODE` (boolean) yerine 3 değerli bir sabit (ör. `BUILD_TARGET
   = "dev" | "testflight" | "appstore"`) — TEK dosyada (`build-flags.js`)
   tanımlı olduğu için bu değişikliğin KENDİSİ küçük/izole (madde
   1'deki gibi TEK satır elle flip deseni AYNEN korunabilir, sadece
   3 seçenekten biri yazılır).
2. **Asıl iş bu DEĞİL — asıl iş, ŞU AN HİÇBİR YERDE YAPILMAYAN bir
   şeyi YAPMAK: 7-tık mekanizmasını/`devGroup`'u YENİ bayrağa
   BAĞLAMAK.** Madde 2'nin bulduğu gibi bugün bu bağlantı YOK — 3
   durumlu bir bayrak KURULSA bile, `versionRow` listener'ına
   `if (BUILD_TARGET === "appstore") return;` gibi YENİ bir koşul
   EKLENMEDİĞİ sürece davranış DEĞİŞMEZ. Bu, mevcut TEK-satır-flip
   deseninin ÖTESİNDE, birden fazla dosyada (`app.js`'in 7-tık
   handler'ı + `devGroup` render'ı) DEĞİŞİKLİK gerektiren bir kod işi
   — bu turun kapsamı DIŞINDA (task: "Kod yazma").

**Yoksa ayrı bir bayrak mı gerekir — HAYIR, AYRI bir bayrağa GEREK
YOK, TEK bayrağın DEĞER KÜMESİ genişletilmesi YETERLİ:** `DEV_MODE`
zaten TEK bir "hangi build" sorusuna cevap veriyor, `AD_TEST_MODE` ONA
TÜRÜYOR (madde 1) — aynı deseni koruyup 2→3 değerli yapmak, G239'un
KENDİ amacıyla (yayında AYNI mantıkla yönetilen "başka HİÇBİR elle-
çevir sabiti kalmasın" prensibi, `build-flags.js:1-8`) TUTARLI. İKİNCİ,
BAĞIMSIZ bir bayrak eklemek bu prensibi BOZAR — G239'un kendi
gerekçesi ("iki ayrı elle-değiştirilen bayrağın... unutma riskini
AYRI AYRI taşıması yerine TEK bir yerden yönetiliyor") DOĞRUDAN bunun
TERSİNİ savunuyor.

**Hangisi daha az riskli — TEK bayrağı genişletmek, GEREKÇELİ:**
İki bağımsız bayrak (`DEV_MODE` + yeni bir `DEV_MENU_ENABLED` gibi)
olursa, App Store Archive'ından önce İKİ satır flip edilmesi GEREKİR
— G239'un ÖNLEMEYE çalıştığı TAM O riski (kod yorumu: "bugün belgeler
beş kez yanıldı") YENİDEN yaratır. TEK, 3 değerli bir sabit (`"dev"` /
`"testflight"` / `"appstore"`) VE mevcut iki tripwire testinin
(build-flags.test.mjs + layout-geometry.spec.mjs) YENİ değere göre
GÜNCELLENMESİ (ör. `assert.notEqual(BUILD_TARGET, "appstore")` gibi,
"repo'da ASLA appstore committed kalmasın" tripwire'ı) mevcut korumayı
KORUR. **Bu bir ÖNERİ/mimari değerlendirme — kod bu turda YAZILMADI.**

---

## 4) BUILD AYIRIMI OTOMATİKLEŞTİRİLEBİLİR Mİ

**Xcode/native tarafında ŞU AN böyle bir işaret VAR MI — HAYIR,
ELLE KURULMUŞ HİÇBİR ŞEY YOK, doğrulandı:** `ios/App/App/AppDelegate.swift`
(49 satır) TAM okundu — Xcode'un ürettiği STANDART boilerplate, TEK
SATIR özel kod YOK. `ios/App/App/MainViewController.swift`/
`AudioSessionPlugin.swift` DIŞINDA özel Swift dosyası YOK (`find`
ile doğrulandı) — build-tipi/receipt-ortamı okuyan bir native köprü
**BUGÜN YOK.**

**⚠️ ÖNEMLİ BULGU — otomatik ayrım için GEREKLİ altyapı ZATEN
UYGULAMADA VAR ama HİÇ KULLANILMIYOR:** `package.json`'daki
`@capgo/native-purchases` (G168'de gerçek satın alma için ZATEN
entegre edilmiş plugin) kendi tip tanımlarında (`node_modules/@capgo/
native-purchases/dist/esm/definitions.d.ts`) şunu sunuyor:
```ts
getAppTransaction(): Promise<{ appTransaction: AppTransaction }>;
// AppTransaction.environment?: 'Sandbox' | 'Production' | 'Xcode' | null
```
Bu, Apple'ın **StoreKit 2 `AppTransaction.shared`** API'sini sarmalıyor
— dokümantasyona göre (plugin'in KENDİ yorumu, `@since 7.16.0`,
`@platform ios Present (iOS 16+)`) bu, KULLANICININ HERHANGİ bir satın
alma YAPMASINA GEREK OLMADAN, **uygulamanın KENDİSİNİN hangi ortamdan
(Sandbox/TestFlight vs. Production/App Store) geldiğini** bildiriyor.
`grep -n "getAppTransaction" www/js/*.js www/js/core/*.js` → **SIFIR
sonuç — bu metod kodda HİÇ ÇAĞRILMIYOR, tamamen KULLANILMAMIŞ.**

**⚠️ BELİRSİZ (bu ortamda doğrulanamaz, Apple'ın KENDİ dokümantasyonuna
dayanan, GENEL/citable bir bilgi — bu SESSION'da cihazda TEST
EDİLMEDİ):** Apple'ın yayınlanmış StoreKit davranışına göre TestFlight
dağıtımları Sandbox ortamında çalışır, App Store (production) dağıtımları
Production ortamında — bu DOĞRUYSA `getAppTransaction()`'ın döndürdüğü
`environment` alanı TAM ARANAN ayrımı (TestFlight vs App Store) sağlar.
**Bu iddia bu turda GERÇEK bir TestFlight/App Store build'inde
ÇALIŞTIRILARAK doğrulanmadı — sadece plugin'in kendi tip tanımları/
dokümantasyonu okundu.**

**Platform sınırı — Android'de ÇALIŞMIYOR:** Aynı dosyada `environment`
alanının Android satırı: *"Not available (always null)"* — Android'in
TestFlight'a denk bir "Sandbox ortamı" kavramı bu plugin ÜZERİNDEN
YOK. Android'in KENDİ dağıtım-ayrımı (Play Console'un "Dahili test/
Kapalı test" track'leri vb.) bu turda ARAŞTIRILMADI, **BELİRSİZ.**

**Otomatik olabiliyorsa elle bayrak değiştirme riski ortadan kalkar mı
— KISMEN, ve SADECE iOS 16+'ta:** `getAppTransaction()` çağrısı BAŞARILI
olursa (iOS 16+, plugin doğru kurulu), `environment !== 'Production'`
kontrolüyle app AÇILIŞTA "TestFlight mı App Store mu" sorusunu KENDİSİ
cevaplayabilir — elle `DEV_MODE` flip etmeye HİÇ gerek kalmaz. **Ama
bu YENİ kod gerektirir** (mevcut altyapı SADECE bunu MÜMKÜN kılıyor,
BUGÜN hiçbir yerde ÇAĞRILMIYOR) — bu turun kapsamı dışında.

**Değilse (bugünkü hâliyle): elle değiştirme unutulursa ne olur, bunu
yakalayan bir test kurulabilir mi — kısmen ZATEN VAR, ama TAM
KAPSAMIYOR:** Madde 1'deki iki tripwire (`build-flags.test.mjs`,
`layout-geometry.spec.mjs`) SADECE "`DEV_MODE` yanlışlıkla `false`
COMMIT EDİLDİYSE" durumunu yakalıyor (npm test/e2e kırmızı çıkar).
**AMA madde 2'nin bulduğu gibi, `DEV_MODE`'un DOĞRU (`false`) olması
BİLE 7-tık geliştirici-modu backdoor'unu KAPATMIYOR** — yani BUGÜN
HİÇBİR test, "Archive'dan önce DEV_MODE flip edildi AMA geliştirici
modu HÂLÂ açık kalabilir" riskini YAKALAMIYOR, çünkü bu ikisi
BAĞLANTISIZ. Yeni bir test (ör. `DEV_MODE=false` iken `versionRow`
click handler'ının devFlags.unlocked'ı DEĞİŞTİRMEDİĞİNİ doğrulayan)
BUGÜN YOK — bu KOD gerektirir, bu turda YAZILMADI.

---

## 5) RİSK

**Geliştirici modu şu an yayına giderse gelir kaybı ne kadar
gerçekçi:** Kesin bir yüzde/kullanıcı sayısı UYDURULMUYOR (task'ın
kendi kuralı) — ölçülebilen GERÇEK faktörler:
- **Mekanizma İKİ ADIMLI, TEK ADIM DEĞİL:** 7 dokunuş SADECE gizli
  menüyü AÇAR (madde 2), Pro'yu VEREN `simulatePro` anahtarına AYRICA
  elle basmak GEREKİR — rastgele dokunan bir kullanıcının kazara Pro
  açması İKİ AYRI bilinçli eylem gerektirir, TEK dokunuşla OLMAZ.
- **"7 kez dokun" deseni GENEL OLARAK YAYGIN/TANINAN bir konvansiyon:**
  Android'in KENDİ "Geliştirici Seçenekleri"ni AÇAN resmi mekanizması
  (Ayarlar → Telefon Hakkında → Yapı Numarası'na 7 kez dokunma) BİREBİR
  AYNI desen — bu GENEL bilgi (Android'in kendi resmi dokümantasyonu),
  yani "sürüm numarasına 7 kez dokun" fikrini deneyecek teknik meraklı
  bir kullanıcı KİTLESİ zaten var, keşif GÜÇLÜĞÜ bu yüzden DÜŞÜK kabul
  edilebilir (kesin bir sayı/yüzde İDDİA EDİLMİYOR, sadece desenin
  KENDİSİNİN yaygın tanınırlığı belirtiliyor).
- **Kod yorumu bunun BİLİNÇLİ bir ürün kararı olduğunu gösteriyor,
  "unutulmuş" bir açık DEĞİL:** `storage.js:376-378`: *"Yayında da
  kalacak (normal kullanıcı bulamayacağı için sorun değil, GÖREV
  TANIMINDA BÖYLE İSTENDİ)."* Bu, GEÇMİŞTE VERİLMİŞ bir ürün kararı
  olarak koda GEÇMİŞ — bu turun YENİDEN sorguladığı TAM O karar.

**Kodda başka bir "arka kapı" var mı — EVET, BAĞIMSIZ, İKİNCİ bir yol
BULUNDU:** `grep -rn "URLSearchParams\|location\.search\|location\.hash"
www/js/` **SIFIR sonuç** — URL query/hash parametresi ŞEKLİNDE bir
backdoor YOK. Ama `isUserPro()`'nun `realPro` dalı (`purchaseState.
proPurchased`) `storage.js:loadPurchase()` üzerinden DOĞRUDAN
`localStorage`'dan okunuyor, HİÇBİR imza/sunucu doğrulaması OLMADAN —
**teknik bilgisi olan bir kullanıcı Safari Web Inspector/uzak
hata ayıklama ile `localStorage.setItem("eqEarTrainerProXPurchase",
'{"proPurchased":true}')` çalıştırıp Pro'yu KALICI olarak açabilir.**
Bu bir KOD HATASI değil — sunucu tarafı doğrulaması OLMAYAN HERHANGİ
bir client-only freemium uygulamanın YAPISAL özelliği (App Store'un
KENDİSİ de İMZALI bir makbuz vermiyor, bu app'in G168'de kurduğu
"sessiz mülkiyet kontrolü" `checkProOwnership()` bunu SADECE `true`
YÖNÜNDE düzeltiyor — `proPurchased` TEK YÖNLÜ bir bayrak olduğu için
[`storage.js:406-410`, BİLİNÇLİ tasarım], manipüle edilmiş `true`
değerini ASLA geri `false`'a ÇEVİRMEZ). **Bu, 7-tık yolundan BAĞIMSIZ,
DAHA TEKNİK (devtools/uzak hata ayıklama erişimi gerektiren) ama
GERÇEK, HER ZAMAN VAR OLAN ikinci bir "arka kapı."** 7-tık menüsü
gizlense/kaldırılsa BİLE bu yol KAPANMAZ.

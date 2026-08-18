# OLCUM-GUVENLIK-18-08

Güvenlik ve dayanıklılık denetimi. **KOD YAZILMADI, DOSYA DEĞİŞTİRİLMEDİ,
COMMIT ATILMADI** — `git status --short` bu turun SONUNDA sadece önceki
turların OLCUM-*.md dosyalarını gösteriyor.

Uygulama yapısı doğrulandı: Capacitor iOS, sunucu YOK, veritabanı YOK,
kullanıcı hesabı YOK. Tüm veri `localStorage`/`Preferences` (cihazda).
Ödeme StoreKit (`@capgo/native-purchases`), reklam AdMob
(`@capacitor-community/admob`). Sunucu-taraflı maddeler (SQL injection,
auth, session vb.) bu yüzden **uygulanamaz** — atlandı.

**Yöntem notu (F bölümü):** 11 ve 13 numaralı maddeler için "muhtemelen"
yazmamak adına GERÇEK dosyalar üretilip Playwright ile GERÇEK tarayıcıda
uygulamanın KENDİ yükleme/oyun döngüsü çalıştırıldı (geçici script,
`e2e/` altına kopyalanıp test SONRASI silindi — repoda İZ bırakmadı).
Diğer maddeler kod okuması + `npm audit`/`npm ls`/`git log` ile ölçüldü.

---

## A) GİZLİ DEĞERLER

**1. İstemci koduna gömülü API anahtarı/token/gizli değer var mı?**

TEMİZ. `www/js/`, `ios/App/App/` genelinde `api_key|secret|token|password|
private_key|client_secret` deseni tarandı — TEK eşleşme `toolsTonalRenderToken`
(bir render-yarış-durumu sayacı, isminde "token" geçiyor ama bir kimlik
doğrulama belirteci DEĞİL). AdMob reklam birimi ID'leri (`www/js/core/ads.js:27-34`)
ve `GADApplicationIdentifier` (`ios/App/App/Info.plist:66-67`) açık —
görevin kendi istisnası bunları kapsıyor, zaten Google'ın kendi kuralı
gereği istemci kodunda açık olmaları GEREKİYOR. Firebase/Sentry/AWS/Slack
türü anahtar deseni (`AIza...`, `AKIA...`, `xox[baprs]-...`) hiçbir yerde
YOK. Analiz/crash-reporting SDK'sı (Firebase/Crashlytics/vb.) hiç
entegre EDİLMEMİŞ — `ios/App/App.xcodeproj/.../Package.resolved`'daki TEK
4 SPM paketi: Capacitor'ün kendisi, `ion-ios-filesystem`, Google Mobile
Ads, Google UMP. Risk: yok.

**2. Git geçmişine girmiş .env/kimlik bilgisi var mı?**

TEMİZ. `git log --all --diff-filter=A --name-only | grep -i .env` SIFIR
sonuç. Çalışma ağacında da `.env*` dosyası yok. `.gitignore` zaten
`.claude/`/`node_modules/` dışında büyük ses dosyalarını hariç tutuyor
(telif amaçlı, güvenlikle ilgisiz). `git ls-files` ile `.p8/.p12/.pem/
.mobileprovision/.cer/.key` uzantılı hiçbir dosya TAKİPLİ değil. Risk: yok.

---

## B) LOGLAR

**3. Loglara yazılan kişisel veri var mı?**

🟡 **BULGU — dosya:app.js:6801.** `console.log("[filepicker] dosya
seçildi:", picked.name, "| tip:", picked.mimeType, ..., "KB")` — kullanıcının
seçtiği dosyanın adını/MIME tipini/boyutunu **KOŞULSUZ** (DEV_MODE
kontrolü YOK) konsola yazıyor. Bu satır, projenin KENDİ `uploadDiagLog()`/
`audioDiagLog()` sarmalayıcı deseninin (G239, `if (!DEV_MODE) return;`)
**DIŞINDA** — ham, sarmalanmamış bir `console.log`. Ne yanlış: kullanıcının
seçtiği ses dosyasının adı (kişisel içerik taşıyabilir) yayın build'inde
bile Safari/Xcode konsoluna yazılıyor. Risk: **düşük** (sadece cihaza
fiziksel/USB debug erişimi olan biri görebilir, ağa gitmiyor — A2'de
doğrulandığı gibi hiçbir crash-reporting/analytics SDK'sı konsolu
uzağa iletmiyor). Önerilen düzeltme: bu satırı da `uploadDiagLog()`
sarmalayıcısına taşı (DEV_MODE kontrolü ekle).

🟡 **BULGU — dosya:app.js:6779.** `console.log("[filepicker-diag] 4)
pickFiles() DÖNDÜ...", JSON.stringify(result))` — FilePicker plugin'inin
HAM sonucunu (`name`/`path`/`mimeType`/`size`/`duration` alanları,
`node_modules/@capawesome/capacitor-file-picker` tip tanımıyla
DOĞRULANDI) koşulsuz basıyor. `readData:true` VERİLMEDİĞİ için taban64
ham ses verisi (`data` alanı) YOK — sadece metadata + cihaz-içi sandbox
yolu (`path`, iOS'ta kullanıcı adı içermez). Risk: **düşük**. Önerilen
düzeltme: aynı, `uploadDiagLog()`'a taşı.

🟡 **BULGU — dosya:app.js:10237.** `console.log(...ad="${entry.name}"`)`
— "Kendi Referansım"/Araçlar'a kaydedilen dosyanın adını koşulsuz
logluyor (item C'nin kendi bahsettiği "Kendi Referansım kayıt adları"
sınıfı). Aynı desen, aynı risk: düşük.

🟡 **BULGU — dosya:app.js:9258.** Test butonunun (`filePickerTestBtn`)
kendi handler'ı `file.name`'i koşulsuz logluyor — düşük risk (bu buton
muhtemelen sadece geliştirme/tanı amaçlı ama koşulsuz).

**Not:** Bu 4 bulgu, kullanıcının ZATEN kayıtlı listelediği "23 koşulsuz
console.log" maddesinin BİR ALT KÜMESİ — sayı zaten biliniyordu (bu
turda ölçülen tam sayı: **22**, muhtemelen bir önceki tur bir tanesini
düzeltti/kod kaydı). Buradaki YENİ bilgi: bu 22'den **4 tanesi kişisel
veri (dosya adı) taşıyor**, geri kalan 18'i (`[filepicker-diag]`/
`[guide-i-diag]`/`[scroll-diag]` UI-akış izleri) kişisel veri
TAŞIMIYOR — sadece buton tıklama/ekran durumu metni.

**4. Hata mesajları kullanıcıya iç detay sızdırıyor mu?**

🟢 **BÜYÜK ÇOĞUNLUKLA TEMİZ.** `toast(...)` çağrılarının neredeyse
TAMAMI elle yazılmış, kullanıcı-dostu Türkçe metin kullanıyor — ham
`err.message`/`.stack` UI'a YANSITILMIYOR.

🟡 **TEK İSTİSNA — dosya:app.js:6818.** `toast("Yükleme hatası",
\`Dosya seçilemedi: ${err.message}\`)` — FilePicker native plugin'inin
ham `err.message`'ını doğrudan kullanıcıya gösteriyor. Risk: **düşük**
(native plugin hata mesajları genelde OS'un kendi insan-okunur metni,
dosya yolu/yığın izi İÇERMESİ BEKLENMEZ ama JS'ten DOĞRULANAMAZ —
**emin değilim**, native tarafın tam hata formatı ölçülmedi).

Konsola yazılan `console.error(...)` çağrıları (42 adet) genelde
`err.name`/`err.message`/tam `err` nesnesini (yığın izi dahil)
basıyor — ör. `[upload] decodeAudioData hatası: EncodingError...`,
gerçek testte (aşağı bkz. madde 11) tam dosya yolu + satır numarası
içeren bir yığın izi konsola YAZILDIĞI DOĞRUDAN GÖZLENDİ. Bu SADECE
konsola gidiyor, kullanıcıya DEĞİL — B.3'teki AYNI düşük-risk
gerekçesiyle.

---

## C) KULLANICI İÇERİĞİ

**5. Kullanıcı içeriği HTML'e kaçırılmadan basılıyor mu?**

🟢 **TEMİZ, iyi bir desen zaten yerinde.** 125 `innerHTML=` kullanımı
tarandı — büyük çoğunluğu SABİT (uygulamanın kendi) şablon dizesi/SVG,
kullanıcı girdisi TAŞIMIYOR. Kullanıcı-kontrollü TEK metin sınıfı
(yüklenen dosya adı / "Kendi Referansım" adı — uygulamada BAŞKA hiçbir
serbest-metin `<input>` YOK, `prompt()` de YOK, `git grep` ile
doğrulandı) her `innerHTML` yoluna girdiği HER yerde `escapeHtml()`
(dosya:app.js:9883, `& < > " '` beşinin hepsini kaçırıyor — hem metin
hem öznitelik bağlamı için doğru) ile sarmalanmış: `app.js:10647`
(`f.name`), `10673-10674` (`a.file`/`a.filter`), `10689` (`m.file`),
`11674` (`names`), `11750` (`r.name`). Dosya adının `id` gibi ATTRIBUTE
konumuna girdiği yerler (`data-remove="${f.id}"` vb.) uygulamanın KENDİ
üretilmiş `id`'si (`toolsGenerateId()`) — kullanıcı girdisi DEĞİL, risk
yok. Diğer TÜM dosya-adı gösterimleri (`app.js:6864`/`12606`/`13158`/
`13213`/`13241`) zaten `.textContent=` (en güvenli yol) kullanıyor.
Risk: **yok** — bu madde TEMİZ çıktı.

---

## D) BAĞIMLILIKLAR

**6. npm audit — bilinen açığı olan paket var mı?**

🔴 **10 açık bulundu (2 orta, 7 yüksek, 1 kritik)** — AMA `npm ls` ile
izlendiğinde **TAMAMI TEK bir izole devDependency dalına** ait:
`@capacitor/assets@3.0.5` (ikon/splash-screen ÜRETİM aracı, sadece
`npx capacitor-assets generate` çalıştırılınca kullanılır) → kendi
İÇİNE gömülü, ESKİ bir `@capacitor/cli@5.7.8` kopyası (üst düzey/gerçek
build'i yapan `@capacitor/cli@8.4.2`'den TAMAMEN AYRI, o kendi
`tar@7.5.22`'si — GÜVENLİ sürüm, `<=7.5.20` aralığının DIŞINDA).

| Paket | Ciddiyet | Nerede | Düzeltme |
|---|---|---|---|
| `tar` (path traversal, hardlink/symlink) | **kritik** | `@capacitor/assets/…/@capacitor/cli@5.7.8` | `npm audit fix` mevcut |
| `sharp` (libvips CVE'leri) | yüksek | `@capacitor/assets` doğrudan | **düzeltme YOK** |
| `minimatch` (ReDoS) | yüksek | `replace`→`@trapezedev/project` | `npm audit fix` mevcut |
| `brace-expansion` (DoS) | yüksek | `replace`/`@capacitor/cli@5.7.8` | `npm audit fix` mevcut |
| `uuid` (buffer sınır kontrolü) | orta | `xcode`→`@trapezedev/project` | `npm audit fix` mevcut |

**Sevkiyat etkisi:** Bu paketlerin HİÇBİRİ `www/` içine (uygulamanın
GERÇEKTEN çalıştırdığı kod) YA DA native ikili dosyaya GİRMİYOR — SADECE
geliştiricinin kendi makinesinde, ikon üretirken çalışan bir CLI aracının
bağımlılığı, GÜVENİLMEYEN/ağ kaynaklı bir girdi İŞLEMİYOR (sadece
geliştiricinin kendi ikon/splash görselleri). Risk (son kullanıcıya):
**yok**. Risk (geliştirme ortamına, teorik): tar'ın kritik CVSS'i
soyut olarak yüksek ama sömürü yolu (kötü niyetli bir tar arşivinin
işlenmesi) bu araçta hiç TETİKLENMİYOR — **emin değilim** bu riskin
pratikte sıfıra ne kadar yakın olduğu konusunda kesin bir sınır
çizemem, ama saldırı YÜZEYİ (kim, ne zaman, hangi girdiyle tetikler)
YOK denecek kadar dar.

**7. Sabitlenmemiş (^, ~) bağımlılık var mı?**

🟡 **Evet, TÜMÜ.** `package.json`'daki 11 bağımlılığın (9 prod + 2 dev)
HEPSİ `^` (caret) aralığı kullanıyor, hiçbiri tam sabitlenmemiş. Ancak
`package-lock.json` GİT'e TAKİPLİ (`git ls-files` ile doğrulandı) — bu,
`npm ci` ile kurulum yapıldığı sürece TAM sürüm tekrarlanabilirliği
sağlar. **Emin değilim**: geliştiricinin fiili kurulum komutunun
(`npm install` mü `npm ci` mi) hangisi olduğu — CI/CD konfigürasyonu
(`.github/`, herhangi bir `.yml`) YOK, Xcode build fazlarında npm
komutu YOK, süreç TAMAMEN elle/yerel (CLAUDE.md'nin kendi tarif ettiği
`npx cap sync ios` akışıyla tutarlı).

---

## E) APP PRIVACY BEYANI

**8. "Veri toplanmıyor" beyanı kod ile tutarlı mı?**

🔴 **BULGU — çelişki riski.** `www/js/core/ads.js:doInitFlow()`
(satır 84-107) UMP (Google'ın rıza SDK'sı) onay formunu VE iOS ATT
iznini TAM AKIŞLA çağırıyor (`requestConsentInfo`→`showConsentForm`→
`trackingAuthorizationStatus`→`requestTrackingAuthorization`), hiçbir
yerde `requestConfiguration`/NPA (non-personalized-ads) ZORLAMASI YOK
(`grep` ile doğrulandı — sıfır eşleşme). Bu, kullanıcı rıza VERDİĞİNDE
AdMob'un **kişiselleştirilmiş** reklam gösterebileceği ve bunun için
Google'ın kendi SDK'sının reklam/tanımlayıcı verisi TOPLAYABİLECEĞİ
anlamına gelir — bu, App Store Connect'te "veri toplanmıyor"
(Data Not Collected) gibi KOŞULSUZ bir beyanla **teknik olarak
tutarsız** olabilir (Apple'ın Gizlilik Nutrition Label'ı, uygulamanın
kullandığı 3. parti SDK'ların [AdMob dahil] topladığı veriyi de
kapsar — Google'ın kendi AdMob dokümantasyonu, kişiselleştirilmemiş
modda bile en az cihaz/uygulama teşhis verisi topladığını belirtir).
**Emin değilim**: Apple'ın TAM olarak hangi durumda "veri toplanmıyor"
beyanına izin verdiği (bölgeye/rızaya göre koşullu beyan seçenekleri
olabilir, App Store Connect formunun kendisini görmedim) — ama KODUN
DAVRANIŞI (tam UMP+ATT akışı) ile "toplanmıyor" beyanı arasındaki
gerilim NESNEL bir gözlem. Risk: **yüksek** (yanlış beyan, App Store
politika ihlali/ret riski taşır). Önerilen düzeltme: App Store
Connect'teki gerçek beyan metnini AdMob'un resmi "App Privacy
Beyanı Doldurma Rehberi"yle karşılaştır, gerekirse "Identifiers"/
"Usage Data" kategorilerini ekle YA DA rıza-verilmeyen tüm
kullanıcılar için NPA zorla.

Alt bulgular (aynı maddenin diğer sorularının cevabı):
- **Ağa giden çağrı:** JS tarafında SIFIR (sadece 2 `fetch`/`XMLHttpRequest`
  var, ikisi de YEREL dosya erişimi — `app.js:6794` seçilen dosyayı
  `convertFileSrc` ile okuyor, `audio-engine.js:719` bundle'daki örnek
  sesleri okuyor. Ağa giden TEK trafik: AdMob/UMP native SDK'sının
  KENDİ iç davranışı, JS kodu tarafından TETİKLENMİYOR/GÖRÜLMÜYOR).
- **Cihaz kimliği:** JS tarafında HİÇ okunmuyor (`identifierForVendor`/
  `IDFA`/`IDFV`/`@capacitor/device` deseni SIFIR eşleşme, hem JS hem
  native Swift dosyalarında). AdMob'un KENDİ native SDK'sı IDFA
  okuyabilir (ATT izniyle) ama bu uygulamanın kodu tarafından
  TETİKLENMİYOR, üçüncü parti SDK davranışı.

**9. ATT izni doğru zamanda mı isteniyor?**

🟢 **TEMİZ.** `ads.js:doInitFlow()` — ATT/UMP akışı SADECE kullanıcı
ilk kez reklam izlemeye karar verdiğinde (`ensureAdMobReady()`, ilk
`watchRewardedAd()`/`showPrivacyOptions()` çağrısında) tetikleniyor,
uygulama AÇILIŞINDA DEĞİL. Bu, Apple'ın önerdiği "bağlamsal" zamanlama
ile UYUMLU. Reklam hiç izlemeyen bir kullanıcı bu izin isteğini HİÇ
GÖRMEZ.

**10. SKAdNetwork kayıtları eksik mi?**

🟡 **BULGU.** `ios/App/App/Info.plist`'te SADECE **1** `SKAdNetworkIdentifier`
kaydı var (`cstr6suwn9.skadnetwork`, Google AdMob'un kendi ağı). Kodun
kendi yorumu (satır 61-65) bunu "mediation İSTENMEDİ" kararına
bağlıyor. **Emin değilim** bu tek kaydın AdMob'un GÜNCEL minimum
gereksinimini karşılayıp karşılamadığı — Google'ın kendi entegrasyon
dokümantasyonu genellikle daha uzun (50+) bir SKAdNetworkItems listesi
önerir (AdMob'un KENDİ talep ağı, "mediation" kurulmasa bile, birden
fazla reklam veren üzerinden hizmet verebilir). Risk: **orta** —
en kötü ihtimalle bazı iOS attribution/ölçüm senaryolarında eksik
kayıt nedeniyle daha düşük doldurma oranı/attribution kaybı (ÇÖKME
riski YOK, sadece reklam gelirini etkileyebilecek bir yapılandırma
sorunu). Önerilen düzeltme: Google'ın AdMob iOS SKAdNetwork kurulum
sayfasındaki GÜNCEL tam listeyle karşılaştır.

---

## F) DAYANIKLILIK

**11. BOZUK DOSYA — 5 senaryo GERÇEK dosyalarla, GERÇEK tarayıcıda test edildi**

Yöntem: Node ile 5 sentetik WAV + 1 tam-rastgele "sahte wav" üretildi,
Playwright ile uygulamanın KENDİ Araçlar→Dosyalarım yükleme akışından
(`#toolsFileInput` → `toolsAddFile()` → `uploadManager.loadFile()`)
geçirildi, konsol/sayfa hataları + sonuç toast'ı + kütüphaneye eklenip
eklenmediği gözlendi.

| Senaryo | Sonuç | Detay |
|---|---|---|
| 0 saniyelik (44 bayt header, 0 veri çerçevesi) | 🟢 **Temiz red** | `decodeAudioData` EncodingError → elle WAV ayrıştırıcı "WAV data chunk'ı boş" hatasıyla YAKALIYOR → kullanıcıya "Bu dosya açılamadı" toast'ı. Çökme YOK. |
| Sessizlik (1sn, tüm örnekler 0) | 🟢 **Sorunsuz kabul** | Normal dosya gibi işlendi, kütüphaneye eklendi. Beklenen davranış (sessizlik geçerli ses). |
| 192 kHz örnekleme hızı | 🟢 **Sorunsuz kabul** | Decoder sorunsuz açtı, hata yok. |
| 8 kanal | 🟢 **Sorunsuz kabul** | Decoder sorunsuz açtı, hata yok. |
| Bozuk/yarım (header 5sn vaat ediyor, dosya ~100 bayt veriden sonra kesik) | 🟡 **BULGU — sessiz veri kaybı** | ÇÖKMEDİ, hata da VERMEDİ — `decodeAudioData` eldeki kısmi veriyi kabul etti, dosya "0:00" süre/1 KB olarak kütüphaneye SESSİZCE eklendi. Kullanıcı dosyanın gerçekte KIRPILMIŞ/bozuk olduğunu ASLA öğrenmiyor, sadece garip bir "0 saniyelik" girdi görüyor. Risk: **düşük** (çökme yok, sadece yanıltıcı/eksik veri). |
| Tamamen bozuk (`.wav` uzantılı ama RIFF header'ı bile yok, rastgele bayt) | 🟢 **Temiz red** | `decodeAudioData` EncodingError, RIFF imzası da yok → doğrudan genel "Bu dosya açılamadı" hatası. Çökme YOK. |

**Genel sonuç: 6/6 senaryoda ÇÖKME YOK.** `validateAudioFile`/
`validateAudioDuration` ikilisinde MIN süre/sessizlik/kanal-sayısı/
örnekleme-hızı kontrolü YOK (SADECE MAX süre — 7 dk — ve MAX boyut —
100 MB — kontrolü var, `upload.js:124-193`) ama decode katmanının
KENDİSİ (native `decodeAudioData` + elle yazılmış WAV yedek ayrıştırıcı)
tüm bozukluk türlerini ya sorunsuz açıyor ya da GRACEFUL biçimde
reddediyor. Konsola (KULLANICIYA DEĞİL) yığın izi + dosya yolu
yazıldığı GÖZLENDİ (B.4'ün somut kanıtı).

**12. DEPOLAMA DOLARSA**

🟢 **TEMİZ, iyi tasarlanmış.** `storage.js:trySave()` (G229 düzeltmesi)
TÜM 15 `save*()` fonksiyonunun ORTAK, try/catch'li tek yazma yolu —
`QuotaExceededError` dahil HER hatayı yakalar, `false` döner, ASLA
fırlatmaz. **En kritik yol (satın alma) DOĞRULANDI:** `grantRealPro()`
(app.js:9661) dönüş değerini KONTROL EDİYOR — yazma başarısız olursa
`purchaseState.proPurchased` GERİ ALINIYOR ve kullanıcıya AÇIKÇA
"Satın alma tamamlandı ama kaydedilemedi — Cihazda yer açıp tekrar
dene, ya da az sonra 'Satın alımı geri yükle'ye bas" mesajı gösteriliyor
(app.js:9707) — StoreKit'te GERÇEKLEŞEN bir satın almanın SESSİZCE
kaybolması SENARYOSU somut olarak ele alınmış. `fileStorage.saveFile()`
de kendi try/catch'iyle "Dosya bu oturumda kullanılabilir ama kalıcı
olarak saklanamadı" diye YUMUŞAK düşüyor (uygulama çökmez, dosya o
oturumda çalışmaya devam eder). Diğer 14 `save*()` (stats/daily/vb.)
dönüş değerini KONTROL ETMİYOR (bilinçli/orantılı — kaybı SADECE o
turun istatistiği, kritik değil) — bu bir eksiklik değil, kasıtlı bir
önceliklendirme gibi görünüyor.

**13. UZUN OTURUM — bellek, GERÇEK 120 round ile ölçüldü**

Yöntem: `window.__aeaSubmitAnswerForTest()` (G285 test kancası, GERÇEK
submit fonksiyonlarını çağırıyor) ile Frekans Bulma'da ARALIKSIZ 120
round koşuldu (`feedbackScreen:false`, round-başı ~900ms — toplam
gerçek-oyun eşdeğeri BELİRSİZ ama otomatik ilerleme sabit hızda),
her 10 round'da DOM düğüm sayısı + `performance.memory.usedJSHeapSize`
örneklendi.

| Round | DOM düğümü | Heap (MB) |
|---|---|---|
| 0 | 2022 | 9.54 |
| 10 | 2156 | 9.54 |
| 20 | 2186 | 9.54 |
| 30 | 2173 | 9.54 |
| 60 | 2173 | 9.54 |
| 90 | 2173 | 9.54 |
| **120** | **2173** | **9.54** |

**Sonuç: DOM düğüm sayısı ilk ~20 round'da 2022→2186'ya çıkıp SONRA
120. round'a kadar SABİT 2173'te KALDI** (muhtemelen ilk birkaç
round'da lazy-init edilen UI parçaları — "i" paneli/feedback kartı
gibi — ilk kez oluşturulup sonra yeniden kullanılıyor). Heap boyutu
120 round boyunca **birebir aynı** (9.54MB, Δ0). 183 `addEventListener`/
0 `removeEventListener` (dosyanın KENDİ önceki turdaki 173 sayısından
biraz artmış — ilgisiz kod eklemelerinden) çağrısının BÜYÜK
ÇOĞUNLUĞU modül-yüklemede BİR KEZ, kalıcı DOM elemanlarına (üst
menü/sekme çubuğu/statik butonlar) bağlanıyor VEYA olay-delegasyonu
(`answersEl.addEventListener` + `e.target.closest(...)`) kullanıyor —
bu YÜZDEN round başına YENİ bir listener EKLENMİYOR, "0
removeEventListener" tek başına bir sızıntı KANITI DEĞİL. **Emin
değilim:** 120 round gerçek 2 saatlik bir oturuma (muhtemelen 500+
round) karşılık gelmiyor — TEK mod (Frekans Bulma) test edildi, mod
DEĞİŞTİRME/12 modun HEPSİNİ dolaşma senaryosu ÖLÇÜLMEDİ, ses tamponu
birikimi (AudioBuffer/AudioContext node sayısı) AYRICA ÖLÇÜLMEDİ. Bu
ölçülen ARALIKTA (120 round, tek mod) büyüme YOK — 500+ round'a
ekstrapolasyon YAPILAMAZ ama trend UMUT VERİCİ (düz çizgi, doğrusal
artış DEĞİL).

**14. ZAMAN DEĞİŞİMİ (saat dilimi/yurt dışı)**

🟡 **BULGU — dailyKey()'in AYNI kök nedeni, YENİ bir tetikleyici.**
`storage.js:dailyKey()` `new Date().getFullYear()/getMonth()/getDate()`
(CİHAZIN YEREL takvim günü) kullanıyor. `loadDaily()`
(`parsed.key !== dailyKey()`) bu STRING'İ EŞİTLİK ile karşılaştırıyor —
"daha YENİ mi" değil, "AYNI mı DEĞİL mi". Doğuya/batıya seyahat eden
bir kullanıcının cihazı saat dilimini OTOMATİK güncellerse (iOS
varsayılanı), yerel tarih İLERİ YA DA GERİ atlayabilir (özellikle
tarih değiştirme hattını BATIYA geçerken, aynı takvim gününü İKİNCİ
KEZ görme senaryosu). `dailyKey()` yönü AYIRT ETMEDİĞİ için, GERİYE
bir atlama da (kullanıcı bugünün görevlerini ZATEN tamamlamış/ödülü
almış olsa bile) `freshDaily()`'yi tetikleyip günlük görevleri/ödülleri
SIFIRLAR — teorik olarak AYNI takvim gününün ödülünü İKİ KEZ
kazanmayı mümkün kılar. Bu, kullanıcının ZATEN kayıtlı bildirdiği
"dailyKey() saat manipülasyonu" maddesiyle **AYNI kod yolu/kök neden**
— BURADA fark, TETİKLEYİCİNİN kötü niyetli saat oynaması DEĞİL,
MEŞRU bir seyahat senaryosu olması. Yeni bir hata DEĞİL, mevcut
bilinen zayıflığın bir BAŞKA (zararsız/kazara) tetikleme yolu. Risk:
**düşük** (kazanç en fazla küçük XP/gün — 40+50+35 XP, ekonomik
etkisi sınırlı, ÇÖKME riski yok). "Günlük özet kaydı" (G289'un
dailyRounds/dailyCorrect/dailyBestCombo/dailyXp sayaçları) AYNI
`daily` nesnesinin İÇİNDE olduğu için AYNI riski taşıyor.

🟢 **Can dolumu TEMİZ.** `paywall.js:applyLivesRefill(lives,
lastRefillAt, now, ...)` epoch milisaniye (`Date.now()`, saat
dilimi bağımsız MUTLAK zaman) ve SABİT `LIVES_REFILL_INTERVAL_MS`
(30 dk) kullanıyor — saat dilimi DEĞİŞİMİNDEN hiç ETKİLENMEZ (epoch
zaman seyahatle DEĞİŞMEZ, sadece YEREL saat gösterimi değişir).

🟢 **"Son 30 gün" isabet grafiği (`dailyAcc`) TEMİZ.** `loadDailyAcc`/
`recordDailyAccuracy` gün-anahtarlı bir HARİTA (tek bir "bugün" değeri
DEĞİL) — geriye/ileriye tarih atlaması VERİ KAYBETMİYOR, sadece
İLGİLİ günün kovasına EKLEME yapıyor (aynı bir ödül sistemi
OLMADIĞI için "iki kez kazanma" riski de YOK).

**15. ÇAKIŞMA (eşzamanlı işlemler)**

🟢 **Satın alma sırasında oyun — TEMİZ, KASITLI tasarım.**
`paywallPausedRound`/`pauseRound()`/`resumePausedRoundForPaywall()`
(app.js:8996-9011) — paywall (satın alma ekranı) AÇILDIĞINDA aktif
round KOŞULSUZ duraklatılıyor, satın alma/iptal SONRASI doğru
noktadan devam ediyor. `buyProBusy` bayrağı çift-tıklama/çift-satın-alma
isteğini ENGELLİYOR.

🟢 **Ses çalarken dosya yükleme — TEMİZ, mimari olarak güvenli.**
TÜM 6 `uploadManager` örneği (app.js:818/952/953/11577/11592/12940/13405)
AYNI paylaşılan `audioEngine.audioCtx`'i kullanıyor (`() =>
audioEngine.audioCtx` enjekte ediliyor) — AYRI bir AudioContext
YARATILMIYOR. `decodeAudioData` Web Audio API SPESİFİKASYONU gereği
render thread'i BLOKLAMAZ (platform garantisi, uygulamaya özgü bir
koruma GEREKTİRMEZ).

🟡 **Ölçüm yaparken mod değiştirme — KISMEN doğrulandı.** SADECE Tonal
Balance EQ önerisi (`toolsTonalRenderToken`, app.js:12571-12618) bir
yarış-durumu koruması (stale sonucu ATAR) taşıyor. Araçlar'daki DİĞER
asenkron ölçüm akışları (ana PSD/kanal analizi, filtre önizleme,
stereo genişlik ölçümü) AYNI korumaya sahip mi TAM olarak
DOĞRULANMADI — kapsam/zaman nedeniyle her biri tek tek izlenmedi.
**Emin değilim.**

**16. UÇAK MODU (ağ yok)**

🟢 **TEMİZ — mimari gereği zaten dayanıklı.** A/E bölümlerinde
doğrulandığı gibi uygulamanın KENDİ kodu HİÇBİR ağ isteği ATMIYOR
(tüm varlıklar bundle'da, tüm veri yerel) — açılış ağdan bağımsız.
`ads.js`'in `prepareRewardVideoAd()` çağrısı G234'ün kendi zaman
aşımı korumasını (`Promise.race` + `setTimeout` reddi) TAŞIYOR —
kullanıcının belirttiği gibi doğrulandı, ağsız reklam isteği
SONSUZA kadar ASILI KALMAZ. `iap.purchasePro()` `isNetworkError(e)`
ile AÇIKÇA "Bağlantı hatası — Bağlantını kontrol edip tekrar dene"
gösteriyor (iap.js:44-53). Fiyat gösterimi: `iap.fetchProPrice()`
başarısız/offline olursa `null` döner, çağıran taraf
`liveProPrice || paywall.PRO_PRICE` ile SABİT "₺399" yedeğine
DÜŞER (app.js:9103) — asla boş/kırık gösterim YOK.

---

## ÖZET TABLO

| # | Madde | Risk | Durum |
|---|---|---|---|
| 1 | Gömülü API anahtarı | — | 🟢 temiz |
| 2 | Git geçmişinde .env | — | 🟢 temiz |
| 3 | Loglarda kişisel veri | düşük | 🟡 bulgu (4 satır, dosya adı) |
| 4 | Hata mesajı iç detay sızdırma | düşük | 🟡 1 satır (err.message→UI) |
| 5 | innerHTML kaçırma | — | 🟢 temiz |
| 6 | npm audit | yok (son kullanıcı) | 🔴 10 açık, TÜMÜ izole dev-tool dalında |
| 7 | Sabitlenmemiş bağımlılık | düşük | 🟡 hepsi `^`, lockfile takipli |
| 8 | AdMob veri toplama / beyan tutarlılığı | yüksek | 🔴 bulgu |
| 9 | ATT zamanlaması | — | 🟢 temiz |
| 10 | SKAdNetwork kapsamı | orta | 🟡 sadece 1 kayıt |
| 11 | Bozuk dosya | düşük | 🟡 1/6 senaryo sessiz veri kaybı, çökme YOK |
| 12 | Depolama dolması | — | 🟢 temiz |
| 13 | Uzun oturum belleği | — | 🟢 120 round'da düz çizgi (sınırlı örneklem) |
| 14 | Saat dilimi değişimi | düşük | 🟡 bilinen dailyKey() zayıflığının seyahat tetikleyicisi |
| 15 | Eşzamanlı işlemler | — | 🟢 satın-alma/upload temiz, 🟡 ölçüm-sırasında-mod-değişimi kısmen doğrulandı |
| 16 | Uçak modu | — | 🟢 temiz |

---

## BİLİNEN/ZATEN KAYITLI AÇIKLAR (görev talimatı gereği düzeltme ÖNERİLMEDİ)

- `proPurchased` doğrulamasız okunuyor.
- `dailyKey()` saat manipülasyonu (madde 14'teki bulgu bunun AYNI kök
  nedeni, yeni bir MEŞRU tetikleyici olarak doğrulandı).
- 7-tık geliştirici modu (yayında kapanacak).
- 23 koşulsuz `console.log` (bu turda ölçülen: 22 — madde 3'te 4'ünün
  KİŞİSEL VERİ taşıdığı YENİ bilgi olarak eklendi).

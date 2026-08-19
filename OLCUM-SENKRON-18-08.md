# OLCUM-SENKRON-18-08 — "Düzeltmeler neden cihaza yansımıyor?"

**Görev tipi:** ÖLÇÜM. Kod değiştirilmedi, commit atılmadı. `git status --short`
bu turun sonunda sadece `ios/App/App.xcodeproj/project.pbxproj`'u (önceki
`cap sync`'ten kalma, DOKUNULMADI) + bu raporu gösteriyor.

**Kullanıcı hatası varsayılmadı.** Bu rapor Logic'in adım atlamış olabileceği
varsayımıyla değil, PİPELİNE'ın kendisinde doğrulanabilir bir yapısal boşluk
olup olmadığı sorusuyla yazıldı.

---

## NET CEVAP (en üstte, gerekçesi aşağıda)

**Kaynak kodun kendisi (`www/`) ve bu turda taze `npx cap sync ios` sonrası
`ios/App/App/public/` kopyası şu an BİREBİR AYNI — G300/G305/G308'in ÜÇÜ de
kopyada VAR, byte-byte doğrulandı.** Yani "sync BOZUK, bazı dosyaları
atlıyor" hipotezi bu ölçümde **YANLIŞLANDI**.

**Ama iki AYRI, koddan doğrulanabilir yapısal boşluk bulundu — ikisi de
"kaynak doğru ama cihaz eski görüyor" belirtisini üretebilir, hangisinin bu
ÜÇ olayın (G300/G305/G308) gerçek nedeni olduğu bu ortamdan (cihaz yok,
Xcode yok) KANITLANAMAZ, BELİRSİZ kalıyor:**

1. **`ios/App/App/public/` git'e HİÇ girmiyor (`ios/.gitignore:4`) ve onu
   güncelleyen `npx cap sync ios` adımını Xcode build'ine bağlayan HİÇBİR
   otomatik mekanizma (build-phase script, npm script, CI) YOK.** Bu adım
   TAMAMEN elle, her seferinde ayrı ayrı hatırlanması gereken bir adım —
   pipeline'ın kendisi bunu ZORUNLU KILMIYOR. Bu, "adımı biliyor ve
   uyguluyor" ile "pipeline bunu doğrulamadan geçmene izin veriyor" ayrı
   şeyler — ikincisi KOD KANITIYLA doğrulandı.
2. **`www/index.html`'in `js/app.js`/`styles.css` referanslarında SIFIR
   cache-busting var (`?v=hash` yok, cache-control meta etiketi yok) ve
   AppDelegate/MainViewController'da WKWebView önbelleğini TEMİZLEYEN
   HİÇBİR kod yok.** WKWebView'ın kendi disk önbelleği, App Store/
   TestFlight/Xcode-üzerinden GÜNCELLEME (silmeden üstüne kurma) senaryosunda
   iOS'un genel container-koruma davranışı gereği SİLİNMEZ — SADECE tam
   SİLME+YENİDEN KURMA (container'ın TAMAMEN silinmesi) bunu garantili
   temizler. Bu, genel iOS/WKWebView platform davranışı (bu repoya özgü kod
   değil) — bu ortamda cihaz olmadığı için DOĞRUDAN test EDİLEMEDİ, ama
   kodda bunu ÖNLEYEN hiçbir mekanizma da YOK, bu kısım DOĞRULANDI.

**Üçüncü, AYRI ve KANITLANMIŞ bir bulgu (C bölümü): Reverb'de "Atla"nın bir
kurulumda çalışıp temiz kurulumda çalışmaması, senkron/önbellek sorunu
OLMADAN, TEK BAŞINA sınav/telafi `position` sayacının temiz kurulumda HER
ZAMAN 0'dan başlamasıyla TAM olarak açıklanıyor** — bu SENKRON sorunu değil,
G307'nin (bu hafta eklenen sınav/telafi kalıcılığı) DOĞAL, beklenen bir yan
etkisi. Ayrıntı C bölümünde.

**Sonuç:** Yayına 6 gün kala, düzeltmelerin cihaza yansıyıp yansımadığını
GÜVENİLİR şekilde doğrulamanın TEK yolu, bir sonraki cihaz testinden önce (a)
**tam silme + yeniden kurma** (Xcode üzerinden üste kurma DEĞİL) ve (b) o
kurulumdan HEMEN önce `npx cap sync ios`'un ÇALIŞTIRILDIĞININ terminal
çıktısıyla doğrulanması. Bu ikisi yapılmadan alınan "hâlâ düzelmedi"
gözlemleri, düzeltmenin kendisi hakkında GÜVENİLİR bilgi VERMİYOR.

---

## A) BUILD ZİNCİRİ

**A1 — www/ ile ios/App/App/public/ birebir aynı mı?** Her paylaşılan dosya
SHA-256 ile karşılaştırıldı (73 dosya `www/`'de, 75 `ios/App/App/public/`'te
— fazladan ikisi `cap sync`'in ürettiği `cordova.js`/`cordova_plugins.js`,
beklenen). **SIFIR checksum uyuşmazlığı** — TÜM paylaşılan dosyalar
byte-byte AYNI (bu turun BAŞINDA `npx cap sync ios` çalıştırıldıktan sonra).

**A2 — Son sync ne zaman yapıldı, dosya tarihleri ne diyor?**
`ios/App/App/public/js/app.js` mtime: **19 Ağustos 02:28:27**. Son
`www/js/app.js`'i değiştiren commit (`bc9dd29`, G307): **19 Ağustos
01:59:27**. Yani kopya, kaynaktaki SON commit'ten SONRA senkronlanmış —
bu ölçümün YAPILDIĞI ANDA pipeline TUTARLI. **Bu SADECE bu turda/bu
checkout'ta doğrulanabildi** — Logic'in kendi makinesinde/checkout'unda son
sync'in NE ZAMAN yapıldığı bu ortamdan GÖRÜLEMEZ, BELİRSİZ.

**A3 — `npx cap sync ios` gerçekten TÜM dosyaları mı kopyalıyor?** A1'in
checksum sonucu buna EVET diyor — bu turda çalıştırıldığında hiçbir dosya
atlanmadı, hiçbir eski içerik kalmadı.

**A4 — Xcode build'i nereden okuyor?** `ios/App/App.xcodeproj/project.pbxproj`
satır 17/33/82/161: `public` klasörü bir **PBXFileReference (folder,
lastKnownFileType=folder)** olarak "Copy Bundle Resources" fazına
eklenmiş — yani Xcode, build anında `ios/App/App/public/`'in disk üzerindeki
GÜNCEL içeriğini TOPLU olarak (dosya dosya "Add to Xcode" gerekmeden) app
bundle'ına kopyalıyor. `capacitor.config.json`'da `"webDir": "www"` — yani
`cap sync`'in kaynağı `www/`, hedefi `ios/App/App/public/`; Xcode'un
okuduğu TEK yer de budur. **Zincirde "Xcode başka bir yerden okuyor"
ihtimali KOD KANITIYLA elendi.**

**A5 — .gitignore/build ayarları bazı dosyaları dışarıda mı bırakıyor?**
`ios/App/App/public/` **git'e HİÇ commit edilmiyor** — `ios/.gitignore:4`
(`App/App/public`) bunu açıkça ignore ediyor, `git ls-files
ios/App/App/public | wc -l` → **0**. Bu KASITLI ve NORMAL bir Capacitor
deseni (derleme çıktısı commit edilmez) — AMA doğrudan bir SONUCU var:
**bu klasörü güncel tutan `npx cap sync ios` adımını Xcode build'ine
bağlayan hiçbir otomatik mekanizma yok** — `project.pbxproj`'da "cap sync"
veya "npx cap" geçen HİÇBİR Run Script fazı bulunamadı (grep sıfır sonuç),
`package.json`'da da böyle bir script YOK (sadece `test`/`test:e2e`
tanımlı). **Bu, A bölümünün EN SOMUT yapısal bulgusu: pipeline, sync
adımının unutulmasına karşı SIFIR koruma sağlıyor.**

**BELİRSİZ (bu ortamdan doğrulanamaz):** Xcode'un kendi artımlı derleme
sistemi (DerivedData), bir KLASÖR referansının içeriği değiştiğinde bunu
HER ZAMAN güvenilir şekilde algılayıp yeniden kopyalıyor mu, yoksa bazı
senaryolarda (özellikle "Clean Build Folder" yapılmadan art arda "Run")
eski bir cache'i mi koruyor? Bu, Xcode'un bilinen bir davranış sınıfı
(klasör referanslarının artımlı derlemede güvenilirliği) ama bu repoda test
EDİLEMEZ — Xcode/cihaz gerektiriyor.

---

## B) ÖNBELLEK

**B6 — WKWebView önbelleği var mı, eski JS/CSS servis ediliyor olabilir
mi?** `www/index.html`'de `js/app.js`/`styles.css` referanslarının
HİÇBİRİNDE cache-busting sorgu dizgisi (`?v=...`) veya `<meta
http-equiv="Cache-Control">` etiketi YOK (grep sıfır sonuç) —
**doğrulandı**. `app.js` bir ES module (`type="module"`) ve KENDİSİ onlarca
alt modülü (`./core/*.js`, `./modes/*.js`) import ediyor — bunların HİÇBİRİ
de versiyonlanmamış. Yani teoride WKWebView'ın (ya da altındaki
NSURLCache/WKWebsiteDataStore katmanının) bu dosyaları önbellekte tutup
YENİ bir app güncellemesinde bile eskisini servis etmesini ENGELLEYEN
HİÇBİR sinyal kodda YOK. **AppDelegate.swift/MainViewController.swift**
incelendi — HİÇBİRİNDE `WKWebsiteDataStore` temizleme, `URLCache` sıfırlama
ya da benzeri bir çağrı YOK (AppDelegate tamamen varsayılan/boilerplate).

**B7 — Capacitor'ın kendi önbelleği?** `capacitor.config.json`'da
önbellekle ilgili herhangi bir ayar (`server.cleartext`,
`iosScheme` özelleştirmesi, vb.) YOK — varsayılan Capacitor davranışı
kullanılıyor. Capacitor'ın yerel şema işleyicisi (asset handler) her
istekte dosyayı doğrudan app bundle'ından okur — bu, WKWebView'ın KENDİ
disk/bellek önbelleğinin AYRI bir katman olarak hâlâ devrede olmasını
ENGELLEMEZ. **BELİRSİZ:** bu spesifik Capacitor sürümünün (8.4.2) yerel
şema işleyicisinin HTTP cache-control başlıkları ekleyip eklemediği bu
ortamdan (ağ isteği gözlemi gerektirir) doğrulanamadı.

**B8 — Service worker var mı?** Aranan: `serviceWorker`, `service-worker`,
`sw.js` — `www/` altında (JS/HTML) SIFIR sonuç. `www/manifest.json` var
ama bu bir PWA manifest'i (ikon/isim), service worker KAYIT KODU
İÇERMİYOR. **Service worker kaynaklı önbellek ELENDİ.**

**B9 — Silinip yeniden kurulunca önbellek gerçekten temizleniyor mu?**
Bu, uygulamaya özgü bir davranış DEĞİL, genel iOS platform davranışı: her
app kendi sandbox container'ında ayrı bir `WKWebsiteDataStore` tutar; bir
app TAMAMEN SİLİNDİĞİNDE bu container (WebKit önbelleği DAHİL) sistem
tarafından silinir. **Xcode üzerinden "Run" ile ÜSTÜNE kurma (silmeden
güncelleme) ise container'ı KORUR** — bu, gerçek App Store güncellemelerinin
de (kullanıcı verisi kaybolmasın diye) KASITLI davranışıdır. **Bu genel
platform bilgisi olarak aktarılıyor, bu repoya özgü kod kanıtı DEĞİL — cihaz
olmadığı için DOĞRUDAN test EDİLEMEDİ, BELİRSİZ/genel-bilgiyle-destekli**
olarak işaretleniyor. Kodda bunu telafi eden (örn. build numarasına göre
zorla cache-invalidate eden) HİÇBİR mekanizma da YOK — bu kısmı (kodda
koruma YOK) DOĞRULANDI.

---

## C) AYNI KOD FARKLI DAVRANIŞ ⚠️ EN KRİTİK — Reverb "Atla"

**Mekanizma UÇTAN UCA izlendi, KANITLANDI:**

"Atla" `#nextBtn`'e bağlı `goToNextRound()`'u çağırıyor
(`app.js:7218-7263`). Soru cevapsızken (`roundActive && activeQuestion`)
tıklanırsa: `challengeTick(false,0)` + `if (examGateActive())
examTookOver = handleExamOutcome(q, {correct:false}, 0)` (satır
7247-7250). **`examTookOver===true` olursa `startRound()` HİÇ
ÇAĞRILMIYOR** (satır 7260) — kullanıcı için "Atla hiçbir şey yapmadı" gibi
görünür (aslında ekran DEĞİŞİYOR — sınav/telafi ekranına geçiyor — ama bu
"soru ilerlemiyor" olarak algılanabilir).

`examGateActive()` = `EXAM_ENABLED && isUserPro()`; Reverb'de
`EXAM_ENABLED=true` (`reverb.js:57`) — yani bu tamamen `isUserPro()`'ya
bağlı.

**`handleExamOutcome`, `examSystem.recordAnswer(false, tier)` çağırıyor.**
`phase==="parkur"` iken (`exam-system.js:278-304`): her "Atla" SADECE
`position++`'ı ve `comboInParkur=0`'ı tetikler (yanlış sayıldığı için —
G214'ün kararı, DOKUNULMADI) — `parkurCorrect`'i ASLA artıramaz. `position
>= PARKUR_LENGTH (10)` sınırına ulaşınca: `parkurCorrect < TOTAL_THRESHOLD
(6)` olduğu için (art arda Atla'da bu HER ZAMAN doğru) sonuç **her zaman
`remedial-start`** — `handleExamOutcome` `true` döner, ekran değişir, "Atla
çalışmıyormuş gibi" görünür.

**`position` nereden başlıyor — TAM burada kurulum farkı devreye giriyor:**

- **Temiz kurulum:** `eqEarTrainerProXExamProgress` anahtarı HİÇ yok →
  `restoreFullSnapshot` no-op (`exam-system.js:391-396`) → Reverb'e ilk
  girişte `perModeState["reverb"]` tanımsız → `resetParkur()`
  (`exam-system.js:229-230`) → **`position` KESİN 0'dan başlar.** Sonuç:
  **art arda tam 10. "Atla" tıklamasında** sınır kesinlikle aşılır —
  "10 kere Atla'ya basıp deneyeyim" gibi doğal bir test adımı TAM bu
  sınıra denk gelir.
- **Var olan kurulum:** gerçek oynanmış geçmişten dolayı
  `eqEarTrainerProXExamProgress.byMode.reverb` dolu → `applySnapshot`
  (`exam-system.js:184-197`) `position`i KALDIĞI YERDEN (genelde 0
  DEĞİL) geri yükler → kısa bir test turunda sınıra denk gelme ihtimali
  DAHA DÜŞÜK, "Atla" o oturumda sorunsuz çalışıyormuş gibi görünür.

**Bu, RAPORLANAN polariteyi (var olan kurulumda çalıştı, temiz kurulumda
çalışmadı) SENKRON/ÖNBELLEK sorunu OLMADAN, TEK BAŞINA açıklıyor** — bu bir
BUG bile olmayabilir, `position`in temiz kurulumda 0'dan başlamasının VE
sınavın 10 soruda bir tetiklenmesinin DOĞAL, beklenen bir sonucu. G307 (bu
hafta eklenen kalıcılık) bu asimetriyi YARATMADI — G307'den ÖNCE de
`position` her mod-girişinde sıfırlanıyordu (G307 sadece bunu artık
SIFIRLAMAYIP koruyor); G307'nin etkisi sadece "var olan kurulum"un bu
sınıra DAHA GEÇ denk gelmesini SAĞLAMAK.

**BELİRSİZ (doğrulanamadı):**
- `isUserPro()`'nun Logic'in test oturumlarının HER İKİSİNDE de `true`
  olup olmadığı — bu mekanizmanın ÖN KOŞULU, cihaz/hesap durumu bu
  ortamdan görülemez.
- Kaç "Atla" tıklamasından sonra "çalışmadı" gözlemlendiği.
- `remedial-failed`/`recordAnswer` ile `persistExamProgress()` arasındaki
  dar bir zaman penceresinde (`app.js:3296` ile `3311-3316` arası) uygulama
  arka plana atılırsa/kapatılırsa, kalıcı kayıtta "imkânsız" bir ara durum
  (`phase:"parkur", position:10`) sıkışıp kalabilir mi — teorik olarak
  MÜMKÜN görünüyor ama cihaz zamanlaması gerektirdiği için bu ortamda
  KANITLANAMADI.

**Elendi:** Reverb'e özgü ayarlarda (`reverb.js`) temiz-kurulum/var-olan-
kurulum farkına yol açabilecek KALICI bir alan bulunamadı — `settings`
her round'da `app.js` tarafından bellek-içi değerlerden TAZE kuruluyor,
tüm okumalar varsayılanla korunmuş (`reverb.js:297,299,315,420`).
`startRound()`'un diğer erken-çıkış yolları (`blockIfLivesOut` vb.)
polarite AÇISINDAN TERS yönde çalışıyor (var olan kurulumun canı daha DÜŞÜK
olması beklenir, tersi değil) — bu rapordaki gözlemi AÇIKLAMIYOR, elendi.

---

## D) DÜZELTMELER DOĞRU YERDE Mİ?

**D15 — G300/G305/G308'in satırları `ios/` kopyasında VAR MI?** Doğrudan
grep ile karşılaştırıldı:
- G300 (`performExit`/`quitGameBtn`): `www/js/app.js:7499`
  (`function performExit()`) — **`ios/App/App/public/js/app.js:7499`'da
  BİREBİR AYNI SATIRDA.**
- G305 (3 handler'da `pauseRound()`): `www/js/app.js:3193/3211/3237`
  (`secondaryHandler` içinde `if (activeQuestion && !autoStopped)
  pauseRound();`) — **`ios/` kopyasında AYNI 3 satırda, karakter karakter
  AYNI.**
- G308 (`offsetA: 0.377`): `www/js/core/source-catalog.js:316/321` —
  **`ios/App/App/public/js/core/source-catalog.js:316/321`'de AYNI.**

**Sonuç: "düzeltme yanlış yere yazıldı" hipotezi bu üç düzeltmenin
ÜÇÜ için de KESİN OLARAK elendi** — kaynakta olan HER ŞEY, bu turun
sync'i sonrası kopyada da var.

**D16/D17 — Testler doğru şeyi mi doğruluyor, gerçek akışı mı taklit
ediyor?** `e2e/*.spec.mjs` genelinde 32 dosyada test-hook/gerçek-click
kullanımı tarandı: **6 dosya** `#nextBtn`'e gerçek `.click()`
gönderiyor, **8 dosya** DEV_MODE-bağımlı kısayol kancaları
(`__aeaSubmitAnswerForTest`, `__aeaNativeInterruption`,
`__aeaShowSessionEndForTest` vb.) kullanıyor. **Bu kancalar SADECE
`DEV_MODE=true` iken kuruluyor** (`app.js`'teki ilgili blok, `build-
flags.js`'in DEV_MODE yorumunda AÇIKÇA belirtildiği gibi) —
`DEV_MODE=true` REPONUN HER ZAMAN COMMIT EDİLEN hâli (Archive ANINDA
elle `false`'a çevrilip HEMEN geri alınıyor, `build-flags.js`'in kendi
yorumu) — yani **Logic'in TestFlight/geliştirme build'inde bu kancalar
GERÇEKTEN MEVCUT**, sadece CI'ye özgü hayali bir yol DEĞİL. Ama bu
kancaların gerçek bir DOKUNUŞ olayının ürettiği TÜM yan etkileri (event
bubbling, `requestAnimationFrame` zamanlaması, iOS native ses oturumu
etkileşimi) birebir taklit ettiği KANITLANAMAZ — bu BELİRSİZ kalıyor,
özellikle SES/native etkileşim içeren senaryolarda (bu raporun A/B/C
bölümleriyle DOĞRUDAN ilgili değil, ayrı bir genel test-güvenilirliği
notu).

---

## E) SNARE OFFSET ÖZELİNDE

**E18 — `0.377` değeri `ios/` kopyasında var mı?** `grep -n "offsetA:
0.377"` hem `www/js/core/source-catalog.js:316,321`'de hem
`ios/App/App/public/js/core/source-catalog.js:316,321`'de **AYNI** —
doğrulandı (D15'in tekrarı, bu maddeye özel netlik için ayrıca
koşuldu).

**E19 — Offset gerçekten uygulanıyor mu, `.start()`'a giden değer nedir?**
Zincir uçtan uca KOD OKUYARAK izlendi: `SOURCE_PAIRS[...].offsetA` →
`app.js:5576`'daki `cakismaSourcesSpec()` (`resolve(pair.sourceA,
uploadManagerA, pair.offsetA, pair.gainA)`) → `audio-engine.js:1196`
(`buildSampleSource(samplePath, spec.offsetSec || 0)`) →
`audio-engine.js:748-754` (`buildSampleSource`): `const safeOffset =
buffer.duration > 0 ? offsetSec % buffer.duration : 0; src.start(0,
safeOffset);`. **Zincirde kopukluk YOK** — `offsetA` DEĞERİ, hiçbir ara
adımda sabitlenmeden/örtülmeden doğrudan `AudioBufferSourceNode.start()`'ın
ikinci argümanına ulaşıyor. Bu, STATİK kod okumasıyla doğrulandı; gerçek
çalışma anında `src.start()`'a geçen SAYISAL değeri canlı ölçmek bu ortamda
(tarayıcı/cihaz sesi yok) YAPILAMADI — ama bu zaten mevcut
`e2e/cakisma-pair-offset.spec.mjs:100-121`'in doğruladığı şey
(`activeQuestion.pair.offsetA === SOURCE_PAIRS[...].offsetA`, gerçek
oyun akışında) — o test bu turda da GEÇTİ (önceki G308 turunda
doğrulandı).

**E20 — Ses dosyaları `ios/` kopyasına gidiyor mu?** `www/audio/*.m4a`
ile `ios/App/App/public/audio/*.m4a` dosya listesi VE `snare_late.m4a`
checksum'ı karşılaştırıldı — **liste birebir aynı, checksum birebir
aynı.**

**Sonuç: snare offset'inin KENDİSİNDE (E bölümü) senkron/uygulama
kopukluğu YOK — 0.377 hem kaynakta hem kopyada hem çalışma-zinciri
bağlantısında doğrulandı.** G308'in cihazda hâlâ eski gibi
hissettirmesi ihtimali varsa, bunun nedeni E bölümünde DEĞİL, A/B
bölümlerindeki yapısal boşluklarda aranmalı (yani: cihaz hâlâ G308'DEN
ÖNCEKİ bir build'i çalıştırıyor olabilir).

---

## GENEL SONUÇ

Üç ayrı soru sorulmuştu, üç ayrı cevap çıktı — hepsini TEK bir "senkron
bozuk" başlığına indirgemek YANLIŞ olur:

1. **G300/G305/G308'in "cihaza yansımaması"** için bu turda BULUNAN kod
   kanıtı, sync'in KENDİSİNİN bozuk olduğunu GÖSTERMİYOR (A1 checksum
   temiz) — bulunan şey, pipeline'ın sync adımını ZORUNLU KILMAMASI (A5)
   ve WKWebView önbelleğinin app-güncellemesi senaryosunda hayatta
   kalabilmesine karşı hiçbir korumanın olmaması (B6/B9). **Hangisinin bu
   ÜÇ olayın gerçek nedeni olduğu, Logic'in cihazındaki gerçek build/
   kurulum geçmişi görülmeden KANITLANAMAZ — BELİRSİZ.**
2. **Reverb "Atla" farklı davranışı** için TEK, KANITLANMIŞ bir mekanizma
   bulundu (C bölümü) — bu SENKRON sorunu DEĞİL, sınav parkur sayacının
   temiz kurulumda 0'dan başlamasının doğal sonucu.
3. **Snare offset'in kendisi** uçtan uca temiz — sorun varsa E'de değil,
   A/B'de aranmalı.

**Bu çözülmeden (özellikle A5/B6/B9) yapılan hiçbir düzeltmeye
GÜVENİLEMEZ** — görev metninin kendi uyarısı, bu ölçümle DOĞRULANDI: kod
tarafı sağlam olsa bile, cihazın GERÇEKTEN o kodu çalıştırdığını
doğrulayan hiçbir otomatik mekanizma pipeline'da YOK.

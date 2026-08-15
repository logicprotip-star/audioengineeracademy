# TUR 5A — TEKNİK SAĞLAMLIK VE ÇÖKME RİSKİ

_15-16 Ağustos 2026 · commit `af9224c`'a kadar (G214-G238, hepsi TEK
bir çalışma bloğunda, saat 12:17-23:53 arası, `git log --date` ile
doğrulandı — task'ın "25 commit tek günde" öncülü ZAMAN DAMGALARIYLA
KANITLANDI, tahmin değil)._

**Kapsam notu:** Bu tur "birlikte bakıldığında ne kırılır" sorusuna
odaklanıyor — TEK TEK doğrulanmış 18 commit'in ETKİLEŞİMİ. Cihaz/Xcode
gerektiren maddeler (WKWebView bellek limiti, gerçek çökme/donma,
Debug/Release native derleme farkı) BELİRSİZ bırakıldı, bu ortamda
KANITLANAMAZ.

---

## A) BUGÜNÜN COMMIT'LERİNİN ETKİLEŞİMİ ⚠️ ÖNCELİKLİ

### 🟢 `www/js/app.js` 14/18 commit'te değişti — ama fonksiyon-seviyesi çakışma TARANDI, ciddi bir çift bulunmadı
`git show --stat` ile TÜM 18 commit tek tek listelendi: `app.js`
14'ünde değişti (G214/215/220/221/223/225/228/229/230/231/232/235/236/237),
`DURUM.md` HEPSİNDE (beklenen). Aynı DOSYAYA dokunmak otomatik olarak
çakışma DEĞİL — hangi FONKSİYONLARIN üst üste bindiği kontrol edildi:

- **`pauseRound()`**: G235 (abPressTimer temizliği eklendi) VE G236
  (onInterruption'ın "began" dalı BU fonksiyonu ÇAĞIRIYOR, dokunmuyor).
  Bu bir ÇAKIŞMA DEĞİL, SİNERJİ — G236'nın yeni kesinti yolu G235'in
  düzeltmesini OTOMATİK MİRAS ALIYOR (abPressTimer artık kesintide de
  temizleniyor, AYRI kod YAZILMADI). 🟢

- **`!activeQuestion` / "fresh-start" bloğu (`#startBtn` handler'ı)**:
  G225 (`paywallEndedRoundForResume` bayrağıyla `sessionExtraQuestionsGranted`
  sıfırlanmasını ATLAMA mantığı EKLEMİŞTİ) VE G237 (AYNI bloktaki
  `sessionExtraQuestionsGranted = 0` satırını TAMAMEN KALDIRDI, çünkü
  değişkenin kendisini kaldırdı). **DOĞRUDAN ÇAKIŞMA ALANI** — G237,
  G225'in ÜZERİNE yazdı. **DOĞRULANDI (tahmin değil):** her iki G237
  commit doğrulamasında da (kendi turumda) "madde 30" e2e testleri
  (G225'in TAM senaryosunu test eden, `e2e/paywall-flow.spec.mjs`) HER
  İKİSİ de yeşil kaldı — G237'nin `sessionExtraQuestionsToday()`
  türetmesi G225'in korumak istediği davranışı (reklamla kazanılan hak
  fresh-start'ta silinmez) FARKLI bir mekanizmayla (stats.sessionAdWatchesToday,
  KALICI) hâlâ sağlıyor — ÇÜRÜTME YOK, YERİNE GEÇME var, test kanıtlı.

- **`startRound()`**: G237 `roundsInThisPlaySession++`'ın yanına YENİ
  bir `freeSession.used++` ekledi — fonksiyonun KENDİSİ başka hiçbir
  bugünkü commit'te değişmedi. Çakışma YOK.

- **`openPaywallReason()`**: G228 (restore butonu HER zaman görünür
  yapıldı) — G220'nin (aynı gün, DAHA ÖNCE) "ilk oturumda paywall her
  zaman açılsın" değişikliğinin ÜZERİNE inşa edildi, İKİSİ de AYNI
  fonksiyonu değiştirdi ama FARKLI satırlar (G220 dönüş değeri
  mantığını, G228 `restorePurchaseBtn` görünürlüğünü) — çakışma YOK,
  kronolojik olarak UYUMLU katmanlanma.

### 🟡 DOĞRULANDI (task'ın kendi verdiği örnek) — `showSessionEnd("lost")`/`showSessionEnd("freeLimit")` G220'den beri ÖLÜ KOD, ama BİLEREK/telafi edilmiş
`openPaywallReason(reasonKey)` (app.js:8269-8301) artık SADECE
`if (!cfg) return false;` durumunda `false` döner — `cfg`
(`paywall.PAYWALL_REASONS["sessionLimit"/"livesOut"]`) HER ZAMAN
TANIMLI olduğu için bu satır PRATİKTE hiç `false` DÖNMÜYOR. Sonuç:
`blockIfLivesOut()`/`blockIfSessionLimitReached()`/`finalizeIfGameOver()`
içindeki `if (!openPaywallReason(...)) showSessionEnd("lost"/"freeLimit")`
dalları **ULAŞILAMAZ**. Bu görevin KENDİ verdiği örnekle BİREBİR
eşleşiyor — YENİ bir bulgu DEĞİL, KOD SEVİYESİNDE TEYİT edildi. Kod
BUNU zaten biliyor: satır 8379 civarında "G220'den beri
showSessionEnd('lost') bir daha hiç [çağrılmıyor]" yorumu VE satır
11592'de `window.__aeaShowSessionEndForTest = showSessionEnd;` — bu
ölü yolun render mantığının HÂLÂ TEST EDİLEBİLMESİ için BİLEREK
eklenmiş bir kanca (bkz. Bölüm F). **Sonuç: iyi belgelenmiş, telafi
edilmiş bir ölü kod — ACİL değil, ama `blockIfLivesOut`/
`blockIfSessionLimitReached`'ın "false döndüğünde" dalları TEMİZLENEBİLİR
(1.1, kozmetik).**

### 🟢 Diğer 17 commit'te YENİ bir ölü-kod/ulaşılamaz-dal örneği ARANDI, BULUNAMADI
G214 (Atla sayaçları), G221 (layout), G223 (hedef eğriler), G225,
G229-G238 tek tek TARANDI — her birinin eklediği kod yolunun hâlâ
ERİŞİLEBİLİR olduğu (G237/G238 için BİZZAT doğrulandı, diğerleri için
DURUM.md'nin kendi ölçüm kayıtları okundu) — YENİ bir "G220 sınıfı"
örnek bu turda TESPİT EDİLEMEDİ. Kapsamlı bir statik erişilebilirlik
analizi (her `if`/`return` dalının GERÇEKTEN tetiklenebilirliği) tüm
app.js için YAPILMADI — BELİRSİZ, tam kapsam garanti edilmiyor.

### 🟢 Her commit'in kabul kriteri — DURUM.md'nin kendi kayıtları okundu, hepsinde ÖLÇÜM/test referansı var
18 commit'in TAMAMININ DURUM.md kaydı incelendi — hepsi somut bir
ölçüm kaynağına (DENETIM-15-08.md/DOGRULAMA-15-08.md/RET-RISKI-15-08.md/
TUR2/TUR3A/TUR3B/TUR4 + kendi `npm test`/`npm run test:e2e` sayıları)
atıfta bulunuyor — "aceleyle atlanmış" bir madde bu düzeyde
GÖRÜLMEDİ. G229-G238 için (bu oturumda BİZZAT yapıldı) `git stash`
kırmızı/yeşil doğrulaması HER BİRİNDE yapıldı, kanıtlı.

---

## B) BELLEK SIZINTISI

### 🟢 173 addEventListener / 0 removeEventListener — İLK BAKIŞTA alarm, ama YANLIŞ ALARM
Sayı doğru ama YORUM YANLIŞ olurdu: bu bir TEK-SAYFA uygulama (DOM
elemanları HİÇ yeniden oluşturulmuyor, ekranlar CSS class'ıyla
gösterilip gizleniyor) — 173 çağrının BÜYÜK ÇOĞUNLUĞU modül-seviyesinde
(TEK KEZ, script yüklenirken) STATİK `els.xxxBtn` elemanlarına
bağlanıyor. Elemanlar hiç YOK OLMADIĞI için dinleyicileri de hiç
"sızmıyor" (uygulamanın KENDİ ömrü kadar yaşıyorlar, bu BEKLENEN).
3 istisna (`window`/`document`'a bağlı, potansiyel TEKRAR-bağlanma
riski taşıyanlar) TEK TEK kontrol edildi:
- `window.addEventListener("resize", ...)` (spotlight, satır 7010) —
  `spotlightResizeBound` bayrağıyla KORUNMUŞ, tekrar-bağlanma YOK. 🟢
- `document.addEventListener('keydown', ...)` (satır 7850) — bir
  IIFE'nin (`(function(){...})()`) İÇİNDE, TEK KEZ çalışır. 🟢
- `window.addEventListener("pointerup", ...)` (satır 10437) — modül
  seviyesinde, TEK KEZ. 🟢

**Sonuç: gerçek bir event-listener sızıntısı BULUNAMADI.**

### 🟢 AudioBuffer/AudioNode temizliği — TUR3A'da ZATEN kapsamlı incelendi, bu turda TEKRAR taranmadı
TUR3A-VERI-15-08.md Bölüm C: 7 ayrı `createUploadManager()` örneğinin
HER birinin `clear()` metodu buffer'ı `null`layor (GC'ye referans
kaldırıyor); `audio-engine.js:stopAudio()`/`recreateContext()`
`currentNodes`'u disconnect edip diziyi boşaltıyor. O turun bulgusu
(7 yönetici AYNI ANDA dolu buffer tutabilir, bellek TEPE noktası
yüksek olabilir) HÂLÂ GEÇERLİ, TEKRARLANMADI — bkz. o rapor.

### 🟡 Uzun oturumda (1 saat) ne birikir — KISMEN ölçülebilir, TAM kapsam BELİRSİZ
`stats.history` (İlerleme grafiği) `slice(0, 12)` ile SINIRLI —
büyümez. `daily.tasks`/`dailyAcc` günlük sıfırlanıyor. `toolsFiles`
(Dosyalarım) `TOOLS_LIBRARY_MAX=5` ile sınırlı. **Ama** `session.log`
(Seans Sonu ekranının XP kırılımı) HER cevapta `push` ediliyor GİBİ
GÖRÜNÜYOR (koddan TAM doğrulanmadı bu turda) — eğer sınırsız
büyüyorsa çok uzun (yüzlerce soruluk) TEK bir oturumda (mod
kapatılmadan) hafif bir bellek artışı OLABİLİR, ama `resetSession()`
her "gerçek fresh-start"ta bunu sıfırlıyor — normal kullanımda (kısa
oturumlar) pratik risk DÜŞÜK. **TESTFLIGHT'A/cihaza DEVREDİLDİ** —
gerçek 1 saatlik oturumda Safari Web Inspector'ın Memory sekmesiyle
ölçülmeli, bu ortamda YAPILAMAZ.

---

## C) SONSUZ DÖNGÜ VE DONMA RİSKİ

### 🟡 YENİ BULUNDU — `frekans-cakismasi.js:generateStage3Choices()` (satır 264) korumasız `while`, KARDEŞ fonksiyonuyla (satır 232) TUTARSIZ
Aynı dosyada, aynı yazarın elinden çıkan İKİ ADAY-ÜRETME döngüsü var:
`generateStage2Choices()` (satır 232) `guard < optionsCount * 15` ile
AÇIKÇA sınırlı; `generateStage3Choices()` (satır 264,
`while (candidates.length < optionsCount)`) HİÇBİR üst sınır
TAŞIMIYOR. **Matematiksel analiz (kod okunarak):** her iterasyonda
`step++` ile `mag` monoton BÜYÜYOR, `cutDb` da (küçük bir taban aralığı
hariç) monoton KÜÇÜLÜYOR (daha negatif) — `cutStepDb` DIFFICULTY
tablolarında HER ZAMAN pozitif (4.0→0.8 arası, sıfır/negatif değer
GÖRÜLMEDİ) olduğu sürece bu döngü SONLU adımda biter (GERÇEK bir
sonsuz döngü şu an tetiklenemez, koddan doğrulandı). **Ama** koruma
YOK — `cutStepDb` gelecekte (Otomatik mod eğrisi/bir tuning hatası)
sıfır ya da negatif bir değer üretirse (şu an ÜRETMEDİĞİ doğrulandı,
ama KOD BUNU garanti ETMİYOR) bu döngü GERÇEKTEN sonsuz olur — ana
thread'i kilitler (donma, watchdog kill riski, bkz. Bölüm E).
**Düzeltme önerisi (kod YAZILMADI, sadece belirtiliyor):** kardeş
fonksiyondaki `guard` deseni buraya da eklenmeli.

### 🟢 Diğer TÜM `while`/aday-üretme döngüleri (frekans-bulma/kesim-noktası/pan/stereo/boost-cut) — sınırlı VEYA matematiksel olarak GARANTİLİ sonlu
Tek tek okunup DOĞRULANDI: `offsetsOct.length < count-1` gibi dizi-
uzunluğu koşulları VEYA `guard`/`tries` sayaçları VAR. `boost-mu-cut-mu.js`'in
`while (candidates.length < count)` döngüsü (satır 261) HER
iterasyonda (dallanma FARK ETMEKSİZİN) TAM OLARAK 1 aday EKLİYOR
(duplicate-kontrolü bile YOK) — bu yüzden `count-1` iterasyonda KESİN
biter, matematiksel olarak KANITLANDI.

### 🟢 `progress.js`'in seviye-hesaplama `while` döngüleri (G238'in dokunduğu ALAN) — sonlu, AMA savunmasız bir uç var
`levelFromXp`/`xpProgress`/`academyXpProgress`'in ÜÇÜ de AYNI desen:
`while (xp >= spent + xpNeeded(level)) { spent += ...; level++; }`.
`xpNeeded(level)` MONOTON ARTAN olduğu için HERHANGİ bir SONLU `xp`
için bu döngü SONLU adımda biter (G238 SADECE çarpanı değiştirdi,
döngü ŞEKLİNE dokunmadı — risk PROFİLİ AYNI kaldı, YENİ değil).
**Teorik uç:** `xp` bir şekilde `Infinity` olursa (normal `calculateXP()`
formülüyle — combo/boss/hızlı-cevap/bölüm çarpanları HEPSİ SINIRLI —
ULAŞILAMAZ, koddan doğrulandı) bu döngü GERÇEKTEN sonsuz olurdu. `NaN`
olursa (`NaN >= herhangi bir şey` HER ZAMAN `false`) döngü HİÇ
ÇALIŞMAZ, seviye sessizce 1'de KALIR (donma değil, YANLIŞ sonuç). Her
iki durum da NORMAL oyun akışıyla ÜRETİLEMEDİ — savunmasız ama pratikte
tetiklenemez.

### 🟢 requestAnimationFrame zincirleri — G192'de (önceki tur) ZATEN kapsamlı ele alınmış, bu turda YENİDEN taranmadı
Kendi koşul kontrolüyle (`if (!roundActive) return;`) duruyorlar,
`cancelAnimationFrame` GEREKMİYOR bu desende — TUR3B'nin K bölümünde
DE bu ayrı doğrulanmıştı ("kendi kendini iptal eden desen").

### 🟢 Ana thread'i bloklayan uzun senkron işlem — büyük WAV decode ZATEN periyodik nefes veriyor (test kanıtlı)
`decodeWavPcm()`'in kendi testi (`test/wav-parser.test.mjs`) "~50MB'lık
dosyada periyodik nefes verir" diye AÇIKÇA doğrulanmış (bu turda
`npm test` çıktısında GÖRÜLDÜ, ~230ms sürüyor ama BLOKLAMIYOR). FFT/
spektrum analizleri (audioEngine/tonal-balance) OfflineAudioContext
üzerinden ASENKRON çalışıyor (TUR3B'de doğrulanmıştı).

---

## D) SAYISAL UÇLAR

### 🟢 dB/gain formatlayıcılarının "-0" sınıfı G230'da KAPANDI, tekrar taranmadı
G230'un kendi turu 7 formatlayıcıyı taramış, sonucu DURUM.md'de kayıtlı.

### 🟢 Yüzde hesapları (`accuracy()`, bant isabet oranları) sıfıra-bölme korumalı
`accuracy(stats) { return stats.rounds ? Math.round(...) : 0; }` —
TUR4'te doğrulanmıştı, bu turda TEKRAR doğrulandı (`progress.js:27-29`).

### 🟡 `isFreeSessionLimitReached`/`sessionExtraQuestionsToday` (G237, BUGÜNÜN kodu) — NaN/negatif girdiye karşı KORUMASIZ ama pratik yol GÜVENLİ
`paywall.isFreeSessionLimitReached(roundsPlayed, isPro, limit)` sadece
`roundsPlayed >= limit` karşılaştırması — matematik BASİT, NaN/Infinity
üretme riski YOK (toplama/çarpma yok). `sessionExtraQuestionsToday()`
(app.js) `MAX_SESSION_EXTENSION_ADS_PER_DAY - remaining` çıkarması
YAPIYOR — `remaining` `Math.max(0, ...)` ile ZATEN negatif olamaz
(paywall.js:143), NaN girdi ise sadece `stats.sessionAdWatchesToday`
bozuk bir tipte OLURSA (localStorage'dan bozuk okunursa) mümkün, ama
`loadStats()`'ın kendi savunması (TUR3A'da doğrulanmıştı) bunu
ENGELLİYOR. **Kullanıcıya "NaN"/"Infinity" görünme riski bu iki YENİ
fonksiyon için pratik olarak YOK.**

### BELİRSİZ — analysis.js/tonal-balance.js'in LUFS/korelasyon hesapları
Bu turda TARANMADI (kapsam dışı bırakıldı, TUR3A/3B/4 zaten SES
MOTORU'nun genel sağlamlığına odaklandı, bu spesifik hesap YOLU HİÇ
denetlenmedi) — sessizlik/mutlak-sıfır girdisinde `-Infinity`
(logaritmik LUFS hesabı TİPİK OLARAK `log(0)` riskiyle) üretme
İHTİMALİ var, koddan DOĞRULANMADI. **1.1'e/TestFlight'a bırakılabilir**
ayrı bir ölçüm gerektirir.

---

## E) iOS'A ÖZEL ÇÖKME SEBEPLERİ

Bu bölümün TAMAMI cihaz/Xcode gerektiriyor, bu ortamda ÇALIŞTIRILAMAZ.
TUR3A'nın ZATEN kapsamlı bulguları (tekrarlanmadı, referans verilir):

- **WKWebView bellek limiti:** TUR3A Bölüm C — 100MB'lık düşük-bitrate
  dosya ~1-2GB'a decode olabiliyordu, G231'DE (7 dakika süre sınırı)
  KAPANDI. Kalan risk: 7 upload manager'ın AYNI ANDA dolu olması (bu
  turda B'de TEKRAR NOT edildi, DEĞİŞMEDİ).
- **localStorage kotası:** TUR3A Bölüm B/D — mertebe HESAPLANMIŞTI
  (onlarca KB, tipik 5-10MB sınırının ÇOK altında), G229/G232/G237
  bugün YENİ anahtarlar ekledi (`eqEarTrainerProXFreeSession` — TEK bir
  `{key,used}` nesnesi, birkaç bayt) — TOPLAM kotayı ANLAMLI ÖLÇÜDE
  DEĞİŞTİRMEZ.
- **Ana thread watchdog kill:** C bölümündeki `frekans-cakismasi.js`
  bulgusu (korumasız `while`) BU riskin SOMUT, koddan-kanıtlı TEK
  adayı — pratikte tetiklenemez olsa da, watchdog'un GERÇEK eşiği
  (genelde birkaç saniye) BİLİNMİYOR, cihazda test EDİLEMEZ.
- **Arka planda ses kesme / düşük bellek uyarısı:** TUR3B Bölüm D/I —
  G236 bugün bunun BİR PARÇASINI (native kesinti köprüsü) kapattı,
  kalan CİHAZDA ZORUNLU doğrulama listesi (arama/Siri/alarm) HÂLÂ AÇIK
  (G236'nın kendi DURUM.md kaydına bkz.). Düşük bellek uyarısının
  KENDİSİ (`UIApplication.didReceiveMemoryWarningNotification` benzeri
  bir Capacitor/JS sinyali) kodda HİÇ dinlenmiyor (grep, sıfır sonuç)
  — bu turda YENİ doğrulandı, önceki turlarda hiç bahsedilmemişti.
  **Sonuç: uygulama düşük-bellek uyarısı geldiğinde HİÇBİR ÖZEL
  DAVRANIŞ SERGİLEMİYOR** (ne kaynak serbest bırakma ne kullanıcı
  bildirimi) — iOS bunu TAMAMEN kendi takdirine göre (muhtemelen
  sessiz process-kill) yönetir. BELİRSİZ/cihaza devredildi, ama
  KODDA hiçbir karşılık YOK olduğu KESİN.

---

## F) DEBUG vs RELEASE FARKI ⚠️ ÖNEMLİ

### 🟢 KESİN BULGU (config dosyasından doğrulandı) — bu Capacitor projesinde web katmanı için Debug/Release AYRIMI YOK
`capacitor.config.json`: `"webDir": "www"`. `package.json`'da build/
minify script'i YOK (`webpack`/`vite`/`rollup` config dosyası da YOK,
`find` ile arandı). Capacitor `www/` klasörünü OLDUĞU GİBİ native
projeye kopyalar — **JS/HTML/CSS katmanı Debug ve Release build'lerinde
BİREBİR AYNI dosyalar** — hiçbir minification/dead-code-elimination/
strip adımı YOK. Bu, aşağıdaki TÜM alt soruları KESİN olarak yanıtlıyor
(tahmin değil, proje yapılandırmasından doğrudan okundu):

- **43 tanı console.log Release'de ne oluyor:** AYNEN Debug'daki gibi
  ÇALIŞMAYA DEVAM EDER — hiçbiri kaldırılmaz. TUR3B'de zaten "kod
  bunu bilerek KALICI teşhis günlüğü diye tasarlamış" diye
  NOTLANMIŞTI, bu turda KESİNLEŞTİRİLDİ (build seviyesinde de
  doğrulandı).
- **Test kancaları (`window.__aeaShowSessionEndForTest`,
  `window.__tonalDebugState`, `window.__tonalRefVerify` — TAM liste,
  grep ile çıkarıldı, ÜÇÜ de bunlar) Release'de KALIYOR:** EVET,
  KOŞULSUZ — hiçbir `if (dev)`/ortam kontrolü YOK. **İkilem NASIL
  ÇÖZÜLMÜŞ:** çözülmemiş, BİLİNÇLİ bir ödün — kod (satır 11584-11591
  civarı yorum) bunu AÇIKÇA kabul ediyor: "kalıcı, çağrılmazsa maliyeti
  yok" gerekçesiyle KALDIRILMAMASI seçilmiş. **Risk değerlendirmesi:**
  bu 3 kanca hiçbiri satın alma/veri/güvenlik bypass'ı SAĞLAMIYOR —
  SADECE mevcut, gerçek state'i render ediyor (showSessionEnd) ya da
  salt-okunur debug bilgisi döndürüyor (tonalDebugState) — Apple'ın
  App Store incelemesi JS içeriğini bu düzeyde İNCELEMİYOR (bilinen
  bir ret sebebi DEĞİL). **Sonuç: düşük risk, kasıtlı ödün, makul.**
- **Minification/ölü kod eleme Release'de bir şeyi BOZUYOR MU:**
  Uygulanamaz soru — minification/eleme YOK, bu yüzden BOZACAK bir
  şey de YOK.
- **Release build'de hiç test edilmemiş kod yolu var mı:** JS
  KATMANI için bu soru ANLAMSIZ (aynı kod). **NATIVE (Swift) katman
  İÇİN** durum FARKLI — Xcode'un Release şeması derleyici optimizasyonu
  AÇAR (`-O` vs `-Onone`), bu WKWebView'in kendi JS motoru/timing
  davranışını (JIT ısınma süresi, GC zamanlaması) TEORİK olarak
  ETKİLEYEBİLİR — ama bu ortamda ÖLÇÜLEMEZ, BELİRSİZ.

### BELİRSİZ — Zamanlama farkları (Debug yavaş, Release hızlı) yarış durumu açar mı
JS katmanı AYNI olsa bile, Release'in NATIVE tarafının (Swift
optimizasyonu, WKWebView'in kendi iç zamanlaması) FARKLI hızda
çalışması, bu oturumda ZATEN ölçülmüş TIMING-HASSAS noktaları (G133'ün
context-recreate cooldown'u, G234'ün 30sn zaman aşımı, `RECREATE_COOLDOWN_MS=2000`,
route-change debounce 200ms) TEORİK olarak farklı davranabilir —
KODUN KENDİSİ zamanlamaya bağlı DEĞİL (sabit ms değerleri, gerçek
duvar-saati kullanıyor, Debug/Release ARASINDA JS seviyesinde
DEĞİŞMEZ) ama NATIVE tarafın (ör. native `activate()` çağrısının
gerçek yanıt süresi) Release'de DAHA HIZLI/YAVAŞ olması G133'ün
`RECREATE_COOLDOWN_MS` gibi sabit eşiklerle ETKİLEŞEBİLİR — bu SADECE
cihazda gözlemlenebilir, BELİRSİZ.

### Swift dosyası (G236) bu ortamda DERLENEMEDİ
`ios/App/App/AudioSessionPlugin.swift` brace/parantez dengesi
KONTROL EDİLDİ (16/16, 90/90 — dengeli) — ama bu SADECE en kaba
sözdizimi kontrolü, GERÇEK Swift derlemesi (tip kontrolü, Capacitor
plugin kaydı) Xcode GEREKTİRİYOR, bu ortamda YAPILAMAZ. **CİHAZA/
Xcode derlemesine DEVREDİLDİ.**

---

## G) BUGÜN ATLANAN VAR MI

### 🟢 18 commit'in TAMAMI kendi kabul kriterine/ölçüm kaydına sahip (bkz. Bölüm A)
"Sonra bakarız" diye açıkça bırakılmış BİR madde YOK — her commit'in
DURUM.md kaydı "Dokunulan"/"Dokunulmayan"/"Ölçüm" üçlüsünü TAŞIYOR.

### 🟡 G231/G235/G236'nın CİHAZDA ZORUNLU doğrulama maddeleri HÂLÂ AÇIK — bu YENİ değil, AMA birikiyor
G231 (süre sınırı — gerçek dosyayla cihaz testi ÖNERİLMEMİŞ, sadece
Playwright), G235 (A/B basılı tutup arka plana alma), G236 (arama/
Siri/alarm — EN KRİTİK, 5 maddelik liste) — ÜÇÜNÜN de kendi DURUM.md
kaydında "⚠️ CİHAZDA doğrulanması gereken" bölümü VAR, HİÇBİRİ henüz
işaretlenmedi (bu ortamda yapılamaz, cihaz gerekiyor) — bu BİRİKEN bir
borç, tek tek küçük ama TOPLAMDA yayın öncesi bir cihaz turu
GEREKTİRİYOR.

### 🟢 Yarım kalan düzeltme ARANDI, BULUNAMADI
`sessionExtraQuestionsGranted` (G237'de kaldırılan değişken) için
TÜM referanslar tarandı — sadece YORUMLARDA kalıntı var (kod DEĞİL),
canlı bir yarım-geçiş YOK.

---

# ÖNCELİK LİSTELERİ

## Yayın öncesi düzeltilecekler (öncelik sırasıyla)
1. **🟡 `frekans-cakismasi.js:generateStage3Choices()` (satır 264)** —
   kardeş fonksiyonundaki (satır 232) `guard` deseni buraya da
   eklenmeli. Şu an tetiklenemez ama savunmasız — dar kapsamlı, düşük
   riskli bir ekleme.
2. **🟡 `blockIfLivesOut`/`blockIfSessionLimitReached`/`finalizeIfGameOver`'ın
   `showSessionEnd("lost"/"freeLimit")` dalları** — G220'den beri
   ulaşılamaz, test kancasıyla (`window.__aeaShowSessionEndForTest`)
   TELAFİ edilmiş durumda — acil değil ama temizlenebilir/BELGELENEBİLİR
   (kod yorumunda zaten kısmen var).

## 1.1'e bırakılabilirler
- `session.log`'un sınırsız büyüyüp büyümediğinin TAM doğrulanması (B).
- LUFS/korelasyon hesaplarının (analysis.js/tonal-balance.js) NaN/
  -Infinity taraması (D) — bu turda hiç dokunulmadı.
- Düşük-bellek-uyarısı sinyalinin (E) dinlenip dinlenmeyeceğine dair
  bir ürün/mimari kararı.

## Cihazda doğrulanması gerekenler
- G231/G235/G236'nın kendi DURUM.md kayıtlarındaki CİHAZDA doğrulama
  listeleri (biriken, TEK bir cihaz turunda toplu yapılabilir).
- WKWebView bellek limiti gerçek davranışı (7 upload manager'ın aynı
  anda dolu olması senaryosu, TUR3A'dan).
- `frekans-cakismasi.js`'in korumasız döngüsünün GERÇEKTEN watchdog
  kill'e yol açıp açmadığı (şu an tetiklenemediği için muhtemelen
  GEREKMİYOR, ama listelendi).
- Debug/Release native derleme farkının (Swift optimizasyon, WKWebView
  timing) G133/G234'ün sabit zaman eşikleriyle etkileşimi.

**Bu turda hiçbir kod DEĞİŞTİRİLMEDİ — sadece ölçüm.**

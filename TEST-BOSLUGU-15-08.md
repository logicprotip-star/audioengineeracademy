# TEST BOŞLUĞU HARİTASI — 15 Ağustos

_REGRESYON-15-08'in kendi bulgusundan yola çıkarak: 1315 test geçiyor ama
paywall'ın hangi durumda açılacağını doğrulayan SIFIR test var. Bu tur
sadece analiz — kod yazılmadı, test yazılmadı, commit atılmadı._

---

## ÖNCE — TEK CÜMLEDE YAPISAL SORUN

`npm test` = `node --test` (`package.json:"scripts"`), Playwright **proje
bağımlılığı bile DEĞİL** (`package.json`/`package-lock.json`'da yok),
repoda `e2e/`/`playwright/` klasörü YOK. Bu, sadece "paywall test
edilmemiş" değil — **bu güne kadarki HER Playwright doğrulaması (yüzlerce
G-numaralı BİTTİ kaydındaki "Playwright'ta ölçüldü" cümlelerinin HEPSİ)
scratchpad'de yazılıp ATILAN, bir daha ASLA çalışmayan tek-seferlik
script'ler** demek. `test/*.mjs`'in 1315'i SADECE `core/*.js`'teki SAF
fonksiyonları kapsıyor (CLAUDE.md'nin kendi mod sözleşmesi kuralı zaten
bunu talep ediyor: SADECE `createQuestion`/`evaluateAnswer` saf/test
edilebilir olmak ZORUNDA) — `app.js`'in ~9500 satırlık orkestrasyon
katmanı (hangi ekran açılır, hangi buton hangi state'i değiştirir) **hiç
kalıcı test görmüyor**, sadece görev-bazlı, geçici Playwright turlarıyla
doğrulanıyor. Bugünkü "regresyon" (aslında regresyon olmayan, ama
YANLIŞLIKLA öyle sanılan paywall/seans-özeti karışıklığı) bu YAPISAL
boşluğun DOĞRUDAN sonucu — kod hatalı değildi, ama hatalı SANILDI çünkü
"bu davranış NORMAL mi" sorusunu cevaplayacak kalıcı bir kontrol NOKTASI
yok.

---

## 1) Kapsanmayan KRİTİK akışlar

### A. Paywall açılışı (soru hakkı / canlar / ilk oturum bastırması)

**Test edilen (pure, `test/paywall.test.mjs`, 45 test):** `isFirstSession()`,
`isFreeSessionLimitReached()`, `applyLivesRefill()`, `recordSessionAdWatch()`,
`checkModeAccess()`, `PAYWALL_REASONS` yapısı — hepsi `core/paywall.js`'in
SAF fonksiyonları, ayrı ayrı ÇOK İYİ kapsanmış.

**Test EDİLMEYEN:** bu saf fonksiyonların `app.js`'te DOĞRU SIRAYLA/DOĞRU
YERDE çağrılıp çağrılmadığı. Somut boşluklar:
- `openPaywallReason()` (`app.js:8144-8165`) `paywallSuppressedFirstSession`
  true/false iken GERÇEKTEN `#screen-paywall`'u açıyor/açmıyor mu —
  SIFIR test.
- `finalizeIfGameOver()`/`blockIfLivesOut()`/`blockIfSessionLimitReached()`
  (`app.js:1548-1650`) doğru `reasonKey`'le `openPaywallReason()`'u mu
  çağırıyor, yoksa `showSessionEnd()`'e mi düşüyor — SIFIR test.
- Bu YÜZDEN bugünkü karışıklık oldu: kod DEĞİŞMEDİ ama "bu normal mi"
  sorusunu cevaplayacak hiçbir kalıcı referans yoktu.

### B. Reklam ödülü (+5 soru, +1 can, günlük 3 hak)

**Test edilen (`test/ads.test.mjs`, 5 test):** SADECE `pickRewardedAdUnitId()`
— hangi platformda hangi ID kullanılacağı. Ödülün KENDİSİYLE ilgisi yok.

**Test EDİLMEYEN:** `grantAdLife()`/`grantSessionExtension()`/`handleWatchAd()`
(`app.js:8813-8907`) — reklam "başarıyla izlendi" sinyali geldiğinde
`stats.lives`/`sessionExtraQuestionsGranted`/`stats.sessionAdWatchesToday`
GERÇEKTEN doğru artıyor mu, 3. izlemeden SONRA buton (`syncWatchAdButtonForReason`,
`app.js:8121-8137`) GERÇEKTEN gizleniyor mu — SIFIR test. Bu fonksiyonlar
`stats`/`els` modül-seviyesi state'e yazdığı için SAF bir birim testiyle
YAKALANAMAZ, Playwright (ya da en azından mock'lu bir DOM ortamı) şart.

### C. Can dolumu (30 dk, saat manipülasyonu)

**Test edilen — İYİ kapsanmış.** `paywall.test.mjs`'in "can dolumu" bloğu
(satır 203-262) 30dk aralığı, drift'siz ilerleme, tavan aşmama, saat
geriye alınca istismar koruması — HEPSİNİ saf fonksiyon seviyesinde
ölçüyor. **Kalan tek küçük boşluk:** `syncLives()`'ın (`app.js`) bu saf
sonucu GERÇEKTEN ekrana yazıp yazmadığı — düşük risk, çünkü asıl
KIRILGAN kısım (zaman matematiği) zaten sağlam test altında.

### D. Satın alma sonrası Pro durumu

**Test edilen (`test/iap.test.mjs`, 6 test):** SADECE hata mesajı
sınıflandırma (`isUserCancelledError`/`isNetworkError`) ve `PRODUCT_ID`
sabiti. Satın almanın KENDİSİYLE ilgisi yok.

**Test EDİLMEYEN:** `grantRealPro()` (`app.js:8732`) sonrası `isUserPro()`
gerçekten `true` mu dönüyor, `syncAccountLine()`/`syncDevUI()`/rozet-kilit
gösterimi/`#goProBtn` gizlenmesi GERÇEKTEN tetikleniyor mu — SIFIR test.
**Bu, DURUM.md'nin BEKLEYEN KARARLAR "K" maddesiyle (Pro'da "done" ekranı
hiç tetiklenmiyor, kasıtlı mı regresyon mu belirsiz) DOĞRUDAN bağlantılı**
— bir test burada YAZILSA, o belirsizlik de netleşirdi (test ya "done"
ekranının göründüğünü BEKLER ya BEKLEMEZ, ikisi de kod yazılmadan önce
NET bir ürün kararı gerektirir).

### E. Tur / sınav / telafi bitişi ve hangi ekran açılıyor

**Test edilen — ÇOK İYİ kapsanmış (SAF state machine seviyesinde).**
`test/exam-system.test.mjs` (31 test) + `test/exam-coverage.test.mjs`
(5 test) — parkur/kombo/toplam eşik/sınav geç-kal/telafi'nin HEPSİ,
`core/exam-system.js`'in event üretimi düzeyinde kusursuz.

**Test EDİLMEYEN — asıl kırılan katman burası:** `handleExamOutcome()`
(`app.js:2822-2896`) bu event'leri (`exam-offer`/`remedial-start`/
`exam-passed`/... ) DOĞRU EKRANA (`showExamScreen(...)`, `goScreen("exam")`)
çeviriyor mu — SIFIR kalıcı test. **#54 (G214) TAM OLARAK bu katmanda
yaşandı** — `core/exam-system.js` hiç bozulmamıştı, `goToNextRound()`
(app.js) bu katmana hiç UĞRAMIYORDU. G214'ün kendi doğrulaması
(scratchpad'deki `g214_skip_verify.py`) TAM olarak bu boşluğu kapatan bir
script'ti — ama commit'lenmedi, bir sonraki oturumda YOK.
`challenge.done>=10 && !examGateActive() → finishChallenge()`
(`app.js:5301`) yolu da AYNI kategoride SIFIR test.

### F. Ekran yerleşimi (sabit buton, scroll telafisi)

**Hiçbir türde test YOK** — ne birim, ne Playwright, ne görsel.
`#screen-result .scroll`'un `.actionbar`'a (fixed, `styles.css:1554-1561`)
karşı `margin-bottom` telafisi hiç yazılmamıştı (`#screen-game`'de VAR,
`#screen-result`'ta hiç YOK) — bu sınıf hata **metin tabanlı hiçbir
teste hiçbir zaman YAKALANAMAZ**, SADECE geometri (`getBoundingClientRect`)
ya da görsel karşılaştırma yakalar (bkz. madde 3).

---

## 2) Her boşluk için — hangi test, nereye, ne assert edilecek

Kod/test YAZILMADI — aşağıdakiler TARİF, uygulanacak reçete değil.

**Öneri: `test/e2e/` altında, `@playwright/test` (yeni devDependency)
kullanan, `npm test`'ten AYRI bir `npm run test:e2e` komutuyla çalışan
KÜÇÜK bir suite.** (`node --test`'e Playwright'ı zorla sokmak yerine ayrı
komut — `npm test` hâlâ hızlı/senkron kalır, CLAUDE.md'nin "her
değişiklikten sonra npm test" alışkanlığı BOZULMAZ.)

| # | Test | Yer | Assert edeceği |
|---|---|---|---|
| A | "Paywall vs seans özeti — 2×2 matris" | `test/e2e/paywall-flow.spec.mjs` | `stats.rounds=0` VE `stats.rounds>0` durumlarının İKİSİNDE, hem `livesOut` hem `sessionLimit` tetiklenince aktif ekran ID'si + `#paywallReasonTitle`/`#resKicker` metni BEKLENEN değere eşit. (Bugünkü karışıklığı BİR DAHA imkansız kılan test bu — REGRESYON-15-08'de ZATEN yazılıp çalıştırılmış script'in KOMİTLENMİŞ hâli.) |
| B | "Reklam ödülü uygulanıyor" | `test/e2e/ad-rewards.spec.mjs` | `ads.watchRewardedAd` mock'lanıp `{ok:true}` döndürülünce: `livesOut`'ta `stats.lives` +1; `sessionLimit`'te `sessionExtraQuestionsGranted` +5 VE `stats.sessionAdWatchesToday` +1; 3. izlemeden sonra `#watchAdBtn.hidden` |
| D | "Satın alma sonrası Pro state" | `test/e2e/purchase-flow.spec.mjs` | native-purchases mock başarı dönünce `isUserPro()`✅ (dolaylı: `#goProBtn.hidden`, `accountVerLine` metni "Pro" içeriyor) — **KARAR "K" netleşene kadar "done" ekranı assertion'ı YAZILMAMALI**, önce ürün kararı |
| E | "Parkur→sınav/telafi→ekran eşlemesi" | `test/e2e/exam-flow.spec.mjs` | G214'ün kendi doğrulamasının (10+10 Atla) BİREBİR AYNISI — her `handleExamOutcome` dalı (`exam-offer/exam-start/remedial-start/exam-passed/exam-failed/remedial-passed/remedial-failed`) İÇİN ayrı bir `it()`, hangi ekranın/elementin göründüğünü assert eder |
| F | "Sabit buton scroll içeriğini kesmiyor" | `test/e2e/layout-geometry.spec.mjs` | `.actionbar`'ın `getBoundingClientRect().top` DEĞERİ, `.scroll` içindeki SON kartın `getBoundingClientRect().bottom` değerinden BÜYÜK OLMALI (örtüşme yok) — HER `.actionbar` kullanan ekran (`#screen-game`, `#screen-result`, …) için döngüyle |

**Öncelik notu (madde 2'nin kendi içinde):** A ve E en yüksek değer/en
düşük maliyet oranına sahip — İKİSİ de bugün zaten scratchpad'de YAZILMIŞ
script'lerin (`reg_paywall_check.py`, `g214_skip_verify.py`) neredeyse
BİREBİR kopyası, SIFIRDAN tasarım gerekmiyor, sadece "commit'le ve
kalıcılaştır" işi.

---

## 3) Görsel anlık görüntü (visual snapshot) testi

**Kurulabilir mi — evet, teknik olarak.** Playwright'ın kendi
`toHaveScreenshot()`'ı (`@playwright/test` paketiyle gelir) ya da çıplak
`playwright` + piksel-fark kütüphanesi (`pixelmatch`) ile. Bu proje
şu an `@playwright/test`'i DEĞİL, hiçbir Playwright paketini
BAĞIMLILIK olarak taşımıyor — sıfırdan kurulum.

**REGRESYON-15-08'in dört görsel kusurunu otomatik yakalar mıydı? KARIŞIK
cevap — ikisi kesin EVET, biri kesin HAYIR, biri ŞARTLI:**

| Kusur | Görsel snapshot yakalar mıydı? | Neden |
|---|---|---|
| a) Boş kırmızı kutu | **EVET (muhtemelen)** — piksel farkı olarak boş alan görünür, ama SADECE test fixture'ının zoneStats'i "az veri" durumuna GETİRİLDİYSE |
| b) %0/%0 cümlesi | **HAYIR** — snapshot piksel karşılaştırır, METNİN ANLAMSIZ olduğunu bilemez. "İlk çekilen baseline zaten bu hatalı cümleyle çekilmişse" test SÜREKLİ YEŞİL kalır — bunu SADECE `resComment.textContent`'i bilinen bir `zoneStats` fixture'ıyla karşılaştıran bir DOM-içerik testi yakalar (görsel değil, metinsel) |
| c) Sabit buton kesiyor | **EVET** — örtüşen/kesilen içerik doğrudan piksel farkı üretir |
| d) Sızan etiketler | **EVET, ŞARTLI** — SADECE baseline'ın KENDİSİ hatasız çekilmişse. İlk baseline'ı kimse gözle onaylamadıysa (yaygın bir tuzak) hata baseline'a GÖMÜLÜR, bir daha hiç ALARM vermez |

**Kurulum maliyeti (dürüst tahmin, ölçülmedi — proje büyüklüğüne göre
MANTIK yürütüldü):**
- `@playwright/test` devDependency + tarayıcı ikili dosyaları indirme
  (Chromium ~150-300MB) — tek seferlik.
- Baseline PNG'ler git'e **binary dosya** olarak girer — her ekran/durum
  başına bir dosya, repo boyutu büyür, `git diff` bunları OKUYAMAZ (görsel
  inceleme gerekir).
- **Asıl gizli maliyet — bakım:** her KASITLI UI değişikliğinde (yeni bir
  renk, yeni bir metin, bir buton taşınınca) baseline YENİDEN üretilip
  GÖZLE onaylanmalı — bu proje tek kişilik, hızlı iterasyon yapıyor (bir
  günde 15+ commit), her küçük CSS değişikliğinde baseline güncellemesi
  gerçekçi bir sürtünme kaynağı olur.
- CI YOK (bu repo'da `.github/workflows` ya da başka bir CI dosyası hiç
  yok) — tüm testler tek makinede, tek kişi tarafından çalıştırılıyor,
  bu YAZI TİPİ RENDER FARKI riskini AZALTIR (farklı CI runner'lar arası
  piksel kayması olmaz) ama "kimse baseline'ı gözden geçirmedi" riskini
  AZALTMAZ.

**Öneri (görüş, karar değil):** tam piksel-diff yerine önce madde 2'nin F
satırındaki **geometri-tabanlı** test (`getBoundingClientRect`
karşılaştırması, resim YOK) — c/d'yi TAM olarak yakalar, kurulum
maliyeti neredeyse sıfır (yeni bağımlılık gerekmez, mevcut Playwright
kalıbıyla yazılır), bakım yükü yok (piksel değil sayı karşılaştırır).
Tam görsel snapshot'a SADECE bu geometri testleri yetersiz kalırsa (ör.
renk/kontrast/okunabilirlik sorunları) geçilebilir — şimdilik gerekli
değil.

---

## 4) Öncelik — 1.0'a yetişmeli mi, 1.1'e kalabilir mi

| Test | 1.0 | Gerekçe |
|---|---|---|
| **A — Paywall vs seans özeti matrisi** | ✅ **1.0, YAYIN ÖNCESİ ŞART** | Gerçek para/dönüşüm yolu (paywall = gelirin kendisi) — bugünkü karışıklığın KAYNAĞI, yeniden yazımı 20 dakikalık iş (script zaten var) |
| **E — Sınav/telafi ekran eşlemesi** | ✅ **1.0, YAYIN ÖNCESİ ŞART** | #54'ün YAŞANDIĞI TAM katman, script (g214_skip_verify.py) zaten yazılı, SADECE commit'lenmesi gerekiyor |
| **B — Reklam ödülü** | 🟡 **1.0'A GİRERSE İYİ, ama zorunlu değil** | Gelirle ilgili ama mekanizma basit (tek toplama işlemi + kota sayacı), manuel cihaz testinde ZATEN doğrulandı (DEVIR-15-08-SABAH.md: AdMob cihaz testi geçti) |
| **D — Satın alma sonrası Pro** | 🟡 **KARAR "K" netleşmeden YAZILAMAZ** | Önce "done" ekranının Pro'da görünüp görünmeyeceği ürün kararı — test bu karara BAĞIMLI, önce karar |
| **F — Layout geometri (c/d)** | ✅ **1.0'a GİRMELİ, ucuz ve hızlı** | Kurulum maliyeti neredeyse sıfır (yeni bağımlılık yok), tam da bugünkü #4c/#4d sınıfı hataları kalıcı olarak kapatır |
| **C — Can dolumu (kalan küçük boşluk)** | ⬜ **1.1'e kalabilir** | Kırılgan kısım (zaman matematiği) ZATEN sağlam test altında, kalan sadece UI-yansıtma, düşük risk |
| **Tam görsel snapshot (piksel-diff)** | ⬜ **1.1'e kalabilir, hatta ertelenmesi ÖNERİLİR** | Kurulum+bakım maliyeti bu aşamada (hızlı/tek-kişilik iterasyon) getirisinden yüksek; F'nin geometri testleri aynı hataların çoğunu ZATEN yakalıyor |

# OLCUM-SINAV-MIMARI-18-08 — Sınav/telafi mimarisi: iş yükü + risk ölçümü

**Görev tipi:** ÖLÇÜM. Kod değiştirilmedi, commit atılmadı. `git status --short`
bu turun sonunda sadece `ios/App/App.xcodeproj/project.pbxproj`'u (önceki
`cap sync`'ten kalma, DOKUNULMADI) + bu raporu gösteriyor.

---

## 1) MEVCUT YAPI

**`examSystem` NEREDE, NASIL ÖRNEKLENİYOR:** `app.js:971`:
`const examSystem = createExamSystem();` — **TEK, module-level bir örnek**,
uygulama açılışında BİR KEZ kurulur. `createExamSystem()`
(`core/exam-system.js:129-322`, dosya TOPLAM 342 satır) bir FACTORY
fonksiyonu — ÇAĞRILDIĞI HER SEFERDE yeni bir kapalı-değişken (closure)
kümesi üretir, AMA app.js SADECE BİR KEZ çağırıyor, yani PRATİKTE global
tekil (singleton).

**Global mi, mod bazında mı? Kaç durum tutuyor?** **GLOBAL** — mod bazında
DEĞİL. `exam-system.js` İÇİNDE tam **13 durum değişkeni** (hepsi `let`,
tek bir kapalı-değişken kümesinde, kod: satır 134-149):
`modeId, phase, position, parkurCorrect, comboInParkur, examOffered,
examIndex, examCorrect, remedialIndex, remedialCorrect, remedialTier,
examResults, remedialResults` (SON İKİSİ G304'ün bu haftaki eklentisi).
`modeId` KENDİSİ "hangi modun izlendiği" bilgisini tutuyor ama bu bir
İZLEME etiketi — AYRI bir SAKLAMA alanı DEĞİL (yeni mod girildiğinde
`modeId` GÜNCELLENİR ve DİĞER 12 alan SIFIRLANIR, `resetParkur()`,
satır 145-160).

**Hangi veriler kayboluyor?** `resetParkur()`'un sıfırladığı HER ŞEY —
`phase` ("parkur"a döner), `position` (0), `parkurCorrect` (0),
`comboInParkur` (0), `examOffered` (false), `examIndex`/`examCorrect`/
`examResults` (0/0/[]), `remedialIndex`/`remedialCorrect`/`remedialResults`
(0/0/[]), `remedialTier` (null). **Kaybolanlar = "şu anki 10 soruluk
parkurun neresinde olduğun" + "sınav/telafi ortasındaysan hangi soruda,
kaç doğruyla" bilgisinin TAMAMI.**

**⚠️ ÖNEMLİ, GÜVEN VERİCİ bulgu — `examLevel` KAYBOLMUYOR:** kullanıcının
GERÇEK "Sv N" seviyesi (`stats.examState[modeId].examLevel`, `app.js:1365-1371`)
**AYRI bir yapı** — `stats` nesnesinin İÇİNDE, ZATEN mod-bazlı
(`stats.examState[modeId]`), ZATEN kalıcı (`storage.saveStats()` ile HER
cevapta/olayda yazılıyor). **examSystem'in kaybettiği SADECE o ANKİ, YARIM
kalan İLERLEME (parkur pozisyonu/sınav-telafi sorusu) — kullanıcının
KAZANDIĞI seviye/rozet/XP HİÇBİR ZAMAN etkilenmiyor.** Bu, "kırık hâliyle
yayınlanamaz" endişesinin BOYUTUNU netleştiriyor: risk "ilerleme kaybı"
DEĞİL, "yarım kalan bir turun/telafinin sessizce sıfırlanması" (ve B1'in
işaret ettiği "sömürü kapısı" — moddan çıkıp girerek başarısız bir
telafiden BEDAVA kurtulma).

**Mod değişiminde ne siliniyor, ne kalıyor?**
| Silinen (examSystem, module-level) | Kalan (stats, persist) |
|---|---|
| phase/position/parkurCorrect/comboInParkur | examLevel (mod başına) |
| examIndex/examCorrect/examResults | tierStats (mod başına, zayıf-kademe tespiti) |
| remedialIndex/remedialCorrect/remedialResults/remedialTier | XP, rozetler, günlük istatistikler |
| examOffered | `challenge` (BÖLÜM, 10-soru sayacı — AYRI, module-level, AYNI kaderde: mod değişince `freshChallenge()`'a döner, `app.js:2925`) |

---

## 2) NEDEN KAYIT YAPILMIYOR?

**`git log -S` ile bulundu — TEK bir commit, TEK bir gerekçe:** `fd95936`
(**G203**, "#50/#51/#53 düzeltildi", `persistInProgressRound()`'un İLK
yazıldığı commit). Fonksiyonun HEMEN ÜSTÜNDEKİ yorum (kod SATIR SATIR
aynen alındı):

> "#53 — bkz. pauseRound()'un çağrısı. **Bilinçli DAR kapsam (ürün kararı
> GEREKTİRMEYEN bir güvenlik sınırlaması**, bkz. DURUM.md): sınav/telafi
> fazı (examSystem'in KENDİ, **bu turun DOKUNMADIĞI ayrı state makinesi**)
> VEYA Frekans Çakışması'nın "own" ... VEYA aktif kaynak "upload" ...
> **kaydedilmez** — bu senaryolarda kaldığı yerden devam TEKLİF EDİLMEZ,
> mevcut 'session sona erdi' davranışıyla karşılaşılır."

**Bilerek mi, unutulmuş mu?** **BİLEREK.** Yorum satırı KESİN — "ürün
kararı gerektirmeyen bir güvenlik sınırlaması" diye AÇIKÇA nitelendiriyor.
G203'ün KENDİ kapsamı ("#53 — yarım kalan tur kurtarma") sınav/telafi'nin
KENDİ ayrı state makinesini (`examSystem`) HİÇ GENİŞLETMEK istemedi —
"dokunmadığım bir sistemi YARIM/YANLIŞ kaydetmektense, HİÇ kaydetmeyeyim"
mantığı (upload/own-pair'in AYNI gerekçesiyle: decode edilmiş/harici
veri güvenle restore EDİLEMEZ).

**Kaydetmek bir şeyi bozar mı?** **Doğrudan `activeQuestion`'ı kaydetmek
TEK BAŞINA HAYIR bozmaz** (`saveInProgressRound()`, `storage.js:751-753`,
JENERİK bir passthrough — HERHANGİ bir obje şeklini kabul eder, ŞEKİL
kontrolü YOK). **AMA `examSystem`'in KENDİ durumunu (phase/position/vb.)
AYRICA kaydetmeden SADECE `activeQuestion`'ı kaydetmek YANLIŞ/TUTARSIZ bir
restore ÜRETİR** — çünkü `applyRestoredRoundIfAny()` (`app.js:8411-8457`)
satır 8433'te `enterMode(entry, realMode)`'u ÇAĞIRIYOR, bu da KENDİ İÇİNDE
`examSystem.setMode(realMode.MODE_ID)`'yi (`app.js:2891`) tetikliyor —
`modeId` (taze bir `examSystem` örneğinde başlangıçta `null`/farklı
olduğu için) HER ZAMAN değişmiş sayılır, `resetParkur()` ÇAĞRILIR. Yani
restore edilen `activeQuestion` bir "Sınav 3/4" sorusu OLABİLİR ama
`examSystem.phase` YENİDEN "parkur"a döner — **UYUMSUZ bir durum** (soru
sınav zorluğunda ama sistem parkur sanıyor). **Bu yüzden düzeltme SADECE
guard'ı SİLMEKLE YETİNEMEZ — examSystem'in KENDİ durumu da AYRICA
kaydedilip GERİ YÜKLENMELİ (bkz. Yol A).**

---

## 3) İKİ ÇÖZÜM YOLU

### YOL A — Kayıt eklemek

**Kapsam:** SADECE **2 dosya** (`www/js/core/exam-system.js`,
`www/js/app.js`), **~35-45 satır** (tahmini, UYGULANMADI):

1. `core/exam-system.js` — **YENİ İKİ fonksiyon** (`getSnapshot()`/
   `restoreSnapshot(snap)`, returned object'e eklenir): 12 alanı (`modeId`
   HARİÇ — o zaten `saved.modeId`'de ayrıca var) DÜZ bir objeye
   kopyalar/geri yazar. **~15-20 satır.**
2. `app.js:6073` — guard satırı **SİLİNİR** (`if (examGateActive() &&
   examSystem.phase !== "parkur") return;`), `saveInProgressRound(...)`
   çağrısına `examSnapshot: examSystem.getSnapshot()` alanı **EKLENİR**.
   **~2-3 satır değişir.**
3. `app.js:8433` (`applyRestoredRoundIfAny`, `enterMode(entry, realMode)`
   çağrısının HEMEN ARDINDAN) — `if (saved.examSnapshot)
   examSystem.restoreSnapshot(saved.examSnapshot);` **eklenir** (eski
   kayıtlarda bu alan YOK — `if` ile GERİYE DÖNÜK uyumlu, çökme YOK).
   **~2 satır.**

**G203'ün kurtarma mekanizmasına eklenebilir mi?** **EVET — TAM OLARAK bu
mekanizmanın İÇİNE, TEK bir yeni alanla.** `saveInProgressRound()`'un
ŞEKİLSİZ (jenerik) doğası (`storage.js`) buna zaten İZİN VERİYOR, hiçbir
değişiklik GEREKTİRMİYOR.

**Global örnek yapısı buna izin veriyor mu?** **EVET, kısıtlama YOK** —
tek bir `examSystem` örneği olduğu için "hangi mod"un snapshot'ını
alacağını sormaya bile GEREK yok (her zaman "şu an aktif olan").

**Risk:** **DÜŞÜK.** Mevcut hiçbir test `saveInProgressRound`'un ŞEKLİNE
ya da "sınav/telafi kaydedilMEZ" davranışına bağlı DEĞİL (grep ile
doğrulandı — `test/exit-abandons-round-callsites.test.mjs`/
`e2e/recovered-round-audio.spec.mjs` FARKLI şeyleri test ediyor, bu
guard'a hiç değinmiyor). Geriye dönük UYUMLU (eski kayıtlarda alan YOK,
`if` korumalı). **Yeni bir localStorage ŞEMASI/migrasyon GEREKMİYOR** —
sadece MEVCUT `eqEarTrainerProXInProgressRound` objesine bir alan
EKLENİYOR.

### YOL B — Mod bazına taşımak

**⚠️ Ölçüm sırasında ÖNEMLİ bir nüans bulundu — "Yol B" İKİ FARKLI şekilde
uygulanabilir, MALİYETLERİ ÇOK FARKLI:**

**B-1 (NAİF, PAHALI): `examSystem`'i 12 AYRI örnek yapmak**
(`const examSystems = {}; MODE_CATALOG.forEach(m => examSystems[m.id] =
createExamSystem());`) — bu, `app.js`'in **`examSystem.` okuyan HER YERİNİ**
(`examSystem.phase`→`examSystems[mode.MODE_ID].phase` gibi) **DEĞİŞTİRMEYİ**
gerektirir. Grep ile SAYILDI: **38 satırda `examSystem.` geçiyor** (yorumlar
dahil), bunların **~26'sı GERÇEK kod satırı** (app.js:2891, 3134, 3140,
3160, 3173, 3176, 3257, 3263, 3269, 3271, 3288, 4152, 4162, 4164×2, 4177×2,
4351, 6073, 6187, 6195, 6197, 6232×2, 6243). **~26 satır DEĞİŞİR, TEK bir
dosyada (`app.js`)** ama HER satır `mode.MODE_ID`'yi doğru okuyup DOĞRU
örneğe yönlendirmeli — MEKANİK ama HATAYA AÇIK (bir satır UNUTULURSA
sessizce YANLIŞ moda yazan bir kaçak oluşur).

**B-2 (AKILLI, UCUZ): `exam-system.js`'in İÇİNDE bir `Map<modeId,
snapshot>` tutmak, DIŞ API'yi (getter'lar/metodlar) DEĞİŞTİRMEMEK** —
`setMode(id)` artık: (a) `modeId !== id` ise ÖNCE mevcut 12 değişkeni
`perModeState[modeId]`'e KAYDEDER, (b) `perModeState[id]` VARSA ORADAN
YÜKLER, YOKSA taze `resetParkur()`-eşdeğeri bir başlangıç kurar. **`app.js`
TEK SATIR DEĞİŞMEZ** — `examSystem.phase` HÂLÂ ÇALIŞIR, çünkü dışarıdan
BAKAN hâlâ "TEK bir örnek", sadece İÇİNDE artık mod-başına ayrı bir kayıt
var. **Tahmini kapsam: SADECE `core/exam-system.js`, ~40-60 satır**
(perModeState Map'i + setMode()'un save/restore mantığı + resetParkur()'un
"aktif olanı sıfırla" olarak KALMASI).

**Kaç dosya, kaç satır?** B-1: 1 dosya (`app.js`), ~26 satır DEĞİŞİR (hiç
YENİ satır değil, MEVCUT satırların DEĞİŞTİRİLMESİ). B-2: 1 dosya
(`exam-system.js`), ~40-60 satır **EKLENİR** (mevcut kod DEĞİŞMEZ, sadece
`setMode()` genişler).

**Kaç test kırılır?** **TASARIM ANALİZİ (uygulanmadı, KESİN değil):**
B-1 için 36 birim testin (`test/exam-system.test.mjs`) HİÇBİRİ `examSystem`
KAVRAMINA değil `createExamSystem()`'in DÖNDÜRDÜĞÜ tek bir nesneye bakıyor
— B-1 `exam-system.js`'in KENDİ API'sini DEĞİŞTİRMEZ (SADECE app.js'in
onu NASIL ÇAĞIRDIĞINI), yani **bu 36 test TEORİDE kırılmaz** — ama B-1'in
KENDİ doğruluğunu (her app.js satırının DOĞRU örneğe yöneldiğini) test
eden YENİ testler YAZILMALI (mevcutlar bunu KAPSAMAZ). B-2 için: `setMode()`
DAVRANIŞI TEK-mod senaryosunda (36 testin TAMAMI TEK moda `setMode()`
çağırıp OradaN devam ediyor) **AYNI KALIR** (ilk `setMode()` çağrısı zaten
"taze başlangıç" davranışını üretir, B-2'nin Map'i BOŞ başladığı için TEK-
mod akışta fark ETMEZ) — **YÜKSEK güvenle 36 testin HİÇBİRİ kırılmaz**, YENİ
testler (çok-modlu senaryo İÇİN) EKLENMELİ ama bu KIRILMA değil EKLEME.
**⚠️ Bu satır TASARIM ÖNGÖRÜSÜ — gerçek kod yazılıp testler ÇALIŞTIRILMADAN
KESİNLEŞTİRİLEMEZ, BELİRSİZ olarak işaretleniyor.**

**Mevcut kullanıcı verisi etkilenir mi?** **HAYIR, HİÇBİR YOL için.**
`examSystem`'in KENDİSİ ŞU ANA KADAR HİÇ persist EDİLMEDİĞİ için (madde 1)
localStorage'da GÖÇÜRÜLECEK/BOZULABİLECEK bir ESKİ veri YOK — bu TAMAMEN
YENİ bir alan/davranış, geriye dönük MİGRASYON GEREKTİRMİYOR.

**Riski ne?** B-1: ORTA-YÜKSEK (26 el-ile-değiştirilen satır, HER birinin
DOĞRU olması gerekiyor, hata sessiz kalabilir). B-2: DÜŞÜK-ORTA (TEK dosya,
DIŞ API korunuyor, ama `setMode()`'un save/restore mantığı KENDİ İÇİNDE
YANLIŞ bir alanı unutursa — ör. G304'ün YENİ `examResults`/`remedialResults`'ı
kopyalamayı UNUTMAK — SESSİZCE eksik bir snapshot üretir, bu YENİ bir
`test` maddesiyle KİLİTLENMELİ).

---

## 4) HANGİSİ YETERLİ?

**Yol A telafi kaybolmasını çözer mi?** **KISMEN.** B2 (uygulama
kapanıp-açılınca) ve B3'ün (BELİRSİZ senaryo) EPHEMERAL-veri sorununu
ÇÖZER — çünkü BUNLAR "aynı mod, aynı oturum İÇİNDE mi" sorusuna
BAKMIYOR, sadece "localStorage'da bir kayıt var mı" sorusuna bakıyor. **B1
(moddan çıkıp GERİ dönme, SAYFA YENİLENMEDEN) Yol A İLE ÇÖZÜLMEZ** —
çünkü B1 senaryosunda `applyRestoredRoundIfAny()` (Yol A'nın DOKUNDUĞU tek
restore noktası) **HİÇ ÇALIŞMAZ** (sayfa hiç yenilenmedi, bu fonksiyon
SADECE boot-time çağrılıyor) — B1, `enterMode()`'un KENDİ İÇİNDEKİ
`examSystem.setMode()` çağrısının (`app.js:2891`) HER mod değişiminde
`resetParkur()` tetiklemesinden kaynaklanıyor, bu YOL A'NIN HİÇ
DOKUNMADIĞI bir kod yolu.

**İki mod arasında gidip gelme senaryosunu (B4) çözer mi?** **HAYIR,
AYNI SEBEPTEN.** B4 = B1'in çift yönlü hâli, AYNI kök.

**Yol B gerçekten gerekli mi?** **B1/B4'ü çözmek için EVET, ZORUNLU** —
başka bir yol YOK (examSystem TEK örnek olduğu sürece, mod değişiminde
"eski durumu SAKLA" mantığı OLMADAN B1/B4 mimari olarak ÇÖZÜLEMEZ). **AMA
"Yol B" = "B-2" (akıllı, İÇ Map) OLMALI, "B-1" (26 satırlık dış-API
değişimi) DEĞİL** — B-2 AYNI sonucu (mod-başına durum) ÇOK DAHA UCUZA
(tek dosya, DIŞ davranış korunuyor, düşük test-kırılma riski) veriyor.

**SONUÇ:** **Yol A TEK BAŞINA YETERSİZ** (B1/B4 açık kalır). **Yol B (B-2
varyantı) TEK BAŞINA B1/B4'ü çözer AMA B2/B3'ü (uygulama kapanıp-açılma)
ÇÖZMEZ** (B-2'nin Map'i de module-level, sayfa yenilenince SIFIRLANIR) —
**B2/B3 için YOL A'NIN persist mekanizması HÂLÂ GEREKLİ.** **En eksiksiz
çözüm: Yol B (B-2) + Yol A'nın persist katmanı BİRLİKTE** — B-2'nin
`perModeState` Map'inin TAMAMI (tek bir mod snapshot'ı DEĞİL) localStorage'a
yazılır/geri yüklenir. Bu, ayrı ayrı iki iş DEĞİL — B-2 zaten `perModeState`
yapısını KURDUKTAN SONRA, Yol A'nın "serialize/restore" fikrini o YAPIYA
uygulamak KÜÇÜK bir ek (tahminen +10-15 satır, `getSnapshot()` artık TÜM
Map'i, TEK bir mod'u DEĞİL, döndürür).

---

## 5) RİSK

**Düzeltme neyi bozabilir?** Her iki yolda da EN KIRILGAN nokta: G304'ün
BU HAFTA eklediği `examResults`/`remedialResults` (satır sayısı DEĞİL,
İÇERİK olarak YENİ, kolay UNUTULABİLECEK 2 alan) — snapshot/Map
mantığına dahil edilmezse, restore SONRASI Bölüm/sınav çubuğu (G304'ün
KENDİ düzeltmesi) YANLIŞ/eksik sıra gösterebilir. **Bu turun ÖZEL uyarısı:
her iki yolun UYGULAMASI, KABUL KRİTERİNE "restore SONRASI çubuk hâlâ
DOĞRU sırayı gösteriyor mu" testini AÇIKÇA eklemeli.**

**Bugün dokunulan tur yolu (enterMode, pauseRound, çubuk) ile çakışır
mı?** **ÇAKIŞMAZ, TAMAMLAYICI.** OLCUM-GENIS/OLCUM-KESINTI'nin önerdiği
düzeltme (showExamScreen'in 3 "Ana Ekran" handler'ına `pauseRound()`
eklemek) **FARKLI satırları** DEĞİŞTİRİYOR (`app.js:3176/3193/3218`'in
HANDLER GÖVDELERİ — UI/ses temizliği) — Yol A/B **FARKLI satırları**
değiştiriyor (`exam-system.js`'in İÇİ + `persistInProgressRound`/
`applyRestoredRoundIfAny` — VERİ kalıcılığı). **İKİSİ AYNI ANDA, AYRI
commit'lerde UYGULANABİLİR, birbirinin ÖN KOŞULU DEĞİL** — ama İKİSİ DE
UYGULANMADAN "sınav ekranından çıkış" alanı TAM olarak SAĞLAM sayılamaz
(biri UI'ı, diğeri VERİYİ düzeltiyor, İKİSİ de eksikse SORUN sürer).

**Sınav sistemi 12 modda ortak — bir modda düzeltme diğerlerini etkiler
mi?** **EVET, KAÇINILMAZ biçimde — TÜM 12 mod (grep ile doğrulandı,
`EXAM_ENABLED=true` istisnasız) AYNI `exam-system.js`'i, AYNI mekanizmayı
paylaşıyor.** Bu hem AVANTAJ (tek düzeltme 12 modu KAPSAR) hem RİSK (tek
hata 12 modu ETKİLER) — test KAPSAMI en az 3 TEMSİLCİ modu içermeli: bir
TEK-ŞIKLI mod (ör. Boost mu Cut mu), bir THREE-WAY mod (ör. Kompresör —
`submitThreeWayGuess`'in KOŞULSUZ `stopAudio()`'suyla FARKLI bir cevap
yolu), ve Frekans Çakışması (stage-3'ün `stopAudio()` ATLAMASIYLA, AYRICA
OLCUM-GENIS madde A4'ün konusu — potansiyel ETKİLEŞİM noktası, AYRI test
edilmeli).

---

## Net iş yükü + öneri

| | Dosya | Satır (tahmini) | Test kırılması | B1/B4 çözer mi | B2/B3 çözer mi |
|---|---|---|---|---|---|
| **Yol A** | 2 (`exam-system.js`, `app.js`) | ~35-45 | YOK (grep ile doğrulandı) | **HAYIR** | EVET |
| **Yol B-1** (naif) | 1 (`app.js`, 26 satır DEĞİŞİR) | BELİRSİZ (yeni testler gerekir, mevcutlar TEORİDE sağlam) | EVET | HAYIR (tek başına) |
| **Yol B-2** (akıllı Map) | 1 (`exam-system.js`, ~40-60 satır EKLENİR) | YÜKSEK güvenle YOK (BELİRSİZ, doğrulanmadı) | EVET | HAYIR (tek başına) |
| **Yol B-2 + A'nın persist'i** | 2-3 dosya, ~60-90 satır | YÜKSEK güvenle YOK | EVET | EVET |

**ÖNERİ:** **Yol B-2 + Yol A'nın persist katmanı, TEK bir birleşik iş
olarak.** Gerekçe: Yol A tek başına B1/B4'ü (kullanıcının muhtemelen EN SIK
karşılaşacağı — "telafiden kaçmak için moddan çık" — senaryo) HİÇ
ÇÖZMÜYOR; B-1 riskli/pahalı; B-2 tek başına UYGULANMASI B-1'den DAHA UCUZ
VE DÜŞÜK riskli olduğu için, B2/B3'ü de KAPSAYACAK şekilde GENİŞLETMEK
(persist katmanını B-2'nin Map'ine bağlamak) EK maliyeti DÜŞÜK (+10-15
satır) bir sonraki ADIM. **Toplam tahmini iş yükü: 2-3 dosya, ~60-90 satır,
mevcut testlerin KIRILMASI beklenmiyor (YÜKSEK güven, kod yazılıp
ÇALIŞTIRILMADAN KESİN değil) + YENİ testler (çok-modlu senaryo, restore-
sonrası çubuk doğruluğu) gerektirir — 6 günlük yayın penceresi İÇİN
YAPILABİLİR görünüyor ama BU TAHMİN gerçek uygulamayla DOĞRULANMALI,
kod bu turda YAZILMADI.**

**⚠️ Kalan BELİRSİZLİK:** B3'ün (canlar bitince telafi) gerçek senaryosu
hâlâ ölçülmedi (OLCUM-KESINTI'nin kendi notu — Pro'da can HİÇ tükenmiyor,
senaryo NEREDEYSE imkânsız) — bu, Yol B'nin KAPSAMINA girmeli mi, ayrı bir
ÜRÜN kararı mı GEREKTİRİR, netleşmedi.

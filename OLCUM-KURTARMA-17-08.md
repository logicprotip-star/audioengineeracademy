# OLCUM-KURTARMA-17-08

GÖREV: ÖLÇÜM. KOD YAZMA, COMMIT ATMA.

Cihazda görüldü: Ana ekrandan çıkış yapıldı (aktif tur yoktu), uygulama
tekrar açılınca Frekans Çakışması modundan başladı — kurtarma mekanizması,
kurtarılacak bir tur olmadığı halde devreye girip yanlış modu açtı.

**SONUÇ (özet, ayrıntı aşağıda):** Kök sebep bulundu ve Playwright'ta
**minimal senaryoyla (backgrounding bile GEREKMEDEN) tekrar üretildi.**
Bug, kurtarma mekanizmasının (G203) OKUMA tarafında DEĞİL — "geri" (Çık)
düğmesinin YAZMA/TEMİZLEME tarafında. `www/js/app.js:performExit()`
(satır 7194-7197) ve `openExitConfirm()`/`exitConfirmLeave` (satır
7207-7228) — kullanıcı oyun ekranında "geri"ye basıp exit-confirm
diyaloğunda **"Çık"ı (Evet) onayladığında**, `activeQuestion` **HİÇBİR
ZAMAN `null`'a çekilmiyor** — sadece duraklatılıyor (`pauseRound()`) ve
menüye dönülüyor. Kullanıcı menüde "aktif tur yok" GÖRÜYOR (ekran boş)
ama KOD hâlâ o turu "duraklatılmış, devam ettirilebilir" sayıyor —
`eqEarTrainerProXInProgressRound` kaydı GEÇERLİ/TAZE kalıyor. Bir
sonraki soğuk başlatmada G203'ün "3 saatten taze kayıt sessizce geri
yüklenir" kuralı bu kaydı bulup DOĞRUDAN o modun oyun ekranını açıyor.

---

## 1) Kurtarma hangi state'e bakıyor?

**Anahtar:** `eqEarTrainerProXInProgressRound` (`www/js/core/storage.js:23`,
`IN_PROGRESS_ROUND_KEY`).

**Şekil** (storage.js:657-658 yorumu + gerçek Playwright çıktısıyla
doğrulandı): `{ modeId, activeQuestion, timeLeft, roundDuration, savedAt }`.

**Ne zaman yazılıyor:** `persistInProgressRound()` (app.js:5880-5892) —
`activeQuestion` doluysa (ve sınav/telafi fazında değilse, Frekans
Çakışması'nın "own" (iki kendi dosyası) çiftinde değilse, kaynak
"upload" değilse) `storage.saveInProgressRound({modeId: mode.MODE_ID,
activeQuestion, timeLeft: roundFlow.timeLeft, roundDuration:
roundFlow.roundDuration, savedAt: Date.now()})` çağırır. Bu fonksiyon
`pauseRound()`'un (app.js:5816-5869) SON satırı — yani **HER
`pauseRound()` çağrısı otomatik olarak bu kaydı da tazeler.**

**G203'ün 3 saat sınırı:** `IN_PROGRESS_ROUND_STALE_MS = 3 * 60 * 60 *
1000` (app.js:8134). Boot'ta `applyRestoredRoundIfAny(saved)`
(app.js:8136-8182): `ageMs = Date.now() - saved.savedAt`; `ageMs > 3sa`
ise kayıt silinir + "Önceki oturum sona erdi" toast'ı + menü. **Taze**
(≤3sa) ise `entry`/`realMode` geçerliyse `enterMode(entry, realMode)`
ile **doğrudan o modun oyun ekranına girilir** (`goScreen("menu")`
BU dalda HİÇ ÇAĞRILMAZ) — `activeQuestion = saved.activeQuestion`,
`roundActive = true`, `autoStopped = true` (ses otomatik başlamaz,
"Tekrar Çal" bekler).

## 2) Ana ekrana dönüldüğünde bu state temizleniyor mu?

**Hayır — SADECE bazı yollarda, "geri" (Çık) yolunda DEĞİL.**

`goScreen("menu")` fonksiyonunun kendisi (app.js:2511-2563)
`eqEarTrainerProXInProgressRound`'a HİÇ DOKUNMUYOR — sadece DOM ekran
sınıflarını değiştiriyor (dosyanın kendi "dayanıklılık taraması" yorumu
SADECE "tools"/"paywall" ekranlarından çıkışı kapsıyor, "game"
ekranından çıkışı KAPSAMIYOR).

Temizleme SORUMLULUĞU çağıran tarafın (her bir "menüye dön" handler'ının)
kendisinde — ve **tutarsız:**

| Yol | `activeQuestion=null` + `clearInProgressRound()` yapıyor mu? | Kanıt |
|---|---|---|
| "Durdur" (toggleStart'ın durdurma dalı) | ✅ EVET | app.js:6188-6189 |
| `finishChallenge()` (10 Soruluk Bölüm normal biter) | ✅ EVET | app.js:6205-6206 |
| `teardownActiveRound()` (can/soru hakkı biter) | ✅ EVET | app.js:1657-1658 |
| **`performExit()` → "geri" → exit-confirm → "Çık"** | ❌ **HAYIR** | app.js:7194-7228 (ayrıntı madde 3) |
| `quitGameBtn` ("Oyundan çık", ayarlar sheet'i) | ❌ **HAYIR** (AYNI kalıp) | app.js:7684-7688 |

## 3) Neden Frekans Çakışması açıldı?

**En son "geri" ile (aktif turu YARIDA bırakarak) çıkılan mod oydu** —
varsayılan bir mod DEĞİL, kayıtta AÇIKÇA o modun `activeQuestion`'ı
yazıyordu. Playwright'ta BİREBİR doğrulandı (madde 6):

1. Frekans Çakışması'nda round başlatıldı (`activeQuestion.mode="cakisma"`).
2. `#backBtn` → exit-confirm dialog AÇILDI (bu an, `openExitConfirm()`
   ÇALIŞTIĞI AN — `pauseRound()`'u ZATEN çağırıyor, kullanıcı henüz
   "Çık" bile DEMEDEN).
3. `#exitConfirmLeave` ("Çık", Evet) tıklandı.
4. Ekran `screen-menu` oldu — **ama `activeQuestion` HÂLÂ doluydu**
   (`window.__aeaActiveQuestionChoices()` null DEĞİL döndü).
5. `localStorage.eqEarTrainerProXInProgressRound` **TAM/GEÇERLİ bir
   kayıt** taşıyordu: `{"modeId":"frekans-cakismasi", "activeQuestion":
   {...gerçek soru...}, "savedAt": <o anki Date.now()>}`.
6. Sayfa YENİDEN yüklendi (soğuk başlatma simülasyonu) → **aktif ekran
   `screen-game` çıktı** (Frekans Çakışması'nın kendisi).

## 4) G274 (goScreen düzeltmesi) bunu etkiledi mi?

**Hayır, alakasız.** G274 SADECE 5 `goScreen("home")` (var olmayan bir
ekran id'si) çağrısını `goScreen("menu")`'ye düzeltti — hepsi sınav
ekranının (`showExamScreen`) ikincil butonları + `progStartFreqBtn`
(DURUM.md G274 kaydı, `git show a9e010b`). `performExit()`/`backBtn`/
`exitConfirmLeave` bu 5 çağrının HİÇBİRİNDE yok — o zaman da ŞİMDİ de
"menu" doğru yazıyordu, G274'ün DOKUNDUĞU/DOKUNMADIĞI hiçbir satır bu
bug'ı ETKİLEMEDİ. Ekran adı HER ZAMAN doğruydu (`screen-menu` görünüyordu)
— sorun ekran GÖRÜNÜMÜNDE değil, `activeQuestion`/localStorage'ın
GÖRÜNMEYEN iç durumunda.

## 5) AYNI KALIP BAŞKA NEREDE

**Uygulama kapanırken/arka plana alınırken yazılan TEK kalıcı "devam"
anahtarı** `eqEarTrainerProXInProgressRound` — grep ile doğrulandı,
başka bir "resume/pending" localStorage anahtarı YOK
(`paywallEndedRoundForResume`/`sheetPausedRound`/`exitConfirmPausedRound`/
`gameSettingsPausedRound`/`guideSheetPausedRound` hepsi SADECE bellek-içi
`let` değişkeni, sayfa yenilenince doğal olarak sıfırlanıyor — kalıcı
DEĞİLLER, bu riski TAŞIMIYORLAR).

AYNI YAPISAL boşluk (temizlemeyen "geri"/"çık" yolu) **madde 2'deki
tabloda görüldüğü gibi İKİ yerde**: `performExit()` (backBtn + exit-confirm)
VE `quitGameBtn` ("Oyundan çık", ayarlar sheet'i, app.js:7684-7688 —
`if (activeQuestion && !autoStopped) pauseRound(); goScreen("menu");`
BİREBİR AYNI desen, activeQuestion HİÇ null'lanmıyor). İkisi de TEK bir
kök nedenin (performExit/quitGameBtn "Çık"ı `activeQuestion=null` +
`clearInProgressRound()` YAPMIYOR) iki farklı çağrı noktası — AYRI AYRI
iki bug değil, aynı boşluğun iki tetikleyicisi.

**Diğer taraf (ekran-bazlı "dayanıklılık taraması", madde 2):**
`goScreen()`'in kendisi "tools"/"paywall" ekranlarından çıkışı GENEL
olarak temizliyor (G159/madde başındaki yorum) — "game" ekranı bu genel
temizliğin DIŞINDA bırakılmış, madde 2'nin tablosundaki 3 "doğru" yol
(Durdur/finishChallenge/teardownActiveRound) bunu KENDİ BAŞLARINA telafi
ediyor ama "geri"yi ETMİYOR.

## 6) Playwright'ta tekrar üretilebiliyor mu?

**EVET — hem task'ın verdiği senaryoyla (backgrounding dahil) hem DAHA
MİNİMAL bir senaryoyla (backgrounding'e bile GEREK YOK).**

**Senaryo A (task'ın verdiği, tam):** Frekans Çakışması'nda oyna →
`#backBtn` → `#exitConfirmLeave` ("Çık") → `document.hidden=true` +
`visibilitychange` dispatch (arka plana alma simülasyonu) → sayfa
reload (soğuk başlatma). **Sonuç: `screen-game` (Frekans Çakışması)
açılıyor, `screen-menu` DEĞİL.**

**Senaryo B (minimal, backgrounding YOK):** Aynı → `#backBtn` →
`#exitConfirmLeave` → **DOĞRUDAN** sayfa reload (backgrounding adımı
ATLANDI). **Sonuç AYNI: `screen-game` açılıyor.** Bunun sebebi:
`persistInProgressRound()` `openExitConfirm()`'in İÇİNDE, dialog
AÇILDIĞI ANDA (kullanıcı "Çık" bile DEMEDEN) zaten çalışıyor — yazma
ANINDA/senkron, backgrounding'i BEKLEMİYOR.

İki script de bu turda ÇALIŞTIRILDI, GÖZLEMLENDİ, sonra SİLİNDİ (görev
"KOD YAZMA, COMMIT ATMA" — kalıcı bir test dosyası EKLENMEDİ, sadece
tek seferlik doğrulama scriptiydi).

---

## SONUÇ

**Kök sebep:** `www/js/app.js`'te `performExit()` (satır 7194-7197) ve
`quitGameBtn`'in click handler'ı (satır 7684-7688) — kullanıcı aktif
bir turdayken "geri"/"Oyundan çık" ile BİLEREK/AÇIKÇA menüye
döndüğünde, `pauseRound()` (→`persistInProgressRound()`) çağrılıp tur
"duraklatılmış, devam ettirilebilir" olarak KAYDEDİLİYOR ama
`activeQuestion` HİÇBİR ZAMAN `null`'a ÇEKİLMİYOR ve
`storage.clearInProgressRound()` HİÇ ÇAĞRILMIYOR — "Durdur"/
`finishChallenge()`/`teardownActiveRound()`'ın AKSİNE (madde 2 tablosu).
Kullanıcı menüde "aktif tur yok" GÖRÜYOR ama kod hâlâ TERSİNİ
düşünüyor. Bir sonraki soğuk başlatmada G203'ün 3-saat-taze kuralı bu
YANLIŞ POZİTİF kaydı GEÇERLİ sanıp doğrudan o modun oyun ekranını açıyor.

**Dosya:satır:**
- `www/js/app.js:7194-7197` (`performExit`)
- `www/js/app.js:7207-7228` (`openExitConfirm`/`closeExitConfirm`/`exitConfirmLeave` dinleyicisi)
- `www/js/app.js:7684-7688` (`quitGameBtn` dinleyicisi — AYNI kalıp)
- `www/js/app.js:8136-8182` (`applyRestoredRoundIfAny` — OKUMA tarafı, KENDİSİ DOĞRU çalışıyor, madde 6'nın kanıtladığı gibi SUÇLU DEĞİL)

**Düzeltme yolu (İKİ aday, ürün kararı gerektiriyor — kod YAZILMADI):**

- **Aday A (basit, düşük risk):** "Çık" onaylandığında (`exitConfirmLeave`
  handler'ında, `performExit()` ÇAĞRILMADAN HEMEN ÖNCE/SONRA) VE
  `quitGameBtn` handler'ında, "Durdur"un AYNI deseniyle
  `activeQuestion = null; storage.clearInProgressRound();` eklenir —
  "geri ile Çık" "Durdur"la AYNI/eşdeğer bir "turu terk et" eylemi
  sayılır. Bu, G203'ün "backgrounding'de kaldığı yerden devam" özelliğine
  DOKUNMAZ (o hâlâ `visibilitychange`/pauseRound üzerinden çalışır) —
  SADECE kullanıcının AÇIKÇA "Çık" dediği anı ayırt eder.
- **Aday B (mevcut "aynı oturumda geri dönünce devam eder" davranışını
  KORUR, daha karmaşık):** Kayda "kullanıcı BİLEREK mi çıktı yoksa
  SİSTEM mi araya girdi" bilgisini taşıyan EK bir alan eklenir (ör.
  `exitedViaBackButton: true`), boot-time recovery bu alanı görürse
  (SADECE görünürde boş bir menüden kapanmış, kullanıcı zaten
  "terk etmiş" sayılır) kaydı GEÇERSİZ sayar. Aday A'dan daha fazla
  tasarım/test yükü.

Bu iki aday arasındaki seçim (ve "Çık"ın davranışını DEĞİŞTİRMENİN kendisi)
**ürün kararı** — bu turda UYGULANMADI, sadece raporlandı.

**Risk (her iki aday için de düşük):** Değişiklik `performExit()`/
`quitGameBtn`'in KENDİ dosyasında, "Durdur"un ZATEN kanıtlanmış AYNI iki
satırının (activeQuestion=null + clearInProgressRound()) BAŞKA bir çağrı
noktasına EKLENMESİ — G203'ün "aktif tur varken kaldığı yerden devam"
davranışına (backgrounding/visibilitychange yolu) DOKUNMUYOR, SADECE
"kullanıcı AÇIKÇA Çık dedi" durumunu AYRIŞTIRIYOR.

⚠️ Bu tur SADECE ölçüm — kod yazılmadı, dosya değiştirilmedi, commit
atılmadı.

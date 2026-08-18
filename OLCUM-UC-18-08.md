# OLCUM-UC-18-08

Üç ayrı ölçüm. KOD YAZILMADI, DOSYA DEĞİŞTİRİLMEDİ, COMMIT ATILMADI.
Doğrulanabilenler Playwright/Node ile GERÇEKTEN çalıştırılıp ölçüldü
(A bölümü), doğrulanamayan/emin olunmayan yerler açıkça BELİRSİZ
işaretlendi.

---

# A) PLAY/PAUSE İKONU BOZULMASI 🔴

## Kök sebep — ÖLÇÜLDÜ, Playwright'ta TAM olarak tekrar üretildi

**Bulgu: `updateStartBtnLabel()` (`www/js/app.js:2322-2360`) ikon durumunu
`currentLives`'a bakarak seçiyor, `isUserPro()`'ya HİÇ bakmıyor:**

```js
// www/js/app.js:2330-2337
if (!activeQuestion || currentLives <= 0) {
  els.startBtn.textContent = "▶";
  els.startBtn.setAttribute("aria-label", "Oyunu Başlat");
  ...
  return;
}
// buraya ULAŞILIRSA (activeQuestion VAR ve currentLives>0):
els.startBtn.textContent = autoStopped ? "▶" : "⏸";
```

Bunun karşılaştırması `blockIfLivesOut()` (`app.js:1630-1634`):
```js
function blockIfLivesOut() {
  if (isUserPro() || currentLives > 0) return false;
  ...
}
```
— **`blockIfLivesOut()` `isUserPro()`'yu kontrol ediyor, `updateStartBtnLabel()`
ETMİYOR.** Bu ikisinin arasındaki asimetri kökün kendisi.

**Zincirleme mekanizma (hepsi kod okunarak + Playwright'ta izlenerek doğrulandı):**

1. Canlar biterken (`currentLives` `loseLife()` ile 0'a düşer, `app.js:1587`)
   soru zaten normal şekilde bitmiştir (`audioEngine.stopAudio()` submit
   handler'ın kendi içinde ÇAĞRILMIŞTIR — ses GERÇEKTEN durur, bu adımda
   bug YOK).
2. `finalizeIfGameOver()` (`app.js:1680`) `teardownActiveRound()`'u
   (`app.js:1657`) çağırır — `activeQuestion=null` olur, `#startBtn`
   "▶"/"Oyunu Başlat" gösterir (BU AN İÇİN DOĞRU, round gerçekten yok).
   **AMA `teardownActiveRound()` `#feedbackOverlay`'i KAPATMIYOR** —
   `pauseRound()`'un (`app.js:5934-5935`) yaptığı
   `els.feedbackBox.classList.remove("show-result")`/`feedbackOverlay.
   classList.remove("open")` satırları burada YOK (ayrı bir bulgu, aşağıda).
3. `openPaywallReason("livesOut")` paywall'ı açar, `cfg.endsRound=true`
   olduğu için `paywallPausedRound=false` — `pauseRound()`/`resumeRound()`
   çifti bu yolda HİÇ devreye girmiyor.
4. Satın alma (`grantRealPro()`, `app.js:9586-9594`) SADECE
   `purchaseState.proPurchased=true` yapıp `syncDevUI()`'ı çağırıyor.
   **`syncDevUI()` (`app.js:9109-9138`) `currentLives`'ı YENİDEN OKUMUYOR,
   `updateStartBtnLabel()`'ı da HİÇ ÇAĞIRMIYOR** — `renderExerciseGrid`/
   `renderAnalysis`/`renderDailyTip`/`renderFaq`/`enforceFreeRestrictions`/
   `applyProLockVisibility`/`syncAccountLine` çağırıyor, bu YEDİSİNİN
   HİÇBİRİ `currentLives`'a dokunmuyor.
5. `goBack()` (`screenStack` tabanlı) kullanıcıyı `screen-game`'e geri
   döndürüyor — **`currentLives` HÂLÂ 0** (Pro olsa da, hiçbir kod bu
   sayıyı satın alma anında dolduruyor/geçersiz kılmıyor).
6. Kullanıcı, HÂLÂ AÇIK olan `#feedbackOverlay`'i (madde 2) kapatmak için
   `#feedbackClose`'a ("X") basar — bu `goToNextRound()`'u (`app.js:6999`)
   tetikler, o da `startRound()`'u (`app.js:6009`) çağırır. `startRound()`
   `blockIfLivesOut()`'u KENDİ İÇİNDE çağırır (`isUserPro()` TRUE olduğu
   için ENGELLENMEZ) — round GERÇEKTEN başlar, ses GERÇEKTEN çalar
   (`stopAudioCallCount` artışı + `[audio-diag] zincir kuruldu, play
   başladı` konsol kaydıyla DOĞRULANDI).
7. `startRound()` kendi içinde `updateStartBtnLabel()`'ı ÇAĞIRIYOR
   (`app.js:6168`) — AMA bu çağrı anında `currentLives` HÂLÂ 0 olduğu
   için fonksiyon YİNE ilk (`!activeQuestion || currentLives<=0`) dala
   düşüyor ve **"▶"/"Oyunu Başlat" YAZMAYA DEVAM EDİYOR** — round aktif
   ve ses GERÇEKTEN çalarken.

**Playwright ölçümü (Kompresör, `stats.lives:1`, gerçek NativePurchases
mock'u, gerçek yanlış cevap → gerçek satın alma → gerçek `#feedbackClose`
tıklaması):**

| An | `activeQuestion` | `stopAudioCallCount` | `#startBtn` metni |
|---|---|---|---|
| Yanlış cevap sonrası (paywall açıldı) | yok | 4 | "▶" (doğru — round yok) |
| Satın alma sonrası, dönüş | yok | 4 | "▶" (doğru — round yok) |
| `#feedbackClose`'a basıldıktan sonra | **VAR** | **5** (yeni zincir kuruldu, konsolda "play başladı" doğrulandı) | **"▶" (YANLIŞ — round aktif, ses çalıyor)** |

Bu, kullanıcının tarif ettiği "ses çalıyor ama pause ikonu görünmüyor"
BİREBİR aynı durum.

## AYRI, YAN BULGU (istenmeden bulundu): `#feedbackOverlay` satın alma
sonrası AÇIK KALIYOR, ekranı kilitliyor

`teardownActiveRound()`'da (`app.js:1657-1679`) `#feedbackOverlay`/
`#feedbackBox`'ı kapatan satır YOK — `pauseRound()`'un (`app.js:5934-5935`)
sahip olduğu iki satır burada eksik. Playwright'ta ölçüldü: satın alma
sonrası dönülen ekranda `#feedbackOverlay.open` class'ı HÂLÂ TAKILI —
`#startBtn`'e normal (force olmayan) bir tıklama bu overlay tarafından
ENGELLENİYOR (Playwright: "element is not visible... feedbackOverlay
intercepts pointer events"). Kullanıcının "Play'e basınca ses geliyor"
demesi muhtemelen `#feedbackClose`'a ("X") basmasından geliyor — o buton
overlay'in KENDİSİNİN İÇİNDE olduğu için tıklanabilir kalıyor, dolaylı
olarak yeni bir round başlatıyor.

## G277 ile karşılaştırma — FARKLI kök, AYNI ÜST SINIF

**G277'nin kökü** (`DURUM.md` satır 594-630): kart-üstü play kontrolleri
ses ZİNCİRİNİN ZATEN KURULU olduğunu VARSAYIYORDU — round-KURTARMA yolu
zinciri BİLEREK ERTELEDİĞİ için bu varsayım BOZULUYORDU (`chainNeedsRebuild()`
kontrolü YOKTU, eklendi).

**Bu bug'ın (A) kökü:** ikon-güncelleme fonksiyonu (`updateStartBtnLabel`)
GERÇEK oynatma durumunu DEĞİL, satın alma sonrası YENİLENMEYEN bir yardımcı
değişkeni (`currentLives`) okuyor — zincir kurulumuyla İLGİSİZ, SAF bir
"UI durumu senkron değil" sorunu.

**Ortak nokta — İKİSİ DE aynı GENEL AİLEDEN:** "bir durum geçişi (round
kurtarma / Pro satın alma) BAZI UI/audio yüzeylerinin VARSAYDIĞI ön koşulu
BOZUYOR, ama o yüzey bunu FARK ETMİYOR." Kök MEKANİZMA farklı, HASTALIK
AİLESİ aynı — kod tabanında bu aile DAHA ÖNCE de (aşağıya bkz.) tekrar
tekrar görülmüş.

## "AYNI KALIP" taraması — Pro'ya geçişte GÜNCELLENMEYEN diğer UI durumları

`syncDevUI()`'nin (`grantRealPro()`'nun ÇAĞIRDIĞI TEK fonksiyon) KENDİ kod
yorumları BİLE bu kalıbı ÜÇ KEZ daha belgeliyor (`app.js:9116-9137`):
G186/#36'da "İsabet Grafiği/Zayıf Bölge Raporu" ve "Bugünün Önerisi",
Bug#40'ta FAQ'ın "Canlar" maddesi AYNI sebepten (Pro durumu değişince
YENİDEN ÇİZİLMİYOR) tek tek bulunup `syncDevUI()`'a EKLENMİŞ. Bu turda
KOD OKUNARAK bulunan, HÂLÂ AÇIK olan İKİ YENİ örnek:

1. **`updateStartBtnLabel()`** — yukarıdaki asıl bug. `syncDevUI()`'nin
   ÇAĞIRDIĞI 7 fonksiyonun HİÇBİRİ bunu tetiklemiyor.
2. **`renderHearts()`** (`app.js:1528-1548`) — `currentLives`'a göre kalp
   ikonlarını çiziyor, `isUserPro()`'ya HİÇ bakmıyor. `updateUI()`
   (`app.js:3461-3499`) tarafından çağrılıyor ama `updateUI()` da
   `syncDevUI()`'nin çağırdıkları arasında YOK. **BELİRSİZ**: Pro'da
   kalpler UI'da tamamen GİZLENİYOR olabilir (CSS/başka bir kontrol) —
   bu tur BUNU doğrulamadı, sadece `renderHearts()`'ın kendisinin
   `isUserPro()` FARKINDA OLMADIĞINI doğruladı.

**Genel örüntü:** `syncDevUI()` "Pro oldu, hangi EKRAN/PANEL'in içeriği
değişti" sorusuna cevap veriyor (7 render fonksiyonu), ama "hangi ANLIK
OYUN DURUMU (round aktif mi, ses çalıyor mu, kaç can gösteriliyor)
değişti" sorusuna HİÇ cevap vermiyor — bu İKİNCİ kategori sistematik
olarak atlanıyor gibi görünüyor (3 geçmiş örnek + 2 yeni örnek, hepsi
BİRİNCİ kategoriden DEĞİL).

## Öneri (KOD YAZILMADI — sadece yön)

- `updateStartBtnLabel()`'ın guard'ı `blockIfLivesOut()`'un AYNI mantığını
  kullanmalı: `!activeQuestion || (!isUserPro() && currentLives <= 0)`.
- `teardownActiveRound()`'a `pauseRound()`'un feedback-overlay-kapatma
  satırları eklenmeli (ayrı bulgu, ama AYNI teardown fonksiyonunun
  eksikliği).
- `grantRealPro()`/`syncDevUI()`'a `currentLives = stats.lives;
  updateStartBtnLabel(); renderHearts();` eklenmeli.
- Daha genel: `syncDevUI()`'ın "hangi fonksiyonları çağırması gerektiği"
  LİSTESİ elle bakılıp büyütülmüş — her Pro-durumu-bağımlı UI parçası
  TEK TEK bulunup eklenmiş (G186/#36/Bug40/bu tur). Bu ÖRÜNTÜ tekrar
  edecek gibi duruyor; KOD YAZMADAN sadece not: `isUserPro()`'ya bakan
  TÜM render/guard fonksiyonlarının (grep: kod tabanında ~40+ çağrı yeri)
  TEK bir merkezi listede toplanıp `syncDevUI()`'ın bu listeyi
  DÖNGÜYLE çağırması, "bir tane daha unutulur" riskini yapısal olarak
  azaltabilir — bu bir ÜRÜN/mimari kararı, burada VERİLMEDİ.

## İş yükü / risk

- Ana düzeltme (guard + 3 satır): 1 dosya (`app.js`), ~5-8 satır.
- Feedback-overlay kapatması: AYNI dosya, ~2 satır.
- Risk: DÜŞÜK — değişiklik `updateStartBtnLabel()`/`teardownActiveRound()`
  gibi ZATEN sık çağrılan, iyi test edilmiş fonksiyonlara ufak, izole
  ekler; mevcut davranışı (Pro OLMAYAN, canlar>0 olan normal akış)
  DEĞİŞTİRMEZ (guard'ın `!isUserPro()` şartı sadece Pro-VE-canlar-0
  kombinasyonunu ayırıyor).
- `renderHearts()`/Pro etkileşimi BELİRSİZ bırakıldı — düzeltmeden önce
  ayrıca doğrulanmalı (Pro'da kalp satırı tamamen gizli mi?).

---

# B) ZORLUK EĞRİSİ DEĞİŞİM MALİYETİ

## Nerede tanımlı — ÜÇ KATMAN, HEPSİ mod-başına AYRI

1. **`DIFFICULTY`** (statik, 5 kademe: easy/medium/hard/pro/proplus) —
   **12 modun 12'sinde de KENDİ tablosu var** (grep ile doğrulandı,
   satır aralıkları: frekans-bulma.js:38, kesim-noktasi.js:64,
   q-genisligi.js:143, boost-mu-cut-mu.js:75, db-seviyesi.js:81,
   kompresor.js:192, reverb.js:148, tonal-denge.js:159,
   frekans-cakismasi.js:110, distortion.js:199, pan-konumu.js:46,
   stereo-genislik.js:82) — her biri ~5-8 satır, "Sabit" zorluk modunda
   VE sınavda ("pro" kademesi) kullanılıyor.
2. **`<MOD>_CURVE_CONFIG`** (sürekli, "Otomatik" zorluk eğrisi) — **12
   modun 12'sinde de KENDİ config'i var** (`FREKANS_CURVE_CONFIG`,
   `KESIM_CURVE_CONFIG`, `Q_CURVE_CONFIG`, `BOOSTCUT_CURVE_CONFIG`,
   `DB_CURVE_CONFIG`, `COMP_CURVE_CONFIG`, `REVERB_CURVE_CONFIG`,
   `TONAL_CURVE_CONFIG`, `CAKISMA_CURVE_CONFIG`, `DISTORTION_CURVE_CONFIG`,
   `PAN_CURVE_CONFIG`, `WIDTH_CURVE_CONFIG`) — kendi AT_1/AT_CAP
   değerleri, ORTAK matematiği (`logLerp`/`applyPostCapFloor`)
   `www/js/core/difficulty-curve.js`'ten (250 satır) İTHAL EDİYOR.
3. **`DIFFICULTY_CONFIG`** (`difficulty-curve.js`, paylaşılan/genel) —
   SADECE 4 dosyada DOĞRUDAN referans veriliyor (`app.js`,
   `core/session-plan.js`, `difficulty-curve.js`'in kendisi,
   `kesim-noktasi.js` — bu SONUNCUSU KENDİ `TIER_BOUNDARIES`'ini
   override ediyor, satır 96 civarı "BİLEREK KENDİ ALANI" notu).

**Toplam yüzey:** 12 mod dosyası (toplam **8.701 satır**, `wc -l`
ile ölçüldü — bu TÜM mod dosyalarının TOPLAM boyutu, sadece zorluk
kısmı DEĞİL) + `difficulty-curve.js` (250 satır) + `session-plan.js`.

## Bir modun eğrisini değiştirmek diğerlerini ETKİLEMİYOR — ÖLÇÜLDÜ

`paramsForDifficultyPosition(position, config=<MOD>_CURVE_CONFIG)` HER
modda KENDİ config'ini parametre alıyor (`kompresor.js:229` örneği
okunarak doğrulandı: `kGapCurve = logLerp(config.K_GAP_AT_1,
config.K_GAP_AT_CAP, t)`) — **paylaşılan olan SADECE matematik
FORMÜLÜ (`logLerp`/`applyPostCapFloor`), DEĞERLER DEĞİL.** Bir modun
`_CURVE_CONFIG`'ini değiştirmek DİĞER 11 modu ETKİLEMEZ (izole).
`TIER_BOUNDARIES` (kesim-noktasi.js HARİÇ, geri kalan 11 mod paylaşılan
`DIFFICULTY_CONFIG.TIER_BOUNDARIES`'i kullanıyor) DEĞİŞTİRİLİRSE bu 11
modun "Otomatik" modda hangi seviyede hangi kademeye (easy/medium/
hard/pro) düştüğü AYNI ANDA değişir — BU tek paylaşılan risk noktası.

## Testler — 13 dosya DOĞRUDAN DIFFICULTY[...]/CURVE_CONFIG değerine bağlı

`grep -rl "DIFFICULTY\["` VE `grep -rl "CURVE_CONFIG"` test/*.test.mjs'te
**13 dosya** ile kesişiyor (12 mod test dosyası + `difficulty-curve.test.mjs`,
+`exam-coverage.test.mjs` sadece DIFFICULTY'ye bakıyor) — bu 13 dosyanın
TOPLAMI **7.488 satır**. Bu, "her sayıyı değiştirdiğinde KAÇ TEST
KIRILIR" sorusunun DOLAYLI bir üst sınırı — GERÇEK kırılma sayısı hangi
SAYININ değiştiğine bağlı (bir modun `gainDb`'sini değiştirmek o modun
KENDİ testindeki spesifik sayısal ASSERT'leri kırar, difficulty-curve.js'in
PAYLAŞILAN `LEVEL_CAP`/`TIER_BOUNDARIES`'ini değiştirmek 11 modun testinde
DE dolaylı etkilere yol açabilir — TEK TEK sayılmadı, bu ölçümün kapsamı
dışında bırakıldı, "13 dosya potansiyel olarak etkilenebilir" ÜST SINIR
olarak bildiriliyor).

## XP hesabı — ETKİLENİR, ama SADECE `xp` alanı DEĞİŞTİRİLİRSE

OLCUM-XP-17-08'de ölçülen: `calculateXP()` `DIFFICULTY[level].xp`'yi
TABAN olarak okuyor. **`xp` alanı DIFFICULTY tablosunun İÇİNDE ama
gain/Q/time/kGap gibi "zorluk hissi" alanlarından AYRI, BAĞIMSIZ bir
sayı** — Logic SADECE gain/Q/kGap gibi "ne kadar zor duyuluyor" eksenini
değiştirirse XP hiç etkilenmez; `xp`'yi DE değiştirmek isterse bu AYRI,
bilinçli bir ikinci karar olur (aynı tabloda yan yana durduğu için
KAZARA birlikte değişme riski var — dikkat edilmeli).

## Sınav sistemi — ETKİLENİR, dolaylı ama KESİN

OLCUM-SINAV-17-08'de doğrulanan: `EXAM_DIFFICULTY="pro"` (12/12 mod) —
sınav soruları HER ZAMAN `DIFFICULTY.pro`'yu okuyor. Bir modun
`DIFFICULTY.pro` girdisini değiştirmek O MODUN sınav zorluğunu DA
DEĞİŞTİRİR (ayrı bir sınav-zorluğu sabiti YOK, aynı kaynaktan besleniyor)
— Logic "sadece Otomatik eğriyi değiştireceğim, sınav etkilenmez"
varsayımıyla hareket EDEMEZ, DIFFICULTY.pro'ya dokunursa sınav da değişir.

## Seviye atlama hızı — DEĞİŞMEZ (dolaylı bir bağlantı YOK, ÖLÇÜLDÜ)

`progress.js:xpNeeded(level) = 120 + (level-1)×70` — SADECE seviye
SAYISININ fonksiyonu, `DIFFICULTY`/`CURVE_CONFIG`'teki HİÇBİR alana
bakmıyor (grep ile doğrulandı, `xpNeeded`/`academyXpNeeded` bu iki
dosyayı hiç import etmiyor). **Zorluk eğrisini (gain/Q/kGap/time)
değiştirmek seviye atlama HIZINI kendi başına DEĞİŞTİRMEZ** — SADECE
yukarıdaki `xp` alanı da değiştirilirse (ayrı karar) dolaylı olarak
etkilenir.

## ZORLUK.md — GÜNCELLENMELİ, ZATEN BAYAT (yeni değişiklikten BAĞIMSIZ olarak)

`ZORLUK.md` (524 satır) VAR ve mevcut — ama `git log --oneline --
ZORLUK.md` **TEK bir commit** gösteriyor (`acbd301`, "10 modun zorluk
parametreleri envanteri") ve dosyanın KENDİ başlığı/yöntem notu AÇIKÇA
**"10 modun HEPSİ okundu"** diyor. Pan Konumu ve Stereo Genişlik
(`grep -n "Pan Konumu\|Stereo Genişlik" ZORLUK.md` → SIFIR eşleşme)
**BU DOKÜMANDA HİÇ YOK** — yani ZORLUK.md şu anda 12 modun SADECE 10'unu
kapsıyor, Logic'in DEĞİŞİKLİĞİNDEN BAĞIMSIZ olarak ZATEN eksik/bayat.
Herhangi bir zorluk değişikliği yapılmadan ÖNCE bile bu belge güncellenmeli
— değişiklik yapılırsa AYRICA (değişen modun bölümü) güncellenmesi
gerekir.

## Mevcut kullanıcı verisi / migration — TEKNİK MİGRASYON GEREKMEZ, ama ALGILANAN ZORLUK ANİDEN DEĞİŞİR

Seviye/XP HİÇBİR YERDE "zorluk parametresi" olarak SAKLANMIYOR — SADECE
HAM XP sayısı (`stats.perMode[id].xp`) kalıcı, seviye/gain/Q/kGap HER
OKUMADA `levelFromXp`→`paramsForDifficultyPosition` ile YENİDEN
HESAPLANIYOR (statik/kalıcı bir "bu kullanıcının zorluğu X" alanı YOK).
**Sonuç: veri formatı DEĞİŞMEZ, migration SCRIPT'i GEREKMEZ** — ama
`_CURVE_CONFIG`'in AT_1/AT_CAP değerleri değişirse, AYNI XP'ye/AYNI
seviye NUMARASINA sahip eski bir kullanıcı BİR SONRAKİ turda ANINDA
FARKLI (daha kolay/daha zor) bir gain/Q/kGap görür — seviye NUMARASI
sabit kalırken HİSSETTİĞİ zorluk aniden zıplayabilir. Bu bir ÜRÜN
riski (kullanıcı "neden birden zorlaştı/kolaylaştı" diye şaşırabilir),
TEKNİK bir migration sorunu DEĞİL.

## Tek mod mu, hepsi mi — TEK MOD AÇIKÇA DAHA KOLAY

Ölçülen izolasyon (yukarı bkz.) sayesinde: **TEK bir modun
`_CURVE_CONFIG`'ini/`DIFFICULTY`'sini değiştirmek** → 1 dosya, ~10-15
satır, o modun KENDİ test dosyası (~500-700 satır boyutunda, TAMAMI
değil sadece ilgili sayısal ASSERT'ler) etkilenir, DİĞER 11 mod
DOKUNULMAZ. **12 modun HEPSİNİ tutarlı şekilde değiştirmek** → 12 dosya
+ potansiyel olarak paylaşılan `DIFFICULTY_CONFIG.TIER_BOUNDARIES` (eğer
"Otomatik" modun kademe geçişleri de değişecekse), 12 test dosyası
ETKİLENEBİLİR, VE her modun KENDİ "kaç Z'de ne kadar zor" kalibrasyonu
AYRI AYRI kulakla doğrulanması gerekir (mevcut sayılar "KULAKLA
DOĞRULANMADI" notuyla girilmiş — 12 modun her biri kendi playtest'ini
istiyor).

## Sonuç — iş yükü tahmini (dosya/satır/test, SAAT DEĞİL)

| Kapsam | Dosya | Satır (tahmini değişiklik) | Test dosyası (etkilenebilir) | Risk |
|---|---|---|---|---|
| Tek mod, SADECE `_CURVE_CONFIG` (Otomatik eğri) | 1 | 5-10 | 1 (o modun kendi test dosyası) | DÜŞÜK — izole |
| Tek mod, `DIFFICULTY` DAHİL (Sabit + sınav + XP) | 1 | 10-20 | 1-2 (mod testi + varsa exam-coverage) | ORTA — XP/sınav dolaylı etkilenir |
| Tüm 12 mod, `_CURVE_CONFIG`'ler | 12 | 60-120 | 12 | ORTA-YÜKSEK — her biri AYRI kulak doğrulaması ister |
| Tüm 12 mod + paylaşılan `TIER_BOUNDARIES` | 13 | 80-150 | 13 | YÜKSEK — "Otomatik" kademe geçişleri TÜM modlarda aynı anda kayar |
| + ZORLUK.md güncellemesi (HER senaryoda ÖNERİLİR) | +1 | +50-200 (envanter yeniden üretimi) | — | — |

**Risk listesi (özet):** (1) XP/sınav zorluğu `DIFFICULTY` tablosuyla
PAYLAŞILAN alan üzerinden dolaylı etkilenir — ayrı karar gerektirir.
(2) `TIER_BOUNDARIES` DEĞİŞİRSE 11 modun "Otomatik" kademe geçişi AYNI
ANDA kayar — TEK yerden yapılan bir değişiklik 11 modu birden etkiler.
(3) Mevcut kullanıcılarda ANİ algılanan-zorluk sıçraması (migration
DEĞİL, UX riski). (4) ZORLUK.md ZATEN bayat — bu turda dokunulmasa bile
ayrı bir borç. (5) "KULAKLA DOĞRULANMADI" notu HER modun mevcut
sayılarında var — yeni sayılar da AYNI playtest ihtiyacını taşıyacak.

---

# C) TEKRAR ÖNLEME

## 12 modun soru uzayı — ÖLÇÜLDÜ (her `createQuestion()` okunarak)

| Mod | "Kimlik" ekseni (tekrar hissi yaratan) | Genişlik | Not |
|---|---|---|---|
| Frekans Bulma | `freq` (sürekli log-uniform) + `gainSign` (±1, kolay/orta'da SADECE +1) | **GENİŞ** (sürekli) | Tekrar riski düşük |
| Kesim Noktası | `filterType` (2) × `freq` (sürekli) | **GENİŞ** | freq sürekli baskın |
| Q Genişliği | `correctLabel` (`pool`'dan, options'a göre **3-6** ayrık etiket) × `direction` (±1) × `freq` (bazı kademelerde **SABİT**, `isolate=true`) | **DAR** | isolate=true iken freq hiç değişmiyor — kimlik SADECE 3-6×2=6-12 kombinasyon |
| Boost mu Cut mu | `direction` (±1, **İKİLİ**) × `freq` (sürekli) × `layer` (session-index'e göre DETERMİNİSTİK, rastgele değil) | **DAR** (kimlik ekseni) | Görevin kendi örneği — direction 2 değer |
| dB Seviyesi | `direction` (±1) × `dbDelta` (sürekli büyüklük) | **ORTA** | Yön ikili ama büyüklük sürekli |
| Kompresör | `oddIndex` (**TAM OLARAK 3**, A/B/C) × `kGap` (sürekli) | **DAR** | Logic'in %33 örneği BİREBİR — 3 |
| Reverb | `oddIndex` (**3**) × `oddType` (pro/proplus'ta `TYPE_IDS`'ten, KÜÇÜK bir set) | **DAR** | 3 (alt kademe) - ~12 (üst kademe, 3×4 tip) |
| Tonal Denge | `bandCount` (2/4/6, DETERMİNİSTİK) × HER bandın `bugDb`'si (çok-boyutlu sürekli) | **GENİŞ** | Çoklu-sürekli boyut, pratik tekrar riski yok |
| Frekans Çakışması | `stage` (deterministik) × `correctSource` (2, sadece aşama 2) × `trueCenter` (sürekli, DAR bölge içinde) × `correctCutDb` (sürekli) | **AŞAMA 2'DE DAR** (2), diğerlerinde ORTA-GENİŞ | Aşama 2 kompresör/reverb ile AYNI risk sınıfı |
| Saturation & Distortion | `oddIndex` (**3**) — `distortionType` kademeye göre DETERMİNİSTİK (rastgele değil) | **DAR** | Logic'in %33 örneği BİREBİR — 3 |
| Pan Konumu | `panPercent` (tam sayı, **[-100,100] → 201 değer**) | **GENİŞ** | 201 ayrık değer, yeterince geniş |
| Stereo Genişlik | `widthPercent` (tam sayı, **[0,100] → 101 değer**) | **GENİŞ** | 101 ayrık değer, yeterince geniş |

**Logic'in bahsettiği "3 şıklı modlar" (Kompresör/Reverb/Saturation) —
ÖLÇÜM DOĞRULUYOR:** `oddIndex = Math.floor(rng()*3)` HİÇBİR geçmiş
bilgisi olmadan HER turda yeniden çekiliyor — 3 ayrık değer, geçmiş
YOK, %33.3 aynı harfin ARKA ARKAYA gelme ihtimali TAM OLARAK doğru.

⚠️ **Logic'in bahsetmediği, bu ölçümde YENİ bulunan iki dar mod:** Q
Genişliği (bazı kademelerde freq SABİT, kimlik sadece 6-12 kombinasyon)
ve Boost mu Cut mu (kimlik ekseni SADECE 2 — bkz. aşağıdaki N önerisi
uyarısı, bu mod EN riskli olabilir).

## N kaç olmalı — mod bazında FARKLI olmalı, ÖLÇÜLEN genişliğe göre

Genel ilke: **N, ölçülen kimlik uzayı K'den KESİNLİKLE küçük olmalı**
(N < K), yoksa "son N'i hariç tut" listesi TÜM uzayı kaplayıp geriye
seçilecek hiçbir değer bırakmaz.

| Mod grubu | K (ölçülen) | Önerilen N | Gerekçe |
|---|---|---|---|
| Kompresör / Reverb / Distortion (`oddIndex`) | 3 | **N=1** | Sadece ARDIŞIK tekrarı engeller (Logic'in şikayeti buydu) — N=2 seçilirse geriye SADECE 1 değer kalır, HER 3 soruda bir DETERMİNİSTİK bir döngüye (A→B→C→A→B→C) girer, bu da "çok tahmin edilebilir" YENİ bir şikayete dönüşebilir |
| Q Genişliği (`correctLabel`) | 6-12 (kademeye göre) | **N=1-2** | Bol pay var, N=2 bile güvenli |
| ⚠️ Boost mu Cut mu (`direction`) | **2** | **YAPILMAMALI (ya da ÇOK DİKKATLİ)** | N=1 (K=2'nin TEK güvenli değeri) geriye TEK bir zorunlu değer bırakır — HER turda yön ÖNCEKİNİN TERSİ olur, kullanıcı SESİ HİÇ DİNLEMEDEN, sadece "önceki neydi" diye ALTERNATİF cevap vererek %100 doğru yapabilir. Bu, "tekrar önleme"nin kendisinin YENİ ve DAHA CİDDİ bir hile/kolaylık açığı yaratacağı TEK mod — burada N UYGULANMAMALI, ya da olasılıksal (ör. "aynı yönü tekrar seçme ihtimalini %50'den %20'ye düşür", KESİN yasaklama değil) bir yaklaşım gerekir |
| dB Seviyesi (`direction`, ikili eksen) | 2 (yön ekseni) | Boost/Cut'la AYNI uyarı — yön ekseni İÇİN N uygulanmamalı, `dbDelta` büyüklüğü İÇİN (sürekli) N gerekmez zaten |
| Pan Konumu / Stereo Genişlik | 101-201 | **N=3-5** | Bol pay, isteğe göre serbestçe ayarlanabilir |
| Frekans Bulma / Kesim Noktası / Tonal Denge | Geniş/sürekli | **N gerekmeyebilir** | Doğal tekrar riski zaten düşük |
| Frekans Çakışması, Aşama 2 (`correctSource`) | 2 | Boost/Cut'la AYNI uyarı |

## ⚠️ Sonsuz döngü riski — nasıl korunur

Task'ın kendi uyardığı risk GERÇEK: eğer üretim "rastgele çek, son N'de
VARSA TEKRAR ÇEK" (retry-until-valid) şeklinde yazılırsa VE `N >= K`
olursa, döngü HİÇBİR ZAMAN geçerli bir değer BULAMAZ (matematiksel
olarak sonsuz). **İki güvenli tasarım yolu var (ikisi de "kod yazma"
kapsamı dışında, sadece yön):**

1. **Retry-until-valid + SERT ÜST SINIR** (basit ama kaba): "en fazla
   M kez dene, M'den sonra geçmişi YOK SAY ve normal rastgele çek" —
   sonsuz döngüyü KESİN engeller ama M'nin kendisi keyfi bir sabit
   olur.
   
2. **Kalan-küme hesabı** (ÖNERİLEN, daha sağlam): `candidates = TÜM
   olası kimlikler`; `allowed = candidates - son N kimlik`; eğer
   `allowed` BOŞ ise (N>=K veya K çok küçükse) `allowed = candidates -
   [SADECE son 1 kimlik]`'e DÜŞ (garanti en az K-1 seçenek kalır, K>=2
   olduğu sürece BOŞ olamaz). Bu yaklaşım MATEMATİKSEL olarak ASLA
   sonsuz döngüye giremez (hiçbir retry/loop YOK, doğrudan kalan
   kümeden seçim) — K=1 olan (hiç görülmedi, 12 modun hiçbirinde YOK)
   BİR mod olsaydı bile "allowed" hep en az 1 eleman taşırdı.

Bu ikinci yaklaşım AYRICA `pauseRound`/`resumeRound` gibi PURE FONKSIYON
kısıtına (mod sözleşmesi: `createQuestion` saf kalmalı) UYUMLU —
"kalan küme" hesabı `rng`/`recentIdentities` PARAMETRE olarak
GEÇİRİLDİĞİ sürece SAF kalır, İÇERİDE mutable bir state TUTMAZ.

## Nerede uygulanmalı — MOD BAZINDA mı, TEK ORTAK MEKANİZMA mı

**Ölçülen mimariye göre TEK ortak, PAYLAŞILAN bir SAF yardımcı fonksiyon
+ mod-bazlı ÇAĞRI noktası KARIŞIMI en tutarlı yol** —
`ab-loop-timing.js`/`difficulty-curve.js`'in KURULU deseniyle AYNI
(küçük, mode-agnostic, SAF bir `core/*.js` dosyası):

- YENİ `core/repeat-guard.js` (tahmini ~40-60 satır) — `pickAvoidingRecent
  (candidates, recentValues, rng)` gibi TEK bir saf fonksiyon +
  kendi test dosyası (`test/repeat-guard.test.mjs`, ~80-150 satır —
  boş-küme/tek-eleman/normal durum testleri).
- Her modun `createQuestion()`'ı KENDİ "kimlik" değişkenini (oddIndex/
  direction/correctLabel/panPercent-onluk-dilim/vb.) çekerken bu
  fonksiyonu ÇAĞIRIR — 12 dosyanın HER BİRİNDE 3-8 satırlık bir
  değişiklik (mevcut `Math.random()`/`rng()` çağrısının YERİNE).
- `app.js`'in geçmiş kimlikleri TUTMASI/GÜNCELLEMESİ gerekiyor
  (`sessionQuestionIndex`'in AYNI "settings üzerinden mod dosyasına
  geçir" deseni) — 11 `createQuestion(level, settings)` çağrı
  noktasının HER BİRİNE `settings.recentIdentities` gibi bir alan
  eklenmeli + her round sonunda bu geçmiş GÜNCELLENMELİ (~20-40 satır,
  `app.js`'te dağınık).

## Zorluk eğrisine dokunuyor mu — HAYIR, ÖLÇÜLDÜ/DOĞRULANDI

Tekrar-önleme SEÇİLEN değerin HANGİ ALT KÜMEDEN geldiğini kısıtlıyor
(oddIndex/direction/panPercent gibi kimlik eksenleri), difficulty-curve.js'in
gain/Q/kGap/time HESAPLAMALARINA hiç dokunmuyor — bu İKİSİ ORTOGONAL
(B bölümündeki bulguyla TUTARLI: kimlik ekseni ile zorluk büyüklüğü
AYRI kod yollarından geliyor).

## İş yükü — dosya/satır sayısı (TAHMİN, "kaç dosya değişir" ölçülebilir kısmı)

| Parça | Dosya sayısı | Tahmini satır |
|---|---|---|
| YENİ paylaşılan yardımcı + testi | 2 (yeni) | ~120-210 |
| 12 mod dosyasının KENDİ createQuestion()'ı | 12 (değişen) | ~36-96 (3-8/dosya) |
| `app.js` — geçmiş TUTMA/GEÇİRME (11 çağrı noktası) | 1 (değişen) | ~20-40 |
| 12 mod test dosyasına YENİ testler (tekrar-önleme doğrulaması) | 12 (değişen) | ~24-60 (2-5/dosya) |
| **TOPLAM** | **~15 dosya (2 yeni + 13 değişen)** | **~200-400 satır** |

## Sonuç — net öneri

1. **Öncelik SIRASI:** Kompresör/Reverb/Distortion'ın `oddIndex`'i
   (Logic'in ZATEN yaşadığı, K=3, N=1) — EN düşük risk, EN yüksek
   fayda. Frekans Çakışması'nın Aşama 2'si (`correctSource`, K=2) AYNI
   risk sınıfında ama Boost/Cut UYARISIYLA aynı dikkat gerektirir.
2. **Boost mu Cut mu / dB Seviyesi'nin yön ekseni İÇİN N UYGULANMAMALI**
   — K=2'de sert "tekrar yasak" kuralı sesi dinlemeden %100 doğru
   cevaplamayı MÜMKÜN kılar, bu ORİJİNAL şikayetten (tekrar can sıkıcı)
   DAHA CİDDİ bir sorun (mod anlamsızlaşır). Bu ikisi BİLEREK kapsam
   dışı bırakılmalı ya da olasılıksal bir yumuşatmayla ele alınmalı.
3. **Mekanizma:** tek paylaşılan SAF fonksiyon (`core/repeat-guard.js`,
   `ab-loop-timing.js` deseninin AYNISI) + "kalan küme" hesabı (retry
   YOK, bu yüzden sonsuz döngü YAPISAL OLARAK imkânsız).
4. Zorluk eğrisine dokunmuyor — B bölümünün riskleriyle KARIŞMIYOR,
   ayrı/bağımsız bir iş olarak planlanabilir.

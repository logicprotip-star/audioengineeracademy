# OLCUM-FLAKY-16-08 — `paywall-flow.spec.mjs` Flake Ölçümü

_Kapsam: SADECE ÖLÇÜM. Kod YAZILMADI, commit atılmadı. `e2e/paywall-flow.spec.mjs`
(393 satır) TAM okundu, `app.js`'in `syncLives`/`finalizeIfGameOver`/
`blockIfLivesOut` fonksiyonları TAM okundu, `core/paywall.js`'in
`applyLivesRefill`/`onLifeLost` fonksiyonları TAM okundu,
`boost-mu-cut-mu.js`'in `generateLayer1Choices`/`generateLayer2Choices`
TAM okundu. **26 GERÇEK test koşusu** yapıldı (20 izole + 6 tam takım),
kök sebep `applyLivesRefill()`'i Node'da DOĞRUDAN çağırarak (tarayıcısız,
saf fonksiyon) KANITLANDI._

**SONUÇ (baştan): TEST SORUNU — kod sorunu DEĞİL. Kanıt B) ve D)'de.**

---

## A) TEKRAR ÜRET

**20-30 kez arka arkaya koşuldu — TAM SAYIM:**
- **İzole koşu** (`node --test --test-name-pattern="madde 30 \(cevaplama
  yolu" e2e/paywall-flow.spec.mjs`, SADECE bu tek test, başka HİÇBİR
  dosya paralel çalışmıyor): **20 koşu, 20 GEÇTİ, 0 KIRMIZI.**
- **Tam takım** (`npm run test:e2e`, TÜM 8 dosya + 27 test AYNI ANDA):
  **6 koşu, 5 GEÇTİ, 1 KIRMIZI** (run #2).

**Toplam: 26 koşu, 1 kırmızı (~%3.8).** Görev metninde belirtilen "bugün
İKİ KEZ" (G251 ve G254-G257 turları) ile TUTARLI bir oran — düşük ama
SIFIR DEĞİL, bu turda 6. tam-takım denemesinde AYNI hata TEKRAR ÜRETİLDİ.

**Hangi assert'te düşüyor — TAM hata mesajı, İKİSİ de (bugünkü 2 orijinal
+ bu turda yeniden üretilen 1) BİREBİR AYNI:**
```
✖ madde 30 (cevaplama yolu, regresyon): cevaplayarak sessionLimit'e
  ulaşan kullanıcı reklamla devam ederken BOZULMADI
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  + 'Devam etmek için bir yol seç'
  - 'Ücretsiz oturumun bitti'
      at e2e/paywall-flow.spec.mjs:280:10
```
Bu, `assert.equal(beforeAd.paywallReasonTitle, "Ücretsiz oturumun
bitti")` satırı (280) — **her seferinde AYNI satır, AYNI yanlış
değer.** Başka HİÇBİR assert'te, başka HİÇBİR testte düşme
GÖZLENMEDİ (26 koşuda bu testin KENDİSİ dışında sıfır kırmızı).

**Hep aynı yerde mi — EVET, %100 aynı yerde (3/3 gözlenen kırmızı,
bugünkü 2 + bu turdaki 1).**

**Tek başına koşunca da mı — HAYIR, sadece tam takımda GÖZLENDİ (bu
turda):** 20 izole koşunun HİÇBİRİ düşmedi, 6 tam-takım koşusunun
1'i düştü. **Ama bu, "SADECE tam takımda oluşabilir" anlamına
GELMİYOR** — B) bölümünde gösterildiği gibi kök sebep TAMAMEN
OLASILIKSAL (şans dahilinde), izole koşuda da OLUŞABİLİR, sadece bu
turda 20 izole denemede TESADÜFEN hiç düşmedi (aşağıda olasılık
hesabı var — ~%5-6 beklenen oran, 20 denemede hiç görülmemesi
istatistiksel olarak ŞAŞIRTICI DEĞİL).

---

## B) SEBEP — KESİN BULUNDU, KOD-DÜZEYİNDE KANITLANDI

**İki ihtimalden biri: TEST SORUNU. Kanıt:**

**1) Testin KENDİSİ, `lives: 999` ile "canlar önemsiz olsun" varsayıyor:**
```js
// e2e/paywall-flow.spec.mjs:269
await seedLocalStorage(page, { stats: { lives: 999, rounds: 50 }, feedbackScreen: false });
```

**2) Ama uygulamanın KENDİ `applyLivesRefill()`'i HERHANGİ bir `lives`
değerini `totalLives`'ın (5) ÜSTÜNDEYSE aşağı ÇEKİYOR — bu, GERÇEK
Node'da doğrudan çağrılarak (tarayıcı GEREKMEDEN, saf fonksiyon)
KANITLANDI:**
```
$ node -e "import('./www/js/core/paywall.js').then(m => {
    console.log(m.applyLivesRefill(999, Date.now(), Date.now(), {totalLives:5}));
  })"
{"lives":5,"lastRefillAt":...}
```
Kod (`core/paywall.js:174-175`):
```js
export function applyLivesRefill(lives, lastRefillAt, now, { totalLives = TOTAL_LIVES, ... } = {}) {
  if (lives >= totalLives) return { lives: totalLives, lastRefillAt };
  ...
```
**999 ANINDA 5'e ÇEKİLİYOR.** Bu fonksiyon `syncLives()` (`app.js:1504-1515`)
içinde çağrılıyor, `syncLives()` da mod girişinde/round başında birden
çok yerde tetikleniyor (`app.js:7390,7492,7752` ...) — yani testin 5
soruyu cevaplamaya BAŞLAMASINDAN ÖNCE `currentLives` ZATEN 999 DEĞİL,
**gerçek başlangıç 5.**

**3) Testin cevaplama stratejisi (`dismissAndAnswer`, satır 252-257)
KÖRÜ KÖRÜNE İLK ŞIKKA basıyor:**
```js
await page.locator(".ans").first().click({ timeout: 3000 }).catch(() => {});
```
`boost-mu-cut-mu.js`'in katman 1 şıkları (`generateLayer1Choices`,
`boost-mu-cut-mu.js:188-195`) **`shuffle()` ile KARIŞTIRILIYOR** — yani
"ilk şık" %50 ihtimalle YANLIŞ. Katman 2 (soru 4-5, `generateLayer2Choices`)
3-6 şıklı, "ilk şık"ın yanlış olma ihtimali daha da YÜKSEK (%67-83).

**4) `finalizeIfGameOver()`'da `livesOut`, `sessionLimitOut`'un ÖNÜNE
GEÇİYOR (`app.js:1638-1639`):**
```js
const livesOut = !isUserPro() && currentLives <= 0;
const sessionLimitOut = !livesOut && freeSessionLimitReached();
```
**`livesOut` true ise `sessionLimitOut` HİÇ HESAPLANMIYOR bile** —
sebep her zaman `livesOut` kazanır.

**SONUÇ (matematik):** Testin 5 soruluk penceresinde `currentLives`
GERÇEKTEN 5 (999 değil). "İlk şık" her seferinde YANLIŞ olursa (3
katman-1 sorusunun her biri %50, 2 katman-2 sorusunun her biri
~%67-75) can **5→0** düşer — 5. soru cevaplandığında HEM oturum
sınırına (5. soru) HEM can sınırına (0 can) AYNI ANDA ulaşılmış olur,
ve `livesOut` ÖNCELİĞİ kazandığı için paywall **YANLIŞ** sebeple açılır.
**Kaba olasılık hesabı** (bağımsız varsayımla): 0.5×0.5×0.5×~0.7×~0.7
**≈ %5-6** — düşük ama SIFIR DEĞİL, 26 koşuda 1 kırmızı (~%3.8) BU
HESAPLA TUTARLI.

**Ayırt edici sorular — TEK TEK cevaplandı:**
- **Test ekranın hazır olmasını nasıl bekliyor — SABİT süre:**
  `dismissAndAnswer()` cevaptan sonra `await page.waitForTimeout(2500)`
  (satır 256) — koşullu bir "DOM güncellendi mi" beklemesi YOK. **Ama
  bu, BULUNAN kök sebeple İLGİSİZ** — sabit süre yetersizliği DEĞİL,
  YANLIŞ ŞIKKA tıklanması sorunun kaynağı (C bölümünde ayrıca ele
  alındı, GERÇEK bir ek risk ama BU flake'in sebebi değil).
- **Önceki testler state bırakıyor mu — HAYIR, bu spesifik hata için
  İLGİSİZ:** Her test `browser.newPage()` ile TAZE bir sayfa açıyor,
  `seedLocalStorage()` `localStorage.clear()` ile BAŞLIYOR (`app-fixtures.mjs:11`)
  — önceki testten state SIZMIYOR. Bu testin KENDİ İÇİNDEKİ 999→5
  klemplenmesi, dıştan gelen bir kirlenme DEĞİL.
- **Testler paralel mi koşuyor — EVET, ÖLÇÜLDÜ, ama BU flake'in sebebi
  DEĞİL:** Tam takım koşusunun (run_1) TEK TEK test sürelerinin TOPLAMI
  173.345ms, ama TÜM koşunun gerçek süresi (`duration_ms`) SADECE
  56.970ms — **~3 kat** — dosyalar KESİNLİKLE paralel çalışıyor
  (`e2e/helpers/static-server.mjs:port 0` yorumu da bunu doğruluyor:
  *"testler birbirini ÇAKIŞTIRMAZ (paralel koşuya hazır)"*, BİLEREK
  öyle tasarlanmış). **Ama** 20 SIRALI/izole koşunun 0/20 kırmızı,
  6 PARALEL koşunun 1/6 kırmızı çıkması TEK BAŞINA "paralellik SEBEP"
  demek için YETERLİ KANIT DEĞİL — `Math.random()`'ın (shuffle'ın
  kullandığı) SONUCU CPU hızından/paralellikten ETKİLENMEZ, sadece
  ÇAĞRILMA SAYISI/SIRASI etkilenebilir (farklı bir round akışı farklı
  rastgele sayı TÜKETİMİ demektir, ama bu YİNE DE sadece "hangi
  rastgele sayı" değişir, "%50 ihtimal" gerçeği DEĞİŞMEZ). **1/6 ve
  0/20 arasındaki fark, ~%5-6 teorik oranla istatistiksel olarak
  TUTARLI (n=26 küçük örneklem, normal varyans içinde) — paralelliğin
  KENDİSİNİN olasılığı ARTIRDIĞINA dair KANIT YOK, BELİRSİZ bırakılıyor.**
- **Paywall açılışında asenkron bir adım var mı (fiyat mağazadan
  okunuyor) — VAR ama BU HATAYLA İLGİSİZ:** `openPaywallReason()`'ın
  fiyat okuma/render adımları test edilen `paywallReasonTitle` alanını
  ETKİLEMİYOR — `paywallReasonTitle` `PAYWALL_REASONS[reasonKey].title`'dan
  DOĞRUDAN, SENKRON olarak geliyor (`core/paywall.js:283-298`), fiyat
  ayrı bir DOM alanı. Testin okuduğu `beforeAd.paywallReasonTitle`
  (satır 66, `readOutcome()`) `#paywallReasonTitle`'ın `.textContent`'i
  — `reasonKey` HANGİSİ SEÇİLDİYSE (livesOut/sessionLimit) o metni,
  SENKRON, ANINDA taşıyor. Asenkron fiyat okuması bu satırı GECİKTİRMEZ/
  DEĞİŞTİRMEZ.

**KESİN CEVAP:** **1) TEST SORUNU** — kod tarafında `finalizeIfGameOver()`'ın
`livesOut`'a öncelik vermesi TAMAMEN DOĞRU/kasıtlı bir tasarım kararı
(D bölümünde detaylı). Sorun testin `lives:999`'un "can hiç bitmez"
anlamına geldiğini VARSAYMASI — uygulamanın KENDİ `applyLivesRefill()`'i
bunu SESSİZCE 5'e çekiyor, test bunu HESABA KATMAMIŞ.

---

## C) DİĞER TESTLER

**Aynı kalıp (blind `.ans.first()` click) başka yerde var mı — EVET, 1
yerde daha, ama BU testin KENDİ hatası ondan FARKLI/daha güvenli:**
```
e2e/paywall-flow.spec.mjs:255   .ans".first().click(...)   [BU TEST]
e2e/layout-geometry.spec.mjs:101 ".ans".first().click(...)  [answerOnce()]
```
`layout-geometry.spec.mjs`'in `answerOnce()`'ı da AYNI körü-körüne
tıklama deseni KULLANIYOR, AMA o testler `seedLocalStorage(page)`
(argümansız — `stats:null`, VARSAYILAN/GERÇEK 5 canla başlıyor,
999→5 klemplenmesi hiç OLUŞMUYOR çünkü zaten 5'te başlıyor) VE
o testlerin assert'leri LAYOUT/geometriyle ilgili (actionbar örtüşmesi)
— HANGİ paywall SEBEBİYLE (livesOut/sessionLimit) açıldığı O
testler için ÖNEMSİZ, sadece "bir game-over/paywall ekranına ulaşıldı"
yeterli. **Yani AYNI riskli deseni TAŞIYOR ama BU spesifik flake'e
YAKALANMAZ** (assert ettiği şey farklı) — YİNE DE gelecekte KIRILGAN
bir desen, ayrı bir 🟡 bulgu olarak not ediliyor.

**27 testin kaçı sabit süre bekliyor, kaçı koşullu — TAM SAYIM (8
dosya genelinde, grep ile):**

| Dosya | `waitForTimeout` (sabit) | Koşullu bekleme (`waitFor`/`toBeVisible`/`waitForLoadState` vb.) |
|---|---|---|
| ab-loop-teardown.spec.mjs | 4 | 1 |
| ear-buttons.spec.mjs | 18 | 9 |
| exam-flow.spec.mjs | 5 | 2 |
| free-session-limit.spec.mjs | 2 | 3 |
| game-visualizer-loop.spec.mjs | 6 | 1 |
| layout-geometry.spec.mjs | 5 | 2 |
| native-interruption.spec.mjs | 6 | 3 |
| paywall-flow.spec.mjs | 18 | 8 |
| **TOPLAM** | **64** | **29** |

Sabit-süre çağrıları KOŞULLU olanların **~2.2 katı** — bu SUITE
GENELİNDE baskın desen "sabit bekle" (bir teamimlik gözlem, bu turda
DÜZELTİLMEDİ, sadece SAYILDI).

**Başka flake adayı var mı — EVET, 2 ADAY BULUNDU (bu turda KOD
DEĞİŞTİRİLMEDEN, sadece OKUNARAK tespit edildi):**
1. **`layout-geometry.spec.mjs`'in `answerOnce()`'ı** — YUKARIDA
   açıklanan AYNI körü-körüne tıklama deseni. `stats:null` (gerçek 5
   canla başlıyor) kullandığı için BU turun flake'ine YAKALANMIYOR,
   ama 5 taneden fazla YANLIŞ cevap ART ARDA gelirse (aynı ~%50/%70
   olasılık) `currentLives=0` olup game-over EKRANI "kayıp" (lost)
   varyantına düşebilir — testin KENDİSİ hangi varyanta düştüğünü
   AYRIMSAMIYOR (sadece actionbar geometrisini ölçüyor), yani BU
   ihtimal muhtemelen ZARARSIZ ama DOĞRULANMADI, BELİRSİZ.
2. **`exam-flow.spec.mjs`'in `#nextBtn` ("Atla") döngüleri** —
   `for (let i=0;i<10;i++) { #nextBtn.click(); waitForTimeout(200); }`
   — SABİT 200ms bekleme, DOM/state güncellemesinin bu sürede KESİN
   bittiğini varsayıyor. Bu turda ÇALIŞTIRILARAK test edilmedi
   (kapsam dışı, madde 30 spesifik), sadece KOD OKUNARAK aday olarak
   işaretlendi.

---

## D) KOD SORUNUYSA — BELİRSİZ DEĞİL, GEREKMİYOR AMA YİNE DE CEVAPLANDI

B)'de gösterildiği gibi bu **TEST SORUNU**, ama task'ın kendi isteği
üzerine "paywall gerçekten bazen yanlış açılıyor mu" sorusu AYRICA
netleştiriliyor:

**Hangi koşulda `livesOut` sebebi `sessionLimit`'in ÖNÜNE geçer —
GERÇEK bir kullanıcı için de aynı mantık, KASITLI:** `finalizeIfGameOver()`'ın
`livesOut`'u ÖNCELİKLENDİRMESİ (`app.js:1638-1639`) rastgele/hatalı bir
kod değil — kullanıcı HEM 5. soruya (oturum sınırı) HEM 0 cana (can
sınırı) AYNI ANDA ulaşırsa, "canların bitti" mesajı DAHA DOĞRU/ACİL
olanıdır (oturum sınırı REKLAMLA aşılabilir ama 0 canla ZATEN hiçbir
soru cevaplanamaz, önce can sorunu çözülmeli) — bu **DOĞRU bir öncelik
kararı**, kod sorunu DEĞİL.

**Gerçek kullanıcı bunu yaşar mı — EVET, ama BU TAMAMEN NORMAL/BEKLENEN
bir senaryo, bir HATA değil:** Ücretsiz bir kullanıcı 5 sorudan
ard arda birkaçını YANLIŞ cevaplayıp HEM 5. soruya HEM 0 cana AYNI ANDA
ulaşırsa, paywall "Devam etmek için bir yol seç" (can sebepli) mesajıyla
açılır — bu senaryoda kullanıcı GERÇEKTEN canını da bitirmiştir, mesaj
YANLIŞ DEĞİL, sadece İKİ sebepten DAHA ACİL olanı gösteriyor. **Kod
sorunu YOK.**

**Ne kadar sık — GERÇEK kullanıcı için ÖLÇÜLEMEDİ (BELİRSİZ):** Gerçek
oyuncuların doğruluk oranı, testin körü-körüne %50/%70 yanlış-tıklama
modelinden ÇOK FARKLI olacaktır (gerçek kullanıcı EN AZINDAN bazı
sorularda doğru cevap vermeye ÇALIŞIR) — bu turda GERÇEK kullanıcı
verisi/analitik YOK, bir tahmin YAPILMIYOR (task'ın kendi kuralı).

---

## SONUÇ

**TEST SORUNU.** Kök sebep KESİN olarak bulundu ve KANITLANDI (Node'da
`applyLivesRefill(999,...)` doğrudan çağrılarak, tarayıcısız): test
`lives:999` seed'inin "can hiç bitmez" anlamına geldiğini varsayıyor,
ama uygulamanın KENDİ `applyLivesRefill()` fonksiyonu HERHANGİ bir
`totalLives`'ın (5) ÜSTÜNDEKİ değeri ANINDA 5'e çekiyor — testin
GERÇEK başlangıç canı 999 değil, 5. Testin `dismissAndAnswer()`'ı
şıklara KÖRÜ KÖRÜNE (`first()`) bastığı için, ve `boost-mu-cut-mu.js`'in
şıkları `shuffle()`lı olduğu için, 5 soruluk pencerede TÜM cevaplar
yanlış gelirse (~%5-6 ihtimal, 26 koşuda 1 kez GERÇEKLEŞTİ, ~%3.8 —
tutarlı) can 5→0 düşüyor, `finalizeIfGameOver()`'ın (KASITLI, DOĞRU)
`livesOut`-önceliği yüzünden paywall YANLIŞ sebeple açılıyor.

**Kod tarafında (`app.js:finalizeIfGameOver`/`core/paywall.js:applyLivesRefill`)
DÜZELTİLECEK bir şey YOK** — her ikisi de KASITLI, DOĞRU davranıyor.
**Düzeltme testin KENDİSİNDE olmalı** (bu turda KOD YAZILMADI, sadece
tespit edildi): `dismissAndAnswer()`'ın KÖRÜ KÖRÜNE ilk şıkka basmak
yerine DOĞRU şıkkı bulup tıklaması (ör. `evaluateAnswer`'ın sonucunu
DOM'dan okumak yerine, choices dizisindeki `correct:true` olanı
`data-*` özelliklerinden seçmek) — bu, hem BU testi hem YAPISAL OLARAK
AYNI riski taşıyan `layout-geometry.spec.mjs:answerOnce()`'ı da
düzeltir. `lives:999` yerine `lives:5` seed etmek TEK BAŞINA
YETERSİZDİR (zaten 5'e klempleniyor, seed değişse de aynı ~%5-6 riski
KALIR) — asıl düzeltme YANLIŞ CEVAP OLASILIĞINI SIFIRLAMAK.

**⚠️ Bu gece build atılacak — netlik:** Bu, **paywall'ın gerçek
kullanıcılar için bazen yanlış/geç açıldığı anlamına GELMİYOR.**
Ölçülen davranış (can+oturum sınırına AYNI ANDA ulaşınca can sebebi
kazanır) kasıtlı ve doğru. Build'i ERTELEMEYİ gerektiren bir bulgu
YOK — sadece test suite'inin kendi güvenilirliği için (madde 30 testi
+ potansiyel olarak `layout-geometry.spec.mjs`) bir SONRAKİ turda
düzeltme önerilir.

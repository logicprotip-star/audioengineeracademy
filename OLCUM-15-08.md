# ÖLÇÜM — 15 Ağustos

_13-14 Ağustos'ta açılan 6 bulgu, G190-G213 arasında DURUM.md'de kapatıldığına
dair kayıt yok. Kodda gerçekten duruyorlar mı ölçüldü. Kod değiştirilmedi,
commit atılmadı — sadece okundu._

---

## #22 — blockIfLivesOut() / startFreshAttempt() Pro kontrolü

**KAPANMIŞ — G178 (Bug 22).**

`blockIfLivesOut()` (`www/js/app.js:1548-1552`):
```js
function blockIfLivesOut() {
  if (isUserPro() || currentLives > 0) return false;
  if (!openPaywallReason("livesOut")) showSessionEnd("lost");
  return true;
}
```
`return true` **koşulsuz DEĞİL** — Pro kullanıcıda ilk satırda `false` ile
erken çıkılıyor, `return true`'ya SADECE `!isUserPro() && currentLives<=0`
iken ulaşılıyor. Pro kullanıcıda round engellenmiyor.

`startFreshAttempt()` (`www/js/app.js:7010`, satır 7020):
```js
if (!isUserPro() && currentLives <= 0) {
```
Pro kontrolü VAR. Kod, `www/js/app.js:7013-7019`'daki kendi yorumunda bunun
"G178 DÜZELTMESİ (Bug 22)" olduğunu doğrudan belirtiyor — önceki hâlde
`isUserPro()`'ya hiç bakılmadığı, bu yüzden canları önceden 0'a düşüp sonra
Pro olan bir kullanıcının "Tekrar oyna" ile round başlatamadığı yazıyor.

Aynı ailenin ÜÇÜNCÜ bir örneği `ensureAutoNext()`'te de var
(`www/js/app.js:5279`): `if (!isUserPro() && currentLives <= 0) return;`
— orada da "G178 DÜZELTMESİ (Bug 22, ÜÇÜNCÜ örnek)" diye işaretli.

**Kök sebep (tek cümle):** Pro'ya geçişte `currentLives` sıfırlanmıyor/
dolmuyor — üç ayrı fonksiyon (`blockIfLivesOut`/`startFreshAttempt`/
`ensureAutoNext`) `isUserPro()` kontrolü olmadan bu durumu "canlar bitti"
sanıyordu; G178'de üçüne de aynı kontrol eklendi.

---

## #20 — Canlar bitince açılan paywall'ın X/kapatma yolu

**KAPANMIŞ — G177 (Bug 20), G185'te (Bug 25) genişletildi.**

`www/js/app.js:8400-8406`:
```js
if (els.paywallCloseBtn) els.paywallCloseBtn.addEventListener("click", () => {
  stopPaywallLivesTicker();
  const cfg = paywall.PAYWALL_REASONS[openPaywallReasonKey];
  if (cfg && cfg.endsRound) { goScreen("menu"); return; }
  resumePausedRoundForPaywall();
  goBackFromSubpage();
});
```
**İki çıkış yolu var**, `PAYWALL_REASONS[reasonKey].endsRound` bayrağına göre:
1. `endsRound:true` (yaşayan iki sebep: `livesOut`, `sessionLimit`) →
   doğrudan `goScreen("menu")` — **ana menü**.
2. `endsRound:false` (diğer 5 sebep: modeLocked/upload/dailyUsed/
   zoneHistory/freePlayMode) → `resumePausedRoundForPaywall()` +
   `goBackFromSubpage()` — **kaldığı yerden oyun ekranına döner**.

Kod yorumu (`www/js/app.js:8377-8393`) kendi geçmişini anlatıyor: G177
önce SADECE `livesOut`u kapsayacak şekilde düzeltildi (`goBackFromSubpage()`
çift `pop()` yaptığı için X sonrası "game" ekranında tabbar'sız kalınıyordu),
G185'te `sessionLimit`'in de aynı hataya girdiği bulunup `endsRound`
bayrağına genelleştirildi.

**Kök sebep (tek cümle):** `goBackFromSubpage()`'in "üstte tek bir subpage
var" varsayımıyla yaptığı çift `pop()`, round'u BİTİRMİŞ (canlar/oturum
sınırı) bir paywall'da "menu" yerine "game"e (tabbar'sız, çıkış yolu
olmayan bir ekrana) düşürüyordu — `endsRound` bayrağıyla ayrıştırılarak
çözüldü.

---

## #25 — Paywall içeriği ilk/sonraki açılış farkı, "Reklam izle" görünürlüğü

**BUG DEĞİL — tasarım gereği, koddan doğrulandı.**

**İlk oturumda paywall hiç açılmıyor** (`www/js/app.js:996`):
```js
const paywallSuppressedFirstSession = paywall.isFirstSession(stats.rounds);
```
`isFirstSession(totalRoundsEver)` (`www/js/core/paywall.js:230-232`)
`totalRoundsEver === 0` demek — uygulama AÇILIŞINDA bir kere hesaplanıp
sabitleniyor (modül seviyesinde `const`), o OTURUM boyunca değişmiyor.
`openPaywallReason()`'ın ilk satırı (`www/js/app.js:8145`)
`if (paywallSuppressedFirstSession) return false;` — true iken paywall
HİÇ AÇILMIYOR (bu G63'ün kendi kuralı, "ilk oturumda paywall yok").

**"Reklam izle" görünürlüğü** `syncWatchAdButtonForReason(cfg)`
(`www/js/app.js:8121-8137`) tarafından, tetikleyen `reasonKey`'in
`cfg.adGrant` değerine göre kuruluyor:
- `adGrant==="life"` (SADECE `livesOut`) → her zaman görünür, KOTASIZ.
- `adGrant==="sessionExtension"` (SADECE `sessionLimit`) → SADECE günlük
  kota kaldıysa (`paywall.sessionAdWatchesRemainingToday(...) > 0`)
  görünür.
- Diğer 5 sebepte (`cfg.adGrant` bu ikisinden biri değilse) → HER ZAMAN
  gizli.

**Sonuç:** "içerik ilk açılışla sonraki açılışlar arasında farklı" diye
görünen şey aslında **açılış SAYISI değil, hangi `reasonKey`'in
tetiklendiği** — her `PAYWALL_REASONS[reasonKey]` kendi title/detail/
buton setini taşıyor (`openPaywallReason()`, `www/js/app.js:8144-8165`),
bu KASITLI. Gerçek "ilk vs sonraki" farkı SADECE "ilk oturumda paywall
hiç açılmaz" kuralı (yukarıda) — bu da G63'ün belgelenmiş kararı, hata
değil.

**#22/#20/#25 aynı kök nedene mi bağlı? HAYIR, KISMEN.** #20 ve #22 AYNI
ÖZELLİK ALANINI (canlar-bitti/lives-out paywall akışı) paylaşıyor ve aynı
dönemde (G177/G178) art arda bulunup düzeltildi, ama İKİ FARKLI KOD
KUSURU: #22 → `isUserPro()` kontrolünün üç fonksiyonda eksik olması; #20 →
`goBackFromSubpage()`'in ekran-yığını varsayımının paywall'a uymaması.
Aynı satır/fonksiyon değiller, aynı mekanizma değil — SADECE aynı özelliğin
(canlar bitti) iki ayrı köşesi. #25 bu ikisiyle İLİŞKİSİZ — konfigürasyon
(`PAYWALL_REASONS`) ve oturum-sayacı (`paywallSuppressedFirstSession`)
temelli, ayrı bir mekanizma; zaten bir kod kusuru da değil.

---

## #29 — Frekans Bulma play/pause ikonu + ensureAutoNext() bloklama

**KAPANMIŞ — G187 (Bug 29, KATMAN 1+2).**

Play/pause ikon durumu `updateStartBtnLabel()` (`www/js/app.js:2074-2112`)
tarafından güncelleniyor — TÜM modlarda ortak (`#startBtn` paylaşılan
buton), sadece `autoStopped` global değişkenine bakıyor
(`www/js/app.js:2104-2105`: `autoStopped ? "▶" : "⏸"`). Frekans Bulma'ya
özel bir ikon-mantığı YOK.

`ensureAutoNext(durationMs)` (`www/js/app.js:5268-5326`) üç noktada
bloklanıyor/erken dönüyor:
1. `www/js/app.js:5269` — `if (autoStopped) return;`
2. `www/js/app.js:5279` — `if (!isUserPro() && currentLives <= 0) return;`
   (#22'yle AYNI G178 ailesi, farklı bir çağrı noktası)
3. `www/js/app.js:5301` — `challenge.active && !examGateActive() &&
   challenge.done >= challenge.total` → `finishChallenge(); return;`
   (blok değil, bölüm-bitişine yönlendirme)

Bug 29'un GERÇEK bulunan kök sebebi bunlardan HİÇBİRİ değil — Frekans
Bulma'nın "Dokunmalı" biçimindeki `freqTapTimer` (180ms dokunuş debounce'u)
round `teardownActiveRound()` (can/oturum sınırı) veya `goToNextRound()`
("Atla") ile bitince TEMİZLENMİYORDU; 180ms sonra ateşleyip artık var
olmayan/farklı bir round'a karşı `submitFrequencyGuess()` çağırabiliyordu
(hayalet `stats.rounds` artışı, ölçülmüştü). G187 bunu KATMAN 1
(`www/js/app.js:1580-1581`, `teardownActiveRound()` içinde) ve KATMAN 2
(`www/js/app.js:5846` civarı, savunma amaçlı ek temizlik) olarak iki
noktada kapattı — grep ile 6 ayrı G187/Bug-29 referansı doğrulandı
(`www/js/app.js:1573, 2455, 5345, 5665, 5846, 6355`).

**Kök sebep (tek cümle):** `freqTapTimer`'ın round'un BİRDEN FAZLA bitiş
yolundan (can/oturum sınırı, "Atla") sadece BİRİNDE temizlenmesi, geç
ateşleyip artık geçersiz bir round'a karşı sahte bir cevap göndermesiydi
— tüm bitiş yollarına aynı temizliğin eklenmesiyle kapatıldı.

---

## #54 — Telafi turunun çıkış koşulu + "Atla" ile geçilen turlar

**DURUYOR — kapatıldığına dair hiçbir kayıt/kod izi yok.**

**Çıkış koşulu** `core/exam-system.js:257-263`:
```js
if (phase === "remedial") {
  remedialIndex++;
  if (correct) remedialCorrect++;
  if (remedialIndex >= config.REMEDIAL_LENGTH) {
    const passed = remedialCorrect >= config.REMEDIAL_PASS_COUNT;
    return { event: passed ? "remedial-passed" : "remedial-failed" };
  }
}
```
`REMEDIAL_LENGTH=5`, `REMEDIAL_PASS_COUNT=3` (`core/exam-system.js:62,69`).
Bu blok SADECE `recordAnswer(correct, tier)` (`core/exam-system.js:212`)
ÇAĞRILDIĞINDA çalışıyor.

**"Atla" ile geçilen turlar telafi sayacına YAZILMIYOR.** `goToNextRound()`
(`www/js/app.js:6354-6374`, `#nextBtn`'in — metni "Atla ▶", satır 1586 —
click handler'ı, satır 6375) `examSystem.recordAnswer()`'ı HİÇ ÇAĞIRMIYOR:
```js
async function goToNextRound() {
  clearTimeout(freqTapTimer);
  freqTapTimer = null;
  await audioEngine.initAudio();
  if (blockIfLivesOut()) return;
  ...
  startRound();
}
```
Sadece zamanlayıcıları temizleyip `startRound()`'a geçiyor. `recordAnswer()`
SADECE 10 `submit*Guess` fonksiyonunun (bkz. #55) `handleExamOutcome()`
üzerinden çağırdığı yol — `goToNextRound()` bu yolun DIŞINDA.

`#nextBtn`'i telafi/sınav fazında gizleyen/pasifleştiren hiçbir kod
bulunamadı (`nextBtn.*hidden`/`disabled` için grep sıfır sonuç verdi) —
telafi soruları normal "game" ekranında cevaplanıyor (`#gameExamRow` aynı
ekranın İÇİNDE, ayrı bir screen DEĞİL), yani "Atla" telafi sırasında da
tıklanabilir durumda.

**Sonuç:** kullanıcı telafi turunda sürekli "Atla"ya basarsa
`remedialIndex` hiç artmaz — telafi turu 5 soruya asla ULAŞAMAZ,
tamamlanmaz. Bunun kasıtlı mı (skip = telafiye saymasın) yoksa gözden
kaçmış mı olduğu koddan ÇIKARILAMAZ — BELİRSİZ, ürün kararı gerekir.

**DURUM.md notu:** satır 99'daki "G206↔'#54/#55'" eşleştirmesi bir devir
belgesiyle çapraz-kontrol notu, G206'nın kendisi (satır 462-499) SADECE
`#55`i (Pro'da BÖLÜM sıfırlanması) kapsıyor — `#54`/telafi-Atla konusuna
G206 içinde TEK SATIR değinilmiyor. Bu bir çelişki değil ama bir eksik
eşleştirme — #54 hiçbir G-numarasında ele alınmamış.

---

## #55 — Sınav barı soru sayacı, 12 modda aynı yol mu

**KAPANMIŞ / BUG DEĞİL — 12 modun 12'si de aynı yolu kullanıyor,
koddan doğrulandı.**

Sayaç `renderGameHeader()` (`www/js/app.js:3671-3688`) TEK yerde okunuyor,
mod bazlı dallanma YOK:
```js
const current = isRemedial ? examSystem.remedialIndex : examSystem.examIndex;
...
els.gameExamProgress.textContent = `${isRemedial?"TELAFİ":"SINAV"} ${Math.min(current+1,total)}/${total}`;
```

`handleExamOutcome()` (`www/js/app.js:2822`) 10 ayrı `submit*Guess`
fonksiyonunun SONUNDA, HEPSİNDE AYNI kalıpla çağrılıyor
(`!gameOver && examGateActive() && handleExamOutcome(q, result, gained)`,
satır 4058/4160/4247/4317/4387/4479/4561/4652/4741/4839):

| Fonksiyon | Mod(lar) |
|---|---|
| `submitFrequencyGuess` | frekans-bulma |
| `submitCutoffGuess` | kesim-noktasi |
| `submitLevelGuess` | db-seviyesi |
| `submitPanGuess` | pan-konumu |
| `submitWidthGuess` | stereo-genislik |
| `submitBoostCutGuess` | boost-mu-cut-mu |
| `submitQWidthGuess` | q-genisligi |
| `submitThreeWayGuess` | kompresor + reverb + distortion (`THREE_WAY_MODE_IDS`, `www/js/app.js:63`) |
| `submitTonalDengeGuess` | tonal-denge |
| `submitCakismaGuess` | frekans-cakismasi |

10 fonksiyon × (3'ü `submitThreeWayGuess`'te paylaşılan) = mode-catalog.js'deki
`playable:true` 12 mod (`hiz-modu`/`hangisi-farkli` `playable:false`,
sayılmadı) BİREBİR eşleşiyor.

**Tek istisna — bir MOD DEĞİL, bir ZORLUK KADEMESİ:** `submitProPlusGuess`
(`www/js/app.js:4843`, Frekans Bulma'nın Pro Plus zorluğu) listede YOK —
`handleExamOutcome()`'ı hiç çağırmıyor. Bu YENİ bir bulgu DEĞİL, G206'da
zaten ölçülüp "BİLİNEN, KAPSAM DIŞI BIRAKILAN AÇIK" olarak DURUM.md'ye
işlenmiş (satır 482-491) ve BEKLEYEN KARARLAR'a eklenmiş.

**#29/#54/#55 aynı kök nedene mi bağlı? HAYIR.** Üçü de "sınav/telafi
akışı" şemsiyesinde ama üç FARKLI mekanizma: #29 → bir TEMİZLENMEMİŞ
zamanlayıcının (`freqTapTimer`) round bitince hayalet bir cevap
göndermesi (KAPANMIŞ, G187). #54 → `recordAnswer()`'ın "Atla" yolundan
HİÇ ÇAĞRILMAMASI, yani EKSİK bir çağrı (DURUYOR, hiç kapatılmamış). #55 →
bir doğrulama sorusu, gerçek bir kusur DEĞİL (mekanizma zaten 12 modun
12'sinde de tutarlı) — sadece Pro Plus'ın zaten BİLİNEN/kararı bekleyen
istisnası var, o da #54'ten TAMAMEN AYRI bir konu (zorluk kademesi vs.
skip-butonu).

---

## ÖZET TABLO

| # | Durum | Kapatan G | Kök sebep (1 cümle) |
|---|---|---|---|
| #22 | KAPANMIŞ | G178 | 3 fonksiyonda eksik `isUserPro()` kontrolü |
| #20 | KAPANMIŞ | G177 (+G185) | `goBackFromSubpage()`'in ekran-yığını varsayımı paywall'a uymuyordu |
| #25 | BUG DEĞİL | — (G63/G165/G185 tasarımı) | Konfigürasyon-bazlı (`PAYWALL_REASONS`) + ilk-oturum bastırma, kasıtlı |
| #29 | KAPANMIŞ | G187 | Temizlenmemiş `freqTapTimer` hayalet cevap gönderiyordu |
| #54 | **DURUYOR** | — | `goToNextRound()` ("Atla") `recordAnswer()`'ı hiç çağırmıyor |
| #55 | BUG DEĞİL | — | Mekanizma 12 modda tutarlı; Pro Plus istisnası ayrı ve zaten bilinen bir konu |

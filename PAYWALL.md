# PAYWALL

Bu dosya G61'de (bu turda) ilk kez oluşturuldu — önceki talimat "PAYWALL.md
(repoda)" diyordu ama dosya repoda YOKTU (git geçmişinde de hiç yoktu,
kontrol edildi). Kurallar doğrudan görev talimatından alındı, uydurulmadı.
Bu dosya artık DURUM.md'nin paywall'a özel karşılığı — ücretsiz/Pro kararları
buraya, genel proje durumu DURUM.md'ye yazılır.

## Kapsam — Parça 1 (kısıtlama MANTIĞI): TAMAMLANDI, G61/G62

- Satın alma (IAP) YOK — `isUserPro()` hâlâ `realPro=false || devFlags.
  simulatePro` (bkz. app.js). Gerçek satın alma AYRI bir parça (Parça 3).
- Tek doğruluk kaynağı: `www/js/core/paywall.js` — SAF fonksiyonlar, ses/DOM
  bağımsız, hepsi `test/paywall.test.mjs`'te test edilir. `mode-catalog.js`'in
  `tier` alanı SADECE kart rozeti (görsel) için — gerçek erişim kararı HER
  ZAMAN `paywall.js`'ten okunur, ikisi elle senkron tutulur.

## Kapsam — Parça 2 (PAYWALL EKRANI): TAMAMLANDI, G63

- Kilit tetiklenince toast YERİNE `screen-paywall` (mevcut "Satın Alma"
  ekranı, EKRAN 10) DOĞRUDAN açılır — `app.js:openPaywallReason(reasonKey)`.
- Aynı ekran İKİ modda çalışır: GENEL (Ayarlar → "Pro'ya geç", Araçlar kilit
  örtüleri — bağlamsal bant gizli, "Geri yükle" görünür) ve BAĞLAMSAL (6
  kilit tetiklemesi — bağlamsal bant görünür, "Geri yükle" gizli, "Reklam
  İzle" SADECE can-bitti'de). İki AYRI ekran YOK, `resetPaywallToGeneric()`/
  `openPaywallReason()` AYNI DOM'u yeniden düzenliyor.
- "Pro Al" ve "Reklam İzle" SİMÜLASYON — gerçek IAP/reklam SONRAKİ parçalar
  (Parça 3/4). "Pro Al" `devFlags.simulatePro=true` yapar (task'ın kendi
  tarifi); "Reklam İzle" +1 can ekler.

## Mod erişimi

| Mod | Ücretsizde | Kaynak |
|---|---|---|
| Frekans Bulma | ✅ Açık | `paywall.FREE_MODE_IDS` |
| Kesim Noktası | ✅ Açık | `paywall.FREE_MODE_IDS` |
| Q Genişliği | ✅ Açık | `paywall.FREE_MODE_IDS` |
| Boost mu Cut mu | ✅ Açık | `paywall.FREE_MODE_IDS` |
| Kompresör | ✅ Açık | `paywall.FREE_MODE_IDS` (mode-catalog tier: pro→**free**, G61) |
| dB Seviyesi | 🔒 Pro gerekli | `checkModeAccess` → reason:"pro" |
| Reverb | 🔒 Pro gerekli | `checkModeAccess` → reason:"pro" |
| Tonal Denge | 🔒 Pro gerekli | `checkModeAccess` → reason:"pro" |
| Distortion | 🔒 Pro gerekli | `checkModeAccess` → reason:"pro" |
| Frekans Çakışması | 🟡 Günde 1 | `paywall.DAILY_TASTE_MODE_ID` |

**G62 DÜZELTMESİ — seviye kilidi SADECE Pro'da uygulanır:** `mode-catalog.js`'in
her girdisinde bir `unlockLevel` de var (Kompresör: 12, dB Seviyesi: 6, vb.) —
bu G61'de mod erişiminden AYRI bir eksen olarak bırakılmıştı ama cihaz testinde
gerçek bir bug çıkardı: ücretsiz kullanıcı Kompresör'e (tier="free",
unlockLevel=12) "Seviye yetersiz" diyerek TAKILIYORDU, oysa Kompresör onun için
zaten TAM AÇIKTI. Kök sebep: seviye/sınav sistemi ZATEN Pro özelliği (bkz.
"Sınav + seviye atlama" aşağıda) — free'de seviye hiç İLERLEMEDİĞİ için bir
seviye eşiğine takılmak anlamsızdı. `core/paywall.js:meetsLevelRequirement
(isPro, academyLevel, unlockLevel)` artık `isPro=false` iken HER ZAMAN `true`
döner (eşik hiç okunmaz) — seviye kilidi SADECE Pro kullanıcı için (gerçek
IAP ya da geliştirici simülasyonu) academyLevel/unlockLevel'a bakar. İkinci bir
düzeltme: kilitli-Pro modlara (dB/Reverb/Tonal/Distortion) basınca ÖNCEDEN
(seviye kilidi her zaman devrede olduğu için) yanlışlıkla "Seviye yetersiz"
mesajı çıkıyordu — seviye kilidi artık free'de hiç devreye girmediği için
`checkModeAccess`'in "Pro gerekli" mesajı doğru şekilde öne çıkıyor.

**Günde 1 tadımlık (Frekans Çakışması) — mekanik:**
- `stats.dailyTasteLastPlayedAt` (epoch ms, `null`=hiç oynanmadı) storage'da.
- `paywall.canPlayDailyTaste(lastPlayedAt, now)`: YEREL takvim günü (UTC değil
  — cihazın kendi saat dilimi) karşılaştırması. Aynı gün içinde ikinci deneme
  kilitli.
- **İstismar koruması:** `now < lastPlayedAt` (saat GERİYE alınmış) ise
  SONUÇ HER ZAMAN "hâlâ kilitli" — takvim günü karşılaştırması TEK BAŞINA
  yeterli değil (aksi hâlde "bugün oyna → saati düne çek → tekrar oyna"
  istismarı mümkün olurdu).
- İşaretleme ANI: mod kartına dokunulduğunda DEĞİL, gerçek round
  BAŞLADIĞINDA (`els.startBtn`'in fresh-start dalı) — yanlışlıkla karta basıp
  geri çıkan kullanıcı günün hakkını kaybetmesin diye.
- Savunmacı ikinci kontrol AYNI noktada tekrar var: "Tekrar Oyna"/"10 soru
  daha" (`startFreshAttempt`) mod kartına hiç uğramadan doğrudan oyun
  ekranına düşüyor, aynı oturumda (ör. dev Pro kapatılıp) hak tükenmiş
  olabilir.

## Oturum limitleri (ücretsiz)

- **5 soru/oturum:** `roundsInThisPlaySession` (her yeni soru kurulduğunda
  +1) `paywall.FREE_SESSION_QUESTION_LIMIT`e (5) ulaşınca `finalizeIfGameOver()`
  oturumu kapatır (`showSessionEnd("freeLimit")`) — 6. soru hiç kurulmaz.
  Pro'da bu kontrol her zaman `false` döner (`isFreeSessionLimitReached`).
  Yeni bir oturum (Tekrar Oyna/10 soru daha) YENİDEN 5 soru hakkı açar — bu
  "toplam ömür boyu 5" DEĞİL, "oturum başına 5" (task'ın kendi ifadesi).
- **Can 5, 30 dakikada 1 dolar (GERÇEK zaman tabanlı):**
  `stats.livesLastRefillAt` referans noktası, `paywall.applyLivesRefill`
  (SAF fonksiyon) `now - lastRefillAt` süresinden kaç tam 30dk aralığı
  geçtiğini hesaplar, `TOTAL_LIVES`i (5) aşmaz. Referans noktası dolum
  tetiklendiğinde TAM tüketilen süre kadar ilerletilir (drift yok — art arda
  hızlı açıp kapatarak "bedava can" üretilemez). Saat GERİYE alınırsa
  (`now <= lastRefillAt`) dolum SIFIR, referans KORUNUR.
  Sayaç, dolu (5/5) durumdan bir can kaybedildiği ANDA `now`a çekilir
  (`paywall.onLifeLost`) — zaten dolu değilken kaybedilen bir can sayacı
  SIFIRLAMAZ. Kontrol noktaları: `syncLives()` (açılış, `visibilitychange`
  ile ön plana dönüş, `startFreshAttempt`).
  Eski geçici köprü (`storage.js`'te `lives<=0 → TOTAL_LIVES` anlık sıfırlama)
  KALDIRILDI.
- **Serbest/süresiz oynama YOK:** 5 soru sınırı hangi seçenek seçilirse
  seçilsin HER ZAMAN uygulanır (bu ANLAMDA G61'den beri zaten doğruydu). AMA
  G61'de "Serbest (sonsuz)" Oyun Türü sheet'inde SEÇİLEBİLİR bırakılmıştı
  ("ekran değil sadece kural" kararı) — cihaz testinde bunun kafa
  karıştırdığı bulundu ("seçtim ama çalışmıyor"). **G65 DÜZELTMESİ:** Oyun
  Türü sheet'indeki "Serbest" satırı artık ücretsizde KİLİTLİ görünür (Pro
  rozeti + 🔒, `paywall.isFreePlayModeLocked`), basınca `openPaywallReason
  ("freePlayMode")` paywall'ı açar. `enforceFreeRestrictions()` (downgrade
  senaryosu) seçim hâlâ "free"deyse "10 Soruluk Bölüm"e zorlar.
- **Sınav + seviye atlama YOK:** `examGateActive()` (`app.js`) =
  `mode.EXAM_ENABLED && isUserPro()` — sınav SİSTEMİNİN kendisi
  (`core/exam-system.js`) DEĞİŞMEDİ, sadece app.js'in onu ne zaman devreye
  aldığı bu tek fonksiyondan geçiyor (~15 eski `mode.EXAM_ENABLED` okuması
  buna yönlendirildi). Mod-bazlı XP/seviye (Sv rozeti) BUNDAN ETKİLENMEZ —
  ayrı bir eksen (bkz. "Kısıtlanmayanlar").

## Diğer kilitler (ücretsiz)

| Kural | Uygulama noktası |
|---|---|
| Kendi dosya yükleme: kilitli | `.upload-trigger-btn` (Oyun Ayarları + Motor 3 slotları), Ses Kaynağı sheet'inin "Dosya seç" satırı — ikisi de `paywall.isUploadLocked` |
| Sabit zorluk seçimi: kilitli | `diffFixedBtn`, `autoDiffSwitchBtn`, `.setting-row`(difficultySelect) — hepsi `paywall.isFixedDifficultyLocked`; downgrade sonrası state düzeltmesi `enforceFreeRestrictions()` |
| Bölge seçerek çalışma: kilitli | `.setting-row`(focusSelect) UI'da engellenir + `currentFocusRange()` okuma-anında savunmacı olarak tam spektruma düşer — `paywall.isFocusRangeLocked` |
| Zayıf bölge raporu: kilitli | İlerleme sekmesi "Şu An Neredesin" (`renderWhereNow`) + "en zayıf: X" özeti (`zoneSub`) TAM kilitli (metin, bulanıklaştırılamaz) — `paywall.isWeakZoneReportLocked` |
| 6 bölge geçmiş analizi: bulanık önizleme | "Frekans bölgesi" panelinin bar grafiği (`zoneList`) `blur(5px)` — veri VAR olduğu görülür, okunamaz — `paywall.isZoneHistoryBlurred` |
| Araçlar sekmesi içeriği: kilitli | Analiz/Referans filtreleri ZATEN Pro-kilitliydi (`applyProLockVisibility`, önceki tur) — bu turda upload kartı da eklendi (`toolsUploadBtn`) — `paywall.isToolsContentLocked` |

## Paywall ekranı — 7 tetikleme noktası (G63 + G65)

`core/paywall.js:PAYWALL_REASONS` — her biri `kicker`/`title`/`detail`
(bağlamsal bant) + `buttons` ("pro" ya da "livesOut") taşır, TEK kaynak:

| # | Tetikleme | reasonKey | buttons | Uygulama noktası |
|---|---|---|---|---|
| 1 | 5. soru bitince | `sessionLimit` | pro | `finalizeIfGameOver()` |
| 2 | Canlar bitince | `livesOut` | livesOut | `finalizeIfGameOver()` + `blockIfLivesOut()` (startRound/startBtn/goToNextRound'un ortak girişi) |
| 3 | Kilitli moda basınca (dB/Reverb/Tonal/Distortion) | `modeLocked` | pro | `renderModeGrid` kart click |
| 4 | Yükle butonuna basınca | `upload` | pro | `.upload-trigger-btn`, Ses Kaynağı sheet'inin "Dosya seç" satırı, `toolsUploadBtn` |
| 5 | Frekans Çakışması günde-1 bitince | `dailyUsed` | pro | `renderModeGrid` kart click + `startBtn`'in savunmacı ikinci kontrolü |
| 6 | İlerleme'de bulanık grafiğe basınca | `zoneHistory` | pro | `els.zoneList` click (tek seferlik dinleyici) |
| 7 | Oyun Türü sheet'inde "Serbest (sonsuz)"a basınca (G65) | `freePlayMode` | pro | Oyun Ayarları sheet'inin genel `openSheet()` satır click'i (`isLockedFreePlay`) |

Diğer (7 tetiklemeye DAHİL değil, task'ın listesinde yok) — Analiz/Referans
filtreleri kilit örtüleri ve Ayarlar → "Pro'ya geç" GENEL modda
(`resetPaywallToGeneric()`) paywall'a gider, bağlamsal bant YOK.

**"İlk oturumda paywall yok":** `paywall.isFirstSession(totalRoundsEver)` —
`app.js`'te BİR KEZ, script başlarken `stats.rounds` okunarak hesaplanan
`const paywallSuppressedFirstSession` (runtime'ın TAMAMI boyunca sabit).
`stats.rounds===0` ise (kullanıcı bu kuruluma kadar HİÇ tur oynamamış) TÜM
7 tetiklemede `openPaywallReason()` `false` döner — çağıran taraf G61'in
ESKİ davranışına (toast ya da sade "lost"/"freeLimit" seans-sonu ekranı)
düşer, kısıtlamanın KENDİSİ (5 soru/can/kilit) GEÇERLİ kalır, sadece PAYWALL
EKRANI o ilk ziyarette hiç açılmaz.

## Kısıtlanmayan (her ikisi de aynı)

A/B bypass, ses kalibrasyonu, oturum skoru, kişisel rekor, XP/seviye/streak/
rozet. Bunlara BU TURDA hiçbir dokunuş yapılmadı — kod incelemesiyle
doğrulandı (`progress.modeLevel`/`ACHIEVEMENTS`/`stats.bestCombo` vb.
`isUserPro()`'ya hiç bakmıyor).

## Test edilebilirlik

`devFlags.simulatePro` (Geliştirici modu → "Geliştirici: tam erişim") →
`isUserPro()` ANAHTAR — açıkken TÜM kısıtlar kalkar (mod erişimi, sınav,
sabit zorluk, bölge, upload, zayıf bölge raporu, Araçlar), kapalıyken
GERÇEK ücretsiz kısıtlarıyla çalışır. `syncDevUI()` (anahtar her
değiştiğinde çağrılır) hem `renderModeGrid()`i hem `enforceFreeRestrictions()`
'ı tetikler — geçiş ANINDA state tutarlı kalır (split-brain yok).

G63'ten beri paywall ekranındaki "Pro Al" butonu da AYNI mekanizmayı (gizli
geliştirici menüsünü GEREKTİRMEDEN) tetikliyor — kilitli bir moda basıp
"Pro Al"a basmak, uygulamanın GERÇEK kullanıcı akışıyla Pro'yu test etmenin
bir YOLU artık (Ayarlar'a gitmeye gerek yok).

## Sonraki parçalar (BU TURUN KAPSAMI DIŞI)

- **Parça 3:** Gerçek IAP — `isUserPro()`'nun `realPro` dalı, "Pro Al"
  butonunun `devFlags.simulatePro=true` SİMÜLASYONU yerini gerçek satın
  almaya bırakır, mağaza fiyatı `paywall.PRO_PRICE`'ın (₺399, gösterim
  metni) yerini alır.
- **Parça 4:** Gerçek ödüllü reklam — "Reklam İzle" butonunun +1 can
  SİMÜLASYONU yerini gerçek reklam SDK'sı alır.
- **Görsel cila:** paywall ekranı G63'te "temiz bir temel" olarak kuruldu
  (task'ın kendi tarifi) — buton/kart aralıkları, `.actionbar`'ın 3 satıra
  (Reklam İzle+Pro Al+alt satır) çıktığı `livesOut` durumundaki `.scroll`
  alt boşluğu (`calc(150px+...)`, GENERİK bir değer, paywall'a özel
  ayarlanmadı) kullanıcının cihazda göreceği/ayarlayacağı noktalar.

# PAYWALL

Bu dosya G61'de (bu turda) ilk kez oluşturuldu — önceki talimat "PAYWALL.md
(repoda)" diyordu ama dosya repoda YOKTU (git geçmişinde de hiç yoktu,
kontrol edildi). Kurallar doğrudan görev talimatından alındı, uydurulmadı.
Bu dosya artık DURUM.md'nin paywall'a özel karşılığı — ücretsiz/Pro kararları
buraya, genel proje durumu DURUM.md'ye yazılır.

## Kapsam — Parça 1 (BU TUR): sadece kısıtlama MANTIĞI

- Satın alma (IAP) YOK — `isUserPro()` hâlâ `realPro=false || devFlags.
  simulatePro` (bkz. app.js). Gerçek satın alma AYRI bir parça.
- Güzel bir paywall EKRANI YOK — kilitli bir özelliğe basınca sadece basit
  bir `toast(title, detail)` (bkz. `core/paywall.js:LOCK_MESSAGES`). Mevcut
  "Satın Alma" ekranı (EKRAN 10, `goScreen("paywall")`) zaten vardı, bu turda
  DEĞİŞTİRİLMEDİ.
- Reklam YOK.
- Tek doğruluk kaynağı: `www/js/core/paywall.js` — SAF fonksiyonlar, ses/DOM
  bağımsız, hepsi `test/paywall.test.mjs`'te test edilir. `mode-catalog.js`'in
  `tier` alanı SADECE kart rozeti (görsel) için — gerçek erişim kararı HER
  ZAMAN `paywall.js`'ten okunur, ikisi elle senkron tutulur.

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
- **Serbest/süresiz oynama YOK:** Ayrı bir UI kısıtı EKLENMEDİ (Oyun Türü
  seçici hâlâ görünür/seçilebilir, task: "ekran değil sadece kural") — 5
  soru sınırı hangi seçenek seçilirse seçilsin HER ZAMAN uygulanır, bu yüzden
  "Serbest (sonsuz)" seçili olsa bile ücretsizde pratikte asla 5'i geçmez.
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

## Sonraki parçalar (BU TURUN KAPSAMI DIŞI)

- **Parça 2:** Gerçek IAP (`isUserPro()`'nun `realPro` dalı), güzel paywall
  ekranı/upsell akışları, "Satın al" butonunun gerçek işlevi.
- **Parça 3:** Reklam.
- Paywall EKRANININ (`index.html` EKRAN 10) statik metni bu turda
  GÜNCELLENMEDİ — "Seans başına 5 soru" (`index.html:717`) zaten YENİ
  kuralla örtüşüyor (tesadüfen doğru). Ekran şu an sadece "5 can" diyor,
  "30 dakikada dolar" ifadesi YOK — TASARIM.md'nin prototip referansında
  vardı ama G2'de bilerek kullanılmamıştı (o zaman gerçek dolum yoktu);
  artık gerçek dolum VAR, bu metin eklenebilir ama bu turun kapsamı dışında
  bırakıldı (ekran/kopya değişikliği = sonraki parça).

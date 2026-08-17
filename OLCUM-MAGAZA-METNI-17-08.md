# OLCUM-MAGAZA-METNI-17-08

GÖREV: ÖLÇÜM. KOD YAZMA, DOSYA DEĞİŞTİRME, COMMIT ATMA.
App Store açıklamasındaki (Logic'in verdiği metin/iddialar) claim'ler
koddaki GERÇEK davranışla karşılaştırıldı — kod OKUNDU/grep edildi,
hiçbir dosya değiştirilmedi.

**Not:** Bu görevde bana App Store metninin TAM/orijinal dosyası
verilmedi — task'ın kendi mesajında pasted olan mod listesi + spesifik
iddialar (5 egzersiz, 5 soru/5 can, vb.) KARŞILAŞTIRMA KAYNAĞI olarak
kullanıldı. "Pro'nun verdikleri listesi" gibi metnin TAM içeriğinin
verilmediği maddelerde SADECE kodun kendi listesi raporlandı, birebir
metin karşılaştırması YAPILAMADI (bkz. madde J).

---

## A) Mod adları — birebir aynı mı?

**KAYNAK:** `www/js/core/mode-catalog.js` (12 `playable:true` girdi,
`www/js/app.js`'te 12 `registerMode()` çağrısıyla TEYİTLİ).

| Metindeki ad | Koddaki ad (`mode-catalog.js`) | Sonuç |
|---|---|---|
| Frekans Bulma | Frekans Bulma | ✅ |
| Kesim Noktası | Kesim Noktası | ✅ |
| dB Seviyesi | dB Seviyesi | ✅ |
| Boost mu Cut mu | Boost mu Cut mu | ✅ |
| Q Genişliği | Q Genişliği | ✅ |
| Kompresör | Kompresör | ✅ |
| Reverb | Reverb | ✅ |
| **Distortion** | **Saturation & Distortion** | 🔴 **UYUŞMUYOR** |
| Tonal Denge | Tonal Denge | ✅ |
| Frekans Çakışması | Frekans Çakışması | ✅ |
| Pan Konumu | Pan Konumu | ✅ |
| Stereo Genişlik | Stereo Genişlik | ✅ |

**Mod SAYISI:** 12 — metinle eşleşiyor (`mode-catalog.js`'de TAM 12
`playable:true` girdi var; `hiz-modu`/`hangisi-farkli` `playable:false`,
metinde de yok — tutarlı).

## B) "Distortion" artık "Saturation & Distortion" — metin eski mi? Başka eskimiş ad var mı?

**EVET, metin eski.** `mode-catalog.js:46`:
`{ id: "distortion", ad: "Saturation & Distortion", ... }` (G59'dan beri).
Bu tek maddenin dışında (A tablosu) başka hiçbir ad UYUŞMAZLIĞI
bulunamadı — 11/12 birebir eşleşiyor.

## C) "Ücretsiz sürümde 5 egzersiz açık" — kod 5 mi diyor?

**DOĞRU.** `www/js/core/paywall.js:34-40`:
```js
export const FREE_MODE_IDS = Object.freeze([
  "frekans-bulma", "kesim-noktasi", "q-genisligi", "boost-mu-cut-mu", "kompresor"
]);
```
TAM **5** eleman. Bu, `mode-catalog.js`'in `tier` alanından BAĞIMSIZ
tek gerçek erişim kaynağı (dosya başı yorumu bunu açıkça belirtiyor).

## D) "Seans başına 5 soru, 5 can" — doğru mu?

**İKİSİ de DOĞRU, ama "5 can" SADECE ücretsiz/Pro-olmayan kullanıcı için geçerli:**
- `www/js/core/paywall.js:113`: `export const FREE_SESSION_QUESTION_LIMIT = 5;` — ✅ 5 soru doğru.
- `www/js/core/storage.js:48`: `export const TOTAL_LIVES = 5;` — ✅ 5 can doğru (varsayılan/ücretsiz taban).
- ⚠️ `www/js/app.js:1538-1540` (`loseLife()`): **Pro kullanıcıda can sınırı YOK** ("Pro (gerçek ya da geliştirici simülasyonu): can sınırı yok"). Metin bunu bir ÜCRETSİZ SÜRÜM tanımı olarak veriyorsa (paragrafın bağlamı öyle görünüyor — "5 egzersiz" cümlesiyle aynı yerde) DOĞRU; genel/koşulsuz bir uygulama açıklaması olarak okunursa YANILTICI olabilir (Pro'da can sınırsız).

## E) "Zayıf bölge raporu" gerçekten var mı, çalışıyor mu?

**VAR ve ÇALIŞIYOR, Pro'ya kilitli.** `paywall.js:194`:
`export function isWeakZoneReportLocked(isPro) { return !isPro; }`
— `app.js:3592-3597` (`renderZonePanel`) ve `app.js:3653`
(ana menü "Bugünün Önerisi" kartı) tarafından GERÇEKTEN kullanılıyor,
`personalization.js:getWeakZone` + `zoneStats`'tan GERÇEK veriyle
besleniyor (uydurma/placeholder DEĞİL).

## F) "Günlük görevler" var mı?

**VAR.** `www/js/core/storage.js` (`freshDaily()`, `daily.tasks` şeması)
+ `www/js/app.js:3430-3457` (`renderDaily()`, gerçek ilerleme/ödül
render'ı, `DAILY_TASK_ICON`) — gerçek, çalışan bir özellik.

## G) "İlerleme geçmişi" var mı?

**VAR.** `www/js/app.js:3540` (`renderHistory()`) — 6 çağrı noktasından
(round sonu, mod değişimi, vb.) tetikleniyor, `zoneHistory` verisiyle
GERÇEK grafik üretiyor (Pro'da kilit AÇIK, `openPaywallReason("zoneHistory")`
ücretsizde kilitliyor — bkz. madde J'nin PRO_BENEFITS listesi).

## H) Araçlar sekmesinde vaat edilen ölçümler — hepsi var mı?

**HEPSİ VAR ve GERÇEK DSP İLE HESAPLANIYOR** (`www/js/core/analysis.js`,
ITU-R BS.1770-4/EBU Tech 3342 uyumlu), UI'da GERÇEKTEN gösteriliyor
(`www/js/app.js` satır ~10798-10865):

| Metindeki ölçüm | Kod karşılığı | Durum |
|---|---|---|
| True peak | `truePeakDb` (analysis.js:408,699) → UI "True peak (dBTP)" (app.js:10798) | ✅ |
| LUFS | `powerToLufs`, momentary/short-term/integrated (analysis.js:245-627) | ✅ |
| RMS | Windowed RMS, AES17 konvansiyonu (analysis.js:77-243) | ✅ |
| Faz korelasyonu | `correlation`/`correlationSeries` (analysis.js:644-682) → UI "Faz korelasyonu" (app.js:10863) | ✅ |
| Mono uyum kaybı | `monoLossDb` (analysis.js:669-687) → UI "Mono uyum kaybı" (app.js:10865) | ✅ |
| DC offset | `dcOffsetPercent` (analysis.js:704) → UI "DC offset (%)" (app.js:10804) | ✅ |
| Bant dağılımı | `tonal-balance.js:BANDS`/`bandDevsFromLiveSnapshot` (Tonal Balance aracı, 6 bölge) | ✅ |

## I) "Kendi referansın" özelliği çalışıyor mu?

**ÇALIŞIYOR, gerçek bir özellik.** `www/js/app.js:11301` (`toolsTonalReferences`,
kalıcı liste — `storage.loadToolsTonalReferences()`/`saveToolsTonalReferences()`),
dosya seçici gerçekten bağlı (`els.toolsTonalRefPick` → `openFilesSheetForContext("tonal-ref")`,
app.js:11451-11452), liste/isim/uyarı UI'ları var (`toolsTonalRefList`/
`toolsTonalRefName`/`toolsTonalRefWarn`). Guide-texts.js'te (satır 81-84)
kullanıcıya AÇIKÇA anlatılıyor da ("Bu üç hazır eğri genel bir tür
referansıdır. En doğru sonuç için 'Kendi Referansım' ile...").

## J) Pro'nun verdikleri listesi kodla uyuşuyor mu?

**Task'ın kendi mesajında bu listenin TAM METNİ verilmedi** — bu yüzden
BİREBİR karşılaştırma YAPILAMADI. Kodun KENDİ (tek doğruluk kaynağı,
paywall ekranının DOĞRUDAN bu listeden ürettiği) listesi
`www/js/core/paywall.js:255-263`:

```js
export const PRO_BENEFITS = Object.freeze([
  "12 modun tamamı",
  "Sınırsız soru",
  "Sınav ve seviye atlama",
  "Kendi dosyanı yükleme",
  "Araçlar sekmesi",
  "Zayıf bölge raporu ve geçmiş grafiği",
  "Reklamsız"
]);
```

Bu 7 madde koddaki GERÇEK Pro-kilitli davranışlarla teyit edildi (12
mod → madde A, sınav → `examGateActive()`'in `isUserPro()` şartı,
zayıf bölge raporu/geçmiş → madde E/G). Mağaza metnindeki liste BUNUNLA
karşılaştırılmak isteniyorsa, Logic'in metnin tam halini paylaşması
gerekiyor.

---

## ÖZET — uyuşmayan maddeler

| # | Madde | Durum |
|---|---|---|
| 1 | "Distortion" mod adı | 🔴 UYUŞMUYOR — kod "Saturation & Distortion" diyor (madde A/B) |
| 2 | "5 can" | ⚠️ NÜANS — sadece ücretsiz/Pro-olmayan kullanıcı için doğru, Pro'da can sınırsız (madde D) |

Kalan TÜM maddeler (mod sayısı/isimleri, 5 egzersiz, 5 soru, zayıf
bölge raporu, günlük görevler, ilerleme geçmişi, 7 araç ölçümü, Kendi
Referansım) **koddaki gerçek davranışla UYUŞUYOR**. "Pro'nun verdikleri"
maddesi metnin tam hali verilmediği için karşılaştırılamadı, kodun
KENDİ listesi raporlandı.

Düzeltme YAPILMADI (metin Logic'in, o güncelleyecek) — bu görev SADECE
ölçüm.

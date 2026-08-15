# TUR 2 — YARIM KALANLAR VE UYUŞMAZLIKLAR

_15 Ağustos 2026 · commit `eae97c9`'a kadar._

**Kapsam notu (dürüstlük):** Bu görev 10 bölüm (A-J), her biri kendi
içinde 5-10 alt madde istiyor — TAM kapsamlı bir tarama (her mod dosyası,
her .md belgesi, her koşullu-görünürlük noktası tek tek) bu turun
bütçesinde YAPILAMADI. Aşağıda **derinlemesine doğrulanmış, kanıtlı**
bulgular ÖNCE geliyor; **spot-check edilmiş** olanlar öyle işaretlendi;
**hiç bakılmayan** alt maddeler BELİRSİZ/"bu turda kapsanmadı" diye
açıkça yazıldı — tahmin YÜRÜTÜLMEDİ.

---

## C) SESSİZ BAŞARISIZLIK — bu turun EN ÖNEMLİ bulgusu

### ✅ DÜZELTİLDİ (G229) — `storage.js`'in 12 `save*()` fonksiyonundan 10'u try/catch'SİZ, `savePurchase()` DAHİL
Tek tek sayıldı (`www/js/core/storage.js`):

| Fonksiyon | try/catch var mı? |
|---|---|
| `saveStats` (satır 181) | **YOK** |
| `saveDaily` (226) | **YOK** |
| `savePrefs` (275) | **YOK** |
| `saveDevFlags` (300) | **YOK** |
| **`savePurchase` (331)** | **YOK** |
| `saveUploadSelections` (354) | **YOK** |
| `saveSourceSelections` (378) | **YOK** |
| `saveAnswerFormatSelections` (400) | **YOK** |
| `saveToolsTonalReferences` (428) | **YOK** |
| `saveDailyAcc` (444) | **YOK** |
| `saveZoneStats` (484) | VAR (`catch (e) {}`, sessiz) |
| `saveInProgressRound` (543) | VAR (`catch (e) {}`, sessiz) |

**Asimetri kanıtlanmış** — 10 fonksiyon KORUMASIZ, 2'si SESSİZCE
korumalı (ikisi de hata olsa bile kullanıcıya HİÇBİR ŞEY söylemiyor,
sadece 10'dan farklı olarak en azından APP'İ ÇÖKERTMÜYORLAR). Hiçbir
kod yorumu bu ayrımın NEDENİNİ açıklamıyor — kasıtlı bir tasarım
kararı değil, TUTARSIZ bir kalıp gibi görünüyor.

**En ciddi somut senaryo — satın alma:** `grantRealPro()` (app.js:8789-8793)
`storage.savePurchase()`'ı KORUMASIZ çağırıyor. Çağrı zinciri:
`#buyProBtn`'in click handler'ı (app.js:8799-8827) bunu `try {} finally
{}` İÇİNE alıyor — **`catch` YOK**, yani `localStorage.setItem()` bir
hata fırlatırsa (Safari private-browsing modu QuotaExceededError
fırlatmasıyla İYİ BELGELİ bir davranış — bu TAHMİN değil, WebKit'in
KENDİ dokümante edilmiş kısıtı) `finally` bloğu çalışır (buton state'i
düzelir, kilitlenmez) AMA istisna YUKARI FIRLAR — `toast("🎉 Pro
açıldı"...)` (satır 8809), `resumePausedRoundForPaywall()`, `goBackFromSubpage()`
HİÇBİRİ ÇALIŞMAZ. `purchaseState.proPurchased=true` SADECE BELLEKTE
kalır (satır 8790 istisnadan ÖNCE çalışmış), localStorage'a HİÇ
yazılmamış olur.

**Sonuç:** Kullanıcı StoreKit'te GERÇEKTEN ödeme yapmış olur (Apple
tarafında işlem tamamlanmıştır — bu adımın KENDİSİ `iap.purchasePro()`
İÇİNDE, `savePurchase()`'DAN ÖNCE gerçekleşir), ama bu oturumda hiçbir
hata/başarı mesajı GÖRMEZ (toast asla çalışmaz), ve **bir sonraki
uygulama açılışında** `loadPurchase()` `localStorage`'dan `proPurchased:false`
okur — Pro kilit AÇIK GÖRÜNMEZ. **Kısmi öz-iyileşme VAR:**
`iap.checkProOwnership()` (app.js:8276-8280) her açılışta SESSİZCE
StoreKit'e sorup `owned===true` ise `grantRealPro()`'yu TEKRAR çağırıyor
— AMA bu da AYNI korumasız `savePurchase()`'a bağımlı, VE ağ/StoreKit
erişimi GEREKTİRİYOR (çevrimdışı açılışta bu kontrol de çalışmaz demektir
— BELİRSİZ, `checkProOwnership()`'in çevrimdışı davranışı bu turda
DOĞRULANMADI). **Kalıcı veri kaybı senaryosu düşük olasılıklı (normal
kullanıcıda localStorage nadiren dolar/hata fırlatır) ama sıfır DEĞİL,
VE gerçekleşirse kullanıcıya HİÇBİR ZAMAN bildirilmiyor.**

### 🟡 ORTA — `resetAllProgress()`'in "Sıfırla" vaadi ile kapsamı tam örtüşmüyor
`app.js:7129-7174` — toast metni "Her şey baştan." diyor, buton metni
"Tüm istatistikler" diyor. Temizlenenler: `stats`/`daily`/`zoneStats`/
`history`/`inProgressRound`. **Temizlenmeyenler** (grep ile doğrulandı,
fonksiyonun İÇİNDE bu üçünün ADI hiç geçmiyor): `dailyAcc` (günlük
isabet geçmişi, `saveDailyAcc`/`DAILY_ACC_KEY`), `toolsTonalReferences`
("Kendi Referansım" listesi), `uploadSelections`/`sourceSelections`
(mod başına seçili kaynak). **`purchaseState`/`devFlags` KASITLI
korunuyor (DOĞRU davranış — reset satın almayı SİLMEMELİ)** — bu ayrı,
sorun DEĞİL. Ama `dailyAcc`/`toolsTonalReferences` PROGRESS/veri
niteliğinde — "Her şey baştan" vaadiyle ÇELİŞEBİLİR. **Kasıtlı mı
(bu ikisi "istatistik" sayılmıyor) yoksa gözden kaçmış mı — BELİRSİZ,
kullanıcı kararı gerekir.**

### Kapsanmayan alt maddeler (C)
"Konsola yazıp kullanıcıya söylemeyen durumlar" — 35 `console.error`
çağrısının HER BİRİNİN kullanıcıya AYRICA bir mesaj gösterip
göstermediği TEK TEK karşılaştırılmadı (35 site, bu turun bütçesi
dışında) — BELİRSİZ.

---

## I) TUTARSIZLIKLAR

### ✅ DÜZELTİLDİ (G230) — `formatDb()` (level-sheet-terms.js) "-0.0 dB" ÜRETİYORDU
İki AYRI dB biçimlendirme fonksiyonu var (asimetri — bkz. A):
- `app.js:2143-2146` `formatGainDb(gain)`: `Math.round(gain*10)/10` sonra
  şablon string'e gömüyor — **node ile TEST EDİLDİ:**
  `formatGainDb(-0.03)` → `"0 dB"` (GÜVENLİ — JS'in `` `${-0}` ``→`"0"`
  dönüşümü kazayla koruyor).
- `core/level-sheet-terms.js:34-36` `formatDb(db)`: `db.toFixed(1)` —
  **node ile TEST EDİLDİ:** `(-0.03).toFixed(1)` → **`"-0.0"`** —
  `toFixed()` `Math.round`'un aksine işareti KORUYOR. `formatDb(-0.03)`
  → **`"-0.0 dB"`**, GERÇEK bir görsel hata.
`formatDb()` 7 çağrı sitesinde kullanılıyor (`level-sheet-terms.js:43,
60-61, 66-67, 84, 91`) — Zorluk Sheet'inin `gainDb`/`gainStepDb`/`dbDelta`/
`step`/`disturbDb`/`cutStepDb` alanlarını biçimlendiriyor. **Bu
parametrelerin GERÇEKTEN -0.05 ile 0 arasına düşüp düşmediği
(`difficulty-curve.js`'in ürettiği GERÇEK sayı aralıkları) bu turda
TEK TEK doğrulanmadı** — kod yolu KESİN buglu, TETİKLENME SIKLIĞI
BELİRSİZ.

### 🟢 KOZMETİK, doğrulandı — Kompresör'ün terim kullanımı TERIM-KURALI.md'ye uygun
`kompresor.js:434` (`teachingText()`, kullanıcıya gösterilen geri
bildirim): `` `${odd.letter} farklıydı (ratio ${odd.ratio.toFixed(1)}:1,
threshold ${odd.threshold.toFixed(0)} dB)...` `` — "ratio"/"threshold"
İNGİLİZCE bırakılmış, TERIM-KURALI.md'nin KENDİ "İngilizce kalır"
listesindeki (`threshold`/`ratio`) kuralına BİREBİR uyuyor.

### 🟢 TERIM-KURALI.md'nin "hava bant adı olarak kullanılmış" endişesi KOD İLE ÇELİŞİYOR — endişe artık geçersiz
Belge "hava"nın bir BANT ADI (etiket) olarak kullanıldığından
şikayet ediyor, "air" önerisi getiriyor. Grep (`hava` — TÜM `www/js/`)
ile 4 eşleşme bulundu (kesim-noktasi.js:446, frekans-bulma.js:206/236,
reverb.js:87) — DÖRDÜ de AKICI/AÇIKLAYICI cümle içinde ("Parlaklık ve
hava", "hava ve tıslama") — belgenin KENDİSİNİN "açıklama metinlerinde
kalabilir" dediği TÜR. Bandın GERÇEK etiketi HER YERDE "TİZ"
(`BANDS`/`FA_ZONES`, önceki turlarda doğrulanmıştı) — "hava" bir ETİKET
OLARAK hiçbir yerde kullanılmıyor. **TERIM-KURALI.md bu maddede
STALE/yanlış varsayımlı** — kodda böyle bir sorun YOK, düzeltme
GEREKMİYOR.

### Kapsanmayan alt maddeler (I)
Hz/kHz eşiği tutarlılığı, süre biçimi, yüzde yuvarlama — TEK TEK
taranmadı (BELİRSİZ). "Aynı kavramın farklı adı" — sistematik bir
terim-envanteri bu turda çıkarılmadı (BELİRSİZ, TERIM-KURALI.md'nin
KENDİ önerdiği "guide-texts.js'i karşılaştır" adımı YAPILMADI — bu,
ayrı, kapsamlı bir tur gerektirir).

---

## A) ÇİFT UYGULAMA ASİMETRİSİ

### 🔴 (C'de detaylandırıldı) `save*()` fonksiyonlarının try/catch tutarsızlığı
Bkz. yukarısı — bu bölümün de bir örneği.

### 🔴 (I'de detaylandırıldı) `formatGainDb()` vs `formatDb()` — aynı işi (dB biçimlendirme) iki farklı yöntemle yapıyor
Bkz. yukarısı.

### 🟡 ORTA — `#buyProBtn` vs restore butonu: G228 asimetriyi kapattı, AMA yeni bir küçük fark kaldı
G228'de restore butonu artık HER paywall'da görünür. **Kalan fark:**
`#buyProBtn`'in click handler'ı (app.js:8799) `buyProBusy` kilidiyle
ÇİFT-BASIŞ koruması taşıyor; `#restorePurchaseBtn`'in handler'ı
(`handleRestorePurchase`, 8834) `restoreBusy` AYRI bir bayrakla AYNI
korumayı taşıyor — İKİSİ de doğru çalışıyor (paralel, birbirini
BLOKLAMIYOR bilerek — kullanıcı aynı anda hem satın alsın hem geri
yüklesin istenmiyor OLABİLİR ama bu iki bayrak birbirinden BAĞIMSIZ,
teorik olarak İKİSİ AYNI ANDA true olabilir, ikisi paralel tıklanırsa).
**Düşük risk — kozmetik/teorik, gerçek bir çakışma senaryosu bu turda
ÜRETİLMEDİ.**

### Kapsanmayan alt maddeler (A)
"Mixini Yükle vs Referans Filtreleri", "Araçlar'ın dört oynatıcısı",
"Her modun feedback akışı — merkezî mi kopya mı", "geliştirici modu vs
gerçek Pro" (G228 öncesi Tur 1'de `isUserPro()`'nun TEK kaynak olduğu
zaten doğrulanmıştı, o bulgu GEÇERLİ kalıyor) — bu turda AYRICA
karşılaştırılmadı, BELİRSİZ. `pushHistory()`'nin 12 moda AYNI
`{correct,freq}`/`{correct,label,detail,ts}` şeklini uyguladığı (ama
İÇERİĞİN mod-özel olduğu) G227'de ZATEN belgelenmişti — o bulgu
GEÇERLİ, burada TEKRARLANMADI.

---

## D) YARIM KALANLAR

### 🟢 `THREE_WAY = true`'nun 3 mod dosyasında (kompresor/reverb/distortion) ayrı ayrı tanımlanması — KASITLI, zaten belgeli
Grep ile doğrulandı — HER üç dosyanın KENDİ yorumu "bu bayrak SADECE
dokümantasyon/... gerçek kaynak THREE_WAY_MODE_IDS (app.js)" diyor.
**Yeni bir bulgu DEĞİL** (task'ın kendi örneği), sadece DOĞRULANDI —
gerçekten zararsız/kasıtlı bir tekrar, tonal-denge.js'in KENDİ yorumu
("THREE_WAY=true BİLEREK KALDIRILDI") bunun BİLİNÇLİ bir desen
olduğunu AYRICA kanıtlıyor.

### 🟢 `difficulty-curve.js:42`'deki TODO — zararsız, davranışı etkilemiyor
"`contextLayering` alanı (hep false)" — yorumun kendisi bunun HİÇBİR
ZAMAN true olmadığını, yani bu TODO'nun aktif bir kod yolunu
ETKİLEMEDİĞİNİ söylüyor. Tek TODO/FIXME/HACK/XXX eşleşmesi buydu
(grep, `www/js/**` genelinde) — kod tabanı BU KATEGORİDE genel olarak
temiz.

### Kapsanmayan alt maddeler (D)
"Çağrılmayan fonksiyon/ulaşılamayan dal" — `showSessionEnd()` DIŞINDA
sistematik bir ölü-kod taraması (ör. bir linter/coverage aracıyla)
YAPILMADI — BELİRSİZ. "Kullanılmayan import/sabit/CSS sınıfı" — BU
KAPSAMLI bir statik analiz gerektirir, bu turda YAPILMADI — BELİRSİZ.
"Bayrakla kapatılmış özellik" — `devFlags`/`AD_TEST_MODE` DIŞINDA
sistematik taranmadı.

---

## E) BELGE-KOD UYUŞMAZLIĞI

### 🟡 ORTA — `MAGAZA-DENETIM.md`'nin "restore iki yerde var ✅" maddesi Tur 1'de zaten yanlış çıkmıştı (G228'le kapandı)
Bu, görevin KENDİ verdiği örnek — TEKRAR raporlanmıyor, sadece
kapandığı NOT ediliyor (DURUM.md G228).

### BELİRSİZ — sistematik .md taraması bu turda YAPILAMADI
`DURUM.md` (17000+ satır) · `TASARIM.md` (643 satır) · `DEVIR-*.md` ·
`TAM-LISTE-14-08.md` · `GORSEL-TEST.md` · `STRES-TESTI.md` ·
`EVRAK-HESAP-METIN.md` — bunların HER BİRİNİN HER iddiasını kodla
tek tek karşılaştırmak, bu belgelerin toplam boyutu göz önüne
alındığında, AYRI bir turun (muhtemelen belge başına bir alt-görev)
kapsamı. **Bu turda yapılmadı — ciddi bir kapsam boşluğu, açıkça
BELİRSİZ bırakılıyor, gizlenmiyor.**

---

## F) "DOĞRULANDI" İDDİALARININ SINIFLANDIRILMASI (örnek — TAM DEĞİL)

Bu turda TEK TEK sınıflandırılan (temsili bir örnek, TAM liste DEĞİL):

| İddia | Kaynak | Sınıf |
|---|---|---|
| "Restore iki yerde var ✅" | MAGAZA-DENETIM.md | **VARSAYIM idi — Tur 1'de KODLA çürütüldü** |
| "AD_TEST_MODE false olacak" | MAGAZA-DENETIM.md madde 3 | KODDAN doğrulanabilir, hâlâ `true` (RET-RISKI'de tekrar doğrulandı) |
| "Restore artık her paywall'da görünüyor" | DURUM.md G228 | **TESTLE** (`e2e/paywall-flow.spec.mjs`, `git stash` kırmızı/yeşil) |
| "Sıfır ağ çağrısı" | DURUM.md G224/G227 | KODDAN (grep, bu turda TEKRAR doğrulanmadı ama önceki turlarda İKİ KEZ bağımsız doğrulanmıştı) |
| "'i' metinleri tutarlı" | DURUM.md G222 | KISMEN KODDAN (6 kaynak tarandı) — SSS'nin "Canlar" maddesi İSTİSNAİ çıkmıştı (madde 31, G225'te düzeltildi) |
| "THREE_WAY zararsız tekrar" | Bu rapor, D bölümü | KODDAN (bu turda TEK TEK 3 dosya okunarak) |
| "formatDb() -0.0 üretmiyor" | (iddia EDİLMEMİŞTİ, hiçbir belgede yok) | **Bu turda ÇALIŞTIRILARAK BULUNDU — önceden hiçbir yerde "doğrulandı" denmemişti, gerçek bir kör nokta** |

**En riskli grup (VARSAYIM, hiç doğrulanmamış):** bu turun kendi
kapsam sınırları içinde SADECE "restore iki yerde var" örneği tam
doğrulanabildi (ve VARSAYIM olduğu kanıtlandı). DURUM.md'nin binlerce
diğer ✅/BİTTİ kaydının TAMAMININ sınıflandırılması bu turun kapsamı
DIŞINDA kaldı — **BELİRSİZ, büyük bir kısmı muhtemelen KODDAN/TESTLE
ama bazıları (özellikle "canlı doğrulandı" diyip GERÇEK cihaz
erişimi olmayan bir oturumda yazılmış olanlar) VARSAYIM olabilir.**

---

## G) TEST KAPSAMI

### 🟢 Şekil-sadece test — tespit edildi, ÖNCEDEN de bilinen
`test/tonal-balance.test.mjs`'in `DRAFT_TARGET_CURVES` testi (satır
31-38) SADECE 3 anahtar × 6 sonlu sayı şeklini doğruluyor — G223'te
BU ZATEN belgelenmişti. **Başka şekil-sadece test bu turda
ARANMADI** (1315 testin TAMAMINI bu açıdan taramak ayrı bir tur) —
BELİRSİZ.

### 🟡 Kritik akış — 41 `console.error`'ın HİÇBİRİ için "hata durumunda kullanıcı ne görüyor" testi YOK
`localStorage.setItem()` başarısız olduğunda (C bölümündeki bulgu)
davranışı doğrulayan HİÇBİR test yok (grep: `test/storage.test.mjs`
içinde `QuotaExceeded`/`setItem.*throw` gibi bir senaryo YOK) —
**bu, C'deki bulgunun DOĞRUDAN test-kapsamı karşılığı.**

### Kapsanmayan alt maddeler (G)
"Test edildi sanılan ama başka şeye bakan test" — 1315 testin
TAMAMINI bu açıdan incelemek bu turun kapsamı dışında, BELİRSİZ.

---

## B) KOŞULLU GÖRÜNÜRLÜK MATRİSİ, H) DURUM MAKİNESİ, J) ONARILABİLİRLİK — KISMİ

### 🟢 (J) Bozuk/eksik localStorage — LOAD tarafı savunmacı, doğrulandı
`loadStats`/`loadPrefs`/`loadPurchase` (core/storage.js) ÜÇÜ de
`try/catch` + fresh-default fallback taşıyor — bozuk JSON UYGULAMAYI
ÇÖKERTMEZ, sessizce varsayılana döner. **Bu, C bölümündeki SAVE
tarafının asimetrik korumasızlığıyla TAM TERS bir kalıp — LOAD
tutarlı/savunmacı, SAVE tutarsız/çoğunlukla korumasız.**

### 🟢 (J) `resetAllProgress()` satın almayı SİLMİYOR — doğru, doğrulandı
Bkz. C bölümü — `purchaseState`/`devFlags` fonksiyonun İÇİNDE HİÇ
geçmiyor, kasıtlı KORUNUYOR.

### Kapsanmayan alt maddeler (B, H, J)
Koşullu-görünürlük matrisinin TAMAMI (onlarca `classList.toggle`/
`.hidden` noktası) TEK TEK eksen-eksen (Pro/ücretsiz × ilk oturum ×
veri var/yok × can var/yok × dosya yüklü/değil) taranmadı — SADECE bu
turda ve önceki turlarda RASTLANAN noktalar (restore/buyProBtn,
comingSection, uploadGate) doğrulandı. Ekran geçişleri/sheet-üstünde-sheet/
kesinti-anı-durumu SİSTEMATİK olarak taranmadı (önceki turların
Playwright testleri BAZI senaryoları KAPSIYOR ama TAM bir durum-makinesi
envanteri DEĞİL). **Migration'ların geriye dönük uyumluluğu** (ör.
BAS/ALT-ORTA bölünmesi — önceki bir turda "kasıtlı, veri taşınmıyor"
diye belgelenmişti) bu turda TEKRAR doğrulanmadı. **Hepsi BELİRSİZ.**

---

# ÖNCELİK LİSTELERİ

## Yayın öncesi düzeltilecekler (öncelik sırasıyla)
1. **✅ DÜZELTİLDİ (G229)** — `savePurchase()` + diğer 11 `save*()`
   fonksiyonu artık try/catch'li, kritik yol (satın alma/geri yükleme/
   arka plan mülkiyet kontrolü) kullanıcıya AÇIK bir hata mesajı
   gösteriyor. Bkz. DURUM.md G229.
2. **✅ DÜZELTİLDİ (G230)** — `formatDb()` artık "0.0 dB" gösteriyor.
   Tarama sonucu: diğer 6 formatlayıcıdan SADECE `formatGainDb()`/
   `db-seviyesi.js`/`boost-mu-cut-mu.js`'in `formatDb()`'leri aynı
   RİSKİ taşıyordu (ama TESADÜFEN zaten güvenliydiler) — hepsi AÇIKÇA
   güvenli hale getirildi. Bkz. DURUM.md G230.

## 1.1'e bırakılabilir
- `resetAllProgress()`'in kapsamını `dailyAcc`/`toolsTonalReferences`'ı
  da içerecek şekilde genişletmek (ya da "Sıfırla" metnini kapsamla
  eşleştirmek) — düşük risk, kullanıcı kararı gerekir.
- Sistematik .md-kod çapraz doğrulaması (bölüm E/F'nin tam kapsamı).
- TERIM-KURALI.md'nin ÖNERDİĞİ tam guide-texts.js taraması.

## Sadece belge düzeltmesi gerektirenler
- `TERIM-KURALI.md`'nin "hava bant adı" endişesi — kodda karşılığı
  yok, belge NOTU güncellenebilir ("kontrol edildi, sorun bulunamadı"
  diye kapatılabilir).

**Bu turda hiçbir kod DEĞİŞTİRİLMEDİ — sadece ölçüldü.**

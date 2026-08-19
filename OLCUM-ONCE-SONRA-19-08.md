# OLCUM-ONCE-SONRA-19-08 — Frekans Çakışması "Önce/Sonra" düğmeleri: ölçüm

**Görev tipi:** ÖLÇÜM. Kod değiştirilmedi, commit atılmadı. Ölçüm iki
katmanlı: (1) kod okuma + git log (GEÇMİŞ/NE YAPIYORLAR'ın kod-tarafı),
(2) Playwright ile canlı ölçüm — `elementFromPoint`/gerçek `click()`
zaman aşımı (TIKLANABİLİR Mİ) ve canlı `AnalyserNode` spektrum
karşılaştırması (NE ÇALIYOR). Script'ler `scratchpad/once-sonra-*.mjs`
— repoya commit EDİLMEDİ.

---

## 1) NE YAPIYORLAR

**"Önce" (`#cakismaBefore`, `app.js:7233-7240`):** zinciri
`buildDualSourceChain(activeQuestion, …)` ile yeniden kurar (G320'de
eklendi), sonra `audioEngine.setDualCut(activeQuestion.correctSource,
0)` — doğru kaynağın filtresini **0dB'ye** (kesim YOK) çeker. Bu,
sorunun kendisi olan **maskeleme/çakışma HÂLÂ duyulan, orijinal, kesim
uygulanmamış mix**.

**"Sonra" (`#cakismaAfter`, `app.js:7241-7248`):** AYNI yeniden-kurma,
sonra `setDualCut(activeQuestion.correctSource, -Math.abs(
activeQuestion.correctCutDb))` — **doğru kesim miktarı**.

**Kulak butonlarından farkı — KOD OKUYARAK KESİN:** Stage-3 kulak
butonunun "Doğru cevap" (sağ, `#fbEarRight`) dalı (`app.js:7551-7556`)
**BİREBİR AYNI** çağrıyı yapıyor: `setDualCut(activeQuestion.
correctSource, -Math.abs(activeQuestion.correctCutDb))` — "Sonra" ile
**parametre parametre özdeş**. Yani **"Sonra" ile kulak butonunun
"Doğru cevap"ı MATEMATİKSEL OLARAK AYNI sesi çalıyor** — bu bir tahmin
değil, iki çağrı SATIRI karşılaştırıldı.

Sol kulak butonu ("Senin kesimin") kullanıcının KENDİ tahmin ettiği
kesim dB'sini kullanıyor (`guessCutDb`) — Before/After'ın HİÇBİR
düğmesinde KARŞILIĞI YOK (Before/After sadece 0 ve doğru değeri
sunuyor, kullanıcının kendi tahminini DEĞİL).

**Canlı spektrum ölçümü (doğrulayıcı, birincil kanıt DEĞİL):** İlk
ölçümde (300ms yerleşme süresiyle) "Sonra" ile kulak-"Doğru cevap"
arasında 53dB'lik bir "fark" ölçüldü — bu bir DSP farkı DEĞİL, zincir
yeniden kurulurken (gain 0.0001→hedef ramp) YAKALANAN bir GEÇİŞ ANI
artefaktı: yerleşme süresi 1000ms'e çıkarılınca fark 12dB'ye düştü,
azalan eğilim TRANSIENT olduğunu doğruluyor (KOD zaten özdeşliği
KANITLIYOR — canlı ölçüm SADECE "gerçekten ses çalıyor" teyidi için
kullanıldı, hassas dB karşılaştırması için DEĞİL, bu turda GENİŞ BANTLI
müzik kaynağının kendi zamana-bağlı içeriğinin ÖNCEKİ OLCUM-KULAK-
OGRETIM-19-08'de de aynı sorunu yarattığı NOT edildi). "Önce" vs "Sonra"
arasındaki fark (13-14dB, GERÇEK bir DSP farkı bekleniyordu) bu
gürültüyle TUTARLI aralıkta — kesin bir dB rakamı bu turda GÜVENİLİR
ÖLÇÜLEMEDİ, SADECE "farklı" oldukları (beklenen) doğrulandı.

---

## 2) NE ZAMAN GÖRÜNÜYORLAR

Canlı ölçüldü (Playwright, `#cakismaCompare.isVisible()`):

| An | Görünür mü |
|---|---|
| Aşama 1 başlarken | **Hayır** |
| Aşama 1 cevap sonrası | **Hayır** |
| Aşama 3'e ulaşıldı, SORU henüz cevaplanmadı | **Hayır** |
| Aşama 3 cevap SONRASI (geri bildirim ekranı) | **Evet** |

Kod: `app.js:5484` (`submitCakismaGuess`, `q.stage===3` dalı,
correct/wrong FARK ETMEKSİZİN) `hidden` sınıfı kaldırılıyor.
`app.js:1500`/`4439` her YENİ moda girişte/round başında `hidden`
GERİ ekleniyor — yani **SADECE aşama 3'ün geri bildirim ekranında**,
başka HİÇBİR yerde görünmüyor.

---

## 3) TIKLANABİLİR Mİ — ⚠️ ÖNEMLİ, CANLI ÖLÇÜLDÜ

**HAYIR — gerçek bir tıklama/dokunuşla ULAŞILAMIYOR, kanıtlandı:**

- `#cakismaBefore` konumu: `{x:16, y:686.6, w:175, h:52}` (y aralığı
  686.6-738.6).
- `#feedbackBox` (`.fb` paneli, `position:fixed`) konumu: `{x:0,
  y:599.25, w:390, h:244.75}` (y aralığı 599.25-844 — viewport'un
  TAMAMI, alt kısmı).
- `#cakismaBefore`'un Y aralığı `#feedbackBox`'ın Y aralığının
  **TAMAMEN İÇİNDE**.
- `document.elementFromPoint(#cakismaBefore merkezi)` → **`#feedbackDetail`**
  (panelin İÇİNDEKİ metin) döndürüyor, `#cakismaBefore`'u DEĞİL.
- **KIYAS:** AYNI anda `document.elementFromPoint(#fbEarRight merkezi)`
  → **`fbEarRight`**'ın KENDİSİNİ doğru buluyor — çünkü kulak butonu
  panelin ÇOCUĞU (İÇİNDE), `#cakismaCompare` ise panelin DIŞINDA,
  `.game-scroll` akışının bir SİBLİNG'İ.
- **Gerçek bir Playwright `click()` (force OLMADAN, ki bu GERÇEK bir
  kullanıcı dokunuşunun tarayıcı hit-test'iyle AYNI mekanizma) 3000ms
  içinde BAŞARISIZ oldu** ("element is visible ama alınamıyor" —
  actionability zaman aşımı). Bu, "test aracı sınırlaması" DEĞİL —
  TARAYICININ KENDİ koordinat-tabanlı olay dağıtımının SONUCU, gerçek
  bir dokunuş da AYNI şekilde başka bir elemana giderdi.

**SONUÇ: `#cakismaBefore`/`#cakismaAfter`, GÖRÜNÜR OLDUKLARI TEK anda
(geri bildirim paneli açıkken) fiilen ULAŞILAMAZ durumda — ölçüldü,
tahmin değil.**

**Ne zamandan beri böyle? (git log + CSS tarihi, ÇIKARIM — bu turda
GEÇMİŞ bir commit'e geri dönüp YENİDEN TEST edilmedi, sadece tarih
sırası/diff içeriği incelendi, dürüstçe İŞARETLENİYOR):**
- **G51** (`1c86464`, 6 Ağustos) — Before/After'ın kendisi VE
  `#feedbackBox` o zamanki (muhtemelen `.game-scroll` akışı İÇİNDE,
  `position:fixed` OLMAYAN) hâli birlikte geldi.
- **G85** (`361d1f1`, 9 Ağustos, "Oyun Ekranı düzeltmesi") —
  `.fb{position:fixed;...z-index:91}` kuralı BURADA eklendi (`git log
  -S` ile doğrulandı) — cakisma'dan hiç BAHSETMİYOR, GENEL bir geri
  bildirim paneli yeniden tasarımı. Bu değişiklik `#cakismaCompare`'ı
  hiç HEDEFLEMEDEN, VİEWPORT'un alt ~29vh'ini KALICI OLARAK kaplayan
  bir katman haline getirdi — `#cakismaCompare`'ın konumu bu bölgeye
  denk geldiği için (ÖLÇÜLDÜ, yukarı bkz.) örtüşme BU noktada
  BAŞLAMIŞ OLABİLİR.
- **G257** (`810a2ec`, 16 Ağustos) — kulak butonları eklendi, KENDİ
  commit mesajı stage-3 tekniğini "cakismaBefore/After'ın KENDİ deseni"
  diye AÇIKÇA ödünç aldığını yazıyor — ama Before/After'ın KENDİSİNİN
  hâlâ tıklanabilir olup OLMADIĞI o turda test EDİLMEDİ (SADECE yeni
  kulak butonu testleri eklendi, `e2e/ear-buttons.spec.mjs`).
- **Bu turdan (OLCUM-ONCE-SONRA-19-08) ÖNCE, hiçbir e2e testi
  `#cakismaBefore`/`#cakismaAfter`'a GERÇEK bir tıklama denemedi** —
  grep'te bu iki ID'ye dokunan TEK test dosyası G320'nin kendi
  `cakisma-stage3-stops-audio.spec.mjs`'i (BUGÜN eklendi, kod
  yorumunda ZATEN "gerçek dokunuşun ulaşıp ulaşamadığı BELİRSİZ,
  force/evaluate-click kullanıldı" diye İŞARETLİ). **Yani bu, EN AZ
  10 gündür (G85'ten bu yana) fark edilmeden duran bir bug OLABİLİR —
  KESİN TARİH ÖLÇÜLMEDİ, mantıksal ÇIKARIM.**

---

## 4) GEREKLİ Mİ

**"Sonra" — HAYIR, %100 gereksiz (KANITLANDI):** kulak butonunun
"Doğru cevap"ıyla BİREBİR AYNI kodu çalıştırıyor (madde 1). Aynı sesi
iki AYRI (biri BOZUK) yoldan sunuyor.

**"Önce" — KISMEN gerekli, ama düşük marjinal değer:** kulak
butonlarının HİÇBİRİ "kesilmemiş/orijinal maskeleme" sesini
SUNMUYOR — bu, Before/After'ın TEK BENZERSİZ katkısı. AMA: kullanıcı
bu sesi ZATEN, SORUYU CEVAPLAMADAN HEMEN ÖNCE dinledi (aşama 3'ün
sorusu TAM OLARAK bu maskelenmiş mix) — "Önce" SADECE birkaç saniye
önce duyulanı TEKRAR dinletiyor, YENİ bir bilgi KATMIYOR.

**Kavramsal rol (GEÇMİŞ'ten, guide-texts.js:1487/356):**
`syncCakismaVisibility()` (`app.js:1487`) diğer 9 modun standart
`#abToggle`'ını (`"A/B Test"`) cakisma'da AÇIKÇA GİZLİYOR —
Before/After bu modun KENDİ, dual-source'a özel A/B YERİNE geçen
kontrolü olarak TASARLANMIŞ (`core/guide-texts.js:328-331` yorumu
AÇIKÇA böyle diyor). Uygulama içi "Nasıl Oynanır" metni
(`guide-texts.js:356`) kullanıcıya AÇIKÇA "Kestikten sonra 'Önce/Sonra'
ile maskeyi karşılaştırabilirsin" diyor — **yani kullanıcı bu özelliği
KULLANMAYA app tarafından YÖNLENDİRİLİYOR ama madde 3'te ölçüldüğü
gibi ULAŞAMIYOR.** Spotlight turu (`guide-texts.js:444-447`, ilk
oturumlarda gösterilen etkileşimli tur) BUNA HİÇ değinmiyor (SADECE
"dinle"/"seç" adımları var) — bu, Logic'in "farkında değilmiş"
demesini açıklıyor: TEK açıklama pasif bir yardım metninde, aktif
turda YOK.

---

## 5) KALDIRILIRSA

**Dokunulacak yerler (grep ile SAYILDI):**

| Dosya | Ne | Satır sayısı (kaba) |
|---|---|---|
| `www/index.html` | `#cakismaCompare` div + 2 buton | 3 satır silinir |
| `www/js/app.js` | `els.cakismaCompare/Before/After` referansları | 3 satır |
| `www/js/app.js` | `syncCakismaVisibility`/round-reset'teki 2 gizleme çağrısı | 2 satır |
| `www/js/app.js` | `submitCakismaGuess`'in stage-3 gösterme bloğu | ~3 satır (yorumla ~10) |
| `www/js/app.js` | 2 click handler (G320'de ZATEN büyütülmüştü) | ~15 satır (yorumla ~25) |
| `www/js/core/guide-texts.js` | "Nasıl Oynanır" cümlesinden "Önce/Sonra" kısmı | 1 cümle |
| `test/guide-texts.test.mjs` | satır 160-162'deki test | 3 satır (silinir ya da yeniden yazılır) |
| `e2e/cakisma-stage3-stops-audio.spec.mjs` | 3/5 testin `#cakismaBefore/After`'a özel kısmı | ~60 satır (silinir) |
| `e2e/screen-open-stops-audio.spec.mjs` | `cakismaCompareVisible` kontrolü | zararsız kalır (element hiç bulunamaz, `isVisible()` `false` döner) — DOKUNULMASA da ÇALIŞIR |

**Toplam kaba tahmin: ~9 dosya, ~40-100 satır SİLME/küçültme** (bu
turun G316-G320 tek-commit'lik düzeltmelerinden DAHA KÜÇÜK bir iş —
o düzeltmeler EKLEME ağırlıklıydı, bu SİLME ağırlıklı).

**Ne kaybedilir:** SADECE "Önce" düğmesinin (madde 4'te açıklanan,
düşük marjinal değerli) "orijinal maskelemeyi TEKRAR dinle" kolaylığı
— kullanıcı bunu ZATEN soru SIRASINDA duymuştu.

**Testler etkilenir mi:** Yukarıdaki tabloda sayılan 2 test
dosyası + 1 birim testi GÜNCELLENMELİ (silinmeli/küçültülmeli) —
KIRILAN test SAYISI sıfıra indirilir (güncellenerek), ama bu
GÜNCELLEME kendisi bir iş kalemi.

---

## 6) GEÇMİŞ (git log)

**Giriş:** `1c86464` (**G51**, 6 Ağustos) — modun TEMEL kuruluşuyla
BİRLİKTE geldi, AYRI bir gerekçe YAZILMAMIŞ (G51'in commit mesajı
Before/After'ı TEK cümlede "öncesi/sonrası dinlenebilir" diye anıyor,
"NEDEN iki ayrı kontrol" sorusuna cevap YOK — o an kulak butonları
HENÜZ YOKTU, tek kontrol oydu, çelişki de yoktu).

**Dokunuş 2:** `810a2ec` (**G257**, 16 Ağustos) — kulak butonları
eklenirken Before/After'ın TEKNİĞİ ödünç alındı (kod aynen kopyalandı),
KENDİSİ silinmedi/sorgulanmadı. Commit mesajında "Before/After'ı
KALDIRALIM mı" sorusuna dair HİÇBİR iz YOK.

**Dokunuş 3 (bugün):** `ad3ee2a` (**G320**) — Before/After'ın
`stopAudio()`'ya bağımlılığı G320'nin kendi düzeltmesiyle (zincir
yeniden kurma) devam ETTİRİLDİ (kaldırılmadı) — kullanıcıya SORULDU,
"aynı düzeltmeyi ona da uygula" seçildi; bu turda o ölçümün BULDUĞU
tıklanabilirlik sorunu AYRICA belgelenip BU turun konusu yapıldı.

**Sonradan dokunulmuş mu, BAŞKA hiçbir commit'te mi:** Hayır — `git
log -S"cakismaBefore"` SADECE bu 3 commit'i (G51/G257/G320) gösteriyor.
CSS tarafında da (`.fb{position:fixed...}`, G85) `#cakismaCompare`'a
ÖZEL bir düzeltme/fark edilme YOK.

---

## SONUÇ — kalsın mı, kaldırılsın mı, düzeltilsin mi?

**Ölçülen üç gerçek:** (1) "Sonra" kulak butonuyla kod-düzeyinde
BİREBİR AYNI sesi çalıyor — TAMAMEN gereksiz. (2) "Önce" tek benzersiz
katkısı, ama DÜŞÜK değerli (soru sırasında ZATEN duyulmuş sesi tekrar
dinletiyor). (3) Her ikisi de ŞU AN, GÖRÜNÜR OLDUKLARI TEK anda,
GERÇEK bir dokunuşla ULAŞILAMIYOR — kanıtlandı, tahmin değil.

**Öneri: KALDIRILSIN.** Gerekçe: bozuk bir kontrolü DÜZELTMEK (paneli/
CSS'i yeniden düzenleyip erişilebilir kılmak) EK bir iş VE risk (bu
turun `#feedbackBox`'ın `position:fixed`/`max-height:29vh`/z-index
mimarisi G189/G193/G265'te ÜÇ AYRI turda İNCE AYAR görmüş, KIRILGAN
bir alan — bkz. styles.css'in kendi yorumları) gerektirirken, ELDE
EDİLEN tek fayda ("orijinal maskelemeyi tekrar dinle") kulak
butonlarının ZATEN sağladığı bilgiye (doğru/yanlış karşılaştırması)
göre İKİNCİL. Kaldırmak hem KIRIK/ölü bir kontrolü temizler hem
kullanıcı arayüzünü SADELEŞTİRİR (Logic'in kendi önceki turdaki
yönelimiyle TUTARLI: "tek buton yeter" fikri).

**Alternatif (kullanıcı tercih ederse):** SADECE "Önce"yi tutup
"Sonra"yı kaldırmak (kulak butonuyla YİNELENEN kısmı silmek, benzersiz
kısmı KORUMAK) — ama bu YİNE tıklanabilirlik düzeltmesini gerektirir
(madde 3), yani iş yükü kaldırmakla NEREDEYSE AYNI, sadece bir buton
daha az silinir. **Bu, KESİN bir ürün kararı — bu turda VERİLMEDİ,
kullanıcıya SORULACAK** (CLAUDE.md: "Ürün kararı verme").

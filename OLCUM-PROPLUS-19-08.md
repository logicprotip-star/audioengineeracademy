# OLCUM-PROPLUS-19-08

GÖREV: ÖLÇÜM. Kod yazılmadı, commit atılmadı. Logic'in şüphesi: "Pro
Plus" kademesinin sadece bir modda (muhtemelen Frekans Bulma) gerçek
bir karşılığı var, genel ayarlarda durması kafa karıştırıcı.

## SONUÇ (önce, sonra gerekçe) — TAŞINMALI (görünürlük taşınmalı, veri KALMALI)

Logic'in şüphesi DOĞRULANDI: Pro Plus SADECE Frekans Bulma'da gerçek
bir kademe. Diğer 11 modda `DIFFICULTY.proplus`, `DIFFICULTY.pro`'nun
BİREBİR (xp/options/time/lives/TÜM mod-özel parametreler dahil) bir
KOPYASI — kullanıcı seçince Pro'dan HİÇBİR farkı olmayan bir soru
alıyor, SADECE "Pro Plus (Çok Bantlı)" gibi YANLIŞ bir izlenim veren
bir etiket görüyor (o 11 modda "çok bantlı" hiçbir şey YOK).

**Öneri: veriyi SİLME, GÖRÜNÜRLÜĞÜ taşı.** `DIFFICULTY.proplus`
girdisini 11 moddan SİLMEK yerine, PAYLAŞILAN zorluk seçicisinde
(`index.html` #difficultySelect + .chip-v2) "Pro Plus" seçeneğini
SADECE Frekans Bulma AKTİFKEN göster/tıklanabilir yap — diğer 11
modda gizli/devre dışı kalsın. **Gerekçe:** DIFFICULTY.proplus'ı
SİLMEK ~14 test dosyasını, EXAM_DIFFICULTY/TIER_ORDER'ın Z5
gerekçesini, `isTypeSwapTier`/`DISTORTION_TYPES` gibi proplus'u
KASITLI OLARAK pro'yla EŞİTLEYEN (yani SİLİNMESİ hiçbir davranış
KAZANDIRMAYAN, sadece kod hacmini büyüten) mevcut tasarım kararlarını
BOZAR — risk/iş oranı YÜKSEK, KAZANÇ SIFIR (davranış zaten pro'yla
AYNI). SADECE görünürlüğü kısıtlamak KAFA KARIŞIKLIĞINI (asıl
şikayet) ÇÖZER, veri katmanına DOKUNMADAN — DÜŞÜK risk, KÜÇÜK iş
yükü (bkz. ÖLÇ 4).

---

## ÖLÇ 1 — Pro Plus hangi modlarda TANIMLI?

**12 modun 12'sinde de** `DIFFICULTY.proplus` TANIMLI (grep ile
doğrulandı — hiçbir mod dosyası bu girdiyi ATLAMIYOR):
boost-mu-cut-mu, db-seviyesi, distortion, frekans-bulma,
frekans-cakismasi, kesim-noktasi, kompresor, pan-konumu, q-genisligi,
reverb, stereo-genislik, tonal-denge.

## ÖLÇ 2 — Hangi modlarda GERÇEK bir fark yaratıyor?

**SADECE Frekans Bulma'da.** 12 modun TAM `DIFFICULTY` tablosu
karşılaştırıldı (`pro` vs `proplus` satırları):

| Mod | pro vs proplus FARKI |
|---|---|
| **frekans-bulma** | **GERÇEK FARK** — gain 4.5→8, q 4.2→3.2, xp 52→45, options 6→4, time 9→20, hintBandOct 0.6→1.0 + **TAMAMEN FARKLI soru tipi** (bkz. ÖLÇ 3) |
| boost-mu-cut-mu | SIFIR fark (xp/options/time/lives/gainDb/freqStepOct/gainStepDb — HEPSİ birebir aynı) |
| db-seviyesi | SIFIR fark (dbDelta dahil hepsi aynı) |
| distortion | SIFIR fark (kGap dahil hepsi aynı) |
| frekans-cakismasi | SIFIR fark (regionWidthOct/cutStepDb dahil hepsi aynı) |
| kesim-noktasi | SIFIR fark (marginOct/hintBandOct dahil hepsi aynı) |
| kompresor | SIFIR fark (kGap dahil hepsi aynı) |
| pan-konumu | SIFIR fark |
| q-genisligi | SIFIR fark (edgeMargin dahil hepsi aynı) |
| reverb | SIFIR fark (kGap dahil hepsi aynı) |
| stereo-genislik | SIFIR fark |
| tonal-denge | SIFIR fark (disturbDb dahil hepsi aynı) |

11 modda `proplus` satırı `pro` satırının **label DIŞINDA HER ALANI
BİREBİR AYNI** — bu TESADÜF değil, KASITLI: her dosyada
`DISTRACTOR_STEP_*`/`DISTORTION_TYPES` gibi yardımcı tablolar da AYNI
deseni izliyor (ör. `DISTRACTOR_STEP_DB = {..., pro: 0.35, proplus:
0.35}`, `DISTORTION_TYPES = {..., pro: "tape", proplus: "tape"}`).
Reverb'ün `isTypeSwapTier = level==="pro" || level==="proplus" || ...`
satırı da AYNI şeyi doğruluyor: proplus `pro`'yla AYNI davranışa
KASITLI OLARAK eşitlenmiş, YENİ bir davranış EKLEMİYOR.

**Farkı olmayan modlarda Pro Plus seçilince ne oluyor:** `calculateXP`
`base = diff.xp` okuyor (ör. db-seviyesi.js:387) — `diff` proplus'ta
pro'yla AYNI nesne DEĞERLERİNİ taşıdığı için üretilen soru, verilen
XP, şık sayısı, süre — **HİÇBİRİ** Pro'dan FARKLI DEĞİL. Kullanıcı
SADECE farklı bir ETİKET ("Pro Plus (Çok Bantlı)") görüyor, ALTINDAKİ
soru Pro'nun AYNISI.

## ÖLÇ 3 — Sadece Frekans Bulma'ya mı özgü?

EVET, TEK gerçek fark orada. `frekans-bulma.js:354` —
`if (level === "proplus") { ... bands = buildProPlusBands(4, ...); ... }`
— Pro Plus'ta soru TAMAMEN FARKLI bir MEKANİK: tek bir frekans TAHMİN
ETMEK YERİNE, spektrumda AYNI ANDA **4 farklı bant** işaretleniyor
(`mode:"proplus"`, `bands:[...]`, `guesses:[]`). Bu, diğer 11 modun
HİÇBİRİNDE YOK — onlarda "proplus" sadece bir İSİM, `q.mode` alanı
HİÇ "proplus" değeri ALMIYOR (SADECE Frekans Bulma'nın createQuestion'ı
bu alanı yazıyor).

**Diğer 11 modda ne işe yarıyor — kullanıcı seçerse ne oluyor?**
Hiçbir şey ÖZEL olmuyor — ÖLÇ 2'de gösterildiği gibi Pro'nun AYNISı
bir soru geliyor, SADECE etiket "Pro Plus (Çok Bantlı)" (yanıltıcı —
"çok bantlı" hiçbir şey YOK) oluyor.

## ÖLÇ 4 — Genel ayardan kaldırılıp mod içine taşınırsa (görünürlük taşınırsa)

**Kaç dosya, kaç satır (ÖNERİLEN "görünürlük taşı" yaklaşımı, veri
SİLİNMİYOR):**
- `www/index.html` (~0 satır DEĞİŞMEZ — seçenekler KALIYOR, SADECE JS
  ile gizlenecek/disable edilecek, HTML'in kendisi dokunulmaz kalabilir).
- `www/js/app.js` (~10-20 satır TAHMİNİ) — mod GİRİŞİNDE (`enterMode`
  veya YAKIN bir UI-sync noktası) `#difficultySelect`'in `proplus`
  `<option>`'ını VE `.chip-v2[data-diff="proplus"]`'ı, aktif mod
  Frekans Bulma DEĞİLSE, `hidden`/`disabled` yapacak KÜÇÜK bir kontrol
  — DAHA ÖNCE BENZER "mod bazlı UI gizleme" desenleri app.js'te ZATEN
  VAR (ör. `SHOW_SPECTRUM`, `kulaklikGerekli`), AYNI desen izlenebilir.
- **Test dosyaları:** DOKUNULMASI GEREKMEZ — DIFFICULTY tabloları
  DEĞİŞMEDİĞİ için 11 modun `proplus` testleri (ÖLÇ altta sayıldı)
  AYNEN geçmeye devam eder. YENİ bir e2e testi (Frekans Bulma DIŞINDA
  bir moda girince "Pro Plus" seçeneğinin GİZLİ/tıklanamaz olduğunu
  doğrulayan) EKLENEBİLİR — 1 dosya, ~1-2 test.

**Kaç dosya, kaç satır (ALTERNATİF "veriyi SİL" yaklaşımı, ÖNERİLMEDİ):**
11 mod dosyasının `DIFFICULTY` tablosundan `proplus` satırı SİLİNİR
(11 satır) + `DISTRACTOR_STEP_*`/`DISTORTION_TYPES` gibi yardımcı
tablolardan da proplus GİRDİSİ SİLİNİR (ilgili modlarda ~3-4 dosya
ek) + **~14 test dosyasının proplus'a değinen satırları** (aşağıdaki
tabloda sayıldı, TOPLAM 67 REFERANS — hepsi tam bir "it()" bloğu
DEĞİL ama BİRÇOĞU öyle) GÜNCELLENİR/SİLİNİR + `index.html`'in İKİ
listesi 11 mod İÇİN proplus'ı GÖSTERMEMESİ gerekir (AYNI mod-bazlı
görünürlük mantığı YİNE GEREKİR, bu yaklaşım da o karmaşıklığı
İÇERİYOR + ÜSTÜNE veri-katmanı riski EKLİYOR). **Tahmini iş yükü:**
~15 dosya, ~100-150 satır (üretim + test) — "görünürlük taşı"
yaklaşımının ~5-10 KATI, KAZANÇ SIFIR (davranış zaten pro'yla aynı).

**Test dosyası başına proplus referans SAYISI (SİL senaryosunda
etkilenecek dosyalar):**

| Dosya | referans | Not |
|---|---|---|
| reverb.test.mjs | 11 | pro/proplus TİP-farkı testi + DIFFICULTY değer testleri |
| kesim-noktasi.test.mjs | 7 | DIFFICULTY değer testleri |
| q-genisligi.test.mjs | 7 | DIFFICULTY değer testleri |
| mode-contract.test.mjs | 7 | **SADECE Frekans Bulma'yı test ediyor** (dosya başı notu: "şu an tek mod var") — SİL senaryosunda BİLE ETKİLENMEZ |
| tonal-denge.test.mjs | 6 | DIFFICULTY değer testleri |
| boost-mu-cut-mu.test.mjs | 4 | DIFFICULTY değer testleri |
| db-seviyesi.test.mjs | 4 | DIFFICULTY değer testleri |
| frekans-cakismasi.test.mjs | 4 | DIFFICULTY değer testleri |
| kompresor.test.mjs | 4 | DIFFICULTY değer testleri |
| answer-history.test.mjs | 4 | frekans-bulma'nın proplus params testi — ETKİLENMEZ |
| pan-konumu.test.mjs | 3 | DIFFICULTY değer testleri |
| exam-system.test.mjs | 3 | proplus'un TIER_ORDER DIŞI kaldığını doğrulayan test — ETKİLENMEZ (jenerik, mod-bağımsız) |
| distortion.test.mjs | 1 | DIFFICULTY değer testi |
| storage.test.mjs | 1 | muhtemelen jenerik — ETKİLENMEZ |
| frekans-bulma.test.mjs | (sayılmadı, ÇOK) | frekans-bulma'nın KENDİ proplus mekaniği — HİÇ ETKİLENMEZ (KALACAK) |

**Kayıtlı kullanıcı ayarı etkilenir mi?** HAYIR — DOĞRULANDI: `prefs`
(core/storage.js:431) SADECE `difficultyMode` ("auto"/"fixed") kalıcı
tutuyor, SEÇİLİ KADEME'nin KENDİSİ (`els.difficultySelect.value`)
localStorage'a HİÇ YAZILMIYOR (grep ile TÜM `difficultySelect.value =`
atamaları tarandı — SADECE `applyAutoDifficulty()`'nin tierForLevel
sonucu VE kullanıcının `.chip-v2` tıklaması, İKİSİ de SESSION-SCOPED).
Yani "Sabit + Pro Plus" seçimi UYGULAMA YENİDEN AÇILINCA zaten
KORUNMUYOR — görünürlük kısıtlaması bu YÜZDEN geriye dönük hiçbir
veri GÖÇÜ GEREKTİRMİYOR.

**Pro Plus seçmiş kullanıcı ne olur (görünürlük taşınırsa)?**
Frekans Bulma'da HİÇBİR ŞEY DEĞİŞMEZ (proplus ORADA KALIYOR, tam
işlevsel). BAŞKA bir moda geçerse: seçici proplus'ı ARTIK
GÖSTERMEYECEĞİ için mevcut UI-senkron mantığı (`syncDifficultyRowLabel`
vb.) muhtemelen otomatik "Pro"ya DÜŞECEK BİR fallback GEREKTİRİR —
BU KÜÇÜK bir DAVRANIŞ kararı (proplus'tan pro'ya mı, yoksa SADECE
seçim GÖRÜNMEZ mi kalır ama `<select>.value` proplus'ta mı takılı
kalır) — **BU BİR ÜRÜN DETAYI, uygulama turunda netleştirilmeli**
(muhtemelen: mod değişince `<select>` "pro"ya düşürülmeli, aksi
halde 11 moddan birinde SESSİZCE proplus SEÇİLİ KALIP — ZARARSIZ
ÇÜNKÜ pro'yla AYNI DAVRANIYOR — ama etiket YİNE "Pro Plus" görünmeye
devam eder, kafa karışıklığı TAM ÇÖZÜLMEMİŞ olur). Geçmiş
`tierStats`'te (stats.examState[modeId].tierStats) proplus altında
KAYITLI bir geçmiş varsa (bir kullanıcı GEÇMİŞTE, örn. Kompresör'de
proplus SEÇİP oynadıysa) bu kayıt BOZULMAZ (orphan bir anahtar olarak
KALIR, okuma tarafı zaten `tierStats[level]` var/yok kontrolüyle
GÜVENLİ).

## ÖLÇ 5 — Sınav sistemi Pro Plus kullanıyor mu?

**HAYIR.** TÜM 12 mod dosyasında `EXAM_DIFFICULTY = "pro"` (proplus
DEĞİL) — grep ile DOĞRULANDI, İSTİSNASIZ. `core/exam-system.js`'in
`EXAM_CONFIG.TIER_ORDER = ["easy","medium","hard","pro"]` de proplus'ı
DIŞARIDA BIRAKIYOR — dosyanın KENDİ yorumu: "'proplus' BİLEREK dışarıda
(o, difficulty merdiveninin bir noktası değil, ayrı/özel bir mod —
Z5 kararı)". `difficulty-curve.js:tierForLevel()` (Otomatik zorluk
modu) da AYNI ŞEKİLDE proplus'ı ASLA ÜRETMİYOR. **Sınav soruları HER
ZAMAN "pro" kademesinde** — proplus'a sınav sisteminde HİÇ
DOKUNULMUYOR, bu tur ÖLÇÜMÜ ile YENİ doğrulandı, önceki bir turun
iddiasıyla TUTARLI.

## ÖLÇ 6 — XP hesabı Pro Plus'a göre değişiyor mu?

**11 modda HAYIR** (xp DEĞERİ pro'yla BİREBİR AYNI — ÖLÇ 2 tablosu).
**Frekans Bulma'da EVET, ama TERS YÖNDE:** `pro.xp=52` iken
`proplus.xp=45` — Pro Plus, Pro'DAN DAHA AZ temel XP veriyor,
"Çok Bantlı" (4 hedef AYNI ANDA) mekaniğinin KENDİSİ zaten daha zor
olduğu için TABAN XP'nin DÜŞÜK tutulmuş olması muhtemel (calculateXP
formülünün proplus'a özel BAŞKA çarpanları olup OLMADIĞI bu ölçümün
KAPSAMI DIŞINDA — SADECE `diff.xp` tabanı karşılaştırıldı). Bu, bir
HATA değil ama İLGİNÇ bir gözlem: "Pro Plus" ismi "Pro'DAN daha
yüksek" izlenimi verirken TABAN XP'si Pro'dan DÜŞÜK — bu turun
KAPSAMI DIŞINDA, sadece NOT DÜŞÜLDÜ.

## KABUL — bu turun kapsamı

- [x] Pro Plus'ın TANIMLI OLDUĞU modlar sayıldı (12/12).
- [x] GERÇEK farkın SADECE Frekans Bulma'da olduğu KANITLANDI (tablo).
- [x] Diğer 11 modda "seçilirse ne olur" DOĞRULANDI (Pro'nun aynısı).
- [x] Taşınırsa/kaldırılırsa iş yükü İKİ senaryo için TAHMİN edildi.
- [x] Kayıtlı ayar riski DOĞRULANDI (risk YOK — kademe kalıcı DEĞİL).
- [x] Sınav sistemi (proplus KULLANMIYOR) VE XP (11 modda AYNI,
      Frekans Bulma'da TERS yönde farklı) DOĞRULANDI.
- [ ] Kod YAZILMADI, commit ATILMADI — bu turun kapsamı SADECE ölçüm.

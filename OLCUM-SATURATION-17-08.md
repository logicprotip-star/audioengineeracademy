# OLCUM-SATURATION-17-08

Görev: Saturation & Distortion modunda cihazda görülen 4 sorunun ölçümü.
KOD YAZILMADI, DOSYA DEĞİŞTİRİLMEDİ, COMMIT ATILMADI — bu tamamen bir
ölçüm/tanı turu. Tüm bulgular Playwright ile yeniden üretilmeye çalışıldı
(`e2e/_olcum_saturation*.mjs` — geçici scriptler, ölçüm bitince silindi,
commit'e girmedi) ve/veya `git blame`/kod okumasıyla doğrulandı. Emin
olunamayan tek madde (B) açıkça BELİRSİZ işaretlendi.

## ÖZET TABLO

| Madde | Kök sebep bulundu mu | Sorumlu commit | Bugünkü mü? |
|---|---|---|---|
| A) Siyah ekran | ✅ EVET, kesin | Hiçbiri — **08-09/08-10/08-14** (3 gün önce) | ❌ HAYIR |
| B) Bölüm sayacı kararsız | ❌ YENİDEN ÜRETİLEMEDİ | — | BELİRSİZ |
| C) Kurtarılan tur çalmıyor | ✅ EVET, kesin + izole edildi | **G267** (`e9acd73`, bugün 12:14) | ✅ EVET |
| D) Aynı soru tekrarı | ✅ EVET — bug DEĞİL, tasarım | Yok (hiçbir zaman dedup yoktu) | İlgisiz |

**ORTAK KÖK YOK.** Dördü BAĞIMSIZ üç farklı mekanizmadan geliyor (A: 3 gün
önceki bir yazım hatası; C: bugünkü G267; D: bug değil). B ölçülemedi.
"Sınav bitişi → state bozulması → hepsi etkileniyor" hipotezi (görevin E
bölümü) **DOĞRULANMADI** — A ve C'nin kökleri BİRBİRİNDEN VE sınav
bitişinden TAMAMEN bağımsız, ayrı kod yolları.

---

## A) SİYAH EKRAN 🔴 — KÖK SEBEP BULUNDU, KESİN

### Bulgu
`goScreen("home")` çağrıldığında **hiçbir şey olmuyor** — DOM'daki
gerçek ana ekranın id'si `#screen-menu`'dür, `#screen-home` DİYE BİR
ELEMENT YOK. `goScreen()` fonksiyonu (`www/js/app.js:2459`) hedef id'yi
`screen-${name}` olarak kurup TÜM `.screen` elementlerinde
`classList.toggle("active", s.id===targetId)` çalıştırıyor
(`www/js/app.js:2503`) — `"screen-home"` HİÇBİR elemente eşleşmediği
için bu döngü TÜM ekranların `active` sınıfını KALDIRIYOR, hiçbirini
EKLEMİYOR. Sonuç: DOM'da aktif hiçbir `.screen` kalmıyor, arkadaki
sabit koyu-lacivert gradient arka plan tek başına görünüyor → siyah
ekran.

### Reprodüksiyon (Playwright, 100% tekrarlanabilir)
1. Saturation & Distortion'da 10 soruluk parkuru 7/10 doğrulukla bitir
   (kombo≥6 tetiklenmeden — TOTAL_THRESHOLD yoluyla `exam-start` otomatik
   açılıyor).
2. Sınavın 4 sorusunun 4'ünü de yanlış cevapla → `exam-failed` olayı,
   `#screen-exam` "Parkur baştan" ekranı açılıyor (`kicker: "SINAV
   GEÇİLEMEDİ"`).
3. "Ana Ekran" butonuna (`#exSecondary`) bas.
4. **Sonuç: `document.querySelector(".screen.active")` → `null`.
   `document.querySelector(".screen.active").innerText` → boş string.
   Ekran görüntüsü tamamen siyah (düz koyu gradient).**

### Dosya:satır (TAM LİSTE — 5 çağrı noktası, HEPSİ AYNI hata)
`www/js/app.js`:
- **2953** — exam-offer'ın "Sonra" (erken sınavı reddet) butonu
- **2976** — exam-passed'ın "Ana Ekran" butonu
- **2992** — exam-failed'ın "Ana Ekran" butonu ← **BU TURDA REPRODÜKE EDİLEN**
- **3016** — remedial (telafi) sonucunun "Ana Ekran" butonu
- **7714** — `progStartFreqBtn` (boş-durum "İlk seansını başlat" CTA'sı)

Doğru çağrı `goScreen("menu")` olmalıydı — kod tabanında bu isim zaten
7 yerde DOĞRU kullanılıyor (ör. `applyRestoredRoundIfAny`, satır
7949/7953/7961, `.tab` click handler'ı satır 7997).

### Hangi commit — KESİN, bugünkü DEĞİL
```
git blame -L 2992,2992 www/js/app.js → 07a2c056 (2026-08-09 22:28)
git blame -L 2953,2953 www/js/app.js → 07a2c056 (2026-08-09 22:28)
git blame -L 3016,3016 www/js/app.js → 07a2c056 (2026-08-09 22:28)
git blame -L 2976,2976 www/js/app.js → e42101df (2026-08-14 23:43)
git blame -L 7714,7714 www/js/app.js → 39f9d232 (2026-08-10 01:08)
```
Beşi de **G214/G267/G269/G271/G272/G273'ten (hepsi 08-17, bugün)
GÜNLER ÖNCE** yazılmış. `#screen-menu` id'sinin kendisi çok daha eski
bir temel commit'te (`8476b91`) tanımlı. **Bu bug bugünkü hiçbir
değişiklikle İLGİLİ DEĞİL** — muhtemelen kullanıcı bugün İLK KEZ bu
tam akışı (sınav başarısız → "Ana Ekran") deneyimledi, bug haftalardır
oradaydı.

### Neden "sadece Saturation & Distortion'da" görüldü?
Muhtemelen görülmedi diye değil, DENENMEDİ diye — bu akış (parkur→sınav
başarısız→"Ana Ekran") HERHANGİ bir `EXAM_ENABLED` modda (12 playable
modun 12'si) AYNI şekilde tetiklenir, mod-spesifik bir kod yolu değil.
**Diğer modlarda da reprodüke EDİLEBİLİR olması BEKLENİR** (test
edilmedi — kapsam dışı, ama kod yapısı mod-bağımsız).

### Düzeltme yolu (uygulanmadı, sadece belirtiliyor)
5 satırdaki `goScreen("home")` → `goScreen("menu")`. Tek satırlık,
DAR, düşük riskli bir değişiklik — `goScreen()` fonksiyonunun kendisi
DOKUNULMUYOR, sadece çağrı argümanları düzeltiliyor.

### Risk
**DÜŞÜK.** İzole, 5 satırlık string düzeltmesi. Yan etki riski yok —
`goScreen("menu")` zaten kod tabanında 7 yerde ÇALIŞAN, doğrulanmış bir
çağrı deseni.

---

## B) BÖLÜM SAYACI KARARSIZ 🔴 — BELİRSİZ, YENİDEN ÜRETİLEMEDİ

### Ölçülen
`#gameChapterRow` ("BÖLÜM N/10" satırı) `showChapter = !boss &&
!examActive && isChallenge()` koşuluyla gösterilir/gizlenir
(`www/js/app.js:3962`), `.ghead-collapsed` (max-height:0 CSS geçişi,
`display:none` DEĞİL) ile — `www/js/app.js:3983`.

`isChallenge()` **SADECE** `els.playModeSelect.value==="challenge"`
okur (`www/js/app.js:1249`). **Kaynak (`els.sourceSelect`) değişim
handler'ı** (`www/js/app.js:7728-7774`) **`challenge` state'ine VEYA
`renderGameHeader()`'a HİÇ DOKUNMUYOR** — sadece `playModeSelect`
değişimi `challenge.active=false` + `renderGameHeader()` tetikliyor
(satır 7743-7757). Kod okuması TEK BAŞINA kaynak-değişimi → bölüm-satırı
arasında bir NEDENSELLİK BULAMADI.

### Playwright denemesi — TEKRAR ÜRETİLEMEDİ
Saturation & Distortion'da: round başlat → BÖLÜM 1/10 görünür → Kaynak
sheet'i aç (`data-sheet-select="sourceSelect"`) → "White Noise" seç →
sheet kapan → **BÖLÜM satırı GÖRÜNÜR KALDI** (`collapsed:false`,
`label:"BÖLÜM 1/10"`) → bir tur daha oyna → **BÖLÜM 2/10'A DOĞRU
İLERLEDİ, kaybolmadı.** Sayfa yenilenince (uygulama yeniden başlatma
benzetimi) beklendiği gibi **1/10'a SIFIRLANDI** (challenge state
`localStorage`'da hiç PERSIST EDİLMİYOR — bu KISMEN "yeniden başlayınca
geri geliyor" gözlemini açıklar, ama "geri gelen" TAZE bir 1/10, ESKİ
ilerlemenin KENDİSİ değil).

### Bulunan (ama doğrulanamayan) bir mimari not
`challenge` (10 Soruluk Bölüm OYUN TÜRÜ, `www/js/app.js:1247`) ve
`examSystem`'in `parkur` fazı (`www/js/core/exam-system.js`, AYNI
"10 soru" büyüklüğü) **TAMAMEN AYRI, birbirinden HABERSİZ iki state
makinesi** — SADECE İKİSİ DE 10 SORULUK olduğu için ekranda ÇAKIŞAN iki
"X/10" görünümü üretiyorlar (`#roundChip`'in "Soru N/10" YA DA "Sınav
N/4" göstermesi + `#gameChapterRow`'un AYRI "BÖLÜM N/10"'u). Bu bir
KULLANICI KAFA KARIŞIKLIĞI kaynağı olabilir ama "kaynak değiştirince
kayboluyor" iddiasını AÇIKLAMIYOR — bu turda REPRODÜKE EDİLEMEDİ.

### Sonuç
**BELİRSİZ.** Ne kodda nedensellik bulundu, ne Playwright'ta
reprodüke edildi. Olası açıklamalar (doğrulanmadı): (1) tarif edilen
tam adım sırası bu turda denenenden farklı olabilir (ör. kaynak sheet'i
SORUYA CEVAP VERİLDİKTEN SONRA/feedback panelindeyken açılmış olabilir,
bu turda denenmedi); (2) CSS `max-height` geçişinin (180ms) GÖRSEL bir
"titreme" anı yaratıp GERÇEK bir state kaybı OLMADAN "kayboluyor" hissi
verebilir — DOĞRULANMADI; (3) kullanıcının gördüğü "sayaç" aslında
`#roundChip`/`examSystem` tarafı olabilir (BAŞKA bir kod yolu, bu turda
AYRICA test edilmedi). **Kullanıcıdan tam adım adım tekrar (hangi
ekranda, hangi tıklamadan hemen sonra) istenmesi önerilir.**

### Hangi commit — BELİRSİZ olduğu için ATANMADI.

---

## C) KURTARILAN TUR OYNANMIYOR 🔴 EN CİDDİ — KÖK SEBEP BULUNDU, İZOLE EDİLDİ

### Kök sebep
G267 (`e9acd73`), Kompresör/Distortion'ı "seamless" A/B/C mimarisine
geçirdi: `isSeamlessThreeWay(mode)` true iken `playThreeWaySpecific()`
(`www/js/app.js:5476-5496`) **SADECE** `audioEngine.setThreeWayActive(letter)`
+ `audioEngine.unmuteOutput()` çağırıyor — bunlar **var olan bir
zincirin gain'ini AYARLAR**, YENİ bir zincir KURMAZ. Kanıt —
`audio-engine.js`:
```
function setThreeWayActive(letter) {
  if (!audioCtx || !threeWayGainNodes) return;   // satır 1093
  ...
}
function muteThreeWayPreview() {
  if (!audioCtx || !threeWayGainNodes) return;   // satır 1112
  ...
}
```
`threeWayGainNodes` **SADECE** `buildThreeWayChain()` (yine G267,
`playQuestion()` içinde, `www/js/app.js:5356`) çağrılınca kurulur.

G203'ün (3 gün önceki, PRE-EXISTING) tur-kurtarma yolu
(`applyRestoredRoundIfAny`, `www/js/app.js:7948-7994`) **BİLEREK HİÇ
ses zinciri KURMAZ** (satır 7983-7985'in kendi yorumu: "bu oturumda BU
round için hiç ses zinciri kurulmadı, bir SONRAKİ 'Tekrar Çal'
playQuestion()'la SIFIRDAN kursun") — `audioChainStoppedByBackground=true`
BIRAKIR, normal modlarda bu `#startBtn`'in "Tekrar Çal" dalını
(`www/js/app.js:6734-6741`, `chainNeedsRebuild()` → `playQuestion()`)
tetiklemesi İÇİN yeterli.

**AMA** `updateStartBtnLabel()` (`www/js/app.js:2273`) THREE_WAY
modlarda `activeQuestion` varken `#startBtn`'i **HER ZAMAN GİZLİYOR**
("Motor 2'de büyük yuvarlak play/durdur kontrolü control satırında
YOK" — G86'dan beri KASITLI tasarım). Kurtarma SONRASI `activeQuestion`
DOLU olduğu için `#startBtn` GİZLİ kalır — kullanıcının erişebildiği
TEK kontrol `.ans-m2-play` (kart-üstü play) ve `#abToggle`'dır, İKİSİ
DE `playThreeWaySpecific`/`cycleThreeWayPreview` üzerinden SADECE
`isSeamlessThreeWay` dalına girer — **`playQuestion()`'ı/`buildThreeWayChain()`'i
HİÇBİR ZAMAN ÇAĞIRMAZ.** Sonuç: zincir SONSUZA KADAR kurulmadan kalır,
gain-toggle fonksiyonları SESSİZCE no-op yapar (throw/hata YOK, bu
yüzden konsol da temiz).

### Kullanıcının 3 belirtisiyle BİREBİR eşleşme
1. **"Play'e basınca çalışmıyor, 'duraklatıldı' yazıyor"** —
   kurtarma sonrası state (`threeWayPlayLetter="A"`,
   `threeWayPreviewPaused=false`, `renderQuestion()`'ın sıfırladığı
   varsayılanlar) "A zaten çalıyor" GİBİ görünüyor. Kart A'ya İLK
   basış bu yüzden "PAUSE" dalına giriyor (`letter===threeWayPlayLetter
   && !threeWayPreviewPaused` → true) — `muteThreeWayPreview()`
   (zaten no-op) çağrılıyor, UI "duraklatıldı" görünümüne geçiyor.
2. **"Tekrar play'e basınca pause ikonu çıkıyor ama SES GELMİYOR"** —
   İKİNCİ basış artık "RESUME" dalına giriyor
   (`threeWayPreviewPaused=true` olduğu için), kart "playing" CSS
   sınıfını ALIYOR (`ans-m2-playing`) ama `setThreeWayActive`/
   `unmuteOutput` işleyecek HİÇBİR node bulamıyor.
3. **"Kullanıcı 'Atla' demek zorunda kalıyor"** — TEK çıkış yolu,
   çünkü hiçbir play kontrolü zinciri kurmuyor.

### Ölçüm (Playwright — analyser tap, gerçek Web Audio sinyali)
`AudioContext.prototype.createAnalyser`'a bir Proxy takılıp uygulamanın
KENDİ paylaşılan analyser'ı (`masterGain→analyser→destination`,
`audio-engine.js:415-416`) yakalandı, `getByteTimeDomainData()` ile
sessizlikten (128 sabit) sapma ölçüldü:

| Adım | analyser sapması | Yorum |
|---|---|---|
| Baseline (normal round, kurtarma ÖNCESİ) | 26 (Distortion) / 45 (Kompresör) | GERÇEK ses akıyor |
| Kurtarma SONRASI, 1. kart tıklaması | **0** | Tam sessizlik |
| Kurtarma SONRASI, 2. kart tıklaması ("pause ikonu var ama ses yok") | **0** | Tam sessizlik — icon YALAN söylüyor |

`audioCtx.state==="running"` ve `currentTime` NORMAL ilerliyor HER İKİ
durumda da — yani context'in KENDİSİ CANLI, SADECE ses grafiği hiç
kurulmamış.

### "Kompresör'de sorun yok" iddiası — YANLIŞLANDI
Task'ın kendi premisi ("Kompresör de aynı G267 mimarisinde, orada
sorun yok denildi — doğrula") **YANLIŞ ÇIKTI.** AYNI test AYNEN
Kompresör'de tekrarlandı: **AYNI sonuç (sapma=0, iki tıklamada da)**.
Kod düzeyinde de beklenen buydu — `SEAMLESS_THREE_WAY_MODE_IDS =
["kompresor", "distortion"]` (`www/js/app.js:73`), İKİSİ DE AYNI
`isSeamlessThreeWay` dalından geçiyor, mod-spesifik hiçbir dallanma
YOK. Kompresör'ün "sorun yok" izlenimi muhtemelen bu TAM reprodüksiyon
adımının (arka plana al → kapat/aç → kart-üstü play) o modda
DENENMEMİŞ olmasından geliyor.

### İzolasyon testi — `git apply -R` ile G267'nin app.js/audio-engine.js
### değişiklikleri GEÇİCİ olarak geri alındı, AYNI test tekrarlandı
```
G267 MEVCUTKEN:  2. tıklama sonrası analyser sapması = 0  (SESSİZ)
G267 GERİ ALINDIĞINDA: 2. tıklama sonrası analyser sapması = 26 (SES VAR)
```
Dosyalar hemen `git checkout --` ile eski (mevcut) haline döndürüldü,
`npm test` 1423/1423 doğrulandı — repo net.

**Bu, G267'nin kesin sorumlu commit olduğunun DENEYSEL kanıtıdır** —
kod okuması + davranışsal izolasyon İKİSİ DE AYNI sonuca varıyor.

### Dosya:satır
- `www/js/app.js:2273` — `updateStartBtnLabel()`, THREE_WAY'de
  `#startBtn`'i gizleyen satır (KASITLI, G86'dan beri — bug DEĞİL,
  ama G267'nin boşluğunu AÇIĞA ÇIKARAN ön koşul)
- `www/js/app.js:5476-5496` — `playThreeWaySpecific()`'in
  `isSeamlessThreeWay` dalı — chain-build ÇAĞRISI YOK
- `www/js/app.js:5411-5462` — `cycleThreeWayPreview()` (DÖNGÜ butonu),
  AYNI boşluk (okunmadı ama AYNI `isSeamlessThreeWay` dalını
  paylaşıyor — bkz. `www/js/app.js:5476`'ın giriş koşulu)
- `www/js/core/audio-engine.js:1092-1119` — `setThreeWayActive`/
  `muteThreeWayPreview`'in sessiz no-op koruması
- `www/js/app.js:7948-7994` — `applyRestoredRoundIfAny()` (G203,
  PRE-EXISTING, kendi başına DOĞRU davranıyor — chain-build'i BİLEREK
  ERTELİYOR, bunu üstlenecek bir sonraki adımı VARSAYIYOR)

### Hangi commit
**G267 (`e9acd73`, 2026-08-17 12:14 — BUGÜN).** G203 (`fd95936`,
2026-08-14) KENDİ BAŞINA doğru çalışıyordu — Reverb gibi
`isSeamlessThreeWay` DIŞI kalan modlarda (eski `buildQuestionChain`
yolu) kurtarma SONRASI resume BUGÜN DE ÇALIŞIYOR OLMALI (bu turda AYRICA
test edilmedi ama kod yolu — `www/js/app.js:5505-5514` — kendi başına
`buildQuestionChain` çağırıyor, chain YOKSA bile SIFIRDAN kurar).
**Bu bir G203 bug'ı DEĞİL, G267'nin YENİ mimarinin kurtarma senaryosunu
KAPSAMAMASI.**

### Düzeltme yolu (uygulanmadı, sadece belirtiliyor)
`playThreeWaySpecific`/`cycleThreeWayPreview`'in `isSeamlessThreeWay`
dalına, chain YOKSA (`threeWayGainNodes` null/eksik) ÖNCE
`buildThreeWayChain()` çağıran bir kontrol eklenmeli — ESKİ
(non-seamless) yolun `www/js/app.js:5505-5514`'te ZATEN yaptığı
"gerekirse kur" desenine benzer. Alternatif: `updateStartBtnLabel()`'in
THREE_WAY gizleme koşulunu, chain HENÜZ kurulmamışken (`!threeWayGainNodes`
gibi bir sinyal) İSTİSNA yapmak — `#startBtn` görünür kalıp normal
"Tekrar Çal" yolundan geçebilir.

### Risk
**ORTA.** Düzeltme G267'nin SEAMLESS crossfade davranışına
DOKUNMADAN (mevcut A/B/C geçişleri aynı kesintisiz kalır) SADECE
"chain hiç kurulmamış" ÖZEL DURUMUNU ele almalı — kapsam DAR ama G267'nin
kendi testleri (`seamless-three-way.spec.mjs`) ve reprodüksiyon
senaryosu (kurtarma) İKİSİNİN DE bozulmadığı AYRICA doğrulanmalı.

---

## D) AYNI SORU TEKRARLIYOR 🟡 — BUG DEĞİL, TASARIM (yüksek güvenle)

### Bulgu
`distortion.js:createQuestion()` (`www/js/modes/distortion.js:289-313`)
**hiçbir tekrar-önleme/geçmiş-hariç-tutma mekanizması İÇERMİYOR** —
`oddIndex = Math.floor(rng()*3)` SADECE `Math.random()`'a dayanıyor.
`grep` ile doğrulandı: `www/js/app.js` içinde `createQuestion()`'ı
saran HİÇBİR "son soruyu hariç tut" sarmalayıcı YOK (`lastQuestion`/
`avoidRepeat`/`noRepeat` gibi bir değişken/desen hiç geçmiyor —
`kompresor.js`/`distortion.js` İKİSİNDE de).

`oddIndex` SADECE 3 değer alabildiği (A/B/C) için **art arda İKİ
round'da AYNI harfin doğru çıkması saf şansla %33 olasılıklı** —
istatistiksel olarak SIK denk gelmesi BEKLENEN bir durum, anomali
DEĞİL. "Cevap da aynıydı" gözlemi bunun DOĞRUDAN sonucu (`choices[i].correct
= i===oddIndex` — oddIndex tekrarlarsa doğru harf de tekrarlar).

### Hangi commit
**Hiçbiri.** Bu davranış `distortion.js`'in `createQuestion()`'ı
YAZILDIĞINDAN BERİ hep böyleydi — `git log` ile G214/G267/G269/G271-273
İÇİNDE bu fonksiyona HİÇ dokunulmadığı doğrulandı (hiçbiri
`modes/distortion.js`'i DEĞİŞTİRMEDİ, sadece G269 `audio-engine.js`'e
telafi tablosu ekledi — çıkış SEVİYESİ, soru İÇERİĞİ değil).

### A-B-C'nin bir sonucu mu?
**HAYIR** — `createQuestion()` her round'da `activeQuestion`'dan
TAMAMEN BAĞIMSIZ, TAZE bir `Math.random()` çağrısı yapıyor; A/B/C
sorunlarının (state bozulması, ses zinciri boşluğu) hiçbiri soru
ÜRETİMİNE (görsel/DOM/state'ten AYRI, saf bir hesaplama) sızmıyor —
`mode.createQuestion`'ın "ses/DOM bağımsız saf fonksiyon" sözleşmesi
(CLAUDE.md'nin kendi kuralı) bunu YAPISAL olarak İMKANSIZ kılıyor.

### Düzeltme yolu / Risk
Düzeltme GEREKMİYOR (bug değil) — İSTENİRSE bir "son N soruda AYNI
oddIndex'i tekrarlama" kısıtı EKLENEBİLİR ama bu bir ÜRÜN KARARI
(zorluk eğrisine dokunur, kullanıcıya sorulmalı — CLAUDE.md kuralı).

---

## SONUÇ — GÖREVİN E BÖLÜMÜ ("ORTAK KÖK")

**Ortak kök YOK.** Dört bulgu üç bağımsız kategoriye ayrılıyor:
- **A**: 3 gün önceki bir string-yazım hatası (`"home"` vs `"menu"`),
  sınav sonucu ekranlarının HEPSİNDE var, bugünkü hiçbir commit'le
  ilgisiz, mod-bağımsız.
  **DOKUNULMAYACAK G271/G272 SPEKTRUM TELAFİSİ HİÇ etkilemiyor.**
- **B**: ölçülemedi, kanıt yok.
- **C**: KESİNLİKLE bugünkü **G267**, kod okuması + davranışsal
  izolasyonla (`git apply -R`) DOĞRULANDI — G203'ün (3 gün önceki,
  kendi başına doğru) kurtarma yolu ile G267'nin (bugün) yeni "seamless"
  play-kontrol yüzeyi arasında bir ENTEGRASYON BOŞLUĞU.
  **G269/G271/G272/G273 (gain/spektrum telafisi) İLE HİÇ İLGİSİ YOK**
  — bunlar SADECE çıkış SEVİYESİNİ/PSD ağırlıklandırmasını etkiliyor,
  chain-KURMA mantığına dokunmuyor (doğrulandı: `git diff` bu commit'lerin
  `playThreeWaySpecific`/`cycleThreeWayPreview`/`buildThreeWayChain`'e
  TEK SATIR dokunmadığını gösteriyor).
- **D**: bug değil, tasarım gereği (dedup hiç var olmadı).

"Sınav bitişi → state bozulması → sayaç+soru+ses hepsi etkileniyor"
hipotezi (görevin kendi E bölümü) **çürütüldü** — A ve C'nin
tetikleyicileri birbirinden TAMAMEN FARKLI (A: exam-sonucu ekranından
"Ana Ekran" tıklaması; C: arka-plan/kill-restart sonrası kurtarma,
sınavla İLİŞKİSİZ), aynı state bozulmasından gelmiyorlar.

## DOKUNULMAYAN/TEST EDİLMEYEN

- B için farklı reprodüksiyon adımları (ör. cevap sonrası panelde
  kaynak değiştirme) denenmedi — kullanıcıdan tam adım sırası istenmesi
  önerilir.
- A'nın diğer 11 modda da reprodüke olup olmadığı test edilmedi (kod
  yapısı mod-bağımsız olduğu için BEKLENİR, ama ÖLÇÜLMEDİ).
- C'nin Reverb'de (non-seamless, `isSeamlessThreeWay` DIŞI) kurtarma
  sonrası GERÇEKTEN çalıştığı bu turda AYRICA doğrulanmadı (kod
  okumasıyla GÜÇLÜ bir çıkarım var, ama Playwright'la ÖLÇÜLMEDİ).

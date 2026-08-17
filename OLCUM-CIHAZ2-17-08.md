# OLCUM-CIHAZ2-17-08

Görev: cihaz turunda bulunan 5 yeni sorunun ölçümü. KOD YAZILMADI, DOSYA
DEĞİŞTİRİLMEDİ, COMMIT ATILMADI. Tüm bulgular ya Playwright ile
reprodüke edildi ya da `git blame`/kod okumasıyla doğrulandı — hiçbir
sayı tahmin edilmedi.

⚠️ **Bu turun DIŞINDA, bu ölçümle İLGİSİZ bir bulgu:** `git status`
`www/audio/arpeggio_guitar.m4a`'yı DEĞİŞTİRİLMİŞ (467225→456256 bayt,
19:28) gösteriyor — bu turun HİÇBİR scripti ses dosyasına yazmadı,
kaynağı BİLİNMİYOR. Kod DEĞİŞTİRİLMEDİ kuralına uyuldu (dosyaya
DOKUNULMADI, ne geri alındı ne commit edildi) — sadece bildiriliyor.

---

## ÖZET TABLO

| Madde | Kök sebep | Sorumlu commit | Bugünkü mü? | Kapsam |
|---|---|---|---|---|
| A) Bölüm çubuğu sırası | ✅ Kesin, reprodüke edildi | **G213** (`440b95b`, 08-15 11:18) | Hayır (2 gün önce) | Kod |
| B) Kaynak değişimi sonrası ekran | ✅ Kesin, reprodüke edildi | **G126** (`02e2f9f`, 08-11) | Hayır (6 gün önce) | Kod + ürün kararı |
| C) Reverb geçişleri hızlı | ✅ Kesin, ölçüldü | Tasarım sabiti (G17 civarı, çok eski) — G267 (bugün) İYİLEŞTİRMEDİ çünkü Reverb'e dokunmadı | Kısmen | Ürün kararı |
| D) Kick "boom" | ✅ Ölçüldü, nüanslı | Mimari 08-05'ten (G35) — G268 (bugün) sadece HACMİ azalttı | Kısmen | Ürün kararı |
| E) Zorluk dengesi | ✅ Ölçüldü | Tasarım (G97, 08-13) | Hayır | Ürün kararı |

**Hiçbiri bugünkü G214/G267/G269/G271/G272/G273'ün DOĞRUDAN bir bug'ı
DEĞİL** — A ve B, 2-6 gün önceki commit'lerde; C ve D'nin kökü çok
daha eski bir tasarım kararı, bugünkü G267/G268 bunları YARATMADI
(G267 Reverb'e hiç dokunmadı, G268 SADECE hacim azalttı, spektral/
zamansal karakteri değiştirmedi); E tamamen tasarım/ürün alanı.

---

## A) BÖLÜM ÇUBUĞUNDA SIRA BOZUK 🔴 — KESİN, REPRODÜKE EDİLDİ

### Kök sebep
`renderGameHeader()`'ın BÖLÜM nokta çizimi (`www/js/app.js:3994-3999`):
```js
for (let i = 0; i < challenge.total; i++) {
  dot.className = `game-chapter-dot${i < challenge.correct ? " on" : i < challenge.done ? " wrong" : ""}`;
}
```
`challenge` (`www/js/core/challenge.js`) SADECE `{active, total, done,
correct, xp}` — **düz SAYAÇLAR**, HANGİ POZİSYONUN doğru/yanlış olduğuna
dair HİÇBİR sıra bilgisi (dizi/geçmiş) tutmuyor. Bu formül MATEMATİKSEL
OLARAK sadece "önce `correct` kadar yeşil, sonra `done-correct` kadar
kırmızı" çizebilir — GERÇEK cevap sırasını YANSITMASI İMKANSIZ, veri
yapısı buna izin vermiyor.

### Reprodüksiyon (Playwright)
Boost mu Cut mu modunda DOĞRU,YANLIŞ,YANLIŞ,YANLIŞ,DOĞRU sırasıyla
cevaplandı (kullanıcının kendi senaryosu: 1. ve 5. soru doğru):
```
5. soru sonrası dots: [ON, ON, WRONG, -, -, -, -, -, -, -]
```
Gerçek sıra (doğru,yanlış,yanlış,yanlış,doğru) YERİNE dizinin BAŞINDA
İKİ yeşil (0 ve 1. pozisyon) gösterildi — TAM OLARAK kullanıcının
tarif ettiği "doğrular hep başta toplanıyor" deseni.

### `challenge.correct`/`challenge.done` sıralı bir dizi mi, sayaç mı?
**SAYAÇ.** `www/js/core/challenge.js:freshChallenge()` → `{ active,
total, done: 0, correct: 0, xp: 0 }`. `challengeTick()`
(`www/js/app.js:6054-6059`) SADECE `done++`/`correct++` yapıyor, hiçbir
diziye push YOK.

### G214'ün etkisi
**YOK/DOLAYLI.** G214 (`82f94e6`, 08-15 12:17 — G213'ten 1 saat SONRA)
`goToNextRound()`'a "Atla" için `challengeTick(false,0)` çağrısı EKLEDİ
— yani Atla de AYNI (zaten var olan, pozisyon-körü) sayaç sistemine
BİR GİRDİ DAHA ekliyor. G214 formülü DEĞİŞTİRMEDİ, sadece hangi
eylemlerin bu formülü BESLEDİĞİNİ genişletti. **Kök sebep G213, G214
DEĞİL.**

### Düzeltme yolu ve iş yükü
`challenge`'a bir SIRA dizisi eklenmeli: `results: []` (her
`challengeTick`'te `results.push(wasCorrect)`), dot render'ı
`i < results.length ? (results[i] ? "on" : "wrong") : ""` olarak
değişmeli. **Küçük, izole değişiklik:**
- `www/js/core/challenge.js`: `freshChallenge()`'a `results: []` eklemek — 1 satır.
- `www/js/app.js:challengeTick()`: `results.push(wasCorrect)` eklemek — 1 satır.
- `www/js/app.js:3994-3999`: dot formülü değiştirmek — ~3 satır.
- `done`/`correct` BAŞKA yerlerde de okunuyor (ör. `xpMult()`,
  `finishChallenge()`) — bunlar SAYAÇ olarak kalabilir (`results.length`/
  `results.filter(Boolean).length`'tan TÜRETİLEBİLİR ya da PARALEL
  tutulabilir, ikisi de düşük risk).
- **Test:** `test/challenge.test.mjs` var mı kontrol edilmeli (YOKSA
  yeni birim testi gerekir — düşük efor, saf fonksiyon).

**Not:** AYNI kısıtlama sınav/telafi dot'larında da var (G84'ten beri,
`www/js/app.js:3903-3919`, "SIRA bilgisi hiç YOK... kullanıcının kendi
kararı" — G213'ün kendi yorumu bunu doğruluyor) — bu görev SADECE
BÖLÜM'ü sordu, sınav/telafi KAPSAM DIŞI bırakıldı ama AYNI düzeltme
deseni ORAYA da uygulanabilir (istenirse, ayrı karar).

### Risk
**DÜŞÜK.** İzole veri yapısı eklemesi, mevcut `done`/`correct`
okuyucularına DOKUNULMADAN yapılabilir (paralel alan).

---

## B) KAYNAK DEĞİŞİMİ SONRASI EKRANA DÖNMÜYOR 🔴 — KESİN, REPRODÜKE EDİLDİ

### Kök sebep
`syncUploadGate()` (`www/js/app.js:2406-2444`), kaynak "upload" VE
geçerli dosya YOKKEN (`needsGate`):
```js
if (needsGate) {
  if (els.answers) { els.answers.innerHTML = ""; els.answers.classList.add("hidden"); }
  ...
}
```
`.answers`'ı BOŞALTIP GİZLİYOR. AMA kullanıcı GERİ, GEÇERLİ bir kaynağa
dönünce çalışan `if (!sourceIsUpload)` dalı (`www/js/app.js:2411-2416`):
```js
if (!sourceIsUpload) {
  els.uploadGate.classList.add("hidden");
  if (els.analyzer) els.analyzer.classList.toggle("hidden", !!mode.HIDE_ANALYZER);
  if (els.gameSpectrumControls) els.gameSpectrumControls.classList.remove("hidden");
  return;
}
```
**`.answers`'ı GERİ GETİREN/YENİDEN DOLDURAN HİÇBİR SATIR YOK.** Bu
dalın YAZARI `uploadGate`/`analyzer`/`gameSpectrumControls`'u
düşünmüş, `.answers`'ı UNUTMUŞ.

### Reprodüksiyon (Playwright)
Boost mu Cut mu'da round başlatıldı → Kaynak "upload"a (dosyasız)
çevrildi → `#answers` `{hidden:true, childCount:0}` (BEKLENEN, gate
panel görünür) → Kaynak GERİ "Bas"a çevrildi → **`#answers` HÂLÂ
`{hidden:true, childCount:0}`** — hiç geri gelmedi. Ekran teknik
olarak `screen-game` kalıyor (`goScreen` ÇAĞRILMIYOR bile, o yüzden
"ekrana dönmüyor" ekran GEÇİŞİ değil, o ekranın İÇİNDEKİ soru/cevap
alanının GÖRÜNMEZ kalması).

### Kullanıcının başka çıkış yolu var mı?
`.answers` boşken TEK aktif kontrol "Atla ▶" (`#nextBtn`, hiçbir zaman
`.answers`'a bağımlı değil) — `renderQuestion()`'ın bir SONRAKİ round'da
`.answers`'ı YENİDEN doldurması (`www/js/modes/*.js`'in `renderAnswerChoices`
benzeri fonksiyonları, her `renderQuestion()` çağrısında ÇALIŞIYOR) tek
kurtuluş yolu — **AÇIKLAR "Kullanıcı Atla demek zorunda kalıyor"
GÖZLEMİNİ TAM OLARAK.**

### "Neden dönmüyor — tur mu sıfırlanıyor, ekran mı değişmiyor?"
**İkisi de değil.** Tur SIFIRLANMIYOR (`activeQuestion` AYNI kalıyor,
per "Ayar değişti — bir sonraki turda uygulanacak" mesajı), EKRAN da
DEĞİŞMİYOR (zaten `screen-game`) — SADECE bir DOM alt-alanı
(`.answers`) kalıcı olarak boş/gizli kalıyor.

### Kaynak değişimi turu geçersiz kılıyor mu?
**HAYIR.** `www/js/app.js:7760`'daki `setFeedback("Ayar değişti", "Yeni
ayarlar bir sonraki turda uygulanacak.")` mesajı DOĞRU — mevcut
`activeQuestion.source` DEĞİŞMİYOR, SES de değişmiyor (playQuestion
sonraki round'a kadar tetiklenmiyor). Aynı soru AYNEN devam edebilir —
bu açıdan kod zaten "aynı soru devam eder" davranışını UYGULUYOR, tek
kırık olan `.answers` UI'ının GÖRÜNÜR kalmaması.

### ⚠️ Logic'in ürün sorusu — HİLE ANALİZİ
**"Kaynak değişimi 'Atla' sayılmasın mı? Hile kapısı açar mı?"**

Ölçülen: kaynak değişimi mevcut SORUYU/CEVABI DEĞİŞTİRMİYOR (yukarıda
kanıtlandı) — kullanıcı kaynak değiştirip AYNI soruyu, AYNI doğru
cevapla, bir SONRAKİ turdan itibaren farklı sesle duymaya devam eder.
**Bu, "zor soruda kaynak değiştirip cezasız yeni soru almak" hilesini
YAPISAL OLARAK DESTEKLEMİYOR** — kaynak değişimi bir "yeniden soru
üretme" tetikleyicisi DEĞİL, SADECE gelecekteki turlar için bir tercih
kaydı. Kullanıcı zor bir soruyla karşılaşıp kaynak değiştirse bile
AYNI zor soruyla baş başa kalır (üstüne bir de, BUG YÜZÜNDEN, cevap
ARAYÜZÜ kaybolur — bu onu KOLAYLAŞTIRMAZ, ZORLAŞTIRIR/imkansız kılar).

**Sonuç: kaynak değişimini "Atla" SAYMAMAK (bug düzeltildiği
varsayımıyla) ölçülebilir bir hile riski taşımıyor GÖRÜNÜYOR** —
ÇÜNKÜ soru içeriği değişmiyor. Tek incelikli senaryo: kullanıcı SESİ
duyduktan hemen SONRA ama cevap vermeden ÖNCE kaynağı değiştirirse,
mevcut turun sesi zaten duyulmuş olur (avantaj YOK) — round'un kendisi
bitmeden yeni ses çalınmıyor zaten (playQuestion sonraki turda). BU
ANALİZ KOD OKUMASINA DAYANIYOR, canlı kullanıcı davranışıyla
DOĞRULANMADI — Logic'in daha iyi bildiği bir kullanım deseni varsa
(ör. kaynak değiştirmenin BAŞKA bir yan etkisi) bu sonucu değiştirebilir.

### Düzeltme yolu ve iş yükü
**Bug (asıl):** `syncUploadGate()`'in `if (!sourceIsUpload)` dalına
`.answers`'ı GERİ GÖSTERME/YENİDEN DOLDURMA eklenmeli — en basit yol,
mevcut `renderQuestion()`'ı (zaten `.answers`'ı DOĞRU dolduran
fonksiyon) bu dalda TEKRAR çağırmak, YA DA en azından
`els.answers.classList.remove("hidden")` + mode'un kendi
render-answer-choices'ını tetiklemek. **KÜÇÜK, İZOLE** — TEK fonksiyon,
TEK eksik branş.

**Ürün kararı (ayrı):** kaynak değişimi "Atla" sayılsın mı/sayılmasın
mı — YUKARIDAKİ analiz "sayılmasa risksiz görünüyor" diyor ama KESİN
DEĞİL, Logic'in kararı. Sayılmayacaksa "i" metninde açıkça yazılması
öneriliyor (task'ın kendi notu) — bu METİN değişikliği AYRI, ufak bir iş.

### Risk
Bug düzeltmesi: **DÜŞÜK** (tek eksik dal, `renderQuestion()` zaten
var/test edilmiş bir fonksiyon). Ürün kararı kendisi risk taşımaz,
SADECE seçim gerektirir.

---

## C) REVERB ŞIK GEÇİŞLERİ ÇOK HIZLI 🔴 — ÖLÇÜLDÜ

### Otomatik döngü aralığı
`abLoopTimer = setInterval(toggleAB, 2000)` (`www/js/app.js:5553`) —
**2000ms SABİT**, TÜM modlar için (Kompresör/Distortion/Reverb AYNI
sabiti paylaşıyor).

### Reverb decay süreleri vs 2000ms pencere
`www/js/modes/reverb.js:75/83/91`:
| Tip | decayRange (sn) |
|---|---|
| Room | 0.3 – 0.9 |
| Plate | 0.9 – 2.0 |
| Hall | 1.6 – **3.2** |

**Hall'ın EN UZUN decay'i (3.2sn) 2000ms pencerenin TAMAMINI AŞIYOR**
— kullanıcı Hall'ın kuyruğunun EN AZ %38'ini (3.2sn'nin 1.2sn'lik
kısmı) HİÇ duyamıyor, bir sonraki harf ARAYA GİRİYOR. Plate'in üst
ucu (2.0sn) da pencereye ÇOK YAKIN/sınırda.

### Baştaki "ölü süre" — GERÇEK ÖLÇÜM (Playwright, analyser tap)
Manuel bir A→B geçişinde (groove kaynağıyla, kart tıklaması) analyser
her ~8ms örneklendi:
```
t=2.3ms – t=118.5ms: sinyal sapması ~1-2 (SESSİZLİK, gürültü tabanı)
t=126.9ms: sapma 5'e sıçrıyor, sonra 8→12→15→17 (SİNYAL BAŞLIYOR)
```
**Ölçülen ölü süre: ~116-125ms.** Task'ın tahmin ettiği "50ms ramp +
1.5ms fade" bileşenlerinin (kodda doğrulandı: `MUTE_RAMP_SEC`/
`out.gain.exponentialRampToValueAtTime` = 50ms,
`STOP_RAMP_TIME_CONSTANT` = 12ms) TOPLAMINDAN BÜYÜK — fark muhtemelen
`buildQuestionChain`'in JS-taraflı senkron kurulum süresi (node
oluşturma/bağlama, `generateImpulseResponse` — AYRICA ölçüldü, aşağıda)
+ event-loop gecikmeleri.

`generateImpulseResponse()` süresi (EN UZUN decay, tip başına):
| Tip | süre (ms) | IR buffer uzunluğu (sn) |
|---|---|---|
| Room | 8.5 | 0.92 |
| Hall | 7.1 | 3.22 |
| Plate | 2.7 | 2.02 |

Bu TEK BAŞINA ölü sürenin küçük bir parçası (7-8.5ms) — asıl 116ms'in
geri kalanı ramp/event-loop/graf-kurulum toplamı.

**Sonuç: 2000ms pencerede ~120ms ölü süre + Hall'da 1000+ms kesilen
kuyruk = kullanıcı EFEKTİF olarak Room/kısa-Plate için ~1.9sn, Hall
için 2sn'nin TAMAMINI (ve kuyruğun kendisi 3.2sn'ye kadar
uzayabildiği için HER ZAMAN kesik) dinliyor.**

### Kaç saniye gerekir? (kaba tahmin, KESİN ölçülmedi)
RT60 tanımı gereği decay süresi sonunda sinyal -60dB'ye iner — pratikte
kulak enerjinin çoğunu (~-20/-30dB'ye kadar) daha ERKEN algılamayı
bırakır, bu yüzden TAM RT60'ı beklemek GEREKMEYEBİLİR. Ama Hall'ın en
azından %70-80'ini (≈2.2-2.6sn) duyurmak için pencere en az **~2.5-2.8sn
+ ~120ms ölü süre ≈ 2.6-2.9sn** olmalı gibi görünüyor — BU SAYI
PSİKOAKUSTİK OLARAK DOĞRULANMADI, sadece decay-yüzdesi mantığından
türetildi.

### Süre uzatılabilir mi, mod bazında farklı olabilir mi?
**Evet, YAPISAL OLARAK MÜMKÜN** — `abLoopTimer`'ın `2000` sabiti
TEK bir `setInterval` çağrısı (`startAbLoop()`), mod bazlı hale
getirilebilir (ör. `mode.AB_LOOP_MS || 2000`). **Küçük iş**, ama
Reverb'in KENDİ İÇİNDE decay SORUYA GÖRE değiştiği için (Room 0.3sn'den
Hall 3.2sn'ye) SABİT bir mod-bazlı süre bile ya Room'da GEREKSİZ
yavaş ya da Hall'da HÂLÂ yetersiz olur — **SORUYA-ÖZGÜ (question.decaySec
tabanlı) dinamik bir süre** en doğru çözüm olurdu, ama bu DAHA BÜYÜK
bir iş (abLoopTimer'ın round-genelinde SABİT bir sayı olmaktan
question-bazlı DİNAMİK bir sayıya geçmesi gerekir).

### Kompresör/Saturation'da süre yeterli mi?
G267 (bugün) SONRASI bu ikisi SEAMLESS (rebuild YOK, sadece gain
crossfade, ~50ms) — **decay/kuyruk KAVRAMI bu ikisinde YOK** (sürekli
işlenen sinyal, Reverb'in aksine bir "tükenmesi gereken" bir şey
YOK). Bu YAPISAL FARK yüzünden 2000ms'nin YETERLİLİĞİ Reverb'den
FARKLI bir soru — **algısal olarak (kaç saniye A/B karşılaştırması
için gerekir) bu turda ÖLÇÜLMEDİ** (psikoakustik bir soru, ses
zinciri ölçümü değil). Yapısal olarak Kompresör/Distortion'ın Reverb'in
"kuyruk kesilmesi" sorununu PAYLAŞMADIĞI KESİN — ama "2sn yeterince
uzun mu bir kompresör oranını ayırt etmeye" AYRI, ölçülmemiş bir soru.

### Risk
Sabit süre artışı (ör. 2000→2800ms, TÜM modlarda): **DÜŞÜK-ORTA** —
tek sabit, ama Kompresör/Distortion'ın otomatik döngüsünü de
YAVAŞLATIR (istenmeyen yan etki olabilir, kullanıcı deneyimi
kararı). Mod-bazlı/dinamik süre: **ORTA** — daha fazla kod, ama daha
DOĞRU sonuç.

---

## D) TELEFON HOPARLÖRÜNDE KICK "BOOM" 🟡 — ÖLÇÜLDÜ, NÜANSLI

### Mimari bulgu
`reverb.js`'de (TÜM dosya) **`highpass`/`lowcut`/`createBiquadFilter`
HİÇ GEÇMİYOR** (`grep` ile doğrulandı, sıfır eşleşme). Wet yolun TEK
spektral kontrolü `applyOnePoleLowpass(data, brightness)`
(`www/js/modes/reverb.js:661-668`) — SADECE bir LOW-PASS (parlaklık)
tonu, HİÇBİR high-pass/low-cut YOK. Gerçek akustik reverb
algoritmaları/mikslerde reverb gönderisine neredeyse HER ZAMAN bir
high-pass uygulanır (sub-bas'ın oda/plaka/hol'de "gerçekçi" şekilde
REVERBERE OLMAMASI + mix'te "çamur" birikmemesi için) — bu app'in
mekaniği bunu YAPMIYOR.

### Ölçüm (OfflineAudioContext, kick.m4a + Reverb applyProcessing BİREBİR)
Kick'in 100-200Hz bandındaki gücü, DRY kick'e KIYASLA (G268'in -16dB
telafisi DAHİL, GERÇEK duyulan çıkış):

| Varyant | 100-200Hz, dry kick'e göre |
|---|---|
| Room, wetMix=0.3 | -4.00 dB (AZALMA) |
| Room, wetMix=0.6 | -0.93 dB |
| Plate, wetMix=0.3 | +0.70 dB |
| Plate, wetMix=0.6 | +1.18 dB |
| Hall, wetMix=0.3 | **+3.17 dB** |
| Hall, wetMix=0.6 | **+3.94 dB** |

**Hall (en uzun decay) 100-200Hz bandında dry kick'in KENDİSİNDEN
+3-4dB DAHA FAZLA enerji üretiyor** — G268'in -16dB'lik BROADBAND
telafisi UYGULANDIKTAN SONRA bile (trim TÜM spektruma EŞİT
uygulanıyor, sadece TOPLAM hacmi düşürüyor, SPEKTRAL DENGEYİ
DÜZELTMİYOR — kod yorumunun kendi ifadesiyle: "dry/wet ORANI... BİR
SATIR bile etkilenmez, SADECE... TOPLAM çıkış seviyesi düşer").

### G268 alt uçta bir birikim YARATIYOR MU?
**HAYIR, G268 bu birikimi YARATMADI** — SADECE tüm çıkışı (düşük VE
yüksek frekans EŞİT ORANDA) -16dB kıstı, boom'un MUTLAK ses basıncını
azalttı ama RÖLATİF (100-200Hz'in geri kalan spektruma göre payı)
KARAKTERİNİ DEĞİŞTİRMEDİ. Kök mimari (high-pass YOK) `reverb.js`'in
YARATILDIĞI G35'ten (2026-08-05, 12 gün önce) beri AYNI.

### 100-200Hz'te "anormal" enerji var mı?
**ÖLÇÜLEBİLİR EVET (Hall'da +3-4dB), ama "anormal" mi "beklenen
fiziksel sonuç" mu — YORUM GEREKTİRİYOR.** Bir kick'in fundamental'i
zaten 50-120Hz bandında güçlü — bu enerji high-pass'siz bir
konvolüsyonla REVERB KUYRUĞUNA TAŞINIP SÜRDÜRÜLÜYOR (kuyruk
UZADIKÇA/decaySec BÜYÜDÜKÇE toplam enerji de artıyor, tam ölçülen
desenle TUTARLI: Hall>Plate>Room). Bu YAPISAL olarak BEKLENEN bir
sonuç (high-pass yoksa, konvolüsyon düşük frekansları SİLMEZ) — ama
GERÇEK reverb tasarımlarının TİPİK OLARAK bunu ÖNLEMESİ (high-pass ile)
göz önüne alınırsa, bu app'in mekaniği bu AÇIDAN atipik.

### Telefon hoparlörü rezonansı — kaynakta mı cihaz karakterinde mi?
**İKİSİ BİRDEN, AYRIŞTIRILAMADI (bu turun kapsamında).** Ölçülen +3-4dB
GERÇEK ve KAYNAKTA (bu app'in çıkışında) VAR — ama telefon
hoparlörlerinin küçük diyafram/kabin rezonanslarının 100-300Hz
civarını TİPİK OLARAK ABARTTIĞI da bilinen bir donanım karakteristiği
(genel akustik bilgi, bu app'e özgü ÖLÇÜLMEDİ). AirPods Pro'nun (aktif
ses yönetimi/daha lineer bas tepkisi olan bir donanım) bunu
GÖSTERMEMESİ bu ikisinin BİRLEŞTİĞİNİ DESTEKLİYOR — kaynaktaki gerçek
+3-4dB fazlalık, hoparlörün KENDİ rezonansıyla ÇARPILINCA duyulabilir
"boom" oluyor. **Kesin oran (kaynak vs cihaz payı) BU TURDA
ÖLÇÜLEMEDİ** (fiziksel hoparlör donanımı gerektirir).

### Düzeltme yolu ve iş yükü
Wet yola (convolver ÖNCESİ ya da wetGain SONRASI) bir highpass
BiquadFilterNode eklemek (ör. 80-120Hz civarı, kesim frekansı ürün
kararı) — `applyProcessing`'e ~3-4 satır (`createBiquadFilter` +
`connect` zinciri değişir). **KÜÇÜK-ORTA** kod değişikliği, AMA
sonucu ÖLÇÜLEBİLİR biçimde DEĞİŞTİRİR (Reverb'in TÜM kaynaklardaki SESİ
etkiler, sadece kick DEĞİL) — `test/reverb.test.mjs` var olan testlerin
(varsa) dry/wet ORANI/tepe-telafi kabul kriterleri BOZULMAMALI,
AYRICA test edilmeli.

### Risk
**ORTA** — Reverb'in TÜM çıkışını etkileyen bir DSP değişikliği,
G268'in tepe-telafi kabul kriterleriyle ETKİLEŞEBİLİR (highpass
kesilen enerji tepe seviyesini de DEĞİŞTİRİR, -16dB trim'in
YETERLİLİĞİ YENİDEN doğrulanmalı). Bu bir DSP/ürün kararı — kesim
frekansı/eğimi Logic'in onayı gerektirir.

---

## E) ZORLUK DENGESİ (dB Seviyesi / Stereo Genişlik) 🟡 — ÖLÇÜLDÜ

**Not — terminoloji:** "Z1-Z7" bu app'in `ZORLUK.md` (2026-08-10,
BU turdan 7 gün önce, `www/js/core/difficulty-curve.js`/mod dosyaları
DEĞİŞMEDEN doğrulandı — HÂLÂ GEÇERLİ) raporunun KENDİ tanımı: sürekli
zorluk `position`'ının (1..LEVEL_CAP=20) tam sayı seviyeleri 1-7 —
"kademe" (easy/medium/...) DEĞİL. Bu rapor AYNI tanımı kullandı.

### dB Seviyesi Z1-Z7 (ZORLUK.md'den, DOĞRULANDI — db-seviyesi.js DEĞİŞMEDİ)
| Z | dbDelta | min çeldirici mesafesi |
|---|---|---|
| 1 | 3.000 dB | 1.500 dB |
| 4 | 2.107 dB | 1.151 dB |
| 7 | 1.480 dB | 0.883 dB |
| 20 (tavan) | 0.320 dB | 0.280 dB |

### Stereo Genişlik Z1-Z7 (BU turda hesaplandı — ZORLUK.md'de YOK, 10-mod listesine dahil değildi)
| Z | step (%) |
|---|---|
| 1 | 30.00 |
| 4 | 23.27 |
| 7 | 18.05 |
| 20 (tavan) | 6.00 |

### Diğer modlarla karşılaştırma — narrowing HIZI
ZORLUK.md §2.1'in ZATEN kurduğu (bu turda DOĞRULANAN) tablo: **dB
Seviyesi'nin Z1→Z7 daralması %41.1 — 10 modun 6.'sı, TAM ORTADA**
(Tonal Denge %51.7'den hızlı daralan uçta, Frekans Bulma/Kesim
Noktası %23.2'den yavaş daralan uçta). **"dB Seviyesi'nin belirgin
kolay olduğu iddiasını DOĞRULAYAN bir narrowing-hızı verisi YOK**
(ZORLUK.md'nin kendi sonucu). Stereo Genişlik BU turda hesaplandı:
Z1→Z7 daralma **%39.8** — dB Seviyesi'ninkine NEREDEYSE ÖZDEŞ, AYNI
şekilde ORTA sırada (10 modun arasına yerleştirilmedi çünkü Stereo
Genişlik ZORLUK.md'nin 10-mod listesinde YOK, ama aynı narrowing-hızı
ARALIĞINDA).

**Sonuç: NARROWING HIZI açısından ikisi de anomali DEĞİL.**

### JND (algısal eşik) karşılaştırması
**Loudness JND** — yaygın kabul gören (KESİN akademik referans bu
turda doğrulanmadı, genel ses mühendisliği pratiğinden) aralık:
eğitimli kulaklar için ~0.5-1dB, genel dinleyici için ~1-3dB. dB
Seviyesi'nin Z1-Z4 aralığı (dbDelta 3.0→2.1dB, min mesafe 1.5→1.15dB)
bu eşiğin RAHATÇA ÜSTÜNDE — kolay/orta seviyede GERÇEKTEN kolay
algılanması BEKLENİR. Z7'de (min mesafe 0.883dB) eşiğe YAKLAŞILIYOR
ama HENÜZ altına inmiyor.

**Stereo width JND** için bu turda GÜVENİLİR bir eşik değeri
BULUNAMADI/doğrulanamadı — loudness kadar standart bir literatür
referansı yok, **BU KARŞILAŞTIRMA BELİRSİZ bırakılıyor.**

### XP kazanma hızı daha mı yüksek?
**Taban XP DEĞİL.** DIFFICULTY.easy.xp karşılaştırması: dB Seviyesi=14
(kesim-noktasi/q-genisligi ile AYNI, TEST EDİLEN 5 modun EN
DÜŞÜĞÜ), Stereo Genişlik=16 (frekans-bulma/boost-mu-cut-mu ile AYNI,
ORTA). `calculateXP()` formülü (`base * comboBoost * hintPenalty *
bossBoost * timeBoost * xpMultiplier`) HER İKİ modda da DİĞER
modlarla BİREBİR AYNI — özel bir çarpan YOK.

**Muhtemel açıklama (KANITLANMADI, akıl yürütme): eğer erken/orta
seviyelerde (Z1-Z10 civarı) fark JND'nin rahatça üstündeyse, kullanıcı
YÜKSEK DOĞRULUKLA cevaplıyor olabilir → sürekli combo/timeBoost
bonusu → daha HIZLI seviye atlama, TABAN XP'DEN BAĞIMSIZ.** Bu app'in
hiçbir yerinde kullanıcı-bazlı DOĞRULUK/ACCURACY telemetrisi
TUTULMUYOR (sadece localStorage'da stats var, harici analitik YOK) —
bu hipotez GERÇEK kullanıcı doğruluk oranıyla DOĞRULANAMADI, sadece
YAPISAL olarak MAKUL.

### Diğer 10 modun zorluk eğrisiyle karşılaştır — gerçekten daha mı kolay?
**Narrowing HIZI açısından HAYIR** (ölçüldü, ortada). **Mutlak
başlangıç (Z1) büyüklüğü açısından KARŞILAŞTIRILAMAZ** (ZORLUK.md'nin
kendi notu, §2.2: farklı birimler — dB/oktav/kGap/% — arasında
"kim daha kolay" YANILTICI). **JND'ye göre EVET, en azından
ERKEN/ORTA seviyelerde** (dB Seviyesi için ölçüldü; Stereo Genişlik
için JND referansı yok, BELİRSİZ).

### Hangi parametreler değişmeli — SEÇENEKLER (karar Logic'in)
1. **AT_1'i düşür** (dB Seviyesi: 3.0→~2.0dB; Stereo Genişlik: 30%→~20%)
   — en kolay ucu daha az cömert yapar, narrowing ORANINI korur.
2. **Narrowing'i hızlandır** (AT_CAP'i daha da küçült/eğriyi dikleştir)
   — zaten ORTA sırada olan narrowing hızını Tonal Denge/Reverb
   grubuna (%47-52) yaklaştırır.
3. **Hiçbir şey değiştirme** — eğer "kolay başlangıç, dik ilerleme"
   BİLİNÇLİ bir onboarding tasarımıysa (bu app'in K_GAP/zorluk
   eğrisi felsefesinde başka yerlerde de görülen bir desen).
4. **Accuracy telemetrisi ekle** (BÜYÜK iş, AYRI bir proje) — "gerçekten
   çok kolay mı" sorusunu VARSAYIMDAN ÇIKARIP ÖLÇÜLEBİLİR hale getirir.

---

## SONDA — GÖREVİN İSTEDİĞİ 3 KATEGORİ

### 1) Bugün düzeltilebilecekler (düşük risk)
- **A) Bölüm çubuğu sırası** — `challenge.results` dizisi eklemek,
  dot formülünü değiştirmek. Küçük, izole, saf fonksiyon katmanında.
- **B) Kaynak değişimi sonrası `.answers` kaybolması** — `syncUploadGate()`'in
  eksik dalına `.answers`'ı geri getiren TEK bir çağrı eklemek.

### 2) Karar bekleyenler (Logic'in cevaplaması gereken)
- **B'nin ürün sorusu:** kaynak değişimi "Atla" sayılsın mı? (Ölçüm:
  hile riski DÜŞÜK görünüyor, ama Logic'in bilmediğim bir kullanım
  deseni varsa değişebilir.)
- **C) Reverb döngü süresi:** 2000ms'den ne kadar uzatılsın, TÜM
  modlarda mı SADECE Reverb'de mi, sabit mi soru-bazlı dinamik mi?
- **D) Reverb wet yoluna high-pass eklensin mi?** Kesim frekansı kaç
  Hz olmalı, G268'in -16dB trim'i BUNUNLA birlikte yeniden ayarlanmalı mı?
- **E) Zorluk eğrisi parametreleri** — 4 seçenekten hangisi (ya da
  hiçbiri).

### 3) 1.1'e bırakılması gerekenler
- **C'nin "soru-bazlı dinamik döngü süresi"** varyantı (decaySec'e göre
  ayarlanan abLoopTimer) — YAPISAL olarak daha DOĞRU ama daha BÜYÜK bir
  refactor (round-genelinde sabit bir sayıdan question-bazlı bir
  fonksiyona geçiş).
- **D'nin "kaynak vs cihaz payı" ayrıştırması** — gerçek telefon
  donanımı/ölçüm ekipmanı gerektirir, bu ortamda YAPILAMAZ.
- **E'nin "accuracy telemetrisi"** seçeneği — ayrı, büyük bir altyapı
  işi (mevcut localStorage-only mimarisine YENİ bir veri katmanı).
- Sınav/telafi dot'larının AYNI sıra-körü sorunu (A'nın notunda
  bahsedildi) — bu GÖREV SADECE BÖLÜM'ü sordu, sınav/telafi'ye
  genişletmek AYRI bir karar/iş.

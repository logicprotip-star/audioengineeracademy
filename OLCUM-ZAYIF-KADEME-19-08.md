# OLCUM-ZAYIF-KADEME-19-08 — Zayıf kademe raporu yanıltıcı mı? + Kulak butonu sesi karışması: kök sebep ölçümü

**Görev tipi:** ÖLÇÜM. Kod değiştirilmedi, commit atılmadı. Saf fonksiyonlar
(`getWeakTier`/`getWeakZone`) sahte veriyle Node üzerinde ÇALIŞTIRILARAK
ölçüldü (aşağıdaki tablolar gerçek fonksiyon çıktısı, tahmin değil). Kulak
butonu (B) bölümü kod okuyarak izlendi — cihazda/Playwright'ta YENİDEN
ÜRETİLMEDİ, bu BELİRSİZ kalan noktalarda açıkça işaretlendi.

---

## A) ZAYIF KADEME RAPORU

### A.1 — Formül ne? (`www/js/core/exam-system.js:102-113`)

```js
export function getWeakTier(tierStats, config = EXAM_CONFIG) {
  let weakest = null;
  for (const tier of config.TIER_ORDER) {       // ["easy","medium","hard","pro"]
    const t = tierStats && tierStats[tier];
    if (!t) continue;                             // hiç oynanmamış kademe → ATLANIR
    const total = t.correct + t.wrong;
    if (total < config.MIN_TIER_SAMPLES) continue; // <3 örnek → ATLANIR (MIN_TIER_SAMPLES=3)
    const accuracy = t.correct / total;
    if (!weakest || accuracy < weakest.accuracy) weakest = { tier, accuracy };
  }
  return weakest;   // null = hiçbir kademe yeterli veri taşımıyor
}
```

Çağıran taraf (`app.js:3027-3036`, `getWeakArea`): `null` dönerse **"medium"a
düşülüyor** (varsayılan orta kademe) — ama `getWeakTier` `null` DIŞINDA bir
şey döndürdüğü an, o değer SORGUSUZ "Zayıf kademen: X" başlığına yazılıyor
(`app.js:3261`: `` `Zayıf ${isZone?"bölgen":"kademen"}: ${areaLabel}` ``).
**Hiçbir yerde ikinci bir "gerçekten zayıf mı" kontrolü YOK** — `getWeakTier`
ne dönerse UI onu birebir "zayıf" diye sunuyor.

### A.2 — Hiç oynanmamış kademe nasıl ele alınıyor?

**YOK SAYILIYOR** (A.1'deki `if (!t) continue`) — ne "zayıf" sayılıyor ne
varsayılan bir değer alıyor, aday havuzuna hiç girmiyor. Sorun BURADA
BAŞLIYOR: aday havuzunda tek bir kademe kalırsa, o kademe **doğruluğu ne
olursa olsun** otomatik "en zayıf" oluyor (karşılaştıracak ikinci bir aday
yok).

### A.3 — Senaryolar (GERÇEK `getWeakTier` çağrısı, Node'da çalıştırıldı)

| Senaryo | tierStats girdisi | `getWeakTier` çıktısı |
|---|---|---|
| a) 50 kolay, %80 | `{easy:{40,10}}` | **`{tier:"easy", accuracy:0.8}`** |
| b) 50 kolay(%80)+5 orta(%40) | `{easy:{40,10}, medium:{2,3}}` | `{tier:"medium", accuracy:0.4}` |
| c) 50 kolay(%80)+50 orta(%75)+50 zor(%70) | `{easy:{40,10},medium:{37,13≈%74},hard:{35,15}}` | `{tier:"hard", accuracy:0.7}` |
| d) 10 kolay(%50)+10 orta(%90) | `{easy:{5,5}, medium:{9,1}}` | `{tier:"easy", accuracy:0.5}` |
| e) hiç soru yok | `{}` | `null` → UI "medium"a düşer |
| f) easy'de sadece 2 örnek (eşik altı) | `{easy:{1,1}}` | `null` (3'ten az, hiç sayılmıyor) |
| g) easy'de TAM 3 örnek, %100 doğru | `{easy:{3,0}}` | **`{tier:"easy", accuracy:1.0}`** |

**Senaryo (a) BİREBİR cihazdaki şüpheyi doğruluyor:** kullanıcı SADECE
kolayda oynamış, isabeti **%80** (iyi bir sonuç) — buna rağmen sistem
"Zayıf kademen: Kolay" diyor, çünkü easy tek aday. **Senaryo (g) durumu
DAHA UÇ:** MIN_TIER_SAMPLES eşiğinin TAM SINIRINDA (3 örnek), isabeti
**%100** olan bir kademe bile — hâlâ "zayıf" ilan ediliyor.

### A.4 — Az oynanmış kademe haksız yere zayıf çıkıyor mu? Eşik koruyor mu?

**Evet, haksız yere çıkıyor — MIN_TIER_SAMPLES bunu ENGELLEMİYOR.**
Eşik SADECE "bu kademe adaylığa girebilir mi" sorusuna cevap veriyor
(< 3 örnek → hiç girmiyor); "bu kademe GERÇEKTEN diğerlerinden daha mı
kötü" sorusuna hiç bakmıyor. Tek aday kaldığında karşılaştırma
YAPILAMIYOR, o yüzden tek aday otomatik "en düşük" oluyor — %100
doğrulukla bile (senaryo g).

### A.5 — Kaç soru sonra rapor ANLAMLI hale geliyor?

Rapor ancak **EN AZ İKİ kademe** aynı anda `total>=3` sağladığında gerçek
bir karşılaştırma yapıyor. Zorluk kademesi kullanıcının SEVİYESİNE bağlı
(`difficulty-curve.js:53-58`, `tierForLevel`): seviye 1-4 → **easy**,
5-8 → **medium**. Yani kullanıcı o moddaki KENDİ seviyesini 4'ün ÜSTÜNE
çıkarmadan (bir "level up" olmadan) tierStats'ta **medium'a hiç veri
düşmüyor** — bu süre boyunca (kaç parkur/soru olduğu `progress.js`'in XP
eğrisine bağlı, **bu turda ölçülmedi**) rapor MATEMATİKSEL OLARAK
anlamlı olamaz, HER ZAMAN tek-aday (easy) durumunda kalır.

### A.6 — Kullanıcı ilerledikçe düzeliyor mu, yoksa erken veri kalıcı mı?

**tierStats hiç sıfırlanmıyor / pencerelenmiyor / ağırlıklandırılmıyor**
(`app.js:1376`: SADECE o modun state'i hiç yoksa `{}`'tan başlar; sonrası
`recordTierResult` ile SONSUZA KADAR toplanıyor, `www/js/core/exam-system.js:89-96`).
**Kalıcı etki VAR ama MUTLAK değil** — yeni doğru cevaplar `correct`
sayacını artırarak oranı YAVAŞÇA iyileştirir (erken kötü veri asla
SİLİNMEZ, sadece SEYRELİR). Üstelik `stats.examState[modeId]` (`storage.js:186`
üzerinden persist ediliyor) SADECE o mod SIFIRDAN silinirse/hiç
girilmemişse temizleniyor — normal oyun akışında kullanıcı asla
"temiz sayfa" göremiyor.

### A.7 — AYNI SORU frekans bölgesi (zayıf BÖLGE) raporunda da var mı?

**Evet, YAPISAL OLARAK BİREBİR AYNI hata** (`www/js/core/personalization.js`):

- `getWeakZone` (satır 64-72): `zoneWeakness` `null` dönen (n<MIN_SAMPLES=3)
  bölgeleri `continue` ile atlıyor, kalanlar arasından EN YÜKSEK
  weakness'ı (A.1'in `getWeakTier`'ıyla BİREBİR aynı iskelet, sadece
  "min accuracy" yerine "max weakness") seçiyor — tek aday kaldığında
  YİNE otomatik "en zayıf".
- `recordZone` (`frekans-bulma.js:602-613`) de tierStats gibi
  **SONSUZA KADAR birikiyor**, pencereleme/decay YOK.

**Pratik fark (ölçülen, aynı olmayan taraf):** frekans-tabanlı modlarda
her soru RASTGELE tüm spektrumdan (ya da odak aralığından) geliyor —
zorluk kademesi gibi "önce easy, sonra medium" biçiminde KADEMELİ
AÇILMIYOR. Yani bir kullanıcı ilk 10 soruda genelde BİRDEN FAZLA
bölgeye denk gelir, "tek aday" durumu zayıf-kademe kadar SIK
OLMAYABİLİR — ama M1-4 (odak aralığı daraltma) kullanılıyorsa ya da
kullanıcı çok az soru çözmüşse AYNI tuzak birebir işler. **Bu oran bu
turda ÖLÇÜLMEDİ** (kaç sorudan sonra "tek bölge" riski pratikte ne
sıklıkta gerçekleşiyor — simülasyon değil, gerçek soru dağılımı
gerektirir).

### A — SONUÇ

**Rapor YANILTICI — ölçüldü, tahmin değil.** Kök sebep: "hiç oynanmamış
kademe/bölge YOK SAYILIYOR" kuralının kendisi DOĞRU (yeni kullanıcıyı
yanlışlıkla zayıf saymıyor) ama **MIN_TIER_SAMPLES eşiği yalnızca
ADAYLIĞI filtreliyor, KARŞILAŞTIRMAYI değil** — tek aday kaldığında
(en tipik olarak: yeni kullanıcı, henüz sadece "kolay"da oynamış)
o tek aday **doğruluğu %100 bile olsa** "zayıf" ilan ediliyor. Bu,
task'ın şüphesiyle BİREBİR örtüşüyor.

**Düzeltme yolu (ÜRÜN KARARI gerektirir, burada UYGULANMADI):** olası
yönler — (1) en az 2 aday kademe/bölge olmadan "Zayıf X: Y" başlığını
HİÇ göstermeyip nötr bir mesaja düşmek ("Henüz yeterli veri yok" gibi —
`e) hiç soru yok` dalının ZATEN yaptığına benzer bir davranış tek-aday
durumuna da genişletilir), (2) tek aday kaldığında MUTLAK bir doğruluk
eşiği de aramak (ör. accuracy < %60 gibi bir sabit — SAYI UYDURULMAMALI,
kulakla/kullanıcı kararıyla belirlenmeli), (3) MIN_TIER_SAMPLES'ı
yükseltmek (yardımcı olmaz — b/c/d senaryolarında da AYNI trivial-seçim
riski aynen sürer, sadece eşik değişir). **Risk:** (1) basit ama "zayıf
kademe" özelliğinin YENİ kullanıcılar için pratikte hiç tetiklenmemesi
anlamına gelebilir (telafi mekaniği zaten PARKUR BAŞARISIZLIĞINA bağlı,
bkz. exam-system.js G48 notu — o tetikleyici BAŞKA, bu SADECE HANGİ
kademede telafi yapılacağını seçiyor, telafiyi başlatıp
BAŞLATMAYACAĞINI değil). (2) sayı uydurma riski taşır, kulakla/playtest
doğrulanmalı. Hangi yönün seçileceği bu turun kapsamı DIŞINDA — kullanıcı
kararı gerekiyor.

---

## B) KULAK BUTONU SESİ

### B.1 — Hangi ses zincirini kuruyor?

Tıklama işleyicisi `www/js/app.js:7449-7574` (`els.feedbackBox` üzerinde
delegasyon, `.fb-ear` hedefi). 8 uygun modda (`frequency, cutoff, dblevel,
pan, width, qwidth, boostcut(layer≠1), cakisma(stage 1/3)`, satır
7460-7463) üç önizleme türü var: `"mine"` (kullanıcının cevabı), `"clean"`,
`"correct"`. cakisma DIŞINDAKİ 7 mod TEK bir yolu kullanıyor:
`audioEngine.buildQuestionChain(...)` (satır 7541/7543/7545) — normal
sorunun KENDİ zincir kurucusu, YENİ bir mekanizma YOK. cakisma (Frekans
Çakışması) İKİ farklı davranış gösteriyor (satır 7519-7539):
- **Aşama 1:** `buildDualSourceChain(...)` — ZİNCİR YENİDEN kuruluyor.
- **Aşama 3:** ZİNCİR YENİDEN KURULMUYOR — ses ZATEN canlı çalıyorken
  SADECE `audioEngine.setDualCut(...)` ile mevcut filtrenin dB'si
  değiştiriliyor (kod içi not: "AŞAMA 3'te ses ZATEN CANLI çalıyor...
  YENİDEN KURMAYA gerek yok").

### B.2 — Bu zincir `stopAudio()` kapsamında mı?

**Dolaylı olarak EVET, ama SADECE 7 moddaki `buildQuestionChain`/
Aşama-1'deki `buildDualSourceChain` çağrısı ÜZERİNDEN** —
`buildQuestionChain`'in KENDİSİ fonksiyonun İLK satırında koşulsuz
`stopAudio()` çağırıyor (`audio-engine.js:799`: `stopAudio(); // ÖNCEKİ
zincirin...`). Yani her kulak butonu tıklaması ÖNCEKİ önizlemeyi (veya
asıl soru sesini) otomatik durdurup YENİDEN kuruyor — ayrı bir "önizleme
zinciri" YOK, asıl soru zinciriyle AYNI mekanizma. **Aşama 3 İSTİSNA:**
`setDualCut` `stopAudio()`'ya HİÇ uğramıyor (zaten canlı olan filtreyi
değiştiriyor) — bu KASITLI (Aşama 3'ün "önce/sonra" kesintisiz karşılaştırma
kararı, G306 notu).

### B.3 — G315'in eklediği "ekran açılınca durdur" bunu kapsıyor mu?

**Dolaylı olarak evet, ama G315 kulak butonunu HİÇ HEDEF ALMADAN.**
G315 SADECE `showExamScreen()`/`showSessionEnd()`/`openPaywallReason()`
fonksiyonlarının BAŞINA `stopAudio()` ekledi — bunlar sınav/telafi/
seans-sonu/paywall EKRANLARI. Kulak butonu geri bildirim panelinde
(`#feedbackBox`, oyun ekranının BİR PARÇASI) çalışıyor, bu üç fonksiyondan
HİÇBİRİ DEĞİL. Kulak-önizlemesi çalarken kullanıcı can biterse/oturum
limitine takılırsa/sınav-telafi başlarsa → G315'in eklediği stopAudio()
çağrısı BU YOLDAN da devreye girer (bu ekranlar açılırken TÜM ses
koşulsuz kesiliyor) — ama bu G315'in kulak-butonuna ÖZEL bir çözümü
DEĞİL, GENEL "ekran açılışında sesi kes" kuralının bir YAN ETKİSİ.

### B.4 — Yeni soru başlarken kulak butonu sesi kesiliyor mu?

**Kod OKUNARAK: EVET, iki ayrı katmanda güvenceye alınmış görünüyor**
(cihazda/Playwright'ta DOĞRULANMADI — aşağıdaki "BELİRSİZ" notuna bkz.):

1. `goToNextRound()` (`app.js:7313-7357`) → `startRound()` (`app.js:6250`) çağırıyor.
2. `startRound()`, YENİ soruyu (`activeQuestion = mode.createQuestion(...)`)
   kurmadan HEMEN ÖNCE **koşulsuz** `audioEngine.stopAudio()` çağırıyor
   (`app.js:6394`, G306'nın eklediği satır — kod içi not: "önceki turdan
   kalan HERHANGİ bir ses... burada KOŞULSUZ kesiliyor... TÜM 12 modda
   vardı, SADECE cakisma'ya özgü değil").
3. `buildQuestionChain`'in KENDİ `await buildSampleSource(...)` (örnek-dosya
   kaynaklarında GERÇEK bir async gecikme) SIRASINDA bu stopAudio()
   araya girerse, dönen düğüm `currentNodes.includes(out)` kontrolüyle
   (`audio-engine.js:898/908-909`) STALE sayılıp `sample.stop()` ile
   İPTAL EDİLİYOR — hiç bağlanmıyor. Bu, TAM OLARAK "önizleme hâlâ
   yükleniyorken round değişti" YARIŞ senaryosunu KAPSIYOR.

`cmpPreviewStopTimer`'ın kendisi (3 saniyelik pencere) **sesi
DURDURMUYOR** — SADECE `.on` class'ını kaldırıp otomatik-geçiş sayacını
(`ensureAutoNext`) yeniden başlatıyor (`app.js:7556-7573`). Yani kulak
önizlemesi KENDİLİĞİNDEN kesilmiyor, bir SONRAKİ round/ekran geçişi
BEKLENİYOR — ama o geçiş GERÇEKLEŞTİĞİNDE (2)'deki koşulsuz `stopAudio()`
onu kesiyor.

### B.5 — Ekrandan çıkılırken kesiliyor mu?

`performExit()` (`app.js:7594` civarı) `activeQuestion && !autoStopped`
ise `pauseRound()` çağırıyor; `pauseRound()`'un `muteOutput()`'u SADECE
gain'i 0'a rampalıyor, kaynak node'ları DURDURMUYOR (kod içi not,
G300) — **ama** `blockIfLivesOut()`/`blockIfSessionLimitReached()`
(can bitti / oturum limiti) yolu G315 sayesinde `showSessionEnd`/
`openPaywallReason` üzerinden stopAudio()'ya uğruyor. "Geri" tuşuyla
BİLEREK çıkışta (`performExit`) ise SADECE mute (gain→0.0001) uygulanıyor,
node'lar CANLI kalıyor — bu **G315'İN KAPSAMI DIŞINDA**, ayrı bir
BİLİNÇLİ tasarım kararı (o an "duraklat, devam edilebilir" durumunun
korunması gerektiği notu, satır ~7594 civarı). Kulak-önizlemesi tam bu
anda çalıyorsa da AYNI mute-only davranışa tabi — ayrı bir dal YOK.

### B.6 — 8 modun hepsinde aynı mı?

**Hayır — Aşama 3 (cakisma) YAPISAL OLARAK farklı** (bkz. B.1/B.2):
diğer 7 modun kulak butonu HER TIKLAMADA `stopAudio()`'ya uğrayan TAM
zincir kurulumundan geçiyor; Aşama 3 canlı filtre değeri değiştiriyor,
`stopAudio()`'ya HİÇ uğramıyor (bilerek, "kesintisiz önce/sonra" kararı
gereği). Aşama 1 ise diğer 7 modla AYNI davranışta (`buildDualSourceChain`
de `stopAudio()` ile başlıyor, `audio-engine.js:1146` civarı — bu turda
satır içeriği AYRICA doğrulanmadı ama dosya başı deseniyle — "her
chain-builder kendi başında stopAudio() çağırıyor" — tutarlı).

### B.7 — Aşama 3'ün "önce/sonra" korumasıyla çakışıyor mu?

**Hayır, ÇAKIŞMIYOR — kulak butonu Aşama 3'te ZATEN o korumayı
KULLANIYOR** (B.1/B.6). Kulak butonunun "correct" önizlemesi ile Aşama
3'ün kendi "önce/sonra" davranışı AYNI mekanizmayı (`setDualCut`,
zinciri BOZMADAN filtre değiştirme) paylaşıyor — kod içinde İKİ AYRI
yol YOK, kulak butonu bu korumanın ÜZERİNE binmiş durumda.

### B — SONUÇ

**Kök sebep (task'ın "sonra ses karıştı" gözlemi için, kod okumayla
tespit edilen):** `cmpPreviewStopTimer`'ın 3 saniyelik penceresi sesi
HİÇ DURDURMUYOR — kulak-önizlemesi süresi belirsiz (örnek dosyanın
KENDİ uzunluğu kadar) devam ediyor, ta ki BİR SONRAKİ round/ekran geçişi
`stopAudio()`'yu tetikleyene kadar. **Ancak** bu geçiş noktalarının
KENDİSİ (startRound()'daki G306 koşulsuz stopAudio() + showExamScreen/
showSessionEnd/openPaywallReason'daki G315 stopAudio()) — HER İKİSİ DE
kod BU TURDAN ÖNCE, ayrı görevlerde ZATEN eklenmiş — mevcut kaynak kodu
okuyarak, önizleme sesinin bir SONRAKİ soruya SESSIZCE (duyulur bir
kesinti olmadan) KESİLDİĞİNİ gösteriyor; `currentNodes.includes(out)`
STALE-kontrolü de örnek-dosya yükleme YARIŞINI (async gecikme sırasında
round değişmesi) ayrıca kapatıyor.

**BELİRSİZ — bu turda DOĞRULANAMADI:** cihazdaki gözlem (OLCUM-ZAYIF-
KADEME-19-08 task metninin B bölümü) G306 (`d51a97f`'ten ÇOK ÖNCE,
OLCUM-SES-BIRIKME-18-08'in ardından eklendi) ve G315 (`eb0ec9a`) zaten
KOMİTLENMİŞKEN mi test edildi, yoksa bu İKİ düzeltmeden BİRİ/İKİSİ de
cihaza henüz `cap sync` ile ULAŞMAMIŞKEN mi test edildi — bu BİLİNMİYOR.
DURUM.md'nin kendi SIRADAKİ notu G313 VE G315'in cihaz doğrulamasının
HÂLÂ YAPILMADIĞINI kaydediyor. Yani **statik kod okuma, mevcut kaynağın
bu bug'ı KAPSADIĞINI gösteriyor** — ama bu, cihazda ÇALIŞTIRILARAK
(Playwright/gerçek cihaz) DOĞRULANMADIKÇA "düzeldi" diye YAZILAMAZ
(CLAUDE.md'nin kendi kuralı: kanıt yoksa madde açık kalır).

**Düzeltme yolu (yalnızca yukarıdaki BELİRSİZ nokta gerçek bir açık
çıkarırsa gerekli olur):** eğer cihaz testinde (npx cap sync ios +
gerçek cihazda kulak butonuna basıp bekleme) mixing HÂLÂ gözlenirse,
en doğrudan düzeltme `cmpPreviewStopTimer`'ın 3 saniyelik `setTimeout`
callback'ine (`app.js:7556-7573`) `audioEngine.stopAudio()` çağrısı
EKLEMEK olur — böylece önizleme kendi süresini doldurunca (round henüz
DEVAM ederken bile) sesi KENDİLİĞİNDEN keser, bir sonraki geçişi
beklemez. **Risk:** bu, önizlemenin kasıtlı olarak "sonraki round'a kadar
sürsün" tasarımını DEĞİŞTİRİR — şu an önizleme süresi BİLEREK sınırsız
(örnek dosyanın kendi uzunluğu kadar) mı bırakılmış, yoksa bu bir gözden
kaçma mı, kod İÇİNDE bunu netleştiren bir yorum YOK — **ürün kararı
gerektirir, bu turda UYGULANMADI.**

---

## Genel not

Her iki madde de "kod OKUYARAK BULUNAN" seviyesinde — A) saf
fonksiyonlar Node'da GERÇEKTEN çalıştırılıp ölçüldü (yüksek güven);
B) ses zinciri/DOM/gerçek zamanlama iç içe olduğu için CLAUDE.md'nin
kendi kuralı gereği ("Ses ve DOM davranışı kaynak koddan doğrulanamaz")
sadece kod-okuma seviyesinde bir analiz — kesin cevap için tarayıcıda/
cihazda GERÇEKTEN bir tur oynanması gerekiyor. Bu tur KOD YAZMADI,
COMMIT ATMADI (task'ın kendi kısıtı).

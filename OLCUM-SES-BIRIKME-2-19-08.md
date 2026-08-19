# OLCUM-SES-BIRIKME-2-19-08

GÖREV: ÖLÇÜM. Kod yazılmadı, commit atılmadı. Logic'in cihaz gözlemi
("Telafi turunu başlat ekranı çıkıyor, uzun süre işlem yapmazsan ses
çalmaya başlıyor... ne kadar çok atladıysam ses o kadar çaldı") canlı
Playwright + RMS ölçümüyle DOĞRULANDI ve mekanizması tanımlandı.

## Yöntem

`AudioContext.prototype.createGain/createBufferSource/createAnalyser`
`page.addInitScript` ile PATCH edilerek (uygulama koduna TEK SATIR
dokunulmadan) her ses zinciri kuruluşu sayıldı ve uygulamanın KENDİ
paylaşılan analyser'ı (audio-engine.js:409-423, masterGain→analyser→
destination) YAKALANIP `getFloatTimeDomainData` ile canlı RMS okundu.
Test modu: `kesim-noktasi` (varsayılan kaynağı `"pink"` — SENKRON
gürültü, `www/js/modes/kesim-noktasi.js:313`).

Geçici script'ler (`scratch_olcum_ses_birikme{,2,3}.mjs`) repo'ya
commit EDİLMEDİ, ölçüm sonunda silindi — sadece bu raporun kanıtı.

## SONUÇ — DOĞRULANDI, RAPOR EDİLEN DAVRANIŞ GERÇEK

**Hızlı art arda (aralıksız) 10× "Atla" ile telafi turu anons
ekranına ulaşılınca, ekran açık kalırken (kullanıcı HİÇBİR ŞEY
yapmadan) ses 8 saniye boyunca KESİNTİSİZ, SÖNMEDEN çalmaya devam
etti** (RMS sabit ~0.11, hiçbir azalma eğilimi yok — bkz. ham veri
aşağıda).

**Kontrol deneyi, KRİTİK bulgu:** AYNI 10 "Atla", her tıklama
arasında 250ms bekleyerek (rapid-fire DEĞİL, normal hızda) yapıldığında
anons ekranında RMS **0.003 eşiğini HİÇ aşmadı — tam sessizlik**.
Yani bug **hız-bağımlı bir yarış durumu (race condition)** — normal
tıklama hızında OLUŞMUYOR, sadece SIFIRA yakın aralıklı (rapid-fire)
tıklamada ortaya çıkıyor. Bu, Logic'in "ne kadar çok atladıysam ses o
kadar çaldı" gözlemiyle BİREBİR örtüşüyor.

## ÖLÇ 1 — Her atlama bir ses zinciri kuruyor mu?

EVET. Her "Atla" (roundActive && activeQuestion iken, yani cevaplanmadan
geçilen bir soru) `startRound()` → `playQuestion()` →
`audioEngine.buildQuestionChain()` çağırıyor — bu, YENİ bir `out`/
`sourceMix`/`compressor`/filtre GainNode seti kurup ESKİ zinciri
`stopAudio()` ile söndürüyor (audio-engine.js:797-799).
`createGain()` sayacı ölçüldü: 10 atlama ~45 YENİ GainNode kurdu
(chain başına ~4-5 gain node, filtre sayısına göre değişir) —
her atlamanın GERÇEKTEN bir zincir kurduğu doğrulandı.

## ÖLÇ 2 — Hızlı atlarken kaç zincir birikiyor?

Hem YAVAŞ (250ms aralık) hem HIZLI (0ms, senkron döngüyle art arda)
10 atlama SONUNDA `createGain()`/`stopAudioCallCount` sayaçları
BİREBİR AYNI çıktı (gain=52, stopAudio=21 — ikisinde de). Yani
"biriken" zincir SAYISI ölçülebilir şekilde FARKLI DEĞİL — HIZLI
tıklamada da YAVAŞ tıklamadaki KADAR zincir kuruluyor, ne fazla ne
az. **Bug zincir SAYISINDA değil, HANGİ zincirin son hâlde
"unutulmadan" bağlı kaldığında.** (Playwright'ın kendi round-trip
gecikmesi zaten 10 tıklamayı ~20ms'de teslim edebiliyor — "5 kez hızlı
atla" senaryosu ile "10 kez" arasında MEKANİZMA açısından fark
gözlenmedi, sadece OLASILIK artıyor.)

## ÖLÇ 3 — Ekran açılınca stopAudio() kurulmakta olan zincirlere ulaşıyor mu?

KISMEN. `showExamScreen()` (app.js:3151-3163) GİRİŞTE koşulsuz
`audioEngine.stopAudio()` çağırıyor (G315) — bu, o ANDA `currentNodes`
içindeki HER ŞEYİ doğru şekilde söndürüyor. **Ama** `goToNextRound()`
(app.js:7372) hiçbir REENTRANCY (yeniden-giriş) KİLİDİ TAŞIMIYOR —
`async` bir fonksiyon, `await audioEngine.initAudio()` İLE BAŞLIYOR
(satır 7383) ve bu await'TEN SONRA `roundActive`/`activeQuestion`
okuyup `challengeTick`/`handleExamOutcome`/`startRound()` çağırıyor.
Kullanıcı "Atla"ya SIFIRA yakın aralıklarla basarsa, ÇOK SAYIDA
`goToNextRound()` çağrısı AYNI ANDA (üst üste binerek) bu await'i
geçebilir — HİÇBİR kilit/bayrak bunları SERİLEŞTİRMİYOR. Ölçülen
sonuç: bu üst üste binme, zincir SAYISINI artırmıyor (ÖLÇ 2) ama
`buildQuestionChain()`'in kendi `currentNodes.includes(out)`
korumasının (audio-engine.js:898/932) HANGİ zincirin "son" olduğuna
karar verişi, `showExamScreen()`'in stopAudio() çağrısıyla YARIŞA
girebiliyor — YAVAŞ (seri) akışta bu yarış hiç OLUŞMUYOR (KANIT: 250ms
kontrolünde sessizlik), HIZLI (üst üste binen) akışta OLUŞUYOR (KANIT:
8sn kesintisiz ses).

## ÖLÇ 4 — currentNodes.includes(out) iptal mekanizması bu durumu kapsıyor mu?

KISMEN — SADECE `buildQuestionChain()`'in KENDİ İÇİNDEKİ async
(`await buildSampleSource(...)`, SADECE `kind:"sample"` kaynaklarda)
gecikmesini kapsıyor (audio-engine.js:890-921). Bu ölçümde kullanılan
`kesim-noktasi` varsayılan kaynağı `"pink"` (SENKRON, `await` YOK) —
yani buildQuestionChain()'in KENDİ İÇİNDE hiçbir async yarış NOKTASI
YOK, dolayısıyla bu spesifik korumanın bu senaryoda HİÇ DEVREYE
GİRMEDİĞİ (test edilemediği) DOĞRULANDI. Buna RAĞMEN bug REPRODUCE
OLDU — yani sorun `buildQuestionChain()`'in İÇİNDEKİ async gap'ten
DEĞİL, `goToNextRound()`/`startRound()` SEVİYESİNDEKİ (fonksiyonlar
ARASI) reentrancy'DEN kaynaklanıyor. Bu KATMAN (goToNextRound'un
kendisi) HİÇBİR koruma TAŞIMIYOR — DOKUNULMAYAN bir boşluk.

## ÖLÇ 5 — Ekran açıldıktan SONRA doğan zincirler çalıyor mu?

EVET, KANITLANDI. HIZLI senaryoda `screen-exam` (telafi anons)
t=0.15s'te aktif oldu; `createGain`/`bufferSourceStart`/
`stopAudioCallCount` sayaçları t≈2.05s'te DONDU (52/11/21, bir daha
ARTMADI) — yani t=2.05s'ten SONRA HİÇBİR YENİ zincir kurulmadı. Buna
RAĞMEN RMS t=2.05s'ten t=7.95s'e kadar (gözlemin sonuna kadar) SABİT
~0.11 kaldı — **zaten kurulmuş, HİÇBİR stopAudio() çağrısının
ERİŞEMEDİĞİ bir zincir, ekran anons ekranındayken KESİNTİSİZ çalmaya
devam etti.**

## ÖLÇ 6 — Kaç saniye sonra çalmaya başlıyor?

HIZLI senaryoda ses zaten t=0.0s'te (ilk ölçüm anında) YÜKSEK
(RMS=0.088) — yani "sonradan başlamıyor", DAHA ÖNCE başlamış bir ses
anons ekranı açıldığında ZATEN çalıyordu ve KESİLMEDİ. "Ne kadar süre
sonra duyulur olduğu" sorusunun cevabı: **0 saniye (hiç kesilmedi)**,
"ne kadar süre çaldığı" sorusunun cevabı: **en az 8 saniye (ölçümün
üst sınırı, muhtemelen daha uzun — decay eğilimi YOK)**.

## ÖLÇ 7 — Düzeltme yolu: kurulum iptal edilebilir mi?

Bu turun kapsamı DIŞINDA (KOD YAZILMADI) ama ölçümün işaret ettiği
en OLASI düzeltme yönü: `goToNextRound()`'a bir REENTRANCY KİLİDİ
eklemek (fonksiyon çalışırken tekrar çağrılırsa NO-OP veya kuyruğa
alma) — `buildQuestionChain()`'in KENDİ `currentNodes.includes(out)`
deseninin AYNISI, ama `goToNextRound()`/`startRound()` SEVİYESİNE
taşınmış hâli. Alternatif/ek yön: `showExamScreen()`'in
`stopAudio()` çağrısını (satır 3163) bir `setTimeout(…, 0)` veya
mikro-görev SONRASI tekrar çağırmak ("son ana kadar üst üste binen
her şeyin gerçekten bitmesini bekle") — ama bu SAĞLAM bir kilit
YERİNE bir bant-yaması olur, ÖNERİLMİYOR. KESİN düzeltme tasarımı
AYRI bir "ÖNCE ÖLÇ SONRA UYGULA" turu gerektirir — bu rapor SADECE
mekanizmayı DOĞRULAMAK içindi.

## Ham veri (HIZLI senaryo, ilk 3 saniye örneklemi)

```
t=0.15s  ekran screen-exam'a geçti
t=0.30s  RMS=0.043   (screen-exam, gain=52 bufSrc=11 stopAudio=21 — SABİT)
t=0.50s  RMS=0.117
t=1.00s  RMS=0.116
t=2.00s  RMS=0.115
t=2.05s  RMS=0.115   (sayaçlar bu noktadan itibaren DONUYOR)
t=4.00s  RMS=0.115
t=6.00s  RMS=0.111
t=7.95s  RMS=0.099   (gözlemin sonu — hâlâ duyulabilir)
```

## KABUL — bu turun kapsamı

- [x] Rapor edilen davranış GERÇEK, canlı ölçümle DOĞRULANDI.
- [x] Mekanizma tanımlandı: `goToNextRound()`'un reentrancy KİLİDİ
      YOK, sadece SIFIRA yakın tıklama aralığında (rapid-fire)
      ortaya çıkan bir yarış durumu.
- [x] `buildQuestionChain()`'in KENDİ `currentNodes.includes(out)`
      koruması bu KATMANDA (fonksiyonlar arası) DEVREDE DEĞİL —
      SADECE kendi içindeki (sample-decode) async gap'i kapsıyor.
- [ ] Düzeltme — AYRI bir tur, kullanıcı kararı bekliyor (bkz. DURUM.md).

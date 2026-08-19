# OLCUM-KULAK-SES-19-08 — Kulak butonu sesi: kök sebep CANLI ÖLÇÜLDÜ (kod okuma değil)

**Görev tipi:** ÖLÇÜM. Kod değiştirilmedi, commit atılmadı. `www/js/app.js`/
`www/js/core/audio-engine.js` bu turda TEK SATIR değişmedi — bulgular
Playwright ile GERÇEKTEN ÇALIŞTIRILARAK, tarayıcının kendi Web Audio API'sine
(`AudioContext.prototype.createAnalyser`, `window.setTimeout`) DIŞTAN
monkey-patch uygulanan bir "prob" ile ölçüldü (repo dosyalarına dokunmadan —
sadece Playwright'ın `page.addInitScript`'i tarayıcı çalışma zamanını
sarıyor). Ölçüm scriptleri `/private/tmp/.../scratchpad/ear-close-probe*.mjs`
altında; repoya commit EDİLMEDİ.

**⚠️ ÖNCEKİ ÖLÇÜM (OLCUM-ZAYIF-KADEME-19-08 madde B) YANILDI** — kod okuyarak
"G306+G315 kapsıyor gibi görünüyor" dedi. Bu tur ÇALIŞTIRARAK ölçtü: **G306/
G315 kulak butonunun asıl sorununu KAPSAMIYOR.** Kök sebep aşağıda TAM olarak
tespit edildi.

---

## KÖK SEBEP (ölçüldü, kanıtlı)

`cmpPreviewStopTimer`'ın (`app.js:7552-7573`) davranışı SANILANDAN farklı:

1. Kulak butonuna basılınca `cmpPreviewRemainingMs = roundFlow.
   captureRemainingAndClear()` çağrılıyor — bu, NORMAL otomatik-geçiş
   sayacının O ANDA KALAN süresini YAKALAYIP durduruyor (ör. kullanıcı
   geri bildirim açılır açılmaz kulak butonuna basarsa, kalan süre
   NEREDEYSE TÜM otomatik-geçiş penceresi — ölçülen örnekte **5473ms**).
2. 3000ms (`CMP_PREVIEW_RESUME_MS`) sonra `cmpPreviewStopTimer` GERÇEKTEN
   ateşliyor (canlı ölçümde doğrulandı: `{"delay":3000,"fired":true}`) —
   ama bu callback SESİ DURDURMUYOR, SADECE `.on` sınıfını kaldırıp
   (görsel "dinleniyor" göstergesi SÖNÜYOR) `ensureAutoNext(remain)`'i
   YENİDEN çağırıyor.
3. `ensureAutoNext(5473)` bu YAKALANMIŞ TAM süreyi YENİDEN, SIFIRDAN
   başlatıyor — yani toplam gecikme **3000ms (önizleme duraklatması) +
   5473ms (geri yüklenen TAM kalan süre) ≈ 8,5 saniye**, normal (kulak
   butonuna hiç basılmamış) bir geri bildirimin **~5,5-6 saniyelik**
   otomatik-geçiş süresinin neredeyse İKİ KATI.
4. Bu SÜRE BOYUNCA (~8,5 saniye) `stopAudio()` **HİÇ çağrılmıyor**
   (`__aeaStopAudioCallCount()` sabit kalıyor) — kulak butonunun çaldığı
   "doğru şık" sesi (frekans-bulma'da SÜREKLİ bir SENTETİK TON,
   `AudioBufferSourceNode`/`OscillatorNode` doğası gereği KENDİLİĞİNDEN
   BİTMİYOR) **KESİNTİSİZ ÇALMAYA DEVAM EDİYOR** — RMS ölçümü t=200ms'den
   t=8000ms'ye kadar SÜREKLİ SESLİ (~0,07-0,13), tek bir düşüş YOK.
5. Round nihayet ~8,5-9sn'de kendiliğinden ilerliyor (`stopAudioCalls`
   o anda +2 artıyor — G306 + `buildQuestionChain`'in kendi iç
   `stopAudio()`'sunun İKİLİSİ, ÖNCEKİ ölçümün doğru tespit ettiği
   mekanizma) — ama BU NOKTAYA KADAR geçen sürede kullanıcı, GÖRSEL
   göstergenin (kulak butonunun "on" ışığı) 3. saniyede SÖNMESİNE
   RAĞMEN sesin HÂLÂ (5,5 saniye DAHA) çaldığını duyuyor. **Bu, "ses
   sonraki soruya taşıyor/karışıyor" algısının BİREBİR açıklaması —
   görsel gösterge ile ses birbirinden KOPUYOR.**

---

## 1) Kulak butonuna basılınca hangi ses zinciri kuruluyor? Node'lar nerede?

`app.js:7449-7574` (`#feedbackBox` delegasyonu) → 7 modda (`frequency,
cutoff, dblevel, pan, width, qwidth, boostcut`) `audioEngine.
buildQuestionChain(...)` (`audio-engine.js:797`), Frekans Çakışması Aşama 1'de
`buildDualSourceChain`, Aşama 3'te `setDualCut` (mevcut CANLI zincirin
filtresini değiştiriyor, YENİDEN KURMUYOR). Node'lar `audio-engine.js`'in
modül-kapsamlı `currentNodes` dizisinde tutuluyor — bu turda YENİ bir bulgu
YOK, önceki ölçümle TUTARLI.

## 2) GERİ BİLDİRİM KAPANIRKEN — **MANUEL kapatma (X/`.fb-close`) AYRI
ÖLÇÜLDÜ, TEMİZ ÇIKTI:**

Kulak butonuna basıp **1200ms bekleyip #feedbackClose'a MANUEL basıldığında**
(3 modda ölçüldü — frekans-bulma, kesim-noktasi):

| an (kapanıştan sonra) | RMS | stopAudioCalls |
|---|---|---|
| t=0-100ms | ~0,08-0,15 (hâlâ sesli) | değişmedi |
| **t=150ms** | ~0,07-0,08 | **+1** |
| **t=200ms** | **~0,001 (neredeyse sessiz)** | (aynı) |
| t=300ms | ~0,03 (yeni soru başlıyor) | **+1 daha** |
| t=500-1800ms | ~0,03-0,09 (yeni sorunun sesi) | sabit |

**Manuel kapatmada `stopAudio()` GERÇEKTEN çağrılıyor** (kapanıştan ~150ms
ve ~300ms sonra, İKİ kez — G306'nın `startRound()`'daki koşulsuz çağrısı +
`buildQuestionChain`'in kendi iç çağrısı), ses ~200ms'de neredeyse tam
sessizliğe düşüyor, SONRA yeni sorunun sesi başlıyor. **Bu yol TEMİZ —
"karışma" YOK.** (Önceki ölçümün "kod okuma" tahmini BU YOL için doğruydu.)

**Fonksiyon:** `#feedbackClose` → `.fb-close` delegasyonu → `goToNextRound()`
(`app.js:7313`) → `startRound()` (`app.js:6250`) → koşulsuz `audioEngine.
stopAudio()` (`app.js:6394`, G306) → `playQuestion(true)` → `buildQuestionChain`
kendi `stopAudio()`'suyla başlıyor. **Kulak butonunun node'ları bu temizliğe
DAHİL** — `currentNodes` PAYLAŞILAN, tek bir modül-kapsamlı dizi (ayrı bir
"önizleme zinciri" YOK).

## 2b) GERİ BİLDİRİM KAPANMADAN (kullanıcı hiçbir şeye BASMAZSA) — **BURASI
BOZUK, ölçüldü:**

Kulak butonuna basıp **HİÇBİR ŞEYE dokunmadan** izlendiğinde (4 modda
ölçüldü — frekans-bulma, kesim-noktasi, db-seviyesi, pan-konumu):

| mod | ses kesintisiz çaldığı süre | round GERÇEKTEN ilerlediği an | baseline (kulaksız) |
|---|---|---|---|
| frekans-bulma | t=200→8000ms boyunca KESİNTİSİZ sesli | ~8,6-10s | **~5,5-6s** (ayrıca ölçüldü) |
| db-seviyesi | t=200→6000ms sesli | ~7s | ölçülmedi |
| kesim-noktasi | t=200→8000ms sesli | ~9s | ölçülmedi |
| pan-konumu | t=200→8000ms sesli | ~9s | ölçülmedi |

**stopAudio() bu SÜRE boyunca HİÇ çağrılmıyor** — ses `buildQuestionChain`
tarafından bir KEZ başlatılıyor, sonra HİÇBİR ŞEY onu kesmiyor, ta ki
gecikmeli otomatik-geçiş (yukarıdaki KÖK SEBEP) sonunda tetiklenene kadar.
**3 saniyelik önizleme penceresi SESİ DURDURMUYOR** (sadece görsel `.on`
sınıfını kaldırıyor + otomatik-geçiş sayacını YENİDEN başlatıyor) — bu
ÖNCEKİ ölçümün doğru tespitiydi, ama o ölçüm "sonraki round'un stopAudio()'su
zaten kapsıyor" diye VARSAYDI; BU TUR o varsayımı ÇALIŞTIRARAK ÇÜRÜTTÜ:
sonraki round GECİKMİŞ oluyor (normalin ~1,5-2 katı), sesin SESSİZCE (görsel
göstergesiz) bu kadar UZUN sürmesi kullanıcıya "karışma" gibi geliyor.

## 3) 3 saniyelik önizleme penceresi

- **Kendiliğinden durmuyor** — `window.setTimeout` enjeksiyonuyla DOĞRUDAN
  doğrulandı: 3000ms'lik zamanlayıcı GERÇEKTEN 3000ms'de ateşliyor
  (`fired:true`), ama callback'i SESİ DEĞİL sadece `.on` class'ını ve
  otomatik-geçiş sayacını (YENİDEN, TAM kalan süreyle) yönetiyor.
- **Geri bildirim kapanmadıysa (kullanıcı dokunmadıysa) da devam ediyor** —
  yukarıdaki 2b tablosu bunu KANITLIYOR, ses 3. saniyeden SONRA da (5-6
  saniye DAHA) çalmaya devam ediyor.
- **Timer iptal ediliyor mu?** `goToNextRound()`'un BAŞINDA `clearTimeout
  (cmpPreviewStopTimer)` çağrılıyor (`app.js:7326-7328`) — bu SADECE
  kullanıcı MANUEL olarak "sonraki soru"ya geçerse devreye giriyor (o zaman
  zaten temiz, bkz. madde 2). Kullanıcı dokunmazsa bu clearTimeout hiç
  çalışmaz, 3sn'lik timer KENDİ SEYRİNDE ateşler ve YUKARIDAKİ kök sebebi
  tetikler.

## 4) Sonraki soru başlarken kulak sesi gerçekten kesiliyor mu?

**Manuel kapatmada: EVET, temiz kesiliyor** (madde 2). **Dokunulmazsa: EVET
ama ÇOK GEÇ** — round nihayet ilerlediğinde (~7-10s) yine aynı çift-
`stopAudio()` mekanizması devreye giriyor ve YENİ sorunun sesiyle net bir
geçiş oluyor (iki ses ÜST ÜSTE BİNMİYOR — RMS'te ikili/katlanmış bir seviye
GÖRÜLMEDİ, sadece TEK bir sesin ÇOK UZUN sürdüğü, SONRA kesilip yenisinin
başladığı gözlendi). **Yani gerçek anlamda "iki ses aynı anda üst üste
binmiyor"** — asıl sorun süre/gecikme VE görsel-işitsel senkron kaybı,
literal audio-mixing değil.

## 5) Playwright TEKRAR ÜRETİMİ + RMS

Yukarıdaki tüm tablolar GERÇEK Playwright + canlı `AnalyserNode` RMS
ölçümü (`audioEngine.analyser`'ın kendisi — `muteGain→masterGain→analyser→
destination` zincirinin İÇİNDE, tüm soru/önizleme sesi buradan geçiyor).
Akış: soru → cevap ver → geri bildirim → kulak butonuna bas ("doğru şık")
→ **hiçbir şeye dokunmadan** RMS zaman çizelgesi ölçüldü. Sonuç: ses
KESİNTİSİZ çalıyor, `stopAudioCalls` sabit kalıyor, round'un kendiliğinden
ilerlediği an normalin ~1,5-2 katına ÇIKIYOR.

## 6) 8 modun hepsinde aynı mı?

**Gecikme MEKANİZMASI (`cmpPreviewStopTimer`/`ensureAutoNext`) PAYLAŞILAN
kod — 4 modda ölçüldü (frekans-bulma, kesim-noktasi, db-seviyesi,
pan-konumu), HEPSİNDE AYNI YAPISAL DAVRANIŞ:** kulak butonuna basılıp
dokunulmazsa round'un kendiliğinden ilerlediği an normalin ~1,2-2 katına
çıkıyor, bu süre boyunca `stopAudio()` hiç çağrılmadığı için ses (kaynağı
ne olursa olsun) kesintisiz sürüyor. **Kalan 4 mod (width/qwidth/boostcut/
cakisma) bu turda ÖLÇÜLMEDİ** — ama kod yolu (`cmpPreviewStopTimer`,
`app.js:7449-7574`) TÜM 8 modun PAYLAŞTIĞI TEK bir delegasyon, mod-özel bir
dal YOK (cakisma Aşama 3 HARİÇ — o zaten `setDualCut` kullanıyor, AYNI
`cmpPreviewStopTimer` sonrası davranışına (madde 3) tabi, farklı bir
zincir kurma yolu olması bu SÜRE mekanizmasını DEĞİŞTİRMİYOR). Bu yüzden
kalan 4 modun da AYNI davrandığı **YÜKSEK GÜVENLE beklenir** ama bu turda
ÇALIŞTIRILARAK doğrulanmadı — **BELİRSİZ, ölçülmedi.**

---

## SONUÇ

**Kök sebep artık KESİN, ölçüldü:** kulak butonu tıklaması
`roundFlow.captureRemainingAndClear()` ile normal otomatik-geçiş süresini
YAKALAYIP 3 saniye SONRA SIFIRDAN yeniden başlatıyor — bu, TOPLAM geri
bildirim süresini yaklaşık İKİYE KATLIYOR, ve bu ek sürenin TAMAMI boyunca
(1) `stopAudio()` hiç çağrılmadığı için "doğru şık" sesi kesintisiz çalmaya
devam ediyor, (2) kulak butonunun görsel "on" göstergesi SADECE 3. saniyede
sönüyor — yani kullanıcı görsel olarak "bitti" sanırken ses 5+ saniye DAHA
sürüyor. Bu, cihazdaki "ses karıştı, sonraki soruya taşıdı" algısını
BİREBİR açıklıyor; TEK istisna kullanıcının MANUEL olarak X'e basıp
kapatması — o yol ölçüldü ve TEMİZ.

**Düzeltme yolu (ürün kararı gerektirir, UYGULANMADI):** en doğrudan
seçenek `cmpPreviewStopTimer`'ın 3 saniyelik callback'ine (`app.js:7556`)
`audioEngine.stopAudio()` çağrısı eklemek — böylece önizleme kendi süresini
doldurunca ses HEMEN kesilir, `ensureAutoNext(remain)` normal süresiyle
(katlanmadan) devam eder. **Risk:** bu, "önizleme sesi otomatik-geçişi
DURAKLATIYOR" tasarımının bir PARÇASINI değiştirir — şu anki davranış
büyük ihtimalle "kullanıcı önizlemeyi dinlerken zorla kesilmesin" niyetiyle
YAZILMIŞ (nitekim SES DEĞİL SADECE SAYAÇ duraklatılıyor) ama `remain`'in
TAM SÜREYLE YENİDEN başlatılması (3sn'in ÜSTÜNE, kesintisiz sesle) muhtemelen
KASITSIZ bir yan etki — bunun kasıtlı mı gözden kaçma mı olduğunu netleştiren
bir kod içi not YOK. Alternatif: 3sn sonra sesi KESMEDEN sadece
`ensureAutoNext`'e SABİT KISA bir süre (ör. 1500ms varsayılan) vermek —
sesi UZATMAZ ama kullanıcının önizlemeyi hâlâ değerlendirdiği anı KESMEZ.
Hangi yönün seçileceği ÜRÜN KARARI — bu turda UYGULANMADI.

---

## Genel not

Bu tur, önceki turun ("kod okumayla kapsanıyor görünüyor") ISRARLA
yanlış olduğunu GÖSTERDİ — CLAUDE.md'nin kendi kuralı ("Ses ve DOM davranışı
kaynak koddan doğrulanamaz") burada TAM ANLAMIYLA doğrulandı. Kod okuma
`stopAudio()` çağrı NOKTALARININ VARLIĞINI doğru tespit etti ama bu
noktalara ne ZAMAN ulaşıldığını (gecikme büyüklüğünü) KAÇIRDI — sadece
ÇALIŞTIRARAK ortaya çıktı. Cihazda TEKRAR DOĞRULANMASI (npx cap sync ios +
gerçek cihazda kulak butonuna basıp ELİNİ SÜRMEDEN ~8-10 saniye beklemek)
hâlâ ÖNERİLİR — bu ölçüm headless Chromium/Playwright'ta yapıldı, iOS
WebKit'in AudioContext zamanlamasında KÜÇÜK farklar olabilir (ana mekanizma
—`captureRemainingAndClear`/`ensureAutoNext`'in JS mantığı— platform-
bağımsız olduğu için BÜYÜK bir sapma BEKLENMEZ, ama KESİN değildir).

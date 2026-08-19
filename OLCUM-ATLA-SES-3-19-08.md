# OLCUM-ATLA-SES-3-19-08

GÖREV: ÖLÇÜM (2. ve 3. bölüm). Kod yazılmadı, commit atılmadı.
G325'in reentrancy kilidi ses birikmesini ÇÖZMEDİ — Logic'in cihaz
gözlemi bu turda kaynak-kod seviyesinde DOĞRULANDI ve KÖK SEBEP
BULUNDU. Ayrıca "atlama sınırı" ürün fikri değerlendirildi.

## ÖZET — KÖK SEBEP BULUNDU (yüksek güven, canlı ölçümle KANITLANDI)

**`goToNextRoundInner()` (app.js, "Atla"nın işlediği fonksiyon)
`roundFlow.clearAutoAdvance()`'i çağırıyor ama `roundFlow.clearTimer()`'i
HİÇ ÇAĞIRMIYOR.** Parkuru telafi/sınav anonsuna TAŞIYAN son etkileşimde
(`examTookOver=true`) fonksiyon `startRound()`'u ÇAĞIRMADAN erken
dönüyor (`if (examTookOver) return;`) — bu, o ANDA aktif olan sorunun
SÜRE SAYACINI (100ms'lik `setInterval`, round-flow.js:23) YENİDEN
KURMAK için TEK fırsat olurdu (`armTimerInterval()` KENDİ İÇİNDE ÖNCEKİ
interval'i temizliyor) — ama bu fırsat KAÇIRILIYOR. Sayaç, anons
ekranı AÇIKKEN de arka planda ÇALIŞMAYA DEVAM EDİYor.

Sayaç kendi süresi (`timeSec`, örn. Frekans Bulma "kolay" 16sn) dolunca
`onTimeUp()`'ı tetikliyor. `onTimeUp()`'ın KENDİ korumasi
(`if (!roundActive || !activeQuestion) return;`) bunu ENGELLEMİYOR —
çünkü `activeQuestion` SADECE anons ekranındaki CTA/ikincil buton
TIKLANINCA `null`'a çekiliyor (app.js:3219/3237/3263/3291/3295/3348/3352
— HEPSİ buton `onclick` handler'ı, `showExamScreen()`'in KENDİSİ
DEĞİL), `roundActive` de bu geçişte HİÇ dokunulmuyor. Yani kullanıcı
anons ekranını GÖRÜP HENÜZ hiçbir butona basmamışken `onTimeUp()`'ın
guard'ı GEÇERLİ (stale) veriyle "geçer" — `stats.wrong++`,
`audioEngine.stopAudio()` (zararsız, zaten sessiz), VE KRİTİK OLARAK
`scheduleNext()` çağırıyor. `scheduleNext()` → `roundFlow.ensureAutoNext()`
YENİ bir oto-geçiş zamanlayıcısı (1500-6000ms) kuruyor — bu dolunca
`onAdvance: () => { if (!autoStopped) startRound(); }` **`startRound()`'u
DOĞRUDAN çağırıyor — G325'in `goToNextRound()` kuyruğundan TAMAMEN
BAĞIMSIZ, kilidin HİÇ GÖRMEDİĞİ bir giriş noktası.** Bu YENİ
`startRound()` → `playQuestion()` → `buildQuestionChain()` YENİ bir ses
zinciri kurup BAĞLIYOR — anons ekranı hâlâ açıkken, kullanıcı hiçbir
şey yapmamışken.

**G325'in kilidi NEDEN yetmedi (ÖLÇ 5'in cevabı):** çünkü kilit SADECE
`goToNextRound()`'u sarmalıyor — `onAdvance`'in `startRound()`'u
DOĞRUDAN çağırması TAMAMEN AYRI, kilitsiz bir yol. G325 doğru bir
sorunu (üst üste binen `goToNextRound()` çağrıları) doğru çözdü ama
BU sorun (unutulmuş süre sayacı → onTimeUp → scheduleNext → onAdvance
→ startRound) FARKLI bir kod yolundan geliyor.

## Kanıt (canlı Playwright ölçümü, `setInterval`/`setTimeout`/`createGain`
`window.*` prototip PATCH'leriyle — uygulama koduna DOKUNULMADI)

Frekans Bulma, "Karıştır" AÇIK (gerçek örnek dosyalar, asenkron decode
gerektiren kaynaklar), 4× Atla + 6× YANLIŞ cevap (toplam 10, telafi
anonsuna ULAŞILDI):

```
Ekran açılmadan ÖNCE kurulup HÂLÂ temizlenmemiş interval sayısı: 1
  --- kuruldu t=22397ms, delay=100ms,
      temizlendi t=38498ms (ekrandan 12210ms SONRA) ---
    at window.setInterval
    at armTimerInterval (round-flow.js:23)
    at Object.startTimer (round-flow.js:37)
    at startTimerForCurrentQuestion (app.js:6324)
    at startRound (app.js:6547)
    at goToNextRoundInner (app.js:7464)

ekrana ulaşıldıktan SONRA kurulan gain node sayısı: 5
  --- t=40123ms (ekrandan 13835ms sonra) ---
    at AudioContext.createGain
    at Object.buildQuestionChain (audio-engine.js:817)
    at playQuestion (app.js:5835)
```

Zaman çizelgesi tutarlı: interval t=38498'de kendini temizleyip
(`clearTimer()`, `onTimeUp()`'ın KENDİ İÇİNDE) `onTimeUp()`'ı
tetikliyor → `scheduleNext()` yeni bir oto-geçiş kuruyor → ~1.6sn
sonra (t=40123) `onAdvance()` → `startRound()` → YENİ ses zinciri.

## ÖLÇ 1-6 (2. bölüm)

**1. KÖK SEBEP: 3 sayısı neden? Bir kuyruk boyutu mu, sınır mı, tesadüf mü?**
ÖLÇÜLDÜ, Logic'in "3" eşiğiyle TAM ÖRTÜŞMÜYOR: bu turun Playwright
ölçümünde bug **1, 2, 3, 4 ve 5 atlamada da** (10 sorunun geri kalanı
YANLIŞ cevapla dolduruldu) AYNI ŞEKİLDE üretildi — hepsinde ~13.7-15.1sn
sonra ses başladı, hepsinde AYNI "unutulmuş interval" deseni bulundu.
**"3" SABİT bir yazılım sınırı DEĞİL** — bulunan mekanizma bir SAYAÇ/
kuyruk boyutuna DAYANMIYOR, TEK bir unutulmuş zamanlayıcıya dayanıyor.
Logic'in cihazdaki "3 güvenli/4 kırık" gözlemi muhtemelen SÜRE'ye
(zorluk kademesinin `timeSec`'i + skip/cevap aralarındaki gerçek geçen
süre) bağlı — cihazda DAHA HIZLI etkileşim + DAHA KISA `timeSec`
kademeleri "3"ü güvenli GÖSTERMİŞ olabilir, ama bu turun ölçümü
"3" sayısının kendisinin KRİTİK bir eşik OLMADIĞINI gösteriyor.
**Bu bir ÇELİŞKİ olarak AÇIKÇA işaretleniyor** — Logic'in cihaz
gözlemi (3 güvenli) ile bu Playwright ölçümü (1'de bile kırık) TAM
ÖRTÜŞMÜYOR; ikisi de KAYDEDİLDİ, hiçbiri diğerinin ÜSTÜNE yazılmadı.

**2. 4. atlamada ne farklı oluyor?**
Ölçülen veriye göre "4."de ÖZEL bir şey YOK — kök sebep HER
transitioning etkileşimde (Atla ya da cevap FARK ETMİYOR, YETER Kİ
o an aktif sorunun süre sayacı hiç iptal EDİLMEDEN parkur telafi/
sınava geçsin) aynı şekilde tetikleniyor. "4" sayısı muhtemelen
Logic'in cihazdaki GERÇEK zamanlama koşullarının (tepki süresi, ağ/
decode gecikmesi) bir YAN ÜRÜNÜ, mimari bir sınır DEĞİL.

**3. Biriken şey ne — ses zinciri mi, timer mı, promise mi?**
**Timer** (round-flow.js'in `setInterval` tabanlı soru süresi sayacı)
— "biriken" değil, TEK bir UNUTULMUŞ (temizlenmemiş) örnek. Bu timer
`onTimeUp()`'ı tetikleyip BİR ZİNCİR REAKSİYONU başlatıyor
(`scheduleNext()` → YENİ bir `setTimeout` → `onAdvance()` →
`startRound()` → YENİ ses zinciri). "Ses zinciri" SONUÇ, "promise"
(G325'in kuyruğu) bu spesifik yolda HİÇ DEVREDE DEĞİL — `onAdvance`
`goToNextRound()`'u ÇAĞIRMIYOR, DOĞRUDAN `startRound()`'u çağırıyor.

**4. Neden ~5 saniye sonra çalıyor? (bu ölçümde ~13.7-15.1sn ölçüldü)**
Gecikme = (transitioning sorunun `timeSec`'inden geriye kalan süre,
soru KAÇ SANİYE önce kurulmuşsa) + (`onTimeUp()`'ın çağırdığı
`scheduleNext()`'in süresi, tipik olarak 1500-6000ms arası, moda/
duruma göre). Logic'in cihazdaki "~5sn" ölçümü muhtemelen DAHA KISA
bir `timeSec` kademesinde (ör. "pro", 9sn) + DAHA KISA bir
`scheduleNext` gecikmesiyle tutarlı — bu turun testinde (Frekans
Bulma, Otomatik zorluk, kolay/orta kademelerde daha uzun `timeSec`)
daha uzun (~14sn) ölçüldü. **Mekanizma AYNI, gözlenen SÜRE senaryoya
göre DEĞİŞKEN** — sabit "5 saniye" bir SABİT DEĞİL, o anki sorunun
`timeSec`'ine bağlı bir DEĞİŞKEN.

**5. G325'in kilidi neden yetmedi?**
YUKARIDA cevaplandı — `onAdvance()`'in `startRound()`'u DOĞRUDAN
çağırması, G325'in `goToNextRound()` promise kuyruğunun TAMAMEN
DIŞINDA, kilitsiz bir giriş noktası. G325 KENDİ hedeflediği sorunu
(üst üste binen `goToNextRound()` çağrıları) doğru çözdü — bu turun
bulduğu, FARKLI bir kök sebep.

**6. Playwright'ta TAM BU DESENİ tekrar üret — 4 atlama, telafi ekranı,
5 saniye bekle, RMS ölç.**
YAPILDI VE AŞILDI — 4 atlama (+6 yanlış cevap, toplam 10) telafi
ekranına ULAŞTIRILDI, 20 saniye RMS izlendi (Logic'in "5sn" tahmininin
ÇOK üstünde bir pencere, geç gelen sesi KAÇIRMAMAK için). Sonuç: max
RMS 0.088-0.178 arası (SENARYOYA göre değişken), ilk duyulabilir an
13.7-15.1sn — DOĞRULANDI, KAYNAK KOD SEVİYESİNDE AÇIKLANDI (yukarıki
stack trace'ler).

## ÖLÇ 1-5 (3. bölüm — Atlama sınırı, ÜRÜN SORUSU, KOD YAZILMADI)

**1. Atlama sınırı koymak ne kadar iş? Kaç dosya, kaç satır?**
TAHMİN (kod YAZILMADI): mevcut parkur fazının kendi bir "kaç kez
atlandı" sayacı YOK (examSystem'in SADECE `examResults`/
`remedialResults` dizileri var, "parkur" fazının KENDİ bir sonuç
dizisi hiç YOK — `position`/`parkurCorrect`/`comboInParkur` SADECE
sayaç, sıra/tür bilgisi TUTMUYOR). Gerekli:
- `core/exam-system.js`: YENİ bir `parkurSkipCount` sayacı (~5-8
  satır: değişken + `resetParkur()`'da sıfırlama + `recordAnswer`'ın
  skip dalında artırma — G324/G326'nın AYNI `skipped` parametre
  deseni kullanılabilir).
- `app.js`: `goToNextRoundInner()`'ın skip dalına LİMİT kontrolü
  (~10-15 satır: limit AŞILDIYSA `challengeTick`/`recordAnswerHistoryEntry`/
  `handleExamOutcome` ÇAĞRILMADAN erken dönüş + kullanıcıya mesaj).
- Mesaj/UI (~3-5 satır, `setFeedback` benzeri MEVCUT bir mekanizma
  kullanılabilir).
- **Test:** exam-system.test.mjs'e ~5-8 YENİ test, e2e'ye ~2-3 YENİ
  test.
Toplam tahmini: **2-3 dosya, ~25-40 satır üretim kodu + ~8-12 test.**
Küçük-orta ölçekli — kök sebep düzeltmesinden (bkz. altta) DAHA BÜYÜK
bir iş, çünkü kök sebep düzeltmesi TEK bir eksik fonksiyon çağrısı
(`roundFlow.clearTimer()`) eklemekten ibaret olabilir (KOD YAZILMADI,
KESİN DEĞİL, bu turun kapsamı DIŞINDA — ama YAPISAL OLARAK sınır
koymaktan DAHA KÜÇÜK bir değişiklik gibi GÖRÜNÜYOR).

**2. Sınır konulursa ses birikmesi sorunu KAPANIR MI? ⚠️ KRİTİK.**
**HAYIR, KAPANMAZ — bu turun ÖLÇÜMÜ bunu AÇIKÇA gösteriyor.** Bug 1
atlamada BİLE üretildi (yukarı ÖLÇ 1). Sınır "3 atlama" olarak
konulsa bile, kullanıcı 1, 2 veya 3 atlama YAPARSA (sınırın
ALTINDA kalsa bile) hâlâ AYNI mekanizmayla (unutulmuş süre sayacı)
karşılaşabilir — SADECE bu turun testinde her denemede REPRODUCE
OLDU, ŞANSA/zamanlamaya bağlı OLABİLİR ama KESİNLİKLE "3'ün altında
GÜVENLİ" değil. **Sınır, kök sebebi ÖRTBAS EDER, ÇÖZMEZ** — task'ın
kendi endişesi ("kısıt hatanın üstünü örtmemeli") DOĞRULANDI.
Ayrıca: transitioning etkileşim SKIP OLMAK ZORUNDA bile değil — bu
turun testinde 10. (transitioning) etkileşim HER ZAMAN bir YANLIŞ
CEVAPTI (skip'ler HEP baştaydı), yine de bug oluştu — yani "atlama
sınırı" SADECE atlama davranışını kısıtlasa bile, kök sebep GERÇEK
CEVAPLARLA biten parkurlarda da tetiklenebilir (ölçülmedi ama
mekanizma buna İZİN VERİYOR — sadece transitioning sorunun süre
sayacının doğru NEDENLE iptal edilmemiş olması yeterli).

**3. Oyun mantığına uygun mu?**
- *Kullanıcı 10 soruda 3 atlama hakkıyla sıkışır mı?* ÜRÜN KARARI —
  ölçülemez, kullanıcı deneyimi tercihi. Not: "Atla" ŞU AN "yanlış
  cevap" gibi işleniyor (G214 kararı) — 4. atlamayı ENGELLEMEK, kalan
  soruları CEVAPLAMAYA ZORLAMAK anlamına gelir, bu kullanıcının
  "bilmiyorum, geç" hakkını KISITLAR — G214'ün KENDİ ruhuyla
  (atlama zaten cezalandırılıyor, XP/can etkilenmez ama sayaç
  ilerler) NE KADAR uyumlu olduğu TARTIŞMALI.
- *Boss turunda atlama zaten geçmiyor — o hak sayılmalı mı?*
  **DOĞRULANAMADI — KOD BUNU DESTEKLEMİYOR.** `#nextBtn` boss
  turlarında DA her zaman görünür/tıklanabilir (grep ile arandı,
  `.disabled`/`.hidden` bağlantısı YOK) — "Atla" boss'ta da AYNEN
  ÇALIŞIYOR, ÖZEL bir engelleme YOK. Bu ÖNCÜL (task'ın kendi
  varsayımı) **YANLIŞ** — sayı UYDURULMADI, kod DOĞRUDAN kontrol
  edildi.
- *Sınav/telafi turlarında sınır ne olmalı?* ÜRÜN KARARI — EXAM_LENGTH=4/
  REMEDIAL_LENGTH=5, "3 atlama" oranı BAMBAŞKA (parkurun 10'da 3'ü
  ile telafinin 5'te 3'ü ORANTISIZ). AYRI bir sayı GEREKİR.

**4. Sınır dolunca ne olmalı?**
ÜRÜN KARARI — İKİ seçenek ÖLÇÜLEBİLİR düzeyde:
- *Buton pasifleşsin:* `#nextBtn`'in HER MODDA "her zaman
  tıklanabilir" (idle dahil) OLAN mevcut TASARIM ilkesiyle ÇELİŞİR
  (bkz. G313'ün kendi notu) — YENİ bir istisna.
- *Mesaj çıksın (task'ın önerisi: "atlama sınırı var" de):* MEVCUT
  `setFeedback()`/`toast()` mekanizmalarıyla UYUMLU, DAHA AZ mimari
  değişiklik.

**5. Bu bir ÜRÜN kararı — kök sebebi düzeltmenin YERİNE geçer mi,
yoksa İKİSİ de mi gerekli?**
**İKİSİ DE GEREKLİ, biri diğerinin YERİNE GEÇEMEZ.** Kök sebep
(`roundFlow.clearTimer()` eksikliği) DÜZELTİLMEZSE, sınır konsa BİLE
DÜŞÜK atlama sayılarında (hatta SIFIR atlamayla, SADECE cevaplarla)
AYNI bug TEORİK OLARAK yine oluşabilir (bu turun ölçümü SADECE
"Atla"yı test etti, ama mekanizma "Atla"ya ÖZGÜ değil — HERHANGİ bir
transitioning etkileşimin süre sayacını UYGUN ŞEKİLDE iptal
ETMEMESİYLE İLGİLİ). Sınır EKLENİRSE ama kök sebep DÜZELTİLMEZSE,
kullanıcı deneyimi KISITLANIR (atlama hakkı azalır) AMA bug KALICI
OLARAK KAPANMAZ.

## SONUÇ

**Kök sebep:** `goToNextRoundInner()`'ın `roundFlow.clearTimer()`'i
çağırmaması — transitioning etkileşimde unutulan soru süresi sayacı,
anons ekranındayken kendi kendine dolup `onTimeUp()`→`scheduleNext()`
→`onAdvance()`→`startRound()` zincirini G325'in kilidinin TAMAMEN
DIŞINDAN tetikliyor.

**Düzeltme yolu (ÖNERİ, kod YAZILMADI):** `goToNextRoundInner()`'a
(muhtemelen `roundFlow.clearAutoAdvance()`'in YANINA) bir
`roundFlow.clearTimer()` çağrısı eklemek — İLK bakışta TEK satırlık,
düşük riskli bir düzeltme gibi görünüyor, ama `handleExamOutcome()`'un
DİĞER (submit-handler kaynaklı) yollarıyla TUTARLILIĞI + `onTimeUp()`'ın
KENDİ `roundActive`/`activeQuestion` guard'ının başka yerlerde de aynı
"stale" riski taşıyıp TAŞIMADIĞI AYRICA ölçülmeli (bu turun kapsamı
DIŞINDA) — AYRI bir "ÖNCE ÖLÇ SONRA UYGULA" turu ÖNERİLİR.

**Sınır fikrinin değerlendirmesi:** Kök sebebi ÇÖZMEZ (ölçüldü — bug
1 atlamada bile üretildi), "Boss'ta atlama zaten geçmiyor" öncülü
YANLIŞ (kod doğrulandı), sınır/mesaj TASARIMI ürün kararı gerektiriyor.
**Kök sebep düzeltmesi ÖNCELİKLİ ve ZORUNLU; atlama sınırı (istenirse)
AYRI, TAMAMLAYICI bir ürün kararı olarak DÜŞÜNÜLEBİLİR ama kök sebebin
YERİNE GEÇMEZ.**

**Hangisi önerilir:** Önce kök sebep düzeltmesi (küçük, KİLİT/
DOKUNULMAYACAK'ı etkilemeyecek bir "eksik fonksiyon çağrısı ekleme"
gibi görünüyor) — AYRI bir ölçüm+uygulama turunda. Atlama sınırı
İSTENİRSE kök sebep düzeltmesinden SONRA, AYRI bir ürün kararı turunda
ele alınmalı.

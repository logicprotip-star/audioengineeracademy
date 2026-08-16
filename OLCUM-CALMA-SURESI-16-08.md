# OLCUM-CALMA-SURESI-16-08 — Soru Başına Çalma Davranışı Ölçümü

_Kapsam: SADECE ÖLÇÜM, kod YAZILMADI/DEĞİŞTİRİLMEDİ, commit atılmadı
(`git status` bu turun sonunda TEMİZ). Kaynak: `audio-engine.js`,
`source-catalog.js`, `upload.js`, `round-flow.js`, `app.js`'in ilgili
bölümleri TAM okundu. Bazı sayılar (decode süresi) GERÇEK canlı
tarayıcı ölçümüyle üretildi — tahmin edilmedi, yöntem her bölümde
açıklandı._

---

## 1) SORU BAŞINA ÇALMA SÜRESİ

**Mekanizma (tüm 12 mod için TEK, ortak):** Bir soru başladığında
(`playQuestion()` → `audioEngine.buildQuestionChain()`) kaynak
**HER ZAMAN döngüye (`loop=true`) girer** — dosyanın "doğal" uzunluğu
kadar ÇALIP DURMAZ. Çalma, kullanıcı cevap verene/`Atla`ya basana KADAR
ya da round süresi (`timeSec`/`roundDuration`) dolana kadar sürer —
**hangisi önce gelirse**. `onTimeUp()` (`app.js:3969-3989`) süre dolunca
`audioEngine.stopAudio()`'yu ÇAĞIRIYOR; her `submit*Guess()` fonksiyonu
(11/12 mod — istisna aşağıda) cevap ANINDA AYNI şeyi yapıyor.

**Sabit mi, kullanıcı durdurana kadar mı, döngüde mi?** → **Döngüde,
üst sınırı `roundDuration` olan.** Dosyanın kendi süresi (0.25–5.67sn)
ile GERÇEK duyulan süre (birkaç saniyeden `roundDuration`'a kadar)
ARASINDA doğrudan bir ilişki YOK — kısa bir dosya sadece DAHA SIK
tekrarlanıyor.

**İstisna — Frekans Çakışması (`submitCakismaGuess`):** `app.js:4873`'teki
yorum AÇIKÇA "DURDURULMAZ" diyor — bu mod cevap sonrası öncesi/sonrasını
karşılaştırmalı dinletebilmek için sesi cevap ANINDA kesmiyor (Aşama 3'ün
"öncesi/sonrasını dinle" özelliği).

**Round süresi (timeSec/roundDuration) ile çalma süresi ilişkili mi?**
**EVET — `roundDuration` çalma süresinin ÜST SINIRI.** `round-flow.js`
(SES/DOM'a hiç dokunmayan saf bir zamanlayıcı) `startTimer(seconds)` ile
kurulur, `timeLeft<=0` olunca `onTimeUp()`'ı tetikler, o da
`stopAudio()`'yu çağırır.

**Zorluk seviyesi (Z1-Z7) çalma süresini etkiliyor mu?**
**EVET, dolaylı olarak** — `timeSec` (dolayısıyla üst sınır) HER modun
kendi zorluk eğrisinden geliyor, kolaydan zora KISALIYOR. `Z1-Z7`
(ZORLUK.md'nin tanımıyla — `position=1..7`, tier adı DEĞİL) aralığında
GERÇEK `paramsForDifficultyPosition()` çağrısıyla ölçülen üst sınırlar
(saniye, mod başına):

| Mod | easy (statik) | pro (statik) | eğri AT_CAP (Z20/tavan) |
|---|---|---|---|
| Frekans Bulma | 16 | 9 | 8 |
| Kesim Noktası | 14 | 9 | 9 |
| Q Genişliği | 14 | 8 | 8 |
| Boost mu Cut mu | 16 | 9 | 9 |
| dB Seviyesi | 14 | 9 | 9 |
| Kompresör | 16 | 9 | 9 |
| Reverb | 17 | 10 | 10 |
| Saturation & Distortion | 16 | 9 | 9 |
| Pan Konumu | 14 | 8 | 8 |
| Stereo Genişlik | 14 | 8 | 8 |
| Frekans Çakışması | 18 | 9 | 7.5 |
| Tonal Denge | 26 | 15 | 13 |

**Tonal Denge açık ara en uzun** (26sn easy'de) — modun kendi yorumu
(`tonal-denge.js:154`) bunu KASITLI olarak açıklıyor: görev "TEK bir
tıklama değil", çok-kaydırıcılı bir düzeltme. **Frekans Çakışması eğride
en kısaya iniyor** (7.5sn tavanda). **Genel aralık: ~7.5–26 saniye**,
çoğu mod 8–18sn bandında kümeleniyor.

---

## 2) DÖNGÜ DAVRANIŞI

**Kaynak dosya bitince ne oluyor?** SUSMUYOR, BAŞA da "atlamıyor" gibi
görünmüyor — `AudioBufferSourceNode.loop=true` Web Audio spesifikasyonunun
KENDİ mekanizmasıyla ÖRNEK-HASSAS (sample-accurate) bir şekilde baştan
devam ediyor, JS tarafında HİÇBİR "bitti, yeniden başlat" kodu YOK
(`audio-engine.js:buildNoiseSource`/`buildSampleSource`/`upload.js:
getSourceNode` — üçü de `X.loop = true` satırını taşıyor, başka hiçbir
yerde YOK).

**`AudioBufferSourceNode.loop` hangi modlarda kullanılıyor?**
**HEPSİNDE, istisnasız** — sentetik gürültü (pink/white, 2 saniyelik
üretilmiş buffer), gömülü örnekler (kick/snare/hihat/tom/bass/bass_alt/
guitar/vocal/groove — 9 dosyanın TAMAMI), kullanıcının yüklediği dosya
(upload) — ÜÇÜ DE `loop=true`. Sadece `saw`/`square`/`triangle` sentetik
kaynaklar FARKLI: bunlar `OscillatorNode` (periyodik dalga formu, doğası
gereği sürekli — `loop` kavramı YOK, GERÇEK bir "buffer bitişi" hiç
olmuyor).

**`loopStart`/`loopEnd` ayarlanıyor mu?** **HAYIR, HİÇBİR YERDE.** `grep`
ile doğrulandı — kod tabanında `loopStart`/`loopEnd` sıfır eşleşme.
Web Audio spesifikasyonuna göre bu, varsayılan davranışı (loopStart=0,
loopEnd=buffer.duration) bırakır — **dosyanın TAMAMI döngüye giriyor,
kısmi bir bölüm DEĞİL.**

**A/B karşılaştırmasında döngü kesintisiz mi?** **Motor'a göre İKİ FARKLI
davranış:**
- **Motor 1 (8 mod — Frekans Bulma/Kesim Noktası/Q/Boost-Cut/dB
  Seviyesi/Pan Konumu/Stereo Genişlik/Tonal Denge):** A/B düğmesi
  `setProcessed()`'i çağırır — kaynak/filtre grafiği **HİÇ yeniden
  kurulmaz**, sadece kuru/işlenmiş paralel yolların (`dryGain`/`wetGain`)
  kazancı ~50ms'lik bir crossfade ile geçer. **GERÇEKTEN kesintisiz** —
  aynı, sürekli çalan kaynak, sadece hangi yolun duyulduğu değişiyor.
- **Motor 2 (Kompresör/Reverb/Saturation & Distortion — A/B/C):** HER
  basış (ya da 2 saniyelik otomatik döngü) `buildQuestionChain()`'i
  **YENİDEN çağırıyor** — ses **BAŞTAN başlıyor** (kesintili). Kodun
  kendi yorumu (`app.js:5301`) bunu AÇIKÇA kabul ediyor: *"A/B geçişinin
  kesintisiz bypass olmayışı (ses baştan başlıyor) burada ÇÖZÜLMEDİ,
  ayrı bir iş."* Otomatik A/B/C döngüsü (`cycleThreeWayPreview`,
  `app.js:5207-5219`) da AYNI şekilde — kendi yorumu: *"döngü HER ZAMAN
  sıradaki harfi SIFIRDAN çalar... duraklatılmış bir harf varsa bile
  döngü onu ATLAMAZ/DEVAM ETTİRMEZ."* **İstisna:** AYNI harfe (değişmeden)
  tekrar basmak DURAKLATIR/DEVAM ETTİRİR (offset saklanır) — ama bu
  SADECE manuel "aynı karta iki kez bas" senaryosu, otomatik döngüyü
  KAPSAMAZ.

---

## 3) BAŞLANGIÇ NOKTASI

**Her soruda dosyanın başından mı, rastgele bir noktadan mı?**
**Varsayılan: HER ZAMAN baştan (offset 0).** `buildQuestionChain()`
normal round başlangıcında `previewOffsetSec` parametresini HİÇ
GEÇMİYOR (`app.js:5153`, `playQuestion()`) — varsayılan değer (`0`)
kullanılıyor. **İSTİSNA: Stereo Genişlik.**

**`pickPlaybackOffset()` dışında offset kullanan mod var mı?**
**HAYIR — sadece Stereo Genişlik.** `startRound()` (`app.js:5596-5598`)
SADECE `mode.MODE_ID === "stereo-genislik"` iken
`uploadManager.seekTo(mode.pickPlaybackOffset(...))` çağırıyor — dosyanın
enerjili/rastgele bir noktasına atlıyor (sessiz bir bölüme denk gelmesin
diye). Diğer 11 modun HİÇBİRİ bu fonksiyonu çağırmıyor/kendi offset
mantığı yok.

**Aynı soruda tekrar dinlenince aynı yerden mi başlıyor?**
Kaynak tipine göre değişiyor:
- **Gömülü örnek (kick/snare/vocal/vb.), normal "Tekrar Çal":**
  `stopAudio()` ses motorunu durdurur ama **mantıksal pozisyonu
  SIFIRLAMAZ** — ama bir SONRAKİ `playQuestion()` çağrısı YİNE
  `previewOffsetSec=0` ile `buildQuestionChain()`'i çağırdığı için
  (bu değer hiçbir yerde saklanıp geri verilmiyor normal akışta) **her
  "Tekrar Çal" fiilen BAŞTAN başlıyor** (0'dan) — "kaldığı yerden devam"
  SADECE Motor 2'nin kart-üstü pause/resume'unda var (madde 2'deki
  `threeWayPreviewOffsets` mekanizması), normal oyun akışında YOK.
- **Kullanıcının yüklediği dosya (upload), normal round akışı:**
  `uploadManager`'ın offset'i **SEANS BOYUNCA KALICI** — `startFromZero()`
  SADECE "Oyunu Başlat"/"Tekrar Oyna"da (yeni SEANS) çağrılıyor, tur
  başına DEĞİL. Yani aynı dosya arka arkaya birden fazla soruda
  kullanılırsa (rastgele kaynak seçimi/"Karıştır" ile), offset bir
  turdan diğerine **KALDIĞI YERDEN DEVAM EDER** — Stereo Genişlik hariç
  (o her round'da `seekTo()` ile YENİ bir rastgele noktaya atlıyor).

---

## 4) DOSYA UZUNLUĞU KISITLARI

**Mevcut kaynaklar — gerçek `ffprobe` ölçümü (tahmin değil):**

| Dosya | Süre | Boyut | Bit hızı |
|---|---|---|---|
| hihat.m4a | 0.25s | 6.7 KB | 215 kbps |
| kick.m4a | 0.75s | 13.9 KB | 152 kbps |
| snare.m4a | 0.75s | 14.8 KB | 162 kbps |
| tom.m4a | 1.28s | 22.9 KB | 146 kbps |
| bass_alt.m4a | 1.80s | 40.5 KB | 184 kbps |
| acoustic_guitar.m4a | 2.50s | 51.1 KB | 168 kbps |
| bass.m4a | 3.00s | 52.3 KB | 143 kbps |
| groove_090.m4a | 5.33s | 110.6 KB | 170 kbps |
| vocal.m4a | 5.67s | 129.8 KB | 187 kbps |

Hepsi mono, 44.1 kHz, AAC. **Toplam: 9 dosya, 442 KB (0.43 MB).**

**"0.25–5.67 sn" bir varsayıma mı dayanıyor, tesadüf mü?**
**KARIŞIK — bir dosyada AÇIK kanıt var, diğerlerinde YOK:**
- **`groove_090.m4a` (5.332993s) — GERÇEK, ÖLÇÜLEBİLİR bar-hizalama
  kanıtı:** 90 BPM'de 1 bar = 2.6667s, 2 bar = 5.3333s. Ölçülen süre
  bundan sadece **0.34ms** sapıyor — bu, AAC'nin 1024-örnekli çerçeve
  kuantalamasıyla (23.22ms/çerçeve @ 44.1kHz) TUTARLI bir yuvarlama
  farkı. Bu dosya KASITLI olarak 2 bar'a kırpılmış, tesadüf değil.
- **Diğer 8 dosya (tek-vuruş/tek-nota/kısa faz):** BPM'e göre bir
  hizalama YOK (zaten loop olarak TASARLANMADILAR — kick/snare/hihat/tom
  birer vuruş, bass/bass_alt/guitar birer nota, vocal kısa bir fraz) —
  süreleri muhtemelen "sesin doğal decay'i nerede bitiyor" sorusuna
  bağlı, bir hedef-süre HESABI olduğuna dair kanıt BULUNAMADI.

**Daha uzun dosya (12-25 sn) kullanılırsa:**

- **Bellek etkisi:** `sampleBufferCache` (audio-engine.js:667) her
  path'i **SEANS BOYUNCA, SADECE BİR KEZ** decode edip Float32
  AudioBuffer olarak önbelleğe alıyor (silinmez, context yeniden
  kurulana kadar). Mevcut 9 dosyanın TOPLAM decode edilmiş boyutu
  (mono float32: süre×44100×4 bayt) **~3.76 MB**. 8 dosya × 18.5sn
  ortalama (12-25 aralığının ortası) olursa: **~26.1 MB** — **~7×
  artış**. Mutlak olarak hâlâ küçük (modern cihazlarda onlarca MB
  sorun değil) ama kullanıcı SEANS içinde 8 kaynağın HEPSİNİ
  kullanırsa (Karıştır ile olası) bu kalıcı olarak RAM'de kalır.
- **Döngü davranışı değişir mi?** **HAYIR, mekanizma AYNI kalır**
  (`loop=true`, tüm dosya) — ama PRATİKTE daha az duyulur hale gelir:
  `roundDuration` üst sınırı (7.5–26sn) 12-25sn'lik bir dosyanın
  SÜRESİNE YAKLAŞIYOR/kimi zaman ALTINDA kalıyor — yani **döngü NOKTASI
  bazı sorularda HİÇ duyulmeyebilir** (dosya süresi round süresini
  aşarsa bir kez bile tam turunu tamamlamadan `stopAudio()` çağrılır).
  Mevcut KISA dosyalarda (0.25-5.67sn) döngü NOKTASI her zaman en az
  birkaç kez duyulur (bkz. aşağıki madde). Bu bir DEĞİŞİM — döngü
  davranışının KENDİSİ değil, ne sıklıkla DUYULDUĞU.
- **Herhangi bir mod bozulur mu?** Koddan görülebilen KESİN bir çökme/
  hata riski YOK — mekanizma süre-bağımsız (loop, offset, stopAudio
  hepsi süre parametresi almıyor, buffer.duration'ı runtime'da okuyor).
  **TEK somut risk:** Motor 2'nin (Kompresör/Reverb/Saturation &
  Distortion) A/B/C önizlemesi HER basışta baştan başlıyor (madde 2) —
  12-25sn'lik bir dosyada kullanıcı "B'ye bas → dinle → A'ya dön" yapıp
  HER seferinde dosyanın başındaki birkaç saniyeyi duyacak, dosyanın
  GERİ KALANINI (round süresi kısaysa) HİÇ duymayabilir — kısa
  dosyalarda bu sorun YOKTU (birkaç saniyede bir tekrar zaten
  "baştan" oluyordu, fark az hissediliyordu).
- **Decode süresi soru geçişini yavaşlatır mı?** **GERÇEK canlı
  tarayıcı ölçümü yapıldı** (masaüstü Chrome, `decodeAudioData` ile,
  mevcut 5 dosya + `ffmpeg` ile üretilen 20sn'lik 160kbps bir test
  dosyası):

  | Dosya | Süre | fetch | decode | toplam |
  |---|---|---|---|---|
  | hihat.m4a | 0.25s | 1.8ms | 6.5ms | 8.3ms |
  | kick.m4a | 0.75s | 4.8ms | 4.7ms | 9.5ms |
  | groove_090.m4a | 5.33s | 5.7ms | 11.3ms | 17.0ms |
  | vocal.m4a | 5.67s | 2.9ms | 10.5ms | 13.4ms |
  | **test (20s, 160kbps)** | 19.93s | 6.5ms | **39.4ms** | 45.9ms |

  Ölçek ~doğrusal (~2ms decode / saniye ses). **20sn'lik bir dosya
  MASAÜSTÜ Chrome'da 40ms'nin altında decode ediliyor** — bu, GERÇEK
  bir cihazda (WKWebView, daha zayıf CPU) 5-10× yavaş olsa bile
  200-400ms mertebesinde kalır, GÖZLE GÖRÜLÜR ama "donma" seviyesinde
  değil. **ÖNEMLİ:** bu gecikme SADECE bir dosyanın SEANSTA İLK
  kullanımında olur (`sampleBufferCache` sonrasını anında döner) —
  "Karıştır" ile kaynak sık değişse bile HER kaynak seans başına SADECE
  BİR KEZ bu maliyeti öder. **Dürüstlük notu:** bu GERÇEK bir cihaz
  ölçümü DEĞİL, masaüstü Chrome ölçümü + orantısal tahmin — gerçek
  iOS/Android cihazda doğrulanmadı.

**Uygulama bundle boyutuna etkisi (AAC 160kbps varsayımıyla):**

| Senaryo | Hesap | Toplam |
|---|---|---|
| **Şu an (9 dosya, gerçek boyut)** | ölçüldü | **442 KB** |
| 8 dosya × 12s @ 160kbps | 12×160/8 KB/dosya | **1.88 MB** |
| 8 dosya × 18.5s @ 160kbps (orta) | 18.5×160/8 KB/dosya | **2.89 MB** |
| 8 dosya × 25s @ 160kbps | 25×160/8 KB/dosya | **3.91 MB** |

Şu anki toplam uygulama `www/` klasörü **2.4 MB** — 8 yeni dosya en kötü
durumda (25sn × 8) `www/`'yi kabaca **+3.9 MB** büyütür (~2.4MB → ~6.3MB
mertebesi, ses klasörünün kendisi hariç geri kalan her şey sabit
kalırsa). Bu, bir mobil uygulama için KÜÇÜK bir artış (App Store'un
kendi indirme boyutu sınırları çok daha yüksek) — bundle boyutu bu
değişiklik için PRATİK bir engel değil.

---

## 5) TRANSIENT GEREKTİREN MODLAR

**`requireTransient` bayrağı hangi modlarda var?** **SADECE Kompresör**
(`kompresor.js:280`: `compatibleSourceIds({ requireTransient: true })`).
`grep` ile doğrulandı — kod tabanında başka HİÇBİR çağrı yok.

**Ne yapıyor?** `source-catalog.js:150-154`'teki `compatibleSourceIds()`
`requireTransient:true` iken SADECE `noTransient:true` işaretli
kaynakları (bugün: `pink`, `white` — pembe/beyaz gürültü) DIŞLIYOR.
Diğer TÜM kaynaklar (gömülü örnekler + upload + saw/square/triangle)
listede KALIYOR — yani "transient gerektiren" aslında "gürültüyü
hariç tutan" anlamına geliyor, kaynağın GERÇEKTEN ne kadar keskin bir
atağı olduğunu ÖLÇMÜYOR/kontrol ETMİYOR (ör. `triangle` sentetik dalga
formu da "transient var" sayılıyor, oysa yumuşak bir dalga formu).

**Reverb/Saturation & Distortion'da nasıl?** İkisi de `requireTransient`
KULLANMIYOR — Reverb `only:[...]` (ELLE seçilmiş, guitar/vocal/snare/
groove/upload) ile zaten gürültüyü dışlıyor (farklı mekanizma, AYNI
sonuç); Saturation & Distortion `compatibleSourceIds()`'i PARAMETRESİZ
çağırıyor, gürültü DAHİL TÜM kaynaklar açık.

**Uzun bir döngü dosyası (davul loop gibi) transient gerektiren modlarda
düzgün çalışır mı?** Koddan görülebildiği kadarıyla **EVET, mekanizma
sorunsuz çalışır** — `requireTransient` sadece HANGİ kaynakların
SEÇİLEBİLİR olduğunu belirliyor, seçilen kaynağın SÜRESİYLE hiç
ilgilenmiyor. `groove_090.m4a` (5.33sn, davul döngüsü) zaten BUGÜN
Kompresör'de kullanılabilir bir kaynak — 12-25sn'lik bir versiyonu da
AYNI şekilde çalışır, kod tarafında bir SÜRE kontrolü/kısıtı YOK.

**Kick gibi tek vuruşluk bir kaynağın 25 saniyelik çok-vuruşlu hâlini
kullanmak bu modları etkiler mi?** Bu, GERÇEK bir DAVRANIŞ değişimi
olurdu ama OLUMLU yönde: **şu anki 0.75sn'lik kick, `loop=true` ile
saniyede ~1.3 kez RETRIGGER ediliyor** (round süresi boyunca, 8-16sn
tipik) — yani mevcut hâliyle bile kick TEK bir vuruş DEĞİL, ARKA ARKAYA
tekrarlanan bir vuruş dizisi olarak duyuluyor (loop noktasında muhtemel
bir "tık" riskiyle birlikte, aşağıya bkz.). 25 saniyelik ÇOK-VURUŞLU bir
kick döngüsü (gerçek bir davul partisyonu gibi) bu retrigger deseni
YERİNE DOĞAL, müzikal bir ritim sunar — kompresyonun (transient'i
"ezmesi") duyulabilirliği muhtemelen ARTAR, azalmaz (gerçek bir groove
üzerinde kompresyon farkı, izole/retrigger edilen tek bir vuruştan DAHA
kolay ayırt edilir — bu KULAKLA doğrulanmadı, mantıksal bir çıkarım).

---

## 6) ÖNERİ (ölçümlere dayanarak, ürün kararı DEĞİL — sadece veri)

**Mevcut davranışın en somut bulgusu:** `loop=true` + `loopStart`/
`loopEnd` YOK + offset her zaman 0'dan başlıyor demek, KISA dosyalarda
(0.25-5.67sn) kullanıcı aynı birkaç saniyeyi ROUND SÜRESİ boyunca (8-26sn)
**defalarca** duyuyor — hihat gibi en kısa dosyada bu saniyede ~4 kez
retrigger demek. Bu, "gerçek bir mix bağlamı" hissinden UZAK.

**Süre önerisi:** Ölçülen `roundDuration` aralığı (~7.5-26sn, çoğu
mod 8-18sn) ile karşılaştırıldığında, **12-25sn'lik bir kaynak
round süresine YAKIN/EŞİT ya da ondan UZUN** olur — yani döngü noktası
ya HİÇ duyulmaz (dosya round'dan uzunsa) ya da EN FAZLA bir-iki kez
duyulur (dosya round'a yakınsa). Bu, mevcut "saniyede defalarca
retrigger" durumuna göre çok daha DOĞAL bir dinleme deneyimi olur —
**12-18sn aralığı** (görev başına en uzun `roundDuration`'ların [Tonal
Denge hariç, o zaten kendi kategorisinde] çoğunun ÜSTÜNDE kalıp döngü
noktasının PRATİKTE nadiren duyulacağı bir bant) makul bir hedef
gibi görünüyor — **25sn'e çıkmak ek bir fayda sağlamayabilir** (zaten
en uzun round süresi olan Tonal Denge'nin easy'si bile 26sn, 25sn'lik
bir dosya o modda bile döngüyü NEREDEYSE hiç göstermez).

**Mod grubu bazında farklı uzunluk gerekir mi?** Ölçülen `timeSec`
tablosuna göre (madde 1) EVET, teorik olarak gerekçelendirilebilir —
Frekans Çakışması'nın eğri-tavanı (7.5sn) ile Tonal Denge'nin easy'si
(26sn) arasında ~3.5× fark var. Ama PRATİKTE 9 kaynağın 4'ü (drums grubu:
kick/snare/hihat/tom + groove) ve 4'ü (instruments: bass/bass_alt/
guitar/vocal) TÜM 12 modda ORTAK kullanılıyor (kaynak seçimi moda değil
KULLANICIYA bağlı, `source-catalog.js` TEK bir paylaşılan liste) — mod
başına AYRI dosya seti YOK, olamaz da (mimari böyle kurulmamış, bu
BAŞLI BAŞINA ayrı bir mühendislik kararı gerektirir). Bu yüzden PRATİK
öneri: **tek bir orta-nokta uzunluk grubu** (ör. tüm 8 dosya 12-18sn
bandında) — en uzun round'da (Tonal Denge) bile makul, en kısa round'da
(Frekans Çakışması) fazlasıyla yeterli.

**Döngüye ihtiyaç kalır mı?** **EVET, mimari GEREKTİRİYOR** — round
süresi (7.5-26sn) bazı dosyalardan (12-18sn hedefse) UZUN olabilir,
`loop=true` kaldırılırsa dosya round bitmeden SESSİZLİĞE düşer (mevcut
kodda bunu ele alan bir "sessizlik sonrası ne olur" mantığı YOK — bu
GERÇEK bir regresyon riski olurdu, kod DEĞİŞTİRİLMEDEN böyle
bırakılmamalı).

**Kesim noktası nasıl seçilmeli?** Ölçülen `groove_090.m4a` örneği
(bar-hizalı, 2 bar @ 90 BPM) İYİ bir emsal — müzikal/ritmik kaynaklar
için **bar sınırı** (1, 2 ya da 4 bar) doğal bir seçim, döngü noktası
müzikal olarak "doğru" hissettirir. Bar kavramı olmayan kaynaklar için
(vokal frazı, tek nota gibi) **sıfır geçişi (zero-crossing) + kısa bir
fade (birkaç ms)** loop noktasındaki olası "tık" riskini azaltır — bu,
GERÇEK bir DSP prensibi (AAC encoder'ların örnek başı/sonu "priming"
örnekleri bırakabilmesi bilinen bir durum) ama bu projede kulakla
DOĞRULANMADI, sadece genel bir mühendislik önerisi olarak not edildi.

---

## Dürüstlük notu — bu turda YAPILMAYAN/doğrulanamayan

- Gerçek bir iOS/Android cihazda decode süresi ÖLÇÜLMEDİ (masaüstü
  Chrome ölçümünden ORANTISAL çıkarım yapıldı, madde 4).
  - Loop noktasında GERÇEKTEN duyulabilir bir "tık" olup olmadığı
  KULAKLA test edilmedi (mevcut KISA dosyalarda bile) — bu ayrı bir
  dinleme turu gerektirir.
- 12-25sn'lik GERÇEK ses dosyalarının (bu turda SADECE `ffmpeg` ile
  sentetik/loop'lanmış bir test dosyası üretildi, gerçek müzikal
  içerik değil) mod başına KULAKLA nasıl duyulacağı test edilmedi.

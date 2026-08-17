# OLCUM-KALAN-17-08 — Dünkü Cihaz Turundan Kalan 3 İş + Karar Bekleyenler

_Kapsam: **SADECE ÖLÇÜM — KOD YAZILMADI, DOSYA DEĞİŞTİRİLMEDİ, COMMIT ATILMADI**
(`git status` bu turun sonunda TEMİZ, tek yeni dosya bu raporun kendisi).
Kod okuması + `git log`/`git show` ile commit kökeni + gerçek Playwright/
`OfflineAudioContext` koşuları (GERÇEK -6dBFS `groove.m4a`/9 kaynak
dosyasından RMS/peak/spektral/zamansal ölçüm) + gerçek e2e koşuları
(20× `exam-flow.spec.mjs`) kullanıldı. Ölçüm scriptleri repoya dahil
edilmedi (proje kökünde geçici `scratch_*.mjs` olarak çalıştırılıp
SİLİNDİ). `DURUM.md`'nin ÖNCEDEN doğruladığı maddeler (showSessionEnd
ölü kod — G222/DEVIR-15-08-GECE; hata analizi formatı — G227) YENİDEN
TEK TEK sıfırdan üretilmedi, spot-check ile GÜNCEL koda göre
DOĞRULANDI/güncellendi — kaynak olarak açıkça işaretlendi._

---

## A) PAN KONUMU KAYNAKLARI (+ AYNI KALIP TARAMASI)

**Ölçüm:** `www/js/modes/*.js`'de kısıtlı kaynak listesi kullanan
TÜM modlar taranıp `only`/`requireTransient` mekanizmaları tek tek
kontrol edildi:

| Mod | Mekanizma | clean_guitar dahil mi? | Durum |
|---|---|---|---|
| `pan-konumu.js:145` | `only:[pink,white,saw,square,triangle,groove,bass,guitar,vocal,upload]` | **HAYIR** | 🟡 Eksik |
| `reverb.js:257` | `only:[guitar,vocal,snare,groove,upload]` | **HAYIR** | 🟡 Eksik |
| `kompresor.js:280` | `requireTransient:true` (bayrak-bazlı, `only` DEĞİL) | **EVET (otomatik)** | ✅ Sorun yok |
| `tonal-denge.js:303` | `only:[groove,upload]` | Kapsam dışı (guitar hiç yok) | ✅ Kasıtlı, etkilenmez |
| `stereo-genislik.js:272` | `only:[upload,acoustic_guitar_stereo,clean_guitar_stereo]` | **EVET** (G259'da eklendi) | ✅ Doğru |

**Kök sebep — Pan Konumu:** `kick`/`snare`/`hihat`/`tom`'un yokluğu
**KASITLI VE BELGELİ** (`pan-konumu.js:133-142`, yorum: "Tek vuruşluk
çok kısa kaynaklar konum algısı için YETERSİZ... G43'ün AYNI gerekçesi"
— Reverb'in transient kısıtıyla AYNI aile). **Bu bir regresyon DEĞİL**
ve `bass_alt`'ın G259'da kaldırılmasıyla da İLGİSİZ — `git show 27073c7
--stat` ile doğrulandı: G259 `pan-konumu.js`'i SADECE `bass_alt`
referansını silmek için değiştirdi (4 satır), `reverb.js`'e HİÇ
dokunmadı. `clean_guitar`'ın (G259'da eklenen yeni kaynak) her iki
listeden de eksik olması bu yüzden **G259'un bir OVERSIGHT'ı** —
`pan-konumu.js` G259'da açılmıştı ama `clean_guitar` eklenmesi hiç
düşünülmemiş, `reverb.js` ise G259'da HİÇ açılmamış (dosyada
`bass_alt` zaten yoktu, değiştirilecek bir şey görülmemiş).

**Kompresör'ün neden etkilenmediği:** `compatibleSourceIds({requireTransient:true})`
`only` listesi DEĞİL, `SOURCE_GROUPS`'u otomatik filtreleyen bir
BAYRAK kullanıyor (`source-catalog.js:182`: `.filter(s => !(requireTransient
&& s.noTransient))`) — SADECE `pink`/`white` (noTransient:true)
dışlanıyor, yeni eklenen HERHANGİ bir kaynak (clean_guitar dahil)
OTOMATİK dahil oluyor, manuel liste bakımı GEREKMİYOR. `clean_guitar`'ın
kendi katalog girdisinde `noTransient` YOK — doğrulandı.

**Dosya:satır:** `www/js/modes/pan-konumu.js:145`, `www/js/modes/reverb.js:257`.
**Commit kökeni:** G259 (`27073c7`) — pan-konumu.js açıldı ama
clean_guitar eklenmedi; reverb.js hiç açılmadı.
**Düzeltme yolu:** `"clean_guitar"`'ı her iki `only` dizisine eklemek.
**İş yükü:** Önemsiz (2 satır + ilgili unit/e2e testlerin gözden
geçirilmesi — `test/reverb.test.mjs`/`test/frekans-cakismasi.test.mjs`
gibi kaynak listesini assert eden testler var mı kontrol edilmeli).
**Risk:** Düşük — sadece tamlık eksikliği, hatalı davranış yok.
**Zorluk eğrisine dokunuyor mu:** HAYIR.

---

## B) SATURATION SES SEVİYESİ — DÜZELTME YOLU + 12 MOD KARŞILAŞTIRMASI

### Düzeltme yolu

**Kök sebep (OLCUM-CIHAZ-16-08 madde C'nin tekrarı, kısa):**
`distortion.js:applyProcessing()` WaveShaperNode'a çıkış kazancı
telafisi eklemiyor; `core/eq-loudness.js`'in `matchLoudness` mekanizması
kapsamı KENDİ başlık yorumunda AÇIKÇA WaveShaperNode'u DIŞLIYOR
("DynamicsCompressorNode/WaveShaperNode/ConvolverNode... KAPSAM DIŞI").

**Telafi ne kadar olmalı — GERÇEK ölçüm (groove.m4a, tam ses zinciri,
hedef: `dry_through_shared_chain` referansı ≈ -27.9dB RMS):**

| Tip | k=0 (drive) | Gereken telafi | k=0.5 (drive) | Gereken telafi | k=1 (drive) | Gereken telafi |
|---|---|---|---|---|---|---|
| clip | -22.0dB (2.2) | **-5.9dB** | -15.3dB (8.6) | **-12.6dB** | -13.6dB (15) | **-14.3dB** |
| soft | ~-27.3dB (1.1) | ~0dB | -18.6dB (4.55) | **-9.3dB** | -16.2dB (8) | **-11.7dB** |
| tube | — | — | -25.3dB (1.85) | -2.6dB | — | — |
| tape | ~-27.9dB (0.12-0.9) | ~0dB (tüm aralıkta) | | | | |

**Sonuç — 3 soruya doğrudan cevap:**
1. **Telafi drive'a BAĞLI olmalı, SABİT bir dB DEĞİL** — clip tipinde
   k=0'da -5.9dB, k=1'de -14.3dB gerekiyor (8.4dB'lik bir ARALIK) —
   tek bir sabit sayı ya düşük drive'da az yeter (fazla düzeltme
   yapmaz) ya yüksek drive'da yetersiz kalır.
2. **4 tip FARKLI telafi gerektiriyor** — clip/soft ciddi (5.9-14.3dB
   / 0-11.7dB), tube hafif (~2.6dB), tape neredeyse gereksiz (~0dB) —
   TEK bir tip-bağımsız sabit KESİNLİKLE yanlış olur.
3. **Otomatik hesaplama mümkün AMA `eq-loudness.js`'in RBJ yöntemiyle
   DEĞİL** (o SADECE biquad filtre tipleri için tanımlı, WaveShaper'ın
   frequency/Q/gain parametresi yok) — YENİ, WaveShaper'a özel bir SAF
   fonksiyon gerekir: `buildDistortionCurve(type, drive)`'ın döndürdüğü
   1024 örneklik lookup-table'ı GERÇEK/temsili bir referans sinyale
   (ör. `eq-loudness.js`'in pink-noise-eşdeğeri mantığına paralel,
   YA DA doğrudan curve'ün kendi RMS-transfer oranını, giriş genliğinin
   VARSAYILAN bir dağılımına — ör. arcsine/sinüs modeli — göre
   hesaplayarak) uygulayıp çıkış/giriş RMS oranını ÖLÇEN bir fonksiyon.
   Bu, SAF/test edilebilir kalır (audioCtx gerekmez, `buildDistortionCurve`
   ile AYNI dosyada, AYNI desende yazılabilir) — matematiksel olarak
   `estimateChainGainDb`'nin RUHU aynı ("tahmini bir SABİT değil,
   fonksiyonun kendisinden HESAPLANAN"), ama WaveShaper'a özgü YENİ bir
   uygulama gerektirir, `eq-loudness.js`'in mevcut kodu DOĞRUDAN
   kullanılamaz (RBJ formülleri biquad'a özel).
   **Alternatif (daha basit ama daha kaba):** her tip için birkaç drive
   noktasında (ör. k=0/0.25/0.5/0.75/1) telafiyi BU turdaki gibi GERÇEK
   ölçümle bulup ARADA interpolasyon yapan sabit bir tablo — daha az
   "elegan" ama matematiksel türetmeye göre daha az risk taşır (GERÇEK
   ölçülmüş sayılar, teorik bir modelin varsayımlarına bağlı değil).
4. **Paylaşılan güvenlik compressor'ını (audio-engine.js:776-779,
   -16dB/2.2:1) sıkılaştırmak yerine, Distortion'a ÖZEL bir telafi
   gain'i EKLEMEK daha güvenli** — paylaşılan compressor'ı değiştirmek
   TÜM 12 modu etkiler (özellikle Kompresör'ün KENDİ ölçümü zaten bu
   compressor'a nadiren dokunuyor, bkz. aşağıdaki tablo — değiştirmek
   onu da etkileyebilir), distortion.js'e özel bir ek GainNode
   (`audio-engine.js:892-899`'daki "filtrelerden SONRA, localWetGain'DEN
   ÖNCE" ekleme noktasının AYNISı, `matchLoudness`'un zaten kullandığı
   yer) çok daha DAR kapsamlı/güvenli.

**Zorluk eğrisine dokunmadan çözülebilir mi:** **EVET, KESİNLİKLE.**
`DRIVE_RANGES`/`K_GAP`/`timeSec` (zorluk eğrisinin TÜM parametreleri)
WaveShaper'ın GİRİŞ tarafını (ne kadar sürülüyor) kontrol ediyor;
önerilen telafi ÇIKIŞ tarafına (sürülmüş sinyalin SONRASINA) eklenen
YENİ bir GainNode — ikisi TAMAMEN bağımsız katmanlar, telafi eklemek
zorluk/drive sayılarının TEK BİRİNE dokunmaz.

**İş yükü:** Orta — yeni SAF fonksiyon (curve-tabanlı RMS tahmini) +
`applyProcessing`'e entegrasyon + `audio-engine.js`'in wet-zincirine
bağlama noktası (matchLoudness'un AYNI deseni, muhtemelen YENİ bir
bayrak — ör. `distortionMatchLoudness` — ya da mevcut `matchLoudness`
bayrağının WaveShaper'ı da kapsayacak şekilde genişletilmesi) + 4 tip ×
birkaç drive noktasında yeniden ölçüm/kalibrasyon.
**Risk:** Orta — yeni bir ses-seviyesi mekanizması, dikkatli
regresyon testi gerektirir (mevcut 1390 unit/29 e2e testin HİÇBİRİ şu
an distortion'ın ÇIKIŞ SEVİYESİNİ assert etmiyor — YENİ testler de
gerekecek).

### 12 modun çıkışı — aynı kaynakla (groove.m4a) karşılaştırma

Referans: `dry_through_shared_chain` (hiçbir mod işlemi YOK, sadece
paylaşılan güvenlik zinciri) = **-27.9dB RMS / -9.4dB peak**.

| Mod | RMS (dB) | Peak (dB) | Referansa göre | Yorum |
|---|---|---|---|---|
| Frekans Bulma | -29.5 | -10.8 | -1.6dB | matchLoudness ÇALIŞIYOR |
| Q Genişliği | -27.8 | -9.3 | ~0dB | matchLoudness ÇALIŞIYOR |
| Boost mu Cut mu | -28.4 | -9.8 | -0.5dB | matchLoudness ÇALIŞIYOR |
| Tonal Denge | -28.1 | -9.6 | ~0dB | (matchLoudness YOK ama çok-bant düzeltme doğal olarak dengeli) |
| Kompresör | -25.6 | -11.3 | +2.3dB | beklenen (kompresör makyaj kazancı yapmaz) |
| dB Seviyesi | -26.2 | -7.9 | +1.7dB | **BY DESIGN** (dbDelta=1.8dB, modun AMACI bu) |
| Pan Konumu | -31.0 (L, pan=-26) | -12.5 | -3.1dB | **BY DESIGN** — eşit-güç pan yasası (bkz. aşağı), BUG DEĞİL |
| **Kesim Noktası** | **-42.8** (highpass 400Hz) | **-14.5** | **-14.9dB** | 🔴 **YENİ BULGU, aşağıda** |
| **Distortion (clip k=0.5)** | **-15.3** | **-4.2** | **+12.6dB** | 🔴 Bilinen bulgu (OLCUM-CIHAZ-16-08 madde C) |
| **Reverb (Hall, k=0.5)** | **-12.5** | **+1.0** | **+15.4dB, PEAK 0dBFS ÜSTÜNDE** | 🔴 **YENİ BULGU, aşağıda** |

**🔴 YENİ BULGU 1 — Kesim Noktası'nda matchLoudness GERÇEK ses
içeriğinde yetersiz kalıyor:** `kesim-noktasi.js:380`'de `matchLoudness:true`
VAR ve UYGULANDI (telafi hesaba katılarak ölçüldü) ama highpass @400Hz
groove.m4a'da HÂLÂ -42.8dB (referanstan 14.9dB düşük). **Kök sebep:**
`eq-loudness.js`'in KENDİ başlık yorumu bunu AÇIKÇA belgeliyor —
telafi **PEMBE GÜRÜLTÜ varsayımıyla** hesaplanıyor ("oktav başına EŞİT
enerji taşır... bu app'in KENDİ varsayılan kaynağı zaten pink").
GERÇEK ölçümle doğrulandı: AYNI highpass @1000Hz filtresi **pink
noise'ta SADECE -20.8dB** (referanstan ~makul bir sapma) ama **groove'da
-49.2dB** (referanstan ~21dB SAPMA) — çünkü groove.m4a bas-ağırlıklı
(kick-heavy drum loop), highpass filtre GERÇEK enerjinin ÇOĞUNU
kesiyor, pembe-gürültü modeli bunu ÖNGÖREMİYOR. **Lowpass filtreler
groove'da neredeyse HİÇ sapma göstermiyor** (200/1000/4000Hz'de hepsi
~-27.6 ile -27.9dB arası) — çünkü groove'un enerjisi zaten ALÇAK
frekansta, lowpass onu KORUYOR. **Bu, Distortion'dan FARKLI bir
kategori bulgu** — matchLoudness KODU çalışıyor, sadece MATEMATİKSEL
VARSAYIMI (pembe gürültü) gerçek/asimetrik-spektrumlu kaynaklarla
(davul döngüsü gibi) uyuşmuyor, ÖZELLİKLE highpass yönünde. **Düzeltme
yolu (bu turda uygulanmadı, sadece ölçüldü):** ya (a) `eq-loudness.js`'e
kaynağın GERÇEK spektral profilini (ör. basit bir low/high enerji
oranı) girdi olarak VEREN bir seçenek eklemek — SAF kalması için
kaynak dosyasının ÖNCEDEN hesaplanmış bir "spektral imza"sı gerekir
(yeni bir altyapı), ya da (b) sadece HIGHPASS için (asıl sapan yön)
daha KONSERVATİF/güçlü bir telafi tavanı eklemek. **Zorluk eğrisine
dokunmuyor** (aynı gerekçe: telafi çıkış katmanında).

**🔴 YENİ BULGU 2 — Reverb'in Hall tipi GERÇEK DİJİTAL KIRPMAYA
ULAŞIYOR:** 3 reverb tipi (`reverb.js:72`, room/hall/plate) k=0.5'te
(her round'un TİPİK, "aynı" pair değeri) ölçüldü:

| Tip | decaySec | RMS | Peak |
|---|---|---|---|
| Room | 0.6s | -21.9dB | -6.3dB |
| Plate | 1.45s | -16.0dB | -2.2dB |
| **Hall** | **2.4s** | **-12.5dB** | **+1.0dB (0dBFS'İ AŞIYOR)** |

**Kök sebep — BİLEREK, BELGELİ bir tasarım kararı:** `reverb.js:371`,
`convolver.normalize = false` — kod yorumu (Düzeltme 2, TUR8-OGRETIM-15-08)
bunu AÇIKÇA gerekçelendiriyor: tarayıcının OTOMATİK normalizasyonu
Room/Hall/Plate arasındaki GERÇEK enerji/decay farkını (öğretimin
KENDİSİ) EZERDİ, bu YÜZDEN kapatıldı. `wetMixAtK(k)=0.35+k*0.55`
(k=0'da bile %35 wet) — bu, `decaySec` UZADIKÇA (Hall'ün 2.4s'i,
Room'un 0.6s'inin 4 katı) un-normalize edilmiş impulse response'un
KÜMÜLATİF enerjisinin ARTMASI ile birleşince, Hall tipinde toplam
çıkış GERÇEKTEN 0dBFS'i aşıyor — bu, Distortion'ın aksine bir
"unutulmuş telafi" değil, BİLEREK kabul edilmiş bir ödünleşim (gerçek
decay/yoğunluk farkını normalize-flatten etmemek İÇİN). **AMA sonucu
(gerçek dijital clip riski, Distortion'dan bile daha büyük bir
loudness sıçraması) muhtemelen o kararın ALINDIĞI anda ÖLÇÜLMEMİŞTİ**
(TUR8-OGRETIM-15-08'in kendi notu SADECE "enerji farkının korunması"nı
konu ediyor, PEAK/clip riskini ANMIYOR) — **bu, düzeltme önerilmeyen
ama Logic'in BİLEREK yeniden onaylaması/gözden geçirmesi gereken bir
madde** (kod DEĞİŞTİRİLMEDİ, sadece BULGU raporlanıyor).

**Pan Konumu — AÇIKLIK İÇİN NOT (bug DEĞİL, doğrulandı):**
2-kanallı bir `OfflineAudioContext` ile L/R ayrı ayrı ölçüldü: pan=0
→ L=R=-30.7dB (standart eşit-güç merkez-pan kaybı, ~-3dB, TEKSTBOOK
doğru); pan=+100 → L≈-352dB (sessiz), R=-27.9dB (TAM referans);
pan=-100 → tam tersi. **Bu STANDART panning yasası, bir seviye
sapması BUG'I DEĞİL** — ilk ölçüm turunda (bu raporun taslağında)
SADECE sol kanal ölçüldüğü için pan yönünden BAĞIMSIZ görünmüştü,
düzeltilip HER İKİ kanal ölçülünce doğru davranış doğrulandı.

---

## C) MOTOR 2 DÖNGÜ TOPALLAMASI — MEKANİZMA + TAŞINABİLİRLİK

**Motor 1'in kesintisiz A/B'si (`core/audio-engine.js:817-822,912-922`):**
- **TEK bir `sourceMix` GainNode'u** (asıl kaynak — noise/sample/synth —
  ONA bağlanır), İKİ PARALEL yol: `localDryGain` (kuru, doğrudan
  `sourceMix`'ten) ve `localWetGain` (işlenmiş, mod filtrelerinden
  SONRA) — İKİSİ DE HER ZAMAN bağlı, `compressor`'a birleşiyor.
  **`setProcessed(processed)`** (`app.js`) SADECE `dryGain.gain`/
  `wetGain.gain`'i `linearRampToValueAtTime` ile `CROSSFADE_SEC`
  boyunca 0.0001↔1 arası GEÇİRİYOR — kaynak/filtre grafiği ASLA
  disconnect/reconnect edilmiyor.
- **Kaç source node:** TEK (1). **Kaç paralel yol:** İKİ (dry/wet).

**Motor 2'nin (Kompresör/Reverb/Distortion) neden farklı olduğu:**
`applyProcessing(question, {audioCtx})` HER ÇAĞRIDA SADECE
`question.previewLetter`'ın (TEK harf) node'unu kuruyor
(`kompresor.js:350-353`, `reverb.js:349-351`, `distortion.js:343-346`
— hepsi `variants.find(v => v.letter === letter)`). `cycleThreeWayPreview()`
(`app.js:5350-5362`) bu YÜZDEN her switch'te `buildQuestionChain()`'i
BAŞTAN çağırıyor (`stopAudio()` + YENİ source + YENİ filtre) — Motor
1'in "ikisi de HER ZAMAN bağlı" deseni Motor 2'de YOK, çünkü mevcut
`applyProcessing` sözleşmesi TEK bir variant'ın node'unu döndürüyor,
ÜÇÜNÜ BİRDEN değil.

**Motor 1'in deseni Motor 2'ye taşınabilir mi — EVET, mimari olarak
mümkün, gerekenler:**
1. `applyProcessing`'in (Kompresör/Reverb/Distortion) ÜÇ variant'ın
   (A/B/C) HEPSİNİN node'larını AYNI ANDA kurup dönmesi gerekir — Web
   Audio bir kaynağın BİRDEN FAZLA node'a fan-out bağlanmasını NATIF
   destekliyor (`audio-engine.js`'in KENDİ `branch` mekanizması —
   Stereo Genişlik'in G118'de kurduğu — bunun ZATEN kanıtlanmış bir
   örneği, `audio-engine.js:802-815`'teki "TEK EKLENTİ NOKTASI" notu).
2. `audio-engine.js`'e YENİ bir "N paralel wet dal, tek aktif seçici"
   mekanizması eklenmeli — Motor 1'in dryGain/wetGain'inin 3-yönlü
   genellemesi (gainA/gainB/gainC, HER ZAMAN üçü de bağlı, JS SADECE
   hangisinin 1/0.0001 olduğunu değiştiriyor).
3. `cycleThreeWayPreview()`/`toggleAB()`'nin Motor-2 dalı `buildQuestionChain()`
   ÇAĞIRMAK YERİNE bu 3 gain'i crossfade etmeli (Motor 1'in
   `setProcessed()`'ının BİREBİR aynısı, 3-yönlü).
4. **Sonuç — "topallama" sorunu KÖKTEN çözülür, sadece HAFİFLEMEZ:**
   kaynak (sample-tabanlı bir source ise) SADECE BİR KEZ, round
   başında kurulur ve `loop=true` ile DOĞAL akışında devam eder —
   "her switch'te offset=0'a dön" sorunu YAPISAL OLARAK ORTADAN
   KALKAR (offset devri/korunması İCAT ETMEYE bile gerek yok, kaynak
   zaten HİÇ durmuyor).

**Otomatik döngü ile şık geçişi çakışıyor mu:** EVET, AYNI fonksiyonu
(`cycleThreeWayPreview()`) paylaşıyorlar — `abLoopTimer=setInterval(toggleAB,2000)`
(otomatik) VE kartın kendi tıklaması (manuel) İKİSİ DE bu fonksiyonu
çağırıyor. Önerilen taşıma İKİSİNİ DE aynı anda düzeltir, ayrı bir iş
gerekmez.

**Yeni kaynakların 1.5ms fade'i etkiliyor mu:** HAYIR/ihmal
edilebilir — OLCUM-CIHAZ-16-08'de zaten ölçülmüştü, 50ms'lik gain
rampası (mevcut kod) ve önerilen taşımanın YOK ETTİĞİ "her switch'te
yeniden kurulma" ZATEN 1.5ms'ten kat kat büyük etkiler; taşıma
sonrası switch'ler artık HİÇ yeniden kurulma İÇERMEYECEĞİ için bu
soru fiilen ANLAMSIZLAŞIR (sadece round'un EN BAŞINDA, bir kez).

**Alternatif (taşıma yapılmazsa) — pozisyon korunması (offset devri):**
`buildQuestionChain`'e HER switch'te `currentPreview.startedAt`'tan
hesaplanan bir offset GEÇMEK (uploadManager'ın `pausePreview()`/G151
deseninin AYNISI, ŞU AN SADECE "aynı harfe TEKRAR basma" senaryosunda
var) — Motor 1'in kadar TEMİZ değil (hâlâ HER switch'te yeniden kurma/
50ms ramp var) ama "her zaman offset 0" sorununu çözer, DAHA KÜÇÜK bir
değişiklik (`cycleThreeWayPreview()`'a birkaç satır, `threeWayPreviewOffsets`
BENZERİ bir "son bilinen pozisyon" takibi).

**İş yükü:** TAM taşıma (Motor 1 deseni) — **Yüksek**: 3 mod dosyası
(`applyProcessing` yeniden yazımı) + `audio-engine.js`'in çekirdek
zincir kurma mantığına YENİ bir kod yolu + `threeWayPreviewOffsets`/
pause-resume mantığının BASİTLEŞTİRİLMESİ (artık gereksiz hale
gelebilir, ayrıca test edilmeli) + Kompresör/Reverb'in İÇSEL DURUMU
(compressor'ın gain-reduction zarfı, convolver'ın kuyruk enerjisi) 3
KOPYASI SÜREKLİ paralel çalışacağı için CPU/kaynak kullanımı 3 kat
artar (özellikle Reverb'in ConvolverNode'u — 3 eşzamanlı convolver
eski cihazlarda GERÇEK bir kaynak sorunu olabilir, BU TURDA ölçülmedi,
BELİRSİZ).
**Kısmi çözüm (offset devri)** — **Düşük-Orta**: tek fonksiyona
(`cycleThreeWayPreview`) birkaç satır + offset takip değişkeni.
**Risk:** Tam taşıma YÜKSEK (yeni graf topolojisi, geniş regresyon
yüzeyi, Motor 2'nin PAUSE/resume/`threeWayPreviewOffsets`
mekanizmasına dokunur). Kısmi çözüm DÜŞÜK (mevcut mekanizmaya ek,
geri alınabilir).
**Zorluk eğrisine dokunuyor mu:** HAYIR (her ikisi de ses-oynatma
mekanizması, `DIFFICULTY`/`K_GAP`/zorluk parametrelerine dokunmaz).

---

## D) FREKANS ÇAKIŞMASI ÇİFTLERİ — TÜM ÇİFTLER + YENİ ADAYLAR

**Yöntem:** 9 mono örnek kaynağın (kick/snare/hihat/tom/groove/bass/
guitar/clean_guitar/vocal) HER İKİLİSİ (C(9,2)=36 çift) için: (a)
spektral — 4096-nokta FFT, en yüksek-enerji pencere, %70 kümülatif
enerji bandı (OLCUM-KAYNAK-16-08'in -15dB eşik yönteminin bir
YÜZDELİK-tabanlı analoğu); (b) zamansal — 20ms pencereli RMS zarfı ile
onset tespiti, en-yakın-eşleşme ortalama farkı (OLCUM-CIHAZ-16-08'in
AYNI yöntemi, genişletildi).

### Mevcut 3 çift

| Çift | Spektral örtüşme | Zamansal ort. fark | Değerlendirme |
|---|---|---|---|
| **kick-bas** | 32Hz (43-75 vs 11-151) | **52ms** | ✅ İyi çalışıyor, HER İKİ eksende de güçlü |
| **snare-gitar** | 11Hz (140-398 vs 161-172, ÇOK DAR kesişim) | **324ms** | 🔴 ZAYIF — HER İKİ eksende de zayıf, ölçüldüğü gibi |
| **vokal-gitar** | 0Hz (161-172 vs 624-1023, KESİŞMİYOR) | 865ms | 🔴 ZAYIF — spektral kesişim SIFIR, zamansal da kötü |

**⚠️ vocal-içeren TÜM çiftler ayrıca işaretlendi (aşağıya bkz.) —
vocal.m4a eski/yenilenmemiş dosya.**

### Tüm 36 çift — zamansal sıralama (en iyiden en kötüye, ilk 12)

| Sıra | Çift | Zamansal ort. fark | Spektral örtüşme |
|---|---|---|---|
| 1 | **snare-hihat** | **28ms** | **258Hz** (140-398 vs 97-12769) |
| 2 | kick-bas (mevcut) | 52ms | 32Hz |
| 3 | tom-groove | 93.3ms | 0Hz |
| 4 | kick-groove | 98ms | 32Hz |
| 5 | kick-hihat | 96ms | 0Hz |
| 6 | guitar-clean_guitar | 82.1ms | 0Hz |
| 7 | hihat-groove | 143.2ms | 0Hz |
| 8 | tom-bass | 146.7ms | 11Hz |
| 9 | hihat-clean_guitar | 148.4ms | 356Hz |
| 10 | groove-clean_guitar | 170.6ms | 0Hz |
| 11 | groove-bass | 172.9ms | 32Hz |
| 12 | hihat-bass | 186.3ms | 54Hz |

*(Tam 36 çiftin ham verisi ölçüldü, en pedagojik-anlamlı olanlar
seçildi — hihat/vocal gibi bazı çiftler frekans-çakışması öğretimi
açısından anlamsız kombinasyonlar, ör. kick-hihat spektral olarak
KESİNLİKLE çakışmıyor, sadece zamansal yakınlık göstermeleri tek
başına yeterli DEĞİL.)*

**🏆 EN GÜÇLÜ YENİ ADAY: snare-hihat** — HEM en iyi zamansal örtüşme
(28ms, mevcut en iyi çiftten bile 2× daha sıkı) HEM ANLAMLI spektral
örtüşme (258Hz, snare'in gövde/tel bölgesi ile hihat'in alt ucu) —
GERÇEK bir mix problemi (snare/hihat "boxiness" çakışması, 150-400Hz
bandında EQ carving gerektiren yaygın bir pratik). **Önerilen 4. çift
adayı.**

**Diğer makul adaylar:** `tom-bass` (spektral zayıf ama zamansal iyi,
kick-bas'a benzer bir "alt-uç çakışması" dersi verebilir), `hihat-clean_guitar`
(spektral en güçlü ikinci, zamansal orta).

**⚠️ vocal içeren çiftler — TÜMÜ ayrı işaretlendi:** 8 vocal-çifti
ölçüldü, HİÇBİRİ 600ms altı zamansal örtüşme GÖSTERMEDİ (en iyisi
`bass-vocal`, 645ms) — `vocal.m4a`'nın diğer 8 kaynaktan FARKLI olarak
78 BPM'lik ORTAK ızgaraya render EDİLMEMİŞ olması (eski dosya, G259
kapsamı dışı, OLCUM-KAYNAK-16-08.md madde 3'te zaten AÇIK madde olarak
işaretli) bu sonucu AÇIKLIYOR — vocal YENİLENMEDEN vocal-içeren HİÇBİR
çift zamansal olarak güvenilir ölçülemez/kurulamaz.

**Dosya:satır:** `www/js/core/source-catalog.js:118-131` (SOURCE_PAIRS).
**Düzeltme yolu:** (a) `snare-hihat`'ı 4. çift olarak eklemek (yeni
region ölçümü + `frekans-cakismasi.js`'e entegrasyon gerekir, mevcut
3-çiftlik desenle AYNI); (b) `snare-gitar`'ı DEĞİŞTİRMEK/kaldırmak
(ürün kararı — mevcut kullanıcı verisi/alışkanlığı varsa risk); (c)
vocal.m4a yenilenince TÜM vocal-çiftleri yeniden ölçülmeli.
**İş yükü:** Yeni çift eklemek küçük-orta (region ölçümü zaten
YÖNTEMİ kanıtlanmış, sadece yeni bir çift için tekrarlanır). Mevcut
çifti değiştirmek/kaldırmak ürün kararı gerektirir.
**Risk:** Düşük (yeni çift eklemek) / Orta (mevcut çifti kaldırmak,
geriye dönük tutarlılık).
**Zorluk eğrisine dokunuyor mu:** HAYIR (SOURCE_PAIRS bölge/kaynak
seçimi, DIFFICULTY tablolarından bağımsız).

---

## E) KARAR BEKLEYENLER — DURUM TESPİTİ (düzeltme önerilmedi)

### E.1 — 16 koşulsuz console.log (YENİDEN, TAM SAYIM)

Önceki turun ("16") sayısı YENİDEN, satır-satır doğrulandı — **daha
kesin sonuç: 23 koşulsuz çağrı** (`console.log`+`console.warn`+
`console.error` toplamı), bunların **15'i özel olarak `console.log`**:

| Aile | console.log | console.warn | console.error | Toplam | Satırlar |
|---|---|---|---|---|---|
| `[filepicker-diag]` | 9 | 1 | 2 | 12 | 6370,6375,6379,6415,6418,6421,6453,6456,6553,6564,8818,8823 |
| `[guide-i-diag]` | 2 | 1 | 0 | 3 | 7150,7234,7241 |
| `[upload-context]` | 3 | 0 | 2 | 5 | 9790,9796,9821,9824,12821 |
| `[scroll-diag]` | 1 | 0 | 0 | 1 | 10128 |
| `[analiz]` | 0 | 1 | 1 | 2 | 10476,10997 |
| **TOPLAM** | **15** | **3** | **5** | **23** | |

Önceki "16" rakamı muhtemelen SADECE `console.log`'u SAYMIŞ ama
`[scroll-diag]`'ın çok-satırlı `console.log(` çağrısını (10128,
argüman STRING'İ 10129'da) KAÇIRMIŞ ya da `console.error`'ları hariç
tutmuş olabilir — **kesin/GÜNCEL sayı 23 (toplam) / 15 (sadece log)**,
bu turda satır satır YENİDEN sayıldı.
**Hiçbiri DEV_MODE'a bağlı DEĞİL**, hepsi normal kullanım akışında
(dosya seçme, "i" butonu, upload, sheet kapatma, analiz worker hatası)
GERÇEK kullanıcıda da çalışır. **Risk düşük** (hassas veri yok, Apple
incelemesini etkilemez) — SADECE `build-flags.js`'in "TEK bayrak"
belge iddiasıyla TUTARSIZ (AJAN-DENETIM-16-08.md madde F.1, önceki
turda da doğrulanmıştı).

### E.2 — `proPurchased` arka kapısı (7-tık → simulatePro)

**HÂLÂ DURUYOR, DEĞİŞMEDİ.** `app.js:8781-8795` — `#versionRow`'a 7
tıkla `devFlags.unlocked=true` → gizli panel açılır → `#devProSwitch`
`devFlags.simulatePro`'yu toggle eder → `isUserPro()` (`app.js:1216-1218`,
`return realPro || devFlags.simulatePro`) HER YERDE (paywall/can/
oturum sınırı/12 mod kilidi) true döner → `storage.saveDevFlags()` ile
KALICI localStorage'a yazılır. Hiçbir DEV_MODE bağımlılığı YOK — kod
İNCELEMESİ (AJAN-DENETIM madde F.4) ile BİREBİR AYNI, hiçbir commit
bunu değiştirmemiş.

### E.3 — `showSessionEnd()` ölü kod

**Zaten TEYİT EDİLMİŞ (DEVIR-15-08-GECE.md, "showSessionEnd artık
TEYİT edilmiş ölü kod — yeni bir 'karar' değil") — bu turda GÜNCEL
koda göre YENİDEN doğrulandı, hâlâ geçerli:**
- Fonksiyon **152 satır** (`app.js:1783-1934`).
- **"lost"/"freeLimit" dalları:** `app.js:8735-8738`'in KENDİ yorumu
  ("G220'den beri showSessionEnd('lost') bir daha hiç tetiklenmiyor")
  — `openPaywallReason()` artık HER ZAMAN `true` dönüyor,
  `blockIfLivesOut()`'un `!openPaywallReason(...)` DÜŞME dalı (satır
  1575,1656,1676) YAPISAL OLARAK ölü.
- **"normal" dalı:** `finishChallenge()` (`app.js:5980`, TEK çağıran
  `app.js:5554`) Pro'da `examGateActive()` ile KASITLI bastırılıyor
  (G97, `78a8988`, gerekçeli/belgeli); ücretsizde ise `FREE_SESSION_QUESTION_LIMIT=5`
  (`paywall.js:113`, BU TURDA da GÜNCEL/değişmemiş DOĞRULANDI) +
  reklam-uzatmasıyla ULAŞILABİLECEK en fazla 10 soru, `finalizeIfGameOver()`'ın
  senkron sessionLimit kontrolü `challenge.done>=10` kontrolünden ÖNCE
  devreye giriyor (G224'te ölçülmüş, bu turda ayrıntılı YENİDEN
  izlenmedi — DURUM.md'nin kendi kaydına güvenildi, zaman kısıtı).
- **Silinirse ne kırılır:** (1) `e2e/layout-geometry.spec.mjs`'in
  "#screen-result" testi — `window.__aeaShowSessionEndForTest` (G221
  doğrulama kancası) DOĞRUDAN `showSessionEnd`'i çağırıyor, bu test
  BAŞKA bir yoldan #screen-result'a ULAŞAMAZ (normal akıştan artık
  erişilemez olduğu İÇİN bu kanca YAZILMIŞTI). (2) 4 çağrı sitesi
  (1575,1656,1676,5992) `ReferenceError` verir, KOD YOLU olarak da
  temizlenmeleri gerekir (fonksiyonu silmek TEK BAŞINA yeterli değil).
  (3) `#screen-result`'ın HTML/CSS'i (halka/rozet/XP kırılımı gibi
  TASARIM ELEMANLARI) başka HİÇBİR yerde KULLANILMIYOR — silinirse o
  DOM/CSS de ölü ağırlık olur (bu turda AYRICA ölçülmedi, BELİRSİZ).

### E.4 — `exam-flow.spec.mjs`'in sabit 200ms döngüsü — 20× koşu

**GERÇEKTEN 20 kez ÇALIŞTIRILDI** (`node --test e2e/exam-flow.spec.mjs`,
her koşu 2 test içeriyor — parkur bitişi/telafi bitişi — TOPLAM 40 test
çalıştırması):

```
RUN 1..20: PASS (hepsi)
```

**Sonuç: 20/20 koşu TEMİZ, flake GÖZLENMEDİ.** OLCUM-FLAKY-16-08.md'nin
"ikinci bir flake ADAYI" işaretlemesi bu ÖLÇÜMLE (20 gerçek koşu)
DOĞRULANAMADI — sabit 200ms bekleme bu spesifik testte (bu makinede,
bu turda) pratik bir flake riski OLUŞTURMADI. **Bu, riskin TEORİK
OLARAK yok olduğu anlamına gelmez** (sabit bekleme kalıbı hâlâ G261'in
uyardığı SINIF içinde — farklı bir makinede/yükte/CI ortamında
tetiklenebilir) — sadece BU 20 koşuda GÖZLENMEDİ, "kanıtlanmış güvenli"
DEĞİL "bu turda gözlenen risk düşük" olarak okunmalı.

**Dosya:satır:** `e2e/exam-flow.spec.mjs:45,66,76` — 3 ayrı `page.waitForTimeout(200)`
çağrısı, bir `#nextBtn` döngüsü içinde.
**Düzeltme yolu (düzeltme ÖNERİLMEDİ, sadece not):** G261'in
`earDatasetStable()`/polling deseniyle TUTARLI olması için, istenirse
sabit 200ms yerine "beklenen DOM durumu gerçekleşene kadar polling"
GEÇİLEBİLİR — ama 20/20 temiz sonuç göz önüne alınırsa bu ŞU AN acil
değil.

### E.5 — Stereo Genişlik "yayın engelleyici" maddesi

**KAPANDI.** Orijinal madde (`DEVIR-15-08-GECE.md:229-233`, 15 Ağustos):
*"Stereo Genişlik kaynak dosyası — Logic'te hazırlanıyor, henüz repoya
eklenmedi (bu mod `only:['upload']` ile SADECE kullanıcının kendi
dosyasıyla çalışıyor)."* G259 (`27073c7`, 16 Ağustos) bunu ÇÖZDÜ:
`stereo-genislik.js:272`'nin `only` listesi artık `["upload",
"acoustic_guitar_stereo", "clean_guitar_stereo"]` — 2 PAKETLİ stereo
kaynak eklendi. **Kanıt:** bu OTURUMDA (G265) `e2e/ear-buttons.spec.mjs`'in
Stereo Genişlik testi paketli kaynakla (upload OLMADAN) 9/9 ve tam
takım 30/30 koşuda TEKRAR TEKRAR YEŞİL geçti — mod gerçekten paketli
kaynakla oynanabiliyor, GERÇEK bir e2e testiyle DOĞRULANMIŞ durumda,
tahmin değil.
**Commit:** G259 (`27073c7`).

### E.6 — Hata analizi kayıt formatı — iş yükü

**G227'nin (`38f9a03`, 2026-08-10) TAM tarifi VAR** — bu turda tekrar
sıfırdan üretilmedi, GÜNCEL koda göre spot-check ile doğrulandı:
- **Zorluk ve süre ZATEN her submit fonksiyonunun YEREL kapsamında
  hazır** (`q.difficulty`/`roundFlow.timeLeft`/`roundDuration` — XP
  hesaplaması için okunuyor) — **YENİ hesaplama GEREKMİYOR**, sadece
  bu MEVCUT değerlerin bir yere YAZILMASI gerekiyor.
- **12 submit handler'a dokunmak:** `pushHistory(...)` çağrı sayısı
  BU TURDA **12** olarak sayıldı (`grep -c` ile doğrulandı — G227'nin
  belgelediği "13" ile BİR fark var, muhtemelen G227'den bu yana bir
  konsolidasyon oldu, bu turda İZ SÜRÜLMEDİ, BELİRSİZ) — HER biri
  KENDİ yerel değişken adıyla (`guessHz`/`value`/`labelId`/`letter`/vb.)
  çağrılıyor, yeni bir kayıt fonksiyonuna bunları GEÇİRMEK 12(-13)
  çağrı sitesinin HER BİRİNE dokunmayı gerektirir — **G227'nin kendi
  değerlendirmesi: "mekanik ama tekil, karmaşık DEĞİL."**
- **Mimari:** yeni şema/fonksiyon TEK yerde tanımlanabilir
  (`pushHistory()`'nin yanına/yerine).
- **Gerçek risk — localStorage boyutu:** `history`/`stats` AYNI blob'da,
  HER cevapta senkron yeniden yazılıyor; sınırsız büyüyen bir log AYNI
  blob'a eklenirse büyüme + performans + tarayıcı sınırı (~5-10MB,
  KESİN sayı ölçülmedi) riski var — G227'nin ÖNERİSİ (uygulanmamış):
  AYRI bir anahtar + döngüsel/üst-sınırlı tamponlama.
- **Migration:** GEREKMEZ (yeni anahtar, mevcut veri bozulmaz) — AMA
  "1.0'da açılmazsa geçmiş veri hiç olmaz" notu G227'de zaten var.
**İş yükü:** Orta (mimari basit, ama 12 çağrı sitesine dokunmak +
boyut/tamponlama kararı gerektiriyor).
**Risk:** Düşük-Orta (yeni veri deposu, mevcut akışları BOZMUYOR, ama
localStorage boyutu izlenmeli).

---

## ÖZET

### 1) Bugün yapılabilecekler (düşük risk, kısa)
- **A) `clean_guitar`'ı pan-konumu.js/reverb.js'in `only` listesine
  eklemek** — 2 satır, önemsiz risk.
- **D) `snare-hihat`'ı 4. Frekans Çakışması çifti olarak eklemek** —
  yöntemi zaten kanıtlanmış (3 mevcut çiftle AYNI süreç), düşük risk.

### 2) Bugün yapılabilir ama dikkat gerektirenler
- **C) Motor 2'ye offset-devri (kısmi çözüm)** — küçük kod değişikliği
  ama Motor 2'nin pause/resume mantığıyla ETKİLEŞİYOR, dikkatli test
  gerektirir.
- **B) Reverb'in Hall tipi PEAK'i** — kod DEĞİŞTİRİLMESİ önerilmiyor
  (kasıtlı bir tasarım kararının SONUCU) ama Logic'in BİLEREK yeniden
  onaylaması/gözden geçirmesi gerekiyor — "bugün" bir KARAR alınabilir
  bile olsa kod değişikliği AYRI bir iş.

### 3) 1.1'e bırakılması gerekenler
- **B) Distortion'ın drive-bağımlı/tip-bağımlı gain telafisi** — yeni
  bir DSP mekanizması, kalibrasyon + test yükü büyük.
- **B) Kesim Noktası'nın pembe-gürültü varsayımı sınırlaması** — yeni
  bir spektral-farkındalık altyapısı gerektirir.
- **C) Motor 2'nin TAM Motor-1-tarzı taşınması** — yüksek iş yükü/risk,
  CPU kullanımı etkisi ÖLÇÜLMEDİ.
- **E.6) Hata analizi kayıt formatı** — mimari basit ama kapsamı
  (12+ çağrı sitesi + boyut yönetimi) büyük bir tur gerektirir.

### 4) Karar bekleyenler (Logic'in cevaplaması gerekenler)
- **B) Reverb Hall'ün 0dBFS üstü peak'i** — `normalize:false` kararı
  KORUNSUN mu (gerçek decay farkını öğretmek için), yoksa Hall'e ÖZEL
  bir tavan/telafi mi eklensin?
- **B) Distortion telafisi hangi REFERANSA göre hesaplansın** —
  Kompresör'ün seviyesine mi, sabit bir hedefe mi (ör. -20dB LUFS-benzeri)?
- **D) `snare-gitar` çifti DEĞİŞTİRİLSİN mi (snare-hihat İLE)** yoksa
  4. bir çift olarak mı EKLENSİN?
- **D) vocal.m4a ne zaman yenilenecek** — yenilenene kadar vocal-içeren
  hiçbir çift zamansal olarak güvenilir DEĞİL.
- **E.3) `showSessionEnd()` (152 satır) + `#screen-result`'ın DOM/CSS'i
  SİLİNSİN mi, yoksa gelecekte (ör. free tarafının "normal" dalına
  yeniden erişim kazandırılması durumunda) POTANSİYEL kullanım için
  mi TUTULSUN?**

---

**Dokunulan:** Sadece bu rapor dosyası (`OLCUM-KALAN-17-08.md`, YENİ).
**Dokunulmayan:** `www/js/` altında hiçbir kod dosyası, hiçbir test
dosyası, `DURUM.md` — task'ın kendi kuralı ("KOD YAZMA, DOSYA
DEĞİŞTİRME, COMMIT ATMA") harfiyen uygulandı. DURUM.md güncellemesi
BU rapor tamamlandıktan SONRA, AYRI bir adım olarak yapılacak.

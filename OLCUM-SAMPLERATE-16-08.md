# OLCUM-SAMPLERATE-16-08 — Sample Rate Zinciri Ölçümü

_Kapsam: SADECE ÖLÇÜM. Kod YAZILMADI, hiçbir dosya DEĞİŞTİRİLMEDİ, commit
atılmadı (`git status` bu turun sonunda TEMİZ). `audio-engine.js`/
`upload.js`/`analysis.js`/`analysis-worker.js` TAM okundu (grep + tam
dosya okuma). Bazı sayılar GERÇEK canlı Chrome ölçümüyle üretildi —
sentetik WAV dosyaları TAMAMEN BELLEK İÇİNDE üretildi (hiçbir dosyaya
YAZILMADI), gerçek `decodeAudioData`/`OfflineAudioContext`/
`BiquadFilterNode` ile ölçüldü. **Önemli sınır:** bu ölçümlerin HEPSİ
MASAÜSTÜ Chrome'da yapıldı — iOS/WKWebView'de GERÇEK cihaz testi
YAPILAMADI, ilgili maddeler AÇIKÇA "BELİRSİZ" olarak işaretlendi._

---

## A) AudioContext HANGİ HIZDA AÇILIYOR

**Kodda `sampleRate` parametresi veriliyor mu?** **HAYIR — `grep` ile
TEK yapım noktası doğrulandı** (`audio-engine.js:362`):
```js
audioCtx = new (window.AudioContext || window.webkitAudioContext)();
```
Hiçbir seçenek nesnesi yok. Kod tabanında `new (Offline)?AudioContext`
için BAŞKA HİÇBİR yapım noktası YOK (`grep -rn "new.*AudioContext"
www/js/` tek satır döndürdü) — bu, "verilmiyor diye tespit edilmişti"
iddiasını DOĞRULUYOR.

**Verilmiyorsa tarayıcı/cihaz neye göre karar veriyor?** Web Audio API
spesifikasyonuna göre: seçenek verilmezse context, **cihazın/işletim
sisteminin o an kullandığı çıkış donanımının TERCİH ETTİĞİ örnekleme
hızını** kullanır. Bu SPESİFİKASYONUN kendisinden gelen, genel/citable
bir bilgi — bu turda MASAÜSTÜ Chrome'da GERÇEKTEN ölçüldü: **bu makinede
varsayılan 44100 Hz** (`new AudioContext().sampleRate` → 44100).

**iOS'ta WKWebView tipik olarak hangi hızı seçer?** **BELİRSİZ — bu
turda ÖLÇÜLEMEDİ, iOS cihaz erişimi YOK.** Genel/yaygın bilinen davranış
(iOS'un ses donanımı çoğunlukla 44.1kHz ya da 48kHz arasında, aktif
`AVAudioSession` kategorisine ve bağlı donanıma göre değişebilir) burada
TAHMİN olarak dahi YAZILMIYOR — task'ın kendi kuralı gereği bu madde
AÇIKÇA "cihazda test edilmeli" listesine taşındı (bkz. sonuç bölümü).

**Kulaklık takılınca/çıkınca context hızı değişir mi? G203 bunu ele
alıyor mu?** **G203'ün TAM metni okundu — HAYIR, ele almıyor.** G203
(`DURUM.md`, route-change düzeltmesi) SADECE şunu yapıyor: kulaklık
tak/çıkarında `pauseRound()` çağırıp turu duraklatmak (#50) + 200ms
debounce (#51) + `ensureAudioAlive({allowRecreate:false, silent:true})`
ile SESSİZ bir "ısınma" denemesi. **`AudioContext.sampleRate`'in KENDİSİ
route change'de HİÇ okunmuyor/kontrol edilmiyor, hiçbir yerde
loglanmıyor.** Web Audio spesifikasyonuna göre `AudioContext.sampleRate`
**salt-okunur ve context'in ÖMRÜ boyunca SABİTTİR** — donanım rotası
değişse bile JS'e görünen değer AYNI KALMASI beklenir (OS/tarayıcı bunu
şeffaf biçimde dahili resample ile telafi eder). **Ama bu app'in KENDİ
`recreateContext()` mekanizması (zombi-context kurtarma, G131-G137) BİR
İSTİSNA açıyor:** context "ölü" bulunup YENİDEN kurulursa
(`unlockAudio()` yeniden çağrılır, YİNE `sampleRate` parametresiz) —
eğer bu yeniden-kurulma bir rota değişikliğinden SONRA olursa VE o
sırada OS'un varsayılan hızı DEĞİŞMİŞSE, **yeni context eskisinden
FARKLI bir hızda açılabilir.** Bu SENARYONUN kendisi kod okunarak
GÖRÜLDÜ (`sampleBufferCache.clear()` + `onContextRecreated` hook'unun
yüklü dosyayı YENİDEN decode etmesi, `app.js:12748-12757` — AYRICA
DOĞRULANDI, bkz. B) — ama GERÇEKTEN TETİKLENİP TETİKLENMEDİĞİ (rota
değişiminde OS'un varsayılan hızının GERÇEKTEN değişip değişmediği)
**BELİRSİZ, cihaz testi gerektiriyor.**

**Bluetooth kulaklıkta hız değişir mi (SBC/AAC codec)?** **BELİRSİZ —
ÖLÇÜLEMEDİ.** Bluetooth ses codec'lerinin (SBC/AAC/aptX) kendi iç
örnekleme/aktarım karakteristiklerinin, işletim sisteminin
`AVAudioSession`'a rapor ettiği hıza YANSIYIP yansımadığı bu ortamdan
GÖRÜLEMEZ — donanım/OS seviyesinde bir konu, gerçek bir Bluetooth
cihazla test gerektirir.

---

## B) PAKETLİ KAYNAKLAR

**9 kaynak dosya 44.1 kHz. Context 48 kHz açılırsa ne oluyor?**
**GERÇEK ölçüldü** — kasıtlı bir uyuşmazlık (`{sampleRate:48000}`)
oluşturulup GERÇEK `vocal.m4a` (ffprobe ile 44100Hz doğrulanmıştı) bu
context'te decode edildi:

| | 44100Hz context'te decode | 48000Hz context'te decode |
|---|---|---|
| `buffer.sampleRate` | 44100 | **48000** |
| `buffer.length` (örnek) | 250047 | **272160** |
| `buffer.duration` | 5.67s | **5.67s (DEĞİŞMEDİ)** |

**decodeAudioData otomatik resample yapıyor mu?** **EVET, KANITLANDI** —
dönen buffer'ın `sampleRate`'i HER ZAMAN context'in kendi hızına eşit
çıkıyor, `length` buna göre ORANTILI değişiyor, `duration` (gerçek
dünya saniyesi) SABİT kalıyor — pitch/hız DEĞİŞMİYOR (bkz. madde E).

**Yapıyorsa kalitesi ne — hangi algoritma, aliasing var mı?**
**Algoritma:** tarayıcı-içi, KAPALI/dokümante edilmemiş (Web Audio
spesifikasyonu resample KALİTESİNİ TANIMLAMIYOR, "implementation-defined").
**Kalite GERÇEK ölçüldü (bu Chrome'da):**
- Bellek içinde üretilen TAM 1000Hz'lik bir sinüs (44100Hz kaynak),
  48000Hz'e mismatch-decode edildikten SONRA, Goertzel ile 990-1010Hz
  aralığında 0.25Hz adımla tarandı — **gerçek tepe TAM 1000.00Hz'de
  çıktı, genlik kontrol grubuyla (44→44, uyuşmayan senaryo YOK) BİREBİR
  aynı (0.8000).** Frekans kayması/smear ÖLÇÜLEMEDİ.
- Aliasing testi: 96000Hz'de üretilen 30000Hz'lik bir ton (44.1kHz'in
  Nyquist'i olan 22050Hz'in ÜSTÜNDE) 44100Hz context'e decode edildi —
  **sinyal doğru şekilde SÜZÜLDÜ** (genel RMS 0.001, olası alias
  frekansındaki [14100Hz] genlik 0.00005 — pratikte SIFIR). **Chrome'un
  resampler'ı anti-aliasing filtresini doğru uyguluyor, GERÇEKTEN
  ölçüldü.**
- **Bu SADECE Chrome/masaüstü için geçerli** — WebKit/iOS'un KENDİ
  resampler'ının AYNI kaliteyi taşıyıp taşımadığı BELİRSİZ.

**Kaynakları 48 kHz üretmek daha mı iyi olurdu?** **Net bir kazanç
GÖRÜNMÜYOR, gerekçeli bir tercih var:** Resample yönü (44.1→48
YUKARI-örnekleme, bilgi kaybı yok) genelde 48→44.1 (AŞAĞI-örnekleme,
anti-aliasing filtresi GEREKTİRİR) YÖNÜNDEN daha az riskli kabul edilir.
Kaynaklar 44.1kHz'de KALIRSA, 48kHz'e varsayılan bir cihazda YUKARI-
örnekleme (daha güvenli yön) olur; 48kHz'e geçirilirse 44.1kHz'e
varsayılan cihazlarda AŞAĞI-örnekleme (anti-alias'a bağımlı, ÖLÇÜLEN
kalite iyi ama garantisiz) gerekir. **Mevcut 44.1kHz seçimi bu açıdan
savunulabilir** — değiştirmenin somut bir kazancı YOK.

**Bu resample HER ÇALMADA mı yoksa bir kez decode'da mı?** **BİR KEZ,
decode anında.** Kodun kendisi bunu zaten doğruluyor:
`sampleBufferCache` (`audio-engine.js:667`) her `path`'i **"decode
SADECE BİR KEZ"** diye Promise olarak önbelleğe alıyor — bir SONRAKİ
`buildSampleSource()` çağrısı AYNI (zaten resample edilmiş) buffer'ı
DOĞRUDAN kullanıyor, yeniden decode/resample YAPMIYOR.

---

## C) KULLANICI DOSYALARI

**Kullanıcı 48/96/192 kHz dosya yükleyebilir. Her biri için ne oluyor?**
Aynı mekanizma (B'de kanıtlandı) — `upload.js:loadFile()` AYNI
`ctx.decodeAudioData()`'yı çağırıyor (`getAudioCtx()` üzerinden — bu app'in
TEK, paylaşılan `audioCtx`'i, A maddesindeki AYNI context). Sonuç: HANGİ
hızda yüklenirse yüklensin, decode edilen `AudioBuffer` HER ZAMAN o anki
paylaşılan context'in hızına resample edilmiş olarak döner.

**Yeniden örnekleme ölçüm sonuçlarını (LUFS, true peak, spektrum)
etkiliyor mu?** **Dolaylı olarak EVET, ama kodun kendi ölçüm
MATEMATİĞİ hatasız:** `analysis.js` `bufferLike.sampleRate`'i
OKUYARAK TÜM pencere/gating hesaplarını (rmsWindowSamples,
gatingBlockSamples vb.) buna göre KURUYOR — yani buffer HANGİ hızdaysa
analiz O HIZA göre DOĞRU çalışıyor (`grep` ile `OfflineAudioContext`
kullanımı SIFIR bulundu, bkz. madde F — analiz KENDİ başına bir rate
uyuşmazlığı YARATMIYOR). **Asıl etki decode SIRASINDA olan resample'dan
geliyor** — B'de ölçülen kaliteye göre (frekans-koruyucu, doğru anti-
alias) bu SINYALİ BOZMUYOR gibi görünüyor, ama true peak GİBİ intersample-
hassas bir metrik İÇİN teorik olarak şu fark önemli: kullanıcının kendi
DAW'ı dosyayı NATIVE hızında (ör. 96kHz) ölçmüş olabilir, bu app AŞAĞI-
örneklenmiş (ör. 44.1/48kHz) bir kopya üzerinde ölçüyor — **bu, aynı
dosyanın iki FARKLI (ama ikisi de MEŞRU) örnekleme hızında ölçülmesinden
doğan bir fark olur, bir HATA değil** (RX karşılaştırmasındaki
OLCUM-RX-KARSILASTIRMA-16-08.md'nin bulgusuyla AYNI kategori).

**96 kHz bir dosyanın 20 kHz üstü içeriği ne oluyor?** **GERÇEK
ölçüldü** — 30kHz'lik test tonu 44.1kHz context'e decode edildiğinde
**doğru şekilde SÜZÜLÜYOR** (yukarıdaki aliasing testi). Yani 96kHz bir
kaynağın 22kHz (44.1kHz context'te) ya da 24kHz (48kHz context'te)
üstü içeriği **KAYBOLUYOR ama ALIASING/bozulma OLARAK duyulabilir bir
banda KATLANMIYOR** — bu, DOĞRU/beklenen bir SRC (sample rate converter)
davranışı, "veri kaybı" var ama "bozulma" YOK.

---

## D) FREKANS DOĞRULUĞU ⚠️ EN KRİTİK

**Filtre frekansları context'in hızına göre mi, dosyanınkine göre mi
hesaplanıyor?** **Context'in hızına göre — GERÇEK ölçüldü, KANITLANDI.**
`BiquadFilterNode.frequency` HER ZAMAN o anki AudioContext'in
`sampleRate`'i üzerinden gerçek Hz'e çevriliyor (Web Audio
spesifikasyonunun bir GEREĞİ) — dosyanın KENDİ orijinal hızının bu
hesaplamayla HİÇBİR ilgisi yok (zaten dosya decode edilirken ÇOKTAN
context'in hızına resample edilmiş oluyor, bkz. B).

**"1 kHz" sorusu gerçekten 1 kHz'i mi vurguluyor?** **EVET — GERÇEK,
sayısal olarak ölçüldü, KAYMA YOK.** `frekans-bulma.js`'in KENDİ
"medium" parametreleriyle (`gain:8, q:1.3` — koddan alındı, uydurulmadı)
BİREBİR aynı bir peaking filtre, İKİ FARKLI context hızında
(44100/48000) test edildi:

| Senaryo | 44100Hz context | 48000Hz context |
|---|---|---|
| 1000Hz ton + 1000Hz filtre → kazanç (beklenen +8dB) | **+8.000 dB** | **+8.000 dB** |
| 1000Hz ton + 1200Hz (hedef DIŞI) filtre → kazanç | +6.405 dB | +6.407 dB |

**İki context hızı arasında fark 0.002dB — ölçüm gürültüsü seviyesinde,
PRATİKTE SIFIR.** Filtrenin "1kHz" dediği yer GERÇEKTEN 1kHz, context
hızından TAMAMEN BAĞIMSIZ.

**Ölçülebilir bir test kurulabilir mi?** **EVET, BU RAPORDA
KURULDU VE ÇALIŞTIRILDI** — yöntem: (1) bilinen frekansta bir ton
bellek-içi WAV olarak üretildi, (2) `OfflineAudioContext` + gerçek
`BiquadFilterNode`/`OscillatorNode` ile render edildi, (3) çıktı bir
Goertzel algoritmasıyla (belirli frekanslarda TAM genlik ölçen, FFT'nin
tek-frekanslı hali) analiz edildi. Bu YÖNTEM tekrar kullanılabilir —
kod DEĞİŞTİRİLMEDEN, sadece geçici bir tarayıcı script'i olarak
çalıştırıldı, repoya HİÇ YAZILMADI.

**Bu kayma varsa KULAKLA fark edilmez, sadece ölçümle çıkar — doğru
mu?** Bu turun bulgusuna göre **KAYMA YOK** (en azından masaüstü
Chrome'da, hem BiquadFilterNode'un frekans-yorumlama katmanında hem
decodeAudioData'nın resample katmanında) — dolayısıyla ne kulakla ne
ölçümle fark edilecek bir kayma BULUNAMADI. **iOS/WebKit'te AYNI testin
tekrarlanması BELİRSİZLİĞİ kapatır** (bu turda yapılamadı).

---

## E) DÖNGÜ VE HIZ

**Yeniden örnekleme döngü uzunluğunu değiştirir mi?** **HAYIR — GERÇEK
ölçüldü.** B maddesindeki deney: 5.67sn'lik dosya, 44100Hz'de VE
48000Hz'de decode edildiğinde İKİSİNDE de `duration: 5.67` — saniye
cinsinden süre BİREBİR AYNI kaldı, SADECE örnek SAYISI (length) orantılı
değişti.

**24.6 saniyelik bir dosya 48 kHz context'te kaç saniye çalar?**
**24.6 saniye — DEĞİŞMEZ.** Yukarıdaki GERÇEK ölçümün doğrudan
sonucu: resample işlemi örnek SAYISINI değiştirir, gerçek-dünya SÜRESİNİ
DEĞİŞTİRMEZ (bu, HERHANGİ bir doğru sample-rate-converter'ın TANIMI
gereği böyledir — süre sabit kalmazsa PITCH de kayar, ki bu turda
TEST EDİLEN hiçbir senaryoda gözlenmedi).

**Pitch kayması olur mu?** **HAYIR, ÖLÇÜLEN hiçbir senaryoda
gözlenmedi** — 1000Hz test tonunun resample SONRASI gerçek tepe
frekansı YİNE 1000.00Hz çıktı (madde D). Pitch kayması, ancak
resample YANLIŞ/hatalı yapılırsa (ör. örnekleri SADECE "yeniden
etiketleme", gerçek yeniden-örnekleme YAPMADAN) ortaya çıkar — bu
GERÇEKLEŞMEDİĞİ bu ölçümle KANITLANDI.

---

## F) ÖLÇÜM ZİNCİRİ

**analysis.js ölçüm yaparken hangi hızı kullanıyor?** `bufferLike.
sampleRate`'i (parametre olarak GELEN, hangi hızsa O) — kodun HİÇBİR
yerinde sabit/varsayılan bir sayı (44100/48000) YOK, TÜM pencere/gating
hesapları (`rmsWindowSamples`, `gatingBlockSamples`, K-weighting
katsayı türetimi) bu parametreden TÜRÜYOR (`preFilterCoeffs(fs)`/
`rlbFilterCoeffs(fs)` — fs'i argüman olarak ALIYOR, sabit bir sayıya
kilitli DEĞİL, önceki turda [OLCUM-RX] zaten okunmuştu).

**OfflineAudioContext dosyanın kendi hızında mı açılıyor, ana
context'in hızında mı?** **HİÇBİRİ — `OfflineAudioContext` bu kod
tabanında HİÇ KULLANILMIYOR** (`grep -rn "OfflineAudioContext" www/js/`
SIFIR sonuç). `analysis-worker.js` (24 satır, TAM okundu) SADECE
ANA THREAD'İN ZATEN decode ettiği Float32Array'leri (`channelBuffers`,
`postMessage` ile transfer edilen) alıp SAF hesaplama yapıyor — kendi
bir AudioContext AÇMIYOR (Worker'larda zaten AudioContext genelde
mevcut DEĞİL). Yani analiz İÇİN kullanılan buffer, TAMAMEN A/B/C'de
anlatılan AYNI TEK, PAYLAŞILAN `audioCtx` üzerinden decode ediliyor —
**analiz zincirinde AYRI bir ikinci "hız" YOK, tek bir hız (paylaşılan
context'in hızı) her yerde geçerli.**

**İkisi farklıysa ölçüm sonucu etkileniyor mu?** Soru KENDİSİ bu kod
tabanı için GEÇERSİZ — "ikisi" diye ayrı bir şey YOK, TEK bir hız var.
(Eğer OfflineAudioContext KULLANILSAYDI ve dosyanın kendi hızında
açılsaydı, decodeAudioData'nın YAPTIĞI resample bile ATLANABİLİRDİ —
bu, potansiyel bir GELECEK iyileştirme fikri, bkz. G.)

---

## G) SONUÇ VE ÖNERİ

**Gerçek bir risk var mı, yoksa tarayıcı her şeyi doğru mu
hallediyor?** **Bu turda MASAÜSTÜ Chrome'da ÖLÇÜLEN her şey "tarayıcı
doğru hallediyor" YÖNÜNDE** — decode-time resample frekans-koruyucu,
anti-aliasing doğru çalışıyor, BiquadFilterNode context-hızından
bağımsız doğru Hz hedefliyor, süre/pitch KORUNUYOR. **AMA bu SADECE bir
tarayıcı/platformda (masaüstü Chrome) ölçüldü** — asıl kullanıcı
platformu (iOS WKWebView/Safari) bu turda HİÇ test EDİLEMEDİ. Web Audio
spesifikasyonu resample KALİTESİNİ TANIMLAMADIĞI için (implementation-
defined) WebKit'in KENDİ resampler'ının AYNI kalitede olduğu **VARSAYILAMAZ,
sadece MAKUL bir olasılık** (WebKit olgun/spec-uyumlu bir motor, ama bu
BİR KANIT DEĞİL).

**Varsa: nerede, ne kadar, kim etkileniyor?** Bu turda GERÇEK bir
sorun KOD/ÖLÇÜMLE bulunamadı — kalan risk TAMAMEN platformlar-arası
BELİRSİZLİKTE (iOS resample kalitesi, cihaz varsayılan hızı, Bluetooth
codec etkisi, route-change sonrası context yeniden oluşturma senaryosu).

**Düzeltme gerekiyorsa yolu ne?** Bu turda ÖLÇÜLEN kanıta göre acil bir
KOD düzeltmesi GEREKMİYOR gibi görünüyor — ama İKİ potansiyel iyileştirme
fikri (UYGULANMADI, sadece not):
1. `OfflineAudioContext`'i dosyanın KENDİ native hızında açıp ORADA
   decode etmek, analiz İÇİN resample'ı TAMAMEN ATLAMAK (F'nin notu) —
   true-peak/LUFS gibi hassas metrikler İÇİN "en doğru" yaklaşım
   olurdu, ama BAŞKA bir mühendislik işi (bu turda tasarlanmadı,
   sadece FİKİR olarak not edildi).
2. Kaynakları 48kHz'e taşımak — B'nin gerekçesine göre net bir KAZANÇ
   GÖRÜNMÜYOR, ÖNERİLMİYOR.

**⚠️ Context'i sabit bir hıza kilitlemenin RİSKİ ne? "Sorun katman
değiştirir ama kaybolmaz — bu doğru mu?"** **EVET, bu çerçeve DOĞRU,
mimari olarak GEREKÇELENDİRİLEBİLİR (ölçülmedi ama spec-tutarlı bir
çıkarım):** Context açıkça (ör.) 44100Hz'e KİLİTLENİRSE ama donanımın
GERÇEK/tercih ettiği hızı 48000Hz İSE, OS/tarayıcı bu farkı **donanım
sınırında, SÜREKLİ/gerçek-zamanlı bir resample ile** (decode-zamanlı,
BİR KEZ olan mevcut resample'dan FARKLI — HER ses callback'inde tekrar
eden bir işlem) telafi eder. Yani: **resample KAYBOLMAZ, sadece
DECODE aşamasından (ölçülen, iyi kaliteli, TEK SEFERLİK) DONANIM
sınırına (ÖLÇÜLEMEYEN, muhtemelen sürekli/gerçek-zamanlı) TAŞINIR** —
bu potansiyel olarak DAHA FAZLA (tekrarlayan) işlem VE muhtemelen
FARKLI (belki daha düşük) kalitede bir resample katmanı anlamına
gelebilir. **Context'i kilitlemek net bir İYİLEŞTİRME değil, muhtemelen
GEREKSİZ bir risk** — bu turun ölçümüne göre MEVCUT (kilitsiz) yaklaşım
zaten iyi çalışıyor.

**Pozitif bulgu (kod okunarak, bu turda AYRICA doğrulandı):**
`recreateContext()` (context yeniden kurulduğunda) `sampleBufferCache.
clear()` çağırıyor VE `app.js`'in `onContextRecreated` hook'u (satır
12748-12757) ana yüklü dosyayı **YENİDEN decode ETTİRİYOR** — yani YENİ
context FARKLI bir hızda açılsa BİLE, eski (yanlış hızda) buffer'lar
YANLIŞLIKLA yeniden kullanılmıyor. Mimari bu SENARYOYU ZATEN DOĞRU ele
alıyor.

**Cihazda test edilmesi gereken adımlar (öncelik sırasıyla):**
1. iOS Safari/WKWebView'de `new AudioContext().sampleRate`'i GERÇEKTEN
   okuyup hangi değeri verdiğini kaydet (madde A) — birkaç FARKLI iOS
   cihazda (varsa).
2. Kulaklık tak/çıkar + Bluetooth cihaz bağla/ayır sırasında AYNI değeri
   TEKRAR oku — değişip değişmediğini KAYDET (madde A).
3. Bu raporun D maddesindeki Goertzel/OfflineAudioContext testini
   AYNEN (script değişmeden) Safari'de çalıştırıp WebKit'in resample
   kalitesinin Chrome'la AYNI olup olmadığını doğrula (madde B/D).
4. Gerçek bir 96kHz dosya yükleyip Ölçüm Sonuçları'nın (LUFS/true peak)
   AYNI dosyanın harici bir referans ölçümüyle (varsa) karşılaştırıldığında
   makul çıkıp çıkmadığını gözlemle (madde C).
5. Route-change (kulaklık çıkar) SONRASI context'in GERÇEKTEN yeniden
   kurulup kurulmadığını (`recreateContext` loglarını `DEV_MODE`
   açıkken izleyerek) VE yeniden kurulursa hangi hıza düştüğünü
   kaydet (madde A/G).

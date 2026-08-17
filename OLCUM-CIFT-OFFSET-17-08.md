# ÖLÇÜM — Frekans Çakışması: çift-bazlı zamansal offset

Görev: 5 yeni çift için (akustik+clean, bas+akustik, bas+clean, snare+akustik,
snare+clean) her çiftin np.roll ile kulakla onaylanmış farklı bir kaydırma
gerektirmesi — aynı dosyanın (`acoustic_guitar.m4a`) farklı eşleşmelerde farklı
offset alması. KOD YAZILMADI, COMMIT ATILMADI. Bu turda `e2e/` altında 3 geçici
ölçüm scripti (`_measure_offset_loop.mjs`, `_measure_offset_negative.mjs`,
`_measure_offset_content.mjs`) yazılıp OfflineAudioContext/decodeAudioData ile
gerçek Chromium'da çalıştırıldı, ölçüm bitince SİLİNDİ — repo'da iz yok
(`git status --short` bunu doğruluyor, tek untracked dosya önceki turdan kalma
`OLCUM-KURTARMA-17-08.md`).

## 1. SOURCE_PAIRS yapısı offset'e uygun mu?

`www/js/core/source-catalog.js:161-174` — mevcut alanlar:
```js
{ id, labelA, labelB, sourceA, sourceB, region, desc }
```
Offset/zamanlama alanı YOK. Yeni bir alan eklemek yapısal olarak sorunsuz —
dizi elemanları düz obje, tüketen kod (`app.js:cakismaSourcesSpec`,
`audio-engine.js:buildDualSourceChain`) alan bazlı erişiyor, ek alan eklemek
mevcut çiftleri (`kick-bas`, `vokal-gitar`, `snare-arpej-gitar`) BOZMAZ (onlar
yeni alanı taşımaz, `undefined`/varsayılan 0 olarak okunur).

**Önerilen şekil:** `offsetMsA`/`offsetMsB` (her çift için, hangi taraf
kaydırılacaksa o alanda pozitif ms) — TEK bir `offsetMs` + "hangi taraf" yerine
İKİ ayrı alan, çünkü aynı dosya (`acoustic_guitar`) FARKLI çiftlerde FARKLI
taraf (A veya B) olabiliyor ve iki farklı offset değeri taşıyabiliyor (bas+akustik'te
-377ms, akustik+clean'de 0) — bu zaten çift-bazlı bir alan olduğu için "aynı
dosya farklı offset" sorunu doğal çözülüyor (offset dosyaya değil ÇİFTE ait).

⚠️ İşaret sorunu (bkz. madde 2) nedeniyle veri POZİTİF eşdeğer olarak
saklanmalı: "-377ms" değil, `buffer.duration - 0.377` (saniye) — ya da
üretim script'i offset'i hep `[0, duration)` aralığına çevirip yazmalı.

## 2. Oynatma kodu offset uygulayabiliyor mu?

**İki kaynak nasıl başlatılıyor:** `audio-engine.js:1139 buildDualSourceChain`
→ `connectSource` (1169-1200) → sample dalı (1177-1192):
```js
const [sample] = await buildSampleSource(samplePath);   // 1180 — offsetSec YOK, hep 0
```
`app.js:5386 cakismaSourcesSpec(pair)` (1178'e giden `spec` objesini üretir)
de offset taşımıyor — `{sourceType, uploadManager}` ikilisi, offset alanı yok.

**Mekanizma zaten var, ama BAĞLI DEĞİL:** `buildSampleSource(path, offsetSec=0)`
(audio-engine.js:741-749) G151'den beri `AudioBufferSourceNode.start(0, safeOffset)`
kullanıyor — `offsetSec` parametresi FONKSİYONDA VAR, sadece `buildDualSourceChain`
onu HİÇ geçmiyor (satır 1180 argümansız çağrılıyor).

**start(when, offset) + loop=true GERÇEKTEN döngüde korunuyor mu?** ÖLÇÜLDÜ —
OfflineAudioContext'te 10 örneklik ayırt edici bir "rampa" buffer (`[1..10]`)
`loop=true` ile `start(0, offsetSamples=3/sampleRate)` çağrılıp 3 tam döngü
render edildi. Çıkış:
```
[4,5,6,7,8,9,10,1,2,3, 4,5,6,7,8,9,10,1,2,3, 4,5,6,7,8,9,10,1,2,3]
```
10 örnekli desen (`4,5,6,7,8,9,10,1,2,3`) HER döngüde AYNEN tekrar ediyor —
yani `start(when, offset)`, `loop=true` (varsayılan `loopStart=0`/`loopEnd`=
buffer sonu) ile birlikte, buffer'ı `offset` kadar DAİRESEL KAYDIRIP baştan
oynatmakla MATEMATİKSEL OLARAK BİREBİR AYNI — np.roll'un kalıcı dairesel
kaydırmasının runtime eşdeğeri. Bu, önceden "offset sadece ilk geçişte etkili,
sonra sıfırlanır" varsayımının YANLIŞ olduğunu gösteriyor — DOĞRULANDI, tersi
doğru: offset KALICI.

**Negatif offset sorunu — ÖLÇÜLDÜ, GERÇEK BİR HATA VAR:**
`buildSampleSource`'un mevcut formülü (audio-engine.js:748):
```js
const safeOffset = buffer.duration > 0 ? offsetSec % buffer.duration : 0;
```
JS'in `%` operatörü işareti BÖLÜNENDEN alır (Python'un aksine negatifi
pozitife SARMAZ). `offsetSec = -0.377` ile aynı formül test edildi
(OfflineAudioContext, aynı 10-örnek buffer, `offsetSec=-3/sampleRate`):
```
safeOffset = -0.001
threw: true — RangeError: Failed to execute 'start' on 'AudioBufferSourceNode':
  The offset provided (-0.001) is less than the minimum bound (0).
```
Yani "bas+akustik: akustik -377ms" ve "bas+clean: clean -377ms" gibi NEGATİF
offset değerleri bu formüle DOĞRUDAN verilirse `.start()` RangeError FIRLATIR
ve o turun sesi hiç kurulmaz (try/catch pink-noise fallback'ine düşer,
`audio-engine.js:1187-1191`) — SESSİZ bir bozulma değil ama YANLIŞ/eksik ses.
**Düzeltme gerekli:** ya SOURCE_PAIRS'e POZİTİF eşdeğer offset yazılmalı
(`duration - 0.377`), ya da `buildSampleSource`'un formülü
`((offsetSec % duration) + duration) % duration` yapılmalı. İkincisi
`buildSampleSource`'un DİĞER çağrı yerlerini (upload resume/seek — hep
pozitif offset kullanıyor) ETKİLEMEZ (pozitif girişte iki formül de aynı
sonucu verir) ama PAYLAŞILAN bir fonksiyonu değiştirmek demek — birinci yol
(veri katmanında pozitife çevirmek) DAHA DÜŞÜK RİSKLİ, çünkü paylaşılan
fonksiyona dokunmuyor.

**Döngüde offset korunuyor mu?** ÖLÇÜLDÜ (yukarıdaki rampa testi) — EVET,
korunuyor, np.roll ile birebir eşdeğer.

**loopStart/loopEnd:** Kullanılmıyor (önceki ölçüm — bu turda da kodda
`loopStart`/`loopEnd` ataması YOK, sadece `src.loop = true`). Gerek de yok —
`start(when, offset)` + varsayılan loop sınırları zaten dairesel kaydırmayı
kendiliğinden veriyor (yukarıdaki ölçüm).

## 3. "İlk vuruş kesik" nasıl çözülür?

**Wrap-around'un np.roll'a özgü bir "sarma" hatası (click/pop) OLMADIĞI
ÖLÇÜLDÜ** — madde 2'de kanıtlandığı gibi `start(when,offset)` np.roll ile
MATEMATİKSEL OLARAK AYNI sonucu üretiyor, yani "runtime offset'e geçilirse bu
sorun kendiliğinden çözülür" varsayımı YANLIŞ: sorun HER İKİ yöntemde de AYNI
şekilde oluşur (ikisi de dairesel kaydırma).

**Gerçek sebep ÖLÇÜLDÜ (snare.m4a'nın decode edilmiş içeriği, 10ms RMS
zarfı):**
- `snare.m4a`: 24.615s, 44100Hz. İlk 10ms'de zirve (peak, normalize 0.953),
  ~300-380ms'ye kadar decay ile sıfıra yakınsıyor.
- **377ms noktası TAM SESSİZLİK** — o pencerede 10 ölçümün 10'u da `0`.
- Buffer'ın SON 500ms'sinde, sondan ~380-500ms önce İKİNCİ bir vuruş var
  (peak 0.976) — snare.m4a döngü içinde tekrar eden bir vuruş deseni
  taşıyor, sadece tek bir "ilk vuruş" değil.

**Sonuç:** `snare +377ms` offset'i uygulandığında, `start(0, 0.377)` turun
İLK anında ("t=0" gerçek zamanda) buffer pozisyonu 0.377s'den okumaya
başlıyor — ki bu KESİN OLARAK sessizlik bölgesi (ölçüldü). Buffer'ın
ASIL atağı (pozisyon 0, peak 0.953) turun başında hiç duyulmuyor — ancak
BUFFER TAMAMEN dönüp (24.615s - 0.377s ≈ 24.24 saniye SONRA) wrap noktasına
gelindiğinde duyulacak. 24 saniyelik bir round bu süreyi kapsamıyorsa (Reverb
G280 sonrası bile round süreleri saniyeler mertebesinde), kullanıcı O TUR
BOYUNCA snare'in gerçek atağını HİÇ duymayabilir — "ilk vuruş kesik" ifadesi
bunun kulağa yansıması: turun başında beklenen sert atak yerine sessizlik/kuyruk
duyuluyor.

**Bu, wrap-around'a ÖZGÜ bir "sarma artığı" (glitch/click) DEĞİL** — offset'in
kendisi PLAYBACK BAŞLANGICINI (t=0'ı) buffer'ın sessiz bir noktasına
denk getiriyor. Runtime `start(when,offset)`'e geçilse de AYNI sorun AYNEN
oluşur (madde 2'nin denklik kanıtı gereği) — **np.roll'dan runtime offset'e
geçmek bu sorunu ÇÖZMEZ.**

**Çözüm YOLU (kod yazılmadı, sadece tespit):** Offset değeri, buffer'ın
0/377ms/vb. noktasının SESSİZ olmadığı bir hizaya göre seçilmeli — ya offset
miktarı, snare'in vuruş aralığına göre "atak noktasına denk gelecek" şekilde
küçük bir düzeltmeyle ayarlanmalı (örn. 377ms yerine snare'in bir sonraki
vuruşuna denk gelen değer), ya da (madde 4'teki gibi) offline üretilen dosya
DOĞRUDAN atakla BAŞLAYACAK şekilde kırpılıp/hizalanıp kaydedilmeli (üretim
script'i buffer'ı sadece kaydırmakla kalmayıp, kaydırılmış sonucu "atak
0'da" olacak şekilde YENİDEN KIRPMALI) — bu ikisi de bu ölçüm turunun
kapsamı dışında bir ÜRETİM/karar konusu, kodda değil veri/ölçüm
tarafında çözülmesi gerekiyor.

## 4. ALTERNATİF: her çift için ayrı işlenmiş dosya

5 çiftten sadece 3'ü offset gerektiriyor, ve bazı çiftler AYNI offset
değerini paylaşıyor:
- `bas+akustik`: akustik -377ms → 1 yeni dosya (`acoustic_guitar` için)
- `bas+clean`: clean -377ms → 1 yeni dosya (`clean_guitar` için)
- `snare+akustik` VE `snare+clean`: ikisi de snare +377ms → AYNI shifted-snare
  dosyası İKİ çiftte de yeniden kullanılabilir → 1 yeni dosya

**Toplam: 3 yeni dosya** (5 değil), mevcut dosya boyutları ölçüldü
(`ls -la`):
- `acoustic_guitar.m4a`: 503.757 byte
- `clean_guitar.m4a`: 518.510 byte
- `snare.m4a`: 160.570 byte
- **Toplam ek bundle boyutu ≈ 1.182.837 byte ≈ 1,13 MB** (shifted kopyalar
  orijinalle YAKLAŞIK aynı boyutta olur — aynı süre, aynı codec varsayımıyla).

**Katalog karmaşıklığı:** G282 emsali (arpeggio_guitar.m4a değişikliğinde
`source-psd-data.js`'ye tek dosya eklendi) — her yeni dosya için
`source-psd-data.js`'ye YENİ bir PSD girişi de gerekiyor (3 yeni dosya → 3
yeni PSD girişi + `source-catalog.js`'ye 3 yeni `id` + `SOURCE_PAIRS`'in yeni
5 girişinin `sourceA`/`sourceB`'si bu yeni id'lere işaret etmesi).

**`stereoOnly` gibi bir bayrakla gizlenebilir mi?** EVET, doğrudan emsali
var — `compatibleSourceIds()` (`source-catalog.js:226`)
`.filter(s => !s.stereoOnly)` ile stereoOnly kaynakları genel seçiciden
gizliyor, ama `findSource(id)` ile DOĞRUDAN erişilebiliyor (SOURCE_PAIRS
zaten `findSource` ile erişiyor, bu filtreden GEÇMİYOR). Aynı desen
(`pairOnly: true` gibi yeni bir bayrak, ya da `stereoOnly` alanının adını
genişletmeden aynı filtreye eklenmesi) 3 yeni dosyayı da genel kaynak
seçiciden gizleyip SADECE SOURCE_PAIRS'in görmesini sağlayabilir — DÜŞÜK
risk, mevcut desenin aynısı.

**Not:** Bu alternatif de madde 3'teki "ilk vuruş kesik" sorununu OTOMATİK
çözmez — offline üretim script'i (np.roll) AYNI dairesel kaydırmayı
uyguluyorsa sonuç birebir aynı sessiz-başlangıç sorununu taşır. Çözüm
üretim script'inin ayrıca "atağı 0'a hizala" adımı eklemesine bağlı —
bu HER İKİ alternatifte de ORTAK, ayrı bir üretim/karar işi.

## 5. G267'nin seamless three-way mimarisi etkileniyor mu?

Bu tur YENİDEN grep ile doğrulandı (hafızaya güvenilmedi):
```js
// app.js:67
const THREE_WAY_MODE_IDS = ["kompresor", "reverb", "distortion"];
// app.js:76
const SEAMLESS_THREE_WAY_MODE_IDS = ["kompresor", "distortion"];
```
`frekans-cakismasi.js:67` → `export const MODE_ID = "frekans-cakismasi";` —
bu id NE `THREE_WAY_MODE_IDS` NE DE `SEAMLESS_THREE_WAY_MODE_IDS` içinde.
Frekans Çakışması `buildDualSourceChain` (iki eşzamanlı kaynak, A/B/C
crossfade YOK) üzerinden çalışıyor — G267'nin `loopStartAt` senkron
noktası ve seamless crossfade mekanizması SADECE Kompresör/Distortion'a
özel, Frekans Çakışması'nın kod yolunda hiç yok. **Offset eklemek G267'yi
ETKİLEMEZ** — ayrı, ilgisiz bir kod yolu (ölçüldü, varsayılmadı).

## 6. Hangisi daha az riskli ve daha az iş?

| | Runtime offset (start(when,offset)) | Ayrı dosya (offline np.roll + yeni asset) |
|---|---|---|
| Yeni ses dosyası | 0 | 3 (~1,13 MB) |
| Kod değişikliği | 3 nokta: `source-catalog.js` (SOURCE_PAIRS'e alan), `app.js:cakismaSourcesSpec` (offset'i spec'e taşı), `audio-engine.js:connectSource` (offset'i `buildSampleSource`'a geçir) | `source-catalog.js` (3 yeni `id` + `pairOnly` bayrağı + SOURCE_PAIRS 5 yeni giriş), `source-psd-data.js` (3 yeni PSD girişi) |
| Negatif offset hatası | VAR, ölçüldü — veri katmanında pozitif eşdeğer yazılarak (veya formül düzeltilerek) çözülmeli | Yok (offset dosyaya ÖNCEDEN gömülü, işaret sorunu yok) |
| "İlk vuruş kesik" | Çözülmüyor otomatik — offset seçimi/üretim script'i ayrıca düzeltilmeli (madde 3) | AYNI sorun, AYNI ek düzeltme gerekiyor (madde 4 notu) |
| G267 etkisi | Yok (ölçüldü) | Yok (ölçüldü) |
| Bundle/decode maliyeti | Yok — mevcut dosyalar, mevcut `sampleBufferCache` | +1,13 MB, +3 decode/cache girişi |
| Mevcut mekanizma | `buildSampleSource(path, offsetSec)` ZATEN VAR (G151), sadece bağlanmamış | Yeni asset üretim/QA süreci (dinleyerek onay, G281 emsali) |

**Net öneri:** Runtime offset (start(when,offset)) yolu — çünkü (a) mekanizma
zaten kodda var ve ölçüldüğü üzere np.roll ile BİREBİR eşdeğer sonuç veriyor,
(b) sıfır yeni bundle boyutu, (c) değişiklik yüzeyi 3 küçük, izole nokta
(veri alanı + iki geçiş noktası) — dosya alternatifinin gerektirdiği katalog/
PSD/QA yükünden daha az iş. TEK gerçek risk negatif-offset hatası (ölçüldü,
RangeError) — bunun çözümü KOD DEĞİL, VERİ: SOURCE_PAIRS'e offset'ler
pozitif eşdeğer olarak yazılmalı (`duration - 0.377` gibi). "İlk vuruş
kesik" sorunu HER İKİ yolda da AYRI bir üretim/offset-seçim kararı
gerektiriyor, hangi yöntem seçilirse seçilsin bu ayrıca çözülmesi gereken
bir bekleyen karar.

## Ölçülmeyen / bekleyen

- 3 yeni ses dosyasının (alternatif yol seçilirse) gerçek encode boyutu —
  yukarıdaki 1,13 MB tahmini "orijinalle aynı boyut" varsayımına dayanıyor,
  gerçek üretim sonrası ÖLÇÜLMELİ.
- "İlk vuruş kesik" için doğru offset/kırpma değeri — bu ölçüm turunun
  kapsamı dışında, ayrı bir dinleme/üretim kararı gerektiriyor.
- `bass.m4a`/`clean_guitar.m4a`'nın 377ms noktalarındaki içerik snare kadar
  ayrıntılı incelenmedi (sadece snare'in "sessiz nokta" sorunu doğrulandı) —
  akustik/clean'in -377ms noktaları görsel olarak (RMS zarfı) SESLİ
  görünüyordu (madde 3'ün ölçüm çıktısındaki 377ms civarı zarfları: akustik
  0'lar ama BU onun asıl ATAK BAŞLANGICINDAN ÖNCEKİ sessizlik — clean_guitar
  377ms civarında zarf 0.821-0.925 ile ZATEN GÜÇLÜ, muhtemelen sorunsuz) —
  ama bu sadece "bas+akustik"/"bas+clean" çiftlerinin "ilk vuruş kesik"
  RAPORLANMAMIŞ olmasıyla (görevde sadece snare çiftleri için rapor edilmiş)
  TUTARLI, ayrıca doğrulanmadı.

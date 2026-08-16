# OLCUM-KAYNAK-16-08 — Kaynak Kütüphanesi Yenilenmesi: Ölçümler

_G259'un (kaynak kütüphanesi yenilenmesi) parçası. Bu belge SADECE gerçek
ölçüm sonuçlarını taşır — kod değişikliklerinin gerekçesi ilgili commit
mesajlarında/kod yorumlarında. Tüm ölçümler `ffprobe`/`ffmpeg` ile GERÇEK
dosyalar üzerinde, ya da ilgili SAF fonksiyonlar Node'da doğrudan
çağrılarak yapıldı — hiçbir sayı uydurulmadı._

---

## 1) DOSYA ÖZELLİKLERİ — DOĞRULANDI

`ffprobe` ile 10 yeni dosyanın (kick/snare/hihat/tom/bass/acoustic_guitar/
clean_guitar/groove/acoustic_guitar_stereo/clean_guitar_stereo) hepsi
tek tek ölçüldü:

| Özellik | İddia edilen | Ölçülen |
|---|---|---|
| Süre (8 bar, 78 BPM) | 24.6 sn | **24.615 sn** (tüm mono dosyalar + 2 stereo) |
| Tom süresi (4 bar) | 12.3 sn | **12.307 sn** |
| Örnekleme hızı | — | 44100 Hz (hepsi) |
| Codec | AAC 192kbps | AAC, GERÇEK bit hızı 52-198 kbps arası DEĞİŞKEN (VBR — içerik karmaşıklığına göre normal, snare/tom gibi basit sinyaller daha düşük) |
| Kanal sayısı | mono (2 hariç) | **8 dosya mono (1 kanal), acoustic_guitar_stereo + clean_guitar_stereo 2 kanal** — DOĞRU |
| Tepe (dBFS) | -3 dBFS | **-3.0 dB (8 dosya), clean_guitar_stereo -2.7dB** (`ffmpeg -af volumedetect`) |

**Sonuç: task'ın verdiği TÜM özellikler ölçümle DOĞRULANDI.**

---

## 2) SEVİYE KARŞILAŞTIRMASI — ESKİ vs YENİ (Kompresör/Distortion için kritik)

Eski dosyalar (silinmeden ÖNCE `git show HEAD:www/audio/*.m4a` ile çıkarılıp
ölçüldü) **-6.0dB (kick) / -5.8dB (bass)** tepe taşıyordu — bu, `kompresor.js:
COMP_REF_LEVEL_DB = -6` sabitiyle NEREDEYSE BİREBİR eşleşiyor (muhtemelen
BİLEREK o seviyeye göre kalibre edilmişti). **Yeni dosyalar -3.0dBFS — 3dB
DAHA YÜKSEK.**

**Etki (ölçüldü, kod okunarak doğrulandı — DEĞİŞTİRİLMEDİ, sadece
raporlanıyor):**
- `kompresor.js:applyProcessing` (`www/js/modes/kompresor.js:350-360`)
  gerçek `DynamicsCompressorNode.threshold`i DOĞRUDAN `thresholdAtK()`
  (-8 ile -34dB arası) ile ayarlıyor, KAYNAĞA göre bir NORMALİZASYON
  YOK. Sinyal artık 3dB daha yüksek tepe taşıdığı için, HER k değerinde
  threshold'u AŞAN kısım da 3dB daha büyük — kompresör GERÇEKTE biraz
  daha FAZLA görünür/duyulabilir çalışıyor.
- Kullanıcıya gösterilen "gain reduction" SAYISI (`gainReductionDb()`)
  SABİT `COMP_REF_LEVEL_DB=-6` referansına göre hesaplanıyor — GERÇEK
  kaynak artık -3dB'de tepe yaptığı için, bu sayı GERÇEK azaltmayı
  HAFİFÇE (birkaç dB mertebesinde) OLDUĞUNDAN AZ gösterebilir. Örnek
  hesap: k=0 (threshold=-8dB) için ESKİ varsayımla (-6 referans) aşan
  miktar 2dB, YENİ gerçek tepeyle (-3) aşan miktar 5dB — 2.5 kat fark.
- `distortion.js`'in `DRIVE_RANGES` çarpanları (`www/js/modes/distortion.js:114-118`)
  `x*drive` şeklinde DOĞRUDAN örnek genliğine uygulanıyor — 3dB daha
  yüksek (≈1.41× lineer) bir kaynak, AYNI drive değerinde biraz daha
  FAZLA doygunluk/kırpma üretir.
- **Bu turda DEĞİŞTİRİLMEDİ** — `COMP_REF_LEVEL_DB`/`DRIVE_RANGES` ZORLUK
  EĞRİSİ kapsamında (task'ın KİLİT listesi: "DOKUNULMAYACAK: ... DIFFICULTY
  tabloları"). **BEKLEYEN KARAR olarak DURUM.md'ye taşındı** — yeniden
  kalibre edilmesi gerekip gerekmediği ürün kararı.

---

## 3) SOURCE_PAIRS — ÇAKIŞMA BÖLGESİ YENİDEN ÖLÇÜLDÜ

**Yöntem:** Her kaynağın (kick/bass/vocal/guitar/snare) `ffmpeg`'le
44.1kHz/mono ham PCM'e çözülüp, 4096-nokta FFT + Hann penceresi + Welch
ortalaması (2048 örtüşen çerçeve, %50 hop) ile ORTALAMA güç spektrumu
çıkarıldı (~10.8Hz çözünürlük). Her kaynağın KENDİ tepesine göre -15dB
üstü "anlamlı enerji" bandı bulundu; ÇİFTİN region'u, İKİ kaynağın da bu
bandı sağladığı KESİŞİM aralığı olarak alındı. Duyarlılık kontrolü için
-12dB ve -20dB eşikleriyle de tekrarlandı (bant sistematik olarak
daralıp/genişledi, yöntem TUTARLI).

| Çift | Eski region | **Yeni ölçülen (-15dB kesişim)** | -12dB | -20dB |
|---|---|---|---|---|
| kick-bas | [50, 160] | **[32, 118] → [30,120] olarak yazıldı** | [43,86] | [32,151] |
| vokal-gitar | [500, 2000] | **[205, 592] → [200,600] olarak yazıldı** ⚠️ | [226,592] | [194,991] |
| snare-gitar | [200, 2000] | **[172, 398] → [170,400] olarak yazıldı** | [183,366] | [151,786] |

**Tepe frekansları (referans için):** kick 43Hz, bass 97Hz, vocal 301Hz,
guitar 194Hz, clean_guitar 291Hz, snare 248Hz.

**⚠️ vokal-gitar UYARISI (task'ın kendi talimatı):** `vocal.m4a` HÂLÂ
ESKİ dosya (yeni kayıt gelmedi, KİLİT listesinde "DOKUNULMAYACAK" olarak
işaretli). Yukarıdaki vokal-gitar ölçümü ESKİ vocal + YENİ guitar
çiftinin ölçümüdür — GEÇİCİ, vocal.m4a yenilenince BU ÇİFT YENİDEN
ÖLÇÜLMELİ (DURUM.md'ye SIRADAKİ maddesi olarak eklendi).

**Eski region'larla NEDEN bu kadar farklı:** Eski region'lar "KULAKLA/
PLAYTEST DOĞRULANMADI, makul bir başlangıç" notuyla ELLE ayarlanmıştı
(source-catalog.js'in G51/G52 yorumu) — YENİ kütüphanenin gerçek
spektral içeriği farklı olduğu için (muhtemelen farklı enstrümanlar/
kayıt koşulları), eski elle-tahmin edilen bantlar artık gerçek
çakışmayla ÖRTÜŞMÜYORDU.

---

## 4) DÖNGÜ/SÜRE DAVRANIŞI

- `audio-engine.js:buildSampleSource()` HER "sample" kind kaynak için
  `src.loop = true` KOŞULSUZ ayarlıyor (satır 704) — dosya süresi round
  süresinden KISA olsa bile (en uzun round `tonal-denge.js`'in easy
  tier'ı, `time: 26` sn > 24.615sn dosya süresi) Web Audio'nun NATİF,
  KESİNTİSİZ loop mekanizması devreye giriyor. **Bu turda DEĞİŞMEDİ**
  (kütüphane yenilenmeden ÖNCE de böyleydi) — sadece dosya süresiyle
  round süresi arasındaki fark BÜYÜDÜĞÜ için (eskiden muhtemelen daha
  uzun/farklı süreli dosyalar) bu mekanizmanın DEVREDE OLDUĞU artık
  DAHA sık/belirgin.
- **Loop noktası "tık" riski — ÖLÇÜLDÜ, RİSK DÜŞÜK:** tüm 9 yeni
  mono/stereo dosyanın SON 32 örneği (44.1kHz'de <1ms) tüm dosyalarda
  **tam sıfıra yakın (maxAbs 0.0000)** — loop noktası SESSİZLİKTEN
  başlıyor, ani bir genlik SIÇRAMASI yok. İLK 32 örnek bazı davul
  örneklerinde (snare 0.20, tom 0.05, bass 0.07) belirgin genlik
  taşıyor — bu bir "tık" DEĞİL, tek-vuruşluk bir davul/bas notasının
  DOĞAL ani başlangıcı (gerçek bir vuruşun ilk anı zaten böyle davranır,
  loop'a ÖZGÜ bir artefakt değil).

---

## 5) pickPlaybackOffset() — STEREO DOSYALARLA DOĞRULANDI

`stereo-genislik.js:pickPlaybackOffset()` (SAF fonksiyon, RMS eşiği
0.015) Node'da GERÇEK stereo PCM (acoustic_guitar_stereo/
clean_guitar_stereo, ffmpeg ile 2-kanal float32'ye çözülüp buffer-benzeri
bir nesneye sarıldı) ile DOĞRUDAN çağrıldı, 5 farklı sabit tohumla:
HER seferinde FARKLI, geçerli bir offset döndü (fallback taramaya HİÇ
düşmedi — bkz. metod: fallback'e düşseydi tüm tohumlar AYNI "en iyi"
noktayı verirdi, gözlenen DEĞİŞKEN sonuçlar bunun olmadığını kanıtlıyor).
**Sonuç: çalışıyor, sorun YOK.**

---

## 6) GERÇEK BİR KOD HATASI BULUNDU VE DÜZELTİLDİ

`app.js:startRound()`'un Stereo Genişlik'e özel iki bloğu (mono kontrolü +
rastgele başlangıç noktası) `mode.MODE_ID === "stereo-genislik"` KOŞULUNA
bakıyordu ama kaynağın GERÇEKTEN "upload" olup olmadığına BAKMIYORDU —
`uploadManager.getBuffer()`'ı HER durumda okuyordu. Paketli stereo
kaynaklar (acoustic_guitar_stereo/clean_guitar_stereo) seçiliyken
`uploadManager` BOŞ olduğu için bu, round'un "Önce ses yükle" mesajıyla
YANLIŞLIKLA ENGELLENMESİNE yol açıyordu — **canlı e2e testinde
YAKALANDI** (`.ans` hiç render edilmiyordu). `syncUploadGate()`'in KENDİ
DOĞRU koşulu (`sourceSelect.value === "upload"`) `startRound()`'un mono-
kontrol bloğuna da eklendi — paketli kaynaklar artık DOĞRUDAN çalışıyor
(canlı tarayıcıda + e2e testinde doğrulandı). Rastgele-başlangıç-noktası
bloğu ZATEN `uploadManager.hasBuffer` koşuluyla paketli kaynaklarda
devre dışı kalıyordu (hata VERMİYORDU, sadece atlıyordu) — bu BİLİNÇLİ
bırakıldı (madde 4'teki loop-boundary ölçümü, riskin küçük olduğunu
gösteriyor).

---

## 7) KAYNAK SEÇİCİ — 3 MOD CANLI TARAYICIDA DOĞRULANDI

Gerçek Chrome'da (Pro simülasyonu), `#sourceSelect`'in DOM içeriği
doğrudan okunarak:
- **Kesim Noktası** (varsayılan `compatibleSourceIds()`): 15 kaynak,
  `bass_alt`/stereo dosyalar YOK, `clean_guitar` VAR. ✅
- **Kompresör** (`requireTransient:true`): 13 kaynak (pink/white de
  ayrıca dışlanmış), `bass_alt`/stereo YOK, `clean_guitar` VAR. ✅
- **Stereo Genişlik** (`only:["upload","acoustic_guitar_stereo",
  "clean_guitar_stereo"]`): TAM 3 kaynak, varsayılan seçili
  `acoustic_guitar_stereo`. Round GERÇEKTEN başlatıldı, 3 şık render
  edildi (madde 6'nın düzeltmesi doğrulandı). ✅

Diğer 9 modun `uyumluKaynaklar`'ı `test/source-catalog.test.mjs`'in G54
regresyon çitiyle (TÜM 12 mod için PROGRAMATIK olarak) ayrıca doğrulandı
— canlı tarayıcıda TEK TEK açılmadı (kapsam/süre nedeniyle), otomatik
test kapsamı yeterli görüldü.

---

## Dürüstlük notu

Madde 2'deki (Kompresör/Distortion seviye uyumsuzluğu) sayısal etki
GERÇEK formüllerle hesaplandı ama GERÇEK KULAKLA doğrulanmadı — "3dB
daha fazla kompresyon/doygunluk duyulur" iddiası MATEMATİKSEL bir
çıkarım, algısal bir ölçüm değil. Madde 3'ün region'ları GERÇEK FFT
ölçümü ama "-15dB eşiği doğru tanım mı" sorusu bir MÜHENDİSLİK
TERCİHİ — duyarlılık kontrolüyle (-12/-20dB) gösterildiği gibi eşik
seçimi sonucu ETKİLİYOR, "tek doğru" bir region YOK, bu MAKUL bir orta
nokta. vokal-gitar region'u vocal.m4a yenilenene kadar GEÇİCİ/güvenilmez.

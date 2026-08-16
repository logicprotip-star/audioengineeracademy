# OLCUM-OGRETIM-15-08 — Fletcher-Munson ve Boost/Cut Asimetrisi Ölçümü

_Kapsam: SADECE ÖLÇÜM, kod YAZILMADI. G242/G243 (A/B loudness eşitleme +
convolver normalize düzeltmesi) bu turdan ÖNCE, AYRI commit'lerde
tamamlandı — bu iki ölçüm onların ÜZERİNE, "yapılmalı mı" sorusuna
cevap arıyor, uygulama YOK._

---

## ÖLÇÜM 1 — FLETCHER-MUNSON / EŞ SESLİLİK AĞIRLIKLANDIRMASI

### Hangi frekans aralığında, hangi gain değerleriyle soru soruluyor — TAM TABLO

**Frekans aralığı — SABİT, seviyeden BAĞIMSIZ:** `frekans-bulma.js:223`
— `FA_MIN=80, FA_MAX=17000` (Hz). `createQuestion()`'da `range =
settings.focusRange || [FA_MIN, FA_MAX]` — odak aralığı (Ayarlar'dan
seçilebilen bölgesel filtre) VERİLMEDİĞİ sürece HER seviyede AYNI
80Hz-17kHz aralığı kullanılıyor, seviye SADECE gain/Q'yu değiştiriyor,
aralığı DARALTMIYOR (grep ile doğrulandı, `paramsForDifficultyPosition`
frekans aralığına hiç dokunmuyor).

**Gain (dB) ve Q — sürekli eğri (`DIFFICULTY_CONFIG`, logaritmik
enterpolasyon, `logLerp(atLevel1, atCap, t)`, `t=(level-1)/19`,
LEVEL_CAP=20), HESAPLANDI:**

| Seviye | Gain (dB, boost/cut büyüklüğü) | Q (bant darlığı) |
|---|---|---|
| 1 | 10.000 | 0.800 |
| 2 | 9.386 | 0.881 |
| 3 | 8.810 | 0.970 |
| 4 | 8.269 | 1.068 |
| 5 | 7.761 | 1.177 |
| 6 | 7.285 | 1.296 |
| 7 | 6.837 | 1.427 |
| 10 | 5.654 | 1.906 |
| 15 | 4.118 | 3.087 |
| 20 (tavan) | 3.000 | 5.000 |

(`GAIN_DB_AT_1=10, GAIN_DB_AT_CAP=3, Q_AT_LEVEL_1=0.8, Q_AT_CAP=5.0` —
`difficulty-curve.js`'ten okundu, hesap `node`'da doğrudan çalıştırılarak
DOĞRULANDI, tahmini değil.)

**Statik `DIFFICULTY` tablosu (Sabit mod çapası, eğriden BAĞIMSIZ,
hâlâ kullanımda) — referans için:** easy: gain=10/Q=0.9, medium:
gain=8/Q=1.3, hard: gain=6/Q=2.5, pro: gain=4.5/Q=4.2. (TAM-LISTE
karar P'nin "Q=2.5" kaynağı burada — hard tier.)

### Ağırlıklandırma eklenirse hangi eğri kullanılmalı, hangi referans seviyede

**En uygun aday: ISO 226:2003 eş-seslilik eğrileri (equal-loudness
contours), Fletcher-Munson'ın MODERN/güncellenmiş standardı.** ISO
226:2003, orijinal Fletcher-Munson (1933) ve Robinson-Dadson (1956)
ölçümlerinden DAHA GÜNCEL/hassas kabul edilir, birden fazla fon
(phon) seviyesi için ayrı eğri sunar (ör. 40 phon, 60 phon, 80 phon —
sessiz/orta/yüksek dinleme seviyelerinde KULAK duyarlılığı FARKLI
şekillerde değişir, tek bir eğri YETERSİZ kalır). **Referans seviye
sorusu KRİTİK ve BU ORTAMDAN ÇÖZÜLEMEZ:** bir mobil uygulamanın
çıkış seviyesi kullanıcının CİHAZ SESİ AYARINA bağlı — hangi phon
eğrisinin "doğru" olduğu, kullanıcının GERÇEK dinleme seviyesini
BİLMEDEN belirlenemez (40 phon eğrisi ile 80 phon eğrisi ORTA-BAS
bölgesinde BELİRGİN farklı davranır). **Alternatif/basitleştirilmiş
seçenek: A-ağırlıklandırma (A-weighting, IEC 61672)** — tek bir sabit
eğri (phon-bağımsız), ISO 226'dan DAHA BASİT ama daha KABA bir
yaklaşım (orijinal olarak SES ÖLÇÜM CİHAZLARI için, düşük seviye
sesler için tasarlandı, müzik/geniş-bant program materyali için TAM
UYGUN değil). **Bu ölçümün kendi önerisi (BELİRSİZ, kulakla playtest
gerektirir):** A-weighting, tek-eğri basitliği + iyi bilinen/
standartlaştırılmış formülü nedeniyle UYGULAMA KARMAŞIKLIĞI açısından
daha ucuz bir başlangıç noktası olabilir — ama ISO 226'nın phon-bazlı
hassasiyetinin GERÇEKTEN gerekip gerekmediği KESİN DEĞİL.

### Eklenirse zorluk dengesi nasıl kayar

Eş-seslilik eğrilerinin TEMEL şekli: kulak **1-5 kHz aralığında EN
HASSAS** (4 kHz civarı dip/en hassas nokta), **düşük frekanslarda
(80-200 Hz) VE çok yüksek frekanslarda (10-17 kHz) DAHA AZ hassas**.
Bu app'in mevcut sistemi frekanstan BAĞIMSIZ SABİT gain/Q kullandığı
için:
- **Kolaylaşacak bölgeler (şu an OLDUĞUNDAN daha kolay algılanacak
  hale gelmemeli, ama GERÇEK zorlukları AÇIĞA ÇIKACAK):** 1-5 kHz
  aralığındaki sorular — kulak zaten en hassas olduğu için, eğer
  ağırlıklandırma "aynı ALGISAL zorluğu korumak için buradaki gain'i
  KÜÇÜLT" yönünde uygulanırsa, bu bölge GERÇEKTEN daha zor sorular
  alacak (mevcut sabit gain'le OLDUĞUNDAN daha kolaydı).
- **Zorlaşacak/kolaylaşacak bölgeler (ters yönde):** 80-200 Hz (SUB/
  BAS) ve 10-17 kHz (TİZ) — kulak burada daha az hassas olduğu için,
  eğer ağırlıklandırma "algısal zorluğu sabit tutmak için buradaki
  gain'i BÜYÜT" yönünde uygulanırsa, bu bölgeler ÖNCEDEN olduğundan
  KOLAYLAŞIR (aynı dB'de daha az duyulur olduğu ZATEN biliniyor,
  telafi edilirse artık daha "adil" duyulur hale gelir) — YANİ mevcut
  sistemde BU bölgeler muhtemelen OLDUĞUNDAN DAHA ZOR (task'ın kendi
  varsayımıyla TUTARLI, TUR8'in C bölümü bulgusu).
- **Net sonuç:** ağırlıklandırma eklenirse zorluk dengesi TÜM 6
  frekans bölgesi arasında (SUB/BAS/ALT-ORTA/ORTA/ÜST-ORTA/TİZ) DAHA
  EŞİT hale gelir — şu anki durumda kullanıcı SUB/TİZ bölgelerinde
  "ben kötüyüm" hissi yaşayabilir, ama bu ONUN kulağı DEĞİL, sorunun
  o bölgede objektif olarak DAHA ZOR olması.

### Z1-Z7 eğrisinin yeniden kalibre edilmesi gerekir mi

**EVET, muhtemelen — ama BU TURDA KESİNLEŞTİRİLEMEZ.** Ağırlıklandırma
eklenirse `GAIN_DB_AT_1=10`/`GAIN_DB_AT_CAP=3` sabitleri ARTIK TÜM
frekans aralığı için "doğru" olmayacak — her frekans BÖLGESİNİN
KENDİ telafi katsayısıyla ÇARPILMIŞ bir efektif gain'e ihtiyacı
olacak. Bu, mevcut TEK SAYILIK `GAIN_DB_AT_LEVEL_1`/`GAIN_DB_AT_CAP`
yapısının FREKANSA BAĞIMLI bir fonksiyona dönüşmesi anlamına gelir
— **DIFFICULTY_CONFIG'in KENDİSİ değişmeden KALAMAZ**, bu yüzden
task'ın "DOKUNULMAYACAK: zorluk eğrisi (Z1-Z7)" kısıtı bu özelliğin
KENDİSİYLE DOĞRUDAN ÇATIŞIR — Fletcher-Munson eklemek, tanım gereği
zorluk eğrisine dokunmak demektir. **Bu iş kalibrasyon AÇISINDAN
"1.1'e bırakılabilir, ayrı ve DAHA BÜYÜK bir iş" kategorisinde.**

### İş yükü: kaç dosya, kaç satır, hangi testler etkilenir

**Tahmini (ölçülmedi, mimariden ÇIKARILDI):**
- **`core/` içinde YENİ bir dosya** (ör. `core/equal-loudness.js`) —
  ISO 226 ya da A-weighting tablosunun/formülünün SAF fonksiyon
  implementasyonu. `core/eq-loudness.js`'in (Düzeltme 1'in RBJ
  matematiği) AYNI "SAF, test edilebilir" deseniyle, ~100-200 satır
  tahmini.
- **`www/js/core/difficulty-curve.js`** — `GAIN_DB_AT_1`/`GAIN_DB_AT_CAP`'in
  frekans-bağımlı hale gelmesi (mimari değişiklik, DOKUNULMAYACAK
  kısıtıyla ÇATIŞAN kısım) — ~50-100 satır tahmini, YÜKSEK risk (mevcut
  `difficulty-curve.test.mjs`'in İLGİLİ TÜM testleri etkilenir, bu
  dosyanın 20+ testi olduğu bu turda TEK TEK sayılmadı).
- **`www/js/modes/frekans-bulma.js`** — `createQuestion()`'ın
  `resolvedGain`'i artık frekansa göre TELAFİ EDİLMİŞ bir değer
  hesaplamalı — ~20-30 satır.
- **`test/frekans-bulma.test.mjs`** — mevcut gain/Q testleri (bu turda
  TAM sayılmadı) muhtemelen GÜNCELLENMELİ (artık "AYNI seviyede AYNI
  gain" invaryantı FREKANSA GÖRE DEĞİŞEN bir gain'e dönüşür).
- **`test/difficulty-curve.test.mjs`** — aynı şekilde etkilenir.
- **BELİRSİZ, ölçülmedi:** diğer 11 modun HANGİLERİNİN benzer bir
  frekans-bağımlı gain kullandığı (Kesim Noktası/Q Genişliği/Boost-
  Cut/dB Seviyesi hepsi frekans parametresi taşıyor) — eğer TUTARLILIK
  isteniyorsa (aynı ilke TÜM modlara uygulanmalı), iş yükü BU turda
  tahmin edilenin 3-4 KATINA çıkabilir. **Bu ölçüm SADECE Frekans
  Bulma'yı kapsıyor, diğer modlara genelleme YAPILMADI.**

**Toplam tahmini büyüklük: ORTA-BÜYÜK bir iş** (yeni modül + mevcut
zorluk eğrisi mimarisinde YAPISAL değişiklik + çok sayıda test
güncellemesi) — "birkaç satırlık düzeltme" DEĞİL, Düzeltme 1/2'den
(her biri tek bir odaklı değişiklik) NİTELİKSEL OLARAK FARKLI, DAHA
BÜYÜK bir kapsam.

### Rakipler (SoundGym, Quiztones, TrainYourEars) bunu yapıyor mu

**BELİRSİZ — doğrudan doğrulanamadı.** Web araması (bu turda yapıldı)
bu üç ürünün KENDİ teknik EQ-üretim algoritmalarını (frekans-bağımlı
ağırlıklandırma kullanıp kullanmadıklarını) AÇIKLAYAN hiçbir kaynak
bulamadı — bu bilgi genelde ürünlerin kapalı kaynak kodunda, herhangi
bir teknik dokümantasyon/blog yazısı YAYINLANMAMIŞ görünüyor (üçü de
"kritik dinleme becerisi" pazarlıyor ama METODOLOJİ detaylarını
paylaşmıyor). **Genel izlenim (KESİN DEĞİL, doğrudan ürün incelemesi
YAPILAMADI):** tüketici/prodüktör-yönelimli EQ kulak eğitimi
kategorisinde frekans-bağımlı psikoakustik ağırlıklandırma YAYGIN bir
özellik olarak BİLİNMİYOR/reklamı yapılmıyor — ama bu YOK oldukları
anlamına GELMEZ, sadece PAZARLAMA metinlerinde ÖNE ÇIKARILMADIĞI
anlamına gelir. **Sonuç: rakip karşılaştırması bu ölçümün cevaplayamadığı
bir soru, "BELİRSİZ" olarak bırakılıyor.**

### SONUÇ — yapılmalı mı, ne kadar iş, hangi riskler

**Yapılmalı mı:** Pedagojik olarak SAVUNULABİLİR (TUR8'in 🔴 bulgusu
gerçek bir eksiklik) ama **ACİL DEĞİL** — mevcut sistem YANLIŞ bir
şey ÖĞRETMİYOR, sadece zorluk dağılımı frekans bölgeleri arasında
EŞİT değil (kullanıcı bunun FARKINA bile varmayabilir, sadece "bazı
bölgelerde daha kötüyüm" hissi oluşabilir — bu KENDİ İÇİNDE ciddi bir
itibar riski DEĞİL, A/B loudness sorunu kadar "yanlış öğretiyor"
kategorisinde değil). **Ne kadar iş:** ORTA-BÜYÜK, tek oturumda
bitmez — YENİ bir modül + `difficulty-curve.js`'in YAPISAL değişimi +
çoklu test güncellemesi gerektirir, kapsamı bu turun DOKUNULMAYACAK
listesindeki "zorluk eğrisi (Z1-Z7)"yle DOĞRUDAN ÇAKIŞIR. **Risk:**
mevcut, İYİ TEST EDİLMİŞ zorluk eğrisi mimarisine (Z1-Z7, DIFFICULTY
tabloları) dokunmak GEREKİYOR — bu, task'ın kendi "DOKUNULMAYACAK"
kısıtının NEDEN olduğu riski TAM OLARAK gösteriyor, AYRI ve DİKKATLİ
planlanmış bir iş olarak ELE ALINMALI, bugünün iki dar-kapsamlı
düzeltmesiyle (G242/G243) AYNI turda YAPILMAMALIYDI (yapılmadı da).

---

## ÖLÇÜM 2 — BOOST/CUT ASİMETRİSİ

### Boost mu Cut mu modu hangi gain değerlerini kullanıyor — TAM TABLO

**Yön seçimi — TAM SİMETRİK, KANITLANDI:** `boost-mu-cut-mu.js:319`
— `direction = Math.random() < 0.5 ? 1 : -1` — %50/%50 yazı-tura,
büyüklük (`pickGainDb(baseGain)`) yönden TAMAMEN BAĞIMSIZ hesaplanıp
SONRADAN işaretleniyor (`gainDb = pickGainDb(baseGain) * direction`).
**Boost ve cut, HER seviyede TAM AYNI mutlak büyüklüğü kullanıyor.**

**Büyüklık eğrisi (`BOOSTCUT_CURVE_CONFIG`, `GAIN_DB_AT_1=8.0,
GAIN_DB_AT_CAP=1.4`, LEVEL_CAP=20), HESAPLANDI:**

| Seviye | \|gainDb\| (boost VE cut, AYNI) |
|---|---|
| 1 | 8.000 |
| 2 | 7.299 |
| 3 | 6.659 |
| 4 | 6.075 |
| 5 | 5.543 |
| 6 | 5.057 |
| 7 | 4.614 |
| 10 | 3.504 |
| 15 | 2.215 |
| 20 (tavan) | 1.400 |

(GAIN_DB_FLOOR=1.0 — task'ın kendi notu: "kulağın mix bağlamında
GERÇEKTEN ayırt edebildiği kabul edilen en küçük boost/cut, KESİN
ölçülmedi" — dürüstçe işaretlenmiş, TUR8'in dB Seviyesi bulgusuyla
AYNI kategori bir belirsizlik.)

### Asimetri gerçekte ne kadar? Kaynak/ölçüm var mı

**Web araması yapıldı (bu turda) — TEK, evrensel kabul görmüş bir dB
katsayısı BULUNAMADI.** Bulunanlar:
- Mixing pratiğinde YAYGIN bir kural ("subtractive EQ'nun additive'e
  tercih edilmesi", "boost'tan önce cut düşün") — ama bu bir
  ALGISAL BÜYÜKLÜK KATSAYISI değil, bir İŞ AKIŞI/tını tercihi kuralı.
- FabFilter'ın kendi "Science of Sound" eğitim içeriği frekans-
  loudness ilişkisini (Fletcher-Munson) anlatıyor ama boost/cut
  asimetrisine özel bir katsayı VERMİYOR.
- Akademik bir kaynak (arXiv, "Effect of Pitch on the Asymmetry in
  Global Loudness Between Rising- and Falling-Intensity Sounds")
  loudness asimetrisinin GERÇEK, ölçülmüş bir fenomen olduğunu
  gösteriyor — **ama bu ZAMANLA (rising/falling intensity, yani bir
  sesin SÜRE İÇİNDE yükselip alçalması) ilgili, STATİK bir EQ boost/
  cut karşılaştırmasıyla BİREBİR AYNI fenomen DEĞİL** — İLİŞKİLİ
  olabilir (ikisi de "artan enerji ile azalan enerjinin FARKLI
  algılandığı" temasını paylaşıyor) ama DOĞRUDAN bir dB dönüşüm
  katsayısı bu kaynaktan ÇIKARILAMAZ. **Sonuç: "kaç dB" sorusunun
  KESİN bir cevabı YOK, literatürde TEK bir sayı ÜZERİNDE mutabakat
  BULUNAMADI — task'ın kendi kuralı gereği burada BELİRSİZ bırakılıyor.**

### Telafi uygulanırsa nasıl olmalı — cut mı büyütülmeli, boost mu küçültülmeli

**KESİN cevap YOK (yukarıdaki kaynak eksikliği nedeniyle) ama
SAVUNULABİLİR bir YÖN var:** Mixing pratiğinde YAYGIN kanı (bu
ölçümün web aramasıyla TEYİT edemediği ama genel endüstri bilgisiyle
TUTARLI bir varsayım, KESİN DEĞİL) cut'ların boost'lardan DAHA AZ
belirgin/fark edilir olduğu yönünde — bu doğruysa, telafi CUT
büyüklüğünü BÜYÜTMEK (aynı "algısal zorluk" için cut'ın boost'tan
BİRAZ daha fazla dB olması) yönünde olurdu. **Ama bu KESİN bir
katsayı ÖNERİSİ DEĞİL** — gerçek oran ancak KULAKLA/kullanıcı
testiyle (A/B karşılaştırmalı playtest, "X dB boost ile Y dB cut
AYNI zorlukta mı" diye SORULARAK) belirlenebilir, bu turda
YAPILMADI/YAPILAMAZ.

### Düzeltme 1'in (loudness eşitleme) bu sorunu KISMEN çözüp çözmediği — DOĞRUDAN KONTROL EDİLDİ

**KISMEN çözüyor, ama FARKLI bir katmanda — ikisi İLİŞKİLİ ama AYNI
SORUN DEĞİL:**
- Düzeltme 1 (G242) **loudness/RMS boyutunu** ele alıyor — telafi
  SONRASI +6dB boost ile -6dB cut'ın GENEL SES SEVİYESİ artık
  ÖLÇÜLEBİLİR şekilde EŞİT (bkz. G242'nin kabul kriteri testi). Bu,
  "hangisi daha yüksek sesli" kısayolunu KAPATIYOR — GERÇEK bir
  katkı.
- **AMA** bu ölçümün sorduğu asimetri **loudness'tan FARKLI bir
  fenomen**: bir boost'un yarattığı SPEKTRAL "TEPE" (peak, komşu
  frekanslardan BELİRGİN şekilde AYRILAN bir çıkıntı) ile bir cut'ın
  yarattığı "ÇUKUR" (notch, komşu enerjiye/maskelemeye karşı DAHA
  KOLAY GİZLENEBİLİR) arasındaki TİMBRAL/SPEKTRAL fark — Düzeltme 1
  SADECE GENEL SEVİYEYİ eşitliyor, bu SPEKTRAL GÖRÜNÜRLÜK farkına
  HİÇ DOKUNMUYOR (RBJ matematiği loudness'ı telafi ediyor, filtrenin
  ŞEKLİNİ değiştirmiyor — boost hâlâ bir tepe, cut hâlâ bir çukur).
  **Sonuç: Düzeltme 1, asimetrinin BİR BOYUTUNU (loudness) KAPATTI,
  DİĞER BOYUTUNU (spektral görünürlük/maskeleme) HİÇ ETKİLEMEDİ —
  "kısmen çözüyor" DOĞRU bir çerçeveleme.**

### İş yükü ve risk

**Eğer telafi uygulanacaksa (cut'ı büyütmek yönünde):**
- **Küçük, dar kapsamlı bir değişiklik olabilir** — `BOOSTCUT_CURVE_CONFIG`'e
  TEK bir çarpan eklenip `direction===-1` durumunda `gainDb`'ye
  uygulanması yeterli olurdu (~10-15 satır, `boost-mu-cut-mu.js`
  içinde) — Ölçüm 1'in aksine, bu değişiklik `difficulty-curve.js`'in
  PAYLAŞILAN mimarisine dokunmadan, TEK bir mod dosyası İÇİNDE
  yapılabilir (DOKUNULMAYACAK kısıtıyla ÇATIŞMAZ, çünkü zorluk
  eğrisinin KENDİSİ değil, sadece o modun yön-BAĞIMLI son işaretlemesi
  değişir).
- **Risk: KATSAYI TAHMİNİ olur** — yukarıda gösterildiği gibi
  literatürde KESİN bir sayı YOK, seçilecek katsayı (ör. "cut'ı
  %20 büyüt") CLAUDE.md'nin "sayı uydurma" ilkesiyle DOĞRUDAN
  ÇATIŞIR — kulakla/playtest OLMADAN uygulanırsa yeni bir TAHMİNİ
  sabit eklenmiş olur, mevcut `GAIN_DB_FLOOR`/`DB_FLOOR` gibi
  "KESİN ölçülmedi" notuyla işaretlenen diğer sabitlerle AYNI
  kategoriye düşer — KABUL EDİLEBİLİR (kodun kendi dürüstlük geleneği
  buna izin veriyor, TEK ŞART açıkça "playtest'le doğrulanmadı"
  diye işaretlenmesi) ama YENİ bir varsayım katmanı.

### SONUÇ — yapılmalı mı, ne kadar iş

**Yapılmalı mı:** BELİRSİZ/ürün kararı — literatürde KESİN bir
katsayı olmadığı için "doğru" bir düzeltme YOK, sadece "makul bir
tahmin + kulakla doğrulama" YAPILABİLİR. Düzeltme 1 zaten EN CİDDİ
boyutu (loudness kısayolu) KAPATTI — kalan spektral-görünürlük
asimetrisi DAHA İNCE bir sorun, muhtemelen 1.1'e bırakılabilir.
**Ne kadar iş:** KÜÇÜK (Ölçüm 1'in aksine `difficulty-curve.js`
mimarisine dokunmuyor) — AMA kod yazmadan ÖNCE kullanıcının "hangi
yönde, ne kadar" kararını vermesi GEREKİYOR (tahmini bir sabit
seçmek YERİNE).

---

# YARIN KULAKLA DOĞRULANMASI GEREKENLER

1. **G242 (A/B loudness eşitleme)** — Boost mu Cut mu/Frekans Bulma/
   Kesim Noktası/Q Genişliği'nde A/B geçişinde artık GERÇEKTEN
   "aynı seviyede" duyulup duyulmadığı — RBJ hesabı matematiksel
   olarak doğru (testlerle kanıtlandı) ama GERÇEK kulakla algısal
   sonucun BEKLENDİĞİ gibi olduğu TEYİT edilmeli.
2. **G243 (convolver normalize=false)** — Reverb'de Room/Hall/Plate
   arasındaki YENİ (artık bastırılmamış) enerji farkının çıkışta
   RAHATSIZ EDİCİ derecede yüksek/düşük bir seviyeye SIÇRAMADIĞI
   doğrulanmalı (wet/dry oranı KOD SEVİYESİNDE değişmedi ama MUTLAK
   çıkış seviyesi artık FARKLI, bu ÖNGÖRÜLEN ve İSTENEN bir değişiklik
   — sadece AŞIRI/rahatsız edici OLMADIĞI teyit edilmeli).
3. **Fletcher-Munson (Ölçüm 1)** — Frekans Bulma'da SUB (80-160Hz) ve
   TİZ (10-17kHz) bölgelerindeki soruların ORTA bölgeye (1-5kHz) göre
   GERÇEKTEN daha zor ALGILANDIĞI (kullanıcı raporu/gözlemle) teyit
   edilmeli — bu ölçüm SADECE teoriden çıkarım yaptı, gerçek kullanıcı
   verisi YOK.
4. **Boost/Cut asimetrisi (Ölçüm 2)** — AYNI |gainDb| değerindeki bir
   boost ile bir cut'ın (G242 SONRASI, loudness eşit olduğu halde)
   GERÇEKTEN farklı zorlukta algılanıp algılanmadığı — eğer FARK
   YOKSA, Ölçüm 2'nin "telafi gerekebilir" varsayımı ÇÜRÜR, ek bir
   iş GEREKMEZ.

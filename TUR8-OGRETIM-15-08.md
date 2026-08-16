# TUR8-OGRETIM-15-08 — Öğretim Doğruluğu Denetimi

_Kapsam: İki belge düzeltmesi (G241, AYRI commit, tamamlandı) + 13
bölümlük (A-M) SADECE ÖLÇÜM denetim. Hedef kitle prodüktör — yanlış
öğretmek itibar riski. Sektör/psikoakustik gerçekliğiyle karşılaştırıldı,
BELİRSİZ olan yerler açıkça işaretlendi._

**Belge düzeltmesi (kod, `G241` commit'i):** `core/progress.js:80-93`
(G238'in yanlış "seviye kilidi" yan-etki iddiası) ve `app.js`'in 4
noktasındaki "sınav sistemi bugün SADECE Kompresör" yorumu (artık 12
modun 12'sinde de aktif) düzeltildi. Sadece yorum metni değişti,
davranış AYNI — `npm test` 1359/1359, değişmedi.

---

## A) A/B SEVİYE EŞİTLEME ⚠️ EN ÖNEMLİ

**🔴 YANLIŞ ÖĞRETİYOR — loudness eşitlemesi YOK, hiçbir modda.**
`audio-engine.js`'in dry/wet zinciri (`localDryGain`/`localWetGain`,
satır ~797-804) SADECE bir ON/OFF crossfade — A/B arasında geçişte
`dryGain`/`wetGain` 0.0001↔1 arası kayıyor, aralarında hiçbir RMS/LUFS
ölçümü ya da telafi kazancı YOK. Paylaşılan `DynamicsCompressorNode`
(threshold -16dB, ratio 2.2) HER İKİ yolun da ÇIKIŞINDA (clipping
güvenliği için) duruyor ama bu bir LOUDNESS EŞİTLEYİCİ DEĞİL — sabit
parametreli genel bir güvenlik sınırlayıcısı, boost/cut miktarına göre
UYARLANMIYOR.

**+6 dB boost yapınca genel seviye artıyor mu — EVET, doğrudan
kanıtlandı:** `frekans-bulma.js:applyProcessing()` `f.gain.value =
question.gain` — düz bir `BiquadFilterNode("peaking")`, hiçbir makeup-
gain/normalize adımı yok. `boost-mu-cut-mu.js` da AYNI desen
(`f.gain.value = question.gainDb`, satır 369) — pozitif değer boost,
negatif cut, ARADA telafi YOK.

**En ciddi somut sonuç — `boost-mu-cut-mu` modunun KENDİSİ:** Bu modun
TEK amacı "boost mu cut mu?" ayrımını KULAKLA yaptırmak
(`trueDirection = question.gainDb>=0 ? "boost":"cut"`) — ama loudness
eşitlemesi olmadığı için kullanıcı SPEKTRAL/TİMBRAL bir yargı yerine
"hangisi DAHA YÜKSEK sesliydi" kısayoluyla da doğru cevaba
ulaşabilir. Bu, mixing pedagojisinin en temel kuralının ("level-
matched A/B, yoksa loudness kazanır" — ABX testlerinin ve
Fletcher-Munson'ın birleştiği klasik tuzak) TAM TERSİNİ öğretiyor
olabilir — kullanıcı "kulağım iyi" sanıp gerçekte sadece ses seviyesi
farkını duyuyor olabilir.

**Diğer modlarda etki derecesi değişir (BELİRSİZ, ölçülemez —
sinyal-bağımlı):** Dar-Q tek-bant peaking filtreler (Frekans Bulma,
Boost/Cut) geniş-bant içerikte (pink noise/müzik) görece küçük RMS
farkı yaratır (Q ne kadar dar, RMS etkisi o kadar az) — ama YİNE DE
sıfır değil, ve `dB Seviyesi` modunda zaten SEVİYE FARKI SORULAN ŞEY
olduğu için bu bölüm ORADA geçersiz (kasıtlı, aşağı bkz.). Kompresör
de RMS'i doğası gereği değiştiriyor (gain reduction) — Bölüm I'de
ayrıca ele alındı.

**Mod bazında özet:**
- 🔴 **Boost/Cut** — sorunun BİZZAT KENDİSİ (yön ayrımı) loudness
  kısayoluna açık, EN CİDDİ örnek.
- 🔴 **Frekans Bulma** — boost'un (Kolay/Orta'da SADECE boost var,
  bkz. `BOOST_ONLY_DIFFICULTIES`) genel seviyeyi artırması "boost
  bulmak" görevini loudness ipucuyla kolaylaştırabilir.
- 🟡 **Kesim Noktası/Q Genişliği** — kesim/bant işlemleri genelde
  seviyeyi biraz DÜŞÜRÜR (ekleme değil çıkarma), yön tersi ama aynı
  kısayol riski (daha sessiz = kesildi).
- 🟢 **dB Seviyesi** — loudness eşitlemesi burada KAVRAMSAL OLARAK
  YANLIŞ olurdu, çünkü sorulan ŞEY zaten seviye farkı — bu mod
  istisna, bulgu geçersiz.
- 🟡 **Kompresör/Reverb/Tonal Denge/Distortion/Stereo Genişlik/Pan
  Konumu/Frekans Çakışması** — bu turda TEK TEK ölçülmedi (kapsam/
  zaman sınırı), aynı mimari (loudness-eşitlemesiz dry/wet) hepsi
  için GEÇERLİ, etki BÜYÜKLÜĞÜ değişir.

---

## B) dB SEVİYESİ MODUNUN ALGISAL DOĞRULUĞU

**Statik tier aralığı (DIFFICULTY tablosu):** easy=3.0dB, medium=1.75dB,
hard=0.9dB, pro=0.5dB. **Sürekli eğri (DB_CURVE_CONFIG, gerçekte
kullanılan):** `DB_AT_1=3.0`, `DB_AT_CAP=0.32` (Seviye 20'de),
`DB_FLOOR=0.25`.

**Hesaplandı (logLerp formülüyle, `t=(pos-1)/(LEVEL_CAP-1)`):**
- **Seviye 1:** 3.0 dB
- **Seviye 7:** `3.0 × (0.32/3.0)^(6/19) ≈ 1.48 dB`
- **Seviye 20 (tavan):** 0.32 dB

**🟡 TARTIŞILIR, ama BİLEREK/DÜRÜSTÇE işaretlenmiş bir risk —
YENİ bir bulgu DEĞİL:** Kod (`db-seviyesi.js:105-110`) DB_FLOOR=0.25'i
"kulak ~0.25 dB altını pratikte ayırt edemez (psikoakustik JND'ye
yakın kabul edilen bir değer, **KESİN ölçülmedi**)" diye AÇIKÇA
işaretlemiş — yani geliştirici zaten farkında, dürüstçe belirtmiş.
Literatürdeki JND rakamları bağlama göre DEĞİŞİR: **ideal laboratuvar
koşullarında (broadband gürültü, ABX, eğitimli dinleyici, anlık
switch) ~0.3-0.5dB**, gerçek dünya/mobil/kulaklık koşullarında (bu
app'in GERÇEK kullanım bağlamı) muhtemelen **1-3dB** civarı daha
gerçekçi. **Seviye 20'nin 0.32dB'si, ideal-koşul JND sınırının HEMEN
ÜSTÜNDE ama gerçek-dünya kullanım JND'sinin OLASILIKLA ALTINDA** —
yani üst seviyelerde (özellikle proplus/pro tier'a yakın) kullanıcı
FİZİKSEL OLARAK ayırt edemeyeceği bir farkı tahmin etmeye
zorlanıyor olabilir, "yanlış" cevap kullanıcının kulağının değil,
sorunun kendi sınırının sonucu olabilir. **KESİN DEĞİL — cihazda/
kulaklıkla gerçek kullanıcı testiyle doğrulanmalı** (task'ın kendi
kuralı: tahmin yürütme).

---

## C) FLETCHER-MUNSON / EŞ SESLİLİK EĞRİLERİ

**🔴 YANLIŞ ÖĞRETİYOR (basitleştirme, bilinçli görünüyor ama
belgelenmemiş) — Frekans Bulma TÜM frekanslarda AYNI gain kullanıyor:**
`applyProcessing()`'te `f.gain.value = question.gain` — `question.gain`
SADECE zorluk kademesinden geliyor (`resolvedGain`), frekansın
KENDİSİNDEN (100 Hz mi 3 kHz mi) TAMAMEN BAĞIMSIZ. Kodda Fletcher-
Munson/eş-seslilik eğrilerine referans veren HİÇBİR yorum/hesap
bulunamadı (grep ile "fletcher"/"munson"/"equal.loud"/"phon"
aranmadı — bu turda taranmadı, ek bir arama gerekir, ama gain
hesabının frekans-bağımsız olduğu KESİN).

**Gerçek sonuç:** Task'ın kendi örneği doğru — 100 Hz'de +6dB ile
3kHz'de +6dB objektif olarak AYNI "büyüklükte" bir filtre ama İNSAN
KULAĞINA FARKLI derecede belirgin gelir (orta-yüksek frekanslarda
(2-5kHz) kulak en hassas, düşük/çok yüksek frekanslarda daha az
hassas — eş-seslilik eğrilerinin standart bulgusu). Bu app'in zorluk
eğrisi (kolaydan zora Seviye 1→20) SADECE gain/Q azaltıyor, hangi
FREKANS BÖLGESİNDE olduğuna göre AYRICA ayarlamıyor — yani aynı
zorluk seviyesindeki bir soru, 100Hz'de mi 3kHz'de mi çıktığına
bağlı olarak GERÇEKTE farklı zorlukta olabilir, ama app bunu "aynı
zorluk" olarak etiketliyor. **Bu, "yanlış öğretim" değil ama
"eksik/dengesiz zorluk modeli"** — kullanıcı düşük/yüksek uçlarda
sistematik olarak daha çok yanlış yapabilir, bunun NEDENİ "kulağın
kötü olması" değil "sorunun o bölgede objektif olarak daha zor
olması" — kullanıcıya bu ayrım hiç anlatılmıyor.

---

## D) PAN YASASI

**Kod: standart Web Audio `StereoPannerNode` kullanılıyor**
(`pan-konumu.js:232`, `createStereoPanner()`). W3C Web Audio
spesifikasyonu bu node için **eşit-güç (equal-power/constant-power)**
panning algoritmasını TANIMLAR (sin/cos eğrileriyle) — bu KESİN,
spesifikasyonun kendisinde belgeli bir gerçek.

**🟡 TARTIŞILIR — "gerçek DAW'daki ile aynı eğri mi" sorusunun cevabı
BELİRSİZ, genellenemez:** Eşit-güç yasası ENDÜSTRİDE YAYGIN bir
standarttır (birçok DAW'ın varsayılanı) ama TEK standart DEĞİLDİR.
**Logic Pro'nun kendisi** Tercihler'de BİRDEN FAZLA pan yasası sunar
(-2.5dB, -3dB, -4.5dB, -6dB kompanzasyonlu seçenekler) — hangisinin
varsayılan/aktif olduğu KULLANICININ KENDİ Logic kurulumuna bağlı,
bu app'in tarafından BİLİNEMEZ/kontrol edilemez. **Web Audio'nun tam
sin/cos eğrisinin Logic'in HERHANGİ bir seçeneğiyle BİREBİR aynı dB
eğrisini izleyip izlemediği bu ortamdan ÖLÇÜLEMEDİ** (gerçek DAW'a
erişim yok) — BELİRSİZ. Genel ilke doğru öğretiliyor (pan ile stereo
alanda konumlandırma), ama "gerçek DAW'daki İLE AYNI" iddiası
KANITLANAMAZ/YAPILMAMALI.

---

## E) MASKELEME MODELİ

**🟢 DOĞRU (basit ama DÜRÜSTÇE etiketlenmiş) — Frekans Çakışması
psikoakustik maskeleme DEĞİL, geometrik/dekoratif bir model
kullanıyor, kod bunu AÇIKÇA söylüyor:** `sourcePeakFreq()`/
`dominantSourceAt()` (satır 199-213) iki kaynağın "baskınlık"
noktasını `trueCenter`'dan SABİT ±0.55 oktav (SIMETRİK) kaydırarak
belirliyor — kodun KENDİ yorumu: *"dekoratif ama tutarlı... gerçek
ses FFT'si DEĞİL"*. **Gerçek maskeleme asimetrisi (düşük frekans
yükseği maskeler, tersi zayıftır) MODELLENMİYOR** — model TAMAMEN
SİMETRİK (A ve B'nin baskınlık kuralı birbirinin aynısı, hangisinin
"düşük" hangisinin "yüksek" frekans olduğuna göre FARKLILAŞMIYOR).
**Ama bu bir GİZLİ YANLIŞ DEĞİL** — kod yorumları defalarca "dekoratif"
olduğunu itiraf ediyor, kullanıcıya YANLIŞ bir asimetri iddiası
SUNMUYOR, sadece basitleştirilmiş bir model kullanıyor. 🟡'ye
yakın 🟢: **pedagojik olarak eksik** (gerçek maskeleme asimetrisi
ÖĞRETİLMİYOR) ama **aktif olarak YANLIŞ bir şey de İDDİA ETMİYOR**.

**SOURCE_PAIRS region değerleri — 🟡 elle konmuş, ölçülmemiş:**
`[50,160]` (kick/bas), `[500,2000]` (vokal/gitar), `[200,2000]`
(snare/gitar) — kod'da bu aralıkların GERÇEK ses dosyalarının FFT/
spektral analiziyle TÜRETİLDİĞİNE dair HİÇBİR referans/yorum
bulunamadı. Değerler mixing literatüründe YAYGIN kabul gören
"tipik çakışma bölgeleri" ile TUTARLI (ders kitabı bilgisiyle
uyumlu, keyfi değil) ama BU projenin kendi `.m4a` dosyalarının
GERÇEK spektral tepe noktalarıyla eşleştiği ÖLÇÜLMEDİ/DOĞRULANMADI.

---

## F) Q ÖLÇEĞİ

**Q logaritmik ele alınıyor mu — EVET, doğrulandı:** `difficulty-
curve.js:200` — `logLerp(Q_AT_LEVEL_1, Q_AT_CAP, t)` — Q, seviyeler
arasında LOGARİTMİK enterpolasyonla artıyor (Q_AT_CAP=5.0). Bu
DOĞRU tasarım kararı — Q/bant genişliği algısı oktav-bazlı (log)
olduğu için doğrusal değil logaritmik ilerleme PSİKOAKUSTİK olarak
UYGUN. 🟢.

**"Ayrım eşiği her aralıkta farklı, zorluk buna göre mi ayarlanmış" —
KISMEN, doğrudan ölçülmedi:** Curve'ün KENDİSİ log olsa da, Q'nun
FARKLI mutlak aralıklarında (ör. Q 0.7→1.5 arası vs Q 3→5 arası)
insan kulağının GERÇEK ayrım hassasiyetinin ne kadar DEĞİŞTİĞİ
(yani log-Q eğrisinin GERÇEKTEN algısal olarak "eşit adımlı"
hissettirip hissettirmediği) bu turda KULAKLA/deneysel
DOĞRULANMADI — BELİRSİZ, TestFlight'ta test edilmesi gereken bir
konu.

**TAM-LISTE karar P (Q=2.5) — KAYNAK BULUNDU:** `frekans-bulma.js:41`
— `hard: { ..., q: 2.5, ... }` (Frekans Bulma'nın statik "Zor" tier
Q değeri, boost/cut filtresinin bant genişliği). Karar maddesi
("yapay mı doğal mı") HÂLÂ AÇIK — bu turda ek bir kanıt/karar
ÜRETİLMEDİ, sadece kaynağı doğrulandı.

---

## G) KESİM NOKTASI

**HPF/LPF mi, shelf mi — SADECE HPF/LPF, shelf YOK:**
`kesim-noktasi.js:314` — `filterType = Math.random()<0.5 ?
"highpass":"lowpass"` — SADECE bu iki BiquadFilterNode tipi
kullanılıyor, `"lowshelf"`/`"highshelf"` hiç yok (grep ile
doğrulandı, sıfır eşleşme).

**Slope kaç dB/oct — SABİT 12dB/oct (Web Audio biquad'ın doğal
sonucu), Q=0.707 (Butterworth):** `FILTER_Q = Math.SQRT1_2 ≈ 0.707`
(satır 202) — standart 2. dereceden (12dB/oktav) bir Butterworth
HPF/LPF'in Q değeri BUDUR (maksimum düz geçiş bandı, rezonans
tepesi yok). **🟢 DOĞRU/GERÇEKÇİ bir seçim** — 0.707 Q, filtre
teorisinde "doğal"/ders kitabı standart Q'dur.

**🟡 TARTIŞILIR — gerçek DAW'da kullanıcı slope SEÇER, burada
SABİT:** Gerçek DAW'larda (Logic Pro dahil) HPF/LPF genelde 6/12/18/
24dB/oct arası SEÇİLEBİLİR bir slope sunar — bu app SADECE 12dB/oct
öğretiyor. Bu bir "yanlış öğretim" değil (12dB/oct GERÇEK ve YAYGIN
bir slope) ama **eksik bir öğretim yüzeyi** — kullanıcı "kesim
noktası" kavramını öğreniyor ama "slope" kavramını (daha dik/daha
yumuşak kesimin SESİNİN farklı olduğunu) hiç görmüyor. Ürün kararı
kapsamında, acil değil.

---

## H) BOOST/CUT SİMETRİSİ

**🔴 YANLIŞ VARSAYIM — kod boost/cut'ı TAM SİMETRİK modelliyor,
gerçek algı ASİMETRİKTİR:** `boost-mu-cut-mu.js`'nin `gainDb`
üretimi ve `calculateXP`/`evaluateAnswer`'ı boost (+) ile cut (-)
yönünü SADECE İŞARET (sign) olarak ele alıyor — `Math.abs(diff)`
tabanlı tolerans/zorluk hesapları, +3dB boost ile -3dB cut'ı
ALGISAL olarak AYNI büyüklükte VARSAYIYOR (mutlak değer simetrik
işleniyor, grep ile `gainStepDb`/`GAIN_STEP_AT_1` gibi sabitlerin
YÖNE göre AYRIŞMADIĞI doğrulandı). **Gerçekte** peaking bir boost,
enerji EKLER (genelde daha "belirgin"/rahatsız edici algılanabilir)
ve bir cut enerji ÇIKARIR (genelde daha "ince"/fark edilmesi
GÜÇ olabilir, özellikle dar Q'da) — mixing literatüründe SIKÇA
tartışılan bir asimetri (bazı mühendisler "cut, boost'tan 1.5-2x
daha az belirgin algılanır" gibi TAHMİNİ kurallar kullanır, KESİN
bir dB katsayısı YOK, bu bir dürüst BELİRSİZLİK notu gerektirir).
Bu app'in zorluk/tolerans sistemi bu asimetriyi HİÇ hesaba
katmıyor — yani cut sorularının GERÇEKTE boost sorularından daha
zor olabileceği ihtimali kodda YOK.

---

## I) KOMPRESÖR GÖRSEL GERİ BİLDİRİMİ

**Gain reduction metresi var mı — CANLI/GERÇEK ZAMANLI YOK, cevap
SONRASI stilize bir "zarf" (envelope) çizimi VAR:**
`kompresor.js:drawOverlay()`/`drawEnvelope()` — dar/düz eğri =
sıkışmış, geniş/dalgalı eğri = açık, kodun KENDİSİ *"Gerçek bir ses
ANALİZİ DEĞİL"* diye işaretliyor (satır ~494). Bu çizim CEVAP
VERİLDİKTEN SONRA (`guessYs` parametresi kullanıcının tahminini,
`correctYs` gerçek cevabı gösteriyor) açılıyor — SORU ÇALARKEN
HİÇBİR görsel GR göstergesi YOK. **🟢 muhtemelen KASITLI, TUTARLI
bir tasarım** — Frekans Bulma'nın G83 kararıyla AYNI ilke ("soru
sırasında sese kör çizim", saf kulakla karar verilmesi isteniyor) —
canlı bir GR metresi olsaydı kullanıcı GÖRSEL ipucuyla cevap
verebilir, KULAK eğitimi amacını BOZARDI. **Bu yüzden "öğrenme
yarım kalıyor" iddiası muhtemelen YANLIŞ** — tam tersi, görsel
ipucunun BİLEREK saklanması ders amacına UYGUN.

**Threshold/ratio/attack/release aralıkları gerçekçi mi — EVET,
İYİ GEREKÇELENDİRİLMİŞ:** `RATIO_MIN=1`/`RATIO_MAX=20` (DynamicsCompressorNode'un
KENDİ spec sınırları), attack/release SABİT tutuluyor (kodun kendi
notu: SoundGym'in Dr. Compressor'ından esinlenen, "yavaş attack'lı
ses daha az sıkışmış duyulur ama daha çok sıkışmıştır" karışıklığını
ÖNLEMEK için BİLİNÇLİ bir tasarım kararı) — ratio+threshold BİRLİKTE
tek bir "k" parametresiyle hareket ediyor (gerçekçi: stüdyoda ikisi
GENELDE birlikte ayarlanır). **🟢 Bu mod dosyanın EN İYİ
gerekçelendirilmiş/pedagojik olarak düşünülmüş kod tabanı.**

---

## J) REVERB MOTORU

**generateImpulseResponse — 🟢 doğru RT60 modeli:** `reverb.js:603-621`
— üstel sönümlü stereo (2 kanal BAĞIMSIZ gürültü, gerçekçi
decorrelation) gürültü, `RT60_DECAY_CONST = ln(10^(-60/20))`
formülüyle TAM standart RT60 (-60dB'ye `decaySec`'te iner)
tanımına uyuyor — bu DOĞRU/ders-kitabı-standart bir yaklaşım.

**Room/Hall/Plate ayrımı — 🟢 YAPILIYOR, GERÇEKÇİ değerlerle:**
Room decay 0.3-0.9s / pre-delay 3-12ms, Hall decay 1.6-3.2s /
pre-delay 20-45ms, Plate decay 0.9-2.0s / pre-delay 0-6ms — ÜÇÜ de
gerçek akustik/stüdyo pratiğiyle TUTARLI aralıklar (Hall'ın uzun
decay+geniş pre-delay'i, Plate'in orta decay+neredeyse sıfır pre-
delay'i doğru karakterize ediyor).

**Pre-delay var mı — EVET, üç tipte de MODELLENİYOR** (yukarı bkz.).

**🔴 CİDDİ, task'ın kendi öngördüğü risk DOĞRULANDI —
`convolver.normalize = true` (reverb.js:359):** Web Audio
spesifikasyonu `ConvolverNode.normalize=true` iken TARAYICININ
KENDİ dahili algoritmasıyla IR buffer'ını YENİDEN ÖLÇEKLENDİRDİĞİNİ
TANIMLAR — bu, `generateImpulseResponse()`'un ÖZENLE hesaplanmış
RT60/decay/density değerlerinin ÇIKIŞ SEVİYESİNİ, tarayıcının KENDİ
enerji-bazlı normalizasyon formülüyle EZEBİLECEĞİ anlamına gelir.
Somut risk (task'ın kendi örneği): FARKLI `decaySec`/`sizeNorm`
değerlerine sahip İKİ IR (ör. kısa Room vs uzun Hall) tarayıcı
tarafından BENZER GENEL ENERJİYE normalize edilebilir — bu da
Bölüm A'nın loudness-eşitleme sorununu REVERB ÖZELİNDE
katlıyor/karmaşıklaştırıyor: kullanıcının "bu reverb daha uzun/
derin" algısı, decay FARKI yerine tarayıcının normalize
algoritmasının ÜRETTİĞİ rastgele bir seviye farkından
kaynaklanıyor olabilir. **Standart endüstri pratiği** (WebAudio
geliştirici topluluğunda SIKÇA tekrarlanan bir uyarı) bu tür
"kendi hesapladığın IR'nin göreli enerjisini KORUMAK" istenen
durumlarda `normalize=false` KULLANMAKTIR — mevcut `true` ayarı
BU app için muhtemelen YANLIŞ tercih. **Perceptual büyüklüğü bu
ortamda KULAKLA ölçülemedi** (BELİRSİZ, cihazda A/B ile
doğrulanmalı) ama YAPISAL risk KESİN/kod-seviyesinde kanıtlı.

---

## K) SORU ÜRETİMİ VE DAĞILIM

**Frekans Bulma her bantta eşit sıklıkta mı soruyor — HAYIR, BİLEREK
DEĞİL:** `freq = logFreq(personalizedFreqRange[0], personalizedFreqRange[1])`
— `zoneStats` VARSA (`personalizedRange()`) kullanıcının ZAYIF
bölgesine doğru AĞIRLIKLANDIRILMIŞ bir aralıktan seçiliyor
(`core/personalization.js`, Z4 kararı — MIN_SAMPLES=3 altında nötr).
**Bu KASITLI bir pedagojik tasarım** (zayıf bölgede daha çok pratik) —
"eşit dağılım" zaten AMAÇLANMIYOR, YENİ kullanıcıda (zoneStats yok/az)
UNIFORM log-random. 🟢 tasarım tutarlı, ama **kullanıcıya bu AÇIKÇA
anlatılmıyor** (bir kullanıcı "neden hep aynı bölgeden soru
geliyor" diye şaşırabilir, İlerleme sekmesindeki "Zayıf Bölge
Raporu" bunun dolaylı açıklaması ama doğrudan bir metin yok) — 🟡.

**Art arda aynı soru gelme ihtimali/tekrar önleme — YOK, ama
pratikte İHMAL EDİLEBİLİR:** `logFreq()` SÜREKLİ (continuous)
log-uniform bir rastgele sayı üretici — tam olarak AYNI Hz değeri
ardışık gelme ihtimali matematiksel olarak SIFIRA yakın (sürekli
dağılım). AMA "aynı ZON'dan" ardışık soru gelme ihtimali VAR ve
HİÇBİR guard YOK — özellikle güçlü bir personalizasyon ağırlığı
altında (kullanıcı bir bölgede çok zayıfsa) ardışık aynı-zon sorular
olağan/BEKLENEN bir davranış.

**"100 soru sonra bazı bantları hiç görmemiş olabilir mi" — EVET,
TEORİK OLARAK MÜMKÜN ama uç bir senaryo:** `zoneWeakness()`'ın
MAX_BOOST (daha önceki turlarda 2.0/en fazla 3x ağırlık olarak
tespit edilmişti — bu turda yeniden doğrulanmadı) sınırı sonsuz
DEĞİL, yani en zayıf bölge en güçlüye göre EN FAZLA ~3 kat daha sık
gelebilir — bu "hiç gelmeme" değil "nadiren gelme" anlamına gelir.
**Kesin "hiç görmeme" senaryosu BELİRSİZ** — 100 soruluk gerçek bir
simülasyon bu turda ÇALIŞTIRILMADI (kod okuması yeterli görüldü,
zaman sınırı) — istenirse ayrı bir ölçüm turu bunu simüle edebilir.

---

## L) ŞIK ÜRETİMİ

**Doğru cevap hep aynı pozisyonda mı — HAYIR, KARIŞTIRILIYOR:**
`shuffle()` çağrısı 9 mod dosyasında bulundu (db-seviyesi,
boost-mu-cut-mu, frekans-bulma, pan-konumu, frekans-cakismasi,
kesim-noktasi, stereo-genislik, q-genisligi, tonal-denge) — şık
üreten TÜM modlarda pozisyon RASTGELE. 🟢.

**Yanlış şıklar doğruya ne kadar yakın — OKTAV-BAZLI (logaritmik)
uzaklık, DOĞRU yaklaşım:** `DISTRACTOR_STEP_OCT = {easy:1.2,
medium:0.9, hard:0.75, pro:0.65}` (Frekans Bulma) — çeldiriciler
doğru cevaptan OKTAV cinsinden (yani ORANSAL, "1000/1100/900" tarzı
LİNEER Hz adımları DEĞİL) uzaklaştırılıyor. Bu, frekans algısının
logaritmik doğasıyla TUTARLI — task'ın endişesi ("100/1000/10000
mü") GERÇEKLEŞMİYOR, sistem zaten oransal/log çalışıyor. 🟢.

**Zorluk DIFFICULTY tablosunda görünüyor mu — EVET:**
`DISTRACTOR_STEP_OCT` doğrudan `DIFFICULTY[level]` ile birlikte
export ediliyor, kolaydan zora (1.2→0.65 oktav) daralıyor — zorluk
kaynağı ŞEFFAF, kodda açıkça görünür.

---

## M) SES BAŞLANGICI VE DÖNGÜ

**Fade-in var mı — EVET, ÖLÇÜLDÜ:** `audio-engine.js:770/929` —
`out.gain.exponentialRampToValueAtTime(0.8, audioCtx.currentTime +
0.05)` — round başlangıcında 0.0001'den 0.8'e **50ms eksponansiyel
fade-in**, "tık" riskini önlüyor. 🟢.

**groove_090.m4a döngü noktası temiz mi — ÖLÇÜLDÜ (ffmpeg/astats
ile, tahmin DEĞİL):** Dosya süresi **5.333 sn** (task'ın kendi
rakamıyla eşleşiyor). İlk 1ms peak seviyesi **-47.7dB**, son 1ms
peak seviyesi **-72.5dB** — **HER İKİ uç da near-silent** (duyulabilir
eşiğin belirgin altında), aralarında ANİ bir genlik sıçraması
YOK. `audio-engine.js`'in `.loop=true` ataması `loopStart`/`loopEnd`
KIRPMADAN tüm buffer'ı döngülüyor (satır 648/703) — ölçülen
sessiz-uç davranışıyla TUTARLI. **🟢 Genlik-sürekliliği açısından
döngü noktası TEMİZ** — ama bu SADECE genlik (amplitude) ölçümü,
İNCE FAZ uyuşmazlıkları (ör. dalga formunun TAM sıfır-geçişte
kesilip kesilmediği) bu yöntemle TESPİT EDİLEMEZ — **kulakla
doğrulama (TestFlight) hâlâ ÖNERİLİR**, ama ölçülen veri düşük risk
gösteriyor.

---

# ÖNCELİK LİSTELERİ

## Yayın öncesi düzeltilecekler
1. **🔴 `convolver.normalize=true` (Bölüm J)** — `reverb.js:359`,
   `false`'a çevrilip generateImpulseResponse'un ürettiği RT60
   zarfının çıkış seviyesi ELLE kontrol edilmeli (ör. IR'nin RMS'ine
   göre sabit bir kazanç uygulanarak). Kod değişikliği küçük, etkisi
   BÜYÜK — reverb tiplerinin/decaySec farklarının ALGISAL olarak
   GERÇEKTEN ayırt edilebilir kalması için gerekli.
2. **🔴 A/B loudness eşitleme (Bölüm A) — özellikle Boost/Cut modu**
   — ürün kararı gerektirir: ya wet yola bir RMS/peak-bazlı telafi
   kazancı eklenmeli (mühendislik işi), ya da bu sınır Logic'e
   AÇIKÇA anlatılıp "1.1'e" ertelenmeli. Bu turda kod YAZILMADI
   (görev kuralı), sadece TESPİT edildi.

## TestFlight'ta kulakla doğrulanacaklar
- dB Seviyesi'nin üst seviyelerinde (Seviye ~15-20, ~0.3-0.5dB
  aralığı) sorunun FİZİKSEL olarak ayırt edilebilir kalıp kalmadığı
  (Bölüm B).
- Q ölçeğinin log-eğrisinin GERÇEKTEN eşit-adımlı HİSSETTİRİP
  hissettirmediği (Bölüm F).
- Pan Konumu'nun StereoPannerNode eğrisinin kullanıcının kendi
  DAW'ındaki pan yasasıyla ne kadar örtüştüğü (Bölüm D, DAW'a göre
  değişir, genellenemez).
- groove_090.m4a'nın döngü noktasında İNCE bir faz/tık algılanıp
  algılanmadığı (Bölüm M, genlik ölçümü temiz ama kulak son
  hakemdir).
- Boost/Cut asimetrisinin (Bölüm H) gerçek kullanıcı testinde cut
  sorularının boost sorularından sistematik olarak daha zor
  çıkıp çıkmadığı.

## 1.1'e bırakılabilirler
- Fletcher-Munson/eş-seslilik ağırlıklandırması (Bölüm C) — zorluk
  eğrisine frekans-bağımlı bir düzeltme eklemek, kapsamlı bir iş.
- Kesim Noktası'na seçilebilir slope (6/12/18/24dB/oct) eklenmesi
  (Bölüm G) — şu anki 12dB/oct YANLIŞ değil, sadece eksik yüzey.
- Maskeleme modeline gerçek asimetri (düşük frekans yükseği maskeler)
  eklemesi (Bölüm E) — mevcut model YANLIŞ değil (dürüstçe
  "dekoratif" etiketlenmiş), sadece eksik.
- SOURCE_PAIRS region değerlerinin gerçek `.m4a` dosyalarının FFT
  analiziyle doğrulanması/güncellenmesi (Bölüm E).

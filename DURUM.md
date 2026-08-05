# DURUM

Son güncelleme: 05.08.2026

> Bu dosya yeni sohbetlerin tek doğruluk kaynağıdır.
> Her seans sonunda Claude Code tarafından güncellenir, commit'e dahil edilir.

## BİTTİ

Commit `680d2ab` — ADIM 2: **zorluk sisteminin merkezi bağlanması — Frekans
Bulma eğri sistemine taşındı.** Kademeli geçişin (Seçenek C) İKİNCİ ve SON
adımı: ADIM 1'de Kesim Noktası'nda kanıtlanan desen Frekans Bulma'ya da
uygulandı — **artık HER İKİ mod da AYNI merkezi eğri mimarisini kullanıyor.**

**Frekans Bulma (`modes/frekans-bulma.js`):** Kesim Noktası'ndaki BİREBİR
desen — statik `DIFFICULTY` tablosu KALMAYA devam ediyor (geriye dönük
uyumluluk + "Sabit" modun çapası + proplus için hâlâ gerekli), yanına
`FREKANS_CURVE_CONFIG` + `paramsForDifficultyPosition(position)` eklendi.
AT_1/AT_CAP uçları statik `easy`/`pro` değerleriyle BİREBİR aynı (Kesim
Noktası'ndaki AYNI kalibrasyon yöntemi). **Tek fark — Q ekseni:** Z1'in
ORİJİNAL asimetrisi korundu, Q (ve difficulty-curve.js'in eski global
`DIFFICULTY_CONFIG`'indeki tolerans) LEVEL_CAP'ten SONRA SABİT kalıyor
(`applyPostCapFloor` Q için ÇAĞRILMIYOR) — sadece gainDb/timeSec/hintBandOct/
distractorStepOct tavandan sonra azalıp bir tabanda duruyor. `generateChoices`
Kesim Noktası'ndaki AYNI refactor'dan geçti (`level` yerine çözülmüş
`{options,step}`). `createQuestion`, `settings.difficultyPosition` verilirse
eski `boss ? diff.gain*0.75 : diff.gain` / `boss ? diff.q*1.35 : diff.q`
çarpanlarını UYGULAMIYOR (boss'un etkisi zaten position'ın içinde, çifte
ceza olmasın diye) — vermezse (proplus dahil, o zaten ayrı bir dalda erken
dönüyor) eski statik davranış BİREBİR korunuyor. `BOOST_ONLY_DIFFICULTIES`
(easy/medium'da hep boost, hiç kesim yok) TİER İSMİNE bağlı kalitatif bir
kural olarak KALDI, sürekliye çevrilmedi (bilerek — bu bir "ne kadar" değil
"hangi tür" sorusu).

**app.js: SIFIR değişiklik gerekti.** ADIM 1'de `currentDifficultyPosition()`
zaten mod-agnostik yazılmıştı (`mode.getMeta().id` üzerinden hangi mod
aktifse onun XP'sini okuyordu) ve `createQuestion` çağrısına HER moda
(sessionQuestionIndex'le AYNI desen) geçiyordu — ADIM 1'de bunu SADECE
Kesim Noktası okuyordu, ADIM 2 ile Frekans Bulma da kendi
`paramsForDifficultyPosition`'ını yazıp bağlandığı için OTOMATİK olarak
aynı sayıyı almaya başladı. Sadece iki yerdeki artık BAYAT yorum ("SADECE
Kesim Noktası okuyor") güncellendi — bu, ADIM 1'in mimarisinin doğru
kurulduğunun somut bir kanıtı.

**Tutarlılık doğrulaması (yapısal, kod okumasıyla):** her iki mod dosyası
da `logLerp`/`applyPostCapFloor`'u AYNI `core/difficulty-curve.js`'ten
import ediyor; `continuousLevel`/`sessionRampOffset`/`representativeLevelForTier`
TEK bir yerde (`app.js: currentDifficultyPosition`) hesaplanıyor, iki mod
için AYRI birer implementasyon YOK — bu, "iki eğri zamanla birbirinden
uzaklaşır mı" riskini yapısal olarak ortadan kaldırıyor (drift mümkün değil,
tek kod yolu var).

**Kalibrasyon karşılaştırma tablosu (gerçek kod çalıştırılarak ölçüldü) —
statik DIFFICULTY[tier] vs eğrinin o tier'ın temsilci seviyesinde ürettiği
değer:**

| tier | temsilci sv. | gain eski→yeni | Q eski→yeni | time eski→yeni | opt eski→yeni | hint eski→yeni | step eski→yeni |
|---|---|---|---|---|---|---|---|
| easy | 2.5 | 10.000→9.389 | 0.90→1.02 | 16→15.29 | 3→3 | 2.40→2.15 | 1.20→1.143 |
| medium | 6.5 | 8.000→7.936 | 1.30→1.41 | 13→13.55 | 4→4 | 1.60→1.61 | 0.90→1.005 |
| hard | 10.5 | 6.000→6.708 | 2.50→1.94 | 11→12.00 | 5→4 | 1.00→1.20 | 0.75→0.883 |
| pro | 14.5 | 4.500→5.670 | 4.20→2.69 | 9→10.63 | 6→5 | 0.60→0.90 | 0.65→0.776 |

**Aynı desen Kesim Noktası'nda görülenle BİREBİR tekrarlıyor**: easy/medium
ucu yakın (uçlar AT_1/AT_CAP'la birebir eşleştiği için), hard/pro'da eğri
statikten SİSTEMATİK olarak KOLAY (gain daha büyük/belirgin, Q daha geniş/
dar-olmayan, hard/pro'da 1 eksik şık) — bu ARTIK iki modda da aynı yönde
tekrar eden bir desen, tek seferlik bir tuhaflık değil: tek bir log-eğrinin
4 keyfi statik noktaya birden oturamamasının YAPISAL sonucu. **KULAKLA
DOĞRULANMALI** — muhtemelen HER İKİ modun da AT_1/AT_CAP'ı değil, ARADAKİ
(medium/hard sınırı civarı) eğri şeklinin kendisi (ör. iki-parçalı/piecewise
bir eğriye geçmek) yeniden değerlendirilmeli; bu bir SONRAKİ kalibrasyon
turunun konusu, bu turun kapsamı sadece "bağla" idi.

Doğrulama: 15 yeni test (paramsForDifficultyPosition pürüzsüzlük/taban/uç-
değer + Q'nun tavandan sonra SABİT kaldığının doğrulanması + createQuestion
entegrasyonu + boost-only kuralının eğri modunda da korunduğu + proplus'un
eğri dışında kaldığı) + mevcut 223 test DEĞİŞMEDEN geçti — **238/238**.
Tarayıcıda canlı: Otomatik/seviye 1'de 3 şık (AT_1 eşleşiyor, statikle
aynı); Sabit/Pro'da **5 şık** (curve'ün ürettiği, eski statik 6'dan farklı
— tabloyla tutarlı); İpucu Ver/EQ eğrisi/karşılaştırma butonları (Senin
cevabın/Doğru cevap/Temiz)/boss round hepsi çalıştı; Kesim Noktası'na
GEÇİŞ SONRASI da test edildi, regresyon yok; konsolda sıfır hata.

Commit `5870e09` — ADIM 1: **zorluk sisteminin merkezi bağlanması — Kesim
Noktası pilotu.** Önceki turda onaylanan tasarımın (Seçenek C, kademeli
geçiş) İLK adımı: merkezi zorluk matematiği kuruldu + SADECE Kesim Noktası
buna bağlandı. Frekans Bulma'ya HİÇ DOKUNULMADI (bilerek, sıradaki adımda
taşınacak) — iki mod şu an GEÇİCİ olarak farklı mekanizma kullanıyor.

**Merkezi kütüphane (`core/difficulty-curve.js`, artık tek bir global eğri
değil, mod-agnostik matematik kütüphanesi):**
- `logLerp` export edildi (önceden private'tı).
- `applyPostCapFloor(curveValue, level, levelCap, floor, reductionPerStep)` —
  Z1'in "tavandan sonra taban" kalıbının genellenmiş hali; `difficultyParams()`
  bunun üzerinden dogfood edildi (davranış/çıktı DEĞİŞMEDİ, difficulty-curve.
  test.mjs aynı kaldı).
- `continuousLevel(xpProg)` — `progress.xpProgress()`'in `{level,current,
  required}`'ından KESİRLİ seviye (ör. seviye 6'nın %40'ı → 6.4), yuvarlama
  yok.
- `sessionRampOffset(sessionIndex, {boss})` — ısınma (negatif ofset, döngü
  başı) → zorlaşma (pozitif, döngü sonu) → boss (en yüksek, döngüdeki
  konumdan BAĞIMSIZ, çağıranın verdiği GERÇEK `{boss}` bayrağıyla). Döngü
  uzunluğu 5 — `isBossRound()`'un (frekans-bulma.js) kullandığı AYNI periyot,
  ama İKİ AYRI sayaca dayanır (boss'un GERÇEK belirlenmesi: `stats.rounds`,
  ömür boyu; rampanın şekli: `roundsInThisPlaySession`, seans-yerel) — bu
  yüzden ramp kendi "hangi index boss" tahminini YAPMAZ, güvenmez.
- `representativeLevelForTier(tier)` — "Sabit" modun tier→sürekli-seviye
  çapası (TIER_BOUNDARIES aralığının orta noktası; pro için LEVEL_CAP-4).

**Kesim Noktası (`modes/kesim-noktasi.js`) — pilot mod:** statik `DIFFICULTY`
tablosu KALDIRILMADI (geriye dönük uyumluluk + "Sabit" modun çapası +
proplus için hâlâ gerekli) — YANINA `KESIM_CURVE_CONFIG` +
`paramsForDifficultyPosition(position)` eklendi. Eğrinin AT_1/AT_CAP uçları
statik `easy`/`pro` değerleriyle BİREBİR aynı seçildi (geçiş uçlarda
davranış-koruyucu olsun diye); `createQuestion`, `settings.difficultyPosition`
sayısal bir değer VERİLİRSE marginOct/hintBandOct/timeSec/distractorStepOct/
options'ı eğriden hesaplar (boss'un etkisi ARTIK burada tekrar
uygulanmıyor — zaten position'ın içinde, çifte ceza olmasın diye),
VERİLMEZSE (mevcut 435 satırlık test dosyasının TAMAMI, proplus) eski statik
davranışı BİREBİR korur. `generateChoices` imzası `level` string yerine
çözülmüş `{options,step}` alacak şekilde refactor edildi (dışa açık bir
sözleşme değil, test etkilenmedi). `renderHintMask` artık `question.
hintBandOct`'u (createQuestion'ın koyduğu, eğri/statik farkını zaten çözmüş
değer) tercih ediyor.

**app.js:** `currentDifficultyPosition(boss)` yeni — zorlukKonumu = taban
(Otomatik'te `continuousLevel`, Sabit'te `representativeLevelForTier`) +
`sessionRampOffset(roundsInThisPlaySession, {boss})`. `startRound()`'daki
`createQuestion` çağrısına EK bir alan olarak geçiyor (`sessionQuestionIndex`
ile AYNI desen — tek taraflı okunur, Frekans Bulma hiç bakmaz). proplus için
BİLEREK `undefined` döner (curve'ün dışında kalır, Z5 kararıyla aynı çizgi;
kesim-noktasi.js'in `createQuestion`'ı da bunu KENDİSİ bir daha kontrol
ediyor — savunma katmanı). `applyAutoDifficulty()`'nin KENDİSİ (hangi tier'a
yazdığı) BİLEREK DEĞİŞTİRİLMEDİ — Frekans Bulma'nın Otomatik zorluk
davranışı (hangi turda hangi statik satırın okunduğu) BİREBİR aynı kaldı.

**Kapsam dışı bırakılan (bilerek):** round-timer HÂLÂ `currentDifficultyConfig
().time`'dan (statik tier) okuyor — `paramsForDifficultyPosition`'ın
`timeSec`'i HESAPLANIYOR/test ediliyor ama oyun ekranına henüz BAĞLANMADI;
G21'in kulakla hizalanmış geri bildirim/geçiş süresini riske atmamak için
bilinçli bir kapsam kararı, ayrı bir işte ele alınmalı. `renderLevelSheet`
("Seviye" bilgi sayfası) de dokunulmadı — hâlâ global `difficultyParams`'ı
(gainDb/Q dilinde) gösteriyor, Kesim Noktası aktifken bu metin semantik
olarak YANLIŞ/anlamsız kalıyor (marginOct değil gainDb/Q gösteriyor) — bu
ÖNCEDEN de böyleydi (renderLevelSheet hep frekans-bulma-şekilli), bu turun
bir regresyonu DEĞİL, ama düzeltilmesi gereken bilinen bir kalan.

**Kalibrasyon karşılaştırma tablosu (gerçek kod çalıştırılarak ölçüldü,
UYDURULMADI) — statik DIFFICULTY[tier] vs eğrinin o tier'ın temsilci
seviyesinde (`representativeLevelForTier`) ürettiği değer:**

| tier | temsilci sv. | margin eski→yeni | hint eski→yeni | time eski→yeni | opt eski→yeni | step eski→yeni |
|---|---|---|---|---|---|---|
| easy | 2.5 | 1.600→1.402 | 2.00→1.79 | 14→13.52 | 3→3 | 1.20→1.143 |
| medium | 6.5 | 1.000→0.986 | 1.40→1.34 | 12→12.32 | 4→4 | 0.90→1.005 |
| hard | 10.5 | 0.550→0.693 | 0.90→1.00 | 11→11.22 | 5→4 | 0.75→0.883 |
| pro | 14.5 | 0.300→0.487 | 0.50→0.75 | 9→10.23 | 6→5 | 0.65→0.776 |

easy/medium ucu YAKIN (uçlar zaten eğrinin AT_1/AT_CAP'ı statik easy/pro'yla
BİREBİR aynı seçildiği için — beklenen). hard/pro'da GERÇEK bir sapma var:
eğri o iki tier'da statikten daha KOLAY (margin daha geniş, hard/pro'da 1
eksik şık) — tek bir log-eğrinin 4 keyfi noktaya birden tam oturamamasının
doğal sonucu, ZORLAMA (piecewise fit) yapılmadı. **KULAKLA DOĞRULANMALI** —
hard/pro'da Otomatik moddaki bir kullanıcı bu geçişte fark edilir bir
kolaylaşma hissedebilir; AT_1/AT_CAP'ın kulakla yeniden kalibre edilmesi
gerekebilir (bkz. SIRADAKİ).

Doğrulama: 33 yeni test (difficulty-curve.test.mjs +20: logLerp/
applyPostCapFloor/continuousLevel/sessionRampOffset/representativeLevelForTier
saf fonksiyon testleri; kesim-noktasi.test.mjs +13: paramsForDifficultyPosition
pürüzsüzlük/taban/uç-değer testleri + createQuestion entegrasyonu + proplus'un
eğri dışında kaldığının doğrulanması) + mevcut 190 test DEĞİŞMEDEN geçti —
**223/223**. Tarayıcıda canlı: Otomatik/seviye 1'de 3 şık (curve options=3,
statikle aynı — beklenen, AT_1 eşleşiyor); Sabit/Pro'da **5 şık** (curve'ün
ürettiği, eski statik 6'dan FARKLI — kalibrasyon tablosuyla TUTARLI, kod
hatası değil); Frekans Bulma'da SIFIR regresyon (dokunmalı mod, EQ eğrisi,
zone-tip hepsi eskisi gibi çalıştı), konsolda sıfır hata.

Commit `080c884` — G21: **Kesim Noktası TAMAMLANDI, SERT TEST GEÇTİ.**
İki parça: (1) geçiş süresi hizalaması, (2) modun tamamının sert taraması.

**Hizalama:** `submitCutoffGuess`'in geçiş süresi artık Frekans Bulma'nın
`submitFrequencyGuess`'iyle AYNI formül (`prefs.feedbackScreen ? (correct?
4000:6000) : QUICK_ADVANCE_MS`) — öncesinde HER ZAMAN 700ms'ydi, G20'de
eklenen öğretici metin + iki renkli filtre eğrisi okunacak kadar kalmıyordu
(kullanıcı raporu). Kesim Noktası'nın kendi X butonu yok (bilerek) ama
"Atla ▶" zaten mod-bağımsız aynı anında-geçiş işini görüyor — canlı
doğrulandı (6000ms/4000ms dwell JS ile ölçüldü, "Atla" her an anında geçiyor).

**Sert test:** pure-function stress script'i (5000+ soru, 1000+ örnek/zorluk
HPF/LPF dengesi, 6 bölge×2 tip×3 durum=36 öğretici-metin kombinasyonu) + canlı
tarayıcı testi (Kick/sample-kind kaynak, pro zorluk+sabit mod, "10 Soruluk
Bölüm" TAM 10 soru + 2 boss round + seans tamamlama simulatePro ile, A/B
kuru/işlenmiş, konsol) — **kod tarafında SIFIR gerçek bug bulundu.** Test
sırasında "pro'da 3 şık geliyor" gibi görünen bir gözlem, oturumun canları
tükenmişken session-end ekranının stale DOM'unu okumaktan kaynaklanan bir
TEST METODOLOJİSİ artefaktıydı (temiz oturumda pro'nun her zaman 6 şık
ürettiği doğrulandı) — kod değişikliği gerekmedi, sadece not düşüldü.

13 yeni kalıcı test: 36/36 bölge×tip×durum öğretici-metin taraması (boş/
bozuk/teknik-değer-sızdıran metin yok) + 600 sorulu (5 zorluk×8 seans-
indeksi×15 tekrar) tam matris testi — 5 kez tekrarlı çalıştırıldı, flake yok.

Frekans Bulma'ya dokunulmadı — canlı regresyon: accordion, X butonu, rich
panel/EQ eğrisi/karşılaştırma butonları hepsi eskisi gibi, sıfır konsol
hatası. `npm test`: **190/190** (177 eski + 13 yeni).

**Kesim Noktası artık G17-G21'in TAMAMIYLA production-hazır bir şablon:**
HPF/LPF + şıklı + tip gizleme rampası + seans-index eşiği + iki renkli
filtre eğrisi + öğretici Türkçe metin + Frekans Bulma'yla hizalı geçiş
süresi — hepsi sert testten geçti. Kalan tek şey (bilerek kapsam dışı):
karşılaştırma-önizleme butonları (Senin cevabın/Doğru cevap/Temiz) — ayrı
bir iş, engelleyici değil.

Commit `a6c0c74` — G20: Kesim Noktası — cevap sonrası öğretici metin geri
bildirimi (mix mantığı). **Kesim Noktası'nın kapsam dışı bırakılan SON
parçasıydı — mod artık HPF/LPF + şıklı + tip gizleme rampası + iki renkli
filtre eğrisi + öğretici Türkçe metinle tam iskelet.** Üç durum, TEK yerde
(`ZONE_EFFECT` tablosu, kesim-noktasi.js) şablonlanmış: (1) doğru — kısa
onay + o bölgede/tipte filtrenin mix'te ne işe yaradığı; (2) tip doğru,
frekans yanlış — hangi YÖNE kaçtığını (çok yukarı/çok aşağı) + o yöndeki ses
etkisini anlatır (HPF'de yukarı kaçmak DAHA agresif/inceltir, LPF'de yukarı
kaçmak DAHA AZ agresif/fazla tiz bırakır — yön↔etki eşlemesi filtre tipine
göre BİLEREK ters); (3) tip yanlış — HPF/LPF farkını karşılaştırmalı
hatırlatır, frekans hatası bu durumda AYRICA anlatılmaz (kısa tutmak için).
Teknik değer (dB/oct, Q) hiç verilmiyor. `teachingText(question, answer)`
YENİ, saf, doğrudan test edilebilir bir fonksiyon; `getFeedbackData` bunu
çağırıp title/detail'e bölüyor.

**Doğrulama sırasında bulunup aynı commit'te düzeltilen bir hata:** app.js'te
`submitCutoffGuess`, `setFeedback`'i HER ZAMAN `showResult=false` ile
çağırıyordu — Frekans Bulma'nın kalıbından (o, `#freqInfo` zengin panelini
kullandığı için `false` geçiyor) G17'de körü körüne kopyalanmıştı. Kesim
Noktası'nın `#freqInfo` gibi bir paneli YOK — `#feedbackBox` onun TEK geri
bildirim yüzeyi; `showResult=false` iken kart `display:none` kalıyor,
öğretici metin (G13'ten beri, hatta bu görevden önce de) HİÇ GÖRÜNMÜYORDU.
Artık `feedback.showResult` (her zaman `true`) kullanılıyor.

Frekans Bulma'ya (frekans-bulma.js) dokunulmadı — canlı doğrulandı: kendi
`#freqInfo` akışı aynen çalışıyor, `#feedbackBox` hâlâ `display:none` (hiç
sızma yok). Doğrulama ekran görüntüsüyle DEĞİL (QUICK_ADVANCE_MS=700ms'in
altına düşmüyor), JS ile "tıkla+150ms bekle+DOM oku" tekniğiyle yapıldı —
üç durum da (`cls`, `title`, `detail`) tam beklenen metinle doğrulandı
(örnekler için bkz. commit mesajı). `npm test`: **177/177** (168 eski + 9
yeni — 3 durum × üretim doğruluğu + kısalık(<280 karakter) + saflık +
showResult garantisi).

Commit `3a5c84c` — G19: Kesim Noktası — cevap sonrası filtre eğrisi görseli
(kullanıcı + doğru cevap, iki renk). Soru sırasında spektrumda SADECE barlar
görünür (kulakla bulma ilkesi korunur); cevap verildikten SONRA (`!roundActive
&& activeQuestion` — tek gate, hem doğru cevapta hem süre dolunca otomatik)
spektrumun üstüne İKİ eğri çiziliyor: kullanıcının cevabı (amber `--am`
#FFC246) ve doğru cevap (yeşil `--gr` #2BD9A8) — mevcut paletten, yeni renk
yok. Eğriler GERÇEK bir `BiquadFilterNode`'un `getFrequencyResponse()`'u
okunarak çiziliyor (frekans-bulma.js:`getEqCurveForQuestion` ile AYNI teknik),
eksenle (`faXToF`, N=160) aynı log ölçekte örnekleniyor. HPF/LPF yanıtı
peaking'in aksine tek yönlü (0 dB geçen bantta, durdurma bandında -∞'a
yaklaşır) — 0 dB ÜSTE (düz, geçen bant), -30dB ALTA (durdurma bandı) oturan
tek-yönlü bir eşleme kullanıldı; "HPF solda iner sağda düz, LPF sağda iner
solda düz" görünümü bundan DOĞAL olarak çıkıyor, elle yön mantığı yazılmadı.

Kullanıcının cevabı (freq+filterType) yeni bir app.js değişkeninde
(`cutoffGuess`) tutuluyor — frekans-bulma.js'in `freqGuessHz`'i sadece Hz
taşıyor, bu modun cevabı hem frekans HEM tip içerdiği için (tip gizli
sorularda yanlış tip seçilebiliyor) ayrı bir alan gerekti; `submitCutoffGuess`
answer'ı AYNEN (yanlış tip dahil) kaydediyor — kullanıcı yanlış tip seçtiyse
eğrisi de o YANLIŞ tipte çiziliyor (öğretici, canlı doğrulandı). Her yeni
soruda (`renderQuestion`) null'a dönüyor; `drawVisualizer`'ın `overlayState`'ine
eklendi, Frekans Bulma bu alanı hiç okumuyor.

Doğrulama (tarayıcıda, canlı): iki eğri farklı renkte çiziliyor (amber+yeşil,
küçük lejant, zoom ile renk ayrımı doğrulandı); soru sırasında eğri gizli
(sadece bar+eksen); HPF/LPF yönü ve kesim frekansı hizası doğru (761 Hz LPF
amber + 1.75 kHz HPF yeşil aynı ekranda, ikisi de doğru yönde/frekansta);
doğru cevapta tek yeşil çizgi görünüyor (amber tam örtüşüyor, altta); tip
yanlış seçilince kullanıcı eğrisi doğru cevabın TAM TERSİ yönünde çiziliyor
(yukarıdaki 761Hz LPF/1.75kHz HPF örneği). `npm test`: **168/168**. Frekans
Bulma regresyonu yok (kendi peaking-EQ eğrisi/panel canlı doğrulandı, sıfır
konsol hatası).

Commit `71dad21` — G18: Kesim Noktası — tip gizleme seans içi rampaya bağlandı,
"Dokunmalı" gizlendi, sıkı bug taraması. Cihaz testinde bulunan iki sorun +
şablon olacağı için modun genelinde derinlemesine bug taraması istendi.

**Sorun 1 çözümü:** tip gizleme (HPF/LPF SÖYLENİR mi SÖYLENMEZ mi) artık
zorluğa DEĞİL, oyun oturumu içindeki soru sırasına bağlı — her fresh-start'ta
sıfırlanan yeni bir sayaç (`roundsInThisPlaySession`) ilk `TYPE_REVEAL_
QUESTION_COUNT` (=3) soruda tip söyler, sonrasında HANGİ zorlukta olursa olsun
gizler. **Doğrulama sırasında bulunan gerçek bir hata:** ilk denemede eşik
`session.correct+session.wrong`'a bağlanmıştı — ama `session` SADECE Seans
Sonu ekranının 3 CTA'sında sıfırlanıyor, normal "Oyunu Başlat" tuşu ona hiç
dokunmuyor (kod incelemesiyle doğrulandı, `resetSession()`'ın yorumundaki
"Oyunu Başlat" iddiası YANLIŞ/bayat — düzeltilmedi, sadece not edildi). Bu,
Durdur→Oyunu Başlat ile devam eden GERÇEKTEN yeni bir oturumda bile eşiğin
daha ilk turda tetiklenmesine yol açıyordu (canlı doğrulandı). Ayrı, dar
kapsamlı bir sayaçla düzeltildi — `session`'ın kendisine dokunulmadı.

**Sorun 2 çözümü:** "Dokunmalı" toggle'ı (chip + Oyun Ayarları satırı) artık
Kesim Noktası'nda gizli — aktif modun `getMeta().choiceOnly` bayrağına göre
(yeni, opsiyonel meta alanı) `syncAnswerFormatVisibility()` ikisini birden
gizler/gösterir. Frekans Bulma'da (choiceOnly yok) davranış değişmedi.

**Sıkı bug taraması bulguları:** HPF/LPF dengesi 2000-3000 örneklik testlerle
KANITLANDI dengeli (~%49/%51) — "hep LPF geldi" gözlemi kod bugı DEĞİL, küçük
örneklem tesadüfüydü. UÇ DEĞER sorunu GERÇEKTİ: FA_MIN–FA_MAX (80 Hz–17 kHz)
Frekans Bulma'nın PEAKING bant merkezleri için seçilmişti, HPF/LPF KESİMİ için
uygun değildi — kesim havuzu artık dar `CUTOFF_MIN`–`CUTOFF_MAX` (100 Hz–8 kHz)
aralığına alındı (sınırlar KULAKLA DOĞRULANMADI, makul başlangıç noktası).
Çeldirici üretiminde tekrarlanan frekans/GÖRÜNEN ETİKET yok (yeni test);
zorlukla ölçekleme (şık sayısı 3/4/5/6, mesafe/margin) canlı+testle doğrulandı;
A/B (kuru/işlenmiş) canlı doğrulandı, audio-engine.js'e dokunulmadı;
evaluateAnswer'ın dizi-konumundan bağımsız değerlendirmesi ve tip-gizli
edge case'i testle garanti altına alındı. Bir test flake'i bulunup düzeltildi
(boss-round mesafe testi N=80→600, 8/8 tekrarlı çalıştırmada temiz).

Kapsam korundu: filtre eğrisi görseli/öğretici geri bildirim EKLENMEDİ (sonraki
prompt), createQuestion/evaluateAnswer saf fonksiyon kaldı. Frekans Bulma'ya
regresyon yok (canlı doğrulandı: dalgaya tıklama, EQ eğrisi, zone-tip,
karşılaştırma butonları, "Dokunmalı" chip'i hepsi eskisi gibi). `npm test`:
**168/168** (140 eski + 28 kesim-noktasi).

Commit `304946c` — G17: **Mod 2 "Kesim Noktası" — çalışan iskelet** (HPF/LPF
kesim frekansı bulma, şıklı cevap, zorlukla tip ayrımı). Frekans Bulma'dan sonra
ilk GERÇEK ikinci mod — bu, `app.js`'in `mode.X()` genel dispatch mekanizmasının
(registry.js) BİRDEN FAZLA mod arasında ilk kez fiilen çalıştığı yer. `mode`
artık module-seviyesi bir `let` (önceden `const` idi, tek mod olduğu için hiç
değişmiyordu) — menüden hangi karta basıldığına göre değişiyor (bkz.
`renderModeGrid`'in kart click handler'ı, mod değişiminde eski modun round'u/
sesi/ekran metni temizleniyor).

`www/js/modes/kesim-noktasi.js` (yeni, ŞABLON niyetiyle yazıldı — 6 sözleşme
fonksiyonu + Frekans Bulma'yla aynı-isimli render yardımcıları). Frekans-ekseni
sabitleri (FA_MIN/FA_MAX/AXIS_H/faXToF/faFToX/FA_ZONES/faZoneOf/recordZone/
isBossRound) frekans-bulma.js'ten re-export edilir (jenerik, mode-bağımsız,
duplike edilmedi). Kesim frekansı merkeze (log-geometrik orta, ~1166 Hz) en az
`marginOct` oktav uzakta seçilir (kolayda büyük/uca yakın, zorlaştıkça küçülüp
merkeze yaklaşır) — **bu eşleme KULAKLA DOĞRULANMADI**, Z1'in hassasiyet
eğrisiyle AYNI durum (bkz. dosya başı yorum), makul bir başlangıç noktası.
Kolay/orta: tip söylenir, tüm şıklar aynı tipte. Zor/pro: tip gizlenir, en az
bir çeldiricinin filtre tipi ÇEVRİLİR (doğru şık hariç) — kullanıcı gerçekten
hem tip hem frekans ayrımı yapmak zorunda kalır. Şık sayısı 3/4/5/6
(DIFFICULTY.options). `applyProcessing` tek bir BiquadFilterNode (Q=0.707 sabit,
eğim zorlukla değişimi KAPSAM DIŞI) kurup audio-engine.js'in mevcut kuru/işlenmiş
A/B yoluna bağlanır — o dosyaya DOKUNULMADI.

**Kapsam dışı (bilerek, sonraki bir prompt):** filtre eğrisi görseli
(drawOverlay sadece frekans eksenini çizer), öğretici zone-tip metni,
karşılaştırma-önizleme butonları (Senin cevabın/Doğru cevap/Temiz — app.js'in
`#freqInfo` click-delegasyonu hâlâ SADECE "frequency" moduna kilitli).
`submitCutoffGuess` bu yüzden `submitFrequencyGuess`'in YAPISAL PARALELİ olarak
AYRI yazıldı (ortak "submitAnswer" özütlemesi yerine) — gerçek tekrar ağrısı
3. modda netleşince ortak bir çekirdek çıkarılabilir.

**Doğrulama sırasında bulunup aynı commit'te düzeltilen bir hata:** `#gameTitle`
(oyun ekranı başlığı) `index.html`'de statik "Frekans Bulma" metniydi, `app.js`
hiç güncellemiyordu (tek mod varken sorun değildi — ilk kez Kesim Noktası'na
girilince başlık YANLIŞ "Frekans Bulma" göstererek fark edildi). Artık her kart
tıklamasında doğru mod adıyla senkronlanıyor; aynı kökten, seans-sonu ekranının
"veri yok" fallback başlığı da aktif modun katalog adına bağlandı.

**Dürüst not — ÜRÜN KARARI GEREKTİRİYOR:** `mode-catalog.js`'teki kesim-noktasi
girdisi `unlockLevel:2` — ama `academyLevel` formülü (Z3) HİÇ oynanmamış bir
modun bile +1 katkı yaptığı bilinen bir ödün taşıyor (DURUM.md'de "2. mod
eklendiğinde yeniden değerlendirilmeli" diye ÖNCEDEN kayıtlıydı, bkz. BEKLEYEN
KARARLAR B). Sonuç: kesim-noktasi artık KAYITLI olduğu İÇİN academyLevel
otomatik 2'ye çıkıyor ve kendi kilidini kendi açıyor — canlı doğrulandı (az
ilerlemiş bir hesapta kart hiç kilitli görünmedi, doğrudan oynanabilir geldi).
Kod tarafında dokunulmadı — bu formülün nasıl değişmesi gerektiği (ya da bu
davranışın kabul edilip edilmeyeceği) bir ürün kararı.

Doğrulama (tarayıcıda + npm test): mod oynanabilir (menüden "Kesim Noktası"
başlığıyla oyun ekranı açılıyor, round başlıyor); HPF/LPF gerçekten uygulanıyor
(spektrumda roll-off görsel olarak doğrulandı); zorlukla tip ayrımı çalışıyor
(medium: "Bu bir LPF, kesim frekansı nerede?" + tüm şıklar "LPF"; pro: "Ne tür
filtre, hangi frekansta?" + 6 şıktan 5'i HPF 1'i LPF, canlı ekran görüntüsüyle
doğrulandı); şık sayısı medium'da 4, pro'da 6; boss round doğru çalışıyor;
Frekans Bulma'da REGRESYON YOK (mod değiştirilip geri dönüldüğünde başlık/
Dokunmalı chip/EQ eğrisi/zone-tip/karşılaştırma butonları hepsi eskisi gibi,
konsolda sıfır hata). `npm test`: **160/160** (140 eski + 20 yeni
kesim-noktasi testi).

Commit `ae50e9d` — G16: Kaynak menüsü accordion gruplara çevrildi (kullanıcı
raporu — SENTETİK/DAVUL/ENSTRÜMAN/KENDİ DOSYAM düz liste halinde hepsi açık
duruyordu, "Kendi Dosyam" en altta kalıp ulaşmak için çok kaydırma
gerekiyordu). `openSheet()`'in `<optgroup>`'lu select'ler (bugün için sadece
`sourceSelect`) için ürettiği grup başlıkları artık tıklanabilir birer
`.sheet-group-header` (gerçek `<button>`, D3'te bulunan WebKit flex-buton
genişlik hatasından kaçınmak için `width:100%+text-align:left` açıkça set)
— yanında chevron (▸, açılınca 90° dönüp amber oluyor). Grup gövdesi
VARSAYILAN kapalı (`.collapsed`); `collapseOtherGroups()` bir başlığa
basılınca DİĞER açık grupları kapatıp tıklanan grubu toggle ediyor — tek
açık kuralı. Boş grup gizleme yeni bir mekanizma gerektirmedi:
`populateSourceSelect()`'in var olan `sources.length>0` filtresi
korunduğu için boş `<optgroup>` zaten hiç üretilmiyor, accordion'da da
boş başlık çıkmıyor. Kapsam: sadece sheet'in DOM/CSS üretimi değişti —
`select.value`/`change` akışı, `source-catalog.js`, ses zinciri, A/B,
pitch, pause/resume, WAV parser, X butonu/otomatik geçiş dokunulmadı;
gruplanmamış select'ler (Zorluk/Oyun Türü/Süre/Cevap biçimi) davranış
değiştirmedi (`currentBody` hep `sheetOptions`).

Doğrulama (tarayıcıda, DOM state ölçümüyle): 4 grup accordion, başlığa
basınca açılıyor (ENSTRÜMAN'a basınca 4 satır göründü); tek açık kuralı
JS ile ölçüldü (ENSTRÜMAN açıkken KENDİ DOSYAM'a basınca ENSTRÜMAN
otomatik kapandı, aynı anda tam 1 grup `.open`); sheet HER açılışta 4
grup da kapalı geldi (kapatıp yeniden açılarak doğrulandı); sadece 4
gerçek grup render edildi, fazladan/boş başlık yok; DAVUL > Kick seçildi,
pill "Kick" oldu, round gerçekten Kick kaynağıyla başladı, konsolda sıfır
hata. `npm test`: 140/140.

Commit `77278b8` — G15: X butonu otomatik geçişle BİRLİKTE geri geldi,
**madde 13 KAPANDI**. G14'te kaldırılan `.freq-info-close` butonu geri
eklendi (`frekans-bulma.js`'in iki panel fonksiyonu, `styles.css`,
`app.js`'in `#freqInfo` click-delegasyonu) — G13'ten farklı olarak bu kez
otomatik geçiş mekanizmasıyla ÇAKIŞMADAN birlikte çalışıyor: X'e basan
hemen `goToNextRound()` ile ilerler, basmayan normal otomatik geçişi
bekler, karşılaştırma butonuna basan için otomatik geçiş dinleme
bitene kadar ertelenir.

Madde 13'ün kök sebebi (`loopAwarePreviewMs`'in karşılaştırma-sonrası
geçiş beklemesini kaynağın TAM DÖNGÜ uzunluğuna yuvarlaması — uzun
yüklenen dosyada dakikalarca sürebiliyordu) çözüldü: `audio-engine.js`'ten
`loopAwarePreviewMs` TAMAMEN kaldırıldı (grep doğrulandı — export'ta/kodda
kalmadı, sadece bunu açıklayan bir yorum satırında adı geçiyor). Yerine
`app.js`'te sabit `CMP_PREVIEW_RESUME_MS=3000` geldi — geçiş beklemesi
artık kaynak uzunluğundan TAMAMEN bağımsız. Önizleme sesi (`loop:true`)
bu noktada durdurulmuyor, kesilmeden çalmaya devam ediyor; sadece
otomatik-geçiş zamanlayıcısı bu sabit süre sonunda yeniden kuruluyor.

**Doğrulama sırasında ikinci, daha ciddi bir hata bulundu ve düzeltildi:**
`cmpPreviewStopTimer`'ın geri çağrısı, `roundFlow.captureRemainingAndClear()`
`null` DÖNMEDİĞİNDE `ensureAutoNext`'i yeniden kuruyordu. Orijinal
cevap-sonrası otomatik-geçiş zamanlayıcısı, kullanıcı karşılaştırma
butonuna basana kadar zaten ateşlenmişse (gerçek kullanımda birkaç saniye
sürebilir — otomasyon ortamında da tekrar tekrar gözlendi) `captureRemainingAndClear()`
`null` döner; bu durumda geçiş HİÇ yeniden kurulmuyordu ve tur KALICI
olarak askıda kalıyordu (X/Atla dışında çıkış yolu yoktu) — madde 13'ün
"geç gelir" tanısından daha kötü bir "hiç gelmeyebilir" davranışı.
Canlı testte doğrulandı: 20 saniyelik yüklenmiş WAV'da "Doğru cevap"
önizlemesine basıldıktan sonra tur 15+ saniye boyunca hiç ilerlemedi,
konsolda hata yok. Düzeltme: `remain` null/0 olsa bile `ensureAutoNext`
her zaman çağrılıyor — `roundFlow` zaten null/0 durumunda 1500ms
varsayılana düşüyor (`round-flow.js: ensureAutoNext`).

Doğrulama (tarayıcıda, `test-pause.wav` — 20sn'lik yüklenmiş WAV ile):
X butonu görünür ve basınca feedback paneli anında kapanıp yeni tur
başlıyor (~500ms içinde); hiçbir şeye basmadan bekleme normal otomatik
geçişle ilerliyor (müdahalesiz art arda birden fazla tur); "Doğru cevap"
önizlemesine basıp dinleme artık kalıcı askıda KALMIYOR, birkaç saniye
içinde tur ilerliyor — düzeltmeden önce dakikalarca (hatta hiç) gelmeyen
geçiş artık güvenilir. `npm test`: 140/140.

Commit `0cfd4e3` — G14: geri bildirim geçişi X butonundan tamamen otomatiğe
çevrildi (kullanıcı kararı — X'in "devam mı/çıkış mı/atla mı" olduğu
yorumlanabilir bulundu, akış buton olmadan tamamen otomatik olmalı).
G13'ün eklediği `.freq-info-close` butonu (frekans-bulma.js'in iki panel
fonksiyonundan, styles.css'ten, app.js'in `#freqInfo` click-delegasyonundan)
kaldırıldı. `goToNextRound()` KORUNDU (hâlâ "Atla ▶" tarafından kullanılıyor).
Karşılaştırma-önizlemesi-bitince-otomatik-geçiş-yeniden-kurma mekanizması
(`cmpPreviewStopTimer` bloğu: `captureRemainingAndClear` → dinletme biter →
aynı kalan süreyle `ensureAutoNext`) HİÇ DOKUNULMADI — G13'ten önce de
vardı, X eklenirken üstüne sadece bir dal eklenmişti; o dalı kaldırınca kod
otomatik olarak G13-öncesi doğru davranışına döndü. "Geri bildirim ekranı"
ayar toggle'ı (`prefs.feedbackScreen`) TAMAMEN KORUNDU, hiç değişmedi.

**Dürüst teknik not:** kullanıcının "bu, asıl kilitlenme sorununu da
çözer" varsayımı KISMEN doğru — otomatik yeniden-kurma zaten çalışıyordu
(G13'te bozulmamıştı). Ama G13'ün asıl teşhis ettiği kök neden
(`loopAwarePreviewMs`'in UZUN yüklenen dosyalarda önizleme bitiş süresini
TAM DÖNGÜYE — dakikalarca — yuvarlaması, `audio-engine.js`, DOKUNULMADI,
"ses çalma" davranışı kritik-korunacaklar listesindeydi) bu turda
ÇÖZÜLMEDİ — çok uzun bir şarkıda karşılaştırma dinleyen kullanıcı için
sonraki soru hâlâ dakikalarca gecikebilir, sadece artık "asla gelmeyecek"
değil "geç gelecek" (bkz. AÇIK İŞLER madde 13).

Doğrulama: 6 yeni birim testi (`test/round-flow.test.mjs`, `node:test`'in
`mock.timers`'ıyla — 140/140 toplam): tek seferlik tetikleme, kalan süreyi
doğru yakalayıp zamanlayıcıyı iptal etme (dinlerken soru DEĞİŞMEZ), yakalanan
süreyle yeniden kurulunca o süre sonunda tetiklenme, art arda dinletmede
SADECE SONUNCUSUNUN sayılması. Tarayıcıda: kartta X yok (ekran görüntüsü),
"Doğru cevap" tıklanıp HİÇBİR buton kullanılmadan round kendiliğinden
ilerledi (Soru 151→153), sıfır konsol hatası.

Commit `4119bce` — G13: geri bildirimde X (kapat) butonu + "Geri bildirim
ekranı" ayarı (kullanıcı raporu — karşılaştırma butonuna basınca sonraki
soruya geçiş kilitleniyordu, cihazda doğrulanmıştı). Kök sebep KANITLANDI:
sonraki soruya geçiş `roundFlow.ensureAutoNext()`'in kurduğu bir
`setTimeout` ile tetikleniyor; karşılaştırma butonuna basınca bu BİLEREK
duraklatılıyor, önizleme bitince `audioEngine.loopAwarePreviewMs(3000)` ile
hesaplanan bir süre sonra devam ediyor — bu fonksiyon süreyi kaynağın TAM
DÖNGÜ uzunluğuna yuvarlıyor (kısa gömülü örnekler için doğru tasarım). G7/
G8'den beri "upload" kaynağının `AudioBuffer`'ı KULLANICININ YÜKLEDİĞİ TÜM
ŞARKI kadar uzun olabiliyor — 20 saniyelik bir dosyada yuvarlama 3000ms'yi
20000ms'ye çıkarıyor, dakikalarca sürebilecek dosyalarda kullanıcı fiilen
kilitlenmiş gibi görünüyordu.

Çözüm 1 — X butonu: `showFreqInfoPanel`/`showProPlusInfoPanel`'in kurduğu
karta `.freq-info-close` eklendi (mevcut `#freqInfo` click-delegasyonuna
dahil, yeni dinleyici açılmadı). "Atla ▶"'nın çalışan ilerletme mantığı
`goToNextRound()` adıyla ortak fonksiyona çıkarıldı; X hem bunu çağırıyor
hem karşılaştırma önizlemesinin bekleyen zamanlayıcısını iptal ediyor —
uzun bir önizleme sürsün ya da sürmesin HER ZAMAN çalışan bir çıkış yolu
var artık. `loopAwarePreviewMs`'e (ses çalma davranışı) dokunulmadı —
otomatik yol hâlâ uzun sürebilir ama artık TEK yol değil.

Çözüm 2 — "Geri bildirim ekranı" ayarı: `prefs.feedbackScreen` (varsayılan
`true`), Bildirimler/Kulaklık uyarısı ile AYNI localStorage/toggle deseni.
Kapalıyken cevap sonrası panel HİÇ açılmıyor, `scheduleNext()`
`QUICK_ADVANCE_MS` (700ms) kullanıyor — skor/XP/can mantığı DEĞİŞMEDİ,
sadece görsel kart ve bekleme süresi. **Kapsam notu:** `submitProPlusGuess`
(Pro Plus zorluğu) bilerek KAPSAM DIŞI bırakıldı — `revealAnimator`'ın
kendi bant-bant açılma animasyonu hızlı-ilerleme ile çakışma riski
taşıyordu; X butonu proplus panelinde de var ama ayar toggle'ı sadece
frekans modunda etkili.

Doğrulama: 4 yeni birim testi (`freshPrefs`/`loadPrefs`, 130→**134**).
Tarayıcıda: 20sn'lik gerçek bir WAV yüklenip cevap verildi, "Doğru cevap"
önizlemesi tıklanıp HEMEN ardından X tıklandı — round anında ilerledi
(20sn beklemeden), sıfır konsol hatası. Ayar kapatılınca `#freqInfo` hiç
açılmadı (`classList.contains('hidden')===true`), round hızlı ilerledi;
switch localStorage ile senkron doğrulandı (kapalı↔açık). `npm test`:
134/134. **iOS cihazda kulakla doğrulama kullanıcıda.**

Commit `5d86afa` — G12: yüklenen ses cevap verince duraklıyor, kaldığı
yerden devam ediyor (kullanıcı raporu — cihazda doğrulanmıştı, "ses geri
bildirimde ilerliyor" bug'ı). Kök sebep KANITLANDI (kod incelemesi + canlı
ölçüm): cevap-işleme yolları `audioEngine.stopAudio()`'yu zaten
çağırıyordu (ses fiziksel olarak susuyordu) ama `stopAudio()` `upload.js`'in
mantıksal `offset`/`startedAt`/`playing` durumundan HABERDAR DEĞİLDİ — bir
sonraki `getSourceNode()` çağrısı `playing` hâlâ `true` olduğu için GERÇEK
(duvar saati) geçen süreyi offset'e ekliyordu. Canlı ölçüm: cevap sonrası
`pausePlayback()` hiç çağrılmadan art arda iki `getSourceNode()` çağrısı
offset'i 0.000→14.611→4.764'e sıçrattı.

Çözüm — TEK merkezi düzeltme: `audio-engine.js`'e `activeUploadManager`
referansı eklendi (`buildQuestionChain` her çağrıldığında `sourceType===
"upload"` ise güncellenir). `stopAudio()` artık HER çağrıldığında (cevap
verme, karşılaştırma önizlemesi bitişi, Durdur, oyun bitti, mod değişimi —
app.js'teki ~10 çağrı sitesinin HİÇBİRİNE dokunmadan) fiziksel durdurmayla
AYNI ANDA `pausePlayback()`'i de çağırıp offset'i donduruyor. Karşılaştırma
dinletmesi ayrıca ele alınmadı — YAPISAL olarak aynı `getSourceNode()`'u
kullanıyor, donmuş offset'i otomatik okuyor. Gömülü/sentetik kaynaklar
`activeUploadManager=null` olduğu için hiç etkilenmedi.

Doğrulama: 5 yeni birim testi (`test/upload-pause-resume.test.mjs`,
125→**130** — start/pause/resume, pause-olmadan-drift regresyon
karşılaştırması, buffer-aşımı modulo, startFromZero, art-arda-pause).
Tarayıcıda gerçek WAV yüklendi, ~10sn çaldıktan sonra cevap verildi —
offset 9.9265'te donduruldu; birkaç GERÇEK saniye sonra otomatik başlayan
YENİ tur TAM 9.9265'ten devam etti (hiç ilerlemedi). Ardından "kick"
(gömülü örnek) sorunsuz çaldı, konsolda sıfır hata (regresyon yok).
`npm test`: 130/130. **iOS cihazda kulakla doğrulama kullanıcıda** — bu
ortamda gerçek cihaz yok.

Commit `6ce73a8` — G11: upload dosya boyutu sınırı 30→**100 MB**. Kullanıcı
gerçek WAV dosyalarının 30 MB'ı aştığını bildirdi. OOM riski (G8'de 30 MB'ın
seçilme sebebi — decodeAudioData sıkıştırılmış formatları büyük PCM'e açar,
iOS WKWebView'ı çökertebilir) mp3/m4a/aac/ogg için hâlâ geçerli olduğu
açıklandı; kullanıcı bunu BİLEREK kabul ederek tek sınırı 100 MB'a çıkardı
(WAV zaten sıkıştırılmamış olduğu için kendisi güvenli, ama sınır tüm
formatlara ortak). Sadece `MAX_AUDIO_FILE_MB` sabiti değişti — kilitlenme
çözümü (G8), WAV parser (G10), çalma yolu dokunulmadı. `npm test`: 125/125
(değişmedi).

Commit `f603693` — G10: WAV yüklemesi kalıcı düzeltildi, **E1 KAPANDI**
(kök sebep artık kanıtlı — eski E1 girdisindeki "BİREBİR KANITLANAMADI"
notu geçerliliğini yitirdi, bkz. aşağıdaki E1 tarihçesi). G8'de upload
decodeAudioData yoluna taşınınca WAV kırıldı: kök sebep, iOS WKWebView'in
decodeAudioData'sının bazı WAV alt-tiplerini (24-bit PCM, 32-bit float —
Logic Pro/Pro Tools'un WAVE_FORMAT_EXTENSIBLE ile export ettiği alt-tipler)
açamaması, bilinen bir WebKit sınırlaması. Masaüstü Chrome'da bu hatayı
ÜRETEMEDİM (decodeAudioData üçünü de sorunsuz decode etti) — bunun yerine
`decodeAudioData`'yı geçici olarak her zaman reddedecek şekilde yamalayıp
iOS'taki başarısızlığı KONTROLLÜ olarak simüle ettim, düzeltmenin
devreye girdiğini kanıtladım.

Çözüm: `www/js/core/wav-parser.js` — SAF fonksiyon (`decodeWavPcm`,
AudioContext/DOM bağımlılığı yok), RIFF/fmt/data chunk'larını elle
ayrıştırıp PCM/float veriyi Float32'ye çeviriyor (8/16/24/32-bit PCM +
32/64-bit float, WAVE_FORMAT_EXTENSIBLE SubFormat GUID'i dahil).
`upload.js`: önce `decodeAudioData` dener (KOPYA üzerinde — orijinal
arrayBuffer WAV yedeği için sağlam kalır), başarısız olur ve dosya
RIFF/WAVE imzalıysa `decodeWavPcm`'e düşer, sonucu `audioCtx.createBuffer`+
`copyToChannel` ile AYNI AudioBuffer'a çevirir — gömülü örneklerle AYNI
AudioBufferSourceNode zincirine girer. İkisi de başarısız olursa
AudioContext'e dokunmadan net hata, pink noise'a SESSİZCE düşülmüyor.

Doğrulama: 8 yeni birim testi (16/24/32-bit/stereo/EXTENSIBLE/hata
senaryoları, 117→**125**). Tarayıcıda gerçek 523.25 Hz sinüs WAV'ları
(16/24/32-bit float) yüklendi — Chrome'da native decode başarılı; ardından
decodeAudioData yamalı-başarısız haldeyken AYNI 24-bit ve 32-bit float
dosyalar tekrar yüklendi: konsolda "decodeAudioData hatası → elle WAV
ayrıştırma BAŞARILI", round başlatıldı, spektrum doğru 523 Hz tepesini
gösterdi (pink fallback DEĞİL). Yama kaldırıldıktan sonra "kick" (gömülü
örnek) sorunsuz çaldı — G8'in kilitlenme çözümü BOZULMADI. `npm test`:
125/125. **iOS cihazda gerçek Logic Pro WAV'ının çalıştığı kullanıcı
tarafından doğrulanacak** — bu ortamda gerçek cihaz yok.

G9 — "odak aralığı spektrumu daraltmıyor" teşhisi (kod değişikliği YOK,
sadece DURUM.md notu — bkz. AÇIK İŞLER madde 11). Kullanıcı raporu G7/G8'in
(AudioBufferSourceNode geçişi) analyser bağlantısını kopardığını
varsayıyordu — kod incelemesiyle (git log + doğrudan kaynak okuma) bunun
YANLIŞ olduğu kanıtlandı: (1) odak aralığı seçimi doğru yere ulaşıyor ve
GERÇEKTEN çalışıyor, ama SADECE soru üretim havuzunu (`createQuestion`'a
geçen `focusRange`) daraltıyor; (2) spektrum ekseni M1-4'ten (`5c608f4`,
aylar önce) beri `FA_MIN`/`FA_MAX` (80 Hz–17 kHz) sabitine kenetli — kodun
kendi yorumu bunu açıkça belgeliyor, hiçbir zaman odak aralığından
beslenmedi; (3) `analyser`/`masterGain`/`muteGain` bağlantısı G4-G8'in
HİÇBİRİNDE değişmedi (`git log -p` ile üç commit tek tek tarandı). Sonuç:
"önceden çalışıyordu" öncülü yanlıştı — bu bir regresyon değil, davranış
her zaman böyleydi. Kullanıcı onayıyla (ekseni de daraltmak ayrı, riskli
bir refactor — FA_MIN/FA_MAX okuyan tüm çizim fonksiyonları + tıklama→Hz
haritalaması etkileniyor) kod değişikliği yapılmadı, bulgu AÇIK ÖZELLİK
olarak kaydedildi.

Commit `e9dfd4e` — G8: kullanıcı dosyası yükleme AudioBuffer'a taşındı, "ses
motoru kilitleniyor" bug'ı çözüldü (E1'in devamı — WAV picker sorunundan
AYRI, yeni bir bug: kullanıcı dosya yükleyince TÜM kaynaklar çalmaz
oluyordu). Kök sebep KOD İNCELEMESİYLE teşhis edildi (tahmin değil):
tek AudioContext var (grep doğrulandı), createMediaElementSource path
başına bir kez çağrılıyordu, null mediaSource'la buildQuestionChain'e
ulaşan bir yol da yoktu — yani "çift context" ve "çift createMediaElementSource"
hipotezleri EKARTE edildi. Geriye kalan açıklama: G7'de gömülü örnekler
AudioBufferSourceNode'a taşınmıştı ama kullanıcı dosyası hâlâ
MediaElementAudioSourceNode kullanıyordu — AYNI ses grafiğinde İKİ FARKLI
source-node tipinin karışması, iOS WebKit'te bilinen ama bu ortamda
(masaüstü Chrome) yeniden üretilemeyen bir etkileşim sorunu.

Kullanıcı onayıyla (30 MB/OOM trade-off'u soruldu): upload.js tamamen
AudioBuffer yoluna taşındı (File.arrayBuffer()+decodeAudioData+
AudioBufferSourceNode, gömülü örneklerle AYNI çalma yolu). MAX_AUDIO_FILE_MB
120→**30** (decodeAudioData sıkıştırılmamış PCM'e açar — 120 MB'lık bir
dosya 2+ GB'a çıkıp OOM ile çökertebilirdi, try/catch bunu YAKALAYAMAZ).
Pozisyon elle takip ediliyor (offset/startedAt — AudioBufferSourceNode
pause/resume desteklemiyor), her tur/karşılaştırma-önizlemesi TAZE bir node
alıp kaldığı yerden devam ediyor.

Tarayıcıda GERÇEK doğrulama: sentetik bir WAV (440 Hz) yüklendi ve çalındı
(spektrum beklenen dar tepeyi gösterdi), AYNI oturumda ARDINDAN "kick" ve
"hihat" (gömülü örnekler) ayrı ayrı sorunsuz çaldı, konsolda sıfır hata —
yani upload SONRASI gömülü kaynaklar KİLİTLENMEDİ (bildirilen bug'ın tam
tersi canlı doğrulandı). 30 MB üstü dosya AudioContext'e dokunmadan
reddediliyor (canlı test edildi). `npm test`: 117/117. **Metodolojik not:**
doğrulama sırasında dev sunucusunun (python http.server, Cache-Control
header'ı yok) bazı JS modüllerinin Chrome'da agresif önbelleklendiği
(yeni sekme + hard reload bile yetmedi) keşfedildi — `fetch(url,
{cache:'reload'})` ile elle tazelendi; bu sadece bu geliştirme ortamına
özgü, üretim/iOS bundle'ını etkilemiyor. **iOS cihazda kilitlenmenin
gerçekten kalktığı kullanıcı tarafından doğrulanacak.**

Commit `4a75785` — G7: sample çalma AudioBuffer'a taşındı (XHR/blob çekme +
decodeAudioData + AudioBufferSourceNode), iOS kesiklik ve loop sorunu çözüldü.
G6'nın HTMLAudioElement yolu "HTTP 0"ı çözmüştü ama cihazda kesik kesik çaldı
ve loop noktasında tıklama/boşluk vardı (kullanıcı raporu) — streaming/
element tabanlı çalma kısa, hassas zamanlamalı döngüler için uygun değil.
Yeni yol iki yöntemin iyi yanını birleştiriyor: ÇEKME için `fetch()` yerine
`XMLHttpRequest` (arraybuffer) — WKWebView'da yerel dosya `fetch()`'i
engelliyordu, XHR aynı işi görüyor; ÇALMA için `decodeAudioData` +
`AudioBufferSourceNode` — sentetik kaynakların (noise/synth) ZATEN kullandığı
yol, kusursuz loop sağlıyor. AudioBuffer path başına Promise olarak
cache'leniyor (decode SADECE BİR KEZ, canlıda geçici bir teşhis loguyla
ölçüldü: ilk çalma "miss-xhr", ikincisi "hit" — sıfır yeni istek). Her turda
yine de taze bir `AudioBufferSourceNode` kuruluyor ("kalıcı graf mutasyonu
yok" kuralı korunuyor). `npm test`: 117/117. Tarayıcıda 6 farklı örnek (kick/
hihat/snare/vokal/tom/bas) tek tek test edildi, konsolda sıfır hata, her
birinin spektrumu görsel olarak kendi karakterinde. **iOS cihazda kesikliğin
gerçekten gittiği kullanıcı tarafından doğrulanacak** — bu ortamda gerçek
cihaz/simülatör yok.

Commit `2ceb992` — G6: sample yükleme yolu HTMLAudioElement'e taşındı, iOS
"HTTP 0" çözüldü. Kök sebep (kullanıcı cihazda ölçtü, Safari Web Inspector):
`buildSampleSource` (G4'te eklenen yol) `fetch()+decodeAudioData()`
kullanıyordu — WKWebView yerel bundle dosyalarını `fetch()` ile çekmeyi
engelliyor, "HTTP 0" veriyor (format sorunu değildi, G5'teki .aiff→.m4a
değişikliği bu yüzden HTTP 0'ı çözmedi). `upload.js`'in zaten kullandığı
ÇALIŞAN desene (`new Audio(path)` + `createMediaElementSource`) taşındı.
`{el,node}` path başına KALICI cache'leniyor (`uploadedMediaSource` ile aynı
ilke — bir elementten `createMediaElementSource` sadece bir kez çağrılabilir),
ilk yüklemede `canplaythrough` bekleniyor, hata durumunda mevcut try/catch +
pink noise fallback DEĞİŞMEDİ. `buildQuestionChain`'deki eski `sample.stop()`
çağrısı kaldırıldı (MediaElementAudioSourceNode'da yok).

Doğrulama sırasında kullanıcı gerçek 9 m4a dosyasını `www/audio/` altına
koymuştu (bu görevden BAĞIMSIZ, kendi işlemi) — tarayıcıda "kick" ve "hihat"
ayrı ayrı test edildi, konsolda SIFIR hata, iki spektrum görsel olarak
BİRBİRİNDEN AYRI ve doğru karakterde (kick: düşük frekans kümesi, hi-hat:
geniş bant/tiz ağırlıklı) — gerçek dosyaların pink noise fallback'i DEĞİL,
doğrudan decode edilip çalındığı doğrulandı. `npm test`: 117/117. iOS
cihazda HTTP 0'ın gerçekten kalktığı KULLANICI TARAFINDAN doğrulanacak (bu
ortamda gerçek cihaz/simülatör yok). NOT: 9 gerçek m4a dosyası bu commit'e
dahil edilmedi (kod-yolu değişikliğinin kapsamı dışında), `www/audio/`
altında halen untracked — ayrı bir kararla eklenmeli (bkz. AÇIK İŞLER 10,
güncellenmesi gerekiyor artık dosyalar mevcut).

Commit `2d2bd6f` — G4: gerçek ses kaynakları eklendi (9 sample, DAVUL+ENSTRÜMAN).
`www/audio/` klasörü oluşturuldu (dosyaların KENDİSİ henüz yok, kullanıcı elle
koyacak — `.gitkeep` ile izleniyor, `cap sync` sonrası `ios/App/App/public/audio/`
altında doğrulandı). `source-catalog.js`'teki DAVUL (5: kick/snare/hihat/tom/
groove) ve ENSTRÜMAN (4: bass/bass_alt/guitar/vocal) grupları `kind:"sample"` +
`samplePath:"audio/<dosya>.aiff"` ile dolduruldu. Kaynak menüsü (`app.js
populateSourceSelect`) `SOURCE_GROUPS`'tan otomatik üretildiği ve boş grupları
zaten filtrelediği için kod değişikliği gerekmedi — tarayıcıda DOM'dan doğrulandı
(4 optgroup, 9 yeni option). `audio-engine.js`'teki `buildQuestionChain` sample
404/decode hatasında zaten sessizce pink noise'a düşüyordu (`kind:"sample"` daha
önce hiç kullanılmadığı için bu yol hiç tetiklenmemişti) — bu görev ilk kez
gerçek koşullarda (kick.aiff 404) tetikledi: konsolda YAKALANMIŞ hata, uygulama
çökmedi, round pink noise ile normal aktı. `npm test`: 117/117 (değişmedi).

Commit `b8c4cab` — G3: geliştirici modu (gizli Pro test anahtarı). Ayarlar >
Hakkında > Sürüm numarasına 7 kez dokununca "Geliştirici" bölümü açılıyor
("Pro'yu simüle et" anahtarı + kapatma seçeneği), ayrı bir localStorage
anahtarında (`eqEarTrainerProXDev`) saklanıyor — prefs'e KARIŞTIRILMADI.
Tek doğruluk kaynağı: `isUserPro()` (app.js:502) = `realPro` (şu an sabit
false, IAP yazılınca buraya bağlanacak) `|| devFlags.simulatePro`. 7 çağrı
noktası: `loseLife()`, `finalizeIfGameOver()`, 3x `currentLives<=0` kontrolü,
`syncAccountLine()`, `applyProLockVisibility()`. `loseLife()` artık bu
fonksiyonun arkasına alındı — Pro'da `currentLives` hiç azalmıyor.

Tarayıcıda canlı doğrulandı: Pro kapalıyken kilitler normal (can 4→3 azaldı),
Pro açıkken Araçlar'daki iki kilit (Analiz/Referans filtreleri) kalkıyor ve 3
art arda yanlış cevapta can "4"te sabit kaldı (hiç azalmadı). 7-dokunuşla
açılma+toast, localStorage kalıcılığı (reload sonrası bölüm otomatik görünür)
ve "Geliştirici modunu kapat" ayrı ayrı test edildi. Mod sayısı (14) ve seans
soru sayısı (10) Pro açılınca DEĞİŞMEDİ — kodda hiçbir mod tier'a göre kilitli
değil (sadece seviyeye göre, bkz. BEKLEYEN KARARLAR **B**) ve "10 Soruluk
Bölüm" zaten herkes için sabit 10 soru (bkz. BEKLEYEN KARARLAR **I.4** — bu
görev var olmayan bir kısıtlamayı kaldırmadı, zaten yoktu). `npm test`:
117/117.

**Z1-Z7 — ZORLUK MİMARİSİ (gece oturumu, kullanıcı yoktu, sabah gözden geçirilmeli)**
DURUM.md'de tasarım kararı olarak kayıtlı ama kodda hiç olmayan zorluk mimarisi
(logaritmik ölçek, seans rampası, mod-bazlı seviye, kişiselleştirme, Otomatik/
Sabit ayarı, lvlSheet, autoDiffAsk) baştan sona koda geçirildi. Her karar
noktasında (kullanıcı olmadığı için) makul bir değer seçilip DURUM.md
"ZORLUK MİMARİSİ — OTOMATİK VERİLEN KARARLAR" bölümüne gerekçesiyle yazıldı —
hiçbiri kesin doğru iddia edilmiyor, kulakla ayarlanmayı bekliyor.
- `61a50a4` Z1: `core/difficulty-curve.js` — logaritmik zorluk eğrisi (gain/Q/
  tolerans/süre), LEVEL_CAP=20 tavanı, tavan-sonrası bağlam zorluğu (gain+süre,
  katman-ekleme UYGULANMADI). 9 yeni test.
- `446c465` Z2: `core/session-plan.js` — largest-remainder seans rampası
  (10 soru: 3/3/3/1, 5 soru: 2/2/1/0), ilk-soru-kolay+kalan-karışık kararı,
  serbest mod için ağırlıklı per-soru seçim. 8 yeni test.
- `7f47a01` Z3: `core/storage.js`+`core/progress.js` — mod başına XP (perMode,
  perDiff'ten AYRI ad alanı — YAPISAL bir çakışma riskini önceden önledi),
  akademi seviyesi (mod seviyelerinin toplamı), göç (eski veri kaybolmadan
  taşındı, canlı doğrulandı: 99→126 XP). 16 yeni test.
- `16f0806` Z4: `core/personalization.js` — bölge bazlı zayıflık skoru (isabet+
  ortalama sapma), ağırlıklı soru üretimi (agresiflik sınırı: en fazla 3x),
  frekans-bulma.js'e WIRE EDİLDİ. 11 yeni test.
- `f576bc9` Z5: "Otomatik" zorluk modu GERÇEK oldu (`applyAutoDifficulty`,
  `tierForLevel` köprüsü, `prefs.difficultyMode` kalıcı).
- `973865e` Z6: `lvlSheet` sıfırdan kuruldu — Z1/Z3'ün gerçek değerlerini
  gösteriyor (qToOctaveBandwidth RBJ formülü dahil, +5 test), canlı elle
  çapraz doğrulandı.
- `ffc394f` Z7: `autoDiffAsk` sıfırdan kuruldu — tetikleme koşulu PROTOTİPTEN
  okundu (dokunma-tetiklemeli, performans-tetiklemeli DEĞİL). Testte YAN BUG
  bulundu ve düzeltildi (Oyun Ayarları'ndaki Zorluk satırı auto-değişimde
  donuk kalıyordu).
`npm test`: 68→117 (49 yeni test, hepsi saf fonksiyon). Konsol hatası hiçbir
adımda yok. Detaylı kararlar/gerekçeler için bkz. "ZORLUK MİMARİSİ — OTOMATİK
VERİLEN KARARLAR" bölümü altta.

A/B döngüsünde pitch kayması (bug raporu → teşhis → düzeltme) — kullanıcı (14 yıllık
müzik prodüktörü) yüklenen WAV dosyasında A/B otomatik döngüsü sırasında pitch'in
kaydığını bildirdi ("44.100'den 48.000 olmuş gibi"). Teşhis aşaması: AudioContext
tek bir singleton, sabit sampleRate — hiç değişemez; playbackRate hiçbir yerde set
edilmiyor; 44 canlı konsol ölçümünde (eşleşen 44.1kHz, uyuşmayan 48kHz dosya/44.1kHz
context, sentetik Pink Noise) audioCtx.sampleRate/playbackRate ilk çalma ile A/B
döngüsü arasında BİREBİR AYNI kaldı — JS düzeyinde fark kanıtlanamadı. Kod incelemesi
gerçek kök sebebi buldu: A/B döngüsü (M1-5) her 2000ms'de `buildQuestionChain`'i
YENİDEN çağırıyordu, bu da yüklenen dosya için CANLI ÇALAN `uploadedMediaSource`'u
(MediaElementAudioSourceNode) disconnect edip yeniden connect ediyordu — WebKit'te
bu deseni JS'ten hiç gözlemlenemeyen bir motor-düzeyi resample sapmasına yol açabilir
(zaten AÇIK İŞLER madde 5'te "A/B gerçek bypass değil" olarak kayıtlıydı). Kullanıcı
onayıyla asıl mimari çözüm uygulandı: `audio-engine.js`'te artık HER ZAMAN paralel
kuru+işlenmiş yol kuruluyor (dryGain/wetGain), A/B toggle'ı `audioEngine.
setProcessed()` ile SADECE 50ms'lik bir gain crossfade yapıyor — kaynak/filtre
grafiği tur boyunca hiç bozulmuyor. `app.js`'teki `toggleAB()` artık `buildQuestionChain`'i
hiç çağırmıyor. Enstrümante edilmiş canlı doğrulama (AudioNode.prototype.connect/
disconnect'e geçici sayaç eklenerek): eski kodda her A/B toggle'ı 1 connect+1
disconnect üretiyordu; yeni kodda uzun bir A/B döngüsü boyunca (tek tur içinde,
birden fazla toggle) SIFIR connect/disconnect ölçüldü. `npm test`: 68/68. Gerçek
pitch algısı (kulakla) DOĞRULANMADI — bu ortamda ses duyulamıyor, cihazda kontrol
edilmeli.

Commit `a377d80` — F1: geri bildirim iki kez gösteriliyordu (bug, AÇIK İŞLER
madde 4'ün ta kendisi — bu maddeyle KAPANDI). Kök sebep: `submitFrequencyGuess`/
`submitProPlusGuess` hem `#feedbackBox`'ı (basit kart) hem `#freqInfo`'yu (zengin
kart — bölge açıklaması, karşılaştırma butonları) AYNI ANDA dolduruyordu, ikisi
de görünür kalıyordu. Çözüm: `#feedbackBox` artık gösterilmiyor (`showResult`
zorla false); ondaki, `#freqInfo`'da OLMAYAN bilgi (kalite sözcüğü "🎯 Tam
isabet!" vb. ve yanlışta "Kalan can: N") yeni `appendFreqInfoNote()` yardımcısıyla
`#freqInfo`'nun içine taşınıyor — bilgi kaybı yok. `onTimeUp()` bilerek
dokunulmadı (kendi `showFreqInfoPanel`'ı çağırmıyor, `#feedbackBox` orada hâlâ
tek mekanizma). Masaüstü Chrome'da hem doğru hem yanlış cevap için TEK kart
doğrulandı (skor/XP doğru işleniyor). `npm test` 68/68. Cihazda KONTROL EDİLMEDİ.

Commit `160e37c` — F2: geri bildirim süresi 1.5sn sabitten doğru=4sn/yanlış=6sn'ye
çıkarıldı (F1'in içerik-yoğun kartı artık okunabiliyor). Bu sırada gerçek bir bug
bulundu: üç cevap-verme handler'ı `submitFrequencyGuess`/`submitProPlusGuess`'i
çağırdıktan HEMEN SONRA ayrıca kendi `ensureAutoNext()`'lerini çağırıyordu —
submit* zaten kendi süresini kurduğu için bu ikinci çağrı sessizce 1500ms
varsayılana geri dönüyordu; kaldırıldı. Karşılaştırma butonuna (Senin cevabın/
Doğru cevap/Temiz) basınca otomatik-geçiş sayacı duraklıyor (`pauseRound`'un
KULLANDIĞI AYNI primitif), en az 3sn'lik/buffer-tabanlı kaynaklarda döngü tam
katına yuvarlanan bir önizleme penceresi sonunda kaldığı yerden devam ediyor
(KULLANICI KARARI — sonradan gerçek örnek dosyalar eklenince döngü yarıda
kesilmesin). Yanlış-cevap süresi (6sn) ve donma/devam-etme davranışı masaüstü
Chrome'da ölçülerek doğrulandı (nextBtn "Sonraki (6)"da ~5sn donuyor, sonra
normal tikliyor); doğru-cevap süresi (4sn) SADECE kod simetrisiyle doğrulandı —
otomasyon ortamının CDP gecikmesi/timeout'ları temiz bir ölçüm almaya izin
vermedi. `npm test` 68/68. Cihazda KONTROL EDİLMEDİ.

Commit `a7b0be3` — F3: XP animasyonu soru metninin üzerine biniyordu (bug) —
`spawnXp` artık canvas'ın ÜST kenarından değil DÜŞEY ORTASINDAN başlıyor, 90px'lik
yukarı süzülme canvas sınırları içinde kalıyor. Toast'lar (günlük görev/başarım)
aynı sabit konumda üst üste biniyordu (bug) — artık aktif toast'ların yüksekliği
toplanarak birbirinin ALTINA diziliyor (`relayoutToasts`), konum sağ-alttan
(actionbar/karşılaştırma butonlarıyla çakışıyordu) sağ-üste taşındı (`.ghead`'in
GERÇEK yüksekliği kadar aşağıdan başlıyor, oyun ekranındaki geri/ayarlar
butonlarının üzerine binmiyor). `pointer-events:none` zaten vardı, override
edilmediği doğrulandı. fx.js fonksiyonları doğrudan çağrılarak masaüstü
Chrome'da test edildi (2 toast üst üste binmeden dizildi). `npm test` 68/68.
Cihazda KONTROL EDİLMEDİ.

Commit `37f2491` — F4: çift dokunma/pinch zoom kapatıldı. İki katmanlı: viewport
meta'ya `maximum-scale=1.0, user-scalable=no` eklendi (pinch), `html,body{
touch-action:manipulation}` eklendi (çift-dokunma zoom, kaydırma etkilenmez),
`#visualizer{touch-action:none}` (spektrum tap-hedefi, pan/zoom gerekmiyor).
Dokunmalı moddaki spektrum-tıkla-cevapla (pointerdown tabanlı) mekanizması
touch-action:none SONRASI test edildi, regresyon yok (573 Hz, "Tam isabet!").
Gerçek çift-dokunma/pinch DAVRANIŞI mouse-tabanlı otomasyonla üretilemedi —
sadece computed style/viewport meta içeriği ve fonksiyonel regresyon (tıklama,
kaydırma) doğrulandı. `npm test` 68/68. Cihazda KONTROL EDİLMEDİ (öncelikli).

Commit `bc45b38` — E1: "Dosya seç" ile WAV seçilemiyordu (bug) — **KAPANDI**,
bkz. G10 (yukarıda BİTTİ'nin başında): asıl kök sebep (decodeAudioData'nın
bazı WAV alt-tiplerini açamaması) elle WAV parser'ıyla çözüldü. Kod tarafında
(validateAudioFile'ın uzantı kontrolü) WAV'ı özel olarak eleyen bir şey
bulunamadı — 7 format da Node'da tek tek doğrulandı. En olası açıklama iOS
WKWebView'in `accept="audio/*"` MIME-jokerini UTI'ye çevirirken bazı
formatları (özellikle WAV) dışarıda bırakabilmesi (bilinen bir WebKit
sınırlaması) — bu ortamda fiziksel cihaz olmadığı için konsol logu ile
BİREBİR KANITLANAMADI. Düzeltme: accept artık MIME joker + WAV'ın bilinen
MIME varyantları + uzantı listesi birleşimi (audioAcceptAttr(), tek kaynak
ALLOWED_AUDIO_EXTENSIONS'tan üretiliyor); change handler'ına kalıcı bir
teşhis logu eklendi ([upload] dosya seçildi: ad|tip|boyut) — bir sonraki
cihaz testinde bu log konsolda görünüyor mu diye bakılmalı.

Commit `17eb76c` — E2: "Cevap biçimi" chip'i oyun ekranına eklendi (Kaynak/
Odak'ın yanına, 3. chip). Bunu yaparken initSettingsSheet'te gerçek bir bug
bulundu (updateRowText tekil querySelector kullanıyordu, aynı select'e bağlı
2. bir satırı hiç güncellemiyordu — querySelectorAll'a çevrildi) VE .srctag'ın
gerçek flex kapsayıcısının .chiprow değil aradaki .control.control-sheet
div'i olduğu, .srctag'ın o div'in flex öğesi olmadığı için flex:1/min-width:0'ının
hiç uygulanmadığı (width:100% ile düzeltildi) bulundu — bu ikinci bug 2
chip'te geniş pay yüzünden hiç fark edilmiyordu. Yeni chip flex:0 0 auto
(kısa metin hiç kesilmiyor), Kaynak/Odak flex:1 kalıyor.

Commit `96e56d7` — E3: cevap sonrası alt bar gizleniyor (.actionbar-tucked,
transform tabanlı, D1'in --actionbar-h sistemini bozmadan). Bunu yaparken
D1'in şıklı-mod otomatik kaydırmasıyla (scrollFeedbackIntoView) etkileşen
gerçek bir race bulundu: yeni tur açılışında untuck animasyonlu olunca,
senkron scrollHeight okuması geçiş tamamlanmadan eski (küçük margin) değeri
görüyordu — auto-advance edilmiş turlarda D1 bug'ı GERİ GELİYORDU. Çözüm:
setActionbarTucked'a instant seçeneği eklendi, SADECE yeni-tur-açılış
untuck'ında kullanılıyor (tuck her zaman animasyonlu kalıyor).

Üçü de: npm test 68/68 her adımdan sonra, konsol hatası yok. D1/D5 gibi bu
üçü de gerçek cihazda/simülatörde KONTROL EDİLMEDİ (bu ortamda yok) — sadece
tarayıcı/dosya düzeyinde doğrulandı; E1 özellikle cihazda ayrıca kontrol
edilmeli (bkz. üstteki not).

Commit `a1c837a` — D1: alt bar CSS-tabanlı padding düzeltmesi (cihaz testinden
çıkan bug). Kök sebep yeniden teşhis edildi: `.game-scroll` flex:1 ile ekranın
TÜM artan alanını (position:fixed actionbar'ın kapladığı ~168px dahil) kendi
kutusu sayıyordu; eski ölçüm-tabanlı çözüm (syncGameScrollPadding +
ResizeObserver) sadece ekstra scroll payı ekliyordu, kutunun kendisini
actionbar'ın önünde durdurmuyordu. Çözüm: `--actionbar-h` sabit CSS
değişkeni + `.game-scroll`'a margin-bottom (ölçüme dayanmıyor, ilk boyamadan
itibaren doğru) — syncGameScrollPadding tamamen kaldırıldı. Ayrıca 4-6 şıklı
durumda (.answers 2 satıra taşıyor) otomatik kaydırma eklendi (SADECE şıklı
modda — dokunmalı modda analizör görünür kalmalı). Gerçek DOM ölçümüyle
doğrulandı: 3/4/5/6 şık hepsi ≥+16 (38px), geri bildirim kartı 3 ölçümde
sabit +20px (hiç negatif dip yok).

Commit `4943634` — D2: kaynak isimleri İngilizceye çevrildi (Pink Noise/White
Noise/Saw/Square/Triangle) + "Kendi dosyam" satırı "Dosya seç" oldu (grup
başlığıyla tekrar ediyordu). source-catalog.js tek kaynak olduğu için sadece
6 label değişti, grep ile eski isimlerden hiçbiri kalmadığı doğrulandı.

Commit `382f030` — D3: Oyun Ayarları sheet'i düzeni. Kök sebep: satırlar
gerçek `<button>` — WebKit'te display:flex bir button'a uygulandığında
width/text-align UA varsayılanları flex düzenini bozabiliyor (prototype.html'
nin aynı bileşeni tam olarak width:100%+text-align:left'i açıkça set ediyordu,
bizde eksikti). Aynı ikisi eklendi + native "Dosya Seç" butonu
::file-selector-button ile uygulamanın buton diline uydurtuldu. Ölçümle
doğrulandı: 4 satır artık bayt-bayt eşit genişlikte (522px), etiket-değer
arası hiç sıfırlanmıyor.

Commit `5e00e9d` — D4: dosya boyutu sınırı 150→120 MB. Tespit: bu pipeline
decodeAudioData KULLANMIYOR (HTMLAudioElement akışı, PCM'i RAM'e açmıyor) —
150 MB'ın riski "bellek çökmesi" değildi, sadece gereksiz büyüktü. Kullanıcı
120 MB'ı onayladı.

Commit `bf898f8` — D5: splash koyu temada minik kalıyordu (bug). Kök sebep:
-dark PNG'ler AYNI kanvas boyutundaydı (2732x2732) ama logo kanvasın sadece
~%6.5'ini kaplıyordu (açık varyantta ~%35-40) — storyboard/Contents.json
doğruydu, sorun kaynak görselin kendisindeydi. Açık varyant (uygulamanın
teması zaten neredeyse siyah) doğrudan koyu varyantın yerine kopyalandı —
iOS (3 dosya) + Android'de AYNI bug bulunup düzeltildi (13 dosya, night/
drawable-night). Simülatör/cihazda gerçek render KONTROL EDİLMEDİ (Xcode/
Android Studio bu ortamda yok) — sadece dosya/piksel düzeyinde doğrulandı.

D6 (isimlendirme denetimi) — düzeltme YAPILMADI, sadece rapor edildi, bkz.
BEKLEYEN KARARLAR I.

Commit `5b3775f` — M1-3: "Kendi dosyam" dosya seçici açmıyordu (bug).
Teşhis: Kaynak sheet'inin "Kendi dosyam" satırı diğer seçenekler gibi
davranıyordu — sourceSelect'i sessizce "upload" değerine çekip kapanıyordu,
hiçbir dosya seçici AÇMIYORDU. Gerçek dosya inputu (upload-row) tamamen ayrı
bir sheet'te (Oyun Ayarları/dots) gömülüydü. Düzeltme: bu satır artık (dosya
henüz yüklenmemişse) native dosya seçiciyi doğrudan tetikliyor; dosya zaten
yüklüyse normal seçenek gibi davranıyor. Tarayıcıda gerçek bir WAV dosyasıyla
uçtan uca doğrulandı (seçim→yükleme→round başlatma). npm test 62/62.

Commit `5c608f4` — M1-4: odak aralığı (Tüm spektrum/Bas/Orta/Tiz).
Kaynak chip'inin yanına focusChip/focusSheet eklendi (frekans-bulma.js:
FOCUS_RANGES). Seçilen aralık hem soruyu hem çeldiricileri sınırlıyor,
tercih localStorage'da kalıcı. Ana menüdeki "Bugünün Önerisi"nin "Başla"
butonu artık gerçekten işlevsel — en zayıf bölgeyi otomatik odağa çeviriyor.
Dar odak aralıklarında (Bas/Orta) üst zorluklarda/Pro Plus'ta geometrik
kapasite sınırı var (bkz. BEKLEYEN KARARLAR H). 6 yeni test + tarayıcı
doğrulaması (sayfa yenilemede tercih kalıcı kaldı). npm test 68/68.

Commit `1a8dd7b` — M1-5: A/B uzun basma döngüsü (pointerdown+520ms+2000ms
interval, prototype.html ile birebir). Kısa dokunma eski davranışı koruyor.
Sentetik PointerEvent'lerle gerçek bir turda zamanlama ayrı ayrı ölçüldü
(150ms→toggle yok, 600ms→döngü başladı, 2100ms bekleyince otomatik flip
oldu, tekrar dokununca durdu, geri butonuyla da duruyor).

Commit `5a8e3b0` — M1-6: geri bildirim kartına "Senin cevabın/Doğru cevap/
Temiz" karşılaştırma butonları eklendi — üçü de GERÇEK ses çalıyor (prototipte
sadece görsel toggle'dı). Sadece tek-bant "frequency" modu kapsandı, Pro
Plus bilerek dışarıda bırakıldı (4 tahminden hangisi "senin cevabın" olacağı
belirsiz). Senkron JS ile gerçek bir turda üç buton da tıklanıp doğrulandı.

Commit `ff8f862` — M1-7 (kısmi): "Soru N/10" sayacı (sadece 10 Soruluk
Bölüm'de) + "Oyundan çık" butonu (Oyun Ayarları sheet'i). Kalan 3 alt madde
(Seviye bilgi sheet'i, ayrı "Tekrar Çal" butonu, Otomatik zorluk sorgusu)
ATLANDI — prototipin öngördüğü temel altyapı (seviyeye bağlı sürekli zorluk
formülü / gerçek "Otomatik" zorluk modu) kodda hiç yok, tahminle
doldurulmadı. Bkz. BEKLEYEN KARARLAR E/F/G.

Commit `abd17e4` — G1: başarım denetimi (9 rozetin TAMAMI tarandı):

| Rozet | Koşul | Okuduğu alan | Alan var mı | Tetiklenebilir mi | Düzeltildi mi |
|---|---|---|---|---|---|
| İlk Kulak | `s.correct >= 1` | `stats.correct` | Evet (`app.js:1205,1275`) | Evet | Gerek yoktu |
| Alev Zinciri | `s.bestCombo >= 5` | `stats.bestCombo` | Evet (`app.js:1207,1277`) | Evet | Gerek yoktu |
| Şimşek Kulak | `s.bestCombo >= 10` | `stats.bestCombo` | Evet | Evet | Gerek yoktu |
| Dayanıklılık | `s.rounds >= 25` | `stats.rounds` | Evet (`app.js:1172,1201,1270`) | Evet | Gerek yoktu |
| EQ Beyni | `s.rounds >= 100` | `stats.rounds` | Evet | Evet | Gerek yoktu |
| Keskin Hedef | `rounds>=20 && accuracy>=70` | `stats.correct`/`stats.rounds` | Evet | Evet | Gerek yoktu |
| Yükseliş (level_5) | `levelFromXp(s.xp)>=5` | `stats.xp` | **Yok** — hiç böyle bir alan yazılmamış, sadece `stats.perDiff[key].xp` var | **Hayır (her zaman false)** | **Evet** — `totalXp()` helper eklendi, tüm zorlukların XP'si toplanıyor |
| Pro Kulak | `s.proCorrect >= 8` | `stats.proCorrect` | Evet (`app.js:1214`) | Evet | Gerek yoktu |
| Boss Avcısı | `s.bossWins >= 1` | `stats.bossWins` | Evet (`app.js:1215,1284`) | Evet | Gerek yoktu |

Sonuç: 8/9 rozet zaten sağlamdı, sadece `level_5` kırıktı — kod `www/js/core/progress.js`.
TASARIM.md'de kayıtlı "tasarımda 6, kodda 9 rozet" farkı bu denetimle çözülmedi —
hangi setin kalacağı ürün kararı, bkz. BEKLEYEN KARARLAR **C**.

Commit `ac505c3` — G2: seans sonu ekranı (TASARIM.md EKRAN 5, madde 9 kapandı):

- Eski küçük "Oyun Bitti" modalı kaldırıldı (`#gameoverOverlay` + ilgili CSS silindi),
  `#screen-result` adında tam ekran eklendi — prototype.html'deki yapı/metin/sıra
  birebir aktarıldı (sonuç halkası, seviye atladın kartı, XP kartı+bar, seri/ipucu
  istatistikleri, bölge haritası/soru sırası, yorum cümlesi, 3 CTA).
- "Canların bitti" ve normal tamamlanma ayrı varyasyon; ikisi de canlı state'ten
  okunuyor, uydurma veri yok.
- Veri kaynağı olmayan iki alan tasarımdan bilerek çıkarıldı: önceki seans
  karşılaştırması (`resLead` normal varyantta), öneri kartı (`resSug` — "odak seti"
  özelliği kodda yok).
- CTA'lar gerçek işlev görüyor: "10 soru daha" her zaman yeni 10 Soruluk Bölüm
  başlatıyor, "Tekrar oyna" aynı modda (serbest/bölüm) yeniden başlıyor, "Menüye dön"
  ana menüye çıkıyor. Üçü de can sıfırken sessizce yeni tur başlatmıyor.
- Doğrulama sırasında gerçek bug bulundu ve düzeltildi: can sıfırken "Tekrar oyna"
  önceki turun kalıntı soru başlığını (`questionTitle`) ve sonuç kartını (`freqInfo`)
  temizlemiyordu — `startRound()` çağrılmadığı için bu elemanları sıfırlayan kod hiç
  çalışmıyordu, ekranda "canların bitti" yerine eski yanlış/doğru cevap kartı
  görünmeye devam ediyordu. Konsoldan `currentLives`/`startRound` çağrı izi alınarak
  doğrulandı (tahminle değil), üç ayrı DOM elemanı (`freqInfo`, `questionTitle`,
  `questionMeta`) guard branch'e eklendi.
- `npm test`: G1 öncesi 62/62, G1+G2 sonrası 62/62 — regresyon yok, konsol hatası yok.

Öncesindeki mimari (core modülleri + mod kayıt sistemi + 14 mod menüsü) commit'li.

## AÇIK İŞLER

### Bug'lar

**1. ~~Geri bildirim kartı ilk saniyelerde alt bar'ın altında~~ — D1'de düzeltildi, `a1c837a`**
Üç kez ölçüm-tabanlı çözüm denenmiş, tutmamıştı. D1'de mimari değişti: padding
yerine CSS `--actionbar-h` değişkeninden margin-bottom — ölçüme hiç bağlı değil,
ilk boyamadan itibaren doğru. Aynı turda şıklı cevap modundaki 4-6 şıklık
grid'in altbar arkasında kalması da (aynı kökten) düzeltildi. Simülatör/cihazda
gerçek render henüz KONTROL EDİLMEDİ — sadece masaüstü Chrome'da gerçek DOM
ölçümüyle doğrulandı (bkz. commit mesajı).

**2. Pause sonrası ilk play'de duraksama**
Durdurup tekrar başlatınca ses takılarak giriyor, sonra düzeliyor. Muhtemel sebep:
pause sırasında buffer boşalıyor, `play()` yeterli veri hazır olmadan başlıyor.
Bakılacak: `canplay` / `waiting` event'leri, `preload` ayarı, pause yerine gain node
üzerinden sessize alma.
**Kabul kriteri:** 10 ardışık pause→play denemesinde `waiting` event'i 0 kez tetiklenmeli

**3. Oyun 0 canla başlıyor**
İlk açılışta zorluk doğru (orta) ama can sayısı sıfır. Başlangıç can değerinin
nerede atandığı kontrol edilecek — state başlatılırken varsayılan atlanıyor ya da
UI render'ı state'ten önce çalışıyor olabilir.
**Kabul kriteri:** temiz `localStorage` ile açılışta can = tanımlı başlangıç değeri

**4. ~~`loseLife()` zengin geri bildirimi eziyor~~ — F1'de düzeltildi, `a377d80`**
Yanlış cevapta artık TEK kartta hem "Kalan can: N" hem doğru frekans/bölge bilgisi
görünüyor (`appendFreqInfoNote`). Aynı kökten (feedbackBox + freqInfo aynı anda
görünür kalması) doğru cevap tarafındaki DUPLIKE kart bug'ı da düzeldi.

### Eksik özellikler

**10. ~~Gerçek ses dosyaları (DAVUL/ENSTRÜMAN) katalogda tanımlı ama dosyaların kendisi yok~~ — dosyalar mevcut, git'e eklenmedi**
G4 ile `source-catalog.js`'e 9 `kind:"sample"` girdisi eklendi, G5 ile
uzantı `.m4a`'ya çevrildi, G6 ile yükleme yolu HTMLAudioElement'e taşındı.
9 gerçek m4a dosyası artık `www/audio/` altında VAR (kullanıcı elle koydu,
tarayıcıda kick/hihat doğrulandı — konsolda hata yok, spektrum doğru) ama
henüz git'e commit'lenmedi (`git status` → untracked). **Kalan tek adım:**
`git add www/audio/*.m4a` + commit — ürün kararı değil, sadece unutulmamalı.
iOS cihazda gerçek doğrulama (HTTP 0'ın kalkması) kullanıcıda.

**5. ~~A/B Test gerçek bypass değil~~ — bir kullanıcı raporuyla birlikte düzeltildi, bkz. BİTTİ**
Kullanıcı (14 yıllık müzik prodüktörü) A/B döngüsünde pitch kayması bildirdi
("44.100'den 48.000 olmuş gibi"). Teşhis: konsol düzeyinde (audioCtx.sampleRate/
audioEl.playbackRate, 44 ölçüm, eşleşen+uyuşmayan sample rate'ler, upload+sentetik)
hiçbir fark kanıtlanamadı — ama A/B döngüsünün her 2sn'de bir CANLI ÇALAN
uploadedMediaSource'u (MediaElementAudioSourceNode) disconnect/reconnect ettiği
kod incelemesiyle doğrulandı; bu WebKit'te JS'ten hiç gözlemlenemeyen bir motor
davranışı olabilir. Kullanıcı onayıyla asıl mimari eksiklik (bu madde) çözüldü:
artık paralel kuru/işlenmiş yol + gain crossfade (`audioEngine.setProcessed`) var,
`buildQuestionChain` A/B toggle'ında BİR DAHA hiç çağrılmıyor. Enstrümante edilmiş
canlı testte (AudioNode.prototype.connect/disconnect sayaçları) tur içi A/B
döngüsünde MediaElementAudioSourceNode üzerinde SIFIR connect/disconnect ölçüldü
(önce her toggle bunu 1 kez tetikliyordu).

**6. Kalibrasyon — sarı seviye çizgisi dokunmatik olmalı**
Ekrandaki seviye göstergesi parmakla sürüklenerek ayarlanabilsin.

**7. ~~Odak aralığı özelliği kodda yok~~ — M1-4'te eklendi, `5c608f4`**
Seans sonu ekranındaki öneri kartı (`resSug`) HÂLÂ eklenmedi — bu M1
turunun kapsamı dışında (G2/seans-sonu ekranına dokunmuyordu), artık
engel ortadan kalktığı için ayrı bir işte eklenebilir.

**8. İlerleme sekmesi prototiple örtüşmüyor**
Bölümler var, düzen farklı. `Dizayn/prototype.html` referans.

**12. "Geri bildirim ekranı" ayarı Pro Plus zorluğunda etkisiz**
G13 ile eklenen `prefs.feedbackScreen` toggle'ı SADECE `submitFrequencyGuess`'te
(normal frekans sorusu) uygulandı — `submitProPlusGuess` bilerek dokunulmadı,
çünkü `revealAnimator`'ın bant-bant açılma animasyonu G13'ün hızlı-ilerleme
süresiyle (`QUICK_ADVANCE_MS`) çakışma riski taşıyordu, zamanı yoktu.
Kullanıcı Pro Plus'ta ayarı kapatırsa panel yine de açılır.
**Kabul kriteri:** Pro Plus'ta cevap verilince, ayar kapalıyken de panel
açılmadan hızlı ilerleniyor, `revealAnimator` animasyonu düzgün tamamlanıyor
(yarıda kesilmiyor).

**13. ~~Uzun yüklenen dosyada karşılaştırma sonrası otomatik geçiş hâlâ çok geç gelebilir~~ — G15'te KAPANDI, `77278b8`**
Kök sebep (`loopAwarePreviewMs`'in geçiş beklemesini kaynağın TAM DÖNGÜ
uzunluğuna yuvarlaması) çözüldü — fonksiyon tamamen kaldırıldı, geçiş
beklemesi artık kaynak uzunluğundan bağımsız sabit `CMP_PREVIEW_RESUME_MS`
(3000ms). Önizleme sesi kesilmiyor, sadece geçiş zamanlayıcısı bu sabit
süre sonunda yeniden kuruluyor; X butonu da geri geldi (basan hemen
ilerler). Doğrulama sırasında bulunan ve aynı commit'te düzeltilen ikinci
bir hata (`cmpPreviewRemainingMs` null olduğunda geçişin HİÇ yeniden
kurulmaması, turun kalıcı askıda kalması) için bkz. BİTTİ.

**11. AÇIK ÖZELLİK — Odaklı pratik modu**
Kullanıcı raporu (G9 teşhisi, kod değişikliği YAPILMADI — bkz. BİTTİ):
Odak aralığı (Bas/Orta/Tiz) şu an SADECE soru üretim havuzunu daraltıyor
(`createQuestion`'a `focusRange` olarak geçiyor) — spektrum ekseni
(`drawFreqAxis`/`faXToF`/`faFToX`/`drawSpectrumBars`) tasarım gereği sabit
80 Hz–17 kHz'e (`FA_MIN`/`FA_MAX`) kenetli, M1-4'ten (`5c608f4`) beri hiç
değişmedi — bu, G7/G8'deki AudioBufferSourceNode geçişinden ETKİLENMEDİ
(git log ile doğrulandı, analyser bağlantısı da hiç kopmadı).
İstenen: kullanıcı zayıf bölgesini (bas/orta/tiz) seçip odaklı çalışırken
spektrum GÖRSEL olarak da o bölgeye daralsın — hem kulak hem göz o dar
bölgeye odaklansın. Kullanım senaryosu: günün önerisi (8 soru) bitince
kullanıcı zayıf bölgesini seçip tekrar tekrar çalışır.
Gerekli iş: `drawFreqAxis`/`faXToF`/`faFToX`/`drawSpectrumBars` + ipucu/A-B
işaretleyicileri gibi `FA_MIN`/`FA_MAX` okuyan çizim fonksiyonlarının
tamamının dinamik bir aralık alacak şekilde refactor edilmesi (tıklama→Hz
haritalamasını da etkiliyor, riskli) — ayrı bir iş, bu turun kapsamı
dışında bırakıldı (kullanıcı kararı).

### Yayın öncesi

**9. Logo / uygulama ikonu yapılmadı**
Capacitor `resources/icon.png` + `resources/splash.png`, `@capacitor/assets` ile üretilir.
Store yüklemesinden önce gerekli, şimdi öncelikli değil.

## BEKLEYEN KARARLAR

**A. Kart metni tek kaynağa inecek mi?**
Şu an Frekans Bulma'nın metni `getMeta()`'dan, diğer 13'ü `MODE_CATALOG`'tan geliyor.
İkinci mod yazılmadan karar verilmeli, yoksa drift eder.
Öneri: katalog tek görüntü kaynağı, `getMeta()` sadece oyun mantığı meta'sı.

**B. Kilit tipleri**
Üç ayrı durum tek state'e sıkışmış: (1) henüz kodlanmadı, (2) seviye yetersiz,
(3) Pro gerektiriyor. Kart "Seviye 5'te açılır" derken tıklayınca "Yakında" toast'ı
çıkıyor — çelişkili vaat.
14 modun kaçı Pro, kaçı seviyeyle açılıyor? Mevcut `unlockLevel` değerleri
kullanıcı tarafından belirlenmedi.
**Kısmen ilerledi (Z3):** "seviye" kilidi HANGİ seviye sayısına bakacak sorusu
karara bağlandı (akademi/toplam seviyesi — `progress.academyLevel()`) ve KODLANDI
(`app.js` renderModeGrid, `meetsLevel` kontrolü). Ama bu, üç durumun (kodlanmadı/
seviye-yetersiz/Pro) UI'da AYRIŞTIRILMASI sorununu ÇÖZMEDİ — hâlâ "Yakında" toast'ı
hem "henüz kodlanmadı" hem "seviyen yetmiyor" için aynı görünüyor. Bu madde AÇIK
kalıyor.
**G17 ile SOMUTLAŞTI:** Z3'ün "hiç oynanmamış bir mod bile academyLevel'e +1
katkı yapar" ödünü (bkz. o maddenin BİTTİ'deki notu, "2. mod eklendiğinde
yeniden değerlendirilmeli" diye önceden kayıtlıydı) artık teorik değil — Kesim
Noktası (`unlockLevel:2`) kayıtlı olduğu İÇİN academyLevel otomatik 2'ye çıkıyor
ve kendi kilidini kendi açıyor (canlı doğrulandı). Karar gerekiyor: bu "yeni bir
mod eklenince önceki kilitler ücretsiz açılıyor" davranışı kabul mü, yoksa
academyLevel formülü (ya da unlockLevel değerleri) yeniden mi tasarlanmalı?

**C. Rozet sayısı ve seti**
Kod 9 rozet tanımlıyor (G1 denetimiyle 9'u da artık gerçekten tetiklenebiliyor),
TASARIM.md'de tasarımda 6 rozet olduğu ve isimlerin örtüşmediği kayıtlı. Hangi
setin kalacağı (6, 9, yoksa birleşim mi) ürün kararı — kodlanmadı.

**D. Can dolumu**
`www/js/core/storage.js:91` — uygulama yeniden açıldığında can 0 ise otomatik
`TOTAL_LIVES`'a (5) çekiliyor (bilinçli ödün, seans içinde dolum YOK). Gerçek bir
"30 dakikada dolum" mekanizması hâlâ kodda yok; prototype.html'nin seans sonu
ekranındaki "Canlar 30 dakikada dolar" metni bu yüzden G2'de kullanılmadı, yerine
dürüst "can dolum özelliği henüz eklenmedi" metni yazıldı. Gerçek dolum özelliği
ayrı bir iş.

**E. ~~Seviye → hassasiyet formülü (lvlSheet için gerekli)~~ — Z1/Z6 ile çözüldü**
`core/difficulty-curve.js: difficultyParams(level)` artık SÜREKLİ (logaritmik)
bir formülle her seviye için gainDb/Q/tolerans/süre üretiyor; `lvlSheet` (Z6)
bunu GERÇEKTEN okuyor. Bkz. DURUM.md "ZORLUK MİMARİSİ — OTOMATİK VERİLEN
KARARLAR" — buradaki sayısal değerler (GAIN_DB_AT_LEVEL_1/CAP, Q_AT_LEVEL_1/CAP
vb.) OTOMATİK/varsayılan seçildi, kulakla doğrulanmadı; sabah gözden geçirilmeli.

**F. "Tekrar Çal" butonu kapsamı**
Sentetik kaynaklarda (gürültü/synth) anlamsız — sürekli sinyaller, "başı" yok.
Sadece "upload" kaynağında anlamlı (ve onun için zaten `uploadManager.
startFromZero` var, şu an sadece tur/seans başında çağrılıyor). Karar gereken:
sadece upload kaynağında görünen küçük bir "baştan çal" ikonu mı eklensin, yoksa
madde tamamen atlansın mı? Ayrı bir buton eklemek actionbar'ın layout'unu
değiştirir.

**G. ~~Otomatik zorluk modu~~ — Z5/Z7 ile çözüldü**
"Otomatik" artık gerçek: `applyAutoDifficulty()` (app.js) her round başında
Z1+Z3'ten türetilen zorluğu uyguluyor, `autoDiffAsk` (Z7) prototipteki gibi
DOKUNMA-tetiklemeli. KAPSAM SINIRI (bkz. Z5 commit mesajı): Z1'in TAM sürekli
eğrisi değil, `tierForLevel()` köprüsüyle en yakın isimli kademe (easy/medium/
hard/pro) kullanılıyor — evaluateAnswer'ın sabit tolerans sınırını parametrik
hale getirmek AYRI bir iş (aşağıda not edildi).

**H. Dar odak aralığında Pro Plus bant sayısı**
M1-4 ile gelen odak aralığı (Bas/Orta ~2.3 oktav) Pro Plus'ın istediği 4 ayrık
bandı (gereken ~2.7 oktav) her zaman sığdıramıyor — ölçülen 500 denemede hep
2-3 bant üretiliyor (bkz. `test/frekans-bulma.test.mjs`). Kod güvenli tarafta
duruyor (asla range dışına taşmıyor, asla çakışan bant üretmiyor) ama bu bir
ürün kararı gerektiriyor: Pro Plus dar odakta kısıtlansın mı (o kombinasyon
seçilemesin), yoksa az bantla mı devam etsin?

**I. İsimlendirme tutarsızlıkları (D6 denetimi — düzeltilmedi, sadece raporlandı)**
1. Zorluk `proplus` değeri iki yerde iki farklı isimle: Oyun Ayarları sheet'inde
   "Pro Plus (Çok Bantlı)", Genel Ayarlar'ın Zorluk alt-listesinde (`data-diff=
   "proplus"`) "Sınırsız" / "Sınırını kendin ara". Aynı seçenek, iki ayrı kavram.
2. Can bitişi iki farklı başlıkla art arda gösteriliyor: `loseLife()` içindeki
   feedback+toast "Oyun bitti" diyor, hemen ardından açılan seans-sonu tam ekranı
   "CANLARIN BİTTİ" diyor.
3. Desteklenen ses formatları tutarsız anlatılıyor: `validateAudioFile`'ın kendi
   hata mesajı 7 formatı doğru listeliyor (wav/mp3/m4a/aac/aiff/flac/ogg), ama
   "Ses oynatılamadı"/"Yükleme hatası" mesajları sadece "mp3/wav" öneriyor.
4. Paywall'daki "Seans başına 5 soru" (Ücretsiz) / "Seans başına 10 soru" (Pro)
   iddiası kodda YOK — `10 Soruluk Bölüm` Pro'ya bağlı değil, herkes seçebiliyor;
   ücretsiz kullanıcıyı 5 soruyla sınırlayan bir mekanizma da yok. İsimlendirme
   değil ama satın alma sayfası var olmayan bir kısıtlamayı vaat ediyor.
5. "Ses dosyası yükle" (Oyun Ayarları) / "Dosya yükle" (Araçlar) — aynı eylem
   için iki farklı buton metni.
Hangisinin düzeltileceği/nasıl birleştirileceği ürün kararı — kod tarafında
hazır, sadece onay bekliyor.

## SIRADAKİ

**Zorluk sisteminin merkezi bağlanması (Seçenek C, kademeli geçiş) TAMAMLANDI
— ADIM 1 + ADIM 2 ikisi de bitti.** Hem Kesim Noktası hem Frekans Bulma artık
AYNI merkezi eğriden (`continuousLevel`+`sessionRampOffset`, mod-agnostik
`logLerp`/`applyPostCapFloor`) besleniyor, yapısal olarak TEK kod yolu (bkz.
BİTTİ'deki tutarlılık doğrulaması). **Tek sonraki adım netleşmedi** — kalan
işler ürün kararı gerektiriyor, kod tarafında engelleyici yok:

1. **Kalibrasyon — KULAKLA ayarlanmalı mı, mevcut sapma kabul mü?** İki modda
   da AYNI desen: hard/pro'da eğri statikten sistematik olarak kolay (bkz.
   BİTTİ'deki iki karşılaştırma tablosu). Tek log-eğrinin 4 keyfi noktaya
   oturamamasının doğal sonucu — düzeltmenin yolu muhtemelen AT_1/AT_CAP'ı
   oynamak değil, eğri şeklinin kendisini (ör. piecewise) yeniden düşünmek.
   Gerçek kullanıcı testinden geçmedi.
2. **Round-timer eğriye bağlanacak mı?** `paramsForDifficultyPosition().
   timeSec` HER İKİ modda da hesaplanıyor ama `currentDifficultyConfig().time`
   (statik) hâlâ kullanılıyor. Bağlanırsa G21'in hizalı geçiş süresiyle
   etkileşimi (boss'ta çifte kısalma riski) ayrıca değerlendirilmeli.
3. **`renderLevelSheet`** (Seviye bilgi sayfası) hâlâ TEK bir dil (gainDb/Q)
   konuşuyor — Kesim Noktası aktifken bu metin semantik olarak yanlış
   (marginOct değil gainDb/Q gösteriyor). `mode`'a göre hangi eğri/hangi dilin
   gösterileceği genelleştirilmeli — bu ÖNCEDEN de böyleydi, ADIM 1/2'nin bir
   regresyonu değil ama artık İKİ modda da geçerli bilinen bir eksik.
4. **Statik DIFFICULTY tabloları hâlâ duruyor mu, kaldırılacak mı?** Bilerek
   kaldırılmadı (Sabit modun çapası + proplus + geriye dönük test uyumluluğu
   için gerekliydi) — kalıcı olarak mı kalacak, yoksa "Sabit" modun UX'i
   (temsilci-seviye tabanlı) yeterince olgunlaşınca statik tablolar TAMAMEN
   eğriye mi devredilecek? Şimdilik ikili sistem (statik+eğri, opt-in) kalıcı
   bir mimari, geçici bir ödün değil — ama bu bilinçli bir seçim olarak
   teyit edilmeli.

Ayrıca Z1-Z7'nin sayısal değerleri (ve şimdi her iki modun `*_CURVE_CONFIG`'i)
hâlâ KULAKLA dinlenip ayarlanmayı bekliyor — hiçbiri test edilmeden/
dinlenmeden seçilmedi.

Kesim Noktası'nın kendisi G17-G21 ile TAMAMLANDI ve SERT TEST GEÇTİ (HPF/LPF
+ şıklı + tip gizleme rampası + iki renkli filtre eğrisi + öğretici Türkçe
metin + Frekans Bulma'yla hizalı geçiş süresi). Karşılaştırma-önizleme
butonları (Senin cevabın/Doğru cevap/Temiz) BİLEREK hâlâ yok — istenirse ayrı
bir iş, şu an engelleyici değil. BEKLEYEN KARARLAR **B**'deki açık soru
(Kesim Noktası kayıtlı olduğu için academyLevel otomatik yükselip kendi
kilidini kendi açıyor, bu davranış kabul mü) da hâlâ kullanıcıya sorulmayı
bekliyor.

Diğer bekleyen (öncelik sırası):
- **F4** (çift-dokunma/pinch zoom kapatma, önceki tur) — gerçek dokunmatik
  jest gerektiriyor, mouse-tabanlı otomasyonla HİÇ üretilemedi.
- **A/B pitch fix** (önceki tur, `8f66de1`) — gerçek cihazda kulakla pitch'in
  artık sabit kaldığı doğrulanmalı, bu ortamda ses duyulamıyor.
- **F2**'nin karşılaştırma-önizlemesi duraklat/devam davranışı — G15 ile
  masaüstünde sağlamlaştırıldı (madde 13 kapandı), hâlâ cihaz doğrulaması
  bekliyor. (**E1** G10 ile KAPANDI.)

Kod tarafında bekleyen karar yok; E/F/G/H/I (BEKLEYEN KARARLAR) kullanıcıya
sorulmayı bekliyor ama hiçbiri şu an engelleyici değil.

## ÜRÜN NOTLARI (önceki sohbetlerden)

**Ses kaynağı planı**
Kick / snare / gitar / vokal örnekleri henüz yok. Sentez öncelikli yaklaşım,
CC0 lisanslı örnekler alternatif olarak değerlendirilecek.

**Referans filtreleri**
Araçlar sekmesinde, Pro özelliği. Cihaz adı etiketli filtre setleri.

**Otomatik master / tonal balance**
Ücretli sürüme ek değer olarak düşünüldü. Kapsam tanımlanmadı.

**Fiyat ve can ekonomisi**
Pro ₺199, tek seferlik. Ücretsiz: 5 can, 30 dakikada bir dolum (tasarım niyeti).
Can dolumu KODDA YOK — bkz. BEKLEYEN KARARLAR **D**.
Paywall ekranında dolum süresi hiç geçmiyor, sadece "5 can" yazıyor — eksik bilgi.
Not: 3. bug (oyun 0 canla başlıyor) bundan bağımsız — mevcut can sistemi
başlangıç değerini doğru atamıyor.

## ZORLUK MİMARİSİ — KODLANDI (Z1-Z7, gece oturumu)

Bu bölümdeki tasarım kararları (aşağıda özetleniyor) Z1-Z7 turunda KODA GEÇTİ.
Uygulama detayları ve gerekçeli kararlar için bkz. "ZORLUK MİMARİSİ — OTOMATİK
VERİLEN KARARLAR" altındaki bölüm — kullanıcı YOKTU (gece oturumu), her karar
noktasında makul bir değer seçilip GEREKÇESİYLE buraya yazıldı. Hiçbiri "kesin
doğru" değil, kulakla ayarlanmayı bekliyor.

**Seans içi rampa** — `core/session-plan.js` — KODLANDI, henüz app.js'e WIRE
EDİLMEDİ (10 Soruluk Bölüm hâlâ zorluğu `els.difficultySelect`'ten okuyor).

**Basamak yerleşimi kişiselleştirme** — `core/personalization.js` — KODLANDI
VE app.js'e WIRE EDİLDİ (`startRound()` → `createQuestion(..., {zoneStats})`).

**Seviye yapısı** — `core/progress.js` (modeXp/modeLevel/academyLevel) +
`core/storage.js` (perMode, migration) — KODLANDI VE WIRE EDİLDİ.

**Zorluk ölçeği** — `core/difficulty-curve.js` (difficultyParams, tierForLevel)
— KODLANDI. Oyun parametrelerine (gain/Q) SADECE `tierForLevel()` köprüsüyle
DOLAYLI bağlı (Otomatik mod DIFFICULTY[tier]'ı kullanıyor) — Z1'in tam sürekli
eğrisi henüz createQuestion/evaluateAnswer'a DOĞRUDAN enjekte edilmedi (bkz.
altta, "Sonraki adım" notu).

**Ayarlar** — Otomatik (varsayılan)/Sabit — KODLANDI VE WIRE EDİLDİ
(`applyAutoDifficulty()`, `prefs.difficultyMode`).

## ZORLUK MİMARİSİ — OTOMATİK VERİLEN KARARLAR (gece oturumu, kullanıcı yok)

Her madde: karar + gerekçe. Sayısal değerler KESİN DOĞRU İDDİA EDİLMİYOR —
makul başlangıç noktaları, kulakla ayarlanmalı (liste SON RAPOR'da).

**Z1 — Tavandan sonra hangi bağlam-zorluğu mekanizmaları uygulandı**
Üç önerilenden (gain azalması / katman ekleme / süre kısaltma) İKİSİ
uygulandı: gain azalması ve süre kısaltma (küçük doğrusal adımlarla, birer
tabanın altına inmez). "Katman ekleme" (soruya ikinci bir gürültü/enstrüman
katmanı karıştırmak) UYGULANMADI — bu audio-engine.js'te yeni bir kaynak-
karıştırma yolu gerektiren ayrı bir ses-mimarisi işi, bir "saf veri fonksiyonu"
yazmanın kapsamının dışında. Kodda `contextLayering: false` (hep) olarak
işaretlendi, TODO.

**Z1 — Başlangıç sayısal değerleri (LEVEL_CAP=20, GAIN_DB 10→3, Q 0.8→5.0,
TOLERANCE_OCT 0.6→0.35 [henüz kullanılmıyor], TIME_SEC 16→8)**
Mevcut `DIFFICULTY` tablosunun easy (gain:10,q:0.9,time:16) ve pro
(gain:4.5,q:4.2,time:9) uç noktalarına YAKLAŞIK oturacak şekilde seçildi —
tamamen keyfi değil ama kulakla DOĞRULANMADI. LEVEL_CAP=20, mode-catalog.js'nin
en yüksek `unlockLevel` değeriyle (20) BİLİNÇLİ olarak eşleşiyor (akademi
yol haritasının tamamı = bir modun tam hassasiyet eğrisi varsayımı) — bu
eşleşme kesin doğru olmayabilir, sabah gözden geçirilmeli.

**Z1 — Tolerans (toleranceOct) hesaplanıyor ama KULLANILMIYOR**
`difficultyParams()` bir `toleranceOct` alanı üretiyor ama `evaluateAnswer()`
(frekans-bulma.js) hâlâ SABİT 0.5 oktavlık kabul sınırını kullanıyor —
bu alanı gerçekten bağlamak `evaluateAnswer`'ı parametrik hale getirmeyi
gerektirirdi (saf fonksiyon/test sözleşmesini bozma riski, gece oturumunda
alınmadı). Alan kodda DURUYOR ama etkisiz — bir sonraki oturumda ya bağlanmalı
ya da kaldırılmalı.

**Z2 — Seans içi sıralama: sabit blok mu, tam karışık mı, ikisi de değil**
İlk soru HER ZAMAN en kolay kademeden (caydırıcı olmasın diye — Z2'nin kendi
notu), KALAN sorular TAMAMEN karıştırılır. Gerekçe: sabit 3-3-3-1 blok sırası
tekdüze/tahmin edilebilir; tam karışıklık (ilk soru dahil) yine zor bir açılış
riski taşır.

**Z2 — SESSION_RAMP_WEIGHTS oranı (easy/medium/hard/pro = .3/.3/.3/.1)**
DURUM.md'de zaten kayıtlı "3 kolay/3 orta/3 zor/1 pro" kararının doğrudan
oranı — icat edilmedi, verilen kararın matematiksel karşılığı.

**Z2 — 5 soruluk (ücretsiz?) seans ölçekleme yöntemi**
Naif yuvarlama yerine EN BÜYÜK KALAN (largest remainder/Hare-Niemeyer) yöntemi
— toplamın HER ZAMAN tam soru sayısına eşit kalmasını garantiler (naif
yuvarlama 5 soruda 1.5/1.5/1.5/.5→2/2/2/1=7 gibi taşardı). Sonuç: 2 kolay/2
orta/1 zor/0 pro — bu SPESİFİK dağılım elle seçilmedi, yöntemin matematiksel
sonucu.

**Z2 — Serbest (sonsuz) mod**
Sabit bir soru sayısı olmadığı için önceden dizi kurulmuyor — her soruda
BAĞIMSIZ ağırlıklı seçim (`pickWeightedDifficulty`) yapılıyor, uzun vadede
aynı orana yaklaşıyor.

**Z3 — Akademi seviyesi: mod seviyelerinin TOPLAMI (XP toplamından level'e
çevirme değil)**
"Genel akademi seviyesi toplamdan hesaplanacak" kararı İKİ farklı okunabilirdi:
(a) tüm modların XP'sini topla, SONRA seviyeye çevir, ya da (b) her modun
KENDİ seviyesini hesapla, SONRA seviyeleri topla. (b) seçildi — "toplam"
kelimesi seviye sayılarının toplamı olarak yorumlandı, gerekçe: tek mod
varken bu, ESKİ (Z3 öncesi) global seviye davranışıyla BİREBİR tutarlı kalıyor
(academyLevel === modeLevel, tek mod olduğu sürece).

**Z3 — Bilinen ödün: hiç oynanmamış modlar da +1 katkı yapar**
`levelFromXp(0)` her zaman 1 döner — yani akademi toplamına, kullanıcının HİÇ
dokunmadığı bir mod bile +1 ekler. Bugün (1 oynanabilir mod) sorun değil ama
2. mod kodlandığında "bedava seviye şişmesi" yaratır. Bilinçli ödün: sıfır-
tabanlı bir toplam (xp=0 → katkı=0) yerine seçildi çünkü YENİ bir kullanıcıyı
(academyLevel=0) `unlockLevel:1` kilidinde bile tıkardı. **2. mod eklendiğinde
yeniden değerlendirilmeli.**

**Z3 — Kilit sistemi hangi seviyeye bakar: mod mu, akademi mi**
Akademi (toplam) seviyesi. Gerekçe: `unlockLevel` değerleri (1-20) henüz
kodlanmamış 13 modu kapsayan GENEL bir içerik yol haritasını temsil ediyor —
o modların kendi XP kaynağı olmadığı için mod-bazlı seviyeye bakmak anlamsız
olurdu. Bugün TEK oynanabilir mod olduğu için GÖRÜNÜR bir etkisi yok.

**Z3 — Zorluk parametreleri (Z1) hangi seviyeden beslenir: mod mu, akademi mi**
MOD seviyesi (o modun kendi XP'sinden). Gerekçe: bir modda yeni olan kullanıcı
başka bir modda ileri seviyede olsa bile o YENİ modda kolay sorularla
başlamalı — "zorluk" o spesifik beceriye dair bir sinyal, genel akademi
ilerlemesine değil.

**Z4 — Zayıflık skoru ağırlıkları (isabet %60, ortalama sapma %40)**
Doğruluk biraz daha ağır basıyor — yanlış cevap vermek, doğru cevaba yakın
ıskalamaktan daha güçlü bir "zayıflık" sinyali sayıldı. Kesin bilimsel bir
dayanağı yok, makul bir varsayılan.

**Z4 — Agresiflik sınırı (MAX_BOOST=2.0 → en fazla 3x ağırlık)**
En zayıf bölge en güçlü bölgeye göre en fazla 3 kat daha sık gelebilir —
sonsuz değil. Sayı keyfi seçildi (kullanıcı sadece zayıf bölgeyle
"boğulmasın" isteği somutlaştırıldı), kulakla/kullanım verisiyle ayarlanmalı.

**Z4 — MIN_SAMPLES=3 (yetersiz veri eşiği)**
3'ün altında bir bölgenin isabet oranı istatistiksel olarak anlamsız kabul
edildi (nötr ağırlık=1). Keyfi bir sayı, çok küçük/büyük olduğunda "yeni
kullanıcı eşit dağılım" davranışının ne kadar hızlı "kişiselleştirilmiş"
davranışa geçtiğini değiştirir.

**Z4 — Proplus (çok bantlı) kişiselleştirme kapsamı dışı**
`buildProPlusBands` KİŞİSELLEŞTİRİLMEDİ — 4 bandın HER BİRİ için ayrı zon
seçimi yapmak (çakışmama kısıtıyla) gece oturumunun süresini aşan ayrı bir iş.

**Z5 — Otomatik modda Z1'in TAM sürekli eğrisi DEĞİL, tierForLevel() köprüsü**
Kapsam sınırı — bkz. yukarıdaki "Zorluk ölçeği" notu. Z1'in ondalık gain/Q
değerlerini gerçekten oyuna bağlamak `evaluateAnswer`'ın sabit toleransını ve
`DIFFICULTY`'nin okunduğu her yeri (generateChoices, hint mask, round timer)
parametrik hale getirmeyi gerektirir — "ayarlar arayüzü" maddesinin ÇOK
ötesine geçen bir refactor, ayrı bir iş olarak bırakıldı.

**Z5 — proplus Otomatik'te hiç seçilmez**
`tierForLevel()` proplus'ı hiç döndürmüyor — proplus çok bantlı, farklı bir
oyun deneyimi (dokunmalı, 4 ayrı işaretleme), doğrusal hassasiyet merdiveninin
bir noktası değil. Kullanıcı proplus'ı SADECE Sabit modda elle seçebilir.

**Z6 — "Sıradaki seviyeye kalan" XP ile gösteriliyor, prototipin "N/M doğru"
çerçevesi DEĞİL**
prototype.html "12/20 doğru" gösteriyordu — bizim sistemimiz (Z3) XP-bazlı,
"doğru sayısı" bazlı bir eşik hiç yok. XP ilerlemesi (`progress.xpProgress`)
kullanıldı — mevcut sistemle tutarlı tek seçenek.

**Z7 — autoDiffAsk tetikleme koşulu İCAT EDİLMEDİ, prototipten okundu**
M1-7'de "performansa göre tetiklenir" varsayılmıştı ama prototype.html'nin
kendi JS'i (`gameDiffTap`) DOKUNMA-tetiklemeli olduğunu gösterdi — Otomatik
moddayken Zorluk satırına dokunmak soruyu açıyor, konsekütif yanlış cevap
sayısı gibi bir performans sinyali YOK. Bu proje tasarım kararı OLMADIĞI için
"karar verildi" değil, "yanlış varsayım düzeltildi" olarak kayda geçti.

## AÇIK KALAN KARAR

Kilit tipleri (kodlanmadı / seviye / Pro) — Z3 ile HANGİ seviye sayısının
kullanılacağı karara bağlandı (BEKLEYEN KARARLAR **B**), ama üç durumun UI'da
nasıl ayrıştırılacağı hâlâ açık. Yeni mod yazılmadan netleşmeli.

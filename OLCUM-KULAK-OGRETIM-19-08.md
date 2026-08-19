# OLCUM-KULAK-OGRETIM-19-08 — Kulak butonlarında izolasyon: 8 mod, iş yükü, risk

**Görev tipi:** ÖLÇÜM. Kod değiştirilmedi, commit atılmadı. Ölçüm iki
katmanlı yapıldı: (1) `core/eq-loudness.js:biquadMagnitudeDb` (projenin
ZATEN kullandığı, test edilmiş RBJ biquad matematiği) ile ANALİTİK
frekans-tepkisi hesabı — kaynağın zamana bağlı içeriğinden (davul
vuruşları vb.) BAĞIMSIZ, kararlı/tekrar-üretilebilir sayılar. (2) Canlı
Playwright + `AnalyserNode` ölçümü DENENDİ ama kaynağın kendi zamana-
bağlı içeriği (iki AYRI çalma anı, iki farklı müzikal karşılık) analitik
ölçümden ÇOK daha gürültülü çıktı verdi — SADECE ikincil/doğrulayıcı bir
gözlem olarak, açıkça ayrılarak raporlandı. Script'ler `scratchpad/
analytic-ear-diff.mjs` + `scratchpad/ear-spectrum-diff.mjs` — repoya
commit EDİLMEDİ.

---

## Tonal Balance'ın bant izolasyon mekanizması — bulundu, nasıl çalışıyor

**Konum:** `www/js/app.js:13388-13413`, `toolsApplySoloBandFilter(ctx,
node, chainNodesArray)`. **Bu, oyun modu "Tonal Denge" DEĞİL** — Araçlar
sekmesindeki "Referans Filtreleri"/"Mixini Yükle" kartlarının "bölge
solo" özelliği (`toolsSoloBandIdx`, G117 madde B). Kulak butonu olan 8
modun HİÇBİRİYLE şu an bağlantılı DEĞİL.

**Teknik:** `tonalBalance.BAND_EDGES` (`core/tonal-balance.js:42`) —
Frekans Bulma'nın 6 `FA_ZONES`'undan (`frekans-bulma.js:200-207`,
SUB/BAS/ALT-ORTA/ORTA/ÜST-ORTA/TİZ) TÜRETİLMİŞ sınırlar. Solo aktifken
seçilen bandın ALTINDA/ÜSTÜNDE **2× kademeli highpass + 2× kademeli
lowpass** (toplam 4 biquad, ~24dB/oktav, Q=1/√2 Butterworth) node'a
seri bağlanıyor — SEVİYE TELAFİSİ YOK (bilinçli: "amaç o bandın
miksteki GERÇEK ağırlığını duymak").

**Yeniden kullanılabilir mi?** **Teknik OLARAK evet, birebir fonksiyon
OLARAK hayır.** `toolsApplySoloBandFilter` modül-kapsamlı
`toolsSoloBandIdx` değişkenini OKUYOR (parametre değil) — kulak
butonuna taşımak için ya (a) bu fonksiyon `loFreq`/`hiFreq` parametresi
alacak şekilde küçük bir refactor'dan geçmeli (State bağımlılığı
kaldırılır, ~10-15 satır değişir, mevcut Tools çağrı yeri BOZULMAZ), ya
da (b) AYNI 4-biquad tekniğini kullanan YENİ, bağımsız bir yardımcı
yazılır (~20-30 satır, kod TEKRARI riski taşır). (a) daha temiz —
DOKUNULMAYACAK listesinde YOK, ama Tools'un KENDİ davranışını
bozmadığını doğrulayan bir regresyon testi gerekir.

---

## Mod-mod ölçüm

### 1) Frekans Bulma — ✅ İZOLE EDİLEBİLİR

**Şu an ne çalıyor:** `applyProcessing` (`frekans-bulma.js:430-448`) TEK
bir `peaking` biquad (freq=`question.freq`, Q=zorluğa göre 0.9-5.5,
gain=zorluğa göre ~1.5-10dB) — TAM MİKSE uygulanıyor, `matchLoudness:
true` ile genel ses düzeyi telafi ediliyor (boost/cut bir loudness
ipucu SIZDIRMASIN diye). Sol/sağ buton AYNI mekanizma, SADECE freq
farklı (kullanıcının tahmini / gerçek cevap).

**Ölçülen fark (analitik, orta zorluk Q=1.3/gain=8dB):**
- **0.5 oktav sınırında yanlış tahmin** (1000→1414Hz, "neredeyse
  doğru"): spektrumun **%23,7'sinde** (log-eksende) ≥1dB fark, en
  büyük fark **4,1dB @1539Hz**, anlamlı bölge 508-2743Hz (~2,4 oktav).
- **2 oktav uzak yanlış tahmin** (1000→4000Hz): **%41,0**'inde ≥1dB
  fark, en büyük **7,7dB @992Hz**, anlamlı bölge 412-8706Hz (~4,4
  oktav).

**Yorum:** Fark GERÇEK ve ölçülebilir (birkaç dB, birkaç oktavlık bir
bölgede) — ama bu, TAM MİKSİN (davul/gitar/her ne ise) üstüne binen
KÜÇÜK bir tepe/çukur. Psikoakustik maskeleme İLKESİ (yerleşik bilgi,
bu turda AYRICA ölçülmedi): birkaç dB'lik bir fark, SESSİZLİĞE karşı
duyulduğunda KOLAY fark edilir, GENİŞ BANTLI/yüksek seviyeli bir
maskeleyicinin (tam mix) İÇİNDE duyulduğunda ÇOK DAHA ZOR fark edilir
— Logic'in "ayırt edemiyor" gözlemiyle TUTARLI.

**İzolasyon:** `question.freq` etrafında simetrik bir pencere (ör.
±1-1,5 oktav — TEK bir sabit değer YETMEZ, band genişliği zorluğa göre
Q ile BİRLİKTE ayarlanmalı, aşağı bkz. Q Genişliği notu) bandpass
edilirse kullanıcı SADECE o bölgeyi, SESSİZLİĞE YAKIN bir zeminde
duyar — tepe/çukur BARİZLEŞİR.

**Tek buton yeter mi?** **Muhtemelen EVET** — izolasyon varsa "doğru
cevabı izole dinle" tek başına yeterli bilgi verir (kullanıcı kendi
tahminini zaten NÜMERİK/görsel olarak feedback ekranında görüyor,
bkz. `markAnswerChoices()`/`teachingText()`, bu turda AYRICA
doğrulanmadı ama önceki turlarda tespit edildi). "Benim tahminim"i
izole dinlemenin ekstra pedagojik değeri, doğru cevabı NET
duyabildikten SONRA azalır.

---

### 2) Kesim Noktası — ✅ İZOLE EDİLEBİLİR (farklı bir mantıkla)

**Şu an ne çalıyor:** TEK highpass/lowpass biquad (`kesim-noktasi.js:
371-381`), Q=0,707 sabit, freq=`question.freq`. `matchLoudness: true`.
Kesim bir NOKTA değil bir SINIR — spektrumun YARISINI (freq'in
altı/üstü) etkiler, "izole edilecek bir bölge" kavramı Frekans
Bulma'daki gibi DAR bir tepe değil.

**Ölçülen fark (analitik, highpass, Q=0,707):**
- **Yakın yanlış** (1000→700Hz): **%60,3**'ünde ≥1dB fark, en büyük
  **6,2dB @20Hz** (en pes uçta, highpass'ın doğası gereği), anlamlı
  bölge 20-1280Hz.
- **Uzak yanlış** (1000→300Hz): **%61,3**'ünde ≥1dB fark, en büyük
  **20,9dB @20Hz**, anlamlı bölge 20-1371Hz.

**Yorum:** Fark yüzdesi Frekans Bulma'dan YÜKSEK görünüyor ama bu
YANILTICI olabilir — highpass/lowpass'ın doğası gereği fark HER ZAMAN
spektrumun BİR UCUNA (20Hz veya 20kHz'e) doğru büyüyor, kaynağın o
uçlarda GENELDE zaten az enerjisi olur (kick/bas 20Hz'de her zaman güçlü
değil) — GERÇEK algısal etkiyi bu ölçüm TEK BAŞINA VERMİYOR, kaynağın
KENDİ spektral yoğunluğuyla (PSD) ağırlıklandırılmış bir ölçüm daha
doğru olurdu (bu turda YAPILMADI, `eq-loudness.js:estimateChainGainDb
Weighted`'ın ZATEN yaptığı PSD-ağırlıklı yaklaşım burada da
uygulanabilirdi — kapsam dışı bırakıldı).

**İzolasyon:** freq etrafında simetrik bir PENCERE (ör. ±1 oktav)
bandpass edilip, İÇİNDE highpass/lowpass'ın KENDİSİ uygulanırsa,
kullanıcı "kesimin GEÇİŞ bölgesini" izole duyar — Frekans Bulma kadar
temiz DEĞİL (kesim doğası gereği "nokta" değil "sınır") ama YİNE DE
anlamlı bir iyileştirme.

**Tek buton yeter mi?** Muhtemelen EVET, Frekans Bulma'yla AYNI
gerekçeyle — ama pencere boyutu/algısal netlik Frekans Bulma'dan biraz
daha ÖZENLİ tasarlanmalı (kulakla doğrulama gerekir, bu turda
YAPILMADI).

---

### 3) dB Seviyesi — ❌ İZOLE EDİLEMEZ (yapısal olarak)

**Şu an ne çalıyor:** TEK GainNode (`db-seviyesi.js:355-359`),
`gain.value = 10^(dbDelta/20)` — TÜM spektrumu EŞİT oranda ölçekliyor.
Modun KENDİ yorumu (`db-seviyesi.js:35,471-473`): "seviye değişimi tüm
spektrumu eşit etkiliyor... bu modda frekans-bandı ipucu maskesi
kavramı yok."

**Ölçüm:** Fark TANIM GEREĞİ spektrumun **%100'ünde, TEK BİR sayı**
kadar (ör. dbDelta=2 ise HER frekansta TAM 2dB) — "izole edilecek bir
BÖLGE" YOK, çünkü fark zaten HER YERDE eşit VE maksimum. Analitik
ölçüm burada ANLAMSIZ (biquad değil, düz kazanç).

**İzolasyon:** Kavramsal olarak UYGULANAMAZ — Logic'in "sorulan şeyi
izole et" fikri BU MODA hiç haritalanmıyor, çünkü sorulan şeyin
kendisi (genel seviye) zaten TÜM spektrumda EŞİT VE İZOLE EDİLECEK
BİR "YER" YOK. **Mevcut iki-buton tasarımı bu mod için ZATEN en
mantıklısı** — değişiklik ÖNERİLMİYOR.

---

### 4) Q Genişliği — ✅ İZOLE EDİLEBİLİR (pencere boyutu DİKKAT gerektirir)

**Şu an ne çalıyor:** TEK peaking biquad (`q-genisligi.js:375-386`),
freq genelde SABİT `Q_FIXED_FREQ=1000Hz` (kolay zorlukta — "isolate"
alanı, YANLIŞ isim taşıyor: bu SES izolasyonu DEĞİL, bir ZORLUK/
pedagoji bayrağı — freq'i sabit tutup SADECE Q'yu değişken bırakarak
kullanıcının Q YARGISINI izole etmesini sağlıyor, ses zincirine HİÇ
dokunmuyor), gain SABİT `Q_GAIN_DB=6dB`. `matchLoudness: true`.

**Ölçülen fark (analitik, freq=1000 SABİT, gain=6dB SABİT, SADECE Q
farklı — "geniş" Q=0,5 tahmin edilirken gerçek "dar" Q=6):**
**%43,7**'sinde ≥1dB fark, en büyük **5,0dB @752Hz**, anlamlı bölge
211-4559Hz (**~4,3 oktav**).

**⚠️ Önemli nüans:** DÜŞÜK Q (geniş bant) durumunda anlamlı fark
BÖLGESİ ZATEN GENİŞ (~4+ oktav) — İZOLASYON PENCERESİ bu genişliği
KAPSAYACAK kadar büyük tutulmazsa, TAM DA "genişliği" test eden bilgi
KIRPILIR (dar bir pencereyle bakınca geniş bir tepe DAR görünür/duyulur
— ölçmek istediğimiz ŞEYİ bozar). Pencere boyutu SABİT DEĞİL, o
sorunun EN DÜŞÜK olası Q'suna göre (zorluk eğrisinin en geniş ucu)
ayarlanmalı — Frekans Bulma/Kesim Noktası'ndan DAHA FAZLA tasarım
özeni gerektirir.

**Tek buton yeter mi?** Muhtemelen evet AMA yukarıdaki pencere-boyutu
sorunu ÇÖZÜLMEDEN riskli — yanlış boyutlu bir pencere, izolasyonu
Q Genişliği'nde YARARDAN ÇOK ZARAR verici hale getirebilir.

---

### 5) Pan Konumu — ❌ İZOLE EDİLEMEZ (yapısal olarak)

**Şu an ne çalıyor:** TEK `StereoPannerNode` (`pan-konumu.js:242-246`),
`pan.value = panPercent/100` — TÜM sinyali stereo alanda kaydırıyor,
FREKANS EKSENİNDE hiçbir şey değişmiyor (genlik/spektrum AYNI, sadece
L/R oranı). Modun kendi notu (`pan-konumu.js:6-9`): tek mono kaynağı
konumlandırmak için StereoPannerNode zaten YETERLİ.

**Ölçüm:** Frekans ekseninde ölçülecek bir fark YOK (biquad değil) —
fark SADECE stereo alanda (L/R genlik oranı), analitik biquad ölçümü
bu boyutu YAKALAMIYOR (kapsam dışı, farklı bir ölçüm türü gerektirirdi
— L/R kanal genlik oranı, bu turda ölçülmedi).

**İzolasyon:** Frekans bandı izolasyonu bu moda KAVRAMSAL OLARAK
UYGULANAMAZ (dB Seviyesi ile AYNI sebep) — **mevcut iki-buton tasarımı
KALMALI.**

---

### 6) Stereo Genişlik — ❌ İZOLE EDİLEMEZ (yapısal olarak)

**Şu an ne çalıyor:** Mid/Side genlik ağı (`stereo-genislik.js:357-
412`, `branch` deseni — filters DEĞİL) — `widthPercent` ile Side
bileşenini ölçekliyor. TAMAMEN stereo-alan (M/S) bir dönüşüm, FREKANS
EKSENİNE hiç dokunmuyor.

**Ölçüm:** dB Seviyesi/Pan Konumu ile AYNI kategori — frekans
ekseninde ölçülecek bir "bölge" YOK.

**İzolasyon:** UYGULANAMAZ — **mevcut iki-buton tasarımı KALMALI.**

---

### 7) Boost/Cut (katman 2-3) — ✅ İZOLE EDİLEBİLİR

**Şu an ne çalıyor:** TEK peaking biquad (`boost-mu-cut-mu.js:364-
375`), Q=1,4 SABİT, freq+gain (yön/miktar) test ediliyor.
`matchLoudness: true`. Frekans Bulma ile YAPISAL OLARAK NEREDEYSE
ÖZDEŞ (aynı "tek peaking, matchLoudness" deseni).

**Ölçülen fark (analitik, farklı freq + TERS yön: 1000/+8dB →
2500/-8dB):** **%39,0**'unda ≥1dB fark, en büyük **8,9dB @1016Hz**,
anlamlı bölge 403-5878Hz (~3,9 oktav).

**Tek buton yeter mi?** Frekans Bulma ile AYNI gerekçe — muhtemelen
evet.

---

### 8) Frekans Çakışması — ✅ Aşama 1 izole edilebilir · ⚠️ Aşama 3 RİSKLİ

**Şu an ne çalıyor (`audio-engine.js:1146-1240`, `frekans-cakismasi.js:
401-417`):** İKİ AYRI kaynak (A/B), HER BİRİNE KENDİ peaking filtresi
(`trueCenter`, Q=1,1) — normal oyunda kazanç 0 (maskeleme bozulmasın).
Kulak butonu:
- **Aşama 1:** zincir YENİDEN kurulur, İKİ kaynağın filtresi de AYNI
  ANDA `BASE_CUT_DB=6dB` kesiliyor (guessed/true merkez) — "miksi o
  noktada aç" tekniği. **Bandpass/izolasyon YOK** — hâlâ tam bant iki
  kaynağın toplamı.
- **Aşama 3:** zincir YENİDEN KURULMUYOR (Logic'in kararı, DOKUNULMAYACAK
  — "cevap sonrası ses DEVAM ETMELİ") — `setDualCut()` SADECE canlı
  filtrenin kazancını değiştiriyor.

**⚠️ Bulunan, kullanılmayan bir mekanizma:** `setDualSolo(which)`
(`audio-engine.js:1244-1258`, "AŞAMA 1/2'nin dinleme kontrolü" yorumuyla
YAZILMIŞ) — export EDİLİYOR ama grep'te app.js/mod dosyalarının
HİÇBİRİNDE ÇAĞRILMIYOR. Kaynak A/B'yi TEK TEK dinletmek için (frekans
izolasyonu DEĞİL, KAYNAK izolasyonu) HAZIR duruyor, bağlanmamış.

**Ölçülen fark (analitik, İKİ kaynak da AYNI 6dB kesiliyor, SADECE
merkez farklı: 1000→1300Hz):** **%27,3**'ünde ≥1dB fark, en büyük
**4,4dB @1504Hz**, anlamlı bölge 432-3008Hz (~2,8 oktav).

**İzolasyon mümkün mü?**
- **Aşama 1:** EVET — ama "çakışan bandı izole dinlet" tek bir
  KAYNAĞIN kesimini izole etmekle SAĞLANMAZ (çakışma İKİ kaynağın
  TOPLAMININ bir özelliği) — TOPLAM MİKSİ (compressor/out sonrası)
  `trueCenter` etrafında bandpass etmek gerekir. Bu, `buildDualSourceChain`'e
  YENİ bir düğüm (SADECE ear-preview yolunda, normal oyunu ETKİLEMEDEN)
  eklemek demek — orta düzeyde iş.
- **Aşama 3:** TEKNİK OLARAK mümkün (CANLI grafiğe bandpass düğümü
  sonradan bağlamak Web Audio'da yapılabilir) ama **DOKUNULMAYACAK**
  listesindeki "cevap sonrası ses DEVAM ETMELİ, kasıtlı" kısıtıyla
  DOĞRUDAN gerilir — canlı bir grafiğe düğüm EKLEMEK (çıkarmak değil)
  görece daha güvenli olsa da, "kesintisiz devam" garantisini BOZMADAN
  yapmak İTİNA ister; bu 8 modun EN RİSKLİ alt-görevi.

**Tek buton yeter mi?** Aşama 1'de muhtemelen evet. Aşama 3'te
BELİRSİZ — hem izolasyon riski HEM "aşama 3'ün ses davranışı
DOKUNULMAYACAK" kısıtı BİRLİKTE düşünülünce, Aşama 3'ü bu turun
kapsamı DIŞINDA bırakmak (izolasyon SADECE Aşama 1'e, Aşama 3 MEVCUT
haliyle) daha güvenli bir ORTA yol olabilir — ÜRÜN KARARI.

---

## Toplu tablo

| Mod | İzole edilebilir mi? | Tek buton öngörüsü | Ölçülen anlamlı-fark (log-spektrum) |
|---|---|---|---|
| Frekans Bulma | ✅ | Muhtemelen evet | %23,7-41,0 |
| Kesim Noktası | ✅ (pencere ile) | Muhtemelen evet | %60,3-61,3 (uç-ağırlıklı, PSD ile teyit gerekir) |
| dB Seviyesi | ❌ yapısal | Hayır, mevcut kalmalı | %100 (her yerde eşit) |
| Q Genişliği | ✅ (pencere boyutu ÖZENLİ) | Muhtemelen evet, tasarım riski VAR | %43,7 |
| Pan Konumu | ❌ yapısal | Hayır, mevcut kalmalı | ölçülemedi (frekans ekseni yok) |
| Stereo Genişlik | ❌ yapısal | Hayır, mevcut kalmalı | ölçülemedi (frekans ekseni yok) |
| Boost/Cut | ✅ | Muhtemelen evet | %39,0 |
| Çakışması Aşama 1 | ✅ (toplam mikste) | Muhtemelen evet | %27,3 |
| Çakışması Aşama 3 | ⚠️ teknik mümkün, riskli | Belirsiz — ürün kararı | (Aşama 1 ile benzer büyüklükte beklenir, AYRICA ölçülmedi) |

---

## İş yükü tahmini (ÖLÇÜLMEDİ — kod yazılmadığı için KESİN rakam yok, kapsam tahmini)

- **Paylaşılan izolasyon yardımcısı** (yeni/refactor edilmiş bandpass
  fonksiyonu, `toolsApplySoloBandFilter`'ın parametreli hâli): ~1
  dosya, ~30-60 satır (bu reponun yorum-yoğun kuralına göre).
- **5 tek-kaynak izole edilebilir mod** (Frekans Bulma/Kesim Noktası/
  Q Genişliği/Boost-Cut, artı Çakışması Aşama 1 AYRI): her biri
  `applyProcessing`'e küçük bir "isolate" bayrağı YA DA app.js'in ear-
  click handler'ında chain kurulduktan SONRA isolation filtresini
  EKLEME — mod başına ~10-25 satır, TOPLAM ~50-125 satır + audio-
  engine.js'te chain-builder'lara opsiyonel bir parametre (~20-40
  satır).
- **Çakışması Aşama 1** (toplam-mikste bandpass): ~30-50 satır,
  `buildDualSourceChain`'e ek düğüm.
- **Çakışması Aşama 3** (canlı grafiğe izolasyon): en yüksek risk/
  belirsizlik — ~40-80 satır TAHMİN, kulakla doğrulama ŞART.
- **UI/kopya:** `index.html`'in 2-butonluk `.fb-ear` yapısı (satır
  608-609) tek butona (ya da butonların rolü/metni değişecek şekilde)
  indirilir — küçük (~10-20 satır HTML/CSS), ama 8 modun HER BİRİNİN
  `showXEars()` fonksiyonu (`app.js`, her biri ~10-15 satır, TOPLAM
  ~80-120 satır) GÜNCELLENMELİ.
- **Testler — EN BÜYÜK kalem:** `e2e/ear-buttons.spec.mjs` (11 test,
  8 mod, İKİ butonun VARLIĞINI/dataset alanlarını doğrudan doğrulayan
  bir sözleşmeye dayanıyor) BAŞTAN YAZILMALI (tek-buton sözleşmesine
  göre) — TAHMİNİ 300-500+ satır test değişikliği/eklemesi, artı
  izolasyon filtresinin GERÇEKTEN doğru freq/pencerede kurulduğunu
  doğrulayan YENİ birim testleri (audio-engine.js'e DEV_MODE testi
  hook'ları eklenmesi gerekebilir).

**Kaba toplam:** ~15-20 dosya dokunulur, ~600-1000+ satır diff (bu
reponun yorum yoğunluğu göz önüne alınınca muhtemelen ÜST sınıra
yakın) — **BU TURUN diğer tek-commit'lik düzeltmelerinden (G316-G319,
her biri 1-7 dosya/~50-300 satır) YAPISAL OLARAK BÜYÜK, ÇOK OTURUMLUK
bir özellik.**

## Risk

1. **Regresyon riski YÜKSEK** — mevcut kulak butonu ZATEN 11 e2e
  testiyle (ear-buttons.spec.mjs) sıkı sıkıya doğrulanmış bir özellik;
  2 butondan 1'e geçmek bu sözleşmenin TAMAMINI değiştirir, kısmi bir
  düzeltme DEĞİL.
2. **Aşama 3 özel riski** — DOKUNULMAYACAK'taki "kesintisiz ses devam"
  garantisiyle doğrudan gerilir, en dikkatli yapılması gereken alt-
  görev.
3. **Q Genişliği'nde pencere-boyutu tasarım riski** — yanlış
  boyutlandırılmış bir izolasyon penceresi, ölçülmek istenen ŞEYİ
  (genişlik algısı) BOZABİLİR.
4. **Ürün kararı netliği eksik** — Logic'in "tek buton yeter" fikri
  KENDİ ÇIKARIMI ("olabilir"), kesin bir karar değil; hangi modlarda
  "benim tahminim"i TAMAMEN kaldırmanın pedagojik bir kayıp
  YARATMAYACAĞI kulakla/kullanıcı testiyle doğrulanmalı.
5. **dB Seviyesi/Pan Konumu/Stereo Genişlik'te SIFIR risk** — bu 3 mod
  hiç DOKUNULMUYOR, mevcut davranış AYNEN kalır.

## SONUÇ — 1.0'a sığar mı, 1.1'e mi kalmalı?

**Ölçülen iş yükü + risk profiline göre: 1.1'e kalmalı, 1.0'a
SIĞDIRILMAMALI.** Gerekçe: (a) tahmini 15-20 dosya/600-1000+ satır,
bu oturumun diğer TEK-COMMIT'lik düzeltmelerinin (G316-G319) 3-10 katı
büyüklükte — kapsamı KÜÇÜLTMEDEN (ör. sadece 1-2 mod) acele
sıkıştırmak KİLİT'teki "npm test/e2e asla düşmeyecek" şartını riske
atar; (b) mevcut 11 e2e testinin YENİDEN YAZILMASI gerekiyor — bu,
KİLİT'in kendisini DEĞİŞTİRMEK anlamına gelir (test SAYISI/anlamı
değişir), format/yöntem değişikliğinin ÖNCE SORULMASI kuralına girer;
(c) Aşama 3 ve Q Genişliği'nin pencere-boyutu gibi noktalar kulakla
GERÇEK doğrulama istiyor, aceleye getirilirse "ölç, sonra uygula"
disiplinini ihlal eder. **Öneri (ÜRÜN KARARI, burada VERİLMEDİ):**
1.1'de, muhtemelen İKİ aşamalı — ÖNCE frekans-lokalize 5 tek-kaynak
modu (Frekans Bulma/Kesim Noktası/Q Genişliği/Boost-Cut + Çakışması
Aşama 1), SONRA (ayrı bir turda, kulakla doğrulanmış bir pencere
tasarımıyla) Çakışması Aşama 3 — dB Seviyesi/Pan Konumu/Stereo
Genişlik'e HİÇ dokunulmadan.

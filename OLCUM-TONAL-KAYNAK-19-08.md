# OLCUM-TONAL-KAYNAK-19-08

GÖREV: ÖLÇÜM. Kod yazılmadı, commit atılmadı.

## SONUÇ (önce, gerekçe altta)

**Logic'in şüphesi DOĞRU YÖNDE ama kısmen abartılı.** Tüm 14 kaynak GERÇEK
FFT ile 6 bantta ölçüldü (Welch-ortalamalı, OLCUM-KAYNAK-16-08.md'nin AYNI
yöntemi). Bulgular:

- **TİZ (8-20kHz) neredeyse HER akustik/davul kaynağında zayıf/boş** —
  bu Logic'in tahmininden DAHA GENEL bir örüntü, SADECE snare'e özgü değil.
- **Ama mevcut TEK kaynak (groove) da bu sorundan MUAF DEĞİL** — ÜST-ORTA VE
  TİZ'de -40dB eşiğinin altında (2/4 bant, BAND_SET_4'e göre). Yani "yeni
  eklenecek kaynak groove'dan daha kötü olmasın" ölçütüyle bakılırsa, adayların
  ÇOĞU (snare, gitarlar, vokal) groove'dan DAHA İYİ ya da EN AZINDAN eşdeğer.
- **Kod tarafında hiçbir "boş bantı atla" mekanizması YOK** — `createQuestion()`
  bant seçimini kaynağın GERÇEK enerjisinden TAMAMEN BAĞIMSIZ, saf rastgele
  yapıyor. Boş bir bant seçilirse kullanıcı duyamayacağı bir bozukluğu
  düzeltmeye çalışır — bu SADECE "anlamsız soru" değil, ortalama sapmaya
  düzeltilemeyen bir kalıntı hata olarak GİRDİĞİ için **haksız yere zor** bir
  round'a yol açabilir.
- **En güçlü teknik aday: Hi-Hat** (6/6 bant, -30dB eşikte bile TAM geçiyor) —
  Logic'in listesinde yok ama en "dolu spektrum" kaynak bu.
- **Vokal, Vokal 2, Snare, Akustik/Clean Gitar (+ stereo varyantları), Arpej
  Gitar**: hepsi groove'un BAND_SET_4'teki (2/4) performansından EN AZ eşit,
  çoğu daha iyi (3-4/4) — eklenebilir ADAY olarak değerlendirilebilir, TİZ'in
  zayıflığı bilinerek.
- **Kick, Bas**: AÇIKÇA yetersiz (1-2/4) — G44'ün orijinal gerekçesi
  ("tek-vuruş/tek-nota kaynaklar dolu spektrum göstermez") bunlar için TAM
  DOĞRULANDI, eklenmemeli.
- **"Hedef eğriler (Pop/EDM/Akustik)" endişesi YANLIŞ ADRESE yönelmiş** —
  Tonal Denge (mod) bu eğrileri HİÇ KULLANMIYOR (ayrı bir modül,
  `core/tonal-balance.js`, SADECE Araçlar → Tonal Balance aracında). Tonal
  Denge'nin "doğru" hedefi HER ZAMAN düz/nötr (bugDb=0) — türe göre değişmiyor,
  bu yüzden kaynak türü (tür=Pop/EDM/Akustik) BU MODU hiç ilgilendirmiyor.

---

## 1) Mevcut durum

**only listesi:** `uyumluKaynaklar: compatibleSourceIds({ only: ["groove", "upload"] })`
(`tonal-denge.js:310`).

**Neden sadece groove — KASITLI, İKİ KEZ doğrulanmış:**
- **G44** (`6cd854d`, modun İLK COMMIT'İ, 6 Ağustos): "tilt SADECE dolu
  spektrumda duyulur, tek-vuruş/tek-nota/sentetik [kaynaklar uygun değil]" —
  BAŞTAN kasıtlı tasarım kararı.
- **G270** (`230d355`, arpeggio_guitar eklendiğinde, katalog genişletme
  turu): kod içi yorum AÇIKÇA "KONTROL EDİLDİ, BİLEREK DEĞİŞTİRİLMEDİ" diyor
  — clean_guitar ve arpeggio_guitar'ın da "TEK ENSTRÜMAN (dolu mix DEĞİL)"
  olduğu, G44'ün AYNI gerekçesiyle dışarıda kalması GEREKTİĞİ NOT edilmiş.

Yani bu, gözden kaçmış bir eksiklik DEĞİL — iki ayrı oturumda BİLEREK
korunmuş bir kısıtlama. Bu turun görevi (Logic'in "çeşitlilik istiyorum"
isteği) bu kısıtlamayı SORGULAMAK, kaldırmak değil.

**Bant sayısı:** 4/5/6, soru sırasına göre kademeli artıyor
(`bandCountForSessionIndex`): Soru 1-4 → 4 bant, 5-8 → 5 bant, 9+ → 6 bant
(Serbest modda da 9'dan sonra 6'da sabit kalır). Sınav modunda
(`examBandBoost`) HER ZAMAN 6 bant zorlanır.

- **BAND_SET_4** = `[bas, alt-orta, ust-orta, tiz]` — SUB ve ORTA yok.
- **BAND_SET_5** = `[bas, alt-orta, orta, ust-orta, tiz]` — ORTA eklendi.
- **BAND_SET_6** = `[sub, bas, alt-orta, orta, ust-orta, tiz]` — TAM liste.

---

## 2) Her kaynağın bant doluluğu (GERÇEK FFT ölçümü)

Yöntem: her dosya `decodeAudioData` ile açıldı, stereo dosyalarda L+R
mono-mix alındı (Tonal Denge'nin sorusu STEREO GÖRÜNTÜ değil TONAL enerji
olduğu için doğru referans), 4096-nokta FFT + Hann penceresi + %50 örtüşme
(2048 hop) ile Welch-ortalamalı güç spektrumu çıkarıldı, `frekans-bulma.js`
`FA_ZONES` ile BİREBİR AYNI 6 bant sınırında (SUB 20-120 · BAS 120-250 ·
ALT-ORTA 250-500 · ORTA 500-2000 · ÜST-ORTA 2000-8000 · TİZ 8000-20000)
ortalama güç hesaplandı, kaynağın KENDİ en güçlü bandına (0dB) göre
NORMALİZE edildi (dB cinsinden, tepeye göre).

| Kaynak | SUB | BAS | ALT-ORTA | ORTA | ÜST-ORTA | TİZ |
|---|---:|---:|---:|---:|---:|---:|
| kick | 0 | -15.5 | -43.7 | -44.5 | -49.5 | -65.9 |
| snare | -27.7 | 0 | -3.2 | -16.4 | -27.1 | -42.2 |
| hihat | -34.0 | -10.0 | 0 | -5.7 | -7.6 | -10.8 |
| tom | 0 | -0.8 | -17.8 | -32.4 | -33.4 | -52.9 |
| **groove (mevcut TEK kaynak)** | 0 | -13.8 | -21.9 | -34.1 | -42.5 | -50.2 |
| bass | 0 | -3.7 | -15.9 | -41.9 | -61.8 | -89.3 |
| acoustic_guitar | -4.7 | 0 | -8.7 | -16.8 | -32.2 | -42.9 |
| clean_guitar | -24.2 | -11.6 | 0 | -7.0 | -26.7 | -53.3 |
| arpeggio_guitar | -4.8 | 0 | -7.5 | -15.6 | -33.2 | -56.0 |
| vocal | -40.3 | 0 | -0.7 | -1.0 | -13.1 | -37.1 |
| vocal_1 (Vokal 2) | -49.0 | -3.9 | 0 | -4.9 | -26.6 | -45.3 |
| acoustic_guitar_stereo | -6.2 | 0 | -6.9 | -16.6 | -32.3 | -42.6 |
| clean_guitar_stereo | -24.1 | -11.8 | 0 | -7.0 | -26.8 | -52.9 |
| snare_late | -27.5 | 0 | -3.2 | -16.4 | -27.2 | -42.4 |

(dB, kaynağın kendi tepe bandına göre; 0 = o kaynağın en güçlü bandı.)

**Gözlem:** stereo varyantlar (`acoustic_guitar_stereo`/`clean_guitar_stereo`)
mono orijinalleriyle (`acoustic_guitar`/`clean_guitar`) İSTATİSTİKSEL OLARAK
AYNI profili taşıyor (±0.3dB fark, ölçüm gürültüsü seviyesinde) — AYNI kayıt,
sadece stereo alım. `snare_late` de `snare`'le neredeyse birebir aynı (ilk
vuruşu kesilmiş olması spektral enerji dağılımını DEĞİŞTİRMİYOR).

**-40dB eşiğiyle "boş" sayıldığında** (görevin kendi önerisi):

| Kaynak | Boş bantlar (-40dB altı) |
|---|---|
| kick | ALT-ORTA, ORTA, ÜST-ORTA, TİZ (4/6) |
| snare, snare_late | TİZ (1/6, -42.2/-42.4dB — eşiğin ~2dB altı) |
| hihat | *(hiçbiri — 0/6)* |
| tom | TİZ (1/6) |
| **groove** | **ÜST-ORTA, TİZ (2/6)** |
| bass | ORTA, ÜST-ORTA, TİZ (3/6) |
| acoustic_guitar, acoustic_guitar_stereo | TİZ (1/6) |
| clean_guitar, clean_guitar_stereo | TİZ (1/6) |
| arpeggio_guitar | TİZ (1/6) |
| vocal | SUB (1/6, -40.3dB — eşiğe neredeyse tam denk) |
| vocal_1 | SUB, TİZ (2/6) |

---

## 3) Uygunluk eşiği

**Kaç bant gerekli?** Cevap, HANGİ soru sırasında sorulduğuna bağlı —
BAND_SET_4/5/6'nın KENDİSİ dinamik. Pratik ölçüt: **o an aktif bant kümesinin
(BAND_SET_4/5/6) TAMAMINDA -40dB üstü enerji.**

**-40dB'nin kendisi ne kadar sağlam bir sınır?** Görevin önerdiği eşik
mantıklı bir başlangıç ama KATI bir "doğru" değer değil — kanıt: **groove'un
KENDİSİ bu eşiği BAND_SET_4'te SADECE 2/4 bantta geçiyor** (ÜST-ORTA/TİZ
altında). Yani mevcut, zaten-oynanan mod BİLE bu eşiği HER bantta
karşılamıyor — sistem şu an bile "ideal" değil, sadece groove'un zayıf
bantları (ÜST-ORTA/TİZ) BAND_SET_4'ün eklenmesi en SON aşamada (soru 9+,
BAND_SET_6) devreye giren SUB kadar erken karşılaşılmıyor... aslında ÜST-ORTA
ve TİZ BAND_SET_4'ün İÇİNDE (soru 1-4'ten itibaren) — yani kullanıcı DAHA
İLK 4 SORUDA groove'un zayıf ÜST-ORTA/TİZ bantlarıyla karşılaşıyor OLABİLİR,
bu bugüne kadar fark edilmemiş/raporlanmamış bir durum.

**BAND_SET_4 4 dolu bant ister mi, yeter mi?** EVET, mod BAND_SET_4'teyken
SADECE o 4 bandı soruyor — SUB/ORTA o aşamada hiç sorulmuyor, bu ikisinin
durumu ÖNEMSİZ. Yani "4 dolu bant yeter mi" sorusunun cevabı: EVET, YETER —
ama "4 bandın HANGİLERİ" önemli: BAND_SET_4 spesifik olarak
[bas,alt-orta,ust-orta,tiz]'i istiyor, kaynağın SUB/ORTA'da güçlü olması bu
aşamada İŞE YARAMAZ.

**Boş bantta soru sorulursa ne oluyor — ATLANIYOR MU?**
**HAYIR, ATLANMIYOR.** `createQuestion()` (`tonal-denge.js:329-361`) bant
seçimini (`bandIdsForCount`) VE hangi bantların "bozuk" sayılacağını
(`bandsForQuestion`, saf `rng()` ile) **kaynağın (`settings.source`) GERÇEK
enerjisinden TAMAMEN BAĞIMSIZ olarak** belirliyor. `source` alanı SADECE
HANGİ DOSYANIN ÇALINACAĞINI belirlemek için kullanılıyor, bant seçim
mantığına HİÇ girmiyor (grep ile doğrulandı — `source` değişkeni
`bandsForQuestion`/`bandIdsForCount` çağrılarının HİÇBİRİNE argüman olarak
geçmiyor).

**Pratik sonuç (kod okuması + `evaluateAnswer` analizi):** boş bir bant
(örn. TİZ, groove'da zaten -50dB) RASTGELE "bozuk" seçilirse
(`bandsForQuestion`'ın `disturbedSet`'i), o banda `bugDb` (örn. ±5dB)
uygulanıyor — ama kaynağın o bandda enerjisi neredeyse YOK, kullanıcı
bozukluğu KULAKLA AYIRT EDEMEZ. `evaluateAnswer()` `avgDeviation`'ı TÜM
bantların `|bugDb + correction|` ORTALAMASI olarak hesaplıyor
(`tonal-denge.js:434-439`) — kullanıcı duymadığı bandı düzeltemeyeceği için
(correction≈0 kalır) `residualDb ≈ bugDb` KALIR ve bu, ortalamaya TAM
AĞIRLIKLA giriyor. Sonuç: **"anlamsız soru" DEĞİL, "haksız/düzeltilemez bir
hata" — round'un `avgDeviation`'ını (dolayısıyla `correct`/XP'yi) kullanıcının
KUSURU OLMAYAN bir sebeple kötüleştirebilir.** Bu, YENİ eklenecek kaynaklar
İÇİN olduğu kadar **groove'un KENDİSİ İÇİN DE bugün zaten var olan, ölçülmüş
ama daha önce raporlanmamış bir risk** (groove'un ÜST-ORTA/TİZ'i zaten
-40dB altı).

---

## 4) Aday kaynaklar

BAND_SET_4 = [BAS, ALT-ORTA, ÜST-ORTA, TİZ] üzerinden, -40dB eşiğiyle,
**groove'un KENDİ skoru (2/4) referans alınarak:**

| Kaynak | BAND_SET_4 dolu/toplam | BAND_SET_6 dolu/toplam | groove'dan (2/4) iyi mi? |
|---|---|---|---|
| **hihat** | **4/4** | **6/6** | ✅ Belirgin daha iyi |
| vocal | 4/4 (TİZ sınırda, -37.1) | 5/6 (SUB sınırda) | ✅ Daha iyi |
| snare / snare_late | 3/4 (TİZ -42.2, eşiğe yakın) | 5/6 | ✅ Daha iyi |
| acoustic_guitar / (_stereo) | 3/4 (TİZ -42.9/-42.6) | 5/6 | ✅ Daha iyi |
| clean_guitar / (_stereo) | 3/4 (TİZ -53.3/-52.9, daha zayıf) | 5/6 | ✅ Daha iyi |
| arpeggio_guitar | 3/4 (TİZ -56.0, en zayıf TİZ) | 5/6 | ✅ Daha iyi |
| vocal_1 | 3/4 (TİZ -45.3) | 4/6 (SUB+TİZ boş) | ✅ Daha iyi (ama "vocal"dan zayıf) |
| tom | 3/4 (-40dB'de) / **2/4 (-30dB'de)** | 5/6 | ⚠️ Eşiğe DUYARLI, sınırda |
| bass | 2/4 | 3/6 | = (groove'la eşit, daha iyi DEĞİL) |
| kick | 1/4 | 2/6 | ❌ Daha kötü |

**Logic'in önerdikleri (snare, stereo gitarlar, vokal) → HEPSİ eşiği geçiyor**
(groove'un kendi skorundan daha iyi). **Groove'dan başka uygun kaynak var
mı? EVET, ÇOĞU** — hihat en güçlüsü, vocal ikinci, gitarlar/snare/vocal_1
benzer (3/4) bir grupta.

---

## 5) Stereo kaynaklar

**Tonal Denge stereo dosyayı kabul EDER Mİ?** Kod seviyesinde EVET — 
`compatibleSourceIds({only:[...]})` çağrıldığında (`source-catalog.js:413-414`)
`if (only) return [...only]` ile **`stereoOnly` filtresi HİÇ ÇALIŞTIRILMIYOR**
(filtre SADECE `only` VERİLMEDİĞİNDE, varsayılan/otomatik listede uygulanıyor
— `source-catalog.js:417`). Yani Tonal Denge'nin `only` listesine
`"acoustic_guitar_stereo"` EKLENSEYDİ, `stereoOnly:true` bayrağı bunu
ENGELLEMEZ — bayrak SADECE "otomatik/varsayılan kaynak seçicide görünme"yi
kısıtlıyor, `only` ile AÇIKÇA istenen bir modun erişimini DEĞİL.

**Spektral olarak fark var mı?** HAYIR — yukarıdaki tabloda
`acoustic_guitar_stereo` ile `acoustic_guitar` (ve `clean_guitar_stereo` ile
`clean_guitar`) İSTATİSTİKSEL olarak AYNI (±0.3dB, ölçüm gürültüsü
seviyesinde) — AYNI enstrüman/kayıt, sadece stereo alım. Tonal Denge mono-mix
üzerinden çalıştığı için (`audio-engine.js`'in genel L+R karışım deseni,
diğer tüm modlarla AYNI) stereo/mono ayrımı bu mod için TONAL açıdan
ANLAMSIZ — sadece "hangi dosya" seçimi, ses karakteri AYNI.

---

## 6) Risk

**Uygun olmayan kaynak eklenirse ne olur?** (3)'te açıklandı — boş bantta
"düzeltilemez kalıntı hata" riski, round'u haksız zorlaştırabilir. Bu risk
kick/bass gibi 1-2/4 kaynaklarda YÜKSEK (4 bandın 2-3'ü etkilenebilir),
snare/gitar/vokal grubunda DÜŞÜK (sadece TİZ, tek bant, ve groove'un KENDİSİ
zaten bu riski 2 bantta taşıyor).

**Zorluk dengesi değişir mi?** `DIFFICULTY`/`TONAL_CURVE_CONFIG`
(`disturbDb`/`timeSec`/`neutralToleranceDb`) kaynaktan TAMAMEN BAĞIMSIZ —
SADECE `level`/`difficultyPosition`'a bağlı. Yani MEKANİK zorluk eğrisi
DEĞİŞMEZ — ama (3)'ün bulduğu "boş bantta düzeltilemez hata" riski nedeniyle
**FİİLİ (algılanan) zorluk**, seçilen kaynağın zayıf bantlarına göre SESSİZCE
dalgalanabilir — bu YENİ bir mekanizma DEĞİL, mevcut `evaluateAnswer()`'ın
DOĞAL bir sonucu.

**Hedef eğriler (Pop/EDM/Akustik) tek enstrümanda anlamlı mı?**
**SORU BU MODA UYGULANMIYOR.** Grep ile doğrulandı: `tonal-denge.js`
`core/tonal-balance.js`'i (genre hedef eğrilerinin bulunduğu modül) HİÇ
import ETMİYOR, hiç referans VERMİYOR. 41 parçadan ölçülen Pop/EDM/Akustik
eğrileri SADECE Araçlar → **Tonal Balance** aracında (`TOOLS_TONAL_GUIDE`,
kullanıcının YÜKLEDİĞİ kendi mix'ini bir tür referansıyla karşılaştıran,
TAMAMEN AYRI bir özellik) kullanılıyor. **Tonal Denge (mod) her zaman DÜZ/
NÖTR'ü (bugDb=0) hedefliyor, tür'e göre DEĞİŞMİYOR** — bu yüzden "tek
enstrümana tür-eğrisi uygulamak doğru mu" sorusunun cevabı bu modda
GEÇERSİZ (soru yanlış moda yönelmiş olabilir — Tonal Balance ARACI zaten
BUGÜN de herhangi bir dosyayı, tek enstrüman dahil, kabul ediyor, o ayrı bir
konu, bu turun kapsamı DIŞINDA).

**"upload" zaten serbest — emsal:** `only:["groove","upload"]` ZATEN
kullanıcının kendi yüklediği HERHANGİ bir dosyayı (tek enstrüman dahil)
kabul ediyor — yani "tek enstrümanlı kaynak" riski BUGÜN ZATEN mevcut
(upload yoluyla), sadece KÜRE edilmemiş/uyarılmamış. Yeni built-in kaynak
eklemek bu riski İCAT ETMİYOR, sadece GENİŞLETİYOR (daha çok kullanıcı daha
kolay karşılaşır).

---

## Kaynaklar / referans commit'ler

- G44 (`6cd854d`) — Tonal Denge'nin ilk kurulumu, `only:["groove","upload"]`
  kısıtının KASITLI gerekçesi.
- G270 (`230d355`) — arpeggio_guitar eklenirken kısıtın YENİDEN KONTROL
  EDİLİP BİLEREK KORUNMASI.
- OLCUM-KAYNAK-16-08.md — bu turda kullanılan FFT/Welch yönteminin ilk
  kurulduğu ölçüm (aynı yöntem tekrarlandı, farklı eksen: tek tepe frekansı
  yerine 6-bant enerji profili).

Kod yazılmadı, commit atılmadı — bu tur sadece ölçüm. Hangi kaynakların
GERÇEKTEN ekleneceği, `only` listesinin GENİŞLETİLİP genişletilmeyeceği ve
"boş bant" riskinin (madde 3) NASIL ele alınacağı (kaynağa göre bant kümesini
filtrelemek mi, yoksa riski KABUL edip TEK sınırı groove'un kendi seviyesi mi
yapmak) — kullanıcı kararı gerektiren AÇIK sorular, bu ölçümde VERİLMEDİ.

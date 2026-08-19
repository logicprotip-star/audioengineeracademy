# OLCUM-KOMPRESOR-KAYNAK-20-08

GÖREV: ÖLÇÜM. Kod yazılmadı, commit atılmadı.

## SONUÇ (önce, kanıt altta)

**Logic'in şüphesi TAM DOĞRULANDI, sayılarla.** "saw" (ve square/triangle)
GERÇEKTEN sabit genlikte — 8 saniyelik bir render'da **SIFIR transient**
ölçüldü (gerçek kaynaklarda 11-36 arası). Kompresör bu kaynaklarda
**ölçülebilir hiçbir dinamik iş yapmıyor**: sıkıştırılmış tepe/RMS oranı
sıkıştırılmamışa göre DÜŞMÜYOR (gerçek kaynaklarda 3.3-5.5 dB düşerken,
sentetiklerde -0.09 ile -0.21 dB — yani PRATİKTE HİÇ, istatistiksel
gürültü seviyesinde). Kullanıcının GERÇEKTEN duyduğu tek şey, iki farklı
ratio/threshold ayarının ürettiği FARKLI SABİT SEVİYE (dB) — Kompresör'ün
"karakterini" değil, bir "hangisi daha kısık" (dB Seviyesi'yle AYNI iş)
sorusunu çözüyor.

**Kök sebep, koda kadar izlendi:** `source-catalog.js`'in `noTransient`
bayrağı TAM OLARAK bu senaryo için var (kompresör.js zaten
`requireTransient:true` ile pink/white'ı bu bayrakla dışlıyor) — ama saw/
square/triangle bu bayrağı TAŞIMIYOR, muhtemelen bayrak eklendiğinde
sadece "noise" tipi kaynaklar (pink/white) düşünülmüştü, "synth" tipi
(saw/square/triangle) atlanmıştı. Bu, YENİ bir mekanizma İCAT etmeden,
TEK bir bayrak eksikliğini TAMAMLAMAKLA çözülebilecek, dar/cerrahi bir
sorun.

**Distortion'da AYNI sorun YOK** — waveshaping (harmonik ekleme) genlik-
tabanlı bir etki, zamana/transient'e bağımlı DEĞİL; saw'da bile ölçülebilir
harmonik ekleme VAR (+1.44dB, 4kHz üstü enerji). **Reverb zaten GÜVENLİ**
— `only` listesi saw/square/triangle/pink/white'ı hiç içermiyor (G'ler
öncesinde BİLEREK dışarıda bırakılmış).

---

## 1) Kompresör modunda hangi kaynaklar var?

`uyumluKaynaklar: compatibleSourceIds({ requireTransient: true })`
(`kompresor.js:286`). `compatibleSourceIds()`'in `requireTransient:true`
dalı `noTransient:true` işaretli kaynakları (SADECE pink/white) çıkarır,
`stereoOnly`/`pairOnly` kaynakları da (her zaman) çıkarır — **sentetik
kaynaklar saw/square/triangle bu filtrelerin HİÇBİRİNE takılmıyor,
LİSTEDE KALIYOR.**

Sonuç liste (14): kick, snare, hihat, tom, groove, bass, guitar,
clean_guitar, arpeggio_guitar, vocal, vocal_1, **saw, square, triangle**,
upload.

---

## 2) Her kaynağın dinamik aralığı (GERÇEK ölçüm)

Yöntem: her kaynak 8 saniye render edildi (sentetikler `audio-engine.js:
buildSynthSource`'un BİREBİR AYNI kurulumuyla — 110Hz+220Hz iki osilatör,
sabit gain, envelope YOK — yeniden üretildi; örnek dosyalar `decodeAudioData`
ile). 20ms'lik örtüşmesiz pencerelerle RMS zarfı çıkarıldı, transient =
ardışık iki pencere arasında **≥6dB sıçrama**.

| Kaynak | Tepe/RMS (crest, dB) | Zarf aralığı (dB) | Zarf std sapma | Transient sayısı |
|---|---:|---:|---:|---:|
| kick | 20.18 | 92.40 | 22.06 | 19 |
| snare | 25.92 | 186.36 | 66.28 | 15 |
| hihat | 25.32 | 87.59 | 23.05 | 36 |
| tom | 20.58 | 185.45 | 83.29 | 18 |
| groove | 19.48 | 189.51 | 22.23 | 33 |
| bass | 14.54 | 54.17 | 13.17 | 30 |
| guitar (akustik) | 17.52 | 184.92 | 56.05 | 23 |
| clean_guitar | 14.84 | 89.06 | 20.97 | 32 |
| arpeggio_guitar | 15.21 | 48.43 | 9.46 | 11 |
| vocal | 18.37 | 185.90 | 67.35 | 23 |
| vocal_1 | 14.88 | 184.57 | 49.75 | 11 |
| **saw** | **5.29** | **0.54** | **0.24** | **0** |
| **square** | **4.18** | **0.53** | **0.25** | **0** |
| **triangle** | **4.44** | **0.64** | **0.24** | **0** |

**Çarpıcı, net bir uçurum:** 11 gerçek kaynağın HEPSİ crest factor
14.5-26dB, zarf aralığı 48-190dB, transient 11-36 — sentetik üçü crest
factor 4-5dB, zarf aralığı <1dB, **transient TAM SIFIR**. Ara bir durum
YOK — bu ikili bir ayrım, eşik seçimi TARTIŞMALI değil.

(Zarf aralığının 48-190dB gibi büyük görünmesi — gerçek kaynaklarda vuruş
ARALARINDAKİ neredeyse-sessiz pencerelerin dB tabanına inmesinden;
sentetiklerde ise sinyal HİÇ susmadığı, sürekli aynı genlikte çaldığı
için zarf pratikte DÜZ kalıyor — bu da beklenen/tutarlı bir sonuç.)

## 3) Kompresörün gerçek etkisi

Her kaynak, kompresor.js'in KENDİ `applyProcessing()` parametreleriyle
(knee=6dB, attack=3ms, release=150ms — HİÇBİRİ zorlukla değişmiyor,
SADECE ratio/threshold k'ye bağlı) üç k değerinde işlendi: **k=0.5**
(iki "aynı" kart), **k=0.05/0.95** (Kolay farkı, kGap=0.45), **k=0.454/
0.546** (Pro/en zor farkı, kGap=K_GAP_FLOOR=0.046).

| Kaynak | Sıkıştırılmış crest (dB) | Crest AZALMASI (dB) | Kolay fark (dB, düşük/yüksek) | Pro fark (dB, düşük/yüksek) |
|---|---:|---:|---:|---:|
| kick | 16.58 | **3.60** | 1.313 / 1.149 | -0.184 / 0.187 |
| snare | 25.71 | **0.20** | 0.058 / 2.527 | -0.190 / 0.158 |
| hihat | 21.79 | **3.54** | 3.663 / 1.932 | -0.083 / 0.129 |
| tom | 15.08 | **5.50** | 4.310 / 0.361 | 0.239 / -0.206 |
| groove | 15.84 | **3.64** | 1.410 / 1.082 | -0.167 / 0.172 |
| bass | 10.03 | **4.52** | 3.612 / 2.916 | -0.202 / 0.243 |
| guitar | 12.56 | **4.96** | 4.473 / 2.574 | -0.065 / 0.149 |
| clean_guitar | 11.50 | **3.34** | 1.960 / 3.042 | -0.247 / 0.265 |
| arpeggio_guitar | 10.83 | **4.38** | 4.001 / 2.437 | -0.075 / 0.133 |
| vocal | 14.43 | **3.94** | 2.666 / 1.767 | 0.087 / -0.053 |
| vocal_1 | 10.73 | **4.14** | 3.996 / 2.275 | 0.015 / 0.041 |
| **saw** | 5.38 | **-0.09** | -1.760 / 4.000 | -0.379 / 0.388 |
| **square** | 4.36 | **-0.18** | -3.812 / 4.356 | -0.438 / 0.440 |
| **triangle** | 4.65 | **-0.21** | -3.244 / 4.024 | -0.420 / 0.425 |

**"Crest azalması" gerçek kompresyon çalışıyor mu"nun doğrudan kanıtı** —
kompresör sinyalin TEPELERİNİ RMS'e göre bastırıyorsa crest factor
DÜŞMELİ. 11 gerçek kaynakta 3.3-5.5dB düşüyor (kompresör GERÇEKTEN
dinamik bir iş yapıyor). Sentetik üçünde crest factor düşMÜYOR, hatta
HAFİFÇE artıyor (-0.09...-0.21 = "azalma" negatif, yani ARTIŞ) — sinyal
zaten dümdüz olduğu için sıkıştıracak bir tepe YOK, kompresör pratikte
sadece sabit bir kazanç uyguluyor.

**Kolay/Pro farkları (dB) her kaynakta ölçülebilir ve sıfırdan farklı** —
sentetik kaynaklarda BİLE kolay-fark 1-4.4dB (bazı GERÇEK kaynaklardan
DAHA BÜYÜK: örn. saw'ın 4.0dB'si snare'in düşük-yön farkından (0.058dB)
kat kat fazla). **Bu, "saw'da soru çözülemez" DEMEK DEĞİL — tam tersi:
saw'da fark ÇOK KOLAY duyulur (statik dB farkı olarak), bu da modu
GEREĞİNDEN FAZLA kolaylaştırıyor** (Logic'in cihaz gözlemiyle BİREBİR
örtüşüyor: "her soru doğru bilindi").

## 4) Soru ayırt edilebilirliği

Kompresör'ün sorduğu şey **ratio+threshold'un TEK bir "k" (sıkışma
yoğunluğu) eksenine indirgenmiş hâli** — attack/release HER ZAMAN sabit
(kod içi gerekçe: "yavaş attack'lı ses daha AZ sıkışmış DUYULUR ama daha
ÇOK sıkışmıştır — sinyal bulanır", bu yüzden BİLEREK test edilmiyor).
Yani mod zaten attack/release AYRIMI istemiyor — Logic'in şüphesindeki
"attack/release farkı duyulmaz" öncülü YERİNDE bir gözlem ama modun
KENDİSİ zaten bunu TEST ETMİYOR (task'ın kendi 3. maddesinin varsaydığı
eksen koddaki gerçek eksenle TAM örtüşmüyor — mod SADECE genel "ne kadar
sıkışmış" farkını, yani ratio+threshold'un BİRLİKTE ürettiği net dB
farkını soruyor).

**Doğru cevap ile yanlış şıklar arasındaki GERÇEK fark:**
- **groove'da** (gerçek kaynak): Kolay 1.08-1.41dB, Pro ~0.17dB — mod
  ZORLAŞTIKÇA fark GERÇEKTEN küçülüyor, ama tepe/RMS crest-factor
  azalması (3.64dB) HER İKİ durumda da GERÇEK KARAKTER (pumping/gain-
  reduction hissi) veriyor.
- **saw'da** (sentetik): Kolay 1.76-4.00dB (groove'dan BÜYÜK/eşit!),
  Pro ~0.38-0.39dB — SAYISAL fark küçük değil, ama bu fark **SADECE**
  statik ses seviyesi, kompresörün dinamik davranışından (crest-factor
  azalması ~0, "azalma" bile YOK) HİÇ kaynaklanmıyor.

**Sonuç: saw'da soru saf bir "hangisi kısık" (dB Seviyesi'yle AYNI beceri)
testine indirgeniyor — modun ADI "Kompresör" ama ÖĞRETTİĞİ şey gerçek
kaynaklarda "sıkışma karakteri", saw'da "seviye farkı" oluyor.**

## 5) Hangi kaynaklar uygun

- **UYGUN (11):** kick, snare, hihat, tom, groove, bass, guitar,
  clean_guitar, arpeggio_guitar, vocal, vocal_1 — HEPSİ ölçülebilir
  transient (11-36) VE gerçek crest-factor azalması (3.3-5.5dB) taşıyor.
- **UYGUN DEĞİL (3):** **saw, square, triangle** — SIFIR transient, crest-
  factor azalması YOK (hatta hafif ARTIŞ), fark SADECE statik seviye.
- **Eşik:** Ara bir durum YOK (bkz. madde 2'nin uçurumu) — pratik bir
  kural olarak **"8 saniyede ölçülen transient sayısı ≥10 VE k=0.5'te
  crest-factor azalması ≥1dB"** hem 11 uygun kaynağın TAMAMINI (en düşük
  transient 11, en düşük azalma 3.34dB) hem 3 uygunsuz kaynağın TAMAMINI
  (0 transient, azalma yok/negatif) doğru tarafa ayırıyor.
- **Kod-seviyesi gözlem (düzeltme İÇİN, bu turda YAPILMADI):**
  `source-catalog.js`'in `noTransient` bayrağı TAM BU AMAÇLA var
  (Kompresör zaten `requireTransient:true` ile pink/white'ı bu bayrakla
  dışlıyor) — saw/square/triangle'a AYNI bayrak eklenirse Kompresör'ün
  listesi TEK satırlık bir katalog değişikliğiyle düzelir, `only` listesi
  İCAT ETMEYE gerek YOK. Bu bayrak `requireTransient` DIŞINDA HİÇBİR
  modda okunmuyor (grep ile doğrulandı) — Distortion/diğer modlar
  ETKİLENMEZ.

## 6) Aynı sorun başka modlarda var mı?

**Reverb — GÜVENLİ, sorun YOK.** `uyumluKaynaklar: compatibleSourceIds({
only: ["guitar", "clean_guitar", "arpeggio_guitar", "vocal", "vocal_1",
"snare", "groove", "upload"] })` (`reverb.js:281`) — saw/square/triangle/
pink/white/kick/hihat/tom/bass HİÇBİRİ bu ELLE seçilmiş listede yok.
Reverb zaten BİLEREK dar/seçici, bu turun kapsamında YENİ bir bulgu değil.

**Distortion — FARKLI bir mekanizma, AYNI sorun YOK.**
`uyumluKaynaklar: compatibleSourceIds()` (`distortion.js:282`, parametresiz
— saw/square/triangle DAHİL, pink/white de dahil, requireTransient hiç
geçirilmiyor). AMA Distortion **WaveShaperNode** (genlik-tabanlı,
harmonik ekleyen bir doğrusal-olmayan eğri) kullanıyor — Kompresör'ün
AKSİNE bu etkinin duyulması TRANSIENT/zaman gerektirmiyor, SÜREKLİ bir
sinyalde bile harmonik içerik EKLENİR (hatta müzik endüstrisinde
distorsiyon/saturasyon genelde SÜREKLİ notalarla test edilir — armonikler
karmaşık bir transient'in İÇİNDE değil, basit/durağan bir temel
frekansın ÜSTÜNDE daha kolay duyulur).

Ölçüm (4kHz üstü enerji, "eklenen parlaklık/harmonik" göstergesi, tube
eğrisi): **saw**'da k=0.5'te kuru sinyale göre **+1.44dB** harmonik enerji
EKLENİYOR (ÖLÇÜLEBİLİR — waveshaping GERÇEKTEN çalışıyor), Kolay-fark
~1.06dB, Pro-fark ~0.07-0.14dB. **kick**'te k=0.5'te **+2.58dB** ekleniyor
(mutlak olarak DAHA FAZLA) ama Kolay-fark SADECE ~0.19-0.23dB (saw'dan
KÜÇÜK) — kick'in çoğunlukla SESSİZ olması (tek vuruş + sessizlik) toplam
render'ın büyük kısmında waveshaper'ın işleyecek bir sinyali OLMAMASI
yüzünden, ortalamayı sulandırıyor.

**Bu, saw'ın Distortion'da KALMASI gerektiğine işaret ediyor** (belki
transient kaynaklardan bile daha TUTARLI bir ayırt edicilik veriyor) —
Logic'in "aynı sorun başka modlarda var mı" şüphesi Distortion için
**YALANLANDI**. ⚠️ Bu, 2 kaynaklı (saw/kick, tube eğrisi) DAR bir
doğrulama — Kompresör'ün 14-kaynaklı/tam-matrisli ölçümü kadar kapsamlı
DEĞİL, YÖNSEL bir bulgu olarak okunmalı.

### 6b) EK ÖLÇÜM (G337 turunda istendi) — Pink/White'ın Distortion'daki davranışı

**⚠️ BULUNDU, DÜZELTİLMEDİ — kullanıcı kararı gerekir.** Pink/white
noise, `DISTORTION_TYPES`'ın (`distortion.js:80`) 4 eğri ailesinin
(clip/soft/tube/tape — sırasıyla easy/medium/hard/pro) HER BİRİNDE,
KENDİ gerçek kGap'iyle (easy=0.45 ... pro=K_GAP_FLOOR=0.046) ölçüldü
(4kHz üstü enerji, saw/kick ölçümüyle AYNI yöntem):

| Eğri (kademe) | Kaynak | k=0.5'te eklenen HF (dB) | KENDİ kGap'inde fark (dB, düşük/yüksek) |
|---|---|---:|---:|
| clip (easy, kGap=0.45) | white | -2.22 | -3.80 / 1.34 |
| clip (easy, kGap=0.45) | pink | +5.52 | 2.48 / -0.58 |
| soft (medium, kGap=0.30) | white | -0.14 | -2.32 / 1.30 |
| soft (medium, kGap=0.30) | pink | +3.90 | 0.87 / -0.88 |
| tube (hard, kGap=0.15) | white | +1.63 | -0.85 / 0.70 |
| tube (hard, kGap=0.15) | pink | +2.68 | 0.01 / -0.45 |
| **tape (pro, kGap=0.046)** | **white** | +2.26 | **0.00 / 0.00** |
| **tape (pro, kGap=0.046)** | **pink** | +2.40 | **0.00 / 0.00** |

**Easy/medium/hard kademelerinde pink/white'ın farkı saw/gerçek
kaynaklarla KIYASLANABİLİR büyüklükte** (0.5-3.8dB) — sorun YOK.
**Ama PRO kademesinde ("tape" eğrisi, en dar kGap) hem white HEM pink'in
ölçülen farkı 0.00dB'ye YUVARLANIYOR** — saw'ın AYNI kademedeki
0.07-0.14dB'lik (kendisi de zaten küçük) farkından bile DAHA KÜÇÜK/
ölçülemez. Bu, PRO kademesinde pink/white ile Distortion sorusunun
KULAKLA çözülemeyecek kadar (hatta bu ölçümün hassasiyetinde SIFIRA
yuvarlanacak kadar) inceldiğine işaret ediyor — Kompresör'ün SORUNUYLA
AYNI KATEGORİDE değil (orada crest-factor HİÇ düşmüyordu, burada fark
GERÇEKTEN var ama SADECE en zor kademede kayboluyor), ama AYRI, gerçek
bir bulgu.

⚠️ **Bu ölçüm de DAR kapsamlı** (2 kaynak × 4 eğri, TEK bir kGap örneği
her eğri için — Kompresör'ün 14-kaynaklı/5-k-değerli matrisi kadar
sağlam değil). **Kod YAZILMADI, düzeltme YAPILMADI** — task'ın kendi
talimatı gereği SADECE bildiriliyor. Karar (pink/white PRO kademesinde
Distortion'dan çıkarılsın mı, yoksa bu kademe için ayrı bir kGap tabanı
mı gerekir) kullanıcıya bırakıldı.

---

## Kaynaklar / referans

- `www/js/modes/kompresor.js` — `applyProcessing`/`ratioAtK`/`thresholdAtK`/
  `DIFFICULTY`/`COMP_CURVE_CONFIG` (k=0.5 referans, kGap=0.45 Kolay,
  kGap=K_GAP_FLOOR=0.046 Pro).
- `www/js/modes/distortion.js` — `applyProcessing`/`driveAtK`/
  `buildDistortionCurve`/`distortionOutputTrimLinear`.
- `www/js/core/audio-engine.js:buildSynthSource` — sentetik kaynakların
  GERÇEK kurulumu (iki osilatör, 110/220Hz, sabit gain, envelope YOK) —
  bu ölçümde AYNEN yeniden üretildi.
- `www/js/core/source-catalog.js` — `noTransient` bayrağı, `compatibleSourceIds()`.

Kod yazılmadı, commit atılmadı — bu tur sadece ölçüm. `noTransient`
bayrağının saw/square/triangle'a eklenmesi (Kompresör'ün listesini
düzeltecek TEK satırlık katalog değişikliği) AYRI bir tur/karar
gerektirir.

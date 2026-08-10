# ZORLUK ENVANTERİ

Bu belge salt-okunur bir envanter turudur — **hiçbir kod değiştirilmedi**. Kaynak:
`www/js/modes/` altındaki 10 mod dosyası + `www/js/core/difficulty-curve.js` +
`www/js/core/session-plan.js` + ilgili `www/js/app.js` bölümleri.

## 0) Yöntem notu (okumadan önce)

- **"Z1'den Z7'ye"** bu raporda kodun kendi **sürekli zorluk konumu** (`position`,
  1..`LEVEL_CAP`) ekseninde **1'den 7'ye kadar tam sayı seviyeler** olarak
  yorumlandı — kodda "Z1..Z7" diye adlandırılmış bir kavram YOK, mod dosyalarındaki
  5 isimli kademe de (`easy/medium/hard/pro/proplus`) bu sayılarla birebir
  eşleşmiyor (bkz. §4). Bu yorum raporun başında açıkça belirtiliyor ki
  "Z1"="kademe 1" okuması ile "Z1"="easy" okuması karıştırılmasın.
- Z1-Z7 sütunlarındaki TÜM sayılar, her modun **kendi gerçek `paramsForDifficultyPosition()`
  fonksiyonu doğrudan çalıştırılarak** üretildi (Node ile içe aktarılıp çağrıldı,
  elle hesaplanmadı) — kaynak script bu turun sonunda silindi, ama üretim
  yöntemi budur; hiçbir sayı tahmin edilmedi.
- `LEVEL_CAP=20` her modda aynı. Z1-Z7 aralığı toplam eğrinin sadece **ilk
  %32'si** (7/19) — "pro" kademesinin temsilci noktası (20) çok daha ötede.
  Z20 (tavan) değerleri karşılaştırma için §2'de ayrıca verildi.
- **10 modun HEPSİ** bu turda okundu: Frekans Bulma, Kesim Noktası, Q Genişliği,
  Boost mu Cut mu, dB Seviyesi, Kompresör, Reverb, Tonal Denge, Distortion,
  Frekans Çakışması.
- Bulamadığım/moda uygun olmayan her parametre hücresine düz **"yok"** yazıldı —
  tahmin/uydurma yok.

---

## 1) MOD BAŞINA ZORLUK TABLOSU

### 1.1 Frekans Bulma (`frekans-bulma.js`)
Eksen: EQ boost/cut'un gain (dB) + Q + frekans çeldirici mesafesi (oktav).
Doğru frekans **HER ZAMAN rastgele** (log-uniform havuzdan, `logFreq`) — kademeye
bağlı DEĞİL. Gain'in YÖNÜ (boost/cut) kademeye bağlı (`BOOST_ONLY_DIFFICULTIES`:
easy/medium SADECE boost), büyüklüğü ve Q kademeye bağlı (eğriden).
Tolerans: **FREQ_TOLERANCE_OCT = 0.5 oktav (SABİT, kademeden bağımsız)**.

| Z | gainDb | Q | şık sayısı | çeldirici min mesafe (oktav) | süre (sn) |
|---|---|---|---|---|---|
| 1 | 10.00 | 0.90 | 3 | 1.200 | 16.0 |
| 2 | 9.50 | 0.99 | 3 | 1.148 | 15.4 |
| 3 | 9.03 | 1.09 | 3 | 1.099 | 14.9 |
| 4 | 8.58 | 1.20 | 3 | 1.052 | 14.3 |
| 5 | 8.16 | 1.32 | 3 | 1.006 | 13.8 |
| 6 | 7.75 | 1.45 | 4 | 0.963 | 13.3 |
| 7 | 7.37 | 1.59 | 4 | 0.921 | 12.9 |
| 20 (tavan) | 3.80 | 5.50 | 6 | 0.520 | 8.0 |

### 1.2 Kesim Noktası (`kesim-noktasi.js`)
Eksen: HPF/LPF kesim frekansının havuz merkezinden minimum uzaklığı (`marginOct`)
+ çeldirici mesafesi (oktav) + ipucu bant genişliği. Doğru frekans havuzdan
(100–8000 Hz) **rastgele** seçilir, sadece merkeze `marginOct` kadar UZAK olması
zorunlu — kademe arttıkça bu zorunluluk gevşer (merkeze yaklaşabilir = zor).
Filtre TİPİ (highpass/lowpass) ilk 3 soru (`TYPE_REVEAL_QUESTION_COUNT`) açık,
sonra gizli — bu SEANS SIRASINA bağlı, kademeden BAĞIMSIZ bir ayrı eksen.
Tolerans: **FREQ_TOLERANCE_OCT = 0.5 oktav (SABİT)**.

| Z | marginOct | çeldirici min mesafe (oktav) | ipucu bandı (oktav) | şık sayısı | süre (sn) |
|---|---|---|---|---|---|
| 1 | 1.600 | 1.200 | 2.000 | 3 | 14.0 |
| 2 | 1.441 | 1.148 | 1.849 | 3 | 13.7 |
| 3 | 1.298 | 1.099 | 1.709 | 3 | 13.4 |
| 4 | 1.170 | 1.052 | 1.580 | 3 | 13.1 |
| 5 | 1.054 | 1.006 | 1.461 | 3 | 12.8 |
| 6 | 0.949 | 0.963 | 1.351 | 4 | 12.5 |
| 7 | 0.855 | 0.921 | 1.249 | 4 | 12.2 |
| 20 (tavan) | 0.220 | 0.520 | 0.450 | 6 | 9.0 |

### 1.3 Q Genişliği (`q-genisligi.js`)
Eksen: **kategorik** (Notch/Dar/Orta/Geniş/Çok Geniş etiketi) — Hz/dB/oktav ayrımı
**yok**. Zorluk ekseni `edgeMargin` — doğru Q'nun kendi etiketinin log2(Q)
sınırına ne kadar YAKIN üretildiği (küçük=sınıra yapışık=zor). Havuz boyutu
(=şık sayısı) 3'ten (Notch/Dar/Geniş çekirdek üçlüsü, HER ZAMAN) 5'e büyür.
Frekans, kademe `medium`ın temsilci noktasını (8) GEÇENE kadar 1 kHz'de SABİT
(izolasyon ilkesi) — bu yüzden Z1-Z5 hepsi izole, Z6-Z7'de artık spektrumun
tamamına yayılıyor (`isolate:false`). Gain HER ZAMAN ±6 dB (SABİT, kademeden
bağımsız). Doğru etiket havuzdan **rastgele** seçilir.
Tolerans: **yok** (kategorik — doğru/yanlış etiket kimliğine bakılır, sayısal
tolerans yok).

| Z | edgeMargin (log2 Q birimi) | havuz/şık sayısı | isolate (freq sabit mi) | süre (sn) |
|---|---|---|---|---|
| 1 | 0.550 | 3 | evet | 14.0 |
| 2 | 0.493 | 3 | evet | 13.6 |
| 3 | 0.443 | 3 | evet | 13.2 |
| 4 | 0.397 | 3 | evet | 12.8 |
| 5 | 0.356 | 3 | evet | 12.4 |
| 6 | 0.320 | 4 | **hayır** | 12.1 |
| 7 | 0.287 | 4 | hayır | 11.7 |
| 20 (tavan) | 0.070 | 5 | hayır | 8.0 |

### 1.4 Boost mu Cut mu (`boost-mu-cut-mu.js`)
Eksen: gain büyüklüğü (dB) + frekans çeldirici mesafesi (oktav) + gain çeldirici
mesafesi (dB). **3 KATMANLI** — katman SEANS SIRASINA bağlı (idx<3→Katman1
sadece yön/2 şık; idx<6→Katman2 miktar gizli/curve şık sayısı; idx≥6→Katman3
hepsi gizli). Katman 1 HER ZAMAN tam 2 şık (curve'den bağımsız). Doğru yön
rastgele, büyüklük kademeye bağlı.
Tolerans: **GAIN_TOLERANCE = 0.1 dB, FREQ_TOLERANCE_OCT = 0.3 oktav (İKİSİ DE SABİT)**.

| Z | gainDb | freq çeldirici (oktav) | gain çeldirici (dB) | K2/K3 şık sayısı | süre (sn) |
|---|---|---|---|---|---|
| 1 | 8.00 | 1.400 | 2.500 | 3 | 16.0 |
| 2 | 7.30 | 1.314 | 2.284 | 3 | 15.5 |
| 3 | 6.66 | 1.233 | 2.087 | 3 | 15.1 |
| 4 | 6.08 | 1.158 | 1.907 | 3 | 14.6 |
| 5 | 5.54 | 1.087 | 1.742 | 3 | 14.2 |
| 6 | 5.06 | 1.020 | 1.592 | 4 | 13.8 |
| 7 | 4.61 | 0.957 | 1.455 | 4 | 13.3 |
| 20 (tavan) | 1.40 | 0.420 | 0.450 | 6 | 9.0 |

### 1.5 dB Seviyesi (`db-seviyesi.js`)
Eksen: seviye değişiminin büyüklüğü (dB) + çeldirici mesafesi (dB). Yön (açıldı/
kısıldı) rastgele, ilk 3 soru (`DIRECTION_REVEAL_QUESTION_COUNT`) açık — SEANS
SIRASINA bağlı. Büyüklük kademeye bağlı.
Tolerans: **DB_TOLERANCE = 0.1 dB (SABİT)**.

| Z | dbDelta (büyüklük) | çeldirici min mesafe (dB) | şık sayısı | süre (sn) |
|---|---|---|---|---|
| 1 | 3.000 | 1.500 | 3 | 14.0 |
| 2 | 2.667 | 1.373 | 3 | 13.7 |
| 3 | 2.370 | 1.257 | 3 | 13.4 |
| 4 | 2.107 | 1.151 | 3 | 13.1 |
| 5 | 1.873 | 1.053 | 3 | 12.8 |
| 6 | 1.665 | 0.964 | 4 | 12.5 |
| 7 | 1.480 | 0.883 | 4 | 12.2 |
| 20 (tavan) | 0.320 | 0.280 | 6 | 9.0 |

### 1.6 Kompresör (`kompresor.js`) — Motor 2 (A/B/C, tek "farklı" bulma)
Eksen: `kGap` — [0,1] k-uzayında "farklı" olanın referanstan (k=0.5) uzaklığı,
bu da ratio (1.3–14:1) ve threshold (−8…−34 dB) İKİLİSİNE birlikte çevrilir →
tek bir `gainReductionDb` farkı. **Şık sayısı HER ZAMAN 3 (A/B/C), curve'den
BAĞIMSIZ — hiçbir kademede değişmez.** Hangi harfin (A/B/C) farklı olduğu
**tam rastgele**. Attack/release/knee kademeden bağımsız SABİT (3ms/150ms/6dB).
Tolerans: **yok** (harf kimliği tam eşleşmeli — sayısal tolerans kavramı yok).

| Z | kGap | ratio (farklı, max yönde) | threshold (dB) | GR farkı (referanstan, dB) |
|---|---|---|---|---|
| 1 | 0.450 | 13.37:1 | −32.7 | 11.66 |
| 2 | 0.404 | 12.78:1 | −31.5 | 10.47 |
| 3 | 0.363 | 12.26:1 | −30.4 | 9.40 |
| 4 | 0.326 | 11.79:1 | −29.5 | 8.44 |
| 5 | 0.292 | 11.36:1 | −28.6 | 7.57 |
| 6 | 0.262 | 10.98:1 | −27.8 | 6.80 |
| 7 | 0.236 | 10.64:1 | −27.1 | 6.10 |
| 20 (tavan) | 0.058 | 8.39:1 | −22.5 | 1.50 |

### 1.7 Reverb (`reverb.js`) — Motor 2
Eksen: `kGap` (Kompresör'ünkiyle AYNI k-uzayı) → decay/preDelay/size ÜÇÜNE
birlikte çevrilir (tip başına farklı aralık: Room/Hall/Plate). **Şık sayısı
HER ZAMAN 3, curve'den BAĞIMSIZ.** Z≥18'de (`TYPE_SWAP_POSITION_THRESHOLD`)
mekanik DEĞİŞİR: artık "aynı tipte miktar farkı" değil "TİP farkı" (Room/Hall/
Plate arası) soruluyor — bu Z1-Z7 aralığının TAMAMEN DIŞINDA. Hangi harfin
farklı olduğu rastgele, hangi tip taban olduğu rastgele.
Tolerans: **yok** (harf kimliği).

| Z | kGap | Hall decay (farklı, max yönde, sn) | taban Hall decay (sn) | fark % |
|---|---|---|---|---|
| 1 | 0.450 | 3.12 | 2.40 | %30.0 |
| 2 | 0.403 | 3.04 | 2.40 | %26.9 |
| 3 | 0.361 | 2.98 | 2.40 | %24.0 |
| 4 | 0.323 | 2.92 | 2.40 | %21.5 |
| 5 | 0.289 | 2.86 | 2.40 | %19.3 |
| 6 | 0.259 | 2.81 | 2.40 | %17.3 |
| 7 | 0.232 | 2.77 | 2.40 | %15.4 |
| 20 (tavan) | 0.055 | 2.49 | 2.40 | %3.7 |

### 1.8 Tonal Denge (`tonal-denge.js`)
Eksen: gizli EQ bozukluğunun büyüklüğü (`disturbDb`) — kaç/hangi bandın bozuk
olduğu **rastgele** (en az 1, en çok tümü). Bant SAYISI (4→5→6) kademeden değil
**SEANS SORU SIRASINDAN** gelir (`bandCountForSessionIndex`: soru 1-4→4 bant,
5-8→5 bant, 9+→6 bant). `options` alanı bu modda **semantik olarak anlamsız**
(kod kendi yorumunda böyle diyor — kaydırıcı var, şık yok).
Tolerans: **NEUTRAL_TOLERANCE_DB = 1.5 dB (SABİT, ortalama sapma üzerinden)** — §5'te bu sabitin `disturbDb` ile ilişkisi ayrıca ele alınıyor (kritik bulgu).

| Z | disturbDb (bozukluk büyüklüğü) | bant sayısı (soru sırasına göre, kademeden BAĞIMSIZ) | süre (sn) |
|---|---|---|---|
| 1 | 9.000 | 4/5/6 (soru sırası) | 26.0 |
| 2 | 7.973 | „ | 25.1 |
| 3 | 7.063 | „ | 24.2 |
| 4 | 6.257 | „ | 23.3 |
| 5 | 5.543 | „ | 22.5 |
| 6 | 4.910 | „ | 21.7 |
| 7 | 4.350 | „ | 20.9 |
| 16 | 1.461 | „ | — |
| 20 (tavan) | 0.900 | „ | 13.0 |

### 1.9 Distortion (`distortion.js`) — Motor 2
Eksen: `kGap` (Kompresör'le BİREBİR aynı k-uzayı/sayılar) → drive büyüklüğü,
ama drive'ın HANGİ EĞRİ AİLESİNDEN (clip/soft/tube/tape) geleceği **kademe
İSMİNE (tier string) sabit eşlenir** — `DISTORTION_TYPES[level]`, eğriden HİÇ
gelmiyor (`easy→clip, medium→soft, hard→tube, pro/proplus→tape`), dolayısıyla
Otomatik modda bile hangi türün çalınacağı o anki `level` string'ine (tier adı)
bağlı, sürekli değil — bkz. §2 "kademe geçişkenliği" bulgusu. **Şık sayısı HER
ZAMAN 3.** Hangi harf farklı, rastgele.
Tolerans: **yok** (harf kimliği).

| Z | kGap | tür (o anki tier'a göre) | drive (farklı, max yönde) | taban drive | fark |
|---|---|---|---|---|---|
| 1 | 0.450 | clip (easy) | 14.36 | 8.60 | 5.76 |
| 4 | 0.326 | clip (easy) | 12.77 | 8.60 | 4.17 |
| 7 | 0.236 | soft (medium, Z6-8 aralığında) | 6.18 | 4.55 | 1.63 |
| 20 (tavan) | 0.058 | tape (pro) | 0.56 | 0.51 | 0.05 |

> Not: yukarıdaki "tür" sütunu, o Z değerinin `tierForLevel()` ile hangi isme
> düştüğünü gösteriyor (bkz. §4) — Z7 aslında `medium` sınırında (Z5-8 =
> medium), bu yüzden orada `soft` gösterildi; tabloyu şişirmemek için sadece
> uç noktalar (Z1/Z4/Z7/Z20) verildi, tam Z1-Z7 dizisi §2'deki kGap tablosuyla
> (Kompresör/Distortion sütunları özdeş) birlikte okunmalı.

### 1.10 Frekans Çakışması (`frekans-cakismasi.js`)
Eksen: çakışma bölgesi genişliği (`regionWidthOct`, Aşama 1) + kesim şık aralığı
(`cutStepDb`, Aşama 3). **3 AŞAMALI** — aşama SEANS SIRASINA bağlı (idx<3→
Aşama1 sadece merkez frekans; idx<6→Aşama2 hangi kaynak baskın; idx≥6→Aşama3
+kesim büyüklüğü). Kesim büyüklüğünün KENDİSİ (`BASE_CUT_DB=6`, ±%15 jitter)
kademeden BAĞIMSIZ sabit taban — SADECE bölge genişliği ve şık aralığı
kademeye bağlı. **Şık sayısı bu modda `diff.options`'tan (STATİK tabloya
SABİT) gelir, curve'ün `options` alanı YOK** — bkz. §2 "şık sayısı süreksizliği"
bulgusu. Doğru merkez frekans bölge içinde rastgele.
Tolerans: **yok** (3 aşamanın hepsi önceden üretilmiş şıklardan TAM eşleşme
bekliyor — `Math.round(guess)===Math.round(true)` / `guessSource===correctSource`
/ `Math.abs(guessCutDb-correctCutDbNeg)<1e-6`).

| Z | regionWidthOct (Aşama1 zorluğu) | cutStepDb (Aşama3 çeldirici mesafesi) | şık sayısı (tier'a SABİT, curve YOK) | süre (sn) |
|---|---|---|---|---|
| 1 | 1.600 | 4.000 | 3 (easy) | 18.0 |
| 2 | 1.483 | 3.655 | 3 | 17.2 |
| 3 | 1.375 | 3.339 | 3 | 16.4 |
| 4 | 1.275 | 3.051 | 3 | 15.7 |
| 5 | 1.182 | 2.788 | 4 (medium) | 15.0 |
| 6 | 1.096 | 2.547 | 4 | 14.3 |
| 7 | 1.016 | 2.327 | 4 | 13.7 |
| 20 (tavan) | 0.380 | 0.720 | 6 (pro) | 7.5 |

---

## 2) KARŞILAŞTIRMALI ANALİZ

### 2.1 Z1→Z7 ve Z1→Z20 daralma yüzdeleri (birincil ayrım ekseni, gerçek koddan hesaplandı)

| Mod | Birincil eksen | Z1 | Z7 | Z20 | Z1→Z7 daralma | Z1→Z20 daralma |
|---|---|---|---|---|---|---|
| Frekans Bulma | distractor (oktav) | 1.200 | 0.921 | 0.520 | **%23.2** | %56.7 |
| Kesim Noktası | distractor (oktav) | 1.200 | 0.921 | 0.520 | **%23.2** | %56.7 |
| Boost mu Cut mu | freq distractor (oktav) | 1.400 | 0.957 | 0.420 | %31.6 | %70.0 |
| dB Seviyesi | distractor (dB) | 1.500 | 0.883 | 0.280 | **%41.1** | %81.3 |
| Frekans Çakışması | cutStepDb (dB) | 4.000 | 2.327 | 0.720 | %41.8 | %82.0 |
| Kompresör | kGap | 0.450 | 0.236 | 0.058 | %47.6 | %87.1 |
| Distortion | kGap | 0.450 | 0.236 | 0.058 | %47.6 | %87.1 |
| Q Genişliği | edgeMargin | 0.550 | 0.287 | 0.070 | %47.8 | %87.3 |
| Reverb | kGap | 0.450 | 0.232 | 0.055 | %48.5 | %87.8 |
| Tonal Denge | disturbDb | 9.000 | 4.350 | 0.900 | **%51.7** | **%90.0** |

**Sorulara doğrudan cevap:**

- **"Hangi modda Z1'den Z7'ye ayrım en çok daralıyor?"** Tonal Denge (%51.7),
  hemen ardından Reverb (%48.5) ve Q Genişliği (%47.8).
- **"En az daralan?"** Frekans Bulma ve Kesim Noktası — İKİSİ DE BİREBİR AYNI
  %23.2 (ikisi de `DISTRACTOR_STEP_OCT`/`STEP_OCT_AT_1/AT_CAP` için AYNI 1.2→0.52
  eğrisini kullanıyor, kod içinde birbirinden kopyalanmış).
- **"dB Seviyesi'nin Z1-Z7 aralığı diğerleriyle kıyaslandığında nerede
  duruyor?"** **ORTA SIRADA, en kolay UÇTA DEĞİL.** %41.1 daralma — 10 modun
  6.'sı (yani üstte 4, altta 5 mod var). Frekans Bulma/Kesim Noktası'ndan (%23)
  DAHA HIZLI daralıyor, Tonal Denge/Reverb/Q Genişliği/Kompresör/Distortion'dan
  (%47-52) DAHA YAVAŞ. **Bu metriğe göre dB Seviyesi'nin "belirgin kolay"
  olduğu iddiasını DOĞRULAYAN bir veri YOK** — narrowing-hızı açısından sıradan.
  §5'te dB Seviyesi için ayrı, farklı türde bir bulgu var (mutlak ölçek
  karşılaştırması, aşağıda).

### 2.2 Hangi modlar aynı kademede belirgin daha geniş (kolay) ayrım kullanıyor?

Doğrudan sayısal birim karşılaştırması (Hz/dB/oktav) SADECE aynı birimi
paylaşan modlar arasında anlamlı — üç grup:

- **Oktav bazlı gruç** (Frekans Bulma/Kesim Noktası/Boost-Cut'ın freq ekseni):
  Z1'de sırasıyla 1.200/1.200/1.400 oktav — Boost-Cut EN GENİŞ (en kolay)
  başlıyor. Z7'de 0.921/0.921/0.957 — sıralama KORUNUYOR, Boost-Cut hâlâ en geniş.
- **dB bazlı grup** (dB Seviyesi/Boost-Cut gain/Frekans Çakışması kesim):
  bunlar FARKLI büyüklük mertebelerinde (dB Seviyesi Z1=1.5dB, Boost-Cut gain
  Z1=2.5dB, Çakışma Z1=4.0dB) — doğrudan "kim daha kolay" demek YANILTICI
  olur çünkü HER modun kendi taban büyüklüğü (dbDelta/gainDb/BASE_CUT_DB) de
  farklı; sadece ADIM (step) büyüklüğü değil, TOPLAM sinyal büyüklüğü de
  değişken. Bu üçünü "kim daha kolay" diye tek bir sayıyla sıralamak bu
  rapor kapsamında YAPILMADI (veri yok/karşılaştırılabilir değil — uydurma
  riski).
- **kGap grubu** (Kompresör/Reverb/Distortion): Z1'de HEPSİ 0.450 (Distortion/
  Kompresör'den DOĞRUDAN kopyalandı, Reverb ayrı ama aynı sayı) — bu üçü
  START noktasında EŞİT. Z7'de Kompresör/Distortion 0.236, Reverb 0.232 —
  neredeyse eşit kalıyor (fark <%2).

### 2.3 Z7 (bir sonraki kademenin en kolay noktası) vs Z8 (medium'un en zoru civarı) — kademe iç içe geçmesi

TIER_BOUNDARIES: easy≤4, medium≤8, hard≤12, pro≤20 (bkz. §4). Bu, Z7'nin HÂLÂ
"medium" kademesi İÇİNDE olduğu, Z8'in "medium"un ÜST SINIRI olduğu anlamına
gelir — yani Z7→Z8 geçişi bir "kademe sıçraması" DEĞİL, aynı kademe içinde
devam eden sürekli bir eğri. **Kademeler arasında ASIL sıçrama şurada olur:**
Z4→Z5 (easy biter, medium başlar) ve Z8→Z9 (medium biter, hard başlar) ve
Z12→Z13 (hard biter, pro başlar). Ama eğrinin KENDİSİ bu sınırlarda
SÜREKLİ/PÜRÜZSÜZ (logLerp her `position` için aynı formülü uyguluyor,
tier sınırında bir "atlama" yok) — **10 moddan 8'i için** "Z7, bir sonraki
kademenin en kolayından zor mu" sorusu ANLAMSIZ, çünkü ayrık kademe geçişi
yok, sürekli eğri var.

**İSTİSNA — gerçek süreksizlik/iç-içe-geçme olan 2 mod:**
- **Reverb**: Z1-17 arası "miktar farkı" mekaniği çalışıyor, Z18'den itibaren
  (`TYPE_SWAP_POSITION_THRESHOLD=18`) TAMAMEN FARKLI bir mekaniğe ("TİP farkı",
  Room/Hall/Plate) atlıyor — bu GERÇEK bir kademe sıçraması, ama Z1-Z7
  aralığının çok dışında (Z18-20 arası, "pro" kademesinin İÇİNDE).
- **Distortion**: hangi WaveShaper eğri ailesinin (clip/soft/tube/tape)
  çalınacağı tier ADINA sabit eşleniyor (§1.9) — bu da SÜREKLİ değil, DÖRT
  AYRI BASAMAK (tier sınırlarında atlıyor: Z4→Z5'te clip→soft, Z8→Z9'da
  soft→tube, Z12→Z13'te tube→tape). Bu, "kademeler iç içe geçiyor mu" sorusuna
  Distortion özelinde EVET/HAYIR ikisi de değil — kGap (miktar) sürekli,
  TÜR (nitelik) sıçramalı, ikisi ÜST ÜSTE biniyor.
- **Frekans Çakışması**: şık sayısı da (§1.10) tier adına sabit (curve
  alanı yok) — bu da SÜREKLİ değil, 4 basamaklı (3/3/3/3→4/4/4→5/5/5/5→6...,
  tam sınırlar §4'teki TIER_BOUNDARIES'le birebir).

---

## 3) SEANS RAMPASI

### 3.1 Kullanıcının bahsettiği "3 kolay/3 orta/3 zor/1 pro" — BULUNDU ama KULLANILMIYOR

`www/js/core/session-plan.js` dosyası TAM OLARAK bu mekanizmayı içeriyor:

```js
export const SESSION_RAMP_WEIGHTS = { easy: 0.3, medium: 0.3, hard: 0.3, pro: 0.1 };
export function buildSessionPlan(totalQuestions, weights = SESSION_RAMP_WEIGHTS) { ... }
export function pickWeightedDifficulty(weights = SESSION_RAMP_WEIGHTS, rng = Math.random) { ... }
```

10 soru için `apportion()` (en büyük kalan yöntemi) 3/3/3/1 üretir; ilk soru
her zaman en kolay mevcut kademeden, kalan 9 soru karıştırılır (`shuffle`).
Sonsuz/serbest modda `pickWeightedDifficulty` her soruda BAĞIMSIZ ağırlıklı
seçim yapar.

**AMA:** `grep -rln "session-plan"` bu dosyayı `app.js`'te veya HERHANGİ bir
mod dosyasında **HİÇ IMPORT EDEN kod bulamadı** — tek referans
`test/session-plan.test.mjs` (izole test) ve `kesim-noktasi.js`'teki bir
YORUM SATIRI ("...session-plan.js'teki buildSessionPlan/pickWeightedDifficulty
ile AYNI 'seans içi rampa' felsefesini paylaşır... ama o dosyadan bir şey
İTHAL ETMİYORUZ"). **Bu dosya kodda YAZILMIŞ ama HİÇBİR YERDE ÇALIŞTIRILMIYOR
— ölü kod.** Kullanıcının "3 kolay/3 orta/3 zor/1 pro" beklentisi bu dosyaya
karşılık geliyor ama gerçek oyun bunu hiç görmüyor.

### 3.2 GERÇEKTE çalışan mekanizma: `sessionRampOffset` (sürekli, 5 döngülü)

`app.js:currentDifficultyPosition(boss)` (satır 971-981) — TÜM 10 mod bunu
kullanıyor (`createQuestion`'a `settings.difficultyPosition` olarak geçiyor):

```
zorlukKonumu = taban + sessionRampOffset(roundsInThisPlaySession, {boss})
```

- **taban**: "Otomatik" modda kullanıcının GERÇEK kesirli seviyesi
  (`continuousLevel(xpProgress(modeXp))`, sınav varsa `examCappedLevel` ile
  sınırlı); "Sabit" modda seçili tier'ın temsilci noktası
  (`representativeLevelForTier`, örn. "hard"→12).
- **sessionRampOffset** (`difficulty-curve.js:141-148`) — `SESSION_RAMP_CONFIG`:
  `CYCLE_LENGTH=5, MIN_OFFSET=-1.5, MAX_OFFSET=1.0, BOSS_OFFSET=2.0`.
  Boss'ta HER ZAMAN +2.0 (döngüdeki konumdan bağımsız). Boss DEĞİLSE,
  `roundsInThisPlaySession % 5` konumuna göre −1.5'ten +1.0'a DOĞRUSAL:

  | seans-içi index (mod 5) | 0 | 1 | 2 | 3 | 4 |
  |---|---|---|---|---|---|
  | ofset | −1.500 | −0.875 | −0.250 | +0.375 | +1.000 |

  Bu, gerçek koddan (`sessionRampOffset(i,{boss:false})`) hesaplandı.

**Bu mekanizma, kullanıcının bahsettiği mekanizmadan 3 açıdan FARKLI:**
1. **Ayrık tier sayacı DEĞİL, sürekli sayısal ofset** — "3 soru kolay" yok,
   her soru AYNI taban seviyesinin etrafında ±1.5..+1.0 salınıyor.
2. **Döngü uzunluğu 5, 10 DEĞİL** — "10 Soruluk Bölüm" ile hizalı değil, aynı
   bölüm içinde 2 tam döngü olur.
   `**Bu Bölüm/Serbest oyun farkını GÖZETMİYOR** — hem 10 Soruluk Bölüm hem
   Serbest modda AYNI `roundsInThisPlaySession` sayacı kullanılıyor.
3. **"1 pro" diye ayrı bir kademe YOK** — pro'ya sadece taban seviye zaten
   yüksekse (kullanıcı gerçekten ilerlemişse) ya da döngü sonu/boss ofseti
   tabanı yeterince yukarı itmişse ulaşılır; sabit bir "10 soruda 1 tanesi
   pro" garantisi kodda YOK.

### 3.3 Her modda aynı mı?

**EVET, tamamen aynı** — `currentDifficultyPosition()` mod-agnostik, TEK bir
yerde (app.js) hesaplanıp `createQuestion`'a geçiyor; hiçbir mod dosyası kendi
seans rampasını YENİDEN hesaplamıyor. (İstisna: proplus — bu eğrinin tamamen
dışında, `currentDifficultyPosition` proplus için `undefined` döner, o zaman
her mod kendi statik `DIFFICULTY.proplus` satırına düşer.)

### 3.4 Boss sorusunun rampadaki yeri ve zorluğu

- **Belirlenme**: `mode.isBossRound(stats.rounds)` (frekans-bulma.js:310-312,
  TÜM modlar tarafından re-export edilip kullanılıyor) — `(stats.rounds+1) % 5
  === 0` — yani **HER MODUN KENDİ YAŞAM-BOYU tur sayacında 5. turda bir** boss
  gelir (%20). `stats.rounds` KALICI (localStorage), `roundsInThisPlaySession`
  (rampanın kullandığı) İSE her "Oyunu Başlat"ta sıfırlanan AYRI bir sayaç —
  kod bu ikisinin "HER ZAMAN hizalı olmayabileceğini" kendi yorumunda açıkça
  belirtiyor.
- **Sınavda boss YOK**: `boss = examActive ? false : mode.isBossRound(...)`.
- **Zorluk**: boss'ta `sessionRampOffset` HER ZAMAN +2.0 — bu, döngünün EN ZOR
  noktasından (+1.0) bile daha yüksek. `currentDifficultyPosition` içinde
  `Math.min(safePos, LEVEL_CAP)` ile 20'de kırpıldığı için, taban zaten
  20'ye yakınsa +2.0'ın pratik etkisi SIFIRA yakın olabilir (tavan etkisi).
- **Statik yol (curve YOKSA) istisnası**: Frekans Bulma'da boss AYRICA statik
  yolda `gain*0.75, q*1.35` çarpanı alıyor (curve aktifken bu ÇARPILMIYOR —
  çifte ceza olmasın diye, kod yorumu açık) — dB Seviyesi'nin statik yolunda
  da `dbDelta*0.6` benzeri bir çarpan var. **Curve (Otomatik) aktifken HİÇBİR
  modda ek boss çarpanı YOK — sadece +2.0 ofset.**

---

## 4) SEVİYE-ZORLUK BAĞI

- **Ham veri**: kullanıcının bu MODDAKİ XP'si → `progress.xpProgress()` →
  `{level, current, required}` (tam sayı seviye + o seviye içindeki kesirli
  ilerleme).
- **Sürekliye çevirme**: `continuousLevel(xpProg)` = `level + current/required`
  — YUVARLAMA YOK, kesirli (örn. seviye 6'nın %40'ı → 6.4).
- **Sınav tavanı**: `examCappedLevel(continuousRawLevel, examLevel)` —
  `Math.min(...)`. Sınavı geçemeyen kullanıcıda `examLevel` sabit kaldığı için
  ham XP artmaya devam etse bile zorluk parametreleri DONAR (bu, G49'da
  düzeltilen bir geçmiş hatanın kod-içi belgesi — "seviye N donuyor ama
  gainDb/Q artmaya devam ediyordu" hatası).
- **Kademe ADI (sadece gösterim)**: `tierForLevel(level)` — gerçek koddan
  doğrulandı:

  | seviye | 1-4 | 5-8 | 9-12 | 13-20 | 21+ |
  |---|---|---|---|---|---|
  | kademe adı | easy | medium | hard | pro | pro (aynı ad, ama `capped=true`) |

- **Seviye 20'den (LEVEL_CAP) SONRA**: kademe adı "pro"da SABİT kalır ama
  parametreler DAHA DA ZORLAŞMAYA devam eder — `applyPostCapFloor` her ekstra
  seviyede `REDUCTION_PER_STEP` kadar (moda göre 0.001-0.03 arası) küçülmeye
  devam eder, `FLOOR` sabitine çarpana kadar. Bu, "20 SONRASI bağlam zorluğu"
  diye adlandırılan AYRI bir mekanizma (Q hariç — Q için `applyPostCapFloor`
  ÇAĞRILMIYOR, tavandan sonra Q SABİT kalıyor, sadece Frekans Bulma'da).
- **"Hangi kademeler devreye giriyor" — ÖNEMLİ NÜANS**: kademe ADI sadece bir
  ETİKET/gösterim; parametrelerin KENDİSİ tier sınırlarında SIÇRAMIYOR, `t =
  (position-1)/(LEVEL_CAP-1)` ile SÜREKLİ hesaplanıyor. Yani "medium'a
  girince" aniden yeni bir davranış AÇILMIYOR — TEK İSTİSNALAR: (a) Distortion'ın
  distortion TÜRÜ (§1.9, §2.3), (b) Frekans Çakışması'nın şık sayısı (§1.10,
  §2.3), (c) Q Genişliği'nin `isolate` bayrağı (medium'un temsilci noktasını
  [8] GEÇİNCE frekans serbest kalıyor — bu da ADIM fonksiyonu, sürekli değil),
  (d) Frekans Bulma'nın boost-only kuralı (easy/medium'da SADECE boost) — TÜM
  DÖRDÜ tier ADINA (isim/kategori) bağlı kalitatif kurallar, sürekli eğriden
  AYRI.
- **"Sabit" moddaki fark**: kullanıcı elle bir tier seçerse, GERÇEK
  seviyesinden BAĞIMSIZ olarak o tier'ın TEMSİLCİ noktası (`representativeLevelForTier`)
  kullanılır — düşük seviyeli bir kullanıcı "Pro" seçerse GERÇEKTEN 20.
  seviyenin zorluğunu alır (deneyimsiz olsa bile), yüksek seviyeli biri
  "Kolay" seçerse GERÇEKTEN 4. seviyenin (kolay) zorluğunu alır — bu mod
  KULLANICI KONTROLÜNDE, XP'den TAMAMEN bağımsız.

---

## 5) TESPİT (veri, öneri değil)

1. **Tonal Denge, en zor kademelerinde (Z16-Z20, yani "pro" kademesinin üst
   yarısı) matematiksel olarak KAYBEDİLEMEZ hale geliyor.** `disturbDb`
   eğrisi Z16'da (0.9-1.46 dB) `NEUTRAL_TOLERANCE_DB` (1.5 dB, SABİT) sabitinin
   ALTINA/eşit düşüyor. Gerçek kodla (`bandsForQuestion`+`evaluateAnswer`,
   2000 rastgele deneme, hiçbir kaydırıcıya DOKUNMADAN) doğrulandı: L=20'de
   görülen en yüksek ortalama sapma **0.958 dB**, tolerans **1.5 dB** —
   yani kullanıcı hiçbir şey yapmasa bile "doğru" sayılıyor. Bu, dosyadaki
   HİÇBİR yorum satırında fark edilmiş/tartışılmış değil (diğer modların
   STEP>TOLERANCE invaryantı yorumlarının aksine, burada disturbDb'nin
   NEUTRAL_TOLERANCE_DB'nin altına inip inmediği hiç kontrol edilmemiş).
2. **`session-plan.js` (kullanıcının "3 kolay/3 orta/3 zor/1 pro" beklentisinin
   karşılığı) yazılmış ama HİÇ ÇALIŞTIRILMIYOR** — gerçek seans rampası
   TAMAMEN FARKLI bir mekanizma (§3.2). Bu, "seans rampası çalışmıyor" hissi
   veren bir kullanıcı raporu gelirse kaynağının BU İKİ SİSTEMİN KARIŞMASI
   olabileceğini gösteren somut bir veri.
3. **dB Seviyesi'nin Z1→Z7/Z1→Z20 daralma HIZI diğer 9 modun ORTASINDA** (§2.1)
   — "belirgin kolay" algısını bu metrik TEK BAŞINA açıklamıyor. Kullanıcının
   gözlemi muhtemelen BAŞKA bir kaynaktan geliyor olabilir (ör. mutlak dB
   farkının kulakla algısı, ya da aşağıdaki madde 4) — bu rapor kapsamında
   ek bir ölçüm/duyma testi YAPILMADI, bu yüzden kesin bir kök sebep
   İDDİA EDİLMİYOR.
4. **Frekans Bulma ve Kesim Noktası, 10 modun EN AZ daralanı (%23.2, Z1→Z7)**
   — DISTRACTOR_STEP_OCT eğrisi (1.2→0.52) birebir aynı sayılarla iki dosyada
   ayrı ayrı tanımlı. Bu ikisi, kullanıcının "dB Seviyesi kolay" algısının
   karşılaştırma NOKTASI olan modlar olabilir (en görünür/en çok oynanan iki
   mod) — ama bu bir YORUM, veri bunu doğrudan KANITLAMIYOR.
5. **Motor 2 modları (Kompresör/Reverb/Distortion) şık sayısı HİÇBİR kademede
   değişmiyor (hep 3)** — zorluk SADECE k-uzayındaki mesafeyle geliyor, diğer
   7 modun "kademe arttıkça daha fazla çeldirici" deseninden YAPISAL olarak
   farklı.
6. **Frekans Çakışması'nın şık sayısı curve aktifken bile STATİK tablodan
   (`diff.options`) geliyor** — 10 modun 6'sında (Frekans Bulma/Kesim Noktası/
   Q Genişliği/Boost-Cut/dB Seviyesi/+curve.options döndüren) şık sayısı
   SÜREKLİ `logLerp`'ten gelirken, bu modda 4 ayrı basamakta sıçrıyor
   (tier sınırlarında).
7. **Distortion'ın "tür" ekseni (clip/soft/tube/tube) sürekli DEĞİL, 4
   basamaklı** — aynı modun kGap ekseni sürekli olduğu için, Z7'de "orta
   şiddette ama hâlâ clip" gibi bir ara durum YOK, tam tier sınırında
   (Z4→Z5) türün KENDİSİ aniden değişiyor.
8. **10 modun 5'i tolerans-kavramı taşımıyor** (Kompresör/Reverb/Distortion/
   Frekans Çakışması/Q Genişliği — hepsi kategorik kimlik eşleşmesi), diğer
   5'i (Frekans Bulma/Kesim Noktası/Boost-Cut/dB Seviyesi/Tonal Denge) SABİT
   sayısal tolerans taşıyor — bu iki grup ARASINDA "ne kadar zor" karşılaştırması
   FARKLI bir doğrulama yöntemi gerektiriyor (§2.2'de bu yüzden kısıtlı
   karşılaştırma yapıldı).

---

## DOĞRULAMA

- **Mod sayısı**: 10/10 okundu (Frekans Bulma, Kesim Noktası, Q Genişliği,
  Boost mu Cut mu, dB Seviyesi, Kompresör, Reverb, Tonal Denge, Distortion,
  Frekans Çakışması).
- **Kademe sayısı**: her mod için Z1-Z7 (7 kademe) + Z20 (tavan referansı) =
  8 sayısal nokta × 10 mod = **80 satır** birincil eksen verisi, gerçek
  `paramsForDifficultyPosition()` çağrılarından üretildi.
- **Parametre sayısı**: toplam **9 farklı parametre türü** rapor edildi
  (gainDb, Q, marginOct, edgeMargin, freqStepOct, gainStepDb, dbDelta/step,
  kGap→ratio/threshold/GR, decay, drive, disturbDb, regionWidthOct, cutStepDb
  — moda göre değişen alt kümeler; her mod kendi ilgili alanlarıyla sınırlı
  tutuldu, ilgisiz parametre hücrelerine "yok" yazıldı).
- **"yok" yazılan yerler**: Q Genişliği (Hz/dB min ayrım, tolerans), Kompresör/
  Reverb/Distortion (tolerans), Frekans Çakışması (tolerans), Tonal Denge
  (şık sayısı kavramı — kaydırıcı var).
- **`npm test`**: **1043/1043 geçti** (bu tur kod değiştirmedi, `git status`
  turun başında ve sonunda temizdi).

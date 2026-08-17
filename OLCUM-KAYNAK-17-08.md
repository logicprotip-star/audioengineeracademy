# OLCUM-KAYNAK-17-08

Kaynak kataloğu güncellemesi — G270 (`www/js/core/source-catalog.js`,
`www/js/modes/pan-konumu.js`/`reverb.js`/`tonal-denge.js`, `www/index.html`,
testler) için ölçüm kaydı. `www/audio/`'a iki yeni/değişmiş dosya kondu:
`arpeggio_guitar.m4a` (YENİ) ve `vocal.m4a` (İÇERİK değişti, aynı id/yol).

## A) Dosya özellikleri — ffprobe/ffmpeg volumedetect ile ölçüldü

| Dosya | Süre (ölçülen) | Kanal | Peak | Mean | 78 BPM grid |
|---|---|---|---|---|---|
| arpeggio_guitar.m4a | 24.615011s | mono | -6.0dBFS | -26.8dB | 8 bar = 32 beat × 60/78 = **24.6154s** ✓ tam eşleşiyor |
| vocal.m4a (YENİ) | 6.153991s | mono | -6.0dBFS | -24.4dB | 2 bar = 8 beat × 60/78 = **6.1538s** ✓ tam eşleşiyor |

Task "24.64sn"/"6.18sn" demişti — GERÇEK ölçüm (ffprobe) 24.615/6.154sn,
küçük yuvarlama farkı, ÖNEMSİZ. **24.615/6.154 = 4.0000** — vocal.m4a
gitar/davul kaynaklarının (8 bar) içinde TAM 4 kez tekrarlıyor, senkron
BOZULMUYOR (doğrulandı).

## B) Yeni kaynak: arpeggio_guitar — spektral tepe (Welch, 4096-nokta FFT, ~10.8Hz çözünürlük — OLCUM-KAYNAK-16-08.md ile AYNI yöntem)

**Ölçülen tepe: 194 Hz — acoustic_guitar.m4a ile BİREBİR AYNI** (aynı
enstrüman/akort, arpej deseninde çalınmış). `source-catalog.js`'teki desc
alanı bunu yansıtıyor.

## C) Madde 1 — arpeggio_guitar'ın kısıtlı modlara (Pan/Reverb/Tonal Denge) dahil edilmesi

| Mod | Karar | Gerekçe |
|---|---|---|
| Pan Konumu | **EKLENDİ** | Kendi kısıtlaması "sürekli/uzayan ses, tek-vuruş DEĞİL" (G43) — arpej gitar SÜREKLİ bir müzikal doku (24.6sn boyunca ~37 nota onset'i, snare/kick gibi TEK vuruş değil), "guitar" (acoustic) ile AYNI gerekçeyi karşılıyor. |
| Reverb | **EKLENDİ** | Kendi kısıtlaması "gerçek mixte reverb VERİLEN kaynaklar" (G43) — gitar/arpej doku klasik reverb-dostu bir doku, "guitar" ile AYNI kategori. |
| Tonal Denge | **EKLENMEDİ** | Kendi kısıtlaması "SADECE dolu spektrum (groove/upload)" (G44) — arpeggio_guitar TEK ENSTRÜMAN, tıpkı guitar/clean_guitar/vocal/bass/snare gibi zaten bu listede YOK. Eklemek G44'ün kendi tutarlılığını bozardı. |

## D) Madde 2 — vocal.m4a değişikliği, kod etkisi

`grep -rn "5\.67\|vocalDuration"` — kod tabanında vocal.m4a'nın süresine
dair HİÇBİR hardcoded referans bulunamadı (`audio-engine.js` her zaman
`buffer.duration`'ı çalışma-zamanında okuyor). **Kod değişikliği
GEREKMEDİ, doğrulandı.**

## E) Madde 3 — clean_guitar eksik listeler

`grep` ile doğrulandı: `pan-konumu.js` ve `reverb.js`'in `only` listeleri
clean_guitar'ı (G259'da source-catalog.js'e eklenmişti) HİÇ İÇERMİYORDU —
eksik/unutulmuş liste girdisi, davranış değişikliği DEĞİL. **İkisine de
eklendi.** Tonal Denge kontrol edildi — G44'ün "tek enstrüman" kısıtı
clean_guitar'ı da (guitar gibi) haklı olarak dışarıda bırakıyor,
**BİLEREK değiştirilmedi** (madde C ile AYNI gerekçe).

## F) Madde 4 — SOURCE_PAIRS yeniden ölçümü

**Yöntem (3 deneme sonrası netleşti — dürüstlük notu):** Welch/4096-FFT
periodogramı, her kaynağın KENDİ tepesine göre -15dB üstü "anlamlı enerji"
noktaları. İlk deneme (SIKI süreklilik, peak'ten dışa doğru İLK eşik-altı
noktada dur) gerçek enstrüman/vokal spektrumlarının ÇOK-loblu doğasını
(harmonikler/formantlar arası YAKIN ama eşiğin altına inen çukurlar)
yanlış dışlıyordu. İkinci deneme (süreklilik-siz, eşiği aşan HER nokta)
çok UZAK/izole kırıntıları da içine alıp bandı anlamsızca genişletiyordu.
**Nihai yöntem: 60Hz boşluk-toleranslı** — peak'i İÇEREN kümeye 60Hz'den
yakın noktalar dahil edilir, daha uzak izole noktalar dışarıda kalır.
Peak'in KENDİSİ HAM (düzeltilmemiş) spektrumdan bulunuyor — bass/guitar/
clean_guitar için sırasıyla **97/194/291 Hz** ölçüldü, source-catalog.js'in
DOKÜMANTE değerleriyle **BİREBİR eşleşti** (yöntem doğrulaması).

### F.1 — snare-arpej-gitar (snare-gitar'ın yerine)

**Zamansal örtüşme (asıl fark burada) — onset dedeksiyonu (enerji-türevi
tepe noktaları, min 150ms aralık) + en-yakın-onset mesafesi:**

| Çift | Ortalama en-yakın mesafe | Medyan | 150ms içinde |
|---|---|---|---|
| snare + acoustic_guitar (ESKİ) | 231ms | 200ms | **1/16** snare vuruşu |
| snare + arpeggio_guitar (YENİ) | 104ms | 100ms | **16/16** snare vuruşu |

Snare'in 16 vuruşu TAMAMEN düzenli (78 BPM grid'inde beat 2/4/6/8/…/32 —
klasik backbeat). acoustic_guitar'ın 39 onset'i bu vuruşlardan ORTALAMA
231ms uzakta (task'ın "sırayla çalıyorlardı" tarifiyle UYUMLU) —
arpeggio_guitar'ın 37 onset'i İSE HER snare vuruşundan ~100ms uzakta,
TUTARLI bir örüntüyle (nota, vuruştan hemen ÖNCE/beraber giriyor, kuyruğu
vuruşla ÇAKIŞIYOR) — bu, GERÇEK bir üst-üste-binme.

**Spektral örtüşme:** [172, 398]Hz — **acoustic_guitar ile PRATİKTE AYNI**
([172, 398]Hz de) çünkü İKİ gitar da AYNI enstrüman/akort/tepe (194Hz).
**Task'ın "eski çiftte spektral örtüşme sadece 11Hz" iddiası bu ölçümle
DOĞRULANAMADI** — üç farklı bant-algılama yöntemi denendi, hiçbiri
snare-acoustic_guitar için 11Hz gibi dar bir sonuç ÜRETMEDİ (en dar
sonuç bile [172,301]Hz, ~130Hz genişlik). **BELİRSİZ** — task'ın hangi
yöntemle "11Hz" ölçtüğü bilinmiyor, MEVCUT ölçüm bunu doğrulayamadı.
Kararı ETKİLEMEDİ — zamansal fark ZATEN TEK BAŞINA çiftin değişimini
haklı çıkaracak kadar GÜÇLÜ ve NET ölçüldü.

**Yeni region: [170, 400]** (ölçülen [172,398]'in yuvarlanmışı — ESKİ
snare-gitar'ın region'ıyla SAYISAL olarak AYNI, çünkü spektral profil
gerçekten değişmedi, sadece ZAMANSAL örtüşme düzeldi).

**id/label değişikliği:** `snare-gitar` → `snare-arpej-gitar`,
`labelB: "Gitar"` → `"Arpej Gitar"`, `sourceB: "guitar"` → `"arpeggio_guitar"`.
`www/index.html`'deki `#cakismaPairSelect`'in HARDCODED `<option>`'ı
(dinamik ÜRETİLMİYOR, `SOURCE_GROUPS`'un aksine) BULUNUP güncellendi —
GÜNCELLENMESEYDİ seçim sessizce `SOURCE_PAIRS[0]` (kick-bas) fallback'ine
düşerdi (`findSourcePair`'ın kendi güvenli-varsayılan davranışı) — canlı
tarayıcıda DOĞRULANDI (bkz. madde H).

### F.2 — vokal-gitar (YENİ vocal.m4a ile yeniden ölçüm)

Vocal.m4a ÇOK-formantlı (tek bir global tepe DEĞİL, 226-506Hz ve
980-1184Hz aralıklarında AYRI AYRI anlamlı loblar) — "her kaynağın KENDİ
tepesi civarındaki tek lob" yöntemi (F'nin YÖNTEM notundaki gap-toleranslı
algoritma) vocal-guitar KESİŞİMİNİ bulamadı (`null` döndü, vocal'in
GLOBAL tepesi 1087Hz'de, guitar'ın bandı 398Hz'de bitiyor). **Bunun
yerine DOĞRUDAN kesişim** kullanıldı: her frekans bin'inde İKİ kaynağın
da (KENDİ tepesine göre) -15dB üstü olduğu ORTAK küme (60Hz toleranslı)
bulundu — bu, "ikisinin GERÇEKTEN aynı anda güçlü olduğu" bölgeyi
doğrudan yakalıyor.

**Ölçülen: [215, 366]Hz** (vocal'in DÜŞÜK formant bölgesiyle
acoustic_guitar'ın bandının kesişimi). Task'ın "219-1113Hz" iddiası
muhtemelen vocal'in KENDİ genel anlamlı aralığını (düşük formanttan
tepesine kadar) tarif ediyor, spesifik bir ÇİFT kesişimi DEĞİL — İKİSİ
FARKLI ölçümler, BENİM ölçtüğüm (gerçek İKİLİ kesişim) SOURCE_PAIRS'in
region alanının anlamına (createQuestion'ın merkez seçtiği aralık,
İKİ kaynağın da GERÇEKTEN duyulabilir olduğu yer) daha UYGUN.

**Yeni region: [220, 360]** (ölçülen [215,366]'nın İÇE yuvarlanmışı —
kasıtlı temkinli, ölçülenden GENİŞ değil DAR).

Ayrıca vocal+clean_guitar da ölçüldü (bilgi amaçlı, YENİ bir çift
EKLENMEDİ — task'ın açıkça istemediği bir ürün kararı, tek başıma
eklemedim): [441,743]Hz — acoustic_guitar'dan TAMAMEN FARKLI bir bölge
(clean_guitar'ın kendi tepesi 291Hz'de ama bandı daha YÜKSEĞE, 786Hz'e
kadar uzanıyor). Kullanıcı isterse ayrı bir çift olarak eklenebilir,
bu turun kapsamı DIŞINDA bırakıldı.

### F.3 — vokal-bas KURULMADI (task'ın kendi kararı, doğrulandı)

**Ölçülen: [215, 280]Hz, 65Hz genişlik** — task'ın "59Hz, öğretim değeri
yok" iddiasıyla AYNI BÜYÜKLÜK MERTEBESİNDE (küçük fark, yöntem farkından
kaynaklanıyor olabilir) — **SONUÇ AYNI: dar/zayıf bir çakışma, çift
KURULMADI.**

### F.4 — kick-bas: DOKUNULMADI (task'ın kendi kısıtı)

## G) Madde 5 — kontrol listesi

- **12 modda kaynak seçici doğru listeyi gösteriyor mu:** TÜMÜ kontrol
  edildi (`grep` ile `uyumluKaynaklar`/`compatibleSourceIds` çağrıları).
  7 mod (Frekans Bulma/Kesim Noktası/Q Genişliği/Boost-Cut/dB Seviyesi/
  Kompresör/Distortion) kısıtlamasız — arpeggio_guitar OTOMATİK dahil,
  testle doğrulandı. Pan/Reverb elle güncellendi. Tonal Denge/Stereo
  Genişlik BİLEREK değiştirilmedi (gerekçeler yukarıda). Frekans
  Çakışması çift-tabanlı, SOURCE_PAIRS güncellendi.
- **Yeni kaynaklar tüm modlarda çalıyor mu:** CANLI tarayıcıda doğrulandı
  (gerçek fare tıklaması) — Frekans Çakışması'nda "Snare + Arpej Gitar"
  çifti seçilip 2 tur (170Hz/387Hz/286Hz kesim noktaları, region İÇİNDE)
  oynandı, konsol hatası YOK. Pan Konumu'nda "Arpej Gitar" kaynağıyla
  round başlatılıp Oynat'a basıldı, konsol hatası YOK. `e2e/reverb-peak.spec.mjs`
  (YENİ vocal.m4a kullanıyor) 38/38 e2e koşusunda YEŞİL kaldı.
- **Stereo dosyalar hâlâ sadece Stereo Genişlik'te mi:** EVET —
  `acoustic_guitar_stereo`/`clean_guitar_stereo` DOKUNULMADI, yeni testle
  (arpeggio_guitar Stereo Genişlik'te YOK) doğrulandı.
- **Silinen bass_alt'a referans kalmadı mı:** `grep -rn "bass_alt"` —
  SADECE tarihsel yorumlar ("bass_alt kaldırıldı" açıklamaları) kaldı,
  fonksiyonel bir referans YOK.
- **Testler güncellendi:** 8 mevcut test (source-catalog.test.mjs ×4,
  reverb.test.mjs ×1, frekans-cakismasi.test.mjs ×4 — ID/region
  değişiklikleri) + 8 yeni test (arpeggio_guitar'ın source-catalog.js'teki
  yapısı + 7 moddaki doğru dahil/hariç durumu, pan-konumu.test.mjs'e 2
  assertion). `npm test` 1403→**1411/1411**, `npm run test:e2e`
  **38/38** (DEĞİŞMEDİ, yeni e2e test EKLENMEDİ — mevcut testler yeni
  içerikle/kaynaklarla YEŞİL kaldığı için gerek görülmedi).

## H) Dürüstlük notu — index.html'de bulunan GERÇEK bug

`www/index.html`'in `#cakismaPairSelect`'i (Frekans Çakışması'nın kaynak-
çifti seçici sheet'i) `SOURCE_PAIRS`'ten DİNAMİK üretilmiyor —
`<option>`'lar HTML'de ELLE yazılı. `snare-gitar` id'sini
`snare-arpej-gitar`'a yeniden adlandırırken bu HTML GÜNCELLENMESEYDİ,
kullanıcı arayüzde "Snare + Gitar" seçeneğini görmeye devam eder ama
`findSourcePair("snare-gitar")` artık HİÇBİR ŞEY bulamayıp SESSİZCE
`SOURCE_PAIRS[0]` (kick-bas) döner — kullanıcı "Snare + Gitar" seçtiğini
SANIRKEN aslında Kick+Bas sorularıyla karşılaşırdı, HİÇBİR hata/uyarı
OLMADAN. Bu BULUNUP DÜZELTİLDİ (canlı tarayıcıda doğrulandı — seçici artık
doğru "Snare + Arpej Gitar" gösteriyor, round doğru pair ile başlıyor).

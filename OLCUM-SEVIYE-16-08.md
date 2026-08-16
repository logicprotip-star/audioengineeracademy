# OLCUM-SEVIYE-16-08 — Kaynak Kütüphanesi -3→-6dBFS Yeniden Üretimi Doğrulaması

_G259'un (OLCUM-KAYNAK-16-08.md) "BEKLEYEN KARAR" maddesine cevaben:
Logic 10 kaynak dosyayı -3dBFS'ten -6dBFS'e yeniden üretti (Kompresör'ün
`COMP_REF_LEVEL_DB=-6` kalibrasyonuyla uyum için). Bu belge SADECE
DOĞRULAMA — kod DEĞİŞTİRİLMEDİ, commit atılmadı._

---

## 1) SEVİYE DOĞRULANDI

`ffmpeg -af volumedetect` ile 10 dosyanın hepsi tek tek ölçüldü:

| Dosya | Tepe (max_volume) | Ortalama (mean_volume) |
|---|---|---|
| kick | **-6.0 dB** | -25.5 dB |
| snare | **-6.0 dB** | -32.2 dB |
| hihat | **-6.1 dB** | -31.2 dB |
| tom | **-5.9 dB** | -26.5 dB |
| bass | **-6.0 dB** | -21.4 dB |
| acoustic_guitar | **-6.0 dB** | -24.1 dB |
| clean_guitar | **-6.0 dB** | -21.0 dB |
| groove | **-6.0 dB** | -25.1 dB |
| acoustic_guitar_stereo | **-6.0 dB** | -24.0 dB |
| clean_guitar_stereo | **-5.9 dB** | -21.1 dB |

**Tüm dosyalar -6.0dB ±0.1dB tepe taşıyor** — iddia doğrulandı. Süre
(24.615011sn) ve kanal sayıları (8 mono + 2 stereo) DEĞİŞMEDİ (ffprobe
ile ayrıca doğrulandı, örnek: kick/snare mono, acoustic_guitar_stereo/
clean_guitar_stereo 2 kanal).

---

## 2) npm test / npm run test:e2e

`Kod DEĞİŞTİRME... isimler ve yollar aynı` iddiası ÇALIŞTIRILARAK
doğrulandı:
- **`npm test`: 1390/1390** (DEĞİŞMEDİ).
- **`npm run test:e2e`: 27/27** (DEĞİŞMEDİ) — `e2e/ear-buttons.spec.mjs`'in
  Stereo Genişlik/Frekans Çakışması testleri dahil, GERÇEK ses
  dosyalarını kullanan tüm testler sorunsuz geçti.

**Sonuç: kod değişikliği GERÇEKTEN gerekmedi, doğrulandı.**

---

## 3) KOMPRESÖR — THRESHOLD ARALIĞI (-8/-34dB) YENİ SEVİYEYLE UYUMU

`core/paywall.js` değil `kompresor.js`'in KENDİ sabitleri Node'da
DOĞRUDAN okundu ve GERÇEK -6dB tepeyle karşılaştırıldı:

```
COMP_THRESHOLD_HIGH_DB (k=0) = -8
COMP_THRESHOLD_LOW_DB  (k=1) = -34
COMP_REF_LEVEL_DB           = -6   ← GERÇEK ölçülen tepeyle (-6.0dB) BİREBİR EŞLEŞİYOR
```

| k | threshold | GERÇEK tepe (-6dB) eşiği AŞMA miktarı | Kullanıcıya GÖSTERİLEN gainReduction formülünün kullandığı miktar (refLevel=-6 sabit) |
|---|---|---|---|
| 0 (kolay) | -8dB | **2.0dB** | **2.0dB** ✅ BİREBİR AYNI |
| 0.25 | -14.5dB | 8.5dB | 8.5dB ✅ |
| 0.5 (orta) | -21dB | 15.0dB | 15.0dB ✅ |
| 0.75 | -27.5dB | 21.5dB | 21.5dB ✅ |
| 1 (zor) | -34dB | 28.0dB | 28.0dB ✅ |

**Önceki turda (OLCUM-KAYNAK-16-08.md madde 2) bulunan sorun TAMAMEN
ÇÖZÜLDÜ:** o zaman GERÇEK tepe (-3dB) ile `COMP_REF_LEVEL_DB` (-6)
arasında 3dB'lik bir fark vardı, kullanıcıya gösterilen "gain reduction"
sayısı gerçek azaltmayı ~2.5 kat AZ gösteriyordu. Şimdi GERÇEK tepe
(-6.0dB) ile `COMP_REF_LEVEL_DB` (-6) **BİREBİR eşleşiyor** — gösterilen
sayı artık GERÇEK kompresör davranışını DOĞRU yansıtıyor, matematiksel
fark SIFIR.

**Ortalama (RMS) seviyeler threshold aralığıyla uyumlu mu:** 10 dosyanın
ortalama seviyesi -21 ile -32dB arasında — TAMAMI `COMP_THRESHOLD_HIGH_DB`
(-8dB) altında (yani k=0'da SADECE tepe darbeler eşiği aşıyor, tasarımın
kendi açıklamasıyla — "sadece en tepe darbeleri yakalar" — TUTARLI) ve
TAMAMI `COMP_THRESHOLD_LOW_DB` (-34dB) ÜSTÜNDE (yani k=1'de sinyalin
NEREDEYSE TAMAMI eşiği aşıyor — "sinyalin çoğu eşiğin üstünde kalır" —
YİNE TUTARLI). **Sonuç: threshold aralığı yeni seviyeyle TAM uyumlu.**

---

## 4) DISTORTION — DRIVE ARALIĞININ YENİ SEVİYEDEKİ DAVRANIŞI

`distortion.js`'in GERÇEK `buildDistortionCurve()`/`driveAtK()`
fonksiyonları Node'da doğrudan çağrıldı, GERÇEK -6dBFS tepeli (lineer
genlik 0.501) bir sinüs sinyaline (220Hz, WaveShaperNode'un standart
lineer-interpolasyon yorumuyla) uygulandı, k=0 (kolay) ve k=1 (zor)
uçlarında çıkış tepe/RMS ölçüldü:

| Tür | k=0 (drive) | Çıkış tepe | k=1 (drive) | Çıkış tepe | Yorum |
|---|---|---|---|---|---|
| **clip** | 2.20 | **0dB (tam kırpma)** | 15.00 | **0dB (tam kırpma)** | Aralığın TAMAMINDA sert kırpma — "kolay ekstrem" doğrulandı, ikisi de aynı tepe ama RMS farkı (k=0: -2.45dB, k=1: -0.25dB) kırpılan ORAN arttığını gösteriyor |
| **soft** | 1.10 | -5.99dB (≈girdiyle aynı, temiz) | 8.00 | -0.01dB (tam doygun) | Geniş, kademeli bir aralık — "kolay" NEREDEYSE hiç işlemsiz, "zor" güçlü doygun |
| **tube** | 0.50 | -12.92dB (girdiden SESSİZ) | 3.20 | -1.43dB | Asimetrik/kazanç-değişken karakter, aralığın tamamında belirgin ama AŞIRI değil |
| **tape** | 0.12 | -6.04dB | 0.90 | -6.30dB | Aralığın TAMAMINDA girdiyle NEREDEYSE AYNI — türün kendi etiketiyle ("çok ince, neredeyse fark edilmez") BİREBİR tutarlı |

**Sonuç:** 4 türün KENDİ dosya-başı açıklamalarıyla (clip=sert köşeli/
ekstrem, soft=yumuşak orta-yoğun, tube=asimetrik orta, tape=neredeyse
fark edilmez) GERÇEK ölçülen davranış BİREBİR TUTARLI — yeni -6dBFS
seviyesi bu karakterleri BOZMADI. (Eski -3dBFS'te bu turda ÖLÇÜLMEDİ,
ama madde 3'teki aynı mantıkla: eski kütüphane de -6dB'ydi — bkz.
OLCUM-KAYNAK-16-08.md madde 2 — yani BU davranış muhtemelen ORİJİNAL
kalibrasyonun KENDİSİ, -3dBFS ara-durumu GEÇİCİ bir sapmaydı.)

---

## 5) 12 MODDA RMS DEĞERLERİ MANTIKLI MI

Doğrudan "12 mod" değil, modların PAYLAŞTIĞI 10 kaynak dosyanın RMS/crest-factor
profili ölçüldü (madde 1'in tablosu) — HER mod bu dosyalardan birini/
birkaçını kaynak olarak kullanıyor, dosya seviyesinde sağlıklıysa mod
seviyesinde de sağlıklı demektir:

- **Crest factor (tepe−ortalama) aralığı: 14.9dB (bass) - 26.2dB (snare).**
  Vuruşlu/transient ağırlıklı kaynaklar (snare 26.2dB, hihat 25.1dB,
  tom 20.6dB) YÜKSEK crest factor taşıyor — GERÇEKÇİ (kısa keskin
  vuruş + uzun sessiz kuyruk). Sürekli/dolu kaynaklar (bass 15.4dB,
  clean_guitar 15.0dB) DÜŞÜK crest factor taşıyor — YİNE GERÇEKÇİ
  (daha sürekli enerji). **Aykırı/bozuk bir değer YOK** (hiçbiri
  0dB'ye yakın [sürekli clipping] ya da -40dB'nin altında [neredeyse
  sessiz] değil).
- Hiçbir dosya `COMP_REF_LEVEL_DB`'nin (-6dB) ÜSTÜNE çıkmıyor (hepsi
  TAM -6.0/-5.9dB'de tepe yapıyor, üstüne TAŞMIYOR) — dijital clipping
  riski YOK.

**Sonuç: 12 modun TAMAMI için kaynak seviyeleri müzikal olarak makul,
aykırı değer yok.**

---

## Dürüstlük notu

Madde 4'ün "bu muhtemelen orijinal kalibrasyonun kendisi" çıkarımı
MANTIKLI ama KESİN KANITLANMADI — eski (-3dBFS) kütüphanede distortion
çıkışı bu turda ÖLÇÜLMEDİ (sadece kompresör tarafı için git history'den
eski dosya çekilip ölçülmüştü, distortion için AYNI karşılaştırma
YAPILMADI). Crest-factor/RMS "mantıklılığı" (madde 5) bir MÜHENDİSLİK
değerlendirmesi — GERÇEK KULAKLA doğrulanmadı, sadece sayısal profil
makul aralıkta.

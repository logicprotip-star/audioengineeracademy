# DEVİR — 15 Ağustos 2026 (sabah)

_Bu belge 15 Ağustos sabah oturumunun devridir._
_Yeni sohbet bunu ve `DEVIR-14-08-2026.md`'yi okuyarak devam eder._

---

# 1. BUGÜN KAPANANLAR

## Cihaz testleri — HEPSİ GEÇTİ ✅

| Test | Sonuç |
|---|---|
| Kulaklık çıkınca oyun duruyor | ✅ |
| Kulaklık takınca otomatik başlamıyor | ✅ (kasıtlı) |
| Düşük Güç Modu | ✅ sorun yok |
| Mono + AIF dosya yükleme | ✅ kilitlenme yok |
| **Arka plandan dönüş** | ✅ uygulama tamamen kapatıldı, açıldı, **Frekans Bulma'da kalınan yerden devam etti** |
| **Bölüm sayacı** | ✅ "BÖLÜM 2/10" doğru çalışıyor |
| Sekme değişimi | ✅ |
| "Yakında" gizlendi · "TASLAK" gitti · Referans Filtreleri ayakta | ✅ |

## Stres testi — 13/14 tamam

Kalan tek madde: **depolama dolu** (madde 8) — telefonu doldurmak
gerekiyor, zahmetli, düşük öncelik.

## Kod düzeltmeleri

| Commit | Ne |
|---|---|
| G209 | "SON İŞLEMLERİM" temizleme (önceki oturumda yapılmış, doğrulandı) |
| G212 | **Mono uyarısı — kök sebep bulundu** |

**G212 detayı:** Kontrol sadece `numberOfChannels` okuyormuş. Logic
Pro mono kaynağı **çift-mono** dışa aktarıyor (teknik olarak stereo,
L===R). `ffmpeg` ile o dosya üretilip eski kontrolden geçtiği
kanıtlandı. Artık L/R karşılaştırılıyor (~2000 nokta, eşik 0.001 ≈
−60 dB, gözden geçirilebilir).

Kapsam dışı bırakılanlar (zaten doğru çalışıyor): Pan Konumu (mono
geçerli), Ölçüm Sonuçları (zaten uyarıyor), Tonal Balance Kendi
Referansım (zaten uyarıyor).

npm test: 1311 → 1315

---

# 2. ŞU AN ÇALIŞAN PROMPT

**BÖLÜM çubuğunda doğru/yanlış gösterimi.**

Karar verildi: **Seçenek A — sadece renk**, ikinci görsel işaret yok.

Gerekçe (Logic): can göstergesinde dolu/boş denendi, ağır geldi,
kaldırıldı. Ayrıca iOS'un kendi erişilebilirlik ayarları (renk
filtreleri, ters çevirme) sistem seviyesinde çözüyor.

**Ölçüm sonucu (G212):** Sınav/telafi deseni `challenge.correct` ve
`challenge.done` ile uygulanabilir — yeni veri yapısı gerekmiyor.
Renk: BÖLÜM cyan kalacak, sadece "yanlış" için kırmızı eklenecek.
Sınav/telafinin altın rengi BURAYA TAŞINMAYACAK.

---

# 3. HEDEF EĞRİLERİ — ÖLÇÜM BAŞLADI

## Ölçülen 7 parça

| Parça | SUB | BAS | ALT-ORTA | ORTA | ÜST-ORTA | TİZ | S/M |
|---|---|---|---|---|---|---|---|
| Cilvelim | +16.5 | +12.4 | +5.2 | −1.8 | −12.4 | −19.9 | −6.9 |
| İki Yaka | +13.7 | +11.8 | +6.0 | −1.4 | −10.0 | −20.1 | −6.7 |
| Mecburi İstikamet | +19.1 | +10.8 | +4.8 | −4.0 | −11.0 | −19.8 | −8.6 |
| Yangın Yeri | +19.0 | +13.1 | +5.4 | −2.9 | −13.9 | −20.7 | −9.3 |
| Yemin Olsun | +15.2 | +13.4 | +9.3 | −2.8 | −13.1 | −22.0 | −10.0 |
| **Levels** (EDM) | +18.1 | +9.8 | +4.6 | −2.6 | −9.8 | −20.0 | −9.5 |
| **Seni Sevmek** (akustik) | **+1.4** | +15.8 | +11.3 | −2.0 | −10.5 | −15.8 | **−17.4** |

_Değerler bant ortalamasına göre normalize edilmiş (dB).
S/M = side/mid oranı, stereo genişlik göstergesi._

## 🔴 KRİTİK BULGU

**Levels (Avicii, EDM) Türkçe pop parçalarının TAM İÇİNDE
oturuyor.** Bant profili beş pop parçasından ayırt edilemiyor.

→ **Pop ile EDM ayrı eğri gerektirmiyor olabilir.** Modern pop
zaten elektronik üretiliyor: aynı alt uç, aynı loudness hedefi.

Daha fazla EDM ölçülünce netleşir ama işaret bu yönde.
**Karar gerekebilir: 3 eğri yerine 2 eğri?**

**Seni Sevmek net ayrılıyor:** SUB +1.4 (diğerleri +14/+19),
S/M −17.4 (neredeyse mono), RMS −15.8 (dinamik), tepe 0'ın
altında tek parça. Akustik profili doğru.

## Kalite notu

Hepsi temiz kaynak. Yangın Yeri 18.75 kHz, Yemin Olsun 19.75 kHz'de
kesiliyor (AAC izi, ölçüm bandını bozmuyor). Üç parçanın tepesi
0 dBFS üstünde — modern master, normal.

⚠️ **Reddedilen dosya:** `Sıla — Mesela .wav` — 16 kHz'de duvar
(15.5k: −59 dB → 16k: −81 dB). Kayıplı kaynaktan WAV'a çevrilmiş.
TİZ bandını bozar, kullanılamaz.

## Ölçüm yöntemi (tekrar edilebilir olsun diye)

- Parçanın **orta %60'ı** alınıyor (intro/outro atlanıyor)
- 32768 örneklik pencere, Hanning, sessiz bölümler atlanıyor
- 6 bant: SUB 20-60 · BAS 60-250 · ALT-ORTA 250-800 ·
  ORTA 800-2500 · ÜST-ORTA 2500-8000 · TİZ 8000-20000
- Değerler bant ortalamasına göre normalize
- Kayıplı tespiti: −78 dB'nin altına düştüğü ilk frekans

## Şarkı listesi durumu

Logic iTunes'dan indiriyor, 10-12 inmiş. Hedef: **tür başına
15-20** (60-70 gerekmiyor, tutarlılık sayıdan önemli).

**Uyarılar (Claude'un tespiti, Logic'e iletildi):**
- Tarkan listede 4 kez var — aynı mühendis/zincir, ortalamayı çeker.
  Tür başına bir sanatçıdan en fazla 1 parça
- EDM ikiye ayrılmış (Türkçe electro-pop + uluslararası club) —
  farklı şeyler, karıştırılmamalı
- Akustik listesinde canlı kayıtlar var (Elif Buse Doğan Live,
  Cem Adrian Live, Fettah Can Senfonik) — stüdyo akustiğinden
  farklı, ayrı değerlendirilmeli

---

# 4. ANDROID — ZORUNLU KURAL

**Logic'in talimatı:** *"Android tarafına geçerken o ayrım mutlaka
sorulsun çünkü ben unutabilirim."*

Android için `www/` klasöründe (ortak kod) değişiklik yapılacaksa
**her prompt'a şu eklenecek:**

```
⚠️ PLATFORM AYRIMI ZORUNLU

  if (getPlatform() === "android") { ... yeni davranış ... }
  else { ... iOS'un mevcut davranışı AYNEN korunsun ... }

getPlatform() zaten var (core/ads.js).
iOS'un davranışı HİÇ DEĞİŞMEYECEK. Değişecekse KOD YAZMADAN bildir.
```

**Neden:** `www/` ortak, iOS ve Android birlikte kullanıyor.
`ios/` ve `android/` klasörleri birbirini görmez, orada risk yok.

**Risk taşıyan ortak dosyalar:** `audio-engine.js` · `upload.js` ·
`ads.js` · `iap.js` · `app.js`

**Android'e geçmeyecekler:** `AudioSessionPlugin.swift` (kulaklık,
route change, ses kurtarma — Android karşılığı YAZILMADI) ·
`Info.plist` ayarları · ATT (Android'de yok)

**AIFF uyarısı:** Chromium AIFF decode etmiyor (ölçüldü). iOS
WKWebView kullandığı için sorun yok, **Android'de dosya yükleme
kısmen bozulabilir.**

---

# 5. SIRADAKİ İŞLER

## Kod
- BÖLÜM çubuğu renk gösterimi (çalışıyor)
- **Karar W:** Pro Plus bölüm sayacı — cevaplar
  `handleExamOutcome`'a ulaşmıyor, sayaç "10/10"da takılı.
  Düzelsin mi?

## Logic'te
- Referans şarkı toplama (iTunes, devam ediyor)
- **Stereo Genişlik için stereo kaynak dosyası** (yayın engelleyici)

## Metin (Claude yazacak, TestFlight'a yaklaşınca)
- Test bilgileri · Testçi yönergesi (kulakla test buraya) ·
  Testçi daveti · Duyuru

## Karar bekleyen
- Testçi geri bildirim kanalı (Google Form mu, DM mi)
- **Pop/EDM tek eğri mi?** (yeni bulgu)
- Kısa dosya reddi (15 sn altı)
- Kilit tipleri UI · Round-timer · DIFFICULTY tabloları ·
  Kaynak kütüphanesi

## Android (iOS'tan sonra)
- Play Console (25 $, vergi/banka gerekmez, şimdi açılabilir)
- AD_ID merged manifest doğrulaması (G207'de elle eklendi)
- APK alıp ne çalışıyor görmek
- Google Play Billing · veri güvenliği formu · IARC

---

# 6. PAZARTESİ (17 Ağustos) — EVRAK

Cumartesi-pazar resmi daireler kapalı.

1. Maliye onayı → vergi numarası
2. Banka hesabı → IBAN
3. **Paid Apps Agreement** ⛔ bunsuz satın alma test edilemez
4. Apple → Agreements, Tax and Banking
5. **W-8BEN** ⚠️ atlanmasın, %30 ABD stopajı
6. DSA trader beyanı
7. AdMob ödeme bilgisi
8. Sandbox satın alma testi
9. **Akşam: build → TestFlight** (Beta Review 1-2 gün sürüyor)

⚠️ **Sözleşme imzalanmadan incelemeye GÖNDERME.**

---

# 7. TEST DURUMU

npm test: **1315/1315**

Son commit'ler: G209 (SON İŞLEMLERİM) · G210 (devir belgeleri) ·
G211 (eksik 2 belge + devir düzeltmesi) · G212 (mono uyarısı)

Hepsi GitHub'da push edilmiş.

---

# 8. ÇALIŞMA KURALLARI (değişmedi)

- Logic kısa yönerge verir → Claude prompt yazar → Logic Claude
  Code'a yapıştırır → cihazda test eder
- **Ölçümsüz düzeltme yok**
- **Prompt istenmeden yazılmaz**
- Her prompt'ta kilit listesi (bozulmayacak commit'ler)
- npm test düşmeyecek
- Bir listede birden fazla madde varsa **hepsi prompt'a yazılacak**
  (14 Ağustos'ta SON İŞLEMLERİM eksik kalmıştı)

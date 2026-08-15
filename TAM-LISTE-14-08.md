# AUDIO ENGINEER ACADEMY — TAM LİSTE

_14 Ağustos 2026, gün sonu · Her şey burada_
_Hedef: 24 Ağustos yayın · Cumartesi-pazar resmi daireler kapalı_

---

# 🔴 1. YAYINI ENGELLEYENLER

## 1.1 Para zinciri — PAZARTESİ (17 Ağustos)

Sıralı, her biri öncekine bağlı.

| # | İş | Durum |
|---|---|---|
| 1 | Maliye dilekçe onayı | 🔄 gönderildi, bekleniyor |
| 2 | Vergi numarası | ⬜ |
| 3 | Banka hesabı + IBAN | ⬜ |
| 4 | **Paid Apps Agreement** | ⬜ ⛔ **bunsuz satın alma test edilemez** |
| 5 | Apple → Agreements, Tax and Banking (IBAN + vergi no) | ⬜ |
| 6 | **W-8BEN vergi formu** | ⬜ ⚠️ **atlanmasın — %30 ABD stopajı** |
| 7 | DSA trader beyanı (Connect → Business) | ⬜ AB satışı için |
| 8 | AdMob ödeme bilgisi | ⬜ acil değil |
| 9 | Sandbox satın alma testi | ⬜ 4'e bağlı |

⚠️ **Sözleşme imzalanmadan incelemeye GÖNDERME.** Apple
"in-app purchase incelenemedi" diye reddeder.

## 1.2 Kod — yayın anında

| # | İş |
|---|---|
| 10 | `AD_TEST_MODE = false` — tek satır, **incelemeye giden build'de de false olmalı** |
| 11 | Build numarasını artır (şu an 1.0/1) |

## 1.3 Kalan içerik

| # | İş |
|---|---|
| 12 | **Stereo Genişlik'e stereo kaynak dosyası** — Logic'te bounce, gerçek stereo, 12-15 sn |

---

# 🟡 2. AÇIK İŞLER — kod

## 2.1 Şu an prompt bekleyen

| # | İş |
|---|---|
| 13 | **"SON İŞLEMLERİM" temizleme** — G208 sadece Ölçüm Sonuçları'nı kapsadı |

## 2.2 Karar bekleyen

| # | Konu | Soru |
|---|---|---|
| 14 | **Pro Plus bölüm sayacı** (karar W) | Pro Plus'ta cevaplar `handleExamOutcome`'a ulaşmıyor, sayaç "10/10"da takılı kalıyor. Düzelsin mi, o modun kendi mantığı mı olsun? |
| 15 | **Kısa dosya reddi** | 15 sn altı dosya reddedilsin mi? Stereo Genişlik'in offset aramasını, Tonal Balance ortalamasını, LUFS ölçümünü bozuyor |
| 16 | **Kilit tipleri UI** | Üç durum (kodlanmadı / seviye / Pro) farklı UX gösteriyor, birleşsin mi? |
| 17 | **Round-timer** | `timeSec` hesaplanıyor ama statik değer kullanılıyor, eğriye bağlansın mı? |
| 18 | **Statik DIFFICULTY tabloları** | Kalıcı mı, eğriye mi devredilecek? |
| 19 | **Kaynak kütüphanesi yenileme** | Daha kaliteli/uzun, 12-15 sn, 256 kbps AAC. Dışarıdan alınırsa Content Rights beyanı değişir |
| 20 | **Vergi durumu** | Uygulama + reklam geliri sosyal içerik üreticiliği istisnasında mı — mali müşavir |

---

# 🟠 3. TESTLER

## 3.1 Cihazda — ŞU AN BEKLİYOR

| # | Test | Durum |
|---|---|---|
| 21 | **Kulaklık çıkınca oyun duruyor mu** | ⬜ Swift değişikliği, hiç test edilmedi |
| 22 | **Kulaklık takınca hiçbir şey olmuyor mu** | ⬜ |
| 23 | **Hızlı tak/çıkar 10 kez → ses kesiliyor mu** | ⬜ eskiden 10'da 2 |
| 24 | **Arka plandan dönünce tur kaldığı yerden mi** | ⬜ |
| 25 | **Bölüm sayacı yeni parkurda "BÖLÜM 2/10" oluyor mu** | ⬜ |

Bugün doğrulananlar: ✅ Yakında gitti · TASLAK gitti · Referans
Filtreleri ayakta kalıyor · sekme değişimi · mail · waveform ·
rozetler · Pro butonu · AIF · eğriler net · Tonal Balance solo ·
dosya temizleme

## 3.2 Kulakla — **TESTFLIGHT'A DEVREDİLDİ**

Logic tek başına test etmeyecek (yorgunluk + kendi kulağına
alışmışlık). Testçilere gidecek.

| Konu | Not |
|---|---|
| 12 modun zorluk eğrileri | Z1 çok kolay mı, Z7 imkânsız mı |
| 5 referans filtresi | Telefon/araba/kulaklık ayırt ediliyor mu |
| Bölge solo | "Sadece bu bant" hissi |
| Pan Konumu 7 kademe | Hafif Sol/Sağ ayırt ediliyor mu |
| Stereo Genişlik %0/%100 | %0 tam mono mu |
| **Q = 2.5** | ⚠️ KARAR — yapay mı doğal mı |
| **Seans rampası** | ⚠️ KARAR — MIN −1.5 / MAX +1.0 / BOSS +2.0 belirgin mi |
| Motor 2 A/B/C | Döngü kesintisiz mi |
| A/B geçişi | Pitch sabit mi |

⚠️ İki karar için **çoğunluk** aranacak, tek kişinin görüşü yetmez.

## 3.3 Stres testi — 11/14 yapıldı

**Denenmeyen 3:**

| # | Madde | Neden önemli |
|---|---|---|
| 26 | **Düşük Güç Modu** | iOS `requestAnimationFrame`'i yavaşlatıyor. Waveform + analizör döngüleri var |
| 27 | **Depolama dolu** | Yarım kalan dosya bozuk kayıt bırakıyor mu |
| 28 | **Mono dosya** | Stereo Genişlik/mid-side'da uyarı çıkıyor mu |

**Kapsam dışı (Logic kararı):** 5 dosya art arda · 5 sn altı dosya

---

# 🔵 4. 1.0'A ALINMIŞ BÜYÜK İŞLER

| # | İş | Durum |
|---|---|---|
| 29 | **Pop/EDM/Akustik hedef eğrileri** | 🔄 Logic iTunes'dan şarkı topluyor, Claude ölçüp kategorize edecek. **Tür başına 15-20 yeterli** |
| 30 | ~~Rozet revizyonu~~ | ✅ bitti (G198) |
| 31 | **Karşılaştırmalı dinletme** | ⬜ 12 modda ayrı iş — **1.0'a sığmayabilir** |
| 32 | ~~Terim revizyonu~~ | ✅ bitti (G191) |

---

# 🟢 5. TESTFLIGHT

| # | İş | Not |
|---|---|---|
| 33 | Build numarasını artır + arşiv + yükle | |
| 34 | **Beta App Review** | ⚠️ **1-2 gün sürer** |
| 35 | 10 testçi topla (Instagram) | **e-posta şart**, kullanıcı adı yetmez |
| 36 | **Test bilgileri metni** | Claude yazacak |
| 37 | **Testçi yönergesi** | Kulakla test bölümü buraya girecek — Claude yazacak |
| 38 | **Testçi daveti metni** | Claude yazacak |
| 39 | **Geri bildirim kanalı** | Google Form önerildi — karar bekliyor |
| 40 | Görev dağıt | kulak / akış / Araçlar / satın alma |
| 41 | Süre belirle ve söyle | |
| 42 | Geri bildirim → düzeltme turu | |

⚠️ Sözleşme yetişmezse testçiler Pro alamaz. Ya sözleşme yetişecek
ya testçilere Pro açacak bir mekanizma yazılacak — şu an yok.

---

# 🟣 6. APP STORE

| # | İş |
|---|---|
| 43 | Add for Review |
| 44 | İnceleme bekle (1-3 gün) |
| 45 | Ret gelirse düzelt, tekrar gönder |
| 46 | Yayın |

---

# 🟤 7. ANDROID — iOS yayınlandıktan sonra

## ⚠️⚠️ ZORUNLU KURAL — HER ANDROID PROMPT'UNDA SORULACAK ⚠️⚠️

**Logic'in talimatı (15 Ağustos):** *"Android tarafına geçerken o
ayrım mutlaka sorulsun çünkü ben unutabilirim."*

Android için `www/` klasöründe (ortak kod) HERHANGİ bir değişiklik
yapılacaksa, **her prompt'a şu madde eklenecek:**

```
⚠️ PLATFORM AYRIMI ZORUNLU

Bu değişiklik www/ klasöründe mi olacak?
Öyleyse iOS'u BOZMAMASI için platform ayrımı yapılmalı:

  if (getPlatform() === "android") { ... yeni davranış ... }
  else { ... iOS'un mevcut davranışı AYNEN korunsun ... }

getPlatform() zaten var (core/ads.js).

iOS'un mevcut davranışı HİÇ DEĞİŞMEYECEK. Değişecekse
KOD YAZMADAN bildir.
```

**Neden:** `www/` klasörü iOS ve Android tarafından ORTAK
kullanılıyor. Orada yapılan her değişiklik iOS'a da yansır.
`ios/` ve `android/` klasörleri birbirini görmez, oralarda risk yok.

**Risk taşıyan dosyalar:** `www/js/core/audio-engine.js` ·
`upload.js` · `ads.js` · `iap.js` · `app.js` — hepsi ortak.

**Risk taşımayan:** `android/` altındaki her şey (Kotlin/Java,
AndroidManifest.xml, Gradle).

---


| # | İş | Not |
|---|---|---|
| 47 | Play Console hesabı | **25 $** |
| 48 | **AD_ID izni doğrula** | G207'de elle eklendi, merged manifest Android Studio'da kontrol edilmeli |
| 49 | Google Play Billing entegrasyonu | Ayrı kod |
| 50 | AdMob Android testi | Birimler var, cihazda test edilmedi |
| 51 | Veri güvenliği formu | App Privacy karşılığı |
| 52 | İçerik derecelendirme (IARC) | |
| 53 | Uygulama erişimi | İncelemeci Pro'yu nasıl açacak |
| 54 | Mağaza metinleri + görselleri | Play formatı farklı |
| 55 | Kapalı test | |
| 56 | 2 cihazda tam test turu | Cihazlar mevcut |

⚠️ Arayüz HTML/CSS ama ekran oranları, yazı tipi (Roboto), güvenli
alan ve **Web Audio davranışı** farklı — baştan sona ayrı test.

---

# ⚪ 8. 1.1 VE SONRASI

**Kararı verilmiş:**

| Konu | Not |
|---|---|
| **İngilizce sürüm** | Fiyat **$14.99–19.99** önerildi ($9.99 düşük). Arayüz + mağaza + yasal metinler |
| **iPad** | Yatay mod tasarımı gerekiyor — 12 modun her ekranı |
| **Bildirimler** | Can doldu, günlük görev, seri bozulmadan uyar |
| **Channel9 modu** | Airwindows MIT lisanslı, zorluk mimarisi hazır, AudioWorklet gerekiyor. Önkoşul: Reverb tip öğretimi kararı |
| **"Yakında" modları** | `hiz-modu`, `hangisi-farkli` — 1.0'da gizlendi, gerçekten gelmeli |

**Fikir aşamasında:**

| Konu | Not |
|---|---|
| **Hata analizi** | ⚠️ **kayıt formatı yayın ÖNCESİ genişletilmeli** — sonradan eklenirse geçmiş veri olmaz |
| **Değişken Q** | Z1'de geniş, Z7'de dar. Tek eksenli zorluk doyuma ulaşıyor. **Diğer modlar için de ikinci eksen aranmalı** |
| **Yorum isteme** | `SKStoreReviewController` — App Store sıralaması yorumla besleniyor, mekanizma yok. **Gelir etkiler** |
| **Kullanıcı istatistikleri** | Hangi mod oynanıyor bilinmezse ne geliştirileceği bilinmez. Ama App Privacy beyanı değişir |
| Frekans zayıflık haritası | `fa_zonestats` var, trend + diğer modlara yayma yok |
| Reverb tip öğretimi | Motor zenginleştirilmeden eklenirse yanlış öğretir |
| İsabet grafiği nokta detayı | Banda basınca kaç deneme/kaç isabet |
| Bluetooth hoparlör filtresi | "Telefon Hoparlörü" yerine JBL tarzı, yeni DSP |
| Waveform seek zaten var | ✅ G192'de eklendi |
| Sunucu zamanı ile can dolumu | Ücretsizde internet zorunlu olur |
| Hesap sistemi + liderlik tablosu | Eklenirse yaş formunda Contests → EVET |
| Web demo | Stüdyo monitöründen oynamak isteyenler var |
| Teşhis Modu (13. mod) | Hız kipi · "Günün Antrenmanı" |
| Pop/EDM eşitlenmiş mix dinleme | Gerçek eğrilerden sonra |
| Çökme raporlama | Connect paneli yeter mi |
| Uygulama içi güncelleme duyurusu | Kullanıcı ne değişti nasıl görecek |
| Sosyal medya hesabı | Ayrı mı, LogicProTrick'ten mi |
| Lansman indirimi | İlk 2 ay indirimli çıkıp sonra artırmak |

---

# ⚠️ 9. BİLİNEN AÇIKLAR — kapatılmayacak

| Açık | Not |
|---|---|
| **Günlük görev sömürüsü** | `dailyKey()` her farklı günde sıfırlanıyor, saati oynatan **sınırsız ödül** alabiliyor. Sunucusuz kapatılamaz |
| **Can dolumu saat manipülasyonu** | İleri almaya açık (geri alma korumalı) |
| **SSL sertifikası** | **28.02.2027** yenilenmeli. Natro ücretsiz Let's Encrypt vermiyor |
| **Kendi reklamına tıklama** | AdMob hesabı kapanır |
| **`abPressTimer`** | Round'a bağlı değil ama yanlış cevap göndermiyor |
| **"10 sn ileri/geri" butonları** | Elapsed metnini güncellemiyor (G201'de bulundu, önceden de varmış) |
| **Gate paneli flash'ı** | Bir an görünüp kayboluyor |
| **Eski Connect kaydı** | "Frequency Ear Trainer" silinemiyor, zararsız |
| **SKAdNetwork** | Sadece 1 kayıt. Mediation yoksa sorun değil, attribution kaybı |

---

# 📅 10. TAKVİM

| Tarih | İş |
|---|---|
| **15-16 Ağu (Cmt-Paz)** | Resmi işlem yok. Kod + test + şarkı toplama + hedef eğrileri |
| **17 Ağu (Pzt)** | Maliye → banka → sözleşme → satın alma testi |
| **17 Ağu akşam** | Build → TestFlight (Beta Review başlasın) |
| **18-19 Ağu** | Testçiler test eder |
| **20 Ağu** | Geri bildirim düzeltmesi → **incelemeye gönder** |
| **21-23 Ağu** | Apple incelemesi |
| **24 Ağu** | Yayın |

**Tampon yok.** Ret gelirse 24 kayar.

---

# 🎯 11. EN BÜYÜK ÜÇ RİSK

**1. Sözleşme zinciri.** Maliye onayı gecikirse her şey kayar.
Satın alma test edilmeden yayına gitmemeli.

**2. Beta App Review 1-2 gün.** Build 17 Ağustos akşamı
atılmazsa testçilerin zamanı kalmaz.

**3. Kulakla test hiç yapılmadı.** Bu bir kulak eğitimi uygulaması
ve seslerin algısal doğruluğu doğrulanmadı. Testçilerden ciddi
bir şey çıkarsa takvim kayar.

---

# 📊 SAYIM

| Kategori | Adet |
|---|---|
| Yayını engelleyen | 12 |
| Açık kod işi | 1 |
| Karar bekleyen | 7 |
| Cihaz testi | 5 |
| Stres testi | 3 |
| Büyük iş | 2 |
| TestFlight | 10 |
| App Store | 4 |
| Android | 10 |
| Bilinen açık | 9 |

**Bugün kapanan: 40+ bulgu.** Sabah App Store Connect boştu,
akşam build hazır, 20+ hata düzeltildi, mağaza denetimi yapıldı.

# KOD DIŞI İŞLER — evrak · hesap · metin

_14 Ağustos · Kod yazmayan ama yapılması gereken her şey_

---

# 📄 BÖLÜM 1 — EVRAK VE RESMİ İŞLER

## 1.1 Vergi (sende, 15 Ağustos)

| # | İş | Durum |
|---|---|---|
| 1 | Maliyeye dilekçe (mobil uygulama geliştiriciliği dahil) | ✅ gönderildi |
| 2 | Dilekçe onayı | 🔄 bekleniyor |
| 3 | Vergi numarası al | ⬜ onaya bağlı |

## 1.2 Banka (sende, vergiden sonra)

| # | İş | Durum |
|---|---|---|
| 4 | Banka hesabı aç | ⬜ |
| 5 | IBAN al | ⬜ |

## 1.3 Bilgileri girilecek yerler

Hesap ve vergi numarası çıkınca **üç ayrı yere** girilecek:

| # | Nereye | Ne gerekiyor | Not |
|---|---|---|---|
| 6 | **Apple — Paid Apps Agreement** | Banka + vergi bilgisi | ⛔ Bunsuz satın alma test edilemez |
| 7 | **Apple — Bank/Tax bölümü** | IBAN, vergi no, adres | Agreements, Tax, and Banking |
| 8 | **AdMob — ödeme bilgisi** | Vergi + banka | İlk ödeme eşiğinden önce yeter |

## 1.4 Ayrıca doldurulacak formlar

| # | Form | Nerede | Not |
|---|---|---|---|
| 9 | **DSA trader beyanı** | Connect → Business | AB'ye satış için ZORUNLU. Şu an eksik |
| 10 | **W-8BEN / vergi formu** | Apple Tax bölümü | ABD dışı geliştirici için. Türkiye-ABD anlaşması var, stopaj düşer |

⚠️ **10 numara atlanmasın.** Doldurulmazsa ABD satışlarından
%30 stopaj kesilir. Türkiye'nin ABD ile çifte vergilendirme
anlaşması var, form doldurulunca oran düşüyor.

---

# 📝 BÖLÜM 2 — YAZILACAK METİNLER

## 2.1 Yayın öncesi

| # | Metin | Nerede | Kim yazacak |
|---|---|---|---|
| 11 | **TestFlight test bilgileri** | Connect → Test Information | Claude |
| 12 | **Testçilere gönderilecek yönerge** | Instagram DM / e-posta | Claude |
| 13 | **"Neler test edilecek" listesi** | Test metnine gömülü | Claude — B bölümü buraya girecek |
| 14 | **Testçi daveti metni** | Instagram paylaşımı | Claude |

⚠️ **13 numara önemli:** Kulakla doğrulama (B bölümü) tamamen
testçilere devredildi. O maddeler testçi diline çevrilecek —
teknik terim yerine "şunu dinle, farkı duyuyor musun" gibi.

## 2.2 Yayın sonrası

| # | Metin | Nerede |
|---|---|---|
| 15 | **Duyuru metni** | Instagram / YouTube |
| 16 | **Sürüm notları (What's New)** | Connect, her güncellemede |

## 2.3 Zaten bitmiş metinler

✅ Mağaza açıklaması · alt başlık · anahtar kelimeler · tanıtım
metni · destek sayfası · gizlilik politikası · kullanım koşulları

---

# 🔑 BÖLÜM 3 — HESAP / KAYIT İŞLERİ

## 3.1 Mevcut hesaplar

| Hesap | Durum |
|---|---|
| Apple Developer | ✅ açık |
| App Store Connect | ✅ uygulama kayıtlı |
| AdMob | ✅ hesap açık, birimler oluşturuldu |
| Domain + hosting (Natro) | ✅ |
| GitHub | ✅ |

## 3.2 Açılacak hesaplar

| # | Hesap | Ne zaman | Ücret |
|---|---|---|---|
| 17 | **Banka hesabı** | Vergiden sonra | — |
| 18 | **Google Play Console** | Android'e geçince | **25 $ tek seferlik** |

## 3.3 Sandbox / test hesapları

| Hesap | Durum |
|---|---|
| Apple sandbox test hesabı | ✅ oluşturuldu, telefonda giriş yapıldı |
| TestFlight iç test grubu | ⬜ oluşturulacak |
| TestFlight harici test grubu | ⬜ oluşturulacak (10 kişi) |

---

# 👥 BÖLÜM 4 — TESTÇİ ORGANİZASYONU

| # | İş | Not |
|---|---|---|
| 19 | **10 testçi topla** | Instagram'dan. **E-posta adresi şart**, kullanıcı adı yetmez |
| 20 | Görev dağıt | kulak / akış / Araçlar / satın alma |
| 21 | Geri bildirim kanalı belirle | DM mi, form mu, TestFlight'ın kendi geri bildirimi mi? |
| 22 | Süre belirle ve söyle | "2 gün içinde" gibi net bir sınır |

⚠️ **21 numara düşünülmedi.** TestFlight'ın kendi geri bildirim
sistemi var (ekran görüntüsü + not) ama kullanıcılar genelde
kullanmıyor. Instagram DM daha gerçekçi olabilir ama dağınık olur.

Öneri: basit bir Google Form. Sorular önceden hazır, cevaplar tek
yerde toplanır.

---

# 💰 BÖLÜM 5 — FİYAT / TİCARİ KARARLAR

| # | Karar | Durum |
|---|---|---|
| 23 | Türkiye fiyatı ₺399 | ✅ karar verildi, Connect'te girili |
| 24 | ABD fiyatı | 🔸 Otomatik türetilmiş ($9.99). **Araştırma $14.99-19.99 öneriyor.** 1.1'de gözden geçirilecek |
| 25 | Lansman indirimi | ⬜ düşünülmedi. İlk 2 ay indirimli çıkıp sonra artırmak bir seçenek |
| 26 | Reklam kotası | ✅ günde 3 reklam, reklam başına +5 soru |

---

# 🔍 BÖLÜM 6 — GÖZDEN KAÇANLAR

Bunlar hiç konuşulmadı, karar gerekiyor:

| # | Konu | Soru |
|---|---|---|
| 27 | **Uygulama içi güncelleme duyurusu** | Kullanıcı yeni sürümde ne değiştiğini nasıl görecek? |
| 28 | **Yorum isteme** | Uygulama kullanıcıdan App Store yorumu isteyecek mi? (`SKStoreReviewController`) |
| 29 | **Çökme raporlama** | Crash raporlarını nereden göreceksin? Connect'in kendi paneli yeter mi? |
| 30 | **Kullanıcı istatistikleri** | Kaç kişi hangi modu oynuyor — Connect Analytics yeter mi, yoksa ayrı analitik mi? |
| 31 | **Geri bildirim kanalı (yayın sonrası)** | Destek maili tek kanal mı? |
| 32 | **Sosyal medya hesabı** | Uygulamanın kendi hesabı olacak mı, LogicProTrick'ten mi yürüyecek? |

⚠️ **28 numara gelir etkiler.** Yorum sayısı App Store sıralamasını
doğrudan etkiliyor. Doğru anda (kullanıcı bir başarı kazandığında)
yorum istemek dönüşümü artırır. Şu an böyle bir mekanizma yok.

⚠️ **30 numara ölçüm için lazım.** Hangi modun oynandığını
bilmezsen neyi geliştireceğini de bilemezsin. Ama analitik eklemek
App Privacy beyanını değiştirir.

---

# 📌 YARIN (15 Ağustos) İÇİN SIRA

1. Maliye onayı gelsin
2. Vergi numarası al
3. Bankaya git, hesap aç
4. **Apple → Agreements, Tax, and Banking** → banka + vergi bilgisi gir
5. **Paid Apps Agreement** imzala
6. **W-8BEN formu** doldur _(atlanmasın)_
7. **DSA trader beyanı** doldur
8. AdMob ödeme bilgisi gir
9. Sandbox satın alma testi yap

**4-9 arası tamamen bilgisayar başında, 1 saat sürer.**
Asıl bekleme 1-3 arasında.

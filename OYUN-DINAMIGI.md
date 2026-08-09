# OYUN DİNAMİKLERİ — Tasarımcı Özeti

*Bu belge gerçek koddan çıkarılmıştır (kod içermez). Audio Engineer Academy — kulak eğitimi uygulaması.*

## 1. Modlar

10 oynanabilir mod var, 4'ü ("Hız Modu", "Stereo Genişlik", "Pan Konumu", "Hangisi Farklı") katalogda tanımlı ama henüz kodlanmadı — kartları "yakında" görünür.

| Mod | Motor | Kulaklık | Erişim | Ne soruluyor | Cevap biçimi |
|---|---|---|---|---|---|
| Frekans Bulma | 1 | Hayır | Ücretsiz | Hangi frekans artırıldı/kesildi | Spektrumda **dokunarak işaretle** (uygulamadaki TEK dokunmalı mod) — ya da 3–6 şık |
| Kesim Noktası | 1 | Hayır | Ücretsiz | Filtrenin kesim frekansı (+ tipi) | 3–6 şık |
| Q Genişliği | 1 | Hayır | Ücretsiz | Bandın genişlik karakteri (Dar/Orta/Geniş sözel etiket) | 3–5 şık |
| Boost mu Cut mu | 1 | Hayır | Ücretsiz | Yön, sonra miktar, sonra frekans — kademeli 3 katman | 2 şık → 3–6 şık |
| dB Seviyesi | 1 | Hayır | Pro | Kaç dB, hangi yönde değişti | 3–6 şık |
| Kompresör | 2 | Hayır | Ücretsiz* | A/B/C'den farklı olanı bul (kompresyon) | 3 kart (dinle-ve-seç) |
| Reverb | 2 | Evet | Pro | A/B/C'den farklı olanı bul (reverb miktarı/tipi) | 3 kart |
| Tonal Denge | 2 | Evet | Pro | Bozulmuş dengeyi kaydırıcılarla nötürle | 4–6 kaydırıcı + onay butonu |
| Distortion | 2 | Hayır | Pro | A/B/C'den farklı olanı bul (saturation/distortion) | 3 kart |
| Frekans Çakışması | 3 | Evet | Pro (günde 1 ücretsiz) | Çok aşamalı: önce çakışma frekansını bul, sonra hangi kaynaktan kesileceğine karar ver, sonra kes | Aşamaya göre 2–6 şık |

*Kompresör kartta "Pro" rengiyle işaretli ama gerçek erişimi ücretsiz — bilinen küçük bir tutarsızlık.

**Motor** iç bir gruplama: Motor 1 = tek kaynağı dinle/işaretle, Motor 2 = üç klip arasından farklı olanı bul (Kompresör/Reverb/Distortion, Tonal Denge kendi kaydırıcı arayüzünü kullanır), Motor 3 = iki kaynaklı, çok aşamalı akış (Frekans Çakışması).

## 2. Seans Yapısı

- **Can:** 5 can ile başlanır. Biterse **30 dakikada 1 can** kendiliğinden dolar; ya da reklam izleyip anında doldurulabilir.
- **Ücretsiz sınırı:** seans başına **5 soru** — sonra paywall açılır.
- **"10 Soruluk Bölüm":** sabit uzunlukta bir tur; sonuna kadar (can bitmeden) tamamlanırsa **+%50 XP bonusu**.
- **Boss Round:** her **5. soru** otomatik olarak Boss — süre kısalır, zorluk bir tık artar, doğru cevap **1.65×** XP verir.
- **Seans üç şekilde biter:**
  - Canlar biter → "CANLARIN BİTTİ" (kırmızı)
  - Ücretsiz 5-soru sınırı dolar → "ÜCRETSİZ OTURUM BİTTİ" (amber)
  - 10 soru kayıpsız tamamlanır → "SEANS TAMAMLANDI" (yeşil)

## 3. XP ve Seviye

- XP **mod başına ayrı** tutulur — tek bir global "oyuncu seviyesi" yok. **"Akademi seviyesi"** = oynanan tüm modların kendi seviyelerinin TOPLAMI.
- Seviye eşiği katlanarak büyür: her seviye bir öncekinden **70 XP daha pahalı** (1→2: 120 XP, 2→3: 190 XP, 3→4: 260 XP…).
- Bir doğru cevabın XP'si çarpımsal: **zorluk tabanı × combo bonusu** (art arda doğru, maks. 2,4×) **× ipucu kullanıldıysa yarı × Boss'ta 1,65× × hızlı cevapta 1,2× × 10-Soruluk-Bölüm'de 1,5×**.
- **9 rozet:** İlk Kulak (ilk doğru cevap), Alev Zinciri (5'lik combo), Şimşek Kulak (10'luk combo), Dayanıklılık (25 tur), EQ Beyni (100 tur), Keskin Hedef (en az 20 turda %70 isabet), Yükseliş (seviye 5), Pro Kulak (Pro zorlukta 8 doğru), Boss Avcısı (1 Boss kazan).

## 4. Zorluk Sistemi

- Seviye 1–20 arası **sürekli/kademesiz** bir eğri — ses ipucunun belirginliği, filtre keskinliği ve süre limiti seviyeyle birlikte yumuşakça zorlaşır. 20'den sonra süre ve ses ipucu daha da kısılmaya devam eder.
- Eğri 4 isimli kademeye karşılık gelir: **Kolay (1–4) / Orta (5–8) / Zor (9–12) / Pro (13–20+)**. Ayrıca "Pro Plus" (çok-bantlı, aynı anda 4 işaretleme) var — bu ayrı bir oyun tarzı, sadece Sabit modda elle seçilebilir, Otomatik'e hiç girmez.
- Bir seans İÇİNDE zorluk hafifçe dalgalanır: her 5 soruluk döngünün ilk sorusu bilerek kolaylaştırılır ("ısınma"), sona doğru zorlaşır, Boss round her zaman en zor noktaya denk gelir — amaç düz/tahmin edilebilir bir zorluk hissi vermemek.
- **Otomatik:** oyun zorluğu kendi seviyene göre kendisi seçer, sen müdahale etmezsin. **Sabit:** zorluğu (Kolay/Orta/Zor/Pro/Pro Plus) sen elle seçersin — **SADECE Pro'da açık**, ücretsiz kullanıcı hep Otomatik'te kalır. Otomatik'teyken "Zorluk" satırına dokununca "Sabit'e geçmek ister misin?" diye sorulur (bu istem performansa göre değil, sadece dokunmayla tetikleniyor — metniyle tam örtüşmüyor).
- **Sınav sistemi (yalnızca Pro'da aktif):** 10 sorudan üst üste 6 doğru (ya da toplamda 6/10) → 4 soruluk sınav hakkı; 4'te 3 doğru geçer → o modun seviyesi **kalıcı olarak 1 artar**, parkur baştan başlar. Geçemezsen parkur yine baştan başlar. Hiç 6'ya ulaşamazsan zayıf bölgeni hedefleyen 5 soruluk bir "telafi turu" gelir (3/5 geçer notu). Önemli: XP arka planda hep birikir ama **seviye sınavı geçmeden ilerlemez** — XP tek başına yeterli değil.

## 5. Feedback Akışı (cevap sonrası)

- **Doğru:** onay sesi, "+XP" parçacık animasyonu, ekranda kısa bir "patlama" efekti, doğru cevap + neden doğru olduğunun açıklaması.
- **Yanlış:** uyarı sesi, ekran hafifçe sallanır, bir can sessizce azalır (kalan can sayısı gösterilir), doğru cevap + açıklama.
- **Otomatik ilerleme süresi:** doğru cevapta 4 saniye, yanlışta 6 saniye (okuma payı için daha uzun). "Geri bildirim ekranı" ayarı KAPALIYSA panel hiç gösterilmez, her iki durumda da 0,7 saniyede (sadece sesle) sıradaki soruya geçilir — hızlı-tekrar modu.
- **"X" (kapat) butonu:** bekleme süresini atlar, anında sıradaki soruya geçer.

## 6. Free / Pro Sınırları

- **Ücretsiz:** 5 mod sınırsız (Frekans Bulma, Kesim Noktası, Q Genişliği, Boost mu Cut mu, Kompresör) + Frekans Çakışması **günde 1 kez ücretsiz tadımlık**.
- **Pro — tek seferlik ₺399:** 10 modun tamamı, sınırsız oynama (5-soru sınırı kalkar), sınav + seviye atlama sistemi, kendi ses dosyanı yükleyip çalışma, Araçlar sekmesi (referans filtreleri), reklamsız.
- **Ücretsizde ek kısıtlar:** seans başına 5 soru, Sabit zorluk seçimi yok, Odak aralığı (Bas/Orta/Tiz) seçimi yok, zayıf-bölge raporu yok, geçmiş grafiği bulanıklaştırılmış.
- **Canlar biterse** tek istisna: Pro satın almadan da bir reklam izleyerek anında doldurulabilir (paywall'daki 6 tetikleyici noktanın içinde reklam seçeneği olan TEK durum).

## 7. Ekran Listesi (11 ekran)

1. **Ana Menü** — mod seçim ızgarası, seviye rozeti, günün önerisi
2. **Oyun** — asıl oynanış ekranı (soru, spektrum/kartlar, cevap, alt kontrol çubuğu)
3. **İlerleme** — seviye, istatistikler, isabet grafiği, zayıf bölge raporu
4. **Araçlar** *(Pro)* — kendi mixini yükle, farklı cihaz/referans filtreleriyle dinle
5. **Kalibrasyon** — referans ton çalıp kullanıcının kendi cihazına göre ses seviyesini ayarladığı ilk-kurulum ekranı
6. **Sık Sorulan Sorular**
7. **Geri Bildirim** — serbest metinli öneri/hata bildirim formu (oyun-içi cevap geri bildiriminden AYRI)
8. **Bize Ulaşın** — destek iletişim bilgisi
9. **Gizlilik / Kullanım Şartları**
10. **Satın Alma (Paywall)** — 6 farklı tetikleyiciden (seans limiti, can bitti, kilitli mod, upload, günlük tadımlık bitti, serbest mod) açılabilen tek ekran
11. **Seans Sonu** — skor halkası, XP özeti, zayıf bölge yorumu

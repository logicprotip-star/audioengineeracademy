# Audio Engineer Academy — Tam Durum Listesi

_13 Ağustos 2026 · akşam güncellemesi_

---

## ✅ BİTTİ

### Uygulama
- [x] 12 mod oynanabilir
- [x] Ses motoru + native AVAudioSession köprüsü (G134/G135)
- [x] Zombi bağlam sorunu çözüldü
- [x] Arka plandan dönüş kurtarması (üretilen ses baştan, yüklenen dosya kaldığı yerden)
- [x] Ekran kilidi kurtarması (Araçlar dahil)
- [x] Kaynak ve dosya seçimi mod başına kalıcı
- [x] Çip düzeni eşitlendi (44px, tek satır, Zorluk çipi kaldırıldı)
- [x] Oyun türü varsayılanı "10 Soruluk Bölüm" + kalıcılık
- [x] Spotlight delik efekti (Motor 2)
- [x] Kart pause (döngü dahil duruyor)
- [x] Araçlar playback ayrıştırma + EQ hareketleri listesi
- [x] Kendi Referansım yayına açıldı
- [x] Referans Filtreleri bağımsız oynatıcı + seek butonları
- [x] Tonal Denge içerik taşması
- [x] Bugünün Önerisi eşiği (en az 10 deneme)
- [x] Seviye tabanlı kilit kaldırıldı
- [x] İsimlendirme tutarsızlıkları (format listesi, buton metinleri, can bitişi tek mesaj)
- [x] Pro Plus'ta geri bildirim ekranı ayarı

### Altyapı
- [x] Domain: audioengineeracademy.com
- [x] Hosting (cPanel, Süper Başlangıç)
- [x] Mail: info@audioengineeracademy.com (+ destek@, admin@ takma adlar)
- [x] SSL: PositiveSSL — **28.02.2027'ye kadar geçerli, yenileme takvimine ekle**
- [x] Gizlilik politikası yayında: /gizlilik.html
- [x] Kullanım koşulları yayında: /kullanim-kosullari.html
- [x] Destek sayfası yayında: /destek.html (SSS + hata bildirimi + yasal bağlantılar)

### AdMob
- [x] Hesap açıldı
- [x] iOS + Android uygulamaları kaydedildi
- [x] Ödüllü reklam birimleri (platform başına ayrı)
- [x] GDPR mesajı oluşturuldu ve yayınlandı ("İzin vermeyin" tüm AB'de açık)
- [x] ATT izin metni (Info.plist)
- [x] Pro kullanıcıda SDK hiç başlatılmıyor (iki katmanlı koruma)
- [x] **Cihazda test GEÇTİ:** test reklamı görünüyor · tamamlanınca +1 can · yarıda kapatınca can yok · bağlantısız anlaşılır hata · reklam sonrası ses devam ediyor

### App Store Connect
- [x] Uygulama kaydı (bundle: com.logicprotrick.audioengineeracademy)
- [x] **Apple ID: 6801169094** (devirdeki 6795851904 YANLIŞ, düzeltildi)
- [x] Pro ürünü tanımlı: `com.logicprotrick.audioengineeracademy.pro`
- [x] Non-Consumable, ₺399,99, Türkiye baz, 175 ülke
- [x] Türkçe yerelleştirme (Pro / açıklama)
- [x] İnceleme ekran görüntüsü + notlar

#### Uygulama Bilgileri sayfası — TAMAM
- [x] Altyazı: `Mix senaryosuyla kulak eğitimi` (29/30)
- [x] Kategori: Music (birincil) + Education (ikincil)
- [x] İçerik Hakları: üçüncü taraf içerik YOK (tüm kaynaklar Logic üretimi)
- [x] Yaş derecelendirmesi: **4+** · 172 ülke
      Reklam=EVET · Contests=NONE · Made for Kids=İŞARETLENMEDİ
      (tüm cevaplar: OTURUM-13-08-2026-AKSAM.md)

#### App Privacy (Uygulama Gizliliği) — YAYINLANDI
- [x] Privacy Policy URL: https://audioengineeracademy.com/gizlilik.html
- [x] User Privacy Choices URL: boş (veri satışı yok)
- [x] "Veri toplanıyor mu" → **EVET** (AdMob nedeniyle)
- [x] 7 veri tipi beyan edildi, hepsi aynı üç cevapla:
      Coarse Location · Device ID · Product Interaction ·
      Advertising Data · Crash Data · Performance Data ·
      Other Diagnostic Data

      Her biri için:
      · Amaç → Third-Party Advertising
      · Kullanıcı kimliğine bağlı mı (identity) → HAYIR
      · Takip için mi (tracking) → EVET

      Dayanak: Google Mobile Ads SDK veri beyan rehberi
      (developers.google.com/admob/ios/privacy/data-disclosure).
      SDK'nın topladıkları: IP adresi (kaba konum tahmini), çökme
      kayıtları, performans verisi, cihaz kimliği, reklam verisi,
      ürün etkileşimi.

      İşaretlenmeyenler ve nedeni:
      · User ID — hesap sistemi yok
      · Purchases — ödeme Apple tarafında, geliştirici erişmiyor
      · Audio Data — yüklenen dosya cihazdan çıkmıyor

#### Sürüm sayfası 1.0 — metinler TAMAM
- [x] Promotional Text (137/170)
- [x] Description (~1178 karakter)
- [x] Keywords (98/100)
- [x] Support URL: https://audioengineeracademy.com/destek.html
- [x] Copyright: 2026 Şahin Salt
- [ ] Marketing URL — boş (isteğe bağlı)

---

## 🔸 ŞU AN ÇALIŞIYOR

- [ ] **StoreKit entegrasyonu** — gerçek satın alma, geri yükleme, fiyatı Apple'dan çekme, simulatePro ayrıştırma

---

## ⬜ YAPILACAK — Yayın öncesi zorunlu

| # | İş | Durum |
|---|---|---|
| — | **Paid Apps Agreement** | ⛔ **TIKALI** — istisna belgesi → banka → imza. Satın alma testi buna bağlı |
| 1 | Uygulama içi yasal metin bağlantıları | ✅ bitti |
| 2 | Stereo Genişlik'e stereo kaynak dosyası | ⬜ açık |
| 3 | `AD_TEST_MODE=false` | ⬜ yayın anında, tek satır |
| 4 | App Privacy formu | ✅ bitti ve yayınlandı |
| 5 | Mağaza metinleri | ✅ bitti |
| 5b | Mağaza görselleri | ✅ 5 kare 1242×2688'e getirildi, yüklendi, sıralandı |
| 6 | AdMob ödeme bilgisi | ⬜ vergi + banka, Logic'te |
| 7 | Yaş derecelendirmesi | ✅ bitti |
| 8 | Uygulama simgesi | ⬜ açık |

### Mağaza görselleri — seçilen 5 kare
Ham bırakılacak, başlık şeridi EKLENMEYECEK (İngilizce sürümde yeniden
yapılmasın diye).

1. Ana ekran · 2. Frekans Bulma · 3. Tonal Balance (Kendi referansım,
iki eğri ayrışmış) · 4. Ölçüm Sonuçları · 5. İlerleme

İlk 3 kare kurulum ekranında görünür — en kritik olanlar.

**Elenenler:** Kesim Noktası (Frekans Bulma'ya çok benziyor) · Rozetler
(yarısı blur) · Mod listesi (kırmızı "İstatistikleri Sıfırla") · "Oyundan
çık?" diyaloğu · Tonal Balance ilk hâli (TASLAK yazısı) · Tonal Balance
ikinci hâli (referans dosya adı üçüncü taraf esere ait).

**Durum:** Kareler 1290×2796'dan 1242×2688'e ölçeklendi (dikeyden 4px
kırpıldı, içerik kaybı yok), 6.5" slotuna yüklendi, sıra düzeltildi.
Dosyalar: `01-ana-ekran.png` … `05-ilerleme.png`

**Açık kalan (zorunlu değil):** hesap sıfır durumda görünüyor (Sv 1,
195 XP, "henüz yeterli verin yok"). Dolu hesapla yeniden çekim daha
güçlü olur — sürüm 1.1'de yapılabilir.

---

## ⬜ TEST EDİLECEK

### Cihazda (birikmiş doğrulamalar)
- [ ] Çip eşitliği — 12 modda gözle
- [ ] Bölüm çubuğu kırpılması (G144, iki kez düzeltme denendi)
- [ ] Şıklı modda 3. şık tam görünüyor mu
- [ ] Kaynak kalıcılığı — uygulama kapat/aç
- [ ] Alt bar metni — 12 modda sadece "Atla"
- [ ] Oyun türü kalıcılığı — kapat/aç
- [ ] Kendi Referansım — gerçek şarkıyla, kulaklıkla
- [ ] Gate paneli — dosyasız upload modu
- [ ] Sheet açıkken tur gerçekten duruyor mu (ses de susuyor mu)
- [ ] Dosya seçimi kalıcılığı — iki farklı modda iki farklı dosya
- [ ] Yatay dönme kilidi
- [ ] ATT diyaloğu ilk reklam anında mı çıkıyor
- [ ] Pro'da "Reklam tercihleri" satırı görünmüyor + ağ isteği yok

### Kulakla (hiç yapılmadı)
- [ ] 12 modun zorluk eğrileri — algısal doğruluk
- [ ] 5 referans filtresi ayırt ediliyor mu (özellikle Telefon mono çökmesi)
- [ ] Bölge solo — "sadece bu bant" hissi
- [ ] Pan Konumu 7 kademe (özellikle Hafif Sol/Sağ)
- [ ] Stereo Genişlik %0 tam mono mu, %100 doğru mu, ara kademeler ayırt ediliyor mu
- [ ] Q=2.5 doğal mı, yapay mı (BEKLEYEN KARAR P)
- [ ] Kompresör/Reverb/Distortion A/B/C döngüsü kesintisiz mi (G58)
- [ ] A/B geçişinde pitch sabit mi

### Stres testi
- [ ] 54 madde (STRES-TESTI.md)
- [ ] Eklenen 15 senaryo: ekran kilidi · Bluetooth tak/çıkar · arama · 10 dk arka plan · düşük pil · uçak modu · depolama dolu · sessiz anahtar · 10 mod hızlı geçiş · 5 dosya yükleme · 100MB dosya · 5 sn altı dosya · mono dosya

---

## ⬜ SONRAKİ AŞAMA

| # | İş | Not |
|---|---|---|
| 8 | TestFlight | 10 kişi, görev dağılımıyla (kulak / akış / Araçlar / satın alma) |
| 9 | Düzeltme turu | Geri bildirime göre |
| 10 | App Store incelemesi → yayın | 1-3 gün, ret gelirse tekrar |
| 11 | **Android** | Play Console (25$) · Billing · AdMob testi · veri güvenliği formu · kapalı test · 2 cihazda test |

---

## ⏸️ KARAR BEKLİYOR

| Konu | Durum |
|---|---|
| **İngilizce çeviri** | Arayüz + mağaza + yasal metinler. İlk sürümde mi, sonra mı? Avrupa reklamı için gerekli |
| **Rozet seti** | Kodda 9 (anlık eşik), tasarımda 6 (süreklilik). İsimler örtüşmüyor, felsefe farklı. Rozetlerin işlevi de yok |
| **Pop/EDM/Akustik eğrileri** | TASLAK. Tür başına 8-12 şarkı ölçülecek (script yazılacak) |
| **Kaynak kütüphanesi yenileme** | Daha kaliteli/uzun, en az bir gerçek stereo dosya |
| **Vergi durumu** | Uygulama geliri + reklam geliri, sosyal içerik üreticiliği istisnası kapsamında mı — mali müşavir |
| **Referans Filtreleri gerçek DSP** | Filtre seçmek sesi değiştirmiyor, sadece etiket gösteriyor |
| **Round-timer eğriye bağlansın mı** | `timeSec` hesaplanıyor ama statik değer kullanılıyor |
| **Seans rampası genliği** | MIN -1.5 / MAX +1.0 / BOSS +2.0 yeterince belirgin mi |
| **Statik DIFFICULTY tabloları** | Kalıcı mı, eğriye mi devredilecek |
| **Kilit tipleri UI ayrımı** | Üç durum (kodlanmadı / seviye / Pro) hâlâ farklı UX'lerle |

---

## 📦 İLERİ SÜRÜM

- Karşılaştırmalı dinletme — yanlış cevapta seçilen ve doğru cevabı arka arkaya çal
- Frekans zayıflık haritası — trend karşılaştırması + diğer modlara yayma
- **Hata analizi** — neden yanlış (yön, karıştırma çiftleri, bağlam)
  ⚠️ **Kayıt formatı yayın ÖNCESİ genişletilmeli** — sonradan eklenirse geçmiş veri olmaz
- Pop/EDM/Akustik hedeflerinde de "eşitlenmiş mix" dinleme (gerçek eğriler geldikten sonra)
- Reverb tip öğretimi — motor zenginleştirme gerekiyor (şu an tek ayırt edici: brightness)
- Web demo → ileride hesap sistemiyle tam sürüm
- Hesap sistemi + liderlik tablosu
- Teşhis Modu (13. mod)
- Hız kipi
- "Günün Antrenmanı" seans tipi
- Sunucu zamanı ile can dolumu (saat manipülasyonuna karşı tam koruma)

---

## 🌍 SONRAKİ SÜRÜMLERDE HATIRLANACAKLAR

- **Liderlik tablosu eklenirse:** Yaş formunda "Contests" NONE işaretlendi
  (kullanıcılar birbiriyle yarışmıyor). Liderlik tablosu/turnuva gelirse
  form güncellenmeli.
- **Kaynak kütüphanesi yenilenirse:** Content Rights "üçüncü taraf içerik
  yok" beyan edildi. Dışarıdan sample alınırsa beyan değişir. Ses
  KAYDININ kendi telifi vardır — süre kısalığı muafiyet sağlamaz.
- **İngilizce sürüm (1.1 / 1.2):** İlk sürüm sadece Türkçe. Gerekçe:
  Türkçe pazarda rakip yok (Quiztones/SoundGym Türkçe değil, SoundGym'in
  mobil uygulaması hiç yok); İngilizcede doğrudan onlarla yarışılır.
  Önce Türkçe kullanıcı verisi toplanacak. Gereken iş: 12 modun arayüz
  çevirisi + İngilizce kareler + Connect'e İngilizce yerelleştirme +
  metin çevirisi.
- **Description sürüm göndermeden değiştirilemez.** Promotional Text
  değiştirilebilir.
- **App Privacy beyanı güncellenecek durumlar:** AdMob kaldırılırsa,
  yeni bir SDK/analitik eklenirse, hesap sistemi gelirse (User ID
  işaretlenir), sunucuya veri gönderilmeye başlanırsa. Publish anında
  "veri uygulamalarım değişirse güncelleyeceğim" taahhüdü verildi.

---

## 🔍 ÖLÇÜM BEKLEYEN GÖZLEM

Frekans Bulma ve Kesim Noktası ekranları "SPEKTRUM · B İŞLENMİŞ" diyor
ama iki farklı moddaki eğri neredeyse birebir aynı ve düz. Kesim
Noktası'nda şıklar 1.55–7.82 kHz HPF; 7.82 kHz HPF olsaydı grafikte
belirgin çöküş görünmeliydi, iz yok.

İki ihtimal: (a) analizör işlenmemiş sinyali gösteriyor, (b) gösterim
kasıtlı ham (cevabı ele vermesin diye) ama ETİKET yanlış.

**Prompt yazılmadan önce Safari Web Inspector'da analizörün hangi node'a
bağlı olduğu ölçülecek.**

Küçük tutarsızlık: "Karışık" çipi Kesim Noktası'nda tam genişliğe
yayılıyor, Frekans Bulma'da dar kalıyor. Yükseklikler eşit, genişlik
dağılımı değil.

---

## ⚠️ HATIRLATMALAR

- **SSL yenileme:** 28.02.2027 — Natro ücretsiz Let's Encrypt vermiyor
- **Build numarası:** her arşivde artırılmalı, aynı numara ikinci kez yüklenemez
- **Kendi reklamına tıklama:** AdMob hesabı kapanır
- **"Çocuklara yönelik" işareti:** ne AdMob'da ne App Store'da işaretlenmeyecek (COPPA)
- **Saat manipülasyonu:** can dolumu ileri almaya açık, günlük görevler tamamen açık — sunucu zamanı çözümü ileri sürümde
- **Kalan bilinen açık:** uygulama tamamen kapatılıp saat değiştirilirse yakalanamaz (sunucusuz mimaride kapatılamaz)
- **Destek maili:** `destek@` takma adının `info@` kutusuna düştüğü HENÜZ TEST EDİLMEDİ — bir kez doğrula
- **Eski Connect kaydı:** "Frequency Ear Trainer" listede duruyor, silinemiyor, zararsız

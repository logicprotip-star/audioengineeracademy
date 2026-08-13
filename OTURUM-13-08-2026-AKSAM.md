# OTURUM KAYDI — 13 Ağustos 2026 (akşam)

_Audio Engineer Academy · mağaza hazırlığı oturumu_

---

## BUGÜN KAPANANLAR

### Uygulama Bilgileri sayfası — TAMAM
- [x] İsim: `Audio Engineer Academy`
- [x] Altyazı: `Mix senaryosuyla kulak eğitimi` (29/30 karakter)
- [x] Kategori: **Music** (birincil) + **Education** (ikincil)
- [x] İçerik Hakları: üçüncü taraf içerik YOK (tüm kaynaklar Logic üretimi)
- [x] Yaş Derecelendirmesi: **4+** · 172 ülke

### Yaş derecelendirme formu — verilen cevaplar
| Bölüm | Cevap |
|---|---|
| Ebeveyn Kontrolleri | HAYIR |
| Yaş Güvencesi | HAYIR |
| Sınırsız Web Erişimi | HAYIR |
| Kullanıcı Tarafından Oluşturulan İçerik | HAYIR |
| Sosyal Medya | HAYIR |
| 13 Yaş Altı Sosyal Medya Devre Dışı | HAYIR |
| Mesajlaşma ve Sohbet | HAYIR |
| **Reklam** | **EVET** |
| Mature Themes (3 madde) | NONE |
| Medical or Treatment Information | NONE |
| Health or Wellness Topics | NO |
| Sexuality or Nudity (3 madde) | NONE |
| Violence (4 madde) | NONE |
| Simulated Gambling | NONE |
| **Contests** | **NONE** |
| Gambling | NO |
| Loot Boxes | NO |
| Age Categories Override | Not Applicable |
| Made for Kids | **İŞARETLENMEDİ** (COPPA + AdMob) |

### Sürüm sayfası (1.0) — metinler TAMAM
- [x] Promotional Text (137/170)
- [x] Description (Logic'in elediği hâl, ~1178 karakter)
- [x] Keywords: `ear training,eq,frekans,mastering,prodüksiyon,ses mühendisi,kompresör,reverb,stereo,mixing,dinleme` (98/100)
- [x] Support URL: `https://audioengineeracademy.com/destek.html`
- [x] Copyright: `2026 Şahin Salt`
- [x] Version: 1.0
- [ ] Marketing URL — boş bırakıldı (isteğe bağlı)

### Destek sayfası — YAYINDA
`destek.html` hazırlandı, cPanel'e yüklendi, çalışıyor.
Tasarım `gizlilik.html` ile aynı. İçerik: SSS (8 soru), hata bildirimi
rehberi, yasal metin bağlantıları. İletişim: `destek@audioengineeracademy.com`
(takma ad, `info@` kutusuna düşüyor — **test edilmedi, bir kez doğrula**).

### App Privacy (Uygulama Gizliliği) — YAYINLANDI
- Privacy Policy URL: `https://audioengineeracademy.com/gizlilik.html`
- User Privacy Choices URL: boş (veri satışı yok)
- "Veri toplanıyor mu?" → **EVET** (AdMob üçüncü taraf ortak sayılıyor)

**Beyan edilen 7 veri tipi** — hepsinde birebir aynı üç cevap:

| Adım | Cevap |
|---|---|
| Amaç | Third-Party Advertising |
| Kullanıcı kimliğine bağlı mı (**identity**) | HAYIR |
| Takip için mi (**tracking**) | EVET |

Tipler: Coarse Location · Device ID · Product Interaction ·
Advertising Data · Crash Data · Performance Data · Other Diagnostic Data

**Dayanak:** Google'ın kendi rehberi
`developers.google.com/admob/ios/privacy/data-disclosure`
Mobile Ads SDK'nın topladıkları: IP adresi (kaba konum tahmininde
kullanılıyor), çökme kayıtları, performans verisi, cihaz kimliği,
reklam verisi, kullanıcı ürün etkileşimi.

**İşaretlenmeyenler ve nedeni:**
- User ID — hesap sistemi yok, bağlanacak kimlik yok
- Purchases — ödeme Apple tarafında giriliyor, geliştirici erişmiyor
- Audio Data — kullanıcının yüklediği dosya cihazdan çıkmıyor

**Kafa karıştıran nokta (not edilsin):** Formda iki benzer soru var.
Ayırt etme kuralı — soruda **"identity"** geçiyorsa HAYIR, **"tracking"**
geçiyorsa EVET.

### Belge düzeltmesi
**Apple ID: 6801169094** (devirde 6795851904 yazıyordu, YANLIŞ).
`DEVIR-13-08-2026.md` satır 153 + `DURUM.md`'de geçiyorsa düzeltilecek.
App Store Connect'te iki kayıt görünüyor: Audio Engineer Academy (aktif)
ve Frequency Ear Trainer (eski, silinemiyor, zararsız).

---

## EKRAN GÖRÜNTÜLERİ — SEÇİLEN 5 KARE

Ham bırakılacak, başlık şeridi EKLENMEYECEK (İngilizce sürümde yeniden
yapılmasın diye).

| Sıra | Ekran | Neden |
|---|---|---|
| 1 | Ana ekran | Uygulama ne, 12 egzersiz |
| 2 | Frekans Bulma | Nasıl oynanıyor |
| 3 | Tonal Balance (IMG_1820) | Kendi mixinle çalışma, en görsel kare |
| 4 | Ölçüm Sonuçları | Teknik derinlik |
| 5 | İlerleme | Takip ve gelişim |

İlk 3 kare kurulum ekranında görünen kareler — en kritik olanlar.

**Elenenler:** Kesim Noktası (Frekans Bulma'ya çok benziyor) · Rozetler
(yarısı blur) · Mod listesi (altında kırmızı "İstatistikleri Sıfırla") ·
"Oyundan çık?" diyaloğu · İlk Tonal Balance karesi (TASLAK yazısı) ·
İkinci Tonal Balance karesi (referans = AH YALAN DÜNYA2.wav, üçüncü
taraf eser adı).

### Kareler — TAMAMLANDI
- [x] 1290×2796 → 1242×2688 ölçeklendi (dikeyden 4px kırpma, içerik
      kaybı yok), 6.5" slotuna yüklendi
- [x] Sıra düzeltildi (ilk yüklemede ters gelmişti)
- Dosyalar: `01-ana-ekran.png` … `05-ilerleme.png`

**Açık kalan (zorunlu değil):** hesap sıfır durumda görünüyor
(Sv 1, 195 XP, "henüz yeterli verin yok"). Dolu hesapla yeniden çekim
daha güçlü olur — 1.1'e bırakılabilir. Durum çubuğu temizliği de
opsiyonel (9:41 / tam pil standardı).

---

## YAYIN ÖNCESİ ZORUNLU — GÜNCEL DURUM

| # | İş | Durum |
|---|---|---|
| 1 | Uygulama içi yasal metin bağlantıları | ✅ (devirde yapıldı) |
| 2 | Stereo Genişlik'e stereo kaynak dosyası | ⬜ açık |
| 3 | `AD_TEST_MODE=false` | ⬜ yayın anında, tek satır |
| 4 | App Privacy formu | ⬜ **sırada — bilgisayar başında yapılabilir** |
| 5 | Mağaza metinleri | ✅ bitti |
| 5b | Mağaza görselleri | ✅ bitti — 5 kare yüklendi |
| 6 | AdMob ödeme bilgisi | ⬜ vergi + banka, Logic'te |
| 7 | Yaş derecelendirmesi | ✅ bitti |
| — | **Paid Apps Agreement** | ⬜ **TIKALI** — istisna belgesi → banka → imza |

Sözleşme bitmeden sandbox satın alma testi yapılamaz.

---

## SONRAKİ SÜRÜMLERDE HATIRLANACAKLAR

**Liderlik tablosu eklenirse:** Yaş formunda "Contests" HAYIR işaretlendi
(kullanıcılar birbiriyle yarışmıyor). Liderlik tablosu/turnuva gelirse
EVET'e döner, form güncellenmeli.

**Kaynak kütüphanesi yenilenirse:** Content Rights "üçüncü taraf içerik
yok" olarak beyan edildi. Dışarıdan sample alınırsa beyan değişir.
Ses KAYDININ kendi telifi vardır — süre kısalığı muafiyet sağlamaz
(sample kütüphaneleri bu yüzden lisans satar).

**İngilizce sürüm (1.1 veya 1.2):** İlk sürüm sadece Türkçe.
Gerekçe: Türkçe pazarda rakip yok (Quiztones/SoundGym Türkçe değil,
SoundGym'in mobil uygulaması hiç yok). İngilizcede doğrudan onlarla
yarışılır — önce Türkçe kullanıcı verisi toplanacak.
Gereken iş: 12 modun arayüz çevirisi + İngilizce kareler + Connect'e
İngilizce yerelleştirme + metin çevirisi (Claude yapar).

**Açıklama metni değiştirilemez:** Sürüm göndermeden Description
değiştirilemez. Promotional Text değiştirilebilir.

**App Privacy beyanı güncellenecek durumlar:** AdMob kaldırılırsa,
yeni bir SDK veya analitik araç eklenirse, hesap sistemi gelirse
(User ID işaretlenir), sunucuya veri gönderilmeye başlanırsa.
Publish anında "veri uygulamalarım değişirse güncelleyeceğim"
taahhüdü verildi.

---

## ÇÖZÜLMEMİŞ TEKNİK GÖZLEM (mağazayla ilgisiz)

Frekans Bulma ve Kesim Noktası kareleri "SPEKTRUM · B İŞLENMİŞ" diyor
ama iki farklı moddaki eğri neredeyse birebir aynı ve düz. Kesim
Noktası'nda şıklar 1.55–7.82 kHz HPF; 7.82 kHz HPF olsaydı grafikte
belirgin bir çöküş görünmeliydi, iz yok.

İki ihtimal: (a) analizör işlenmemiş sinyali gösteriyor, (b) gösterim
kasıtlı ham (cevabı ele vermesin diye) ama etiket yanlış.

**Ölçüm gerekiyor:** Safari Web Inspector'da analizörün hangi node'a
bağlı olduğu görülmeden prompt yazılmayacak.

Ayrıca küçük tutarsızlık: "Karışık" çipi Kesim Noktası'nda tam genişliğe
yayılıyor, Frekans Bulma'da dar kalıyor. Yükseklikler eşit, genişlik
dağılımı değil.

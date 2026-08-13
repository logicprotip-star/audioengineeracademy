# AUDIO ENGINEER ACADEMY — TAM LİSTE

_13 Ağustos 2026 · yayın öncesi ana kontrol belgesi_

Her şey bu belgede. Atlanmış bir şey görürsen ekle.

---

# 1. BİTTİ ✅

## Uygulama
- [x] 12 mod oynanabilir
- [x] Ses motoru + native AVAudioSession köprüsü (G134/G135)
- [x] Zombi bağlam sorunu çözüldü
- [x] Arka plandan dönüş kurtarması
- [x] Ekran kilidi kurtarması (Araçlar dahil)
- [x] Kaynak ve dosya seçimi mod başına kalıcı
- [x] Çip düzeni eşitlendi (44px, tek satır)
- [x] Oyun türü varsayılanı "10 Soruluk Bölüm" + kalıcılık
- [x] Spotlight delik efekti
- [x] Kart pause (döngü dahil)
- [x] Araçlar playback ayrıştırma + EQ hareketleri listesi
- [x] Kendi Referansım yayına açıldı
- [x] Referans Filtreleri bağımsız oynatıcı + seek
- [x] Tonal Denge içerik taşması
- [x] Bugünün Önerisi eşiği (min 10 deneme)
- [x] Seviye tabanlı kilit kaldırıldı
- [x] İsimlendirme tutarsızlıkları
- [x] Uygulama içi yasal metin bağlantıları (Ayarlar + paywall)
- [x] StoreKit kodu (`@capgo/native-purchases`) — Apple tarafı bekliyor

## AdMob
- [x] Hesap, iOS + Android uygulamaları, ödüllü birimler
- [x] GDPR mesajı yayında
- [x] ATT izin metni (Info.plist)
- [x] Pro'da SDK hiç başlatılmıyor (gizlilik açığı bulunup kapatıldı)
- [x] **Cihazda test GEÇTİ:** reklam görünüyor · +1 can · yarıda kapatınca
      can yok · bağlantısız anlaşılır hata · reklam sonrası ses devam ediyor

## Altyapı
- [x] Domain, hosting, mail
- [x] SSL — **28.02.2027'ye kadar**
- [x] gizlilik.html · kullanim-kosullari.html · destek.html

## App Store Connect — BUGÜN BİTTİ
- [x] Uygulama kaydı · **Apple ID 6801169094**
- [x] Pro ürünü: Non-Consumable, ₺399,99, Türkiye baz, 175 ülke
- [x] Altyazı: "Mix senaryosuyla kulak eğitimi"
- [x] Kategori: Music + Education
- [x] İçerik Hakları: üçüncü taraf içerik yok
- [x] Yaş derecelendirmesi 4+ (Reklam=EVET · Contests=NONE ·
      Made for Kids İŞARETLENMEDİ)
- [x] Mağaza metinleri (promo · açıklama · anahtar kelimeler · copyright)
- [x] Support URL
- [x] 5 ekran görüntüsü, 1242×2688, sıralı
- [x] **App Privacy yayınlandı** (7 veri tipi, hepsi Third-Party
      Advertising / identity=HAYIR / tracking=EVET)

---

# 2. YAYIN ÖNCESİ ZORUNLU ⬜

| # | İş | Kimde | Not |
|---|---|---|---|
| 1 | **Paid Apps Agreement** | Logic | ⛔ TIKALI. İstisna belgesi → banka → imza |
| 2 | Sandbox satın alma testi | — | 1'e bağlı |
| 3 | **Uygulama simgesi** | Logic | Hiç yapılmadı |
| 4 | Stereo Genişlik'e stereo kaynak | Logic | Yerleşik kaynağı olmayan tek mod |
| 5 | `AD_TEST_MODE=false` | Kod | Yayın anında, tek satır |
| 6 | AdMob ödeme bilgisi | Logic | Vergi + banka |
| 7 | Native dosyaları commit et | Kod | `android/`, `ios/` — cap sync'ten kalma |
| 8 | DSA trader beyanı | Logic | AB'ye açılacaksa. Connect → Business |

---

# 3. YAYIN ÖNCESİ KARAR GEREKTİRENLER ⏸️

Bunlar "yapılacak" değil, "ne yapacağıma karar vereceğim" listesi.

| Konu | Durum | Aciliyet |
|---|---|---|
| **Referans Filtreleri** | Filtre seçmek sesi DEĞİŞTİRMİYOR, sadece etiket gösteriyor. Uyarı da yok | ⚠️ Yayın öncesi karar: uyarı ekle ya da gizle |
| **Hata analizi kayıt formatı** | Sonradan eklenirse geçmiş veri olmaz, herkes sıfırdan başlar | ⚠️ Yayın ÖNCESİ genişletilmeli |
| **Rozet seti** | Kodda 9 (anlık eşik), tasarımda 6 (süreklilik). İsimler örtüşmüyor. **İsimler yapay zeka işi duruyor, değişecek.** Rozetlerin hiçbir işlevi yok | Orta |
| **Pop/EDM/Akustik eğrileri** | TASLAK. Tür başına 8-12 şarkı ölçülecek, script yazılacak. Uygulamada "taslak" uyarısı var, yanıltma yok | Düşük |
| **Kaynak kütüphanesi yenileme** | Daha kaliteli/uzun, 12-15 sn, 256 kbps AAC. Dışarıdan alınırsa Content Rights beyanı değişir | Düşük |
| **Kilit tipleri UI ayrımı** | Üç durum (kodlanmadı / seviye / Pro) farklı UX'lerle | Düşük |
| **Vergi durumu** | Sosyal içerik üreticiliği istisnası kapsamında mı — mali müşavir | Logic'te |
| **İngilizce çeviri** | **KARAR VERİLDİ:** ilk sürüm sadece Türkçe, İngilizce 1.1/1.2'ye | ✅ kapandı |
| **Stereo Genişlik yerleşik kaynak** | **KARAR VERİLDİ:** kullanıcı kendi dosyasını yükler | ✅ kapandı |

## Kulakla doğrulanmadan karara bağlanamayanlar
| Konu | Durum |
|---|---|
| Q=2.5 / sönümleme=1.0 | Sentetik sinyalle seçildi, gerçek müzikle doğrulanmadı → TestFlight |
| Seans rampası genliği | MIN −1.5 / MAX +1.0 / BOSS +2.0 yeterince belirgin mi |
| Round-timer eğriye bağlansın mı | `timeSec` hesaplanıyor ama statik değer kullanılıyor |
| Statik DIFFICULTY tabloları | Kalıcı mı, eğriye mi devredilecek |

---

# 4. TEST EDİLECEK ⬜

## Cihazda — birikmiş 13 madde
- [ ] Çip eşitliği — 12 modda gözle
- [ ] Bölüm çubuğu kırpılması (2 kez düzeltme denendi)
- [ ] Şıklı modda 3. şık tam görünüyor mu
- [ ] Kaynak kalıcılığı — uygulama kapat/aç
- [ ] Alt bar metni — 12 modda sadece "Atla"
- [ ] Oyun türü kalıcılığı — kapat/aç
- [ ] Kendi Referansım — gerçek şarkıyla, kulaklıkla
- [ ] Gate paneli — dosyasız upload modu
- [ ] Sheet açıkken tur duruyor mu (ses de susuyor mu)
- [ ] Dosya seçimi kalıcılığı — iki modda iki farklı dosya
- [ ] Yatay dönme kilidi
- [ ] ATT diyaloğu ilk reklam anında mı çıkıyor
- [ ] Pro'da "Reklam tercihleri" satırı görünmüyor + ağ isteği yok

## Kulakla — HİÇ YAPILMADI
- [ ] 12 modun zorluk eğrileri — algısal doğruluk
- [ ] 5 referans filtresi ayırt ediliyor mu (özellikle Telefon mono çökmesi)
- [ ] Bölge solo — "sadece bu bant" hissi
- [ ] Pan Konumu 7 kademe (özellikle Hafif Sol/Sağ)
- [ ] Stereo Genişlik %0 tam mono mu, %100 doğru mu
- [ ] Q=2.5 doğal mı, yapay mı
- [ ] Kompresör/Reverb/Distortion A/B/C döngüsü kesintisiz mi
- [ ] A/B geçişinde pitch sabit mi

## Stres testi
- [ ] `STRES-TESTI.md` — 54 madde
- [ ] + 15 senaryo: ekran kilidi · Bluetooth tak/çıkar · arama · 10 dk arka
      plan · düşük pil · uçak modu · depolama dolu · sessiz anahtar ·
      10 mod hızlı geçiş · 5 dosya yükleme · 100MB dosya · 5 sn altı
      dosya · mono dosya

---

# 5. ÖLÇÜM BEKLEYEN GÖZLEM 🔍

**Spektrum analizörü etiketi.** Frekans Bulma ve Kesim Noktası
"SPEKTRUM · B İŞLENMİŞ" diyor ama iki farklı moddaki eğri neredeyse
birebir aynı ve düz. Kesim Noktası'nda şıklar 1.55–7.82 kHz HPF;
7.82 kHz HPF olsaydı grafikte belirgin çöküş görünmeliydi, iz yok.

İki ihtimal: (a) analizör işlenmemiş sinyali gösteriyor,
(b) gösterim kasıtlı ham ama ETİKET yanlış.

**Safari Web Inspector'da analizörün hangi node'a bağlı olduğu
ölçülmeden prompt yazılmayacak.**

Küçük tutarsızlık: "Karışık" çipi Kesim Noktası'nda tam genişliğe
yayılıyor, Frekans Bulma'da dar kalıyor.

---

# 6. SONRAKİ AŞAMA (sırayla)

1. Cihaz test turu (13 madde)
2. Stres testi (69 madde)
3. **TestFlight** — 10 kişi, görev dağılımıyla: kulak / akış / Araçlar /
   satın alma
4. Düzeltme turu
5. App Store incelemesi → yayın (1-3 gün, ret gelirse tekrar)
6. **Android** — Play Console 25$ · Billing · AdMob testi · veri güvenliği
   formu · kapalı test · 2 cihazda test (cihazlar mevcut)

---

# 7. İLERİ SÜRÜM FİKİRLERİ 📦

- **Karşılaştırmalı dinletme** — yanlış cevapta seçileni ve doğruyu arka
  arkaya çal. Rakiplerin (SoundGym, TrainYourEars) zayıf tarafı geri bildirim
- **Frekans zayıflık haritası** — `fa_zonestats` var, trend + diğer modlara yay
- **Hata analizi** — yanılma yönü, karıştırma çiftleri, bağlam
  ⚠️ kayıt formatı yayın öncesi genişletilmeli (bkz. bölüm 3)
- **Pop/EDM/Akustik'te eşitlenmiş mix dinleme** — gerçek eğriler geldikten sonra
- **Reverb tip öğretimi** — motor zenginleştirme gerekiyor. Ölçüldü:
  Room/Hall/Plate arasındaki tek gerçek fark `brightness`. Plate'in metalik
  karakteri modellenmemiş. Room/Hall decay aralıkları hiç çakışmıyor →
  "hangisi Hall" sorusu sadece süre dinlemekle çözülüyor. Motor
  zenginleşmeden tip sorusu eklenirse kullanıcıya yanlış şey öğretilir
- Web demo → hesap sistemiyle tam sürüm
- Hesap sistemi + liderlik tablosu
  ⚠️ eklenirse yaş formundaki **Contests** cevabı EVET'e döner
- Teşhis Modu (13. mod) · hız kipi · "Günün Antrenmanı"
- **Sunucu zamanı ile can dolumu** — ücretsizde internet zorunlu olur

---

# 8. BİLİNEN AÇIKLAR ⚠️

- **Saat manipülasyonu:** can dolumu ileri almaya açık. **Günlük görevler
  tamamen açık** — `dailyKey()` her farklı günde sıfırlanıyor, sınırsız
  ödül alınabiliyor. Sunucusuz mimaride tam kapatılamaz
- **SSL yenileme: 28.02.2027** — Natro ücretsiz Let's Encrypt vermiyor
- **Build numarası** her arşivde artırılmalı
- **Kendi reklamına tıklama** → AdMob hesabı kapanır
- **Eski Connect kaydı** "Frequency Ear Trainer" silinemiyor, zararsız
- **Destek maili** `destek@` → `info@` yönlendirmesi test edilmedi

---

# 9. SONRAKİ SÜRÜMLERDE GÜNCELLENECEK BEYANLAR

| Ne değişirse | Ne güncellenir |
|---|---|
| Liderlik tablosu eklenirse | Yaş formu → Contests EVET |
| AdMob kaldırılır / yeni SDK eklenirse | App Privacy beyanı |
| Hesap sistemi gelirse | App Privacy → User ID işaretlenir |
| Sunucuya veri gönderilirse | App Privacy beyanı |
| Dışarıdan sample alınırsa | Content Rights beyanı |
| Açıklama metni değişirse | Yeni sürüm göndermek gerekir |

---

# 10. BELGE İŞLERİ

- [x] `DEVIR-13-08-2026.md` → Apple ID düzeltildi (6801169094)
- [x] `DURUM.md` → App Store Connect kayıtları eklendi (commit f4bfa12).
      Apple ID hiç yanlış geçmemiş, fiyat zaten ₺399'muş — düzeltme
      gerekmedi
- [x] `CLAUDE.md` → fiyat zaten ₺399, dokunulmadı
- [ ] **`DEVIR-13-08-2026.md` PROJE KLASÖRÜNDE YOK** — repoda bulunamadı.
      Düzeltilmiş hâli hazır, klasöre kopyalanmalı
- [ ] `DURUM-OZET.md` → güncel sürümle değiştir
- [ ] `OTURUM-13-08-2026-AKSAM.md` → klasöre ekle
- [ ] Bu belge (`TAM-LISTE.md`) → klasöre ekle

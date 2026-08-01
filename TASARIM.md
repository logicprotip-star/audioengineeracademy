# TASARIM ENVANTERİ

> `Dizayn /prototype.html` (tıklanabilir prototip) ile mevcut uygulama (`www/`) arasındaki
> tam karşılaştırma. Sadece okuma/karşılaştırma — kod değiştirilmedi.
> Üretim tarihi: bu envanter tek seferlik bir denetimdir, kod değiştikçe elle güncellenmelidir.

## EKRAN 1 — ANA MENÜ

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Üst bar (başlık + ayarlar dişlisi) | ✓ | ✓ | Tam | — |
| Seviye kartı (SV rozeti, XP bar, "Sonraki seviyeye X XP") | ✓ | ✗ | **Yok** | Menüde hiç yok — sadece İlerleme sekmesinde var (farklı düzende) |
| "Bugünün Önerisi" kartı | ✓ | ✓ | Kısmi | Kart doğru render oluyor (en zayıf bölge metni), ama "Başla" butonu tıklanınca sadece oyun ekranına gidiyor — tasarımdaki gibi o bölgeye ODAKLANAN bir set başlatmıyor (odak-aralığı özelliği kodda yok, `app.js:842` yorum satırında bu bilerek belirtilmiş) |
| Kartı kapatma (X) | ✓ | ✓ | Tam | — |
| "Egzersizler" başlığı + sayaç ("— / — açık") | ✓ | ✓ | Kısmi | Tasarımda "N / 14 açık" (seviye kilidi sayısı); kodda "14 egzersiz · 3 oyun tipi" — farklı bir sayaç mantığı, seviye ilerlemesi göstermiyor |
| Mod kartları (14 adet, ızgara) | ✓ | ✓ | Tam | — |
| Mod kartı: motor rengi/simgesi | ✓ | ✓ | Tam | — |
| Mod kartı: kilit ikonu (seviye) | ✓ | ✓ | Tam | — |
| Mod kartı: "İLERİ" rozeti (adv) | ✓ | ✗ | **Yok** | `ADV_SVG` tasarımda var, kodda karşılığı bulunamadı |
| Mod kartı: kulaklık ikonu (needsHp) | ✓ | ✗ | **Yok** | Kart üzerinde kulaklık ikonu bulunamadı — sadece meta alanı (`kulaklikGerekli`) var, görsel karşılığı yok |
| Mod kartına tıklayınca kulaklık uyarı sheet'i | ✓ | ✗ | **Yok** | `hpSheet`/`askHeadphones()` karşılığı bulunamadı; tıklayınca doğrudan oyuna giriyor ya da (kilitliyse) "Yakında" toast'ı |
| Sekme çubuğu (Antrenman/İlerleme/Araçlar) | ✓ | ✓ | Tam | — |

## EKRAN 2 — OYUN (Motor 1: "Frekans Bulma" ve türevleri)

> Not: Tasarımda Motor 1 İKİ ayrı ekran (`s-game1` şıklı, `s-game1t` dokunmalı) + bir sheet
> içi "Cevap biçimi" anahtarı olarak var. Kodda TEK ekran var ve SADECE dokunmalı (touch)
> girişi çalışıyor.

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Geri butonu | ✓ | ✓ | Tam | — |
| Oyun başlığı | ✓ | ✓ | Tam | — |
| "Soru N/10" sayacı | ✓ | ✓ | Tam (uyarlanmış) | `M1-7, ff8f862`: ana sayaç artık "Soru N/10" gösteriyor — ama SADECE 10 Soruluk Bölüm'de (`challenge.active`); Serbest (sonsuz) modda "Soru N" kalıyor, çünkü tasarımda "Serbest" kavramı hiç yok (oradaki 10 sabit varsayılan) |
| Seviye chip'i (tıklanınca `lvlSheet` açılır) | ✓ | ✗ | **Yok** | Seviye bilgisi/detay sheet'i (bant genişliği, değişim miktarı, şık sayısı, sıradaki seviye) kodda hiç yok — DURUM.md BEKLEYEN KARARLAR **E**: bu sheet, XP-seviyesine bağlı sürekli bir bant/dB formülü varsayıyor, kodda böyle bir formül (ve "Seviye" ile `DIFFICULTY` arasında bağlantı) yok |
| Kalp göstergesi | ✓ | ✓ | Tam | — |
| Özel sayaç (Hız Modu için "12 doğru") | ✓ | ✗ | N/A | Hız Modu mod olarak kodda yok, dolayısıyla bulunamadı |
| Dots (oyun ayarları) butonu | ✓ | ✓ | Tam | — |
| Stats satırı: seri | ✓ | ✓ | Tam | — |
| Stats satırı: ipucu sayacı | ✓ | ✓ | Tam | — |
| Stats satırı: isabet % | ✓ | ✓ | Tam | — |
| Kaynak seçici chip | ✓ | ✓ | Kısmi | Var ama kaynak kataloğu tamamen farklı: tasarımda gerçek enstrüman/davul isimleri (Kick, Snare, Hi-hat, Tam davul, Bas Gitar, Gitar, Vokal, Pembe gürültü, Synth) gruplu; kodda sadece 5 sentetik dalga formu (pembe/beyaz gürültü, testere/kare/üçgen synth) + yükleme |
| Kaynak sheet'i (SENTETİK/DAVUL/ENSTRÜMAN/KENDİ DOSYAM grupları) | ✓ | ✗ | **Kısmi/Yok** | Kodda düz bir `<select>` var, gruplu liste sheet'i yok |
| Odak aralığı chip'i (Tüm spektrum/Bas/Orta/Tiz) | ✓ | ✓ | Tam | `M1-4, 5c608f4`: `focusChip`/`focusSheet` eklendi (`FOCUS_RANGES`), soru ve çeldiriciler seçili aralıkla sınırlanıyor, tercih kalıcı. Dar aralıkta Pro Plus'ın 4 bandı her zaman sığmayabiliyor — DURUM.md BEKLEYEN KARARLAR **H** |
| Karıştır (⇄) butonu | ✓ | ✓ | Tam | — |
| Soru satırı | ✓ | ✓ | Tam | — |
| Spektrum paneli (bars, eksen) | ✓ | ✓ | Tam | — |
| Gain değeri (+6 dB) | ✓ | ✓ | Tam | — |
| İpucu maskesi (mask L/R, karartma) | ✓ | ✓ | Tam | `renderHintMask`/`hint-mask-seg` — zorluk bazlı bant genişliği (hintBandOct) dahil |
| İpucu etiketi ("İPUCU · X–Y arası") | ✓ | ✓ | Tam | — |
| Alt panel (dB/Stereo/Pan/Tap görselleştirmeleri) | ✓ | ✗ | N/A | Bu modlar (dB Seviyesi, Stereo Genişlik, Pan Konumu) kodda yok, görselleştirme paneli de yok |
| Şıklı cevap butonları (`.ans` grid) | ✓ | ✗ | **Yok** | Kodda hiç bulunamadı — sadece dokunmalı/spektrum-tıklama var |
| Dokunmalı işaretleme (spektruma dokun) | ✓ | ✓ | Tam | Canvas üzerinde pointerdown/pointermove ile çalışıyor |
| Kalite etiketi (çok yakın/yakın/uzak, renkli bant) | ✓ | ✓ | Tam | `frekans-bulma.js:668-670` — 3 kademeli sistem birebir örtüşüyor |
| Zaman çubuğu + geri sayım | ✓ | ✓ | Tam | — |
| Geri bildirim kartı | ✓ | ✓ | Tam | `M1-6, 5a8e3b0`: "Senin cevabın / Doğru cevap / Temiz" (`cmprow`) eklendi ve prototipten farklı olarak GERÇEK ses çalıyor. Sadece tek-bant modu kapsandı, Pro Plus'ta yok (4 tahminden hangisi belirsiz) |
| "Tekrar Çal" butonu (sesi baştan çalar) | ✓ | ✗ | **Kısmi/Yok** | Kodda ayrı bir "Tekrar Çal" yok; en soldaki buton Başlat/Durdur/Devam rollerini üstleniyor — davranışı farklı (baştan çalma değil, duraklat/devam). DURUM.md BEKLEYEN KARARLAR **F**: sentetik kaynaklarda "baştan"ın bir anlamı yok, sadece upload'da anlamlı — kapsam kararı bekliyor |
| A/B Test kısa dokunma (toggle) | ✓ | ✓ | Tam | — |
| A/B Test uzun basma → otomatik döngü | ✓ | ✓ | Tam | `M1-5, 1a8dd7b`: `pointerdown`+520ms+`setInterval(2000ms)` prototiple birebir aynı zamanlamayla eklendi |
| İpucu butonu | ✓ | ✓ | Tam | — |
| Ana CTA ("Cevabı onayla"/"Sonraki soru") | ✓ | ✗ | **Kısmi** | Kodda bu tek bir birleşik buton değil — "Atla ▶" (skip/otomatik ilerleme) ayrı bir buton; cevap onaylama dokunmayla (pointerdown) anında oluyor, ayrı bir "onayla" adımı yok |
| Oyun ayarları sheet'i: Ses kaynağı | ✓ | ✓ | Tam | — |
| Oyun ayarları sheet'i: Zorluk | ✓ | ✓ | Tam (farklı sunum) | Tasarımda iç içe sublist; kodda genel `settingsSheet` listesi — işlev aynı |
| Oyun ayarları sheet'i: Cevap biçimi (Şıklı/Dokunmalı) | ✓ | ✗ | **Yok** | Kodda hiç yok — zaten şıklı mod olmadığı için anahtar da yok |
| Oyun ayarları sheet'i: Oyun Türü (Serbest/10 Soruluk Bölüm) | ✗ | ✓ | **Ters fark** | Tasarımda karşılığı yok — kod-only ekleme |
| Oyun ayarları sheet'i: Süre (Süreli/Süresiz) | ✗ | ✓ | **Ters fark** | Tasarımda karşılığı yok — kod-only ekleme |
| Oyun ayarları sheet'i: Ses dosyası yükleme | ✓ (kaynak sheet'i içinde) | ✓ | Tam | Konum farklı (kod: dots sheet içinde; tasarım: kaynak sheet'i içinde) ama işlev var |
| "Oyundan çık" butonu (dots sheet) | ✓ | ✓ | Tam | `M1-7, ff8f862`: Oyun Ayarları sheet'inin altına eklendi (`.btn.danger`), backBtn ile aynı güvenli çıkış deseni |
| Otomatik zorluk sorgusu ("Sabit'e geçmek ister misin?") | ✓ | ✗ | **Yok** | `autoDiffAsk` karşılığı bulunamadı — DURUM.md BEKLEYEN KARARLAR **G**: prototipteki "Otomatik" zorluk MODU kodda hiç yok (sadece sabit seçenekler var), bu mod tasarlanmadan sorgu kutusu bağlanacak bir şeyi yok |
| Boss round rozeti/mekaniği | ✗ | ✓ | **Ters fark** | Tasarımda hiç yok — kod-only özellik (bossChip, boss XP çarpanı, bossWins başarımı) |
| Combo/seri XP çarpanı | ✗ | ✓ | **Ters fark** | Tasarımda combo kavramı görsel olarak var (seri sayacı) ama XP çarpanına bağlı değil; kodda `stats.combo` XP hesaplamasını doğrudan etkiliyor |

## EKRAN 3 — MOTOR 2 "Hangisi Farklı" (ve Kompresör/Reverb/Distortion/Tonal Denge)

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Ekranın tamamı (görev kartı, ses seçenekleri A/B/C, sırayla çal, ipucu, cevap onayla, geri bildirim) | ✓ | ✗ | **Yok** | Hiçbir karşılığı bulunamadı — menüde kilitli kart olarak duruyor, arkasında kod yok |

## EKRAN 4 — MOTOR 3 "Frekans Çakışması" (3 aşama)

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Ekranın tamamı (aşama seçimi, kaynak çifti, iki kaynaklı spektrum, dokunmalı/kart/şıklı 3 farklı aşama arayüzü) | ✓ | ✗ | **Yok** | Hiçbir karşılığı bulunamadı — menüde kilitli kart olarak duruyor, arkasında kod yok |

## EKRAN 5 — SEANS SONU

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Sonuç halkası (% + doğru sayısı) | ✓ | ✗ | **Yok** | Ekranın tamamı bulunamadı (DURUM.md'de de "AÇIK İŞLER #9" olarak zaten kayıtlı) |
| "Seviye atladın" kartı | ✓ | ✗ | **Yok** | — |
| Kazanılan XP kartı + bar | ✓ | ✗ | **Yok** | — |
| En uzun seri / mevcut seri / ipucu stat'ları | ✓ | ✗ | **Yok** | — |
| Bölge haritası (dot'lar) / Soru sırası (kutular) | ✓ | ✗ | **Yok** | — |
| "Canların bitti" varyasyonu | ✓ | ✗ | **Kısmi** | Bunun yerine kod bir "Oyun Bitti" KARTI (modal, ayrı ekran değil) gösteriyor — çok daha az bilgi içeriyor (sadece doğru/yanlış/XP/ipucu sayısı) |
| Öneri kartı (sonraki set için) | ✓ | ✗ | **Yok** | — |
| "10 soru daha" / "Tekrar oyna" / "Menüye dön" CTA'ları | ✓ | ✗ | **Kısmi** | Karşılığı "Tekrar Oyna" tek butonu (gameover kartında) — ayrı bir ekran/CTA seti yok |

## EKRAN 6 — KALİBRASYON

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| 3 adımlı ilerleme (adım sayacı + bar) | ✓ | ✓ | Kısmi | Kodda adım sayacı var ama bar yerine nokta göstergesi (`calStepDots`) — görsel farklı, işlev aynı |
| Adım başlığı/gövde metni | ✓ | ✓ | Tam | — |
| Referans tonu çal/durdur | ✓ | ✓ | Tam | — |
| Ton seviye göstergesi (meter/bar animasyonu) | ✓ | ✓ | Tam | — |
| Rehber metni | ✓ | ✓ | Tam | — |
| "Cihaz seviyesi" kartı (donanım ses seviyesi göstergesi, %62) | ✓ | ✗ | **Yok** | Karşılığı bulunamadı — tasarımda bu, donanım ses tuşlarının OKUNMASINI varsayıyor; kodda bunun yerine kullanıcının kendi sürüklediği bir "Referans dinleme seviyesi" slider'ı var (farklı mekanizma) |
| Kendi iç slider'ı (Referans dinleme seviyesi) | ✗ | ✓ | **Ters fark** | Tasarımda karşılığı yok — kod, donanım seviyesini okuyamadığı için kendi slider'ını icat etmiş (önceki turlarda donanım ses tuşu desteği de eklendi, ama bu ayrı bir mekanizma) |
| "Seviye doğru, devam et" CTA | ✓ | ✓ | Tam | — |
| "Sonra yaparım" butonu | ✓ | ✓ | Tam | — |

## EKRAN 7 — İLERLEME

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Üst bar + ayarlar dişlisi | ✓ | ✓ | Tam | — |
| Seviye kartı (SV rozeti, XP bar) | ✓ | ✓ | Kısmi | Kodda ayrı bir "seviye kartı" yok — 4'lü stat-big ızgarasında (Seviye/XP/Seri/Doğruluk) sunuluyor, görsel biçim farklı |
| Antrenman/Soru/İsabet stat satırı | ✓ | ✓ | Kısmi | Kodda "İsabet" bu satırda değil, ayrı 4'lü ızgarada; "Antrenman"+"Soru" 2'li ayrı satırda — içerik aynı, düzen farklı |
| "Şu An Neredesin" kartı | ✓ | ✓ | Tam | — |
| Frekans bölgesi (açılır/kapanır panel, bölge barları) | ✓ | ✓ | Tam | Kodda ek olarak "temizle" linki var (tasarımda yok — ters fark, küçük) |
| Son 30 gün grafiği | ✓ | ✓ | Tam | Kodda veri yoksa boş-durum mesajı da var (tasarımda hep sahte veriyle dolu) |
| Mod seviyeleri (açılır/kapanır panel) | ✓ | ✓ | Tam | — |
| Rozetler ızgarası | ✓ | ✓ | Kısmi | Özellik çalışıyor ama rozet İÇERİĞİ tamamen farklı: tasarımda 6 rozet (İlk 100 soru, 7 gün seri, Bas ustası, Üst-orta ustası, Pro hassasiyet, Tüm modlar); kodda 9 farklı rozet (İlk Kulak, Alev Zinciri, Şimşek Kulak, Dayanıklılık, EQ Beyni, Keskin Hedef, Yükseliş, Pro Kulak, Boss Avcısı) — isim/koşul birebir örtüşmüyor |
| Günlük görevler | ✗ | ✓ | **Ters fark** | Tasarımda hiç yok — kod-only özellik (3 günlük görev, ödül XP'si) |
| Canlı istatistikler (Toplam Tur/Doğru/Yanlış/Ort. Puan/En İyi Seri/En Yüksek Skor) | ✗ | ✓ | **Ters fark** | Tasarımda karşılığı yok — kod-only ek panel |
| Son turlar (geçmiş listesi) | ✗ | ✓ | **Ters fark** | Tasarımda karşılığı yok — kod-only |
| "İstatistikleri Sıfırla" butonu | ✗ | ✓ | **Ters fark** | Tasarımda karşılığı yok — kod-only |

## EKRAN 8 — ARAÇLAR

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Üst bar + Pro rozeti + ayarlar | ✓ | ✓ | Tam | — |
| Dosya yükleme kartı (dosya adı/süre/format) | ✓ | ✓ | Kısmi | Kod: "Dosya değiştir" YOK, tek "Dosya yükle" butonu; "Çal" butonu da YOK |
| Analiz kartı (spektrum sapma grafiği) | ✓ | ✓ | Tam | Statik içerik olarak birebir (Pro kilit arkasında, ikisi de sahte/demo veri) |
| Analiz metrikleri (LUFS/LRA/true peak/mono uyum) | ✓ | ✓ | Tam | — |
| Analiz uyarı listesi (li satırları) | ✓ | ✓ | Tam | — |
| "Otomatik düzelt" butonu | ✓ | ✓ | Tam | — |
| "Öncesi/Sonrası" butonu | ✓ | ✗ | **Yok** | Karşılığı bulunamadı |
| "İndir" butonu | ✓ | ✗ | **Yok** | Karşılığı bulunamadı |
| Pro kilit overlay (Analiz) | ✓ | ✓ | Tam | — |
| Referans filtreleri chip listesi | ✓ | ✓ | Tam | — |
| Filtre detay kartı (ad/açıklama/ne dinlemeli) | ✓ | ✓ | Tam | — |
| "Düz'e dön" butonu | ✓ | ✓ | Tam | — |
| "Çal" butonu (filtre) | ✓ | ✗ | **Yok** | Karşılığı bulunamadı |
| Pro kilit overlay (Referans filtreleri) | ✓ | ✓ | Tam | — |

## EKRAN 9 — AYARLAR (genel sheet)

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Dil segmenti (TR/EN) | ✓ | ✓ | Kısmi | Görsel var, gerçek i18n (İngilizce çeviri) çalışmıyor — sadece görsel toggle |
| Bildirimler anahtarı | ✓ | ✓ | Kısmi | Anahtar çalışıyor ama gerçek bir bildirim planlama altyapısı yok (sadece tercih saklanıyor) — kod içinde bu bilerek belirtilmiş |
| Kulaklık uyarısı anahtarı | ✓ | ✓ | Tam | — |
| Kalibrasyon satırı | ✓ | ✓ | Tam | — |
| Zorluk: Otomatik/Sabit + alt liste | ✓ | ✓ | Tam | — |
| Hesap: Sürüm satırı + Pro'ya geç | ✓ | ✓ | Tam | — |
| Satın alımları geri yükle | ✓ | ✓ | Kısmi | Buton var ama gerçek bir IAP/restore işlemi yok — "bulunamadı" toast'ı |
| Destek: Geri bildirim/SSS/Bize ulaşın | ✓ | ✓ | Tam | — |
| Hakkında: Gizlilik/Kullanım şartları/Sürüm no | ✓ | ✓ | Tam | — |
| Sheet'i aşağı kaydırarak kapatma (drag-to-dismiss) | ✓ | ✗ | **Yok** | `touchstart/touchmove/touchend` ile sürükleme mekanizması kodda bulunamadı — sadece X butonu/overlay tıklamasıyla kapanıyor |

## DİĞER SHEET'LER

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Kulaklık uyarısı sheet'i (mod özel, "bu modda bir daha gösterme") | ✓ | ✗ | **Yok** | Karşılığı bulunamadı (yukarıda da not edildi) |
| Seviye bilgisi sheet'i (`lvlSheet`) | ✓ | ✗ | **Yok** | Karşılığı bulunamadı |
| Motor 3 aşama sheet'i | ✓ | ✗ | N/A | Motor 3 kodda yok |
| Kaynak çifti sheet'i (Motor 3) | ✓ | ✗ | N/A | Motor 3 kodda yok |
| Odak aralığı sheet'i | ✓ | ✗ | **Yok** | Karşılığı bulunamadı |
| Ses kaynağı sheet'i (gruplu) | ✓ | ✗/Kısmi | **Kısmi** | Kodda düz `<select>` tabanlı `settingsSheet` var, gruplama/kategori yok |
| Sheet geri butonu (sheetback, alt liste navigasyonu) | ✓ | ✗ | **Yok** | Tasarımdaki `sheetBack()`/otomatik geri butonu ekleme mekanizması kodda bulunamadı — kod `mainSettingsBack` diye tek bir sabit geri butonu kullanıyor, dinamik sheet-stack yok |

## EKRAN 10 — SATIN ALMA

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Kapat (X) | ✓ | ✓ | Tam | — |
| Başlık/açıklama | ✓ | ✓ | Tam | — |
| Ücretsiz plan kartı: mod sayısı | ✓ | ✓ | Tam | — |
| Ücretsiz plan: "Seans başına 5 soru" | ✓ | ✓ | Tam | — |
| Ücretsiz plan: "5 can · 30 dakikada dolar" | ✓ | ✓ | Kısmi | Kodda sadece "5 can" — "30 dakikada dolar" ifadesi yok (kasıtlı ürün kararı, DURUM.md'de kayıtlı: can dolumu kodda yok) |
| Ücretsiz plan: "Araçlar sekmesi kapalı" | ✓ | ✓ | Tam | — |
| Pro plan kartı: fiyat, mod sayısı, 10 soru, can sınırsız, araçlar, detaylı rapor | ✓ | ✓ | Tam | — |
| "Satın al" butonu | ✓ | ✓ | Kısmi | Buton var, gerçek IAP yok — "Yakında" toast'ı |
| "Geri yükle" | ✓ | ✓ | Kısmi | Aynı, gerçek işlev yok |
| "Ücretsiz devam" | ✓ | ✓ | Tam | — |

## EKRAN 11 — YARDIM/METİN EKRANLARI (SSS, Geri Bildirim, İletişim, Yasal)

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| SSS listesi (açılır/kapanır) | ✓ | ✓ | Tam | İçerik farklı ama mekanizma birebir aynı |
| Geri bildirim metin alanı | ✓ | ✓ | Kısmi | Tasarımda `contenteditable` div; kodda gerçek `<textarea>` — işlevsel olarak eşdeğer/daha iyi |
| Geri bildirim gönder | ✓ | ✓ | Kısmi | Kod yerel onay+temizleme yapıyor (backend yok) — tasarımda da gerçek gönderim simüle edilmiyor, ikisi de placeholder |
| İletişim (e-posta kartı) | ✓ | ✓ | Tam | — |
| Yasal metin (Gizlilik/Kullanım şartları) | ✓ | ✓ | Tam | İkisi de "içerik yakında eklenecek" placeholder'ı |

## SEKME ÇUBUĞU

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Antrenman/İlerleme/Araçlar sekmeleri | ✓ | ✓ | Tam | — |

---

## ÖZET

**Toplam öğe sayısı (bu tabloda listelenen ayrı satırlar): 108**

- **Tam olanlar: 52**
- **Kısmi olanlar: 22**
- **Hiç olmayanlar ("Yok"): 26**
- **N/A (bağlı olduğu mod/ekran zaten yok, ayrıca sayılmadı): 4**
- **Kodda olup tasarımda olmayanlar ("Ters fark"): 9**

**Hiç olmayanlar — öne çıkanlar (en büyük etkili):**
1. Motor 2 ekranı (Hangisi Farklı ve 4 alt modu) — tüm ekran
2. Motor 3 ekranı (Frekans Çakışması, 3 aşama) — tüm ekran
3. Seans Sonu ekranı — tüm ekran
4. Şıklı cevap modu (Motor 1)
5. A/B uzun basma → otomatik döngü
6. Odak aralığı seçimi (Bas/Orta/Tiz)
7. Seviye bilgisi sheet'i
8. Mod özel kulaklık uyarısı sheet'i
9. Menüdeki seviye/XP kartı
10. Geri bildirim kartındaki "Senin cevabın/Doğru cevap/Temiz" karşılaştırma

**Kodda olup tasarımda olmayanlar (9 — hepsi listelendi yukarıda, toplu):**
1. Boss round mekaniği
2. Combo XP çarpanı (tasarımda seri sayacı var ama XP'ye bağlı değil)
3. "Oyun Türü: Serbest/10 Soruluk Bölüm" ayarı
4. "Süre: Süreli/Süresiz" ayarı
5. Günlük Görevler paneli
6. Canlı istatistikler paneli (İlerleme)
7. Son turlar geçmişi
8. "İstatistikleri Sıfırla" butonu
9. Kalibrasyondaki özel "Referans dinleme seviyesi" iç slider'ı (tasarım donanım seviyesi okumasını varsayıyordu)

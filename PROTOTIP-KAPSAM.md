# PROTOTİP KAPSAMI — UI Durum Envanteri

*Audio Engineer Academy — gerçek koddan (index.html, app.js, core/*.js) çıkarılmış, TÜM ekran/modal/toast/boş-hata-yükleme/koşullu-görünüm envanteri. Kod içermez, sadece durum listesi.*

---

## 1. Ekranlar (11)

- **Ana Menü** — Koşul: uygulama varsayılan açılışı / "Antrenman" sekmesi — Seviye kartı, günün önerisi, egzersiz (mod) kartları ızgarası.
- **Oyun** — Koşul: bir mod kartına dokunulunca — Seçilen egzersizin soru-cevap akışının oynandığı ana ekran.
- **İlerleme** — Koşul: "İlerleme" sekmesi — Seviye/XP, günlük görevler, başarımlar, frekans bölgesi analizi, 30 günlük isabet grafiği, son cevaplar.
- **Araçlar** — Koşul: "Araçlar" sekmesi — Kendi mix dosyanı yükleyip analiz/referans filtreleriyle dinleme (Pro kilitli, yer tutucu).
- **Kalibrasyon** — Koşul: Ayarlar'dan veya ilk kurulumda açılır — Referans ton çalıp dinleme seviyesini 3 adımda ayarlama sihirbazı.
- **Sık Sorulan Sorular** — Koşul: Ayarlar → SSS — Statik soru-cevap listesi.
- **Geri Bildirim** — Koşul: Ayarlar → Geri bildirim — Serbest metinli öneri/hata formu (oyun-içi cevap geri bildiriminden AYRI).
- **Bize Ulaşın** — Koşul: Ayarlar → İletişim — Destek e-posta adresi.
- **Gizlilik / Kullanım Şartları** — Koşul: Ayarlar → ilgili link — Paylaşılan tek şablon, başlık JS'ten dolduruluyor.
- **Satın Alma (Paywall)** — Koşul: Ayarlar'dan genel giriş VEYA 6 kilit tetikleyicisinden biri — Pro plan karşılaştırması ve satın alma CTA'sı (bkz. §10, iki görsel modu var).
- **Seans Sonu** — Koşul: bir seans/round bittiğinde (3 farklı sebep, bkz. §9) — Skor, XP özeti, zayıf bölge yorumu.

---

## 2. Modallar / Bottom-Sheet'ler / Overlay'ler (8 sheet çifti + 2 özel örtü)

- **Kulaklık Uyarısı (hpSheet)** — Koşul: kulaklık gerektiren bir mod kartına (şu an sadece Reverb) dokunulunca, o mod için oturumda "bir daha gösterme" işaretlenmemişse — Kulaklık takmanın gerekliliğini anlatır. Kapanış: "Kulaklığım takılı, başla" / "Geri dön" / overlay'e dokunma.
- **Seviye Bilgisi (lvlSheet)** — Koşul: oyun ekranındaki seviye rozetine dokunulunca — O anki seviyenin hassasiyet detaylarını ve sıradaki seviyeye kalan XP'yi gösterir. Kapanış: "Kapat" / overlay.
- **Rehber "i" (guideSheet)** — Koşul: ana menüdeki genel "i", herhangi bir mod kartındaki "i", veya oyun ekranı içindeki "i"ye dokunulunca — Genel sistem rehberi ya da o modun ne öğrettiği + oyun seçenekleri. Kapanış: "Kapat" / overlay.
- **Oyun Ayarları (gameSettingsSheet)** — Koşul: oyun ekranındaki "..." ikonuna dokunulunca — Zorluk, Oyun Türü, Süre, Cevap biçimi ayarları + dosya yükleme + oyundan çık. Kapanış: "Kapat" / overlay.
- **Sınav Teklifi (examOfferSheet)** — Koşul: sınav sistemi açık bir modda (şu an sadece Kompresör) parkur içinde art arda 6 doğru cevap verilince otomatik açılır — Erken sınav hakkını, kalan soru sayısını, sınavın daha zor olacağını anlatır. Kapanış: SADECE "Sınava geç" / "Parkura devam et" (overlay'e dokunma kapatmaz — karar zorunlu).
- **Bölüm Geçildi (examPassSheet)** — Koşul: sınav geçilince otomatik açılır — "BÖLÜM GEÇTİN!" kutlaması, yeni seviye, yeni parkur başladığı bilgisi. Kapanış: SADECE "Devam Et" (overlay'e dokunma kapatmaz).
- **Genel Ayarlar (mainSettingsSheet)** — Koşul: herhangi bir sekmedeki dişli ikonuna dokunulunca — Bildirim/kulaklık uyarısı/geri bildirim ekranı anahtarları, Zorluk modu (Otomatik/Sabit), Hesap, Destek, Hakkında. Kapanış: "✕" / overlay / 90px'den fazla aşağı sürükleyip bırakma.
- **Jenerik Seçim Sheet'i (settingsSheet)** — Koşul: Kaynak / Odak aralığı / Cevap biçimi / Kaynak çifti / Zorluk (Sabit modda) / Oyun Türü / Süre satırlarından herhangi birine dokunulunca — TEK paylaşılan bileşen, hangi ayara bağlıysa onun seçeneklerini tek-seçmeli liste olarak gösterir (bazı seçenekler Pro kilitli olabilir). Kapanış: "İptal" / overlay / Escape / bir seçeneğe dokunma.
- **"Sabit'e geçmek ister misin?" (autoDiffAsk)** — Koşul: Oyun Ayarları açıkken, zorluk modu "Otomatik" iken "Zorluk" satırına dokunulunca (ayrı bir sheet-overlay çifti DEĞİL, Oyun Ayarları'nın içine gömülü küçük onay kutusu; ücretsiz kullanıcıda bu satır zaten Pro kilidine düştüğü için hiç görünmez) — Onay metni + "Sabit'e geç" / "Vazgeç" butonları. Kapanış: bir buton, veya Oyun Ayarları kapanınca otomatik sıfırlanır.
- **Spotlight Rehber Turu (spotlightOverlay)** — Koşul: bir moda ilk defa girildiğinde, o modun ilk 2 turunda otomatik başlar (sheet-overlay/bottom-sheet deseninden FARKLI, `pointer-events` geçirgen bir karartma) — Oyun ekranındaki ilgili kontrolleri sırayla "delikli" spotlight ile aydınlatıp adım adım anlatır. Kapanış: "Geç" (her an) veya her adımda "İleri", son adımda "Anladım".

*Not: "Kaynak çifti" (Frekans Çakışması) seçici ayrı bir modal değil — jenerik Seçim Sheet'inin bir kullanım örneği. `#cakismaCompare` (Önce/Sonra) ve `#cakismaOwnUploadBlock` modal değil, oyun ekranı içi satır-içi öğeler (bkz. §8).*

---

## 3. Toast Bildirimleri (geçici, ~2.4sn'de solmaya başlar, ~2.8sn'de kaybolur)

**Can / oturum sonu**
- **Can bitti** — Koşul: canlar 0'a düşünce (free kullanıcı, paywall bastırıldıysa fallback) — "💔 Oyun Bitti" / "Canların tükendi."

**Mod kartı kilidi (paywall ilk oturumda bastırıldığında fallback)**
- **Pro gerekli** — Koşul: kilitli Pro mod kartına dokunma — "Pro gerekli" / "Bu özellik Pro'da açılır."
- **Bugün oynadın** — Koşul: Frekans Çakışması günlük hakkı bitmişken karta veya "Tekrar Çal"a dokunma — "Bugün oynadın" / "...yarın tekrar gel."
- **Seviye yetersiz** — Koşul: kodlanmış ama seviye şartı karşılanmayan karta dokunma — "Seviye yetersiz" / "Bu egzersiz Seviye N'de açılır."
- **Yakında** — Koşul: henüz kodlanmamış bir mod kartına dokunma — "Yakında" / "Bu egzersiz yakında eklenecek."

**Ayarlar/oyun içi Pro kilitleri**
- **Yükleme kilidi** — Koşul: free kullanıcı upload tetikleyicisine/Araçlar'a dokunursa — "Pro gerekli" / "Kendi dosyanı yükleyip çalışmak Pro'da açılır." (Araçlar'da metin farklı.)
- **Serbest mod kilidi** — Koşul: Oyun Türü'nde kilitli "Serbest"e dokunma — "Pro gerekli" / "...ücretsizde oturum başına 5 soru."
- **Sabit zorluk kilidi** — Koşul: free kullanıcı Zorluk satırına/Sabit anahtarına dokunursa — "Pro gerekli" / "...ücretsizde zorluk Otomatik çalışır."
- **Bölge seçme kilidi** — Koşul: free kullanıcı "Bölge" satırına dokunursa — "Pro gerekli" / "Bölge seçerek çalışmak Pro'da açılır."

**Geliştirici modu (gizli, 7-dokunuşluk unlock)**
- **Geliştirici modu açıldı/kapatıldı** — Koşul: sürüm numarasına 1.2sn'de 7 kez dokunma / kapat butonu.
- **Dosya seçici tanı testi (4 alt sonuç)** — Koşul: geliştirici modunda test butonuna basma — Test başladı / Capacitor yok / Plugin kayıtlı değil / Başarılı / Plugin var ama dosya gelmedi.
- **FilePicker plugin bulunamadı** — Koşul: herhangi bir upload denemesinde native plugin yoksa — "Dosya seçici bulunamadı" / "...temiz build almak gerekebilir."
- **Native dosya seçme hatası** — Koşul: native seçici iptal-dışı hatayla reddederse — "Yükleme hatası" / "Dosya seçilemedi: {hata}."

**Günlük görev / başarım**
- **Günlük görev tamamlandı** — Koşul: bir günlük görevin hedefine ulaşılınca — "📅 Günlük görev tamamlandı" / görev adı + XP.
- **Yeni başarım kazanıldı** — Koşul: bir rozet yeni açılınca (her rozet için ayrı toast) — rozet ikonu+adı / açıklaması.

**Sıfırlama / geri bildirim / satın alma simülasyonu**
- **Her şeyi sıfırla** — Koşul: Ayarlar → Sıfırla — "🔄 Sıfırlandı" / "Her şey baştan."
- **Boş geri bildirim** — Koşul: metin boşken Gönder'e basma — "Boş görünüyor" / "...birkaç kelime yaz."
- **Geri bildirim gönderildi** — Koşul: geçerli metinle gönderim (backend yok) — "Teşekkürler" / "Geri bildirimin alındı."
- **Satın alma geri yükleme** — Koşul: "Geri yükle" (Ayarlar veya Paywall) — "Kontrol edildi" / "...geri yüklenecek bir satın alım bulunamadı."
- **Pro açıldı (simülasyon)** — Koşul: Paywall'da "Pro Al" (gerçek IAP yok) — "🎉 Pro açıldı (simülasyon)" / özellik listesi.
- **Reklam izlendi (simülasyon)** — Koşul: sadece can-bitti paywall'ında "Reklam İzle" — "🎬 Reklam izlendi (simülasyon)" / "+1 can."

*Not: dosya yükleme DOĞRULAMA hataları (yanlış format/çok büyük/okunamadı/boş) TOAST DEĞİL — `#feedbackBox` sonuç-kartında kalıcı gösterilir, bkz. §6.*

---

## 4. Kalıcı Satır-İçi Banner / Uyarılar

- **Kulaklık/sessiz-anahtar notu** — Koşul: Ana Menü'de koşulsuz, her zaman görünür, kapatılamaz — "🎧 En iyi sonuç için kulaklık kullan..." *(Bilinen tutarsızlık: bir kod yorumu bunun bir ayarla gizlenebildiğini iddia ediyor ama gerçek davranışta ayar bu banner'ı etkilemiyor.)*
- **Bugünün Önerisi kartı** — Koşul: en az bir bölgede ≥2 tur verisi varsa VE daha önce kapatılmadıysa — En zayıf bölge + isabet yüzdesi, "Seti başlat"/"Şimdi değil" butonları. Kapanış: "×" veya "Şimdi değil" → kalıcı olarak gizlenir.
- **Mod kartı kilit satırı** — Koşul: kart oynanabilir değilse — 3 varyant: "🔒 Seviye N'de açılır" / "🔒 Pro gerekli" / "🔒 Bugün oynadın · yarın tekrar." Koşul değişince otomatik kaybolur.
- **Paywall bağlamsal bandı** — Koşul: paywall 6 tetikleyiciden biriyle açıldıysa görünür, genel girişte gizli — Kicker/başlık/detay ile "neden buradasın" açıklaması.
- **Boss round rozeti (bossChip)** — Koşul: ilk soru kurulduktan sonra kalıcı görünür (Boss/Normal metni değişir) *(Bilinen tutarsızlık: görsel olarak "Boss" ile "Normal" arasında renk/stil farkı yok, sadece metin değişiyor).*
- **Kombo/challenge durumu metni (streakText)** — Koşul: tasarlanmış ama kod bir görünürlük hatası yüzünden HİÇBİR ZAMAN görünmüyor *(ölü/bağlı olmayan bir özellik — prototipte "şu an pasif" olarak işaretlenmeli).*

---

## 5. Boş Durumlar

- **İsabet grafiği boş durumu** — Koşul: 3'ten az gün verisi varsa — Grafik yerine "Grafik için en az birkaç günde tur oynaman gerekiyor..." metni.
- **Frekans bölgesi çubuğu — veri yok** — Koşul: bir bölgede hiç tur oynanmamışsa — Çubuk gri, yüzde yerine "—".
- **"En zayıf bölge" özeti — yetersiz veri** — Koşul: hiçbir bölgede 2+ tur yoksa — "henüz yeterli veri yok."
- **"Şu an neredesin" kartı — yetersiz veri** — Koşul: 2'den az bölgede yeterli veri varsa — "Birkaç tur daha oynayınca burada kişisel bir özet göreceksin."
- **Mod seviyeleri listesi — hiç oynanmamış satır** — Koşul: bir modun XP'si 0 ise — Satır soluklaşır, "Yeni" etiketi, isabet yerine "—".
- **Son cevaplar listesi boş** — Koşul: hiç tur oynanmamışsa — 📝 "Henüz kayıt yok" / "İlk turdan sonra son cevapların burada görünür."
- **Başarımlar — kilitli rozet** — Koşul: rozet henüz kazanılmamışsa — Tüm rozetler her zaman listelenir, kazanılmamışlar soluk+gri tonlu gösterilir (ayrı bir "hiç rozet yok" durumu yok).
- **Günlük görevler / restore-purchase / kilitli-kart durumları** — bu üçü gerçek bir "boş liste" değil, sabit üretilen içerik ya da toast (bkz. §3) — envanterde ayrı ele alındı, burada tekrar edilmedi.

---

## 6. Hata Durumları

- **Desteklenmeyen dosya türü** — Koşul: uzantı izin verilen listede değil — `#feedbackBox`: "Desteklenmeyen dosya türü" / desteklenen uzantılar listesi.
- **Dosya çok büyük** — Koşul: 100 MB sınırı aşılırsa — "Dosya çok büyük" / "...daha kısa bir ses dosyası dene."
- **Dosya okunamadı** — Koşul: dosya okuma istisnası — "Dosya okunamadı" / "...farklı bir dosya dene."
- **Dosya boş** — Koşul: okunan veri 0 byte — "Dosya boş" / "...farklı bir dosya dene."
- **Bu dosya açılamadı (decode hatası)** — Koşul: ses decode + elle WAV ayrıştırma ikisi de başarısız — "Bu dosya açılamadı" / "mp3, m4a veya WAV dene." (WAV'a özgü alt hatalar bu tek genel mesaja indirgenir.)
- **Yükleme hatası (beklenmeyen istisna)** — Koşul: yükleme işlemi sırasında öngörülmeyen hata — "Yükleme hatası" / "...farklı bir mp3/wav dene."
- **Dosya seçilemedi (native picker)** — Koşul: native seçici iptal-dışı hata verirse — toast: "Yükleme hatası" / "Dosya seçilemedi: {hata}." (Kullanıcı iptal ederse sessizce çıkılır, hata gösterilmez.)
- **Örnek ses yüklenemedi — sessiz düşme** — Koşul: gömülü örnek dosya ağ/decode hatası verirse — Kullanıcıya HİÇBİR mesaj gösterilmez, sessizce pink noise'a düşülür (fark edilmesi zor bir durum).
- **Boş geri bildirim formu** — bkz. §3 (toast olarak zaten listeli).
- **Genel "bir şeyler ters gitti" mesajı** — YOK — her hata kendi özel Türkçe metnini taşıyor, ortak bir fallback tanımlı değil.

---

## 7. Yükleniyor / Bekleme Durumları

- **Genel bulgu: hiçbir spinner/ilerleme göstergesi yok.** Dosya yükleme ve ses decode işlemleri arayüzde ara bir "yükleniyor" durumu göstermeden, buton basımından sonuca (başarı veya hata kartı) direkt geçiyor — büyük dosyalarda (100 MB'a kadar) bu bir prototipleme boşluğu olarak işaretlenmeli.
- **"Test başladı" (sadece geliştirici modu)** — Koşul: dosya seçici tanı testi başlatılınca — toast: "Test başladı" (gerçek bir ilerleme göstergesi değil, tek seferlik bildirim).

*Not: izinle ilgili (mikrofon/depolama) hiçbir UI durumu yok — uygulama mikrofon kullanmıyor, dosya seçimi native picker/`<input type="file">` üzerinden, uygulama seviyesinde bir "izin reddedildi" ekranı tanımlı değil.*

---

## 8. Oyun Ekranı İçi Koşullu Durumlar (moda göre değişen)

- **Cevap biçimi seçici** — Koşul: sadece Frekans Bulma'da (diğer 9 mod her zaman şıklı) — "Dokunmalı/Şıklı" chip'i + Oyun Ayarları satırı görünür.
- **Odak aralığı seçici** — Koşul: sadece Frekans Bulma'da — "Bas/Orta/Tiz/Tüm spektrum" chip'i görünür.
- **Kaynak seçim bloğu — tekli (varsayılan)** — Koşul: Frekans Çakışması DIŞINDAKİ 9 modda — Tek "Kaynak" chip'i + tekli yükleme satırı.
- **Kaynak seçim bloğu — çift (Frekans Çakışması)** — Koşul: sadece Frekans Çakışması'nda — Kaynak-çifti chip'i; çift="Kendi Dosyalarım" seçiliyse ayrıca iki ayrı yükleme yuvası oyun ekranının içinde açılır.
- **A/B toggle — gizli** — Koşul: Frekans Çakışması'nda — Buton tamamen kaldırılır (bu modun kendi Önce/Sonra karşılaştırması var).
- **A/B toggle — iki-yönlü (varsayılan)** — Koşul: Motor 1 modlarında + Tonal Denge'de — "A/B Test" başlığı, sadece A/B pilleri, altında "Basılı tut: döngü" ipucu.
- **A/B toggle — üç-yönlü** — Koşul: Kompresör/Reverb/Distortion'da — "A/B/C Test" başlığı, C pili de görünür, round başında döngü OTOMATİK başlar.
- **A/B toggle — "Döngü" durumu** — Koşul: 520ms basılı tutulunca (ya da three-way'de otomatik) — Buton amber vurgulu, başlık "Döngü" olur, ipucu metni gizlenir, 2sn'de bir otomatik geçiş.
- **Boss round rozeti** — bkz. §4 (kalıcı banner olarak zaten listeli).
- **Kalpler** — Koşul: her zaman görünür — Dolu/boş kalp sayısı değişir, kritik-can için ayrı bir görsel efekt yok.
- **Spotlight rehber turu** — bkz. §2.
- **Oyun içi "i" bilgi butonu** — Koşul: her zaman görünür — Aktif modun rehber sheet'ini açar.
- **Önce/Sonra karşılaştırma butonları (Frekans Çakışması)** — Koşul: sadece Aşama 3 cevaplandıktan hemen sonra (doğru/yanlış fark etmeksizin) — "Sonra" varsayılan aktif başlar.
- **Kompakt analizör modu** — Koşul: sadece Tonal Denge'de — Spektrum canvas'ı küçülür, kaydırıcı arayüzüne yer açılır.
- **Arka plan spektrum çubukları — gizli** — Koşul: dB Seviyesi ve Frekans Çakışması'nda — Genel FFT çubukları hiç çizilmez, kendi özel görselleri kullanılır.
- **İpucu etiketi/maskesi** — Koşul: "İpucu Ver" kullanılınca — Analizör üstünde "İPUCU · ..." etiketi + kısmi karartma maskesi belirir, yeni soruda temizlenir.
- **Üç-yönlü kartlarda "çalıyor" vurgusu** — Koşul: three-way modlarda o an hangi kart çalıyorsa — Kenarlık/arka plan amber, ışıldama efekti, durum metni "Çalınıyor" olur.

---

## 9. Sonuç Ekranı — Bitiş Nedenine Göre Varyantlar

- **Canlar bitti** — Koşul: seans canlar tükenerek bitti — Kicker "CANLARIN BİTTİ" (kırmızı), can dolum süresine dayalı uyarı satırı, seviye-atladın rozeti BASTIRILIR (olumsuz kapanışta gösterilmez).
- **Ücretsiz oturum bitti** — Koşul: free kullanıcı 5-soru sınırına ulaştı — Kicker "ÜCRETSİZ OTURUM BİTTİ" (amber), paywall kilit mesajı uyarı satırında, seviye atladıysa rozet gösterilir.
- **Seans tamamlandı** — Koşul: 10 soru kayıpsız bitti — Kicker "SEANS TAMAMLANDI" (yeşil), uyarı satırı boş/gizli, seviye atladıysa rozet gösterilir.
- **Bölge haritası vs sıra özeti** — Koşul: session frekans-temelli veri içeriyorsa nokta haritası, içermiyorsa (proplus/çok bantlı) yeşil/kırmızı kutu dizisi — bitiş nedeninden bağımsız.

*Bilinen tutarsızlık: "10 soru daha"/"Tekrar oyna"/"Menüye dön" CTA butonlarının metni üç bitiş nedeninde de AYNI kalıyor — kod bunları nedene göre değiştirmiyor.*

---

## 10. Paywall Ekranı — Genel vs Bağlamsal

- **Genel giriş** — Koşul: Ayarlar → "Pro'ya geç" veya Araçlar kilit örtüsü — Bağlamsal bant gizli, "Reklam İzle" gizli, "Satın alımları geri yükle" görünür, alt buton "Ücretsiz devam."
- **Bağlamsal giriş** — Koşul: 6 kilit tetikleyicisinden biri (oturum sınırı/can bitti/mod kilitli/upload/günlük hak/bölge geçmişi/serbest mod) — Üstte renkli "neden buradasın" bandı, "Geri yükle" gizli, alt buton "Kapat."
- **Bağlamsal — "livesOut" alt-varyantı** — Koşul: can bitti tetiklemesi — Ek olarak "📺 Reklam izle · can doldur" butonu görünür (TEK bu nedende), alt buton metni "Şimdi değil" olur.

---

## 11. İlerleme Ekranı — Akordeonlar ve Kilitler

- **Bölge / Mod seviyeleri panelleri** — Koşul: başlık satırına dokunma, varsayılan KAPALI — Kapalıyken sadece özet satır görünür, açılınca detay listesi + 180° dönen ok işareti.
- **Bölge geçmişi bulanıklaştırma** — Koşul: free kullanıcı — Liste `blur(5px)` ile bulanık gösterilir, dokununca ilgili paywall açılır; panel kapalıyken bile özet satırı tam kilitli metne döner ("Pro'da açılır").
- **"Şu An Neredesin" önerisi — kilitli** — Koşul: free kullanıcı — Kişiselleştirilmiş öneri yerine sabit paywall kilit mesajı.

---

## 12. Mod Kartı Durumları (Ana Menü ızgarası)

- **Oynanabilir + kilitsiz** — İlerleme mini-çubuğu + "Sv N" seviye rozeti, tam opak arka plan.
- **Seviyeyle kilitli VEYA henüz kodlanmamış** — Görsel olarak AYIRT EDİLEMEZ, ikisi de aynı "🔒 Seviye X'te açılır" satırını gösterir; sadece tıklama toast'ı farklıdır ("Seviye yetersiz" / "Yakında").
- **Pro gerektiren (kilitli)** — "🔒 Pro gerekli" satırı, tıklanınca ilgili paywall açılır.
- **Günlük hak kullanılmış** — "🔒 Bugün oynadın · yarın tekrar" satırı.
- **"Pro" rozeti** — Katalogda `tier:"pro"` işaretli her modda, kilitli/kilitsiz fark etmeksizin her zaman görünür.
- **"i" bilgi rozeti** — Sadece gerçek rehber metni yazılmış (kodlanmış) modlarda; kilitli kartlarda bile ayrı tıklama alanıyla çalışır.

---

## 13. Kalibrasyon Ekranı

- **Ayarlar satırı özeti** — Koşul: `calibrationDone` durumuna göre — "Tamamlanmadı · ..." veya "Tamamlandı ✓ · ..."
- **3 adımlı sihirbaz** — Koşul: adım 1/2/3 — Her adımda başlık/gövde/CTA metni ve adım noktaları tamamen değişir (1: hazırlık, 2: referans tonu ayarla, 3: bitiş).
- **Referans ton çalma durumu** — Koşul: ton çalıyor mu — Buton metni "Referans tonu çal" ↔ "Tonu durdur", seviye metresi canlı animasyona geçer.

---

## Bilinen Tutarsızlıklar (prototipleme sırasında dikkat edilmeli)

1. Kulaklık uyarı banner'ı (§4) bir ayarla kapatılabiliyormuş gibi yorumlanmış ama gerçekte kapatılamıyor.
2. `bossChip` (§4/§8) her round'da kalıcı görünüyor, "Boss" ile "Normal" arasında sadece metin farkı var, ayrı bir görsel stil yok.
3. `streakText` (kombo durumu metni, §4) kodda tasarlanmış ama bir görünürlük hatası yüzünden hiçbir zaman görünmüyor.
4. Sonuç ekranı (§9) CTA buton metinleri, bitiş nedeninden bağımsız olarak hep aynı.
5. Mod kartı "seviyeyle kilitli" ile "henüz kodlanmamış" durumları (§12) görsel olarak birbirinden ayırt edilemiyor.

# STRES TESTİ

Bu dosya, otomatik testlerin (`npm test`) kapsamadığı — gerçek cihazda,
gerçek işletim sistemi davranışıyla elle denenmesi gereken uç durum
senaryolarını listeler. Kaynak kod okunarak doğrulanamaz (bkz. CLAUDE.md).

Her madde numaralanır. Bir madde denendiğinde sonucu (geçti/geçmedi, tarih,
cihaz/iOS sürümü, gözlemlenen davranış) bu dosyaya not düşülür — "denendi"
denilen ama sonucu yazılmayan madde, denenmemiş sayılır.

## CİHAZ VE SES OTURUMU

1. Şarkı/soru çalarken ekranı kilitle, 5 sn bekle, kilidi aç, SADECE
   play'e bas. Ses kaldığı yerden gelmeli, "Atla" gerekmemeli, hiçbir
   uyarı ekranı çıkmamalı. (G155'te masaüstünde Playwright ile
   `document.hidden`/`visibilitychange` simülasyonuyla doğrulandı —
   cihazda GERÇEK kilit ile henüz denenmedi.)
2. Bluetooth kulaklık tak, ses çalarken çıkar, tekrar tak. Her adımda
   ses düzgün devam etmeli/kesilmemeli — AVAudioSession route
   değişiminin (`routeChangeNotification`) en sık tetikleyicisi budur.
3. Kablolu kulaklık tak/çıkar, aynı kontrol (madde 2 ile aynı senaryo,
   farklı donanım yolu — route change farklı tetiklenebilir).
4. Arama gelirken oyun oyna, arama bitince devam et — ses oturumu araya
   giren çağrıdan (interruption) sonra doğru kurtarmalı, madde 1'deki
   AYNI kurtarma zincirinin telefon çağrısı için de çalıştığı doğrulanmalı.
5. Uygulamayı 10 dakika arka planda bırak, geri dön — iOS uygulamayı
   bellekten atmış olabilir; ilerleme/ayarlar/kütüphane durumu
   (localStorage/Capacitor Preferences) korunmuş mu.

## SİSTEM DURUMLARI

6. Düşük Güç Modu açıkken tüm modları gez — iOS bazı arka plan/CPU
   işlemlerini kısıtlıyor, ses zincirinde gecikme/kesinti/analiz
   döngüsünde (`requestAnimationFrame`) yavaşlama var mı.
7. Uçak modu açıkken uygulama açılıyor mu, tüm modlar çalışıyor mu
   (backend yok, tüm veri localStorage'da — teorik olarak etkilenmemeli,
   cihazda doğrulanmalı).
8. Depolama neredeyse doluyken büyük dosya yükle — hata mesajı doğru
   çıkıyor mu, uygulama çökmüyor mu, yarım kalan bir dosya kütüphanede
   bozuk bir kayıt bırakmıyor mu.
9. Sessiz anahtarı açık/kapalı — iki durumda da ses davranışı
   (AVAudioSession kategorisi playback ise sessiz anahtarından
   etkilenmemesi beklenir, cihazda doğrulanmalı).

## YÜK VE HIZ

10. Art arda 10 moda hızlı girip çık — bellek sızıntısı, ses birikmesi
    (aynı anda birden fazla ses kaynağının çalması/üst üste binmesi)
    var mı.
11. Aynı oturumda 5 farklı dosya yükle — hepsi kütüphanede doğru
    saklanıyor mu (isim/boyut/süre metadata'sı doğru mu, biri diğerinin
    yerine geçmiyor mu).
12. 100 MB sınırına yakın dosya yükle — decode süresi, UI donması,
    başarısız olursa hata mesajının doğru çıkması.
13. Çok kısa dosya (5 sn altı) yükle — seek/loop/analiz modüllerinde
    sıfıra bölme, negatif süre ya da NaN gibi kenar durumları var mı
    (bkz. G159'un seek-sınırı bug'ı — kısa dosyada üst sınır kenetlemesi
    özellikle kırılgan).
14. Mono dosya yükle — stereo genişlik/mid-side gibi kanal-farkına
    dayanan modüllerde beklenen uyarılar (ör. "bu dosya mono, stereo
    ölçüm anlamsız") doğru çıkıyor mu.

# NOTES

## Açık sorunlar (28.07.2026)

**1. Duraksama — pause sonrası ilk play**
Durdurup tekrar başlatınca ses takılarak/duraksayarak giriyor, sonra düzeliyor.
Muhtemel sebep: pause sırasında buffer boşalıyor, play() çağrısı yeterli veri
hazır olmadan başlıyor. Bakılacak: 'canplay' / 'waiting' event'leri,
preload ayarı, pause yerine gain node üzerinden sessize alma seçeneği.

**2. Oyun cansız başlıyor**
Uygulama ilk açıldığında zorluk orta seviyede geliyor (doğru), ancak can
sayısı sıfır olarak başlıyor. Başlangıç can değerinin nerede atandığı
kontrol edilecek — muhtemelen state başlatılırken varsayılan atlanıyor
ya da UI render'ı state'ten önce çalışıyor.

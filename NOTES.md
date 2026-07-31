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

## Bilinen bug'lar (refactor'de bilerek korundu) (31.07.2026)

**1. loseLife() zengin geri bildirimi eziyor**
Yanlış cevapta kullanıcı sadece "Can kaybettin · Kalan can: N" görüyor.
Ayrıntılı açıklama (doğru frekans, bölge bilgisi) freqInfo panelinde
kalıyor. Orijinal davranış buydu, refactor'de değiştirilmedi.

**2. level_5 başarımı hiç tetiklenmiyor**
levelFromXp(s.xp) kontrolü yapılıyor ama stats.xp diye bir alan yok,
koşul her zaman false. Orijinalde de böyleydi.

**3. Odak aralığı özelliği kodda yok**
Tasarımda "Odak: Tüm spektrum / Bas / Orta / Tiz" chip'i var ama
uygulamada karşılığı yok. Tasarım aktarımında eklenecek.

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

## Açık işler (31.07.2026)

**1. Geri bildirim kartı ilk saniyelerde kesiliyor**
Kart açıldığı an alt aksiyon çubuğunun altında kalıyor, birkaç saniye
sonra kendini düzeltiyor. Telefonda ölçüldü: fark=-209 → -170 → +21.
Padding hesabı doğru ama layout hesaplanmadan ölçüm yapılıyor.
Çözüm yönü: requestAnimationFrame zinciri veya kart görünür olmadan
önce güvenli padding verip sonra kesinleştirme.
Ölçüm komutu (Safari konsolu, Hatalar filtresi açık):
```
setInterval(()=>{const fb=document.querySelector('#gameScroll .fb');
const b=document.getElementById('gameActionbar');
if(fb&&fb.getBoundingClientRect().height>0){console.error('FB fark='+
Math.round(b.getBoundingClientRect().top-fb.getBoundingClientRect().bottom))}},1000)
```
Kabul kriteri: ilk ölçümde bile fark ≥ +16

**2. Kalibrasyon — sarı seviye çizgisi dokunmatik olmalı**
Ekrandaki seviye göstergesi parmakla sürüklenerek ayarlanabilsin.

**3. A/B Test gerçek bypass değil**
Buton tasarıma göre görünüyor ama playQuestion() zinciri sıfırdan
kuruyor; ses baştan başlıyor. Mixteki bypass gibi kesintisiz geçiş
için ses motoruna paralel bir bypass yolu gerekiyor.

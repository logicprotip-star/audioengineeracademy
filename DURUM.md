# DURUM

Son güncelleme: 31.07.2026

> Bu dosya yeni sohbetlerin tek doğruluk kaynağıdır.
> Her seans sonunda Claude Code tarafından güncellenir, commit'e dahil edilir.

## BİTTİ

Commit `f0e144a` — 14 mod menüsü + mode-catalog:

- 14 modun tamamı menüde; `www/js/core/mode-catalog.js` eklendi (sadece görüntüleme
  meta'sı, oyun mantığı yok)
- Rozet vitrini sayacı — `stats.unlocked` / `progress.ACHIEVEMENTS.length` ile canlı
- Motor bazlı gruplama ve renkler (Motor 1 turuncu, 2 mavi, 3 mor)
- Kilit kartlarında `unlockLevel` etiketi
- Ölçüm: son kart alt kenarı ↔ sekme çubuğu üst kenarı = 62px
- `npm test` 46/46, konsol temiz

Öncesindeki mimari (core modülleri + mod kayıt sistemi) commit'li.

## AÇIK İŞLER

### Bug'lar

**1. Geri bildirim kartı ilk saniyelerde alt bar'ın altında**
Kart açıldığı an aksiyon çubuğunun altında kalıyor, birkaç saniye sonra düzeliyor.
Telefonda ölçüldü: fark = −209 → −170 → +21. Padding hesabı doğru, layout
hesaplanmadan ölçüm yapılıyor.
Çözüm yönü: `requestAnimationFrame` zinciri veya kart görünür olmadan önce güvenli
padding, sonra kesinleştirme.
Ölçüm komutu (Safari konsolu, Hatalar filtresi açık):
```js
setInterval(()=>{const fb=document.querySelector('#gameScroll .fb');
const b=document.getElementById('gameActionbar');
if(fb&&fb.getBoundingClientRect().height>0){console.error('FB fark='+
Math.round(b.getBoundingClientRect().top-fb.getBoundingClientRect().bottom))}},1000)
```
**Kabul kriteri:** ilk ölçümde bile fark ≥ +16

**2. Pause sonrası ilk play'de duraksama**
Durdurup tekrar başlatınca ses takılarak giriyor, sonra düzeliyor. Muhtemel sebep:
pause sırasında buffer boşalıyor, `play()` yeterli veri hazır olmadan başlıyor.
Bakılacak: `canplay` / `waiting` event'leri, `preload` ayarı, pause yerine gain node
üzerinden sessize alma.
**Kabul kriteri:** 10 ardışık pause→play denemesinde `waiting` event'i 0 kez tetiklenmeli

**3. Oyun 0 canla başlıyor**
İlk açılışta zorluk doğru (orta) ama can sayısı sıfır. Başlangıç can değerinin
nerede atandığı kontrol edilecek — state başlatılırken varsayılan atlanıyor ya da
UI render'ı state'ten önce çalışıyor olabilir.
**Kabul kriteri:** temiz `localStorage` ile açılışta can = tanımlı başlangıç değeri

**4. `loseLife()` zengin geri bildirimi eziyor**
Yanlış cevapta kullanıcı sadece "Can kaybettin · Kalan can: N" görüyor. Ayrıntılı
açıklama (doğru frekans, bölge bilgisi) `freqInfo` panelinde kalıyor.
Refactor'de bilerek korundu, orijinal davranış buydu.
**Kabul kriteri:** yanlış cevapta hem can mesajı hem doğru frekans/bölge bilgisi
aynı kartta görünür

**5. `level_5` başarımı hiç tetiklenmiyor**
`levelFromXp(s.xp)` kontrolü yapılıyor ama `stats.xp` diye bir alan yok — koşul her
zaman false. Orijinalde de böyleydi.
**Kabul kriteri:** doğru alan bağlandıktan sonra test verisiyle seviye 5'e ulaşınca
rozet açılıyor

### Eksik özellikler

**6. A/B Test gerçek bypass değil**
Buton tasarıma göre görünüyor ama `playQuestion()` zinciri sıfırdan kuruyor, ses
baştan başlıyor. Mixteki bypass gibi kesintisiz geçiş için ses motoruna paralel
bypass yolu (kuru/işlenmiş iki zincir + gain crossfade) gerekiyor.
**Kabul kriteri:** A/B geçişinde `currentTime` sıfırlanmıyor, geçiş kesintisiz
**Not:** Kesim Noktası modundan ÖNCE yapılmalı — o modun tüm değeri bu karşılaştırmada

**7. Kalibrasyon — sarı seviye çizgisi dokunmatik olmalı**
Ekrandaki seviye göstergesi parmakla sürüklenerek ayarlanabilsin.

**8. Odak aralığı özelliği kodda yok**
Tasarımda "Odak: Tüm spektrum / Bas / Orta / Tiz" chip'i var, uygulamada karşılığı yok.

**9. Seans sonu ekranı yok**

**10. İlerleme sekmesi prototiple örtüşmüyor**
Bölümler var, düzen farklı. `Dizayn/prototype.html` referans.

### Yayın öncesi

**11. Logo / uygulama ikonu yapılmadı**
Capacitor `resources/icon.png` + `resources/splash.png`, `@capacitor/assets` ile üretilir.
Store yüklemesinden önce gerekli, şimdi öncelikli değil.

## BEKLEYEN KARARLAR

**A. Kart metni tek kaynağa inecek mi?**
Şu an Frekans Bulma'nın metni `getMeta()`'dan, diğer 13'ü `MODE_CATALOG`'tan geliyor.
İkinci mod yazılmadan karar verilmeli, yoksa drift eder.
Öneri: katalog tek görüntü kaynağı, `getMeta()` sadece oyun mantığı meta'sı.

**B. Kilit tipleri**
Üç ayrı durum tek state'e sıkışmış: (1) henüz kodlanmadı, (2) seviye yetersiz,
(3) Pro gerektiriyor. Kart "Seviye 5'te açılır" derken tıklayınca "Yakında" toast'ı
çıkıyor — çelişkili vaat.
14 modun kaçı Pro, kaçı seviyeyle açılıyor? Mevcut `unlockLevel` değerleri
kullanıcı tarafından belirlenmedi.

**C. Rozet sayısı**
Gerçek liste 9 rozet. Hedef 12 miydi? Öyleyse eksik 3 tanımlanmalı.

## SIRADAKİ

1. madde — geri bildirim kartı konumu.

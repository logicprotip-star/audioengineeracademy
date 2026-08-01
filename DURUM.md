# DURUM

Son güncelleme: 01.08.2026

> Bu dosya yeni sohbetlerin tek doğruluk kaynağıdır.
> Her seans sonunda Claude Code tarafından güncellenir, commit'e dahil edilir.

## BİTTİ

Commit `abd17e4` — G1: başarım denetimi (9 rozetin TAMAMI tarandı):

| Rozet | Koşul | Okuduğu alan | Alan var mı | Tetiklenebilir mi | Düzeltildi mi |
|---|---|---|---|---|---|
| İlk Kulak | `s.correct >= 1` | `stats.correct` | Evet (`app.js:1205,1275`) | Evet | Gerek yoktu |
| Alev Zinciri | `s.bestCombo >= 5` | `stats.bestCombo` | Evet (`app.js:1207,1277`) | Evet | Gerek yoktu |
| Şimşek Kulak | `s.bestCombo >= 10` | `stats.bestCombo` | Evet | Evet | Gerek yoktu |
| Dayanıklılık | `s.rounds >= 25` | `stats.rounds` | Evet (`app.js:1172,1201,1270`) | Evet | Gerek yoktu |
| EQ Beyni | `s.rounds >= 100` | `stats.rounds` | Evet | Evet | Gerek yoktu |
| Keskin Hedef | `rounds>=20 && accuracy>=70` | `stats.correct`/`stats.rounds` | Evet | Evet | Gerek yoktu |
| Yükseliş (level_5) | `levelFromXp(s.xp)>=5` | `stats.xp` | **Yok** — hiç böyle bir alan yazılmamış, sadece `stats.perDiff[key].xp` var | **Hayır (her zaman false)** | **Evet** — `totalXp()` helper eklendi, tüm zorlukların XP'si toplanıyor |
| Pro Kulak | `s.proCorrect >= 8` | `stats.proCorrect` | Evet (`app.js:1214`) | Evet | Gerek yoktu |
| Boss Avcısı | `s.bossWins >= 1` | `stats.bossWins` | Evet (`app.js:1215,1284`) | Evet | Gerek yoktu |

Sonuç: 8/9 rozet zaten sağlamdı, sadece `level_5` kırıktı — kod `www/js/core/progress.js`.
TASARIM.md'de kayıtlı "tasarımda 6, kodda 9 rozet" farkı bu denetimle çözülmedi —
hangi setin kalacağı ürün kararı, bkz. BEKLEYEN KARARLAR **C**.

Commit `ac505c3` — G2: seans sonu ekranı (TASARIM.md EKRAN 5, madde 9 kapandı):

- Eski küçük "Oyun Bitti" modalı kaldırıldı (`#gameoverOverlay` + ilgili CSS silindi),
  `#screen-result` adında tam ekran eklendi — prototype.html'deki yapı/metin/sıra
  birebir aktarıldı (sonuç halkası, seviye atladın kartı, XP kartı+bar, seri/ipucu
  istatistikleri, bölge haritası/soru sırası, yorum cümlesi, 3 CTA).
- "Canların bitti" ve normal tamamlanma ayrı varyasyon; ikisi de canlı state'ten
  okunuyor, uydurma veri yok.
- Veri kaynağı olmayan iki alan tasarımdan bilerek çıkarıldı: önceki seans
  karşılaştırması (`resLead` normal varyantta), öneri kartı (`resSug` — "odak seti"
  özelliği kodda yok).
- CTA'lar gerçek işlev görüyor: "10 soru daha" her zaman yeni 10 Soruluk Bölüm
  başlatıyor, "Tekrar oyna" aynı modda (serbest/bölüm) yeniden başlıyor, "Menüye dön"
  ana menüye çıkıyor. Üçü de can sıfırken sessizce yeni tur başlatmıyor.
- Doğrulama sırasında gerçek bug bulundu ve düzeltildi: can sıfırken "Tekrar oyna"
  önceki turun kalıntı soru başlığını (`questionTitle`) ve sonuç kartını (`freqInfo`)
  temizlemiyordu — `startRound()` çağrılmadığı için bu elemanları sıfırlayan kod hiç
  çalışmıyordu, ekranda "canların bitti" yerine eski yanlış/doğru cevap kartı
  görünmeye devam ediyordu. Konsoldan `currentLives`/`startRound` çağrı izi alınarak
  doğrulandı (tahminle değil), üç ayrı DOM elemanı (`freqInfo`, `questionTitle`,
  `questionMeta`) guard branch'e eklendi.
- `npm test`: G1 öncesi 62/62, G1+G2 sonrası 62/62 — regresyon yok, konsol hatası yok.

Öncesindeki mimari (core modülleri + mod kayıt sistemi + 14 mod menüsü) commit'li.

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

### Eksik özellikler

**5. A/B Test gerçek bypass değil**
Buton tasarıma göre görünüyor ama `playQuestion()` zinciri sıfırdan kuruyor, ses
baştan başlıyor. Mixteki bypass gibi kesintisiz geçiş için ses motoruna paralel
bypass yolu (kuru/işlenmiş iki zincir + gain crossfade) gerekiyor.
**Kabul kriteri:** A/B geçişinde `currentTime` sıfırlanmıyor, geçiş kesintisiz
**Not:** Kesim Noktası modundan ÖNCE yapılmalı — o modun tüm değeri bu karşılaştırmada

**6. Kalibrasyon — sarı seviye çizgisi dokunmatik olmalı**
Ekrandaki seviye göstergesi parmakla sürüklenerek ayarlanabilsin.

**7. Odak aralığı özelliği kodda yok**
Tasarımda "Odak: Tüm spektrum / Bas / Orta / Tiz" chip'i var, uygulamada karşılığı
yok. Seans sonu ekranındaki öneri kartı (`resSug`) da bu yüzden G2'de eklenmedi.

**8. İlerleme sekmesi prototiple örtüşmüyor**
Bölümler var, düzen farklı. `Dizayn/prototype.html` referans.

### Yayın öncesi

**9. Logo / uygulama ikonu yapılmadı**
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

**C. Rozet sayısı ve seti**
Kod 9 rozet tanımlıyor (G1 denetimiyle 9'u da artık gerçekten tetiklenebiliyor),
TASARIM.md'de tasarımda 6 rozet olduğu ve isimlerin örtüşmediği kayıtlı. Hangi
setin kalacağı (6, 9, yoksa birleşim mi) ürün kararı — kodlanmadı.

**D. Can dolumu**
`www/js/core/storage.js:91` — uygulama yeniden açıldığında can 0 ise otomatik
`TOTAL_LIVES`'a (5) çekiliyor (bilinçli ödün, seans içinde dolum YOK). Gerçek bir
"30 dakikada dolum" mekanizması hâlâ kodda yok; prototype.html'nin seans sonu
ekranındaki "Canlar 30 dakikada dolar" metni bu yüzden G2'de kullanılmadı, yerine
dürüst "can dolum özelliği henüz eklenmedi" metni yazıldı. Gerçek dolum özelliği
ayrı bir iş.

## SIRADAKİ

1. madde — geri bildirim kartı konumu.

## ÜRÜN NOTLARI (önceki sohbetlerden)

**Ses kaynağı planı**
Kick / snare / gitar / vokal örnekleri henüz yok. Sentez öncelikli yaklaşım,
CC0 lisanslı örnekler alternatif olarak değerlendirilecek.

**Referans filtreleri**
Araçlar sekmesinde, Pro özelliği. Cihaz adı etiketli filtre setleri.

**Otomatik master / tonal balance**
Ücretli sürüme ek değer olarak düşünüldü. Kapsam tanımlanmadı.

**Fiyat ve can ekonomisi**
Pro ₺199, tek seferlik. Ücretsiz: 5 can, 30 dakikada bir dolum (tasarım niyeti).
Can dolumu KODDA YOK — bkz. BEKLEYEN KARARLAR **D**.
Paywall ekranında dolum süresi hiç geçmiyor, sadece "5 can" yazıyor — eksik bilgi.
Not: 3. bug (oyun 0 canla başlıyor) bundan bağımsız — mevcut can sistemi
başlangıç değerini doğru atamıyor.

## ZORLUK MİMARİSİ (tasarım kararı — HİÇBİRİ KODDA YOK)

**Seans içi rampa**
10 soru: 3 kolay / 3 orta / 3 zor / 1 pro.

**Basamak yerleşimi kişiselleştirilecek**
Performans verisinden hesaplanacak (bölge bazlı isabet, ortalama sapma).
Zayıf bölgeler daha sık gelecek.

**Seviye yapısı**
Seviye mod başına tutulacak. Genel akademi seviyesi toplamdan hesaplanacak.

**Zorluk ölçeği**
Logaritmik, tavanlı. Tavana ulaşıldıktan sonra hassasiyet artırılmayacak;
bunun yerine bağlam zorluğu devreye girecek (gain azalması, katman, süre).

**Ayarlar**
Otomatik (varsayılan) / Sabit (Kolay / Orta / Zor / Pro / Sınırsız).

## AÇIK KALAN KARAR

Kilit tipleri (kodlanmadı / seviye / Pro) — öneri sunuldu, karar verilmedi.
Yeni mod yazılmadan netleşmeli.

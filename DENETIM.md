# DENETİM — Prototip vs Uygulama

**Tarih:** 10.08.2026
**Kapsam:** Bu bir sadece-inceleme turudur — hiçbir kod değiştirilmedi. Kaynak: `Tasarim-2026-08/Prototip.dc.html`. Karşılaştırma: canlı tarayıcıda (masaüstü Chrome, `python3 -m http.server 8000`) gezilerek + kaynak kod okunarak yapıldı.

**Doğrulama derinliği notu (dürüstlük için):** Bazı ekranlar bu turda GERÇEKTEN canlı gezildi (Ana Menü, Oyun Ekranı — Kompresör/dB Seviyesi/Tonal Denge, Kulaklık Uyarısı, Çıkış Onayı, Spotlight, İlerleme, Araçlar Pro+Free, Paywall standart varyant). Bazıları bu turda YENİDEN canlı test edilmedi, aynı günün G90 oturumunda (bu denetimden hemen önce) zaten uçtan uca canlı doğrulanmıştı ve kod o tarihten beri değişmedi (Ayarlar/Seviye/Mod Rehberi sheet'leri, Toast'ın 4 türü, Kalibrasyon) — bunlar "G90'da doğrulandı, bu turda tekrar açılmadı" olarak işaretlendi. Seans Özeti'nin 3 durumu ve Sınav'ın 5 durumu bu turda hiç tetiklenmedi (gerçek oyun ilerlemesi ya da state enjeksiyonu gerektiriyor, kapsam/süre nedeniyle bu turda yapılmadı) — bunlar için G82/G84'ün kendi DURUM.md kayıtları esas alındı, "bu turda canlı doğrulanmadı" notuyla.

---

## A) EKRAN EKRAN KARŞILAŞTIRMA

### 1. Ana Menü
- **EKSİK:** yok.
- **SAPMA:** yok — kullanıcı kartı, XP çubuğu, "Bugünün Önerisi", 10 modluk egzersiz ızgarası (2 sütun) tasarımla birebir.
- **FAZLA:** yok.

### 2. Oyun Ekranı — dokunmalı (Frekans Bulma)
Bu turda YENİDEN açılmadı (G90'da uçtan uca canlı test edilmişti, kod değişmedi). O turun bulguları geçerliliğini koruyor: spektruma dokunarak işaretleme, tek dokunuşla onay çalışıyor.
- **EKSİK/SAPMA/FAZLA:** bu turda yeniden doğrulanmadı.

### 3. Oyun Ekranı — şıklı (dB Seviyesi, Kesim Noktası, Q Genişliği, Boost mu Cut mu)
Canlı test edildi (dB Seviyesi).
- **EKSİK:** yok.
- **SAPMA:**
  - Büyük yuvarlak buton, "Durdur"a basıldıktan sonra ▶/⏸ yerine 🔄 (yenileme) ikonu gösteriyor — bkz. B5.
  - Alt bar "Atla ▶" yazıyor, tasarımda YOK — bkz. B3.
- **FAZLA:**
  - "Soru N/10 (Nsn) ▶" oto-ilerleme metni (aynı `#nextBtn`'in cevap sonrası geçici hâli) — bkz. B2.
- 2x2 şık grid'i CANLI DOĞRULANDI (3 şıkta 2+1 dizilim, `.answers{grid-template-columns:1fr 1fr}`) — B6 artık GEÇERSİZ, tasarımla uyumlu.

### 4. Oyun Ekranı — A/B/C kart (Kompresör, Reverb, Distortion)
Canlı test edildi (Kompresör).
- **EKSİK:** yok — 3 kart, kart-içi play, seçim halkası, "[Harf] olarak onayla" butonu tasarımla birebir.
- **SAPMA:**
  - Kontrol satırı (İpucu/A-B-C pil/döngü) kartların ÜSTÜNDE; tasarımda ALTINDA — bkz. B1. Canlı ekran görüntüsüyle doğrulandı.
  - "Atla ▶" / "Soru N/10 (Nsn) ▶" — bkz. B2/B3 (aynı, madde 3'teki gibi).
- **FAZLA:** yukarıdakiyle aynı liste.

### 5. Oyun Ekranı — kaydırıcı (Tonal Denge)
Canlı test edildi.
- **EKSİK:** yok (4 bant: Bas/Alt-orta/Üst-orta/Tiz, hepsi çalışıyor).
- **SAPMA:** kaydırıcılar YATAY `<input type=range>` (`width:100%;height:6px`); tasarımda DİKEY fader bankası (5 fader yan yana, her biri 148px yükseklik, elle sürüklenen dikey kanal şeridi). Bu sadece renk/boyut farkı değil — TAMAMEN FARKLI bir etkileşim modeli. Bkz. B10.
- **FAZLA:** yok.

### 6. Oyun Ekranı — aşamalı (Frekans Çakışması)
Bu turda hiç açılmadı (3 aşamalı akış — kaynak seç/dinle, çakışmayı işaretle, önce-sonra karşılaştır — gerçek zaman ayırmayı gerektiriyor).
- **EKSİK/SAPMA/FAZLA:** bu turda doğrulanmadı. DURUM.md'nin G51/G86 kayıtları geçmişte canlı doğrulanmış olduğunu gösteriyor ama G90 sonrası yeniden bakılmadı.

### 7. Geri Bildirim
Kısaca canlı görüldü (Tonal Denge yanlış cevap kartı).
- **EKSİK:** detaylı pixel-pixel karşılaştırma bu turda yapılmadı (zaman kısıtı).
- **SAPMA:** gözlenmedi — kapatma X'i, "Yakınlık %N" başlığı, bant-bant sapma metni, "SONRAKİ SORU"/"ATLAMAK İÇİN ✕" oto-ilerleme satırı hepsi göründü ve tasarımın bilinen deseniyle (G81) tutarlı.
- **FAZLA:** gözlenmedi.

### 8. Seans Özeti (3 durum: normal/can-bitti/sınav-telafi)
Bu turda TETİKLENMEDİ (gerçek 10-soruluk bölüm bitirmek ya da can tüketmek gerekiyor). G82'nin DURUM.md kaydı üç durumun da geçmişte canlı doğrulandığını gösteriyor; G90 sonrası yeniden açılmadı.
- **EKSİK/SAPMA/FAZLA:** bu turda doğrulanmadı.

### 9. Sınav (5 durum: anons/geçti/kaldı/telafi-geçti/telafi-kaldı)
Bu turda TETİKLENMEDİ (parkurda 6 üst üste doğru ya da özel state enjeksiyonu gerektiriyor, kapsam dışı bırakıldı). G84'ün DURUM.md kaydı 5 durumun geçmişte canlı doğrulandığını gösteriyor.
- **EKSİK/SAPMA/FAZLA:** bu turda doğrulanmadı.

### 10. İlerleme
Canlı gezildi.
- **EKSİK:** göze çarpan yok.
- **SAPMA:** göze çarpan yok — Günlük Görevler, Son Cevaplar, İsabet Grafiği, Zayıf Bölge Raporu, Rozetler, Mod Seviyeleri hepsi tasarımın bilinen yapısıyla (G87) tutarlı görünüyor.
- **FAZLA:** "İstatistikleri Sıfırla" (kırmızı, en altta) — tasarımda YOK ama G87'nin kendi notu bunu bilinçli bir istisna olarak işaretliyor (var olan tek silme yolu, kaldırılmadı).

### 11. Araçlar — Pro
Canlı gezildi.
- **EKSİK:** göze çarpan yok — "Mixini Yükle"/"Son Yüklenenler"/"Referans Filtreleri" (8 kart) tasarımın bilinen yapısıyla tutarlı.
- **SAPMA:** Referans Filtreleri SADECE görsel — bkz. C1 (kart tıklanınca sadece "AÇIK" rozeti/eğri değişiyor, gerçek DSP YOK).
- **FAZLA:** yok.

### 12. Araçlar — Free (kilitli)
Canlı gezildi.
- **EKSİK/SAPMA:** yok — altın asma kilitli pentagon, "Araçlar Pro'ya özel" başlığı, "Pro'ya Geç · ₺399" butonu göründü.
- **FAZLA:** yok.

### 13. Paywall — standart varyant
Canlı gezildi (Araçlar'ın kilit ekranından "Pro'ya Geç" ile açıldı).
- **EKSİK/SAPMA:** yok — 7 maddelik özellik listesi, ₺399 fiyat kartı, "Tek seferlik · abonelik yok" metni, "Pro'ya Geç"/"Satın alımı geri yükle" butonları göründü.
- **FAZLA:** yok.
- **Mimari SAPMA (B9 ile aynı):** ekran ALTTAN AÇILAN panel değil, TAM EKRAN geçişi olarak açılıyor — bkz. B9.

### 14. Paywall — can-bitti varyantı
Bu turda TETİKLENMEDİ (gerçek can tükenmesi gerekiyor). G89'un DURUM.md kaydı bu varyantın geçmişte canlı doğrulandığını (kırmızı can şeridi, "veya reklam izle" butonu, küçülmüş rozet) gösteriyor; G90 sonrası yeniden açılmadı.

### 15. Ayarlar sheet
G90'da (bu denetimden hemen önceki oturum) uçtan uca canlı doğrulandı, kod o tarihten beri değişmedi — bu turda yeniden açılmadı.
- **EKSİK/SAPMA/FAZLA:** G90 BİTTİ kaydına bakınız (2 bilinçli sapma orada belgeli: "Odak Aralığı" atlandı, Gizlilik/Kullanım Şartları iki ayrı satır olarak korundu).

### 16. Seviye Bilgisi sheet
G90'da canlı doğrulandı, bu turda yeniden açılmadı.
- **EKSİK/SAPMA/FAZLA:** yok (G90 BİTTİ kaydına göre).

### 17. Mod Rehberi sheet
G90'da canlı doğrulandı, bu turda yeniden açılmadı.
- **EKSİK/SAPMA/FAZLA:** yok.

### 18. Toast (4 tür: pro/daily/badge/soon)
G90'da `core/fx.js:toast()` doğrudan çağrılarak (gerçek modül, gerçek oyun tetikleyicisinden DEĞİL) `getComputedStyle` ile ölçülüp doğrulandı. Bu turda yeniden açılmadı.
- **EKSİK/SAPMA/FAZLA:** yok (renk/ikon/glow değerleri tasarımla birebir ölçüldü). Gerçek oyun-içi tetikleyicilerinde (günlük görev tamamlama, rozet kazanma vb.) HENÜZ canlı görülmedi — bkz. C4.

### 19. Spotlight
Bu turda YENİDEN canlı test edildi (Tonal Denge'de "Adım 1/4").
- **EKSİK/SAPMA/FAZLA:** yok — kenarlık+glow, tam genişlik balon, "ADIM N/M" + nokta göstergesi çalışıyor.

### 20. Kulaklık Uyarısı
Bu turda YENİDEN canlı test edildi (Tonal Denge kartına basılınca).
- **EKSİK/SAPMA/FAZLA:** yok.

### 21. Kalibrasyon
G90'da canlı doğrulandı, bu turda yeniden açılmadı.
- **EKSİK/SAPMA/FAZLA:** yok.

### 22. Çıkış Onayı
Bu turda YENİDEN canlı test edildi (2 kez, Kompresör ve dB Seviyesi'nden çıkarken).
- **EKSİK/SAPMA/FAZLA:** yok — "Devam Et"/"Çık" ikisi de doğru çalışıyor (G90'ın bulup düzelttiği `hidden` class bug'ından beri sağlam).

### 23. Ses yükleniyor / hata durumları
G90'da `audio-engine.js`'e gerçek bir XHR 404 hatası enjekte edilerek doğrulandı (`{sampleLoadFailed:true}`), bu turda yeniden açılmadı.
- **EKSİK/SAPMA/FAZLA:** yok kod seviyesinde; gerçek cihazda gerçek bir ağ/decode hatasıyla HENÜZ görülmedi (simülasyon dışı) — bkz. C4.

---

## B) BİLİNEN PÜRÜZLER — DURUM DOĞRULAMASI

**1. Kompresör/Reverb/Distortion'da kontrol satırı kartların ÜSTÜNDE; tasarımda ALTINDA**
**HÂLÂ GEÇERLİ.** Canlı ekran görüntüsüyle doğrulandı (Kompresör).
Kök sebep: `www/index.html` — `#gameSpectrumControls` (satır 392) DOM'da `#answers`'tan (satır 474) ÖNCE geliyor; blok elemanlar DOM sırasına göre dizildiği için (CSS `order:` KULLANILMIYOR, doğrulandı) kontrol satırı her zaman kartların üstünde çıkıyor. Tasarımda (`Prototip.dc.html` satır 743-798, "Varyant B: A/B/C kartlar") sıra TERS: önce kartlar (satır 760-772), SONRA kontrol satırı (İpucu/A-B-C pil/döngü, satır 773-786).

**2. Kompresör ve dB ekranlarında altta "Soru 2/10 (5)" butonu var; tasarımda yok**
**HÂLÂ GEÇERLİ, ama nüans önemli: bu, "Atla" ile AYNI TEK buton (`#nextBtn`), İKİ AYRI buton DEĞİL.**
Canlı doğrulandı: cevap onaylanmadan önce `#nextBtn` metni "Atla ▶"; cevap onaylandıktan sonra `app.js:4077`'deki `roundFlow.ensureAutoNext(durationMs, label)` çağrısıyla metin geçici olarak "Soru N/10 (Nsn) ▶" (ya da sınav modunda "Sınav N/4 (Nsn)"/"Telafi N/5 (Nsn)") olur, geri sayım bitince otomatik ilerler ve buton tekrar "Atla ▶"ya döner. `Prototip.dc.html`'de "Atla" kelimesi ya da "Soru N/10" biçiminde bir metin HİÇ geçmiyor (grep ile doğrulandı) — tasarımın tek karşılığı `confirmBLabel`/`confirmLabel` (yalnızca "Bir kart seç"/"[X] olarak onayla" gibi SEÇİM durumunu yansıtan bir buton, oto-ilerleme geri sayımı YOK).

**3. Aynı ekranlarda "Atla" butonu var; tasarımda yok**
Madde 2 ile AYNI eleman — bkz. yukarısı. Tasarımda en yakın karşılığı sadece spotlight'ın "Geç" (skip) butonu ve geri bildirim ekranının 32x32 X'i (`skipFeedback`); ana oyun ekranında kalıcı bir "Atla" metni YOK.

**4. Combo çipi "x0" gösteriyor; tasarımda en düşük değer x1 olmalı**
**GEÇERSİZ / SAPMA DEĞİL.** Hem kod hem canlı test bunu doğruladı: `Prototip.dc.html:2579` — `comboLabel: 'x' + (s.comboBreak ? 0 : s.combo)` — tasarımın KENDİSİ de seri kırıldığında (`comboBreak`) "x0" gösteriyor. Uygulamanın `app.js:2794-2796`'daki `stats.combo || 0` → `x${combo}` mantığı AYNI davranışı üretiyor. Canlı testte "x1"den "x0"a düşüş, gerçek bir seri kırılması/zaman aşımı SONRASINDA gerçekleşti (beklenen davranış) — tasarım ve uygulama bu noktada UYUMLU.

**5. dB Seviyesi'nde büyük yuvarlak buton play değil yenileme ikonu gösteriyor**
**HÂLÂ GEÇERLİ, ama dB Seviyesi'ne ÖZEL DEĞİL — TÜM Motor 1 modlarında (Frekans Bulma, Kesim Noktası, Q Genişliği, Boost mu Cut mu, dB Seviyesi) aynı.**
Canlı doğrulandı: "Durdur"a basılınca (`autoStopped=true`) buton 🔄 (yenileme emojisi) gösteriyor, tekrar basılana kadar öyle kalıyor.
Kök sebep: `app.js:1586-1604` (`updateStartBtnLabel()`) — `tekrarCal = autoStopped` iken `els.startBtn.textContent = "🔄"`. `Prototip.dc.html:2614-2621`'deki `playIcon` mantığında SADECE üç durum var: `loading` (dönen spinner), `error` (üçgen uyarı), ya da play/pause SVG'si (`playSvg`) — "durduruldu, tekrar çalmak için dokun" anlamında AYRI bir "replay" ikonu YOK. Bu, tasarımda karşılığı olmayan gerçek bir eklenti.

**6. dB Seviyesi'nde şıklar 2x2 grid değil, alt alta diziliyor**
**ARTIK GEÇERSİZ — canlı doğrulandı, kod 2 sütunlu grid üretiyor.**
`styles.css:814` — `.answers{display:grid;grid-template-columns:1fr 1fr}`. Canlı testte (3 şık, "Kolay" zorlukta) 2 üstte + 1 altta dizildi — 2 sütunlu grid'in DOĞRU davranışı bu (tek satır tam dolmadığında son öğe tek başına kalır). 4 şıklı ("Orta" zorluk) durumda gerçek 2x2 oluşur. Muhtemelen bu pürüz daha ESKİ bir G-turunda (G85 civarı, DURUM.md satır 1315'te "düzeltildi" notu var) zaten kapatılmış, madde stale.

**7. Kaynak çipi "Kaynak: Dosya seç" yazıyor; dosya yokken varsayılan kaynak adı görünmeli**
**KISMEN GEÇERLİ — kod seviyesinde doğrulandı, gerçek dosya yükleyerek canlı test EDİLMEDİ (dosya seçici bu ortamda pratik değil).**
Kök sebep: `core/source-catalog.js:65` — `{ id: "upload", label: "Dosya seç", kind: "upload" }` STATİK bir katalog etiketi. `app.js:4237`'deki `els.sourceChipLabel.textContent = labelSource(activeQuestion.source)` bunu OLDUĞU GİBİ yazıyor — kaynak "upload" olduğunda, dosya GERÇEKTEN yüklenmiş ve çalıyor olsa BİLE çip hep "Dosya seç" yazmaya devam eder (gerçek dosya adına hiç geçmiyor). Ayrıca: `populateSourceSelect()` (`app.js:466-486`) varsayılan kaynağı HER modun kendi uyumlu kaynak listesinin İLK grubundan seçiyor — çoğu modda bu "Pink Noise" (SENTETİK grubu ilk), Tonal Denge gibi `uyumluKaynaklar`ı dar modlarda "Davul Döngüsü" (canlı doğrulandı) — yani FRESH bir oturumda "Dosya seç" varsayılan olarak GÖRÜNMÜYOR, sadece kullanıcı BİLEREK "Kendi Dosyam" grubunu seçtiğinde (dosya yükleyip yüklemediğine bakılmaksızın) ortaya çıkıyor ve sonrasında HİÇ değişmiyor.

**8. Motor 2 modlarında "hızlı cevap 1.2x" çubuğu görünüyor; süre mekaniği nasıl işliyor**
**GERÇEK VE DOĞRU ÇALIŞIYOR — bug değil, açıklama.**
`app.js:4145-4155` (`startTimerForCurrentQuestion()`) TÜM modlarda (Motor 1/Motor 2 ayrımı yapmadan) `currentDifficultyConfig().time`'ı okuyup `roundFlow.startTimer(time)` çağırıyor — Kompresör'ün kendi DIFFICULTY tablosundaki GERÇEK `time` değeri kullanılıyor. "1.2x" etiketi zamanın %55'inden fazlası kaldığında (`app.js:643`) aktif oluyor — GERÇEK bir hız-bonusu göstergesi (XP çarpanına da yansıyor, `app.js:1522`). Canlı testte Kompresör'de gerçek bir SÜRE çubuğu BOSS turunda göründü ve akıyordu.

**9. Paywall alttan açılan panel değil, ekran geçişi olarak açılıyor**
**HÂLÂ GEÇERLİ, BİLİNÇLİ bir mimari kapsam kararı (G89'da belgelendi, tekrar üretilmedi).**
Canlı doğrulandı (standart varyant). `DURUM.md`'nin G89 kaydı: "Tasarımın 'alttan açılan backdrop+sheet' sunumu... UYGULANMADI — bu, app'in `goScreen()` tam-ekran değişim mimarisini... AYRI, riskli bir iş olurdu... SADECE görsel sonucu... `#screen-paywall`'a uygulandı." Ekran hâlâ `goBackFromSubpage()` ile kapanıyor.

**10. Tonal Denge kaydırıcıları yatay; tasarımda dikey fader**
**HÂLÂ GEÇERLİ.** Canlı ekran görüntüsüyle doğrulandı.
Kök sebep: `styles.css:944` — `.tonal-slider{-webkit-appearance:none;width:100%;height:6px}` — standart YATAY `<input type=range>`. `Prototip.dc.html:616-638`'deki `isFaders` bloğu GERÇEK bir dikey fader bankası: `width:100%;height:148px` konteyner, thumb `top:{{fd.pos}}` ile dikey konumlanıyor — bu SADECE görsel değil, TAMAMEN FARKLI bir etkileşim modeli (yukarı-aşağı sürükleme vs. sağa-sola sürükleme). En büyük/en görünür SAPMA bu denetimde.

**11. Spektrum alt satırındaki frekans aralığı doğru mu**
**DOĞRU VE KASITLI — sapma değil.**
`app.js:1750-1768` (`updateAnalyzerFoot()`) — yorum satırı açıkça: "G86 DÜZELTMESİ: G85 tasarımın LİTERAL '20 Hz'/'20 kHz'sine dönmüştü — bu turun kendi talimatı BİLEREK tasarımdan AYRILDIĞINI belirtiyor: gerçek mod/odak aralığı yazılsın." `mode.FA_MIN/FA_MAX` GERÇEK değerler (`frekans-bulma.js:223` — `80, 17000`), spektrum çiziminde kullanılan AYNI sabitler — etiket ile görsel eksen birebir tutarlı. Bu, C3'ün de cevabı (aşağıya bakınız).

**12. Ana menüde Frekans Çakışması kartının görsel oranı diğerlerinden küçük**
**HÂLÂ GEÇERLİ — canlı ölçümle KESİN doğrulandı.**
`getBoundingClientRect()` ile ölçüldü: Distortion kartı `cardH=195px, vizH=126px` (görsel/kart oranı %64.6); Frekans Çakışması kartı AYNI toplam yükseklikte (`cardH=195px`, ikisi de "günde 1 ücretsiz"/PRO rozetiyle aynı grid satırında olduğu için grid satır-yüksekliği eşitleniyor) ama `vizH=103px` (SADECE %52.8) — diğer 8 "normal" karttaki 103px ile AYNI, satırın fazladan 23px'i BÜYÜMEDİ. Kök sebep: `.mode-card-viz` (G76'dan beri) esnek yükseklikli — kartın METİN bloğu (başlık+açıklama+"günde 1 ücretsiz" rozeti) ne kadar yer kaplarsa görsel kutusu geri kalanı alıyor. Frekans Çakışması'nın rozet satırı EKSTRA metin yüksekliği eklediği için görseli, satır-komşusu Distortion'ınkinden (rozeti YOK, PRO kilidi farklı bir satırda) görece küçük kalıyor.

---

## C) AÇIK KALEMLER — DURUM DOĞRULAMASI

**1. Referans filtreleri gerçek DSP uygulamıyor (sadece görsel) — TEYİT EDİLDİ.**
`app.js:6820-6825` — `toolsFilterGrid`'in click handler'ı SADECE `toolsActiveFilterIdx = Number(...)` ve `renderToolsFilters()` çağırıyor. Hiçbir `audioEngine`/`BiquadFilter`/ses-zinciri çağrısı YOK. Karta tıklamak sadece hangi kartın "AÇIK" rozetini taşıdığını ve hangi eğri SVG'sinin gösterildiğini değiştiriyor — çalan sesin GERÇEK frekans içeriği HİÇ etkilenmiyor. Canlı ekran görüntüsüyle de doğrulandı (Araçlar → Referans Filtreleri, "Düz" varsayılan "AÇIK").

**2. "done" (kayıpsız 10 soruluk bölüm) Seans Özeti Pro'da tetiklenemiyor — TEYİT EDİLDİ, HÂLÂ AÇIK.**
`app.js:4061` — `if (challenge.active && !examGateActive() && challenge.done >= challenge.total) { finishChallenge(); return; }` — `examGateActive()` TRUE olduğunda (Pro kullanıcı, sınav-etkin bir modda) bu satır HİÇ çalışmıyor, `finishChallenge()`/`showSessionEnd("normal")` tetiklenmiyor. `DURUM.md`'nin "BEKLEYEN KARARLAR madde K" kaydı bunu ZATEN kullanıcı kararı bekleyen açık bir madde olarak işaretlemiş (kasıtlı mı — "done" ekranı SADECE teorik free+limitsiz senaryo için mi var — yoksa regresyon mu — `finishChallenge()`'ın sınav/telafi SONRASI da çağrılması mı gerekiyor). Kod, G90 dahil hiçbir sonraki turda değişmedi (`exam-system.js`/`finishChallenge()` git geçmişinde son commit'lerde dokunulmamış).

**3. G83 (gerçek Hz) vs G84 (literal "20 Hz/20 kHz") çelişkisi — ŞU AN NET: G86 kararı geçerli, gerçek Hz gösteriliyor.**
Kod içi yorum (`app.js:1754-1759`) çelişkinin tarihini de anlatıyor: G83 gerçek Hz kararını verdi → G85 (tasarımın literal "20 Hz"/"20 kHz"sine) GERİ DÖNDÜ → G86 bunu TEKRAR gerçek Hz'e düzeltti ve bunun BİLİNÇLİ bir tasarım-sapması olduğunu ("PROTOTİPTEN BİLEREK AYRILIYORUZ") belgeledi. Bugünkü kod `mode.FA_MIN/FA_MAX` (ya da aktif odak aralığı) okuyor — 80 Hz–17 kHz gibi GERÇEK, mod-bazlı değerler. Çelişki KAPANMIŞ durumda, geriye dönüş riski yok (kod + yorum + B11'in canlı doğrulaması üçü de aynı sonuca işaret ediyor).

**4. iOS/Android cihazda hiç test edilmedi — hangi düzeltmeler cihaz doğrulaması bekliyor.**
Bu doğru — bütün bu denetim (ve ondan önceki G83-G90 turlarının TAMAMI) SADECE masaüstü Chrome'da yapıldı. Cihaz doğrulaması bekleyen başlıca kalemler:
- **G90'ın TAMAMI** (bu denetimden hemen önceki oturum): çıkış onayının `fbPopIn` animasyonu, kalibrasyonun donanım ses tuşu akışı (`startVolumeButtonsWatch` — kod okumayla doğrulandı, gerçek tuşla DEĞİL), spotlight'ın tam-genişlik balonunun küçük ekranlarda taşma durumu, toast'ların gerçek oyun-içi tetikleyicilerinde (günlük görev/rozet/Pro kilidi/yakında) görünümü.
- **G67-G82 birikimi** (DURUM.md SIRADAKİ bölümünde uzun uzun listeli): G75'in grid-stretch savunması, G76'nın SVG kırpma matematiği, G77'nin sınav/telafi nokta göstergesi, G78/G79'un dokunma/tıklama davranışı farkları, G79'un `#abLoopBtn`'in uzun-basmayla çakışmadığı, G81'in "kulak" omuz butonlarının gerçek parmak dokunuşu, G82'nin SVG halka animasyonu/arka planda `setInterval`.
- **Bu denetimde YENİ bulunanlar arasında cihazda özellikle FARKLI davranabilecekler:** Tonal Denge'nin yatay `<input type=range>` kaydırıcıları (B10) — dokunmatik cihazda parmak sürüklemesi masaüstü fare sürüklemesinden farklı hissedilebilir, cihazda ayrıca denenmeli. Dosya yükleme sonrası Kaynak çipi (B7) — gerçek bir dosya seçiciyle (masaüstünde test edilemedi) doğrulanmalı.
- **Ses gerçek hata durumu (SES DURUMLARI, ekran 23):** bu denetimde SADECE simüle edilmiş bir XHR 404'üyle test edildi; cihazda GERÇEK bir ağ kesintisi/decode hatasıyla henüz hiç görülmedi.

---

## D) KALDIRILANLAR — GERİ ÇAĞRILABİLİR Mİ

**1. Oyun ekranı — eski `.game-sub` alt satırı (`#roundChip`/`#streakText`)**
- **Nerede gizlendi:** `index.html:178` — `<div class="game-sub num hidden">` (CSS `.hidden{display:none!important}`, `styles.css:171`).
- **Kodu duruyor mu:** EVET — hem HTML hem güncelleme kodu (`app.js`, tek satır değişmedi per G77 notu) sağlam.
- **Geri getirmek ne kadar iş:** ÇOK DÜŞÜK — sadece `hidden` class'ını kaldırmak yeterli, JS zaten güncel veriyi yazıyor.

**2. Oyun ekranı — eski `.stats-row` (Seri/Skor/İpucu/İsabet çipleri)**
- **Nerede gizlendi:** `index.html:240` — `<div class="stats-row hidden">` (seriChip/scoreChip/hintStatCount/gameAccValue).
- **Kodu duruyor mu:** EVET, aynı gerekçeyle (G77 notu: "kendi güncelleme kodları TEK SATIR değişmedi").
- **Geri getirmek ne kadar iş:** ÇOK DÜŞÜK — `hidden` class'ını kaldırmak yeterli.

**3. İlerleme — eski lvl-badge kartı / 3'lü stat satırı / "Şu An Neredesin" / "Canlı İstatistikler" ızgarası**
- **Nerede gizlendi:** GİZLENMEDİ — G87'de TAMAMEN SİLİNDİ (HTML + JS ikisi de). `index.html:736-737` ve `app.js:378-384`'teki yorumlar bunu açıkça "KALDIRILDI" diye işaretliyor.
- **Kodu duruyor mu:** HAYIR — `#progLevelValue`/`#progXpBar`/`#accuracyValue`/`#roundsValue`/`#wrongValue`/`#avgScoreValue`/`#bestComboValue`/`#bestScoreValue`/`#totalPracticeValue`/`#totalRoundsValue`/`#whereNowText`/`#zonePanelToggle`/`#zoneCaret`/`#zoneWrap`/`#zoneSub` id'lerini okuyan `renderExtraStats()`/`renderWhereNow()` fonksiyonları SÖKÜLDÜ. Sadece yetim bir `.lvl-badge` CSS class tanımı kaldı (`styles.css:1844-1850`), hiçbir HTML elementi artık ona işaret etmiyor.
- **Geri getirmek ne kadar iş:** ORTA-YÜKSEK — HTML iskeleti yeniden yazılmalı, İKİ render fonksiyonu SIFIRDAN yeniden kodlanmalı (mantık kaybolmuş değil ama kod satırları gitmiş, git geçmişinden geri alınabilir ama "aç/kapat" kadar basit değil).

**4. Araçlar — sahte Analiz kartı (`#toolBars`) + eski dişli/filtre-chip deseni**
- **Nerede gizlendi:** G88'de HTML'den SİLİNDİ (`#toolBars` artık DOM'da yok), `renderToolBars()` fonksiyonu app.js'te KALDI (zararsız no-op, `els.toolBars` null olduğu için erken çıkıyor).
- **Kodu duruyor mu:** KISMEN — `renderToolBars()`'ın render MANTIĞI hâlâ duruyor (satır ~6742-6752), sadece hedef HTML elementi yok. `toolsSettingsBtn` (dişli)/`filterChips`/`filterName`/`filterDesc`/`filterListen`/`filterResetBtn`/`analyzeLock`/`filtersLock` id'leri TAMAMEN silinmiş (o kod yolu yok).
- **Geri getirmek ne kadar iş:** DÜŞÜK (sadece "Analiz" kartı için — `renderToolBars()`'ın gövdesi zaten yazılı, sadece `id="toolBars"` bir konteyner eklemek yeterli) / YÜKSEK (eski dişli+filtre-chip deseni için — o kod tamamen gitmiş, yeni Referans Filtreleri kart ızgarası zaten onun yerini aldığı için muhtemelen GERİ GETİRİLMEMELİ, iki ayrı UI aynı işi yapardı).

---

## ÖZET SAYILAR

| Kategori | Sayı |
|---|---|
| **EKSİK** (bu turda tespit edilen, prototipte var uygulamada yok) | **0** |
| **SAPMA** (ikisinde de var, farklı) | **7** — B1 (kontrol satırı sırası), B2/B3 (Soru N/10 + Atla, TEK madde sayılıyor), B5 (🔄 replay ikonu), B7 (Kaynak çipi statik "Dosya seç"), B9 (Paywall tam-ekran vs sheet), B10 (Tonal Denge yatay vs dikey fader), B12 (Frekans Çakışması kart oranı) |
| **FAZLA** (uygulamada var, prototipte yok) | **1** — "Soru N/10 (Nsn) ▶" oto-ilerleme metni + "Atla ▶" (B2/B3, SAPMA ile aynı köke sahip TEK eleman, hem "prototipte yok" hem "farklı davranıyor" açısından iki kategoriye birden giriyor — çift saymamak için burada 1 FAZLA olarak ayrıca not edildi) |
| **GEÇERSİZ ÇIKAN pürüzler** (B listesinde soruldu, artık doğrulanmadı/sapma değil) | **3** — B4 (combo x0 — tasarım da aynı), B6 (2x2 grid — kod zaten doğru), B11 (Hz aralığı — kasıtlı ve doğru) |
| **AÇIK OLDUĞU TEYİT EDİLEN kalemler** (C bölümü) | **4/4** — C1 (referans filtre sadece görsel), C2 ("done" Pro'da tetiklenemiyor), C3 (Hz çelişkisi ÇÖZÜLDÜ, artık açık değil ama durum netleştirildi), C4 (cihaz testi hiç yapılmadı) |
| **Bu turda canlı DOĞRULANAMAYAN ekranlar** (zaman/kapsam kısıtı) | **5** — Frekans Bulma (dokunmalı, G90'dan miras), Frekans Çakışması (aşamalı), Seans Özeti (3 durum), Sınav (5 durum), Paywall can-bitti varyantı |
| **D listesi — geri çağrılabilir öğe** | **4** grup — 2'si ÇOK DÜŞÜK efor (sadece `hidden` kaldır), 1'i ORTA-YÜKSEK (İlerleme'nin eski kartları, kod silinmiş), 1'i DÜŞÜK/YÜKSEK karışık (Araçlar'ın eski Analiz kartı kolay, eski filtre-chip deseni muhtemelen istenmeyen) |

**`npm test`: 1043/1043 geçti.** (Bu denetim boyunca hiçbir kod dosyası değiştirilmedi — sadece okuma, grep, ve canlı tarayıcıda gezinme yapıldı; localStorage'daki `eqEarTrainerProXDev` dev-Pro bayrağı geçici olarak kapatılıp Free/Pro Araçlar ekranlarını karşılaştırmak için kullanıldı, sonra ORİJİNAL değerine geri döndürüldü.)

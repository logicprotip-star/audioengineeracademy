# GÖRSEL CİHAZ TESTİ — kontrol listesi

_Kabloyla kurulan build üzerinde, gözle bakılacak maddeler._
_Kulakla doğrulama BU LİSTEDE DEĞİL — ayrı tur._

Her madde için: **TAMAM** / **BOZUK** yaz. Bozuksa hangi modda
olduğunu ve ekran görüntüsünü ekle.

---

## A. HER MODDA BAKILACAK (12 mod)

Modlar: Frekans Bulma · Kesim Noktası · dB Seviyesi · Boost mu Cut mu ·
Q Genişliği · Kompresör · Reverb · Tonal Denge · Frekans Çakışması ·
Distortion · Pan Konumu · Stereo Genişlik

### A1 — Çip eşitliği
Üstteki çipler (kaynak seçimi, "Karışık" vb.) aynı yükseklikte mi,
tek satırda mı duruyor? Taşan, alta kayan, farklı yükseklikte olan var mı?

**Bilinen şüphe:** "Karışık" çipi Kesim Noktası'nda tam genişliğe
yayılıyor, Frekans Bulma'da dar kalıyor. Diğer modlarda nasıl?

| Mod | Sonuç |
|---|---|
| Frekans Bulma | ❌ BOZUK — 3 çip, "Pink Noise" dar ve "Tüm spektrum"a yapışık, "Karışık" geniş |
| Kesim Noktası | ❌ BOZUK — 2 çip, "Pink Noise" dar, "Karışık" ekranın yarısından fazlası |
| dB Seviyesi | |
| Boost mu Cut mu | ❌ BOZUK — Kesim Noktası ile aynı |
| Q Genişliği | ❌ BOZUK — Kesim Noktası ile aynı |
| Kompresör | |
| Reverb | |
| Tonal Denge | |
| Frekans Çakışması | |
| Distortion | |
| Pan Konumu | |
| Stereo Genişlik | ❌ BOZUK — "Dosya seç" dar, "Karışık" geniş |

**Durum: DÜZELTME PROMPT'U VERİLDİ.** İstenen: satırdaki tüm çipler
eşit genişlik (2 çip → %50/%50, 3 çip → %33 ×3). 12 modun hepsinde.

### A2 — Bölüm çubuğu
Üstteki "BÖLÜM 1/10" çubuğu kırpılıyor mu? Segmentler tam görünüyor mu?

✅ **KIRPILMA YOK** — 5 karede de segmentler tam görünüyor.

❌ **AMA YENİ HATA:** Mod geçişinde çubuk ÖNCEKİ modun ilerlemesini
gösteriyor. Play'e basılınca doğru değere sıfırlanıyor. Yani sıfırlama
tur başlangıcında yapılıyor, mod açılışında yapılmıyor.
**DÜZELTME PROMPT'U VERİLDİ.**

### A3 — Şık görünürlüğü
Şıklı modlarda 3. şık tam görünüyor mu, alttan kesiliyor mu?

⏸️ **ÖLÇÜLEMEDİ** — şıklar play'e basıldıktan sonra geliyor, gönderilen
karelerde play'e basılmamıştı. Tekrar bakılacak.

### A4 — Alt bar metni
Alt barda sadece **"Atla"** mı yazıyor? Başka bir metin kalmış mı?

✅ **TAMAM — KAPANDI.** Frekans Bulma, Kesim Noktası, Q Genişliği,
Boost mu Cut mu, Stereo Genişlik, Reverb, dB Seviyesi, Kompresör:
hepsinde sadece "Atla ▶". Logic 12 modda doğruladı.

### A5 — Feedback ekranı X (Atla) butonu
Cevap verdikten sonra açılan geri bildirim ekranında sağ üstte
X (kapat) butonu var mı?

✅ **VAR** — dB Seviyesi ("Doğru!") ve Kompresör ("Yanlış ses")
karelerinde sağ üstte X görünüyor. Bilinen sorun kapanmış görünüyor.

❌ **AMA:** Aynı panelde üç ayrı kapatma yolu var — sağ üstte X,
altta "SONRAKİ SORU", altta "ATLAMAK İÇİN ×". Kafa karıştırıcı.
(Hata #9)

---

## B. KALICILIK TESTLERİ

### B1 — Kaynak seçimi
Bir modda kaynağı değiştir → uygulamayı tamamen kapat → yeniden aç →
aynı kaynak seçili mi?

✅ **ÇALIŞIYOR** — Frekans Bulma'da "Davul" seçilip uygulama komple
kapatıldı, açılınca Davul duruyordu.

⚠️ **AMA GÜVENİLİR DEĞİL** — Hata #7 (çip "Triangle" gösterirken menüde
"Akustik Gitar" işaretli) yüzünden ekrandaki değere güvenilemiyor.
#7 çözülmeden bu test kesin sayılmaz, tekrar edilecek.

### B2 — Oyun türü
"10 Soruluk Bölüm" seç → kapat → aç → hâlâ seçili mi?

✅ **ÇALIŞIYOR — KAPANDI.** "Sonsuz" seçildi, uygulama komple kapatıldı,
açılınca Sonsuz duruyordu. Varsayılan 10 Soruluk Bölüm'e dönmedi.

### B3 — Dosya seçimi (iki mod, iki farklı dosya)
Mod A'da dosya X, Mod B'de dosya Y seç → kapat → aç →
her mod kendi dosyasını hatırlıyor mu, karışıyor mu?

⏸️ **BEKLİYOR** — Hata #7 çözülmeden test edilemez. Ekrandaki değer
gerçek seçimi göstermiyorsa "hatırladı mı" sorusu cevaplanamaz.

---

## C. ARAÇLAR SEKMESİ

### C1 — Mixini Yükle
Dosya yükleniyor mu, adı doğru görünüyor mu, oynat/durdur çalışıyor mu?

### C2 — Tonal Balance
- Pop / EDM / Akustik / Kendi referansım — dördü de seçilebiliyor mu?
- "Kendi referansım"da iki eğri ayrışıyor mu?
- Alttaki dB listesi okunabiliyor mu, taşıyor mu?

### C3 — Ölçüm Sonuçları
"Analiz et" çalışıyor mu? Sonuç tablosu tam görünüyor mu?

### C0 — Stereo Genişlik dosya başlangıcı
❌ **ŞÜPHELİ** — Dosya seçildiğinde parça baştan değil ORTADAN çalmaya
başlıyor. Kasıtlı olabilir (intro/sessizlik atlama) ama doğrulanmadı.
Kasıtlıysa kullanıcıya belirtilmeli, değilse hata.
**ÖLÇÜM GEREKİYOR — prompt yazılmadı.**

### C4 — Referans Filtreleri
**Bu bölüme özellikle bak.** Filtre seçince ne oluyor?
Etiket değişiyor ama ses aynı mı kalıyor? Kullanıcıya bunun
"henüz çalışmadığını" söyleyen bir uyarı var mı?

---

## D. GENEL

### D1 — Yatay dönme
Telefonu yan çevir. Uygulama dikey kalıyor mu, dönüyor mu?

✅ **TAMAM** — dikey kalıyor, dönmüyor.

### D2 — Sheet / panel açıkken
Bir panel (ayarlar, bilgi vb.) açıkken tur duruyor mu?
Ses de susuyor mu, yoksa arkada çalmaya devam mı ediyor?

❌ **BOZUK** — Ayarlar açıldığında hem süre işlemeye devam ediyor,
hem ses arkada çalmaya devam ediyor. Panel açıkken tur duraklamalı
ve ses susmalı. **HATA #10**

### D3 — İlerleme sekmesi
- Günlük görevler görünüyor mu?
- Kilitli bölümler ("Pro ile aç") düzgün duruyor mu?
- Mod seviyeleri listesi tam mı, 12 mod da var mı?

✅ **TAMAM** — 12 mod da listede.

### D4 — ATT diyaloğu
İlk reklam izlemeye çalıştığında izleme izni diyaloğu çıkıyor mu?
_(Uygulama ilk açılışında değil, ilk reklam anında çıkmalı)_

### D5 — Paywall
"Pro ile aç" butonlarından biri → paywall açılıyor mu?
Fiyat ₺399 görünüyor mu? Yasal metin bağlantıları çalışıyor mu?

### D6 — Ayarlar
Gizlilik politikası ve kullanım koşulları bağlantıları
Safari'de açılıyor mu?

### D7 — Ana ekran adı
Telefonun ana ekranında simgenin altında **"AE Academy"** mi yazıyor?

✅ **TAMAM** — "AE Academy" yazıyor, kesilmiyor.

---

---

# BULUNAN HATALAR ÖZETİ (13 Ağustos, ilk tur)

| # | Hata | Durum |
|---|---|---|
| 1 | Çip genişlikleri eşit değil (12 modda) | ✅ **ÇÖZÜLDÜ** — commit 581f798, cihazda doğrulandı |
| 2 | İlerleme çubuğu mod geçişinde sıfırlanmıyor | ✅ **ÇÖZÜLDÜ** — commit 581f798, cihazda doğrulandı |
| 3 | Stereo Genişlik'te dosya ortadan başlıyor | ✅ **HATA DEĞİL — KASITLI.** `pickPlaybackOffset()` (stereo-genislik.js:174-220, G122) PCM verisini okuyup 1.5sn pencerelerde RMS ölçüyor, enerji eşiğini (0.015) geçen rastgele nokta buluyor. Gerekçe: intro/sessiz bölümde genişlik ölçümü anlamsız, side bileşeni sıfıra yakın olur. Kendi testi var |
| 4 | Spektrum analizörü 4 farklı modda birebir aynı eğri | ⏸️ ölçüm bekliyor |
| 5 | İpucu butonu tutarsız | ✅ **ÇÖZÜLDÜ** — commit a4efb42, gap 4px, taşma 12px → −3px. ⚠️ AMA cihazda YENİ SORUN: Reverb'de **C harfi kutu içinde değil** (bkz. #15). Detay: |
| 5b | (5'in eski açıklaması) | ⚠️ **KISMEN HATA DEĞİL** — metin farkı KASITLI (G85 Motor1 ikon / G86 Motor2 metinli). AMA yan etki gerçek: Reverb'de `#abLoopBtn` sağ kenarı 386px, satır sınırı 374px → **12px taşma**. Sadece taşma düzeltilecek |
| 6 | Kontrol satırının dikey konumu modlar arası farklı | ✅ **ÇÖZÜLDÜ** — commit a4efb42, idle'da 0px/10px (Reverb'le birebir), round'da modun kendi çizimi korunuyor. Cihazda doğrulandı: boşluk gitti, play'e basınca dB çubuğu açılıyor. Detay: |
| 6b | (6'nın eski açıklaması) | ⏸️ **ÜRÜN KARARI BEKLİYORDU** — ölçüldü: `HIDE_ANALYZER` modlarında (kompresör/reverb/distortion) analizör layout'tan kalkıyor, boşluk 10px. `BARE_ANALYZER` modlarında (dB Seviyesi/Stereo Genişlik/Pan Konumu) görsel olarak boş ama **252px yer tutuyor**, boşluk 272px. Bu boşluk kasıtlı mı, sıfırlanacak mı — Logic karar verecek |
| 7 | **Kaynak çipi ile menü seçimi uyuşmuyor** | ✅ **ÇÖZÜLDÜ** — commit a4efb42. Cihazda doğrulandı: çip menüyle eşleşiyor, üstelik uygulamadan tamamen çıkıp girince de seçimler duruyor. Detay: |
| 7b | (7'nin eski açıklaması) | 🔧 **KÖK SEBEP BULUNMUŞTU** — iki ayrı state okunuyor: menü `sourceSelect.value`'dan (enterMode güncelliyor), çip `activeQuestion.source`'tan (sadece round-kurma kodunda, app.js:5278). `enterMode()` çip etiketine hiç dokunmuyor. Playwright'ta birebir tekrar üretildi. **Bug 2 ile TIPATIP AYNI kök neden.** Düzeltme `enterMode()` içine 1-3 satır |
| 8 | Geri bildirimde kulak simgesi bazı modlarda yok | ✅ **HATA DEĞİL — KAPANDI.** `#fbEarLeft`/`#fbEarRight` ortak markup'ta var, kasıtlı olarak sadece Frekans Bulma'da gösteriliyor (G81, Logic'in kendi isteği). Sebep: kulak simgesi iki FREKANSI yan yana gösteriyor — diğer modlarda gösterecek iki frekans yok (kompresörde ratio, pan'da konum, reverb'de decay var) |
| 9 | 🔴 **YENİDEN AÇILDI.** Feedback panelinde sağ üstte çalışan bir X var. AMA altta "SONRAKİ SORU" ve "ATLAMAK İÇİN ×" yazıları da duruyor ve İKİSİ DE BASILAMIYOR. Kullanıcı basmaya çalışır, hiçbir şey olmaz. Ya yarım kalmış buton, ya buton gibi duran açıklama. **Ölçülecek: bunlar ne için orada? Çalışır hale mi gelecek, kaldırılacak mı?** | ⏸️ ölçüm bekliyor |
| 10 | **Ayarlar paneli açıkken tur duraklamıyor, ses de susmuyor** | ⏸️ ölçüm bekliyor |
| 17 | **Bölüm çubuğu idle'da görünmüyor** | ⚠️ **HATA DEĞİL — ESKİ KARAR.** `index.html:225-229` G144 notu: idle'da kapalı olması BİLEREK yapılmış. Sonsuz ayrımı da doğru çalışıyor (Serbest'te hiç açılmıyor → **#11 kapandı**). **Logic kararı DEĞİŞTİRDİ: idle'da görünecek.** `showChapter` koşulu `challenge.active` yerine `isChallenge()`'a bağlanacak (app.js:3520) | 🔧 düzeltilecek |
| 37 | ⭐ **HATA DEĞİL — GİZLİ ÖZELLİK ÇIKTI.** Durdur'a basıp sonra cevap verirsen geri bildirim otomatik geçmiyor, sen "geç" diyene kadar ekranda kalıyor. `pauseRound()` `autoStopped=true` yapıyor, `ensureAutoNext()` ilk satırı `if (autoStopped) return;`. **Mantık doğru: durdurmayı bilerek basan kullanıcı yavaşlamak istiyor.** Geri bildirim süresi kısa, metni okumak zor — bu, süreyi uzatmadan okuma imkânı veriyor. **Logic kararı: çubuk KALSIN, sadece "i" metnine açıklama eklensin.** Çubuğun donuk durması "otomatik geçiş kapalı" sinyali olarak kalabilir | 📝 "i" metnine eklenecek (#35 ile birlikte) |
| 36 | **"Bugünün Önerisi" Pro'ya taşınsın** — Öneri zayıf bölge analizine dayanıyor, ama zayıf bölge raporu ve ilerleme geçmişi zaten Pro özelliği. Ücretsiz kullanıcı veriyi göremiyor ama öneriyi görüyor — tutarsız. **Logic kararı: Pro'ya taşınsın** | 🔧 düzeltilecek |
| 29 | 🔴 **FREKANS BULMA'DA PLAY/PAUSE YİNE KARIŞIYOR — OTOMATİK GEÇİŞ ÖLÜYOR** — Buton hep PLAY'de kalıyor, pause hiç gelmiyor. Play'de kaldığı için **feedback ekranında süre ilerlemiyor, otomatik geçiş çalışmıyor.** Bug 23 (9f61003) A/B döngüsü tarafını düzeltmişti ama bu farklı bir yol. Kullanıcı her soruda elle geçmek zorunda kalıyor | 🔴 **ÖNCELİKLİ** |
| 32 | **Referans filtreleri listesi değişsin** — "Telefon Hoparlörü" kalksın, yerine **Bluetooth hoparlör (JBL tarzı "ses bombası")** gelsin. Gerekçe: kimse artık telefon hoparlöründen müzik dinlemiyor, taşınabilir bluetooth hoparlör gerçek bir dinleme ortamı. **Yeni DSP profili gerekiyor** | ⏸️ **TASARIM — ölçüm gerekiyor** |
| 44 | 🔴 **Geri bildirimde eğriler HÂLÂ NET GÖRÜNMÜYOR** — G193 max-height:29vh çözümü panelin canvas'a binmesini engelledi (metin okunuyor, panel binmiyor) AMA eğriler yine de net değil. Blur(14px) hâlâ arkada duran her şeyi yumuşatıyor olabilir, ya da eğri kontrastı düşük. **Kullanıcı yanlışını GÖREMİYOR — bu öğretimin parçası** | 🔴 **YENİDEN AÇILDI** |
| 55 | 🔴 **SINAV BARI HATASI — 12 MODDA ÖLÇÜLMELİ** — Sınava kadar gelindi, sınav geçilemedi, **soru sayaç barında hata var.** Bu sefer sıfırlanmadı (#54'te sıfırlanıyordu) — farklı bir belirti. Logic: "12 modda sınav barı hatasını ölçmek gerek". #54 ile aynı aile: bölüm/telafi/sınav akışının sayaç göstergesi | 🔴 **ÖLÇÜM — 12 modda** |
| 56 | **Mixini Yükle: Antrenman'a gidip dönünce baştan alıyor** — Durdurmadan Antrenman sekmesine geç → Araçlar'a dön → şarkı baştan başlıyor. G201'de "mod ekranına girip çıkma" düzeltildi ama **sekme değişimi** kapsanmamış | 🔧 düzeltilecek |
| 57 | **Ölçüm Sonuçları ve analiz geçmişinde temizleme yok** — Dosyalarım'da çöp ikonu + "Tümünü temizle" var (G202) ama **"Son Ölçümler" / analiz geçmişinde yok.** Aynı temizleme imkânı orada da olmalı | 🔧 düzeltilecek |
| 58 | 🔴 **Mixini Yükle'deki dosya kaldırılınca REFERANS FİLTRELERİ de devre dışı kalıyor** — "×" ile Mixini Yükle'nin seçimi kaldırılınca Ölçüm Sonuçları ve Tonal Balance'ın devre dışı kalması NORMAL (o dosyaya bağlılar). AMA **Referans Filtreleri kendi bağımsız dosyasına sahip** (G159/G182) — neden devre dışı kalıyor? Bağımsızlık bozulmuş | 🔴 **ÖLÇÜM GEREKİYOR** |
| 54 | 🔴 **TELAFİ TURUNDA KİLİTLENME — kullanıcı nerede olduğunu anlamıyor** — Düşük Güç Modu'nda, Frekans Bulma'da: defalarca "Atla" → şıklara rastgele bas → 10 soru bitti → **telafi turu geldi ama GEÇİLEMİYOR** → sonra soru sayacının ilerlemediği bir ekrana düşüldü. Kullanıcı hangi aşamada olduğunu anlamıyor. **Muhtemel sebepler:** (a) telafi turunun çıkış koşulu sağlanamıyor, (b) "Atla" ile geçilen turlar telafi sayacına yazılmıyor, (c) sayaç UI'ı telafi turunda güncellenmiyor. **Düşük Güç Modu tetikleyici mi, yoksa rastgele/atlamalı oynama mı — ayrıştırılmalı** | 🔴 **ÖNCELİKLİ — ölçüm gerekiyor** |
| 53 | **10 dakika arka plandan dönünce oyun YENİDEN BAŞLIYOR** — Tur kaldığı yerden devam etmiyor, sıfırdan başlıyor. Kullanıcının ilerlemesi kayboluyor (o turdaki cevap, süre, combo). **KARAR (Logic): kaldığı yerden devam etsin, ücretsiz kullanıcıysa CAN GİTMESİN.** Arka planda geçen süre yüzünden can kaybı olmamalı — kullanıcının hatası değil. **Not:** kısa arka plan dönüşleri çalışıyor (G134/G135 kurtarma), sorun UZUN sürede | 🔧 düzeltilecek |
| 52 | **AIF dosyası kabul edilmiyor** — Kullanıcı .aif yüklemeye çalıştı, uygulama almadı. **AIFF stüdyoda yaygın format** — Logic Pro'nun varsayılan bounce formatlarından biri. Hedef kitle prodüktörler, çoğu AIFF kullanıyor. Ölç: hangi formatlar destekleniyor, AIFF eklenebilir mi (iOS AVAudioFile AIFF'i destekliyor) | 🔧 **HEDEF KİTLE İÇİN ÖNEMLİ** |
| 50 | **Kulaklık çıkınca oyun DURMUYOR** — Kulaklık çıkarıldığında ses telefon hoparlöründen çalmaya devam ediyor, tur da devam ediyor. iOS standardı: kulaklık çıkınca oynatma duraklar (kimse istemeden sesi etrafa duyurmasın). **Ayrıca kulak eğitimi uygulamasında hoparlörden devam etmek zararlı** — kullanıcı yanlış ekipmanla cevap verip canını kaybediyor | 🔧 düzeltilecek |
| 51 | **Hızlı kulaklık tak/çıkar: 10 denemede 2 kez ses kesildi** — Ses geri gelmedi, uygulama sessiz kaldı. Route değişimi arka arkaya olduğunda AVAudioSession/AudioContext toparlayamıyor. **%20 başarısızlık oranı** — nadir ama gerçek | ⏸️ ölçüm gerekiyor |
| 49 | **Araçlar'da temizleme yolu yok mu?** — İki ayrı liste birikiyor: (a) **yüklenen şarkılar** (Dosyalarım), (b) **analiz geçmişi** (Ölçüm Sonuçları'nın geçmişi). Kullanıcı bunları temizleyebiliyor mu? Devirde "sola kaydır-sil" notu var ama test edilmedi. **Ayrıca:** silinen dosya bir modda SEÇİLİYSE ne oluyor — mod bozuluyor mu, sıfırlanıyor mu? | ⏸️ **ÖLÇÜM GEREKİYOR** |
| 47 | **Mixini Yükle: durdur→başlat şarkıyı BAŞTAN alıyor** — Duraklat sonra tekrar başlat dendiğinde kaldığı yerden değil, dosyanın başından çalıyor. Referans Filtreleri'nde pause/resume doğru çalışıyor (G192), burada değil. **İki bölüm farklı davranıyor** | 🔧 düzeltilecek |
| 48 | 🔴 **Bölge dinleme "Mixini Yükle" oynatıcısında ÇALIŞMIYOR** — Tonal Balance grafiğindeki banda dokununca o bölge solo dinleniyor, ama bu SADECE Referans Filtreleri çalarken işe yarıyor. "Mixini Yükle"den çalarken banda dokunulunca **hiçbir şey olmuyor** — ses değişmiyor, solo devreye girmiyor. Kullanıcı kendi mixini analiz ediyor, "SUB fazla" diyor, o bandı dinlemek için dokunuyor, tepki yok | 🔴 **ÖNCELİKLİ** |
| 46 | 🔴 **YANLIŞ E-POSTA ADRESİ** — Ayarlar → "Bize ulaşın" kısmında `destek@audioengineer.academy` yazıyor. **Doğrusu:** `destek@audioengineeracademy.com`. Yanlış alan adı — kullanıcının yazdığı mail HİÇ ULAŞMAZ. Destek sayfası ve App Store Support URL doğru adresi kullanıyor | 🔴 **ÖNCELİKLİ** |
| 45 | **Waveform dolgusu atlamalı ilerliyor** — akıcı değil, kesikli/sıçramalı. G192'nin rAF döngüsü çalışıyor ama güncelleme sıklığı yetersiz ya da her karede tam yeniden çizim yapılıyor olabilir. Seek ve pause doğru çalışıyor | 🔸 küçük |
| 43 | ✅ **HATA DEĞİL — KALICILIK ÇALIŞIYOR.** Stereo Genişlik'e girince gate paneli bir an görünüp kayboluyor. Sebep: modun DAHA ÖNCE seçilmiş dosyası `sourceSelections`'ta kayıtlı, gate onu bulup kendini kapatıyor. Logic doğruladı: Araçlar'daki dosya değiştirildi, modda o çalmıyor — yani Araçlar'dan kaçak YOK, mod kendi kayıtlı dosyasını kullanıyor. **Doğru davranış.** Tek estetik sorun: gate bir an görünüp kayboluyor (flash), ilk render'da state okunmadan çiziliyor olabilir | 🔸 küçük: gate flash'ı |
| 42 | **Ayarlar → Hesap satırında Pro'da hâlâ "Pro'ya geç" butonu var** — Satır doğru yazıyor ("Pro simüle") ama yanındaki mavi buton hâlâ "Pro'ya geç" diyor. Pro kullanıcıya Pro satmaya çalışıyor. #40 ailesinden: Pro'da ücretsiz sürüme ait hiçbir şey görünmemeli | 🔧 düzeltilecek |
| 40 | **Pro/geliştirici modunda "i" metninde hâlâ CAN bölümü var** — Pro'da can sistemi yok ama ana menü "i"sinde "5 canın var, 30 dakikada dolar" yazısı görünüyor. Bug 26'da can GÖSTERGESİ gizlendi ama METİN kalmış. **Genel kural: Pro'da ücretsiz sürüme ait hiçbir şey görünmemeli** | 🔧 düzeltilecek |
| 41 | **Tonal Balance "i" metnindeki bölge dinleme açıklaması en altta kalmış** — eklendi ama sıralamada sona düşmüş, keşfedilmesi zor. Daha üste alınmalı | 🔧 düzeltilecek |
| 39 | **Ücretsiz sürüm kuralları ana menü "i" metninde anlatılsın** — 5 soru/seans sınırı, 5 can, canların zamanla dolması, **reklam izleyerek +5 soru (günde 3 hak)**. Kullanıcı bunları paywall'a çarpınca öğreniyor, önceden bilmiyor | 📝 "i" metnine eklenecek |
| 38 | 🔴 **Referans Filtreleri'nde waveform BOZUK** — dalga formuna dokununca ilerletme çalışmıyor. Dahası: **pause'a basınca waveform doluyor** (ilerleme göstergesi tersine çalışıyor gibi). #33 (seek özelliği) bu yüzden test edilemiyor — önce mevcut waveform davranışı ölçülmeli | 🔴 **ÖLÇÜM GEREKİYOR** |
| 33 | **Referans Filtreleri'nde waveform üzerinde seek** — dalga formuna dokununca o noktaya atlasın. Kullanıcı şarkının istediği bölümüne (nakarat, drop vb.) gidebilsin. Şu an sadece baştan çalıyor | ⏸️ **YENİ ÖZELLİK** |
| 31 | **Akordiyon davranışı yok** — Ölçüm Sonuçları açıkken Referans Filtreleri'ne basılınca Ölçüm Sonuçları kapanmalı (akordiyon), kapanmıyor. İkisi aynı anda açık kalıyor. Logic daha önce istemişti, uygulanmamış | ⏸️ ölçüm bekliyor |
| 30 | **Sekme değişiminde hayalet seçim** — İlerleme sekmesine gidip Araçlar'a dönünce, seçili olmayan bir öğe seçiliymiş gibi görünüyor. **Logic sonradan netleştirdi:** Referans Filtreleri değil, **Tonal Balance'ın bölge dinleme butonları** — dönünce TİZ bölgesi basılı kalmıştı. Sekme değişiminde bölge seçimi sıfırlanmıyor | ⏸️ ölçüm bekliyor |
| 35 | **Tonal Balance'ın bölge dinleme özelliği "i" (bilgi) metninde YOK** — Grafikteki bantlara dokununca o bölgeyi solo dinleme özelliği var ama bilgi metninde anlatılmıyor. Logic bile unutmuş. **Aynı kontrolü tüm modların "i" metinlerine yap:** her modun gizli/anlatılmayan etkileşimi var mı? | ⏸️ **TARAMA GEREKİYOR** |
| 34 | **TERİMLER ELDEN GEÇECEK** — Feedback ekranında "tiz/hava" yazıyor. Sektörde bazı terimler İngilizce kullanılıyor ("air" gibi), Türkçeye çevrilmesi doğru değil. **Tüm sözlük + rozet isimleri birlikte gözden geçirilecek.** Rozet isimleri de yapay zeka işi duruyor (#İleri sürüm notu). Ayrıca kodda 9 rozet / tasarımda 6 rozet uyuşmazlığı var | ⏸️ **TOPLU İŞ — ayrı oturum** |
| 26 | **Pro'da can göstergesi kalksın** — Pro'da can sistemi yok ama `#hearts` hâlâ 5 kalp gösteriyor. Claude Code G178'de görmüş, "kapsam dışı" bırakmıştı | 🔧 düzeltilecek |
| 27 | **Geliştirici modunda İsabet Grafiği hâlâ "Pro ile aç" diyor** — geliştirici modu `isUserPro()`'yu true yapıyor ama bu bölüm kilitli görünüyor. Bir yerde `isUserPro()` yerine başka bir kontrol var | 🔧 düzeltilecek |
| 28 | **İsabet grafiği noktalarına detay** — grafikteki her banda ait noktaya basınca bilgi açılsın: o bantta kaç deneme, kaç isabet, oran. **YENİ ÖZELLİK, hata değil.** Logic: "1.0'a yazılsın ama yayına kapalı çıksın" — zaman kalırsa | ⏸️ **SIRAYA ALINDI, zaman kalırsa** |
| 25 | 🔴 **PAYWALL TUTARSIZ — İLK AÇILIŞTA REKLAM SEÇENEĞİ YOK** — Ücretsiz modda 5 can bitince açılan paywall'da SADECE "Pro'ya Geç" ve kapatma var, "reklam izle" YOK. Kapatınca oyun ekranına dönüyor (ana menüye değil) ve ses çalıyor. "Atla" 2 kez çalışıyor, sonra AÇILAN İKİNCİ paywall'da reklam seçeneği VAR ve oradan çıkış ana menüye gidiyor. **Aynı ekran iki farklı içerik ve iki farklı çıkış davranışı gösteriyor** | 🔴 **ÖNCELİKLİ** |
| 23 | **Play/Pause ikonu karışıyor** — oyun türü değiştirildiğinde ses ÇALIYOR ama ekranda pause değil PLAY ikonu görünüyor. Ses ile ikon durumu senkron değil | ⏸️ ölçüm bekliyor |
| 24 | **Bug 17 CİHAZDA ÇALIŞMIYOR** — Playwright'ta doğrulandı ama cihazda "BÖLÜM 1/10" + 10 boş nokta idle'da HÂLÂ görünmüyor, play'e basınca geliyor. Düzeltme öncesiyle aynı davranış | 🔴 **YENİDEN AÇILDI** |
| 22 | 🔴🔴 **PRO KULLANICI CANLARI BİTMİŞSE OYNAYAMIYOR** — `blockIfLivesOut()` (app.js:1516-1520) sonundaki `return true` KOŞULSUZ. `isUserPro()` kontrol ediliyor ama sadece paywall açılmasını engelliyor, round yine başlamıyor. Ne paywall, ne hata mesajı — SESSİZCE engelliyor. Ayrıca `startFreshAttempt()` (app.js:6653) Pro kontrolünü HİÇ yapmıyor, "Canların bitti, 30 dk'da 1 can" diyor. **Senaryo: kullanıcı ücretsiz oynar → canlar biter → paywall görür → Pro SATIN ALIR → hâlâ oynayamaz.** App Store incelemesinde "satın aldım çalışmıyor" olarak yakalanabilir. Geliştirici modu semptom, asıl mağdur GERÇEK PRO KULLANICI | 🔴🔴 **EN ÖNCELİKLİ** |
| 20 | 🔴 **CANLAR BİTİNCE ÇIKIŞ YOK** — Can bitiminde paywall açılıyor ama X'e basınca ana sayfaya dönülmüyor. Kullanıcı ya Pro alacak ya reklam izleyecek, üçüncü yol yok. **Kullanıcıyı kilitliyor — App Store incelemesinde de risk (Apple "kullanıcı çıkamıyor" durumlarını reddedebilir).** | 🔴 **ÖNCELİKLİ** |
| 21 | **Geri bildirim panelini alt "Atla ▶" barı kesiyor** — panelin altındaki "SONRAKİ SORU" ve "ATLAMAK İÇİN ×" yazıları Atla barının altında kalıyor, okunmuyor. #9 ile bağlantılı ama bu üst üste binme | ⏸️ ölçüm bekliyor |
| 19 | **Süre göstergesi önceki modun süresini gösteriyor** — moda girildiğinde timerText/timerBar önceki modun kalan süresini taşıyor. Ölçüldü: "12.6s / %78.75" (önceki modda 2.5sn oynanmıştı). Sebep: `roundFlow.stopAll()` timeLeft/roundDuration sıfırlamıyor, `updateTimerUI()` `enterMode()`'da hiç çağrılmıyor. **Bug 2'nin ikinci yarısı — segment noktaları düzeltildi, süre çubuğu kaldı** | 🔧 düzeltilecek |
| 18 | **Reverb'de play butonu ortalanmamış** — sola kaymış. Stereo Genişlik'te ortada. İpucu butonunun genişliğinden kaynaklanıyor olabilir | ⏸️ ölçüm bekliyor |
| 15 | **Reverb'de C harfi kutu içinde değil** — Bug 5 düzeltmesinin (gap 4px) yan etkisi. A/B/C butonlarından C'nin kutusu kayıp/kırpılmış | ⏸️ ölçüm bekliyor |
| 16 | ✅ **HATA DEĞİL — ÖLÇÜM HATASIYMIŞ.** `display:none` elemanın `getBoundingClientRect()` değeri {top:0,bottom:0} döner; eski script 0−134 hesaplayıp −134 üretmiş. Gerçek boşluk **+20px**, dB Seviyesi'nin 10px'ine yakın. Ekran görüntüsüyle doğrulandı, diğer modlarla tutarlı. Eski açıklama: — dosya yüklenmemiş ekranda. Claude Code git stash ile doğruladı: düzeltmeden ÖNCE de vardı, yeni değil. `#uploadGate` panelinin layout etkisi | ⏸️ ölçüm bekliyor |
| 13 | **Araçlar: Referans Filtreleri'nde çalan ses durdurulamıyor** — Mixini Yükle'ye yüklenen dosya Referans Filtreleri'nde de çalıyor, ama oradan çalarken dosya değiştirilirse durdurulamıyor. Sebep: üstteki "Mixini Yükle" bölümünün play/stop kontrolü tetiklenmiyor, çünkü ses o bölümden başlatılmadı. **İki bölüm aynı dosyayı paylaşıyor ama oynatma kontrolleri ayrı.** | ⏸️ ölçüm bekliyor |
| 14 | **Araçlar: Mixini Yükle ve Referans Filtreleri ayrı dosya seçebilmeli** — şu an aynı dosyaya bağlılar. **#13'ün yaşanmasıyla istek doğrulandı — bağımsız olmak hem hatayı çözer hem kullanımı açar.** ✅ **1.0'A ALINDI** | 🔧 prompt bekliyor |
| 12 | **KARŞILAŞTIRMALI DİNLETME YOK** — yanlış cevapta kullanıcı kendi seçtiğini ve doğruyu arka arkaya DİNLEYEMİYOR. 12 modun hiçbirinde yok. `TAM-LISTE.md`'de ileri sürüm fikri olarak kayıtlı ama Logic 1.0'a almayı düşünüyor. Rakiplerin (SoundGym, TrainYourEars) en zayıf yanı + oyun felsefesine ("gerçek mix kararı") tam oturuyor. İş yükü: 12 modda ayrı ayrı çalışması gerekiyor | ⏸️ **KARAR: 1.0 mı 1.1 mi** |
| 11 | ✅ **KAPANDI — HATA DEĞİL.** Sonsuz (Serbest) ayrımı kodda var ve doğru çalışıyor: `startChallenge()` sadece `isChallenge()` true iken çağrılıyor, Serbest'te `challenge.active` hiç true olmuyor, çubuk doğru şekilde gizli kalıyor. Ölçüldü. Eski açıklama: — tutarsız. Ayrıca süreye bağlı "hızlı cevap 1.2x" çarpanı sonsuzda ne oluyor? Tasarım kararı mı, hata mı — kodda belirsiz | ⏸️ ölçüm bekliyor |

**En ciddi olan 7 numara** — kullanıcı hangi kaynağı dinlediğini bilemiyor.

**#1'in kök sebebi (581f798 raporundan):** Üç katman birikmiş —
`min-width:fit-content` içerik-bazlı taban, `.srctag` hiç `flex:1`
almamış (**G143'te düzeltildiği sanılmış ama kod hiç yazılmamış**),
`#mixToggle`'ın tarayıcı varsayılan buton stili flex dağıtımının
üstüne binmiş. Çip konusunun 5-8 kez dönmesinin sebebi muhtemelen
ortadaki madde. Çip satırı ortak CSS'ten geliyor — mod dosyalarına
dokunulmadı, 12 mod birden düzeldi.

**Reverb'de ek gözlem:** İpucu butonu genişleyince play ve A/B/C
butonları sağa itilmiş, döngü butonu kenara yapışmış. 5 numaranın
yan etkisi.

**4 numara hakkında:** Boost mu Cut mu, Q Genişliği, Kesim Noktası ve
Frekans Bulma karelerinde "SPEKTRUM · B İŞLENMİŞ" başlığı altındaki
eğri birebir aynı ve düz. Dört farklı işlem, tek görüntü. Bu, daha önce
not edilen "analizör işlenmemiş sinyali gösteriyor" şüphesini
güçlendiriyor. Safari Web Inspector ölçümü gerekiyor.

---

## MİMARİ BULGUSU (581f798 sonrası tarama)

12 modun tamamı **ortak bileşen** kullanıyor. Kopya kod neredeyse yok:

| Öğe | Durum |
|---|---|
| İpucu butonu | ORTAK — `updateHintChipLabel()`, tek bayrakla (`mode.THREE_WAY`) iki varyant |
| Kontrol satırı | ORTAK mekanizma, mod başına bayrak kombinasyonu (5 grup: A–E) |
| Kaynak çipi | ORTAK — 11/12 mod. Frekans Çakışması istisna (çift seçici, tasarlanmış) |
| Kaynak menüsü | ORTAK — `populateSourceSelect()` |
| Geri bildirim | ORTAK çekirdek `setFeedback()` + Frekans Bulma'ya 2 opt-in katman |

**Yani "her moda kopyalanmış" korkusu doğru çıkmadı** — mimari sağlam,
sorunlar ortak fonksiyonlardaki eksik senkronizasyondan geliyor.

### ⚠️ TEKRAR EDEN KALIP — IDLE vs ROUND

Üç ayrı hata, tek kök neden: **uygulama idle durumunda (play'e
basılmadan önce) bir şeyi yapmıyor, round başlayınca yapıyor.**

| Hata | İdle'da | Round'da |
|---|---|---|
| **Bug 2** — ilerleme çubuğu | önceki modun değeri duruyor | doğru değere sıfırlanıyor |
| **Bug 7** — kaynak çipi | `activeQuestion` null, etiket eski | `app.js:5278` güncelliyor |
| **Bug 6** — analizör boşluğu | `drawOverlay()` içinde `if (!q) return` → canvas boş ama 252px yer tutuyor | dB-bar / pan-iğnesi / genişlik göstergesi çiziliyor |

**Bug 6'da kritik yakalama:** O 252px'lik kutu BOŞ DEĞİL — round
sırasında dB Seviyesi'nin çubuğu, Pan Konumu'nun iğnesi ve Stereo
Genişlik'in göstergesi orada çiziliyor. Kalıcı `display:none`
yapılsaydı üç modun görsel geri bildirimi tamamen kaybolacaktı.
**Seçilen çözüm: sadece idle'da kalksın, play'e basınca geri gelsin.**

| **Bug 17** — bölüm çubuğu | 10 Soruluk Bölüm'de moda ilk girişte çubuk HİÇ YOK | play'e basınca geliyor |

🔴 **ÜÇÜNCÜ ÖRNEK ÇIKTI (Bug 17).** Tek tek yamalamak yerine
`enterMode()` + idle-state yönetimi **bütün olarak** gözden
geçirilmeli. Aynı kalıbın dördüncü, beşinci örneği büyük ihtimalle
başka yerlerde de duruyor.

**Kural:** Bir hata "play'e basınca düzeliyor" diye tarif edildiyse,
ilk bakılacak yer idle durumu.

**Küçük risk:** `THREE_WAY` bayrağı iki ayrı yerde tanımlı —
`app.js:63` (THREE_WAY_MODE_IDS) ve mod dosyalarında ayrı ayrı
(`kompresor.js:98`, `reverb.js:59`, `distortion.js:42`).
Bugün senkron, ileride ayrışabilir.

---

## NOT

Bozuk bulursan hemen düzeltmeye çalışma — hepsini listele, sonra
toplu bakalım. Tek tek düzeltmek hem yorucu, hem aynı kök nedene
bağlı sorunları ayrı ayrı çözmeye yol açıyor.

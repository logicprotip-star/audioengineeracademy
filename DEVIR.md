# AUDIO ENGINEER ACADEMY — DEVİR BELGESİ
**Tarih:** 20 Ağustos 2026
**Durum:** v1.0 (build 2) App Store incelemesinde, 24 Ağustos'ta otomatik yayın

---

## 1. PROJE

Türkçe kulak eğitimi uygulaması. Hedef kitle: müzik prodüktörleri ve ses mühendisleri. Soyut ton dinletmek yerine gerçek mix kararlarından türetilmiş 12 egzersiz sunuyor.

**Sahibi:** Şahin Salt (LogicProTrick) — 14 yıllık ses mühendisi, YouTube eğitmeni
**Yol:** `~/Documents/Developer/audio-engineer-academy`
**Bundle ID:** `com.logicprotrick.audioengineeracademy`
**Yığın:** Capacitor + Xcode (iOS), Web Audio API, StoreKit, AdMob/UMP, özel `AudioSessionPlugin.swift`
**Test:** npm 1680, Playwright e2e 189

**İş modeli:** Tek seferlik ₺399,99 Pro satın alma. Abonelik yok. Ücretsiz sürümde 5 egzersiz, seans başına 5 soru, 5 can.

---

## 1B. GÜVENLİ NOKTA ⚠️

Gönderilen hal etiketlendi:

```
v1.0-submitted
```

**Bir şey bozulursa buraya dön:**
```
git checkout v1.0-submitted
```

Bu nokta App Store'a gönderilen, cihazda test edilmiş, çalışan haldir. Herhangi bir iş kolunda (dil, Android, 1.1) geri dönülemez bir bozulma olursa referans burasıdır.

⚠️ **Commit numaraları hakkında:** Bu belgedeki G-numaraları referanstır, **kanıt değil**. Bu oturumda numaralar iki kez yanlış hatırlandı (G284'ün yapıldığı sanıldı, yapılmamıştı; G296/G305 atfı yanlış çıktı, doğrusu G276/G304'tü).

Bir commit'e dayanarak karar vermeden önce doğrula:
```
git log --oneline | grep G3xx
git log -S "aranan_kod" --oneline
```

---

## 2. ÇALIŞMA YÖNTEMİ

Bu projede kurulan düzen — devam eden sohbetlerde de korunmalı:

**Akış:** Claude (bu sohbet) prompt yazar → Logic Claude Code'a yapıştırır → Claude Code kodlar ve rapor verir → Logic gerçek cihazda test eder → Claude değerlendirir, sonraki prompt'u yazar.

**Kurallar:**
- **VARSAYIM YASAK** — ölç, sorgula, sor. Merkezi kural.
- Kapsam gösterilmeden prompt yazılmaz. Logic onaylar, sonra prompt gelir.
- Her prompt kendi kendine yeterli olmalı — Claude Code oturumları sık `/clear`lanıyor.
- Her prompt "önce DURUM.md oku" içerir.
- Regresyon koruması zorunlu: KİLİT bloğu (bozulmayacak commit'ler, test eşikleri), DOKUNULMAYACAK listesi.
- `git stash` ile kırmızı/yeşil doğrulama her düzeltmede.
- Bir iş bitmeden diğerine geçilmez.
- Commit'ler G-önekli (G337'ye kadar geldi).

**Öğrenilen:** Cihaz testi, otomatik testlerin göremediğini yakalıyor. Bu oturumda en kritik hataların çoğunu Logic cihazda buldu, Playwright üç kez aynı hatayı kaçırdı.

---

## 3. MİMARİ

**Ses motoru:** Web Audio API, `OfflineAudioContext` ile ölçüm, `BiquadFilterNode` ile filtreleme.

⚠️ **Kritik bilgi:** Web Audio'da `Q` parametresi lowpass/highpass için klasik kalite faktörü **değil** — "kesim noktasındaki rezonans, dB cinsinden". Peaking filtrelerde klasik Q. Bu karışıklık Kesim Noktası'nda 470 sentlik sapmaya yol açtı, G334'te düzeltildi. Yeni filtre kodu yazılırken buna dikkat.

**A/B/C zinciri:** Kompresör ve Saturation'da kesintisiz geçiş (G266). Reverb dahil değil.

**Native köprü:** `AudioSessionPlugin.swift`, `MainViewController.swift` alt sınıfı üzerinden. ⚠️ Capacitor'da eklentinin Xcode'da derlenmesi kayıtlı olduğu anlamına gelmiyor — `capacitorDidLoad()` içinde açık kayıt gerekiyor.

**Kalıcılık:** Tüm veri `localStorage`. `trySave()` koruması, şema sürüm damgası. Sunucu yok, hesap yok.

**Belgeler:** `DURUM.md` (durum), `TASARIM.md` (tasarım), `KAPSAMLAR.md`, `ZORLUK.md` (bayat, 12 modun 10'unu kapsıyor).

---

## 4. KAYNAK KÜTÜPHANESİ

**Standart (tüm dosyalar):**
- 78 BPM, grid fazı 0.240 sn
- 8 bar = 24.6154 sn (kısa dosyalarda 2 bar = 6.1538 sn)
- Tepe −6.00 dBFS, mono, AAC ~192 kbps 44.1 kHz
- Baş ve sona 1.5 ms fade
- Döngü dikişi < −60 dBFS
- DC offset ~%0.0003

**Kaynaklar:** kick, snare, hihat, tom, groove, bass, acoustic_guitar (+stereo), clean_guitar (+stereo), arpeggio_guitar, vocal, vocal_1 (Vokal 2), snare_late (gizli, sadece çiftlerde)

**Frekans Çakışması çiftleri (7):**

| Çift | Not |
|---|---|
| kick + bas | G330'da geri eklendi |
| akustik + clean gitar | kaydırma yok |
| bas + akustik gitar | akustik +377 ms |
| bas + clean gitar | clean +377 ms |
| snare_late + clean gitar | snare +377 ms |
| vokal2 + clean gitar | gain −1.6 dB |
| vokal2 + akustik gitar | |

⚠️ Çiftlerin hizalaması **kulakla** onaylandı, ölçümle değil. G302'de ölçüme göre değiştirildi, tutmadı, G308'de geri alındı. Kulak kararı ölçümü geçersiz kıldı.

⚠️ `SOURCE_PAIRS`'a `offsetA/offsetB` (ms) ve `gainA/gainB` (dB) alanları var. `createQuestion`'ın `pair` nesnesi bu alanları **iki kez düşürdü** (G288, G295) — yeni alan eklenirken kontrol edilmeli.

⚠️ `#cakismaPairSelect` listesi `index.html`'de elle yazılı, `SOURCE_PAIRS`'tan üretilmiyor. Çift eklenince **üç kez** güncellenmesi atlandı.

---

## 5. BU OTURUMDA KAPANANLAR (G300–G337)

**Ses**
- Çıkışta ses durmuyordu — 6 çağrı noktası (G300)
- Ekran açılınca ses kapanmıyordu (G315)
- Frekans Çakışması aşama 3'ün "ses devam etsin" istisnası kaldırıldı (G320)
- Hızlı atlamada ses birikmesi — reentrancy kilidi (G325)
- Atlamada süre sayacı temizlenmiyordu (G328) ← asıl kök sebep
- Kulak butonu geri bildirim süresini ikiye katlıyordu (G318)

**Mekanik**
- İlk soruda atlayınca ilerleme kilitleniyordu (G313) ← Logic'in çapraz testiyle bulundu
- Sınav ekranından çıkarken hayalet yanlış cevap (G310)
- `persistExamProgress` sıra hatası (G311)
- Sınav/telafi kalıcılığı — mod bazlı + localStorage (G307)
- Telafi hedeflemesi bozulmuştu, düzeltildi (G323)
- Kaynak/çift hatırlama (G303)
- Tekrar önleme (G292)

**Ölçüm doğruluğu**
- **Kesim Noktası'nda 470 sent frekans sapması** (G334) ← en kritik bulgu
- Aynı hata seviye telafisinde de vardı, düzeltildi

**Kaynak/soru kalitesi**
- Tonal Denge 2 → 11 kaynak (G335)
- Tonal Denge sessiz bantta soru sormuyor (G336)
- Sentetik kaynaklar Kompresör'den çıkarıldı (G337) — saw'da kompresör hiçbir şey yapmıyordu
- Tonal Denge kısmi doğruya XP (G317)

**Arayüz**
- Izgara eşiği 420 → 389 px, çoğu iPhone ikişerli görüyor (G293)
- Menü kaydırma konumu korunuyor (G294)
- Atlama beyaz nokta (G324)
- Pro Plus sadece Frekans Bulma'da görünüyor (G329)
- İlerleme kartları kapalı açılıyor + özet satırı (G296)

**Güvenlik**
- 7-tık geliştirici modu `DEV_MODE`'a bağlandı (G299)
- Günlük görev sömürüsü (G289) — ömür boyu istatistikten okuyordu
- Dosya adı logları `DEV_MODE`'a alındı (G3xx)

---

## 6. AÇIK İŞLER — 1.1

### Yüksek öncelik

**Boss atlama kök sebebi**
Boss turunda atlanınca `stats.rounds` ilerlemiyor, sonraki soru da boss geliyor. Kullanıcı atladıkça boss tekrarlıyor, 10 soruluk bölümü tüketiyor. Şimdilik "i" metnine uyarı konuldu (G331). Kasıtlı değil.

**Kulak butonlarında izolasyon**
Şu an "doğru cevap / senin seçtiğin" dinletiyor, kullanıcı farkı ayırt edemiyor. Sorulan şeyi izole edip dinletmek öğretim değerini kökten değiştirir.
- 5 modda mümkün: Frekans Bulma, Kesim Noktası, Q Genişliği, Boost/Cut, Frekans Çakışması aşama 1
- 3 modda yapısal olarak mümkün değil: dB Seviyesi, Pan Konumu, Stereo Genişlik (frekans ekseninde değiller)
- Mekanizma hazır: `toolsApplySoloBandFilter` (app.js:13388), Araçlar'ın bölge solo özelliği
- Kullanılmayan `setDualSolo()` var — bu iş için başlanmış, yarım kalmış
- Tahmin: 15-20 dosya, 600-1000 satır, 11 e2e testi yeniden yazılacak
- ⚠️ Frekans Çakışması'nda kulak butonları **gizlendi** (G322, `CAKISMA_EAR_BUTTONS_ENABLED=false`), izolasyonla geri gelecek

**Frekans Çakışması aşama 2**
İki şık = %50 şans. Kullanıcı dinlemeden yarı yarıya doğru buluyor. Soru tipi değişmeli.

**SE düzen taşması**
375×667'de 12 modda taşma var. Kaydırınca ulaşılıyor ama kötü deneyim. Tam çözüm mimari: kontrol sırasını alt bara taşımak. Küçük müdahaleler ölçüldü, 13 satırdan 1'ini çözüyor.

### Orta öncelik

- **Telafi/sınav sırasında süre çubuğu görünmüyor** (tüm modlar)
- **"Süresiz" seçiliyken çubuk %0'da takılı**
- **Pro Plus kısıtı oyun içi ayar listesinde uygulanmıyor** (G329 eksik kaldı)
- **Kesim Noktası / Q Genişliği'nde gecikmesiz ses sorunu** — G328'den bağımsız, önceden beri var
- **Saturation'da pembe/beyaz gürültü** — en zor kademede (tape) fark 0.00 dB, ayırt edilemez
- **Hata analizi kaydı** artık atlamayı tutuyor (G326) → "Son Oyunlarım" listesi yapılabilir
- **Tonal Denge XP tablosu** — %15/35/75/100 uygulandı, ince ayar gerekebilir
- **Reverb wet high-pass** — kick telefon hoparlöründe boom yapıyor
- **snare + akustik çifti** — hizalama tutmadı, kaldırıldı (G316)
- **snare + clean seviyesi** — gitar yüksek geliyor

### Düşük öncelik / 1.2

- İlerleme sekmesi kart düzenine geçsin (ölçüldü: 700-950 satır, yüksek risk)
- İlerleme/Araçlar sekmelerinde kaydırma konumu
- "i" butonu dokunma alanı (42 px yere 44 px sığmıyor)
- Fletcher-Munson ağırlıklandırma
- Boost/cut algısal asimetrisi
- İsabet grafiği nokta detayı
- iPad, bildirimler, analitik, liderlik tablosu
- Erişilebilirlik (kontrast 4.05:1, Dynamic Type)

---

## 7. ÇÖZÜLMEMİŞ ÇELİŞKİLER

Dürüstlük gereği kayıtlı — sonraki oturumlarda tekrar karşılaşılabilir:

**Atlama sayısı çelişkisi**
Logic cihazda "3 atlamaya kadar sorun yok, 4'ten sonra ses başlıyor" gözledi. Playwright'ta 1 atlamada bile üretildi. G328 kök sebebi kapattı ama sayısal eşiğin kaynağı açıklanamadı.

**Cihaz-ölçüm uyuşmazlığı**
Bu oturumda dört düzeltme testte geçip cihazda tutmadı. Sonradan kök sebeplerinin yanlış teşhis edildiği anlaşıldı. Ders: kod okuyarak yapılan teşhis güvenilmez, canlı izleme gerekiyor.

**Tonal Denge varsayılan kaynağı**
G335 sonrası "Davul Döngüsü"nden "Snare"e değişti — liste sırası paylaşılan diziden geliyor. Kabul edildi.

---

## 8. BİLİNEN AÇIKLAR (kapatılmayacak)

| Açık | Not |
|---|---|
| `proPurchased` doğrulamasız okunuyor | localStorage'dan, StoreKit doğrulaması yok |
| `devFlags.simulatePro` kalıntısı | Eski TestFlight oturumundan kalırsa Pro açık kalır |
| `dailyKey()` saat manipülasyonu | Cihaz saati değiştirilerek can/görev sömürülebilir |
| 23 koşulsuz `console.log` | Üretimde de yazıyor |
| `showSessionEnd()` | 159 satır, çalışır durumda ama neredeyse hiç tetiklenmiyor |
| SSL sertifikası | 28.02.2027'de yenilenmeli |
| SKAdNetwork | Tek kayıt var, yeterli mi belirsiz |
| 6 flaky e2e testi | Yük altında düşüyor, izole koşuda geçiyor |

---

## 9. TEST ALTYAPISI — ÖNEMLİ EKSİK

⚠️ **Tüm e2e testleri tek viewport'ta koşuyor: 390×844.**

SE düzen sorunu bu yüzden 25 gün boyunca kaçtı. Android'e geçmeden önce viewport çeşitliliği eklenmeli — orada ekran çeşitliliği çok daha geniş.

⚠️ **Test geçmesi doğru şeyi doğruladığı anlamına gelmiyor.** Bu oturumda üç kez, düzeltme olmadan da yeşil düşen test bulundu. Yeni test yazarken "bu test düzeltme olmadan kırmızı düşüyor mu" kontrolü yapılmalı (`git stash` yöntemi).

---

## 10. APPLE DURUMU

| | |
|---|---|
| Paid Apps Agreement | ✅ Active |
| Banka (İş Bankası) | ✅ Active |
| W-8BEN + Certificate | ✅ Active (madde 10 boş — İngilizce sürüm öncesi araştırılacak) |
| DSA trader beyanı | ✅ Doğrulandı, AB'de canlı |
| Small Business Program | Başvuru gönderildi, onay bekleniyor (%30 → %15) |
| Developer Agreement | ✅ Kabul edildi (yeni sürüm, 20 Ağustos) |
| App Privacy | ✅ 7 veri türü beyan edildi, ATT uygulanıyor |
| v1.0 build 2 | ✅ Gönderildi, 20 Ağustos 01:40 |
| Yayın | 24 Ağustos, otomatik (onaydan sonra, en erken bu tarih) |

---

## 11. SONRAKİ SOHBETLER

Bu belge dört ayrı sohbetin başlangıç noktası:

**A) İngilizce sürüm**
İlk iş ölçüm: metinler nerede, ne kadar dağınık, yerelleştirme altyapısı ne kadar sürer. `guide-texts.js` toplu ama `app.js` ve mod dosyalarında dağınık metin var.
⚠️ Tek proje, iki dil dosyası. Kopyalayıp ayırmak **yapılmayacak** — iki kat bakım, birleştirilemez hale gelir.
⚠️ Terim kuralı tersine döner: şu an "sektör terimi İngilizce kalır, açıklama Türkçe". İngilizce sürümde bu ayrım kaybolur.
⚠️ Sayı biçimi: Türkçede ondalık virgül, İngilizcede nokta.

**B) Android**
Play Console açık, `www/` senkron değil, Billing yok, `AudioSessionPlugin` karşılığı yok.
⚠️ Ekran çeşitliliği iOS'takinden çok daha geniş — SE sorunu orada katlanarak çıkar. Viewport testleri önce kurulmalı.

**C) 1.1 düzeltmeleri**
Bölüm 6'daki liste.

**D) Genel**
Üç devrin birleştiği yer. Bir sorun çıktığında hangi taraftan geldiğini görmek için.

---

## 12. KİŞİSEL NOT

Logic ürün sahibi ve karar verici. Kod yazmıyor ama teşhisin çoğunu o koyuyor.

Bu oturumda ölçümlerin bulamadığı üç kritik hatayı cihazda o buldu: ilk soruda atlama kilitlenmesi (üç ölçüm kaçırdı), snare-arpej senkronsuzluğu, kompresörde saw'ın modu anlamsız kılması. Kesim Noktası'ndaki 470 sentlik frekans hatası da onun "biri gelip ölçse ne deriz" sorusuyla ortaya çıktı.

**Beklentiler:**
- Kapsam onaylanmadan prompt yazılmaz
- Ölçülmeden iddia edilmez
- Cihazda doğrulanmadan "düzeldi" denmez
- Bir bulgu geldiğinde bağlantılı olduğu diğer yerler **sorulmadan** araştırılır
- Türkçe, terse, doğrudan


# DEVİR — 15 Ağustos 2026 Gece

_Bu belge yarın sıfırdan başlayacak bir oturumun TEK giriş noktası olması
için yazıldı. Hiçbir madde tahmin/varsayımla doldurulmadı — her sayı/iddia
`git log`, `DURUM.md` ya da bugünün rapor dosyalarından doğrudan alındı._

**Son commit:** `a255e9e` (G248) · **Test durumu:** `npm test` 1390/1390,
`npm run test:e2e` 19/19 (ikisi de bu belgeyi yazmadan hemen önce yeniden
çalıştırılıp doğrulandı, TAHMİN değil).

---

## 1) BUGÜN KAPANANLAR (G214 → G248, 35 commit)

**Test sayısı: 1285 → 1390 (+105).** e2e: 0 → 19 (Playwright suite'i
G219'da SIFIRDAN kuruldu, bu güne kadar hiç yoktu).

| G# | Commit | Ne yaptı | Hangi turun bulgusu |
|---|---|---|---|
| G214 | `82f94e6` | "Atla" artık parkur/sınav/telafi sayaçlarını ilerletiyor (#54) | kullanıcı raporu |
| G215 | `a09cb7b` | Paywall'da Pro için yanlış "seans başına 10 soru" metni düzeltildi | kullanıcı raporu (C5) |
| G216 | `650ef34` | Seviye başlıkları yenilendi (7 isim değişti, eşikler AYNEN kaldı) | ürün kararı |
| G217 | `6707201` | Belge senkronizasyonu (kod yok) | — |
| G218 | `19f5b1c` | Stres testi 13/14 güncellemesi + sabah devir belgesi | — |
| G219 | `0fe3593` | `e2e/` SIFIRDAN kuruldu — paywall matrisi/sınav-telafi/layout kalıcı testleri | TEST-BOSLUGU-15-08 (A/E/F) |
| G220 | `f7c6ca5` | G63 kaldırıldı — ilk oturumda da paywall gerçek ekranıyla açılıyor | kullanıcı kararı |
| G221 | `35b8725` | Seans Sonu'nda sabit actionbar'ın içeriği örtmesi (#4c/#4d) + boş uyarı kutusu (#4a) düzeltildi | REGRESYON-15-08 |
| G222 | `4a05174` | "i" metinleri taraması (SADECE ölçüm) — 6 kaynak, 1 çelişki bulundu | — |
| G223 | `c06f93a` | Tonal Balance hedef eğrileri (Pop/EDM/Akustik) taslaktan 41 parçalık GERÇEK ölçüme geçti | kullanıcı ölçümü |
| G224 | `5ff55e8` | Madde 30 KOŞULLU doğrulandı, `showSessionEnd()` üç dalı TAMAMEN ÖLÜ doğrulandı, SSS madde 31 düzeltildi | ölçüm |
| G225 | `7eea414` | Madde 30 düzeltildi — "Atla" ile limite ulaşıp reklam izleyen kullanıcının +5 soru hakkı artık silinmiyor | G224'ün bulgusu |
| G226 | `0a571c0` | Tonal Balance "i" metnine ölçüm/yöntem bilgisi eklendi | — |
| G227 | `38f9a03` | 2 ölçüm (kod yok): Pro "done" ekranı KASITLI doğrulandı, free tarafı G97'nin varsayımıyla çelişiyor; hata analizi kayıt formatının TAM tarifi çıkarıldı | ölçüm |
| G228 | `eae97c9` | Restore Purchase asimetrisi düzeltildi (Apple 3.1.1) — buton artık HER paywall varyantında görünüyor | RET-RISKI-15-08 |
| G229 | `a50b799` | Satın alma kaybı düzeltildi — 12 `save*()`'in 10'unda hata yakalama yoktu, artık hepsi korumalı | TUR2-YARIM-15-08 |
| G230 | `4bf0329` | Negatif sıfır düzeltildi — `formatDb()` "-0.0 dB" üretiyordu, 4 formatlayıcı güvenli hale geldi | TUR2-YARIM-15-08 |
| G231 | `5b02d33` | Süre sınırı eklendi (7 dk) — 100MB+ düşük-bitrate dosyalar decode'dan ÖNCE reddediliyor | TUR3A-VERI-15-08 |
| G232 | `505235c` | Kalan 3 kayıt yeri (`TOOLS_LIBRARY_KEY` vb.) `trySave()` korumasına alındı | TUR3A-VERI-15-08 |
| G233 | `78271fb` | Şema sürüm numarası eklendi (migration mantığı henüz yok, sadece sayı) | TUR3A-VERI-15-08 |
| G234 | `4f94109` | Reklam yükleme zaman aşımı eklendi (30sn) — "İzle" butonu artık kalıcı kilitlenmiyor | TUR3B-ZAMAN-15-08 |
| G235 | `6255f26` | `abPressTimer` teardown eklendi (G187'nin aynı sınıfı, `pauseRound()`'a tek satır) | TUR3B-ZAMAN-15-08 |
| G236 | `acc5428` | **Native ses kesintisi köprüsü eklendi — EN KRİTİK bulgu.** Arama/Siri/alarm kesintisi artık JS'e ulaşıyor | TUR3B-ZAMAN-15-08 |
| G237 | `f0f2d63` | 5 soru sınırı KALICI hale getirildi — mod kapat/aç ile aşılamıyor (yan etki: reklam +5 hakkı da kalıcı) | TUR4-URUN-15-08 |
| G238 | `f8beab3` | Seviye eşikleri yaklaştırıldı — XP çarpanı 5→3, Altın Kulak hedefi 159.500→95.700 XP | ürün kararı |
| G239 | `d12e6be` | Tek yayın bayrağı kuruldu — `AD_TEST_MODE` + 43 tanı logu + 3 test kancası artık TEK `DEV_MODE`'dan türüyor | BEYAN-DENETIM-15-08 |
| G240 | `74333be` | Korumasız `while` döngüsü düzeltildi (`frekans-cakismasi.js`) — GERÇEK bir sonsuz döngü kanıtlandı | BEYAN-DENETIM/TUR5A |
| G241 | `bb72c74` | İki stale yorum düzeltildi (davranış değişmedi) | TUR6/TUR8 |
| G242 | `160f1bb` | A/B loudness eşitleme eklendi — 4 modda RBJ-matematiğinden ölçülebilir telafi kazancı | TUR8-OGRETIM-15-08 🔴 |
| G243 | `0489e37` | Convolver `normalize=false` — Room/Hall/Plate arası GERÇEK enerji farkı artık çıkışa yansıyor | TUR8-OGRETIM-15-08 🔴 |
| G244 | `c0a56bb` | EQ zinciri kazanç sınırı eklendi (±12dB) — işitme güvenliği, kendi limiter'ı eklendi | TUR9-ARACLAR-15-08 🔴 |
| G245 | `53e1de4` | Ölçüm Sonuçları kartına metodoloji "i" metni eklendi | TUR9-ARACLAR-15-08 |
| G246 | `c76393d` | iCloud yedeği hariç tutma — `Directory.LIBRARY_NO_CLOUD`, native kod YAZILMADI | TUR710-PERF-ARAYUZ-15-08 🔴 |
| G247 | `3c5710b` | Görsel döngü durdurma — `drawVisualizer()` artık sadece oyun ekranı aktifken çalışıyor | TUR710-PERF-ARAYUZ-15-08 🟡 |
| G248 | `a255e9e` | balans→denge, AYNI→aynı, mekan→mekân (13 yer) | METIN-TARAMA-15-08 |

**En kritik 3 madde bugünün en büyük kazanımı:** G236 (arama sırasında
tur donuyordu), G242+G243 (öğretim modlarının hâlâ hiç dinlenmemiş/
doğrulanmamış ses değişiklikleri), G244 (işitme güvenliği sınırı).

---

## 2) YAPILAN TARAMA TURLARI

| Tur | Dosya | Kapsam | 🔴/🟡 sayısı | Durum |
|---|---|---|---|---|
| Tur 1 (ret riski) | `RET-RISKI-15-08.md` | Apple inceleme/ret riskleri, G220/G221/G223/G225 üzerinden yeniden ölçüldü | 5🔴 5🟡 | G228 hariç kod değişmedi (sadece ölçüm) |
| Tur 2 (yarım kalanlar) | `TUR2-YARIM-15-08.md` | 10 bölüm (A-J), yarım bırakılmış işler/uyuşmazlıklar | 2🔴 4🟡 | G229/G230 ile 2 madde kapandı |
| Tur 3A (veri/depolama) | `TUR3A-VERI-15-08.md` | 7 bölüm, dosya biçimi/localStorage dayanıklılığı | 9🔴 4🟡 | G231/G232/G233 ile 3 madde kapandı |
| Tur 3B (zamanlama) | `TUR3B-ZAMAN-15-08.md` | 11 bölüm, kesinti/arka-plan/reklam zamanlaması | 12🔴 9🟡 | G234/G235/G236 ile 3 madde kapandı (G236 EN KRİTİK) |
| Tur 4 (ürün) | `TUR4-URUN-15-08.md` | Ürün/öğretim/pedagoji denetimi | 3🔴 13🟡 | G237/G238 ile 2 madde kapandı |
| Tur 5A (sağlamlık) | `TUR5A-SAGLAMLIK-15-08.md` | G214-G238'in (18 commit) birlikte etkileşimi, çökme riski | 7🟡 | Ciddi çakışma bulunmadı, G240 ile 1 madde kapandı |
| Tur 6 (yan etkiler) | `TUR6-YANETKI-15-08.md` | Bugünün www/-dokunan tüm commit'lerinin yan etkileri + sınav sistemi | 4🔴 8🟡 | SADECE ölçüm, kod yok |
| Tur 8 (öğretim) | `TUR8-OGRETIM-15-08.md` | 13 bölüm (A-M), öğretim doğruluğu (prodüktör hedef kitle) | 8🔴 8🟡 | G241/G242/G243 ile 3 madde kapandı |
| Tur 9 (Araçlar) | `TUR9-ARACLAR-15-08.md` | Araçlar sekmesi — ölçüm tanımı + akış sağlamlığı | 2🔴 9🟡 | G244/G245 ile 2 madde kapandı |
| Tur 7+10 (performans/arayüz) | `TUR710-PERF-ARAYUZ-15-08.md` | 14 bölüm (A-N), bellek/performans + yerelleştirme/arayüz | 3🔴 3🟡 | G246/G247 ile 2 madde kapandı |
| Fletcher-Munson/Boost-Cut ölçümü | `OLCUM-OGRETIM-15-08.md` | G242/G243'ün ÜZERİNE, "ek düzeltme gerekir mi" sorusu | 1🔴 | SADECE ölçüm, kod yok — sonuç: BELİRSİZ/1.1'e bırakılabilir |
| Metin taraması 1 | `METIN-TARAMA-15-08.md` | 7 kategori (a-g), guide-texts/paywall/FAQ/tonal-denge DERİN, 11 mod YÜZEYSEL | 3 bulgu | G248 ile TAMAMI kapandı |
| Metin taraması 2 | `METIN-TARAMA-2-15-08.md` | Metin taraması 1'in açık bıraktığı 11 mod dosyası TAM okundu (a-j, 10 kategori) | 6 bulgu | SADECE ölçüm, kod yok — bkz. bölüm 3 |

**Not:** Tur numaralandırması ARDIŞIK değil (Tur 7 yok, 7 ile 10 TEK
raporda birleşti — dosya adının kendisi bunu gösteriyor). Bu, bir eksiklik
değil, turların YAZILDIĞI sıradaki organik birleşme — hiçbir kapsam
maddesi bu yüzden atlanmadı (her raporun kendi "kapsam notu" bölümü neyin
okunduğunu/okunmadığını ayrı ayrı işaretliyor).

---

## 3) YARIN İLK İŞ — METİN DÜZELTMELERİ

`METIN-TARAMA-2-15-08.md`'nin 6 bulgusu, KOD YAZILMADI, hiçbiri commit
değil — yarın Logic önce hangilerinin uygulanacağına karar verecek:

1. **🟡 ÖĞRETİM HATASI** — `kesim-noktasi.js:519`: `"Ters yöne gittin"`
   başlığı YANLIŞ FİLTRE TİPİ (HPF/LPF karıştırma) hatasında kullanılıyor
   — bu GERÇEK bir yön hatası değil, başlık kullanıcıyı yanlış yöne
   yönlendirebilir (`boost-mu-cut-mu.js`/`db-seviyesi.js`'de AYNI başlık
   GERÇEK yön hatasında doğru kullanılıyor, karşılaştırma bunu netleştirdi).
   **Öneri:** başlığı tipi doğrudan adlandıran bir ifadeye çevir.
2. **🟡 SİSTEMİK (3 dosya)** — Nokta sonrası küçük harfle başlayan cümle:
   `q-genisligi.js:411`+`66-70`, `boost-mu-cut-mu.js:477/483/494`+`453-456`,
   `db-seviyesi.js:433`+`413-416`. Üçü de bir "teaching phrase" nesnesini
   (`mixText`/`DIRECTION_EFFECT`) bir ÖNCEKİ cümlenin noktasından hemen
   sonra küçük harfle ekliyor.
3. **🟡 SİSTEMİK (3 dosya, Motor 2)** — ALL-CAPS kod-yorumu vurgusu
   kullanıcı metnine sızmış: `kompresor.js:335/461`, `reverb.js:325/475/476`,
   `distortion.js:330/429` (7 örnek). G248'de düzeltilen "AYNI" bulgusuyla
   AYNI kategori ama İZOLE değil — Kompresör (şablon) → Reverb/Distortion'a
   (kopyalar) mekanik olarak yayılmış görünüyor.
4. **🟡 (kesin ihlal değil, üslup kararı)** — boost/cut kavramı
   `frekans-bulma.js`'te Türkçe fiil ("yükseltildi"/"kesildi"),
   `boost-mu-cut-mu.js`/`q-genisligi.js`'te İngilizce isim ("Boost"/"Cut").
5. **🟢 küçük** — `frekans-cakismasi.js:539-546` getHintText'in 3 dalından
   2'sinde "İpucu:" öneki var, 1'inde yok.
6. **🟡** — dB gösteriminde ondalık hassasiyeti/boşluk 4 farklı kalıpta
   (`db-seviyesi.js` 2-ondalık-boşluklu, `kompresor.js` 1-ondalık-
   boşluksuz, `frekans-cakismasi.js` 1-ondalık-boşluklu, vb.) — ortak bir
   `formatDb`-benzeri fonksiyona taşınması düşünülebilir.

**Bulgu #2 ve #3 sistemik oldukları için TEK bir kural olarak
düzeltilmeleri önerilir (dosya dosya değil).** Düzeltme UYGULANMADAN
önce, geçen seansta olduğu gibi AYRI bir commit olarak planlanmalı, kod
tarafına dokunmadan önce Logic'in onayı gerekir (özellikle #4 ve #6 ürün-
üslup kararı, "hata" değil).

---

## 4) YARIN CİHAZDA DOĞRULANACAKLAR

**Bugünkü 35 commit'in HİÇBİRİ gerçek cihazda test edilmedi** — hepsi
kod/Node/Playwright (masaüstü Chromium) seviyesinde doğrulandı. Aşağıda
her commit için tek cümlelik "şuna bak" talimatı var, EN ÖNEMLİ 6 tanesi
ayrıca genişletildi.

### Öncelikli 6 — genişletilmiş talimat

1. **G236 (native ses kesintisi köprüsü, EN KRİTİK):** Oyun sırasında
   gerçek bir telefon araması gel, ya da Siri'yi tetikle, ya da bir alarm
   çalsın — tur GERÇEKTEN duruyor mu (pause), kesinti bitince GERİ
   dönünce oyun DÜZGÜN devam ediyor mu (donuk/çökük ekran YOK)? Bu kod
   şimdiye kadar HİÇ gerçek bir kesinti olayıyla test edilmedi.
2. **G242 (A/B loudness eşitleme):** Boost mu Cut mu/Frekans Bulma/Kesim
   Noktası/Q Genişliği'nde A/B arası geçiş yaparken artık GERÇEKTEN "aynı
   seviyede" mi duyuluyor, yoksa hâlâ hangi tarafın boost/cut olduğu
   SEVİYEDEN mi anlaşılıyor (kısayol kapandı mı)?
3. **G243 (reverb convolver normalize=false):** Room/Hall/Plate arasında
   artık GERÇEK bir enerji farkı var (önceden bastırılıyordu) — bu fark
   RAHATSIZ EDİCİ derecede yüksek/ani bir ses sıçraması gibi mi geliyor,
   yoksa doğal/beklenen bir fark mı?
4. **G244 (EQ zinciri kazanç sınırı, işitme güvenliği):** Araçlar →
   "referans eğrisiyle dinle" özelliğinde artık ±12dB üstü bir kazanç
   ASLA uygulanmıyor — bu sınırlama sesi FARK EDİLİR şekilde
   bozuyor/yumuşatıyor mu (limiter'ın kendisi duyulabilir bir şey
   yapıyor mu)?
5. **G247 (görsel döngü durdurma, pil/performans):** Oyun ekranından
   çıkıp Araçlar/Ayarlar/İlerleme'de biraz vakit geçir, sonra tekrar oyun
   ekranına dön — pil tüketimi/ısınma ÖNCEKİ sürüme göre GÖZLE GÖRÜLÜR
   şekilde daha iyi mi? (Bu, ölçülmesi zor bir madde — kesin bir "önce/
   sonra" karşılaştırması olmadan sadece GENEL bir izlenim toplanabilir.)
6. **G237 (5 soru sınırı kalıcı):** Ücretsiz hesapla 5 soruyu bitirip
   uygulamayı TAMAMEN kapat/aç (mod değiştirme değil, gerçek kapat/aç) —
   6. soru YİNE başlatılamıyor mu, paywall doğrudan açılıyor mu? Ayrıca
   reklamla kazanılan +5 hakkın da artık KALICI olduğunu (mod kapat/açta
   kaybolmadığını) doğrula.

### Diğer 29 commit — tek cümlelik kontrol

| G# | Kontrol edilecek |
|---|---|
| G214 | Bir soruda "Atla"ya bas — parkur/sınav/telafi sayacı GERÇEKTEN ilerliyor mu |
| G215 | Ayarlar → Hesap'ta Pro kullanıcı doğru metni görüyor mu ("seans sınırsız") |
| G216 | Yeni seviye başlıkları ekranda doğru görünüyor mu (yazım/kesme/taşma yok) |
| G219 | (e2e altyapısı, cihaz testi gerekmez) |
| G220 | İlk kez açılan bir hesapta paywall gerçek ekranıyla mı geliyor |
| G221 | Seans Sonu ekranında (lost varyantı) sabit actionbar son kartı örtmüyor mu |
| G222 | (sadece ölçüm, cihaz testi gerekmez) |
| G223 | Tonal Balance'ta Pop/EDM/Akustik hedef eğrileri KULAKLA makul hissettiriyor mu |
| G224 | (ölü kod doğrulaması, cihaz testi gerekmez) |
| G225 | "Atla" ile limite ulaşıp reklam izle — +5 hakkı GERÇEKTEN kullanılabiliyor mu |
| G226 | (metin eklemesi, görsel kontrol yeterli) |
| G227 | (sadece ölçüm, cihaz testi gerekmez) |
| G228 | Ayarlar'dan paywall aç — Restore Purchase butonu HER varyantta görünüyor mu |
| G229 | (hata yakalama, cihaz testi zor tetiklenir — düşük öncelik) |
| G230 | dB değerlerinde "-0.0 dB" gibi garip bir gösterim KALMADIĞINI doğrula |
| G231 | 100MB+ büyük bir ses dosyası yükle — decode'dan önce reddediliyor mu, uygulama donmuyor mu |
| G232 | Araçlar kütüphanesine dosya ekle/aksiyon kaydet — kalıcılık BOZULMADI mı |
| G233 | (şema sürümü, görünür bir davranış yok) |
| G234 | Reklam yüklemesini yavaş/başarısız bir bağlantıda dene — "İzle" butonu 30sn'de çözülüyor mu |
| G235 | A/B'ye uzun basıp turu duraklat — zamanlayıcı TEMİZ duruyor mu (arka planda çalışmaya devam etmiyor) |
| G238 | Birkaç tur oyna — XP kazanımı/seviye ilerlemesi YENİ eşiklerle makul hissettiriyor mu |
| G239 | (bayrak birleştirme, cihaz testi gerekmez — DEV_MODE production'da false olmalı, bkz. bölüm 6) |
| G240 | (korumalı döngü, tetiklenmesi zor — düşük öncelik) |
| G241 | (sadece yorum, cihaz testi gerekmez) |
| G245 | Ölçüm Sonuçları kartındaki yeni "i" metnini oku — anlaşılır mı |
| G246 | Bir dosya yükleyip iCloud yedeğinden GERÇEKTEN hariç tutulduğunu doğrula (gerçek bir iOS build + iCloud yedek testi gerekir, bu BAŞLI BAŞINA ayrı bir doğrulama turu) |
| G248 | Reverb/dB Seviyesi/Stereo Genişlik metinlerinde "mekân" yazımının tutarlı göründüğünü doğrula |

---

## 5) KAYNAK KÜTÜPHANESİ YENİLEME

Logic yarın 9 kaynak dosyayı (`www/audio/`) yenileyecek. Bilinmesi
gerekenler (bu bölüm doğrudan kullanıcının kendi bilgisi, ayrıca
`.gitignore` iddiası bu turda `git check-ignore` ile TEKRAR doğrulandı):

- **Aynı isimler korunursa kod değişikliği GEREKMİYOR** — `source-catalog.js`
  dosya adına göre eşleşiyor, içerik değişse de isim aynı kaldığı sürece
  hiçbir mod dosyasına dokunmak gerekmez.
- **Mono olmalı, 44.1 kHz** — mevcut 9 fixture dosyası da bu formatta
  (DURUM.md'de `ffprobe` ile doğrulanmış bir kayıt var).
- **Tepe seviyesi mevcutlarla hizalı (-3 ile -1 dBFS)** — Kompresör ve
  Distortion mutlak seviyeye duyarlı (kompresyon eşiği/distortion drive'ı
  sabit dB değerleri üzerinden hesaplanıyor, kaynağın kendi tepe seviyesi
  değişirse bu hesaplar KAYAR).
- **Benzer karakterde olmalı (kick kick gibi)** — Frekans Çakışması'nın
  `SOURCE_PAIRS` bölgeleri (`source-catalog.js`) mevcut dosyalara göre
  ayarlı; kick yerine tamamen farklı bir spektral karaktere sahip bir
  dosya konursa çakışma bölgesi hesapları anlamsızlaşabilir.
- **⚠️ `.gitignore` TUZAĞI (bu oturumda TEKRAR doğrulandı):**
  `.gitignore`'daki `!www/audio/*.m4a` deseni SADECE `www/audio/`'nun
  DOĞRUDAN İÇİNDEKİ dosyaları hariç tutuyor — bir ALT KLASÖRE
  (`www/audio/yeni/kick.m4a` gibi) konan dosyalar bu desenle EŞLEŞMEZ,
  başka bir ignore kuralına düşüp SESSİZCE commit dışı kalır. Dosyalar
  MUTLAKA `www/audio/` klasörünün doğrudan içine konmalı.

---

## 6) YAYIN ENGELLEYENLER

- **Stereo Genişlik kaynak dosyası** — Logic'te hazırlanıyor, henüz repoya
  eklenmedi (bu mod `only:["upload"]` ile SADECE kullanıcının kendi
  dosyasıyla çalışıyor — gömülü bir örnek dosyası GEREKMİYOR, ama Logic'in
  kendi test/tanıtım materyali için bir dosya hazırlaması bekleniyor,
  detay kullanıcının kendi bilgisi).
- **Pazartesi evrak zinciri** — App Store Connect/Paid Apps Agreement
  süreci (MAGAZA-DENETIM.md'nin daha önce işaretlediği "EN BÜYÜK RİSK"
  maddesiyle aynı aile — bu repodan doğrudan görülemiyor, süreç takibi
  gerekiyor).
- **`AD_TEST_MODE=false` + build numarası** — G239'da tüm test/dev
  bayrakları `DEV_MODE`'a (core/build-flags.js) bağlandı; production
  build'e geçmeden önce bu bayrağın GERÇEKTEN false olduğu ve build
  numarasının artırıldığı doğrulanmalı (bu repodan `DEV_MODE`'un
  DEĞERİNİN kendisi grep ile kontrol edilebilir, ama "hangi build'in
  App Store'a gittiği" ayrı bir süreç kontrolü gerektirir).

---

## 7) AÇIK KARARLAR

- **Fletcher-Munson asimetrisi (1.1'e bırakıldı)** — `OLCUM-OGRETIM-15-08.md`
  sonucu: kesin bir "doğru" katsayı yok (literatür net değil), G242 zaten
  EN CİDDİ boyutu (loudness kısayolu) kapattı, kalan spektral-görünürlük
  farkı DAHA İNCE — küçük bir iş ama kod yazmadan önce Logic'in "hangi
  yönde, ne kadar" kararı gerekiyor. Cihazda kulakla doğrulanması gereken
  bir öncül madde de var (bkz. bölüm 4'ün "genişletilmiş" olmayan kısmı —
  aslında bu belirsizlik kod yazımından önce gelir, playtest gerektirir).
- **Boost/Cut asimetrisi (1.1'e bırakıldı)** — AYNI dosyanın 2. ölçümü:
  G242 SONRASI (loudness eşit) bir boost ile bir cut'ın GERÇEKTEN farklı
  zorlukta algılanıp algılanmadığı hiç test edilmedi — fark yoksa bu
  maddenin varsayımı çürüyor, ek iş gerekmez.
- **`showSessionEnd()` ölü kod** — G220/G224/TUR5A'da üç dalı da TAMAMEN
  ÖLÜ olarak DOĞRULANDI (tekrar tekrar, farklı turlarda) — bu artık açık
  bir "karar" değil, TEYİT edilmiş bir durum. Zararsız (test kancasıyla
  telafi edilmiş), silinmesi isteğe bağlı bir temizlik, acil değil.
- **Bluetooth hoparlör filtresi** — TUR9'un önerisi (Araçlar'ın referans
  filtre listesine eklenmesi) daha önce açık bir karar maddesiydi;
  kullanıcı bu turda **bu sürümde planlandığını** belirtti — DURUM.md'nin
  ilgili SIRADAKİ notları buna göre güncellenmeli (bu belge sadece
  kaydediyor, kod tarafı henüz YAZILMADI).
- **Hata analizi kayıt formatı** — G227'de TAM tarifi çıkarıldı: şu an 3
  ayrı/kısmi veri deposu var (`session.log` bellek-içi, `history` 12
  kayıtla sınırlı, `zoneStats` sadece 4/12 modda), zayıflık haritası için
  gereken alanların (mod ID, ham cevap, zorluk, süre) ÇOĞU zaten her
  submit fonksiyonunun yerel kapsamında hazır — yeni bir hesaplama değil,
  sadece bir YAZMA eksik. Karar bekleyen: yeni birleşik şemanın 1.0'da mı
  açılacağı (sonradan eklenirse geçmiş veri OLMAZ, bu G227'nin kendi
  vurguladığı risk) yoksa 1.1'e mi bırakılacağı.
- **DURUM.md'deki diğer maddeler** — `BEKLEYEN KARARLAR` bölümünde (W, R,
  P, Q, N, O, D, F, H, I, K, J, V, A harfleriyle işaretli, ~14 madde) bu
  oturumdan ETKİLENMEYEN, önceki turlardan kalan kararlar da duruyor —
  bu belge onları TEKRARLAMIYOR, `DURUM.md`'nin kendi bölümü tek
  doğruluk kaynağı olmaya devam ediyor.

---

## 8) ÇALIŞMA KURALLARI (yarının oturumu için hatırlatma)

- **VARSAYIM YASAK:** ölç → sorgula → sor. Sayı uydurma — ölçüm yoksa
  "doğrulanmadı" yaz.
- **Bir maddeyi kapalı saymak için commit numarası + kanıt şart** —
  "muhtemelen kapandı" yeterli değil.
- **Prompt/format yazmadan önce KAPSAM ve DOKUNULMAYACAKLAR gösterilir,
  onay alınmadan yazılmaz** — özellikle çok-bölümlü denetim turlarında
  (bugünkü Tur 1-10 deseni gibi) kapsamın kendisi kullanıcıya ÖNCE
  sorulmalı.
- **Format/yöntem değişikliği yapılacaksa önce sorulur** — hangi
  dosyaların okunacağı, "kapalı" sayma ölçütü gibi kararlar sessizce
  değiştirilmez.
- **İç tutarlılık:** bir öneri kendi gerekçesiyle çelişmemeli (ör. bugünkü
  Fletcher-Munson maddesinde olduğu gibi, "kesin katsayı yok" derken aynı
  anda "şu sayıyı kullan" DENMEMELİ — belirsizlik açıkça belirsizlik
  olarak bırakılmalı).
- Her değişiklikten sonra `npm test` çalıştırılır ve sonuç raporlanır;
  DOM/ses değişikliklerinde ayrıca canlı tarayıcıda (Playwright/Chrome)
  doğrulama yapılır — kaynak koddan doğrulanamaz.
- Her seans sonunda `DURUM.md` güncellenir (BİTTİ/AÇIK İŞLER/BEKLEYEN
  KARARLAR/SIRADAKİ) — bu dosya yeni sohbetlerin tek doğruluk kaynağı.

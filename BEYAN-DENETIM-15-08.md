# BEYAN-DENETIM-15-08 — Belge/Beyan Denetimi

_15-16 Ağustos 2026 · commit `74333be`'e kadar (G239/G240 dahil)._

**Kapsam notu:** Bu bölüm SADECE ÖLÇÜM — kod yazılmadı (G239/G240
AYRI commit'lerde, bu rapor onları KAYNAK olarak kullanıyor ama
KENDİSİ ölçüm turudur). Site metinleri (Bölüm E/F) repo DIŞINDA —
kodun GERÇEKTE ne yaptığı çıkarıldı, Logic'in siteyle karşılaştırması
gerekiyor, "sitede şöyle yazıyor" diye bir iddia YOK.

---

## A) MAX_CONTEXT_RECREATE SINIRI

**Kod:** `audio-engine.js:103`, `MAX_CONTEXT_RECREATE = 20` (task'ın
"2" öncülü ESKİ — G133'te 2'den 20'ye çıkarılmış, TUR3B'de de bu
teyit edilmişti).

- **Sınıra ulaşınca:** `recreateContext()` `false` döner
  (satır 283-286 civarı — G239'da `audioDiagLog`'a çevrildi, davranış
  AYNI), `ensureAudioAliveInner()` bunu `alive=false` olarak taşır,
  `setAudioDead(true)` çağrılır.
- **Kullanıcı mesaj alıyor mu:** EVET — `setAudioDead(true)` app.js'in
  `onDeadStateChange` hook'unu tetikler, bu da **"Devam etmek için
  ekrana dokunun" banner'ını** gösterir (G131'den beri var, GENEL ses-
  ölü kurtarma mesajı). **Sessizce susmuyor.**
- **Ama mesaj YANILTICI olabilir:** Banner'ın metni GENEL — "20 kez
  kesinti yaşadın, context'i artık YENİDEN OLUŞTURAMIYORUM" gibi
  ÖZEL bir içerik YOK. Kullanıcı "dokun" der, dokunur, `ensureAudioAlive()`
  YENİDEN dener — ama `recreateContext()` `contextRecreateCount>=20`
  olduğu sürece HER SEFERİNDE `false` dönmeye devam eder (sayaç
  DÜŞMÜYOR/sıfırlanmıyor, `let contextRecreateCount = 0;` sadece
  UYGULAMA AÇILIŞINDA sıfırlanan bir modül-değişkeni). **Kullanıcı
  banner'a defalarca dokunur, HER SEFERİNDE aynı "ölü" durumla
  karşılaşır — döngüsel bir ÇIKMAZ, ama HER denemede AÇIKÇA
  bilgilendiriliyor, "çökme" değil.**
- **Uygulamayı kapatmaktan başka çare var mı:** Koddan bakıldığında
  EVET — uygulamayı kapatıp açmak `contextRecreateCount`'u sıfırlar
  (modül-seviyesi değişken, yeniden `createAudioEngine()` çağrılır).
  **Bu KOD SEVİYESİNDE doğrulandı** (sayaç `let` ile fonksiyon
  kapsamında, kalıcı DEĞİL, persist EDİLMİYOR).
- **20 kesinti bir oturumda GERÇEKÇİ mi:** G133'ün kendi yorumu "20
  kesinti bir kullanıcı oturumunda gerçekçi değil" diyor — bu bir
  ÖLÇÜM DEĞİL, geliştiricinin TAHMİNİ (kod yorumunda AÇIKÇA böyle
  yazılmış, "muhtemelen" diye işaretlenmiş bir varsayım) — GERÇEK
  bir kullanıcının 20 kez arka-plan/kesinti/route-değişimi yaşayıp
  yaşamayacağı **BELİRSİZ**, cihazda uzun bir oturumla test
  edilmeli.

**Sonuç:** 🟡 ORTA — çökmeden BETER değil (kullanıcı HER ZAMAN
bilgilendiriliyor, uygulamayı kapatıp açmak KESİN kurtarır) ama 20.
kesintiden sonra banner'a dokunmanın HİÇBİR İŞE YARAMAMASI (sayaç
sıfırlanmadığı için) kullanıcıya "bozuk" hissi verebilir — banner
metni bu durumda "uygulamayı yeniden başlat" gibi daha SPESİFİK bir
yönlendirme İÇERMİYOR.

---

## B) BİLİNEN AÇIKLAR LİSTESİ GÜNCEL Mİ

`TAM-LISTE-14-08.md` Bölüm 9'un 9 maddesi TEK TEK bugünkü commit'lere
karşı kontrol edildi:

| Madde | Bugün etkilendi mi | Detay |
|---|---|---|
| Günlük görev sömürüsü (saat oynatma) | Hayır, DEĞİŞMEDİ | G237 AYRI bir mekanizma (5-soru kotası) düzeltti, `daily.tasks`'ın kendi saat-manipülasyon açığına DOKUNMADI — TUR3B'de AYRICA teyit edilmişti. |
| Can dolumu saat manipülasyonu | Hayır, DEĞİŞMEDİ | `applyLivesRefill()` bugün DOKUNULMADI. |
| SSL sertifikası | Hayır, kod DIŞI | İlgisiz. |
| Kendi reklamına tıklama | Hayır, DEĞİŞMEDİ | AD_TEST_MODE davranışı G239'da AYNI kaldı (hâlâ `true`, sadece KAYNAĞI değişti). |
| **`abPressTimer`** | **KISMEN kapandı, tam kapanmadı** | Aşağıda detaylı. |
| "10 sn ileri/geri" elapsed metni | Hayır, DEĞİŞMEDİ | Bugünkü commit'lerin hiçbiri bu alana dokunmadı. |
| Gate paneli flash'ı | Hayır, DEĞİŞMEDİ | İlgisiz alan. |
| Eski Connect kaydı | Kod DIŞI | İlgisiz. |
| SKAdNetwork | Kod DIŞI | İlgisiz. |

### 🟡 `abPressTimer` — KESİN CEVAP: YARISI ÇÖZÜLDÜ, madde GÜNCELLENMELİ
Orijinal not "round'a bağlı değil AMA yanlış cevap göndermiyor" — İKİ
ayrı iddia taşıyor. **Koddan doğrulandı:** `abPressTimer` SADECE ÜÇ
yerde temizleniyor — `pointerup`, `pointerleave`, VE (G235'ten beri)
`pauseRound()`'un İÇİNDE. **`teardownActiveRound()`'da TEMİZLENMİYOR**
(bu fonksiyon `blockIfSessionLimitReached()`/`finalizeIfGameOver()`'ın
kullandığı, "round GERÇEKTEN bitti" teardown'ı — `freqTapTimer`'ı
temizliyor ama `abPressTimer`'ı HİÇ ANMIYOR, grep ile doğrulandı).
**Sonuç:** G235 SADECE "arka plana alınma/panel açılışı/Durdur" gibi
`pauseRound()` ÜZERİNDEN geçen senaryoları kapattı — kullanıcı A/B
butonuna basılı tutarken tam o anda **soru hakkı/can bitip round
`teardownActiveRound()` ile SONLANDIRILIRSA** (round'un DOĞAL
sonlanması, duraklaması DEĞİL) `abPressTimer` HÂLÂ temizlenmiyor, HÂLÂ
"round'a bağlı değil". **TAM-LISTE'nin bu maddesi "KAPANDI" diye
İŞARETLENMEMELİ — kapsamı DARALTILDI olarak güncellenmeli** ("Durdur/
arka plana alma/panel açılışında artık temizleniyor (G235); round'un
KENDİSİ session-limit/can-bitişiyle DOĞAL sonlanırsa hâlâ temizlenmiyor").

---

## C) ÖLÜ KOD ENVANTERİ

- **`showSessionEnd()`:** **152 satır** (ölçüldü, `awk` ile — task'ın
  "~220" tahmini YANLIŞ, gerçek sayı 152). Fonksiyonun KENDİSİ ölü
  DEĞİL — hâlâ `finishChallenge()`'dan ("normal" kind, 10 Soruluk
  Bölüm bitişi) çağrılıyor, sadece "lost"/"freeLimit" kind'leri (2/3
  çağrı yolu) G220'den beri ulaşılamaz durumda (bkz. TUR5A).
- **Bugün açılan YENİ ölü dallar:** TUR5A'da (bu turda TEKRAR
  taranmadı) "yeni bir örnek BULUNAMADI" sonucuna varılmıştı — bu
  turda EK bir tarama yapılmadı, TEYİT edilmiş sonuç KORUNDU.
- **G239'un KENDİSİ yeni bir ölü kod alanı AÇTI MI:** Hayır — `DEV_MODE`
  false ise wrapper fonksiyonlar `return` ediyor ama fonksiyonların
  KENDİLERİ hâlâ ÇAĞRILIYOR (sadece içleri no-op oluyor) — "ölü kod"
  değil, "koşullu hiçbir şey yapmayan kod", farklı bir kategori.
- **Toplam "ölü" (gerçekten ULAŞILAMAZ) satır sayısı:** Kesin bir
  statik erişilebilirlik analizi (her dalın GERÇEKTEN tetiklenip
  tetiklenemeyeceği) YAPILMADI — bilinen TEK somut örnek
  `showSessionEnd("lost"/"freeLimit")`'in çağrıldığı ~6 satırlık
  `if (!openPaywallReason(...)) showSessionEnd(...)` blokları (3 çağrı
  sitesi × ~2 satır) — **fonksiyonun GÖVDESİ ölü DEĞİL** (normal
  kind'de çalışıyor), sadece BU 3 ÇAĞRI NOKTASI ulaşılamaz. **Toplam
  ölü kod ~6-10 satır** (152 satırlık fonksiyonun KENDİSİ DEĞİL) —
  task'ın "showSessionEnd() ~220 satır" çerçevelemesi YANLIŞ ÖNCÜL,
  fonksiyonun TAMAMI ölü değil, SADECE 3 çağrı noktası.

---

## D) APP STORE BEYAN TUTARLILIĞI ⚠️ ÖNEMLİ

### 🟢 DOĞRULANDI — G233/G237'nin yeni anahtarları cihazda kalıyor, ağa gitmiyor
Toplam localStorage envanteri (grep ile TAM sayıldı): **17 anahtar**
(14'ü `storage.js`'te + 3'ü `app.js`'te doğrudan — G233'ün
`eqEarTrainerProXSchemaVersion`'ı ve G237'nin
`eqEarTrainerProXFreeSession`'ı DAHİL). Uygulamanın KENDİ kodunda
**GERÇEK bir ağ isteği (uzak sunucuya) YOK** — `fetch(`/`XMLHttpRequest`
için TAM 2 kullanım bulundu, İKİSİ de YEREL kaynak okuma
(`window.Capacitor.convertFileSrc()` ile dönüştürülmüş bir dosya
yolu VE bundle içindeki `www/audio/*.m4a` — `source-catalog.js`'in
KENDİ yorumu bunu "fetch() WKWebView yerel bundle dosyasını
çekemiyor" diye zaten açıklıyor) — **hiçbiri internet'e gitmiyor.**
G233/G237'nin yeni anahtarları bu MEVCUT (ağa hiç gitmeyen) altyapının
İÇİNDE — App Privacy beyanını DEĞİŞTİRMEZ, **DOĞRULANDI.**

### 🟢 Ağ çağrısı sayısı — AdMob SDK HARİÇ hâlâ SIFIR
Yukarıdaki 2 `fetch`/`XHR` GERÇEK ağ trafiği DEĞİL. AdMob
(`@capacitor-community/admob`) ve StoreKit (`@capgo/native-purchases`)
KENDİ native SDK'ları üzerinden ayrı ayrı ağa çıkıyor — bunlar zaten
App Privacy'nin "Third-Party Advertising" beyanının KAPSADIĞI şey,
uygulamanın KENDİ kodu bunları TETİKLİYOR ama VERİYİ KENDİSİ
TOPLAMIYOR/GÖNDERMİYOR (SDK'nın kendi işi).

### 🟢 Yeni bir veri tipi toplanmaya BAŞLANMADI
G233 (bir sayı — şema sürümü) ve G237 (`{key, used}` — bir tarih
string'i + bir sayı) — İKİSİ de MEVCUT "Uygulama Kullanım Verileri"
kategorisinin (App Privacy'nin ZATEN beyan ettiği "Product Interaction"
benzeri) İÇİNDE kalan, KİŞİSEL OLMAYAN teknik sayaçlar — YENİ bir veri
KATEGORİSİ (konum, isim, e-posta, vb.) YOK.

---

## E) SİTEDEKİ METİNLER — kodun GERÇEKTE ne yaptığı (Logic karşılaştıracak)

### Gizlilik politikası için: kod hangi verileri saklıyor
**TAM localStorage envanteri (17 anahtar, kişisel veri İÇERMEZ):**
oyun istatistikleri (tur/doğru/yanlış/combo/rozet), günlük görev
durumu, bant-bazlı isabet oranı, tercihler (kalibrasyon seviyesi,
odak aralığı, geri bildirim ayarı), geliştirici bayrakları, YÜKLENEN
dosya SEÇİM referansları (dosyanın KENDİSİ değil, hangi dosyanın
seçili olduğu — dosyanın BAYTLARI `Directory.Data`/IndexedDB'de AYRI
saklanıyor, TUR3A'da doğrulanmıştı), satın alma durumu (bir boolean +
tarih), şema sürüm numarası, günlük ücretsiz soru kotası. **HİÇBİRİ
CİHAZ DIŞINA GÖNDERİLMİYOR** (D bölümünde doğrulandı). Kullanıcının
YÜKLEDİĞİ ses dosyaları `Directory.Data` (iOS: Documents, TUR3A'da
BAĞIMSIZ kaynaktan — Capacitor Filesystem plugin dokümantasyonundan —
doğrulanmıştı) altında saklanıyor, kalıcı, uygulama silinince silinir.
**Süre:** Kalıcı (kullanıcı SİLENE/uygulamayı KALDIRANA kadar) —
otomatik bir "N gün sonra sil" mekanizması YOK.

### Destek sayfası için: "5 soru sınırı" ve "reklam ödülü" GÜNCEL tarif
**G237 SONRASI gerçek davranış:** Ücretsiz kullanıcı GÜNDE (yerel
cihaz saatine göre, gece yarısı sıfırlanan) 5 soru ile başlar. Reklam
izleyip +5 soru kazanabilir, **GÜNDE EN FAZLA 3 KEZ** (toplam günlük
üst sınır: 5+3×5=**20 soru/gün**, TUR4'te hesaplanmıştı). Bu kota
ARTIK **mod kapatılıp açılsa bile SIFIRLANMIYOR** (G237'nin düzelttiği
TAM budur) — ÖNCEDEN (G237'den ÖNCE) modu kapatıp açmak sınırı SIFIRLARDI,
bu YAYINA GİTMEDEN düzeltildi. **Eğer sitede/destek sayfasında "her
oturumda 5 soru" gibi G237-ÖNCESİ bir davranış tarif ediliyorsa
GÜNCELLEME GEREKMİYOR** (çünkü doğru davranış zaten "günde 5+15" idi,
sadece UYGULANMASI bugün düzeldi) — **ama eğer sitede "sınırsız
mod değiştirerek daha fazla soru kazanabilirsin" gibi ESKİ/YANLIŞ
davranışı ÖNEREN bir metin varsa (BELİRSİZ, kod bunu GÖREMEZ) o
metin ARTIK YANLIŞ, kaldırılmalı.**

### Kullanım koşulları için: Pro TAM olarak ne veriyor (G215'in düzelttiği hatanın AYNISI koşullarda olabilir)
Kod açısından Pro'nun verdiği TAM liste (`guide-texts.js:GENERAL_GUIDE`
+ `paywall.js` kilit fonksiyonları çapraz okunarak çıkarıldı):
1. **12 modun TAMAMI** (5 ücretsiz + 7 Pro-kilitli — TAM liste F
   bölümünde).
2. **Oturum sınırı YOK** (5-soru/gün duvarı hiç uygulanmaz,
   `isUserPro()` kontrolüyle).
3. **Can sistemi YOK** (`loseLife()` Pro'da hiç azaltmaz).
4. **Sınav ve seviye sistemi** (`examGateActive()` SADECE Pro'da true
   olabilir).
5. **Kendi şarkını yükleyip çalışma** (`isUploadLocked(isPro)`).
6. **Sabit (manuel) zorluk seçimi** (`isFixedDifficultyLocked(isPro)`
   — Otomatik ücretsizde de VAR, SADECE Sabit MOD SEÇİMİ Pro-kilitli).
7. **Odak aralığı seçimi** (`isFocusRangeLocked`).
8. **Zayıf bölge raporu** (`isWeakZoneReportLocked`).
9. **Araçlar sekmesi** (analiz/referans filtreleri — kod okumasıyla
   TEYİT edilmedi bu turda, önceki turlarda "Pro-only" olarak
   biliniyordu, BELİRSİZ/tam liste bu turda çıkarılmadı).

**"Reklamsız" vaadi:** Pro'da reklam GÖSTERİLMİYOR mu — kod seviyesinde
`handleWatchAd()` `isUserPro()` kontrolüyle Pro'da HİÇ çağrılmıyor
(G234'ün kendi notu: "Pro'da ads.watchRewardedAd() hiçbir koşulda
çağrılmaz") — **DOĞRU, kodla TUTARLI.**

**G215'in düzelttiği hata TEKRARLANMIŞ MI (koşullarda "seans başına N
soru" gibi Pro için yanlış bir sayı):** Bu turda kullanım koşulları
metni GÖRÜLEMEDİ (repo dışı) — **Logic'in kendi kontrolü gerekiyor**,
kod TARAFI (yukarıdaki liste) DOĞRU/güncel.

---

## F) MAĞAZA METNİ ile UYGULAMA TUTARLILIĞI

### 🟡 "12 mod" ifadesi kod ile TUTARLI ama ayrım BELİRSİZ (repo dışı metin görülemedi)
Kod KESİN: 12 OYNANABİLİR mod var (`mode-catalog.js`, `playable:true`),
bunların **5'i ücretsiz** (Frekans Bulma/Kesim Noktası/Q Genişliği/
Boost-Cut/Kompresör), **7'si Pro** (dB Seviyesi/Stereo Genişlik/Pan
Konumu/Reverb/Tonal Denge/Distortion/Frekans Çakışması) — TUR4'te
`mode-catalog.js`'ten BİREBİR sayılmıştı, bu turda TEKRARLANMADI.
Mağaza açıklamasının bu ayrımı NET YAPIP YAPMADIĞI **BU ORTAMDAN
GÖRÜLEMEZ** — Logic'in App Store Connect'teki metni açıp "12 modun
5'i ücretsiz, 7'si Pro" gibi bir cümle İÇERİP İÇERMEDİĞİNİ KONTROL
ETMESİ gerekiyor. **Risk gerçek:** "12 mod" tek başına (ayrım
olmadan) yazılırsa kullanıcı hepsinin ücretsiz sanabilir — task'ın
kendi endişesi kodla ÇELİŞMİYOR, sadece DOĞRULANAMADI.

### 🟢 "Sınırsız" (Pro) — kodla TUTARLI
`paywall.isFreeSessionLimitReached(..., isPro, ...)` Pro'da HER ZAMAN
`false` — oturum sınırı GERÇEKTEN yok. G215 bu metni Ayarlar'da zaten
düzeltmişti.

### 🟢 "Reklamsız" (Pro) — E bölümünde doğrulandı, kodla TUTARLI.

### BELİRSİZ — uygulama içi metinler ile mağaza arasında ÇELİŞKİ var mı
Uygulama İÇİ metin (`guide-texts.js:GENERAL_GUIDE`) "12 modun 5'i
ücretsiz" diye AÇIK ve DOĞRU (TUR4'te doğrulanmıştı) — mağaza
metninin AYNI netlikte olup olmadığı **repo dışı, görülemez.**

---

## G) BUGÜNÜN CİHAZ TEST LİSTESİ (G228→G238, 11 commit)

| Commit | Tek cümlelik talimat |
|---|---|
| **G228** (Restore Purchase) | Ayarlar → Hesap'tan VE bağlamsal (soru/can bitince açılan) paywall'ların İKİSİNDEN de "Geri yükle" butonuna basıp GERÇEKTEN çalıştığını doğrula (bkz. H). |
| **G229** (Satın alma kaydı) | Gerçek bir satın alma yap, uygulamayı TAMAMEN kapatıp aç, Pro'nun HÂLÂ aktif olduğunu doğrula (localStorage kaybı senaryosu cihazda simüle EDİLEMEZ, ama normal akış test edilmeli). |
| **G230** (Negatif sıfır) | dB Seviyesi/Boost-Cut modlarında sıfıra çok yakın bir değer çıkınca ekranda "-0.0 dB" GÖRÜNMEDİĞİNİ gözle doğrula. |
| **G231** (7 dakika süre sınırı) | GERÇEK 8+ dakikalık bir ses dosyası yüklemeyi DENE — "Dosya çok uzun" mesajının GERÇEKTEN çıktığını, uygulamanın ASILI KALMADIĞINI doğrula (bu turda SADECE Playwright'la, sentetik dosyayla test edildi). |
| **G232** (3 kayıt yeri korumalı) | Normal kullanımda "Dosyalarım"a dosya ekleyip "Son İşlemlerim"/"Son Ölçümlerim" listelerinin DOĞRU kaydettiğini gözle doğrula (depolama-dolu senaryosu cihazda ZOR simüle edilir, atlanabilir). |
| **G233** (Şema sürümü) | Görünür bir davranış YOK, cihaz testi GEREKMİYOR. |
| **G234** (Reklam zaman aşımı) | ÇOK YAVAŞ bir ağda (uçak modu aç/kapa ile simüle) reklam izlemeyi dene — 30sn sonunda butonun GERÇEKTEN "Reklam yüklenemedi" ile çözüldüğünü doğrula. |
| **G235** (abPressTimer) | A/B/Döngü butonuna basılı tutup 520ms dolmadan HOME tuşuna bas (arka plana al), birkaç saniye bekleyip GERİ DÖN — döngü/ses KENDİLİĞİNDEN başlamamalı. |
| **G236** (Native kesinti köprüsü) ⚠️ **EN KRİTİK** | Bir tur AÇIKKEN kendine ARA çağrısı yaptır — tur DURUYOR mu (süre donuyor mu), aramayı kapat — tur KALDIĞI YERDEN mi devam ediyor. AYNI senaryo Siri ve bir ALARM ile. **Swift tarafı BU ORTAMDA HİÇ DERLENMEDİ** (Xcode yok) — sadece JS ucu (`window.__aeaNativeInterruption`) test edildi, native → JS bağlantısının GERÇEKTEN çalıştığı SADECE cihazda kanıtlanabilir. |
| **G237** (5 soru kalıcı) | 5 soru cevapla, paywall'ı gör, uygulamayı TAMAMEN kapat, YENİDEN aç, aynı moda gir — 6. soru YİNE açılmamalı, paywall doğrudan çıkmalı. |
| **G238** (Seviye eşikleri) | Görünür bir davranış farkı YOK (sadece Sv sayısı hesaplanışı), cihaz testi GEREKMİYOR — İlerleme sekmesinde "Sv" rakamının BEKLENEN (daha yüksek) sayıyı gösterdiğini gözle doğrulamak yeterli. |

---

## H) SANDBOX SATIN ALMA TEST LİSTESİ

Kod bugün İKİ kez değişti (G228 restore butonu görünürlüğü, G229 kayıt
koruması) — hiçbiri GERÇEK bir StoreKit sandbox işlemiyle test
edilmedi (Playwright'ta `NativePurchases` MOCK'landı, bkz. G229'un
kendi e2e testi). Pazartesi sandbox turunda:

1. **Satın alma çalışıyor mu:** Gerçek bir Sandbox Apple ID ile
   `#buyProBtn`'e bas, StoreKit ödeme sayfası açılmalı, tamamlanınca
   "🎉 Pro açıldı" toast'ı VE ekranın paywall'dan çıkıp round'a
   dönmesi (varsa duraklatılmış round) beklenmeli.
2. **Kayıt başarısız olursa uyarı çıkıyor mu (G229):** Bu senaryo
   SANDBOX'TA DOĞRUDAN tetiklenemez (localStorage hatası GERÇEK bir
   satın almayla eş zamanlı üretilemez) — **atlanabilir**, G229'un
   kendi e2e testi (mock tabanlı) bunu ZATEN kanıtlamıştı.
3. **Restore butonu HER paywall varyantında çalışıyor mu (G228):**
   Sandbox hesabıyla ÖNCE satın al, UYGULAMAYI SİL, YENİDEN yükle,
   **hem** Ayarlar → Hesap'taki **hem** bir soru/can limiti paywall'ı
   AÇILDIĞINDA görünen "Geri yükle" butonuna bas — İKİSİNDE de Pro'nun
   GERİ GELDİĞİNİ doğrula (G228'in TAM iddiası: "HER paywall
   varyantında görünür").
4. **Pro'ya geçince kilitli kalan bir şey var mı:** Pro olduktan
   sonra TÜM 12 modu gez, can göstergesi (Pro'da GİZLENMELİ), oturum
   sayacı (`#gameQCounter`, Pro'da GİZLENMELİ), reklam butonları
   (HİÇBİR paywall'da Pro kullanıcıya GÖSTERİLMEMELİ) — G194'ün
   ("Pro'da ücretsiz metin sızıntıları") daha önce kapattığı liste,
   BU turda YENİDEN taranmadı, sandbox turunda GÖZLE bir kez daha
   kontrol edilmesi ÖNERİLİR (ucuz bir ek adım).

---

## I) .gitignore TUZAĞI

**KESİN, `git check-ignore -v` ile DOĞRUDAN test edildi (tahmin
değil):**

```
www/audio/test.wav        → YOK SAYILIYOR (*.wav kuralı, İSTİSNA YOK)
www/audio/test.m4a        → TAKİP EDİLİYOR (istisna kuralı çalışıyor)
www/audio/alt-klasor/x.m4a → YOK SAYILIYOR (istisna SADECE www/audio/'nun
                              DOĞRUDAN İÇİNE bakıyor, alt klasörlere DEĞİL)
```

**Yeni dosyalar NEREYE konmalı:** `.m4a` uzantısıyla, DOĞRUDAN
`www/audio/` klasörünün İÇİNE (alt klasör OLMADAN) — `.gitignore`'daki
`!www/audio/*.m4a` kuralı TEK SEVİYELİ bir glob, `**` DEĞİL.

**Yanlış yere konursa sessizce yok sayılır mı:** **EVET, KESİN —
sessizce.** İki somut tuzak:
1. Logic'in yeni kütüphanesi `.wav`/`.aiff` gibi BAŞKA bir formatta
   gelirse (yüksek kaliteli master dosyaları genelde WAV/AIFF olur)
   → `www/audio/`'ya konsalar bile **HİÇBİRİ commit'e GİRMEZ**,
   `git status` bile GÖSTERMEZ (ignore edilen dosyalar `git status`'ta
   görünmez, `git status --ignored` GEREKİR).
2. Dosyalar bir ALT KLASÖRE (ör. `www/audio/v2/`) konursa **AYNI
   ŞEKİLDE sessizce yok sayılır.**

**Bunu önleyecek bir uyarı/kontrol var mı:** **HAYIR** — `.git/hooks/`
içinde AKTİF bir hook YOK (sadece `.sample` uzantılı örnekler),
`package.json`'da bir "dosya sayısı doğrula" script'i YOK. **Tek
mevcut savunma** `source-catalog.test.mjs`'in G54 regresyon çitinin
kaynak ID'lerini KONTROL ETMESİ — ama bu SADECE `source-catalog.js`'e
girilen ID'lerin varlığını doğruluyor, dosyanın GERÇEKTEN commit'e
GİRİP GİRMEDİĞİNİ KONTROL ETMİYOR (`npm test` dosyanın diskte VAR
olup olmadığına bakmıyor, sadece KOD KATALOĞUNA bakıyor) — **bir
dosya ignore edilse bile TÜM testler YEŞİL kalabilir**, sadece
GERÇEK cihazda/derlemede dosya EKSİK olduğu için ses ÇALINAMAZ hale
gelir (audio-engine.js'in KENDİ "dosya yüklenemezse sessizce pink
noise'a düş" güvenlik ağı bunu MASKELEYEBİLİR — kullanıcı YANLIŞ ses
duyar ama uygulama ÇÖKMEZ, bu da tespiti GEÇİKTİRİR).

**Sonuç:** 🔴 CİDDİ (sessiz veri kaybı sınıfı, G229/G232'nin
düzelttiği "sessiz hata" ailesiyle AYNI kalıp — ama BU sefer git
seviyesinde, kod DEĞİL).

---

# ÖNCELİK LİSTELERİ

## Yayın öncesi yapılacaklar
1. **🔴 Kaynak kütüphanesi yenilemeden ÖNCE Logic'e/işi yapan kişiye
   AÇIKÇA söylenmeli:** dosyalar `.m4a` uzantısıyla, `www/audio/`
   klasörünün DOĞRUDAN İÇİNE konmalı — WAV/AIFF ya da alt klasör
   kullanılırsa SESSİZCE kaybolur. `git status --ignored` ile
   YÜKLEME SONRASI bir kontrol ADIM olarak eklenmeli.
2. **🟡 TAM-LISTE-14-08.md'nin `abPressTimer` maddesi güncellensin** —
   "KAPANDI" değil, "Durdur/arka plana alma/panel açılışında (G235)
   temizleniyor; round session-limit/can-bitişiyle doğal sonlanırsa
   HÂLÂ temizlenmiyor" diye DARALTILMIŞ kapsamla yeniden yazılmalı.

## Logic'in siteden/Connect'ten kontrol etmesi gerekenler
- Mağaza açıklamasının "12 mod" ifadesinin 5-ücretsiz/7-Pro ayrımını
  NET yapıp yapmadığı (F).
- Destek sayfasının "5 soru sınırı"/"reklam ödülü" tarifinin G237
  SONRASI gerçek davranışla (günde 5+15=20, mod kapat/aç sıfırlamıyor)
  tutarlı olup olmadığı (E).
- Kullanım koşullarının Pro listesinin (E bölümündeki 8-9 maddelik
  kod-doğrulanmış liste) EKSİK/FAZLA bir şey İÇERİP İÇERMEDİĞİ,
  özellikle G215'in düzelttiği "seans başına N soru" hatasının
  koşullarda TEKRARLANMADIĞININ doğrulanması.

## Cihazda doğrulanacaklar
- Bölüm G'nin TAM listesi (11 madde, tek cümlelik talimatlarla) —
  **G236 EN KRİTİK**, Swift tarafı bu ortamda HİÇ derlenmedi.
- Bölüm H'nin sandbox satın alma listesi (4 madde).
- MAX_CONTEXT_RECREATE=20 sınırının GERÇEKÇİ bir uzun oturumda hiç
  tetiklenip tetiklenmediği (A).

**Bu turda hiçbir kod DEĞİŞTİRİLMEDİ (denetim bölümü) — G239/G240
AYRI, ÖNCEDEN commit edilmiş düzeltmelerdi.**

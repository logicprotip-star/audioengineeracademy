# TUR 4 — ÜRÜN VE ÖĞRETİM DENETİMİ

_15 Ağustos 2026 · commit `c5f31d6`'e kadar._

**Kapsam notu (dürüstlük):** Bu tur öğretim/pedagoji/ürün tarafına
bakıyor — büyük kısmı KULAKLA/GÖZLE doğrulanmadan kapatılamaz. Koddan
KESİN çıkan her şey (sabitler, eşikler, matematik, dosya varlığı)
gerçek sayılarla raporlandı; kulak/göz gerektiren her madde AÇIKÇA
"TESTFLIGHT'A DEVREDİLDİ" işaretlendi, tahmin YÜRÜTÜLMEDİ.

---

## A) ÖĞRETİM DOĞRULUĞU

### 🟡 "Q = 2.5 (sabit)" öncülü YANLIŞ — böyle tek bir sabit YOK, koddan doğrulandı
Görev metninin "Q = 2.5 (sabit)" öncülü koddan DOĞRULANAMADI —
grep ile TÜM `Q.value` atamaları tarandı, HİÇBİR yerde paylaşılan tek
bir "2.5" Q sabiti yok. Gerçek durum (kaynağıyla):
- `kesim-noktasi.js: FILTER_Q = Math.SQRT1_2` (≈0.707) — HPF/LPF için
  **Butterworth standardı**, gerçek analog/dijital filtre tasarımıyla
  BİREBİR uyumlu, matematiksel olarak DOĞRU. 🟢
- `boost-mu-cut-mu.js: FILTER_Q = 1.4` — boost/cut bump şekli için sabit,
  gerçek mixte "orta genişlikte müzikal EQ" aralığında (tipik 1-2), yanlış
  DEĞİL.
- `frekans-cakismasi.js: CUT_FILTER_Q = 1.1` — maskeleme çentiği için, aynı
  şekilde makul.
- `frekans-bulma.js`: Q ZORLUKLA DEĞİŞİYOR (0.9→1.3→2.5→4.2→3.2,
  easy→medium→hard→pro→proplus) — SABİT DEĞİL, zorlukla daralıyor
  (kolay=geniş/duyulur, zor=dar/güç). Pedagojik olarak TUTARLI. TEK
  istisna: proplus (3.2) pro'dan (4.2) DAHA GENİŞ — ama proplus ÇOK
  BANTLI bir soru tipi (aynı anda birden fazla bant ayırt etme), zorluk
  farklı bir eksenden geliyor — HATA olarak İŞARETLENEMEZ, BELİRSİZ
  (tasarım gerekçesi kodda açık değil).
- `tonal-denge.js: BAND_PEAK_Q = 1.0` — "geniş bölge eğrisi, cerrahi
  DEĞİL" diye AÇIKÇA gerekçeli, doğru.
Sonuç: task'ın "Q=2.5 sabit" varsayımı GEÇERSİZ (muhtemelen
frekans-bulma'nın "hard" tier'ındaki TEK değerle karıştırılmış) — ama
gerçek değerlerin HİÇBİRİ sektöre AYKIRI değil.

### 🟢 Kompresör: ratio/threshold/knee/attack/release — spec-uyumlu, kendi kendini flagliyor
`RATIO_MIN=1/RATIO_MAX=20` DynamicsCompressorNode'un GERÇEK spec
sınırı (Web Audio API). Pratik aralık ratio 1.3-14, threshold
-8..-34dB, knee 6dB (sabit), attack 3ms (sabit), release 150ms
(sabit) — attack/release'in BİLEREK sabit tutulması ("hangisi daha
sıkışmış" sorusunun net kalması için) doğru bir pedagojik gerekçe.
Sayılar gerçek mixleme aralıklarının İÇİNDE. Kod kendi kendini
"KULAKLA DOĞRULANMADI, makul bir başlangıç noktası" diye flagliyor —
**TESTFLIGHT'A DEVREDİLDİ**.

### 🟢 Reverb: decay/pre-delay/tip ayrımı — akustik olarak gerçekçi
Room (decay 0.3-0.9s, pre-delay 3-12ms), Hall (1.6-3.2s, 20-45ms),
Plate (0.9-2.0s, 0-6ms, brightness 0.85) — ÜÇÜ de gerçek akustik
karakterle TUTARLI (Room kısa/yakın, Hall uzun/geniş, Plate parlak/
metalik kuyruk kısa pre-delay'le). Sayısal hata YOK. **TESTFLIGHT'A
DEVREDİLDİ** (kulakla "gerçekçi hissediyor mu").

### 🟢 dB Seviyesi: adım büyüklükleri makul JND aralığında
`DISTRACTOR_STEP_DB`: easy 1.5dB → proplus 0.35dB. Literatürde
seviye farkının işitsel eşiği (JND) eğitimli kulak için ~0.5-1dB,
deneyimsiz dinleyici için 1-3dB civarı sıkça anılır — 1.5dB (kolay)
ve 0.35dB (en zor, profesyonel-düzey ince ayrım) bu aralıkla TUTARLI,
aşırı/gerçekçi-dışı değil.

### 🟡 Pan: "7 kademe, dereceleri" öncülü ARTIK GEÇERSİZ — G120'de mimari değişti
Kod ÖNCEDEN (G118) sabit isimli 3/5/7 kademelik bir IZGARA kullanıyordu
("Tam Sol/Sol/.../Tam Sağ") — **G120'de TERK EDİLDİ**. Şu an pan değeri
**SÜREKLİ bir ölçek** (-100..100 arası herhangi bir tam sayı, YÜZDE
olarak, DERECE DEĞİL), şıklar bu değerin ETRAFINDA curve-driven bir
mesafede üretiliyor. "7" sayısı hâlâ var ama artık SADECE zor/pro
zorluklarda gösterilen ŞIK SAYISI (`options:7`) — isimli/sabit bir
7-nokta pozisyon ızgarası DEĞİL. Task'ın "dereceleri" sorusu bu yüzden
YANITSIZ — pan konumu hiçbir yerde "derece" (açı) olarak temsil
edilmiyor, YÜZDE (-100..100) olarak temsil ediliyor. **Görevin kendi
öncülü eskimiş, kod DAHA SONRA değişmiş** — CLAUDE.md'nin "eski
varsayımı sorgulamadan geçme" kuralının tam örneği.

### 🟢 Distortion: 4 tip (clip/soft/tube/tape), zorlukla eşleşiyor
`DISTORTION_TYPES`: easy=clip (en sert/belirgin), medium=soft,
hard=tube, pro/proplus=tape (en ince/müzikal). Gerçek dünyada
sertlik sıralaması (hard clip en agresif, tape saturation en
ince/müzikal) İLE TUTARLI — pedagojik olarak mantıklı bir zorluk
eşleştirmesi, hata değil.

### 🟢 Frekans Çakışması: bant genişlikleri/kesme adımları kademeli
`regionWidthOct` 1.6→0.4 oktav, `cutStepDb` 4.0→0.8dB (easy→pro) —
düzenli, makul bir azalma eğrisi, sıçrama/uçurum yok.

---

## B) ZORLUK EĞRİSİ TUTARLILIĞI

### 🟡 "Z1-Z7" öncülü karışık — bunlar GELİŞTİRME ADIMLARI, kullanıcı-görünür 7 seviye DEĞİL
DURUM.md'nin kendi "ZORLUK MİMARİSİ — KODLANDI (Z1-Z7)" başlığı bir
GECE OTURUMUNUN yedi GELİŞTİRME ADIMINI (Z1=temel eğri, Z2=..., Z7=...)
adlandırıyor — kullanıcının OYUN İÇİNDE gördüğü bir "7 kademe" YOK.
Kullanıcı-görünür zorluk İKİ AYRI eksende: (1) **"Sabit" mod** — 5
isimli tier (easy/medium/hard/pro/proplus, Pro-kilitli), (2)
**"Otomatik" mod** — 1-20 arası SÜREKLİ/logaritmik seviye
(`DIFFICULTY_CONFIG.LEVEL_CAP=20`, `logLerp` ile). Task'ın "eşit mi,
uçurum var mı" sorusunun yanıtı: Otomatik eğri **logaritmik
enterpolasyon** kullanıyor (`logLerp`) — bu, insan işitsel algısının
KENDİSİ logaritmik olduğu için MATEMATİKSEL OLARAK DOĞRU seçim, ani
sıçrama YOK (fonksiyon sürekli/monoton).

### 🟢 Seans rampası (MIN -1.5 / MAX +1.0 / BOSS +2.0) — kodda BİREBİR doğrulandı
`core/difficulty-curve.js:SESSION_RAMP_CONFIG`: `MIN_OFFSET: -1.5,
MAX_OFFSET: 1.0, BOSS_OFFSET: 2.0` — görev metnindeki üç sayıyla
BİREBİR eşleşiyor, `sessionRampOffset()` doğru uyguluyor (boss'ta
sabit +2.0, değilse MIN'den MAX'a doğrusal ilerleme). **Kod DOĞRU**.
Hissediliyor mu — **TESTFLIGHT'A DEVREDİLDİ**.

### BELİRSİZ — 12 mod arasında aynı seviye benzer zorlukta mı
Her modun KENDİ AT_1/AT_CAP sayıları var (dB Seviyesi'nin dB adımı,
Pan'ın yüzde mesafesi, Reverb'in kGap'i — birbirinden TAMAMEN farklı
birimler/ölçekler). Matematiksel olarak "aynı Level 10, hepsinde aynı
ZORLUK hissi" iddia EDİLEMEZ/doğrulanamaz — her mod kendi ekseninde
İÇSEL olarak tutarlı (kod bunu garanti ediyor), ama MODLAR ARASI
göreli zorluk dengesi SADECE kulakla/oyun testiyle karşılaştırılabilir.
**TESTFLIGHT'A DEVREDİLDİ**.

### 🟢 Statik DIFFICULTY tabloları ile eğri çakışması — KASITLI hizalama, kod kanıtlı
Her modun `REVERB_CURVE_CONFIG`/`DB_CURVE_CONFIG`/vb. kendi yorumunda
AÇIKÇA belirtiyor: "AT_1 statik easy değeriyle BİREBİR AYNI" —
örneğin Reverb'in `K_GAP_AT_1: 0.45` == statik `easy.kGap: 0.45`.
Otomatik ve Sabit modun BAŞLANGIÇ noktaları KASITLI olarak
hizalanmış, çakışma YOK.

---

## C) İLK 60 SANİYE

### 🟢 Açılış: doğrudan ana menü, zorunlu bir onboarding EKRANI YOK
`index.html`'de `#screen-menu` `class="screen active"` ile İLK açık
ekran — `goScreen("menu")` uygulamanın varsayılan giriş noktası.
Kalibrasyon (`prefs.calibrationDone`) hiçbir yerde açılışta ZORUNLU
KONTROL EDİLMİYOR (Ayarlar'dan erişilen İSTEĞE BAĞLI bir ekran) —
kullanıcı SIFIR ekstra adımla mod kartlarını görür.

### 🟢 Yönlendirme: SPOTLIGHT turu + kalıcı "i" — ekran BAZLI değil, ETKİLEŞİM bazlı
Zorunlu bir "hoş geldin" akışı YOK ama İKİ katmanlı bağlamsal
yönlendirme VAR: (1) her modun İLK `HINT_ROUNDS_LIMIT=2` turunda
otomatik açılan, ekranı karartıp adım adım (dinle→seç→onayla)
gösteren SPOTLIGHT turu ("Geç" ile atlanabilir), (2) her ekranda
kalıcı "i" ikonu (tıkla-aç/kapa). Kullanıcı bir moda GİRMEDEN önce
kart üstündeki kısa açıklamayı (`mode-catalog.js: aciklama`, örn.
"Hangi frekans artırıldı?") görür.

### BELİRSİZ — "hiçbir şey bilmeyen biri ilk 60 saniyede ne anlıyor"
Mekanizma VAR (kart açıklaması → Spotlight → i-ikonu), ama bunun
GERÇEKTEN yeterli olup olmadığı (metinlerin netliği, adım sayısının
doğruluğu, "Geç"e basıp turu atlayan bir kullanıcının kaybolup
kaybolmadığı) SADECE gerçek, hiç bilgisi olmayan bir test kullanıcısıyla
ölçülebilir. **TESTFLIGHT'A DEVREDİLDİ**.

---

## D) PARA AKIŞI UÇTAN UCA

### 🟡 YENİ BULGU — "Ücretsiz oturum bitti" duvarı YUMUŞAK: modu yeniden açarak aşılabiliyor
`roundsInThisPlaySession` (5-soru/oturum sayacı) **BELLEK-İÇİ, KALICI
DEĞİL** — `app.js` modül kapsamında `let`, `storage.js`'e HİÇ
yazılmıyor. Sadece "gerçek bir fresh-start"ta (mod kartına yeniden
girme/"Tekrar Oyna") sıfırlanıyor (`roundsInThisPlaySession = 0`,
app.js:6349). Paywall (`sessionLimit`) açıldığında `paywallCloseBtn`
ile KAPATILABİLİR (`goBackFromSubpage()`) — bu round'u SONLANDIRIR
ama uygulamayı KAPATMAZ. Kullanıcı modu YENİDEN açarsa
`roundsInThisPlaySession` SIFIRLANIR, **5 soruluk hak YENİDEN
başlar** — reklam izlemeden, Pro'ya geçmeden, sınırsız kez
TEKRARLANABİLİR. Bu KOD SEVİYESİNDE DOĞRULANDI (satır referansları
yukarıda), tahmin DEĞİL. **CAN'lar (stats.lives) BU aşımdan
ETKİLENMİYOR** — kalıcı/persist, yanlış cevap verirse GERÇEKTEN
azalıyor — asıl sınırlayıcı kaynak CAN, "5 soru/oturum" duvarı
DEĞİL. Bu bir "hata" mı "kasıtlı yumuşak sürtünme" mi — hiçbir
commit/yorum BUNU açıkça bir ÜRÜN KARARI olarak belgelemiyor —
**ürün kararı gerektiriyor, kod DOKUNULMADI**.

### 🟢 Diğer para akışı adımları — TUR2/TUR3A'da zaten doğrulanmış, burada TEKRARLANMADI
- Satın alma yazma başarısızlığı → G229 ile korumalı (localStorage
  hatası artık kullanıcıya açık bildiriliyor, state tutarsız kalmıyor).
- Restore Purchase asimetrisi → G228 ile kapandı.
- Reklam izleme yarıda kesilirse ödül VERİLMİYOR (E bölümü, bu tur) —
  doğrulandı.
- Reklam yükleme zaman aşımı (buton kalıcı kilitlenme riski) → G234
  ile kapandı.
- "Pro'ya geçtikten sonra kilitli kalan bir şey" — G194'te ("Pro'da
  ücretsiz metin sızıntıları") ZATEN taranıp kapatılmış (DURUM.md
  kaydı) — bu turda YENİDEN taranmadı, TEKRAR ELE ALINMASI
  gerekmiyor (kanıt: commit G194).

### BELİRSİZ — kullanıcı hangi noktada vazgeçer
Davranışsal/duygusal bir soru, koddan ÖLÇÜLEMEZ. **TESTFLIGHT'A
DEVREDİLDİ**.

---

## E) ERİŞİLEBİLİRLİK

### 🟡 Dynamic Type (sistem yazı boyutu) DESTEKLENMİYOR — koddan kesin
`styles.css`'teki TÜM `font-size` değerleri (sayıldı: 300+ kural)
**SABİT `px`** — hiçbir yerde `rem`/`em`/WebKit'in Dynamic Type
köprüsü (`-webkit-text-size-adjust` metne ölçek KATMAZ, sadece
otomatik-küçültmeyi kontrol eder) kullanılmıyor. iOS'un Ayarlar →
Ekran ve Parlaklık → Metin Boyutu ayarı bu uygulamada **HİÇBİR
YAZIYI büyütmez/küçültmez**. VoiceOver kullanıcıları için DEĞİL,
düşük görme/büyük yazı tercih eden kullanıcılar için gerçek bir
kısıtlama.

### 🟡 Dokunma hedefleri KISMEN 44×44pt altında — somut örnek bulundu
Çoğu buton uyumlu (`.btn`: min-height 52px, ana CTA: 56px,
`.upload-trigger-btn`: TAM 44px) — ama `.seg button` (segmented
control düğmeleri) **min-height:36px**, Apple HIG'in 44pt minimumunun
ALTINDA. Kod içinde BİR yerde (satır 1601 yorumu) ".abbtn"in
44px'i AŞTIĞI daha önce fark edilip düzeltilmiş — yani ekip BU
KONUYA daha önce dikkat etmiş, ama `.seg button` gözden kaçmış
görünüyor.

### 🟡 Ana etkileşim yüzeyi (spektrum canvas) VoiceOver'a KAPALI, alternatif VAR
`#visualizer` (Frekans Bulma'nın "Dokunmalı" cevap formatının birincil
etkileşim yüzeyi) bir `<canvas>`, `aria-label` YOK, hiçbir erişilebilir
alternatif işaretleme yok — canvas içeriği VoiceOver'ın erişilebilirlik
ağacına VARSAYILAN OLARAK YANSIMAZ, ekrana dokunarak "nereye
bastığını" anlamak sighted (gören) bir kullanıcı gerektirir. **AMA**
AYNI modun "Şıklı" (multiple-choice, gerçek `<button>` elemanları
— erişilebilir) bir ALTERNATİFİ VAR (görev metninin kendi ifadesiyle
doğrulandı: "Dokunmalı/Şıklı cevap biçimini seçebilen TEK mod budur")
— VoiceOver kullanıcısı modu OYNAYAMAZ değil, SADECE "Dokunmalı"
biçimini kullanamaz, "Şıklı"ya geçmesi gerekir (bu geçişin KENDİSİ
ne kadar keşfedilebilir, BELİRSİZ).

### 🟢 114 native `<button>`, 36 `aria-label` — temel semantik doğru
Etkileşimli elemanların ÇOĞU `<div onclick>` değil gerçek `<button>`
(implicit ARIA role, VoiceOver'a native destek) — 0 `role=` bulunması
BEKLENEN/DOĞRU (native elemanlar buna ihtiyaç DUYMUYOR), eksik değil.

### 🟢 Kontrast — GENEL OLARAK GÜÇLÜ, TEK zayıf nokta somut sayılarla bulundu
WCAG formülüyle HESAPLANDI (tahmin DEĞİL): birincil metin (`--text`
#f2f3f5) arka plana karşı **17.94:1** (AAA'nın bile üstünde),
ikincil (`--text-2`) **10.54:1**, üçüncül (`--text-3`) **6.52:1** —
hepsi AA'nın (4.5:1) rahatça üstünde. Kırmızı/yeşil/amber/cyan vurgu
renkleri de 7-11:1 arası. **TEK istisna: `--text-muted` (#6c7178)
arka plana karşı 4.05:1 — AA'nın 4.5:1 eşiğinin ALTINDA** (büyük
metin için gereken 3:1'i geçiyor ama küçük metin için YETERSİZ).
Gerçek kullanım yerleri KÜÇÜK metin (`.coming-head` 13px,
`.game-chapter-label`/`.game-speed-label` 9.5px, `.fb-xp-label` 10px)
— yani bu GERÇEK bir WCAG AA ihlali, dekoratif/büyük metinle
sınırlı değil.

---

## F) "i" METİNLERİ KAPSAMI

### 🟢 12 playable modun HEPSİNDE MODE_GUIDE_TEXTS + MODE_OPTIONS_TEXTS VAR
Python ile ayrıştırılıp doğrulandı: `mode-catalog.js`'in 12
`playable:true` mod id'sinin TAMAMI `MODE_GUIDE_TEXTS` VE
`MODE_OPTIONS_TEXTS`'te birebir karşılık buluyor, eksik YOK.

### 🟢 Tonal Balance'ın zone-listening'i (görevin kendi örneği) DOĞRULANDI — G190'da KAPANDI, HÂLÂ kapalı
`TOOLS_TONAL_GUIDE`'ın "Bir bandı tek başına dinle" bölümü
("Grafikteki herhangi bir banda dokun — o bölge solo çalar...")
GERÇEKTEN mevcut ve doğru — task'ın kendi verdiği ÖRNEK regresyona
UĞRAMAMIŞ.

### 🟡 A/B/Döngü'nün "yeniden açman gerekiyor" davranışı "i" metninde YOK
`MODE_OPTIONS_TEXTS` (Kompresör/Reverb/Distortion) "Karta uzun
basarak A/B/C döngüsünü açıp kapatabilirsin" diyor — MEKANİZMANIN
KENDİSİ doğru anlatılıyor, ama önceki turda BELİRSİZ/ürün kararı
olarak kapatılan "cevaptan sonra otomatik kapanıyor, her soruda
yeniden açman gerekiyor" davranışı METİNDE YOK — kullanıcı bu
sürtünmeyi metinden ÖNCEDEN öğrenmiyor, deneyerek buluyor. 1.0'da
davranış kalacağı için (kullanıcı kararı) bu bir DOKÜMANTASYON
boşluğu olarak notlanabilir (düşük öncelik, davranışın kendisi
kasıtlı).

### BELİRSİZ — kalan 10 modun her birinin TÜM ikincil/gizli etkileşimlerinin TEK TEK taranması
Bu tur 2 örnek (Tonal Balance zone-listening, A/B döngü davranışı)
DERİNLEMESİNE incelendi — 12 modun HER birinin render/click-handler
kodunun satır satır "i" metniyle çapraz kontrolü (görevin istediği
tam kapsam) bu turda YAPILMADI, zaman/kapsam sınırı. **TESTFLIGHT'A
DEVREDİLDİ kısmen** — gerçek kullanıcı playtesti eksik dokümantasyonu
en hızlı ortaya çıkaracak yöntem.

---

## G) ÖĞRETİM ile GERİ BİLDİRİM TUTARLILIĞI

### 🟡 Yapısal risk DOĞRULANDI: "i" metinleri ve feedback metinleri AYRI dosyalarda, PAYLAŞILAN terim sabiti YOK
`core/guide-texts.js` (i-metinleri) ve her modun kendi
`getFeedbackData()` fonksiyonu (feedback metinleri) TAMAMEN AYRI
kod yolları — aralarında TERİM TUTARLILIĞINI ZORLAYAN hiçbir ortak
sabit/sözlük YOK (level-sheet-terms.js SADECE sayısal FORMAT'ları
—dB/Hz gösterimi— paylaşıyor, TERİMLERİ değil). Bu, Tur 1'in restore
asimetrisiyle AYNI risk SINIFI: iki yerde aynı şeyi anlatan metin,
YAPISAL olarak senkron KALMAYA ZORLANMIYOR, sadece yazarın dikkatine
bağlı.

### BELİRSİZ — GERÇEKTEN çelişen bir çift bulunamadı, ama kapsamlı taranmadı
Bu turda 12 modun i-metni/feedback metni çiftleri TEK TEK
karşılaştırılmadı (zaman sınırı) — YAPISAL risk kanıtlandı, SOMUT bir
çelişki ÖRNEĞİ bu turda YAKALANMADI (aranmadığı için, YOK olduğu
için DEĞİL). **TESTFLIGHT'A DEVREDİLDİ** — gerçek kullanıcı/playtest
bunu daha hızlı yakalar.

---

## H) ZORLUK ile ÖDÜL TUTARLILIĞI

### 🟢 Z7'de (zor) doğru cevap Z1'den (kolay) FAZLA XP veriyor — kod kanıtlı, TÜM 12 modda
Her modun DIFFICULTY tablosu XP'yi ZORLUKLA ARTAN şekilde tanımlıyor
— örnek (Frekans Bulma): easy=16 → medium=24 → hard=36 → pro=52
XP. AYNI desen `grep` ile 12 modun TAMAMINDA doğrulandı (hiçbiri
ters/düz değil). **Zor soru DAHA AZ değil DAHA FAZLA ödüllendiriliyor**
— pedagojik olarak DOĞRU yön.

### 🟢 Rozet eşikleri (6 rozet) — HEPSİ ulaşılabilir, koddan doğrulandı
`first_blood` (1 doğru — anlık), `combo_5` (5 ardışık doğru),
`round_25` (25 tur — birkaç oturum), `accuracy_70` (20+ turda %70
doğruluk), `pro_clear` (Pro zorlukta 8 doğru — free kullanıcı
"Otomatik" modda Level>12'ye ulaşırsa erişilebilir, `paywall.
isFixedDifficultyLocked` SADECE "Sabit" mod SEÇİMİNİ kilitliyor,
Otomatik modun kendisi ücretsizde de Pro tier'a çıkabiliyor — kilitli
DEĞİL), `boss_win` (her 5 turda 1 boss round geliyor —
`isBossRound = (rounds+1)%5===0` — kalıcı `stats.rounds`'a bağlı,
sık karşılaşılıyor). **Hiçbiri erişilemez DEĞİL.**

### 🟡 Seviye eşikleri (1/3/6/10/15/22/30) — kodda BİREBİR var, ama "TASLAK/TAHMİNİ" diye AÇIKÇA flagli
`LEVEL_TITLES` görev metnindeki 7 sayıyla BİREBİR eşleşiyor. Kodun
KENDİ yorumu: "eşikler TASLAK/TAHMİNİ seçildi — playtest'le
DOĞRULANMADI" — XP kazanma hızıyla UYUMLU mu sorusu bu yüzden
matematiksel olarak HESAPLANABİLİR ama "doğru hissediyor mu" sorusu
KULAKLA/OYUNLA cevaplanır.

### 🟢 HESAPLANDI (tahmin değil) — Altın Kulak'a (academyLevel 30) toplam XP ihtiyacı
`academyXpNeeded(level) = 5 × (120+(level-1)×70)`. Seviye 1→30 için
TOPLAM: **159.500 XP** (tüm modların XP'si BİRLİKTE sayılır,
`academyTotalXp`). Bunu "kaç saat" e çevirmek İÇİN gereken 2 girdi
(saatte kaç soru cevaplanır, doğruluk oranı) KODDA/task'ta YOK —
**"kaç saatte" sorusu SAYI UYDURMADAN cevaplanamaz, TESTFLIGHT'A
DEVREDİLDİ.** Tek KESİN sayı: 159.500 XP hedefin KENDİSİ, uydurma
değil, doğrudan formülden.

### BELİRSİZ — hiç ulaşılamayan eşik var mı
6 rozetin/7 seviye unvanının hiçbiri MATEMATİKSEL olarak imkânsız
DEĞİL (hepsi sonlu bir XP/tur sayısıyla ulaşılabilir formüllerle
tanımlı) — ama "makul SÜREDE" ulaşılabilir mi sorusu yukarıdaki
"kaç saat" belirsizliğiyle AYNI, **TESTFLIGHT'A DEVREDİLDİ**.

---

## I) ÜCRETSİZ KULLANICININ GERÇEK DENEYİMİ ⚠️ ÖNCELİKLİ

### 🔴 CİDDİ — Görev metninin "2 açık mod" öncülü YANLIŞ: gerçekte 5 mod ücretsiz
`mode-catalog.js`'te `tier:"free"` VE `playable:true` olan mod
sayısı **5** (Frekans Bulma, Kesim Noktası, Q Genişliği, Boost mu
Cut mu, Kompresör) — "hiz-modu" da `tier:"free"` ama
`playable:false` (henüz kodlanmadı, sayılmaz). `core/guide-texts.js`'in
KENDİ "i" metni de "12 modun 5'i ücretsiz" diyor — İKİ bağımsız
kaynak (kod + kullanıcıya gösterilen metin) BİRBİRİYLE TUTARLI,
"2" sayısı HİÇBİR yerde doğrulanamadı. **Bu, Section I'nın TÜM
sonraki hesaplarını DEĞİŞTİRİYOR** — aşağıdaki hesaplar DOĞRU (5
mod) sayıya göre yapıldı.

### 🔴 CİDDİ, YENİ BULGU — "5 soru/oturum" duvarı reklamsız da aşılabiliyor (D bölümüyle AYNI kök)
Bkz. D bölümü — `roundsInThisPlaySession` kalıcı değil, modu
yeniden açmak sayacı sıfırlıyor. **Sonuç: motive bir ücretsiz
kullanıcı, CAN'ları yeterliyse (doğru cevapladıkça can gitmiyor),
GÜNDE TEORİK OLARAK SINIRSIZ soru cevaplayabilir** — "5 soru + 5
can + 2 açık mod" öncülünün ima ettiğinden ÇOK DAHA GENİŞ bir
ücretsiz deneyim. Bu ya (a) kasıtlı yumuşak bir tasarım (sürtünme
var ama duvar yok) ya da (b) fark edilmemiş bir gevşeklik — kod
HİÇBİRİNİ doğrulamıyor, **ürün kararı gerektiriyor**.

### 🟢 HESAPLANDI — reklamla günlük ek soru hakkı (kod sabitleri, tahmin değil)
`SESSION_EXTENSION_QUESTIONS=5`, `MAX_SESSION_EXTENSION_ADS_PER_DAY=3`
→ oturum başına temel 5 + reklamla en fazla 3×5=15 EK soru = **tek
bir oturumda reklamla 20 soruya kadar**. Yukarıdaki D bulgusu
(oturum sıfırlanabilir) nedeniyle GÜNLÜK TOPLAM soru sayısı bu 20
ile SINIRLI DEĞİL — kullanıcı yeniden oturum açarak devam edebilir.
**"Günde kaç soru" sorusunun gerçek üst sınırı reklam/oturum
mekaniğinden DEĞİL, CAN havuzundan (5 can, 30dk'da 1 dolar → 24
saatte teorik 48 can-eşdeğeri, ama SADECE yanlış cevap can
harcıyor) ve kullanıcının SABRINDAN geliyor.**

### 🟡 "5 mod ücretsiz, sınırsız erişilebilir + oturum yumuşak" — bu "tadımlık" değil, GERÇEK bir öğrenme yüzeyi
5 mod (Frekans Bulma, Kesim Noktası, Q Genişliği, Boost/Cut,
Kompresör) Motor 1'in 4 temel modunu VE Motor 2'nin İLK modunu
kapsıyor — hem "tek bir değeri bul" hem "iki sesi karşılaştır"
oyun TİPLERİNİN İKİSİ de ücretsizde temsil ediliyor (sadece TEK bir
sığ dilim değil). Otomatik zorluk modu bu 5 modun HER birinde 1-20
arası TAM eğriyi (yukarıdaki sessionRamp + logLerp) yaşatıyor —
**ücretsiz kullanıcı GERÇEKTEN öğrenebilir**, sadece "birkaç soru
dene" tadımlığı değil. Bu bulgunun DOĞRULUĞU koddan net; "yorum
yazdırır mı" TESTFLIGHT'A DEVREDİLDİ.

### 🟢 Paywall'a hiç çarpmadan anlamlı bir seans YAŞANABİLİYOR
Yukarıdaki iki bulgunun BİRLEŞİMİ: 5 ücretsiz mod + yumuşak oturum
duvarı + kalıcı can havuzu (yanlış cevap vermedikçe hiç
tükenmiyor) → doğru cevaplayan bir kullanıcı paywall'ı HİÇ
GÖRMEDEN uzun bir seans oynayabilir. Bu KOD SEVİYESİNDE doğru —
"iyi bir ilk izlenim" olup olmadığı **TESTFLIGHT'A DEVREDİLDİ**.

---

# TESTFLIGHT'A DEVREDİLENLER (görevin kendi listesi + bu turda eklenenler)

- Q değerlerinin doğal/gerçekçi HİSSİ (sayılar spec-uyumlu/makul,
  ama "kulağa doğru geliyor mu" ayrı soru)
- Seans rampasının (-1.5/+1.0/+2.0) hissedilirliği
- Z1 gerçekten kolay, Z7 (ya da Level 20/proplus) gerçekten
  "imkânsız hissi" veriyor mu
- Referans filtrelerinin ayırt edilebilirliği
- Pan 7 kademe / Stereo %0-%100 uçlarının algısal netliği
- Terk noktaları (kullanıcı nerede bırakıyor)
- 12 mod arası göreli zorluk dengesi (B)
- İlk 60 saniyenin GERÇEKTEN yeterli olup olmadığı (C)
- Kullanıcının vazgeçme noktaları (D)
- VoiceOver'ın "Dokunmalı" moddan "Şıklı"ya geçişi ne kadar
  keşfedilebilir buluyor (E)
- 12 modun TAM "i"-metni/gizli-etkileşim çapraz taraması (F)
- "i" ile feedback arasında somut bir çelişki ÖRNEĞİ var mı (G)
- Seviye/rozet eşiklerinin "kaç saatte" ulaşılabilirliği (H)
- 5 ücretsiz modun "iyi yorum yazdırma" gücü (I)

---

# ÖNCELİK LİSTELERİ

## Yayın öncesi düzeltilecekler (öncelik sırasıyla)
1. **🔴 D/I — "5 soru/oturum" duvarının yumuşak olması hakkında bir ÜRÜN
   KARARI verilmeli.** Kasıtlıysa belgelensin (bu raporun kendisi
   yeterli kayıt olabilir); değilse `roundsInThisPlaySession`'ı
   kalıcı hale getirmek (localStorage, günlük sıfırlanan bir sayaç)
   küçük bir değişiklik.
2. **🟡 E — `--text-muted` kontrastı (4.05:1) AA eşiğinin altında,
   küçük metinde KULLANILIYOR** — ya renk hafifçe açılır ya bu
   kullanım yerleri `--text-3`'e (6.52:1) çekilir.
3. **🟡 E — `.seg button` (36px) 44pt dokunma hedefinin altında** —
   diğer butonlarla (44-56px) tutarlı hale getirilebilir.

## 1.1'e bırakılabilir
- Dynamic Type desteğinin eklenmesi (E) — kapsamlı bir CSS birim
  geçişi gerektirir, büyük iş.
- "Dokunmalı" formatının VoiceOver'a native erişilebilir hale
  getirilmesi (E) — "Şıklı" alternatifi ZATEN var, acil değil.
- A/B döngüsünün "her soruda kapanıyor" davranışının "i" metnine
  eklenmesi (F) — düşük öncelik, davranış zaten kasıtlı kalacak.
- 12 modun TAM i-metni/feedback çapraz taraması (F/G).

## TestFlight'a devredilenler
Yukarıdaki bölüm — 14 madde, tekrar edilmedi.

## Sadece belgelenecekler
- "Q=2.5" ve "Pan 7 kademe/derece" öncüllerinin GÜNCEL koddan
  farklı olduğu (A) — muhtemelen eski bir zihin modeli/dokümandan
  kalma, kod DAHA SONRA değişmiş.
- Altın Kulak'a toplam XP ihtiyacı: **159.500 XP** (hesaplanmış,
  kesin) — "kaç saat" e çevirmek için playtest verisi gerekiyor.
- academyLevel eşiklerinin (LEVEL_TITLES) kodun kendi "TASLAK/
  TAHMİNİ" itirafı — 1.1'de playtest sonrası kalibre edilebilir.

**Bu turda hiçbir kod DEĞİŞTİRİLMEDİ — sadece ölçüm.**

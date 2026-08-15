# TAM DENETİM — 15 Ağustos

_Kaynak: GORSEL-TEST.md + TAM-LISTE-14-08.md + DURUM.md + git log._
_Kod yazılmadı, dosya değiştirilmedi, commit atılmadı — sadece ölçüm._

---

# A) AÇIK İŞARETLİ HER MADDE

## Düzeltilecek

### #15 — Reverb'de C harfi kutu içinde değil
**KAPANMIŞ — G183 (commit `1cd7dc3`), G186c'de (`10af88e`) yeniden doğrulandı.**
Kök sebep: `.abside-c{display:none}` / `.abbtn.three-way .abside-c{display:block}`
(`www/styles.css`) — C'nin görünürlüğü açılırken `display:block` kullanılıyordu,
ama base `.abside` kuralı `display:flex` ile harfi ORTALIYORDU — `block` bunu
eziyordu. Fix: `display:block` → `display:flex`. Şu an kodda (`www/styles.css:1710-1711`):
`.abside-c{display:none}` / `.abbtn.three-way .abside-c{display:flex}` — doğrulandı, hâlâ öyle.
GORSEL-TEST.md'nin kendi satırı (`⏸️ ölçüm bekliyor`) **STALE** — bkz. Liste 2.

### #18 — Reverb'de play butonu ortalanmamış
**KAPANMIŞ — G184 (commit `548927c`).**
İlk deneme (G183, `position:absolute` tek başına) A/B/C kutusunu 40px
kapattığı için geri alınmıştı. G184'te AYNI `position:absolute` + görünmez
slot (`#startBtnSlot`) + A/B/C/döngünün KENDİSİNİN küçültülüp sağa
kaydırılmasıyla (`www/styles.css:1242-1243`: `.controls-m2 #abToggle.game-ctrl-ab{margin-left:40px}`)
çözüldü. Ölçüm: `centerOffset:0`, `startBtnRight=227`/`abLeft=229` (2px
boşluk, örtüşme yok), 3 Motor2 modunda da (Kompresör/Reverb/Distortion)
ayrı ayrı doğrulandı. Motor1 (`#startBtn` `position:static`) etkilenmedi.
Kod hâlâ yerinde (`www/styles.css:1230-1243`).

### #19 — enterMode()'da updateTimerUI() / roundFlow.stopAll()
**KAPANMIŞ — G176 (commit `664f1f1`).**
Görevin kendi hipotezi BİREBİR doğru çıktı: `roundFlow.stopAll()`
(`round-flow.js:36`) SADECE zamanlayıcıyı durdurur, `timeLeft`/`roundDuration`'ı
sıfırlamaz (AYNI moddaki "Tekrar Çal" bunu bilerek korur); `updateTimerUI()`
`enterMode()`'da HİÇ çağrılmıyordu. Fix: `enterMode()`'un mod-değişimi
bloğuna `updateTimerUI(0, 0)` eklendi (`www/js/app.js:2577`, `updateUI()`'den
hemen önce). Ölçüm (Playwright, önce/sonra): "12.6s"/%78.75 (önceki modun
kalıntısı) → "0.0s"/%0. `roundFlow`'un kendi `timeLeft`/`roundDuration`'ına
DOKUNULMADI (LOCKED, "Tekrar Çal" davranışı korunuyor). 2 yeni test eklendi
(`test/round-flow.test.mjs`).

### #23 — Oyun türü değişince play/pause ikonu ses durumuyla senkron mu
**KAPANMIŞ — G180 (commit `9f61003`).**
`updateStartBtnLabel()`'in kendisi zaten doğru çalışıyordu (`autoStopped`
okuyor). Asıl bulunan hata: `setAutoPlay(false)` (Oyun Türü değişiminin TEK
çağrı noktası) `pauseRound()`'un zaten sahip olduğu `if (abLoopTimer)
stopAbLoop();` satırına sahip DEĞİLDİ — ikon "▶" derken A/B döngü
zamanlayıcısı 2sn'de bir hâlâ tetikleniyordu (arka planda `toggleAB()`
çağırmaya devam ediyordu). Fix satırı hâlâ kodda (`www/js/app.js:5664`,
`setAutoPlay()`'in `else` dalı). 5 alternatif desync noktası da (mod
değişimi/kaynak değişimi/arka plana alma/ayarlar paneli/feedback'ten çıkma)
ayrı ayrı ölçülüp GÜVENLİ bulundu.

**NOT — #23 ile #29 karıştırılmasın:** GORSEL-TEST.md'nin BULUNAN HATALAR
tablosundaki satır 29 ("FREKANS BULMA'DA PLAY/PAUSE YİNE KARIŞIYOR") AYRI
bir bulgu — Bug 23'ün (bu madde) A/B döngü tarafını değil, `freqTapTimer`'ın
temizlenmemesini kapsıyor, G187'de kapandı (önceki OLCUM-15-08.md
raporunda ayrıntılı).

## Ölçüm bekleyen

### #4 — Analizör 4 modda işlenmiş sinyali mi çiziyor
**BUG DEĞİL — KASITLI (G83 tasarım kararı), koddan KESİN olarak
doğrulandı. Safari Web Inspector'a gerek YOK.**
`www/js/app.js:5802-5807`'deki kendi yorumu: "eski çubuk-tabanlı spektrum
çizici (GERÇEK canlı FFT verisini doğrudan çiziyordu — soru sırasında
tepe noktası doğru cevabı ele veriyordu) KALDIRILDI. Yerini
`mode.drawSpectrumBackground` aldı — çizgi grafik, soru sırasında
**NÖTR/sese kör**." `drawSpectrumBackground` TEK bir fonksiyon
(`www/js/modes/frekans-bulma.js:939`), Boost mu Cut mu / Q Genişliği /
Kesim Noktası / Kompresör / Reverb / Tonal Denge / Distortion'ın HEPSİ
BUNU aynen import edip re-export ediyor (`import {...drawSpectrumBackground}
from "./frekans-bulma.js"`, 7 mod dosyasında birebir aynı satır). 4 modun
"birebir aynı düz eğri" göstermesi bug değil — MİMARİ OLARAK aynı kodu
çağırıyorlar, gerçek FFT verisi hiç okunmuyor (cevabı ele vermesin diye,
BİLEREK). GORSEL-TEST.md'nin kendi belirsizliği ("Safari Web Inspector
ölçümü gerekiyor") gereksizmiş — kaynak kod tek başına yeterli.

### #9 — "SONRAKİ SORU"/"ATLAMAK İÇİN ×" bağlı mı, ölü markup mı
**KAPANMIŞ — G183'te (`1cd7dc3`) ölçüldü (ölü `<span>`, hiçbir event yok),
G184'te (`548927c`) kullanıcı kararıyla ("gerçekten tıklanabilir yap")
düzeltildi.**
`.fb-advance-head`'e `#feedbackBox` click delegasyonunda YENİ bir dal
eklendi — `#feedbackClose`'un AYNI `goToNextRound()`'unu çağırıyor
(`www/js/app.js:6467`: `if (e.target.closest(".fb-close") ||
e.target.closest(".fb-advance-head"))`). CSS'te `cursor:pointer` +
`:active` görseli eklendi (`www/styles.css:1507-1511`). Hem kodda hem
DURUM.md'de doğrulanmış, ikinci bir "atla" mekanizması icat edilmedi.

### #10 — Panel açıkken tur ve ses duruyor mu
**KAPANMIŞ — G181 (commit `7b726cd`).**
4 panel (Ayarlar/Bilgi/Kaynak seçim menüsü/Oyundan çık diyaloğu) AYRI AYRI
ölçüldü — dördünde de süre gerçekten akıyordu, ikon yanlışlıkla "Durdur"
gösteriyordu (aslında duraklamamış), `pauseRound()`'un `muteOutput()`'u hiç
çağrılmadığı için ses de susmuyordu. Fix: `sheetPausedRound`'un (Dosyalarım
sheet'i, önceden zaten doğruydu) AYNI izole-bayrak deseni 4 yere ayrı ayrı
uygulandı: `gameSettingsPausedRound`/`guideSheetPausedRound`/
`optionSheetPausedRound`/`exitConfirmPausedRound` — hepsi hâlâ kodda
(`www/js/app.js:6542,6583,6703,7566` civarı), iç içe panellerde erken
resume olmasın diye ayrı bayraklar.

### #49 — Silinen dosya bir modda seçiliyse ne oluyor
**KAPANMIŞ — G202 (commit `d2ce6c7`), #49b.**
`toolsRemoveFile(id)` (`www/js/app.js:9389-9414`): `Object.keys(uploadSelections)
.forEach(contextId => { if (uploadSelections[contextId]===id)
recordUploadSelection(contextId, null); })` — silme HER bağlamdan (mod
context'leri DAHİL, sadece "tools" değil) temizleniyor. Şu an aktif ekran
o modsa `syncUploadGate()` HEMEN çağrılıyor (`www/js/app.js:9413`, G126
notu) — gate paneli SESSİZCE bozulmuyor, "dosya seçilmedi" durumuna anında
düşüyor. Mod bozulmuyor, kullanıcı görür-görmez doğru state'e geçiyor.

## Kısmi

### #13 — Referans Filtreleri'nde çalan ses durdurulabiliyor mu (G201 sonrası)
**KAPANMIŞ — G182 (commit `8f476fc`), G201'DEN ÖNCE zaten çözülmüştü,
G201/G204/G205 bunu BOZMADI.**
G182 başlığı doğrudan "Bug 13 + 14: Referans Filtreleri artık 'Mixini
Yükle'den TAM BAĞIMSIZ" — iki AYRI `createUploadManager()` örneği var
(`www/js/app.js:11791` `toolsRefFilterUploadManager`, `:12256`
`toolsRawMixUploadManager`), her birinin kendi play/pause/pause fonksiyonu
var. G201 (Mixini Yükle duraklat→başlat) ve G204 (sekme çıkışında
duraklatma) SADECE `toolsRawMixUploadManager`'a dokundu, `toolsRefFilterUploadManager`'a
TEK SATIR dokunulmadı (her iki commit'in kendi "Dokunulmayan" listesinde
doğrulanabilir). Şu an kodda ikisi de ayrı ayrı duruyor — regresyon YOK.

### #24 — Bölüm çubuğu idle'da görünüyor mu (G206 sonrası)
**CİHAZDA ÖLÇÜLÜR — kod tarafı KAPANMIŞ (G176/G179) ama GORSEL-TEST.md'nin
cihaz raporuyla ÇÖZÜLMEMİŞ bir çelişki var, hiç takip edilmemiş.**
Kod (`showChapter = !boss && !examActive && isChallenge()`,
`www/js/app.js:3730`) G176'da `challenge.active`'ten `isChallenge()`'a
değiştirildi — Playwright'ta idle'da "BÖLÜM 1/10" (0 dolu nokta) doğru
görünüyor, ÖLÇÜLDÜ. G206 bu koşula HİÇ dokunmadı (SADECE `resetChallengeForNewParkur()`
ekledi, ayrı bir konu — yeni PARKUR başlangıcında sıfırlama, idle-görünürlük
değil). Sorun: GORSEL-TEST.md'nin kendi satırı (#24, "🔴 YENİDEN AÇILDI")
Playwright'ın doğru sonuç verdiğini ama **cihazın** hâlâ eski davranışı
gösterdiğini söylüyor — bu Playwright-vs-cihaz uyuşmazlığı DURUM.md'de HİÇ
araştırılmamış/açıklanmamış (grep: "cihazda...bölüm çubuğu" sıfır sonuç).
İki olasılık, ikisi de doğrulanamadı: (a) cihaz testi G176'dan ÖNCEKİ bir
build'de yapılmış olabilir, (b) gerçek bir Playwright-vs-WKWebView
davranış farkı var. **Yeniden, güncel bir build'de cihazda test edilmeli.**

## Açık

### #54 — goToNextRound() recordAnswer() çağırmıyor — ana bölümde de mi, yoksa telafiye mi özgü?
**DURUYOR — hem parkur (ana bölüm) hem telafide AYNI, mod ayrımı YOK.**
`goToNextRound()` (`www/js/app.js:6354-6374`, `#nextBtn`/"Atla"nın click
handler'ı) `examSystem.recordAnswer()`'ı hiçbir dalda ÇAĞIRMIYOR — fonksiyon
`examSystem.phase`'e hiç BAKMIYOR bile, sadece zamanlayıcıları temizleyip
`startRound()`'a geçiyor. Yani "Atla" ile geçilen bir tur:
- **Parkur fazında:** `challengeTick()`'i de tetiklemiyor mu? Kontrol
  edildi — `challengeTick(wasCorrect, gainedXp)` (`www/js/app.js:5693`)
  SADECE `submit*Guess` fonksiyonlarının İÇİNDEN çağrılıyor (`handleExamOutcome`'un
  YANINDA, aynı submit akışında) — `goToNextRound()`'un kendisi bunu da
  çağırmıyor. Yani "Atla" `challenge.done`'ı da artırmıyor — BÖLÜM ilerlemesi
  de "Atla" ile İLERLEMİYOR (telafi ile TUTARLI, aynı mekanizma eksikliği).
- **Telafi fazında:** aynı sebepten `remedialIndex` artmıyor (önceki
  OLCUM-15-08.md raporunda ayrıntılı).
**Sonuç: bu mod/faz-spesifik değil, "Atla" HİÇBİR ilerleme sayacını
(parkur/challenge, sınav, telafi) artırmıyor — genel bir tasarım deseni.**
Kasıtlı mı ("Atla" bilerek "bu soru hiç sorulmamış gibi" davranıyor) yoksa
gözden kaçmış mı — koddan çıkarılamaz, BELİRSİZ, ürün kararı gerekir. GORSEL-TEST.md'nin
#54 satırındaki "Düşük Güç Modu tetikleyici mi" sorusu da BELİRSİZ — kod,
Düşük Güç Modu'na hiç bakmıyor (`requestAnimationFrame` yavaşlaması ayrı
bir mekanizma, `recordAnswer` çağrılmama sebebiyle ilgisi YOK) — GORSEL-TEST'in
kendi senaryosu ("defalarca Atla → rastgele bas") muhtemelen "Atla" tekrarının
KENDİSİ, Düşük Güç Modu tesadüfen aynı anda test edilmiş olabilir.

---

# B) GÖZDEN KAÇAN VAR MI

## B1 — GORSEL-TEST.md'de KAPANDI yazan ama commit'i bulunamayan madde

**Yok.** İki hash-referanslı madde (#1/#2 → `581f798`, #5/#6/#7 → `a4efb42`)
git log'da doğrulandı, başlıkları eşleşiyor. "KAPANDI"/"HATA DEĞİL" etiketli
diğer maddeler (A4/A5/B2/#8/#11/#16/#43) zaten FIX gerektirmeyen
GÖZLEMLERdi (bir şey zaten doğru çalışıyordu, yeni bir commit'e ihtiyaç
yoktu) — kontrol edilenler (#11'in `isChallenge()`/`challenge.active`
ayrımı) koda uyuyor.

## B2 — G170-G212 arasında commit var ama belgeye işlenmemiş (ters yön)

**DÜZELTME (16 Ağustos'ta fark edildi, bu satır YANLIŞTI):** ilk taramada
SADECE tam `^G186a —` gibi harf-sonekli başlıkları arayan bir grep
kullanılmıştı — bu YANLIŞ POZİTİF üretti. Gerçekte G186a/G186b/G186c'nin
ÜÇÜ de `^G186 —` başlıklı TEK bir girişin (satır ~1778) İÇİNDE "GRUP
A/B/C" olarak, G188a/G188b'nin İKİSİ de `^G188 —` başlıklı TEK bir girişin
(satır ~1652) İÇİNDE "COMMIT 1/2" olarak — commit hash'i, ölçüm, dokunulan/
dokunulmayan dosya listesi ve npm test sonucu DAHİL, TAM olarak
belgelenmiş. Gerçek eksiklik YOKTU. (G170/G210/G211 zaten belge/idari işler
olduğu için ayrı bir sorun değildi, o kısım doğruydu.)

**Sonuç: B2 sorusunun cevabı HAYIR — G170-G212 arasında commit atılıp
DURUM.md'ye hiç işlenmemiş bir düzeltme YOK.**

## B3 — IDLE vs ROUND kalıbının dördüncü örneği

`enterMode()`'un (`www/js/app.js:2443-2581`) mod-değişimi bloğunun
sıfırladığı TAM liste (koddan çıkarıldı): `audioEngine`/ses, `roundFlow`
(zamanlayıcı DURUR ama `timeLeft`/`roundDuration` KORUNUR — bilerek),
`freqTapTimer`, `activeQuestion`, `storage`'daki yarım-tur kaydı,
`roundActive`, `autoStopped`, kaynak menüsü + çip etiketi, odak çipi,
cevap biçimi görünürlüğü, çakışma görünürlüğü, analizör class'ları
(compact/no-foot/bare/bare-idle/hidden), `.controls-m2`, `examSystem.setMode()`,
soru başlığı/meta, spotlight turu, `#freqInfo`/`#answers`/`#freqGuessArea`,
play/pause ikonu, A/B toggle UI, `challenge = freshChallenge()`, süre
göstergesi (`updateTimerUI(0,0)`), ve son olarak `updateUI()` (kendi İÇİNDE
`renderGameHeader()`'ı da çağırıyor — bu yüzden BÖLÜM/sınav/combo
göstergeleri de bu tek çağrıyla tazeleniyor, AYRI bir çağrıya gerek yok).

**Dördüncü bir örnek arandı, kesin bir tane BULUNAMADI:**
- `stats.combo` (seri sayacı) `enterMode()`'da sıfırlanmıyor — AMA bu bir
  hata değil, KASITLI: `stats.combo` her `submit*Guess`'te ARTIYOR/sıfırlanıyor
  (12 modun hepsinde aynı desen), XP/Level gibi MOD-BAĞIMSIZ/GLOBAL bir
  seri — mod değiştirince sıfırlanMAMASI, Level/XP'nin sıfırlanmamasıyla
  AYNI kategoride, tutarlı bir tasarım. Bug değil.
- `renderGameHeader()`'ın `enterMode()` → `updateUI()` zincirinden
  ÇAĞRILDIĞI doğrulandı (`www/js/app.js:3132`, `updateUI()`'nin son
  satırı) — BÖLÜM/sınav dot'ları için ayrı bir "güncellenmiyor" boşluğu
  YOK, bu ihtimal ELENDİ.
**Sonuç:** Bug 2/6/7/17/19'un HEPSİ artık kapalı; bu turda taranan ek
state'lerde (combo, header render zinciri) yeni bir örnek çıkmadı. Kalan
olası alanlar (mod dosyalarının kendi iç değişkenleri, ör. her modun
kendi `xGuess` state'i) `activeQuestion=null` sıfırlamasının ARKASINDAN
zaten okunmaz hale geliyor (bir sonraki `createQuestion()` üzerine yazıyor)
— yapısal olarak risksiz, TEK TEK doğrulanmadı (kapsam çok geniş, BELİRSİZ
bırakılıyor).

## B4 — CSS özgüllük çakışması (G197 kalıbı) başka yerde var mı

**BELİRSİZ — tam bir tarama yapılamadı, ama BİLİNEN iki örnek (G197'nin
kendisi + #15/#18'in G183/G184'teki `.abside`/`#abToggle.game-ctrl-ab`
özgüllük yükseltmesi) zaten kapalı.** Tüm `styles.css`'i her olası
selector-çakışması için sistematik taramak (binlerce kural, ikili
kombinasyon) kaynak-okuma ile pratik değil — bu bir statik CSS analiz
aracı gerektirir, burada yok. Bu turda rastlanan YENİ bir özgüllük
çakışması olmadı ama YOK diye de garanti edilemez.

## B5 — Paylaşılan manager çakışması (G201/G204/G205 kalıbı) — Araçlar'ın oynatıcıları izole mi

**YAPISAL OLARAK DOĞRULANDI — 5 ayrı `createUploadManager()` örneği var,
hiçbiri paylaşılmıyor:**

| Manager | Kullanan | 
|---|---|
| `uploadManager` (`app.js:797`) | Oyun modları (paylaşılan, "tools" bağlamı da BUNU kullanıyor — Ölçüm Sonuçları analizi) |
| `uploadManagerA`/`uploadManagerB` (`:931-932`) | Frekans Çakışması'nın kendi çift-slot'u |
| `tonalRefUploadManager` (`:10572`) | Tonal Balance "Kendi Referansım" |
| `toolsRefFilterUploadManager` (`:11791`) | Referans Filtreleri |
| `toolsRawMixUploadManager` (`:12256`) | Mixini Yükle |

`toolsRefFilterUploadManager` ↔ `toolsRawMixUploadManager` ayrımı G159/G182'de
kuruldu, G201/G204/G205 SADECE `toolsRawMixUploadManager` tarafını
değiştirdi (kendi commit'lerinin "Dokunulmayan" notlarında doğrulanabilir).
**Kalan boşluk:** bu 5 manager'ı AYNI ANDA canlı çaldırıp (4'ü birden)
çapraz-etkileşim test eden bir Playwright turu bu denetimde YAPILMADI —
yapısal ayrım kesin ama EŞ ZAMANLI 4-oynatıcı senaryosu CİHAZDA/Playwright'ta
ayrıca doğrulanmalı.

## B6 — DURUM.md'de yanlış/eskimiş kayıt

**Bilinen:** DURUM.md:99 "G206↔'#54/#55'" — G206 SADECE #55'i kapsıyor
(önceki OLCUM-15-08.md'de detaylandırıldı).

**Bu turda YENİ bulunan:** DURUM.md'nin kendisinde YANLIŞ bir iddiaya
rastlanmadı (BİTTİ girişlerinin hepsi kendi ölçümleriyle, kendi
regresyon-kontrolleriyle tutarlıydı) — asıl sorun **eksiklik** (B2'deki 5
commit) ve **DIŞ belgelerin (GORSEL-TEST.md) DURUM.md'nin gerisinde
kalması** (Liste 2'ye bkz.), DURUM.md'nin kendi İÇİNDE yanlış bir cümle
değil.

---

# C) YAYIN ÖNCESİ KONTROL

| Madde | Durum |
|---|---|
| **AD_TEST_MODE** | `true` (`www/js/core/ads.js:19`) — TAM-LISTE-14-08.md'nin kendi "yayın anında yapılacak" listesindeki #10 ile TUTARLI (henüz yapılmamış, zaten öyle işaretli), STALE bir kayıt DEĞİL |
| **Build numarası** | `CURRENT_PROJECT_VERSION=1`, `MARKETING_VERSION=1.0` (`ios/App/App.xcodeproj/project.pbxproj`) — TAM-LISTE'nin "şu an 1.0/1" kaydıyla EŞLEŞİYOR, artırılmamış |
| **npm test** | **1315/1315** geçiyor |
| **Ölü kod / TODO-FIXME** | 1 TODO (`www/js/core/difficulty-curve.js:42`, kendi yorumunda "bilerek bırakıldı" diyen belgeli bir placeholder — kritik değil). G195'te (`5bf473d`) bilinen bir ölü dosya zaten temizlenmiş. Kapsamlı bir ölü-kod/kullanılmayan-import taraması statik analiz aracı gerektirir (ESLint/ts-prune benzeri), bu ortamda YOK — TAM bir "hiç yok" garantisi VERİLEMEZ, BELİRSİZ |
| **console.log** | 43 çağrı (düzeltildi — ilk sayım 44'tü, biri yorum satırıydı), HEPSİ etiketli tanı logları (`[audio-diag]`×20, `[filepicker-diag]`×10, `[upload-diag]`×4, `[upload-context]`×3, `[guide-i-diag]`×3, `[scroll-diag]`×1, `[filepicker]`×1, `[analiz]`×1) — bu oturum boyunca BİLEREK eklenen cihaz-tanı altyapısı, kazara unutulmuş "console.log(x)" cinsi çöp DEĞİL. **Ürün kararı gerekiyor:** yayın build'inde bırakılsın mı (TestFlight sonrası hata ayıklamaya yarar) yoksa temizlensin mi — koddan çıkarılamaz |

---

# SONUÇ — ÜÇ LİSTE

## 1. Gerçekten açık olanlar (öncelik sırasıyla)

~~1. #54 — "Atla" hiçbir ilerleme sayacını artırmıyor~~ — **G214'te
   kapatıldı** (kullanıcı kararı: "Atla" yanlış cevap sayılıyor artık, üç
   sayaç da ilerliyor, telafi kilitlenmesi Playwright'ta bir daha
   üretilemedi — bkz. DURUM.md).
1. **#24 — Bölüm çubuğu idle görünürlüğü, Playwright-vs-cihaz çelişkisi
   açıklanmamış.** Kod kapalı (G176/G179) ama cihaz raporu hiç takip
   edilmemiş — güncel build'de yeniden test edilmeli.
2. **AD_TEST_MODE=true / build=1.0(1)** — kod DEĞİL ama yayın öncesi
   kesin yapılacaklar listesinde, hâlâ tamamlanmamış (TAM-LISTE'nin
   kendi bilgisiyle tutarlı, yeni değil).
3. **43 tanı `console.log`'u** (ilk raporda 44 denmişti — biri, `app.js:6033`,
   gerçek bir çağrı değil, "console.log" geçen bir YORUM satırıydı, sayım
   düzeltildi) — ürün kararı bekliyor (bırak/temizle).

## 2. Belge ile kod arasında uyuşmayan kayıtlar

1. **GORSEL-TEST.md #15/#18/#9** — "⏸️ ölçüm bekliyor" yazıyor, kod G183/G184'te
   KAPANMIŞ ve doğrulanmış.
2. **GORSEL-TEST.md #30/#31** — "⏸️ ölçüm bekliyor" yazıyor, kod G186b'de
   (`b368f51`) KAPANMIŞ.
3. **GORSEL-TEST.md #36** ("Bugünün Önerisi Pro'ya taşınsın") — "🔧
   düzeltilecek" yazıyor, kod G188a'da (`4d0a50d`) ZATEN yapılmış.
4. **DURUM.md:99** — "G206↔#54/#55" eşleştirmesi yanlış, G206 sadece
   #55'i kapsıyor (önceki turda bulundu, tekrar doğrulandı).

## 3. Hiç belgelenmemiş bulgular

~~1. 5 commit'in DURUM.md'de BİTTİ girişi yok~~ — **YANLIŞ ÇIKTI, bkz. B2'nin
   düzeltmesi yukarıda.** Beşi de zaten `^G186 —`/`^G188 —` wrapper
   başlıkları altında tam belgeliydi, grep hatası yüzünden kaçırılmıştı.

1. **#4 (analizör işlenmiş sinyal) aslında koddan KESİN çözülebilirmiş** —
   GORSEL-TEST.md "Safari Web Inspector gerekiyor" diyordu, gerekmiyormuş
   (G83'ün kendi yorumu yeterli kanıt).
2. **"Atla" hem challenge.done'ı hem examSystem sayaçlarını atlıyor** —
   GORSEL-TEST.md'nin #54 kaydı SADECE telafiyi soruyordu, aslında sorun
   parkur (BÖLÜM) fazında da AYNI ölçüde geçerliydi — kapsamı önceki
   raporlardan daha geniş çıktı. **(G214'te kapatıldı, bkz. DURUM.md.)**

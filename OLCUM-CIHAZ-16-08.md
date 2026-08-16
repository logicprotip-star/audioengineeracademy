# OLCUM-CIHAZ-16-08 — Cihaz Testi (10 bulgu) + Ajan Denetimi (4 bulgu): Ölçüm

_Kapsam: **SADECE ÖLÇÜM — KOD YAZILMADI, DOSYA DEĞİŞTİRİLMEDİ, COMMIT ATILMADI**
(`git status` bu turun sonunda TEMİZ, tek yeni dosya bu raporun kendisi).
Kod okuması (`app.js`/`core/audio-engine.js`/`core/source-catalog.js`/mod
dosyaları/`styles.css`/`index.html`/`guide-texts.js`) + `git log`/`git show`
ile commit kökeni + gerçek Playwright koşuları (DOM/CSS/geometri/ses zinciri
yeniden-üretimi, gerçek `OfflineAudioContext` ile GERÇEK -6dBFS ses
dosyalarından RMS/peak ölçümü) + `ffmpeg`/`ffprobe` ile gerçek dosya ölçümü
kullanıldı. Ölçüm scriptleri repoya dahil edilmedi (proje kökünde geçici
`scratch_*.mjs`/`.png` olarak çalıştırılıp SİLİNDİ, kalan tek ekran görüntüsü
`scratchpad/`'te). Zaten var olan `OLCUM-CALMA-SURESI-16-08.md`/
`OLCUM-DISTORTION-16-08.md`/`OLCUM-FILTRELER-16-08.md`/`OLCUM-BAYRAK-16-08.md`
ile çakışan noktalarda o raporlar KAYNAK gösterildi, tekrar ölçülmedi —
SADECE bu turda YENİ ölçülen (özellikle: gerçek ses RMS/peak karşılaştırması,
onset zamanlama analizi, DOM clipping/görünürlük testi, canlı feedback-paneli
tekrar-üretimi) ayrıntılı anlatıldı._

**Bağımsız denetim raporu:** `AJAN-DENETIM-16-08.md` (henüz commit'lenmemiş,
bu turdan ÖNCE üretilmiş) — I) bölümündeki 2 bulgu bu turda BAĞIMSIZ olarak
yeniden doğrulandı (aynı iddiaya güvenilmedi, kendi grep/diff'i tekrar
çalıştırıldı).

---

## ÖNCE — EN KRİTİK İKİ MADDE

### A) Kulak butonları hiçbir yerde yok 🔴 REGRESYON

**Kök sebep — İKİ AYRI, BİRBİRİNİ MASKELEYEN sorun:**

**A.1 — CSS clipping (asıl regresyon, G254-257'den ÖNCE var):**
`styles.css:1414`'teki `.fb{ ... max-height:29vh; overflow:hidden; ... }`
(G193, commit `21814c3`, 2026-08-14 — "Kesim Noktası geri bildirim paneli
eğrileri örtüyordu" fix'i) `.fb-ear` butonlarını (`styles.css:1549`:
`.fb-ear{position:absolute;top:0;transform:translateY(-100%); ...}` — G91'den
beri panelin ÜST kenarının TAMAMEN DIŞINDA, "kulak" gibi duracak şekilde
konumlanıyor) kırpıyor. Playwright'ta GERÇEK ölçüm: buton `getBoundingClientRect()`
`top:560.25/bottom:600.25`, `.fb`'nin kendisi `top:599.25`'ten başlıyor —
yani buton neredeyse TAMAMEN `.fb`'nin clip kutusunun DIŞINDA. Computed style
`display:flex; visibility:visible; opacity:1` (DOM/CSS "görünür" diyor) ama
`document.elementFromPoint(butonun kendi merkez koordinatı)` **`#feedbackOverlay`**
döndürüyor, butonun KENDİSİNİ DEĞİL — yani buton fiilen hiç boyanmıyor/gerçek
bir dokunuş ona ULAŞAMIYOR. **G81 (`9a075bd`, kulak butonlarının İLK eklendiği
commit) G193'ten (2026-08-14) ÖNCE** — yani bu, Frekans Bulma'nın ORİJİNAL
kulak butonu için bile G193'ten BERİ (3 gün) var olan bir regresyon,
G254-257'nin İCAT ETTİĞİ bir şey DEĞİL.

**A.2 — Test yalancı yeşil (regresyonu MASKELEDİ):** `e2e/ear-buttons.spec.mjs`
(G254, YENİ dosya) SADECE `classList.contains("hidden")===false` kontrol
ediyor (`ears.leftHidden`/`rightHidden`), gerçek görünürlük/hit-test YOK.
Daha da önemlisi, `clickBothEars()` (satır 101-121) **kendi yorumunda AÇIKÇA
İTİRAF ediyor**: *"DOM'daki .click() — koordinat tabanlı Playwright tıklaması
(force:true dahil) omuz butonlarının panelin üst kenarında olması yüzünden
BAZEN #feedbackOverlay'i VURUYORDU, buton KENDİSİNİ değil (ölçüldü — .on hiç
eklenmiyordu)."* — yani test YAZARI TAM OLARAK bu turun bulduğu clipping
semptomunu (koordinat tıklaması overlay'e denk geliyor) canlı olarak
GÖZLEMLEMİŞ, ama kök sebebi araştırmak yerine `element.click()` (DOM API,
gerçek hit-test'i BAYPAS EDEN bir sentetik click dispatch'i) ile "etrafından
dolaşmış." Sonuç: G254-257'nin 8 testi de YEŞİL geçiyor ama HİÇBİRİ gerçek
bir kullanıcı dokunuşunu simüle etmiyor — cihazdaki "hiçbir yerde yok"
şikâyeti test SÜİTİNDEN hiç yakalanamazdı, bu turda BAĞIMSIZ bir Playwright
script'iyle (gerçek `elementFromPoint` hit-test'i) YENİDEN üretildi.

**A.3 — Q Genişliği neden dışlandı:** `q-genisligi.js`'in `submitQWidthGuess`
karşılığı `app.js:4682`'deki `submitQWidthGuess()` — diğer 6 modun
(`submitCutoffGuess`/`submitLevelGuess`/`submitPanGuess`/`submitWidthGuess`/
`submitBoostCutGuess`/Frekans Çakışması) HER BİRİNİN kendi `show*Ears()`
çağrısı VAR, `submitQWidthGuess`'te YOK. `git log -p` ile G254-257'nin hiçbir
commit mesajında "Q Genişliği" adı bile geçmiyor — dışlama kasıtlı bir karar
mı yoksa unutma mı, hiçbir kanıt yok (AJAN-DENETIM-16-08.md madde D.3 ile
BAĞIMSIZ tutarlı).

**Dosya:satır:** `www/styles.css:1414` (`.fb` overflow:hidden), `www/styles.css:1549`
(`.fb-ear` transform), `e2e/ear-buttons.spec.mjs:107-121` (yalancı yeşil),
`www/js/app.js:4682` (Q Genişliği'nin eksik çağrısı).
**Commit kökeni:** A.1 → G193 (`21814c3`, 2026-08-14), G254-257 DEĞİL.
A.2 → G254 (`532be3b`) test dosyasının İLK sürümü.
**Düzeltme yolu:**
1. CSS: `.fb`'nin `overflow:hidden`'ı SADECE kaydırılan iç içerik
   (`#feedbackDetail`/`.fb p`, G193'ün asıl amacı) için uygulanmalı, `.fb-ear`
   butonları panelin `overflow` kutusunun DIŞINDA bir öğeye (ör. ayrı bir
   wrapper, ya da `#feedbackOverlay`'in çocuğu) taşınmalı — tıklama
   delegasyonunun hedefi de (`app.js:6789`, şu an `els.feedbackBox`'a bağlı)
   buna göre güncellenmeli. **Orta iş yükü** — G193'ün orijinal
   (eğri-örtüşme) düzeltmesini BOZMAMAK için dikkatli regresyon testi gerekir.
2. Test: `clickBothEars()` gerçek, görünürlüğe duyarlı bir tıklama/hit-test
   doğrulamasına geçmeli (ör. `elementFromPoint` assert'i ya da Playwright'ın
   GERÇEK koordinat click'i, `force`/DOM-`.click()` OLMADAN). **Küçük iş yükü.**
3. Q Genişliği: ürün kararı gerekiyor (BEKLEYEN KARAR).
**Risk:** 🔴 **YÜKSEK** — şu an TÜM 12 modda (Frekans Bulma dahil) kulak
butonu özelliği cihazda ÇALIŞMIYOR, 3 gündür (G193'ten beri) sessizce kırık,
G254-257'nin TÜM test güvencesi bu yüzden geçersiz.

---

### C) Saturation & Distortion sesi Kompresör'den belirgin yüksek 🔴 İŞİTME GÜVENLİĞİ

**Kök sebep:** `distortion.js:343-350`'deki `applyProcessing()` TEK bir
`WaveShaperNode` kuruyor (`shaper.curve = buildDistortionCurve(...)`,
`oversample:"4x"`), **hiçbir çıkış kazancı telafisi YOK**. `clip`/`soft`
eğrileri (`distortion.js:142-158`) `x*drive`'ı `[-1,1]`'e kırpıyor/tanh'lıyor
— `drive` clip için 2.2-15, soft için 1.1-8 arası (`DRIVE_RANGES`,
`distortion.js:115-120`, `OLCUM-DISTORTION-16-08.md`'de formül düzeyinde
zaten belgeli) — yüksek drive'da dalga biçiminin BÜYÜK kısmı tam ölçeğe
("brick-wall") itilip kırpılıyor, bu RMS enerjisini KÖKLÜ biçimde artırıyor
(klasik "loudness maximizer" etkisi). `core/audio-engine.js:794`'teki
`matchLoudness` telafi mekanizması (G242/G244) SADECE `BiquadFilterNode`
tabanlı EQ zincirleri için çalışıyor (`f.frequency.value` okuyor, RBJ
formülüyle) — `WaveShaperNode`'un `frequency` alanı YOK, bu yüzden Distortion
`matchLoudness:true` verse bile mekanizma mimarî olarak devre dışı kalırdı
(zaten VERMİYOR de). Tek koruma `core/audio-engine.js:776-779`'daki HER
zincire ortak, paylaşılan güvenlik `compressor` (threshold -16dB, knee 22,
**ratio SADECE 2.2:1**) — bu oran, WaveShaper'ın ürettiği +10dB'lik sıçramayı
telafi etmeye YETMİYOR.

**Ölçüm (GERÇEK -6dBFS `groove.m4a`, tam gerçek ses zinciri — kaynak → mod
filtresi → paylaşılan güvenlik compressor'ı → `out`(0.8) → `masterGain`(0.82)
— Playwright'ta `OfflineAudioContext` ile render edilip RMS/peak ölçüldü):**

| Senaryo | RMS (dBFS) | Peak (dBFS) |
|---|---|---|
| Kuru kaynak (zincirsiz) | -25.1 | -6.0 |
| Kuru, SADECE paylaşılan güvenlik compressor'ından geçmiş (referans) | -27.9 | -9.4 |
| **Kompresör, k=0.5 (DIST_BASE_K'nin KARŞILIĞI — HER round'da A/B/C'nin İKİSİ bu k'de)** | **-25.0** | **-9.5** |
| Kompresör, k=0 (en az sıkışmış) | -27.3 | -8.8 |
| Kompresör, k=1 (en çok sıkışmış) | -26.0 | -12.6 |
| **Distortion `clip` (Kolay zorluk), k=0.5 (drive 8.6)** | **-15.3** | **-4.2** |
| Distortion `clip`, k=0 (drive 2.2) | -22.0 | -4.2 |
| Distortion `clip`, k=1 (drive 15) | -13.6 | -4.0 |
| **Distortion `soft` (Orta zorluk), k=0.5 (drive 4.55)** | **-18.6** | **-4.5** |
| Distortion `tube` (Zor), k=0.5 | -25.3 | -7.2 |
| Distortion `tape` (Pro/Pro Plus), k=0.5 | -27.9 | -9.6 |

**Yorum:** `DIST_BASE_K=0.5` A/B/C'nin İKİ "aynı" kartı için SABİT — yani
YUKARIDAKİ k=0.5 satırları "gerçek, her round'da duyulan" değerler
(uç/nadir bir durum DEĞİL). **Kolay zorlukta (clip) kullanıcı Kompresör'e
kıyasla ~9.7dB daha yüksek RMS (≈2× algılanan yükseklik) ve ~5.3dB daha
sıcak peak duyuyor — bu TAM OLARAK ilk açtığı, en kolay zorluk.** Orta
zorlukta (soft) fark ~6.4dB RMS. Zor (tube) ve Pro/Pro Plus (tape) türleri
neredeyse Kompresör'le aynı seviyede — sorun SADECE clip/soft'ta, yani
tam olarak yeni kullanıcının İLK karşılaştığı iki kademede. **Hiçbir
senaryoda dijital 0dBFS aşımı/gerçek kırpma YOK** (en kötü peak -3.96dB) —
bu bir ses KALİTESİ hatası değil, saf bir ALGISAL YÜKSEKLİK/işitme-güvenliği
UX sorunu (Logic'in "Apple işitme sağlığı" çerçevesiyle BİREBİR örtüşüyor).

**Dosya:satır:** `www/js/modes/distortion.js:343-350` (applyProcessing,
telafi yok), `distortion.js:115-120` (DRIVE_RANGES), `www/js/core/audio-engine.js:776-779`
(paylaşılan compressor, yetersiz oran), `audio-engine.js:794-801`
(matchLoudness, mimari olarak WaveShaper'ı kapsamıyor).
**Commit kökeni:** `applyProcessing` G86 civarı (Distortion'ın ilk
eklenmesi) — bu turda hiç değişmedi, yeni bir regresyon DEĞİL, baştan beri
var olan bir tasarım boşluğu (kaynak kütüphanesinin -3dBFS'ten G260'ta
-6dBFS'e çekilmesi bile bunu ETKİLEMEDİ — WaveShaper GİRDİ seviyesinden
BAĞIMSIZ olarak drive ile ölçekliyor).
**Düzeltme yolu:** distortion.js'e (ör. `buildDistortionCurve`'ün
YANINDA) SAF bir çıkış-kazancı telafi fonksiyonu eklenmeli — eğrinin
temsili bir girdi üzerindeki RMS/peak artışını hesaplayıp ters bir
`GainNode` ile dengelemeli (EQ-özel `matchLoudness`'tan BAĞIMSIZ, WaveShaper'a
özel yeni bir mekanizma gerekir, `audio-engine.js:892-899`'daki "filtrelerden
SONRA localWetGain'DEN ÖNCE" ekleme noktası AYNEN kullanılabilir). Hedef
seviye (Kompresör'e mi, sabit bir referansa mı eşitlensin) ürün kararı
gerektirir. **Orta iş yükü** (DSP + 4 tip × zorluk aralığında yeniden
ölçüm/kalibrasyon).
**Risk:** 🔴 **YÜKSEK (işitme-güvenliği/UX)** — dijital güvenlik ihlali
YOK ama algısal sıçrama gerçek ve büyük, en kolay zorlukta en belirgin.

---

## DİĞER BULGULAR

### B) Pan Konumu'nda sadece davul döngüsü 🟡 KISMEN BEKLENEN, KISMEN EKSİK

**Ölçüm:** `pan-konumu.js:145`'in `only` listesi: `["pink","white","saw",
"square","triangle","groove","bass","guitar","vocal","upload"]`.

- **Kick/snare/hihat/tom'un YOKLUĞU KASITLI VE BELGELİ** (`pan-konumu.js:133-142`,
  yorum: *"Tek vuruşluk çok kısa kaynaklar (kick/snare/hihat/tom) konum
  algısı için YETERSİZ... G43'ün AYNI gerekçesi"* — Reverb'in transient
  kısıtıyla AYNI aile). **Bu bir REGRESYON DEĞİL**, bass_alt'ın G259'da
  kaldırılmasıyla da İLGİSİZ (o commit SADECE `bass_alt` girdisini
  çıkardığını, "başka HİÇBİR alan/karar değişmedi" diyor, doğrulandı).
- **`clean_guitar`'ın (G259'da eklenen YENİ kaynak) YOKLUĞU muhtemelen
  UNUTULMUŞ:** `bass`/`guitar`/`vocal` listede varken, yapısal olarak
  `guitar`'ın (Akustik Gitar) birebir eşi olan `clean_guitar` (Temiz Gitar)
  YOK. G259'un commit mesajı `stereo-genislik.js`'in listesini AÇIKÇA
  güncellediğini söylüyor ama pan-konumu.js/reverb.js için "başka hiçbir
  şey değişmedi" diyor — yani bu iki `only` listesi YENİ mono kaynak
  eklenirken hiç GÖZDEN GEÇİRİLMEMİŞ. **Aynı eksiklik `reverb.js:257`'de
  de var** (`only:["guitar","vocal","snare","groove","upload"]` — orada da
  `clean_guitar` yok).

**Dosya:satır:** `www/js/modes/pan-konumu.js:145`, `www/js/modes/reverb.js:257`.
**Commit kökeni:** G259 (`27073c7`) — yeni kaynağı eklerken bu 2 dosyanın
`only` listesi güncellenmemiş (olumsuz/es geçme, aktif bir hata satırı
değil).
**Düzeltme yolu:** `"clean_guitar"`'ı her iki `only` dizisine eklemek —
**önemsiz iş yükü** (2 satır + ilgili e2e/unit testlerin gözden geçirilmesi).
Kick/snare/hihat/tom'un pan-konumu.js'te KALICI olarak dışlı kalması ürün
kararı olarak ONAYLI, dokunulmamalı.
**Risk:** Düşük — eksiklik/tamlık sorunu, hatalı davranış değil.

---

### D) Bayat geri bildirim — mod değiştirince eski panel ekranda kalıyor 🔴 REGRESYON

**Kök sebep:** `enterMode()` (`app.js:2619-2757`) mod değişiminde ÇOK sayıda
UI durumunu sıfırlıyor (`#freqInfo`, `#answers`, `#freqGuessArea`,
`#questionTitle`/`#questionMeta`, zamanlayıcı, `challenge`, spotlight,
`#cakismaCompare` — `syncCakismaVisibility()` üzerinden) **ama `#feedbackBox`/
`#feedbackOverlay`'in `show-result`/`open`/`bad` class'larına HİÇ
dokunmuyor.** Bu class'lar SADECE `pauseRound()`'da temizleniyor
(`app.js:5595-5596`, kendi yorumuyla "#53 — TEK kontrol noktası") — ama
`enterMode()` `pauseRound()`'u ÇAĞIRMIYOR, doğrudan `audioEngine.stopAudio()`/
`roundFlow.stopAll()` kullanıyor (`app.js:2629-2630`). `#feedbackBox`/
`#feedbackOverlay` DOM'da `#screen-game`'in İÇİNDE (`index.html:599-600`,
`#screen-game` `181`'de açılıyor, bu ikisi ARADA, `#screen-progress`
`825`'te başlıyor) — `.screen{display:none}` (`styles.css:318`) sayesinde
ekran DEĞİLKEN görünmez KALIYOR ama class'lar canlı kalıyor; kullanıcı
`#screen-game`'e (HANGİ moddan girerse girsin) geri döner dönmez panel
ANINDA yeniden görünür oluyor — ÇÜNKÜ hiç kapatılmamış.

**Canlı tekrar üretim (Playwright, gerçek DOM/CSS, ekran görüntüsü alındı):**
1. `boost-mu-cut-mu` modunda YANLIŞ cevap verildi → `#feedbackBox`
   `fbTitle:"Ters yöne gittin"`, `show-result:true`, `bad:true`.
2. `dev.simulatePro:true` ile paywall/can-bitti engelini es geçip DOĞRUDAN
   `db-seviyesi` moduna girildi (`enterMode()`'un GERÇEK kod yoluyla,
   `.mode-card` click'i).
3. Sonuç: `activeScreen:"screen-game"`, `gameTitle:"dB Seviyesi"` (YENİ
   modda) AMA `fbShowResult:true`, `fbTitle:"Ters yöne gittin"` (ESKİ
   `boost-mu-cut-mu` metni) — dB Seviyesi'nin TEMİZ, henüz Play'e
   basılmamış ekranının ÜSTÜNDE, ekran görüntüsüyle DOĞRULANDI (`scratchpad/
   olcum-cihaz-D-feedback-bleed.png`).

**Aynı kalıp başka nerede var mı (task'ın istediği tarama):** `enterMode()`
BAŞTAN SONA okunup `syncCakismaVisibility()` ile çapraz kontrol edildi —
`#freqInfo`/`#answers`/`#freqGuessArea`/başlık-meta/zamanlayıcı/`challenge`/
`#cakismaCompare`/spotlight/analyzer class'larının HEPSİ doğru şekilde
sıfırlanıyor. **`#feedbackBox`/`#feedbackOverlay` TESPİT EDİLEN TEK
istisna.** Canvas'a çizilen PİKSEL kalıntısı (CSS class'lardan AYRI,
`drawOverlay()`'lerin `!activeQuestion` erken-dönüşü nedeniyle temizlenmemiş
olabilecek eski çizimler) bu turda AYRICA KONTROL EDİLMEDİ — BELİRSİZ,
kapsam dışı bırakıldı.

**Dosya:satır:** `www/js/app.js:2619-2757` (enterMode, eksik satır),
`www/js/app.js:5595-5596` (pauseRound'un doğru örneği), `www/index.html:599-600`
(#feedbackBox/#feedbackOverlay konumu).
**Commit kökeni:** `enterMode()`'un kendisi çok eski (G-serisinin başından) —
G174/G175/G80'in AYNI "updateUI() çağrılıyor ama ALTINDAKİ VERİ
sıfırlanmıyor" ailesinden, ama feedbackBox bu ailenin HİÇBİR turunda
yakalanmamış; yeni bir regresyon değil, UZUN SÜREDİR var olan, cihazda
YENİ fark edilen bir açık.
**Düzeltme yolu:** `enterMode()`'un mevcut sıfırlama bloğuna (`app.js:2719`
civarı, `#freqInfo`/`#answers` satırlarının yanına) şu satırlar eklenmeli:
`els.feedbackBox.classList.remove("show-result","bad"); if(els.feedbackOverlay)
els.feedbackOverlay.classList.remove("open");`. **Önemsiz iş yükü**
(2-3 satır + regresyon testi).
**Risk:** 🔴 Yüksek görünürlük/kafa karıştırıcılık (yanlış modun yanlış-cevap
açıklaması başka bir modun üstünde görünüyor) ama YIKICI değil.

---

### E) Döngü topallıyor + F) Kompresörde takılma — AYNI KÖK SEBEP 🔴

**Bu turun ana bulgusu:** E ve F, task'ın kendi ayrı numaralandırmasına
rağmen **BİREBİR AYNI mekanizmanın** iki farklı moddaki yansıması —
ayrı ayrı ölçülüp bu sonuca ulaşıldı, tahmin edilmedi.

**Mekanizma:** `abLoopTimer = setInterval(toggleAB, 2000)` (`app.js:1011`,
`5447-5448`) her 2 saniyede bir `cycleThreeWayPreview()`'ı (`app.js:5350-5362`)
çağırıyor, o da `audioEngine.buildQuestionChain({...q, previewLetter:
next.letter}, true, q.source, uploadManager, mode.applyProcessing)` —
**6. parametre (offset) HİÇ verilmiyor**, `buildQuestionChain`'in
varsayılanı (`core/audio-engine.js:749`) `previewOffsetSec=0`. Bu da
`buildSampleSource(path, offsetSec=0)`'a (`audio-engine.js:700-708`) gidip
`src.start(0, 0)` çağırıyor — **her A/B/C geçişinde örnek dosyanın
BAŞLANGICINDAN (0.0sn) başlaması, KASITLI bir tasarım kararı**
(`app.js:5356-5359`'un kendi yorumu: *"döngü HER ZAMAN sıradaki harfi
SIFIRDAN çalar... task'ın kendi kararı, 'döngü modu davranışı
DEĞİŞMESİN'"*). Bu davranış **`OLCUM-CALMA-SURESI-16-08.md`'de (bu G259
öncesi, dosyalar hâlâ 5.33sn iken) ÖNCEDEN TESPİT EDİLİP RİSK OLARAK
İŞARETLENMİŞTİ**: *"TEK somut risk: Motor 2'nin A/B/C önizlemesi HER
basışta baştan başlıyor... 12-25sn'lik bir dosyada kullanıcı HER seferinde
dosyanın başındaki birkaç saniyeyi duyacak... kısa dosyalarda bu sorun
YOKTU, fark az hissediliyordu."* — **bu turun cihaz bulgusu, o raporun
önceden tahmin ettiği riskin GERÇEKLEŞTİĞİNİN doğrulanmasıdır.**

**Bu turda YENİ ölçülen/dışlanan alternatif sebepler:**
- **Ölü süre/gecikme:** Buffer'lar `sampleBufferCache`'te (`audio-engine.js:667-693`)
  ÖNBELLEKLİ — her switch'te YENİDEN network/decode YOK (`OLCUM-CALMA-SURESI-16-08.md`'nin
  ölçtüğü 5-17ms decode süresi burada hiç TEKRARLANMIYOR). Tek "geçiş"
  50ms'lik bir exponansiyel kazanç rampası (`audio-engine.js:769-771`,
  `0.0001→0.8`) — bu kısa/fark edilmez, "topallama" hissinin kaynağı
  DEĞİL.
- **"Zayıf giriş" ihtimali ffmpeg ile ELENDİ:** `groove.m4a`/`kick.m4a`
  dosyalarının İLK 2sn'si, DOSYANIN TAMAMINDAN daha SESSİZ DEĞİL
  (`volumedetect`: groove ilk-2sn mean -22.8dB vs tüm dosya -25.1dB —
  hatta biraz DAHA yüksek). Yani "topallama" bir sessizlik/fade sorunu
  değil, SAF TEKRAR sorunu.
- **Asıl mekanizma:** 24.615sn'lik bir dosyada 2000ms'lik döngü ARALIĞI,
  dosyanın SADECE İLK ~2 SANİYESİNİN sonsuza dek tekrar tekrar
  duyulmasına yol açıyor — kullanıcı ASLA dosyanın devamına (24.6sn'nin
  geri kalan ~%92'sine) ULAŞAMIYOR. Eski 5.33sn'lik dosyalarda aynı 2sn
  pencere dosyanın ~%37'siydi, yeni 24.6sn'de bu oran ~%8'e düştü — fark
  bu yüzden ARTIK belirgin.
- **Kompresör'ün "takılma"sı:** AYNI mekanizma (`kompresor.js`'in
  `THREE_WAY=true`'su, `applyProcessing` HER switch'te TAZE bir
  `DynamicsCompressorNode` kuruyor, `kompresor.js:353-358` — attack/release
  DOĞRU set ediliyor, "sıfırlanma" ANLAMINDA bir bug YOK). Kompresyonun
  net anlaşılması İÇİN transient sonrası SÜRDÜRÜLEN dinamiklerin
  duyulması gerekiyor (modun kendi doc'u: "davul/perküsyon/groove...
  kompresyonu çok daha net ortaya çıkarır") — ama kullanıcı hep AYNI
  ~2sn'lik açılış vuruşunu duyduğu için sıkışmanın SÜREÇTEKİ (attack
  sonrası sustain'deki) etkisini HİÇ göremiyor. "Takılma" hissi muhtemelen
  BU — E'nin AYNI köküyle.

**Dosya:satır:** `www/js/app.js:1011,5350-5362,5446-5448` (abLoopTimer/
cycleThreeWayPreview), `www/js/core/audio-engine.js:700-708,749`
(buildSampleSource/buildQuestionChain varsayılan offset).
**Commit kökeni:** Mekanizma G32/G151 civarı (Motor 2'nin ilk kurulumu) —
davranışın kendisi DEĞİŞMEDİ, G259'un dosya süresini 5.33sn'den 24.6sn'ye
çıkarması (`27073c7`) sorunu PRATİKTE ortaya çıkardı/büyüttü.
**Düzeltme yolu:** Otomatik döngüye kalıcı/artan bir offset stratejisi
eklenmeli (ör. her harf kendi son kaldığı noktadan devam etsin, ya da
dosyanın MÜZİKAL olarak temsilî bir noktasından — introdan SONRA —
başlasın) — `app.js:5356-5359`'un kendi yorumu bunun "kullanıcı kararı"
olduğunu AÇIKÇA söylüyor, mevcut "her zaman 0'dan" davranışı BİLİNÇLİ
seçilmişti; artık dosya uzunluğu bu kararın PRATİK sonucunu değiştirdiği
için YENİDEN onay/karar gerekiyor. **Küçük-orta iş yükü** (offset akışını
`cycleThreeWayPreview`→`buildQuestionChain`'e taşımak + strateji seçimi).
**Risk:** 🟡 Orta — Motor 2'nin 3 modunu (Kompresör/Reverb/Saturation &
Distortion) da öğretim etkinliği açısından zayıflatıyor, çökme/veri
hatası yok.

---

### G) Frekans Çakışması — gitar+snare üst üste binmiyor 🟡 ÖĞRETİM

**Ölçüm (Playwright, GERÇEK -6dBFS `snare.m4a`/`acoustic_guitar.m4a`, 20ms
pencereli RMS-zarfı ile onset/vuruş tespiti, ilk 8sn):** `buildDualSourceChain()`
(`audio-engine.js:942-1013`) İKİ kaynağı da `Promise.all` ile, HER İKİSİ
DE `buildSampleSource(path)` (offset=0, varsayılan) üzerinden — yani **playback
SENKRONİZASYONU DOĞRU, ikisi de aynı anda t=0'dan başlıyor** (bu bir
oynatma-zamanlama HATASI DEĞİL, kod incelemesiyle doğrulandı).

Onset zamanlarının en-yakın-eşleşme farkı (ms):

| Çift | Ortalama en-yakın-onset farkı | Yorum |
|---|---|---|
| **snare-gitar** | **324ms** | HİÇBİR eşleşme <200ms — snare VE gitar hiç aynı anda vurmuyor |
| kick-bas (referans/iyi örnek) | **52ms** | Çoğu eşleşme 0-40ms — genellikle AYNI anda |
| vokal-gitar | 320ms | O da zayıf — ama bu çift zaten ayrı sebeple (eski `vocal.m4a`) "GEÇİCİ" işaretli |

**Kök sebep:** SOURCE_PAIRS'ın G259'daki yeniden-ölçümü (`OLCUM-KAYNAK-16-08.md`,
Welch yöntemi FFT) **SADECE SPEKTRAL** (frekans-alanı) örtüşmeyi ölçtü —
**ZAMANSAL (onset hizası) örtüşme HİÇ ölçülmedi/hesaba katılmadı.** snare
ve gitar 78 BPM'de senkron render edilmiş olsalar da, snare vuruşları
gitarın strumlarıyla FARKLI vuruş alt-birimlerine denk geliyor (yaklaşık
bir sekizlik nota arası, 78 BPM'de = 385ms — ölçülen 324ms'lik ortalama
farkla TUTARLI) — bu GERÇEK bir müzikal aranjman özelliği (senkoplu/
kenetlenen ritim), bir oynatma hatası değil. kick-bas'ın İYİ çalışmasının
sebebi de aynı mantıkla açıklanıyor: gerçek mikslerde bas genelde kick'i
ritmik olarak TAKİP eder.

**Dosya:satır:** `www/js/core/audio-engine.js:942-1013` (buildDualSourceChain,
senkron doğrulandı), `www/js/core/source-catalog.js:117-125` (SOURCE_PAIRS
tanımı).
**Commit kökeni:** SOURCE_PAIRS bölgeleri G259'da (`27073c7`) FFT ile
yeniden hesaplandı — o ölçüm metodolojisi hiçbir zaman zamansal boyutu
kapsamadı (bu turdan ÖNCE de kapsamıyordu, G259'a özgü bir gerileme
değil).
**Düzeltme yolu:** (a) snare-gitar çiftini ritmik olarak daha örtüşen bir
malzemeyle DEĞİŞTİRMEK (yeni bir render/kaynak seçimi gerekir, Logic'in
işi); (b) SOURCE_PAIRS ölçüm metodolojisine (gelecekteki yeniden-ölçümler
için) bu turda kullanılan onset-zarfı analizini SPEKTRAL FFT'nin YANINA
eklemek. **(a) küçük ama Logic'in ses üretimini gerektirir; (b) orta,
tek seferlik metodoloji eklemesi.**
**Risk:** 🟢 Düşük — çökme/yanlış veri yok, SADECE öğretim etkinliği
zayıf bir kaynak çifti seçimi.

---

### H) Metin bulguları 🟡

**H.1 — "RX" ürün adı + not'un gömülü kalması:**
`guide-texts.js:133,141,153`'teki (G245'in ORİJİNAL 6 bölümü, G251 BUNLARA
DOKUNMADI — kendi commit mesajı: *"G245'in metodoloji metni tek karakter
değişmeden korundu"*) 3 yerde **"iZotope RX"/"RX 11"** İSİMLENDİRİLEREK
geçiyor. Ayrıca `app.js:10599`'daki canlı-üretilen bir metin dizgisinde de
"RX 11 karşılaştırmasıyla doğrulandı" ifadesi var. G251'in (`c2abe76`)
KENDİ eklediği 7. bölüm (`guide-texts.js:161-164`, "Neden küçük farklar
olur?") GERÇEKTEN ürün-adı TAŞIMIYOR — kendi iddiasıyla TUTARLI, doğrulandı.
**Ama bu yeni bölüm dizinin 7.'si/SONUNCUSU** — kullanıcı ORİJİNAL 6
bölümün (oldukça uzun metodoloji metni) TAMAMINI kaydırmadan ona
ULAŞAMIYOR, "en alta düşmüş, görünmüyor" şikâyeti bu yüzden doğru.
G251'in "başka bir ürünün adı geçmeyecek" talimatının G245'in ÖNCEDEN VAR
olan 3 mevcut "RX" anısını da kapsayıp kapsamadığı BELİRSİZ — G251'in
kendi görev tanımı SADECE "yeni eklenecek bölüm" ile sınırlıydı, geriye
dönük bir temizlik İSTENMEMİŞTİ (kanıt: commit mesajı sadece yeni bölümden
bahsediyor). **Ürün kararı gerekir.**

**H.2 — "clean" → "Temiz" çevirisi:**
`source-catalog.js:63,70`: `clean_guitar`→"Temiz Gitar", `clean_guitar_stereo`
→"Temiz Gitar (Stereo)". Önceki bir kural (D2, commit `4943634`) "sektörde
kullanılan İngilizce adlar" İngilizce KALSIN diyor — AMA o commit'in kendi
kapsamı SADECE synth-dalga-biçimi/gürültü türü isimleriydi (Pink Noise/
White Noise/Saw/Square/Triangle), genel enstrüman adları DEĞİL. Aynı
katalogdaki DİĞER enstrüman adları (Bas/Akustik Gitar/Vokal) zaten
Türkçeleştirilmiş — "Temiz Gitar" bu paternle YAPISAL olarak TUTARLI.
"clean" özelinde Türk prodüksiyon camiasında hem "temiz" hem "clean"
kullanımı yaygın — **BELİRSİZ/terim tercihi, tek taraflı karar verilmedi.**

**H.3 — Referans Filtreleri'nde "i" butonu yok:**
`index.html`'de Tonal Balance kartının `#toolsTonalInfoBtn`'i VE Ölçüm
Sonuçları kartının `#toolsResultsInfoBtn`'i VAR (ikincisi, kendi yorumuna
göre, "Düzeltme 2 (TUR9-ARACLAR-15-08 bulgusu 🟡)" ile SONRADAN eklenmiş —
yani bu TAM OLARAK AYNI sınıf bir eksiklik DAHA ÖNCE bulunup Ölçüm
Sonuçları için düzeltilmişti). Referans Filtreleri kartının (`index.html`
~1145-1183) markup'ında EŞDEĞER bir buton YOK. `guide-texts.js`'te
"Referans Filtreleri" için HİÇ bölüm YOK (grep sıfır sonuç) — buton eksik
DEĞİL SADECE, o buton için yazılacak İÇERİK de HİÇ YOK. `OLCUM-FILTRELER-16-08.md`
(bugünkü, bu turdan ÖNCE) BAĞIMSIZ olarak AYNI şeyi ("guide-texts.js'te
filtre adlarına dair sıfır sonuç") zaten gözlemlemişti — bu turun bulgusu
o gözlemle TUTARLI.

**Dosya:satır:** H.1 → `www/js/core/guide-texts.js:133,141,153,161-164`,
`www/js/app.js:10599`. H.2 → `www/js/core/source-catalog.js:63,70`.
H.3 → `www/index.html` (Referans Filtreleri kart bloğu, ~1145-1183),
`www/js/core/guide-texts.js` (TOOLS_TONAL_GUIDE/TOOLS_RESULTS_GUIDE'ın
YANINA eklenecek yeni bir bölüm YOK).
**Commit kökeni:** H.1 → G245 (RX anıları) + G251 (`c2abe76`, yeni bölüm
— temiz). H.2 → G259 (`27073c7`, clean_guitar'ın eklenmesi). H.3 →
Referans Filtreleri'nin kendisi G101/G117 civarı, "i" butonu hiçbir zaman
eklenmemiş.
**Düzeltme yolu:** H.1 — RX/RX 11 metinlerini araç-tarafsız dille
değiştirmek (küçük, ama ürün kararı gerektirir) + yeni bölümü dizinin
BAŞINA/daha erişilebilir bir yere taşımak (küçük). H.2 — terim tercihi
netleşince tek satırlık değişiklik (küçük). H.3 — yeni bir guide-text
bölümü YAZMAK (İÇERİK üretimi gerektiriyor, sadece kod değil) + buton/
handler eklemek (Tonal Balance/Ölçüm Sonuçları'nın BİREBİR aynı deseni,
küçük-orta iş yükü).
**Risk:** Düşük — hepsi içerik/metin kalitesi, fonksiyonel hata yok.

---

### I) Ajan denetimi bulguları — BAĞIMSIZ DOĞRULANDI ✅

**I.1 — Android native bundle senkron değil (AJAN-DENETIM E.4/I.1):**
BAĞIMSIZ tekrar ölçüldü — `android/app/src/main/assets/public/js/core/
source-catalog.js` HÂLÂ `bass_alt`/`groove_090.m4a` içeriyor
(`id:"bass_alt",label:"Bas (E2)"`, `samplePath:"audio/groove_090.m4a"`)
VE `clean_guitar` için SIFIR eşleşme. `android/app/src/main/assets/public/`
dizini `android/.gitignore:96` ile git-ignore'lu (yerel `npx cap sync
android` çıktısı, repoya HİÇ girmiyor). Zaman damgası: bu klasör
**14 Ağustos 00:26**, `www/index.html` **16 Ağustos 19:42** — bundle
G259/G260'tan (16 Ağustos) ÖNCEye ait, en az 2 gündür senkron dışı.
**iOS için risk YOK** (`ios/App/App/public/` G259/G260 dahil güncel,
AJAN-DENETIM'in kendi diff'i doğrulamış).

**I.2 — "43 tanı logu tek bayrağa bağlı" iddiası eksik (AJAN-DENETIM F.1):**
BAĞIMSIZ spot-check — `getFilePickerPlugin()` (`app.js:6323-6332`) TAM
okundu: fonksiyonun HİÇBİR yerinde `DEV_MODE` kontrolü yok,
`console.warn`/`console.error`/`console.log` (`[filepicker-diag]` etiketli)
HER dosya-seçici çağrısında KOŞULSUZ çalışıyor — GERÇEK kullanıcı
etkileşiminde de. `[guide-i-diag]`/`[upload-context]`/`[scroll-diag]`/
`[analiz]` etiketleri grep ile aynı kalıpta bulundu (satır numaraları
AJAN-DENETIM'inkiyle EŞLEŞTİ) ama BUNLARIN HER BİRİ tek tek TAM bağlamda
okunmadı — SADECE `[filepicker-diag]` ailesi tam doğrulandı, diğer üçü
"grep'le tutarlı, satır satır teyit edilmedi" düzeyinde. `OLCUM-BAYRAK-16-08.md`
(BUGÜN, bu turdan ÖNCE, build-flags'e ADANMIŞ bir ölçüm) bu 4 etiket
ailesinden HİÇBİRİNİ anmıyor — yani BUGÜN AYRICA bir denetim turu daha
bunları kaçırmış, AJAN-DENETIM'in bulgusu GERÇEKTEN daha önce hiç
yakalanmamış bir açık.

**Dosya:satır:** I.1 → `android/app/src/main/assets/public/js/core/
source-catalog.js` (gitignored, yerel). I.2 → `www/js/app.js:6325,6330,
6334,6370,6373,6376,6408,6508,6519,8753,8754,8758` ([filepicker-diag],
TAM doğrulandı), `7098,7174,7181` ([guide-i-diag], grep-doğrulandı),
`9725,9731,9756,9759,12750` ([upload-context], grep-doğrulandı),
`10063-10064` ([scroll-diag], grep-doğrulandı), `10411,10926` ([analiz],
grep-doğrulandı).
**Commit kökeni:** I.1 → yerel build durumu, commit'e bağlı değil. I.2 →
`[filepicker-diag]` G55 (`cda3bd7`), `build-flags.js`'in "TEK bayrak"
iddiası G239 (`d12e6be`) — ikisi arasında hiç kesişme/temizlik olmamış.
**Düzeltme yolu:** I.1 — herhangi bir Android build/test ÖNCESİ
`npx cap sync android` çalıştırmak (**önemsiz iş yükü, ama unutulmaya
açık — bir ön-build kontrol listesine eklenmesi önerilir**). I.2 — 4
etiket ailesini de `DEV_MODE` guard'ına almak YA DA `build-flags.js`'in
yorumunu "TEK bayrak, + 4 bilinçli/kalıcı istisna" diye düzeltmek —
**küçük iş yükü**, ama bu loglar Logic'in cihazda gerçek dosya-seçici/
upload sorunlarını Safari Web Inspector'dan izlerken FİİLEN kullandığı
teşhis araçları olabilir, kaldırmadan önce onay alınmalı.
**Risk:** I.1 → iOS'a engel yok, Android'e kalıcı olarak dokunulursa
YÜKSEK (yanlış zorluk/kaynak kütüphanesiyle gönderim riski). I.2 → Düşük
(hassas veri yok, App Store incelemesini etkilemiyor) — SADECE belge
doğruluğu sorunu.

---

## ÖZET

### 1) Yayın öncesi ZORUNLU düzeltilecekler
- **A) Kulak butonları** — TÜM 12 modda (Frekans Bulma dahil) fonksiyon
  kırık, 3 gündür (G193'ten beri) sessizce böyle, testler yalancı yeşil.
  Ya düzeltilmeli ya da özellik bu hâliyle YAYINLANMAMALI.
- **D) Bayat geri bildirim** — kullanıcı-görünür, kafa karıştırıcı, tek
  satırlık kesin bir düzeltmesi var; düzeltmemek için bir gerekçe yok.

### 2) Yayın öncesi iyi olacaklar
- **C) Distortion sesi** — dijital güvenlik ihlali yok ama gerçek ve
  büyük bir algısal sıçrama, özellikle en kolay zorlukta; Apple işitme-
  sağlığı incelemesi açısından proaktif düzeltilmesi önerilir.
- **I.1) Android bundle senkronu** — Android da yayınlanacaksa `cap sync
  android` ZORUNLU, unutulursa 2 günlük geri kaynak kütüphanesiyle gider.
- **B) Pan Konumu/Reverb'e `clean_guitar` eklenmesi** — küçük, tamlık
  eksikliği.
- **H.3) Referans Filtreleri "i" butonu** — sibling kartlarla tutarlılık,
  daha önce AYNI sınıf eksiklik Ölçüm Sonuçları'nda bulunup düzeltilmişti.

### 3) 1.1'e bırakılabilirler
- **E/F) Motor 2 döngü offset stratejisi** — öğretim etkinliğini
  düşürüyor ama çökme/veri hatası yok, ürün kararı gerektiren bir DSP/UX
  işi.
- **G) Frekans Çakışması snare-gitar çifti** — pedagojik kalite sorunu,
  yeni ses render'ı gerektirebilir.
- **H.1/H.2) Metin/terim netleştirmeleri** — küçük, ürün kararına bağlı.
- **I.2) 4 tanı-log ailesinin DEV_MODE'a bağlanması** — risk düşük, ama
  Logic'in kendi cihaz-teşhis akışını BOZMAMAK için önce onay gerekir.

### 4) Aynı kök nedene bağlı gruplar
- **A.1 + A.2 aynı zincir:** G193'ün CSS regresyonu (kulak butonları
  kırıldı) → G254'ün test yazarı SEMPTOMU (koordinat click overlay'e
  denk geliyor) gördü ama kök sebep yerine `element.click()` ile
  etrafından dolaştı → 8 test yeşil ama hiçbiri gerçek görünürlüğü
  doğrulamıyor. Tek kaynak: `.fb`'nin `overflow:hidden`'ı.
- **E ve F BİREBİR AYNI mekanizma:** `abLoopTimer`/`cycleThreeWayPreview`'ın
  offset=0 restart'ı — Kompresör'deki "takılma" ve genel "döngü
  topallaması" AYRI bulgular değil, AYNI bulgunun iki moddaki tezahürü.
  Bu risk `OLCUM-CALMA-SURESI-16-08.md`'de G259'dan ÖNCE zaten
  ÖNGÖRÜLMÜŞTÜ — şimdi doğrulandı.
- **B ve G aynı "G259 sonrası gözden geçirilmeyen liste" ailesi:**
  pan-konumu.js/reverb.js'in `only` listeleri (B) ve SOURCE_PAIRS'ın
  ZAMANSAL boyutu (G) — ikisi de G259'un kaynak-kütüphanesi
  yenilemesinin bıraktığı, spektral/liste-bazlı doğrulamanın YAKALAYAMADIĞI
  ikincil etkiler.
- **H.3 ve I.2 aynı "kısmi denetim" ailesi:** Referans Filtreleri'nin
  eksik "i" butonu (bugün AYRICA `OLCUM-FILTRELER-16-08.md` tarafından da
  bağımsız gözlemlendi) ve 4 tanı-log ailesi (bugün AYRICA
  `OLCUM-BAYRAK-16-08.md` tarafından da kaçırıldı) — İKİSİ de AYNI ders:
  bugünkü DAHİ olsa, dar-kapsamlı/hedefli denetim turları birbirini
  tekrar edip AYNI köşeleri atlayabiliyor; `app.js`'in 12.500 satırlık
  gövdesinin hiç satır satır okunmamış olması (AJAN-DENETIM-16-08.md'nin
  KENDİ en büyük kör noktası) bu üç bulgunun da (D, kısmen A, I.2)
  neden BUGÜNE kadar hiç yakalanmadığını açıklıyor.

---

**Dokunulan:** Sadece bu rapor dosyası (`OLCUM-CIHAZ-16-08.md`, YENİ).
**Dokunulmayan:** `www/js/` altında hiçbir kod dosyası, `styles.css`,
`index.html`, hiçbir test dosyası — task'ın kendi kuralı ("KOD YAZMA,
DOSYA DEĞİŞTİRME, COMMIT ATMA") harfiyen uygulandı.

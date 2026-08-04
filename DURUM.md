# DURUM

Son güncelleme: 04.08.2026

> Bu dosya yeni sohbetlerin tek doğruluk kaynağıdır.
> Her seans sonunda Claude Code tarafından güncellenir, commit'e dahil edilir.

## BİTTİ

Commit `4a75785` — G7: sample çalma AudioBuffer'a taşındı (XHR/blob çekme +
decodeAudioData + AudioBufferSourceNode), iOS kesiklik ve loop sorunu çözüldü.
G6'nın HTMLAudioElement yolu "HTTP 0"ı çözmüştü ama cihazda kesik kesik çaldı
ve loop noktasında tıklama/boşluk vardı (kullanıcı raporu) — streaming/
element tabanlı çalma kısa, hassas zamanlamalı döngüler için uygun değil.
Yeni yol iki yöntemin iyi yanını birleştiriyor: ÇEKME için `fetch()` yerine
`XMLHttpRequest` (arraybuffer) — WKWebView'da yerel dosya `fetch()`'i
engelliyordu, XHR aynı işi görüyor; ÇALMA için `decodeAudioData` +
`AudioBufferSourceNode` — sentetik kaynakların (noise/synth) ZATEN kullandığı
yol, kusursuz loop sağlıyor. AudioBuffer path başına Promise olarak
cache'leniyor (decode SADECE BİR KEZ, canlıda geçici bir teşhis loguyla
ölçüldü: ilk çalma "miss-xhr", ikincisi "hit" — sıfır yeni istek). Her turda
yine de taze bir `AudioBufferSourceNode` kuruluyor ("kalıcı graf mutasyonu
yok" kuralı korunuyor). `npm test`: 117/117. Tarayıcıda 6 farklı örnek (kick/
hihat/snare/vokal/tom/bas) tek tek test edildi, konsolda sıfır hata, her
birinin spektrumu görsel olarak kendi karakterinde. **iOS cihazda kesikliğin
gerçekten gittiği kullanıcı tarafından doğrulanacak** — bu ortamda gerçek
cihaz/simülatör yok.

Commit `2ceb992` — G6: sample yükleme yolu HTMLAudioElement'e taşındı, iOS
"HTTP 0" çözüldü. Kök sebep (kullanıcı cihazda ölçtü, Safari Web Inspector):
`buildSampleSource` (G4'te eklenen yol) `fetch()+decodeAudioData()`
kullanıyordu — WKWebView yerel bundle dosyalarını `fetch()` ile çekmeyi
engelliyor, "HTTP 0" veriyor (format sorunu değildi, G5'teki .aiff→.m4a
değişikliği bu yüzden HTTP 0'ı çözmedi). `upload.js`'in zaten kullandığı
ÇALIŞAN desene (`new Audio(path)` + `createMediaElementSource`) taşındı.
`{el,node}` path başına KALICI cache'leniyor (`uploadedMediaSource` ile aynı
ilke — bir elementten `createMediaElementSource` sadece bir kez çağrılabilir),
ilk yüklemede `canplaythrough` bekleniyor, hata durumunda mevcut try/catch +
pink noise fallback DEĞİŞMEDİ. `buildQuestionChain`'deki eski `sample.stop()`
çağrısı kaldırıldı (MediaElementAudioSourceNode'da yok).

Doğrulama sırasında kullanıcı gerçek 9 m4a dosyasını `www/audio/` altına
koymuştu (bu görevden BAĞIMSIZ, kendi işlemi) — tarayıcıda "kick" ve "hihat"
ayrı ayrı test edildi, konsolda SIFIR hata, iki spektrum görsel olarak
BİRBİRİNDEN AYRI ve doğru karakterde (kick: düşük frekans kümesi, hi-hat:
geniş bant/tiz ağırlıklı) — gerçek dosyaların pink noise fallback'i DEĞİL,
doğrudan decode edilip çalındığı doğrulandı. `npm test`: 117/117. iOS
cihazda HTTP 0'ın gerçekten kalktığı KULLANICI TARAFINDAN doğrulanacak (bu
ortamda gerçek cihaz/simülatör yok). NOT: 9 gerçek m4a dosyası bu commit'e
dahil edilmedi (kod-yolu değişikliğinin kapsamı dışında), `www/audio/`
altında halen untracked — ayrı bir kararla eklenmeli (bkz. AÇIK İŞLER 10,
güncellenmesi gerekiyor artık dosyalar mevcut).

Commit `2d2bd6f` — G4: gerçek ses kaynakları eklendi (9 sample, DAVUL+ENSTRÜMAN).
`www/audio/` klasörü oluşturuldu (dosyaların KENDİSİ henüz yok, kullanıcı elle
koyacak — `.gitkeep` ile izleniyor, `cap sync` sonrası `ios/App/App/public/audio/`
altında doğrulandı). `source-catalog.js`'teki DAVUL (5: kick/snare/hihat/tom/
groove) ve ENSTRÜMAN (4: bass/bass_alt/guitar/vocal) grupları `kind:"sample"` +
`samplePath:"audio/<dosya>.aiff"` ile dolduruldu. Kaynak menüsü (`app.js
populateSourceSelect`) `SOURCE_GROUPS`'tan otomatik üretildiği ve boş grupları
zaten filtrelediği için kod değişikliği gerekmedi — tarayıcıda DOM'dan doğrulandı
(4 optgroup, 9 yeni option). `audio-engine.js`'teki `buildQuestionChain` sample
404/decode hatasında zaten sessizce pink noise'a düşüyordu (`kind:"sample"` daha
önce hiç kullanılmadığı için bu yol hiç tetiklenmemişti) — bu görev ilk kez
gerçek koşullarda (kick.aiff 404) tetikledi: konsolda YAKALANMIŞ hata, uygulama
çökmedi, round pink noise ile normal aktı. `npm test`: 117/117 (değişmedi).

Commit `b8c4cab` — G3: geliştirici modu (gizli Pro test anahtarı). Ayarlar >
Hakkında > Sürüm numarasına 7 kez dokununca "Geliştirici" bölümü açılıyor
("Pro'yu simüle et" anahtarı + kapatma seçeneği), ayrı bir localStorage
anahtarında (`eqEarTrainerProXDev`) saklanıyor — prefs'e KARIŞTIRILMADI.
Tek doğruluk kaynağı: `isUserPro()` (app.js:502) = `realPro` (şu an sabit
false, IAP yazılınca buraya bağlanacak) `|| devFlags.simulatePro`. 7 çağrı
noktası: `loseLife()`, `finalizeIfGameOver()`, 3x `currentLives<=0` kontrolü,
`syncAccountLine()`, `applyProLockVisibility()`. `loseLife()` artık bu
fonksiyonun arkasına alındı — Pro'da `currentLives` hiç azalmıyor.

Tarayıcıda canlı doğrulandı: Pro kapalıyken kilitler normal (can 4→3 azaldı),
Pro açıkken Araçlar'daki iki kilit (Analiz/Referans filtreleri) kalkıyor ve 3
art arda yanlış cevapta can "4"te sabit kaldı (hiç azalmadı). 7-dokunuşla
açılma+toast, localStorage kalıcılığı (reload sonrası bölüm otomatik görünür)
ve "Geliştirici modunu kapat" ayrı ayrı test edildi. Mod sayısı (14) ve seans
soru sayısı (10) Pro açılınca DEĞİŞMEDİ — kodda hiçbir mod tier'a göre kilitli
değil (sadece seviyeye göre, bkz. BEKLEYEN KARARLAR **B**) ve "10 Soruluk
Bölüm" zaten herkes için sabit 10 soru (bkz. BEKLEYEN KARARLAR **I.4** — bu
görev var olmayan bir kısıtlamayı kaldırmadı, zaten yoktu). `npm test`:
117/117.

**Z1-Z7 — ZORLUK MİMARİSİ (gece oturumu, kullanıcı yoktu, sabah gözden geçirilmeli)**
DURUM.md'de tasarım kararı olarak kayıtlı ama kodda hiç olmayan zorluk mimarisi
(logaritmik ölçek, seans rampası, mod-bazlı seviye, kişiselleştirme, Otomatik/
Sabit ayarı, lvlSheet, autoDiffAsk) baştan sona koda geçirildi. Her karar
noktasında (kullanıcı olmadığı için) makul bir değer seçilip DURUM.md
"ZORLUK MİMARİSİ — OTOMATİK VERİLEN KARARLAR" bölümüne gerekçesiyle yazıldı —
hiçbiri kesin doğru iddia edilmiyor, kulakla ayarlanmayı bekliyor.
- `61a50a4` Z1: `core/difficulty-curve.js` — logaritmik zorluk eğrisi (gain/Q/
  tolerans/süre), LEVEL_CAP=20 tavanı, tavan-sonrası bağlam zorluğu (gain+süre,
  katman-ekleme UYGULANMADI). 9 yeni test.
- `446c465` Z2: `core/session-plan.js` — largest-remainder seans rampası
  (10 soru: 3/3/3/1, 5 soru: 2/2/1/0), ilk-soru-kolay+kalan-karışık kararı,
  serbest mod için ağırlıklı per-soru seçim. 8 yeni test.
- `7f47a01` Z3: `core/storage.js`+`core/progress.js` — mod başına XP (perMode,
  perDiff'ten AYRI ad alanı — YAPISAL bir çakışma riskini önceden önledi),
  akademi seviyesi (mod seviyelerinin toplamı), göç (eski veri kaybolmadan
  taşındı, canlı doğrulandı: 99→126 XP). 16 yeni test.
- `16f0806` Z4: `core/personalization.js` — bölge bazlı zayıflık skoru (isabet+
  ortalama sapma), ağırlıklı soru üretimi (agresiflik sınırı: en fazla 3x),
  frekans-bulma.js'e WIRE EDİLDİ. 11 yeni test.
- `f576bc9` Z5: "Otomatik" zorluk modu GERÇEK oldu (`applyAutoDifficulty`,
  `tierForLevel` köprüsü, `prefs.difficultyMode` kalıcı).
- `973865e` Z6: `lvlSheet` sıfırdan kuruldu — Z1/Z3'ün gerçek değerlerini
  gösteriyor (qToOctaveBandwidth RBJ formülü dahil, +5 test), canlı elle
  çapraz doğrulandı.
- `ffc394f` Z7: `autoDiffAsk` sıfırdan kuruldu — tetikleme koşulu PROTOTİPTEN
  okundu (dokunma-tetiklemeli, performans-tetiklemeli DEĞİL). Testte YAN BUG
  bulundu ve düzeltildi (Oyun Ayarları'ndaki Zorluk satırı auto-değişimde
  donuk kalıyordu).
`npm test`: 68→117 (49 yeni test, hepsi saf fonksiyon). Konsol hatası hiçbir
adımda yok. Detaylı kararlar/gerekçeler için bkz. "ZORLUK MİMARİSİ — OTOMATİK
VERİLEN KARARLAR" bölümü altta.

A/B döngüsünde pitch kayması (bug raporu → teşhis → düzeltme) — kullanıcı (14 yıllık
müzik prodüktörü) yüklenen WAV dosyasında A/B otomatik döngüsü sırasında pitch'in
kaydığını bildirdi ("44.100'den 48.000 olmuş gibi"). Teşhis aşaması: AudioContext
tek bir singleton, sabit sampleRate — hiç değişemez; playbackRate hiçbir yerde set
edilmiyor; 44 canlı konsol ölçümünde (eşleşen 44.1kHz, uyuşmayan 48kHz dosya/44.1kHz
context, sentetik Pink Noise) audioCtx.sampleRate/playbackRate ilk çalma ile A/B
döngüsü arasında BİREBİR AYNI kaldı — JS düzeyinde fark kanıtlanamadı. Kod incelemesi
gerçek kök sebebi buldu: A/B döngüsü (M1-5) her 2000ms'de `buildQuestionChain`'i
YENİDEN çağırıyordu, bu da yüklenen dosya için CANLI ÇALAN `uploadedMediaSource`'u
(MediaElementAudioSourceNode) disconnect edip yeniden connect ediyordu — WebKit'te
bu deseni JS'ten hiç gözlemlenemeyen bir motor-düzeyi resample sapmasına yol açabilir
(zaten AÇIK İŞLER madde 5'te "A/B gerçek bypass değil" olarak kayıtlıydı). Kullanıcı
onayıyla asıl mimari çözüm uygulandı: `audio-engine.js`'te artık HER ZAMAN paralel
kuru+işlenmiş yol kuruluyor (dryGain/wetGain), A/B toggle'ı `audioEngine.
setProcessed()` ile SADECE 50ms'lik bir gain crossfade yapıyor — kaynak/filtre
grafiği tur boyunca hiç bozulmuyor. `app.js`'teki `toggleAB()` artık `buildQuestionChain`'i
hiç çağırmıyor. Enstrümante edilmiş canlı doğrulama (AudioNode.prototype.connect/
disconnect'e geçici sayaç eklenerek): eski kodda her A/B toggle'ı 1 connect+1
disconnect üretiyordu; yeni kodda uzun bir A/B döngüsü boyunca (tek tur içinde,
birden fazla toggle) SIFIR connect/disconnect ölçüldü. `npm test`: 68/68. Gerçek
pitch algısı (kulakla) DOĞRULANMADI — bu ortamda ses duyulamıyor, cihazda kontrol
edilmeli.

Commit `a377d80` — F1: geri bildirim iki kez gösteriliyordu (bug, AÇIK İŞLER
madde 4'ün ta kendisi — bu maddeyle KAPANDI). Kök sebep: `submitFrequencyGuess`/
`submitProPlusGuess` hem `#feedbackBox`'ı (basit kart) hem `#freqInfo`'yu (zengin
kart — bölge açıklaması, karşılaştırma butonları) AYNI ANDA dolduruyordu, ikisi
de görünür kalıyordu. Çözüm: `#feedbackBox` artık gösterilmiyor (`showResult`
zorla false); ondaki, `#freqInfo`'da OLMAYAN bilgi (kalite sözcüğü "🎯 Tam
isabet!" vb. ve yanlışta "Kalan can: N") yeni `appendFreqInfoNote()` yardımcısıyla
`#freqInfo`'nun içine taşınıyor — bilgi kaybı yok. `onTimeUp()` bilerek
dokunulmadı (kendi `showFreqInfoPanel`'ı çağırmıyor, `#feedbackBox` orada hâlâ
tek mekanizma). Masaüstü Chrome'da hem doğru hem yanlış cevap için TEK kart
doğrulandı (skor/XP doğru işleniyor). `npm test` 68/68. Cihazda KONTROL EDİLMEDİ.

Commit `160e37c` — F2: geri bildirim süresi 1.5sn sabitten doğru=4sn/yanlış=6sn'ye
çıkarıldı (F1'in içerik-yoğun kartı artık okunabiliyor). Bu sırada gerçek bir bug
bulundu: üç cevap-verme handler'ı `submitFrequencyGuess`/`submitProPlusGuess`'i
çağırdıktan HEMEN SONRA ayrıca kendi `ensureAutoNext()`'lerini çağırıyordu —
submit* zaten kendi süresini kurduğu için bu ikinci çağrı sessizce 1500ms
varsayılana geri dönüyordu; kaldırıldı. Karşılaştırma butonuna (Senin cevabın/
Doğru cevap/Temiz) basınca otomatik-geçiş sayacı duraklıyor (`pauseRound`'un
KULLANDIĞI AYNI primitif), en az 3sn'lik/buffer-tabanlı kaynaklarda döngü tam
katına yuvarlanan bir önizleme penceresi sonunda kaldığı yerden devam ediyor
(KULLANICI KARARI — sonradan gerçek örnek dosyalar eklenince döngü yarıda
kesilmesin). Yanlış-cevap süresi (6sn) ve donma/devam-etme davranışı masaüstü
Chrome'da ölçülerek doğrulandı (nextBtn "Sonraki (6)"da ~5sn donuyor, sonra
normal tikliyor); doğru-cevap süresi (4sn) SADECE kod simetrisiyle doğrulandı —
otomasyon ortamının CDP gecikmesi/timeout'ları temiz bir ölçüm almaya izin
vermedi. `npm test` 68/68. Cihazda KONTROL EDİLMEDİ.

Commit `a7b0be3` — F3: XP animasyonu soru metninin üzerine biniyordu (bug) —
`spawnXp` artık canvas'ın ÜST kenarından değil DÜŞEY ORTASINDAN başlıyor, 90px'lik
yukarı süzülme canvas sınırları içinde kalıyor. Toast'lar (günlük görev/başarım)
aynı sabit konumda üst üste biniyordu (bug) — artık aktif toast'ların yüksekliği
toplanarak birbirinin ALTINA diziliyor (`relayoutToasts`), konum sağ-alttan
(actionbar/karşılaştırma butonlarıyla çakışıyordu) sağ-üste taşındı (`.ghead`'in
GERÇEK yüksekliği kadar aşağıdan başlıyor, oyun ekranındaki geri/ayarlar
butonlarının üzerine binmiyor). `pointer-events:none` zaten vardı, override
edilmediği doğrulandı. fx.js fonksiyonları doğrudan çağrılarak masaüstü
Chrome'da test edildi (2 toast üst üste binmeden dizildi). `npm test` 68/68.
Cihazda KONTROL EDİLMEDİ.

Commit `37f2491` — F4: çift dokunma/pinch zoom kapatıldı. İki katmanlı: viewport
meta'ya `maximum-scale=1.0, user-scalable=no` eklendi (pinch), `html,body{
touch-action:manipulation}` eklendi (çift-dokunma zoom, kaydırma etkilenmez),
`#visualizer{touch-action:none}` (spektrum tap-hedefi, pan/zoom gerekmiyor).
Dokunmalı moddaki spektrum-tıkla-cevapla (pointerdown tabanlı) mekanizması
touch-action:none SONRASI test edildi, regresyon yok (573 Hz, "Tam isabet!").
Gerçek çift-dokunma/pinch DAVRANIŞI mouse-tabanlı otomasyonla üretilemedi —
sadece computed style/viewport meta içeriği ve fonksiyonel regresyon (tıklama,
kaydırma) doğrulandı. `npm test` 68/68. Cihazda KONTROL EDİLMEDİ (öncelikli).

Commit `bc45b38` — E1: "Dosya seç" ile WAV seçilemiyordu (bug). Kod tarafında
(validateAudioFile'ın uzantı kontrolü) WAV'ı özel olarak eleyen bir şey
bulunamadı — 7 format da Node'da tek tek doğrulandı. En olası açıklama iOS
WKWebView'in `accept="audio/*"` MIME-jokerini UTI'ye çevirirken bazı
formatları (özellikle WAV) dışarıda bırakabilmesi (bilinen bir WebKit
sınırlaması) — bu ortamda fiziksel cihaz olmadığı için konsol logu ile
BİREBİR KANITLANAMADI. Düzeltme: accept artık MIME joker + WAV'ın bilinen
MIME varyantları + uzantı listesi birleşimi (audioAcceptAttr(), tek kaynak
ALLOWED_AUDIO_EXTENSIONS'tan üretiliyor); change handler'ına kalıcı bir
teşhis logu eklendi ([upload] dosya seçildi: ad|tip|boyut) — bir sonraki
cihaz testinde bu log konsolda görünüyor mu diye bakılmalı.

Commit `17eb76c` — E2: "Cevap biçimi" chip'i oyun ekranına eklendi (Kaynak/
Odak'ın yanına, 3. chip). Bunu yaparken initSettingsSheet'te gerçek bir bug
bulundu (updateRowText tekil querySelector kullanıyordu, aynı select'e bağlı
2. bir satırı hiç güncellemiyordu — querySelectorAll'a çevrildi) VE .srctag'ın
gerçek flex kapsayıcısının .chiprow değil aradaki .control.control-sheet
div'i olduğu, .srctag'ın o div'in flex öğesi olmadığı için flex:1/min-width:0'ının
hiç uygulanmadığı (width:100% ile düzeltildi) bulundu — bu ikinci bug 2
chip'te geniş pay yüzünden hiç fark edilmiyordu. Yeni chip flex:0 0 auto
(kısa metin hiç kesilmiyor), Kaynak/Odak flex:1 kalıyor.

Commit `96e56d7` — E3: cevap sonrası alt bar gizleniyor (.actionbar-tucked,
transform tabanlı, D1'in --actionbar-h sistemini bozmadan). Bunu yaparken
D1'in şıklı-mod otomatik kaydırmasıyla (scrollFeedbackIntoView) etkileşen
gerçek bir race bulundu: yeni tur açılışında untuck animasyonlu olunca,
senkron scrollHeight okuması geçiş tamamlanmadan eski (küçük margin) değeri
görüyordu — auto-advance edilmiş turlarda D1 bug'ı GERİ GELİYORDU. Çözüm:
setActionbarTucked'a instant seçeneği eklendi, SADECE yeni-tur-açılış
untuck'ında kullanılıyor (tuck her zaman animasyonlu kalıyor).

Üçü de: npm test 68/68 her adımdan sonra, konsol hatası yok. D1/D5 gibi bu
üçü de gerçek cihazda/simülatörde KONTROL EDİLMEDİ (bu ortamda yok) — sadece
tarayıcı/dosya düzeyinde doğrulandı; E1 özellikle cihazda ayrıca kontrol
edilmeli (bkz. üstteki not).

Commit `a1c837a` — D1: alt bar CSS-tabanlı padding düzeltmesi (cihaz testinden
çıkan bug). Kök sebep yeniden teşhis edildi: `.game-scroll` flex:1 ile ekranın
TÜM artan alanını (position:fixed actionbar'ın kapladığı ~168px dahil) kendi
kutusu sayıyordu; eski ölçüm-tabanlı çözüm (syncGameScrollPadding +
ResizeObserver) sadece ekstra scroll payı ekliyordu, kutunun kendisini
actionbar'ın önünde durdurmuyordu. Çözüm: `--actionbar-h` sabit CSS
değişkeni + `.game-scroll`'a margin-bottom (ölçüme dayanmıyor, ilk boyamadan
itibaren doğru) — syncGameScrollPadding tamamen kaldırıldı. Ayrıca 4-6 şıklı
durumda (.answers 2 satıra taşıyor) otomatik kaydırma eklendi (SADECE şıklı
modda — dokunmalı modda analizör görünür kalmalı). Gerçek DOM ölçümüyle
doğrulandı: 3/4/5/6 şık hepsi ≥+16 (38px), geri bildirim kartı 3 ölçümde
sabit +20px (hiç negatif dip yok).

Commit `4943634` — D2: kaynak isimleri İngilizceye çevrildi (Pink Noise/White
Noise/Saw/Square/Triangle) + "Kendi dosyam" satırı "Dosya seç" oldu (grup
başlığıyla tekrar ediyordu). source-catalog.js tek kaynak olduğu için sadece
6 label değişti, grep ile eski isimlerden hiçbiri kalmadığı doğrulandı.

Commit `382f030` — D3: Oyun Ayarları sheet'i düzeni. Kök sebep: satırlar
gerçek `<button>` — WebKit'te display:flex bir button'a uygulandığında
width/text-align UA varsayılanları flex düzenini bozabiliyor (prototype.html'
nin aynı bileşeni tam olarak width:100%+text-align:left'i açıkça set ediyordu,
bizde eksikti). Aynı ikisi eklendi + native "Dosya Seç" butonu
::file-selector-button ile uygulamanın buton diline uydurtuldu. Ölçümle
doğrulandı: 4 satır artık bayt-bayt eşit genişlikte (522px), etiket-değer
arası hiç sıfırlanmıyor.

Commit `5e00e9d` — D4: dosya boyutu sınırı 150→120 MB. Tespit: bu pipeline
decodeAudioData KULLANMIYOR (HTMLAudioElement akışı, PCM'i RAM'e açmıyor) —
150 MB'ın riski "bellek çökmesi" değildi, sadece gereksiz büyüktü. Kullanıcı
120 MB'ı onayladı.

Commit `bf898f8` — D5: splash koyu temada minik kalıyordu (bug). Kök sebep:
-dark PNG'ler AYNI kanvas boyutundaydı (2732x2732) ama logo kanvasın sadece
~%6.5'ini kaplıyordu (açık varyantta ~%35-40) — storyboard/Contents.json
doğruydu, sorun kaynak görselin kendisindeydi. Açık varyant (uygulamanın
teması zaten neredeyse siyah) doğrudan koyu varyantın yerine kopyalandı —
iOS (3 dosya) + Android'de AYNI bug bulunup düzeltildi (13 dosya, night/
drawable-night). Simülatör/cihazda gerçek render KONTROL EDİLMEDİ (Xcode/
Android Studio bu ortamda yok) — sadece dosya/piksel düzeyinde doğrulandı.

D6 (isimlendirme denetimi) — düzeltme YAPILMADI, sadece rapor edildi, bkz.
BEKLEYEN KARARLAR I.

Commit `5b3775f` — M1-3: "Kendi dosyam" dosya seçici açmıyordu (bug).
Teşhis: Kaynak sheet'inin "Kendi dosyam" satırı diğer seçenekler gibi
davranıyordu — sourceSelect'i sessizce "upload" değerine çekip kapanıyordu,
hiçbir dosya seçici AÇMIYORDU. Gerçek dosya inputu (upload-row) tamamen ayrı
bir sheet'te (Oyun Ayarları/dots) gömülüydü. Düzeltme: bu satır artık (dosya
henüz yüklenmemişse) native dosya seçiciyi doğrudan tetikliyor; dosya zaten
yüklüyse normal seçenek gibi davranıyor. Tarayıcıda gerçek bir WAV dosyasıyla
uçtan uca doğrulandı (seçim→yükleme→round başlatma). npm test 62/62.

Commit `5c608f4` — M1-4: odak aralığı (Tüm spektrum/Bas/Orta/Tiz).
Kaynak chip'inin yanına focusChip/focusSheet eklendi (frekans-bulma.js:
FOCUS_RANGES). Seçilen aralık hem soruyu hem çeldiricileri sınırlıyor,
tercih localStorage'da kalıcı. Ana menüdeki "Bugünün Önerisi"nin "Başla"
butonu artık gerçekten işlevsel — en zayıf bölgeyi otomatik odağa çeviriyor.
Dar odak aralıklarında (Bas/Orta) üst zorluklarda/Pro Plus'ta geometrik
kapasite sınırı var (bkz. BEKLEYEN KARARLAR H). 6 yeni test + tarayıcı
doğrulaması (sayfa yenilemede tercih kalıcı kaldı). npm test 68/68.

Commit `1a8dd7b` — M1-5: A/B uzun basma döngüsü (pointerdown+520ms+2000ms
interval, prototype.html ile birebir). Kısa dokunma eski davranışı koruyor.
Sentetik PointerEvent'lerle gerçek bir turda zamanlama ayrı ayrı ölçüldü
(150ms→toggle yok, 600ms→döngü başladı, 2100ms bekleyince otomatik flip
oldu, tekrar dokununca durdu, geri butonuyla da duruyor).

Commit `5a8e3b0` — M1-6: geri bildirim kartına "Senin cevabın/Doğru cevap/
Temiz" karşılaştırma butonları eklendi — üçü de GERÇEK ses çalıyor (prototipte
sadece görsel toggle'dı). Sadece tek-bant "frequency" modu kapsandı, Pro
Plus bilerek dışarıda bırakıldı (4 tahminden hangisi "senin cevabın" olacağı
belirsiz). Senkron JS ile gerçek bir turda üç buton da tıklanıp doğrulandı.

Commit `ff8f862` — M1-7 (kısmi): "Soru N/10" sayacı (sadece 10 Soruluk
Bölüm'de) + "Oyundan çık" butonu (Oyun Ayarları sheet'i). Kalan 3 alt madde
(Seviye bilgi sheet'i, ayrı "Tekrar Çal" butonu, Otomatik zorluk sorgusu)
ATLANDI — prototipin öngördüğü temel altyapı (seviyeye bağlı sürekli zorluk
formülü / gerçek "Otomatik" zorluk modu) kodda hiç yok, tahminle
doldurulmadı. Bkz. BEKLEYEN KARARLAR E/F/G.

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

**1. ~~Geri bildirim kartı ilk saniyelerde alt bar'ın altında~~ — D1'de düzeltildi, `a1c837a`**
Üç kez ölçüm-tabanlı çözüm denenmiş, tutmamıştı. D1'de mimari değişti: padding
yerine CSS `--actionbar-h` değişkeninden margin-bottom — ölçüme hiç bağlı değil,
ilk boyamadan itibaren doğru. Aynı turda şıklı cevap modundaki 4-6 şıklık
grid'in altbar arkasında kalması da (aynı kökten) düzeltildi. Simülatör/cihazda
gerçek render henüz KONTROL EDİLMEDİ — sadece masaüstü Chrome'da gerçek DOM
ölçümüyle doğrulandı (bkz. commit mesajı).

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

**4. ~~`loseLife()` zengin geri bildirimi eziyor~~ — F1'de düzeltildi, `a377d80`**
Yanlış cevapta artık TEK kartta hem "Kalan can: N" hem doğru frekans/bölge bilgisi
görünüyor (`appendFreqInfoNote`). Aynı kökten (feedbackBox + freqInfo aynı anda
görünür kalması) doğru cevap tarafındaki DUPLIKE kart bug'ı da düzeldi.

### Eksik özellikler

**10. ~~Gerçek ses dosyaları (DAVUL/ENSTRÜMAN) katalogda tanımlı ama dosyaların kendisi yok~~ — dosyalar mevcut, git'e eklenmedi**
G4 ile `source-catalog.js`'e 9 `kind:"sample"` girdisi eklendi, G5 ile
uzantı `.m4a`'ya çevrildi, G6 ile yükleme yolu HTMLAudioElement'e taşındı.
9 gerçek m4a dosyası artık `www/audio/` altında VAR (kullanıcı elle koydu,
tarayıcıda kick/hihat doğrulandı — konsolda hata yok, spektrum doğru) ama
henüz git'e commit'lenmedi (`git status` → untracked). **Kalan tek adım:**
`git add www/audio/*.m4a` + commit — ürün kararı değil, sadece unutulmamalı.
iOS cihazda gerçek doğrulama (HTTP 0'ın kalkması) kullanıcıda.

**5. ~~A/B Test gerçek bypass değil~~ — bir kullanıcı raporuyla birlikte düzeltildi, bkz. BİTTİ**
Kullanıcı (14 yıllık müzik prodüktörü) A/B döngüsünde pitch kayması bildirdi
("44.100'den 48.000 olmuş gibi"). Teşhis: konsol düzeyinde (audioCtx.sampleRate/
audioEl.playbackRate, 44 ölçüm, eşleşen+uyuşmayan sample rate'ler, upload+sentetik)
hiçbir fark kanıtlanamadı — ama A/B döngüsünün her 2sn'de bir CANLI ÇALAN
uploadedMediaSource'u (MediaElementAudioSourceNode) disconnect/reconnect ettiği
kod incelemesiyle doğrulandı; bu WebKit'te JS'ten hiç gözlemlenemeyen bir motor
davranışı olabilir. Kullanıcı onayıyla asıl mimari eksiklik (bu madde) çözüldü:
artık paralel kuru/işlenmiş yol + gain crossfade (`audioEngine.setProcessed`) var,
`buildQuestionChain` A/B toggle'ında BİR DAHA hiç çağrılmıyor. Enstrümante edilmiş
canlı testte (AudioNode.prototype.connect/disconnect sayaçları) tur içi A/B
döngüsünde MediaElementAudioSourceNode üzerinde SIFIR connect/disconnect ölçüldü
(önce her toggle bunu 1 kez tetikliyordu).

**6. Kalibrasyon — sarı seviye çizgisi dokunmatik olmalı**
Ekrandaki seviye göstergesi parmakla sürüklenerek ayarlanabilsin.

**7. ~~Odak aralığı özelliği kodda yok~~ — M1-4'te eklendi, `5c608f4`**
Seans sonu ekranındaki öneri kartı (`resSug`) HÂLÂ eklenmedi — bu M1
turunun kapsamı dışında (G2/seans-sonu ekranına dokunmuyordu), artık
engel ortadan kalktığı için ayrı bir işte eklenebilir.

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
**Kısmen ilerledi (Z3):** "seviye" kilidi HANGİ seviye sayısına bakacak sorusu
karara bağlandı (akademi/toplam seviyesi — `progress.academyLevel()`) ve KODLANDI
(`app.js` renderModeGrid, `meetsLevel` kontrolü). Ama bu, üç durumun (kodlanmadı/
seviye-yetersiz/Pro) UI'da AYRIŞTIRILMASI sorununu ÇÖZMEDİ — hâlâ "Yakında" toast'ı
hem "henüz kodlanmadı" hem "seviyen yetmiyor" için aynı görünüyor. Bu madde AÇIK
kalıyor.

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

**E. ~~Seviye → hassasiyet formülü (lvlSheet için gerekli)~~ — Z1/Z6 ile çözüldü**
`core/difficulty-curve.js: difficultyParams(level)` artık SÜREKLİ (logaritmik)
bir formülle her seviye için gainDb/Q/tolerans/süre üretiyor; `lvlSheet` (Z6)
bunu GERÇEKTEN okuyor. Bkz. DURUM.md "ZORLUK MİMARİSİ — OTOMATİK VERİLEN
KARARLAR" — buradaki sayısal değerler (GAIN_DB_AT_LEVEL_1/CAP, Q_AT_LEVEL_1/CAP
vb.) OTOMATİK/varsayılan seçildi, kulakla doğrulanmadı; sabah gözden geçirilmeli.

**F. "Tekrar Çal" butonu kapsamı**
Sentetik kaynaklarda (gürültü/synth) anlamsız — sürekli sinyaller, "başı" yok.
Sadece "upload" kaynağında anlamlı (ve onun için zaten `uploadManager.
startFromZero` var, şu an sadece tur/seans başında çağrılıyor). Karar gereken:
sadece upload kaynağında görünen küçük bir "baştan çal" ikonu mı eklensin, yoksa
madde tamamen atlansın mı? Ayrı bir buton eklemek actionbar'ın layout'unu
değiştirir.

**G. ~~Otomatik zorluk modu~~ — Z5/Z7 ile çözüldü**
"Otomatik" artık gerçek: `applyAutoDifficulty()` (app.js) her round başında
Z1+Z3'ten türetilen zorluğu uyguluyor, `autoDiffAsk` (Z7) prototipteki gibi
DOKUNMA-tetiklemeli. KAPSAM SINIRI (bkz. Z5 commit mesajı): Z1'in TAM sürekli
eğrisi değil, `tierForLevel()` köprüsüyle en yakın isimli kademe (easy/medium/
hard/pro) kullanılıyor — evaluateAnswer'ın sabit tolerans sınırını parametrik
hale getirmek AYRI bir iş (aşağıda not edildi).

**H. Dar odak aralığında Pro Plus bant sayısı**
M1-4 ile gelen odak aralığı (Bas/Orta ~2.3 oktav) Pro Plus'ın istediği 4 ayrık
bandı (gereken ~2.7 oktav) her zaman sığdıramıyor — ölçülen 500 denemede hep
2-3 bant üretiliyor (bkz. `test/frekans-bulma.test.mjs`). Kod güvenli tarafta
duruyor (asla range dışına taşmıyor, asla çakışan bant üretmiyor) ama bu bir
ürün kararı gerektiriyor: Pro Plus dar odakta kısıtlansın mı (o kombinasyon
seçilemesin), yoksa az bantla mı devam etsin?

**I. İsimlendirme tutarsızlıkları (D6 denetimi — düzeltilmedi, sadece raporlandı)**
1. Zorluk `proplus` değeri iki yerde iki farklı isimle: Oyun Ayarları sheet'inde
   "Pro Plus (Çok Bantlı)", Genel Ayarlar'ın Zorluk alt-listesinde (`data-diff=
   "proplus"`) "Sınırsız" / "Sınırını kendin ara". Aynı seçenek, iki ayrı kavram.
2. Can bitişi iki farklı başlıkla art arda gösteriliyor: `loseLife()` içindeki
   feedback+toast "Oyun bitti" diyor, hemen ardından açılan seans-sonu tam ekranı
   "CANLARIN BİTTİ" diyor.
3. Desteklenen ses formatları tutarsız anlatılıyor: `validateAudioFile`'ın kendi
   hata mesajı 7 formatı doğru listeliyor (wav/mp3/m4a/aac/aiff/flac/ogg), ama
   "Ses oynatılamadı"/"Yükleme hatası" mesajları sadece "mp3/wav" öneriyor.
4. Paywall'daki "Seans başına 5 soru" (Ücretsiz) / "Seans başına 10 soru" (Pro)
   iddiası kodda YOK — `10 Soruluk Bölüm` Pro'ya bağlı değil, herkes seçebiliyor;
   ücretsiz kullanıcıyı 5 soruyla sınırlayan bir mekanizma da yok. İsimlendirme
   değil ama satın alma sayfası var olmayan bir kısıtlamayı vaat ediyor.
5. "Ses dosyası yükle" (Oyun Ayarları) / "Dosya yükle" (Araçlar) — aynı eylem
   için iki farklı buton metni.
Hangisinin düzeltileceği/nasıl birleştirileceği ürün kararı — kod tarafında
hazır, sadece onay bekliyor.

## SIRADAKİ

**Tek sonraki adım: Z1-Z7'nin sayısal değerlerini KULAKLA dinleyip ayarla.**
Hiçbiri test edilmeden/dinlenmeden seçilmedi — bkz. SON RAPOR'daki "kulakla
ayarlanması gereken değerler" listesi (DIFFICULTY_CONFIG, SESSION_RAMP_WEIGHTS,
PERSONALIZATION_CONFIG — hepsi tek dosyada, kolay değiştirilir).

Bundan sonraki öncelik sırası:
- **Z1/Z5**: Otomatik moddaki `tierForLevel()` köprüsünün mü yoksa Z1'in tam
  sürekli eğrisinin mi (gain/Q'nun createQuestion/evaluateAnswer'a doğrudan
  enjekte edilmesi) doğru uzun-vadeli mimari olduğuna karar ver — ikincisi
  `evaluateAnswer`'ın sabit 0.5 oktav toleransını parametrik hale getirmeyi
  gerektiriyor (ayrı bir refactor, bkz. OTOMATİK VERİLEN KARARLAR).
- **F4** (çift-dokunma/pinch zoom kapatma, önceki tur) — gerçek dokunmatik
  jest gerektiriyor, mouse-tabanlı otomasyonla HİÇ üretilemedi.
- **A/B pitch fix** (önceki tur, `8f66de1`) — gerçek cihazda kulakla pitch'in
  artık sabit kaldığı doğrulanmalı, bu ortamda ses duyulamıyor.
- **F2**'nin karşılaştırma-önizlemesi duraklat/devam davranışı, **E1**'in WAV
  seçme kök sebebi — önceki turlardan, hâlâ cihaz doğrulaması bekliyor.

Kod tarafında bekleyen karar yok; E/F/G/H/I (BEKLEYEN KARARLAR, Z1-Z7 ile E/G
kapandı) kullanıcıya sorulmayı bekliyor ama hiçbiri şu an engelleyici değil.

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

## ZORLUK MİMARİSİ — KODLANDI (Z1-Z7, gece oturumu)

Bu bölümdeki tasarım kararları (aşağıda özetleniyor) Z1-Z7 turunda KODA GEÇTİ.
Uygulama detayları ve gerekçeli kararlar için bkz. "ZORLUK MİMARİSİ — OTOMATİK
VERİLEN KARARLAR" altındaki bölüm — kullanıcı YOKTU (gece oturumu), her karar
noktasında makul bir değer seçilip GEREKÇESİYLE buraya yazıldı. Hiçbiri "kesin
doğru" değil, kulakla ayarlanmayı bekliyor.

**Seans içi rampa** — `core/session-plan.js` — KODLANDI, henüz app.js'e WIRE
EDİLMEDİ (10 Soruluk Bölüm hâlâ zorluğu `els.difficultySelect`'ten okuyor).

**Basamak yerleşimi kişiselleştirme** — `core/personalization.js` — KODLANDI
VE app.js'e WIRE EDİLDİ (`startRound()` → `createQuestion(..., {zoneStats})`).

**Seviye yapısı** — `core/progress.js` (modeXp/modeLevel/academyLevel) +
`core/storage.js` (perMode, migration) — KODLANDI VE WIRE EDİLDİ.

**Zorluk ölçeği** — `core/difficulty-curve.js` (difficultyParams, tierForLevel)
— KODLANDI. Oyun parametrelerine (gain/Q) SADECE `tierForLevel()` köprüsüyle
DOLAYLI bağlı (Otomatik mod DIFFICULTY[tier]'ı kullanıyor) — Z1'in tam sürekli
eğrisi henüz createQuestion/evaluateAnswer'a DOĞRUDAN enjekte edilmedi (bkz.
altta, "Sonraki adım" notu).

**Ayarlar** — Otomatik (varsayılan)/Sabit — KODLANDI VE WIRE EDİLDİ
(`applyAutoDifficulty()`, `prefs.difficultyMode`).

## ZORLUK MİMARİSİ — OTOMATİK VERİLEN KARARLAR (gece oturumu, kullanıcı yok)

Her madde: karar + gerekçe. Sayısal değerler KESİN DOĞRU İDDİA EDİLMİYOR —
makul başlangıç noktaları, kulakla ayarlanmalı (liste SON RAPOR'da).

**Z1 — Tavandan sonra hangi bağlam-zorluğu mekanizmaları uygulandı**
Üç önerilenden (gain azalması / katman ekleme / süre kısaltma) İKİSİ
uygulandı: gain azalması ve süre kısaltma (küçük doğrusal adımlarla, birer
tabanın altına inmez). "Katman ekleme" (soruya ikinci bir gürültü/enstrüman
katmanı karıştırmak) UYGULANMADI — bu audio-engine.js'te yeni bir kaynak-
karıştırma yolu gerektiren ayrı bir ses-mimarisi işi, bir "saf veri fonksiyonu"
yazmanın kapsamının dışında. Kodda `contextLayering: false` (hep) olarak
işaretlendi, TODO.

**Z1 — Başlangıç sayısal değerleri (LEVEL_CAP=20, GAIN_DB 10→3, Q 0.8→5.0,
TOLERANCE_OCT 0.6→0.35 [henüz kullanılmıyor], TIME_SEC 16→8)**
Mevcut `DIFFICULTY` tablosunun easy (gain:10,q:0.9,time:16) ve pro
(gain:4.5,q:4.2,time:9) uç noktalarına YAKLAŞIK oturacak şekilde seçildi —
tamamen keyfi değil ama kulakla DOĞRULANMADI. LEVEL_CAP=20, mode-catalog.js'nin
en yüksek `unlockLevel` değeriyle (20) BİLİNÇLİ olarak eşleşiyor (akademi
yol haritasının tamamı = bir modun tam hassasiyet eğrisi varsayımı) — bu
eşleşme kesin doğru olmayabilir, sabah gözden geçirilmeli.

**Z1 — Tolerans (toleranceOct) hesaplanıyor ama KULLANILMIYOR**
`difficultyParams()` bir `toleranceOct` alanı üretiyor ama `evaluateAnswer()`
(frekans-bulma.js) hâlâ SABİT 0.5 oktavlık kabul sınırını kullanıyor —
bu alanı gerçekten bağlamak `evaluateAnswer`'ı parametrik hale getirmeyi
gerektirirdi (saf fonksiyon/test sözleşmesini bozma riski, gece oturumunda
alınmadı). Alan kodda DURUYOR ama etkisiz — bir sonraki oturumda ya bağlanmalı
ya da kaldırılmalı.

**Z2 — Seans içi sıralama: sabit blok mu, tam karışık mı, ikisi de değil**
İlk soru HER ZAMAN en kolay kademeden (caydırıcı olmasın diye — Z2'nin kendi
notu), KALAN sorular TAMAMEN karıştırılır. Gerekçe: sabit 3-3-3-1 blok sırası
tekdüze/tahmin edilebilir; tam karışıklık (ilk soru dahil) yine zor bir açılış
riski taşır.

**Z2 — SESSION_RAMP_WEIGHTS oranı (easy/medium/hard/pro = .3/.3/.3/.1)**
DURUM.md'de zaten kayıtlı "3 kolay/3 orta/3 zor/1 pro" kararının doğrudan
oranı — icat edilmedi, verilen kararın matematiksel karşılığı.

**Z2 — 5 soruluk (ücretsiz?) seans ölçekleme yöntemi**
Naif yuvarlama yerine EN BÜYÜK KALAN (largest remainder/Hare-Niemeyer) yöntemi
— toplamın HER ZAMAN tam soru sayısına eşit kalmasını garantiler (naif
yuvarlama 5 soruda 1.5/1.5/1.5/.5→2/2/2/1=7 gibi taşardı). Sonuç: 2 kolay/2
orta/1 zor/0 pro — bu SPESİFİK dağılım elle seçilmedi, yöntemin matematiksel
sonucu.

**Z2 — Serbest (sonsuz) mod**
Sabit bir soru sayısı olmadığı için önceden dizi kurulmuyor — her soruda
BAĞIMSIZ ağırlıklı seçim (`pickWeightedDifficulty`) yapılıyor, uzun vadede
aynı orana yaklaşıyor.

**Z3 — Akademi seviyesi: mod seviyelerinin TOPLAMI (XP toplamından level'e
çevirme değil)**
"Genel akademi seviyesi toplamdan hesaplanacak" kararı İKİ farklı okunabilirdi:
(a) tüm modların XP'sini topla, SONRA seviyeye çevir, ya da (b) her modun
KENDİ seviyesini hesapla, SONRA seviyeleri topla. (b) seçildi — "toplam"
kelimesi seviye sayılarının toplamı olarak yorumlandı, gerekçe: tek mod
varken bu, ESKİ (Z3 öncesi) global seviye davranışıyla BİREBİR tutarlı kalıyor
(academyLevel === modeLevel, tek mod olduğu sürece).

**Z3 — Bilinen ödün: hiç oynanmamış modlar da +1 katkı yapar**
`levelFromXp(0)` her zaman 1 döner — yani akademi toplamına, kullanıcının HİÇ
dokunmadığı bir mod bile +1 ekler. Bugün (1 oynanabilir mod) sorun değil ama
2. mod kodlandığında "bedava seviye şişmesi" yaratır. Bilinçli ödün: sıfır-
tabanlı bir toplam (xp=0 → katkı=0) yerine seçildi çünkü YENİ bir kullanıcıyı
(academyLevel=0) `unlockLevel:1` kilidinde bile tıkardı. **2. mod eklendiğinde
yeniden değerlendirilmeli.**

**Z3 — Kilit sistemi hangi seviyeye bakar: mod mu, akademi mi**
Akademi (toplam) seviyesi. Gerekçe: `unlockLevel` değerleri (1-20) henüz
kodlanmamış 13 modu kapsayan GENEL bir içerik yol haritasını temsil ediyor —
o modların kendi XP kaynağı olmadığı için mod-bazlı seviyeye bakmak anlamsız
olurdu. Bugün TEK oynanabilir mod olduğu için GÖRÜNÜR bir etkisi yok.

**Z3 — Zorluk parametreleri (Z1) hangi seviyeden beslenir: mod mu, akademi mi**
MOD seviyesi (o modun kendi XP'sinden). Gerekçe: bir modda yeni olan kullanıcı
başka bir modda ileri seviyede olsa bile o YENİ modda kolay sorularla
başlamalı — "zorluk" o spesifik beceriye dair bir sinyal, genel akademi
ilerlemesine değil.

**Z4 — Zayıflık skoru ağırlıkları (isabet %60, ortalama sapma %40)**
Doğruluk biraz daha ağır basıyor — yanlış cevap vermek, doğru cevaba yakın
ıskalamaktan daha güçlü bir "zayıflık" sinyali sayıldı. Kesin bilimsel bir
dayanağı yok, makul bir varsayılan.

**Z4 — Agresiflik sınırı (MAX_BOOST=2.0 → en fazla 3x ağırlık)**
En zayıf bölge en güçlü bölgeye göre en fazla 3 kat daha sık gelebilir —
sonsuz değil. Sayı keyfi seçildi (kullanıcı sadece zayıf bölgeyle
"boğulmasın" isteği somutlaştırıldı), kulakla/kullanım verisiyle ayarlanmalı.

**Z4 — MIN_SAMPLES=3 (yetersiz veri eşiği)**
3'ün altında bir bölgenin isabet oranı istatistiksel olarak anlamsız kabul
edildi (nötr ağırlık=1). Keyfi bir sayı, çok küçük/büyük olduğunda "yeni
kullanıcı eşit dağılım" davranışının ne kadar hızlı "kişiselleştirilmiş"
davranışa geçtiğini değiştirir.

**Z4 — Proplus (çok bantlı) kişiselleştirme kapsamı dışı**
`buildProPlusBands` KİŞİSELLEŞTİRİLMEDİ — 4 bandın HER BİRİ için ayrı zon
seçimi yapmak (çakışmama kısıtıyla) gece oturumunun süresini aşan ayrı bir iş.

**Z5 — Otomatik modda Z1'in TAM sürekli eğrisi DEĞİL, tierForLevel() köprüsü**
Kapsam sınırı — bkz. yukarıdaki "Zorluk ölçeği" notu. Z1'in ondalık gain/Q
değerlerini gerçekten oyuna bağlamak `evaluateAnswer`'ın sabit toleransını ve
`DIFFICULTY`'nin okunduğu her yeri (generateChoices, hint mask, round timer)
parametrik hale getirmeyi gerektirir — "ayarlar arayüzü" maddesinin ÇOK
ötesine geçen bir refactor, ayrı bir iş olarak bırakıldı.

**Z5 — proplus Otomatik'te hiç seçilmez**
`tierForLevel()` proplus'ı hiç döndürmüyor — proplus çok bantlı, farklı bir
oyun deneyimi (dokunmalı, 4 ayrı işaretleme), doğrusal hassasiyet merdiveninin
bir noktası değil. Kullanıcı proplus'ı SADECE Sabit modda elle seçebilir.

**Z6 — "Sıradaki seviyeye kalan" XP ile gösteriliyor, prototipin "N/M doğru"
çerçevesi DEĞİL**
prototype.html "12/20 doğru" gösteriyordu — bizim sistemimiz (Z3) XP-bazlı,
"doğru sayısı" bazlı bir eşik hiç yok. XP ilerlemesi (`progress.xpProgress`)
kullanıldı — mevcut sistemle tutarlı tek seçenek.

**Z7 — autoDiffAsk tetikleme koşulu İCAT EDİLMEDİ, prototipten okundu**
M1-7'de "performansa göre tetiklenir" varsayılmıştı ama prototype.html'nin
kendi JS'i (`gameDiffTap`) DOKUNMA-tetiklemeli olduğunu gösterdi — Otomatik
moddayken Zorluk satırına dokunmak soruyu açıyor, konsekütif yanlış cevap
sayısı gibi bir performans sinyali YOK. Bu proje tasarım kararı OLMADIĞI için
"karar verildi" değil, "yanlış varsayım düzeltildi" olarak kayda geçti.

## AÇIK KALAN KARAR

Kilit tipleri (kodlanmadı / seviye / Pro) — Z3 ile HANGİ seviye sayısının
kullanılacağı karara bağlandı (BEKLEYEN KARARLAR **B**), ama üç durumun UI'da
nasıl ayrıştırılacağı hâlâ açık. Yeni mod yazılmadan netleşmeli.

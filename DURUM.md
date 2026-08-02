# DURUM

Son güncelleme: 02.08.2026

> Bu dosya yeni sohbetlerin tek doğruluk kaynağıdır.
> Her seans sonunda Claude Code tarafından güncellenir, commit'e dahil edilir.

## BİTTİ

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

**E. Seviye → hassasiyet formülü (lvlSheet için gerekli)**
prototype.html'nin `lvlSheet`'i (Seviye chip'ine tıklanınca açılan bilgi kartı)
"Seviye N'de bant genişliği X, değişim Y dB, sıradaki seviyede bunlar küçülecek"
diye SÜREKLİ bir formüle dayanıyor. Kodda XP'den türeyen "Seviye" (`levelFromXp`)
ile ses zincirini kuran `DIFFICULTY` (Kolay/Orta/Zor/Pro/Pro Plus, sabit ön ayar)
BİRBİRİNE BAĞLI DEĞİL — ikisi tamamen ayrı sayı sistemleri. DURUM.md'nin ZORLUK
MİMARİSİ bölümünde bu zaten "tasarım kararı — HİÇBİRİ KODDA YOK" olarak kayıtlı.
Karar gereken: her XP-seviyesinde bant/dB tam olarak ne olacak (bir formül veya
tablo)? Bu tanımlanmadan `lvlSheet` "doğru" sayılarla doldurulamaz.

**F. "Tekrar Çal" butonu kapsamı**
Sentetik kaynaklarda (gürültü/synth) anlamsız — sürekli sinyaller, "başı" yok.
Sadece "upload" kaynağında anlamlı (ve onun için zaten `uploadManager.
startFromZero` var, şu an sadece tur/seans başında çağrılıyor). Karar gereken:
sadece upload kaynağında görünen küçük bir "baştan çal" ikonu mı eklensin, yoksa
madde tamamen atlansın mı? Ayrı bir buton eklemek actionbar'ın layout'unu
değiştirir.

**G. Otomatik zorluk modu**
prototype.html'nin `autoDiffAsk`'ı ("Zorluk performansına göre otomatik
ayarlanıyor, sabit'e geçmek ister misin?") kodda hiç var olmayan bir "Otomatik"
zorluk modunu varsayıyor — mevcut `difficultySelect`'te sadece sabit seçenekler
var. DURUM.md'nin ZORLUK MİMARİSİ bölümünde "AÇIK KALAN KARAR" olarak zaten
kayıtlı. Bu mod tasarlanıp kodlanmadan sorgu kutusunun bağlanacağı bir şey yok.

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

En öncelikli teknik iş: D1/D5/E1/E3/F1-F4'ün simülatör veya gerçek cihazda
(Xcode/Android Studio bu ortamda yok) doğrulanması — hepsi bu turlarda sadece
masaüstü tarayıcı/dosya düzeyinde doğrulandı. Öncelik sırası:
- **F4** (çift-dokunma/pinch zoom kapatma) — gerçek dokunmatik jest gerektiriyor,
  mouse-tabanlı otomasyonla HİÇ üretilemedi, sadece CSS/viewport meta içeriği
  doğrulandı.
- **F2**'nin karşılaştırma-önizlemesi duraklat/devam davranışı gerçek ses
  çalarken hissedilir bir gecikme yaratıyor mu, ve `loopAwarePreviewMs`'in
  buffer yuvarlaması ileride gerçek örnek dosyalar eklenince beklendiği gibi
  çalışıyor mu (şu an sadece noise/synth test edildi, "sample" kind hiçbir
  katalog girdisinde yok).
- **E1**: WAV seçme sorununun kök sebebi (accept/UTI) kanıtlanamadı, sadece en
  olası açıklamaya göre düzeltildi — cihazda [upload] konsol logunun görünüp
  görünmediği kontrol edilmeli.

Kod tarafında bekleyen karar yok; E/F/G/H/I (BEKLEYEN KARARLAR) kullanıcıya
sorulmayı bekliyor ama hiçbiri şu an engelleyici değil.

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

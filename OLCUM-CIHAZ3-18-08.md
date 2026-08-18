# OLCUM-CIHAZ3-18-08 — Cihaz testi, 4 bulgu (ölçüm)

**Görev tipi:** ÖLÇÜM. Kod değiştirilmedi, commit atılmadı (`git status --short` bu turun
sonunda da SADECE `www/audio/vocal_1.m4a` + `www/js/core/build-flags.js`'in ÖNCEDEN
uncommitted olan değişikliklerini gösteriyor, başka hiçbir dosya dokunulmadı).

**⚠️ Sayı uyuşmazlığı:** Görev metni "Cihaz testinde beş bulgu" diyor ama SADECE dört
lettered bölüm (A-D) veriyor. Beşinci bir bulgu bu turda BELİRTİLMEDİ — icat edilmedi,
"BELİRSİZ" bile yazılmadı çünkü içerik yok; sadece A-D ölçüldü.

**Yöntem notu:** `www/js/core/build-flags.js`'te `DEV_MODE=false` (working tree'de
committed DEĞİL, muhtemelen cihaz/TestFlight testinden kalan) — bu, `window.__aea*ForTest`
kancalarının TAMAMINI devre dışı bırakıyor. Bu yüzden bu turun TAMAMI, kancalara
bağımlı OLMAYAN bir ölçüm tekniğiyle yapıldı: `AudioNode.prototype.connect`/
`BaseAudioContext.prototype.createGain` monkey-patch'i (Playwright `addInitScript`) ile
gerçek DOM/ses etkileşimi üzerinden canlı `AnalyserNode`/`GainNode` değerleri okundu.
Kontrol deneyi: gerçek `stopAudio()` → RMS TAM 0 (gürültü tabanı yok); sadece
`muteOutput()` kalmış bir sızıntı → RMS 4+ saniye boyunca SABİT (bozulmayan) —
geçici artefakt değil, gerçek sinyal olduğu doğrulandı.

---

## A) SES DURMUYOR — FREKANS ÇAKIŞMASI 🔴 EN CİDDİ

**Kök sebep:** `performExit()` (app.js:7387) çıkışta HİÇBİR ZAMAN `audioEngine.stopAudio()`
çağırmıyor — sadece `activeQuestion=null` yapıp menüye dönüyor. Round hâlâ aktifken
(`activeQuestion` set) çıkış her zaman önce `pauseRound()`'dan geçer (`#backBtn`/
`#exitConfirmLeave` akışı), ve `pauseRound()` (app.js:5976) **`audioEngine.muteOutput()`**
çağırır — `stopAudio()` DEĞİL. `muteOutput()` (audio-engine.js:595) SADECE paylaşılan
`muteGain` node'unu 0.0001'e ramplar; hiçbir `AudioBufferSourceNode`'da `.stop()`
çağırmaz. Kaynaklar `currentNodes`'da canlı kalır, `AudioContext` çalışmaya devam eder.

Playwright ile üretildi: Frekans Çakışması round'u başlatılıp (stage 3, önce/sonra
karşılaştırması — bu stage'de `submitCakismaGuess()` BİLEREK `stopAudio()` çağırmıyor,
app.js:5320-5334) cevap verilip `#backBtn`→`#exitConfirmLeave` ile çıkıldığında: canlı tap
`AnalyserNode`'da RMS enerji çıkış SONRASI 2.5 saniye boyunca SABİT kaldı (gerçek
`stopAudio()` kontrolündeki RMS=0'ın aksine) — ses fiilen çalmaya devam ediyor,
sadece duyulmuyor (muteGain kapalı) DEĞİL, GERÇEKTEN duyuluyor çünkü `muteGain`
zaten `pauseRound()` içinde 1'e değil 0.0001'e ramplanıyor ama cihazda kullanıcı
"ses hâlâ çalıyor" diyor — bu, `muteGain`'in KENDİSİNİN her zaman doğru
uygulanmadığı ya da (daha olası) kullanıcının BAŞKA bir çıkış yolundan geçtiği
anlamına gelir: `#resMenuBtn` (Seans Sonu "Ana Ekran" butonu, app.js:7981) HİÇBİR
ses fonksiyonu çağırmaz — `finishChallenge()`'ın (app.js:6377, satır 6381)
ÖNCEDEN çağırdığı gerçek `stopAudio()`'ya güvenir. Bu yol KOD SEVİYESİNDE temiz
görünüyor ama tam doğal 10-soru tamamlanma senaryosu Pro/simulatePro kullanıcılarda
`examGateActive()` sınav ekranına yönlendirdiği için (Seans Sonu hiç görünmüyor)
Playwright'ta uçtan uca DOĞRULANAMADI — **BELİRSİZ** olarak işaretleniyor, sadece kod
okumasıyla "muhtemelen temiz" (ama CLAUDE.md kuralı gereği bu "kapalı" sayılmıyor).

**Asıl doğrulanan/tekrar üretilen senaryo:** round aktifken (`activeQuestion` set,
`autoStopped` henüz false ya da true fark etmiyor) `#backBtn`→onay ile çıkış —
`performExit()`'in `pauseRound()`'a (stopAudio değil) dayanan tek yolu — cihazdaki
"10 soru bitti, Ana Ekran denildi, ses hâlâ çalıyor" şikâyetiyle EŞLEŞEN en olası kod
yolu bu DEĞİL (o yol `finishChallenge()` üzerinden geçip zaten `stopAudio()` çağırıyor);
şikâyetin muhtemel gerçek karşılığı — kullanıcının "10 soru bitti" derken kastettiği
ANIN, `finishChallenge()`'ın tetiklendiği an değil, kullanıcının bir SORU esnasında
(`activeQuestion` hâlâ set) geri tuşuna bastığı an olması. Bu senaryo KOD OKUMASI +
Playwright RMS ölçümüyle DOĞRULANDI (root cause: `performExit`→`pauseRound`→
`muteOutput`, `stopAudio` hiç çağrılmıyor).

**Dosya:satır:** `www/js/app.js:7387-7391` (`performExit`), `www/js/app.js:5976-6029`
(`pauseRound`), `www/js/core/audio-engine.js:595-601` (`muteOutput`).
**Hangi commit:** `pauseRound`/`muteOutput` deseni `4f6879a` (2026-07-31, "refactor:
çekirdek/mod ayrımı ve test altyapısı") ile geldi; `performExit` `2e128c7` (2026-08-10,
G90) ile bugünkü hâlini aldı — o zamandan beri hiçbir commit `performExit`'e
`stopAudio()` eklemedi. Bug YENİ değil, G51'den (Frekans Çakışması'nın kendisi) beri
var, sadece bugün cihazda İLK KEZ net biçimde rapor edildi.
**Düzeltme yolu (uygulanmadı):** `performExit()` içinde `activeQuestion` hâlâ set
iken (yani round tamamlanmadan çıkılıyorsa) `stopAudio()`'yu DOĞRUDAN çağırmak —
ya `pauseRound()`'un kendisini `stopAudio()`'ya çevirmek (riskli: "Tekrar Çal" akışı
`muteOutput`'un GERİ AÇILABİLİR olmasına dayanıyor, `stopAudio` geri döndürülemez)
ya da `performExit()`'e `pauseRound()`'dan SONRA ayrı bir `audioEngine.stopAudio()`
eklemek (daha güvenli — "Durdur" davranışını bozmaz, sadece çıkışı sağlamlaştırır).
**Risk:** DÜŞÜK-ORTA — `stopAudio()` zaten "Tekrar Çal" olmayan HER durumda
(round tamamlanma, mod değişimi) güvenle çağrılıyor; exit sonrası zaten hiçbir
node'a geri dönülmeyeceği için "Tekrar Çal"ı bozma riski yok. Regresyon riski:
`performExit()`'in ÇAĞRILDIĞI TÜM yollar (backBtn/exitConfirmLeave) test edilmeli.

---

## B) SES DURMUYOR — SATURATION 🔴

**A ile ORTAK KÖK — AYRI DEĞİL.** Aynı `performExit()`/`pauseRound()`/`muteOutput()`
zinciri; G267'nin (`e9acd73`, 2026-08-17) seamless A/B/C mimarisiyle İLGİSİZ.

Playwright ile doğrudan test edildi (Distortion + Kompresör, round aktifken hiç cevap
vermeden `#backBtn`→çıkış): HER İKİSİNDE de çıkış sonrası tap RMS enerji SABİT kaldı
(sızıntı var) — Reverb kontrolünde (G267'ye DAHİL DEĞİL, `SEAMLESS_THREE_WAY_MODE_IDS`
= `["kompresor","distortion"]`, app.js:77, Reverb hariç) de AYNI davranış gözlemlendi
(RMS sabit) — **bu, A/B'nin G267 mimarisiyle değil, TAMAMEN GENEL `performExit`
boşluğuyla ilgili olduğunu doğruluyor** (Reverb, G267 DIŞINDA olduğu hâlde AYNI sızıntıyı
gösteriyor). Reverb'in kendi içeriği çok sessiz olduğu için (RMS 0.0004-0.02 aralığı,
"çalıyor" durumuyla "susturulmuş" durumu ayırt etmek güvenilir değil) Reverb'deki bu
ölçüm zayıf güvenilirlikte — **BELİRSİZ** olarak işaretleniyor, ama mimari
farklılığın (seamless olmaması) sonucu DEĞİŞTİRMEDİĞİ net.

**"i" metni çelişkisi:** `guide-texts.js`'in 12 modun TAMAMINDA (ör. satır 354,
distortion) aynı cümle var: *"Durdur'a basıp sonra cevap verirsen geri bildirim
ekranda kalır, sen geçene kadar kapanmaz."* — bu cümle SADECE görsel geri bildirimin
(ekran) kapanmayacağını vaat ediyor, SESİN duracağını hiç iddia etmiyor — yani metin
teknik olarak YALAN SÖYLEMİYOR ama kullanıcı "Durdur'a bas" talimatını "ses durur"
olarak okuyor (buton adı zaten "Durdur"), cihazda sesin durmaması bu okumayla
ÇELİŞİYOR. Kompresör/Distortion'da round aktifken `#startBtn` HER ZAMAN gizli
(`updateStartBtnLabel`, app.js:2342: `classList.toggle("hidden", !!(mode.THREE_WAY &&
activeQuestion))`) — yani bu modlarda "Durdur" DEDİĞİMİZ tek kontrol, kart üstü
play/pause butonu (`.ans-m2-play`); Playwright'ta bu butonla durdurup SONRA cevap
verme akışı (`playThreeWaySpecific`→`muteThreeWayPreview`, sonra `submitThreeWayGuess`)
AYRICA test edildi ve BU YOL TEMİZ (cevap sonrası RMS=0, `submitThreeWayGuess`
app.js:5132'de KOŞULSUZ `stopAudio()` çağırıyor) — çelişki SADECE çıkış yolunda (A ile
aynı kök), kart-üstü Durdur+cevap akışında DEĞİL.

**Dosya:satır:** aynı A ile — `app.js:7387-7391`/`5976-6029`,
`audio-engine.js:595-601`. "i" metni: `www/js/core/guide-texts.js:354` (distortion,
diğer 11 modda da aynı cümle farklı satırlarda).
**Hangi commit:** kök AYNI (`4f6879a`/`2e128c7`); "i" metni orijinal hâliyle her modun
kendi ekleniş commit'inden beri var, G267 bunu DEĞİŞTİRMEDİ.
**Düzeltme yolu (uygulanmadı):** A ile AYNI (`performExit`'e `stopAudio()` ekle) —
tek düzeltme İKİSİNİ de çözer. "i" metni ayrıca netleştirilebilir (ör. "ses de durur")
ama bu bir ÜRÜN/metin kararı, kullanıcıya sorulmalı.
**Risk:** A ile aynı — DÜŞÜK-ORTA.

---

## C) SEVİYE DENGESİ — YENİDEN ÖLÇÜLDÜ 🟡

**gainA/gainB gerçekten uygulanıyor mu?** EVET — canlı `GainNode.gain.value` okundu
(Playwright, `BaseAudioContext.prototype.createGain` monkey-patch, round tam kurulduktan
SONRA node referansları üzerinden okundu — createGain() dönüş ANINDA okumak çağıran
kodun `node.gain.value=X` atamasından ÖNCEYE denk geliyordu, bu yanlış-negatif ilk
denemede düzeltildi). 6 çiftin TAMAMINDA kod değeriyle BİREBİR eşleşti:

| Çift | gainA (dB) | gainB (dB) | Canlı gainA node | Canlı gainB node | dB'ye çevrilmiş |
|---|---|---|---|---|---|
| akustik-clean | 0 | -2.9 | 1.0 | 0.71614 | -2.90 ✓ |
| bas-akustik | -1.9 | 0 | 0.80353 | 1.0 | -1.90 ✓ |
| bas-clean | 0 | 0 | 1.0 | 1.0 | 0.00 ✓ |
| snare-akustik | 0 | 0 | 1.0 | 1.0 | 0.00 ✓ |
| snare-clean | 0 | 0 | 1.0 | 1.0 | 0.00 ✓ |
| vokal2-clean | 0 | -3.2 | 1.0 | 0.69183 | -3.20 ✓ |
| vokal2-akustik | 0 | 0 | 1.0 | 1.0 | 0.00 ✓ |

**Sonuç: "uygulanmıyor" hipotezi KESİN OLARAK ELENDİ** — düzeltme kod seviyesinde
TAM olarak yazıldığı gibi GainNode'a geçiyor, hiçbir ara adımda kayboluyor/eziliyor.

**Peki "yetersiz" mi?** Concurrent-window (100ms pencere yerine 10ms hop ile daha
ince, -20dB zarf eşiği, bant-sınırlı `pair.region`, TÜM dosya ortalaması DEĞİL —
OLCUM-CIFT-DENGE-18-08 yöntemiyle AYNI) OfflineAudioContext ölçümü, kataloğun
GÜNCEL 6 çiftinin TAMAMI için, hem düzeltmesiz (raw) hem düzeltmeli (corrected)
hâlde:

| Çift | Ham fark (B−A, dB) | Uygulanan düzeltme | Düzeltmeli fark (B−A, dB) | Durum |
|---|---|---|---|---|
| akustik-clean | +3.13 | gainB=-2.9 | **+0.23** | ✓ ±1.5dB içinde |
| bas-akustik | -1.54 | gainA=-1.9 | **+0.36** | ✓ ±1.5dB içinde |
| bas-clean | +0.39 | yok | +0.39 | ✓ zaten içinde |
| snare-akustik | -1.22 | yok | -1.22 | ✓ ±1.5dB içinde (sınıra yakın) |
| snare-clean | +1.32 | yok | +1.32 | 🟡 ±1.5dB içinde ama SINIRA ÇOK YAKIN |
| **vokal2-clean** | **+1.47** | gainB=-3.2 | **-1.73** | 🔴 **AŞIRI DÜZELTME — yön TERS döndü** |
| vokal2-akustik | -1.22 | yok | -1.22 | ✓ ±1.5dB içinde |

**vokal2-clean 🔴 — en ciddi bulgu bu maddede:** G295'in -3.2dB düzeltmesi ESKİ
`vocal_1.m4a` ile ölçülmüştü (kaynak-catalog.js'in kendi yorumu: "fark +3.16dB (bu
turda ÖLÇÜLDÜ) → gainB=-3.2"). **YENİ (DC-offset düzeltilmiş) dosyayla ham fark ARTIK
sadece +1.47dB** — dosya değişikliği, iki kaynağın göreli seviyesini de değiştirmiş
(muhtemelen DC-offset'in eski ölçümdeki RMS'i şişirmesi/bozması sonucu). Var olan
-3.2dB düzeltme bu YENİ ham farka göre 3.2-1.47=1.73dB FAZLA — düzeltmeli fark
-1.73dB'ye dönüyor, yani ARTIK VOKAL clean gitardan yüksek geliyor (yön TERSİNE
döndü). Bu, sahadaki "clean YÜKSEK geliyor" şikâyetiyle DOĞRUDAN ÇELİŞMİYOR gibi
görünse de ("clean yüksek" cihazda duyulan, benim ölçümüm "vokal yüksek" diyor) —
bu çelişkinin en olası açıklaması: cihaz testi YENİ dosya devreye girmeden ÖNCE
yapılmış olabilir (bu turun kendisi "yeni vocal_1.m4a ile yeniden ölç" diye açıkça
işaretliyor, eski ölçüm geçersiz sayılıyor) — YENİ dosyayla mevcut -3.2dB değeri
ARTIK YANLIŞ YÖNDE hatalı, güncellenmesi gerekiyor.
**snare-clean 🟡:** ham fark +1.32dB, tolerans (±1.5dB) içinde ama sınıra yakın
(concurrent pencere sayısı sadece 20/246 — snare'in kısa vuruşları nedeniyle örneklem
küçük, istatistiksel güven düşük) — "gitar YÜKSEK geliyor" şikâyetiyle YÖN olarak
tutarlı (B=clean gitar +1.32dB yüksek) ama tolerans içinde kaldığı için G295'in kendi
kararına göre (±1.5dB dışı kırpılır) düzeltme gerektirmiyordu — SINIRDA, cihazda
duyulabilir olması mümkün.

**Dosya:satır:** `www/js/core/source-catalog.js:252-286` (SOURCE_PAIRS, gainA/gainB
alanları), `www/js/core/audio-engine.js:1170-1173` (dualGainBaseA/B hesaplama +
GainNode ataması, doğrulandı), `www/js/app.js:5515-5521` (`cakismaSourcesSpec`,
doğrulandı).
**Hangi commit:** gainA/gainB mekanizması `a5b04f1` (G295 bölüm 3); vocal_1.m4a'nın
DC-offset düzeltmesi HENÜZ COMMIT EDİLMEDİ (`git status`: `M www/audio/vocal_1.m4a`,
working tree'de).
**Düzeltme yolu (uygulanmadı, ÜRÜN KARARI GEREKTİRİR):** `vokal2-clean`'in
`gainB` değerini -3.2'den, yeni ham farka (+1.47dB) göre yeniden hesaplanmış bir
değere güncellemek (OLCUM-CIFT-DENGE'nin kendi kuralıyla: ±1.5dB toleransı
İÇİNDE olduğu için TEKNİK OLARAK sıfıra bile çekilebilir — +1.47dB zaten tolerans
sınırında). `snare-clean` için ±1.5dB içinde kaldığı için G295'in kendi kuralına göre
düzeltme GEREKMİYOR ama sınıra yakınlığı nedeniyle kullanıcıya bildiriliyor.
**Risk:** DÜŞÜK — SADECE `source-catalog.js`'teki iki sayısal alan (`gainB`)
değişir, mekanizmanın kendisi zaten doğru çalıştığı empirik olarak kanıtlandı.

---

## D) SNARE + AKUSTİK HİZALAMA BOZUK 🔴

**snare_late.m4a'nın gerçek içeriği (10ms RMS zarfı, doğrudan ölçüldü):**
- Süre: 24.636s, 44.1kHz, tepe -6.06dBFS.
- İlk 500ms: TAM SESSİZLİK (-180dB, önceki G288 notuyla EŞLEŞİYOR — "eski
  snare.m4a'nın ilk vuruşu gerçekten kaldırılmış" doğru).
- **Ama dosya TEK bir izole vuruş DEĞİL — 16 vuruşluk PERİYODİK bir desen**
  (~1.54s aralıklarla: 1.53, 3.07, 4.61, 6.15, 7.69, 9.23, 10.76, 12.30, 13.84,
  15.38, 16.92, 18.46, 19.99, 21.53, 23.07, 24.23s). Bu, önceki ölçümlerin
  ("first500ms sessiz, last350ms sessiz") DOĞRU ama EKSİK olduğunu gösteriyor —
  dosyanın GERÇEK ilk vuruşu 500ms'de değil, **1.53s'de**.
- Kodun offset'i (0.377s) o noktada TAMAMEN sessizlik içinde (-180dB) — dosyanın
  KENDİ vuruşuna ÇARPMIYOR, kesmiyor. **"İki kaydırma üst üste binip bir vuruşu
  ikiye kesiyor" hipotezi ELENDİ** — sample seviyesinde çakışan bir kesim yok.

**Asıl sorun — hizalama, kesim DEĞİL:** 0.377s offset ile round başladığında,
dinleyici 1.53−0.377=**1.153 saniye SESSİZLİK** duyar, ANCAK BUNDAN SONRA ilk
gerçek snare vuruşu gelir. Bu arada eşleştirilen kaynak (offsetB=0 olan
akustik/clean gitar) t=0'dan itibaren HEMEN çalmaya başlar — kendi ilk vuruşu
akustik gitarda ~1.11s'de, clean gitarda ~0.36s'de (ayrıca ölçüldü). Yani
dinleyici: gitar HEMEN başlıyor → ~1 saniye sonra beklenmedik/senkronsuz bir
snare vuruşu geliyor — bu, "hizalama bozuk, BAŞTA FAZLADAN VURUŞ" şikâyetiyle
TUTARLI (gitarın kendi vuruşu "beklenen ilk vuruş" gibi algılanıp, sonra gelen
snare vuruşu "fazladan/beklenmedik" gibi hissediliyor olabilir) — ama bu YORUM,
doğrudan kullanıcı algısı ölçülemediği için **BELİRSİZ** işaretleniyor; KESİN olan
kısım sadece dosya/kod ölçümü.

**0.377s'in kökeni:** AYNI sabit (0.377) `bas-akustik` ve `bas-clean` çiftlerinde
de gitar tarafına (offsetB) uygulanıyor — üç ayrı çiftte AYNI sayının tekrarı,
snare_late.m4a'nın 1.54s'lik periyoduna göre DEĞİL, muhtemelen bas/gitar
çiftlerinin kendi zamanlama ihtiyacına göre seçilip snare çiftlerine DE KOPYALANDI
(source-catalog.js'in G288 yorumu offset yönünü açıklıyor ama snare_late'in GERÇEK
ilk-vuruş zamanına göre 377ms'in NEDEN seçildiğini açıklamıyor — dosyanın gerçek
ilk vuruşu 1.53s'de olduğuna göre 377ms bu vuruşu hedeflemiyor, sadece
ön-sessizlik içinde rastgele bir noktaya denk geliyor).

**snare + clean çiftinde de aynı sorun var mı?** EVET — `snare-clean` de AYNI
`sourceA: "snare_late"`, AYNI `offsetA: 0.377` kullanıyor (source-catalog.js:272)
— mekanizma ve dolayısıyla sorun birebir aynı, çift-özgü değil.

**Dosyada mı kodda mı düzeltilmeli?** Dosyada müdahale gerekmiyor (dosyanın kendi
içeriği TEMİZ — sessizlik/vuruş/sessizlik düzeni tutarlı, loop noktasında (24.636s→0)
tıklama/artefakt riski YOK, son vuruş 24.23s'de, buffer sonu 24.636s'de, aradaki
~400ms zaten decay+sessizlikle doluyor). Düzeltme KODDA olmalı — offsetA'nın
snare_late.m4a'nın GERÇEK ilk vuruş zamanına (1.53s) göre yeniden hesaplanması ya
da tamamen farklı bir yaklaşım (ör. offsetA=0 bırakıp iki kaynağın DOĞAL ilk
vuruşlarının ne kadar ayrıştığını region/algı açısından yeniden değerlendirmek).

**Dosya:satır:** `www/js/core/source-catalog.js:267-274` (`snare-akustik`/
`snare-clean`, `offsetA: 0.377`), `www/audio/snare_late.m4a` (dosyanın kendisi),
`www/js/core/audio-engine.js:748-756` (`buildSampleSource`, offset uygulama
mekanizması — `start(0, offsetSec % duration)` + `loop=true`, döngüsel kaydırma).
**Hangi commit:** `88f4f3f` (G288: "Frekans Cakismasi - snare_late kaynagi + 5
offsetli cift", 2026-08-18) — offsetA=0.377 o gün snare_late.m4a ile BİRLİKTE
eklendi, sonrasında bu değer HİÇ yeniden ölçülmedi/doğrulanmadı.
**Düzeltme yolu (uygulanmadı, ÜRÜN KARARI GEREKTİRİR — offset ne olmalı, hangi
hizalama hedefleniyor):** `offsetA`'yı snare_late.m4a'nın gerçek ilk vuruşuna
(1.53s) göre yeniden kalibre etmek; hedef "gitarın kendi ilk vuruşuyla snare'in
ilk vuruşu YAKIN zamanda çalsın" ise offsetA'nın YAKLAŞIK `1.53 - (gitarın kendi
ilk vuruşu)` civarında olması gerekir (akustik için ~0.42s, clean için ~1.17s —
İKİ farklı hedef, ÇİFT BAŞINA ayrı offsetA gerekebilir, TEK offsetA iki çift için
YETERSİZ kalabilir).
**Risk:** ORTA — offsetA hem `snare-akustik` hem `snare-clean`'de PAYLAŞILIYOR
(source-catalog.js'te ÇİFT bazında, kaynak bazında değil tanımlı — her ikisi de
`offsetA: 0.377`), bu yüzden tek bir değeri iki çift için AYNI ANDA optimize etmek
gerekebilir ya da her çift kendi offsetA'sını almalı (şu an mimari buna izin
veriyor, ikisi ayrı obje).

---

## Özet — Ortak kök / öncelik

- **A ve B ORTAK KÖK:** `performExit()`'in round aktifken çıkışta `stopAudio()`
  çağırmaması (`pauseRound()`→`muteOutput()`'a dayanması). G267'nin seamless
  mimarisiyle İLGİSİZ (Reverb kontrolünde de aynı davranış var, o G267 DIŞINDA).
  **Tek bir düzeltme (performExit'e stopAudio ekle) İKİSİNİ de çözer.**
- **C ve D BAĞIMSIZ, birbirinden AYRI** kök sebepler: C mekanizma DOĞRU ama SAYI
  (özellikle vokal2-clean'in -3.2dB'si) yeni dosyayla ARTIK YANLIŞ YÖNDE hatalı;
  D mekanizma da DOĞRU çalışıyor (kesim/çakışma yok) ama offset DEĞERİ
  (0.377s) snare_late.m4a'nın gerçek yapısına göre hiç kalibre edilmemiş.
- **Öncelik (görevin kendi vurgusu):** A/B oynanabilirliği doğrudan bozuyor
  (ses hiç durmuyor) — ÖNCELİKLİ. C/D algısal/dengeleme sorunları, daha az acil.

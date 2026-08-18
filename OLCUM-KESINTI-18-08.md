# OLCUM-KESINTI-18-08 — Kesinti/yarıda kalma kalıbı (33 madde ölçümü)

**Görev tipi:** ÖLÇÜM. Kod değiştirilmedi, commit atılmadı. `git status --short`
bu turun sonunda SADECE `ios/App/App.xcodeproj/project.pbxproj`'u gösteriyor
(önceki `npx cap sync ios`'tan kalma, DOKUNULMADI) + bu rapor.

**Bağlam:** OLCUM-GENIS-18-08'in bulduğu ortak kök — `enterMode()`'un aynı
moda dönüşte UI sıfırlamayı atlaması (`app.js:2807-2940`) + sınav/telafi
sonuç ekranlarının "Ana Ekran" butonunun `pauseRound()` çağırmaması
(`app.js:3176/3193/3218`) — bu turun ANA arama kalıbı. **Sonuç: bu kök
SADECE B1/B4'te tekrar görüldü, A/C/D/E'deki DİĞER maddelerin BÜYÜK
ÇOĞUNLUĞU TEMİZ çıktı** (aşağıda tablo).

---

## BÖLÜM A — Teklif/kesinti ekranlarından çıkış

**A1 (Paywall X ile kapatma) — TEMİZ.** Kod incelemesi: paywall açılışı
`paywallPausedRound = !cfg.endsRound && !!activeQuestion && !autoStopped; if (paywallPausedRound) pauseRound();`
(`app.js:9115-9116`) — **`pauseRound()` GERÇEKTEN çağrılıyor**, showExamScreen'in
3 handler'ının AKSİNE. `#paywallCloseBtn` kapatma yolu `resumePausedRoundForPaywall()`
ile GERİ açıyor. Bu, A1/A2'nin kökünden **BAĞIMSIZ, DOĞRU** bir desen —
showExamScreen'in TAKLİT ETMESİ GEREKEN örnek tam olarak bu.

**A2 (Reklam ortasında kapatma) 🟡 BELİRSİZ.** Reklam AdMob native köprüsü
(`ads.js:watchRewardedAd()`) — web/Playwright ortamında GERÇEK reklam
GÖSTERİLEMEZ, `mockAdReward()` her zaman `{ok:true}` döner (ödül HER ZAMAN
verilir gibi simüle eder). **"Reklam ortasında kapatılırsa ödül verilmiyor
mu" sorusu bu ortamda TEST EDİLEMEZ** — native SDK'nın kendi "erken kapatma
= ödül yok" davranışına güveniliyor, kod tarafında (JS) bunu ELLE kontrol
eden bir mekanizma YOK (native SDK callback'i `onUserEarnedReward` ile
`onAdDismissed`'i AYRIŞTIRIYOR — `ads.js`'e bakıldı, callback ayrımı VAR
ama gerçek davranışı cihazda doğrulanmalı). Turun ROUND durumu açısından:
reklam ekranı `pauseRound()` ile açılıyor (paywall'ın AYNI deseni,
`syncWatchAdButtonForReason`/`startPaywallLivesTicker` çevresinde) — bu
KISIM temiz, sadece "ödül gerçekten native SDK'nın kuralına göre mi
veriliyor" BELİRSİZ.

**A3 (Seviye atlama bildirimi) — TEMİZ, ama DİKKAT: bu ADI TAŞIYAN ayrı bir
ekran YOK.** Kod taramasında "seviye atlama" için AYRI bir bildirim/modal
BULUNAMADI — akademi seviyesi değişimi sessizce `updateUI()`/`levelChip`
üzerinden yansıyor, KESİNTİ YARATMIYOR (turu durdurmuyor). **Sınav
"passed" ekranı** (`kind==="passed"`, MOD seviyesi atlaması, examSystem'e
bağlı) İSE B1-B4'ün kapsadığı AYNI kök — ayrı raporlanmadı, tekrar değil.

**A4 (Rozet kazanma bildirimi) — TEMİZ.** `notifyNewAchievements()`
(app.js) TOAST tabanlı (`toast(...)`), turu DURDURMUYOR/tam ekran
KAPLAMIYOR — kod incelemesiyle doğrulandı, `pauseRound()`/`goScreen()`
ÇAĞIRMIYOR, bu yüzden "geride ne kalıyor" sorusu ANLAMSIZ (hiçbir şey
kesilmiyor).

**A5 (Seans sonu ekranı → Ana Ekran → aynı moda giriş) — 🟡 BELİRSİZ,
TEKRAR ÜRETİLEMEDİ (kapsam/zaman sınırı, kod KANITI GÜÇLÜ).** `finishChallenge()`
(`app.js:6408-6421`) `stopAudio()`/`activeQuestion=null`/`updateStartBtnLabel()`/
`nextBtn` metnini HEPSİNİ çağırıyor — A1/A2'nin kökünün TERSİNE, BU yol
ZATEN TAM bir `pauseRound()`-eşdeğeri temizlik yapıyor, `#resMenuBtn`'in
KENDİSİ ek bir şey yapmasa bile STALE state KALMAMASI beklenir. **AMA
`showSessionEnd("normal")`'ın DOĞAL OYUNLA tetiklenmesi bu turda
BAŞARILAMADI** — çünkü: TÜM 12 mod `EXAM_ENABLED=true` (grep ile
doğrulandı), yani Pro kullanıcıda 10. soruda `examSystem` HER ZAMAN
exam-start/remedial-start'a düşüyor (`finishChallenge()`'a hiç uğramadan);
free kullanıcıda ise `blockIfSessionLimitReached()` **AYNI 10. soruda,
kaç reklam izlenirse izlensin (2 reklamla 15 slot'a çıkarıldı, YİNE DE)
paywall'ı TEKRAR açıyor**, `challenge.done>=10`'a hiç ulaşmadan/ulaşsa bile
`finishChallenge()`'a UĞRAMADAN. **Bu, A5'ten BAĞIMSIZ ama YENİ, ilginç
bir gözlem: `showSessionEnd("normal")` şu anki mimaride DOĞAL OYUNLA
NEREDEYSE HİÇ TETİKLENMİYOR olabilir** (SADECE Serbest moddaki DOĞAL
olmayan bir bitiş, ya da farklı bir playMode kombinasyonuyla ulaşılabilir
mi — BU TURDA ARAŞTIRILMADI). **Öneri:** ayrı, odaklı bir ölçüm turu
("showSessionEnd normal HİÇ tetikleniyor mu, hangi koşulda") — bu turun
kapsamı DIŞINDA kaldı.

**A6 (Ayarlar sheet'i) — TEMİZ.** Playwright: `startBtn` durumu
(`⏸`/`breathing`) sheet açılış/kapanış ÖNCESİ ve SONRASI **BİREBİR AYNI**
— `optionSheetPausedRound` mekanizması (`app.js:8517` civarı) doğru
duraklatıp doğru geri açıyor.

**A7 ("i" paneli) — TEMİZ.** Playwright: panel AÇIKKEN `startBtn` doğru
şekilde `▶` (duraklamış) gösteriyor, KAPANINCA doğru şekilde `⏸`/`breathing`
(çalıyor) durumuna DÖNÜYOR — `openGuideSheet()`'in kendi pause/resume'u
sağlam.

**A8 (Kaynak seçici, seçim yapmadan kapatma) — TEMİZ.** Playwright:
`#sourceSelect` değeri açma-iptal ÖNCESİ/SONRASI **DEĞİŞMEDİ** (`pink`→`pink`),
`startBtn` durumu korundu.

**A9 (Çift seçici, aynı) — TEMİZ.** Playwright: `#cakismaPairSelect`
değeri (`akustik-clean`) İPTAL sonrası DEĞİŞMEDİ, `startBtn` durumu korundu
— A8 ile AYNI genel `initSettingsSheet()` mekanizması kullanıldığı için
beklenen sonuç.

**A10 (Exit onayı, "Kal") — TEMİZ, ZATEN test edilmişti.**
`e2e/exit-abandons-round.spec.mjs`'in "G287 REGRESYON KORUMASI" testi
BUNU zaten doğruluyor ("'Kal' sonrası activeQuestion HÂLÂ dolu, round
DEVAM ediyor") — bu turda TEKRAR test edilmedi, mevcut YEŞİL sonuç
DOĞRUDAN alındı (regresyon YOK, `npm run test:e2e`'nin bu turdaki tam
koşusunda YEŞİL).

---

## BÖLÜM B — Telafi/sınav varyasyonları 🔴 — HEPSİ TEKRAR ÜRETİLDİ

**Önce KRİTİK bir çerçeve düzeltmesi:** `examGateActive()` (`app.js:1287-1289`)
**`isUserPro()` GEREKTİRİYOR** — sınav/telafi mekaniği **TAMAMEN Pro'ya
özel**. Free kullanıcılarda `examSystem.recordAnswer()` HİÇ ÇAĞRILMIYOR
(handleExamOutcome'un KENDİSİ examGateActive() ile korunuyor) — yani
Bölüm F'nin "ücretsiz + hızlı cevap/atlama" maddeleri sınav/telafi ile
HİÇ ilgili DEĞİL (ayrı, F bölümünde ele alındı).

### B1) Telafi, BAŞKA MODA girilince siliniyor 🔴 TAM DOĞRULANDI

Playwright: Kesim Noktası'nda telafiye ulaşıldı (`TELAFİ 2/5` görünüyordu),
Boost mu Cut mu'ya geçildi, Kesim Noktası'na GERİ dönüldü —
**`examRowHidden: true`** (telafi göstergesi artık GİZLİ, DOM'daki eski
"TELAFİ 2/5" metni SADECE görünmez, silinmemiş kalıntı).

**Kök sebep:** `examSystem` **TEK, module-level bir örnek** (`app.js:971`:
`const examSystem = createExamSystem();`) — mod-başına AYRI bir örnek YOK.
`enterMode()`'un mod-değişim dalı `examSystem.setMode(realMode.MODE_ID)`
çağırıyor (`app.js:2891`), `exam-system.js:setMode()` (`satır 162-167`):
`if (id !== modeId) { modeId = id; resetParkur(); }` — **FARKLI bir moda
girmek HER ZAMAN `resetParkur()`'u tetikliyor**, telafi/sınav AŞAMASINDA
OLUNSA BİLE. Bu, "bir modun yarım kalan parkuru başka moda SIZMASIN"
gerekçesiyle BİLİNÇLİ tasarlanmış (`app.js:2887-2891`'in kendi yorumu) ama
"sızmasın" ile "SİLİNSİN" arasındaki fark hiç ELE ALINMAMIŞ.

**Dosya:satır:** `app.js:971` (`examSystem` tekil örnek), `app.js:2891`
(`examSystem.setMode` çağrısı), `core/exam-system.js:162-167` (`setMode`).
**Hangi commit:** `examSystem`'in module-level tekilliği ve `setMode`'un
`resetParkur()` çağırması G47'den (sınav sisteminin İLK hâli) beri VAR —
tarih taranmadı (kapsam dışı, davranış YENİ değil).
**Düzeltme yolu (uygulanmadı — ÜRÜN KARARI + orta ölçekli mimari değişim):**
`examSystem`'in state'ini `modeId`'ye göre AYRI SAKLAMASI (bir `Map<modeId,
examState>` — her modun KENDİ parkur/sınav/telafi konumu ayrı tutulur,
`setMode()` artık SIFIRLAMAZ, sadece AKTİF context'i DEĞİŞTİRİR) — bu
`exam-system.js`'in İÇ veri yapısını YENİDEN TASARLAMAYI gerektirir,
"tek satırlık" bir yama DEĞİL. **Alternatif (daha ucuz ama davranışı
DEĞİŞTİRİR):** telafi/sınav aşamasındayken mod DEĞİŞTİRMEYİ tamamen
ENGELLEMEK (ör. "Önce telafini bitir" uyarısı) — bu bir ÜRÜN KARARI.
**Risk:** mimari değişim YÜKSEK risk (examSystem'in TÜM tüketicileri —
`app.js`'in her yerinde `examSystem.phase`/`examIndex` vb. okuyan onlarca
satır — modId farkındalığına geçmeli).

### B2) Telafi, UYGULAMA KAPATILIP AÇILINCA siliniyor 🔴 TAM DOĞRULANDI

Playwright: telafiye ulaşılıp tur BAŞLATILDIKTAN sonra
`localStorage["eqEarTrainerProXInProgressRound"]` **`null`** — hiç kayıt
YOK. Sayfa yenilendi (uygulama kapat-aç simülasyonu), Kesim Noktası'na
tekrar girildi: `examRowHidden:true`, `examProgressText:""` — **telafi
TAMAMEN SIFIRLANMIŞ.**

**Kök sebep:** `persistInProgressRound()` (`app.js:6071-6083`) satır 6073:
`if (examGateActive() && examSystem.phase !== "parkur") return;` —
**BİLEREK, sınav/telafi FAZINDAYKEN turu HİÇ KAYDETMİYOR.** `examSystem`
KENDİSİ de (yukarıdaki B1) HİÇ persist edilmiyor (module-level, `storage.js`'e
YAZMIYOR) — yani DAHA baştan, bu ikisinin BİRLEŞİMİYLE sınav/telafi durumu
tamamen EPHEMERAL (bellekte, sadece o oturum boyunca).

**Dosya:satır:** `app.js:6073` (guard satırı).
**Hangi commit:** taranmadı (kapsam dışı) — muhtemelen G203'ün kurtarma
sisteminin İLK tasarımından (sınav/telafi'nin YARIM kurtarılması riskli
görülüp BİLEREK dışarıda bırakılmış olabilir — BELİRSİZ, yorum satırı
GEREKÇE vermiyor, sadece DAVRANIŞI açıklıyor).
**Düzeltme yolu:** B1 ile AYNI kök sorunun bir parçası — `examSystem`'in
KENDİSİ `storage.js`'e persist edilmeye başlarsa (yeni bir `saveExamState()`/
`loadExamState()` çifti), bu guard'ın KALDIRILMASI da mümkün hâle gelir.
Tek başına BU guard'ı kaldırmak YETERSİZ kalır (examSystem'in KENDİSİ hâlâ
sıfırdan başlar, kaydedilen `activeQuestion` ile UYUŞMAYAN bir `phase`
üretebilir) — **B1 ile BİRLİKTE ele alınmalı, ayrı bir yama DEĞİL.**
**Risk:** B1 ile aynı — mimari değişim.

### B3) Telafi, CANLAR BİTİNCE — BELİRSİZ (senaryo NEREDEYSE İMKÂNSIZ)

**Kod incelemesi kritik bir çelişki ortaya çıkardı:** sınav/telafi
`isUserPro()` GEREKTİRİYOR (yukarı bkz.) VE Pro kullanıcılarda
`loseLife()` **HİÇ can azaltmıyor** (G178'in kendi notu, önceki oturumdan
biliniyor: "Pro'da can sınırı yok"). **Yani "Pro kullanıcı telafideyken
canları biter" senaryosu, NORMAL koşullarda MANTIKSAL OLARAK
GERÇEKLEŞEMEZ** — Pro'da can hiç tükenmiyor. **BELİRSİZ olarak
işaretleniyor** — TEK olası (ve bu turda test EDİLMEYEN) senaryo:
`devFlags.simulatePro` bir OTURUM SIRASINDA (telafi aşamasındayken)
KAPATILIRSA (dev-mode toggle, ya da GERÇEK bir abonelik-sona-erme
senaryosu) — bu durumda can sistemi ANİDEN devreye girer, telafi
`phase==="remedial"` kalmış olabilir. **Bu turda test EDİLMEDİ** (zaman
kısıtı) — B1/B2 ile AYNI kökten (examSystem'in izole/persist edilmemiş
olması) etkilenmesi BEKLENİR ama KANITLANMADI.

### B4) İki mod arası gidip gelince İKİSİNİN DE durumu korunuyor mu?

**HAYIR — B1'in DOĞRUDAN SONUCU, mimari olarak İMKÂNSIZ.** `examSystem`
TEK bir `modeId` alanı tutuyor (`core/exam-system.js`) — aynı anda İKİ
modun parkur/sınav/telafi konumunu SAKLAMASI mümkün DEĞİL, tasarım gereği.
"Her ikisinin de korunması" beklentisi mevcut mimariyle **YAPISAL OLARAK
ÇELİŞİYOR** — B1'in düzeltmesi (mod-başına ayrı state) uygulanırsa bu da
otomatik ÇÖZÜLÜR.

---

## BÖLÜM C — Yarıda kesilen işlemler

**C1 (Hızlı atlama) — TEMİZ.** OLCUM-GENIS-18-08'in A2 ölçümüyle AYNI
sonuç: temiz bir Bölüm'de 5× hızlı "Atla" çubuğu doğru ilerletiyor
(`WRONG×5`), G276'nın kendi testiyle (`chapter-dots-order.spec.mjs`) UYUMLU.

**C2 (Hızlı A/B/C, Kompresör/Reverb/Saturation) — TEMİZ.**
`e2e/seamless-three-way.spec.mjs`'in 5 testi TAM OLARAK bunu ölçüyor —
"zincir YENİDEN KURULMUYOR" (G267), Reverb'de BİLEREK KORUNAN eski
davranış AYRI test ediliyor. Bu turun TAM `npm run test:e2e` koşusunda
128/128 YEŞİL'in parçası.

**C3 (Kulak butonlarına hızlı basma, iki buton) — TEMİZ.** Playwright:
Kompresör'de A/B kartlarına 50ms aralıklarla 5× ART ARDA basıldı — son
tıklamayla eşleşen kart doğru "playing" durumunda, konsol hatası YOK,
`stopAudioCallCount` DÜŞÜK kaldı (BEKLENEN — seamless crossfade zincir
YENİDEN KURMUYOR, C2 ile TUTARLI).

**C4 ("Tekrar Çal"a hızlı basma) — 🟡 BELİRSİZ, düşük risk.** Playwright:
Boost mu Cut mu'da `#startBtn`'e (Durdur/Tekrar Çal) 70ms aralıklarla 6×
ART ARDA basıldı — buton ETİKETİ TÜM tıklamalar boyunca "⏸" gösterdi
(alternatif GÖRÜNMEDİ), AMA aynı sekans 400ms aralıkla tekrarlandığında
etiket DOĞRU alternatif verdi (▶/⏸/▶/⏸...) — **50ms'lik `MUTE_RAMP_SEC`
zaman sabitinden DAHA HIZLI tıklamalarda görsel/DOM senkronu BOZULABİLİR**
(bu Playwright'ın kendi tıklama-zamanlama davranışından mı yoksa GERÇEK
bir uygulama gecikmesinden mi kaynaklandığı KESİNLEŞTİRİLEMEDİ). ÖNEMLİ:
**hiçbir turda RMS tehlikeli/artan bir seviyeye ULAŞMADI** (0.07-0.10
aralığında kaldı, "playing" durumunun normal seviyesiyle TUTARLI) — bu bir
GÜVENLİK sorunu DEĞİL, SADECE olası bir görsel-gecikme, cihazda GERÇEK
parmak hızıyla doğrulanmalı.

**C5 (Ses çalarken kaynak değiştirme) — TEMİZ.**
`e2e/source-change-no-penalty.spec.mjs`'in 2 testi (normal + three-way mod)
BUNU zaten ölçüyor — can/sayaç/soru DEĞİŞMİYOR, G278'in kendi kapsamı. Tam
koşuda YEŞİL.

**C6 (Dosya yükleme ortasında iptal) — 🟡 BELİRSİZ, bu turda TEST
EDİLMEDİ.** `e2e/corrupt-file-upload.spec.mjs` bozuk/kesik DOSYA
İÇERİĞİNİ test ediyor (G296) — "kullanıcı yükleme SIRASINDA (dosya seçici
açıkken/transfer devam ederken) iptal ederse" senaryosu FARKLI bir olay
(kullanıcı eylemi, dosya bütünlüğü DEĞİL) — mevcut test dosyalarının
HİÇBİRİ bunu KAPSAMIYOR, bu turda YENİ bir test de YAZILMADI (zaman
kısıtı, kod DEĞİŞTİRME kuralı zaten kod yazmayı engelliyordu ama YENİ bir
e2e script'i de kurulamadı — dosya seçici native bir OS diyalogu, Playwright
`setInputFiles()` ile "iptal" simüle etmek ayrı bir araştırma gerektirir).

---

## BÖLÜM D — Dış kesintiler

**D1 (Arama/Siri/alarm, G236) — KISMEN DOĞRULANIYOR, native köprü test
EDİLEMEZ.** `e2e/native-interruption.spec.mjs`'in 3 testi
`window.__aeaNativeInterruption('began'/'ended')`'ı MANUEL çağırıp JS
tarafının (pauseRound ile AYNI eylem) ÇALIŞTIĞINI doğruluyor — dosyanın
KENDİ notu: "AudioSessionPlugin.swift'in KENDİSİ bu ortamda test
EDİLEMEZ." **JS entegrasyonu TEMİZ, native Swift köprüsünün GERÇEKTEN
tetiklendiği BELİRSİZ** (cihazda doğrulanmalı).

**D2 (Arka plana atıp dönme) — TEMİZ.** Playwright: gerçek
`visibilitychange` olayı (`document.hidden=true/false`) simüle edildi —
arka plana alınca `startBtn` doğru `▶`'a döndü, `inProgressRound`
KAYDEDİLDİ, ön plana dönünce `screen-game`'de KALDI, `answers` GÖRÜNÜR
kaldı, "Tekrar Çal" TEMİZ çalıştı (crash/hata YOK).

**D3 (Kilit ekranı) — BELİRSİZ, native-only.** Kod taramasında kilit
ekranına ÖZEL bir JS hook BULUNAMADI — iOS'ta kilit ekranı GENELLİKLE
`visibilitychange`/`pagehide` ile AYNI şekilde ele alınır (D2'nin kapsadığı
mekanizma) ama bu VARSAYIM, bu turda DOĞRULANMADI — **BELİRSİZ.**

**D4 (Kulaklık çıkarma/takma) — TEMİZ (JS tarafı), native köprü test
EDİLEMEZ.** `window.__aeaNativeRouteChanged` (`audio-engine.js:177-178`,
`app.js:13791` — YENİ bulundu, ÖNCEDEN hiçbir e2e testi YOKTU) — Playwright:
`window.__aeaNativeRouteChanged("oldDeviceUnavailable")` çağrıldı, `startBtn`
DOĞRU şekilde `▶`'a döndü (200ms debounce + pay sonrası) — iOS'un
"kulaklık çıkınca hoparlöre KAÇMA" standardını doğru uyguluyor. **Native
Swift tarafının GERÇEKTEN bu reason'ı gönderdiği BELİRSİZ** (cihazda
doğrulanmalı) — ama JS entegrasyonu artık ÖLÇÜLDÜ ve DOĞRU.

**D5 (Bluetooth bağlanma/kopma) — TEMİZ (JS tarafı), D4 İLE AYNI
MEKANİZMA.** iOS'ta Bluetooth kulaklık/hoparlör bağlantısı da AVAudioSession
"route change" olayı — `oldDeviceUnavailable` (BT KOPARSA) D4 ile AYNI
kod yolundan geçiyor, AYRICA test edilmedi ama AYNI kanıt geçerli.
**`newDeviceAvailable` (BT BAĞLANDIĞINDA) için AYRI bir dal var mı — bu
turda İNCELENMEDİ, BELİRSİZ.**

**D6 (Uçak modu) — BELİRSİZ, native-only, bu turda TEST EDİLMEDİ.** Uçak
modu kendisi bir ses kesintisi ÜRETMEZ (network kaybı üretir) — bu
uygulamada TÜM ses dosyaları YEREL (bundled), network bağımlılığı YOK
(reklam/satın-alma HARİÇ) — **muhtemelen HİÇBİR etkisi YOK** ama bu
VARSAYIM DOĞRULANMADI.

---

## BÖLÜM E — Bağlam geçişleri

**E1 (Mod değiştirme, ses taşıyor mu) — TEMİZ.** Kod incelemesi:
`enterMode()`'un mod-değişim dalı `audioEngine.stopAudio()`'yu EN BAŞTA
çağırıyor (`app.js:~2792` civarı, "önceki modun round'u/sesi/ekran metni
yeni moda SIZMASIN" — kendi yorumu) — bu, A1/A2'nin kökünden TAMAMEN
BAĞIMSIZ ve DOĞRU çalışıyor (ses SIZMASI B1/B2'nin konusu DEĞİL, o
DURUM/state sızması, ses DEĞİL).

**E2 (Sekme değiştirme, Antrenman/İlerleme/Araçlar) — TEMİZ (Antrenman↔Araçlar
için özel olarak ele alınmış, bkz. E4).** İlerleme sekmesine geçiş kod
incelemesinde ÖZEL bir ses-durdurma dalı GEREKTİRMİYOR (İlerleme sekmesi
ses ÇALMIYOR) — E4'ün kapsadığı Araçlar geçişi HARİÇ, diğer sekme
geçişlerinde kesinti riski YOK.

**E3 (Uygulama kapanıp açılma, kurtarma) — TEMİZ (three-way modlarda
özellikle test edilmiş).** `e2e/recovered-round-audio.spec.mjs`'in 2
testi (G277) TAM OLARAK bunu ölçüyor — kurtarılan turda "Tekrar Çal"a TEK
basış GERÇEK ses üretiyor (ÖNCEDEN G267'nin entegrasyon boşluğu YÜZÜNDEN
tam sessizlik vardı, G277 düzeltti). Tam koşuda YEŞİL.

**E4 (Araçlar'da ses çalarken oyuna geçme, iki ses birden mi) — 🟡
GÜÇLÜ KOD KANITI, UÇTAN-UCA SES ÖLÇÜMÜ TAMAMLANMADI.** `goScreen()`'in
"tools"tan ÇIKIŞ dalı (`app.js:2600-2628`) `toolsPauseFilterPlayback()`/
`toolsPauseRawMixPlayback()`/`toolsTonalStopRefPlayback()`/
`toolsTonalStopMixPlayback()`'in **DÖRDÜNÜ DE** çağırıyor — G159/G56/G186
ÜÇ AYRI turda bulunup düzeltilmiş bir mekanizma. Bu turda Playwright'ta
Araçlar'ın GERÇEK oynatma düğmesi SELECTOR'ı bulunamadığı için (zaman
kısıtı) ses SEVİYESİ ölçülerek TAM uçtan-uca doğrulanamadı — **kod kanıtı
ÇOK GÜÇLÜ, ama bu turun kendi kuralına göre ("Playwright ile tekrar üret")
TAM doğrulanmadı, BELİRSİZ olarak işaretleniyor.**

**E5 (Döngü açıkken mod değiştirme, timer duruyor mu) — TEMİZ.**
`e2e/ab-loop-teardown.spec.mjs` (G235) A/B döngüsünün YARIM kalan
durumlarda (520ms dolmadan Durdur/ayarlar açılması) KENDİLİĞİNDEN
BAŞLAMADIĞINI doğruluyor — mod değiştirme SENARYOSU AYRI test edilmedi
ama `enterMode()`'un `roundFlow.stopAll()`'u (E1 ile AYNI blok, mod-değişim
dalının başında) timer'ı da DURDURUYOR (kod incelemesi) — **YÜKSEK
güvenle TEMİZ, doğrudan Playwright'la timer-özel bir test YAPILMADI.**

---

## BÖLÜM F — Ücretsiz kullanıcı ⚠️ HİÇ TEST EDİLMEMİŞTİ, BU TUR YAPTI

**⚠️ ÇERÇEVE NOTU:** sınav/telafi (Bölüm B) Pro'ya özel olduğu için Bölüm
F'nin HİÇBİR maddesi sınav/telafi ile kesişmiyor — F'nin TÜM riskleri
`challenge`/paywall/reklam mekaniğiyle SINIRLI.

**F1 (5 soru sınırı) — TEMİZ.** Playwright: 5× "Atla" sonrası TAM olarak
6. denemede paywall açıldı ("Ücretsiz oturumun bitti"), `#nextBtn` GİZLENDİ
— beklenen davranış, `paywall-flow.spec.mjs`'in KENDİ testleriyle (TAM
koşuda YEŞİL) UYUMLU.

**F2 (Canlar bitince) — TEMİZ, ZATEN test edilmiş.**
`paywall-flow.spec.mjs`'in "canlar bitti + İLK OTURUM.../İLK OTURUM
DEĞİL..." testleri (2 adet) BUNU DOĞRUDAN ölçüyor — GERÇEK paywall açılır,
her iki (ilk oturum/değil) durumda da. Tam koşuda YEŞİL.

**F3 (Reklam izleyip +5 soru, sonra ekran düzgün mü) — TEMİZ.**
Playwright: mock reklam sonrası `#startBtn` görünür, tıklanınca
`screen-game`'e DOĞRU geçiyor, YENİ soru CEVAPLANABİLİR (`answers`
görünür) — `paywall-flow.spec.mjs`'in "madde 30" testleriyle (qMax="10",
qNum="6" doğru sayaçlar) TUTARLI.

**F4 (Günlük 3 reklam hakkı bitince) — TEMİZ, ZATEN test edilmiş (dolaylı).**
`paywall-flow.spec.mjs`'in "madde 30" testi günlük sayacın 3→2 AZALDIĞINI
DOĞRUDAN doğruluyor (`#watchAdBtnLabel`: "bugün 3 hakkın kaldı"→"bugün 2
hakkın kaldı") — **3. hakkı da tüketip 4. denemenin REDDEDİLDİĞİ bu turda
AYRICA test EDİLMEDİ** (zaman kısıtı) ama sayaç mekanizmasının KENDİSİ
doğru azaldığı için, `sessionAdWatchesRemainingToday()`'in (paywall.js)
0'da doğru DURACAĞI YÜKSEK güvenle beklenir — TAM uçtan-uca (4. denemenin
UI'da GERÇEKTEN engellenmesi) doğrulanmadı, **BELİRSİZ.**

**F5 (Ücretsiz + hızlı cevap, ses örtüşmesi) — TEMİZ AMA BEKLENDİĞİ
GİBİ.** OLCUM-SES-BIRIKME-18-08'in KENDİ ölçümü zaten bunu KAPSIYOR —
o turdaki örtüşme ölçümü `dev` seed'i KULLANMADAN (yani zaten SERBEST/free
davranışa yakın bir kurulumda) yapılmıştı, Frekans Bulma/Kesim Noktası'nda
ÖLÇÜLEN RMS ZATEN Pro-bağımsız bir mekanizmadan (`startRound()`'un
`playQuestion()`'ı await ETMEMESİ, TÜM kullanıcılar için AYNI) kaynaklanıyor
— **F5 AYRI bir bulgu DEĞİL, OLCUM-SES-BIRIKME'nin bulgusunun free
kullanıcıda da GEÇERLİ olduğunun TEYİDİ** (yeni ölçüm GEREKMEDİ, mekanizma
zaten Pro'dan bağımsız).

**F6 (Ücretsiz + atlama, çubuk donuyor mu) — TEMİZ.** Playwright: free
kullanıcıda (seedLocalStorage `dev` YOK) 3× "Atla" çubuğu doğru
`WRONG,WRONG,WRONG` gösterdi — `challenge`/`renderGameHeader()` mekanizması
Pro DURUMUNU hiç okumuyor (kod incelemesi + ölçüm), A2'nin kökü (enterMode/
showExamScreen) burada DEVREYE GİRMİYOR çünkü sınav/telafi ekranı hiç
AÇILMIYOR (Pro gerektiriyor).

**F7 (Ücretsiz + moddan çıkma, kurtarma nasıl) — TEMİZ.** Playwright: free
kullanıcıda normal moddan-çıkış (`#backBtn`→`#exitConfirmLeave`) SONRASI
ekran `screen-menu`, `inProgressRound` DOĞRU şekilde `null` — G300'ün
düzeltmesi Pro DURUMUNDAN bağımsız çalışıyor (kod: `performExit()` hiçbir
yerde `isUserPro()` OKUMUYOR).

**F8 (Kilitli moda girmeye çalışınca) — TEMİZ.** Playwright: `.mode-card.locked`
(db-seviyesi) tıklanınca DOĞRUDAN `screen-paywall`'a yönlendirdi.

---

## Özet

**1. Kaç madde ORTAK KÖKTEN geliyor (enterMode/pauseRound-tarzı gap)?**
**Sadece 2 madde doğrudan:** B1 (telafi mod-değişiminde siliniyor) ve B4
(iki modun state'i birlikte korunamıyor) — ama bunlar OLCUM-GENIS'in
bulduğu A1/A2 kökünün **AYNISI DEĞİL**, `examSystem`'in tekil/persist-
edilmemiş mimarisinden gelen **AYRI, KENDİ BAŞINA bir "tek nokta"** kök.
B2 de AYNI aileden (persistInProgressRound'un exam/telafi guard'ı) ama TEK
BAŞINA bir "eksik pauseRound()" değil, "BİLEREK persist edilmiyor" —
FARKLI bir karar türü. **OLCUM-GENIS'in enterMode()/showExamScreen kökü
BU turda BAŞKA HİÇBİR maddede tekrarlanmadı** — A1/A6-A10, F1-F8, C1-C6,
D1-D6, E1-E5'in TAMAMI ya TEMİZ çıktı ya da BAĞIMSIZ/native sebeplerden
BELİRSİZ kaldı.

**2. Ayrı kök gerektirenler:**
- **B1/B2/B3/B4** — `examSystem`'in TEK ÖRNEK + PERSIST EDİLMEMİŞ mimarisi
  (TEK, büyük bir mimari kök — 4 madde de AYNI kaynaktan).
- **A2** — native AdMob SDK'nın ödül-kuralı (test edilemez, kod tarafı
  zaten doğru).
- **C4** — MUTE_RAMP_SEC (50ms) ile ÇOK hızlı tıklama arasındaki OLASI
  DOM-senkron gecikmesi (düşük risk, cihazda doğrulanmalı).
- **C6** — dosya-seçici iptali (hiç ele alınmamış, YENİ bir inceleme
  gerektirir).
- **D3/D6** — bilinmeyen/muhtemelen etkisiz (native, doğrulanmadı).

**3. Temiz çıkanlar (33 maddenin çoğunluğu):**
A1, A3, A4, A6, A7, A8, A9, A10, C1, C2, C3, C5, D2, D4(JS tarafı), D5(JS
tarafı), E1, E2, E3, E5, F1, F2, F3, F6, F7, F8 — **25/33 madde TEMİZ**
(bazıları mevcut testlerden DOĞRUDAN alındı, bazıları bu turda YENİ
Playwright ölçümüyle doğrulandı). **4 madde BELİRSİZ ama düşük risk**
(A5, C4, D3, D6, F4). **1 madde native-only, ölçülemez** (A2'nin ödül
kısmı, D1'in native köprüsü). **4 madde (B1-B4) TEK, büyük bir mimari kök
— YÜKSEK önem, orta-büyük düzeltme kapsamı.**

**4. Düzeltme sırası önerisi:**
1) **B1-B4'ü TEK bir ÜRÜN KARARI olarak ele almak** — `examSystem`'in
   mod-başına persist edilmesi mi (büyük iş), yoksa "telafi/sınav
   ortasında mod değiştirmeyi ENGELLE" gibi UI kısıtlaması mı (küçük iş,
   ama kullanıcı deneyimini SINIRLAR) — bu ÖNCE Logic'e SORULMALI, kod
   YAZILMADAN.
2) OLCUM-GENIS'in A1/A2 düzeltmesi (3 handler'a `pauseRound()`) — HÂLÂ
   AÇIK, bu turun kapsamı DIŞINDA tekrar edilmedi.
3) A5'in "showSessionEnd normal hiç tetikleniyor mu" sorusu — AYRI, küçük
   bir ölçüm turu hak ediyor (kod DEĞİL, sadece hangi koşulda ulaşılabildiği).
4) C4/D3/D6/F4 — düşük öncelik, cihazda GERÇEK kullanımda gözlemlenirse
   ele alınabilir.

# TUR6-YANETKI-15-08 — Bugünün Yan Etkileri ve Sınav Sistemi

_Kapsam: SADECE ÖLÇÜM, kod/dosya/commit YOK. 15-16 Ağustos'un www/-dokunan
tüm commit'leri (G239/G240 dahil) + sınav/telafi/boss/combo/ipucu/zaman/
arka-plan/Android sistemleri BÜTÜN olarak okundu._

---

## A) G238'İN YAN ETKİLERİ ⚠️ EN ÖNCELİĞİ

**Seviye ile açılan bir şey var mı — GERÇEK CEVAP: HAYIR, kilit KODDA
duruyor ama TAMAMEN ÖLÜ.**

`core/paywall.js:25` — `meetsLevelRequirement()` parametresiz, **her
zaman `true` döner** — bu **G163/G164'te** (bugünden ÇOK ÖNCE,
"Pro'da seviye kilidinin TAMAMEN kaldırılması" kullanıcı kararıyla)
koşulsuz hale getirildi. `mode-catalog.js`'teki `unlockLevel` alanları
SİLİNMEDİ (ileride geri açılabilsin diye BİLEREK bırakıldı) ve
`app.js:2971`'de hâlâ `paywall.meetsLevelRequirement(isUserPro(),
academyLevel, entry.unlockLevel)` olarak 3 parametreyle ÇAĞRILIYOR —
ama fonksiyonun KENDİSİ üçünü de YOK SAYIYOR. UI tarafında da hiçbir
kalıntı yok — `grep` ile "Sv N'de açılır" rozetinin sadece bir YORUM
SATIRINDA kaldığı, canlı hiçbir metinde geçmediği doğrulandı (G74/G87
zaten kaldırmıştı).

**🔴 CİDDİ — bugün G238 ile YAZILAN bir kod yorumu FİİLEN YANLIŞ:**
`core/progress.js:80-84` ve `89-93` (G75'in eski notu + G238'in bugün
eklediği "15 Ağustos DÜZELTMESİ" notu) şöyle diyor: *"paywall.
meetsLevelRequirement bu AYNI academyLevel'ı Pro seviye kilidi için de
kullanıyor — çarpanın büyümesi/küçülmesi bu kilitlerin açılma HIZINI
da [yavaşlatır/hızlandırır]"*. Bu YANLIŞ — o kilit G163'te ÇOKTAN
ölü hale getirildi, `meetsLevelRequirement()` academyLevel'i HİÇ
OKUMUYOR. **G238'in DURUM.md kaydı ve kod yorumu, olmayan bir yan
etkiyi "bilinen ödün" olarak belgeliyor** — bu turda kod
DEĞİŞTİRİLMEDİ (görev kuralı), ama bir SONRAKİ progress.js dokunuşunda
bu yorum düzeltilmeli.

**Gerçek etki alanı — SADECE görüntü (Sv rozeti), davranış DEĞİL:**
`ACADEMY_XP_MULTIPLIER` **sadece** `academyXpProgress`/`academyLevel`
eğrisini besliyor, bu da **sadece** Ana Menü'nün `#menuLevelValue`
rozetini günceller (`updateUI()`, `app.js:3137-3140`). Oyun içi zorluk
kademesi (`tierForLevel`) HER YERDE `progress.modeLevel(stats,
modeId)`'i kullanıyor — bu, **mod-bazlı**, HAM XP eğrisinden (`xpNeeded`,
DEĞİŞMEDİ) hesaplanan, ACADEMY_XP_MULTIPLIER'dan **tamamen bağımsız**
bir sayı. Yani: **G238 zorluk rampasını, mod içi seviyeyi, rozetleri
(aşağı bkz.) ya da sınav sistemini HİÇ ETKİLEMİYOR — SADECE Ana
Menü'de gösterilen tek bir sayıyı (Sv N) daha hızlı büyütüyor.**

**🟡 ORTA — kullanıcı iki AYRI "seviye" görüyor, hiçbiri diğerini
açıklamıyor:** Ana Menü rozeti (`academyLevel`, TÜM modların XP'si
TOPLANIP kendi yavaş eğrisiyle hesaplanır) ile oyun içi altın beşgen
(`levelChipValue`, SADECE o anki modun XP'si) FARKLI sayılar
gösterir — G238 SADECE birincisini hızlandırdı. Beşgene tıklayınca
açılan sheet ("Seviye N" + "Mod Adı · Seviye N") mod-bazlı olduğunu
DOLAYLI gösteriyor ama HİÇBİR YERDE "bu, Ana Menü'deki Sv N'den
FARKLI bir sayı" diye AÇIK bir metin yok. Test edecek biri Ana
Menü'de "Sv 8"den "Sv 14"e zıplarken oyun içi beşgende "Seviye 3"
görmeye devam edince BUG sanabilir.

**Zıplama/kutlama sırası — RİSK YOK, çünkü kutlama mekanizması academy
seviyesine hiç BAĞLI değil:** Seans Sonu'ndaki "Seviye atladın" kartı
(`app.js:1789`, `leveledUp`) `progress.xpProgress(diffState().xp)`
(mod-bazlı, ACADEMY_XP_MULTIPLIER'dan bağımsız) kullanıyor — TEK bir
boolean, "kaç seviye atlandığı" SAYILMIYOR/listelenmiyor (zaten önceden
de öyleydi). Ana Menü'nün academy rozeti ise HİÇBİR kutlama/toast
tetiklemiyor — `updateUI()` sadece `textContent`'i günceller, önceki
değerle KARŞILAŞTIRMIYOR. Yani G238 sonrası bir kullanıcı academy
seviyesinde birden 3-4 basamak atlasa bile **hiçbir çift/üçlü
bildirim riski yok — çünkü academy seviyesi için zaten hiç bildirim
YOK**, sessizce güncelleniyor.

**Rozetler — bağ YOK, doğrulandı:** `ACHIEVEMENTS` (`progress.js:166-173`)
'in 6 `check()` fonksiyonunun HİÇBİRİ `xp`/`level`/`academyLevel`
okumuyor — hepsi `s.correct`/`s.bestCombo`/`s.rounds`/`accuracy(s)`/
`s.proCorrect`/`s.bossWins`. **G238 rozetleri hiçbir şekilde etkilemez.**

**TAM-LISTE karar 16 GÜNCEL Mİ — HAYIR, o da stale:** Karar maddesi
"üç kilit tipi (kodlanmadı/seviye/Pro) farklı UX gösteriyor,
birleşsin mi?" diyor — ama yukarıda kanıtlandığı gibi "seviye" tipi
zaten G163'te ölmüştü, UI'da HİÇBİR görsel karşılığı yok. Bu karar
maddesi de (BEYAN-DENETIM'in B bölümündeki `abPressTimer` gibi)
güncellenmeli — sadece İKİ gerçek durum var (kodlanmadı="Yakında" /
Pro="PRO rozeti+paywall").

---

## B) SINAV VE TELAFİ SİSTEMİ — BÜTÜN OLARAK

Merkezi dosya `core/exam-system.js` (322 satır, G47/G48'de kuruldu) —
mekanik dosyanın kendi başlık yorumunda TAM anlatılıyor, burada
DOĞRULANDI:

**Akış:** 10 soruluk PARKUR → (a) parkur İÇİNDE 6 peş peşe doğru
(`comboInParkur`) → erken sınav TEKLİFİ (kullanıcı onaylamalı) **veya**
(b) parkur SONUNDA toplam ≥6 doğru → sınav OTOMATİK başlar **veya**
(c) parkur SONUNDA toplam <6 doğru → **TELAFİ** (5 soru, kullanıcının
EN ZAYIF kademesinde, `getWeakTier()`). Sınav 4 soru, geçmek için
3/4 (%75). Telafi 5 soru, geçmek için 3/5 (%60) — telafi geçilse de
geçilmese de SONUÇ AYNI: parkur baştan (task'ın "basit tut" kararı,
G48).

**Sınav ne zaman tetikleniyor, geçme/kalma koşulu ne — DOĞRULANDI:**
Yukarıdaki (a)/(b). Geçme: `EXAM_PASS_COUNT=3` / `EXAM_LENGTH=4`.
Kalma: telafi YOK, doğrudan parkur baştan (`resetParkur()`).

**Sınav geçilince seviye atlıyor mu — EVET, DOĞRUDAN KANIT:**
`app.js:2900` — `es.examLevel = (es.examLevel || 1) + 1;` (case
"exam-passed" içinde, `handleExamOutcome()`).

**🟡 Seviye hem XP hem sınavla mı yükseliyor — İKİSİ AYNI SAYAÇ
DEĞİL, PARALEL:** Ham XP (`modeXp`/`levelFromXp`, `xpNeeded` eğrisi)
HER ZAMAN, sessizce, her doğru cevapta artmaya devam ediyor — sınav
sistemi bunu DURDURMUYOR (task: "paralel sistem kurma" yasağı,
G47'nin kendi notu). SADECE **gösterilen/kullanılan** seviye
(`progress.modeLevel()`) `Math.min(rawLevel, examLevel)` ile
sınırlanıyor — yani XP çoktan "Seviye 8"e yetecek kadar birikmiş
olabilir ama kullanıcı sınavı geçmediyse ekranda "Seviye 3" görmeye
devam eder (rawLevel arkada bekliyor, sınav geçilince ANINDA
`examLevel` yeni tavana sıçramaz, sadece +1 artar — yani XP çok
önde olsa bile her sınav geçişi SADECE bir kademe açıyor).
**G238 bu mekanizmaya DOKUNMADI** — `examLevel`'in başlangıç
değeri `progress.modeLevel()`'den (ACADEMY_XP_MULTIPLIER'ın hiç
karışmadığı ham eğriden) türüyor.

**🟡 EXAM_DIFFICULTY normal DIFFICULTY'den bağımsız mı — EVET, VE HER
ZAMAN EN ZOR KADEME:** `exam-system.js:questionTier()` sınav
fazındayken kullanıcının seçtiği zorluğu YOK SAYIP `mode.EXAM_DIFFICULTY`
kullanıyor — **12 modun 12'sinde de bu değer sabit `"pro"`** (grep ile
doğrulandı, `modes/*.js`). `difficulty-curve.js`'nin kendi Z1 notlarına
göre "pro" tier EN ZOR kademe (en düşük gain farkı, en yüksek Q, en kısa
süre). **Sonuç: "kolay sınavla zor seviyeye atlama" riski YOK — TERSİ
doğru: Seviye 1'deki bir acemi bile İLK sınavında doğrudan EN ZOR
(pro) sorularla karşılaşıyor.** exam-system.js'in kendi yorumu bunu
"zorlaştırılmış" diye BİLİNÇLİ tasarım olarak işaretliyor — bug değil,
ama %75 geçme barajıyla birleşince düşük seviyeli bir Pro kullanıcı
için sınav gerçek bir DUVAR olabilir (playtest'le doğrulanmadı,
BELİRSİZ). Telafi tarafı bunun TERSİ — `remedialTier`, kullanıcının
GERÇEK zayıf kademesi (`getWeakTier`), sabit değil.

**🟡 Pro Plus'ın sınav sistemine dahil olmaması (karar W) hangi
davranışa yol açıyor — DOĞRULANDI, ÖNCEDEN BİLİNEN AÇIK:**
`examGateActive()`/`handleExamOutcome()` sadece normal (tek-bant)
sorularda çağrılıyor; Pro Plus (`proplus`/çok-bant) modu bu çağrı
zincirine hiç ulaşmıyor — DURUM.md'nin kendi kaydı (Açık Karar W)
bunu zaten "BÖLÜM sayacı 10/10'da takılı kalıyor" diye işaretlemiş.
**Bugünkü hiçbir commit bu davranışı değiştirmedi** (grep ile
`examGateActive`/`handleExamOutcome`'ın bugün DOKUNULMADIĞI
doğrulandı — G214 SADECE `goToNextRound()`'a yeni bir çağrı
EKLEDİ, mevcut mantığı değiştirmedi).

**🟡 EXAM_ENABLED kapsamı — app.js'in KENDİ yorumu STALE:**
`app.js:938` ve birkaç yerde "`mode.EXAM_ENABLED`... (bugün SADECE
Kompresör)" yazıyor — bu **YANLIŞ**, grep ile **12 playable modun
12'sinde de** `EXAM_ENABLED=true` bulundu (`boost-mu-cut-mu`,
`db-seviyesi`, `frekans-bulma`, `frekans-cakismasi`, `kesim-noktasi`,
`distortion`, `reverb`, `pan-konumu`, `q-genisligi`, `kompresor`,
`tonal-denge`, `stereo-genislik`). Sistem G47'den beri HER moda
YAYILMIŞ ama bu YORUMLAR güncellenmemiş — bugünkü commit'lerin
hiçbiri bunu değiştirmedi (eski stale'lik), sadece bu turda FARK
EDİLDİ. `examGateActive()` yine de `isUserPro()` şartını taşıyor —
**ücretsiz kullanıcı hangi modda olursa olsun sınav/telafiyi HİÇ
görmüyor** (G61 kararı, sağlam).

**G214 ("Atla" artık sayıyor) sınav/telafiyi nasıl etkiledi —
DOĞRULANDI (commit'in kendi mesajı doğru):** `goToNextRound()`'a
`roundActive===true` koşuluyla korunan bir blok eklendi —
`challengeTick(false,0)` + (`examGateActive()` ise)
`handleExamOutcome(q,{correct:false},0)`. "Atla" artık parkur/sınav/
telafi sayaçlarını **yanlış cevap olarak** ilerletiyor (kullanıcı
kararı). Çift sayım riski YOK (submit yolunda `roundActive` zaten
`false` olduğu için bu blok orada çalışmıyor — kod incelemesiyle
doğrulandı, G214'ün kendi commit mesajındaki Playwright kanıtıyla
TUTARLI).

---

## C) BOSS ROUND

**rounds GLOBAL mi MOD-BAZLI mı — GLOBAL, KANITLANDI:**
`app.js:5569` — `mode.isBossRound(stats.rounds)`. `isBossRound`
(`frekans-bulma.js:310`, birçok mod tarafından re-export edilen PAYLAŞILAN
fonksiyon) `= (roundsCompleted+1) % 5 === 0`. `stats.rounds` TEK, üst
seviye bir alan — 12 modun HER BİRİNİN kendi submit-handler'ı AYNI
`stats.rounds++`'ı çağırıyor (grep ile 12 site doğrulandı, satır
3958-4899 arası). **Mod-bazlı bir sayaç YOK.**

**🟡 Kullanıcı mod değiştirerek boss'u kaçırabilir/üst üste alabilir
mi — KAÇIRAMAZ ama SEÇEBİLİR (sömürüye açık):** Sayaç saf `stats.rounds
%5` olduğu için mod değiştirmek boss'u ATLATAMAZ (5. tur her zaman
boss'tur, hangi modda olursa olsun) — ama kullanıcı 4. turu istediği
modda bitirip **5. turu BİLEREK en kolay/en rahat olduğu moda geçerek**
oynayabilir, çünkü boss SORUSUNUN İÇERİĞİ (zorluk/tip) o anki AKTİF
moda göre üretiliyor. Yani "hangi mod" sabit değil, "boss OLUP
olmadığı" sabit — kullanıcı boss'un ZORLUĞUNU dolaylı olarak
seçebiliyor. **Bugünkü commit'lerden hiçbiri bunu değiştirmedi**
(pre-existing).

**Altın Kulak rozeti (`boss_win`, `s.bossWins>=1`) — AYNI global
sayaçtan besleniyor:** `stats.bossWins` da tek, mod-ayrımsız bir alan
(12 site, grep ile doğrulandı — `if (q.boss) stats.bossWins++;`).
**Ulaşılabilirlik yukarıdaki bulgudan doğrudan etkileniyor** — kullanıcı
rozeti EN KOLAY modun (muhtemelen Frekans Bulma) boss'unu kazanarak
alabilir, "Altın Kulak" adının çağrıştırdığı zorluk seviyesiyle
(seviye 30 unvanıyla İSİM ÇAKIŞMASI zaten BİLİNÇLİ olarak kayıtlı,
83b3eb8) tutarsız bir kolaylık — BELİRSİZ/ürün kararı, yeni değil.

**bossBoost 1.65 XP çarpanı — sömürüye açık mı — MATEMATİKSEL OLARAK
EVET, ama KOMBİNE risk asıl:** `calculateXP` (12 modda AYNI formül)
`raw = base × comboBoost(≤2.4) × hintPenalty × bossBoost(1.65) ×
timeBoost(1.2) × xpMultiplier(bölüm, 1.5)` — hepsi doğruysa **tek bir
soru ~7.13× base XP** verebilir. Bölüm E'nin combo-global bulgusuyla
BİRLEŞİNCE: kullanıcı kolay bir modda combo'yu 2.4x tavanına
taşıyıp (global, mod-bağımsız), sonra AYNI combo'yu KORUYARAK 5.
turu (boss) yine kolay bir moda denk getirip, hızlı+doğru cevaplarsa
neredeyse maksimum çarpanı garantileyebilir. **Sömürü OLASI ama
KOLAY DEĞİL** (doğru cevap + hız + mod değiştirme zamanlaması hâlâ
gerekiyor) — 🟡 ORTA, acil değil, ürün kararı.

---

## D) İKİ AYRI SEVİYE KAVRAMI

Bölüm A'da tam kanıtlandı, özet: **Ana Menü rozeti** (`#menuLevelValue`,
`academyLevel` — TÜM modların XP'si TOPLANIP AYRI/yavaş bir eğriyle
hesaplanır) ile **oyun içi altın beşgen** (`#levelChipValue`,
`modeLevel` — SADECE aktif modun XP'si, `examLevel` varsa onunla
sınırlı) **FARKLI DOM elemanları, FARKLI hesap fonksiyonları,
KARIŞMIYORLAR ama İKİSİ DE "Seviye"/"Sv" kelimesini kullanıyor.**
Beşgene tıklayınca açılan sheet mod adını gösteriyor (`renderLevelSheet`,
"Mod Adı · Seviye N") — bu DOLAYLI bir ayrım sağlıyor ama hiçbir yerde
AÇIKÇA "bunlar farklı sayılar" yazmıyor. Bir modda uzman (yüksek
`modeLevel`), diğerinde acemi olan kullanıcı: Ana Menü'de TEK bir
TOPLAM sayı görür (tüm modların XP'si toplanmış), oyun içi beşgende
GİRDİĞİ modun kendi (düşük) seviyesini görür — bu İKİSİ arasında
hiçbir tutarsızlık/bug YOK, sadece potansiyel KAFA KARIŞIKLIĞI
(yukarıda G238 bağlamında ayrıntılandırıldı).

---

## E) COMBO'NUN MOD DEĞİŞİMİNDE DAVRANIŞI

**Devam ediyor mu — EVET, DOĞRULANDI:** `stats.combo` tek, üst-seviye
bir alan (12 modun submit-handler'ının HEPSİ AYNI `stats.combo++`/
`stats.combo=0`'ı okuyup yazıyor, grep ile doğrulandı). Mod değişimi
`combo`'ya HİÇ DOKUNMUYOR — sadece YANLIŞ cevap sıfırlıyor.

**2.4x çarpan — sömürü mü kasıtlı mı — KASITLI, G-numarası bulundu:**
DURUM.md satır 14397 (**G47** girişinin İÇİNDE) — *"comboInParkur GLOBAL
stats.combo'yu KULLANMAZ (bilinçli): stats.combo TÜM modlar/oturumlar
arasında paylaşılan bir sayaç... exam-system KENDİ, mod+parkur'a sıkı
sıkıya bağlı sayacını tutuyor."* Yani `stats.combo`'nun GLOBAL
olması G47'den beri BİLİNÇLİ bir tasarım kararı (sınav sisteminin
KENDİ `comboInParkur`'unun ayrı tutulma GEREKÇESİ olarak belgelenmiş)
— TUR3B bunu bugün YENİDEN DOĞRULADI, YENİ bir bulgu değil. **2.4x
tavanının kendisi keyfi bir sınır (`Math.min(2.4, 1+combo*0.12)`,
combo≈12'de doyar) — sömürü potansiyeli Bölüm C'de (boss ile
birleşince) ayrıca değerlendirildi.**

---

## F) İPUCU SİSTEMİ

**Kaç kere kullanılabiliyor — `HINTS_PER_GAME=3`, GLOBAL (mod/zorluk-
bağımsız tek sabit, `app.js:74`).** Her "Oyunu Başlat" (fresh-start —
`resetSession()`'un çağrıldığı HER nokta: ilk kez/Tekrar Oyna/10 Soru
Daha) `stats.hintsRemaining = HINTS_PER_GAME` ile **3'e SIFIRLANIYOR**
(`app.js:7152`) — günlük değil, oturum-bazlı değil, **her fresh-start'ta
yeniden dolan** bir havuz.

**Ücretsizde farklı mı — HAYIR:** Kodda `HINTS_PER_GAME` tek bir
sabit, `isUserPro()` kontrolüyle DALLANMIYOR — free/Pro AYNI 3 ipucu
hakkına sahip (grep ile doğrulandı, ikinci bir "ücretsiz ipucu" sabiti
YOK).

**hintPenalty 0.5 — sadece XP'yi mi etkiliyor — EVET, DOĞRULANDI:**
`calculateXP`'nin formülünde SADECE bir çarpan (`hintUsed ? 0.5 : 1`)
— can/streak/combo/skor/sınav sayaçlarına hiçbir etkisi kod
seviyesinde görülmedi (giveHint() sadece `hintsRemaining--`/
`hintsUsed++`/`session.hints++` yapıyor, bunların hiçbiri XP DIŞINDA
bir hesaba giriyor değil).

**Ekrandaki "İpucu" sayacı neyi sayıyor — `stats.hintsRemaining`,**
yani "bir sonraki fresh-start'a kadar KALAN hak" (0'a inince buton
disable olur, `els.hintBtn.disabled = stats.hintsRemaining<=0 || ...`).

---

## G) ZAMAN BONUSU

**timeBoost formülü — `roundFlow.timeLeft > roundFlow.roundDuration *
0.55 ? 1.2 : 1`, 12 modda AYNI, doğru hesaplanıyor** (formülün
kendisinde hata YOK — `timeLeft`/`roundDuration` tutarlı bir çiftten
okunuyor, aynı ikili timer UI'ında da kullanılıyor).

**TAM-LISTE karar 17 (`timeSec` hesaplanıyor ama statik değer
kullanılıyor) — HÂLÂ AÇIK, BUGÜNKÜ COMMIT'LERDEN ETKİLENMEDİ:**
`startTimerForCurrentQuestion()` (`app.js:5500`) süreyi
`currentDifficultyConfig().time`'dan (mod.DIFFICULTY[tier]'ın
**STATİK** alanı) okuyor — `difficulty-curve.js`'in Z1'de tarif
edilen SÜREKLİ/parametrik `timeSec` eğrisi buraya HİÇ bağlanmamış
(karar 17'nin kendi tanımıyla BİREBİR tutarlı, hâlâ çözülmemiş).
**Tek dinamik ayarlama:** boss round süreyi 2 saniye kısaltıyor
(`Math.max(6, baseTime-2)`) — bu STATİK tabana uygulanan TEK
istisna.

**Round süresi mod başına farklı mı — EVET:** Her modun kendi
`DIFFICULTY[tier].time` değeri var (mod.DIFFICULTY tabloları
birbirinden bağımsız) — bu turda TÜM 12 modun tam `.time` tablosu
TEK TEK karşılaştırılmadı (kapsam dışı, task bunu istemedi).

---

## H) ARKA PLANDA İLERLEME KAYDI

**Arka plana gitmeden önce kazanılan XP yazıldı mı — EVET, ÖNCEDEN
ÖLÇÜLMÜŞ VE KANITLANMIŞ (G203, bugün):** DURUM.md'nin G203 kaydı
(#53 alt maddesi) AÇIKÇA şunu ölçmüş: *"stats (can/XP/combo) her
cevaptan sonra ZATEN kalıcı diske yazılıyordu (persistStats) —
kaybolan SADECE aktif/yarım kalan soru + geri sayım."* Bu turda
KOD TEKRAR OKUNARAK doğrulandı: her mod'un submit-handler'ı
`calculateXP()` → `stats` mutasyonu → `persistStats()` sırasını
AYNI senkron JS görev (task) içinde, `await` ARAYA GİRMEDEN
çalıştırıyor — tarayıcı/WebView bir JS görevini YARIDA KESEMEZ,
yani arka plana alınma XP yazımının ORTASINA denk GELEMEZ.

**Dönünce çift sayım oluyor mu — HAYIR, MİMARİ OLARAK İMKANSIZ:**
`persistInProgressRound()` (G203/#53) SADECE **CEVAPLANMAMIŞ**
aktif soru + kalan süreyi kaydediyor — geri dönüşte bu soru
YENİDEN cevaplanır (kullanıcı tek bir gerçek submit yapar, XP TEK
sefer hesaplanır). Zaten CEVAPLANMIŞ bir sorunun sonucu hiçbir
yerde tekrar OYNATILMIYOR/YENİDEN DEĞERLENDİRİLMİYOR.

**G237'nin kalıcı seans sayacı arka plan dönüşünde doğru davranıyor
mu — EVET, İKİ SENARYO AYRI AYRI DOĞRU:**
1. **Kısa arka plan (JS VM canlı kalır, sadece 3 saatlik bayat sınırın
   ALTINDA):** `roundsInThisPlaySession` (bellek-içi, kasıtlı olarak
   persist edilmeyen sayaç) DOKUNULMADAN kalır — visibilitychange
   sayfayı YENİDEN YÜKLEMEZ. `freeSession.used` zaten storage'dan
   okunuyor, arka plan/ön plan geçişinden ETKİLENMEZ.
2. **Uzun arka plan (iOS süreci SONLANDIRIR, sayfa YENİDEN yüklenir):**
   `roundsInThisPlaySession` modül-seviyesi `let ...=0` ile DOĞAL
   olarak sıfırlanır (bu KASITLI, mimari bir karar — G237'nin DEĞİL,
   önceki bir kararın devamı) — ama `freeSession.used`
   `storage.loadFreeSession()` ile DİSKTEN taze okunur, **G237'nin
   TAM olarak çözdüğü sorun bu senaryo** (önceden bu sayaç da
   bellek-içiydi ve sıfırlanırdı, artık sıfırlanmıyor). **Çift sayım
   ya da kayıp risk KODDA GÖRÜLMEDİ.**

---

## I) ANDROID ⚠️ HİÇ BAKILMADI

**Hangi commit'ler www/ altında değişiklik yaptı — task'ın "12" tahmini
YANLIŞ, GERÇEK SAYI ÖLÇÜLDÜ:** 15 Ağustos'ta `www/js` veya `www/index.html`
veya `www/styles.css`'e dokunan **25 commit** var (`git show --stat`
ile TEK TEK doğrulandı) — G239/G240 (bugünkü önceki tur) ile birlikte
**toplam 27**. Task'ın "12" rakamı BELİRSİZ bir kaynaktan geliyor
(muhtemelen sadece `app.js`'e dokunan alt küme ya da farklı bir
tarih aralığı) — **düzeltiliyor: 27, tahmin değil, ölçüldü.**

**Bunlar Android'de ne yapar — İKİ FARKLI KATMAN AYRIŞTIRILMALI:**
1. **Saf JS/mantık değişiklikleri** (progress.js, storage.js, exam-
   system.js'e dokunmayan modlar, upload.js, tonal-balance.js, ads.js'in
   `Promise.race` kısmı, frekans-cakismasi.js'in guard'ı, vb.) —
   platform-AGNOSTİK, Web Audio API/localStorage/DOM standart web API'leri
   kullanıyor, Android WebView'da (Chromium tabanlı) AYNI şekilde
   çalışır. **Risk YOK.**
2. **`getAudioSessionPlugin()`'İ ÇAĞIRAN kod (G236, "EN KRİTİK"):**
   `audio-engine.js:195` — `if (platform !== "ios") return null;`
   — **BİLEREK ve GÜVENLİ şekilde** iOS-dışı platformlarda `null`
   dönüyor, `ensureAudioAlive()` bu durumda native adımı ATLAYIP
   sadece Web Audio resume deniyor. **Çökme/hata riski YOK, kod
   ZATEN platform ayrımı yapıyor** (bu ayrım BUGÜN eklenmedi, önceki
   bir G-numarasından — G133/G134 civarı — kalma, bugünkü commit'ler
   BUNU BOZMADI).

**🔴 CİDDİ — G236'nın (native kesinti köprüsü) Android'de HİÇBİR
KARŞILIĞI YOK, sessizce eksik kalıyor:** `android/app/src/main/java/
com/.../MainActivity.java` — STANDART Capacitor boilerplate, iOS'un
`AudioSessionPlugin.swift`'ine (route-change/interruption dinleyicisi,
`window.__aeaNativeInterruption`/`__aeaNativeRouteChanged`'i ÇAĞIRAN
taraf) **karşılık gelen HİÇBİR native dosya YOK** (`find` ile
doğrulandı — android/ altında "audio"/"session" adında BAŞKA hiçbir
dosya yok). Bu **çökme değil** (JS tarafındaki hook'lar sadece hiç
çağrılmadan durur, zararsız) ama **G236'nın "EN KRİTİK" diye
işaretlenen düzeltmesi Android'de HİÇ ÇALIŞMIYOR** — bir Android
kullanıcısı telefon görüşmesi/alarm kesintisi yaşadığında, iOS'taki
YENİ kurtarma yolunu (route-change/interruption→pause) hiç
almıyor, sadece ESKİ `document.visibilitychange` (DOM standart API,
platform-agnostik, Android'de de çalışır) tabanlı genel arka-plan
kurtarmasına bağımlı kalıyor — bu YENİ değil (G132/G134'ten beri
Android hep bu durumdaydı), **ama bugün "EN KRİTİK" diye üstüne 3.
bir kod katmanı (G236) eklenirken bu asimetri HİÇ belgelenmedi/
işaretlenmedi.**

**İstisna — G207 (14 Ağustos, bugünden önce ama "yakın geçmiş"
emsali) HER İKİ platformu da EŞ ZAMANLI ele almıştı** (AndroidManifest.xml
AD_ID izni + Info.plist armv7→arm64, AYNI commit'te) — yani proje
GEÇMİŞTE platform simetrisine dikkat ETMİŞ, bugünkü tur (G228-G240)
bu disiplini SADECE iOS-özel native köprü işinde (G236) kaybetmiş.

**iOS'a özel varsayım içeren BAŞKA yeni kod var mı — HAYIR, taranan
diğer commit'lerde bulunamadı:** G234 (ad timeout), G231 (upload
duration), G230 (formatDb), G212 (stereo mono uyarı), G233 (şema
sürümü), G237/G238 (session/XP) — hepsi platform-agnostik Web
API'leri kullanıyor, `getPlatform()`/`Capacitor`'a hiç dokunmuyor.

**android/app/src/main/assets/public/ — bir tuzak DEĞİL, DOĞRULANDI:**
Bu klasör `android/.gitignore`'da (satır 96) ignore ediliyor —
`git ls-files` boş döndü, yani commit'lenmiyor, sadece bir ÖNCEKİ
`npx cap sync android` çalıştırmasının ARTIFACT'ı (bugünkü www/
değişiklikleriyle 119 satır fark var, BEKLENEN — bir SONRAKİ sync'te
otomatik güncellenir). **Endişe kaynağı DEĞİL.**

---

# ÖNCELİK LİSTELERİ

## Yayın öncesi düzeltilecekler
1. **🔴 G236'nın Android karşılığının OLMADIĞI** Logic'e AÇIKÇA
   söylenmeli — 1.0 Android sürümü çıkarsa (çıkacaksa) bu kullanıcılar
   telefon görüşmesi kesintisinde iOS'taki yeni kurtarmayı ALMAYACAK,
   sadece eski genel arka-plan kurtarmasını alacak. Ürün kararı: bu
   1.0'da kabul mü, yoksa Android eşdeğeri ayrı bir iş mi?
2. **🔴 `core/progress.js:80-93`'teki G238 yorumu YANLIŞ** — olmayan
   bir "kilit açılma hızı" yan etkisini belgeliyor, bir sonraki
   dokunuşta düzeltilmeli (kod DAVRANIŞI doğru, sadece YORUM METNİ
   yanlış).
3. **🟡 TAM-LISTE karar 16 stale** — "üç kilit tipi" artık pratikte
   iki (seviye tipi G163'te ölmüştü).

## 1.1'e bırakılabilirler
- Sınav sisteminin `EXAM_DIFFICULTY="pro"` (her zaman en zor) tasarımı
  düşük seviyeli Pro kullanıcılar için gerçek bir zorluk duvarı
  olabilir — playtest verisiyle değerlendirilmeli, acil değil.
- Boss round + global combo'nun XP-sömürü potansiyeli (Bölüm C) —
  matematiksel olarak mümkün ama pratikte zahmetli, acil değil.
- İki-seviye-kavramı kafa karışıklığı (Bölüm D) — UI'a küçük bir
  açıklayıcı metin eklenebilir, kritik değil.
- `app.js`'in "EXAM_ENABLED bugün SADECE Kompresör" gibi birkaç stale
  yorumunun (grep ile ~5 site bulundu) güncellenmesi — kozmetik.

## Android turuna devredilecekler
- G236'nın Android eşdeğeri (AudioDeviceCallback/BroadcastReceiver ile
  route-change + call-state dinleyicisi) — ayrı bir native iş, bu
  turun kapsamı dışı.
- Android'de headphone/interruption davranışının GERÇEK cihazda hiç
  ölçülmemiş olması (iOS tarafı bile bugüne kadar sadece Playwright'ta
  test edildi, Android hiç denenmedi).

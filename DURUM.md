# DURUM

Son güncelleme: 08.08.2026 (G69)

> Bu dosya yeni sohbetlerin tek doğruluk kaynağıdır.
> Her seans sonunda Claude Code tarafından güncellenir, commit'e dahil edilir.

## DİL PRENSİBİ (kullanıcı kararı, G66'da netleşti — ayrı bir dosya YOK, burada kayıtlı)

GLOBAL mix terimleri İngilizce KALIR (çevrilmez), tanımlayıcı kelimeler
Türkçe. Örnek: "Reverb nasıl yankı değilse, saturation da doygunluk değil."
Global sayılan terimler (örnek liste, tüketici değil): ratio, Q, gain,
threshold, attack, release, reverb, saturation, distortion, dB, Hz, kHz,
LUFS, EQ, compressor, boost, cut, pan, stereo, mono, peak, transient,
sidechain, delay.

## BİTTİ

Bu commit (G69, tek commit) — **Spotlight'a eksik kontroller eklendi + mod
"i"sine oyun seçenekleri eklendi.** G68'in spotlight turu SADECE dinle→seç→
onayla akışını gösteriyordu, modun GERÇEKTEN sahip olduğu kontrolleri (döngü/
A-B karşılaştırma/durdur/atla) atlıyordu; mod "i" metni de o modun oyun
seçeneklerini (upload/format/karıştırma) hiç anlatmıyordu. Task'ın kendi
kritik notu ("GERÇEK öğeleri kullan, uydurma") uyarınca ÖNCE kod tek tek
okundu (app.js: `updateAbToggleUI`/`syncCakismaVisibility`/`pickRoundSource`/
`syncAnswerFormatVisibility`; her modun `getMeta().uyumluKaynaklar`/
`choiceOnly`/`FOCUS_RANGES`) — aşağıdaki HER iddia KODDAN doğrulandı.

**1. SPOTLIGHT — "abControl" adımı eklendi (G68'in 3 adımı → 4):**
`#abToggle` TEK bir buton ama modun tipine göre İKİ FARKLI GERÇEK kontrole
karşılık geliyor (`updateAbToggleUI` — three-way'de "A/B/C Test", değilse
"A/B Test"):
- **Kompresör/Reverb/Distortion (3 mod):** A/B/C DÖNGÜ — karta uzun basmak
  (520ms eşik) otomatik döngüyü başlatır, tekrar dokunmak durdurur
  (`startAbLoop`/`stopAbLoop`, `abPressTimer`). abControl metni: "Karta uzun
  bas: A/B/C arasında otomatik döngü başlar, tekrar dokun durur."
- **Diğer 6 mod (Frekans Bulma/Kesim Noktası/Q Genişliği/Boost-Cut/dB
  Seviyesi/Tonal Denge):** dry/işlenmiş A/B KARŞILAŞTIRMA — tek dokunuş.
  abControl metni: "'A/B Test'e dokun: temiz ile işlenmiş sesi karşılaştır."
  (Kesim Noktası/Tonal Denge'de mod-özel kelimelerle: "kesim öncesi/sonrası",
  "düzeltmeden önceki/sonraki".)
- **Frekans Çakışması:** `#abToggle` `syncCakismaVisibility`'de BİLEREK
  GİZLİ — bu modun dizisinde "abControl" adımı YOK (uydurulmadı), 2 adımlık
  (dinle+seç) yapısı G68'den DEĞİŞMEDİ.
"Durdur" (`startBtn`) ve "Atla" (`nextBtn`) — İKİSİ de HER modda evrensel
VE zaten kendini açıklayan butonlar (buton metninin kendisi "Atla ▶"/
"Durdur") — ayrı bir spotlight kutusu AÇILMADI ("spotlight çok uzamasın"
dengesi), bunun yerine turun SON adımının metnine kısa bir hatırlatma
olarak katlandı: "...Bilemezsen 'Atla', istersen 'Durdur'a dokunabilirsin."
Sonuç: 9 mod 3→4 adıma çıktı (+1, SADECE mod-ayırt edici döngü/A-B için),
Frekans Çakışması 2 adımda sabit kaldı — "çok uzamasın" dengesi böyle
sağlandı (durdur/atla METİNSEL hatırlatma, döngü/A-B ise GERÇEK vurgulanmış
kutu).

**2. MOD "i" — `MODE_OPTIONS_TEXTS` (YENİ) eklendi, `MODE_GUIDE_TEXTS`'in
ALTINA render ediliyor:** her modun "ne öğretir" metni TEK SATIR değişmedi,
altına amber başlıklı ayrı bir "OYUN SEÇENEKLERİ" bloğu eklendi
(`app.js:openGuideSheet`, GENERAL_GUIDE'ın kendi bölüm-başlığı deseniyle
TUTARLI). Kod incelemesiyle doğrulanan gerçek seçenekler:
- **Kendi ses yükleme:** cakisma HARİÇ 9 modun `uyumluKaynaklar`'ının
  HEPSİNDE "upload" var (`compatibleSourceIds()` onu hiç DIŞLAMIYOR) — Kaynak
  sheet'inden "Dosya seç" ile tek dosya. Frekans Çakışması'nın KENDİ AYRI
  mekanizması var: kaynak-çifti "own" seçilince İKİ AYRI dosya (Ses 1/Ses 2).
- **Dokunmalı/Şıklı format seçimi:** SADECE Frekans Bulma'da GERÇEK bir
  seçim — `isChoiceFormat()` diğer 9 modu HER ZAMAN şıklıya zorluyor, chip'in
  kendisi `syncAnswerFormatVisibility` ile o 9 modda GİZLENİYOR. Diğer
  modların metninde bu seçenekten BAHSEDİLMEDİ (yok olan bir şey uydurulmadı).
- **Odak aralığı (Bas/Orta/Tiz/Tüm spektrum):** SADECE Frekans Bulma'da
  (`mode.FOCUS_RANGES` sadece `frekans-bulma.js`'te tanımlı) — diğer 9 modun
  metninde YOK.
- **Karıştır (rastgele kaynak):** `pickRoundSource()`'un okuduğu 8 modun
  metninde VAR. Frekans Çakışması'nda BAHSEDİLMEDİ (`pickRoundSource`
  hiç çağrılmıyor, kendi `cakismaPairSelect`'i var). Tonal Denge'de de
  BAHSEDİLMEDİ — `only:["groove","upload"]` havuzunda Karıştır açıkken
  upload HARİÇ tutulduğundan (`s.kind !== "upload"`) TEK aday ("groove")
  kalıyor, fiilen etkisiz bir kontrol olduğu için yazılmadı.
- **A/B/döngü kısa hatırlatma:** spotlight'ın abControl metniyle TUTARLI
  cümleler (Kaynak çiftini/upload'ı anlatan cümlenin yanına eklendi).
- **Frekans Çakışması'nın kendi "Önce/Sonra" karşılaştırması** (`#cakismaCompare`,
  stage 3'te doğru cevap sonrası açılır — `#abToggle` YERİNE geçen mod-özel
  kontrol) metne eklendi.
- **Atla:** her 10 modun metninde "Bilemezsen 'Atla'ya dokun." ile kapanıyor.

**YENİ test:** `test/guide-texts.test.mjs`'e `MODE_OPTIONS_TEXTS` bölümü
eklendi — 10 mod tam eşleşme, Frekans Bulma'nın TEK format/odak-aralığı
sözü eden mod olduğu, Karıştır'ın SADECE anlamlı olduğu 8 modda geçtiği
(cakisma+tonal-denge'de YOK), cakisma'nın Önce/Sonra'dan bahsettiği, cakisma
HARİÇ 9 modun yükleme seçeneğinden bahsettiği — HEPSİ GERÇEK kod
davranışıyla (mock değil) çapraz doğrulandı. SPOTLIGHT_STEPS testleri 4-adım
şekline güncellendi + three-way/A-B metin ayrımı + son-adım durdur/atla
hatırlatması kilitlendi. `test/terminology.test.mjs`'e `MODE_OPTIONS_TEXTS`
için AYNI 6 yasaklı-çeviri kilidi eklendi (DİL PRENSİBİ tutarlılığı).

**Doğrulama:**
- `npm test`: **1013/1013** (982 → +31: `guide-texts.test.mjs`'e
  MODE_OPTIONS_TEXTS bölümü + SPOTLIGHT_STEPS'in genişletilmiş
  kontrolleri, `terminology.test.mjs`'e MODE_OPTIONS_TEXTS kilidi).
- Kod incelemesiyle doğrulanan (DOM/canlı test YAPILAMADI, bkz. aşağı):
  `resolveSpotlightTarget`'ın yeni "abControl" dalı `els.abToggle`'a
  çözülüyor, cakisma'nın dizisinde bu adım hiç YOK (resolver'a hiç gelmiyor);
  `openGuideSheet` `MODE_OPTIONS_TEXTS[modeId]` varsa amber başlıklı bloğu
  EKLİYOR, yoksa (olmayan bir modId) hiçbir şey render ETMİYOR; SPOTLIGHT_STEPS
  dizilerindeki HER "abControl"/"select"/"confirm" metni yukarıdaki kod
  bulgularıyla BİREBİR örtüşüyor (uydurma kontrol YOK — her iddia için
  ilgili app.js/mode dosyası satırı bu kayıtta referanslı).
- **Dürüstlük notu — CANLI/cihaz doğrulaması YİNE YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi): abControl adımının GERÇEKTEN
  `#abToggle`'ın üzerine oturduğu, three-way modlarda uzun-basmanın
  GERÇEKTEN döngüyü tetiklediği ANINDA tur adımını da ilerlettiği, "OYUN
  SEÇENEKLERİ" bloğunun guideSheet'te taşmadan okunduğu, 4 adımlık turun
  GERÇEKTEN "uzun" hissettirmediği gözle DOĞRULANMADI — bu G67'nin AÇIK
  İŞLER madde 14'ünün kapsamına GİRİYOR (aşağıya bkz., yeni maddeler
  eklendi), ayrı bir madde AÇILMADI.

**KORUMA:** 10 mod/ses/sınav/paywall/ana akış TEK SATIR değişmedi — SADECE
spotlight adımları (yeni "abControl") + mod "i" metni (yeni
`MODE_OPTIONS_TEXTS` bloğu) zenginleşti. `createQuestion`/`evaluateAnswer`/
`applyProcessing`/`updateAbToggleUI`/`pickRoundSource`/`syncCakismaVisibility`
hiçbiri dokunulmadı — SADECE OKUNDU (bu turun GERÇEK veri kaynağı olarak).

---

Önceki commit (G68, tek commit) — **İpuçları SPOTLIGHT rehberli tura yükseltildi:
karartma + adım adım yönlendirme.** G67'nin basit ipucu bandı ("Sesi dinle →
Farklı olanı seç → Cevabını onayla" TEK satır metin) YETERSİZDİ — task'ın
kendi kararıyla tam bir spotlight/coach-mark deneyimine dönüştürüldü.

**SPOTLIGHT MEKANİĞİ:** `#spotlightOverlay` (fixed, tüm ekran) + `#spotlightHole`
(klasik CSS spotlight hilesi: `box-shadow:0 0 0 9999px rgba(6,8,14,.72)` —
elementin ETRAFINI karartır, elementin kendisi hiç boyanmaz, SVG mask'e gerek
yok) + `#spotlightCallout` (yönlendirme metni + "Geç"/"İleri" butonları,
hedefin altına/üstüne otomatik konumlanır — `getBoundingClientRect()` ile HER
adımda canlı hesaplanır, `resize`'da yeniden konumlanır). **TÜM overlay
`pointer-events:none`** (SADECE callout `auto`) — karartma/delik HİÇBİR
gerçek tıklamayı ENGELLEMEZ, hedef elementin altındaki GERÇEK oyun kontrolü
NORMAL çalışmaya devam eder (KORUMA: mekanik tek satır değişmedi).

**ADIM İLERLEMESİ İKİ YOLDAN:** (1) `#spotlightNext` ("İleri"/son adımda
"Anladım") — manuel sıradaki adım; (2) o anki adımın GERÇEK hedefiyle
kullanıcı etkileşince — `document`'a capture-phase'te eklenen bir click
dinleyicisi (`preventDefault`/`stopPropagation` YOK, asıl handler'lar HİÇ
etkilenmez) `spotlightInteractionTarget.contains(e.target)` kontrolüyle
algılıyor. Sıradaki adımın hedefi AYNI elemente çözülüyorsa (10 moddan
9'unda — choiceOnly modların HEPSİNDE tek tıkla submit, "seçmek" zaten
"onaylamak" demek — bkz. aşağıdaki `resolveSpotlightTarget` notu) tur
DOĞRUDAN tamamlanmış sayılır, aynı kutuyu ikinci kez göstermez.

**HER MODUN KENDİ ADIMLARI** (`core/guide-texts.js:SPOTLIGHT_STEPS`, YENİ —
G67'nin `ROUND_HINT_STEPS`'inin YERİNE geçti, `formatRoundHint` kaldırıldı):
her adım `{target, text}` — `target` SEMBOLİK bir anahtar
("listen"/"select"/"confirm"), guide-texts.js bu dosya DOM'a hiç dokunmadan
(level-sheet-terms.js'in AYNI "saf veri" ilkesi) sadece BU anahtarları taşır;
GERÇEK DOM elementine çözümü `app.js:resolveSpotlightTarget(key, modeId)`
yapıyor:
- `"listen"` → HER modda `#analyzer` (spektrum kartı, ortak/paylaşılan
  görselleştirme — CLAUDE.md'nin "tek paylaşılan analyser" notuyla tutarlı).
- `"select"`/`"confirm"` (tonal-denge HARİÇ) → `isChoiceFormat() ? #answers :
  #analyzer` — choiceOnly 9 modun hepsi `#answers`'a, SADECE Frekans
  Bulma'nın dokunmalı formatı `#analyzer`'a (kanvas dokunuşu zaten cevabı
  submit ediyor) çözülür. `"select"` ile `"confirm"` BİLEREK AYNI hedefe
  çözülüyor — ayrı bir "onayla" kontrolü İCAT edilmedi, seçim zaten onay.
- `"confirm"` + `tonal-denge` → TEK istisna: gerçek ayrı bir buton var
  (`#answers .tonal-submit`), ona çözülür.

**Motor 1 (Frekans Bulma/Kesim Noktası/dB Seviyesi/Boost-Cut/Q Genişliği) —
3 adım:** listen "Önce sesi dinle." → select (mod-özel: "Öne çıkan frekansı
işaretle."/"Kesim noktasını seç."/"Seviye farkını seç."/"Boost mu cut mu,
karar ver."/"Bandın genişliğini seç.") → confirm ("...cevabını hemen
onaylar.").
**Motor 2 (Kompresör/Reverb/Distortion) — 3 adım:** listen "Üç sesi (A/B/C)
dinle." → select "Farklı olan kartı seç." → confirm "Kartı seçmen cevabını
onaylar."
**Tonal Denge — 3 adım, GERÇEKTEN ayrı hedefli:** listen "Bozuk sesi dinle."
→ select "Kaydırıcılarla nötüre getir." (`#answers`, sliderlar) → confirm
"Cevabı Onayla'ya dokun." (`.tonal-submit`, AYRI bir buton).
**Frekans Çakışması — BİLİNÇLİ olarak SADECE 2 adım:** listen "Çakışan iki
sesi birlikte dinle." → select "Nerede çakıştıklarını şıklardan bul." — mod
zaten çok-aşamalı (stage 1/2/3), her aşamanın KENDİ soru başlığı/talimatı
(`frekans-cakismasi.js:getInstructionText`) ZATEN ekranda gösteriliyor,
spotlight bunu TEKRARLAMADI — task'ın kendi notu ("aşamalara göre devam").

**NE ZAMAN/NE KADAR — G67'den DEĞİŞMEDİ:** AYNI `stats.perMode[modeId].
hintRoundsShown` sayacı, AYNI `HINT_ROUNDS_LIMIT`=2, AYNI `shouldShowRoundHint()`.
`startRound()`'daki çağrı `showRoundHintIfNeeded()` → `startSpotlightTourIfNeeded()`
olarak yeniden adlandırıldı, davranışı AYNI konumda (`renderQuestion()`'dan
hemen sonra) çalışıyor. "Geç" (`#spotlightSkip`) turu HER an kapatır, sayaç
GERİ ALINMAZ (zaten "gösterildi" sayılır — G67'nin "×" davranışıyla AYNI
karar). Mod değiştirilince (`enterMode`) önceki modun turu `closeSpotlightTour(false)`
ile kapanır — yeni moda SIZMAZ. Kalıcı "i" ikonu (`guideSheet`) BUNDAN
TAMAMEN BAĞIMSIZ — hiç dokunulmadı, hep durur.

**YENİ test:** `test/guide-texts.test.mjs` YENİDEN YAZILDI —
`ROUND_HINT_STEPS`/`formatRoundHint` testleri SPOTLIGHT_STEPS/spotlightStepsFor
testleriyle DEĞİŞTİRİLDİ: 9 modun 3 adımlı (listen ile başlar, confirm ile
biter) + Frekans Çakışması'nın 2 adımlı olduğu, HER adımın geçerli
target+text taşıdığı, Tonal Denge'nin select/confirm metinlerinin GERÇEKTEN
farklı olduğu (kaydırıcı/onayla kelimeleri) GERÇEK 10 playable mod
listesiyle (mock değil) doğrulanıyor. `shouldShowRoundHint` testleri G67'den
DEĞİŞMEDİ (aynı sınır-değer testleri). `test/storage.test.mjs`'in
`hintRoundsShown` migration testlerine dokunulmadı (alan/anlam AYNI, sadece
onu tüketen UI değişti).

**Doğrulama:**
- `npm test`: **982/982** (980 → +2: `guide-texts.test.mjs`'in yeniden
  yazımı net +2 assertion getirdi — 3-adım/2-adım şekil kontrolleri eklendi,
  eski `formatRoundHint` testleri kaldırıldı).
- Kod incelemesiyle doğrulanan (DOM/canlı test YAPILAMADI, bkz. aşağı):
  `els.spotlight*` HEPSİ `index.html`'deki gerçek id'lerle eşleşiyor;
  `resolveSpotlightTarget` 10 modun HEPSİNDE `isChoiceFormat()`/
  `THREE_WAY_MODE_IDS` ile AYNI mantığı kullanıyor (yeni bir format-tespiti
  İCAT etmedi, var olanı ÇAĞIRDI); `positionSpotlightHole`/
  `positionSpotlightCallout` metni/etiketleri YAZDIKTAN SONRA ölçüyor (bir
  düzeltme turu: ilk yazımda callout konumu ESKİ adımın boyutuyla
  ölçülüyordu, `offsetHeight` okumasından ÖNCE metin ataması gereken sıraya
  çekildi); document click-capture dinleyicisi `preventDefault`/
  `stopPropagation` HİÇ ÇAĞIRMIYOR (asıl handler'lar etkilenmiyor);
  `#spotlightOverlay` `z-index:75` — tabbar'ın (59/60) üstünde, sheet
  overlay'lerin (90/91) ALTINDA, sınav sheet'leriyle çakışırsa onlar üstte
  kalır.
- **Dürüstlük notu — CANLI/cihaz doğrulaması YİNE YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi): karartma/delik efektinin
  GERÇEKTEN doğru öğeye oturduğu, callout'un ekran kenarında taşmadığı,
  adım geçişlerinin (hem "İleri" hem GERÇEK tıklamayla) GERÇEKTEN akıcı
  çalıştığı, 10 modun HER BİRİNİN doğru elementi aydınlattığı gözle
  DOĞRULANMADI. Bu, G67'nin AÇIK İŞLER madde 14'ünün kapsamını GENİŞLETİYOR
  (aşağıya bkz.) — kod incelemesi + 982 test + satır-satır kablolama
  kontrolü kadarı garanti.

**KORUMA:** 10 mod/ses/zorluk/sınav/paywall/"i" bilgi sistemi (guideSheet,
GENERAL_GUIDE, MODE_GUIDE_TEXTS) TEK SATIR değişmedi — SADECE GEÇİCİ ipucu
katmanının GÖRSEL MEKANİĞİ (banner → spotlight) değişti. `createQuestion`/
`evaluateAnswer`/`applyProcessing`/zorluk eğrileri/paywall/`openGuideSheet`
hiçbiri dokunulmadı.

---

Önceki commit (G67, tek commit) — **"i" bilgi/rehber sistemi: KALICI "i" ikonu
(ana ekran + her mod kartı) + GEÇİCİ ilk-2-oyun ipuçları.** Kullanıcı
seviye/sınav sistemini bilmiyordu, keşfedilmeden kalıyordu — ayrı bir yardım
menüsü İSTENMEDİ, akış içinde iki katman kuruldu:

**1. KALICI "i" ikonu (tıkla-aç/tıkla-kapa, hiç solmaz):**
- Ana ekran üst çubuğunda `#menuInfoBtn` → `GENERAL_GUIDE`'ı (5 bölüm: Nasıl
  çalışır / Seviye ve zorluk / Sınav ve bölüm geçme / Ücretsiz ve Pro / Can)
  gösterir.
- 10 oynanabilir mod kartının HER BİRİNDE (`.mode-top-right` içinde, Pro/Sv
  rozetlerinin yanında) `.mode-info-btn` → o modun `MODE_GUIDE_TEXTS[id]`
  metnini gösterir. Henüz kodlanmamış 4 katalog girdisinde (hiz-modu,
  stereo-genislik, pan-konumu, hangisi-farkli) rozet YOK (gerçek içerik
  olmadığı için).
- İkisi de AYNI tek `#guideSheet` bottom-sheet'i yeniden kullanıyor
  (`lvlSheet`'in BİREBİR aynı deseni) — `app.js:openGuideSheet(modeId)`,
  `modeId=null` ise genel rehber.
- Mod kartındaki "i" rozeti kartın kendi navigasyon click'inden
  `e.stopPropagation()` ile ayrıldı — kilitli bir kartta bile bilgiye
  bakılabilir, paywall/kilit akışını TETİKLEMEZ.

**2. GEÇİCİ round-içi ipucu bandı (ilk `HINT_ROUNDS_LIMIT`=2 round, sonra
otomatik açılmaz — ama kalıcı "i" hep durur):**
- Oyun ekranında `#questionTitle`/`#questionMeta`'nın altına, `#analyzer`'ın
  üstüne `#roundHintBanner` eklendi. `startRound()`'un HER çağrısında
  `showRoundHintIfNeeded()` tetiklenir: o modun `ROUND_HINT_STEPS`'ini
  (`formatRoundHint`, " → " ile birleştirilmiş tek satır, ör. "Sesi dinle →
  Öne çıkan frekansı işaretle → Cevabını onayla") gösterir, kalıcı sayacı
  (`stats.perMode[modeId].hintRoundsShown`) artırır.
- Sayaç `HINT_ROUNDS_LIMIT`'e ulaşınca (2) bant BİR DAHA otomatik açılmaz —
  ama kullanıcı kendi `×` ile de erken kapatabilir (kapatma da "gösterilmiş"
  sayılır, sayaç geri alınmaz).
- Mod değiştirilince (`enterMode`) önceki modun bandı hemen gizlenir — yeni
  moda SIZMAZ, "Oyunu Başlat"a basılana kadarki idle görünüm temiz kalır.

**Merkezi metin dosyası:** `www/js/core/guide-texts.js` (YENİ) —
`level-sheet-terms.js`'in AYNI mantığı: `GENERAL_GUIDE`, `MODE_GUIDE_TEXTS`
(10 mod), `ROUND_HINT_STEPS` (10 mod), `HINT_ROUNDS_LIMIT`,
`shouldShowRoundHint()`/`formatRoundHint()` (saf fonksiyonlar). TÜM metin
içeriği (`GENERAL_GUIDE` + `MODE_GUIDE_TEXTS`) kullanıcının kendi verdiği
TASLAK metin — kelimesi kelimesine aktarıldı, cihazda görülüp
düzeltilecek. `ROUND_HINT_STEPS`'in adım kelimeleri (task'ın örnek fiilleri
"Sesi dinle"/"Farklı olanı seç"/"Cevabını onayla"dan esinlenerek, ama
modun kendi mekaniğine göre) BENİM taslağım — bunlar da nihai DEĞİL.

**Kalıcılık:** `storage.js:freshModeState()` artık `{xp, hintRoundsShown}`
döndürüyor (önceden sadece `{xp}`). `loadStats()`'a bu alan hiç OLMAYAN eski
kayıtlar için (G67 öncesi) 0'a göç eden bir satır eklendi — `xp`'ye
DOKUNULMADI, sadece eksik alan tamamlandı.

**YENİ test dosyası `test/guide-texts.test.mjs`:** `MODE_GUIDE_TEXTS`/
`ROUND_HINT_STEPS`'in playable 10 mod id'siyle BİREBİR eşleştiği (fazla/eksik
yok), `GENERAL_GUIDE`'ın tam 5 bölüm taşıdığı, `shouldShowRoundHint`'in
sınır değerlerde (0/1/2/5/undefined) doğru davrandığı, `formatRoundHint`'in
gerçek bir satır ürettiği/kayıtsız modId'de null döndüğü — GERÇEK
`MODE_CATALOG`'dan okunan playable listesiyle karşılaştırılarak (mock değil).
`test/storage.test.mjs`'e `hintRoundsShown` migration testleri eklendi (eski
kayıt → 0'a göç, mevcut değer varsa ÜZERİNE YAZILMAZ). `test/terminology.
test.mjs`'e guide-texts.js için de AYNI 6 yasaklı-çeviri kilidi eklendi
(mode-catalog.js/level-sheet-terms.js ile AYNI desen) — DİL PRENSİBİ (yukarı
bkz.) burada da korunuyor: metinlerde "reverb"/"saturation"/"kompresyon"/
"boost"/"cut" İngilizce kaldı, "yankı"/"doygun"/"sıkıştır"/"eşik"/"artırım"/
"azaltım" hiç geçmiyor.

**Doğrulama:**
- `npm test`: **980/980** (961 → +19: `guide-texts.test.mjs` yeni dosya
  [~14 assertion], `storage.test.mjs` +3 [hintRoundsShown migration],
  `terminology.test.mjs` +~12 [guide-texts.js kilidi]; 961 rakamı bu turun
  BAŞINDAKİ mevcut sayı, önceki G66 kaydındaki 916'dan sonraki turlarda
  ayrıca büyümüştü — sayı BURADA koddan ölçüldü, uydurulmadı).
- Kod incelemesiyle doğrulanan (DOM/canlı test bu oturumda YAPILAMADI, bkz.
  aşağıdaki dürüstlük notu): `els.menuInfoBtn`/`els.guideSheet*`/
  `els.roundHintBanner`/`els.roundHintText`/`els.roundHintClose` HEPSİ
  `index.html`'deki gerçek id'lerle eşleşiyor; `openGuideSheet`/
  `closeGuideSheet`/`showRoundHintIfNeeded` doğru event'lere bağlı;
  `renderModeGrid()`'deki `.mode-info-btn` SADECE `MODE_GUIDE_TEXTS[entry.id]`
  varken render ediliyor (10/14 kart); `card.querySelector(".mode-info-btn")`
  click'i `e.stopPropagation()` ile kartın kendi navigasyon handler'ından
  ayrıştırılmış; `startRound()`'daki `showRoundHintIfNeeded()` çağrısı
  `renderQuestion()`'dan hemen sonra, `playQuestion(true)`'dan önce.
- **Dürüstlük notu — CANLI/cihaz doğrulaması YAPILAMADI** (tarayıcı eklentisi
  bu oturumda bağlı değildi): "i" ikonlarının GERÇEKTEN açılıp kapandığı,
  ipucu bandının GERÇEKTEN ilk 2 round'da görünüp sonra kaybolduğu, sheet
  içeriğinin cihazda okunabilir/taşmasız göründüğü gözle DOĞRULANMADI. Kod
  incelemesi + 980 test + yukarıdaki satır-satır kablolama kontrolü kadarı
  garanti — bir sonraki oturumda tarayıcıda GERÇEKTEN denenmeli.

**KORUMA:** 10 mod/ses/zorluk/sınav/paywall TEK SATIR değişmedi — SADECE
"i" bilgi + geçici ipucu katmanı eklendi. `createQuestion`/`evaluateAnswer`/
`applyProcessing`/zorluk eğrileri/paywall mantığı hiçbiri dokunulmadı.

---

Önceki commit (G66, tek commit) — **Terminoloji düzeltmesi: önceki turun
denetim raporunda bulunan global-terim yanlış çevirileri düzeltildi.**
Denetim SADECE rapor üretmişti (bir önceki tur, kod değiştirmedi) — bu tur
o raporun onaylanan maddelerini uyguluyor.

**DÜZELTİLEN 6 KONUM/GRUP (task'ın kendi numaralandırması):**
1. **Reverb "yankı" → "reverb"** — 5 GERÇEK konum (task "6" demişti, ama
   `reverb.js:9/106/108/142`'deki 4 yorum SATIRI kullanıcıya hiç
   görünmüyor, KORUMA kapsamı dışı bırakıldı — bkz. "sayı uydurma" ilkesi,
   gerçek sayı koddan sayıldı): `app.js` soru başlığı ("hangisinin reverb'i
   FARKLI?"), `app.js` round-start açıklaması, `reverb.js:modeDescription()`,
   `REVERB_AMOUNT_TIERS` (4 kademe kelimesi TEK grup), `reverb.js:
   getHintText()`.
2. **Kompresör "sıkıştırılmış" → "kompresyon"** — 5 konum: `mode-catalog.js`
   kart açıklaması, `app.js` soru başlığı, `kompresor.js:modeDescription()`,
   `teachingText()`'in AYNI-kademe dalı, `getHintText()`. Kodda ZATEN var
   olan "kompresyon" (COMPRESSION_TIERS, task'ın önerdiği alternatif)
   TUTARLI hale getirildi — yeni bir kelime İCAT edilmedi.
3. **Kompresör "eşik" → "threshold"** — `teachingText()`'in FARKLI-kademe
   dalı, tek konum.
4. **Distortion "doygun(luk)" → "saturation"** — `mode-catalog.js` kart
   açıklaması, `level-sheet-terms.js` etiketi, Araçlar sekmesi "Teyp/Radyo"
   referans filtresi metni. Asıl öğretim metni (`teachingText`,
   `DISTORTION_TYPE_INFO`) zaten "Tube (Valf) **Saturation**"/"Tape
   **Saturation**" diyordu — hiç dokunulmadı, doğruydu.
5. **Boost mu Cut mu kart açıklaması** — "Artırım mı, azaltım mı?" → "Boost
   mu, cut mu?" (modun KENDİ oyun-içi soru metniyle BİREBİR aynı cümle —
   yeni bir ifade İCAT edilmedi, var olanı ödünç alındı).
6. **İki `modeDescription()` parantez-sırası** — Reverb'inki maddede-1
   fixiyle zaten çözüldü (parantez TAMAMEN kalktı, "reverb" birincil oldu).
   Distortion'ınki AYRI: "(bozulma karakteri farklı)" parantezi kaldırıldı,
   `app.js:2168`'in ZATEN doğru olan "distortion'ı FARKLI olanı seç"
   cümlesiyle TUTARLI hale getirildi.

**DENETİMDE KAÇAN, BU TURDA BULUNAN 7. KONUM (dürüstlük notu — task "5
konum" demişti Kompresör için, uygulama sırasında 6.'sı bulundu):**
Araçlar sekmesinin "Bluetooth hoparlör" referans filtresi ("Dar bant,
sıkıştırılmış.") ÖNCEKİ turun denetiminde KAÇMIŞTI (aynı `TOOL_FILTERS`
dizisindeki "Teyp/Radyo" satırının "doygunluk"u bulunmuştu ama bu satırın
"sıkıştırılmış"ı atlanmıştı) — bu tur "kompresyonlu"ya çevrildi, RAPORA
buradan not düşülüyor (sayı uydurmamak için).

**DOKUNULMAYAN (denetimde "sorun değil" çıkanlar — TEK TEK yeniden
doğrulandı, Node'un UTF-8-farkında araması ile — bkz. Doğrulama):**
"isabet oranı" (accuracy rate, ratio değil), "kazanç"/"atak"/"tepe" (kod
yorumları, kullanıcı görmüyor), "gecikme" (JS zamanlama, Delay efekti bu
uygulamada hiç yok), `upload.js`'in "sıkıştırılmış"ı (dosya/codec
sıkıştırması, doğru bağlam), Pan/Stereo/Mono/EQ (zaten İngilizce).

**YENİ test dosyası `test/terminology.test.mjs` + 3 mod dosyasının
KENDİ test dosyalarına eklenen regresyon kilitleri:**
`mode-catalog.js`'in 14 kart açıklamasının HİÇBİRİ 6 yasaklı çeviriyi
(yankı/doygun/sıkıştır/eşik/artırım/azaltım) İÇERMİYOR, `level-sheet-
terms.js`'in 10 etiketi de aynı şekilde — GERÇEK veriyle (mock değil)
doğrulanıyor. `kompresor.test.mjs`/`reverb.test.mjs`'e HER İKİ dal (tip-
farkı/kademe-farkı ile aynı-tip/miktar-farkı) + `getHintText` + `modeDescription`
+ gerçek `createQuestion` çıktılarıyla (5-10 kademe × 15 tekrar) uçtan uca
regresyon testi eklendi. `distortion.test.mjs`'e `modeDescription` kilidi
eklendi (teachingText zaten "doygun" aramıyordu, mevcut testler yeterliydi).

**Doğrulama:**
- `npm test`: **916/916** (882 → +34: kompresor +1, reverb +1, distortion
  +1 [çoklu assertion içeren tek `it()` blokları], `terminology.test.mjs`
  +31 [14+4 katalog, 10+3 level-sheet]).
- Node'un KENDİ UTF-8-farkında string arama scriptiyle (bash `grep`'in
  Türkçe "ş" karakterinde locale kaynaklı YANLIŞ NEGATİF verdiği bu turda
  BULUNDU ve düzeltildi — dürüstlük notu, ilk doğrulama denemesi güvenilmez
  çıktı verdi) TÜM 6 dosya TEK TEK tarandı: kalan HER "yankı"/"doygun"/
  "sıkıştır"/"eşik" örneği SADECE `//` yorum satırlarında — kullanıcıya
  görünen TEK bir örnek kalmadı.
- Öğretim metinlerinin ANLAMI korundu — sadece isim/terim değişti, cümle
  yapısı/mantığı (hangi dalın ne zaman tetiklendiği, hangi sayının
  gösterildiği) TEK SATIR değişmedi (testler bunu zaten doğruluyor: aynı
  regex'ler `/İkisi de/`, `/sen A dedin/`, decay/ratio/threshold sayı
  değerleri hâlâ eskisi gibi eşleşiyor).
- **Dürüstlük notu — CANLI/cihaz doğrulaması YİNE YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi) — yeni metinlerin cihazda GERÇEKTEN
  doğru göründüğü (satır taşması, Türkçe iyelik eki "reverb'i"nin doğru
  render edildiği vb.) gözle DOĞRULANMADI. Kod incelemesi + 34 yeni test +
  Node tabanlı tam-dosya taraması kadarı garanti.

**KORUMA:** Mekanik/ses/zorluk/sınav/paywall TEK SATIR değişmedi — SADECE
kullanıcıya görünen metin. `evaluateAnswer`/`createQuestion`/zorluk
eğrileri/COMPRESSION_TIERS'ın `max` sınırları vb. hiçbiri dokunulmadı.

---

Önceki commit (G65, tek commit) — **"Serbest" (sonsuz) Oyun Türü ücretsizde
KİLİTLİ görünüyor (Pro rozeti + 🔒), basınca paywall açılıyor.** Cihaz
testinde bulunan kafa karışıklığı: G61'de "Serbest" ücretsizde SEÇİLEBİLİR
bırakılmıştı ("ekran değil sadece kural" kararı, bkz. PAYWALL.md) — kullanıcı
seçebiliyordu ama 5-soru sınırı yüzünden pratikte 5'te duruyordu, "seçtim
ama çalışmıyor" izlenimi veriyordu.

**BULUNAN ÖNCEDEN-HAZIR PARÇA:** `core/paywall.js:isFreePlayModeLocked(isPro)`
G61'de ZATEN tanımlanmıştı ama HİÇ ÇAĞRILMAMIŞTI (`grep` ile doğrulandı, tek
kullanım yeri kendi tanımı + test dosyasıydı) — bu tur o boşluğu dolduruyor.

**DÜZELTME:** Oyun Ayarları'nın genel `openSheet()` satır-render mekanizması
(sourceSelect'in "Dosya seç" kilidiyle AYNI desen, G61) `playModeSelect`'in
"free" seçeneğine ÖZEL bir dal kazandı: `isLockedFreePlay` true iken satır
onay yerine 🔒 + "Pro" rozeti (`.mode-chip.mode-chip-pro`, mod kartlarıyla
AYNI bileşen) gösteriyor, tıklanınca `openPaywallReason("freePlayMode")`
(YENİ 7. `PAYWALL_REASONS` girdisi) paywall'ı açıyor. `enforceFreeRestrictions()`
(G61'den beri var olan downgrade-tutarlılık fonksiyonu) artık `playModeSelect`
hâlâ "free"deyse "10 Soruluk Bölüm"e de zorluyor — `playModeSelect` kalıcı
bir `prefs` alanına YAZILMADIĞI için (HTML'nin kendi `<option selected>`'ı
her sayfa açılışında "free"e döner) bu, YENİ bir kullanıcının İLK ekranında
bile kilitli bir seçeneğin "şu an seçili" görünmesini önlüyor.

**Doğrulama:**
- `npm test`: **882/882** (değişmedi — bu tur net YENİ test eklemedi, mevcut
  `paywall.test.mjs`'in "7 tetikleme noktası" testleri GÜNCELLENDİ [6→7
  anahtar] ve `isFreePlayModeLocked` zaten G61'den beri test ediliyordu,
  DOM'a dokunan kısım ise proje kısıtı gereği [CLAUDE.md] hiç unit test
  edilemiyor).
- Kod incelemesiyle doğrulandı: `PAYWALL_REASONS.freePlayMode` + `LOCK_MESSAGES.
  freePlayMode` ikisi de tanımlı (ilk-oturum toast fallback'i de doğru
  mesajı gösterir, "modeLocked"un YANLIŞ/alakasız dB-Reverb-Tonal-Distortion
  metnini ÖDÜNÇ ALMADI — bu turda fark edilip AYRI bir reasonKey açıldı).
- **Dürüstlük notu — CANLI/cihaz doğrulaması YİNE YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi) — kilit rozetinin/🔒'nün GERÇEKTEN
  doğru göründüğü, tıklayınca paywall'ın GERÇEKTEN açıldığı, Pro'da satırın
  GERÇEKTEN normal (kilitsiz) çalıştığı gözle DOĞRULANMADI. Kod incelemesi
  kadarı garanti.

**KORUMA:** Paywall mantığı/ekranı (G63'ten beri çalışan `openPaywallReason`/
`resetPaywallToGeneric` mekanizması) TEK SATIR değişmedi — SADECE YENİ bir
`reasonKey` ve bir sheet-satırı kilidi eklendi. 10 mod/ses dokunulmadı.

---

Önceki commit (G64, tek commit) — **`renderLevelSheet` tek-dil bug'ı düzeltildi:
her mod artık Seviye bilgi sayfasında KENDİ terminolojisini konuşuyor**
(SIRADAKİ'de uzun süredir kayıtlı bilinen bir eksikti — "9 modun 9'u da
'Bant genişliği/Değişim miktarı' — Frekans Bulma'nın dili — konuşuyordu").

**KÖK SEBEP:** `renderLevelSheet` `core/difficulty-curve.js:difficultyParams
(level)`'i (JENERİK, SADECE gainDb/Q döndüren, aslen Frekans Bulma için
yazılmış bir fonksiyon) TÜM 10 modda ÇAĞIRIYORDU — Kompresör'ün ratio'yla,
Kesim Noktası'nın kesim marjıyla hiç ilgisi olmayan bir "Bant genişliği"
sayısı gösteriyordu.

**DÜZELTME — YENİ dosya `core/level-sheet-terms.js` (TEK YER, ÇEVİRİYE ZEMİN,
i18n DEĞİL — task'ın kendi ayrımı):** `LEVEL_SHEET_TERMS` sözlüğü 10 mod id'si
→ `{sensitivityLabel, amountLabel, formatSensitivity(p), formatAmount(p)}`.
`renderLevelSheet` artık jenerik `difficultyParams()` YERİNE AKTİF modun
KENDİ `paramsForDifficultyPosition(level)`'ını çağırıyor — 10 mod da bu
fonksiyonu AYNI imzayla (level girdisi) dışa aktarıyor (koddaki kendi
yorumları: "diğer modların paramsForDifficultyPosition'ıyla AYNI mod-agnostik
girdi"), SADECE döndürdükleri alanlar mod-spesifik (gainDb/q, marginOct,
edgeMargin, dbDelta/step, kGap, disturbDb, regionWidthOct/cutStepDb) — bu
YENİ dosya o alanları DOĞRU etikete/birime çeviriyor.

**Terminoloji (task'ın kendi listesiyle birebir):**
Frekans Bulma "Bant genişliği/Frekans artışı" (dB) · Kesim Noktası "Kesim
frekansı marjı" (oktav) · Q Genişliği "Q ayrımı" (edgeMargin, ham sayı) ·
Boost/Cut "Boost/Cut miktarı/Şıklar arası aralık" (dB) · dB Seviyesi
"Seviye farkı/Şıklar arası aralık" (dB) · Kompresör "Ratio ayrımı" (%) ·
Reverb "Reverb ayrımı" (%) · Tonal Denge "Tonal sapma" (dB) · Frekans
Çakışması "Çakışma bölgesi genişliği/Kesim adımı" (oktav+dB) · Distortion
"Doygunluk ayrımı" (%).

**BİLİNÇLİ KARAR — Kompresör/Reverb/Distortion'ın kGap'i FİZİKSEL birime
(dB/saniye) ÇEVRİLMEDİ:** üçünün GERÇEK farkı (`gainReductionDb`/`decayAtK`/
`driveAtK`) HER TURDA rastgele seçilen bir TÜRE bağlı (Reverb'in Room/Hall/
Plate'i, Distortion'ın clip/soft/tube/tape'i) ve bu türlerin aralıkları
BİRBİRİNDEN ÇOK farklı (ör. Reverb decay: Room 0.3-0.9sn, Hall 1.6-3.2sn) —
seviye sayfası için "temsili" bir tür SEÇMEK (ör. hep Hall'ı varsayıp saniye
göstermek) bazı turlarda yanlış/yanıltıcı bir sayı gösterirdi. kGap [0,1]
uzayında yüzde olarak gösteriliyor — TÜRDEN bağımsız, dürüst gerçek zorluk
sinyali. Kompresör'ün özelinde `gainReductionDb` gibi tür-bağımsız bir yol
VARDI ama üçü TUTARLI kalsın diye (task: "kısa kalsın") aynı % yaklaşımı
üçünde de kullanıldı.

**Doğrulama:**
- `npm test`: **882/882** (865 → +17 YENİ `test/level-sheet-terms.test.mjs`
  — MOCK DEĞİL, 10 modun HER BİRİNİN GERÇEK `paramsForDifficultyPosition`'ı
  seviye 1/10/20'de çağrılıp çökmediği/NaN üretmediği + doğru birim
  (oktav/dB/%) içerdiği doğrulandı; ayrıca "hiçbir mod (Frekans Bulma hariç)
  jenerik 'Bant genişliği' etiketini TAŞIMIYOR" testiyle asıl bug'ın
  kilitlendiği).
- Node'da CANLI önizleme (bu turda, rapor için): Kompresör Sv1→Sv20 "Ratio
  ayrımı: %45→%6", Kesim Noktası "Kesim frekansı marjı: 1.6 oktav→1/5
  oktav", Frekans Bulma "Bant genişliği: 1.5 oktav→1/4 oktav" — HEPSİ
  seviyeyle birlikte DOĞRU yönde (zorlaşarak) küçülüyor, sayılar tutarlı.
- **Dürüstlük notu — CANLI/cihaz UI doğrulaması YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi) — Seviye bilgi sayfasının GERÇEKTEN
  doğru göründüğü (kart düzeni, satır aralığı, uzun etiketlerin taşıp
  taşmadığı — ör. "Çakışma bölgesi genişliği" diğerlerinden daha uzun bir
  etiket) gözle DOĞRULANMADI. Kod incelemesi + 17 birim testi + Node'daki
  canlı hesap önizlemesi kadarı garanti.

**KORUMA:** Mod mantığı/ses/zorluk EĞRİSİ/sınav/paywall TEK SATIR değişmedi —
her mod hâlâ KENDİ `paramsForDifficultyPosition`'ını (zaten vardı, `mode
mantığı` parçası) kullanıyor, SADECE bu turda renderLevelSheet'in hangi
fonksiyonu çağırdığı ve sonucu nasıl ETİKETLEDİĞİ değişti — sayıların
KENDİSİ (kGap/gainDb/marginOct/vb.) hiçbir mod dosyasında dokunulmadı.

---

Önceki commit (G63, tek commit) — **Paywall Parça 2: kilit tetiklenince artık
gerçek bir PAYWALL EKRANI açılıyor (toast DEĞİL).** Satın alma (IAP) ve
reklam HÂLÂ yok — "Pro Al"/"Reklam İzle" butonları task'ın kendi tarifiyle
SİMÜLASYON (sırasıyla `devFlags.simulatePro=true` ve +1 can). Detaylar
`PAYWALL.md`'nin "Kapsam — Parça 2" ve "Paywall ekranı — 6 tetikleme noktası"
bölümlerinde.

**MEVCUT "SATIN ALMA" EKRANI (EKRAN 10) YENİDEN KULLANILDI, İKİNCİ bir ekran
İCAT EDİLMEDİ:** `app.js:openPaywallReason(reasonKey)` — `core/paywall.js`'e
eklenen `PAYWALL_REASONS` (6 anahtar: `sessionLimit`/`livesOut`/`modeLocked`/
`upload`/`dailyUsed`/`zoneHistory`, her biri kicker/title/detail/buttons) ile
AYNI DOM'u iki moda göre yeniden düzenliyor: GENEL navigasyon (Ayarlar →
"Pro'ya geç", Araçlar kilit örtüleri — `resetPaywallToGeneric()`, bağlamsal
bant gizli/"Geri yükle" görünür) ve BAĞLAMSAL (6 tetikleme — bant görünür/
"Geri yükle" gizli/"Reklam İzle" SADECE `livesOut`'ta). Pro kartının madde
listesi artık `core/paywall.js:PRO_BENEFITS`'ten (6 madde, task'ın kendi
listesi) JS'te üretiliyor — HTML'de sabit bir kopya YOK (`payProModes` id'si
kaldırıldı, `payProBenefits` container'ı geldi). Fiyat ₺199→**₺399**
(task'ın kendi rakamı) `core/paywall.js:PRO_PRICE`'a taşındı, app.js'teki
lokal kopya SİLİNDİ (tek kaynak).

**6 TETİKLEME NOKTASI — hepsi ESKİ (Parça 1) toast/session-end çağrısının
YERİNE geçti, ama o eski davranış SİLİNMEDİ, İLK OTURUM FALLBACK'İ oldu:**
1. 5. soru bitince, 2. Canlar bitince — `finalizeIfGameOver()`'ın iki dalı,
   artık `openPaywallReason("sessionLimit"/"livesOut")`. Ayrıca `startRound`/
   `startBtn`/`goToNextRound`'un ÜÇÜNÜN de tekrarlayan "hâlâ 0 can mı" girişi
   TEK bir YENİ `blockIfLivesOut()` fonksiyonuna toplandı (kullanıcı paywall'ı
   kapatıp reklam/Pro almadan tekrar denerse burası tetiklenir).
3. Kilitli moda basınca (dB/Reverb/Tonal/Distortion), 5. Frekans Çakışması
   günde-1 bitince — `renderModeGrid`'in kart click'i, `access.reason`'a göre
   `"modeLocked"`/`"dailyUsed"`.
4. Yükle butonuna basınca — `.upload-trigger-btn` (Oyun Ayarları+Motor 3),
   Ses Kaynağı sheet'inin "Dosya seç" satırı, `toolsUploadBtn` — ÜÇÜ de.
6. İlerleme'de bulanık grafiğe basınca — `zoneList`'in `pointer-events:none`'ı
   KALDIRILDI (artık tıklanabilir, imleç `pointer`), TEK SEFERLİK bir click
   dinleyicisi eklendi (`innerHTML` her `renderZonePanel()`'de değişse de
   `zoneList`'in KENDİSİNE bağlı dinleyici hayatta kalır, child'a değil).

**"İLK OTURUMDA PAYWALL YOK" — task'ın kendi kuralı, YENİ saf fonksiyon
`paywall.isFirstSession(totalRoundsEver)`:** `app.js`'te script başlarken
BİR KEZ `stats.rounds` okunup `const paywallSuppressedFirstSession`e
donduruluyor — bu runtime'ın TAMAMI boyunca sabit (kullanıcı bu ziyarette
kaç tur oynarsa oynasın "ilk oturum" durumu bozulmuyor, SADECE uygulama
yeniden açılınca `stats.rounds>0` olduğu için paywall aktif olur).
`openPaywallReason()` bu bayrağı KENDİSİ kontrol ediyor, `false` dönerse
ÇAĞIRAN taraf G61'in eski davranışına düşüyor — kısıtlamanın KENDİSİ
(5 soru/can/kilit) yine de geçerli kalıyor, SADECE paywall ekranı o ilk
ziyarette hiç açılmıyor.

**Doğrulama:**
- `npm test`: **865/865** (859 → +6 YENİ: `isFirstSession`'ın iki dalı,
  `PAYWALL_REASONS`'ın 6 anahtarının HEPSİNİN kicker/title/detail/buttons
  içerdiği + SADECE `livesOut`'un "livesOut" buton setini kullandığı,
  `PRO_BENEFITS`'in 6 madde olduğu, `PRO_PRICE`'ın ₺399 olduğu).
- Kod incelemesiyle TEK TEK doğrulandı: 6 tetikleme noktasının HEPSİ
  `openPaywallReason()` çağırıyor + `false` dönünce doğru eski davranışa
  düşüyor (`grep` ile her çağrı sitesi tekrar okundu); `resetPaywallToGeneric()`
  GENEL navigasyonun (`goProBtn`, `analyzeLock`/`filtersLock`) ÜÇÜNDE de
  ÖNCE çağrıldığı doğrulandı (bağlamsal durumun genel yola SIZMAMASI için).
- **Dürüstlük notu — CANLI/cihaz doğrulaması YİNE YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi). Paywall EKRANININ gerçekten
  DOĞRU bağlamla açıldığı, "Pro Al"a basınca kilitlerin GERÇEKTEN kalktığı,
  "Reklam İzle"nin GERÇEKTEN can dolduğu, ilk oturumda GERÇEKTEN hiç
  açılmadığı gözle DOĞRULANMADI — kod incelemesi + 6 yeni birim testi +
  sözdizimi kontrolü kadarı garanti. app.js hiç unit test edilemiyor
  (CLAUDE.md'nin kendi kısıtı, DOM bağımlılığı) — bu yüzden `openPaywallReason`/
  `blockIfLivesOut`/`resetPaywallToGeneric` gibi DOM'a dokunan fonksiyonların
  KENDİSİ test edilemedi, SADECE besledikleri saf veri (`PAYWALL_REASONS`/
  `isFirstSession`/`PRO_BENEFITS`/`PRO_PRICE`) test edildi. Kullanıcının
  cihaz testi bir sonraki turda BEKLENİYOR.

**KORUMA:** Parça 1'in kısıtlama MANTIĞI (5 soru/can dolumu/mod erişimi/
sınav kilidi/seviye kilidi) TEK SATIR değişmedi — SADECE kilit tetiklendiğinde
GÖSTERİLEN şey (toast → paywall ekranı) değişti. 10 mod/ses/zorluk dokunulmadı.

---

Önceki commit (G62, tek commit) — **Paywall Parça 1 düzeltmesi: ücretsizde seviye
sınırı KALKTI + kilitli modlar doğru mesaj veriyor.** Cihaz testinde G61'in
gerçek bir mantık hatası bulundu: ücretsiz kullanıcı Kompresör'e (G61'de
tier "pro"dan "free"ye çevrilmişti ama `unlockLevel:12` KALMIŞTI) "Seviye
yetersiz" diyerek takılıyordu — Kompresör onun için zaten TAM AÇIK 5 moddan
biriydi. Kök sebep: `renderModeGrid()`'in `meetsLevel` (seviye kilidi) ile
`access` (Pro/günlük-tadımlık kilidi) AYRI iki eksendi, ama meetsLevel ÖNCE
kontrol ediliyordu — level'e takılan bir mod, Pro-kilitli de olsa "Seviye
yetersiz" mesajını GÖSTERİYOR, `access`'in doğru "Pro gerekli" mesajına HİÇ
ULAŞAMIYORDU (dB Seviyesi/Reverb/Tonal Denge/Distortion'ın hepsinde AYNI bug).

**KÖK NEDEN — kullanıcının kendi teşhisi, kod incelemesiyle doğrulandı:**
Seviye/sınav sistemi ZATEN Pro özelliği (G61: `examGateActive()` free'de HER
ZAMAN false, dolayısıyla `stats.examState` free kullanıcı için hiç kurulmuyor,
seviye hiç ilerlemiyor) — ücretsiz kullanıcının hiç ulaşamayacağı bir seviye
eşiğine takılması yapısal olarak anlamsızdı.

**DÜZELTME — YENİ saf fonksiyon `core/paywall.js:meetsLevelRequirement(isPro,
academyLevel, unlockLevel)`:** `isPro=false` iken HER ZAMAN `true` döner
(academyLevel/unlockLevel'a HİÇ bakılmaz) — seviye kilidi artık SADECE
Pro'da (gerçek IAP ya da geliştirici simülasyonu) gerçek karşılaştırmayı
yapıyor. `app.js:renderModeGrid`'deki eski inline `devFlags.simulatePro ||
academyLevel>=unlockLevel` formülü `devFlags.simulatePro ||
paywall.meetsLevelRequirement(isUserPro(), academyLevel, unlockLevel)`
oldu (matematiksel olarak eşdeğer bir üçüncü OR terimi eklemek yerine SAF
fonksiyona taşındı — hem G62'nin kendi mantığı test edilebilir hem app.js'in
DOM-bağımlılığı yüzünden test edilemeyen kısmı MİNİMİZE edildi). Seviye kilidi
free'de her zaman açık olduğu için `playable` artık free kullanıcıda TÜM
kayıtlı (registry'de var olan) modlar için `true` — bu da G61'in ZATEN var
olan `access` (Pro/günlük-tadımlık) kontrolünü DOĞAL olarak TEK erişim ekseni
hâline getiriyor, dB/Reverb/Tonal/Distortion artık doğru "Pro gerekli"
mesajını (seviye mesajı DEĞİL) gösteriyor — İKİNCİ bir kod değişikliği
GEREKMEDİ, tek satırlık kök-neden düzeltmesinin doğal sonucu.

**Doğrulama:**
- `npm test`: **859/859** (857 → +2 YENİ test, `meetsLevelRequirement`'ın
  hem free hem Pro dalı: free'de academyLevel çok düşük/unlockLevel çok
  yüksek olsa BİLE `true`, Pro'da eşiğin TAM altında `false` — Kompresör'ün
  gerçek vakası [academyLevel:1, unlockLevel:12] birebir test edildi).
- Kod incelemesiyle doğrulandı: `grep "unlockLevel\|meetsLevel"` ile
  `renderModeGrid()`'in TEK çağrı noktası olduğu YENİDEN teyit edildi (başka
  hiçbir yerde bağımsız bir seviye kontrolü yok).
- **Dürüstlük notu — CANLI/cihaz doğrulaması YİNE YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi) — kullanıcının cihazda bulduğu bug
  kod incelemesiyle DOĞRULANDI ve düzeltildi, ama düzeltmenin cihazda
  gerçekten çalıştığı bu oturumdan görülemedi. Kullanıcının kendi cihaz
  testi bir sonraki turda BEKLENIYOR.

**KORUMA:** Pro'daki seviye/sınav sistemi (`examSystem`, `academyLevel`
formülü) TEK SATIR değişmedi — sadece free'de NE ZAMAN devreye girdiği
düzeltildi. 10 mod/ses/zorluk dokunulmadı.

---

Önceki commit (G61, tek commit) — **Paywall Parça 1: Ücretsiz/Pro KISITLAMA
MANTIĞI kuruldu** (satın alma/ekran/reklam YOK — task'ın kendi kapsam
sınırı, bkz. YENİ `PAYWALL.md`). Görev "PAYWALL.md (repoda)" diyordu ama
dosya repoda hiç yoktu (`find`+`git log --all` ile doğrulandı) — kurallar
DOĞRUDAN görev talimatından alındı, PAYWALL.md bu turda İLK KEZ yazıldı
(kalıcı referans, DURUM.md'nin paywall karşılığı).

**YENİ SAF MODÜL — `www/js/core/paywall.js`:** Tüm kısıtlama mantığı TEK
dosyada, hiçbiri `Date.now()`/`localStorage`'ı KENDİSİ okumuyor (zaman/durum
PARAMETRE) — CLAUDE.md'nin createQuestion/evaluateAnswer için istediği
saflık şartı bu turda TÜM bir modüle uygulandı. `test/paywall.test.mjs`
(YENİ, 28 test) her fonksiyonu izole doğruluyor — bu arada bir gerçek bug
YAKALADI: `applyLivesRefill`'in ilk taslağı `!lastRefillAt` (falsy) kontrolü
kullanıyordu, `lastRefillAt=0` (epoch başlangıcı, testin kendi senaryosu)
"hiç referans yok" sayılıp dolumu hep 0'a düşürüyordu — `== null` kontrolüne
çevrilerek düzeltildi, testler bunu YAKALADIĞI İÇİN commit'e hiç girmedi.

**MOD ERİŞİMİ:** `mode-catalog.js`'in `tier` alanı SADECE kart rozeti,
gerçek karar `paywall.FREE_MODE_IDS`'ten (5: Frekans Bulma/Kesim Noktası/
Q Genişliği/Boost mu Cut mu/**Kompresör** — sonuncusu tier'i "pro"dan
"free"ye çevrildi, ikisi elle senkron tutuldu). 4 mod (dB Seviyesi/Reverb/
Tonal Denge/Distortion) `reason:"pro"` ile kilitli. Frekans Çakışması
"günde 1 tadımlık" — `stats.dailyTasteLastPlayedAt` + YEREL takvim günü
karşılaştırması (UTC DEĞİL) + **saat-geriye-alma istismarı** açıkça
engellendi (`now<lastPlayedAt` → hâlâ kilitli, testle kilitlendi). İşaretleme
ANI mod kartına dokunulduğunda DEĞİL gerçek round BAŞLADIĞINDA (yanlış
tıklama günün hakkını çalmasın); "Tekrar Oyna" mod kartına hiç uğramadığı
için AYRI bir savunmacı kontrol de eklendi (`startBtn`'in fresh-start dalı).

**OTURUM LİMİTLERİ:** 5 soru/oturum — `finalizeIfGameOver()` artık `currentLives
<=0` (can bitti) İLE `roundsInThisPlaySession>=5` (free) AYNI çıkış noktasından
geçiyor, `showSessionEnd` üçüncü bir `"freeLimit"` kind'i kazandı (kendi
kicker/renk/lead metniyle, "normal"/"lost"un DEĞİŞTİRİLMEDEN yanına). Can
dolumu GERÇEK zaman-tabanlı oldu (`stats.livesLastRefillAt` + `paywall.
applyLivesRefill`, 30 dakikada 1, DRIFT YOK — referans noktası TAM tüketilen
süre kadar ilerliyor) — `storage.js`'teki eski "geçici köprü" (`lives<=0 →
TOTAL_LIVES` anlık sıfırlama, task'ın kendi tabiri) KALDIRILDI, iki yerde
("Canların bitti" kartları) artık UYDURULMAYAN, GERÇEK "N dakikada 1 can
dolacak" metni var. Kontrol noktaları: açılış, `visibilitychange` (ön plana
dönüş), `startFreshAttempt`. Sınav sistemi (`core/exam-system.js`) HİÇ
DEĞİŞMEDİ (task: "Pro'da çalışan, DOKUNULMAZ") — sadece app.js'in onu ne
zaman devreye aldığı TEK bir `examGateActive()` fonksiyonundan geçiyor,
eski ~15 dağınık `mode.EXAM_ENABLED` okuması BUNA yönlendirildi (8'i
identik `examHandled` satırıydı, `replace_all` ile TEK Edit'te değişti).
Mod-bazlı XP/Sv rozeti (task: "KISITLANMAYAN") BUNDAN ETKİLENMEDİ — kod
incelemesiyle doğrulandı, `progress.modeLevel`/`ACHIEVEMENTS` hiçbir yerde
`isUserPro()`'ya bakmıyor.

**DİĞER KİLİTLER:** Kendi dosya yükleme (Oyun Ayarları + Motor 3 slotları +
Ses Kaynağı sheet'inin "Dosya seç" satırı — İKİ AYRI kod yolu, ikisi de
kapatıldı), Sabit zorluk seçimi (üç UI noktası + downgrade sonrası state
düzeltmesi için YENİ `enforceFreeRestrictions()` — split-brain'i önlüyor:
Pro'yken kaydedilmiş "Sabit" tercihi free'ye düşünce UI'da DEĞİL gerçek
STATE'te de düzeltiliyor), Bölge seçerek çalışma (UI engeli + `currentFocusRange()`
okuma-anında savunmacı geri düşüş), Zayıf bölge raporu (İlerleme'nin "Şu An
Neredesin" + "en zayıf: X" özeti TAM kilitli — bir CÜMLE bulanıklaştırılamaz),
6 bölge geçmiş analizi (task'ın kendi kelimesi "bulanık önizleme" — `blur(5px)`,
TAM gizleme DEĞİL, veri orada olduğu görülür), Araçlar sekmesi (Analiz/
Referans ZATEN kilitliydi önceki turdan, upload kartı bu turda eklendi).

**TEST EDİLEBİLİRLİK:** `devFlags.simulatePro` (Geliştirici modu) →
`isUserPro()` — açıkken TÜM kısıtlar (mod erişimi/sınav/sabit zorluk/bölge/
upload/zayıf bölge raporu/Araçlar) kalkıyor, kapalıyken GERÇEK kısıtlarıyla
çalışıyor. `syncDevUI()` (anahtar her değiştiğinde) hem `renderModeGrid()`i
hem `enforceFreeRestrictions()`'ı tetikliyor — geçiş ANINDA tutarlı.

**Doğrulama:**
- `npm test`: **857/857** (829 → +28 YENİ `test/paywall.test.mjs`, hiçbir
  eski test bozulmadı).
- `node --check www/js/app.js`: sözdizimi hatası yok (bu boyuttaki bir
  değişiklikten sonra minimum garanti).
- Kod incelemesiyle TEK TEK doğrulandı: 5 mod ücretsiz/4 mod pro-kilitli/
  Çakışma günde-1 listesi `MODE_CATALOG`+`paywall.FREE_MODE_IDS`'ten
  BİREBİR eşleşiyor; `finalizeIfGameOver`'ın YENİ dalı `roundsInThisPlaySession`
  ile AYNI (ÖNCEDEN sadece can için var olan) sayaç mekanizmasını kullanıyor;
  `examGateActive()`'in TÜM eski çağrı noktalarını değiştirdiği `grep
  "mode\.EXAM_ENABLED"` ile YENİDEN doğrulandı (kalan TEK operasyonel
  satır — `currentModeExamLevel()`'daki `if (!mode.EXAM_ENABLED) return
  undefined` — BİLEREK dokunulmadı, free'de zaten examState hiç kurulmadığı
  için doğal olarak zararsız).
- **Dürüstlük notu — CANLI/DOM doğrulaması YAPILAMADI:** bu oturumda tarayıcı
  eklentisi bağlı değildi (önceki turlarda da aynı kısıt kaydedildi) — mod
  kartlarının GERÇEKTEN kilitli görünüp toast'ın GERÇEKTEN çıktığı, can
  kalplerinin 30dk sonra GERÇEKTEN dolduğu, bulanıklaştırmanın GERÇEKTEN
  göründüğü gözle DOĞRULANMADI. Kod incelemesi + 28 birim testi + sözdizimi
  kontrolü kadarı garanti — canlı cihaz/tarayıcı turu AÇIK KALDI.

**KORUMA:** 10 modun oyun mantığı/ses/zorluk EĞRİSİ/reskin HİÇ değişmedi —
sadece ERİŞİM kısıtı eklendi (task'ın kendi sınırı). Sınav SİSTEMİNİN
kendisi (`core/exam-system.js`) TEK SATIR değişmedi, sadece app.js'ten
NE ZAMAN çağrıldığı kısıldı.

---

Önceki commit (G60, tek commit) — **Bundle ID / paket adı iki platformda TEK ve
DOĞRU yapıldı: `com.logicprotrick.audioengineeracademy`.** Önceki durum
(bir önceki sohbetin "Sektör Kıyaslı Durum Analizi" raporunda YAYINA ENGEL
madde #2 olarak bulunmuştu): iOS `com.logicprotrick.eqeartrainer`, Android
(`capacitor.config.json`+`android/app/build.gradle`) `com.eqeartrainer.prox`
— iki platform FARKLI kimlikle mağazaya gidecekti. Henüz hiçbir mağazada
yayınlanmadığı için (proje 12 günlük, `git log` ile doğrulandı) bu değişiklik
güvenliydi — task'ın kendi notu.

**Değiştirilen yerler (hepsi `grep` ile TEK TEK bulundu, tahminle değil):**
`capacitor.config.json` (appId+appName), `android/app/build.gradle`
(namespace+applicationId), Android Java paket klasörü (`git mv
.../com/eqeartrainer/prox/MainActivity.java` → `.../com/logicprotrick/
audioengineeracademy/MainActivity.java`, `package` bildirimi güncellendi),
`android/app/src/main/res/values/strings.xml` (app_name/title_activity_main/
package_name/custom_url_scheme), `ios/App/App.xcodeproj/project.pbxproj`
(iki `PRODUCT_BUNDLE_IDENTIFIER` satırı, Debug+Release), `ios/App/App/
Info.plist` (`CFBundleDisplayName`), `CLAUDE.md` (Bundle ID satırı).
Uygulama görünen adı her iki platformda da **"Audio Engineer Academy"**
(önceden "AE Academy").

**DOĞRULAMA — sadece grep değil, GERÇEK derleme yapıldı (task'ın istediği
"npx cap sync sonrası derlenebilmeli" iddiası koddan değil, bina edilerek
kanıtlandı):**
- `grep -rl "eqeartrainer"` (DerivedData/build/node_modules hariç) → **SIFIR
  sonuç**, tüm repo genelinde.
- `grep -rl "AE Academy"` → **SIFIR sonuç**.
- `npx cap sync` temiz koştu, `ios/App/App/capacitor.config.json` ve
  `android/app/src/main/assets/capacitor.config.json` (git'e takipli
  DEĞİLLER, sync'te otomatik üretiliyorlar) yeni ID'yi doğru yansıttı.
- **iOS: `xcodebuild -scheme App -sdk iphonesimulator build` → BUILD
  SUCCEEDED.** Üretilen `.app`'in kendi `Info.plist`'i `plutil` ile okundu:
  `CFBundleIdentifier=com.logicprotrick.audioengineeracademy`,
  `CFBundleDisplayName=Audio Engineer Academy` — GERÇEK derleme çıktısından
  doğrulandı, statik dosya okumasından değil.
- **Android: `./gradlew assembleDebug` → BUILD SUCCESSFUL** (bu makinede
  `JAVA_HOME` sistemde tanımlı değildi, Android Studio'nun gömülü JBR'ı
  [`/Applications/Android Studio.app/Contents/jbr`] kullanıldı — bir sonraki
  oturumda `JAVA_HOME` hâlâ boşsa aynı yolu kullan). Üretilen `app-debug.apk`
  `aapt2 dump badging` ile okundu: `package name='com.logicprotrick.
  audioengineeracademy'`, `application-label='Audio Engineer Academy'` —
  yine GERÇEK APK çıktısından, tahmin değil.
- `npm test`: **829/829**, değişmedi (mantığa dokunulmadı, kilit altındaki
  koruma sağlandı).

**Yan bulgu (istenmedi ama `npx cap sync`'in doğal sonucu, saklanmadı):**
`android/app/capacitor.build.gradle` ve `android/capacitor.settings.gradle`
`@capawesome/capacitor-file-picker` eklentisini ÖNCEDEN Android native
projesine hiç kaydetmemiş görünüyordu (muhtemelen bu bağımlılık
`package.json`'a eklendikten sonra Android tarafında hiç `cap sync`
çalıştırılmamıştı) — bu turun `cap sync` çağrısı bunu doğru şekilde
kaydetti. Dosya yükleme özelliği Android'de bu commit'ten ÖNCE muhtemelen
hiç native plugin'e bağlı değildi; bu bir yan-etki düzeltmesi, ayrı bir
görev olarak İSTENMEMİŞTİ ama "build çalışır kalmalı" şartının doğal
sonucu olduğu için commit'e dahil edildi, gizlenmedi.

**KORUMA:** Mod mantığı/ses/DOM/test hiçbiri değişmedi — sadece kimlik
(bundle ID + görünen ad) ve `cap sync`'in kendi ürettiği plugin kaydı.

---

Önceki commit (G59, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **MOD 10
"DISTORTION" (Motor 2, dördüncü A/B/C modu) — TAM MOD kuruldu, 10.
oynanabilir mod.** Kompresör'ün (G30/G33) kanıtlanmış three-way/odd-one-out
şablonunun "ikizi" (task'ın kendi tabiri) — three-way-cards.js + core/
exam-system.js TEK SATIR değişmeden miras alındı.

**MEKANİK — Kompresör'ün "tek algısal eksen" dersinin AYNISI, YENİ bir
ikinci eksen (tür) üstüne eklendi:** üç ses (A/B/C), AYNI kaynak, AYNI
distortion TÜRÜ (clip/soft/tube/tape — bkz. altta), ikisi AYNI yoğunlukta
(k=DIST_BASE_K=0.5), biri (oddIndex) farklı yoğunlukta. **Tür zorluk
kademesini SEÇER** (`DISTORTION_TYPES`: easy→clip, medium→soft, hard→tube,
pro/proplus→tape — task'ın kendi eşlemesi), **yoğunluk (k) SORUNUN
KENDİSİNDEKİ ayırt edilebilirliği kontrol eder** (Kompresör'ün kGap'ıyla
BİREBİR aynı matematik — bkz. altta) — iki eksen ayrı roller üstleniyor, bir
SORU İÇİNDE A/B/C'nin ÜÇÜ DE her zaman AYNI türü kullanır (tek algısal eksen
BOZULMASIN diye).

**WAVESHAPER EĞRİLERİ — SAF, gerçek Float32Array üreten fonksiyonlar (`www/
js/modes/distortion.js:buildDistortionCurve`):**
- **clip** — sert clamp (`x*drive` → [-1,1]), YÜKSEK drive'da neredeyse tüm
  eğri ±1'e yapışır (sert köşeli).
- **soft** — `tanh(x*drive)`, simetrik yumuşak kırpma.
- **tube** — ASİMETRİK `tanh` (pozitif/negatif yarım-dalga FARKLI drive,
  0.72× katsayı) — gerçek tüp doygunluğunun karakteristik imzası.
- **tape** — neredeyse DOĞRUSAL, sadece tepe noktalarına yakın küçük bir
  kübik terim (`x - sign(x)*drive*0.15*|x|³`) — task: "inanılmaz ince".
Dört türün DRIVE aralıkları (`DRIVE_RANGES`) KASITLI ÖRTÜŞMÜYOR — clip'in EN
DÜŞÜK drive'ı (2.2) bile tape'in EN YÜKSEK drive'ından (0.9) büyük, "kolay
ekstrem/pro ince" hiyerarşisi SADECE kGap'e değil aralık seçimine de dayanıyor
(testle doğrulandı).

**ZORLUK EĞRİSİ — Kompresör'ün ZATEN kalibre edilmiş `COMP_CURVE_CONFIG`'i
BİREBİR aynı sayılarla taşındı:** kGap [0,1] k-uzayında BOYUTSUZ bir metrik
— hangi türe (drive aralığına) çevrileceğinden BAĞIMSIZ olduğu için
Kompresör'ün "kolaylaşma yok" kalibrasyonu MATEMATİKSEL OLARAK aynen geçerli
kalıyor (node script ile YENİDEN doğrulandı: easy/medium/hard/pro'nun
`representativeLevelForTier`'i eski statik kGap'ten HİÇBİRİNDE büyük değil).
Yeni bir sayı İCAT EDİLMEDİ, mevcut bir kalibrasyon YENİDEN KULLANILDI.

**ÖĞRETİM — task'ın kendi örnek formatı ("B farklıydı — tube saturation.
Sıcak, yumuşak...") BİREBİR:** `DISTORTION_TYPE_INFO` dört türün adı+
karakteri+mix anlamını TEK yerde tutuyor (SoundGym Tips'inden "dolgunluk/
davul kuyruğu/düşük frekans kirlenmesi" ipuçları `tape`'in mixNote'una
işlendi). `intensityWord(k)` (hafif/orta/belirgin/ağır) + tür bilgisi
BİRLEŞTİRİLİYOR — Kompresör'ün COMPRESSION_TIERS'ından FARKLI olarak "aynı
kademe/farklı kademe" ayrımına GEREK YOK (tür SORUNUN TAMAMINDA zaten sabit).

**GÖRSEL — Kompresör'ün SENTETİK zarfının AKSİNE burada GERÇEK bir şey
çiziliyor:** `drawOverlay` WaveShaperNode'un KENDİ transfer eğrisini (giriş
x∈[-1,1]→çıkış y∈[-1,1], `applyProcessing`'in kurduğu node'la BİREBİR aynı
`buildDistortionCurve` çağrısı) çiziyor — clip GERÇEKTEN sert köşeli
görünüyor, tube/tape GERÇEKTEN yumuşak/yuvarlak, çünkü İKİSİ DE aynı
fonksiyondan geliyor (ekstra bir yaklaşıklığa gerek yok). Kırmızı=senin
cevabın, yeşil=doğru (GUESS_COLOR/CORRECT_COLOR, diğer Motor 2 modlarıyla
AYNI paylaşılan renkler).

**KAYNAK: task'ın "davul/groove ideal" bulgusu bir ÖNERİ, KISITLAMA
değil** — `compatibleSourceIds()` (TAM liste, Kompresör'ün transient
şartından FARKLI olarak distortion transient GEREKTİRMEZ, Reverb'in `only`
kısıtından da FARKLI). `kulaklikGerekli:false` (task: "muhtemelen false —
hoparlörde de duyulur").

**SINAV: EXAM_WEAK_AREA export EDİLMEDİ** — Kompresör/Reverb/Tonal Denge'nin
AYNI tier-tabanlı (frekans DEĞİL) telafi yoluna otomatik düşüyor (task'ın
kendi kararı: "zayıf ZORLUK KADEMESİ, frekans-tabanlı değil").

**app.js kablolaması — Motor 2 şablonunun VAAT ETTİĞİ kadar minimal:**
import+registerMode, `THREE_WAY_MODE_IDS`'e "distortion" eklendi (bu TEK
satır `isChoiceFormat`/`.ans` click-delegasyonu/`submitThreeWayGuess`/
`drawOverlay` dispatch'inin TAMAMINI otomatik kapsıyor — G33'ün "ikinci
modda genelleştir" sözü Reverb'de TUTMUŞTU, üçüncü modda da AYNEN tuttu),
+ ÜÇ hardcoded metin dalı (soru başlığı/round-start açıklaması/pushHistory
özeti — Kompresör/Reverb'in AYNI DESENİ, bu ikisi `mode.questionTitle`
export ETMEDİĞİ için app.js'te sabit metin tutuluyor).

**Doğrulama (canlı, tarayıcıda):**
- Mod menüde "Distortion" kartı olarak görünüyor, oynanabilir (mode-catalog.js
  `playable:true`). three-way-cards.js'in BÜYÜK A/B/C kartları (harf+isim+
  waveform+"Çalınıyor" durumu) EKRAN GÖRÜNTÜSÜYLE Kompresör'le BİREBİR AYNI
  görünüyor — gerçek miras (test'te de referans eşitliğiyle doğrulandı).
- 3 ses A/B/C oto-döngüsüyle çalıyor, cevap sonrası doğru/yanlış kartlar
  doğru renkleniyor (`.right`/`.wrong`).
- Kademeli TÜR: Kolay tier'de canlı "hafif clipping" geri bildirimi, Pro
  tier'e (Sabit moda geçip "Pro" seçilerek) geçince canlı "belirgin **tape
  saturation**" geri bildirimi DOĞRU üretildi — task'ın kendi örneğiyle
  BİREBİR ("B farklıydı — belirgin tape saturation... çok ince, neredeyse
  fark edilmez...").
- Görsel: cevap sonrası EKRAN GÖRÜNTÜSÜYLE doğrulandı — kırmızı/yeşil transfer
  eğrisi kolay (clip) turda SERT KÖŞELİ, net görünüyor.
- Sınav sistemi: blind-click testi sırasında GERÇEKTEN "Telafi 1/5"e düştü
  (parkur toplam <6 doğru), telafi kaybedilince "Soru 1/10"a DOĞRU sıfırlandı
  — mekanizma TAM çalışıyor, canlı kanıtlandı (sadece EXAM_* export testiyle
  değil).
- Regresyon: Kompresör canlı test edildi (round baştan sona, konsol hatası
  SIFIR) — THREE_WAY_MODE_IDS'e üçüncü id eklenmesi mevcut iki modu
  etkilemedi.
- `npm test`: **829/829** (771'den +58 — YENİ `test/distortion.test.mjs`
  [56 test: sözleşme/tür-zorluk eşlemesi/WaveShaper eğri şekilleri/k-uzayı
  matematiği/"kolaylaşma yok"/öğretim/applyProcessing/getMeta/EXAM_*/miras],
  `test/exam-coverage.test.mjs`'e Distortion eklendi [+2]).

**KORUMA:** 9 mevcut mod, three-way-cards.js, exam-system.js, reskin, ses/
zorluk HİÇ değişmedi — Distortion kendi izole kod yollarında (`q.mode ===
"distortion"` string dispatch'i) yaşıyor, Kompresör/Reverb'in davranışına
TEK SATIR dokunmadı.

---

Önceki commit (G58, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Küçük bug
temizliği, dört izole düzeltme: Kompresör A şıkkı renk teşhisi (kod DOĞRU
çıktı, ilgili bir yarış-durumu kapatıldı), Öneri kartı gerçek 10-soruluk sete
bağlandı, Q Genişliği'nin (ve paylaşılan 6 başka modun) cevap-sonrası ~42-127px
kayması giderildi, Kompresör'ün kesik sesinin GERÇEK kök sebebi bulundu ve
düzeltildi.**

**1) KOMPRESÖR A ŞIKKI RENK — kod incelemesi + canlı test SONUCU: mantık
DOĞRU, ama gerçek bir yarış-durumu (race condition) bulunup KAPATILDI.**
`three-way-cards.js:markThreeWayCards`'ın `letter===correctLetter/
pickedLetter` mantığı harfe göre AYRIM YAPMIYOR — canlı tarayıcıda A doğruyken
VE A yanlışken AYRI AYRI test edildi, İKİSİNDE de doğru renklendi (regresyon
YOK). YENİ `test/three-way-cards.test.mjs` (6 test, sahte-DOM ile — jsdom YOK
bu projede, tonal-denge.test.mjs'in AYNI deseni) bunu KİLİTLİYOR: A/B/C'nin
HER BİRİ hem "doğru" hem "yanlış" rolünde ayrı ayrı doğrulandı. **Bulunan
GERÇEK (ama nadir) yarış:** Kompresör'ün otomatik A/B/C döngüsü (`abLoopTimer`,
2sn'lik `setInterval`) cevap anında `stopAbLoop()`la temizleniyordu (zaten
vardı) ama JS'in tek-thread'li event loop'unda interval'in callback'i
(`cycleThreeWayPreview`) kullanıcının cevap click'iyle AYNI mikro-pencerede
ZATEN kuyruğa alınmış olabilir — `clearInterval` GELECEKTEKİ tetiklenmeleri
durdurur, kuyrukta BEKLEYEN bir çağrıyı GERİ ÇEKMEZ. `markThreeWayCards`'ın
kendisi `disabled` butonları `updateThreeWayCardsPlayState`'te zaten
ATLATIYORDU (DOM sınıfları için koruma vardı) ama `cycleThreeWayPreview`'ın
KENDİSİ `roundActive` kontrolü YAPMADAN `buildQuestionChain`'i (SES çalmaya
başlayan asıl işlem) yine de tetikleyebiliyordu. Savunma amaçlı `if
(!roundActive) return;` eklendi. **Dürüstlük notu:** bu turda A'nın
RENKLENMEDİĞİ bir durum CANLI OLARAK YAKALANAMADI — kapatılan şey, koda göre
teorik olarak mümkün olan ama bu ortamda tetiklenemeyen bir pencere.

**2) ÖNERİ KARTI → GERÇEK 10-SORULUK SET:** Ana menüdeki "Bugünün Önerisi"
kartının "Başla" butonu ÖNCEDEN sadece `goScreen("game")` çağırıyordu —
`playModeSelect`'in kullanıcının SON seçtiği değeriyle (genelde "Serbest/
sonsuz") oynanıyordu, buton ise sabit "Seti başlat" yazıyordu (yanlış bir
vaat DEĞİLDİ ama belirsizdi). Artık "Tekrar oyna"nın (`els.resCta`) AYNI
mekanizmasını (`startFreshAttempt({forceChallenge:true})`) çağırıyor —
`playModeSelect`'in KALICI tercihine DOKUNMADAN (select'in value'su
DEĞİŞMİYOR, SADECE bu tek deneme için `challenge.active` zorlanıyor) +%50 XP
bonusunu aktif ediyor. Buton etiketi artık `challenge.total`'dan OKUNUYOR
("Seti başlat · 10 soru" — sabit yazıp unutmak yerine tek doğruluk
kaynağından). **Dürüstlük notu — sınav sistemine DOKUNULMADI:** G50'den beri
TÜM 9 mod EXAM_ENABLED olduğu için `challenge`'ın KENDİ "10. soruda otomatik
bitir" mantığı (`ensureAutoNext`'teki `!mode.EXAM_ENABLED` koşulu, G47'den
beri BİLEREK böyle) hiçbir modda ARTIK tetiklenmiyor — 10. soruda examSystem'in
KENDİ parkuru (zaten `PARKUR_LENGTH=10`) devralıp sınav teklifi/toplam
sınav/telafiye GEÇİYOR, session'ı SESSİZCE YARIDA KESMİYOR. "10 soru" vaadi bu
yüzden LİTERAL bir "menüye dön" değil, examSystem'in KENDİ gerçek "Soru N/10"
parkuruna GİRMEK anlamına geliyor — BİLİNÇLİ bir tercih (sınav akışını YARIDA
KESMEMEK için, task: "sınav... DOKUNULMAZ"). Canlı doğrulandı: buton "Seti
başlat · 10 soru" yazıyor, tıklanınca oyun ekranına geçip "Soru N/10" parkuru
BAŞLIYOR. **app.js DOM'a bağlı olduğu için (bu projede app.js HİÇ unit test
edilmiyor, CLAUDE.md: "ses ve DOM davranışı kaynak koddan doğrulanamaz")
node:test testi EKLENEMEDİ** — sadece canlı tarayıcıda doğrulandı, dürüstçe
belirtiliyor.

**3) Q GENİŞLİĞİ 42px KAYMA — KÖK SEBEP BULUNDU VE DÜZELTİLDİ (paylaşılan
altyapı, Q Genişliği'ne ÖZGÜ değilmiş):** Ölçüldü: `#gameScroll`'un (oyun
ekranının kaydırılabilir alanı) `scrollTop`'u cevap ANINDA 0'dan 54.5px'e
sıçrıyordu (Q Genişliği'nde) — Kesim/dB/Boost-Cut'ta da (38-80px) AYNI kök
sebep, SADECE farklı miktarda. **Kök sebep:** `#feedbackBox` (`.fb`) ÖNCEDEN
`display:none` ile SIFIR yükseklik kaplıyordu, cevap verilince `display:block`
olup GERÇEK içerik yüksekliği (~100px) EKLENİYORDU — `.game-scroll`'un toplam
içerik yüksekliği ANİDEN viewport'u aşıyor, `scrollFeedbackIntoView()`
(app.js, G-öncesi bir turda iOS momentum-scroll sorunu için BİLEREK SENKRON/
ANİ yapılmıştı, bu davranışa DOKUNULMADI) onu alta kaydırıyordu. **Düzeltme:**
`.fb` artık `display` DEĞİL `visibility` ile gizleniyor + `min-height:100px`
ile kendi alanını PEŞİNEN ayırıyor — cevap öncesi de sonrası kadar yer
kaplıyor (görünmez ama LAYOUT'TA VAR), yani cevap verilince toplam yükseklik
ANİDEN artmıyor. Reskin'e (renk/tipografi/boyut) DOKUNULMADI — SADECE gizleme
mekanizması. **Canlı doğrulandı (masaüstü tarayıcı, TEMİZ sayfa
yüklemesinden):** Q Genişliği'nde kayma **54.5px → 0px**, Boost mu Cut mu'da
**54.5px → 0px**, Kesim Noktası'nda **38px → 2px**, dB Seviyesi'nde **80px →
2px** (round-start'ın KENDİ ÖNCEDEN VAR OLAN `scrollFeedbackIntoView()`
çağrısı — bkz. app.js "4-6 şık iki satıra taşıyor" notu — artık DOĞRU/nihai
pozisyona İLK seferde kaydırıyor, cevap sonrası AYNI pozisyonda kalınıyor).
**Kapsam dışı bırakılan, İLGİLİ ama AYRI bir bulgu:** Frekans Bulma HÂLÂ
244.5px kayıyor — bu mod `.fb` KULLANMIYOR, kendi AYRI/daha zengin
`#freqInfo` panelini kullanıyor (`mode.showFreqInfoPanel`, SADECE Frekans
Bulma'da var) — task Q Genişliği'ni hedeflediği için bu AYRI mekanizmaya
dokunulmadı, ama gelecekte benzer bir "kayma" şikayeti gelirse kök sebep
BURADA belgelendi.

**4) KOMPRESÖR KESİK SES — TAM kök sebep bulundu (G33 SADECE YARISINI
çözmüştü):** G33, `stopAudio()`'nun gain söndürme zaman sabitini (0.03→0.012)
sıkılaştırmıştı — ama kod incelemesiyle bulundu: AYNI `forEach` adımında,
gain'e söndürme RAMP'i PROGRAMLANDIKTAN HEMEN SONRA `node.disconnect()`
SENKRON (aynı JS tick'inde, `now`'da) çağrılıyordu. Web Audio'da
`disconnect()` ANINDA etkilidir — programlanan gain eğrisi sesin çıkış
noktasına ARTIK HİÇ ULAŞAMIYORDU, yani ramp FİİLEN DUYULMUYORDU (zaman
sabiti 0.03 ya da 0.012 FARK ETMEZDİ — ikisi de "duyulmayan" bir eğriydi,
G33'ün "sıkılaştırma" fixi bu yüzden SADECE kısmi bir iyileşmeydi). Bu,
ÖZELLİKLE Kompresör'ün A/B/C döngüsünün her ~2sn'de bir
`buildQuestionChain`→`stopAudio` çağırdığı yerde SIK tekrarlanan bir sert
kesme demekti. **Düzeltme:** `disconnect()` artık SENKRON değil,
`DISCONNECT_DELAY_MS=100` (ramp'in + `.stop()`'un `now+0.08` zamanlamasının
GERÇEKTEN bitmesinden SONRA) gecikmeyle (`setTimeout`) planlanıyor — ses
ÖNCE gerçekten söner, SONRA bağlantı kesiliyor. Diğer sekiz modun ses zinciri
(fonksiyon imzası/çağrı sırası) DEĞİŞMEDİ, SADECE temizlik zamanlaması.
**Dürüstlük notu:** kulakla NİHAİ doğrulama (gerçek cihazda "artık hiç
tıklama yok" onayı) bu ortamdan YAPILAMAZ (CLAUDE.md) — ama bu, G33'ün
NEDEN "tam çözmediği"ni AÇIKLAYAN, kod-seviyesinde KANITLANMIŞ bir kök
sebep ve düzeltme.

**Doğrulama:**
- 9 mod regresyon: Frekans Bulma/Kesim Noktası/dB Seviyesi/Boost mu Cut
  mu/Q Genişliği/Kompresör canlı test edildi (round baştan sona, konsol
  hatası SIFIR). Motor 2/3'ün paylaşılan altyapısı (three-way-cards.js,
  audio-engine.js) DEĞİŞTİĞİ için Reverb/Tonal Denge/Frekans Çakışması'nın
  KENDİ mekaniğine TEK SATIR dokunulmadığı kod incelemesiyle doğrulandı.
- `npm test`: **771/771** (765'ten +6 — YENİ `test/three-way-cards.test.mjs`).

**KORUMA:** 9 modun oyun mantığı/ses/zorluk/sınav/reskin (renk/tipografi/
boyut) HİÇ değişmedi — SADECE bu dört düzeltme, hepsi izole.

---

Önceki commit (G57, tek commit — kod+DURUM.md birlikte) — **Frekans Çakışması'nda
YANLIŞ cevapta da öğretim: üç aşamanın HER BİRİNDE artık "neden yanlış +
neden doğrusu doğru" açıklaması var (task: "SoundGym 'yanlış' der geçer —
bizim ayrıştırıcımız hatadan öğretmek").**

**PAYLAŞILAN DEKORATİF MODEL — görsel ile öğretim metni ARTIK AYNI zihinsel
haritayı okuyor:** G52'nin `drawOverlay`'inde iki kaynağın "varlık eğrisi"
için kullanılan `SOURCE_CURVE_WIDTH_OCT`/`SOURCE_CURVE_OFFSET_OCT` sabitleri
dosyanın BAŞINA taşındı, YENİ iki saf fonksiyon eklendi: `sourcePeakFreq
(trueCenter, which)` (A/B'nin dekoratif tepe frekansı) ve `dominantSourceAt
(freq, trueCenter)` (verilen bir frekansta hangi kaynağın tepesine DAHA
YAKIN — "orada hangisi güçlü/zayıf" sorusunun cevabı). Gerçek ses FFT'si
DEĞİL (dosya başı computeRegionCurveDb notuyla AYNI "dekoratif ama tutarlı"
ilke) — ama artık AŞAMA 1'in yanlış-cevap öğretimi, `drawOverlay`'in
GÖSTERDİĞİ AYNI amber/mor tepe modeline dayanıyor, birbirinden SAPMIYOR.

**ÜÇ AŞAMANIN YANLIŞ-CEVAP DALLARI (`teachingText`, DOĞRU cevap dalları
HİÇ değişmedi):**
- **AŞAMA 1 (teşhis):** "Yanlış — senin seçtiğin [X]Hz'de [orada baskın olan
  kaynak] var ama [diğeri] zayıf, orada çakışma olmaz. Asıl çakışma [Y]Hz'de
  — ikisi de orada güçlü, mix bulanıklaşıyor." — `[X]` kullanıcının SEÇTİĞİ
  frekans, hangi kaynağın "orada var/zayıf" olduğu `dominantSourceAt` ile
  KİŞİSELLEŞTİRİLİYOR (task'ın kendi örnek formatıyla BİREBİR).
- **AŞAMA 2 (karar):** "Yanlış — [seçtiği kaynak]'dan kesmek çakışmayı
  çözmez, çünkü asıl maskeleyen kaynak [doğru kaynak], [seçtiği] değil.
  [Doğru kaynak]'dan kesmeliydin — [korunması gereken] o bölgede daha
  belirleyici/önemli, yerini korumalı."
- **AŞAMA 3 (çöz):** ÜÇ alt-senaryo — AZ kestiyse ("...az kestin, maske
  hâlâ duruyor, [A] ve [B] tam ayrışmadı"), ÇOK kestiyse ("...çok kestin,
  [kaynak] gereksiz zayıfladı, mixte kayboldu"), DOĞRUYA ÇOK YAKINSA
  (`maskOpenedPct>=75`, task'ın "uygun ince geri bildirim" isteği — kaba
  az/çok mesajı YERİNE) "...çok yakındın (yakınlık %N), biraz daha [az/çok]
  kesmen yeterliydi" gibi nazik bir ton.

**Doğrulama (canlı, tarayıcıda, üç aşamada da yanlış cevap verilerek):**
- AŞAMA 1: *"Yanlış — senin seçtiğin 50 Hz'de Kick var ama Bas zayıf, orada
  çakışma olmaz. Asıl çakışma 60 Hz'de — ikisi de orada güçlü, mix
  bulanıklaşıyor."* EKRAN GÖRÜNTÜSÜYLE/canlı doğrulandı.
- AŞAMA 2: *"Yanlış — Bas'dan kesmek çakışmayı çözmez, çünkü asıl maskeleyen
  kaynak kick, bas değil. Kick'dan kesmeliydin — Bas o bölgede daha
  belirleyici/önemli, yerini korumalı."* canlı doğrulandı.
- AŞAMA 3 (üç alt-senaryo): "çok kestin...gereksiz zayıfladı, mixte
  kayboldu" VE "çok yakındın (yakınlık %75), biraz daha az kesmen
  yeterliydi" ikisi de canlı doğrulandı.
- DOĞRU cevap metinleri (task'ın "Doğru cevap açıklaması KORUNSUN" şartı)
  regresyon testleriyle + canlı ("Doğru! Kick ve Bas 73 Hz'de çakışıyor...")
  doğrulandı — HİÇ değişmedi.
- Konsol hatası SIFIR.
- YENİ testler — `test/frekans-cakismasi.test.mjs`'e üç describe: (1)
  `sourcePeakFreq`/`dominantSourceAt` saf fonksiyon testleri, (2)
  `teachingText()` — her aşamanın hem DOĞRU (regresyon, "Doğru!" ile
  başlıyor mu) hem YANLIŞ (kullanıcının seçtiği değeri/doğru değeri
  içeriyor mu, az/çok/yakın dallanıyor mu) dallarını doğrudan test ediyor,
  (3) `getFeedbackData()` — yanlış cevapta `title="Iskaladın"`, `detail`
  `teachingText`'in yanlış dalıyla BİREBİR aynı, `result.correct=false`.
- `npm test`: **765/765** (753'ten +12).

**KORUMA:** `evaluateAnswer`/`calculateXP`/`createQuestion` SAF kaldı, TEK
SATIR değişmedi — SADECE `teachingText` (ve onu ÇAĞIRAN `getFeedbackData`,
kendisi hâlâ SAF) metin üretimi zenginleşti. Mekanik (teşhis/kaynak/kesme),
sınav sistemi, 8 mevcut mod HİÇ değişmedi.

---

Önceki commit (G56, tek commit — kod+DURUM.md birlikte) — **Frekans Çakışması'nın
"kendi dosyalarım" upload'ı iki GENEL yükleme yuvasına ("Ses 1"/"Ses 2")
dönüştürüldü + butonlar ana ekrana taşınıp Frekans Bulma'nın keşfedilebilirlik
deseniyle hizalandı + üçüncü bir teşhis katmanı eklendi.**

**1) ETİKET DÜZELTMESİ — kick+bas ilişkilendirmesi kalktı:** `OWN_SOURCE_PAIR`
(source-catalog.js) `labelA`/`labelB` `"Kendi A"/"Kendi B"` → **`"Ses 1"/
"Ses 2"`** oldu (işlevsel olarak zaten enstrüman-tarafsızdı, ama task bu
turda daha açık bir genel adlandırma istedi — "kick+bas OLMAK ZORUNDA
DEĞİL"). Upload satırlarının etiketleri de aynı dile taşındı: "Kaynak A/B
yükle" → **"Ses 1/2 yükle"**. Yerleşik üç çift (kick-bas/vokal-gitar/
snare-gitar, `SOURCE_PAIRS`) HİÇ değişmedi — bunlar zaten ayrı, hazır
setler; upload TAMAMEN bağımsız bir dördüncü seçenek (`OWN_SOURCE_PAIR`,
`id:"own"`).

**2) TEŞHİS — "buton tepkisiz" için kök sebep bu ortamda TEKRAR
BULUNAMADI (kod DOĞRU çıktı), ama bir UX/keşfedilebilirlik asimetrisi
bulunup DÜZELTİLDİ:** `pickNativeAudioFile()`/`.upload-trigger-btn`
kablolaması cakismaFileInputA/B için audioFileInput'la (Frekans Bulma'nın
"çalışan" yolu) BİREBİR AYNI kodu paylaşıyordu (aynı forEach döngüsü, aynı
fonksiyon) — programatik `.click()` testleriyle DOĞRULANDI, ikisi de
zincirin AYNI noktasında AYNI şekilde davranıyor. Ama GERÇEK bir asimetri
vardı: Frekans Bulma'da upload'a ulaşmak "Kaynak chip → Dosya seç" (TEK
adım, ana ekrandan); Motor 3'te ise "kaynak-çifti chip'ini kapat → '...'
(Oyun Ayarları) sheet'ini aç → aşağı kaydır → Dosya Seç" (ÜÇ adım, AYRI bir
sheet) gerekiyordu — bu fazladan gezinme cihazda "tepkisiz" izlenimine
katkıda bulunmuş olabilir (sheet kapanış/açılış animasyonlarının üst üste
binmesi gibi zamanlamaya bağlı olası bir etkileşim de dahil, kesin
kanıtlanamadı). **Düzeltme:** iki upload satırı (`cakismaUploadRowA`/B,
AYNI id'ler, YENİDEN OLUŞTURULMADI — sadece taşındı) artık `#gameSettingsSheet`
İÇİNDE değil, ANA OYUN EKRANINDA, kaynak-çifti chip'inin HEMEN ALTINDA —
"Kendi dosyalarım" seçilince TEK adımda görünüyorlar, Frekans Bulma'nın
akışıyla AYNI derinlikte. `syncCakismaVisibility()`'nin görünürlük mantığı
buna göre güncellendi (`#cakismaOwnUploadBlock` tek bir sarmalayıcı artık
toggle ediliyor) — bu arada AYRI bir gerçek hata da YAKALANIP düzeltildi:
`uploadRowSingle`'ın (diğer sekiz modun tekli-upload satırı) gizlenme
koşulu YANLIŞLIKLA sadece `isOwnPair`'e bakıyordu — Motor 3'te bir YERLEŞİK
çift (ör. Kick+Bas) seçiliyken bu ALAKASIZ satır yanlışlıkla görünür
kalıyordu, artık doğrudan `isCakisma`'ya bakıyor.

**3) YENİ TEŞHİS KATMANI — "buton mu ölü, çağrı mı hiç olmuyor" sorusu ARTIK
KESİN ayırt edilebiliyor:** her `.upload-trigger-btn` tıklamasının EN BAŞINA
`console.log('[filepicker-diag] 0) buton tıklandı: data-file-target="..."')`
eklendi (G55'in 1-4 numaralı halkalarının HEMEN ÖNÜNE) — cihazda bu log HİÇ
görünmüyorsa sorun kesinlikle DOM/event-binding'te (buton gerçekten ölü);
görünüp SONRAKİ [filepicker-diag] logları görünmüyorsa sorun
`pickNativeAudioFile()`'ın kendisinde (G55'in zaten belgelediği 4 halka).

**4) ANALİZ MEKANİĞİ — DEĞİŞİKLİK GEREKMEDİ, YENİDEN DOĞRULANDI:**
`createQuestion()` zaten `findSourcePair(settings.pairId)` ile TAMAMEN
generic çalışıyordu (G51'den beri) — iki yüklenen ses, yerleşik üç çiftle
BİREBİR AYNI `stageForIndex`/çakışma-bölgesi/kesim mekaniğine giriyor,
SADECE etiketler değişti. Canlı doğrulandı: vocal.m4a + acoustic_guitar.m4a
("Ses 1"/"Ses 2" olarak) yüklenip round başlatıldı, soru "Ses 1 ve Ses 2
hangi frekansta çakışıyor?" olarak DOĞRU üretildi, spektrum görseli
(G52'nin amber/mor/kırmızı vurgu şeridi) "Ses 1"/"Ses 2" etiketleriyle
DOĞRU render edildi.

**Doğrulama (canlı, tarayıcıda):**
- Upload artık iki GENEL slot: "Ses 1 yükle"/"Ses 2 yükle" etiketleri EKRAN
  GÖRÜNTÜSÜYLE doğrulandı, kick+bas ilişkilendirmesi YOK.
- Butonlar ana ekranda, kaynak-çifti chip'inin hemen altında — "..." sheet'ine
  gitmeye GEREK KALMADI, EKRAN GÖRÜNTÜSÜYLE doğrulandı.
- İki dosya (vocal.m4a, guitar.m4a) yüklenip round başlatıldı, soru "Ses 1 ve
  Ses 2 hangi frekansta çakışıyor?" DOĞRU üretildi — analiz mekaniği
  yerleşik çiftlerle BİREBİR aynı yoldan çalışıyor.
- Yerleşik çift (Kick+Bas, TEMİZ bir sayfa yüklemesinden) regresyonsuz:
  "Kick ve Bas hangi frekansta çakışıyor?" DOĞRU üretildi. **Bilinen/
  ÖNCEDEN belgelenmiş (G52'den beri var olan, bu turda YENİDEN gözlemlenen)
  bir tuhaflık:** round DEVAM EDERKEN pair mid-session değiştirilirse
  (quit→pair değiştir→Oyunu Başlat, sayfa yenilemeden) bir sonraki soru
  BAZEN önceki pair'in etiketleriyle üretilebiliyor — TEMİZ bir sayfa
  yüklemesinde/round başında bu SORUNU YOK, bu G56'nın kapsamı dışında bir
  session-state tuhaflığı (kayıt altına alındı, düzeltilmedi).
- Frekans Bulma'nın upload'ı (referans "çalışan" yol) regresyonsuz —
  butonu hâlâ var/görünür, konsol hatası SIFIR.
- `npm test`: **753/753** (değişmedi — bu tur SADECE DOM/etiket/görünürlük
  kablolaması, hiçbir saf fonksiyon etkilenmedi).

**Dürüstlük notu:** "buton tepkisiz" şikayetinin TAM kök sebebi bu ortamdan
(gerçek cihaz yok) KESİN olarak teşhis edilemedi — kod, Frekans Bulma'nınkiyle
BİREBİR aynı çıktı (programatik testle doğrulandı). Bulunan/düzeltilen şey
GERÇEK bir keşfedilebilirlik asimetrisiydi (üç adım vs bir adım) + gerçek
bir görünürlük hatası (`uploadRowSingle`) — bunlar "tepkisiz" hissini
AÇIKLAYABİLİR ama KANITLANAMADI. Yeni "0) buton tıklandı" logu, kullanıcının
BİR SONRAKİ cihaz denemesinde bunu KESİN olarak ayırt etmesini sağlıyor.

**KORUMA:** Yerleşik üç çift, Frekans Bulma upload'ı, Motor 3'ün 3-aşama
mekaniği, diğer modlar HİÇ değişmedi.

---

Önceki commit (G55, tek commit — kod+DURUM.md birlikte) — **Dosya seçici cihazda
HÂLÂ açılmıyordu (G53'ün native plugin'i de yetmedi) — DERİN TEŞHİS: koddaki
HER halka (Package.swift kaydı, jsName eşleşmesi, deployment target, buton
kablolaması) TEK TEK doğrulandı ve HEPSİ DOĞRU çıktı; kalan tek olası kök
sebep Xcode'un YEREL paket önbelleğinin `npx cap sync`'in güncellediği
Package.swift'i henüz GÖRMEMİŞ olması — bunu kesin olarak ayırt etmek için
cihazda çalışan bir teşhis aracı eklendi.**

**BU ORTAMDAN (masaüstü, gerçek iOS cihaz/Xcode yok) YAPILABİLECEK TÜM
statik denetimler tek tek yapıldı, HEPSİ TEMİZ çıktı — yani sorun koddan
DEĞİL, muhtemelen Xcode'un paket çözümleme durumundan kaynaklanıyor:**
1. **Proje SPM kullanıyor, CocoaPods DEĞİL** (`ios/App` altında Podfile YOK,
   sadece `App.xcodeproj` + otomatik oluşan `project.xcworkspace`) — "pod
   install unutulmuş" teorisi ELENDİ, bu bir SPM projesi.
2. **`App.xcodeproj` → `CapApp-SPM` bağlantısı DOĞRU:** `project.pbxproj`'da
   `XCLocalSwiftPackageReference "CapApp-SPM"` + `XCSwiftPackageProductDependency`
   satırları mevcut, App target Frameworks'e `CapApp-SPM` ürününü doğru
   ekliyor.
3. **`CapApp-SPM/Package.swift` → `CapawesomeCapacitorFilePicker` bağlantısı
   DOĞRU** (G53'te `npx cap sync ios` tarafından zaten eklenmişti, bu turda
   TEKRAR doğrulandı): hem `dependencies` hem `CapApp-SPM` target'ının kendi
   `dependencies` dizisinde `.product(name: "CapawesomeCapacitorFilePicker", ...)`
   var — yani App → CapApp-SPM → FilePicker zinciri paket TANIMLARI seviyesinde
   TAM.
4. **Plugin'in Swift kaynağı `jsName = "FilePicker"` ile KAYIT OLUYOR**
   (`FilePickerPlugin.swift`, `@objc(FilePickerPlugin)` + `CAPBridgedPlugin`
   protokolü — MODERN otomatik-keşif mekanizması, AppDelegate.swift'te
   MANUEL bir kayıt GEREKMİYOR ve YOK/gerekmiyor da zaten) —
   `window.Capacitor.Plugins.FilePicker` adı BİREBİR eşleşiyor, yazım hatası
   YOK.
5. **iOS deployment target uyumlu:** App target `IPHONEOS_DEPLOYMENT_TARGET
   = 15.0`, CapApp-SPM `platforms: [.iOS(.v15)]` — versiyon çakışması YOK
   (olsaydı build HATASI verirdi, "temiz rebuild başarılı" raporuyla zaten
   çelişirdi).
6. `Package.resolved` incelendi — SADECE `capacitor-swift-pm` (uzak paket)
   pinlenmiş, dört yerel paket (volume-buttons/preferences/splash-screen/
   file-picker) `path:` tabanlı OLDUĞU için pinlenmeye zaten İHTİYAÇ
   DUYMUYOR — burada STALE bir kayıt bulunamadı.

**SONUÇ:** Kod/konfigürasyon tarafında bulunabilecek HİÇBİR hata YOK — bu,
Xcode'un LOKAL SPM paket grafiğinin (Package.swift metninin `npx cap sync`
ile değişmesine rağmen) DerivedData/proje önbelleğinde ESKİ (file-picker'sız)
haliyle KALMIŞ olabileceği ihtimalini güçlendiriyor — bu, yerel (path-based)
Swift Package'larla BİLİNEN bir Xcode davranışıdır: uzak paketlerin aksine
Xcode yerel bir paketin Package.swift'i DEĞİŞTİĞİNDE grafiği HER ZAMAN
otomatik yeniden ÇÖZMEYEBİLİR.

**XCODE TARAFINDA KULLANICININ YAPMASI GEREKEN ADIMLAR (bu, koddan
DÜZELTİLEMEYEN tek kalan adım):**
1. Xcode'da projeyi aç: `ios/App/App.xcodeproj` (bu projede AYRI bir
   `.xcworkspace` YOK — CocoaPods değil, SPM).
2. Menüden **File → Packages → Reset Package Caches**.
3. Menüden **File → Packages → Resolve Package Versions**.
4. Sol panelde (Project Navigator üstünde) "Package Dependencies" bölümüne
   bak — **CapawesomeCapacitorFilePicker** listede GÖRÜNÜYOR MU? Görünmüyorsa
   kök sebep KESİNLEŞMİŞ demektir (paket hiç çözülmemiş).
5. **Product → Clean Build Folder** (⇧⌘K).
6. Cihazdan uygulamayı sil (zaten yapılmış), tekrar **Build & Run**.

**YENİ TEŞHİS ARACI — cihazda debugger olmadan da görülebilsin diye
(Ayarlar → Sürüm numarasına 7 kez dokun → GELİŞTİRİCİ → "Dosya Seçici
Testi"):** `pickNativeAudioFile()`'ın zinciri artık DÖRT ayrı halkanın
HER birinde `console.log`/`console.warn`/`console.error` ("[filepicker-diag]"
etiketiyle) VE (Safari Web Inspector'a hiç bağlanmadan da görülebilsin diye)
`toast()` üretiyor:
1. `window.Capacitor` tanımsız mı — Capacitor köprüsü hiç yüklenmemiş.
2. `window.Capacitor.Plugins.FilePicker` tanımsız mı — **EN OLASI kök sebep**,
   yukarıdaki Xcode adımlarını işaret ediyor.
3. `pickFiles()` çağrılıyor mu — çağrıdan HEMEN ÖNCE ayrı bir log (G53'te
   YOKTU, "buton mu ölü, çağrı mı hiç olmuyor" ayrımı bu satır olmadan
   YAPILAMAZDI).
4. `pickFiles()` dönüyor mu (sonuç/iptal) yoksa reddediyor mu (native hata,
   mesajı toast'a da yazılıyor).
Test butonu bu dört senaryoyu (Capacitor yok / plugin yok / başarılı /
iptal-veya-hata) AYRI AYRI özetleyen bir SONUÇ toast'ı da gösteriyor —
gerçek yükleme akışlarından (Motor 3, tekli upload) TAMAMEN İZOLE, task'ın
"basitleştir" isteği.

**Doğrulama (bu ortamda — masaüstü, `window.Capacitor` doğal olarak yok):**
- Fallback senaryosu (gerçek durum bu ortamda): test butonu → "1) window.
  Capacitor TANIMSIZ" logu + "Sonuç: Capacitor YOK" toast'ı DOĞRU üretildi.
- SAHTE `window.Capacitor = {Plugins:{}}` (Capacitor var, plugin YOK —
  G55'in hedeflediği asıl cihaz senaryosu) ile test edildi: "2) ... TANIMSIZ
  — plugin native tarafta KAYITLI DEĞİL" logu + "Sonuç: Plugin KAYITLI
  DEĞİL" toast'ı, Xcode adımlarını işaret eden metinle DOĞRU üretildi.
- SAHTE plugin (`pickFiles` gerçek bir blob döndüren) ile test edildi:
  "3) pickFiles() ÇAĞRILIYOR" → "4) pickFiles() DÖNDÜ" logları + "Sonuç:
  BAŞARILI ✓" toast'ı DOĞRU üretildi.
- Motor 3'ün çift-upload proxy butonları (cakismaFileInputA/B) ve tekli
  upload'ın fallback zinciri (G52/G53) REGRESYONSUZ çalışmaya devam ediyor
  — canlı test edildi. Motor 3'ün 3-aşama mekaniği bozulmadı.
- Konsol hatası SIFIR. `npm test`: **753/753** (değişmedi — bu tur SADECE
  DOM/plugin/teşhis kablolaması, hiçbir saf fonksiyon etkilenmedi).

**Dürüstlük notu:** kod/konfigürasyon tarafında YAPILABİLECEK HER şey
doğrulandı ve düzeltildi (aslında düzeltilecek bir HATA bulunamadı — hepsi
zaten doğruydu) — ama native picker'ın cihazda GERÇEKTEN açılıp açılmadığı
BU OTURUMDA YİNE doğrulanamaz. Yeni teşhis aracı, kullanıcının BİR SONRAKİ
cihaz denemesinde kök sebebi KESİN olarak (dört olasılıktan hangisi
olduğunu) görmesini sağlıyor — bu, "muhtemelen X" yerine "KESİNLİKLE X"
diyebilmek için GEREKLİ bir sonraki adım.

**KORUMA:** Motor 3 mekaniği, diğer modlar, ses işleme HİÇ değişmedi —
sadece teşhis/log derinliği + izole bir test butonu eklendi.

---

Önceki commit (G54, tek commit — kod+DURUM.md birlikte) — **9 modun kaynak
listesi tek tek denetlendi — Frekans Bulma'da kayıp enstrümanlar (davul +
enstrüman grupları) bulundu ve geri getirildi, diğer 8 mod DOĞRU çıktı.**

**KÖK SEBEP — G50/G51/G52'de DEĞİL, G42'den (06.08.2026, bu tur ÖNCESİ) beri
var olan eski bir teknik borç:** `source-catalog.js`'e davul/enstrüman
örnekleri G4'te eklendiğinde ve merkezi `compatibleSourceIds()` filtresi
G42'de kurulduğunda, dört "frekans-genel" mod (Kesim Noktası/dB Seviyesi/
Boost mu Cut mu/Q Genişliği) bu yeni mekanizmaya taşındı — ama Frekans
Bulma'nın `getMeta()`'sı G42'nin KENDİ commit mesajında "yedi mod dosyası
(**Frekans Bulma hariç**)" diye AÇIKÇA belgelenen bir istisnayla ESKİ, elle
yazılmış bir diziyi (`["pink","white","saw","square","triangle","upload"]`)
KORUDU — bu dizi `compatibleSourceIds()`'ten ÖNCEKİ, davul/enstrüman
kataloğa eklenmeden ÖNCEKİ bir kalıntıydı, hiçbir zaman geri dönülüp
tamamlanmadı. Sonuç: kick/snare/hihat/tom/groove/bass/bass_alt/guitar/vocal
Frekans Bulma'nın Kaynak sheet'inde HİÇ görünmüyordu — cihazda kullanıcı
raporuyla YAKALANDI (`git log -S` ile doğrulandı: satır `4f6879a`'da —
projenin çok erken bir turunda — tanımlanmış, G42 SIRASINDA bilinçli olarak
dokunulmamış).

**9 MODUN TEK TEK DENETİM SONUCU:**
| Mod | Beklenen | Durum |
|---|---|---|
| Frekans Bulma | TÜM kaynaklar | **BOZUKTU → DÜZELTİLDİ** |
| Kesim Noktası | TÜM kaynaklar | Doğruydu (G42'den beri `compatibleSourceIds()`) |
| dB Seviyesi | TÜM kaynaklar | Doğruydu |
| Boost mu Cut mu | TÜM kaynaklar | Doğruydu |
| Q Genişliği | TÜM kaynaklar | Doğruydu |
| Kompresör | transient'sız (pink/white) hariç TÜMÜ | Doğruydu (G42'nin `requireTransient`) |
| Reverb | SADECE gitar/vokal/snare/groove/upload | Doğruydu (G43'ün `only` düzeltmesi) |
| Tonal Denge | SADECE groove/upload | Doğruydu (G45'in kendi kararı) |
| Frekans Çakışması | çift-tabanlı (uyumluKaynaklar boş, SOURCE_PAIRS 3 çift) | Doğruydu (G51/G52) |

**DÜZELTME — `frekans-bulma.js`:** `import { compatibleSourceIds } from
"../core/source-catalog.js";` eklendi, `getMeta().uyumluKaynaklar` artık
diğer dört frekans-genel modla BİREBİR AYNI çağrıyı (`compatibleSourceIds()`,
parametresiz — TÜM kaynaklar) kullanıyor. `source-catalog.js`'in KENDİSİNE
(SOURCE_GROUPS/SOURCE_PAIRS/compatibleSourceIds) TEK SATIR dokunulmadı —
sorun HER ZAMAN Frekans Bulma'nın KENDİ eski satırındaydı, merkezi
mekanizmada değil.

**Doğrulama:**
- Canlı, tarayıcıda (hard reload ile modül önbelleği bypass edilerek):
  Frekans Bulma'nın Kaynak sheet'i artık SENTETİK + **DAVUL** (Kick/Snare/
  Hi-Hat/Tom/Davul Döngüsü) + **ENSTRÜMAN** (Bas C2/Bas E2/Akustik Gitar/
  Vokal) + KENDİ DOSYAM dört grubunu EKRAN GÖRÜNTÜSÜYLE gösteriyor —
  önceden SADECE SENTETİK+KENDİ DOSYAM vardı. Reverb'in kısıtlı listesi
  (`["guitar","vocal","snare","groove","upload"]`) DEĞİŞMEDEN doğrulandı.
  Konsol hatası SIFIR.
- YENİ regresyon çiti — `test/source-catalog.test.mjs`'e "G54 — 9 modun
  kaynak listesi doğru mu" describe'u: her modun `getMeta().uyumluKaynaklar`'ı
  DOĞRUDAN beklenen kümeyle karşılaştırılıyor (Frekans Bulma/Kesim/dB/Boost-
  Cut/Q → TÜM kaynaklar birebir liste; Kompresör → pink/white hariç;
  Reverb/Tonal Denge → tam eşitlik; Frekans Çakışması → boş + SOURCE_PAIRS
  3 çift) — böylece gelecekte HERHANGİ bir mod sessizce eski/eksik bir
  listeye düşerse test KIRILIR (bu turdaki hatanın YAKALANAMAMASININ asıl
  sebebi, `compatibleSourceIds()`'in KENDİSİNİN test edilip ÇAĞIRAN
  tarafın/her modun HİÇ test edilmemesiydi).
- `npm test`: **753/753** (744'ten +9 — yukarıdaki yeni describe).

**KORUMA:** Mod mantığı/ses/zorluk/sınav HİÇ değişmedi — SADECE
`frekans-bulma.js`'in `getMeta().uyumluKaynaklar` satırı düzeltildi.
Reverb/Kompresör/Tonal Denge/Frekans Çakışması'nın KASITLI kısıtları
DOKUNULMADAN korundu (yukarıdaki tabloda TEK TEK doğrulandı).

---

Önceki commit (G53, tek commit — kod+DURUM.md birlikte) — **Dosya yükleme cihazda
HÂLÂ açılmıyordu (G52'nin transform düzeltmesi yetmedi) — KÖK ÇÖZÜM: web
`<input type="file">` tamamen terk edildi, Capacitor'ın NATIVE dosya seçici
plugin'ine (`@capawesome/capacitor-file-picker`) geçildi.**

**ÖNCE KONTROL (task'ın istediği):** Repo'da (DURUM.md, koddaki "cihazda
doğrulandı" notları) upload'ın gerçek cihazda ÇALIŞTIĞI tek bir yer
BULUNAMADI — tüm "cihazda doğrulandı" kayıtları SES OYNATMA hatalarıyla
ilgiliydi (HTTP 0, kesik çalma), dosya SEÇİCİNİN kendisiyle ilgili hiçbir
olumlu kayıt yok. Yani kopyalanacak çalışan bir yol YOKTU — task'ın kendi
"yoksa native'e geç" dalına gidildi.

**KÖK ÇÖZÜM — native plugin:** `@capawesome/capacitor-file-picker@8.0.4`
(`@capacitor/core@8.4.2` ile uyumlu) kuruldu, `npx cap sync ios` ile iOS
projesine (Package.swift, CocoaPods) eklendi — artık 4 Capacitor plugin'i var
(volume-buttons/preferences/splash-screen/**file-picker**). `FilePicker.
pickFiles()` `UIDocumentPickerViewController` kullanıyor — plugin'in kendi
README'si: **"iOS'ta hiçbir gizlilik açıklaması (Info.plist izni)
GEREKMEZ"** (SADECE `pickImages`/`pickMedia`/`pickVideos` — foto galerisi
seçicileri — izin ister, biz onları KULLANMIYORUZ). Bu yüzden Info.plist'e
HİÇBİR ekleme yapılmadı — plugin'in kendi Swift kaynağı (`FilePicker.swift`)
`UIDocumentPicker` kullandığı kod incelemesiyle DOĞRULANDI.

**app.js kablolaması — projenin KENDİ yerleşik "global window.Capacitor.
Plugins.*" deseni izlendi (bundler YOK, storage.js:getPreferencesPlugin/
app.js:getVolumeButtonsPlugin'in AYNI deseni — hiçbir ES-module `import`
eklenmedi):**
- `getFilePickerPlugin()` — `window.Capacitor.Plugins.FilePicker`'ı okur,
  yoksa `null`.
- `pickNativeAudioFile()` — plugin varsa `pickFiles({limit:1})` çağırır,
  sonucu (web'de `.blob`, iOS/Android'de `.path` + plugin'in KENDİ önerdiği
  `fetch(Capacitor.convertFileSrc(path))` deseni) upload.js'in beklediği
  gerçek bir `File` nesnesine köprüler ve döner. **`undefined`** dönerse
  (plugin bu ortamda YOK — masaüstü/web geliştirme) çağıran taraf G52'nin
  relocated (transform'suz) `<input type="file">`'ına DÜŞER — web fallback
  HİÇ SİLİNMEDİ, sadece artık İKİNCİL yol.
- `processSingleUploadFile`/`processCakismaUploadFile`/`processToolsUploadFile`
  — eski `change` listener'larının GÖVDESİ bu üç fonksiyona ÇIKARILDI (saf
  "bir File al, doğrula/yükle/geri-bildirim ver" mantığı) — hem native hem
  web-fallback yolu AYNI fonksiyonları çağırıyor, tek doğrulama/hata kod
  yolu, davranış İKİ platformda BİREBİR aynı.
- `.upload-trigger-btn` tıklaması artık ÖNCE `pickNativeAudioFile()` dener,
  `undefined` dönerse eski `.click()` proxy'sine düşer. `sourceSelect`
  sheet'inin "Dosya seç" satırı ve Araçlar sekmesinin (`toolsUploadBtn`,
  sadece ad/boyut gösteren statik örnek — gerçek ses zincirine bağlı değil)
  yükleme butonu da AYNI deseni aldı (kullanıcının "hiçbir yerde açılmıyor"
  raporu geniş yorumlandı, tutarlılık için).

**Doğrulama (bu ortamda, masaüstü tarayıcı — `window.Capacitor` doğal olarak
YOK):**
- Fallback dalı: `pickNativeAudioFile()` gerçekten `undefined` döndü,
  proxy buton doğru şekilde relocated input'u `.click()`'ledi, gerçek dosya
  (kick.m4a, `fetch`+`DataTransfer`) uçtan uca yüklendi — G52'nin davranışı
  BİREBİR korundu.
- Native dal (KÖPRÜ MANTIĞI): `window.Capacitor.Plugins.FilePicker.
  pickFiles` SAHTE bir plugin ile İKİ AYRI senaryoda taklit edildi — (1)
  `.blob` alanlı sonuç (web-tipi), (2) `.path` alanlı sonuç (iOS/Android-tipi,
  `convertFileSrc`+`fetch` zinciri) — İKİSİ de doğru şekilde `File`
  nesnesine dönüşüp `processCakismaUploadFile`'a ulaştı, "bass.m4a/vocal.m4a
  başarıyla yüklendi" geri bildirimi + dosya adı satırı DOĞRU render edildi.
  **Dürüstlük notu:** bu SADECE JS köprü mantığının (blob/path→File
  dönüşümü, doğrulama, uploadManager.loadFile) doğruluğunu kanıtlıyor —
  `UIDocumentPickerViewController`'ın GERÇEKTEN CİHAZDA açılıp açılmadığı bu
  ortamdan doğrulanamaz (native Swift kod, masaüstü tarayıcıda hiç çalışmaz).
  Plugin resmi olarak Capacitor 8 ile uyumlu ve iOS için CocoaPods/SPM
  entegrasyonu `npx cap sync ios` ile başarıyla kuruldu — nihai onay
  kullanıcının cihazda denemesini gerektiriyor.
- Regresyon: Frekans Bulma'da bir round sorunsuz oynandı, konsol hatası
  SIFIR. Motor 3'ün 3-aşama mekaniği/sınav mirası/diğer 7 mod HİÇ
  değişmedi (bu tur SADECE dosya SEÇME yöntemini değiştirdi, ses işleme
  zincirine — `uploadManager.loadFile`/`decodeAudioData` — tek satır
  dokunulmadı).
- `npm test`: **744/744** (değişmedi — bu tur SADECE DOM/plugin kablolaması,
  hiçbir saf fonksiyon etkilenmedi, yeni test gerekmedi).

**KORUMA:** Motor 3 mekaniği, 8 mevcut mod, ses işleme zinciri HİÇ
değişmedi. `package.json`'a TEK yeni bağımlılık eklendi
(`@capawesome/capacitor-file-picker`), `node_modules`'te 1 paket kuruldu.

---

Önceki commit (G52, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Frekans
Çakışması (Motor 3): cihazda AÇILMAYAN upload düzeltildi + 2 yeni kaynak çifti
+ spektrum renkleri ayrıştırıldı.** G51'de "TEMEL AT" olarak kurulan Motor 3'ün
kullanıcı tarafından cihazda bulunan üç eksiği kapatıldı.

**1) UPLOAD KÖK SEBEP BULUNDU VE DÜZELTİLDİ — WebKit/iOS'un `<input type="file">`
+ transform hatası:** `.bottom-sheet` (oyun ayarları sheet'i, kaynak dosyası
yükleme satırlarının bulunduğu yer) HER ZAMAN aktif bir `transform` taşıyor
(`transform:translateY(100%)` kapalıyken, `translateY(0)` açıkken — `none`
DEĞİL, HİÇBİR zaman). WebKit/iOS'un uzun süredir bilinen bir hatası: bir
`<input type="file">`'ın ATALARINDAN HERHANGİ biri transform taşıyorsa (identity
`translateY(0)` DAHİL) dokunma native dosya seçiciyi AÇMIYOR. Masaüstü
Chrome'da bu hata hiç yok — G51'in TÜM canlı doğrulamaları SADECE masaüstü
tarayıcı otomasyonuyla yapıldığı için (bkz. DURUM.md G51) bu hiç yakalanmadı;
kullanıcı gerçek cihazda test edince ortaya çıktı. **Düzeltme:** gerçek
`<input type="file">` elemanları (audioFileInput + cakismaFileInputA/B — TEK
upload'ı da kapsıyor, AYNI hata ona da bulaşıyordu) DOM'da bu sheet'in
DIŞINA, `<body>`'nin doğrudan çocuğu olarak (index.html sonuna) taşındı —
`.file-input-native` (styles.css) ile görsel olarak gizli (`display:none`
DEĞİL, bazı WebKit sürümlerinde bu `.click()` güvenilirliğini bozabiliyor;
`position:fixed;opacity:0` kullanıldı). Eski konumlarında SADECE görünür bir
proxy `<button class="upload-trigger-btn" data-file-target="...">` kaldı —
tıklanınca SENKRON (await/setTimeout YOK, "kullanıcı jesti" zincirini kesmesin
diye) hedef inputun `.click()`'ini çağırıyor (app.js'te TEK generic listener,
tüm proxy butonları kapsıyor). Seçilen dosya adı artık native inputun kendi
satır-içi gösteriminin YERİNE yeni bir `.upload-filename` span'ıyla JS'ten
yazılıyor (`#audioFileInputName`/`#cakismaFileInputAName`/`...BName`).
**Doğrulanan:** relocated üç input'un da ATA ZİNCİRİNDE transform YOK (JS'ten
`getComputedStyle` ile tek tek kontrol edildi); proxy buton tıklaması hedef
inputun `.click()`'ini GERÇEKTEN tetikliyor (event listener'la doğrulandı);
gerçek bir dosya (kick.m4a, `fetch()`+`DataTransfer` ile input'a atanıp
`change` event'i tetiklenerek) uçtan uca yüklendi — `uploadManager.loadFile`
çalıştı, "kick.m4a başarıyla yüklendi" geri bildirimi + dosya adı satırı
EKRAN GÖRÜNTÜSÜYLE doğrulandı. **Dürüstlük notu:** bu son adım (gerçek native
seçicinin CİHAZDA açılması) masaüstü tarayıcı ortamından DOĞRULANAMAZ — kök
sebep (transform ataları) giderildi ve ilgili WebKit hatası iyi belgeli/
bilinen bir hata olduğu için yüksek güvenle düzeltildiği düşünülüyor, ama
NİHAİ doğrulama kullanıcının cihazda tekrar denemesini gerektiriyor.

**2) İKİ YENİ HAZIR KAYNAK ÇİFTİ — `source-catalog.js:SOURCE_PAIRS`
genişletildi:** task'ın verdiği üç hazır setten eksik olan ikisi eklendi:
vokal+gitar (`region:[500,2000]`, ORTA bölge — task: "~2kHz orta",
frekans-bulma.js'in FA_ZONES ORTA sınırlarıyla hizalı) ve snare+gitar
(`region:[200,2000]`, task'ın kendi verdiği "~200Hz-2kHz" aralığı BİREBİR).
Yeni ses dosyası GEREKMEDİ — `vocal.m4a`/`acoustic_guitar.m4a`/`snare.m4a`
zaten `SOURCE_GROUPS`'ta vardı (G51'den önce bile), G52 SADECE bunları
Motor 3'ün çift-listesine YENİ eşleme olarak ekledi. `createQuestion()`
zaten `findSourcePair(settings.pairId)` ile TAMAMEN generic çalıştığı için
(G51'de kick-bas için kurulan mimari) mod dosyasında SIFIR ek kod gerekti —
sadece `index.html`'in `#cakismaPairSelect`'ine iki yeni `<option>` eklendi.
Canlı doğrulandı: pair seçici artık 4 seçenek gösteriyor (Kick+Bas/Vokal+
Gitar/Snare+Gitar/Kendi dosyalarım), Vokal+Gitar seçilip round başlatılınca
soru doğru şekilde "Vokal ve Gitar hangi frekansta çakışıyor?" ve trueCenter
gerçekten 500-2000 Hz aralığında üretildi (ekran görüntüsü: 68 Hz DEĞİL,
1.76 kHz'lik bir çakışma sorusu).

**3) SPEKTRUM RENKLERİ AYRIŞTIRILDI — task'ın "iki kaynak FARKLI renkte,
çakışan bölge VURGULU" kararı uygulandı:** G51'in görseli aslında iki AYRI
kaynak spektrumu ÇİZMİYORDU — sadece TEK bir "çakışma bölgesi" eğrisi vardı
(DURUM.md G51'in "iki kaynağın spektrumu üst üste" ifadesi yanıltıcıydı,
gerçek kod tek eğriliydi). Şimdi: her kaynağın trueCenter'ın hafifçe altına/
üstüne (0.55 oktav) kaydırılmış, dar (1.1 oktav) bir "varlık eğrisi" —
Kaynak A = amber (`--am`, uygulamanın ana vurgusu), Kaynak B = mor (`--pu`,
Motor 3'ün KENDİ marka rengi — MOTOR_INFO[3] ve kaynak-çifti chip'iyle AYNI)
— mavi YOK (task: "iZotope mavisine yaklaşma"). Çakışma bölgesi artık ÜÇÜNCÜ
bir dolgu-eğrisi DEĞİL (ilk taslak böyleydi — iki kaynağın rengini ÜSTÜNE
düşüp BASTIRIYORDU, "net ayrışsın" isteğiyle çelişiyordu) — DİKEY bir vurgu
şeridi (`drawCollisionBand`, centerFreq±widthOct/2 aralığını kaplayan
yarı-saydam kırmızı dikdörtgen + parlak üst kenar çizgisi), kaynakların
eğrilerinin ARKASINA çizilir, böylece amber/mor HER ZAMAN üstte/görünür
kalır. Legend iki satıra çıktı: "● [LabelA] ● [LabelB]" + "● Çakışma bölgesi"
(+ cevap sonrası "● Senin seçimin", GUESS_COLOR — COLLISION_COLOR'dan
BİLEREK farklı bir kırmızı tonu, ikisi aynı anda görünebildiği için
karıştırılmasın diye). EKRAN GÖRÜNTÜSÜYLE doğrulandı — Vokal+Gitar gibi geniş
region'lu çiftlerde amber/mor/kırmızı NET ayrışıyor (bkz. ekran görüntüsü:
sol tepe amber "Vokal", sağ tepe mor "Gitar", ortada parlak kırmızı şerit).
**Bilinen sınırlama (yeni tespit edildi, düzeltilmedi):** kick-bas çiftinin
region'ı ([50,160] Hz) frekans-bulma.js'in PAYLAŞILAN ekseninin kendi
FA_MIN'inin (80 Hz) ALTINA sarkıyor — bu G51'den beri var olan, bu turda
farkedilen bir sınır sorunu (80 Hz altı x-koordinatları ekranın SOLUNA taşıp
kırpılıyor, kick-bas'ta iki kaynağın görsel ayrışması diğer çiftler kadar net
değil). FA_MIN'i değiştirmek PAYLAŞILAN bir sabit (frekans-bulma.js, diğer
sekiz modun ekseni) olduğu için KAPSAM DIŞI bırakıldı — DOKUNULMAZ listesine
giriyor.

**KORUMA:** Motor 3'ün 3-aşama mekaniği, sınav mirası, 8 mevcut mod HİÇ
değişmedi — regresyon kontrolü Frekans Bulma'da canlı yapıldı (bir round
sorunsuz oynandı, konsol hatası SIFIR). `npm test`: **744/744** (738'den +6 —
yeni `test/frekans-cakismasi.test.mjs` testleri: vokal-gitar/snare-gitar
çiftlerinin varlığı+region'ları+source-catalog tutarlılığı, findSourcePair
üç hazır çiftin hepsini çözüyor mu, pro tier'de 50 seed'lik benzersizlik
stres testi HER İKİ yeni çift için).

---

Önceki commit (G51, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **MOD 9
"FREKANS ÇAKIŞMASI" (MOTOR 3) — TEMEL AT: iki kaynaklı maskeleme teşhis+çöz
modu, 8. oynanabilir mod olarak menüye eklendi.** Motor 1 (değeri bul) ve
Motor 2 (hangisi farklı) değil — İKİ kaynağın AYNI ANDA çaldığı, bir frekans
bölgesinde ÇAKIŞTIĞI YENİ bir motor. SoundGym'de/rakiplerde karşılığı
bulunamadı (araştırıldı) — projenin en özgün modu.

**MİMARİ KARAR — "3 aşama" AYNI turda değil, seviyeye göre AÇILAN AYRI
tur'lar:** Task metni "AŞAMA 1/2/3" ifadesiyle tek bir round içinde üç adımlık
bir akış çağrıştırıyordu, ama prototype.html'in kendi tasarım notu AÇIKÇA
"Aşamalar seviyeye göre açılır" diyor (level-gated, tek turda tek aşama).
Bu ÇELİŞKİ, kod tabanının KENDİ kanıtlanmış emsaliyle (`boost-mu-cut-mu.js:
layerForIndex` — "bir soru = bir katman, hangi katman sessionQuestionIndex
eşiğine göre seçilir") çözüldü: `stageForIndex(sessionQuestionIndex)` — Soru
1-3 → Aşama 1 (TEŞHİS: çakışma hangi bölgede?), Soru 4-9 → Aşama 2 (KARAR:
hangi kaynaktan kesmeli?), Soru 10+ → Aşama 3 (ÇÖZ: ne kadar kesmeli? +
öncesi/sonrası dinle). BİLİNÇLİ bir mühendislik kararı olarak koda yorumla
belgelendi (ürün kararı DEĞİL — task'ın kendi "TEMEL AT" çerçevesi ve minimum-
risk state-machine hedefiyle gerekçelendirildi), kullanıcıya AYRICA
sorulmadı.

**KAYNAKLAR — `core/source-catalog.js`'e YENİ, AYRI bir `SOURCE_PAIRS`
listesi (mevcut `SOURCE_GROUPS`'a HİÇ dokunulmadı):** şimdilik TEK çift
(kick+bas, 50-160Hz sub/bas bölgesi) — vokal+gitar/gitar+snare gibi diğer
çiftler task'ın kendi "şimdilik temel" talimatıyla SONRAYA bırakıldı
(KULAKLA/ÜRÜN DOĞRULANMADI, ileride genişleyecek). `OWN_SOURCE_PAIR` (id:
"own") kullanıcının KENDİ iki dosyasını (`upload-a`/`upload-b` sentinel ID,
`findSource()`'tan BAĞIMSIZ, app.js/audio-engine.js'te özel çözümlenir)
AYRI AYRI yüklemesini temsil eder — HER dosya için 100 MB sınır (TOPLAM
değil, HER BİRİ), index.html'deki gerçek buton metniyle canlı doğrulandı
("Kaynak A/B yükle (her biri 100 MB'a kadar)").

**İKİ KAYNAKLI SES MİMARİSİ — `audio-engine.js`'e SADECE EKLEME, tek
kaynaklı 8 modun hiçbir kod yoluna dokunulmadı:** `buildDualSourceChain()`
mevcut `buildQuestionChain`'in kaynak-tipine-göre-bağlanma mantığını (upload/
pink/white/sample/synth) İKİ KEZ çalıştırır, iki bağımsız gain→filtre
zinciri kurar, ikisi de PAYLAŞILAN `compressor`→`out`→`muteGain`'e akar.
`setDualCut(sourceKey, gainDb)` — Motor 1'in dry/wet crossfade zihniyetinin
(`setProcessed`) AYNI kalıbı: SEÇİLEN kaynağın filtresini hedef dB'ye,
DİĞERİNİ 0'a `setTargetAtTime` ile yumuşak kaydırır (öncesi/sonrası
düğmelerinin arkasındaki mekanizma). `createUploadManager()`'ın (upload.js)
STATELESS FACTORY olduğu keşfedildi — bu sayede `uploadManagerA`/
`uploadManagerB` diye İKİNCİ bir bağımsız yükleme örneği, upload.js'e HİÇ
dokunmadan app.js'te iki satırla açıldı. `setDualSolo()` de yazıldı (A/B/
İkisi-birden crossfade) ama HİÇBİR UI kontrolüne bağlanmadı — bilinçli
kapsam sadeleştirmesi, kullanılmayan ama çalışan bir yetenek olarak
belgelendi.

**KADEMELİ ZORLUK — `CAKISMA_CURVE_CONFIG` + merkezi `logLerp`/
`applyPostCapFloor`, diğer modlarla AYNI "baştan doğru kalibrasyon" yöntemi:**
Aşama 1'de zorlukla ÇAKIŞMA BÖLGESİ daralır (regionWidthOct), Aşama 3'te
KESİM HASSASİYETİ artar (cutStepDb küçülür). İlk taslak sabitleri
"kolaylaşma yok" invaryantını (curve(tier'in temsili seviyesi) ≤ statik
DIFFICULTY[tier]) hard kademesinde İHLAL ETTİ — node script'iyle binary-
search yapılıp düzeltildi (regionWidthOct AT_CAP 0.4→0.38/FLOOR 0.32→0.3,
cutStepDb AT_CAP 0.8→0.72/FLOOR 0.65→0.55, timeSec AT_CAP 9→7.5/FLOOR 7→6),
final değerler testle doğrulandı.

**SINAV SİSTEMİ MİRAS ALINDI (G47-G50'nin AYNI merkezi altyapısı, TEK SATIR
bile değişmedi):** `EXAM_ENABLED=true`, `EXAM_DIFFICULTY="pro"`,
`EXAM_WEAK_AREA="zone"` (çakışma frekans-tabanlı olduğu için zon-tabanlı
telafi, G50'nin `getWeakArea` dispatcher'ı SADECE bu üç satırı okuyarak
otomatik doğru dala düştü).

**MOD SÖZLEŞMESİ:** `getMeta` (5 tier + EXAM_*+ kaynak çiftleri),
`createQuestion`/`evaluateAnswer` SAF kaldı (stage-branched ama ses/DOM
bağımsız), `applyProcessing` (`{filterA, filterB}` döner), `calculateXP`,
`getFeedbackData` — mevcut 8 modla BİREBİR aynı desen.

**app.js kablolaması — generic dispatch desenleri (`q.mode==="cakisma"`)
TÜM mevcut dallara EKLENDİ, hiçbiri DEĞİŞTİRİLMEDİ:** `isChoiceFormat()`,
`renderQuestion()`, `.ans` click-delegasyonu, `drawVisualizer()`'ın mode-
agnostik `overlayState` torbası (`cakismaGuess` alanı, "diğer modlar
okumuyor" kuralı korunarak). Yeni `submitCakismaGuess()` — 6 generic submit
fonksiyonunun (G50) AYNI iskeleti, stage-3'te `audioEngine.setDualCut(...)`
ile `stopAudio()` YERİNE geçen özel dal + `#cakismaCompare` önce/sonra
satırı aktivasyonu.

**Doğrulama (canlı, tarayıcıda):**
- Mod menüde görünüyor ve oynanabilir — `mode-catalog.js`'te
  `kulaklikGerekli:true`/`playable:true`'ya çevrildi (sub/bas bölgesi
  kulaklıkta daha net ayrışıyor gerekçesiyle — KULAKLA doğrulanmadı, makul
  varsayım).
- 3 aşama sırayla çalışıyor: Aşama 1 (bölge şıkları), Aşama 2 (hangi
  kaynaktan-kes), Aşama 3 ("50 Hz'de Kick'dan ne kadar kesmeli?" gibi sayısal
  yakınlık sorusu, ör. gerçek feedback: "Kick'dan 5.1 dB kesilmesi
  gerekiyordu, sen 7.3 dB dedin — yakınlık %75") — EKRANDAN canlı doğrulandı.
- Çözünce maskeleme açılıyor mu: Aşama 3 cevaplandıktan sonra `#cakismaCompare`
  (Önce/Sonra) satırı görünür oluyor, `setDualCut` ile filtre gerçekten
  hareket ediyor — buton tıklamaları `.on` class'ını doğru şekilde
  değiştirdiği JS'ten doğrulandı.
- Kademeli zorluk: birim testlerle ("kolaylaşma yok" invaryantı) + canlı
  oturumda Aşama 1/3 soru zorluğunun seviyeyle inceldiği gözlemlendi.
- Upload iki AYRI yol: "Kendi dosyalarım" çift seçilince `#cakismaUploadRowA`/
  `#cakismaUploadRowB` (her biri "100 MB'a kadar" etiketiyle) göründü,
  gerçek dosyalar (kick.m4a/bass.m4a, Chrome uzantısı file-input aracıyla)
  YÜKLENDİ, ikisi de yüklenmeden round başlatılmaya çalışılınca doğru uyarı
  çıktı ("Kendi dosyalarım seçiliyse A ve B için ayrı ayrı bir ses dosyası
  seçmelisin"), ikisi de yüklenince round BAŞARIYLA başladı ve soru "80
  Hz'de Kendi A'dan ne kadar kesmeli?" biçiminde kaynak etiketleriyle
  (Kendi A/Kendi B) doğru render edildi — TAM uçtan uca canlı doğrulandı.
- Öğretim + görsel: cevap sonrası mix-dili öğretim metni + iki kaynağın
  spektrumunun üst üste, çakışma bölgesi vurgulu (BiquadFilterNode.
  getFrequencyResponse tabanlı GERÇEK eğri, boost-mu-cut-mu.js'in AYNI
  tekniği) çizildiği kod incelemesiyle + ekran görüntüsüyle doğrulandı.
  **Bilinen kozmetik sorun (düzeltilmedi):** `drawAxis` `!q` guard'ından
  ÖNCE çağrıldığı için oyun başlamadan da eksen çiziliyor ve en soldaki "80"
  etiketi kenara kırpılıp sadece "0" görünüyor — işlevi ETKİLEMİYOR.
- Sınav sistemi: kombo-6 → "Sınav hakkı kazandın!" teklif sheet'i doğru
  metinle EKRANDAN canlı doğrulandı. Mekanik olarak AYNI şeyi test eden
  telafi akışı (parkur <6 doğru → "Telafi 1/5" → 5 soru → geç/kal → yeni
  parkur "Soru 1/10") UÇTAN UCA İKİ KEZ canlı doğrulandı — `examSystem.
  label()`'ın faz geçişlerini ("Soru N/10"/"Telafi N/5") doğru okuduğu
  KANITLANDI. **Dürüstlük notu:** tam SINAV akışı (kabul→4 soru→geç/kal)
  bu oturumda uçtan uca TAMAMLANAMADI — bu modun Aşama 2/3 puanlaması
  ikili doğru/yanlış değil SAYISAL YAKINLIK yüzdesi olduğu için, önceden
  belirlenmiş `Math.random` ile "her zaman doğru tıkla" yöntemi (G47-G50'de
  kullanılan) burada işlemedi; kombo-tetikli teklif sheet'i + AYNI merkezi
  kod yolunu kullanan telafi akışının uçtan uca çalışması BİRLİKTE güçlü
  bir kanıt sayılıyor, ama "BÖLÜM GEÇTİN" ekranı bu modda GÖRÜLMEDİ
  (7 diğer modda G50'de zaten görülmüştü, exam-system.js'e bu turda TEK
  SATIR dokunulmadı).
- Regresyon: Frekans Bulma'da (paylaşılan `playQuestion`/`startRound`/
  `renderQuestion`/`stopAudio`/`.ans` click-delegasyonu — bu turda dokunulan
  TÜM ortak fonksiyonlar) bir round baştan sona sorunsuz oynandı, konsol
  hatası SIFIR. Kompresör'e (Pro kilit, satın alma gerektirdiği için AYRICA
  kilit açılmadı) doğrudan girilemedi — bu tek regresyon maddesi TAMAMLANAMADI,
  kod incelemesiyle (dokunulan dallar TÜMÜ `mode.MODE_ID==="frekans-cakismasi"`
  veya `q.mode==="cakisma"` koşuluyla gated) makul güvence sağlandı.
- `npm test`: **738/738** (707'den +31 — YENİ `test/frekans-cakismasi.test.mjs`:
  SOURCE_PAIRS/OWN_SOURCE_PAIR/findSourcePair, stageForIndex ramp, choice
  üretimi [benzersizlik + fallback], createQuestion/evaluateAnswer/calculateXP
  sözleşmesi, "kolaylaşma yok" invaryantı, EXAM_* bayrakları).

**KORUNANLAR (task'ın açık isteği):** 8 mevcut mod, exam-system.js,
three-way-cards.js, reskin, ses/zorluk HİÇ değişmedi — canlı + testle
doğrulandı. Motor 3 kendi izole kod yollarında (`cakisma` string dispatch'i,
`buildDualSourceChain`/`setDualCut`, ayrı `uploadManagerA/B`) yaşıyor.

**BİLİNEN SINIRLAMALAR/SONRAKİ TUR İÇİN:** (1) `setDualSolo` (A/B/İkisi-
birden dinleme) yazıldı ama HİÇBİR UI'ya bağlanmadı. (2) Sadece TEK kaynak
çifti (kick+bas) yerleşik — vokal+gitar/gitar+snare gibi diğerleri task'ın
kendi "şimdilik temel" kararıyla ertelendi. (3) `drawAxis` kozmetik kırpma
sorunu (yukarıda). (4) Aşama seçimi rastgele DEĞİL, `stageForIndex`
session-index eşiğiyle SIRALI açılıyor — bu MİMARİ KARAR bölümünde
gerekçelendirildi, kullanıcı onayı istenmedi (TEMEL AT çerçevesi).

---

**ZAYIF BÖLGE dispatcher'ı — `getWeakArea(stats, modeId)` (app.js, yeni):**
task'ın istediği moda-göre-dallanma. `mode.EXAM_WEAK_AREA==="zone"` (Frekans
Bulma/Kesim Noktası/Boost-Cut/Q Genişliği — dördü de yeni export) iken
`personalization.js:getWeakZone()` (YENİ SAF fonksiyon, `getWeakTier`'ın AYNI
ROLÜ frekans bölgesi ekseninde — DETERMİNİSTİK en zayıf bölge, `pickPersonalizedZone`'un
ağırlıklı RASTGELE seçiminden BİLEREK AYRIŞIR) PAYLAŞILAN `zoneStats` + modun
kendi `FA_ZONES`'undan en zayıf bölgeyi bulur; `EXAM_WEAK_AREA` export ETMEYEN
dört mod (dB Seviyesi/Kompresör/Reverb/Tonal Denge — "bölge" kavramı yok) ESKİ
`getWeakTier`/tierStats yoluna (G47'den beri DEĞİŞMEDİ) düşer.

**Zon-tabanlı telafi MEKANİZMASI (`app.js:startRound()`):** exam-system.js'in
`remedialTier`'ı (opak, mode-agnostic) zon-tabanlı modlarda bir ZORLUK adı
DEĞİL bir ZONE nesnesi taşır — `questionTier()`'a (difficulty bekler) DOĞRUDAN
geçirilseydi `mode.DIFFICULTY[level]` undefined'a düşerdi. Bunun yerine
`zoneRemedial` bayrağıyla ayrıştırıldı: zorluk `"medium"`de SABİTLENİR (telafi
BÖLGEYLE ilgili, ZORLUKLA değil), `remedialTier.a/.b` `focusRange`'e taşınır —
kullanıcının kendi odak seçimi telafi SÜRESİNCE BİLEREK geçersiz kılınır
(sonraki normal parkurda otomatik geri döner, KALICI bir ayar değişikliği
DEĞİL). **exam-system.js'e TEK SATIR bile dokunulmadı** (task'ın "mod-agnostic
kalsın" şartı harfiyen karşılandı) — tüm yorumlama app.js'in sorumluluğunda.

**Tonal Denge — kendi TrainYourEars mekaniğiyle sınav (odd-one-out DEĞİL):**
task'ın "canlı EQ, zorlaştırılmış — daha fazla bant/ince bozukluk" isteği İKİ
AYRI eksende karşılandı: (1) "ince bozukluk" `EXAM_DIFFICULTY="pro"`
(disturbDb=1.3, mevcut statik tablo) üzerinden OTOMATİK geldi, ekstra kod
gerekmedi; (2) "daha fazla bant" AYRI bir eksen olduğu için (session-index
ramp'ine bağlı, tier'a değil) YENİ bir mode-specific settings alanı —
`examBandBoost` — SADECE `mode.EXAM_ENABLED && examSystem.phase==="exam"`
iken `true` geçiliyor, `tonal-denge.js:createQuestion()` bunu görünce
`sessionQuestionIndex` ramp'ini YOK SAYIP DOĞRUDAN 6 bandı (BAND_SET_6) zorluyor
— diğer yedi mod bu alanı hiç okumadığı için ETKİLENMEDİ. `submitTonalDengeGuess`
(odd-one-out olmayan TEK exam-enabled mod) kendi `handleExamOutcome` çağrısını
diğer beş "generic" submit fonksiyonuyla AYNI şablonla aldı.

**6 generic submit fonksiyonuna `handleExamOutcome` kablolandı** (`submitFrequencyGuess`,
`submitCutoffGuess`, `submitLevelGuess`, `submitBoostCutGuess`, `submitQWidthGuess`,
`submitTonalDengeGuess`) — `submitThreeWayGuess`'in (Kompresör/Reverb) G47'den
beri kurulu deseni BİREBİR kopyalandı: `finalizeIfGameOver()` SONRASI
`!gameOver && mode.EXAM_ENABLED && handleExamOutcome(q, result)`. `submitProPlusGuess`
BİLİNÇLİ OLARAK dokunulmadı (proplus zaten Otomatik'te seçilmiyor, `tierForLevel`in
merdiveninin dışında — Z5 kararıyla AYNI çizgide, G49'un `examCappedLevel`
notundaki "proplus dışarıda" ilkesiyle tutarlı).

**Doğrulama (canlı, tarayıcıda, `Math.random=()=>0` deterministik testle):**
- **8/8 modda parkur/kombo/sınav/kutlama:** Frekans Bulma'da TAM round-trip —
  6 peş peşe doğru → "Sınav hakkı kazandın!" (kombo), reddedilip devam edilip
  6/10 toplamla → "exam-start" (TOPLAM), o sınav bilerek kaybedilip → basit
  parkur reset, YENİ parkurda tekrar kombo-6 → sınav → 3/4 doğru → "BÖLÜM
  GEÇTİN! Seviye 2'ye yükseldin!" EKRAN GÖRÜNTÜSÜYLE doğrulandı. Kesim
  Noktası/Boost mu Cut mu/Q Genişliği/dB Seviyesi/Reverb'de parkur girişi +
  bir cevap + "Soru N/10" etiketi + SIFIR konsol hatası (smoke test).
- **Telafi ekseni doğru mu:** Frekans Bulma'da 4/10 doğru (ne kombo ne toplam)
  → "Telafi 1/5" — şıklar EKRAN GÖRÜNTÜSÜYLE 20-70Hz aralığına (SUB bölgesi)
  YOĞUNLAŞMIŞ görüldü (focusRange daraltması ÇALIŞIYOR) — 3/5 geçildi → YENİ
  parkur ("devam"). dB Seviyesi/Kompresör/Reverb/Tonal Denge'nin tier-tabanlı
  telafisi G47/G48'den beri DEĞİŞMEDİ (regresyon YOK, kod dalı dokunulmadı).
- **Tonal Denge TrainYourEars mekaniğiyle mi:** EKRAN GÖRÜNTÜSÜYLE doğrulandı —
  sınav sorusu "6 bant — kaydırıcılarla sesi nötüre getir" metniyle geldi (6
  slider, `examBandBoost` DOĞRU ZORLADI), odd-one-out A/B/C kartı YOK, 3/4
  doğruyla (yakınlık skoruna göre GRADED XP) → "BÖLÜM GEÇTİN! Seviye 2'ye
  yükseldin!" EKRAN GÖRÜNTÜSÜYLE doğrulandı.
- Tüm oturum boyunca (8 mod, ~40+ tur) konsol hatası SIFIR.
- `npm test`: **707/707** (680'den +27 — YENİ `test/exam-coverage.test.mjs`:
  8 modun TAMAMINDA EXAM_ENABLED/EXAM_DIFFICULTY/EXAM_WEAK_AREA doğru mu [regresyon
  çiti, DOM/ses gerektirmediği için sadece export'ları doğruluyor]; `personalization.test.mjs`'e
  `getWeakZone()` için 5 yeni test [yetersiz veri→null, tek-bölge, en-zayıf-seçimi,
  DETERMİNİSTİK (rng yok), boş zones]; `tonal-denge.test.mjs`'e `examBandBoost`
  için 4 yeni test [ramp'ten bağımsız 6 bant, false/undefined'da regresyon yok]).

**KORUNANLAR (task'ın açık isteği):** 8 modun oyun mantığı/ses/zorluk/reskin HİÇ
değişmedi — canlı doğrulandı. exam-system.js'e TEK SATIR dokunulmadı (mode-
agnostic kaldı, `startRemedial()`'ın opak parametre kabul etme tasarımı bu
sayede zon-tabanlı telafiyi HİÇ bilmeden destekledi — G47'nin "gelecekte başka
eksenler gerekebilir" öngörüsü doğrulandı).

---

Önceki commit (G49, tek commit — kod+DURUM.md birlikte) — **ZORLUK RAMPASINI SINAV-
CAP'İNE BAĞLA: sınavı geçemeyen kullanıcıda "Seviye N" donuyordu ama gerçek
zorluk (kGap/gainDb/Q) ham XP'yle artmaya devam ediyordu — ÇELİŞKİ giderildi.**

**Önceki turda (kontrol görevi) tespit edilen çelişki:** Otomatik zorluk İKİ
KATMANLIYDI — (1) `applyAutoDifficulty()`'nin tier seçimi `progress.modeLevel()`
(sınav-cap'li, `Math.min(rawLevel, examLevel)`) üzerinden DOĞRU donuyordu, ama
(2) `currentDifficultyPosition()`'ın Otomatik-mod TABAN terimi (`continuousLevel
(progress.xpProgress(progress.modeXp(...)))`) HAM/uncapped XP'den geliyordu —
sınav sistemi'nin `examLevel` cap'inden TAMAMEN habersizdi. Sonuç: kullanıcı
sınavı geçemeyip parkurda doğru cevaplamaya devam ettikçe raw XP (her doğru
cevapta koşulsuz birikiyor, `modeState().xp += gained`) artıyor, dolayısıyla
`continuousLevel()`'ın döndürdüğü kesirli konum `LEVEL_CAP`'e (20) kadar
TIRMANMAYA devam ediyordu — Kompresör'ün `paramsForDifficultyPosition()`'ı bu
konumu SADECE mutlak eğri tavanına göre kırpıyordu (`examLevel`'i hiç bilmiyor),
yani ekranda "Seviye 3" donarken arka planda `kGap` (ayırt edilebilirlik)
sürekli küçülüp (zorlaşıp) gidiyordu — "seviye atlayamıyor ama sorular
zorlaşıyor" mantıksızlığı.

**Düzeltme — `core/difficulty-curve.js`'e YENİ SAF fonksiyon `examCappedLevel
(continuousRawLevel, examLevel)`:** `Math.min(continuousRawLevel, examLevel)`
(examLevel sayı değilse — sınav sistemi yok/henüz hiç dallanmadı — AYNEN
`continuousRawLevel` döner, sınırsız). BİLEREK `progress.modeLevel()`'ın
SONUCUNU DEĞİL, `examLevel`'in KENDİSİNİ parametre olarak alır — `modeLevel()`
zaten `rawLevel` ile min'lenmiş bir TAM SAYI; onu burada kullanmak
`continuousRawLevel`'in KESİRLİ kısmını sınava HİÇ ulaşılmamışken bile HER
ZAMAN tam sayıya yuvarlardı (matematiksel olarak doğrulandı, ilk taslakta
YAKALANDI — bkz. fonksiyonun dosya başı yorumu). Matematik: `rawLevel <
examLevel` iken `continuousRawLevel < examLevel` OTOMATİK sağlanır (min hiç
devreye girmez, kesirli ilerleme AYNEN görünür); `rawLevel >= examLevel`
olduğu andan itibaren `Math.min` düz `examLevel`'de KIRPAR — ne kadar fazla XP
birikirse biriksin taban ARTMAZ.

**`app.js:currentDifficultyPosition()` — çağıran taraf:** Otomatik-mod dalı
artık `examCappedLevel(continuousLevel(...), currentModeExamLevel())` (yeni
küçük yardımcı `currentModeExamLevel()`: `mode.EXAM_ENABLED` değilse ya da
`stats.examState[modeId]` bu oturumda henüz kurulmadıysa `undefined` — yani
sınırsız, mevcut yedi mod ve exam-enabled bir modun İLK turu davranışı BİREBİR
KORUNUR). Sabit-mod dalı (`representativeLevelForTier(tier)`) HİÇ dokunulmadı
— zaten XP'ye bakmıyordu. `examActive` (sınav/telafi anları) dalı da HİÇ
dokunulmadı — `difficultyPosition: undefined` geçmeye devam ediyor, o anlar
zaten statik `DIFFICULTY[examTier]`'ı kullanıyordu (G48'den beri sabit).

**Doğrulama (SAYISAL, gerçek/servis edilmiş modüller tarayıcıda dinamik
`import()` ile çağrılarak — bkz. DOĞRULAMA maddeleri, hiçbir sayı uydurulmadı):**
- **Zorluk sabit kalıyor mu:** Sentetik "yüksek ham XP, examLevel=3'te sıkışmış"
  senaryosu — `rawContinuous≈21.3` (LEVEL_CAP'i çoktan aşmış) iken ESKİ
  davranış `kGap≈0.0567` (neredeyse taban/en zor) verirdi; YENİ davranışta
  `examCappedLevel` konumu TAM `3.000`'e kırpıyor → `kGap≈0.3627`. Daha da
  FAZLA XP eklenince (+5000, kullanıcı parkurda doğru cevaba devam etmiş gibi)
  hem konum HEM `kGap` **BİREBİR AYNI** kaldı (`===` ile doğrulandı) — sabit,
  artmıyor.
- **Sınav geçilince bir üst kademeye çıkıyor mu:** AYNI ham konum (`21.3`),
  examLevel 3→4 olunca konum 3→4'e çıktı, `kGap` 0.3627→0.3256'ya DÜŞTÜ (daha
  küçük kGap = daha zor, yani zorluk GERÇEKTEN bir kademe arttı).
- **Sınav/telafi etkilenmedi mi (canlı, `Math.random=()=>0` deterministik
  testle, Kompresör):** Kombo 6 peş peşe → "Sınav hakkı kazandın!" sheet'i
  EKRAN GÖRÜNTÜSÜYLE AYNEN önceki gibi çıktı, "Sınava geç" → 4/4 doğru →
  "BÖLÜM GEÇTİN! Sınavı geçtin — Seviye 4'e yükseldin!" kutlaması EKRAN
  GÖRÜNTÜSÜYLE doğrulandı — tam round-trip boyunca konsol hatası SIFIR.
- **Sabit zorluk modu etkilenmedi mi:** "Zorluk" sheet'inden "Zor" elle
  seçildi (diffModeAuto=false'a geçti), yeni bir round "Soru 1/10" ile
  sorunsuz başladı, konsol hatası SIFIR.
- `npm test`: **680/680** (674'ten +6 — `difficulty-curve.test.mjs`'e
  `examCappedLevel()` için 6 yeni test: examLevel sayı değilken sınırsız,
  ham değer cap'in altındayken KESİRLİ kısmın korunduğu, tam sınırda, cap'i
  aşınca düz kırpıldığı, cap artınca AYNI ham değerin serbest kaldığı,
  examLevel=1 iken her koşulda 1'de sabitlendiği).

**KORUNANLAR (task'ın açık isteği):** Sınav sistemi (parkur/kombo/sınav/telafi/
kutlama), 8 modun oyun mantığı/ses HİÇ değişmedi — canlı doğrulandı. Değişiklik
TEK bir fonksiyonun TEK bir dalına (Otomatik-mod baseline) sıkı sıkıya
sınırlı — paylaşılan `currentDifficultyPosition()` mod-agnostik olduğu için bu
düzeltme gelecekte sınav sistemini miras alan HER mod için otomatik geçerli
(Kompresör dışında bugün başka exam-enabled mod yok).

---

Önceki commit (G48, tek commit — kod+DURUM.md birlikte) — **SINAV SİSTEMİ DÜZELTMESİ:
telafi artık PARKUR başarısızlığına bağlı + "10/5" etiket tutarsızlığı giderildi.**
G47'de kurulan merkezi altyapıdaki BİR MİMARİ HATA düzeltildi: telafi (5 soruluk
zayıf-kademe pratiği) yanlışlıkla "sınavda kalınca" tetikleniyordu — DOĞRUSU,
task'ın bu turda netleştirdiği gibi, telafi PARKURUN SONUNDA 6 doğru
YAPILAMAYINCA (ne kombo ne toplam eşiği tutturulduğunda) gelmeli; sınavda kalmak
artık basit tutuldu (telafi YOK, doğrudan parkur baştan).

**`core/exam-system.js` — state machine YENİDEN YAPILANDIRILDI (TAM dosya
yeniden yazıldı, `getWeakTier`/`recordTierResult`/`EXAM_CONFIG` şekli KORUNDU):**
- `"remedial-exam"` fazı (telafi SONRASI tekrar sınav) TAMAMEN KALDIRILDI —
  G47'de telafi bir kez geçilince YİNE 4 soruluk bir "tekrar sınav"a giriyordu,
  bu YANLIŞ yorumdu ve task'ın bu turda AÇIKÇA reddettiği bir akıştı.
- Parkur sonu dalı: `parkurCorrect < TOTAL_THRESHOLD` (6) İSE artık DOĞRUDAN
  `resetParkur()` ÇAĞIRMIYOR — `{ event: "remedial-start" }` döndürüyor, faz
  BİLEREK `"parkur"` kalıyor (app.js'in senkron `startRemedial(tier)` çağrısına
  kadar). Kombo yoluyla (6 peş peşe → `exam-offer`) ayrışması KORUNDU — bu dal
  hiç değişmedi.
- Sınavda kalma (`phase==="exam"` ve `examCorrect < EXAM_PASS_COUNT`) artık
  BASİT: `resetParkur()` + `{ event: "exam-failed" }` — telafiye HİÇ dallanmıyor
  (task: "sınavda kalınca telafi DEĞİL, parkur baştan").
  Doğrusu: task'ın "sınav ya da parkur baştan" ifadesindeki "sınav" seçeneği
  UYGULANMADI (kullanıcı onayı gerektirir, task metninde net değildi) — SADECE
  "parkur baştan" yolu kodlandı, en basit/güvenli yorum.
- Telafi artık KENDİ eşiğine sahip: yeni `REMEDIAL_PASS_COUNT=3` (5'te 3, %60 —
  sınavın %75'inden (4'te 3) bilinçli olarak daha yumuşak, telafi "zorlaştırılmış
  sınav" değil "pratik" olduğu için). `remedialCorrect` yeni bir state değişkeni
  ile izleniyor. Telafi bitince (`remedialIndex>=REMEDIAL_LENGTH`) HER İKİ
  durumda da (geçti/geçemedi) `resetParkur()` çağrılıyor — SONUÇ ikisinde de
  "yeni parkur", SADECE dönen olay (`"remedial-passed"`/`"remedial-failed"`) ve
  dolayısıyla kullanıcıya gösterilen mesaj farklı (task: "Telafi GEÇİLİRSE →
  devam, GEÇİLEMEZSE → baştan başlar" — "devam" ve "baştan" ikisi de aynı fresh-
  parkur mekanizmasıyla karşılanıyor, kullanıcı diliyle ayrışıyor).
- `retryRemedial()` fonksiyonu KALDIRILDI (artık ihtiyaç yok — telafi SONRASI
  tekrar sınav döngüsü yok).

**`app.js` — `handleExamOutcome()` switch'i yeni olay adlarına göre YENİDEN
YAZILDI:** `"remedial-start"` case'i (YENİ) `getWeakTier(es.tierStats)` ile
zayıf kademeyi bulup `examSystem.startRemedial(tier)`'ı SENKRON çağırıyor (aynı
turda "Telafi 1/5" render edilsin diye) + feedback'e not ekliyor
("N doğru yapılamadı — [kademe] kademesinde 5 telafi sorusu geliyor").
`"exam-failed"`, `"remedial-passed"`, `"remedial-failed"` case'leri artık
BAĞIMSIZ, her biri kendi Türkçe notunu ekleyip `false` dönüyor (normal
`scheduleNext()` akışı devam etsin diye — sheet açmıyorlar, sadece parkur
sıfırdan devam ediyor). `"exam-offer"`/`"exam-start"`/`"exam-passed"`
case'lerine (kombo teklifi, kutlama sheet'i, seviye atlama) DOKUNULMADI.

**"10/5" ETİKET TUTARSIZLIĞI — teşhis: GERÇEK bir çifte-sayaç hatası DEĞİLDİ.**
`ensureAutoNext(durationMs, label)`'daki `"(N)"` her zaman round-flow.js'nin
SANİYE geri sayımıydı (`"Sonraki (5)"` = 5 saniye sonra otomatik geçiş) — ama
buton PREFİX'i sabit `"Sonraki"` idi, HİÇBİR ZAMAN `examSystem.label()`
okumuyordu (G47'nin kendi "BİLİNEN SINIRLAMA" notu #3'te bu ZATEN tespit
edilmişti). `els.roundChip` ("Soru N/10") ile yan yana görününce "iki farklı
sayaç" izlenimi veriyordu. **Düzeltme:** `ensureAutoNext()`'i saran app.js
fonksiyonu artık `mode.EXAM_ENABLED` iken buton etiketinin PREFİX'i için de
`examSystem.label()` kullanıyor — sonuç: `"Soru 7/10 (5) ▶"` / `"Sınav 2/4 (5)
▶"` / `"Telafi 3/5 (5) ▶"`, roundChip ile HER ZAMAN tutarlı. Sınav
desteklemeyen yedi modda davranış AYNEN eskisi (`"Sonraki (5) ▶"`).

**Doğrulama (canlı, tarayıcıda, `Math.random=()=>0` ile deterministik "A her
zaman doğru" testi, Kompresör):**
- **KOMBO (KORUNDU):** 6 peş peşe doğru → "exam-offer" sheet'i EKRAN
  GÖRÜNTÜSÜYLE doğrulandı: "Sınav hakkı kazandın! Yanıtlanacak 4 sorunuz daha
  var ve sınav daha zor. Sınava geçmeye emin misiniz?" (remaining=4, task'ın
  kendi örneğiyle BİREBİR). "Parkura devam et" → pozisyon/combo KORUNDU, 7.
  soruya devam etti — regresyon YOK.
  Not: task bu turda metni "...ister misiniz?" diye paraphrase etti, koddaki
  gerçek metin ("...emin misiniz?") G47'den beri DEĞİŞMEDİ — task'ın KORUMA
  talimatı ("Bu KORUNMALI, çalışıyorsa bozma") gereği BİLEREK dokunulmadı.
- **TOPLAM:** Kombo bilerek reddedilip parkur 9/10 doğruyla bitirildi → parkur
  sonunda `"exam-start"` ile DOĞRUDAN sınava geçti (`"Sınav 1/4"` EKRAN
  GÖRÜNTÜSÜYLE doğrulandı) — telafiye UĞRAMADI, TOPLAM eşiği doğru çalışıyor.
- **Sınavda kalma → basit parkur baştan:** Bu sınav bilerek 4 yanlışla
  kaybedildi → hiçbir sheet açılmadan doğrudan `"Soru 1/10"`ya döndü (feedback
  notu: "Sınavı geçemedin — parkur baştan başlıyor") — telafiye UĞRAMADI, kod
  incelemesiyle DOĞRULANDI.
- **6 doğru OLMAYINCA → telafi (asıl düzeltme):** İki AYRI parkurda test
  edildi — (1) 4/10 doğru (kombo hiç 6'ya ulaşmadan), (2) 5/10 doğru (yine
  kombo hiç ulaşmadan) — İKİSİNDE de parkur sonunda `"Telafi 1/5"` EKRAN
  GÖRÜNTÜSÜYLE doğrulandı (ARTIK baştan atmıyor).
- **Telafi geçilince/geçilemeyince:** 0/5 (telafi kaybedildi) → `"Soru 1/10"`ya
  DÖNDÜ (baştan). Ayrı bir turda TAM 3/5 (REMEDIAL_PASS_COUNT sınırında,
  geçti) → YİNE `"Soru 1/10"`ya döndü (devam) — HER İKİ sonuç da fresh-parkur,
  SADECE mesaj farklı, kod incelemesiyle DOĞRULANDI.
- **10/5 tutarsızlığı:** roundChip HER ZAMAN `examSystem.label()`'dan geliyor,
  değişmedi; canlı testte tüm fazlarda ("Soru N/10"/"Sınav N/4"/"Telafi N/5")
  chip TUTARLI görüldü.
- **Sınav + kutlama (regresyon kontrolü):** Kombo ile ikinci kez sınava
  girildi, 3/4 doğruyla (EXAM_PASS_COUNT sınırında) geçildi → "BÖLÜM GEÇTİN!"
  sheet'i EKRAN GÖRÜNTÜSÜYLE doğrulandı: "Sınavı geçtin — Seviye 3'e
  yükseldin! Yeni bir 10 soruluk parkur başlıyor." `#levelChip` "Seviye 3"
  gösterdi — kutlama/seviye atlama TAMAMEN KORUNDU.
- Konsol hatası SIFIR (~50+ otomatik tur boyunca). `npm test`: **674/674**
  (673'ten +1 — `test/exam-system.test.mjs`'in "TELAFİ" bloğu YENİ semantiğe
  göre YENİDEN yazıldı: `"remedial-exam"` fazı/`retryRemedial`/
  `"remedial-exam-failed"` testleri KALDIRILDI, `"remedial-start"`/
  `"remedial-passed"`/`"remedial-failed"` + REMEDIAL_PASS_COUNT sınır testleri
  EKLENDİ; "TOPLAM" ve "SINAV: geçme/kalma" bloklarındaki `"parkur-failed"`/
  `"failed"` fazı beklentileri yeni event/faz adlarına güncellendi).

**KORUNANLAR (task'ın açık isteği):** Kombo uyarısı, sınav, kutlama, seviye
atlama, 8 modun oyun mantığı/ses/zorluk HİÇ değişmedi — canlı doğrulandı.

**BİLİNEN SINIRLAMA (G47'den devralınan, bu turda İLGİLİ OLMAYAN):** Sınav
sorularının hâlâ "o modun zorlaştırılmış NORMAL soruları" olması, otomatik
zorluk chip'inin sınav/telafi sırasında görsel olarak güncellenmemesi, diğer
yedi modun sistemi HENÜZ miras almaması — bu turun kapsamı DIŞINDA, G47'nin
notu geçerliliğini koruyor.

---

Önceki commit (G47, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **SINAV SİSTEMİ
TEMELİ: merkezi altyapı (core/exam-system.js) + Kompresör pilotu.** Seviye
atlamayı "sessiz XP artışı"ndan "bölüm geçme / yeterlilik sınavı" olayına
çeviren yeni bir katman — mevcut soru üretimini/XP-seviye sistemini ÇAĞIRIR,
DEĞİŞTİRMEZ. 673 test (638'den, +35 yeni).

**ÖNEMLİ — BELGE UYUŞMAZLIĞI (görev başında tespit edildi, kullanıcıya
soruldu):** Görev "DURUM.md/TASARIM.md'de 'SINAV SİSTEMİ' bölümü var, mekanik
orada tam yazılı" diyordu — bu bölüm ARANDI, repo genelinde ("sınav"/"exam")
HİÇBİR YERDE BULUNAMADI. `AskUserQuestion` ile üç açık nokta netleştirildi:
(1) belge eksikliği onaylandı, görev mesajındaki mekanik açıklaması TEK
doğruluk kaynağı olarak kullanıldı; (2) "10 soruluk parkur" mevcut "10
Soruluk Bölüm" (challenge) altyapısına BAĞLANSIN AMA Serbest modda da arka
planda çalışsın (kullanıcının kendi kararı, aşağıda uygulandı); (3)
Kompresör'ün frekans-bölgesi kavramı OLMADIĞI için (personalization.js'in
zoneStats'ı frekans-bölgesi bazlı) telafi parkuru "zayıf ZORLUK KADEMESİ"
(easy/medium/hard/pro doğruluk oranı) üzerinden çalışsın — kullanıcı bu
öneriyi onayladı.

**MERKEZİ ALTYAPI — `core/exam-system.js` (YENİ dosya):** round-flow.js'in AYNI
"factory + ses/DOM'a hiç dokunmama" felsefesi — `createExamSystem()` bir
örnek yaratır (app.js `const examSystem = createExamSystem();`), TÜM parkur/
kombo/sınav/telafi durumunu BELLEKTE tutar (roundsInThisPlaySession'ın AYNI
kararı — sayfa yenilenince yarım parkur kaybolur, KABUL EDİLEBİLİR). SAF
fonksiyonlar da var: `getWeakTier`/`recordTierResult` (zayıf-kademe tespiti,
personalization.js'in zoneWeakness'ının AYNI rolü, kademe ekseninde).
`EXAM_CONFIG`: PARKUR_LENGTH=10, COMBO_THRESHOLD=6, TOTAL_THRESHOLD=6,
EXAM_LENGTH=4 (task'ın "örn 3-5" aralığından), EXAM_PASS_COUNT=3 (4'te 3,
"çoğunu"), REMEDIAL_LENGTH=5 (task'ın kendi sayısı) — KULAKLA/PLAYTEST
DOĞRULANMADI, makul bir başlangıç.

**comboInParkur GLOBAL stats.combo'yu KULLANMAZ (bilinçli):** stats.combo TÜM
modlar/oturumlar arasında paylaşılan bir sayaç — onu kullanmak başka bir
modda kurulmuş bir seriyi Kompresör'ün parkuruna SIZDIRIRDI. exam-system
KENDİ, mod+parkur'a sıkı sıkıya bağlı sayacını tutuyor.

**MOD SÖZLEŞMESİ EKİ (miras alınabilir hale getirme):** Kompresör'e İKİ yeni
export: `EXAM_ENABLED=true`, `EXAM_DIFFICULTY="pro"` — SHOW_SPECTRUM/
COMPACT_ANALYZER'ın AYNI mode-agnostik bayrak deseni. Gelecekte başka bir mod
aynı sistemi almak isterse SADECE bu iki satırı eklemesi yeterli, app.js'e
YENİDEN dokunmaya GEREK yok (tüm app.js dalları `mode.EXAM_ENABLED` kontrolüyle
generic).

**progress.js — "PARALEL SİSTEM KURMA" yasağına uyulan TEK guard'lı dal:**
`modeLevel()` artık `stats.examState[modeId].examLevel` VARSA (SADECE exam-
enabled modlarda dolduruluyor) GÖSTERİLEN seviyeyi `Math.min(rawLevel,
examLevel)` ile SINIRLIYOR — XP/levelFromXp/xpNeeded'ın KENDİSİ HİÇ değişmedi
(XP sessizce birikmeye DEVAM ediyor), SADECE gösterilen/kullanılan seviye artık
"sınav geçince açılan" bir kapı. Sınav destemeyen yedi modda `stats.examState[id]`
HİÇ var olmadığı için `modeLevel()` AYNEN eskisi gibi SAF XP'den hesaplanır
(testle doğrulandı — bkz. test/progress.test.mjs "G47 sınav sistemi examState
guard'ı"). **FARKINDA OLUNAN yan etki:** Kompresör'ün examLevel-sınırlı
modeLevel'i `academyLevel`'a (TÜM modların modeLevel TOPLAMI, menüdeki
"Seviye N'de açılır" kilitlerinin kaynağı) da yansıyor — Kompresör'ün XP'si
sınav GEÇMEDEN gerçek katkısını academyLevel'a VERMEZ. Bu, "seviye artık
gerçekten kazanılmalı" felsefesiyle TUTARLI bir emergent sonuç olarak
KABUL EDİLDİ, ayrıca gizlenmedi/engellenmedi.

**storage.js:** `freshStats()`'e yeni `examState: {}` alanı + `loadStats()`'a
göç satırı (`if (!s.examState) s.examState = {};`) — perMode/perDiff'in
ŞEKLİNE hiç dokunulmadı, TAMAMEN yeni/ayrı bir ad alanı.

**app.js kablolaması (mode.EXAM_ENABLED'a GÖRE dallanan, generic):**
- `startRound()`: examSystem fazı parkur DIŞINDAYSA (sınav/telafi/tekrar-
  sınav) `mode.createQuestion`'a kullanıcının seçtiği zorluk YERİNE
  `examSystem.questionTier(...)` geçer; boss round VE Otomatik/Sabit eğrisi
  (`difficultyPosition`) o fazlarda BİLEREK devre dışı (task: "zorlaştırılmış
  normal sorular", statik DIFFICULTY[tier]).
- `renderQuestion()`: `els.roundChip` metni `mode.EXAM_ENABLED` iken HER ZAMAN
  (Serbest DAHİL, kullanıcının 2. karar onayı) `examSystem.label()`'dan gelir
  ("Soru N/10" / "Sınav N/4" / "Telafi N/5" / "Tekrar Sınav N/4").
- `submitThreeWayGuess()` (Kompresör/Reverb PAYLAŞIYOR): SADECE
  `mode.EXAM_ENABLED` iken `handleExamOutcome(q, result)` çağrılır — tierStats
  kaydı (SADECE "parkur" fazında, sınav/telafi sonuçları zayıf-kademe
  tespitini ÇARPITMASIN diye), `examSystem.recordAnswer(...)`, olay
  bazlı dallanma (offer sheet / pass sheet / feedback'e not ekleme). Reverb
  (AYNI fonksiyonu paylaşıyor) `mode.EXAM_ENABLED` undefined olduğu için bu
  BLOK TAMAMEN atlanıyor — davranışı BİREBİR eskisi gibi kalıyor.
- `ensureAutoNext()`: "10 Soruluk Bölüm"ün KENDİ "10 soru bitti → seansı
  kapat" mantığı `mode.EXAM_ENABLED` modlarda BASTIRILDI (parkur/sınav/telafi
  10'un ÖTESİNE geçebiliyor, challenge.done>=10'da kesmek sınavı YARIDA
  keserdi) — `challenge.active`'in +%50 XP bonusu (xpMult) HÂLÂ çalışıyor,
  SADECE otomatik bitirme bastırıldı.
- İKİ yeni bottom-sheet (hpSheet'in AYNI `.open` class deseni, index.html):
  `examOfferSheet` (erken sınav teklifi, task'ın BİREBİR metniyle: "Yanıtlanacak
  N sorunuz daha var ve sınav daha zor...") + `examPassSheet` ("BÖLÜM GEÇTİN!"
  kutlaması, ding+burst fx'leriyle "ödül hissi").

**Doğrulama (canlı, tarayıcıda, `devFlags.simulatePro` + `Math.random=()=>0`
ile deterministik "A her zaman doğru" testi):** Kompresör'e girildi, 5 doğru
cevap → "Soru 6/10". 6. doğru cevap → erken sınav teklif sheet'i EKRAN
GÖRÜNTÜSÜYLE doğrulandı: "Yanıtlanacak 4 sorunuz daha var ve sınav daha zor.
Sınava geçmeye emin misiniz?" (task'ın BİREBİR örneği). "Sınava geç" → "Sınav
1/4" → 4/4 doğru → "BÖLÜM GEÇTİN!" sheet'i EKRAN GÖRÜNTÜSÜYLE doğrulandı:
"Sınavı geçtin — Seviye 2'e yükseldin!". `#levelChip` "Seviye 2" gösterdi
(examLevel cap DOĞRU çalıştı — bir ARA çalışma sırasında tarayıcının ESKİ
progress.js'i CACHE'lediği fark edildi, sabit disk cache no-store fetch +
hard reload ile doğrulanıp DÜZELTİLDİ, kod HİÇ değişmedi, sadece test
metodolojisi). "Devam Et" → yeni parkur "Soru 1/10"den başladı. İKİNCİ bir
parkurda 6 doğru → sınava kabul → BU SEFER 4 YANLIŞ cevap → "Telafi 1/5"e
GEÇTİĞİ doğrulandı (feedback notu: "Sınavı geçemedin — Kolay kademesinde 5
telafi sorusu geliyor"). 5 telafi sorusu doğru cevaplandı → "Tekrar Sınav
1/4"e geçti. 4/4 doğru → tekrar "BÖLÜM GEÇTİN!" (Seviye 3), examLevel=3
localStorage'a DOĞRU persist edildi. Reverb'e geçildi — `roundChip` "Soru
33" (GENERİK, /10 YOK — mode.EXAM_ENABLED olmadığı için doğru), 3 büyük
A/B/C kartı (`.ans-m2`) NORMAL render edildi, bir cevap verildi ("A
farklıydı, Room, decay 0.9s"), exam-offer sheet HİÇ AÇILMADI. Frekans
Bulma'ya geçildi — `roundChip` "Soru 34" (yine generik), normal çalıştı.
Konsol hatası SIFIR (~35 otomatik tur boyunca). `npm test`: 673/673 (573
sekiz-mod + 65 Tonal Denge + 35 yeni G47 testi: test/exam-system.test.mjs
[parkur/kombo/toplam/sınır/sınav-geç-kal/telafi-döngüsü/questionTier/
setMode-izolasyonu/getWeakTier-recordTierResult, 30 test] +
test/progress.test.mjs'e eklenen modeLevel() examState guard testleri [5]).

**KORUNANLAR (task'ın açık isteği):** 8 modun oyun mantığı/ses/zorluk/geri
bildirim/reskin DOKUNULMADI. Kompresör DIŞINDAKİ yedi mod bu turda TAMAMEN
etkilenmedi (canlı doğrulandı). XP/seviye MEKANİĞİ (progress.js'in KENDİSİ)
değişmedi, sadece TEK bir guard'lı üst sınır eklendi.

**BİLİNEN SINIRLAMALAR/SONRAKİ TUR İÇİN:** (1) Sınav soruları şimdilik
"o modun zorlaştırılmış NORMAL soruları" — task'ın kendi kararıyla "yeni
görev tipleri (sıralama/eşleştirme) SONRA eklenecek". (2) Otomatik zorluk
modundaki `els.difficultySelect` görünen değeri sınav/telafi sırasında
GÜNCELLENMİYOR (gerçek soru zorluğu `examSystem.questionTier()`'dan geliyor,
ekrandaki "Zorluk" chip'i kullanıcının ÖNCEKİ seçimini göstermeye devam
ediyor) — kozmetik bir tutarsızlık, işlevi ETKİLEMİYOR. (3) ~~"Sonraki (N) ▶"
oto-geçiş butonunun etiketi hâlâ generik "Sonraki" (examSystem.label()
KULLANMIYOR) — SADECE `els.roundChip` güncellendi.~~ — **G48'de düzeltildi**
("10/5 tutarsızlığı", bkz. yukarıdaki G48 BİTTİ girdisi). (4) Diğer yedi mod HENÜZ
miras almadı — task'ın "sonra her mod aynı sistemi miras alsın" isteği bu
turun KAPSAMI DIŞINDA (pilot: SADECE Kompresör).

---

Önceki commit (G46, tek commit — kod+DURUM.md birlikte) — **Tonal Denge'de spektrum
görseli küçültüldü, kaydırıcılara yer açıldı.** G45'te eklenen altı-banda kadar
çıkabilen kaydırıcı listesi, 280px'lik (diğer sekiz modla PAYLAŞILAN) tam
boy spektrumun ALTINDA kalıyordu — 6 bant + "Cevabı Onayla"ya ulaşmak için
fazladan kaydırma gerekiyordu.

**Mekanizma — SHOW_SPECTRUM'un (G39, db-seviyesi.js) AYNI mode-agnostik bayrak
deseni:** `tonal-denge.js`'e `export const COMPACT_ANALYZER = true;` eklendi.
`app.js`'in `enterMode()`'u mod değişince `#analyzer`'a `mode.COMPACT_ANALYZER`
bayrağına göre bir modifier class (`analyzer-compact`) ekliyor/çıkarıyor —
`goScreen("game")`'in çağıracağı `resizeCanvas()`'tan ÖNCE uygulanıyor, canvas'ın
GERÇEK (CSS'ten okunan) boyutu ilk çizimden itibaren doğru. `styles.css`:
`#analyzer.analyzer-compact #visualizer{height:140px}` — TEK değişen şey
yükseklik (280px→140px), `#visualizer`'ın stil/renk/eksen kuralları HİÇ
değişmedi (aynı kural seti, aynı çizim kodu — `drawSpectrumBars`/
`drawVisualizer` bu yeni boyutu `resizeCanvas`'ın `getBoundingClientRect`
okumasından OTOMATİK alıyor, app.js'e AYRICA dokunulmadı). Export ETMEYEN
diğer sekiz mod varsayılan false/undefined ile ETKİLENMEDİ (canlı doğrulandı,
bkz. aşağıda).

**Tonal Denge'nin KENDİ eğri çizimi ayrıca düzeltildi:** `drawFlatTargetLine`/
`drawResidualCurve` ÖNCEDEN paylaşılan `CURVE_TOP` sabitini (88px — Frekans
Bulma'dan, spektrum çubuklarının TAVANI olarak `app.js:drawSpectrumBars`'ta
HÂLÂ kullanılıyor, DOKUNULMADI) kullanıyordu — 140px'lik canvas'ta bu neredeyse
HİÇ yer bırakmazdı eğriye (88 + AXIS_H[50] + 6 ≈ canvas'ın tamamı, eğri
~2px'e sıkışırdı). Yeni bir yerel sabit (`OVERLAY_TOP_MARGIN=20`) eklendi —
SADECE bu modun kendi kırmızı/yeşil eğrisi için, paylaşılan `CURVE_TOP`'a
(spektrum çubuklarının tavanı, diğer sekiz modun da okuduğu) HİÇ dokunulmadan.

**Kaydırıcı kartları da hafifçe kompaktlaştırıldı** (task'ın izin verdiği
ikincil iyileştirme): `.tonal-bands` gap 12px→8px, `.tonal-band` padding
12px→9px (dikey), `.tonal-band-head` margin-bottom 9px→6px — dokunma hedefi
boyutu (kaydırıcı thumb'ı) DEĞİŞMEDİ.

**Doğrulama (canlı, tarayıcıda):** Tonal Denge'ye girildi — canvas yüksekliği
`getBoundingClientRect()` ile TAM 140px ölçüldü (önceden 280px), `#analyzer`
`analyzer-compact` class'ını TAŞIYOR. 4 bantlık round'da (Soru 1-4) spektrum +
4 kaydırıcı + "Cevabı Onayla" TEK ekranda (kaydırmadan) sığdı — EKRAN
GÖRÜNTÜSÜYLE doğrulandı. "Atla" ile Soru 9'a (6 bant) ilerlendi — 6 kaydırıcı +
buton YİNE tek ekranda (sadece spektrumun üst kenarı hafif kırpıldı, TÜM
kaydırıcılar + onay butonu GÖRÜNÜR kaldı) — EKRAN GÖRÜNTÜSÜYLE doğrulandı,
öncekine göre BÜYÜK iyileşme (önceden 6. banda ulaşmak için tam bir ekran
kaydırması gerekiyordu). Bir bant sürüklenip onaylandı — kırmızı "kalan sapma"
eğrisi + yeşil düz hedef çizgisi 140px'lik canvas'ta NET/okunur çizildi
(OVERLAY_TOP_MARGIN düzeltmesi doğrulandı), slider satırları doğru kırmızı/
yeşil kenarla işaretlendi, "Yakınlık %46" + tam öğretici metin göründü —
mekanik (canlı EQ, bant sayısı ramp'i, yakınlık skoru) TAMAMEN korundu.
Spektrum stili İNCELENDİ — AYNI mavi gradyan çubuklar, AYNI eksen (100Hz–
12.8kHz), SADECE daha kısa — hâlâ gerçek bozukluğu göstermeyen dekoratif bir
görsel (kulak eğitimi ilkesi bozulmadı). Frekans Bulma/Kompresör/Reverb/dB
Seviyesi'ne TEK TEK girilip canvas yüksekliği JS'ten ölçüldü — DÖRDÜ de TAM
280px, `analyzer-compact` class'ı YOK (regresyon yok, `COMPACT_ANALYZER`
export etmeyen modlar etkilenmedi). Konsol hatası YOK. `npm test`: 638/638
(kod değişikliği SADECE görsel/CSS/DOM-boyut, hiçbir SAF fonksiyon/test
etkilenmedi — yeni test eklenmedi, mevcut 638 aynen geçti).

---

Önceki commit (G45, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Tonal Denge
TrainYourEars mekaniğine dönüştürüldü: odd-one-out (A/B/C, "hangisi farklı")
TAMAMEN kaldırıldı, yerine CANLI EQ DÜZELTME (N kaydırıcı, gerçek zamanlı ses)
geldi.** G44'ün odd-one-out kodu (variants/oddIndex/choices/shape/imbalanceScore,
three-way-cards.js delegasyonu) modes/tonal-denge.js'ten TAMAMEN silindi — dosya
SIFIRDAN yazıldı, ölü kod bırakılmadı. 638 test (640'tan — G44'ün 67 odd-one-out
testi silindi, yerine 65 yeni test geldi, net -2).

**YENİ MEKANİK:** Ses (groove/upload) çalar. Uygulama GİZLİ bir tonal bozukluk
uygular — 4/5/6 bandın (bkz. aşağıdaki ramp) BİR KISMINA ya da TÜMÜNE (en az 1,
rastgele) peaking/shelf EQ kayması. Kullanıcı HER bant için bir kaydırıcıyı
(±12dB, orta=0=nötr) CANLI oynatarak sesi nötüre geri getirmeye çalışır — ses
GERÇEK ZAMANLI değişir, "Cevabı Onayla"ya basınca değerlendirilir. Puanlama:
her bantta KALAN sapma (bugDb+correction, mükemmelde 0) → yakınlık skoru
(0-100, `evaluateAnswer`'da SAF hesaplanır).

**CANLI SES MİMARİSİ (task'ın "kritik" dediği kısım) — audio-engine.js'e
DOKUNMADAN çözüldü:** `applyProcessing` round başında BİR KEZ çağrılır (Motor
2'nin A/B/C önizleme döngüsünün AKSİNE previewLetter YOK, tek "canlı" ses var),
question.bands KADAR BiquadFilterNode kurar ve referanslarını modül-seviyesi
`liveBandNodes`'a SAKLAR. Yeni export `setLiveBandGain(audioCtx, bandId,
netGainDb)` — app.js kaydırıcı HER hareket ettiğinde bunu çağırır, GRAFİĞİ
YENİDEN KURMADAN o bandın düğümünün gain'ini `setTargetAtTime` ile YUMUŞAK
günceller (tıklama YOK, ses kesintisiz — task'ın açık şartı). Bu, projede
canlı/aralıksız parametre güncellemesinin İLK örneği — önceki sekiz modun
HEPSİ her etkileşimde `buildQuestionChain`'i YENİDEN çağırıyordu (Kompresör/
Reverb'in A/B/C önizlemesi dahil, bkz. o dosyaların "previewLetter" notu).

**BANT RAMP'İ (seans içi, task'ın kararı):** `bandCountForSessionIndex` —
Soru 1-4 (index 0-3) → 4 bant (bas/alt-orta/üst-orta/tiz, task'ın kendi örneği),
Soru 5-8 → 5 bant (+orta), Soru 9+ → 6 bant (+sub, TAM 6 bölge) — SINIRSIZ
üstte 6'da SABİT kalır (task sadece 9-10'u belirtti, 11+ için doğal uzantı,
yeni bir üst sınır İCAT EDİLMEDİ). Bant tanımları (`BAND_DEFS`) frekans-
bulma.js'in FA_ZONES'undaki AYNI 6 bölgeden (SUB/BAS/ALT-ORTA/ORTA/ÜST-ORTA/
TİZ) TÜRETİLİR (tek kaynak) — merkez frekans (BiquadFilterNode.frequency için)
geometrik ortadan (`sqrt(a*b)`) hesaplanır, FA_ZONES kendisi bunu tutmuyordu.
filterType KANONİK sırayla: en düşük frekans lowshelf, en yüksek highshelf,
aradakiler peaking (standart parametrik EQ tasarımı).

**KADEMELİ ZORLUK (merkezi eğri, Kompresör/Reverb/dB Seviyesi'nin AYNI BAŞTAN-
doğru-kalibrasyon yöntemi):** `TONAL_CURVE_CONFIG` (DISTURB_DB_AT_1=9 →
AT_CAP=0.9, FLOOR=0.8) — kolay=büyük/bariz bozukluk, pro=ince (~0.9-1.3dB).
"Kolaylaşma yok" invaryantı node ile DOĞRUDAN hesaplandı: disturbDb →
easy(4)=6.26≤9, medium(8)=3.85≤5, hard(12)=2.37≤2.8, pro(20)=0.90≤1.3;
timeSec → easy(4)=23.3≤26 … pro(20)=13.0≤15 (rahat marjlarla, testle
doğrulandı). Süreler diğer sekiz moddan BİLİNÇLİ daha UZUN (26/22/18/15sn) —
bu görev tek tıklama değil, N kaydırıcıyı dinleye dinleye ayarlamak.

**ÖĞRETİM + GÖRSEL (task'ın örnek formatıyla BİREBİR, canlı oyunda
DOĞRULANDI):** `teachingText` her bant için Türkçe DOĞRU çekimle (BAS'ı/
ALT-ORTA'yı/ORTA'yı/ÜST-ORTA'yı/TİZ'i/SUB'u — ünlü uyumu elle çözüldü, generic
bir ek YANLIŞ çıkardı) + işaretli dB + mix dili raporlar ("ORTA'yı -9.3dB
eksik bıraktın — mix hâlâ içi boş/uzak... ÜST-ORTA'yı iyi düzelttin").
`drawOverlay` GERÇEK BiquadFilterNode.getFrequencyResponse ile (Boost/Cut'ın
AYNI tekniği) İKİ eğri çizer: KIRMIZI (GUESS_COLOR) = kullanıcının kalan
sapma eğrisi, YEŞİL (CORRECT_COLOR) düz çizgi = hedef (nötr) — task'ın açık
renk kararı. Round sırasında (roundActive) BİLEREK gizli (kulakla bulma
ilkesi, diğer sekiz modun AYNI invaryantı).

**KAYNAK (G44'ten DEĞİŞMEDİ, task'ın açık isteği):** `uyumluKaynaklar:
compatibleSourceIds({ only: ["groove", "upload"] })` — dolu-mix-bağlamı şartı
aynen korundu. `kulaklikGerekli: true` de korundu.

**MOTOR AYRIŞMASI (task'ın çekirdek kararı):** `app.js`'in `THREE_WAY_MODE_IDS`
listesinden "tonal-denge" ÇIKARILDI (Kompresör/Reverb AYNEN kalıyor,
DOKUNULMADI) — `isThreeWayModule("tonal-denge")` artık false, bu OTOMATİK
olarak A/B/C döngüsünü/previewLetter/three-way-cards render'ını devre dışı
bırakıyor (G33/G35'in "genelleştirme" yatırımı burada TERSİNE de işledi:
listeden ÇIKARMAK kadar basit oldu). `isChoiceFormat()`'e "tonal-denge" EL
İLE eklendi (three-way olmadığı için oraya artık kendiliğinden düşmüyordu).
YENİ bir submit akışı (`submitTonalDengeGuess`, submitThreeWayGuess'in
YAPISAL PARALELİ) + YENİ bir event bloğu (kaydırıcı "input" CANLI güncelleme +
"Cevabı Onayla" "click" — `.ans` click-delegasyonundan BİLEREK AYRI, submit
butonu `.ans` class'ı TAŞIMIYOR, iki mekanizma hiç karışmıyor).

**A/B Test butonu — BEDAVA bir yeniden-kullanım:** Motor 1'in dry/wet
crossfade'i (`setProcessed`) hiç değiştirilmeden Tonal Denge'de "A=temiz
orijinal groove, B=senin canlı düzeltmen" karşılaştırması olarak ÇALIŞIYOR —
ayrı bir kod satırı YAZILMADI, `isThreeWayModule` false döndüğü için
`toggleAB()` zaten doğru (Motor 1) dalına düşüyor.

**CSS:** `.answers-tonal`/`.tonal-bands`/`.tonal-band`/`.tonal-slider`/
`.tonal-submit` (styles.css) — İLK gerçek `<input type="range">` bu projede,
webkit/moz thumb stilleri elle yazıldı. `.tonal-band.right/.wrong` renkleri
`.ans.right/.wrong`'un AYNI kırmızı/yeşil dilini kullanıyor.

**Doğrulama (canlı, tarayıcıda, `devFlags.simulatePro` ile):** Tonal Denge'ye
girildi — kulaklık sheet'i çıktı (kulaklikGerekli doğrulandı). Round başında
4 kaydırıcı (BAS/ALT-ORTA/ÜST-ORTA/TİZ) + "Cevabı Onayla" render edildi,
kaynak "Davul Döngüsü". Bir kaydırıcı DOM'dan sürüklendi (`input` event) —
değer anında "+6.0 dB" gösterdi, konsol hatası YOK (canlı `setLiveBandGain`
çağrısı doğrulandı). 27 tur otomatik oynatıldı — Soru 5'ten (index 4) itibaren
5 bant (ORTA eklendi), Boss round'a doğru geçti, tamamı boyunca konsol hatası
SIFIR. Bir round'da YANLIŞ bırakılıp (6sn'lik daha uzun feedback penceresi
kullanılarak) EKRAN GÖRÜNTÜSÜYLE doğrulandı: kırmızı dalgalı "kalan sapma"
eğrisi + düz yeşil hedef çizgisi görüldü, 4 slider satırı KIRMIZI kenarla
("kalan: +8.7dB" vb.), 1 slider (dokunulmamış, zaten bozuk değildi) YEŞİL
kenarla ("kalan: +0.0dB") işaretlendi, feedback kartında "Yakınlık %42" +
tam öğretici metin (her bant için ayrı cümle, doğru Türkçe çekim) göründü.
Kompresör'e geçildi — 3 büyük A/B/C kartı (`.ans-m2`) NORMAL render edildi,
0 `.tonal-slider`, bir cevap verildi ("B farklıydı, ratio 13.1:1...") —
odd-one-out akışı TAMAMEN bozulmadan çalışıyor. `npm test`: 638/638 (573
sekiz-mod + 65 yeni Tonal Denge testi — bandCountForSessionIndex/
bandIdsForCount ramp, bandsForQuestion [kapsama+kanonik filterType+rng
determinizmi], pickDisturbanceDb FLOOR, evaluateAnswer [mükemmel/dokunulmamış/
kısmi/proximityScore sınırları], calculateXP [GRADED], teachingText/
getFeedbackData [Türkçe çekim + mix dili], getHintText [harf/değer sızdırmaz],
applyProcessing+setLiveBandGain [N doğru node + canlı güncelleme, sahte
audioCtx], merkezi eğri + "kolaylaşma yok" invaryantı, getMeta, "artık
three-way DEĞİL" doğrulaması + Kompresör/Reverb'in three-way-cards.js'ten HÂLÂ
miras aldığının AYRICA testle kanıtlanması).

---

Önceki commit (G44, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Mod 8 "Tonal
Denge": Motor 2'nin ÜÇÜNCÜ modu (A/B/C odd-one-out, spektral tilt-tabanlı) —
Kompresör (G30)/Reverb (G35)'in ŞABLONUNDAN türetildi, oynanabilir, menüde,
573 test → 640 test (+67).**

**KATALOG YERİ — ÜRÜN KARARI (task'ın kendisi verdi, elle uydurulmadı):**
`mode-catalog.js`'te "tonal-denge" id'si ÖNCEDEN Motor 1'de duruyordu ("Hangi
bölge fazla?", unlockLevel:9, playable:false, HİÇ kod karşılığı yoktu — sadece
bir isim/placeholder). Task bu ismi AÇIKÇA Motor 2'nin üçüncü modu olarak
tanımladı (A/B/C odd-one-out, tilt-tabanlı) — placeholder REPURPOSE edildi
(silinip yeniden eklenmedi, id korundu): motor 1→2, unlockLevel 9→15 (Reverb
14 ile Distortion 16 arasına), aciklama "Hangi bölge fazla?"→"Hangisinin tonal
dengesi bozuk?", kulaklikGerekli false→true. Motor 1'in "Hangi bölge fazla?"
konsepti (tek-değer tahmini, farklı bir oyun tipi) artık kodda YOK — bu BİLİNÇLİ
bir kapsam kararı, task'ın kendi tanımıyla ÇAKIŞTIĞI için tutulamazdı.

**MOD FELSEFESİ — Kompresör/Reverb'den FARKLI bir "aynı" tanımı:** Kompresör'de
"aynı" ikili COMP_BASE_K=0.5 (hafif kompresyonlu), Reverb'de her zaman BİR
reverb tipi uygulanmış — Tonal Denge'de ise "aynı" ikili TAMAMEN NÖTR (k=0,
flat, hiçbir filtre etkisi). Gerekçe: gerçek mixte dengeli tonal denge KURAL,
bozukluk İSTİSNA — task'ın "İkisi DENGELİ (nötr), biri DENGESİZ" kararı. Bu,
oddK'nin bir bazdan İKİ yöne uzaklaşması (Kompresör'ün pickOddK'sı) yerine
DOĞRUDAN kGap kadar (0'dan) uzaklaşması demek — `pickKGap`'e SADECE bir ÜST
clamp (Math.min(1,...)) eklendi (Kompresör'ün alt+üst simetrik clamp'inin
AKSİNE, taban zaten 0 olduğu için alt taşma riski yok).

**TİLT UYGULAMASI (tek algısal eksen, task'ın "Kompresör dersi" talebi):**
`core/audio-engine.js`'in genel filters-seri-bağlama sözleşmesi DEĞİŞTİRİLMEDEN
ÜÇ `BiquadFilterNode` (low-shelf 250Hz + peaking 1000Hz + high-shelf 4000Hz)
seri bağlanıyor. Dört "şekil": `tilt-bass`/`tilt-treble` (low-shelf+high-shelf
ZIT yönde, orta=0 — geniş bir eğim, TEK bant DEĞİL) ve PRO katmanının
`smile`/`frown` (bas+tiz AYNI yöne, orta ZIT yöne — "iki bölgeli karmaşık
bozukluk", task'ın açık isteği). `imbalanceScore` (en büyük mutlak banda-
kazancı, dB) HER şekilde AYNI k'de BİREBİR eşit — Kompresör'ün
gainReductionDb'sinin AYNI rolü, şekilden bağımsız TEK bir "ne kadar dengesiz"
ekseni (testle doğrulandı).

**KADEMELİ ZORLUK (Reverb'in TİP-değişimi katmanının AYNI öğretmen-yöntemi):**
`TONAL_CURVE_CONFIG` (K_GAP_AT_1=0.95 → K_GAP_AT_CAP=0.10, FLOOR=0.085) —
easy/medium/hard'da SADECE tilt-bass/tilt-treble (miktar farkı), PRO/PRO
PLUS'ta (ya da Otomatik'te position>=18, Reverb'in AYNI eşiği) %50 ihtimalle
YA çok ince bir tilt YA DA smile/frown (task'ın "VEYA" isteği — rastgele,
deterministik değil). "Kolaylaşma yok" invaryantı node ile DOĞRUDAN
hesaplandı: kGap → easy(4)=0.666≤0.95, medium(8)=0.415≤0.55, hard(12)=0.258≤0.28,
pro(20)=0.100≤0.12; timeSec → easy(4)=16.27≤18 … pro(20)=9.50≤10 (hepsi
rahat marjla, testle doğrulandı).

**KAYNAK — TEK gerçek "dolu bağlam" örneği (task'ın en katı kısıtlaması):**
Tilt SADECE dolu spektrumda (çok sayıda eş zamanlı frekans bileşeni) duyulur.
Kataloğun 14 örneği tek tek elendi: kick/snare/hihat/tom TEK vuruş, bas/gitar
TEK nota, vokal TEK fraz, sentetik/gürültü TEST tonu — HİÇBİRİ "mix bağlamı"
değil. SADECE "groove" (90 BPM davul döngüsü, kick+snare+hihat AYNI ANDA)
gerçek bir dolu-mix örneği. `uyumluKaynaklar: compatibleSourceIds({ only:
["groove", "upload"] })` — G43'ün `only` mekanizması BİRE BİR yeniden kullanıldı
(üçüncü kullanıcı, mekanizmanın genelleşebilirliğini doğruladı). Varsayılan
kaynak da "pink" DEĞİL "groove" (Kompresör/Reverb'in "pink" varsayılanından
BİLİNÇLİ sapma — pink zaten bu modun listesinde YOK, "pink" fallback'i burada
anlamsız/yanıltıcı olurdu).

**GÖRSEL — Kompresör'ün (zaman-genlik zarfı)/Reverb'in (kuyruk zarfı) AKSİNE
GERÇEK bir frekans-yanıtı eğrisi:** Boost/Cut'ın `computeEqCurveDb` tekniğiyle
AYNI (GERÇEK `BiquadFilterNode.getFrequencyResponse`, elle yaklaşıklık DEĞİL) —
üç filtrenin dB'leri TOPLANIYOR (kaskat filtrelerin genlikleri ÇARPILIR →
dB'leri toplanır, standart DSP). Kırmızı=senin cevabın, yeşil=doğru (G34
standardı). Frekans ekseni bu kez GERÇEKTEN kullanıldı (Kompresör/Reverb'in
SADECE re-export ettiği FA_MIN/FA_MAX/faXToF/faFToX burada drawAxis'te
fiilen çiziyor).

**ÖĞRETİCİ METİN (task'ın örnek formatıyla BİREBİR):** "B dengesizdi — bas-ağır
eğim (düşük bölge +9.3dB, tiz -9.3dB) — mix boğuk/çamurlu duyulur, tizler
geride kalır. Dengeli mixte bas ve tiz orantılı, gerçek mixte referans
şarkıyla tonal dengeyi böyle karşılaştırırsın." (canlı, gerçek oyunda
doğrulandı — bkz. aşağıdaki doğrulama). PRO/smile: "C dengesizdi — smile
eğrisi (bas ve tiz şişkin, orta çukur) (bas +Xdb, orta -Xdb, tiz +Xdb) —
kulağa 'havalı' gelir ama mixte orta kaybolur, karar bulanıklaşır."

**app.js kablolaması (Motor 2'nin GENEL mekanizması + ÜÇ mod-özel metin dalı):**
`registerMode(tonalDenge)` + `THREE_WAY_MODE_IDS`'e eklendi — A/B/C toggle,
otomatik döngü, previewLetter, submitThreeWayGuess, feedback kartı, kulaklık
sheet'i (`meta.kulaklikGerekli`) TAMAMEN generik, HİÇBİR ek kablolama
gerekmedi (G33/G35'in "genelleştirme" yatırımı üçüncü modda karşılığını
verdi — task'ın da doğruladığı gibi). SADECE üç yerde mod-özel görüntü metni
(`pushHistory` açıklaması, `questionTitle`, `setFeedback` açıklaması —
Kompresör/Reverb'in de AYNI üç yerde kendi dalları var) yeni bir
`q.mode === "tonal-denge"` dalı gerektirdi — bunun DIŞINDA app.js'e dokunulmadı.

**KORUNANLAR (task'ın açık isteği):** 7 mevcut mod, `three-way-cards.js`
(değişmeden import edildi — G41'in "üçüncü bir Motor 2 modu SADECE bu modülü
import edip re-export etmesi yeter" öngörüsü DOĞRULANDI), reskin (G36-G41),
ses/zorluk/geri bildirim akışı HİÇ değişmedi.

**Doğrulama (canlı, tarayıcıda, `devFlags.simulatePro` ile seviye kilidi
aşılarak):** Menüde "Tonal Denge" Reverb ile Distortion ARASINDA, "Sv 1"/"Pro"
rozetleriyle doğru yerde göründü. Tıklanınca kulaklık uyarı sheet'i çıktı
(kulaklikGerekli:true doğrulandı) — "Kulaklığım takılı, başla" ile geçildi.
Oyun ekranında kaynak "Davul Döngüsü" (varsayılan), Kaynak sheet'inde SADECE
DAVUL grubunda "Davul Döngüsü" + KENDİ DOSYAM grubunda "Dosya seç" göründü
(başka HİÇBİR grup/kaynak yok — `only:["groove","upload"]` doğrulandı).
19 tur otomatik oynatıldı (DOM üzerinden gerçek tıklamalarla) — A/B/C büyük
kartlar (G41 UI) normal çalıştı, otomatik döngü/amber vurgu senkron, Boss
round'a (Soru 5) doğru geçti. Öğretici metin GERÇEK oyun çıktısında doğrulandı
(örnek: "Yanlış — sen A dedin. C dengesizdi — tiz-ağır eğim (düşük bölge
-8.9dB, tiz +8.9dB) — mix sert/ince duyulur, bas zayıf/cılız kalır. Dengeli
mixte bas ve tiz orantılı..."), doğru cevapta XP verildi ("+22 XP"). Cevap
sonrası görsel EKRAN GÖRÜNTÜSÜYLE doğrulandı: yeşil "Doğru" eğrisi net bir
tiz-ağır tilt şekli (düşükten yükseğe yükselen çizgi) çizdi, üstte "● Doğru"
lejantı, frekans ekseni (100–12.8k) doğru. Kompresör'e ve Reverb'e geçilip
kaynak listeleri kontrol edildi — İKİSİ de DEĞİŞMEDİ (Kompresör 13 kaynak,
pink/white hariç hepsi; Reverb TAM `snare,groove,guitar,vocal,upload` — G43'ün
listesi bozulmadı). Konsol hatası YOK (19 tur boyunca, `onlyErrors` filtresiyle
iki kez kontrol edildi). `npm test`: 640/640 (573 +67 yeni —
`test/tonal-denge.test.mjs`: createQuestion sözleşmesi, "aynı" ikilinin HER
ZAMAN flat olduğu, buildVariant'ın dört şekli + tek-eksen imbalanceScore,
pickKGap'in FLOOR+ÜST clamp'i, PRO katmanının %50 smile/frown istatistiği
(1000 örnek), evaluateAnswer/calculateXP, teachingText/getFeedbackData (gerçek
dB'ler+mix dili), getHintText (harf sızdırmıyor), applyProcessing (previewLetter
→ 3 doğru BiquadFilterNode), paramsForDifficultyPosition, "kolaylaşma yok"
invaryantı, getMeta (kaynak listesi TAM groove+upload), three-way-cards.js'ten
GERÇEK delegasyon (referans eşitliği) — diğer 573 test (7 mod + mekanizmalar)
DOKUNULMADAN geçti, regresyon yok.

---

Önceki commit (G43, tek commit — kod+DURUM.md birlikte) — **Reverb kaynak filtresi ELLE
düzeltildi: G42'nin "tek-vuruş dışla" otomatik kuralı yanlış sonuç veriyordu, yerine
kullanıcının gerçek mix deneyimine dayanan AÇIK bir izin listesi geldi.** Sorun: G42'nin
`excludeOneShot` heuristiği "tek darbe = reverb kuyruğunu göstermez" varsayımıyla kick/
snare/hihat/tom'un HEPSİNİ dışlıyordu — ama snare, gerçek mixte NEREDEYSE HER ZAMAN
reverb alan bir kaynak (kısa room/plate, vuruş sonrası kuyruk net duyulur); heuristik bu
durumda YANLIŞ öngörüyordu. Kullanıcı (14 yıl mix deneyimi) kesin bir ayrım verdi:
KALACAK {gitar, vokal, snare, davul döngüsü, +upload}, ÇIKACAK {kick, hi-hat, tom,
sentetik (saw/square/triangle)} — bas ve gürültü (pink/white) de listede YOKTU, o yüzden
zımnen dışlandı (bas mud riski, gürültü/synth gerçek mixte hiç reverb almayan test
tonları — bkz. reverb.js getMeta yorumu).

**Mekanizma — `core/source-catalog.js`:** `compatibleSourceIds()`'a yeni bir `only`
parametresi eklendi — bir id listesi verilirse SADECE o id'ler döner, diğer TÜM
bayraklar/kaynaklar (requireTransient DAHİL, birlikte verilse bile) yok sayılır — "only"
her zaman SON SÖZ, çünkü ELLE seçilmiş bir karar bir otomatik bayrağın kesişimiyle
daraltılmamalı. G42'nin `oneShot` bayrağı ve `excludeOneShot` parametresi TAMAMEN
kaldırıldı (kick/snare/hihat/tom nesnelerinden `oneShot: true` silindi) — Reverb tek
kullanıcısıydı ve artık `only` kullanıyor, ölü kod bırakılmadı (CLAUDE.md: "kesin
kullanılmıyorsa sil"). Kompresör'ün `noTransient`/`requireTransient` mekanizması
DOKUNULMADI — pink/white gürültü hâlâ dışlanıyor, DOĞRU çalışıyordu.

**reverb.js:** `uyumluKaynaklar: compatibleSourceIds({ only: ["guitar", "vocal",
"snare", "groove", "upload"] })` — 11 kaynaktan (G42) 5 kaynağa indi, ama BİLİNÇLİ bir
daralma (otomatik heuristiğin ürettiği YANLIŞ 11 değil, elle doğrulanmış DOĞRU 5).

**Doğrulama (canlı, tarayıcıda):** Reverb'e girildi — `#sourceSelect.options` TAM OLARAK
`snare,groove,guitar,vocal,upload` (5 kaynak, sırasız eşleşme deepEqual'la testte de
doğrulandı). Kaynak sheet'i açıldı — SENTETİK grubu TAMAMEN kayboldu (hiç synth/gürültü
kalmadı), DAVUL grubunda SADECE Snare + Davul Döngüsü (kick/hi-hat/tom yok), ENSTRÜMAN
grubunda SADECE Akustik Gitar + Vokal (Bas C2/E2 yok). Snare seçiliyken bir round
başlatıldı — A/B/C kartları (G41 UI) normal çalıştı, konsol hatası yok. Kompresör'e
geçildi — `#sourceSelect.options` DEĞİŞMEDİ (13 kaynak, pink/white hâlâ tek dışlanan,
kick/hihat/tom/bas/synth hâlâ VAR — G42'deki DOĞRU filtre bozulmadı). Kesim Noktası'na
geçildi — tüm 15 kaynak (regresyon yok). Frekans Bulma'nın kendi listesi (6 kaynak)
DEĞİŞMEDİ. `npm test`: 573/573 (574'ten 573'e — G42'nin `excludeOneShot`/`oneShot`
testleri kaldırıldı [4], `only` mekanizması + Reverb'in yeni kesin listesi için yeni
testler eklendi [5], net -1; `test/source-catalog.test.mjs` ve `test/reverb.test.mjs`
güncellendi, `test/kompresor.test.mjs` DOKUNULMADI).

---

Önceki commit (G42, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Mod bazlı kaynak
uyumluluğu: Reverb/Kompresör'de uygun olmayan kaynaklar kaynak seçim listesinden
çıkarıldı.** Sorun: her modun `getMeta()`'sında ZATEN bir `uyumluKaynaklar` alanı vardı
(G-serisinin önceki turlarından, `mode-contract.test.mjs`'in de doğruladığı bir sözleşme
alanı) ama HİÇBİR YERDE gerçekten filtrelemek için okunmuyordu — yedi modun altısı bunu
`SOURCE_GROUPS.flatMap(...)` ile TÜM kaynakların düz listesine sabitliyordu (Frekans
Bulma hariç, o zaten kendi elle-yazılmış kısıtlı listesini kullanıyordu). Sonuç: Reverb'de
kick (tek vuruş, döngüde bile reverb kuyruğunu göstermiyor) ve Kompresör'de pembe/beyaz
gürültü (transient'sız, kompresyonun atak-bastırması duyulmuyor) seçilebiliyordu —
oynanamaz/anlamsız kombinasyonlar.

**Merkezi mekanizma — `core/source-catalog.js`:** Her kaynak nesnesine iki opsiyonel
uyumluluk bayrağı eklendi: `oneShot: true` (kick/snare/hihat/tom — tek darbe, döngüde
"sürekli çalan" bir ses hissi vermiyor) ve `noTransient: true` (pink/white — ani bir
atak yok). Yeni `compatibleSourceIds({ excludeOneShot, requireTransient })` fonksiyonu
bu bayraklara göre SOURCE_GROUPS'u süzüp bir id listesi döndürüyor; parametresiz
çağrıldığında (varsayılan) TÜM kaynakları döner. Yedi mod dosyası (Frekans Bulma HARİÇ,
o kendi özel listesini koruyor — dokunulmadı) artık `SOURCE_GROUPS.flatMap(...)` yerine
bu TEK fonksiyonu çağırıyor: Reverb `compatibleSourceIds({ excludeOneShot: true })`,
Kompresör `compatibleSourceIds({ requireTransient: true })`, diğer dört mod (Kesim
Noktası/dB Seviyesi/Boost-Cut/Q Genişliği) parametresiz (kısıtlama YOK, task kararı —
frekans/EQ/seviye her kaynakta duyulur). Yeni bir mod (Stereo Genişlik/Pan Konumu gibi)
kendi kısıtlamasını tanımlamak isterse SADECE bu fonksiyona yeni bir bayrak/parametre
eklemesi yeterli — app.js'e dokunmadan.

**app.js — kaynak listesi ARTIK aktif moda göre süzülüyor:** `populateSourceSelect()`
(önceden sabit, sayfa yüklenirken bir kez çalışan bir fonksiyondu) artık
`mode.getMeta().uyumluKaynaklar`'ı okuyup `<optgroup>`/`<option>` listesini buna göre
üretiyor VE `enterMode()`'un mod-değişimi dalına eklendi — her mod kartına tıklanışta
YENİDEN çalışıyor. Önceki seçim yeni modda da uyumluysa korunuyor; değilse (ör.
Reverb'den Kompresör'e geçilirken seçili kaynak "Pink Noise"sa) listedeki İLK uyumlu
kaynağa düşülüyor ve bir `change` event'i elle tetikleniyor ki Ayarlar sheet'indeki satır
metni (`updateRowText`, mevcut mekanizma) senkron kalsın — kullanıcı asla artık var
olmayan bir `<option>`'da "takılı" kalmıyor. "Karıştır" (rastgele kaynak) özelliğinin
havuzunu üreten `pickRoundSource()` de AYNI `uyumluKaynaklar` listesiyle sınırlandı —
aksi halde Karıştır, kaynak sheet'inde hiç görünmeyen bir kaynağı sessizce çalabilirdi.

**Motor 2 tutarlılık notu (task'ın istediği "kesişim" kontrolü):** A/B/C'nin üçü de
`pickRoundSource()`'un TEK seferde seçtiği kaynaktan geliyor (mevcut, değişmeyen akış,
bkz. `startRound()`) — kaynak seçimi zaten üç varyant arasında ortak, kaynak hiçbir
zaman "hangisi farklı" ipucunu vermiyor. Bu turda değişen SADECE hangi kaynakların
havuzda/listede yer aldığı, üç-yönlü karşılaştırmanın kendisi dokunulmadı.

**KORUNANLAR (task'ın açık isteği):** Ses motoru (`audio-engine.js`), zorluk eğrisi,
oyun mantığı, geri bildirim, Motor 2 kartları (G41 reskin) HİÇ değişmedi — sadece kaynak
FİLTRELEME eklendi. Frekans Bulma'nın kendi elle-yazılmış `uyumluKaynaklar` listesi
(`["pink","white","saw","square","triangle","upload"]`, drums/enstrüman hariç — G-serisi
öncesi bir ürün kararı) da BİLEREK dokunulmadı, bu turun kapsamı dışında.

**Doğrulama (canlı, tarayıcıda, `devFlags.simulatePro` ile seviye kilidi aşılarak):**
Reverb'e girildi — Kaynak sheet'inin DAVUL grubunda SADECE "Davul Döngüsü" göründü
(kick/snare/hi-hat/tom yok), `#sourceSelect.options` 11 kaynak döndü (pink/white/saw/
square/triangle/groove/bass/bass_alt/guitar/vocal/upload). Kompresör'e geçildi —
`#sourceSelect.options` 13 kaynak döndü (pink/white YOK, kick/snare/hihat/tom/groove/
bass/bass_alt/guitar/vocal/saw/square/triangle/upload VAR); önceki seçim ("Pink Noise",
Reverb'de aktifken seçiliydi) Kompresör'de uyumsuz olduğu için OTOMATİK "Saw"a düştü,
Ayarlar satırının metni de senkron güncellendi. Kompresör'de bir round başlatıldı — A/B/C
kartları (G41 UI) normal çalıştı, konsol hatası yok. Kesim Noktası'na geçildi — TÜM 15
seçenek (14 katalog + Dosya Seç) göründü, kısıtlama yok (regresyon yok). Frekans Bulma'nın
kendi listesi (6 kaynak) sayfa yüklenişinde DEĞİŞMEDİ. `npm test`: 574/574 (561 +13 yeni —
`test/source-catalog.test.mjs` mekanizmanın kendisini, `reverb.test.mjs`/
`kompresor.test.mjs`'e eklenen testler ilgili modun dışlama/koruma listesini doğruluyor).

---

Önceki commit (G41, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Motor 2 (Kompresör/
Reverb) cevap kartları reskin: büyük A/B/C kartlar + çalan kart vurgusu.** Motor 1'in
küçük `.ans` grid'i yerine `Dizayn /prototype.html`'in `.opt`/`.opt-key`/`.wave`
yapısına yakınsayan büyük kartlar geldi — ÇALIŞAN MEKANİK (otomatik döngü, anında seç,
odd-one-out, X/Atla, kesik ses düzeltmesi) HİÇ DEĞİŞMEDİ, sadece görsel katman.

**Yeni ortak modül — `core/three-way-cards.js`:** `renderThreeWayCards`/
`markThreeWayCards`/`updateThreeWayCardsPlayState` — Kompresör'ün ve Reverb'in
`renderAnswerChoices`/`markAnswerChoices`'ı artık bu üç fonksiyona delege ediyor
(mod sözleşmesi hâlâ karşılanıyor, gövde ORTAK). Gerekçe: q.choices/q.variants şekli
ikisinde de BİREBİR aynı, gerçek bir mod-özel fark yok — G35'in `submitThreeWayGuess`'i
app.js'te genelleştirme kararının AYNI felsefesi, G34'ün `feedback-colors.js`
extraction'ıyla AYNI desen. Üçüncü bir Motor 2 modu (Distortion/Tonal Denge) sadece bu
modülü import edip re-export etmesi yeter.

**Kart yapısı:** her kart harf (`.ans-m2-key`, dairesel rozet) + isim ("Birinci ses"/
"İkinci ses"/"Üçüncü ses") + SABİT süsleme waveform'u (harfe göre deterministik, ses
analizi DEĞİL — prototipin kendi `WAVES` sabit dizisiyle AYNI felsefe) + durum metni
(`.ans-m2-state`). Durum metni task'ın istediği gibi SADECE iki değer alıyor
("Henüz dinlenmedi" / "Çalınıyor") — prototipteki "Çalındı"/"Elendi" ek durumları
BİLEREK atlandı (bizim basit otomatik-döngü mekaniğimize uyarlandı, ekstra "geçmiş"
takibi gerekmiyor).

**Çalan kart vurgusu:** amber kenar+glow (`box-shadow`) + amber gradyan anahtar +
amber waveform — kırmızı/yeşil (yanlış/doğru, G34) renkleriyle ÇAKIŞMASIN diye BİLEREK
farklı bir renk (marka rengi `--am`, prototipin mor `--pu`'sundan da farklı, çünkü
uygulamanın KENDİ renk dilinde mor kullanılmıyor). `app.js`'in `updateAbToggleUI()`'si
— zaten HER `threeWayPlayLetter` değişiminde (round başlangıcı, otomatik döngünün her
tık'ı, manuel A/B/C basışı) çağrılan TEK merkezi nokta — artık
`mode.updateAnswerPlayState(els.answers, threeWayPlayLetter)`'ı da çağırıyor; ayrı bir
çağrı noktası eklemeye GEREK kalmadı.

**Mekanik korundu (task'ın "sessizce değiştirme" uyarısı):** `.ans`/`data-letter`
class'ları/attribute'ları AYNEN kaldı — app.js'in click-delegasyonu
(`e.target.closest(".ans")`) ve `submitThreeWayGuess` HİÇ değişmedi, "anında seç"
(tıkla=cevapla, prototipin 2-adımlı "seç+onayla" modeli DEĞİL) davranışı dokunulmadan
korundu. `THREE_WAY_MODE_IDS`/`isThreeWayModule`/`isThreeWayQuestion`/
`cycleThreeWayPreview`/`previewLetter` mekanizmalarının HİÇBİRİNE dokunulmadı — sadece
`.answers`/`.ans` container'ına YENİ bir modifier class (`answers-m2`/`ans-m2`) eklendi.

**Doğrulama (canlı, tarayıcıda):** Kompresör'e girildi, round başlatıldı — üç kart alt
alta (A "Birinci ses"/B "İkinci ses"/C "Üçüncü ses"), her birinde waveform + durum
metni doğrulandı. O an çalan kart (C) amber kenar+glow+anahtar+dolgu ile DİĞER İKİSİNDEN
(gri, "Henüz dinlenmedi") AÇIKÇA ayırt edilir bulundu; alt "Döngü" A/B/C pill'iyle
BİREBİR senkron. 2 saniye beklenip tekrar kontrol edildi — vurgu C'den A'ya taşındı
(otomatik döngü çalışıyor). B kartına tıklandı — cevap ANINDA gönderildi (onay adımı
YOK), feedback kartı doğru açıldı ("Yanlış — sen B dedin, C farklıydı"), B kırmızı
("wrong"), C yeşil ("right") oldu, durum metinleri temizlendi. "Durdur"a basıldı — döngü
durdu, buton "🔁Tekrar Çal"a döndü (G31'in kesik-ses düzeltmesi bozulmadı). Reverb'de
AYNI davranış (paylaşılan modül) doğrulandı. Motor 1'den Kesim Noktası'na geçildi —
küçük 4'lü `.ans` grid'i TAMAMEN değişmeden çalışıyor (regresyon yok). Konsol hatası
YOK boyunca. `npm test`: 561/561.

---

Önceki commit (G40, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **İlerleme sekmesi
reskin: SV rozeti tek-kart + 3'lü stat satırı.** Önceki turda (araştırma-only, kod
yazılmadı) tespit edilen "veri zaten var, sadece düzen farklı" bulgusuna dayanarak
İlerleme'nin görsel düzeni prototipe yakınsatıldı — mod mantığı/hesap/veri
DOKUNULMADI.

**1. SV rozeti tek-kart:** Eski 4'lü ızgara (Seviye/XP/Seri/Doğruluk) + ayrı XP-bar
bloğu kaldırıldı, yerine Ana Menü'nün G36'da kurduğu `.card.lvl`/`.lvl-badge`
deseninin BİREBİR AYNISI geldi (`index.html`, id'ler `prog*` önekiyle ayrı —
`progLevelValue`/`progXpText`/`progXpBar`/`progNextLevelText` — aynı sayfada iki
`#levelValue` olamayacağı için). Veri KAYNAĞI değişmedi: `app.js updateUI()`'daki
AYNI `xp = progress.xpProgress(diffState().xp)` hesabından okunuyor — Ana Menü'nün
rozetiyle (`menuLevelValue` vb.) HER ZAMAN senkron, iki ayrı hesaplama YOK.

**2. 3'lü stat satırı:** "Seri" (combo) çıkarıldı (prototipte de yok), "İsabet"
"Antrenman"+"Soru" ile AYNI satıra taşındı — prototipin `.row` + 3× `.stat-big`
deseni birebir kopyalandı. `totalPracticeValue`/`totalRoundsValue`/`accuracyValue`
id'leri DEĞİŞMEDİ (zaten doğru hesaplanıyordu, sadece HTML'de tek satıra taşındı) —
bu üç değerin JS tarafı hiç dokunulmadı.

**Temizlik:** artık hiçbir yerde kullanılmayan `levelValue`/`xpValue`/`comboValue`/
`xpBar`/`progressText` DOM id'leri ve `.prog-grid` CSS kuralı (son kullanan yer bu
ekrandı) kaldırıldı — CLAUDE.md'nin "kesin kullanılmıyorsa sil" kuralı gereği,
geriye dönük uyumluluk kırıntısı bırakılmadı.

**DOKUNULMAYANLAR (task'ın açık isteği):** "Şu An Neredesin" (`renderWhereNow`),
"Frekans bölgesi — en zayıf" (`renderZonePanel`), "Son 30 Gün" grafiği
(`renderAccuracyChart`) — üçü de zaten TAM ve gerçek veriden besleniyordu (bkz.
önceki turun araştırma raporu), hiçbir satırına dokunulmadı. Rozetler ızgarası (9
rozet) da bu turda DEĞİŞMEDİ — ayrı bir ürün kararı olarak G36'nın notunda
işaretli kaldı. Günlük Görevler/Canlı İstatistikler/Son Turlar/"İstatistikleri
Sıfırla" panelleri (tasarımda karşılığı olmayan kod-only ekler) KALDI.

**Doğrulama (canlı, tarayıcıda):** İlerleme sekmesine girildi — SV rozeti tek
kart olarak "SV 4 / Kalibre Kulak / 6/330 XP / Sonraki seviyeye 324 XP" gösterdi,
Ana Menü'nün rozetiyle (AYNI ekranda, aynı anda kontrol edildi) BİREBİR aynı
değerler. 3 stat ("3s 44d Antrenman" / "1358 Soru" / "%2 İsabet") tek satırda.
Aşağı kaydırıldı: "Şu An Neredesin" ("Tiz bölgesinde iyisin (%50), bas bölgesinde
zorlanıyorsun (%50)"), "Frekans bölgesi" ("en zayıf: bas · %50"), "Son 30 Gün"
(veri henüz yetersiz olduğu için boş-durum mesajı) — üçü de DEĞİŞMEDİ, gerçek
veriyle çalışıyor. Konsol hatası yok. `npm test`: 561/561.

---

Önceki commit (G39, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Kulaklık sheet'i
+ dB spektrumu: üç düzeltme.** G37/G38'de kurulan iki mekanizmadaki (kulaklık uyarısı,
dB görseli) davranış sorunları giderildi.

**1. Kulaklık sheet'i artık genel toggle'dan BAĞIMSIZ:** G37'de `prefs.hpWarning`
(Ayarlar'daki "Kulaklık uyarısı" anahtarı) hem Ana Menü'deki statik `.mobile-warn`
banner'ını HEM DE mod-özel `hpSheet`'i birlikte kontrol ediyordu — kullanıcı bunun
YANLIŞ olduğuna karar verdi: toggle KAPALIYKEN bile kulaklık gerektiren bir moda
girilince sheet çıkmalıydı (toggle sadece banner'ı kapatmalı). `app.js`'teki mod
kartı click handler'ından `&& prefs.hpWarning` şartı kaldırıldı — artık SADECE
`meta.kulaklikGerekli && !skipped` kontrol ediliyor. `applyPrefs()`/`.hp-warn-off`
(banner görünürlüğü) DOKUNULMADI, toggle'ın KENDİ işlevi (ses değil, banner)
korundu — Ayarlar sheet'indeki açıklama metni de ("Ana menü notu + kulaklık
gerektiren egzersizlerde açılan uyarıyı göster" → "Ana menüde kulaklık hatırlatma
notunu göster") bu gerçeğe geri çekildi.

**2. "Bir daha gösterme" artık OTURUMLUK:** G37'de `prefs.hpSkip[modeId]` olarak
localStorage'a (kalıcı) yazılıyordu — kullanıcı bunun kalıcı DEĞİL, oturumluk
olmasını istedi (aynı oturumda tekrar çıkmasın, sayfa/uygulama yeniden yüklenince
sıfırlansın). `app.js`'e modül-seviyesi bir `hpSkippedThisSession` (`Set`, bellek)
eklendi, `prefs.hpSkip` TAMAMEN kaldırıldı (`storage.js`'in `freshPrefs()`'inden
de silindi — artık hiçbir yerde okunmuyor/yazılmıyor).

**3. dB Seviyesi'nde arka spektrum kaldırıldı:** G38'in dikey bar görseli
(`drawDbBars`) arka planda hâlâ eski FFT spektrum çubuklarıyla (`drawSpectrumBars`)
ÇAKIŞIYORDU — dB modu bir frekans dağılımını değil TEK bir seviye farkını
sorguladığı için spektrum orada anlamsızdı. `db-seviyesi.js`'e `THREE_WAY`'in
(kompresor.js/reverb.js) AYNI deseninde mode-agnostik bir bayrak eklendi:
`export const SHOW_SPECTRUM = false`. `app.js`'in `drawVisualizer`'ı artık
`mode.SHOW_SPECTRUM !== false` kontrolüyle spektrum çizimini atlıyor — export
ETMEYEN diğer altı mod (Frekans Bulma/Kesim Noktası/Boost-Cut/Q/Kompresör/Reverb)
varsayılan `true` ile ETKİLENMEDİ.

**Doğrulama (canlı, tarayıcıda):** `localStorage`'da `hpWarning:false` ayarlanıp
sayfa yenilendi → Reverb'e girişte sheet YİNE DE çıktı (toggle'dan bağımsız,
doğrulandı). "Bir daha gösterme" işaretlenip onaylandı → AYNI oturumda Reverb'e
tekrar girişte sheet ATLANDI (skip çalıştı) → sert yenileme (cmd+shift+r) sonrası
Reverb'e girişte sheet GERİ GELDİ (oturumluk doğrulandı, `hpSkippedThisSession`
Set'i sıfırlanmıştı). Ayarlar sheet'inde toggle açılıp kapatıldı, `document.body`
`hp-warn-off` sınıfı ve `prefs.hpWarning` DOĞRU senkronize oldu (banner masaüstü
Chrome'da `@media (hover:none)` kısıtı yüzünden zaten hiç görünmüyor — bu ÖNCEDEN
de böyleydi, bu turun konusu değil). dB Seviyesi'ne girildi → arka planda spektrum
çubukları YOK, sadece iki dikey bar + eksen çizgileri. Kesim Noktası'na geçildi →
spektrum çubukları NORMAL çalışıyor (regresyon yok). `npm test`: 561/561.

---

Önceki commit (G38, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **dB Seviyesi
görseli: yatay gauge → prototipteki DİKEY BAR'lara çevrildi.** `db-seviyesi.js`'in
`drawDbGauge`'ı (tek yatay çizgi + iki hareketli işaretçi) tamamen kaldırıldı,
yerine `Dizayn /prototype.html`'in `#vizDb`'sinden (satır 572-588) birebir alınan
"A · Referans" / "B · İşlenmiş" iki dikey bar geldi (`drawDbBars`, aynı gradyan
renkleri: A gri `#9AA3B8→#5A6377`, B mavi `#8FA6FF→#4E6BE0`).

**Kullanıcıyla netleştirilen kritik çakışma:** Task'ın ilk hâli "İşlenmiş bar
uygulanan dB değişimine göre daha dolu/boş olsun" diyordu — ama bu, SORU
SIRASINDA gösterilirse modun kendi `directionRevealed` mekaniğini (3. sorudan
sonra yön BİLEREK gizlenir, çeldiricilerin işareti bile karıştırılır, bkz.
dosya başı yorum + `createQuestion`) görsel olarak deşifre ederdi —
"kulakla bulma" ilkesini kırardı. `AskUserQuestion` ile soruldu, kullanıcı ÜÇÜNCÜ
(özel) seçeneği verdi: **bar SORU SIRASINDA tamamen NÖTR** (A=B=aynı sabit
yükseklik, `REF_FRAC=0.55`, hiçbir ipucu yok), **CEVAP SONRASI gerçek değerleri**
gösteriyor (A sabit referans, B = gerçek `dbDelta`, ölçek `DB_RANGE=5` — eski
gauge'la AYNI sabit görsel aralık). Bu, hem prototipin görsel dilini taşıdı hem
zorluk mekaniğini KORUDU.

**Cevap sonrası (korunan red/green mekanik, bar'a uyarlandı):** B barın yeşil
konturu = "doğru" (gerçek `dbDelta` zaten barın kendi yüksekliği); varsa
kullanıcının tahmini kırmızı kesikli çizgi + sayı olarak B barın üstüne
biniyor; üstte AYNI G34 lejantı ("● Senin cevabın" kırmızı / "● Doğru" yeşil).
Cevap şıklarının (`.ans` butonları) kendi doğru/yanlış/seçili renklendirmesi
HİÇ DOKUNULMADI (ayrı bir DOM mekanizması, bar görseli sadece canvas'ta).

**Mimari not:** Uygulamanın TÜM modları TEK paylaşılan canvas'a (`#visualizer`)
`mode.drawOverlay` ile çiziyor (bkz. app.js `drawVisualizer`); prototipteki
`#vizDb` DOM/CSS yapısı BİREBİR kopyalanmadı (yeni DOM elemanı eklemek diğer
6 modun paylaşılan-canvas mimarisinden sapardı) — aynı görsel dil canvas'ta
(`roundedRectPath`/`createLinearGradient`) yeniden üretildi.

**Doğrulama (canlı, tarayıcıda):** dB Seviyesi'ne girildi, round başlatıldı →
iki bar eşit yükseklikte NÖTR görüldü (ekran görüntüsüyle doğrulandı, ilk
denemede tarayıcı HTTP önbelleği eski `drawDbGauge`'ı göstermeye devam etti,
sert yenileme [cmd+shift+r] sonrası yeni kod devreye girdi — KOD hatası
değildi). Cevap verildi (yanlış, +3.25 dedi/+1.50 idi) → B barı yeşil konturla
gerçek değeri (+1.50 dB), kırmızı kesikli çizgiyle tahmini (+3.25 dB) gösterdi,
lejant doğru renklerde. Yeni soruya otomatik geçişte bar NÖTR'e sıfırlandı
(önceki cevabın sızıntısı yok). "Kısıldı" yönlü bir soruda da (negatif
`dbDelta`) B barı referanstan DAHA KISA çizildi (mantık iki yönde de
doğrulandı). Frekans Bulma moduna geçiş regresyon kontrolü yapıldı, konsol
hatası yok. `npm test`: 561/561 geçti (createQuestion/evaluateAnswer/
generateChoices SAF fonksiyonlarına dokunulmadı, sadece `drawOverlay`
değişti — zaten test edilmiyordu, bkz. CLAUDE.md "ses/DOM davranışı kaynak
koddan doğrulanamaz").

---

Önceki commit (G37, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Kulaklık uyarısı
mekanizması: mod başına bayrak + prototipteki sheet'e bağlandı.** TASARIM.md'nin RESKIN
RAPORU'nun örnek (d)'sindeki "hâlâ AÇIK" maddesi kapatıldı. `kulaklikGerekli` alanı
mode-catalog.js'te (ve her modun KENDİ getMeta()'sında) ÖNCEDEN tanımlıydı ama G37'ye
kadar HİÇBİR YERDE okunmuyordu — bu turda gerçek bir uyarı akışına bağlandı.

**1. Mod başına bayrak — düzeltilen İKİ tutarsızlık:** Mekanizmayı kurarken KENDİ
alanlarının birbiriyle çelişkili olduğu ortaya çıktı — `frekans-bulma.js`'in getMeta()'sı
`true` diyordu (task'ın istediği `false`'un TERSİ — frekans/EQ algısı hoparlörde de net,
stereo/derinlik gerektirmiyor); `reverb.js`'in getMeta()'sı `false` diyordu (G35'te
Kompresör şablonundan kopyalanırken düzeltilmemiş kalmış — mode-catalog.js'teki reverb
girdisi ZATEN `true`'ydu, iki dosya birbiriyle ÇELİŞİYORDU). İkisi de DOĞRU değere
çekildi: Frekans Bulma `false`, Reverb `true`. Diğer beş mod (Kesim Noktası/dB/Boost-Cut/
Q/Kompresör) zaten doğru `false`'du — HİÇBİRİNE dokunulmadı. `kulaklikGerekli` HİÇBİR
YERDE okunmadığı için bu iki hata ÖNCEDEN etkisizdi (görünmüyordu) — G37'nin gerçek bir
akışa bağlaması sayesinde YAKALANDI.

**2. Sheet — `Dizayn /prototype.html`'in `#hpSheet`/`askHeadphones`/`hpConfirm`
üçlüsünün AYNI deseni:** 🎧 ikon + "Bu egzersiz kulaklık gerektirir" + açıklama + iki
buton ("Kulaklığım takılı, başla"/"Geri dön") + "Bu modda bir daha gösterme" onay kutusu
(`.cbrow`/`.cb`, prototipten birebir taşınan CSS). Mevcut `.sheet-overlay`/`.bottom-sheet`
altyapısı (lvlSheet'in AYNI deseni) yeniden kullanıldı — yeni bir sheet sistemi İCAT
EDİLMEDİ. Metin BİLEREK genel/basit tutuldu (spec: "mod bazlı metin ya da genel yeterli")
— prototipin "stereo bilgisi duyulmaz" ifadesi Reverb için YANLIŞ olurdu (reverb mono-
uyumlu bir efekt) — bunun yerine "derinlik/mekân hissi" dili kullanıldı. Gelecekteki bir
mod (`kulaklikMetni` alanını getMeta()'sına eklerse) kendi metnini geçersiz kılabilir —
mekanizma HAZIR, kod değişikliği GEREKMEZ.

**3. Tetikleme mantığı (TEK kontrol noktası, `renderModeGrid`'in click handler'ında):**
`meta.kulaklikGerekli && prefs.hpWarning && !prefs.hpSkip[entry.id]` — üçü de true/false
olmalı ki sheet AÇILSIN. Mod-özel "bir daha gösterme" (`prefs.hpSkip[modeId]`, YENİ bir
alan — `storage.freshPrefs()`'e eklendi) SADECE onay anında (checkbox'a tıklamanın
KENDİSİ değil, `hpConfirm`'ün prototipteki AYNI deseni) kaydediliyor — kullanıcı
işaretleyip "Geri dön" derse HİÇBİR kalıcı değişiklik olmuyor (canlı doğrulandı). Genel
`prefs.hpWarning` toggle'ı (ÖNCEDEN sadece Ana Menü'nün statik `.mobile-warn` metnini
kontrol ediyordu) artık AYNI ANDA bu sheet'i de kapatıyor — açıklama metni buna göre
güncellendi ("Ana menü notu + kulaklık gerektiren egzersizlerde açılan uyarıyı göster").
Mode-özel skip'in AKSİNE genel toggle her zaman ÖNCELİKLİ — kapalıyken hiçbir mod için
sheet açılmaz (canlı doğrulandı: skip haritası boşken bile toggle kapalıyken Reverb'e
girmek sheet'i AÇMADI).

**Mimari not (kod tekrarını önleme):** mod-kartı tıklama akışının "gerçekten oyuna gir"
kısmı (`enterMode(entry, realMode)`) ayrı bir fonksiyona çıkarıldı — hem doğrudan
tıklamanın hem de sheet onayının (`hpSheetConfirm`) PAYLAŞTIĞI TEK kod yolu, davranış
DEĞİŞMEDİ (aynen prototipin `hpConfirm()`'ünün `applyMode`+`go()`'yu çağırmasıyla AYNI
desen).

Doğrulama: `npm test` **561/561** DEĞİŞMEDEN geçti. Canlı tarayıcıda: Frekans Bulma'ya
girince sheet ÇIKMADI (doğrudan oyuna girdi); Reverb'e girince sheet ÇIKTI (🎧 ikonu +
doğru metin); "Geri dön" sheet'i kapatıp menüde bıraktı (mod GİRİLMEDİ); Reverb'e tekrar
girip "Bu modda bir daha gösterme" işaretlenip "Kulaklığım takılı, başla"ya basıldı —
oyuna girdi VE `localStorage`'da `prefs.hpSkip` `{"reverb":true}` olarak DOĞRULANDI
(mod-BAZLI, genel değil); menüye dönüp Reverb'e TEKRAR girince sheet ARTIK ÇIKMADI (skip
kalıcı çalışıyor); Ayarlar'dan "Kulaklık uyarısı" toggle'ı KAPATILIP skip haritası
TEMİZLENDİKTEN SONRA bile Reverb'e girmek sheet'i AÇMADI (genel toggle her zaman
önceliklidir); toggle geri AÇILIP Kompresör'e (Motor 2, ama `kulaklikGerekli:false`)
girildi — sheet YİNE ÇIKMADI (Motor 2 grubunun TAMAMI değil, SADECE bayrağı true olan
modlar tetikliyor). Sıfır konsol hatası tüm oturum boyunca.

Commit (G36, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Ana menü reskin:
prototipe yakınsa (seviye rozeti + kart seviye çip'leri + öneri kartı iki buton + renk
düzeltmesi).** TASARIM.md'nin bir önceki
turda ürettiği RESKIN RAPORU'nun önerdiği "1. adım"ın (merkezi görsel katman, sıfır
fonksiyonel risk) İLK somut uygulaması — SADECE görsel, mevcut veriyi göstermek, ses/
zorluk/mod dosyalarına DOKUNULMADI.

**1. Seviye rozeti (Ana Menü):** `Dizayn /prototype.html`'in `.lvl`/`.lvl-badge`
yapısı taşındı — altın rozet ("SV N") + "Kalibre Kulak" başlığı + XP ilerleme barı +
"Sonraki seviyeye X XP". Veri KAYNAĞI YENİ değil — İlerleme sekmesindeki `levelValue`/
`xpBar`/`progressText`'in kullandığı AYNI hesap (`progress.xpProgress(diffState().xp)`,
`updateUI()` içinde TEK bir yerden hem İlerleme'ye hem Menü'ye yazılıyor) — bu, iki
ekranın SAYISAL olarak asla birbirinden sapamayacağını garanti ediyor (canlı doğrulandı:
ikisi de "Seviye 3, 141/260 XP" gösterdi).

**2. Mod kartı seviye çip'i ("Sv N"):** Her oynanabilir kartın `.mode-top`'unda, Pro
rozetinden AYRI (yeni `.mode-chip-level`, nötr gri — Pro'nun amberiyle KARIŞMASIN diye)
bir çip — `progress.modeLevel(stats, entry.id)`, oyun-içi `#levelChip`'in AYNI kaynağı.
Prototipte kilit ikonuyla AYNI slotta (birbirini dışlıyorlardı); koda geçirirken
`.mode-top-right` adında yeni bir flex-wrap sarmalayıcı eklendi ki Pro+Sv AYNI kartta
yan yana durabilsin (dB Seviyesi'nde canlı doğrulandı). **BİLİNÇLİ karar:** çip SADECE
`playable` kartlarda gösteriliyor — kilitli bir modun "seviyesi"ni göstermek kafa
karıştırırdı, prototip de zaten kilitliyken çip yerine kilit ikonu gösteriyordu (AYNI
mantık, koda uyarlandı).

**3. "Bugünün Önerisi" kartı — iki buton:** Prototipteki `.row` (flex, `.btn.green`
flex:1 + `.btn.ghost` flex:none) deseni BİREBİR taşındı — "Seti başlat" (birincil) +
"Şimdi değil" (ikincil, X ile AYNI `daily.tipDismissed=true` kapatma mantığı — prototipte
de ikisi aynı davranış). **Ürün kararı (kullanıcıya soruldu, cevap alındı):** prototipteki
statik "· 8 soru" sayısı EKLENMEDİ — gerçek kodda "Seti başlat"a basınca girilen mod
Serbest (sınırsız) kalıyor, sınırlı bir "set" kavramı yok; sayı göstermek tutulmayan bir
söz verirdi (CLAUDE.md "Sayı uydurma"). Kullanıcı, sayı göstermeden sadece "Seti başlat"
yazılmasını (davranış AYNI kalsın) seçti. **Doğrulama sırasında bulunan gerçek bir
düzeltme:** kartın "Başla" butonu zaten (önceki bir M1-4 turunda) odak aralığını en
zayıf bölgeye kilitliyordu (`mode.FOCUS_RANGES`/`focusIdForZone`) — TASARIM.md'nin bu
satırdaki eski notu ("odak-aralığı özelliği kodda yok") STALE'di, bu turda kod
okumasıyla YAKALANIP düzeltildi (TASARIM.md'de ayrıca işaretlendi).

**4. Renk düzeltmesi:** `.mode-chip-pro`'nun `#f2c94c`'ı `var(--am)` (`#FFC246`) — TÜM
Pro rozetlerinin artık `.mode-chip`'in TEMEL amberiyle birebir aynı olduğu canlı
doğrulandı (Stereo Genişlik/Pan Konumu/dB Seviyesi/vb. hepsi aynı ton).

Doğrulama: `npm test` **561/561** DEĞİŞMEDEN geçti (görsel-only değişiklik, hiçbir test
etkilenmedi). Canlı tarayıcıda: seviye rozeti doğru veriyle render oluyor + İlerleme'yle
BİREBİR aynı sayılar; her oynanabilir kartta "Sv N" çip'i doğru (Frekans Bulma/Kesim
Noktası "Sv 1", Q/Boost-Cut "Sv 2", dB Seviyesi "Pro"+"Sv 1" YAN YANA); kilitli kartlarda
(Hız Modu/Stereo Genişlik/Pan Konumu) çip YOK, sadece kilit satırı; öneri kartı iki
butonlu, "Şimdi değil" X ile AYNI şekilde kartı kapatıyor; bir moda (Frekans Bulma)
girilip tam bir round oynandı — fonksiyon (ses/soru üretimi/puanlama) DEĞİŞMEDEN
çalıştı; sıfır konsol hatası tüm oturum boyunca.

Commit `e28be55` — G35: **Mod 7 "Reverb" — Motor 2'nin İKİNCİ modu (Kompresör
şablonundan türetildi).** (Not: commit mesajında yanlışlıkla "Mod 8"
yazıldı — kod/testler doğru, sadece commit mesajı metninde bir yazım hatası;
gerçek sıra Frekans Bulma/Kesim Noktası/dB/Boost-Cut/Q/Kompresör/**Reverb**
= 7.) Motor 2'nin ("A/B/C odd-one-out") ikinci oynanabilir modu — Kompresör'ün
G33'te olgunlaşan şablonunu MİRAS ALDI ve gerçek tekrar ağrısını netleştirdi.

**Mod mantığı:** 3 ses (A/B/C), aynı kaynak, ikisi AYNI reverb biri FARKLI.
Tek kontrol değişkeni `k∈[0,1]` decay+preDelay+size'ı BİRLİKTE sürüyor
(Kompresör'ün ratio+threshold'u sürmesinin AYNI deseni), `reverbAmountScore`
tek algısal eksen (GERÇEK bir akustik birim DEĞİL, tasarım sabiti —
Kompresör'ün `gainReductionDb`'siyle AYNI dürüstlük notu).

**KADEMELİ zorluk (Reverb'e özgü, Kompresör'de olmayan bir katman):**
kolay/orta/zor AYNI TİP (Room/Hall/Plate) içinde miktar farkı (kolay=
ekstrem ~%84 oransal fark, zorlukla ince nüansa iniyor), pro/proplus TİP
farkına geçiyor (`TYPE_SWAP_POSITION_THRESHOLD=18`, Otomatik modda da
çalışıyor). Öğretmen yöntemi: TİP farkı EN İNCE/zor katman — SoundGym
Reverb Wizard'ın forumda eleştirilen "türü öğretmiyor" zayıflığına karşı
bizim ayrıştırıcımız: cevap sonrası TİP HER ZAMAN adıyla söyleniyor.

**Zorluk eğrisi kalibrasyonu (Kompresör'ün BAŞTAN-doğru yöntemiyle, ikili
arama):**

| tier | repr.sv | kGap | statik | OK |
|---|---|---|---|---|
| easy | 4 | 0.3229 | 0.45 | ✓ |
| medium | 8 | 0.2074 | 0.28 | ✓ |
| hard | 12 | 0.1333 | 0.14 | ✓ |
| pro | 20 | 0.0550 | 0.06 | ✓ (type-swap'a geçtiği İÇİN fiilen kullanılmıyor) |

`K_GAP_FLOOR=0.05`'te (room tipinde) base'ten en az ~%7.6 oransal
`amountScore` farkı kalıyor (KULAKLA DOĞRULANMADI, ama sıfıra/algılanamaz
bir farka ASLA inmiyor — 2000 örnek/hard testinde ölçülen en küçük oransal
fark %5 üstünde kaldı).

**Sentetik IR (hazır dosya YOK, `generateImpulseResponse`):** preDelay
sessizliği + RT60 formülüyle (-60dB'ye `decaySec`'te iner) üstel sönümlü
beyaz gürültü + size'a bağlı bir "yoğunluk" çarpanı + tip-özgü tek-kutuplu
(one-pole) IIR alçak-geçiren filtre (`brightness`: Plate=0.85/az filtre/
parlak, Hall=0.4/çok filtre/donuk, Room=0.65/orta). Gerçek bir akustik
mekan ölçümü DEĞİL, algoritmik bir yaklaşıklık — testle doğrulandı (kuyruk
genel olarak azalan RMS eğiliminde, donuk/parlak IR'ler arasında ölçülebilir
pürüzlülük farkı var).

**MİMARİ — Motor 2 genelleştirmesi (G33'ün "2. modda netleşirse ortak bir
çekirdek çıkarılabilir" öngörüsünün GERÇEKLEŞTİĞİ an):** app.js'te
`THREE_WAY_MODE_IDS` listesi + `isThreeWayModule`/`isThreeWayQuestion`
yardımcıları TEK yerde tutuluyor — gelecekteki bir Motor 2 modu (Distortion)
SADECE bu listeye eklenir. `submitKompresorGuess`→`submitThreeWayGuess`,
`cycleKompresorPreview`→`cycleThreeWayPreview` (gövdeleri ZATEN tamamen
mode-agnostikti, SADECE değişken isimleri Kompresör'e özeldi — genelleştirme
davranış DEĞİŞTİRMEDİ). `kompresorGuessLetter`/`kompresorPlayLetter`→
`threeWayGuessLetter`/`threeWayPlayLetter` — TEK paylaşılan değişken (aynı
anda sadece BİR three-way mod aktif olabildiği için Kompresör'le Reverb
arasında güvenle paylaşılıyor, dbGuess/boostCutGuess gibi her modun KENDİ
değişkeni olduğu desenin BİLİNÇLİ istisnası). Kompresör'ün `drawOverlay`'i
de `state.guessLetter` okuyacak şekilde güncellendi (overlayState bag'in
per-mode-key geleneği KORUNARAK — sadece anahtar adı genelleşti). Motor
1'in beş modu (kendi submit fonksiyonları) BİLEREK dokunulmadı — o tekrar
ağrısı hâlâ netleşmedi (proje kararı, tekrarlanan bir desen).

**Kuru/ıslak karışımı — audio-engine.js'e HİÇ dokunmadan:** `applyProcessing`
`filters=[input, output]` döndürüyor — `buildQuestionChain`'in genel "seri
bağla" döngüsü OTOMATİK olarak kuru payı (`input.gain=1-wetMix`) taşırken,
`applyProcessing` İÇİNDE (dışarıdan görünmeden) kurulan
`input→convolver→wetGain→output` bağlantısı ıslak payı ekliyor —
`output` ikisini TOPLUYOR (GainNode'un varsayılan davranışı). Şık bir
çözüm: mevcut tek-parametreli "filters zinciri" sözleşmesi hiç
DEĞİŞTİRİLMEDEN paralel bir dry/wet mix elde edildi.

**Testler yazılırken bulunup AYNI turda düzeltilen gerçek bir hata:**
`isTypeSwapTier`'in hesaplanışı `level === "pro" || level === "proplus" ||
(curve && curve.position >= ESIK)` şeklindeydi — `curve` null olduğunda
(`difficultyPosition` verilmediğinde) `false || false || null` JavaScript'te
`null` döner, `false` DEĞİL — `q.typeSwap` alanı yanlışlıkla `null` oluyordu
(testle YAKALANDI: `assert.equal(q.typeSwap, false)` başarısız oldu, `!!(...)`
ile kısa-devrenin sonucu zorla boolean'a çevrilerek düzeltildi).

Doğrulama: 62 yeni Reverb testi (3 ses üretimi, odd-one-out, k-ekseni
monotonikliği, AYNI-tip/TİP-farkı kademe geçişi [Otomatik+Sabit], FLOOR,
previewLetter, IR üretimi, Kompresör'le çapraz-tutarlılık) — suite
**561/561** (499+62). Canlı tarayıcıda: mod menüden açılıyor (Reverb kartı
kilitsiz), A/B/C döngü otomatik başlıyor, doğru cevapta "İkisi de Room
(ince/hafif yankı) sesti, C daha uzun/derin (decay 0.7s) — mixte daha
geride durur" gibi metin + kırmızı/yeşil kuyruk zarfı, yanlış cevapta AYNI
kalitede karşılaştırmalı metin doğrulandı, sıfır konsol hatası. Kompresör'de
TAM regresyon: envelope/teaching-text/loop-otomatik-başlama/Durdur-döngü-
durdurma HEPSİ değişmeden çalışıyor (DOM enstrümantasyonuyla ölçüldü: döngü
A→B ilerliyor, Durdur'a basınca anında duruyor, 2.2sn sonra bile harf
sabit). Frekans Bulma + Q Genişliği'nde de tam tur (round+cevap+geri
bildirim) regresyon yok. Tip-farkı (pro) katmanı canlı UI'da elle
zorlanamadı (Seviye bilgi sayfası zorluk seçici değil, renderLevelSheet
açıyor — bilinen ÖNCEDEN kayıtlı kısıt) ama 62 testin ~8'i bunu doğrudan
ve N=100-200 örnekle istatistiksel olarak doğruluyor.

Commit `754d875` — G34: **Cevap sonrası görsellerde "senin cevabın" rengi
amber yerine kırmızı — merkezileştirildi.** Kesim Noktası eğrisi/dB
göstergesi/Boost-Cut bell/Q genişlik/Kompresör dinamik zarfının HEPSİNDE
"senin cevabın = amber (#FFC246), doğru = yeşil (#2BD9A8)" ikilisi vardı —
standart doğru/yanlış renk mantığına (kırmızı=yanlış, yeşil=doğru) uymuyordu,
ayrıca zaten `.ans.wrong` CSS class'ının (styles.css: `var(--rd)`)
kullandığı "yanlış şık" kırmızısıyla TUTARSIZDI.

**Merkezileştirme:** renk ikilisi beş mod dosyasında AYRI AYRI (kopyala-
yapıştır) tanımlıydı, merkezi bir kaynak YOKTU — bu görevin kendisi (5
dosyada AYNI ANDA değişmesi gereken bir renk) gerçek bir tekrar ağrısı
olduğunu kanıtladığı için yeni bir paylaşılan modül
(`core/feedback-colors.js`: `GUESS_COLOR`/`CORRECT_COLOR`) çıkarıldı — beş
mod dosyası da (`kesim-noktasi.js`/`db-seviyesi.js`/`boost-mu-cut-mu.js`/
`q-genisligi.js`/`kompresor.js`) artık BURADAN import ediyor, kendi local
sabitlerini kaldırdı. `GUESS_COLOR="#FF4D6D"` (styles.css'in `--rd`'si),
`CORRECT_COLOR="#2BD9A8"` (`--gr`, DEĞİŞMEDİ).

**BİLEREK dokunulmayan:** Frekans Bulma'nın `closenessColor`'ı (üç kademeli
yakınlık gradyanı: yeşil/amber/kırmızı, tıklanan noktanın doğru cevaba ne
kadar yakın olduğunu gösterir) TAMAMEN farklı bir görsel dil — "senin
cevabın vs doğru" iki-renkli karşılaştırma DEĞİL, bu görevin kapsamı
dışında bırakıldı.

Doğrulama: 5 dosyada da `GUESS_COLOR`/`CORRECT_COLOR` artık import edilen
AYNI sabitler (grep ile hardcoded `"#FFC246"` kalmadığı doğrulandı). Canlı
tarayıcıda Kesim Noktası ve Kompresör'de test edildi — legend ("● Senin
cevabın ● Doğru") ve eğri/zarf renkleri ikisinde de kırmızı/yeşil, sıfır
konsol hatası. `npm test`: **499/499** DEĞİŞMEDEN geçti (renk değişikliği
testleri etkilemiyor, hiçbir test rengi assert etmiyordu).

Commit `baf7761` — G33: **Kompresör mimarisini TAM oturt (Motor 2 şablonu) —
ratio+threshold birlikte, geçiş fade'i, öğretim.** Derin araştırma (SoundGym
Dr. Compressor + öğretmen içgörüleri) ışığında G30'un yarı-gerçekçi (SADECE
ratio değişiyordu) tasarımı tamamlandı — bu dosya artık Motor 2'nin GERÇEK
şablonu.

**1. RATIO + THRESHOLD BİRLİKTE (gerçekçi kompresyon):** Tek bir
"kompresyon yoğunluğu" kontrol değişkeni (`k ∈ [0,1]`) eklendi — k arttıkça
`ratioAtK` YÜKSELİR (1.3→14) VE `thresholdAtK` DÜŞER (-8→-34 dB) BİRLİKTE,
ikisi tek bir algısal eksene (`gainReductionDb` — statik kompresör transfer
eğrisi yaklaşıklığı: `(refLevel-threshold)*(1-1/ratio)`) indirgeniyor.
Attack/release (ve knee) HİÇBİR zorlukta değişmiyor — araştırma dersi: hız
değişirse "hangisi daha sıkışmış" sorusunun net cevabı kalmıyor (yavaş
attack'lı ses daha AZ sıkışmış DUYULUR ama daha ÇOK sıkışmıştır).
`COMP_BASE_K=0.5` (aralığın TAM ortası) — FARKLI olan varyant simetrik iki
yöne (daha çok/az sıkışmış) uzaklaşıyor, hiçbir zorlukta clamp'e çarpmıyor
(G30'un merkezi-olmayan `COMP_BASE_RATIO=3.5` tasarımının aksine — testle
doğrulandı, up/down ortalamaları %10'dan az sapıyor).

**Zorluk eğrisi (öğretmen yöntemi — kolay=ekstrem, zorlukla ince nüansa
in):** ikili aramayla İKİ koşul BİRLİKTE doğrulandı:

| tier | repr.sv | kGap | GR farkı (~) |
|---|---|---|---|
| easy | 4 | 0.3256 (statik 0.45) | ~11.5dB — EKSTREM/bariz |
| medium | 8 | 0.2115 (statik 0.30) | ~7.7dB |
| hard | 12 | 0.1374 (statik 0.15) | ~3.9dB |
| pro | 20 | 0.0580 (statik 0.06) | ~1.5dB — ince/subtle |

`K_GAP_FLOOR=0.046`'da bile GR farkı hesapla (node ile) doğrulandı: >=1.2dB
(kulağın ayırt edebileceği varsayılan bir alt sınır — KULAKLA
DOĞRULANMADI, ama sıfıra/algılanamaz bir farka ASLA inmiyor; 2000 örnek/pro
testinde ölçülen en küçük fark 0.8dB üstünde kaldı).

**2. GEÇİŞ FADE'İ (kesiklik düzeltmesi, koddan KANITLANDI):**
`audio-engine.js:stopAudio()`'nun eski zincir söndürme zaman sabiti (0.03)
`node.stop()`'un sabit gecikmesine (0.08sn) göre GEVŞEKTİ —
`setTargetAtTime` asimptotik olduğu için `.stop()` ateşlendiğinde gain hâlâ
~%7 seviyesindeydi (e^(-80/30)≈0.070), sonra SERT kesiliyordu. Diğer beş
modda bu SEYREK tetiklenir (tur başına bir kez) ama Kompresör'ün A/B/C
döngüsü `buildQuestionChain`'i (ve dolayısıyla `stopAudio`'yu) her ~2sn'de
bir YENİDEN çağırıyor — aynı gevşek söndürme Kompresör'de ÇOK daha sık
duyuluyordu ("ses/kaynak değişince kesiklik" — kullanıcı raporu). Zaman
sabiti sıkılaştırıldı (`STOP_RAMP_TIME_CONSTANT`, 0.03→0.012, `.stop()`
zamanlaması DEĞİŞMEDİ) — artık gain `.stop()` ateşlendiğinde ~%0.1'e inmiş
oluyor (e^(-80/12)≈0.0013). Paylaşılan fonksiyon ama davranış SADECE daha
sıkı — hiçbir modun round geçiş SÜRESİ değişmedi, sadece söndürme EĞRİSİ.
KULAKLA/CİHAZDA DOĞRULANMADI (bu ortamda ses duyulamıyor, CLAUDE.md
"tahminle düzeltme yapma" notu gereği bu açıkça işaretleniyor) — ama kök
sebep Web Audio API semantiğinden MATEMATİKSEL olarak kanıtlanabilir, tahmin
değil.

**3. CEVAP SONRASI ÖĞRETİM (mix dili, gerçekçi):** `teachingText` artık
ratio+threshold+gainReductionDb'yi BİRLİKTE açıklıyor. İki varyant AYNI
kompresyon kademesindeyse (`COMPRESSION_TIERS`'ın aynı aralığı — ince
nüans) "İkisi de X sıkıştırılmıştı, B daha ağır — mixte daha geride/oturmuş
durur" dili; FARKLI kademedeyse net "B farklıydı (ratio X:1, eşik Y dB) —
ağır/hafif kompresyon" dili (canlı doğrulandı: "A farklıydı (ratio 10.8:1,
eşik -27 dB) — ağır kompresyon — dinamik ÇOK dar..."). Şablonlar TEK yerde
(`COMPRESSION_TIERS`).

**4. KAYNAK ÖNCELİĞİ:** tüm kaynaklar AÇIK kalıyor (varsayılan kaynak
değişikliği bir ürün kararı — CLAUDE.md "Ürün kararı verme" — BİLİNÇLİ
yapılmadı), dosya başına kompresyonun transient kaynakta (davul/perküsyon/
groove) çok daha net duyulduğu, ince kompresyonun vokal/string'de zor
duyulduğu NOT edildi.

**MOTOR 2 ŞABLON NİTELİĞİ:** `previewRatio` (tek-parametreli, G30'un
tasarımı) yerine `previewLetter` (parametre-agnostik) geçti —
`applyProcessing` artık HANGİ harfin TÜM parametrelerini okuyacağını
`previewLetter`'dan öğreniyor, kaç parametre olursa olsun (reverb:
decay+mix+size gibi) AYNI mekanizma çalışır — yeni bir "previewX" alanı
GEREKMEZ. Dosya başına "MOTOR 2 ŞABLONU" bölümü eklendi — tek algısal eksen
(k) + previewLetter + tek-yerde öğretim şablonları (COMPRESSION_TIERS)
deseni gelecekteki modlar (Reverb/Distortion/Tonal Denge) için AÇIKÇA
belgelendi; app.js'in `activeQuestion.mode === "kompresor"` dallarının
genelleştirilmesi (2. Motor 2 modu geldiğinde) SIRADAKİ'ye not edildi.

Doğrulama: `gainReductionDb`'nin k'de MONOTON arttığı + ratio/threshold'un
AYNI ANDA değiştiği (biri değişip diğeri sabit kalamaz — testle doğrulandı)
+ K_GAP_FLOOR'da GR farkının hesapla doğrulandığı + easy ortalama GR
farkının >=6dB, pro'nun <3dB olduğu (N=200/tier, öğretmen yöntemi
doğrulandı) için 11 yeni test. Toplam 46→57 Kompresör testi, suite
488→**499**, hepsi geçti. Canlı tarayıcıda: yeni teaching text formatı
doğrulandı, G31/G32'nin toggle/döngü/Durdur davranışı DEĞİŞMEDEN çalışıyor
(ilk render A/B/C, otomatik döngü, Durdur döngüyü durduruyor — hiçbiri
regresyona uğramadı), Frekans Bulma + Q Genişliği (stopAudio zaman sabiti
değişikliği paylaşılan bir dosyayı etkilediği için ÖZELLİKLE test edildi)
tam tur (round başlat + cevap ver + geri bildirim) sıfır konsol hatasıyla
çalıştı.

Commit `9783adb` — G32: **Kompresör'de yeni soruda A/B/C döngüsü otomatik
başlasın.** Kullanıcı raporu: yeni soru gelince ses otomatik başlıyordu
(`playQuestion`'ın varsayılanı, `variants[0]`/A) ama döngü kapalı kalıyordu
— kullanıcı A'yı bir kez dinleyip B/C'ye HİÇ geçmiyordu, döngüyü elle
(uzun basma) açması gerekiyordu; istenen, kullanıcı hiçbir şey yapmadan
A→B→C otomatik ilerlemesiydi.

`startRound()`'a (tüm modların ORTAK tek round-başlatma noktası)
Kompresör'e özgü TEK satırlık bir dal eklendi: `playQuestion(true)`'dan
hemen sonra `mode.MODE_ID === "kompresor"` ise `startAbLoop()` çağrılıyor.
Diğer beş moda dokunulmadı — onlarda A/B tek bir dry/wet karşılaştırması,
döngü hâlâ isteğe bağlı bir kısayol; Kompresör'de ise A/B/C karşılaştırması
modun ÖZÜ (odd-one-out ancak üçünü de dinleyince bulunabilir), döngünün
otomatik olması gerekiyordu. G31'in Durdur/cevap-sonrası döngü durdurma
mekanizması (`setActionbarTucked`/`pauseRound`) değişmeden çalışıyor — bu
görev SADECE döngünün ne zaman BAŞLADIĞINI değiştirdi, ne zaman
DURDUĞUNU değil.

Doğrulama (canlı tarayıcıda, DOM state örneklemesiyle — 1sn aralıklarla
12sn boyunca `roundChip`/`abToggle.dataset.ab`/`.loop` class izlendi): tek
bir round içinde (roundChip SABİT "Soru 1101") harf A→B→C→A→B döngüsü
kullanıcı hiçbir tıklama yapmadan otomatik ilerledi, `.loop` class baştan
itibaren `true`. Frekans Bulma'da (regresyon) aynı senaryo (round başlat +
3.5sn bekle) `.loop:false` kaldı — değişiklik Kompresör'e izole, diğer beş
modun A/B'si hâlâ isteğe bağlı. `npm test`: **488/488** DEĞİŞMEDEN geçti
(davranış değişikliği DOM/round-başlatma katmanında, pure-function
testlerini etkilemiyor). Sıfır konsol hatası.

Commit `69c0259` — G31: **Kompresör'de cihazda bulunan ÜÇ hata — toggle ilk
render, geri bildirim sırasında ses, Durdur döngüyü durdurmuyor.** Üçü de
TEK bir kök sebebe iniyor: G30'da eklenen A/B/C döngü mekanizması
(`cycleKompresorPreview`/`abLoopTimer`) mevcut pause/geri-bildirim akışına
DOĞRU bağlanmamıştı — Motor 2'nin ilk modu olarak yeni bir davranış (üç
yönlü döngü) ekleyip onu paylaşılan sistemin gerektirdiği TÜM çıkış
noktalarına (round bitişi, Durdur) bağlamayı unutmuştu.

**1. Toggle ilk render'da yanlış (kod okumasıyla KANITLANDI):**
`updateAbToggleUI()`'nin `isKompresor` kontrolü `activeQuestion.mode`'a
bakıyordu — ama "Oyunu Başlat"a basılana kadar `activeQuestion` NULL
(G17'nin mod-değiştirme bloğu sıfırlıyor) — mod GERÇEKTEN Kompresör olsa
bile ilk ekranda HER ZAMAN "A/B Test" (yanlış) gösteriyordu (canlı ekran
görüntüsüyle YAKALANDI). Düzeltme: kontrol artık `activeQuestion` yerine
SEÇİLİ MOD MODÜLÜNE (`mode.MODE_ID`) bakıyor — altı modun ALTISI da
`MODE_ID` export ediyor (kod incelemesiyle doğrulandı), bu yüzden genel/
güvenli bir düzeltme; ilk render dahil her zaman doğru.

**2 + 3. Geri bildirim açıkken ses başlıyordu / Durdur döngüyü
durdurmuyordu (AYNI kök sebep, koddan KANITLANDI):** `abLoopTimer`
(`setInterval(toggleAB, 2000)`) hiçbir round-bitişi ya da Durdur
noktasında TEMİZLENMİYORDU. Diğer beş modda bu ZARARSIZDI çünkü
`toggleAB()` onlarda sadece `audioEngine.setProcessed()` çağırıyor —
`stopAudio()` sonrası `dryGain`/`wetGain` null olunca bu fonksiyon
SESSİZCE no-op oluyor (`audio-engine.js:361`: `if (!audioCtx || !dryGain
|| !wetGain) return;`). Kompresör'de ise HER döngü tetiklemesi
`buildQuestionChain()`'i YENİDEN çağırıyor — bu (a) sesi baştan
başlatıyor (roundActive'e/geri bildirim durumuna hiç bakmadan) VE (b)
"güvenlik" amaçlı `muteGain`'i 1'e geri açıyor (bkz. `audio-engine.js`
`buildQuestionChain`'in başındaki yorum: "bir önceki durum [Durdur]
muteGain'i 0'da bırakmış olabilir") — Durdur'un uyguladığı mute, bir
sonraki döngü tetiklemesinde SESSİZCE iptal ediliyordu.

**Düzeltme — yeni bir paralel sistem KURMADAN, döngüyü mevcut iki ortak
noktaya bağladı:**
- `setActionbarTucked(tucked=true)` — her modun HER cevap-sonrası/süre-
  dolumu yolunun (onTimeUp + altı submit*Guess fonksiyonu) ÇAĞIRDIĞI TEK
  ortak nokta (grep ile doğrulandı, 9 çağrı yeri) — artık `abLoopTimer`
  varsa `stopAbLoop()` çağırıyor. Diğer beş modda davranış DEĞİŞMİYOR
  (loop zaten sesli bir etkisi olmayan bir zamanlayıcıydı, şimdi sadece
  GERÇEKTEN temizleniyor), Kompresör'de artık geri bildirim kartı sesle
  ÇAKIŞMIYOR.
- `pauseRound()` (Durdur) — `setActionbarTucked`'ı HİÇ çağırmadığı için
  (çubuk görünür kalmalı, "Tekrar Çal" basılabilsin diye) yukarıdaki
  merkezi nokta buraya ulaşmıyordu — AYRICA kendi `stopAbLoop()` çağrısı
  eklendi.

**Doğrulama (canlı tarayıcıda, DOM state + zamanlanmış JS enstrümantasyonuyla
— ekran görüntüsü değil, senkron/atomik state okumaları):**
- Toggle: mod kartına tıklanır tıklanmaz (Oyunu Başlat'tan ÖNCE) "A/B/C
  Test" + üç pill görünüyor (ekran görüntüsüyle doğrulandı).
- Döngü+Durdur: `pointerdown` (700ms) → `abLoopTimer` başladı (harf A,
  `loop` class var, başlık "Döngü") → 2.3sn sonra harf B'ye ilerledi
  (döngü GERÇEKTEN tetikleniyor) → Durdur'a basılınca ANINDA `loop:false`,
  başlık "A/B Test"e döndü, `startBtn` "🔄 Tekrar Çal" oldu → 2.3sn DAHA
  beklenince harf HÂLÂ B'de sabit (önceden sonsuz ilerlerdi) — döngü
  GERÇEKTEN durdu, sadece gizlenmedi.
- Döngü+cevap: aynı döngü çalışırken bir cevap gönderildi → ANINDA
  `loop:false`, `feedbackShown:true`, `actionbarTucked:true` → 2.3sn geri
  bildirim kartı AÇIK kalırken harf/döngü SESSİZ kaldı (önceden bu sırada
  yeni ses duyulabiliyordu).
- AYNI enstrümantasyon Frekans Bulma'da (beş modun temsilcisi) da
  çalıştırıldı — loop/Durdur davranışı ÖNCEDEN OLDUĞU GİBİ (A/B tek
  başına ilerliyor, Durdur'da donuyor, davranış hiç değişmedi).
- `npm test`: **488/488** DEĞİŞMEDEN geçti (düzeltme DOM/zamanlayıcı
  katmanında, pure-function testlerini etkilemiyor, yeni test gerekmedi).
- 2 mod canlı regresyon: Frekans Bulma (tam tur + loop/Durdur + normal
  cevap akışı) ve Q Genişliği (tam tur, 4 şık, zengin geri bildirim) sıfır
  konsol hatasıyla çalıştı.

Commit `464ce8e` — G30: **Mod 6 "Kompresör" — Motor 2'nin İLK modu (3 ses,
hangisi farklı), ŞABLON.** İlk beş mod Motor 1'di ("değeri bul" — tek bir
sayısal/etiket değeri tahmin ediliyordu); bu, Motor 2'nin ("hangisi farklı"
— A/B/C üç ses, ikisi aynı biri farklı, %33 şans) İLK oynanabilir modu.
Gelecekteki Motor 2 modları (reverb, tonal denge) için mimari şablon niyetiyle
yazıldı, ama AYNI merkezi zorluk eğrisi + geri bildirim akışı + mod sözleşmesi
altyapısını yeni bir "müşteri" olarak kullanıyor.

**Mod mantığı:** kaynağa `DynamicsCompressorNode` ile üç varyant uygulanıyor
— attack/release SABİT kısa (SoundGym Dr. Compressor deseni), sadece ratio
zorlukla değişiyor. İkisi `COMP_BASE_RATIO` (3.5), biri (`oddIndex`, rastgele
konumda) `pickGap`'in ürettiği gap kadar uzakta (`pickOddRatio`, RATIO_MIN–
RATIO_MAX=[1,20] dışına asla taşmıyor, kırpma her zaman DAHA KOLAY yöne
düşüyor — Boost mu Cut mu'nun G25'teki AYNI ilkesi). Mevcut TEK A/B butonu
`cycleKompresorPreview`'la A→B→C→A üç yönlü döngüye genişletildi —
`audio-engine.js`'in dry/wet crossfade çekirdeği (`setProcessed`) HİÇ
değiştirilmedi, bunun yerine post-answer karşılaştırma butonlarıyla (Senin
cevabın/Doğru cevap/Temiz) AYNI teknik (geçici `buildQuestionChain` kopyası,
`activeQuestion` mutasyona uğramadan) yeniden kullanıldı.

**Merkezi zorluk eğrisine bağlanma — BAŞTAN doğru kalibre edilen mod:**
`COMP_CURVE_CONFIG`'in `GAP_AT_CAP`'i ikili aramayla, hiçbir temsilci
seviyede eski statiği aşmayacak şekilde ÖNCEDEN çözüldü (dB Seviyesi/Boost-
Cut/Q Genişliği'nin AYNI "önce bağla sonra düzelt" döngüsünden kaçınma
dersi burada da uygulandı):

| tier | repr.sv | gap | timeSec |
|---|---|---|---|
| easy | 4 | 3.82 | 14.61 |
| medium | 8 | 2.35 | 12.94 |
| hard | 12 | 1.45 | 11.47 |
| pro | 20 | 0.55 | 9.00 |

`GAP_FLOOR=0.4` — LEVEL_CAP'in ötesinde (seans rampası/boss) bile asla
altına inmiyor (node ile doğrudan hesaplanıp ölçüldü: level 25→0.50,
30→0.45, 40→0.40, 60→0.40 — tabana kilitleniyor, tahmin değil).
`pickGap`'te jitter (±%6) SONRASI `Math.max(GAP_FLOOR, ...)` — floor'un
jitter'la delinmesi dB Seviyesi'nde G24'te YAŞANAN bir hataydı, burada
baştan önlendi.

**Cevap sonrası öğretim:** `teachingText` — farklı olanın harfi + ratio
değeri + Türkçe mix anlamı ("Ağır kompresyon dinamiği daraltır — ses mixte
oturur..." / "Az kompresyon daha dinamik ama kontrolsüz..."), TEK yerde
şablon (dB Seviyesi/Boost-Cut'ın AYNI felsefesi). Görsel: `drawEnvelope` —
ratio'dan türetilen sentetik bir dinamik-zarf eğrisi (gerçek `audioCtx`
GEREKMİYOR, önceki beş modun HEPSİNİN aksine — `BiquadFilterNode.
getFrequencyResponse()`'a değil salt ratio sayısına bağlı, bu altı mod
arasında mimari bir ilk), amber=seçim/yeşil=doğru, soru sırasında BİLEREK
gizli (`roundActive` kontrolü — kulakla bulma ilkesi).

**Canlı tarayıcı testinde bulunup AYNI turda düzeltilen gerçek bir hata:**
`app.js:1108-1132`'deki mod-değiştirme bloğu (bir karttan diğerine geçince
önceki modun başlığını/şıklarını/`#freqInfo`'sunu sıfırlayan, G-öncesi
kurulu bir mekanizma) A/B toggle'ın bu turda EKLENEN `.three-way` CSS
class'ını sıfırlamıyordu — Kompresör'den başka bir moda (ör. Frekans Bulma)
geçilince "Oyunu Başlat"a basılana kadar ekranda YANLIŞLIKLA "A/B/C Test" +
C pill'i görünüyordu (canlı ekran görüntüsüyle YAKALANDI, tahmin değil).
`updateAbToggleUI()` çağrısı o bloğa eklenerek düzeltildi — sonrasında
canlı yeniden test edildi, sızıntı kalmadı.

**Mode contract:** `getMeta`/`createQuestion` (saf)/`applyProcessing`/
`evaluateAnswer` (saf)/`calculateXP`/`getFeedbackData` + `registerMode` +
`mode-catalog.js`'de ÖNCEDEN kayıtlı `kompresor` girdisi (`unlockLevel:12`,
`tier:"pro"`) artık `playable:true` (diğer alanlara dokunulmadı — ürün
kararı değil). Zorunlu re-export seti (`FA_MIN`/`FA_MAX`/... — app.js'in
`drawVisualizer`'ının HANGİ mod aktif olursa olsun okuduğu, Kompresör'ün
frekans ekseni kavramı OLMAMASINA rağmen) korundu.

Doğrulama (canlı tarayıcıda, Geliştirici: tam erişim ile):
1. Mod menüden açılıyor, "Kompresör" kartı kilitsiz/oynanabilir (Motor 2
   grubunda, "Hangisi Farklı"/Reverb/Distortion'ın AKSİNE kilit rozeti yok).
2. "Oyunu Başlat" → başlık "Üç ses (A/B/C) — hangisi FARKLI sıkıştırılmış?",
   A/B/C Test üç yönlü toggle çalışıyor (A→B→C→A döngü, spektrum etiketi
   "A/B/C DİNLENİYOR" doğru güncelleniyor), üçü de AYNI kaynak (Pink Noise)
   — sadece kompresyon farklı, izolasyon ilkesi kodda garanti (`pickOddRatio`
   sadece `ratio`'yu değiştiriyor, source/freq/gain'e dokunmuyor).
3. Odd-one-out rastgele konumda doğru üretiliyor — canlı iki turda C
   (ratio 1.0:1) ve B (ratio 6.0:1) farklı çıktı, ikisinde de doğru
   işaretlendi (yeşil border).
4. Zorlukla fark küçülüyor (yukarıdaki tablo, node ile doğrudan hesaplandı),
   FLOOR (0.4) altına asla inmiyor (level 40+'ta ölçüldü).
5. Cevap sonrası: doğru turda "Doğru! C farklıydı (ratio 1.0:1) — hafif
   kompresyon — dinamik geniş kalır..." (+30 XP), yanlış turda "Yanlış —
   sen A dedin. B farklıydı (ratio 6.0:1) — belirgin kompresyon..." — ikisi
   de ratio+mix anlamını içeriyor; görsel iki renkli zarf (amber/yeşil)
   doğru turda tek renk (seçim=doğru çakışıyor), yanlış turda iki AYRI
   renkli eğri olarak doğrulandı (ekran görüntüsüyle KANITLANDI).
6. Merkezi X/Atla akışı (G27) HİÇBİR ek kablolama gerekmeden otomatik geldi
   — X'e basınca feedback kapanıp yeni tur başladı, canlı doğrulandı.
7. `npm test`: 46 yeni Kompresör testi (3 ses üretimi, oddIndex işaretleme,
   gap daralması, floor garantisi, evaluateAnswer) + mevcut 442 test
   DEĞİŞMEDEN geçti — **488/488**.
8. 5 mod regresyon (bu tur `app.js`/`index.html`/`styles.css` PAYLAŞILAN
   dosyaları değiştirdiği için özellikle önemliydi): Frekans Bulma'da tam
   bir tur (doğru cevap, spektrum overlay, karşılaştırma butonları, X)
   sıfır hatayla çalıştı; Q Genişliği menüden açılıp round başlatıldı,
   4 şıklı grid doğru render edildi; her iki modda da A/B toggle DOĞRU
   şekilde ikili kaldı (yukarıdaki bug'ın düzeltmesi bu ikisinde de
   doğrulandı); konsol hatası TÜM oturum boyunca SIFIR.

Commit `bd47c8b` — G29: **Q Genişliği — derinlemesine denetim ve FELSEFE düzeltmesi
(yüzeysel yama YOK).** G28'in font-küçültme yaması gerçek sorunu çözmemişti;
bu tur modu BAŞTAN SONA denetleyip TERSİNE ÇEVİRDİ.

**1. ŞIK SAYISI — TERSİNE ÇEVRİLDİ:** G26'da kolay zorlukta havuz "en uzak
iki uç" mantığıyla 2'ye düşüyordu (Notch/Dar/Geniş çekirdek üçlüsünden BİRİNİ
atlayarak), G28 bunu sadece BAŞLIĞI gerçek şıklara uydurarak "çözmüştü" —
ama modun FELSEFESİ ("cerrahi mi müzikal mi EQ" → Notch/Dar/Geniş) hâlâ
ihlal ediliyordu. Bu tur `poolForSize`/`INTRODUCTION_ORDER` ile TAMAMEN
yeniden kuruldu: **çekirdek üçlü (Notch/Dar/Geniş) HER ZAMAN havuzda, kolay
dahil, ASLA 2'ye inmiyor.** Orta zor'da, Çok Geniş pro'da SONRADAN ekleniyor
— önce 3 kategori ustalaşılır, sonra nüans öğretilir. `pickDistractorIndices`/
`preferredDistanceForOptions` (artık gereksiz — çeldirici SEÇİMİ yok, havuzun
TAMAMI şık oluyor) kaldırıldı, kod basitleşti.

**2. EKRAN KAYMASI — GERÇEK KÖK SEBEP bulundu (375px'te ÖLÇÜLDÜ, tahmin
DEĞİL):** `.app-shell` genişliğini zorlayan bir simülasyon TEK BAŞINA yanıltıcı
çıktı verdi (`.actionbar`'ın KENDİ `width:min(560px,100%)` kuralı GERÇEK
[1728px] pencereye göre hesaplanıp app-shell'den taşıyordu) — ikisi de aynı
şekilde zorlanınca (gerçek cihazda ikisi zaten AYNI temelden hesaplanır)
GERÇEK ölçüm ortaya çıktı: Boost mu Cut mu'nun KENDİ en kötü durumu (6 şık,
tek satır başlık) `.game-scroll`'da 47px taşma+otomatik-kaydırma üretiyor —
BU ZATEN VARDI, Q'ya özgü değil, sistem genelinde paylaşılan (ve zaten
`scrollFeedbackIntoView`'la doğru YÖNETİLEN) bir davranış. Ama Q'nun 5-etiketli
turu (G28'in dinamik başlığı TÜM etiketleri tek cümlede sayıyordu, 3 satıra
sarıyordu) taşmayı 63px'e çıkarıyordu — Boost/Cut'ın KENDİ en kötüsünden
BELİRGİN fazla, kullanıcının "ekran yukarı kayıyor" tarifiyle örtüşen
ÖLÇÜLEBİLİR fark. Kök neden TEK: başlık boyu. Çözüm: `TITLE_ENUMERATION_LIMIT`
— ≤3 şıkta (modun çekirdek/en sık karşılaşılan katmanı) etiketler sayılmaya
devam ediyor, >3 şıkta (zor/pro) kısa/sabit bir cümleye düşüyor ("Aşağıdaki
şıklardan seç.") — bu seviyedeki oyuncu etiketleri zaten biliyor. Sonuç:
375px'te ÖLÇÜLEN taşma 63px→42px (Boost/Cut'ın kendi en kötüsünden [47px]
DAHA AZ).

**3. Denetimde bulunan ÜÇÜNCÜ bir gerçek hata (kalibrasyon):** Yeni statik
tabloyla (`hard.options=4`) birlikte ilk seçilen `OPTIONS_AT_CAP` (6.7)
yeniden hesaplandığında hard'ın TEMSİLCİ seviyesi (12) BİLE ZATEN 5'e
yuvarlanıyordu (4'e değil) — Sabit moddaki "zor" tier PRATİKTE hiçbir zaman
4 göstermiyordu, temsilci seviyede bile 5'ti (sadece "eski statikten kolay
değil" testi `>=4` kontrol ettiği için bu FARK EDİLMEDİ). `OPTIONS_AT_CAP`
6.0'a düşürülerek düzeltildi — artık hard'ın TEMSİLCİ seviyesi TAM 4,
seans rampasının üst ucunda (boss/geç-döngü) DOĞAL olarak 5'e çıkabiliyor
(canlı ölçüldü: 10 ardışık "zor" turda `[4,4,5,5,5,4,4,5,5,5]` — spec'in
"4-5'e çıkar" ifadesiyle BİREBİR tutarlı, ama artık 4 GERÇEKTEN ulaşılabilir
bir değer). Yeni bir regresyon testi bu kalibrasyonu kilitliyor.

**Denetim sonuçları (madde madde, hepsi CANLI/testle doğrulandı):**
- Başlık-şık tutarlılığı: ≤3 şıkta HER ZAMAN birebir eşleşiyor (8 ardışık
  tur + 30 örnek/zorluk testle), >3 şıkta artık uzun liste YOK.
- 3-5 kademe: kolay/orta HER ZAMAN TAM {Notch,Dar,Geniş} (200 örnek/zorlukta
  ASLA 3'ün altına inmedi), zor 4 ile 5 arası, pro/proplus HER ZAMAN 5 —
  doğru cevap HER ZAMAN o turun havuzunda, çakışma/tekrar YOK (testle).
- İzole Q: kolay/orta'da frekans HER ZAMAN 1 kHz (DEĞİŞMEDİ, bu tur
  dokunulmadı), `ISOLATE_UNTIL_POSITION`'ı geçince serbest — çalışıyor.
- Öğretici metin: Q+frekans+yön+mix HER kombinasyonda doğru, boş/bozuk metin
  yok (mix dili "cerrahi"/"müzikal" felsefeyle tutarlı, DEĞİŞMEDİ).
- İki renkli görsel (`drawOverlay`/`computeEqCurveDb`): bu tur HİÇ
  değiştirilmedi (koddan doğrulandı, diff'te yok) — G28'de zaten canlı
  kanıtlanmıştı (Notch dar-sivri/Çok Geniş geniş-yayvan kontrastı).
- Merkezi eğri: FLOOR (0.05) çalışıyor, boss/pro en zor (temsilci seviye
  LEVEL_CAP'e eşit), "kolaylaşma yok" invaryantı YENİ statik tabloyla testle
  yeniden doğrulandı.
- X/Atla + hizalı geçiş: G27'nin merkezi mekanizması bu moddan HİÇ
  etkilenmedi (canlı doğrulandı — basınca hemen geçiyor, box gizleniyor).
- Layout 375px: kolay (3 şık) SIFIR taşma; pro (5 şık, en uzun durum) 42px
  taşma+otomatik-kaydırma — Boost/Cut'ın kendi en kötüsünden (47px) AZ,
  hiçbir yerde kesilme/çakışma yok (canlı ölçüldü + ekran görüntüsüyle
  doğrulandı).
- Konsol hatası: SIFIR (tüm oturum boyunca, her zorlukta).

Doğrulama: 5 yeni pure-function testi grubu (poolForSize'ın felsefeye bağlı
büyümesi + generateChoices'ın havuzun TAMAMI olduğu + pickTrueQ'nun havuz-
tabanlı komşuluk kontrolü + createQuestion'ın kolay/orta'da HER ZAMAN çekirdek
üçlü ürettiği + questionTitle'ın uzunluk-duyarlı davranışı + hard'ın temsilci
seviyede TAM 4 kalibrasyon regresyonu) + mevcut testler güncellenerek
(min-3 invaryantı, 2 yerine) DEĞİŞTİRİLDİ — **442/442** (69 Q-özel test).
Diğer dört mod (Frekans Bulma, Kesim Noktası, dB Seviyesi, Boost mu Cut mu)
bu turda TEK BİR DOSYASI bile değişmedi (`git status`la doğrulandı — sadece
`q-genisligi.js`+testi) — canlı üçünde de (Kesim Noktası/Boost-Cut/dB
Seviyesi) regresyon YOK, sıfır konsol hatası.

Commit `ba688e0` — G28: **Q Genişliği'nde şık sayısı/metin uyuşmazlığı + "Çok
Geniş" satır taşması düzeltildi.** Kullanıcı raporu (cihazda): soru metni 3
seçenek söylüyor ama ekranda 2 şık çıkıyordu; ekran/layout "kayıyordu",
şıklar sığmıyormuş gibi görünüyordu.

**TEŞHİS 1 (kod okumasıyla KANITLANDI):** `app.js`'teki soru başlığı SABİT
bir metindi — `"Bu EQ'nun genişlik karakteri ne — Notch mu, Dar mı, Geniş
mi?"` — HER ZAMAN aynı üç isim, o turun GERÇEK `q.choices`'ıyla hiçbir
bağlantısı yoktu. Kolay zorlukta (options=2, spec'in "uçlar bariz" tasarımı,
BOZUK DEĞİL) şık sayısı 2 iken metin hâlâ 3 sayıyordu; DAHA KÖTÜSÜ, kolayda
çıkan gerçek çiftler (ör. "Çok Geniş"/"Dar") metindeki üç isimle (Notch/Dar/
Geniş) çoğu zaman hiç ÖRTÜŞMÜYORDU (Notch şık bile değilken metinde
geçiyordu). Kök sebep: başlık G26'da (Q'nun ilk yazıldığı tur) diğer üç
modun ("Boost mu Cut mu?" gibi) sabit-metin desenine bakılarak yazılmış ama
Q'nun (2-5 arası, 5 olası etiketten HANGİLERİ seçildiği HER turda değişen)
DİNAMİK şık kümesi için bu desen baştan YANLIŞTI — canlı DOM denetimiyle
doğrulandı (8 ardışık tur loglandı, metin hep sabit kalırken şıklar
değişiyordu).

**TEŞHİS 2 (375px simüle telefon genişliğinde CANLI ÖLÇÜLDÜ):** Diğer dört
modun TÜM şık metinleri kısa sayı/tek-kelime (`"1.33 kHz"`, `"Boost"`,
`"LPF"`, `"+3.25 dB"`) — hiçbiri `.ans b`'nin 21px tabular-nums boyutunda
dar bir telefonda SARMIYOR. Q Genişliği'nin **"Çok Geniş"** etiketi BEŞ
etiket arasında TEK iki-kelimelik olan — 375px'lik bir `.app-shell`'de
("gerçek" masaüstü testinin HİÇ yakalayamadığı genişlik, `.app-shell{width:
min(560px,100%)}` masaüstünde HER ZAMAN 560px'e sabitleniyor) bu etiket
"Çok"/"Geniş" diye İKİ satıra bölünüyor, o satırdaki (CSS Grid'in en uzun
hücreye göre yükseklik belirlemesi yüzünden) diğer tek-satırlık şıklarla
EŞİT OLMAYAN bir kutu yüksekliği üretiyor — kullanıcının "sığmıyor/yerleşim
hatası" tarifiyle örtüşen, ÖLÇÜLEBİLİR bir fark (`.ans b`'nin 21px'te
`scrollWidth` buton genişliğini AŞIYORDU, DevTools'ta doğrulandı).

**DÜZELTME 1 — dinamik başlık:** `q-genisligi.js`'e yeni `questionTitle(q)`
(Boost/Cut'ın G25'te kurduğu `mode.questionTitle(q)` deseniyle AYNI —
app.js artık hardcoded metin yerine bunu ÇAĞIRIYOR) — o turun GERÇEK
`q.choices`'ını, LABELS'in kendi (dar→geniş) doğal sırasıyla, doğru Türkçe
soru ekiyle (`mu/mı/mi`, 5 olası etiket için elle bir tablo — ünlü uyumu
her zaman sabit, dinamik hesaba GEREK yok) listeler. Artık başlıktaki
isim/sayı HER ZAMAN ekrandaki şıklarla birebir eşleşiyor.

**DÜZELTME 2 — `.ans-word` (SADECE Q'ya özgü, diğer dört modun `.ans b`
varsayılanına DOKUNULMADI):** `renderAnswerChoices` artık `<b class=
"ans-word">` basıyor, CSS'te `.ans b.ans-word{font-size:16px;font-variant-
numeric:normal}` — 21px yerine 16px, sayısal olmayan kelime etiketleri için
`tabular-nums` da gereksiz olduğundan kapatıldı. 375px'te ölçülen sonuç:
"Çok Geniş" artık TEK satırda (`scrollWidth` buton genişliğinin İÇİNDE),
tüm şıklar (2'den 5'e kadar, en zor 5-etiket Pro turu dahil) EŞİT
yükseklikte tek satır.

Doğrulama: 3 yeni pure-function testi (`questionTitle`'ın 30 örnek × 5
zorlukta HER ZAMAN gerçek q.choices'ı birebir saydığı/adlandırdığı +
şık-sayısı=parça-sayısı invaryantı + soru eki doğruluğu) + mevcut 434 test
DEĞİŞMEDEN geçti — **437/437**. Tarayıcıda canlı: masaüstü genişliğinde
(560px cap) 8 ardışık turda başlık HER ZAMAN ekrandaki şıklarla birebir
örtüştü (ör. "Notch mu, Orta mı, Çok Geniş mi?" ↔ tam o üç buton); 375px
simüle telefon genişliğinde Kolay'da GERÇEK 2-şıklı bir tur (`{"Notch",
"Çok Geniş"}`) başlıkla ("Notch mu, Çok Geniş mi?") birebir eşleşti VE
"Çok Geniş" tek satırda kaldı; Pro'nun 5-etiketli (en uzun başlık, 3 satıra
sarıyor ama TAŞMA/ÇAKIŞMA yok) turunda da tüm 5 buton tek-satır+eşit
yükseklikte kaldı (ekran görüntüsüyle doğrulandı). Regresyon: Boost mu Cut
mu'nun `.ans b`'si hâlâ 21px/`ans-word` class'ı YOK (izole değişiklik
doğrulandı), sıfır konsol hatası. `npm run test` sırasında CSS önbelleği
bayat kalıp (`fetch({cache:'reload'})` ile önce doğrulanıp) devre dışı
bırakıldığı bir doğrulama-metodolojisi notu — kod hatası değil.

Commit `6130d94` — G27: **Geri bildirim X/Atla butonu merkezileştirildi — artık
BEŞ modun da hepsinde var.** Kullanıcı raporu (cihazda): X sadece Frekans
Bulma'da görünüyor, Kesim Noktası/dB Seviyesi/Boost mu Cut mu/Q Genişliği'nde
YOK.

**TEŞHİS (kod okumasıyla KANITLANDI, tahmin YOK):** X butonu HİÇBİR ZAMAN
merkezi bir mekanizma DEĞİLDİ — Frekans Bulma'nın KENDİ zengin `#freqInfo`
panelinin (`mode.showFreqInfoPanel`/`showProPlusInfoPanel`, SADECE
frekans-bulma.js'in export ettiği, sözleşme DIŞI iki fonksiyon) ürettiği
innerHTML string'inin İÇİNE gömülü bir `<button class="freq-info-close">`
idi. app.js'teki `#freqInfo` üzerindeki click-delegasyonu (`.freq-info-close`
→ `goToNextRound()`) ZATEN mod-agnostikti — ama `#freqInfo`'nun KENDİSİ
SADECE `activeQuestion.mode==="frequency"`/`"proplus"` olduğunda
dolduruluyordu (`submitFrequencyGuess`/`onTimeUp`/`submitProPlusGuess`
içinde). Diğer dört modun submit fonksiyonları (`submitCutoffGuess`/
`submitLevelGuess`/`submitBoostCutGuess`/`submitQWidthGuess`) HİÇBİRİ
`#freqInfo`'ya dokunmuyor — hepsi `setFeedback()` (paylaşılan TEK fonksiyon,
`app.js:864`) ile `#feedbackBox`'ı dolduruyor, o da HER ZAMAN sade
başlık+metin (`.textContent`) — hiçbir kapat butonu HİÇ BAKILMADI. Kök sebep:
X, "geri bildirim akışının" bir parçası olarak DEĞİL, Frekans Bulma'ya ÖZGÜ
bir panel özelliği olarak inşa edilmişti (G15'te eklendiğinde henüz tek
oynanabilir mod Frekans Bulma'ydı) — sonraki dört mod (G20-G26) kendi
`#feedbackBox`'larını doğru şekilde paylaştı ama HİÇBİRİ X'i miras almadı,
çünkü miras alınacak bir "merkez" YOKTU.

**MERKEZİLEŞTİRME:** `#feedbackBox`'ın HTML'ine (`index.html`) STATİK bir
`<button id="feedbackClose" class="fb-close">✕</button>` eklendi —
`setFeedback()` sadece `.textContent` günceller, innerHTML'i ASLA yeniden
kurmaz (Frekans Bulma'nın `#freqInfo`'sunun AKSİNE), bu yüzden HTML'e BİR KEZ
eklenen buton SONSUZA DEK orada kalır, `.fb.show-result` class'ıyla (CSS:
`.fb{display:none}`/`.fb.show-result{display:block}`) box'ın KENDİSİYLE
BİRLİKTE otomatik görünür/gizlenir — hiçbir mod dosyası ya da ekstra JS
GEREKMEDEN. app.js'te TEK bir yeni delegasyon: `els.feedbackBox` üzerinde
`.fb-close` → `goToNextRound()` (freqInfo'nunkiyle BİREBİR AYNI semantik).
CSS'te `.freq-info-close`/`.fb-close` ORTAK bir seçiciyle (`#freqInfo
.freq-info-close, .fb .fb-close`) AYNI görsel tanımı PAYLAŞIYOR — merkezi
olan sadece davranış değil, görünüm de TEK yerden.

**Sonuç — 6. bir mod eklendiğinde:** `getFeedbackData` içeren HER yeni mod
zaten `setFeedback(...)` çağırmak ZORUNDA (mod sözleşmesinin bir parçası,
G22'den beri TÜM modlar bunu yapıyor) — X, `#feedbackBox`'ın KENDİSİYLE
birlikte OTOMATİK gelir, elle eklenecek hiçbir satır YOK. Frekans Bulma'nın
KENDİ `#freqInfo`/`.freq-info-close`'una DOKUNULMADI (hâlâ çalışıyor,
KENDİ mekanizmasıyla) — iki sistem ÇAKIŞMIYOR: `#feedbackBox` Frekans
Bulma'da HİÇ gösterilmiyor (`showResult` o modda HER ZAMAN zorla false,
F1'den beri), `#freqInfo` diğer dört modda HİÇ doldurulmuyor — canlı DOM
denetimiyle DOĞRULANDI (aşağıya bkz.).

Doğrulama: DOM-seviyesinde (JS ile, `getBoundingClientRect`/computed
`display` okunarak — ekran görüntüsünden DAHA KESİN, ekran görüntüsü bu
oturumun yüksek gecikmesi yüzünden turların otomatik ilerlemesiyle
YARIŞTIĞI için güvenilir yakalanamadı ama DOM okumaları anlık/atomik):
Kesim Noktası/dB Seviyesi/Boost mu Cut mu/Q Genişliği'nin DÖRDÜNDE de
cevap sonrası `#feedbackClose` VAR + görünür (`getBoundingClientRect().
width>0`) + basılınca `goToNextRound()` TETİKLENDİ (roundChip her modda
gözlemlenebilir şekilde arttı, `.show-result` class'ı kalktı) + X'e
BASILMADAN bekleyince (dB Seviyesi'nde 6.8sn, yanlış cevabın hizalı
süresinden UZUN) tur KENDİLİĞİNDEN ilerledi (basılmazsa otomatik geçiş
devam ediyor invaryantı doğrulandı). Frekans Bulma'da: `#feedbackBox`
HİÇ gösterilmedi (`display:none` computed, `show-result` class YOK),
`#freqInfo`'nun KENDİ `.freq-info-close`'u hâlâ VARDI ve basılınca aynı
şekilde round'u ilerletti, `#feedbackClose` (yeni, genel buton) o ekranda
GÖRÜNMEDİ (`display:none`) — iki mekanizma arasında ÇAKIŞMA/ÇİFT-X YOK.
Sıfır konsol hatası (beş modun TAMAMI test edilirken). `npm test`: pure-
function testleri (bu görev sadece DOM/CSS/app.js kablolaması, hiçbir
mod dosyası değişmedi) DEĞİŞMEDEN geçti — **434/434**.

Commit `f2e8642` — G26: **Mod 5 "Q Genişliği" — EQ genişlik karakteri tanıma,
merkezi eğriye SIFIRDAN bağlı.** 5. oynanabilir mod — Boost/Cut'ın peaking-EQ
motorunu kullanır ama sorulan eksen FARKLI: orada boost/cut yönü+miktarı+
frekans soruluyordu, burada **Q (genişlik)** — kullanıcı sayısal bir değer
değil, MİX DİLİNDE bir ETİKET seçiyor (Notch/Dar/Orta/Geniş/Çok Geniş).
SoundGym'de Q/bandwidth ölçen bir oyun YOK — bu ÖZGÜN.

**Mod mantığı:** 5 genişlik etiketi, Q ekseninde ARDIŞIK/BİTİŞİK aralıklar
(notch:[7,16], dar:[3,7), orta:[1.3,3), geniş:[0.5,1.3), çok geniş:[0.2,0.5))
— her Q TAM BİR etikete düşer, boşluk/çakışma yok. Soru SADE (sadece 2-5
etiket şıkkı, sayısal Q değeri şıklarda YOK — spec'in açık isteği), geri
bildirim ZENGİN: Q'nun SAYISAL karşılığı + frekans + yön (boost/cut) + mix
anlamı ("Notch = cerrahi, rezonans avı"/"Çok Geniş = müzikal ton eğimi")
cevap sonrası TEK yerde açıklanıyor — kullanıcının kulağı zamanla "Notch =
~Q8-16" gibi kalibre olsun diye.

**İZOLASYON İLKESİ (öğrenme sinyali temiz kalsın):** gain HER ZAMAN sabit
büyüklükte (`Q_GAIN_DB=6`) — hiçbir zorlukta değişmez, genişlik algısını
gölgelemesin. Frekans kolay/orta'da SABİT (`Q_FIXED_FREQ=1000` Hz, kullanıcı
SAF Q'yu duysun), `ISOLATE_UNTIL_POSITION`'ı (representativeLevelForTier
("medium")=8) GEÇİNCE (hard/pro) tüm spektruma (FA_MIN–FA_MAX) yayılır —
Frekans Bulma'nın BOOST_ONLY_DIFFICULTIES'iyle AYNI kategori bir "hangi tür"
kararı (tier'a bağlı nitel eşik), "ne kadar" değil.

**Zorlukla kademe yakınlaşması (spec: "kolay: Notch vs Geniş = uçlar, bariz;
zor: Notch vs Dar = komşu, ayırt zor" — birebir uygulandı):** `options`
(2→5) artan şık sayısı + `pickDistractorIndices`'in `preferredDistance`
(kapalı-form türetildi: `LABELS.length - options + 1`, ayrı bir eğri
parametresi GEREKMEDİ) — 2 şıklı kolayda EN UZAK iki uç seçilir, 5 şıklı
pro'da zaten tüm etiketler gösterilir ama true Q, `edgeMargin`'in (eğriyle
küçülen) izin verdiği kadar en yakın komşu etiketin sınırına YAKLAŞTIRILIR
(`pickTrueQ`) — true Q, HER ZAMAN (FLOOR garantili) KENDİ etiketinin
sınırları İÇİNDE kalır, sınıflandırma asla belirsizleşmez, sadece
PERSEPTİF olarak zorlaşır.

**Merkezi zorluk eğrisine bağlanma — Boost/Cut'ın (G25) BAŞTAN-doğru-
kalibrasyon yöntemiyle bağlanan 3. mod:** `Q_CURVE_CONFIG`'in AT_CAP'leri
ikili aramayla, hiçbir temsilci seviyede eski statiği aşmayacak şekilde
ÖNCEDEN çözüldü. `options`'ın kaba/tamsayı yuvarlaması yüzünden ince bir
AT_CAP (5.15) hard'ın (12) TAM 4'e ulaşması için YETMEDİ — ikili arama
gerçek ihtiyacı (≥6.62) ortaya çıkardı, 6.7 seçildi (dB Seviyesi/Boost-
Cut'ta da görülen AYNI "kaba yuvarlama payı" deseni):

| parametre | easy(4) eski→yeni | medium(8) eski→yeni | hard(12) eski→yeni | pro(20) eski→yeni |
|---|---|---|---|---|
| options | 2→**2** | 3→**3** | 4→**4** | 5→**5** |
| edgeMargin | 0.55→**0.393** | 0.35→**0.250** | 0.20→**0.160** | 0.08→**0.065** |

**app.js kablolaması:** `registerMode(qGenisligi)` + 4 dal (isChoiceFormat/
questionTitle/setFeedback/pushHistory/.ans click) + yeni `submitQWidthGuess()`
+ yeni `qGuessLabelId` overlay state. `mode.recordZone` HİÇ ÇAĞRILMIYOR — dB
Seviyesi'nin AYNI kararı: frekans bu modda kullanıcıya hiç açıklanmıyor/
guess ettirilmiyor, "hangi bölgede zayıfsın" ölçümü burada anlamsız.

**Görsel geri bildirim:** Boost/Cut'ın computeEqCurveDb/drawBellCurve
TEKNİĞİYLE BİREBİR AYNI (gerçek BiquadFilterNode+getFrequencyResponse) ama
DEĞİŞEN eksen frekans/gain DEĞİL, Q — dar (yüksek Q) sivri-dik bir tepe,
geniş (düşük Q) yayvan bir tümsek üretir. Kullanıcının "guess eğrisi" seçtiği
etiketin `qCenter`'ıyla (kendi aralığının geometrik ortalaması) çizilir,
freq/gain HER ZAMAN true değerlerle aynı (kullanıcı onları guess etmedi).

`mode-catalog.js`: `q-genisligi` artık `playable:true` — `unlockLevel:3`/
`tier:"free"` (ÖNCEDEN kayıtlı değerler) BİLEREK değiştirilmedi.

Doğrulama: 61 yeni test (labelIndexForQ'nun sınırsız/çakışmasız sınıflandırması
+ pickDistractorIndices'in uzak↔yakın seçimi + generateChoices'ın sayısal
değer SIZDIRMADIĞI + pickTrueQ'nun HER ZAMAN kendi etiketinde kaldığı [2000
örnek] + izole-Q davranışı [statik+eğri, her iki yönde] + evaluateAnswer +
calculateXP + öğretici metin [Q+frekans+yön+mix, 5 etiket×2 durum] +
applyProcessing'in peaking Q doğruluğu + curve pürüzsüzlüğü/tabanı/tolerans +
Sabit-mod "kolaylaşma yok" invaryantı + dört modla çapraz eğri-yönü
karşılaştırması) + mevcut 373 test DEĞİŞMEDEN geçti — **434/434**. Test
yazarken bulunan bir kendi-hatam (case-insensitive `/NaN/i` regex'i "rezoNANsı"
gibi meşru Türkçe kelimelere yanlış pozitif veriyordu) fark edilip case-
sensitive'e çevrildi — kod hatası değil, test kalitesi notu.

Tarayıcıda canlı (Geliştirici: tam erişim ile): mod menüden açılıyor; Kolay/
Sabit'te 2 şık HER ZAMAN en uzak iki uç (Notch/Çok Geniş gibi), frekans HER
ZAMAN 1.00 kHz (izolasyon canlı doğrulandı, "737 Hz'de..." gibi bir sızma
YOK); Pro/Sabit'te 5 şık (TÜM etiketler), frekans SERBEST (335 Hz/3.27 kHz/
924 Hz gibi gerçek çeşitlilik gözlemlendi); doğru cevapta zengin geri bildirim
("Doğru! Bu bir Notch'tı (Q: 15.3) — 335 Hz'de boost. cerrahi bir müdahale...
(+52 XP)") ve yanlışta ("Yanlış — sen Notch dedin. Bu bir Dar'tı (Q: 3.1) —
3.27 kHz'de boost...") ikisi de Q+frekans+yön+mix anlamını İÇERDİ; görsel
KESİN doğrulandı — Notch (Q:15.3) dar-sivri tek bir keskin tepe, Çok Geniş
(Q:0.2) geniş-yayvan yumuşak bir tümsek, ikisi arasındaki KONTRAST canlı
ekran görüntüsüyle KANITLANDI; Boost/Cut'ta (mod geçişi sonrası) regresyon
yok, sıfır konsol hatası. `renderLevelSheet`'in hâlâ tek dil konuştuğu
ÖNCEDEN bilinen kısıt bu modda da geçerli (SIRADAKİ madde 3, yeni regresyon
değil).

Commit `cf0cae3` — G25: **Mod 4 "Boost mu Cut mu" — üç katmanlı EQ tanıma,
merkezi eğriye SIFIRDAN bağlı.** 4. oynanabilir mod — Kesim Noktası/dB
Seviyesi ŞABLONU izlendi (aynı mod sözleşmesi/render yardımcıları), ama
Frekans Bulma'nın peaking-EQ motoruyla dB Seviyesi'nin yön/miktar mantığını
BİRLEŞTİRİYOR — bu, task'ın istediği "özgün fark".

**Mod mantığı:** kaynağa sabit Q'lu (1.4) tek bir peaking `BiquadFilterNode`
ile ±dB boost/cut uygulanır (frekans havuzu Frekans Bulma'nınkiyle AYNI
FA_MIN–FA_MAX/80 Hz–17 kHz); kullanıcı A/B ile karşılaştırıp yönü/miktarı/
frekansı bulur.

**Üç katmanlı seans-içi rampa (Kesim Noktası'nın tip-gizleme/dB Seviyesi'nin
yön-gizleme ikili rampasının GENİŞLETİLMİŞ hali — iki eşik, üç bilinmeyen
seviyesi):**
- Katman 1 (`sessionQuestionIndex`<3): frekans+miktar BELLİ, sadece YÖN
  soruluyor (2 şık: Boost/Cut).
- Katman 2 (<6): frekans BELLİ, yön+miktar GİZLİ (işaretli/ondalıklı dB
  şıkları, dB Seviyesi'nin `generateChoices`'ıyla AYNI algoritma).
- Katman 3 (≥6, boss dahil): hepsi gizli — şıklar KOMBİNE `{freq, gainDb}`
  çiftleri, çeldiriciler İKİ EKSENDEN (frekans YA DA gain, asla ikisi
  birden) true'dan ayrılıyor, gain-ekseninde en az bir işaret flip garantili
  (yön de test edilsin diye).

**Merkezi zorluk eğrisine bağlanma — dB Seviyesi'nin G22'de kurduğu, G24'te
ACI ÇEKEREK öğrendiği dersler BAŞTAN uygulanan 2. mod:** `BOOSTCUT_CURVE_
CONFIG`'in AT_CAP'leri ikili aramayla, hiçbir temsilci seviyede eski statiği
aşmayacak şekilde ÖNCEDEN çözüldü (G22/ADIM 3'ün "önce bağla sonra düzelt"
döngüsünden yine kaçınıldı):

| parametre | easy(4) eski→yeni | medium(8) eski→yeni | hard(12) eski→yeni | pro(20) eski→yeni |
|---|---|---|---|---|
| gainDb | 8.0→**6.075** | 5.5→**4.209** | 3.2→**2.916** | 1.8→**1.400** |
| freqStepOct | 1.4→**1.158** | 1.0→**0.898** | 0.75→**0.697** | 0.55→**0.420** |
| gainStepDb | 2.5→**1.907** | 1.6→**1.329** | 1.0→**0.926** | 0.6→**0.450** |
| options | 3→**3** | 4→**4** | 5→**5** | 6→**6** |

`pickGainDb` (dB Seviyesi'nin G24-SONRASI `pickDbDelta`'sının BİREBİR
deseni): ±%6 dar jitter + jitter-SONRASI `GAIN_DB_FLOOR` (1.0 dB) garantisi
— G24'te SONRADAN düzeltilen iki hata (dar jitter + floor kontrolü) burada
İLK GÜNDEN doğru yazıldı, regresyon riski yok.

**app.js kablolaması:** `registerMode(boostMuCutMu)` + `isChoiceFormat`/
`questionTitle` (yeni `mode.questionTitle(q)` fonksiyonu — 3 katmanlı metin
app.js'in ternary zincirine yazmak yerine mod dosyasına devredildi)/
`setFeedback`/`pushHistory` ternary'lerine `"boostcut"` dalı + yeni
`submitBoostCutGuess()` (submitLevelGuess'in yapısal paraleli, `answer`
şekli KATMANA göre değişiyor: `{direction}`/`{gainDb}`/`{freq,gainDb}`) +
yeni `boostCutGuess` overlay state'i (cutoffGuess/dbGuess'in AYNI deseni).
`mode.recordZone` SADECE Katman 3'te çağrılıyor — Katman 1/2'de frekans
zaten VERİLMİŞ, "hangi bölgede zayıfsın" ölçümü ancak kullanıcı frekansı
GERÇEKTEN aradığında (Katman 3) anlamlı.

**Görsel geri bildirim:** Frekans Bulma'nın `getEqCurveForQuestion`
tekniğiyle (gerçek `BiquadFilterNode.getFrequencyResponse()`, elle
yaklaşıklık yok) + Kesim Noktası'nın iki renkli (amber/yeşil) deseni
BİRLEŞTİRİLDİ — cevap sonrası İKİ bell-eğrisi (senin cevabın/doğru)
FA_MIN–FA_MAX ekseninde çiziliyor. Katman 1/2'de "senin eğrin"in frekansı
her zaman `question.freq` (kullanıcı onu guess ETMEDİ), sadece Katman 3'te
gerçek bir guess.

**Canlı testte bulunup AYNI turda düzeltilen gerçek bir hata:**
`generateLayer3Choices`'ın frekans-ekseni çeldiricileri naif `trueFreq *
2^(k*step)` çarpımıyla üretiliyordu — true frekans FA_MAX'a (17 kHz) yakın
olduğunda bu, havuzun TAMAMEN DIŞINDA bir çeldirici (ör. 21.6 kHz)
üretebiliyordu (canlı tarayıcıda Pro zorlukta gözlemlendi). Kesim Noktası'nın
`generateChoices`'ındaki AYNI "havuz sınırına göre adım sayısını kırp"
deseni (maxBelow/maxAbove oktav) uygulanarak düzeltildi — havuz bir yönde
dar kalırsa fazla adım gain eksenine devrediliyor, frekans ekseni artık asla
aşmıyor. Regresyon testi eklendi (uç frekanslarda 1000 tur, ihlal yok).

`mode-catalog.js`: `boost-mu-cut-mu` artık `playable:true` — `unlockLevel:4`/
`tier:"free"` (ÖNCEDEN kayıtlı değerler) BİLEREK değiştirilmedi, ürün kararı
değil.

Doğrulama: 66 yeni test (createQuestion'ın 3 katmanı doğru üretmesi + her
katmanın kendi `generateLayerNChoices`'ının ondalık/çakışmasız/eksen-ayrık/
flip-garantili üretimi + FA_MIN–FA_MAX taşma regresyonu + evaluateAnswer'ın
3 katman için ayrı mantığı + calculateXP'nin katman çarpanı [3>2>1] +
öğretici metin + applyProcessing'in peaking filtre doğruluğu [sahte
audioCtx] + curve pürüzsüzlüğü/tabanı/tolerans-güvenlik-payı + Sabit-mod
"kolaylaşma yok" invaryantı + üç modla çapraz eğri-yönü karşılaştırması) +
mevcut 307 test DEĞİŞMEDEN geçti — **373/373**. Tarayıcıda canlı (Geliştirici:
tam erişim ile): mod menüden açılıyor; Katman 1 çalıştı (2 şık, doğru/yanlış
işaretleme, iki renkli eğri, "Ters yöne gittin" öğretici metni); Katman 2
hem Kolay [3 şık] hem Pro'da [6 şık, ~1-2 dB ince aralıklarla kalibrasyon
tablosuyla tutarlı] çalıştı (boss round dahil, işaretli/ondalıklı şıklar,
yanlışta doğru/yanlış renklendirme + eğri); Katman 3 Pro'da (6 kombine şık,
3 frekans-ekseni + 2 gain-ekseni + 1 doğru, canlı gözlemlenen gerçek
kombinasyon: "607/801/801/801/1.06k/1.39k Hz" ve "607/801(×3)/1.06k/1.39k"
desenleri BEKLENEN yapıyla birebir örtüştü) hem doğru hem yanlış (frekans-
öncelikli "Frekansı kaçırdın" mesajı, bölge adı dahil) cevap test edildi;
İpucu Ver Katman 3'te frekans BÖLGESİNİ ("ORTA") açıkladı; Frekans Bulma +
Kesim Noktası'nda (mod geçişleri dahil) regresyon yok, sıfır konsol hatası
tüm oturum boyunca. `renderLevelSheet`'in hâlâ tek dil (gainDb/Q) konuştuğu
ÖNCEDEN bilinen kısıt bu modda da doğrulandı (SIRADAKİ madde 3, yeni bir
regresyon değil).

Commit `eddbabd` — G24: **dB Seviyesi zorluk rampası — teşhis + pickDbDelta'daki
2 gerçek hata düzeltildi.** Kullanıcı raporu (cihazda): "10-12 soru boyunca
zorluk hep aynı kolay seviyede kalıyor, ilerledikçe zorlaşmıyor — sınırsız XP
kasılabilir, ciddi denge sorunu." Talep bir "kopuk bağlantı" varsayıyordu —
KANIT ölçülünce bu YANLIŞ çıktı, ama iki AYRI, gerçek hata bulundu.

**Teşhis (Kesim Noktası'yla karşılaştırmalı, gerçek kodla ÖLÇÜLDÜ, tahmin
YOK):** `currentDifficultyPosition() → continuousLevel + sessionRampOffset →
paramsForDifficultyPosition()` zinciri dB'de Kesim Noktası'yla BİREBİR AYNI
yoldan çağrılıyor — iki modun position'ları (aynı seviye+ramp girdisiyle)
KARŞILAŞTIRILDI, ikisi de position arttıkça AYNI ŞEKİLDE monoton azalıyor
(bkz. commit mesajındaki simülasyon). Yön-gizleme (`roundsInThisPlaySession`
sayacı, Kesim Noktası'nın tip-gizleme sayacıyla PAYLAŞILAN mekanizma)
CANLIDA doğrulandı: taze bir oturumda ilk sorular yön BELLİ (aynı işaretli
şıklar), birkaç sorudan sonra GİZLİ (karışık işaretli şıklar) — sayaç KOPUK
DEĞİLDİ.

**Asıl sorun `pickDbDelta`'daydı — İKİ ayrı, ölçülmüş hata:**
1. ±%20 (0.8x-1.2x) jitter, seans rampasının seviye-1 (TAZE) bir oyuncuda
   ürettiği GERÇEK ama küçük eğilimi (position 1→2 arası ~%11 düşüş —
   logLerp'in geometrik/oransal doğası GEREĞİ, HER seviye adımında SABİT
   oranda değişir, matematiksel olarak hesaplandı) BOĞUYORDU: gürültü
   (±%20) sinyalden (~%11) BÜYÜKTÜ. Kullanıcı "hiç değişmiyor" hissediyordu
   çünkü İSTATİSTİKSEL olarak öyleydi. ±%6'ya (0.94x-1.06x) indirildi — jitter'ın
   asıl amacı (her soru curve'ün sabit bir sayısı DEĞİL, testle doğrulandı —
   50 örnekte hâlâ >15 farklı değer) KORUNDU, sadece SNR (sinyal/gürültü)
   düzeltildi.
2. `DB_FLOOR` (0.25 dB, "kulağın gerçek ayırt sınırı") jitter'dan SONRA HİÇ
   kontrol edilmiyordu — pro zorlukta (dbDelta=0.32) jitter değeri 0.256'ya
   kadar düşürebiliyordu, **5000 örnekte %45 taban ihlali ÖLÇÜLDÜ** (kullanıcı
   raporunda bahsedilmedi ama koddan BAĞIMSIZ bir gerçek hataydı — kulağın
   fiziksel olarak ayıramayacağı bir farkı "doğru cevap" olarak sunuyordu).
   `Math.max(DB_CURVE_CONFIG.DB_FLOOR, jittered)` ile taban artık GARANTİ.

**Dürüst not — "her zaman kolay" algısının BÜYÜK kısmı bu ikisiyle
AÇIKLANMIYOR, ayrı bir gerçek:** dB Seviyesi'nin kendi (mod-özel, Z3 kararı)
XP/seviyesi TAZE bir oyuncuda (hatta diğer modlarda tecrübeli bir oyuncuda
bile, çünkü seviye MOD BAŞINA) düşük başlıyor — Kesim Noktası da İLK
oynandığında aynı durumdaydı. Seans rampasının GENLİĞİ de bilerek küçük
(Z2 kararı, "ilk soru kolay, caydırma" felsefesi) — bu iki tasarım kararı
BİLEREK DEĞİŞTİRİLMEDİ (`SESSION_RAMP_CONFIG` paylaşılan, Kesim Noktası/
Frekans Bulma'yı da etkiler — KORUMA talimatı kapsamında dokunulmadı).
Düzeltilen SADECE dB'ye özgü, kodda GERÇEKTEN var olan iki hataydı.

Doğrulama: 8 yeni test (floor hiç ihlal edilmiyor [5000 örnek] + jitter
ortalaması hedeften %3'ten az sapıyor + hâlâ tekrar/durgunluk yok [>15/50
farklı değer] + seans rampası eğilimi POSITION bazında istatistiksel olarak
iniyor [N=1000] + boss round aynı seviyede normal round'dan istatistiksel
olarak daha zor [N=500, hem düşük seviyeli hem createQuestion uçtan uca] +
seviye 10 ortalaması seviye 1'in en az %40 altında [N=500] + Kesim
Noktası'yla eğri yönü karşılaştırması) + mevcut 299 test DEĞİŞMEDEN geçti —
**307/307**, 5 kez tekrarlı çalıştırıldı, flake yok. Tarayıcıda canlı: taze
bir Otomatik/seviye-1 oturumunda ilk sorular yön belli (3 şık, aynı işaret),
birkaç sorudan sonra yön gizli (karışık işaretli şıklar, ör. "-5.27/-2.58/
+3.93 dB") — şıklar hâlâ ondalıklı ve k*step aralıklı (Kesim Noktası'nın
"tam adım" deseniyle aynı, geniş görünen aralık DOĞRU — çeldiriciler true
değerden UZAKLAŞARAK üretiliyor, true değerin kendisi DEĞİL); Kesim
Noktası + Frekans Bulma'da regresyon yok, sıfır konsol hatası.

Commit `3b8c8ec` — G23: **Geliştirici modu artık tam erişim (Pro + seviye
kilitleri, tek anahtar).** Kullanıcı raporu: geliştirici anahtarı
("Pro'yu simüle et") sadece `isUserPro()`'yu (Pro-kilitli özellikler)
açıyordu — seviye kilidi (`unlockLevel`) AYRI bir eksen olduğu için hâlâ
engelliyordu, dB Seviyesi (`unlockLevel:6`) "seviye yetersiz" diyerek
test edilemiyordu.

`renderModeGrid()`'deki `meetsLevel` artık `devFlags.simulatePro ||
academyLevel >= unlockLevel`. BİLEREK `isUserPro()` üzerinden DEĞİL,
`devFlags.simulatePro`'ya DOĞRUDAN bağlandı — gerçek Pro kullanıcıların
(ileride IAP gelince) seviye kilidini de atlaması İSTENMEDİ, bu görev sadece
geliştirici anahtarını güçlendiriyor, kilit tiplerinin (Pro/seviye) kalıcı
birleştirilmesi kararı (BEKLEYEN KARARLAR **B**) AYRI ve dokunulmadı. Henüz
KODLANMAMIŞ modlar (`realMode` yok — Q Genişliği, Boost mu Cut mu vb.)
anahtar açıkken BİLE kilitli kalıyor (`!!realMode && meetsLevel` — `realMode`
false olduğu sürece `meetsLevel` ne olursa olsun `playable=false`) — anahtar
var OLMAYAN bir modu sahte açmıyor, sadece kodlanmış ama seviye/Pro kilitli
olanları.

Etiket güncellendi: "Pro'yu simüle et" → **"Geliştirici: tam erişim"**
(açıklama metni de artık Pro + seviye kilitlerini BİRLİKTE açtığını
yansıtıyor: "Tüm modlar + seviye kilitleri + Pro açılır").

Test yok — bu tamamen DOM/UI kablolaması (`renderModeGrid`), app.js hiçbir
test dosyası tarafından import edilmiyor (mevcut, önceden kurulu desen —
app.js'in DOM'a bağımlı kodu testlerin kapsamı dışında, core/ ve modes/
saf fonksiyonları test ediliyor). 299 test değişmeden geçti.

Doğrulama (tarayıcıda, canlı): 0 XP + geliştirici modu KAPALI'yken dB
Seviyesi kilitli ("Seviye 6'da açılır") — taban durum doğrulandı; gerçek
7-dokunuş akışıyla (`document.getElementById('versionRow').click()` × 7,
UI'daki tıklama-sayaç zaman aşımı [1200ms] yavaş elle tıklamada sayaç
sıfırlanabiliyor, JS ile hızlı tetiklendi) geliştirici modu açılıp anahtar
("Geliştirici: tam erişim") açılınca dB Seviyesi'nin kilidi KALKTI ve mod
GERÇEKTEN oynanabildi (Soru 0'dan başlayarak); kodlanmamış modlar (Q
Genişliği, Boost mu Cut mu) anahtar açıkken BİLE kilitli kaldı (doğru
davranış, "Yakında" toast'ı); anahtar kapatılınca dB Seviyesi kilidi GERİ
geldi ("Seviye 6'da açılır" yeniden göründü); sıfır konsol hatası (tüm
akış boyunca).

Commit `0b34220` — G22: **Mod 3 "dB Seviyesi" — seviye/genlik farkı algısı,
merkezi zorluk eğrisine SIFIRDAN bağlı.** Frekans Bulma + Kesim Noktası'ndan
sonra 3. oynanabilir mod — Kesim Noktası ŞABLONU izlendi (aynı mod sözleşmesi/
render yardımcıları/seans-içi rampa deseni, bkz. `modes/db-seviyesi.js`).

**Mod mantığı:** kaynağa bir `GainNode` ile +/- dB seviye değişimi uygulanır
(linear gain = 10^(dB/20)); kullanıcı A/B ile kuru/işlenmiş sesi karşılaştırıp
farkın hem BÜYÜKLÜĞÜNÜ hem YÖNÜNÜ (açıldı/kısıldı) şıklardan bulur. Şıklar
ONDALIKLI ve gerçekçi (`pickDbDelta`: curve'ün ürettiği tipik büyüklüğe ±%20
jitter + 2 ondalık haneye yuvarlama — asla "3.00" gibi yuvarlak bir sayı) ve
İŞARETLİ ("+3.25 dB"/"-1.75 dB"). Çeldiriciler doğru cevaptan TAM k*step dB
mesafede (Kesim Noktası'nın "tam k*oktav" deseninin dB karşılığı) — bu sayede
işaret çevirme (aşağıda) ASLA bir değer çakışmasına yol açmaz.

**Yön-gizleme (Kesim Noktası'nın tip-gizleme deseninin BİREBİR kopyası):**
`DIRECTION_REVEAL_QUESTION_COUNT=3` — seans içi ilk 3 soru yönü söyler
("Bu ses AÇILDI, ne kadar?"), sonrası gizler ("Açıldı mı kısıldı mı, ne
kadar?") — o zaman şıklar KARIŞIK işaretli üretilir (en az bir ters-yön
çeldirici garanti, `sessionQuestionIndex`'e bağlı — aynı `roundsInThisPlaySession`
sayacı).

**Merkezi zorluk eğrisine bağlanma — SIFIRDAN doğru kalibre edilen İLK mod:**
Kesim Noktası/Frekans Bulma'nın ADIM 1/2'de yaşadığı geçiş dönemi (statik
tablo → eğri) ve ADIM 3'teki SONRADAN kalibrasyon düzeltmesi ("Sabit modda
kolaylaşma" bulgusu) burada hiç GEREKMEDİ — `DB_CURVE_CONFIG`'in AT_CAP'leri
BAŞTAN ikili aramayla, `representativeLevelForTier`'ın (ADIM 3'te değişen
YENİ semantiği — her tier kendi TIER_BOUNDARIES üst sınırında: easy=4,
medium=8, hard=12, pro=LEVEL_CAP) HİÇBİR temsilci seviyesinde eski statik
değeri aşmayacak şekilde çözüldü:

| tier | repr.sv | dbDelta eski→yeni | step eski→yeni | opt eski→yeni |
|---|---|---|---|---|
| easy | 4 | 3.00→**2.107** | 1.50→**1.151** | 3→**3** |
| medium | 8 | 1.75→**1.315** | 1.00→**0.808** | 4→**4** |
| hard | 12 | 0.90→**0.821** | 0.60→**0.568** | 5→**5** |
| pro | 20 | 0.50→**0.320** | 0.35→**0.280** | 6→**6** |

Tüm tier'lar eşit ya da zor — HİÇBİRİ kolaylaşmadı, tek seferde doğru
kalibre edildi (Kesim Noktası/Frekans Bulma'nın 2 turluk "önce bağla, sonra
düzelt" döngüsünden kaçınıldı). `DB_FLOOR=0.25` (kulağın gerçek ayırt sınırına
yakın kabul edilen bir değer, KESİN ölçülmedi) — `applyPostCapFloor` eğrinin
LEVEL_CAP'ten SONRA bunun altına inmesini engelliyor.

**Görsel geri bildirim:** Kesim Noktası'nın filtre eğrisinin basitleştirilmiş
karşılığı — tek bir dB değeri olduğu için eğri değil, yatay bir -5..+5 dB
ölçekte amber ("Senin cevabın") + yeşil ("Doğru") nokta-markör (bkz.
`drawDbGauge`). Soru sırasında BİLEREK gizli (kulakla bulma ilkesi), sadece
cevap sonrası.

**Öğretici metin** (`teachingText`, DB_EFFECT/DIRECTION_EFFECT deseni,
Kesim Noktası'nın ZONE_EFFECT'iyle AYNI TEK-YERDE-şablon felsefesi) üç
durumda (doğru / yön-doğru-miktar-yanlış / yön-yanlış) mix dilinde algısal
karşılık anlatıyor — teknik jargon (JND, RMS) hiç yok, makul bir başlangıç,
kesin nihai metin iddia edilmiyor.

**app.js değişiklikleri:** `registerMode(dbSeviyesi)` + `isChoiceFormat`/
`questionTitle`/`setFeedback` ternary'lerine `"dblevel"` dalı + yeni
`submitLevelGuess()` (submitCutoffGuess'in YAPISAL paraleli — 3. modda bile
ortak bir "submitAnswer" özütlemesini haklı çıkaracak kadar gerçek tekrar
ağrısı netleşmedi, bkz. o fonksiyonların dosya başı notu). Bu mod
`mode.recordZone` HİÇ ÇAĞIRMIYOR — seviye değişimi tek bir frekans bölgesine
ait değil, `zoneStats`'ın "hangi bölgede zayıfsın" kavramı burada anlamsız.

**Doğrulama sırasında bulunup aynı commit'te düzeltilen bir hata:**
`pushHistory()`'nin `desc` ternary'sinin ELSE dalı `activeQuestion.filterLabel`/
`.freq` alanlarının HER modda var olduğunu varsayıyordu (Frekans Bulma +
Kesim Noktası'nda ikisi de gerçekten var) — dB Seviyesi'nde İKİSİ DE YOK
(`.dbDelta` var), ELSE'e düşseydi Antrenman geçmişinde "undefined · NaN Hz ·
Kaynak" üretirdi. Ayrı bir dal eklenerek düzeltildi (kod incelemesiyle
BULUNDU, canlı test bunu tetiklemeden önce).

`mode-catalog.js`: `db-seviyesi` artık `playable:true` — `unlockLevel:6`/
`tier:"pro"` (ÖNCEDEN kayıtlı değerler) BİLEREK değiştirilmedi, ürün kararı
değil (bkz. CLAUDE.md "Ürün kararı verme").

Doğrulama: 51 yeni test (createQuestion/evaluateAnswer/generateChoices'in
ondalık+çakışmasız+işaretli üretimi, yön-gizleme rampası, calculateXP,
3-durum öğretici metin, applyProcessing'in linear gain doğruluğu [sahte
audioCtx], curve pürüzsüzlüğü/tabanı, Sabit-mod "kolaylaşma yok" invaryantı)
+ mevcut 248 test DEĞİŞMEDEN geçti — **299/299**. Tarayıcıda canlı (XP
localStorage üzerinden yükseltilip kilit açılarak): mod menüden açılıyor;
Otomatik/düşük seviyede 3-4 şık; Sabit/Pro'da 6 şık (ince ~0.3 dB adımlarla,
kalibrasyon tablosuyla tutarlı); yön-gizleme seans içinde ilk 3 sorudan
sonra devreye girdi (karışık işaretli şıklar canlı gözlendi: "-4.08/+1.31/
+3.16/-2.23 dB" gibi); İpucu Ver doğru yönü ("Açıldı (+)") açıkladı; cevap
sonrası dB göstergesi (amber/yeşil markör + "0 dB" ekseni) + öğretici metin
+ hizalı geçiş süresi hepsi çalıştı; "Cevap biçimi" satırı doğru gizlendi
(choiceOnly); Frekans Bulma + Kesim Noktası'nda (mod değişimleri dahil,
tüm oturum boyunca) regresyon yok, sıfır konsol hatası.

**Bilinen küçük eksik (engelleyici değil):** `teachingText`'in "yön doğru,
miktar yanlış" durumunda iki `magnitudeWord(...)` çağrısı benzer büyüklükte
değerlerde ("fark edilir bir değişim...belirgin bir fark" gibi) hafif
tekrarlı okunabiliyor — canlı testte gözlendi, kod hatası değil, salt bir
metin kalitesi notu (diğer modların "kesin nihai metin değil" notuyla aynı
kategoride).

Commit `61c76c5` — ADIM 3: **Sabit modu eğriye bağla + hard/pro kolaylaşmasını
düzelt.** Kullanıcı raporu: "Otomatik ile Sabit uyumsuz, hard/pro geçişte
kolaylaşmış görünüyor" — talep "Sabit modu eğriye bağla"ydı.

**Önce dürüst bir düzeltme:** kod incelemesiyle doğrulandı ki Sabit mod
ADIM 1/2'den BERİ zaten `paramsForDifficultyPosition` üzerinden besleniyordu
(`app.js: currentDifficultyPosition()`, `diffModeAuto` false olduğunda
`representativeLevelForTier(tier)`'ı taban olarak kullanıyordu) — statik
DIFFICULTY tablosu ZATEN değer kaynağı DEĞİLDİ, bu iddia YANLIŞTI (raporlandı,
"tahminle düzeltme yapma" kuralı gereği önce doğrulandı). **Asıl sorun
KALİBRASYONDU**: eski `representativeLevelForTier` her tier'ı ARALIĞININ ORTA
NOKTASINDA değerlendiriyordu (ör. pro→14.5, LEVEL_CAP'in [20] belirgin
altında) — bu da ADIM 2 sonrası DURUM.md'de ZATEN flagli olan "hard/pro'da
eğri statikten kolay" sapmasının doğrudan nedeniydi.

**Değişiklik 1 — `representativeLevelForTier` (core/difficulty-curve.js):**
artık her tier'ı KENDİ `TIER_BOUNDARIES` ÜST SINIRINDA değerlendiriyor —
easy=4, medium=8, hard=12, pro=**LEVEL_CAP'in TAM KENDİSİ (20)**, orta nokta
DEĞİL. "Pro" seçildiğinde kullanıcı artık GERÇEKTEN eğrinin en zor noktasını
alıyor (`paramsForDifficultyPosition(LEVEL_CAP)` ile bitişik/deepEqual,
testle garanti altına alındı) — "yakını" değil.

**Değişiklik 2 — AT_CAP kalibrasyonu (her iki mod, `*_CURVE_CONFIG`):**
sadece representative level'ı değiştirmek yetmiyordu — LEVEL_CAP=20'ye kadar
tek bir log-eğri, eski AT_CAP (=eski statik pro) ile hard'ın (level 12)
eski statik değerini hâlâ AŞAMIYORDU (ikili aramayla ÖLÇÜLDÜ, ör. Kesim
Noktası'nın marginOct'unda hard=12'de eski hard'ı (0.55) aşmamak için gereken
en gevşek AT_CAP ~0.253'tü — eski AT_CAP 0.3 bu şartı sağlamıyordu). Bu yüzden
AT_CAP'lar (ve iki yerde FLOOR'lar) HER parametre için ayrı ayrı, ikili
aramayla, "hiçbir tier'da (easy dahil) eski statiği aşmasın" şartını
sağlayacak şekilde yeniden çözüldü:

| Kesim Noktası | eski AT_CAP | yeni AT_CAP | Frekans Bulma | eski AT_CAP | yeni AT_CAP |
|---|---|---|---|---|---|
| marginOct | 0.30 | **0.22** | gainDb | 4.5 | **3.8** |
| hintBandOct | 0.50 | **0.45** | q (yön TERS — büyük=zor) | 4.2 | **5.5** |
| distractorStepOct | 0.65 | **0.52** | timeSec | 9 | **8.0** |
| options | 6 | **6.15**† | hintBandOct | 0.6 | **0.48** |
| | | | distractorStepOct | 0.65 | **0.52** |
| | | | options | 6 | **6.15**† |

†options'ın ARA hesabı 6.15'i geçebilir ama çıktı yine `Math.min(6,...)` ile
kırpılır — oyuna hiçbir zaman 6'dan fazla şık yansımaz, sadece round(...)'un
hard'da (12) TAM 5'e ulaşması için gerekliydi (6 ile 4'e yuvarlanıyordu).
`distractorStepOct` FLOOR'u da (Kesim + Frekans, ikisinde de) 0.55→0.51
indirildi — AT_CAP'in ALTINDA kalması gerekiyordu; 0.51 hâlâ
`FREQ_TOLERANCE_OCT`'tan (0.5) HER ZAMAN büyük, invaryant KIRILMADI (testle
garanti altında), sadece güvenlik payı 0.05'ten 0.01'e daraldı.

**Kalibrasyon karşılaştırma tablosu (gerçek kod çalıştırılarak ölçüldü) —
Sabit modun ARTIK ürettiği değer, HİÇBİR tier'da eski statikten kolay değil
(eşit ya da zor):**

Kesim Noktası:

| tier | repr.sv | margin eski→yeni | hint eski→yeni | step eski→yeni | opt eski→yeni |
|---|---|---|---|---|---|
| easy | 4 | 1.60→**1.170** | 2.00→**1.580** | 1.20→**1.052** | 3→**3** |
| medium | 8 | 1.00→**0.770** | 1.40→**1.154** | 0.90→**0.882** | 4→**4** |
| hard | 12 | 0.55→**0.507** | 0.90→**0.843** | 0.75→**0.739** | 5→**5** |
| pro | 20 | 0.30→**0.220** | 0.50→**0.450** | 0.65→**0.520** | 6→**6** |

Frekans Bulma:

| tier | repr.sv | gain eski→yeni | q eski→yeni | time eski→yeni | hint eski→yeni | step eski→yeni | opt eski→yeni |
|---|---|---|---|---|---|---|---|
| easy | 4 | 10.0→**8.583** | 0.90→**1.198** | 16→**14.341** | 2.40→**1.861** | 1.20→**1.052** | 3→**3** |
| medium | 8 | 8.0→**7.001** | 1.30→**1.753** | 13→**12.394** | 1.60→**1.326** | 0.90→**0.882** | 4→**4** |
| hard | 12 | 6.0→**5.711** | 2.50→**2.567** | 11→**10.711** | 1.00→**0.945** | 0.75→**0.739** | 5→**5** |
| pro | 20 | 4.5→**3.800** | 4.20→**5.500** | 9→**8.000** | 0.60→**0.480** | 0.65→**0.520** | 6→**6** |

**Pro artık ikisinde de eskisine EŞİT ya da DAHA ZOR** (options birebir aynı
6, sürekli parametreler — margin/gain/hint/step küçülüyor=zor, Q büyüyor=zor
— hepsi eski pro'yu eşitliyor ya da geçiyor). **easy dahi bir miktar
zorlaştı** (repr.sv=4, AT_1'in [level 1] biraz üstünde) — bu, "hiçbir tier
kolaylaşmasın" kararının SİMETRİK sonucu, sadece pro'ya özel bir istisna
değil; BİLEREK böyle, raporda açıkça not edildi.

Doğrulama: 10 yeni "kolaylaşma yok" invaryant testi (her iki modda: sürekli
parametreler için `<=eski`, options/Q için `>=eski`, dört tier'ın TAMAMINDA)
+ `representativeLevelForTier`'ın yeni semantiğini doğrulayan güncellenmiş
testler + mevcut 238 test DEĞİŞMEDEN geçti — **248/248**. Tarayıcıda canlı:
Kesim Noktası Sabit/Pro **6 şık** (ADIM 1/2 sonrası 5'ti, şimdi eskiyle
birebir eşit); Frekans Bulma Sabit/Pro **6 şık** (aynı); Otomatik mod her iki
modda da (Kesim Noktası + Frekans Bulma, ayrı ayrı `localStorage` üzerinden
`difficultyMode` değiştirilerek) test edildi, bozulmadı — Seviye 1'de 3 şık,
normal akış; sıfır konsol hatası. **KULAKLA DOĞRULANMALI** — AT_CAP'ler ikili
arama ile "eskisinden kolay olmasın" şartını sağlayacak EN AZ sapmayla
seçildi (küçük güvenlik payıyla), ama gerçek algısal zorluk hissi test
edilmedi.

Commit `680d2ab` — ADIM 2: **zorluk sisteminin merkezi bağlanması — Frekans
Bulma eğri sistemine taşındı.** Kademeli geçişin (Seçenek C) İKİNCİ ve SON
adımı: ADIM 1'de Kesim Noktası'nda kanıtlanan desen Frekans Bulma'ya da
uygulandı — **artık HER İKİ mod da AYNI merkezi eğri mimarisini kullanıyor.**

**Frekans Bulma (`modes/frekans-bulma.js`):** Kesim Noktası'ndaki BİREBİR
desen — statik `DIFFICULTY` tablosu KALMAYA devam ediyor (geriye dönük
uyumluluk + "Sabit" modun çapası + proplus için hâlâ gerekli), yanına
`FREKANS_CURVE_CONFIG` + `paramsForDifficultyPosition(position)` eklendi.
AT_1/AT_CAP uçları statik `easy`/`pro` değerleriyle BİREBİR aynı (Kesim
Noktası'ndaki AYNI kalibrasyon yöntemi). **Tek fark — Q ekseni:** Z1'in
ORİJİNAL asimetrisi korundu, Q (ve difficulty-curve.js'in eski global
`DIFFICULTY_CONFIG`'indeki tolerans) LEVEL_CAP'ten SONRA SABİT kalıyor
(`applyPostCapFloor` Q için ÇAĞRILMIYOR) — sadece gainDb/timeSec/hintBandOct/
distractorStepOct tavandan sonra azalıp bir tabanda duruyor. `generateChoices`
Kesim Noktası'ndaki AYNI refactor'dan geçti (`level` yerine çözülmüş
`{options,step}`). `createQuestion`, `settings.difficultyPosition` verilirse
eski `boss ? diff.gain*0.75 : diff.gain` / `boss ? diff.q*1.35 : diff.q`
çarpanlarını UYGULAMIYOR (boss'un etkisi zaten position'ın içinde, çifte
ceza olmasın diye) — vermezse (proplus dahil, o zaten ayrı bir dalda erken
dönüyor) eski statik davranış BİREBİR korunuyor. `BOOST_ONLY_DIFFICULTIES`
(easy/medium'da hep boost, hiç kesim yok) TİER İSMİNE bağlı kalitatif bir
kural olarak KALDI, sürekliye çevrilmedi (bilerek — bu bir "ne kadar" değil
"hangi tür" sorusu).

**app.js: SIFIR değişiklik gerekti.** ADIM 1'de `currentDifficultyPosition()`
zaten mod-agnostik yazılmıştı (`mode.getMeta().id` üzerinden hangi mod
aktifse onun XP'sini okuyordu) ve `createQuestion` çağrısına HER moda
(sessionQuestionIndex'le AYNI desen) geçiyordu — ADIM 1'de bunu SADECE
Kesim Noktası okuyordu, ADIM 2 ile Frekans Bulma da kendi
`paramsForDifficultyPosition`'ını yazıp bağlandığı için OTOMATİK olarak
aynı sayıyı almaya başladı. Sadece iki yerdeki artık BAYAT yorum ("SADECE
Kesim Noktası okuyor") güncellendi — bu, ADIM 1'in mimarisinin doğru
kurulduğunun somut bir kanıtı.

**Tutarlılık doğrulaması (yapısal, kod okumasıyla):** her iki mod dosyası
da `logLerp`/`applyPostCapFloor`'u AYNI `core/difficulty-curve.js`'ten
import ediyor; `continuousLevel`/`sessionRampOffset`/`representativeLevelForTier`
TEK bir yerde (`app.js: currentDifficultyPosition`) hesaplanıyor, iki mod
için AYRI birer implementasyon YOK — bu, "iki eğri zamanla birbirinden
uzaklaşır mı" riskini yapısal olarak ortadan kaldırıyor (drift mümkün değil,
tek kod yolu var).

**Kalibrasyon karşılaştırma tablosu (gerçek kod çalıştırılarak ölçüldü) —
statik DIFFICULTY[tier] vs eğrinin o tier'ın temsilci seviyesinde ürettiği
değer:**

| tier | temsilci sv. | gain eski→yeni | Q eski→yeni | time eski→yeni | opt eski→yeni | hint eski→yeni | step eski→yeni |
|---|---|---|---|---|---|---|---|
| easy | 2.5 | 10.000→9.389 | 0.90→1.02 | 16→15.29 | 3→3 | 2.40→2.15 | 1.20→1.143 |
| medium | 6.5 | 8.000→7.936 | 1.30→1.41 | 13→13.55 | 4→4 | 1.60→1.61 | 0.90→1.005 |
| hard | 10.5 | 6.000→6.708 | 2.50→1.94 | 11→12.00 | 5→4 | 1.00→1.20 | 0.75→0.883 |
| pro | 14.5 | 4.500→5.670 | 4.20→2.69 | 9→10.63 | 6→5 | 0.60→0.90 | 0.65→0.776 |

**Aynı desen Kesim Noktası'nda görülenle BİREBİR tekrarlıyor**: easy/medium
ucu yakın (uçlar AT_1/AT_CAP'la birebir eşleştiği için), hard/pro'da eğri
statikten SİSTEMATİK olarak KOLAY (gain daha büyük/belirgin, Q daha geniş/
dar-olmayan, hard/pro'da 1 eksik şık) — bu ARTIK iki modda da aynı yönde
tekrar eden bir desen, tek seferlik bir tuhaflık değil: tek bir log-eğrinin
4 keyfi statik noktaya birden oturamamasının YAPISAL sonucu. **KULAKLA
DOĞRULANMALI** — muhtemelen HER İKİ modun da AT_1/AT_CAP'ı değil, ARADAKİ
(medium/hard sınırı civarı) eğri şeklinin kendisi (ör. iki-parçalı/piecewise
bir eğriye geçmek) yeniden değerlendirilmeli; bu bir SONRAKİ kalibrasyon
turunun konusu, bu turun kapsamı sadece "bağla" idi.

Doğrulama: 15 yeni test (paramsForDifficultyPosition pürüzsüzlük/taban/uç-
değer + Q'nun tavandan sonra SABİT kaldığının doğrulanması + createQuestion
entegrasyonu + boost-only kuralının eğri modunda da korunduğu + proplus'un
eğri dışında kaldığı) + mevcut 223 test DEĞİŞMEDEN geçti — **238/238**.
Tarayıcıda canlı: Otomatik/seviye 1'de 3 şık (AT_1 eşleşiyor, statikle
aynı); Sabit/Pro'da **5 şık** (curve'ün ürettiği, eski statik 6'dan farklı
— tabloyla tutarlı); İpucu Ver/EQ eğrisi/karşılaştırma butonları (Senin
cevabın/Doğru cevap/Temiz)/boss round hepsi çalıştı; Kesim Noktası'na
GEÇİŞ SONRASI da test edildi, regresyon yok; konsolda sıfır hata.

Commit `5870e09` — ADIM 1: **zorluk sisteminin merkezi bağlanması — Kesim
Noktası pilotu.** Önceki turda onaylanan tasarımın (Seçenek C, kademeli
geçiş) İLK adımı: merkezi zorluk matematiği kuruldu + SADECE Kesim Noktası
buna bağlandı. Frekans Bulma'ya HİÇ DOKUNULMADI (bilerek, sıradaki adımda
taşınacak) — iki mod şu an GEÇİCİ olarak farklı mekanizma kullanıyor.

**Merkezi kütüphane (`core/difficulty-curve.js`, artık tek bir global eğri
değil, mod-agnostik matematik kütüphanesi):**
- `logLerp` export edildi (önceden private'tı).
- `applyPostCapFloor(curveValue, level, levelCap, floor, reductionPerStep)` —
  Z1'in "tavandan sonra taban" kalıbının genellenmiş hali; `difficultyParams()`
  bunun üzerinden dogfood edildi (davranış/çıktı DEĞİŞMEDİ, difficulty-curve.
  test.mjs aynı kaldı).
- `continuousLevel(xpProg)` — `progress.xpProgress()`'in `{level,current,
  required}`'ından KESİRLİ seviye (ör. seviye 6'nın %40'ı → 6.4), yuvarlama
  yok.
- `sessionRampOffset(sessionIndex, {boss})` — ısınma (negatif ofset, döngü
  başı) → zorlaşma (pozitif, döngü sonu) → boss (en yüksek, döngüdeki
  konumdan BAĞIMSIZ, çağıranın verdiği GERÇEK `{boss}` bayrağıyla). Döngü
  uzunluğu 5 — `isBossRound()`'un (frekans-bulma.js) kullandığı AYNI periyot,
  ama İKİ AYRI sayaca dayanır (boss'un GERÇEK belirlenmesi: `stats.rounds`,
  ömür boyu; rampanın şekli: `roundsInThisPlaySession`, seans-yerel) — bu
  yüzden ramp kendi "hangi index boss" tahminini YAPMAZ, güvenmez.
- `representativeLevelForTier(tier)` — "Sabit" modun tier→sürekli-seviye
  çapası (TIER_BOUNDARIES aralığının orta noktası; pro için LEVEL_CAP-4).

**Kesim Noktası (`modes/kesim-noktasi.js`) — pilot mod:** statik `DIFFICULTY`
tablosu KALDIRILMADI (geriye dönük uyumluluk + "Sabit" modun çapası +
proplus için hâlâ gerekli) — YANINA `KESIM_CURVE_CONFIG` +
`paramsForDifficultyPosition(position)` eklendi. Eğrinin AT_1/AT_CAP uçları
statik `easy`/`pro` değerleriyle BİREBİR aynı seçildi (geçiş uçlarda
davranış-koruyucu olsun diye); `createQuestion`, `settings.difficultyPosition`
sayısal bir değer VERİLİRSE marginOct/hintBandOct/timeSec/distractorStepOct/
options'ı eğriden hesaplar (boss'un etkisi ARTIK burada tekrar
uygulanmıyor — zaten position'ın içinde, çifte ceza olmasın diye),
VERİLMEZSE (mevcut 435 satırlık test dosyasının TAMAMI, proplus) eski statik
davranışı BİREBİR korur. `generateChoices` imzası `level` string yerine
çözülmüş `{options,step}` alacak şekilde refactor edildi (dışa açık bir
sözleşme değil, test etkilenmedi). `renderHintMask` artık `question.
hintBandOct`'u (createQuestion'ın koyduğu, eğri/statik farkını zaten çözmüş
değer) tercih ediyor.

**app.js:** `currentDifficultyPosition(boss)` yeni — zorlukKonumu = taban
(Otomatik'te `continuousLevel`, Sabit'te `representativeLevelForTier`) +
`sessionRampOffset(roundsInThisPlaySession, {boss})`. `startRound()`'daki
`createQuestion` çağrısına EK bir alan olarak geçiyor (`sessionQuestionIndex`
ile AYNI desen — tek taraflı okunur, Frekans Bulma hiç bakmaz). proplus için
BİLEREK `undefined` döner (curve'ün dışında kalır, Z5 kararıyla aynı çizgi;
kesim-noktasi.js'in `createQuestion`'ı da bunu KENDİSİ bir daha kontrol
ediyor — savunma katmanı). `applyAutoDifficulty()`'nin KENDİSİ (hangi tier'a
yazdığı) BİLEREK DEĞİŞTİRİLMEDİ — Frekans Bulma'nın Otomatik zorluk
davranışı (hangi turda hangi statik satırın okunduğu) BİREBİR aynı kaldı.

**Kapsam dışı bırakılan (bilerek):** round-timer HÂLÂ `currentDifficultyConfig
().time`'dan (statik tier) okuyor — `paramsForDifficultyPosition`'ın
`timeSec`'i HESAPLANIYOR/test ediliyor ama oyun ekranına henüz BAĞLANMADI;
G21'in kulakla hizalanmış geri bildirim/geçiş süresini riske atmamak için
bilinçli bir kapsam kararı, ayrı bir işte ele alınmalı. `renderLevelSheet`
("Seviye" bilgi sayfası) de dokunulmadı — hâlâ global `difficultyParams`'ı
(gainDb/Q dilinde) gösteriyor, Kesim Noktası aktifken bu metin semantik
olarak YANLIŞ/anlamsız kalıyor (marginOct değil gainDb/Q gösteriyor) — bu
ÖNCEDEN de böyleydi (renderLevelSheet hep frekans-bulma-şekilli), bu turun
bir regresyonu DEĞİL, ama düzeltilmesi gereken bilinen bir kalan.

**Kalibrasyon karşılaştırma tablosu (gerçek kod çalıştırılarak ölçüldü,
UYDURULMADI) — statik DIFFICULTY[tier] vs eğrinin o tier'ın temsilci
seviyesinde (`representativeLevelForTier`) ürettiği değer:**

| tier | temsilci sv. | margin eski→yeni | hint eski→yeni | time eski→yeni | opt eski→yeni | step eski→yeni |
|---|---|---|---|---|---|---|
| easy | 2.5 | 1.600→1.402 | 2.00→1.79 | 14→13.52 | 3→3 | 1.20→1.143 |
| medium | 6.5 | 1.000→0.986 | 1.40→1.34 | 12→12.32 | 4→4 | 0.90→1.005 |
| hard | 10.5 | 0.550→0.693 | 0.90→1.00 | 11→11.22 | 5→4 | 0.75→0.883 |
| pro | 14.5 | 0.300→0.487 | 0.50→0.75 | 9→10.23 | 6→5 | 0.65→0.776 |

easy/medium ucu YAKIN (uçlar zaten eğrinin AT_1/AT_CAP'ı statik easy/pro'yla
BİREBİR aynı seçildiği için — beklenen). hard/pro'da GERÇEK bir sapma var:
eğri o iki tier'da statikten daha KOLAY (margin daha geniş, hard/pro'da 1
eksik şık) — tek bir log-eğrinin 4 keyfi noktaya birden tam oturamamasının
doğal sonucu, ZORLAMA (piecewise fit) yapılmadı. **KULAKLA DOĞRULANMALI** —
hard/pro'da Otomatik moddaki bir kullanıcı bu geçişte fark edilir bir
kolaylaşma hissedebilir; AT_1/AT_CAP'ın kulakla yeniden kalibre edilmesi
gerekebilir (bkz. SIRADAKİ).

Doğrulama: 33 yeni test (difficulty-curve.test.mjs +20: logLerp/
applyPostCapFloor/continuousLevel/sessionRampOffset/representativeLevelForTier
saf fonksiyon testleri; kesim-noktasi.test.mjs +13: paramsForDifficultyPosition
pürüzsüzlük/taban/uç-değer testleri + createQuestion entegrasyonu + proplus'un
eğri dışında kaldığının doğrulanması) + mevcut 190 test DEĞİŞMEDEN geçti —
**223/223**. Tarayıcıda canlı: Otomatik/seviye 1'de 3 şık (curve options=3,
statikle aynı — beklenen, AT_1 eşleşiyor); Sabit/Pro'da **5 şık** (curve'ün
ürettiği, eski statik 6'dan FARKLI — kalibrasyon tablosuyla TUTARLI, kod
hatası değil); Frekans Bulma'da SIFIR regresyon (dokunmalı mod, EQ eğrisi,
zone-tip hepsi eskisi gibi çalıştı), konsolda sıfır hata.

Commit `080c884` — G21: **Kesim Noktası TAMAMLANDI, SERT TEST GEÇTİ.**
İki parça: (1) geçiş süresi hizalaması, (2) modun tamamının sert taraması.

**Hizalama:** `submitCutoffGuess`'in geçiş süresi artık Frekans Bulma'nın
`submitFrequencyGuess`'iyle AYNI formül (`prefs.feedbackScreen ? (correct?
4000:6000) : QUICK_ADVANCE_MS`) — öncesinde HER ZAMAN 700ms'ydi, G20'de
eklenen öğretici metin + iki renkli filtre eğrisi okunacak kadar kalmıyordu
(kullanıcı raporu). Kesim Noktası'nın kendi X butonu yok (bilerek) ama
"Atla ▶" zaten mod-bağımsız aynı anında-geçiş işini görüyor — canlı
doğrulandı (6000ms/4000ms dwell JS ile ölçüldü, "Atla" her an anında geçiyor).

**Sert test:** pure-function stress script'i (5000+ soru, 1000+ örnek/zorluk
HPF/LPF dengesi, 6 bölge×2 tip×3 durum=36 öğretici-metin kombinasyonu) + canlı
tarayıcı testi (Kick/sample-kind kaynak, pro zorluk+sabit mod, "10 Soruluk
Bölüm" TAM 10 soru + 2 boss round + seans tamamlama simulatePro ile, A/B
kuru/işlenmiş, konsol) — **kod tarafında SIFIR gerçek bug bulundu.** Test
sırasında "pro'da 3 şık geliyor" gibi görünen bir gözlem, oturumun canları
tükenmişken session-end ekranının stale DOM'unu okumaktan kaynaklanan bir
TEST METODOLOJİSİ artefaktıydı (temiz oturumda pro'nun her zaman 6 şık
ürettiği doğrulandı) — kod değişikliği gerekmedi, sadece not düşüldü.

13 yeni kalıcı test: 36/36 bölge×tip×durum öğretici-metin taraması (boş/
bozuk/teknik-değer-sızdıran metin yok) + 600 sorulu (5 zorluk×8 seans-
indeksi×15 tekrar) tam matris testi — 5 kez tekrarlı çalıştırıldı, flake yok.

Frekans Bulma'ya dokunulmadı — canlı regresyon: accordion, X butonu, rich
panel/EQ eğrisi/karşılaştırma butonları hepsi eskisi gibi, sıfır konsol
hatası. `npm test`: **190/190** (177 eski + 13 yeni).

**Kesim Noktası artık G17-G21'in TAMAMIYLA production-hazır bir şablon:**
HPF/LPF + şıklı + tip gizleme rampası + seans-index eşiği + iki renkli
filtre eğrisi + öğretici Türkçe metin + Frekans Bulma'yla hizalı geçiş
süresi — hepsi sert testten geçti. Kalan tek şey (bilerek kapsam dışı):
karşılaştırma-önizleme butonları (Senin cevabın/Doğru cevap/Temiz) — ayrı
bir iş, engelleyici değil.

Commit `a6c0c74` — G20: Kesim Noktası — cevap sonrası öğretici metin geri
bildirimi (mix mantığı). **Kesim Noktası'nın kapsam dışı bırakılan SON
parçasıydı — mod artık HPF/LPF + şıklı + tip gizleme rampası + iki renkli
filtre eğrisi + öğretici Türkçe metinle tam iskelet.** Üç durum, TEK yerde
(`ZONE_EFFECT` tablosu, kesim-noktasi.js) şablonlanmış: (1) doğru — kısa
onay + o bölgede/tipte filtrenin mix'te ne işe yaradığı; (2) tip doğru,
frekans yanlış — hangi YÖNE kaçtığını (çok yukarı/çok aşağı) + o yöndeki ses
etkisini anlatır (HPF'de yukarı kaçmak DAHA agresif/inceltir, LPF'de yukarı
kaçmak DAHA AZ agresif/fazla tiz bırakır — yön↔etki eşlemesi filtre tipine
göre BİLEREK ters); (3) tip yanlış — HPF/LPF farkını karşılaştırmalı
hatırlatır, frekans hatası bu durumda AYRICA anlatılmaz (kısa tutmak için).
Teknik değer (dB/oct, Q) hiç verilmiyor. `teachingText(question, answer)`
YENİ, saf, doğrudan test edilebilir bir fonksiyon; `getFeedbackData` bunu
çağırıp title/detail'e bölüyor.

**Doğrulama sırasında bulunup aynı commit'te düzeltilen bir hata:** app.js'te
`submitCutoffGuess`, `setFeedback`'i HER ZAMAN `showResult=false` ile
çağırıyordu — Frekans Bulma'nın kalıbından (o, `#freqInfo` zengin panelini
kullandığı için `false` geçiyor) G17'de körü körüne kopyalanmıştı. Kesim
Noktası'nın `#freqInfo` gibi bir paneli YOK — `#feedbackBox` onun TEK geri
bildirim yüzeyi; `showResult=false` iken kart `display:none` kalıyor,
öğretici metin (G13'ten beri, hatta bu görevden önce de) HİÇ GÖRÜNMÜYORDU.
Artık `feedback.showResult` (her zaman `true`) kullanılıyor.

Frekans Bulma'ya (frekans-bulma.js) dokunulmadı — canlı doğrulandı: kendi
`#freqInfo` akışı aynen çalışıyor, `#feedbackBox` hâlâ `display:none` (hiç
sızma yok). Doğrulama ekran görüntüsüyle DEĞİL (QUICK_ADVANCE_MS=700ms'in
altına düşmüyor), JS ile "tıkla+150ms bekle+DOM oku" tekniğiyle yapıldı —
üç durum da (`cls`, `title`, `detail`) tam beklenen metinle doğrulandı
(örnekler için bkz. commit mesajı). `npm test`: **177/177** (168 eski + 9
yeni — 3 durum × üretim doğruluğu + kısalık(<280 karakter) + saflık +
showResult garantisi).

Commit `3a5c84c` — G19: Kesim Noktası — cevap sonrası filtre eğrisi görseli
(kullanıcı + doğru cevap, iki renk). Soru sırasında spektrumda SADECE barlar
görünür (kulakla bulma ilkesi korunur); cevap verildikten SONRA (`!roundActive
&& activeQuestion` — tek gate, hem doğru cevapta hem süre dolunca otomatik)
spektrumun üstüne İKİ eğri çiziliyor: kullanıcının cevabı (amber `--am`
#FFC246) ve doğru cevap (yeşil `--gr` #2BD9A8) — mevcut paletten, yeni renk
yok. Eğriler GERÇEK bir `BiquadFilterNode`'un `getFrequencyResponse()`'u
okunarak çiziliyor (frekans-bulma.js:`getEqCurveForQuestion` ile AYNI teknik),
eksenle (`faXToF`, N=160) aynı log ölçekte örnekleniyor. HPF/LPF yanıtı
peaking'in aksine tek yönlü (0 dB geçen bantta, durdurma bandında -∞'a
yaklaşır) — 0 dB ÜSTE (düz, geçen bant), -30dB ALTA (durdurma bandı) oturan
tek-yönlü bir eşleme kullanıldı; "HPF solda iner sağda düz, LPF sağda iner
solda düz" görünümü bundan DOĞAL olarak çıkıyor, elle yön mantığı yazılmadı.

Kullanıcının cevabı (freq+filterType) yeni bir app.js değişkeninde
(`cutoffGuess`) tutuluyor — frekans-bulma.js'in `freqGuessHz`'i sadece Hz
taşıyor, bu modun cevabı hem frekans HEM tip içerdiği için (tip gizli
sorularda yanlış tip seçilebiliyor) ayrı bir alan gerekti; `submitCutoffGuess`
answer'ı AYNEN (yanlış tip dahil) kaydediyor — kullanıcı yanlış tip seçtiyse
eğrisi de o YANLIŞ tipte çiziliyor (öğretici, canlı doğrulandı). Her yeni
soruda (`renderQuestion`) null'a dönüyor; `drawVisualizer`'ın `overlayState`'ine
eklendi, Frekans Bulma bu alanı hiç okumuyor.

Doğrulama (tarayıcıda, canlı): iki eğri farklı renkte çiziliyor (amber+yeşil,
küçük lejant, zoom ile renk ayrımı doğrulandı); soru sırasında eğri gizli
(sadece bar+eksen); HPF/LPF yönü ve kesim frekansı hizası doğru (761 Hz LPF
amber + 1.75 kHz HPF yeşil aynı ekranda, ikisi de doğru yönde/frekansta);
doğru cevapta tek yeşil çizgi görünüyor (amber tam örtüşüyor, altta); tip
yanlış seçilince kullanıcı eğrisi doğru cevabın TAM TERSİ yönünde çiziliyor
(yukarıdaki 761Hz LPF/1.75kHz HPF örneği). `npm test`: **168/168**. Frekans
Bulma regresyonu yok (kendi peaking-EQ eğrisi/panel canlı doğrulandı, sıfır
konsol hatası).

Commit `71dad21` — G18: Kesim Noktası — tip gizleme seans içi rampaya bağlandı,
"Dokunmalı" gizlendi, sıkı bug taraması. Cihaz testinde bulunan iki sorun +
şablon olacağı için modun genelinde derinlemesine bug taraması istendi.

**Sorun 1 çözümü:** tip gizleme (HPF/LPF SÖYLENİR mi SÖYLENMEZ mi) artık
zorluğa DEĞİL, oyun oturumu içindeki soru sırasına bağlı — her fresh-start'ta
sıfırlanan yeni bir sayaç (`roundsInThisPlaySession`) ilk `TYPE_REVEAL_
QUESTION_COUNT` (=3) soruda tip söyler, sonrasında HANGİ zorlukta olursa olsun
gizler. **Doğrulama sırasında bulunan gerçek bir hata:** ilk denemede eşik
`session.correct+session.wrong`'a bağlanmıştı — ama `session` SADECE Seans
Sonu ekranının 3 CTA'sında sıfırlanıyor, normal "Oyunu Başlat" tuşu ona hiç
dokunmuyor (kod incelemesiyle doğrulandı, `resetSession()`'ın yorumundaki
"Oyunu Başlat" iddiası YANLIŞ/bayat — düzeltilmedi, sadece not edildi). Bu,
Durdur→Oyunu Başlat ile devam eden GERÇEKTEN yeni bir oturumda bile eşiğin
daha ilk turda tetiklenmesine yol açıyordu (canlı doğrulandı). Ayrı, dar
kapsamlı bir sayaçla düzeltildi — `session`'ın kendisine dokunulmadı.

**Sorun 2 çözümü:** "Dokunmalı" toggle'ı (chip + Oyun Ayarları satırı) artık
Kesim Noktası'nda gizli — aktif modun `getMeta().choiceOnly` bayrağına göre
(yeni, opsiyonel meta alanı) `syncAnswerFormatVisibility()` ikisini birden
gizler/gösterir. Frekans Bulma'da (choiceOnly yok) davranış değişmedi.

**Sıkı bug taraması bulguları:** HPF/LPF dengesi 2000-3000 örneklik testlerle
KANITLANDI dengeli (~%49/%51) — "hep LPF geldi" gözlemi kod bugı DEĞİL, küçük
örneklem tesadüfüydü. UÇ DEĞER sorunu GERÇEKTİ: FA_MIN–FA_MAX (80 Hz–17 kHz)
Frekans Bulma'nın PEAKING bant merkezleri için seçilmişti, HPF/LPF KESİMİ için
uygun değildi — kesim havuzu artık dar `CUTOFF_MIN`–`CUTOFF_MAX` (100 Hz–8 kHz)
aralığına alındı (sınırlar KULAKLA DOĞRULANMADI, makul başlangıç noktası).
Çeldirici üretiminde tekrarlanan frekans/GÖRÜNEN ETİKET yok (yeni test);
zorlukla ölçekleme (şık sayısı 3/4/5/6, mesafe/margin) canlı+testle doğrulandı;
A/B (kuru/işlenmiş) canlı doğrulandı, audio-engine.js'e dokunulmadı;
evaluateAnswer'ın dizi-konumundan bağımsız değerlendirmesi ve tip-gizli
edge case'i testle garanti altına alındı. Bir test flake'i bulunup düzeltildi
(boss-round mesafe testi N=80→600, 8/8 tekrarlı çalıştırmada temiz).

Kapsam korundu: filtre eğrisi görseli/öğretici geri bildirim EKLENMEDİ (sonraki
prompt), createQuestion/evaluateAnswer saf fonksiyon kaldı. Frekans Bulma'ya
regresyon yok (canlı doğrulandı: dalgaya tıklama, EQ eğrisi, zone-tip,
karşılaştırma butonları, "Dokunmalı" chip'i hepsi eskisi gibi). `npm test`:
**168/168** (140 eski + 28 kesim-noktasi).

Commit `304946c` — G17: **Mod 2 "Kesim Noktası" — çalışan iskelet** (HPF/LPF
kesim frekansı bulma, şıklı cevap, zorlukla tip ayrımı). Frekans Bulma'dan sonra
ilk GERÇEK ikinci mod — bu, `app.js`'in `mode.X()` genel dispatch mekanizmasının
(registry.js) BİRDEN FAZLA mod arasında ilk kez fiilen çalıştığı yer. `mode`
artık module-seviyesi bir `let` (önceden `const` idi, tek mod olduğu için hiç
değişmiyordu) — menüden hangi karta basıldığına göre değişiyor (bkz.
`renderModeGrid`'in kart click handler'ı, mod değişiminde eski modun round'u/
sesi/ekran metni temizleniyor).

`www/js/modes/kesim-noktasi.js` (yeni, ŞABLON niyetiyle yazıldı — 6 sözleşme
fonksiyonu + Frekans Bulma'yla aynı-isimli render yardımcıları). Frekans-ekseni
sabitleri (FA_MIN/FA_MAX/AXIS_H/faXToF/faFToX/FA_ZONES/faZoneOf/recordZone/
isBossRound) frekans-bulma.js'ten re-export edilir (jenerik, mode-bağımsız,
duplike edilmedi). Kesim frekansı merkeze (log-geometrik orta, ~1166 Hz) en az
`marginOct` oktav uzakta seçilir (kolayda büyük/uca yakın, zorlaştıkça küçülüp
merkeze yaklaşır) — **bu eşleme KULAKLA DOĞRULANMADI**, Z1'in hassasiyet
eğrisiyle AYNI durum (bkz. dosya başı yorum), makul bir başlangıç noktası.
Kolay/orta: tip söylenir, tüm şıklar aynı tipte. Zor/pro: tip gizlenir, en az
bir çeldiricinin filtre tipi ÇEVRİLİR (doğru şık hariç) — kullanıcı gerçekten
hem tip hem frekans ayrımı yapmak zorunda kalır. Şık sayısı 3/4/5/6
(DIFFICULTY.options). `applyProcessing` tek bir BiquadFilterNode (Q=0.707 sabit,
eğim zorlukla değişimi KAPSAM DIŞI) kurup audio-engine.js'in mevcut kuru/işlenmiş
A/B yoluna bağlanır — o dosyaya DOKUNULMADI.

**Kapsam dışı (bilerek, sonraki bir prompt):** filtre eğrisi görseli
(drawOverlay sadece frekans eksenini çizer), öğretici zone-tip metni,
karşılaştırma-önizleme butonları (Senin cevabın/Doğru cevap/Temiz — app.js'in
`#freqInfo` click-delegasyonu hâlâ SADECE "frequency" moduna kilitli).
`submitCutoffGuess` bu yüzden `submitFrequencyGuess`'in YAPISAL PARALELİ olarak
AYRI yazıldı (ortak "submitAnswer" özütlemesi yerine) — gerçek tekrar ağrısı
3. modda netleşince ortak bir çekirdek çıkarılabilir.

**Doğrulama sırasında bulunup aynı commit'te düzeltilen bir hata:** `#gameTitle`
(oyun ekranı başlığı) `index.html`'de statik "Frekans Bulma" metniydi, `app.js`
hiç güncellemiyordu (tek mod varken sorun değildi — ilk kez Kesim Noktası'na
girilince başlık YANLIŞ "Frekans Bulma" göstererek fark edildi). Artık her kart
tıklamasında doğru mod adıyla senkronlanıyor; aynı kökten, seans-sonu ekranının
"veri yok" fallback başlığı da aktif modun katalog adına bağlandı.

**Dürüst not — ÜRÜN KARARI GEREKTİRİYOR:** `mode-catalog.js`'teki kesim-noktasi
girdisi `unlockLevel:2` — ama `academyLevel` formülü (Z3) HİÇ oynanmamış bir
modun bile +1 katkı yaptığı bilinen bir ödün taşıyor (DURUM.md'de "2. mod
eklendiğinde yeniden değerlendirilmeli" diye ÖNCEDEN kayıtlıydı, bkz. BEKLEYEN
KARARLAR B). Sonuç: kesim-noktasi artık KAYITLI olduğu İÇİN academyLevel
otomatik 2'ye çıkıyor ve kendi kilidini kendi açıyor — canlı doğrulandı (az
ilerlemiş bir hesapta kart hiç kilitli görünmedi, doğrudan oynanabilir geldi).
Kod tarafında dokunulmadı — bu formülün nasıl değişmesi gerektiği (ya da bu
davranışın kabul edilip edilmeyeceği) bir ürün kararı.

Doğrulama (tarayıcıda + npm test): mod oynanabilir (menüden "Kesim Noktası"
başlığıyla oyun ekranı açılıyor, round başlıyor); HPF/LPF gerçekten uygulanıyor
(spektrumda roll-off görsel olarak doğrulandı); zorlukla tip ayrımı çalışıyor
(medium: "Bu bir LPF, kesim frekansı nerede?" + tüm şıklar "LPF"; pro: "Ne tür
filtre, hangi frekansta?" + 6 şıktan 5'i HPF 1'i LPF, canlı ekran görüntüsüyle
doğrulandı); şık sayısı medium'da 4, pro'da 6; boss round doğru çalışıyor;
Frekans Bulma'da REGRESYON YOK (mod değiştirilip geri dönüldüğünde başlık/
Dokunmalı chip/EQ eğrisi/zone-tip/karşılaştırma butonları hepsi eskisi gibi,
konsolda sıfır hata). `npm test`: **160/160** (140 eski + 20 yeni
kesim-noktasi testi).

Commit `ae50e9d` — G16: Kaynak menüsü accordion gruplara çevrildi (kullanıcı
raporu — SENTETİK/DAVUL/ENSTRÜMAN/KENDİ DOSYAM düz liste halinde hepsi açık
duruyordu, "Kendi Dosyam" en altta kalıp ulaşmak için çok kaydırma
gerekiyordu). `openSheet()`'in `<optgroup>`'lu select'ler (bugün için sadece
`sourceSelect`) için ürettiği grup başlıkları artık tıklanabilir birer
`.sheet-group-header` (gerçek `<button>`, D3'te bulunan WebKit flex-buton
genişlik hatasından kaçınmak için `width:100%+text-align:left` açıkça set)
— yanında chevron (▸, açılınca 90° dönüp amber oluyor). Grup gövdesi
VARSAYILAN kapalı (`.collapsed`); `collapseOtherGroups()` bir başlığa
basılınca DİĞER açık grupları kapatıp tıklanan grubu toggle ediyor — tek
açık kuralı. Boş grup gizleme yeni bir mekanizma gerektirmedi:
`populateSourceSelect()`'in var olan `sources.length>0` filtresi
korunduğu için boş `<optgroup>` zaten hiç üretilmiyor, accordion'da da
boş başlık çıkmıyor. Kapsam: sadece sheet'in DOM/CSS üretimi değişti —
`select.value`/`change` akışı, `source-catalog.js`, ses zinciri, A/B,
pitch, pause/resume, WAV parser, X butonu/otomatik geçiş dokunulmadı;
gruplanmamış select'ler (Zorluk/Oyun Türü/Süre/Cevap biçimi) davranış
değiştirmedi (`currentBody` hep `sheetOptions`).

Doğrulama (tarayıcıda, DOM state ölçümüyle): 4 grup accordion, başlığa
basınca açılıyor (ENSTRÜMAN'a basınca 4 satır göründü); tek açık kuralı
JS ile ölçüldü (ENSTRÜMAN açıkken KENDİ DOSYAM'a basınca ENSTRÜMAN
otomatik kapandı, aynı anda tam 1 grup `.open`); sheet HER açılışta 4
grup da kapalı geldi (kapatıp yeniden açılarak doğrulandı); sadece 4
gerçek grup render edildi, fazladan/boş başlık yok; DAVUL > Kick seçildi,
pill "Kick" oldu, round gerçekten Kick kaynağıyla başladı, konsolda sıfır
hata. `npm test`: 140/140.

Commit `77278b8` — G15: X butonu otomatik geçişle BİRLİKTE geri geldi,
**madde 13 KAPANDI**. G14'te kaldırılan `.freq-info-close` butonu geri
eklendi (`frekans-bulma.js`'in iki panel fonksiyonu, `styles.css`,
`app.js`'in `#freqInfo` click-delegasyonu) — G13'ten farklı olarak bu kez
otomatik geçiş mekanizmasıyla ÇAKIŞMADAN birlikte çalışıyor: X'e basan
hemen `goToNextRound()` ile ilerler, basmayan normal otomatik geçişi
bekler, karşılaştırma butonuna basan için otomatik geçiş dinleme
bitene kadar ertelenir.

Madde 13'ün kök sebebi (`loopAwarePreviewMs`'in karşılaştırma-sonrası
geçiş beklemesini kaynağın TAM DÖNGÜ uzunluğuna yuvarlaması — uzun
yüklenen dosyada dakikalarca sürebiliyordu) çözüldü: `audio-engine.js`'ten
`loopAwarePreviewMs` TAMAMEN kaldırıldı (grep doğrulandı — export'ta/kodda
kalmadı, sadece bunu açıklayan bir yorum satırında adı geçiyor). Yerine
`app.js`'te sabit `CMP_PREVIEW_RESUME_MS=3000` geldi — geçiş beklemesi
artık kaynak uzunluğundan TAMAMEN bağımsız. Önizleme sesi (`loop:true`)
bu noktada durdurulmuyor, kesilmeden çalmaya devam ediyor; sadece
otomatik-geçiş zamanlayıcısı bu sabit süre sonunda yeniden kuruluyor.

**Doğrulama sırasında ikinci, daha ciddi bir hata bulundu ve düzeltildi:**
`cmpPreviewStopTimer`'ın geri çağrısı, `roundFlow.captureRemainingAndClear()`
`null` DÖNMEDİĞİNDE `ensureAutoNext`'i yeniden kuruyordu. Orijinal
cevap-sonrası otomatik-geçiş zamanlayıcısı, kullanıcı karşılaştırma
butonuna basana kadar zaten ateşlenmişse (gerçek kullanımda birkaç saniye
sürebilir — otomasyon ortamında da tekrar tekrar gözlendi) `captureRemainingAndClear()`
`null` döner; bu durumda geçiş HİÇ yeniden kurulmuyordu ve tur KALICI
olarak askıda kalıyordu (X/Atla dışında çıkış yolu yoktu) — madde 13'ün
"geç gelir" tanısından daha kötü bir "hiç gelmeyebilir" davranışı.
Canlı testte doğrulandı: 20 saniyelik yüklenmiş WAV'da "Doğru cevap"
önizlemesine basıldıktan sonra tur 15+ saniye boyunca hiç ilerlemedi,
konsolda hata yok. Düzeltme: `remain` null/0 olsa bile `ensureAutoNext`
her zaman çağrılıyor — `roundFlow` zaten null/0 durumunda 1500ms
varsayılana düşüyor (`round-flow.js: ensureAutoNext`).

Doğrulama (tarayıcıda, `test-pause.wav` — 20sn'lik yüklenmiş WAV ile):
X butonu görünür ve basınca feedback paneli anında kapanıp yeni tur
başlıyor (~500ms içinde); hiçbir şeye basmadan bekleme normal otomatik
geçişle ilerliyor (müdahalesiz art arda birden fazla tur); "Doğru cevap"
önizlemesine basıp dinleme artık kalıcı askıda KALMIYOR, birkaç saniye
içinde tur ilerliyor — düzeltmeden önce dakikalarca (hatta hiç) gelmeyen
geçiş artık güvenilir. `npm test`: 140/140.

Commit `0cfd4e3` — G14: geri bildirim geçişi X butonundan tamamen otomatiğe
çevrildi (kullanıcı kararı — X'in "devam mı/çıkış mı/atla mı" olduğu
yorumlanabilir bulundu, akış buton olmadan tamamen otomatik olmalı).
G13'ün eklediği `.freq-info-close` butonu (frekans-bulma.js'in iki panel
fonksiyonundan, styles.css'ten, app.js'in `#freqInfo` click-delegasyonundan)
kaldırıldı. `goToNextRound()` KORUNDU (hâlâ "Atla ▶" tarafından kullanılıyor).
Karşılaştırma-önizlemesi-bitince-otomatik-geçiş-yeniden-kurma mekanizması
(`cmpPreviewStopTimer` bloğu: `captureRemainingAndClear` → dinletme biter →
aynı kalan süreyle `ensureAutoNext`) HİÇ DOKUNULMADI — G13'ten önce de
vardı, X eklenirken üstüne sadece bir dal eklenmişti; o dalı kaldırınca kod
otomatik olarak G13-öncesi doğru davranışına döndü. "Geri bildirim ekranı"
ayar toggle'ı (`prefs.feedbackScreen`) TAMAMEN KORUNDU, hiç değişmedi.

**Dürüst teknik not:** kullanıcının "bu, asıl kilitlenme sorununu da
çözer" varsayımı KISMEN doğru — otomatik yeniden-kurma zaten çalışıyordu
(G13'te bozulmamıştı). Ama G13'ün asıl teşhis ettiği kök neden
(`loopAwarePreviewMs`'in UZUN yüklenen dosyalarda önizleme bitiş süresini
TAM DÖNGÜYE — dakikalarca — yuvarlaması, `audio-engine.js`, DOKUNULMADI,
"ses çalma" davranışı kritik-korunacaklar listesindeydi) bu turda
ÇÖZÜLMEDİ — çok uzun bir şarkıda karşılaştırma dinleyen kullanıcı için
sonraki soru hâlâ dakikalarca gecikebilir, sadece artık "asla gelmeyecek"
değil "geç gelecek" (bkz. AÇIK İŞLER madde 13).

Doğrulama: 6 yeni birim testi (`test/round-flow.test.mjs`, `node:test`'in
`mock.timers`'ıyla — 140/140 toplam): tek seferlik tetikleme, kalan süreyi
doğru yakalayıp zamanlayıcıyı iptal etme (dinlerken soru DEĞİŞMEZ), yakalanan
süreyle yeniden kurulunca o süre sonunda tetiklenme, art arda dinletmede
SADECE SONUNCUSUNUN sayılması. Tarayıcıda: kartta X yok (ekran görüntüsü),
"Doğru cevap" tıklanıp HİÇBİR buton kullanılmadan round kendiliğinden
ilerledi (Soru 151→153), sıfır konsol hatası.

Commit `4119bce` — G13: geri bildirimde X (kapat) butonu + "Geri bildirim
ekranı" ayarı (kullanıcı raporu — karşılaştırma butonuna basınca sonraki
soruya geçiş kilitleniyordu, cihazda doğrulanmıştı). Kök sebep KANITLANDI:
sonraki soruya geçiş `roundFlow.ensureAutoNext()`'in kurduğu bir
`setTimeout` ile tetikleniyor; karşılaştırma butonuna basınca bu BİLEREK
duraklatılıyor, önizleme bitince `audioEngine.loopAwarePreviewMs(3000)` ile
hesaplanan bir süre sonra devam ediyor — bu fonksiyon süreyi kaynağın TAM
DÖNGÜ uzunluğuna yuvarlıyor (kısa gömülü örnekler için doğru tasarım). G7/
G8'den beri "upload" kaynağının `AudioBuffer`'ı KULLANICININ YÜKLEDİĞİ TÜM
ŞARKI kadar uzun olabiliyor — 20 saniyelik bir dosyada yuvarlama 3000ms'yi
20000ms'ye çıkarıyor, dakikalarca sürebilecek dosyalarda kullanıcı fiilen
kilitlenmiş gibi görünüyordu.

Çözüm 1 — X butonu: `showFreqInfoPanel`/`showProPlusInfoPanel`'in kurduğu
karta `.freq-info-close` eklendi (mevcut `#freqInfo` click-delegasyonuna
dahil, yeni dinleyici açılmadı). "Atla ▶"'nın çalışan ilerletme mantığı
`goToNextRound()` adıyla ortak fonksiyona çıkarıldı; X hem bunu çağırıyor
hem karşılaştırma önizlemesinin bekleyen zamanlayıcısını iptal ediyor —
uzun bir önizleme sürsün ya da sürmesin HER ZAMAN çalışan bir çıkış yolu
var artık. `loopAwarePreviewMs`'e (ses çalma davranışı) dokunulmadı —
otomatik yol hâlâ uzun sürebilir ama artık TEK yol değil.

Çözüm 2 — "Geri bildirim ekranı" ayarı: `prefs.feedbackScreen` (varsayılan
`true`), Bildirimler/Kulaklık uyarısı ile AYNI localStorage/toggle deseni.
Kapalıyken cevap sonrası panel HİÇ açılmıyor, `scheduleNext()`
`QUICK_ADVANCE_MS` (700ms) kullanıyor — skor/XP/can mantığı DEĞİŞMEDİ,
sadece görsel kart ve bekleme süresi. **Kapsam notu:** `submitProPlusGuess`
(Pro Plus zorluğu) bilerek KAPSAM DIŞI bırakıldı — `revealAnimator`'ın
kendi bant-bant açılma animasyonu hızlı-ilerleme ile çakışma riski
taşıyordu; X butonu proplus panelinde de var ama ayar toggle'ı sadece
frekans modunda etkili.

Doğrulama: 4 yeni birim testi (`freshPrefs`/`loadPrefs`, 130→**134**).
Tarayıcıda: 20sn'lik gerçek bir WAV yüklenip cevap verildi, "Doğru cevap"
önizlemesi tıklanıp HEMEN ardından X tıklandı — round anında ilerledi
(20sn beklemeden), sıfır konsol hatası. Ayar kapatılınca `#freqInfo` hiç
açılmadı (`classList.contains('hidden')===true`), round hızlı ilerledi;
switch localStorage ile senkron doğrulandı (kapalı↔açık). `npm test`:
134/134. **iOS cihazda kulakla doğrulama kullanıcıda.**

Commit `5d86afa` — G12: yüklenen ses cevap verince duraklıyor, kaldığı
yerden devam ediyor (kullanıcı raporu — cihazda doğrulanmıştı, "ses geri
bildirimde ilerliyor" bug'ı). Kök sebep KANITLANDI (kod incelemesi + canlı
ölçüm): cevap-işleme yolları `audioEngine.stopAudio()`'yu zaten
çağırıyordu (ses fiziksel olarak susuyordu) ama `stopAudio()` `upload.js`'in
mantıksal `offset`/`startedAt`/`playing` durumundan HABERDAR DEĞİLDİ — bir
sonraki `getSourceNode()` çağrısı `playing` hâlâ `true` olduğu için GERÇEK
(duvar saati) geçen süreyi offset'e ekliyordu. Canlı ölçüm: cevap sonrası
`pausePlayback()` hiç çağrılmadan art arda iki `getSourceNode()` çağrısı
offset'i 0.000→14.611→4.764'e sıçrattı.

Çözüm — TEK merkezi düzeltme: `audio-engine.js`'e `activeUploadManager`
referansı eklendi (`buildQuestionChain` her çağrıldığında `sourceType===
"upload"` ise güncellenir). `stopAudio()` artık HER çağrıldığında (cevap
verme, karşılaştırma önizlemesi bitişi, Durdur, oyun bitti, mod değişimi —
app.js'teki ~10 çağrı sitesinin HİÇBİRİNE dokunmadan) fiziksel durdurmayla
AYNI ANDA `pausePlayback()`'i de çağırıp offset'i donduruyor. Karşılaştırma
dinletmesi ayrıca ele alınmadı — YAPISAL olarak aynı `getSourceNode()`'u
kullanıyor, donmuş offset'i otomatik okuyor. Gömülü/sentetik kaynaklar
`activeUploadManager=null` olduğu için hiç etkilenmedi.

Doğrulama: 5 yeni birim testi (`test/upload-pause-resume.test.mjs`,
125→**130** — start/pause/resume, pause-olmadan-drift regresyon
karşılaştırması, buffer-aşımı modulo, startFromZero, art-arda-pause).
Tarayıcıda gerçek WAV yüklendi, ~10sn çaldıktan sonra cevap verildi —
offset 9.9265'te donduruldu; birkaç GERÇEK saniye sonra otomatik başlayan
YENİ tur TAM 9.9265'ten devam etti (hiç ilerlemedi). Ardından "kick"
(gömülü örnek) sorunsuz çaldı, konsolda sıfır hata (regresyon yok).
`npm test`: 130/130. **iOS cihazda kulakla doğrulama kullanıcıda** — bu
ortamda gerçek cihaz yok.

Commit `6ce73a8` — G11: upload dosya boyutu sınırı 30→**100 MB**. Kullanıcı
gerçek WAV dosyalarının 30 MB'ı aştığını bildirdi. OOM riski (G8'de 30 MB'ın
seçilme sebebi — decodeAudioData sıkıştırılmış formatları büyük PCM'e açar,
iOS WKWebView'ı çökertebilir) mp3/m4a/aac/ogg için hâlâ geçerli olduğu
açıklandı; kullanıcı bunu BİLEREK kabul ederek tek sınırı 100 MB'a çıkardı
(WAV zaten sıkıştırılmamış olduğu için kendisi güvenli, ama sınır tüm
formatlara ortak). Sadece `MAX_AUDIO_FILE_MB` sabiti değişti — kilitlenme
çözümü (G8), WAV parser (G10), çalma yolu dokunulmadı. `npm test`: 125/125
(değişmedi).

Commit `f603693` — G10: WAV yüklemesi kalıcı düzeltildi, **E1 KAPANDI**
(kök sebep artık kanıtlı — eski E1 girdisindeki "BİREBİR KANITLANAMADI"
notu geçerliliğini yitirdi, bkz. aşağıdaki E1 tarihçesi). G8'de upload
decodeAudioData yoluna taşınınca WAV kırıldı: kök sebep, iOS WKWebView'in
decodeAudioData'sının bazı WAV alt-tiplerini (24-bit PCM, 32-bit float —
Logic Pro/Pro Tools'un WAVE_FORMAT_EXTENSIBLE ile export ettiği alt-tipler)
açamaması, bilinen bir WebKit sınırlaması. Masaüstü Chrome'da bu hatayı
ÜRETEMEDİM (decodeAudioData üçünü de sorunsuz decode etti) — bunun yerine
`decodeAudioData`'yı geçici olarak her zaman reddedecek şekilde yamalayıp
iOS'taki başarısızlığı KONTROLLÜ olarak simüle ettim, düzeltmenin
devreye girdiğini kanıtladım.

Çözüm: `www/js/core/wav-parser.js` — SAF fonksiyon (`decodeWavPcm`,
AudioContext/DOM bağımlılığı yok), RIFF/fmt/data chunk'larını elle
ayrıştırıp PCM/float veriyi Float32'ye çeviriyor (8/16/24/32-bit PCM +
32/64-bit float, WAVE_FORMAT_EXTENSIBLE SubFormat GUID'i dahil).
`upload.js`: önce `decodeAudioData` dener (KOPYA üzerinde — orijinal
arrayBuffer WAV yedeği için sağlam kalır), başarısız olur ve dosya
RIFF/WAVE imzalıysa `decodeWavPcm`'e düşer, sonucu `audioCtx.createBuffer`+
`copyToChannel` ile AYNI AudioBuffer'a çevirir — gömülü örneklerle AYNI
AudioBufferSourceNode zincirine girer. İkisi de başarısız olursa
AudioContext'e dokunmadan net hata, pink noise'a SESSİZCE düşülmüyor.

Doğrulama: 8 yeni birim testi (16/24/32-bit/stereo/EXTENSIBLE/hata
senaryoları, 117→**125**). Tarayıcıda gerçek 523.25 Hz sinüs WAV'ları
(16/24/32-bit float) yüklendi — Chrome'da native decode başarılı; ardından
decodeAudioData yamalı-başarısız haldeyken AYNI 24-bit ve 32-bit float
dosyalar tekrar yüklendi: konsolda "decodeAudioData hatası → elle WAV
ayrıştırma BAŞARILI", round başlatıldı, spektrum doğru 523 Hz tepesini
gösterdi (pink fallback DEĞİL). Yama kaldırıldıktan sonra "kick" (gömülü
örnek) sorunsuz çaldı — G8'in kilitlenme çözümü BOZULMADI. `npm test`:
125/125. **iOS cihazda gerçek Logic Pro WAV'ının çalıştığı kullanıcı
tarafından doğrulanacak** — bu ortamda gerçek cihaz yok.

G9 — "odak aralığı spektrumu daraltmıyor" teşhisi (kod değişikliği YOK,
sadece DURUM.md notu — bkz. AÇIK İŞLER madde 11). Kullanıcı raporu G7/G8'in
(AudioBufferSourceNode geçişi) analyser bağlantısını kopardığını
varsayıyordu — kod incelemesiyle (git log + doğrudan kaynak okuma) bunun
YANLIŞ olduğu kanıtlandı: (1) odak aralığı seçimi doğru yere ulaşıyor ve
GERÇEKTEN çalışıyor, ama SADECE soru üretim havuzunu (`createQuestion`'a
geçen `focusRange`) daraltıyor; (2) spektrum ekseni M1-4'ten (`5c608f4`,
aylar önce) beri `FA_MIN`/`FA_MAX` (80 Hz–17 kHz) sabitine kenetli — kodun
kendi yorumu bunu açıkça belgeliyor, hiçbir zaman odak aralığından
beslenmedi; (3) `analyser`/`masterGain`/`muteGain` bağlantısı G4-G8'in
HİÇBİRİNDE değişmedi (`git log -p` ile üç commit tek tek tarandı). Sonuç:
"önceden çalışıyordu" öncülü yanlıştı — bu bir regresyon değil, davranış
her zaman böyleydi. Kullanıcı onayıyla (ekseni de daraltmak ayrı, riskli
bir refactor — FA_MIN/FA_MAX okuyan tüm çizim fonksiyonları + tıklama→Hz
haritalaması etkileniyor) kod değişikliği yapılmadı, bulgu AÇIK ÖZELLİK
olarak kaydedildi.

Commit `e9dfd4e` — G8: kullanıcı dosyası yükleme AudioBuffer'a taşındı, "ses
motoru kilitleniyor" bug'ı çözüldü (E1'in devamı — WAV picker sorunundan
AYRI, yeni bir bug: kullanıcı dosya yükleyince TÜM kaynaklar çalmaz
oluyordu). Kök sebep KOD İNCELEMESİYLE teşhis edildi (tahmin değil):
tek AudioContext var (grep doğrulandı), createMediaElementSource path
başına bir kez çağrılıyordu, null mediaSource'la buildQuestionChain'e
ulaşan bir yol da yoktu — yani "çift context" ve "çift createMediaElementSource"
hipotezleri EKARTE edildi. Geriye kalan açıklama: G7'de gömülü örnekler
AudioBufferSourceNode'a taşınmıştı ama kullanıcı dosyası hâlâ
MediaElementAudioSourceNode kullanıyordu — AYNI ses grafiğinde İKİ FARKLI
source-node tipinin karışması, iOS WebKit'te bilinen ama bu ortamda
(masaüstü Chrome) yeniden üretilemeyen bir etkileşim sorunu.

Kullanıcı onayıyla (30 MB/OOM trade-off'u soruldu): upload.js tamamen
AudioBuffer yoluna taşındı (File.arrayBuffer()+decodeAudioData+
AudioBufferSourceNode, gömülü örneklerle AYNI çalma yolu). MAX_AUDIO_FILE_MB
120→**30** (decodeAudioData sıkıştırılmamış PCM'e açar — 120 MB'lık bir
dosya 2+ GB'a çıkıp OOM ile çökertebilirdi, try/catch bunu YAKALAYAMAZ).
Pozisyon elle takip ediliyor (offset/startedAt — AudioBufferSourceNode
pause/resume desteklemiyor), her tur/karşılaştırma-önizlemesi TAZE bir node
alıp kaldığı yerden devam ediyor.

Tarayıcıda GERÇEK doğrulama: sentetik bir WAV (440 Hz) yüklendi ve çalındı
(spektrum beklenen dar tepeyi gösterdi), AYNI oturumda ARDINDAN "kick" ve
"hihat" (gömülü örnekler) ayrı ayrı sorunsuz çaldı, konsolda sıfır hata —
yani upload SONRASI gömülü kaynaklar KİLİTLENMEDİ (bildirilen bug'ın tam
tersi canlı doğrulandı). 30 MB üstü dosya AudioContext'e dokunmadan
reddediliyor (canlı test edildi). `npm test`: 117/117. **Metodolojik not:**
doğrulama sırasında dev sunucusunun (python http.server, Cache-Control
header'ı yok) bazı JS modüllerinin Chrome'da agresif önbelleklendiği
(yeni sekme + hard reload bile yetmedi) keşfedildi — `fetch(url,
{cache:'reload'})` ile elle tazelendi; bu sadece bu geliştirme ortamına
özgü, üretim/iOS bundle'ını etkilemiyor. **iOS cihazda kilitlenmenin
gerçekten kalktığı kullanıcı tarafından doğrulanacak.**

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

Commit `bc45b38` — E1: "Dosya seç" ile WAV seçilemiyordu (bug) — **KAPANDI**,
bkz. G10 (yukarıda BİTTİ'nin başında): asıl kök sebep (decodeAudioData'nın
bazı WAV alt-tiplerini açamaması) elle WAV parser'ıyla çözüldü. Kod tarafında
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

**(Kaynak koda karşı doğrulandı, G59 sonrası.)** Aşağıdaki maddeler tek tek mevcut
kaynak koddan (`grep`/`git log`/dosya okuma ile) yeniden kontrol edildi;
sadece BAŞLIKTAKİ mod sayıları değil, madde İÇERİĞİ de doğru mu diye
bakıldı. Beş madde bu turda stale çıktı (kod çoktan değişmiş ama not hiç
güncellenmemiş) — aşağıda işaretlendi.

### Bug'lar

**1. ~~Geri bildirim kartı ilk saniyelerde alt bar'ın altında~~ — D1'de düzeltildi, `a1c837a`**
Üç kez ölçüm-tabanlı çözüm denenmiş, tutmamıştı. D1'de mimari değişti: padding
yerine CSS `--actionbar-h` değişkeninden margin-bottom (`styles.css:51`) —
ölçüme hiç bağlı değil, ilk boyamadan itibaren doğru; kod hâlâ bu şekilde
(doğrulandı). Aynı turda şıklı cevap modundaki 4-6 şıklık grid'in altbar
arkasında kalması da (aynı kökten) düzeltildi. Simülatör/cihazda gerçek
render henüz KONTROL EDİLMEDİ — sadece masaüstü Chrome'da gerçek DOM
ölçümüyle doğrulandı (bkz. commit mesajı).

**2. Pause sonrası ilk play'de duraksama — TEŞHİS ARTIK GEÇERSİZ, YENİDEN test edilmeli**
Orijinal not "canplay/waiting event'leri, preload ayarı" bakılmasını
öneriyordu — bu, o zamanki HTMLAudioElement tabanlı çalma yoluna aitti.
Kod incelemesiyle doğrulandı: bu event isimleri (`canplay`/`waiting`)
kod tabanında ARTIK HİÇ GEÇMİYOR — G8/G12 (`upload.js`) ile mimari kökten
değişti, upload artık `AudioBufferSourceNode`+elle offset takibiyle çalışıyor
(pause/resume kavramı yok, `node.start(0, offset)` ile TAZE node kuruluyor,
bkz. CLAUDE.md "Ses motoru notları"). G12 aynı dosyada AYRI bir pause-kaynaklı
hatayı ("cevapta kaldığı süre kadar şarkı ileri sarılmış gibi başlıyordu")
zaten kapatmış görünüyor (`upload.js:35-43` yorumu). Orijinal "takılma" şikâyeti
bu mimari değişiklikle kendiliğinden çözülmüş OLABİLİR ama bu, ses duyulmadan
kod okumakla kanıtlanamaz (CLAUDE.md: "ses davranışı kaynak koddan
doğrulanamaz") — **madde kapatılmadı, gerçek cihazda kulakla YENİDEN test
edilmeli.**
**Kabul kriteri:** 10 ardışık pause→play denemesinde duyulur bir "takılma" yok

**3. Oyun 0 canla başlıyor — muhtemelen ÇOKTAN düzelmiş, canlı doğrulanamadı**
`storage.js:129`: `loadStats()` artık `s.lives`'ı `<1` ise (0 dahil, ya da hiç
yoksa) `TOTAL_LIVES`'a (5) çekiyor — yorum satırı bunu AÇIKÇA bu bug'ın
kapatılması olarak tarif ediyor ("temiz localStorage'da olduğu gibi
TOTAL_LIVES'a çekilir"). `app.js:540/567`: `stats` bu fonksiyondan SENKRON
yükleniyor, `currentLives = stats.lives` hemen ardından okunuyor — state
katmanında "0 can" üretecek bir yol kalmamış görünüyor. Bu oturumda tarayıcı
eklentisi bağlı olmadığı için canlı DOM doğrulaması YAPILAMADI — kod-seviyesi
bulgu güçlü ama "temiz localStorage'da can göstergesi gerçekten 5 ile açılıyor"
iddiası henüz gözle görülmedi.
**Kabul kriteri:** temiz `localStorage` ile açılışta can = tanımlı başlangıç değeri (canlı doğrulanmalı)

**4. ~~`loseLife()` zengin geri bildirimi eziyor~~ — F1'de düzeltildi, `a377d80`**
Yanlış cevapta artık TEK kartta hem "Kalan can: N" hem doğru frekans/bölge bilgisi
görünüyor (`appendFreqInfoNote`). Aynı kökten (feedbackBox + freqInfo aynı anda
görünür kalması) doğru cevap tarafındaki DUPLIKE kart bug'ı da düzeldi.

### Eksik özellikler

**10. ~~Gerçek ses dosyaları (DAVUL/ENSTRÜMAN) katalogda tanımlı ama dosyaların kendisi yok~~ — TAMAMEN KAPANDI**
G4 ile `source-catalog.js`'e 9 `kind:"sample"` girdisi eklendi, G5 ile
uzantı `.m4a`'ya çevrildi, G6 ile yükleme yolu değişti. **Bu turda `git
ls-files www/audio/` ile doğrulandı: 9 m4a dosyası artık TAKİPLİ** (en son
`1c86464` / G51'de commit'lenmiş) — önceki notun "henüz git'e commit'lenmedi"
iddiası STALE, kalan tek adım da kapanmış. iOS cihazda gerçek doğrulama
(HTTP 0'ın kalkması) hâlâ kullanıcıda.

**5. ~~A/B Test gerçek bypass değil~~ — bir kullanıcı raporuyla birlikte düzeltildi, bkz. BİTTİ**
Kullanıcı (14 yıllık müzik prodüktörü) A/B döngüsünde pitch kayması bildirdi
("44.100'den 48.000 olmuş gibi"). Teşhis: konsol düzeyinde (audioCtx.sampleRate/
audioEl.playbackRate, 44 ölçüm, eşleşen+uyuşmayan sample rate'ler, upload+sentetik)
hiçbir fark kanıtlanamadı — ama A/B döngüsünün her 2sn'de bir CANLI ÇALAN
uploadedMediaSource'u (MediaElementAudioSourceNode) disconnect/reconnect ettiği
kod incelemesiyle doğrulandı; bu WebKit'te JS'ten hiç gözlemlenemeyen bir motor
davranışı olabilir. Kullanıcı onayıyla asıl mimari eksiklik (bu madde) çözüldü:
artık paralel kuru/işlenmiş yol + gain crossfade (`audioEngine.setProcessed`) var,
`buildQuestionChain` A/B toggle'ında BİR DAHA hiç çağrılmıyor.

**6. ~~Kalibrasyon — sarı seviye çizgisi dokunmatik olmalı~~ — ÇOKTAN kodlanmış, STALE madde**
`app.js:4789-4801`: `calLevelTrack` üzerinde `pointerdown`/`pointermove`/
`pointerup`/`pointercancel` ile sürükleme kodlanmış (Pointer Events, mouse+touch
+kalemi TEK API'de birleştirir). `git log -S"calLevelTrack"` bu kodun proje
tarihindeki EN İLK commit'ten (`f0e144a`) beri var olduğunu gösteriyor — yani
bu madde muhtemelen dosyaya hiç güncel kalmadan miras kalmış. Gerçek dokunmatik
cihazda son doğrulama bu oturumdan yapılamadı (tarayıcı eklentisi bağlı değildi)
ama kod açıkça touch-uyumlu bir API kullanıyor.

**7. ~~Odak aralığı özelliği kodda yok~~ — M1-4'te eklendi, `5c608f4`; "öneri kartı" notu da G58 ile KAPANDI**
Önceki not "seans sonu ekranındaki öneri kartı (resSug) HÂLÂ eklenmedi"
diyordu — `resSug` id'si kod tabanında artık hiç yok. Bunun yerine G58
(`250c622`) ana menüye `dailyTipCard`/`dailyTipStartBtn` ekledi: en zayıf
bölgeyi `zoneScores()`'tan okuyup tek cümlelik öneri gösteriyor, "Başla"
butonu GERÇEK `challenge.total` sorudan oluşan bir set başlatıyor
(`app.js:1726-1738`, `renderDailyTip`). Konum "seans sonu" değil "ana menü"
ama işlevsel istek (zayıf bölgeye odaklı öneri + gerçek başlat butonu)
karşılanmış görünüyor — madde kapatıldı.

**8. İlerleme sekmesi prototiple örtüşmüyor**
Bölümler var, düzen farklı. `Dizayn/prototype.html` referans. Bu turda
yeniden gözden geçirilmedi (kapsam dışı bırakıldı) — hâlâ açık kabul ediliyor.

**12. "Geri bildirim ekranı" ayarı Pro Plus zorluğunda etkisiz**
Kod okunarak DOĞRULANDI, hâlâ true: `submitProPlusGuess` (`app.js:2735`)
`mode.showProPlusInfoPanel`'i KOŞULSUZ çağırıyor ve `scheduleNext(result.correct
? 4000 : 6000)`'ı (`app.js:2810`) `prefs.feedbackScreen` kontrolü OLMADAN
çalıştırıyor — diğer tüm submit fonksiyonlarındaki `prefs.feedbackScreen ?
(...) : QUICK_ADVANCE_MS` deseni burada YOK. Kullanıcı Pro Plus'ta ayarı
kapatırsa panel yine de açılır.
**Kabul kriteri:** Pro Plus'ta cevap verilince, ayar kapalıyken de panel
açılmadan hızlı ilerleniyor, `revealAnimator` animasyonu düzgün tamamlanıyor
(yarıda kesilmiyor).

**13. ~~Uzun yüklenen dosyada karşılaştırma sonrası otomatik geçiş hâlâ çok geç gelebilir~~ — G15'te KAPANDI, `77278b8`**
Kök sebep (`loopAwarePreviewMs`'in geçiş beklemesini kaynağın TAM DÖNGÜ
uzunluğuna yuvarlaması) çözüldü — fonksiyon tamamen kaldırıldı, geçiş
beklemesi artık kaynak uzunluğundan bağımsız sabit `CMP_PREVIEW_RESUME_MS`
(3000ms). Bu mekanizma artık Kompresör'e özgü değil — G35'ten beri
`three-way-cards.js` üzerinden Reverb/Distortion'ın önizlemesi de AYNI yolu
kullanıyor (paylaşılan altyapı, ayrı ayrı yeniden yazılmadı).

**11. AÇIK ÖZELLİK — Odaklı pratik modu**
Kullanıcı raporu (G9 teşhisi, kod değişikliği YAPILMADI — bkz. BİTTİ):
Odak aralığı (Bas/Orta/Tiz) şu an SADECE soru üretim havuzunu daraltıyor
(`createQuestion`'a `focusRange` olarak geçiyor) — spektrum ekseni
(`drawFreqAxis`/`faXToF`/`faFToX`/`drawSpectrumBars`) tasarım gereği sabit
`mode.FA_MIN`/`mode.FA_MAX`'a kenetli, bu turda `grep` ile YENİDEN doğrulandı
(`app.js:3299-3300`), hâlâ hiç değişmemiş.
İstenen: kullanıcı zayıf bölgesini (bas/orta/tiz) seçip odaklı çalışırken
spektrum GÖRSEL olarak da o bölgeye daralsın — hem kulak hem göz o dar
bölgeye odaklansın. Kullanım senaryosu artık G58'in gerçek `dailyTipCard`
seti (bkz. madde 7) bitince kullanıcının zayıf bölgesini seçip tekrar
tekrar çalışması.
Gerekli iş: `drawFreqAxis`/`faXToF`/`faFToX`/`drawSpectrumBars` + ipucu/A-B
işaretleyicileri gibi `FA_MIN`/`FA_MAX` okuyan çizim fonksiyonlarının
tamamının dinamik bir aralık alacak şekilde refactor edilmesi (tıklama→Hz
haritalamasını da etkiliyor, riskli) — ayrı bir iş, bu turun kapsamı
dışında bırakıldı (kullanıcı kararı).

**14. G67/G68/G69 "i" bilgi/rehber sistemi + SPOTLIGHT turu — CANLI/cihaz
doğrulaması hiç yapılmadı**
Kod incelemesi + 1013 test geçti ama tarayıcıda GERÇEKTEN denenmedi (bkz.
G67/G68/G69 kayıtlarındaki dürüstlük notları). Gözle görülmesi gereken
davranışlar:
(1) ana ekran `#menuInfoBtn` ve mod kartlarındaki `.mode-info-btn`
tıklanınca `#guideSheet` doğru içerikle açılıp `×`/overlay ile kapanıyor mu,
(2) sheet içeriği (özellikle GENERAL_GUIDE'ın 5 bölümü, G69'dan itibaren de
her modun "OYUN SEÇENEKLERİ" bloğu) küçük ekranda taşmadan/kesilmeden
okunuyor mu,
(3) **[G68]** bir modu ilk kez oynarken SPOTLIGHT turu GERÇEKTEN çıkıyor mu
(ekranın etrafı kararıp doğru öğe aydınlanıyor mu, `#spotlightHole`
GERÇEKTEN hedef elementin üzerine oturuyor mu — 10 modun HEPSİNDE ayrı ayrı,
`resolveSpotlightTarget`'ın `isChoiceFormat()`/tonal-submit/analyzer
çözümlemesi doğru mu),
(4) **[G68]** adım geçişi hem "İleri" hem GERÇEK tıklamayla (dinle→seç→onayla
akışı, hedefin ALTINDAKİ gerçek buton/kart/kaydırıcı NORMAL tıklanabiliyor
mu — karartma hiçbir tıklamayı ENGELLEMİYOR mu) çalışıyor mu,
(5) 2. round'dan sonra tur bir daha çıkmıyor mu (localStorage'da
`hintRoundsShown` gerçekten artıyor mu), "Geç" çalışıyor mu, kalıcı "i"
bundan bağımsız hep duruyor mu,
(6) **[G68]** callout (yönlendirme kutusu) ekran kenarında/küçük ekranda
taşmadan konumlanıyor mu,
(7) **[G69]** "abControl" adımı `#abToggle`'ın ÜZERİNE GERÇEKTEN oturuyor
mu — Kompresör/Reverb/Distortion'da karta UZUN BASMANIN o ANDA döngüyü
başlattığı/durdurduğu VE turun bunu ANINDA algılayıp bir sonraki adıma
geçtiği; diğer 6 modda tek dokunuşun "A/B Test"i doğru değiştirdiği,
(8) **[G69]** 4 adımlık turun (listen→abControl→select→confirm) GERÇEKTEN
"uzun" hissettirmediği, SON adımın "Atla"/"Durdur" hatırlatma metninin
okunabilir olduğu.
**Kabul kriteri:** yukarıdaki 8 davranışın HEPSİ gerçek cihaz/tarayıcıda
elle denenip doğrulandı, taslak metinler (`MODE_GUIDE_TEXTS`,
`MODE_OPTIONS_TEXTS`, `SPOTLIGHT_STEPS`) kullanıcı tarafından gözden
geçirilip gerekiyorsa `guide-texts.js`'te düzeltildi.

### Yayın öncesi

**9. ~~Logo / uygulama ikonu yapılmadı~~ — STALE, zaten yapılmış**
`resources/icon.png` (1254×1254) ve `resources/splash.png` (2732×2732)
gerçek, tasarlanmış bir marka logosu içeriyor (kulaklık+spektrum çubukları+
dalga formu, "Audio Engineer Academy" yazısıyla — bu turda görsel olarak
açılıp doğrulandı) — placeholder DEĞİL. `git log` bu dosyaların projenin EN
İLK commit'lerinden (`9230d8e`) beri var olduğunu gösteriyor; `android/app/
src/main/res/drawable-*/splash.png` altında platforma özel boyutlar da
ÜRETİLMİŞ. Madde muhtemelen dosyaya hiç güncel kalmadan miras kalmış,
kapatıldı.

## BEKLEYEN KARARLAR

**(Kaynak koda karşı doğrulandı, G59 sonrası.)** Karar **A** bu turda kod incelemesiyle
zaten KODLANMIŞ bulundu (aşağıda) — DURUM.md hiç güncellenmemiş. Diğer
maddeler tek tek yeniden `grep`'lendi; hâlâ hepsi gerçek, açık kararlar.

**A. ~~Kart metni tek kaynağa inecek mi?~~ — ÇOKTAN kodlanmış, STALE madde**
`app.js:renderModeGrid` (satır 1507) kendi yorumunda AÇIKÇA söylüyor:
"Kart başlığı/açıklaması YALNIZCA katalogdan okunur — getMeta() artık bunları
döndürmüyor". `frekans-bulma.js:278-280`'in kendi yorumu da aynı kararı
doğruluyor: `getMeta()` artık SADECE oyun-mantığı meta'sını (id/motor/
kulaklikGerekli/vb.) döndürüyor, ad/aciklama YOK. Öneri zaten uygulanmış —
katalog tek görüntü kaynağı. Bu madde kapatıldı.

**B. Kilit tipleri**
Üç ayrı durum tek state'e sıkışmış: (1) henüz kodlanmadı, (2) seviye yetersiz,
(3) Pro gerektiriyor. Kart "Seviye 5'te açılır" derken tıklayınca "Yakında" toast'ı
çıkıyor — çelişkili vaat. **Hâlâ açık, kod değişmedi** (bu turda `renderModeGrid`
yeniden okunarak doğrulandı).
Katalog artık (G59 sonrası) **14 giriş** — `mode-catalog.js`'ten sayıldı:
**5'i `tier:"free"`** (Frekans Bulma/Kesim Noktası/Q Genişliği/Boost mu Cut
mu/Hız Modu — sonuncusu henüz `playable:false`), **9'u `tier:"pro"`** (dB
Seviyesi/Stereo Genişlik/Pan Konumu/Hangisi Farklı/Kompresör/Reverb/Tonal
Denge/Distortion/Frekans Çakışması — dördü henüz `playable:false`).
Mevcut `unlockLevel` değerleri kullanıcı tarafından hâlâ belirlenmedi.
**Kısmen ilerledi (Z3):** "seviye" kilidi HANGİ seviye sayısına bakacak sorusu
karara bağlandı (akademi/toplam seviyesi — `progress.academyLevel()`) ve KODLANDI
(`app.js` renderModeGrid, `meetsLevel` kontrolü). Ama bu, üç durumun (kodlanmadı/
seviye-yetersiz/Pro) UI'da AYRIŞTIRILMASI sorununu ÇÖZMEDİ. Bu madde AÇIK kalıyor.
**G17 ile SOMUTLAŞMIŞTI, artık ON kat daha somut:** "yeni bir mod eklenince
academyLevel otomatik yükselip önceki kilitleri de açabiliyor" ödünü — G59
itibarıyla ON oynanabilir mod var, altısı zaten `tier:"pro"` zincirinde
(unlockLevel 6→12→14→15→16→20) — her yeni mod kaydı bu zinciri YİNE
etkileyebilir. Karar hâlâ verilmedi: davranış kabul mü, yoksa academyLevel
formülü (ya da unlockLevel değerleri) yeniden mi tasarlanmalı?

**C. Rozet sayısı ve seti**
`progress.js:82-90`'da bu turda sayıldı: kod hâlâ TAM 9 rozet tanımlıyor
(first_blood/combo_5/combo_10/round_25/round_100/accuracy_70/level_5/
pro_clear/boss_win), değişmemiş. TASARIM.md'de tasarımda 6 rozet olduğu ve
isimlerin örtüşmediği kayıtlı (bu turda TASARIM.md yeniden okunmadı, kod
tarafı doğrulandı). Hangi setin kalacağı (6, 9, yoksa birleşim mi) ürün
kararı — kodlanmadı.

**D. Can dolumu**
`www/js/core/storage.js:129` (satır numarası kaydırıldı, önceki not `:91`
diyordu — güncellendi) — uygulama yeniden açıldığında can 0 ise otomatik
`TOTAL_LIVES`'a (5) çekiliyor (bilinçli ödün, seans içinde dolum YOK, bkz.
AÇIK İŞLER madde 3). Gerçek bir "30 dakikada dolum" mekanizması hâlâ kodda
yok (`grep` ile yeniden doğrulandı — kod tabanında dakika-bazlı bir dolum
zamanlayıcısı yok). Gerçek dolum özelliği ayrı bir iş.

**E. ~~Seviye → hassasiyet formülü (lvlSheet için gerekli)~~ — Z1/Z6 ile çözüldü**
`core/difficulty-curve.js: difficultyParams(level)` artık SÜREKLİ (logaritmik)
bir formülle her seviye için gainDb/Q/tolerans/süre üretiyor; `lvlSheet` (Z6)
bunu GERÇEKTEN okuyor (`app.js:renderLevelSheet`, bu turda da doğrulandı —
bkz. SIRADAKİ madde 3, ama o maddenin açık kaldığı nokta FARKLI: dilin TEK bir
mod diline kilitli olması, formülün kendisi değil). Buradaki sayısal değerler
(GAIN_DB_AT_LEVEL_1/CAP, Q_AT_LEVEL_1/CAP vb.) OTOMATİK/varsayılan seçildi,
kulakla hâlâ doğrulanmadı (bkz. SIRADAKİ madde 1).

**F. "Tekrar Çal" butonu kapsamı**
Sentetik kaynaklarda (gürültü/synth) anlamsız — sürekli sinyaller, "başı" yok.
**Hâlâ açık — karıştırılabilir bir kod parçası bulundu, netleştirildi:** `app.js:1108`'de
`els.startBtn`'in "🔄 Tekrar Çal" etiketi VAR ama bu, `autoStopped` durumundan
DEVAM ETME (pause/resume) anlamına geliyor (`app.js:3742-3755`) — pozisyonu
BAŞA sarmıyor, decision F'nin istediği "upload kaynağında baştan çal ikonu"
DEĞİL. `uploadManager.startFromZero` hâlâ sadece tur/seans başında çağrılıyor
(`app.js:3178-3184`). Karar gereken: sadece upload kaynağında görünen küçük
bir "baştan çal" ikonu mı eklensin, yoksa madde tamamen atlansın mı?

**G. ~~Otomatik zorluk modu~~ — Z5/Z7 ile çözüldü**
"Otomatik" artık gerçek: `applyAutoDifficulty()` (app.js) her round başında
Z1+Z3'ten türetilen zorluğu uyguluyor, `autoDiffAsk` (Z7) prototipteki gibi
DOKUNMA-tetiklemeli. KAPSAM SINIRI (bkz. Z5 commit mesajı): Z1'in TAM sürekli
eğrisi değil, `tierForLevel()` köprüsüyle en yakın isimli kademe (easy/medium/
hard/pro) kullanılıyor — evaluateAnswer'ın sabit tolerans sınırını parametrik
hale getirmek AYRI bir iş.

**H. Dar odak aralığında Pro Plus bant sayısı**
M1-4 ile gelen odak aralığı (Bas/Orta ~2.3 oktav) Pro Plus'ın istediği 4 ayrık
bandı (gereken ~2.7 oktav) her zaman sığdıramıyor. `test/frekans-bulma.test.mjs:
218-227` bu turda yeniden okundu: testin kendisi `bands.length <= 4` (asla 4'ten
fazla değil) garantisini 20 tekrarla doğruluyor, kod hâlâ güvenli tarafta (asla
range dışına taşmıyor, asla çakışan bant üretmiyor). "500 denemede hep 2-3 bant"
rakamı önceki bir oturumun canlı ölçümüydü, bu turda yeniden ölçülmedi — ama
mekanizma değişmemiş, karar hâlâ açık: Pro Plus dar odakta kısıtlansın mı (o
kombinasyon seçilemesin), yoksa az bantla mı devam etsin?

**I. İsimlendirme tutarsızlıkları (D6 denetimi — düzeltilmedi, sadece raporlandı)**
Beşi de bu turda `grep` ile TEK TEK yeniden doğrulandı, hepsi hâlâ true:
1. Zorluk `proplus` değeri iki yerde iki farklı isimle: `index.html:272`
   "Pro Plus (Çok Bantlı)", `index.html:885` (`data-diff="proplus"`)
   "Sınırsız" / "Sınırını kendin ara". Aynı seçenek, iki ayrı kavram.
2. Can bitişi iki farklı başlıkla art arda gösteriliyor: `loseLife()` içindeki
   feedback+toast (`app.js:942-943`) "Oyun bitti" diyor, hemen ardından açılan
   seans-sonu tam ekranı (`app.js:992`) "CANLARIN BİTTİ" diyor.
3. Desteklenen ses formatları tutarsız anlatılıyor: `validateAudioFile`'ın
   (`upload.js:75`) kendi hata mesajı `ALLOWED_AUDIO_EXTENSIONS`'tan 7 formatı
   doğru listeliyor (wav/mp3/m4a/aac/aiff/flac/ogg), ama `app.js:3036/3623/3658`
   "Ses oynatılamadı"/"Yükleme hatası" mesajları sadece "mp3/wav" öneriyor,
   `upload.js:139`'daki AYRI bir mesaj ise "mp3/wav/m4a" diyor — üç farklı liste.
4. Paywall'daki `index.html:717/731` "Seans başına 5 soru" (Ücretsiz) /
   "Seans başına 10 soru" (Pro) iddiası kodda YOK — `grep` ile doğrulandı,
   `roundsInThisPlaySession`/`isUserPro()` etrafında böyle bir sayaç/limit yok;
   `10 Soruluk Bölüm` (challenge) Pro'ya bağlı değil, herkes seçebiliyor.
5. "Ses dosyası yükle" (`index.html:337`, Oyun Ayarları) / "Dosya yükle"
   (`index.html:523`, `toolsUploadBtn`, Araçlar) — aynı eylem için iki farklı
   buton metni.
Hangisinin düzeltileceği/nasıl birleştirileceği ürün kararı — kod tarafında
hazır, sadece onay bekliyor.

## SIRADAKİ

**Tek sonraki adım (G69 itibarıyla):** AÇIK İŞLER madde 14 — G67/G68/G69'un
"i" bilgi/rehber sistemini (kalıcı "i" ikonu + SPOTLIGHT rehber turu +
oyun seçenekleri) gerçek tarayıcı/cihazda elle deneyip taslak metinleri
gözden geçirmek. Aşağıdaki liste (G59 itibarıyla güncellendi) bu adımdan
BAĞIMSIZ, daha eski/büyük zorluk-mimarisi işlerini kapsıyor.

**(G59 itibarıyla güncellendi.)** **ON oynanabilir mod var:** Frekans Bulma
(unlockLevel:1, free), Kesim Noktası (2, free), Q Genişliği (3, free), Boost
mu Cut mu (4, free), dB Seviyesi (6, pro), Kompresör (12, pro), Reverb (14,
pro), Tonal Denge (15, pro), Distortion (16, pro), Frekans Çakışması (20,
pro) — `mode-catalog.js`'ten doğrulandı. Kalan 4 katalog girdisi (Hız Modu/
Stereo Genişlik/Pan Konumu/Hangisi Farklı) hâlâ `playable:false`.

**Mimari durumu:** Motor 1'in altı modu (Frekans Bulma/Kesim Noktası/Q
Genişliği/Boost mu Cut mu/dB Seviyesi + Kompresör'ün kendi zorluk ekseni)
AYNI merkezi eğriden besleniyor (`continuousLevel`/
`representativeLevelForTier`+`sessionRampOffset`, mod-agnostik `logLerp`/
`applyPostCapFloor`, tüm 10 mod `paramsForDifficultyPosition` çağırıyor —
`grep` ile doğrulandı). Motor 2'nin **mekanizması** (toggle/preview/submit/
`drawOverlay` dispatch'i) `THREE_WAY_MODE_IDS = ["kompresor", "reverb",
"distortion"]` ile genelleşti (`app.js:50`) — Tonal Denge BİLEREK bu listede
DEĞİL, kendi ayrı A/B/C mekanizmasını kullanıyor (`tonal-denge.js`'in kendi
dosya başı notu: "three-way-cards.js'in ARTIK kullanılmadığı"). **Tek
sonraki adım netleşmedi** — kalan işler ürün kararı gerektiriyor, kod
tarafında engelleyici yok:

1. **KULAKLA doğrulama — hâlâ hiçbir moddan tam geçmedi (ON modun TAMAMI,
   ilgili tüm `*_CURVE_CONFIG` sabitleri dahil).** Kod içinde doğrulanan
   sabitler: `COMP_CURVE_CONFIG` (Kompresör), `REVERB_CURVE_CONFIG`
   (Reverb), `TONAL_CURVE_CONFIG` (Tonal Denge), `DISTORTION_CURVE_CONFIG`+
   `DRIVE_RANGES`+`DIST_BASE_K` (Distortion), `CAKISMA_CURVE_CONFIG`
   (Frekans Çakışması), + Q Genişliği'nin etiket sınırları/`Q_GAIN_DB`/
   `Q_FIXED_FREQ`. Kalibrasyon MATEMATİKSEL şartı sağlıyor (ikili aramayla
   ölçüldü, testle garanti altında) ama ALGISAL/HİSSİYAT açısından doğru
   olduğu anlamına gelmiyor. Gerçek kullanıcı testinden hiçbiri geçmedi.
2. **Round-timer eğriye bağlanacak mı?** `paramsForDifficultyPosition().
   timeSec` ON modun HEPSİNDE hesaplanıyor ama `app.js:3026`'daki
   `currentDifficultyConfig().time` (statik) hâlâ kullanılıyor. Bağlanırsa
   G21'in hizalı geçiş süresiyle etkileşimi (boss'ta çifte kısalma riski)
   ayrıca değerlendirilmeli.
3. **`renderLevelSheet`** (`app.js:3929`, Seviye bilgi sayfası) hâlâ TEK bir
   dil (gainDb/Q, Frekans Bulma'nınki) konuşuyor — kod okunarak doğrulandı,
   "Bant genişliği"/"Değişim miktarı" metinleri SABİT, `mode`'a göre
   değişmiyor. Diğer 9 modun (Kompresör'ün "Şık sayısı" satırı hariç)
   kendi dilini (ratio farkı/reverb tipi/distortion türü/tonal tilt/kick-bas
   çakışması vb.) hiç konuşmadığı bir durum — genelleştirilmedi.
4. **Statik `DIFFICULTY` tabloları hâlâ duruyor mu, kaldırılacak mı?** ON
   mod dosyasının HEPSİ hâlâ kendi statik `DIFFICULTY` export'unu tutuyor
   (`grep` ile doğrulandı) — Sabit modun tier-isim çapası + proplus + geriye
   dönük test uyumluluğu için BİLEREK kaldırılmadı. Kalıcı olarak mı
   kalacak, yoksa TAMAMEN eğriye mi devredilecek? İkili sistem (statik+eğri,
   opt-in) artık ON moddan geçen, tekrarlanan bir desen — bilinçli bir
   seçim olarak teyit edilmeli.
5. **unlockLevel/tier zinciri ürün kararı olarak hâlâ DOKUNULMADI**
   (BEKLEYEN KARARLAR **B**): dB Seviyesi(6)→Kompresör(12)→Reverb(14)→
   Tonal Denge(15)→Distortion(16)→Frekans Çakışması(20), hepsi tier:"pro".
   academyLevel yeni bir mod kaydolunca otomatik yükseliyor — artık ON
   modun altısı zaten oynanabilirken her yeni mod kaydı önceki kilitleri de
   etkileyebilir, kullanıcıya sorulmalı. G23'ün geliştirici-modu atlaması
   SADECE test kolaylığı, kalıcı ürün kararının yerine geçmiyor.
6. **ÜRÜN SORUSU (G24): seans rampasının genliği (`SESSION_RAMP_CONFIG`:
   MIN_OFFSET=-1.5/MAX_OFFSET=+1.0/BOSS_OFFSET=+2.0) yeterince BÜYÜK mü?**
   Taze/düşük seviyeli bir oyuncuda rampanın mutlak genliği küçük (bkz. G24
   commit mesajı: position 1→2 arası ~%11 değişim) — bu, artık ON modun
   HEPSİNİ etkileyen paylaşılan bir sabit, hiçbir turda BİLEREK
   değiştirilmedi. Genlik artırılmalı mı yoksa mevcut "ince/gerçekçi" genlik
   mi tercih edilsin — ürün kararı, kulakla + kullanıcı geri bildirimiyle
   birlikte değerlendirilmeli.
7. **Kesim Noktası'nın G21'deki SERT TEST kapsamı (600+ soruluk tam-matris
   canlı stres testi) diğer DOKUZ moddan hiçbirinde tekrarlanmadı** —
   hepsi kendi birim testleri + tek turluk canlı elle doğrulamadan geçti,
   ayrı bir tur gerekiyorsa madde burada tutuluyor.
8. **`app.js`'in Motor 2 metin dalları hâlâ mod-başına hardcoded** —
   mekanizma (madde başındaki `THREE_WAY_MODE_IDS`) genelleşti ama
   `pushHistory` (`app.js:1847-1863`) ve soru başlığı/`questionDesc`
   (`app.js:1943`/`2011`) HÂLÂ `activeQuestion.mode === "kompresor"/
   "reverb"/"distortion"/"tonal-denge"` gibi ayrı dallarla yazılıyor (G33'ün
   "MOTOR 2 ŞABLONU" notunun bıraktığı iş) — her yeni Motor 2/3 modunda bu
   dallar tekrar tekrar kopyalanıyor, henüz `mode.questionTitle`/`mode.
   historyLabel` gibi bir sözleşmeye taşınmadı.
9. **G58'in `DISCONNECT_DELAY_MS=100` düzeltmesi (`audio-engine.js:36`,
   Kompresör'ün kesik-ses kök sebebi) KULAKLA/CİHAZDA DOĞRULANMADI** — kök
   sebep Web Audio API semantiğiyle kod-seviyesinde kanıtlandı ama bu
   ortamda ses duyulamadığı için "artık hiç tıklama yok" iddiası test
   EDİLMEDİ. Gerçek cihazda Kompresör/Reverb/Distortion'ın A/B/C döngüsü
   dinlenerek kontrol edilmeli.
10. **`teachingText`'in "yön doğru, miktar yanlış" metni** hafif tekrarlı
    okunabiliyor — küçük bir metin cilası, engelleyici değil.

Kesim Noktası'nın kendisi G17-G21 ile TAMAMLANDI ve SERT TEST GEÇTİ. dB
Seviyesi G22 ile aynı derinlikte kuruldu ama madde 7'deki SERT TEST
kapsamından henüz geçmedi. Karşılaştırma-önizleme butonları (Senin cevabın/
Doğru cevap/Temiz) Kesim Noktası'nda BİLEREK hâlâ yok — istenirse ayrı bir
iş, şu an engelleyici değil.

Diğer bekleyen (öncelik sırası, gerçek cihaz/dokunmatik gerektirdiği için bu
ortamdan doğrulanamıyor):
- **F4** (çift-dokunma/pinch zoom kapatma) — gerçek dokunmatik jest
  gerektiriyor, mouse-tabanlı otomasyonla HİÇ üretilemedi.
- **A/B pitch fix** (`8f66de1`) — gerçek cihazda kulakla pitch'in artık
  sabit kaldığı doğrulanmalı.
- **F2**'nin karşılaştırma-önizlemesi duraklat/devam davranışı — masaüstünde
  sağlamlaştırıldı, hâlâ cihaz doğrulaması bekliyor.

Kod tarafında bekleyen karar yok; A/B/C/D/F/H/I (BEKLEYEN KARARLAR — E ve G
Z1/Z6/Z5/Z7 ile çözüldü) kullanıcıya sorulmayı bekliyor ama hiçbiri şu an
engelleyici değil.

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

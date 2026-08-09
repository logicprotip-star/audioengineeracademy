# OYUN DİNAMİKLERİ — Teknik Envanter (kod-referanslı)

*Audio Engineer Academy. Bu belge geliştirici/QA içindir — her satırda gerçek DOM id/class + dosya:satır referansı var, "yok" yazılan yerler kodda GERÇEKTEN doğrulanmış yokluklardır, tahmin edilmemiştir. Tüm satır numaraları bu belgenin yazıldığı anda `grep -n` ile doğrulanmıştır; kod ileride değişirse numaralar kayabilir.*

---

## 1) MOD ENVANTERİ

Her mod için 11 öğe kontrol edildi: spektrum görseli, play-pause, döngü, A/B karşılaştırma, kaynak seçici, odak aralığı, ipucu, atla (X), mod içi "i", zorluk göstergesi, cevap biçimi.

Paylaşılan/evrensel öğeler (tüm modlarda aynı DOM elementi, tanım tek yerde) her mod başlığında tekrar edilir ama dosya:satır sadece §2'de detaylandırılır.

### frekans-bulma (Motor 1)

Mod ID: `www/js/modes/frekans-bulma.js:18` (`MODE_ID = "frekans-bulma"`)

- Spektrum görseli: **FFT** — `SHOW_SPECTRUM` export edilmiyor → varsayılan `true` (`www/js/app.js:3461`), canvas `#visualizer` (`www/index.html:227`)
- Play-pause: var — `#startBtn` (paylaşılan, bkz. §2)
- Döngü: var — `#abToggle`, iki-yönlü döngü (`www/js/app.js:1247-1264`, `isThreeWayModule` false)
- A/B karşılaştırma: var — `#abToggle` iki-yönlü A/B (temiz/işlenmiş)
- Kaynak seçici: var — `#sourceChipWrap`/`#sourceSelect` (`www/index.html:142,145`)
- Odak aralığı: **var** — `FOCUS_RANGES` export edilir (`www/js/modes/frekans-bulma.js:232-236`), `#focusChipWrap` gösterilir (`www/index.html:153`, koşul `www/js/app.js:409`)
- İpucu: var — `#hintBtn` (`www/index.html:275`)
- Atla (X): var — `#nextBtn` (paylaşılan)
- Mod içi "i": var — `#gameInfoBtn` (paylaşılan)
- Zorluk göstergesi: var — `#levelChip` (kullanıcı seviyesi, ayrı bir zorluk-tier rozeti YOK, bkz. §2 not)
- Cevap biçimi: **ikisi de** — dokunmalı (canvas pointerdown, `www/js/app.js:3543-3558`, `choiceOnly` yok) + şıklı (kullanıcı seçebilir, `#answerFormatChipWrap`); 3–6 şık, `DIFFICULTY.options` `www/js/modes/frekans-bulma.js:38-43`

### kesim-noktasi (Motor 1)

Mod ID: `www/js/modes/kesim-noktasi.js:33`

- Spektrum görseli: **FFT** — export yok → varsayılan `true`
- Play-pause: var — `#startBtn` (paylaşılan)
- Döngü: var — `#abToggle` iki-yönlü
- A/B karşılaştırma: var — `#abToggle`
- Kaynak seçici: var — `#sourceChipWrap`
- Odak aralığı: **yok** — `FOCUS_RANGES` export edilmiyor, kod yorumu bunu açıkça belirtiyor (`www/js/modes/kesim-noktasi.js:309`)
- İpucu: var — `#hintBtn`
- Atla (X): var — `#nextBtn` (paylaşılan)
- Mod içi "i": var — `#gameInfoBtn` (paylaşılan)
- Zorluk göstergesi: var — `#levelChip`
- Cevap biçimi: **şıklı (zorunlu)** — `choiceOnly: true` (`www/js/modes/kesim-noktasi.js:296`); 3–6 şık, `DIFFICULTY.options` `www/js/modes/kesim-noktasi.js:65-69`

### q-genisligi (Motor 1)

Mod ID: `www/js/modes/q-genisligi.js:44`

- Spektrum görseli: **FFT** — export yok → varsayılan `true`
- Play-pause: var — `#startBtn` (paylaşılan)
- Döngü: var — `#abToggle` iki-yönlü
- A/B karşılaştırma: var — `#abToggle`
- Kaynak seçici: var — `#sourceChipWrap`
- Odak aralığı: **yok** — `FOCUS_RANGES` export edilmiyor (grep boş, `www/js/modes/q-genisligi.js`)
- İpucu: var — `#hintBtn`
- Atla (X): var — `#nextBtn` (paylaşılan)
- Mod içi "i": var — `#gameInfoBtn` (paylaşılan)
- Zorluk göstergesi: var — `#levelChip`
- Cevap biçimi: **şıklı (zorunlu)** — `choiceOnly: true` (`www/js/modes/q-genisligi.js:262`); 3–5 şık (sayısal Q değil, sözel etiket), `DIFFICULTY.options` `www/js/modes/q-genisligi.js:144-148`

### boost-mu-cut-mu (Motor 1)

Mod ID: `www/js/modes/boost-mu-cut-mu.js:31`

- Spektrum görseli: **FFT** — export yok → varsayılan `true`
- Play-pause: var — `#startBtn` (paylaşılan)
- Döngü: var — `#abToggle` iki-yönlü
- A/B karşılaştırma: var — `#abToggle`
- Kaynak seçici: var — `#sourceChipWrap`
- Odak aralığı: **yok** — `FOCUS_RANGES` export edilmiyor (grep boş, `www/js/modes/boost-mu-cut-mu.js`)
- İpucu: var — `#hintBtn`
- Atla (X): var — `#nextBtn` (paylaşılan)
- Mod içi "i": var — `#gameInfoBtn` (paylaşılan)
- Zorluk göstergesi: var — `#levelChip`
- Cevap biçimi: **şıklı (zorunlu)** — `choiceOnly: true` (`www/js/modes/boost-mu-cut-mu.js:287`); 3 katmanlı soru (yön → miktar → frekans+miktar), 3–6 şık, `DIFFICULTY.options` `www/js/modes/boost-mu-cut-mu.js:76-80`

### db-seviyesi (Motor 1)

Mod ID: `www/js/modes/db-seviyesi.js:30`

- Spektrum görseli: **dikey bar** — `export const SHOW_SPECTRUM = false;` (`www/js/modes/db-seviyesi.js:47`), kendi çizimi `drawDbBars` (`www/js/modes/db-seviyesi.js:565`, çağrı `www/js/modes/db-seviyesi.js:627-644`); genel FFT çizimi `www/js/app.js:3461`'de atlanıyor
- Play-pause: var — `#startBtn` (paylaşılan)
- Döngü: var — `#abToggle` iki-yönlü
- A/B karşılaştırma: var — `#abToggle`
- Kaynak seçici: var — `#sourceChipWrap`
- Odak aralığı: **yok** — `FOCUS_RANGES` export edilmiyor (grep boş, `www/js/modes/db-seviyesi.js`)
- İpucu: var — `#hintBtn`
- Atla (X): var — `#nextBtn` (paylaşılan)
- Mod içi "i": var — `#gameInfoBtn` (paylaşılan)
- Zorluk göstergesi: var — `#levelChip`
- Cevap biçimi: **şıklı (zorunlu)** — `choiceOnly: true` (`www/js/modes/db-seviyesi.js:248`); 3–6 şık (tek işaretli dB sayısı), `DIFFICULTY.options` `www/js/modes/db-seviyesi.js:65-70`

### kompresor (Motor 2)

Mod ID: `www/js/modes/kompresor.js:255` — `THREE_WAY = true` (`kompresor.js:98`)

- Spektrum görseli: **FFT** — `SHOW_SPECTRUM` export edilmiyor → varsayılan `true`, `drawSpectrumBars` (`www/js/app.js:3466`)
- Play-pause: var — `#startBtn` (paylaşılan)
- Döngü: var, **otomatik başlar** — round başında `if (isThreeWayModule(mode)) startAbLoop();` (`www/js/app.js:3313`)
- A/B karşılaştırma: var — bizzat 3 kartın kendisi (`renderThreeWayCards`, `www/js/core/three-way-cards.js:24`), `#abToggle` basışı `cycleThreeWayPreview()` ile kartlar arası döner (`www/js/app.js:3079-3087`)
- Kaynak seçici: var, kısıtlı — `uyumluKaynaklar: compatibleSourceIds({ requireTransient: true })` (`www/js/modes/kompresor.js:262`, transient içermeyen — pink/white noise — dışlanır)
- Odak aralığı: **yok** — `FOCUS_RANGES` export edilmiyor (grep boş)
- İpucu: var — `getHintText` (`www/js/modes/kompresor.js:440`), `#hintBtn`
- Atla (X): var — `#nextBtn` (paylaşılan)
- Mod içi "i": var — `#gameInfoBtn` (paylaşılan)
- Zorluk göstergesi: var — `#levelChip`
- Cevap biçimi: **kart** — her zaman tam 3 kart A/B/C (`www/js/modes/kompresor.js:294`, `renderAnswerChoices = renderThreeWayCards` satır 466)

### reverb (Motor 2)

Mod ID: `www/js/modes/reverb.js:229` — `THREE_WAY = true` (`reverb.js:59`)

- Spektrum görseli: **FFT** — export yok → varsayılan `true`
- Play-pause: var — `#startBtn` (paylaşılan)
- Döngü: var, **otomatik başlar** — `isThreeWayModule` içinde (`www/js/app.js:53`), auto-start `www/js/app.js:3313`
- A/B karşılaştırma: var — 3 kartın kendisi (`renderAnswerChoices = renderThreeWayCards`, `www/js/modes/reverb.js:477`)
- Kaynak seçici: var, kısıtlı (kapalı liste) — `uyumluKaynaklar: compatibleSourceIds({ only: ["guitar","vocal","snare","groove","upload"] })` (`www/js/modes/reverb.js:248`)
- Odak aralığı: **yok** — `FOCUS_RANGES` export edilmiyor (grep boş)
- İpucu: var — `getHintText` (`www/js/modes/reverb.js:451`)
- Atla (X): var — `#nextBtn` (paylaşılan)
- Mod içi "i": var — `#gameInfoBtn` (paylaşılan)
- Zorluk göstergesi: var — `#levelChip`
- Cevap biçimi: **kart** — 3 kart A/B/C (`www/js/modes/reverb.js:294`, `renderAnswerChoices` satır 477)

### distortion (Motor 2)

Mod ID: `www/js/modes/distortion.js:249` — `THREE_WAY = true` (`distortion.js:42`)

- Spektrum görseli: **FFT** — export yok → varsayılan `true`
- Play-pause: var — `#startBtn` (paylaşılan)
- Döngü: var, **otomatik başlar** — `isThreeWayModule` içinde, auto-start `www/js/app.js:3313`
- A/B karşılaştırma: var — 3 kartın kendisi (`renderAnswerChoices = renderThreeWayCards`, `www/js/modes/distortion.js:432`)
- Kaynak seçici: var, kısıtlama yok — `uyumluKaynaklar: compatibleSourceIds()` (`www/js/modes/distortion.js:262`, argümansız → tüm kaynaklar, `www/js/core/source-catalog.js:150-155`)
- Odak aralığı: **yok** — `FOCUS_RANGES` export edilmiyor (grep boş)
- İpucu: var — `getHintText` (`www/js/modes/distortion.js:409`)
- Atla (X): var — `#nextBtn` (paylaşılan)
- Mod içi "i": var — `#gameInfoBtn` (paylaşılan)
- Zorluk göstergesi: var — `#levelChip`
- Cevap biçimi: **kart** — 3 kart A/B/C (`www/js/modes/distortion.js:291`, `renderAnswerChoices` satır 432)

### tonal-denge (Motor 2)

Mod ID: `www/js/modes/tonal-denge.js:58` — **three-way DEĞİL** (`THREE_WAY_MODE_IDS` içinde yok, `www/js/app.js:53`)

- Spektrum görseli: **FFT, ama kompakt** — `SHOW_SPECTRUM` export edilmiyor → FFT bar ÇİZİLİYOR ama `COMPACT_ANALYZER = true` (`www/js/modes/tonal-denge.js:71`) canvas yüksekliğini 140px'e düşürüyor (`www/styles.css:428`, toggle `www/js/app.js:1381`)
- Play-pause: var — `#startBtn` (paylaşılan)
- Döngü: var, **elle uzun basma gerekir** (three-way'in aksine otomatik başlamaz, `www/js/app.js:3313`'ün kapsamı dışında) — `#abToggle` iki-yönlü formda
- A/B karşılaştırma: var — `#abToggle`'ın kendisi (temiz sinyal ↔ gizli EQ bozulması karşılaştırması, `toggleAB()` `www/js/app.js:3089-3098`); kullanıcının canlı kaydırıcı düzeltmesinden AYRI bir "önce/sonra" bileşeni YOK
- Kaynak seçici: var, kısıtlı — `uyumluKaynaklar: compatibleSourceIds({ only: ["groove","upload"] })` (`www/js/modes/tonal-denge.js:267`)
- Odak aralığı: **yok** — `FOCUS_RANGES` export edilmiyor (grep boş)
- İpucu: var — `getHintText` (`www/js/modes/tonal-denge.js:481`)
- Atla (X): var — `#nextBtn` (paylaşılan)
- Mod içi "i": var — `#gameInfoBtn` (paylaşılan)
- Zorluk göstergesi: var — `#levelChip`
- Cevap biçimi: **kaydırıcı** — N slider (4/5/6, `bandCountForSessionIndex`, `www/js/modes/tonal-denge.js:129-134`; sınavda her zaman 6), `SLIDER_MIN_DB=-12/MAX_DB=12/STEP_DB=0.5` (`tonal-denge.js:139-141`), + `.tonal-submit` onay butonu (`tonal-denge.js:525`)

### frekans-cakismasi (Motor 3)

Mod ID: `www/js/modes/frekans-cakismasi.js` (dosya başı `MODE_ID`) — çok aşamalı, kendi kaynak-çifti mimarisi

- Spektrum görseli: **eğri** — `SHOW_SPECTRUM = false` (`www/js/modes/frekans-cakismasi.js:73`), kendi `drawOverlay` (`frekans-cakismasi.js:697-736`): iki kaynağın "varlık eğrisi" (`drawRegionCurve`, amber/mor, satır 617-635) + çakışma bandı vurgusu (`drawCollisionBand`, satır 643-655)
- Play-pause: var — `#startBtn` (paylaşılan)
- Döngü: **yok** — `#abToggle` bu modda tamamen gizli (`syncCakismaVisibility`, `www/js/app.js:911`)
- A/B karşılaştırma: var, ama FARKLI bir mekanizma — `#cakismaCompare` (Önce/Sonra, `www/index.html:247-249`) — SADECE Aşama 3 cevaplandıktan sonra (doğru/yanlış fark etmeksizin) açılır (`www/js/app.js:2901-2905`)
- Kaynak seçici: var, ama ÇİFT seçici — `#cakismaPairChipWrap`/`#cakismaPairSelect` (`www/index.html:181-192`), 3 hazır çift + "own" (kendi 2 dosyası) — `SOURCE_PAIRS` (`www/js/core/source-catalog.js:94-107`), `OWN_SOURCE_PAIR` (satır 120-123)
- Odak aralığı: **yok** — `FOCUS_RANGES` export edilmiyor (grep boş)
- İpucu: var — `getHintText` (`www/js/modes/frekans-cakismasi.js:511-518`, aşamaya göre farklı metin)
- Atla (X): var — `#nextBtn` (paylaşılan)
- Mod içi "i": var — `#gameInfoBtn` (paylaşılan)
- Zorluk göstergesi: var — `#levelChip` (bu modda da gizlenmiyor)
- Cevap biçimi: **aşamalı** — 3 aşama, `stageForIndex(sessionQuestionIndex)` (`frekans-cakismasi.js:88-96`, oturum soru sırasına göre: ilk 3 soru Aşama 1, sonraki 3 Aşama 2, gerisi Aşama 3): Aşama 1 (çakışma frekansını bul) 3–6 şık (`diff.options`), Aşama 2 (hangi kaynaktan kesilecek) TAM 2 şık sabit (`frekans-cakismasi.js:322`), Aşama 3 (kaç dB kesilecek) 3–6 şık

---

## 2) MERKEZİ BAĞLANTILAR

- **`#feedbackBox`** — Tanım: `www/index.html:252` (`#feedbackClose` içinde nested, satır 253). Davranış: `setFeedback(title, detail, showResult, bad)` (`www/js/app.js:1176-1184`). Kullanan modlar: Kesim Noktası/dB Seviyesi/Boost-Cut/Q Genişliği/Kompresör-Reverb-Distortion (three-way)/Tonal Denge/Frekans Çakışması — hepsi `submit*Guess` fonksiyonlarında `feedback.showResult=true` ile bunu birincil sonuç kartı olarak kullanıyor (`submitCutoffGuess` app.js:2335, `submitLevelGuess` 2431, `submitBoostCutGuess` 2510, `submitQWidthGuess` 2597, `submitThreeWayGuess` 2679, `submitTonalDengeGuess` 2761, `submitCakismaGuess` 2838). **İstisna:** Frekans Bulma (`submitFrequencyGuess`, app.js:2233) ve Pro Plus (`submitProPlusGuess`, app.js:2924) `showResult=false` geçip bunun yerine daha zengin `#freqInfo` panelini kullanır (`mode.showFreqInfoPanel`, app.js:2271/2291).
- **`#feedbackClose`** (`.fb-close`) — Tanım: `www/index.html:253`. TEK merkezi event-delegation ile bağlı (mod başına AYRI listener YOK): `els.feedbackBox.addEventListener("click", e => { if (e.target.closest(".fb-close")) goToNextRound(); })` (`www/js/app.js:4119-4121`). Bekleme süresini atlayıp direkt sıradaki soruya geçer.
- **`#abToggle`** — Tanım: `www/index.html:262`. Merkezi davranış: `updateAbToggleUI()` (`www/js/app.js:1247-1263`) — `isThreeWayModule(mode)` (satır 1249) iki-yönlü/üç-yönlü dalını seçer. Uzun-basma zamanlayıcısı: `abPressTimer` (satır 589), pointerdown→520ms→`startAbLoop()` (satır 4008-4015), pointerup/leave'de iptal (4018-4019). `startAbLoop`/`stopAbLoop` tanımları `www/js/app.js:3104-3117`. Frekans Çakışması'nda gizli (`syncCakismaVisibility`, satır 911).
- **`guideSheet`** (`#guideSheetOverlay`/`#guideSheet`) — Tanım: `www/index.html:902-910`, `.app-shell` kökünde (G71 düzeltmesiyle `#screen-menu`'nün içinden buraya taşındı — eskiden `.screen{display:none}` yüzünden oyun ekranından açılamıyordu, açıklama yorumu `index.html:889-901`). Açan: `openGuideSheet(modeId)` (`app.js:4228-4262`), kapatan: `closeGuideSheet()` (`app.js:4264-4266`). Tetikleyiciler: `#menuInfoBtn` (`app.js:4268`), mod kartı `.mode-info-btn` (`app.js:1699-1703`), `#gameInfoBtn` (`app.js:4274-4278`).
- **`lvlSheet`** (`#lvlSheetOverlay`/`#lvlSheet`) — Tanım: `www/index.html:381-389`, `#screen-game` İÇİNDE (guideSheet'in aksine cross-screen sorunu hiç yaşamadı, çünkü tetikleyicisi de aynı ekranda). Açan: `openLevelSheet()` (`app.js:4211-4214`) → `renderLevelSheet()` (`app.js:4160-4210`, `levelSheetTermsFor(modeId)` ile mod-özel terim kullanıyor, bkz. §4). Tetikleyici: `#levelChip` click (`app.js:4220`).
- **`--actionbar-h`** — CSS özel değişkeni, `www/styles.css:51` (`168px`). Kullanım: `www/styles.css:320` — oyun ekranının kaydırılabilir alanına `margin-bottom:calc(var(--actionbar-h) + env(safe-area-inset-bottom))` vererek sabit alt kontrol çubuğunun içeriği örtmesini engelliyor. Stylesheet'te sadece bu iki geçiş var.
- **Diğer mimari önemde paylaşılan ID'ler:**
  - `#hearts` — can göstergesi, `www/index.html:128`, `els.hearts` `app.js:201`, tüm modlarda mod-agnostik (branşlama yok).
  - `#answers` — şıklı/kart/kaydırıcı cevap konteyneri, `www/index.html:240`, `els.answers` `app.js:300`, her modun kendi `renderAnswerChoices()`'ı `syncAnswerArea()` (`app.js:930-938`) üzerinden mod-agnostik dispatch edilir.
  - `#analyzer`/`#visualizer` — spektrum kartı ve GERÇEK canvas id'si (`#canvas` DEĞİL — JS'te `els.canvas = document.getElementById("visualizer")`, `app.js:246`) — `www/index.html:220,227`.
  - `#levelChip` — yukarıda ayrıca ele alındı, tüm modlarda aynı tetikleyici.
  - `#gameSettingsSheet`/`#gameSettingsBtn` — "..." (dots) ikonuyla açılan Oyun Ayarları, tüm modlarda aynı.
  - `#difficultySelect` — zorluk seçici `<select>`, sadece Oyun Ayarları sheet'inin içinde, oyun ekranında doğrudan görünmez (`www/index.html:290-296`).

---

## 3) MEKANİK GERÇEĞİ (kodda ŞU AN ne var)

**Kombo:** `stats.combo++` + `stats.bestCombo = Math.max(...)` doğru cevapta, her modun kendi submit fonksiyonunda tekrarlanan AYNI iki satır (9 tekrar — `www/js/app.js:2252-2253, 2357-2358, 2452-2453, 2537-2538, 2618-2619, 2700-2701, 2779-2780, 2857-2858, 2945-2946`). Yanlış cevapta/süre dolunca `stats.combo = 0` (`app.js:2218` süre dolumu, ve her modun kendi yanlış-dalı: 2282, 2384, 2473, 2559, 2639, 2721, 2800, 2879, 2965). **XP'yi etkiliyor:** `comboBoost = Math.min(2.4, 1 + combo * 0.12)` (`www/js/modes/frekans-bulma.js:507`, tüm modlarda aynı formül) — 12 combo'da tavan (2.4×). Ayrıca in-session `score`'u da etkiliyor: `diffState().score += gained * Math.max(1, stats.combo)` (`app.js:2259`).

**Boss round / son soru:** `isBossRound(roundsCompleted) { return (roundsCompleted+1) % 5 === 0; }` — TEK tanım `www/js/modes/frekans-bulma.js:306-308`, diğer 8 mod aynı fonksiyonu import/re-export ediyor. `www/js/app.js:3261`: `const boss = examActive ? false : mode.isBossRound(stats.rounds);` — sınav/telafi fazlarında boss BİLEREK devre dışı. Süre: `Math.max(6, baseTime - 2)` boss'ta (`app.js:3215-3216`, 6sn taban). XP: `bossBoost = question.boss ? 1.65 : 1` (tüm modlarda aynı sabit). **"Son soru" (10. soru) için AYRI bir davranış YOK** — `challenge.done>=challenge.total` (`app.js:3133`) SADECE `finishChallenge()`'ı tetikler, süre/zorluk/XP'de 10. soruya özel bir dallanma bulunamadı; boss 5'lik kendi bağımsız döngüsünde çalışmaya devam eder.

**Can dolumu:** `TOTAL_LIVES=5`, `LIVES_REFILL_INTERVAL_MS=30*60*1000` (`www/js/core/paywall.js:99-100`). `onLifeLost()` (satır 105-108) SADECE canlar TAM 5'ten düşünce zamanlayıcıyı sıfırlar (5→4'te sıfırlanır, 3→2'de sıfırlanmaz — zaten işleyen sayaç bozulmaz). `applyLivesRefill()` (satır 116-127): geçen süre/30dk = tam sayı "tick" kadar can (`Math.floor`), 5'te tavanlanır, saat geri alınırsa (`now<=lastRefillAt`) sıfır can + dokunulmamış referans. Çağrı noktaları (`syncLives()`, `app.js:965-976`): açılış (`app.js:4654`), "Tekrar dene" akışı (`4476`), "Sıfırla" butonu (`4531`), sekme ön plana dönünce (`visibilitychange`, `4642`), "Reklam izle" (`5586`). **`setInterval` YOK** — sadece bu 5 ayrık tetiklenme noktasında, gerçek geçen zamana göre lazy hesaplanıyor.

**calculateXP formülü — MOD BAŞINA AYRI (paylaşılan bir fonksiyon YOK):** `grep "function calculateXP" www/js/modes/*.js` → 10 eşleşme, her mod dosyası kendi bağımsız fonksiyonunu export ediyor (`www/js/core/registry.js`'in `registerMode`/`getMode`'u ile modül namespace'i olarak kayıtlı, `app.js` `mode.calculateXP(...)` çağırıyor — hangi mod aktifse onun implementasyonu çalışır). Yapı (kopyala-yapıştır kaynaklı) TÜM 10 modda aynı: `base(zorluk tablosu) × comboBoost × hintPenalty(ipucu kullanıldıysa 0.5) × bossBoost × timeBoost(süre %55'ten fazla kaldıysa 1.2) × xpMultiplier`. Taban XP tabloları (easy/medium/hard/pro/proplus): Frekans Bulma 16/24/36/52/45 (`frekans-bulma.js:39-43`), Kompresör 14/22/32/46/46 (`kompresor.js:175-179`), Tonal Denge 18/28/40/58/58 (`tonal-denge.js:160-164`), Frekans Çakışması 16/24/36/52/52 (`frekans-cakismasi.js:111-115`). **Mod-özel istisnalar:** Frekans Bulma'nın proplus dalı isabet oranıyla ölçekliyor (`ratio*1.5`, satır 514-517); Frekans Çakışması `STAGE_XP_MULTIPLIER = {1:0.8, 2:0.9, 3:1.3}` ile aşamaya göre ek çarpan uyguluyor (satır 416, 426); Tonal Denge `proximityBoost = max(0.55, proximityScore/100)` ile "ne kadar yakın doğru" ölçekliyor (satır 407-409) — doğru/yanlış ikili DEĞİL, dereceli.

**Seviye eşiği:** `xpNeeded(level) = 120 + (level-1)*70` (`www/js/core/progress.js:3-5`) — seviye 1 için taban 120, her ek seviye +70. `levelFromXp`/`xpProgress` bunu döngüyle harcayarak seviyeyi bulur (satır 7-25). `modeXp` mod başına ayrı XP havuzu okur (satır 46-48). `modeLevel` ham XP seviyesini sınav-aktif modlarda `examLevel`'a kilitler (satır 62-67, `Math.min`). `academyLevel` tüm modların `modeLevel()`'lerinin TOPLAMI (satır 78-80, ortalama DEĞİL).

**10 soruluk bölüm sayacı:** `let challenge = { active:false, total:10, done:0, correct:0, xp:0 };` (`app.js:763`), yeniden başlatma `startChallenge()` (`app.js:3396`). Artış `challengeTick()` (`app.js:3412-3417`), bitiş kontrolü `app.js:3133`. **AYRI bir değişken:** `roundsInThisPlaySession` (`app.js:627`, artış `app.js:3295`) — oturum boyunca kurulan TÜM soruların sayacı (challenge aktif olsun olmasın artar, zorluk rampasını/free-limit'i besler, `challenge.done`'dan BAĞIMSIZ, challenge başlayınca sıfırlanmaz). **Sınav sisteminin `PARKUR_LENGTH=10`'u** (`www/js/core/exam-system.js:57`) `challenge.total`'dan TAMAMEN AYRI bir sistem — kendi `position` sayacını tutuyor (exam-system.js:135), ve `app.js:3129-3133`'teki yorum sınavın "10'un ötesine geçebildiğini" (erken sınav + telafi turları) bu yüzden `challenge.done>=10`'un sınav aktifken BİLEREK bastırıldığını açıkça belirtiyor. Bonus: challenge'ın +%50 XP'si `CHALLENGE_XP_MULT=1.5` (`app.js:764`), `xpMult()` (`app.js:766`) ile her modun `calculateXP`'ine `xpMultiplier` olarak geçiyor.

---

## 4) BİLİNEN AÇIKLARIN BUGÜNKÜ DURUMU

- **dB modunda arka plan spektrumu — DÜZELTİLMİŞ (G39, bu oturumdan ÇOK ÖNCE).** `db-seviyesi.js:47`: `export const SHOW_SPECTRUM = false;` — `app.js:3461`'deki `if (mode.SHOW_SPECTRUM !== false)` koşuluyla genel FFT çizimi atlanıyor, kendi dikey-bar görseli (`drawDbBars`) kullanılıyor. DURUM.md G39 kaydı canlı tarayıcıda doğrulanmış: "dB Seviyesi'ne girildi → arka planda spektrum çubukları YOK... Kesim Noktası'na geçildi → spektrum çubukları NORMAL çalışıyor (regresyon yok)." **Bugün de kod aynı durumda, doğrulandı.**
- **Q Genişliği'nde cevap sonrası 42px kayma — DÜZELTİLMİŞ (G58).** Kök sebep paylaşılan altyapıdaydı, Q Genişliği'ne özgü değildi: `#feedbackBox` ÖNCEDEN `display:none`→`display:block` ile ANİDEN yükseklik kazanıyordu, `.game-scroll`'u kaydırıyordu. Düzeltme: `.fb` artık `display` değil `visibility` ile gizleniyor + `min-height:100px` ile yer PEŞİNEN ayrılıyor. Canlı doğrulanan sayılar (DURUM.md G58): Q Genişliği 54.5px→**0px**, Boost/Cut 54.5px→**0px**, Kesim Noktası 38px→2px, dB Seviyesi 80px→2px. **Kapsam dışı bırakılan AYRI bir bulgu:** Frekans Bulma hâlâ ~244.5px kayıyor çünkü bu mod `#feedbackBox` KULLANMIYOR, kendi `#freqInfo` panelini kullanıyor — o mekanizma bu düzeltmenin kapsamına HİÇ girmedi, hâlâ AÇIK (ayrı bir iş olarak DURUM.md'de not düşülmüş).
- **Kompresör'de cevap sonrası A şıkkında renk uygulanmaması — İNCELENDİ, KOD MANTIĞI DOĞRU BULUNDU, bir yarış-durumu SERTLEŞTİRİLEREK KAPATILDI (G58).** `markThreeWayCards`'ın harf-eşleme mantığında sistematik bir hata YOK — canlı testte A hem doğruyken hem yanlışken ayrı ayrı denendi, ikisinde de doğru renklendi; `test/three-way-cards.test.mjs` (6 test) bunu kilitliyor. Bulunan GERÇEK ama nadir sorun: Kompresör'ün otomatik A/B/C döngüsünün (`setInterval`) kuyruğa alınmış bir çağrısı, cevap anındaki `clearInterval` ile durdurulamayıp `cycleThreeWayPreview()`'ı yine de tetikleyebiliyordu. Savunma eklendi: `cycleThreeWayPreview()` artık `if (!roundActive) return;` ile başlıyor — **bu satır bugün kodda mevcut, doğrulandı** (`www/js/app.js:3080`). **Dürüstlük notu (G58'in kendi kaydı, hâlâ geçerli):** A'nın gerçekten renklenmediği bir durum canlı olarak YAKALANAMADI — kapatılan, koda göre teorik olarak mümkün olan bir pencereydi.
- **`renderLevelSheet`'in tüm modlarda aynı dili konuşması — DÜZELTİLMİŞ (G64), satır numarası ARTIK app.js:3929 DEĞİL.** O tarihte fonksiyon `core/difficulty-curve.js`'in jenerik `difficultyParams()`'ını (Frekans Bulma için yazılmış, "Bant genişliği/Değişim miktarı" döndüren) TÜM 10 modda çağırıyordu. Düzeltme: yeni `core/level-sheet-terms.js` (`LEVEL_SHEET_TERMS`, 10 mod → kendi `sensitivityLabel`/`amountLabel`/`formatSensitivity`/`formatAmount`'ı), `renderLevelSheet` artık `levelSheetTermsFor(modeId)` çağırıyor. **Bugün doğrulandı:** fonksiyon şu an `www/js/app.js:4160`'ta (satır numarası kaymış, kod tabanı G64'ten beri büyüdü), içinde `const terms = levelSheetTermsFor(modeId);` satırı GERÇEKTEN var (`app.js:4166`). `test/level-sheet-terms.test.mjs` (17 test) her modun gerçek `paramsForDifficultyPosition`'ıyla çökmediğini/doğru birim taşıdığını kilitliyor. **Dürüstlük notu (G64'ün kendi kaydı, hâlâ geçerli):** canlı/cihaz UI doğrulaması (kart düzeni, uzun etiketlerin taşması) hiçbir zaman yapılamadı — sadece Node'da metin önizlemesi + testler.

---

## DOĞRULAMA

- **Mod başlığı sayısı:** 10/10 (frekans-bulma, kesim-noktasi, q-genisligi, boost-mu-cut-mu, db-seviyesi, kompresor, reverb, distortion, tonal-denge, frekans-cakismasi).
- **Öğe satırı sayısı (§1):** 10 mod × 11 öğe = 110 satır, hepsinde ya gerçek ID/dosya:satır ya "yok" var.
- **"Yok" sayısı (§1):** 10 — kesim-noktasi/q-genisligi/boost-mu-cut-mu/db-seviyesi/kompresor/reverb/distortion/tonal-denge'nin her birinde 1'er (Odak aralığı), frekans-cakismasi'nde 2 (Döngü + Odak aralığı). frekans-bulma'da 0 (tek istisna — hem odak aralığı hem dokunmalı format bu modda var).
- **Benzersiz DOM id/class/CSS-değişkeni sayısı (§1+§2'de dosya:satırla anılan):** 34 — `#startBtn`, `#abToggle`, `#sourceChipWrap`, `#sourceSelect`, `#focusChipWrap`, `#hintBtn`, `#nextBtn`, `#gameInfoBtn`, `#levelChip`, `#lvlSheetOverlay`, `#lvlSheet`, `#visualizer`, `#analyzer`, `#answers`, `#freqInfo`, `#feedbackBox`, `#feedbackClose`, `.fb-close`, `#hearts`, `#cakismaCompare`, `#cakismaBefore`, `#cakismaAfter`, `#cakismaPairChipWrap`, `#cakismaPairSelect`, `#guideSheetOverlay`, `#guideSheet`, `#menuInfoBtn`, `.mode-info-btn`, `#gameSettingsSheet`, `#gameSettingsBtn`, `#difficultySelect`, `#answerFormatChipWrap`, `#bossChip`, `--actionbar-h`.

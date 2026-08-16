# AJAN-DENETIM-16-08 — Bağımsız Denetim

**Kapsam:** G214 (82f94e6) → HEAD (3662f9f, G261), 59 commit. Önceki 24 rapor dosyası
(TUR2-9, RET-RISKI, BEYAN-DENETIM, METIN-TARAMA-1/2, 12× OLCUM-*.md) okundu.
**KOD YAZILMADI, DOSYA DEĞİŞTİRİLMEDİ, COMMIT ATILMADI** — bu rapor salt-okunur inceleme.

**Yöntem:** Altı paralel/ardışık alt-inceleme koşturuldu (kör nokta taraması, commit-by-commit
denetim — iki geçişte, çünkü ilk geçiş teknik bir arızayla yarım kaldı ve ikinci bir turla
tamamlandı, kaynak kütüphanesi tutarlılığı, hata sınıfı taraması, yayına hazırlık bayrakları,
görünmez riskler). Her biri gerçek komutlar (`git show`, `grep`, `npm test`, `ffprobe`, dosya
okuma) çalıştırarak doğruladı, tahmin yürütmedi. Bu belge onların bulgularının sentezidir.
Bulgular arasında **iki çelişki** tespit edildi ve aşağıda açıkça işaretlendi (madde F.4 ve F.1) —
tahmin yürütülmedi, ikisi de sunuldu, karar kullanıcıya bırakıldı.

**npm test:** 1390/1390 geçti, art arda 5 kez tekrar çalıştırıldı, hepsinde 1390/1390 — G261
flaky-test düzeltmesi kalıcı doğrulandı.

---

## A) ÖNCEKİ TURLARIN KÖR NOKTALARI

🔴 **YAYIN ÖNCESİ — en büyük tek kör nokta: `www/js/app.js`'in ~12.500 satırı hiçbir raporda
satır satır hiç okunmadı.** Dosya 13.145 satır — projenin en büyük dosyası, DOM orkestrasyonu,
event delegasyonu, ekran geçişleri, click handler'ları burada yaşıyor. METIN-TARAMA-15-08 ve
METIN-TARAMA-2-15-08 SADECE `toast()` çağrılarını (~40 örnek) ve uzun string literal'leri
hedefli grep'le taradı; kendi notlarında bazı bulguları "BELİRSİZ" bıraktığını yazıyorlar
(METIN-TARAMA-2, satır 32-38). Bu turda da (zaman/kapsam nedeniyle) dosyanın tamamı
okunmadı — sadece hedefli grep'lerle (DEV_MODE, console.log, addEventListener, catch, rAF,
`[0]`/`.first()`) belirli kalıplar tarandı. **13.000 satırlık bir dosyanın orkestrasyon
mantığının satır satır hiç görülmemiş olması, bu denetim tarihinin en büyük açığı olarak
kalıyor — ayrı, odaklı bir tur gerektirir.**

🟡 **BEYAN-DENETIM-15-08.md, `[filepicker-diag]`/`[guide-i-diag]`/`[upload-context]`/
`[scroll-diag]` etiketli günlükleri hiç incelememiş** (grep ile doğrulandı — rapor metninde bu
4 etiketten hiçbiri geçmiyor). Bu, G239'un "TEK yayın bayrağı" iddiasının neden eksik kaldığını
açıklıyor — ayrıntı F.1'de.

🟡 **DURUM.md'nin AÇIK İŞLER listesi bakımsız.** Madde 3 ("Oyun 0 canla başlıyor") hâlâ
`loadStats()`'ın `lives < 1` durumunda `TOTAL_LIVES`'a çektiğini söylüyor — bu davranış
**G61'de kaldırıldı** (150+ commit önce), güncel kod (`storage.js:240-243`, kendi yorumuyla
doğrulanmış) sadece `typeof !== "number"` (veri bozulması) durumunda dolduruyor, gerçek dolum
`applyLivesRefill()` ile zaman bazlı. Madde 8/11/17/18/19/21/22/29 gibi diğer kalemler de
G59-G167 aralığından — hiçbiri son 60 commit'lik turda yeniden doğrulanmamış. CLAUDE.md'nin
"kapatmak için kanıt şart" kuralı sadece KAPATMAYA uygulanıyor, listenin hâlâ DOĞRU olup
olmadığına değil.

🟢 24 rapor arasında sistematik bir "BELİRSİZ madde çapraz-referansı" hiçbir turda yapılmamış —
her yeni tur kendi BELİRSİZ listesini üretiyor, eskilerin çoğu bir daha anılmıyor. Tek istisna
DOGRULAMA-15-08.md (bazılarını kapatmış) ama bu pratik 16 Ağustos turlarında (OLCUM-*) devam
etmemiş. Bu turun kendisi de bu çapraz-referansı TAM kapatamadı (24 rapor, yüzlerce madde —
kapsamı aşıyor).

En yüksek etkili, repodan doğrulanamayan, hâlâ AÇIK BELİRSİZ maddeler (dış doğrulama gerekir):
- Privacy Manifest (PrivacyInfo.xcprivacy) — RET-RISKI:313-322, kendi ifadesiyle "en önemli
  BELİRSİZ madde".
- App Privacy beyanı (App Store Connect) kodla uyumlu mu — RET-RISKI:226.
- Paid Apps Agreement imzalı mı — RET-RISKI:418.
- App Store Connect ekran görüntüleri G216 (seviye başlıkları) ve G250 (Distortion→
  "Saturation & Distortion" adı) ile senkron mu.
- VoiceOver ile TEK TEK ekran/aria-label doğrulaması — TUR710:350/357, "bu ortamda test
  edilemez" denip bırakılmış.
- `core/iap.js` gerçek cihaz sandbox satın alma testi — DURUM.md madde 26, hâlâ açık.

---

## B) SON 59 COMMIT'İN DENETİMİ

**Derinlemesine (`git show` ile TAM diff okunarak) doğrulanan commit'ler — TÜMÜ:**

| Commit | İddia | Sonuç |
|---|---|---|
| 3662f9f (G261) | Flaky test kök sebep + doğru şık seçme kancası | ✅ Doğrulandı, ayrıca 3'lü kart modlarında (reverb/kompresör/distortion) render-sırası varsayımı bağımsız doğrulandı |
| d12e6be (G239) | "43 tanı logu... TEK bayraktan türüyor" | ⚠️ KISMEN DOĞRU — bkz. F.1, kapsamı sanıldığından dar |
| a50b799 (G229) | 12 save*()'in 10'unda hata yakalama yoktu, düzeltildi | ✅ Doğrulandı — 13 save*() fonksiyonunun HEPSİ `trySave()` üzerinden try/catch'li, sonraki 32 commit bozmamış |
| 4bf0329 (G230) | Negatif sıfır — 4 formatlayıcı düzeltildi | ✅ Doğrulandı, regresyon yok |
| c0a56bb (G244) | EQ zinciri ±12dB kazanç sınırı | ✅ Sınır doğru — ⚠️ ama kırp-SONRASI ölçekleme sırası var, bkz. D.4 |
| 3c5710b/c76393d (G247/246) | rAF döngüsü + iCloud hariç tutma | ✅ 5 self-scheduling rAF döngüsünün hepsi state-bayrağıyla düzgün sonlanıyor |
| c1bbd09/50eb79a (G252/253) | Telefon Hoparlörü→Bluetooth Hoparlör | ✅ `TOOLS_FILTERS[0]` gerçekten değişmiş, kalan 7 "telefon hoparlör" metni DURUM.md'de zaten gerekçeli (ilgisiz genel öneri metni) |
| c62cd32 (G250) | Distortion→"Saturation & Distortion" | ✅ Sadece görünen ad değişti, mod ID'si (`"distortion"`) AYNI kaldı — localStorage geriye-uyumluluk sorunu YOK |
| f0f2d63 (G237) | 5 soru sınırı kalıcı | ✅ Doğrulandı, ama cihazın YEREL tarihine dayanıyor (`new Date()`), sunucu doğrulaması yok — mevcut `sessionAdWatchesToday` deseniyle AYNI, yeni bir açık değil |
| 7ed6427 (G258) | GORSEL-TEST.md #8/#12 çelişkisi | ✅ Doğrulandı |
| fe8c849 (G249) | 5 metin düzeltmesi | ✅ 5/5 doğrulandı — "büyük harf sızıntısı" kaynak string'in KENDİSİ değişerek çözülmüş (CSS değil), risk kalmıyor |
| a255e9e (G248) | "13 yer" balans→denge vb. | ✅ Sayı doğrulandı (12+1=13), bugünkü kodda `\bmekan\b`/`\bbalans\b` sıfır kalıntı |
| e7b3121/5b02d33/505235c/78271fb (G231-233) | Veri dayanıklılığı (süre sınırı, trySave, şema versiyonu) | ✅ Hepsi doğrulandı, sonraki commit'ler bozmamış |
| 4f94109/6255f26/acc5428 (G234-236) | Reklam timeout, abPressTimer teardown, native ses kesintisi köprüsü | ✅ G236'nın **gerçekten native tarafı** (`ios/App/App/AudioSessionPlugin.swift`, +24 satır) değiştirdiği doğrulandı — sadece JS değil |
| G215-227 (kalan) | — | `git show --stat` ile tarandı, mesaj/diff uyumsuzluğu bulunamadı |

**Sonuç: 59 commit'in TAMAMI en az bir düzeyde (çoğu derinlemesine) doğrulandı, hiçbirinde
kabul kriterinin karşılanmadığı ya da bir sonraki commit tarafından sessizce bozulduğu bir
örnek BULUNAMADI.** Tek ihtiyatlı not: G215-227 arası tarama `--stat` seviyesinde kaldı, tam
diff'leri okunmadı (düşük risk — metin/ürün kararı commit'leri, TUR3A/3B/4'ün kendi
raporlarıyla zaten çapraz kontrol edilmiş).

---

## C) HİÇ BAKILMAMIŞ YERLER

`git diff --stat 82f94e6..HEAD` ile G214-G261 arasında değişmeyen dosyalar çıkarılıp önceki 24
raporda adı geçip geçmediği kontrol edildi:

| Dosya | Önceki raporlarda geçiyor mu | Bu turda okundu mu | Sonuç |
|---|---|---|---|
| `core/personalization.js` | evet (2) | ✅ tam | Temiz |
| `core/mode-visuals.js` | evet (2) | ✅ tam | Temiz, sadece dekoratif SVG |
| `core/utils.js` | hayır | ✅ tam | `turkishLocative()` 1-20 elle çapraz kontrol edildi, hata yok. `randomItem`/`hexToRgba` zaten kendi yorumunda "KULLANILMIYOR" işaretli ölü kod |
| `core/round-flow.js` | evet (5) | ✅ tam | Temiz |
| `core/three-way-cards.js` | evet (3) | ✅ tam | Temiz |
| `core/challenge.js` | hayır | ✅ tam | Trivia, risk yok |
| `core/fx.js` | hayır | ✅ tam | Toast/particle, setTimeout ile temizleniyor, sızıntı yok |
| **`core/session-plan.js`** | hayır | ✅ tam | 🟡 **Ölü kod — kendi başlık yorumunda "KULLANILMIYOR" diye işaretli, `app.js`'ten HİÇ import edilmiyor, TEK çağıran kendi unit testi.** Bu, "npm test 1390/1390 geçti" güvenini bu dosya için YANILTICI kılıyor — test onu doğruluyor, uygulama onu hiç çalıştırmıyor. |
| `core/session-plan.js`, `core/eq-loudness.js`, `core/level-sheet-terms.js`, `core/difficulty-curve.js` | 3-10 | kısmen | eq-loudness/level-sheet-terms/difficulty-curve bu turda yeniden açılmadı, önceki turlarda görülmüş — **BELİRSİZ**, yeniden doğrulanmadı |

**Hiç test edilmemiş fonksiyon taraması** (test/ ↔ core/modes fonksiyon isim çapraz-referansı)
YAPILMADI — kapsam dışı kaldı, **BELİRSİZ**.

**Hiç bakılmamış akışlar:** SPOTLIGHT turunun 10 modun HEPSİNDE cihazda canlı testi (DURUM.md
madde 14) — kod incelemesi var, canlı doğrulama yok. "Arka plana alıp geri dönme" / "ses
kesintisi ortasında yeni soru" senaryoları bu turda yeniden koşulmadı (TUR3B-ZAMAN daha önce
kapsamlı işlemiş, G234-236 ile düzeltilmiş — bkz. B tablosu — ama bu turda tekrar canlı
test edilmedi).

---

## D) HATA SINIFI TARAMASI

1. 🟢 **Korumasız async** — `toolsAddFile()` (app.js:9608) ilk iki adımı try/catch dışında,
   ama alttaki `uploadManager.loadFile()` decode hatasında bile fırlatmıyor
   (`{ok:false}` döner, upload.js:249-296) — teorik boşluk var, gözlemlenen tetikleyici yok.

2. ✅ **Sessizce yutulan hata** — `catch (e) {}` 33 örnek, TEK TEK incelendi, hepsi
   `.disconnect()`/`.stop()` teardown deseni (zaten kesilmiş node'u tekrar kesmenin güvenli
   yutulması) — gerçek hata gizleme örneği YOK.

3. 🟡 **Asimetrik özellik kapsamı (Restore Purchase kalıbının bir türü) — YENİ bulgu:**
   Kulak butonları (G254-258) 7 moda eklendi (Frekans Bulma, Kesim Noktası, dB Seviyesi, Pan
   Konumu, Stereo Genişlik, Boost/Cut kat.2-3, Frekans Çakışması aşama 1&3) **ama Q
   Genişliği'ne EKLENMEDİ**. `q-genisligi.js` diğer 6 modla YAPISAL OLARAK AYNI (`mode:"qwidth"`,
   choice-format, gizli gerçek değer + şıklı tahmin). Reverb/Kompresör/Distortion'ın dışlanması
   mantıklı (3'lü kart formatı farklı), Tonal Denge'nin dışlanması mantıklı (canlı slider) —
   ama Q Genişliği için hiçbir commit mesajında dışlama gerekçesi YOK. Kasıtlı mı atlanmış mı
   **BELİRSİZ** — ürün kararı gerektirir.

4. 🟢 **Kırp-sonra-çarp sıra sorunu — YENİ bulgu:** `computeReferenceEqGainsDb()`/
   `lufsMatchGainDb()` (tonal-balance.js:283-311) ±12dB'ye KIRPIYOR (G244, işitme güvenliği) —
   ama app.js'te (11452, 11878-11879) bu ZATEN kırpılmış değer `TOOLS_TONAL_EQ_GAIN_SCALE` ile
   ÇARPILIYOR (sıra "kırp→çarp", olması gereken "çarp→kırp" değil). Bugün `SCALE=1.0`
   (app.js:11048) olduğu için etkisiz; tek override yolu DEV_MODE-gated bir test kancasında
   (app.js:11855), gerçek kullanıcıya ulaşmıyor. **Bugün risk yok** — ileride sabit 1'in üzerine
   çekilirse işitme-güvenliği sınırı sessizce aşılabilir. Kayıt amaçlı, kod değiştirilmedi.

5. ✅ **Körü körüne ilk eleman seçimi (G261 sınıfı)** — `[0]`/`.first()` kalıpları tarandı,
   G261'in kendi taraması ("27 test dosyası, layout-geometry.spec.mjs dışında örnek yok")
   bağımsız doğrulandı. e2e'de kalan tek `.first()` (`paywall-flow.spec.mjs:175/364/366/391`)
   tekil toast elementi seçimi — zararsız.

6. ✅ **Sabit varsayım / senkron sayı** — 13 save*() fonksiyonu + storage.js sabitleri gözden
   geçirildi, çelişkili çift bulunamadı. `TOTAL_LIVES=5` tek yerde tanımlı.

7. 🟢 **rAF/while güvenliği** — B tablosundaki G247 doğrulaması + tüm `while` döngüleri
   okundu: hepsi sayı sınırlı ya da matematiksel olarak sonlu. `progress.js`'in
   `levelFromXp`/`xpProgress` döngüleri TEORİK olarak `xp===Infinity` ise sonsuz döngüye
   girer — sadece localStorage'a elle `Infinity` yazılmış (adversarial/bozuk veri) durumda
   ULAŞILAMAZ, normal kullanımda tetiklenmez. Kayıt amaçlı.

8. ✅ **Kod-yorumu üslubu / TODO** — `grep TODO/FIXME/XXX` tek sonuç (`difficulty-curve.js:42`,
   kod yorumu, kullanıcı görmüyor) — ihlal yok.

9. ✅ **Ünlü uyumu** — `turkishLocative()` dışında elle Türkçe ek eklenen template literal
   taraması sıfır sonuç — tüm dinamik ekler `turkishLocative()`'tan geçiyor.

---

## E) YENİ KAYNAK KÜTÜPHANESİ

1. ✅ **`bass_alt` temizliği** — `www/` ve `ios/App/App/public/` içinde SIFIR referans.
   **`android/app/src/main/assets/public/` içinde HÂLÂ VAR** — bkz. madde 4.

2. ✅ **Stereo dosyaların izolasyonu** — 12 modun `getMeta()`'sı tek tek okundu: SADECE
   `stereo-genislik.js:272` iki stereo kaynağı listeliyor. Diğer 11 mod ya varsayılan
   `compatibleSourceIds()` (stereo'yu otomatik dışlar, source-catalog.js:180) ya da `only:[...]`
   listelerinde stereo hiç geçmiyor. Sızıntı yok.

3. ✅ **Araçlar sekmesi** — `compatibleSourceIds()` için "tools" bağlamlı bir çağrı
   BULUNAMADI — Araçlar sadece kullanıcının kendi yüklediği dosyalarla çalışıyor, paketli
   kaynak kataloğuna hiç dokunmuyor. "Stereo dosyalar orada görünmeli mi" sorusu anlamsız.

4. 🟡 **YAYIN ÖNCESİ KONTROL LİSTESİ MADDESİ — Android native bundle ESKİ:**
   `android/app/src/main/assets/public/` (git-ignore'lu, `npx cap sync android`'in ürettiği
   yerel kopya) ile `www/` arasında `diff`: hâlâ `bass_alt`, hâlâ eski `groove_090.m4a`,
   G259'un yeni kaynakları (`clean_guitar`, 2 stereo dosya) HİÇ YOK, açıklama metinleri eski
   ("Bas gitar C2, 65 Hz" — yeni ölçüm "~97 Hz" değil). **Frekans Çakışması region'ları
   TAMAMEN FARKLI:** kick/bas `[50,160]` (yeni: `[30,120]`), vokal/gitar `[500,2000]` (yeni:
   `[200,600]`), snare/gitar `[200,2000]` (yeni: `[170,400]`) — Android'de bu mod ŞU AN
   iOS/web'den farklı zorluk/örtüşme mantığıyla çalışır. Dosya tarihi 14 Ağustos — G215'ten bu
   yana `cap sync android` hiç çalıştırılmamış. **iOS için bu sorun YOK** —
   `diff -rq www/ ios/App/App/public/` sadece Capacitor'ın kendi `cordova.js` dosyalarında
   fark buldu, geri kalan HER ŞEY (js/audio dahil) birebir aynı (16 Ağustos 23:28 tarihli, G259/
   G260 dahil). **App Store (iOS) çıkışına ENGEL DEĞİL** — ama kullanıcı şu an cihazda Android
   test ediyorsa, son iki günün HİÇBİR değişikliğini görmüyor demektir; herhangi bir Android
   build'i `cap sync android` çalıştırmadan ASLA alınmamalı.

5. ✅ **Kaynak seçici bütünlüğü** — 12/12 mod doğru listeyi gösteriyor.

6. 🟢 **`tom.m4a` süre tutarsızlığı** — ffprobe ile ölçüldü: 9/11 dosya 24.615s, `tom.m4a`
   TAM YARISI (12.307s), `vocal.m4a` 5.67s (eski dosya, G259 dışı, zaten bilinen açık madde).
   Kod tarafında risk YOK (`audio-engine.js:700-705` gerçek `buffer.duration` ile modulo
   alıyor, sabit süre varsaymıyor) — ama commit mesajında bahsedilmeyen bir tutarsızlık,
   kasıtlı mı üretim hatası mı **BELİRSİZ**.

7. ✅ **-3dBFS→-6dBFS geçişi** — `kompresor.js:149`'daki `COMP_REF_LEVEL_DB=-6` sabiti
   commit iddiasıyla birebir uyumlu, kodda kalıntı `-3dBFS` referansı yok.

8. ✅ **Bellek/boyut** — `www/audio/` toplam 4.5MB, 11 dosya, en büyüğü 615KB. Bu ölçekte
   decode/bellek riski YOK.

---

## F) YAYINA HAZIRLIK

1. ⚠️ **ÇELİŞKİ — "43 tanı logu" iddiası vs. gerçek kod:** `build-flags.js:1-8`'in yorumu ve
   G239 commit'i "kod içinde başka HİÇBİR elle-çevrilen sabit kalmadı, TÜM tanı logları
   DEV_MODE'dan türüyor" diyor. Bu iddia **bugünkü koda göre YANLIŞ**:
   - `DEV_MODE`-guard'lı 6 wrapper fonksiyon (`audioDiagLog`, `uploadDiagLog`, `tonalDiagLog`
     ve çeşitli dosya-lokal kopyaları) üzerinden ~82 çağrı GERÇEKTEN korunuyor — bu kısım
     doğru.
   - Ama **16 KOŞULSUZ `console.log`/`console.warn` çağrısı**, DEV_MODE'dan tamamen bağımsız,
     normal kullanım akışlarında HER SEFERİNDE tetikleniyor: `[filepicker-diag]` ×8
     (app.js:6325,6334,6370,6373,6376,6408,6508,6519 — dosya seçme akışının her adımı),
     `[guide-i-diag]` ×3 (app.js:7098,7174,7181 — "i" butonuna her basış), `[upload-context]`
     ×3 (app.js:9725,9731,9756 — dosya her uygulandığında), `[scroll-diag]` ×1
     (app.js:10063 — her sheet kapanışı), `[analiz]` warn ×1 (app.js:10411 — worker
     altyapısı başarısız olursa).
   - **Kök sebep kanıtlandı:** `git log -S"[filepicker-diag] 1)"` bu satırın G55'te (`cda3bd7`)
     eklendiğini, G239'un kapsamına hiç girmediğini gösteriyor. BEYAN-DENETIM-15-08.md
     (G239'un dayandığı rapor) bu 4 etiketten hiçbirini metninde geçirmiyor — bu tur onları
     hiç görmemiş.
   - **Risk seviyesi düşük** — hiçbiri hassas veri basmıyor, sadece iç akış/teşhis metni,
     Safari Web Inspector'a bağlanmadıkça görünmez, App Store incelemesini etkilemez. Ama
     `build-flags.js`'in kendi belgelediği garanti ("TEK bayrak, başka hiçbir şey yok")
     bugünkü koda göre doğru değil — ya bu 4 aile de DEV_MODE'a bağlanmalı ya da yorum
     "bilinçli KALICI 4 istisna var" diye düzeltilmeli.

2. ✅ **`DEV_MODE`** — `build-flags.js:27`: `true` (repo'nun HER ZAMAN committed hâli,
   Archive'dan HEMEN önce elle `false`'a çevrilip commit EDİLMİYOR — dosyanın kendi notu).
   **Bu manuel, tek satırlık bir adım** — Archive alınmadan önce elle çevrilmesi GEREKİYOR.
   Atlanırsa: AD_TEST_MODE=true kalır (gerçek reklam yerine test reklamı — App Store reddi
   riski yok, gelir kaybı var), `test/build-flags.test.mjs` ve bir e2e testi bunu tripwire
   olarak yakalıyor (kod okunarak doğrulandı) — ama testler ÇALIŞTIRILMAZSA insan hatası hâlâ
   mümkün.

3. ✅ **Build numarası** — iOS `MARKETING_VERSION=1.0`/`CURRENT_PROJECT_VERSION=1`, Android
   `versionName="1.0"`/`versionCode=1`, `package.json` "1.0.0" — TUTARLI. 🟢 Kozmetik:
   `index.html:1777`'deki "v1.0.0" metni SABİT yazılmış, kod içinden okunmuyor — gerçek
   MARKETING_VERSION "1.0" (üç haneli değil). Bugün sorun değil, ileride versiyon bump
   edilirse elle güncellenmesi unutulabilir.

4. ⚠️ **ÇELİŞKİ — 7-tık geliştirici modu şiddeti:** İki alt-inceleme bu maddeye FARKLI
   ağırlık verdi, ikisi de burada sunuluyor:
   - **Kod/belge açısından:** `versionRow` click handler'ı (app.js:8714-8730) hiçbir
     `DEV_MODE` kontrolü içermiyor — `devFlags.unlocked` (localStorage) ile tamamen bağımsız
     çalışıyor. `storage.js:382-387`'nin kendi yorumu bunu AÇIKÇA meşrulaştırıyor: "Yayında
     da kalacak (normal kullanıcı bulamayacağı için sorun değil, görev tanımında böyle
     istendi)" — yani bu **belgelenmiş, kasıtlı bir ürün kararı**, kaza değil.
   - **Etki açısından:** Açılan gizli panelde `devProSwitch` var — `devFlags.simulatePro`,
     `isUserPro()`'yu (`app.js:1215-1217`, `realPro || devFlags.simulatePro`) uygulamanın
     HER YERİNDE (paywall, seans limiti, can sınırı, 12 modun kilidi) true'ya çeviriyor,
     `storage.saveDevFlags()` ile KALICI localStorage'a yazılıyor. Yani App Store'a giden
     build'de, "Ayarlar → Hakkında" satırına 7 kez dokunan HERHANGİ bir kullanıcı satın
     almadan kalıcı tam Pro erişimi elde edebilir.
   - **Değerlendirme:** Kod bir hata değil — belgelenmiş bir tasarım kararı. Ama "normal
     kullanıcı bulamaz" varsayımı 2026'da App Store incelemecileri/meraklı kullanıcılar için
     zayıf bir güvenlik varsayımı (7-tık kalıpları bilinen bir desen). Bu, CLAUDE.md'nin
     "ürün kararı verme, tespit et ve sun" kuralına göre **YENİDEN ONAY gerektiren bir madde**
     — kod DEĞİŞTİRİLMEDİ, sadece App Store'a çıkmadan önce bilinçli bir "evet, bu böyle
     kalsın" onayı önerilir, çünkü etkisi (kalıcı ücretsiz Pro) gelir üzerinde doğrudan.

5. ✅ **`proPurchased` arka kapısı** — `devFlags.simulatePro` gerçek satın alma durumundan
   (`proPurchased`, StoreKit/Play Billing, tek yönlü) tamamen ayrı bir alanda tutuluyor,
   karışmıyor. URL parametresi, konsol komutu gibi BAŞKA bir arka kapı YOK — erişim sadece
   madde 4'teki 7-tık yoluyla.

6. ✅ **App Store beyanları** — `ads.js`/`iap.js` bu 59 commit'te sadece G239 (ads.js, davranış
   değil kaynak değişti) dokunmuş, `iap.js` hiç değişmemiş. Ağ çağrıları tarandı: sadece
   yerel bundle + Capacitor native köprüsü, dış sunucuya (analytics/telemetry) çağrı YOK.
   Info.plist/AndroidManifest bu 59 commit'te hiç değişmemiş — izin listesi (INTERNET,
   BILLING, AD_ID, NSUserTrackingUsageDescription) makul, fazladan izin yok.
   Mağaza metni/ekran görüntülerinin G216/G250 gibi isim değişiklikleriyle senkron olup
   olmadığı repodan görülemiyor — **BELİRSİZ**, App Store Connect'ten kontrol gerekir.

7. ✅ **capacitor.config.json** — debug server yönlendirmesi/`allowNavigation` fazlalığı YOK,
   temiz.

---

## G) KULLANICININ GÖREMEYECEĞİ ŞEYLER

1. ✅ **Bellek sızıntısı / node birikimi** — 5 kendi-kendini-planlayan rAF döngüsü + tüm
   `disconnect()` teardown noktaları tek tek okundu, temiz.

2. ✅ **Sessiz veri kaybı** — `trySave()` TÜM 13 save*() + app.js'in 3 doğrudan-localStorage
   anahtarının HEPSİNİ try/catch'liyor, QuotaExceededError yakalanıp toast ile bildiriliyor.

3. ✅ **Yarış durumu (çift tıklama)** — 13 `submit*Guess` fonksiyonunun HEPSİ `roundActive=false`'u
   kendi ilk satırlarında senkron set ediyor (async/await'ten önce) — JS'in tek iş parçacıklı
   modeli gereği çift-gönderim yapısal olarak imkânsız.

4. ✅ **Uzun oturumda birikim (event listener)** — 177 `addEventListener`, 0
   `removeEventListener` — ilk bakışta alarm verici ama tümü modül yüklenirken BİR KEZ,
   kalıcı DOM konteynerlerine bağlanan top-level "wiring" kodu (SPA, sayfa yeniden
   yüklenmiyor). Tekrar-render eden fonksiyonlar `innerHTML=` ile eski node'ları (ve
   listener'larını) komple değiştiriyor — GC'ye bırakılan güvenli desen.

5. **BELİRSİZ, bu turda yeniden koşulmadı** — arka plana alıp geri dönme / ses kesintisi
   ortasında yeni soru başlatma gibi "sadece belirli koşulda tetiklenen" senaryolar
   (TUR3B-ZAMAN-15-08 daha önce kapsamlı işlemiş, G234-236 ile düzeltilmiş — B tablosunda
   native tarafın da değiştiği doğrulandı — ama bu turda canlı/yeniden test edilmedi).

6. **BELİRSİZ** — uzun oturumda (1 saat+) TAM bellek profili hâlâ ölçülmedi (TUR5A-SAGLAMLIK
   "KISMEN ölçülebilir" demişti, bu tur da aynı sınırlamayı taşıyor).

---

## H) SON SORU — "keşke şuna bakılsaydı"

- **Android build'i `npx cap sync android` çalıştırılmadan ASLA alınmamalı** (E.4) — Android
  da düşünülüyorsa, App Store'a hazırlanırken unutulması en pahalı hata olur: eski, kısmen
  yanlış (bass_alt + yanlış Frekans Çakışması bölgeleri) bir kaynak kütüphanesiyle gönderim.
- **7-tık→kalıcı ücretsiz Pro** (F.4) — kod bir hata değil, belgelenmiş bir karar, ama App
  Store'a çıkmadan önce "bu böyle kalsın mı" diye bir kez daha bilinçli onaylanması önerilir
  (gelir etkisi doğrudan).
- `build-flags.js`'in "TEK bayrak" belgesi ile kodun (4 log ailesi hâlâ koşulsuz) arasındaki
  fark (F.1) DURUM.md'ye not düşülürse, gelecekteki bir tur bunu tekrar "keşfetmek" zorunda
  kalmaz.
- Q Genişliği'nin kulak butonlarından neden dışlandığı (D.3) küçük ama kullanıcı-görünür bir
  soru — "neden bu modda kulak yok" diye sorulabilir.
- `www/js/app.js`'in 12.500 satırlık DOM-orkestrasyon katmanı (A) hâlâ hiç satır satır
  okunmamış — App Store'dan SONRA bile, bir sonraki büyük özellik/refactor öncesi bu boşluğun
  kapatılması önerilir.
- `core/session-plan.js` gibi "ölü ama yeşil testli" kod (C) — `npm test`'in "1390/1390"
  güvenini yer yer YANILTICI kılıyor; bu dosyaya (ve varsa benzerlerine) bilinçli bir
  "kullanılmıyor, silinsin mi tutulsun mu" kararı önerilir (kod DEĞİŞTİRİLMEDİ).

---

## ÖZET

### 1) Yayını engelleyecek (🔴) bulgu
**YOK.** Bu turda derinlemesine incelenen alanlarda (B, D, E, F, G tam; A, C ağırlıklı)
App Store gönderimini durduracak bir fonksiyonel hata bulunamadı. Tek 🔴 işaretli madde
(A — app.js'in 12.500 satırının hiç okunmaması) bir HATA değil, bir **kapsam boşluğu** —
orada bir şey olabilir ama olduğuna dair kanıt da yok, "temiz" hükmü de verilemiyor.

### 2) Yayın öncesi düzeltilmesi/karara bağlanması iyi olacaklar (🟡)
- **F.4** — 7-tık → kalıcı ücretsiz Pro: belgelenmiş karar, ama gönderim öncesi bilinçli
  yeniden onay önerilir (gelir etkisi).
- **E.4** — Android native bundle senkron değil: Android planlanıyorsa `cap sync android`
  ZORUNLU, iOS'a engel değil.
- **F.1** — "43 tanı logu, TEK bayrak" iddiası yanlış: gerçek durum 16 koşulsuz log + 82
  DEV_MODE-korumalı çağrı. Ya kod tamamlanmalı ya belge düzeltilmeli. Davranışsal risk düşük.
- **D.3** — Q Genişliği'nin kulak butonu kapsamı dışı bırakılması: kasıtlı mı, atlanmış mı,
  ürün kararı gerekiyor.
- **A** — DURUM.md AÇIK İŞLER listesi (en az madde 3) stale, G214-261 sonrası topluca
  yeniden doğrulanmalı.

### 3) Önceki turların kaçırdıkları
- **BEYAN-DENETIM-15-08** → filepicker-diag/guide-i-diag/upload-context/scroll-diag
  etiketlerini hiç incelememiş → G239'un "tek bayrak" iddiasının neden eksik olduğunu
  açıklıyor.
- **Hiçbir önceki tur** → `computeReferenceEqGainsDb`'nin kırp-SONRASI ölçekleme sırasını
  (D.4) not etmemiş (bugün zararsız, ileride risk).
- **Hiçbir önceki tur** → Android native klasörünün www'den ne kadar geride olduğunu ÖLÇMEMİŞ
  (TUR6-YANETKI cap sync'ten genel olarak bahsediyor, bu spesifik diff'i almamış).
- **METIN-TARAMA-15-08/2** → sadece `toast()` ve string literal grep'i yaptı, app.js'in DOM-
  orkestrasyon gövdesini hiç okumadı (A) — bu turun da kapatamadığı en büyük açık.
- **Hiçbir önceki tur** → `core/session-plan.js`'in ölü kod olduğunu (yeşil testiyle birlikte
  yanıltıcı güven kaynağı) not etmemiş.
- **DURUM.md'nin kendisi** → AÇIK İŞLER listesini G214 sonrası hiç yeniden doğrulamamış,
  madde 3 en az 150 commit'tir güncel kodu yanlış tarif ediyor.

### 4) Hiç bakılmamış kalan yerler
- `www/js/app.js`'in ~12.500 satırlık DOM-orkestrasyon gövdesi (satır satır hiç okunmadı).
- Raporlar-arası "BELİRSİZ" madde çapraz-referansı (24 rapor, yüzlerce madde — sistematik
  takip hiç yapılmadı).
- `core/eq-loudness.js`, `core/level-sheet-terms.js`, `core/difficulty-curve.js` bu turda
  yeniden açılmadı (önceki turlarda görülmüş, bu turda doğrulanmadı).
- Hiç-test-edilmemiş-fonksiyon tam çapraz-referansı (test/ ↔ core/modes).
- "Belirli koşulda tetiklenen hatalar" (arka plan/kesinti senaryoları) bu turda canlı
  yeniden koşulmadı.
- Privacy Manifest, App Privacy beyanı, Paid Apps Agreement, App Store Connect ekran
  görüntüleri — repodan doğrulanamaz, kullanıcı aksiyonu gerekir.
- `core/iap.js` gerçek cihaz sandbox satın alma testi.
- VoiceOver ile ekran/aria-label tam taraması.
- Uzun oturum (1 saat+) tam bellek profili.

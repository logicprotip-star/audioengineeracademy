# OLCUM-ATLA-RENK-19-08 — Atlama için sarı renk: iş yükü ölçümü

**Görev tipi:** ÖLÇÜM. Kod değiştirilmedi, commit atılmadı.

---

## 1) `challenge.results` şu an ne tutuyor? Üçüncü durum eklenebilir mi?

`core/challenge.js:freshChallenge()` — `results: []`, HER eleman
`app.js:challengeTick()`'in `challenge.results.push(!!wasCorrect)`
satırıyla dolduruluyor (`app.js:6629`) — **SAF BOOLEAN dizi**, `true`/
`false` DIŞINDA bir değer TAŞIMIYOR. `!!` zorlaması var — üçüncü bir
durum (ör. `"skipped"` string'i) geçirilse bile ŞU AN `!!"skipped"` →
`true` olur, YANLIŞLIKLA "doğru" sayılır.

**Eklenebilir mi:** Evet, ama `results` dizisinin TÜRÜ değişmeli —
boolean yerine `"correct"|"wrong"|"skipped"` gibi bir STRING enum'a
(ya da `{correct: boolean, skipped: boolean}` şekilli nesnelere)
geçmek gerekir. `challengeTick(wasCorrect, gainedXp)` imzası da
üçüncü bir `skipped` parametresi (ya da AYRI bir `challengeTick`
çağrısı yolu) İSTER — `wasCorrect` TEK BAŞINA "atlandı" bilgisini
TAŞIYAMAZ.

**Çağrı noktaları (`grep` ile SAYILDI):** `challengeTick(` TOPLAM 21
kez çağrılıyor — 20'si HER modun KENDİ `submit*Guess()` fonksiyonunda
(10 `challengeTick(true, gained)` + 10 `challengeTick(false, 0)`,
GERÇEK yanlış cevaplar), **SADECE 1 tanesi** (`app.js:7375`,
`goToNextRound()`'un "roundActive iken terk edildi" dalı) GERÇEKTEN
"Atla"yı temsil ediyor. **Bu iyi haber:** "Atla" ile "gerçek yanlış
cevap" ZATEN TEK bir kod yolundan (`goToNextRound()`) ayırt
edilebiliyor — 20 mod-özel çağrı noktasına DOKUNMADAN, SADECE bu 1
noktaya bir `skipped:true` bayrağı eklemek YETERLİ.

---

## 2) Çubuğu çizen kod renkleri nereden alıyor?

`renderGameHeader()` (`app.js:4383-4388`, BÖLÜM çubuğu):
```js
dot.className = `game-chapter-dot${answered ? (challenge.results[i] ? " on" : " wrong") : ""}`;
```
`.on`/`.wrong` CSS SINIFLARI — renk KENDİSİ `www/styles.css`'te tanımlı
(satır 691-697):
```css
.game-chapter-dot{...background:rgba(255,255,255,.08);...}
.game-chapter-dot.on{background:var(--cyan)}
.game-chapter-dot.wrong{background:rgba(248,113,96,.6)}
```
**AYNI desen, SINAV/TELAFİ çubuğunda da var** (`app.js:4296-4302`,
`#gameExamDots` — `examSystem.examResults`/`remedialResults`, AYNI
BOOLEAN kısıtı) — CSS'i `styles.css:612-615`:
```css
.game-exam-dot{...background:rgba(255,255,255,.1)}
.game-exam-dot.on{background:var(--gold)}
.game-exam-dot.wrong{background:rgba(248,113,96,.6)}
```

---

## 3) Sarı renk tasarım sisteminde var mı? Hangi değişken?

**Evet — `--amber:#f0b442`** (`styles.css:52`, kısaltması `--am`,
satır 72: `--am:var(--amber)`). Zaten YOĞUN kullanılıyor: combo
göstergesi, "boss round" etiketi, timer çubuğu, VE Araçlar'ın
`TOOLS_THRESHOLD_AMBER` (`app.js:11336`) — orta/uyarı SEVİYESİNİ
temsil eden bir eşik rengi olarak (yeşil=iyi, amber=orta, kırmızı=
kötü). "Atlandı" (ne doğru ne yanlış) semantik olarak BU rolle
TUTARLI — YENİ bir renk İCAT ETMEYE gerek YOK.

**⚠️ Önemli ayrım (BÖLÜM vs SINAV/TELAFİ):** BÖLÜM çubuğunun "doğru"
rengi **cyan** (`#22d3ee`), amber'dan UZAK bir ton — amber'ı SKIP için
eklemek görsel olarak TEMİZ. AMA SINAV/TELAFİ çubuğunun "doğru" rengi
**gold** (`--gold:#e8c46a`) — amber (`#f0b442`) İLE GOLD, İKİSİ DE
sarı-altın tonlarında, GÖRSEL OLARAK BİRBİRİNE ÇOK YAKIN. Sınav
çubuğuna amber eklenirse "doğru" (gold) ile "atlandı" (amber) YAN
YANA neredeyse AYNI renk görünebilir — bu, madde 4/8'in DOĞRUDAN
ilişkili bir bulgusu, aşağıda tekrar ele alınıyor.

---

## 4) Sınav/telafi çubuğunda da aynı olmalı mı?

**Yapısal olarak AYNI kusuru taşıyorlar** — `examSystem.examResults`/
`remedialResults` da (`core/exam-system.js:341,358`)
`examResults.push(!!correct)` ile SAF boolean, `renderGameHeader()`'ın
`#gameExamDots` bloğu BİREBİR AYNI `.on`/`.wrong` deseniyle çiziyor.
**Tutarlılık AÇISINDAN evet, aynı olmalı** — kullanıcı BÖLÜM'de sarı
görüp SINAV'da görmemesi kafa karıştırıcı olurdu. AMA madde 3'teki
renk-çakışması (`gold` vs `amber`) nedeniyle SINAV/TELAFİ çubuğunda
amber'ın KENDİSİ (renk DEĞİŞTİRİLMEDEN) İYİ bir seçim OLMAYABİLİR —
**bu bir ÜRÜN/TASARIM KARARI, bu turda VERİLMEDİ.**

Ayrıca: SINAV/TELAFİ'de "Atla" mekanik olarak MÜMKÜN MÜ, ölçülmedi
(examSystem.recordAnswer()'ın "Atla" cevabını NASIL işlediği bu turda
İNCELENMEDİ) — eklenecekse bu da AYRICA doğrulanmalı.

---

## 5) İş yükü: kaç dosya, kaç satır, kaç test?

**Değişecek dosyalar (grep ile SAYILDI, sadece BÖLÜM çubuğu
kapsamında — SINAV/TELAFİ dahil edilirse madde 4'ün notuyla İKİYE
katlanır):**

| Dosya | Değişiklik | Kaba satır |
|---|---|---|
| `core/challenge.js` | `results` şekli (boolean→enum/nesne) | ~5-10 |
| `app.js` (`challengeTick`) | 3. parametre/ayrı çağrı yolu | ~5-10 |
| `app.js` (`goToNextRound`, satır 7375) | `skipped:true` bayrağı GEÇ | ~2-3 |
| `app.js` (`renderGameHeader`, satır 4383-4388) | 3. `if` dalı ("skipped" class) | ~3-5 |
| `www/styles.css` | `.game-chapter-dot.skipped{background:var(--amber)}` | ~2 |
| `test/challenge.test.mjs` (VARSA — bu turda ARANMADI) | yeni durum testleri | ~20-40 |
| `e2e/chapter-dots-order.spec.mjs` (70 satır, 1 test) | 3. durumu KAPSAYACAK şekilde GENİŞLETİLMELİ | ~30-50 |

**SINAV/TELAFİ'ye de yayılırsa (madde 4, AYRI bir ürün kararı
gerektirir):** `core/exam-system.js` (`examResults`/`remedialResults`
şekli, `recordAnswer()`), `app.js`'in `#gameExamDots` bloğu, CSS'e
`.game-exam-dot.skipped`, `test/exam-system.test.mjs` (549 satır,
mevcut kapsamlı test dosyası — GÜNCELLEME gerektirir).

**Kaba toplam (SADECE BÖLÜM):** ~5-6 dosya, ~70-120 satır — bu
oturumun G316-G322 tek-commit'lik düzeltmelerinin BÜYÜKLÜK
sınıfında, TEK bir "AYRI COMMIT"e SIĞACAK ölçekte. **SINAV/TELAFİ
dahil edilirse** kabaca İKİYE katlanır, ~10 dosya/~150-250 satır.

---

## 6) Kayıtlı kullanıcı verisi etkilenir mi?

**Hayır — HİÇBİRİ persist EDİLMİYOR (doğrulandı, `storage.js`
grep'lendi):**
- `challenge` — core/challenge.js'in KENDİ notu: "HİÇBİR YERDE
  localStorage'a persist EDİLMİYOR", `storage.js`'te "challenge"
  anahtarlı bir kayıt YOK.
- `examSystem.examResults`/`remedialResults` — `createExamSystem()`'in
  KAPALI (closure) değişkenleri, TAMAMEN BELLEK-İÇİ. `stats.examState`
  (persist EDİLEN kısım) SADECE `examLevel`/`tierStats` taşıyor,
  `examResults` DEĞİL.

**Sonuç: her yeni sayfa yüklemesi/round HER ZAMAN taze `results:[]`
ile başlıyor — eski/yeni şema göçü (migration) GEREKMİYOR, bu ikisi
için SIFIR risk.**

**⚠️ TEK istisna — `answerHistory` (KALICI, `ANSWER_HISTORY_KEY`):**
Madde 7'nin ele aldığı G285 kaydı `localStorage`'a YAZILIYOR
(`storage.js:658-675`). Eğer "atlandı" bilgisi BURAYA da eklenirse
(madde 7'nin gerektirdiği gibi), ESKİ kayıtlar bu YENİ alanı
TAŞIMAYACAK (`undefined` dönecek) — okuma tarafının bunu GÜVENLE
`false`'a düşürmesi gerekir (`record.skipped || false` gibi) — KÜÇÜK
ama GERÇEK bir geriye-dönük-uyumluluk detayı, bu turda YAZILMADI
(kod yazılmadı).

---

## 7) Hata analizi kaydı (G285) atlamayı ayrı tutuyor mu?

**HAYIR — atlamayı HİÇ TUTMUYOR, ne "ayrı" ne "yanlış" olarak; kayıt
HİÇ OLUŞMUYOR.** `recordAnswerHistoryEntry()` (`app.js:1318-1323`,
`buildAnswerRecord`'u sarıyor) SADECE HER modun `submit*Guess()`
fonksiyonunun İÇİNDEN çağrılıyor (`grep`'lendi — 11 çağrı noktası,
HEPSİ mod-özel submit fonksiyonları). `goToNextRound()`'un "Atla"
dalı (`app.js:7372-7377`) bu fonksiyonu **HİÇ ÇAĞIRMIYOR** —
`challengeTick`/`handleExamOutcome` DIŞINDA hiçbir şey yapmıyor.

**Sonuç: atlanan bir soru, "Hata Analizi"nin (answerHistory) beslediği
HİÇBİR ekranda GÖRÜNMÜYOR** — ne doğru ne yanlış ne de "atlandı"
olarak, TAMAMEN YOK. Bu, task'ın sorduğu "üçüncü durumdan BESLENEBİLİR
mi" sorusunun cevabını DOLAYLI olarak veriyor: **şu an BESLENEMEZ,
çünkü besleyecek bir KAYIT YOK** — `goToNextRound()`'un Atla dalına
`recordAnswerHistoryEntry()` çağrısı EKLEMEK (madde 5'in iş yükü
tahminine DAHİL EDİLMEDİ, bu AYRI/EK bir iş kalemi) gerekir. Bu,
task'ın SORMADIĞI ama ÖLÇÜLEREK bulunan bir GENİŞLEME noktası —
kullanıcıya AYRICA sorulmalı (kapsam DIŞI bırakıldı, sadece
BELGELENDİ).

---

## 8) ⚠️ Renk körlüğü — şekil/desen farkı gerekir mi?

**Öneri (ölçülerek desteklenmiş, KESİN bir karar DEĞİL):**

1. **BÖLÜM çubuğu için amber+cyan+red ÜÇLÜSÜ makul** — cyan (mavi-
   yeşil) ile red/amber (sıcak tonlar) arasındaki fark, en yaygın
   renk körlüğü türlerinde (protanopi/döteranopi, kırmızı-yeşil
   ekseni sıkışır) BİLE GENELDE ayırt edilebilir kalır — cyan mavi
   ekseninde, ikisi sıcak eksende ama farklı DOYGUNLUK/PARLAKLIKTA.
   YİNE DE amber/red BİRBİRİNE (özellikle döteranopi'de) YAKINLAŞABİLİR
   — bu turda GERÇEK bir kontrast-simülasyon aracıyla ÖLÇÜLMEDİ,
   tasarım-bilgisi düzeyinde bir UYARI.
2. **SINAV/TELAFİ çubuğu için amber+gold+red RİSKLİ** — madde 3/4'te
   ölçülen gold/amber yakınlığı renk körlüğünden BAĞIMSIZ olarak
   BİLE (herkes için) sorunlu — SINAV/TELAFİ'ye eklenecekse ya FARKLI
   bir renk (amber DEĞİL) ya da şekil/desen kullanılmalı.
3. **Genel WCAG ilkesi (renk körlüğünden bağımsız, iyi pratik):**
   renk TEK BAŞINA anlam taşımamalı (WCAG 1.4.1) — ÖNERİ: doğru=dolu
   nokta, yanlış=dolu nokta (kırmızı), **atlandı=İÇİ BOŞ/kesikli
   kenarlı bir nokta** (renk + şekil BİRLİKTE) — bu, MEVCUT `.game-
   chapter-dot`'un basit `border-radius` dikdörtgen/nokta şekline
   `border:1px dashed` gibi TEK BİR EK CSS kuralıyla (yeni bir ikon/
   SVG GEREKMEDEN) eklenebilir, iş yükünü ÖNEMLİ ÖLÇÜDE ARTIRMAZ.
   **Bu bir ÖNERİ — kesin tasarım kararı kullanıcıya/Logic'e
   bırakılmalı.**

---

## SONUÇ (ölçüm özeti, karar VERİLMEDİ)

- `challenge.results` boolean'dan enum'a geçmeli — TEK bir çağrı
  noktası (`goToNextRound()`, satır 7375) "Atla"yı zaten İZOLE
  tutuyor, değişiklik CERRAHİ olabilir.
- Amber (`--amber`/`--am`, #f0b442) HAZIR ve semantik olarak UYGUN —
  ama SINAV/TELAFİ çubuğunun "doğru" rengiyle (gold) ÇAKIŞIYOR, o
  çubukta AYRI bir renk/şekil gerekebilir.
- G285 hata analizi kaydı atlamayı HİÇ TUTMUYOR — üçüncü renk ile
  BİRLİKTE ele alınacaksa bu AYRI bir genişleme.
- Kayıtlı veri riski YOK (challenge/examResults persist edilmiyor);
  answerHistory'ye dokunulursa KÜÇÜK bir geriye-uyumluluk detayı var.
- Tahmini iş yükü: SADECE BÖLÜM ~5-6 dosya/70-120 satır (TEK commit'e
  sığar); SINAV/TELAFİ dahilse ~2 katı.
- Renk körlüğü: BÖLÜM'de amber/cyan/red MAKUL, SINAV/TELAFİ'de amber/
  gold RİSKLİ — şekil/desen (içi boş nokta) EKLEMEK ucuz bir ek
  güvence, ÖNERİLİYOR ama KESİN karar değil.

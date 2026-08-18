# OLCUM-ILERLEME-TASARIM-18-08

Ölçüm görevi. **KOD YAZILMADI, DOSYA DEĞİŞTİRİLMEDİ, COMMIT ATILMADI** —
`git status --short` bu turun SONUNDA sadece önceki turların OLCUM-*.md
dosyalarını gösteriyor. Bu bir TASARIM değişikliği fikrinin iş yükü/risk
ölçümüdür, uygulama ÖNERİSİ değil — yayına 6 gün kala karar kullanıcıya ait.

---

## A) MEVCUT YAPI

**Konum:** `www/index.html:833-976` (144 satır) — `#screen-progress`.

### Öğe listesi (tam, sırayla)

| # | Öğe | ID | Yapı | Akordiyon mu? | "i" butonu var mı? |
|---|---|---|---|---|---|
| — | Başlık + Ayarlar dişlisi | `prog-head` | satır | hayır | hayır |
| — | Boş durum (tüm ekranı kaplar, `stats.rounds===0` iken) | `progEmptyState` | ikon+başlık+alt metin+CTA butonu | — | hayır |
| 1 | **Günlük Görevler** | `dailyToggle`/`dailyWrap`/`dailyList` | LİSTE (3 satır, her satırda ikon+ilerleme çubuğu+XP) | **evet**, varsayılan AÇIK | **evet** (`dailyInfoBtn`) |
| 2 | **Son Cevaplar** | `recentToggle`/`recentWrap`/`historyList` | LİSTE, sola-kaydır→Sil (Pointer Events) | evet, varsayılan KAPALI | **hayır** |
| 3 | **İsabet Grafiği** | `accChartFilterWrap`/`accChartSvg` | SVG ÇİZGİ GRAFİĞİ (320×110 viewBox) | **hayır** (her zaman açık) | **evet** (`accChartInfoBtn`) |
| 4 | **Zayıf Bölge Raporu** | `zoneToggle`/`zoneWrap2`/`zoneList` | LİSTE (6 satır, çubuk+yüzde) | evet, varsayılan AÇIK | **evet** (`zoneInfoBtn`) |
| 5 | **Rozetler** | `badgesToggle`/`achievementList` | IZGARA (9 rozet, `prog-badge-grid`, kendi grid'i) | evet, varsayılan KAPALI | **evet** (`badgesInfoBtn`) |
| 6 | **Mod Seviyeleri** | `modeLevelsToggle`/`modeLevelsList` | LİSTE (12 mod satırı, çubuk+"Sv N") | evet, varsayılan KAPALI | hayır |
| — | Tehlike alanı ("İstatistikleri Sıfırla") | `resetStatsBtn` | tek buton | — | hayır |

**Toplam 6 "kart" + üst başlık + boş-durum + alt tehlike-alanı.** Öğe yapıları
BİRBİRİNDEN TAMAMEN FARKLI: 3 farklı LİSTE deseni (basit satır / sola-kaydırılabilir
satır / seviye çubuklu satır), 1 SVG çizgi grafiği, 1 ızgara (rozetler), hiçbiri
"ikon + kısa açıklama" gibi TEK bir ortak şekle indirgenmiş değil.

### Satır sayıları (ölçüldü)

| Katman | Satır | Not |
|---|---|---|
| HTML (`index.html:833-976`) | **144** | yorum satırları dahil |
| CSS (`.prog-*` kuralları, `styles.css:1995-2106`) | **112** (82 ayrı seçici) | yorum satırları dahil |
| JS — render fonksiyonları (`renderDaily`/`renderAchievements`/`renderHistory`+`bindHistorySwipe`/`renderZonePanel`/`renderModeLevels`/`renderAccuracyChart`/`renderChartLock`) | **183** | sadece render, `updateUI()`'ın ilerleme dilimini/olay bağlama satırlarını (`bindCollapsiblePanel`×4, "i" buton handler'ları×4, `clearRecentBtn`, Pro butonları) SAYMIYOR |
| JS — olay bağlama + `updateUI()` ilerleme dilimi | **~40** | `bindCollapsiblePanel` çağrıları, boş-durum toggle, `resetStatsBtn` |
| JS — `renderDailyTip()` (Ana Menü'yle PAYLAŞILAN, sadece kısmen İlerleme'ye ait) | 33 | zoneScores() İKİ ekranda da kullanılıyor |
| **JS toplam (İlerleme'ye özgü kısım)** | **~223** | |

### Akordiyon mekanizması

`bindCollapsiblePanel(toggleBtn, wrapEl, chevronEl)` (`app.js:8013-8020`, **8 satır**) —
son derece basit, JENERİK bir fonksiyon: `wrapEl`'in `.hidden` sınıfını
değiştirir, chevron'u 0°/180° döndürür. Uygulama genelinde **6 yerde** kullanılıyor
(5'i İlerleme'de: Günlük/Son Cevaplar/Zayıf Bölge/Rozetler/Mod Seviyeleri, 1'i
Ana Menü'deki "Bugünün Önerisi" kartında) — İlerleme'ye ÖZGÜ değil, paylaşılan
bir yardımcı. Kendisi TEK BAŞINA düşük risk taşıyor (basit, iyi test edilmiş,
DOM şekline bağımlı değil — SADECE bir toggle/chevron elemanı bekliyor).

### Bugün eklenen 4 "i" butonu bu yapıya bağlı mı?

**EVET, SIKI biçimde bağlı — bu ölçümün EN ÖNEMLİ tek bulgusu.**
`dailyInfoBtn`/`zoneInfoBtn`/`badgesInfoBtn` (3'ü) akordiyon-aç/kapa satırının
(`prog-card-head-row prog-clickable`) TAM İÇİNDE duruyor — satırın KENDİSİ
tıklanınca akordiyon açılıyor, bu yüzden "i" butonunun kendi tıklaması
`e.stopPropagation()` ile AYRILMAK ZORUNDA (aksi hâlde "i"ye basmak hem sheet'i
açar hem akordiyonu yanlışlıkla aç/kapardı — G245/G262'de zaten yaşanmış bir
hata sınıfı). `accChartInfoBtn` (4.) bu korumaya İHTİYAÇ DUYMUYOR çünkü İsabet
Grafiği akordiyon DEĞİL.

Bu 4 butonu GERÇEK tarayıcıda doğrulayan **`e2e/guide-sheet-new-buttons.spec.mjs`**
(156 satır, 4 test) BUGÜN yazıldı ve ÜÇÜ doğrudan mevcut DOM şekline
bağımlı:
- "4 buton doğru başlıkla sheet açıyor" — `#dailyInfoBtn` vb. ID'lere bağımlı.
- "akordiyon içindeki 'i' stopPropagation ile akordiyonu YANLIŞLIKLA açmıyor" —
  `#achievementList`'in `.hidden` sınıfını VE `#badgesToggle .prog-card-label`'a
  tıklamanın akordiyonu GERÇEKTEN açtığını DOĞRUDAN kontrol ediyor.
- "mode-info-btn-lg görsel boyut değişmiyor, dokunma alanı 44×44'e büyüyor" —
  butonun `::before` sözde-elemanının konumuna/boyutuna bağımlı.

**Sonuç:** Akordiyon yapısı DEĞİŞİRSE (kart-ızgarasına geçilirse) bu test
dosyasının EN AZ 3/4 testi YENİDEN YAZILMALI (sadece "hâlâ geçer mi" diye
çalıştırmak yetmez — DOM varsayımları geçersiz kalır).

---

## B) KART DÜZENİNE GEÇİŞ

### Modların kart düzeni yeniden kullanılabilir mi?

**Kısmen — SADECE görsel/CSS iskelet düzeyinde, İÇERİK modeli düzeyinde HAYIR.**

`.mode-grid`/`.mode-card` (`styles.css:377-483`, ~107 satır) **SADECE 2 yerde**
kullanılıyor: `#modeGrid` (Ana Menü'nün 12 modu) ve `#comingGrid` ("yakında"
placeholder modları) — İKİSİ de Ana Menü ekranında. `.mode-card`'ın sabit iç
şekli: `.mode-card-viz` (min-height:84px, KÜÇÜK bir ikon/mini-SVG alanı) +
`.mode-card-body` (isim + 1-2 satır açıklama + opsiyonel ince ilerleme çubuğu).
Bu şekil "ikon + kısa metin" için tasarlanmış — İlerleme'nin 6 öğesinin
HİÇBİRİ bu şekle doğal olarak OTURMUYOR (aşağıya bkz.).

`renderExerciseGrid()` (`app.js:3325-3457`, ~133 satır) kartları **JS ile
`document.createElement("button")` + `innerHTML` şablonuyla DİNAMİK üretiyor**
— HTML'de elle yazılmış statik kart YOK. Kartın **TAMAMININ TIKLANMASI BAŞKA
BİR EKRANA (oyun ekranına) GEÇİYOR** (`card.addEventListener("click", ...)` →
`goScreen`/mod başlatma) — **kart-içi GENİŞLEME/detay AÇMA YOK**, tamamen farklı
bir etkileşim modeli. İlerleme'nin "kart üstüne basınca DETAY açılsın" isteği
bu YAPIYI DOĞRUDAN kopyalayamaz — navigasyon değil, YERİNDE detay gösterimi
gerekiyor.

### Her öğe karta sığar mı?

**Hayır, doğrudan değil — 3 öğe özellikle sorunlu:**

- **İsabet Grafiği**: gerçek bir SVG çizgi grafiği (320×110, eksen etiketli).
  `.mode-card-viz`'in 84px yüksekliğine/~165px genişliğine (375px ekranda,
  2 sütun, 16px kenar + 12px boşluk hesabıyla) sıkıştırılırsa ya OKUNAMAZ
  hâle gelir ya da kart tipografisiyle TUTARSIZ şekilde büyütülmesi gerekir.
- **Rozetler**: 9 rozetlik kendi ızgarası (`prog-badge-grid`) — bir "önizleme"
  kartına sadece 1-2 rozet sığar, "9'dan kaçı açık" görsel özeti kaybolur
  (şu an akordiyon AÇILINCA hepsi bir arada görünüyor).
- **Son Cevaplar**: sola-kaydır→Sil jesti (`bindHistorySwipe`, Pointer Events,
  30 satır) TEK TEK satırlara bağlı — bir "kart önizlemesi" içinde bu jest
  ANLAMSIZ, sadece detay görünümünde (sheet/liste) korunabilir.

Diğer 3 öğe (Günlük Görevler/Zayıf Bölge/Mod Seviyeleri) LİSTE yapısında —
bunlar bir kart-önizlemesine "ilk N satır" ya da "özet sayı" (ör. "3/6 bölge
zayıf") olarak indirgenebilir, ama bu da MEVCUT render fonksiyonlarının
YANINA yeni bir "özet" varyantı YAZILMASINI gerektirir (var olan fonksiyonlar
zaten TAM listeyi üretiyor, kısaltılmış bir önizleme ÜRETMİYOR).

### Detay açılışı nasıl olur?

Kod tabanı ZATEN BASKIN bir "sheet" (alt panel) deseni kullanıyor —
`grep` ile sayıldı: **8 farklı sheet bileşeni** (`guideSheet`, `hpSheet`,
`lvlSheet`, `mainSettingsSheet`, `settingsSheet`, genel `sheetOptions`,
`toolsFilesSheet`, `gameSettingsSheet`). "Ayrı ekran" (yeni bir `.screen`)
SADECE gerçek OYUN ekranları için kullanılıyor — bilgi/detay göstermek için
HİÇBİR yerde ayrı ekran YOK. "Genişleyen kart" (in-place expand) zaten
BUGÜN VAR — o da akordiyon (bkz. A). Yani üç seçenek de kod tabanında
KARŞILIĞI olan gerçek bir desen, ama:

- **Ayrı ekran**: HİÇ emsali yok, EN UZAK/en pahalı seçenek.
- **Genişleyen kart (akordiyon)**: ZATEN mevcut olan — "kart ızgarasına
  geçip SONRA yine akordiyonla genişletmek" ek bir katman/karmaşıklık
  katar (grid içinde genişleyen bir hücre CSS'te dikkatli ele alınmalı —
  `grid-template-columns:1fr 1fr` içinde tek bir hücrenin dikeyde büyümesi
  komşu hücrenin konumunu ETKİLEMEZ ama görsel olarak "kartlardan biri
  aniden uzuyor" hissi verir, mode-card'da hiç KARŞILAŞILMAMIŞ bir durum).
- **Sheet**: `openGuideSheet()` (`app.js:7535` civarı) zaten TAM OLARAK
  "karta bas → detay aç" akışını 4 kez ÇALIŞTIRIYOR — ama bugünkü içeriği
  SADECE statik açıklama metni (guide-texts.js), CANLI VERİ (tam rozet
  ızgarası, tam geçmiş listesi, büyük grafik) GÖSTERMİYOR. Sheet'i "canlı
  veri de gösterebilecek" şekilde GENİŞLETMEK gerekir — mevcut render
  fonksiyonları (renderAchievements/renderHistory/vb.) zaten TAM içeriği
  üretiyor, bu içeriği guideSheet'in gövdesine YÖNLENDİRMEK (ya da yeni bir
  ikinci sheet açmak) teknik olarak mümkün ama YENİ bir bağlama/yönlendirme
  katmanı gerektiriyor.

**Hangisi mevcut kod desenlerine en yakın:** **Sheet.** Ayrı ekran hiç emsalsiz;
genişleyen kart zaten var ama ızgara içinde YENİDEN kurulması gerekir (aşağı
D'ye bkz. — komşu kart taşması riski); sheet ise ZATEN "karta bas → detay"
akışının BİREBİR aynısını 4 kez çalıştırıyor, sadece içerik modelinin
genişletilmesi gerekiyor.

---

## C) İŞ YÜKÜ (dosya/satır/test sayısı — saat DEĞİL)

| Katman | Tahmini değişen/yeni satır | Gerekçe |
|---|---|---|
| `www/index.html` | ~150-200 satır (mevcut 144'ün YERİNE) | ızgara kabuğu + 6 kart + her kartın önizleme alanı |
| `www/styles.css` | ~120-180 YENİ satır | `.mode-grid`/`.mode-card` LİTERAL paylaşılmamalı (bkz. D) — AYRI, KOPYA sınıflar (`.prog-tile`/`.prog-tile-grid` gibi) + 6 farklı içerik-tipi için iç düzen kuralları (chart-tile/list-preview-tile/grid-preview-tile birbirinden FARKLI, mode-card'ın TEK biçimli CSS'inden daha fazla kural gerekir) |
| `www/js/app.js` | ~250-350 satır (yeni+değişen, ~100-150 ESKİ akordiyon-bağlama satırı SİLİNEREK) | (a) ızgara render fonksiyonu, (b) 6 kart için "önizleme" şablonu (mevcut render fonksiyonlarının YANINA, onları DEĞİŞTİRMEDEN), (c) detay-açma yönlendirmesi (sheet içerik-model genişletmesi), (d) 4 "i" butonunun yeni tıklama hiyerarşisine göre stopPropagation yeniden kurulumu |
| **Yeni bileşen gerekiyor mu?** | **Evet** | En az: (1) kart-önizleme şablon ailesi (6 fonksiyon), (2) "canlı veri gösterebilen detay sheet" — guideSheet'in bugünkü "sadece statik metin" modeli bunu karşılamıyor, genişletilmesi/yanına yenisinin eklenmesi gerekiyor |
| `e2e/guide-sheet-new-buttons.spec.mjs` | **156 satırın ÇOĞU YENİDEN YAZILIR** (3/4 test DOM varsayımına bağımlı) | bugün eklenen dosya, doğrudan risk altında |
| `e2e/menu-scroll-position.spec.mjs` | değişmez ama YENİDEN doğrulanmalı | jenerik scroll kontrolü, kırılma İHTİMALİ düşük ama ölçülmedi |
| `test/progress.test.mjs` (271 satır) | **0** | pure veri fonksiyonları (progress.js), DOM'a hiç dokunmuyor — bu iş tamamen GÜVENDE |
| Yeni e2e testleri | tahmini +150-250 satır (4-8 yeni test) | ızgara düzeni/dar ekran/boş durum/detay açılış-kapanış |
| **TOPLAM tahmini dosya sayısı** | **~6** | index.html, styles.css, app.js, guide-sheet-new-buttons.spec.mjs (yeniden yazım), 1 yeni e2e dosyası, (muhtemelen) core/guide-texts.js dokunulmadan kalır |
| **TOPLAM tahmini satır** | **~700-950 satır dokunulan/yeni kod** (test dahil) | |

Mevcut testler kırılır mı: **Evet, kesin olarak `e2e/guide-sheet-new-buttons.spec.mjs`'in
en az 3 testi** (DOM yapısına doğrudan bağımlı oldukları KANITLANDI, madde A'ya bkz.).
`e2e/menu-scroll-position.spec.mjs` kırılma İHTİMALİ var ama ÖLÇÜLMEDİ (jenerik
scrollHeight/scrollTop kontrolü, muhtemelen dayanıklı — "muhtemelen" burada
BİLEREK yazıldı, bu madde gerçek bir uygulama olmadan KESİN ölçülemez).

---

## D) RİSK ⚠️ EN ÖNEMLİ

### Ana menünün kart düzeni paylaşılıyorsa, İlerleme'ye uygulamak Ana Menü'yü bozar mı?

**Doğrudan sınıf paylaşımı (`.mode-grid`/`.mode-card`'ı OLDUĞU GİBİ kullanmak)
YAPILIRSA: EVET, gerçek bir risk oluşturur.** `.mode-card`/`.mode-grid`
ŞU AN sadece 2 tüketicisi olan (menüdeki `#modeGrid` + `#comingGrid`) paylaşılan
bir CSS sınıfı — İlerleme'yi ÜÇÜNCÜ tüketici yapmak, GELECEKTE bu sınıflarda
yapılacak HERHANGİ bir değişikliğin (padding/renk/grid-gap/breakpoint) blast
radius'unu 2'den 3'e çıkarır, bir ekran için yapılan bir ince ayar diğer
ikisini SESSİZCE etkileyebilir. **Ölçülen somut bir örnek:** `.mode-grid`'in
kendi breakpoint'i `@media (max-width:389px){.mode-grid{grid-template-columns:1fr}}`
(G293, bu OTURUMUN kendi önceki turunda eklendi) — SINIF paylaşılsaydı, bu
satırı gelecekte DEĞİŞTİRMEK (örn. menü için 420px'e geri almak) İlerleme'nin
düzenini de FARKINDA OLMADAN değiştirirdi.

**Önerilen (ama bu turda UYGULANMAYAN) azaltma:** literal sınıf paylaşımı
YERİNE AYRI, kopya sınıflar (`.prog-tile-grid`/`.prog-tile` gibi) tanımlamak —
görsel TUTARLILIK korunur (aynı görünüm), ama İKİ ekran birbirinden CSS
düzeyinde TAMAMEN BAĞIMSIZ kalır. Bu YAKLAŞIM SEÇİLİRSE Ana Menü'ye SIFIR
doğrudan risk — ama madde C'deki CSS satır tahminini ARTTIRIR (kopyalama
= daha fazla satır, daha az "yeniden kullanım").

### Boş durum (hiç veri yokken) nasıl görünür?

**Ekran-geneli boş durum (`progEmptyState`, `stats.rounds===0` iken) ZATEN
`progContent`'in TAMAMININ YERİNE geçiyor** (`app.js:3526-3527`,
`classList.toggle("hidden", stats.rounds>0)`) — bu anahtar mekanizma
`progContent`'İN İÇİNDEKİ yapıdan (yığın mı ızgara mı) BAĞIMSIZ, güvenle
KORUNUR, düşük risk.

**AMA per-kart kısmi-boş durumlar (kullanıcı BİRKAÇ tur oynadı ama ör. hiç
rozet kazanmadı / henüz 30 günlük grafik verisi yok) BUGÜN ZATEN VAR**
(`accChartEmpty` metni, `prog-hist-empty` "Liste temizlendi", zoneList'te
"—" yüzde) — **ama bunlar SADECE AÇIK/genişletilmiş durumda görünüyor.**
Bir "kart önizlemesi" tasarımında bu durumların KAPALI/önizleme hâlde NASIL
görüneceği (ör. "Rozetler" kartı 0/9 iken önizlemede ne gösterilecek?)
BUGÜN TANIMLI DEĞİL — YENİ bir tasarım kararı + YENİ kod gerektirir (madde
C'nin tahminine zaten dahil edildi, ama BURADA AYRICA riskli/eksik bir
alan olarak vurgulanıyor: 6 kartın HER BİRİ için ayrı bir "boş önizleme"
metni/durumu tasarlanıp yazılmalı, bugün SADECE 3'ünün genişletilmiş
hâlde boş-durum metni var, DİĞER 3'ünün [Günlük/Mod Seviyeleri/Son
Cevaplar-dolu-liste] hiç yok).

### Dar ekranda (375px) kartlar sığar mı?

**`.mode-grid`'İN KENDİ ölçülmüş (G293) davranışı REUSE EDİLİRSE: 375px
ZATEN TEK SÜTUNA DÜŞÜYOR** (`@media (max-width:389px)`, 375<389). Yani
375px'te (iPhone SE/mini) "ikişerli kart" hedefi zaten GERÇEKLEŞMİYOR —
tek sütun, dikey liste hâline dönüyor (görsel olarak kart-çerçeveli ama
YİNE tek sütun). Bu, tasarımın kendi VAAT ETTİĞİ "ikişerli" görünümün
EN KÜÇÜK yaygın iPhone'da (SE/mini) HİÇ gerçekleşmeyeceği anlamına gelir —
AYNI eşik kopyalanırsa risk YOK (davranış zaten bilinip kabul edilmiş) ama
YENİ/farklı bir eşik seçilirse BAŞTAN ölçülmesi gerekir.

### Bugün eklenen "i" butonları bozulur mu?

**Yüksek olasılıkla EVET, en az 3/4'ü.** Madde A'da detaylandırıldı —
`stopPropagation()` koruması BUGÜNKÜ akordiyon-satırı yapısına göre
kuruldu; kart-ızgarasına geçilip "karta basınca detay aç" davranışı
eklenirse, "i" butonu ARTIK İKİ AYRI tıklama hedefinin (kartın kendisi
VE "i") İÇ İÇE olduğu YENİ bir çakışma senaryosu yaratır — AYNI
stopPropagation deseni gerekir ama YENİDEN KURULMALI, otomatik
KORUNMAZ. `e2e/guide-sheet-new-buttons.spec.mjs`'in DOM-varsayımlı
3 testi bunu KANITLAR (madde A/C).

### Grafik ve ızgara gibi öğeler kart içinde kırpılır mı?

**Evet, önizleme boyutunda (mode-card'ın ~84px viz alanı) kırpılma/okunamaz
hâle gelme riski YÜKSEK** — madde B'de detaylandırıldı (İsabet Grafiği'nin
320×110 SVG'si, Rozetler'in 9 öğelik ızgarası). Bu iki öğe basit bir
"küçült ve sığdır" ile ÇÖZÜLEMEZ, ÖZEL bir önizleme tasarımı (ör. grafik
için SADECE son N gün trend oku/mini-sparkline, rozetler için "3/9 açık"
sayacı + en son kazanılan rozetin tek ikonu) gerekir — bu, madde C'nin
"yeni bileşen" tahminine zaten dahil ama BURADA ayrıca netleştiriliyor:
mevcut render fonksiyonları (`renderAccuracyChart`/`renderAchievements`)
DOĞRUDAN yeniden kullanılamaz, YENİ "mini" varyantları YAZILMALI.

---

## E) ALTERNATİF (daha küçük iyileştirme)

Task'ın kendi sorunu ("kullanıcı hangi bilginin önemli olduğunu ayırt
edemiyor, çok kaydırıyor") tam kart-ızgarasına geçmeden de, MEVCUT
akordiyon altyapısını KORUYARAK ele alınabilir:

1. **Tümünü varsayılan KAPALI yap** — bugün Günlük Görevler + Zayıf Bölge
   Raporu varsayılan AÇIK (`index.html`'de `hidden` sınıfı YOK), diğer 3'ü
   KAPALI. Hepsini KAPALI'ya çevirmek (sadece başlık satırları + sayaçlar
   görünür) sayfayı İLK açılışta ÇOK daha kısa gösterir — "çok kaydırma"
   şikayetini DOĞRUDAN hedefler. **Tahmini değişiklik: index.html'de birkaç
   `hidden` sınıfı eklemek/chevron rotate'ini kaldırmak, ~6-10 satır.
   SIFIR yeni JS, SIFIR CSS, MEVCUT `bindCollapsiblePanel` aynen çalışır.
   Test kırılma riski: DÜŞÜK (guide-sheet testinin "ön koşul: kapalı
   başlamalı" kontrolü zaten BAZI kartlar için bunu bekliyor, tutarlı
   hâle gelir).**
2. **Başlık satırına küçük bir ÖZET eklemek** (kart KAPALIYKEN bile
   görünecek şekilde) — bugün KISMEN var (`dailyCounter`: "bugün · 0/3",
   `achievementCount`: "0/9") ama Zayıf Bölge Raporu'nda "6 bölge" (sabit
   metin, VERİ değil) ve Mod Seviyeleri'nde HİÇ özet yok. "En zayıf: Bas
   %32" / "Ortalama Sv 4" gibi tek satırlık DİNAMİK özetler eklemek,
   kullanıcının kartı AÇMADAN önemli bilgiyi görmesini sağlar — kart-
   ızgarasının vaat ettiği "önemi ayırt etme" faydasının ÇOĞUNU, çok daha
   düşük maliyetle verir. **Tahmini: `renderZonePanel`/`renderModeLevels`'e
   birkaç satır ekleme (~15-25 satır JS), HTML'de 2 yeni `<div>` alanı.**
3. **Sıralama** — En "ödüllendirici"/pozitif kart (ör. Rozetler ya da
   Günlük Görevler) en üste, "tehlike alanı" zaten en altta (DEĞİŞMEDİ).
   **Tahmini: index.html'de blok sırasını değiştirmek, 0 satır yeni kod.**

Bu üçü BİRLİKTE uygulanırsa (tahmini **1 dosya, <100 satır, mevcut testler
DEĞİŞMEDEN geçer**) "daha profesyonel/taranabilir" hissinin BÜYÜK kısmını,
kart-ızgarasının riskli/pahalı kısımlarına (grafik/ızgara kırpılması,
sheet içerik-modeli genişletmesi, "i" buton yeniden kablolaması, 156
satırlık test dosyasının yeniden yazılması) HİÇ girmeden verir.

---

## SONUÇ

1. **İş yükü tahmini:** ~6 dosya, ~700-950 satır (kod+test), en az 1 YENİ
   bileşen ailesi (kart-önizleme şablonları + genişletilmiş/yeni bir
   "canlı veri gösteren detay sheet" mekanizması). Mevcut testlerden
   `e2e/guide-sheet-new-buttons.spec.mjs`'in en az 3/4 testi YENİDEN
   YAZILMALI (kırılacağı KANITLANDI, sadece "belki" değil).

2. **Risk seviyesi: YÜKSEK.** Gerekçe: (a) Ana Menü'yle CSS sınıf paylaşımı
   dikkatli yapılmazsa gerçek bir menü-bozulma riski taşıyor (ölçülen somut
   örnek: G293'ün breakpoint'i), (b) 3 farklı içerik tipi (grafik/ızgara/
   sola-kaydırılabilir liste) kart-önizleme şekline DOĞAL OTURMUYOR, ÖZEL
   tasarım+kod gerektiriyor, (c) BUGÜN eklenen 4 "i" butonunun testi
   doğrudan kırılıyor, (d) per-kart boş-durum tasarımı bugün YOK, sıfırdan
   yazılmalı.

3. **6 gün kala yapılması önerilir mi:** Ölçüm bunu ÖNERMEZ — bu bir ÜRÜN
   KARARI, ama toplanan kanıt (madde C/D) bu boyuttaki bir TASARIM
   değişikliğinin yayın öncesi dar bir pencerede, YENİ regresyon riski
   (özellikle Ana Menü'ye sızma ihtimali) taşıyarak yapılmasının riskli
   olduğunu gösteriyor. Nihai karar kullanıcıya/Logic'e ait.

4. **Daha ucuz bir alternatif var mı:** **Evet** — madde E'deki 3 değişiklik
   (varsayılan kapalı + dinamik özet satırı + sıralama), MEVCUT akordiyon
   altyapısını hiç bozmadan, ~1 dosya/<100 satırla, SIFIR test kırılmasıyla
   "önemli bilgiyi ayırt etme" sorununun büyük kısmını hedefler.

# OLCUM-I-METINLERI-17-08

Ölçüm-only tur. KOD YAZILMADI, COMMIT ATILMADI. Kapsam: uygulamadaki "i"
(bilgi) buton sistemi — mevcut durum, eksikler, içerik kalitesi,
erişilebilirlik.

## A) MEVCUT DURUM

### A.1 — Kaç adet "i" butonu var, tam liste

**DOM'da 5 farklı "i" butonu var** (hepsi `www/index.html`'de, tıkla-aç/
tıkla-kapa, hiç solmayan KALICI sistem — `core/guide-texts.js` dosya başı
notu, "GEÇİCİ SPOTLIGHT rehber turu"ndan AYRI):

| Buton (id) | Dosya:satır | Ekran | İçerik kaynağı |
|---|---|---|---|
| `#menuInfoBtn` | index.html:45 | Ana Menü | `GENERAL_GUIDE` |
| `#gameInfoBtn` | index.html:246 | Oyun ekranı (tüm 12 mod, TEK paylaşılan buton — `mode.getMeta().id` tıklama anında okunuyor) | `MODE_GUIDE_TEXTS[modeId]` + `MODE_OPTIONS_TEXTS[modeId]` |
| `#toolsTonalInfoBtn` | index.html:1037 | Araçlar → Tonal Balance kartı | `TOOLS_TONAL_GUIDE` |
| `#toolsResultsInfoBtn` | index.html:1106 | Araçlar → Ölçüm Sonuçları kartı | `TOOLS_RESULTS_GUIDE` |
| `#toolsFilterInfoBtn` | index.html:1163 | Araçlar → Referans Filtreleri kartı | `TOOLS_FILTER_GUIDE` |

Hepsi TEK bir `openGuideSheet(modeId)` fonksiyonuna bağlanıyor
(`app.js:7420`), tek paylaşılan `guideSheet` bottom-sheet'ini dolduruyor —
YENİ bir sheet/DOM İCAT EDİLMEMİŞ (`app.js:7505-7534`).

**5 DOM butonu, ama 16 AYRI içerik gövdesi** var (`core/guide-texts.js`):
`GENERAL_GUIDE` (1) + `MODE_GUIDE_TEXTS`/`MODE_OPTIONS_TEXTS` çifti (12
mod) + `TOOLS_TONAL_GUIDE`/`TOOLS_RESULTS_GUIDE`/`TOOLS_FILTER_GUIDE` (3)
— `#gameInfoBtn` TEK bir DOM elemanı ama tıklama anında hangi modda
olduğuna göre 12 farklı içerikten birini gösteriyor.

⚠️ **Levelİlgili bir 6. mekanizma daha var, "i" butonu DEĞİL ama işlevsel
olarak bilgi veriyor:** `#levelChip` (index.html:234, "Seviye bilgisi"
aria-label) tıklanınca `lvlSheet` açılıyor (`renderLevelSheet()`,
app.js:7329) — bu bir "i" AÇIKLAMASI değil, o anki hassasiyet/şık sayısı/
sıradaki seviyeye kalan XP'yi CANLI VERİ olarak gösteriyor (prose açıklama
YOK, sadece sayılar/etiketler). Ayrı olarak sayılmadı çünkü glyph/class
`.info-btn`/`.mode-info-btn` DEĞİL, ayrı bir mekanizma (`Z6`).

### A.2 — Her birinin metni kaç kelime, ne anlatıyor

Kelime sayıları `node`'da `guide-texts.js`'in kendi export'ları import
edilip `split(/\s+/)` ile ölçüldü (tahmin değil):

**GENERAL_GUIDE** (5 bölüm, ana menü "i"si):
| Başlık | Kelime | Not |
|---|---|---|
| Nasıl çalışır? | 28 | Genel mekanik (dinle→bul→neden açıklanır) |
| Seviye ve zorluk | 18 | Kısa, doğru bildikçe zorlaşma |
| Sınav ve bölüm geçme | 37 | 6-doğru-sınav kuralı, telafi turu |
| Ücretsiz ve Pro | 53 | `hideForPro:true` — Pro'da GİZLENİR |
| Can | 14 | `hideForPro:true` — Pro'da GİZLENİR |

**TOOLS_TONAL_GUIDE** (8 bölüm, 14-80 kelime aralığı — "Pop / EDM /
Akustik" 80 kelimeyle diğerlerinden BELİRGİN uzun, madde C'de not edildi).

**TOOLS_RESULTS_GUIDE** (7 bölüm, 19-47 kelime), **TOOLS_FILTER_GUIDE**
(4 bölüm, 22-28 kelime) — ikisi de dengeli, aşırı uzun/kısa yok.

**MODE_GUIDE_TEXTS** (12 mod, "ne öğretir"): 20-41 kelime arası, ortalama
~28. **MODE_OPTIONS_TEXTS** (12 mod, "oyun seçenekleri"): 30-51 kelime
arası, ortalama ~34. İkisi birlikte her modun "i"si ~55-90 kelime toplam.

### A.3 — 12 modun kaçında var

**12/12 (%100).** `MODE_GUIDE_TEXTS`/`MODE_OPTIONS_TEXTS`'in anahtar
kümesi `mode-catalog.js`'in `playable:true` 12 id'siyle (`frekans-bulma,
kesim-noktasi, q-genisligi, boost-mu-cut-mu, db-seviyesi, stereo-genislik,
pan-konumu, kompresor, reverb, tonal-denge, distortion,
frekans-cakismasi`) BİREBİR eşleşti (`node` ile karşılaştırıldı).

⚠️ **Dürüstlük notu:** `guide-texts.js:200`'deki yorum ("Anahtarlar
mode-catalog.js'in id'leriyle BİREBİR aynı (**10** oynanabilir mod)")
ARTIK YANLIŞ/BAYAT — gerçek sayı 12 (kod büyürken yorum güncellenmemiş).
İçerik/işlev DOĞRU (12/12 kapsanıyor), sadece bir kod-yorumu bayat.

### A.4 — Araçlar sekmesinin 4 kartının kaçında var

**3/4.** Tonal Balance, Ölçüm Sonuçları, Referans Filtreleri var —
**Mixini Yükle YOK** (`index.html:986-998` — kart başlığı `.tools-card-title`
+ `#toolsUploadBtn` (dosya seç) var, ama `mode-info-btn`/`InfoBtn` deseni
HİÇ yok, `grep` ile doğrulandı).

⚠️ **Görev metninin bir iddiası ÖLÇÜLDÜ ve YANLIŞ çıktı:** Görev "Referans
Filtreleri — sonuncusu G285'te eklendi" diyor. `git log -S
"TOOLS_FILTER_GUIDE"` bunu **G262**'de bulundu ("G262: üç metin
düzeltmesi — RX adı kaldırıldı, Clean Gitar, Referans Filtreleri 'i'
butonu", commit `8d5acc3`) — G285 answer-history (cevap geçmişi) işiydi,
Referans Filtreleri'yle İLGİSİZ. Kod yorumu da `OLCUM-CIHAZ-16-08.md
madde H.3`'e atıf yapıyor, G285'e değil.

### A.5 — İlerleme sekmesinde var mı

**HAYIR, HİÇ YOK.** `screen-progress` (index.html:827-958) TAMAMEN
tarandı — Günlük Görevler, Son Cevaplar, İsabet Grafiği, Zayıf Bölge
Raporu, Rozetler, Mod Seviyeleri kartlarının HİÇBİRİNDE `info-btn`/
`mode-info-btn` yok. Kartların hepsi sadece başlık+sayaç+chevron
(akordiyon aç/kapa) — açıklayıcı TEK bir "i" yok.

### A.6 — Ayarlar'da var mı

**"i" butonu olarak HAYIR** (`#mainSettingsSheet`, index.html:1681-1789
tarandı) — ama çoğu satırın KENDİ `<p>` alt-açıklaması var (ör. "Bugünün
önerisini göster" → "Ana menüde zayıf bölgene göre günlük öneri kartı",
"Geri bildirim ekranı" → "Cevap sonrası doğru/yanlış kartını göster.
Kapalıyken hemen sıradaki soruya geçilir.") — yani "i" MODELİ yok ama
İÇERİĞİN BÜYÜK KISMI zaten satır-içi mikro-açıklamayla kendi kendini
anlatıyor. Açıklaması OLMAYAN satırlar: Dil, Sürüm, Hakkında, Satın
alımları geri yükle, Gizlilik/Kullanım şartları, Reklam tercihleri, Sık
sorulan sorular/Bize ulaşın (bunlar zaten kendi adından anlaşılır
nitelikte, "i" gerektirmeyen türden).

## B) EKSİK OLANLAR (öncelik sırasıyla)

1. **🔴 İlerleme sekmesi TAMAMEN "i"siz** — Rozetler (9 rozet, hangisi ne
   gerektiriyor bilinmiyor), Zayıf Bölge Raporu (6 bölge nasıl
   hesaplanıyor, "zayıf" ne demek), Günlük Görevler (3 görev neye göre
   seçiliyor, ödül nasıl işliyor — `toast("📅 Günlük görev tamamlandı",
   ...)`, app.js:3880), İsabet Grafiği (son 30 gün neyin grafiği) — HİÇBİRİ
   anlatılmıyor. En büyük boşluk, çünkü bu ekran Free kullanıcının bile
   her gün gördüğü bir sekme.
2. **🔴 Mixini Yükle kartında "i" yok** — Araçlar'ın 4 kartından 3'ü var,
   bu biri yok — kullanıcı dosya yükleme akışının NEREDE kullanılacağını
   (Tonal Balance/Ölçüm Sonuçları/Referans Filtreleri'nin HEPSİ bu
   yüklenen dosyayı mı kullanıyor, yoksa ayrı ayrı mı?) bu karttan
   öğrenemiyor — bilgi TOOLS_TONAL_GUIDE'ın "Ham mix" bölümünde DOLAYLI
   olarak var ("İşlenmemiş... 'Mixini Yükle' kartındaki oynatıcıyı
   kullan") ama Mixini Yükle'nin KENDİ kartında yok.
3. **🟡 Rozetler hiçbir yerde anlatılmıyor** (madde 1'le aynı, ayrıca
   vurgulanıyor çünkü kazanma koşulları — `progress.ACHIEVEMENTS`,
   9→6 rozet revizyonu — kullanıcıya TAMAMEN kapalı, sadece "0/9" sayacı
   görünüyor).
4. **🟡 Seviye/XP sistemi YARIM anlatılıyor** — GENERAL_GUIDE'ın "Seviye
   ve zorluk" bölümü (18 kelime, çok kısa) MEKANİZMAYI anlatıyor ("doğru
   bildikçe seviyen yükselir") ama XP KAZANMA KURALINI (doğru cevap başına
   kaç XP, zorluk/seri bonusu var mı) anlatmıyor. `lvlSheet`
   (`#levelChip`) CANLI SAYI gösteriyor (mevcut hassasiyet, sıradaki
   seviyeye kalan XP) ama PROSE açıklama YOK — ikisi birbirini
   TAMAMLAMIYOR, aralarında bir boşluk var.
5. **🟡 "Parkur" terimi kullanıcıya HİÇ tanıtılmıyor** — kod içinde
   (`app.js`) ve BİR kullanıcı mesajında ("Yeni bir 10 soruluk parkur
   başlıyor", seviye atlama anonsu, app.js:3076) geçiyor, ama "i"
   metinlerinin hiçbirinde "parkur" kelimesi/10-soru yapısı açıklanmıyor
   — GENERAL_GUIDE mekanizmayı (6 doğru → sınav → bölüm atlama) anlatıyor
   ama "parkur" adını hiç kullanmıyor, kullanıcı iki farklı kelimenin
   (kod içi "parkur" vs "i"deki "bölüm") AYNI şeyi anlattığını
   bilmiyor.
6. **🟢 Sınav sistemi KISMEN anlatılıyor** — GENERAL_GUIDE'ın "Sınav ve
   bölüm geçme" bölümü (37 kelime) temel kuralı veriyor (6 doğru → sınav
   hakkı, sınav geçilirse bölüm atlanır, geçilmezse telafi turu) — makul
   bir özet, ama sınav EKRANININ KENDİSİNDE (`showExamScreen`,
   announce/passed/failed/makeup) EK bir "i"/açıklama yok, sadece o anki
   duruma özel dinamik metin var.
7. **🟢 Can sistemi ve dolumu anlatılıyor** — GENERAL_GUIDE'ın "Can"
   bölümü (14 kelime, kısa ama YETERLİ: "5 canın var. Biterse 30 dakikada
   bir dolar, ya da video izleyip hemen doldurabilirsin.") — `hideForPro`
   ile Pro'da doğru şekilde GİZLENİYOR (Pro'da can hiç işlemiyor, madde
   C'de de doğrulandı).
8. **🟢 Kendi Referansım anlatılıyor** — TOOLS_TONAL_GUIDE'ın kendi
   bölümü var (28 kelime, "Kendi Referansım").
9. **⚪ "Zorluk seviyeleri (Z1-Z7)" — ÖLÇÜLDÜ, böyle bir KULLANICI
   KAVRAMI YOK.** `git log`'da Z1-Z7 GERÇEKTEN var ama bunlar bu projenin
   ESKİ, dahili geliştirme-fazı isimleri (`Z1: zorluk parametre sistemi`,
   `Z2: seans içi zorluk rampası`, ... `Z7: otomatik zorluk sorgusu` —
   git log ile doğrulandı, hepsi zorluk SİSTEMİNİN kod-yazım fazları,
   kullanıcıya gösterilen bir etiket DEĞİL). Kullanıcının GÖRDÜĞÜ gerçek
   zorluk sistemi 5 isimli kademe (Kolay/Orta/Zor/Pro/Pro Plus,
   Ayarlar→Zorluk chip'leri) + Otomatik/Sabit seçimi — BU sistem
   GENERAL_GUIDE'ın "Seviye ve zorluk" bölümünde (madde 4) KISMEN
   anlatılıyor. "Z1-Z7" kullanıcıya hiç gösterilmediği için "eksik"
   SAYILAMAZ — var olmayan bir özelliğin açıklaması aranmaz, sayı
   uydurulmadı.

## C) İÇERİK KALİTESİ

**Genel üslup — TUTARLI.** 16 içerik gövdesinin TAMAMI ikinci tekil
şahıs ("bulursun", "dinle", "yükle") ve sıcak/konuşma dili kullanıyor,
teknik jargonun yanına HER SEFERİNDE bir "ne işe yarar/mix'te ne anlama
gelir" cümlesi ekliyor (ör. "Dar Q tek noktaya, geniş Q bölgeye dokunur.
Cerrahi müdahale mi genel renk mi") — bu, GENERAL_GUIDE'ın kendi
vaadiyle ("sadece doğru/yanlış değil, NEDEN öyle olduğu açıklanır")
UYUMLU.

**Terim kuralı (TERIM-KURALI.md) — BÜYÜK ÖLÇÜDE UYUMLU, bir gri alan
var:**
- LUFS/True Peak/LRA/Q/reverb/saturation/distortion/pan/A-B test gibi
  listede AÇIKÇA "İngilizce kalır" denen terimler guide-texts.js'te HEP
  İngilizce bırakılmış — grep ile "eşik"/"atak"/"bırakma"/"kapı" gibi
  Türkçeleştirilmiş karşılıkları arandı, BULUNAMADI.
- "hava"/"air" nüansı (TERIM-KURALI.md'nin kendi örneği: "uygulamada bant
  adı olarak 'tiz/hava' kullanılmış, bu yanlış") — BU İDDİA ÖLÇÜLDÜ ve
  ARTIK GEÇERSİZ: `frekans-bulma.js:206`'daki gerçek bant etiketi "TİZ
  (8–20 kHz)", "hava" SADECE açıklama cümlesinde nitelik olarak geçiyor
  ("Parlaklık ve hava... Vokale hava burada eklenir") — TERIM-KURALI.md'nin
  KENDİ önerdiği doğru kullanım BUDUR. Kural belgesinin örneği ya ESKİ bir
  koda ait ya da yanlış hatırlanmış — şu anki kod ZATEN doğru.
- **Gri alan — "Kompresör"/"kompresyon":** TERIM-KURALI.md'nin listesinde
  YALIN "compression"/"compressor" yok (sadece bileşik hâlleri:
  "multiband compressor", "parallel compression", "glue compression").
  Ama CLAUDE.md'nin KENDİ DİL PRENSİBİ listesi "compressor"u global terim
  sayıyor. Uygulamada mod adı baştan beri Türkçe yazımla "Kompresör"
  (mode-catalog.js:34), guide-texts.js de "kompresyon"/"kompresyonlu"
  kullanıyor. Bu YENİ bir hata değil — kuralın kendisi net değil (liste bu
  YALIN kelimeyi kapsamıyor), ve "kompresör" Türkçe ses mühendisliğinde
  ÇOK yerleşmiş bir ödünç kelime (TERIM-KURALI.md'nin kendi ölçütü:
  "Türkiye'deki stüdyoda bu kelime İngilizce mi söyleniyor?" — ikisi de
  yaygın). Bu net bir "sapma" değil, KARAR gerektiren bir gri alan —
  ürün kararı burada verilmedi, sadece tespit edildi.
- "oran" kelimesi TEK yerde geçiyor (TOOLS_TONAL_GUIDE, "bas/orta/tiz
  oranını") — bu kompresörün "ratio" parametresi DEĞİL, genel "bas/orta/
  tiz oranı" (frekans bantlarının göreli payı) anlamında günlük Türkçe
  kullanım — YANLIŞ POZİTİF, gerçek bir ihlal değil.

**Çok uzun/çok kısa:**
- **En uzun:** TOOLS_TONAL_GUIDE'ın "Pop / EDM / Akustik" bölümü (80
  kelime) — diğer TÜM bölümlerden (14-53 kelime aralığı) belirgin şekilde
  daha uzun, iki AYRI konuyu (eğrilerin ne olduğu + ölçüm yöntemi/bant
  tanımları) TEK paragrafta birleştiriyor. İçerik YANLIŞ değil (G226'da
  bilinçli olarak genişletildiği belgeli), ama okunabilirlik açısından iki
  bölüme ayrılabilir.
- **En kısa:** "Can" (14 kelime) ve "B · Referans" (14 kelime) — ikisi de
  TEK, tam cümle, eksik değil, sadece doğal olarak kısa konular.
- Geri kalan 14 gövdenin TAMAMI 18-53 kelime bandında, makul bir tutarlılık
  gösteriyor.

**Tutarsız üslup:** Bulunamadı — TÜM MODE_OPTIONS_TEXTS aynı kapanış
cümlesini ("Durdur'a basıp sonra cevap verirsen geri bildirim ekranda
kalır, sen geçene kadar kapanmaz.") kelimesi kelimesine tekrarlıyor (G190,
kasıtlı tutarlılık — kod yorumunda belgeli), MODE_GUIDE_TEXTS'in HEPSİ
AYNI "ne + neden mix'te önemli" iki-cümle kalıbını izliyor.

## D) ERİŞİLEBİLİRLİK

**Görünürlük/tıklanabilirlik — SORUN YOK, KOD DOĞRULANDI.** Tüm 5 "i"
butonu görünür DOM elemanları (`display:none`/`hidden` YOK, `styles.css`
"KALICI, solmaz" notuyla uyumlu).

**Boyut (styles.css ölçüldü):**
| Buton | CSS sınıfı | Boyut |
|---|---|---|
| `#menuInfoBtn` | `.info-btn` | **44×44px** — Apple HIG'in önerdiği minimum dokunma alanına TAM uyuyor |
| `#gameInfoBtn` | `.ghead-right .mode-info-btn` (scoped override) | **30×30px** — 44'ün altında |
| `#toolsTonalInfoBtn`/`#toolsResultsInfoBtn`/`#toolsFilterInfoBtn` | `.mode-info-btn` (taban, scope YOK) | **22×22px** — mod KARTLARININ üstündeki minik rozetle AYNI sınıf/boyut, 44'ün ÇOK altında |

⚠️ **Bulgu:** Araçlar sekmesinin 3 "i" butonu, mod IZGARASINDAKİ küçük
rozet ikonuyla (`.mode-info-btn` taban kuralı, mod kartı üstünde minik bir
etiket için tasarlanmış — index.html'in kendi yorumu: "mod kartı üstündeki
minik 'i' rozeti") AYNI 22×22px sınıfı kullanıyor — bu buton BAĞIMSIZ,
tam bir kartın TEK etkileşim noktası (dokunma hedefi önemli) olduğu hâlde,
görsel olarak dekoratif bir "rozet" boyutunda. `box-sizing:border-box`
(global reset, styles.css:135) doğrulandı — padding tap-alanını
BÜYÜTMÜYOR, 22×22px GERÇEK tıklanabilir alan. Apple HIG önerisi (44×44pt)
ile karşılaştırıldığında en küçük üçü bunun YARISINDAN AZ.

**Akordiyon içi stopPropagation — SORUN YOK, doğru uygulanmış:**
`#toolsResultsInfoBtn`/`#toolsFilterInfoBtn` GERÇEKTEN akordiyon
başlıklarının (`toolsResultsHeader`/`toolsFilterHeader`, kendi
`click`→toggle listener'ları var) İÇİNDE — ikisi de `e.stopPropagation()`
kullanıyor (`app.js:7529`/`7534`), kod yorumları G245'in AYNI tuzağına
("Ölçüm Sonuçları'nda AYNI sorun yaşanmıştı") AÇIKÇA atıf yapıyor.
`#toolsTonalInfoBtn` stopPropagation KULLANMIYOR ama BUNA GEREK YOK —
Tonal Balance kartının `grep` ile doğrulandı: kendi `toolsTonalHeader`
click-toggle'ı/akordiyon YAPISI YOK (her zaman açık bir kart) — bu bir
eksiklik DEĞİL, doğru bir atlama.

## ÖZET

**Var olanlar:** 5 DOM butonu / 16 içerik gövdesi, 12/12 mod, 3/4 Araçlar
kartı, Ayarlar'da "i" yok ama satır-içi mikro-açıklama var, İlerleme'de
HİÇ yok.

**Eksikler, öncelik sırasıyla:** (1) İlerleme sekmesi tamamen "i"siz —
Rozetler/Zayıf Bölge/Günlük Görevler/İsabet Grafiği, (2) Mixini Yükle
kartında "i" yok, (3) Rozetler hiçbir yerde anlatılmıyor, (4) XP kazanma
kuralı prose olarak yok (sadece canlı sayı), (5) "Parkur" terimi hiç
tanıtılmıyor, (6)-(8) sınav/can/Kendi Referansım kısmen-tam anlatılıyor,
(9) "Z1-Z7" bir kullanıcı kavramı değil — eksik sayılmadı.

**İçerik sorunu olanlar:** guide-texts.js:200'ün bayat "10 mod" yorumu,
TOOLS_TONAL_GUIDE'ın "Pop/EDM/Akustik" bölümü diğerlerinden belirgin uzun
(80 kelime), "Kompresör/kompresyon" teriminde TERIM-KURALI.md'nin kapsamadığı
bir gri alan (ürün kararı gerektirir, burada VERİLMEDİ), görev metninin
"Referans Filtreleri G285'te eklendi" iddiası YANLIŞ (gerçek: G262).

**Erişilebilirlik:** stopPropagation sorunu YOK (doğru uygulanmış).
Boyut: `#menuInfoBtn` 44×44 (uyumlu), `#gameInfoBtn` 30×30, Araçlar'ın 3
butonu 22×22 (mod-kartı-rozeti boyutunda, HIG'in altında) — bu üçü tek
başına bir kartın ana bilgi erişim noktası olmasına rağmen en küçük boyutu
taşıyor.

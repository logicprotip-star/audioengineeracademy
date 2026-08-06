# TASARIM ENVANTERİ

> `Dizayn /prototype.html` (tıklanabilir prototip) ile mevcut uygulama (`www/`) arasındaki
> tam karşılaştırma. Sadece okuma/karşılaştırma — kod değiştirilmedi.
> Üretim tarihi: bu envanter tek seferlik bir denetimdir, kod değiştikçe elle güncellenmelidir.

## GÜNCELLEME NOTU (06.08.2026)

İlk envanter 02-03.08.2026'da (ZORLUK MİMARİSİ/Z-serisi sonrası) üretildi — o tarihte
Motor 2'nin (Kompresör/Reverb) HİÇBİR modu kodda yoktu, sadece dB Seviyesi/Boost-Cut/
Q Genişliği'nin ilk sürümleri vardı. Bu güncelleme G22-G35 arası eklenenleri yansıtıyor:
6 yeni mod (Kesim Noktası zaten vardı; dB Seviyesi, Boost mu Cut mu, Q Genişliği, **Kompresör**,
**Reverb** eklendi), merkezi zorluk eğrisi (`core/difficulty-curve.js`), merkezi geri bildirim/X
kapatma (`#feedbackClose`, G27), Geliştirici: tam erişim anahtarı (G23). Aşağıda SADECE
değişen/stale çıkan satırlar güncellendi (EKRAN 2'nin şıklı-cevap satırı, EKRAN 3'ün tamamı);
diğer ekranlar (Menü, Seans Sonu, Kalibrasyon, İlerleme, Araçlar, Ayarlar, Satın Alma) bu
turlarda dokunulmadığı için ORİJİNAL haliyle geçerliliğini koruyor. Sonda yeni bir
**RESKIN RAPORU** bölümü eklendi.

**G36 eki (aynı gün, 06.08.2026):** RESKIN RAPORU'nun önerdiği "1. adım" (merkezi görsel
katman) kısmen uygulandı — Ana Menü seviye rozeti, mod kartı "Sv N" çip'i, "Bugünün
Önerisi" iki-buton düzeni, `.mode-chip-pro` renk düzeltmesi. İlgili satırlar/ÖZET
sayıları güncellendi, ayrıca EKRAN 1/2'de STALE çıkan iki not (odak-aralığı hedefleme
zaten çalışıyormuş, ÖZET'te hâlâ "Yok" yazıyordu) düzeltildi. Detay: DURUM.md BİTTİ.

**G37 eki:** Kulaklık uyarısı sheet'i (`hpSheet`) prototipten taşındı, mod başına
`kulaklikGerekli` bayrağı gerçek bir akışa bağlandı (EKRAN 1 satırları güncellendi, ÖZET
sayıları yeniden hesaplandı). **G38 eki:** dB Seviyesi'nin görseli prototipteki dikey
bar'lara çevrildi (RESKIN RAPORU madde 4c + "JS/DOM" listesi güncellendi) — bu ÖZET-sayılan
ana tabloda ayrı bir satırı olmayan, sadece RESKIN RAPORU'nun prose bölümünde izlenen bir
öğe olduğu için ÖZET toplamları DEĞİŞMEDİ. **G39 eki:** İki düzeltme — kulaklık sheet'i
genel toggle'dan (`prefs.hpWarning`) BAĞIMSIZ hale getirildi (G37'de yanlışlıkla
birleşmişti), "bir daha gösterme" kalıcıdan oturumluğa çevrildi; dB Seviyesi'nde arka
FFT spektrumu kaldırıldı (`SHOW_SPECTRUM=false`, sadece dikey barlar kalıyor). EKRAN 1'in
sheet satırı güncellendi, ÖZET toplamları DEĞİŞMEDİ (durum kategorisi aynı kaldı, sadece
notu güncellendi). **G40 eki:** İlerleme sekmesi reskin edildi — SV rozeti Ana Menü'nün
G36'daki `.lvl-badge` tek-kart deseninin BİREBİR AYNISINA çevrildi, Antrenman/Soru/İsabet
tek satıra taşındı ("Seri" çıkarıldı). "Şu An Neredesin"/"en zayıf bölge"/"Son 30 gün"
DOKUNULMADI (zaten gerçek veriyle Tam'dı). EKRAN 7'nin iki satırı Kısmi'den Tam'a geçti,
ÖZET sayıları yeniden hesaplandı (Tam 82→84, Kısmi 25→23). **G41 eki:** Motor 2
(Kompresör/Reverb) cevap kartları reskin edildi — küçük `.ans` grid'i kalktı, büyük A/B/C
kartlar (`core/three-way-cards.js`, prototipin `.opt`/`.wave` yapısı) + o an çalan kartın
amber vurgusu geldi; ÇALIŞAN MEKANİK (otomatik döngü, anında seç, odd-one-out)
DOKUNULMADI. EKRAN 3'ün "Seçenek kartları" satırı Yok'tan Kısmi'ye geçti (durum metni
BİLİNÇLİ 2 değere indirildi), ÖZET sayıları yeniden hesaplandı (Yok 20→19, Kısmi
23→24). Detay: DURUM.md BİTTİ. **G42 eki:** Mod bazlı kaynak uyumluluğu eklendi —
Reverb'de kick/snare/hihat/tom (tek-vuruş), Kompresör'de pembe/beyaz gürültü
(transient'sız) kaynak sheet'inde artık GÖRÜNMÜYOR (`core/source-catalog.js
compatibleSourceIds`, bkz. DURUM.md BİTTİ). Bu, prototipte hiç karşılığı olmayan
saf bir davranış/oynanabilirlik düzeltmesi — EKRAN 2'nin "Kaynak seçici chip"/"Kaynak
sheet'i" satırlarının tasarım-karşılaştırma durumunu (zaten "Kısmi"/"Kısmi-Yok",
kataloğun kendisi tasarımdan farklı olduğu için) DEĞİŞTİRMİYOR, ÖZET sayıları aynı
kaldı — bu yüzden ayrı bir tablo satırı yok, sadece bu prose notu. **G44 eki:**
Motor 2'nin ÜÇÜNCÜ modu Tonal Denge (spektral tilt, A/B/C) eklendi —
`mode-catalog.js`'teki "tonal-denge" placeholder'ı (ÖNCEDEN Motor 1'de, "Hangi
bölge fazla?" farklı bir konsept olarak, HİÇ kod karşılığı yokken) Motor 2'ye
taşınıp REPURPOSE edildi (bkz. DURUM.md G44 — task'ın kendi ürün kararı).
`core/three-way-cards.js` DEĞİŞİKLİK YAPMADAN import edildi (G41'in öngördüğü
genelleşme üçüncü modda DOĞRULANDI) — EKRAN 3'ün tablosu bu yüzden değişmedi
(satır başlığı HARİÇ, bkz. yukarıdaki EKRAN 3 girişi), ÖZET sayıları aynı kaldı.
**G45 eki:** Tonal Denge G44'te kurulan A/B/C (three-way) mekaniğinden TAMAMEN
AYRIŞTIRILDI — artık canlı EQ kaydırıcılı bir mod (task'ın kararı, bkz. DURUM.md
G45 BİTTİ). `core/three-way-cards.js` importu KALDIRILDI, `app.js`'in
`THREE_WAY_MODE_IDS` listesinden çıkarıldı (Kompresör/Reverb DOKUNULMADI).
EKRAN 3'ün tablosu ARTIK SADECE Kompresör/Reverb'i kapsıyor (yukarıdaki EKRAN 3
girişindeki G45 notuna bkz.) — ÖZET sayıları DEĞİŞMEDİ (bu satırlar zaten
Kompresör/Reverb'in KENDİ mekaniğini anlatıyordu, Tonal Denge'nin çıkışı onları
etkilemedi).

## EKRAN 1 — ANA MENÜ

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Üst bar (başlık + ayarlar dişlisi) | ✓ | ✓ | Tam | — |
| Seviye kartı (SV rozeti, XP bar, "Sonraki seviyeye X XP") | ✓ | ✓ | **Tam (G36)** | `.lvl`/`.lvl-badge` eklendi — İlerleme'nin `progress.xpProgress(diffState().xp)` hesabıyla AYNI veri (bkz. BİTTİ), iki ekran her zaman senkron |
| "Bugünün Önerisi" kartı | ✓ | ✓ | **Tam (uyarlanmış, G36'da düzeltildi)** | Kart render oluyor VE "Seti başlat" butonu odak aralığını ZATEN o bölgeye kilitliyordu (`dailyTipStartBtn` handler'ı — bu satırın ÖNCEKİ notu STALE'di, kod okumasıyla YENİDEN doğrulandı, muhtemelen sonraki bir M1-4 turunda düzeltilmiş ama bu tablo güncellenmemişti). G36'da AYRICA prototipteki 2. buton ("Şimdi değil") eklendi. Tek kalan fark: soru SAYISI ("· 8 soru") gösterilmiyor — BİLİNÇLİ ürün kararı (gerçek kodda sınırlı bir "set" kavramı yok, sayı göstermek yanlış bir söz verirdi, kullanıcı onayladı) |
| Kartı kapatma (X) | ✓ | ✓ | Tam | G36'dan beri "Şimdi değil" ikinci butonu AYNI işlevi yapıyor (prototipte de ikisi aynı davranış) |
| "Egzersizler" başlığı + sayaç ("— / — açık") | ✓ | ✓ | Kısmi | Tasarımda "N / 14 açık" (seviye kilidi sayısı); kodda "14 egzersiz · 3 oyun tipi" — farklı bir sayaç mantığı, seviye ilerlemesi göstermiyor |
| Mod kartları (14 adet, ızgara) | ✓ | ✓ | Tam | — |
| Mod kartı: motor rengi/simgesi | ✓ | ✓ | Tam | — |
| Mod kartı: kilit ikonu (seviye) | ✓ | ✓ | Tam | — |
| Mod kartı: "Sv N" seviye çip'i | ✓ | ✓ | **Tam (G36)** | Prototipte kilit ikonuyla AYNI slotta (birbirini dışlıyorlardı); kodda `.mode-top-right`te Pro rozetinden AYRI bir çip olarak, SADECE oynanabilir kartlarda (`progress.modeLevel`, oyun-içi `#levelChip`'in AYNI kaynağı) — Pro+Sv aynı kartta yan yana durabiliyor |
| Mod kartı: "İLERİ" rozeti (adv) | ✓ | ✗ | **Yok** | `ADV_SVG` tasarımda var, kodda karşılığı bulunamadı |
| Mod kartı: kulaklık ikonu (needsHp) | ✓ | ✗ | **Yok** | HÂLÂ açık — kart üzerinde kulaklık ikonu yok, `kulaklikGerekli` (G37'den beri GERÇEKTEN okunuyor) hâlâ kartın KENDİSİNDE görsel bir karşılığa bağlı değil, SADECE tıklanınca açılan sheet'e bağlı (bkz. alt satır) |
| Mod kartına tıklayınca kulaklık uyarı sheet'i | ✓ | ✓ | **Tam (G39)** | `hpSheet` (🎧 ikon+başlık+açıklama+2 buton+"bir daha gösterme") + mod-özel bayrak (`getMeta().kulaklikGerekli`, SADECE Reverb'de true) — sheet ARTIK genel toggle'dan (`prefs.hpWarning`) BAĞIMSIZ (G39 düzeltmesi: G37'de ikisi yanlışlıkla birleşmişti); "bir daha gösterme" ARTIK oturumluk (bellek, `hpSkippedThisSession`), kalıcı DEĞİL (bkz. DURUM.md BİTTİ) |
| Sekme çubuğu (Antrenman/İlerleme/Araçlar) | ✓ | ✓ | Tam | — |

## EKRAN 2 — OYUN (Motor 1: "Frekans Bulma" ve türevleri)

> Not: Tasarımda Motor 1 İKİ ayrı ekran (`s-game1` şıklı, `s-game1t` dokunmalı) + bir sheet
> içi "Cevap biçimi" anahtarı olarak var. Kodda TEK ekran var ve SADECE dokunmalı (touch)
> girişi çalışıyor.

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Geri butonu | ✓ | ✓ | Tam | — |
| Oyun başlığı | ✓ | ✓ | Tam | — |
| "Soru N/10" sayacı | ✓ | ✓ | Tam (uyarlanmış) | `M1-7, ff8f862`: ana sayaç artık "Soru N/10" gösteriyor — ama SADECE 10 Soruluk Bölüm'de (`challenge.active`); Serbest (sonsuz) modda "Soru N" kalıyor, çünkü tasarımda "Serbest" kavramı hiç yok (oradaki 10 sabit varsayılan) |
| Seviye chip'i (tıklanınca `lvlSheet` açılır) | ✓ | ✓ | Tam (uyarlanmış) | `Z6`: `#levelChip` + `#lvlSheet` eklendi, içerik `core/difficulty-curve.js` (Z1) + `core/progress.js` (Z3) GERÇEK değerlerinden okunuyor. "Sıradaki seviye"nin XP ilerlemesi prototipteki "12/20 doğru" yerine "X/Y XP" gösteriyor — sistemimiz XP-bazlı, doğru-sayısı-bazlı değil (bilinçli uyarlama, bkz. DURUM.md ZORLUK MİMARİSİ — OTOMATİK VERİLEN KARARLAR) |
| Kalp göstergesi | ✓ | ✓ | Tam | — |
| Özel sayaç (Hız Modu için "12 doğru") | ✓ | ✗ | N/A | Hız Modu mod olarak kodda yok, dolayısıyla bulunamadı |
| Dots (oyun ayarları) butonu | ✓ | ✓ | Tam | — |
| Stats satırı: seri | ✓ | ✓ | Tam | — |
| Stats satırı: ipucu sayacı | ✓ | ✓ | Tam | — |
| Stats satırı: isabet % | ✓ | ✓ | Tam | — |
| Kaynak seçici chip | ✓ | ✓ | Kısmi | Var ama kaynak kataloğu tamamen farklı: tasarımda gerçek enstrüman/davul isimleri (Kick, Snare, Hi-hat, Tam davul, Bas Gitar, Gitar, Vokal, Pembe gürültü, Synth) gruplu; kodda sadece 5 sentetik dalga formu (pembe/beyaz gürültü, testere/kare/üçgen synth) + yükleme |
| Kaynak sheet'i (SENTETİK/DAVUL/ENSTRÜMAN/KENDİ DOSYAM grupları) | ✓ | ✗ | **Kısmi/Yok** | Kodda düz bir `<select>` var, gruplu liste sheet'i yok |
| Odak aralığı chip'i (Tüm spektrum/Bas/Orta/Tiz) | ✓ | ✓ | Tam | `M1-4, 5c608f4`: `focusChip`/`focusSheet` eklendi (`FOCUS_RANGES`), soru ve çeldiriciler seçili aralıkla sınırlanıyor, tercih kalıcı. Dar aralıkta Pro Plus'ın 4 bandı her zaman sığmayabiliyor — DURUM.md BEKLEYEN KARARLAR **H** |
| Karıştır (⇄) butonu | ✓ | ✓ | Tam | — |
| Soru satırı | ✓ | ✓ | Tam | — |
| Spektrum paneli (bars, eksen) | ✓ | ✓ | Tam | — |
| Gain değeri (+6 dB) | ✓ | ✓ | Tam | — |
| İpucu maskesi (mask L/R, karartma) | ✓ | ✓ | Tam | `renderHintMask`/`hint-mask-seg` — zorluk bazlı bant genişliği (hintBandOct) dahil |
| İpucu etiketi ("İPUCU · X–Y arası") | ✓ | ✓ | Tam | — |
| Alt panel (dB/Stereo/Pan/Tap görselleştirmeleri) | ✓ | ✗ | N/A | Bu modlar (dB Seviyesi, Stereo Genişlik, Pan Konumu) kodda yok, görselleştirme paneli de yok |
| Şıklı cevap butonları (`.ans` grid) | ✓ | ✓ | **Tam (06.08 güncellemesi)** | G26-G35 arası eklenen ALTI mod (Kesim Noktası/dB/Boost-Cut/Q/Kompresör/Reverb) HEPSİ `.ans` grid kullanıyor — PAYLAŞILAN tek bileşen (`renderAnswerChoices`/`markAnswerChoices`, mod-agnostik dispatch). SADECE Frekans Bulma (dokunmalı/spektrum-tıklama) ve Pro Plus (4-bant) bu deseni kullanmıyor — bu iki mod tasarımın kendisiyle de zaten uyumlu (ilk tabloda da ayrı ele alınmıştı) |
| Dokunmalı işaretleme (spektruma dokun) | ✓ | ✓ | Tam | Canvas üzerinde pointerdown/pointermove ile çalışıyor |
| Kalite etiketi (çok yakın/yakın/uzak, renkli bant) | ✓ | ✓ | Tam | `frekans-bulma.js:668-670` — 3 kademeli sistem birebir örtüşüyor |
| Zaman çubuğu + geri sayım | ✓ | ✓ | Tam | — |
| Geri bildirim kartı | ✓ | ✓ | Tam | `M1-6, 5a8e3b0`: "Senin cevabın / Doğru cevap / Temiz" (`cmprow`) eklendi ve prototipten farklı olarak GERÇEK ses çalıyor. Sadece tek-bant modu kapsandı, Pro Plus'ta yok (4 tahminden hangisi belirsiz) |
| "Tekrar Çal" butonu (sesi baştan çalar) | ✓ | ✗ | **Kısmi/Yok** | Kodda ayrı bir "Tekrar Çal" yok; en soldaki buton Başlat/Durdur/Devam rollerini üstleniyor — davranışı farklı (baştan çalma değil, duraklat/devam). DURUM.md BEKLEYEN KARARLAR **F**: sentetik kaynaklarda "baştan"ın bir anlamı yok, sadece upload'da anlamlı — kapsam kararı bekliyor |
| A/B Test kısa dokunma (toggle) | ✓ | ✓ | Tam | — |
| A/B Test uzun basma → otomatik döngü | ✓ | ✓ | Tam | `M1-5, 1a8dd7b`: `pointerdown`+520ms+`setInterval(2000ms)` prototiple birebir aynı zamanlamayla eklendi |
| İpucu butonu | ✓ | ✓ | Tam | — |
| Ana CTA ("Cevabı onayla"/"Sonraki soru") | ✓ | ✗ | **Kısmi** | Kodda bu tek bir birleşik buton değil — "Atla ▶" (skip/otomatik ilerleme) ayrı bir buton; cevap onaylama dokunmayla (pointerdown) anında oluyor, ayrı bir "onayla" adımı yok |
| Oyun ayarları sheet'i: Ses kaynağı | ✓ | ✓ | Tam | — |
| Oyun ayarları sheet'i: Zorluk | ✓ | ✓ | Tam (farklı sunum) | Tasarımda iç içe sublist; kodda genel `settingsSheet` listesi — işlev aynı |
| Oyun ayarları sheet'i: Cevap biçimi (Şıklı/Dokunmalı) | ✓ | ✗ | **Yok** | Kodda hiç yok — zaten şıklı mod olmadığı için anahtar da yok |
| Oyun ayarları sheet'i: Oyun Türü (Serbest/10 Soruluk Bölüm) | ✗ | ✓ | **Ters fark** | Tasarımda karşılığı yok — kod-only ekleme |
| Oyun ayarları sheet'i: Süre (Süreli/Süresiz) | ✗ | ✓ | **Ters fark** | Tasarımda karşılığı yok — kod-only ekleme |
| Oyun ayarları sheet'i: Ses dosyası yükleme | ✓ (kaynak sheet'i içinde) | ✓ | Tam | Konum farklı (kod: dots sheet içinde; tasarım: kaynak sheet'i içinde) ama işlev var |
| "Oyundan çık" butonu (dots sheet) | ✓ | ✓ | Tam | `M1-7, ff8f862`: Oyun Ayarları sheet'inin altına eklendi (`.btn.danger`), backBtn ile aynı güvenli çıkış deseni |
| Otomatik zorluk sorgusu ("Sabit'e geçmek ister misin?") | ✓ | ✓ | Tam | `Z7`: `#autoDiffAsk` eklendi, tetikleme koşulu prototipteki gibi DOKUNMA-tetiklemeli (performans-tetiklemeli değil) — Otomatik moddayken Zorluk satırına dokununca seçim listesi yerine bu soru çıkıyor |
| Boss round rozeti/mekaniği | ✗ | ✓ | **Ters fark** | Tasarımda hiç yok — kod-only özellik (bossChip, boss XP çarpanı, bossWins başarımı) |
| Combo/seri XP çarpanı | ✗ | ✓ | **Ters fark** | Tasarımda combo kavramı görsel olarak var (seri sayacı) ama XP çarpanına bağlı değil; kodda `stats.combo` XP hesaplamasını doğrudan etkiliyor |

## EKRAN 3 — MOTOR 2 "Hangisi Farklı" (Kompresör/Reverb OYNANABİLİR, Hangisi Farklı/Distortion HÂLÂ kilitli)

> **06.08 güncellemesi:** İlk envanterin yazıldığı tarihte Motor 2'nin TAMAMI kilitliydi.
> G30 (Kompresör) ve G35 (Reverb) ile Motor 2'nin İKİ modu artık gerçekten oynanabiliyor —
> ama prototipin `s-game2` ekranından (büyük seçenek kartları + waveform + "Sırayla Çal" +
> 2 adımlı seç→onayla akışı) YAPISAL OLARAK FARKLI bir çözümle: mevcut Motor 1 altyapısının
> (`.ans` grid, merkezi geri bildirim, A/B toggle) 3 şıklı bir varyantı olarak inşa edildi.
> **G44 eki (ARTIK GEÇERSİZ, bkz. G45):** Tonal Denge G44'te bu ekranın üçüncü modu
> (A/B/C, spektral tilt) olarak eklenmişti. **G45'te TAMAMEN çıkarıldı** — bkz. altta.
> "Hangisi Farklı" (motor2'nin genel/temel modu) ve Distortion hâlâ kodda yok.
>
> **G45 eki:** Tonal Denge bu ekrandan (three-way/A-B-C) TAMAMEN AYRIŞTI — artık
> `core/three-way-cards.js` KULLANMIYOR, canlı EQ kaydırıcılı (N slider + "Cevabı
> Onayla") YENİ bir mekaniğe dönüştü (task'ın kararı). Menüde HÂLÂ "Hangisi farklı"
> grubunun altında duruyor (mode-catalog.js motor:2 alanı DEĞİŞMEDİ — kart gruplaması
> sadece görsel/kategori, mekanik artık farklı) ama AŞAĞIDAKİ tablonun HİÇBİR satırı
> Tonal Denge'yi kapsamıyor (SADECE Kompresör/Reverb). Tonal Denge'nin kendi arayüzünün
> (kaydırıcılar, canlı ses, "Cevabı Onayla") `Dizayn/prototype.html`'de HİÇBİR karşılığı
> YOK — EKRAN 4 (Motor 3)'ün "hiçbir karşılığı bulunamadı" durumunun TERSİ (orada kod
> yok, burada YENİ bir kod var ama prototipte hiç KARŞILIĞI yok) — bu yüzden ayrı bir
> karşılaştırma tablosu YAZILMADI, sadece bu prose notu. Detay: DURUM.md G45 BİTTİ.

| Öğe | Tasarımda | Kodda | Durum | Not |
|---|---|---|---|---|
| Ekranın var olması (Kompresör/Reverb oynanabilir) | ✓ | ✓ | **Tam (farklı tasarımla)** | G30/G35 — aşağıdaki satırlar prototipin KENDİ bileşen setiyle birebir örtüşmediğini gösteriyor |
| Görev kartı (mor "GÖREV" kickeri + büyük başlık + alt açıklama, `.task` bileşeni) | ✓ | ✗ | **Yok** | Kodda tek satırlık genel soru başlığı (`questionTitle`, Motor 1'in TÜM modlarıyla PAYLAŞILAN aynı `#questionTitle`/`#questionMeta` alanı) var — Motor 2'ye özel, ayrı bir "görev kartı" bileşeni yok |
| "3 ses" rozeti (mor, stats satırında) | ✓ | ✗ | **Yok** | Kodda stats satırı Motor 1'le AYNI 4 chip (Seri/İpucu/İsabet/Seviye) — Motor 2'ye özel bir "kaç ses" göstergesi yok |
| Seçenek kartları (büyük, harf rozeti + isim + waveform çubukları + durum metni "Çalınıyor/Çalındı/Elendi") | ✓ | ✓ | **Kısmi (G41)** | G41: `.ans` küçük gridi kalktı, `core/three-way-cards.js` ile büyük ALT ALTA kartlar geldi (harf rozeti + "Birinci/İkinci/Üçüncü ses" + SABİT süsleme waveform'u + durum metni) — prototipin `.opt`/`.opt-key`/`.wave` yapısına yakınsadı. Kısmi kalan TEK fark: durum metni BİLİNÇLİ olarak 2 değere indirildi ("Henüz dinlenmedi"/"Çalınıyor") — "Çalındı"/"Elendi" (geçmiş takibi) bizim daha basit otomatik-döngü mekaniğimize UYARLANMADI, task'ın açık kararı |
| Karta dokununca HEM çal HEM seç (`playCard`, tek etkileşim) | ✓ | ✗ | **Farklı model** | Kodda dinleme (`#abToggle`'ın 3-yönlü döngüsü) ile CEVAP VERME (`.ans` tıklaması) TAMAMEN AYRI iki kontrol — kullanıcı önce dinler (otomatik döngü ya da elle A/B/C butonuna basarak), sonra AYRI bir yerden (alt gridten) harfe basıp cevaplar |
| "Sırayla Çal" butonu (elle tetiklenen sıralı oynatma) | ✓ | ✗ | **Farklı model** | Kodda G32 ile YENİ soruda döngü OTOMATİK başlıyor (kullanıcı hiç dokunmadan A→B→C ilerliyor) — prototipteki gibi elle basılan ayrı bir "Sırayla Çal" butonu yok, ama işlevsel olarak amaç (üçünü de dinletmek) farklı bir yoldan karşılanıyor |
| "Cevabı onayla" (2 adımlı: seç → ayrı onay butonu) | ✓ | ✗ | **Farklı model** | Kodda TEK adım — `.ans` tıklaması ANINDA cevabı gönderiyor (`submitThreeWayGuess`), ayrı bir onay adımı YOK. Bu, Motor 1'in TÜM modlarıyla AYNI (kasıtlı) davranış — Motor 2'ye özgü bir sapma değil, projenin genel "tıkla=cevapla" felsefesi |
| İpucu butonu | ✓ | ✓ | Tam | Merkezi ipucu sistemi (`İpucu Ver`, `getHintText`) üzerinden — diğer altı modla PAYLAŞILAN aynı mekanizma |
| Geri bildirim: karşılaştırma satırı (`cmprow`: "Senin cevabın"/"Doğru cevap"/"Temiz" — 3 ayrı buton) | ✓ | Kısmi | **Farklı biçim, daha zengin içerik** | Kodda AYNI üçlü buton satırı YOK, ama kavramsal karşılığı VAR ve daha zengin: cevap sonrası canvas üzerinde iki renkli bir görsel (kırmızı=senin, yeşil=doğru — G34 standart rengi) + Kompresör'de ratio/threshold/gain-reduction, Reverb'te tip/decay DAHİL zengin bir öğretici metin (`teachingText`). Prototipte bu tek cümlelik statik bir not ("B'de 3:1 oranında kompresyon vardı") |
| Seviye chip'i (`lvlchip`, sağ üstte, tıklanınca seviye bilgisi açılır) | ✓ | ✓ | Tam | `#levelChip`/`lvlSheet` — Z6'dan beri TÜM modlarla PAYLAŞILAN merkezi altyapı, Motor 2'de de aynen çalışıyor |
| Geri bildirim kartını kapatma (X) | ✗ (prototipte X yok, akış otomatik ilerliyor) | ✓ | **Ters fark (kod DAHA gelişkin)** | G27'nin merkezi `#feedbackClose`'u (X butonu + hizalı otomatik geçiş) prototipte hiç YOK — kod burada tasarımın ÖNÜNE geçmiş |

## EKRAN 4 — MOTOR 3 "Frekans Çakışması" (3 aşama)

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Ekranın tamamı (aşama seçimi, kaynak çifti, iki kaynaklı spektrum, dokunmalı/kart/şıklı 3 farklı aşama arayüzü) | ✓ | ✗ | **Yok** | Hiçbir karşılığı bulunamadı — menüde kilitli kart olarak duruyor, arkasında kod yok |

## EKRAN 5 — SEANS SONU

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Sonuç halkası (% + doğru sayısı) | ✓ | ✗ | **Yok** | Ekranın tamamı bulunamadı (DURUM.md'de de "AÇIK İŞLER #9" olarak zaten kayıtlı) |
| "Seviye atladın" kartı | ✓ | ✗ | **Yok** | — |
| Kazanılan XP kartı + bar | ✓ | ✗ | **Yok** | — |
| En uzun seri / mevcut seri / ipucu stat'ları | ✓ | ✗ | **Yok** | — |
| Bölge haritası (dot'lar) / Soru sırası (kutular) | ✓ | ✗ | **Yok** | — |
| "Canların bitti" varyasyonu | ✓ | ✗ | **Kısmi** | Bunun yerine kod bir "Oyun Bitti" KARTI (modal, ayrı ekran değil) gösteriyor — çok daha az bilgi içeriyor (sadece doğru/yanlış/XP/ipucu sayısı) |
| Öneri kartı (sonraki set için) | ✓ | ✗ | **Yok** | — |
| "10 soru daha" / "Tekrar oyna" / "Menüye dön" CTA'ları | ✓ | ✗ | **Kısmi** | Karşılığı "Tekrar Oyna" tek butonu (gameover kartında) — ayrı bir ekran/CTA seti yok |

## EKRAN 6 — KALİBRASYON

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| 3 adımlı ilerleme (adım sayacı + bar) | ✓ | ✓ | Kısmi | Kodda adım sayacı var ama bar yerine nokta göstergesi (`calStepDots`) — görsel farklı, işlev aynı |
| Adım başlığı/gövde metni | ✓ | ✓ | Tam | — |
| Referans tonu çal/durdur | ✓ | ✓ | Tam | — |
| Ton seviye göstergesi (meter/bar animasyonu) | ✓ | ✓ | Tam | — |
| Rehber metni | ✓ | ✓ | Tam | — |
| "Cihaz seviyesi" kartı (donanım ses seviyesi göstergesi, %62) | ✓ | ✗ | **Yok** | Karşılığı bulunamadı — tasarımda bu, donanım ses tuşlarının OKUNMASINI varsayıyor; kodda bunun yerine kullanıcının kendi sürüklediği bir "Referans dinleme seviyesi" slider'ı var (farklı mekanizma) |
| Kendi iç slider'ı (Referans dinleme seviyesi) | ✗ | ✓ | **Ters fark** | Tasarımda karşılığı yok — kod, donanım seviyesini okuyamadığı için kendi slider'ını icat etmiş (önceki turlarda donanım ses tuşu desteği de eklendi, ama bu ayrı bir mekanizma) |
| "Seviye doğru, devam et" CTA | ✓ | ✓ | Tam | — |
| "Sonra yaparım" butonu | ✓ | ✓ | Tam | — |

## EKRAN 7 — İLERLEME

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Üst bar + ayarlar dişlisi | ✓ | ✓ | Tam | — |
| Seviye kartı (SV rozeti, XP bar) | ✓ | ✓ | **Tam (G40)** | G40: eski 4'lü ızgara (Seviye/XP/Seri/Doğruluk) + ayrı XP-bar bloğu kaldırıldı, Ana Menü'nün `.lvl-badge` deseninin (G36) BİREBİR AYNISI ("SV N" + "Kalibre Kulak" + XP barı + "Sonraki seviyeye X XP") geldi — AYNI veri kaynağı (`updateUI()`'daki `xp` hesabı), iki rozet HER ZAMAN senkron |
| Antrenman/Soru/İsabet stat satırı | ✓ | ✓ | **Tam (G40)** | G40: üçü de TEK satıra taşındı (`.row` + 3× `.stat-big`, prototipin AYNI deseni); "Seri" (combo) çıkarıldı — prototipte de yok |
| "Şu An Neredesin" kartı | ✓ | ✓ | Tam | — |
| Frekans bölgesi (açılır/kapanır panel, bölge barları) | ✓ | ✓ | Tam | Kodda ek olarak "temizle" linki var (tasarımda yok — ters fark, küçük) |
| Son 30 gün grafiği | ✓ | ✓ | Tam | Kodda veri yoksa boş-durum mesajı da var (tasarımda hep sahte veriyle dolu) |
| Mod seviyeleri (açılır/kapanır panel) | ✓ | ✓ | Tam | — |
| Rozetler ızgarası | ✓ | ✓ | Kısmi | Özellik çalışıyor ama rozet İÇERİĞİ tamamen farklı: tasarımda 6 rozet (İlk 100 soru, 7 gün seri, Bas ustası, Üst-orta ustası, Pro hassasiyet, Tüm modlar); kodda 9 farklı rozet (İlk Kulak, Alev Zinciri, Şimşek Kulak, Dayanıklılık, EQ Beyni, Keskin Hedef, Yükseliş, Pro Kulak, Boss Avcısı) — isim/koşul birebir örtüşmüyor |
| Günlük görevler | ✗ | ✓ | **Ters fark** | Tasarımda hiç yok — kod-only özellik (3 günlük görev, ödül XP'si) |
| Canlı istatistikler (Toplam Tur/Doğru/Yanlış/Ort. Puan/En İyi Seri/En Yüksek Skor) | ✗ | ✓ | **Ters fark** | Tasarımda karşılığı yok — kod-only ek panel |
| Son turlar (geçmiş listesi) | ✗ | ✓ | **Ters fark** | Tasarımda karşılığı yok — kod-only |
| "İstatistikleri Sıfırla" butonu | ✗ | ✓ | **Ters fark** | Tasarımda karşılığı yok — kod-only |

## EKRAN 8 — ARAÇLAR

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Üst bar + Pro rozeti + ayarlar | ✓ | ✓ | Tam | — |
| Dosya yükleme kartı (dosya adı/süre/format) | ✓ | ✓ | Kısmi | Kod: "Dosya değiştir" YOK, tek "Dosya yükle" butonu; "Çal" butonu da YOK |
| Analiz kartı (spektrum sapma grafiği) | ✓ | ✓ | Tam | Statik içerik olarak birebir (Pro kilit arkasında, ikisi de sahte/demo veri) |
| Analiz metrikleri (LUFS/LRA/true peak/mono uyum) | ✓ | ✓ | Tam | — |
| Analiz uyarı listesi (li satırları) | ✓ | ✓ | Tam | — |
| "Otomatik düzelt" butonu | ✓ | ✓ | Tam | — |
| "Öncesi/Sonrası" butonu | ✓ | ✗ | **Yok** | Karşılığı bulunamadı |
| "İndir" butonu | ✓ | ✗ | **Yok** | Karşılığı bulunamadı |
| Pro kilit overlay (Analiz) | ✓ | ✓ | Tam | — |
| Referans filtreleri chip listesi | ✓ | ✓ | Tam | — |
| Filtre detay kartı (ad/açıklama/ne dinlemeli) | ✓ | ✓ | Tam | — |
| "Düz'e dön" butonu | ✓ | ✓ | Tam | — |
| "Çal" butonu (filtre) | ✓ | ✗ | **Yok** | Karşılığı bulunamadı |
| Pro kilit overlay (Referans filtreleri) | ✓ | ✓ | Tam | — |

## EKRAN 9 — AYARLAR (genel sheet)

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Dil segmenti (TR/EN) | ✓ | ✓ | Kısmi | Görsel var, gerçek i18n (İngilizce çeviri) çalışmıyor — sadece görsel toggle |
| Bildirimler anahtarı | ✓ | ✓ | Kısmi | Anahtar çalışıyor ama gerçek bir bildirim planlama altyapısı yok (sadece tercih saklanıyor) — kod içinde bu bilerek belirtilmiş |
| Kulaklık uyarısı anahtarı | ✓ | ✓ | Tam | — |
| Kalibrasyon satırı | ✓ | ✓ | Tam | — |
| Zorluk: Otomatik/Sabit + alt liste | ✓ | ✓ | Tam | — |
| Hesap: Sürüm satırı + Pro'ya geç | ✓ | ✓ | Tam | — |
| Satın alımları geri yükle | ✓ | ✓ | Kısmi | Buton var ama gerçek bir IAP/restore işlemi yok — "bulunamadı" toast'ı |
| Destek: Geri bildirim/SSS/Bize ulaşın | ✓ | ✓ | Tam | — |
| Hakkında: Gizlilik/Kullanım şartları/Sürüm no | ✓ | ✓ | Tam | — |
| Sheet'i aşağı kaydırarak kapatma (drag-to-dismiss) | ✓ | ✗ | **Yok** | `touchstart/touchmove/touchend` ile sürükleme mekanizması kodda bulunamadı — sadece X butonu/overlay tıklamasıyla kapanıyor |

## DİĞER SHEET'LER

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Kulaklık uyarısı sheet'i (mod özel, "bu modda bir daha gösterme") | ✓ | ✓ | **Tam (G37)** | bkz. EKRAN 1 tablosu + DURUM.md BİTTİ |
| Seviye bilgisi sheet'i (`lvlSheet`) | ✓ | ✓ | Tam (uyarlanmış) | `Z6` — bkz. EKRAN 2 satırı yukarıda |
| Motor 3 aşama sheet'i | ✓ | ✗ | N/A | Motor 3 kodda yok |
| Kaynak çifti sheet'i (Motor 3) | ✓ | ✗ | N/A | Motor 3 kodda yok |
| Odak aralığı sheet'i | ✓ | ✗ | **Yok** | Karşılığı bulunamadı |
| Ses kaynağı sheet'i (gruplu) | ✓ | ✗/Kısmi | **Kısmi** | Kodda düz `<select>` tabanlı `settingsSheet` var, gruplama/kategori yok |
| Sheet geri butonu (sheetback, alt liste navigasyonu) | ✓ | ✗ | **Yok** | Tasarımdaki `sheetBack()`/otomatik geri butonu ekleme mekanizması kodda bulunamadı — kod `mainSettingsBack` diye tek bir sabit geri butonu kullanıyor, dinamik sheet-stack yok |

## EKRAN 10 — SATIN ALMA

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Kapat (X) | ✓ | ✓ | Tam | — |
| Başlık/açıklama | ✓ | ✓ | Tam | — |
| Ücretsiz plan kartı: mod sayısı | ✓ | ✓ | Tam | — |
| Ücretsiz plan: "Seans başına 5 soru" | ✓ | ✓ | Tam | — |
| Ücretsiz plan: "5 can · 30 dakikada dolar" | ✓ | ✓ | Kısmi | Kodda sadece "5 can" — "30 dakikada dolar" ifadesi yok (kasıtlı ürün kararı, DURUM.md'de kayıtlı: can dolumu kodda yok) |
| Ücretsiz plan: "Araçlar sekmesi kapalı" | ✓ | ✓ | Tam | — |
| Pro plan kartı: fiyat, mod sayısı, 10 soru, can sınırsız, araçlar, detaylı rapor | ✓ | ✓ | Tam | — |
| "Satın al" butonu | ✓ | ✓ | Kısmi | Buton var, gerçek IAP yok — "Yakında" toast'ı |
| "Geri yükle" | ✓ | ✓ | Kısmi | Aynı, gerçek işlev yok |
| "Ücretsiz devam" | ✓ | ✓ | Tam | — |

## EKRAN 11 — YARDIM/METİN EKRANLARI (SSS, Geri Bildirim, İletişim, Yasal)

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| SSS listesi (açılır/kapanır) | ✓ | ✓ | Tam | İçerik farklı ama mekanizma birebir aynı |
| Geri bildirim metin alanı | ✓ | ✓ | Kısmi | Tasarımda `contenteditable` div; kodda gerçek `<textarea>` — işlevsel olarak eşdeğer/daha iyi |
| Geri bildirim gönder | ✓ | ✓ | Kısmi | Kod yerel onay+temizleme yapıyor (backend yok) — tasarımda da gerçek gönderim simüle edilmiyor, ikisi de placeholder |
| İletişim (e-posta kartı) | ✓ | ✓ | Tam | — |
| Yasal metin (Gizlilik/Kullanım şartları) | ✓ | ✓ | Tam | İkisi de "içerik yakında eklenecek" placeholder'ı |

## SEKME ÇUBUĞU

| Öğe | Tasarımda | Kodda | Durum | Eksik olan |
|---|---|---|---|---|
| Antrenman/İlerleme/Araçlar sekmeleri | ✓ | ✓ | Tam | — |

---

## ÖZET (06.08.2026 itibarıyla güncellendi — G41 dahil)

**Toplam öğe sayısı (bu tabloda listelenen ayrı satırlar): 141** (108 → 140 → 141, G36'da
mod kartı "Sv N" çip'i için +1 yeni satır; G37/G39/G40/G41'de yeni satır eklenmedi,
sadece Durum değişti; sayım `awk` ile Durum sütunu [5. alan] tek tek sınıflandırılarak
DOĞRULANDI, tahmin değil)

- **Tam olanlar: 84** (değişmedi — G41'in tek satırı Yok'tan Kısmi'ye geçti, Tam'a değil)
- **Kısmi olanlar: 24** ("Kısmi" ailesi — "Farklı model" [3, Motor 2] + "Farklı biçim,
  daha zengin içerik" [1] dahil; G41'de +1: Motor 2'nin "Seçenek kartları" satırı
  Yok'tan Kısmi'ye geçti — büyük kartlar+waveform+durum metni yapıldı, durum metni
  BİLİNÇLİ olarak 2 değere indirildiği için Tam değil, bkz. DURUM.md G41)
- **Hiç olmayanlar ("Yok"): 19** (-1 — Motor 2'nin "Seçenek kartları" satırı Kısmi'ye
  geçti; mod kartındaki kulaklık İKONU [needsHp göstergesi] hâlâ Yok, ayrı satır)
- **N/A: 4** (değişmedi)
- **Kodda olup tasarımda olmayanlar ("Ters fark"): 10** (değişmedi)

**Hiç olmayanlar — öne çıkanlar (en büyük etkili, G36 sonrası güncel):**
1. ~~Motor 2 ekranı (tüm ekran)~~ → **KISMEN AÇILDI**: Kompresör+Reverb artık oynanabilir,
   ama prototipin kart+waveform+2-adımlı-onay tasarımı DEĞİL — bkz. EKRAN 3. "Hangisi Farklı"
   (temel mod) ve Distortion hâlâ tam olarak Yok.
2. Motor 3 ekranı (Frekans Çakışması, 3 aşama) — tüm ekran, HÂLÂ Yok
3. Seans Sonu ekranının prototipteki ZENGİN hali (sonuç halkası, bölge haritası, öneri
   kartı) — HÂLÂ Yok (G2'de "tam ekran" olması sağlandı ama içerik sade kaldı)
4. Motor 2'nin görev kartı + büyük seçenek kartları (waveform+durum metni) — YENİ ortaya
   çıkan bir "Yok", çünkü bu bileşenler artık gerçekten VAR OLAN bir ekranda eksik (önceden
   ekranın kendisi yoktu, o yüzden "N/A"ya daha yakındı)
5. ~~Odak aralığı seçimi (Bas/Orta/Tiz) — Yok~~ → **STALE ÇIKTI, DÜZELTİLDİ:** bu madde
   YANLIŞTI — EKRAN 2'nin KENDİ tablosu ("Odak aralığı chip'i" satırı) bunu zaten M1-4'ten
   (`5c608f4`) beri **Tam** olarak kaydediyordu; G36 sırasında kod okumasıyla (daily-tip
   butonunun `mode.FOCUS_RANGES` kullandığı) YENİDEN doğrulandı. Bu ÖZET listesi
   güncellenmeden kalmış bir çelişkiydi, düzeltildi.
6. ~~Mod özel kulaklık uyarısı sheet'i (`hpSheet`) — Yok, `kulaklikGerekli` meta alanı
   hiçbir görsel karşılığa bağlı değil~~ → **G37'de YAPILDI**: `kulaklikGerekli:true` olan
   modlara (şu an sadece Reverb) girişte prototipteki sheet açılıyor, "Kulaklığım takılı,
   başla" / "Geri dön" + "Bu modda bir daha gösterme" (mod-özel kalıcı) çalışıyor; genel
   ayarlar anahtarı (`prefs.hpWarning`) üst kesici olarak duruyor. Mod kartı üzerindeki
   kulaklık İKONU (bkz. RESKIN RAPORU örnek d'nin ikinci yarısı) hâlâ eklenmedi, o kısım
   açık kaldı.
7. ~~Menüdeki seviye/XP kartı (`.lvl-badge`) — Yok~~ → **G36'da YAPILDI** (bkz. DURUM.md
   BİTTİ, RESKIN RAPORU örnek b)

**Kodda olup tasarımda olmayanlar (10):**
1. Boss round mekaniği
2. Combo XP çarpanı (tasarımda seri sayacı var ama XP'ye bağlı değil)
3. "Oyun Türü: Serbest/10 Soruluk Bölüm" ayarı
4. "Süre: Süreli/Süresiz" ayarı
5. Günlük Görevler paneli
6. Canlı istatistikler paneli (İlerleme)
7. Son turlar geçmişi
8. "İstatistikleri Sıfırla" butonu
9. Kalibrasyondaki özel "Referans dinleme seviyesi" iç slider'ı (tasarım donanım seviyesi okumasını varsayıyordu)
10. **(YENİ)** Merkezi geri bildirim X/Atla kapatma butonu (`#feedbackClose`, G27) — prototipte
    akış otomatik ilerliyor, elle kapatılabilen bir X hiç yok; bu, kodun tasarımın ÖNÜNE
    geçtiği nadir bir nokta

---

# RESKIN RAPORU (06.08.2026)

> Bu bölüm kod DEĞİŞTİRMEDEN üretildi — sadece analiz. Amaç: "prototipe görsel olarak
> yakınsamak" işi ne kadar büyük, hangi sırayla yapılmalı sorusuna somut bir cevap.

## 1. Hangi ekranlar prototipten görsel olarak SAPMIŞ?

| Ekran | Sapma türü | Büyüklük |
|---|---|---|
| Ana Menü | Düzen (seviye kartı yok, mod kartı rozetleri eksik) — renk/tipografi TUTARLI | Küçük-orta |
| Motor 1 oyun ekranı (Frekans Bulma + 6 şıklı mod) | Büyük ölçüde TUTARLI — kart/buton/chip stilleri prototiple aynı dilde. dB Seviyesi'nin bar-grafiği G38'de canvas'a taşındı (bkz. RESKIN RAPORU madde 4c); Stereo/Pan modları hâlâ kodda yok, bar-grafikleri de yok | Orta (görsel dil aynı, bileşen seti farklı) |
| **Motor 2 (Kompresör/Reverb)** | **En büyük sapma** — görev kartı yok, seçenek kartları (waveform+durum metni) yok, kart-tıkla=çal+seç modeli yok, 2 adımlı onay yok. Motor 1'in küçük `.ans` butonlarına indirgenmiş | Büyük |
| Seans Sonu | Prototipteki zengin ekran (sonuç halkası, bölge haritası, öneri kartı) yerine sade bir "Oyun Bitti" kartı | Büyük (içerik eksik, ama var olan kısım renk/tipografi olarak tutarlı) |
| Kalibrasyon | Adım sayacı bar yerine nokta; "Cihaz seviyesi" kartı yerine kendi slider'ı — küçük düzen farkları | Küçük |
| İlerleme | Seviye kartı `.lvl-badge` yerine düz stat-grid; rozet içeriği farklı; ekstra paneller (günlük görev, canlı istatistik) var | Orta |
| Araçlar | Birkaç buton eksik (Öncesi/Sonrası, İndir, Çal) — düzen aynı | Küçük |
| Ayarlar/Satın Alma/Yardım ekranları | Neredeyse birebir — TUTARLI | Yok/çok küçük |

**Genel gözlem:** Renk paleti, tipografi, kart/buton/chip TEMEL stilleri her ekranda
TUTARLI (bkz. madde 3) — sapmalar neredeyse hep **eksik bileşenler** (bir kart/panel hiç
yok) ya da **farklı bir bileşenle ikame** (Motor 2'nin küçük buton grid'i) şeklinde, renk/
font kayması ÇOK NADİR (tek somut örnek: `.mode-chip-pro` `#f2c94c` kullanıyor, `--am`
`#FFC246`'dan hafifçe farklı — muhtemelen kopyala-yapıştır kalıntısı).

## 2. Salt CSS/HTML (kolay) vs JS/DOM (zor)

**Salt CSS/HTML ile (fonksiyona dokunmadan) düzeltilebilecekler:**
- `.mode-chip-pro`'nun rengini `var(--am)`'a çekmek (1 satır)
- Ana Menü'ye `.lvl-badge` eklemek (veri zaten `progress.js`'ten okunuyor, sadece yeni bir
  DOM parçası + CSS)
- Mod kartına "İLERİ" rozeti / kulaklık ikonu eklemek (`kulaklikGerekli` alanı ZATEN
  `getMeta()`'da var, sadece render edilmiyor)
- Kalibrasyon adım göstergesini nokta→bar yapmak
- Sheet'lere aşağı-kaydırarak-kapatma (drag-to-dismiss) eklemek (CSS+birkaç touch event,
  mevcut sheet açma/kapama mantığına dokunmadan)
- Araçlar'daki eksik butonları (Öncesi/Sonrası, İndir, Çal) EKLEMEK (görsel iskelet kolay;
  ama "gerçek işlev" tarafı JS gerektirir — buton GÖRÜNÜMÜ kolay, DAVRANIŞI ayrı bir iş)

**JS/DOM değişikliği gerektirenler (orta-zor):**
- ~~dB Seviyesi'ne prototipteki "A·Referans / B·İşlenmiş" bar karşılaştırmasını eklemek~~
  → **G38'de YAPILDI** — tahmin edilenin AKSİNE yeni bir DOM bileşeni değil, mevcut
  paylaşılan-canvas mimarisiyle tutarlı kalmak için `db-seviyesi.js`'in KENDİ
  `drawOverlay`'i içinde canvas'a çizilen bir bar-görseli oldu (bkz. DURUM.md G38)
- Kulaklık uyarı sheet'i (`hpSheet`) — YENİ bir sheet (HTML+CSS kolay, prototipte hazır
  markup var) + tıklama akışına bir ARA ADIM eklemek (`renderModeGrid`'in kart click
  handler'ına, `kulaklikGerekli && !skip` kontrolü) — orta zorlukta, ama İZOLE bir değişiklik
  (mevcut oyun mantığına dokunmuyor)

**Gerçekten zor (mimari/etkileşim modeli değişikliği):**
- Motor 2'yi prototipteki kart+waveform+2-adımlı-onay modeline getirmek — bu SADECE CSS
  değil: `renderAnswerChoices`'ı (şu an ortak `.ans` grid) Motor 2'ye özel yeni bir
  bileşenle DEĞİŞTİRMEK, "tıkla=çal" ile "tıkla=cevapla"yı AYRIŞTIRMAK, yeni bir "onayla"
  state'i eklemek gerekir — `app.js`'in `submitThreeWayGuess`/`cycleThreeWayPreview`/
  `THREE_WAY_MODE_IDS` altyapısını YENİDEN kablolamak demek. Ses motoruna/zorluk eğrisine
  DOKUNMADAN yapılabilir ama en büyük JS işi bu.
- Seans Sonu'nun prototipteki zengin içeriği (bölge haritası, öneri kartı) — veri
  (`zoneStats`, `progress.js`) ZATEN var, ama yeni bir tam-ekran layout + bu veriyi o
  layout'a bağlayan yeni render kodu gerekir.

## 3. Ortak görsel bileşenler MERKEZİ mi, dağınık mı?

**Merkezi — ve bu iyi haber:** `styles.css`'in başında AÇIKÇA belirtiliyor: *"Tasarım
dili: Dizayn/prototype.html'den taşındı (renk, tipografi, kart/chip/buton/sheet
stilleri)."* `:root` bloğu prototipin `:root` bloğuyla **değer değer birebir aynı**
(`--am:#FFC246`, `--gr:#2BD9A8`, `--rd:#FF4D6D`, `--bl:#6C8CFF`, `--pu:#A855F7`, `--bg`,
`--card`, `--line`, `--tx*` — hepsi). `.ans`, `.card`, `.btn`, `.chip` gibi paylaşılan
sınıflar TEK yerde tanımlı ve TÜM modlar (Motor 1'in 7 modu dahil) bunları kullanıyor —
G26-G35'te eklenen ALTI yeni mod bile kendi buton/kart CSS'ini icat ETMEDİ, hepsi aynı
`.ans` grid'i miras aldı (G34'ün "senin cevabın kırmızı/doğru yeşil" renk düzeltmesi de
TEK bir `core/feedback-colors.js` dosyasından 5 moda birden yayıldı — bu pattern'in
ÇALIŞTIĞININ kanıtı).

**Merkezi olmayan tek katman:** canvas içindeki çizim renkleri (`GUESS_COLOR`/
`CORRECT_COLOR` gibi) CSS custom property'leri OKUYAMADIĞI için ("canvas CSS variable
okuyamaz") hex olarak AYRICA tanımlanmak ZORUNDA — ama bu bile artık TEK bir paylaşılan
modülden (`core/feedback-colors.js`) geliyor, kod tekrarı değil.

**Sonuç: EVET, merkezi katman güçlendirilirse TÜM modlar birden güzelleşir.** Örnek:
`.ans` butonuna (şu an düz/küçük) prototipteki `.opt` kartının bir kısmını (daha büyük
dokunma alanı, hafif gölge/derinlik, seçili durumda daha belirgin vurgu) uygulamak TEK bir
CSS kuralı değişikliği — Kesim Noktası'ndan Reverb'e kadar YEDİ modun HEPSİNİ aynı anda
etkiler, mod dosyalarına (`modes/*.js`) hiç dokunmadan.

## 4. Kullanıcının 5 örneği — şu an nerede duruyor?

> **G36 güncellemesi (06.08.2026):** (b) ve (e) bu turda YAPILDI (bkz. DURUM.md BİTTİ) —
> notları aşağıda "G36'da yapıldı" olarak işaretlendi, orijinal analiz metni (neyin
> eksik olduğunun kanıtı) tarihsel referans için KORUNDU. (c)/(d) hâlâ AÇIK, (a) G41'de
> YAPILDI.

**(a) Motor 2 kart görseli prototipteki gibi ama 3 şık — G41'de YAPILDI:**
`core/three-way-cards.js` (Kompresör/Reverb'in PAYLAŞTIĞı) prototipin `.opt`/`.opt-key`/
`.wave` yapısını 3 şıklı (`A/B/C`) hâliyle kodladı — harf rozeti + isim + waveform +
durum metni, alt alta büyük kartlar. EKLENEN bir görsel: o an çalan kartın amber
kenar+glow vurgusu (prototipte `.opt.playing`, mor — bizde marka rengiyle amber, kırmızı/
yeşil doğru/yanlış renkleriyle çakışmasın diye). Etkileşim modeli DEĞİŞMEDİ — "karta
dokununca hem çal hem seç" (satır 124, "Farklı model") hâlâ farklı: bizim kartlarımız
SADECE cevap veriyor (anında), dinleme AYRI (otomatik döngü/A-B-C butonu) — bu KASITLI,
task'ın "çalışan mekaniği koru" talimatının gereği.

**(b) Her modda seviye göstergesi — G36'da YAPILDI:**
Oyun ekranındaki küçük "Seviye N" chip'i (`#levelChip`) zaten TÜM 7 modda çalışıyordu
(Tam, Z6'dan beri). Eksik olan, prototipteki BÜYÜK `.lvl-badge` rozetiydi (gradyan arka
plan, "SV"+büyük rakam) — SADECE İlerleme'de vardı, Ana Menü'de hiç yoktu (zaten
prototipte de OYUN EKRANINDA `.lvl-badge` yok, sadece Menü+İlerleme'de var — yani "her
modda" beklentisi aslında "her modun kart-seviyesi + genel rozet" olarak karşılandı, bkz.
altta). G36: Ana Menü'ye `.lvl-badge` (İlerleme'yle AYNI `progress.xpProgress` verisi) +
her mod kartına ayrı bir "Sv N" çip'i (`progress.modeLevel`, mod-bazlı) eklendi — ikisi
BİRLİKTE prototipteki "seviye her yerde görünsün" niyetini karşılıyor.

**(c) dB "Seviye Karşılaştırması" barları — G38'de YAPILDI:**
Prototipteki `#vizDb` (iki dikey bar, "A·Referans"/"B·İşlenmiş", aynı gradyan renkler)
`drawDbBars` olarak canvas'a taşındı, eski `drawDbGauge` (yatay -5..+5 dB ölçek, nokta
işaretçi) tamamen kaldırıldı. BİR fark BİLEREK korundu: prototipte barlar SORU
SIRASINDA da gerçek farkı gösteriyor, ama kodda dB Seviyesi'nin `directionRevealed`
zorluk mekaniği (3. sorudan sonra yön BİLEREK gizlenir) buna izin vermiyor — kullanıcı
onayıyla (bkz. DURUM.md G38) bar SORU SIRASINDA nötr (A=B), SADECE cevap sonrası gerçek
değerleri + kırmızı/yeşil (senin cevabın/doğru) işaretini gösteriyor. Prototip birebir
DEĞİL ama niyeti (görsel dil + öğretici cevap-sonrası karşılaştırma) taşıyor.

**(d) Kulaklık uyarısı ekranı — G37'de YAPILDI:**
Prototipteki `#hpSheet` (ikon+başlık+açıklama+2 buton+"bir daha gösterme" checkbox)
BİREBİR taşındı, `kulaklikGerekli` artık GERÇEKTEN okunuyor (`renderModeGrid`'in click
handler'ında). Menüdeki genel/statik "🎧 En iyi sonuç için kulaklık kullan" metnini
kontrol eden AYNI toggle (`prefs.hpWarning`) artık BU sheet'i de kapsıyor — iki mekanizma
BİRLEŞTİ, ayrı bir tercih EKLENMEDİ. Kurulurken İKİ mod dosyasında (`frekans-bulma.js`
true→false, `reverb.js` false→true) gerçek bir tutarsızlık bulunup düzeltildi (bkz.
DURUM.md BİTTİ) — `kulaklikGerekli` ÖNCEDEN hiç okunmadığı için bu hatalar etkisizdi.
**Hâlâ AÇIK olan tek parça:** kartın ÜZERİNDE (menü ızgarasında) bir kulaklık İKONU yok —
sadece TIKLAYINCA açılan sheet var, prototipteki `HP_SVG` kart rozeti koda geçirilmedi
(küçük, bağımsız bir ek iş, bu turun kapsamı dışında bırakıldı).

**(e) Renkler prototipe yakınsasın — G36'da YAPILDI:**
Büyük ölçüde ZATEN yakınsanmıştı (bkz. madde 3) — `:root` token'ları birebir aynı. Tek
somut sapma `.mode-chip-pro`'nun `#f2c94c` kullanmasıydı — G36'da `var(--am)`'a çekildi
(canlı doğrulandı: TÜM Pro rozetleri artık aynı amber). Bunun ötesi "renk" değil, "eksik
bileşen" sorunu — renklerin kendisi zaten doğruydu.

## 5. Önerilen reskin SIRASI

**1. Önce merkezi görsel katman (düşük risk, yüksek yayılım):**
   - ~~`.mode-chip-pro` renk düzeltmesi (5 dk)~~ **G36'da YAPILDI**
   - `.ans` / `.card` / `.btn` gibi paylaşılan sınıfların prototipteki `.opt`/`.card`
     detaylarına (gölge, köşe yarıçapı, dokunma alanı) biraz daha yaklaştırılması —
     TEK yerden YEDİ modu birden etkiler (HÂLÂ AÇIK)
   - ~~`.lvl-badge` bileşeninin CSS+HTML'inin yazılıp Ana Menü'ye eklenmesi~~ **G36'da
     YAPILDI** (Ana Menü rozeti + mod kartlarındaki "Sv N" çip'leri, bkz. DURUM.md BİTTİ)
   - Bunlar fonksiyona SIFIR risk taşır — hiçbir mod dosyasına (`modes/*.js`) dokunmadan
     yapılabilir; G36 bunu canlı doğruladı (561 test + tam tur regresyon, sıfır fonksiyonel
     değişiklik).

**2. Sonra mod-özel/ekran-özel eksikler (izole, tek tek):**
   - ~~Kulaklık uyarı sheet'i (izole yeni bileşen, mevcut akışa TEK bir kontrol noktası
     eklenir)~~ **G37'de YAPILDI** (bkz. DURUM.md BİTTİ) — kart üzerindeki kulaklık İKONU
     hâlâ AÇIK (küçük, bağımsız)
   - ~~dB Seviyesi'nin bar-karşılaştırması (mevcut gauge'un YANINA/YERİNE, mod dosyasına
     dokunmadan sadece render katmanında)~~ **G38'de YAPILDI** (bkz. DURUM.md BİTTİ) —
     mod dosyasının sadece `drawOverlay`'i değişti, `createQuestion`/`evaluateAnswer`
     dokunulmadı
   - Kalibrasyon/İlerleme/Araçlar'daki küçük eksik butonlar/göstergeler — HÂLÂ AÇIK

**3. En son Motor 2'nin YENİDEN TASARIMI (en yüksek risk, en büyük iş):**
   - `.opt` kart bileşeni — G41'de GÖRSEL kısmı yapıldı (bkz. madde 4a). GERİYE KALAN,
     hâlâ AÇIK olan tek parça: "tıkla=çal" / "tıkla=cevapla" ayrışması + 2-adımlı onay
     adımı (prototipin `playCard`/"Cevabı onayla" modeli). Bu, G35'te kurulan
     `THREE_WAY_MODE_IDS`/`submitThreeWayGuess`'in "anında seç" davranışını DEĞİŞTİRMEK
     anlamına geliyor — G41'in görevi AÇIKÇA bunu YAPMAMAYI istedi (mekanik çakışırsa
     dur/sor talimatı), bu yüzden hâlâ EN SONA bırakılmalı: hem Kompresör hem Reverb'i
     AYNI ANDA etkiler, dikkatli regresyon testi + ayrı bir ürün kararı gerektirir.
   - Seans Sonu'nun zengin hali — veri hazır (`zoneStats`/`progress.js`), ama yeni bir
     tam-ekran layout'un baştan kurulması gerekiyor; bu da bağımsız/büyük bir iş.

Bu sıralamanın mantığı: 1. adım SIFIR fonksiyonel risk taşıyor ve en çok ekranı aynı anda
iyileştiriyor (maliyet/etki oranı en yüksek); 3. adım ise mevcut ÇALIŞAN oyun akışını
(G30-G35'te özenle kalibre edilmiş Motor 2 mekaniği) değiştirme riski taşıyor, bu yüzden
en sona, ayrı ve dikkatli bir tur olarak planlanmalı.

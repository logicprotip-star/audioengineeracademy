# DOĞRULAMA TURU — 15 Ağustos

_"Kapandı"/"şöyle" diye kayıtlı ama kanıtlanmamış maddelerin tek tek kod
doğrulaması. Kod yazılmadı, dosya değiştirilmedi, commit atılmadı._

---

# A) LOGIC'İN KAPANDI DEDİKLERİ

## A1 — ROZETLER

**DOĞRULANDI.**

- `progress.js:152-158` — `ACHIEVEMENTS` dizisinde **tam 6 kayıt.**
- İsimler BİREBİR eşleşiyor:
  - `first_blood` → **Dinleyici** (`titleEn: "Listener"`, satır 153)
  - `combo_5` → **Ses Kaşifi** (`"Sound Explorer"`, satır 154)
  - `round_25` → **Miksçi** (`"Mixer"`, satır 155)
  - `accuracy_70` → **Ses Mühendisi** (`"Engineer"`, satır 156)
  - `pro_clear` → **Mastering Mühendisi** (`"Mastering Engineer"`, satır 157)
  - `boss_win` → **Altın Kulak** (`"Golden Ear"`, satır 158)
- `renderAchievements()` (`app.js:3180-3181`) TEK kaynaktan besleniyor:
  `progress.ACHIEVEMENTS.map(...)`. `grep` ile `www/js/`'de ikinci bir rozet
  dizisi/`ACHIEVEMENT` tanımı ARANDI — YOK.

## A2 — DESTEK E-POSTA

**DOĞRULANDI.**

`www/` altında geçen TÜM e-posta adresleri (regex ile tam tarama):
- `www/index.html:1308` — `mailto:destek@audioengineeracademy.com`
  (href) + aynı satırda görünen metin `destek@audioengineeracademy.com`
  — grep'te İKİ kez görünmesi bu YÜZDEN, iki AYRI adres DEĞİL.

**Toplam: bir tek benzersiz adres, TEK yerde geçiyor.** Eski
`audioengineer.academy` (nokta ile ayrılmış, `.com` olmadan) domaini `www/`
altında SIFIR sonuç verdi.

**Kapsam notu:** `destek.html`/`gizlilik.html`/`kullanim-kosullari.html`
bu repoda YOK (DURUM-OZET.md'ye göre ayrı bir cPanel sunucusunda
barındırılıyor) — bu üç sayfa BU denetimin kapsamı DIŞINDA, kod
tabanından doğrulanamaz.

## A3 — STEREO GENİŞLİK HAZIR KAYNAK

**DOĞRULANDI.**

- Modun hazır (paketlenmiş) kaynağı **YOK** — `stereo-genislik.js:266`:
  `uyumluKaynaklar: compatibleSourceIds({ only: ["upload"] })`. `SOURCE_GROUPS`'taki
  (`core/source-catalog.js`) 14 paketli kaynaktan (5 sentetik + 5 davul +
  4 enstrüman) HİÇBİRİNE izin verilmiyor, SADECE `upload`.
- **Diğer 11 modun TAMAMINDA hazır kaynak VAR** — tam liste (`grep
  uyumluKaynaklar` her mod dosyasında):
  | Mod | Kısıt |
  |---|---|
  | boost-mu-cut-mu, db-seviyesi, distortion, frekans-bulma, kesim-noktasi, q-genisligi | `compatibleSourceIds()` — kısıtsız, 14 kaynağın hepsi + upload |
  | kompresor | `requireTransient:true` (gürültü hariç, davul/enstrüman + upload) |
  | pan-konumu | açık liste: pink/white/saw/square/triangle/groove/bass/bass_alt/guitar/vocal/upload |
  | reverb | açık liste: guitar/vocal/snare/groove/upload |
  | tonal-denge | açık liste: groove/upload |
  | frekans-cakismasi | `uyumluKaynaklar` BİLEREK boş (`[]`) — kendi AYRI çift-kaynak sistemi (`SOURCE_PAIRS`), varsayılan çift `kick-bas` PAKETLİ örnekler, `OWN_SOURCE_PAIR` ("own") ile kullanıcı da yükleyebiliyor |
  **Sonuç: 12 modun 11'i paketli kaynakla açılabiliyor, SADECE Stereo Genişlik açılamıyor.**
- **Dosya yüklenmeden moda girilince** (`syncUploadGate()`, `app.js:2231-2237`):
  `isUploadOnlyMode` (`uyumluKaynaklar.length===1`) true olduğu için gate
  paneli **"Bu mod kendi dosyanla oynanır"** / *"Gerçek bir mix üzerinde
  çalışır. Dosyalarım'dan bir şarkı seç ya da cihazından yeni bir dosya
  seç."* metnini gösterir — mod ÇÖKMÜYOR, oynatılamaz durumda kalıyor,
  kullanıcıya doğru açıklama veriliyor.
- **`pickPlaybackOffset()` yüklenen dosyayla sorunsuz** — `stereo-genislik.js:215`:
  `if (!buffer || !Number.isFinite(buffer.duration) || buffer.duration <= windowSec) return 0;`
  (kısa/geçersiz dosyada güvenli erken çıkış), RMS penceresi
  `Math.min(data.length, ...)` ile sınırlanıyor (taşma riski yok). Test
  kapsamı VAR (`test/stereo-genislik.test.mjs`, 1315 testin bir parçası,
  bu turda tekrar koşuldu, geçti).

---

# B) BELİRSİZ KALAN

## B1 — #24 BÖLÜM ÇUBUĞU IDLE GÖRÜNÜRLÜĞÜ

**DOĞRULANDI — artık BELİRSİZ değil, Playwright'ta canlı test edildi.**

`showChapter` koşulu `app.js:3730`da (task'ın verdiği `3520` satırı artık
GÜNCEL DEĞİL — dosya bu oturumdaki G212-G214 eklemeleriyle büyüdü, satır
numarası kaymış): `const showChapter = !boss && !examActive && isChallenge();`
— **`challenge.active`'e DEĞİL, `isChallenge()`'a bağlı** (G176'nın kararı).

**Playwright ile idle durumu test edilebilir mi? EVET, test edildi:**
Boost mu Cut mu moduna girildi, Play'e HİÇ basılmadan (`#startBtn`
metni hâlâ `"▶"`, yani round hiç başlamamış) DOM okundu:
```json
{
  "rowCollapsed": false,
  "maxHeight": "40px",
  "dotCount": 10,
  "dots": ["e","e","e","e","e","e","e","e","e","e"],
  "label": "BÖLÜM 1/10",
  "startBtnText": "▶"
}
```
Satır `ghead-collapsed` DEĞİL, `max-height:40px` (0 değil — GERÇEKTEN
görünür), 10 boş nokta + "BÖLÜM 1/10" etiketi Play'DEN ÖNCE görünüyor.
**Kod + Playwright açısından KAPANMIŞ.**

**Kalan tek nüans:** DEVIR-15-08-SABAH.md'nin 15 Ağustos cihaz turu
"Bölüm sayacı ✅" diyor ama bu, TAM-LISTE-14-08.md'nin resmi 5 maddelik
cihaz-test listesindeki "yeni parkurda BÖLÜM 2/10 oluyor mu" (G206'nın
reset davranışı) sorusuna cevap — idle-görünürlük (G176) o 5 maddenin
İÇİNDE AÇIKÇA yer almıyor. Yani: **kod+Playwright KAPANMIŞ, cihazda
AÇIKÇA ayrı bir madde olarak yeniden test edilmemiş** (genel cihaz turu
sorunsuz geçtiği için yüksek olasılıkla sorun yok, ama bu SPESİFİK
senaryo isimlendirilmiş bir test maddesi değildi) — **CİHAZDA ÖLÇÜLÜR**
(dar kapsamda, doğrulama isteniyorsa).

---

# C) BELGE İDDİALARI — kod ne diyor

## C1 — DURUM.md "C" maddesi vs A1

**YANLIŞ (DURUM.md'nin C maddesi).** A1'de doğrulandığı gibi kod
`progress.js:152-158`'de **6 rozet** tanımlıyor, **9 DEĞİL.** BEKLEYEN
KARARLAR "C" maddesi (`*"kod hâlâ TAM 9 rozet tanımlıyor"*`) G198'den
(14 Ağustos, `14ade68`, "Rozet seti 9→6, isimler/ikonlar yenilendi")
ÖNCEki bir durumu anlatıyor ve o commit'ten beri HİÇ güncellenmemiş.

## C2 — DURUM.md'de iki "N" maddesi

**DOĞRULANDI.** `grep -n '^\*\*N\.' DURUM.md`:
```
15861:**N. G106 — Ölçüm motorunun +39% süre artışı kabul edilebilir mi?**
15969:**N. G122 — mid/side genişlik tekniği GERÇEK bir mix'te kulakla
```
İki AYRI konu, aynı harf. Etiketleme hatası.

## C3 — Referans Filtreleri gerçek DSP — DURUM.md "M" vs DEVIR-14-08

**DEVIR-14-08-2026.md HAKLI, DURUM.md'nin "M" maddesi STALE.**

Kodda GERÇEK DSP var: `toolsFilterGrid` click handler'ı (`app.js:12016-12026`)
filtre değişince (çalıyorsa) `toolsConnectFilterPreviewChain()`'i YENİDEN
çağırıyor (satır 12023, "G117 — çalarken filtre değişince zincir CANLI
güncellenir"), bu da seçili filtrenin frekans aralığına göre GERÇEK
`ctx.createBiquadFilter()` highpass/lowpass düğümleri kuruyor (`app.js:11869-11870`,
`hp.frequency.value = lo`, `lp.frequency.value = hi`) — sadece bir rozet/
etiket değişimi DEĞİL, ses zincirine gerçekten bağlı.

**G117'de mi eklendi? EVET, doğrulandı:** `git log --oneline -S
"renderToolBars"` ARANMADI bu madde için, bunun yerine doğrudan commit
başlığı kontrol edildi — `581d250 G117: Araçlar — ortak DSP katmanı,
bölge solo, referans filtrelerinin gerçek işlemesi, yeni illüstrasyonlar`
— başlığın kendisi "gerçek işlemesi" diyor, kanıt net.

**Sonuç:** BEKLEYEN KARARLAR "M" maddesi (G101'den kalma, "ne zaman
eklenecek" sorusu) G117'den beri (14 Ağustos'tan ÖNCE bile, G117 daha
erken bir tarihli) CEVAPLANMIŞ durumda ama DURUM.md'den hiç
kaldırılmamış/güncellenmemiş.

## C4 — Uygulama simgesi

**YANLIŞ (eski TAM-LISTE.md / DURUM-OZET.md).** Kodda GERÇEK bir ikon
var: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
(1.5 MB, gerçek görsel — boş/placeholder DEĞİL), `Contents.json`
`"size": "1024x1024", "idiom": "universal"` — modern (tek-boyut) Xcode
formatında GEÇERLİ bir yapılandırma. Dosya tarihi 31 Temmuz — bu
oturumdan bile ÖNCE var olan bir asset. GORSEL-TEST.md'nin D7 maddesi
de ("Ana ekranda 'AE Academy' yazıyor mu" ✅ TAMAM) cihazda ikonun
GERÇEKTEN göründüğünü doğruluyor.

## C5 — Paywall "5/10 soru" metni

**KISMEN YANLIŞ — ücretsiz kısım DOĞRU, Pro kısmı YANLIŞ.**

`app.js:8200-8202`:
```js
els.accountVerLine.textContent = isUserPro()
  ? `Pro... — ${total} mod, seans başına 10 soru, can sınırsız`
  : `Ücretsiz — ${FREE_MODE_COUNT} mod, seans başına 5 soru`;
```
- **Ücretsiz "5 soru" DOĞRU** — `paywall.js:113`: `FREE_SESSION_QUESTION_LIMIT = 5`,
  gerçekten uygulanıyor (`isFreeSessionLimitReached`).
- **Pro "10 soru" YANLIŞ** — `paywall.js:122-124`: `isFreeSessionLimitReached(roundsPlayed,
  isPro, ...) { if (isPro) return false; ... }` — Pro'da bu kontrol HER
  ZAMAN `false` döner, yani **Pro'da oturum başına soru SINIRI YOK
  (sınırsız), "10" değil.** Metin kullanıcıya yanlış/eksik bir sayı
  söylüyor — DURUM.md'nin "I" maddesi (madde 4) bunu zaten flag'lemişti,
  bu turda hangi YARISININ (Pro) yanlış olduğu netleştirildi.

## C6 — Pro'da "done" ekranı

**DOĞRULANDI — hâlâ hiç tetiklenmiyor, kasıtlı/regresyon ayrımı
koddan ÇIKARILAMIYOR.**

`app.js:5301`: `if (challenge.active && !examGateActive() &&
challenge.done >= challenge.total) { finishChallenge(); return; }` —
`examGateActive() = mode.EXAM_ENABLED && isUserPro()`. 12 modun
12'sinde de `EXAM_ENABLED=true` (bu oturumun #55 doğrulamasında zaten
tarandı) — yani Pro kullanıcı için `examGateActive()` HER ZAMAN `true`,
`!examGateActive()` HER ZAMAN `false`, bu satır Pro'da HİÇ çalışmıyor.
`finishChallenge()` (Session Sonu "done" ekranını açan TEK fonksiyon)
bu yüzden Pro'da asla tetiklenmiyor. Bu davranış bu oturumdaki G214
değişikliğinden ETKİLENMEDİ (G214 SADECE `goToNextRound()`'a dokundu, bu
satıra dokunmadı — doğrulandı). **Kasıtlı mı regresyon mu — koddan
çıkarılamaz** (iki yorum satırı da eşit derecede makul, DURUM.md'nin
kendi "K" maddesi de aynı iki-seçenek sunumunu yapıyor) — BELİRSİZ, tek
doğru cevap bir ürün kararı.

---

# D) BELGEYE İŞLENMEMİŞ

## D1 — renderToolBars() ne zaman silindi

**DOĞRULANDI, kesin commit bulundu.**

`grep -n "function renderToolBars" www/js/app.js` → sıfır sonuç, fonksiyon
GERÇEKTEN yok. `git log --oneline --all -S "renderToolBars" --
www/js/app.js` dört commit gösterdi (yeniden eskiye: G101, G99, G88, ilk
kuruluş). `git show 6e41b9b` (G101) diff'i doğrudan kanıtlıyor — SİLİNEN
satırlar arasında: `- // eski sahte #toolBars (renderToolBars)...` ve
`- // DEĞİŞTİRİLDİ — eski renderToolBars()/#toolBars TAMAMEN SİLİNDİ`.
**Silinme noktası: G101 (`6e41b9b`, "Araçlar ekranı — Tasarim-2026-08/
Araçlar.dc.html'in tam giydirmesi").** (Önceki TAM-DENETIM-15-08.md
raporum burayı "muhtemelen G117+" diye TAHMİN etmişti — YANLIŞ tahmindi,
gerçek commit G101, bu turda kesinleştirildi.)

## D2 — "Pop/EDM tek eğri mi?" BEKLEYEN KARARLAR'da var mı

**DOĞRULANDI — YOK.** `grep -n "Pop.*EDM\|EDM.*Pop" DURUM.md` 9 sonuç
verdi, hepsi MEVCUT 3-kategorili (Pop/EDM/Akustik) özelliğin uygulama
referansları (guide-texts, index.html, TASLAK ifadesi vb.) — hiçbiri
"birleştirilsin mi"/"tek eğri" sorusuyla İLGİLİ değil. Bu soru SADECE
`DEVIR-15-08-SABAH.md`'de var, DURUM.md'ye HİÇ taşınmamış.

## D3 — Seviye başlıkları

**DOĞRULANDI, ve YENİ bir çakışma bulundu.** `progress.js:121-127`, TAM
7 seviye başlığı:

| min | title |
|---|---|
| 1 | Çırak Kulak |
| 3 | Kalibre Kulak |
| 6 | Keskin Kulak |
| 10 | Uzman Kulak |
| 15 | Usta Kulak |
| 22 | Prodüksiyon Ustası |
| 30 | **Altın Kulak** |

Rozet isimleriyle AYNI dilde (Türkçe, "kulak" temalı sıfat+isim kalıbı) —
ama **"Altın Kulak" (min:30 seviye başlığı) ile `boss_win` rozetinin adı
("Altın Kulak", `progress.js:158`) BİREBİR AYNI STRING.** Bu, iki farklı
sistemin (seviye başlığı vs rozet) BİLEREK mi yoksa fark edilmeden mi
aynı ismi paylaştığı belirsiz — kullanıcı Seviye 30'a ulaştığında
gördüğü "Altın Kulak" ile bir boss round kazanınca kazandığı "Altın
Kulak" rozeti AYNI görünüyor, kafa karıştırabilir. **Daha önce hiçbir
belgede bu çakışma not edilmemiş — bu turun yeni bulgusu.**

---

# ÖZET TABLO

| Madde | Sonuç |
|---|---|
| A1 Rozetler | DOĞRULANDI |
| A2 Destek e-posta | DOĞRULANDI |
| A3 Stereo Genişlik hazır kaynak | DOĞRULANDI |
| B1 #24 idle görünürlük | DOĞRULANDI (kod+Playwright) / dar kapsamda CİHAZDA ÖLÇÜLÜR |
| C1 Rozet sayısı (DURUM.md "C") | YANLIŞ — kod 6, belge 9 diyor |
| C2 Çift "N" etiketi | DOĞRULANDI |
| C3 Referans Filtreleri DSP | DOĞRULANDI — DEVIR-14-08 haklı, DURUM.md "M" stale |
| C4 Uygulama simgesi | YANLIŞ (eski belgeler) — ikon gerçekten var |
| C5 Paywall 5/10 soru | KISMEN YANLIŞ — "5" doğru, "10" yanlış (Pro sınırsız) |
| C6 Pro'da "done" ekranı | DOĞRULANDI (hiç tetiklenmiyor) — kasıtlı/regresyon BELİRSİZ |
| D1 renderToolBars() silinme noktası | DOĞRULANDI — G101 (6e41b9b) |
| D2 Pop/EDM kararı belgede yok | DOĞRULANDI |
| D3 Seviye başlıkları | DOĞRULANDI + YENİ bulgu: "Altın Kulak" adı rozetle çakışıyor |

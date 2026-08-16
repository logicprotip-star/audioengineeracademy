# OLCUM-FILTRELER-16-08 — Referans Filtreleri Yapısı Ölçümü

_Kapsam: SADECE ÖLÇÜM. Kod YAZILMADI, hiçbir dosya DEĞİŞTİRİLMEDİ,
commit atılmadı. `app.js`'in ilgili bölümleri (11983-12460 aralığı)
TAM okundu, `index.html`/`www/styles.css`/`guide-texts.js`/`test/`/`e2e/`
grep edildi. **TUR9-ARACLAR-15-08.md** (dün) bu konuyu ZATEN kapsamlı
ölçmüştü — bu turda TÜM ilgili TUR9 iddiaları BAĞIMSIZ OLARAK YENİDEN
grep/okuma ile doğrulandı (kod dünden bugüne bu alanda DEĞİŞMEDİ,
commit log'unda G251/OLCUM-* dışında bu bölgeye dokunan bir commit YOK)
— TUR9'a "güveniyorum" denmedi, HER iddia bu turda TEKRAR kontrol edildi._

---

## A) MEVCUT 5 FİLTRENİN TAM TANIMI

**Dosya:** `www/js/app.js:11992-12070`, `TOOLS_FILTERS` dizisi (iç ID
yok — dizi İNDEKSİYLE referanslanıyor, `toolsFilterActiveIdx: number`,
bkz. D). Kullanıcıya görünen isim `name` alanı.

| # | `name` (görünen) | `range` (kart etiketi) | `kind` (ikon anahtarı) |
|---|---|---|---|
| 0 | Telefon Hoparlörü | 400 Hz – 6 kHz | phone |
| 1 | Araba | 60 Hz – 14 kHz | car |
| 2 | Kulaklık | 20 Hz – 20 kHz | head |
| 3 | Club Sistemi | 25 Hz – 18 kHz | club |
| 4 | Laptop Hoparlörü | 250 Hz – 12 kHz | laptop |

**Tam `eq` (BiquadFilterNode) zincirleri — SIRAYLA, SERİ (her node bir
sonrakine `.connect()` ediliyor, `app.js:12220-12232`):**

```
Telefon Hoparlörü (app.js:11998-12003) — 4 node:
  1. highpass  freq=500   Q=0.9
  2. highpass  freq=500   Q=0.9   (AYNI filtre 2. KEZ — kademeli, ~24dB/oktav)
  3. peaking   freq=2000  Q=1.1   gain=+7dB
  4. lowpass   freq=8000  Q=0.8

Araba (app.js:12012-12016) — 3 node:
  1. lowshelf  freq=60    gain=+5dB   (Q verilmemiş → varsayılan Math.SQRT1_2)
  2. peaking   freq=350   Q=1.0   gain=-4.5dB
  3. highshelf freq=6000  gain=+4dB

Kulaklık (app.js:12031-12034) — 2 node:
  1. lowshelf  freq=100   gain=+2dB
  2. peaking   freq=9000  Q=1.3   gain=+3dB

Club Sistemi (app.js:12044-12048) — 3 node:
  1. lowshelf  freq=40    gain=+2dB
  2. peaking   freq=60    Q=1.1   gain=+5dB
  3. lowpass   freq=16000 Q=0.8

Laptop Hoparlörü (app.js:12061-12065) — 3 node:
  1. highpass  freq=200   Q=0.75
  2. peaking   freq=3500  Q=1.0   gain=+4.5dB
  3. lowpass   freq=12000 Q=0.8
```

**Filtre tipi envanteri (5 filtre, 15 node toplamı):** highpass ×3
(Telefon'da TEK filtrede kademeli ×2 + Laptop ×1), lowpass ×3 (Telefon,
Club, Laptop), peaking ×5 (her filtrede TAM 1 tane), lowshelf ×3
(Araba, Kulaklık, Club — birer tane), highshelf ×1 (Araba). **notch
tipi HİÇBİR filtrede YOK.** Q belirtilmeyen
YERLERDE (`spec.q === undefined`) varsayılan `Math.SQRT1_2` (≈0.707,
Butterworth-düz) kullanılıyor — `app.js:12228`.

**`stereo` (mid/side) katmanı — AYRI, EQ'DAN SONRA uygulanan ikinci bir
seri aşama** (`toolsBuildMidSideStage`, `app.js:12118-12163`), EQ
zincirinin çıkışına bağlanıyor (`app.js:12233-12236`):

| Filtre | `stereo` bant(lar)ı |
|---|---|
| Telefon Hoparlörü | `[{lo:20,hi:20000, mid:1, side:0}]` — TEK bant, TAM MONO çöküş |
| Araba | `[{lo:20,hi:20000, mid:0.85, side:1.35}]` — merkez zayıf, yan güçlü |
| Kulaklık | `[{lo:20,hi:20000, mid:1, side:1}]` — DEĞİŞMEZ (a=1,b=0, kimlik) |
| Club Sistemi | `[{lo:20,hi:120,mid:1,side:0}, {lo:120,hi:20000,mid:1,side:1}]` — 2 bant, SADECE sub bas mono |
| Laptop Hoparlörü | `[{lo:20,hi:20000, mid:1, side:0.3}]` — dar sahne, mono DEĞİL |

Matris: `a=(mid+side)/2, b=(mid−side)/2`, `L'=a·L+b·R, R'=b·L+a·R`
(`app.js:12154`). Kulaklık'ın `mid:1,side:1` durumu bir KISAYOLLA
(`app.js:12122-12126`) splitter/merger/matris HİÇ KURULMADAN doğrudan
geçiş yapıyor (performans optimizasyonu, işlevsel fark YOK).

**Zincir yapısı — TAMAMEN SERİ, paralel dal YOK:** kaynak →
`filterDef.eq` (N adet BiquadFilterNode, sırayla) → `toolsBuildMidSideStage`
(mid/side matris) → [varsa Tonal Balance bölge-solo bandpass'ı,
`toolsApplySoloBandFilter`] → `toolsFilterPreviewGain` (sabit 0.85,
`app.js:12450`) → `analyser`. Bu SIRA HER ZAMAN aynı (`app.js:12206-12213`
yorumunda AÇIKÇA belirtilmiş: "zincir HER ZAMAN aynı sırayla kurulur").

**Toplam kazanç telafisi — YOK, KASITLI:** Kod yorumu (`app.js:11988-11990`):
*"SEVİYE TELAFİSİ YOK (task'ın kendi kararı) — filtrelerin doğal
zayıflatması/yükseltmesi hiçbir yerde geri telafi edilmiyor, telefon
hoparlörü GERÇEKTEN kısık duyulacak."* `toolsFilterPreviewGain.gain.value
= 0.85` (`app.js:12450`) SABİT bir değer, HANGİ filtre seçili olursa
olsun DEĞİŞMİYOR — bu da ayrıca doğrular: filtreler arası bir çıkış-
seviyesi dengeleme YOK.

---

## B) ÖLÇEK VE YAKLAŞIM

**En büyük gain/cut değeri — GERÇEK sayı, koddan:** `+7dB` (Telefon
Hoparlörü, 2kHz peaking) EN BÜYÜK boost. `-4.5dB` (Araba, 350Hz peaking)
EN BÜYÜK cut. Filtre-bazında en büyük TOPLAM boost: Araba'nın 3
kademesinin (+5, -4.5, +4) net etkisi frekansa göre değişir (üst-üste
binmiyorlar, ayrı bantlarda), TEK bir "toplam dB" sayısı yok.

**Aralarında tutarlılık — KISMEN:** peaking gain'leri 3-7dB aralığında
(3, -4.5, 4.5, 5, 7 — 5 filtrenin 5 peaking'i), shelf gain'leri 2-5dB
aralığında (2, 2, 4, 5) — kabaca AYNI büyüklük mertebesinde, keyfi
dağınık DEĞİL. Ama HİÇBİR ortak sabit/formül/oran YOK — her filtrenin
değerleri (kod yorumlarına göre) BAĞIMSIZ, elle seçilmiş; TUR9'un da
bulduğu gibi kodda "hangi telefon modeli/hangi araba ölçüldü" gibi bir
KAYNAK referansı YOK (bkz. C).

**"Flat/bypass" durumu — VAR:** `toolsFilterActiveIdx = -1` başlangıç
DEĞERİ (`app.js:12071`) ve aktif karta TEKRAR tıklanınca da bu değere
DÖNÜLÜYOR (`app.js:12292`: `toolsFilterActiveIdx === idx ? -1 : idx`).
`-1` iken `toolsConnectFilterPreviewChain()`'de `filterDef` `null`
kalıyor, `filterDef.eq`/`stereo` HİÇ uygulanmıyor (`app.js:12221-12237`)
— kaynak DOĞRUDAN gain'e (ve varsa solo bandpass'a) bağlanıyor, TAM
bypass.

**Çıkış seviyesi filtreler arasında eşitleniyor mu — HAYIR, BİLİNÇLİ
OLARAK YOK.** `toolsFilterPreviewGain.gain.value = 0.85` TEK, SABİT
değer — hangi filtre (ya da bypass) seçili olursa olsun AYNI
(`app.js:12450`, sadece play başlarken BİR KEZ set ediliyor, filtre
değişiminde TEKRAR set EDİLMİYOR). **G242'nin A/B ders modları için
yaptığı loudness-eşitleme BURADA UYGULANMIYOR** — ama bu TUTARSIZLIK
DEĞİL, TUR9'un da doğruladığı gibi BİLİNÇLİ bir tasarım ayrımı: kod
yorumu (`app.js:11988-11990`) bunu AÇIKÇA "task'ın kendi kararı" olarak
işaretliyor — amaç cihazların GERÇEK göreli sesliliğini (telefon kısık,
club güçlü) duyurmak, G242'nin amacı (A/B'de SADECE spektral farkı
duyurmak, loudness'ı devre dışı bırakarak) farklı bir pedagojik hedefe
hizmet ediyor. **İki mekanizma FARKLI amaçlar için BİLEREK farklı
davranıyor — bu bir tutarsızlık/bug değil.**

---

## C) KAYNAK VE GEREKÇE

**Değerlerin kaynağı — kodda AÇIKÇA "gerçek ölçüm DEĞİL" diye
etiketlenmiş.** İki AYRI yerde:
1. **Kod yorumu**, `app.js:11986-11987`: *"Değerler cihazların TİPİK
   davranışının taklididir — GERÇEK cihaz ölçümü DEĞİL"*.
2. **Kullanıcıya GÖRÜNEN UI metni**, `www/index.html:1185`
   (`.tools-filter-dsp-note` sınıfı, kart içinde SABİT):
   > "Bu filtreler cihazların tipik ses karakterine yaklaşık bir
   > taklittir — gerçek cihaz ölçümü değildir."

Bu iki yer **BİREBİR AYNI iddiayı** taşıyor — kod içi itiraf sadece
geliştiriciye değil, KULLANICIYA da gösteriliyor (dürüst etiketleme,
TUR9'un da vurguladığı nokta).

**Hangi cihazlar taklit ediliyor — sadece JENERİK kategori isimleri
VAR, SPESİFİK model/marka YOK:** "Telefon Hoparlörü", "Araba", "Kulaklık",
"Club Sistemi", "Laptop Hoparlörü" — hangi telefon modeli, hangi araba
markası, hangi kulaklık ÖLÇÜLDÜĞÜNE dair kodda HİÇBİR referans YOK
(`grep` ile doğrulandı — `TOOLS_FILTERS` dizisinde `name`/`range`/`kind`/
`icon`/`eq`/`stereo` DIŞINDA hiçbir alan yok, ör. bir `source:` ya da
`ref:` alanı YOK). Kod yorumları (satır-üstü, her filtrenin YANINDA)
mühendislik GEREKÇESİ veriyor (ör. Telefon: *"~500Hz altı pratikte YOK...
1–3kHz orta bant öne çıkar"*) ama bu bir MÜHENDİSLİK AÇIKLAMASI, bir
ÖLÇÜM KAYNAĞI DEĞİL — "tipik" kelimesi zaten bunu beklemiyor.

---

## D) FİLTRE EKLEME/ÇIKARMA MALİYETİ

**Yeni filtre eklemek için gereken minimum değişiklik yerleri (kod
okunarak sayıldı):**
1. `TOOLS_FILTERS` dizisine (ya da "Telefon Hoparlörü" girdisinin
   YERİNE) yeni bir obje — `name`/`range`/`kind`/`icon`/`eq`/`stereo`
   alanları (`app.js:11992-12070`).
2. `TOOLS_FILTER_ILLUST_PATHS`'e yeni `kind` anahtarı için bir SVG path
   (`app.js:12259-12265`) — **eklenmezse ÇÖKMEZ**, `toolsFilterIllustration()`
   bilinmeyen `kind` için boş string döner (`TOOLS_FILTER_ILLUST_PATHS[kind]
   || ""`, `app.js:12267`), sadece illüstrasyon alanı BOŞ kalır.
3. **Başka HİÇBİR yer YOK** — `kind` alanı `grep` ile doğrulandı,
   SADECE bu ikon-sözlüğü aramasında kullanılıyor; `www/styles.css`'de
   `kind`'a özel (ör. `.phone`, `.car`) HİÇBİR CSS kuralı YOK (grid/kart
   stilleri jenerik, `active` durumuna göre).

**"Telefon Hoparlörü" kaldırılırsa ne kırılır — HİÇBİR ŞEY, bağımsız
olarak DOĞRULANDI:**
- **Kayıtlı kullanıcı seçimi — YOK, TUR9'un "aktif seçim hiç
  kaydedilmiyor" iddiası BU TURDA BAĞIMSIZ OLARAK YENİDEN doğrulandı:**
  `grep -n "toolsFilterActiveIdx"` sonuçlarının HİÇBİRİ `storage.js`/
  `localStorage`/`trySave` ile İLİŞKİLİ değil (`app.js:12071,12221,
  12273,12292,12297,12303`) — `toolsFilterActiveIdx` SADECE bellek-içi
  bir `let`, HER sayfa yüklemesinde `-1`'e (kapalı) sıfırlanıyor. Yani
  bir filtre kaldırıldığında/dizide yer değiştirdiğinde, ÖNCEKİ oturumdan
  kalma "yanlış filtreye işaret eden kayıtlı seçim" senaryosu MİMARİ
  OLARAK OLUŞAMAZ.
- **Testler — SIFIR bağımlılık, doğrulandı:** `grep -rl "Telefon
  Hoparlör\|toolsFilterActiveIdx\|TOOLS_FILTERS" test/ e2e/` **hiçbir
  sonuç döndürmedi** (hem `test/` hem `e2e/` dizinleri kontrol edildi).
- **"i" metni — filtreleri TEK TEK SAYMIYOR:** `grep -n "Telefon
  Hoparlör\|Araba\|Kulaklık\|Club Sistemi\|Laptop Hoparlör"
  www/js/core/guide-texts.js` **sıfır sonuç** — hiçbir rehber/info
  metni filtre isimlerini anmıyor.
- **Mağaza/pazarlama metni — geçmiyor:** `grep -rln "Telefon Hoparlör"
  www/` **SADECE `www/js/app.js`'i döndürdü** (`TOOLS_FILTERS`
  dizisinin kendisi) — `index.html`'in satın alma/paywall bölümünde,
  başka hiçbir dosyada isim GEÇMİYOR.

**Sonuç:** yeni filtre eklemek/mevcut birini değiştirmek **veri-odaklı,
izole bir değişiklik** — persistans/test/metin migrasyonu GEREKMİYOR.

---

## E) UYGULAMA DETAYI

**Gerçek zamanlı mı, offline mı — GERÇEK ZAMANLI.** `toolsConnectFilterPreviewChain()`
`audioEngine.audioCtx` (paylaşılan, CANLI `AudioContext`) üzerinde
`ctx.createBiquadFilter()` ile GERÇEK zamanlı graf düğümleri kuruyor
(`app.js:12214-12250`) — `OfflineAudioContext` bu akışta HİÇ
kullanılmıyor (önceki OLCUM-SAMPLERATE-16-08 turunda zaten `grep`
ile TÜM kod tabanında `OfflineAudioContext` kullanımının SIFIR
olduğu doğrulanmıştı, bu alan da o kapsamda).

**Filtreler arasında geçişte kesinti — kaynak node YENİDEN
BAŞLATILMIYOR, sadece downstream zincir SÖKÜLÜP YENİDEN KURULUYOR:**
Kart tıklamasında (`app.js:12295`) `toolsFilterPlaying` true ise
`toolsConnectFilterPreviewChain()` TEKRAR çağrılıyor — bu fonksiyon
`toolsFilterPreviewNode.disconnect()` (KAYNAK node'un ÇIKIŞ bağlantısını
söker, node'un KENDİSİNİ/çalma pozisyonunu DURDURMAZ) + `toolsDisconnectFilterChain()`
(eski filtre/stereo node'larını temizler) yapıp YENİ zinciri kuruyor
(`app.js:12214-12250`). Yani **çalma pozisyonu KORUNUYOR** (kaynak
`AudioBufferSourceNode` kesintisiz akmaya devam ediyor), sadece EQ/
stereo node'ları değişiyor. **Bu geçişin KULAKLA duyulabilir bir "tık/
click" üretip üretmediği bu turda ÖLÇÜLMEDİ** (canlı ses deneyi bu
görevin kapsamı dışında tutuldu, "kod ne diyorsa onu yaz" kuralı
gereği sadece YAPISAL davranış — pozisyon korunuyor, kaynak yeniden
başlamıyor — raporlanıyor; işitsel/click testi yapılmadı, BELİRSİZ).

**Bypass ile karşılaştırma — YAPILABİLİYOR, doğrulandı (bkz. B):**
aktif karta tekrar tıklamak `toolsFilterActiveIdx`'i `-1`'e döndürüyor,
çalarken de bu geçiş CANLI uygulanıyor (`app.js:12292-12295`) — kullanıcı
çalarken filtreli/filtresiz arasında GEÇİŞ YAPABİLİR.

**Aynı anda birden fazla filtre — HAYIR, KARŞILIKLI DIŞLAYICI:**
`toolsFilterActiveIdx` TEK bir sayı (`number`, Set/array DEĞİL) — bir
karta tıklamak ÖNCEKİ aktif indeksin YERİNE geçiyor (`app.js:12292`),
iki filtre AYNI ANDA seçili OLAMAZ. (Not: Tonal Balance'ın bölge-solo
bandpass'ı — `toolsSoloBandIdx` — AYRI bir mekanizma, cihaz filtresiyle
BİRLİKTE aktif olabilir, ama o bir "referans filtresi" DEĞİL, ayrı bir
özellik — bkz. A'daki zincir sırası.)

---

## F) BLUETOOTH FİLTRESİ İÇİN YAPI ÖNERİSİ

_Sadece YAPI — değerler kullanıcı tarafından belirlenecek._

Mevcut desenle TUTARLI olması için:

1. **Dizi konumu:** `TOOLS_FILTERS`'ta "Telefon Hoparlörü"nün (index 0)
   **YERİNE** geçmeli — kullanıcının isteği "Telefon Hoparlörü kalkacak,
   Bluetooth Hoparlör eklenecek" olduğu için bu bir EKLEME değil,
   **DEĞİŞTİRME** (5 filtre SAYISI korunuyor). D)'de doğrulandığı gibi
   bu, persistans/test/metin AÇISINDAN sıfır ek maliyetli bir işlem.
2. **Zorunlu alanlar (mevcut 5 filtrenin HEPSİNDE olan):** `name`
   (görünen), `range` (kart etiketi, "X Hz – Y kHz" formatında —
   MEVCUT 5 filtrenin HEPSİ bu formatı kullanıyor), `kind` (YENİ bir
   anahtar, ör. `"bluetooth"` — henüz kullanılan 5 anahtardan biriyle
   ÇAKIŞMAMALI), `icon` (kart üstü küçük SVG path — mevcut 5 filtrenin
   HER birinde ayrı bir tek-path ikon var, aynı `viewBox="0 0 24 24"`
   ölçeğinde olmalı), `eq`, `stereo`.
3. **`eq` yapısı — dizi, SIRALI/SERİ node listesi:** mevcut desende
   filtre-başına **2 ila 4 node** arası kullanılıyor (Kulaklık en az/2,
   Telefon en çok/4). Her node objesi `{type, freq, q?, gain?}` şeklinde
   — `type` Web Audio'nun desteklediği `highpass`/`lowpass`/`peaking`/
   `lowshelf`/`highshelf` (mevcut 5 filtrede `notch` HİÇ kullanılmamış,
   ama kod `f.type = spec.type` ile HERHANGİ bir BiquadFilterNode tipini
   kabul ediyor — `notch` da teknik olarak MÜMKÜN, sadece hiç
   kullanılmamış). `gain` sadece peaking/shelf tiplerinde anlamlı
   (`app.js:12227`: `if (spec.gain !== undefined) f.gain.value = spec.gain`
   — highpass/lowpass'ta verilmezse zaten kullanılmıyor). `q` verilmezse
   varsayılan `Math.SQRT1_2` devreye giriyor (`app.js:12228`) — mevcut
   desende highpass/lowpass'larda genelde AÇIKÇA bir Q veriliyor (0.7-0.9
   aralığında, Butterworth'e yakın), shelf'lerde HİÇ Q verilmiyor
   (Web Audio'nun shelf tipi zaten Q'yu farklı yorumluyor).
4. **Sert kesim isteniyorsa kademeli tekrar deseni MEVCUT:** Telefon
   Hoparlörü AYNI highpass'ı 2 KEZ art arda kullanarak (~12dB/oktav →
   ~24dB/oktav) daha sert bir kesim elde ediyor — Bluetooth hoparlörün
   düşük-uç davranışı SERTSE bu desen (aynı `{type,freq,q}` objesini
   dizide 2 kez yazmak) tutarlı bir seçenek.
5. **`stereo` yapısı — dizi, `{lo, hi, mid, side}` bant listesi:**
   mevcut desende ya **TEK bant** (tüm spektrum, 4/5 filtre) ya da
   **frekansa bölünmüş çoklu bant** (Club Sistemi, sub bas AYRI
   davranıyor) kullanılıyor. Bluetooth hoparlörler TİPİK OLARAK TEK
   kanallı/mono ya da dar-stereo oldukları için (kullanıcının kendi
   araştırmasına bağlı) muhtemelen TEK bant yeterli olur — çok-bantlı
   yapı (Club deseni) SADECE frekansa göre DEĞİŞEN bir stereo genişliği
   gerekiyorsa gerekli, mevcut 5 filtrenin 4'ü buna İHTİYAÇ DUYMUYOR.
6. **`icon`/`TOOLS_FILTER_ILLUST_PATHS`:** yeni `kind` anahtarı
   (`app.js:12259-12265`) için AYRICA bir SVG path eklenmezse kart
   BOZULMAZ (boş illüstrasyon alanı, D)'de doğrulandı) — ama mevcut 5
   filtrenin HEPSİNİN kendi ikonu olduğu için TUTARLILIK için eklenmesi
   önerilir (fonksiyonel ZORUNLULUK değil, görsel TUTARLILIK).
7. **Kazanç telafisi eklenmemeli** — mevcut 5 filtrenin HİÇBİRİNDE
   YOK, `toolsFilterPreviewGain` SABİT 0.85 TÜM filtreler için ortak
   (B'de doğrulandı) — Bluetooth filtresi de aynı kurala tabi olmalı,
   kendi bir gain-telafisi TAŞIMAMALI (mimari tutarlılık, mevcut
   deseni bozmamak için).

---

## Dürüstlük notu

Bu raporun A-E bölümlerindeki TÜM iddialar bu turda BAĞIMSIZ OLARAK
`grep`/tam dosya okumasıyla doğrulandı — TUR9-ARACLAR-15-08.md'nin
BULGULARINA "güvenilmedi", AYNI kontroller BU turda TEKRARLANDI (kod
dünden bugüne bu bölgede değişmedi, `git log` ile TEYİT edilebilir
ama bu turda AYRICA çalıştırılmadı — commit özetlerinden [G249-G251,
OLCUM-* raporları] bu bölgeye dokunan bir değişiklik YOK). **E)'deki
TEK BELİRSİZ madde:** filtreler arası CANLI geçişin kulakla duyulabilir
bir "tık" üretip üretmediği — bu, YAPISAL kod okumasıyla
CEVAPLANAMAYACAK bir soru, GERÇEK bir dinleme testi gerektirir, bu
turun kapsamında (SADECE kod okuma) YAPILMADI.

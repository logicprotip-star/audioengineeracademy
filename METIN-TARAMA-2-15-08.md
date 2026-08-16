# METIN-TARAMA-2-15-08 — 11 Modun Feedback Metinleri, TAM Tarama

_Kapsam: SADECE ÖLÇÜM, kod/dosya/commit YOK. METIN-TARAMA-15-08.md'nin kendi
"en büyük açık" notunu ("diğer 11 modun feedback metinleri sadece YÜZEYSEL
tarandı") kapatmak için yapıldı — bu turda o 11 mod satır satır okundu._

**Kapsam derinliği (dürüstçe işaretlendi):**

**TAMAMI satır satır okundu — 11/11 mod, YÜZEYSEL taranan YOK:**

| Dosya | Satır sayısı |
|---|---|
| `modes/frekans-bulma.js` | 1199 |
| `modes/kesim-noktasi.js` | 708 |
| `modes/q-genisligi.js` | 579 |
| `modes/boost-mu-cut-mu.js` | 696 |
| `modes/db-seviyesi.js` | 683 |
| `modes/kompresor.js` | 580 |
| `modes/reverb.js` | 636 (G248'in mekân-düzeltmesinden SONRAKİ hâli) |
| `modes/distortion.js` | 527 |
| `modes/pan-konumu.js` | 443 |
| `modes/stereo-genislik.js` | 623 |
| `modes/frekans-cakismasi.js` | 791 |

Toplam ~8.465 satır. Her dosyada `getFeedbackData`/`teachingText`/
`getHintText`/`modeDescription`/`questionTitle`/`correctLabel` ve varsa
mod-özel öğretim-metni tabloları (ZONE_EFFECT, mixMeaning, mixNote,
COMPRESSION_TIERS, REVERB_AMOUNT_TIERS, DISTORTION_TYPE_INFO vb.) satır
satır incelendi. `tonal-denge.js`/`guide-texts.js` önceki turda (METIN-
TARAMA-15-08) zaten DERİN okunmuştu, bu turda TEKRARLANMADI.

**Bu turda okunmayan:** `app.js`'in bu 11 modu ekrana döken kısımları
(mod dosyaları SAF fonksiyon döndürüyor, app.js'in bunu DOM'a nasıl
bastığı ayrı bir katman) — bulgular mod dosyalarının kendi ÇIKARDIĞI
string'lere dayanıyor, app.js'in bunları render ederken başka bir şeyle
BİRLEŞTİRİP birleştirmediği (ör. correctLabel'ın gerçekten oyuncuya mı
gösterildiği yoksa dahili/debug amaçlı mı olduğu) bazı bulgularda BELİRSİZ
bırakıldı, ayrıca işaretlendi.

---

## a) ANLAM KAYMASI

**🟡 Bir somut bulgu — `kesim-noktasi.js:519`, yanlış filtre TİPİ hatası "yön" hatası gibi anlatılıyor:**

```js
const title = result.typeOk ? "Yakın ama kaçtı" : "Ters yöne gittin";
```

`typeOk=false` durumu kullanıcının **filtre TİPİNİ** (HPF yerine LPF vb.)
yanlış seçtiği anlamına gelir — frekans yönüyle hiç ilgisi yok. Ama başlık
"Ters yöne gittin" — Türkçe'de bu ifade doğrudan yönsel/frekans hatası
çağrıştırır. Karşılaştırma: `boost-mu-cut-mu.js:508` ve `db-seviyesi.js:453`
AYNI başlığı GERÇEK bir yön (boost/cut, açıldı/kısıldı) hatası için
kullanıyor — orada doğru bağlamda. `kesim-noktasi.js`'te ise kategori
(tip) hatası ile yön hatası birbirine karışmış. Kullanıcı "Ters yöne
gittin" okuyunca "yanlış frekansa gittim" sanabilir, oysa sorun filtre
TİPİYDİ (asıl açıklama `teachingText`'in gövdesinde doğru anlatılıyor,
sadece BAŞLIK yanıltıcı).

**Önerilen düzeltme:** Başlığı tipi doğrudan adlandıran bir ifadeye
çevir, ör. `"Yanlış filtre tipi"` veya `"HPF/LPF'i karıştırdın"`.

## b) DEVRİK CÜMLE / ÇEVİRİ KOKAN YAPI

**Bu turda net bir devrik/çeviri-kokan yapı BULUNAMADI** — 11 modun
tamamında cümleler kısa, yüklem sonda, doğal Türkçe söz dizimini izliyor.
`frekans-cakismasi.js`'in Aşama 2 yanlış-cevap cümlesi ("...çünkü asıl
maskeleyen kaynak X, Y değil.") biraz liste-benzeri/resmi okunuyor ama
gramatik olarak DOĞRU, devrik değil — bulgu olarak listelenmedi.

## c) TERİM KARŞILIĞI — TERIM-KURALI.md karşılaştırması

**🟡 Çapraz-mod terim tutarsızlığı — "boost/cut" kavramının dil seçimi modlar arasında değişiyor:**

- `frekans-bulma.js:494` — Türkçe fiil: `"yükseltildi ▲"` / `"kesildi ▼"`.
- `boost-mu-cut-mu.js` (modun kendi adı dahil, DIRECTION_WORD/correctLabel/
  buton metinleri) — İngilizce: `"Boost"`/`"Cut"`/`"boost"`/`"cut"`.
- `q-genisligi.js:410,438-439` — İngilizce: `"boost"`/`"cut"`,
  `"Boost (+)"`/`"Cut (−)"`.

Aynı ses olayı (bir bandın kazancının yükseltilmesi/kesilmesi) bir modda
Türkçe fiil, iki modda İngilizce isim olarak anlatılıyor. TERIM-KURALI.md
"boost/cut"u kendi örnek listesinde açıkça İSİMLENDİRMİYOR (gain/threshold/
ratio gibi net kategorize edilmemiş) — bu yüzden KESİN bir kural ihlali
değil, ama modun kendi adı ("Boost mu Cut mu") İngilizce'yi zaten kabul
ettiği için tutarlılık beklenir. **Kesin bulgu değil, Logic'in üslup
kararına bırakılan bir gözlem.**

**🟢 Diğer terim kullanımı — kontrol edildi, sorun YOK:** HPF/LPF, Q,
Room/Hall/Plate, Clipping/Soft Clip/Tube/Tape, GR (gain reduction, kısaltma
olarak) — hepsi TERIM-KURALI'nın "teknik terim İngilizce kalır" ilkesine
uygun, ilk-geçişte gerekirse Türkçe karşılığı parantezde (ör. "Tube
(Valf) Saturation").

## d) HİTAP TUTARLILIĞI

**🟢 SORUN YOK — 11 modun TAMAMINDA sıfır "siz" (resmi) formu.** Önceki
turun `app.js`/`core/*.js` genelindeki bulgusu, bu turda mod dosyalarının
TAM taramasıyla DOĞRULANDI: hepsi baştan sona "sen" (samimi) hitabı
kullanıyor.

## e) ÜSLUP TUTARLILIĞI — modlar arası fark var mı?

**🟡 Sistemik bulgu — Motor 2'nin üç modunda (Kompresör/Reverb/Distortion) ALL-CAPS "kod-yorumu vurgusu" kullanıcı metnine sızmış:**

G248'de düzeltilen `guide-texts.js:172`'deki "AYNI" bulgusuyla AYNI
kategori (kod yorumlarının ALL-CAPS Türkçe vurgu alışkanlığının kullanıcı
metnine sızması), ama bu sefer İZOLE değil — Motor 2'nin üç modunun
ÜÇÜNDE de tekrarlanıyor:

| Dosya:Satır | Metin |
|---|---|
| `kompresor.js:335` (modeDescription) | "...**FARKLI** kompresyonlu olanı..." |
| `kompresor.js:461` (getHintText) | "Farklı olan **DAHA ÇOK**/**DAHA AZ** kompresyonlu" |
| `reverb.js:325` (modeDescription) | "...reverb'i **FARKLI** olan sesi..." |
| `reverb.js:475` (getHintText) | "Farklı olan **BAŞKA** bir tip reverb" |
| `reverb.js:476` (getHintText) | "Farklı olan **DAHA UZUN**/**DAHA KISA**..." |
| `distortion.js:330` (modeDescription) | "...distortion'ı **FARKLI** olanı..." |
| `distortion.js:429` (getHintText) | "Farklı olan **DAHA ÇOK**/**DAHA AZ** bozulmuş" |

`kompresor.js` bu üç modun ŞABLONU (reverb/distortion dosya başı
yorumlarında "BİREBİR ikiz/türetildi" diye belgeleniyor) — bu alışkanlık
muhtemelen kompresor.js'ten mekanik olarak kopyalanarak yayılmış. Motor 1
modlarının (frekans-bulma, kesim-noktasi, q-genisligi, boost-mu-cut-mu,
db-seviyesi, pan-konumu, stereo-genislik) HİÇBİRİNDE bu kalıp YOK — bu
Motor 2'ye ÖZGÜ bir alışkanlık. **Belirsizlik notu:** bu bilinçli bir
"hint/description vurgu tasarımı" (rozet gibi kısa vurgu) da olabilir —
kesinlik düşük, ama en azından TUTARLILIK açısından ya HEPSİ böyle
kalmalı ya da hiçbiri (şu an Motor 1/Motor 2 arasında görünür bir fark
var).

**🟡 Küçük bulgu — `frekans-cakismasi.js:539-546`, aynı fonksiyon içinde "İpucu:" öneki tutarsız:**
Aşama 2/3'te `"İpucu: ..."` öneki var, Aşama 1'de yok (`"Çakışma X
bölgesinde"`). Aynı `getHintText` fonksiyonunun üç dalından ikisi bir
kalıp izliyor, biri izlemiyor.

**🟢 Güçlü tutarlılık örnekleri (pozitif):**
- "Senin cevabın"/"Doğru" canvas-legend metni **10 moddan 10'unda**
  (frekans-bulma, kesim-noktasi, q-genisligi, boost-mu-cut-mu, db-seviyesi,
  kompresor, reverb, distortion, pan-konumu, stereo-genislik) BİREBİR
  aynı — tek bir istisna yok.
- "Yanlış ses" başlığı Motor 2'nin üçünde (kompresor/reverb/distortion)
  BİREBİR aynı.
- "Bir kart seç" onay-butonu metni Motor 2'nin üçünde BİREBİR aynı.
- Pan Konumu / Stereo Genişlik ("ikiz modlar") teachingText yapısı,
  MIX_REALITY_NOTE deseni, getHintText üslubu BİREBİR paralel.

## f) YAZIM VE NOKTALAMA

**🟡 Sistemik bulgu — "nokta sonrası küçük harfle başlayan cümle" kalıbı, 3 dosyada bağımsız olarak tekrarlanmış:**

| Dosya:Satır | Örnek |
|---|---|
| `q-genisligi.js:411` (+ `mixText`, satır 66-70) | `` `...'de ${dirWord}. ${correctLbl.mixText}.` `` → "...1.0 kHz'de boost. cerrahi bir müdahale — ..." |
| `boost-mu-cut-mu.js:477/483/494` (+ `DIRECTION_EFFECT`, satır 453-456) | `` `...sen cut dedin. ${DIRECTION_EFFECT[trueDir]}.` `` → "...sen cut dedin. boost sesi öne çıkarır..." |
| `db-seviyesi.js:433` (+ `DIRECTION_EFFECT`, satır 413-416) | `` `...sen kısıldı dedin. ${...}.` `` → "...sen kısıldı dedin. açılınca sesin öne çıkması..." |

Üç dosyada da bir "teaching phrase" nesnesi (`mixText`/`DIRECTION_EFFECT`)
KÜÇÜK harfle başlayacak şekilde yazılmış, sonra bir ÖNCEKİ cümlenin
NOKTASINDAN hemen sonra şablonla birleştiriliyor — Türkçe yazım kuralına
aykırı bir "nokta + küçük harf" sonucu doğuyor. Bu üç dosyanın PEŞ PEŞE
(dB Seviyesi → Boost/Cut → Q Genişliği sırasıyla, dosya başı notlarına
göre) yazıldığı ve birbirinden ŞABLON kopyaladığı düşünülürse, aynı hatanın
üç kez bağımsız yazılmaktan çok BİRBİRİNDEN kopyalanmış olma ihtimali
yüksek.

**Karşı-örnek (pozitif, düzeltme için referans alınabilir):**
`reverb.js` (438,447), `distortion.js` (403), `pan-konumu.js`
(MIX_REALITY_NOTE, satır 276), `stereo-genislik.js` (MIX_REALITY_NOTE,
satır 447), `frekans-cakismasi.js` (476-522) — AYNI türde
lowercase-başlangıçlı alanlar (mixMeaning/mixNote) kullanmalarına rağmen
BU hataya DÜŞMÜYORLAR: ya em-dash (`—`) ile birleştiriyorlar (nokta değil,
gramer olarak sorun yok) ya da yeni cümleyi doğru büyük harfle
başlatıyorlar (`MIX_REALITY_NOTE` iki ikiz modda da BÜYÜK harfle
başlıyor).

**Öneri:** `mixText` (q-genisligi.js) ve her iki `DIRECTION_EFFECT`
(boost-mu-cut-mu.js, db-seviyesi.js) objelerinin büyük harfle başlaması,
VEYA şablondaki noktanın em-dash/virgülle değiştirilmesi.

**Diğer yazım/noktalama:** `frekans-cakismasi.js:532`'deki "Iskaladın"
büyük harfte doğru NOKTASIZ "I" kullanıyor (Türkçe'nin ı/I - i/İ
ayrımına doğru uyuyor) — küçük ama doğru bir detay, bulgu değil.
`frekans-cakismasi.js:505`'teki apostrofsuz ek kullanımı ("...kicke o
bölgeyi bırak...") İLK bakışta hataymış gibi görünüyor ama İNCELENDİ:
BÜYÜK harfli (`${keepLabel}'e`, "Kick'e") apostroflu, küçük harfe
çevrilmiş hâli (`${keepLabel.toLowerCase()}e`, "kicke") apostrofsuz —
TUTARLI bir kural (özel-isim-gibi görünen büyük harfli etiket apostrof
alır, sıradan ortak isim almaz) ve task'ın kendi örnek metninden
(dosya başı yorum, satır 465-467) birebir alınmış — **bulgu OLARAK
LİSTELENMEDİ**.

## g) YAPAY ZEKA İZİ

**🟢 GÜÇLÜ SONUÇ — 11 modun TAMAMINDA klasik AI-slop kelimesi SIFIR:**
"harika"/"mükemmel"/"muhteşem"/"kesinlikle"/"inanılmaz" hiçbir mod
dosyasında yok. Ünlem kullanımı ölçülü ve bağlamsal (sadece "Doğru!"/
"🎯 Tam isabet!" gibi kısa onay anlarında), uzun açıklama metinlerinde
ünlem YOK. Jenerik pazarlama dili YOK — her açıklama SPESİFİK (gerçek
Hz/dB/oktav değerleri, gerçek bölge adları içeriyor).

**Not:** Motor 2'nin ALL-CAPS vurgu kalıbı (bkz. bölüm e) bu kategoriyle
SINIR bölgesinde — "aşırı vurgu" bir AI-izi değil ama bir KOD-ALIŞKANLIĞI
sızıntısı, kategorik olarak (e)'ye ve G248'in "AYNI" bulgusuna daha yakın.

## h) ÖĞRETİM DEĞERİ — feedback gerçekten öğretiyor mu?

**🟢 Genel olarak ÇOK GÜÇLÜ — 11 modun neredeyse tamamı "neden" açıklıyor, sadece "doğru/yanlış" demiyor.** Somut örnekler:
- `frekans-bulma.js`'in FA_ZONES tip metinleri: her bölge için "yükseltince
  X gelir, fazlası Y, azı Z" nedensel kalıbı.
- `kesim-noktasi.js`'in ZONE_EFFECT/DIRECTION_EFFECT'i: HPF/LPF'in o
  bölgede/yönde SESE ne yaptığını anlatıyor.
- `kompresor.js`/`reverb.js`/`distortion.js`'in kademe tabloları: ratio/
  threshold/decay/drive değerini mix diliyle çeviriyor.
- `pan-konumu.js`/`stereo-genislik.js`'in MIX_REALITY_NOTE'u: HER cevapta
  (doğru/yanlış fark etmeksizin) gerçek bir mix kuralı öğretiyor, ayrıca
  Stereo Genişlik AÇIKÇA Araçlar'daki mono-uyum ölçümüne bağlanıyor
  (modlar-arası kavramsal köprü, iyi bir örnek).

**🟢 EN GÜÇLÜ örnek — `frekans-cakismasi.js`:** G57'nin "yanlış cevapta da
AYNI derinlikte öğretim" hedefi tam anlamıyla karşılanmış. Aşama 1'in
yanlış-cevap dalı kullanıcının SEÇTİĞİ yanlış frekansta hangi kaynağın
baskın olduğunu (`dominantSourceAt`) hesaplayıp KİŞİSELLEŞTİRİLMİŞ bir
açıklama üretiyor ("senin seçtiğin X'de A var ama B zayıf, orada çakışma
olmaz"). Aşama 3 az-kestin/çok-kestin/yakın-ama-değil üç ayrı senaryoyu
ayırt ediyor, "yakınlık %X" ile NİCEL bir geri bildirim veriyor. 11 modun
en zengin "hatadan öğret" anlatısı burada.

**🟡 Görece daha ZAYIF (kesin bulgu değil, göreceli bir gözlem):**
`kompresor.js`/`distortion.js`'in yanlış-cevap dalları ("Yanlış — sen X
dedin. {base}") diğer modlara göre biraz daha kısa/formülsel — ama bu
A/B/C odd-one-out formatının kendi doğası gereği (yön/miktar gibi ek bir
"neden yanlış" ekseni yok, sadece "hangi ses farklıydı") makul bir kısıtlama,
kesin bir eksiklik olarak işaretlenmedi.

## i) MODLAR ARASI TUTARLILIK

Bölüm (c) ve (e)'de detaylandırılan bulgular (boost/cut dil seçimi,
ALL-CAPS vurgu, "Ters yöne gittin" kullanımı) bu kategorinin asıl
içeriği. Ek bir gözlem:

**🟡 Sayı/birim biçimi (dB) modlar arasında tutarsız — bkz. bölüm (j).**

**🟢 Pozitif — "aynı kavram, aynı anlatım" örnekleri:** dB Seviyesi ve
Boost/Cut'ın `formatDb()` fonksiyonları BİREBİR AYNI (kod tekrarı ama
ÇIKTI tutarlı: "+X.XX dB"). Pan Konumu ve Stereo Genişlik'in tüm mimarisi
(zorluk eğrisi deseni, MIX_REALITY_NOTE kalıbı, getHintText üslubu,
drawXField görseli) neredeyse BİREBİR paralel — "ikiz mod" olarak
tasarlandıkları dosya başı notlarıyla tutarlı, kullanıcı iki modu art
arda oynadığında üslup SIÇRAMASI hissetmeyecek.

## j) SAYI/BİRİM BİÇİMİ

**🟡 Bulgu — dB gösteriminde ondalık hassasiyeti ve boşluk kullanımı modlar arasında tutarsız:**

| Dosya:Satır | Biçim | Örnek çıktı |
|---|---|---|
| `db-seviyesi.js`/`boost-mu-cut-mu.js` `formatDb()` | 2 ondalık, işaret, boşluklu | `"+3.00 dB"` |
| `kompresor.js:340` `correctLabel` (GR) | 1 ondalık, işaretsiz, boşluksuz | `"GR 12.3dB"` |
| `kompresor.js:434` `teachingText` (threshold) | 0 ondalık, boşluklu | `"threshold -20 dB"` |
| `reverb.js:330` `correctLabel` (decay) | 1 ondalık, boşluksuz, birim "s" | `"decay 1.8s"` |
| `frekans-cakismasi.js:377` `correctLabel` (kesim) | 1 ondalık, boşluklu | `"6.0 dB kes"` |
| `distortion.js:336` `correctLabel` (drive) | 2 ondalık, birimsiz | `"drive 3.45"` |

Bu değerlerin çoğu farklı FİZİKSEL büyüklükleri temsil ettiği için
(gerçek gain farkı vs. gain-reduction vs. decay-saniyesi vs. drive-oranı)
TAM aynı biçimi paylaşmaları ZORUNLU değil — ama dB birimini taşıyan
DÖRT ayrı gösterim (formatDb'nin 2-ondalık/boşluklu/işaretli hâli,
kompresor'ün 1-ondalık/boşluksuz/işaretsiz GR'si, kompresor'ün 0-ondalık
threshold'u, frekans-cakismasi'nin 1-ondalık/boşluklu kesim'i) aynı
"dB" birimi için DÖRT farklı hassasiyet/boşluk kuralı kullanıyor. Bu,
kullanıcının farklı modlarda aynı birimi farklı "hissedilen kesinlikte"
görmesine yol açabilir.

**🟢 Pozitif:** Hz/kHz gösterimi (`formatHz`, frekans-bulma.js'ten TÜM
frekans-kullanan modlara paylaşılıyor) 5 modda (frekans-bulma,
kesim-noktasi, q-genisligi, boost-mu-cut-mu, frekans-cakismasi) BİREBİR
tutarlı — tek bir ortak fonksiyondan geldiği için sapma YOK. Yüzde
gösterimi (`%X`, pan-konumu/stereo-genislik/frekans-cakismasi'nin
maskOpenedPct'i) TÜMÜNDE Türkçe konvansiyona uygun ("%50", "50%" değil).

---

# ÖZET TABLO — TÜM BULGULAR

| # | Dosya:Satır | Sorun | Kategori | Ciddiyet |
|---|---|---|---|---|
| 1 | `kesim-noktasi.js:519` | "Ters yöne gittin" başlığı filtre-TİPİ hatasında yanlış bağlamda kullanılıyor | (a) | 🟡 |
| 2 | `q-genisligi.js:411`+`66-70`, `boost-mu-cut-mu.js:477/483/494`+`453-456`, `db-seviyesi.js:433`+`413-416` | Nokta-sonrası küçük harfle başlayan cümle (3 dosyada aynı kalıp) | (f) | 🟡 |
| 3 | `kompresor.js:335/461`, `reverb.js:325/475/476`, `distortion.js:330/429` | Motor 2'nin ALL-CAPS "kod-yorumu vurgusu" kullanıcı metnine sızmış (7 örnek, 3 dosya) | (e) | 🟡 |
| 4 | `frekans-bulma.js:494` vs `boost-mu-cut-mu.js`/`q-genisligi.js` | boost/cut kavramı bir modda Türkçe fiil, ikisinde İngilizce isim | (c)/(i) | 🟡 (kesin ihlal değil) |
| 5 | `frekans-cakismasi.js:539-546` | getHintText'in üç dalından ikisinde "İpucu:" öneki var, birinde yok | (e) | 🟢 küçük |
| 6 | `db-seviyesi.js`/`boost-mu-cut-mu.js`/`kompresor.js`/`reverb.js`/`frekans-cakismasi.js`/`distortion.js` | dB gösteriminde ondalık hassasiyeti (0/1/2) ve boşluk kullanımı 4 farklı kalıpta | (j) | 🟡 |

**Toplam: 6 bulgu** (5× 🟡, 1× 🟢-küçük) — **HİÇBİRİ 🔴 CİDDİ değil**,
hiçbiri anlamı tamamen bozmuyor/yanlış teknik bilgi vermiyor. Bulgu #1
en somut olanı (kullanıcıyı gerçekten yanlış yöne yönlendirebilecek tek
başlık). Bulgu #2 ve #3 SİSTEMİK (birden fazla dosyada bağımsız
tekrarlanmış) oldukları için tek-seferlik düzeltmelerden daha yüksek
öncelikli olabilir — düzeltilirse hepsi TEK bir kural olarak
düzeltilmeli, dosya dosya değil.

---

# SONUÇ LİSTELERİ

**Düzeltme UYGULANMADI — bu tur SADECE liste, task'ın kendi kuralı
("Düzeltme UYGULAMA — liste ver, Logic bakacak").**

## Öncelikli (küçük, hızlı, düşük riskli — Logic onaylarsa)
1. `kesim-noktasi.js:519` — "Ters yöne gittin" → tip-hatasını doğru
   adlandıran bir başlık (ör. "Yanlış filtre tipi").
2. `q-genisligi.js`'in `mixText` (66-70) ve `boost-mu-cut-mu.js`/
   `db-seviyesi.js`'in `DIRECTION_EFFECT`'lerini (453-456, 413-416)
   büyük harfle başlat — 3 dosya, tek kural.
3. `frekans-cakismasi.js:539-546` — Aşama 1 hint metnine de "İpucu:"
   öneki ekle (ya da üçünden de kaldır).

## Ürün-üslup kararı gerektirenler (Logic'e bağlı, "hata" değil tercih)
- Motor 2'nin ALL-CAPS vurgu kalıbı (bulgu #3) — kasıtlı bir
  hint-tasarımı olarak KALSIN mı, yoksa normal büyük/küçük harfe mi
  çevrilsin? Kalacaksa Motor 1 modlarına da (tutarlılık için) mı
  yayılsın, yoksa şu anki "sadece Motor 2" sınırı mı korunsun?
- boost/cut kavramının dil seçimi (bulgu #4) — frekans-bulma.js
  "boost/cut" İngilizce terimine mi geçsin, yoksa diğer ikisi Türkçe
  fiile mi dönsün?
- dB gösteriminin ondalık hassasiyeti/boşluk kuralı (bulgu #6) — tüm
  modlarda TEK bir `formatDb`-benzeri ortak fonksiyona mı taşınsın
  (kod tekrarını da azaltır), yoksa mevcut mod-özel biçimler mi kalsın?

## 1.1'e bırakılabilirler
- `app.js`'in bu 11 modu render eden katmanının (DOM birleştirme)
  bu turda TARANMAMASI — mod dosyalarının SAF çıktısı doğru olsa bile
  app.js'in bunu nasıl birleştirdiği (özellikle `correctLabel`'ın hangi
  ekranlarda GERÇEKTEN oyuncuya göründüğü) ayrı bir tur gerektirir.
- `kompresor.js`'in "GR" kısaltmasının (correctLabel/teachingText) hiçbir
  yerde açılıp açılmadığının doğrulanması (app.js taranmadığı için
  BELİRSİZ bırakıldı).

# TUR9-ARACLAR-15-08 — Araçlar Sekmesi Denetimi

_Kapsam: SADECE ÖLÇÜM, kod/dosya/commit YOK. Ölçüm DOĞRULUĞU (Logic'in
RX 11 karşılaştırması) değil, ölçümün TANIMI + akışların sağlamlığı
denetlendi. Bir kısmı gerçek ölçümle (Node'da doğrudan kod çalıştırılarak)
doğrulandı, tahmin değil — her bölümde belirtildi._

---

## A) REFERANS FİLTRELERİ — EĞRİ KAYNAĞI ⚠️ EN ÖNCELİKLİ

**Tam DSP tanımı — `app.js:11923-12002`, `TOOLS_FILTERS` dizisi, 5
filtre, TAM ÇIKARILDI:**

| Filtre | EQ zinciri | Stereo (mid/side) |
|---|---|---|
| Telefon Hoparlörü | HPF 500Hz Q0.9 ×2 (kademeli, ~24dB/okt) + peaking +7dB @2kHz Q1.1 + LPF 8kHz Q0.8 | mid=1, side=0 (TAM MONO) |
| Araba | lowshelf +5dB @60Hz + peaking −4.5dB @350Hz Q1.0 + highshelf +4dB @6kHz | mid=0.85, side=1.35 (genişletilmiş) |
| Kulaklık | lowshelf +2dB @100Hz + peaking +3dB @9kHz Q1.3 | mid=1, side=1 (DEĞİŞMEZ) |
| Club Sistemi | lowshelf +2dB @40Hz + peaking +5dB @60Hz Q1.1 + LPF 16kHz Q0.8 | 20-120Hz: mid=1/side=0 (sub mono); 120-20000Hz: mid=1/side=1 |
| Laptop Hoparlörü | HPF 200Hz Q0.75 (tek kademe) + peaking +4.5dB @3.5kHz Q1.0 + LPF 12kHz Q0.8 | mid=1, side=0.3 |

**Kaynak — GERÇEK CİHAZ ÖLÇÜMÜ DEĞİL, kod ve UI'da AÇIKÇA itiraf
edilmiş bir taklit:** `app.js:11916-11919` yorumu: *"Değerler
cihazların TİPİK davranışının taklididir — GERÇEK cihaz ölçümü
DEĞİL"*. **🟢 Bu itiraf sadece koda GÖMÜLÜ değil, KULLANICIYA da
GÖSTERİLİYOR** — `index.html:1179`, kart içinde SABİT bir uyarı:
*"Bu filtreler cihazların tipik ses karakterine yaklaşık bir taklittir
— gerçek cihaz ölçümü değildir."* **Bu, TUR8'in Bölüm A/J'deki loudness
sorunundan YAPISAL OLARAK FARKLI bir durum** — orada sorun SESSİZCE
yanlış öğretiyordu, burada uygulama KENDİSİ dürüst, kullanıcı
YANILTILMIYOR. **Değerler savunulabilir mi — EVET, dolaylı olarak:**
her filtrenin ARDINDA bir mühendislik gerekçesi var (kod yorumlarında,
tablo üstünde) — "telefon hoparlörü küçük, bas taşıyamaz → sert HPF",
"araba kabin rezonansı → 60Hz altı şişer, yol gürültüsü 350Hz'i
maskeler" gibi — bunlar akustik/mühendislik AÇISINDAN MAKUL, GENEL
BİLGİYLE TUTARLI seçimler, ama LİTERATÜR/ölçüm KAYNAĞI KODDA
GÖSTERİLMİYOR (hangi telefon modeli, hangi araba, ne ölçüldü — YOK,
zaten "tipik" dendiği için bu beklenmiyor). **🟢 Sonuç: dürüst
etiketleme + makul mühendislik yaklaşımı sayesinde bu bulgu
"YANLIŞ ÖĞRETİYOR" değil, savunulabilir bir basitleştirme.**

**Seviye telafisi — BİLİNÇLİ OLARAK YOK, ve bu DOĞRU bir tasarım
kararı:** Kod: *"SEVİYE TELAFİSİ YOK (task'ın kendi kararı) — telefon
hoparlörü GERÇEKTEN kısık duyulacak."* Bu, TUR8/G242'nin A/B ders
modlarındaki loudness-eşitleme kararının TAM TERSİ — ama TUTARLI: o
modlarda amaç SPEKTRAL ayrımı öğretmekti (loudness kısayolu istenmiyordu),
BURADA amaç GERÇEKÇİ bir cihaz simülasyonu — telefon hoparlörünün
GERÇEKTEN daha sessiz/ince duyulması İSTENEN davranış. **🟢 Doğru
ayrım, iki farklı pedagojik amaç iki farklı (ve HER İKİSİ DE doğru)
kararla ele alınmış.**

**Kaynak kütüphanesi yenilenince etkilenir mi — HAYIR, filtreler
RELATİF (dB boost/cut), belirli bir dosyaya/mastering seviyesine
REFERANS VERMİYOR:** `TOOLS_FILTERS` hiçbir yerde belirli bir kaynak
dosya id'sine bağlı değil — herhangi bir sesin üzerine UYGULANABİLİR.
**🟡 TEK risk (BELİRSİZ, ölçülmedi):** yeni kütüphane DAHA YÜKSEK
mastering seviyesinde gelirse (task'ın kendi "daha kaliteli/uzun,
256kbps" notu — seviye BELİRTİLMEDİ), `Araba`/`Club Sistemi`
filtrelerinin +4/+5dB boost'ları (lowshelf/peaking/highshelf) YENİ,
daha yüksek seviyeli kaynakla BİRLEŞİNCE clipping riski TEORİK olarak
artabilir — bu turda ÖLÇÜLMEDİ, kaynak kütüphanesi yenilenince
GERÇEK seviyeyle TEK TEK test edilmeli.

### ⚠️ BLUETOOTH KARARI — hazırlık ölçümü

**Filtre listesi değişince ne kırılır — HİÇBİR ŞEY, aktif seçim HİÇ
persist EDİLMİYOR:** `toolsFilterActiveIdx` (grep ile TAM olarak
doğrulandı) SADECE bellek-içi bir `let` — `storage.js`'de bu
değişkene karşılık gelen HİÇBİR anahtar YOK, hiçbir yerde
`trySave`/`localStorage`'a yazılmıyor. **Uygulama HER açılışta bu
seçimi -1 (kapalı) ile başlatıyor** — yani "kayıtlı seçim eski
filtreye işaret ediyor" senaryosu MİMARİ OLARAK OLUŞAMAZ, çünkü
kayıtlı bir seçim YOK.

**Testler filtre isimlerine bağlı mı — HAYIR, SIFIR bağımlılık:**
`grep -rl "Telefon Hoparlörü\|toolsFilterActiveIdx\|TOOLS_FILTERS"
test/ e2e/` **HİÇBİR sonuç döndürmedi** — bu özelliğin NE unit NE e2e
test kapsamı YOK (bu KENDİ BAŞINA ayrı bir 🟡 bulgu, aşağı bkz.),
ama bu turun sorusuna doğrudan cevap: bir isim değişikliği
HİÇBİR TESTİ KIRMAZ.

**"i" metni güncellenmeli mi — grep'le doğrulandı, GÜNCELLENECEK
BİR ŞEY YOK ki:** `grep -rn "Telefon Hoparlörü" www/js/core/guide-texts.js`
sıfır sonuç — Referans Filtreleri özelliğinin "i" rehberi (varsa)
filtre isimlerini TEK TEK ANMIYOR, jenerik bir açıklama kullanıyor
(bu turda TAM metin doğrulanmadı ama isim-spesifik bir cümle
BULUNAMADI).

**Yeni filtre eklemek/değiştirmek kaç yerde değişiklik gerektiriyor
— ÇOK DAR, TEK dosyada, ~3 nokta:**
1. `app.js:TOOLS_FILTERS` dizisine/İÇİNDE bir kayıt (`name`/`range`/
   `icon`/`eq`/`stereo`/`kind`) — TEK yer, ~15 satır.
2. `TOOLS_FILTER_ILLUST_PATHS[kind]` — YENİ bir `kind` string'i
   kullanılıyorsa (Bluetooth için muhtemelen gerekir) bir SVG path
   eklenmesi GEREKİR — **eklenmezse ÇÖKMEZ**, `|| ""` fallback'i
   grid'i BOZMADAN sadece o kartın illüstrasyon alanını boş bırakır
   (kod okunarak doğrulandı, `toolsFilterIllustration()`).
3. **Değişiklik bir REPLACE ise** (Telefon Hoparlörü YERİNE Bluetooth,
   task'ın senaryosu) sayı 5'te SABİT kalır, HİÇBİR grid/CSS/index
   varsayımı bozulmaz (statik HTML jenerik, "5 filtre kartı" SADECE
   bir YORUM satırında geçiyor, kodda sayıya bağlı HİÇBİR mantık
   bulunamadı).

**Bluetooth hoparlör için referans eğri önerisi (BELİRSİZ/tasarım
önerisi, ÖLÇÜLMEDİ — mevcut 5 filtrenin AYNI DSP diliyle, uygulama
DEĞİL, sadece FİKİR):** Taşınabilir BT hoparlörlerin (JBL Flip/Charge
tarzı) TİPİK karakteri — küçük sürücü + pasif radyatör → alt uç SERT
KESİK (muhtemelen `highpass ~150-200Hz`, Laptop Hoparlörü'nden biraz
daha SERT ama Telefon kadar değil), "algılanan detay" için ORTA-ÜST
VURGULU (bir `peaking +4 ila +6dB @2.5-4kHz` — mevcut Laptop/Araba
paternine benzer), tiz uçta genelde YUMUŞAK bir düşüş (`lowpass
~13-15kHz`). Stereo: TEK gövdeli taşınabilir hoparlörlerin ÇOĞU
FİİLEN MONO (iki sürücü aynı kutuda, sahne neredeyse yok) —
`mid=1, side≈0.15-0.3` (Laptop'a yakın, Telefon kadar SIFIR değil,
bazı modellerin "stereo mode" iddiası var ama dar) makul bir
BAŞLANGIÇ olurdu — **KESİN DEĞİL, kulakla/gerçek ölçümle
kalibre edilmeli, mevcut 5 filtrenin HİÇBİRİ de zaten "kesin
ölçülmüş" değil (aynı dürüstlük standardı).**

---

## B) MASKELEME MODELİ

_TUR8-OGRETIM-15-08'in Bölüm E'sinde TAM olarak ele alındı — burada
SADECE bu turun YENİ sorduğu "kaynak kütüphanesi yenilenince
geçersiz olur mu" açısı EKLENİYOR, tekrar ETMİYOR._

**Özet (TUR8'den):** `dominantSourceAt()` SİMETRİK/dekoratif bir
model (gerçek psikoakustik asimetri YOK, kod bunu *"dekoratif ama
tutarlı"* diye dürüstçe işaretliyor). `SOURCE_PAIRS` region değerleri
([50,160] kick+bas, [500,2000] vokal+gitar, [200,2000] snare+gitar)
ders-kitabı bilgisiyle TUTARLI ama gerçek FFT/spektral ölçüme
DAYANMIYOR (kod'da böyle bir referans YOK).

**🟡 YENİ bulgu — kaynak kütüphanesi yenilenince region değerleri
GEÇERSİZ OLMAZ ama VARSAYIMLARI TEST EDİLMEMİŞ hale gelir:**
`SOURCE_PAIRS`'ın region'ları belirli bir DOSYAYA değil, ENSTRÜMAN
TÜRÜNE (kick/bass/vocal/guitar/snare) bağlı sabitler — `region:
[50,160]` "kick VE bas GENEL OLARAK bu bantta çakışır" varsayımı,
HANGİ .m4a dosyasının kullanıldığından BAĞIMSIZ tanımlı. **Yani yeni
kütüphane GELDİĞİNDE kod ÇALIŞMAYA devam eder (region'lar HİÇBİR
YERDE dosya id'sine referans VERMİYOR)** — ama YENİ kick/bass
dosyaları GERÇEKTEN farklı bir spektral karaktere sahipse (ör. daha
"sub-heavy" bir 808 bas, ya da daha "click"li bir kick), [50,160]
aralığının o YENİ çiftte HÂLÂ en gerçekçi çakışma bölgesi olup
olmadığı BU TURDA ÖLÇÜLEMEDİ (gerçek dosyalar henüz yok) — kaynak
kütüphanesi geldiğinde BU BÖLGELERİN yeniden gözden geçirilmesi
ÖNERİLİR, ACİL DEĞİL.

---

## C) ÖLÇÜM TANIMLARI VE PENCERESİ

**`core/analysis.js` (753 satır) — OLAĞANDIŞI derecede rigorous ve
kendi kendini belgeleyen bir DSP modülü, TÜM sorular NET cevaplandı:**

**LUFS — hangi tür, hangi standart:** `ITU-R BS.1770-4` (K-weighting
katsayıları ITU'nun resmi 48kHz referans katsayılarıyla 10+ ondalık
hane DOĞRULUKLA eşleşecek şekilde TERS MÜHENDİSLİK edilmiş, kodun
kendi "DÜRÜSTLÜK NOTU"nda TAM anlatılıyor). **Üçü de HESAPLANIYOR:**
Momentary (400ms pencere), Short-term (3000ms pencere), Integrated
(TAM parça, iki-aşamalı kapılama). **Gating: EVET, TAM SPEC'E UYGUN**
— mutlak kapı **−70 LUFS** + göreli kapı **−10 LU** (integrated için),
`computeIntegratedLufs()`'ta doğrudan görülüyor.

**True peak — kaç kat oversampling:** **L=8x**, ITU'nun resmi
polifaz FIR tablosu KULLANILMIYOR (kod bunu AÇIKÇA itiraf ediyor —
"yanlış sayı üretme riski" gerekçesiyle BİLEREK), bunun yerine
KENDİ tasarımları Kaiser-pencereli sinc interpolasyon filtresi
(halfWidth=6, beta=26) — **ÖLÇÜLMÜŞ hata sınırları koda YAZILI:**
overshoot ≤~0.04dB, undershoot ≤~0.17dB (RX 11 karşılaştırmasıyla
kalibre edilmiş, G100).

**LRA hesaplanıyor mu, nasıl:** EVET — EBU Tech 3342, 3 saniyelik
pencere/**100ms adım** (spec'in "1s adım" ifadesinin YORUMLANMA
farkını, libebur128'i referans alarak 100ms'e ÇEKTİKLERİ AÇIKÇA not
edilmiş, RX 11 farkının SADECE ~0.1 LU'sunu kapattığı, KALAN farkın
"muhtemelen RX'in belgelenmemiş detaylarından" olduğu DÜRÜSTÇE
yazılmış), P10-P95 percentile, mutlak −70/göreli −20 LU kapılama.

**Faz/stereo korelasyon — hangi pencere, hangi yöntem:** İKİ AYRI
değer hesaplanıyor: (1) **Genel (overall) korelasyon** — TÜM parça
üzerinden tek bir Pearson-tipi katsayı (`sumLR/√(sumLL·sumRR)`,
[-1,1]'e kırpılı, sessizlikte nötr 0); (2) **Zaman serisi** — 3
saniyelik (SHORT_TERM_BLOCKS=30×100ms) KAYAN pencere, HER 100ms'de
bir güncellenen korelasyon dizisi (grafik için).

**Ölçüm parçanın HANGİ bölümünden alınıyor — TAMAMI, doğrulandı:**
`analyzeAudioBuffer()` girdi buffer'ının TAMAMINI CHUNK_SIZE'lık
bloklar hâlinde AKIŞKAN işliyor (bellek optimizasyonu İÇİN, ÖLÇÜM
KAPSAMI İÇİN DEĞİL) — integrated LUFS'un spec gereği TÜM parçayı
istemesi kuralı KARŞILANIYOR, kısmi/aralık ölçümü YOK.

**Bu tanımlar kullanıcıya gösteriliyor mu — 🟡 KISMEN, ASIL BULGU
BURADA:** UI'daki ETİKETLER doğru/profesyonel terminoloji kullanıyor
("Max momentary", "Integrated" + "Yaygın hedefler: akış −14, yayın
−23 LUFS" referans notu, `app.js:10281-10285`) — **AMA** `grep -n
"LUFS\|True Peak\|LRA\|Faz\|Korelasyon" guide-texts.js` **SIFIR
sonuç** verdi: **Ölçüm Sonuçları paneli için AYRI bir "i"
metodoloji metni YOK.** Karşılaştırma: Tonal Balance'ın hedef
eğrileri İÇİN G226'da TAM BÖYLE bir metin EKLENMİŞTİ ("41 parçadan
ölçüldü, bant tanımları araçtan araca değişir, sayılar birebir
tutmayabilir bu bir hata değil") — **Ölçüm Sonuçları paneli AYNI
muameleyi görmemiş.** Bu, task'ın kendi öngördüğü SENARYOYU TAM
karşılıyor: **ölçüm DOĞRU (RX 11'e yakın) ama METODOLOJİ görünmez
— bir profesyonel kullanıcı LRA'da ya da true peak'te RX'le KÜÇÜK
bir fark görürse, bunun NEDEN (100ms LRA adımı, custom true-peak
filtresi, ölçülmüş ~0.04-0.17dB sapma sınırı) olduğunu bilmeden
"bug" diye rapor edebilir.**

---

## D) KENDİ REFERANSIM AKIŞI

**En fazla 5, 6.'sı eklenince — ÖLÇÜLDÜ, FIFO (en eski silinir):**
`TOOLS_TONAL_REF_MAX = 5`; `while (list.length > MAX) list.shift();`
— 6. referans eklenince liste 5'e İNENE KADAR EN ESKİ kayıt(lar)
SESSİZCE düşer (kullanıcıya "en eski silindi" diye AYRI bir bildirim
YOK — 🟡 küçük bir UX notu, veri kaybı DEĞİL ama SESSİZ).

**Silme — VAR, çalışıyor:** "Sil" butonu (`data-ref-del`) → listeden
çıkar, aktif referans SİLİNENSE bir SONRAKİYE (varsa) geçer, o an
çalan A/B varsa ÖNCE durdurulur (stale ses/EQ riski önleniyor).

**Referans dosyası (sourceFileId) silinirse — GRAFİK/VERİ KALIR,
SADECE SES ÇALAMAZ hale gelir, KASITLI:** Kod: *"Dosya kütüphaneden
silinirse referansın EĞRİSİ/LUFS'u hâlâ kalır (grafik/karşılaştırma
çalışmaya devam eder), sadece A/B'nin 'A'sı (referans sesi) çalamaz
hâle gelir — app.js bu durumu AYRICA kontrol eder."* Silme
handler'ında (`tonalRefLoadedSourceFileId`'nin listede karşılığı
kalmadıysa temizlenmesi) DOĞRUDAN görüldü. **🟢 Tasarım BİLİNÇLİ ve
DOĞRU** — ölçülmüş VERİ (devs/lufs) dosyanın BAYTLARINDAN bağımsız
kalıcı, sadece "orijinal sesi dinle" özelliği doğal olarak kaybolur.

**`lufs`/`numberOfChannels` alanları ne için — DOĞRUDAN KOD İZLENEREK
DOĞRULANDI:** `lufs` → A/B dinlerken `lufsMatchGainDb(mixLufs,
ref.lufs)` ile SEVİYE eşitlemesi İÇİN (Referans Filtreleri'nin
TERSİNE, BURADA loudness eşitleme VAR — çünkü amaç "hangisi daha iyi
karışmış" karşılaştırması, loudness kısayolu istenmiyor, TUTARLI).
`numberOfChannels` → mono kontrolü İÇİN (`isMono = channels < 2`).

**Mono referans uyarısı — ÇALIŞIYOR, doğrulandı:** `if (isMono)
toast("Mono referans", ...)` — kayıt ENGELLENMİYOR (spektral eğri
mono downmix'le zaten geçerli ölçülüyor), SADECE bilgilendiriyor.

---

## E) BÖLGE DİNLEME + EQ ZİNCİRİ

**EQ node'ları temizleniyor mu — EVET, GENİŞ kapsamda:**
`toolsTonalMixEqNodes`/`toolsFilterChainNodes` HER İKİSİ de kendi
"stop" fonksiyonlarında `forEach(n => n.disconnect())` + dizi
sıfırlama İLE temizleniyor. `toolsTonalStopMixPlayback()`'in çağrıldığı
yer sayısı **13** (grep ile sayıldı) — mod değişimi, arka plana
alınma, sheet kapanışları, dosya değişimi gibi ÇOK sayıda çıkış
noktasına BAĞLANMIŞ. **🟢 Node birikmesi riski GÖRÜLMEDİ** — uzun
bir oturumda tekrar tekrar çalınsa bile her yeni EQ zinciri kurulmadan
ÖNCE eskisi temizleniyor (kod okunarak doğrulandı, çalışma zamanında
SAYILMADI ama mimari BU YÖNDE).

**İki özellik aynı anda kullanılırsa / Referans filtreleriyle çakışma
— 🟡 KISMİ İZOLASYON, TAM DEĞİL:** G182 kararı SADECE İKİ çifti
karşılıklı dışlıyor: (1) Referans Filtreleri ↔ Mixini Yükle ham-mix
(`toolsToggleFilterPlayback`/`toolsToggleRawMixPlayback` birbirini
DURDURUYOR), (2) Tonal Balance A ↔ Tonal Balance B (KENDİ İÇİNDE
karşılıklı dışlayıcı). **AMA bu İKİ ÇİFT ARASINDA (çapraz) HİÇBİR
DIŞLAMA YOK** — kod okunarak doğrulandı: `toolsToggleRawMixPlayback()`
SADECE `toolsFilterPlaying`'i kontrol ediyor, `tonalMixPlaying`/
`tonalRefPlaying`'e HİÇ BAKMIYOR. **Sonuç: kullanıcı Referans
Filtreleri'ni (ya da Mixini Yükle'yi) VE Tonal Balance A/B'yi AYNI
ANDA BAŞLATABİLİR** — iki ayrı ses kaynağı ÜST ÜSTE çalar (ikisi de
`ctx.destination`'a bağlanıyor, birbirini SUSTURMUYOR). Bu bir
ÇÖKME riski DEĞİL ama kullanıcı deneyimi açısından KAFA KARIŞTIRICI
olabilir (iki EQ'lenmiş sinyal üst üste, hangisinin hangisi olduğu
belirsizleşir).

**`computeReferenceEqGainsDb` sınırsız kazanç üretebilir mi — 🔴
EVET, KESİN, KOD İNCELENEREK DOĞRULANDI:** `tonal-balance.js:265` —
`mixDevs.map((d,i) => refDevs[i] - d)` — **HİÇBİR clamp/sınır YOK**.
Bu değer DOĞRUDAN `f.gain.value = gainDbBand` ile bir
`BiquadFilterNode("peaking")`'e yazılıyor (`app.js:~11180`), ARADA
hiçbir `Math.min`/`Math.max` YOK. **A/B loudness eşleme
(`lufsMatchGainDb`) de AYNI ŞEKİLDE sınırsız** — `targetLufs -
sourceLufs`, mix/referans arasında büyük bir LUFS farkı varsa
(ör. biri neredeyse sessiz) `toolsTonalAbGainA.gain.value = 0.85 *
10^(gainDb/20)` ÇOK BÜYÜK bir doğrusal kazanca dönüşebilir. **Bu
zincir `ctx.destination`'a DOĞRUDAN bağlanıyor — ana oyun motorunun
paylaşılan `DynamicsCompressorNode`'u (threshold −16dB) BU zincirde
YOK, hiçbir güvenlik limiteri devrede değil.** **Somut risk:** mix'in
bir bandı referanstan AŞIRI (ör. 20+ dB) sapmışsa, o bandın peaking
filtresi (Web Audio'nun kendi iç AudioParam sınırlaması OLABİLİR ama
BU ORTAMDAN doğrulanamadı, BELİRSİZ) + sonraki 5 bandın TOPLAMI
sert bir clipping/distortion üretebilir — ölçülmedi (gerçek bir
ekstrem dosyayla test edilmeli), ama YAPISAL RİSK KESİN.

---

## F) TONAL BALANCE CANLI ÖLÇEK

**Uzun oturumda şişip okunamaz hale gelir mi — HAYIR, ölçek
DOSYA/HEDEF BAZINDA sıfırlanıyor, KOD OKUNARAK DOĞRULANDI:**
`toolsTonalResetHalfRange(avgDevs, targetDevs)` — *"dosya/hedef
değişince (yeni ölçüm, preset/referans değişimi)
`renderToolsTonalCard()` tarafından BİR KEZ çağrılır: ölçeği SADECE
avg+target'tan (canlı YOK) yeniden hesaplayıp KİLİTLER."* Yani
"asla daralmaz" kuralı SADECE aynı dosya/hedef İÇİNDE geçerli — YENİ
bir dosya/hedef seçilince ölçek O YENİ verinin kendi ihtiyacına göre
TAZE hesaplanıyor, ÖNCEKİ genişlemiş hâl SIZMIYOR.

**Sıfırlama var mı, nerede — EVET:** `toolsTonalResetHalfRange()`,
her yeni ölçüm/hedef değişiminde çağrılıyor (yukarıda).

**Bir kez aşırı bir dosya ölçülünce sonraki dosyalar küçük mü
görünür — HAYIR:** Yukarıdaki reset mekanizması BUNU TAM OLARAK
ÖNLÜYOR — her dosya KENDİ ölçeğiyle başlıyor. **🟢 Tek NÜANS (aynı
dosya İÇİNDE):** bölge-solo dinleme SIRASINDA canlı veri ölçeği
zorlarsa (ratchet, `+= (floor - current)*0.12` yumuşak genişleme),
bu genişleme O DOSYANIN geri kalanı için KALICI kalır (task'ın
kendi tarif ettiği davranış, KASITLI — "hiçbir eğri kırpılmasın"
amacıyla) — bu bir HATA değil, bir SONRAKİ dosyaya SIZMAYAN, sınırlı
kapsamlı bir tasarım kararı.

---

## G) MİXİNİ YÜKLE ile MOD DOSYALARI İLİŞKİSİ

**Ayrım tam mı — Araçlar İÇİNDEKİ 3 bağlam TAM AYRIŞTIRILMIŞ,
KOD OKUNARAK DOĞRULANDI:** `contextId` deseni ÜÇ bağımsız değişkenle
izleniyor: `"tools"` (genel Araçlar/Mixini Yükle), `"tools-filter"`
(Referans Filtreleri, G159/G182'de AYRILDI), `"tonal-ref"` (Kendi
Referansım, G127'den). Her biri KENDİ `toolsXSelectedFileId`'sini,
KENDİ `uploadManager`'ını taşıyor — G182'nin kendi notu: *"dosya
seçimleri de TAM bağımsız oldu... transport'ları hâlâ ayrı."*
**Mod dosyaları (oyun ekranındaki upload) İLE Araçlar'ın ayrımı** bu
turda YENİDEN doğrulanmadı (önceki turlarda — G201/G204/G205 — zaten
kapatılmış, bu turda TEKRAR taranmadı, kapsam dışı bırakıldı).

**Dosya silinince her iki taraf da haberdar mı — Araçlar İÇİ 3
bağlam İÇİN EVET (yukarıdaki kod), mod-dosyaları TARAFI bu turda
YENİDEN doğrulanmadı — BELİRSİZ/önceki tur bulgusuna güveniliyor.**

**Dördü aynı anda çalışabilir mi — HAYIR TAMAMEN, ama İKİDEN FAZLASI
ÇALIŞABİLİR — Bölüm E'de TAM detay:** SADECE İKİ karşılıklı-dışlama
çifti var (Referans Filtreleri↔Mixini Yükle; Tonal A↔Tonal B) —
bu ÇİFTLER ARASINDA (ör. Referans Filtreleri + Tonal Balance A) hiçbir
engel YOK, TEORİK OLARAK EN FAZLA 2 kaynak AYNI ANDA çalabilir (4
DEĞİL, ama task'ın "izole mi" sorusunun cevabı: KISMEN — 🟡).

---

## H) GEÇMİŞ VE SINIRLAR

**Ölçüm geçmişi kaç kayıt — 10, ÖLÇÜLDÜ:** `TOOLS_HISTORY_MAX = 10`
— HEM "Son İşlemlerim" (`TOOLS_ACTIONS_KEY`) HEM "Son Ölçümlerim"
(`TOOLS_MEASUREMENTS_KEY`) AYNI sabiti, AYNI paylaşılan
`toolsSaveJson()` yardımcısını kullanıyor — `unshift` (yeni başa) +
`slice(0, 10)` (eskiyi sessizce at) — dolunca HATA/UYARI YOK, en eski
kayıt sessizce düşer (Kendi Referansım'ın 5-limitiyle AYNI FIFO
deseni).

**Dosya kütüphanesi sınırı — 5, ÖLÇÜLDÜ:** `TOOLS_LIBRARY_MAX = 5`
— AYNI FIFO deseni (`while (toolsFiles.length > MAX) ...`, en eski
`addedAt` düşer).

**Temizleme mekanizmaları (G202/G208/G209) her ikisini kapsıyor mu —
EVET, DOĞRULANDI:** `toolsClearAllActions()`/`toolsClearAllMeasurements()`
İKİSİ de AYRI butonlarla (`toolsClearActionsBtn`/
`toolsClearMeasurementsBtn`) bağlı, İKİSİ de listeler boşken
buton GİZLENİYOR (`classList.toggle("hidden", length===0)`).

---

## I) ANALİZ WORKER'I

**Worker ne zaman başarısız oluyor — KOD OKUNARAK 3 KESİN senaryo
bulundu:** (1) `new Worker(url)` constructor'ının kendisi hata
fırlatması (ör. modül yükleme/CSP sorunu), (2) `worker.onerror`
(worker script'inin İÇİNDE, `postMessage`'a ULAŞMADAN önce bir hata —
ör. `analysis-worker.js`'in kendisi bozuksa), (3) `postMessage`'ın
SENKRON fırlatması (ör. transfer edilecek ArrayBuffer zaten
"neutered"). **ÖNEMLİ AYRIM (kod zaten doğru yapıyor):** worker'ın
KENDİSİ ÇALIŞIP `analysis.js`'in BİLEREK fırlattığı bir uygulama
hatasını (ör. 3+ kanal desteklenmiyor) bildirmesi BU KATEGORİYE
GİRMİYOR (`isApplicationError` bayrağıyla AYRIŞTIRILIYOR, ana
thread'e DÜŞMÜYOR — mantıklı, aynı veri aynı hatayı yeniden üretirdi).

**Ana thread'e düşünce ne kadar donuyor — GERÇEKTEN ÖLÇÜLDÜ (Node'da,
tahmin DEĞİL):** `analyzeAudioBuffer()` fonksiyonunun KENDİSİ (worker
İÇİNDE VE fallback'te AYNI fonksiyon) 5 dakikalık, 44.1kHz, stereo
SENTETİK bir buffer'la (sinüs dalgası) DOĞRUDAN Node'da çalıştırıldı:
**~3.27 saniye.** ⚠️ **BU ÖLÇÜM DESKTOP (Apple Silicon Mac, Node)
ORTAMINDA yapıldı — GERÇEK bir iOS cihazda (özellikle eski/düşük güçlü
bir iPhone) BU SÜRE DAHA UZUN olabilir, KESİN bir mobil rakam
İDDİA EDİLMİYOR** — ama sıfıra yakın bir "anlık" işlem OLMADIĞI,
GERÇEK, saniyeler mertebesinde bir hesap olduğu KESİN.

**iOS watchdog 10 saniyede öldürür — bu risk var mı — BELİRSİZ kesin
eşik, ama KATEGORİ OLARAK GERÇEK bir risk:** iOS'un ana-thread'i uzun
süre bloke eden uygulamaları sonlandıran bir/birden fazla watchdog
mekanizması olduğu GENEL OLARAK bilinen bir platform davranışı —
KESİN eşik değeri (10sn iddiası) bu ortamdan DOĞRULANAMADI (iOS
sürümüne/watchdog türüne göre değişebilir). **Ölçülen ~3.3sn (desktop)
+ muhtemel mobil YAVAŞLAMA + DAHA UZUN bir dosya (5dk'dan fazla) BİR
ARAYA gelirse, bu risk kategorisine YAKLAŞILABİLİR** — KESİN bir
"evet kesin ölür" iddiası YAPILAMAZ ama "hayır risk yok" de
DENEMEZ, gerçek cihazda BÜYÜK bir dosyayla (ör. 10+ dakika, worker
BAŞARISIZ senaryosu ZORLANARAK) test edilmesi ÖNERİLİR.

**Kullanıcı donmayı görüyor mu, uyarı var mı — 🟡 KISMİ, YANILTICI
OLABİLİR:** Analiz başlarken 1400ms'lik SABİT bir CSS "ilerleme çubuğu"
animasyonu başlatılıyor (`els.toolsAnalyzeBar`, `transition: width
1400ms linear`) — **worker YOLUNDA** bu ZARARSIZ (UI thread serbest,
animasyon GERÇEK sürede akar, worker daha uzun sürerse çubuk
100%'de BEKLER, kabul edilebilir). **FALLBACK (ana thread) YOLUNDA**
ise JS senkron çalıştığı için TARAYICI CSS animasyonunu bile
BOYAYAMAZ — çubuk, JS bloke olduğu ANDAKİ konumunda DONUK KALIR
(1400ms'nin neresindeyse) — bu aslında DÜRÜST bir sinyal (gerçekten
donmuş görünüyor, YALANCI bir "tamamlandı" GÖSTERMİYOR) ama AYRI bir
"analiz uzun sürüyor, lütfen bekleyin" mesajı/spinner YOK — birkaç
saniyeden uzun sürerse kullanıcı uygulamanın ÇÖKTÜĞÜNÜ
düşünebilir.

---

# ÖNCELİK LİSTELERİ

## Yayın öncesi düzeltilecekler
1. **🔴 `computeReferenceEqGainsDb`/`lufsMatchGainDb`'nin sınırsız
   kazancı + Tonal Balance'ın A/B zincirinin limiter'sız oluşu**
   (Bölüm E) — clipping/aşırı-yüksek-ses riski, mühendislik
   müdahalesi (clamp + belki paylaşılan bir güvenlik limiteri)
   gerektirir.
2. **🟡 Ölçüm Sonuçları panelinin metodoloji "i" metni EKSİK**
   (Bölüm C) — Tonal Balance'ın G226'da aldığı AYNI muamele
   (LUFS/gating/true-peak/LRA tanımlarının kısa bir özeti + "RX 11
   ile küçük farklar olabilir, bu hata değil" notu) buraya da
   uygulanmalı — göreceli DÜŞÜK maliyetli, YÜKSEK itibar-koruma
   getirisi.

## Bluetooth filtresi için gereken iş listesi
1. `TOOLS_FILTERS` dizisine (ya da mevcut "Telefon Hoparlörü"
   girdisinin YERİNE) yeni bir kayıt — `eq`/`stereo`/`name`/`range`/
   `icon`/`kind` alanları (öneri Bölüm A'nın sonunda, KESİN DEĞİL,
   kulakla kalibre edilmeli).
2. `TOOLS_FILTER_ILLUST_PATHS`'e yeni `kind` için bir SVG path
   (eklenmezse ÇÖKMEZ ama illüstrasyon alanı boş kalır).
3. **Persistans/test/metin migrasyonu GEREKMİYOR** — aktif seçim hiç
   kaydedilmiyor, testler isimlere bağlı değil, "i" metni isim
   ANMIYOR (hepsi bu turda DOĞRULANDI).
4. Yeni filtrenin GERÇEK cihaz karakteriyle (elde bir BT hoparlör
   varsa) kulakla karşılaştırılması — mevcut 5 filtre de aynı şekilde
   "kulakla doğrulanmadı" durumda, yeni eklenen de AYNI standarda
   tabi olmalı.

## 1.1'e bırakılabilirler
- Referans Filtreleri özelliğinin test kapsamının SIFIR olması
  (Bölüm A) — kırılma riski düşük (mimari izole) ama regresyon
  koruması yok, ayrı bir iş.
- Referans Filtreleri/Mixini Yükle ile Tonal Balance A/B arasındaki
  ÇAPRAZ karşılıklı-dışlamanın eksikliği (Bölüm E/G) — çökme riski
  yok, sadece UX karışıklığı, düşük öncelik.
- SOURCE_PAIRS region değerlerinin yeni kaynak kütüphanesiyle
  yeniden gözden geçirilmesi (Bölüm B) — kütüphane geldiğinde ele
  alınabilir, bu turda kod hazır/geçersiz DEĞİL.
- 5/10 limitlerinde "en eski sessizce silindi" bildiriminin
  eklenmesi (Bölüm D/H) — veri kaybı değil, kozmetik bir UX notu.
- Analiz fallback'inde "uzun sürüyor" ayrı bir mesaj/spinner
  eklenmesi (Bölüm I) — worker YOLU zaten sorunsuz, SADECE nadir
  fallback senaryosu için.

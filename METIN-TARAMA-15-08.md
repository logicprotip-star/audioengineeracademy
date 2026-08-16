# METIN-TARAMA-15-08 — Türkçe Metin Kalitesi Taraması

_Kapsam: SADECE ÖLÇÜM, kod/dosya/commit YOK. Yedi kategori (a-g) —
`TERIM-KURALI.md` referans alındı, her terim kontrolü o listeyle
karşılaştırılarak yapıldı, tahmin edilmedi._

**Kapsam derinliği (dürüstçe işaretlendi — bölüm çok, tam kapsam bu
turun süresini aşardı):**
- **DERİN (satır satır okundu):** `core/guide-texts.js` (346 satır,
  TAMAMI — GENERAL_GUIDE, TOOLS_TONAL_GUIDE, TOOLS_RESULTS_GUIDE,
  MODE_GUIDE_TEXTS, MODE_OPTIONS_TEXTS, SPOTLIGHT_STEPS), `core/
  paywall.js`'in PRO_BENEFITS/PAYWALL_REASONS'ı (TAMAMI), `app.js`'in
  FAQ dizisi (TAMAMI, 5 madde), `modes/tonal-denge.js`'in feedback/
  teaching metni fonksiyonları (TAMAMI).
- **ORTA (hedefli grep + bulunan satırların context'i okundu):**
  `app.js`'in `toast(` çağrıları (~40 örnek TARANDI, TAMAMININ değil
  BÜYÜK BİR KISMININ metni okundu), `index.html`'in 40 kadarlık uzun
  statik metin bloğu (paragraf/alt-başlık/uyarı metinleri).
  `reverb.js`'in `mixMeaning`/`word`/`detail` alanları.
- **YÜZEYSEL/TARANMADI (BELİRSİZ bırakıldı, kapsam dışı):** Diğer 11
  mod dosyasının (tonal-denge HARİÇ) `getFeedbackData`/`teachingText`
  fonksiyonlarının TAMAMI satır satır OKUNMADI (SADECE genel desen
  `grep` ile örneklendi) — bu, EN BÜYÜK kalan boşluk, AYRI bir tur
  gerektirebilir. `app.js`'in kalan ~12.500 satırı (13.000+ satırlık
  dosyanın SADECE `toast(`/uzun string literal'leri hedefli
  aranmıştı) TAMAMEN OKUNMADI.

---

## a) ANLAM KAYMASI

**Bu turda GERÇEK bir anlam kayması BULUNAMADI** (okunan kapsamda) —
TERIM-KURALI.md'nin kendi "geri bildirim metinleri" önerisiyle
KARŞILAŞTIRILDIĞINDA (Kompresör/EQ örnek cümleleri), uygulamanın
MEVCUT metinleri daha KISA ama YANLIŞ bir şey SÖYLEMİYOR — sadece
DAHA AZ DETAYLI (bu bir "hata" değil, bir KAPSAM/DERİNLİK farkı,
aşağıdaki "1.1'e bırakılabilirler" listesine taşındı).

## b) DEVRİK CÜMLE

**Bu turda net bir "çeviri kokan"/devrik yapı BULUNAMADI** (okunan
kapsamda) — cümleler genelde KISA, yüklem SONDA, doğal Türkçe söz
dizimi izliyor (ör. "Doğru bildikçe seviyen yükselir, sorular
incelir." — `guide-texts.js:25`). **Tek incelemeye değer nokta**
(kesin "hata" DEĞİL, BELİRSİZ): `tonal-denge.js:506`'daki bant-satırı
kalıbı (`"${label} ${residualDb}dB ${verb} — mix hâlâ ${mixWord}."`,
ör. render sonucu "BAS'ı +2.3dB fazla bıraktın — mix hâlâ ağır/kalın.")
— ANCAK bu turda `tonal-denge.js:466`'daki kod yorumu OKUNARAK
DOĞRULANDI: bu kalıp *"task'ın örnek formatıyla BİREBİR"* — yani
Logic'in KENDİ daha önce belirlediği bir format, RASTGELE/hatalı bir
yazım DEĞİL. **Bu turda BULGU OLARAK LİSTELENMEDİ** (yanlış-pozitif
önlendi, kaynağı kontrol edildi).

## c) ABSÜRD/YANLIŞ TERİM KARŞILIĞI — TERIM-KURALI.md karşılaştırması

**Genel olarak KURALA UYGUN** — okunan kapsamda (guide-texts.js/
paywall.js/FAQ/toast örnekleri) İngilizce kalması gereken terimler
(EQ, boost, cut, dB, dBFS, LUFS, gain staging, mono, stereo, Pro,
XP, upload/yükle karışımı YOK, A/B) TUTARLI şekilde İngilizce
bırakılmış, çevresindeki açıklama Türkçe.

**🟡 Tek somut TUTARSIZLIK bulundu — "balans" vs "denge":**
`core/guide-texts.js:165` (db-seviyesi'nin "ne öğretir" metni):
> *"...seviye farkını duymak **gain staging ve balans** için
> şarttır."*

**Sorun:** TERIM-KURALI.md'nin listesinde "balans" AÇIKÇA yok
(ne İngilizce-kalır ne Türkçe-kalır listesinde) ama uygulamanın
KENDİSİ AYNI kavram için BAŞKA YERDE (mod adının KENDİSİ:
"Tonal Denge", `tonal-denge.js`'in TÜM guide/feedback metinleri)
TUTARLI olarak **"denge"** kullanıyor. "Balans" İngilizce "balance"nin
yarı-Türkçeleşmiş bir hâli — ne tam İngilizce (kalın harfle/orijinal
yazım DEĞİL) ne saf Türkçe ("denge" zaten VAR ve kullanılıyor).

**Önerilen düzeltme (Logic karar versin):** `"...seviye farkını
duymak gain staging ve **denge** için şarttır."` — mod adıyla
(Tonal Denge) VE app'in geri kalanıyla TUTARLI hale gelir.

**🟢 Diğer terimler — kontrol edildi, sorun YOK:** "mekan"/"reverb"/
"headroom" gibi terimlerin KENDİLERİ (yazım tutarlılığı AYRI,
bkz. (f)) doğru kategoride (reverb İngilizce kalıyor, mekan/mekân
Türkçe — TERIM-KURALI.md'nin listesinde YOK ama genel "kavramın
kendisi Türkçe kalır" ilkesine UYUYOR).

## d) HİTAP TUTARLILIĞI

**🟢 SORUN YOK — TAM taramada SIFIR "siz" (resmi) formu bulundu:**
`app.js`/`core/*.js`/`modes/*.js` genelinde "siz"/"sizin"/"-iniz"
(resmi emir kipi) ARANDI, **hiçbir eşleşme çıkmadı** — uygulama
BAŞTAN SONA "sen" (samimi) hitabı kullanıyor, tutarlı.

## e) ÜSLUP TUTARLILIĞI

**🟢 Genel olarak TUTARLI** — okunan kapsamda TÜM metinler AYNI
register'da: kısa, direktif, teknik ama SADE, ne aşırı resmi ne
aşırı gündelik. Logic'in YouTube üslubuyla (TERIM-KURALI.md'nin
kendi örnekleri — "gain staging'in temelidir", "Çok hızlı attack
transient'i ezer") TUTARLI bir kayıt (terim+açıklama karışımı,
kısa cümleler).

**🟡 Tek istisna bulundu — kod-yorumu üslubu KULLANICI metnine
sızmış:** `core/guide-texts.js:172` (stereo-genislik'in "ne
öğretir" metni):
> *"...Bu, Araçlar'daki mono uyum ölçümüyle **AYNI** konuyu
> kulakla öğretir."*

**Sorun:** "AYNI" büyük harfle — bu, KOD YORUMLARINDA (bu projenin
TÜMÜNDE, binlerce kez) kullanılan bir VURGU kalıbı (ör. "TAM olarak",
"KESİN değil", "HER ZAMAN") — ama BURADA bir KULLANICI metninin
İÇİNDE, geliştiricinin kendi iç-notu sesi kullanıcıya SIZMIŞ. Normal
bir kullanıcı bunu "neden bu kelime bağırıyor" diye garip bulabilir.
**Taramada BAŞKA bir örneği BULUNAMADI** (aynı desen `guide-texts.js`/
`app.js`/mod dosyalarında AYRICA arandı, sıfır ek eşleşme) — İZOLE
bir örnek, sistemik bir alışkanlık DEĞİL.

**Önerilen düzeltme:** `"...Bu, Araçlar'daki mono uyum ölçümüyle aynı
konuyu kulakla öğretir."` (küçük harfe çevir).

## f) YAZIM VE NOKTALAMA

**🟡 Tek somut TUTARSIZLIK bulundu — "mekan" vs "mekân":**
Modern Türkçe yazımda (TDK) doğru biçim düzeltme işaretli **"mekân"**
— uygulamada İKİ FARKLI YAZIM AYNI ANDA kullanılıyor:

| Konum | Yazım | Kullanıcıya görünür mü |
|---|---|---|
| `app.js:2657` (`DEFAULT_HP_TEXT`, kulaklık uyarısı) | **"mekân"** (doğru) | EVET |
| `reverb.js:79/87/95` (`mixMeaning`, cevap sonrası GERÇEKTEN render ediliyor — `reverb.js:438`'te DOĞRULANDI) | **"mekan"** (düzeltme işaretsiz) | EVET |
| `core/guide-texts.js:167` (reverb modunun "ne öğretir" metni) | **"mekan"** | EVET |
| `reverb.js:417-420` (`word`/`detail`, miktar açıklaması) | **"mekan"** (4 kez) | EVET |

**Önerilen düzeltme:** Hepsini **"mekân"**a (düzeltme işaretli) çevir
— tutarlılık için TEK bir yazım seçilmeli, TÜM reverb metinleri AYNI
dosyanın/konseptin PARÇASI olduğu için özellikle görünür bir
tutarsızlık (aynı EKRANDA/aynı OTURUMDA kullanıcı hem "mekân" hem
"mekan" görebilir — kulaklık uyarısı + reverb geri bildirimi AYNI
oturumda karşısına çıkabilir).

**Diğer yazım/noktalama — bu turda BAŞKA bir somut hata
BULUNAMADI** (okunan kapsamda) — noktalama TUTARLI (em-dash "—"
KOD GENELİNDE tutarlı bir ayraç olarak kullanılıyor, tırnak
işaretleri tutarlı tek-tırnak `'...'` kullanıyor İngilizce terim/
buton adlarını sarmalamak için).

## g) YAPAY ZEKA İZİ

**🟢 GÜÇLÜ SONUÇ — klasik AI-slop kelimeleri SIFIR bulundu:**
`"harika"`/`"mükemmel"`/`"muhteşem"`/`"kesinlikle"`/`"inanılmaz"`
TÜM kaynak kodda arandı (`grep`) — **kullanıcı metninde TEK bir
eşleşme YOK** (tek eşleşme bir KOD YORUMUNDA, orijinal görev
talimatını alıntılıyor, kullanıcıya HİÇ görünmüyor).

**🟢 Ünlem işareti — SEYREK ve BAĞLAMSAL, aşırı DEĞİL:** Toplam
kullanım dosya başına 1-3 (ör. "Doğru!", "🎯 Tam isabet!", "Sınav
hakkı kazandın!") — HEPSİ kısa, oyun-geri-bildirimi anındaki
CELEBRATORY momentlerde (Duolingo tarzı "Correct!" kalıbıyla
TUTARLI bir JANR kararı), uzun açıklama metinlerinde ÜNLEM YOK —
"her cümle aynı ritimde" sorunu BULUNAMADI (açıklama metinleri
SAKİN/teknik, kutlama metinleri KISA/enerjik — İKİ FARKLI, BİLİNÇLİ
register).

**🟢 Emoji kullanımı — SEYREK ve AMAÇLI:** `toast()` çağrılarının
KÜÇÜK bir kısmında (~7/40 örneklenen) emoji var, HEPSİ ANLAMLI bir
ANDA (satın alma başarılı 🎉, reklam izlendi 🎬, günlük görev 📅,
geliştirici modu 🛠️) — HER cümlede/mesajda DEĞİL, gelişigüzel
serpiştirilmiş DEĞİL.

**🟢 Jenerik/kalıp ifadeler — BULUNAMADI:** Metinler somut/spesifik
(ör. "12 modun 5'i ücretsiz", "üst üste 6 doğru → sınav hakkı") —
"harika bir deneyim", "kolayca öğren" tarzı BOŞ/jenerik pazarlama
dili YOK.

**Sonuç: Bu uygulamanın metinleri YAPAY ZEKA-YAZIMI izlenimi
VERMİYOR** — tutarlı, terse, teknik bir insan sesi. (BELİRSİZ notu:
bu SADECE okunan kapsam için geçerli, TARANMAYAN ~11 mod dosyasının
feedback metinlerinde AYNI kalite garanti EDİLEMEZ — bkz. kapsam
notu.)

---

# ÖZET TABLO — TÜM BULGULAR

| # | Dosya:Satır | Mevcut metin | Sorun | Kategori | Önerilen düzeltme |
|---|---|---|---|---|---|
| 1 | `guide-texts.js:165` | "...gain staging ve **balans** için şarttır." | "balans" ne TERIM-KURALI listesinde ne app'in KENDİ "denge" kullanımıyla tutarlı | (c) | "...gain staging ve **denge** için şarttır." |
| 2 | `guide-texts.js:172` | "...**AYNI** konuyu kulakla öğretir." | Kod-yorumu vurgu üslubu (büyük harf) kullanıcı metnine sızmış, İZOLE | (e)/(g) | "...aynı konuyu kulakla öğretir." |
| 3 | `app.js:2657` vs `reverb.js:79/87/95/167/417-420` | "mekân" (app.js) vs "mekan" (reverb.js ×6 + guide-texts.js) | Aynı kelime iki farklı yazımda, HER İKİSİ de kullanıcıya görünüyor | (f) | Hepsini "mekân"a çevir (tutarlılık) |

**Toplam: 3 somut bulgu** (2× 🟡 üslup/terim, 1× 🟡 yazım
tutarlılığı) — **HİÇBİRİ 🔴 CİDDİ değil**, hiçbiri anlamı
BOZMUYOR/YANLIŞ bilgi VERMİYOR, üçü de KÜÇÜK/hızlı düzeltmeler.
Ayrıca 1 aday (tonal-denge'nin bant-cümlesi) İNCELENDİ ve Logic'in
KENDİ ÖNCEKİ kararıyla eşleştiği için bulgu listesine ALINMADI
(yanlış-pozitif önlendi).

---

# SONUÇ LİSTELERİ

**Düzeltme UYGULANMADI — bu tur SADECE liste, task'ın kendi kuralı.**

## Öncelikli (küçük, hızlı, düşük riskli)
1. `guide-texts.js:165` — "balans" → "denge".
2. `guide-texts.js:172` — "AYNI" → "aynı".
3. `reverb.js` (4 satır) + `guide-texts.js:167` — "mekan" → "mekân"
   (6 yerde, tutarlılık için hepsi birden).

## 1.1'e bırakılabilirler / daha büyük iş
- Diğer 11 mod dosyasının feedback/teaching metinlerinin BU turdaki
  gibi SATIR SATIR taranması — bu turda SADECE tonal-denge.js DERİN
  incelendi, kalanı YÜZEYSEL/örneklendi. TERIM-KURALI.md'nin önerdiği
  "Kompresör modunun geri bildirimi senaryo seviyesinde
  ZENGİNLEŞTİRİLEBİLİR" fikri de bu kapsamda değerlendirilebilir —
  ama bu bir "hata düzeltme" değil, bir İÇERİK GENİŞLETME kararı
  (Logic'in ürün kararı, bu tur sadece MEVCUT metnin doğruluğunu
  ölçtü, "daha iyi olabilir mi" ayrı bir soru).
- `app.js`'in ~12.500 satırlık taranmamış kısmının (SADECE `toast(`
  hedefli arandı) daha kapsamlı bir geçişi — özellikle hata
  mesajlarının TAMAMI.
- Reverb'ün "hava" bandı isimlendirmesi (TERIM-KURALI.md'nin kendi
  önerisi: bant adı → `air`, açıklama metninde "hava" kalabilir) —
  bu turda `frekans-bulma.js:FA_ZONES`'un TİZ bandının "hava" ile
  ilişkisi AYRICA doğrulanmadı, BELİRSİZ bırakıldı (TERIM-KURALI.md'nin
  KENDİ notu zaten "bant adı" sorununu ayrı bir konu olarak işaretlemiş).

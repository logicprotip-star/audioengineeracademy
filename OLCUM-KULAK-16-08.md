# OLCUM-KULAK-16-08 — Kulak Butonları Ölçümü

_Kapsam: SADECE ÖLÇÜM. Kod YAZILMADI, commit atılmadı. `app.js`'in
ilgili bölümleri (G81 bloğu, `submitFrequencyGuess`, `submitCakismaGuess`,
`isChoiceFormat`), `index.html`'in `#feedbackBox` markup'ı, 12 mod
dosyasının `getMeta()`/`createQuestion()` fonksiyonları TAM okundu.
`git log -S` ile TÜM repo geçmişi (sadece G214-G252 değil) tarandı.
GORSEL-TEST.md/TAM-LISTE-14-08.md'nin ilgili maddeleri okundu._

---

## A) MEVCUT DURUM

**Kulak butonları kodda nerede tanımlı:**
- **DOM (TEK, PAYLAŞILAN yer):** `www/index.html:601-602` —
  `#fbEarLeft`/`#fbEarRight`, `#feedbackBox` (TÜM 12 modun ortak,
  paylaşılan geri-bildirim panelinin) SABİT çocukları, `class="... hidden"`
  ile VARSAYILAN gizli:
  ```html
  <button type="button" class="fb-ear fb-ear-left hidden" id="fbEarLeft"></button>
  <button type="button" class="fb-ear fb-ear-right hidden" id="fbEarRight">Doğru cevap</button>
  ```
- **JS (gösterme mantığı):** `www/js/app.js:2007-2018`, `showFrequencyEars(ok, guessHz)`
  — `hidden` sınıfını KALDIRIR, sol omuzun metnini/`data-preview`sini
  ayarlar.
- **CSS:** `www/styles.css:1549-1556`, `.fb-ear`/`.fb-ear-left`/
  `.fb-ear-right`/`.fb-ear.on`.

**Tam olarak ne yapıyorlar — hangi sesi çalıyorlar:** Sol omuz
"Senin cevabın" (`data-preview="mine"`, `data-guess-hz`), sağ omuz HER
ZAMAN "Doğru cevap" (`data-preview="correct"`). Tıklama, `#feedbackBox`'ın
click delegasyonunda (`app.js:6611-6665` civarı, `.fb-ear` class'ına göre)
yakalanıp `q.freq`'e (doğru) ya da `guessHz`'e (senin) göre KISA bir ton
YENİDEN sentezleyip çalıyor — Frekans Bulma'nın `applyProcessing`
zincirinin AYNI mantığıyla (`#freqInfo`'nun eski `.cmp` önizlemesiyle
BİREBİR aynı, kod yorumu `app.js:1998-2000`).

**Hangi modlarda VAR, hangilerinde YOK — TAM liste, doğrulandı:**
`showFrequencyEars()`'in ÇAĞRILDIĞI TEK iki yer `app.js:4065` ve
`app.js:4083`, İKİSİ de `submitFrequencyGuess()` fonksiyonu İÇİNDE
(`app.js:4017`) — bu fonksiyon, kodun kendi adının da gösterdiği gibi
SADECE **Frekans Bulma**'nın (`frekans-bulma.js`, `MODE_ID="frekans-bulma"`)
kendi gönderim yolu. `git log --all -p -S "showFrequencyEars"` TÜM
repo geçmişinde SADECE 1 commit (G81'in kendisi, `9a075bd`) döndürdü —
bu fonksiyon YAZILDIĞI günden BERİ başka HİÇBİR moda EKLENMEDİ/
ÇIKARILMADI.

| Mod | Kulak butonu VAR MI |
|---|---|
| Frekans Bulma (tek-bant) | **VAR** |
| Frekans Bulma (proplus, 4-bant) | **YOK** (kod yorumu AÇIKÇA hariç tutuyor, `app.js:2001-2002`) |
| Kesim Noktası | YOK |
| dB Seviyesi | YOK |
| Boost mu Cut mu | YOK |
| Q Genişliği | YOK |
| Pan Konumu | YOK |
| Stereo Genişlik | YOK |
| Kompresör | YOK |
| Reverb | YOK |
| Saturation & Distortion | YOK |
| Tonal Denge | YOK |
| **Frekans Çakışması** | **YOK** |

**Görünürlük koşulu ne:** SADECE `activeQuestion.mode === "frequency"`
(Frekans Bulma'nın tek-bant sorusu) YOLUYLA çağrılan bir fonksiyona
bağlı — Pro/ücretsiz, zorluk, aşama gibi BAŞKA hiçbir koşul YOK
(`showFrequencyEars()`'in kendi gövdesinde `devFlags`/`isUserPro`/
`difficulty` okuyan TEK SATIR yok, `grep` ile doğrulandı).

---

## B) FREKANS ÇAKIŞMASI'NDA NE OLDU

**Bu modda tanımlı mı — HAYIR, hiçbir zaman tanımlı OLMAMIŞ:**
Frekans Çakışması'nın KENDİ gönderim fonksiyonu `submitCakismaGuess()`
(`app.js:4811-4871`, TAM okundu) `showFrequencyEars()`'i **TEK SATIR
ÇAĞIRMIYOR** — sadece paylaşılan `setFeedback()`i (başlık/açıklama
metni) çağırıyor, omuz butonları HİÇ dokunulmadığı için `hidden`
sınıfıyla KALIR.

**Yapısal sebep — İKİ AYRI gönderim yolu, hiç kesişmiyor:**
Frekans Çakışması'nın soruları `isChoiceFormat()`'te (`app.js:1371`)
AÇIKÇA listeleniyor (`activeQuestion.mode === "cakisma"`) — yani
CEVAP HER ZAMAN şıklı buton (`#answers`), asla dalgaya dokunma
(`els.canvas.pointerdown`). Şıklı butonların click handler'ı
(`app.js:5983-6076`) `mode === "cakisma"` için `submitCakismaGuess()`'e
yönlendiriyor (`app.js:6047-6053`) — `submitFrequencyGuess()`'e (ear
butonlarının TEK çağrıldığı yer) **HİÇBİR koşulda gitmiyor.** İki
fonksiyon birbirinden TAMAMEN BAĞIMSIZ, aralarında paylaşılan bir
kod yolu YOK.

**"Kaybolmuş" önermesi — kod/git kanıtına göre YANLIŞ, hiç
VAR OLMAMIŞ:** Kullanıcının "kulak butonları kaybolmuş (cihazda
görülmedi)" gözlemi DOĞRU (cihazda YOK) — ama sebep bir REGRESYON
DEĞİL, mimarinin İLK GÜNDEN beri Frekans Çakışması'nı bu özelliğe
HİÇ BAĞLAMAMIŞ olması.

**Modun kendi aşamaları (stage 1/2/3) — bu SORU ANLAMSIZ, çünkü
BUTONLAR HİÇBİR aşamada YOK:** Aşama ayrımı yapan bir kod dalı bile
YOK (çünkü `showFrequencyEars` hiç çağrılmıyor) — yani "hepsinde mi,
bazılarında mı" sorusunun cevabı "hiçbirinde" (bugünkü kod için).

**Bugünkü commit'lerden biri buna dokundu mu — HAYIR, G214-G252 TAM
tarandı, doğrulandı:** `git log --oneline d12e6be~1..50eb79a -S
"submitCakismaGuess"` → **SIFIR sonuç.** `git log ... -S "fbEar"`/
`-S "kulak"` → eşleşen commit'ler (`G252`/`G251`/`G248`/`G244`/`G242`/
DEVIR) incelendi, HEPSİ "kulaklık" (headphones) kelimesinin alt-dizesi
YANLIŞ POZİTİF, `fbEar`/kulak-BUTONU ile İLGİSİZ. `frekans-cakismasi.js`'e
dokunan İKİ commit bulundu — İKİSİ de ear-butonuyla İLGİSİZ:
- **G249** (dB gösterim formatı 2-ondalık standardına hizalama, metin)
- **G240** (Aşama 3'ün korumasız `while` döngüsüne sonsuz-döngü koruması
  eklendi, GERÇEK bir güvenlik düzeltmesi — ear butonuyla İLGİSİZ)

**Playwright ile tekrar üretilebiliyor mu — EVET, TRİVİYAL biçimde,
kod-okumasıyla ZATEN KANITLANDI, canlı test bu turda ÇALIŞTIRILMADI
(gerek yoktu — statik kod akışı %100 belirleyici, `submitCakismaGuess`'in
`showFrequencyEars` çağırmadığı YAPISAL bir gerçek, rastgelelik/zamanlama
İÇERMİYOR):** Frekans Çakışması'nda HERHANGİ bir soruyu (aşama
fark etmeksizin) cevaplamak `#fbEarLeft`/`#fbEarRight`'i HİÇBİR ZAMAN
`hidden` sınıfından çıkarmaz — %100 tekrarlanabilir, KOŞULA bağlı
DEĞİL.

---

## C) G81 KARARININ GEREKÇESİ

**GORSEL-TEST #8'in TAM metni** (`GORSEL-TEST.md:189`):
> "✅ **HATA DEĞİL — KAPANDI.** `#fbEarLeft`/`#fbEarRight` ortak
> markup'ta var, kasıtlı olarak sadece Frekans Bulma'da gösteriliyor
> (G81, Logic'in kendi isteği). Sebep: kulak simgesi iki FREKANSI yan
> yana gösteriyor — diğer modlarda gösterecek iki frekans yok
> (kompresörde ratio, pan'da konum, reverb'de decay var)"

**Bu gerekçe kodda doğrulanıyor mu — KISMEN, ve ÖNEMLİ bir istisnayla:**
Kompresör (ratio/threshold), Pan Konumu (panPercent), Reverb (decay/
tip) İÇİN doğru — `createQuestion()` çıktıları TAM okundu (bkz. bölüm
D), bu üç mod GERÇEKTEN "iki frekans" TAŞIMIYOR. **AMA gerekçe kendi
İÇİNDE Frekans Çakışması'nı hiç ADLANDIRMAMIŞ — ve Frekans
Çakışması'nın Aşama 1'i TAM OLARAK "iki frekans" formatında:**
`frekans-cakismasi.js`'in `createQuestion()`'ı (TAM okundu) `trueCenter`
adında GERÇEK bir merkez FREKANS üretiyor (`pickCenterFreq()`), Aşama
1'in şıkları da (`generateStage1Choices`) frekans DEĞERLERİ taşıyor —
**bu, Frekans Bulma'nın "sorulan frekans" / "tahmin edilen frekans"
ikilisiyle YAPISAL OLARAK BİREBİR AYNI şekil** (ikisi de: gizli bir
gerçek frekans + kullanıcının seçtiği bir frekans). **G81'in KENDİ
gerekçesi tutarlı biçimde uygulansaydı, Aşama 1 İÇİN "iki frekans yok"
iddiası GEÇERLİ OLMAZDI.**

**Karar hangi modlar için verilmiş, hangileri hiç
değerlendirilmemiş:** GORSEL-TEST #8 SADECE 3 modu İSİMLENDİRİYOR
(kompresör/pan/reverb) — 8 modun geri kalanı (Kesim Noktası, dB
Seviyesi, Boost/Cut, Q Genişliği, Stereo Genişlik, Saturation &
Distortion, Tonal Denge, **Frekans Çakışması**) TEK TEK ADLANDIRILIP
DEĞERLENDİRİLMEMİŞ — sadece "diğer modlarda ... yok" diye TOPLU bir
ifadeyle geçiştirilmiş. **Frekans Çakışması bu TOPLU ifadenin İÇİNE
mi girdi yoksa HİÇ mi düşünülmedi — kod/belgeden AYIRT EDİLEMİYOR,
ama Aşama 1'in kendi yapısı (yukarıda gösterildi) "toplu ifadeye
sessizce dahil edilmiş olması" ihtimalini GÜÇLENDİRİYOR (çünkü doğru
değerlendirilseydi ayrı bir istisna olarak anılması BEKLENİRDİ, kompresör/
pan/reverb gibi).**

---

## D) HANGİ MODLARDA OLMALI — ÖĞRETİM AÇISINDAN ⚠️ ASIL SORU

_Her mod için: referans-dinletilebilir bir şey var mı, kulak butonu
ANLAMLI olur mu. `createQuestion()`/`getMeta()` TAM okunarak
değerlendirildi. **Bu ürün kararı — aşağıdakiler ÖNERİ, karar
kullanıcıya ait.**_

**1. Frekans Bulma (tek-bant) — ZATEN VAR, referans: kalmalı.**
İki gerçek frekans (sorulan/tahmin edilen) — GORSEL-TEST #8'in kendi
örneği, kod zaten bunu uyguluyor.

**2. Frekans Bulma (proplus, 4-bant) — OLUR, ama FARKLI ŞEKİLDE.**
`q.guesses` 4 AYRI tahmin taşıyor (tek bir "senin cevabın" YOK) —
basit iki-buton deseni DOĞRUDAN uygulanamaz, ama HER bandın kendi
tahmin/doğru çifti için 4 AYRI mini-karşılaştırma (ya da "en çok
kaçırdığın bant" tek bir karşılaştırma) TASARLANABİLİR. Kod-yorumu
zaten bunu BİLİNÇLİ olarak hariç tutmuş (`app.js:2001-2002`) —
karmaşıklığı nedeniyle MAKUL bir erteleme, ama "asla olmaz" değil.

**3. Kesim Noktası — OLUR, GORSEL-TEST'in İSİMLENDİRMEDİĞİ ama
Frekans Bulma'yla AYNI şekle sahip bir mod.** `createQuestion()`
(`kesim-noktasi.js`) gizli bir `freq` (gerçek kesim noktası) üretiyor,
kullanıcı ŞIKLI bir frekans seçiyor (`data-freq`, `app.js:6011-6015`).
**"Senin seçtiğin kesim frekansı" vs "gerçek kesim frekansı" —
Frekans Bulma'yla YAPISAL OLARAK AYNI** (ikisi de gizli frekans +
seçilen frekans), TEK fark cevap biçimi (şıklı vs dokunmalı) — bu
FARK kulak butonunun ANLAMINI DEĞİŞTİRMEZ, SADECE tetikleme yerini
(`submitCutoffGuess`'e ekleme) değiştirir.

**4. dB Seviyesi — OLUR, aynı gerekçeyle.** `dbDelta` gizli bir GERÇEK
sayı, kullanıcı şıklı bir dB değeri seçiyor (`data-db`). "Senin
seçtiğin dB" vs "gerçek dB" — iki SAYISAL kazanç değeri, doğrudan
karşılaştırılabilir referans-dinletme (biri işlenmiş sinyali +X dB,
diğeri +Y dB ile çalar).

**5. Boost mu Cut mu — KISMEN OLUR, KATMANA göre değişir.**
Katman 1 (`layer===1`): sadece YÖN (boost/cut, `direction`) — SAYISAL
bir "iki değer" YOK, kulak butonu burada ANLAMSIZ (yön zaten şıkta
yazıyor, dinletilecek İKİNCİ bir sayı yok). Katman 2 (`layer===2`):
SADECE gain (`gainDb`) — OLUR, dB Seviyesi'yle aynı mantık. Katman 3
(`layer===3`): HEM freq HEM gain — OLUR, Kesim Noktası + dB Seviyesi'nin
BİLEŞİMİ (iki parametre birden farklı olabileceği için "senin/doğru"
karşılaştırması biraz daha karmaşık ama YİNE DE anlamlı: iki TAM EQ
ayarı karşılaştırılıyor).

**6. Q Genişliği — KISMEN OLUR.** `correctIndex`/kullanıcının seçtiği
ETİKET (`labelId`) SAYISAL bir Q değeri DEĞİL, ETİKET (ör. "Dar/Orta/
Geniş") — kod yorumu bunu AÇIKÇA belirtiyor (*"sayısal Q değeri
şıklarda BİLEREK yok"*, `q-genisligi.js`). Referans-dinletme YİNE DE
MÜMKÜN (her etiketin ARKASINDA gerçek bir Q sayısı var, `pickTrueQ`),
ama kullanıcıya SAYI hiç GÖSTERİLMEDİĞİ için "senin Q'n" diye bir
metin YAZILAMAZ — SADECE "senin seçtiğin genişlik" / "doğru genişlik"
diye ETİKET bazlı bir karşılaştırma OLABİLİR, Frekans Bulma'nın
doğrudan sayısal modelinden FARKLI bir sunum gerektirir.

**7. Pan Konumu — OLUR, GORSEL-TEST'in KENDİ örneği DIŞINDA
BİR MOD (GORSEL-TEST #8 "pan'da konum" diyor, referans-dinletmeyi
İMA EDİYOR ama "iki frekans yok" dediği için kulak butonunu
DIŞLIYOR).** `panPercent` gizli bir gerçek DEĞER, kullanıcı şıklı bir
pan yüzdesi seçiyor (`data-value`) — "senin pan'ın" vs "doğru pan"
SES OLARAK doğrudan karşılaştırılabilir (aynı kaynağı iki farklı pan
konumunda çalmak TEKNİK OLARAK dB Seviyesi'nden FARKSIZ). **G81'in
"iki frekans yok" gerekçesi burada da YANILTICI** — frekans olmasa
bile karşılaştırılabilir SAYISAL bir çift (iki pan değeri) VAR, konsept
Frekans Bulma'dan farklı DEĞİL, sadece parametre türü farklı.

**8. Stereo Genişlik — OLUR, Pan Konumu'yla AYNI gerekçe.**
`widthPercent` — gizli gerçek değer + şıklı seçim, iki genişlik değeri
SES olarak karşılaştırılabilir.

**9. Kompresör — OLMAZ, GORSEL-TEST #8'in KENDİ doğru örneği.**
`variants` A/B/C üç TAM ayrı ses varyantı (`k`/`ratio`/`threshold`
farklı), kullanıcı "hangisi FARKLI" diye TEK bir HARF seçiyor — SAYISAL
bir "senin tahminin" YOK, sadece bir HARF. **Ama** A/B/C ZATEN
BAĞIMSIZ çalınabilir varyantlar (`playThreeWaySpecific`, mevcut UI'da
zaten play düğmeleri VAR) — kulak-butonu KAVRAMI burada GEREKSİZ,
çünkü KARŞILAŞTIRMA ARACI zaten kartların KENDİSİNDE MEVCUT (bkz.
bölüm E, bu GORSEL-TEST #12'nin "karşılaştırmalı dinletme" fikriyle
örtüşüyor, kulak butonuyla DEĞİL).

**10. Reverb — OLMAZ, Kompresör'le AYNI yapı (A/B/C varyant, harf
seçimi) — AYNI gerekçe.**

**11. Saturation & Distortion — OLMAZ, Kompresör/Reverb'le AYNI yapı
(A/B/C varyant, harf seçimi).**

**12. Tonal Denge — OLMAZ (basit iki-değer anlamında), ama BAŞKA bir
BENZER özellik ZATEN VAR.** `bands` ÇOK BOYUTLU bir düzeltme (birden
fazla bandın HER BİRİNİN kendi bozulma miktarı) — TEK bir "senin
değerin/doğru değerin" sayısı YOK, kullanıcı N kaydırıcıyı BİRLİKTE
ayarlıyor. Basit iki-buton modeli DOĞRUDAN uymuyor. **AMA** bu modun
"tam eğrini çal / hedef eğriyi çal" biçiminde bir karşılaştırma
KAVRAMSAL olarak Araçlar'daki Tonal Balance'ın "Referans eğrisiyle
dinle" (G154 civarı, DURUM.md'de belgeli) özelliğiyle NEREDEYSE AYNI
fikir — o ZATEN app'te var, farklı bir ekranda.

**13. Frekans Çakışması — Aşama 1 OLUR (yukarıda C'de detaylandırıldı,
Frekans Bulma/Kesim Noktası ile AYNI "gizli frekans + seçilen frekans"
şekli), Aşama 2 FARKLI TÜR bir karşılaştırma OLUR (kaynak A vs kaynak
B — SAYISAL değil ama İKİ AYRI, BAĞIMSIZ çalınabilir ses, zaten
`cakismaCompare`/"Önce"/"Sonra" butonları BENZER bir mekanizmayı
başka bir yerde TAŞIYOR, `index.html:575-578`), Aşama 3 OLUR (cutDb —
dB Seviyesi'yle AYNI sayısal yapı).

**ÖZET TABLO:**

| Mod | Kulak butonu (Frekans-Bulma tarzı) ANLAMLI mı |
|---|---|
| Frekans Bulma (tek-bant) | OLUR (zaten var) |
| Frekans Bulma (proplus) | KISMEN — 4 ayrı karşılaştırma gerekir |
| Kesim Noktası | **OLUR** |
| dB Seviyesi | **OLUR** |
| Boost/Cut katman 1 | OLMAZ (sayısal ikinci değer yok) |
| Boost/Cut katman 2-3 | **OLUR** |
| Q Genişliği | KISMEN — etiket bazlı, sayı gösterilemez |
| Pan Konumu | **OLUR** |
| Stereo Genişlik | **OLUR** |
| Kompresör | OLMAZ (A/B/C zaten kendi karşılaştırmasını taşıyor) |
| Reverb | OLMAZ (aynı) |
| Saturation & Distortion | OLMAZ (aynı) |
| Tonal Denge | OLMAZ (çok boyutlu, ayrı bir "referans eğri" fikri gerekir) |
| Frekans Çakışması Aşama 1 | **OLUR** |
| Frekans Çakışması Aşama 2 | OLUR (farklı biçimde — kaynak A/B) |
| Frekans Çakışması Aşama 3 | **OLUR** |

---

## E) BENZER ÖZELLİKLER

**GORSEL-TEST #12'nin TAM metni** (`GORSEL-TEST.md:239`):
> "**KARŞILAŞTIRMALI DİNLETME YOK** — yanlış cevapta kullanıcı kendi
> seçtiğini ve doğruyu arka arkaya DİNLEYEMİYOR. 12 modun HİÇBİRİNDE
> yok. ... ⏸️ **KARAR: 1.0 mı 1.1 mi**"

**⚠️ BELGE ÇELİŞKİSİ BULUNDU (CLAUDE.md'nin kendi kuralı gereği
raporlanıyor, sessizce geçilmedi):** #12 "12 modun HİÇBİRİNDE yok"
diyor, ama AYNI dosyanın #8 maddesi (satır 189) Frekans Bulma'da bu
ÖZELLİĞİN (kulak butonları = "senin cevabın"/"doğru cevap" arka arkaya
dinletme) G81'den BERİ VAR olduğunu "✅ KAPANDI" diye KAYDEDİYOR. #12'nin
durum etiketi HÂLÂ "⏸️ KARAR" (açık) — #8'in "✅ KAPANDI" (bu turda
BAĞIMSIZ olarak A/B/C bölümünde yeniden doğrulandı) ile TUTARSIZ.
**Muhtemel açıklama (kesin değil, BELİRSİZ):** #12 muhtemelen G81'den
ÖNCE ya da BAĞIMSIZ yazılmış, sonradan güncellenmemiş — ama bu bir
TAHMİN, dosyanın kendi tarih/sıra bilgisi bu turda doğrulanmadı.

**Kulak butonları ile #12'nin "karşılaştırmalı dinletme"si AYNI ŞEY
Mİ, FARKLI MI:** **AYNI KAVRAM, FARKLI KAPSAM.** İkisi de "yanlış
cevapta kullanıcının seçtiğini + doğruyu arka arkaya dinletme" fikrini
taşıyor — kulak butonları bunun Frekans Bulma'ya ÖZGÜ, ZATEN
UYGULANMIŞ hâli; #12 bunu 12 MODUN TAMAMINA GENELLEŞTİRME fikri.
**Teknik olarak kulak butonları #12'nin BİR ALT-KÜMESİ/prototipi** —
`showFrequencyEars()`'in KENDİSİ zaten "preview=mine/correct" ikili
deseni kuruyor, #12'nin istediği GENİŞ kapsamlı özelliğin İLK
uygulaması SAYILABİLİR.

**İkisi birleştirilebilir mi:** **EVET, KAVRAMSAL OLARAK EVET** — bu
raporun D) bölümü zaten TAM OLARAK bunu değerlendiriyor (hangi modlarda
"senin/doğru" karşılaştırması ANLAMLI). D)'deki "OLUR" işaretli 7 mod/
alt-aşama (Kesim Noktası, dB Seviyesi, Boost/Cut katman 2-3, Pan
Konumu, Stereo Genişlik, Frekans Çakışması Aşama 1/3) `showFrequencyEars()`
mantığının GENELLEŞTİRİLMİŞ bir versiyonuyla KARŞILANABİLİR — Kompresör/
Reverb/Distortion (A/B/C varyant) İSE zaten KENDİ karşılaştırma
aracını (variant play düğmeleri) TAŞIDIĞI için #12'nin AYRI bir
çözümüne muhtemelen İHTİYAÇ DUYMAZ, sadece "kendi seçtiğin harf" +
"doğru harf"i art arda ÇALDIRAN bir kısayol yeterli olur (YENİ bir
ses sentezi GEREKMEZ, zaten var olan variant ses buffer'ları
kullanılabilir). Tonal Denge AYRI bir yaklaşım (tam eğri karşılaştırması,
Tools'un mevcut "referans eğri" özelliğine benzer) gerektirir. **Bu,
#12'nin "12 modda ayrı ayrı çalışması gerekiyor" tespitiyle TUTARLI**
— TEK bir evrensel mekanizma YETMEZ, en az 3 FARKLI kalıp (sayısal-
çift/varyant-harf/çok-boyutlu-eğri) gerekir, bu raporun D) bölümü bu
3 kalıbı zaten AYRIŞTIRDI.

# OLCUM-I-GUNCEL-19-08

GÖREV: ÖLÇÜM. Kod yazılmadı, commit atılmadı. İKİ madde: (A) boss
turunda atlama, (B) "i" metinlerinin G300-G328 değişiklikleriyle
güncelliği.

---

# A) BOSS TURUNDA ATLAMA

## ÖLÇ 1 — Boss turunda atlama tam olarak ne yapıyor?

Kaynak: `goToNextRoundInner()` (app.js:7414-7480, "Atla"nın TEK işleme
noktası, 12 modun ORTAK yolu).

- **Boss geçiliyor mu?** HAYIR. `stats.bossWins++` SADECE 11 submit
  handler'ın `result.correct===true` dalında var (12 çağrı noktası,
  hepsi grep ile doğrulandı) — `goToNextRoundInner()` bu satıra HİÇ
  UĞRAMIYOR. Atlanan boss KAYBEDİLMİŞ sayılıyor (yanlışla AYNI
  muamele), "kazanılmadı" bile denemez — sessizce geçiliyor.
- **Bölüm sayacı ilerliyor mu?** EVET. `challengeTick(false, 0, true)`
  KOŞULSUZ çağrılıyor — `q.boss` hiç KONTROL EDİLMİYOR. `challenge.done++`
  (10 Soruluk Bölüm sayacı) her atlamada artıyor, boss olsun olmasın.
- **XP/can etkileniyor mu?** HAYIR/HAYIR. `gainedXp=0` geçiriliyor
  (`challengeTick(false, 0, ...)`). `loseLife()` BİLEREK ÇAĞRILMIYOR
  (kod yorumu: "Can kaybı davranışı değişmesin" — G214'ün kendi
  kararı). Boss atlansa da can gitmiyor.

**⚠️ EK, DAHA CİDDİ bulgu — boss ATLANINCA TEKRARLIYOR:**
`const boss = examActive ? false : mode.isBossRound(stats.rounds);`
(app.js:6426) ve `isBossRound(roundsCompleted) => (roundsCompleted+1)%5===0`
(frekans-bulma.js:310-312) — boss durumu `stats.rounds` sayacına
BAĞLI. `stats.rounds++` SADECE 12 GERÇEK submit noktasında (11 submit
handler + `onTimeUp()`) var — grep ile TEK TEK doğrulandı, TAMAMI
`stats.rounds++`. `goToNextRoundInner()`'ın skip dalı bu satıra
HİÇ UĞRAMIYOR. **Sonuç: boss atlanınca `stats.rounds` İLERLEMİYOR,
yani BİR SONRAKİ soru İÇİN `isBossRound()` AYNI değeri (stats.rounds
değişmediği için) tekrar hesaplıyor — boss BAYRAĞI KALICI OLARAK
TAKILI KALIYOR, kullanıcı GERÇEKTEN cevap verene (doğru ya da yanlış
FARK ETMEZ, `stats.rounds++` HER İKİSİNDE de çalışır) KADAR HER
SONRAKİ soru da boss olarak GELMEYE devam ediyor.** Bu, Logic'in
"boss'u geçemeden bölümü tüketiyor" gözlemini TAM AÇIKLIYOR — tek bir
kaçırılmış boss DEĞİL, kullanıcı ATLAMAYA devam ettikçe boss ARKA
ARKAYA tekrarlıyor, `challenge.done` (BÖLÜM sayacı) her atlamada
İLERLEDİĞİ için 10 slotluk parkur HIZLA TÜKENIYOR — kullanıcı boss'u
GEÇMEDEN (cevap vermeden) bölümü BİTİRİYOR.

## ÖLÇ 2 — Bu kasıtlı mı? git log ile gerekçe arandı.

**KASITLI DEĞİL — kanıt yok.** İlgili davranışın KAYNAĞI G214
(`82f94e6`, "#54 - 'Atla' artık parkur/sınav/telafi sayaçlarını
ilerletiyor") — commit mesajı, kod yorumları VE DURUM.md girdisi
(`git show 82f94e6`) TAM METİN olarak tarandı: **"boss" kelimesi HİÇ
GEÇMİYOR.** G214'ün KENDİ gerekçesi "kullanıcı telafi turunda
kilitlenebiliyordu" — GENEL bir parkur-sayacı düzeltmesi, boss
etkileşimi HİÇ DÜŞÜNÜLMEMİŞ görünüyor. `git log --all -i --grep="boss"`
ile TÜM boss-ilgili commit'ler tarandı — TEK ilgili olan G97
(`78a8988`, "boss timeout can koruması") SADECE SÜRE DOLMASI
senaryosunu ele alıyor ("Boss süresi dolunca can artık gitmiyor"),
ATLAMA'yı HİÇ kapsamıyor. **Önceki ölçümün "boss'ta atlama zaten
geçmiyor" öncülünün YANLIŞ çıkması (kod doğrulandı) BU turda TEKRAR
doğrulandı — AYRICA "kasıtlı bir tasarım" olmadığı da netleşti,
muhtemelen G214'ün fark etmediği bir YAN ETKİ.**

## ÖLÇ 3 — Bölümden sayılmaması için ne gerekiyor? Kaç satır, risk?

**Basit versiyon (SADECE `challenge.done`'ı korur, "boss tekrarlama"
sorununu ÇÖZMEZ):** `goToNextRoundInner()`'ın skip dalına
`if (!q.boss) challengeTick(false, 0, true);` gibi bir koşul — TAHMİNEN
1-3 satır. **Ama bu YETERSİZ** — ÖLÇ 1'in bulduğu gibi boss'un
TEKRARLAMA kök nedeni `stats.rounds`'un İLERLEMEMESİ, `challenge.done`
İLE İLGİSİZ AYRI bir mekanizma. `challenge.done`'ı korumak SADECE
"10 slotun tükenmesini" YAVAŞLATIR, boss'un TEKRAR TEKRAR gelmesini
ENGELLEMEZ.

**Kök nedeni de kapsayan versiyon (TAHMİN, KOD YAZILMADI, KESİN
DEĞİL):** `stats.rounds`'ın atlanan bir boss turunda da İLERLEMESİ
GEREKİR — ama `stats.rounds++`'ı skip dalına EKLEMEK, bu sayacın
DİĞER tüm okuyucularını (boss cadence DIŞINDA, `progress.js`/
rozetler/istatistik ekranları `stats.rounds`'u BAŞKA yerlerde de
OKUYOR OLABİLİR — bu turda TAM taranmadı) ETKİLEYEBİLİR — DAHA GENİŞ
bir değişiklik, RİSKİ daha yüksek (kaç okuyucu etkilenir, AYRI bir
"ÖNCE ÖLÇ" gerektirir). Alternatif: SADECE boss+skip özel durumunda
`stats.rounds++` çağırmak (diğer skip'lerde DEĞİL) — DAHA CERRAHİ ama
"neden SADECE boss'ta stats.rounds ilerliyor" tutarsızlığı YARATABİLİR.

**Tahmini iş yükü:** basit versiyon ~1-3 satır + birkaç test; kök
nedeni kapsayan versiyon ~5-15 satır + `stats.rounds`'un TÜM
okuyucularının TARANMASI gerekiyor (bu turda YAPILMADI, AYRI bir ölçüm
gerektirir) — RİSK basit versiyondan BELİRGİN DAHA YÜKSEK.

## ÖLÇ 4 — "i" metnine eklenmesi ne gerektirir?

GENERAL_GUIDE'ın "XP çarpanları" bölümü (guide-texts.js:68-71) ZATEN
boss'tan bahsediyor: "Her 5. soru (boss round) 1.65 kat verir." — BU
CÜMLENİN SONUNA (ya da yeni bir cümle olarak) bir UYARI eklemek:
KOD DEĞİŞMEZ, SADECE bu dosyadaki `body` string'ine metin eklenir —
**TAHMİNEN 1 dosya (`core/guide-texts.js`), 1 CÜMLE (~1 satır)**,
RİSK NEREDEYSE SIFIR (metin değişikliği, davranış etkilenmez, hiçbir
test kırılmaz — bu dosyanın testleri SADECE `shouldShowRoundHint`/
`spotlightStepsFor` SAF fonksiyonlarını test ediyor, `body` string
İÇERİĞİNİ DOĞRULAMIYOR).

## ÖLÇ 5 — Hangisi daha az riskli ve daha doğru?

**"i" metnine eklemek AÇIKÇA daha az riskli** (metin-only, ~1 satır,
davranış değişmiyor) — ama ÖLÇ 1'in bulduğu "boss TEKRARLAR" etkisini
DÜZELTMEZ, SADECE kullanıcıyı UYARIR ("boss'u atlarsan geçemezsin,
tekrar gelir" gibi). "Bölümden sayılmasın" (basit versiyon) davranışı
KISMEN İYİLEŞTİRİR (parkur DAHA YAVAŞ tükenir) ama KÖK NEDENİ
(`stats.rounds` takılı kalması) ÇÖZMEZ — YARIM bir düzeltme olur,
kullanıcı YİNE DE boss'u atlamaya devam ederse SIKIŞMIŞ (repeating
boss) durumda KALIR, sadece "10 Soruluk Bölüm" DAHA GEÇ tükenir.
**KÖK NEDENİ TAM çözen versiyon EN DOĞRU ama EN RİSKLİ** (stats.rounds
okuyucularının TAM taranması gerekiyor, bu turda yapılmadı). **Öneri:
KISA VADEDE "i" metnine ekleme (düşük risk, hemen yapılabilir) +
AYRI bir "ÖNCE ÖLÇ SONRA UYGULA" turunda kök nedeni (stats.rounds)
kapsayan bir düzeltme — Logic'in kendi çerçevesiyle uyumlu ("ya i
metnine eklensin, ya bölümden sayılmasın, hangisi kolaysa") — kolay
olan "i" metnidir, ama KÖK NEDENİ (tekrarlama) ÇÖZMEDİĞİ AÇIKÇA
belirtiliyor, kullanıcı kararı BEKLİYOR.**

---

# B) "i" METİNLERİ GÜNCEL Mİ?

Kaynak: `www/js/core/guide-texts.js` (483 satır, TÜM "i" içeriğinin
TEK kaynağı) TAMAMI okundu, satır satır G300-G328 listesiyle
karşılaştırıldı.

## 🔴 BULUNAN, ESKİMİŞ/ÇELİŞEN İFADELER

### 1. Frekans Çakışması'nın kaynak-çifti örnekleri TAMAMEN YANLIŞ

**Dosya:satır:** `www/js/core/guide-texts.js:359`
**Metin:** *"Kaynak çiftini (Kick+Bas/Vokal+Gitar/Snare+Gitar)
seçebilir, ya da kendi iki sesini yükleyebilirsin."*

**Sorun — ÜÇ AYRI hata, kod ile DOĞRUDAN karşılaştırıldı
(`www/js/core/source-catalog.js:308-339`, `www/index.html:355-362`):**
- **"Kick+Bas" DİYE BİR ÇİFT YOK.** `SOURCE_PAIRS` dizisinde (6 GERÇEK
  çift) "kick" hiç geçmiyor — grep ile TÜM kod tabanında arandı,
  frekans-cakismasi'nde "kick" SADECE eski bir KOD YORUMUNDA
  (dinleme kontrolü ETİKETİ, çift DEĞİL) geçiyor.
- **"Snare+Gitar" değil "Snare+Clean Gitar"** olmalı — TEK snare
  çifti (`snare-clean`) VAR, `sourceB: "clean_guitar"` — G316
  (`d51a97f`, bu OTURUMUN kendi commit'i) `snare-akustik` çiftini
  SİLDİ, `snare-clean` KALDI. Metin HANGİ gitarla eşleştiğini
  BELİRSİZ bırakıyor (eskiden İKİ snare çifti VARDI, artık BİR).
- **"Vokal+Gitar" değil "Vokal 2+Gitar"** olmalı — kaynağın GERÇEK
  adı "Vokal 2" (`vocal_1`, bu OTURUMUN kendi eklediği kaynak) — ve
  AYRICA İKİ AYRI Vokal 2 çifti VAR (`vokal2-clean`, `vokal2-akustik`),
  metin TEK bir "Vokal+Gitar" örneğiyle bunu KAPSAMIYOR.
- **Toplam 6 GERÇEK çiftten SADECE (yanlış) 3 örnek** veriliyor,
  `bas-akustik`/`bas-clean`/`akustik-clean` çiftleri HİÇ
  anılmıyor.

**Öneri:** Örnek listesini GERÇEK çiftlerle DEĞİŞTİR — ya TAM 6
çifti say (Akustik+Clean/Bas+Akustik/Bas+Clean/Snare+Clean/
Vokal 2+Clean/Vokal 2+Akustik), ya da "6 hazır kaynak çiftinden
birini seç" gibi SAYI VEREN ama İSİM UYDURMAYAN genel bir ifadeye
geç.

### 2. "Zayıf olduğun nokta" ifadesi G319/G323'ün "iddiasız gözlem"
kararıyla ÇELİŞİYOR

**Dosya:satır:** `www/js/core/guide-texts.js:29` ve `:86`
**Metin 1 (satır 29):** *"6 doğru toplanmazsa zayıf olduğun yerden
kısa bir telafi turu gelir."*
**Metin 2 (satır 86):** *"Parkur 6 doğruya hiç ulaşamadan biterse
sınav yerine telafi gelir — zayıf olduğun noktaya odaklanan kısa bir
tur."*

**Sorun:** G319 (OLCUM-ZAYIF-KADEME-19-08 kanıtladı, `12ca317`) VE
G323 (`a60f265`) — telafi hedeflemesi ARTIK yeterli veri OLMADIĞINDA
kullanıcının GERÇEK zayıf noktasına DEĞİL, VARSAYILAN/ORTA bir
bölgeye/kademeye düşüyor (kanıt YOKKEN "zayıf" iddia edilmesin diye,
KASITLI ürün kararı — Logic'in KENDİ tespiti: "kesin yargı riskli,
yanlışsa kullanıcı kendini yanlış tanır"). İN-GAME metin bu YÜZDEN
"Bu turda [BÖLGE] bölgesine bakıyoruz" (kesinlik İDDİA ETMEDEN) gibi
değiştirildi — ama BU "i" metni HÂLÂ KOŞULSUZ "zayıf olduğun
yerden/noktaya" diyor, yani YETERSİZ VERİ durumunda YANLIŞ bir vaat
veriyor (kullanıcıya "zayıf noktan biliniyor" izlenimi verirken
GERÇEKTE rastgele/varsayılan bir bölgeye düşebiliyor).

**Öneri:** "Zayıf OLABİLECEĞİN" gibi bir nüans EKLEMEK, ya da "yeterli
veri varsa zayıf noktana, yoksa genel bir bölgeye" şeklinde İKİ
DURUMU AYIRAN bir cümle — in-game metnin (app.js, G323) KENDİ
üslubuyla TUTARLI hâle getirmek.

## 🟡 BULUNAN, YANILTICI/EKSİK (yanlış DEĞİL ama G317 sonrası
KISMİ doğru olduğu için artık tam DOĞRU değil) İFADE

### 3. "Yanlış cevap XP kazandırmaz" artık Tonal Denge'de DOĞRU DEĞİL

**Dosya:satır:** `www/js/core/guide-texts.js:66`
**Metin:** *"Her doğru cevap XP kazandırır... Yanlış cevap ve 'Atla'
XP kazandırmaz, kaybettirmez de."*

**Sorun:** G317 (`7238352`, bu OTURUMUN kendi commit'i) —
`tonal-denge.js:calculateXP()` (satır 501-506) DOĞRULANDI:
`if (!result.correct) { ... const fraction = PARTIAL_CREDIT_FRACTION[...]; if (!fraction) return 0; ... return Math.max(0, raw); }`
— yani Tonal Denge'de `result.correct===false` (metnin "yanlış cevap"
dediği DURUM) İKEN, EN AZ 1 bant kendi toleransındaysa POZİTİF XP
DÖNEBİLİYOR. Bu, "Yanlış cevap XP kazandırmaz" iddiasını Tonal
Denge'de YANLIŞLIYOR — 11/12 modda hâlâ doğru (binary correct/wrong),
SADECE Tonal Denge istisna.

**Öneri:** "Yanlış cevap ve 'Atla' genelde XP kazandırmaz" gibi bir
NÜANS, ya da Tonal Denge'nin KENDİ mod-içi metnine ("i" sisteminin
`MODE_GUIDE_TEXTS["tonal-denge"]`, satır 302) "kısmi doğru cevaplar da
azalan XP kazandırır" notu eklemek — GENEL_GUIDE'ı KOŞULSUZ bırakıp
MOD-özel metne istisna eklemek daha DOĞRU bir çözüm olabilir (GENEL
kural 11 modda hâlâ geçerli).

## 🟢 KONTROL EDİLDİ, GÜNCEL/DOĞRU ÇIKAN MADDELER

- **"Önce/Sonra" düğmeleri** (G321, `e09dd0d`) — guide-texts.js'te
  ("Önce"/"Sonra" TÜM eşleşmeleri) TEK bir SPOTLIGHT_STEPS'in genel
  "Önce sesi dinle." (sıralama kelimesi, ÖZELLİKLE İLGİSİZ) DIŞINDA
  HİÇ leftover referans YOK — MODE_OPTIONS_TEXTS["frekans-cakismasi"]
  (satır 359) ZATEN GÜNCEL (kod yorumu satır 331-335 bu güncellemeyi
  AÇIKÇA belgeliyor: "metin de buna göre güncellendi"). **TEMİZ.**
- **Kulak butonları (Frekans Çakışması'nda gizlenme, G322)** —
  MODE_OPTIONS_TEXTS["frekans-cakismasi"] kulak butonlarından HİÇ
  bahsetmiyor (SADECE Frekans Bulma'nın KENDİ kulak butonları
  anlatılıyor, satır 350/346-348 kod yorumunda AÇIKÇA belgelenmiş) —
  ZATEN hiç anlatılmamıştı, G322 YENİ bir staleness YARATMADI.
  **TEMİZ (ama önceden de eksikti, bu turun kapsamı DIŞINDA).**
- **Pro Plus** — "i" sisteminde HİÇ ADI GEÇMİYOR (hiçbir bölümde) —
  G327'nin görünürlük kısıtlaması bu YÜZDEN staleness YARATMADI
  (anlatılmayan bir şey eskiyemez). **TEMİZ.**
- **Sınav soruları "her zaman en zor kademede"** (guide-texts.js:82)
  — TÜM 12 modda `EXAM_DIFFICULTY="pro"` (önceki turda doğrulandı) —
  **HÂLÂ DOĞRU.**
- **Frekans Çakışması aşama 3 ses davranışı (G320)** — hiçbir "i"
  metni "cevap sonrası ses devam eder" gibi bir İDDİA TAŞIMIYOR, bu
  YÜZDEN G320'nin değişikliği (ses ARTIK duruyor) staleness
  YARATMADI. **TEMİZ.**
- **Mağaza metni** — bu turun kapsamı DIŞINDA (repo'da mağaza
  açıklaması YOK, sadece Logic'in dışarıda tuttuğu metin) — ÖNCEKİ
  audit (`OLCUM-MAGAZA-METNI-17-08.md`, 17 Ağustos) HÂLÂ GEÇERLİ:
  `git log` ile DOĞRULANDI, `mode-catalog.js`/`paywall.js` bu turda
  (G300-G328) HİÇ DEĞİŞMEDİ. O raporun bulduğu 2 madde (1: "Distortion"
  mod adı hâlâ "Saturation & Distortion" — UYUŞMUYOR; 2: "5 can"
  SADECE ücretsizde geçerli, Pro'da sınırsız — NÜANS) HÂLÂ AÇIK, bu
  turda YENİ bir uyuşmazlık BULUNMADI.

## ⚠️ YANIT VERİLEMEYEN/KISMEN YANIT (yeni davranışlar anlatılmalı mı?)

### Atlamanın turu başlatması (G313)

MODE_OPTIONS_TEXTS'in TÜMÜNDE "Bilemezsen 'Atla'ya dokun." cümlesi
VAR — bu YANLIŞ DEĞİL (atlamak GERÇEKTEN mümkün) ama G313'ün
KENDİSİNİ (Atla'ya `#startBtn`'e HİÇ basmadan da basılabildiğini,
turu KENDİSİNİN başlattığını) AÇIKÇA ANLATMIYOR — bu bir ÇELİŞKİ
DEĞİL, bir EKSİKLİK/fırsat. Metne dokunulması GEREKLİ mi, kullanıcı
KARARI (kolay: "Atla" butonuna dokunarak da tur başlatabilirsin"
gibi TEK bir CÜMLE eklenebilir, RİSK düşük).

### Beyaz nokta (G324) — HİÇBİR "i" metni BÖLÜM/telafi çubuğunun
NOKTA renklerini (yeşil/kırmızı/beyaz) AÇIKLAMIYOR

Bu, G324'ün YARATTIĞI bir staleness DEĞİL — nokta renkleri (doğru=
yeşil, yanlış=kırmızı) DAHA ÖNCE de (G276'dan beri) HİÇ
açıklanmıyordu, G324 SADECE üçüncü bir renk (beyaz=atlandı) EKLEDİ.
Bu bir ÖNCEDEN VAR OLAN boşluk, bu turda BÜYÜMEDİ ama KAPANMADI DA —
kullanıcı isterse GENERAL_GUIDE'a ya da mod-özel metne "BÖLÜM/telafi
çubuğundaki noktalar: yeşil=doğru, kırmızı=yanlış, beyaz=atlandı"
gibi TEK bir bölüm/cümle eklenebilir.

### Kısmi doğru XP (G317) — YUKARIDA (madde 3) zaten ele alındı,
mod-özel metne (`MODE_GUIDE_TEXTS["tonal-denge"]`) istisna eklemek
ÖNERİLDİ.

## "Nasıl Oynanır" (MODE_GUIDE_TEXTS + MODE_OPTIONS_TEXTS) GÜNCEL Mİ?

**BÜYÜK ÇOĞUNLUKLA EVET** — SADECE frekans-cakismasi'nin kaynak-çifti
ÖRNEKLERİ (madde 1, YUKARIDA) YANLIŞ. Diğer 11 modun metni
DOĞRULANDI (mod açıklamaları, kontrol listesi — "A/B Test", "Durdur",
"Atla", "Karıştır" — hepsi KOD İLE TUTARLI, bu turda YENİ bir
uyuşmazlık BULUNMADI).

## Spotlight turu güncel mi?

**EVET.** 12 modun SPOTLIGHT_STEPS'i TEK TEK okundu — HİÇBİRİ
"Önce/Sonra"/kulak butonları/Pro Plus gibi KALDIRILMIŞ/DEĞİŞMİŞ bir
özelliğe atıf YAPMIYOR. "confirm" adımlarının HEPSİ "Bilemezsen
'Atla', istersen 'Durdur'a dokunabilirsin" ile bitiyor — G313/G324'ün
DAVRANIŞ değişiklikleriyle ÇELİŞMİYOR (Atla'nın turu BAŞLATABİLDİĞİNİ
söylemiyor ama YANLIŞ da söylemiyor).

## KABUL — bu turun kapsamı

- [x] Boss+atlama davranışı TAM ölçüldü — kasıtsız bir yan etki
      (boss'un TEKRARLAMASI dahil) BULUNDU, git log ile KASITSIZLIK
      DOĞRULANDI.
- [x] TÜM "i" metinleri (483 satır) okundu, G300-G328 listesiyle
      TEK TEK karşılaştırıldı.
- [x] 2 KESİN hatalı ifade (frekans-cakismasi kaynak-çiftleri, "zayıf
      nokta" kesinliği) + 1 artık-tam-doğru-olmayan ifade (Tonal
      Denge XP) BULUNDU, dosya:satır + öneri VERİLDİ.
- [x] Mağaza metni çelişkisi — ÖNCEKİ audit'e ATIFLA (yeniden
      yapılmadı, kod DEĞİŞMEDİĞİ doğrulandı).
- [ ] Kod YAZILMADI, commit ATILMADI — bu turun kapsamı SADECE
      ölçümdü.

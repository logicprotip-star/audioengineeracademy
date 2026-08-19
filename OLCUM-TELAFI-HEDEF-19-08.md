# OLCUM-TELAFI-HEDEF-19-08 — G319 telafinin SORU ÜRETİMİNİ bozdu mu?

**Görev tipi:** ÖLÇÜM. Kod değiştirilmedi, commit atılmadı. Bulgular
GERÇEK, dışa aktarılan fonksiyonlar (`getWeakZone`/`getWeakTier`/
`pickPersonalizedZone`) Node'da ÇALIŞTIRILARAK ölçüldü — "ÖNCESİ"
(G319'dan önceki) davranış, G319'un DEĞİŞTİRDİĞİ iki kuralın (eşik
3→10, "en az 2 aday" şartı) elle GERİ ALINMASIYLA bu script İÇİNDE
YENİDEN üretildi (kaynak dosyalara dokunulmadı). Script `scratchpad/
sim-telafi-before-after.mjs` — repoya commit EDİLMEDİ.

**⚠️ SONUÇ ÖZETİ (detay aşağıda): EVET, G319 5 moddan (zone-tipi)
telafinin SORU ÜRETİMİNİ de etkiledi — bu, G319'un KENDİ görev
metninin ve KENDİ kod yorumunun açıkça İSTEMEDİĞİ bir yan etki
("telafinin MEKANİK yönlendirmesi... ETKİLENMEMELİ" diye YAZILMIŞTI,
ama zone dalı için bu YANLIŞ bir iddiaydı — DOĞRULANMADAN yazılmış).
Diğer 5 mod (tier-tipi) ETKİLENMEDİ.**

---

## 1) Telafi soruları nasıl üretiliyor?

`app.js:3394` — `remedial-start` olayı gelince `const area =
getWeakArea(stats, modeId);` çağrılıyor, `examSystem.startRemedial(
area.value)` ile `area.value` `examSystem.remedialTier`'e YAZILIYOR.
`startRound()` (`app.js`, satır ~4460 civarı) bunu OKUYUP soru
üretimine ŞÖYLE besliyor:
```js
const zoneRemedial = examGateActive() && mode.EXAM_WEAK_AREA === "zone" && examSystem.phase === "remedial";
...
focusRange: (zoneRemedial && examSystem.remedialTier) ? [examSystem.remedialTier.a, examSystem.remedialTier.b] : currentFocusRange(),
zoneStats, // Z4: zayıf bölgelere ağırlıklı test frekansı
```
**Evet — DOĞRUDAN `getWeakZone`/`getWeakTier`'in (`getWeakArea()`
üzerinden) çıktısını kullanıyor, AYRI bir hesap YOK.** Zone-tipi 5
modda (Frekans Bulma/Kesim Noktası/Boost-Cut/Q Genişliği/Frekans
Çakışması) `focusRange` doğrudan zayıf bölgeye DARALTILIYOR — mod
kendi `createQuestion()`'ında bu daraltılmış aralıktan soru üretiyor.

---

## 2) G319'un eklediği eşik soru üretimini etkiliyor mu?

**Zone-tipi modlarda: EVET.** `app.js:3051` — `return { type: "zone",
value: weak ? weak.zone : null, ... };` — `weak` null olunca (G319'un
YENİ "en az 2 aday" kuralı devreye girip null dönünce) `value` de
**null** oluyor. `startRound()`'daki `(zoneRemedial &&
examSystem.remedialTier) ? [...] : currentFocusRange()` ifadesi bu
YÜZDEN **TAM SPEKTRUMA (ya da kullanıcının kendi odak aralığına)
düşüyor** — HİÇ daraltma YOK.

**Tier-tipi modlarda: HAYIR.** `app.js:3056` — `const tier = (weak &&
weak.tier) || "medium";` — `weak` null olsa BİLE `tier` HER ZAMAN
GERÇEK bir değer (`"medium"`) alıyor, ASLA `null` değil. Mekanik
yönlendirme (`examTier`/`questionTier`) buradan hiç etkilenmiyor.

**Bu, `getWeakArea()`'nın G319'da eklenen KENDİ kod yorumuyla
(`app.js:3040-3042`) ÇELİŞİYOR** — o yorum "value/label HÂLÂ
'medium'/nötr bir varsayılana düşüyor... telafinin MEKANİK
yönlendirmesi... ETKİLENMEMELİ" diyor — bu iddia **tier dalı için
DOĞRU, zone dalı için YANLIŞ** (o turda DOĞRULANMADAN yazılmış).

"Yeterli veri yok" dönünce telafi **rastgele SORMUYOR** (tam anlamıyla
uniform rastgele DEĞİL, madde 3'e bkz.) ama **hedeflenmiş bir bölge de
SEÇMİYOR** — TAM SPEKTRUMDA (ya da kullanıcının el ile seçtiği odak
aralığında) normal bir round gibi soru üretiyor.

---

## 3) G319 ÖNCESİ/SONRASI karşılaştırma (SİMÜLE EDİLDİ, GERÇEK fonksiyonlarla)

**Senaryo — Logic'in cihazda gördüğü durum (SADECE TİZ bölgesinde
veri, n=10, %20 isabet — GERÇEKTEN zayıf):**

| | ÖNCESİ (G319 yok) | SONRASI (G319 var) |
|---|---|---|
| `getWeakZone` sonucu | `{zone: TİZ, weakness: 0.88}` | `null` |
| `focusRange` (telafi sorularının geldiği aralık) | **`[8000, 20000]`** (SADECE TİZ) | **`[80, 17000]`** (TAM SPEKTRUM) |
| Ekranda gösterilen | "Zayıf bölgen: Tiz" | "Henüz yeterli verin yok" |

**İki bölgede de yeterli veri varken (TİZ zayıf %20, SUB güçlü %90,
İKİSİ de n≥10) — KONTROL senaryosu:** ÖNCESİ = SONRASI = TİZ,
**FARK YOK** — G319'un "en az 2 aday" kuralı BU durumda hiç devreye
girmiyor (zaten 2 aday var), doğru çalışıyor.

**"Hiç hedeflemiyor mu?" — HAYIR, TAM ANLAMIYLA DEĞİL (ÖNEMLİ nüans,
ölçüldü):** `focusRange` daralmasa da, `zoneStats` HER ZAMAN
`createQuestion()`'a KOŞULSUZ geçiyor (`app.js`, `zoneStats,` satırı
— `zoneRemedial`'a BAĞLI DEĞİL). Mod kendi içinde `pickPersonalizedZone`
(personalization.js) İLE, `getWeakZone`'DAN TAMAMEN BAĞIMSIZ, "en az 2
aday" kuralı OLMAYAN AYRI bir ağırlıklandırma yapıyor. Yukarıdaki
senaryoda (SADECE TİZ'de n=10) TAM SPEKTRUMDA 20.000 simüle soru
çekilince: **TİZ payı %34,9** (eşit dağılımda beklenen %16,7) — yani
G319 SONRASI bile telafi TİZ'e HAFİF bir eğilim GÖSTERİYOR, ama bu
ÖNCESİ'nin **%100 garantili daraltmasından ÇOK DAHA ZAYIF** (yaklaşık
2x ağırlık, MAX_BOOST=2.0'ın izin verdiği tavan).

---

## 4) Ekran metni ile soru üretimi AYNI kaynaktan mı besleniyor? Ayrılabilir mi?

**Evet, AYNI `getWeakArea()` çağrısının AYNI `area` nesnesinden** —
`area.value` (soru üretimi) ve `area.insufficientData`/`area.label`
(ekran metni) TEK bir fonksiyon çağrısının PARÇALARI.

**Ayrılabilir mi — EVET, ve tier dalı ZATEN AYIRIYOR:** tier dalında
`value` HER ZAMAN kullanılabilir bir tier ("medium"), `insufficientData`
İSE AYRI, SADECE metni etkileyen bir bayrak — İKİSİ BİRBİRİNDEN
BAĞIMSIZ. **Zone dalında bu ayrım YOK** — `value` DOĞRUDAN
`insufficientData` ile AYNI KOŞULA (weak==null) bağlı, ikisi
BİRBİRİNE KENETLENMİŞ. Metni "yeterli veri yok" yapıp `value`'yu
GERÇEK bir hedefe (ör. tek adayın kendisi, tier'ın "medium"
fallback'ine benzer şekilde) AYIRMAK KOD OLARAK basit bir değişiklik
— `value: weak ? weak.zone : null` satırındaki `null`'ı, `insufficientData`
DIŞINDA bir kaynaktan (ör. eşiksiz/tek-aday-a-göre EN ZAYIF bölge)
beslemek yeterli.

---

## 5) Yeterli veri yokken telafi ne yapmalı?

Bu bir ÜRÜN KARARI — bu turda VERİLMEDİ, üç seçenek ÖLÇÜLEREK
karşılaştırıldı:

- **(a) Mevcut davranış (tam spektrum, hafif zoneStats eğilimi
  KALIR):** "biz senin nerede zayıf olduğundan EMİN değiliz" dürüstlüğü
  ekranda VE mekanikte TUTARLI — ama telafi ARTIK "telafi" değil,
  neredeyse NORMAL bir round.
- **(b) Tier'ın deseni: tek/en az veri olan adayı YİNE DE kullan
  (ekranda 'yeterli veri yok' yazsa bile, MEKANİK ARKA PLANDA en
  olası zayıf noktaya devam et):** G319'un KENDİ orijinal İSTEĞİYLE
  (mekanik ETKİLENMESİN) EN TUTARLI seçenek — DEZAVANTAJI: %54,5-76,7
  güvenilirlikte (G319'un KENDİ ölçtüğü rakamlar) YANLIŞ bir bölgeye
  odaklanma riski, ama telafi zaten "sınav" değil DÜŞÜK-RİSKLİ bir
  pratik turu (KRİTİK KARARLAR — sınav geçme/zayıf bölge raporu —
  ZATEN bu mekanizmadan ETKİLENMİYOR, sadece SORU İÇERİĞİ).
- **(c) En az oynanan bölgeyi hedefle (farklı bir sinyal — "zayıf"
  değil "keşfedilmemiş"):** task'ın KENDİSİ önerdi, bu turda AYRICA
  hiç ÖLÇÜLMEDİ/simüle edilmedi (zoneStats'ta "hiç örnek yok" olan
  bölgeleri bulup önceliklendirmek YENİ bir fonksiyon gerektirir) —
  KAVRAMSAL olarak MAKUL (yeni kullanıcı için "dene, tanı" mantığı)
  ama G319'un ÖLÇTÜĞÜ "az veriyle güvenilmez karar verme" endişesini
  TAMAMEN ÇÖZMÜYOR, SADECE farklı bir eksene KAYDIRIYOR.

---

## 6) Aynı sorun sınav sisteminde de var mı?

**HAYIR.** `getWeakArea()` KOD TABANINDA SADECE TEK bir yerden
çağrılıyor (`app.js:3394`, `remedial-start` olay dalı) — SINAV
(exam) fazı bunu HİÇ KULLANMIYOR. Sınav sorularının zorluğu
`mode.EXAM_DIFFICULTY` (HER modun kendi SABİT, "zorlaştırılmış"
ayarı) ile geliyor (`app.js:6379`,
`examSystem.questionTier(els.difficultySelect.value, mode.EXAM_DIFFICULTY)`)
— kişiselleştirme/zayıf-nokta hedefleme SINAVDA hiç YOK, bu sorun
YAPISAL OLARAK sadece TELAFİYE ÖZGÜ.

---

## SONUÇ

**G319 işlevi BOZDU MU?** Kısmi olarak EVET — **5 zone-tipi modda**
(Frekans Bulma/Kesim Noktası/Boost-Cut/Q Genişliği/Frekans Çakışması)
telafinin soru üretimi, "tek aday ama yeterli örnekli" durumunda
**%100 hedeflenmiş bir bölgeden TAM SPEKTRUMA** düştü — bu, G319'un
KENDİ görev metninin/kod yorumunun "mekanik ETKİLENMESİN" AÇIK
NİYETİYLE ÇELİŞİYOR (o iddia doğrulanmadan yazılmış, zone dalı için
YANLIŞTI). **5 tier-tipi modda** (Kompresör/Reverb/Distortion/dB
Seviyesi/Tonal Denge) hiçbir etki YOK — `value` HER ZAMAN "medium"a
düşüyor, tier'ın KENDİ tasarımı ZATEN mesaj ile mekaniği AYIRIYORDU.
**Sınav sisteminde bu sorun HİÇ YOK** (getWeakArea sınavda hiç
kullanılmıyor).

**Bozduysa nasıl düzeltilir (ÖNERİ, ÜRÜN KARARI GEREKTİRİR):** zone
dalını tier dalıyla TUTARLI hâle getirmek — `area.value`'yu
`insufficientData`'dan BAĞIMSIZLAŞTIRMAK (tek aday bile olsa, ekranda
"yeterli veri yok" YAZARKEN mekanik ARKA PLANDA o adaya devam etmek,
madde 5'in (b) seçeneği) — G319'un KENDİ orijinal (ama zone için
YANLIŞ doğrulanmış) niyetini GERÇEKTEN karşılar. **Alternatif:**
mevcut davranışı (tam spektrum) BİLEREK KORUMAK — "veri yetersizken
telafi ARTIK telafi değil, genel pratik olsun" — de SAVUNULABİLİR bir
duruş, ama BU, G319'un kendi görev metninin AÇIKÇA SÖYLEMEDİĞİ, YENİ
bir ürün kararı olurdu. **Hangisi doğru — bu turda KARAR VERİLMEDİ,
kullanıcıya SORULMALI.**

# TERİM TARAMASI — sonuç

_Taranan: `guide-texts.js` + 12 mod dosyası (8349 satır)._
_Ölçüt: `TERIM-KURALI.md` (senin kendi senaryondan çıkarıldı)._

---

## ÖNCE İYİ HABER

**Uygulama zaten büyük ölçüde doğru.** Metinlerde İngilizce terimler
korunmuş:

`gain staging` · `high-pass/low-pass` · `boost/cut` · `Q` ·
`Clipping` · `Soft Clipping` · `Plate` · `Hall` · `Room` ·
`decay` · `pre-delay` · `A/B/C` · `EQ` · `mono uyumu` ·
`stereo` · `dinamik`

Senin senaryodaki kalıba uyuyor. Toplu bir revizyon gerekmiyor —
noktasal düzeltmeler var.

---

## DÜZELTİLECEK — 1 madde

### `TİZ / HAVA` → `TİZ / AIR`

Bant etiketi olarak "HAVA" kullanılmış. İki dosyada geçiyor:

**`frekans-bulma.js`**
```
{ a: 8000, b: 20000, t: "TİZ / HAVA (8–20 kHz)", ... }
"TİZ / HAVA": "Tiz"   ← kısa etiket
```

**`kesim-noktasi.js`**
```
"TİZ / HAVA": "sesin neredeyse tamamını keser, çok az bir tıslama kalır"
"TİZ / HAVA": "sadece en tepedeki havayı/parlaklığı alır, ses neredeyse aynı kalır"
```

**Neden değişmeli:** Bant adı bir **ölçüm etiketi.** Kullanıcı
Ozone'da, FabFilter'da, herhangi bir analizörde `AIR` görecek.
"HAVA" diye öğrenirse başka kaynağa geçtiğinde kopukluk yaşar.

**Neden açıklamalardaki "hava" KALMALI:** Orada nitelik olarak
kullanılıyor, senin senaryondaki gibi:

> "Parlaklık ve hava. Yükseltmek açıklık ve 'pahalı' his verir"
> "Vokale hava burada eklenir."
> "sadece en tepedeki havayı/parlaklığı alır"

Senaryonda da böyle: *"Side kanalına hava vermek"*, *"tiz
frekanslara parlaklık ve hava katan"*. Bu doğru kullanım, dokunma.

**Sonuç: sadece etiket değişiyor, açıklamalar aynen kalıyor.**

---

## DÜZELTİLECEK — GENERAL_GUIDE'daki yanlış (zaten biliniyordu)

```
"5 mod ücretsiz, sınırsız oynanır."
```

Yanlış. Bu zaten çalışan prompt'ta düzeltiliyor.

---

## TARTIŞILACAK — 2 madde

### 1. `kompresyon` mu `compression` mu?

`kompresor.js`'te tutarlı olarak **"kompresyon"** kullanılmış:

```
"hafif kompresyon" · "orta kompresyon" ·
"belirgin kompresyon" · "ağır kompresyon"
"Farklı olan DAHA ÇOK kompresyonlu"
```

Senaryonda ikisini birlikte yazmışsın: **`Compression (Kompresyon)`**

Türkçede "kompresyon" yerleşmiş bir kelime — stüdyoda da
söyleniyor. **Bence kalsın.** Ama karar senin.

### 2. `yankı` — reverb.js'te bir kez geçiyor

```
"k=0'da bile hafif bir yankı kalır"
```

Bu bir kod yorumu, kullanıcı görmüyor. Kullanıcıya görünen
metinlerde hep **"reverb"** kullanılmış — doğru.

Dokunmaya gerek yok, sadece bilgi.

---

## BULUNMAYANLAR — kontrol edildi, temiz

Şu Türkçeleştirmelerin **hiçbiri** kullanıcı metinlerinde yok:

`kazanç` (gain) · `eşik` (threshold) · `saldırı` (attack) ·
`bırakma` (release) · `gürültü tabanı` (noise floor) ·
`tavan boşluğu` (headroom) · `ıslak/kuru` (wet/dry — sadece
reverb açıklamalarında sıfat olarak, doğru kullanım) ·
`yan zincir` (sidechain) · `doygunluk` (saturation — sadece
kod yorumunda)

---

## SONUÇ

| Ne | Kaç yer | Durum |
|---|---|---|
| `TİZ / HAVA` → `TİZ / AIR` | 2 dosya, 5 satır | 🔧 düzeltilecek |
| `"5 mod sınırsız"` yanlışı | 1 satır | 🔧 zaten düzeltiliyor |
| `kompresyon` | 6+ satır | ⏸️ karar senin (bence kalsın) |
| Diğer her şey | — | ✅ temiz |

**Beklediğimizden çok daha az iş çıktı.** Terim revizyonu "büyük
iş" olarak listelenmişti, aslında tek bir etiket değişikliği.

---

## AYRI KONU — geri bildirim metinlerinin kalitesi

Terim taraması bitti ama başka bir şey fark ettim.

**Uygulamadaki metinler iyi ama senaryodakiler daha iyi.**
Karşılaştır:

**Uygulamada (kompresor.js):**
> "orta kompresyon — dengeli, dinamiği hafifçe kontrol altına alır"

**Senaryonda:**
> "Çok hızlı attack transient'i ezer ve punch'ı kaybettirir. Çok
> yavaş attack ise sesin ilk darbesi geçtikten sonra sıkıştırmayı
> başlatır. Davul için 10-30 ms iyi bir başlangıç noktasıdır."

İkincisi somut, sayı veriyor, ne yapacağını söylüyor.

Bu ayrı bir iş — terim değil içerik zenginleştirme. 1.0'a
girer mi, 1.1'e mi kalır, sen karar ver. Ama senaryo elimizde,
kaynak hazır.

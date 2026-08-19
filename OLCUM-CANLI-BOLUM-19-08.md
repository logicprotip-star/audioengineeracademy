# OLCUM-CANLI-BOLUM-19-08 — "Bölüm çubuğu hiç ilerlemiyor": canlı izleme

**Görev tipi:** CANLI İZLEME (Playwright, gerçek DOM etkileşimi, konsol
logları canlı okundu). Kod DEĞİŞTİRİLMEDİ, commit ATILMADI. Kullanılan
geçici script'ler (`.tmp_olcum_*.mjs`) çalıştırıldıktan hemen sonra
silindi — `git status --short` bu turun sonunda sadece önceki `cap
sync`'ten kalan `pbxproj` + bu raporu gösteriyor.

**Yöntem:** `python3 -m http.server 8123 --directory www` ile gerçek
statik sunucu, Playwright (chromium, headless) ile GERÇEK DOM tıklamaları
(`.ans`, `#nextBtn`, `#exCta`, `#feedbackClose`) — `page.evaluate` SADECE
mevcut, salt-okunur test kancalarını (`__aeaActiveQuestionChoices`,
DOM okuma) kullandı, hiçbir yeni kanca eklenmedi. Her adımda hem DOM
durumu (`#gameChapterLabel`, `#gameChapterDots`, `#gameExamRow`,
`#gameExamDots`, `#gameExamProgress`) hem konsol logları (`[audio-diag]`
dahil) kaydedildi.

---

## ⚠️ ÖNCELİKLE BİR DÜZELTME — görev metninin G-numarası atfı YANLIŞ

Görev: "G296 challenge.results dizisi ekledi, G305 sınav/telafiye
taşıdı." **Bu atıf hatalı — ve bu TAM OLARAK daha önce bir kez
yakalanıp DURUM.md'ye kaydedilmiş bir hatanın TEKRARI:**

- `challenge.results[]`'u ekleyen commit **G276**'dır
  (`aac838b`, 17 Ağustos 20:29 — `www/js/app.js:6501`, `challengeTick()`
  içinde `challenge.results.push(!!wasCorrect)`), **G296 DEĞİL** — G296
  tamamen alakasız bir güvenlik/loglama düzeltmesi (OLCUM-GUVENLIK-18-08
  madde 3, dosya adı loglaması, `app.js:6923/6948/9455/10435`).
- Bu deseni sınav/telafi'ye TAŞIYAN commit **G304**'tür (`9ab0f38`,
  18 Ağustos 23:12 — `examSystem.examResults`/`remedialResults`,
  `#gameExamDots` render bloğu), **G305 DEĞİL** — G305 bu oturumda
  yapılan, TAMAMEN ayrı bir düzeltme (sınav/telafi sonuç ekranlarının
  "Ana Ekran"ına `pauseRound()` eklenmesi).
- **Bu YANLIŞ atıf DAHA ÖNCE DE yapılmış** ve `DURUM.md:388-392`'de
  (G304'ün kendi BİTTİ kaydı) AÇIKÇA düzeltilmiş: *"G296'ta değil
  (task'ın atfı yanlış — bu düzeltme G276'ya ait, `git log -S` ile
  doğrulandı)."* Aynı karışıklık şimdi G305 için TEKRAR oluşmuş
  görünüyor. **Sayı uydurmadım, `git log -S`/`git show` ile
  doğruladım** — CLAUDE.md'nin "sayı uydurma" kuralı gereği bunu
  düzeltmeden geçmedim.

Bu, raporun geri kalanını GEÇERSİZ kılmıyor (görevin ASIL sorduğu şey —
çubuğun cihazda ilerlemediği iddiası — G-numarasından BAĞIMSIZ olarak
test edildi), ama hangi commit'in NE ZAMAN yapıldığını doğru bilmek,
aşağıdaki SONUÇ bölümünün "stale build" hipotezi için ÖNEMLİ (G276/G304
NE KADAR YENİ olduğunu gösteriyor).

---

## 1-3) 5 normal cevap + 5 Atla, 3 modda — SONUÇ: ÇUBUK DOĞRU ÇALIŞTI

**Kurulum:** `localStorage.clear()` + taze `dev.simulatePro:true`,
`playMode:"challenge"` ("10 Soruluk Bölüm"), 3 mod: `boost-mu-cut-mu`,
`kesim-noktasi`, `db-seviyesi` (üçü de `.ans` buton-tabanlı, gerçek
tıklamayla doğru/yanlış seçilebiliyor — `__aeaActiveQuestionChoices()`
ile doğru şık indeksi okunup ya O tıklandı (doğru) ya BAŞKA bir indeks
tıklandı (yanlış), tıpkı `e2e/helpers/app-fixtures.mjs:answerCorrectChoice`'ın
zaten kullandığı GÜVENİLİR desen).

**ÖLÇÜLEN — 3 mod × (5 normal + 5 Atla) = 30 adım, HİÇBİR SAPMA YOK:**

| Adım öncesi/sonrası | Gözlem |
|---|---|
| `#gameChapterLabel` | HER adımda tam 1 arttı (`BÖLÜM 1/10`→`2/10`→...→`6/10`), 3 modun 3'ünde de, hem normal hem Atla'da |
| `#gameChapterDots` (`challenge.results[]`'tan render ediliyor) | Doğru cevap → o pozisyona `on`, yanlış/Atla → o pozisyona `wrong`, SIRAYLA — hiçbir "önce doğrular sonra yanlışlar" (G213'ün ESKİ kusuru) görülmedi |
| Feedback panelinden sonra (`#feedbackClose`) değer | AYNI kaldı (render iki kez tetiklenmiyor, çift-sayım yok) |
| Ekran (`.screen.active`) | HER adımda `screen-game` — beklenmeyen bir ekran geçişi YOK |

**Ham veri:** tam JSON çıktısı (30 adımın hepsi) scratchpad'de saklı,
istenirse paylaşılabilir — burada özet tablo veriliyor, veri
UYDURULMADI, gerçek çalıştırmadan alındı.

**Soru 3'ün cevabı: İNDEKS ARTIYOR, RENDER ÇALIŞIYOR, ÇUBUK DOĞRU
DEĞİŞKENİ OKUYOR — üçü de test edilen 3 modda ve 2 mekanizmada (normal
cevap + Atla) DOĞRU.** "Mantık hatası" / "UI güncelleme hatası" /
"yanlış değişken okunuyor" hipotezlerinin ÜÇÜ DE, bu koşullarda,
ELENDİ.

---

## 4) initAudio neden "ikinci kez" çağrılıyor — hipotez ÇÜRÜTÜLDÜ

**30 adımın HER BİRİNDE `"[audio-diag] play denemesi (initAudio)"` TAM
OLARAK BİR KEZ göründü** — hiçbir adımda iki kez değil. Görülen İKİNCİ
log satırı (`"[audio-diag] play denemesi (playQuestion)"`) **AYRI bir
tanı noktası, initAudio'nun TEKRARI DEĞİL** — kaynak kodun kendi notu
(`audio-engine.js:532-535`): *"app.js:playQuestion'ın KENDİ ayrı logu —
o bu fonksiyonu ÇAĞIRMIYOR, ensureAudioAlive()'ı DOĞRUDAN kendisi
çağırıyor."* Yani zincir şu: `goToNextRound()`'un başında **1 kez**
`audioEngine.initAudio()` (`app.js:7229`) → tur ilerler →
`playQuestion()` **KENDİ** `ensureAudioAlive()` çağrısını yapar (AYNI
fonksiyon DEĞİL, farklı log etiketiyle görünüyor) — bu, ses
motorunun HER round'da context'in canlı olduğunu İKİ AYRI KONTROL
NOKTASINDA doğrulaması, **round'un YENİDEN BAŞLATILDIĞININ kanıtı
DEĞİL.**

**Görev metninin hipotezi ("bu, atlamanın soruya geçmek yerine turu
YENİDEN BAŞLATTIĞINA işaret edebilir") bu ölçümde DOĞRULANMADI** — 30
adımın hiçbirinde `#gameChapterLabel`in AYNI kaldığı ya da GERİYE
gittiği (bir "yeniden başlama" işareti) gözlenmedi, her adımda tam +1
arttı.

---

## 5) challenge.results GERÇEKTEN kullanılıyor mu?

**EVET, doğrudan ölçüldü.** `#gameChapterDots`'un ürettiği sınıf dizisi
(`on`/`wrong`/boş), test script'inin gönderdiği doğru/yanlış SIRASIYLA
BİREBİR eşleşti — 3 modun 3'ünde de. Bu, `renderGameHeader()`'ın
`challenge.results[i]`'i okuduğunu (kod okumasıyla zaten bilinen,
`app.js:4290-4293`) CANLI ÇALIŞMADA da doğruluyor — başka bir değişken
(ör. `challenge.correct`in TEK SAYISI, ya da eski sayaç-bazlı desen)
OKUNMUYOR.

---

## EK TEST — parkur sınırı + sınav geçişi (görevde istenmedi, ama G304'ün
aynı deseni sınav/telafi'ye TAŞIDIĞI iddiasını da canlı doğrulamak için
eklendi)

`boost-mu-cut-mu`'da 14 adım (Pro simüle, "10 Soruluk Bölüm"), karışık
doğru/yanlış: **BÖLÜM 1/10→10/10 arası HER adımda +1, dots SIRAYLA
doğru.** 10. cevapta (`parkurCorrect>=6` koşulu sağlandığı için)
`screen-exam` GERÇEKTEN açıldı, `#exCta` ile geçildikten sonra
`#gameExamRow` görünür oldu, `#gameExamProgress` `"SINAV 1/4"`→`"SINAV
4/4"` arası HER adımda +1 arttı, `#gameExamDots` da SIRAYLA doğru/yanlış
işaretledi (G304'ün iddia ettiği "gerçek cevap sırası" davranışı canlı
doğrulandı). BÖLÜM çubuğu sınav fazına geçince (`examActive=true`)
BEKLENDİĞİ gibi gizlendi (`ghead-collapsed`) ve SON değerinde (10/10)
donuk kaldı — bu bir HATA değil, `showChapter = !boss && !examActive &&
isChallenge()` koşulunun (`app.js:4253`) doğal, kasıtlı sonucu.

---

## 6) 12 modun hepsi test edildi mi?

**HAYIR, 3'ü test edildi** (görevin istediği asgari sayı) —
`boost-mu-cut-mu`, `kesim-noktasi`, `db-seviyesi`. Bu üçü `.ans`
buton-tabanlı basit tek-şıklı modlar, script'in güvenilir gerçek-tıklama
mekanizmasını (`answerCorrectChoice`'ın deseni) doğrudan kullanabildi.
**Test EDİLMEYEN 9 mod, BELİRSİZ bırakıldı** — özellikle `reverb`/
`kompresor`/`distortion` (üç-yollu A/B/C karşılaştırma UI'ı, `.ans`
DEĞİL) ve `frekans-cakismasi` (çok aşamalı, farklı gönderim
mekanizması) FARKLI bir tıklama script'i gerektiriyor — bu turda süre
kısıtı nedeniyle KOŞULMADI. **Önceki Reverb "Atla" bulgusu (bkz.
OLCUM-SENKRON-18-08 C bölümü) bu 9 modun BİRİNDE, farklı bir mekanizmayla
(sınav parkur sınırı) zaten AYRICA doğrulanmıştı** — o bulgu bu raporun
konusu olan `challenge.results`/BÖLÜM render mekanizmasıyla İLGİLİ
DEĞİL, ayrı bir mekanizma.

---

## SONUÇ — çağrı zinciri + "hangi değer nerede kayboluyor"

**Zincir (ölçülerek doğrulanan hâliyle):**
```
kullanıcı cevap verir/Atla'ya basar
  → submit*Guess()/goToNextRound() → challengeTick(wasCorrect, xp)
    → challenge.done++ , challenge.results.push(!!wasCorrect)   [app.js:6492-6501]
  → renderGameHeader() → challenge.done/challenge.results OKUNUR
    → #gameChapterLabel/#gameChapterDots GÜNCELLENIR              [app.js:4290-4296]
```
**Bu zincirde, 30 canlı test adımının HİÇBİRİNDE, DEĞER KAYBOLMADI.**
`challenge.done` doğru artıyor, `challenge.results` doğru sırayla
doluyor, `renderGameHeader()` bunları doğru okuyup DOM'a doğru yazıyor.

**Görev metninin tarif ettiği belirti ("bölüm çubuğu HİÇ ilerlemiyor,
tüm modlarda") bu ortamda, standart oyun koşullarında (Pro simüle,
"10 Soruluk Bölüm" oyun türü, 3 farklı mod, hem normal cevap hem Atla,
parkur sınırı+sınav geçişi DAHİL) TEKRAR ÜRETİLEMEDİ.**

**Bu, sorunun cihazda GERÇEKTEN yaşanmadığı anlamına GELMİYOR** — ama
kodun/render zincirinin KENDİSİNDE bir mantık hatası olduğu hipotezini
BELİRGİN ŞEKİLDE ZAYIFLATIYOR. En tutarlı açıklama, bu raporun
**OLCUM-SENKRON-18-08**'de zaten bulduğu yapısal boşrukla ÖRTÜŞÜYOR:
`challenge.results[]` deseni SADECE **G276** (17 Ağustos 20:29,
`aac838b`) ile geldi, sınav/telafi'ye taşınması **G304** (18 Ağustos
23:12, `9ab0f38`) ile — İKİSİ DE bu haftanın SON birkaç saatlik dilimine
ait, ÇOK YENİ commit'ler. **Eğer Logic'in test ettiği cihaz build'i bu
İKİ commit'ten ÖNCEKİ bir `ios/App/App/public/` senkronuna dayanıyorsa,
çubuk GERÇEKTEN "hiç ilerlemiyor" görünür — ÇÜNKÜ ESKİ KOD, G276'dan
ÖNCEki sayaç-bazlı (`i<correctCount`) desenle çalışıyor OLABİLİR, ya da
DAHA ESKİSİ, hiç `challenge.results` YOKKEN.** Bu, KANITLANAMADI (cihaz
yok) — ama OLCUM-SENKRON-18-08'in A5/B6/B9 bulgularıyla (sync'in
otomatik olmaması, WKWebView önbelleğinin update'te hayatta kalabilmesi)
TAM tutarlı, TEK bir kök sebep ailesine işaret ediyor.

**Önerilen bir sonraki adım (ölçüm, ürün kararı DEĞİL):** cihazda bir
sonraki testten HEMEN önce tam silme+yeniden kurma yapılıp
`npx cap sync ios`'un o kurulumdan HEMEN önce çalıştırıldığı
doğrulanırsa, bu belirti (muhtemelen) kendiliğinden kaybolacaktır — bu
KANIT gerektiren bir ifade, "muhtemelen" kelimesi BİLEREK kullanıldı,
KESİN değil.

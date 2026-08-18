# OLCUM-SINAV-17-08

Ölçüm-only tur. KOD YAZILMADI, COMMIT ATILMADI. Kaynak: `www/js/core/
exam-system.js` (mekanizmanın TAMAMI burada, SAF/stateful bir fabrika),
`www/js/app.js`'in `showExamScreen()`/`handleExamOutcome()`/
`examGateActive()` fonksiyonları, 12 mod dosyasının `EXAM_ENABLED/
EXAM_DIFFICULTY/EXAM_WEAK_AREA` export'ları. Tüm sayılar `EXAM_CONFIG`
sabitinden (`exam-system.js:56-78`), tahmin edilmedi.

⚠️ **Ön koşul, ÖNCE belirtilmeli:** Sınav/telafi sistemi **SADECE Pro
kullanıcıda çalışır** — `app.js:1265-1267`: `examGateActive() = !!mode.
EXAM_ENABLED && isUserPro()`. Ücretsiz kullanıcı hiçbir modda sınav/telafi
GÖRMEZ (XP/seviye/rozet kazanmaya devam eder, sadece exam-tetikli bölüm
atlaması durur). "i" metni bunu en başta netleştirmeli.

## 1) SINAV NE ZAMAN AÇILIR?

**"10 soru sonunda mı?" — İKİ AYRI yoldan biri, biri ERKEN biri SONDA:**

Her mod kendi **10 soruluk "parkur"unu** takip eder (`PARKUR_LENGTH=10`,
`exam-system.js:57`). Sınav hakkı iki BAĞIMSIZ yoldan açılır:

- **a) KOMBO yolu (ERKEN):** parkur İÇİNDE (henüz 10. soruya gelmeden)
  **6 soruya PEŞ PEŞE doğru** (`COMBO_THRESHOLD=6`) cevap verilirse —
  `recordAnswer()`, satır 217 — sınav **TEKLİF EDİLİR** (`"exam-offer"`
  olayı), parkur BEKLEMEZ.
- **b) TOPLAM yolu (PARKUR SONUNDA):** kombo hiç 6'ya ulaşmadıysa (kırıldıysa),
  parkurun **10. sorusunun** sonunda TOPLAM doğru sayısı `TOTAL_THRESHOLD=6`
  veya üzeriyse sınav **OTOMATİK BAŞLAR** (`"exam-start"` olayı).

**Kullanıcı reddedebiliyor mu?** İKİ yol FARKLI davranıyor — bu ÖNEMLİ bir
ayrım, "i" metninde netleştirilmeli:

- **Erken (kombo) teklifi GERÇEKTEN reddedilebilir** — `showExamScreen("announce",
  {source:"offer"})`'in "Sonra" butonu `examSystem.declineEarlyExam()`'i
  çağırıp kullanıcıyı parkura GERİ döndürür (`app.js:3070-3072`). Aynı
  parkurda teklif BİR DAHA çıkmaz (`examOffered` bayrağı), ama TOPLAM yolu
  (10. soruda ≥6) hâlâ ikinci bir ihtimal olarak açık kalır.
- **Sonda (otomatik) başlayan sınav REDDEDİLEMEZ** — o dalda `ctx.source
  !== "offer"` olduğu için "Sonra" butonu `declineEarlyExam()`'i HİÇ
  çağırmıyor (`app.js:3071-3082`'nin `else` dalı) — SADECE menüye çıkıp
  turu terk ediyor (G287'nin "Çık turu terk eder" kararıyla AYNI: `activeQuestion=null`).
  Sınav DURUMU (in-memory `phase="exam"`) İPTAL OLMUYOR, sadece
  ERTELENİYOR — kullanıcının "hayır, sınava girmeyeyim, parkura devam"
  diyebileceği bir yol bu dalda YOK.

⚠️ **Terim çakışması, "i" metninde KARIŞTIRILMAMALI:** Ayarlar'daki "Oyun
Türü" seçeneği de "**10 Soruluk Bölüm** (+%50 XP)" diye adlandırılıyor
(`app.js:1261`, OLCUM-XP-17-08.md'de ölçüldü) — bu, sınav sisteminin
"parkur"uyla (da 10 soru) **AYNI SAYI ama TAMAMEN AYRI, İLİŞKİSİZ İKİ
kavram** (biri XP çarpanı için oyun modu seçimi, diğeri sınav-tetikleme
sayacı). Kod tabanında birbirinden bağımsız iki modül.

## 2) GEÇME KOŞULU

- **Soru sayısı:** `EXAM_LENGTH = 4` soru.
- **Geçme eşiği:** `EXAM_PASS_COUNT = 3` — yani **4 soruda 3 doğru (%75)**.
- **Zorluk — ÖNCEKİ ÖLÇÜMÜN İDDİASI DOĞRULANDI:** `mode.EXAM_DIFFICULTY`
  — **12 modun 12'sinde de değer `"pro"`** (grep ile TEK TEK doğrulandı,
  hiçbir istisna yok). `exam-system.js:questionTier()` (satır 173-177)
  `phase==="exam"` iken kullanıcının SEÇTİĞİ zorluğu (Otomatik/Sabit fark
  etmez) TAMAMEN görmezden gelip DOĞRUDAN `examDifficulty`'yi (yani "pro")
  döndürüyor — kullanıcı Seviye 1'de, "Kolay" sabit zorlukla oynarken bile
  sınav hakkı kazanırsa 4 soru HEP "Pro" tier zorluğunda soruluyor. **"Her
  zaman en zor kademede" iddiası DOĞRU.**

## 3) KALINCA NE OLUR?

- **10 soruluk parkur BAŞTAN mı başlar? EVET.** `exam-system.js:250-252`
  — sınav kaybedilince (`examCorrect < EXAM_PASS_COUNT`) `resetParkur()`
  ÇAĞRILIR, `"exam-failed"` olayı döner — **BASİT tutulmuş (G48'in kendi
  kararı): telafi YOK**, direkt taze bir 10 soruluk parkur.
- **Seviye düşer mi? HAYIR.** `es.examLevel`'e YAZAN TEK YER
  `"exam-passed"` dalı (`app.js:3225`, `es.examLevel = (es.examLevel||1)+1`)
  — `"exam-failed"` dalında `examLevel`'e dokunan HİÇBİR SATIR yok (grep
  ile doğrulandı). Ekranın kendi metni de bunu AÇIKÇA söylüyor
  (`app.js:3115`): *"Sınavı geçemedin — Sv {N} parkuru baştan başlıyor.
  Kazandığın XP duruyor, hiçbir şey silinmiyor."*
- **Ceza var mı? HAYIR — ne XP ne seviye kaybı.** Sınav sırasında yanlış
  cevaplanan sorular zaten normal `calculateXP()` kuralıyla 0 XP verir
  (OLCUM-XP-17-08'in bulduğu genel kural, sınava özgü bir CEZA DEĞİL) ama
  ÖNCEDEN kazanılmış hiçbir XP/rozet/mod-XP SİLİNMİYOR. Tek "bedel": yeni
  bir sınav hakkı kazanmak için parkuru (10 soru, 6 doğru/6-kombo) yeniden
  yapmak gerekiyor — ekranın kendi "Yeni hak: 6 doğruda tekrar" notu
  (`app.js:3119`) bunu doğruluyor.

## 4) TELAFİ ⚠️ ASIL SORU

**Telafi nedir, ne zaman devreye girer — G48'in KENDİ düzeltme notu ÇOK
NET (exam-system.js:11-22), ÖNEMLİ bir YANLIŞ VARSAYIMI düzeltiyor:**

> Telafi **SINAVDA KALINCA DEĞİL**, 10 soruluk **PARKURUN KENDİSİ**
> yetersiz bitince (toplam <6 doğru **VE** kombo hiç 6'ya ulaşmadıysa —
> yani sınav hakkı HİÇ KAZANILAMADIYSA) devreye girer.

Bu, `app.js`'in "makeup" ekranındaki kendi yorumunda da AYRICA
doğrulanıyor (`app.js:3135-3139`): *"tasarımın 'Sınavdaki üç hatanın
da...' metni YANLIŞ eksene bağlıydı — telafi SINAVDA kalınca DEĞİL, 10
soruluk PARKUR toplamda <6 doğruyla bitince başlıyor."* — yani PROJENİN
KENDİ tasarım taslağı bile bunu bir kez YANLIŞ yazmış, kod bunu G48'de
düzeltmiş. "i" metni yazılırken bu YANLIŞ çerçeveye (telafi=sınav-kalma
cezası) DÜŞÜLMEMELİ.

- **Otomatik mi geliyor? EVET, tamamen otomatik, reddedilemez bir teklif
  yok.** Parkurun 10. sorusu bitince `"remedial-start"` olayı DOĞRUDAN
  döner (`exam-system.js:236`), `app.js` bunu alıp `getWeakArea()` +
  `startRemedial(tier)`'i AYNI senkron çağrı zincirinde çalıştırır —
  kullanıcı arada BAŞKA bir soru GÖRMEZ. "makeup" ekranının SADECE "Telafi
  turunu başlat" / "Ana Ekran" (menüye çıkıp turu TERK et) seçenekleri var
  — erken sınav teklifindeki gibi bir "Sonra, parkura devam et" YOK.
- **Kaç soru? `REMEDIAL_LENGTH = 5`.**
- **Geçme koşulu: `REMEDIAL_PASS_COUNT = 3`** — yani **5 soruda 3 doğru
  (%60)**. Sınavın %75'inden BİLEREK daha yumuşak (kod yorumu: "telafi
  zorlaştırılmış DEĞİL, kullanıcının KENDİ zayıf noktasında bir pratik
  turu").
- **Hangi konuya odaklanıyor? MODA GÖRE DEĞİŞİYOR** (bkz. madde 6) — 5 mod
  (Frekans Bulma/Kesim Noktası/Q Genişliği/Boost-Cut/Frekans Çakışması)
  kullanıcının EN ZAYIF **frekans bölgesine** (`getWeakZone`, 6 bölge)
  odaklanır; diğer 7 mod (dB Seviyesi/Kompresör/Reverb/Tonal Denge/
  Distortion/Pan Konumu/Stereo Genişlik) EN ZAYIF **zorluk kademesine**
  (`getWeakTier` — easy/medium/hard/pro, normal parkur cevaplarından
  toplanan `tierStats`) odaklanır. Yeterli veri yoksa (< `MIN_TIER_SAMPLES=3`
  örnek) ikinci grupta "medium" kademesine düşülür.
- **Telafiden de kalınca ne olur? AYNI SONUÇ, SADECE FARKLI METİN.**
  `exam-system.js:257-266` — telafi biterken (`remedialIndex>=5`)
  `passed`/`failed` FARK ETMEKSİZİN `resetParkur()` İKİSİNDE DE çağrılıyor
  — mekanik SONUÇ (taze bir 10 soruluk parkur) BİREBİR AYNI, sadece
  `app.js`'in gösterdiği geri bildirim metni farklı: *"Telafiyi geçtin —
  parkura devam."* / *"Telafiyi geçemedin — parkur baştan başlıyor."*
  (`app.js`'in `appendExamNote()` çağrıları — bunların İKİSİNİN DE
  `showExamScreen`'in AYRI, tam-ekran bir kartı YOK, sadece normal cevap
  geri bildirim kartına EKLENEN bir cümle; sınav geç/kal'ın (announce/
  passed/failed) tam-ekran kutlaması/üzülmesi telafi sonucunda YOK).
  Telafiyi TEKRAR telafi GEREKTİRMEZ — sonsuz döngü riski yok, her iki
  çıktı da parkuru sıfırlar.

**"Arka arkaya 6 doğru yapan doğrudan sınava girer" (Logic'in tahmini) —
KISMEN DOĞRU, KISMEN YANLIŞ, netleştirilmeli:**
- DOĞRU kısmı: 6 peş peşe doğru GERÇEKTEN sınav hakkı açan bir tetikleyici
  (COMBO_THRESHOLD=6).
- YANLIŞ kısmı: "doğrudan" değil — 6. doğrudan hemen sonra kullanıcıya bir
  **TEKLİF** gösterilir (`"exam-offer"`, "Sınava başla"/"Sonra" seçenekli
  tam ekran), sınav SORULARI ancak kullanıcı "Sınava başla"ya BASARSA
  gerçekten başlıyor (`acceptEarlyExam()`). Otomatik/zorunlu olan yol
  BUDUR DEĞİL, madde 1'in TOPLAM yoludur (10. soruda ≥6 doğru).

## 5) examLevel NE YAPAR?

- **Sınav geçince ne değişir?** `es.examLevel = (es.examLevel||1)+1` —
  SADECE bu sayı 1 artar (`app.js:3225`). İLK değeri `examStatsFor()`'un
  lazy-init'inde `progress.modeLevel(stats, modeId)`'den (o ana kadarki
  GERÇEK XP seviyesi) alınır (`app.js:1346`) — sıfırdan başlamaz.
- **Soruların zorluğunu nasıl etkiler?** `progress.js:modeLevel()`
  (satır 62-67): `rawLevel` (XP'den, HİÇ durmadan büyümeye devam eder,
  arka planda "sessizce") ile `examLevel`'in **KÜÇÜĞÜNÜ** (`Math.min`)
  döner — yani examLevel, mod seviyesinin (ve `tierForLevel()` üzerinden
  "Otomatik" zorluk kademesinin) bir **TAVANI/KİLİDİ** gibi çalışıyor.
  XP kazanmaya DEVAM edersin (ölü/boşa gitmiyor) ama GÖSTERİLEN/OYNANAN
  seviye bir sonraki sınavı geçene kadar `examLevel`'de KİLİTLİ kalır —
  `difficulty-curve.js:104-117`'nin kendi yorumu bunu doğruluyor: "sınavı
  geçemeyen bir kullanıcı examLevel'i (progress.modeLevel()'ın SONUCUNU)
  HABERSİZDİR" notunun düzelttiği KÖK sorun tam olarak buydu (G49 teşhisi).
- **Üst sınırı var mı?** `es.examLevel`'in KENDİSİNE kod içinde bir tavan
  YOK (`(es.examLevel||1)+1` sınırsız artabilir, grep ile doğrulandı). Ama
  pratikte KONTROLSÜZ büyüyemez — `Math.min(rawLevel, examLevel)` yüzünden
  examLevel, GERÇEKTEN kazanılmış XP'nin (`rawLevel`) ÖNÜNE geçemez; yeni
  bir sınava hak kazanmak da o seviyede GERÇEKTEN oynamayı (parkur
  tamamlamayı) gerektiriyor. Ayrı bir kavram olarak `difficulty-curve.js`'in
  `LEVEL_CAP=20`'si VAR ama bu examLevel'i DEĞİL, "Otomatik" zorluk
  eğrisinin hassasiyet parametrelerini (gain/Q/süre) 20. seviyeden sonra
  SABİTLİYOR — seviye SAYISI (ve dolayısıyla examLevel) 20'den sonra da
  büyümeye devam edebiliyor, sadece o noktadan sonra "daha da zor" bir
  soru üretmiyor (OLCUM-XP-17-08'de ölçülen TIER_BOUNDARIES zaten 13+
  seviyeyi "pro" tier'e sabitliyordu).

## 6) 12 MODDA AYNI MI?

**Sistemin KENDİSİ (parkur/sınav/telafi sayıları) 12 modun 12'sinde
BİREBİR AYNI** — `EXAM_ENABLED=true` ve `EXAM_DIFFICULTY="pro"` grep ile
12/12 doğrulandı, `EXAM_CONFIG` (parkur/kombo/toplam/sınav-uzunluğu/
geçme/telafi sayıları) modlar arası PAYLAŞILAN TEK bir sabit
(`exam-system.js`, mod-agnostik) — her mod KENDİ sayısını TANIMLAMIYOR.

⚠️ **Dürüstlük notu — `core/progress.js`'in KENDİ yorumu ARTIK BAYAT:**
`progress.js:52-54`'te hâlâ *"sınav DESTEKLEMEYEN yedi mod için [examState]
alanı HİÇ var olmuyor"* yazıyor — bu, `app.js:954`/`app.js:1376-1377`'nin
AÇIKÇA belgelediği bir DÜZELTMEYLE (TUR8-OGRETIM-15-08) ARTIK GEÇERSİZ:
*"12 playable modun 12'sinde de EXAM_ENABLED artık true, 'diğer yedi mod'
diye ayrı bir grup KALMADI."* Yani BUGÜN sınav sistemi 12 modun HEPSİNDE
AYNI şekilde çalışıyor — progress.js'teki yorum GÜNCELLENMEMİŞ, kod
DAVRANIŞI DEĞİL.

**TEK gerçek fark — telafi HANGİ EKSENE odaklanıyor (madde 4'te de
geçti):**

| Grup | Modlar | Telafi neye odaklanır |
|---|---|---|
| "zone" (5 mod) | Frekans Bulma, Kesim Noktası, Q Genişliği, Boost mu Cut mu, Frekans Çakışması | En zayıf FREKANS BÖLGESİ (6 bölge, `zoneStats`) |
| "tier" (7 mod, varsayılan) | dB Seviyesi, Kompresör, Reverb, Tonal Denge, Saturation & Distortion, Pan Konumu, Stereo Genişlik | En zayıf ZORLUK KADEMESİ (easy/medium/hard/pro, `tierStats`) |

Bu ayrım `EXAM_WEAK_AREA="zone"` export EDEN/ETMEYEN mod dosyalarından
gelir — "frekans bulma" karakterli modlarda bölge kavramı ANLAMLI
(sürekli bir frekans ekseni var), diğerlerinde (tek parametre/three-way
kıyaslama) yok, bu yüzden zorluk kademesine düşülüyor. Her ikisinin de
soru SAYISI/geçme EŞİĞİ (5 soru, 3 doğru) AYNI — SADECE hangi soruların
seçildiği (hangi bölge/kademeye ağırlık verildiği) farklı.

## ÇIKTI — kullanıcıya anlatılabilecek sadelikte özet

| Ne | Nasıl işliyor |
|---|---|
| Kimde çalışır | SADECE Pro'da — ücretsizde sınav/telafi hiç yok |
| Sınav hakkı | 10 soruluk bir turda ya 6'sı peş peşe doğru (erken TEKLİF, reddedilebilir) ya da 10'da toplam 6 doğru (otomatik, reddedilemez) |
| Sınav | 4 soru, HEP en zor (Pro) zorlukta — 3 doğru gerekli (%75) |
| Sınavı geçersen | Seviye 1 artar, yeni 10 soruluk tur başlar |
| Sınavı geçemezsen | Seviye AYNI kalır, XP/rozet SİLİNMEZ, tur baştan başlar — telafi YOK |
| Telafi ne zaman | Sınav hakkı hiç kazanılamazsa (10 soruda 6 doğru da yok, kombo da yok) — OTOMATİK gelir |
| Telafi | 5 soru, zayıf noktana (bölge veya zorluk) odaklı — 3 doğru gerekli (%60) |
| Telafiyi geçsen de geçmesen de | Tur baştan başlar — fark sadece gösterilen mesaj |
| examLevel | Sınav geçtikçe artan bir "kilit" — XP kazanmaya devam edersin ama oynadığın zorluk bir sonraki sınava kadar bu seviyede sabit kalır |
| 12 mod | Sayılar (10/6/4/3/5/3) HEPSİNDE aynı — sadece telafinin odaklandığı şey (bölge mi kademe mi) 5 moda karşı 7 modda farklı |

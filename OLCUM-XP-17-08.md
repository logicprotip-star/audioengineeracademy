# OLCUM-XP-17-08

Ölçüm-only tur. KOD YAZILMADI, COMMIT ATILMADI. Amaç: "i" metnine
yazılacak XP/puan açıklaması için GERÇEK sayıları koddan çıkarmak.
Tüm değerler dosya:satır referanslı — hiçbiri tahmin değil.

## 1) TEMEL PUAN

**Doğru cevap → o modun o zorluk kademesindeki `DIFFICULTY[level].xp`
tabanından başlar**, sonra madde 2'deki çarpanlar uygulanır. Taban değer
moddan moda VE zorluktan zorluğa değişir (tam tablo madde 6'da).

**Yanlış cevap → 0 XP.** Her 12 mod dosyasının `calculateXP()`'si AYNI
ilk satırla başlıyor: `if (!result || !result.correct) return 0;` — XP
KAYBI yok (negatife düşmüyor), sadece KAZANÇ yok. (Can/life kaybı AYRI bir
sistem, bu ölçümün kapsamı dışında.)

**"Atla" → 0 XP, doğru/yanlış SAYILMAZ ama combo/parkur ilerlemesi
YANLIŞ gibi işler.** `app.js:6994` (`goToNextRound()`, cevaplanmadan
geçilirse): `challengeTick(false, 0)` — 0 XP, `correct=false` olarak
işleniyor (combo sıfırlanır, 10-soruluk bölüm/sınav sayaçları "yanlış"
kaydeder). ⚠️ Can KAYBEDİLMEZ — kod yorumu açık: "Can kaybı/loseLife()
BİLEREK ÇAĞRILMIYOR (kullanıcının açık talimatı: 'can kaybı davranışı
değişmesin')". Yani Atla: **XP'siz+combosuz ama cansız kayıp.**

## 2) ÇARPANLAR

Tüm 12 modun `calculateXP()`'si (9'u BİREBİR aynı, 3'ü ek çarpan taşıyor
— aşağıda ayrıca not edildi) şu ortak formülü kullanıyor:

```
raw = round( base × comboBoost × hintPenalty × bossBoost × timeBoost × xpMultiplier )
```

| Çarpan | Formül | Değer aralığı | Kaynak |
|---|---|---|---|
| **Zorluk tabanı** (`base`) | `DIFFICULTY[level].xp` | mod başına 14-58 (tam tablo madde 6) | her mod dosyası |
| **Combo bonusu** | `min(2.4, 1 + combo × 0.12)` | 1.00× (combo=0) → 2.40× tavan (combo≥11.67, pratikte 12+ üst üste doğruda tavana çarpar) | `app.js:2236` + her mod `calculateXP` |
| **İpucu cezası** | ipucu kullanıldıysa `×0.5`, yoksa `×1` | XP YARIYA düşer | her mod `calculateXP` |
| **Boss round bonusu** | `question.boss ? ×1.65 : ×1` | +%65 | her mod `calculateXP`, boss tanımı madde 6 altında |
| **Hız bonusu** (`timeBoost`) | `timeLeft > roundDuration×0.55 ? ×1.2 : ×1` | sürenin **>%55'i** kalmışken (yani sorunun ilk ~%45'lik diliminde) cevaplarsan +%20 | her mod `calculateXP`, `app.js:2239` |
| **10-Soruluk Bölüm bonusu** (`xpMultiplier`) | `challenge.active && "Oyun Türü"==="challenge" ? ×1.5 : ×1` | +%50 — VARSAYILAN açık oyun türü budur | `app.js:1261-1263` |

**Combo tam olarak nasıl işliyor:** `stats.combo` — her doğru cevapta
+1, her yanlış/Atla'da 0'a döner (global sayaç, moddan moda TAŞINIR —
mod değiştirmek combo'yu SIFIRLAMAZ, kod tabanında `stats.combo` TEK bir
alan). Örnek değerler: combo=1 → ×1.12, combo=5 → ×1.60, combo=10 →
×2.20, combo=12+ → ×2.40 (tavan).

**⚠️ ACADEMY_XP_MULTIPLIER (=3) — TEK BAŞINA XP FORMÜLÜNÜN BİR PARÇASI
DEĞİL.** Yukarıdaki `calculateXP()` formülüne HİÇ girmiyor —
`core/progress.js:97`'de tanımlı, SADECE Ana Menü'nün gösterdiği genel
"Akademi Seviyesi" rozetinin (mod seviyelerinden AYRI, tüm modların
TOPLAM XP'sinden hesaplanan) eşik eğrisini büyütüyor (`academyXpNeeded =
3 × xpNeeded`). Kod yorumunun kendi notu: "TASLAK/TAHMİNİ bir sabit —
playtest'le DOĞRULANMADI". Kazanılan XP MİKTARINI DEĞİL, akademi
seviyesine ULAŞMANIN ne kadar süreceğini etkiliyor. "i" metninde bu ayrım
NET yapılmalı — kullanıcı "3× XP alıyorum" sanmamalı.

## 3) SINAV

**Sınav AYRI bir XP ödülü VERMİYOR.** `app.js:3210-3221`
(`handleExamOutcome`, `"exam-passed"` dalı) SADECE `es.examLevel++`
yapıyor + kutlama animasyonu/ekranı gösteriyor — `diffState().xp +=` gibi
bir satır YOK. Sınav SIRASINDAKİ sorular NORMAL sorular gibi
`calculateXP()`'den geçip XP kazandırıyor (submit handler'ların ortak
kuyruğu, madde 1-2'deki AYNI formül) — `examXpSum` (app.js:3181) SADECE
bu sırada kazanılanı TOPLAYIP sınav ekranında GÖSTERMEK için bir
sayaç, EKSTRA bir XP kaynağı DEĞİL.

**Geçme/kalma farkı → XP DEĞİL, İLERLEME.** Geçersen (`exam-passed`):
`examLevel` artar (bir sonraki 10-soruluk "parkur" daha yüksek zorlukta
başlar → dolaylı olarak GELECEKTEKİ sorular daha yüksek `diff.xp`
tabanından XP verir, madde 6). Kalırsan (`exam-failed`): `resetParkur()`
zaten çağrılmış, parkur BAŞTAN başlar — XP KAYBI yok, sadece
ilerlemenin bir kısmı silinir.

**Telafi (remedial) turu farklı mı — HAYIR, XP AÇISINDAN AYNI.** Telafi
soruları da normal `calculateXP()`'den geçiyor, formülde "telafi" diye
ayrı bir dal YOK (`grep` ile doğrulandı — `remedial` kelimesi
`calculateXP()` içinde hiç geçmiyor). Tek fark: telafi turu zayıf
bölgeye/kademeye ODAKLANMIŞ sorular sunuyor (`getWeakArea`), XP hesabı
DEĞİŞMİYOR.

## 4) GÜNLÜK GÖREVLER

**3 sabit görev, HER GÜN AYNI 3'ü** (`storage.js:freshDaily()`, 290-292)
— rastgele SEÇİLMİYOR, gün değiştiğinde (`dailyKey()`, yıl-ay-gün) aynı
3 görev sıfırdan başlıyor:

| Görev | Hedef | Ödül |
|---|---|---|
| 5 tur oyna | 5 tur | **+40 XP** |
| 3 doğru yap | 3 doğru cevap | **+50 XP** |
| 2 combo yap | en az 2'lik combo | **+35 XP** |

Toplam günde **+125 XP** (üçü de tamamlanırsa). Ödül OTOMATİK veriliyor
(`app.js:3876-3882`, `updateDaily()`) — kullanıcı bir "topla" düğmesine
BASMIYOR, hedef karşılanır karşılanmaz XP anında ekleniyor + toast
gösteriliyor.

**⚠️ ÖLÇÜLEN, "i" metnini YAZMADAN ÖNCE bilinmesi gereken gerçek bir
davranış (düzeltme İSTENMEDİ, sadece raporlanıyor):** Üç görevin
ilerlemesi GÜNE ÖZGÜ bir sayaçtan DEĞİL, `stats.rounds`/`stats.correct`/
`stats.bestCombo` — yani UYGULAMA ÖMRÜ BOYUNCA biriken GLOBAL
sayaçlardan okunuyor (`app.js:3872-3874`: `task.value =
Math.min(task.target, stats.rounds)` vb.). `stats.rounds` hiçbir yerde
güne göre sıfırlanmıyor (`grep` ile doğrulandı — sadece tam
"İlerlemeyi sıfırla" ile sıfırlanıyor). **Sonuç:** ilk günden sonra
(lifetime toplamlar hedefleri zaten aştıysa, ki bir oturumdan fazla
oynayan HERKESTE bu böyle) yeni günün İLK cevaplanan sorusunda ÜÇÜ DE
ANINDA tamamlanıyor — o GÜN gerçekten 5 tur/3 doğru/2 combo yapılmasını
BEKLEMEDEN. "i" metni "her gün yeni bir hedef" gibi bir çerçeve
kullanırsa bu GERÇEK davranışla ÇELİŞİR — metin ya bu davranışı hesaba
katmalı (ör. "biriken toplamların hedefi geçmesiyle" gibi daha nötr bir
ifade) ya da kullanıcı "hiçbir şey yapmadan görev tamamlandı" görüp
kafası karışabilir.

## 5) SEVİYE EŞİKLERİ

⚠️ **İKİ AYRI "seviye" sayısı var, İKİSİ DE farklı eşik eğrisi
kullanıyor — "i" metninde KARIŞTIRILMAMALI:**

### 5.1 — MOD seviyesi (her modun KENDİ XP'sinden, `#levelChip`/lvlSheet'te gösterilen)

Formül: `xpNeeded(L) = 120 + (L-1) × 70` (`progress.js:3-4`) —
L'den L+1'e geçmek için gereken XP, DOĞRUSAL artıyor (her seviyede +70).
Aşağıdaki tablo `node`'da BİREBİR bu formülle üretildi (tahmin değil):

| Seviye | Bir sonrakine gereken XP | O seviyeye ULAŞMAK için kümülatif XP |
|---|---|---|
| 1 | 120 | 0 |
| 2 | 190 | 120 |
| 3 | 260 | 310 |
| 4 | 330 | 570 |
| 5 | 400 | 900 |
| 10 | 750 | 3.600 |
| 15 | 1.100 | 8.050 |
| 20 | 1.450 | 14.250 |
| 25 | 1.800 | 22.200 |
| 30 | 2.150 | 31.900 |

Bu, "Otomatik" zorluk modunda AYRICA zorluk KADEMESİNİ belirliyor
(`difficulty-curve.js:TIER_BOUNDARIES`): **Sv 1-4 Kolay, Sv 5-8 Orta, Sv
9-12 Zor, Sv 13+ Pro** — yani mod seviyen yükseldikçe hem sorular
zorlaşıyor HEM taban XP'n artıyor (madde 6'daki tablo).

### 5.2 — AKADEMİ seviyesi (Ana Menü rozeti, TÜM modların TOPLAM XP'sinden)

Formül: `academyXpNeeded(L) = 3 × xpNeeded(L) = 360 + (L-1) × 210`
(`progress.js:97-100`, `ACADEMY_XP_MULTIPLIER=3`). **Bu formül
"playtest'le DOĞRULANMADI" diye kodun KENDİSİNDE işaretli** — kesin/nihai
sayı olarak sunulmamalı.

| Seviye | O seviyeye ulaşmak için kümülatif TOPLAM XP | Unvan (`LEVEL_TITLES`) |
|---|---|---|
| 1 | 0 | Yeni Kulak |
| 3 | 930 | Ton Avcısı |
| 6 | 3.900 | Frekans Kaşifi |
| 10 | 10.800 | Denge Ustası |
| 15 | 24.150 | Miks Mimarı |
| 22 | 51.660 | Referans Kulak |
| 30 | **95.700** | Altın Kulak |

(Sv 30 kümülatif değeri — 95.700 — DURUM.md'nin "15 Ağustos 2026
DÜZELTMESİ" notundaki AYNI sayıyla çapraz doğrulandı, tutarlı.)

### 5.3 — Rozetler HANGİ SEVİYEDE açılıyor?

**Hiçbirinde — rozetler SEVİYEYE bağlı DEĞİL.** `progress.js:171-178`
(`ACHIEVEMENTS`, 6 rozet) TAMAMEN başarım-eşiği bazlı, "seviye N'de aç"
diye bir koşul YOK:

| Rozet | Koşul |
|---|---|
| Dinleyici | İlk doğru cevap |
| Ses Kaşifi | 5 combo |
| Miksçi | 25 tur tamamla |
| Ses Mühendisi | En az 20 turda %70 doğruluk |
| Mastering Mühendisi | Pro zorlukta 8 doğru |
| Altın Kulak (rozet) | Bir boss round kazan |

⚠️ Dikkat: "Altın Kulak" hem bir ROZET adı (yukarıda) HEM Sv 30 AKADEMİ
unvanı (madde 5.2) — kasıtlı bir çakışma (kod yorumu: "boss_win
rozetiyle çakışması KASITLI"), "i" metni yazılırken İKİSİNİN AYNI isim
ama FARKLI şey olduğu açıklığa kavuşturulmalı.

## 6) MOD BAZINDA FARK

**Evet, taban XP moddan moda GERÇEKTEN farklı.** Her modun kendi
`DIFFICULTY` tablosundan `xp` alanı (tam liste, tüm 5 kademe):

| Mod | Kolay | Orta | Zor | Pro | Pro Plus |
|---|---|---|---|---|---|
| Frekans Bulma | 16 | 24 | 36 | 52 | 45* |
| Kesim Noktası | 14 | 20 | 32 | 46 | 46 |
| Q Genişliği | 14 | 22 | 32 | 46 | 46 |
| Boost mu Cut mu | 16 | 24 | 36 | 52 | 52 |
| dB Seviyesi | 14 | 20 | 32 | 46 | 46 |
| Kompresör | 14 | 22 | 32 | 46 | 46 |
| Reverb | 15 | 23 | 33 | 48 | 48 |
| Tonal Denge† | 18 | 28 | 40 | 58 | 58 |
| Frekans Çakışması‡ | 16 | 24 | 36 | 52 | 52 |
| Saturation & Distortion | 14 | 22 | 32 | 46 | 46 |
| Pan Konumu | 16 | 24 | 38 | 54 | 54 |
| Stereo Genişlik | 16 | 24 | 38 | 54 | 54 |

*Frekans Bulma'nın Pro Plus'ı bu tabandan SONRA `× (isabet oranı) × 1.5`
ile ayrıca ölçekleniyor (çok-bantlı kısmi puanlama, madde altında).
†Tonal Denge'de EK bir `proximityBoost = max(0.55, yakınlık%/100)` çarpanı
var — cevap ne kadar HASSAS olursa XP o kadar yükseliyor (en kötü
durumda bile tabanın en az %55'i garanti).
‡Frekans Çakışması'nda AŞAMAYA göre ek çarpan var: **Aşama 1 (teşhis)
×0.8, Aşama 2 (karar) ×0.9, Aşama 3 (çöz) ×1.3** — sorunun ÇÖZÜMÜ en çok
XP veriyor.

**Boss round tanımı (tüm modlarda ORTAK, mod-BAĞIMSIZ):** `(stats.rounds
+ 1) % 5 === 0` (`frekans-bulma.js:310-312`, diğer modlar bunu
re-export ediyor) — yani **her 5. soruda BİR KEZ**, ama `stats.rounds`
GLOBAL/uygulama-ömrü sayacı olduğu için bu "her 5. TUR" HANGİ moddan
gelirse gelsin sayılıyor (mod-bağımsız, tek bir ortak ritim). Sınav
aktifken boss round HİÇ tetiklenmiyor (`app.js:6046`: `examActive ?
false : ...`).

**Pro/ücretsiz XP farkı — YOK.** `calculateXP()`'nin 12 kopyasının
HİÇBİRİNDE `isUserPro()` çağrısı yok (`grep` ile doğrulandı) — Pro
kullanıcı AYNI soruyu AYNI zorlukta cevapladığında AYNI XP'yi alıyor.
Pro'nun avantajı XP HIZI değil ERİŞİM (12 modun tamamı, oturum sınırı
yok, can sistemi hiç işlemiyor).

## ÇIKTI — kullanıcıya anlatılabilecek sadelikte özet tablo

| Ne | Etki |
|---|---|
| Doğru cevap | Zorluğa göre 14-58 XP (moda göre değişir) |
| Yanlış cevap / Atla | 0 XP (can kaybı ayrı, Atla'da can gitmiyor) |
| Üst üste doğru (combo) | Her doğruda biraz daha fazla XP, en fazla +%140 |
| İpucu kullanma | XP yarıya düşer |
| Boss round (her 5. soru) | +%65 XP |
| Hızlı cevap (sürenin >yarısı kalmışken) | +%20 XP |
| "10 Soruluk Bölüm" modu (varsayılan) | +%50 XP |
| Sınav | Ekstra XP vermez — sorular normal XP verir, geçmek seni bir üst zorluğa taşır |
| Günlük görevler (3 tane, sabit) | 5 tur=+40, 3 doğru=+50, 2 combo=+35 (toplamda +125) |
| Seviye atlamak | Zorluk artar, taban XP de artar — daha yüksek seviye = soru başına daha çok XP |
| Rozetler | Seviyeyle değil, ayrı başarımlarla açılır (ör. "25 tur tamamla") |
| Pro/ücretsiz | XP miktarında fark yok — Pro sadece daha çok mod/oturum açar |

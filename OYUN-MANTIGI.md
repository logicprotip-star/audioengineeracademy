# OYUN MANTIĞI

Audio Engineer Academy'nin ilerleme, zorluk ve ödül sistemlerinin düz anlatımı.
Teknik kaynak: `OYUN-DINAMIGI.md` (kod envanteri) ve `ZORLUK.md` (zorluk envanteri).
Bu belge onların okunabilir hali; sayılar koddan alınmıştır, tahmin yoktur.

Durum: 10.08.2026. G97'ye kadar olan değişiklikler dahildir.
Sondaki kararlar alınmış ve koda uygulanmıştır (G97).

---

## 1. TEMEL DÖNGÜ

Kullanıcı bir mod seçer, soru gelir, dinler, cevap verir, geri bildirim alır,
sonraki soruya geçer. Her doğru cevap XP kazandırır, her yanlış cevap can
götürür. XP biriktikçe o modun seviyesi yükselir, seviye yükseldikçe sorular
zorlaşır.

Üç ayrı sayaç aynı anda döner ve birbirine karışmaz:

**Bölüm sayacı** — 10 soruluk bir set. Üst bardaki 10 nokta bunu gösterir.
Tamamlanınca seans özeti açılır ve o setin XP'si %50 artırılır.

**Oturum sayacı** — uygulamayı açtığından beri kurulan tüm soruların sayısı.
Bölüm aktif olsun olmasın artar. Zorluk rampasını ve ücretsiz kullanıcının
5 soruluk sınırını besleyen sayaç budur.

**Yaşam boyu tur sayacı** — o modda toplamda kaç soru gördüğün. Kalıcıdır,
uygulamayı kapatınca sıfırlanmaz. Boss sorusunun ne zaman geleceğini bu
belirler.

---

## 2. XP VE SEVİYE

### XP nasıl hesaplanır

Her doğru cevapta taban bir XP vardır, üstüne çarpanlar uygulanır:

```
XP = taban × combo × ipucu cezası × boss × hız × bölüm bonusu
```

**Taban XP** moda ve zorluk kademesine göre değişir. Örnek olarak Frekans
Bulma'da kolay 16, orta 24, zor 36, pro 52. Tonal Denge daha yüksek
(18/28/40/58), Kompresör daha düşük (14/22/32/46). Her modun kendi tablosu var.

**Combo çarpanı** peş peşe doğru cevap sayısına bağlı: `1 + (combo × 0,12)`,
tavanı 2,4. Yani 12 doğru cevap üst üste geldiğinde XP iki katından fazla olur.
Bir yanlış cevap ya da süre dolması combo'yu sıfırlar.

**İpucu cezası** yarıya indirir. İpucu kullanılan sorunun XP'si 0,5 ile çarpılır.

**Boss çarpanı** 1,65. Boss sorularında geçerli.

**Hız çarpanı** 1,2. Sürenin %55'inden fazlası kalmışken cevaplarsan uygulanır.

**Bölüm bonusu** 1,5. 10 soruluk bölüm içindeyken tüm sorulara uygulanır.

İki modun kendine özel ek kuralı var. Frekans Çakışması'nda aşamaya göre çarpan
değişir: birinci aşama 0,8, ikinci 0,9, üçüncü 1,3 — yani en zor aşama en çok
ödüllendirir. Tonal Denge'de doğru-yanlış ikili değil derecelidir; ne kadar
yakın ayarladığına göre 0,55 ile 1 arasında ölçeklenir.

### Seviye eşiği

Bir seviyeden diğerine geçmek için gereken XP: `120 + (seviye − 1) × 70`.
Yani birinci seviye 120 XP, ikinci 190, üçüncü 260 diye artar. Doğrusal bir
artış — her seviye bir öncekinden 70 XP daha pahalı.

Her modun kendi XP havuzu ve kendi seviyesi var. Frekans Bulma'da seviye 8
olabilirsin, Reverb'de seviye 1.

### Akademi seviyesi

Ana ekranda ve İlerleme sekmesinde görünen genel seviye. Tüm modlarda
biriktirdiğin **toplam XP'den** hesaplanır ve kendi eğrisi vardır — mod
seviyesinden yaklaşık beş kat yavaş ilerler.

Bu, mod seviyelerinin toplamı değildir. Toplam olsaydı yeni bir mod eklendiğinde
kullanıcı hiçbir şey yapmadan seviye atlardı; ayrıca hiç oynamamış biri 10 modun
tabanından "seviye 10" görürdü. Toplam XP yöntemi mod sayısından etkilenmez.

---

## 3. ZORLUK

### Sürekli eğri

Zorluğun temeli 1'den 20'ye giden sürekli bir konumdur. Bu konum, senin o
moddaki kesirli seviyenden gelir — seviye 6'nın %40'ındaysan konum 6,4'tür.
Yuvarlama yoktur.

Konum arttıkça her modun parametreleri kendi eğrisiyle daralır. Frekans
Bulma'da çeldiriciler birbirine yaklaşır (1,2 oktavdan 0,52'ye), boost miktarı
azalır (10 dB'den 3,8'e), Q daralır. dB Seviyesi'nde seviye farkı küçülür
(3 dB'den 0,32'ye). Kompresör'de üç ses birbirine yaklaşır.

Seviye 20'den sonra kademe adı "pro"da sabit kalır ama parametreler daralmaya
devam eder — her ek seviyede biraz daha, bir tabana çarpana kadar.

### Kademe adları

Ekranda gördüğün "Kolay / Orta / Zor / Pro" etiketleri sadece isimdir:
seviye 1-4 kolay, 5-8 orta, 9-12 zor, 13 ve üstü pro.

Parametreler bu sınırlarda sıçramaz, sürekli akar. Yani "orta kademeye geçince"
aniden yeni bir şey açılmaz. Dört istisna var, bunlar gerçekten kademe adına
bağlı: Distortion'ın hangi doygunluk türünü çaldığı, Frekans Çakışması'nın şık
sayısı, Q Genişliği'nde frekansın sabit kalıp kalmadığı, ve Frekans Bulma'da
kolay/orta kademelerde sadece boost sorulması.

### Seans rampası

Her soru, tabanın etrafında salınan bir ofset alır. 10 soruluk bir bölüm boyunca
ofset −1,5'ten +1,0'a doğrusal olarak yükselir:

| Soru | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Ofset | −1,50 | −1,22 | −0,94 | −0,67 | −0,39 | −0,11 | +0,17 | +0,44 | +0,72 | +1,00 |

Yani bölüm ısınmayla başlar, zorlaşarak biter. Bu ofset 10 modda da aynıdır,
tek yerden hesaplanır.

**Rampa yalnızca Pro'da çalışır.** Ücretsiz kullanıcı oturum başına beş soru
oynuyor; on soruya yayılan bir eğri orada yarım kalır ve anlamsız bir salınım
yaratır. Ücretsizde zorluk tabandan gelir, ofset sıfırdır. Boss ofseti (+2,0)
her iki katmanda da geçerlidir.

Not: `session-plan.js` dosyası "3 kolay / 3 orta / 3 zor / 1 pro" mantığını
içeriyor ama hiçbir yerden çağrılmıyor. Silinmedi — fikir ileride lazım
olabilir; dosyanın başına kullanılmadığını belirten not düşüldü.

### Sabit zorluk

Kullanıcı otomatik zorluk yerine elle bir kademe seçebilir. O zaman gerçek
seviyesinden bağımsız olarak o kademenin temsilci noktası kullanılır — düşük
seviyeli biri "Pro" seçerse gerçekten 20. seviyenin zorluğunu alır.

Bu özellik Pro'ya özeldir; ücretsiz kullanıcıda otomatik zorluk çalışır.

---

## 4. BOSS

Her modun yaşam boyu tur sayacında beşte bir soru boss'tur. Ekranda BOSS
etiketi ve altın vurgu çıkar.

Boss sorusunda üç şey değişir: zorluk konumu +2,0 artar (rampanın en zor
noktasından bile yüksek), süre 2 saniye kısalır (en az 6 saniye), XP 1,65 ile
çarpılır.

Sınav ve telafi turlarında boss devre dışıdır.

**Boss'ta süre dolarsa can gitmez.** Soru kaçmış sayılır, XP verilmez, boss
çarpanı uygulanmaz, combo sıfırlanır. Gerekçe: boss zaten süresi kısaltılmış ve
bir üst zorluktan gelen bir sorudur; hem süre baskısı hem can cezası birlikte
uygulanınca kullanıcı sıkılır. Normal sorularda süre dolması davranışı
değişmedi — orada can gider.

---

## 5. CAN

Beş can vardır. Her yanlış cevap bir can götürür. Canlar bitince seans kapanır.

Dolum 30 dakikada bir candır. Zamanlayıcı canlar tam beşten düştüğü anda
başlar; sonraki kayıplarda yeniden başlamaz. Yani beşten dörde düştüğünde
sayaç kurulur, üçe düşmen sayacı bozmaz.

Dolum arka planda sürekli çalışan bir sayaçla değil, geçen gerçek zamana
bakılarak hesaplanır. Uygulama açıldığında, sekmeye geri dönüldüğünde ve
birkaç noktada kontrol edilir. Cihaz saati geriye alınırsa can verilmez.

Kullanıcı isterse ödüllü video izleyip hemen can alabilir. Zorunlu reklam yoktur.

---

## 6. SINAV VE SEVİYE ATLAMA

Sınav, seviye atlamanın kapısıdır. Ücretsiz kullanıcıda sınav yoktur — bu
Pro'ya özeldir.

Sınav dört sorudur, üçünü doğru bilmek gerekir. Geçilirse seviye yükselir.
Geçilemezse mevcut seviye tavan olarak kalır: XP birikmeye devam eder ama
zorluk parametreleri donar. Böylece sınavı geçemeyen biri XP topladıkça
imkânsız sorularla karşılaşmaz.

Sınavda can göstergesi yerine dört nokta çıkar.

**Telafi turu** parkur başarısızlığında gelir, sınavda kalınca değil. Beş soru,
üç doğru gerekir (bu oran korunacak). Frekans tabanlı dört modda (Frekans Bulma, Kesim Noktası,
Boost mu Cut mu, Q Genişliği) telafi zayıf frekans bölgenden gelir; diğer
modlarda zayıf zorluk kademenden.

---

## 7. BÖLÜM VE SEANS SONU

10 soruluk bölüm tamamlanınca seans özeti açılır: isabet halkası, XP kırılımı,
mod ilerlemesi, zayıf bölge notu.

Üç bitiş durumu var: kayıpsız bitiş, canların bitmesi, ücretsiz oturum sınırının
dolması.

**Pro'da bölüm bitiş ekranı açılmaz, yerini sınav alır.** Sınav sistemi aktifken
bölüm bitişi bastırılır. Gerekçe: Pro'da seviye atlamanın ödülü sınavı geçmektir;
kazanmanın hak edilmiş bir duruşu olmalı, iki ayrı kutlama birbirini
değersizleştirir. Bölüm bonusu (%50 XP) Pro'da da uygulanmaya devam eder,
sadece ekran gösterilmez. Ücretsiz kullanıcıda sınav olmadığı için bölüm bitiş
ekranı görünür.

---

## 8. ÜCRETSİZ VE PRO

Ücretsiz sürümde beş mod sınırsız açık: Frekans Bulma, Kesim Noktası,
Q Genişliği, Boost mu Cut mu, Kompresör. Frekans Çakışması günde bir kez
oynanır. Dört mod kilitli: dB Seviyesi, Reverb, Tonal Denge, Distortion.

Oturum başına beş soru sınırı vardır. Sınav, sabit zorluk seçimi, kendi dosyanı
yükleme, Araçlar sekmesi ve zayıf bölge raporu Pro'ya özeldir.

Fiyat ₺399, tek seferlik.

Ücretsiz katmanda seviye kilidi yoktur — kilitli mod kilitlidir, açık mod
sınırsızdır. Kullanıcı seviye bekleyerek takılmaz.

---

## 9. ALINAN KARARLAR VE GEREKÇELERİ

Aşağıdaki yedi karar 10.08.2026'da alındı ve koda uygulandı (G97).

**1. Ücretsizde seans rampası yok.** Beş soruluk oturumda on soruya yayılan
eğri kurulamaz. Ücretsizde zorluk düz, Pro'da ısınma eğrisi çalışır.
Boss ofseti ikisinde de aynı.

**2. `session-plan.js` silinmedi, işaretlendi.** Dosyanın başına kullanılmadığı
ve gerçek rampanın nerede olduğu yazıldı. Fikir ileride lazım olabilir.

**3. Boss'ta süre dolunca can gitmez.** XP verilmez, boss çarpanı uygulanmaz,
combo sıfırlanır. Süre baskısı ile can cezasının üst üste binmesi kullanıcıyı
sıkar.

**4. Pro'da bölüm bitiş ekranı yerini sınava bırakır.** Kazanmanın hak edilmiş
bir duruşu olmalı; iki ayrı kutlama birbirini değersizleştirir. Bölüm bonusu
(%50 XP) uygulanmaya devam eder.

**5. dB Seviyesi zorlaştırıldı, şık sayısı üçte kaldı.** Şıklar arası fark
daraltıldı: birinci kademede 1,5 dB'den 0,80 dB'ye. En dar noktada bile fark
toleransın (0,1 dB) sekiz katı — iki şık asla aynı cevaba denk gelmez.
Şık sayısını dörde çıkarmak yerine değer farkını daraltmak tercih edildi.

**6. Motor 2'de üç kart sabit kalır.** Kompresör, Reverb ve Distortion'da
kademe arttıkça kart sayısı artmaz. Gerekçe: "hangisi farklı" oyununda dört-beş
sesi arka arkaya dinlemek kulak yorgunluğu yaratır. Diğer yedi modun deseninden
bu yapısal fark kasıtlıdır.

**7. Distortion'ın tür sıçraması kalır.** Kademe sınırında doygunluk türünün
değişmesi (clip → soft → tube → tape) kasıtlıdır. Gerçek bir mix'te tek
doygunluk türü yoktur — aynı projede kick'te tape, vokalde tube, master'da clip
olabilir. Kulağın türler arası geçiş yapması gerçek çalışmayı yansıtır.

**Sonraki adım fikri:** ileri seviyelerde türü kademeye sabitlemek yerine aynı
seans içinde karıştırmak. Bir soru tape, sonraki clip. Gerçek mix'te olan tam
budur.

---

## 10. VERİYLE DEĞİŞECEK OLANLAR

Buradaki kararlar tahminle verildi; gerçek veri kullanıcıdan gelecek. Çoğu tek
bir sayı olduğu için geri bildirim geldiğinde değiştirmek ucuzdur: telafi eşiği
bir sabit, boss davranışı bir dal, dB şık farkı bir eğri değeri.

Belgenin amacı "neyi neden böyle yaptık" sorusuna cevap vermek — değişiklik
körlemesine olmasın diye.

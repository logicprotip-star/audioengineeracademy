# ROZET + TERİM REVİZYONU — öneri

_14 Ağustos. Karar Logic'in, bu bir başlangıç noktası._

---

# 1. ROZETLER

## Önce karar verilmesi gereken: 9 mu 6 mı?

Kodda 9 rozet var, hepsi **anlık eşik** mantığında:

| Rozet | Koşul | Ne ölçüyor |
|---|---|---|
| İlk Kulak | İlk doğru cevap | tek olay |
| Alev Zinciri | 5 combo | anlık seri |
| Şimşek Kulak | 10 combo | anlık seri |
| Dayanıklılık | 25 tur | toplam hacim |
| EQ Beyni | 100 tur | toplam hacim |
| Keskin Hedef | 20 turda %70 isabet | oran |
| Yükseliş | Level 5 | seviye |
| Pro Kulak | Pro zorlukta 8 doğru | zorluk |
| Boss Avcısı | Bir boss round kazan | tek olay |

Tasarımda 6 rozet var ve **süreklilik** mantığında (devirdeki not).

**Ayrım şu:** anlık eşik "bir kez yaptın, aldın" der. Süreklilik
"düzenli çalışıyorsun" der. İkincisi bir eğitim uygulamasına daha
uygun — SoundGym'in de zayıf yanı burası, rozetler oyunlaştırma
gibi duruyor, gelişim gibi değil.

---

## İsimler neden değişmeli

Mevcut isimler oyun rozeti kalıbı: "Şimşek Kulak", "Alev Zinciri",
"EQ Beyni". Senin işinin dili değil.

**İki yön var, birini seç:**

### Yön A — Stüdyo dili
Mesleğin içinden gelen ifadeler. Kullanıcı rozeti görünce
"bunu biliyorum" der.

| Şu an | Öneri | Neden |
|---|---|---|
| İlk Kulak | **İlk Kesim** | Mikste ilk müdahale |
| Alev Zinciri | **Seri** | Sade, ne olduğu belli |
| Şimşek Kulak | **Hızlı Karar** | Mikste hız gerçek bir beceri |
| Dayanıklılık | **Oturum** | Stüdyoda "oturum" = seans |
| EQ Beyni | **Kalibrasyon** | Kulak kalibrasyonu gerçek terim |
| Keskin Hedef | **İsabet** | Zaten kullandığın kelime |
| Yükseliş | **Seviye 5** | Süsleme yok |
| Pro Kulak | **Referans Kulak** | Referans = stüdyo terimi |
| Boss Avcısı | **Zor Karar** | Boss = zor mix kararı |

### Yön B — Düz ve sade
Rozet zaten ne yaptığını söylüyor, ad da onu tekrar etsin.
"5 Combo", "100 Tur", "Boss Turu", "Seviye 5".

Yalın, yaşlanmaz, çeviri sorunu çıkarmaz (İngilizce sürüm için
önemli).

---

## Benim önerim

**Yön A, ama azaltarak.** 9 rozet çok — kullanıcı hangisini
kazandığını takip edemiyor. Tasarımdaki 6'ya inmek doğru.

Elenecekler:
- **Şimşek Kulak** (10 combo) — Alev Zinciri'yle aynı şey, sadece
  sayı farklı
- **EQ Beyni** (100 tur) — Dayanıklılık'la aynı, sadece sayı farklı
- **Yükseliş** (Level 5) — seviye zaten ana ekranda görünüyor,
  rozet gereksiz

Kalan 6: İlk Kesim · Seri · Oturum · İsabet · Referans Kulak ·
Zor Karar

---

# 2. TERİMLER

## Kural önerisi

Türkçeleştirme kararı kelime kelime değil, **kurala göre** verilsin:

**İngilizce kalır** — Türkiye'deki stüdyolarda İngilizce
kullanılan, Türkçe karşılığı yerleşmemiş terimler:
`air` · `attack` · `release` · `ratio` · `threshold` · `pre-delay` ·
`decay` · `send` · `bus` · `gain staging` · `sidechain` · `transient`

**Türkçe olur** — Türkçe karşılığı yerleşmiş, herkesin anladığı:
`frekans` · `kesim noktası` · `genlik` · `faz` · `gecikme` ·
`yankı` (reverb'in kendisi değil, kavram olarak)

**Karma kalır** — İngilizcesi yaygın ama Türkçesi de anlaşılır,
ikisi birlikte kullanılır: `EQ (ekolayzır)` · `kompresör` ·
`reverb` · `pan`

---

## Bilinen düzeltme

**"tiz/hava" → "tiz/air"**

Sen bildirdin. 10-16 kHz üstü bölge için sektörde "air" kullanılıyor.
"Hava" diye çevirmek kullanıcıya yanlış terim öğretiyor — o kişi
başka bir kaynağa gittiğinde "air" görecek.

---

## Taranması gerekenler

Bu bir tarama işi, tek tek bakılmalı:

- [ ] Bant isimleri (SUB, BAS, ALT-ORTA, ORTA, ÜST-ORTA, TİZ)
      — hepsi doğru mu, "air" ayrı bant mı olmalı?
- [ ] 12 modun "i" (bilgi) metinleri
- [ ] Geri bildirim açıklamaları (her mod ayrı)
- [ ] Ölçüm Sonuçları tablosu (true peak, LUFS, RMS — bunlar zaten
      İngilizce, doğru)
- [ ] Tonal Balance metinleri
- [ ] Paywall ve ayarlar metinleri
- [ ] Rozet açıklamaları

---

# 3. SENDEN GEREKENLER

1. **Rozet sayısı:** 9 mu kalsın, 6'ya mı insin?
2. **İsim yönü:** A (stüdyo dili) mı, B (düz) mü?
3. **Tasarımdaki 6 rozet neydi?** Devirde "süreklilik mantığı"
   diye geçiyor ama isimleri/koşulları bende yok. Varsa at,
   ona göre bakarım.
4. **Sözlük:** 281 terimlik glossary'n var. Terim taraması için
   onu referans alabilirim — atarsan uygulamadaki metinlerle
   karşılaştırırım.

---

# NOT

Bu iş 1.0'a alındı ama yayını engellemiyor. Sözleşme, cihaz testi
ve hedef eğrileri önce gelir. Terim revizyonu metin işi — tek
oturumda, dinlenmiş kafayla yapılmalı.

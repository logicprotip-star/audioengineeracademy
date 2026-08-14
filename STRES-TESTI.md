# STRES TESTİ

Bu dosya, otomatik testlerin (`npm test`) kapsamadığı — gerçek cihazda,
gerçek işletim sistemi davranışıyla elle denenmesi gereken uç durum
senaryolarını listeler. Kaynak kod okunarak doğrulanamaz (bkz. CLAUDE.md).

**SON DURUM: 14 Ağustos 2026, iPhone (kabloyla kurulan Debug build).
14 maddenin 11'i denendi, 4 hata bulundu.**

---

## CİHAZ VE SES OTURUMU

**1. Ekran kilidi** — çalarken kilitle, 5 sn bekle, aç, play'e bas.
✅ **GEÇTİ** (14 Ağu) — ses kaldığı yerden geldi, uyarı çıkmadı.

**2-3. Kulaklık tak/çıkar (Bluetooth + kablolu)**
❌ **İKİ HATA BULUNDU** (14 Ağu):
- **#50 — Kulaklık çıkınca oyun DURMUYOR.** Ses telefon
  hoparlöründen devam ediyor, tur da devam ediyor. iOS standardı
  duraklatmaktır. Kulak eğitimi uygulamasında ayrıca zararlı —
  kullanıcı yanlış ekipmanla cevap verip can kaybediyor.
- **#51 — Hızlı tak/çıkar: 10 denemede 2 kez ses tamamen kesildi.**
  Ses geri gelmedi, uygulama sessiz kaldı. %20 başarısızlık.
  Route değişimi arka arkaya olunca ses motoru toparlayamıyor.

**4. Gelen arama** — oyun ortasında arama gelsin, bitince devam et.
✅ **GEÇTİ** (14 Ağu) — arama sırasında bile oynanabildi, sorun yok.

**5. 10 dakika arka plan** — bırak, geri dön.
❌ **HATA — #53:** Oyun kaldığı yerden devam etmiyor, **yeniden
başlıyor.** O turdaki cevap, süre, combo kayboluyor.
**KARAR (Logic): kaldığı yerden devam etsin, ücretsiz kullanıcıysa
CAN GİTMESİN.** Arka planda geçen süre kullanıcının hatası değil.
⚠️ Süre sayacı da durmalı — yoksa dönünce "süre doldu" diye can gider.
_Not: kısa arka plan dönüşleri çalışıyor (G134/G135), sorun UZUN sürede._

---

## SİSTEM DURUMLARI

**6. Düşük Güç Modu** — tüm modları gez.
⬜ **DENENMEDİ**

**7. Uçak modu** — uygulama açılıyor mu, modlar çalışıyor mu.
✅ **GEÇTİ** (14 Ağu) — uygulama ve modlar çalıştı. Reklam
başlatılamadı, **sağ üstte "reklam başlatılamadı" toast'ı çıktı** —
anlaşılır hata mesajı doğrulandı. Can/soru turu gelmedi (doğru).

**8. Depolama doluyken büyük dosya**
⬜ **DENENMEDİ**

**9. Sessiz anahtar açık/kapalı**
✅ **GEÇTİ** (14 Ağu) — 5-8 kez açıp kapatıldı, her seferinde
ses geldi. AVAudioSession playback kategorisi doğru çalışıyor.

---

## YÜK VE HIZ

**10. Art arda 10 moda hızlı girip çık**
✅ **GEÇTİ** (14 Ağu) — ses birikmesi/üst üste binme yok.

**11. Aynı oturumda 5 farklı dosya yükle**
🚫 **KAPSAM DIŞI** (14 Ağu, Logic kararı) — gerçekçi senaryo değil,
kimse art arda 5 dosya yüklemiyor.

**12. 100 MB sınırına yakın dosya**
✅ **GEÇTİ** (14 Ağu) — sınır üstünde uyarı veriyor, çökme yok.

**13. Çok kısa dosya (5 sn altı)**
🚫 **KAPSAM DIŞI** (14 Ağu, Logic kararı) — kimse 5 saniyelik
dosya yüklemiyor.
⚠️ **Yine de not:** kısa dosya Stereo Genişlik'in
`pickPlaybackOffset()` aramasını, Tonal Balance ortalamasını ve
LUFS integrated ölçümünü bozar. **Basit çözüm:** 15 saniyeden kısa
dosyayı reddet ve uyar. Uygulanmadı, karar bekliyor.

**14. Mono dosya**
⬜ **DENENMEDİ** — bunun yerine **#52 bulundu: AIF dosyası kabul
edilmiyor.** AIFF, Logic Pro'nun varsayılan bounce formatlarından
biri; hedef kitle prodüktör, çoğu AIFF kullanıyor. iOS AVAudioFile
AIFF'i destekliyor, teknik engel olmamalı.

---

## ÖZET — 14 Ağustos turu

| Sonuç | Adet | Maddeler |
|---|---|---|
| ✅ Geçti | 6 | 1, 4, 7, 9, 10, 12 |
| ❌ Hata | 4 | #50, #51, #52, #53 |
| ⬜ Denenmedi | 3 | 6, 8, 14 |
| 🚫 Kapsam dışı | 2 | 11, 13 |

**Denenmeyen 3 madde:**
- **6 — Düşük Güç Modu:** CPU kısıtlaması ses zincirini etkileyebilir,
  `requestAnimationFrame` yavaşlayabilir. Waveform ve analizör
  döngüleri var, denenmeli.
- **8 — Depolama dolu:** yarım kalan dosya kütüphanede bozuk kayıt
  bırakıyor mu.
- **14 — Mono dosya:** Stereo Genişlik/mid-side modüllerinde uyarı
  çıkıyor mu.

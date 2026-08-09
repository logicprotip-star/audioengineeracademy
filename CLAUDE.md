# CLAUDE.md

Bu dosya, bu repo üzerinde çalışan Claude Code için yönergedir.

## Proje

**Audio Engineer Academy** — Türkçe kulak eğitimi uygulaması. Web Audio API tabanlı,
Capacitor ile iOS/Android'e paketleniyor.

- Bundle ID: `com.logicprotrick.audioengineeracademy` (iOS ve Android'de AYNI — G60 öncesi
  iki platform farklı ID kullanıyordu, bkz. DURUM.md)
- Tasarım referansı: `Dizayn/prototype.html` (git'te takipli — UI değişikliklerinde buna bak)
- Backend yok, tüm veri `localStorage`'da
- Ürün modeli: ücretsiz + Pro (tek seferlik ₺399), 14 mod hedefi

> Not: Proje eskiden tek dosyalık `frekans-avi-3mod (14).html` idi. O mimari tamamen
> terk edildi. Tek dosya referansı içeren eski talimatları dikkate alma.

## Çalıştırma / test

```bash
npm test              # 46 test — her değişiklikten sonra çalıştır
python3 -m http.server 8000   # www/ altından servis et
```

Ses ve DOM davranışı kaynak koddan doğrulanamaz. Web Audio state-machine ve canvas
çizimi içeren değişiklikler tarayıcıda gerçekten bir tur oynanarak doğrulanmalı.

## Mimari
### Mod sözleşmesi

Her mod dosyası şunları dışa aktarır:

| Fonksiyon | Not |
|---|---|
| `getMeta` | mod meta bilgisi |
| `createQuestion` | **saf fonksiyon** — ses/DOM bağımsız |
| `applyProcessing` | ses zincirini kurar |
| `evaluateAnswer` | **saf fonksiyon** — ses/DOM bağımsız |
| `calculateXP` | |
| `getFeedbackData` | |

`createQuestion` ve `evaluateAnswer` saf kalmalı — testler bunlara dayanıyor.
Bu iki fonksiyona ses veya DOM bağımlılığı sokma.

### Ses motoru notları

- Tek paylaşılan `audioCtx` / `analyser` / `masterGain`, ilk kullanıcı etkileşiminde
  lazy oluşturuluyor (`unlockAudio()`). iOS için dummy-buffer unlock hilesi orada —
  kaldırma.
- Soru zinciri her turda sıfırdan kuruluyor, kalıcı graf mutasyonu yapılmıyor.
  Yeni kaynak/filtre eklerken bu deseni koru.
- Kullanıcı dosyası (`uploadedAudioBuffer`) alternatif kaynak olarak destekleniyor.
  `AudioBufferSourceNode` pause/resume desteklemediği için pozisyon elle takip
  ediliyor (`uploadOffset` / `uploadStartedAt`).

## Çalışan özellikler

Frekans Bulma modu (dokunmalı, logaritmik spektrum, oktav bazlı puanlama, ipucu, A/B),
ana menü, ilerleme sekmesi, ayarlar, kalibrasyon, satın alma ekranı,
6 frekans bölgesi (SUB / BAS / ALT-ORTA / ORTA / ÜST-ORTA / TİZ).

## Çalışma kuralları

- **Tahminle düzeltme yapma.** Cihaza özgü hatalarda önce Safari konsolundan ölçüm al.
- **Sayı uydurma.** Test veya ölçüm sonucu yoksa "doğrulanmadı" yaz.
- **Ürün kararı verme.** Fiyat, kilit seviyesi, mod sıralaması gibi kararlar kullanıcıya
  sorulur — makul görünen değer uydurulmaz.
- Her değişiklikten sonra `npm test` çalıştır ve sonucu raporla.

## Seans sonu zorunluluğu

Her seansın sonunda `DURUM.md` güncellenecek:

- **BİTTİ** — bu seansta tamamlananlar, commit hash'iyle
- **AÇIK İŞLER** — numaralı, her birinde sayısal kabul kriteri
- **BEKLEYEN KARARLAR** — kod değil, ürün kararı gerektirenler
- **SIRADAKİ** — tek bir sonraki adım

Bu dosya yeni sohbetlerin tek doğruluk kaynağıdır. Doğrulanmamış hiçbir şey
"bitti" olarak yazılmaz.

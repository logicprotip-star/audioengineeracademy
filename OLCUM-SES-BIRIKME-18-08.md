# OLCUM-SES-BIRIKME-18-08 — Ses birikmesi/üst üste binme (ölçüm)

**Görev tipi:** ÖLÇÜM. Kod değiştirilmedi, commit atılmadı (`git status --short`
bu turun sonunda SADECE `npx cap sync ios`'un dokunduğu `ios/App/App.xcodeproj/
project.pbxproj`'u gösteriyor — bu, önceki turdan kalma, bu ölçüm turunun
DOKUNMADIĞI bir dosya).

**Yöntem:** DEV_MODE=true olduğu için `window.__aeaSubmitAnswerForTest()`
kancası (gerçek `submitCakismaGuess()`'i çağırıyor) + gerçek `#nextBtn` tıklaması
kullanıldı. Ek olarak `AudioContext.prototype.createBufferSource`/`.connect`
monkey-patch'iyle HER kaynak node'unun yaşam döngüsü (oluşturuldu mu, start()
çağrıldı mı, stop() çağrıldı mı) + canlı tap `AnalyserNode` RMS'i izlendi.
Dört ayrı senaryo denendi: orta hızda 10 soru (150ms bekleme), gerçekçi-hızlı
10 soru (cevapla→hemen #nextBtn, ~110ms toplam bekleme), aşırı-hızlı 25 döngü
(hiç bekleme, arka arkaya), ve aşırı-hızlı sonrası ANINDA çıkış.

---

## 1) SORU GEÇİŞİ — ASIL YER

**Cevap verildiğinde çalışan fonksiyonlar** (Frekans Çakışması,
`submitCakismaGuess()`, `www/js/app.js:5281-5380`): sonuç hesaplanır,
istatistikler güncellenir, **stage 1/2'de `audioEngine.stopAudio()` ÇAĞRILIR**
(satır 5364), **stage 3'te BİLEREK ÇAĞRILMAZ** (satır 5358-5362 — "önce/sonra"
karşılaştırması için iki kaynağın DEVAM etmesi gerekiyor, bu KASITLI bir ürün
kararı, G51'den — `1c86464` — beri var). Sonda `scheduleNext(...)` bir
SONRAKİ soruyu 700ms (feedbackScreen kapalı) ya da 4000-6000ms (açık, varsayılan)
sonra otomatik başlatacak şekilde zamanlıyor — ya da kullanıcı `#nextBtn`'e
basıp bu beklemeyi ATLAYABİLİYOR (`goToNextRound()`, satır 7148, doğrudan
`startRound()`'u çağırıyor).

**Yeni soru kurulurken eski kaynaklar disconnect ediliyor mu? `buildDualSourceChain`
her soruda yeni node kuruyor mu?** EVET — `buildDualSourceChain()`
(`audio-engine.js:1146`) kendi BAŞINDA `stopAudio()` çağırıyor (satır 1147),
SONRA `audioCtx.createGain()`/`buildSampleSource()` ile TAMAMEN YENİ node'lar
kuruyor (satır 1156-1218) — "eski zinciri modifiye et" YOK, her soru sıfırdan.

**Eski node'lara ne oluyor?** `stopAudio()` (satır 611) paylaşılan
`currentNodes` dizisini iterasyona sokup HER node'un `.gain`'ini varsa
0.0001'e ramplıyor, `.stop()`'u varsa `now+0.08`'de çağırıyor, SONRA
(`DISCONNECT_DELAY_MS` sonra) `disconnect()` ediyor — bu MEKANİZMA
`buildDualSourceChain`'in kendi node'larını (out/compressor/gainA/gainB/
filterA/filterB/örnek kaynaklar) KAPSIYOR, mod-özel bir istisna YOK
(`currentNodes` TÜM modlar için PAYLAŞILAN tek dizi).

**⚠️ ASIL BULUNAN FARK — `playQuestion()`'ın cakisma dalı `await` ETMİYOR:**
`www/js/app.js:5625-5637`, yorum satırının kendi ifadesiyle ("BİLEREK await
edilmiyor", G129'da — `36539d2` — teşhis logu eklenirken belgelenmiş, davranışın
kendisi G51'den beri var):
```js
if (activeQuestion.mode === "cakisma") {
  audioEngine.buildDualSourceChain(activeQuestion, cakismaSourcesSpec(activeQuestion.pair), mode.applyProcessing)
    .then(() => { ... })
    .catch((err) => ...);
  return;   // ← playQuestion() HEMEN döner, chain-build'in bitmesini BEKLEMEZ
}
```
Diğer sekiz (tek-kaynaklı) modun aksine (`await audioEngine.buildQuestionChain(...)`,
satır 5654) — cakisma'da `playQuestion()` async chain-build'in TAMAMLANMASINI
beklemeden döner. `startRound()`'un kendisi de `playQuestion()`'ı `await`
etmiyor (satır 6293: `playQuestion(true);`, hiçbir modda await yok) — yani
bu asimetri "cakisma'ya ÖZGÜ bir ek gecikme kaynağı" değil, "cakisma'da chain-
build'in KENDİSİ playQuestion() seviyesinde de beklenmiyor" demek — race
penceresi diğer modlara göre TEORİK olarak biraz daha geniş.

**Race koruması VAR mı, çalışıyor mu?** `connectSource()` içindeki "sample"
dalı (satır 1190-1208) `await buildSampleSource(...)` SONRASI
`currentNodes.includes(out)` kontrolü yapıyor — eğer bu build ARADA
`stopAudio()` ile geçersiz kılınmışsa, örnek kaynağı BAĞLAMAK yerine
`sample.stop()` çağırıyor (satır 1197-1202). `Promise.all` SONRASI (satır
1218) İKİNCİ bir kontrol daha var (satır 1223: `if (!currentNodes.includes(out)) return;`)
— zincirin `out`'unu `muteGain`'e bağlamadan ÖNCE GÜNCEL olduğu doğrulanıyor.
**Playwright ölçümü bu korumanın ÇOĞUNLUKLA çalıştığını gösterdi** (aşağıya
bkz.) — ama TAM olarak sıfır artık bırakmıyor.

**Playwright ölçümü — aktif `AudioBufferSourceNode` sayısı:**

| Senaryo | Oluşturulan toplam | `.stop()` HİÇ çağrılmamış |
|---|---|---|
| Orta hız (150ms bekleme), 10 soru | 3 | 1 |
| Gerçekçi-hızlı (cevapla→hemen #nextBtn), 10 soru | 13 | **3** |
| Aşırı-hızlı (hiç bekleme), 25 döngü | 9 | **3, SABİT** (5→10→15→20→25. döngülerde HEP 3, BÜYÜMÜYOR) |

**Sonuç: birikme SINIRSIZ DEĞİL, SINIRLI (~2-3 node'da tavan yapıyor,
tekrar tekrar ölçüldü, hiçbir turda daha fazlası GÖRÜLMEDİ).** Bu, "her
soruda iki tane daha ekleniyor, hızlı cevapta katlanıyor" hipotezini
(kullanıcının kendi görev metnindeki DOĞRUSAL/katlanan birikme varsayımını)
**DOĞRULAMIYOR** — ölçülen davranış ÜST SINIRLI bir gecikme/örtüşme, sonsuza
kadar büyüyen bir sızıntı DEĞİL.

**Ama gerçekten sessizlik yok — RMS ölçüldü:** Aynı "gerçekçi-hızlı" 10 soru
sonrasında (hâlâ oyun ekranındayken, hiçbir çıkış yapılmadan) canlı tap
`AnalyserNode` RMS'i **0.0000'DAN 0.0055-0.0807 ARASINDA DEĞİŞTİ** (senaryoya
göre) — yani GERÇEKTEN duyulabilir bir kalıntı sinyal var, "aktif node
sayısı 2-3'te sabit" olması sesin duyulmadığı anlamına GELMİYOR (o 2-3 node
GERÇEKTEN çalıyor, sadece SAYIsı sınırsız büyümüyor).

---

## 2) GERİ BİLDİRİM ANI

**Geri bildirim gösterilirken ses durdurulmalı mı?** Bu bir ÜRÜN KARARI
sorusu — bu tur SADECE "kod ne yapıyor" ölçülüyor, "ne yapmalı" sorusuna
cevap verilmedi.

**Kod ne yapıyor?** Stage'e göre DEĞİŞİYOR:
- **Stage 1/2** (session'ın ilk 6 sorusu, `stageForIndex()`,
  `frekans-cakismasi.js:88-96`): `submitCakismaGuess()` cevap değerlendirilir
  değerlendirilmez `audioEngine.stopAudio()` çağırıyor (satır 5364) — geri
  bildirim ekranı AÇILDIĞINDA ses ZATEN durmuş oluyor.
- **Stage 3** (7. sorudan İTİBAREN, session sonuna kadar TÜM sorular —
  `stageForIndex(idx)` `idx>=6` için HER ZAMAN 3 dönüyor, yani bir "geçiş
  aşaması" DEĞİL, 10 soruluk bir Bölüm'ün SON 4 sorusunun TAMAMI): ses
  BİLEREK durdurulmuyor (satır 5358-5362, G51'den beri, "önce/sonra"
  karşılaştırması için). Geri bildirim gösterilirken İKİ kaynak da çalmaya
  DEVAM EDİYOR — bu KASITLI ama kullanıcının "cevap verildiğinde ses
  durmuyor" şikâyetiyle TAM örtüşüyor (özellikle 10 soruluk bir Bölüm'ün
  SON 4 sorusu — session'ın %40'ı — için doğru).

**⚠️ Önemli gözlem:** stage 3'ün stopAudio-atlaması TEK bir "geçiş aşaması"
değil, 10-soruluk normal bir Bölüm'de soru 7-8-9-10'un TAMAMINI kapsıyor —
yani "hızlı cevap" senaryosunda kullanıcı bu 4 soruyu ARKA ARKAYA
cevaplarken, HER birinde ses submitCakismaGuess()'te DURMUYOR, SADECE bir
SONRAKİ sorunun `buildDualSourceChain()`'i (kendi `stopAudio()` çağrısıyla)
DURDURUYOR — yani stage-3 bloğunda ardışık her geçiş, "cevapla → BEKLE →
yeni chain kur" yerine "cevapla → (SES DEVAM EDİYOR) → yeni chain HEMEN
kurulmaya başlıyor, KENDİ stopAudio()'su ile eskiyi durdurur" desenine
dayanıyor — G300'ün exit-time düzeltmesinden TAMAMEN AYRI bir mekanizma.

---

## 3) NEDEN G300 (CİHAZ İDDİASINA GÖRE) TUTMADI

**⚠️ Bu turda Playwright'ta G300'ün ÇALIŞTIĞI ölçüldü — cihaz iddiasıyla
ÇELİŞEN bir sonuç, BELİRSİZ olarak işaretleniyor (aşağıda gerekçesi var).**

**`performExit`'e eklenen `stopAudio()` gerçekten çağrılıyor mu?** EVET —
hem `__aeaStopAudioCallCount()` sayacının arttığı hem de canlı tap RMS'inin
çıkış SONRASI kesin biçimde 0'a indiği ölçüldü — **en zorlu senaryoda bile**
(25 döngülük aşırı-hızlı birikme SONRASI, RMS=0.0739 iken HİÇ bekleme
olmadan `#backBtn`→`#exitConfirmLeave`): çıkış sonrası 2 saniye boyunca
ÖLÇÜLEN RMS **kesintisiz 0** kaldı.

**Frekans Çakışması'nın çıkış yolu farklı mı?** HAYIR — `#backBtn` handler'ı
(`app.js:7414-7423`) TÜM modlar için AYNI (`activeQuestion` varsa
`openExitConfirm()`, yoksa doğrudan `performExit()`) — cakisma'ya özel bir
dal YOK, kod incelemesiyle doğrulandı.

**`stopAudio()` ikili kaynak zincirini kapsıyor mu?** EVET — `currentNodes`
TEK, PAYLAŞILAN bir dizi (mod-özel ayrı bir dizi YOK), `buildDualSourceChain`
kendi TÜM node'larını (out/compressor/gainA/gainB/filterA/filterB/örnekler)
BU diziye push ediyor (satır 1177, 1185/1189/1199/1207/1212) —
`stopAudio()`'nun `currentNodes.forEach` döngüsü (satır 626) BUNLARIN
TAMAMINI kapsıyor, mod ayrımı yapmıyor.

**Öyleyse neden cihazda tutmamış olabilir? (BELİRSİZ, tahmin değil, sadece
olası açıklamalar):**
1. **En olası:** Kullanıcının cihazda gördüğü "sesler üst üste biniyor" /
   "cevap verildiğinde durmuyor" şikâyeti muhtemelen **madde 1/2'de ölçülen
   DURING-PLAY örtüşmeyi** tarif ediyor (RMS gerçekten sıfır değil, kulakla
   duyulabilir) — bu, G300'ün kapsamındaki "ÇIKIŞTA durmuyor" sorunundan
   AYRI bir mekanizma (oynanış SIRASINDA örtüşme vs. round bittiğinde
   temizlik). G300 SADECE ikincisini düzeltti — kullanıcının "10 soru
   bitip ana ekrana dönülünce hâlâ çalıyor" cümlesi G300'ün TAM kapsadığı
   senaryo gibi görünse de, ASIL rahatsız edici olan (ve muhtemelen
   önceden fark edilmemiş) oynanış-sırası örtüşmesi olabilir.
2. **Doğrulanamayan olasılık:** iOS/WKWebView'ın gerçek Web Audio
   davranışı, headless Chromium'dan (bu ölçümün ortamı) FARKLI
   olabilir — CLAUDE.md'nin kendi uyarısı ("ses davranışı kaynak koddan
   doğrulanamaz") burada TAM olarak geçerli; bu turun Playwright ölçümü
   masaüstü Chromium'da yapıldı, GERÇEK cihazda DOĞRULANMADI.
3. **Doğrulanamayan olasılık:** kullanıcı G300'ü içeren build'i cihaza
   GERÇEKTEN kurmadan önce test etmiş olabilir (bu, ölçümle DOĞRULANAMAZ,
   sadece olası bir açıklama).

---

## 4) DİĞER MODLAR

**Tek kaynaklı modlarda da birikiyor mu?** EVET — Frekans Bulma ve Kesim
Noktası'nda AYNI "gerçekçi-hızlı 10 soru" senaryosu tekrarlandı:

| Mod | Oluşturulan toplam node | `.stop()` HİÇ çağrılmamış | RMS (10 soru sonrası) |
|---|---|---|---|
| Frekans Bulma (TEK kaynak) | 8 | 2 | **0.0834** |
| Kesim Noktası (TEK kaynak) | 8 | 2 | **0.0961** |
| Frekans Çakışması (İKİLİ kaynak) | 13 | 3 | 0.0050 |

**Sonuç: bu, cakisma'ya ÖZGÜ bir sorun DEĞİL** — tek-kaynaklı modlarda da
AYNI (hatta bu ölçümde SAYISAL olarak DAHA YÜKSEK) bir kalıntı RMS ölçüldü,
"unstopped node" sayısı da benzer küçük bir tavanda (2 vs 3) kalıyor. Bunun
kullanıcının "sadece Frekans Çakışması'nda katlanıyor" hipotezini
DOĞRULAMADIĞI, İKİ kaynaklı bir chain'in "her soruda iki tane ekleniyor"
varsayımının ÖLÇÜMLE DESTEKLENMEDİĞİ NET.

**Yorum (BELİRSİZ değil, ama ürün kararı DEĞİL — sadece gözlem):** cakisma'nın
kullanıcı tarafından ÖZELLİKLE fark edilmiş olması muhtemelen İKİ kaynağın
AYNI ANDA, BİRBİRİNE YAKIN FREKANSLARDA çalması nedeniyle örtüşmenin
PERSEPTÜEL olarak daha BELİRGİN/RAHATSIZ EDİCİ olmasından kaynaklanıyor
olabilir (iki farklı ses birbirine "karışıyor" hissi) — tek kaynaklı modlarda
AYNI türde bir RMS kalıntısı olsa bile, "eski ses ile yeni ses aynı
kaynaktan/benzer içerikten" olduğu için fark edilmesi daha ZOR olabilir. Bu
YORUM ölçülmedi, sadece bir hipotez.

---

## Özet

| Soru | Bulgu |
|---|---|
| Soru geçişinde node birikir mi? | SINIRLI birikir (~2-3 node tavanı, tekrar tekrar ölçüldü) — SINIRSIZ/katlanan DEĞİL |
| Node sayısı sabit ama ses duyuluyor mu? | EVET — RMS 0.005-0.096 arası, hiçbir zaman sessiz değil |
| Geri bildirimde ses durmalı mı (stage 1/2)? | EVET durduruluyor (kod, kasıtlı) |
| Geri bildirimde ses durmalı mı (stage 3, soru 7-10)? | HAYIR durdurulmuyor (kod, KASITLI — "önce/sonra" özelliği) |
| G300 çalışıyor mu (bu ortamda)? | EVET — en zorlu senaryoda bile çıkış sonrası RMS kesin 0 |
| G300 cihazda neden tutmamış olabilir? | BELİRSİZ — en olası açıklama: kullanıcının gördüğü OYNANIŞ-SIRASI örtüşmesi (madde 1/2), G300'ün kapsadığı ÇIKIŞ-sonrası temizlikten AYRI bir mekanizma |
| Sadece Frekans Çakışması'nda mı? | HAYIR — tek-kaynaklı modlarda da (hatta sayısal olarak DAHA YÜKSEK RMS ile) aynı örtüşme ölçüldü |

**Kök sebep adayı (düzeltme YAPILMADI, sadece işaretleniyor):**
`playQuestion()`'ın cakisma dalının `buildDualSourceChain()`'i `await`
etmemesi (`app.js:5630`, "BİLEREK") + stage 3'ün (soru 7-10, session'ın son
%40'ı) `submitCakismaGuess()`'te `stopAudio()`'yu atlaması (`app.js:5358-5362`,
"BİLEREK") — İKİSİ de kasıtlı tasarım kararları, ama BİRLİKTE "hızlı cevapta
sesler üst üste biniyor" hissini üretiyor OLABİLİR. Tek-kaynaklı modlarda da
benzer RMS ölçüldüğü için bu, cakisma'ya ÖZGÜ bir MEKANİZMA hatası değil,
genel bir "chain geçişi sırasında kısa bir örtüşme penceresi var" gerçeği —
düzeltme yapılacaksa ÜRÜN KARARI gerektirir (örn. stage 3'te de submit
anında stopAudio() çağırmak "önce/sonra" özelliğini BOZAR, bu yüzden kod
DEĞİŞTİRİLMEDİ, sadece ölçüldü).

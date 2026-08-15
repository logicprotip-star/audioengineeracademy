# TAM PROJE DENETİMİ — 15 Ağustos 2026

_Kaynak: 26 .md dosyasının TAMAMI · `git log --all` (339 commit) · `www/`
altındaki kod · `ios/`/`android/` yapılandırmaları._
_Kod yazılmadı, dosya değiştirilmedi, commit atılmadı — sadece ölçüm._
_Not: bu denetim OLCUM-15-08.md ve DENETIM-15-08.md'nin (aynı gün, önceki
iki tur) bulgularını içerir ve genişletir — o iki turda zaten doğrulanmış
noktalar burada TEKRAR ölçülmedi, sonuçları aktarıldı ve iki yerde kendi
hataları (bkz. C bölümü, madde "B2 düzeltmesi") burada da düzeltilmiş
hâliyle yer alıyor._

---

# A) YAPILANLAR — G-numarası / commit envanteri

339 commit'in **221'i G-numaralı** (G1-G214, bazı G-numaraları a/b/c alt-
commit'lere bölünmüş: G186a/b/c, G188a/b), **118'i** G-numarasız (erken
`M1-x` serisi + doküman-only commit'ler, hepsi G-sisteminden ÖNCEki temel
kurulum). Aşağıda SADECE bu oturumun kapsadığı G170-G214 aralığı ve
BEKLEYEN KARARLAR/AÇIK İŞLER'de adı geçen daha eski G-numaraları listeleniyor
— G1-G169 arası zaten DURUM.md'nin kendi BİTTİ bölümünde tam kayıtlı,
tekrar edilmedi.

| G# | Commit | Ne yaptı / hangi bulguyu kapattı | Belgeye işlendi mi |
|---|---|---|---|
| G170 | f4bfa12 | 13.08 akşam oturumu belge güncellemesi (idari, kod yok) | Doğal olarak başlıksız — belge işi |
| G174 | 581f798 | Çip genişlik eşitliği + mod geçişinde ilerleme sıfırlaması (Bug 1/2) | ✅ |
| G175 | a4efb42 | Kaynak çipi/menü uyuşmazlığı (Bug 7) + Reverb kontrol satırı taşması + BARE_ANALYZER idle boşluğu | ✅ |
| G176 | 664f1f1 | Süre göstergesi mod değişiminde sıfırlanmıyordu (Bug 19) + Bölüm çubuğu idle'da görünür oldu (Bug 17) | ✅ |
| G177 | — | Bug 20 (canlar bitince X çıkışsız) — screenStack çift-pop düzeltmesi | ✅ (G185'te genişletildi) |
| G178 | c960ce8 | Bug 22 (Pro+can bitmiş → oynanamıyor) — 3 fonksiyonda `isUserPro()` eksikliği | ✅ |
| G179 | 2d205e3 | Bug 24 — Oyun Türü değişimi Bölüm çubuğuna anında yansıyor | ✅ |
| G180 | 9f61003 | Bug 23 — Oyun Türü değişince `abLoopTimer` temizlenmiyordu | ✅ |
| G181 | 7b726cd | Bug 10 — 4 panel (Ayarlar/Bilgi/Kaynak/Çıkış) turu duraklatmıyordu | ✅ |
| G182 | 8f476fc | Bug 13+14 — Referans Filtreleri Mixini Yükle'den TAM bağımsız | ✅ |
| G183 | 1cd7dc3 | #15 (Reverb C kutusu) düzeltildi; #9/#18/#21 ölçüldü, karar bekletildi | ✅ |
| G184 | 548927c | #9 (feedback tıklanabilir) + #18 (Play ortalama) — kullanıcı kararıyla uygulandı | ✅ |
| G185 | 7723ff1 | Bug 25 — paywall'ın "iki farklı ekran" sorunu, 4 karar | ✅ |
| G186a | 136a7b0 | Soru sayacı paydası + Pro'da can göstergesi (#26) + dev-modda İsabet Grafiği kilidi (#27) | ✅ (G186 wrapper başlığı altında, "GRUP A") |
| G186b | b368f51 | Araçlar akordiyon karşılıklı dışlama (#31) + Tonal Balance bölge seçimi sekme değişiminde sıfırlanıyor (#30) | ✅ (G186 wrapper, "GRUP B") |
| G186c | 10af88e | Atla barı feedback yazılarını kesiyordu (#21) + Reverb C kutusu yeniden doğrulandı (#15) | ✅ (G186 wrapper, "GRUP C") |
| G187 | 09ade1d | Bug 29 — Frekans Bulma'da play/pause karışması (`freqTapTimer` hayalet gönderim) | ✅ |
| G188a | 4d0a50d | #36 — "Bugünün Önerisi" Pro'ya taşındı | ✅ (G188 wrapper, "COMMIT 1") |
| G188b | ac92e9a | Kesim Noktası (+3 mod) geri bildirim paneli üstü okunmuyordu | ✅ (G188 wrapper, "COMMIT 2") |
| G190 | ea776cb | "i" metinleri taraması + tutarlılık taraması | ✅ |
| G191 | 5d1e475 | Bant etiketi "TİZ / HAVA" → "TİZ" | ✅ |
| G192 | ff84cb2 | Bug 38 — Referans Filtreleri waveform (dolgu + seek) | ✅ |
| G193 | 21814c3 | Kesim Noktası (+3 mod) feedback paneli eğrileri örtüyordu | ✅ |
| G194 | d1aba0b | Bug #40 (Pro'da ücretsiz metinler) + #41 (Tonal Balance "i" sıralaması) | ✅ |
| G195 | 5bf473d | 3 küçük temizlik: kırık test notu, ölü dosya referansı, `abPressTimer` belgelendi | ✅ |
| G196 | 3502b0a | #45 waveform akıcılığı + #42 Pro'da "Pro'ya geç" düzeltildi | ✅ |
| G197 | 207bcdb | #44 eğri görünürlüğü — CSS özgüllük çakışması (`.fb-overlay` vs `.sheet-overlay`) | ✅ |
| G198 | 14ade68 | Rozet seti 9→6, yeni isim/ikon | ✅ (ama BEKLEYEN KARARLAR'ın "C" maddesi GÜNCELLENMEDİ — bkz. C bölümü) |
| G199 | c9a96b1 | Yanlış destek e-postası düzeltildi | ✅ |
| G200 | 382a0bd | Ölü dosya `www/app.js` silindi + rozet birim testleri | ✅ |
| G201 | 9813b75 | #47 (Mixini Yükle duraklat→başlat) + #48 (bölge solo) | ✅ |
| G202 | d2ce6c7 | #49b (kaldır) + #52 (.aif) + #49a (Dosyalarım temizleme) | ✅ |
| G203 | fd95936 | #50 (kulaklık) + #51 (route flapping) + #53 (uzun arka plan) | ✅ |
| G204 | 804bae4 | #56 — sekmeden çıkış Mixini Yükle'yi duraklatıyor, durdurmuyor | ✅ |
| G205 | fc25022 | #58 — Referans Filtreleri ilk görüntülemede dosyayı sahiplenir | ✅ |
| G206 | e42101d | #55 — Pro'da BÖLÜM göstergesi yeni parkurda sıfırlanıyor | ✅ (ama #54'ü KAPSAMIYOR — bkz. aşağı) |
| G207 | 42c2853 | Mağaza uyumluluk: Yakında/TASLAK/armv7/iPad/package.json/AD_ID | ✅ |
| G208 | 62da71f | #57 — Ölçüm Sonuçları geçmişi temizleme | ✅ |
| G209 | 17a115e | SON İŞLEMLERİM temizleme (G208'in kapsam dışı bıraktığı) | ✅ |
| G210 | a9afdd1 | 14 Ağustos devir belgeleri kaydedildi (idari, kod yok) | Doğal olarak başlıksız |
| G211 | 81dbb91 | 2 eksik devir belgesi + DEVIR-13-08'deki yanlış native-dosya notu | Doğal olarak başlıksız |
| G212 | bbf0d67 | Mono uyarısı — dual-mono (2ch, L=R) dosyalar da yakalanıyor | ✅ — **cihazda DOĞRULANDI** (DEVIR-15-08-SABAH.md: "Mono + AIF dosya yükleme ✅ kilitlenme yok") |
| G213 | 440b95b | BÖLÜM çubuğunda doğru/yanlış gösterimi (sınav/telafi'nin aynı deseni) | ✅ |
| G214 | 82f94e6 | #54 — "Atla" artık parkur/sınav/telafi sayaçlarını ilerletiyor | ✅ |
| — | a9d507c | DURUM.md:99 yanlış eşleştirme + GORSEL-TEST stale-durum notu düzeltmesi | ✅ (kendisi bir belge-düzeltme commit'i) |

**Commit var, belgede yok (gerçek eksiklik):** YOK. (Önceki DENETIM-15-08.md
"G186a/b/c + G188a/b'nin BİTTİ girişi yok" demişti — bu YANLIŞTI, bir grep
hatasıydı; ikisi de `^G186 —`/`^G188 —` wrapper başlıkları altında GRUP
A/B/C ve COMMIT 1/2 olarak tam belgeli. G170/G210/G211 zaten idari/belge
commit'leri, kod fix'i değil — başlıksız olmaları normal.)

---

# B) AÇIK OLANLAR

## B1 — Daha önceki iki turda (OLCUM-15-08.md, DENETIM-15-08.md) ölçülenler

Aşağıdaki 20 madde önceki iki turda TEK TEK ölçülüp doğrulandı, burada
sadece SONUÇ özetleniyor (tam gerekçe o iki dosyada):

| # | Durum | Kapatan/gerekçe |
|---|---|---|
| #22 (Pro+can bitmiş oynayamıyor) | KAPANMIŞ | G178 |
| #20 (canlar bitince X çıkışsız) | KAPANMIŞ | G177 (+G185) |
| #25 (paywall ilk/sonraki farkı) | BUG DEĞİL | G63/G165/G185 tasarımı |
| #29 (play/pause karışıyor) | KAPANMIŞ | G187 |
| #55 (12 modda sınav sayacı yolu) | BUG DEĞİL | mekanizma zaten tutarlı, Pro Plus istisnası ayrı ve bilinen |
| #54 (telafi/Atla ilerlemiyor) | **KAPANMIŞ (bu oturumda)** | **G214** |
| #15 (Reverb C kutusu) | KAPANMIŞ | G183/G186c |
| #18 (Reverb play ortalanmamış) | KAPANMIŞ | G184 |
| #19 (süre göstergesi eski modu taşıyor) | KAPANMIŞ | G176 |
| #23 (oyun türü değişince ikon karışıyor) | KAPANMIŞ | G180 |
| #30 (Tonal Balance bölge seçimi sekme değişiminde) | KAPANMIŞ | G186b |
| #31 (Ölçüm Sonuçları/Referans Filtreleri akordiyon) | KAPANMIŞ | G186b |
| #41 (Tonal Balance bölge açıklaması sırası) | KAPANMIŞ | G194 |
| #4 (analizör 4 modda aynı eğri) | BUG DEĞİL | G83 kasıtlı "sese kör" tasarımı, `drawSpectrumBackground` 7 modda TEK fonksiyon |
| #9 (feedback SONRAKİ SORU/ATLA basılamıyor) | KAPANMIŞ | G183 ölçtü, G184 düzeltti |
| #10 (panel açıkken tur/ses durmuyor) | KAPANMIŞ | G181 |
| #49 (silinen dosya modda seçiliyse) | KAPANMIŞ | G202 |
| #13 (Referans Filtreleri ses durdurulamıyor, G201 sonrası) | KAPANMIŞ | G182, G201/204/205 bozmadı |
| #24 (Bölüm çubuğu idle görünürlüğü) | **KISMEN GÜNCELLENDİ (bkz. B2)** | G176/G179 kodda kapalı |
| #36 ("Bugünün Önerisi" Pro'ya) | KAPANMIŞ | G188a |

## B2 — Bu turda YENİ doğrulanan / güncellenen

**#24 — Bölüm çubuğu idle görünürlüğü, artık netleşti.** Önceki tur bunu
"CİHAZDA ÖLÇÜLÜR, Playwright-vs-cihaz çelişkisi açıklanmamış" diye
bırakmıştı. `DEVIR-15-08-SABAH.md`'de 15 Ağustos cihaz turunda "**Bölüm
sayacı: ✅ 'BÖLÜM 2/10' doğru çalışıyor**" kaydı var — AMA bu, TAM-LISTE-14-08.md'nin
5 resmi cihaz-test maddesinden biri olan "Bölüm sayacı yeni parkurda
'BÖLÜM 2/10' oluyor mu" (G206'nın reset-davranışı) sorusuna cevap, GORSEL-TEST.md'nin
#24 kaydındaki "idle'da HİÇ görünmüyor" (G176'nın idle-görünürlük
davranışı) sorusuna DEĞİL — ikisi aynı özellik alanını (BÖLÜM göstergesi)
paylaşıyor ama farklı iki mekaniği test ediyor. **Sonuç: G206'nın kısmı
cihazda doğrulandı; G176'nın idle-görünürlük kısmı hâlâ resmi 5 maddelik
listede yer almadığı için AÇIKÇA yeniden test edilmedi** — genel "sekme
değişimi ✅" ve sorunsuz geçen geniş cihaz turu göz önüne alınca
YÜKSEK OLASILIKLA sorun yok, ama BELİRSİZ olarak bırakılıyor (kesin
"KAPANMIŞ" denemez, kesin "DURUYOR" da denemez).

## B3 — "Kapatılmayacak" diye kayıtlı 9 bilinen açık — hâlâ geçerli mi

(TAM-LISTE-14-08.md bölüm 9, `BİLİNEN AÇIKLAR — kapatılmayacak` DURUM.md'de)

| Açık | Hâlâ geçerli mi |
|---|---|
| Günlük görev sömürüsü (`dailyKey()` saat oynatma) | **GEÇERLİ** — sunucusuz mimaride yapısal, kod DEĞİŞMEDİ |
| Can dolumu saat manipülasyonu | **GEÇERLİ** — BEKLEYEN KARARLAR "D"de kalıcı çözüm YÖNÜ belirlendi (sunucu zamanı, reklam entegrasyonuyla birlikte) ama HENÜZ KODLANMADI |
| SSL sertifikası (28.02.2027) | **GEÇERLİ** — takvim hatırlatması, kod dışı |
| Kendi reklamına tıklama | **GEÇERLİ** — yapısal AdMob kısıtı |
| `abPressTimer` round'a bağlı değil | **GEÇERLİ** — G195'te belgelendi, "yanlış cevap göndermiyor" güvencesiyle bilerek bırakıldı |
| "10 sn ileri/geri" elapsed metnini güncellemiyor | **GEÇERLİ** — G201'de bulundu, önceden de varmış, dokunulmadı |
| Gate paneli flash'ı | **GEÇERLİ** — kozmetik, dokunulmadı |
| Eski Connect kaydı ("Frequency Ear Trainer") | **GEÇERLİ** — Apple tarafında silinemiyor, zararsız |
| SKAdNetwork sadece 1 kayıt | **GEÇERLİ** — mediation yoksa sorun değil, karar zaten "böyle kalsın" |

**Sonuç: 9/9 hâlâ geçerli, hiçbiri kazara kapanmamış/açılmamış.**

## B4 — Karar bekleyen TÜM maddeler (BEKLEYEN KARARLAR, DURUM.md)

16 madde. Harfler DURUM.md'nin kendi etiketleme sistemi.

| Harf | Konu | Durum |
|---|---|---|
| W | Pro Plus bölüm/sınav sistemine dahil değil | AÇIK — 3 seçenek sunulmuş (dahil et / dar düzeltme / dokunma) |
| R | Stereo Genişlik "her zaman upload" | AÇIK — ama pratikte #29 maddesiyle (aşağı) ÇAKIŞIYOR, aynı konunun iki yüzü |
| P | "Kendi Referansım" DSP parametreleri (Q=2.5) kullanıcı onayı olmadan seçildi | AÇIK — G158'de bilerek yayına açıldı, TestFlight'a bırakıldı |
| Q | En fazla 5 kayıtlı referans, onay olmadan seçildi | AÇIK — düşük öncelik |
| N (G106) | Ölçüm motoru süre artışı (+39%) kabul edilebilir mi | AÇIK |
| O | Bant bazlı mono kaybı sızıntısı düzeltilsin mi | AÇIK — N'yle (G106) ters yönlü bir mühendislik ödünleşimi |
| M | Referans Filtreleri gerçek DSP ne zaman | **STALE OLABİLİR** — DEVIR-14-08-2026.md: "Referans Filtreleri DSP'si ÇALIŞIYOR, devirdeki 'filtre sesi değiştirmiyor' notu geçersiz, cihazda doğrulandı" diyor. Bu karar maddesi G101'den kalma, G117'nin gerçek DSP eklemesinden SONRA güncellenmemiş olabilir — **BELİRSİZ, DURUM.md'nin M maddesiyle DEVIR-14-08'in notu birbirini ÇELİŞİYORMUŞ gibi görünüyor, netleştirilmeli** |
| **C** | **Rozet sayısı/seti** | **STALE, YANLIŞ — bkz. C bölümü, ayrıntılı** |
| D | Can dolumu — yön belirlendi, kodlanmadı | AÇIK — reklam entegrasyonuyla birlikte yapılacak, kasıtlı erteleme |
| F | "Tekrar Çal" butonu kapsamı (sentetik kaynaklarda anlamsız) | AÇIK — küçük, düşük öncelik |
| H | Dar odak aralığında Pro Plus bant sayısı | AÇIK — test güvenli tarafta, ürün kararı beklemede |
| I | İsimlendirme tutarsızlıkları (5 maddeden kalan 2'si) | KISMEN AÇIK — madde 4 (paywall "5/10 soru" metni koddaki gerçekle uyuşmuyor) hâlâ açık |
| K | Pro'da "done" ekranı hiç tetiklenemiyor | AÇIK — kasıtlı mı regresyon mu belirsiz, karar bekliyor |
| N (G122) | Mid/side genişlik tekniği kulakla doğrulanmadı | AÇIK — DEVIR-15-08-SABAH.md'nin stres/kulak testleri arasında YOK, hâlâ geçerli |
| V | İlk sürüm dil kapsamı — sadece Türkçe | KARARLAŞTIRILDI (G170), `#langSeg` kodda iki seçenek göstermeye devam ediyor ama BİLEREK dokunulmadı |

**YENİ, HENÜZ KARAR MADDESİ AÇILMAMIŞ bulgu (DEVIR-15-08-SABAH.md'den):**
**"Pop/EDM tek eğri mi?"** — hedef eğri ölçümünde Levels (EDM) ile 5 Türkçe
pop parçasının bant profili AYIRT EDİLEMİYOR. Bu, DURUM.md'nin BEKLEYEN
KARARLAR listesine HİÇ girmemiş, sadece DEVIR-15-08-SABAH.md'de (henüz
DURUM.md'ye işlenmemiş, taze bir bulgu) var — **yayın öncesi karar
gerektiriyor** (bkz. D bölümü).

## B5 — Yayın öncesi maddeler (AD_TEST_MODE, build numarası)

Bkz. E) bölümü — burada tekrar edilmiyor, ikisi de hâlâ tamamlanmamış
durumda (kod tarafı: `true`/`1`/`1.0`, bilerek — yayın ANINDA değişecek).

---

# C) GİZLİ / BELGELENMEMİŞ

## C1 — Rozet taraması (bu turda istenen özel tarama)

**Eski 9 rozet isminden (İlk Kulak/Alev Zinciri/Şimşek Kulak/Dayanıklılık/
EQ Beyni/Keskin Hedef/Yükseliş/Pro Kulak/Boss Avcısı) HİÇBİRİ kodda YOK.**
`progress.js:152-158`'deki güncel 6 rozet (Dinleyici/Ses Kaşifi/Miksçi/Ses
Mühendisi/Mastering Mühendisi/Altın Kulak) doğrulandı, `renderAchievements()`
tek kaynaktan besleniyor. Eski ID'ler (`combo_10`/`round_100`/`level_5`)
SADECE migration yorumlarında ve `test/progress.test.mjs`'in kasıtlı
geriye-uyumluluk testinde var (kullanıcıya görünmüyor, doğru davranış).
"Çırak Kulak" bir ROZET DEĞİL — `progress.js:121`'deki Seviye 1 başlığı,
ayrı bir sistem, G198'in hiç kapsamadığı bir alan.

**AMA — DURUM.md'nin KENDİSİ tutarsız:** BEKLEYEN KARARLAR "C" maddesi
hâlâ *"kod hâlâ TAM 9 rozet tanımlıyor... isimler örtüşmüyor"* diyor —
bu G198'den (14 Ağustos) ÖNCEki bir durumu anlatıyor ve G198 sonrası HİÇ
güncellenmemiş. **Bu, projenin kendi belgesinin kendi BİTTİ kaydıyla
ÇELİŞTİĞİ somut bir örnek** (bkz. Liste 3, madde 1).

## C2 — Tekrar eden kök sebep kalıplarının dördüncü örnekleri

**IDLE vs ROUND:** Bu turda (önceki DENETIM-15-08.md'de) `enterMode()`'un
TAM sıfırlama listesi çıkarıldı ve `renderGameHeader()`'ın `updateUI()`
zincirinden (dolayısıyla `enterMode()`'dan) çağrıldığı doğrulandı —
BÖLÜM/sınav/combo göstergeleri için AYRI bir "güncellenmiyor" boşluğu
YOK. `stats.combo`'nun mod değişince sıfırlanmaması KASITLI (XP/Level gibi
mod-bağımsız bir seri). **Dördüncü GERÇEK bir örnek bu turda da
BULUNAMADI** — Bug 2/6/7/17/19'un hepsi kapalı, taranan ek state'lerde yeni
bir örnek çıkmadı (kapsamlı ama TAM olmayan bir tarama — her modun kendi
iç değişkeni tek tek denenmedi, ama `activeQuestion=null` sıfırlamasının
ardından bunların hepsi doğal olarak okunmaz hale geliyor, yapısal olarak
düşük risk).

**CSS ÖZGÜLLÜK ÇAKIŞMASI:** G197'nin kendisi (`.fb-overlay` vs
`.sheet-overlay`) ve #15/#18'in G183/G184'teki `.abside`/`#abToggle.game-ctrl-ab`
özgüllük yükseltmesi zaten iki bilinen örnek. Tüm `styles.css`'i
sistematik taramak (binlerce kural) kaynak-okumayla pratik değil — statik
CSS analiz aracı gerekir, burada yok. Yeni bir örnek bu turda BULUNMADI
ama YOK diye garanti de edilemez — **BELİRSİZ**.

**PAYLAŞILAN MANAGER ÇAKIŞMASI:** 5 ayrı `createUploadManager()` örneği
doğrulandı (`uploadManager`, `uploadManagerA/B`, `tonalRefUploadManager`,
`toolsRefFilterUploadManager`, `toolsRawMixUploadManager`) — hiçbiri
paylaşılmıyor, G201/G204/G205 SADECE `toolsRawMixUploadManager`'a dokundu.
**Yapısal olarak KAPANMIŞ.** 4 oynatıcının (Mixini Yükle/Referans
Filtreleri/Tonal Balance ×2) AYNI ANDA canlı çaldırıldığı bir çapraz-test
bu denetimde de YAPILMADI — küçük bir kalan boşluk.

## C3 — Ölü kod / TODO-FIXME / konsol kalıntısı

- 1 TODO (`difficulty-curve.js:42`, belgeli, bilerek bırakılmış placeholder).
- 43 `console.log`/`warn` çağrısı (44 değil — ilk sayımda 1 yorum satırı
  yanlışlıkla sayılmıştı, düzeltildi), HEPSİ etiketli tanı logu
  (`[audio-diag]`/`[filepicker-diag]`/`[upload-diag]`/`[upload-context]`/
  `[guide-i-diag]`/`[scroll-diag]`/`[filepicker]`/`[analiz]`) — kazara
  unutulmuş çöp DEĞİL, bilerek eklenen tanı altyapısı. Yayın build'inde
  bırakılsın mı temizlensin mi ürün kararı.
- **YENİ bulunan (bu turda, eski DENETIM.md'nin 10.08 tarihli D4 maddesiyle
  çapraz kontrolde):** `renderToolBars()` (eski "sahte Analiz kartı"
  render fonksiyonu, o zaman "zararsız no-op" olarak not edilmişti) ARTIK
  KODDA YOK — `grep` sıfır sonuç verdi. Muhtemelen G117+ döneminde (Araçlar
  yeniden yazılırken) tamamen silinmiş. **Eski denetimin bu maddesi artık
  STALE, sorun kalmamış.**

## C4 — Belge ile kod arasındaki her uyuşmazlık

Bkz. Liste 3 (sondaki dört liste) — burada tekrar edilmiyor, tam liste
orada.

---

# D) İLERİDE / NOT ALINANLAR

Belgelerde "1.1", "fikir aşamasında", "zaman kalırsa", "ayrı oturum" diye
geçen maddeler (DURUM.md `İLERİ SÜRÜM FİKİRLERİ` + `DURUM-OZET.md`
`📦 İLERİ SÜRÜM` + `TAM-LISTE-14-08.md` bölüm 8 — üçü de büyük ölçüde AYNI
listeyi farklı zamanlarda yazmış, birleştirildi):

| Konu | Yayın ÖNCESİ karar mı gerektiriyor? |
|---|---|
| Karşılaştırmalı dinletme (yanlış+doğru arka arkaya) | HAYIR — 1.0/1.1 kararı zaten "belki 1.0" diye açık, ama bloklamıyor |
| Frekans zayıflık haritası (trend + diğer modlara yayma) | HAYIR |
| **Hata analizi kayıt formatı** | **EVET — belgenin kendi uyarısı: "sonradan eklenirse geçmiş veri olmaz."** Şu an kodlanmadı, 1.0'da genişletilmezse 1.1'de geçmişe dönük veri YOK olacak |
| Pop/EDM/Akustik "eşitlenmiş mix" dinleme | HAYIR — gerçek eğriler bittikten sonra |
| Reverb tip öğretimi (motor zenginleştirme gerekiyor) | HAYIR |
| Web demo | HAYIR |
| Hesap sistemi + liderlik tablosu | HAYIR (ama gelirse yaş formu Contests alanı EVET'e dönmeli) |
| Teşhis Modu (13. mod) | HAYIR |
| Hız kipi / "Günün Antrenmanı" | HAYIR — zaten kataloğda `hiz-modu` playable:false olarak duruyor |
| Sunucu zamanıyla can dolumu | HAYIR — ama BEKLEYEN KARARLAR "D" ile aynı iş, reklam entegrasyonuyla birlikte gelecek |
| İngilizce sürüm | HAYIR — G170'te 1.1/1.2'ye BİLİNÇLİ ertelendi |
| Yorum isteme (`SKStoreReviewController`) | HAYIR ama **gelir etkiliyor** (EVRAK-HESAP-METIN.md kendi uyarısı) — mekanizma hiç yok |
| Kullanıcı istatistikleri/analitik | HAYIR ama eklenirse App Privacy beyanı DEĞİŞİR — hatırlatma notu DURUM-OZET.md'de var |
| Bluetooth hoparlör filtresi ("Telefon Hoparlörü" yerine) | HAYIR — yeni DSP gerektiriyor |
| **"Yakında" modları gerçekten gelmeli** | HAYIR ama 1.0'da GİZLENDİ (G207) — Apple 2.1 riski nedeniyle, kod korunuyor |

---

# E) YAYINA HAZIRLIK

| Madde | Durum |
|---|---|
| **npm test** | **1315/1315** geçiyor (bu turda değişiklik yapılmadığı için yeniden koşulmadı, bir önceki commit'in — a9d507c — sonucu geçerli) |
| **AD_TEST_MODE** | `true` (`www/js/core/ads.js:19`) — TAM-LISTE-14-08.md/MAGAZA-DENETIM.md'nin "yayın ANINDA yapılacak" listesindeki #1 öncelikli madde, HENÜZ yapılmamış — STALE değil, bilinen açık iş |
| **Build numarası** | iOS `CURRENT_PROJECT_VERSION=1`/`MARKETING_VERSION=1.0`; Android `versionCode 1`/`versionName "1.0"` — İKİSİ DE TUTARLI, ikisi de artırılmamış |
| **Bundle ID tutarlılığı** | `com.logicprotrick.audioengineeracademy` — iOS (`pbxproj`) ve Android (`build.gradle`) BİREBİR AYNI |
| **Info.plist/AndroidManifest tutarlılığı** | Dikey kilit ikisinde de var (`UISupportedInterfaceOrientations`=Portrait, `android:screenOrientation="portrait"`); `arm64` doğru (G207); iPad yön anahtarı kaldırıldı (G207); Android `AD_ID` izni mevcut (G207); `INTERNET`/`BILLING` izinleri var, fazlası yok |
| **Yayın build'inde istenmeyen kalıntı** | 43 tanı `console.log`'u (ürün kararı bekliyor, bkz. C3) · `AD_TEST_MODE=true` (bilinen, yapılacak) · build numarası artırılmamış (bilinen, yapılacak) |
| **Stereo Genişlik yerleşik kaynak dosyası** | **HÂLÂ YOK** — TAM-LISTE-14-08.md'nin "1.3 Kalan içerik" maddesi, DEVIR-15-08-SABAH.md'de de "yayın engelleyici" olarak tekrarlanmış, hâlâ Logic'te bekliyor |
| **App ikon** | Kodda `AppIcon-512@2x.png` (1024×1024, universal, geçerli `Contents.json`) MEVCUT — bazı eski belgeler (`TAM-LISTE.md` [eski], `DURUM-OZET.md`) "hiç yapılmadı"/"açık" diyor, bu **STALE** (bkz. Liste 3) |
| **destek@ e-posta yönlendirmesi** | `EVRAK-HESAP-METIN.md`/`OTURUM-13-08-2026-AKSAM.md`/`DURUM-OZET.md`'nin ÜÇÜ de "info@ kutusuna düştüğü test edilmedi" diyor — hiçbir sonraki belgede doğrulama kaydı YOK, **hâlâ açık, küçük ama unutulmuş bir doğrulama** |
| **Paid Apps Agreement / sandbox satın alma testi** | Kod dışı, Pazartesi (17 Ağustos) evrak zincirine bağlı — henüz tamamlanmadı |
| **Cihaz testleri** | DEVIR-15-08-SABAH.md: kulaklık/mono-AIF/arka-plan-dönüş/BÖLÜM-sayacı/sekme-değişimi/Düşük-Güç-Modu **HEPSİ GEÇTİ ✅** (15 Ağustos). Stres testi 13/14 — kalan tek madde "depolama dolu" |

---

# SONUÇ — DÖRT LİSTE

## 1. Yayını engelleyenler (öncelik sırasıyla)

1. **Stereo Genişlik'e stereo kaynak dosyası eklenmemiş** — mod dosyasız
   hiç oynanamıyor, kulak/stres testi bu modda YAPILAMIYOR. (Logic'te,
   kod değil.)
2. **Paid Apps Agreement imzalanmadı** — satın alma test edilemiyor,
   sözleşme olmadan incelemeye gönderilirse Apple ret eder. (Evrak, kod
   değil — Pazartesi'ye planlı.)
3. **AD_TEST_MODE=true** — incelemeye giden build'de `false` olmalı, henüz
   değiştirilmedi (bilerek — yayın ANINDA yapılacak tek satırlık iş,
   şimdiden yapılırsa test reklamları kaybolur).
4. **Build numarası artırılmamış** (1.0/1) — her yeni arşivde artmalı,
   henüz gerek yok ama unutulmamalı.
5. **W-8BEN formu** — atlanırsa ABD satışlarından %30 stopaj kesilir,
   Pazartesi zinciri içinde.

## 2. Açık ama engellemeyenler

- BEKLEYEN KARARLAR'ın 15 açık maddesi (W/R/P/Q/N-G106/O/D/F/H/I/K/N-G122/V
  — hepsi kod-seviyesinde zararsız, ürün kararı bekliyor).
- **Pop/EDM tek eğri mi?** (yeni, henüz karar maddesi bile açılmamış).
- İdle-görünürlük (#24) cihazda AÇIKÇA yeniden test edilmedi — BELİRSİZ.
- destek@ e-posta yönlendirmesi doğrulanmadı.
- Hata analizi kayıt formatı — 1.0'da genişletilmezse geçmiş veri
  kaybolacak (yayını ENGELLEMEZ ama pencere kapanıyor).
- Depolama-dolu stres testi (son kalan madde).
- 43 tanı `console.log`'u — bırak/temizle kararı.

## 3. Belge-kod uyuşmazlıkları

1. **BEKLEYEN KARARLAR "C" (rozet sayısı)** — DURUM.md'nin KENDİSİ "kod
   hâlâ 9 rozet" diyor, ama AYNI dosyanın G198 BİTTİ kaydı "9→6" diyor.
   G198'den beri (14 Ağustos) hiç güncellenmemiş, en somut iç-tutarsızlık.
2. **BEKLEYEN KARARLAR'da İKİ AYRI madde "N" harfini paylaşıyor** (G106'nın
   süre-artışı maddesi ve G122'nin kulakla-doğrulama maddesi) — etiketleme
   hatası, karışıklığa yol açabilir.
3. **BEKLEYEN KARARLAR "M" (Referans Filtreleri gerçek DSP)** DEVIR-14-08-2026.md'nin
   "DSP'si ÇALIŞIYOR, cihazda doğrulandı" notuyla ÇELİŞİYORMUŞ gibi
   görünüyor — G101'den kalma bu madde G117'nin gerçek-DSP eklemesinden
   sonra hiç gözden geçirilmemiş olabilir, netleştirilmeli.
4. **Eski `TAM-LISTE.md`/`DURUM-OZET.md`** "Uygulama simgesi: hiç
   yapılmadı/açık" diyor — kodda geçerli, 1024×1024 gerçek bir ikon VAR.
   İki dosya da 13-14 Ağustos'tan kalma, güncellenmemiş.
5. **Eski `DENETIM.md` (10.08)** "Referans filtreleri gerçek DSP
   uygulamıyor" ve "eski Analiz kartı render kodu (`renderToolBars`) hâlâ
   duruyor" diyor — İKİSİ DE artık kodda YOK/değişmiş, bu denetim
   G101-G117 arası bir dönemden kalma bir anlık görüntü.
6. GORSEL-TEST.md'nin kendi ⏸️/🔴 işaretleri (#9/#15/#18/#21/#23/#30/#36) —
   YEDİSİ de aslında zaten kapanmış (bkz. B1), belge güncellenmemiş
   (önceki turda bulundu, bu turda teyit edildi).
7. DURUM.md:99'daki "G206↔#54/#55" — düzeltildi (bu oturumun kendi
   commit'i, a9d507c).

## 4. Hiç belgelenmemiş bulgular

1. **#4 (analizör işlenmiş sinyal) koddan KESİN çözülebiliyormuş** —
   GORSEL-TEST.md/OTURUM-13-08-2026-AKSAM.md/DURUM-OZET.md'nin ÜÇÜ de
   "Safari Web Inspector'da ölçülmesi gerekiyor" diyordu, gerekmiyormuş
   (`app.js:5802-5807`'nin kendi yorumu + `drawSpectrumBackground`'ın 7
   modda TEK fonksiyon olduğu yeterli kanıt).
2. **"Atla" hem BÖLÜM'ü hem sınav/telafiyi atlıyordu** — GORSEL-TEST.md'nin
   #54 kaydı SADECE telafiyi soruyordu, sorun parkur fazında da AYNI
   ölçüde geçerliydi. **G214'te kapatıldı.**
3. **`renderToolBars()` artık tamamen silinmiş** — eski DENETIM.md'nin
   (10.08) "zararsız no-op, hâlâ duruyor" notu güncel değil, hiçbir yerde
   bu düzeltmenin kaydı yok (muhtemelen büyük bir refactor'ün — G101-G117
   arası Araçlar yeniden yazımı — yan etkisi, ayrı bir "sildim" commit'i
   hiç olmamış).
4. **"Pop/EDM tek eğri mi?" bulgusu DURUM.md'nin BEKLEYEN KARARLAR
   listesine hiç girmemiş** — sadece DEVIR-15-08-SABAH.md'de var, henüz
   ana durum belgesine taşınmamış taze bir bulgu.

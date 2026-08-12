# GEÇMİŞ SIRADAKİ KAYITLARI

Bu dosya, DURUM.md'nin SIRADAKİ bölümünden G163'teki DURUM.md temizliği
sırasında taşındı. G90'dan G127'ye kadar (G148'in kendi güncel checklist'i
HARİÇ) tekil 'cihaz turu' kayıtlarını içerir — her biri o turda yapılan
değişikliğin GERÇEK cihazda henüz doğrulanmadığını belgeleyen tarihsel
notlardır. Güncel/açık next-step için DURUM.md'nin SIRADAKİ bölümüne bkz.

---

**Önceki adım (G119 itibarıyla):** `npx cap sync ios` (bu turda
zaten çalıştırıldı) + kullanıcı Xcode'da temiz derleme/cihaza yeniden
kurulum sonrası ana ekranı KONTROL ETMELİ: (1) Pan Konumu/Stereo
Genişlik artık normal/oynanabilir kart olarak görünüyor mu (kilitli/
"Yakında" DEĞİL); (2) "Yakında" bölümünde SADECE Hız Modu ve Hangisi
Farklı var mı (ikisi de ARTIK orada OLMAMALI); (3) üst kısımdaki "N mod"
etiketi "12 mod" mu gösteriyor. Bu turda masaüstü Chrome'da Playwright
ile hepsi doğrulandı (bkz. BİTTİ) — cihazda CANLI doğrulama HENÜZ yok.
Bu doğrulandıktan SONRA, G118'in SIRADAKİ'sindeki asıl kulakla-test
maddeleri (Pan Konumu'nun 7 kademesi, Stereo Genişlik'in mikro-gecikme
tekniği) hâlâ geçerli — aşağıya taşındı.

**Önceki adım (G118 itibarıyla):** `npx cap sync ios` (bu turda
zaten çalıştırıldı) + kullanıcı Xcode'da temiz derleme/cihaza yeniden
kurulum sonrası GERÇEK kulakla doğrulamalı: (1) Pan Konumu'nda 7
kademenin (Tam Sol...Tam Sağ) HEPSİNİN kulakla ayırt edilebildiği,
özellikle "Hafif Sol"/"Hafif Sağ" gibi ince kademelerin GERÇEKTEN
duyulabilir olduğu; (2) Stereo Genişlik'te mikro-gecikmeli genişletme
tekniğinin (22ms) GERÇEKTEN "geniş" bir stereo görüntü gibi mi yoksa
hafif bir flanger/comb-filtre renk değişikliği gibi mi duyulduğu — bu
turda SADECE matematiksel olarak (L≠R) doğrulandı, HİÇ dinlenmedi (bkz.
BİTTİ'nin DÜRÜSTLÜK notu); (3) gecikme miktarının (22ms) ve birleştirme
kazancının (0.5) kulakla rahatsız edici bir yapaylık (faz sorunları,
ani ses seviyesi değişimi) yaratıp yaratmadığı; (4) iki modun da
kulaklıkla dinlendiğinde (hoparlörle DEĞİL, getMeta().kulaklikGerekli
zaten bunu zorunlu kılıyor) konum/genişlik algısının tutarlı ve
öğretici olduğu. Bu turda masaüstü Chrome'da Playwright ile 4/4
senaryo (doğru/yanlış × 2 mod) uçtan uca doğrulandı (bkz. BİTTİ) —
cihazda/kulakla CANLI doğrulama HENÜZ yok.

**Önceki adım (G117 itibarıyla):** `npx cap sync ios` (bu turda
zaten çalıştırıldı) + kullanıcı Xcode'da temiz derleme/cihaza yeniden
kurulum sonrası GERÇEK kulakla dinleyerek doğrulamalı: (1) her 5 referans
filtresinin sesi GERÇEKTEN farklı duyulduğu (özellikle Telefon'un mono
çöktüğü, kulaklıklı dinlerken net duyulmalı); (2) Club Sistemi'nde SADECE
bas bölgesinin mono çaldığı, üst bandın hâlâ geniş stereo olduğu (kulakla
ayırt edilebilir olmalı); (3) Araba filtresinin genişletmesinin GERÇEK
müzikte RAHATSIZ EDİCİ/faz-iptalli duyulup duyulmadığı — bu turda SADECE
yapay/adversarial bir test sinyaliyle negatif korelasyon riski
gözlemlendi (bkz. BİTTİ'nin DÜRÜSTLÜK notu), gerçek müzikte muhtemelen
sorun değil ama KANITLANMADI; (4) 6 bölgenin solo'sunun KULAKLA da
inandırıcı/net bir "sadece bu bant" hissi verdiği (bu turda SADECE
görsel/piksel + spektrum-genlik ölçümüyle doğrulandı, hiç DİNLENMEDİ);
(5) solo ve referans filtresi aynı anda açıkken KULAKTA da mantıklı
bir birleşim duyulduğu. Bu turda masaüstü Chrome'da Playwright ile
OfflineAudioContext render + Goertzel + korelasyon ölçümüyle SAYISAL
olarak hepsi doğrulandı (bkz. BİTTİ) — cihazda/kulakla CANLI doğrulama
HENÜZ yok.

**Önceki adım (G116 itibarıyla):** `npx cap sync ios` (bu turda
zaten çalıştırıldı) + kullanıcı Xcode'da temiz derleme/cihaza yeniden
kurulum sonrası GERÇEK bir mix çalarak doğrulamalı: (1) dB eksen
etiketlerinin HER ZAMAN tam sayı olduğu (ondalık asla görünmüyor); (2)
dosya çalarken sakin bölümlerde ölçeğin/etiketlerin TİTREMEDEN sabit
kaldığı; (3) gerçekten aşırı bir tiz/bas patlaması varsa ölçeğin
GENİŞLEDİĞİ ve bir daha KÜÇÜLMEDİĞİ. Bu turda masaüstü Chrome'da
Playwright ile (canvas `fillText` çağrıları ele geçirilerek, görsel
karşılaştırma değil GERÇEK çizilen metin) hepsi doğrulandı (bkz. BİTTİ)
— cihazda CANLI doğrulama HENÜZ yok. **NOT (aşağıdaki ACİL notunun
KISMEN düzeltmesi):** bir önceki turda "kodda düzeltilecek bir şey yok"
denmişti — bu, dB etiketi/renk/çalar maddeleri için STATİK kod okumasıyla
doğruydu, ama Tonal Balance'ın "ölçek titriyor" maddesi için YANLIŞ
çıktı: gerçek bir bug'dı (canlı FFT anlık görüntüsünden HER KAREDE
yeniden hesaplanan bir smoothing hedefi, hiçbir zaman oturamıyordu),
sadece STATİK okumayla YAKALANAMAMIŞTI (canlı oynatmayı SİMÜLE ETMEK
gerekiyordu) — bu turda düzeltildi (bkz. BİTTİ). Diğer üç madde
(kırpılma önleme, gösterge renkleri, Mixini Yükle çaları) hâlâ kod
seviyesinde doğru görünüyor, aşağıdaki ACİL notu ONLAR için geçerliliğini
KORUYOR.

**ACİL — kod DEĞİŞİKLİĞİ YOK, cihazdaki eski derleme şüphesi (G114/G115
sonrası, kod değişikliği yapılmadı):** Kullanıcı cihaz ekran görüntüsüyle
G114'ün dört maddesinin (Tonal Balance kırpılması, dB etiketi yokluğu,
gösterge renk karışıklığı, Mixini Yükle çalarsızlığı) HÂLÂ var olduğunu
bildirdi. Bu turda `www/js/app.js` TEK TEK yeniden okunarak doğrulandı:
`toolsTonalCurrentHalfRange`/`toolsTonalComputeRawHalfRange`/
`toolsTonalNiceHalfRange` (8414-8578), dB ızgarası+etiketleri
(8590-8602, 8652-8665), gösterge/çizgi renk eşleşmesi (index.html:963-967
↔ app.js:8524 `#e8c46a`/`#22d3ee`, `renderToolsMixPlayer` app.js:8901-8914
+ paylaşılan `toolsFilterPlaying` durumu 8947-8951) — HEPSİ KOD SEVİYESİNDE
DOĞRU ve `ios/App/App/public/js/app.js` ile BYTE-BIRE-BYTE aynı (bu turda
`cap sync` tekrar çalıştırıldı, fark YOK). **Sonuç: kodda düzeltilecek bir
şey YOK** — kullanıcı Xcode'dan native app ile test ettiğini doğruladı,
bu yüzden en olası açıklama CİHAZDAKİ UYGULAMANIN eski bir derlemeden
kalması (`npx cap sync ios` SADECE `ios/App/App/public`'i günceller,
cihazdaki BINARY'yi yeniden derleyip YÜKLEMEZ). **Kabul kriteri / bir
sonraki adım:** kullanıcı Xcode'da Product → Clean Build Folder, cihazdan
eski uygulamayı SİL, tekrar Run et, SONRA aynı dört maddeyi yeniden
ekran görüntüsüyle doğrulasın. Hâlâ bozuksa (temiz derleme SONRASI da),
o zaman bu gerçekten YENİ bir bug'dır ve CLAUDE.md kuralı gereği Safari
Web Inspector'dan GERÇEK ölçüm alınmalı (tahminle düzeltme YAPILAMAZ).

**Tek sonraki adım (G115 itibarıyla):** `npx cap sync ios` + kullanıcı
cihazda gerçek bir mix yükleyip Ölçüm Sonuçları akordiyonunu doğrulamalı:
(1) kart başlığına dokununca akordiyon açılıp kapandığı, chevron'un
döndüğü; (2) "Analiz et"e basınca akordiyonun OTOMATİK açıldığı; (3)
başlıktaki cyan LUFS rozetinin doğru değeri gösterdiği; (4) kapat→aç
turunda sonuçların KAYBOLMADIĞI ve "Ölçülüyor…" durumunun TEKRAR
görünmediği (yani analiz motoru ikinci kez ÇALIŞMADIĞI); (5) akordiyon
açıkken içeriğin (KANAL ÖLÇÜMLERİ/STEREO/LOUDNESS/iki grafik/standart
notu) EN ALTINA kadar parmakla kaydırılabildiği, hiçbir şeyin tab bar'ın
arkasında kalmadığı. Bu turda masaüstü Chrome'da Playwright ile hepsi
doğrulandı (bkz. BİTTİ) — bu turun GEREKÇESİ zaten "önceki (sheet)
yaklaşım SADECE cihazda bozuktu" olduğu için, cihaz doğrulaması bu
madde için ÖZELLİKLE kritik (masaüstü doğrulaması sheet'in de HER
ZAMAN "geçtiği" tur olmuştu).

**Önceki adım (G114 itibarıyla):** `npx cap sync ios` + kullanıcı
cihazda gerçek (aşırı dengesiz) bir mix yükleyip doğrulamalı:
(1) Tonal Balance eğrisi hiçbir bölgede grafik kenarından taşmıyor/
kırpılmıyor mu; (2) dikey eksende dB etiketleri (+X/0/−X) görünüyor ve
ölçekle tutarlı mı; (3) dosya çalarken ölçek/eğri titremiyor mu; (4) üç
gösterge rengi grafikteki karşılığıyla eşleşiyor mu; (5) Mixini Yükle
kartındaki çalar ile Referans Filtreleri'ndeki çalar AYNI sesi kontrol
ediyor mu (birinden başlatıp diğerinden durdurma). Bu turda masaüstü
Chrome'da SENTETİK bir dosyayla hepsi doğrulandı (bkz. BİTTİ) — cihazda
CANLI doğrulama HENÜZ yok.

**Önceki adım (G113 itibarıyla):** `npx cap sync ios` + kullanıcı
cihazda AYNI Safari Web Inspector yöntemiyle (bu turun kanıtını ÜRETEN
yöntem) doğrulamalı:
(1) `.tools-scroll`'un `getBoundingClientRect().bottom`'u artık tab bar'ın
`top`'undan KÜÇÜK mü (bu turda Chrome'da `793 ≤ 805` ölçüldü — cihazda
KENDİ gerçek sayılarıyla AYNI ilişki doğrulanmalı, mutlak px değerleri
FARKLI olacaktır);
(2) `sc.style.height`/`flex` ile elle müdahale ARTIK GEREKMİYOR mu — yani
sayfa YÜKLENİR YÜKLENMEZ (hiçbir konsol komutu çalıştırmadan)
`kaydırılabilir=true` çıkıyor mu;
(3) Referans Filtreleri kartına GERÇEKTEN parmakla kaydırılıp
ulaşılabiliyor mu, akordiyon içindeki 5 filtre kartı da AYNI şekilde;
(4) Ölçüm Sonuçları VE Dosyalarım sheet'lerinin ikisinde de en alttaki
içerik (standart notu / dosya listesinin sonu) tab bar'ın/home-
indicator'ın gerisinde KALMIYOR mu;
(5) Ana Menü'nün EN ALTINDAKİ kart/bölüm de AYNI şekilde erişilebilir mi.
Bu G108'den beri SÜREN "Araçlar sekmesi cihazda tam çalışmıyor" şikayet
zincirinin EN TEMEL kök sebebi bu turda bulundu (kullanıcının kendi canlı
deneyiyle KANITLANDI) — eğer BU doğrulama da geçerse zincir GERÇEKTEN
kapanmış olur; geçmezse artık "hangi mekanizma" sorusu değil, "--tabbar-h
değeri cihazda yanlış mı" sorusuna daralmış olur (tek bir sabit,
kolayca ayarlanabilir).

**Önceki adım (G112 itibarıyla):** `npx cap sync ios` + kullanıcı
cihazda Safari Web Inspector'la DOĞRUDAN bu turun kendi kabul kriterini
ölçmeli:
(1) Referans Filtreleri kartı (ve akordiyon açıkken içindeki 5 filtre
kartı) artık TAM görünür mü, tab bar örtüyor mu — `[scroll-diag]`'a
benzer şekilde `.tools-scroll`'un `scrollHeight`/`clientHeight`'ı VE
`getBoundingClientRect()` ile tab bar'ın GERÇEK üst kenarının kartın alt
kenarını KESİP KESMEDİĞİ kontrol edilmeli;
(2) `--tabbar-h:106px`'in cihazda YETERLİ olup olmadığı — eğer hâlâ dar
çıkarsa (ör. Dynamic Island'lı modellerde tab bar farklı boyutlanıyorsa)
BU TEK sabit güncellenmeli (bkz. BİTTİ'nin DÜRÜSTLÜK notu);
(3) İlerleme sekmesinin son elemanı ("İstatistikleri Sıfırla") da AYNI
şekilde tab bar'ın üstünde mi.
Bu G108-G112 arası BEŞ turun HEPSİ aynı "Araçlar sekmesi cihazda tam
çalışmıyor" şikayet ailesinden geliyordu (donma zannedilen → kaydırma
kilidi → kap büyümüyor → kartlar sonradan görünüyor → tab bar örtüyor) —
bu SONUNCUSU da doğrulanırsa AİLE KAPANMIŞ olur.

**Önceki adım (G111 itibarıyla):** `npx cap sync ios` + kullanıcı
cihazda ÜÇ ŞEYİ doğrulamalı:
(1) dört kartın da baştan (dosya yüklenmeden) göründüğü, üçünün sönük/
tıklanamaz olduğu, "Önce bir dosya yükle" ipucunun okunduğu — bu ilk kez
CİHAZDA görülüyor;
(2) dosya yüklenince üçünün de tam işlevsel hâle döndüğü;
(3) EN ÖNEMLİSİ — G109'un asıl bulduğu "Dosyalarım sheet'i kapanınca Araçlar
kaydırılamıyor" sorunu ARTIK cihazda da düzeldi mi — kartlar artık BAŞTAN
DOM'da olduğu için `.tools-scroll` hiçbir zaman "sonradan yeniden ölçülmesi
gereken" bir duruma girmiyor, teoride bu G109/G110'un ele aldığı sorunu
TAMAMEN farklı bir açıdan (semptomu değil, kaynağı) kapatıyor olmalı — ama
BU DA cihazda hiç doğrulanmadı.
G107'nin ASIL amacı (Ölçüm Sonuçları sheet'inin ekranın altında kalmaması)
da HÂLÂ ayrıca doğrulanmalı (G110'dan kalan açık soru, DEĞİŞMEDİ).

**Önceki adım (G110 itibarıyla):** `npx cap sync ios` + kullanıcı
cihazda İKİ ŞEYİ AYRI AYRI doğrulamalı:
(1) `.tools-scroll` artık DOĞRU mu — Dosyalarım sheet'i açılıp kapatıldıktan
sonra `[scroll-diag]` çıktısında `scrollHeight > clientHeight` (kartlar
viewport'u aşıyorsa) ve GERÇEK parmak kaydırma çalışıyor mu;
(2) G107'nin ASIL amacı (Ölçüm Sonuçları sheet'inin ekranın altında
kalmaması) HÂLÂ karşılanıyor mu — `position:fixed;inset:0` kaldırıldığı
için bu YENİDEN bozulmuş OLABİLİR (bu ihtimal G110'da AÇIKÇA işaretlendi,
bkz. BİTTİ'nin DÜRÜSTLÜK notu).
Eğer (1) düzelip (2) YENİDEN bozulursa: `overflow:hidden`'ın TEK BAŞINA
yeterli olmadığı, ama `position:fixed;inset:0`'ın (varsa) YALNIZCA Ölçüm
Sonuçları sheet'i AÇIKKEN aktif olacak şekilde (G109'daki
`toolsSetBackgroundScrollLocked`'a benzer, DİNAMİK bir kilit — `.tools-
scroll`'u SÜREKLİ DEĞİL, SADECE sheet açıkken etkileyecek) yeniden
eklenmesi gerekebilir — bu, BU turda TASARLANMADI (zaman/kapsam), bir
SONRAKİ tur için bir seçenek olarak not edildi.

**Önceki adım (G109 itibarıyla):** Kullanıcı cihazda (Dosyalarım
sheet'ini açıp kapatarak, aynı "Araçlar artık kaydırılamıyor" senaryosu)
tekrar denemeli ve konsoldaki `[scroll-diag]` satırını getirmeli —
özellikle:
(1) `overflow-y`/`touch-action` gerçekten "auto"/"auto" mu dönüyor (yoksa
hâlâ "hidden"/"none" gibi TAKILI bir değer mi — bu, kilit kalkma
mekanizmasının KENDİSİNİN cihazda çalışmadığını gösterir);
(2) `kaydırılabilir=true` olduğu bir durumda (içerik viewport'u aşıyorken)
BİLE parmakla kaydırma GERÇEKTEN çalışıyor mu (JS tarafı "doğru" diyor
olsa da iOS'un touch-event işleme katmanı AYRI bir sorun olabilir — bu,
statik günlükle KANITLANAMAZ, sadece elle denenerek görülür);
(3) sheet HİÇ AÇILMADAN `.tools-scroll`'un `overflow-y` değeri (Safari
Web Inspector konsolundan elle: `getComputedStyle(document.querySelector(
'.tools-scroll')).overflowY`) — eğer bu BİLE "auto" değilse, sorun kilit
mekanizmasında DEĞİL, G107'nin html/body kalıcı kilidinde aranmalı (bkz.
BİTTİ'nin DÜRÜSTLÜK notu, henüz ELENMEDİ).
Eğer (2) hâlâ başarısızsa (JS durumu doğru ama parmak kaydırmıyor), bir
SONRAKİ turda G107'nin `html,body{position:fixed;inset:0;overflow:hidden}`
kuralının KENDİSİ sorgulanmalı — belki TAMAMEN kaldırıp Ölçüm Sonuçları
sheet'inin "ekranın altında kalma" sorununa (G107'nin asıl amacı) FARKLI
bir çözüm aranmalı, çünkü bu kalıcı kilit `.tools-scroll`'u BOZUYOR
olabilir.

**Önceki adım (G108 itibarıyla):** Kullanıcı cihazda (32MB+ dosyayla,
donma daha önce OLUŞAN aynı senaryo) tekrar deneyip Safari/Xcode konsolunun
TAM görüntüsünü getirmeli — özellikle:
(1) `[upload-diag]` loglarının copyFile'dan (adım 6) SONRA hangi noktada
KESİLDİĞİ (adım 7 mi hiç başlamıyor, adım 5 mi "BAŞLIYOR" diyip hiç "BİTTİ"
demiyor, yoksa `5a) suspend/resume döngüsü` belirli bir hop'ta mı takılıyor);
(2) eğer adım 5a'da belirli bir hop'ta takılıyorsa, o hop'un `t=X.Xs` değeri
— bu, dosyanın HANGİ saniyesinde OfflineAudioContext'in tıkandığını gösterir;
(3) `performance.memory` iOS Safari'de YOK (Chrome-only API) — bu alan
cihazda boş/eksik görünecek, BEKLENEN bir durum, hata değil.
Log'lar geldikten SONRA kök sebep netleşecek, o zaman DÜZELTME turu
başlayabilir (bu turda BİLEREK yapılmadı — task'ın kendi kuralı). Kök sebep
`measureSpectralDeviation()`'ın suspend/resume zincirlemesi çıkarsa,
düzeltme muhtemelen bu döngüyü `AnalyserNode` tabanlı OfflineAudioContext
yerine STREAMING bir FFT'ye (ya da `analysis.js`'in ZATEN sahip olduğu saf/
Web-Audio-bağımsız mimarisine benzer bir yaklaşıma) taşımayı gerektirecek —
ama bu KARAR log'lar gelmeden verilmemeli.

**Önceki adım (G107 itibarıyla):** `npx cap sync` (hem iOS hem Android —
bu turda Android tarafında `file_paths.xml` DEĞİŞTİ) + GERÇEK cihazda
doğrulama, ÖZELLİKLE:
(1) 32MB+ bir dosya "Mixini Yükle"den seçilince Yol B'nin (native copyFile)
GERÇEKTEN devreye girdiği — Safari/Android konsolunda ARTIK `writeFile`/
`appendFile` çağrılarının base64 dizeleri GÖRÜNMEMELİ, sadece `mkdir`/
`getUri`/`copyFile` (bkz. BİTTİ'nin DÜRÜSTLÜK notu — Chrome'da SADECE kod
yolu doğrulandı, cihazdaki gerçek süre/tıklama-yanıtı HİÇ ölçülmedi);
(2) Android'de `file_paths.xml`'e eklenen `<files-path>` girdisinin
GERÇEKTEN "Failed to find configured root" hatasını önlediği (bu G107'de
sadece KAYNAK OKUNARAK çıkarıldı, cihazda hiç denenmedi);
(3) Ölçüm Sonuçları sheet'inin GERÇEKTEN tam yükselip göründüğü, sürüklenip
kapatılabildiği (bu, üçüncü bildirimdi — G103/G105 çözmemişti, bu turun
`html,body` kilidi FARKLI bir katmana odaklandı ama YİNE cihazda
doğrulanmadı);
(4) `scrollToAnalyzer()`'ın (oyun ekranı, `window.scrollTo` kullanıyor)
`html,body{position:fixed}` sonrası hâlâ beklenen (zaten no-op) davranışta
olduğu — G107'de BİLEREK dokunulmadı ama regresyon riski TAM sıfır
değerlendirilmedi, gözle kontrol edilmeli.
Eğer (1)-(2) cihazda YİNE başarısız olursa: Yol A (1MB parça) otomatik
devreye giriyor olmalı (`saveFile`'ın try/catch'i) — bu durumda bile ESKİ
G104 davranışından (4MB parça) daha iyi olması BEKLENİR, ama bu da HENÜZ
cihazda ölçülmedi.

**Önceki adım (G106 itibarıyla):** Kullanıcı BEKLEYEN KARARLAR N/O'yu
netleştirmeli (süre artışı kabul edilebilir mi, bant sızıntısı düzeltilsin
mi — ikisi birbirine ters yönde). Ayrıca bu turun kendi ölçümleri SADECE
sentetik/masaüstü Chrome'da yapıldı — `npx cap sync ios` + gerçek cihazda
(1) yeni STEREO bölümünün/ikinci grafiğin küçük ekranda taşmadan
göründüğü, (2) 300s+ gerçek bir dosyada analiz süresinin GERÇEK cihazda
(masaüstünden çok daha yavaş olabilir) ne kadar sürdüğü hâlâ
doğrulanmadı.

**Önceki adım (G105 itibarıyla):** Bu üç düzeltmeyi (özellikle madde 1
— sheet kapanınca sayfa kilitlenmesi) GERÇEK bir iOS cihazda yeniden test
etmek. Bu turda masaüstü Chrome'da hem kök sebep TEORİSİ (fixed kaplamalar +
arka plan dokunmalı kaydırma bleed-through) hem DÜZELTMENİN KENDİSİ
(overflow:hidden kilidi + kapanışta scrollTop sıfırlama) programatik olarak
doğrulandı — ama orijinal BUG'IN KENDİSİ masaüstünde hiç ÜRETİLEMEDİ (mobil
Safari'ye özgü bir davranış olduğu için). Bu turun kendi açık işi:
**`npx cap sync ios` + gerçek cihaz doğrulaması hâlâ YAPILMADI** — G104'ten
kalan aynı madde (Capacitor'ın gerçek native köprü maliyeti), artık BUNA ek
olarak G105'in scroll-kilit düzeltmesi de cihazda doğrulanmalı.

**Önceki adım (G104 itibarıyla):** `npx cap sync ios` çalıştırıp GERÇEK
bir iOS cihazda (tercihen 24-bit/32-bit float export yapan bir DAW'dan çıkmış
büyük — 30-50MB — bir dosyayla) uçtan uca doğrulamak: dosya seç → arayüz
donmuyor mu, ilerleme çubuğu görünüyor mu, dosya doğru kaydediliyor mu. Bu
turun kendi açık işi: **Capacitor'ın GERÇEK native köprü maliyeti hâlâ
ölçülmedi** (bkz. G104 BİTTİ'nin DÜRÜSTLÜK notu — bu ortamda sadece JS
tarafı stub'landı, parça parça yazmanın YAPISAL olarak riski azalttığı
biliniyor ama nihai kanıt cihazda) — G105'te de HÂLÂ yapılmadı.

**Önceki adım (G103 itibarıyla):** Bu dört düzeltmeyi GERÇEK cihazda
yeniden test etmek — özellikle madde 3 (Ölçüm Sonuçları sheet'i), çünkü
masaüstü Chrome'da hiç ÜRETİLEMEDİ, sadece bu kod tabanının kendi belgelediği
WKWebView bug kategorisine göre gerekçeli düzeltmeler uygulandı (bkz. BİTTİ'nin
DÜRÜSTLÜK notu) — `overscroll-behavior:contain`/`--app-vh` düzeltmesinin
GERÇEKTEN sorunu çözdüğü henüz kanıtlanmadı. Bu turun kendi açık işleri:
(1) **madde 3 gerçek cihazda doğrulanmadı** (yukarıdaki madde); (2) **Tonal
Balance'ın pembe-eğim telafisi SADECE sentetik dosyalarla (Node'da üretilen
pembe gürültü + düşük-frekans-vurgulu gürültü) test edildi** — gerçek bir
ticari/mastered müzik parçasında ±6dB kabul kriterinin tutup tutmadığı
DOĞRULANMADI; (3) **DRAFT_TARGET_CURVES hâlâ taslak** (G101'den kalan aynı
madde, değişmedi — artık ÖLÇÜM YÖNTEMİ doğru domende olduğu için gerçek
referans parçalardan türetilecek sayılar daha ANLAMLI olacak).

**Önceki adım (G102 itibarıyla):** `npx cap sync ios` bu turda ÇALIŞTIRILDI
(ayrı commit, `1e03cbb`) — `Package.swift`/`Package.resolved` güncellendi,
`@capacitor/filesystem` iOS tarafına kaydoldu. Ama gerçek bir cihazda (ya da
simülatörde) Dosyalarım'ın NATIVE Filesystem yolunu (bu turda SADECE tip
tanımlarına göre yazıldı, hiç canlı denenmedi) uçtan uca doğrulamak hâlâ
YAPILMADI: dosya seç → uygulama kapat/aç → dosya hâlâ duruyor mu,
`Directory.Data`'ya gerçekten yazılıyor mu. Bu turun
kendi açık işleri: (1) **native Filesystem canlı doğrulanmadı** (yukarıdaki
madde); (2) **TASLAK hedef eğriler (Pop/EDM/Akustik) hâlâ gerçek referans
parçalardan türetilmedi** — değişmedi, G101'den kalan aynı madde; (3)
**Tonal Balance'ın canlı analizörü SADECE tek bir sentetik test dosyasıyla
denendi** — gerçek bir müzik parçasında (kick/cymbal gibi belirgin geçici
olaylarla) canlı eğrinin ortalamadan GÖRÜLÜR şekilde ayrıldığı henüz
gözlemlenmedi (test dosyası durağan gürültüydü, canlı≈ortalama çıktı,
mekanizma çalıştığı KANITLANDI ama görsel etkisi gerçek müzikte daha
belirgin olacaktır); (4) **"Kendi referansım" akışı bu turda da CANLI
denenmedi** (flag varsayılan kapalı, G101'den kalan aynı madde).

**Önceki adım (G101 itibarıyla):** Araçlar ekranının TAM giydirmesi
kod/canlı doğrulama açısından TAM kapandı (7 bölümün hepsi ekran görüntüsüyle
kanıtlandı, 2 gerçek CSS bugı AYNI turda bulunup düzeltildi) — bu ARADA
G100'ün SIRADAKİ (1) maddesi de ("AES17/100ms/8x'in ekranda göründüğü
doğrulanmalı") KAPANDI, standart notu canlı ekran görüntüsünde doğru
değerlerle görüldü. Bu turun kendi açık işleri: (1) **BEKLEYEN KARARLAR L (G102'de KAPANDI,
kalıcı yapıldı) / M (hâlâ açık)**
— Referans Filtreleri'nin gerçek DSP'sinin ne zaman ekleneceği kullanıcı
kararı bekliyor;
(2) ~~**Tonal Balance'ın "mix eksi hedef" yorumu KULLANICI ONAYI bekliyor**~~
— **G102'de KAPANDI:** kullanıcı farklı bir yorum istedi (mutlak gösterim +
hedef eğri şekilli koridor + canlı analizör), bkz. yukarıdaki BİTTİ;
(3) **TASLAK hedef eğriler (Pop/EDM/Akustik) hâlâ gerçek referans
parçalardan türetilmedi** — tasarımın kendi taslak sayıları kullanılıyor,
kod+UI'da AÇIKÇA "taslak" diye işaretli, gerçek veri kaynağı belirlenince
`tonal-balance.js:DRAFT_TARGET_CURVES` güncellenmeli; (4) **"Kendi
referansım" akışı SINIRLI test edildi** — referans dosya seçme/ölçme kodu
yazıldı ama flag varsayılan kapalı olduğu için bu turda CANLI denenmedi
(flag açılıp bir referans dosyayla uçtan uca doğrulanmalı); (5) **çoklu-dosya
kütüphanesinde "seç" YENİDEN DECODE ediyor** (upload.js'in tek-buffer
mimarisi korunduğu için) — çok sayıda büyük dosya arasında sık geçiş yapan
bir kullanıcı için performans etkisi henüz GERÇEK cihazda ölçülmedi.

**Önceki adım (G100 itibarıyla):** RX 11 karşılaştırmasının 5 maddesi
de kod/test seviyesinde TAM uygulandı (bkz. BİTTİ). Bu turun kendi açık
işleri: (1) **TAM canlı doğrulama YAPILAMADI** — tarayıcı otomasyon eklentisi
bu turda kararsızdı, değişiklikler node seviyesinde doğrulandı ama gerçek
DOM ekran görüntüsü alınamadı — bir sonraki oturumda MUTLAKA kısa bir tur
(dosya yükle→analiz et→AES17 değerlerin/DC 4-ondalık hassasiyetin/güncellenmiş
standart notunun ekranda GÖRÜNDÜĞÜNÜ doğrula) yapılmalı; (2) **LRA'daki 0.8
LU'luk farkın TAMAMI kapanmadı** (sadece ~0.1 LU'luk kısmı, algoritmik
düzeltmelerle) — kullanıcının orijinal test dosyası elde edilebilirse (ya da
kullanıcı RX'te farklı dosyalarla birkaç ölçüm daha yaparsa) kalan farkın
sistematik mi (düzeltilebilir) yoksa RX'in kendi uygulama farkı mı (kabul
edilmesi gereken bir sınır) olduğu netleştirilebilir; (3) **RMS penceresinin
(100ms) gerçek dosyada RX'e ne kadar yaklaştığı DOĞRULANMADI** — seçim
sentetik bir temsili sinyalle yapıldı, kullanıcı gerçek dosyasıyla YENİDEN
ölçüp Max/Min RMS'in artık RX'e ne kadar yakın olduğunu bildirirse pencere
değeri gerekirse İNCE AYAR yapılabilir; (4) **True Peak'in yeni ~0.04dB'lik
sınırı kullanıcıya arayüzde GÖRÜNÜR değil** (sadece standart notunda metin
olarak var) — ürün kararı, verilmedi.

**Önceki adım (G99 itibarıyla):** Araçlar ölçüm motoru İKİ bölümü de
(çekirdek + arayüz) kod/test/canlı doğrulama açısından TAM kapandı, canlı
testte bulunan gerçek bir bug (rAF sonsuz askıda kalma + hata sınıflandırma
karışıklığı) AYNI turda düzeltildi. Bu turun kendi açık işleri: (1) **gerçek
cihazda (özellikle iOS/WKWebView) hiç doğrulanmadı** — module Worker desteği
WKWebView'de teorik olarak var ama CANLI denenmedi, bir sonraki cihaz
turunda MUTLAKA kontrol edilmeli (worker oluşturma başarısız olursa ana
thread fallback'i devreye giriyor — bu da test edilmeli, ör. eski bir
WebView'de); (2) **True Peak'in ~0.55dB'lik ölçülen sapma sınırı** standart
notunda YAZIYOR ama kullanıcıya "yaklaşık" gibi ayrı bir görsel uyarı
verilmiyor — ürün kararı, bu turda verilmedi; (3) **RMS konvansiyonu şu an
SADECE HAM gösteriliyor** (standart notunda belirtiliyor) — kullanıcı RX ile
karşılaştırıp AES17'nin daha uygun olduğuna karar verirse, `meta`'da her iki
değer de zaten hesaplı (`maxRmsDb.aes17` vb.), sadece render fonksiyonunda
hangi alanın okunacağını değiştirmek yeterli, bu turun kapsamı dışında
bırakıldı; (4) test ortamı sınırlaması nedeniyle SON "temiz tekrar" koşusu
tamamlanamadı (bkz. BİTTİ'nin son notu) — kanıtlar önceki temiz koşulardan,
ama bir sonraki oturumda tekrar hızlı bir canlı doğrulama turu (5 dakika)
YARARLI olur.

**Önceki adım (G97 itibarıyla):** Yedi madde de kod/test/canlı doğrulama
açısından TAM kapandı (madde 2'nin "dosya silinsin mi" sorusu bu turda
CEVAPLANDI: not eklendi, dosya kalıyor — bkz. BİTTİ). Bu turun kendi açık
işleri: (1) **hiçbiri GERÇEK CİHAZDA doğrulanmadı** (tekrar eden aynı eksik
kalem, sadece masaüstü Chrome); (2) **`OYUN-MANTIGI.md` provenance sorusu
AÇIK** — görev başında repoda yoktu, turun sonunda kökte 246 satırlık bir
dosya olarak belirdi ("G94'e kadar" notuyla), bu oturumda HİÇ oluşturulmadı,
commit'e dahil edilmedi — **KULLANICIYA SORULMALI:** bu dosyayı siz mi
oluşturdunuz (ör. başka bir araç/oturumla), yoksa beklenmedik bir üretim mi,
ve repoya alınsın mı; (3) **Tonal Denge'nin TOLERANCE_RATIO_AT_1/AT_CAP
(0.14/0.045) KULAKLA DOĞRULANMADI** — matematiksel garanti (hiç dokunmadan
geçilemez) sağlam ama "Z1'de %98 kolay/Z20'de %39 zor" hissinin GERÇEKTEN
doğru kalibre olup olmadığı gerçek kullanıcı testiyle doğrulanmadı, diğer 9
modun AYNI "KULAKLA DOĞRULANMADI" dürüstlük notuna tabi; (4) **dB
Seviyesi'nin yeni (daraltılmış) STEP eğrisi de KULAKLA DOĞRULANMADI** —
matematiksel/istatistiksel invaryant (madde 5) sağlam ama "belirgin şekilde
zorlaştı" hissinin gerçek kullanıcı kulağıyla teyidi ayrı bir adım.

**Önceki adım (G94 itibarıyla, hâlâ geçerli):** G94 (`.warning` kırmızı halkasının
TÜM 10 modda düzeltilmesi) kod/test/canlı doğrulama açısından TAM kapandı —
G93'ün SIRADAKİ'sinde bırakılan (1) numaralı açık madde ("diğer 9 modda da
düzeltilsin mi?") bu turda kapatıldı, kullanıcı kararına gerek kalmadı. Bu
turun kendi açık işi: **hiçbiri GERÇEK CİHAZDA doğrulanmadı** (G90'dan beri
tekrar eden AYNI eksik kalem). G93'ün (2) numaralı maddesi (çip satırı
eşitliğinin matematiksel olarak TAM olmaması, ~%12-19 kalan fark) HÂLÂ
GEÇERLİ, bu turda dokunulmadı. **Kabul kriteri:** gerçek cihazda hem normal
hem gerçek ses hatası senaryosu gözle doğrulanır.

**Önceki adım (G93 itibarıyla, hâlâ geçerli — madde 2 dışında kapandı):** G93 (9 madde: dB arka planı/bar
renkleri/çip eşitliği/combo x0/Atla altın/akordiyon tıklama alanı/dB play
butonu) kod/test/canlı doğrulama açısından TAM kapandı. Bu turun kendi açık
işleri: (1) **`.game-ctrl-play.warning` (kırmızı halka) kök sebebi TÜM
modları etkiliyor** — Prototip.dc.html'de bu SADECE gerçek ses yükleme
hatasında (`s.audio==='error'`) çıkması gereken bir durumken, uygulamada
round aktifken KOŞULSUZ ekleniyor; bu tur SADECE dB Seviyesi'nde
(`mode.NEUTRAL_PLAY_BTN`) düzeltildi, kapsam dışı bırakıldı — KULLANICIYA
SORULMALI: diğer 9 modda da (Frekans Bulma dahil) aynı kırmızı halka duruyor,
bunun GERÇEKTEN "hata durumu" anlamına gelecek şekilde yeniden bağlanması mı
(prototipin kendi mantığı) yoksa hepsinde nötr yapılması mı isteniyor; (2)
**çip satırı eşitliği matematiksel olarak TAM DEĞİL** (~%12-19 kalan fark,
`<button>`/`<div>` karışık flex item'ların padding-bağlı intrinsic minimum
boyutu — izole testte kök sebebi doğrulandı) — görsel olarak yeterli
bulundu ama pixel-perfect eşitlik için padding'in flex item'ın kendisinden
bir iç sarmalayıcıya taşınması (HTML restrüktürü, birden fazla dosya)
gerekir, İSTENİRSE ayrı bir tur; (3) **hiçbiri GERÇEK CİHAZDA doğrulanmadı**
(G90/G91/G92'nin AYNI eksik kalemi hâlâ geçerli). **Kabul kriteri:** (1) ve
(2) için kullanıcı kararı + gerçek cihazda gözle doğrulama.

**Önceki adım (G92 itibarıyla, hâlâ geçerli):** G92 (madde 11 Altın Vurgular + madde
12 Animasyonlar) kod/test/canlı doğrulama açısından TAM kapandı, canlı testte
bulunan `heartOut` bug'ı AYNI oturumda düzeltildi. Bu turun kendi açık işi:
(1) **prefers-reduced-motion GERÇEK OS/DevTools emülasyonuyla hiç test
edilmedi** (sadece CSS cascade statik analiziyle) — cihazda "Hareketi Azalt"
açıkken TÜM ekranlar gözle tekrar denenmeli; (2) **bossPulse/flameGlow GERÇEK
oyun akışında (RNG'ye bağlı boss round/combo artışı) yakalanamadı**, sadece
class'lar elle uygulanıp computed style ile doğrulandı — bir sonraki turda
gerçek bir boss round'a/combo artışına rastlanırsa ekran görüntüsüyle teyit
edilmeli; (3) **Seans özeti (ringDraw/barGrow) GERÇEK 10-soruluk bölüm sonunda
yakalanamadı** (doğru cevap RNG'sine bağlı), üretilen markup'ın kendisi
üzerinden doğrulandı — bir sonraki turda gerçek bir "normal" (kayıpsız)
tamamlanmış bölümde ekran görüntüsüyle teyit edilmeli; (4) reduced-motion
kuralı `transition:`'a dokunmuyor (sadece `animation:`) — "sadece opaklık
geçişleri kalsın" talimatının opaklık-dışı transition'ları da kısıtlamayı
gerektirip gerektirmediği KULLANICIYA sorulmalı; (5) **hiçbiri GERÇEK
CİHAZDA doğrulanmadı** (G90/G91'in AYNI eksik kalemi hâlâ geçerli). **Kabul
kriteri:** yukarıdaki 4 madde gerçek cihazda/gerçek oyun akışında gözle
doğrulanır.

**Önceki adım (G91 itibarıyla, hâlâ geçerli):** G91 (DENETIM.md'den çıkan 10 madde)
kod/test/canlı doğrulama açısından TAM kapandı — 10 maddenin hepsi masaüstü
Chrome'da canlı test edildi, konsol hatası 0. Bu turun kendi açık işi:
**hiçbiri GERÇEK CİHAZDA doğrulanmadı** (G90'ın AYNI eksik kalemi hâlâ
geçerli) — özellikle çip satırının `justify-content:space-between` ile
tam-genişlik doldurması dar/gerçek mobil ekranlarda TEKRAR denenmeli (masaüstü
Chrome'da doğru göründü ama chip sayısı/genişlik oranı cihazda farklı
sarabilir), spektrumun artırılmış hareket miktarının (madde 7) gerçek
performansta (düşük FPS cihazlarda) göze batıp batmadığı ölçülmedi. 7 modlu
çip satırı listesinin sadece 2'si (dB Seviyesi/Kompresör) tek tek açılıp
canlı doğrulandı, kalan 5'i (Kesim Noktası/Q Genişliği/Reverb/Frekans
Çakışması/Distortion/Tonal Denge) PAYLAŞILAN `.chiprow` CSS kuralına
dayanılarak doğrulanmadı — bir sonraki turda tek tek açılıp gözle
kontrol edilebilir. **Kabul kriteri:** yukarıdaki maddeler gerçek
iOS/Android cihazda + kalan 5 mod masaüstünde gözle doğrulanır.

**Önceki adım (G90 itibarıyla, hâlâ geçerli):** G90 (Sheet'ler/Toast'lar/Yardımcı
Ekranlar) kod/test/canlı doğrulama açısından TAM kapandı — 10 maddenin
hepsi masaüstü Chrome'da canlı test edildi, çıkış-onayı bug'ı (bkz. G90
BİTTİ) bulunup AYNI oturumda düzeltildi. Bu turun kendi açık işi: **hiçbiri
GERÇEK CİHAZDA (iOS/Android) doğrulanmadı** — özellikle çıkış onayının
`fbPopIn` animasyonu, kalibrasyonun donanım ses tuşu akışı (`startVolumeButtonsWatch`,
sadece kod okumayla doğrulandı, gerçek tuş basışıyla DEĞİL), spotlight'ın
tam-genişlik balonunun küçük ekranlarda taşma/kırpılma durumu ve toast'ların
4 türünün gerçek oyun içi tetikleyicilerinde (günlük görev/rozet kazanma/
Pro kilidi/yakında) — bu turda SADECE `core/fx.js:toast()` doğrudan
çağrılarak (gerçek modül, ama gerçek oyun akışından DEĞİL) test edildi —
cihazda TEKRAR denenmeli. **Kabul kriteri:** yukarıdaki maddeler gerçek
iOS/Android cihazda gözle/elle doğrulanır.

**Önceki adım (G89 itibarıyla, hâlâ geçerli):** G83 (Spektrum) + G84 (Sınav Ekranları) +
G85 (Oyun Ekranı Düzeltmesi #1) + G86 (Oyun Ekranı — 12 madde) + G87 (İlerleme
Sekmesi) + G88 (Araçlar Sekmesi) + G89 (Paywall) kod/test/canlı doğrulama
açısından TAM kapandı, yeni açık iş bırakmadı — G86'nın TDZ/startBtn/
freqGuessArea (3 regresyon), G87'nin accChartFilterWrap/zoneList blur (2
regresyon) ve G88'in tanı sırasında yakalanan tarayıcı-önbellek yanıltmacası
(kod hatası DEĞİL, bkz. BİTTİ) kendi canlı testlerinde bulunup AYNI oturumda
düzeltildi/doğrulandı. G89'da kullanıcı kararıyla "sınav" paywall tetikleyicisi
GERÇEK bir kod yolu olmadığı için 6'lık listeden çıkarıldı (bkz. G89 BİTTİ) —
bu, ilerideki bir turda "sınav Pro'da açılır" mesajının GERÇEKTEN gösterilmesi
istenirse ayrı bir ürün kararı/iş olarak ele alınabilir, bu tur onu YAPMADI
(dokunulmadı). ÖNCELİKLE BEKLEYEN KARARLAR madde K
(Pro'da "done" Seans Sonu durumu hiç tetiklenemiyor — kasıtlı mı, regresyon
mu) kullanıcı kararı bekliyor; karar netleşmeden AÇIK İŞLER madde 20
kapatılamaz/"done" canlı doğrulanamaz. Bunun dışında AÇIK İŞLER madde 14 —
G67-G82'nin TAMAMI (kalıcı "i" + SPOTLIGHT + oyun seçenekleri + "basılı tut"
ipucu + G74'ün yeni ana ekranı + G75'in 5 düzeltmesi + G76'nın kart
yükseklik/SVG slice düzeltmesi + G77'nin yeni üst barı + G78'in soru alanı/
alt bar düzeltmeleri + G79'un düzen yeniden kurulumu + G80'in `updateUI()`
düzeltmesi + G81'in geri bildirim ekranı giydirmesi + G82'nin Seans Sonu
giydirmesi) GERÇEK CİHAZDA (bu turda da SADECE masaüstü Chrome'da
doğrulandı, iOS WKWebView'de HENÜZ değil — font rendering/safe-area
farkları VE özellikle şunlar Safari'de YENİDEN doğrulanmalı: G75 madde
4'ün grid-stretch savunması, G76'nın SVG `preserveAspectRatio="xMidYMid
slice"` kırpma matematiği [kenar-güvenlik marjı x:~30-172], G77'nin sınav/
telafi nokta göstergesi [DOM proxy'siyle doğrulandı, gerçek akışla DEĞİL],
G78/G79'un Frekans Bulma işaretle→onayla akışı [dokunma/tıklama davranışı
Safari'de FARKLI olabilir], G79'un YENİ #abLoopBtn'i [uzun-basma ile
GERÇEKTEN çakışmadığı, ikisinin de aynı startAbLoop/stopAbLoop'u doğru
tetiklediği cihazda TEKRAR denenmeli], G81'in YENİ "kulak" omuz butonları
[dokunma alanı 40px masaüstünde ölçüldü, gerçek parmak dokunuşuyla cihazda
TEKRAR denenmeli] ve otomatik-geçiş çubuğunun `animation-play-state`
pause/resume'u [cmp-önizlemesiyle Safari'de de senkron kaldığı TEKRAR
denenmeli], G82'nin SVG halka animasyonu/canlı can geri sayımı [Safari'de
`setInterval` arka planda/kilitli ekranda TEKRAR denenmeli]) elle
denenmeli. Ayrıca AÇIK İŞLER madde 17 (Tonal Denge'nin yatay/dikey fader
farkı), madde 18 (3 modda 4px kayma), madde 19 (Tonal Denge'nin yakınlık
faktörü canlı doğrulanamadı) ile BEKLEYEN KARARLAR madde J
(ACADEMY_XP_MULTIPLIER'ın Pro seviye kilidini yavaşlatması) kullanıcı
onayı/kararı bekliyor.

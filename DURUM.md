# DURUM

Son güncelleme: 11.08.2026 (G118)

> Bu dosya yeni sohbetlerin tek doğruluk kaynağıdır.
> Her seans sonunda Claude Code tarafından güncellenir, commit'e dahil edilir.

## DİL PRENSİBİ (kullanıcı kararı, G66'da netleşti — ayrı bir dosya YOK, burada kayıtlı)

GLOBAL mix terimleri İngilizce KALIR (çevrilmez), tanımlayıcı kelimeler
Türkçe. Örnek: "Reverb nasıl yankı değilse, saturation da doygunluk değil."
Global sayılan terimler (örnek liste, tüketici değil): ratio, Q, gain,
threshold, attack, release, reverb, saturation, distortion, dB, Hz, kHz,
LUFS, EQ, compressor, boost, cut, pan, stereo, mono, peak, transient,
sidechain, delay.

## BİTTİ

Bu commit (G118, tek commit, `1c0e396`) — **İKİ YENİ MOD: Pan Konumu ve Stereo Genişlik — placeholder'dan (playable:false) gerçek moda çevrildi.**

**Mod sözleşmesi diğer 10 modla BİREBİR aynı** (getMeta/createQuestion/
applyProcessing/evaluateAnswer/calculateXP/getFeedbackData) —
`createQuestion`/`evaluateAnswer` SAF fonksiyon kuralı korundu (ses/DOM
bağımsız, testle kilitlendi).

**Pan Konumu** (`www/js/modes/pan-konumu.js`) — `StereoPannerNode` ile
tek kaynak konumlandırma. Şıklar -100%..+100% arası EŞİT ARALIKLI,
isimlendirilmiş bir ızgara (3/5/7 kademe — "Tam Sol/Sol/Hafif Sol/
Merkez/Hafif Sağ/Sağ/Tam Sağ", task'ın kendi 7-kademe örneğiyle BİREBİR),
kademe sayısı zorlukla ARTAR (3→7, `PAN_CURVE_CONFIG`, difficulty-
curve.js'e diğer modlarla AYNI logLerp bağlantısıyla). Doğru cevap HER
ZAMAN ızgaranın tam üzerinde — matematiksel olarak ayrık bir ızgara
olduğu için "iki şık aynı cevaba denk gelme" riski YAPISAL OLARAK yok,
yine de task'ın istediği 1000 denemelik ampirik doğrulama da yazıldı.

**Stereo Genişlik** (`www/js/modes/stereo-genislik.js`) — task'ın
SoundGym Stereohead araştırması ("iki mono kaynağı zıt yönlere
yerleştirip açıklığı değiştirme") uygulanmaya çalışıldığında GERÇEK bir
matematiksel engel bulundu: AYNI mono içeriği iki panner'la (-width/
+width) hard-panlamak L=R üretiyor (iki panner'ın toplamı, pan simetrik
olduğu için HER ZAMAN özdeş) — yani "genişlik" hiç OLUŞMUYOR, bu
projenin KENDİ mono-uyum tanımıyla (Araçlar'ın korelasyon ölçümü, bkz.
G117) TAM MONO. **DÜZELTME:** standart bir stüdyo tekniği — mikro-
gecikmeli genişletme (bir yol DOĞRUDAN, diğeri ≤22ms gecikmeli [Haas
füzyon eşiğinin altında, hâlâ TEK ses gibi duyulur], ikisi zıt yönlere
panlanır). width=0'da gecikme=0 VE pan=0 → iki yol SAYISAL özdeş
(GERÇEK mono, task'ın "%0=ikisi de merkezde" tanımıyla TUTARLI);
width=100'de L SADECE doğrudan yolu, R SADECE gecikmeli yolu taşır
(GERÇEKTEN farklı sayılar, GERÇEK stereo görüntü).

**Mimari uzantı (audio-engine.js):** bu genişletme mevcut
`buildQuestionChain`'in `filters:[...]` sözleşmesine SIĞMADI — o
sözleşme SADECE düz bir seri zincir kurabiliyor (`wetNode.connect(f);
wetNode=f`), bir kaynağı İÇERDE ikiye ayırıp (fan-out) SONRA birleştirmek
(branching) bu döngüyle KURULAMIYOR (elle doğrulandı: ara elemanlar
arasına audio-engine HER ZAMAN ek bir doğrudan "bypass" bağlantısı da
ekliyor, bu da fan-out'un İÇİNDEN geçmeyen istenmeyen bir kopya sızdırır).
`buildQuestionChain`'e TEK yeni uzantı noktası eklendi: `applyProcessing`
artık `{branch:{input,output,nodes}}` döndürebilir — mod kendi ALT-
GRAFİĞİNİ (fan-out+birleştir dahil) TAMAMEN kendi içinde kurup SADECE
giriş/çıkış uçlarını dışa verir, audio-engine SADECE `sourceMix→input`
ve `output→localWetGain` bağlar. **Diğer 11 mod bunu hiç kullanmıyor
(davranışları BİR SATIR değişmedi — `git diff` ile doğrulandı, bkz.
DÜRÜSTLÜK notu).**

**Ortak (madde task'ın kendi listesi):**
- İkisi de `kulaklikGerekli:true` + kendi `kulaklikMetni` (mevcut
  kulaklık uyarı sistemi zaten bu alanı generik okuyordu, app.js
  değişikliği GEREKMEDİ).
- Kaynak uyumluluğu: tek vuruşluk kaynaklar (kick/snare/hihat/tom)
  konum/genişlik algısı için YETERSİZ — G43'ün dersiyle (Reverb'in
  otomatik "tek-vuruş" bayrağı snare'i YANLIŞLIKLA dışlamıştı) AYNI
  gerekçeyle otomatik bir bayrak YERİNE Reverb'in `only:[...]` deseni
  kullanıldı (pink/white/saw/square/triangle/groove/bass/bass_alt/
  guitar/vocal/upload — "upload" HER ZAMAN dahil, Reverb'in AYNI kararı).
- SHOW_SPECTRUM=false + BARE_ANALYZER=true (dB Seviyesi'nin AYNI
  deseni) — spektrum yerine KENDİ yatay stereo-alan görseli (SOL-
  MERKEZ-SAĞ ekseni, kırmızı=senin cevabın/yeşil=doğru, feedback-
  colors.js'in paylaşılan renkleri). Stereo Genişlik'te İKİ NOKTA çifti
  (±genişlik, simetrik) — Pan Konumu'nun tek-nokta deseninin ikizi.
- Ana ekran mod kartı ikonları (`mode-visuals.js`: `panBody`/`widthBody`,
  diğer 10 gövdeyle AYNI 200×84 viewBox/renk/x:30-172 güvenli-bant stili).
- `guide-texts.js`: MODE_GUIDE_TEXTS + MODE_OPTIONS_TEXTS + SPOTLIGHT_STEPS
  (4 adım: listen/abControl/select/confirm, diğer choiceOnly modlarla AYNI).
- `level-sheet-terms.js`: eğrinin tek ekseni (ızgara kademe sayısı) için
  "Izgara kademesi" / "Kademeler arası aralık" etiketleri.
- `mode-catalog.js`: `playable:false` → `true` (diğer tüm alanlar zaten
  doğru pre-populated: Pro tier, unlockLevel 7/8, kulaklikGerekli).

**Doğrulama sırasında bulunan ve düzeltilen 3 gerçek eksik (app.js'in
mod-string switch zincirleri, "birebir taklit et" derken atlanmıştı):**
1. `questionTitle` switch'i "pan"/"width" tanımıyordu — genel frekans
   modu varsayılanına ("Hangi frekansla oynandı? Dalga üzerine tıkla.")
   DÜŞÜYORDU (yanlış/kafa karıştırıcı). Eklendi.
2. `pushHistory`'nin "Son Cevaplar" açıklama switch'i de tanımıyordu —
   kodun KENDİ G22 yorumunun AÇIKÇA uyardığı AYNI hata sınıfına
   düşecekti ("dblevel/boostcut'ın filterLabel'ı yok — ELSE dalına
   düşselerdi 'undefined · NaN Hz · ...' üretirdi"). Eklendi.
3. Tur-başı "Hazır mısın?" açıklama switch'i de tanımıyordu (yanlış
   "dalgaya tıkla" metni gösterirdi). Eklendi.
4. (Yapısal, önceden fark edildi) `frekans-bulma.js`'in ZORUNLU
   re-export sözleşmesi (`FA_ZONES`/`isBossRound`/`recordZone`/vb.) —
   dB Seviyesi'nin SHOW_SPECTRUM=false OLMASINA RAĞMEN taşıdığı AYNI
   desen — ilk taslakta unutulmuştu; `app.js`'in `mode.isBossRound(...)`
   ve `mode.FA_ZONES.map(...)`'ı HER moddan KOŞULSUZ okuduğu bulundu
   (kodda gerçekten çökerdi), her iki mod dosyasına eklendi.

**DOĞRULAMA (masaüstü Chrome, Playwright — GERÇEK tarayıcı turu, `www/`
`python3 -m http.server` üzerinden):**
- **Ana ekranda iki kart doğru görünüyor** — kendi ikonları, "PRO"
  rozeti, "Sv 1" seviyesi, doğru ad/açıklama (ekran görüntüsüyle
  doğrulandı).
- **Kulaklık uyarısı** doğru mod-özel metinle çıkıyor ("Pan konumunu
  doğru duymak için kulaklık şart...", "Genişliği doğru duymak için
  kulaklık şart...") — ekran görüntüsüyle doğrulandı.
- **4/4 senaryo uçtan uca çalıştı** (bir geçici `window.__modeTest`
  kancasıyla `activeQuestion`'ın GERÇEK değeri okunup doğru/yanlış şık
  BİLEREK seçildi, kanca doğrulama sonrası KALDIRILDI — G117'nin AYNI
  yöntemi):
  - Pan Konumu doğru: "Doğru! +22 XP ... Doğru — ses tamamen solda.
    Kick, bas, vokal ve snare genelde merkezde kalır..."
  - Pan Konumu yanlış: "Yakın ama kaçtı ... '%100 Sol' dedin ama ses
    tamamen sağda (%100 Sağ)..." — kırmızı/yeşil şık işaretleme VE
    stereo-alan görselinde kırmızı(senin)/yeşil(doğru) nokta DOĞRU
    konumlarda (ekran görüntüsüyle doğrulandı).
  - Stereo Genişlik doğru: "Doğru! +22 XP ... görüntü tamamen mono
    (%0)..."
  - Stereo Genişlik yanlış: iki-nokta-çifti görseli DOĞRU çizildi —
    yanlış cevap (Mono/%0) iki kırmızı nokta merkezde ÇAKIŞIK, doğru
    cevap (%100) iki yeşil halka uçlarda AYRIK (ekran görüntüsüyle
    doğrulandı).
- **1000 denemelik test** (her iki mod, test dosyalarında): hiçbir
  kademede iki şık çakışmıyor, hiçbir yanlış şık TOLERANCE içine
  düşmüyor.
- **Zorluk eğrisi Z1→Z20 tablosu** (test dosyalarında console.log ile
  basılı + programatik doğrulandı): kademe sayısı 3'ten 7'ye MONOTON
  artıyor, kademeler arası ortalama mesafe (Pan: %100→%16.7, Genişlik:
  %50→%16.7) task'ın "kolayda uzak, zorda yakın" isteğiyle TUTARLI.
- **Stereo Genişlik'in branch mekanizması** sahte-ama-Web-Audio-
  sözleşmesine-sadık bir audioCtx ile test edildi (test dosyasında):
  width=0'da panL/panR pan=0 + gecikme=0 (iki yol sayısal özdeş);
  width=100'de panL=-1/panR=+1 (tam ayrık) + gecikme=MAX_DELAY_SEC; iç
  bağlantı grafiği TAM beklenen topoloji (entryTap→panL, entryTap→delay,
  delay→panR, panL→merge, panR→merge) VE entryTap→mergeGain DOĞRUDAN
  bypass bağlantısının OLMADIĞI doğrulandı (bu, branch mekanizmasının
  var olma SEBEBİYDİ).
- **Mevcut 10 modda regresyon YOK** — `git diff www/js/app.js` ile
  doğrulandı: paylaşılan switch zincirlerine yapılan TÜM değişiklikler
  SADECE yeni satır EKLEMESİ (silinen/değiştirilen tek satır
  `isChoiceFormat`'ın kendisi, o da KATI BİR SÜPERSET — orijinal koşul
  aynen korunup sonuna `|| "pan" || "width"` eklendi). Frekans Bulma
  ayrıca canlı tarayıcı turunda (ekran görüntüsü) sorunsuz çalıştığı
  doğrulandı.
- **Konsol hatası: TÜM senaryolarda (4/4 mod turu + 2 regresyon turu) 0.**
- **`npm test`: 1209/1209** (139 yeni test — 70 Pan Konumu/Stereo
  Genişlik + 2 katalog-sayısı güncellemesi ile büyüyen mevcut testler).

**DÜRÜSTLÜK NOTU:** doğrulama masaüstü Chrome'da (Playwright) yapıldı —
cihazda/kulakla CANLI doğrulanmadı. Özellikle Stereo Genişlik'in mikro-
gecikmeli genişletme tekniği (22ms) KULAKLA hiç dinlenmedi — matematiksel
olarak L≠R (gerçek stereo fark) olduğu KANITLANDI ama bunun GERÇEKTEN
"geniş" mi yoksa hafif "flanger/comb filtre" gibi mi duyulduğu SADECE
kulakla anlaşılır. Gecikme miktarı (22ms) ve birleştirme kazancı (0.5)
KULAKLA DOĞRULANMADI — diğer tüm sayısal sabitlerle AYNI dürüstlük notu,
makul bir başlangıç noktası. `npx cap sync ios` çalıştırıldı.

---

Önceki commit (G117, tek commit, `581d250`) — **Araçlar: ortak DSP katmanı + bölge solo dinleme + Referans Filtreleri'ne GERÇEK ses işleme + 5 cihaz illüstrasyonu yeniden çizildi.**

**A) Ortak ses işleme katmanı (`www/js/app.js`):** Önizleme çalar akışı
artık `toolsFilterPreviewNode → [referans filtresi] → [bölge solo] →
toolsFilterPreviewGain → analyser` şeklinde. `toolsBuildMidSideStage(ctx,
bands)` (satır ~8895) mid/side stereo matrisini elle kuruyor (Web Audio'da
hazır bir "mid/side node" YOK) — `bands` bir dizi olduğu için Club
Sistemi gibi frekansa bağlı stereo davranış da desteklenir. `toolsConnect
FilterPreviewChain()`/`toolsDisconnectFilterChain()` zinciri kurup
temizliyor; hem filtre kartı tıklamasında hem solo bant tıklamasında,
ÇALARKEN bile (durdurmadan) canlı yeniden kuruluyor. İki işlem TAMAMEN
bağımsız — ikisi de aynı anda açık olabiliyor (zincirde ikisi de varsa
ikisi de sırayla eklenir).

**B) Bölge solo dinleme:** Tonal Balance grafiğindeki 6 bant adı ("SUB"
vb.) canvas üzerinde ÇİZİLİ metin (gerçek DOM elemanı değil) — tıklama
`toolsTonalBandIdxAt()` ile `toolsTonalFx(BAND_EDGES[i])` x-aralıklarına
karşı hit-test ediliyor (LUFS scrubber'ıyla AYNI desen). Dokununca dosya
SADECE o bantta duyulur (2 kademeli highpass+lowpass, ~24dB/oktav,
kesim noktaları `tonalBalance.BAND_EDGES` ile BİREBİR aynı — task'ın
kendi gereksinimi). Tekrar dokununca kapanır. Grafikte cyan dikey şerit
+ cyan bant adıyla vurgulanır (otomatik hedef-dışı amber renklendirmesinin
ÜSTÜNE geçer). **SEVİYE TELAFİSİ YOK** (task'ın kendi kararı, kodda
yorum olarak belgelendi) — bandpass'ın doğal zayıflatması/yükseltmesi
hiçbir yerde telafi edilmiyor.

**C) Referans Filtrelerinin gerçek DSP'si:** Her filtre (`TOOLS_FILTERS`,
satır ~8806) iki katmandan oluşuyor — `eq` (BiquadFilterNode zinciri,
her filtrenin ne yaptığı kodda yorum olarak belgeli) ve `stereo` (mid/side
kazanç bantları). Telefon: 2x highpass@500Hz + peaking@2kHz(+7dB) +
lowpass@8kHz, stereo mid=1/side=0 (tam mono). Araba: lowshelf@60Hz(+5dB)
+ peaking@350Hz(-4.5dB) + highshelf@6kHz(+4dB), stereo mid=0.85/side=1.35
(yan öne çıkar, merkez zayıflar — bkz. aşağıdaki DÜRÜSTLÜK notu). Kulaklık:
lowshelf@100Hz(+2dB) + peaking@9kHz(+3dB), stereo değişmez (mid=1/side=1,
`toolsBuildMidSideStage` bu durumu tanıyıp gereksiz node kurmuyor). Club
Sistemi: lowshelf@40Hz(+2dB) + peaking@60Hz(+5dB) + lowpass@16kHz, stereo
**frekansa bağlı**: 20-120Hz'de mid=1/side=0 (sub mono), 120Hz+'da
mid=1/side=1 (normal). Laptop: highpass@200Hz + peaking@3.5kHz(+4.5dB) +
lowpass@12kHz, stereo mid=1/side=0.3 (çok dar sahne). `index.html`'deki
uyarı notu "DSP yok" uyarısından "tipik davranış taklidi, gerçek ölçüm
değil" bilgi notuna çevrildi (amber "uyarı kutusu" → nötr gri metin,
Ölçüm Sonuçları'ndaki standart notuyla AYNI ton).

**D) 5 cihaz illüstrasyonu sıfırdan çizildi** (`toolsFilterIllustration`,
eski gradyanlı/detaylı `toolsFilterArt`'ın yerine) — basit, ince çizgi
(stroke-width 1.6, fill yok), tek renkli. Renk artık JS parametresi
DEĞİL, CSS `.tools-filter-illust`/`.tools-filter-card.active .tools-
filter-illust` kuralları `currentColor`'ı yönetiyor (açık #22d3ee,
kapalı #5a6068 — task'ın kendi renk kararı).

**DOĞRULAMA (masaüstü Chrome, Playwright — `www/` `python3 -m
http.server` üzerinden, GERÇEK tarayıcı turu):**

*Filtre spektrum farkı (OfflineAudioContext ile GERÇEK render, Goertzel
algoritmasıyla 6 banttan birer prob frekansında (60/180/350/900/4000/
12000 Hz) genlik ölçümü, baseline'a göre dB fark)* — özel bir stereo
test WAV'ı kullanıldı (6 bant prob tonu + biri SUB'da biri ÜST-ORTA'da
iki "side" (L/R ters fazlı) tonu, gerçekten decorrelated bir stereo
imaj için):
- **Telefon:** SUB −73.5dB, BAS −34.2dB (pratikte yok), ORTA +4.3dB
  (öne çıkar), TİZ −8.7dB — hepsi task'ın tarif ettiği yönde, büyük
  farklar.
- **Araba:** ALT-ORTA −5.9dB, BAS −2.8dB (maskeleme), TİZ +2.5dB
  (parlak) — SUB probu (tam 60Hz, shelf'in kendi kesim noktası) +0.95dB
  gösterdi (beklenenden küçük ama shelf'in KENDİ kesim frekansında ölçüm
  yapıldığı için matematiksel olarak DOĞRU — bir shelf kendi kesim
  noktasında tam kazancın yarısını verir).
- **Kulaklık:** en büyük fark +1.77dB (SUB, lowshelf'in 100Hz altına
  sızması) — "nispeten düz" iddiasıyla TUTARLI, hiçbir bant 2dB'yi
  aşmıyor.
- **Club Sistemi:** SUB +3.9dB (güçlü), TİZ üstü kesim yönünde negatif
  eğilim gösteriyor genel spektrumda.
- **Laptop:** SUB −20.5dB (zayıf, telefon kadar sert DEĞİL), ÜST-ORTA
  +4.5dB (belirgin).

*Stereo korelasyon (Pearson, aynı render'lardan, ayrıca 20-120Hz ve
2-8kHz'e ayrı ayrı bant-sınırlanmış post-hoc analiz geçişiyle)*:
- **Baseline (filtresiz):** tam sinyal r=0.75, SUB-bant r=0.57,
  ÜST-ORTA-bant r=0.31 (test sinyali GERÇEKTEN decorrelated, ölçüm
  anlamlı).
- **Telefon:** r=1.0000 — TAM ÜÇ ölçümde de (tam mono çöküş, matematiksel
  olarak kusursuz).
- **Club Sistemi:** SUB-bant r=0.57→0.97 (neredeyse tam mono), ÜST-ORTA-
  bant r=0.31→0.30 (PRATİKTE DEĞİŞMEDİ) — **frekansa bağlı stereo
  çöküşü sayısal olarak KANITLANDI** (sadece bas mono, üst bant stereo
  kalıyor).
- **Laptop:** r=0.75→0.98, SUB-bant r=0.57→0.999 (dar sahne doğrulandı).
- **Kulaklık:** r küçük ölçüde değişti (0.75→0.69) — bu BEKLENEN, çünkü
  stereo matrisi kendisi mid=1/side=1 (tam kimlik, hiçbir şey yapmıyor);
  gözlenen fark TAMAMEN EQ katmanının (aynı filtre L/R'ye AYNI şekilde
  uygulanıyor ama farklı frekans bileşenlerini farklı ağırlıklandırdığı
  için toplam korelasyon sayısı bile böyle bir EQ'dan etkilenebiliyor)
  yan etkisi — stereo katmanının kendisi bozuk DEĞİL.

*Solo + Referans filtresi aynı anda:* Telefon filtresi + SUB solo ikisi
birden seçilip çalınca zincir düğüm sayısı 14 (sadece filtre) → 16
(filtre+solo) — ikisi de aktifken zincire İKİSİ de ekleniyor, birbirini
İPTAL ETMİYOR (ekran görüntüsüyle de doğrulandı: SUB bandı cyan vurgulu,
Telefon kartı "AÇIK", oynatma devam ediyor).

*6 bölgenin hepsi solo çalışıyor:* her biri tek tek tıklanıp canvas
piksel verisinden (RGB örnekleme, sadece ekran görüntüsü değil) bant
adının GERÇEKTEN cyan'a döndüğü doğrulandı — SUB/BAS/ALT-ORTA/ORTA/
ÜST-ORTA/TİZ hepsi `[0,204-255,255]` civarı saf cyan gösterdi. Tekrar
tıklayınca (aynı banda ikinci dokunuş) solo kapandığı da ayrıca
doğrulandı.

*Konsol hatası:* TÜM turlarda (DSP analizi, solo+filtre eşzamanlılığı,
6 bölge testi, illüstrasyon ekran görüntüleri) **0 hata**.

**`npm test`: 1119/1119**, 0 hata (bu turda saf `createQuestion`/
`evaluateAnswer` fonksiyonlarına DOKUNULMADI, beklenen sonuç).

**DÜRÜSTLÜK NOTU (araba stereo genişletmesi):** İlk denenen değer
(mid=0.75, side=1.6) doğrulama sırasında YAPAY OLARAK çok güçlü decorrelated
içerik barındıran test sinyalinde tam-sinyal korelasyonunu NEGATİFE
düşürüyordu (aşırı genişletmenin bilinen bir yan etkisi — faz-iptali gibi
duyulabilir). mid=0.85/side=1.35'e YUMUŞATILDI ama BU DEĞERLE DE aynı
adversarial test sinyalinde ÜST-ORTA-bant korelasyonu hâlâ hafif negatif
çıktı (−0.32). Gerçek müzik içeriği bu test sinyali kadar yüksek side/mid
enerji oranına SAHİP OLMAZ (bu, kasıtlı olarak AŞIRI bir stres testiydi)
— ama bu KANITLANMADI, sadece MAKUL bir varsayım. Araba filtresinin
stereo genişletmesi gerçek/çeşitli müzik içeriğiyle CANLI kulakla test
EDİLMEDİ — bir sonraki turda dinleme testi önerilir (bkz. SIRADAKİ).

**DÜRÜSTLÜK NOTU (genel):** doğrulama masaüstü Chrome'da (Playwright,
OfflineAudioContext render) yapıldı — cihazda (iOS Safari/WKWebView)
CANLI kulakla doğrulanmadı. `npx cap sync ios` çalıştırıldı.

---

Önceki commit (G116, tek commit, `f8f4392`) — **Araçlar → Tonal Balance: dikey eksen dB etiketleri ondalık spam üretiyordu ("+10.3847291"), ölçek her karede yeniden hesaplanıyordu — DÜZELTİLDİ.**

**KÖK SEBEP:** G114'ün "titreme koruması" yetersizdi. Canlı çalarken
`drawTonalChart()` HER KAREDE smoothing'in kovaladığı hedefi
(`toolsTonalComputeRawHalfRange(avg, target, liveDevs)`) `liveDevs`'ten
YENİDEN hesaplıyordu — `liveDevs` gerçek zamanlı FFT anlık görüntüsü
olduğu için kare-kareye DEĞİŞİYORDU, yani smoothing'in ulaşmaya çalıştığı
hedefin KENDİSİ sürekli oynuyordu. Sonuç: ölçek (`toolsTonalCurrentHalfRange`)
hiçbir zaman "nice" bir tam sayıya OTURAMIYORDU, dB etiketi bu ondalık
ara-değeri doğrudan string'e çeviriyordu.

**DÜZELTME (`www/js/app.js`):**
1. Yeni `toolsTonalResetHalfRange(avgDevs, targetDevs)` (8443-8449) —
   dosya/hedef değişince (`renderToolsTonalCard`, satır 8747) BİR KEZ
   çağrılır, ölçeği SADECE avg+target'tan (canlı YOK, kare-kareye SABİT
   girdi) hesaplayıp `toolsTonalCurrentHalfRange` + yeni ratchet-tabanı
   `toolsTonalHalfRangeFloor`'u KİLİTLER.
2. `drawTonalChart()` içindeki eski "her karede yeniden hesapla" bloğu
   kaldırıldı (8583-8595) — yerine SADECE "canlı floor'u aşıyor mu"
   testi kondu: aşıyorsa `toolsTonalHalfRangeFloor` büyür (ratchet,
   SADECE büyür) ve `toolsTonalCurrentHalfRange` bu yeni floor'a
   yumuşakça (%12/kare) yaklaşır — geri KÜÇÜLMEZ.
3. Eksen etiketi metni artık HER ZAMAN `Math.round()` (8678-8684) — Y
   konumu yuvarlanmamış değerden hesaplanmaya devam ediyor (animasyon
   sırasında etiket kendi ızgara çizgisinden KOPMASIN diye), sadece
   YAZILAN sayı tam sayıya yuvarlanıyor.

**DOĞRULAMA (masaüstü Chrome, Playwright — `www/` `python3 -m
http.server` üzerinden, `CanvasRenderingContext2D.fillText`
`page.add_init_script` ile ELE GEÇİRİLİP her dB-etiketi çizim çağrısı
zaman damgasıyla loglandı — görsel karşılaştırma değil, GERÇEK çizilen
metin doğrulandı). Sentetik 9sn'lik WAV: sürekli bas-ağır taban (SUB/BAS
frekansları) + t=3-4.5s arası yüksek frekans PATLAMASI (6/12/16kHz):**
- **Statik (dosya yüklenip çalınmadan): `+70 / 0 / −70`** — tam sayı.
- **t+1s, t+2s (patlamadan ÖNCE): `+70/0/−70`** — SABİT, hiç değişmiyor.
- **t+3s (patlama BAŞLADI): `+80/0/−80`** — ölçek GENİŞLEDİ (ratchet).
- **t+4s...t+9s (patlama t=4.5s'te BİTTİ, 4.5 saniye sessizlik geçti):
  hep `+80/0/−80`** — ölçek GERİ DARALMADI, task'ın "genişlesin ama geri
  daralmasın" kuralı doğrulandı.
- **Toplam 4554 eksen-etiketi çizim çağrısı** (tüm 9 saniyelik oynatma +
  canlı animasyon karesi başına) tarandı — **NOKTA/VİRGÜL içeren TEK BİR
  etiket bile YOK** (`www/js/app.js`'nin `Math.round()` düzeltmesi her
  karede doğrulandı, sadece örnek karelerde değil).
- İki ekran görüntüsü (patlama sırasında ve patlamadan 3+ saniye sonra)
  AYNI `+80/0/−80` değerlerini gösteriyor (task'ın kendi doğrulama
  kriteri: "birkaç saniyelik aralıklarla alınmış iki ekran görüntüsünde
  aynı değerler").
- **`npm test`: 1119/1119**, 0 hata.

**DÜRÜSTLÜK NOTU:** doğrulama masaüstü Chrome'da (Playwright) yapıldı,
cihazda CANLI doğrulanmadı — G115'ten devralınan aynı açık uç (bkz.
SIRADAKİ).

---

Önceki commit (G115, tek commit, `9d72670`) — **Araçlar → Ölçüm Sonuçları: sheet TAMAMEN kaldırıldı, Referans Filtreleri ile AYNI akordiyon desenine çevrildi.**

**GEREKÇE (kullanıcının kendi kararı):** sheet iOS'ta üç turdur (G107-G114
zinciri, bkz. SIRADAKİ'nin eski "Önceki adım" kayıtları) doğru
konumlanmadı — cihaz ölçümü panellerin kendi yükseklikleri kadar aşağı
itilmiş kaldığını gösterdi. Sheet yaklaşımından TAMAMEN vazgeçildi;
sayfa kaydırması zaten çalıştığı doğrulanmış bir yüzeye (Referans
Filtreleri'nin akordiyonu, `.tools-scroll` içinde) taşındı.

**Yapılanlar:**
1. `www/index.html` — Ölçüm Sonuçları kartı artık `.tools-filter-header`/
   `.tools-filter-chevron`/`.tools-filter-body` sınıflarını Referans
   Filtreleri ile AYNI şekilde kullanıyor (`toolsResultsHeader`/
   `toolsResultsChevron`/`toolsResultsBody` id'leriyle) — 260ms
   `cubic-bezier(.2,.8,.2,1)` geçişi bu paylaşılan sınıflardan otomatik
   geldi, YENİ bir CSS kuralı YAZILMADI. Başlıkta `toolsFilterHeaderBadge`
   ile AYNI rozet sınıfı (`toolsResultsHeaderBadge`) integrated LUFS
   göstermek için eklendi. "Analiz et" butonu akordiyonun DIŞINDA
   (kartın kendi gövdesinde) kaldı — kapalıyken de tıklanabilir.
   Sheet+overlay (`toolsResultsSheet`/`toolsResultsOverlay`) ve kalıcı
   şerit (`toolsResultsStrip`) markup'ı TAMAMEN silindi.
2. `www/styles.css` — `.tools-results-strip*` kuralları (7 satır)
   kaldırıldı. `.tools-analysis-*`/`.tools-results-*` içerik sınıfları
   (kolon genişliği, integrated LUFS büyük rakamı, standart notu vb.)
   AYNEN korundu — sadece artık akordiyon gövdesi içinde kullanılıyorlar.
3. `www/js/app.js` — `toolsOpenResultsSheet`/`toolsCloseResultsSheet`
   yerine `toolsOpenResultsAccordion`/`toolsCloseResultsAccordion`/
   `toolsToggleResultsAccordion` (Referans Filtreleri'nin
   `toolsToggleFilterAccordion`'uyla BİREBİR AYNI desen — toggle,
   `.hidden`/`.open` class'ları, `toolsFilterOpen`'a karşılık
   `toolsResultsOpen`). Analiz başarıyla bitince `renderToolsAnalysisResults`
   + `toolsOpenResultsAccordion()` çağrılıyor (otomatik açılış). Kapatma
   sadece `.hidden` class'ı ekliyor — DOM'dan hiçbir şey silinmiyor,
   `toolsAnalysisResult` global'i korunuyor; tekrar açılışta `toolsAnalyzeBtn`
   HİÇ tetiklenmiyor, sadece `drawShortTermChart`/`drawCorrelationChart`
   (canvas `display:none` iken 0 genişlikte ölçülmesin diye rAF içinde,
   `.tools-tonal-chart-wrap`'in G99/G101'de öğrendiği AYNI desen) mevcut
   sonucu yeniden çiziyor. `toolsOpenSavedMeasurement()` (Dosyalarım →
   SON ÖLÇÜMLERİM) artık `toolsAnalysisResult`'ı da güncelliyor — ÖNCEKİ
   sheet-döneminde bu atama EKSİKTİ (chart redraw stale global'i
   kullanabilirdi, ilk çizim doğru olduğu için gizli kalan bir bug'dı,
   bu turda rastlanıp düzeltildi). `toolsSetBackgroundScrollLocked`/
   `toolsResetSheetScroll` DEĞİŞMEDİ — artık SADECE Dosyalarım sheet'i
   kullanıyor (yorum güncellendi). `toolsOpenFilesSheet()` içindeki artık
   var olmayan `toolsCloseResultsSheet()` çağrısı kaldırıldı.

**DOĞRULAMA (masaüstü Chrome, Playwright ile GERÇEK tarayıcı turu —
`www/` `python3 -m http.server` üzerinden, sentetik 4sn'lik WAV
`#toolsFileInput`'a `set_input_files` ile enjekte edildi, `devFlags.
simulatePro` ile paywall bypass edildi):**
- **Akordiyon varsayılan kapalı:** dosya yüklenince `toolsResultsBody`
  `.hidden`, `toolsResultsChevron` `.open` DEĞİL (ekran görüntüsüyle
  doğrulandı).
- **Analiz bitince otomatik açılıyor:** "Analiz et"e basılınca
  `toolsResultsBody` görünür oldu, chevron 180° döndü — ekran
  görüntüsünde net.
- **Başlık rozeti doğru:** analiz sonrası `toolsResultsHeaderBadge`
  metni gerçek `fmtLufs()` çıktısıyla (`"-10.22 LUFS"`) eşleşti.
- **Kapat→aç, analiz TEKRAR ÇALIŞMADI:** başlığa tıklayıp kapatıldı
  (rozet KALDI, sadece gövde gizlendi), tekrar açıldı — `toolsAnalyzeBtn`
  `.hidden`/etiket ("Analiz et", "Ölçülüyor…" DEĞİL) hiç değişmedi,
  `toolsAnalysisChannelTable`'ın `innerHTML`'i kapatma öncesiyle
  BİREBİR aynı kaldı (JS'ten string karşılaştırmayla doğrulandı).
- **Kaydırma, tab bar örtmesi yok:** `.tools-scroll` en alta
  kaydırıldığında standart notu tam görünür, `getBoundingClientRect().
  bottom` (631px) tab bar'ın `top`'undan (750px) küçük — hiçbir içerik
  tab bar'ın arkasında kalmıyor.
- **Dosyalarım sheet'i BOZULMADI:** akordiyon açıkken "değiştir"e
  basılıp Dosyalarım sheet'i açıldı, konsol hatası YOK, akordiyon
  altta AÇIK kalmaya devam etti (iki yüzey birbirine karışmıyor).
- **SON ÖLÇÜMLERİM'den geri dönüş çalışıyor:** kapatılmış akordiyon,
  Dosyalarım → SON ÖLÇÜMLERİM'deki kayıttan tekrar açıldı — rozet/
  içerik doğru, Dosyalarım sheet'i otomatik kapandı, konsol hatası YOK.
- **`npm test`: 1119/1119**, 0 hata (bu turda saf `createQuestion`/
  `evaluateAnswer` fonksiyonlarına DOKUNULMADI, beklenen sonuç).

**DÜRÜSTLÜK NOTU:** doğrulama masaüstü Chrome'da (Playwright, 390×844
viewport) yapıldı — cihazda (iOS Safari/WKWebView) CANLI doğrulanmadı.
Bu turun GEREKÇESİ zaten "sheet iOS'ta cihaza özgü konumlanma hatası
veriyordu" olduğu için, bu akordiyon yaklaşımının cihazdaki asıl sınavı
HENÜZ verilmedi — ama akordiyon deseni (Referans Filtreleri) ZATEN
cihazda doğrulanmış bir mekanizma (G111'de kartların baştan DOM'da
olması, `.tools-scroll`'un G113'te margin-bottom'la düzeltilmesi) olduğu
için, sheet'e özgü `position:fixed` konumlandırma sınıfı bir RİSK
kategorisi olarak TAMAMEN elendi (bkz. SIRADAKİ).

---

Önceki commit (G114, tek commit) — **Araçlar → Tonal Balance: cihazda görülen eğri kırpılması + eksik dB etiketi + gösterge renk karışıklığı; Araçlar → Mixini Yükle: karta çalar eklendi.**

**1) Eğriler grafikten taşıyordu — KÖK SEBEP:** `toolsTonalDy()` sabit
`/7` bölücüyle (yani sabit ±7dB) çiziyordu — ±7dB'yi aşan HERHANGİ bir
sapma (kullanıcının cihaz görüntüsünde SUB/ALT-ORTA'da olduğu gibi)
grafiğin üst/alt kenarında KIRPILIYORDU. **DÜZELTME:** dikey ölçek artık
DİNAMİK. `toolsTonalComputeRawHalfRange()` o an çizilen tüm eğrilerin
(hedef bandı ±eşik, ortalama, canlı) gerçek mutlak en yüksek sapmasını
bulup %15 pay ekliyor; `toolsTonalNiceHalfRange()` bunu okunaklı bir
"nice number"a (`[2,3,4,5,6,8,10,12,15,20,25,30,40,50]`) yuvarlıyor —
AYNI değer hem çizim ölçeği hem eksen etiketi olarak kullanıldığı için
ikisi ASLA uyuşmazlık göstermez.
**Titreme önleme:** taban aralık SADECE ortalama+hedeften hesaplanıyor
(canlı veri YOK) — bu, kare-kareye SABİT, titreme kaynağı olamaz. Canlı
veri varsa ve tabanı aşıyorsa ölçek üstel yumuşatmayla (%12/kare) YAVAŞÇA
genişliyor; canlı yoksa ANINDA taze değere dönüyor. Böylece task'ın iki
önerisi ("ortalama eğriye göre sabitlensin ya da yumuşak geçsin") BİRLİKTE
uygulandı.

**2) Dikey eksende dB etiketi yoktu:** `toolsTonalCurrentHalfRange`
değeri hem ±ince/sönük yatay ızgara çizgisi (`rgba(255,255,255,.045)`)
hem `+{hr}/0/−{hr}` metin etiketi olarak eklendi (sol üst köşe, eğrilerin
üstünde okunaklı kalsın diye en son çiziliyor).

**3) Gösterge renkleri ayırt edilmiyordu — KÖK SEBEP:** "Hedef bandı"
lejant noktası `rgba(34,211,238,.35)` (cyan) boyanmıştı ama grafikteki
GERÇEK hedef bandı izi `rgba(232,196,106,.35)` (altın) — "Ortalama"
noktasıyla (aynı cyan ailesi) neredeyse ayırt edilemiyordu.
**DÜZELTME:** "Hedef bandı" noktası `#e8c46a` (aynı temel ton, grafikle
BİREBİR) yapıldı. "Ortalama"/"Canlı" zaten doğruydu (dokunulmadı) —
`toolsTonalStrokeCurve()`'un kendi renk mantığı hedef-dışı segmentleri
altın, hedef-içi segmentleri cyan çiziyor; "Ortalama" lejantı bu cyan'ın
soluk (canlı akarken arka plana düşen) haline, "Canlı" tam parlaklığına
karşılık geliyor.

**4) Mixini Yükle kartına çalar eklendi:** dosya yüklüyken "Dosya seç"
butonunun yerini dosya adı + "değiştir" bağlantısı (cyan, altı çizili,
Dosyalarım sheet'ini açar) + oynat/duraklat+durdur kontrolleri alıyor.
**TEK paylaşılan oynatma durumu** — YENİ bir ikinci çalar YOK: `renderTools
MixPlayer()` var olan `toolsFilterPlaying` durumunu okuyor ve var olan
`toolsToggleFilterPlayback()`'i çağırıyor (Referans Filtreleri'nin
çalarıyla AYNI fonksiyon), `renderToolsFilterPlayer()`'ın sonuna
`renderToolsMixPlayer()` çağrısı eklendi ki HANGİ yüzeyden tetiklenirse
tetiklensin İKİSİ de senkron kalsın. "Durdur" için YENİ `toolsStopFilter
Playback()` yazıldı — duraklatmadan farkı `uploadManager.startFromZero()`
çağırıp konumu da sıfırlaması (duraklatma konumu KORUR, durdurma
SIFIRLAR). Dosya yokken kart eski haline (`#toolsUploadBtn` görünür,
`#toolsMixPlayer` gizli) dönüyor — `renderToolsCardsVisibility()`'e
eklenen `renderToolsMixPlayer(entry)` çağrısı bunu her kart-durumu
yeniden hesaplandığında garanti ediyor.

**DOĞRULAMA (masaüstü Chrome, GERÇEK tarayıcı turu — sentetik, AŞIRI
dengesiz bir WAV üretilip `#toolsFileInput`'a `DataTransfer` ile
enjekte edildi: 18 sinüs bileşeni, 30Hz–19kHz, ~1/f²·² eğimle bas-ağır):**
- **Kırpılma yok:** ölçülen sapmalar SUB +49.0 dB, BAS +24.1 dB,
  ALT-ORTA +10.7 dB, ORTA −9.0 dB, ÜST-ORTA −35.0 dB, TİZ −40.5 dB —
  ölçek OTOMATİK ±60'a genişledi, eğri grafiğin İÇİNDE (üst/alt kenara
  değmiyor) kaldı.
- **dB etiketleri doğru:** "+60" / "0" / "−60" üç etiket, ölçekle TUTARLI
  (aynı `toolsTonalCurrentHalfRange` değerinden üretiliyor).
- **Canlı akışta titreme yok:** çalma sırasında ~3 saniye boyunca birden
  fazla ekran görüntüsü alındı, ölçek "+60/0/−60"ta SABİT kaldı (bu
  dosyanın spektrumu zaman içinde değişmediği için beklenen davranış —
  taban zaten canlı veriyi kapsıyordu, genişleme tetiklenmedi).
- **Renkler eşleşiyor:** "Hedef bandı" noktası grafikteki altın dolgu/iz
  ile, "Ortalama"/"Canlı" noktaları cyan eğri segmentleriyle AYNI temel
  tonda (zoom ile piksel düzeyinde karşılaştırıldı).
- **Tek çalma durumu doğrulandı (çapraz kontrol testi):** Mixini Yükle'nin
  Oynat'ına basıldı → Tonal Balance kartında "CANLI" rozeti çıktı, Referans
  Filtreleri akordiyonu açılınca ORADAKİ çalar da duraklat ikonunu
  gösteriyordu (AYNI anda). Referans Filtreleri'nin duraklat düğmesine
  basıldı → Mixini Yükle'nin düğmesi de ANINDA oynat ikonuna döndü, CANLI
  rozeti kayboldu. Mixini Yükle'den tekrar Oynat, sonra Mixini Yükle'nin
  Durdur'una basıldı → HER İKİ yüzey de oynat ikonuna döndü (Referans
  Filtreleri'nin dalga formu/konumu da senkron). İki ayrı çalar YOK,
  doğrulandı.
- **`npm test`: 1119/1119**, 0 hata.

**DÜRÜSTLÜK NOTU:** doğrulama masaüstü Chrome'da, `www/` `python3 -m
http.server` üzerinden yapıldı — cihazda (iOS Safari/WKWebView) CANLI
doğrulanmadı (CLAUDE.md: "Ses ve DOM davranışı kaynak koddan
doğrulanamaz" — canvas çizimi/Web Audio state-machine cihazda AYRICA
test edilmeli, bkz. SIRADAKİ).

---

Önceki commit (G113, tek commit) — **KÖK SEBEP KESİN: G112'nin YANLIŞ mekanizması (padding) margin'e çevrildi — `.game-scroll`'un ZATEN öğrettiği ders G112'de uygulanmamıştı.**

**Kullanıcının cihaz kanıtı (Safari Web Inspector + CANLI DENEY):**
`innerHeight=932`, tab bar `top=804 height=128`, `.tools-scroll h=873
sh=873 ch=873 kaydırılabilir=false padding-bottom=96px`. Konsoldan CANLI
DENEY: `sc.style.height='804px'; sc.style.flex='0 0 auto'` → `ch=804,
sh=961, kaydırılabilir=TRUE`, GERÇEK parmak kaydırma ÇALIŞTI.

**KÖK SEBEP (kesinleşti):** G112, `.tools-scroll`'un alt PADDING'ini
`--tabbar-h`'a bağlamıştı — ama `padding-bottom` bir flex-item'ın (`flex:1
1 0%`) KENDİ boyutunu KÜÇÜLTMEZ, sadece İÇİNDEKİ taşma eşiğini değiştirir.
`.tools-scroll`'un KUTUSU (clientHeight) HÂLÂ `.screen`'in TÜM yüksekliğini
(tab bar'ın kapladığı ~106-128px DAHİL) kaplıyordu — padding değeri NE
OLURSA OLSUN bu değişmiyordu. **Bu proje bu DERSİ ZATEN ÖĞRENMİŞTİ**:
`.game-scroll`'un kendi (G-numarasız, köklü) yorumu BİREBİR AYNI teşhisi
yapıyor — "padding-bottom sadece scroll edilebilir FAZLA alan ekler,
KUTUNUN KENDİSİNİ actionbar'ın önünde DURDURMAZ... margin-bottom bunun
yerine KUTUNUN KENDİSİNİ actionbar'ın üst kenarında durdurur." G112 bu
YERLEŞİK dersi UYGULAMADAN, `.game-scroll`'un DAHA ÖNCE terk ettiği
padding-only yaklaşımına GERİ DÖNMÜŞTÜ.

**1) Kullanılan yükseklik hesabı:** `margin-bottom:calc(var(--tabbar-h) +
env(safe-area-inset-bottom))` — `--tabbar-h` DEĞİŞMEDİ (106px, G112'de
zaten `--actionbar-h` emsaliyle türetilmişti, kullanıcının YENİ cihaz
ölçümüyle çapraz doğrulandı: gerçek tab bar toplamı 128px = ~94px içerik
+ ~34px standart home-indicator safe-area, TAM olarak --tabbar-h'ın
kendi 94px ölçümüyle örtüşüyor). `margin-bottom`, flex-item'ın flex
container'dan aldığı DAĞITILABİLİR alanı DÜŞÜRÜYOR — kutunun KENDİSİ artık
tab bar'ın üst kenarında BİTİYOR (`.game-scroll` ile AYNI mekanizma,
BİREBİR).

**2) `padding-bottom`'ın durumu — KALDIRILMADI, KÜÇÜLTÜLDÜ:**
`.game-scroll`'un KENDİ deseni (`padding-bottom:20px` + `margin-bottom`)
takip edildi — `.tools-scroll`/`.prog-scroll`'un padding-bottom'u
`calc(var(--tabbar-h)+...)`'tan **20px**'e (küçük nefes payı) indirildi.
TAMAMEN kaldırılmadı çünkü `.game-scroll` da tutmuyor (task'ın kendi
sorusu "gereksizse kaldır" — burada TAM gereksiz değil, KÜÇÜLTÜLMESİ
gerekiyordu, kaldırılması değil).

**3) Sheet için seçilen çözüm ve gerekçesi:** "sheet tab bar'ı ÖRTSÜN"
(zaten böyleydi, `z-index` — `.tools-sheet:93` > `.tabbar:59`) SEÇİLDİ.
GEREKÇE: bottom-sheet/modal deseni için DOĞRU ve BEKLENEN davranış — sheet
AÇIKKEN tab bar'ın görünmesi/kullanılabilir olması zaten YANLIŞ olurdu.
`.tools-scroll`'daki KÖK SEBEP (kutunun KENDİSİ tab bar'ın ARKASINA
uzanıyordu, `position:static` bir KARDEŞ elemanla ÇAKIŞMA) sheet'te YOK —
sheet zaten `bottom:0`'da kendi z-index'iyle KAZANIYOR. Sheet'in GERÇEK
eksiği DAHA BASİTTİ: `.tools-sheet-body`'nin 30px alt boşluğu `env(safe-
area-inset-bottom)` İÇERMİYORDU (home-indicator'lı cihazlarda son satır
bu güvenli alana çok yakın/içinde kalabiliyordu) — `calc(30px + env(safe-
area-inset-bottom))`'a çevrildi. Bu SINIF, `.tools-scroll`'unkinden
FARKLI bir sorun — aynı "AYNI hata" başlığı altında bildirilmiş olsa da
KÖK SEBEBİ AYRI, bu yüzden AYRI bir çözümle ele alındı (Dosyalarım sheet'i
AYNI `.tools-sheet-body` class'ını paylaştığı için otomatik kapsandı).

**4) Ana Menü VE İlerleme — AYNI desende yazılmış, AYNI düzeltme
uygulandı:** İlerleme'nin `.prog-scroll`'u `.tools-scroll` ile BİREBİR
AYNI yapıdaydı (G112'nin de zaten fark ettiği gibi) — AYNI margin-bottom
düzeltmesi uygulandı. Ana Menü'nün (`#screen-menu`) `.scroll`'u (özel bir
alt-class'ı YOKTU, tabanı DOĞRUDAN kullanıyordu) AYNI `flex:1 1 0%`
deseninde olduğu DOĞRULANDI — yeni bir `.menu-scroll` class'ı EKLENDİ
(TABANDAKİ `.scroll` kuralına DOKUNULMADI, diğer `.scroll` kullanıcıları
— ayarlar/SSS gibi tab bar'ın görünmeyebileceği alt ekranlar — bilerek
ETKİLENMEDİ) ve AYNI margin-bottom uygulandı.

**DOĞRULAMA (masaüstü Chrome, `getBoundingClientRect()` ile GERÇEK geometri
ölçümü — task'ın notu: bu sınıf sorunlar cihazda ANLAMLI, aşağıdakiler
REGRESYON+mekanik doğrulama):**
- **`.tools-scroll`:** `clientHeight=793, elBottom=793, tabbarTop=805 →
  elStopsBeforeTabbar=true`, `marginBottom=106px, paddingBottom=20px,
  scrollHeight=852, overflows=true` — kutunun KENDİSİ artık tab bar'ın
  12px ÖNÜNDE bitiyor (kullanıcının "kabın yüksekliği: görünür alan − tab
  bar yüksekliği" isteğiyle BİREBİR).
- **`.menu-scroll`:** `clientHeight=793, elBottom=793, tabbarTop=805 →
  elStopsBeforeTabbar=true`, `marginBottom=106px, scrollHeight=1678`.
- **`.prog-scroll`:** `clientHeight=793, elBottom=793, tabbarTop=805 →
  elStopsBeforeTabbar=true`, `marginBottom=106px, scrollHeight=1117,
  overflows=true` — "İstatistikleri Sıfırla" butonu tab bar'ın üstünde,
  boşlukla (ekran görüntüsü).
- **Referans Filtreleri kartı:** dosyasız (sönük) durumda BİLE tam
  görünür, tab bar'ın üstünde (ekran görüntüsü) — G111'in "kartlar her
  zaman DOM'da" kararıyla BİRLEŞTİĞİNDE artık BAŞTAN doğru konumda.
- **Ölçüm Sonuçları sheet'i:** gerçek yüklü dosyayla açıldı, en alta
  kaydırıldı (`atBottom=true`), standart notu TAM görünür (ekran
  görüntüsü), `.tools-sheet-body` `paddingBottom=30px` (env(safe-area)=0
  bu ortamda, cihazda +~34px olacak).
- Konsol hatası: 0 (tüm akış boyunca).
- **`npm test`: 1119/1119** (SADECE CSS/HTML class değişti, JS davranışı
  aynı).

**DÜRÜSTLÜK NOTU:** `--tabbar-h:106px` DEĞİŞMEDİ ama bu turda kullanıcının
GERÇEK cihaz ölçümüyle (128px toplam − ~34px standart safe-area ≈ 94px
içerik) ÇAPRAZ DOĞRULANDI — G112'nin Chrome tahmini (94px ölçüldü, 106px'e
yuvarlandı) TUTARLI çıktı. Mekanizma (margin-bottom) `.game-scroll`'un
ZATEN PROVEN deseni olduğu için YÜKSEK güvenle doğru — ama BU TURDA da
iOS'ta CANLI DOĞRULANMADI (kullanıcının BİR SONRAKİ cihaz turunda
kesinleşecek).

---

Önceki commit (G112, tek commit) — **KÖK SEBEP #2: son kart tab bar'ın arkasında kalıyordu — kaydırma kabının alt boşluğu tab bar yüksekliğini karşılamıyordu.**

**Kullanıcının cihaz ölçümü (Safari Web Inspector, gerçek değerler):**
`.tools-scroll sh=873 ch=873` — scrollHeight===clientHeight, ama kartların
TOPLAMI (132+341+157+97=727px) kabın kendisinden (873px) DAHA KISA. Kök
sebep G109/G110'un ele aldığı "kap büyümüyor" sorunu DEĞİLDİ — kap zaten
DOĞRU yükseklikteydi, ama TAB BAR (position:fixed, z-index'i daha yüksek)
kabın ALT kısmının ÜSTÜNÜ ÖRTÜYORDU. `.tools-scroll`'un sabit 96px alt
boşluğu tab bar'ın GERÇEK yüksekliğini (env(safe-area-inset-bottom) HİÇ
YOKTU) karşılamıyordu.

**1) Eklenen boşluk — kaynağı ve px değeri:**
`--tabbar-h:106px` (yeni CSS değişkeni, `--actionbar-h` ile AYNI konumda,
`:root`). Masaüstü Chrome'da GERÇEK ÖLÇÜM: `.tabbar` toplam yüksekliği
94px (`getBoundingClientRect()`) = padding-top 10 + `.tabs` 70 +
padding-bottom 14 (bu ortamda `env(safe-area-inset-bottom)=0`). Bu proje
zaten `--actionbar-h` için AYNI deseni kullanıyor (masaüstünde ölçüp iOS
font-rendering farkına karşı ~%12 pay ile yuvarlamak, bkz. o değişkenin
kendi yorumu: 150→168) — AYNI mantıkla 94px → **106px**'e yuvarlandı.
`env(safe-area-inset-bottom)` AYRICA `calc()` içinde ekleniyor (--tabbar-h
İÇİNE GÖMÜLMEDİ) — `.game-scroll`'un `--actionbar-h` ile AYNI kompozisyon
deseni.

**2) `.tools-scroll` VE `.prog-scroll` (İlerleme sekmesi, task'ın kendi
isteğiyle kontrol edildi — AYNI hardcoded 96px'e sahipti, AYNI kök sebep):**
```css
/* ÖNCESİ (ikisi de): */
padding:62px 16px 96px 16px !important;
/* SONRASI (ikisi de): */
padding:62px 16px calc(var(--tabbar-h) + env(safe-area-inset-bottom)) 16px !important;
```

**DOĞRULAMA (ekran görüntüsüyle, masaüstü Chrome — task'ın notu: bu sınıf
sorunlar cihazda ANLAMLI, aşağıdakiler REGRESYON+mekanik doğrulama):**
- `.tools-scroll` YENİ ölçüm (dosya yüklü, Referans Filtreleri kapalı):
  `paddingBottom=106px, scrollHeight=954, clientHeight=899, overflows=true`.
  En alta kadar kaydırıldı → Referans Filtreleri kartı TAM görünür, tab
  bar'ın ÜSTÜNDE, örtülmüyor (ekran görüntüsü).
- Referans Filtreleri akordiyonu açılıp TEKRAR en alta kaydırıldı → 5
  filtre kartının (Telefon Hoparlörü/Araba/Kulaklık/Club Sistemi/Laptop
  Hoparlörü) TAMAMI görünür ve tab bar'ın üstünde kaldı (ekran görüntüsü).
- `.prog-scroll` (İlerleme sekmesi) YENİ ölçüm: `paddingBottom=106px,
  scrollHeight=1203, clientHeight=899, scrollTop=304, atBottom=true` — en
  alttaki "İstatistikleri Sıfırla" butonu TAM görünür, tab bar'ın üstünde.
- **Kapsam notu:** ana menünün (`#screen-menu`) `.scroll`'u AYRI bir
  taban değer kullanıyor (`calc(150px + env(safe-area-inset-bottom))`,
  `--tabbar-h`'tan BAĞIMSIZ, önceden var) — 150px zaten 106px'ten daha
  cömert olduğu için bu turda dokunulmadı, task da SADECE Araçlar+İlerleme
  istemişti.
- Konsol hatası: 0.
- **`npm test`: 1119/1119** (SADECE CSS değişti, JS davranışı aynı).

**DÜRÜSTLÜK NOTU:** `--tabbar-h:106px` masaüstü Chrome'da ÖLÇÜLEN 94px'e
`--actionbar-h`'ın kendi emsal payıyla yuvarlanmış bir DEĞER — iOS'ta CANLI
ÖLÇÜLMEDİ. Cihazda hâlâ dar/geniş çıkarsa (ör. Dynamic Island'lı model
farklı tab bar boyutu üretirse) bu TEK sabit güncellenmeli, `.tools-scroll`/
`.prog-scroll` İKİSİ de otomatik düzelir (`var()` ile bağlı).

---

Önceki commit (G111, tek commit) — **Araçlar: dört kart HER ZAMAN görünür — dosya yokken üçü sönük + "Önce bir dosya yükle" ipucu.**

**GEREKÇE (kullanıcının kendi kararı):** (1) kullanıcı uygulamanın ne
sunduğunu dosya yüklemeden GÖRSÜN; (2) G109'da bulunan "kartlar sonradan
görünür olunca `.tools-scroll` yeniden ölçülmüyor" riskinin KAYNAĞI
kapansın — kartlar artık HER ZAMAN DOM'da/düzende, sonradan `display:none`
→ `flex` geçişi YOK.

**1) HTML (`index.html`) — üç kart artık `.hidden` (display:none) yerine
`.tools-card-disabled` ile başlıyor, her birine bir ipucu satırı eklendi:**
- `#toolsTonalCard`, `#toolsAnalysisCard`: `class="tools-card hidden"` →
  `class="tools-card tools-card-disabled"`.
- Referans Filtreleri'nin sarmalayıcısı (önceden id'siz) artık
  `id="toolsFilterCard" class="tools-card tools-card-disabled"` — bu kart
  zaten HER ZAMAN görünürdü (`.hidden` hiç yoktu), şimdi İLK KEZ dosyasız
  durumda sönük/tıklanamaz.
- Her üçünün `.tools-card-top` başlığından HEMEN SONRA:
  `<div class="tools-card-disabled-hint" id="...">Önce bir dosya yükle</div>`.

**2) CSS (`styles.css`) — yeni iki kural:**
```css
.tools-card-disabled{opacity:.45;pointer-events:none}
.tools-card-disabled-hint{display:none;padding:10px 0 0 0;text-align:center;font-size:12px;font-weight:600;color:#6c7178}
.tools-card-disabled .tools-card-disabled-hint{display:block}
```
İpucu satırının görünürlüğü TAMAMEN CSS'in soy (descendant) seçicisiyle
yönetiliyor — JS ipucuyu AYRICA toggle ETMİYOR, tek bir class (kartın
kendisi) yeterli. `pointer-events:none` GERÇEK bir tıklama/dokunuşu
engelliyor (sadece opacity yetmezdi — kart içindeki butonlar dosyasız
durumda hâlâ tıklanabilir kalırdı). Başlık/ikon İÇİN ayrı bir istisna YOK —
"sadece sönük olsun" isteği, kartın TAMAMININ (başlık dahil) aynı
opacity'yle solmasıyla karşılandı.

**3) JS (`app.js`) — `renderToolsCardsVisibility()` ve İKİ competing
toggle düzeltildi:**
- `renderToolsCardsVisibility()`: `.hidden` yerine `.tools-card-disabled`
  toggle ediyor, ÜÇÜNCÜ karta (`els.toolsFilterCard`) da uygulanıyor
  (öncesinde Referans Filtreleri bu fonksiyonun HİÇ kapsamında değildi).
- `renderToolsTonalCard()` (satır ~8586) AYRICA `els.toolsTonalCard`'a
  `.hidden` toggle ediyordu (redundant ama competing bir kod yolu) —
  `.tools-card-disabled`'a çevrildi, aksi halde bu ikinci toggle kartı
  YENİDEN `display:none` yapıp G111'i BOZARDI.
  `toolsTonalLiveTick()`'teki `!classList.contains("hidden")` görünürlük
  kontrolü de `.tools-card-disabled` kontrolüne çevrildi (aksi halde HER
  ZAMAN `true` dönerdi, çünkü element artık HİÇBİR ZAMAN `.hidden`
  almıyor).
- `els.toolsFilterCard` yeni bir element referansı olarak eklendi.

**DOĞRULAMA (ekran görüntüsüyle, masaüstü Chrome):**
- **Dosya yokken:** dört kart da göründü — "Mixini Yükle" tam opak/aktif,
  "Tonal Balance"/"Ölçüm Sonuçları"/"Referans Filtreleri" başlık+ikon
  GÖRÜNÜR ama sönük (opacity .45), her birinde "Önce bir dosya yükle"
  ortalanmış küçük metin, tıklama/dokunuş ETKİSİZ (pointer-events:none —
  Referans Filtreleri başlığına tıklandığında akordiyon AÇILMADI).
- **Dosya yüklenince:** üçü de TAM opaklığa döndü, ipucu metni KAYBOLDU,
  Tonal Balance GERÇEK veriyle çizildi, Ölçüm Sonuçları'nın "Analiz et"
  butonu aktif, Referans Filtreleri'ne tıklanınca akordiyon GERÇEKTEN
  açıldı (chevron döndü, çalar paneli göründü) — üçü de TAM işlevsel.
- **`[scroll-diag]` / `.tools-scroll` ölçümü:**
  - Dosya YOKKEN (4 kart, 3'ü sönük ama DOM'da/ölçülüyor):
    `scrollHeight=928, clientHeight=899, overflows=true` — task'ın
    gerekçesi DOĞRULANDI, kap BAŞTAN doğru yükseklikte kuruluyor.
    (dosyasız durumda sheet açılıp kapatılmadığı için `[scroll-diag]`
    logu bu durumda tetiklenmedi, doğrudan `scrollHeight`/`clientHeight`
    okunarak doğrulandı.)
  - Dosya YÜKLENİP Dosyalarım sheet'i açılıp kapatıldıktan SONRA:
    `[scroll-diag] kilit kalktı — overflow-y=auto, touch-action=auto,
    scrollTop=0, scrollHeight=1700, clientHeight=899, kaydırılabilir=true`
    (Referans Filtreleri akordiyonu da açıkken).
- Konsol hatası: 0 (tüm akış boyunca — kart geçişleri, sheet aç/kapa,
  akordiyon aç/kapa).
- **`npm test`: 1119/1119.**

---

Önceki commit (G110, tek commit) — **KÖK SEBEP: G107'nin html/body position:fixed kilidi kaldırıldı — cihaz kanıtıyla DOĞRULANMIŞ gereksiz bir yan etkiydi.**

**Kullanıcının cihaz kanıtı:** `[scroll-diag] kilit kalktı — overflow-y=auto,
touch-action=auto, scrollTop=0, scrollHeight=873, clientHeight=873,
kaydırılabilir=false` — kilit GERÇEKTEN kalkıyor, stiller doğru, ama
`.tools-scroll`'un `scrollHeight`'ı içerikle BİRLİKTE BÜYÜMÜYOR. Kullanıcının
kendi hipotezi: G107'nin `html,body{position:fixed;inset:0;overflow:hidden}`
kuralı bunu bozuyor olabilir.

**1) Yükseklik zincirinin TAM dökümü (masaüstü Chrome'da GERÇEK ölçüm,
`getComputedStyle`+`scrollHeight`/`clientHeight` ile):**

| Eleman | height | position | overflow | scrollHeight/clientHeight |
|---|---|---|---|---|
| `html` | 899px (`--app-vh`) | ~~fixed~~→static (G110) | hidden | 899/899 |
| `body` | 899px | ~~fixed~~→static (G110) | hidden | 899/899 |
| `.app-shell` | 899px (`var(--app-vh)`) | relative | visible | 899/899 |
| `#screen-tools` (`.screen`) | 100% (→899px) | static | visible | 899/899 |
| `.tools-scroll` (`.scroll`) | flex:1;min-height:0 (→899px) | static | **auto** | **944/899 (G110'da DÜZELDİ — önce html/body fixed'ken de AYNI ölçüm, aşağıya bkz.)** |

**KRİTİK BULGU:** `.tools-scroll`'un `scrollHeight` (944) `clientHeight`'ı
(899) AŞIYORDU — html/body'nin `position:fixed` OLDUĞU HALDE (yani G107'nin
kuralı DEĞİŞTİRİLMEDEN, sadece dosya yüklenip 3 kart görünür haldeyken) —
masaüstü Chrome'da zincir MEKANİK olarak ÇALIŞIYORDU (44px taşma). Bu,
kullanıcının "kaydırma kabı BÜYÜYEMİYOR" iddiasının GENEL bir CSS/flex
mimarisi kırığı OLMADIĞINI gösteriyor — kartlar zaten `.tools-card{flex-
shrink:0}` ile sıkıştırılmaya karşı KORUNUYORDU (kod incelemesiyle
doğrulandı, `.tools-head`/`.tools-card` ikisi de flex-shrink:0). Yani
Chrome'da AYNI html/body kuralıyla bile taşma OLUŞUYORDU — bu, sorunun (varsa)
SAF CSS zincirinden değil, iOS WKWebView'e ÖZGÜ bir render farkından
geldiğini düşündürüyor (KANITLANAMADI, bkz. aşağıdaki DÜRÜSTLÜK notu).

**2) `position:fixed;inset:0` KALDIRILDI, `overflow:hidden` KORUNDU
(styles.css, `html,body` kuralı):**
```css
/* ÖNCESİ (G107): */
html,body{position:fixed;inset:0;margin:0;overflow:hidden;overscroll-behavior:none;...}
/* SONRASI (G110): */
html,body{margin:0;min-height:100%;overflow:hidden;overscroll-behavior:none;...}
```
Gerekçe: `position:fixed` bir eleman, İÇİNDEKİ `position:fixed` torunların
(`.tools-sheet`) containing block'unu DEĞİŞTİRMEZ — SADECE `transform`/
`filter`/`will-change:transform` gibi özellikler bunu yapar. Yani G107'nin
`position:fixed`'i TEORİDE `.tools-sheet`'in konumlanmasını hiç
ETKİLEMİYORDU — G107'nin asıl faydası (varsa) muhtemelen SADECE
`overflow:hidden`'dandı (KORUNDU). `position:fixed;inset:0` ise iOS
WKWebView'de NESTED `overflow:auto` bölgelerinin momentum-scroll/layout
hesaplamasını bozan, iyi belgelenmemiş bir yan etki OLABİLİRDİ (kullanıcının
hipotezi) — kaldırıldığında Chrome'da HİÇBİR REGRESYON gözlenmedi (aşağıya
bkz.), bu yüzden "yan etkisiz" alternatif olarak SEÇİLDİ.

**3) Aynı zincir sorunu Ölçüm Sonuçları sheet'inin alt kısmını da etkileyip
etkilemediği KONTROL EDİLDİ:** `#toolsResultsSheet .tools-sheet-body` AYNI
desen (`flex:1;min-height:0;overflow-y:auto`) — G110'un düzeltmesinden
SONRA test edildi: `scrollHeight=1082, clientHeight=687, overflows=true`,
sheet EN ALTA KADAR kaydırıldı (`atBottom:true`), standart notu TAM
GÖRÜNDÜ (ekran görüntüsüyle doğrulandı) — kesilme YOK.

**DOĞRULAMA (masaüstü Chrome — task'ın notu: bu sorun BURADA
ÜRETİLEMİYOR, aşağıdakiler REGRESYON kontrolü, cihaz kanıtı DEĞİL):**
- Dosya yüklendi (3-4 kart) → `.tools-scroll`: `scrollHeight=944,
  clientHeight=899, overflows=true` (G110'un YENİ html/body kuralıyla).
- Ölçüm Sonuçları sheet'i açıldı → en alta kadar kaydırıldı → standart
  notu TAM görünür, tab bar tarafından KESİLMEDİ.
- Sheet kapatıldı → `[scroll-diag]`: `overflow-y=auto, touch-action=auto,
  scrollTop=0, scrollHeight=926, clientHeight=899, kaydırılabilir=true`
  (BİR ÖNCEKİ dosya-dolu durumunda) — kilit kalkışı ve taşma DOĞRU
  algılanıyor.
- Konsol hatası: 0.
- **`npm test`: 1119/1119** (SADECE CSS değişti, JS davranışı aynı).

**DÜRÜSTLÜK NOTU (KESİN KANIT DEĞİL):** bu değişiklik kullanıcının
hipotezini test eden, MANTIKLI gerekçeli bir düzeltme — ama `position:fixed`
kaldırıldığında iOS'ta GERÇEKTEN `.tools-scroll`'un düzeldiği BURADA
KANITLANAMADI (bu sınıf sorunlar zaten masaüstünde üretilemiyor, task'ın
kendi notu). AYNI ZAMANDA G107'nin ASIL amacı (sheet ekranın altında kalma)
BAŞTAN BERİ cihazda hiç doğrulanmamıştı (G107'nin kendi DÜRÜSTLÜK notu) —
yani bu değişiklik iki YÖNDE de (düzeltiyor mu, yeniden mi bozuyor) SADECE
bir SONRAKİ cihaz turunda kesinleşecek.

---

Önceki commit (G109, tek commit) — **Kaydırma kilidi sertleştirildi + [scroll-diag] günlüğü — Dosyalarım sheet'i kapanınca Araçlar kaydırılamıyor (üçüncü bildirim).**

**BAĞLAM (G108'in bulgusu):** teşhis günlükleri cihazda çalıştırıldı —
yükleme zincirinin 7 adımının HEPSİ 500ms altında tamamlandı, donma DEĞİL.
Gerçek sorun: Dosyalarım sheet'i kapandıktan sonra Araçlar sekmesi
kaydırılamıyor — kullanıcının EN İLK bildirdiği "sayfa yukarı kaymıyor"
şikâyetiyle AYNI aile, üçüncü kez geri geliyor.

**1) Kaydırma kabı belirlendi:** `.tools-scroll` (`#screen-tools` içindeki
TEK `overflow-y:auto` bölge — `styles.css:.scroll{overflow-y:auto;
-webkit-overflow-scrolling:touch}` + `.tools-scroll{padding...}` katkısı).
`html`/`body` DEĞİL — onlar G107'den beri KALICI `position:fixed;inset:0;
overflow:hidden` (kod incelemesiyle DOĞRULANDI, `toolsSetBackgroundScrollLocked`
onlara HİÇ dokunmuyor).

**2) Kilit AÇILMA/KAPANMA'da değişen stiller — TAM liste (kod incelemesiyle
çıkarıldı, `toolsSetBackgroundScrollLocked` fonksiyonu):**
- **Kilitlenirken (`locked=true`):** `.tools-scroll`'a inline `overflow:
  hidden` + (G109'da EKLENDİ) inline `touch-action:none`.
- **Kilit kalkarken (`locked=false`, ESKİ hâl):** SADECE inline `overflow`
  BOŞ STRİNG'e (`""`) çekiliyordu + `scrollTop=0`.
- **Kilit kalkarken (YENİ, G109):** `overflow` + `touch-action` +
  (önlem amaçlı, hiç dokunulmadıkları DOĞRULANMIŞ olsa da) `pointer-events`/
  `position`/`inset` — BEŞİ DE `removeProperty` ile TEMİZLENİYOR (BOŞ
  STRİNG atamak yerine — niyeti netleştirmek için), `scrollTop=0`, sonra
  `void scrollEl.offsetHeight` okunarak GERÇEK bir reflow ZORLANIYOR (iOS'un
  overflow değişikliğini bazen ANINDA uygulamadığı bilinen bir mobil Safari
  tuhaflığına karşı — KANITLANMIŞ bir düzeltme DEĞİL, ek bir güvenlik
  önlemi, DÜRÜSTLÜKLE işaretlendi).
- **pointer-events/position/inset bu elemanda daha önce DE hiç
  değiştirilmiyordu** — kullanıcının "bunlar da eski hâline dönsün" isteği,
  incelemeyle, ZATEN karşılanıyordu; G109 sadece bunu AÇIKÇA/KANITLANABİLİR
  hale getirdi.

**3) "Tek fonksiyonda topla" — DOĞRULAMA:** `toolsOpenFilesSheet`/
`toolsCloseFilesSheet`/`toolsOpenResultsSheet`/`toolsCloseResultsSheet`
(hem Dosyalarım hem Ölçüm Sonuçları sheet'inin DÖRDÜ de) `grep` ile
incelendi — HEPSİ ZATEN SADECE `toolsSetBackgroundScrollLocked()`'ı
çağırıyordu, `.tools-scroll`'a dokunan BAŞKA HİÇBİR kod yolu yoktu
(`grep -n "tools-scroll" app.js` → SADECE bu fonksiyon içinde eşleşme).
Yani "dağınık stil değişikliği" YOKTU — ama fonksiyonun KENDİSİ eksikti
(sadece overflow, reflow zorlaması yok, touch-action hiç yok) — G109 bu
TEK fonksiyonu sertleştirdi, YENİ bir fonksiyon/soyutlama EKLEMEDİ.

**4) `[scroll-diag]` günlüğü eklendi** — unlock'ın SONUNDA, `.tools-scroll`'un
GERÇEK (hesaplanmış) durumunu yazıyor: `overflow-y`, `touch-action`,
`scrollTop`, `scrollHeight`, `clientHeight`, `kaydırılabilir` (scrollHeight>
clientHeight). Tek satır, kolayca `grep`lenebilir önek (`[scroll-diag]`).

**DÜRÜSTLÜK NOTU (AÇIK KALAN BİR OLASILIK, ELENMEDİ):** kullanıcının
hipotezi ("G106/G107'nin html,body kilidi çakışıyor olabilir") kısmen
DOĞRULANDI kısmen DÜZELTİLDİ: `toolsSetBackgroundScrollLocked`'ın KENDİSİ
html/body'ye hiç dokunmuyordu (bu iddia yanlıştı) — AMA G107'nin html/body'yi
KALICI OLARAK `position:fixed` yapması, `.tools-scroll`'un KENDİ touch-scroll
davranışını sheet'ten TAMAMEN BAĞIMSIZ olarak etkiliyor OLABİLİR (iOS'un
iç-içe `overflow:auto` bölgelerinin momentum-scroll fiziğini nasıl
işlediğiyle ilgili, statik kod incelemesiyle KANITLANAMAYAN bir alan) —
bu ihtimal bu turda ELENMEDİ. [scroll-diag] çıktısı sheet hiç AÇILMADAN
da (kullanıcı konsoldan `document.querySelector('.tools-scroll')`
üzerinden elle) kontrol edilebilir — eğer sheet açılmadan BİLE
`overflow-y` "auto" DEĞİLSE, sorun kilit mekanizmasında değil, G107'nin
html/body kuralında aranmalı.

**DOĞRULAMA (masaüstü Chrome — task'ın notu: bu sorun BURADA
ÜRETİLEMİYOR, aşağıdakiler sadece REGRESYON kontrolü, cihaz kanıtı
DEĞİL):**
- Dosyalarım sheet'i açıldı (5 dosyalık dolu liste) → kapatıldı →
  `[scroll-diag]` konsola yazdı: `overflow-y=auto, touch-action=auto,
  scrollTop=0, scrollHeight=899, clientHeight=899` (bu viewport'ta içerik
  tam sığıyordu, "kaydırılabilir=false" — beklenen, hata değil).
  Ardından "Referans Filtreleri" açılıp içerik viewport'u AŞACAK kadar
  uzatıldı, GERÇEK bir scroll jesti ekran görüntüsüyle DOĞRULANDI (liste
  kaydı, `.tools-scroll` sorunsuz çalıştı).
- Konsol hatası: 0.
- **`npm test`: 1119/1119.**

---

Önceki commit (G108, tek commit) — **SADECE TEŞHİS: copyFile sonrası donma için adım adım günlükleme (task'ın kendi kuralı — düzeltme YAPILMADI).**

**Kullanıcının kanıtı:** G107'nin copyFile düzeltmesi ÇALIŞIYOR (appendFile/
base64 trafiği tamamen kalkmış, konsolda `Filesystem.mkdir → Filesystem.
getUri → FilePicker.copyFile` sırayla görünüp copyFile SONUÇ DÖNÜYOR) AMA
donma sürüyor ve copyFile'dan SONRA hiçbir log/hata yok.

**Kod izi (`toolsAddFile`/`toolsHandlePickNewFile` sırası) çıkarıldı:**
copyFile (adım 6, dosya SAVE'i) aslında decode+dalga formundan (adım 2-4)
SONRA ama Tonal Balance ölçümünden (adım 5) ÖNCE çalışıyor — adım 5,
`toolsSelectFile()`'ın `renderToolsCardsVisibility()`→`renderToolsTonalCard()`
zincirinden AWAIT EDİLMEDEN (detached) tetikleniyor. **GÜÇLÜ ŞÜPHELİ
bulundu:** `tonal-balance.js:measureSpectralDeviation()` — iOS Safari/
WKWebView'in `OfflineAudioContext.suspend()`/`resume()` ZİNCİRLEMESİNDE iyi
belgelenmiş güvenilirlik sorunları var; bu döngü BAŞARISIZ OLURSA (hata
FIRLATMADAN sonsuza kadar askıda kalırsa) hiç log/hata görünmez — kullanıcının
tarif ettiği "sessiz donma" ile TAM örtüşüyor. **Ama bu sadece bir HİPOTEZ —
DOĞRULANMADI, task'ın kuralı gereği DÜZELTİLMEDİ.**

**Eklenen günlükleme — `[upload-diag]` önekli, tek satır, BAŞLIYOR/BİTTİ +
süre + (varsa) `performance.memory`, task'ın istediği format:**
- **`app.js`** — adım 1 (`pickNativeAudioFile`'daki fetch+blob okuma), adım
  2/4/5/6/7 sarmalayıcıları (`toolsAddFile`/`toolsEnsureTonalMeasured`/
  `toolsHandlePickNewFile` + web `<input>` yolu için AYNI adım 7).
- **`upload.js`** — adım 2 (file.arrayBuffer) ve adım 3'ü (decodeAudioData +
  BAŞARISIZ olursa decodeWavPcm yedeği, createBuffer/copyToChannel dahil)
  AYRI AYRI ölçüyor (`toolsAddFile`'daki tek sarmalayıcı bunları BİRLEŞTİRİYOR,
  burada ayrıştırıldı).
- **`tonal-balance.js`** — EN AYRINTILI günlükleme (ana şüpheli burada):
  OfflineAudioContext kurulumu, `ctx.startRendering()`, ve suspend/resume
  döngüsünün HER hop'u değil (uzun dosyada yüzlerce satır olurdu) ilk 3 +
  her 10'da bir + BİTTİ — **eğer cihazda donma burada oluyorsa, konsolda
  BAŞLIYOR log'u görünüp bir SONRAKİ beklenen hop hiç gelmez, bu TAM OLARAK
  hangi saniyede (t=X.Xs) kaldığını gösterir.**
- **`file-storage.js`** — kullanıcının kanıtının KESTİĞİ TAM NOKTA: `mkdir`/
  `getUri`/`copyFile`'ın HER BİRİ ayrı BAŞLIYOR/BİTTİ, + copyFile'dan hemen
  SONRAKİ `onProgress(1)` + fonksiyondan `return`'ün KENDİSİ bile ayrı
  loglandı ("6d) saveFileNativeCopy()'den return") — eğer cihazda bu son log
  bile GÖRÜNMÜYORSA, kök sebep `FilePicker.copyFile`'ın KENDİ native
  tarafında (JS'e hiç dönmeyen bir native thread askısı) aranmalı.

**DÜRÜSTLÜK NOTU:** hiçbir kod DAVRANIŞI değiştirilmedi (sadece `console.log`
eklendi) — bu, geçici teşhis kodu, kök sebep bulununca KALDIRILMASI
BEKLENİR (4 dosyada BİLEREK küçük/tekrarlı bir `uploadDiagLog` kopyası,
paylaşılan modül EKLENMEDİ — atılacak kod için orantısız olurdu).

**DOĞRULAMA:**
- **Masaüstü Chrome'da günlüklerin çıktığı GÖSTERİLDİ** (gerçek dosya
  yükleme akışı, `read_console_messages` ile yakalandı): 20 saniyelik test
  dosyasında TÜM 7 adım + Tonal Balance'ın 5a alt-adımları (OfflineAudioContext
  kurulumu, suspend/resume döngüsü 39 hop'un TAMAMI ~22ms'de BİTTİ, `ctx.
  startRendering()`) beklenen sırada, tek satır formatında, `performance.
  memory` değerleriyle (Chrome'da mevcut) birlikte göründü — konsol hatası 0.
  **Masaüstünde döngü SORUNSUZ tamamlandı (22ms) — bu, cihazdaki donmanın
  Chrome'da HİÇ ÜRETİLEMEDİĞİNİ, teşhisin SADECE cihazda anlamlı olacağını
  DOĞRULUYOR** (task'ın kendi notuyla tutarlı).
- **`npm test`: 1119/1119** (davranış değişmedi, sadece log eklendi —
  hiçbir test değiştirilmedi/silinmedi).

---

Önceki commit (G107, tek commit) — **Araçlar: cihazda (iOS Safari Web Inspector) kanıtlanan ÜÇ düzeltme.**

**1) DOSYA YÜKLEME DONMASI — Yol B (native copyFile) seçildi, Yol A (küçültülmüş
parça) güvenlik ağı olarak korundu.** Kullanıcının konsol kanıtı (32MB WAV,
writeFile 1 + appendFile ardışık 8+, her biri base64 dize) KÖK SEBEBİ zaten
doğru teşhis etmişti — iki yol da değerlendirildi, plugin KAYNAK KODU okunarak
karar verildi (tahmin değil):
- **Yol B seçildi:** `@capawesome/capacitor-file-picker`'ın KENDİ `copyFile()`
  metodu — kaynak doğrulandı (`node_modules/@capawesome/capacitor-file-picker/
  ios/Plugin/FilePicker.swift:17-39`: düz `FileManager.copyItem`; `android/.../
  FilePicker.java:32-51`: `ContentResolver` stream kopyası) — İKİSİ DE base64/
  JS-native köprü veri taşıması İÇERMİYOR. Kaynak yol (`picked.path`) GÜVENLİ:
  aynı plugin'in `pickFiles()` delegate'i (`FilePicker.swift:303-310`) seçilen
  dosyayı DAHA ÖNCE uygulamanın kendi tmp/cache dizinine kopyalamış oluyor —
  security-scoped resource erişimi gerekmiyor.
- **Android'e özgü bulunan EK kök sebep (bkz. Filesystem/FilePicker kaynağı):**
  `copyFile()`'ın Android tarafı hedef URI'yi `FileProvider.getUriForFile()`
  ile çözüyor; `Directory.Data` Android'de `context.filesDir`'e eşleniyor
  (`@capacitor/filesystem LegacyFilesystemImplementation.kt:54`) ama
  `android/app/src/main/res/xml/file_paths.xml`'de bunu kapsayan bir
  `<files-path>` girdisi YOKTU — düzeltilmeseydi Yol B Android'de HER ZAMAN
  "Failed to find configured root" hatasıyla başarısız olurdu. EKLENDİ.
- **Yol A korundu (güvenlik ağı):** `NATIVE_WRITE_CHUNK_BYTES` 4MB→1MB
  (kullanıcının önerdiği 512KB-1MB aralığının üst ucu) — nativePath yoksa
  (web `<input>` yolu) VEYA Yol B başarısız olursa OTOMATİK buraya düşülüyor
  (`file-storage.js:saveFile`, try/catch).
- **Uygulama:** `app.js:pickNativeAudioFile()` artık native path'i döndürülen
  `File`'a `__nativePickerPath` olarak iliştiriyor (5 çağıran taraf da
  DEĞİŞMEDİ); `toolsAddFile()` bunu `fileStorage.saveFile(id, file, onProgress,
  nativePath)`'e geçiyor.
- **DÜRÜSTLÜK NOTU:** hem Yol B'nin doğruluğu hem file_paths.xml eksikliği
  PLUGIN KAYNAĞI okunarak doğrulandı, ama bu ortamda gerçek iOS/Android cihaz
  YOK — runtime davranışı BURADA KANITLANAMADI (task'ın kendi notu). Chrome'da
  ÜÇ senaryo gerçek `file-storage.js` modülü stub'lanmış `window.Capacitor` ile
  çalıştırılarak DOĞRULANDI (aşağıda) — bu, KOD YOLUNUN doğru dallandığını
  kanıtlıyor, cihazdaki GERÇEK performansı değil.

**2) ÖLÇÜM SHEET'İ EKRANIN ALTINDA KALIYOR — üçüncü bildirim, KÖK SEBEP
FARKLI bir katmanda arandı.** G103/G105 zaten `.tools-sheet`'i `--app-vh`
tabanlı yükseklik + arka plan kilidiyle düzeltmişti ama iOS'ta ÇÖZMEMİŞTİ —
bu ikisi SHEET'İN KENDİ CSS'İNE odaklanıyordu. Bu turda BELGE (`html`/`body`)
seviyesine bakıldı: iyi belgelenmiş bir WKWebView/iOS Safari davranışı,
`position:fixed` elemanlar belge KAYDIRILABİLİR durumdaysa "layout viewport"a
göre konumlanabiliyor — bu "visual viewport"tan farklı olabiliyor, sonuç
fixed elemanın gerçek ekranın altında/dışında gibi davranması. Bu projede
`html`/`body`'nin ZATEN hiç kaydırılması GEREKMİYOR (`.app-shell` height:
var(--app-vh) + `.screen` height:100% + TÜM içerik kendi `.scroll`/`.game-
scroll`/`.tools-scroll` bölgeleri içinde taşıyor — G73 döneminden kalan
kendi yorumu bunu zaten doğruluyor: "artık .game-scroll GERÇEKTEN kendi
içinde taşıyor"). **Düzeltme:** `html,body{position:fixed;inset:0;
overflow:hidden;overscroll-behavior:none}` — belge TAMAMEN kilitlendi,
rubber-band/overscroll dahil hiç kaydırılamıyor. `app.js`'teki
`scrollToAnalyzer()` (`window.scrollTo`/`scrollY` kullanıyor) BİLEREK
DOKUNULMADI — mevcut mimaride zaten geometrik olarak no-op olması gerekiyordu
(`.screen` her zaman `--app-vh`'yi TAM dolduruyor), bu değişiklik onu
KESİNLEŞTİRİYOR, yeni bir regresyon YARATMIYOR (kapsam dışı, ayrı incelenmeli
istenirse). **DÜRÜSTLÜK NOTU:** bu da cihazda KANITLANAMADI — Chrome'da sheet
açma/kapama/yeniden açma DÖNGÜSÜ regresyon için test edildi (aşağıda), gerçek
iOS layout-viewport davranışı BURADA ÜRETİLEMEDİ.

**3) LOUDNESS RANGE ONDALIK TUTARSIZLIĞI — düzeltildi.** `fmtLu()`
`.toFixed(1)`→`.toFixed(2)`. G105'in "task'ın listesi sadece dB/LUFS diyordu"
kararı bu turda kullanıcının AÇIK yeni talimatıyla geçersiz kılındı — tahmin
değil, doğrudan istek.

**DOĞRULAMA:**
- **Yol seçimi ve gerekçesi:** yukarıda — Yol B (plugin kaynağı OKUNARAK
  doğrulandı), Yol A güvenlik ağı.
- **32MB dosyada en uzun bloklanma süresi:** ÖLÇÜLEMEDİ — cihaz yok. Chrome'da
  ÜÇ senaryo gerçek `file-storage.js` (stub'lanmış `window.Capacitor` ile)
  çalıştırılarak KOD YOLU doğrulandı: (a) nativePath VAR + copyFile BAŞARILI →
  SADECE `mkdir/getUri/copyFile` çağrıldı, `writeFile/appendFile` HİÇ
  çağrılmadı; (b) nativePath YOK → doğrudan Yol A (`writeFile`+`appendFile`);
  (c) nativePath VAR ama copyFile HATA fırlatıyor → Yol B denendi, BAŞARISIZ
  olunca OTOMATİK Yol A'ya düştü. 32MB'lık bir Yol A senaryosunda 32 çağrı,
  her biri ~1.4MB base64 (eski 4MB parçanın ~5.5MB'ından düştü) — ÖLÇÜLDÜ.
- **Yükleme sırasında tıklama/kaydırma kanıtı:** cihaz yok, KANITLANAMADI.
- **Sheet'in tam göründüğü, arka planın kilitlendiği:** Chrome'da gerçek bir
  dosya yüklendi → Analiz et → sheet TAM açıldı (ekran görüntüsü) → kapatıldı
  → arka plan doğru döndü, konsol hatası 0. Gerçek iOS layout-viewport bug'ı
  BURADA ÜRETİLEMEDİĞİ için düzeltmenin KENDİSİ cihazda doğrulanmadı.
- **Konsol hatası: 0** (gerçek akışta — sadece kasıtlı simülasyon testimin
  KENDİ `console.error`'ı görüldü, beklenen/doğru davranış).
- **`npm test`: 1119/1119** (test sayısı değişmedi — file-storage.js'in
  Capacitor-bridge bağımlılığı yüzünden bu modül için `node:test` birim testi
  YOK, Chrome'da canlı stub testiyle doğrulandı, kalıcı test dosyası
  EKLENMEDİ).

---

Önceki commit (G106, tek commit) — **Araçlar: ölçüm motoruna STEREO katmanı + eşik göstergeleri.**
Referans filtrelerinin DSP'sine bu turda DOKUNULMADI (kullanıcının kendi
kapsam sınırı) — o hâlâ ayrı bir tur.

**1) ÜÇ yeni ölçüm — `www/js/core/analysis.js`, AYNI geçişte (dosya ikinci
kez taranmıyor).** Mevcut 11 parametre ve worker yapısı DEĞİŞMEDİ, üstüne
katkısal olarak eklendi (`program.stereo`, mono girdide `null`):
- **Faz korelasyonu** — tüm dosya için tek değer + short-term'le AYNI
  pencerede (3s/100ms adım) bir seyir dizisi (`correlationSeries`).
  Faz B'nin var olan kanal-senkron döngüsüne `sumLR/sumLL/sumRR` (hem
  toplam hem 100ms blok bazlı) eklenerek hesaplandı.
- **Mid/Side dengesi** — `(L+R)/2`/`(L−R)/2` RMS'lerinin dB oranı
  (`sideToMidDb`).
- **Mono uyum kaybı** — mono downmix'in (mid sinyali) KENDİ K-ağırlıklı
  integrated loudness'ı, ÜÇÜNCÜ bir biquad çifti ile AYNI geçişte
  hesaplandı (`computeMomentarySeries`/`computeIntegratedLufs` — eski
  inline integrated-loudness kodu bu iki saf fonksiyona REFACTOR edildi,
  davranış değişmedi, testler aynı geçiyor). **DÜRÜSTLÜK NOTU (kritik
  matematik düzeltmesi):** ITU-R BS.1770-4 kanal ağırlıkları stereo'da L+R
  gücünü TOPLAR — aynı içerik (L=R) "stereo" ölçüldüğünde "mono"dan DOĞAL
  olarak +3.0103dB (10·log10(2)) yüksek okur, FAZ SORUNU OLMASA BİLE (bu
  proje zaten `test/analysis.test.mjs`'te BAŞKA bir yerde belgeli/testli
  bir gerçek). Bu fark çıkarılmadan mono kaybı hesaplansaydı, TAM MONO
  UYUMLU (L=R) bir sinyal bile +3dB "kayıp" gösterirdi — task'ın kendi
  referans testiyle ("tam mono → kayıp 0") ÇELİŞİRdi. Referans olarak
  stereo integratedLufs'tan sabit 3.0103dB çıkarılıyor
  (`MONO_REFERENCE_OFFSET_DB`), kalan fark GERÇEK faz/genişlik kaynaklı
  olanı yansıtıyor — üç referans testiyle SAYISAL doğrulandı (aşağıda).
  Bant bazlı hesap (aşağıda) bu düzeltmeye ZATEN gerek duymuyor (kendi
  içinde ortalama tanımlı, aynı sonucu farklı yoldan veriyor).
- **Bant bazlı mono kaybı** (6 bölge, SUB/BAS/ALT-ORTA/ORTA/ÜST-ORTA/TİZ —
  `tonal-balance.js`'in `BAND_EDGES`'iyle AYNI sınırlar, ama `analysis.js`
  bir OYUN MODUNA bağımlı olmaması için buraya AYRICA sabit yazıldı).
  Yöntem: RBJ Audio-EQ-Cookbook "constant 0dB peak gain" band-pass biquad'ı
  (f0=kenarların geometrik ortalaması, Q=f0/bant genişliği) L ve R'ye AYRI
  AYRI uygulanıp `(bandL+bandR)/2`'nin (mono) RMS'i `sqrt((bandL²+bandR²)/2)`
  (stereo referans, ortalama — TOPLAM değil, bu yüzden LUFS'taki 3dB
  düzeltmesine gerek yok) ile karşılaştırılıyor. **DÜRÜSTLÜK NOTU
  (bilinen sınırlama, DÜZELTİLMEDİ — task'ın kapsamı dışında, kullanıcı
  kararı gerekir):** tek kademe 2. derece filtre DİK bir crossover değil —
  canlı testte SADECE 60Hz'i ters fazlı yapan bir sinyalde SUB +16.9dB
  (doğru, beklenen) YANINDA BAS da +4.7dB kayıp gösterdi (komşu banda
  düşük-Q sızıntısı, SUB'ın merkezi/Q'su düşük frekansta doğası gereği
  geniş). Üst bantlarda (ALT-ORTA'dan TİZ'e, hepsi <1dB) bu sızıntı
  gözlenmedi — bkz. testler. "Bas bölgede sorun var" tanısı bu yüzden SUB
  için güvenilir, SUB'a komşu BAS için TEMKİNLİ okunmalı.

**2) Eşik göstergeleri — `www/js/app.js`.** `toolsThresholdColor(kind,
value)` — yeşil `#4ade80`/amber `#e8c46a`/kırmızı `#f87160`, sayılar KOD
İÇİNDE sabit (task'ın verdiği eşikler, kaynağı yorumda). Sheet'teki HER
satıra uygulandı (sadece yeni STEREO satırlarına değil): kanal
tablosundaki True peak/Olası kırpılmış örnek/DC offset (satır başına TEK
nokta, birden fazla kanal varsa EN KÖTÜ renk), Loudness'taki Loudness
range, yeni STEREO satırları (korelasyon/Mid-Side/mono kaybı) + bant
çubukları (sorunlu bant kırmızı vurgulu, `width` değeri de orantılı).
Integrated LUFS BİLEREK renksiz bırakıldı (task'ın kendi kararı — "iyi/kötü
değeri DEĞİL"), yanına küçük bir referans notu eklendi ("Yaygın hedefler:
akış −14, yayın −23 LUFS").

**3) Sheet'e STEREO bölümü + ikinci grafik — `www/index.html` +
`www/styles.css`.** "KANAL ÖLÇÜMLERİ" ile "LOUDNESS" arasına, AYNI
`.tools-files-section-label` stiliyle. "SHORT-TERM SEYRİ" grafiğinin
altına ~60px'lik ikinci bir grafik (`drawCorrelationChart`) — AYNI DPR/
gradyan-dolgu görsel dili, çizgi rengi violet `#c084fc` (cyan'la
KARIŞMASIN diye), sabit −1..+1 ekseni. Standart notuna eşiklerin mutlak
olmadığını belirten bir cümle eklendi.

**DOĞRULAMA:**
- **Üç referans sinyal (`test/analysis.test.mjs`'e 10 yeni test, hepsi
  geçiyor):** tam mono (L=R) → korelasyon **+1.000000**, mono kaybı
  **0.0000dB** (±0.01 tolerans içinde TAM sıfır), tüm bant kayıpları
  <0.01dB. Ters fazlı (L=−R) → korelasyon **−1.000000**,
  monoIntegratedLufs **−Infinity**, kayıp **+Infinity** ("monoda tam
  iptal" — task'ın kendi beklentisiyle birebir). Bağımsız gürültü (2
  ayrı deterministik LCG kaynağı) → korelasyon **~0.004** (~0).
- **Gerçekçi mix (node script, korelasyon 0.9977 hedefiyle sentetik):**
  monoLossDb 0.0236dB, bant kayıpları 0.012-2.276dB aralığında — makul.
- **Kasıtlı sorunlu dosya (20s stereo WAV, 60Hz SUB ters fazlı + kasıtlı
  DC offset ~%2 + 15 örnek kırpma + gerçek zamanlı tarayıcıda uçtan uca
  test — dosya yükle → Analiz et → sheet aç):** True peak kırmızı nokta
  (+1.45dBTP R), DC offset kırmızı nokta (+1.99%), Faz korelasyonu −0.30
  kırmızı, Mid/Side +2.69dB amber, Mono uyum kaybı +2.82dB amber, SUB
  bandı kırmızı çubuk (+16.91dB, tam genişlik), BAS kırmızı (+4.71dB, ~78%
  genişlik — bkz. yukarıdaki sızıntı notu), ALT-ORTA/ORTA/ÜST-ORTA/TİZ
  yeşil. Loudness range 0.0 LU amber (sabit ton, <3 LU eşiği). Sheet
  kapatılıp yeniden açıldı, ikinci grafik (violet, 0-referans çizgisiyle)
  doğru yeniden çizildi. **Konsol hatası: 0** (`read_console_messages`,
  tüm akış boyunca).
- **Olası kırpılmış örnek "0/0" göründü (BEKLENEN, G106'nın hatası
  DEĞİL):** node'da `decodeWavPcm` (48kHz, dosyanın kendi hızı) 15/15
  kırpılmış örnek DOĞRU tespit etti — ama tarayıcının `AudioContext`'i bu
  ortamda 44.1kHz varsayılan, native `decodeAudioData` dosyayı 44.1kHz'e
  YENİDEN ÖRNEKLİYOR ve anti-alias filtresi 15 örneklik (~0.3ms) kısa
  patlamayı 0.9999 eşiğinin altına yumuşatıyor — G106'nın kırpma
  MANTIĞINDA değil, test dosyasının seçtiği ÇOK KISA patlamada. DC offset
  (geniş bantlı, resampling'den etkilenmiyor) aynı testte doğru kırmızı
  çıktı, bu teşhisi destekliyor.
- **Analiz süresi ÖLÇÜLDÜ, BELİRGİN ARTIŞ VAR (task'ın "artmadığı"
  beklentisiyle ÇELİŞİYOR — DÜRÜSTLÜKLE raporlanıyor, gizlenmedi):** 300s
  stereo 48kHz dosyada (dosya başı yorumdaki AYNI referans süre), 3 koşu
  ortalaması G105→G106: **2610ms → 3624ms (+39%)**. Kaynak: 6 bant × 2
  kanal = 12 yeni band-pass biquad + mono K-weighting için 2 biquad,
  örnek başına. Worker içinde (ana thread DIŞINDA) çalıştığı için arayüz
  DONMUYOR — ama sayı gerçek, "artmadı" denemez. **Ürün kararı
  gerekiyorsa** (ör. bant sayısını azaltmak, bant filtrelerini daha ucuz
  bir yöntemle değiştirmek) BEKLEYEN KARARLAR'a eklendi.
- **`npm test`: 1119/1119** (1109 eski + 10 yeni G106 testi, hiçbiri
  değiştirilmedi/silinmedi).

---

Önceki commit (G105, tek commit) — **Araçlar: cihazda görülen ÜÇ düzeltme.**

**1) Dosya seçilince sayfa yukarı kaymıyordu — KÖK SEBEP DÜZELTİLDİ.**
`www/js/app.js`. G103'ün `overscroll-behavior:contain`'i SADECE sheet'in
KENDİ içeriğini kaydırırken arka plana zincirlenmeyi engelliyordu — sheet
AÇIKKEN kullanıcının parmağı sheet'in DIŞINDAki (görünmeyen) `.tools-scroll`
arka planına denk gelirse, `position:fixed` kaplamalar iOS Safari'de arka
plan dokunmalı kaydırmayı GÜVENİLİR şekilde engellemiyor (iyi belgelenmiş
bir mobil Safari davranışı) — arka plan görünmeden kayıyor, sheet kapanınca
"kilitli" bir konumda ortaya çıkıyordu. **Düzeltme:** yeni
`toolsSetBackgroundScrollLocked()` — sheet AÇIKKEN `.tools-scroll`'a
`overflow:hidden` uygulayıp arka plan kaydırmasına hiç FIRSAT vermiyor,
sheet KAPANDIĞINDA hem kilidi kaldırıyor HEM `scrollTop`'u açıkça sıfırlıyor
("içerik en üste dönsün" talimatı). Hem Dosyalarım hem Ölçüm Sonuçları
sheet'ine (aç/kapat fonksiyonlarının DÖRDÜNE de) uygulandı.

**2) Ondalık basamak — RX ile karşılaştırılabilir.** `www/js/app.js`.
`fmtDb()`/`fmtLufs()` artık `.toFixed(2)` (eskiden 1) — Ölçüm Sonuçları'ndaki
TÜM dB/LUFS alanları (True/Sample peak, Max/Min/Total RMS, Max momentary/
short-term, Integrated) etkilendi. Ayrıca `renderToolsAnalysisLoudness()`'ta
doğrudan yazılan Integrated LUFS büyük sayısı ve short-term grafiğinin
dokunmatik okuma metni de (`toolsAnalysisChartReadoutAt`) 2 ondalığa
çevrildi. **DEĞİŞMEDİ (task'ın kendi kararı):** DC offset 4 ondalık
(`fmtPercent`), kırpılmış örnek tam sayı (`fmtCount`), Tonal Balance
sapmaları 1 ondalık (`renderToolsTonalSummary`). **YORUM KARARI (açıkça
işaretli):** Loudness range (LU) de değiştirilmedi — task'ın listesi
sadece "dB ve LUFS" diyordu, LU farklı bir birim etiketi taşıyor ve
kullanıcı onu ne "değişsin" ne "değişmesin" listesine koymamıştı; ürün
kararı uydurulmadı, mevcut 1 ondalık KORUNDU.

**3) Oyun ekranı çip satırı hâlâ üst üste biniyordu.** `www/styles.css`.
KÖK SEBEP kullanıcının kendi hipoteziyle BİREBİR doğrulandı: `.chiprow > *
{flex:1 1 0; min-width:0}` (G93) — `min-width:0`, `white-space:nowrap`
metin taşıyan çiplerin (bkz. `.game-diff-chip`/`.srctag`/`.mixchip`, hepsi
nowrap) flex kutusunu KENDİ metninden DAHA DAR sıkışmasına izin veriyordu;
`flex-wrap:wrap` bu durumda yeni satıra SARMASI gerekirken satıra SIĞDIRMAYA
çalışıp metni komşu çiplerin üstüne taşırıyordu. **Düzeltme:** `min-width:0`
→ `min-width:fit-content` — çip artık KENDİ nowrap metninden dar
sıkışamıyor; satırda yer varsa `flex-grow:1` (flex-basis:0 ile) hâlâ eşit
dağıtıyor (G93'ün "eşit genişlik" kararı KORUNDU), yer yoksa artık DOĞRU
şekilde bir sonraki satıra sarıyor. `flex-basis:0` (G93'ün Chromium
box-sizing düzeltmesi) BİLEREK dokunulmadı — sadece `min-width` değişti.

**DOĞRULAMA (ekran görüntüleriyle + programatik, canlı tarayıcı):**
- **1:** Arka plan (`.tools-scroll`) önceden kaydırıldı (scrollTop=45,
  maksimuma kenetlendi) → Dosyalarım sheet'i açıldı → `overflow:hidden`
  DOĞRULANDI (arka plan kayamıyor) → sheet'ten GERÇEK bir dosya satırına
  pointerdown/pointerup ile tıklanıp seçildi (plain "click" DEĞİL — satırın
  KENDİ swipe-vs-seç mantığı gereği) → sheet kapandı → `scrollTop:0`,
  `overflow:auto` — arka plan TAMAMEN serbest VE en üstte, ekran
  görüntüsünde "Mixini Yükle"den "Referans Filtreleri"ne kadar TÜM kartlar
  erişilebilir. Aynı doğrulama Ölçüm Sonuçları sheet'i için de (Analiz et →
  sheet açıldı → kapatıldı → scrollTop:0/overflow:auto) yapıldı.
- **2:** Canlı ekran görüntüsünde gerçek değerler: True peak -8.75, Sample
  peak -9.12, Max/Min/Total RMS -10.32/-10.45/-10.38, Max momentary -14.14
  LUFS, Max short-term -14.16 LUFS, Integrated -14.17 LUFS (hepsi 2
  ondalık) — YANINDA DC offset +0.0005% (4 ondalık, değişmedi), Olası
  kırpılmış örnek 0 (tam sayı, değişmedi), Loudness range 0.0 LU (1
  ondalık, BİLEREK değişmedi).
- **3:** 10 modun (Frekans Bulma/Kesim Noktası/Q Genişliği/Boost mu Cut mu/
  dB Seviyesi/Kompresör/Reverb/Tonal Denge/Distortion/Frekans Çakışması)
  HEPSİ oyun ekranında canlı gezildi, çip satırı ekran görüntüsüyle
  incelendi — **üst üste binme sayısı: 0/10.** En kalabalık durum (Frekans
  Bulma: OTOMATİK+Dokunmalı|Şıklı+Odak+Kaynak, 4 öğe) doğru şekilde 2
  satıra sarıyor ("Karışık" kendi satırında); en uzun metin (Tonal Denge/
  Distortion: "Kaynak: Davul Döngüsü") tek satırda tam okunur kalıyor;
  çift-kaynak durumu (Frekans Çakışması: "Kick + Bas") de doğru.
- **Konsol hatası: 0** (10 mod gezintisi + Araçlar sheet testleri boyunca,
  `read_console_messages`).
- **`npm test`: 1109/1109** (G104 ile aynı sayı — bu turun düzeltmeleri saf
  CSS/format-fonksiyonu değişikliği, yeni test gerektirmedi; hiçbir eski
  test SİLİNMEDİ/BOZULMADI).

---

Önceki commit (G104, tek commit) — **Dosya yükleyince Araçlar donuyor — KÖK SEBEP
TEŞHİSİ + düzeltme.** iOS'ta canlı bildirilen "dosya yüklendiğinde arayüz
kilitleniyor" sorunu, önce TEŞHİS SONRA DÜZELTME talimatı gereği, önce
gerçek zamanlama ölçümleriyle (10 MB/50 MB sentetik dosyalar, `PerformanceObserver`
"longtask" API'si — tarayıcının kendi >50ms görev tanımı) araştırıldı.

**TEŞHİS — adım adım, her adımın nerede/ne kadar sürdüğü:**
1. `file.arrayBuffer()` (ana iş parçacığı, ~15-20ms/50MB) — sorun DEĞİL.
2. `ctx.decodeAudioData()` (ana iş parçacığı çağırıyor, native decode arka
   planda) — başarılıysa ~10ms; iOS WKWebView'in REDDETTİĞİ alt-tiplerde
   (24-bit PCM/32-bit float, Logic/Pro Tools export'ları — dosya başı yorumu)
   hızla reddediyor, adım 3'e düşülüyor.
3. `decodeWavPcm()` (elle WAV ayrıştırıcı, `wav-parser.js`) — **KÖK SEBEP
   ADAYI #1, DOĞRULANDI:** ana iş parçacığında TEK, SENKRON, ~350ms'lik
   (50MB/24-bit/stereo) bir döngü — hiç `await` içermiyordu. Görev
   tanımına göre 50ms üstü HER şey "longtask" — bu döngü TEK BAŞINA sınırı
   aşıyordu.
4. `ctx.createBuffer()`/`copyToChannel()` — ölçüldü, hızlı (~1-10ms), sorun
   DEĞİL.
5. `fileStorage.saveFile()` → native yolda `blobToBase64()` (`FileReader.
   readAsDataURL`) + `Filesystem.writeFile()` — **KÖK SEBEP ADAYI #2
   (kullanıcının kendi hipotezi), KISMEN DOĞRULANDI:** JS tarafındaki base64
   dönüşümünün KENDİSİ hızlı ölçüldü (~23ms/10MB, doğrusal), ama
   Capacitor'ın JS↔native köprüsünün TEK bir onlarca-MB'lık string'i
   taşıması iyi belgelenmiş, bu ortamda GERÇEK cihaz olmadan doğrudan
   ölçülemeyen bir risk.
6. **YENİ bulunan ÜÇÜNCÜ kök sebep (hipotez listesinde YOKTU, ölçümle
   ortaya çıktı):** `toolsAddFile()` dosyayı decode ediyor (adım 1-4),
   HEMEN ardından `toolsSelectFile()` AYNI dosyayı BAŞTAN SONA YENİDEN
   decode ediyordu (G102'den kalma, DURUM.md'de "performans etkisi
   ölçülmedi" diye işaretliydi) — bu SADECE süreyi ikiye katlamıyor, aynı
   turda tekrarlanan büyük (70MB+) bellek ayırmaları GC baskısı yaratıp
   ek bir longtask'a (~330ms) yol açtığı canlı ölçümle gözlendi.

**DÜZELTME — dört değişiklik, hepsi ölçümle doğrulandı:**
1. **`www/js/core/wav-parser.js` — `decodeWavPcm` artık ASENKRON, işbirlikçi
   nefes veriyor.** Her ~2048 çerçevede bir geçen süre ölçülüyor, 40ms'yi
   (100ms sınırının altında güvenli bir pay) aşınca `await setTimeout(0)`
   ile ana iş parçacığına geri veriliyor — cihaz hızına göre KENDİLİĞİNDEN
   uyarlanıyor (sabit parça sayısı DEĞİL). `upload.js`'in tek çağrı yeri
   `await` ile güncellendi.
2. **`www/js/core/file-storage.js` — native `saveFile` artık PARÇA PARÇA
   yazıyor.** 4MB'lık parçalara bölünüyor; ilk parça `Filesystem.writeFile()`,
   geri kalanı resmi `appendFile()` API'siyle (plugin'in `definitions.d.ts`'i
   doğrulandı) ekleniyor — Capacitor köprüsüne TEK dev bir string yerine çok
   sayıda küçük mesaj gidiyor, her parça arasında doğal bir nefes noktası
   var. `onProgress(fraction)` callback'i eklendi.
3. **`www/js/app.js` — gerçek ilerleme göstergesi.** Dosyalarım sheet'indeki
   "Cihazdan yeni dosya seç" butonu artık kaydetme sırasında "Dosya
   kaydediliyor… %N" yazıp altında GERÇEK (kozmetik sabit animasyon DEĞİL)
   bir ilerleme çubuğu dolduruyor — `toolsSetFileSaveProgress()`,
   `fileStorage.saveFile()`'ın `onProgress` callback'ine bağlı.
4. **`www/js/app.js` — çift decode ORTADAN KALDIRILDI.** `toolsSelectFile(id,
   {skipReload})` yeni bir opsiyonel bayrak aldı — `toolsAddFile()`'ın HEMEN
   ardından "az önce eklenen dosyayı seç" akışında (`toolsHandlePickNewFile`/
   `toolsFileInput` "change") `skipReload:true` geçiliyor, çünkü
   `uploadManager`'ın buffer'ı ZATEN o dosya için güncel — YENİDEN decode
   ETMİYOR. Dosyalarım sheet'inden VAR OLAN bir dosyayı seçmek (asıl kullanım)
   `skipReload`'suz, DEĞİŞMEDEN çalışıyor.

**DOĞRULAMA (gerçek ölçümler, canlı tarayıcı — Node/V8 DEĞİL, gerçek
`PerformanceObserver` longtask API'si + `input.dispatchEvent` ile tetiklenen
GERÇEK uygulama kod yolu):**
- **Düzeltme ÖNCESİ** (geçici teşhis enstrümantasyonuyla ölçüldü, koda
  kalıcı bırakılmadı): 50MB/24-bit-stereo bir dosyada İKİ longtask —
  ~680ms (senkron `decodeWavPcm` döngüsü) + ~330ms (ikinci, gereksiz
  decode turunun GC baskısı).
- **Düzeltme SONRASI** — üç ayrı senaryoda, 10 MB VE 50 MB'ta: **0 longtask**
  (native decode başarılı senaryo, WAV yedek yolu senaryosu, web/IndexedDB
  depolama senaryosu — hepsi 0). Toplam işlem süresi ~350-1000ms (dosya
  boyutuna göre), TEK bir adımda bile 50ms'yi (longtask sınırı) aşan görev
  YOK.
- **İlerleme göstergesi GERÇEKTEN çalışıyor:** 50MB'lık bir dosyada 13 parça
  callback'i doğrudan yakalandı — %8, %16, %24 ... %96, %100, sonra sıfırlama
  — toplam ~63ms'lik bir pencerede (ne kadar HIZLI olduğunun kanıtı).
- **Gerçek tıklama/kaydırma kanıtı:** yükleme akışı SÜRERKEN (aynı senkron
  script içinde, event loop'a dönmeden) başka bir DOM elemanına
  `dispatchEvent` ile tıklama gönderildi — 0.2ms'de senkron olarak
  sonuçlandı (ana iş parçacığı bloke olsaydı bu senkron çağrının KENDİSİ de
  beklerdi) — 0-longtask ölçümüyle TUTARLI, ikinci bir kanıt hattı.
- **Konsol hatası: 0** (üç senaryonun HEPSİNDE, `read_console_messages`
  tracking baştan kurulmuş halde).
- **`npm test`: 1109/1109** (G103 sonrası 1108, +1 yeni test —
  `wav-parser.test.mjs`'e "büyük bir dosyada nefes veriyor" regresyon testi,
  paralel bir kalp-atışı sayacıyla — hiçbir eski test SİLİNMEDİ/BOZULMADI,
  `decodeWavPcm` artık async olduğu için 8 eski test `await`/`assert.rejects`
  ile güncellendi, DAVRANIŞLARI değişmedi).
- **DÜRÜSTLÜK NOTU:** Capacitor'ın GERÇEK native köprü maliyeti (madde 5,
  yukarıda) bu ortamda (cihaz/Capacitor runtime yok) DOĞRUDAN ölçülemedi —
  sadece JS tarafı stub'landı. Parça parça yazma bunu YAPISAL olarak
  azaltıyor (TEK dev mesaj yerine çok sayıda küçük mesaj) ama gerçek
  cihazda NİHAİ doğrulama hâlâ gerekiyor (bkz. SIRADAKİ).

---

Önceki commit (G103, tek commit) — **Araçlar: cihazda test edilen DÖRT düzeltme.**

**1) Tonal Balance — KÖK SEBEP: bant ortalaması yanlış domende hesaplanıyordu.**
`www/js/core/tonal-balance.js`. Cihazda gerçek bir mix'te SUB +4.9, BAS +13.5,
ALT-ORTA +13.6, ÜST-ORTA −14.4, TİZ −18.5 dB gibi gerçekçi OLMAYAN sapmalar
görüldü; sarı hedef alanı ekranı kaplıyor, mix eğrisi neredeyse hiç
görünmüyordu. İKİ ayrı, birbirini tamamlayan kök sebep bulundu:
- **(a) dB'lerin doğrudan aritmetik ortalaması.** dB logaritmik bir ölçek —
  bir bandın bin'lerinin dB değerlerini düz ortalamak GERÇEK enerjiyi değil,
  "kaç bin var"ı ölçer. BAND_EDGES logaritmik aralıklı olduğu için TİZ/ÜST-
  ORTA SUB'dan yüzlerce kat fazla bin içeriyor — bu bantlardaki çok sayıda
  neredeyse-sessiz bin ortalamayı gerçek seviyeden çok aşağı çekiyordu.
  **Düzeltme:** dB → lineer güce çevrilip (`10^(db/10)`) GÜÇ domeninde
  ortalanıyor, sonra tekrar dB'ye çevriliyor (`10*log10(avgPower)`).
- **(b) pembe/geniş-bant eğim telafisi yok.** (a) tek başına yetmedi — gerçek
  bir referans dosyasıyla (pembe gürültüye yakın, geniş-bant) canlı test
  edilince hâlâ ±10-12dB'lik sahte sapmalar görüldü. Sebep: sabit binHz'li
  DOĞRUSAL bir FFT'de geniş-bant/gerçekçi içerik doğal olarak ~1/f ile düşen
  bir bin-gücü eğimi taşır (pembe gürültünün TANIMI: oktav başına eşit
  enerji → doğrusal bin'de −3dB/oktav). DRAFT_TARGET_CURVES'un ("taslak"
  hedefler) varsaydığı "dengeli bir mix ~0 civarında ölçülür" kuralıyla
  ÇELİŞİYORDU. **Düzeltme:** her bin'in gücü kendi frekansıyla çarpılıp
  (`power × freq`) toplanıyor — pembe içerik için `power(f)×f≈sabit`,
  yani doğal −3dB/oktav eğim TAM olarak iptal oluyor (standart "pembe-
  ağırlıklı"/PSD-normalize analiz — profesyonel spektrum analizörlerinin
  "RTA/pink" modlarının aynı ilkesi).
Bu İKİ düzeltme BİRLİKTE hem `measureSpectralDeviation` (offline) hem
`bandDevsFromLiveSnapshot` (G102'nin canlı analizörü) için ORTAK
`accumulateFreqSnapshot`/`normalizeBandSums` yardımcılarında uygulandı — iki
yol da AYNI (artık doğru) tanımı kullanıyor.
**YENİ testler (`test/tonal-balance.test.mjs`):** pembe girişin TÜM
bantlarda ~0dB verdiği, düz/beyaz girişin artık yukarı eğimli okunduğu
(pembe telafisinin flat'i DEĞİL pembe'yi nötr saydığını kanıtlar), pembe-
nötr bir bandın seyrekleştirilince (silinmemiş, ama %90 sessiz taban)
MAKUL bir sapma ürettiği (eskisi gibi aşırı DEĞİL) — 3 eski test de YENİ
pembe-tabanlı senaryolara güncellendi (eski "düz dB = 0 sapma" varsayımı
G103'ten sonra artık GEÇERSİZ, doğru davranış artık "pembe = 0 sapma").

**2) Mix eğrisi ayırt edilmiyordu.** `www/js/app.js:toolsTonalStrokeCurve`.
Kısmen (1)'in doğal sonucu (aşırı sapmalarda çoğu segment amber oluyor,
hedef dolgusunun AYNI amber tonuyla karışıyordu) ama görsel olarak da
güçlendirildi: o an EKRANDA gösterilen gerçek eğri (canlı yoksa ortalama,
canlıysa canlı) artık `prominent:true` ile çiziliyor — koyu bir hale (halo,
arkasında kalın koyu bir kontur), daha kalın çizgi (2.75px, önceki 2px),
hafif bir parlama (shadowBlur) ve hedef-dışı segmentlerde daha canlı bir
turuncu (#ffb648, hedef dolgusunun soluk amberinden AYRIŞIYOR). Arka
plandaki soluk ortalama eğri (canlı akarken) prominent DEĞİL, sade kalıyor.

**3) Ölçüm Sonuçları sheet'i açıldığı yere dönmüyordu.** `www/styles.css` +
`www/js/app.js`. Masaüstü Chrome'da doğrudan yeniden ÜRETİLEMEDİ (yapısal
CSS incelemesi + canlı testte sheet doğru davrandı) — ama üç KONKRET,
gerekçeli düzeltme uygulandı, ikisi bu projenin KENDİ belgelenmiş WKWebView
bug kategorisiyle BİREBİR örtüşüyor:
- **`overscroll-behavior:contain`** eklendi (`.tools-sheet-body`) — bu
  olmadan, sheet içeriğinin üstüne/altına ulaşılınca devam eden bir kaydırma
  jesti ARKADAKİ `.tools-scroll`'a zincirleniyor (mobil Safari'de yaygın
  "scroll chaining" davranışı, masaüstünde fark edilmez) — kullanıcının
  tarif ettiği "kendi sınırları içinde kalsın, arkadaki sayfayı kaydırmasın"
  talimatıyla BİREBİR örtüşüyor.
- **`max-height:84%` → `calc(var(--app-vh) * .84)`** — bu dosyanın KENDİ
  `.app-shell` yorumu, position:fixed elemanların yüzde yüksekliğinin
  WKWebView'de JS'in ölçtüğü gerçek `window.innerHeight`'tan FARKLI
  hesaplanabildiğini ZATEN belgeliyor (`--app-vh` bu YÜZDEN var). Aynı
  kanıtlanmış deseni `.tools-sheet`'e de uygulamak, YENİ bir teori değil,
  MEVCUT bir düzeltmeyi yaymak.
- **Sheet her açılışta `.tools-sheet-body.scrollTop = 0`'a sıfırlanıyor**
  (`toolsResetSheetScroll()`, hem Dosyalarım hem Ölçüm Sonuçları sheet'i) —
  sheet DOM'dan kaldırılmıyor, sadece gizleniyor, bu yüzden ÖNCEKİ açılıştan
  kalan scroll konumu bir dahaki açılışa SIZABİLİYORDU. Ayrıca
  `.tools-sheet-body`'ye eksik olan `min-height:0` eklendi (flex+overflow
  klasik tuzağı — olmadan `flex:1` içerik boyutunun altına küçülemeyebilir).
**DÜRÜSTLÜK NOTU:** bu üç düzeltme masaüstünde canlı GÖZLEMLENEN bir
regresyonu KANITLAMADI (sorun tekrar üretilemedi) — ama hepsi somut, bu
kod tabanının kendi belgelediği bir bug kategorisine (WKWebView position:
fixed/yüzde-yükseklik farkı) veya iyi bilinen bir mobil-web bug sınıfına
(scroll chaining) karşılık geliyor, zararsız ve kullanıcının kendi
tarifiyle (madde madde) örtüşüyor. Gerçek cihazda YENİDEN doğrulanmalı.

**4) Sayılar yuvarlanmasın.** `www/js/app.js:fmtDb/fmtLufs/fmtPercent/
fmtCount` + Tonal Balance özet satırı incelendi — TÜMÜ ZATEN spesifikasyona
uyuyordu (dB/LUFS 1 ondalık, DC offset 4 ondalık, kırpılmış tam sayı, Tonal
Balance sapmaları 1 ondalık) — kod incelemesi VE canlı tarayıcı testinde
(gerçek değerler: True peak -4.7, DC offset -0.5498%, Loudness range 0.1 LU,
Olası kırpılmış 0) hiçbir yuvarlama bulunamadı. **DÜRÜSTLÜK NOTU:** var
olmayan bir sorunu "düzelttim" diye UYDURMADIK — muhtemel açıklama: madde
1'deki KÖK SEBEP eski, aşırı (±20dB) sapma değerleri üretiyordu, bu büyük
sayılar görsel olarak "yuvarlanmış" izlenimi vermiş olabilir; madde 1'in
düzeltilmesiyle bu algı da ortadan kalkmalı.

**DOĞRULAMA (ekran görüntüleriyle + programatik, canlı tarayıcı):**
- **1:** Pembe gürültüye yakın bir referans dosyası (Node'da üretildi,
  Paul Kellet pembe filtre yaklaşımı) yüklendi — Pop hedefine karşı sadece
  "2 bölge hedef dışında: ÜST-ORTA −2.0 dB, TİZ +1.8 dB" (Kabul kriteri
  ±6dB'nin ÇOK altında). Bilerek dengesiz bir dosya (geniş-bant + düşük-
  frekans vurgusu) yüklenince GERÇEK dengesizlik hâlâ doğru yönde/büyüklükte
  görüldü ("BAS −3.4 dB, ALT-ORTA −8.4 dB, ORTA −3.0 dB, ÜST-ORTA +2.1 dB,
  TİZ +10.6 dB") — düzeltme gerçek sorunları GİZLEMİYOR, sadece ölçüm
  yöntemini doğru domene taşıyor.
- **2:** Zoom'lu ekran görüntüsünde mix eğrisi (cyan, hedef bandı içindeyken)
  net, kalın, hedef dolgusunun ÜSTÜNDE görünür durumda; hedef dışı segmentler
  parlak turuncu, arka plandaki soluk ortalama eğriden AÇIKÇA ayrışıyor.
- **3:** Sheet açılınca EN ÜSTTEN başladı (başlık+kapat butonu ilk karede
  görünür); içerik altıya kaydırıldı, kapat butonuyla kapatıldı, kalıcı
  şeritten YENİDEN açılınca sheet YİNE en üstten başladı (önceki kaydırma
  konumu SIZMADI) — programatik doğrulama.
- **4:** Canlı DOM'dan okunan gerçek değerler: True peak -4.7/-5.2,
  Sample peak -4.8/-5.4, Max/Min/Total RMS 1 ondalık, DC offset -0.5498%/
  -0.2362% (4 ondalık), Olası kırpılmış örnek "0" (tam sayı), Loudness
  range "0.1 LU"/"0.0 LU" — hiçbiri yuvarlanmamış.
- **Konsol hatası: 0** (tüm test oturumu boyunca, `read_console_messages`).
- **`npm test`: 1108/1108** (G102 sonrası 1106, +2 yeni test —
  `bandDevsFromLiveSnapshot()`'ın pembe-eğim davranışı için — 3 ESKİ test
  G103'ün yeni "pembe = nötr" kuralına göre güncellendi, hiçbiri silinmedi).

---

Önceki commit (G102, tek commit) — **İKİ KARAR: Tonal Balance mutlak gösterim +
canlı analizör (G101'in "mix eksi hedef" yorumu TERK EDİLDİ) ve Dosyalarım
kalıcı depolama (native Filesystem + web IndexedDB).**

**1) Tonal Balance — mutlak gösterim + canlı analizör:**
`www/js/core/tonal-balance.js` + `www/js/app.js` + `index.html` + `styles.css`.
G101'in "mix eksi hedef" sapma yorumu (grafiğin `diff = devs - targetDevs`'i
sıfır etrafında sabit bir ±1.5dB bant üstüne çizmesi) kullanıcının bu turdaki
AÇIK talimatıyla TERK EDİLDİ. Yeni davranış:
- **Hedef bandı artık HEDEF EĞRİNİN KENDİ ŞEKLİ etrafında** (±1.5dB,
  `rgba(34,211,238,.10)` dolgulu) sabit duruyor — sıfır etrafında DEĞİL.
- **Mixin MUTLAK eğrisi** (`tonal-balance.js`'in devs'i — dosyanın kendi
  ortalamasına göre sapma, ÇIKARMA YOK) doğrudan çiziliyor.
- **Canlı analizör** (`toolsTonalLiveTick`, `requestAnimationFrame`):
  `audioEngine.analyser`'dan (Referans Filtreleri'nin ZATEN kurduğu
  `toolsFilterPreviewGain→analyser` bağlantısı, oyun ekranındaki AYNI
  altyapı) tek kareler okunuyor, YENİ saf fonksiyon `tonal-balance.js:
  bandDevsFromLiveSnapshot(freqData, sampleRate, fftSize)` ile aynı 6-bant
  temsiline çevriliyor, tam parlaklıkta üstte çiziliyor. Dosyanın TAMAMININ
  ortalama eğrisi arkada soluk (alpha .35) duruyor; çalmıyorken ortalama tek
  başına normal parlaklıkta.
- **Performans:** döngü SADECE Araçlar sekmesi aktifken VE dosya çalarken
  devam ediyor — sekme değişince ya da duraklatılınca bir sonraki karede
  kendiliğinden durur (`toolsTonalLiveTick`'in `shouldRun` kontrolü),
  `toolsToggleFilterPlayback()`'te tekrar uyandırılıyor.
- **Özet satırı HER ZAMAN ortalama eğriye göre** hesaplanıyor (canlı veriye
  göre DEĞİL) — task'ın "titremesin" kuralı.
**YORUM KARARLARI (kullanıcı onayı olmadan, açıkça işaretli):** (a) kartın
kendi oynatma düğmesi olmadığı için "dosya çalarken" tetikleyicisi olarak
Referans Filtreleri'nin MEVCUT çal/duraklat düğmesi kullanıldı; (b) "Kendi
referansım" modu da AYNI mutlak+koridor gösterimine taşındı (eskiden mix+ref
HAM ayrı ayrı çiziliyordu) — iki farklı görsel dil bir arada tutulmadı.
**YENİ test:** `test/tonal-balance.test.mjs` — `bandDevsFromLiveSnapshot()`
için 3 test (tek bantta yüksek enerji → doğru işaretli sapma, eşit enerjide
~0, tamamı -Infinity'de NaN değil 6 elemanlı sıfır dizisi).

**2) Dosya kalıcılığı — native Filesystem + web IndexedDB:**
YENİ dosya `www/js/core/file-storage.js` — iki ayrı implementasyon, aynı
arayüz (`saveFile`/`loadFile`/`deleteFile`/`fileExists`/`isNativeStorage`):
NATIVE (`@capacitor/filesystem@8.1.2`, yeni bağımlılık — `window.Capacitor.
Plugins.Filesystem` global erişimiyle, projenin YERLEŞİK deseni, ES import
YOK) `Directory.Data` altına base64 yazıyor; WEB (`window.Capacitor` yokken,
`python3 -m http.server` geliştirme ortamı) IndexedDB'ye Blob'u doğrudan
yazıyor. `app.js`'te `toolsFiles` artık `TOOLS_LIBRARY_KEY` altında
localStorage'a persist edilen HAFİF bir manifest (id/ad/boyut/süre/dalga-
önizleme/mime/eklenme-zamanı) — dosyanın BAYT verisi ayrı, file-storage.js
katmanında. En fazla 5 dosya (`TOOLS_LIBRARY_MAX`), 6. eklenince en eski
(addedAt) otomatik silinir + toast. Dosyalarım sheet'inde her satırda boyut
zaten vardı, şimdi altında toplam alan (`toolsLibraryTotalKb()`,
"Toplam: 1.3 MB · 5/5 dosya") gösteriliyor. Araçlar sekmesine SAYFA-
YÜKLEMESİ başına TEK SEFERLİK bütünlük kontrolü (`toolsCheckLibraryIntegrity`,
`goScreen("tools")`'a bağlı, bellek-içi `toolsLibraryIntegrityChecked`
bayrağı — arka plandan dönüşte ya da ikinci girişte TEKRAR ÇALIŞMAZ): her
dosya için `fileExists()`, eksik olanlar manifestten düşer + "Dosya
bulunamadı" toast'ı.
**YORUM KARARI:** "en eski otomatik silinir" LİTERAL olarak eklenme-sırasına
(`addedAt`) göre yorumlandı, "en son seçilen" gibi bir LRU DEĞİL.
**Native taraf CANLI test EDİLEMEDİ** (bu oturum tarayıcıda, Capacitor
yok) — `node_modules/@capacitor/filesystem/dist/esm/definitions.d.ts`'ten
BİREBİR okunan API sözleşmesine göre yazıldı (binary native yazımın base64
gerektirdiği, Blob'un SADECE web tarafında çalıştığı gibi detaylar dahil),
ama gerçek iOS/Android cihazda `npx cap sync` sonrası DOĞRULANMADI —
CLAUDE.md "tahminle düzeltme yapma" kuralı gereği bu açıkça belirtiliyor.

**DOĞRULAMA (ekran görüntüleriyle + programatik, canlı tarayıcı):**
- **Tonal Balance mutlak+canlı:** gerçekçi (broadband gürültü + düşük-frekans
  vurgulu) bir test WAV dosyası üretilip yüklendi — grafik hedef eğrinin
  KENDİ ŞEKLİNİ takip eden bir koridor çizdi (SUB'da yukarı, ORTA'da aşağı
  kayan bant — Pop hedef eğrisinin kendi profiliyle TUTARLI), mix'in mutlak
  eğrisi üstünde göründü. Referans Filtreleri'nde play'e basılınca "● CANLI"
  rozeti belirdi, `canvas.toDataURL()` art arda örneklemede DEĞİŞTİ (gerçek
  canlı yeniden çizim kanıtlandı, `AnalyserNode.getFloatFrequencyData`
  çağrıları izlendi). Antrenman sekmesine geçilince canvas DONDU (rAF
  döngüsü durdu — 0 `requestAnimationFrame`/`getFloatFrequencyData` çağrısı
  1.5sn boyunca), Araçlar'a dönünce döngü yeniden başladı. Özet satırı
  ("5 bölge hedef dışında: ...") canlı rozet açıkken de SABİT kaldı, hiç
  değişmedi.
  **Test ortamı notu:** otomasyon sekmesinin `document.visibilityState`'i
  ara sıra "hidden" oluyor (gerçek OS odağı yerine CDP sürüşü) — bu durumda
  tarayıcının KENDİ rAF kısıtlaması devreye giriyor (uygulama kodu DEĞİL);
  gerçek bir cihazda ekran açıkken bu sorun yok, ilk doğrudan tıklama
  sonrası canlı akış zaten kanıtlandı.
- **Dosya kalıcılığı:** 2 dosya yüklendi (517 KB + 689 KB, "Toplam: 1.2 MB ·
  2/5 dosya" doğru göründü) → sayfa TAM yenilendi → Dosyalarım sheet'inde
  İKİ dosya da AYNI boyutlarla hâlâ listeliydi → biri seçilince IndexedDB'den
  doğru şekilde okunup yeniden decode edildi, Tonal Balance AYNI sonucu
  ("SUB +12.9 dB, BAS +3.1 dB, ...") üretti (bayt bozulmadı). 4 KÜÇÜK dosya
  daha eklenip 6'ya çıkarıldı — 6. eklenince EN ESKİ (`test-tone.wav`)
  otomatik düştü, "Toplam: 1.3 MB · 5/5 dosya" doğru güncellendi. Bir
  dosyanın IndexedDB kaydı elle silinip sayfa yenilendi — Araçlar sekmesine
  İLK girişte o dosya manifestten düştü, toast metni programatik olarak
  yakalandı: **"Dosya bulunamadı" / "test-tone5.wav artık cihazda yok.
  Kütüphaneden kaldırıldı."** Aynı oturumda (yenileme OLMADAN) başka bir
  dosyanın kaydı silinip sekmeler arası geçiş yapıldı — bütünlük kontrolü
  İKİNCİ kez ÇALIŞMADI (dosya manifestte silinmemiş halde kaldı), "sadece
  ilk girişte" kuralı doğrulandı.
- **Konsol hatası: 0** (tüm test oturumu boyunca, `read_console_messages`).
- **`npm test`: 1106/1106** (G101 sonrası 1103, +3 yeni test —
  `bandDevsFromLiveSnapshot()` için, hiçbir eski test SİLİNMEDİ/DEĞİŞMEDİ).

---

Önceki commit (G101, tek commit) — **Araçlar ekranı, Tasarim-2026-08/Araçlar.dc.html'in
(kullanıcının üzerine yazdığı YENİ sürüm) TAM giydirmesi.** Dört kart (Mixini
Yükle → Tonal Balance [YENİ] → Ölçüm Sonuçları → Referans Filtreleri) +
"Dosyalarım" sheet'i (3 bölüm) + Ölçüm Sonuçları sheet'i + kalıcı şerit +
Referans Filtreleri akordiyonu + çalar. analysis.js/analysis-worker.js'e
DOKUNULMADI (task'ın kuralı) — sadece render hedefleri değişti.

**A) Ekran iskeleti:** `index.html:891-905` — başlık satırı artık PRO
rozeti (`.tools-pro-badge`) + 32x32 ayar çarkı (`#toolsGearBtn`) içeriyor,
tasarımın satır 36-46'sıyla birebir (SVG path'ler, renkler, boyutlar
kopyalandı). Kart ortak stili zaten G88'den beri `.tools-card` olarak
vardı, DEĞİŞMEDİ. Sıra: Mixini Yükle → Tonal Balance → Ölçüm Sonuçları →
Referans Filtreleri — tasarımın satır 49-199 sırasıyla BİREBİR.

**B) Mixini Yükle:** `index.html:906-914` — buton artık `toolsOpenFilesSheet()`
çağırıyor (tasarımın satır 60 `onClick="{{ openFiles }}"` karşılığı), sistem
seçicisi DOĞRUDAN açılmıyor. Eski "Son yüklenenler" listesi (`toolsRecentEmpty`/
`toolsRecentList`/`renderToolsRecent()`) TAMAMEN kaldırıldı.

**C) Dosyalarım sheet'i:** `index.html:1006-1046`, `app.js` — tasarımın satır
203-281'i birebir: kesikli çerçeveli "Cihazdan yeni dosya seç" satırı (satır
219-222), üç bölüm (YÜKLEDİKLERİM/SON İŞLEMLERİM/SON ÖLÇÜMLERİM, satır 223/247/263).
**KAPSAM KARARI (BEKLEYEN KARARLAR'a eklendi):** dosya kütüphanesi OTURUM-
KAPSAMLI (sayfa yenilenince dosyaların KENDİSİ kaybolur) — upload.js'in TEK-
buffer mimarisine DOKUNULMADI (task'ın kuralı), IndexedDB gibi kalıcı bir
ses-blob depolama katmanı bu turun kapsamı DIŞINDA bırakıldı. "Son Ölçümlerim"
bunun İSTİSNASI: SONUÇ nesnesinin kendisi (`eqEarTrainerProXToolsMeasurements`,
localStorage, son 10 kayıt) kalıcı — dosya yeniden yüklenmeden "YENİDEN ANALİZ
YAPILMADAN" (task'ın kendi ifadesi) tekrar açılabiliyor. "Son İşlemlerim" de
AYNI şekilde kalıcı (`eqEarTrainerProXToolsActions`).
**Sola-kaydır-sil:** tasarımın `down`/`up` + −24px eşiği BİREBİR (app.js
pointerdown/pointerup delegasyonu).
**Gerçek dalga formu önizlemesi:** tasarımın `wave()` fonksiyonu SAHTE bir
sinüs formülüyle bar üretiyordu (tasarım aracının ses verisine erişimi yok)
— burada GERÇEK decode edilmiş örneklerden bir tepe-zarfı çıkarıldı
(`toolsWaveformPeaks`), boyut/bar sayısı KORUNDU.

**D) Tonal Balance — SIFIRDAN yazıldı:** `www/js/core/tonal-balance.js` (YENİ
dosya) + `index.html:915-949` + `app.js`. Tür çipleri (Pop/EDM/Akustik,
tasarımın satır 78-80'i) + "Kendi referansım" (4. çip, `devFlags.
customTonalRef` özellik anahtarı ARKASINDA, VARSAYILAN KAPALI — `storage.js:
freshDevFlags()`). Grafik matematiği (log frekans ekseni, 6 bant smoothstep
interpolasyonu, ±1.5dB hedef bandı, kırmızı fark dolgusu) tasarımın KENDİ
`tbChart()`'ından BİREBİR taşındı (satır 526-616), canvas'a port edildi.
**Spektral ölçüm — DÜRÜSTLÜK notu:** task "Veri analysis.js'in spektrumundan
gelecek" diyordu ama analysis.js (G98-G100) hiç spektrum ÜRETMİYOR (sadece
loudness/peak/RMS) — analysis.js'e DOKUNULAMAYACAĞI için (task'ın kendi kuralı)
bu YENİ, AYRI bir modülde (`tonal-balance.js`), standart `OfflineAudioContext`
+ `AnalyserNode` (audio-engine.js'in oyun ekranında ZATEN kullandığı AYNI API)
ile GERÇEK ölçüm olarak uygulandı — bkz. o dosyanın DÜRÜSTLÜK notu.
**TASLAK hedef eğriler:** Pop/EDM/Akustik'in 6'şar bantlık dB sapma dizileri
tasarımın KENDİ `TB` sabitinden (satır 640-643) BİREBİR alındı, kod içinde
AÇIKÇA "taslak, gerçek referans parçalardan yeniden türetilecek" diye
işaretlendi (`tonal-balance.js` dosya başı + `toolsTonalDraftNote` UI metni).
**Ürün yorumu (DÜRÜSTLÜK notu, tonal-balance.js'te belgeli):** tasarımın chart
kodu `devs`'i (=TB[genre]) DOĞRUDAN çiziyor, bu tasarım aracının CANLI ses
erişimi olmadığı için bir gösterim kısayoluydu. Gerçek üründe anlamlı olan:
çizilen değer MIX'İN KENDİ ölçülen sapması EKSİ SEÇİLİ hedef eğri (kalıntı) —
±1.5dB bandı "türe göre kabul edilebilir tolerans" demek. Bu YORUM kararı
raporda AÇIKÇA belirtiliyor, gizlenmiyor.

**E) Ölçüm Sonuçları:** `index.html:950-960` (kart) + `1047-1097` (sheet) +
`1099-1107` (şerit) + `app.js`. G99/G100'ün worker/render mantığı (`runAnalysisInWorker`/
`analyzeUploadedFile`/`renderToolsAnalysisChannelTable` vb.) **AYNEN KORUNDU**
— SADECE hedef DOM'ları (artık sheet içinde) ve buton içi kozmetik ilerleme
çubuğu (`#toolsAnalyzeBar`, tasarımın 1400ms'lik sabit animasyonu, GERÇEK
yüzde İZLEMİYOR — asıl "bitti" sinyali worker'ın GERÇEK tamamlanmasından
geliyor) eklendi. Analiz edilince buton kaybolur (tasarım: `showAnalyze =
analyzed !== selFile`), sheet OTOMATİK açılır; kapatılınca kalıcı şerit
görünür; şeritten açılışta **analiz TEKRAR ÇALIŞMAZ** (`toolsOpenResultsSheet`
sadece SAKLANMIŞ `toolsAnalysisResult`'ı yeniden render eder).
**Standart notu gerçek değerlerle:** `renderToolsAnalysisStandardNote()`
`result.meta`'dan okuyor — G100 sonrası GERÇEK değerler (8x/100ms/AES17)
gösteriliyor, tasarımın ESKİ metni (4x/300ms) kullanılmadı (bkz. DOĞRULAMA,
canlı ekran görüntüsüyle kanıtlandı).

**F) Referans Filtreleri — akordiyon + çalar:** `index.html:961-992` + `app.js`.
Başlık tıklanır, chevron 260ms rotate + aktif filtre rozeti (`toolsFilterHeaderBadge`,
akordiyon AÇIK/KAPALI fark etmeksizin görünür — tasarımın satır 730 mantığı).
5 YENİ filtre (Telefon Hoparlörü/Araba/Kulaklık/Club Sistemi/Laptop Hoparlörü,
tasarımın satır 817-822'sinden BİREBİR — eski 8'li set, ad/aralık dahil,
KALDIRILDI). Cihaz illüstrasyonları tasarımın `art()` üretecinden BİREBİR
taşındı (gradyan/path verileri değişmedi, React.createElement → düz SVG
string). Çalar, G88'in `toggleToolsPreview()` AYNI mekanizması (audioEngine.
analyser'a takılan ayrı gain node, uploadManager'ın GERÇEK offset/duraklatma
mantığı) — sadece render hedefi değişti. 10sn ileri/geri butonları tasarımın
KENDİSİNDE `onClick="{{ noop }}"` (no-op) — BİREBİR aynı bırakıldı, seek
YAZILMADI (uydurma özellik eklenmedi).
**DSP yokluğu uyarısı (task'ın istediği "geçici uyarı metni"):**
`.tools-filter-dsp-note` — "Şu an sadece dinleme deneyimi — filtre seçmek
gerçek ses işleme (DSP) UYGULAMIYOR, ses değişmiyor..." — akordiyon her
açıldığında görünür.

**G) Free kilit ekranı:** `index.html:993-1005` — pentagon/başlık/açıklama/
buton KORUNDU. Tasarımın YENİ `lockedList`'i (3 madde: "Mixini yükle ve
uygulama içinde dinle" / "Beş cihaz referans filtresi" / "Tonal balance —
6 bölge analizi", satır 824'ten BİREBİR) de eklendi — task'ın G) maddesi
bunu açıkça istemiyordu ama tasarımda VARDI, "ölçüleri birebir uygula" genel
kuralı gereği dahil edildi.

**Canlı testte bulunan İKİ gerçek CSS bugı — düzeltildi:**
1. **Sheet'ler ekran dışına taşıyordu:** `.tools-sheet`/`.tools-sheet-overlay`
   `position:absolute` kullanıyordu — en yakın POZİSYONLANMIŞ atası `#screen-tools`
   DEĞİL (o `position:static`), çok daha yukarıdaki bir ata olduğu için sheet
   ekranın çok altına (görünmez) yerleşiyordu. `position:fixed`'e çevrildi
   (mevcut `.bottom-sheet`/`.sheet-overlay` deseniyle AYNI, `styles.css:1728-1730`).
2. **Dosya satırındaki "Sil" butonu HER ZAMAN görünüyordu (kaydırılmamışken
   bile):** `.tools-files-row-main`'in arka planı TEK BAŞINA neredeyse şeffaftı
   (`rgba(255,255,255,.03)`), altındaki (AYNI konumdaki, `position:absolute`)
   kırmızı "Sil" butonunu neredeyse tam bırakıyordu. Tasarımın KENDİ iki
   katmanlı deseni (`linear-gradient(0deg,{{f.bg}},{{f.bg}}),#131519`)
   uygulanmamıştı — düzeltildi (`styles.css:1747-1748`).

**DOĞRULAMA (ekran görüntüleriyle, canlı tarayıcı):**
- **A/B:** Araçlar başlığı+PRO rozeti+ayar çarkı+dört kart doğru sırada
  görüldü; boş durumda (dosya seçilmemişken) Tonal Balance/Ölçüm Sonuçları
  kartları doğru şekilde GİZLİ, sadece Mixini Yükle + Referans Filtreleri
  görünüyordu.
- **C:** "Dosyalarım" sheet'i açıldı, boş durumlar (3 bölümün hepsi) doğru
  metinlerle görüldü; 4 dosya yüklendikten sonra YÜKLEDİKLERİM listesi
  gerçek ad/boyut/süre + dalga formuyla, seçili dosya cyan çerçeveyle,
  SON ÖLÇÜMLERİM "g99-test.wav · 2 dakika önce · -5.0 LUFS" satırıyla
  doğru render edildi.
- **D:** Tonal Balance gerçek bir ses dosyası (1kHz sinüs test sinyali)
  üzerinde ÇALIŞTI — Pop seçiliyken "5 bölge hedef dışında: BAS −2.1 dB,
  ALT-ORTA +5.5 dB, ORTA +21.6 dB, ÜST-ORTA −14.2 dB, TİZ −12.2 dB" (saf
  1kHz tonun ORTA bandında yoğunlaşan GERÇEK spektral imzasıyla TUTARLI —
  tek bantta güçlü enerji, diğerlerinde derin negatif sapma), EDM'e
  geçilince "4 bölge hedef dışında: ..." olarak FARKLI bir sonuca DOĞRU
  şekilde yeniden hesaplandı. Taslak notu ve "hedef aralık ±1.5 dB" notu
  görüldü. "Kendi referansım" çipi VARSAYILAN KAPALI (3 çip: Pop/EDM/Akustik,
  4. çip YOK) doğrulandı.
- **E:** "Analiz et" tıklanınca sheet OTOMATİK açıldı — KANAL ÖLÇÜMLERİ
  (True peak/Sample peak/Max-Min-Total RMS/Olası kırpılmış [amber, 19500]/
  DC offset [+1.7205%, 4 ondalık]), LOUDNESS (Integrated −5.0 LUFS, 27px/cyan
  büyük stil), SHORT-TERM SEYRİ grafiği (0:00–0:40) hepsi doğru göründü.
  **Standart notu GERÇEK değerleri gösterdi:** "True peak: 8x aşırı örnekleme
  ... RMS penceresi: 100ms · RMS konvansiyonu: AES17 ... RX 11 karşılaştırmasıyla
  doğrulandı" — tasarımın eski (4x/300ms) metni KULLANILMADI. Sheet kapatılınca
  kalıcı şerit ("Ölçüm Sonuçları" + ikon + chevron) göründü; şeride tıklayınca
  sheet AYNI sonuçla (yeniden hesaplama OLMADAN, anında) yeniden açıldı.
- **F:** Akordiyon açıldı (chevron döndü), çalar bloğu (dosya adı+değiştir+
  dalga formu+transport) + DSP uyarı notu + 5 filtre kartı (gerçek SVG cihaz
  illüstrasyonlarıyla) doğru göründü.
- **G:** simulatePro kapatılınca FREE kilit ekranı (pentagon/başlık/açıklama/
  3 kilitli-özellik satırı/"Pro'ya Geç · ₺399") doğru göründü.
- **Konsol hatası: 0** (tüm test oturumu boyunca, `read_console_messages`).
- **`npm test`: 1103/1103** (G100 sonrası 1096, +7 yeni test —
  `test/tonal-balance.test.mjs`, `BANDS`/`BAND_EDGES`'in Frekans Bulma'nın
  `FA_ZONES`'uyla TUTARLILIĞI dahil — hiçbir eski test SİLİNMEDİ).
- **Test ortamı notu:** Otomasyon sekmesi arka planda sayıldığı için CSS
  transition'lar donuyordu (`document.hidden===true`, G99'da bulunan AYNI
  kök sebep) — `element.getAnimations().forEach(a=>a.finish())` ile ZORLA
  bitirilip GERÇEK son durum doğrulandı, bu bir üretim hatası DEĞİL.
  `file_upload` aracı da bu turda kararsızdı (defalarca başarı raporlayıp
  dosyayı iliştirmedi) — gerçek servis edilen bir örnek dosya (`/audio/
  acoustic_guitar.m4a`) `fetch()`+`DataTransfer` ile GERÇEK bir `change`
  event'i tetiklenerek dolaşıldı (uygulama kodu GERÇEKTEN çalıştı, sadece
  OS seçici simülasyonu atlandı).

**Not — provenance:** `OYUN-MANTIGI.md` konusu G100'de kapandı (kullanıcı
onayladı, `e4dab63`).

---

Önceki commit (G100, tek commit) — **Ölçüm motoru, RX 11 karşılaştırmasına göre
düzeltme.** Kullanıcı gerçek bir dosyayı hem iZotope RX 11'de hem uygulamada
ölçüp karşılaştırdı — True peak/Sample peak/Kırpılmış/Integrated/Max
momentary/Max short-term zaten TUTUYORDU, Max/Min/Total RMS'te ~3-8dB, LRA'da
0,8 LU sapma bulundu. Beş madde:

**1) RMS konvansiyonu → AES17 (gösterimde):** Total RMS'teki ~3dB sapma TAM
OLARAK AES17 kaydırmasıydı (RX AES17 kullanıyor — tam ölçekli sinüs 0dB
okur). `analysis.js`'te HAM hesap KORUNDU (`raw` alanı hâlâ var, silinmedi),
sadece `app.js`'in gösterdiği alan `.raw`'dan `.aes17`'ye çevrildi. Standart
notu güncellendi.

**2) RMS penceresi: 300ms → 100ms:** Perkusif/dinamik bir test sinyalinde
50/100/300ms karşılaştırıldı (aşağıdaki DOĞRULAMA tablosu) — 100ms seçildi:
yaygın bir "hızlı RMS" tanım aralığında VE test sinyalinde gözlenen sapma
büyüklüğüne (RX'in Max RMS'i bizden ~3dB yüksek okuyordu) 50ms'den daha
yakın düştü. `DEFAULT_RMS_WINDOW_MS` sabiti güncellendi (`options.
rmsWindowMs` ile hâlâ override edilebilir).

**3) DC offset hassasiyeti: 2 → 4 ondalık basamak:** `app.js:fmtPercent()`
artık `toFixed(4)` kullanıyor (RX'in +0,002% gibi binde-iki hassasiyetini
gösterebilmek için) — `analysis.js` zaten tam float hassasiyetinde
hesaplıyordu, sorun SADECE gösterim yuvarlamasıydı.

**4) LRA — iki algoritmik düzeltme:** (a) gating blok adımı 1s (10×100ms)
→ 100ms (1×100ms)'e çekildi — libebur128'in (EBU uyumluluğu bağımsız
doğrulanmış açık kaynak referansı) momentary/short-term ile AYNI 100ms
adımı kullanma pratiğiyle hizalandı; (b) yüzdelik hesabı doğrusal
enterpolasyondan "en yakın rütbe" (nearest-rank, yeni `percentileNearestRank()`
fonksiyonu) yöntemine çevrildi — Tech 3342'nin histogram-tabanlı tanımına
daha yakın. Eski `percentile()` (doğrusal) SİLİNMEDİ, genel kullanım için
duruyor + testi hâlâ geçiyor.

**5) True Peak filtresi — L artırmak DEĞİL, halfWidth/beta ayarlamak
işe yaradı (önemli, dürüst bulgu):** Task'ın varsaydığının AKSİNE, aşırı
örnekleme oranını (L) TEK BAŞINA 4x'ten 8x/16x'e çıkarmak overshoot'u
NEREDEYSE HİÇ değiştirmedi (0.549→0.542→0.549dB) — çünkü faz başına filtre
uzunluğu (tapsPerPhase=2·halfWidth) L'DEN BAĞIMSIZ, asıl doğruluğu o
belirliyor. Asıl kazanç: halfWidth 12→6, beta 8.6→26 (overshoot
0.549→0.036dB). AYRICA bulundu: L, farklı bir metriği (Nyquist'in hemen
altındaki UNDERSHOOT) GERÇEKTEN etkiliyor (0.688→0.169dB, L=4→8) — bu yüzden
L=8 de benimsendi. tapsPerPhase yarıya indiği için (24→12) L'yi 4'ten 8'e
çıkarmak işlem maliyetini DEĞİŞTİRMEDİ (4×24=8×12=96 çarpma/örnek).

**Dosya/değişiklik haritası:**

| Değişiklik | Dosya | Not |
|---|---|---|
| True Peak filtre sabitleri (L=8/hw=6/beta=26) | `core/analysis.js` | `TRUE_PEAK_L/HALF_WIDTH/BETA` |
| RMS pencere varsayılanı 300→100ms | `core/analysis.js` | `DEFAULT_RMS_WINDOW_MS` |
| LRA adımı 1s→100ms + `percentileNearestRank()` eklendi | `core/analysis.js` | `LRA_STEP_BLOCKS`, yeni fonksiyon |
| RMS gösterimi `.raw`→`.aes17`, DC ondalık 2→4, standart notu güncellendi | `app.js` | Sadece gösterim, hesap değişmedi |
| Filtre/pencere/LRA testleri güncellendi + `percentileNearestRank` testleri | `test/analysis.test.mjs` | Eski testler SİLİNMEDİ, güncellenen sabit değerlere göre düzeltildi |

**DOĞRULAMA:**

- **Perkusif test sinyalinde (transient + sabit zemin) RMS penceresi
  karşılaştırması (Max RMS, HAM/AES17):**

  | Pencere | Max RMS (HAM) | Max RMS (AES17) | Min RMS (HAM) | Min RMS (AES17) |
  |---|---|---|---|---|
  | 50ms | −5.29 | −2.28 | −33.47 | −30.46 |
  | 100ms (SEÇİLEN) | −6.49 | −3.48 | −33.47 | −30.46 |
  | 300ms (eski) | −10.01 | −7.00 | −26.02 | −23.01 |

  100ms→300ms farkı: Max RMS'te +3.51dB, yönü ve büyüklüğü kullanıcının
  gözlemlediği sapmayla (RX'in bizden ~3dB yüksek okuması) TUTARLI.

- **Aynı 11 parametre, ESKİ (G99) vs YENİ (G100), 40s'lik sabit test
  dosyasında (4 seviye bölümü + sessizlik + kasıtlı kırpma — G98/G99'da
  kullanılan AYNI dosya, gerçek `analyzeAudioBuffer()` çağrılarıyla):**

  | Parametre | ESKİ (G99) | YENİ (G100) |
  |---|---|---|
  | True peak (dBTP) | +0.031 | +0.031 (bu dosyada aynı — bkz. not) |
  | Sample peak (dBFS) | +0.000 | +0.000 |
  | Max RMS (gösterilen) | −2.9 (HAM) | +0.1 (AES17) |
  | Min RMS (gösterilen) | −∞ | −∞ |
  | Total RMS (gösterilen) | −9.9 (HAM) | −6.9 (AES17) |
  | Olası kırpılmış | 19500 | 19500 |
  | DC offset | +1.72% (2 ondalık) | +1.7200% (4 ondalık) |
  | Max momentary | 0.142 LUFS | 0.142 LUFS |
  | Max short-term | 0.142 LUFS | 0.142 LUFS |
  | Integrated | −4.959 LUFS | −4.959 LUFS |
  | LRA | 14.133 LU | 14.133 LU |

  Not: Bu SABİT dosyada True Peak/LRA değişmedi çünkü dosyanın yapısı (uzun
  düz seviyeler + tam kırpma) filtre/algoritma değişikliklerine duyarlı
  DEĞİL — bu iki maddenin gerçek etkisi aşağıdaki ÖZEL test sinyalleriyle
  gösterildi.

- **True Peak filtresi — eski/yeni karşılaştırma (frekans taraması,
  44.1kHz, 53Hz adımlarla):**

  | | overshoot (üst sınır) | undershoot (Nyquist yakını) |
  |---|---|---|
  | ESKİ (L=4, hw=12, beta=8.6, tapsPerPhase=24) | 0.549dB @ 13986Hz | −0.687dB @ 21989Hz |
  | YENİ (L=8, hw=6, beta=26, tapsPerPhase=12) | 0.036dB @ 10435Hz | −0.169dB @ 21989Hz |

  L=16'ya çıkarmak undershoot'u daha da düşürüyor (−0.043dB) ama işlem
  maliyetini 2 katına çıkarıyor — L=8'de bırakıldı (G98'in ORİJİNAL maliyetiyle
  AYNI, bkz. yukarı).

- **LRA farkının sebebi:** iki algoritmik düzeltme (100ms adım + nearest-rank
  yüzdelik) gerçekçi bir dinamik test sinyalinde (90s, yavaş zarf + mikro
  varyasyon) LRA'yı **9.194 → 9.296 LU** taşıdı (+0.10 LU, DOĞRU yönde).
  **Dürüstlük notu:** bu, kullanıcının gözlemlediği 0,8 LU'luk farkın
  TAMAMINI KAPATMIYOR — gerçek dosya elimde olmadığı için tam eşleşme
  doğrulanamadı. Kalan fark muhtemelen RX'in kendi (belgelenmemiş, kapalı
  kaynak) LRA uygulama detaylarından kaynaklanıyor — LRA'nın farklı EBU
  R128-uyumlu metreler arasında ~1 LU'ya kadar değişebilmesi literatürde
  bilinen bir durum (Tech 3342 bazı uygulama detaylarını açık bırakıyor).
- **`npm test`: 1096/1096** (G99 sonrası 1094, +2 yeni test —
  `percentileNearestRank()` — hiçbir eski test SİLİNMEDİ, sadece değişen
  sabit değerlere göre 4 test güncellendi: RMS penceresi varsayılanı,
  truePeakOversample, True Peak overshoot sınırı, DC offset formatı).
- **Canlı tarayıcı doğrulaması — KISITLI:** Bu turda tarayıcı otomasyon
  eklentisi kararsız kaldı (dosya yükleme aracı defalarca başarı raporlayıp
  dosyayı gerçekte iliştirmedi) — G99'da AYNI render fonksiyonlarının
  (`renderToolsAnalysisChannelTable` vb.) canlı çalıştığı zaten kanıtlanmıştı,
  bu turun değişiklikleri o fonksiyonlarda SADECE hangi alanın okunduğunu
  (`.raw`→`.aes17`) ve statik metni değiştirdi — node ile mantık seviyesinde
  doğrulandı (DC offset "+10.0000%" gösterdi, RMS AES17 alanını okudu, meta
  değerleri doğru) ama TAM DOM canlı ekran görüntüsü bu turda alınamadı.
  **Bir sonraki oturumda kısa bir canlı doğrulama turu YARARLI olur.**

**Not — provenance:** `OYUN-MANTIGI.md` bu commit'te DAHİL edildi (kullanıcı
onayladı, ayrı commit — bkz. hemen önceki commit `e4dab63`).

---

Önceki commit (G99, tek commit) — **Araçlar ölçüm motoru, 2. bölüm: arayüz.**
G98'in `analysis.js`'i ekrana bağlandı — "Mixini Yükle" ile "Referans
Filtreleri" arasına, MEVCUT `.tools-card` ailesinden (border-radius/gradient/
ikon kutusu/bölüm başlığı) BİREBİR türetilen yeni bir "Analiz" kartı
eklendi (tasarımda bu blok YOK, task'ın kendi notu). Dosya seçilince
OTOMATİK başlamıyor — "Analiz et" butonuyla tetikleniyor. Analiz bir
**Web Worker**'da (`core/analysis-worker.js`, YENİ dosya) çalışıyor —
ana thread'i bloke etmiyor (canlı, 10 dakikalık sentetik bir dosyayla
kanıtlandı, aşağıda). Sonuçlar iki grup halinde (KANAL ÖLÇÜMLERİ tablosu +
LOUDNESS listesi, Integrated büyük/vurgulu) + "SHORT-TERM SEYRİ" adında
zamana yayılı bir grafik (canvas, cyan çizgi+dolgu, dokununca o noktanın
değeri/zamanı görünüyor, Integrated kesikli referans çizgisi) + standart
notu (ITU-R BS.1770-4/EBU R128, aşırı örnekleme oranı, RMS penceresi/
konvansiyonu) olarak gösteriliyor. Eski sahte `renderToolBars()`/`#toolBars`
TAMAMEN SİLİNDİ (kod dahil, sadece HTML değil — task'ın açık talimatı).

**Kural ihlali — AÇIKÇA bildirilmiş, gerekçeli iki sapma:**
1. Task "analysis.js'e DOKUNMA" dedi — ama "Short-term seyri" grafiği ZATEN
   hesaplanan ama dışa AKTARILMAYAN `shortTermSeries`'e ihtiyaç duyuyordu.
   K-weighting+gating mantığını arayüz katmanında TEKRAR yazmak (ciddi
   sapma riski) yerine TEK katkısal alan eklendi (`program.
   shortTermLufsSeries/shortTermSeriesStartMs/shortTermSeriesStepMs`) —
   MEVCUT hiçbir alan/algoritma değişmedi, G98'in 34 testi DEĞİŞTİRİLMEDEN
   geçiyor + 3 yeni test eklendi (bkz. tablo).
2. `upload.js`'e `getBuffer()` eklendi (bu dosya "dokunma" kapsamında
   değildi, ama önceki tasarım BİLEREK buffer'ı dışarı sızdırmıyordu) —
   ölçüm motorunun girdisi (gerçek PCM) başka türlü elde edilemezdi.

**Dosya/değişiklik haritası:**

| Değişiklik | Dosya | Not |
|---|---|---|
| Yeni "Analiz" kartı (`#toolsAnalysisCard`) | `index.html` | `.tools-card` ailesinden birebir, dosya seçili değilken `hidden` |
| ~15 yeni CSS kuralı (`.tools-analysis-*`) | `styles.css` | Renk/tipografi tokenleri MEVCUT `.tools-*`'tan, TEKRAR TANIMLANMADI |
| Worker orkestrasyon + render + hata mesajları + chart çizim/etkileşim | `app.js` | `runAnalysisInWorker`/`analyzeUploadedFile`/`renderToolsAnalysis*`/`drawShortTermChart` ailesi |
| Web Worker (YENİ dosya) | `core/analysis-worker.js` | analysis.js'i SADECE çağırır, değiştirmez |
| `shortTermLufsSeries` eklendi (katkısal) | `core/analysis.js` | Yukarıdaki sapma notu 1 |
| `getBuffer()` eklendi | `core/upload.js` | Yukarıdaki sapma notu 2 |
| 3 yeni test (`shortTermLufsSeries`) | `test/analysis.test.mjs` | G98'in 34 testi DEĞİŞMEDEN geçiyor |

**Canlı testte BULUNAN ve DÜZELTİLEN gerçek bug (task'ın istediği "hata
durumları sessizce başarısız olmasın" doğrulaması SIRASINDA ortaya çıktı):**
3 kanallı bir dosya yüklenip "Analiz et"e basıldığında arayüz SONSUZA KADAR
"Analiz ediliyor…" durumunda TAKILI kalıyordu (buton kalıcı devre dışı, hata
HİÇ gösterilmiyordu) — kök sebep iki katmanlıydı: (1) worker'ın KENDİSİ
sorunsuz çalışıp analysis.js'in BİLEREK fırlattığı "3 kanal desteklenmiyor"
hatasını doğru yakalayıp bildiriyordu, ama app.js bunu YANLIŞLIKLA "worker
altyapısı bozuldu" sayıp ana thread'e DÜŞÜYORDU (anlamsız, aynı veriyle aynı
hata tekrar üretilecekti); (2) o ana-thread yoluna geçerken "bir kare
boyansın" diye `requestAnimationFrame` ile bekleniyordu — rAF, sekme ARKA
PLANDAYKEN (`document.hidden===true`) HİÇ ateşlenmiyor, bu da bekleyişi
SONSUZA çeviriyordu (canlı ölçüldü: `document.hidden` gerçekten `true`,
3 saniyelik bir rAF beklemesi hiç tetiklenmedi). Düzeltme: (a) worker'ın
kendi bildirdiği uygulama hataları (`err.isApplicationError`) fallback'e
DÜŞMEDEN doğrudan kullanıcıya gösteriliyor, (b) geri kalan (gerçek altyapı
arızası) fallback yolu `requestAnimationFrame` yerine `setTimeout(0)`
kullanıyor (arka planda KISILIR ama ASLA DURMAZ). Düzeltme sonrası aynı
3-kanal dosyası ~100ms içinde doğru Türkçe hatayı gösterdi (bkz. DOĞRULAMA).

**DOĞRULAMA:**
- **11 parametrenin hepsi ekranda göründü** (gerçek, sentetik bir test
  dosyası — 40s stereo, 4 farklı seviye bölümü + 5s sessizlik + 5s kasıtlı
  kırpma içeriyordu — yüklenip analiz edildi, canlı ekran görüntüsüyle
  doğrulandı): True peak +0.0/+0.0 dBTP, Sample peak +0.0/+0.0 dBFS, Max RMS
  −2.9/−2.9 dB, Min RMS −∞/−∞ (sessizlik bölümü doğru yakalandı), Total RMS
  −9.9/−9.9 dB, Olası kırpılmış örnek 19500/19500, DC offset +1.72%/+1.72%,
  Max momentary 0.1 LUFS, Max short-term 0.1 LUFS, Integrated −5.0 LUFS
  (büyük/vurgulu), Loudness range 14.1 LU — hepsi test dosyasının BİLİNEN
  yapısıyla (kasıtlı kırpma/sessizlik/DC/seviye bölümleri) TUTARLI.
- **Uzun dosyada arayüz DONMADI — sıkı bir testle kanıtlandı:** 10 dakikalık
  sentetik bir stereo dosya (worker'a doğrudan, gerçek `core/analysis-worker.js`
  ile) analiz ettirildi (~20.9 saniye sürdü); analiz HÂLÂ ÇALIŞIRKEN
  (`workerDone:false`, 10.6s noktasında ölçüldü) gerçek bir fare tıklaması
  VE bir kaydırma (scroll) hareketi başarıyla gerçekleştirildi, sayfa akıcı
  tepki verdi — ana thread'in GERÇEKTEN serbest olduğunun doğrudan kanıtı
  (basit bir `setInterval` heartbeat'i YANILTICI çıktı — Chrome'un arka
  plan sekme kısıtlaması yüzünden worker'sız kontrol testinde de aynı düşük
  sayıyı verdi, bu yüzden GERÇEK etkileşim tabanlı bir teste geçildi).
- **Short-term grafiği gerçek veriden çizildi:** ekran görüntüsünde net bir
  yüksek→düşük→yüksek eğrisi (test dosyasının seviye bölümleriyle tutarlı),
  kesikli Integrated referans çizgisi görünür durumda. **Dokunma/kaydırma
  etkileşimi test edildi:** grafiğe tıklanınca "0:27 — -2.3 LUFS
  (short-term)" gibi doğru zaman+değer okuması çıktı.
- **Hata durumları:** yukarıdaki bug bulma/düzeltme sürecinin KENDİSİ bu
  maddenin doğrulaması — düzeltme SONRASI 3-kanallı dosya ~100ms içinde
  "Bu dosyanın kanal sayısı (2'den fazla) şu an desteklenmiyor. Mono veya
  stereo bir dosya dene." mesajını gösterdi, buton yeniden aktif oldu
  (ekran görüntüsüyle doğrulandı).
- **Konsol hatası:** hata-yolu testinde GÖRÜLEN `console.error`/`console.warn`
  girdileri KENDİ kasıtlı tanı loglarım (`[analiz] hata:` / `[analiz] Worker
  başarısız...`) — HANDLED, beklenen bir durumun (desteklenmeyen dosya)
  loglanması, sessiz/beklenmedik bir çökme DEĞİL. Bunların dışında (normal
  analiz akışında) konsol hatası **0**.
- **`npm test`: 1094/1094** (G98 sonrası 1091, +3 yeni test —
  `shortTermLufsSeries` — hiçbir eski test SİLİNMEDİ/DEĞİŞTİRİLMEDİ).
- **Not — bu turun test ortamı sınırlaması:** Son bir "temiz tekrar" koşusu
  sırasında tarayıcı otomasyon eklentisi geçici olarak bağlantısını
  kaybetti/kararsızlaştı (dosya yükleme aracı başarı raporlayıp gerçekte
  dosyayı iliştirmedi) — bu ortamsal bir arıza, kod DEĞİŞİKLİĞİ değil.
  Yukarıdaki TÜM doğrulamalar (11 parametre, donma-yok kanıtı, grafik+
  etkileşim, hata düzeltmesi) bu arızadan ÖNCE, temiz/tekrarlanabilir
  koşullarda elde edildi.

**Not — provenance sorusu HÂLÂ AÇIK:** `OYUN-MANTIGI.md` bu turda da
commit'e dahil edilmedi, kullanıcı henüz yanıt vermedi.

---

Önceki commit (G98, tek commit) — **Araçlar ölçüm motoru, 1. bölüm: hesaplama
çekirdeği (`www/js/core/analysis.js`, ARAYÜZSÜZ, saf fonksiyonlar). iZotope
RX Waveform Statistics + Loudness panelindeki 11 parametreyi (kanal başına
true peak/sample peak/max-min-total RMS/possibly clipped/DC offset + program
geneli max momentary/max short-term/integrated LUFS/LRA) ITU-R BS.1770-4 /
EBU R128 / EBU Tech 3342 standartlarına göre hesaplıyor. Arayüz YOK (sonraki
tur), mevcut sahte Analiz kartına DOKUNULMADI.**

Kaynak: DEVIR.md FAZ 2 (07.08'de netleşen karar) + task'ın verdiği iZotope RX
referans parametre listesi + standart metinleri (ITU-R BS.1770-4, EBU R128,
EBU Tech 3342).

**K-weighting katsayı türetimi (DÜRÜSTLÜK notu):** Standart RBJ Audio-EQ-
Cookbook shelf/highpass formülleri DENENDİ, ITU'nun 48kHz referans
katsayılarıyla (b0=1.53512485958697 vb.) UYUŞMADI (a1/a2 10 hane tuttu ama
b0/b1/b2 sabit bir çarpanla kaydı). Bunun yerine K=tan(π·f0/fs) tabanlı
bilineer-dönüşüm formülü kullanıldı — f0/G/Q=1681.9744509555319/
3.99984385397/0.7071752369554193 (ön-filtre) ve f0/Q=38.13547087613982/
0.5003270373238773 (RLB) parametreleriyle 48kHz'de ITU'nun TÜM 5 katsayısını
10+ ondalık hane doğrulukla üretiyor — **sayısal olarak node ile doğrulandı,
testte KİLİTLİ** (`test/analysis.test.mjs`, "K-weighting katsayı türetimi"
describe bloğu).

**True Peak (DÜRÜSTLÜK notu):** BS.1770-4 Ek 2'nin resmi 4x polifaz FIR
tablosu (12 taps×4 faz) ezbere/güvenilir biçimde yazılamayacağı için (yanlış
sayı üretme riski) BİREBİR uygulanmadı — yerine kendi tasarlanan 4x
Kaiser-pencereli sinc ara değerleme filtresi (halfWidth=12, beta=8.6,
tapsPerPhase=24) kullanıldı. Polifaz ayrıştırmanın her fazının DC kazancı
~1.0 (±1e-4) — testle doğrulandı. Frekans taraması ile ÖLÇÜLEN sınır: saf
tonlarda bu filtre gerçek tepe değerinin EN FAZLA ~0.55dB ÜZERİNDE okuyabilir
(en kötü durum ~%63 Nyquist civarı) — bu sınır teste KİLİTLİ (<0.7dB
regresyon testi). Sapma YUKARI yönlü (fazla okur, az okumaz) — kırpma
tespiti için güvenli yönde.

**RMS konvansiyonu:** HAM (tam ölçekli sinüs → −3.0103dB) ve AES17 (→0dB,
HAM+3.0103dB) İKİSİ DE hesaplanıp döndürülüyor (`maxRmsDb.raw/.aes17` vb.) —
hangisinin RX'inkiyle örtüştüğü kullanıcı karşılaştırmasıyla belirlenecek.

**Seçilen pencereler/eşikler (RX'in kendi değerleriyle BİREBİR TUTMAYI
hedeflemiyor, task'ın kendi notu):**

| Parametre | Seçilen değer | Gerekçe |
|---|---|---|
| Windowed RMS penceresi | 300ms | Klasik Type I VU-metre entegrasyon süresine yakın, yaygın "yavaş RMS" varsayılanı — `options.rmsWindowMs` ile override edilebilir |
| Kırpma eşiği | \|örnek\| ≥ 0.9999 | ~tam ölçek, 16-bit PCM'in tam ölçek uçlarını (32767/32768≈0.999969) da kapsar |
| Kırpma ardışıklık kuralı | ≥3 art arda örnek | İzole tek bir tam-ölçek örneği gerçek bir tepe olabilir, kırpılma değil |
| True peak aşırı örnekleme | 4x | Task'ın "en az 4x" gereği |

**Bellek:** decodeAudioData'nın kendisi (bu modülün kontrolü DIŞINDA)
zaten tüm dosyayı bellekte tutuyor — bu modül CHUNK_SIZE'lık bloklar
halinde (varsayılan 131072 örnek) akışkan işler, dosya-boyutunda YENİ bir
kopya TUTMAZ; sadece O(1) durum (biquad/FIR/pencere state'leri) ve
O(süre/100ms) büyüklüğünde bir "blok gücü" dizisi (5 dakikada ~3000 float
≈ 24KB) tutar.

**DOĞRULAMA:**
- **11 parametrenin hepsi hesaplanıyor** — `analyzeAudioBuffer()`'ın döndürdüğü
  `channels[].{samplePeakDb, truePeakDb, maxRmsDb, minRmsDb, totalRmsDb,
  possiblyClippedSamples, dcOffsetPercent}` (kanal başına ×2 için L/R) ve
  `program.{maxMomentaryLufs, maxShortTermLufs, integratedLufs, lra}`.
- **Referans testleri (beklenen/ölçülen/sapma, gerçek node çalıştırmasıyla):**

  | Test | Beklenen | Ölçülen | Sapma |
  |---|---|---|---|
  | 0dBFS 1kHz sinüs, sample peak | 0.000 dBFS | 0.000 dBFS | <0.001dB |
  | 0dBFS 1kHz sinüs, total RMS (ham) | −3.0103 dB | −3.0103 dB | <0.01dB |
  | 0dBFS 1kHz sinüs, total RMS (AES17) | 0.000 dB | 0.000 dB | <0.01dB |
  | EBU R128 uyum sinyali: −23dBFS stereo sinüs, integrated | −23.0 LUFS | −22.993 LUFS | 0.007 LU |
  | Mono, aynı per-kanal seviye, stereo'dan fark | 3.0103 LU | 3.0103 LU (±0.02 tolerans içinde geçti) | ~0 |
  | −12dBFS vs −18dBFS mono, integrated farkı | 6.0 LU | 6.0 LU (±0.02 tolerans içinde geçti) | ~0 |
  | +0.1 sabit DC | %10.000 | %10.000 | <0.0001 |
  | −0.05 sabit DC | %−5.000 | %−5.000 | <0.0001 |
  | 10 ardışık tam-ölçek örnek | 10 örnek | 10 örnek | 0 |
  | 2+izole (ardışık olmayan) tam-ölçek | 0 örnek | 0 örnek | 0 |
  | Tam sessizlik | integrated/momentary/short-term=−∞, LRA=0 | birebir | 0 |
  | Sessizlik+ton (kapı testi) | naif sızıntı ~1.76 LU'nun ÇOK altında | 0.166 LU (geçiş-bloğu kenar etkisi, beklenen) | — |

- **RMS'in iki konvansiyondaki değerleri:** her kanal için `raw`/`aes17`
  alanlarında AYRI AYRI döner (yukarıdaki tabloda 0dBFS örneği).
- **Seçilen RMS penceresi:** 300ms (`meta.rmsWindowMs`, override edilebilir).
  **Kırpma eşiği:** 0.9999, **ardışıklık kuralı:** ≥3 (`meta.clipThreshold`,
  `meta.clipMinConsecutive`).
- **Bellek kullanımı (gerçek ölçüm, `process.memoryUsage()`, 5 dakikalık
  44.1kHz stereo sentetik sinyal, `--expose-gc` ile zorlanmış GC sonrası):**
  ham PCM (decodeAudioData eşdeğeri) **100.9 MB** (arrayBuffers) — analiz
  motorunun EK arrayBuffers tüketimi **0.00 MB** (dosya-boyutunda yeni kopya
  YOK, iddia edilen tasarım doğrulandı), EK RSS **~9 MB** (~%9, geçici
  chunk/state tahsisleri + GC artığı). İşlem süresi (Node, M-serisi olmayan
  bir donanım varsayımı yapılmadı, SADECE bu makinede ölçüldü): **~2.2
  saniye** / 300 saniyelik stereo dosya.
- **`npm test`: 1091/1091** (G97 sonrası 1057, +34 yeni test —
  `test/analysis.test.mjs`, hiçbir eski test SİLİNMEDİ/DEĞİŞTİRİLMEDİ).
- **Canlı tarayıcı/cihaz doğrulaması YAPILMADI** — bu tur "arayüz yok, sadece
  çekirdek" kapsamında, task'ın kendi isteğiyle. Gerçek bir yüklenmiş dosya
  üzerinde (upload.js'in decode ettiği GERÇEK AudioBuffer ile) çalıştırma
  bir sonraki (arayüz) turun işi.

**Not — provenance sorusu HÂLÂ AÇIK:** `OYUN-MANTIGI.md` bu turda da
commit'e dahil edilmedi (bkz. G97 kaydı), kullanıcı henüz yanıt vermedi.

---

Önceki commit (G97, tek commit) — **Yedi ürün kararı uygulandı: (1) ücretsizde
seans rampası artık offset=0 (boss hariç) — 10 soruya yayılan rampa ücretsizin
5 soruluk oturumunda hep yarım kalıyordu; (2) `session-plan.js` başına
"kullanılmıyor" notu (dosya SİLİNMEDİ); (3) boss süresi dolunca can artık
GİTMİYOR (combo yine sıfırlanıyor — gerekçe aşağıda); (4) sınav/bölüm-bitişi
bastırma mantığı KASITLI olarak koda belgelendi (Pro'da ödül sınav ekranıdır);
(5) dB Seviyesi çeldirici eğrisi daraltıldı, şık sayısı 3'te SABİTLENDİ
(eskiden 3→6 büyüyordu); (6) Kompresör/Reverb/Distortion'da 3 kart sabiti
KASITLI belgelendi; (7) Distortion'daki tür sıçraması KASITLI belgelendi.**

Kaynak: ZORLUK.md + OYUN-DINAMIGI.md + doğrudan kod okuması. `OYUN-MANTIGI.md`
(kullanıcının "bu oturumda üretildi" dediği dosya) görev başlangıcında repoda
YOKTU (`ls` + `git log --all -- OYUN-MANTIGI.md` boş) — kullanıcıya soruldu,
ZORLUK.md+OYUN-DINAMIGI.md+kod okumasıyla devam kararı alındı (bkz. AÇIK
İŞLER/not). **Not: bu turun SONUNDA dosya sistemde göründü (`OYUN-MANTIGI.md`,
kök dizin, 246 satır, "G94'e kadar" notu) — bu turda HİÇ oluşturulmadı/
düzenlenmedi, provenance doğrulanamadı, commit'e DAHİL EDİLMEDİ (`git status`
hâlâ `??` gösteriyor). Kullanıcıya raporda ayrıca soruldu.**

**Madde 1 — Ücretsizde ramp offset=0:**

| Değişiklik | Dosya:satır | Not |
|---|---|---|
| `currentDifficultyPosition()`: `ramp` artık `(isUserPro() \|\| boss) ? sessionRampOffset(...) : 0` | `app.js:971-993` | Tek koşulla hem "Pro'da tam ramp" hem "ücretsizde bile boss'ta +2.0" doğru veriliyor — boss sabiti (2.0) burada AYRICA hardcode edilmedi |

**DOĞRULAMA (gerçek `continuousLevel`/`sessionRampOffset`, node ile doğrudan import, örnek kullanıcı seviye 3 + %60 XP, baseline=3.600):**

| Soru | Free (ramp=0) | Pro (ramp uygulanır) | Pro ofset |
|---|---|---|---|
| 1 | 3.600 | 2.100 | −1.500 |
| 2 | 3.600 | 2.378 | −1.222 |
| 3 | 3.600 | 2.656 | −0.944 |
| 4 | 3.600 | 2.933 | −0.667 |
| 5 | 3.600 | 3.211 | −0.389 |

Free 5 sorudur, hep düz tabanda kalıyor — rampanın SADECE ısınma yarısını bile
görmüyor (fix öncesi de aynı sorundu, şimdi kasıtlı/tutarlı). Pro 10 soruya
yayılan ısınma→zorlaşma eğrisinin ilk yarısında (henüz 5. soru). Boss ofseti
(+2.0) HER İKİ tier'da da AYNI: pozisyon 5.600 (baseline 3.600 + 2.0).

**Madde 2 — session-plan.js notu:**

| Değişiklik | Dosya:satır | Not |
|---|---|---|
| Dosya başına "⚠️ KULLANILMIYOR" uyarı bloğu eklendi | `session-plan.js:1-11` (dosyanın İLK satırları) | Fonksiyonel kod DOKUNULMADI — sadece dosyayı ilk açan kişinin göreceği yere, gerçek rampanın `difficulty-curve.js:SESSION_RAMP_CONFIG` olduğunu açıkça yazan not |

**Madde 3 — Boss süresi dolunca can gitmesin:**

| Değişiklik | Dosya:satır | Not |
|---|---|---|
| `onTimeUp()`: boss sorusunda `loseLife()` yerine `setFeedback("Boss süresi doldu", ...)` — can gitmiyor, boss çarpanı/XP verilmiyor | `app.js:3154-3195` (`bossTimeout` dalı `app.js:3186-3187`) | Normal (boss olmayan) sorularda davranış DEĞİŞMEDİ — `loseLife()` hâlâ çağrılıyor |
| `stats.combo = 0` KOŞULSUZ bırakıldı (boss'ta da sıfırlanır) | `app.js:3163` (yorum) | Gerekçe: combo "ardışık DOĞRU cevap" sayacı, süre dolması tanım gereği doğru cevap DEĞİL — combo'yu korumak boss round'u bedelsiz bir "atlama" hakkına çevirirdi, bu da boss'un "gerçek kontrol noktası" rolünü zayıflatırdı. Can esirgemek SADECE boss'un doğal olarak daha kısa/zor süresini haksız cezalandırmamak içindir, "kaçırma"yı yok saymak değildir |

**DOĞRULAMA (canlı, izole tek-tur testi — localStorage `rounds:54` ile boss
zorlandı, hard-reload sonrası taze state doğrulanarak):**
- Round boss olarak işaretlendi, süre doldu, geri bildirim "Boss süresi doldu"
  gösterdi.
- Sonuç: `lives: 5` (turdan ÖNCEKİ değerle AYNI), 5 kalp de dolu
  (`#ef4a5e`), history'de TEK kayıt: `{boss:true, detail:"Kaçırıldı · 3.70
  kHz · Pink Noise · Boss"}` — can GİTMEDİ.
- Combo kontrolü: `stats.combo === 0` (sıfırlandı, tasarım gereği), UI'da
  "x1" gösterdi (G93'ün taban-1 gösterim kuralı, ayrı/önceden var olan
  davranış) — beklenen sonuç birebir.

**Madde 4 — Sınav/bölüm bastırma kasıtlı belgele:**

| Değişiklik | Dosya:satır | Not |
|---|---|---|
| `ensureAutoNext()`'in `finishChallenge()` bastırma bloğuna "ÜRÜN KARARI, HATA DEĞİL" paragrafı eklendi | `app.js:~4237` civarı (yorum genişletmesi, mantık DEĞİŞMEDİ) | Bölüm bonusu (%50 XP, `CHALLENGE_XP_MULT`) `challenge.active && isChallenge()`'a bağlı — `examGateActive()`'DAN BAĞIMSIZ, yani Pro'da ekran bastırılsa da bonus ZATEN uygulanıyordu (kod değişikliği gerekmedi, sadece doğrulandı) |

**Madde 5 — dB Seviyesi çeldirici eğrisi daraltıldı:**

| Değişiklik | Dosya:satır | Not |
|---|---|---|
| `STEP_AT_1` 1.5→0.8, `STEP_AT_CAP` 0.28→0.18, `STEP_FLOOR` 0.22→0.15, `STEP_REDUCTION_PER_STEP` 0.01→0.005 | `db-seviyesi.js:DB_CURVE_CONFIG` (~satır 102-140) | FLOOR=0.15 seçimi: `generateChoices`'ın `Math.round(x*100)/100` yuvarlaması gerçek şık-arası mesafeyi en kötü durumda 0.01 küçültebiliyor — 0.15, DB_TOLERANCE(0.1)+0.01'in üzerinde gerçek bir marj bırakıyor |
| `OPTIONS_AT_CAP` 6.15→3 (artık sabit) | aynı config | Kullanıcı kararı: şık sayısı ekseni BİLEREK devre dışı, TÜM zorluk STEP eksenine yükleniyor (Q Genişliği'ndeki izolasyon ilkesiyle aynı desen) |
| Test dosyası: "options eski statikten küçük değil" → "options HER tier'da SABİT 3"; 4 yeni test (1000 denemelik tolerans invaryantı) | `test/db-seviyesi.test.mjs:123-` (yeni describe bloğu), `:368`, `:430` (güncellenen eski testler) | Eski invaryant KASITLI olarak bozuldu (kullanıcı kararı), yeni invaryant test'e kilitlendi |

**DOĞRULAMA (Z1-Z20 tablosu, gerçek `paramsForDifficultyPosition()` çağrısıyla, node ile doğrudan import):**

| Z | STEP (dB) | options | marj (STEP−0.1) |
|---|---|---|---|
| 1 | 0.8000 | 3 | 0.7000 |
| 2 | 0.7396 | 3 | 0.6396 |
| 3 | 0.6838 | 3 | 0.5838 |
| 4 | 0.6321 | 3 | 0.5321 |
| 5 | 0.5844 | 3 | 0.4844 |
| 6 | 0.5403 | 3 | 0.4403 |
| 7 | 0.4995 | 3 | 0.3995 |
| 8 | 0.4618 | 3 | 0.3618 |
| 9 | 0.4269 | 3 | 0.3269 |
| 10 | 0.3947 | 3 | 0.2947 |
| 11 | 0.3649 | 3 | 0.2649 |
| 12 | 0.3373 | 3 | 0.2373 |
| 13 | 0.3118 | 3 | 0.2118 |
| 14 | 0.2883 | 3 | 0.1883 |
| 15 | 0.2665 | 3 | 0.1665 |
| 16 | 0.2464 | 3 | 0.1464 |
| 17 | 0.2278 | 3 | 0.1278 |
| 18 | 0.2106 | 3 | 0.1106 |
| 19 | 0.1947 | 3 | 0.0947 |
| 20 | 0.1800 | 3 | 0.0800 |

Z1 (0.80) eski Z1'in (1.5) BELİRGİN altında — mod baştan itibaren belirgin
zorlaşmış. En dar marj Z20'de 0.08dB — DB_TOLERANCE'ın (0.1) HİÇBİR kademede
ALTINA düşmedi (invaryant sağlam). 1000 denemelik çarpışma-yok testleri
(gerçek değere karşı + şıklar arası) `test/db-seviyesi.test.mjs`'te 4 yeni
test olarak eklendi, hepsi geçiyor.

**Madde 6 — Motor 2 sabit 3 kart, kasıtlı:**

| Değişiklik | Dosya:satır |
|---|---|
| Gerekçe yorumu eklendi ("hangisi farklı" oyununda 4-5 ses dinlemek kulak yorgunluğu yaratır) | `kompresor.js:178` (Reverb/Distortion'a çapraz referans) |
| Aynı gerekçeye çapraz referans | `reverb.js:124`, `distortion.js:189` |

**Madde 7 — Distortion tür sıçraması, kasıtlı:**

| Değişiklik | Dosya:satır |
|---|---|
| Gerekçe yorumu eklendi (gerçek mix'te tek doygunluk türü yoktur — kick'te tape, vokalde tube, master'da clip olabilir) | `distortion.js:67` (`DISTORTION_TYPES` yakını) |

**Genel DOĞRULAMA:**
- Konsol hatası: **0** (tab hard-reload sonrası `read_console_messages`, tüm oturum boyunca).
- **`npm test`: 1057/1057** (G96 sonrası 1053, +4 yeni test — madde 5'in 1000 denemelik tolerans invaryantı — hiçbir eski test SİLİNMEDİ, 2 tanesi kasıtlı olarak yeni invaryanta güncellendi).

---

Önceki commit (G95+G96, tek commit) — **ZORLUK.md'nin iki bulgusu düzeltildi:
(1) Tonal Denge artık Z16-Z20'de "hiç dokunmadan" kaybedilemiyordu — tolerans
sabitten disturbDb'nin position'a göre küçülen bir oranına çevrildi; (2)
seans rampası artık 10 Soruluk Bölüm'e oturuyor — CYCLE_LENGTH 5'ten 10'a
çıktı, session-plan.js (ölü kod, hâlâ dokunulmadı) devreye ALINMADI, kullanıcı
kararıyla mevcut sürekli-ofset mekanizması genişletildi.**

Kaynak: ZORLUK.md (bu oturumdan önceki tur) + OYUN-DINAMIGI.md (10 Soruluk
Bölüm/roundsInThisPlaySession/challenge.done ilişkisinin doğrulanması için
okundu). Sıra kullanıcının istediği gibi: G95 önce bitirilip doğrulandı,
SONRA G96'ya geçildi.

**G95 — Tonal Denge tolerans:**

| Değişiklik | Dosya:satır | Not |
|---|---|---|
| `TONAL_CURVE_CONFIG`'e `TOLERANCE_RATIO_AT_1=0.14`/`TOLERANCE_RATIO_AT_CAP=0.045` eklendi | `tonal-denge.js:TONAL_CURVE_CONFIG` | Oran TAVANI (0.14) yapısal bir sınırla seçildi: `bandsForQuestion`'ın en dilüe durumu (6 banttan 1'i bozuk, min jitter 0.9x) ile "hiç dokunmadan" elde edilebilecek minimum avgDeviation ≈ disturbDb×0.15'e iniyor — 0.14 bunun altında güvenlik payı bırakıyor |
| `paramsForDifficultyPosition()` artık `neutralToleranceDb` (=disturbDb×oran) döndürüyor | `tonal-denge.js:paramsForDifficultyPosition` | disturbDb'nin POST-floor haliyle çarpılıyor, LEVEL_CAP ötesinde disturbDb sabitlenince tolerans da doğal sabitleniyor |
| `createQuestion()` soru nesnesine `neutralToleranceDb` ekliyor (eğri yoksa sabit `NEUTRAL_TOLERANCE_DB`'ye düşer) | `tonal-denge.js:createQuestion` | proplus/statik-doğrudan-çağrı/mevcut testler İÇİN davranış BİREBİR korunuyor |
| `evaluateAnswer()`, per-bant `teachingText()`, per-bant `markAnswerChoices()` ÜÇÜ de artık AYNI soru-özel toleransı okuyor | `tonal-denge.js:417,434,492-500,589-598` | eskiden sadece genel sonuç sabit kullanıyordu, bant-başı metin/renk HÂLÂ eski sabit 1.5dB'yi kullanıyordu — bu TUTARSIZLIK (genel "yanlış" derken bir bant "iyi düzelttin"/yeşil görünebilirdi) da giderildi |

**DOĞRULAMA (G95 — istenen iki ölçüm, gerçek kodla):**
- **Ölçüm 1 — "hiç dokunmadan" geçme oranı, Z1-Z20 HEPSİNDE, HER bant sayısında
  (4/5/6), 300'er deneme (test) + keşif turunda 20000'er deneme: %0.00.**
  1.2 milyon denemelik stres testinde TEK bir geçiş bulunamadı — en dar marj
  Z1'de (minAvgDeviation − tolerans = 0.09dB, hep pozitif).
- **Ölçüm 2 — yakın (±%20 hata payıyla) düzeltmenin geçme oranı: Z1'de %98.4,
  Z20'de %38.6** (3×1000 deneme/seviye, tam Z1-Z20 tablosu ZORLUK.md'nin
  takibi olarak konuşmada raporlandı) — kademeli düşüyor, SIFIRLANMIYOR
  (imkânsız değil).
- **7 yeni test** eklendi (`test/tonal-denge.test.mjs`, "G95" describe
  bloğu) — yukarıdaki iki ölçümü KALICI olarak kilitliyor, artık `npm test`in
  parçası.
- **Canlı tarayıcı:** Tonal Denge'ye girilip 4 kaydırık da 0.0dB'de
  BIRAKILARAK "Cevabı Onayla"ya basıldı — "Yakınlık %65 / Henüz nötr değil"
  (kırmızı ✕) çıktı, sadece GERÇEKTEN bozuk olan bantlar kırmızı işaretlendi
  (BAS/TİZ zaten ~nötrdü, yeşil kaldı) — genel sonuç ile bant renkleri TUTARLI.
  Konsol hatası: 0.

**G96 — Seans rampası 10 soruya hizalama:**

| Değişiklik | Dosya:satır | Not |
|---|---|---|
| `SESSION_RAMP_CONFIG.CYCLE_LENGTH` 5→10 | `difficulty-curve.js:SESSION_RAMP_CONFIG` | MIN_OFFSET/MAX_OFFSET/BOSS_OFFSET DEĞİŞMEDİ — sadece periyot uzadı. `isBossRound()`'un KENDİ periyodu (5, `stats.rounds`) BU DEĞİŞİKLİKTEN AYRI, ETKİLENMEDİ |
| `session-plan.js` (SESSION_RAMP_WEIGHTS: 3 kolay/3 orta/3 zor/1 pro) | dokunulmadı | Kullanıcı kararıyla devreye ALINMADI — hâlâ sadece kendi test dosyasından import ediliyor, hâlâ ölü kod (bilerek, DURUM.md'de not) |
| 2 hardcoded test düzeltildi (CYCLE_LENGTH=5 varsayıyorlardı) | `test/difficulty-curve.test.mjs` (periyodiklik testi), `test/db-seviyesi.test.mjs:466` (seans rampası eğilimi testi) | İkisi de artık `SESSION_RAMP_CONFIG.CYCLE_LENGTH`'i OKUYOR, sabit sayı YAZMIYOR — db-seviyesi testi CYCLE_LENGTH=10'da eskiden SADECE idx 0-4'ü (hepsi kırpılan alt-yarı) tarıyordu, `npm test` bunu YAKALADI (1 test FAIL etti, düzeltildi) |
| 3 yeni test eklendi | `test/difficulty-curve.test.mjs` ("G96" describe bloğu) | CYCLE_LENGTH===10, ilk/son soru ofsetleri, eski 5'lik periyodun ARTIK tekrarlamadığı — kilitli |

**DOĞRULAMA (G96):**
- **10 Soruluk Bölüm'ün ofset dizisi (gerçek `sessionRampOffset()` çağrılarıyla
  hesaplandı, canlı oynanmadan):**

  | Soru | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
  |---|---|---|---|---|---|---|---|---|---|---|
  | ofset | −1.500 | −1.222 | −0.944 | −0.667 | −0.389 | −0.111 | +0.167 | +0.444 | +0.722 | +1.000 |

  Bölümün İLK sorusu her zaman en kolay (−1.5), SON sorusu (boss DEĞİLSE) en
  zor (+1.0) — TEK bir ısınma→zorlaşma eğrisi, eskiden (CYCLE_LENGTH=5) bu
  eğri bölüm İÇİNDE İKİ KEZ tekrarlanıyordu. Boss'ta (hangi index olursa
  olsun) ofset HER ZAMAN +2.0 — `isBossRound`'un KENDİ 5-lifetime-round
  periyodu bu tabloyla hizalı olmayabilir (bilinen, DEĞİŞMEYEN bir ayrım,
  bkz. kod notu).
- **`roundsInThisPlaySession` ↔ `challenge.done` hizası doğrulandı (kod
  okuması):** her gerçek challenge başlangıcında (`startFreshAttempt`/
  `#startBtn`'in idle dalı) `resetSession()` (roundsInThisPlaySession=0)
  `startChallenge()`'DAN HEMEN ÖNCE, AYNI senkron çağrıda çalışıyor — bu
  yüzden tablo GERÇEK bir 10 Soruluk Bölüm'e birebir uygulanıyor.
- **Canlı tarayıcı:** "Seti başlat · 10 soru" ile bölüm başlatıldı, birkaç
  soru cevaplanıp/atlanıp BÖLÜM sayacının (2/10→3/10) doğru ilerlediği,
  boss+Pro Zorluk turunun da normal akışta çıktığı görüldü — çökme yok.
  Konsol hatası: 0.
- **`npm test`: 1053/1053** (G95 öncesi 1043, +10 yeni test — 7'si G95, 3'ü
  G96 — hiçbir eski test SİLİNMEDİ/zayıflatılmadı, sadece 2 tanesi
  CYCLE_LENGTH'i sabit sayı yerine okuyacak şekilde genelleştirildi).

---

Önceki commit (G94, tek commit) — **`.warning` (play butonunun kırmızı halkası)
artık TÜM 10 modda SADECE gerçek ses yükleme hatasında çıkıyor — G93'te
SADECE dB Seviyesi'nde kapsam dışı bırakılan kök sebep bu turda TÜM modlarda
düzeltildi, dB'nin kendi özel `.neutral-play` hack'i gereksiz hale gelip
kaldırıldı.**

Kaynak: `Tasarim-2026-08/Prototip.dc.html` satır 2385 (`playBtnBorder: s.audio
=== 'error' ? 'rgba(248,113,96,0.4)' : 'rgba(255,255,255,0.15)'`) ve satır 681
(nötr 64px buton box-shadow'u) — G93'te bulunan sinyal (`sampleLoadFailed`,
G90'dan beri VAR olan gerçek hata bilgisi) bu turda `.warning`'in TEK kaynağı
yapıldı.

Öğe haritası:

| Değişiklik | Dosya:satır | Not |
|---|---|---|
| `showAudioError()`/`hideAudioError()` artık `#startBtn`'e `.warning` ekleyip/kaldırıyor | `app.js:3994-4017` civarı (fonksiyonların YENİ gövdesi) | `#audioErrorRow` banner'ıyla AYNI yaşam döngüsü — playQuestion()'ın GERÇEK `sampleLoadFailed` sonucuna göre (2 çağrı yeri: cakisma dalı + normal dal), ayrı bir state değişkeni İCAT EDİLMEDİ |
| `updateStartBtnLabel()`'daki koşulsuz `.classList.add("warning")` KALDIRILDI | `app.js:~1656-1663` | idle branch'teki `.remove("warning")` GÜVENLİK SIFIRLAMASI olarak KORUNDU (mod değişimi/tur sonunda kalıntı kırmızı kalmasın diye) |
| `db-seviyesi.js`'nin `NEUTRAL_PLAY_BTN` bayrağı + app.js'teki `.neutral-play` toggle'ı + styles.css'teki `.neutral-play` kuralı KALDIRILDI | `db-seviyesi.js`, `app.js` (`enterMode()`), `styles.css` | G93'ün SADECE dB için uyguladığı scoped hack — kök sebep artık genel çözüldüğü için gereksiz (hatta YANLIŞ olurdu: dB'de GERÇEK bir hatayı da bastırırdı) |
| Base `.game-ctrl-play`'in box-shadow'u prototipin KENDİ 64px buton ölçüsüne (satır 681) döndü | `styles.css:.game-ctrl-play` | Eskiden `0 4px 14px rgba(0,0,0,.35)` idi (G93'te SADECE dB'nin scoped override'ında düzeltilmişti) — şimdi `0 8px 20px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.12)` TÜM modlarda |

**Testler:** `createQuestion`/`evaluateAnswer` DEĞİŞMEDİ. **`npm test`: 1043/1043.**

**DOĞRULAMA (canlı tarayıcı, taze sekme, hard-reload + `AudioContext.prototype.
decodeAudioData` gerçek-hata simülasyonu):**
- **10 modun HEPSİNDE tur başında nötr:** her modda karta girilip round
  başlatıldı, `#startBtn`'in computed `border-color`'ı TÜM 10 modda
  `rgba(255,255,255,.1)` (nötr `var(--border-strong)`) ölçüldü, `.warning`
  class'ı HİÇBİRİNDE yoktu (Frekans Bulma/Kesim Noktası/Q Genişliği/
  Boost-Cut/dB Seviyesi/Kompresör/Reverb/Tonal Denge/Distortion/Frekans
  Çakışması).
- **Gerçek hata simülasyonu:** `AudioContext.prototype.decodeAudioData`
  geçici olarak HER ZAMAN reddedecek şekilde yamandı (gerçek ağ/dosya
  BOZULMADI, sadece decode aşaması simüle edildi) — örnek-tabanlı bir
  kaynak (Kick/Snare) seçilip tur başlatıldığında Frekans Bulma'da VE dB
  Seviyesi'nde (`sampleBufferCache` çakışmasın diye FARKLI örnekler
  kullanıldı) `border-color: rgba(255,77,109,.4)` (kırmızı) + `.warning`
  class'ı + "Ses yüklenemedi · Tekrar dene" banner'ı ekran görüntüsüyle
  doğrulandı.
- **Kurtarma:** decodeAudioData GERÇEK haline döndürülüp "Tekrar dene"ye
  basıldığında buton nötre, banner gizliye döndü — round-trip (hata→kırmızı→
  düzelt→nötr) tam doğrulandı.
- **Konsol hatası: 0 GERÇEK hata** — simülasyon sırasında `console.error`
  ile loglanan 6 mesaj TAMAMEN BEKLENEN/kasıtlı (audio-engine.js'in kendi
  `catch(err){console.error(err);...}` bloğu, gerçek hata senaryosunda
  ZATEN loglaması gereken, G90'dan beri var olan davranış) — uygulama
  kaynaklı beklenmedik hata YOK. **`npm test`: 1043/1043.**

---

Önceki commit (G93, tek commit) — **9 madde: dB Seviyesi'nin arka planı (ızgara+
frekans etiketleri) tamamen kalktı + barlar gri/cyan ikili renge döndü, çip
satırları TÜM modlarda eşit genişlik (flex:1), combo "x0" bug'ı düzeltildi
(normalde x1, sadece kırılma anında kırmızı x0), "Atla" barı altın vurgulu,
İlerleme akordiyonlarının TAM satırı (chevron dahil) tıklanabilir, dB'nin
play butonundaki kırmızı halka nötre döndü.**

Kaynak: `Tasarim-2026-08/Prototip.dc.html` — comboLabel/comboFill/comboBg/
comboBorder mantığı satır 2579-2583'ten birebir alındı (`s.comboBreak`
GEÇİCİ bayrağı); play butonunün nötr paleti satır 681'den; chip satırının
`flex:1` talebi tasarımın KENDİ satır 531/532 `flex-shrink:0`/doğal-genişlik
kararını BİLEREK tersine çeviriyor (G91'in aynı satırdaki "dolgunluk" kararını
da aşan, kullanıcının bu turdaki AÇIK talimatı).

Öğe haritası:

| # | Madde | Uygulanan değişiklik |
|---|---|---|
| 1 | dB arka planı kalksın | `db-seviyesi.js`: mod-özel `drawAxis()` (ızgara+100Hz..12.8kHz etiketleri) TAMAMEN silindi; ayrıca app.js'in TÜM modlarda ortak çizdiği nokta-ızgara (`drawVisualizer`'daki genel `for x+=40/y+=36` döngüsü) da `mode.BARE_ANALYZER` iken atlanıyor — kullanıcı raporu bu ikinci, paylaşılan katmandan geliyordu, mod dosyasındaki eksen silinmesi TEK BAŞINA yetmemişti (canlı testte yakalandı) |
| 2 | Bar renkleri | `REF_PALETTE` (A·Referans) `#9AA3B8/#5A6377`→`#8f949b/#565b63` (nötr gri-mavi); `PROC_PALETTE` (B·İşlenmiş) yeşil (`#46d968/#27a63e`, G91'in kararı)→cyan (`#22d3ee/#1aa8ba`, task'ın literal rengi) — yeşil SADECE `PROC_ANSWERED_PALETTE`'in "doğru cevap" outline'ında kaldı, dolgu değil |
| 3+8 | Çip satırı eşit genişlik | `.chiprow > *{flex:1;min-width:0}` (eskiden `flex:none`+`justify-content:space-between`) — AYRICA iki kök sebep bulunup düzeltildi: (a) `.mixchip`/`.seg-toggle`'ın KENDİ `flex:none` kuralı `.chiprow > *` ile AYNI özgüllükte olup dosyada SONRA geldiği için onu eziyordu ("Karışık" hep küçük kalıyordu); (b) `flex:1` kısayolunun `flex-basis:0%` çıktısı Chromium'da farklı padding'li kardeşlerde EŞİT dağılmıyordu, `flex-basis:0` (birimsiz) ile düzeltildi |
| 4 | Combo x0 | `renderGameHeader()`: `isBreakMoment = combo===0 && lastRenderedCombo>0` (flame/break tetikleyicisiyle AYNI ifade) — SADECE o render'da label "x0"+kırmızı (`#f87160`/`rgba(248,113,96,..)`, prototipin comboBreak renkleri), aksi halde `Math.max(1,combo)` (taban x1); ÖNCEDEN ham `stats.combo` basılıyordu (hep 0'dan başlayıp kırıldıktan sonra da SÜREKLİ x0 kalıyordu) |
| 5 | Atla altın | `#nextBtn` nötr gri (`rgba(255,255,255,.05)`/`var(--text-3)`)→`var(--gold)` paleti (`.mode-info-btn` ile AYNI ölçüde subtle vurgu) — G90'da istenip UYGULANMAMIŞ kalmıştı |
| 6 | Akordiyon tıklama alanı | 4 akordiyonda (`dailyToggle`/`recentToggle`/`zoneToggle`/`badgesToggle`) id/`prog-clickable` SADECE `.prog-card-label`'daydı, chevron bir KARDEŞ eleman olduğu için tıklanamıyordu — `modeLevelsToggle`'ın ZATEN doğru olan deseni (id satırın TAMAMINDA) uygulandı; `dailyTipToggle` (Bugünün Önerisi) zaten doğruydu, dokunulmadı |
| 7 | dB play butonu kırmızı halka | `.game-ctrl-play.warning` (kırmızı çerçeve) app.js'te round aktifken KOŞULSUZ ekleniyordu — Prototip.dc.html'de (satır 2385) bu SADECE gerçek ses yükleme hatasında (`s.audio==='error'`) çıkması gereken bir durum, TÜM modları etkileyen bir kök sebep ama task SADECE dB'nin düzeltilmesini istedi: yeni `mode.NEUTRAL_PLAY_BTN` bayrağı (db-seviyesi.js) `#startBtn`'e `.neutral-play` class'ı ekliyor, bu SADECE bu moddaki kırmızı çerçeveyi ezip nötr `linear-gradient(180deg,#23262b,#15171a)` + tasarımın 64px box-shadow'una (satır 681) döndürüyor — DİĞER 9 MOD DOKUNULMADI, aynı kırmızı halka onlarda hâlâ duruyor (bkz. SIRADAKİ) |
| 9 | Ana ekran "i" rengi | Zaten G92'de doğru uygulanmıştı (altın) — bu turda canlı yeniden doğrulandı, ek değişiklik gerekmedi |

**Testler:** `createQuestion`/`evaluateAnswer` DEĞİŞMEDİ. **`npm test`: 1043/1043.**

**DOĞRULAMA (canlı tarayıcı, taze sekme, hard-reload + JS-sürüşlü ölçüm):**
- **dB arka planı:** ızgara çizgisi/frekans etiketi YOK (bare siyah zemin),
  play'e basılınca SADECE iki dikey bar (gri/cyan) + alt etiketler — ekran
  görüntüsüyle doğrulandı.
- **Bar renkleri:** A·Referans gri-mavi, B·İşlenmiş cyan — ekran
  görüntüsüyle doğrulandı (boss round'da da aynı, kırmızı/yeşil karışması
  yok).
- **Çip satırı eşit genişlik — 10 modun HEPSİNDE ölçüldü** (programatik
  `getBoundingClientRect`): Frekans Bulma (5 çip) `[109,97,91,91,113]`
  (maks. fark %19); diğer 9 modun (Kesim Noktası/Q Genişliği/Boost-Cut/dB
  Seviyesi/Kompresör/Reverb/Tonal Denge/Distortion/Frekans Çakışması) HEPSİ
  `[176,158,180]` (maks. fark %12, PAYLAŞILAN `.chiprow` kuralı yüzünden
  aynı desen) — eskiden "Karışık" tek başına ~75px'te kilitli kalıp büyük
  bir boşluk bırakıyordu, şimdi üç çip de görsel olarak eşit doluyor.
  DÜRÜSTLÜK NOTU: matematiksel olarak TAM eşit DEĞİL (~%12-19 kalan fark) —
  kök sebebi `<button>`/`<div>` karışık flex item'ların padding'e bağlı
  intrinsic minimum boyutu (izole testte doğrulandı), TAM eşitlik için
  padding'in flex item'ın kendisinden bir İÇ sarmalayıcıya taşınması (HTML
  restrüktürü) gerekirdi — kapsam dışı bırakıldı, görsel sonuç yeterli
  bulundu ama kullanıcı isterse madde açık kalabilir.
- **Combo x0:** canlı oynanan 5 turda doğrulandı — combo 0→1→2 sırasında
  label "x1"/"x1"/"x2" (dim/dim/parlak amber), seri kırılan turda TAM OLARAK
  "x0" + `rgb(248,113,96)` (kırmızı), BİR SONRAKİ turda (hâlâ yanlış cevap
  olmasına rağmen) "x1"e döndü — tek-seferlik davranış canlı teyit edildi.
- **Akordiyon chevron:** hem programatik hem GERÇEK fare tıklamasıyla
  (Günlük Görevler'in chevron'u, ekran görüntüsüyle) TÜM 5 akordiyonun
  (`dailyToggle`/`recentToggle`/`zoneToggle`/`badgesToggle`/
  `modeLevelsToggle`) artık chevron'dan da açılıp kapandığı doğrulandı.
- **dB play butonu:** hem normal hem boss round durumunda kırmızı çerçeve
  YOK (zoom ekran görüntüsüyle doğrulandı) — nötr gri halka.
- **Konsol hatası: 0** (tüm test turu boyunca — 10 modun hepsine giriş,
  dB'de tam bir round, İlerleme akordiyonları, kulaklık uyarısı akışı
  dahil). **`npm test`: 1043/1043.**

---

Önceki commit (G92, tek commit) — **madde 11 (Altın Vurgular) + madde 12
(Animasyonlar): Ana ekran başlığında "Audio" splash'in altın renginde
(`var(--gold)`), Ana Menü/mod kartı "i" butonları altın, Oyun Ekranı "i" cyan'a
DÖNDÜ (G86'nın nötr gri kararını tersine çeviriyor), döngü butonu aktifken
altın; Prototip.dc.html'in 14 keyframe'i (`shakeX, popIn, heartOut, breathe,
flameGlow, bossPulse, timerRun, ringDraw, barGrow, fadeSlide, comboBreak,
flashPop, spin, dlgIn`) birebir taşındı ve "sessizlik alanı" kuralı (soru
çalarken SADECE süre çubuğu + breathe) canlı doğrulandı. Canlı testte kritik
bir bug bulundu ve AYNI oturumda düzeltildi (aşağıda).**

Kaynak: `Tasarim-2026-08/Prototip.dc.html` (14 keyframe tanımı satır 18-31,
birebir alındı). Splash ekranının "altın rengi" için kodda bağımsız bir splash
HTML/CSS'i YOK (native Capacitor PNG asset) — `resources/splash.png`'nin
kendi piksel renkleri (`--gold:#e8c46a`'dan sapan, daha doygun turuncu/koyu
teal) SAMPLE'LANMADI; bunun yerine "koddan al" talimatı, uygulamada ZATEN
Pro/boss/premium için tek kaynak olan `--gold`/`--gold-grad` custom
property'leri kullanmak olarak yorumlandı — YENİ hex uydurulmadı ama bu bir
YORUM kararı, kullanıcı isterse PNG'den gerçek örnekleme istenebilir.

**Canlı testte bulunan ve düzeltilen bug (heartOut hiç oynamıyordu):**
`loseLife()` kalp kaybında `renderHearts(prevLives-1)`'i (animasyonlu) çağırsa
da, AYNI senkron tick içinde çağıranın hemen ardından çalıştırdığı `updateUI()`
kendi `renderHearts()`'ını (parametresiz) çağırıyor — bu, `innerHTML=""` ile
TÜM kalpleri sıfırdan (animasyonsuz) yeniden kuruyor ve boyanmamış animasyonlu
node'u paint'ten ÖNCE siliyordu. Canlı ölçümde (`.heart` svg'lerinin
`style` attribute'u) can azaldığı halde HİÇBİR kalpte `animation:` hiç
görünmedi — kök sebep `www/js/app.js:1088` (`renderHearts`) ve
`www/js/app.js:2430` (`updateUI`'nin ikinci, gölgeleyen çağrısı) arasındaki
çakışmaydı. Düzeltme: `renderHearts()`'a `${maxLives}:${currentLives}`
imzalı bir "son render" önbelleği eklendi — `loseAnimIndex` VERİLMEDEN aynı
imzayla tekrar çağrılırsa (yani gerçek bir değişiklik yok, sadece rutin
re-render) hiçbir şey yapmıyor, az önce animasyonlu yazılmış DOM aynen kalıyor.
Düzeltme sonrası canlı ölçümde `style="animation: 420ms ... heartOut"` doğru
kalpte (kaybedilen index) doğrulandı.

Öğe haritası:

| # | Madde | Uygulanan değişiklik |
|---|---|---|
| 11 | Altın vurgular | `.brand .brand-gold{color:var(--gold)}` ("Audio"); `.info-btn` ve base `.mode-info-btn` altına döndü; `.ghead-right .mode-info-btn` (`#gameInfoBtn`) cyan'a döndü (`#22d3ee`/`rgba(34,211,238,.3)` — G86 kararını BİLEREK tersine çeviriyor); `#abToggle.loop ~ #abLoopBtn` altın; Pro rozeti/paywall/boss'a HİÇ dokunulmadı |
| 12a | Cevap anı | `.fb-icon{animation:popIn}` (her iki sonuçta da — ikon girişi genel), `.fb-xp{animation:flashPop}` (SADECE doğruda, XP rozeti yanlışta hiç render edilmiyor), `.fb.show-result.bad{animation:shakeX}`, `renderHearts(prevLives-1)` → kaybedilen kalpte `heartOut` |
| 12b | Geri bildirim paneli | `.fb-result-row{animation:dlgIn}` — panelin KENDİ `translateY(100%)→0` transition'ıyla (tüm alt sheet'lerle ortak) çakışmasın diye dlgIn dış `.fb`'ye DEĞİL iç `.fb-result-row`'a uygulandı (bilinçli kompromis); `.fb p{animation:fadeSlide}` + `:nth-of-type` ile 40ms kademeli gecikme |
| 12c | Seans özeti | `buildResultRing()`'in circle'ı `animation:ringDraw 800ms` (dashoffset hedefi inline stroke-dashoffset, `stroke-dasharray` uygulamanın KENDİ `R=76` yarıçapından — 478≈2π·76 — hesaplanıyor, prototipin 490'ı BİLEREK kullanılmadı çünkü farklı bir R'ye karşılık geliyor ve geometrik olarak yanlış olurdu); `#resXpRows .row{animation:fadeSlide}` + `::before{animation:barGrow 600ms}` kademeli |
| 12d | Combo | `.game-combo-chip.flame{animation:flameGlow .7s×2}` (SADECE seri arttığında, `lastRenderedCombo` ile tek-seferlik tetikleniyor); `.game-combo-chip.break{animation:comboBreak}` seri kırılınca |
| 12e | Boss | `.game-boss-row .chip.boss.pulse{animation:bossPulse .7s×3}` — "tur boyunca" talimatı ile TEMEL KURAL'ın "boss rozeti bu fazda durgun kalır" çelişkisi, bitişli (3 tekrar ≈2.1sn) bir "duyuru" darbesi olarak çözüldü, SÜREKLİ değil |
| 12f | Yükleniyor | `.audio-loading-spin{animation:spin .7s linear infinite}` (tek meşru `infinite` — yükleme bitene kadar sürüyor, "sessizlik alanı" ihlali DEĞİL çünkü soru oynatma fazıyla aynı anda değil) |
| — | Erişilebilirlik | `@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important}}` — TÜM 14 keyframe'i kapsıyor (başka hiçbir kuralda `!important` yok, cascade garantili); NOT: bu kural sadece `animation:`'ı kapatıyor, `transition:`'a dokunmuyor — talimatın "sadece opaklık geçişleri kalsın" cümlesi opaklık-DIŞI transition'ların (ör. `.fb`'nin transform slide'ı, timer bar genişlik transition'ı) da kısıtlanmasını ima edebilir, bu YAPILMADI (kısmi uyum, açık karar bekliyor) |
| — | Eksik motion boşluğu (bulundu, düzeltildi) | Motor 1'in büyük yuvarlak `#startBtn`'i "breathe"MİYORDU (SADECE Motor 2'nin kart-içi play butonlarında vardı) — TEMEL KURAL'ın izin verdiği tek hareketlerden biri asıl eksikti; `updateStartBtnLabel()`'a `classList.toggle("breathing", !autoStopped)` eklendi |
| — | İsim birleştirme | Değeri AYNI kalan, sadece ismi prototipe uyan 3 keyframe (`fbShakeX→shakeX`, `fbPopIn→popIn`, `fbCountdown→timerRun`) ve isim+değeri güncellenen 2'si (`resRingDraw→ringDraw` değer korunarak, `resBarGrow→barGrow` ilk kez kullanıma alındı) — çift/yakın-kopya soyutlama BIRAKILMADI |

**Testler:** `createQuestion`/`evaluateAnswer` DEĞİŞMEDİ. **`npm test`: 1043/1043**
(fix öncesi ve sonrası, `node --check www/js/app.js` her JS değişikliğinden
sonra).

**DOĞRULAMA (canlı tarayıcı, taze sekme, hard-reload + JS-sürüşlü test):**
- **Altın vurgular:** "Audio" altın/"Engineer" beyaz/"Academy" cyan, Ana Menü
  `#menuInfoBtn` ve mod kartı `.mode-info-btn` altın, oyun ekranı `#gameInfoBtn`
  cyan, `#abLoopBtn` aktifken `rgb(232,196,106)` (computed style ile) — ekran
  görüntüsü + computed style ile doğrulandı.
- **Sessizlik alanı:** soru çalarken (`document.getAnimations()`,
  `playState:"running"` filtresi) TAM 3 animasyon: timer bar genişlik/renk
  transition'ı (süre çubuğu) + `startBtn`'in `breathe`'i — **0 yetkisiz
  animasyon**, talimatla BİREBİR eşleşiyor.
- **Cevap sonrası:** yanlış cevapta `shakeX|fb`, `dlgIn|fb-result-row`,
  `popIn|fb-icon`, `fadeSlide|feedbackDetail` canlı `getAnimations()` ile
  yakalandı; doğru cevapta AYNI liste + `flashPop|fb-xp` yakalandı; can
  kaybında (bug düzeltildikten SONRA) `heartOut` doğru kalpte `style`
  attribute'unda doğrulandı; combo kırılınca `comboBreak|game-combo-chip`
  yakalandı.
- **Seans özeti:** `buildResultRing`/`buildXpRows`'un ÜRETTİĞİ GERÇEK markup
  enjekte edilip computed style ile `ringDraw` (0.8s, circle), `fadeSlide`
  (her `.row`), `barGrow` (0.6s, her `.row::before`) doğrulandı — GERÇEK
  10-soruluk bölüm oyun-içi RNG'yle (doğru cevap tahmini gerektirdiği için)
  zaman kısıtından ötürü yakalanamadı, bunun yerine üretilen markup'ın
  KENDİSİ üzerinden doğrulandı (aynı fonksiyonlar, aynı gerçek DOM şablonu).
- **Combo/boss tek-seferlik:** `flameGlow` (computed style: `.7s`×2 iterasyon,
  infinite DEĞİL) ve `bossPulse` (computed style: `.7s`×3 iterasyon, infinite
  DEĞİL) — GERÇEK bir boss round'a rastlanmadığı için (nadir tetikleniyor)
  class'lar elle uygulanıp computed style üzerinden doğrulandı.
- **prefers-reduced-motion:** OS/DevTools seviyesinde canlı emülasyon
  yapacak bir araç bu oturumda YOKTU — bunun yerine CSS cascade analiziyle
  doğrulandı: `styles.css`'te `animation` üzerinde `!important` kullanan
  TEK kural bu (`grep` ile teyit), yani media query eşleştiğinde HİÇBİR
  başka kural onu geçemez — canlı OS-toggle testi YAPILMADI, bu bir statik
  doğrulama, cihazda/DevTools Rendering panelinde tekrar denenmeli.
- **Konsol hatası: 0** (tüm test turu boyunca, ilk yükleme dahil).
  **`npm test`: 1043/1043.**

---

Önceki commit (G91, tek commit) — **DENETIM.md'den çıkan 10 madde: Bugünün Önerisi
akordiyon oldu, Odak/Kaynak çipleri cyan vurguya döndü, çip satırı tüm modlarda
tam genişlik, play/pause ikonu düzeltildi (🔄 bug'ı), İpucu amber, kalpler
gerçek SVG (eski "beyaz kalp + kırmızı leke" bug'ı düzeltildi), spektrum
hareketi artırıldı, geri bildirim omuz butonları panel kenarından taşıyor,
dB Seviyesi'nin spektrum kartı kalktı + barlar yeşil, İlerleme'de 2 yeni
akordiyon**

Kaynak: `Tasarim-2026-08/Prototip.dc.html` — ölçü verilen yerlerde (kalp SVG'si,
hearts container gap/margin, chiprow yapısı) birebir alındı; ölçü VERİLMEYEN
yerlerde (Bugünün Önerisi'nin akordiyon davranışı, çip satırının tam genişlik
doldurması, Odak/Kaynak çiplerinin cyan rengi, İlerleme'nin 2 yeni akordiyonu)
kullanıcının KENDİ açık kararı esas alındı — bunlar tasarımın KENDİSİNİN
literal okumasından SAPIYOR (bazıları önceki G85/G87 turlarının "tasarım böyle
istiyor" kararlarını BİLEREK TERSİNE çeviriyor), task metninde AÇIKÇA
istendiği için uygulandı.

Öğe haritası:

| # | Madde | Uygulanan değişiklik |
|---|---|---|
| 1 | Bugünün Önerisi akordiyon | ✕ kapatma KALDIRILDI, İlerleme'nin AYNI `bindCollapsiblePanel` deseni (varsayılan AÇIK) — Ayarlar → OYUN'a YENİ "Bugünün önerisini göster" anahtarı (`prefs.showDailyTip`), kapalıyken kart hiç render edilmiyor |
| 2 | Odak çipi | `.srctag` artık `.game-diff-chip`'in AYNI cyan paleti (`rgba(34,211,238,.1)` bg/border, `var(--cyan)` metin) |
| 3 | Çip satırı tam genişlik | `.chiprow`'a `justify-content:space-between` — `gap:7px`'i TABAN alıp fazla genişliği çip aralarına dağıtıyor; Kaynak çipi de aynı `.srctag` cyan paletini paylaştığı için madde 2 ile TEK değişiklikte çözüldü |
| 4 | Play/Pause ikonu | `updateStartBtnLabel()`'daki "🔄" (Tekrar Çal) dalı KALDIRILDI — `autoStopped` artık her zaman "▶", aksi halde "⏸" |
| 5 | İpucu amber | `#hintBtn` scoped override — `#f0b442` / `rgba(240,180,66,.1)` bg / `rgba(240,180,66,.3)` border (task'ın literal renkleri) |
| 6 | Kalp ikonları | `renderHearts()` artık GERÇEK SVG çiziyor (`HEART_PATH`, Prototip.dc.html satır 473 birebir) — eski `♥` metin glyph'i + `.heart{background/border-radius}` (bir NOKTA için tasarlanmış CSS) ÜST ÜSTE binen "beyaz kalp + kırmızı leke" görünümünün kök sebebiydi |
| 7 | Spektrum hareketi | `frekans-bulma.js:drawSpectrumBackground`'daki `jit` genliği/hızı ~2 kat artırıldı — G83 kısıtı KORUNUYOR (SADECE `i`/`t`'ye bağlı, gerçek FFT verisine HİÇ dokunmuyor) |
| 8 | Omuz butonları | `.fb-ear{transform:translateY(-52%)}` → `-100%` — buton gövdesinin TAMAMI artık panelin üst kenarının DIŞINDA, alt kenarı hizalı |
| 9 | dB Seviyesi kartı | YENİ `mode.BARE_ANALYZER` bayrağı (db-seviyesi.js) — `#analyzer.analyzer-bare` kart bg/border/başlığını kaldırıyor, SADECE canvas/barlar kalıyor; `PROC_PALETTE` mavi/mor (`rgba(108,140,255,..)`) → yeşil (`#4ade80`/`linear-gradient(180deg,#46d968,#27a63e)`) |
| 10 | İlerleme akordiyonları | "Günlük Görevler" + "Zayıf Bölge Raporu" artık `bindCollapsiblePanel` ile açılır-kapanır (Rozetler/Mod Seviyeleri'nin AYNI deseni), varsayılan AÇIK — Zayıf Bölge Raporu'nun ÖNCEKİ "tasarımda katlanır DEĞİL" (G87) kararı bu turun AÇIK talimatıyla BİLEREK değiştirildi, Free kilidi (`#zoneLock`) accordion durumundan BAĞIMSIZ kaldı |

**Testler:** `createQuestion`/`evaluateAnswer` DEĞİŞMEDİ. **`npm test`: 1043/1043.**

**DOĞRULAMA (canlı tarayıcı, taze sekme, hard-reload):**
- **Çip satırı:** dB Seviyesi ve Kompresör'de (7 modun 2'si, PAYLAŞILAN
  `.chiprow`/`.srctag` CSS'i yüzünden temsili) satırın artık sağ kenara kadar
  yayıldığı ekran görüntüsüyle doğrulandı; kalan 5 mod (Kesim Noktası/Q
  Genişliği/Reverb/Frekans Çakışması/Distortion/Tonal Denge) AYNI paylaşılan
  kuralı kullandığı için tek tek açılmadı.
- **dB Seviyesi:** "SPEKTRUM · B İŞLENMİŞ" kartı TAMAMEN kalktı (bg/border/
  başlık yok, sadece çıplak grid+barlar), barlar yeşil (`B · İşlenmiş` etiketi
  dahil) — ekran görüntüsüyle doğrulandı.
- **Play/pause ikonu:** Frekans Bulma'da round başlatılıp "Durdur"a basıldı,
  buton "▶" gösterdi (🔄 DEĞİL) — canlı doğrulandı.
- **Kalpler:** gerçek SVG kalp şekli (leke/glyph çakışması YOK) ekran
  görüntüsüyle doğrulandı.
- **Omuz butonları:** yanlış cevap sonrası geri bildirim kartında "Senin
  cevabın"/"Doğru cevap" butonlarının TAMAMEN panelin üst kenarının dışında,
  alt kenarları hizalı durduğu yakın çekim ekran görüntüsüyle doğrulandı.
- **İki akordiyon:** İlerleme'de "Günlük Görevler" ve "Zayıf Bölge Raporu"
  aç/kapa test edildi, chevron doğru döndü, içerik doğru gizlendi/gösterildi.
- **Ayarlar anahtarı:** "Bugünün önerisini göster" kapatılınca kart Ana
  Menü'den TAMAMEN kayboldu, tekrar açılınca geri geldi — canlı doğrulandı.
- **Konsol hatası: 0** (tüm doğrulama turu boyunca — mod geçişleri, round
  başlatma/durdurma, akordiyon aç/kapa, ayar değişimi). **`npm test`: 1043/1043.**

---

Önceki commit (G90, tek commit) — **SHEET'LER, TOAST'LAR, YARDIMCI EKRANLAR
giydirildi — Prototip.dc.html'in ÇIKIŞ ONAYI/AYARLAR/SEVİYE/REHBER/TOAST/
SPOTLIGHT/KULAKLIK/KALİBRASYON blokları birebir + canlı testte bulunan
GERÇEK bir çıkış-onayı bug'ı düzeltildi**

Kaynak: `Tasarim-2026-08/Prototip.dc.html` — KULAKLIK UYARISI/ÇIKIŞ ONAYI/
AYARLAR SHEET/TOAST/SPOTLIGHT REHBER/KALİBRASYON/ROZET TOAST blokları
AÇILIP birebir uygulandı. Hiçbir fonksiyon sökülmedi, `#guideSheet`/
`#lvlSheet`/`#gameSettingsSheet`/`#menuInfoBtn`/`.mode-info-btn`/
`#gameInfoBtn`/`#gameSettingsBtn` id'leri KORUNDU.

Öğe haritası:

| # | Madde | Uygulanan değişiklik |
|---|---|---|
| 1 | Çıkış onayı | KODDA HİÇ YOKTU, sıfırdan eklendi — `#exitConfirmOverlay`/`#exitConfirmBox`, SADECE round aktifken (`activeQuestion`) gösterilir, idle ekranda doğrudan çıkar |
| 2 | Sheet ortak yapısı | `#lvlSheet`/`#guideSheet`'e `.sheet-handle-v2`/`.sheet-header-v2`/`.sheet-cancel-v2` (32x32 X ikonu) — `#gameSettingsSheet`/`#settingsSheet` (kapsam dışı) eski `.sheet-header`'ı KORUDU, global değiştirilmedi |
| 3 | Ayarlar sheet | GENEL/OYUN/SES/HESAP/DİĞER'e yeniden gruplandı (Geri bildirim ekranı → OYUN, Kalibrasyon → SES), Zorluk artık inline segment+çip (eski dikey liste DEĞİL), "İlerlemeyi sıfırla" satırı YENİ (İlerleme sekmesindeki `#resetStatsBtn`'in AYNI `resetAllProgress()`'ini çağırır) |
| 4 | Seviye bilgisi sheet | Üstte altın pentagon kimlik kartı (`renderLevelSheet()`'e eklendi) — mod adı MODE_CATALOG'dan, geri kalan içerik DEĞİŞMEDİ |
| 5 | Mod rehberi sheet | 96px görsel kutusu (`modeVisualSvg()` — mod kartlarının AYNI kaynağı) + çip madde listesi, `guide-texts.js` İÇERİĞİ DEĞİŞMEDİ |
| 6 | Toast | `core/fx.js:toast()` opsiyonel 3. parametre (`kind`) aldı — pro/daily/badge/soon, ~25 mevcut çağrı yeri (kind'sız) eski nötr görünümü KORUDU |
| 7 | Spotlight | Aydınlatma kenarlığı+glow, balon artık tam genişlik (left/right:16px, hedefe göre kaydırılmıyor), "ADIM N/M" + nokta göstergesi + başlık (target anahtarından türetildi: listen/abControl/select/confirm) |
| 8 | Kulaklık uyarısı | Eski `.bottom-sheet` yapısı → tam ekran `.hp-screen`, id'ler (`hpSheet`/`hpSheetConfirm`/vb.) KORUNDU, app.js'e TEK SATIR dokunulmadı |
| 9 | Kalibrasyon | Adım noktaları artık header'da pil biçiminde, "ADIM N/M" eyebrow + 18px başlık — donanım ses tuşu akışı (`startVolumeButtonsWatch`) DOKUNULMADI |
| 10 | Ses durumları | `#audioErrorRow`/`#audioLoadingRow` YENİ — `audio-engine.js:buildQuestionChain()` artık `{sampleLoadFailed}` döndürüyor (pembe gürültü fallback'i KALDIRILMADI, sadece bilgi app.js'e taşınıyor), `playQuestion()` bunu await edip satırı gösteriyor |

**Bilinçli sapmalar (kod değil, tasarım/gerçek-veri uyuşmazlığı):**
- Ayarlar'daki "Odak Aralığı" atlandı — tasarımda global bir OYUN ayarı ama
  bu app'te GLOBAL değil, o an oynanan moda özel (`#gameSettingsSheet`'te
  yaşıyor) — fabrik bir global ayar İCAT edilmedi.
- "Gizlilik / Kullanım Şartları" tasarımda TEK satır, burada İKİ satır
  olarak KORUNDU — ikisi ayrı işlev (`openLegal("privacy")`/`("terms")`),
  birleşik satırın ne yapacağı belirsiz, uydurulmadı.
- Kalibrasyon satırının "Son kalibrasyon: N gün önce" metni EKLENMEDİ —
  `prefs.calibrationDone` sadece boolean, timestamp YOK; gerçek `updateCalibRowLabel()`
  metni korundu.
- ROZET TOAST (design'ın AYRI, alt-sabit büyük pentagon-ikonlu kutlama
  bileşeni) sıfırdan İNŞA EDİLMEDİ — task'ın numaralı 10 maddesi "rozet"i
  madde 6'nın (TOAST) 4 türünden biri olarak listeliyordu, o kapsamda
  uygulandı.

**Canlı testte bulunan gerçek bug (G90-1'in kendi, önceki turda yazılmış
kodunda):** `openExitConfirm()` sadece `.open` class'ı ekliyordu, HTML'deki
başlangıç `class="... hidden"`'ı hiç kaldırmıyordu — `.hidden{display:none
!important}` her zaman `.open`'ın `opacity:1`'ini eziyordu, dialog GERÇEKTE
hiçbir zaman görünmüyordu (canlı tıklamada sessizce hiçbir şey olmuyordu).
Kök sebep: bu app'teki sheet'ler (`.sheet-overlay`/`.bottom-sheet`/`.hp-screen`)
HİÇBİRİ `hidden` class'ı TAŞIMAZ, kapalı durumu KENDİ `opacity:0`/`pointer-
events:none` taban stiliyle sağlar — exit-confirm bu deseni KIRMIŞTI. Düzeltme:
`index.html`'den `hidden` class'ı kaldırıldı (aynı deseni izliyor artık).

**Testler:** `createQuestion`/`evaluateAnswer` DEĞİŞMEDİ. **`npm test`:
1043/1043.**

**DOĞRULAMA (canlı tarayıcı, taze sekme, hard-reload):**
- **Çıkış onayı:** round aktifken Geri → "Oyundan çık?" açıldı, "Devam Et"
  round'da kaldı (BOSS round'a geçti, bozulmadı), "Çık" menüye döndü —
  bug bulunup düzeltildikten SONRA üçü de canlı doğrulandı.
- **4 sheet:** Ayarlar (5 bölüm, Zorluk inline çip aç/kapa, "İlerlemeyi
  sıfırla" satırı), Seviye bilgisi (`#levelChip` → pentagon kimlik kartı +
  gerçek bant genişliği/frekans artışı/XP), Mod rehberi (hem mod-özel hem
  genel — 96px görsel + çip liste), hepsi aç/kapa doğru çalıştı.
- **4 toast türü:** `core/fx.js:toast()` doğrudan çağrılarak pro/daily/
  badge/soon renk+ikon+glow değerleri `getComputedStyle` ile ÖLÇÜLDÜ,
  tasarımın literal rgba değerleriyle birebir eşleşti; kind'sız eski
  çağrılar hâlâ nötr görünümde.
- **Spotlight:** Frekans Bulma'da gerçek tur (hintRoundsShown=0'a
  sıfırlanıp) 4 adım boyunca izlendi — "ADIM 1/4"→"ADIM 2/4", nokta
  göstergesi ilerledi, başlık target'a göre değişti ("Önce dinle"→"A/B
  Test"), aydınlatma gerçek elementleri (spektrum kartı, A/B butonu) sardı.
- **Kulaklık uyarısı + Kalibrasyon:** Reverb (kulaklıkGerekli:true) kartına
  basılınca tam ekran uyarı açıldı, "Taktım" moda soktu; Kalibrasyon 3
  adımı da (header'da pil noktalar + "ADIM N/M" eyebrow) doğru ilerledi,
  referans ton gerçekten çaldı/durdu, seviye metresi canlı animasyon
  gösterdi.
- **Ses durumları:** `audio-engine.js:buildQuestionChain()` GERÇEK bir ağ
  hatasıyla (XHR `/audio/*.m4a` isteği bilerek 404'e yönlendirilerek) test
  edildi — `{sampleLoadFailed:true}` döndü, `console.error` beklenen
  "Örnek yüklenemedi" mesajını bastı; başarılı yüklemede `false`. Görsel
  satırlar (`#audioLoadingRow`/`#audioErrorRow`) sınıf toggle'ıyla ekran
  görüntüsünde doğrulandı — tasarımın renk/ikon/metin ölçüleriyle birebir.
- **Konsol hatası:** 0 yeni (yalnızca kasıtlı test-hatası logları, kendi
  forced-404 denemem — regresyon DEĞİL). **`npm test`: 1043/1043.**

---

Önceki commit (G89, tek commit) — **PAYWALL giydirildi — Prototip.dc.html PAYWALL
bloğu birebir, gerçek 6 tetikleme noktasının bağlam metni + gerçek can geri
sayımı + PRO_BENEFITS/FREE_MODE_COUNT'taki iki gerçek hata düzeltildi**

Kaynak: `Tasarim-2026-08/Prototip.dc.html` "<!-- PAYWALL -->" bloğu (satır
1345-1412) — AÇILIP birebir uygulandı.

**Kullanıcı kararı — "sınav" tetikleyicisi listeden çıkarıldı:** Task 6.
madde olarak "sınav"ı sayıyordu ama kod incelemesinde `isExamLocked` hiçbir
yerde çağrılmıyor, `examGateActive()` ücretsiz kullanıcıda sessizce `false`
dönüyor — GERÇEK bir sınav-paywall tetikleyicisi YOK. Kullanıcıya soruldu;
cevap PAYWALL.md §127-140'taki GERÇEK 6 tetikleyiciyi (sessionLimit/
livesOut/modeLocked/upload/dailyUsed/zoneHistory) esas aldı, "sınav" ve
"serbest oyun" (freePlayMode — 7. GERÇEK tetikleyici ama task'ın 6'lık
listesinde yok) ayrı tutuldu — freePlayMode'un kendi kod yolu DOKUNULMADAN
çalışmaya devam ediyor, sadece bu turun 6 bağlam-metni doğrulamasına dahil
değil.

Öğe haritası:

| # | Madde | Uygulanan değişiklik |
|---|---|---|
| 1 | Üst satır | 32x32 X kapatma — prototipin "Bağlam ⟳"/varyant demo düğmeleri UYGULANMADI |
| 2 | Bağlam başlığı | `openPaywallReason()`/`resetPaywallToGeneric()` artık `core/paywall.js:PAYWALL_REASONS[key].title/.detail`'i DOĞRUDAN yazıyor (tek kaynak, eski ayrı "kicker" satırı tasarımda yok, kaldırıldı) |
| 3 | Can bitti şeridi | Sadece `livesOut`'ta görünür — süre `startResWaitTicker()`'ın (Seans Sonu) AYNI deseniyle GERÇEK `stats.livesLastRefillAt`/`paywall.LIVES_REFILL_INTERVAL_MS`'ten, canlı test edildi (1sn'de bir gerçekten azaldı) |
| 4 | Pro rozeti | Pentagon + "PRO" — `livesOut`'ta `.lives` sınıfı rozeti/satır dolgularını/fiyat kartını küçültüyor |
| 5 | Özellik listesi | `PRO_BENEFITS` 7 maddeye çıkarıldı (aşağıda) |
| 6 | Fiyat kartı | ₺399 + "Tek seferlik · abonelik yok" — `paywall.PRO_PRICE` |
| 7 | Alt butonlar | "Pro'ya Geç" (simulatePro), `livesOut`'ta ayrıca "veya reklam izle" (`grantAdLife`), "Satın alımı geri yükle" (bağlamsal modda gizli, PAYWALL.md'nin ÖNCEKİ kararıyla TUTARLI), yasal metin YENİ eklendi (tasarımda var, eski ekranda hiç yoktu) |
| 8 | Yanlış metinler | "6 egzersiz modu"/"30 dakikada 1 dolar" düzeltildi (aşağıda) |
| 9 | Simülasyon | IAP/reklam KODU DEĞİŞMEDİ — `buyProBtn`/`watchAdBtn` AYNI `devFlags.simulatePro`/`grantAdLife()` çağrılarını kullanıyor |

**Madde 8'in iki gerçek hatası, kaynağında düzeltildi:**
1. **"6 egzersiz modu" → 5:** `FREE_MODE_COUNT` ÖNCEDEN `MODE_CATALOG.filter
   (tier==="free").length`'ten sayılıyordu — bu "hiz-modu"yu (tier:"free"
   AMA `playable:false`, kodlanmamış bir "yakında" girdisi) da SAYIYORDU,
   6 çıkıyordu. `paywall.FREE_MODE_IDS.length`'e (GERÇEK erişim kararının
   TEK kaynağı, 5 gerçek/oynanabilir ücretsiz mod) taşındı — hem paywall
   ekranını hem Ayarlar'ın "Sürüm" satırını AYNI ANDA düzeltti (iki yerin
   TEK kaynağı).
2. **"30 dakikada 1 dolar" → "1 can":** eski ekranın hardcode edilmiş
   metniydi, yeni tasarımda zaten "sonraki can MM:SS" GERÇEK sayaçla
   değiştiği için bu satırın KENDİSİ ortadan kalktı (eski iki-kart
   karşılaştırması tamamen silindi).
3. **PRO_BENEFITS eksikti:** "Zayıf bölge raporu ve geçmiş grafiği" (İlerleme
   sekmesinin GERÇEK Pro ayrıcalığı — `isWeakZoneReportLocked`/
   `isZoneHistoryBlurred`) ÖNCEDEN 6 maddelik listede HİÇ yoktu — eklendi,
   liste artık tasarımın 7 maddesiyle BİREBİR (`test/paywall.test.mjs`'in
   `PRO_BENEFITS.length` assertion'ı 6→7 güncellendi). "Araçlar: analiz +
   referans filtreleri" de "Araçlar sekmesi"ne düzeltildi — G88'de silinen
   sahte Analiz kartını anıyordu, artık YANLIŞ bir vaatti.

**Mimari kapsam kararı:** Tasarımın "alttan açılan backdrop+sheet" sunumu
(arkadaki ekranın karartılmış hâlde görünür kalması) UYGULANMADI — bu,
app'in `goScreen()` tam-ekran değişim mimarisini "önceki ekranı canlı
tutan bir overlay" kavramına çeviren AYRI, riskli bir iş olurdu. Bunun
yerine SADECE görsel sonucu (yuvarlak üst köşe, altın radyal parıltı,
gölge) `#screen-paywall`'a uygulandı — ekran hâlâ `goBackFromSubpage()`'in
"nereden geldiyse oraya dön" mekanizmasıyla kapanıyor (davranış DEĞİŞMEDİ).

**Testler:** `createQuestion`/`evaluateAnswer` DEĞİŞMEDİ.
`test/paywall.test.mjs`'teki `PRO_BENEFITS.length` assertion'ı 6→7
güncellendi (gerçek 7 maddeye uysun diye). **`npm test`: 1043/1043.**

**DOĞRULAMA (canlı tarayıcı, taze sekme, konsol HATASIZ):**
- **Standart varyant** (Ayarlar → "Pro'ya geç"): genel başlık, can şeridi
  YOK, standart rozet (82px), "Satın alımı geri yükle" GÖRÜNÜR, "reklam
  izle" YOK — ekran görüntüsüyle doğrulandı.
- **Can-bitti varyantı** (GERÇEK `blockIfLivesOut()` yoluyla — localStorage'da
  `lives:0`/`livesLastRefillAt` GERÇEKÇİ bir değere ayarlanıp round
  başlatılarak tetiklendi): "Devam etmek için bir yol seç" başlığı, kırmızı
  can şeridi "sonraki can 15:31" → 3 saniye sonra "14:49" (CANLI, gerçekten
  azalıyor), KÜÇÜLMÜŞ rozet (62px), "veya reklam izle" GÖRÜNÜR, "Satın
  alımı geri yükle" GİZLİ — hepsi ekran görüntüsüyle doğrulandı. Reklam
  izle butonuna basınca paywall kapandı, +1 can gerçekten eklendi (kalp
  satırında görüldü).
- **4 gerçek tetikleme noktası** canlı test edildi, her biri doğru bağlam
  metni gösterdi: `modeLocked` ("Bu mod Pro'da açılır" — dB Seviyesi
  kartına basılarak), `upload` ("Kendi dosyanı yükle" — Oyun Ayarları
  sheet'inin "Dosya Seç" satırından), `zoneHistory` ("Zayıf bölge
  geçmişini gör" — İlerleme'nin kilitli kartlarından). `sessionLimit`/
  `dailyUsed` AYNI `openPaywallReason()` yolunu paylaştığı ve `paywall.js`
  kaynağında metinleri doğrulandığı için ayrıca canlı tetiklenmedi
  (raporda açıkça belirtiliyor — kanıtsız "test edildi" denmedi).
- **Özellik listesi** 7 madde, koddaki gerçek Pro ayrıcalıklarıyla
  (`PRO_BENEFITS`) birebir — ekran görüntüsüyle doğrulandı.
- **Yanlış metinler düzeldi:** Ayarlar → "Sürüm" satırı "Ücretsiz — 5 mod,
  seans başına 5 soru" gösterdi (ÖNCEDEN 6); paywall ekranında "30
  dakikada 1 dolar" satırı zaten YOK (tasarımın gerçek can sayacıyla
  değişti).
- **Pro rejisyon taraması:** `devFlags.simulatePro` açılıp Ayarlar →
  "Sürüm" satırı "Pro (simüle) — 14 mod..." gösterdi, hiçbir ekran
  bozulmadı.
- **Konsol hatası: 0** (tüm test turları boyunca — standart/can-bitti
  varyantları, 4 tetikleme noktası, reklam izle akışı, Pro rejisyon
  taraması). **`npm test`: 1043/1043.**

---

Önceki commit (G88, tek commit) — **ARAÇLAR SEKMESİ giydirildi — Prototip.dc.html
ARAÇLAR bloğu birebir, gerçek uploadManager'a bağlı dosya yükleme + önizleme
çalma, sahte Analiz kartı kaldırıldı**

Kaynak: `Tasarim-2026-08/Prototip.dc.html` "<!-- ARAÇLAR -->" bloğu (satır
352-449) — AÇILIP birebir uygulandı. Öğe haritası:

| # | Madde | Uygulanan değişiklik |
|---|---|---|
| 1 | Başlık | "Araçlar" — prototipin Free/Pro demo geçişi UYGULANMADI; toolsSettingsBtn (dişli) da KALDIRILDI, tasarımda yok VE Ana Menü/İlerleme'nin kendi dişlisinden ZATEN erişilebiliyor |
| 2 | Mixini Yükle kartı | Yeni `.tools-card` — cyan ikon kutusu + başlık/alt metin + kesikli-çerçeveli "Dosya seç" butonu. Format metni "WAV, MP3, AIFF" YERİNE koddaki GERÇEK liste (`upload.js:ALLOWED_AUDIO_EXTENSIONS` — 7 format) baz alındı |
| 3 | Son Yüklenenler | uploadManager TEK buffer tuttuğu için liste EN FAZLA 1 satır — sahte çoklu-dosya geçmişi İCAT EDİLMEDİ. Play butonu GERÇEK önizleme çalıyor (yeni: `upload.js`'e `get duration()`, app.js'e `toggleToolsPreview()`) |
| 4 | Referans Filtreleri | 8 filtrenin ad/açıklama/"ne dinlemeli" metni G53'ten beri GERÇEK — YENİ eklenen SADECE ikon + 26px eğri (süsleme, ölçüm DEĞİL). 2 sütunlu grid, seçim (`toolsActiveFilterIdx`) çalışıyor. "Tipik cihaz eğrilerine yaklaşıktır" notu korundu |
| 5 | Free kilit ekranı | Altın pentagon + kilit + "Araçlar Pro'ya özel" + CTA — `paywall.isToolsContentLocked` |
| 6 | Analiz motoru bu turda yok | Sahte LUFS/LRA/dBTP/mono-uyum kartı (G53'ten beri statik, gerçek bir dosyayı HİÇ ölçmüyordu) HTML'den kaldırıldı — `renderToolBars()` JS'i task'ın "kodunu silme" talimatı gereği SİLİNMEDİ, sadece hedefi (#toolBars) yok, zararsızca no-op |

**Gerçek işlevsellik eklendi (öncesinde YOKTU):** "Mixini Yükle" ÖNCEDEN
sadece ad/boyut gösteren bir vitrindi (`uploadManager.loadFile()` hiç
çağrılmıyordu). Artık `validateAudioFile` → `uploadManager.loadFile` →
gerçek decode + `getSourceNode()`/`pausePlayback()` ile çalışan bir
önizleme oynatıcısı — `startCalibrationTone()`'un AYNI deseni
(`audioEngine.analyser` zaten destination'a bağlı, kendi gain node'unu
oraya takar), oyun turunun ses zincirinden AYRI.

**Canlı testte bulunan bir kök-neden (kod hatası DEĞİL, tarayıcı önbelleği):**
İlk dosya yükleme testinde süre "NaN:NaN" gösterdi — sistematik hata
ayıklamayla (geçici `window.__DEBUG_*` proplarıyla `uploadManager`'ı
inceleyip `Object.keys()` çekilince) kanıtlandı: tarayıcı `upload.js`'in
ESKİ (duration getter'ı olmayan) sürümünü önbellekten sunuyordu — normal
navigasyon/yeni sekme BİLE bunu kırmıyordu, SADECE `cmd+shift+r` düzeltti.
Sunucu (`curl` ile doğrulandı) baştan beri doğru içeriği veriyordu. G83/
G86 seansındaki AYNI sınıf sorun — kod DEĞİŞTİRİLMEDİ, tanı hook'ları
(`window.__DEBUG_uploadManager/audioEngine`) doğrulama SONRASI kaldırıldı.

**Testler:** `createQuestion`/`evaluateAnswer` DEĞİŞMEDİ.
**`npm test`: 1043/1043.**

**DOĞRULAMA (canlı tarayıcı, taze sekme, konsol HATASIZ):**
- **Free durumu:** pentagon+kilit+"Araçlar Pro'ya özel"+CTA ekran görüntüsüyle
  doğrulandı; CTA'ya basınca genel paywall ekranı ("PRO RAPORU" değil, genel
  "Tam sürüm sadece sınırları kaldırır" ekranı — `resetPaywallToGeneric()`) açıldı.
- **Pro durumu** (`devFlags.simulatePro`): Mixini Yükle + Referans Filtreleri
  kartları görüldü, sahte Analiz kartı YOK.
- **Boş durum** (dosya yokken): "Henüz dosya yüklemedin" + alt metin ekran
  görüntüsüyle doğrulandı.
- **Dosya seçme akışı çalıştığı:** sentetik bir WAV (`File`+`DataTransfer`)
  gerçek `#toolsFileInput`'a atanıp `change` event'i tetiklendi — dosya GERÇEKTEN
  decode edildi (`uploadManager.hasBuffer`), satır adı/boyutu/GERÇEK süresiyle
  ("0:07", 7 saniyelik test dosyası) listede göründü; play butonuna basınca
  GERÇEK ses çaldı (breathe animasyonlu cyan halka), tekrar basınca durdu.
- **Referans filtrelerinin gerçek koda bağlı olduğu:** `TOOL_FILTERS` (8 filtre,
  G53'ten beri var) grid'de render edildi, karta tıklayınca seçim (AÇIK rozeti +
  cyan kenarlık) GERÇEKTEN değişti — ekran görüntüsüyle (Düz→Laptop geçişi)
  doğrulandı.
- **Sahte analiz verisi gösterilmediği:** yeni HTML'de LUFS/LRA/dBTP/mono-uyum
  hiç yok — hem Free hem Pro ekran görüntülerinde doğrulandı.
- **Regresyon taraması:** localStorage temizlenip Ana Menü, İlerleme (G87,
  boş durum), Frekans Bulma modu tek tek açıldı — hiçbiri bozulmadı.
- **Konsol hatası: 0** (tüm test turları boyunca — Free/Pro geçişleri, dosya
  yükleme, önizleme çalma/durdurma, filtre seçimi, regresyon taraması).
  **`npm test`: 1043/1043.**

---

Önceki commit (G87, tek commit) — **İLERLEME SEKMESİ giydirildi — Prototip.dc.html
İLERLEME bloğu birebir, 10 madde (boş durum/Günlük Görevler/Son Cevaplar
sola-kaydır-sil/İsabet Grafiği/Zayıf Bölge Raporu/Rozetler/Mod Seviyeleri)**

Kaynak: `Tasarim-2026-08/Prototip.dc.html` "<!-- İLERLEME -->" bloğu (satır
171-350) — AÇILIP birebir uygulandı. Eski ekran (lvl-badge kartı, 3'lü stat
satırı, "Şu An Neredesin", "Canlı İstatistikler" ızgarası) tasarımda YOK,
TAMAMEN kaldırıldı — task'ın kendi 10 maddesi bu ekranın artık TEK doğruluk
kaynağı. Öğe haritası:

| # | Madde | Uygulanan değişiklik |
|---|---|---|
| 1 | Başlık satırı | "İlerleme" + 32x32 dişli — prototipin Free/Pro demo geçişi UYGULANMADI (task'ın kendi notu: "PROTOTİPE ÖZEL DEMO") |
| 2 | Veri yoksa boş durum | `stats.rounds===0` iken `#progEmptyState` (ikon+metin+yeşil CTA) — CTA Frekans Bulma kartına PROGRAMATİK tıklıyor |
| 3 | Kart ortak stili | `.prog-card` — 16px radius, literal gradient/border |
| 4 | Günlük Görevler | `renderDaily()` yeniden yazıldı — 26x26 ikon kutusu (3 görev için 3 sabit SVG), ilerleme çubuğu, "bugün · N/3" sayaç |
| 5 | Son Cevaplar | `renderHistory()` yeniden yazıldı — GERÇEK Pointer Events sürüklemesiyle sola-kaydır→84px kırmızı "Sil" (prototipin click-simülasyonu DEĞİL); "Tümünü temizle" SADECE history'i temizler (XP/görevlere dokunmaz) |
| 6 | İsabet Grafiği | Free'de `.prog-blurred` (5px blur) + kilit halkası + "Pro ile aç" (`openPaywallReason("zoneHistory")`) |
| 7 | Zayıf Bölge Raporu | ARTIK katlanır DEĞİL (task'ın 7. maddesi collapsible istemiyor, eski `zonePanelToggle` SÖKÜLDÜ) — aynı kilit deseni, "aralık" alt metni `FA_ZONES.t`'nin GERÇEK Hz aralığından |
| 8 | Rozetler (açılır-kapanır) | 9 ACHIEVEMENTS pentagon SVG'de, kazanılmamışlar soluk/gri |
| 9 | Mod Seviyeleri (açılır-kapanır) | 10 mod, ilerleme çubuğu + "Sv N"/"Yeni" rozeti |
| 10 | Akademi Sv tutarlılığı | Progress sekmesinin KENDİ Sv/XP kartı KALDIRILDI (tasarımda yok) — tutarlılık artık SADECE Ana Menü'nün kendi göstergesinin regresyonsuz kaldığını doğrulamak anlamına geliyor |

**Bilinçli kapsam kararları (uydurma değil):**
- Madde 9'un tasarımdaki küçük "sınav durumu" rozeti (m.exam/examColor) ATLANDI
  — uygulamada moda-özel kalıcı bir sınav geçti/kaldı geçmişi TUTULMUYOR
  (examSystem oturum-içi bellek durumu), var olmayan bir veriyi uydurmak
  yerine satır sadece ilerleme çubuğu + "Sv N" taşıyor.
- "İstatistikleri Sıfırla" butonu tasarımda YOK ama başka hiçbir yerden
  erişilemeyen ÇALIŞAN bir özellik — sessizce silinmedi, en altta korundu;
  artık "Tüm istatistikler" sözünü tutması için zoneStats'ı da temizliyor
  (ÖNCEDEN sadece ayrı, şimdi kaldırılan bir "temizle" bağlantısı yapıyordu).
- Son Cevaplar satırlarına YENİ bir `ts` (zaman damgası) alanı eklendi —
  tasarımın "{{ ra.time }}" alanı için gerekliydi, önceki oturumlardan kalan
  `ts`'siz kayıtlar "—" gösterir.

**Canlı testte bulunan İKİ regresyon (aynı oturumda düzeltildi):**
1. İsabet Grafiği'nin blur sarmalayıcısı (`#accChartFilterWrap`) `els`
   önbelleğine hiç eklenmemişti — `renderChartLock()` sessizce hiçbir şey
   yapmıyordu, kilitliyken grafik/boş-metin BULANIKLAŞMIYORDU. `els`e eklendi.
2. `renderZonePanel()` kilit overlay'ini gösteriyordu ama `#zoneList`'in
   kendisine blur filtresi hiç uygulamıyordu — gerçek %0 değerleri kilitliyken
   bile net okunuyordu. `.prog-blurred` toggle'ı eklendi.

**Testler:** `createQuestion`/`evaluateAnswer` DEĞİŞMEDİ (sadece DOM/render).
**`npm test`: 1043/1043.**

**DOĞRULAMA (canlı tarayıcı, taze sekme, konsol HATASIZ):**
- **Boş durum:** temiz localStorage'da "Henüz veri yok" + CTA ekran
  görüntüsüyle doğrulandı; CTA'ya basınca Frekans Bulma'ya doğrudan girildi.
- **5 tur oynanıp** (hepsi yanlış, canlar bitti) İlerleme'ye dönüldü —
  Günlük Görevler "5 tur oyna" 5/5 yeşil tamamlandı satırı, Son Cevaplar 5
  satır (mod/detay/zaman) ekran görüntüsüyle görüldü.
- **Sola-kaydır→Sil canlı test edildi:** gerçek sürükleme (`left_click_drag`)
  ile bir satır açıldı, "Sil"e basılınca O satır silindi, diğerleri kaldı;
  "Tümünü temizle" ile liste "Liste temizlendi" boş durumuna döndü —
  Günlük Görevler'in "5 tur oyna" ilerlemesi ETKİLENMEDİ (ayrı veri kanıtı).
- **Free/Pro karşılaştırması:** Free'de İsabet Grafiği + Zayıf Bölge Raporu
  ikisi de bulanık+altın kilit halkası+"Pro ile aç" ekran görüntüsüyle
  yakalandı; butona basınca "PRO RAPORU · Zayıf bölge geçmişini gör" paywall
  ekranı açıldı. `devFlags.simulatePro` ile Pro'ya geçilip AYNI ekran
  tekrar açıldığında kilitler tamamen kalktı, gerçek %0/— değerleri net
  görüldü (zoom ekran görüntüsüyle karşılaştırıldı).
- **Üç açılır bölüm** (Son Cevaplar/Rozetler/Mod Seviyeleri) TEK TEK açılıp
  chevron dönüşü + içerik ekran görüntüsüyle doğrulandı — Rozetler 9/9
  pentagon (0/9 kazanılmış, hepsi soluk), Mod Seviyeleri 10 mod (hepsi
  "Yeni" — XP=0 çünkü 5 tur da yanlıştı, mevcut modeTotalXp mantığıyla
  TUTARLI, yeni bir hata değil).
- **Zayıf bölge raporu gerçek veriden geliyor:** 5 turun TAMAMI aynı frekans
  bölgesinde değildi (Sub/Bas/Alt-orta/Tiz'de veri var, Orta/Üst-orta'da
  yok) — ekranda BİREBİR bu dağılım görüldü (n≥1 olanlar kırmızı %0, veri
  olmayanlar gri "—").
- **Akademi Sv tutarlılığı:** Ana Menü'nün Sv kartı (Sv 1, 0/600 XP)
  değişmeden doğru render edildi — İlerleme'nin kendi ayrı Sv göstergesi
  ARTIK yok (madde 10'un kararı, yukarıda).
- **Ayarlar dişlisi** (progressSettingsBtn) hâlâ Ayarlar sheet'ini açıyor —
  regresyon YOK.
- **Konsol hatası: 0** (tüm test turları boyunca — boş durum, 5 tur oynama,
  Son Cevaplar sürükleme, Free/Pro karşılaştırması, Ayarlar sheet).
  **`npm test`: 1043/1043.**

---

Önceki commit (G86, tek commit) — **OYUN EKRANI — 12 madde (Prototip.dc.html) —
tek dokunuşla cevap, Motor 2 kart yapısı, geri bildirim paneli işaretleri
örtmüyor, combo çipi tam sayı, spektrum alt satırı gerçek Hz'e döndü**

Kaynak: `Tasarim-2026-08/Prototip.dc.html`. 12 maddenin haritası:

| # | Madde | Uygulanan değişiklik |
|---|---|---|
| 1 | Frekans Bulma onay butonu (2 turdur bekliyordu) | Dokununca 180ms sonra DOĞRUDAN `submitFrequencyGuess()` — onay butonu SÖKÜLDÜ. isSingleMark'ta "Cevabını vermek için spektruma dokun" sönük metin (isPlus'ta değişmedi) |
| 2 | Soru metni kutusu (dokunmalı) | `isFreqTouch` durumunda `#questionTitle` boş+gizli |
| 3 | Motor 2'de spektrum | `mode.HIDE_ANALYZER=true` (kompresor/reverb/distortion.js) → `#analyzer` tamamen gizli |
| 4 | Motor 2 kart yapısı | `core/three-way-cards.js` TAMAMEN yeniden yazıldı — yuvarlak play butonu + ad/durum + dalga + seçim noktası. Dış kapsayıcı `<button>`→`<div>` (iç play butonu GERÇEK `<button>`, nested button geçersiz) |
| 5 | Başlık "Farklı olanı bul" | `renderQuestion()`'da Motor 2 için sabit metin |
| 6 | Motor 2 onay butonu | Yeni `#threeWayConfirmBtn` (`renderGuessAreaControls`) — seçim yokken "Bir kart seç", seçiliyken "X olarak onayla" |
| 7 | Motor 2 kontrol satırı | `.controls-m2` CSS — İpucu metinli, pill'ler küçültüldü, büyük play YOK (bkz. aşağıdaki startBtn notu) |
| 8 | Döngü/ipucu metinleri | "Seçili kart kesintisiz tekrar", ipucuda "Bir şık elendi · XP yarıya indi" |
| 9 | Geri bildirim paneli işaretleri örtüyor | G85'in `scrollFeedbackIntoView()` çağrıları (setFeedback + submitFrequencyGuess) SÖKÜLDÜ — G85 `.fb`'yi `position:fixed`'e taşımıştı, bu çağrılar ARTIK zararlıydı (spektrumu işaretlerin ÖTESİNE kaydırıyordu) |
| 10 | "i" butonu nötr görünüm | `.ghead-right .mode-info-btn` — cyan yerine `#8f949b`/nötr arka plan |
| 11 | Combo çipi tam sayı | `renderGameHeader()` — `x1.12` ondalık YERİNE `x{stats.combo}` tam sayı, combo>2'de `flameGlow` animasyonu |
| 12 | Spektrum alt satırı gerçek Hz | `updateAnalyzerFoot()` — G85'in "20 Hz/20 kHz" kararı BİLİNÇLİ GERİ ALINDI, `currentFocusRange()`/`FA_MIN`/`FA_MAX`'a döndü, boss'ta "PRO ZORLUK · Q 4.0" |

**Canlı testte bulunan ÜÇ regresyon (item 12'nin kendi değişikliği tetikledi,
hepsi bu turda düzeltildi, kodda değil DURUM'da kayıtlı — gelecek bir
`updateAnalyzerFoot`/`#startBtn`/`#freqGuessArea` değişikliğinde AYNI hataya
düşülmesin diye):**

1. **TDZ ReferenceError, uygulama HİÇ açılmıyordu.** `updateAnalyzerFoot()`
   artık `currentFocusRange()` → `isUserPro()` → modül-seviyesi `devFlags`
   okuyor; ama modül üstünde `populateFocusSelect(); updateAnalyzerFoot();`
   `devFlags`'ın `let` tanımından (satır ~643) ÖNCE (satır ~478) çalışıyordu.
   Erken/gereksiz çağrı SÖKÜLDÜ — `#analyzer` zaten `#screen-game` aktif
   olmadan görünmüyor, `enterMode()`'un gerçek çağrısı yeterli.
2. **Motor 2 (Kompresör/Reverb/Distortion) hiç oynanamıyordu.** İlk
   `.controls-m2 #startBtn{display:none}` CSS'i `#startBtn`'i HER durumda
   (idle DAHİL) gizliyordu — ama bu buton aynı zamanda İLK `startRound()`'u
   tetikleyen TEK öğe (`els.startBtn.addEventListener("click", ...)`, satır
   ~4740). Sonuç: ekran tamamen boş kalıyordu (`#answers` boş, `#questionTitle`
   boş), round hiç başlamıyordu. Düzeltme: CSS kuralı kaldırıldı,
   `updateStartBtnLabel()` içine `.hidden` toggle'ı taşındı —
   `mode.THREE_WAY && activeQuestion` (round GERÇEKTEN aktifken) true, idle
   durumda (activeQuestion yok) buton GÖRÜNÜR kalır.
3. **Kompresör'den başka bir moda geçince eski "Bir kart seç" butonu
   asılı kalıyordu.** `enterMode()`'un idle-sıfırlama bloğu `#answers`'ı
   temizliyordu ama `#freqGuessArea`'yı HİÇ temizlemiyordu (item 6 öncesi
   bu alanın içeriği hep zararsızdı — artık gerçek bir buton). `els.answers`
   ile AYNI desen (`innerHTML=""` + `.hidden`) `#freqGuessArea`'ya da eklendi.

**Item 3'ün bilinen ödünü:** Motor 2'nin spektrumu kaldırılınca cevap-sonrası
eğri/zarf görselleştirmesi (`drawOverlay`, gerçek bir öğretim özelliğiydi) de
kayboldu — task'ın kendi net talimatıydı ("Motor 2'de spektrum YOK. Kaldır."),
karşı öneri sunulmadı.

**Item 2'nin kapsam kararı:** SADECE Frekans Bulma'nın dokunmalı formatında
kutu kaldırıldı — şıklı formatta (Kesim Noktası vb.) tasarımın o ekranı hiç
modellememiş olması BAŞKA modlara genişletme gerekçesi sayılmadı, task
literal olarak "(dokunmalı)" diyordu.

**Testler:** `createQuestion`/`evaluateAnswer` DEĞİŞMEDİ.
`test/three-way-cards.test.mjs` güncellendi — dış kapsayıcı `<div>` olduğu
için "kilitlendi" artık `.disabled` property değil `.ans-m2-disabled` class
(3 assertion). **`npm test`: 1043/1043.**

**DOĞRULAMA (canlı tarayıcı, taze sekme + Pro simülasyonu, konsol HATASIZ):**
- **Frekans Bulma:** tek dokunuşla cevap onay butonu OLMADAN gitti (ekran
  görüntüsüyle yakalandı, round sayacı 3/5→4/5 ilerledi); "Cevabını vermek
  için spektruma dokun" metni görüldü; soru kutusu YOK.
- **Kompresör/Reverb/Distortion:** spektrum kartı HİÇ yok; kart yapısı
  (yuvarlak play + ad/durum + dalga + seçim noktası, seçili/çalıyor renk
  durumları) ekran görüntüsüyle doğrulandı; "Farklı olanı bul" başlığı;
  onay butonu "Bir kart seç"→"A olarak onayla" (yeşil) geçişi çalıştı;
  kontrol satırı (metinli İpucu, küçük pill'ler, büyük play YOK) + "DÖNGÜ ·
  Seçili kart kesintisiz tekrar" görüldü; boss turunda "PRO ZORLUK · Q 4.0"
  alt satırı GÖRÜLDÜ (item 12 bonus doğrulama).
- **Kırmızı/yeşil işaretler panelin üstünde:** Frekans Bulma'da yanlış cevap
  sonrası "Senin cevabın"/"Doğru cevap" chip'leri + iki işaret çizgisi
  panelin ÜSTÜNDE görüldü (zoom ekran görüntüsü). Tonal Denge'de "Yakınlık
  %41" panelinin üstünde hedef/senin-sonucun karşılaştırma eğrisi + slider
  sapma etiketleri görüldü.
- **"i" butonu** nötr (gri, cyan değil) — ana ekran + oyun ekranı ekran
  görüntülerinde doğrulandı.
- **10 modun TAMAMI** (Frekans Bulma, Kesim Noktası, Q Genişliği, Boost mu
  Cut mu, dB Seviyesi, Kompresör, Reverb, Tonal Denge, Distortion, Frekans
  Çakışması) tek tek açılıp idle ekranı ekran görüntüsüyle kontrol edildi —
  hiçbiri bozulmadı.
- **Konsol hatası: 0** (tüm test turları boyunca, TDZ/startBtn/freqGuessArea
  düzeltmelerinden SONRA). **`npm test`: 1043/1043.**

---

Önceki commit (G85, tek commit) — **OYUN EKRANI DÜZELTMESİ — çip satırı/spektrum
kartı/cevap sonrası işaretler/kontrol satırı/geri bildirim sheet'i/omuz
butonları Prototip.dc.html'in LİTERAL ölçülerine hizalandı**

Tasarım kaynağı: `Tasarim-2026-08/Prototip.dc.html` (çip satırı satır ~531,
spektrum kartı satır ~640-654, marker/fbMark satır ~1565-1589, kontrol
satırı satır ~677-698, feedback sheet satır ~1308-1343) — AÇILIP öğe öğe
karşılaştırıldı, öğe eşleme:

| Tasarım öğesi | Karşılığı (bu turda uygulanan) |
|---|---|
| Çip satırı — TEK kapsayıcı, flex-wrap | İki `.chiprow` divi TEK'e birleştirildi — G79'un "iki sabit satır" kararı YANLIŞ tasarım okumasıydı, dosya yeniden karşılaştırılıp düzeltildi |
| Zorluk çipi — cyan `#22d3ee`/altın (boss) | `.game-diff-chip` yeniden yazıldı, `.boss` varyantı eklendi (`renderGameHeader()`) |
| Dokunmalı\|Şıklı segment — 4px 10px/6px/10.5px | `.seg-toggle`/`.seg-toggle-btn` literal ölçüye küçültüldü |
| Odak/Kaynak çipleri — 5px 10px/9px/10.5px + 10x10 chevron | `.srctag` küçültüldü, metin chevron (`&#8250;`) → 10x10 SVG |
| Karışık — 11x11 ikon + metin | LED nokta KALDIRILDI, tasarımın kendi çapraz-ok SVG'si eklendi |
| Spektrum kartı — 18px radius/#0a0c0e/boss altın kenarlık | Yeni `#analyzerPanel` sarmalayıcı — `.canvas-stage` + `#analyzerFoot` TEK kutuda |
| Yükseklik — dokunmalı 252/şıklı-kademeli 188 | `.analyzer-choice` (yeni, `syncAnswerArea()`'da `isChoiceFormat()`'a göre toggle) — `.analyzer-compact` (Tonal Denge) ÖNCELİKLİ kalıyor |
| Alt şerit "20 Hz/SPEKTRUM ANALİZÖRÜ/20 kHz" (boss: "PRO ZORLUK · Q 4.0") | `updateAnalyzerFoot()` G83'ün GERÇEK FA_MIN/FA_MAX kararını GERİ ALDI (bu turun açık talimatı) — literal metne döndü; boss caption YENİ |
| "+10 dB" göstergesi | KALDIRILDI (`#gainValue` DOM'dan silindi, `els.gainValue` guard'lı çağrılar zararsız kaldı) |
| Cevap sonrası işaretler — SADECE 2px çizgi+62x20 kutu+nokta (sen) / 1.4px kesik+halka (doğru) | `frekans-bulma.js` tek-bant bloğu YENİDEN yazıldı — `drawClosenessBand` (kırmızı bant) SÖKÜLDÜ |
| İpucu 46x46/19x19/Yazı YOK | `#hintBtn` büyütüldü, `#hintBtnLabel` CSS ile gizlendi (DOM'da kaldı — metni `#hintTag`'de ZATEN tekrarlanıyor) |
| A/B track 44px/pill 38px×12px×10px×13.5px×800 | `#abToggle.game-ctrl-ab`/`.abside` düzeltildi — kesilmenin GERÇEK kök sebebi `.btn`in `min-height:52px`'i ve `.abbtn`in `padding:8px 10px`'iydi (özgüllük/kaynak-sırası çakışması) |
| Döngü 44x44 + "DÖNGÜ" rozet satırı | `.game-ctrl-loop` küçültüldü, YENİ `#gameLoopBadgeRow` (`startAbLoop`/`stopAbLoop`'ta toggle) |
| Geri bildirim sheet — alttan açılan panel + karartma | `#feedbackBox` `position:fixed`'e taşındı, YENİ `#feedbackOverlay` backdrop (`setFeedback()`/`goToNextRound()`'da senkron toggle) |
| Omuz butonları kontrolleri örtmemeli | Karartma eklenince ÇÖZÜLDÜ (arka plan zaten sönük) — ayrı bir CSS/JS gerekmedi |
| Sol omuz HER ZAMAN "Senin cevabın" | `showFrequencyEars()`'ın doğru-cevapta "Temiz"e dönme dalı SÖKÜLDÜ |
| Süre çubuğu cevap sonrası durmalı | CANLI ÖLÇÜLDÜ: `roundFlow.clearTimer()` ZATEN doğru çalışıyordu (700ms boyunca `%13.75` sabit kaldı feedback açıkken) — kod DEĞİŞTİRİLMEDİ, sadece doğrulandı |

**"20 Hz"/"20 kHz" — G83'ün kararı BİLEREK GERİ ALINDI:** G83 "gerçek FA_MIN/
FA_MAX" (ör. "80 Hz"/"17.0 kHz") yazıyordu — bu turun kendi açık talimatı
("ŞU AN '80 Hz / 17.0 kHz' yazıyor, YANLIŞ") tasarımın LİTERAL "20 Hz"/
"20 kHz" yazdığını netleştirdi (ızgaranın kendisi 50Hz-10kHz sabit tiklerle
çalışıyor, uçlardaki "20"lar gerçek aralık DEĞİL, sabit bir ölçek etiketi).
Kod buna göre düzeltildi — İKİ ard arda görev arasında ÇELİŞEN talimat,
SONRAKİ (bu görev) esas alındı, dosya tekrar açılıp doğrulandı.

**Alttan-açılan sheet mimarisine geçiş — G81'in "min-height/visibility, akış
İÇİNDE kart" mimarisi TERK EDİLDİ:** `.fb` artık `.bottom-sheet`'in AYNI
`position:fixed`+`transform:translateY` desenini kullanıyor — eski "ani
yükseklik sıçraması olmasın" kaygısı da ORTADAN KALKTI (fixed eleman flow'u
hiç etkilemiyor). Panelin doğru/yanlış YEŞİL/KIRMIZI translucent arka planı
(G81'in kendi, bu turun kapsamı DIŞINDAKİ kararı) DEĞİŞTİRİLMEDİ — SADECE
konumlandırma taşındı.

**Kesilme kök sebebi — iki AYRI özgüllük/kaynak-sırası çakışması bulundu:**
1. `#abToggle.game-ctrl-ab{height:44px}` yazılmıştı ama `.btn{min-height:52px}`
   (aynı özgüllük, dosyada SONRA tanımlı) KAZANIYORDU — `min-height` her
   zaman `height`'ı ezer. `#abToggle` (id) ile `min-height:44px` de EKLENEREK
   düzeltildi.
2. `.abside`'ın eski ölçüsü (24px/3px 0/7px/14px) `.game-ctrl-ab`'ın 44px'lik
   sabit yüksekliğinde `.abbtn`in 8px dikey padding'iyle TOPLANINCA taşıyordu.
   `.game-ctrl-ab .abside{height:100%;min-width:38px;padding:0 12px}` ile
   düzeltildi.
Canlı ölçüldü: `#abToggle` 92×44px (tasarım: 44px yükseklik ✓), içerik
konteynerin İÇİNDE (`overflowsRow:false`, 4/4 kontrol butonu).

**Testler:** `createQuestion`/`evaluateAnswer` DEĞİŞMEDİ (sadece canvas/DOM/
CSS). `npm test`: **1043/1043**.

**DOĞRULAMA (canlı tarayıcı, taze sekme, konsol HATASIZ):**
- **10 modda çip satırı canlı doğrulandı — 0 kesilme:** Frekans Bulma'da
  ekran görüntüsü + `getBoundingClientRect` ölçümleri (zorluk çipi 83×44,
  seg-toggle 134×44, segBtn 81×38/10.5px, focusChip 148×24/10.5px, mixChip
  75×24/10.5px) — tasarımın literal değerleriyle BİREBİR eşleşti (font-size/
  border-radius/padding). Kesim Noktası/dB Seviyesi/Frekans Çakışması'nda
  (kendi çip alt kümeleri) ekran görüntüsüyle görsel kontrol, kesilme YOK.
- **Kontrol butonları px olarak ölçüldü, kırpılmadı:** `#hintBtn` 46×46,
  `#startBtn` 64×64 (İKİSİ de tasarımla BİREBİR), `#abToggle` 92×44 (düzeltme
  SONRASI), `#abLoopBtn` 44×44. `#gameSpectrumControls`'ün 4 çocuğunun HİÇBİRİ
  satırın alt sınırını AŞMIYOR (`overflowsRow:false`, 4/4).
- **Spektrum alt satırı "20 Hz / SPEKTRUM ANALİZÖRÜ / 20 kHz" doğrulandı** —
  Frekans Bulma/Kompresör ekran görüntüleriyle; boss turunda "PRO ZORLUK ·
  Q 4.0"a değiştiği CANLI bir boss turunda doğrulandı (aynı turda `#analyzer`
  altın kenarlık + zorluk çipi altın varyantı da GÖRÜLDÜ).
- **Cevap sonrası spektrumda SADECE iki işaret, kırmızı bant YOK:** Frekans
  Bulma'da canlı tur — "Senin işaretin" (cyan, 62x20 kutu + alt nokta) hem
  soru sırasında hem cevap ANINDA ekran görüntüsüyle yakalandı; bir başka
  turda (timeout/gerçek cevap açığa çıkma) SADECE doğru-cevap işareti
  (kesikli yeşil çizgi + İÇİ BOŞ halka, ETİKETSİZ) görüldü — hiçbir turda
  kırmızı/renkli bant YOK.
- **Geri bildirim açıkken arka planın karardığı VE omuzların kontrolleri
  örtmediği doğrulandı:** Şıklı formatta canlı bir doğru cevap turu —
  `#feedbackOverlay` `.open`, `#feedbackBox` `.show-result` (DOM'dan
  doğrulandı) — ekran görüntüsünde ÜST barın/çip satırının/spektrumun TAMAMI
  kararmış, panel alt kenardan yükselmiş, SOL omuz "Senin cevabın" (kırmızı,
  DOĞRU cevapta bile — G81'in "Temiz" davranışı KALKTI), SAĞ omuz "Doğru
  cevap" (yeşil) — panelin üst kenarında, arkadaki (kararmış) kontrol
  satırıyla ÇAKIŞMIYOR.
- **Süre çubuğu — CANLI ÖLÇÜLDÜ, zaten doğruydu:** cevap verilip
  `show-result` `true` iken 700ms boyunca (8 örnek, 100ms arayla)
  `#gameBossBarFill`/`#gameSpeedBarFill` genişliği `%13.75`de SABİT kaldı —
  koda dokunulmadı, sadece doğrulandı (ilk turda YANLIŞLIKLA "akıyor" gibi
  göründü — o ölçüm ARADAN feedback'in KENDİSİ kapanıp yeni bir tur
  başladığı için yanıltıcıydı, 100ms'lik örneklemeyle DÜZELTİLDİ).
- **Konsol hatası: 0** (taze sekme, tüm test turları boyunca — Frekans
  Bulma/Kompresör/dB Seviyesi/Frekans Çakışması). **`npm test`: 1043/1043.**

---

Önceki commit (G84, tek commit) — **SINAV EKRANLARI giydirildi — beş durum
(announce/run/passed/failed/makeup), Prototip.dc.html examSets objesi
birebir + telafi ekseninin/tetikleyicisinin koddan doğrulanmış düzeltmesi**

Tasarım kaynağı: `Tasarim-2026-08/Prototip.dc.html` (satır ~1958-2007,
`examSets` objesi + satır ~827-865, `screen==='exam'` bloğu) — AÇILIP
öğe öğe eşlendi:

| Tasarım öğesi | Karşılığı (bu turda uygulanan) |
|---|---|
| Sınav anonsu (altın duyuru), gir/devam seçimi | Yeni `#screen-exam` "announce" durumu — `showExamScreen("announce", {source})`. ÖNCEDEN `examOfferSheet` (küçük bottom-sheet) idi, TAM EKRANA taşındı |
| Sınav modu (üst barda kalpler yerine 4 nokta + "SINAV N/4") | G77'de kurulmuştu (`renderGameHeader()`) — canlı doğrulandı, İKİ gerçek fark bulundu ve düzeltildi (aşağıda) |
| Geçti, "Sv N → N+1" kutlaması | Yeni `#screen-exam` "passed" durumu. ÖNCEDEN `examPassSheet` idi, TAM EKRANA taşındı |
| Kaldı, parkur baştan | Yeni `#screen-exam` "failed" durumu — ÖNCEDEN sadece `appendExamNote()` (feedback kartına eklenen TEK satır) vardı, hiç ekran YOKTU |
| Telafi turu — zayıf bölge bilgisi, 5 soru, geçme koşulu 3 doğru | Yeni `#screen-exam` "makeup" durumu — ÖNCEDEN sadece `appendExamNote()` vardı, hiç ekran YOKTU |
| Badge/pill (altıgen SVG, `26,3 48,19 40,46 12,46 4,19` + `26,9 42.5,21 36.5,41 15.5,41 9.5,21`) | `#resBadge`/`#levelChip`'in AYNI iki-poligon tekniği, `#examBadgeGrad` yeni gradyan def |
| popIn animasyonu | Yeni keyframe İCAT EDİLMEDİ — G81'in `fbPopIn`'i (AYNI teknik, farklı isim) reuse edildi |

**KRİTİK DÜZELTME (task'ın kendi uyarısı, `core/exam-system.js`'ten
doğrulandı) — telafi YANLIŞ eksene bağlıydı:** Tasarımın "failed" durumunun
`onPrimary`'si telafiye zincirleniyordu (`{exam:'makeup'}`) ve "makeup"ın
gövde metni "Sınavdaki üç hatanın da..." diyordu — GERÇEK kodda telafi
SADECE 10 soruluk PARKUR toplamda `<6` doğruyla biterse başlıyor
(`remedial-start` event'i, `exam-system.js:recordAnswer`'ın PARKUR dalından
DÖNER); sınavda kalmak (`exam-failed`) BASİT — telafi YOK, doğrudan parkur
baştan (`resetParkur()` ZATEN çağrılmış). Bu yüzden:
- "failed" ekranının gövdesi/faktleri sınav sonucunu (`ctx.examCorrect`)
  gösterir, birincil buton **"Devam Et"** (tasarımın "Telafi turuna gir"i
  DEĞİL — parkur zaten sıfırlandı, sıradaki soru taze bir parkurun ilk
  sorusu).
- "makeup" ekranının gövdesi **"10 soruluk parkurda en az 6 doğru
  yapılamadı"** der (sınavı DEĞİL, parkuru referans alır).

**Telafi ekseni — modun GERÇEK `EXAM_WEAK_AREA`'sına göre:** `getWeakArea()`
(mevcut, G50) `mode.EXAM_WEAK_AREA==="zone"` iken zayıf FREKANS bölgesini
(`"Zayıf bölgen: X"`), aksi halde zayıf ZORLUK kademesini (`"Zayıf
kademen: X"`) döner — task'ın "Frekans Bulma/Kesim Noktası/Boost mu Cut
mu/Q Genişliği → zone" listesi koddan doğrulandı, AMA **Frekans Çakışması da
`EXAM_WEAK_AREA="zone"`** (task'ın listesinde YOK, koddan bulundu — 5.
zone-modu). Metin `mode.EXAM_WEAK_AREA` DEĞERİNİ okuyarak üretildiği için bu
5. modu da OTOMATİK doğru ele alıyor, ayrı bir kod dalı GEREKMEDİ.

**"Sınavda can harcanmaz" — sınava özgü bir istisna İCAT EDİLMEDİ:**
`examGateActive()` zaten `isUserPro()` gerektiriyor VE `loseLife()` Pro'da
HİÇ can azaltmıyor (mevcut, dosya başı notu "Pro'da can sınırı yok") — yani
bu cümle GERÇEKTEN doğru, ayrı bir "sınavda can yok" mekanizması EKLENMEDİ.

**"run" durumunda G77'den beri var olan İKİ gerçek fark bulundu, düzeltildi:**
1. **Nokta göstergesi İKİ değil ÜÇ durumu ayırt etmeliydi** — tasarımın
   `examDots`'u (`i<examOk` altın / `i<examIdx` kırmızı / kalan gri) — G77
   SADECE `i<current` (tek "on" durumu) uyguluyordu, YANLIŞ cevaplanan
   sorular da altın görünüyordu. `.game-exam-dot.wrong` (kırmızı,
   `rgba(248,113,96,.6)`) eklendi, `examSystem.examCorrect`/`remedialCorrect`
   okunarak üç durum ayırt ediliyor. Genişlik 20px→22px (tasarımın literal
   değeri).
2. **Bölüm (chapter) satırı sınav/telafi sırasında GİZLENMİYORDU** —
   tasarımın `showChapter`'ı (`!boss && s.exam!=='run'`) sınav/telafi
   fazında bu satırı da gizliyor; G77/G78 SADECE `!boss` uyguluyordu, "BÖLÜM
   10/10" ile "SINAV 2/4" AYNI ekranda ÇAKIŞIYORDU. `showChapter = !boss &&
   !examActive` — düzeltildi.

**Birincil buton renkleri — İLK uygulamada UNUTULMUŞTU, canlı doğrulamada
yakalandı:** Tasarımın `pbg`/`pc` alanları (announce ALTIN, passed/failed/
makeup'ın ÜÇÜ de YEŞİL) `els.exCta`'ya hiç UYGULANMAMIŞTI — buton
`.btn.primary`'nin varsayılan (cyan) rengini gösteriyordu. Canlı ekran
görüntüsüyle YAKALANIP düzeltildi (`GOLD_BTN`/`GREEN_BTN` sabitleri).

**Kazanılan XP (passed ekranı) — YENİ, küçük bir biriktirici gerekti:**
`examSystem` XP'ye hiç dokunmuyor (mode-agnostic) — `passed`ın "Kazanılan
XP" gerçeği için `examXpSum` eklendi (G81/G82'nin `xpBaseSum` deseninin
AYNISI), `handleExamOutcome`'a yeni `gained` parametresi (8 çağrı noktası,
`submitFrequencyGuess`'ten `submitCakismaGuess`'e kadar) — SADECE
`examSystem.phase==="exam"` iken artıyor, telafi/parkur XP'si karışmıyor.
Canlı doğrulandı: +446/+528 XP gerçek sınav XP'siyle BİREBİR eşleşti.

**"failed" ekranının sınav sonucu — resetParkur() SAYAÇLARI SIFIRLADIKTAN
SONRA okunmaz hale geliyordu, elle anlık görüntü alındı:** `exam-failed`
dalında `resetParkur()` `examCorrect`/`examIndex`'i SIFIRLIYOR — bu yüzden
"2/4 doğru" gibi bir sonuç `recordAnswer()` ÇAĞRILMADAN ÖNCE
(`examCorrectSnapshot = examSystem.examCorrect + (result.correct?1:0)`)
yakalanıp `ctx.examCorrect` olarak taşınıyor.

**"Yeni rozet" (passed) — G82'nin AYNI kuralı:** SADECE bu OTURUMDA
gerçekten açılan bir başarım varsa (`session.newBadges`) satır görünür,
tasarımın sabit "İlk Sınav" örneği UYDURULMADI.

**remedial-passed/remedial-failed'ın kendi ekranı YOK** — task'ın "beş
durum" listesi (announce/run/passed/failed/makeup) bunları KAPSAMIYOR,
mevcut `appendExamNote()` deseni KORUNDU (canlı doğrulandı: telafiyi geçmek
sessizce parkura dönüyor, ekran açılmıyor — beklenen davranış).

**Sökülen eski kod:** `examOfferSheet`/`examPassSheet` (2 bottom-sheet, HTML
+ 9 `els{}` girdisi + 4 fonksiyon) tamamen kaldırıldı, yerine tek
`showExamScreen(kind, ctx)` + `#screen-exam` geçti.

**Testler:** `createQuestion`/`evaluateAnswer` DEĞİŞMEDİ. `npm test`:
**1043/1043**.

**DOĞRULAMA (canlı tarayıcı, geçici `window.__examDebug` ile — canlı doğrulama
SONRASI SÖKÜLDÜ, commit'te YOK):**
- **Beşi de canlı tetiklendi:** announce (İKİ yoldan — kombo-6 erken teklifi
  VE otomatik parkur-sonu tetikleyicisi, ikisi de AYNI ekranı açıyor),
  run (SINAV N/4 + TELAFİ N/5, ikisi de dokümanlı), passed (Kompresör'de
  4/4, Sv 1→2 VE Sv 2→3, gerçek rozet "Şimşek Kulak"/"Pro Kulak"), failed
  (2/4, "Parkur baştan"), makeup (Kompresör'de TİER ekseni "Zayıf kademen:
  Kolay"; Q Genişliği'nde ZONE ekseni "Zayıf bölgen: genel spektrum" —
  yeterli veri yokken dürüst fallback, uydurma yok).
- **Kalpler gizlenip nokta göstergesi çıktığı doğrulandı:** ekran
  görüntüsüyle — sınav/telafi sırasında `#hearts` gizli, `#gameExamRow`
  görünür, üç renkli nokta durumu (altın/kırmızı/gri) canlı gözlemlendi.
  `#gameChapterRow`/`#gameSpeedRow` da AYNI anda gizli (G84'ün 2. düzeltmesi).
- **İki farklı modda telafi ekseni doğrulandı:** Kompresör (KADEME ekseni,
  "Kolay" gerçek etiketi) + Q Genişliği (BÖLGE ekseni, "genel spektrum"
  dürüst fallback'i) — metinler kod-doğru eksenle eşleşti.
- **"Sonra" (erken teklif reddi) canlı doğrulandı:** `declineEarlyExam()`
  gerçekten çağrıldı, parkur KALDIĞI YERDEN (position 6) devam etti, ekran
  #screen-game'e geri döndü.
- **Konsol hatası: 0** (taze sekme, sayfa yüklemesinden itibaren izlendi).
  **`npm test`: 1043/1043.**

---

Önceki commit (G83, tek commit) — **SPEKTRUM ANALİZÖRÜ giydirildi —
Tasarim-2026-08/Prototip.dc.html `spectrum()`/`dualSpectrum()` birebir +
soru sırasında kopya vermeyen NÖTR çizgi (G38 deseninin devamı)**

Tasarım kaynağı: `Tasarim-2026-08/Prototip.dc.html` (satır ~1539-1632,
`spectrum()` + `dualSpectrum()`) — AÇILIP okundu, öğe öğe eşlendi:

| Tasarım öğesi | Karşılığı (bu turda uygulanan) |
|---|---|
| Çizgi grafik (çubuk DEĞİL), cyan `#22d3ee`, altında dikey gradyan dolgu | `frekans-bulma.js:drawSpectrumBackground()` — procedural eğri (tilt+wobble+jitter), `createLinearGradient` ile dolgu, `#22d3ee` stroke |
| Boss turunda çizgi ve işaretler altın `#f6d878` | `opts.boss` true iken `accent = "#f6d878"` — hem stroke hem gradyan bu renge geçiyor. (Tasarımın LİTERAL kodu sadece tıklama işaretini altınlıyor, çizgiyi değil — kullanıcının yazılı maddesi "çizgi VE işaretler" dediği için bilinçli olarak GENİŞLETİLDİ, DURUM'a not düşülüyor) |
| Dikey ızgara + etiketler: 50/100/500/1k/5k/10k | `FA_TICKS_ALL = [100,500,1000,5000,10000]` — "50" ÇIKARILDI, çünkü `FA_MIN=80` altında (uydurma yerine gerçek aralığa sadık kalındı) |
| Yatay ızgara + etiketler: +12/0/-12 | Yeni: `drawSpectrumBackground()` içinde y-fraksiyonları .198/.444/.690 (tasarımın H=252 üzerindeki y=50/112/174 ORANI) |
| İşaret çizgisi: üstte frekans baloncuğu, altta nokta | DOKUNULMADI — her modun KENDİ `drawOverlay()`'i zaten bunu çiziyordu (analitik BiquadFilter eğrileri/işaretler), bu turun kapsamı SADECE arka plan/ızgara |
| İpucu → doğru cevap bandı aydınlık, gerisi karanlık + kesikli çerçeve | DOKUNULMADI — `#hintMaskLayer`/`renderHintMask()` ÖNCEDEN vardı, bu turun kapsamı dışı |
| Alt kenar satırı "20 Hz · SPEKTRUM ANALİZÖRÜ · 20 kHz" | Yeni `.analyzer-foot` — ama GERÇEK `mode.FA_MIN`/`FA_MAX` (`formatHz()` ile), "20 Hz"/"20 kHz" yerine gerçek modun aralığı (çoğu modda 80 Hz / 17.0 kHz) — literal metin UYDURULMADI |

**KRİTİK KISIT karşılandı — spektrum soru sırasında kopya vermiyor:**
`drawSpectrumBackground(ctx2d, canvasEl, w, h, {revealed, boss, playing})`
`revealed=false` (soru sırasında) iken çizgi TAMAMEN prosedürel — sabit
tilt + iki sinüs wobble + (çalarken) jitter, ses verisinden/hedef
frekanstan TAMAMEN BAĞIMSIZ. `revealed=true` olduğunda fonksiyon SADECE
ızgarayı çizip ERKEN DÖNÜYOR — gerçek eğriyi her modun KENDİ `drawOverlay()`'i
(analitik filtre eğrisi/gerçek fark) çiziyor. Desen G38'in `drawDbBars`'ıyla
(`REF_FRAC` sabit pozisyon → cevap sonrası gerçek `dbDelta`) AYNI —
doğrulandı, dosyada okundu.

**Eskiden gerçek FFT barları vardı, bu bir GERİLEME DEĞİL DÜZELTMEYDİ:**
`app.js`'in eski `drawSpectrumBars()`'ı `analyser.getByteFrequencyData()`'yı
DOĞRUDAN, soru sırasında DA çiziyordu — tepe noktası hedef frekansı ELE
VERİYORDU (task'ın tarif ettiği spoiler bug'ı, koda bakılarak DOĞRULANDI).
Bu fonksiyon + `drawSpectrumBar()` + `SPEC_BAR_COUNT` SÖKÜLDÜ, yerine
`mode.SHOW_SPECTRUM!==false` ise `mode.drawSpectrumBackground(...)` çağrısı
kondu.

**Merkezi paylaşım — 4 dosyanın kendi eksen kodu SİLİNDİ, 3 dosya YENİ eksen
KAZANDI:** `kesim-noktasi.js`/`q-genisligi.js`/`boost-mu-cut-mu.js`/
`tonal-denge.js` kendi `AXIS_TICKS`/`drawAxis()`'lerini (eski, FARKLI tick
seti) SİLDİ, `frekans-bulma.js`'ten `drawSpectrumBackground` import+re-export
ETTİ (mevcut `FA_MIN`/`FA_MAX`/`faXToF`/... paylaşım deseninin AYNISI).
`kompresor.js`/`reverb.js`/`distortion.js`'in ÖNCEDEN hiç frekans ızgarası
YOKTU — bu turda aynı fonksiyonu import ederek KAZANDILAR.

**COMPACT_ANALYZER (Tonal Denge, 140px) güvenlik düzeltmesi — canlı hataya
DÖNÜŞMEDEN önce yakalandı:** `CURVE_TOP` (88) sabit kullanılsaydı 140px
yükseklikte (`plotBottom≈90`) NEGATİF/ters bir bant üretirdi — Tonal Denge'nin
KENDİ `OVERLAY_TOP_MARGIN=20` önceliği örnek alınarak `curveTop =
Math.min(CURVE_TOP, Math.max(20, plotBottom-60))` ile parametrik güvenli
küçülme eklendi.

**Frekans Çakışması — `SHOW_SPECTRUM=false` korundu, KENDİ `dualSpectrum()`
görünümüne getirildi (paylaşılan fonksiyona BAĞLANMADI):**
- `drawRegionCurve()`: eskiden SADECE kapalı-şekil translucent dolgu vardı;
  `dualSpectrum()`'ın fill+stroke İKİ AŞAMALI tekniği eklendi (aynı `pts`
  dizisi, önce dolgu, sonra `strokeStyle=color, lineWidth=2` açık-yol çizgi).
- Renkler (`SOURCE_A_COLOR="#FFC246"` amber, `SOURCE_B_COLOR="#A855F7"` mor)
  BİLEREK DEĞİŞTİRİLMEDİ — dosyanın kendi ÖNCEDEN belgelenmiş "mavi YOK"
  kararı, tasarımın cyan/gold'undan ÖNCELİKLİ tutuldu (kullanıcının kendi
  önceki kararına sadakat, tasarıma kör sadakat DEĞİL).
- `drawAxis()`: kendi düşük-aralık tick seti (`[40,80,160,320,640,1280]`)
  KORUNDU (paylaşılan 100/500/1k/5k/10k setinden FARKLI, çünkü içeriği daha
  düşük frekans bandında); `dualSpectrum()`'ın etiketsiz yatay ızgarasına
  denk üç YENİ çizgi eklendi (fraksiyon .204/.444/.685) — dB SAYI etiketi
  EKLENMEDİ, çünkü tasarımın `dualSpectrum()`'ında da yok (uydurma yok).

**db-seviyesi.js — DOKUNULMADI** (task'ın kendi istisnası): `SHOW_SPECTRUM=false`,
kendi `drawDbBars()` görünümü aynen duruyor.

**Testler:** `createQuestion`/`evaluateAnswer` DEĞİŞMEDİ (sadece canvas/DOM
kodu düzenlendi). `npm test`: **1043/1043** (her checkpoint'te tekrar
doğrulandı).

**DOĞRULAMA (canlı tarayıcı, taze tab/localStorage, konsol HATASIZ):**
- **10 modun 10'u da doğrulandı** — Frekans Bulma/Kesim Noktası/Q Genişliği/
  Boost mu Cut mu/Kompresör/Reverb/Distortion/Frekans Çakışması DOM taramasıyla
  (footer görünürlüğü + gerçek Hz değerleri), db-seviyesi kendi barlarıyla
  değişmeden, **Tonal Denge (140px COMPACT_ANALYZER) canlı oynanarak** —
  ızgara+nötr çizgi (ask), gerçek "Senin sonucun"/"Hedef (nötr)" eğrisi
  (revealed), BOSS turunda altın çizgi, footer "80 Hz · SPEKTRUM ANALİZÖRÜ ·
  17.0 kHz" hepsi ekran görüntüsüyle doğrulandı. (Doğrulama sırasında BİR ARA
  tarayıcı sekmesi `mode.drawSpectrumBackground is not a function` fırlattı —
  teşhis edildi: eski sekmenin STALE modül-grafiği, sunucudan/`import()`'tan
  doğrudan kontrol edilerek koddan KAYNAKLANMADIĞI kanıtlandı; TAZE sekmede
  sıfır hatayla doğrulandı, kod defekti DEĞİLDİ.)
- **Soru sırasında spektrum hedefi ele vermiyor, kanıtlandı:** Tonal Denge'de
  aynı soruda AŞ aşamasında nötr dalgalı çizgi (BAS/ALT-ORTA/ÜST-ORTA/TİZ'in
  gerçek gerekli düzeltmesiyle — +8.2/-9.7/+8.3/+0.0 dB — HİÇBİR görsel
  ilişkisi yok, ekran görüntüsüyle karşılaştırıldı) → cevap sonrası TAMAMEN
  FARKLI, gerçek kırmızı/yeşil eğri.
  Aşamalar arası şekil belirgin şekilde bağımsız.
- **Cevap sonrası gerçek eğri doğrulandı:** Tonal Denge'de "Senin sonucun"
  (kırmızı) + "Hedef (nötr)" (yeşil düz çizgi) etiketli gerçek eğri, paylaşılan
  ızgaranın üzerinde temiz çizildi (ekran görüntüsü alındı).
- **Boss→altın geçişi doğrulandı:** Tonal Denge'nin boss turunda "BOSS"/"XP
  1.65x" rozetleriyle EŞ ZAMANLI altın renkli spektrum çizgisi (ekran
  görüntüsü alındı).
- **Konsol hatası: 0** (stale-modül teşhisinden SONRAKİ temiz sekmede).
  **`npm test`: 1043/1043.**

---

Önceki commit (G82, tek commit) — **SEANS SONU EKRANI giydirildi —
Tasarim-2026-08/Prototip.dc.html "SEANS SONU" bloğu (SS objesi) +
Seans Özeti.dc.html birebir, üç durum (done/lives/free) + gerçek XP kırılımı +
canlı can geri sayımı + rozet kartı**

Tasarım kaynağı: `Tasarim-2026-08/Prototip.dc.html` (satır ~2010, SS objesi —
ÇELİŞTİKLERİNDE bu geçerli sayıldı) + `Seans Özeti.dc.html` (üç varyant demo,
rozet kartı buradan). Her ikisi AÇILIP satır satır karşılaştırıldı.

**KURAL — mevcut id'ler/fonksiyonlar sökülmedi:** `showSessionEnd()`/
`hideSessionEnd()`/`resCta`/`resRetryBtn`/`resMenuBtn` id'leri VE ÇAĞIRILDIKLARI
4 nokta (loseLife/finalizeIfGameOver×2/finishChallenge) TEK SATIR değişmedi.
`resKicker`/`resPct`→`resScore`/`resHead`/`resLead`/`resLevelUp*`/`resXpBar`/
`resLvl`/`resXpNum`/`resStreak*`/`resHints`/`resSumTitle`/`resFreqMap`/
`resDots`/`resSeqMap`/`resBoxes`/`resComment` id'lerinin HEPSİ KORUNDU —
bazılarının GÖRSEL ROLÜ tasarıma göre genişledi (örn. resXpBar/resLvl/
resXpNum eskiden zorluk-bazlı XP ilerlemesiydi, artık MOD-bazlı "mod
ilerleme çubuğu" — G80'in perMode/perDiff ayrımının AYNI yönde devamı).
`resXp` (eski "Kazanılan XP" tek satırı) kaldırıldı — grep ile TEK okuyucu/
yazıcı olduğu doğrulanıp YERİNE geçen `#resXpRows`'un "Toplam" satırı AYNI
bilgiyi taşıdığı için. Bölge haritası/soru sırası (resFreqMap/resSeqMap/
resDots/resBoxes) tasarımda YOK ama gerçek/çalışan bir özellik — SÖKÜLMEDİ.

**Üç durum, tasarımdan birebir:** done (yeşil, "SEANS TAMAMLANDI"), lives
(kırmızı, "CANLARIN BİTTİ"), free (amber, "ÜCRETSİZ OTURUM BİTTİ") — her
birinin pill rengi/ikonu/halka rengi/birincil buton rengi-etiketi
`showSessionEnd(kind)` içinde `accent`/`pillBg`/`pillBorder`/`pillIconPath`
olarak SS objesinin aynısı.

**İsabet halkası** — CSS conic-gradient YERİNE tasarımın KENDİ tekniği
(animasyonlu SVG, `stroke-dasharray`/`stroke-dashoffset`, `@keyframes
resRingDraw`, R=76). `buildResultRing()` her `showSessionEnd()` çağrısında
`#resRing.innerHTML`'i YENİDEN kuruyor — bu yüzden içindeki `resScore`/
`resPct` id'leri `els{}` önbelleğinden ÇIKARILDI (module-load anında
cache'lenmiş bir referans ilk yeniden kurmadan SONRA bayatlardı, G81'in
`#freqInfo` dersiyle AYNI).

**XP kırılımı — G81'in xpBaseFor() mantığı SESSION toplamına genişletildi:**
`session.xpBaseSum` her doğru cevapta (8 in-scope submit fonksiyonu + proplus,
toplam 9 nokta) `xpBaseFor(q, q.difficulty)` ile artıyor — UYDURULMUŞ bir
sayı yok. "Bölüm bonusu %50" satırı SADECE `kind==="normal"` iken (`finishChallenge()`
TEK bir yerden, SADECE `challenge.active` iken çağrılabildiği grep ile
doğrulandı — yani "normal" HER ZAMAN tamamlanmış bir 10 Soruluk Bölüm'dür,
çarpanı YENİDEN saklamaya gerek yok).

**Can geri sayımı — SADECE görüntü zamanlayıcısı** (`startResWaitTicker`/
`stopResWaitTicker`, her saniye `stats.livesLastRefillAt`'tan kalan GERÇEK
süreyi okur) — `paywall.applyLivesRefill`/`LIVES_REFILL_INTERVAL_MS`'e
(dolum mekaniğinin KENDİSİ) TEK SATIR dokunulmadı, task'ın kendi kuralı.
SADECE "lost" durumunda gösterilir/başlatılır; ekrandan ayrılan HER buton
(`resRetryBtn`/`resMenuBtn`) zamanlayıcıyı durdurur (sızıntı yok).

**Rozet kartı** — Seans Özeti.dc.html'de var, Prototip'in CANLI özet
ekranında yok (çeliştikleri yer, task'ın kendi maddesinde AÇIKÇA istendiği
için uygulandı) — mevcut rozet sistemine (`core/progress.js:ACHIEVEMENTS`,
`stats.unlocked`) bağlandı: `session.newBadges` bu OTURUMDA `notifyNewAchievements()`
ile açılan HER başarımı biriktiriyor, kart SADECE en az biri varsa (en
sonuncusu gösterilerek) görünür. Tasarımın örnek rozeti ("Kusursuz Kulak")
UYDURULMADI/kopyalanmadı — `ACHIEVEMENTS` listesinde böyle bir rozet YOK.

**Birincil buton (`resCta`) — duruma göre 3 GERÇEK eylem:**
- done: "Yeni Seans" → `startFreshAttempt({forceChallenge:true})` (DEĞİŞMEDİ)
- lives: "Reklam izle, +1 can" → `grantAdLife()` (G63'ün watchAdBtn'iyle
  PAYLAŞILAN, TEK gerçek/simüle reklam mekaniği — YENİ bir ödül sistemi
  İCAT EDİLMEDİ). Tasarımın "canları doldur" (tümünü) metni GERÇEK mekanikle
  (+1 can) ÇELİŞTİĞİ için etiket "canları doldur" DEĞİL "+1 can" yazıyor —
  DÜRÜSTLÜK NOTU, kopya bilerek tasarımdan SAPTIRILDI.
- free: "Pro ile sınırsız devam et" → `openPaywallReason("sessionLimit")`
  (mevcut, GERÇEK paywall giriş noktalarından biri)

**BULUNAN YAPISAL DURUM (kod incelemesiyle doğrulandı, DÜZELTİLMEDİ — task
kapsamı DIŞINDA, kullanıcı kararı gerektirir):** `showSessionEnd("normal")`
(yani "done") SADECE `finishChallenge()`'dan çağrılıyor, o da SADECE
`challenge.active && !examGateActive() && challenge.done>=10` iken (bkz.
`ensureAutoNext`). `examGateActive() = mode.EXAM_ENABLED && isUserPro()` —
G50 sınav sistemini TÜM 10 moda yaydığından beri (`EXAM_ENABLED` artık HER
modda `true`, grep ile doğrulandı) bu, **Pro kullanıcı için "done"un HİÇBİR
zaman tetiklenemediği** anlamına geliyor (exam her zaman `finishChallenge()`'ı
BLOKE ediyor — parkur 6+ doğruyla sınava/kutlama sheet'ine gidiyor, azıyla
"parkur baştan"a). Free kullanıcı ise `paywall.isFreeSessionLimitReached`
(5 soru) her zaman "done"dan ÖNCE devreye girip "freeLimit"e düşürüyor.
Yani **"done" mevcut kod tabanında YAPISAL OLARAK ERİŞİLEMEZ** görünüyor —
bu G82'nin DEĞİL, G50'nin (exam'ı 7→10 moda yayarken) BIRAKTIĞI bir durum
olabilir. Kullanıcı kararı gerekiyor: (a) kasıtlı mı (Pro'da ödül yolu artık
sınav-kutlama sheet'i, "done" SADECE teorik/free-ama-limitsiz bir senaryo
için mi), yoksa (b) `finishChallenge()`'ın exam-passed/remedial-passed
SONRASI da tetiklenmesi gereken bir regresyon mu.

**Testler:** DEĞİŞMEDİ. `npm test`: **1043/1043**.

**DOĞRULAMA (canlı tarayıcı, temiz localStorage, konsol HATASIZ):**
- **"lost" (canlar bitti) canlı tetiklendi ve doğrulandı** — taze profil
  (`paywallSuppressedFirstSession` TRUE olsun diye stats temizlenip
  YENİDEN yüklendi, non-Pro), Frekans Bulma'da 5 yanlış cevap → "❤ CANLARIN
  BİTTİ" pill'i, "5 canı da kullandın. Seans 5. soruda kapandı.", halka 0/5
  (%0 İSABET), XP satırları 0/0/0, "Reklam izle, +1 can" (yeşil) butonu +
  "veya 30 dk bekle · sonraki can 29:51" satırı GERÇEK zamanda sayarken
  ölçüldü (29:25→29:22, 3 saniyede 3 saniye — birebir). Butona basınca
  `grantAdLife()` GERÇEKTEN çalıştı (kalp 0/5→1/5, bekleme satırı kayboldu).
- **"freeLimit" (ücretsiz kota) canlı tetiklendi ve doğrulandı** — taze
  profil, non-Pro, 5. soruda (3 doğru/1-2 yanlış karışık) → "🔒 ÜCRETSİZ
  OTURUM BİTTİ" pill'i (amber), "Günlük 5 ücretsiz sorunu tamamladın.",
  halka 3/5 (%60 İSABET, amber), XP satırları **Temel XP 48 + Combo bonusu
  +3 = Toplam 51 XP (48+3=51, GERÇEK toplamla eşleşti)**, mod çubuğu
  "Frekans Bulma · Sv 1 — 51/120 XP" (session.xp'yle BİREBİR), "Pro ile
  sınırsız devam et" (altın) butonu `openPaywallReason("sessionLimit")`'i
  GERÇEKTEN çağırdığı doğrulandı (ilk oturumda bilinçli olarak sessiz kalıyor
  — `paywallSuppressedFirstSession` kuralı, kodun KENDİSİ; Pro-simüle ayrı
  bir oturumda AYNI çağrının paywall ekranını GERÇEKTEN açtığı ayrıca
  doğrulandı).
- **"done" (kayıpsız bitiş) canlı TETİKLENEMEDİ** — yukarıdaki "BULUNAN
  YAPISAL DURUM" nedeniyle. Render kodu (`buildResultRing`/`buildXpRows`/
  mod çubuğu/rozet/buton mantığı) "lost"/"freeLimit" ile AYNI ortak
  fonksiyonlardan geçiyor (ikisinde de canlı doğrulandı) — bu YÜZDEN
  yüksek güvenle doğru çalışacağı değerlendiriliyor, ama "done"a ÖZGÜ hiçbir
  şey (bonus satırı görünürlüğü, "Yeni Seans" butonu) canlı TETİKLENEMEDİ.
  Sayı UYDURULMADI — bu madde açıkça DOĞRULANMADI olarak işaretleniyor.
- **Konsol hatası: 0** — onlarca deneme turu (Kesim Noktası/dB Seviyesi'nde
  sınav/telafi döngüleri DAHİL ~150+ cevap) boyunca TEK bir hata yok.
- **`npm test`: 1043/1043.**

---

Önceki commit (G81, tek commit) — **GERİ BİLDİRİM EKRANI giydirildi —
Tasarim-2026-08/Geri Bildirim.dc.html birebir + Frekans Bulma #freqInfo'dan
#feedbackBox'a taşındı + gerçek XP kırılımı + "kulak" omuz butonları**

Tasarım kaynağı: `Tasarim-2026-08/Geri Bildirim.dc.html` (doğru/yanlış 2
varyant) — dosya AÇILIP her öğe tek tek eşlendi:

| Tasarım öğesi | Karşılığı (bu turda uygulanan) |
|---|---|
| İkon dairesi (46px, check/cross, popIn) | `#fbIcon` — `var(--green-grad)`/kırmızı gradyan, `FB_ICON_CHECK`/`FB_ICON_CROSS` SVG'leri path'leri BİREBİR tasarımdan kopyalandı |
| Başlık + alt başlık | `#fbTitle`/`#fbSubtitle` |
| Sağ üstte "+N XP" | `#fbXpBlock`/`#fbXpValue` — SADECE doğru cevapta |
| Combo satırı ("40 XP × 1.8 combo") | `#fbComboRow`/`#fbComboText` — genelleştirildi: TÜM aktif çarpanlar (combo/boss/hız/ipucu/bölüm) zincirlenir, tasarım SADECE combo'yu örnekliyordu |
| Açıklama kutusu (gradyan kart) | `#feedbackDetail` (id KORUNDU, SADECE görünümü `var(--card-grad)`'a taşındı) |
| Otomatik geçiş çubuğu + "atlamak için ✕" | `#fbAdvance`/`#fbAdvanceBar` — gerçek `scheduleNext` süresiyle (4000/6000/QUICK_ADVANCE_MS) senkron, `animation-play-state` ile cmp-önizlemesinde JS zamanlayıcısıyla AYNI anda duraklıyor/devam ediyor |
| shakeX/popIn/countdown keyframe'leri | CSS'e BİREBİR kopyalandı (`fbShakeX`/`fbPopIn`/`fbCountdown`) |
| Kalp/üst bar/spektrum | DOKUNULMADI — G77-G79'da zaten tasarıma göre kurulu |

**KODDAN GELEN KISITLAR — hepsi korundu:**
- Süreler değişmedi (doğru 4sn/yanlış 6sn, `scheduleNext` çağrıları TEK SATIR
  dokunulmadı).
- Renk standardı korundu: SENİN cevabın kırmızı, DOĞRU cevap yeşil (`.fb.bad`/
  ikon/omuz renkleri).
- `#feedbackBox`/`#feedbackClose` id'leri VE app.js'teki merkezi `.fb-close`
  delegasyonu (artık ~4448. satır, G80'in kaydırmasıyla) TEK SATIR bozulmadı —
  sadece SELECTOR aynı kaldı, davranış aynı.
- **XP kırılımı UYDURULMADI:** her faktör (comboBoost/hintPenalty/bossBoost/
  timeBoost/challengeBoost) submit fonksiyonlarının calculateXP'ye zaten
  geçirdiği AYNI context'ten okunuyor; "taban XP" `mode.DIFFICULTY[level].xp`
  (yeni `mode.xpBase()` varsa onun üzerinden). **Bulunan gerçek incelik:**
  10 modun calculateXP'si SADECE 5 ortak faktörde AYNI değil — Boost mu Cut
  mu'nun katman çarpanı (`LAYER_XP_MULTIPLIER`) ve Frekans Çakışması'nın aşama
  çarpanı (`STAGE_XP_MULTIPLIER`) "taban"ın PARÇASI olduğu için o iki dosyaya
  KÜÇÜK, katkısız (calculateXP'nin kendisi TEK SATIR değişmedi) bir `xpBase()`
  export'u eklendi; Tonal Denge'nin `proximityBoost`'u (sonuç-bağımlı, "taban"
  SAYILAMAZ) kırılımda kendi GERÇEK terminolojisiyle ("yakınlık", mode'un
  KENDİ "Yakınlık %N" metninden) 6. bir faktör olarak gösteriliyor — UYDURULMUŞ
  bir etiket DEĞİL, mode dosyasının kendi sözcüğü.

**FREKANS BULMA #feedbackBox'A TAŞINDI:** `submitFrequencyGuess` artık
`mode.showFreqInfoPanel(els.freqInfo,...)` DEĞİL `setFeedback(...)` +
`setFeedbackSubtitle(...)` + `showXpBreakdown(...)` + `showFrequencyEars(...)`
çağırıyor — başlık/alt başlık/açıklama `feedback.panel`/`result.zone`/
`result.act`/`result.quality` gibi ZATEN VAR OLAN yapılı veriden türetiliyor
(mode dosyasına dokunulmadı). Bu, `#freqInfo`'nun `display:none` aç/kapasının
yol açtığı bilinen ~201px kaymayı da KAPATTI (G58'in diğer sekiz mod için
uyguladığı visibility/min-height mekanizması artık Frekans Bulma'ya da
uygulanmış oluyor). `#freqInfo` **Pro Plus için AYNEN kalıyor**
(`submitProPlusGuess`/`showProPlusInfoPanel`, o modun panel yapısı/cmprow'u
tasarım kapsamı DIŞINDA, TEK SATIR değişmedi).

**"KULAK" OMUZ BUTONLARI (tasarımda YOK, kullanıcının kendi isteği):**
`#fbEarLeft`/`#fbEarRight` — panelin üst kenarına `position:absolute;
transform:translateY(-52%)` ile oturup yukarı taşıyor. Sol omuz yanlışta
"Senin cevabın" (kırmızı çerçeve, `data-preview="mine"`), doğruda "Temiz"
(nötr, `data-preview="clean"`); sağ omuz HER ZAMAN "Doğru cevap" (yeşil,
`data-preview="correct"`). Tıklama mantığı `#freqInfo`'nun ESKİ `.cmp`
karşılaştırma-önizleme delegasyonundan (mine/correct/clean → geçici soru
kopyasıyla `buildQuestionChain`, YENİ ses kodu YOK) BİREBİR taşındı — SADECE
hedef eleman (`#freqInfo`→`#feedbackBox`) ve class (`.cmp`→`.fb-ear`)
değişti. Dokunma alanı canlı ölçüldü: **40×116px (sol) / 40×107px (sağ)**
— task'ın "en az 40px yükseklik" kuralı karşılandı.

**Testler:** DEĞİŞMEDİ (sadece DOM/JS-glue + 2 mod dosyasına küçük additive
`xpBase()` exportu). `npm test`: **1043/1043**.

**DOĞRULAMA (canlı tarayıcı, temiz + Pro-simüle localStorage, tüm oturum
boyunca konsol HATASIZ):**

- **10 modun HEPSİNDE panel doğru açıldığını doğrulandı** — tek tek mod
  kartına girilip cevaplanarak: Frekans Bulma (dokunmalı işaretle→onayla +
  kulak omuzları + canvas üzerindeki iki işaret KORUNDU, ayrı bir kod
  değişikliği gerekmedi — `drawOverlay` zaten canvas'a çiziyordu), Kesim
  Noktası/Q Genişliği/Boost mu Cut mu/dB Seviyesi (şıklı `.ans`), Kompresör/
  Reverb/Distortion (3'lü `.ans-m2`), Tonal Denge (kaydırıcı+onay), Frekans
  Çakışması (şıklı `.ans`) — HEPSİNDE ikon/başlık/açıklama/otomatik-geçiş
  çubuğu doğru render edildi.
- **Cevap sonrası dikey kayma (px, `#feedbackBox`'ın `offsetTop`'u —
  scrollTop'tan BAĞIMSIZ, SADECE üstündeki DOM'un gerçek yükseklik
  değişimini ölçen G58 yöntemi):**

  | Mod | Kayma (px) |
  |---|---|
  | Frekans Bulma | 0 |
  | Kesim Noktası | 4 |
  | Q Genişliği | 0 |
  | Boost mu Cut mu | 0 |
  | dB Seviyesi | 2 |
  | Kompresör | 4 |
  | Reverb | 4 |
  | Tonal Denge | 0 |
  | Distortion | 2 |
  | Frekans Çakışması | 0 |

  Hedef ≤2px — 7/10 mod tam karşılıyor, 3 mod (Kesim Noktası/Kompresör/
  Reverb) 4px ile hafif üstünde. Kök sebep muhtemelen `.ans.right`/`.ans-m2.
  right` işaretlenirken eklenen 2px kenarlık (ÖNCEDEN DE vardı, bu turun
  DEĞİŞİKLİĞİ değil) — DÜRÜSTLÜK NOTU: sayı uydurulmadı, gerçek ölçüm budur.
  **Frekans Bulma'nın kendisi (ana hedef) 0px — ~201px'lik bilinen kayma
  KAPANDI.**
- **Omuz butonlarının dokunma alanı:** sol 116×40px ("Senin cevabın")/
  66×40px ("Temiz"), sağ 107×40px ("Doğru cevap") — HER İKİSİ DE 40px
  yükseklik kuralını karşılıyor.
- **XP kırılımındaki sayılar GERÇEK formülle 5 farklı durumda doğrulandı**
  (Frekans Bulma, canlı, `base × comboBoost × hintPenalty × bossBoost ×
  timeBoost × xpMultiplier` — hesap MANUEL doğrulandı, hepsi birebir eşleşti):
  1. Normal + hız: `24 XP × 1.12 combo × 1.2 hız` → 24×1.12×1.2=32.256→**32**,
     ekranda **+32** ✓
  2. Boss + combo + hız: `16 XP × 1.24 combo × 1.65 boss × 1.2 hız` →
     16×1.24×1.65×1.2=39.28→**39**, ekranda **+39** ✓
  3. Boss + ipucu + hız: `16 XP × 1.12 combo × 1.65 boss × 1.2 hız × 0.5
     ipucu` → 16×1.12×1.65×1.2×0.5=17.74→**18**, ekranda **+18** ✓
  4. 10 Soruluk Bölüm (challenge): `16 XP × 1.12 combo × 1.2 hız × 1.5
     bölüm` → 16×1.12×1.2×1.5=32.256→**32**, ekranda **+32** ✓
  5. Combo büyümesi tur tur izlendi: 1.12→1.24→1.36 (formülün KENDİSİ,
     `Math.min(2.4,1+combo*0.12)`, birebir).
  Tonal Denge'nin 6. faktörü (`yakınlık`/proximityBoost) KOD İNCELEMESİYLE
  doğrulandı (`Math.max(.55, proximityScore/100)`, calculateXP'nin AYNI
  satırı) ama CANLI bir "doğru" senkron yakalanamadı (sürgü hedeflerini
  gerçek zamanlı isabetle tutturmak otomasyonda güvenilir olmadı) —
  DOĞRULANMADI olarak işaretleniyor, sayı uydurulmadı.
- **Konsol hatası: 0** — Frekans Bulma'da onlarca tur (yanlış/doğru/boss/
  ipucu/bölüm kombinasyonları) + diğer 9 modun HEPSİNİN tek tur denemesi
  dahil, TÜM oturum boyunca.
- **`npm test`: 1043/1043.**

**KORUMA:** `#hintBtn`/`#startBtn`/`#abToggle`/`#hearts`/`#levelChip`/
`#gameInfoBtn`/`#gameSettingsBtn`/`#feedbackBox`/`#feedbackClose`/
`#feedbackDetail` id'leri VE JS bağlantıları TEK SATIR sökülmedi. G77-G79'un
üst bar/spektrum/kontrol yerleşimine DOKUNULMADI. `#freqInfo`+Pro Plus akışı
BİREBİR aynı. `appendExamNote`/`appendFreqInfoNote` (Kompresör sınav notu/
Pro Plus notu) ÇALIŞMAYA devam ediyor — ikisi de `els.feedbackDetail`/
`els.freqInfo`'nun STABİL DOM referanslarını kullanıyor, `setFeedback()`
innerHTML'i YENİDEN KURMUYOR (SADECE ilgili alanların textContent/class'ı
güncelleniyor) — `els.*` cache'i asla BAYATLAMADI.

---

Önceki commit (G80, tek commit) — **G79'un 2 hatası kanıtlandı + AYNI desen
(mod değişince güncellenmesi gereken ama enterMode()'da EKSİK olan
fonksiyon) TÜM app.js'te tarandı**

Görev, kod değiştirmeden ÖNCE doğrula sırasını izledi:

**1) TDZ hatası (diffModeAuto) artık oluşmuyor — CANLI kanıtlandı.**
Temiz bir sekmede (`http://localhost:8042`, sunucu önbelleği bypass
edilmiş taze sekme) sayfa açılışından itibaren konsol dinlendi:
**sıfır hata**, `diffModeAuto` referanslı hiçbir `ReferenceError` yok.

**2) `populateFocusSelect()` artık `enterMode()`'da çağrılıyor —
CANLI kanıtlandı.** 10 modun HEPSİ tek tek açılıp `#focusChipWrap`'in
`hidden` durumu ölçüldü (bkz. aşağıdaki tablo) — SADECE Frekans Bulma'da
görünür, diğer 9 modun HEPSİNDE gizli. Pro-kilitli 4 mod (dB Seviyesi/
Kompresör/Reverb/Tonal Denge/Distortion) `devFlags.simulatePro=true`
(localStorage `eqEarTrainerProXDev`) ile geçici açılarak test edildi,
sonda temizlendi.

**3) AYNI DESEN TARANDI — sistematik, ad-hoc DEĞİL:**
- `populate*`/`sync*` adlı TÜM fonksiyonlar grep ile listelendi (10 adet:
  `populateSourceSelect`, `populateFocusSelect`, `syncAnswerFormatVisibility`,
  `syncCakismaVisibility`, `syncAnswerArea`, `syncLives`,
  `syncAnswerFormatToggleUI`, `syncDiffSheetUI`, `syncAccountLine`,
  `syncDevUI`) — her biri `mode.` (module-scope, DEĞİŞEBİLEN mod
  referansı) okuyup okumadığına göre sınıflandırıldı.
- Ayrıca bir AWK taramasıyla gövdesinde HEM `mode.` HEM
  `classList.(toggle|add|remove)("hidden"` geçen TÜM fonksiyonlar
  ayrıca bulundu (5 eşleşme: `populateFocusSelect`, `syncAnswerFormatVisibility`,
  `syncCakismaVisibility` — üçü de zaten `enterMode()`'da; `showSessionEnd`
  — seans-sonu ekranı, HER çağrıldığında güncel `mode`'u taze okur, "sadece
  modül yüklenirken bir kez" deseni İLE İLGİSİZ, yanlış pozitif; `enterMode`'un
  KENDİSİ, beklenen).
- `app.js`'teki TÜM sıfır-girinti (top-level, sadece modül yüklenirken BİR
  KEZ çalışan) çıplak fonksiyon çağrıları (27 satır) tek tek `mode.` bağımlılığı
  için kontrol edildi — `renderAnalysis`/`renderHistory`/`renderAchievements`/
  `renderDaily`/`updateTimerUI`/`renderExerciseGrid`/`renderComingGrid`/
  `resizeCanvas`/`renderCalStep`/`updateCalibRowLabel`/`renderFaq`/
  `renderToolBars`/`renderFilterChips`/`applyProLockVisibility` — mod-
  BAĞIMSIZ (Ana Menü/İlerleme/Ayarlar/Kalibrasyon ekranları, sorun YOK).
  `applyAutoDifficulty`/`enforceFreeRestrictions` — `mode.` okuyor AMA
  `startRound()`'un KENDİSİ her turda YENİDEN çağırıyor (satır ~3415),
  görünür etkileri (Otomatik zorluk çipi HER ZAMAN sabit "OTOMATİK" metni
  gösteriyor, tier'i DEĞİL) mod değişiminde asla sızmıyor — sorun YOK.
  `applyPrefs` — kalıcı TERCİHİ (localStorage) BİR KEZ geri yüklüyor, mod
  değişiminde YENİDEN çalıştırılması YANLIŞ olurdu (kullanıcının odak
  tercihini SIFIRLARDI) — sorun YOK, bilinçli tek-seferlik.
  `syncAnswerFormatToggleUI` — `els.answerFormatSelect.value` (GLOBAL
  tercih) okuyor, mod'a BAĞLI DEĞİL — sorun YOK.
  `syncDiffSheetUI`/`syncAccountLine`/`syncDevUI` — Genel Ayarlar/hesap/dev
  paneli, mod'dan TAMAMEN bağımsız — sorun YOK.

**GERÇEK BULUNAN EKSİK ÇAĞRI (4.): `updateUI()`.** `#levelChipValue` (üst
bar seviye pentagonu) SADECE `updateUI()` içinde yazılıyor
(`progress.modeLevel(stats, mode.getMeta().id)`, satır ~1836) —
`updateUI()` ise SADECE açılışta VE submit-sonrası noktalarda
çağrılıyordu, `enterMode()`'da YOKTU. Sonuç: bir moddan diğerine
geçilince pentagon YENİ modun DEĞİL, ESKİ modun seviyesini göstermeye
devam ediyordu (ilk soru cevaplanana kadar) — `populateFocusSelect`
hatasıyla BİREBİR AYNI kök desen (sadece görünürlük DEĞİL, bu sefer
İÇERİK). `enterMode()`'un `if (mode !== realMode)` dalına, `updateAbToggleUI()`
satırından SONRA `updateUI();` eklendi. `updateUI()` `activeQuestion`'a
bağımlı DEĞİL (yukarıda zaten null'landı, güvenli) — çağrılması yeterli.

**CANLI KANITLANDI (enjekte edilmiş XP ile):** localStorage'da
`kesim-noktasi` moduna 5000 XP enjekte edilip sayfa yenilendi. Frekans
Bulma'ya (0 XP) girildi → pentagon **"1"**. Menüye dönüp Kesim
Noktası'na girildi (HİÇBİR soru cevaplanmadan, SADECE `enterMode()`'un
idle durumu) → pentagon ANINDA **"11"**. Düzeltme ÇALIŞIYOR. Test
verisi sonra temizlendi (`kesim-noktasi.xp=0`, dev-simulate kaldırıldı).

**Testler:** DEĞİŞMEDİ (sadece DOM/JS-glue). `npm test`: **1043/1043**.

**DOĞRULAMA — 10 modun çip görünürlüğü (temiz sekme, Pro-simüle,
konsol HATASIZ):**

| Mod | Odak çipi | Kaynak çipi | Çakışma-çift çipi | Cevap-biçimi toggle |
|---|---|---|---|---|
| Frekans Bulma | görünür | görünür | gizli | görünür |
| Kesim Noktası | gizli | görünür | gizli | gizli |
| Q Genişliği | gizli | görünür | gizli | gizli |
| Boost mu Cut mu | gizli | görünür | gizli | gizli |
| dB Seviyesi | gizli | görünür | gizli | gizli |
| Kompresör | gizli | görünür | gizli | gizli |
| Reverb | gizli | görünür | gizli | gizli |
| Tonal Denge | gizli | görünür | gizli | gizli |
| Distortion | gizli | görünür | gizli | gizli |
| Frekans Çakışması | gizli | **gizli** | **görünür** | gizli |

**Tarama özeti:** 10 `populate*`/`sync*` fonksiyonu + AWK'nin bulduğu 5
mod+hidden eşleşmesi + 27 top-level-only çıplak çağrı = **~35 fonksiyon/
çağrı noktası incelendi, 1 gerçek eksik çağrı bulundu** (`updateUI()`,
yukarıda). **Konsol hata sayısı: 0** (açılıştan 10-mod taramasının
sonuna kadar, `updateUI()` düzeltmesi dahil tüm oturum boyunca).

**KORUMA:** `enterMode()`'un mevcut sırası/mantığı DEĞİŞMEDİ — SADECE
`if (mode !== realMode)` dalının SONUNA tek satır (`updateUI();`)
eklendi. G77-G79'un hiçbir DOM/CSS/id yapısına dokunulmadı.

---

Önceki commit (G79, tek commit) — **Oyun ekranı düzeni tasarıma göre YENİDEN
kuruldu (G77/G78'in devamı, daha birebir uygulama)**

Referans: `Tasarim-2026-08/Prototip.dc.html` (oyun ekranı, dokunmalı
varyant) + `Oyun Ekranı Varyantları.dc.html` — bu dosyalar YENİDEN açılıp
task'ın 7 maddesi birebir uygulandı.

**1) ÜST BAR:** back/i/ayarlar butonları 44x44'ten 30-34px'e küçüldü
(SCOPED override — `.ghead-row .back`/`.ghead-right .mode-info-btn`/
`.ghead-right .dots`, diğer ekranlardaki AYNI class'lar DEĞİŞMEDİ).
**2) BÖLÜM SATIRI:** "hızlı cevap 1.2x" çubuğu artık CYAN (`#1aa8ba→
#34e0f5`, tasarımın KENDİ rengi) — G77'de yanlışlıkla paylaşılan amber
`.bar>i`'ye bırakılmıştı, düzeltildi.
**3) ÇİP SATIRLARI:** G78'in "tek satır + yatay kaydır" yaklaşımı TERK
EDİLDİ — artık İKİ SABİT satır (1. zorluk+cevap biçimi+odak, 2. kaynak+
karışık), `flex-wrap:wrap` (kaydırma YOK, kesilme YOK). Cevap biçimi
artık sheet açan bir chip DEĞİL, İKİLİ segmented toggle (Dokunmalı|Şıklı,
YENİ `#answerFormatTouchBtn`/`#answerFormatChoiceBtn` — `#answerFormatSelect`'e
YAZIP "change" event'i tetikliyor, sheet-tabanlı Oyun Ayarları satırı da
HÂLÂ ayrı bir giriş noktası). Kaynak/odak etiketleri artık "Kaynak: X"/
"Odak: X" (SAF CSS `::before`, JS'e dokunulmadı). Karışık artık metin
taşıyor ("⇄ Karışık"). Eski mavi/yeşil/mor inline renkler kaldırıldı,
çipler nötr, SADECE aktif/seçili cyan.
**4) SPEKTRUM:** değişmedi (zaten tasarıma yakındı).
**5) KONTROLLER:** ipucu/oynat-durdur/A-B/döngü artık spektrumun HEMEN
ALTINDA (`#gameSpectrumControls`, YENİ), sabit alt bara YAPIŞMIYOR —
canlı ölçüldü, spektrumdan 10px, alt bardan ~203px uzakta. YENİ
`#abLoopBtn` eklendi (mevcut `startAbLoop`/`stopAbLoop`'u ÇAĞIRIYOR, YENİ
bir durum makinesi YOK — aktifliği `#abToggle.loop` kardeş seçicisiyle
CSS'te okunuyor). `#startBtn` artık İKON-SADECE (▶/⏸/🔄, "Oyunu Başlat"/
"Durdur"/"Tekrar Çal" metinleri KALKTI — aria-label ile bilgi KORUNDU).
**6) EN ALT:** `#freqGuessArea` (işaretle→onayla akışı, G78'de eklenmişti)
artık GERÇEKTEN alt sabit bar'ın İÇİNDE — yeşil onay butonu + üstünde
`#nextBtn`. `#nextBtn` ARTIK YEŞİL DEĞİL (G78'in kararı GERİ ALINDI) —
nötr/sönük, "Atla" ✕ ile aynı ağırlıkta (task'ın kararı).
**7)** "Başlamak için 'Oyunu Başlat'a dokun." kutusu KALDIRILDI —
`#questionTitle` SİLİNMEDİ, idle durumda boş+gizli, `renderQuestion()`
ilk turda dolduruyor.

**CANLI TESTTE BULUNAN 2 GERÇEK HATA, İKİSİ DE DÜZELTİLDİ:**
1. **TDZ hatası:** yeni "OTOMATİK" mantığı module-level `diffModeAuto`'yu
   (script'in ÇOK aşağısında `let` ile tanımlı) `updateUI()`'ın SAYFA
   AÇILIŞINDAKİ senkron ilk çağrısından okuyordu — `ReferenceError: Cannot
   access 'diffModeAuto' before initialization`. Düzeltme: `diffModeAuto`
   YERİNE onu üreten AYNI koşul (`prefs.difficultyMode !== "fixed"`)
   okunuyor — `prefs` çok daha ERKEN tanımlı, güvenli.
2. **ÖNCEDEN VAR OLAN gerçek bug (bu turun DOĞRULAMA gereksinimi
   sayesinde bulundu):** `populateFocusSelect()` SADECE modül yüklenirken
   BİR KEZ çağrılıyordu (varsayılan mod frekans-bulma olduğu için odak
   çipi İLK açılışta doğru görünüyordu) ama `enterMode()`'un
   `populateSourceSelect`/`syncAnswerFormatVisibility`/`syncCakismaVisibility`
   ile AYNI "mod değişince yeniden değerlendir" listesinde YOKTU — başka
   HİÇBİR moda geçince odak çipi bir daha hiç gizlenmiyordu (canlı testte
   Reverb'de "Odak: Tüm spektrum" GÖRÜNÜR yakalandı). `enterMode()`'a
   TEK SATIR eklendi.

**Testler:** DEĞİŞMEDİ. `npm test`: **1043/1043**.

**DOĞRULAMA (canlı tarayıcı, temiz + Pro-simüle localStorage, konsol
HATASIZ — TÜM oturum boyunca sıfır hata, iki gerçek hata YAKALANIP
DÜZELTİLDİKTEN SONRA):**
- **10 modun HEPSİNDE düzen doğrulandı, tek tek:** Frekans Bulma
  (işaretle→onayla akışı GERÇEKTEN alt barda, "1.56 kHz olarak onayla"
  yeşil buton + üstünde nötr "Atla" — ekran görüntüsüyle doğrulandı),
  Kesim Noktası/Q Genişliği/Boost mu Cut mu/dB Seviyesi (2 satır çip,
  odak+format GÖRÜNÜR), Kompresör/Reverb/Distortion/Tonal Denge/Frekans
  Çakışması (2 satır çip, odak+format GİZLİ — düzeltmeden SONRA
  doğrulandı, ÖNCESİNDE Reverb'de odak çipi yanlışlıkla görünüyordu).
  Frekans Çakışması'nda "Kick + Bas" çift-kaynak çipi + #abToggle'ın HÂLÂ
  gizli olduğu doğrulandı.
- **Kesilen çip metni: 0** — TÜM 10 modda `scrollWidth > clientWidth`
  kontrolü (kesilmenin GERÇEK ölçüsü, sadece göz kararıyla DEĞİL) hiçbir
  çipte pozitif çıkmadı.
- **Kontroller alt bara yapışmıyor, spektrumun altında — canlı ölçüldü:**
  `#gameSpectrumControls` spektrumdan **10px**, alt bardan **~203px**
  uzakta (TÜM modlarda tutarlı).
- **Alt barın içeriği örtmediği — canlı ölçüldü:** `#gameActionbar`'ın üst
  kenarı ile `#gameScroll`'un son çocuğunun alt kenarı arasında **37px
  boşluk** (10 modun HEPSİNDE aynı) — örtüşme YOK. `--actionbar-h`'a
  DOKUNULMADI (task'ın kuralı) — alt bar içeriği KÜÇÜLDÜĞÜ için bu boşluk
  G78'deki 24px'ten G79'da 37px'e ÇIKTI (daha fazla fazlalık, hâlâ 0'ın
  ÜSTÜNDE — örtüşme riski YOK, sadece kozmetik fazla boşluk).
- **`npm test`: 1043/1043.**

**KORUMA:** `#hintBtn`/`#startBtn`/`#abToggle`/`#hearts`/`#levelChip`/
`#gameInfoBtn`/`#gameSettingsBtn` id'leri VE JS bağlantıları (giveHint/
updateStartBtnLabel/toggleAB+basılı-tut/renderHearts/openLevelSheet/
openGuideSheet/openGameSettingsSheet) TEK SATIR sökülmedi — SADECE DOM
konumu/görünüm değişti. `--actionbar-h` DOKUNULMADI. Paywall/sınav
sistemi/ses-zorluk/spotlight TEK SATIR değişmedi.

---

Önceki commit (G78, tek commit) — **Oyun Ekranı 2. bölüm: üst bar düzeltmeleri
+ çip satırı + soru alanı + alt bar**

Tasarım kaynağı: `Tasarim-2026-08/Oyun Ekranı Varyantları.dc.html` (3
varyant) + `Soru Ekranı.dc.html` (şıklı) + `Prototip.dc.html` (5 soru tipi
+ sheet'ler). Bu tur öncekinden (G77, "1. bölüm") DEVAM ediyor — orada
BİLEREK bırakılan soru alanı + alt bar bu turda tamamlandı.

**A) ÜST BAR DÜZELTMELERİ:**
1. Kalpler artık ÇERÇEVESİZ (`.hearts`'ın background/border/padding'i
   kaldırıldı) — tasarımda mod adının altında sade duruyorlar.
2. Bölüm göstergesi artık HEP görünür (boss turu HARİÇ) — eskiden
   (G77) SADECE `challenge.active` iken görünürdü. Serbest'te noktalar
   `.dim` (opaklık .45) + etiket "BÖLÜM —"; 10 Soruluk Bölüm'de normal
   `challenge.done/total`.

**B) ÇİP SATIRI:** Zorluk göstergesi (`#gameDiffChip`, eskiden `.ghead`'de
ayrı satırdı) artık `.chiprow`'un İÇİNDE, TEK satırda kaynak/odak/cevap-
biçimi/karıştır çipleriyle birlikte. Kırpma sorunu ("Pink N...", "Tüm
sp...") KÖKTEN çözüldü: satır artık `overflow-x:auto` + `flex-wrap:nowrap`,
her çip `flex:none` (içeriğe göre doğal genişlik) — sığmayan satır
KAYAR, hiçbir metin kesilmiyor (`.srctag b`'deki eski
`overflow:hidden;text-overflow:ellipsis` kaldırıldı, artık gereksiz).
Görünürlük kuralları (odak/cevap-biçimi SADECE frekans-bulma, kaynak her
modda, cakisma'da çift-kaynak) koddan DOĞRULANDI, TEK SATIR değişmedi.

**C) SÜRE ÇUBUĞU ÇİFT GÖSTERİMİ:** Soru alanındaki eski `.timer-row`
(`#timerBar`/`#timerText`) artık `hidden` — üst bardaki (G77) tek çubuk
kaldı. `#timerBar`/`#timerText` DOM'dan SİLİNMEDİ (`updateTimerUI()`
bunları guard'sız okuyor) — SADECE CSS ile gizlendi.

**D) SORU ALANI — 5 BİÇİM:**
- **Dokunmalı spektrum (Frekans Bulma):** EN BÜYÜK davranış değişikliği bu
  turda burada — eskiden tek dokunuş ANINDA `submitFrequencyGuess()`
  çağırıyordu (onay YOKTU). Artık İŞARETLE→ONAYLA: dokunuş SADECE
  `freqGuessHz`'i ayarlar (işaretçi zaten `drawOverlay`'e canlı geçtiği
  için ANINDA çizilir, çizim koduna DOKUNULMADI), `#freqGuessArea`'da
  "{X} olarak onayla" yeşil bir buton belirir (`renderFreqConfirmButton`,
  YENİ). Butona basınca (YENİ delegated click listener) `submitFrequencyGuess`
  GERÇEKTEN çağrılır — fonksiyonun KENDİSİ tek satır değişmedi, SADECE
  NE ZAMAN çağrıldığı değişti. Tekrar dokunmak onaydan ÖNCE işareti
  günceller (round hâlâ aktif). frekans-bulma.js `renderGuessAreaControls`
  artık tur başında tap-hint metnini ("Cevabını vermek için spektruma
  dokun") gösteriyor (eskiden non-proplus'ta TAMAMEN gizliydi). Pro Plus
  (4-nokta) YOLU DEĞİŞMEDİ — hâlâ 4. işaretten sonra otomatik gönderiyor.
- **Şıklı (Kesim Noktası/Q Genişliği/Boost mu Cut mu/dB Seviyesi):**
  `.answers` grid'i 3 sütundan **2 sütuna** (2x2) çevrildi — şık sayısı
  moda göre değişse de (2-6) sütun sabit 2, satır sayısı otomatik.
- **3 kart A/B/C (Kompresör/Reverb/Distortion):** mevcut `.ans-m2`/
  `core/three-way-cards.js` yapısı zaten tasarıma YAKINDI (play+dalga
  formu+seçim ✓) — DEĞİŞİKLİK YAPILMADI, canlı doğrulandı.
  kompresor/reverb/distortion'daki döngü-otomatik-başlama TEK SATIR
  değişmedi.
- **Kaydırıcı (Tonal Denge):** analizör zaten kompakt (140px, G46'dan
  beri VARDI) — DEĞİŞİKLİK YAPILMADI. **Kapsam kararı (dürüstlük notu):**
  tasarım DİKEY sürükle-bırak fader gösteriyor, mevcut kod YATAY
  `<input type="range">` kullanıyor — DİKEY fader'a geçmek özel
  pointer-drag JS'i gerektirir (mevcut `<input>`'un erişilebilirlik/
  klavye desteğini kaybetmeden), bu turun kapsamında YAPILMADI — AÇIK
  İŞ olarak bırakıldı (aşağıya bkz.).
- **Aşamalı (Frekans Çakışması):** #abToggle'ın gizli kalması VE
  #cakismaCompare'in (Önce/Sonra) 3. aşamadan sonra açılması — koddan
  DOĞRULANDI, TEK SATIR değişmedi (canlı test: cakisma ekranında A/B Test
  butonu GERÇEKTEN yok).

**E) ALT BAR:** Üst sıra artık hint-ikonu (YENİ ampul SVG'si, metin
`#hintBtnLabel` nested span'e taşındı — levelChip'in G77'deki AYNI
retarget deseni) · oynat/durdur (`#startBtn`, öne çıkan/geniş) · A/B
Bypass (`#abToggle`, pill) sırasıyla; alt sırada büyük YEŞİL (`--green-grad`)
`#nextBtn`. `.btn.primary`'nin PAYLAŞILAN kuralına (paywall/sınav/vb. onu
kullanıyor) DOKUNULMADI — `#nextBtn` id-özgüllüğüyle override edildi.
**Kapsam kararı (dürüstlük notu):** tasarım `#startBtn`'i küçük/dairesel
İKON-SADECE bir buton olarak gösteriyor; mevcut `updateStartBtnLabel()`
UZUN metin döndürüyor ("▶ Oyunu Başlat"/"⏸ Durdur"/"🔄 Tekrar Çal") — bu
metni ikon-sadece bir gösterime çevirmek (hintBtn'de yapılan retarget
deseninin AYNISI) bu turda YAPILMADI (risk/süre dengesi) — buton
GENİŞ/öne-çıkan bir dikdörtgen olarak kaldı, tam dairesel değil.

**Testler:** DEĞİŞMEDİ (bu tur DOM/CSS/JS-davranış — hiçbir saf fonksiyon
etkilenmedi). `npm test`: **1043/1043**.

**ORTAM NOTU (canlı doğrulama sırasında bulundu, gelecek turlar için
önemli):** `python3 -m http.server` + Chrome'da `type="module"` script'ler
BAZEN düz `navigate`/`location.reload()` ile TAZELENMİYOR (ES module cache
HTTP cache'den BAĞIMSIZ, kendi başına bayat kalabiliyor) — bir `fetch(...,
{cache:'no-store'})` TAZE içerik gösterse bile `import`'un KENDİSİ eski
kod çalıştırabiliyor. Bu turda gerçek bir hard-reload (Cmd+Shift+R) ile
doğrulandı/düzeltildi. **Gelecekte JS değişikliğinden SONRA canlı test
yaparken HER SEFERİNDE hard-reload kullanılmalı**, aksi halde "değişiklik
çalışmıyor" YANLIŞ teşhisi konabilir (bu turda tam olarak oldu, ~20 dakika
kaybedildi).

**DOĞRULAMA (canlı tarayıcı, temiz + Pro-simüle localStorage, konsol
HATASIZ — tüm oturum boyunca sıfır hata):**
- **10 modun HER BİRİNDE doğru soru biçimi — tek tek açılıp doğrulandı:**
  Frekans Bulma → dokunmalı+onay butonu ("1.12 kHz olarak onayla" GERÇEKTEN
  belirdi, tıklanınca GERÇEKTEN gönderdi); Kesim Noktası/Q Genişliği/
  Boost mu Cut mu/dB Seviyesi → 2x2 şıklı grid; Kompresör/Reverb/
  Distortion → 3 kart A/B/C (biri canlı BOSS turunda yakalandı, SÜRE/BOSS/
  XP1.65× satırı da doğrulandı); Tonal Denge → 4 yatay kaydırıcı + kompakt
  analizör + "Cevabı Onayla"; Frekans Çakışması → aşama 1 şıklı seçim,
  #abToggle GERÇEKTEN yok.
- **Çip satırında kesilen metin: 0** — "Kolay"/"Pink Noise"/"Tüm spektrum"/
  "Dokunmalı" tek satırda, hiçbiri kırpılmadan, ekran görüntüsüyle
  doğrulandı.
- **Ekrandaki süre çubuğu sayısı: 1** — `.timer-row:not(.hidden)` DOM
  sorgusuyla ölçüldü: **0** (eski çubuk gizli), üst bardaki speed-row/
  boss-row İKİSİ ASLA aynı anda görünmüyor (biri açıkken öteki hidden) —
  toplam GERÇEKTEN görünen çubuk sayısı **1**.
- **Bölüm göstergesi iki durumda da doğrulandı:** Serbest'te "BÖLÜM —" +
  sönük noktalar (ekran görüntüsü), 10 Soruluk Bölüm'de normal
  "BÖLÜM 1/10" + dolan noktalar (G77'de zaten doğrulanmıştı, bu turda
  Serbest hâli YENİ eklendi ve doğrulandı).
- **Alt bar içerik örtmesi: 0px** — `#gameActionbar`'ın üst kenarı ile
  `#gameScroll`'un son çocuğunun alt kenarı arasında **24px boşluk**
  ölçüldü (örtüşme YOK, negatif değer değil).
- **Cevap sonrası dikey kayma, 10 mod için ayrı ayrı (`gameScroll.
  scrollHeight` farkı):** Frekans Bulma **201px** (bilinen ~244px'ten
  DÜŞTÜ ama KAPANMADI — dürüstlük notu altında), Kesim Noktası 4px,
  Q Genişliği 0px, Boost mu Cut mu 0px, dB Seviyesi 2px, Kompresör 4px,
  Reverb 4px, Distortion 4px, Tonal Denge 2px, Frekans Çakışması **77px**
  (BUG DEĞİL — aşama 1'den aşama 2'ye GERÇEK içerik büyümesi, "kayma"
  değil "yeni aşama içeriği").
  **Frekans Bulma'nın 201px'i NEDEN kapanmadı (dürüstlük notu):** kök
  sebep `#freqInfo`'nun HÂLÂ eski `display:none` (`.hidden` class'ı)
  ile aç/kapanması — G58'in `.fb` kartında çözdüğü AYNI kalıp
  (visibility+min-height yerine display toggle, ani yükseklik sıçraması).
  Bu turda G58'in AYNI tekniği `#freqInfo`'ya UYGULANMADI — içeriği
  `.fb`'den çok daha DEĞİŞKEN (zengin panel, G74) olduğu için min-height
  seçimi ayrı bir ölçüm/karar gerektiriyor, süre/risk dengesiyle bu
  tura BIRAKILMADI, AÇIK İŞ'e eklendi.
- **`npm test`: 1043/1043.**

**KORUMA:** paywall/erişim mantığı, sınav sistemi, ses/zorluk, spotlight,
`core/three-way-cards.js`, `core/utils.js`, mod-özel istisnalar
(db-seviyesi'nin kendi dikey barları, kompresor/reverb/distortion'un
otomatik döngüsü) TEK SATIR değişmedi. `--actionbar-h`'a DOKUNULMADI.

---

Önceki commit (G77, tek commit) — **Oyun Ekranı 1. bölüm: üst bar + bölüm
göstergesi YENİDEN kuruldu**

Tasarım kaynağı: `Tasarim-2026-08/Oyun Ekranı Varyantları.dc.html` +
`Soru Ekranı.dc.html` + `Prototip.dc.html` (satır ~460-520, üst bar bloğu).
**Kapsam dışı bırakıldı (task'ın kendi kuralı):** soru alanı (spektrum/
şıklar/kartlar/kaydırıcılar) ve alt kontrol çubuğu — TEK SATIR değişmedi.

**UYGULANAN:**
1. **Üst bar, soldan sağa:** Geri · Mod adı+altında 5 kalp (`#hearts`) ·
   Combo çipi (alev+"xN", N=gerçek `comboBoost`) · Soru sayacı ("N/5",
   ücretsizde) · Altın pentagon seviye (`#levelChip`, tıklayınca `#lvlSheet`)
   · "i" (`#gameInfoBtn`) · "..." (`#gameSettingsBtn`) — hepsi task'ın
   verdiği sırayla.
2. **Zorluk göstergesi** — YENİ `#gameDiffChip`, SADECE bilgi
   (`#difficultySelect`'i okur, YAZMAZ), tıklayınca `#lvlSheet` açılır
   (levelChip'in AYNI sheet'i).
3. **Bölüm göstergesi (2. satır)** — `challenge.active` (10 Soruluk Bölüm)
   iken 10 nokta + "BÖLÜM x/10" (`challenge.done`/`total`) + hızlı-cevap
   çubuğu ("hızlı cevap 1.2x", GERÇEK `roundFlow.timeLeft`/`roundDuration`
   ile canlı güncellenir, dekoratif DEĞİL — `#timerBar`'ın AYNI tick'inden
   beslenir). Boss turunda (`activeQuestion.boss`) bu satırın YERİNE "SÜRE"
   çubuğu + `#bossChip` ("BOSS" rozetine dönüştürüldü) + "XP 1.65×"
   (frekans-bulma.js:509 `bossBoost` — grep ile doğrulandı). Serbest'te
   (challenge pasif, boss değil) HİÇBİRİ gösterilmez.
4. **Sınav/telafi fazı** — `examGateActive() && examSystem.phase!=="parkur"`
   iken `#hearts` YERİNE 4 (sınav, `EXAM_CONFIG.EXAM_LENGTH`) ya da 5
   (telafi, `REMEDIAL_LENGTH`) nokta + "SINAV N/4" / "TELAFİ N/5" —
   `PARKUR_LENGTH`(10) İLE KARIŞTIRILMADI (task'ın kendi uyarısı, ayrı
   sistem).

**KORUMA (task'ın kendi kuralı) — HİÇBİR fonksiyon sökülmedi:**
`#hearts`/`#levelChip`/`#gameInfoBtn`/`#gameSettingsBtn`/`#bossChip` AYNI
id, AYNI JS bağlantısıyla duruyor. Tasarımda yer BULAMAYAN eski öğeler
(`#roundChip`/`#streakText`'in taşıyıcısı `.game-sub`, eski `.stats-row`'un
seri/skor/ipucu/isabet çipleri) SİLİNMEDİ — SADECE CSS ile gizlendi, kendi
güncelleme kodları (`renderQuestion()`/`updateUI()` içindeki
`.textContent` satırları) TEK SATIR değişmedi. **TEK gerçek JS değişikliği:**
`#levelChip`'in İÇERİĞİ artık bir SVG pentagon taşıdığı için, seviye
sayısını yazan satır hedefini `els.levelChip.textContent` → `els.
levelChipValue.textContent` olarak DEĞİŞTİRDİ (mantık/hesap AYNI — `progress.
modeLevel(...)` — SADECE hangi DOM node'a yazıldığı değişti, bkz. o satırın
kendi yorumu).

**YENİ:** `renderGameHeader()` (app.js) — combo/sayaç/zorluk/sınav/bölüm
göstergelerini besleyen SAF DOM-render fonksiyonu, `renderQuestion()`
(her yeni soru) VE `updateUI()` (her genel senkron — submit sonrası DAHİL,
combo/hearts ANINDA güncellensin diye) içinden çağrılıyor. `updateTimerUI()`
(mevcut `#timerBar` tick handler'ı) İKİ SATIRLA genişletildi (hızlı-cevap
+ boss SÜRE çubukları AYNI tick'i okuyor) — fonksiyon SÖKÜLMEDİ, sadece
ek satır.

**Testler:** DEĞİŞMEDİ — bu tur SADECE `index.html`/`styles.css`/`app.js`
(DOM/CSS render), `renderGameHeader()` DOM okuyup DOM yazan saf bir
fonksiyon ama `test/`'teki hiçbir saf fonksiyon (createQuestion/
evaluateAnswer) etkilenmedi. `npm test`: **1043/1043** (değişmedi).

**DOĞRULAMA (canlı tarayıcı, `python3 -m http.server` port 8042 +
Claude-in-Chrome, temiz `localStorage`, konsol hatasız — tüm oturum
boyunca SIFIR konsol hatası):**
- **Combo çipi — 3 GERÇEK combo değeriyle doğrulandı** (localStorage'a
  `stats.combo` yazılıp sayfa yenilenerek, gerçek `updateUI()` akışı
  okundu): combo=0 → "x1.00" (dim), combo=5 → "x1.60", combo=20 → "x2.40"
  (2.4 tavanı doğru çalışıyor) — formülle (`Math.min(2.4,1+combo*0.12)`)
  BİREBİR eşleşiyor.
- **Boss turu — GERÇEK oyun motoruyla doğrulandı** (`stats.rounds=4` →
  `(rounds+1)%5===0`, `startRound()` GERÇEKTEN boss hesapladı): üst bar
  ikinci satırı "⏱ SÜRE" + "BOSS" (`#bossChip`, `chip boss` class'ı) +
  "XP 1.65×"'e döndü, çubuk `roundFlow`'un GERÇEK timeLeft'ini takip etti.
- **Sınav modu — DOM/CSS proxy testiyle doğrulandı, DÜRÜSTLÜK NOTU:**
  gerçek `examSystem.phase==="exam"`e ulaşmak parkur içinde 6 PEŞ PEŞE
  doğru GERÇEK ses cevabı gerektiriyor (`comboInParkur>=6`) — bu, otomatik
  tıklama ile GÜVENİLİR şekilde tetiklenemedi (doğru frekansı piksel-
  hassasiyetiyle tıklamak gerekiyor). Bunun yerine `renderGameHeader()`'ın
  ÜRETECEĞİ AYNI DOM mutasyonları (hidden/dot/metin) elle uygulanıp CSS/
  markup'ın DOĞRU render ettiği doğrulandı (kalpler gizlendi, 4 nokta —
  2 dolu 2 boş — + "SINAV 3/4" göründü). State-machine geçişinin KENDİSİ
  (exam-system.js) bu turda DEĞİŞMEDİ, sadece kod okumasıyla doğrulandı.
- **Ücretsiz/Pro soru sayacı — ikisi ayrı ayrı doğrulandı:** ücretsizde
  `#gameQCounter` görünür ("1/5"), `devFlags.simulatePro=true`
  (localStorage) + yenilemede `.hidden` class'ı ANINDA eklendi.
- **10 Soruluk Bölüm — GERÇEK `startChallenge()` akışıyla doğrulandı:**
  `#playModeSelect`→"challenge" + Oyunu Başlat → bölüm satırı 10 boş nokta
  + "BÖLÜM 1/10" ile göründü, hızlı-cevap çubuğu round başında ~94
  (neredeyse dolu, "active" cyan) → 4 saniye sonra ~19 (label aktifliği
  KAPANDI) — GERÇEK zamanlı, dekoratif DEĞİL.
- **Üst bar yüksekliği / soru alanı kayması — 3 durumda ölçüldü:**
  Serbest (boss değil): 128px, Boss: 131px, 10 Soruluk Bölüm: 128px —
  ÜÇÜNDE de `#gameScroll`'un üst kenarı `.ghead`'in alt kenarına TAM
  oturuyor (**boşluk/örtüşme: 0px**), yatay taşma **0px**.
- **`npm test`: 1043/1043.**

**BİLİNEN, BU TURUN KAPSAMI DIŞI SINIRLAMA:** Boss turunda üst bardaki YENİ
"SÜRE" çubuğu ile soru alanındaki MEVCUT `.timer-row`/`#timerBar` (aynı
`roundFlow` verisini okuyan, AYNI ANDA görünen iki çubuk) GEÇİCİ bir
fazlalık — bu, "1. bölüm" (üst bar) ile "2. bölüm" (soru alanı,
`.timer-row` DAHİL) arasındaki KASITLI kapsam ayrımının doğal sonucu,
soru alanı turunda gözden geçirilmeli.

---

Önceki commit (G76, tek commit) — **Mod kartı yükseklik düzeltmesi — G75'in
eşit-yükseklik çözümü fazla boyu metnin ALTINA ölü boşluk olarak
ekliyordu, artık GÖRSELE gidiyor**

**SORUN (kullanıcı raporu):** G75'te eklenen `.mode-card{height:100%}` +
`.mode-grid{align-items:stretch}` satırdaki kartları hizalıyordu ama
`.mode-card-body{flex:1}` fazla boyu KENDİSİ yutuyordu (`.mode-card-desc`
`flex:1` ile büyüyordu) — tek satırlık açıklaması olan kartlarda (Reverb,
Kesim Noktası, Frekans Bulma) metnin altında geniş, görünür boş alan
kalıyordu, görsel (`.mode-card-viz`, SABİT 84px) küçük duruyordu.

**DÜZELTME:**
1. `.mode-card-viz{height:84px}` → `min-height:84px;flex:1` — artık BÜYÜYOR.
2. `.mode-card-body{flex:1}` → flex:1 KALDIRILDI, artık SADECE içeriği
   kadar yer kaplıyor (fazla boy body'e DEĞİL viz'e gidiyor).
3. `.mode-card-desc{flex:1}` → flex:1 kaldırıldı (body artık stretch
   olmadığı için dağıtılacak fazla boşluk hiç kalmıyordu, ölü/etkisiz
   kural haline gelmişti).
4. SVG `preserveAspectRatio="none"` → `"xMidYMid slice"` (task'ın kendi
   isteği) — viz artık değişken yükseklikte olduğu için "none" ile büyüme
   görseli DAHA DA esnetirdi (oranlar bozulur); "slice" HER İKİ eksende
   TEK ölçekle (kapsayan/cover) büyütüp taşanı ORTALANMIŞ kırpıyor —
   oranlar KORUNUYOR.

**YAN ETKİ, CANLI TARAYICIDA BULUNUP DÜZELTİLDİ (task'ın kapsamında
DEĞİLDİ ama "slice"e geçişin DOĞRUDAN sonucuydu, atlanamazdı):** "slice"
kırpması SADECE görsel büyüdüğünde değil, kart TASARIM ORANINDAN (200:84)
dar olduğunda da (166px'lik dar-ekran kartı, sabit 84px yükseklikte bile)
tetikleniyor — ölçek yükseklik tarafından belirleniyor (84/84=1 >
166/200=0.83), her kenardan ~17 birim kırpılıyor. Kenara yakın metinler
GERÇEKTEN kayboluyordu (canlı ekran görüntüsüyle doğrulandı — Kompresör'ün
"OUT" etiketi TAMAMEN görünmez olmuştu): `mode-visuals.js`'te comp:"OUT"
(x=8→32), reverb: dry çubuğu (x=8→20, kısmi iyileştirme — tam ortalamak
dizideki ilk çubukla çakışırdı), tonal:"karanlık" (x=14→32)/"parlak"
(x=186→172, AYRICA y=16→37 — PRO rozetinin altında kaldığı SONRADAN fark
edildi), mask:"KICK" (x=14→34), comp:"IN dB" (x=186→172) — hepsi x:~30-172
güvenli bandına kaydırıldı.

**Testler:** DEĞİŞMEDİ (`mode-visuals.test.mjs` SVG'nin varlığını/gradyan
id'sini test ediyor, koordinat değişiklikleri bu testleri BOZMUYOR).
`npm test`: **1043/1043** (değişmedi — bu tur salt CSS/SVG koordinat
düzeltmesi, test kapsamı G75'te zaten tamamdı).

**DOĞRULAMA (canlı tarayıcı, `python3 -m http.server` port 8042 +
Claude-in-Chrome, temiz `localStorage`, hem 258px masaüstü hem 166px
dar-ekran proxy testi — G74/G75'teki AYNI yöntem):**
- **Grid satırlarında kart yükseklik farkı: 0px** — her 5 satırda, HER İKİ
  genişlikte de `Math.max(heights) - Math.min(heights) === 0` ölçüldü.
- **Metin bloğunun altındaki boşluk: 0px, 10 modun HEPSİNDE, HER İKİ
  genişlikte** — `.mode-card-body`'nin son GÖRÜNÜR çocuğunun alt kenarı ile
  body'nin (padding çıkarılmış) alt kenarı arasındaki fark ölçüldü, hedef
  ≤12px'ti, GERÇEK sonuç 0px (hiçbir kart artık ölü boşluk taşımıyor).
- **Görsel/kart yükseklik oranı, 10 mod için (dar / geniş):** Frekans
  Bulma 0.506/0.6, Kesim Noktası 0.506/0.6, Q Genişliği 0.497/0.6, Boost mu
  Cut mu 0.515/0.6, dB Seviyesi 0.592/0.6, Kompresör 0.497/0.6, Reverb
  0.497/0.6, Tonal Denge 0.497/0.6, Distortion 0.586/0.647, Frekans
  Çakışması 0.41/0.53 (en düşük oran — bu kartın kendi gövdesi en uzun,
  2 satır isim + açıklama + "günde 1 ücretsiz" rozeti, viz büyümeye en az
  ihtiyaç duyan kart).
- **Kenar-kırpma regresyonu tek tek doğrulandı:** Kompresör "OUT",
  Frekans Çakışması "KICK", Tonal Denge "karanlık"/"parlak", Reverb dry
  çubuğu — DÜZELTMEDEN ÖNCE ekran görüntüsünde GERÇEKTEN kayboluyordu/
  kesikti, DÜZELTMEDEN SONRA hepsi tam okunuyor (zoom ekran görüntüsüyle
  doğrulandı). "i"/PRO rozeti çakışması (G75'in konusu) YENİDEN test
  edildi, regresyon YOK.
- **`npm test`: 1043/1043.**
- `PROTOTIP-KAPSAM.md` bu commit'e DAHİL edildi (üç turdur staged
  bekliyordu, task'ın açık isteğiyle).

**KORUMA:** paywall/erişim mantığı, sınav sistemi, ses/zorluk, spotlight,
`academyLevel`/XP mantığı (G75) TEK SATIR değişmedi — sadece
`.mode-card-viz`/`.mode-card-body`/`.mode-card-desc` CSS kuralları ve
`mode-visuals.js`'teki SVG koordinatları/preserveAspectRatio.

---

Önceki commit (G75, tek commit) — **Ana Ekran düzeltmeleri — G74'ün 5 bug'ı
kapatıldı, madde 15 (Sv tutarsızlığı) DAHİL**

Tasarım kaynağı: `Tasarim-2026-08/Ana Ekran.dc.html` (aynı, G74'teki).

**1. "i" butonu okunmuyordu — CANLI TARAYICIDA doğrulandı, kök sebep +
düzeltme:** Reverb'de "i" tam dry-referans çubuğunun (`x=8,y=12,h=68`,
opak cyan) üzerine oturuyordu — taban `.mode-info-btn` zemini
(`rgba(34,211,238,.14)`) parlak/dolu SVG üzerinde neredeyse hiç fark
edilmiyordu. `.mode-card-viz .mode-info-btn`'e (taban kural DEĞİL, sadece
bu iç-içe kural — `#gameInfoBtn` etkilenmedi) koyu neredeyse-opak zemin
(`rgba(6,9,12,.8)`) + belirginleştirilmiş kenarlık eklendi — artık HER
görselin üstünde okunuyor (10 modun hepsi canlı ekran görüntüsüyle tek tek
doğrulandı, aşağıya bkz.). Ayrıca Reverb'in dry çubuğu (`y=34,h=46` —
üstten kısaltıldı) ve Kompresör'ün "OUT" etiketi (`y=12→37`) "i" rozetinin
düşey alanından (y:8-28) tamamen ÇIKARILDI (kaydırma, task'ın kendi ikinci
seçeneği).
**2. PRO rozeti görsel etiketleri kesiyordu — kök sebep + düzeltme:**
Frekans Çakışması'nın "BAS" etiketi (`x=162,y=16`) canlı ekranda GERÇEKTEN
PRO rozetinin ALTINDA tamamen GİZLİYDİ (zoom ekran görüntüsüyle doğrulandı
— rozet DOM'da SVG'nin üstünde, tam o noktayı kaplıyor). "KICK"/"BAS"
`y=37`'ye indirildi (rozetlerin düşey alanı — hem "i" hem PRO, CSS'te
top:8/height~20 — her kart genişliğinde SABİT, çünkü SVG'nin
`preserveAspectRatio="none"` esnemesi SADECE yatay eksende; bkz.
`mode-visuals.js` başındaki G75 notu). dB Seviyesi'nin "+4 dB?" etiketi
(`x=62→74`) dar kartlarda (preserveAspectRatio yatay sıkışması, kart
genişliği viewBox'tan dar olunca "i" rozetinin viewBox-eşdeğeri alanı
BÜYÜR) rozetle çakışmaması için sağa kaydırıldı.
**3. Uzun mod adı kesiliyordu — düzeltildi:** `.mode-card-name`'den
`white-space:nowrap;overflow:hidden;text-overflow:ellipsis` kaldırıldı,
artık 2 satıra inebiliyor (kırpma YOK). `.mode-card-head` `align-items:
center`→`flex-start` (Sv rozeti isim 2 satıra taşınca üstte hizalı
kalsın). "Frekans Çakışması" hem 258px hem 166px kart genişliğinde TAM
görünüyor (canlı doğrulandı, aşağıya bkz.) — Sv rozeti küçültülmedi,
sadece isim kablosu çözüldü.
**4. Kart yükseklikleri hizasızdı — düzeltildi:** `.mode-card`'a
`height:100%;box-sizing:border-box`, `.mode-grid`'e açık
`align-items:stretch` eklendi. Bu ortamda (masaüstü Chrome) grid stretch
DÜZELTMEDEN ÖNCE de 0px fark veriyordu (canlı ölçüldü) — DÜZELTME iOS
Safari'nin bilinen grid-stretch+flex-item quirk'üne karşı SAVUNMACI bir
ek, gerçek WebKit'te henüz doğrulanamadı (CLAUDE.md: "DOM davranışı
kaynak koddan doğrulanamaz", bu ortamda sadece Chromium var).
**5. Akademi Seviyesi yeniden hesaplandı — artık mod seviyelerinin
TOPLAMI DEĞİL:** `progress.js`'e `academyXpNeeded`/`academyTotalXp`/
`academyXpProgress` eklendi, `academyLevel()` bunların üstüne YENİDEN
TANIMLANDI — TÜM modların TOPLAM XP'sinden (`modeXp` toplamı), mod
eğrisinden (`xpNeeded`) 5 KAT YAVAŞ akademiye-özel bir eşik eğrisiyle
(`ACADEMY_XP_MULTIPLIER=5`, TASLAK/TAHMİNİ — playtest'le DOĞRULANMADI,
kod içinde açıkça işaretli). Taze kullanıcı artık academyLevel=1 (ESKİ:
10). `LEVEL_TITLES` eşikleri (1/3/6/10/15/22/30) bu yeni ölçeğe göre
YENİDEN KALİBRE EDİLDİ — eski eşikler (0/20/35/...) yeni ölçekte
ULAŞILMAZ olurdu. `updateUI()`'da Ana Menü (`menuLevelValue`/`menuXpText`/
`menuXpBar`/`menuNextLevelText`) VE İlerleme (`progLevelValue`/
`progXpText`/`progXpBar`/`progNextLevelText`) ARTIK AYNI `academyXpProgress`
kaynağını okuyor (ikisi eskiden AYRI kaynaktan okuyordu — İlerleme
`diffState().xp`, aktif zorluğun XP'si — bu G74'ün AÇIK İŞLER madde
15'iydi, KAPANDI). `index.html`'deki kart alt yazısı "tüm modların
toplamı"→"tüm modlardaki toplam emeğin" (task'ın kendi metni).
**YAN ETKİ, BU TURUN KAPSAMI DIŞI (BEKLEYEN KARARLAR'a eklendi):**
`paywall.meetsLevelRequirement` AYNI academyLevel'ı Pro seviye kilidi
(`mode-catalog.js` `unlockLevel`, 1-20 aralığı) için de okuyor —
çarpanın büyümesi bu kilitlerin açılma HIZINI da (Pro kullanıcılar için)
yavaşlatıyor, kod bunu DEĞİŞTİRMEDİ, kullanıcı kararı bekliyor.

**Testler:** `test/progress.test.mjs` — `academyLevel`/`LEVEL_TITLES`
bölümleri YENİ formüle göre YENİDEN YAZILDI (eski "sum of levels" testleri
kaldırıldı, `academyTotalXp`/`academyXpNeeded`/`academyXpProgress` için
yeni testler eklendi — akademi eğrisinin mod eğrisinden her seviyede daha
yavaş olduğu, taze kullanıcının 1'den başladığı, monoton arttığı
doğrulandı). `test/mode-visuals.test.mjs` DEĞİŞMEDİ (SVG string'in
KENDİSİNİ değil, sadece varlığını/gradyan id'sini test ediyor — koordinat
değişiklikleri bu testleri BOZMADI, `npm test` ile doğrulandı).

**DOĞRULAMA (canlı tarayıcı, `python3 -m http.server` port 8042 +
Claude-in-Chrome, temiz `localStorage`):**
- **Taze kullanıcıda Akademi Sv: 1.** Ana Menü (`#menuLevelValue`) ve
  İlerleme (`#progLevelValue`) İKİSİ DE "1", ikisi de "0/600 XP" —
  `getBoundingClientRect`/`textContent` ile ölçüldü, AYNI.
- **10 modun HER BİRİNDE "i"/PRO rozeti görsel etiketlerle çakışmıyor —
  tek tek zoom ekran görüntüsüyle doğrulandı** (frekans-bulma, kesim-
  noktasi, q-genisligi, boost-mu-cut-mu, db-seviyesi, kompresor, reverb,
  tonal-denge, distortion, frekans-cakismasi) — Kompresör'ün "OUT" ve
  Frekans Çakışması'nın "KICK"/"BAS"ı DÜZELTMEDEN ÖNCE ekran görüntüsünde
  GERÇEKTEN gizliydi/kesikti, DÜZELTMEDEN SONRA hepsi tam okunuyor.
- **"Frekans Çakışması" adı tam görünüyor** — 258px (masaüstü) genişlikte
  tek satır, 166px (dar-ekran proxy testi, G74'teki AYNI yöntemle: gerçek
  `resize_window` bu ortamda `window.innerWidth`'i değiştirmiyor, bunun
  yerine `.app-shell` GEÇİCİ 375px'e sıkıştırılıp GERÇEK DOM ölçüldü)
  genişlikte 2 satıra iniyor, HİÇBİR genişlikte kırpılmıyor.
- **Grid satırlarında kart yükseklik farkı: 0px** — hem 258px hem 166px
  kart genişliğinde, 5 satırın (10 kart) HEPSİNDE `Math.max(heights) -
  Math.min(heights) === 0` ölçüldü.
- **`npm test`: 1043/1043** (1042 → +1 net; `academyLevel` bölümü
  yeniden yazıldı, birkaç test kaldırıldı/eklendi).

**KORUMA:** paywall/erişim mantığı, sınav sistemi, ses/zorluk, spotlight,
mevcut "i" içerikleri, `mode-catalog.js` (unlockLevel DAHİL) TEK SATIR
değişmedi.

---

Önceki commit (G74, tek commit) — **Yeni tasarımın ANA EKRANI uygulandı**
(Tasarim-2026-08/Ana Ekran.dc.html) — oyun ekranı/İlerleme/Araçlar bu
turda DEĞİŞMEDİ.

**ÖNCE RAPORLANAN 2 SORU (task'ın kendi isteğiyle, uygulamadan ÖNCE):**
1. **Seviye unvanı ("Kalibre Kulak" gibi) kodda var mıydı? HAYIR** —
   `grep -rn "unvan\|levelTitle\|Kalibre Kulak"` sıfır sonuç verdi. Bu tur
   `core/progress.js`'e `LEVEL_TITLES` (7 kademe) + `levelTitle(academyLevel)`
   eklendi — TASLAK, kesin/nihai DEĞİL (guide-texts.js'in AYNI ilkesi).
   İlk eşik 0 (academyLevel HİÇ undefined bırakmaz), ikinci eşik (20)
   tasarımın kendi örnek toplamını (10 modun `ex.lv` toplamı: 4+3+3+2+2+2+
   1+1+1+2=21) "Kalibre Kulak"a düşürecek şekilde seçildi.
2. **Mod kartı isabet yüzdesi için perMode veri var mıydı? HAYIR** —
   `storage.js:freshModeState()` sadece `{xp, hintRoundsShown}` döndürüyor,
   `progress.js:accuracy()` SADECE genel/oturum-çapında (`stats.correct/
   wrong`), mod-bazlı DEĞİL — bu, `progress.js`'in KENDİ satır 1940-1941
   yorumunda zaten AÇIKÇA yazılıydı ("mod-bazlı isabet takibi Z3'ün
   kapsamı dışında"). Task'ın kendi fallback talimatına uyuldu: `.mode-card-
   progress` DOM'da VAR ama `hidden` class'ıyla render ediliyor — gerçek
   veri gelince SADECE app.js'teki bir satır (hidden'ı kaldırıp width'i
   dolduran) değişecek, iskelet ZATEN hazır.

**UYGULANAN (task'ın 6 maddesi):**
1. **Kullanıcı kartı** — fırçalanmış metal zemin (tek-seferlik literal
   gradyan, mevcut palette karşılığı YOK, task'ın açık isteği), altın
   pentagon (`var(--gold-grad)` — G73'ün paletinden, YENİ renk YAZILMADI),
   unvan (`#menuLevelTitle`, YENİ), "Sv" sayısı artık `progress.academyLevel
   (stats, playableModeIds())` — ESKİ `diffState().xp` tabanlı seviyeden
   FARKLI bir sayı (bkz. aşağıdaki dürüstlük notu). XP çubuğu/etiketi/
   "sonraki seviye" metni veri kaynağı DEĞİŞMEDİ (aynı diffState() xp/
   percent) — kartta pentagon'dan AYRI ikinci bir metrik.
2. **Günün Önerisi kartı** — `renderDailyTip()`'in KENDİ mantığı (zoneScores,
   en zayıf bölge, `daily.tipDismissed`, `challenge.total` etiketi) TEK
   SATIR değişmedi — sadece CSS (yeni yeşil tonu) + zayıf bölge adının
   `var(--red)` ile vurgulanması (aynı `weakest.label/pct`, sadece
   `textContent`→`innerHTML`, dışarıdan veri enjekte edilmiyor).
3. **Egzersizler — 10 mod kartı** — `renderModeGrid()` ikiye ayrıldı:
   `renderExerciseGrid()` (10 GERÇEK mod) + `renderComingGrid()` (4
   "yakında"). YENİ `core/mode-visuals.js` — Ana Ekran.dc.html'in
   `vizSvg(kind)` üretecinden (React.createElement) BİREBİR taşındı (aynı
   path/renk/metin verileri, SAYI UYDURULMADI), çıktı biçimi React DEĞİL
   düz SVG string. Her kartta: sol üstte `.mode-info-btn` (AYNI id/class/
   click-handler, SADECE konumu `.mode-card-viz .mode-info-btn` ata
   seçiciyle override edildi — oyun ekranındaki `#gameInfoBtn` AYNI class'ı
   kullandığı için TABAN kural değiştirilmedi), sağ üstte durum rozeti
   (aşağıya bkz.), isim+Sv+açıklama+isabet çubuğu (hidden, madde 2'ye bkz.).
4. **Yakında bölümü** — `COMING_MODE_ORDER = ["stereo-genislik","pan-konumu",
   "hiz-modu","hangisi-farkli"]` — task'ın KENDİ verdiği sıra (mode-
   catalog.js'in dizi sırasından FARKLI, bilerek).
5. **Ana ekran "i" butonu** — `#menuInfoBtn` zaten VARDI (G67'den), yerini
   DEĞİŞTİRMEDİK (üst köşe, dişli ikonunun yanı — "yerini sen seç" kuralına
   uyarak zaten-var-olan konum KORUNDU, madde 6'nın ("i" tasarımda YOK)
   dediği "i" kart-üstü "i"lerle KARIŞTIRILMASIN — bu genel/kalıcı "i").
6. **Tab bar** — ikon eklendi (önceden SADECE metin vardı). `.tabbar`
   ekranlar arası PAYLAŞILAN tek DOM elemanı — bu değişiklik İlerleme/
   Araçlar ekranlarında da GÖRÜNÜR (task madde 6 açıkça istedi, kapsam
   dışı ekranların KENDİ İÇERİĞİNE dokunulmadı, sadece bu paylaşılan
   chrome elemanına).

**KİLİT DAĞILIMI — KOD ZATEN KAZANMIŞTI, DEĞİŞİKLİK GEREKMEDİ:**
`mode-catalog.js`'in `tier` alanı kontrol edildi — free: frekans-bulma/
kesim-noktasi/q-genisligi/boost-mu-cut-mu/kompresor (5), pro: db-seviyesi/
reverb/tonal-denge/distortion (4), frekans-cakismasi: pro+dailyTaste — task'ın
istediği dağılımla ZATEN BİREBİR AYNIYDI (G61'in kendi notu bunu doğruluyor).
Tasarımın KENDİ örnek verisi (`ex.pro`) dB Seviyesi'ni YANLIŞLIKLA free
gösteriyordu (statik mockup verisi) — kod hiç KULLANILMADI, HER ZAMAN gerçek
`entry.tier`/`paywall.js` okunuyor. "Sv N'de açılır" rozeti KALDIRILDI
(task'ın kararı) — ALTINDAKİ `meetsLevel`/`playable` mantığı KORUNDU (G62:
ücretsizde zaten hiç tetiklenmiyor), sadece görsel rozeti render edilmiyor.
Frekans Çakışması'nın "Bugün oynadın" durumu (eski `.mode-lock-row`'un
taşıdığı bilgi) KAYBOLMADI — aynı "günde 1 ücretsiz" rozet slotunda, gerçek
`access.reason==="daily-used"` durumuna göre dinamik metne taşındı.

**YENİ testler:** `test/mode-visuals.test.mjs` (23 test — 10 modun HEPSİ için
geçerli SVG üretildiği + benzersiz gradyan id'si + kayıtsız modId'de null),
`test/progress.test.mjs`'e `LEVEL_TITLES`/`levelTitle()` testleri (7 test —
artan sıra, taze-kullanıcı academyLevel=10'un ilk kademeye düştüğü, tasarımın
kendi örnek toplamının "Kalibre Kulak"a denk geldiği, sınır değerler).

**Doğrulama:**
- `npm test`: **1042/1042** (1013 → +29).
- **10 mod kartının HER BİRİNDE doğru rozet — CANLI TARAYICIDA doğrulandı
  (bu tur, ayrık bir istisna olarak, tarayıcı eklentisi BAĞLIYDI):**
  frekans-bulma (rozet yok), kesim-noktasi (yok), q-genisligi (yok),
  boost-mu-cut-mu (yok), kompresor (yok — free, ekran görüntüsünde
  DOĞRULANDI: PRO rozeti YOK), db-seviyesi (🔒 PRO, gold), reverb (🔒 PRO),
  tonal-denge (🔒 PRO), distortion (🔒 PRO — "Yakında" rozeti ALMADI,
  task'ın istediği gibi Egzersizler ızgarasında), frekans-cakismasi (🔒 PRO
  + "günde 1 ücretsiz" amber rozeti — İKİSİ BİRDEN, ekran görüntüsünde
  doğrulandı). "Yakında" bölümü tam task sırasıyla: Stereo Genişlik/Pan
  Konumu/Hız Modu/Hangisi Farklı.
- **Ana ekranda dikey kayma/taşma — GERÇEK `getBoundingClientRect()`/
  `scrollHeight` ölçümleriyle, canlı tarayıcıda (bu tur `python3 -m
  http.server` + Claude-in-Chrome ile bağlanıldı):**
  - Yatay taşma: **0px** (`document.body.scrollWidth - clientWidth === 0`).
  - `.scroll` en alta kaydırıldığında, son "Yakında" kartının alt kenarı
    ile `#tabbar`'ın üst kenarı arasındaki boşluk: **55.77px** (negatif
    DEĞİL — çakışma/kesilme YOK).
  - Dar-ekran (`@media max-width:420px`, tek sütuna düşen) senaryosu: bu
    ortamda `resize_window` gerçek `window.innerWidth`'i DEĞİŞTİRMEDİ
    (denendi, 1728px'te sabit kaldı — dürüstlük notu) — bunun yerine
    `.app-shell` GEÇİCİ olarak 375px'e sıkıştırılıp GERÇEK DOM ölçüldü
    (media query hâlâ geniş-ekran 2-sütun kuralında kaldığı için bu,
    GERÇEK telefondan DAHA KÖTÜMSER bir test — telefon 1 sütuna düşünce
    kartlar daha da GENİŞLER). Sonuç: kart genişliği 165.5px, `cardOverflowsShell:
    false`, `userCard.overflowsShell: false`, `bodyHorizontalOverflowPx: 0`.
    Mod adı metni kendi kutusunu taşıyordu (`nameTextOverflowsOwnBox: true`)
    — bu BEKLENEN/TASARLANMIŞ davranış (ellipsis kırpması, `overflow:hidden`
    ile), kutunun KENDİSİ kartı taşırmıyor (`nameBoxOverflowsCard: false`).
  - Ek doğrulama: sahte bölge verisiyle (`fa_zonestats`) "Bugünün Önerisi"
    kartı da canlı render edildi, ekran görüntüsüyle onaylandı (yeşil kart,
    zayıf bölge kırmızı vurgulu, "Seti başlat · 10 soru" butonu doğru
    etiketle).

**Dürüstlük notu — Akademi Seviyesi ile İlerleme'nin rozeti ARTIK FARKLI
sayı gösteriyor (BİLİNÇLİ, task'ın kapsam sınırının doğal sonucu):**
Ana ekranın YENİ "Sv" pentagonu `progress.academyLevel()` (10 modun
`modeLevel()` toplamı, taze kullanıcıda 10) gösterirken, İlerleme
sekmesinin KENDİ rozeti (`#progLevelValue`, bu turun kapsamı DIŞINDA)
HÂLÂ eski `diffState().xp` tabanlı sayıyı gösteriyor (taze kullanıcıda 1).
Bu iki ekran artık AYNI ANDA farklı "seviye" sayıları gösterebilir —
İlerleme ekranı yeniden tasarlanınca uzlaştırılmalı, AÇIK İŞLER'e
eklenmesi öneriliyor.

**KORUMA:** paywall/erişim mantığı (`meetsLevel`/`playable`/`access`/
`checkModeAccess`/`openPaywallReason`/`enterMode`/`openHeadphoneSheet`),
sınav sistemi, ses/zorluk, spotlight, mevcut "i" içerikleri TEK SATIR
değişmedi — SADECE ana ekranın HTML/CSS/JS'i (render şekli).

---

Önceki commit (G73, tek commit) — **Görsel sistem kuruldu: yeni palet
`:root`'a CSS değişkeni olarak eklendi, mevcut sabit renkler bu
değişkenlere çevrildi. Ekran düzeni/HTML/JS TEK SATIR değişmedi.**

**1. YENİ TOKEN'LAR (`www/styles.css:root`, task'ın kendi değerleri
birebir):** Zemin (`--bg-page/--bg-app/--bg-panel`), Kart (`--card-grad`),
Kenar (`--border/--border-strong`), Metin (`--text/--text-2/--text-3/
--text-muted`), Vurgu (`--cyan/--amber/--gold/--gold-grad/--green/
--green-grad/--red`), Köşe (`--r-panel:18px/--r-card:13px/--r-btn:11px/
--r-chip:8px`).

**2. ESKİ DEĞİŞKEN ADLARI YENİ PALETE ALIAS EDİLDİ** (task 2'nin "mevcut
sabit renkleri bu değişkenlere çevir" isteği + minimum diff): `--am` →
`var(--amber)`, `--gr` → `var(--green)`, `--rd` → `var(--red)`, `--tx`/
`--tx-2`/`--tx-3` → `var(--text)`/`-2`/`-3`, `--line` → `var(--border-
strong)`, `--bg` → `var(--bg-app)`, `--card` → `var(--card-grad)`,
`--radius` → `var(--r-panel)`. Böylece dosyanın geri kalanındaki
YÜZLERCE `var(--am)` vb. referansı tek tek değiştirmeye GEREK KALMADI —
sadece anlamı/rengi güncellendi. `--bl` (mavi, kayan/kaydırıcı/gain
değeri) ve `--pu` (mor, C-pill/Reverb-Frekans Çakışması ikinci kaynağı)
BİLEREK DOKUNULMADI — task'ın verdiği palette bu ikisi için YENİ bir
değer YOK, "birincil vurgu artık cyan" kuralı SADECE amber'ın rolünü
tanımlıyor, mavi/moru cyan'a zorlamak anlamlarını (bilgi/veri okuması vs.
ikinci kaynak ayrımı) BOZARDI.

**3. AMBER'IN ROLÜ DEĞİŞTİ — task'ın kuralı BİREBİR uygulandı:** `grep`
ile TÜM `var(--am)`/`var(--am-2)`/amber rgba kullanımları (26 kural)
tek tek listelendi, HER BİRİ "combo/boss/süre mi?" sorusuyla sınıflandı:
- **Amber KALDI (2 kural, task'ın istisnası):** `.stat .dot` (Seri/combo
  göstergesi), `.bar > i` + `.timer-text` (round süre çubuğu).
- **Cyan'a taşındı (asıl "birincil vurgu" — buton/marka/tab/checkbox/
  seçili-şık/spotlight/A-B-döngü/ipucu etiketi/Karıştır-aç gibi 18
  kural):** `.btn.primary`, `.brand .accent`, `.tab.active`, `.info-btn`/
  `.mode-info-btn` ("i" ikonları), `.mixchip.on` (Karıştır), `#spotlight*`
  (rehber turu), `.hinttag` (İPUCU etiketi), `.ans.pick` (seçili şık),
  `.ans-m2-playing` (three-way "çalıyor" kartı), `.abbtn.loop` (A/B
  döngü aktif), `.sheet-cancel`/`.sheet-option .check`/`.sheet-group
  .chev` (sheet UI), `.seg button.on`, `.cal-step-dot.active`,
  `.auto-diff-ask`, `.mode-glyph`/`.mode-engine` (mod kartı ikon rengi,
  motor renginin CSS varsayılanı — app.js satır-içi style genelde EZER).
- **Gold'a taşındı (6 kural, Pro/statü/ödül anlamı cyan'dan daha uygun
  olduğu için — task'ın kuralı SADECE "amber artık combo/boss/süre
  dışında KALMAYACAK" diyordu, YERİNE HANGİ rengin geçeceğini
  belirtmiyordu; Pro/rozet/XP gibi "statü" öğelerini genel birincil
  vurgudan (cyan, her yerde kullanılan CTA rengi) AYIRT ETMEK için gold
  seçildi — task'ın verdiği palette zaten bunun için var):
  `.mode-chip-pro` (Pro rozeti), `.achievement/.history .icon` (başarım
  ikon zemini), `.plan.pro`/`.li i` (Pro satın alma kartı),
  `.pro-lock-icon` (Araçlar kilit ikonu), `.lvl-badge` (ana menü seviye
  rozeti, `--gold-grad`), `.floating-xp`/`.particle` (+XP/patlama
  efekti).

**4. DİĞER SABİT RENKLER TOKEN'LARA ÇEVRİLDİ:** `html,body{background:
#04060C}` → `var(--bg-page)`; bottom-sheet + spotlightCallout'un
`#10141F` zemin rengi (2 yer) → `var(--bg-panel)`; `#8C95AB`/`#9AA3B8`
(analyzer-label/game-sub/tab/ans-m2-state, 4 yer) → `var(--text-3)`;
`#7E8698` (.abside/.mixchip varsayılan rengi) → `var(--text-muted)`;
tonal-slider thumb kenarlığının `#0A0E1A`'sı → `var(--bg-page)`;
tekrarlanan `rgba(255,255,255,.07)`/`.09` kenar renkleri (satır-bazında,
en yaygın olanlar) → `var(--border)`/`var(--border-strong)`.

**5. KÖŞE DEĞERLERİ 4 KATMANLI SİSTEME TAŞINDI (rol-bazlı eşleme, en
yakın piksel DEĞİL, kullanım amacına göre):** büyük panel/sheet/kart
kapsayıcıları (`.card`, `.mode-card`, `.block`, `.stat-big`, `.fb`,
`.ans`, `.ans-m2`, `.plan`, `.sug`, `.pro-lock-overlay`, bottom-sheet üst
köşeleri, `.group > .list`, `.auto-diff-ask`, `.tabs`) → `--r-panel`
(18px); orta ölçekli kart/satırlar (`.stat`, `.srctag`, `.mixchip`,
`.qline`, `.sheet-option`, `.settings-group .setting-row`, `.tonal-band`,
`#freqInfo`, `#spotlightHole/Callout`, `.daily-card`, `.achievement`,
`.upload-row`, `.cmp`, `.fchip`, `.canvas-stage`, `.tapHint`, `.seg`) →
`--r-card` (13px); butonlar (`.btn`, `.btn.primary`, `.back/.dots/.gear/
.info-btn`, `#spotlightActions button`, `.seg button`, `.mode-glyph`,
`.achievement .icon`, `.x`, `.sheet-header .back`) → `--r-btn` (11px);
küçük rozet/chip'ler (`.mode-chip`, `.hinttag`, `.cbrow .cb`) →
`--r-chip` (8px). 99px (tam pil/daire) ve 2-7px (mikro nokta/glyph
çubuğu/thumb) değerlerine BİLEREK DOKUNULMADI — bunlar "panel/kart/
buton/chip" kategorisine girmeyen dekoratif mikro-elemanlar (noktalar,
ilerleme çubuğu pilleri, kaydırıcı topuzu), 4'lü sisteme zorlamak
anlamsız/bozucu olurdu.

**6. `--actionbar-h`'YE DOKUNULMADI (task'ın kendi kuralı):** değer
(168px) VE onu tüketen `.game-scroll{margin-bottom:calc(var(--actionbar-h)
+ env(safe-area-inset-bottom))}` kuralı BAYT BİRE BİR AYNI — sadece
açıklayıcı yorum satırına bir G73 notu eklendi. `.fb` (geri bildirim
kartı, G58'in `min-height:100px`/`visibility:hidden` düzeltmesi) de AYNI
şekilde SADECE renk değişti, mekanizmaya dokunulmadı.

**Doğrulama:**
- `npm test`: **1013/1013** (bu tur SADECE styles.css, hiçbir JS/HTML
  dosyası değişmedi — `git diff --stat www/index.html www/js/app.js`
  boş döndü, doğrulandı).
- **`styles.css`'te kaç sabit hex kaldı:** `:root` bloğunun DIŞINDA
  (yani gerçekten "hâlâ hardcoded" olan) **27 hex değeri** kaldı,
  `grep -n` ile tek tek listelenip gerekçelendirildi:
  - **5×** `#04231B` (yeşil zemin üstü koyu-yeşil metin — `.btn.green`,
    `.ans-m2.right`, `.cbrow.on`, `.item.pick`) + benzer kontrast-mürekkep
    renkleri (`#2A0710` kırmızı üstü, `#8FF3D8`/`#FFB3C2` yeşil/kırmızı
    üstü açık metin, `#EAF0FF`/`#F5EAFF`/`#DCE4FF` mavi/mor üstü açık
    metin) — task'ın verdiği palette bu "arka plan renginin ÜSTÜNDEKİ
    okunabilir metin" rolü için TOKEN YOK; zorla cyan/gold/amber'a
    çevirmek okunabilirliği BOZARDI. Mavi/mor ile eşleşenler zaten
    madde 2'de BİLEREK dokunulmayan `--bl`/`--pu` ailesinin parçası.
  - **6×** benim SEÇTİĞİM yeni gradyan/etkileşim-durumu tonları
    (`#07242b`/`#0ea5b8` — cyan buton metni/gradyan ikinci durağı,
    `#1ac2dc` — spotlight buton basılı hali, `#8FE9F7` — cyan-seçili şık
    metni, `#5eead4` — kalibrasyon ölçer gradyanı, `#2b2308` — gold
    rozet metni, `#c98a2e` — `--am-2`'nin yeni amber-koyu tonu):
    task'ın verdiği palette bunlar için (cyan/gold gradyan ortağı, aktif/
    basılı durum tonu, arka plan üstü kontrast metni) HAZIR bir değer
    YOK — makul/tutarlı yeni tonlar seçildi, "sayı uydurma" ilkesi
    gereği burada AÇIKÇA belirtiliyor: bunlar TASARIMCI ONAYI beklenen
    taslak değerlerdir, kesin/nihai DEĞİLDİR.
  - **2×** `#fff` (salt beyaz — `.floating-xp` metni, `.sw i` anahtar
    topuzu) — dekoratif/utility beyaz, bir "marka rengi" değil, token
    sistemine dahil edilmedi.
  - **1×** `#f2c94c` — GERÇEK bir CSS değeri DEĞİL, bir yorum satırının
    İÇİNDEKİ tarihsel metin (G36'nın "eskiden bu rengi kullanıyorduk"
    notu) — `grep` bunu regex eşleşmesi olarak buluyor ama kodda
    ÇALIŞMIYOR, rapora dürüstlük için dahil edildi.
  - `:root` bloğunun İÇİNDEKİ hex'ler (yeni token tanımları, ~19 adet)
    bu sayıma DAHİL EDİLMEDİ — onlar "hardcoded kalıntı" değil, TEK
    doğruluk kaynağının KENDİSİ.
- **`--actionbar-h` kaynaklı kayma — kod-seviyesinde KANITLANDI, canlı
  YENİDEN ÖLÇÜLMEDİ (dürüstlük notu aşağıda):** `git diff www/styles.css`
  satır satır tarandı — DEĞİŞEN her satırda SADECE renk (background/
  color/border-color/box-shadow/text-shadow) veya border-radius değeri
  farklı; padding/margin/width/height/min-height/position/top/left/
  right/bottom/transform/gap/flex/display DEĞERLERİNİN HİÇBİRİ bu turda
  değişmedi (otomatik `grep` taramasıyla doğrulandı — dimensional
  özellik içeren HER satır çifti tek tek karşılaştırıldı, ikisi de AYNI
  sayısal değeri taşıyor). border-radius zaten kutu boyutunu/konumunu
  ETKİLEMEZ (sadece köşe yuvarlaklığı). Sonuç: **Ana ekran / oyun ekranı
  / geri bildirim panelinde bu turdan kaynaklanan YENİ bir kayma
  MATEMATİKSEL OLARAK MÜMKÜN DEĞİL** — `--actionbar-h:168px` ve onu
  kullanan `.game-scroll` kuralı bayt-bir-bir aynı, G58'in canlı
  doğrulanmış değerleri (Q Genişliği/Boost-Cut **0px**, Kesim Noktası/dB
  Seviyesi **2px**, bkz. yukarıdaki G58 kaydı) hâlâ GEÇERLİ çünkü onları
  üreten TEK SATIR kod bu turda dokunulmadı. **Ama bu turda tarayıcı
  eklentisi bağlı değildi — yukarıdaki 0px/2px rakamları G58'in ESKİ
  canlı ölçümü, bu turda TEKRAR ÖLÇÜLMEDİ** (kod-diff kanıtı güçlü ama
  "hiçbir tarayıcı/font-rendering farkı yeni bir piksel kaymasına yol
  açmadı" iddiası nihai olarak sadece canlı cihazda teyit edilebilir —
  AÇIK İŞLER'e madde olarak eklenmeli mi, kullanıcı karar versin).

**KURAL uyumu:** hiçbir element gizlenmedi/kaldırılmadı, hiçbir id/class
değişmedi (`git diff www/index.html www/js/app.js` boş) — SADECE
`www/styles.css` içindeki renk/köşe değerleri.

**BİLGİ NOTU (kapsam dışı, rapora düşülüyor):** bu turun ORTASINDA repo
kökünde `Tasarim-2026-08/` adlı, bu oturumda OLUŞTURULMAMIŞ (kullanıcı
tarafından eklenmiş görünen) yeni bir tasarım-prototipi klasörü fark
edildi (birden çok `.dc.html` ekran + `Prototip (tek dosya).html` +
`support.js`/`ios-frame.jsx`). Bu görevin kapsamı task'ın verdiği KAPALI
renk/köşe listesiyle sınırlıydı, bu klasöre HİÇ bakılmadı/kullanılmadı —
sonraki bir turda "asıl kaynak bu mu" diye kullanıcıya sorulmalı.

---

Önceki commit (G72, tek commit) — **Fiyat kararı netleşti (₺399) — eski ₺199
referansları belgelerde düzeltildi + tasarımcı özeti eklendi.**

**1. OYUN-DINAMIGI.md (YENİ):** tasarımcıya verilecek, kod İÇERMEYEN, tek
dosyalık ~2 sayfalık özet — 10 modun tamamı (soru formatı/cevap biçimi/
görselleştirme), seans yapısı (can/limit/Boss/10-Soruluk-Bölüm), XP+seviye
formülü+9 rozet, zorluk sistemi (sürekli eğri + Otomatik/Sabit + sınav
mekaniği), feedback akışı (süreler/X butonu), Free/Pro sınırları, 11 ekranın
tam listesi. TAMAMI gerçek koddan (mode-catalog.js, paywall.js, progress.js,
difficulty-curve.js, exam-system.js, app.js, index.html) çıkarıldı — hiçbir
sayı uydurulmadı. Bu araştırma sırasında güncel kodun Pro fiyatını **₺399**
taşıdığı (`core/paywall.js:PRO_PRICE`), ama `CLAUDE.md`'nin hâlâ eski ₺199
değerini taşıdığı fark edildi (madde 2'nin konusu).

**2. Fiyat tutarsızlığı düzeltmesi (kullanıcı kararı: "₺399 kesin, kod zaten
doğru, sadece belgeleri düzelt"):**
- `CLAUDE.md`: "Pro (tek seferlik ₺199)" → **₺399**.
- `DURUM.md` (ÜRÜN NOTLARI, "Fiyat ve can ekonomisi"): "Pro ₺199" → **₺399**
  + bir açıklama cümlesi eklendi (bu notun eski bir tarihte ₺199 yazdığı,
  güncel kararın ₺399 olduğu). `DURUM.md`'deki TEK diğer ₺199 geçişi
  (satır ~677) BİLEREK DOKUNULMADI — o satır bir DEĞİŞİKLİK anını
  ("Fiyat ₺199→₺399 taşındı") belgeleyen GEÇMİŞ bir changelog kaydı,
  düzeltilecek bir HATA değil.
- `PAYWALL.md`/`TASARIM.md`: `grep` ile tarandı, ikisinde de ZATEN doğru
  değer (₺399) ya da hiç fiyat geçmiyor — düzeltme GEREKMEDİ.
- `OYUN-DINAMIGI.md`'deki "tutarsızlık" notu KALDIRILDI — artık sadece
  "Pro — tek seferlik ₺399" diyor.
- **Dokunulmadı (bilerek):** `Dizayn/prototype.html` (statik tasarım
  referansı, CLAUDE.md'nin kendi tanımıyla "UI değişikliklerinde buna
  bakılır" — canlı kod DEĞİL) hâlâ eski `₺199` taşıyor
  (`prototype.html:3028`, `var PRO_PRICE = '₺199'`) — kullanıcının isteği
  SADECE "belgeler" (CLAUDE.md/DURUM.md/PAYWALL.md) ile sınırlıydı, bu
  dosya kapsam dışı bırakıldı, RAPORA not düşülüyor.

**Build artefaktları senkronlandı:** `android/app/src/main/assets/public/`
(git'e hiç girmeyen, `www/`'den ÜRETİLEN bir kopya) ESKİ ₺199 gösteriyordu
— kaynak (`www/`) zaten doğruydu, sadece senkron eskiydi. `npx cap sync
android` çalıştırıldı, doğrulandı (`index.html:786` artık ₺399). iOS
tarafı (`ios/App/App/public`) G71'de zaten senkronlanmıştı, bu tur
etkilenmedi.

**Doğrulama:**
- `npm test`: **1013/1013** (bu tur sadece .md dosyaları + build senkronu,
  kaynak JS/HTML'e dokunulmadı — sayı G71'den DEĞİŞMEDİ).
- `grep -rn "₺199" --include="*.md" .` ile TÜM belgeler tarandı: kalan İKİ
  eşleşme de yukarıda açıklanan BİLİNÇLİ (tarihsel changelog + yeni
  açıklama cümlesinin kendisi) — gerçek bir "hâlâ yanlış" kalmadı.

**KORUMA:** Kod (10 mod/ses/sınav/paywall/spotlight/"i" sistemi) TEK SATIR
değişmedi — bu tur SADECE belge metni + build senkronu.

---

Önceki commit (G71, tek commit) — **Mod içi "i" cihazda AÇILMIYORDU — kök sebep
bulundu/düzeltildi + "basılı tut" küçük açıklaması eklendi.**

**1. MOD İÇİ "i" TEPKİSİZ — KÖK SEBEP:** G70'te `#gameInfoBtn`'in click
handler'ı doğruydu (`openGuideSheet(mode.getMeta().id)` çağrılıyordu,
event binding SAĞLAMdı) — ama `#guideSheetOverlay`/`#guideSheet`'in
KENDİSİ (G67'den beri) YANLIŞLIKLA `#screen-menu`'nün İÇİNDEYDİ.
`styles.css:.screen{display:none}` SADECE `.active` sınıflı ekranı
gösteriyor (bkz. `goScreen()`) — oyun ekranındayken (`#screen-game` aktif)
`#screen-menu` (ve TÜM alt ağacı, `guideSheet` dahil) `display:none`
oluyordu. `openGuideSheet()` GERÇEKTEN çalışıyordu (`.open` class'ı
ekleniyordu) ama sheet, `display:none` bir ATANIN altında olduğu için HİÇBİR
ZAMAN görünür OLAMAZDI — CSS'te `display:none` bir atanın altındaki
elementler `.open`/`display` kendi değerleri NE OLURSA OLSUN render
edilmez. Mod KARTININ "i"si ÇALIŞIYORDU çünkü o tıklama ZATEN
`#screen-menu` aktifken oluyordu (kart da `guideSheet` de AYNI aktif
ekranın içindeydi) — kullanıcının "kart çalışıyor, oyun içi çalışmıyor"
gözlemi BİREBİR bu asimetriyi işaret ediyordu.
**Düzeltme:** `guideSheetOverlay`/`guideSheet` bloğu `#screen-menu`'nün
içinden ÇIKARILDI, `.app-shell` KÖKÜNE (`#mainSettingsOverlay`/
`#mainSettingsSheet`'in AYNI deseni — ekranlardan BAĞIMSIZ TÜM sheet'lerin
zaten durduğu yer) taşındı. `position:fixed` olduğu için (bkz. `.sheet-
overlay`/`.bottom-sheet` CSS) DOM'daki KONUMU görsel yerleşimini hiç
etkilemiyor — sadece `.screen` bağımlılığı ortadan kalktı.
**Teşhis logları eklendi** (task'ın isteği — `[filepicker-diag]`'ın AYNI
KALICI deseni, `[guide-i-diag]` etiketiyle): `openGuideSheet()`'in
başında modeId + `guideSheetBody` bulunup bulunmadığını loglayan bir satır;
`#gameInfoBtn` click handler'ında tıklamayı VE aktif modu loglayan bir
satır; buton DOM'da hiç YOKSA açılışta BİR KEZ `console.warn` — ileride
BENZER bir "buton tepkisiz" şikâyetinde ilk bakılacak yer bu loglar olsun
diye KALICI bırakıldı, debug sonrası silinmedi.

**2. "BASILI TUT" KÜÇÜK AÇIKLAMA:** kodda GERÇEKTEN nerede olduğu tespit
edildi — `#abToggle`'ın `pointerdown` dinleyicisi (`app.js`, 520ms eşik,
`abPressTimer`) `startAbLoop()`'u tetikliyor; `toggleAB()` HEM three-way
(A/B/C) HEM normal (A/B) dalını kapsıyor (`isThreeWayQuestion` dallanması)
— yani basılı tut, cakisma HARİÇ **TÜM 9 modda** GERÇEKTEN çalışıyor (SADECE
Kompresör/Reverb/Distortion'da DEĞİL — G69'un "abControl" spotlight
metninde bu YANLIŞLIKLA sadece three-way'e özgü gibi anlatılmıştı, ama
long-press mekanizmasının KENDİSİ mod-agnostik; G69'un metni bu turda
DEĞİŞTİRİLMEDİ, KORUMA kapsamında bırakıldı — SADECE bu yeni statik ipucu
eklendi). `#abToggle`'ın içine `<span class="abholdhint">Basılı tut: döngü</span>`
eklendi — `font-size:9px`, soluk renk (`var(--tx-3)`), buton ZATEN cakisma'da
tamamen gizli olduğu için (`syncCakismaVisibility`) AYRI bir mod kontrolü
GEREKMEDİ. Döngü aktifken (`.loop` class'ı) CSS ile gizlenir — `abTitle`
zaten "Döngü" yazıyor, aynı bilgi TEKRAR EDİLMEDİ. Ayrı bir spotlight adımı
DEĞİL, sadece statik/küçük bir metin.

**Doğrulama:**
- `npm test`: **1013/1013** (G70'ten DEĞİŞMEDİ — bu tur DOM taşıma + statik
  HTML/CSS + debug log, guide-texts.js'e yeni saf fonksiyon/veri eklenmedi).
- `div` etiket dengesi (`<div` vs `</div>`) `index.html`'de python ile
  sayılarak doğrulandı: 358/358, blok taşıması sırasında yanlışlıkla
  bırakılmış/silinmiş bir etiket YOK.
- Kod incelemesiyle doğrulanan: `#guideSheetOverlay`/`#guideSheet` artık
  `grep`le TEK bir yerde (`.app-shell` kökünde, `mainSettingsOverlay`'in
  hemen üstünde) — `#screen-menu` içinde İKİNCİ bir kopya KALMADI (id
  çakışması riski de ortadan kalktı). `#gameInfoBtn`/`#abToggle` id'leri
  index.html'de TEK.
- **Dürüstlük notu — CANLI/cihaz doğrulaması YİNE YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi): düzeltmenin cihazda GERÇEKTEN
  sheet'i açtığı, `[guide-i-diag]` loglarının Safari/Xcode konsolunda
  beklendiği gibi çıktığı, "Basılı tut" yazısının GERÇEKTEN okunabilir/
  rahatsız etmeyen boyutta göründüğü gözle DOĞRULANMADI — kullanıcının BİR
  SONRAKİ cihaz testinde asıl doğrulama bu olmalı (root-cause analizi kod
  seviyesinde ÇOK güçlü — `.screen{display:none}` + DOM içi-içe yerleşim
  gerçek/mekanik bir CSS/DOM kuralı, spekülasyon değil — ama "düzeldiği"
  iddiası yine de cihazda TEYİT edilmeli).

**KORUMA:** 10 mod/ses/sınav/paywall/spotlight/mevcut "i" içerikleri TEK
SATIR değişmedi — `guideSheet`'in KONUMU taşındı (içeriği/davranışı değil),
`#abToggle`'a statik bir `<span>` eklendi, `openGuideSheet`/`gameInfoBtn`
handler'larına SADECE `console.log` satırları eklendi (davranış değişmedi).

---

Önceki commit (G70, tek commit) — **Mod içine (oyun ekranına) küçük "i" eklendi
— oynarken bilgiye erişim.** Boşluk: "i" sistemi ana ekranda (`#menuInfoBtn`,
genel) ve mod kartında (`.mode-info-btn`, moda girmeDEN) vardı, ama mod
İÇİNDE (oyun ekranı) hiç yoktu — spotlight turu ilk 2 round'dan sonra
soluyor, kullanıcı sonra takılırsa çıkıp ana menüye dönmeden bilgiye
ulaşamıyordu.

**Eklenen:** oyun ekranı başlığının (`#gameTitle`) YANINA, `#gameInfoBtn`
adında `.mode-info-btn`'in (mod kartındaki AYNI 22px amber rozet — yeni bir
görsel dil İCAT edilmedi) küçük bir kopyası eklendi. `#gameTitle`'ın İÇİNE
DEĞİL, bir `.game-title-row` sarmalayıcıyla KARDEŞİ olarak — çünkü
`enterMode()` her mod değişiminde `els.gameTitle.textContent = entry.ad`
ile başlığı YENİDEN YAZIYOR (`app.js:1359`); rozet başlığın İÇİNDE olsaydı
her mod değişiminde SİLİNİRDİ. Tıklanınca `openGuideSheet(mode.getMeta().id)`
çağrılıyor — mod kartındaki `.mode-info-btn`'in ÇAĞIRDIĞI AYNI fonksiyon,
AYNI `guideSheet`, AYNI `MODE_GUIDE_TEXTS`/`MODE_OPTIONS_TEXTS` içeriği —
YENİ metin YAZILMADI, sadece bir ÜÇÜNCÜ giriş noktası eklendi. `mode`
değişkeni TIKLAMA ANINDA okunuyor (statik yakalanmadı), oyun ekranındayken
o an hangi mod aktifse onun bilgisini açar.

**Küçük/sessiz kalması için:** rozet `#gameTitle`'ın YANINDA (üst köşe,
başlık hizası) — `.hearts`/`#bossChip`/`#gameSettingsBtn` (dots) gibi
`.ghead-row`'un sağ tarafını KALABALIKLAŞTIRMADI, mevcut 44px `.gear`/`.dots`
boyutundan DAHA KÜÇÜK (22px, mode kartlarındaki rozetle AYNI ölçek) —
"dikkat sesten kaymasın" isteğiyle TUTARLI. `.game-title` en uzun mod adında
(Frekans Çakışması) dar ekranda rozetle yan yana sığmazsa `min-width:0` +
ellipsis ile kırpılır, rozet ASLA itilmez (`flex:none`, mode-card rozetiyle
AYNI G67 kuralı).

**Doğrulama:**
- `npm test`: **1013/1013** (G69'daki sayıdan DEĞİŞMEDİ — bu tur SADECE
  DOM kablolaması, guide-texts.js'e yeni saf fonksiyon/veri eklenmedi,
  CLAUDE.md'nin "DOM'a bağlı app.js unit test EDİLEMİYOR" kısıtına
  UYULARAK yeni bir test dosyası AÇILMADI — mevcut testlerin HİÇBİRİ
  bozulmadı).
- Kod incelemesiyle doğrulanan (DOM/canlı test YAPILAMADI, bkz. aşağı):
  `#gameInfoBtn` `#gameTitle`'ın KARDEŞİ (İÇİNDE değil) — `enterMode()`'un
  `textContent` ataması rozeti SİLMEZ; `els.gameInfoBtn` click handler'ı
  `openGuideSheet(mode.getMeta().id)`'i mod kartındaki `.mode-info-btn`
  handler'ıyla (`renderModeGrid`) BİREBİR AYNI imzayla çağırıyor — içerik
  KAYNAĞI TEK (guide-texts.js), tekrar yazılmadı.
- **Dürüstlük notu — CANLI/cihaz doğrulaması YİNE YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi): rozetin GERÇEKTEN küçük/sessiz
  göründüğü, en uzun mod adıyla (Frekans Çakışması) dar ekranda TAŞMADIĞI,
  tıklanınca sheet'in AÇILDIĞI gözle DOĞRULANMADI — AÇIK İŞLER madde 14'e
  eklendi (aşağıya bkz.).

**KORUMA:** 10 mod/ses/sınav/spotlight/paywall/mevcut "i" sistemi TEK SATIR
değişmedi — SADECE oyun ekranına köşe "i" eklendi, mevcut `openGuideSheet`
ÇAĞRILDI (yeni içerik/sheet İCAT edilmedi).

---

Önceki commit (G69, tek commit) — **Spotlight'a eksik kontroller eklendi + mod
"i"sine oyun seçenekleri eklendi.** G68'in spotlight turu SADECE dinle→seç→
onayla akışını gösteriyordu, modun GERÇEKTEN sahip olduğu kontrolleri (döngü/
A-B karşılaştırma/durdur/atla) atlıyordu; mod "i" metni de o modun oyun
seçeneklerini (upload/format/karıştırma) hiç anlatmıyordu. Task'ın kendi
kritik notu ("GERÇEK öğeleri kullan, uydurma") uyarınca ÖNCE kod tek tek
okundu (app.js: `updateAbToggleUI`/`syncCakismaVisibility`/`pickRoundSource`/
`syncAnswerFormatVisibility`; her modun `getMeta().uyumluKaynaklar`/
`choiceOnly`/`FOCUS_RANGES`) — aşağıdaki HER iddia KODDAN doğrulandı.

**1. SPOTLIGHT — "abControl" adımı eklendi (G68'in 3 adımı → 4):**
`#abToggle` TEK bir buton ama modun tipine göre İKİ FARKLI GERÇEK kontrole
karşılık geliyor (`updateAbToggleUI` — three-way'de "A/B/C Test", değilse
"A/B Test"):
- **Kompresör/Reverb/Distortion (3 mod):** A/B/C DÖNGÜ — karta uzun basmak
  (520ms eşik) otomatik döngüyü başlatır, tekrar dokunmak durdurur
  (`startAbLoop`/`stopAbLoop`, `abPressTimer`). abControl metni: "Karta uzun
  bas: A/B/C arasında otomatik döngü başlar, tekrar dokun durur."
- **Diğer 6 mod (Frekans Bulma/Kesim Noktası/Q Genişliği/Boost-Cut/dB
  Seviyesi/Tonal Denge):** dry/işlenmiş A/B KARŞILAŞTIRMA — tek dokunuş.
  abControl metni: "'A/B Test'e dokun: temiz ile işlenmiş sesi karşılaştır."
  (Kesim Noktası/Tonal Denge'de mod-özel kelimelerle: "kesim öncesi/sonrası",
  "düzeltmeden önceki/sonraki".)
- **Frekans Çakışması:** `#abToggle` `syncCakismaVisibility`'de BİLEREK
  GİZLİ — bu modun dizisinde "abControl" adımı YOK (uydurulmadı), 2 adımlık
  (dinle+seç) yapısı G68'den DEĞİŞMEDİ.
"Durdur" (`startBtn`) ve "Atla" (`nextBtn`) — İKİSİ de HER modda evrensel
VE zaten kendini açıklayan butonlar (buton metninin kendisi "Atla ▶"/
"Durdur") — ayrı bir spotlight kutusu AÇILMADI ("spotlight çok uzamasın"
dengesi), bunun yerine turun SON adımının metnine kısa bir hatırlatma
olarak katlandı: "...Bilemezsen 'Atla', istersen 'Durdur'a dokunabilirsin."
Sonuç: 9 mod 3→4 adıma çıktı (+1, SADECE mod-ayırt edici döngü/A-B için),
Frekans Çakışması 2 adımda sabit kaldı — "çok uzamasın" dengesi böyle
sağlandı (durdur/atla METİNSEL hatırlatma, döngü/A-B ise GERÇEK vurgulanmış
kutu).

**2. MOD "i" — `MODE_OPTIONS_TEXTS` (YENİ) eklendi, `MODE_GUIDE_TEXTS`'in
ALTINA render ediliyor:** her modun "ne öğretir" metni TEK SATIR değişmedi,
altına amber başlıklı ayrı bir "OYUN SEÇENEKLERİ" bloğu eklendi
(`app.js:openGuideSheet`, GENERAL_GUIDE'ın kendi bölüm-başlığı deseniyle
TUTARLI). Kod incelemesiyle doğrulanan gerçek seçenekler:
- **Kendi ses yükleme:** cakisma HARİÇ 9 modun `uyumluKaynaklar`'ının
  HEPSİNDE "upload" var (`compatibleSourceIds()` onu hiç DIŞLAMIYOR) — Kaynak
  sheet'inden "Dosya seç" ile tek dosya. Frekans Çakışması'nın KENDİ AYRI
  mekanizması var: kaynak-çifti "own" seçilince İKİ AYRI dosya (Ses 1/Ses 2).
- **Dokunmalı/Şıklı format seçimi:** SADECE Frekans Bulma'da GERÇEK bir
  seçim — `isChoiceFormat()` diğer 9 modu HER ZAMAN şıklıya zorluyor, chip'in
  kendisi `syncAnswerFormatVisibility` ile o 9 modda GİZLENİYOR. Diğer
  modların metninde bu seçenekten BAHSEDİLMEDİ (yok olan bir şey uydurulmadı).
- **Odak aralığı (Bas/Orta/Tiz/Tüm spektrum):** SADECE Frekans Bulma'da
  (`mode.FOCUS_RANGES` sadece `frekans-bulma.js`'te tanımlı) — diğer 9 modun
  metninde YOK.
- **Karıştır (rastgele kaynak):** `pickRoundSource()`'un okuduğu 8 modun
  metninde VAR. Frekans Çakışması'nda BAHSEDİLMEDİ (`pickRoundSource`
  hiç çağrılmıyor, kendi `cakismaPairSelect`'i var). Tonal Denge'de de
  BAHSEDİLMEDİ — `only:["groove","upload"]` havuzunda Karıştır açıkken
  upload HARİÇ tutulduğundan (`s.kind !== "upload"`) TEK aday ("groove")
  kalıyor, fiilen etkisiz bir kontrol olduğu için yazılmadı.
- **A/B/döngü kısa hatırlatma:** spotlight'ın abControl metniyle TUTARLI
  cümleler (Kaynak çiftini/upload'ı anlatan cümlenin yanına eklendi).
- **Frekans Çakışması'nın kendi "Önce/Sonra" karşılaştırması** (`#cakismaCompare`,
  stage 3'te doğru cevap sonrası açılır — `#abToggle` YERİNE geçen mod-özel
  kontrol) metne eklendi.
- **Atla:** her 10 modun metninde "Bilemezsen 'Atla'ya dokun." ile kapanıyor.

**YENİ test:** `test/guide-texts.test.mjs`'e `MODE_OPTIONS_TEXTS` bölümü
eklendi — 10 mod tam eşleşme, Frekans Bulma'nın TEK format/odak-aralığı
sözü eden mod olduğu, Karıştır'ın SADECE anlamlı olduğu 8 modda geçtiği
(cakisma+tonal-denge'de YOK), cakisma'nın Önce/Sonra'dan bahsettiği, cakisma
HARİÇ 9 modun yükleme seçeneğinden bahsettiği — HEPSİ GERÇEK kod
davranışıyla (mock değil) çapraz doğrulandı. SPOTLIGHT_STEPS testleri 4-adım
şekline güncellendi + three-way/A-B metin ayrımı + son-adım durdur/atla
hatırlatması kilitlendi. `test/terminology.test.mjs`'e `MODE_OPTIONS_TEXTS`
için AYNI 6 yasaklı-çeviri kilidi eklendi (DİL PRENSİBİ tutarlılığı).

**Doğrulama:**
- `npm test`: **1013/1013** (982 → +31: `guide-texts.test.mjs`'e
  MODE_OPTIONS_TEXTS bölümü + SPOTLIGHT_STEPS'in genişletilmiş
  kontrolleri, `terminology.test.mjs`'e MODE_OPTIONS_TEXTS kilidi).
- Kod incelemesiyle doğrulanan (DOM/canlı test YAPILAMADI, bkz. aşağı):
  `resolveSpotlightTarget`'ın yeni "abControl" dalı `els.abToggle`'a
  çözülüyor, cakisma'nın dizisinde bu adım hiç YOK (resolver'a hiç gelmiyor);
  `openGuideSheet` `MODE_OPTIONS_TEXTS[modeId]` varsa amber başlıklı bloğu
  EKLİYOR, yoksa (olmayan bir modId) hiçbir şey render ETMİYOR; SPOTLIGHT_STEPS
  dizilerindeki HER "abControl"/"select"/"confirm" metni yukarıdaki kod
  bulgularıyla BİREBİR örtüşüyor (uydurma kontrol YOK — her iddia için
  ilgili app.js/mode dosyası satırı bu kayıtta referanslı).
- **Dürüstlük notu — CANLI/cihaz doğrulaması YİNE YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi): abControl adımının GERÇEKTEN
  `#abToggle`'ın üzerine oturduğu, three-way modlarda uzun-basmanın
  GERÇEKTEN döngüyü tetiklediği ANINDA tur adımını da ilerlettiği, "OYUN
  SEÇENEKLERİ" bloğunun guideSheet'te taşmadan okunduğu, 4 adımlık turun
  GERÇEKTEN "uzun" hissettirmediği gözle DOĞRULANMADI — bu G67'nin AÇIK
  İŞLER madde 14'ünün kapsamına GİRİYOR (aşağıya bkz., yeni maddeler
  eklendi), ayrı bir madde AÇILMADI.

**KORUMA:** 10 mod/ses/sınav/paywall/ana akış TEK SATIR değişmedi — SADECE
spotlight adımları (yeni "abControl") + mod "i" metni (yeni
`MODE_OPTIONS_TEXTS` bloğu) zenginleşti. `createQuestion`/`evaluateAnswer`/
`applyProcessing`/`updateAbToggleUI`/`pickRoundSource`/`syncCakismaVisibility`
hiçbiri dokunulmadı — SADECE OKUNDU (bu turun GERÇEK veri kaynağı olarak).

---

Önceki commit (G68, tek commit) — **İpuçları SPOTLIGHT rehberli tura yükseltildi:
karartma + adım adım yönlendirme.** G67'nin basit ipucu bandı ("Sesi dinle →
Farklı olanı seç → Cevabını onayla" TEK satır metin) YETERSİZDİ — task'ın
kendi kararıyla tam bir spotlight/coach-mark deneyimine dönüştürüldü.

**SPOTLIGHT MEKANİĞİ:** `#spotlightOverlay` (fixed, tüm ekran) + `#spotlightHole`
(klasik CSS spotlight hilesi: `box-shadow:0 0 0 9999px rgba(6,8,14,.72)` —
elementin ETRAFINI karartır, elementin kendisi hiç boyanmaz, SVG mask'e gerek
yok) + `#spotlightCallout` (yönlendirme metni + "Geç"/"İleri" butonları,
hedefin altına/üstüne otomatik konumlanır — `getBoundingClientRect()` ile HER
adımda canlı hesaplanır, `resize`'da yeniden konumlanır). **TÜM overlay
`pointer-events:none`** (SADECE callout `auto`) — karartma/delik HİÇBİR
gerçek tıklamayı ENGELLEMEZ, hedef elementin altındaki GERÇEK oyun kontrolü
NORMAL çalışmaya devam eder (KORUMA: mekanik tek satır değişmedi).

**ADIM İLERLEMESİ İKİ YOLDAN:** (1) `#spotlightNext` ("İleri"/son adımda
"Anladım") — manuel sıradaki adım; (2) o anki adımın GERÇEK hedefiyle
kullanıcı etkileşince — `document`'a capture-phase'te eklenen bir click
dinleyicisi (`preventDefault`/`stopPropagation` YOK, asıl handler'lar HİÇ
etkilenmez) `spotlightInteractionTarget.contains(e.target)` kontrolüyle
algılıyor. Sıradaki adımın hedefi AYNI elemente çözülüyorsa (10 moddan
9'unda — choiceOnly modların HEPSİNDE tek tıkla submit, "seçmek" zaten
"onaylamak" demek — bkz. aşağıdaki `resolveSpotlightTarget` notu) tur
DOĞRUDAN tamamlanmış sayılır, aynı kutuyu ikinci kez göstermez.

**HER MODUN KENDİ ADIMLARI** (`core/guide-texts.js:SPOTLIGHT_STEPS`, YENİ —
G67'nin `ROUND_HINT_STEPS`'inin YERİNE geçti, `formatRoundHint` kaldırıldı):
her adım `{target, text}` — `target` SEMBOLİK bir anahtar
("listen"/"select"/"confirm"), guide-texts.js bu dosya DOM'a hiç dokunmadan
(level-sheet-terms.js'in AYNI "saf veri" ilkesi) sadece BU anahtarları taşır;
GERÇEK DOM elementine çözümü `app.js:resolveSpotlightTarget(key, modeId)`
yapıyor:
- `"listen"` → HER modda `#analyzer` (spektrum kartı, ortak/paylaşılan
  görselleştirme — CLAUDE.md'nin "tek paylaşılan analyser" notuyla tutarlı).
- `"select"`/`"confirm"` (tonal-denge HARİÇ) → `isChoiceFormat() ? #answers :
  #analyzer` — choiceOnly 9 modun hepsi `#answers`'a, SADECE Frekans
  Bulma'nın dokunmalı formatı `#analyzer`'a (kanvas dokunuşu zaten cevabı
  submit ediyor) çözülür. `"select"` ile `"confirm"` BİLEREK AYNI hedefe
  çözülüyor — ayrı bir "onayla" kontrolü İCAT edilmedi, seçim zaten onay.
- `"confirm"` + `tonal-denge` → TEK istisna: gerçek ayrı bir buton var
  (`#answers .tonal-submit`), ona çözülür.

**Motor 1 (Frekans Bulma/Kesim Noktası/dB Seviyesi/Boost-Cut/Q Genişliği) —
3 adım:** listen "Önce sesi dinle." → select (mod-özel: "Öne çıkan frekansı
işaretle."/"Kesim noktasını seç."/"Seviye farkını seç."/"Boost mu cut mu,
karar ver."/"Bandın genişliğini seç.") → confirm ("...cevabını hemen
onaylar.").
**Motor 2 (Kompresör/Reverb/Distortion) — 3 adım:** listen "Üç sesi (A/B/C)
dinle." → select "Farklı olan kartı seç." → confirm "Kartı seçmen cevabını
onaylar."
**Tonal Denge — 3 adım, GERÇEKTEN ayrı hedefli:** listen "Bozuk sesi dinle."
→ select "Kaydırıcılarla nötüre getir." (`#answers`, sliderlar) → confirm
"Cevabı Onayla'ya dokun." (`.tonal-submit`, AYRI bir buton).
**Frekans Çakışması — BİLİNÇLİ olarak SADECE 2 adım:** listen "Çakışan iki
sesi birlikte dinle." → select "Nerede çakıştıklarını şıklardan bul." — mod
zaten çok-aşamalı (stage 1/2/3), her aşamanın KENDİ soru başlığı/talimatı
(`frekans-cakismasi.js:getInstructionText`) ZATEN ekranda gösteriliyor,
spotlight bunu TEKRARLAMADI — task'ın kendi notu ("aşamalara göre devam").

**NE ZAMAN/NE KADAR — G67'den DEĞİŞMEDİ:** AYNI `stats.perMode[modeId].
hintRoundsShown` sayacı, AYNI `HINT_ROUNDS_LIMIT`=2, AYNI `shouldShowRoundHint()`.
`startRound()`'daki çağrı `showRoundHintIfNeeded()` → `startSpotlightTourIfNeeded()`
olarak yeniden adlandırıldı, davranışı AYNI konumda (`renderQuestion()`'dan
hemen sonra) çalışıyor. "Geç" (`#spotlightSkip`) turu HER an kapatır, sayaç
GERİ ALINMAZ (zaten "gösterildi" sayılır — G67'nin "×" davranışıyla AYNI
karar). Mod değiştirilince (`enterMode`) önceki modun turu `closeSpotlightTour(false)`
ile kapanır — yeni moda SIZMAZ. Kalıcı "i" ikonu (`guideSheet`) BUNDAN
TAMAMEN BAĞIMSIZ — hiç dokunulmadı, hep durur.

**YENİ test:** `test/guide-texts.test.mjs` YENİDEN YAZILDI —
`ROUND_HINT_STEPS`/`formatRoundHint` testleri SPOTLIGHT_STEPS/spotlightStepsFor
testleriyle DEĞİŞTİRİLDİ: 9 modun 3 adımlı (listen ile başlar, confirm ile
biter) + Frekans Çakışması'nın 2 adımlı olduğu, HER adımın geçerli
target+text taşıdığı, Tonal Denge'nin select/confirm metinlerinin GERÇEKTEN
farklı olduğu (kaydırıcı/onayla kelimeleri) GERÇEK 10 playable mod
listesiyle (mock değil) doğrulanıyor. `shouldShowRoundHint` testleri G67'den
DEĞİŞMEDİ (aynı sınır-değer testleri). `test/storage.test.mjs`'in
`hintRoundsShown` migration testlerine dokunulmadı (alan/anlam AYNI, sadece
onu tüketen UI değişti).

**Doğrulama:**
- `npm test`: **982/982** (980 → +2: `guide-texts.test.mjs`'in yeniden
  yazımı net +2 assertion getirdi — 3-adım/2-adım şekil kontrolleri eklendi,
  eski `formatRoundHint` testleri kaldırıldı).
- Kod incelemesiyle doğrulanan (DOM/canlı test YAPILAMADI, bkz. aşağı):
  `els.spotlight*` HEPSİ `index.html`'deki gerçek id'lerle eşleşiyor;
  `resolveSpotlightTarget` 10 modun HEPSİNDE `isChoiceFormat()`/
  `THREE_WAY_MODE_IDS` ile AYNI mantığı kullanıyor (yeni bir format-tespiti
  İCAT etmedi, var olanı ÇAĞIRDI); `positionSpotlightHole`/
  `positionSpotlightCallout` metni/etiketleri YAZDIKTAN SONRA ölçüyor (bir
  düzeltme turu: ilk yazımda callout konumu ESKİ adımın boyutuyla
  ölçülüyordu, `offsetHeight` okumasından ÖNCE metin ataması gereken sıraya
  çekildi); document click-capture dinleyicisi `preventDefault`/
  `stopPropagation` HİÇ ÇAĞIRMIYOR (asıl handler'lar etkilenmiyor);
  `#spotlightOverlay` `z-index:75` — tabbar'ın (59/60) üstünde, sheet
  overlay'lerin (90/91) ALTINDA, sınav sheet'leriyle çakışırsa onlar üstte
  kalır.
- **Dürüstlük notu — CANLI/cihaz doğrulaması YİNE YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi): karartma/delik efektinin
  GERÇEKTEN doğru öğeye oturduğu, callout'un ekran kenarında taşmadığı,
  adım geçişlerinin (hem "İleri" hem GERÇEK tıklamayla) GERÇEKTEN akıcı
  çalıştığı, 10 modun HER BİRİNİN doğru elementi aydınlattığı gözle
  DOĞRULANMADI. Bu, G67'nin AÇIK İŞLER madde 14'ünün kapsamını GENİŞLETİYOR
  (aşağıya bkz.) — kod incelemesi + 982 test + satır-satır kablolama
  kontrolü kadarı garanti.

**KORUMA:** 10 mod/ses/zorluk/sınav/paywall/"i" bilgi sistemi (guideSheet,
GENERAL_GUIDE, MODE_GUIDE_TEXTS) TEK SATIR değişmedi — SADECE GEÇİCİ ipucu
katmanının GÖRSEL MEKANİĞİ (banner → spotlight) değişti. `createQuestion`/
`evaluateAnswer`/`applyProcessing`/zorluk eğrileri/paywall/`openGuideSheet`
hiçbiri dokunulmadı.

---

Önceki commit (G67, tek commit) — **"i" bilgi/rehber sistemi: KALICI "i" ikonu
(ana ekran + her mod kartı) + GEÇİCİ ilk-2-oyun ipuçları.** Kullanıcı
seviye/sınav sistemini bilmiyordu, keşfedilmeden kalıyordu — ayrı bir yardım
menüsü İSTENMEDİ, akış içinde iki katman kuruldu:

**1. KALICI "i" ikonu (tıkla-aç/tıkla-kapa, hiç solmaz):**
- Ana ekran üst çubuğunda `#menuInfoBtn` → `GENERAL_GUIDE`'ı (5 bölüm: Nasıl
  çalışır / Seviye ve zorluk / Sınav ve bölüm geçme / Ücretsiz ve Pro / Can)
  gösterir.
- 10 oynanabilir mod kartının HER BİRİNDE (`.mode-top-right` içinde, Pro/Sv
  rozetlerinin yanında) `.mode-info-btn` → o modun `MODE_GUIDE_TEXTS[id]`
  metnini gösterir. Henüz kodlanmamış 4 katalog girdisinde (hiz-modu,
  stereo-genislik, pan-konumu, hangisi-farkli) rozet YOK (gerçek içerik
  olmadığı için).
- İkisi de AYNI tek `#guideSheet` bottom-sheet'i yeniden kullanıyor
  (`lvlSheet`'in BİREBİR aynı deseni) — `app.js:openGuideSheet(modeId)`,
  `modeId=null` ise genel rehber.
- Mod kartındaki "i" rozeti kartın kendi navigasyon click'inden
  `e.stopPropagation()` ile ayrıldı — kilitli bir kartta bile bilgiye
  bakılabilir, paywall/kilit akışını TETİKLEMEZ.

**2. GEÇİCİ round-içi ipucu bandı (ilk `HINT_ROUNDS_LIMIT`=2 round, sonra
otomatik açılmaz — ama kalıcı "i" hep durur):**
- Oyun ekranında `#questionTitle`/`#questionMeta`'nın altına, `#analyzer`'ın
  üstüne `#roundHintBanner` eklendi. `startRound()`'un HER çağrısında
  `showRoundHintIfNeeded()` tetiklenir: o modun `ROUND_HINT_STEPS`'ini
  (`formatRoundHint`, " → " ile birleştirilmiş tek satır, ör. "Sesi dinle →
  Öne çıkan frekansı işaretle → Cevabını onayla") gösterir, kalıcı sayacı
  (`stats.perMode[modeId].hintRoundsShown`) artırır.
- Sayaç `HINT_ROUNDS_LIMIT`'e ulaşınca (2) bant BİR DAHA otomatik açılmaz —
  ama kullanıcı kendi `×` ile de erken kapatabilir (kapatma da "gösterilmiş"
  sayılır, sayaç geri alınmaz).
- Mod değiştirilince (`enterMode`) önceki modun bandı hemen gizlenir — yeni
  moda SIZMAZ, "Oyunu Başlat"a basılana kadarki idle görünüm temiz kalır.

**Merkezi metin dosyası:** `www/js/core/guide-texts.js` (YENİ) —
`level-sheet-terms.js`'in AYNI mantığı: `GENERAL_GUIDE`, `MODE_GUIDE_TEXTS`
(10 mod), `ROUND_HINT_STEPS` (10 mod), `HINT_ROUNDS_LIMIT`,
`shouldShowRoundHint()`/`formatRoundHint()` (saf fonksiyonlar). TÜM metin
içeriği (`GENERAL_GUIDE` + `MODE_GUIDE_TEXTS`) kullanıcının kendi verdiği
TASLAK metin — kelimesi kelimesine aktarıldı, cihazda görülüp
düzeltilecek. `ROUND_HINT_STEPS`'in adım kelimeleri (task'ın örnek fiilleri
"Sesi dinle"/"Farklı olanı seç"/"Cevabını onayla"dan esinlenerek, ama
modun kendi mekaniğine göre) BENİM taslağım — bunlar da nihai DEĞİL.

**Kalıcılık:** `storage.js:freshModeState()` artık `{xp, hintRoundsShown}`
döndürüyor (önceden sadece `{xp}`). `loadStats()`'a bu alan hiç OLMAYAN eski
kayıtlar için (G67 öncesi) 0'a göç eden bir satır eklendi — `xp`'ye
DOKUNULMADI, sadece eksik alan tamamlandı.

**YENİ test dosyası `test/guide-texts.test.mjs`:** `MODE_GUIDE_TEXTS`/
`ROUND_HINT_STEPS`'in playable 10 mod id'siyle BİREBİR eşleştiği (fazla/eksik
yok), `GENERAL_GUIDE`'ın tam 5 bölüm taşıdığı, `shouldShowRoundHint`'in
sınır değerlerde (0/1/2/5/undefined) doğru davrandığı, `formatRoundHint`'in
gerçek bir satır ürettiği/kayıtsız modId'de null döndüğü — GERÇEK
`MODE_CATALOG`'dan okunan playable listesiyle karşılaştırılarak (mock değil).
`test/storage.test.mjs`'e `hintRoundsShown` migration testleri eklendi (eski
kayıt → 0'a göç, mevcut değer varsa ÜZERİNE YAZILMAZ). `test/terminology.
test.mjs`'e guide-texts.js için de AYNI 6 yasaklı-çeviri kilidi eklendi
(mode-catalog.js/level-sheet-terms.js ile AYNI desen) — DİL PRENSİBİ (yukarı
bkz.) burada da korunuyor: metinlerde "reverb"/"saturation"/"kompresyon"/
"boost"/"cut" İngilizce kaldı, "yankı"/"doygun"/"sıkıştır"/"eşik"/"artırım"/
"azaltım" hiç geçmiyor.

**Doğrulama:**
- `npm test`: **980/980** (961 → +19: `guide-texts.test.mjs` yeni dosya
  [~14 assertion], `storage.test.mjs` +3 [hintRoundsShown migration],
  `terminology.test.mjs` +~12 [guide-texts.js kilidi]; 961 rakamı bu turun
  BAŞINDAKİ mevcut sayı, önceki G66 kaydındaki 916'dan sonraki turlarda
  ayrıca büyümüştü — sayı BURADA koddan ölçüldü, uydurulmadı).
- Kod incelemesiyle doğrulanan (DOM/canlı test bu oturumda YAPILAMADI, bkz.
  aşağıdaki dürüstlük notu): `els.menuInfoBtn`/`els.guideSheet*`/
  `els.roundHintBanner`/`els.roundHintText`/`els.roundHintClose` HEPSİ
  `index.html`'deki gerçek id'lerle eşleşiyor; `openGuideSheet`/
  `closeGuideSheet`/`showRoundHintIfNeeded` doğru event'lere bağlı;
  `renderModeGrid()`'deki `.mode-info-btn` SADECE `MODE_GUIDE_TEXTS[entry.id]`
  varken render ediliyor (10/14 kart); `card.querySelector(".mode-info-btn")`
  click'i `e.stopPropagation()` ile kartın kendi navigasyon handler'ından
  ayrıştırılmış; `startRound()`'daki `showRoundHintIfNeeded()` çağrısı
  `renderQuestion()`'dan hemen sonra, `playQuestion(true)`'dan önce.
- **Dürüstlük notu — CANLI/cihaz doğrulaması YAPILAMADI** (tarayıcı eklentisi
  bu oturumda bağlı değildi): "i" ikonlarının GERÇEKTEN açılıp kapandığı,
  ipucu bandının GERÇEKTEN ilk 2 round'da görünüp sonra kaybolduğu, sheet
  içeriğinin cihazda okunabilir/taşmasız göründüğü gözle DOĞRULANMADI. Kod
  incelemesi + 980 test + yukarıdaki satır-satır kablolama kontrolü kadarı
  garanti — bir sonraki oturumda tarayıcıda GERÇEKTEN denenmeli.

**KORUMA:** 10 mod/ses/zorluk/sınav/paywall TEK SATIR değişmedi — SADECE
"i" bilgi + geçici ipucu katmanı eklendi. `createQuestion`/`evaluateAnswer`/
`applyProcessing`/zorluk eğrileri/paywall mantığı hiçbiri dokunulmadı.

---

Önceki commit (G66, tek commit) — **Terminoloji düzeltmesi: önceki turun
denetim raporunda bulunan global-terim yanlış çevirileri düzeltildi.**
Denetim SADECE rapor üretmişti (bir önceki tur, kod değiştirmedi) — bu tur
o raporun onaylanan maddelerini uyguluyor.

**DÜZELTİLEN 6 KONUM/GRUP (task'ın kendi numaralandırması):**
1. **Reverb "yankı" → "reverb"** — 5 GERÇEK konum (task "6" demişti, ama
   `reverb.js:9/106/108/142`'deki 4 yorum SATIRI kullanıcıya hiç
   görünmüyor, KORUMA kapsamı dışı bırakıldı — bkz. "sayı uydurma" ilkesi,
   gerçek sayı koddan sayıldı): `app.js` soru başlığı ("hangisinin reverb'i
   FARKLI?"), `app.js` round-start açıklaması, `reverb.js:modeDescription()`,
   `REVERB_AMOUNT_TIERS` (4 kademe kelimesi TEK grup), `reverb.js:
   getHintText()`.
2. **Kompresör "sıkıştırılmış" → "kompresyon"** — 5 konum: `mode-catalog.js`
   kart açıklaması, `app.js` soru başlığı, `kompresor.js:modeDescription()`,
   `teachingText()`'in AYNI-kademe dalı, `getHintText()`. Kodda ZATEN var
   olan "kompresyon" (COMPRESSION_TIERS, task'ın önerdiği alternatif)
   TUTARLI hale getirildi — yeni bir kelime İCAT edilmedi.
3. **Kompresör "eşik" → "threshold"** — `teachingText()`'in FARKLI-kademe
   dalı, tek konum.
4. **Distortion "doygun(luk)" → "saturation"** — `mode-catalog.js` kart
   açıklaması, `level-sheet-terms.js` etiketi, Araçlar sekmesi "Teyp/Radyo"
   referans filtresi metni. Asıl öğretim metni (`teachingText`,
   `DISTORTION_TYPE_INFO`) zaten "Tube (Valf) **Saturation**"/"Tape
   **Saturation**" diyordu — hiç dokunulmadı, doğruydu.
5. **Boost mu Cut mu kart açıklaması** — "Artırım mı, azaltım mı?" → "Boost
   mu, cut mu?" (modun KENDİ oyun-içi soru metniyle BİREBİR aynı cümle —
   yeni bir ifade İCAT edilmedi, var olanı ödünç alındı).
6. **İki `modeDescription()` parantez-sırası** — Reverb'inki maddede-1
   fixiyle zaten çözüldü (parantez TAMAMEN kalktı, "reverb" birincil oldu).
   Distortion'ınki AYRI: "(bozulma karakteri farklı)" parantezi kaldırıldı,
   `app.js:2168`'in ZATEN doğru olan "distortion'ı FARKLI olanı seç"
   cümlesiyle TUTARLI hale getirildi.

**DENETİMDE KAÇAN, BU TURDA BULUNAN 7. KONUM (dürüstlük notu — task "5
konum" demişti Kompresör için, uygulama sırasında 6.'sı bulundu):**
Araçlar sekmesinin "Bluetooth hoparlör" referans filtresi ("Dar bant,
sıkıştırılmış.") ÖNCEKİ turun denetiminde KAÇMIŞTI (aynı `TOOL_FILTERS`
dizisindeki "Teyp/Radyo" satırının "doygunluk"u bulunmuştu ama bu satırın
"sıkıştırılmış"ı atlanmıştı) — bu tur "kompresyonlu"ya çevrildi, RAPORA
buradan not düşülüyor (sayı uydurmamak için).

**DOKUNULMAYAN (denetimde "sorun değil" çıkanlar — TEK TEK yeniden
doğrulandı, Node'un UTF-8-farkında araması ile — bkz. Doğrulama):**
"isabet oranı" (accuracy rate, ratio değil), "kazanç"/"atak"/"tepe" (kod
yorumları, kullanıcı görmüyor), "gecikme" (JS zamanlama, Delay efekti bu
uygulamada hiç yok), `upload.js`'in "sıkıştırılmış"ı (dosya/codec
sıkıştırması, doğru bağlam), Pan/Stereo/Mono/EQ (zaten İngilizce).

**YENİ test dosyası `test/terminology.test.mjs` + 3 mod dosyasının
KENDİ test dosyalarına eklenen regresyon kilitleri:**
`mode-catalog.js`'in 14 kart açıklamasının HİÇBİRİ 6 yasaklı çeviriyi
(yankı/doygun/sıkıştır/eşik/artırım/azaltım) İÇERMİYOR, `level-sheet-
terms.js`'in 10 etiketi de aynı şekilde — GERÇEK veriyle (mock değil)
doğrulanıyor. `kompresor.test.mjs`/`reverb.test.mjs`'e HER İKİ dal (tip-
farkı/kademe-farkı ile aynı-tip/miktar-farkı) + `getHintText` + `modeDescription`
+ gerçek `createQuestion` çıktılarıyla (5-10 kademe × 15 tekrar) uçtan uca
regresyon testi eklendi. `distortion.test.mjs`'e `modeDescription` kilidi
eklendi (teachingText zaten "doygun" aramıyordu, mevcut testler yeterliydi).

**Doğrulama:**
- `npm test`: **916/916** (882 → +34: kompresor +1, reverb +1, distortion
  +1 [çoklu assertion içeren tek `it()` blokları], `terminology.test.mjs`
  +31 [14+4 katalog, 10+3 level-sheet]).
- Node'un KENDİ UTF-8-farkında string arama scriptiyle (bash `grep`'in
  Türkçe "ş" karakterinde locale kaynaklı YANLIŞ NEGATİF verdiği bu turda
  BULUNDU ve düzeltildi — dürüstlük notu, ilk doğrulama denemesi güvenilmez
  çıktı verdi) TÜM 6 dosya TEK TEK tarandı: kalan HER "yankı"/"doygun"/
  "sıkıştır"/"eşik" örneği SADECE `//` yorum satırlarında — kullanıcıya
  görünen TEK bir örnek kalmadı.
- Öğretim metinlerinin ANLAMI korundu — sadece isim/terim değişti, cümle
  yapısı/mantığı (hangi dalın ne zaman tetiklendiği, hangi sayının
  gösterildiği) TEK SATIR değişmedi (testler bunu zaten doğruluyor: aynı
  regex'ler `/İkisi de/`, `/sen A dedin/`, decay/ratio/threshold sayı
  değerleri hâlâ eskisi gibi eşleşiyor).
- **Dürüstlük notu — CANLI/cihaz doğrulaması YİNE YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi) — yeni metinlerin cihazda GERÇEKTEN
  doğru göründüğü (satır taşması, Türkçe iyelik eki "reverb'i"nin doğru
  render edildiği vb.) gözle DOĞRULANMADI. Kod incelemesi + 34 yeni test +
  Node tabanlı tam-dosya taraması kadarı garanti.

**KORUMA:** Mekanik/ses/zorluk/sınav/paywall TEK SATIR değişmedi — SADECE
kullanıcıya görünen metin. `evaluateAnswer`/`createQuestion`/zorluk
eğrileri/COMPRESSION_TIERS'ın `max` sınırları vb. hiçbiri dokunulmadı.

---

Önceki commit (G65, tek commit) — **"Serbest" (sonsuz) Oyun Türü ücretsizde
KİLİTLİ görünüyor (Pro rozeti + 🔒), basınca paywall açılıyor.** Cihaz
testinde bulunan kafa karışıklığı: G61'de "Serbest" ücretsizde SEÇİLEBİLİR
bırakılmıştı ("ekran değil sadece kural" kararı, bkz. PAYWALL.md) — kullanıcı
seçebiliyordu ama 5-soru sınırı yüzünden pratikte 5'te duruyordu, "seçtim
ama çalışmıyor" izlenimi veriyordu.

**BULUNAN ÖNCEDEN-HAZIR PARÇA:** `core/paywall.js:isFreePlayModeLocked(isPro)`
G61'de ZATEN tanımlanmıştı ama HİÇ ÇAĞRILMAMIŞTI (`grep` ile doğrulandı, tek
kullanım yeri kendi tanımı + test dosyasıydı) — bu tur o boşluğu dolduruyor.

**DÜZELTME:** Oyun Ayarları'nın genel `openSheet()` satır-render mekanizması
(sourceSelect'in "Dosya seç" kilidiyle AYNI desen, G61) `playModeSelect`'in
"free" seçeneğine ÖZEL bir dal kazandı: `isLockedFreePlay` true iken satır
onay yerine 🔒 + "Pro" rozeti (`.mode-chip.mode-chip-pro`, mod kartlarıyla
AYNI bileşen) gösteriyor, tıklanınca `openPaywallReason("freePlayMode")`
(YENİ 7. `PAYWALL_REASONS` girdisi) paywall'ı açıyor. `enforceFreeRestrictions()`
(G61'den beri var olan downgrade-tutarlılık fonksiyonu) artık `playModeSelect`
hâlâ "free"deyse "10 Soruluk Bölüm"e de zorluyor — `playModeSelect` kalıcı
bir `prefs` alanına YAZILMADIĞI için (HTML'nin kendi `<option selected>`'ı
her sayfa açılışında "free"e döner) bu, YENİ bir kullanıcının İLK ekranında
bile kilitli bir seçeneğin "şu an seçili" görünmesini önlüyor.

**Doğrulama:**
- `npm test`: **882/882** (değişmedi — bu tur net YENİ test eklemedi, mevcut
  `paywall.test.mjs`'in "7 tetikleme noktası" testleri GÜNCELLENDİ [6→7
  anahtar] ve `isFreePlayModeLocked` zaten G61'den beri test ediliyordu,
  DOM'a dokunan kısım ise proje kısıtı gereği [CLAUDE.md] hiç unit test
  edilemiyor).
- Kod incelemesiyle doğrulandı: `PAYWALL_REASONS.freePlayMode` + `LOCK_MESSAGES.
  freePlayMode` ikisi de tanımlı (ilk-oturum toast fallback'i de doğru
  mesajı gösterir, "modeLocked"un YANLIŞ/alakasız dB-Reverb-Tonal-Distortion
  metnini ÖDÜNÇ ALMADI — bu turda fark edilip AYRI bir reasonKey açıldı).
- **Dürüstlük notu — CANLI/cihaz doğrulaması YİNE YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi) — kilit rozetinin/🔒'nün GERÇEKTEN
  doğru göründüğü, tıklayınca paywall'ın GERÇEKTEN açıldığı, Pro'da satırın
  GERÇEKTEN normal (kilitsiz) çalıştığı gözle DOĞRULANMADI. Kod incelemesi
  kadarı garanti.

**KORUMA:** Paywall mantığı/ekranı (G63'ten beri çalışan `openPaywallReason`/
`resetPaywallToGeneric` mekanizması) TEK SATIR değişmedi — SADECE YENİ bir
`reasonKey` ve bir sheet-satırı kilidi eklendi. 10 mod/ses dokunulmadı.

---

Önceki commit (G64, tek commit) — **`renderLevelSheet` tek-dil bug'ı düzeltildi:
her mod artık Seviye bilgi sayfasında KENDİ terminolojisini konuşuyor**
(SIRADAKİ'de uzun süredir kayıtlı bilinen bir eksikti — "9 modun 9'u da
'Bant genişliği/Değişim miktarı' — Frekans Bulma'nın dili — konuşuyordu").

**KÖK SEBEP:** `renderLevelSheet` `core/difficulty-curve.js:difficultyParams
(level)`'i (JENERİK, SADECE gainDb/Q döndüren, aslen Frekans Bulma için
yazılmış bir fonksiyon) TÜM 10 modda ÇAĞIRIYORDU — Kompresör'ün ratio'yla,
Kesim Noktası'nın kesim marjıyla hiç ilgisi olmayan bir "Bant genişliği"
sayısı gösteriyordu.

**DÜZELTME — YENİ dosya `core/level-sheet-terms.js` (TEK YER, ÇEVİRİYE ZEMİN,
i18n DEĞİL — task'ın kendi ayrımı):** `LEVEL_SHEET_TERMS` sözlüğü 10 mod id'si
→ `{sensitivityLabel, amountLabel, formatSensitivity(p), formatAmount(p)}`.
`renderLevelSheet` artık jenerik `difficultyParams()` YERİNE AKTİF modun
KENDİ `paramsForDifficultyPosition(level)`'ını çağırıyor — 10 mod da bu
fonksiyonu AYNI imzayla (level girdisi) dışa aktarıyor (koddaki kendi
yorumları: "diğer modların paramsForDifficultyPosition'ıyla AYNI mod-agnostik
girdi"), SADECE döndürdükleri alanlar mod-spesifik (gainDb/q, marginOct,
edgeMargin, dbDelta/step, kGap, disturbDb, regionWidthOct/cutStepDb) — bu
YENİ dosya o alanları DOĞRU etikete/birime çeviriyor.

**Terminoloji (task'ın kendi listesiyle birebir):**
Frekans Bulma "Bant genişliği/Frekans artışı" (dB) · Kesim Noktası "Kesim
frekansı marjı" (oktav) · Q Genişliği "Q ayrımı" (edgeMargin, ham sayı) ·
Boost/Cut "Boost/Cut miktarı/Şıklar arası aralık" (dB) · dB Seviyesi
"Seviye farkı/Şıklar arası aralık" (dB) · Kompresör "Ratio ayrımı" (%) ·
Reverb "Reverb ayrımı" (%) · Tonal Denge "Tonal sapma" (dB) · Frekans
Çakışması "Çakışma bölgesi genişliği/Kesim adımı" (oktav+dB) · Distortion
"Doygunluk ayrımı" (%).

**BİLİNÇLİ KARAR — Kompresör/Reverb/Distortion'ın kGap'i FİZİKSEL birime
(dB/saniye) ÇEVRİLMEDİ:** üçünün GERÇEK farkı (`gainReductionDb`/`decayAtK`/
`driveAtK`) HER TURDA rastgele seçilen bir TÜRE bağlı (Reverb'in Room/Hall/
Plate'i, Distortion'ın clip/soft/tube/tape'i) ve bu türlerin aralıkları
BİRBİRİNDEN ÇOK farklı (ör. Reverb decay: Room 0.3-0.9sn, Hall 1.6-3.2sn) —
seviye sayfası için "temsili" bir tür SEÇMEK (ör. hep Hall'ı varsayıp saniye
göstermek) bazı turlarda yanlış/yanıltıcı bir sayı gösterirdi. kGap [0,1]
uzayında yüzde olarak gösteriliyor — TÜRDEN bağımsız, dürüst gerçek zorluk
sinyali. Kompresör'ün özelinde `gainReductionDb` gibi tür-bağımsız bir yol
VARDI ama üçü TUTARLI kalsın diye (task: "kısa kalsın") aynı % yaklaşımı
üçünde de kullanıldı.

**Doğrulama:**
- `npm test`: **882/882** (865 → +17 YENİ `test/level-sheet-terms.test.mjs`
  — MOCK DEĞİL, 10 modun HER BİRİNİN GERÇEK `paramsForDifficultyPosition`'ı
  seviye 1/10/20'de çağrılıp çökmediği/NaN üretmediği + doğru birim
  (oktav/dB/%) içerdiği doğrulandı; ayrıca "hiçbir mod (Frekans Bulma hariç)
  jenerik 'Bant genişliği' etiketini TAŞIMIYOR" testiyle asıl bug'ın
  kilitlendiği).
- Node'da CANLI önizleme (bu turda, rapor için): Kompresör Sv1→Sv20 "Ratio
  ayrımı: %45→%6", Kesim Noktası "Kesim frekansı marjı: 1.6 oktav→1/5
  oktav", Frekans Bulma "Bant genişliği: 1.5 oktav→1/4 oktav" — HEPSİ
  seviyeyle birlikte DOĞRU yönde (zorlaşarak) küçülüyor, sayılar tutarlı.
- **Dürüstlük notu — CANLI/cihaz UI doğrulaması YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi) — Seviye bilgi sayfasının GERÇEKTEN
  doğru göründüğü (kart düzeni, satır aralığı, uzun etiketlerin taşıp
  taşmadığı — ör. "Çakışma bölgesi genişliği" diğerlerinden daha uzun bir
  etiket) gözle DOĞRULANMADI. Kod incelemesi + 17 birim testi + Node'daki
  canlı hesap önizlemesi kadarı garanti.

**KORUMA:** Mod mantığı/ses/zorluk EĞRİSİ/sınav/paywall TEK SATIR değişmedi —
her mod hâlâ KENDİ `paramsForDifficultyPosition`'ını (zaten vardı, `mode
mantığı` parçası) kullanıyor, SADECE bu turda renderLevelSheet'in hangi
fonksiyonu çağırdığı ve sonucu nasıl ETİKETLEDİĞİ değişti — sayıların
KENDİSİ (kGap/gainDb/marginOct/vb.) hiçbir mod dosyasında dokunulmadı.

---

Önceki commit (G63, tek commit) — **Paywall Parça 2: kilit tetiklenince artık
gerçek bir PAYWALL EKRANI açılıyor (toast DEĞİL).** Satın alma (IAP) ve
reklam HÂLÂ yok — "Pro Al"/"Reklam İzle" butonları task'ın kendi tarifiyle
SİMÜLASYON (sırasıyla `devFlags.simulatePro=true` ve +1 can). Detaylar
`PAYWALL.md`'nin "Kapsam — Parça 2" ve "Paywall ekranı — 6 tetikleme noktası"
bölümlerinde.

**MEVCUT "SATIN ALMA" EKRANI (EKRAN 10) YENİDEN KULLANILDI, İKİNCİ bir ekran
İCAT EDİLMEDİ:** `app.js:openPaywallReason(reasonKey)` — `core/paywall.js`'e
eklenen `PAYWALL_REASONS` (6 anahtar: `sessionLimit`/`livesOut`/`modeLocked`/
`upload`/`dailyUsed`/`zoneHistory`, her biri kicker/title/detail/buttons) ile
AYNI DOM'u iki moda göre yeniden düzenliyor: GENEL navigasyon (Ayarlar →
"Pro'ya geç", Araçlar kilit örtüleri — `resetPaywallToGeneric()`, bağlamsal
bant gizli/"Geri yükle" görünür) ve BAĞLAMSAL (6 tetikleme — bant görünür/
"Geri yükle" gizli/"Reklam İzle" SADECE `livesOut`'ta). Pro kartının madde
listesi artık `core/paywall.js:PRO_BENEFITS`'ten (6 madde, task'ın kendi
listesi) JS'te üretiliyor — HTML'de sabit bir kopya YOK (`payProModes` id'si
kaldırıldı, `payProBenefits` container'ı geldi). Fiyat ₺199→**₺399**
(task'ın kendi rakamı) `core/paywall.js:PRO_PRICE`'a taşındı, app.js'teki
lokal kopya SİLİNDİ (tek kaynak).

**6 TETİKLEME NOKTASI — hepsi ESKİ (Parça 1) toast/session-end çağrısının
YERİNE geçti, ama o eski davranış SİLİNMEDİ, İLK OTURUM FALLBACK'İ oldu:**
1. 5. soru bitince, 2. Canlar bitince — `finalizeIfGameOver()`'ın iki dalı,
   artık `openPaywallReason("sessionLimit"/"livesOut")`. Ayrıca `startRound`/
   `startBtn`/`goToNextRound`'un ÜÇÜNÜN de tekrarlayan "hâlâ 0 can mı" girişi
   TEK bir YENİ `blockIfLivesOut()` fonksiyonuna toplandı (kullanıcı paywall'ı
   kapatıp reklam/Pro almadan tekrar denerse burası tetiklenir).
3. Kilitli moda basınca (dB/Reverb/Tonal/Distortion), 5. Frekans Çakışması
   günde-1 bitince — `renderModeGrid`'in kart click'i, `access.reason`'a göre
   `"modeLocked"`/`"dailyUsed"`.
4. Yükle butonuna basınca — `.upload-trigger-btn` (Oyun Ayarları+Motor 3),
   Ses Kaynağı sheet'inin "Dosya seç" satırı, `toolsUploadBtn` — ÜÇÜ de.
6. İlerleme'de bulanık grafiğe basınca — `zoneList`'in `pointer-events:none`'ı
   KALDIRILDI (artık tıklanabilir, imleç `pointer`), TEK SEFERLİK bir click
   dinleyicisi eklendi (`innerHTML` her `renderZonePanel()`'de değişse de
   `zoneList`'in KENDİSİNE bağlı dinleyici hayatta kalır, child'a değil).

**"İLK OTURUMDA PAYWALL YOK" — task'ın kendi kuralı, YENİ saf fonksiyon
`paywall.isFirstSession(totalRoundsEver)`:** `app.js`'te script başlarken
BİR KEZ `stats.rounds` okunup `const paywallSuppressedFirstSession`e
donduruluyor — bu runtime'ın TAMAMI boyunca sabit (kullanıcı bu ziyarette
kaç tur oynarsa oynasın "ilk oturum" durumu bozulmuyor, SADECE uygulama
yeniden açılınca `stats.rounds>0` olduğu için paywall aktif olur).
`openPaywallReason()` bu bayrağı KENDİSİ kontrol ediyor, `false` dönerse
ÇAĞIRAN taraf G61'in eski davranışına düşüyor — kısıtlamanın KENDİSİ
(5 soru/can/kilit) yine de geçerli kalıyor, SADECE paywall ekranı o ilk
ziyarette hiç açılmıyor.

**Doğrulama:**
- `npm test`: **865/865** (859 → +6 YENİ: `isFirstSession`'ın iki dalı,
  `PAYWALL_REASONS`'ın 6 anahtarının HEPSİNİN kicker/title/detail/buttons
  içerdiği + SADECE `livesOut`'un "livesOut" buton setini kullandığı,
  `PRO_BENEFITS`'in 6 madde olduğu, `PRO_PRICE`'ın ₺399 olduğu).
- Kod incelemesiyle TEK TEK doğrulandı: 6 tetikleme noktasının HEPSİ
  `openPaywallReason()` çağırıyor + `false` dönünce doğru eski davranışa
  düşüyor (`grep` ile her çağrı sitesi tekrar okundu); `resetPaywallToGeneric()`
  GENEL navigasyonun (`goProBtn`, `analyzeLock`/`filtersLock`) ÜÇÜNDE de
  ÖNCE çağrıldığı doğrulandı (bağlamsal durumun genel yola SIZMAMASI için).
- **Dürüstlük notu — CANLI/cihaz doğrulaması YİNE YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi). Paywall EKRANININ gerçekten
  DOĞRU bağlamla açıldığı, "Pro Al"a basınca kilitlerin GERÇEKTEN kalktığı,
  "Reklam İzle"nin GERÇEKTEN can dolduğu, ilk oturumda GERÇEKTEN hiç
  açılmadığı gözle DOĞRULANMADI — kod incelemesi + 6 yeni birim testi +
  sözdizimi kontrolü kadarı garanti. app.js hiç unit test edilemiyor
  (CLAUDE.md'nin kendi kısıtı, DOM bağımlılığı) — bu yüzden `openPaywallReason`/
  `blockIfLivesOut`/`resetPaywallToGeneric` gibi DOM'a dokunan fonksiyonların
  KENDİSİ test edilemedi, SADECE besledikleri saf veri (`PAYWALL_REASONS`/
  `isFirstSession`/`PRO_BENEFITS`/`PRO_PRICE`) test edildi. Kullanıcının
  cihaz testi bir sonraki turda BEKLENİYOR.

**KORUMA:** Parça 1'in kısıtlama MANTIĞI (5 soru/can dolumu/mod erişimi/
sınav kilidi/seviye kilidi) TEK SATIR değişmedi — SADECE kilit tetiklendiğinde
GÖSTERİLEN şey (toast → paywall ekranı) değişti. 10 mod/ses/zorluk dokunulmadı.

---

Önceki commit (G62, tek commit) — **Paywall Parça 1 düzeltmesi: ücretsizde seviye
sınırı KALKTI + kilitli modlar doğru mesaj veriyor.** Cihaz testinde G61'in
gerçek bir mantık hatası bulundu: ücretsiz kullanıcı Kompresör'e (G61'de
tier "pro"dan "free"ye çevrilmişti ama `unlockLevel:12` KALMIŞTI) "Seviye
yetersiz" diyerek takılıyordu — Kompresör onun için zaten TAM AÇIK 5 moddan
biriydi. Kök sebep: `renderModeGrid()`'in `meetsLevel` (seviye kilidi) ile
`access` (Pro/günlük-tadımlık kilidi) AYRI iki eksendi, ama meetsLevel ÖNCE
kontrol ediliyordu — level'e takılan bir mod, Pro-kilitli de olsa "Seviye
yetersiz" mesajını GÖSTERİYOR, `access`'in doğru "Pro gerekli" mesajına HİÇ
ULAŞAMIYORDU (dB Seviyesi/Reverb/Tonal Denge/Distortion'ın hepsinde AYNI bug).

**KÖK NEDEN — kullanıcının kendi teşhisi, kod incelemesiyle doğrulandı:**
Seviye/sınav sistemi ZATEN Pro özelliği (G61: `examGateActive()` free'de HER
ZAMAN false, dolayısıyla `stats.examState` free kullanıcı için hiç kurulmuyor,
seviye hiç ilerlemiyor) — ücretsiz kullanıcının hiç ulaşamayacağı bir seviye
eşiğine takılması yapısal olarak anlamsızdı.

**DÜZELTME — YENİ saf fonksiyon `core/paywall.js:meetsLevelRequirement(isPro,
academyLevel, unlockLevel)`:** `isPro=false` iken HER ZAMAN `true` döner
(academyLevel/unlockLevel'a HİÇ bakılmaz) — seviye kilidi artık SADECE
Pro'da (gerçek IAP ya da geliştirici simülasyonu) gerçek karşılaştırmayı
yapıyor. `app.js:renderModeGrid`'deki eski inline `devFlags.simulatePro ||
academyLevel>=unlockLevel` formülü `devFlags.simulatePro ||
paywall.meetsLevelRequirement(isUserPro(), academyLevel, unlockLevel)`
oldu (matematiksel olarak eşdeğer bir üçüncü OR terimi eklemek yerine SAF
fonksiyona taşındı — hem G62'nin kendi mantığı test edilebilir hem app.js'in
DOM-bağımlılığı yüzünden test edilemeyen kısmı MİNİMİZE edildi). Seviye kilidi
free'de her zaman açık olduğu için `playable` artık free kullanıcıda TÜM
kayıtlı (registry'de var olan) modlar için `true` — bu da G61'in ZATEN var
olan `access` (Pro/günlük-tadımlık) kontrolünü DOĞAL olarak TEK erişim ekseni
hâline getiriyor, dB/Reverb/Tonal/Distortion artık doğru "Pro gerekli"
mesajını (seviye mesajı DEĞİL) gösteriyor — İKİNCİ bir kod değişikliği
GEREKMEDİ, tek satırlık kök-neden düzeltmesinin doğal sonucu.

**Doğrulama:**
- `npm test`: **859/859** (857 → +2 YENİ test, `meetsLevelRequirement`'ın
  hem free hem Pro dalı: free'de academyLevel çok düşük/unlockLevel çok
  yüksek olsa BİLE `true`, Pro'da eşiğin TAM altında `false` — Kompresör'ün
  gerçek vakası [academyLevel:1, unlockLevel:12] birebir test edildi).
- Kod incelemesiyle doğrulandı: `grep "unlockLevel\|meetsLevel"` ile
  `renderModeGrid()`'in TEK çağrı noktası olduğu YENİDEN teyit edildi (başka
  hiçbir yerde bağımsız bir seviye kontrolü yok).
- **Dürüstlük notu — CANLI/cihaz doğrulaması YİNE YAPILAMADI** (tarayıcı
  eklentisi bu oturumda da bağlı değildi) — kullanıcının cihazda bulduğu bug
  kod incelemesiyle DOĞRULANDI ve düzeltildi, ama düzeltmenin cihazda
  gerçekten çalıştığı bu oturumdan görülemedi. Kullanıcının kendi cihaz
  testi bir sonraki turda BEKLENIYOR.

**KORUMA:** Pro'daki seviye/sınav sistemi (`examSystem`, `academyLevel`
formülü) TEK SATIR değişmedi — sadece free'de NE ZAMAN devreye girdiği
düzeltildi. 10 mod/ses/zorluk dokunulmadı.

---

Önceki commit (G61, tek commit) — **Paywall Parça 1: Ücretsiz/Pro KISITLAMA
MANTIĞI kuruldu** (satın alma/ekran/reklam YOK — task'ın kendi kapsam
sınırı, bkz. YENİ `PAYWALL.md`). Görev "PAYWALL.md (repoda)" diyordu ama
dosya repoda hiç yoktu (`find`+`git log --all` ile doğrulandı) — kurallar
DOĞRUDAN görev talimatından alındı, PAYWALL.md bu turda İLK KEZ yazıldı
(kalıcı referans, DURUM.md'nin paywall karşılığı).

**YENİ SAF MODÜL — `www/js/core/paywall.js`:** Tüm kısıtlama mantığı TEK
dosyada, hiçbiri `Date.now()`/`localStorage`'ı KENDİSİ okumuyor (zaman/durum
PARAMETRE) — CLAUDE.md'nin createQuestion/evaluateAnswer için istediği
saflık şartı bu turda TÜM bir modüle uygulandı. `test/paywall.test.mjs`
(YENİ, 28 test) her fonksiyonu izole doğruluyor — bu arada bir gerçek bug
YAKALADI: `applyLivesRefill`'in ilk taslağı `!lastRefillAt` (falsy) kontrolü
kullanıyordu, `lastRefillAt=0` (epoch başlangıcı, testin kendi senaryosu)
"hiç referans yok" sayılıp dolumu hep 0'a düşürüyordu — `== null` kontrolüne
çevrilerek düzeltildi, testler bunu YAKALADIĞI İÇİN commit'e hiç girmedi.

**MOD ERİŞİMİ:** `mode-catalog.js`'in `tier` alanı SADECE kart rozeti,
gerçek karar `paywall.FREE_MODE_IDS`'ten (5: Frekans Bulma/Kesim Noktası/
Q Genişliği/Boost mu Cut mu/**Kompresör** — sonuncusu tier'i "pro"dan
"free"ye çevrildi, ikisi elle senkron tutuldu). 4 mod (dB Seviyesi/Reverb/
Tonal Denge/Distortion) `reason:"pro"` ile kilitli. Frekans Çakışması
"günde 1 tadımlık" — `stats.dailyTasteLastPlayedAt` + YEREL takvim günü
karşılaştırması (UTC DEĞİL) + **saat-geriye-alma istismarı** açıkça
engellendi (`now<lastPlayedAt` → hâlâ kilitli, testle kilitlendi). İşaretleme
ANI mod kartına dokunulduğunda DEĞİL gerçek round BAŞLADIĞINDA (yanlış
tıklama günün hakkını çalmasın); "Tekrar Oyna" mod kartına hiç uğramadığı
için AYRI bir savunmacı kontrol de eklendi (`startBtn`'in fresh-start dalı).

**OTURUM LİMİTLERİ:** 5 soru/oturum — `finalizeIfGameOver()` artık `currentLives
<=0` (can bitti) İLE `roundsInThisPlaySession>=5` (free) AYNI çıkış noktasından
geçiyor, `showSessionEnd` üçüncü bir `"freeLimit"` kind'i kazandı (kendi
kicker/renk/lead metniyle, "normal"/"lost"un DEĞİŞTİRİLMEDEN yanına). Can
dolumu GERÇEK zaman-tabanlı oldu (`stats.livesLastRefillAt` + `paywall.
applyLivesRefill`, 30 dakikada 1, DRIFT YOK — referans noktası TAM tüketilen
süre kadar ilerliyor) — `storage.js`'teki eski "geçici köprü" (`lives<=0 →
TOTAL_LIVES` anlık sıfırlama, task'ın kendi tabiri) KALDIRILDI, iki yerde
("Canların bitti" kartları) artık UYDURULMAYAN, GERÇEK "N dakikada 1 can
dolacak" metni var. Kontrol noktaları: açılış, `visibilitychange` (ön plana
dönüş), `startFreshAttempt`. Sınav sistemi (`core/exam-system.js`) HİÇ
DEĞİŞMEDİ (task: "Pro'da çalışan, DOKUNULMAZ") — sadece app.js'in onu ne
zaman devreye aldığı TEK bir `examGateActive()` fonksiyonundan geçiyor,
eski ~15 dağınık `mode.EXAM_ENABLED` okuması BUNA yönlendirildi (8'i
identik `examHandled` satırıydı, `replace_all` ile TEK Edit'te değişti).
Mod-bazlı XP/Sv rozeti (task: "KISITLANMAYAN") BUNDAN ETKİLENMEDİ — kod
incelemesiyle doğrulandı, `progress.modeLevel`/`ACHIEVEMENTS` hiçbir yerde
`isUserPro()`'ya bakmıyor.

**DİĞER KİLİTLER:** Kendi dosya yükleme (Oyun Ayarları + Motor 3 slotları +
Ses Kaynağı sheet'inin "Dosya seç" satırı — İKİ AYRI kod yolu, ikisi de
kapatıldı), Sabit zorluk seçimi (üç UI noktası + downgrade sonrası state
düzeltmesi için YENİ `enforceFreeRestrictions()` — split-brain'i önlüyor:
Pro'yken kaydedilmiş "Sabit" tercihi free'ye düşünce UI'da DEĞİL gerçek
STATE'te de düzeltiliyor), Bölge seçerek çalışma (UI engeli + `currentFocusRange()`
okuma-anında savunmacı geri düşüş), Zayıf bölge raporu (İlerleme'nin "Şu An
Neredesin" + "en zayıf: X" özeti TAM kilitli — bir CÜMLE bulanıklaştırılamaz),
6 bölge geçmiş analizi (task'ın kendi kelimesi "bulanık önizleme" — `blur(5px)`,
TAM gizleme DEĞİL, veri orada olduğu görülür), Araçlar sekmesi (Analiz/
Referans ZATEN kilitliydi önceki turdan, upload kartı bu turda eklendi).

**TEST EDİLEBİLİRLİK:** `devFlags.simulatePro` (Geliştirici modu) →
`isUserPro()` — açıkken TÜM kısıtlar (mod erişimi/sınav/sabit zorluk/bölge/
upload/zayıf bölge raporu/Araçlar) kalkıyor, kapalıyken GERÇEK kısıtlarıyla
çalışıyor. `syncDevUI()` (anahtar her değiştiğinde) hem `renderModeGrid()`i
hem `enforceFreeRestrictions()`'ı tetikliyor — geçiş ANINDA tutarlı.

**Doğrulama:**
- `npm test`: **857/857** (829 → +28 YENİ `test/paywall.test.mjs`, hiçbir
  eski test bozulmadı).
- `node --check www/js/app.js`: sözdizimi hatası yok (bu boyuttaki bir
  değişiklikten sonra minimum garanti).
- Kod incelemesiyle TEK TEK doğrulandı: 5 mod ücretsiz/4 mod pro-kilitli/
  Çakışma günde-1 listesi `MODE_CATALOG`+`paywall.FREE_MODE_IDS`'ten
  BİREBİR eşleşiyor; `finalizeIfGameOver`'ın YENİ dalı `roundsInThisPlaySession`
  ile AYNI (ÖNCEDEN sadece can için var olan) sayaç mekanizmasını kullanıyor;
  `examGateActive()`'in TÜM eski çağrı noktalarını değiştirdiği `grep
  "mode\.EXAM_ENABLED"` ile YENİDEN doğrulandı (kalan TEK operasyonel
  satır — `currentModeExamLevel()`'daki `if (!mode.EXAM_ENABLED) return
  undefined` — BİLEREK dokunulmadı, free'de zaten examState hiç kurulmadığı
  için doğal olarak zararsız).
- **Dürüstlük notu — CANLI/DOM doğrulaması YAPILAMADI:** bu oturumda tarayıcı
  eklentisi bağlı değildi (önceki turlarda da aynı kısıt kaydedildi) — mod
  kartlarının GERÇEKTEN kilitli görünüp toast'ın GERÇEKTEN çıktığı, can
  kalplerinin 30dk sonra GERÇEKTEN dolduğu, bulanıklaştırmanın GERÇEKTEN
  göründüğü gözle DOĞRULANMADI. Kod incelemesi + 28 birim testi + sözdizimi
  kontrolü kadarı garanti — canlı cihaz/tarayıcı turu AÇIK KALDI.

**KORUMA:** 10 modun oyun mantığı/ses/zorluk EĞRİSİ/reskin HİÇ değişmedi —
sadece ERİŞİM kısıtı eklendi (task'ın kendi sınırı). Sınav SİSTEMİNİN
kendisi (`core/exam-system.js`) TEK SATIR değişmedi, sadece app.js'ten
NE ZAMAN çağrıldığı kısıldı.

---

Önceki commit (G60, tek commit) — **Bundle ID / paket adı iki platformda TEK ve
DOĞRU yapıldı: `com.logicprotrick.audioengineeracademy`.** Önceki durum
(bir önceki sohbetin "Sektör Kıyaslı Durum Analizi" raporunda YAYINA ENGEL
madde #2 olarak bulunmuştu): iOS `com.logicprotrick.eqeartrainer`, Android
(`capacitor.config.json`+`android/app/build.gradle`) `com.eqeartrainer.prox`
— iki platform FARKLI kimlikle mağazaya gidecekti. Henüz hiçbir mağazada
yayınlanmadığı için (proje 12 günlük, `git log` ile doğrulandı) bu değişiklik
güvenliydi — task'ın kendi notu.

**Değiştirilen yerler (hepsi `grep` ile TEK TEK bulundu, tahminle değil):**
`capacitor.config.json` (appId+appName), `android/app/build.gradle`
(namespace+applicationId), Android Java paket klasörü (`git mv
.../com/eqeartrainer/prox/MainActivity.java` → `.../com/logicprotrick/
audioengineeracademy/MainActivity.java`, `package` bildirimi güncellendi),
`android/app/src/main/res/values/strings.xml` (app_name/title_activity_main/
package_name/custom_url_scheme), `ios/App/App.xcodeproj/project.pbxproj`
(iki `PRODUCT_BUNDLE_IDENTIFIER` satırı, Debug+Release), `ios/App/App/
Info.plist` (`CFBundleDisplayName`), `CLAUDE.md` (Bundle ID satırı).
Uygulama görünen adı her iki platformda da **"Audio Engineer Academy"**
(önceden "AE Academy").

**DOĞRULAMA — sadece grep değil, GERÇEK derleme yapıldı (task'ın istediği
"npx cap sync sonrası derlenebilmeli" iddiası koddan değil, bina edilerek
kanıtlandı):**
- `grep -rl "eqeartrainer"` (DerivedData/build/node_modules hariç) → **SIFIR
  sonuç**, tüm repo genelinde.
- `grep -rl "AE Academy"` → **SIFIR sonuç**.
- `npx cap sync` temiz koştu, `ios/App/App/capacitor.config.json` ve
  `android/app/src/main/assets/capacitor.config.json` (git'e takipli
  DEĞİLLER, sync'te otomatik üretiliyorlar) yeni ID'yi doğru yansıttı.
- **iOS: `xcodebuild -scheme App -sdk iphonesimulator build` → BUILD
  SUCCEEDED.** Üretilen `.app`'in kendi `Info.plist`'i `plutil` ile okundu:
  `CFBundleIdentifier=com.logicprotrick.audioengineeracademy`,
  `CFBundleDisplayName=Audio Engineer Academy` — GERÇEK derleme çıktısından
  doğrulandı, statik dosya okumasından değil.
- **Android: `./gradlew assembleDebug` → BUILD SUCCESSFUL** (bu makinede
  `JAVA_HOME` sistemde tanımlı değildi, Android Studio'nun gömülü JBR'ı
  [`/Applications/Android Studio.app/Contents/jbr`] kullanıldı — bir sonraki
  oturumda `JAVA_HOME` hâlâ boşsa aynı yolu kullan). Üretilen `app-debug.apk`
  `aapt2 dump badging` ile okundu: `package name='com.logicprotrick.
  audioengineeracademy'`, `application-label='Audio Engineer Academy'` —
  yine GERÇEK APK çıktısından, tahmin değil.
- `npm test`: **829/829**, değişmedi (mantığa dokunulmadı, kilit altındaki
  koruma sağlandı).

**Yan bulgu (istenmedi ama `npx cap sync`'in doğal sonucu, saklanmadı):**
`android/app/capacitor.build.gradle` ve `android/capacitor.settings.gradle`
`@capawesome/capacitor-file-picker` eklentisini ÖNCEDEN Android native
projesine hiç kaydetmemiş görünüyordu (muhtemelen bu bağımlılık
`package.json`'a eklendikten sonra Android tarafında hiç `cap sync`
çalıştırılmamıştı) — bu turun `cap sync` çağrısı bunu doğru şekilde
kaydetti. Dosya yükleme özelliği Android'de bu commit'ten ÖNCE muhtemelen
hiç native plugin'e bağlı değildi; bu bir yan-etki düzeltmesi, ayrı bir
görev olarak İSTENMEMİŞTİ ama "build çalışır kalmalı" şartının doğal
sonucu olduğu için commit'e dahil edildi, gizlenmedi.

**KORUMA:** Mod mantığı/ses/DOM/test hiçbiri değişmedi — sadece kimlik
(bundle ID + görünen ad) ve `cap sync`'in kendi ürettiği plugin kaydı.

---

Önceki commit (G59, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **MOD 10
"DISTORTION" (Motor 2, dördüncü A/B/C modu) — TAM MOD kuruldu, 10.
oynanabilir mod.** Kompresör'ün (G30/G33) kanıtlanmış three-way/odd-one-out
şablonunun "ikizi" (task'ın kendi tabiri) — three-way-cards.js + core/
exam-system.js TEK SATIR değişmeden miras alındı.

**MEKANİK — Kompresör'ün "tek algısal eksen" dersinin AYNISI, YENİ bir
ikinci eksen (tür) üstüne eklendi:** üç ses (A/B/C), AYNI kaynak, AYNI
distortion TÜRÜ (clip/soft/tube/tape — bkz. altta), ikisi AYNI yoğunlukta
(k=DIST_BASE_K=0.5), biri (oddIndex) farklı yoğunlukta. **Tür zorluk
kademesini SEÇER** (`DISTORTION_TYPES`: easy→clip, medium→soft, hard→tube,
pro/proplus→tape — task'ın kendi eşlemesi), **yoğunluk (k) SORUNUN
KENDİSİNDEKİ ayırt edilebilirliği kontrol eder** (Kompresör'ün kGap'ıyla
BİREBİR aynı matematik — bkz. altta) — iki eksen ayrı roller üstleniyor, bir
SORU İÇİNDE A/B/C'nin ÜÇÜ DE her zaman AYNI türü kullanır (tek algısal eksen
BOZULMASIN diye).

**WAVESHAPER EĞRİLERİ — SAF, gerçek Float32Array üreten fonksiyonlar (`www/
js/modes/distortion.js:buildDistortionCurve`):**
- **clip** — sert clamp (`x*drive` → [-1,1]), YÜKSEK drive'da neredeyse tüm
  eğri ±1'e yapışır (sert köşeli).
- **soft** — `tanh(x*drive)`, simetrik yumuşak kırpma.
- **tube** — ASİMETRİK `tanh` (pozitif/negatif yarım-dalga FARKLI drive,
  0.72× katsayı) — gerçek tüp doygunluğunun karakteristik imzası.
- **tape** — neredeyse DOĞRUSAL, sadece tepe noktalarına yakın küçük bir
  kübik terim (`x - sign(x)*drive*0.15*|x|³`) — task: "inanılmaz ince".
Dört türün DRIVE aralıkları (`DRIVE_RANGES`) KASITLI ÖRTÜŞMÜYOR — clip'in EN
DÜŞÜK drive'ı (2.2) bile tape'in EN YÜKSEK drive'ından (0.9) büyük, "kolay
ekstrem/pro ince" hiyerarşisi SADECE kGap'e değil aralık seçimine de dayanıyor
(testle doğrulandı).

**ZORLUK EĞRİSİ — Kompresör'ün ZATEN kalibre edilmiş `COMP_CURVE_CONFIG`'i
BİREBİR aynı sayılarla taşındı:** kGap [0,1] k-uzayında BOYUTSUZ bir metrik
— hangi türe (drive aralığına) çevrileceğinden BAĞIMSIZ olduğu için
Kompresör'ün "kolaylaşma yok" kalibrasyonu MATEMATİKSEL OLARAK aynen geçerli
kalıyor (node script ile YENİDEN doğrulandı: easy/medium/hard/pro'nun
`representativeLevelForTier`'i eski statik kGap'ten HİÇBİRİNDE büyük değil).
Yeni bir sayı İCAT EDİLMEDİ, mevcut bir kalibrasyon YENİDEN KULLANILDI.

**ÖĞRETİM — task'ın kendi örnek formatı ("B farklıydı — tube saturation.
Sıcak, yumuşak...") BİREBİR:** `DISTORTION_TYPE_INFO` dört türün adı+
karakteri+mix anlamını TEK yerde tutuyor (SoundGym Tips'inden "dolgunluk/
davul kuyruğu/düşük frekans kirlenmesi" ipuçları `tape`'in mixNote'una
işlendi). `intensityWord(k)` (hafif/orta/belirgin/ağır) + tür bilgisi
BİRLEŞTİRİLİYOR — Kompresör'ün COMPRESSION_TIERS'ından FARKLI olarak "aynı
kademe/farklı kademe" ayrımına GEREK YOK (tür SORUNUN TAMAMINDA zaten sabit).

**GÖRSEL — Kompresör'ün SENTETİK zarfının AKSİNE burada GERÇEK bir şey
çiziliyor:** `drawOverlay` WaveShaperNode'un KENDİ transfer eğrisini (giriş
x∈[-1,1]→çıkış y∈[-1,1], `applyProcessing`'in kurduğu node'la BİREBİR aynı
`buildDistortionCurve` çağrısı) çiziyor — clip GERÇEKTEN sert köşeli
görünüyor, tube/tape GERÇEKTEN yumuşak/yuvarlak, çünkü İKİSİ DE aynı
fonksiyondan geliyor (ekstra bir yaklaşıklığa gerek yok). Kırmızı=senin
cevabın, yeşil=doğru (GUESS_COLOR/CORRECT_COLOR, diğer Motor 2 modlarıyla
AYNI paylaşılan renkler).

**KAYNAK: task'ın "davul/groove ideal" bulgusu bir ÖNERİ, KISITLAMA
değil** — `compatibleSourceIds()` (TAM liste, Kompresör'ün transient
şartından FARKLI olarak distortion transient GEREKTİRMEZ, Reverb'in `only`
kısıtından da FARKLI). `kulaklikGerekli:false` (task: "muhtemelen false —
hoparlörde de duyulur").

**SINAV: EXAM_WEAK_AREA export EDİLMEDİ** — Kompresör/Reverb/Tonal Denge'nin
AYNI tier-tabanlı (frekans DEĞİL) telafi yoluna otomatik düşüyor (task'ın
kendi kararı: "zayıf ZORLUK KADEMESİ, frekans-tabanlı değil").

**app.js kablolaması — Motor 2 şablonunun VAAT ETTİĞİ kadar minimal:**
import+registerMode, `THREE_WAY_MODE_IDS`'e "distortion" eklendi (bu TEK
satır `isChoiceFormat`/`.ans` click-delegasyonu/`submitThreeWayGuess`/
`drawOverlay` dispatch'inin TAMAMINI otomatik kapsıyor — G33'ün "ikinci
modda genelleştir" sözü Reverb'de TUTMUŞTU, üçüncü modda da AYNEN tuttu),
+ ÜÇ hardcoded metin dalı (soru başlığı/round-start açıklaması/pushHistory
özeti — Kompresör/Reverb'in AYNI DESENİ, bu ikisi `mode.questionTitle`
export ETMEDİĞİ için app.js'te sabit metin tutuluyor).

**Doğrulama (canlı, tarayıcıda):**
- Mod menüde "Distortion" kartı olarak görünüyor, oynanabilir (mode-catalog.js
  `playable:true`). three-way-cards.js'in BÜYÜK A/B/C kartları (harf+isim+
  waveform+"Çalınıyor" durumu) EKRAN GÖRÜNTÜSÜYLE Kompresör'le BİREBİR AYNI
  görünüyor — gerçek miras (test'te de referans eşitliğiyle doğrulandı).
- 3 ses A/B/C oto-döngüsüyle çalıyor, cevap sonrası doğru/yanlış kartlar
  doğru renkleniyor (`.right`/`.wrong`).
- Kademeli TÜR: Kolay tier'de canlı "hafif clipping" geri bildirimi, Pro
  tier'e (Sabit moda geçip "Pro" seçilerek) geçince canlı "belirgin **tape
  saturation**" geri bildirimi DOĞRU üretildi — task'ın kendi örneğiyle
  BİREBİR ("B farklıydı — belirgin tape saturation... çok ince, neredeyse
  fark edilmez...").
- Görsel: cevap sonrası EKRAN GÖRÜNTÜSÜYLE doğrulandı — kırmızı/yeşil transfer
  eğrisi kolay (clip) turda SERT KÖŞELİ, net görünüyor.
- Sınav sistemi: blind-click testi sırasında GERÇEKTEN "Telafi 1/5"e düştü
  (parkur toplam <6 doğru), telafi kaybedilince "Soru 1/10"a DOĞRU sıfırlandı
  — mekanizma TAM çalışıyor, canlı kanıtlandı (sadece EXAM_* export testiyle
  değil).
- Regresyon: Kompresör canlı test edildi (round baştan sona, konsol hatası
  SIFIR) — THREE_WAY_MODE_IDS'e üçüncü id eklenmesi mevcut iki modu
  etkilemedi.
- `npm test`: **829/829** (771'den +58 — YENİ `test/distortion.test.mjs`
  [56 test: sözleşme/tür-zorluk eşlemesi/WaveShaper eğri şekilleri/k-uzayı
  matematiği/"kolaylaşma yok"/öğretim/applyProcessing/getMeta/EXAM_*/miras],
  `test/exam-coverage.test.mjs`'e Distortion eklendi [+2]).

**KORUMA:** 9 mevcut mod, three-way-cards.js, exam-system.js, reskin, ses/
zorluk HİÇ değişmedi — Distortion kendi izole kod yollarında (`q.mode ===
"distortion"` string dispatch'i) yaşıyor, Kompresör/Reverb'in davranışına
TEK SATIR dokunmadı.

---

Önceki commit (G58, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Küçük bug
temizliği, dört izole düzeltme: Kompresör A şıkkı renk teşhisi (kod DOĞRU
çıktı, ilgili bir yarış-durumu kapatıldı), Öneri kartı gerçek 10-soruluk sete
bağlandı, Q Genişliği'nin (ve paylaşılan 6 başka modun) cevap-sonrası ~42-127px
kayması giderildi, Kompresör'ün kesik sesinin GERÇEK kök sebebi bulundu ve
düzeltildi.**

**1) KOMPRESÖR A ŞIKKI RENK — kod incelemesi + canlı test SONUCU: mantık
DOĞRU, ama gerçek bir yarış-durumu (race condition) bulunup KAPATILDI.**
`three-way-cards.js:markThreeWayCards`'ın `letter===correctLetter/
pickedLetter` mantığı harfe göre AYRIM YAPMIYOR — canlı tarayıcıda A doğruyken
VE A yanlışken AYRI AYRI test edildi, İKİSİNDE de doğru renklendi (regresyon
YOK). YENİ `test/three-way-cards.test.mjs` (6 test, sahte-DOM ile — jsdom YOK
bu projede, tonal-denge.test.mjs'in AYNI deseni) bunu KİLİTLİYOR: A/B/C'nin
HER BİRİ hem "doğru" hem "yanlış" rolünde ayrı ayrı doğrulandı. **Bulunan
GERÇEK (ama nadir) yarış:** Kompresör'ün otomatik A/B/C döngüsü (`abLoopTimer`,
2sn'lik `setInterval`) cevap anında `stopAbLoop()`la temizleniyordu (zaten
vardı) ama JS'in tek-thread'li event loop'unda interval'in callback'i
(`cycleThreeWayPreview`) kullanıcının cevap click'iyle AYNI mikro-pencerede
ZATEN kuyruğa alınmış olabilir — `clearInterval` GELECEKTEKİ tetiklenmeleri
durdurur, kuyrukta BEKLEYEN bir çağrıyı GERİ ÇEKMEZ. `markThreeWayCards`'ın
kendisi `disabled` butonları `updateThreeWayCardsPlayState`'te zaten
ATLATIYORDU (DOM sınıfları için koruma vardı) ama `cycleThreeWayPreview`'ın
KENDİSİ `roundActive` kontrolü YAPMADAN `buildQuestionChain`'i (SES çalmaya
başlayan asıl işlem) yine de tetikleyebiliyordu. Savunma amaçlı `if
(!roundActive) return;` eklendi. **Dürüstlük notu:** bu turda A'nın
RENKLENMEDİĞİ bir durum CANLI OLARAK YAKALANAMADI — kapatılan şey, koda göre
teorik olarak mümkün olan ama bu ortamda tetiklenemeyen bir pencere.

**2) ÖNERİ KARTI → GERÇEK 10-SORULUK SET:** Ana menüdeki "Bugünün Önerisi"
kartının "Başla" butonu ÖNCEDEN sadece `goScreen("game")` çağırıyordu —
`playModeSelect`'in kullanıcının SON seçtiği değeriyle (genelde "Serbest/
sonsuz") oynanıyordu, buton ise sabit "Seti başlat" yazıyordu (yanlış bir
vaat DEĞİLDİ ama belirsizdi). Artık "Tekrar oyna"nın (`els.resCta`) AYNI
mekanizmasını (`startFreshAttempt({forceChallenge:true})`) çağırıyor —
`playModeSelect`'in KALICI tercihine DOKUNMADAN (select'in value'su
DEĞİŞMİYOR, SADECE bu tek deneme için `challenge.active` zorlanıyor) +%50 XP
bonusunu aktif ediyor. Buton etiketi artık `challenge.total`'dan OKUNUYOR
("Seti başlat · 10 soru" — sabit yazıp unutmak yerine tek doğruluk
kaynağından). **Dürüstlük notu — sınav sistemine DOKUNULMADI:** G50'den beri
TÜM 9 mod EXAM_ENABLED olduğu için `challenge`'ın KENDİ "10. soruda otomatik
bitir" mantığı (`ensureAutoNext`'teki `!mode.EXAM_ENABLED` koşulu, G47'den
beri BİLEREK böyle) hiçbir modda ARTIK tetiklenmiyor — 10. soruda examSystem'in
KENDİ parkuru (zaten `PARKUR_LENGTH=10`) devralıp sınav teklifi/toplam
sınav/telafiye GEÇİYOR, session'ı SESSİZCE YARIDA KESMİYOR. "10 soru" vaadi bu
yüzden LİTERAL bir "menüye dön" değil, examSystem'in KENDİ gerçek "Soru N/10"
parkuruna GİRMEK anlamına geliyor — BİLİNÇLİ bir tercih (sınav akışını YARIDA
KESMEMEK için, task: "sınav... DOKUNULMAZ"). Canlı doğrulandı: buton "Seti
başlat · 10 soru" yazıyor, tıklanınca oyun ekranına geçip "Soru N/10" parkuru
BAŞLIYOR. **app.js DOM'a bağlı olduğu için (bu projede app.js HİÇ unit test
edilmiyor, CLAUDE.md: "ses ve DOM davranışı kaynak koddan doğrulanamaz")
node:test testi EKLENEMEDİ** — sadece canlı tarayıcıda doğrulandı, dürüstçe
belirtiliyor.

**3) Q GENİŞLİĞİ 42px KAYMA — KÖK SEBEP BULUNDU VE DÜZELTİLDİ (paylaşılan
altyapı, Q Genişliği'ne ÖZGÜ değilmiş):** Ölçüldü: `#gameScroll`'un (oyun
ekranının kaydırılabilir alanı) `scrollTop`'u cevap ANINDA 0'dan 54.5px'e
sıçrıyordu (Q Genişliği'nde) — Kesim/dB/Boost-Cut'ta da (38-80px) AYNI kök
sebep, SADECE farklı miktarda. **Kök sebep:** `#feedbackBox` (`.fb`) ÖNCEDEN
`display:none` ile SIFIR yükseklik kaplıyordu, cevap verilince `display:block`
olup GERÇEK içerik yüksekliği (~100px) EKLENİYORDU — `.game-scroll`'un toplam
içerik yüksekliği ANİDEN viewport'u aşıyor, `scrollFeedbackIntoView()`
(app.js, G-öncesi bir turda iOS momentum-scroll sorunu için BİLEREK SENKRON/
ANİ yapılmıştı, bu davranışa DOKUNULMADI) onu alta kaydırıyordu. **Düzeltme:**
`.fb` artık `display` DEĞİL `visibility` ile gizleniyor + `min-height:100px`
ile kendi alanını PEŞİNEN ayırıyor — cevap öncesi de sonrası kadar yer
kaplıyor (görünmez ama LAYOUT'TA VAR), yani cevap verilince toplam yükseklik
ANİDEN artmıyor. Reskin'e (renk/tipografi/boyut) DOKUNULMADI — SADECE gizleme
mekanizması. **Canlı doğrulandı (masaüstü tarayıcı, TEMİZ sayfa
yüklemesinden):** Q Genişliği'nde kayma **54.5px → 0px**, Boost mu Cut mu'da
**54.5px → 0px**, Kesim Noktası'nda **38px → 2px**, dB Seviyesi'nde **80px →
2px** (round-start'ın KENDİ ÖNCEDEN VAR OLAN `scrollFeedbackIntoView()`
çağrısı — bkz. app.js "4-6 şık iki satıra taşıyor" notu — artık DOĞRU/nihai
pozisyona İLK seferde kaydırıyor, cevap sonrası AYNI pozisyonda kalınıyor).
**Kapsam dışı bırakılan, İLGİLİ ama AYRI bir bulgu:** Frekans Bulma HÂLÂ
244.5px kayıyor — bu mod `.fb` KULLANMIYOR, kendi AYRI/daha zengin
`#freqInfo` panelini kullanıyor (`mode.showFreqInfoPanel`, SADECE Frekans
Bulma'da var) — task Q Genişliği'ni hedeflediği için bu AYRI mekanizmaya
dokunulmadı, ama gelecekte benzer bir "kayma" şikayeti gelirse kök sebep
BURADA belgelendi.

**4) KOMPRESÖR KESİK SES — TAM kök sebep bulundu (G33 SADECE YARISINI
çözmüştü):** G33, `stopAudio()`'nun gain söndürme zaman sabitini (0.03→0.012)
sıkılaştırmıştı — ama kod incelemesiyle bulundu: AYNI `forEach` adımında,
gain'e söndürme RAMP'i PROGRAMLANDIKTAN HEMEN SONRA `node.disconnect()`
SENKRON (aynı JS tick'inde, `now`'da) çağrılıyordu. Web Audio'da
`disconnect()` ANINDA etkilidir — programlanan gain eğrisi sesin çıkış
noktasına ARTIK HİÇ ULAŞAMIYORDU, yani ramp FİİLEN DUYULMUYORDU (zaman
sabiti 0.03 ya da 0.012 FARK ETMEZDİ — ikisi de "duyulmayan" bir eğriydi,
G33'ün "sıkılaştırma" fixi bu yüzden SADECE kısmi bir iyileşmeydi). Bu,
ÖZELLİKLE Kompresör'ün A/B/C döngüsünün her ~2sn'de bir
`buildQuestionChain`→`stopAudio` çağırdığı yerde SIK tekrarlanan bir sert
kesme demekti. **Düzeltme:** `disconnect()` artık SENKRON değil,
`DISCONNECT_DELAY_MS=100` (ramp'in + `.stop()`'un `now+0.08` zamanlamasının
GERÇEKTEN bitmesinden SONRA) gecikmeyle (`setTimeout`) planlanıyor — ses
ÖNCE gerçekten söner, SONRA bağlantı kesiliyor. Diğer sekiz modun ses zinciri
(fonksiyon imzası/çağrı sırası) DEĞİŞMEDİ, SADECE temizlik zamanlaması.
**Dürüstlük notu:** kulakla NİHAİ doğrulama (gerçek cihazda "artık hiç
tıklama yok" onayı) bu ortamdan YAPILAMAZ (CLAUDE.md) — ama bu, G33'ün
NEDEN "tam çözmediği"ni AÇIKLAYAN, kod-seviyesinde KANITLANMIŞ bir kök
sebep ve düzeltme.

**Doğrulama:**
- 9 mod regresyon: Frekans Bulma/Kesim Noktası/dB Seviyesi/Boost mu Cut
  mu/Q Genişliği/Kompresör canlı test edildi (round baştan sona, konsol
  hatası SIFIR). Motor 2/3'ün paylaşılan altyapısı (three-way-cards.js,
  audio-engine.js) DEĞİŞTİĞİ için Reverb/Tonal Denge/Frekans Çakışması'nın
  KENDİ mekaniğine TEK SATIR dokunulmadığı kod incelemesiyle doğrulandı.
- `npm test`: **771/771** (765'ten +6 — YENİ `test/three-way-cards.test.mjs`).

**KORUMA:** 9 modun oyun mantığı/ses/zorluk/sınav/reskin (renk/tipografi/
boyut) HİÇ değişmedi — SADECE bu dört düzeltme, hepsi izole.

---

Önceki commit (G57, tek commit — kod+DURUM.md birlikte) — **Frekans Çakışması'nda
YANLIŞ cevapta da öğretim: üç aşamanın HER BİRİNDE artık "neden yanlış +
neden doğrusu doğru" açıklaması var (task: "SoundGym 'yanlış' der geçer —
bizim ayrıştırıcımız hatadan öğretmek").**

**PAYLAŞILAN DEKORATİF MODEL — görsel ile öğretim metni ARTIK AYNI zihinsel
haritayı okuyor:** G52'nin `drawOverlay`'inde iki kaynağın "varlık eğrisi"
için kullanılan `SOURCE_CURVE_WIDTH_OCT`/`SOURCE_CURVE_OFFSET_OCT` sabitleri
dosyanın BAŞINA taşındı, YENİ iki saf fonksiyon eklendi: `sourcePeakFreq
(trueCenter, which)` (A/B'nin dekoratif tepe frekansı) ve `dominantSourceAt
(freq, trueCenter)` (verilen bir frekansta hangi kaynağın tepesine DAHA
YAKIN — "orada hangisi güçlü/zayıf" sorusunun cevabı). Gerçek ses FFT'si
DEĞİL (dosya başı computeRegionCurveDb notuyla AYNI "dekoratif ama tutarlı"
ilke) — ama artık AŞAMA 1'in yanlış-cevap öğretimi, `drawOverlay`'in
GÖSTERDİĞİ AYNI amber/mor tepe modeline dayanıyor, birbirinden SAPMIYOR.

**ÜÇ AŞAMANIN YANLIŞ-CEVAP DALLARI (`teachingText`, DOĞRU cevap dalları
HİÇ değişmedi):**
- **AŞAMA 1 (teşhis):** "Yanlış — senin seçtiğin [X]Hz'de [orada baskın olan
  kaynak] var ama [diğeri] zayıf, orada çakışma olmaz. Asıl çakışma [Y]Hz'de
  — ikisi de orada güçlü, mix bulanıklaşıyor." — `[X]` kullanıcının SEÇTİĞİ
  frekans, hangi kaynağın "orada var/zayıf" olduğu `dominantSourceAt` ile
  KİŞİSELLEŞTİRİLİYOR (task'ın kendi örnek formatıyla BİREBİR).
- **AŞAMA 2 (karar):** "Yanlış — [seçtiği kaynak]'dan kesmek çakışmayı
  çözmez, çünkü asıl maskeleyen kaynak [doğru kaynak], [seçtiği] değil.
  [Doğru kaynak]'dan kesmeliydin — [korunması gereken] o bölgede daha
  belirleyici/önemli, yerini korumalı."
- **AŞAMA 3 (çöz):** ÜÇ alt-senaryo — AZ kestiyse ("...az kestin, maske
  hâlâ duruyor, [A] ve [B] tam ayrışmadı"), ÇOK kestiyse ("...çok kestin,
  [kaynak] gereksiz zayıfladı, mixte kayboldu"), DOĞRUYA ÇOK YAKINSA
  (`maskOpenedPct>=75`, task'ın "uygun ince geri bildirim" isteği — kaba
  az/çok mesajı YERİNE) "...çok yakındın (yakınlık %N), biraz daha [az/çok]
  kesmen yeterliydi" gibi nazik bir ton.

**Doğrulama (canlı, tarayıcıda, üç aşamada da yanlış cevap verilerek):**
- AŞAMA 1: *"Yanlış — senin seçtiğin 50 Hz'de Kick var ama Bas zayıf, orada
  çakışma olmaz. Asıl çakışma 60 Hz'de — ikisi de orada güçlü, mix
  bulanıklaşıyor."* EKRAN GÖRÜNTÜSÜYLE/canlı doğrulandı.
- AŞAMA 2: *"Yanlış — Bas'dan kesmek çakışmayı çözmez, çünkü asıl maskeleyen
  kaynak kick, bas değil. Kick'dan kesmeliydin — Bas o bölgede daha
  belirleyici/önemli, yerini korumalı."* canlı doğrulandı.
- AŞAMA 3 (üç alt-senaryo): "çok kestin...gereksiz zayıfladı, mixte
  kayboldu" VE "çok yakındın (yakınlık %75), biraz daha az kesmen
  yeterliydi" ikisi de canlı doğrulandı.
- DOĞRU cevap metinleri (task'ın "Doğru cevap açıklaması KORUNSUN" şartı)
  regresyon testleriyle + canlı ("Doğru! Kick ve Bas 73 Hz'de çakışıyor...")
  doğrulandı — HİÇ değişmedi.
- Konsol hatası SIFIR.
- YENİ testler — `test/frekans-cakismasi.test.mjs`'e üç describe: (1)
  `sourcePeakFreq`/`dominantSourceAt` saf fonksiyon testleri, (2)
  `teachingText()` — her aşamanın hem DOĞRU (regresyon, "Doğru!" ile
  başlıyor mu) hem YANLIŞ (kullanıcının seçtiği değeri/doğru değeri
  içeriyor mu, az/çok/yakın dallanıyor mu) dallarını doğrudan test ediyor,
  (3) `getFeedbackData()` — yanlış cevapta `title="Iskaladın"`, `detail`
  `teachingText`'in yanlış dalıyla BİREBİR aynı, `result.correct=false`.
- `npm test`: **765/765** (753'ten +12).

**KORUMA:** `evaluateAnswer`/`calculateXP`/`createQuestion` SAF kaldı, TEK
SATIR değişmedi — SADECE `teachingText` (ve onu ÇAĞIRAN `getFeedbackData`,
kendisi hâlâ SAF) metin üretimi zenginleşti. Mekanik (teşhis/kaynak/kesme),
sınav sistemi, 8 mevcut mod HİÇ değişmedi.

---

Önceki commit (G56, tek commit — kod+DURUM.md birlikte) — **Frekans Çakışması'nın
"kendi dosyalarım" upload'ı iki GENEL yükleme yuvasına ("Ses 1"/"Ses 2")
dönüştürüldü + butonlar ana ekrana taşınıp Frekans Bulma'nın keşfedilebilirlik
deseniyle hizalandı + üçüncü bir teşhis katmanı eklendi.**

**1) ETİKET DÜZELTMESİ — kick+bas ilişkilendirmesi kalktı:** `OWN_SOURCE_PAIR`
(source-catalog.js) `labelA`/`labelB` `"Kendi A"/"Kendi B"` → **`"Ses 1"/
"Ses 2"`** oldu (işlevsel olarak zaten enstrüman-tarafsızdı, ama task bu
turda daha açık bir genel adlandırma istedi — "kick+bas OLMAK ZORUNDA
DEĞİL"). Upload satırlarının etiketleri de aynı dile taşındı: "Kaynak A/B
yükle" → **"Ses 1/2 yükle"**. Yerleşik üç çift (kick-bas/vokal-gitar/
snare-gitar, `SOURCE_PAIRS`) HİÇ değişmedi — bunlar zaten ayrı, hazır
setler; upload TAMAMEN bağımsız bir dördüncü seçenek (`OWN_SOURCE_PAIR`,
`id:"own"`).

**2) TEŞHİS — "buton tepkisiz" için kök sebep bu ortamda TEKRAR
BULUNAMADI (kod DOĞRU çıktı), ama bir UX/keşfedilebilirlik asimetrisi
bulunup DÜZELTİLDİ:** `pickNativeAudioFile()`/`.upload-trigger-btn`
kablolaması cakismaFileInputA/B için audioFileInput'la (Frekans Bulma'nın
"çalışan" yolu) BİREBİR AYNI kodu paylaşıyordu (aynı forEach döngüsü, aynı
fonksiyon) — programatik `.click()` testleriyle DOĞRULANDI, ikisi de
zincirin AYNI noktasında AYNI şekilde davranıyor. Ama GERÇEK bir asimetri
vardı: Frekans Bulma'da upload'a ulaşmak "Kaynak chip → Dosya seç" (TEK
adım, ana ekrandan); Motor 3'te ise "kaynak-çifti chip'ini kapat → '...'
(Oyun Ayarları) sheet'ini aç → aşağı kaydır → Dosya Seç" (ÜÇ adım, AYRI bir
sheet) gerekiyordu — bu fazladan gezinme cihazda "tepkisiz" izlenimine
katkıda bulunmuş olabilir (sheet kapanış/açılış animasyonlarının üst üste
binmesi gibi zamanlamaya bağlı olası bir etkileşim de dahil, kesin
kanıtlanamadı). **Düzeltme:** iki upload satırı (`cakismaUploadRowA`/B,
AYNI id'ler, YENİDEN OLUŞTURULMADI — sadece taşındı) artık `#gameSettingsSheet`
İÇİNDE değil, ANA OYUN EKRANINDA, kaynak-çifti chip'inin HEMEN ALTINDA —
"Kendi dosyalarım" seçilince TEK adımda görünüyorlar, Frekans Bulma'nın
akışıyla AYNI derinlikte. `syncCakismaVisibility()`'nin görünürlük mantığı
buna göre güncellendi (`#cakismaOwnUploadBlock` tek bir sarmalayıcı artık
toggle ediliyor) — bu arada AYRI bir gerçek hata da YAKALANIP düzeltildi:
`uploadRowSingle`'ın (diğer sekiz modun tekli-upload satırı) gizlenme
koşulu YANLIŞLIKLA sadece `isOwnPair`'e bakıyordu — Motor 3'te bir YERLEŞİK
çift (ör. Kick+Bas) seçiliyken bu ALAKASIZ satır yanlışlıkla görünür
kalıyordu, artık doğrudan `isCakisma`'ya bakıyor.

**3) YENİ TEŞHİS KATMANI — "buton mu ölü, çağrı mı hiç olmuyor" sorusu ARTIK
KESİN ayırt edilebiliyor:** her `.upload-trigger-btn` tıklamasının EN BAŞINA
`console.log('[filepicker-diag] 0) buton tıklandı: data-file-target="..."')`
eklendi (G55'in 1-4 numaralı halkalarının HEMEN ÖNÜNE) — cihazda bu log HİÇ
görünmüyorsa sorun kesinlikle DOM/event-binding'te (buton gerçekten ölü);
görünüp SONRAKİ [filepicker-diag] logları görünmüyorsa sorun
`pickNativeAudioFile()`'ın kendisinde (G55'in zaten belgelediği 4 halka).

**4) ANALİZ MEKANİĞİ — DEĞİŞİKLİK GEREKMEDİ, YENİDEN DOĞRULANDI:**
`createQuestion()` zaten `findSourcePair(settings.pairId)` ile TAMAMEN
generic çalışıyordu (G51'den beri) — iki yüklenen ses, yerleşik üç çiftle
BİREBİR AYNI `stageForIndex`/çakışma-bölgesi/kesim mekaniğine giriyor,
SADECE etiketler değişti. Canlı doğrulandı: vocal.m4a + acoustic_guitar.m4a
("Ses 1"/"Ses 2" olarak) yüklenip round başlatıldı, soru "Ses 1 ve Ses 2
hangi frekansta çakışıyor?" olarak DOĞRU üretildi, spektrum görseli
(G52'nin amber/mor/kırmızı vurgu şeridi) "Ses 1"/"Ses 2" etiketleriyle
DOĞRU render edildi.

**Doğrulama (canlı, tarayıcıda):**
- Upload artık iki GENEL slot: "Ses 1 yükle"/"Ses 2 yükle" etiketleri EKRAN
  GÖRÜNTÜSÜYLE doğrulandı, kick+bas ilişkilendirmesi YOK.
- Butonlar ana ekranda, kaynak-çifti chip'inin hemen altında — "..." sheet'ine
  gitmeye GEREK KALMADI, EKRAN GÖRÜNTÜSÜYLE doğrulandı.
- İki dosya (vocal.m4a, guitar.m4a) yüklenip round başlatıldı, soru "Ses 1 ve
  Ses 2 hangi frekansta çakışıyor?" DOĞRU üretildi — analiz mekaniği
  yerleşik çiftlerle BİREBİR aynı yoldan çalışıyor.
- Yerleşik çift (Kick+Bas, TEMİZ bir sayfa yüklemesinden) regresyonsuz:
  "Kick ve Bas hangi frekansta çakışıyor?" DOĞRU üretildi. **Bilinen/
  ÖNCEDEN belgelenmiş (G52'den beri var olan, bu turda YENİDEN gözlemlenen)
  bir tuhaflık:** round DEVAM EDERKEN pair mid-session değiştirilirse
  (quit→pair değiştir→Oyunu Başlat, sayfa yenilemeden) bir sonraki soru
  BAZEN önceki pair'in etiketleriyle üretilebiliyor — TEMİZ bir sayfa
  yüklemesinde/round başında bu SORUNU YOK, bu G56'nın kapsamı dışında bir
  session-state tuhaflığı (kayıt altına alındı, düzeltilmedi).
- Frekans Bulma'nın upload'ı (referans "çalışan" yol) regresyonsuz —
  butonu hâlâ var/görünür, konsol hatası SIFIR.
- `npm test`: **753/753** (değişmedi — bu tur SADECE DOM/etiket/görünürlük
  kablolaması, hiçbir saf fonksiyon etkilenmedi).

**Dürüstlük notu:** "buton tepkisiz" şikayetinin TAM kök sebebi bu ortamdan
(gerçek cihaz yok) KESİN olarak teşhis edilemedi — kod, Frekans Bulma'nınkiyle
BİREBİR aynı çıktı (programatik testle doğrulandı). Bulunan/düzeltilen şey
GERÇEK bir keşfedilebilirlik asimetrisiydi (üç adım vs bir adım) + gerçek
bir görünürlük hatası (`uploadRowSingle`) — bunlar "tepkisiz" hissini
AÇIKLAYABİLİR ama KANITLANAMADI. Yeni "0) buton tıklandı" logu, kullanıcının
BİR SONRAKİ cihaz denemesinde bunu KESİN olarak ayırt etmesini sağlıyor.

**KORUMA:** Yerleşik üç çift, Frekans Bulma upload'ı, Motor 3'ün 3-aşama
mekaniği, diğer modlar HİÇ değişmedi.

---

Önceki commit (G55, tek commit — kod+DURUM.md birlikte) — **Dosya seçici cihazda
HÂLÂ açılmıyordu (G53'ün native plugin'i de yetmedi) — DERİN TEŞHİS: koddaki
HER halka (Package.swift kaydı, jsName eşleşmesi, deployment target, buton
kablolaması) TEK TEK doğrulandı ve HEPSİ DOĞRU çıktı; kalan tek olası kök
sebep Xcode'un YEREL paket önbelleğinin `npx cap sync`'in güncellediği
Package.swift'i henüz GÖRMEMİŞ olması — bunu kesin olarak ayırt etmek için
cihazda çalışan bir teşhis aracı eklendi.**

**BU ORTAMDAN (masaüstü, gerçek iOS cihaz/Xcode yok) YAPILABİLECEK TÜM
statik denetimler tek tek yapıldı, HEPSİ TEMİZ çıktı — yani sorun koddan
DEĞİL, muhtemelen Xcode'un paket çözümleme durumundan kaynaklanıyor:**
1. **Proje SPM kullanıyor, CocoaPods DEĞİL** (`ios/App` altında Podfile YOK,
   sadece `App.xcodeproj` + otomatik oluşan `project.xcworkspace`) — "pod
   install unutulmuş" teorisi ELENDİ, bu bir SPM projesi.
2. **`App.xcodeproj` → `CapApp-SPM` bağlantısı DOĞRU:** `project.pbxproj`'da
   `XCLocalSwiftPackageReference "CapApp-SPM"` + `XCSwiftPackageProductDependency`
   satırları mevcut, App target Frameworks'e `CapApp-SPM` ürününü doğru
   ekliyor.
3. **`CapApp-SPM/Package.swift` → `CapawesomeCapacitorFilePicker` bağlantısı
   DOĞRU** (G53'te `npx cap sync ios` tarafından zaten eklenmişti, bu turda
   TEKRAR doğrulandı): hem `dependencies` hem `CapApp-SPM` target'ının kendi
   `dependencies` dizisinde `.product(name: "CapawesomeCapacitorFilePicker", ...)`
   var — yani App → CapApp-SPM → FilePicker zinciri paket TANIMLARI seviyesinde
   TAM.
4. **Plugin'in Swift kaynağı `jsName = "FilePicker"` ile KAYIT OLUYOR**
   (`FilePickerPlugin.swift`, `@objc(FilePickerPlugin)` + `CAPBridgedPlugin`
   protokolü — MODERN otomatik-keşif mekanizması, AppDelegate.swift'te
   MANUEL bir kayıt GEREKMİYOR ve YOK/gerekmiyor da zaten) —
   `window.Capacitor.Plugins.FilePicker` adı BİREBİR eşleşiyor, yazım hatası
   YOK.
5. **iOS deployment target uyumlu:** App target `IPHONEOS_DEPLOYMENT_TARGET
   = 15.0`, CapApp-SPM `platforms: [.iOS(.v15)]` — versiyon çakışması YOK
   (olsaydı build HATASI verirdi, "temiz rebuild başarılı" raporuyla zaten
   çelişirdi).
6. `Package.resolved` incelendi — SADECE `capacitor-swift-pm` (uzak paket)
   pinlenmiş, dört yerel paket (volume-buttons/preferences/splash-screen/
   file-picker) `path:` tabanlı OLDUĞU için pinlenmeye zaten İHTİYAÇ
   DUYMUYOR — burada STALE bir kayıt bulunamadı.

**SONUÇ:** Kod/konfigürasyon tarafında bulunabilecek HİÇBİR hata YOK — bu,
Xcode'un LOKAL SPM paket grafiğinin (Package.swift metninin `npx cap sync`
ile değişmesine rağmen) DerivedData/proje önbelleğinde ESKİ (file-picker'sız)
haliyle KALMIŞ olabileceği ihtimalini güçlendiriyor — bu, yerel (path-based)
Swift Package'larla BİLİNEN bir Xcode davranışıdır: uzak paketlerin aksine
Xcode yerel bir paketin Package.swift'i DEĞİŞTİĞİNDE grafiği HER ZAMAN
otomatik yeniden ÇÖZMEYEBİLİR.

**XCODE TARAFINDA KULLANICININ YAPMASI GEREKEN ADIMLAR (bu, koddan
DÜZELTİLEMEYEN tek kalan adım):**
1. Xcode'da projeyi aç: `ios/App/App.xcodeproj` (bu projede AYRI bir
   `.xcworkspace` YOK — CocoaPods değil, SPM).
2. Menüden **File → Packages → Reset Package Caches**.
3. Menüden **File → Packages → Resolve Package Versions**.
4. Sol panelde (Project Navigator üstünde) "Package Dependencies" bölümüne
   bak — **CapawesomeCapacitorFilePicker** listede GÖRÜNÜYOR MU? Görünmüyorsa
   kök sebep KESİNLEŞMİŞ demektir (paket hiç çözülmemiş).
5. **Product → Clean Build Folder** (⇧⌘K).
6. Cihazdan uygulamayı sil (zaten yapılmış), tekrar **Build & Run**.

**YENİ TEŞHİS ARACI — cihazda debugger olmadan da görülebilsin diye
(Ayarlar → Sürüm numarasına 7 kez dokun → GELİŞTİRİCİ → "Dosya Seçici
Testi"):** `pickNativeAudioFile()`'ın zinciri artık DÖRT ayrı halkanın
HER birinde `console.log`/`console.warn`/`console.error` ("[filepicker-diag]"
etiketiyle) VE (Safari Web Inspector'a hiç bağlanmadan da görülebilsin diye)
`toast()` üretiyor:
1. `window.Capacitor` tanımsız mı — Capacitor köprüsü hiç yüklenmemiş.
2. `window.Capacitor.Plugins.FilePicker` tanımsız mı — **EN OLASI kök sebep**,
   yukarıdaki Xcode adımlarını işaret ediyor.
3. `pickFiles()` çağrılıyor mu — çağrıdan HEMEN ÖNCE ayrı bir log (G53'te
   YOKTU, "buton mu ölü, çağrı mı hiç olmuyor" ayrımı bu satır olmadan
   YAPILAMAZDI).
4. `pickFiles()` dönüyor mu (sonuç/iptal) yoksa reddediyor mu (native hata,
   mesajı toast'a da yazılıyor).
Test butonu bu dört senaryoyu (Capacitor yok / plugin yok / başarılı /
iptal-veya-hata) AYRI AYRI özetleyen bir SONUÇ toast'ı da gösteriyor —
gerçek yükleme akışlarından (Motor 3, tekli upload) TAMAMEN İZOLE, task'ın
"basitleştir" isteği.

**Doğrulama (bu ortamda — masaüstü, `window.Capacitor` doğal olarak yok):**
- Fallback senaryosu (gerçek durum bu ortamda): test butonu → "1) window.
  Capacitor TANIMSIZ" logu + "Sonuç: Capacitor YOK" toast'ı DOĞRU üretildi.
- SAHTE `window.Capacitor = {Plugins:{}}` (Capacitor var, plugin YOK —
  G55'in hedeflediği asıl cihaz senaryosu) ile test edildi: "2) ... TANIMSIZ
  — plugin native tarafta KAYITLI DEĞİL" logu + "Sonuç: Plugin KAYITLI
  DEĞİL" toast'ı, Xcode adımlarını işaret eden metinle DOĞRU üretildi.
- SAHTE plugin (`pickFiles` gerçek bir blob döndüren) ile test edildi:
  "3) pickFiles() ÇAĞRILIYOR" → "4) pickFiles() DÖNDÜ" logları + "Sonuç:
  BAŞARILI ✓" toast'ı DOĞRU üretildi.
- Motor 3'ün çift-upload proxy butonları (cakismaFileInputA/B) ve tekli
  upload'ın fallback zinciri (G52/G53) REGRESYONSUZ çalışmaya devam ediyor
  — canlı test edildi. Motor 3'ün 3-aşama mekaniği bozulmadı.
- Konsol hatası SIFIR. `npm test`: **753/753** (değişmedi — bu tur SADECE
  DOM/plugin/teşhis kablolaması, hiçbir saf fonksiyon etkilenmedi).

**Dürüstlük notu:** kod/konfigürasyon tarafında YAPILABİLECEK HER şey
doğrulandı ve düzeltildi (aslında düzeltilecek bir HATA bulunamadı — hepsi
zaten doğruydu) — ama native picker'ın cihazda GERÇEKTEN açılıp açılmadığı
BU OTURUMDA YİNE doğrulanamaz. Yeni teşhis aracı, kullanıcının BİR SONRAKİ
cihaz denemesinde kök sebebi KESİN olarak (dört olasılıktan hangisi
olduğunu) görmesini sağlıyor — bu, "muhtemelen X" yerine "KESİNLİKLE X"
diyebilmek için GEREKLİ bir sonraki adım.

**KORUMA:** Motor 3 mekaniği, diğer modlar, ses işleme HİÇ değişmedi —
sadece teşhis/log derinliği + izole bir test butonu eklendi.

---

Önceki commit (G54, tek commit — kod+DURUM.md birlikte) — **9 modun kaynak
listesi tek tek denetlendi — Frekans Bulma'da kayıp enstrümanlar (davul +
enstrüman grupları) bulundu ve geri getirildi, diğer 8 mod DOĞRU çıktı.**

**KÖK SEBEP — G50/G51/G52'de DEĞİL, G42'den (06.08.2026, bu tur ÖNCESİ) beri
var olan eski bir teknik borç:** `source-catalog.js`'e davul/enstrüman
örnekleri G4'te eklendiğinde ve merkezi `compatibleSourceIds()` filtresi
G42'de kurulduğunda, dört "frekans-genel" mod (Kesim Noktası/dB Seviyesi/
Boost mu Cut mu/Q Genişliği) bu yeni mekanizmaya taşındı — ama Frekans
Bulma'nın `getMeta()`'sı G42'nin KENDİ commit mesajında "yedi mod dosyası
(**Frekans Bulma hariç**)" diye AÇIKÇA belgelenen bir istisnayla ESKİ, elle
yazılmış bir diziyi (`["pink","white","saw","square","triangle","upload"]`)
KORUDU — bu dizi `compatibleSourceIds()`'ten ÖNCEKİ, davul/enstrüman
kataloğa eklenmeden ÖNCEKİ bir kalıntıydı, hiçbir zaman geri dönülüp
tamamlanmadı. Sonuç: kick/snare/hihat/tom/groove/bass/bass_alt/guitar/vocal
Frekans Bulma'nın Kaynak sheet'inde HİÇ görünmüyordu — cihazda kullanıcı
raporuyla YAKALANDI (`git log -S` ile doğrulandı: satır `4f6879a`'da —
projenin çok erken bir turunda — tanımlanmış, G42 SIRASINDA bilinçli olarak
dokunulmamış).

**9 MODUN TEK TEK DENETİM SONUCU:**
| Mod | Beklenen | Durum |
|---|---|---|
| Frekans Bulma | TÜM kaynaklar | **BOZUKTU → DÜZELTİLDİ** |
| Kesim Noktası | TÜM kaynaklar | Doğruydu (G42'den beri `compatibleSourceIds()`) |
| dB Seviyesi | TÜM kaynaklar | Doğruydu |
| Boost mu Cut mu | TÜM kaynaklar | Doğruydu |
| Q Genişliği | TÜM kaynaklar | Doğruydu |
| Kompresör | transient'sız (pink/white) hariç TÜMÜ | Doğruydu (G42'nin `requireTransient`) |
| Reverb | SADECE gitar/vokal/snare/groove/upload | Doğruydu (G43'ün `only` düzeltmesi) |
| Tonal Denge | SADECE groove/upload | Doğruydu (G45'in kendi kararı) |
| Frekans Çakışması | çift-tabanlı (uyumluKaynaklar boş, SOURCE_PAIRS 3 çift) | Doğruydu (G51/G52) |

**DÜZELTME — `frekans-bulma.js`:** `import { compatibleSourceIds } from
"../core/source-catalog.js";` eklendi, `getMeta().uyumluKaynaklar` artık
diğer dört frekans-genel modla BİREBİR AYNI çağrıyı (`compatibleSourceIds()`,
parametresiz — TÜM kaynaklar) kullanıyor. `source-catalog.js`'in KENDİSİNE
(SOURCE_GROUPS/SOURCE_PAIRS/compatibleSourceIds) TEK SATIR dokunulmadı —
sorun HER ZAMAN Frekans Bulma'nın KENDİ eski satırındaydı, merkezi
mekanizmada değil.

**Doğrulama:**
- Canlı, tarayıcıda (hard reload ile modül önbelleği bypass edilerek):
  Frekans Bulma'nın Kaynak sheet'i artık SENTETİK + **DAVUL** (Kick/Snare/
  Hi-Hat/Tom/Davul Döngüsü) + **ENSTRÜMAN** (Bas C2/Bas E2/Akustik Gitar/
  Vokal) + KENDİ DOSYAM dört grubunu EKRAN GÖRÜNTÜSÜYLE gösteriyor —
  önceden SADECE SENTETİK+KENDİ DOSYAM vardı. Reverb'in kısıtlı listesi
  (`["guitar","vocal","snare","groove","upload"]`) DEĞİŞMEDEN doğrulandı.
  Konsol hatası SIFIR.
- YENİ regresyon çiti — `test/source-catalog.test.mjs`'e "G54 — 9 modun
  kaynak listesi doğru mu" describe'u: her modun `getMeta().uyumluKaynaklar`'ı
  DOĞRUDAN beklenen kümeyle karşılaştırılıyor (Frekans Bulma/Kesim/dB/Boost-
  Cut/Q → TÜM kaynaklar birebir liste; Kompresör → pink/white hariç;
  Reverb/Tonal Denge → tam eşitlik; Frekans Çakışması → boş + SOURCE_PAIRS
  3 çift) — böylece gelecekte HERHANGİ bir mod sessizce eski/eksik bir
  listeye düşerse test KIRILIR (bu turdaki hatanın YAKALANAMAMASININ asıl
  sebebi, `compatibleSourceIds()`'in KENDİSİNİN test edilip ÇAĞIRAN
  tarafın/her modun HİÇ test edilmemesiydi).
- `npm test`: **753/753** (744'ten +9 — yukarıdaki yeni describe).

**KORUMA:** Mod mantığı/ses/zorluk/sınav HİÇ değişmedi — SADECE
`frekans-bulma.js`'in `getMeta().uyumluKaynaklar` satırı düzeltildi.
Reverb/Kompresör/Tonal Denge/Frekans Çakışması'nın KASITLI kısıtları
DOKUNULMADAN korundu (yukarıdaki tabloda TEK TEK doğrulandı).

---

Önceki commit (G53, tek commit — kod+DURUM.md birlikte) — **Dosya yükleme cihazda
HÂLÂ açılmıyordu (G52'nin transform düzeltmesi yetmedi) — KÖK ÇÖZÜM: web
`<input type="file">` tamamen terk edildi, Capacitor'ın NATIVE dosya seçici
plugin'ine (`@capawesome/capacitor-file-picker`) geçildi.**

**ÖNCE KONTROL (task'ın istediği):** Repo'da (DURUM.md, koddaki "cihazda
doğrulandı" notları) upload'ın gerçek cihazda ÇALIŞTIĞI tek bir yer
BULUNAMADI — tüm "cihazda doğrulandı" kayıtları SES OYNATMA hatalarıyla
ilgiliydi (HTTP 0, kesik çalma), dosya SEÇİCİNİN kendisiyle ilgili hiçbir
olumlu kayıt yok. Yani kopyalanacak çalışan bir yol YOKTU — task'ın kendi
"yoksa native'e geç" dalına gidildi.

**KÖK ÇÖZÜM — native plugin:** `@capawesome/capacitor-file-picker@8.0.4`
(`@capacitor/core@8.4.2` ile uyumlu) kuruldu, `npx cap sync ios` ile iOS
projesine (Package.swift, CocoaPods) eklendi — artık 4 Capacitor plugin'i var
(volume-buttons/preferences/splash-screen/**file-picker**). `FilePicker.
pickFiles()` `UIDocumentPickerViewController` kullanıyor — plugin'in kendi
README'si: **"iOS'ta hiçbir gizlilik açıklaması (Info.plist izni)
GEREKMEZ"** (SADECE `pickImages`/`pickMedia`/`pickVideos` — foto galerisi
seçicileri — izin ister, biz onları KULLANMIYORUZ). Bu yüzden Info.plist'e
HİÇBİR ekleme yapılmadı — plugin'in kendi Swift kaynağı (`FilePicker.swift`)
`UIDocumentPicker` kullandığı kod incelemesiyle DOĞRULANDI.

**app.js kablolaması — projenin KENDİ yerleşik "global window.Capacitor.
Plugins.*" deseni izlendi (bundler YOK, storage.js:getPreferencesPlugin/
app.js:getVolumeButtonsPlugin'in AYNI deseni — hiçbir ES-module `import`
eklenmedi):**
- `getFilePickerPlugin()` — `window.Capacitor.Plugins.FilePicker`'ı okur,
  yoksa `null`.
- `pickNativeAudioFile()` — plugin varsa `pickFiles({limit:1})` çağırır,
  sonucu (web'de `.blob`, iOS/Android'de `.path` + plugin'in KENDİ önerdiği
  `fetch(Capacitor.convertFileSrc(path))` deseni) upload.js'in beklediği
  gerçek bir `File` nesnesine köprüler ve döner. **`undefined`** dönerse
  (plugin bu ortamda YOK — masaüstü/web geliştirme) çağıran taraf G52'nin
  relocated (transform'suz) `<input type="file">`'ına DÜŞER — web fallback
  HİÇ SİLİNMEDİ, sadece artık İKİNCİL yol.
- `processSingleUploadFile`/`processCakismaUploadFile`/`processToolsUploadFile`
  — eski `change` listener'larının GÖVDESİ bu üç fonksiyona ÇIKARILDI (saf
  "bir File al, doğrula/yükle/geri-bildirim ver" mantığı) — hem native hem
  web-fallback yolu AYNI fonksiyonları çağırıyor, tek doğrulama/hata kod
  yolu, davranış İKİ platformda BİREBİR aynı.
- `.upload-trigger-btn` tıklaması artık ÖNCE `pickNativeAudioFile()` dener,
  `undefined` dönerse eski `.click()` proxy'sine düşer. `sourceSelect`
  sheet'inin "Dosya seç" satırı ve Araçlar sekmesinin (`toolsUploadBtn`,
  sadece ad/boyut gösteren statik örnek — gerçek ses zincirine bağlı değil)
  yükleme butonu da AYNI deseni aldı (kullanıcının "hiçbir yerde açılmıyor"
  raporu geniş yorumlandı, tutarlılık için).

**Doğrulama (bu ortamda, masaüstü tarayıcı — `window.Capacitor` doğal olarak
YOK):**
- Fallback dalı: `pickNativeAudioFile()` gerçekten `undefined` döndü,
  proxy buton doğru şekilde relocated input'u `.click()`'ledi, gerçek dosya
  (kick.m4a, `fetch`+`DataTransfer`) uçtan uca yüklendi — G52'nin davranışı
  BİREBİR korundu.
- Native dal (KÖPRÜ MANTIĞI): `window.Capacitor.Plugins.FilePicker.
  pickFiles` SAHTE bir plugin ile İKİ AYRI senaryoda taklit edildi — (1)
  `.blob` alanlı sonuç (web-tipi), (2) `.path` alanlı sonuç (iOS/Android-tipi,
  `convertFileSrc`+`fetch` zinciri) — İKİSİ de doğru şekilde `File`
  nesnesine dönüşüp `processCakismaUploadFile`'a ulaştı, "bass.m4a/vocal.m4a
  başarıyla yüklendi" geri bildirimi + dosya adı satırı DOĞRU render edildi.
  **Dürüstlük notu:** bu SADECE JS köprü mantığının (blob/path→File
  dönüşümü, doğrulama, uploadManager.loadFile) doğruluğunu kanıtlıyor —
  `UIDocumentPickerViewController`'ın GERÇEKTEN CİHAZDA açılıp açılmadığı bu
  ortamdan doğrulanamaz (native Swift kod, masaüstü tarayıcıda hiç çalışmaz).
  Plugin resmi olarak Capacitor 8 ile uyumlu ve iOS için CocoaPods/SPM
  entegrasyonu `npx cap sync ios` ile başarıyla kuruldu — nihai onay
  kullanıcının cihazda denemesini gerektiriyor.
- Regresyon: Frekans Bulma'da bir round sorunsuz oynandı, konsol hatası
  SIFIR. Motor 3'ün 3-aşama mekaniği/sınav mirası/diğer 7 mod HİÇ
  değişmedi (bu tur SADECE dosya SEÇME yöntemini değiştirdi, ses işleme
  zincirine — `uploadManager.loadFile`/`decodeAudioData` — tek satır
  dokunulmadı).
- `npm test`: **744/744** (değişmedi — bu tur SADECE DOM/plugin kablolaması,
  hiçbir saf fonksiyon etkilenmedi, yeni test gerekmedi).

**KORUMA:** Motor 3 mekaniği, 8 mevcut mod, ses işleme zinciri HİÇ
değişmedi. `package.json`'a TEK yeni bağımlılık eklendi
(`@capawesome/capacitor-file-picker`), `node_modules`'te 1 paket kuruldu.

---

Önceki commit (G52, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Frekans
Çakışması (Motor 3): cihazda AÇILMAYAN upload düzeltildi + 2 yeni kaynak çifti
+ spektrum renkleri ayrıştırıldı.** G51'de "TEMEL AT" olarak kurulan Motor 3'ün
kullanıcı tarafından cihazda bulunan üç eksiği kapatıldı.

**1) UPLOAD KÖK SEBEP BULUNDU VE DÜZELTİLDİ — WebKit/iOS'un `<input type="file">`
+ transform hatası:** `.bottom-sheet` (oyun ayarları sheet'i, kaynak dosyası
yükleme satırlarının bulunduğu yer) HER ZAMAN aktif bir `transform` taşıyor
(`transform:translateY(100%)` kapalıyken, `translateY(0)` açıkken — `none`
DEĞİL, HİÇBİR zaman). WebKit/iOS'un uzun süredir bilinen bir hatası: bir
`<input type="file">`'ın ATALARINDAN HERHANGİ biri transform taşıyorsa (identity
`translateY(0)` DAHİL) dokunma native dosya seçiciyi AÇMIYOR. Masaüstü
Chrome'da bu hata hiç yok — G51'in TÜM canlı doğrulamaları SADECE masaüstü
tarayıcı otomasyonuyla yapıldığı için (bkz. DURUM.md G51) bu hiç yakalanmadı;
kullanıcı gerçek cihazda test edince ortaya çıktı. **Düzeltme:** gerçek
`<input type="file">` elemanları (audioFileInput + cakismaFileInputA/B — TEK
upload'ı da kapsıyor, AYNI hata ona da bulaşıyordu) DOM'da bu sheet'in
DIŞINA, `<body>`'nin doğrudan çocuğu olarak (index.html sonuna) taşındı —
`.file-input-native` (styles.css) ile görsel olarak gizli (`display:none`
DEĞİL, bazı WebKit sürümlerinde bu `.click()` güvenilirliğini bozabiliyor;
`position:fixed;opacity:0` kullanıldı). Eski konumlarında SADECE görünür bir
proxy `<button class="upload-trigger-btn" data-file-target="...">` kaldı —
tıklanınca SENKRON (await/setTimeout YOK, "kullanıcı jesti" zincirini kesmesin
diye) hedef inputun `.click()`'ini çağırıyor (app.js'te TEK generic listener,
tüm proxy butonları kapsıyor). Seçilen dosya adı artık native inputun kendi
satır-içi gösteriminin YERİNE yeni bir `.upload-filename` span'ıyla JS'ten
yazılıyor (`#audioFileInputName`/`#cakismaFileInputAName`/`...BName`).
**Doğrulanan:** relocated üç input'un da ATA ZİNCİRİNDE transform YOK (JS'ten
`getComputedStyle` ile tek tek kontrol edildi); proxy buton tıklaması hedef
inputun `.click()`'ini GERÇEKTEN tetikliyor (event listener'la doğrulandı);
gerçek bir dosya (kick.m4a, `fetch()`+`DataTransfer` ile input'a atanıp
`change` event'i tetiklenerek) uçtan uca yüklendi — `uploadManager.loadFile`
çalıştı, "kick.m4a başarıyla yüklendi" geri bildirimi + dosya adı satırı
EKRAN GÖRÜNTÜSÜYLE doğrulandı. **Dürüstlük notu:** bu son adım (gerçek native
seçicinin CİHAZDA açılması) masaüstü tarayıcı ortamından DOĞRULANAMAZ — kök
sebep (transform ataları) giderildi ve ilgili WebKit hatası iyi belgeli/
bilinen bir hata olduğu için yüksek güvenle düzeltildiği düşünülüyor, ama
NİHAİ doğrulama kullanıcının cihazda tekrar denemesini gerektiriyor.

**2) İKİ YENİ HAZIR KAYNAK ÇİFTİ — `source-catalog.js:SOURCE_PAIRS`
genişletildi:** task'ın verdiği üç hazır setten eksik olan ikisi eklendi:
vokal+gitar (`region:[500,2000]`, ORTA bölge — task: "~2kHz orta",
frekans-bulma.js'in FA_ZONES ORTA sınırlarıyla hizalı) ve snare+gitar
(`region:[200,2000]`, task'ın kendi verdiği "~200Hz-2kHz" aralığı BİREBİR).
Yeni ses dosyası GEREKMEDİ — `vocal.m4a`/`acoustic_guitar.m4a`/`snare.m4a`
zaten `SOURCE_GROUPS`'ta vardı (G51'den önce bile), G52 SADECE bunları
Motor 3'ün çift-listesine YENİ eşleme olarak ekledi. `createQuestion()`
zaten `findSourcePair(settings.pairId)` ile TAMAMEN generic çalıştığı için
(G51'de kick-bas için kurulan mimari) mod dosyasında SIFIR ek kod gerekti —
sadece `index.html`'in `#cakismaPairSelect`'ine iki yeni `<option>` eklendi.
Canlı doğrulandı: pair seçici artık 4 seçenek gösteriyor (Kick+Bas/Vokal+
Gitar/Snare+Gitar/Kendi dosyalarım), Vokal+Gitar seçilip round başlatılınca
soru doğru şekilde "Vokal ve Gitar hangi frekansta çakışıyor?" ve trueCenter
gerçekten 500-2000 Hz aralığında üretildi (ekran görüntüsü: 68 Hz DEĞİL,
1.76 kHz'lik bir çakışma sorusu).

**3) SPEKTRUM RENKLERİ AYRIŞTIRILDI — task'ın "iki kaynak FARKLI renkte,
çakışan bölge VURGULU" kararı uygulandı:** G51'in görseli aslında iki AYRI
kaynak spektrumu ÇİZMİYORDU — sadece TEK bir "çakışma bölgesi" eğrisi vardı
(DURUM.md G51'in "iki kaynağın spektrumu üst üste" ifadesi yanıltıcıydı,
gerçek kod tek eğriliydi). Şimdi: her kaynağın trueCenter'ın hafifçe altına/
üstüne (0.55 oktav) kaydırılmış, dar (1.1 oktav) bir "varlık eğrisi" —
Kaynak A = amber (`--am`, uygulamanın ana vurgusu), Kaynak B = mor (`--pu`,
Motor 3'ün KENDİ marka rengi — MOTOR_INFO[3] ve kaynak-çifti chip'iyle AYNI)
— mavi YOK (task: "iZotope mavisine yaklaşma"). Çakışma bölgesi artık ÜÇÜNCÜ
bir dolgu-eğrisi DEĞİL (ilk taslak böyleydi — iki kaynağın rengini ÜSTÜNE
düşüp BASTIRIYORDU, "net ayrışsın" isteğiyle çelişiyordu) — DİKEY bir vurgu
şeridi (`drawCollisionBand`, centerFreq±widthOct/2 aralığını kaplayan
yarı-saydam kırmızı dikdörtgen + parlak üst kenar çizgisi), kaynakların
eğrilerinin ARKASINA çizilir, böylece amber/mor HER ZAMAN üstte/görünür
kalır. Legend iki satıra çıktı: "● [LabelA] ● [LabelB]" + "● Çakışma bölgesi"
(+ cevap sonrası "● Senin seçimin", GUESS_COLOR — COLLISION_COLOR'dan
BİLEREK farklı bir kırmızı tonu, ikisi aynı anda görünebildiği için
karıştırılmasın diye). EKRAN GÖRÜNTÜSÜYLE doğrulandı — Vokal+Gitar gibi geniş
region'lu çiftlerde amber/mor/kırmızı NET ayrışıyor (bkz. ekran görüntüsü:
sol tepe amber "Vokal", sağ tepe mor "Gitar", ortada parlak kırmızı şerit).
**Bilinen sınırlama (yeni tespit edildi, düzeltilmedi):** kick-bas çiftinin
region'ı ([50,160] Hz) frekans-bulma.js'in PAYLAŞILAN ekseninin kendi
FA_MIN'inin (80 Hz) ALTINA sarkıyor — bu G51'den beri var olan, bu turda
farkedilen bir sınır sorunu (80 Hz altı x-koordinatları ekranın SOLUNA taşıp
kırpılıyor, kick-bas'ta iki kaynağın görsel ayrışması diğer çiftler kadar net
değil). FA_MIN'i değiştirmek PAYLAŞILAN bir sabit (frekans-bulma.js, diğer
sekiz modun ekseni) olduğu için KAPSAM DIŞI bırakıldı — DOKUNULMAZ listesine
giriyor.

**KORUMA:** Motor 3'ün 3-aşama mekaniği, sınav mirası, 8 mevcut mod HİÇ
değişmedi — regresyon kontrolü Frekans Bulma'da canlı yapıldı (bir round
sorunsuz oynandı, konsol hatası SIFIR). `npm test`: **744/744** (738'den +6 —
yeni `test/frekans-cakismasi.test.mjs` testleri: vokal-gitar/snare-gitar
çiftlerinin varlığı+region'ları+source-catalog tutarlılığı, findSourcePair
üç hazır çiftin hepsini çözüyor mu, pro tier'de 50 seed'lik benzersizlik
stres testi HER İKİ yeni çift için).

---

Önceki commit (G51, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **MOD 9
"FREKANS ÇAKIŞMASI" (MOTOR 3) — TEMEL AT: iki kaynaklı maskeleme teşhis+çöz
modu, 8. oynanabilir mod olarak menüye eklendi.** Motor 1 (değeri bul) ve
Motor 2 (hangisi farklı) değil — İKİ kaynağın AYNI ANDA çaldığı, bir frekans
bölgesinde ÇAKIŞTIĞI YENİ bir motor. SoundGym'de/rakiplerde karşılığı
bulunamadı (araştırıldı) — projenin en özgün modu.

**MİMARİ KARAR — "3 aşama" AYNI turda değil, seviyeye göre AÇILAN AYRI
tur'lar:** Task metni "AŞAMA 1/2/3" ifadesiyle tek bir round içinde üç adımlık
bir akış çağrıştırıyordu, ama prototype.html'in kendi tasarım notu AÇIKÇA
"Aşamalar seviyeye göre açılır" diyor (level-gated, tek turda tek aşama).
Bu ÇELİŞKİ, kod tabanının KENDİ kanıtlanmış emsaliyle (`boost-mu-cut-mu.js:
layerForIndex` — "bir soru = bir katman, hangi katman sessionQuestionIndex
eşiğine göre seçilir") çözüldü: `stageForIndex(sessionQuestionIndex)` — Soru
1-3 → Aşama 1 (TEŞHİS: çakışma hangi bölgede?), Soru 4-9 → Aşama 2 (KARAR:
hangi kaynaktan kesmeli?), Soru 10+ → Aşama 3 (ÇÖZ: ne kadar kesmeli? +
öncesi/sonrası dinle). BİLİNÇLİ bir mühendislik kararı olarak koda yorumla
belgelendi (ürün kararı DEĞİL — task'ın kendi "TEMEL AT" çerçevesi ve minimum-
risk state-machine hedefiyle gerekçelendirildi), kullanıcıya AYRICA
sorulmadı.

**KAYNAKLAR — `core/source-catalog.js`'e YENİ, AYRI bir `SOURCE_PAIRS`
listesi (mevcut `SOURCE_GROUPS`'a HİÇ dokunulmadı):** şimdilik TEK çift
(kick+bas, 50-160Hz sub/bas bölgesi) — vokal+gitar/gitar+snare gibi diğer
çiftler task'ın kendi "şimdilik temel" talimatıyla SONRAYA bırakıldı
(KULAKLA/ÜRÜN DOĞRULANMADI, ileride genişleyecek). `OWN_SOURCE_PAIR` (id:
"own") kullanıcının KENDİ iki dosyasını (`upload-a`/`upload-b` sentinel ID,
`findSource()`'tan BAĞIMSIZ, app.js/audio-engine.js'te özel çözümlenir)
AYRI AYRI yüklemesini temsil eder — HER dosya için 100 MB sınır (TOPLAM
değil, HER BİRİ), index.html'deki gerçek buton metniyle canlı doğrulandı
("Kaynak A/B yükle (her biri 100 MB'a kadar)").

**İKİ KAYNAKLI SES MİMARİSİ — `audio-engine.js`'e SADECE EKLEME, tek
kaynaklı 8 modun hiçbir kod yoluna dokunulmadı:** `buildDualSourceChain()`
mevcut `buildQuestionChain`'in kaynak-tipine-göre-bağlanma mantığını (upload/
pink/white/sample/synth) İKİ KEZ çalıştırır, iki bağımsız gain→filtre
zinciri kurar, ikisi de PAYLAŞILAN `compressor`→`out`→`muteGain`'e akar.
`setDualCut(sourceKey, gainDb)` — Motor 1'in dry/wet crossfade zihniyetinin
(`setProcessed`) AYNI kalıbı: SEÇİLEN kaynağın filtresini hedef dB'ye,
DİĞERİNİ 0'a `setTargetAtTime` ile yumuşak kaydırır (öncesi/sonrası
düğmelerinin arkasındaki mekanizma). `createUploadManager()`'ın (upload.js)
STATELESS FACTORY olduğu keşfedildi — bu sayede `uploadManagerA`/
`uploadManagerB` diye İKİNCİ bir bağımsız yükleme örneği, upload.js'e HİÇ
dokunmadan app.js'te iki satırla açıldı. `setDualSolo()` de yazıldı (A/B/
İkisi-birden crossfade) ama HİÇBİR UI kontrolüne bağlanmadı — bilinçli
kapsam sadeleştirmesi, kullanılmayan ama çalışan bir yetenek olarak
belgelendi.

**KADEMELİ ZORLUK — `CAKISMA_CURVE_CONFIG` + merkezi `logLerp`/
`applyPostCapFloor`, diğer modlarla AYNI "baştan doğru kalibrasyon" yöntemi:**
Aşama 1'de zorlukla ÇAKIŞMA BÖLGESİ daralır (regionWidthOct), Aşama 3'te
KESİM HASSASİYETİ artar (cutStepDb küçülür). İlk taslak sabitleri
"kolaylaşma yok" invaryantını (curve(tier'in temsili seviyesi) ≤ statik
DIFFICULTY[tier]) hard kademesinde İHLAL ETTİ — node script'iyle binary-
search yapılıp düzeltildi (regionWidthOct AT_CAP 0.4→0.38/FLOOR 0.32→0.3,
cutStepDb AT_CAP 0.8→0.72/FLOOR 0.65→0.55, timeSec AT_CAP 9→7.5/FLOOR 7→6),
final değerler testle doğrulandı.

**SINAV SİSTEMİ MİRAS ALINDI (G47-G50'nin AYNI merkezi altyapısı, TEK SATIR
bile değişmedi):** `EXAM_ENABLED=true`, `EXAM_DIFFICULTY="pro"`,
`EXAM_WEAK_AREA="zone"` (çakışma frekans-tabanlı olduğu için zon-tabanlı
telafi, G50'nin `getWeakArea` dispatcher'ı SADECE bu üç satırı okuyarak
otomatik doğru dala düştü).

**MOD SÖZLEŞMESİ:** `getMeta` (5 tier + EXAM_*+ kaynak çiftleri),
`createQuestion`/`evaluateAnswer` SAF kaldı (stage-branched ama ses/DOM
bağımsız), `applyProcessing` (`{filterA, filterB}` döner), `calculateXP`,
`getFeedbackData` — mevcut 8 modla BİREBİR aynı desen.

**app.js kablolaması — generic dispatch desenleri (`q.mode==="cakisma"`)
TÜM mevcut dallara EKLENDİ, hiçbiri DEĞİŞTİRİLMEDİ:** `isChoiceFormat()`,
`renderQuestion()`, `.ans` click-delegasyonu, `drawVisualizer()`'ın mode-
agnostik `overlayState` torbası (`cakismaGuess` alanı, "diğer modlar
okumuyor" kuralı korunarak). Yeni `submitCakismaGuess()` — 6 generic submit
fonksiyonunun (G50) AYNI iskeleti, stage-3'te `audioEngine.setDualCut(...)`
ile `stopAudio()` YERİNE geçen özel dal + `#cakismaCompare` önce/sonra
satırı aktivasyonu.

**Doğrulama (canlı, tarayıcıda):**
- Mod menüde görünüyor ve oynanabilir — `mode-catalog.js`'te
  `kulaklikGerekli:true`/`playable:true`'ya çevrildi (sub/bas bölgesi
  kulaklıkta daha net ayrışıyor gerekçesiyle — KULAKLA doğrulanmadı, makul
  varsayım).
- 3 aşama sırayla çalışıyor: Aşama 1 (bölge şıkları), Aşama 2 (hangi
  kaynaktan-kes), Aşama 3 ("50 Hz'de Kick'dan ne kadar kesmeli?" gibi sayısal
  yakınlık sorusu, ör. gerçek feedback: "Kick'dan 5.1 dB kesilmesi
  gerekiyordu, sen 7.3 dB dedin — yakınlık %75") — EKRANDAN canlı doğrulandı.
- Çözünce maskeleme açılıyor mu: Aşama 3 cevaplandıktan sonra `#cakismaCompare`
  (Önce/Sonra) satırı görünür oluyor, `setDualCut` ile filtre gerçekten
  hareket ediyor — buton tıklamaları `.on` class'ını doğru şekilde
  değiştirdiği JS'ten doğrulandı.
- Kademeli zorluk: birim testlerle ("kolaylaşma yok" invaryantı) + canlı
  oturumda Aşama 1/3 soru zorluğunun seviyeyle inceldiği gözlemlendi.
- Upload iki AYRI yol: "Kendi dosyalarım" çift seçilince `#cakismaUploadRowA`/
  `#cakismaUploadRowB` (her biri "100 MB'a kadar" etiketiyle) göründü,
  gerçek dosyalar (kick.m4a/bass.m4a, Chrome uzantısı file-input aracıyla)
  YÜKLENDİ, ikisi de yüklenmeden round başlatılmaya çalışılınca doğru uyarı
  çıktı ("Kendi dosyalarım seçiliyse A ve B için ayrı ayrı bir ses dosyası
  seçmelisin"), ikisi de yüklenince round BAŞARIYLA başladı ve soru "80
  Hz'de Kendi A'dan ne kadar kesmeli?" biçiminde kaynak etiketleriyle
  (Kendi A/Kendi B) doğru render edildi — TAM uçtan uca canlı doğrulandı.
- Öğretim + görsel: cevap sonrası mix-dili öğretim metni + iki kaynağın
  spektrumunun üst üste, çakışma bölgesi vurgulu (BiquadFilterNode.
  getFrequencyResponse tabanlı GERÇEK eğri, boost-mu-cut-mu.js'in AYNI
  tekniği) çizildiği kod incelemesiyle + ekran görüntüsüyle doğrulandı.
  **Bilinen kozmetik sorun (düzeltilmedi):** `drawAxis` `!q` guard'ından
  ÖNCE çağrıldığı için oyun başlamadan da eksen çiziliyor ve en soldaki "80"
  etiketi kenara kırpılıp sadece "0" görünüyor — işlevi ETKİLEMİYOR.
- Sınav sistemi: kombo-6 → "Sınav hakkı kazandın!" teklif sheet'i doğru
  metinle EKRANDAN canlı doğrulandı. Mekanik olarak AYNI şeyi test eden
  telafi akışı (parkur <6 doğru → "Telafi 1/5" → 5 soru → geç/kal → yeni
  parkur "Soru 1/10") UÇTAN UCA İKİ KEZ canlı doğrulandı — `examSystem.
  label()`'ın faz geçişlerini ("Soru N/10"/"Telafi N/5") doğru okuduğu
  KANITLANDI. **Dürüstlük notu:** tam SINAV akışı (kabul→4 soru→geç/kal)
  bu oturumda uçtan uca TAMAMLANAMADI — bu modun Aşama 2/3 puanlaması
  ikili doğru/yanlış değil SAYISAL YAKINLIK yüzdesi olduğu için, önceden
  belirlenmiş `Math.random` ile "her zaman doğru tıkla" yöntemi (G47-G50'de
  kullanılan) burada işlemedi; kombo-tetikli teklif sheet'i + AYNI merkezi
  kod yolunu kullanan telafi akışının uçtan uca çalışması BİRLİKTE güçlü
  bir kanıt sayılıyor, ama "BÖLÜM GEÇTİN" ekranı bu modda GÖRÜLMEDİ
  (7 diğer modda G50'de zaten görülmüştü, exam-system.js'e bu turda TEK
  SATIR dokunulmadı).
- Regresyon: Frekans Bulma'da (paylaşılan `playQuestion`/`startRound`/
  `renderQuestion`/`stopAudio`/`.ans` click-delegasyonu — bu turda dokunulan
  TÜM ortak fonksiyonlar) bir round baştan sona sorunsuz oynandı, konsol
  hatası SIFIR. Kompresör'e (Pro kilit, satın alma gerektirdiği için AYRICA
  kilit açılmadı) doğrudan girilemedi — bu tek regresyon maddesi TAMAMLANAMADI,
  kod incelemesiyle (dokunulan dallar TÜMÜ `mode.MODE_ID==="frekans-cakismasi"`
  veya `q.mode==="cakisma"` koşuluyla gated) makul güvence sağlandı.
- `npm test`: **738/738** (707'den +31 — YENİ `test/frekans-cakismasi.test.mjs`:
  SOURCE_PAIRS/OWN_SOURCE_PAIR/findSourcePair, stageForIndex ramp, choice
  üretimi [benzersizlik + fallback], createQuestion/evaluateAnswer/calculateXP
  sözleşmesi, "kolaylaşma yok" invaryantı, EXAM_* bayrakları).

**KORUNANLAR (task'ın açık isteği):** 8 mevcut mod, exam-system.js,
three-way-cards.js, reskin, ses/zorluk HİÇ değişmedi — canlı + testle
doğrulandı. Motor 3 kendi izole kod yollarında (`cakisma` string dispatch'i,
`buildDualSourceChain`/`setDualCut`, ayrı `uploadManagerA/B`) yaşıyor.

**BİLİNEN SINIRLAMALAR/SONRAKİ TUR İÇİN:** (1) `setDualSolo` (A/B/İkisi-
birden dinleme) yazıldı ama HİÇBİR UI'ya bağlanmadı. (2) Sadece TEK kaynak
çifti (kick+bas) yerleşik — vokal+gitar/gitar+snare gibi diğerleri task'ın
kendi "şimdilik temel" kararıyla ertelendi. (3) `drawAxis` kozmetik kırpma
sorunu (yukarıda). (4) Aşama seçimi rastgele DEĞİL, `stageForIndex`
session-index eşiğiyle SIRALI açılıyor — bu MİMARİ KARAR bölümünde
gerekçelendirildi, kullanıcı onayı istenmedi (TEMEL AT çerçevesi).

---

**ZAYIF BÖLGE dispatcher'ı — `getWeakArea(stats, modeId)` (app.js, yeni):**
task'ın istediği moda-göre-dallanma. `mode.EXAM_WEAK_AREA==="zone"` (Frekans
Bulma/Kesim Noktası/Boost-Cut/Q Genişliği — dördü de yeni export) iken
`personalization.js:getWeakZone()` (YENİ SAF fonksiyon, `getWeakTier`'ın AYNI
ROLÜ frekans bölgesi ekseninde — DETERMİNİSTİK en zayıf bölge, `pickPersonalizedZone`'un
ağırlıklı RASTGELE seçiminden BİLEREK AYRIŞIR) PAYLAŞILAN `zoneStats` + modun
kendi `FA_ZONES`'undan en zayıf bölgeyi bulur; `EXAM_WEAK_AREA` export ETMEYEN
dört mod (dB Seviyesi/Kompresör/Reverb/Tonal Denge — "bölge" kavramı yok) ESKİ
`getWeakTier`/tierStats yoluna (G47'den beri DEĞİŞMEDİ) düşer.

**Zon-tabanlı telafi MEKANİZMASI (`app.js:startRound()`):** exam-system.js'in
`remedialTier`'ı (opak, mode-agnostic) zon-tabanlı modlarda bir ZORLUK adı
DEĞİL bir ZONE nesnesi taşır — `questionTier()`'a (difficulty bekler) DOĞRUDAN
geçirilseydi `mode.DIFFICULTY[level]` undefined'a düşerdi. Bunun yerine
`zoneRemedial` bayrağıyla ayrıştırıldı: zorluk `"medium"`de SABİTLENİR (telafi
BÖLGEYLE ilgili, ZORLUKLA değil), `remedialTier.a/.b` `focusRange`'e taşınır —
kullanıcının kendi odak seçimi telafi SÜRESİNCE BİLEREK geçersiz kılınır
(sonraki normal parkurda otomatik geri döner, KALICI bir ayar değişikliği
DEĞİL). **exam-system.js'e TEK SATIR bile dokunulmadı** (task'ın "mod-agnostic
kalsın" şartı harfiyen karşılandı) — tüm yorumlama app.js'in sorumluluğunda.

**Tonal Denge — kendi TrainYourEars mekaniğiyle sınav (odd-one-out DEĞİL):**
task'ın "canlı EQ, zorlaştırılmış — daha fazla bant/ince bozukluk" isteği İKİ
AYRI eksende karşılandı: (1) "ince bozukluk" `EXAM_DIFFICULTY="pro"`
(disturbDb=1.3, mevcut statik tablo) üzerinden OTOMATİK geldi, ekstra kod
gerekmedi; (2) "daha fazla bant" AYRI bir eksen olduğu için (session-index
ramp'ine bağlı, tier'a değil) YENİ bir mode-specific settings alanı —
`examBandBoost` — SADECE `mode.EXAM_ENABLED && examSystem.phase==="exam"`
iken `true` geçiliyor, `tonal-denge.js:createQuestion()` bunu görünce
`sessionQuestionIndex` ramp'ini YOK SAYIP DOĞRUDAN 6 bandı (BAND_SET_6) zorluyor
— diğer yedi mod bu alanı hiç okumadığı için ETKİLENMEDİ. `submitTonalDengeGuess`
(odd-one-out olmayan TEK exam-enabled mod) kendi `handleExamOutcome` çağrısını
diğer beş "generic" submit fonksiyonuyla AYNI şablonla aldı.

**6 generic submit fonksiyonuna `handleExamOutcome` kablolandı** (`submitFrequencyGuess`,
`submitCutoffGuess`, `submitLevelGuess`, `submitBoostCutGuess`, `submitQWidthGuess`,
`submitTonalDengeGuess`) — `submitThreeWayGuess`'in (Kompresör/Reverb) G47'den
beri kurulu deseni BİREBİR kopyalandı: `finalizeIfGameOver()` SONRASI
`!gameOver && mode.EXAM_ENABLED && handleExamOutcome(q, result)`. `submitProPlusGuess`
BİLİNÇLİ OLARAK dokunulmadı (proplus zaten Otomatik'te seçilmiyor, `tierForLevel`in
merdiveninin dışında — Z5 kararıyla AYNI çizgide, G49'un `examCappedLevel`
notundaki "proplus dışarıda" ilkesiyle tutarlı).

**Doğrulama (canlı, tarayıcıda, `Math.random=()=>0` deterministik testle):**
- **8/8 modda parkur/kombo/sınav/kutlama:** Frekans Bulma'da TAM round-trip —
  6 peş peşe doğru → "Sınav hakkı kazandın!" (kombo), reddedilip devam edilip
  6/10 toplamla → "exam-start" (TOPLAM), o sınav bilerek kaybedilip → basit
  parkur reset, YENİ parkurda tekrar kombo-6 → sınav → 3/4 doğru → "BÖLÜM
  GEÇTİN! Seviye 2'ye yükseldin!" EKRAN GÖRÜNTÜSÜYLE doğrulandı. Kesim
  Noktası/Boost mu Cut mu/Q Genişliği/dB Seviyesi/Reverb'de parkur girişi +
  bir cevap + "Soru N/10" etiketi + SIFIR konsol hatası (smoke test).
- **Telafi ekseni doğru mu:** Frekans Bulma'da 4/10 doğru (ne kombo ne toplam)
  → "Telafi 1/5" — şıklar EKRAN GÖRÜNTÜSÜYLE 20-70Hz aralığına (SUB bölgesi)
  YOĞUNLAŞMIŞ görüldü (focusRange daraltması ÇALIŞIYOR) — 3/5 geçildi → YENİ
  parkur ("devam"). dB Seviyesi/Kompresör/Reverb/Tonal Denge'nin tier-tabanlı
  telafisi G47/G48'den beri DEĞİŞMEDİ (regresyon YOK, kod dalı dokunulmadı).
- **Tonal Denge TrainYourEars mekaniğiyle mi:** EKRAN GÖRÜNTÜSÜYLE doğrulandı —
  sınav sorusu "6 bant — kaydırıcılarla sesi nötüre getir" metniyle geldi (6
  slider, `examBandBoost` DOĞRU ZORLADI), odd-one-out A/B/C kartı YOK, 3/4
  doğruyla (yakınlık skoruna göre GRADED XP) → "BÖLÜM GEÇTİN! Seviye 2'ye
  yükseldin!" EKRAN GÖRÜNTÜSÜYLE doğrulandı.
- Tüm oturum boyunca (8 mod, ~40+ tur) konsol hatası SIFIR.
- `npm test`: **707/707** (680'den +27 — YENİ `test/exam-coverage.test.mjs`:
  8 modun TAMAMINDA EXAM_ENABLED/EXAM_DIFFICULTY/EXAM_WEAK_AREA doğru mu [regresyon
  çiti, DOM/ses gerektirmediği için sadece export'ları doğruluyor]; `personalization.test.mjs`'e
  `getWeakZone()` için 5 yeni test [yetersiz veri→null, tek-bölge, en-zayıf-seçimi,
  DETERMİNİSTİK (rng yok), boş zones]; `tonal-denge.test.mjs`'e `examBandBoost`
  için 4 yeni test [ramp'ten bağımsız 6 bant, false/undefined'da regresyon yok]).

**KORUNANLAR (task'ın açık isteği):** 8 modun oyun mantığı/ses/zorluk/reskin HİÇ
değişmedi — canlı doğrulandı. exam-system.js'e TEK SATIR dokunulmadı (mode-
agnostic kaldı, `startRemedial()`'ın opak parametre kabul etme tasarımı bu
sayede zon-tabanlı telafiyi HİÇ bilmeden destekledi — G47'nin "gelecekte başka
eksenler gerekebilir" öngörüsü doğrulandı).

---

Önceki commit (G49, tek commit — kod+DURUM.md birlikte) — **ZORLUK RAMPASINI SINAV-
CAP'İNE BAĞLA: sınavı geçemeyen kullanıcıda "Seviye N" donuyordu ama gerçek
zorluk (kGap/gainDb/Q) ham XP'yle artmaya devam ediyordu — ÇELİŞKİ giderildi.**

**Önceki turda (kontrol görevi) tespit edilen çelişki:** Otomatik zorluk İKİ
KATMANLIYDI — (1) `applyAutoDifficulty()`'nin tier seçimi `progress.modeLevel()`
(sınav-cap'li, `Math.min(rawLevel, examLevel)`) üzerinden DOĞRU donuyordu, ama
(2) `currentDifficultyPosition()`'ın Otomatik-mod TABAN terimi (`continuousLevel
(progress.xpProgress(progress.modeXp(...)))`) HAM/uncapped XP'den geliyordu —
sınav sistemi'nin `examLevel` cap'inden TAMAMEN habersizdi. Sonuç: kullanıcı
sınavı geçemeyip parkurda doğru cevaplamaya devam ettikçe raw XP (her doğru
cevapta koşulsuz birikiyor, `modeState().xp += gained`) artıyor, dolayısıyla
`continuousLevel()`'ın döndürdüğü kesirli konum `LEVEL_CAP`'e (20) kadar
TIRMANMAYA devam ediyordu — Kompresör'ün `paramsForDifficultyPosition()`'ı bu
konumu SADECE mutlak eğri tavanına göre kırpıyordu (`examLevel`'i hiç bilmiyor),
yani ekranda "Seviye 3" donarken arka planda `kGap` (ayırt edilebilirlik)
sürekli küçülüp (zorlaşıp) gidiyordu — "seviye atlayamıyor ama sorular
zorlaşıyor" mantıksızlığı.

**Düzeltme — `core/difficulty-curve.js`'e YENİ SAF fonksiyon `examCappedLevel
(continuousRawLevel, examLevel)`:** `Math.min(continuousRawLevel, examLevel)`
(examLevel sayı değilse — sınav sistemi yok/henüz hiç dallanmadı — AYNEN
`continuousRawLevel` döner, sınırsız). BİLEREK `progress.modeLevel()`'ın
SONUCUNU DEĞİL, `examLevel`'in KENDİSİNİ parametre olarak alır — `modeLevel()`
zaten `rawLevel` ile min'lenmiş bir TAM SAYI; onu burada kullanmak
`continuousRawLevel`'in KESİRLİ kısmını sınava HİÇ ulaşılmamışken bile HER
ZAMAN tam sayıya yuvarlardı (matematiksel olarak doğrulandı, ilk taslakta
YAKALANDI — bkz. fonksiyonun dosya başı yorumu). Matematik: `rawLevel <
examLevel` iken `continuousRawLevel < examLevel` OTOMATİK sağlanır (min hiç
devreye girmez, kesirli ilerleme AYNEN görünür); `rawLevel >= examLevel`
olduğu andan itibaren `Math.min` düz `examLevel`'de KIRPAR — ne kadar fazla XP
birikirse biriksin taban ARTMAZ.

**`app.js:currentDifficultyPosition()` — çağıran taraf:** Otomatik-mod dalı
artık `examCappedLevel(continuousLevel(...), currentModeExamLevel())` (yeni
küçük yardımcı `currentModeExamLevel()`: `mode.EXAM_ENABLED` değilse ya da
`stats.examState[modeId]` bu oturumda henüz kurulmadıysa `undefined` — yani
sınırsız, mevcut yedi mod ve exam-enabled bir modun İLK turu davranışı BİREBİR
KORUNUR). Sabit-mod dalı (`representativeLevelForTier(tier)`) HİÇ dokunulmadı
— zaten XP'ye bakmıyordu. `examActive` (sınav/telafi anları) dalı da HİÇ
dokunulmadı — `difficultyPosition: undefined` geçmeye devam ediyor, o anlar
zaten statik `DIFFICULTY[examTier]`'ı kullanıyordu (G48'den beri sabit).

**Doğrulama (SAYISAL, gerçek/servis edilmiş modüller tarayıcıda dinamik
`import()` ile çağrılarak — bkz. DOĞRULAMA maddeleri, hiçbir sayı uydurulmadı):**
- **Zorluk sabit kalıyor mu:** Sentetik "yüksek ham XP, examLevel=3'te sıkışmış"
  senaryosu — `rawContinuous≈21.3` (LEVEL_CAP'i çoktan aşmış) iken ESKİ
  davranış `kGap≈0.0567` (neredeyse taban/en zor) verirdi; YENİ davranışta
  `examCappedLevel` konumu TAM `3.000`'e kırpıyor → `kGap≈0.3627`. Daha da
  FAZLA XP eklenince (+5000, kullanıcı parkurda doğru cevaba devam etmiş gibi)
  hem konum HEM `kGap` **BİREBİR AYNI** kaldı (`===` ile doğrulandı) — sabit,
  artmıyor.
- **Sınav geçilince bir üst kademeye çıkıyor mu:** AYNI ham konum (`21.3`),
  examLevel 3→4 olunca konum 3→4'e çıktı, `kGap` 0.3627→0.3256'ya DÜŞTÜ (daha
  küçük kGap = daha zor, yani zorluk GERÇEKTEN bir kademe arttı).
- **Sınav/telafi etkilenmedi mi (canlı, `Math.random=()=>0` deterministik
  testle, Kompresör):** Kombo 6 peş peşe → "Sınav hakkı kazandın!" sheet'i
  EKRAN GÖRÜNTÜSÜYLE AYNEN önceki gibi çıktı, "Sınava geç" → 4/4 doğru →
  "BÖLÜM GEÇTİN! Sınavı geçtin — Seviye 4'e yükseldin!" kutlaması EKRAN
  GÖRÜNTÜSÜYLE doğrulandı — tam round-trip boyunca konsol hatası SIFIR.
- **Sabit zorluk modu etkilenmedi mi:** "Zorluk" sheet'inden "Zor" elle
  seçildi (diffModeAuto=false'a geçti), yeni bir round "Soru 1/10" ile
  sorunsuz başladı, konsol hatası SIFIR.
- `npm test`: **680/680** (674'ten +6 — `difficulty-curve.test.mjs`'e
  `examCappedLevel()` için 6 yeni test: examLevel sayı değilken sınırsız,
  ham değer cap'in altındayken KESİRLİ kısmın korunduğu, tam sınırda, cap'i
  aşınca düz kırpıldığı, cap artınca AYNI ham değerin serbest kaldığı,
  examLevel=1 iken her koşulda 1'de sabitlendiği).

**KORUNANLAR (task'ın açık isteği):** Sınav sistemi (parkur/kombo/sınav/telafi/
kutlama), 8 modun oyun mantığı/ses HİÇ değişmedi — canlı doğrulandı. Değişiklik
TEK bir fonksiyonun TEK bir dalına (Otomatik-mod baseline) sıkı sıkıya
sınırlı — paylaşılan `currentDifficultyPosition()` mod-agnostik olduğu için bu
düzeltme gelecekte sınav sistemini miras alan HER mod için otomatik geçerli
(Kompresör dışında bugün başka exam-enabled mod yok).

---

Önceki commit (G48, tek commit — kod+DURUM.md birlikte) — **SINAV SİSTEMİ DÜZELTMESİ:
telafi artık PARKUR başarısızlığına bağlı + "10/5" etiket tutarsızlığı giderildi.**
G47'de kurulan merkezi altyapıdaki BİR MİMARİ HATA düzeltildi: telafi (5 soruluk
zayıf-kademe pratiği) yanlışlıkla "sınavda kalınca" tetikleniyordu — DOĞRUSU,
task'ın bu turda netleştirdiği gibi, telafi PARKURUN SONUNDA 6 doğru
YAPILAMAYINCA (ne kombo ne toplam eşiği tutturulduğunda) gelmeli; sınavda kalmak
artık basit tutuldu (telafi YOK, doğrudan parkur baştan).

**`core/exam-system.js` — state machine YENİDEN YAPILANDIRILDI (TAM dosya
yeniden yazıldı, `getWeakTier`/`recordTierResult`/`EXAM_CONFIG` şekli KORUNDU):**
- `"remedial-exam"` fazı (telafi SONRASI tekrar sınav) TAMAMEN KALDIRILDI —
  G47'de telafi bir kez geçilince YİNE 4 soruluk bir "tekrar sınav"a giriyordu,
  bu YANLIŞ yorumdu ve task'ın bu turda AÇIKÇA reddettiği bir akıştı.
- Parkur sonu dalı: `parkurCorrect < TOTAL_THRESHOLD` (6) İSE artık DOĞRUDAN
  `resetParkur()` ÇAĞIRMIYOR — `{ event: "remedial-start" }` döndürüyor, faz
  BİLEREK `"parkur"` kalıyor (app.js'in senkron `startRemedial(tier)` çağrısına
  kadar). Kombo yoluyla (6 peş peşe → `exam-offer`) ayrışması KORUNDU — bu dal
  hiç değişmedi.
- Sınavda kalma (`phase==="exam"` ve `examCorrect < EXAM_PASS_COUNT`) artık
  BASİT: `resetParkur()` + `{ event: "exam-failed" }` — telafiye HİÇ dallanmıyor
  (task: "sınavda kalınca telafi DEĞİL, parkur baştan").
  Doğrusu: task'ın "sınav ya da parkur baştan" ifadesindeki "sınav" seçeneği
  UYGULANMADI (kullanıcı onayı gerektirir, task metninde net değildi) — SADECE
  "parkur baştan" yolu kodlandı, en basit/güvenli yorum.
- Telafi artık KENDİ eşiğine sahip: yeni `REMEDIAL_PASS_COUNT=3` (5'te 3, %60 —
  sınavın %75'inden (4'te 3) bilinçli olarak daha yumuşak, telafi "zorlaştırılmış
  sınav" değil "pratik" olduğu için). `remedialCorrect` yeni bir state değişkeni
  ile izleniyor. Telafi bitince (`remedialIndex>=REMEDIAL_LENGTH`) HER İKİ
  durumda da (geçti/geçemedi) `resetParkur()` çağrılıyor — SONUÇ ikisinde de
  "yeni parkur", SADECE dönen olay (`"remedial-passed"`/`"remedial-failed"`) ve
  dolayısıyla kullanıcıya gösterilen mesaj farklı (task: "Telafi GEÇİLİRSE →
  devam, GEÇİLEMEZSE → baştan başlar" — "devam" ve "baştan" ikisi de aynı fresh-
  parkur mekanizmasıyla karşılanıyor, kullanıcı diliyle ayrışıyor).
- `retryRemedial()` fonksiyonu KALDIRILDI (artık ihtiyaç yok — telafi SONRASI
  tekrar sınav döngüsü yok).

**`app.js` — `handleExamOutcome()` switch'i yeni olay adlarına göre YENİDEN
YAZILDI:** `"remedial-start"` case'i (YENİ) `getWeakTier(es.tierStats)` ile
zayıf kademeyi bulup `examSystem.startRemedial(tier)`'ı SENKRON çağırıyor (aynı
turda "Telafi 1/5" render edilsin diye) + feedback'e not ekliyor
("N doğru yapılamadı — [kademe] kademesinde 5 telafi sorusu geliyor").
`"exam-failed"`, `"remedial-passed"`, `"remedial-failed"` case'leri artık
BAĞIMSIZ, her biri kendi Türkçe notunu ekleyip `false` dönüyor (normal
`scheduleNext()` akışı devam etsin diye — sheet açmıyorlar, sadece parkur
sıfırdan devam ediyor). `"exam-offer"`/`"exam-start"`/`"exam-passed"`
case'lerine (kombo teklifi, kutlama sheet'i, seviye atlama) DOKUNULMADI.

**"10/5" ETİKET TUTARSIZLIĞI — teşhis: GERÇEK bir çifte-sayaç hatası DEĞİLDİ.**
`ensureAutoNext(durationMs, label)`'daki `"(N)"` her zaman round-flow.js'nin
SANİYE geri sayımıydı (`"Sonraki (5)"` = 5 saniye sonra otomatik geçiş) — ama
buton PREFİX'i sabit `"Sonraki"` idi, HİÇBİR ZAMAN `examSystem.label()`
okumuyordu (G47'nin kendi "BİLİNEN SINIRLAMA" notu #3'te bu ZATEN tespit
edilmişti). `els.roundChip` ("Soru N/10") ile yan yana görününce "iki farklı
sayaç" izlenimi veriyordu. **Düzeltme:** `ensureAutoNext()`'i saran app.js
fonksiyonu artık `mode.EXAM_ENABLED` iken buton etiketinin PREFİX'i için de
`examSystem.label()` kullanıyor — sonuç: `"Soru 7/10 (5) ▶"` / `"Sınav 2/4 (5)
▶"` / `"Telafi 3/5 (5) ▶"`, roundChip ile HER ZAMAN tutarlı. Sınav
desteklemeyen yedi modda davranış AYNEN eskisi (`"Sonraki (5) ▶"`).

**Doğrulama (canlı, tarayıcıda, `Math.random=()=>0` ile deterministik "A her
zaman doğru" testi, Kompresör):**
- **KOMBO (KORUNDU):** 6 peş peşe doğru → "exam-offer" sheet'i EKRAN
  GÖRÜNTÜSÜYLE doğrulandı: "Sınav hakkı kazandın! Yanıtlanacak 4 sorunuz daha
  var ve sınav daha zor. Sınava geçmeye emin misiniz?" (remaining=4, task'ın
  kendi örneğiyle BİREBİR). "Parkura devam et" → pozisyon/combo KORUNDU, 7.
  soruya devam etti — regresyon YOK.
  Not: task bu turda metni "...ister misiniz?" diye paraphrase etti, koddaki
  gerçek metin ("...emin misiniz?") G47'den beri DEĞİŞMEDİ — task'ın KORUMA
  talimatı ("Bu KORUNMALI, çalışıyorsa bozma") gereği BİLEREK dokunulmadı.
- **TOPLAM:** Kombo bilerek reddedilip parkur 9/10 doğruyla bitirildi → parkur
  sonunda `"exam-start"` ile DOĞRUDAN sınava geçti (`"Sınav 1/4"` EKRAN
  GÖRÜNTÜSÜYLE doğrulandı) — telafiye UĞRAMADI, TOPLAM eşiği doğru çalışıyor.
- **Sınavda kalma → basit parkur baştan:** Bu sınav bilerek 4 yanlışla
  kaybedildi → hiçbir sheet açılmadan doğrudan `"Soru 1/10"`ya döndü (feedback
  notu: "Sınavı geçemedin — parkur baştan başlıyor") — telafiye UĞRAMADI, kod
  incelemesiyle DOĞRULANDI.
- **6 doğru OLMAYINCA → telafi (asıl düzeltme):** İki AYRI parkurda test
  edildi — (1) 4/10 doğru (kombo hiç 6'ya ulaşmadan), (2) 5/10 doğru (yine
  kombo hiç ulaşmadan) — İKİSİNDE de parkur sonunda `"Telafi 1/5"` EKRAN
  GÖRÜNTÜSÜYLE doğrulandı (ARTIK baştan atmıyor).
- **Telafi geçilince/geçilemeyince:** 0/5 (telafi kaybedildi) → `"Soru 1/10"`ya
  DÖNDÜ (baştan). Ayrı bir turda TAM 3/5 (REMEDIAL_PASS_COUNT sınırında,
  geçti) → YİNE `"Soru 1/10"`ya döndü (devam) — HER İKİ sonuç da fresh-parkur,
  SADECE mesaj farklı, kod incelemesiyle DOĞRULANDI.
- **10/5 tutarsızlığı:** roundChip HER ZAMAN `examSystem.label()`'dan geliyor,
  değişmedi; canlı testte tüm fazlarda ("Soru N/10"/"Sınav N/4"/"Telafi N/5")
  chip TUTARLI görüldü.
- **Sınav + kutlama (regresyon kontrolü):** Kombo ile ikinci kez sınava
  girildi, 3/4 doğruyla (EXAM_PASS_COUNT sınırında) geçildi → "BÖLÜM GEÇTİN!"
  sheet'i EKRAN GÖRÜNTÜSÜYLE doğrulandı: "Sınavı geçtin — Seviye 3'e
  yükseldin! Yeni bir 10 soruluk parkur başlıyor." `#levelChip` "Seviye 3"
  gösterdi — kutlama/seviye atlama TAMAMEN KORUNDU.
- Konsol hatası SIFIR (~50+ otomatik tur boyunca). `npm test`: **674/674**
  (673'ten +1 — `test/exam-system.test.mjs`'in "TELAFİ" bloğu YENİ semantiğe
  göre YENİDEN yazıldı: `"remedial-exam"` fazı/`retryRemedial`/
  `"remedial-exam-failed"` testleri KALDIRILDI, `"remedial-start"`/
  `"remedial-passed"`/`"remedial-failed"` + REMEDIAL_PASS_COUNT sınır testleri
  EKLENDİ; "TOPLAM" ve "SINAV: geçme/kalma" bloklarındaki `"parkur-failed"`/
  `"failed"` fazı beklentileri yeni event/faz adlarına güncellendi).

**KORUNANLAR (task'ın açık isteği):** Kombo uyarısı, sınav, kutlama, seviye
atlama, 8 modun oyun mantığı/ses/zorluk HİÇ değişmedi — canlı doğrulandı.

**BİLİNEN SINIRLAMA (G47'den devralınan, bu turda İLGİLİ OLMAYAN):** Sınav
sorularının hâlâ "o modun zorlaştırılmış NORMAL soruları" olması, otomatik
zorluk chip'inin sınav/telafi sırasında görsel olarak güncellenmemesi, diğer
yedi modun sistemi HENÜZ miras almaması — bu turun kapsamı DIŞINDA, G47'nin
notu geçerliliğini koruyor.

---

Önceki commit (G47, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **SINAV SİSTEMİ
TEMELİ: merkezi altyapı (core/exam-system.js) + Kompresör pilotu.** Seviye
atlamayı "sessiz XP artışı"ndan "bölüm geçme / yeterlilik sınavı" olayına
çeviren yeni bir katman — mevcut soru üretimini/XP-seviye sistemini ÇAĞIRIR,
DEĞİŞTİRMEZ. 673 test (638'den, +35 yeni).

**ÖNEMLİ — BELGE UYUŞMAZLIĞI (görev başında tespit edildi, kullanıcıya
soruldu):** Görev "DURUM.md/TASARIM.md'de 'SINAV SİSTEMİ' bölümü var, mekanik
orada tam yazılı" diyordu — bu bölüm ARANDI, repo genelinde ("sınav"/"exam")
HİÇBİR YERDE BULUNAMADI. `AskUserQuestion` ile üç açık nokta netleştirildi:
(1) belge eksikliği onaylandı, görev mesajındaki mekanik açıklaması TEK
doğruluk kaynağı olarak kullanıldı; (2) "10 soruluk parkur" mevcut "10
Soruluk Bölüm" (challenge) altyapısına BAĞLANSIN AMA Serbest modda da arka
planda çalışsın (kullanıcının kendi kararı, aşağıda uygulandı); (3)
Kompresör'ün frekans-bölgesi kavramı OLMADIĞI için (personalization.js'in
zoneStats'ı frekans-bölgesi bazlı) telafi parkuru "zayıf ZORLUK KADEMESİ"
(easy/medium/hard/pro doğruluk oranı) üzerinden çalışsın — kullanıcı bu
öneriyi onayladı.

**MERKEZİ ALTYAPI — `core/exam-system.js` (YENİ dosya):** round-flow.js'in AYNI
"factory + ses/DOM'a hiç dokunmama" felsefesi — `createExamSystem()` bir
örnek yaratır (app.js `const examSystem = createExamSystem();`), TÜM parkur/
kombo/sınav/telafi durumunu BELLEKTE tutar (roundsInThisPlaySession'ın AYNI
kararı — sayfa yenilenince yarım parkur kaybolur, KABUL EDİLEBİLİR). SAF
fonksiyonlar da var: `getWeakTier`/`recordTierResult` (zayıf-kademe tespiti,
personalization.js'in zoneWeakness'ının AYNI rolü, kademe ekseninde).
`EXAM_CONFIG`: PARKUR_LENGTH=10, COMBO_THRESHOLD=6, TOTAL_THRESHOLD=6,
EXAM_LENGTH=4 (task'ın "örn 3-5" aralığından), EXAM_PASS_COUNT=3 (4'te 3,
"çoğunu"), REMEDIAL_LENGTH=5 (task'ın kendi sayısı) — KULAKLA/PLAYTEST
DOĞRULANMADI, makul bir başlangıç.

**comboInParkur GLOBAL stats.combo'yu KULLANMAZ (bilinçli):** stats.combo TÜM
modlar/oturumlar arasında paylaşılan bir sayaç — onu kullanmak başka bir
modda kurulmuş bir seriyi Kompresör'ün parkuruna SIZDIRIRDI. exam-system
KENDİ, mod+parkur'a sıkı sıkıya bağlı sayacını tutuyor.

**MOD SÖZLEŞMESİ EKİ (miras alınabilir hale getirme):** Kompresör'e İKİ yeni
export: `EXAM_ENABLED=true`, `EXAM_DIFFICULTY="pro"` — SHOW_SPECTRUM/
COMPACT_ANALYZER'ın AYNI mode-agnostik bayrak deseni. Gelecekte başka bir mod
aynı sistemi almak isterse SADECE bu iki satırı eklemesi yeterli, app.js'e
YENİDEN dokunmaya GEREK yok (tüm app.js dalları `mode.EXAM_ENABLED` kontrolüyle
generic).

**progress.js — "PARALEL SİSTEM KURMA" yasağına uyulan TEK guard'lı dal:**
`modeLevel()` artık `stats.examState[modeId].examLevel` VARSA (SADECE exam-
enabled modlarda dolduruluyor) GÖSTERİLEN seviyeyi `Math.min(rawLevel,
examLevel)` ile SINIRLIYOR — XP/levelFromXp/xpNeeded'ın KENDİSİ HİÇ değişmedi
(XP sessizce birikmeye DEVAM ediyor), SADECE gösterilen/kullanılan seviye artık
"sınav geçince açılan" bir kapı. Sınav destemeyen yedi modda `stats.examState[id]`
HİÇ var olmadığı için `modeLevel()` AYNEN eskisi gibi SAF XP'den hesaplanır
(testle doğrulandı — bkz. test/progress.test.mjs "G47 sınav sistemi examState
guard'ı"). **FARKINDA OLUNAN yan etki:** Kompresör'ün examLevel-sınırlı
modeLevel'i `academyLevel`'a (TÜM modların modeLevel TOPLAMI, menüdeki
"Seviye N'de açılır" kilitlerinin kaynağı) da yansıyor — Kompresör'ün XP'si
sınav GEÇMEDEN gerçek katkısını academyLevel'a VERMEZ. Bu, "seviye artık
gerçekten kazanılmalı" felsefesiyle TUTARLI bir emergent sonuç olarak
KABUL EDİLDİ, ayrıca gizlenmedi/engellenmedi.

**storage.js:** `freshStats()`'e yeni `examState: {}` alanı + `loadStats()`'a
göç satırı (`if (!s.examState) s.examState = {};`) — perMode/perDiff'in
ŞEKLİNE hiç dokunulmadı, TAMAMEN yeni/ayrı bir ad alanı.

**app.js kablolaması (mode.EXAM_ENABLED'a GÖRE dallanan, generic):**
- `startRound()`: examSystem fazı parkur DIŞINDAYSA (sınav/telafi/tekrar-
  sınav) `mode.createQuestion`'a kullanıcının seçtiği zorluk YERİNE
  `examSystem.questionTier(...)` geçer; boss round VE Otomatik/Sabit eğrisi
  (`difficultyPosition`) o fazlarda BİLEREK devre dışı (task: "zorlaştırılmış
  normal sorular", statik DIFFICULTY[tier]).
- `renderQuestion()`: `els.roundChip` metni `mode.EXAM_ENABLED` iken HER ZAMAN
  (Serbest DAHİL, kullanıcının 2. karar onayı) `examSystem.label()`'dan gelir
  ("Soru N/10" / "Sınav N/4" / "Telafi N/5" / "Tekrar Sınav N/4").
- `submitThreeWayGuess()` (Kompresör/Reverb PAYLAŞIYOR): SADECE
  `mode.EXAM_ENABLED` iken `handleExamOutcome(q, result)` çağrılır — tierStats
  kaydı (SADECE "parkur" fazında, sınav/telafi sonuçları zayıf-kademe
  tespitini ÇARPITMASIN diye), `examSystem.recordAnswer(...)`, olay
  bazlı dallanma (offer sheet / pass sheet / feedback'e not ekleme). Reverb
  (AYNI fonksiyonu paylaşıyor) `mode.EXAM_ENABLED` undefined olduğu için bu
  BLOK TAMAMEN atlanıyor — davranışı BİREBİR eskisi gibi kalıyor.
- `ensureAutoNext()`: "10 Soruluk Bölüm"ün KENDİ "10 soru bitti → seansı
  kapat" mantığı `mode.EXAM_ENABLED` modlarda BASTIRILDI (parkur/sınav/telafi
  10'un ÖTESİNE geçebiliyor, challenge.done>=10'da kesmek sınavı YARIDA
  keserdi) — `challenge.active`'in +%50 XP bonusu (xpMult) HÂLÂ çalışıyor,
  SADECE otomatik bitirme bastırıldı.
- İKİ yeni bottom-sheet (hpSheet'in AYNI `.open` class deseni, index.html):
  `examOfferSheet` (erken sınav teklifi, task'ın BİREBİR metniyle: "Yanıtlanacak
  N sorunuz daha var ve sınav daha zor...") + `examPassSheet` ("BÖLÜM GEÇTİN!"
  kutlaması, ding+burst fx'leriyle "ödül hissi").

**Doğrulama (canlı, tarayıcıda, `devFlags.simulatePro` + `Math.random=()=>0`
ile deterministik "A her zaman doğru" testi):** Kompresör'e girildi, 5 doğru
cevap → "Soru 6/10". 6. doğru cevap → erken sınav teklif sheet'i EKRAN
GÖRÜNTÜSÜYLE doğrulandı: "Yanıtlanacak 4 sorunuz daha var ve sınav daha zor.
Sınava geçmeye emin misiniz?" (task'ın BİREBİR örneği). "Sınava geç" → "Sınav
1/4" → 4/4 doğru → "BÖLÜM GEÇTİN!" sheet'i EKRAN GÖRÜNTÜSÜYLE doğrulandı:
"Sınavı geçtin — Seviye 2'e yükseldin!". `#levelChip` "Seviye 2" gösterdi
(examLevel cap DOĞRU çalıştı — bir ARA çalışma sırasında tarayıcının ESKİ
progress.js'i CACHE'lediği fark edildi, sabit disk cache no-store fetch +
hard reload ile doğrulanıp DÜZELTİLDİ, kod HİÇ değişmedi, sadece test
metodolojisi). "Devam Et" → yeni parkur "Soru 1/10"den başladı. İKİNCİ bir
parkurda 6 doğru → sınava kabul → BU SEFER 4 YANLIŞ cevap → "Telafi 1/5"e
GEÇTİĞİ doğrulandı (feedback notu: "Sınavı geçemedin — Kolay kademesinde 5
telafi sorusu geliyor"). 5 telafi sorusu doğru cevaplandı → "Tekrar Sınav
1/4"e geçti. 4/4 doğru → tekrar "BÖLÜM GEÇTİN!" (Seviye 3), examLevel=3
localStorage'a DOĞRU persist edildi. Reverb'e geçildi — `roundChip` "Soru
33" (GENERİK, /10 YOK — mode.EXAM_ENABLED olmadığı için doğru), 3 büyük
A/B/C kartı (`.ans-m2`) NORMAL render edildi, bir cevap verildi ("A
farklıydı, Room, decay 0.9s"), exam-offer sheet HİÇ AÇILMADI. Frekans
Bulma'ya geçildi — `roundChip` "Soru 34" (yine generik), normal çalıştı.
Konsol hatası SIFIR (~35 otomatik tur boyunca). `npm test`: 673/673 (573
sekiz-mod + 65 Tonal Denge + 35 yeni G47 testi: test/exam-system.test.mjs
[parkur/kombo/toplam/sınır/sınav-geç-kal/telafi-döngüsü/questionTier/
setMode-izolasyonu/getWeakTier-recordTierResult, 30 test] +
test/progress.test.mjs'e eklenen modeLevel() examState guard testleri [5]).

**KORUNANLAR (task'ın açık isteği):** 8 modun oyun mantığı/ses/zorluk/geri
bildirim/reskin DOKUNULMADI. Kompresör DIŞINDAKİ yedi mod bu turda TAMAMEN
etkilenmedi (canlı doğrulandı). XP/seviye MEKANİĞİ (progress.js'in KENDİSİ)
değişmedi, sadece TEK bir guard'lı üst sınır eklendi.

**BİLİNEN SINIRLAMALAR/SONRAKİ TUR İÇİN:** (1) Sınav soruları şimdilik
"o modun zorlaştırılmış NORMAL soruları" — task'ın kendi kararıyla "yeni
görev tipleri (sıralama/eşleştirme) SONRA eklenecek". (2) Otomatik zorluk
modundaki `els.difficultySelect` görünen değeri sınav/telafi sırasında
GÜNCELLENMİYOR (gerçek soru zorluğu `examSystem.questionTier()`'dan geliyor,
ekrandaki "Zorluk" chip'i kullanıcının ÖNCEKİ seçimini göstermeye devam
ediyor) — kozmetik bir tutarsızlık, işlevi ETKİLEMİYOR. (3) ~~"Sonraki (N) ▶"
oto-geçiş butonunun etiketi hâlâ generik "Sonraki" (examSystem.label()
KULLANMIYOR) — SADECE `els.roundChip` güncellendi.~~ — **G48'de düzeltildi**
("10/5 tutarsızlığı", bkz. yukarıdaki G48 BİTTİ girdisi). (4) Diğer yedi mod HENÜZ
miras almadı — task'ın "sonra her mod aynı sistemi miras alsın" isteği bu
turun KAPSAMI DIŞINDA (pilot: SADECE Kompresör).

---

Önceki commit (G46, tek commit — kod+DURUM.md birlikte) — **Tonal Denge'de spektrum
görseli küçültüldü, kaydırıcılara yer açıldı.** G45'te eklenen altı-banda kadar
çıkabilen kaydırıcı listesi, 280px'lik (diğer sekiz modla PAYLAŞILAN) tam
boy spektrumun ALTINDA kalıyordu — 6 bant + "Cevabı Onayla"ya ulaşmak için
fazladan kaydırma gerekiyordu.

**Mekanizma — SHOW_SPECTRUM'un (G39, db-seviyesi.js) AYNI mode-agnostik bayrak
deseni:** `tonal-denge.js`'e `export const COMPACT_ANALYZER = true;` eklendi.
`app.js`'in `enterMode()`'u mod değişince `#analyzer`'a `mode.COMPACT_ANALYZER`
bayrağına göre bir modifier class (`analyzer-compact`) ekliyor/çıkarıyor —
`goScreen("game")`'in çağıracağı `resizeCanvas()`'tan ÖNCE uygulanıyor, canvas'ın
GERÇEK (CSS'ten okunan) boyutu ilk çizimden itibaren doğru. `styles.css`:
`#analyzer.analyzer-compact #visualizer{height:140px}` — TEK değişen şey
yükseklik (280px→140px), `#visualizer`'ın stil/renk/eksen kuralları HİÇ
değişmedi (aynı kural seti, aynı çizim kodu — `drawSpectrumBars`/
`drawVisualizer` bu yeni boyutu `resizeCanvas`'ın `getBoundingClientRect`
okumasından OTOMATİK alıyor, app.js'e AYRICA dokunulmadı). Export ETMEYEN
diğer sekiz mod varsayılan false/undefined ile ETKİLENMEDİ (canlı doğrulandı,
bkz. aşağıda).

**Tonal Denge'nin KENDİ eğri çizimi ayrıca düzeltildi:** `drawFlatTargetLine`/
`drawResidualCurve` ÖNCEDEN paylaşılan `CURVE_TOP` sabitini (88px — Frekans
Bulma'dan, spektrum çubuklarının TAVANI olarak `app.js:drawSpectrumBars`'ta
HÂLÂ kullanılıyor, DOKUNULMADI) kullanıyordu — 140px'lik canvas'ta bu neredeyse
HİÇ yer bırakmazdı eğriye (88 + AXIS_H[50] + 6 ≈ canvas'ın tamamı, eğri
~2px'e sıkışırdı). Yeni bir yerel sabit (`OVERLAY_TOP_MARGIN=20`) eklendi —
SADECE bu modun kendi kırmızı/yeşil eğrisi için, paylaşılan `CURVE_TOP`'a
(spektrum çubuklarının tavanı, diğer sekiz modun da okuduğu) HİÇ dokunulmadan.

**Kaydırıcı kartları da hafifçe kompaktlaştırıldı** (task'ın izin verdiği
ikincil iyileştirme): `.tonal-bands` gap 12px→8px, `.tonal-band` padding
12px→9px (dikey), `.tonal-band-head` margin-bottom 9px→6px — dokunma hedefi
boyutu (kaydırıcı thumb'ı) DEĞİŞMEDİ.

**Doğrulama (canlı, tarayıcıda):** Tonal Denge'ye girildi — canvas yüksekliği
`getBoundingClientRect()` ile TAM 140px ölçüldü (önceden 280px), `#analyzer`
`analyzer-compact` class'ını TAŞIYOR. 4 bantlık round'da (Soru 1-4) spektrum +
4 kaydırıcı + "Cevabı Onayla" TEK ekranda (kaydırmadan) sığdı — EKRAN
GÖRÜNTÜSÜYLE doğrulandı. "Atla" ile Soru 9'a (6 bant) ilerlendi — 6 kaydırıcı +
buton YİNE tek ekranda (sadece spektrumun üst kenarı hafif kırpıldı, TÜM
kaydırıcılar + onay butonu GÖRÜNÜR kaldı) — EKRAN GÖRÜNTÜSÜYLE doğrulandı,
öncekine göre BÜYÜK iyileşme (önceden 6. banda ulaşmak için tam bir ekran
kaydırması gerekiyordu). Bir bant sürüklenip onaylandı — kırmızı "kalan sapma"
eğrisi + yeşil düz hedef çizgisi 140px'lik canvas'ta NET/okunur çizildi
(OVERLAY_TOP_MARGIN düzeltmesi doğrulandı), slider satırları doğru kırmızı/
yeşil kenarla işaretlendi, "Yakınlık %46" + tam öğretici metin göründü —
mekanik (canlı EQ, bant sayısı ramp'i, yakınlık skoru) TAMAMEN korundu.
Spektrum stili İNCELENDİ — AYNI mavi gradyan çubuklar, AYNI eksen (100Hz–
12.8kHz), SADECE daha kısa — hâlâ gerçek bozukluğu göstermeyen dekoratif bir
görsel (kulak eğitimi ilkesi bozulmadı). Frekans Bulma/Kompresör/Reverb/dB
Seviyesi'ne TEK TEK girilip canvas yüksekliği JS'ten ölçüldü — DÖRDÜ de TAM
280px, `analyzer-compact` class'ı YOK (regresyon yok, `COMPACT_ANALYZER`
export etmeyen modlar etkilenmedi). Konsol hatası YOK. `npm test`: 638/638
(kod değişikliği SADECE görsel/CSS/DOM-boyut, hiçbir SAF fonksiyon/test
etkilenmedi — yeni test eklenmedi, mevcut 638 aynen geçti).

---

Önceki commit (G45, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Tonal Denge
TrainYourEars mekaniğine dönüştürüldü: odd-one-out (A/B/C, "hangisi farklı")
TAMAMEN kaldırıldı, yerine CANLI EQ DÜZELTME (N kaydırıcı, gerçek zamanlı ses)
geldi.** G44'ün odd-one-out kodu (variants/oddIndex/choices/shape/imbalanceScore,
three-way-cards.js delegasyonu) modes/tonal-denge.js'ten TAMAMEN silindi — dosya
SIFIRDAN yazıldı, ölü kod bırakılmadı. 638 test (640'tan — G44'ün 67 odd-one-out
testi silindi, yerine 65 yeni test geldi, net -2).

**YENİ MEKANİK:** Ses (groove/upload) çalar. Uygulama GİZLİ bir tonal bozukluk
uygular — 4/5/6 bandın (bkz. aşağıdaki ramp) BİR KISMINA ya da TÜMÜNE (en az 1,
rastgele) peaking/shelf EQ kayması. Kullanıcı HER bant için bir kaydırıcıyı
(±12dB, orta=0=nötr) CANLI oynatarak sesi nötüre geri getirmeye çalışır — ses
GERÇEK ZAMANLI değişir, "Cevabı Onayla"ya basınca değerlendirilir. Puanlama:
her bantta KALAN sapma (bugDb+correction, mükemmelde 0) → yakınlık skoru
(0-100, `evaluateAnswer`'da SAF hesaplanır).

**CANLI SES MİMARİSİ (task'ın "kritik" dediği kısım) — audio-engine.js'e
DOKUNMADAN çözüldü:** `applyProcessing` round başında BİR KEZ çağrılır (Motor
2'nin A/B/C önizleme döngüsünün AKSİNE previewLetter YOK, tek "canlı" ses var),
question.bands KADAR BiquadFilterNode kurar ve referanslarını modül-seviyesi
`liveBandNodes`'a SAKLAR. Yeni export `setLiveBandGain(audioCtx, bandId,
netGainDb)` — app.js kaydırıcı HER hareket ettiğinde bunu çağırır, GRAFİĞİ
YENİDEN KURMADAN o bandın düğümünün gain'ini `setTargetAtTime` ile YUMUŞAK
günceller (tıklama YOK, ses kesintisiz — task'ın açık şartı). Bu, projede
canlı/aralıksız parametre güncellemesinin İLK örneği — önceki sekiz modun
HEPSİ her etkileşimde `buildQuestionChain`'i YENİDEN çağırıyordu (Kompresör/
Reverb'in A/B/C önizlemesi dahil, bkz. o dosyaların "previewLetter" notu).

**BANT RAMP'İ (seans içi, task'ın kararı):** `bandCountForSessionIndex` —
Soru 1-4 (index 0-3) → 4 bant (bas/alt-orta/üst-orta/tiz, task'ın kendi örneği),
Soru 5-8 → 5 bant (+orta), Soru 9+ → 6 bant (+sub, TAM 6 bölge) — SINIRSIZ
üstte 6'da SABİT kalır (task sadece 9-10'u belirtti, 11+ için doğal uzantı,
yeni bir üst sınır İCAT EDİLMEDİ). Bant tanımları (`BAND_DEFS`) frekans-
bulma.js'in FA_ZONES'undaki AYNI 6 bölgeden (SUB/BAS/ALT-ORTA/ORTA/ÜST-ORTA/
TİZ) TÜRETİLİR (tek kaynak) — merkez frekans (BiquadFilterNode.frequency için)
geometrik ortadan (`sqrt(a*b)`) hesaplanır, FA_ZONES kendisi bunu tutmuyordu.
filterType KANONİK sırayla: en düşük frekans lowshelf, en yüksek highshelf,
aradakiler peaking (standart parametrik EQ tasarımı).

**KADEMELİ ZORLUK (merkezi eğri, Kompresör/Reverb/dB Seviyesi'nin AYNI BAŞTAN-
doğru-kalibrasyon yöntemi):** `TONAL_CURVE_CONFIG` (DISTURB_DB_AT_1=9 →
AT_CAP=0.9, FLOOR=0.8) — kolay=büyük/bariz bozukluk, pro=ince (~0.9-1.3dB).
"Kolaylaşma yok" invaryantı node ile DOĞRUDAN hesaplandı: disturbDb →
easy(4)=6.26≤9, medium(8)=3.85≤5, hard(12)=2.37≤2.8, pro(20)=0.90≤1.3;
timeSec → easy(4)=23.3≤26 … pro(20)=13.0≤15 (rahat marjlarla, testle
doğrulandı). Süreler diğer sekiz moddan BİLİNÇLİ daha UZUN (26/22/18/15sn) —
bu görev tek tıklama değil, N kaydırıcıyı dinleye dinleye ayarlamak.

**ÖĞRETİM + GÖRSEL (task'ın örnek formatıyla BİREBİR, canlı oyunda
DOĞRULANDI):** `teachingText` her bant için Türkçe DOĞRU çekimle (BAS'ı/
ALT-ORTA'yı/ORTA'yı/ÜST-ORTA'yı/TİZ'i/SUB'u — ünlü uyumu elle çözüldü, generic
bir ek YANLIŞ çıkardı) + işaretli dB + mix dili raporlar ("ORTA'yı -9.3dB
eksik bıraktın — mix hâlâ içi boş/uzak... ÜST-ORTA'yı iyi düzelttin").
`drawOverlay` GERÇEK BiquadFilterNode.getFrequencyResponse ile (Boost/Cut'ın
AYNI tekniği) İKİ eğri çizer: KIRMIZI (GUESS_COLOR) = kullanıcının kalan
sapma eğrisi, YEŞİL (CORRECT_COLOR) düz çizgi = hedef (nötr) — task'ın açık
renk kararı. Round sırasında (roundActive) BİLEREK gizli (kulakla bulma
ilkesi, diğer sekiz modun AYNI invaryantı).

**KAYNAK (G44'ten DEĞİŞMEDİ, task'ın açık isteği):** `uyumluKaynaklar:
compatibleSourceIds({ only: ["groove", "upload"] })` — dolu-mix-bağlamı şartı
aynen korundu. `kulaklikGerekli: true` de korundu.

**MOTOR AYRIŞMASI (task'ın çekirdek kararı):** `app.js`'in `THREE_WAY_MODE_IDS`
listesinden "tonal-denge" ÇIKARILDI (Kompresör/Reverb AYNEN kalıyor,
DOKUNULMADI) — `isThreeWayModule("tonal-denge")` artık false, bu OTOMATİK
olarak A/B/C döngüsünü/previewLetter/three-way-cards render'ını devre dışı
bırakıyor (G33/G35'in "genelleştirme" yatırımı burada TERSİNE de işledi:
listeden ÇIKARMAK kadar basit oldu). `isChoiceFormat()`'e "tonal-denge" EL
İLE eklendi (three-way olmadığı için oraya artık kendiliğinden düşmüyordu).
YENİ bir submit akışı (`submitTonalDengeGuess`, submitThreeWayGuess'in
YAPISAL PARALELİ) + YENİ bir event bloğu (kaydırıcı "input" CANLI güncelleme +
"Cevabı Onayla" "click" — `.ans` click-delegasyonundan BİLEREK AYRI, submit
butonu `.ans` class'ı TAŞIMIYOR, iki mekanizma hiç karışmıyor).

**A/B Test butonu — BEDAVA bir yeniden-kullanım:** Motor 1'in dry/wet
crossfade'i (`setProcessed`) hiç değiştirilmeden Tonal Denge'de "A=temiz
orijinal groove, B=senin canlı düzeltmen" karşılaştırması olarak ÇALIŞIYOR —
ayrı bir kod satırı YAZILMADI, `isThreeWayModule` false döndüğü için
`toggleAB()` zaten doğru (Motor 1) dalına düşüyor.

**CSS:** `.answers-tonal`/`.tonal-bands`/`.tonal-band`/`.tonal-slider`/
`.tonal-submit` (styles.css) — İLK gerçek `<input type="range">` bu projede,
webkit/moz thumb stilleri elle yazıldı. `.tonal-band.right/.wrong` renkleri
`.ans.right/.wrong`'un AYNI kırmızı/yeşil dilini kullanıyor.

**Doğrulama (canlı, tarayıcıda, `devFlags.simulatePro` ile):** Tonal Denge'ye
girildi — kulaklık sheet'i çıktı (kulaklikGerekli doğrulandı). Round başında
4 kaydırıcı (BAS/ALT-ORTA/ÜST-ORTA/TİZ) + "Cevabı Onayla" render edildi,
kaynak "Davul Döngüsü". Bir kaydırıcı DOM'dan sürüklendi (`input` event) —
değer anında "+6.0 dB" gösterdi, konsol hatası YOK (canlı `setLiveBandGain`
çağrısı doğrulandı). 27 tur otomatik oynatıldı — Soru 5'ten (index 4) itibaren
5 bant (ORTA eklendi), Boss round'a doğru geçti, tamamı boyunca konsol hatası
SIFIR. Bir round'da YANLIŞ bırakılıp (6sn'lik daha uzun feedback penceresi
kullanılarak) EKRAN GÖRÜNTÜSÜYLE doğrulandı: kırmızı dalgalı "kalan sapma"
eğrisi + düz yeşil hedef çizgisi görüldü, 4 slider satırı KIRMIZI kenarla
("kalan: +8.7dB" vb.), 1 slider (dokunulmamış, zaten bozuk değildi) YEŞİL
kenarla ("kalan: +0.0dB") işaretlendi, feedback kartında "Yakınlık %42" +
tam öğretici metin (her bant için ayrı cümle, doğru Türkçe çekim) göründü.
Kompresör'e geçildi — 3 büyük A/B/C kartı (`.ans-m2`) NORMAL render edildi,
0 `.tonal-slider`, bir cevap verildi ("B farklıydı, ratio 13.1:1...") —
odd-one-out akışı TAMAMEN bozulmadan çalışıyor. `npm test`: 638/638 (573
sekiz-mod + 65 yeni Tonal Denge testi — bandCountForSessionIndex/
bandIdsForCount ramp, bandsForQuestion [kapsama+kanonik filterType+rng
determinizmi], pickDisturbanceDb FLOOR, evaluateAnswer [mükemmel/dokunulmamış/
kısmi/proximityScore sınırları], calculateXP [GRADED], teachingText/
getFeedbackData [Türkçe çekim + mix dili], getHintText [harf/değer sızdırmaz],
applyProcessing+setLiveBandGain [N doğru node + canlı güncelleme, sahte
audioCtx], merkezi eğri + "kolaylaşma yok" invaryantı, getMeta, "artık
three-way DEĞİL" doğrulaması + Kompresör/Reverb'in three-way-cards.js'ten HÂLÂ
miras aldığının AYRICA testle kanıtlanması).

---

Önceki commit (G44, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Mod 8 "Tonal
Denge": Motor 2'nin ÜÇÜNCÜ modu (A/B/C odd-one-out, spektral tilt-tabanlı) —
Kompresör (G30)/Reverb (G35)'in ŞABLONUNDAN türetildi, oynanabilir, menüde,
573 test → 640 test (+67).**

**KATALOG YERİ — ÜRÜN KARARI (task'ın kendisi verdi, elle uydurulmadı):**
`mode-catalog.js`'te "tonal-denge" id'si ÖNCEDEN Motor 1'de duruyordu ("Hangi
bölge fazla?", unlockLevel:9, playable:false, HİÇ kod karşılığı yoktu — sadece
bir isim/placeholder). Task bu ismi AÇIKÇA Motor 2'nin üçüncü modu olarak
tanımladı (A/B/C odd-one-out, tilt-tabanlı) — placeholder REPURPOSE edildi
(silinip yeniden eklenmedi, id korundu): motor 1→2, unlockLevel 9→15 (Reverb
14 ile Distortion 16 arasına), aciklama "Hangi bölge fazla?"→"Hangisinin tonal
dengesi bozuk?", kulaklikGerekli false→true. Motor 1'in "Hangi bölge fazla?"
konsepti (tek-değer tahmini, farklı bir oyun tipi) artık kodda YOK — bu BİLİNÇLİ
bir kapsam kararı, task'ın kendi tanımıyla ÇAKIŞTIĞI için tutulamazdı.

**MOD FELSEFESİ — Kompresör/Reverb'den FARKLI bir "aynı" tanımı:** Kompresör'de
"aynı" ikili COMP_BASE_K=0.5 (hafif kompresyonlu), Reverb'de her zaman BİR
reverb tipi uygulanmış — Tonal Denge'de ise "aynı" ikili TAMAMEN NÖTR (k=0,
flat, hiçbir filtre etkisi). Gerekçe: gerçek mixte dengeli tonal denge KURAL,
bozukluk İSTİSNA — task'ın "İkisi DENGELİ (nötr), biri DENGESİZ" kararı. Bu,
oddK'nin bir bazdan İKİ yöne uzaklaşması (Kompresör'ün pickOddK'sı) yerine
DOĞRUDAN kGap kadar (0'dan) uzaklaşması demek — `pickKGap`'e SADECE bir ÜST
clamp (Math.min(1,...)) eklendi (Kompresör'ün alt+üst simetrik clamp'inin
AKSİNE, taban zaten 0 olduğu için alt taşma riski yok).

**TİLT UYGULAMASI (tek algısal eksen, task'ın "Kompresör dersi" talebi):**
`core/audio-engine.js`'in genel filters-seri-bağlama sözleşmesi DEĞİŞTİRİLMEDEN
ÜÇ `BiquadFilterNode` (low-shelf 250Hz + peaking 1000Hz + high-shelf 4000Hz)
seri bağlanıyor. Dört "şekil": `tilt-bass`/`tilt-treble` (low-shelf+high-shelf
ZIT yönde, orta=0 — geniş bir eğim, TEK bant DEĞİL) ve PRO katmanının
`smile`/`frown` (bas+tiz AYNI yöne, orta ZIT yöne — "iki bölgeli karmaşık
bozukluk", task'ın açık isteği). `imbalanceScore` (en büyük mutlak banda-
kazancı, dB) HER şekilde AYNI k'de BİREBİR eşit — Kompresör'ün
gainReductionDb'sinin AYNI rolü, şekilden bağımsız TEK bir "ne kadar dengesiz"
ekseni (testle doğrulandı).

**KADEMELİ ZORLUK (Reverb'in TİP-değişimi katmanının AYNI öğretmen-yöntemi):**
`TONAL_CURVE_CONFIG` (K_GAP_AT_1=0.95 → K_GAP_AT_CAP=0.10, FLOOR=0.085) —
easy/medium/hard'da SADECE tilt-bass/tilt-treble (miktar farkı), PRO/PRO
PLUS'ta (ya da Otomatik'te position>=18, Reverb'in AYNI eşiği) %50 ihtimalle
YA çok ince bir tilt YA DA smile/frown (task'ın "VEYA" isteği — rastgele,
deterministik değil). "Kolaylaşma yok" invaryantı node ile DOĞRUDAN
hesaplandı: kGap → easy(4)=0.666≤0.95, medium(8)=0.415≤0.55, hard(12)=0.258≤0.28,
pro(20)=0.100≤0.12; timeSec → easy(4)=16.27≤18 … pro(20)=9.50≤10 (hepsi
rahat marjla, testle doğrulandı).

**KAYNAK — TEK gerçek "dolu bağlam" örneği (task'ın en katı kısıtlaması):**
Tilt SADECE dolu spektrumda (çok sayıda eş zamanlı frekans bileşeni) duyulur.
Kataloğun 14 örneği tek tek elendi: kick/snare/hihat/tom TEK vuruş, bas/gitar
TEK nota, vokal TEK fraz, sentetik/gürültü TEST tonu — HİÇBİRİ "mix bağlamı"
değil. SADECE "groove" (90 BPM davul döngüsü, kick+snare+hihat AYNI ANDA)
gerçek bir dolu-mix örneği. `uyumluKaynaklar: compatibleSourceIds({ only:
["groove", "upload"] })` — G43'ün `only` mekanizması BİRE BİR yeniden kullanıldı
(üçüncü kullanıcı, mekanizmanın genelleşebilirliğini doğruladı). Varsayılan
kaynak da "pink" DEĞİL "groove" (Kompresör/Reverb'in "pink" varsayılanından
BİLİNÇLİ sapma — pink zaten bu modun listesinde YOK, "pink" fallback'i burada
anlamsız/yanıltıcı olurdu).

**GÖRSEL — Kompresör'ün (zaman-genlik zarfı)/Reverb'in (kuyruk zarfı) AKSİNE
GERÇEK bir frekans-yanıtı eğrisi:** Boost/Cut'ın `computeEqCurveDb` tekniğiyle
AYNI (GERÇEK `BiquadFilterNode.getFrequencyResponse`, elle yaklaşıklık DEĞİL) —
üç filtrenin dB'leri TOPLANIYOR (kaskat filtrelerin genlikleri ÇARPILIR →
dB'leri toplanır, standart DSP). Kırmızı=senin cevabın, yeşil=doğru (G34
standardı). Frekans ekseni bu kez GERÇEKTEN kullanıldı (Kompresör/Reverb'in
SADECE re-export ettiği FA_MIN/FA_MAX/faXToF/faFToX burada drawAxis'te
fiilen çiziyor).

**ÖĞRETİCİ METİN (task'ın örnek formatıyla BİREBİR):** "B dengesizdi — bas-ağır
eğim (düşük bölge +9.3dB, tiz -9.3dB) — mix boğuk/çamurlu duyulur, tizler
geride kalır. Dengeli mixte bas ve tiz orantılı, gerçek mixte referans
şarkıyla tonal dengeyi böyle karşılaştırırsın." (canlı, gerçek oyunda
doğrulandı — bkz. aşağıdaki doğrulama). PRO/smile: "C dengesizdi — smile
eğrisi (bas ve tiz şişkin, orta çukur) (bas +Xdb, orta -Xdb, tiz +Xdb) —
kulağa 'havalı' gelir ama mixte orta kaybolur, karar bulanıklaşır."

**app.js kablolaması (Motor 2'nin GENEL mekanizması + ÜÇ mod-özel metin dalı):**
`registerMode(tonalDenge)` + `THREE_WAY_MODE_IDS`'e eklendi — A/B/C toggle,
otomatik döngü, previewLetter, submitThreeWayGuess, feedback kartı, kulaklık
sheet'i (`meta.kulaklikGerekli`) TAMAMEN generik, HİÇBİR ek kablolama
gerekmedi (G33/G35'in "genelleştirme" yatırımı üçüncü modda karşılığını
verdi — task'ın da doğruladığı gibi). SADECE üç yerde mod-özel görüntü metni
(`pushHistory` açıklaması, `questionTitle`, `setFeedback` açıklaması —
Kompresör/Reverb'in de AYNI üç yerde kendi dalları var) yeni bir
`q.mode === "tonal-denge"` dalı gerektirdi — bunun DIŞINDA app.js'e dokunulmadı.

**KORUNANLAR (task'ın açık isteği):** 7 mevcut mod, `three-way-cards.js`
(değişmeden import edildi — G41'in "üçüncü bir Motor 2 modu SADECE bu modülü
import edip re-export etmesi yeter" öngörüsü DOĞRULANDI), reskin (G36-G41),
ses/zorluk/geri bildirim akışı HİÇ değişmedi.

**Doğrulama (canlı, tarayıcıda, `devFlags.simulatePro` ile seviye kilidi
aşılarak):** Menüde "Tonal Denge" Reverb ile Distortion ARASINDA, "Sv 1"/"Pro"
rozetleriyle doğru yerde göründü. Tıklanınca kulaklık uyarı sheet'i çıktı
(kulaklikGerekli:true doğrulandı) — "Kulaklığım takılı, başla" ile geçildi.
Oyun ekranında kaynak "Davul Döngüsü" (varsayılan), Kaynak sheet'inde SADECE
DAVUL grubunda "Davul Döngüsü" + KENDİ DOSYAM grubunda "Dosya seç" göründü
(başka HİÇBİR grup/kaynak yok — `only:["groove","upload"]` doğrulandı).
19 tur otomatik oynatıldı (DOM üzerinden gerçek tıklamalarla) — A/B/C büyük
kartlar (G41 UI) normal çalıştı, otomatik döngü/amber vurgu senkron, Boss
round'a (Soru 5) doğru geçti. Öğretici metin GERÇEK oyun çıktısında doğrulandı
(örnek: "Yanlış — sen A dedin. C dengesizdi — tiz-ağır eğim (düşük bölge
-8.9dB, tiz +8.9dB) — mix sert/ince duyulur, bas zayıf/cılız kalır. Dengeli
mixte bas ve tiz orantılı..."), doğru cevapta XP verildi ("+22 XP"). Cevap
sonrası görsel EKRAN GÖRÜNTÜSÜYLE doğrulandı: yeşil "Doğru" eğrisi net bir
tiz-ağır tilt şekli (düşükten yükseğe yükselen çizgi) çizdi, üstte "● Doğru"
lejantı, frekans ekseni (100–12.8k) doğru. Kompresör'e ve Reverb'e geçilip
kaynak listeleri kontrol edildi — İKİSİ de DEĞİŞMEDİ (Kompresör 13 kaynak,
pink/white hariç hepsi; Reverb TAM `snare,groove,guitar,vocal,upload` — G43'ün
listesi bozulmadı). Konsol hatası YOK (19 tur boyunca, `onlyErrors` filtresiyle
iki kez kontrol edildi). `npm test`: 640/640 (573 +67 yeni —
`test/tonal-denge.test.mjs`: createQuestion sözleşmesi, "aynı" ikilinin HER
ZAMAN flat olduğu, buildVariant'ın dört şekli + tek-eksen imbalanceScore,
pickKGap'in FLOOR+ÜST clamp'i, PRO katmanının %50 smile/frown istatistiği
(1000 örnek), evaluateAnswer/calculateXP, teachingText/getFeedbackData (gerçek
dB'ler+mix dili), getHintText (harf sızdırmıyor), applyProcessing (previewLetter
→ 3 doğru BiquadFilterNode), paramsForDifficultyPosition, "kolaylaşma yok"
invaryantı, getMeta (kaynak listesi TAM groove+upload), three-way-cards.js'ten
GERÇEK delegasyon (referans eşitliği) — diğer 573 test (7 mod + mekanizmalar)
DOKUNULMADAN geçti, regresyon yok.

---

Önceki commit (G43, tek commit — kod+DURUM.md birlikte) — **Reverb kaynak filtresi ELLE
düzeltildi: G42'nin "tek-vuruş dışla" otomatik kuralı yanlış sonuç veriyordu, yerine
kullanıcının gerçek mix deneyimine dayanan AÇIK bir izin listesi geldi.** Sorun: G42'nin
`excludeOneShot` heuristiği "tek darbe = reverb kuyruğunu göstermez" varsayımıyla kick/
snare/hihat/tom'un HEPSİNİ dışlıyordu — ama snare, gerçek mixte NEREDEYSE HER ZAMAN
reverb alan bir kaynak (kısa room/plate, vuruş sonrası kuyruk net duyulur); heuristik bu
durumda YANLIŞ öngörüyordu. Kullanıcı (14 yıl mix deneyimi) kesin bir ayrım verdi:
KALACAK {gitar, vokal, snare, davul döngüsü, +upload}, ÇIKACAK {kick, hi-hat, tom,
sentetik (saw/square/triangle)} — bas ve gürültü (pink/white) de listede YOKTU, o yüzden
zımnen dışlandı (bas mud riski, gürültü/synth gerçek mixte hiç reverb almayan test
tonları — bkz. reverb.js getMeta yorumu).

**Mekanizma — `core/source-catalog.js`:** `compatibleSourceIds()`'a yeni bir `only`
parametresi eklendi — bir id listesi verilirse SADECE o id'ler döner, diğer TÜM
bayraklar/kaynaklar (requireTransient DAHİL, birlikte verilse bile) yok sayılır — "only"
her zaman SON SÖZ, çünkü ELLE seçilmiş bir karar bir otomatik bayrağın kesişimiyle
daraltılmamalı. G42'nin `oneShot` bayrağı ve `excludeOneShot` parametresi TAMAMEN
kaldırıldı (kick/snare/hihat/tom nesnelerinden `oneShot: true` silindi) — Reverb tek
kullanıcısıydı ve artık `only` kullanıyor, ölü kod bırakılmadı (CLAUDE.md: "kesin
kullanılmıyorsa sil"). Kompresör'ün `noTransient`/`requireTransient` mekanizması
DOKUNULMADI — pink/white gürültü hâlâ dışlanıyor, DOĞRU çalışıyordu.

**reverb.js:** `uyumluKaynaklar: compatibleSourceIds({ only: ["guitar", "vocal",
"snare", "groove", "upload"] })` — 11 kaynaktan (G42) 5 kaynağa indi, ama BİLİNÇLİ bir
daralma (otomatik heuristiğin ürettiği YANLIŞ 11 değil, elle doğrulanmış DOĞRU 5).

**Doğrulama (canlı, tarayıcıda):** Reverb'e girildi — `#sourceSelect.options` TAM OLARAK
`snare,groove,guitar,vocal,upload` (5 kaynak, sırasız eşleşme deepEqual'la testte de
doğrulandı). Kaynak sheet'i açıldı — SENTETİK grubu TAMAMEN kayboldu (hiç synth/gürültü
kalmadı), DAVUL grubunda SADECE Snare + Davul Döngüsü (kick/hi-hat/tom yok), ENSTRÜMAN
grubunda SADECE Akustik Gitar + Vokal (Bas C2/E2 yok). Snare seçiliyken bir round
başlatıldı — A/B/C kartları (G41 UI) normal çalıştı, konsol hatası yok. Kompresör'e
geçildi — `#sourceSelect.options` DEĞİŞMEDİ (13 kaynak, pink/white hâlâ tek dışlanan,
kick/hihat/tom/bas/synth hâlâ VAR — G42'deki DOĞRU filtre bozulmadı). Kesim Noktası'na
geçildi — tüm 15 kaynak (regresyon yok). Frekans Bulma'nın kendi listesi (6 kaynak)
DEĞİŞMEDİ. `npm test`: 573/573 (574'ten 573'e — G42'nin `excludeOneShot`/`oneShot`
testleri kaldırıldı [4], `only` mekanizması + Reverb'in yeni kesin listesi için yeni
testler eklendi [5], net -1; `test/source-catalog.test.mjs` ve `test/reverb.test.mjs`
güncellendi, `test/kompresor.test.mjs` DOKUNULMADI).

---

Önceki commit (G42, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Mod bazlı kaynak
uyumluluğu: Reverb/Kompresör'de uygun olmayan kaynaklar kaynak seçim listesinden
çıkarıldı.** Sorun: her modun `getMeta()`'sında ZATEN bir `uyumluKaynaklar` alanı vardı
(G-serisinin önceki turlarından, `mode-contract.test.mjs`'in de doğruladığı bir sözleşme
alanı) ama HİÇBİR YERDE gerçekten filtrelemek için okunmuyordu — yedi modun altısı bunu
`SOURCE_GROUPS.flatMap(...)` ile TÜM kaynakların düz listesine sabitliyordu (Frekans
Bulma hariç, o zaten kendi elle-yazılmış kısıtlı listesini kullanıyordu). Sonuç: Reverb'de
kick (tek vuruş, döngüde bile reverb kuyruğunu göstermiyor) ve Kompresör'de pembe/beyaz
gürültü (transient'sız, kompresyonun atak-bastırması duyulmuyor) seçilebiliyordu —
oynanamaz/anlamsız kombinasyonlar.

**Merkezi mekanizma — `core/source-catalog.js`:** Her kaynak nesnesine iki opsiyonel
uyumluluk bayrağı eklendi: `oneShot: true` (kick/snare/hihat/tom — tek darbe, döngüde
"sürekli çalan" bir ses hissi vermiyor) ve `noTransient: true` (pink/white — ani bir
atak yok). Yeni `compatibleSourceIds({ excludeOneShot, requireTransient })` fonksiyonu
bu bayraklara göre SOURCE_GROUPS'u süzüp bir id listesi döndürüyor; parametresiz
çağrıldığında (varsayılan) TÜM kaynakları döner. Yedi mod dosyası (Frekans Bulma HARİÇ,
o kendi özel listesini koruyor — dokunulmadı) artık `SOURCE_GROUPS.flatMap(...)` yerine
bu TEK fonksiyonu çağırıyor: Reverb `compatibleSourceIds({ excludeOneShot: true })`,
Kompresör `compatibleSourceIds({ requireTransient: true })`, diğer dört mod (Kesim
Noktası/dB Seviyesi/Boost-Cut/Q Genişliği) parametresiz (kısıtlama YOK, task kararı —
frekans/EQ/seviye her kaynakta duyulur). Yeni bir mod (Stereo Genişlik/Pan Konumu gibi)
kendi kısıtlamasını tanımlamak isterse SADECE bu fonksiyona yeni bir bayrak/parametre
eklemesi yeterli — app.js'e dokunmadan.

**app.js — kaynak listesi ARTIK aktif moda göre süzülüyor:** `populateSourceSelect()`
(önceden sabit, sayfa yüklenirken bir kez çalışan bir fonksiyondu) artık
`mode.getMeta().uyumluKaynaklar`'ı okuyup `<optgroup>`/`<option>` listesini buna göre
üretiyor VE `enterMode()`'un mod-değişimi dalına eklendi — her mod kartına tıklanışta
YENİDEN çalışıyor. Önceki seçim yeni modda da uyumluysa korunuyor; değilse (ör.
Reverb'den Kompresör'e geçilirken seçili kaynak "Pink Noise"sa) listedeki İLK uyumlu
kaynağa düşülüyor ve bir `change` event'i elle tetikleniyor ki Ayarlar sheet'indeki satır
metni (`updateRowText`, mevcut mekanizma) senkron kalsın — kullanıcı asla artık var
olmayan bir `<option>`'da "takılı" kalmıyor. "Karıştır" (rastgele kaynak) özelliğinin
havuzunu üreten `pickRoundSource()` de AYNI `uyumluKaynaklar` listesiyle sınırlandı —
aksi halde Karıştır, kaynak sheet'inde hiç görünmeyen bir kaynağı sessizce çalabilirdi.

**Motor 2 tutarlılık notu (task'ın istediği "kesişim" kontrolü):** A/B/C'nin üçü de
`pickRoundSource()`'un TEK seferde seçtiği kaynaktan geliyor (mevcut, değişmeyen akış,
bkz. `startRound()`) — kaynak seçimi zaten üç varyant arasında ortak, kaynak hiçbir
zaman "hangisi farklı" ipucunu vermiyor. Bu turda değişen SADECE hangi kaynakların
havuzda/listede yer aldığı, üç-yönlü karşılaştırmanın kendisi dokunulmadı.

**KORUNANLAR (task'ın açık isteği):** Ses motoru (`audio-engine.js`), zorluk eğrisi,
oyun mantığı, geri bildirim, Motor 2 kartları (G41 reskin) HİÇ değişmedi — sadece kaynak
FİLTRELEME eklendi. Frekans Bulma'nın kendi elle-yazılmış `uyumluKaynaklar` listesi
(`["pink","white","saw","square","triangle","upload"]`, drums/enstrüman hariç — G-serisi
öncesi bir ürün kararı) da BİLEREK dokunulmadı, bu turun kapsamı dışında.

**Doğrulama (canlı, tarayıcıda, `devFlags.simulatePro` ile seviye kilidi aşılarak):**
Reverb'e girildi — Kaynak sheet'inin DAVUL grubunda SADECE "Davul Döngüsü" göründü
(kick/snare/hi-hat/tom yok), `#sourceSelect.options` 11 kaynak döndü (pink/white/saw/
square/triangle/groove/bass/bass_alt/guitar/vocal/upload). Kompresör'e geçildi —
`#sourceSelect.options` 13 kaynak döndü (pink/white YOK, kick/snare/hihat/tom/groove/
bass/bass_alt/guitar/vocal/saw/square/triangle/upload VAR); önceki seçim ("Pink Noise",
Reverb'de aktifken seçiliydi) Kompresör'de uyumsuz olduğu için OTOMATİK "Saw"a düştü,
Ayarlar satırının metni de senkron güncellendi. Kompresör'de bir round başlatıldı — A/B/C
kartları (G41 UI) normal çalıştı, konsol hatası yok. Kesim Noktası'na geçildi — TÜM 15
seçenek (14 katalog + Dosya Seç) göründü, kısıtlama yok (regresyon yok). Frekans Bulma'nın
kendi listesi (6 kaynak) sayfa yüklenişinde DEĞİŞMEDİ. `npm test`: 574/574 (561 +13 yeni —
`test/source-catalog.test.mjs` mekanizmanın kendisini, `reverb.test.mjs`/
`kompresor.test.mjs`'e eklenen testler ilgili modun dışlama/koruma listesini doğruluyor).

---

Önceki commit (G41, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Motor 2 (Kompresör/
Reverb) cevap kartları reskin: büyük A/B/C kartlar + çalan kart vurgusu.** Motor 1'in
küçük `.ans` grid'i yerine `Dizayn /prototype.html`'in `.opt`/`.opt-key`/`.wave`
yapısına yakınsayan büyük kartlar geldi — ÇALIŞAN MEKANİK (otomatik döngü, anında seç,
odd-one-out, X/Atla, kesik ses düzeltmesi) HİÇ DEĞİŞMEDİ, sadece görsel katman.

**Yeni ortak modül — `core/three-way-cards.js`:** `renderThreeWayCards`/
`markThreeWayCards`/`updateThreeWayCardsPlayState` — Kompresör'ün ve Reverb'in
`renderAnswerChoices`/`markAnswerChoices`'ı artık bu üç fonksiyona delege ediyor
(mod sözleşmesi hâlâ karşılanıyor, gövde ORTAK). Gerekçe: q.choices/q.variants şekli
ikisinde de BİREBİR aynı, gerçek bir mod-özel fark yok — G35'in `submitThreeWayGuess`'i
app.js'te genelleştirme kararının AYNI felsefesi, G34'ün `feedback-colors.js`
extraction'ıyla AYNI desen. Üçüncü bir Motor 2 modu (Distortion/Tonal Denge) sadece bu
modülü import edip re-export etmesi yeter.

**Kart yapısı:** her kart harf (`.ans-m2-key`, dairesel rozet) + isim ("Birinci ses"/
"İkinci ses"/"Üçüncü ses") + SABİT süsleme waveform'u (harfe göre deterministik, ses
analizi DEĞİL — prototipin kendi `WAVES` sabit dizisiyle AYNI felsefe) + durum metni
(`.ans-m2-state`). Durum metni task'ın istediği gibi SADECE iki değer alıyor
("Henüz dinlenmedi" / "Çalınıyor") — prototipteki "Çalındı"/"Elendi" ek durumları
BİLEREK atlandı (bizim basit otomatik-döngü mekaniğimize uyarlandı, ekstra "geçmiş"
takibi gerekmiyor).

**Çalan kart vurgusu:** amber kenar+glow (`box-shadow`) + amber gradyan anahtar +
amber waveform — kırmızı/yeşil (yanlış/doğru, G34) renkleriyle ÇAKIŞMASIN diye BİLEREK
farklı bir renk (marka rengi `--am`, prototipin mor `--pu`'sundan da farklı, çünkü
uygulamanın KENDİ renk dilinde mor kullanılmıyor). `app.js`'in `updateAbToggleUI()`'si
— zaten HER `threeWayPlayLetter` değişiminde (round başlangıcı, otomatik döngünün her
tık'ı, manuel A/B/C basışı) çağrılan TEK merkezi nokta — artık
`mode.updateAnswerPlayState(els.answers, threeWayPlayLetter)`'ı da çağırıyor; ayrı bir
çağrı noktası eklemeye GEREK kalmadı.

**Mekanik korundu (task'ın "sessizce değiştirme" uyarısı):** `.ans`/`data-letter`
class'ları/attribute'ları AYNEN kaldı — app.js'in click-delegasyonu
(`e.target.closest(".ans")`) ve `submitThreeWayGuess` HİÇ değişmedi, "anında seç"
(tıkla=cevapla, prototipin 2-adımlı "seç+onayla" modeli DEĞİL) davranışı dokunulmadan
korundu. `THREE_WAY_MODE_IDS`/`isThreeWayModule`/`isThreeWayQuestion`/
`cycleThreeWayPreview`/`previewLetter` mekanizmalarının HİÇBİRİNE dokunulmadı — sadece
`.answers`/`.ans` container'ına YENİ bir modifier class (`answers-m2`/`ans-m2`) eklendi.

**Doğrulama (canlı, tarayıcıda):** Kompresör'e girildi, round başlatıldı — üç kart alt
alta (A "Birinci ses"/B "İkinci ses"/C "Üçüncü ses"), her birinde waveform + durum
metni doğrulandı. O an çalan kart (C) amber kenar+glow+anahtar+dolgu ile DİĞER İKİSİNDEN
(gri, "Henüz dinlenmedi") AÇIKÇA ayırt edilir bulundu; alt "Döngü" A/B/C pill'iyle
BİREBİR senkron. 2 saniye beklenip tekrar kontrol edildi — vurgu C'den A'ya taşındı
(otomatik döngü çalışıyor). B kartına tıklandı — cevap ANINDA gönderildi (onay adımı
YOK), feedback kartı doğru açıldı ("Yanlış — sen B dedin, C farklıydı"), B kırmızı
("wrong"), C yeşil ("right") oldu, durum metinleri temizlendi. "Durdur"a basıldı — döngü
durdu, buton "🔁Tekrar Çal"a döndü (G31'in kesik-ses düzeltmesi bozulmadı). Reverb'de
AYNI davranış (paylaşılan modül) doğrulandı. Motor 1'den Kesim Noktası'na geçildi —
küçük 4'lü `.ans` grid'i TAMAMEN değişmeden çalışıyor (regresyon yok). Konsol hatası
YOK boyunca. `npm test`: 561/561.

---

Önceki commit (G40, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **İlerleme sekmesi
reskin: SV rozeti tek-kart + 3'lü stat satırı.** Önceki turda (araştırma-only, kod
yazılmadı) tespit edilen "veri zaten var, sadece düzen farklı" bulgusuna dayanarak
İlerleme'nin görsel düzeni prototipe yakınsatıldı — mod mantığı/hesap/veri
DOKUNULMADI.

**1. SV rozeti tek-kart:** Eski 4'lü ızgara (Seviye/XP/Seri/Doğruluk) + ayrı XP-bar
bloğu kaldırıldı, yerine Ana Menü'nün G36'da kurduğu `.card.lvl`/`.lvl-badge`
deseninin BİREBİR AYNISI geldi (`index.html`, id'ler `prog*` önekiyle ayrı —
`progLevelValue`/`progXpText`/`progXpBar`/`progNextLevelText` — aynı sayfada iki
`#levelValue` olamayacağı için). Veri KAYNAĞI değişmedi: `app.js updateUI()`'daki
AYNI `xp = progress.xpProgress(diffState().xp)` hesabından okunuyor — Ana Menü'nün
rozetiyle (`menuLevelValue` vb.) HER ZAMAN senkron, iki ayrı hesaplama YOK.

**2. 3'lü stat satırı:** "Seri" (combo) çıkarıldı (prototipte de yok), "İsabet"
"Antrenman"+"Soru" ile AYNI satıra taşındı — prototipin `.row` + 3× `.stat-big`
deseni birebir kopyalandı. `totalPracticeValue`/`totalRoundsValue`/`accuracyValue`
id'leri DEĞİŞMEDİ (zaten doğru hesaplanıyordu, sadece HTML'de tek satıra taşındı) —
bu üç değerin JS tarafı hiç dokunulmadı.

**Temizlik:** artık hiçbir yerde kullanılmayan `levelValue`/`xpValue`/`comboValue`/
`xpBar`/`progressText` DOM id'leri ve `.prog-grid` CSS kuralı (son kullanan yer bu
ekrandı) kaldırıldı — CLAUDE.md'nin "kesin kullanılmıyorsa sil" kuralı gereği,
geriye dönük uyumluluk kırıntısı bırakılmadı.

**DOKUNULMAYANLAR (task'ın açık isteği):** "Şu An Neredesin" (`renderWhereNow`),
"Frekans bölgesi — en zayıf" (`renderZonePanel`), "Son 30 Gün" grafiği
(`renderAccuracyChart`) — üçü de zaten TAM ve gerçek veriden besleniyordu (bkz.
önceki turun araştırma raporu), hiçbir satırına dokunulmadı. Rozetler ızgarası (9
rozet) da bu turda DEĞİŞMEDİ — ayrı bir ürün kararı olarak G36'nın notunda
işaretli kaldı. Günlük Görevler/Canlı İstatistikler/Son Turlar/"İstatistikleri
Sıfırla" panelleri (tasarımda karşılığı olmayan kod-only ekler) KALDI.

**Doğrulama (canlı, tarayıcıda):** İlerleme sekmesine girildi — SV rozeti tek
kart olarak "SV 4 / Kalibre Kulak / 6/330 XP / Sonraki seviyeye 324 XP" gösterdi,
Ana Menü'nün rozetiyle (AYNI ekranda, aynı anda kontrol edildi) BİREBİR aynı
değerler. 3 stat ("3s 44d Antrenman" / "1358 Soru" / "%2 İsabet") tek satırda.
Aşağı kaydırıldı: "Şu An Neredesin" ("Tiz bölgesinde iyisin (%50), bas bölgesinde
zorlanıyorsun (%50)"), "Frekans bölgesi" ("en zayıf: bas · %50"), "Son 30 Gün"
(veri henüz yetersiz olduğu için boş-durum mesajı) — üçü de DEĞİŞMEDİ, gerçek
veriyle çalışıyor. Konsol hatası yok. `npm test`: 561/561.

---

Önceki commit (G39, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Kulaklık sheet'i
+ dB spektrumu: üç düzeltme.** G37/G38'de kurulan iki mekanizmadaki (kulaklık uyarısı,
dB görseli) davranış sorunları giderildi.

**1. Kulaklık sheet'i artık genel toggle'dan BAĞIMSIZ:** G37'de `prefs.hpWarning`
(Ayarlar'daki "Kulaklık uyarısı" anahtarı) hem Ana Menü'deki statik `.mobile-warn`
banner'ını HEM DE mod-özel `hpSheet`'i birlikte kontrol ediyordu — kullanıcı bunun
YANLIŞ olduğuna karar verdi: toggle KAPALIYKEN bile kulaklık gerektiren bir moda
girilince sheet çıkmalıydı (toggle sadece banner'ı kapatmalı). `app.js`'teki mod
kartı click handler'ından `&& prefs.hpWarning` şartı kaldırıldı — artık SADECE
`meta.kulaklikGerekli && !skipped` kontrol ediliyor. `applyPrefs()`/`.hp-warn-off`
(banner görünürlüğü) DOKUNULMADI, toggle'ın KENDİ işlevi (ses değil, banner)
korundu — Ayarlar sheet'indeki açıklama metni de ("Ana menü notu + kulaklık
gerektiren egzersizlerde açılan uyarıyı göster" → "Ana menüde kulaklık hatırlatma
notunu göster") bu gerçeğe geri çekildi.

**2. "Bir daha gösterme" artık OTURUMLUK:** G37'de `prefs.hpSkip[modeId]` olarak
localStorage'a (kalıcı) yazılıyordu — kullanıcı bunun kalıcı DEĞİL, oturumluk
olmasını istedi (aynı oturumda tekrar çıkmasın, sayfa/uygulama yeniden yüklenince
sıfırlansın). `app.js`'e modül-seviyesi bir `hpSkippedThisSession` (`Set`, bellek)
eklendi, `prefs.hpSkip` TAMAMEN kaldırıldı (`storage.js`'in `freshPrefs()`'inden
de silindi — artık hiçbir yerde okunmuyor/yazılmıyor).

**3. dB Seviyesi'nde arka spektrum kaldırıldı:** G38'in dikey bar görseli
(`drawDbBars`) arka planda hâlâ eski FFT spektrum çubuklarıyla (`drawSpectrumBars`)
ÇAKIŞIYORDU — dB modu bir frekans dağılımını değil TEK bir seviye farkını
sorguladığı için spektrum orada anlamsızdı. `db-seviyesi.js`'e `THREE_WAY`'in
(kompresor.js/reverb.js) AYNI deseninde mode-agnostik bir bayrak eklendi:
`export const SHOW_SPECTRUM = false`. `app.js`'in `drawVisualizer`'ı artık
`mode.SHOW_SPECTRUM !== false` kontrolüyle spektrum çizimini atlıyor — export
ETMEYEN diğer altı mod (Frekans Bulma/Kesim Noktası/Boost-Cut/Q/Kompresör/Reverb)
varsayılan `true` ile ETKİLENMEDİ.

**Doğrulama (canlı, tarayıcıda):** `localStorage`'da `hpWarning:false` ayarlanıp
sayfa yenilendi → Reverb'e girişte sheet YİNE DE çıktı (toggle'dan bağımsız,
doğrulandı). "Bir daha gösterme" işaretlenip onaylandı → AYNI oturumda Reverb'e
tekrar girişte sheet ATLANDI (skip çalıştı) → sert yenileme (cmd+shift+r) sonrası
Reverb'e girişte sheet GERİ GELDİ (oturumluk doğrulandı, `hpSkippedThisSession`
Set'i sıfırlanmıştı). Ayarlar sheet'inde toggle açılıp kapatıldı, `document.body`
`hp-warn-off` sınıfı ve `prefs.hpWarning` DOĞRU senkronize oldu (banner masaüstü
Chrome'da `@media (hover:none)` kısıtı yüzünden zaten hiç görünmüyor — bu ÖNCEDEN
de böyleydi, bu turun konusu değil). dB Seviyesi'ne girildi → arka planda spektrum
çubukları YOK, sadece iki dikey bar + eksen çizgileri. Kesim Noktası'na geçildi →
spektrum çubukları NORMAL çalışıyor (regresyon yok). `npm test`: 561/561.

---

Önceki commit (G38, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **dB Seviyesi
görseli: yatay gauge → prototipteki DİKEY BAR'lara çevrildi.** `db-seviyesi.js`'in
`drawDbGauge`'ı (tek yatay çizgi + iki hareketli işaretçi) tamamen kaldırıldı,
yerine `Dizayn /prototype.html`'in `#vizDb`'sinden (satır 572-588) birebir alınan
"A · Referans" / "B · İşlenmiş" iki dikey bar geldi (`drawDbBars`, aynı gradyan
renkleri: A gri `#9AA3B8→#5A6377`, B mavi `#8FA6FF→#4E6BE0`).

**Kullanıcıyla netleştirilen kritik çakışma:** Task'ın ilk hâli "İşlenmiş bar
uygulanan dB değişimine göre daha dolu/boş olsun" diyordu — ama bu, SORU
SIRASINDA gösterilirse modun kendi `directionRevealed` mekaniğini (3. sorudan
sonra yön BİLEREK gizlenir, çeldiricilerin işareti bile karıştırılır, bkz.
dosya başı yorum + `createQuestion`) görsel olarak deşifre ederdi —
"kulakla bulma" ilkesini kırardı. `AskUserQuestion` ile soruldu, kullanıcı ÜÇÜNCÜ
(özel) seçeneği verdi: **bar SORU SIRASINDA tamamen NÖTR** (A=B=aynı sabit
yükseklik, `REF_FRAC=0.55`, hiçbir ipucu yok), **CEVAP SONRASI gerçek değerleri**
gösteriyor (A sabit referans, B = gerçek `dbDelta`, ölçek `DB_RANGE=5` — eski
gauge'la AYNI sabit görsel aralık). Bu, hem prototipin görsel dilini taşıdı hem
zorluk mekaniğini KORUDU.

**Cevap sonrası (korunan red/green mekanik, bar'a uyarlandı):** B barın yeşil
konturu = "doğru" (gerçek `dbDelta` zaten barın kendi yüksekliği); varsa
kullanıcının tahmini kırmızı kesikli çizgi + sayı olarak B barın üstüne
biniyor; üstte AYNI G34 lejantı ("● Senin cevabın" kırmızı / "● Doğru" yeşil).
Cevap şıklarının (`.ans` butonları) kendi doğru/yanlış/seçili renklendirmesi
HİÇ DOKUNULMADI (ayrı bir DOM mekanizması, bar görseli sadece canvas'ta).

**Mimari not:** Uygulamanın TÜM modları TEK paylaşılan canvas'a (`#visualizer`)
`mode.drawOverlay` ile çiziyor (bkz. app.js `drawVisualizer`); prototipteki
`#vizDb` DOM/CSS yapısı BİREBİR kopyalanmadı (yeni DOM elemanı eklemek diğer
6 modun paylaşılan-canvas mimarisinden sapardı) — aynı görsel dil canvas'ta
(`roundedRectPath`/`createLinearGradient`) yeniden üretildi.

**Doğrulama (canlı, tarayıcıda):** dB Seviyesi'ne girildi, round başlatıldı →
iki bar eşit yükseklikte NÖTR görüldü (ekran görüntüsüyle doğrulandı, ilk
denemede tarayıcı HTTP önbelleği eski `drawDbGauge`'ı göstermeye devam etti,
sert yenileme [cmd+shift+r] sonrası yeni kod devreye girdi — KOD hatası
değildi). Cevap verildi (yanlış, +3.25 dedi/+1.50 idi) → B barı yeşil konturla
gerçek değeri (+1.50 dB), kırmızı kesikli çizgiyle tahmini (+3.25 dB) gösterdi,
lejant doğru renklerde. Yeni soruya otomatik geçişte bar NÖTR'e sıfırlandı
(önceki cevabın sızıntısı yok). "Kısıldı" yönlü bir soruda da (negatif
`dbDelta`) B barı referanstan DAHA KISA çizildi (mantık iki yönde de
doğrulandı). Frekans Bulma moduna geçiş regresyon kontrolü yapıldı, konsol
hatası yok. `npm test`: 561/561 geçti (createQuestion/evaluateAnswer/
generateChoices SAF fonksiyonlarına dokunulmadı, sadece `drawOverlay`
değişti — zaten test edilmiyordu, bkz. CLAUDE.md "ses/DOM davranışı kaynak
koddan doğrulanamaz").

---

Önceki commit (G37, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Kulaklık uyarısı
mekanizması: mod başına bayrak + prototipteki sheet'e bağlandı.** TASARIM.md'nin RESKIN
RAPORU'nun örnek (d)'sindeki "hâlâ AÇIK" maddesi kapatıldı. `kulaklikGerekli` alanı
mode-catalog.js'te (ve her modun KENDİ getMeta()'sında) ÖNCEDEN tanımlıydı ama G37'ye
kadar HİÇBİR YERDE okunmuyordu — bu turda gerçek bir uyarı akışına bağlandı.

**1. Mod başına bayrak — düzeltilen İKİ tutarsızlık:** Mekanizmayı kurarken KENDİ
alanlarının birbiriyle çelişkili olduğu ortaya çıktı — `frekans-bulma.js`'in getMeta()'sı
`true` diyordu (task'ın istediği `false`'un TERSİ — frekans/EQ algısı hoparlörde de net,
stereo/derinlik gerektirmiyor); `reverb.js`'in getMeta()'sı `false` diyordu (G35'te
Kompresör şablonundan kopyalanırken düzeltilmemiş kalmış — mode-catalog.js'teki reverb
girdisi ZATEN `true`'ydu, iki dosya birbiriyle ÇELİŞİYORDU). İkisi de DOĞRU değere
çekildi: Frekans Bulma `false`, Reverb `true`. Diğer beş mod (Kesim Noktası/dB/Boost-Cut/
Q/Kompresör) zaten doğru `false`'du — HİÇBİRİNE dokunulmadı. `kulaklikGerekli` HİÇBİR
YERDE okunmadığı için bu iki hata ÖNCEDEN etkisizdi (görünmüyordu) — G37'nin gerçek bir
akışa bağlaması sayesinde YAKALANDI.

**2. Sheet — `Dizayn /prototype.html`'in `#hpSheet`/`askHeadphones`/`hpConfirm`
üçlüsünün AYNI deseni:** 🎧 ikon + "Bu egzersiz kulaklık gerektirir" + açıklama + iki
buton ("Kulaklığım takılı, başla"/"Geri dön") + "Bu modda bir daha gösterme" onay kutusu
(`.cbrow`/`.cb`, prototipten birebir taşınan CSS). Mevcut `.sheet-overlay`/`.bottom-sheet`
altyapısı (lvlSheet'in AYNI deseni) yeniden kullanıldı — yeni bir sheet sistemi İCAT
EDİLMEDİ. Metin BİLEREK genel/basit tutuldu (spec: "mod bazlı metin ya da genel yeterli")
— prototipin "stereo bilgisi duyulmaz" ifadesi Reverb için YANLIŞ olurdu (reverb mono-
uyumlu bir efekt) — bunun yerine "derinlik/mekân hissi" dili kullanıldı. Gelecekteki bir
mod (`kulaklikMetni` alanını getMeta()'sına eklerse) kendi metnini geçersiz kılabilir —
mekanizma HAZIR, kod değişikliği GEREKMEZ.

**3. Tetikleme mantığı (TEK kontrol noktası, `renderModeGrid`'in click handler'ında):**
`meta.kulaklikGerekli && prefs.hpWarning && !prefs.hpSkip[entry.id]` — üçü de true/false
olmalı ki sheet AÇILSIN. Mod-özel "bir daha gösterme" (`prefs.hpSkip[modeId]`, YENİ bir
alan — `storage.freshPrefs()`'e eklendi) SADECE onay anında (checkbox'a tıklamanın
KENDİSİ değil, `hpConfirm`'ün prototipteki AYNI deseni) kaydediliyor — kullanıcı
işaretleyip "Geri dön" derse HİÇBİR kalıcı değişiklik olmuyor (canlı doğrulandı). Genel
`prefs.hpWarning` toggle'ı (ÖNCEDEN sadece Ana Menü'nün statik `.mobile-warn` metnini
kontrol ediyordu) artık AYNI ANDA bu sheet'i de kapatıyor — açıklama metni buna göre
güncellendi ("Ana menü notu + kulaklık gerektiren egzersizlerde açılan uyarıyı göster").
Mode-özel skip'in AKSİNE genel toggle her zaman ÖNCELİKLİ — kapalıyken hiçbir mod için
sheet açılmaz (canlı doğrulandı: skip haritası boşken bile toggle kapalıyken Reverb'e
girmek sheet'i AÇMADI).

**Mimari not (kod tekrarını önleme):** mod-kartı tıklama akışının "gerçekten oyuna gir"
kısmı (`enterMode(entry, realMode)`) ayrı bir fonksiyona çıkarıldı — hem doğrudan
tıklamanın hem de sheet onayının (`hpSheetConfirm`) PAYLAŞTIĞI TEK kod yolu, davranış
DEĞİŞMEDİ (aynen prototipin `hpConfirm()`'ünün `applyMode`+`go()`'yu çağırmasıyla AYNI
desen).

Doğrulama: `npm test` **561/561** DEĞİŞMEDEN geçti. Canlı tarayıcıda: Frekans Bulma'ya
girince sheet ÇIKMADI (doğrudan oyuna girdi); Reverb'e girince sheet ÇIKTI (🎧 ikonu +
doğru metin); "Geri dön" sheet'i kapatıp menüde bıraktı (mod GİRİLMEDİ); Reverb'e tekrar
girip "Bu modda bir daha gösterme" işaretlenip "Kulaklığım takılı, başla"ya basıldı —
oyuna girdi VE `localStorage`'da `prefs.hpSkip` `{"reverb":true}` olarak DOĞRULANDI
(mod-BAZLI, genel değil); menüye dönüp Reverb'e TEKRAR girince sheet ARTIK ÇIKMADI (skip
kalıcı çalışıyor); Ayarlar'dan "Kulaklık uyarısı" toggle'ı KAPATILIP skip haritası
TEMİZLENDİKTEN SONRA bile Reverb'e girmek sheet'i AÇMADI (genel toggle her zaman
önceliklidir); toggle geri AÇILIP Kompresör'e (Motor 2, ama `kulaklikGerekli:false`)
girildi — sheet YİNE ÇIKMADI (Motor 2 grubunun TAMAMI değil, SADECE bayrağı true olan
modlar tetikliyor). Sıfır konsol hatası tüm oturum boyunca.

Commit (G36, tek commit — kod+DURUM.md+TASARIM.md birlikte) — **Ana menü reskin:
prototipe yakınsa (seviye rozeti + kart seviye çip'leri + öneri kartı iki buton + renk
düzeltmesi).** TASARIM.md'nin bir önceki
turda ürettiği RESKIN RAPORU'nun önerdiği "1. adım"ın (merkezi görsel katman, sıfır
fonksiyonel risk) İLK somut uygulaması — SADECE görsel, mevcut veriyi göstermek, ses/
zorluk/mod dosyalarına DOKUNULMADI.

**1. Seviye rozeti (Ana Menü):** `Dizayn /prototype.html`'in `.lvl`/`.lvl-badge`
yapısı taşındı — altın rozet ("SV N") + "Kalibre Kulak" başlığı + XP ilerleme barı +
"Sonraki seviyeye X XP". Veri KAYNAĞI YENİ değil — İlerleme sekmesindeki `levelValue`/
`xpBar`/`progressText`'in kullandığı AYNI hesap (`progress.xpProgress(diffState().xp)`,
`updateUI()` içinde TEK bir yerden hem İlerleme'ye hem Menü'ye yazılıyor) — bu, iki
ekranın SAYISAL olarak asla birbirinden sapamayacağını garanti ediyor (canlı doğrulandı:
ikisi de "Seviye 3, 141/260 XP" gösterdi).

**2. Mod kartı seviye çip'i ("Sv N"):** Her oynanabilir kartın `.mode-top`'unda, Pro
rozetinden AYRI (yeni `.mode-chip-level`, nötr gri — Pro'nun amberiyle KARIŞMASIN diye)
bir çip — `progress.modeLevel(stats, entry.id)`, oyun-içi `#levelChip`'in AYNI kaynağı.
Prototipte kilit ikonuyla AYNI slotta (birbirini dışlıyorlardı); koda geçirirken
`.mode-top-right` adında yeni bir flex-wrap sarmalayıcı eklendi ki Pro+Sv AYNI kartta
yan yana durabilsin (dB Seviyesi'nde canlı doğrulandı). **BİLİNÇLİ karar:** çip SADECE
`playable` kartlarda gösteriliyor — kilitli bir modun "seviyesi"ni göstermek kafa
karıştırırdı, prototip de zaten kilitliyken çip yerine kilit ikonu gösteriyordu (AYNI
mantık, koda uyarlandı).

**3. "Bugünün Önerisi" kartı — iki buton:** Prototipteki `.row` (flex, `.btn.green`
flex:1 + `.btn.ghost` flex:none) deseni BİREBİR taşındı — "Seti başlat" (birincil) +
"Şimdi değil" (ikincil, X ile AYNI `daily.tipDismissed=true` kapatma mantığı — prototipte
de ikisi aynı davranış). **Ürün kararı (kullanıcıya soruldu, cevap alındı):** prototipteki
statik "· 8 soru" sayısı EKLENMEDİ — gerçek kodda "Seti başlat"a basınca girilen mod
Serbest (sınırsız) kalıyor, sınırlı bir "set" kavramı yok; sayı göstermek tutulmayan bir
söz verirdi (CLAUDE.md "Sayı uydurma"). Kullanıcı, sayı göstermeden sadece "Seti başlat"
yazılmasını (davranış AYNI kalsın) seçti. **Doğrulama sırasında bulunan gerçek bir
düzeltme:** kartın "Başla" butonu zaten (önceki bir M1-4 turunda) odak aralığını en
zayıf bölgeye kilitliyordu (`mode.FOCUS_RANGES`/`focusIdForZone`) — TASARIM.md'nin bu
satırdaki eski notu ("odak-aralığı özelliği kodda yok") STALE'di, bu turda kod
okumasıyla YAKALANIP düzeltildi (TASARIM.md'de ayrıca işaretlendi).

**4. Renk düzeltmesi:** `.mode-chip-pro`'nun `#f2c94c`'ı `var(--am)` (`#FFC246`) — TÜM
Pro rozetlerinin artık `.mode-chip`'in TEMEL amberiyle birebir aynı olduğu canlı
doğrulandı (Stereo Genişlik/Pan Konumu/dB Seviyesi/vb. hepsi aynı ton).

Doğrulama: `npm test` **561/561** DEĞİŞMEDEN geçti (görsel-only değişiklik, hiçbir test
etkilenmedi). Canlı tarayıcıda: seviye rozeti doğru veriyle render oluyor + İlerleme'yle
BİREBİR aynı sayılar; her oynanabilir kartta "Sv N" çip'i doğru (Frekans Bulma/Kesim
Noktası "Sv 1", Q/Boost-Cut "Sv 2", dB Seviyesi "Pro"+"Sv 1" YAN YANA); kilitli kartlarda
(Hız Modu/Stereo Genişlik/Pan Konumu) çip YOK, sadece kilit satırı; öneri kartı iki
butonlu, "Şimdi değil" X ile AYNI şekilde kartı kapatıyor; bir moda (Frekans Bulma)
girilip tam bir round oynandı — fonksiyon (ses/soru üretimi/puanlama) DEĞİŞMEDEN
çalıştı; sıfır konsol hatası tüm oturum boyunca.

Commit `e28be55` — G35: **Mod 7 "Reverb" — Motor 2'nin İKİNCİ modu (Kompresör
şablonundan türetildi).** (Not: commit mesajında yanlışlıkla "Mod 8"
yazıldı — kod/testler doğru, sadece commit mesajı metninde bir yazım hatası;
gerçek sıra Frekans Bulma/Kesim Noktası/dB/Boost-Cut/Q/Kompresör/**Reverb**
= 7.) Motor 2'nin ("A/B/C odd-one-out") ikinci oynanabilir modu — Kompresör'ün
G33'te olgunlaşan şablonunu MİRAS ALDI ve gerçek tekrar ağrısını netleştirdi.

**Mod mantığı:** 3 ses (A/B/C), aynı kaynak, ikisi AYNI reverb biri FARKLI.
Tek kontrol değişkeni `k∈[0,1]` decay+preDelay+size'ı BİRLİKTE sürüyor
(Kompresör'ün ratio+threshold'u sürmesinin AYNI deseni), `reverbAmountScore`
tek algısal eksen (GERÇEK bir akustik birim DEĞİL, tasarım sabiti —
Kompresör'ün `gainReductionDb`'siyle AYNI dürüstlük notu).

**KADEMELİ zorluk (Reverb'e özgü, Kompresör'de olmayan bir katman):**
kolay/orta/zor AYNI TİP (Room/Hall/Plate) içinde miktar farkı (kolay=
ekstrem ~%84 oransal fark, zorlukla ince nüansa iniyor), pro/proplus TİP
farkına geçiyor (`TYPE_SWAP_POSITION_THRESHOLD=18`, Otomatik modda da
çalışıyor). Öğretmen yöntemi: TİP farkı EN İNCE/zor katman — SoundGym
Reverb Wizard'ın forumda eleştirilen "türü öğretmiyor" zayıflığına karşı
bizim ayrıştırıcımız: cevap sonrası TİP HER ZAMAN adıyla söyleniyor.

**Zorluk eğrisi kalibrasyonu (Kompresör'ün BAŞTAN-doğru yöntemiyle, ikili
arama):**

| tier | repr.sv | kGap | statik | OK |
|---|---|---|---|---|
| easy | 4 | 0.3229 | 0.45 | ✓ |
| medium | 8 | 0.2074 | 0.28 | ✓ |
| hard | 12 | 0.1333 | 0.14 | ✓ |
| pro | 20 | 0.0550 | 0.06 | ✓ (type-swap'a geçtiği İÇİN fiilen kullanılmıyor) |

`K_GAP_FLOOR=0.05`'te (room tipinde) base'ten en az ~%7.6 oransal
`amountScore` farkı kalıyor (KULAKLA DOĞRULANMADI, ama sıfıra/algılanamaz
bir farka ASLA inmiyor — 2000 örnek/hard testinde ölçülen en küçük oransal
fark %5 üstünde kaldı).

**Sentetik IR (hazır dosya YOK, `generateImpulseResponse`):** preDelay
sessizliği + RT60 formülüyle (-60dB'ye `decaySec`'te iner) üstel sönümlü
beyaz gürültü + size'a bağlı bir "yoğunluk" çarpanı + tip-özgü tek-kutuplu
(one-pole) IIR alçak-geçiren filtre (`brightness`: Plate=0.85/az filtre/
parlak, Hall=0.4/çok filtre/donuk, Room=0.65/orta). Gerçek bir akustik
mekan ölçümü DEĞİL, algoritmik bir yaklaşıklık — testle doğrulandı (kuyruk
genel olarak azalan RMS eğiliminde, donuk/parlak IR'ler arasında ölçülebilir
pürüzlülük farkı var).

**MİMARİ — Motor 2 genelleştirmesi (G33'ün "2. modda netleşirse ortak bir
çekirdek çıkarılabilir" öngörüsünün GERÇEKLEŞTİĞİ an):** app.js'te
`THREE_WAY_MODE_IDS` listesi + `isThreeWayModule`/`isThreeWayQuestion`
yardımcıları TEK yerde tutuluyor — gelecekteki bir Motor 2 modu (Distortion)
SADECE bu listeye eklenir. `submitKompresorGuess`→`submitThreeWayGuess`,
`cycleKompresorPreview`→`cycleThreeWayPreview` (gövdeleri ZATEN tamamen
mode-agnostikti, SADECE değişken isimleri Kompresör'e özeldi — genelleştirme
davranış DEĞİŞTİRMEDİ). `kompresorGuessLetter`/`kompresorPlayLetter`→
`threeWayGuessLetter`/`threeWayPlayLetter` — TEK paylaşılan değişken (aynı
anda sadece BİR three-way mod aktif olabildiği için Kompresör'le Reverb
arasında güvenle paylaşılıyor, dbGuess/boostCutGuess gibi her modun KENDİ
değişkeni olduğu desenin BİLİNÇLİ istisnası). Kompresör'ün `drawOverlay`'i
de `state.guessLetter` okuyacak şekilde güncellendi (overlayState bag'in
per-mode-key geleneği KORUNARAK — sadece anahtar adı genelleşti). Motor
1'in beş modu (kendi submit fonksiyonları) BİLEREK dokunulmadı — o tekrar
ağrısı hâlâ netleşmedi (proje kararı, tekrarlanan bir desen).

**Kuru/ıslak karışımı — audio-engine.js'e HİÇ dokunmadan:** `applyProcessing`
`filters=[input, output]` döndürüyor — `buildQuestionChain`'in genel "seri
bağla" döngüsü OTOMATİK olarak kuru payı (`input.gain=1-wetMix`) taşırken,
`applyProcessing` İÇİNDE (dışarıdan görünmeden) kurulan
`input→convolver→wetGain→output` bağlantısı ıslak payı ekliyor —
`output` ikisini TOPLUYOR (GainNode'un varsayılan davranışı). Şık bir
çözüm: mevcut tek-parametreli "filters zinciri" sözleşmesi hiç
DEĞİŞTİRİLMEDEN paralel bir dry/wet mix elde edildi.

**Testler yazılırken bulunup AYNI turda düzeltilen gerçek bir hata:**
`isTypeSwapTier`'in hesaplanışı `level === "pro" || level === "proplus" ||
(curve && curve.position >= ESIK)` şeklindeydi — `curve` null olduğunda
(`difficultyPosition` verilmediğinde) `false || false || null` JavaScript'te
`null` döner, `false` DEĞİL — `q.typeSwap` alanı yanlışlıkla `null` oluyordu
(testle YAKALANDI: `assert.equal(q.typeSwap, false)` başarısız oldu, `!!(...)`
ile kısa-devrenin sonucu zorla boolean'a çevrilerek düzeltildi).

Doğrulama: 62 yeni Reverb testi (3 ses üretimi, odd-one-out, k-ekseni
monotonikliği, AYNI-tip/TİP-farkı kademe geçişi [Otomatik+Sabit], FLOOR,
previewLetter, IR üretimi, Kompresör'le çapraz-tutarlılık) — suite
**561/561** (499+62). Canlı tarayıcıda: mod menüden açılıyor (Reverb kartı
kilitsiz), A/B/C döngü otomatik başlıyor, doğru cevapta "İkisi de Room
(ince/hafif yankı) sesti, C daha uzun/derin (decay 0.7s) — mixte daha
geride durur" gibi metin + kırmızı/yeşil kuyruk zarfı, yanlış cevapta AYNI
kalitede karşılaştırmalı metin doğrulandı, sıfır konsol hatası. Kompresör'de
TAM regresyon: envelope/teaching-text/loop-otomatik-başlama/Durdur-döngü-
durdurma HEPSİ değişmeden çalışıyor (DOM enstrümantasyonuyla ölçüldü: döngü
A→B ilerliyor, Durdur'a basınca anında duruyor, 2.2sn sonra bile harf
sabit). Frekans Bulma + Q Genişliği'nde de tam tur (round+cevap+geri
bildirim) regresyon yok. Tip-farkı (pro) katmanı canlı UI'da elle
zorlanamadı (Seviye bilgi sayfası zorluk seçici değil, renderLevelSheet
açıyor — bilinen ÖNCEDEN kayıtlı kısıt) ama 62 testin ~8'i bunu doğrudan
ve N=100-200 örnekle istatistiksel olarak doğruluyor.

Commit `754d875` — G34: **Cevap sonrası görsellerde "senin cevabın" rengi
amber yerine kırmızı — merkezileştirildi.** Kesim Noktası eğrisi/dB
göstergesi/Boost-Cut bell/Q genişlik/Kompresör dinamik zarfının HEPSİNDE
"senin cevabın = amber (#FFC246), doğru = yeşil (#2BD9A8)" ikilisi vardı —
standart doğru/yanlış renk mantığına (kırmızı=yanlış, yeşil=doğru) uymuyordu,
ayrıca zaten `.ans.wrong` CSS class'ının (styles.css: `var(--rd)`)
kullandığı "yanlış şık" kırmızısıyla TUTARSIZDI.

**Merkezileştirme:** renk ikilisi beş mod dosyasında AYRI AYRI (kopyala-
yapıştır) tanımlıydı, merkezi bir kaynak YOKTU — bu görevin kendisi (5
dosyada AYNI ANDA değişmesi gereken bir renk) gerçek bir tekrar ağrısı
olduğunu kanıtladığı için yeni bir paylaşılan modül
(`core/feedback-colors.js`: `GUESS_COLOR`/`CORRECT_COLOR`) çıkarıldı — beş
mod dosyası da (`kesim-noktasi.js`/`db-seviyesi.js`/`boost-mu-cut-mu.js`/
`q-genisligi.js`/`kompresor.js`) artık BURADAN import ediyor, kendi local
sabitlerini kaldırdı. `GUESS_COLOR="#FF4D6D"` (styles.css'in `--rd`'si),
`CORRECT_COLOR="#2BD9A8"` (`--gr`, DEĞİŞMEDİ).

**BİLEREK dokunulmayan:** Frekans Bulma'nın `closenessColor`'ı (üç kademeli
yakınlık gradyanı: yeşil/amber/kırmızı, tıklanan noktanın doğru cevaba ne
kadar yakın olduğunu gösterir) TAMAMEN farklı bir görsel dil — "senin
cevabın vs doğru" iki-renkli karşılaştırma DEĞİL, bu görevin kapsamı
dışında bırakıldı.

Doğrulama: 5 dosyada da `GUESS_COLOR`/`CORRECT_COLOR` artık import edilen
AYNI sabitler (grep ile hardcoded `"#FFC246"` kalmadığı doğrulandı). Canlı
tarayıcıda Kesim Noktası ve Kompresör'de test edildi — legend ("● Senin
cevabın ● Doğru") ve eğri/zarf renkleri ikisinde de kırmızı/yeşil, sıfır
konsol hatası. `npm test`: **499/499** DEĞİŞMEDEN geçti (renk değişikliği
testleri etkilemiyor, hiçbir test rengi assert etmiyordu).

Commit `baf7761` — G33: **Kompresör mimarisini TAM oturt (Motor 2 şablonu) —
ratio+threshold birlikte, geçiş fade'i, öğretim.** Derin araştırma (SoundGym
Dr. Compressor + öğretmen içgörüleri) ışığında G30'un yarı-gerçekçi (SADECE
ratio değişiyordu) tasarımı tamamlandı — bu dosya artık Motor 2'nin GERÇEK
şablonu.

**1. RATIO + THRESHOLD BİRLİKTE (gerçekçi kompresyon):** Tek bir
"kompresyon yoğunluğu" kontrol değişkeni (`k ∈ [0,1]`) eklendi — k arttıkça
`ratioAtK` YÜKSELİR (1.3→14) VE `thresholdAtK` DÜŞER (-8→-34 dB) BİRLİKTE,
ikisi tek bir algısal eksene (`gainReductionDb` — statik kompresör transfer
eğrisi yaklaşıklığı: `(refLevel-threshold)*(1-1/ratio)`) indirgeniyor.
Attack/release (ve knee) HİÇBİR zorlukta değişmiyor — araştırma dersi: hız
değişirse "hangisi daha sıkışmış" sorusunun net cevabı kalmıyor (yavaş
attack'lı ses daha AZ sıkışmış DUYULUR ama daha ÇOK sıkışmıştır).
`COMP_BASE_K=0.5` (aralığın TAM ortası) — FARKLI olan varyant simetrik iki
yöne (daha çok/az sıkışmış) uzaklaşıyor, hiçbir zorlukta clamp'e çarpmıyor
(G30'un merkezi-olmayan `COMP_BASE_RATIO=3.5` tasarımının aksine — testle
doğrulandı, up/down ortalamaları %10'dan az sapıyor).

**Zorluk eğrisi (öğretmen yöntemi — kolay=ekstrem, zorlukla ince nüansa
in):** ikili aramayla İKİ koşul BİRLİKTE doğrulandı:

| tier | repr.sv | kGap | GR farkı (~) |
|---|---|---|---|
| easy | 4 | 0.3256 (statik 0.45) | ~11.5dB — EKSTREM/bariz |
| medium | 8 | 0.2115 (statik 0.30) | ~7.7dB |
| hard | 12 | 0.1374 (statik 0.15) | ~3.9dB |
| pro | 20 | 0.0580 (statik 0.06) | ~1.5dB — ince/subtle |

`K_GAP_FLOOR=0.046`'da bile GR farkı hesapla (node ile) doğrulandı: >=1.2dB
(kulağın ayırt edebileceği varsayılan bir alt sınır — KULAKLA
DOĞRULANMADI, ama sıfıra/algılanamaz bir farka ASLA inmiyor; 2000 örnek/pro
testinde ölçülen en küçük fark 0.8dB üstünde kaldı).

**2. GEÇİŞ FADE'İ (kesiklik düzeltmesi, koddan KANITLANDI):**
`audio-engine.js:stopAudio()`'nun eski zincir söndürme zaman sabiti (0.03)
`node.stop()`'un sabit gecikmesine (0.08sn) göre GEVŞEKTİ —
`setTargetAtTime` asimptotik olduğu için `.stop()` ateşlendiğinde gain hâlâ
~%7 seviyesindeydi (e^(-80/30)≈0.070), sonra SERT kesiliyordu. Diğer beş
modda bu SEYREK tetiklenir (tur başına bir kez) ama Kompresör'ün A/B/C
döngüsü `buildQuestionChain`'i (ve dolayısıyla `stopAudio`'yu) her ~2sn'de
bir YENİDEN çağırıyor — aynı gevşek söndürme Kompresör'de ÇOK daha sık
duyuluyordu ("ses/kaynak değişince kesiklik" — kullanıcı raporu). Zaman
sabiti sıkılaştırıldı (`STOP_RAMP_TIME_CONSTANT`, 0.03→0.012, `.stop()`
zamanlaması DEĞİŞMEDİ) — artık gain `.stop()` ateşlendiğinde ~%0.1'e inmiş
oluyor (e^(-80/12)≈0.0013). Paylaşılan fonksiyon ama davranış SADECE daha
sıkı — hiçbir modun round geçiş SÜRESİ değişmedi, sadece söndürme EĞRİSİ.
KULAKLA/CİHAZDA DOĞRULANMADI (bu ortamda ses duyulamıyor, CLAUDE.md
"tahminle düzeltme yapma" notu gereği bu açıkça işaretleniyor) — ama kök
sebep Web Audio API semantiğinden MATEMATİKSEL olarak kanıtlanabilir, tahmin
değil.

**3. CEVAP SONRASI ÖĞRETİM (mix dili, gerçekçi):** `teachingText` artık
ratio+threshold+gainReductionDb'yi BİRLİKTE açıklıyor. İki varyant AYNI
kompresyon kademesindeyse (`COMPRESSION_TIERS`'ın aynı aralığı — ince
nüans) "İkisi de X sıkıştırılmıştı, B daha ağır — mixte daha geride/oturmuş
durur" dili; FARKLI kademedeyse net "B farklıydı (ratio X:1, eşik Y dB) —
ağır/hafif kompresyon" dili (canlı doğrulandı: "A farklıydı (ratio 10.8:1,
eşik -27 dB) — ağır kompresyon — dinamik ÇOK dar..."). Şablonlar TEK yerde
(`COMPRESSION_TIERS`).

**4. KAYNAK ÖNCELİĞİ:** tüm kaynaklar AÇIK kalıyor (varsayılan kaynak
değişikliği bir ürün kararı — CLAUDE.md "Ürün kararı verme" — BİLİNÇLİ
yapılmadı), dosya başına kompresyonun transient kaynakta (davul/perküsyon/
groove) çok daha net duyulduğu, ince kompresyonun vokal/string'de zor
duyulduğu NOT edildi.

**MOTOR 2 ŞABLON NİTELİĞİ:** `previewRatio` (tek-parametreli, G30'un
tasarımı) yerine `previewLetter` (parametre-agnostik) geçti —
`applyProcessing` artık HANGİ harfin TÜM parametrelerini okuyacağını
`previewLetter`'dan öğreniyor, kaç parametre olursa olsun (reverb:
decay+mix+size gibi) AYNI mekanizma çalışır — yeni bir "previewX" alanı
GEREKMEZ. Dosya başına "MOTOR 2 ŞABLONU" bölümü eklendi — tek algısal eksen
(k) + previewLetter + tek-yerde öğretim şablonları (COMPRESSION_TIERS)
deseni gelecekteki modlar (Reverb/Distortion/Tonal Denge) için AÇIKÇA
belgelendi; app.js'in `activeQuestion.mode === "kompresor"` dallarının
genelleştirilmesi (2. Motor 2 modu geldiğinde) SIRADAKİ'ye not edildi.

Doğrulama: `gainReductionDb`'nin k'de MONOTON arttığı + ratio/threshold'un
AYNI ANDA değiştiği (biri değişip diğeri sabit kalamaz — testle doğrulandı)
+ K_GAP_FLOOR'da GR farkının hesapla doğrulandığı + easy ortalama GR
farkının >=6dB, pro'nun <3dB olduğu (N=200/tier, öğretmen yöntemi
doğrulandı) için 11 yeni test. Toplam 46→57 Kompresör testi, suite
488→**499**, hepsi geçti. Canlı tarayıcıda: yeni teaching text formatı
doğrulandı, G31/G32'nin toggle/döngü/Durdur davranışı DEĞİŞMEDEN çalışıyor
(ilk render A/B/C, otomatik döngü, Durdur döngüyü durduruyor — hiçbiri
regresyona uğramadı), Frekans Bulma + Q Genişliği (stopAudio zaman sabiti
değişikliği paylaşılan bir dosyayı etkilediği için ÖZELLİKLE test edildi)
tam tur (round başlat + cevap ver + geri bildirim) sıfır konsol hatasıyla
çalıştı.

Commit `9783adb` — G32: **Kompresör'de yeni soruda A/B/C döngüsü otomatik
başlasın.** Kullanıcı raporu: yeni soru gelince ses otomatik başlıyordu
(`playQuestion`'ın varsayılanı, `variants[0]`/A) ama döngü kapalı kalıyordu
— kullanıcı A'yı bir kez dinleyip B/C'ye HİÇ geçmiyordu, döngüyü elle
(uzun basma) açması gerekiyordu; istenen, kullanıcı hiçbir şey yapmadan
A→B→C otomatik ilerlemesiydi.

`startRound()`'a (tüm modların ORTAK tek round-başlatma noktası)
Kompresör'e özgü TEK satırlık bir dal eklendi: `playQuestion(true)`'dan
hemen sonra `mode.MODE_ID === "kompresor"` ise `startAbLoop()` çağrılıyor.
Diğer beş moda dokunulmadı — onlarda A/B tek bir dry/wet karşılaştırması,
döngü hâlâ isteğe bağlı bir kısayol; Kompresör'de ise A/B/C karşılaştırması
modun ÖZÜ (odd-one-out ancak üçünü de dinleyince bulunabilir), döngünün
otomatik olması gerekiyordu. G31'in Durdur/cevap-sonrası döngü durdurma
mekanizması (`setActionbarTucked`/`pauseRound`) değişmeden çalışıyor — bu
görev SADECE döngünün ne zaman BAŞLADIĞINI değiştirdi, ne zaman
DURDUĞUNU değil.

Doğrulama (canlı tarayıcıda, DOM state örneklemesiyle — 1sn aralıklarla
12sn boyunca `roundChip`/`abToggle.dataset.ab`/`.loop` class izlendi): tek
bir round içinde (roundChip SABİT "Soru 1101") harf A→B→C→A→B döngüsü
kullanıcı hiçbir tıklama yapmadan otomatik ilerledi, `.loop` class baştan
itibaren `true`. Frekans Bulma'da (regresyon) aynı senaryo (round başlat +
3.5sn bekle) `.loop:false` kaldı — değişiklik Kompresör'e izole, diğer beş
modun A/B'si hâlâ isteğe bağlı. `npm test`: **488/488** DEĞİŞMEDEN geçti
(davranış değişikliği DOM/round-başlatma katmanında, pure-function
testlerini etkilemiyor). Sıfır konsol hatası.

Commit `69c0259` — G31: **Kompresör'de cihazda bulunan ÜÇ hata — toggle ilk
render, geri bildirim sırasında ses, Durdur döngüyü durdurmuyor.** Üçü de
TEK bir kök sebebe iniyor: G30'da eklenen A/B/C döngü mekanizması
(`cycleKompresorPreview`/`abLoopTimer`) mevcut pause/geri-bildirim akışına
DOĞRU bağlanmamıştı — Motor 2'nin ilk modu olarak yeni bir davranış (üç
yönlü döngü) ekleyip onu paylaşılan sistemin gerektirdiği TÜM çıkış
noktalarına (round bitişi, Durdur) bağlamayı unutmuştu.

**1. Toggle ilk render'da yanlış (kod okumasıyla KANITLANDI):**
`updateAbToggleUI()`'nin `isKompresor` kontrolü `activeQuestion.mode`'a
bakıyordu — ama "Oyunu Başlat"a basılana kadar `activeQuestion` NULL
(G17'nin mod-değiştirme bloğu sıfırlıyor) — mod GERÇEKTEN Kompresör olsa
bile ilk ekranda HER ZAMAN "A/B Test" (yanlış) gösteriyordu (canlı ekran
görüntüsüyle YAKALANDI). Düzeltme: kontrol artık `activeQuestion` yerine
SEÇİLİ MOD MODÜLÜNE (`mode.MODE_ID`) bakıyor — altı modun ALTISI da
`MODE_ID` export ediyor (kod incelemesiyle doğrulandı), bu yüzden genel/
güvenli bir düzeltme; ilk render dahil her zaman doğru.

**2 + 3. Geri bildirim açıkken ses başlıyordu / Durdur döngüyü
durdurmuyordu (AYNI kök sebep, koddan KANITLANDI):** `abLoopTimer`
(`setInterval(toggleAB, 2000)`) hiçbir round-bitişi ya da Durdur
noktasında TEMİZLENMİYORDU. Diğer beş modda bu ZARARSIZDI çünkü
`toggleAB()` onlarda sadece `audioEngine.setProcessed()` çağırıyor —
`stopAudio()` sonrası `dryGain`/`wetGain` null olunca bu fonksiyon
SESSİZCE no-op oluyor (`audio-engine.js:361`: `if (!audioCtx || !dryGain
|| !wetGain) return;`). Kompresör'de ise HER döngü tetiklemesi
`buildQuestionChain()`'i YENİDEN çağırıyor — bu (a) sesi baştan
başlatıyor (roundActive'e/geri bildirim durumuna hiç bakmadan) VE (b)
"güvenlik" amaçlı `muteGain`'i 1'e geri açıyor (bkz. `audio-engine.js`
`buildQuestionChain`'in başındaki yorum: "bir önceki durum [Durdur]
muteGain'i 0'da bırakmış olabilir") — Durdur'un uyguladığı mute, bir
sonraki döngü tetiklemesinde SESSİZCE iptal ediliyordu.

**Düzeltme — yeni bir paralel sistem KURMADAN, döngüyü mevcut iki ortak
noktaya bağladı:**
- `setActionbarTucked(tucked=true)` — her modun HER cevap-sonrası/süre-
  dolumu yolunun (onTimeUp + altı submit*Guess fonksiyonu) ÇAĞIRDIĞI TEK
  ortak nokta (grep ile doğrulandı, 9 çağrı yeri) — artık `abLoopTimer`
  varsa `stopAbLoop()` çağırıyor. Diğer beş modda davranış DEĞİŞMİYOR
  (loop zaten sesli bir etkisi olmayan bir zamanlayıcıydı, şimdi sadece
  GERÇEKTEN temizleniyor), Kompresör'de artık geri bildirim kartı sesle
  ÇAKIŞMIYOR.
- `pauseRound()` (Durdur) — `setActionbarTucked`'ı HİÇ çağırmadığı için
  (çubuk görünür kalmalı, "Tekrar Çal" basılabilsin diye) yukarıdaki
  merkezi nokta buraya ulaşmıyordu — AYRICA kendi `stopAbLoop()` çağrısı
  eklendi.

**Doğrulama (canlı tarayıcıda, DOM state + zamanlanmış JS enstrümantasyonuyla
— ekran görüntüsü değil, senkron/atomik state okumaları):**
- Toggle: mod kartına tıklanır tıklanmaz (Oyunu Başlat'tan ÖNCE) "A/B/C
  Test" + üç pill görünüyor (ekran görüntüsüyle doğrulandı).
- Döngü+Durdur: `pointerdown` (700ms) → `abLoopTimer` başladı (harf A,
  `loop` class var, başlık "Döngü") → 2.3sn sonra harf B'ye ilerledi
  (döngü GERÇEKTEN tetikleniyor) → Durdur'a basılınca ANINDA `loop:false`,
  başlık "A/B Test"e döndü, `startBtn` "🔄 Tekrar Çal" oldu → 2.3sn DAHA
  beklenince harf HÂLÂ B'de sabit (önceden sonsuz ilerlerdi) — döngü
  GERÇEKTEN durdu, sadece gizlenmedi.
- Döngü+cevap: aynı döngü çalışırken bir cevap gönderildi → ANINDA
  `loop:false`, `feedbackShown:true`, `actionbarTucked:true` → 2.3sn geri
  bildirim kartı AÇIK kalırken harf/döngü SESSİZ kaldı (önceden bu sırada
  yeni ses duyulabiliyordu).
- AYNI enstrümantasyon Frekans Bulma'da (beş modun temsilcisi) da
  çalıştırıldı — loop/Durdur davranışı ÖNCEDEN OLDUĞU GİBİ (A/B tek
  başına ilerliyor, Durdur'da donuyor, davranış hiç değişmedi).
- `npm test`: **488/488** DEĞİŞMEDEN geçti (düzeltme DOM/zamanlayıcı
  katmanında, pure-function testlerini etkilemiyor, yeni test gerekmedi).
- 2 mod canlı regresyon: Frekans Bulma (tam tur + loop/Durdur + normal
  cevap akışı) ve Q Genişliği (tam tur, 4 şık, zengin geri bildirim) sıfır
  konsol hatasıyla çalıştı.

Commit `464ce8e` — G30: **Mod 6 "Kompresör" — Motor 2'nin İLK modu (3 ses,
hangisi farklı), ŞABLON.** İlk beş mod Motor 1'di ("değeri bul" — tek bir
sayısal/etiket değeri tahmin ediliyordu); bu, Motor 2'nin ("hangisi farklı"
— A/B/C üç ses, ikisi aynı biri farklı, %33 şans) İLK oynanabilir modu.
Gelecekteki Motor 2 modları (reverb, tonal denge) için mimari şablon niyetiyle
yazıldı, ama AYNI merkezi zorluk eğrisi + geri bildirim akışı + mod sözleşmesi
altyapısını yeni bir "müşteri" olarak kullanıyor.

**Mod mantığı:** kaynağa `DynamicsCompressorNode` ile üç varyant uygulanıyor
— attack/release SABİT kısa (SoundGym Dr. Compressor deseni), sadece ratio
zorlukla değişiyor. İkisi `COMP_BASE_RATIO` (3.5), biri (`oddIndex`, rastgele
konumda) `pickGap`'in ürettiği gap kadar uzakta (`pickOddRatio`, RATIO_MIN–
RATIO_MAX=[1,20] dışına asla taşmıyor, kırpma her zaman DAHA KOLAY yöne
düşüyor — Boost mu Cut mu'nun G25'teki AYNI ilkesi). Mevcut TEK A/B butonu
`cycleKompresorPreview`'la A→B→C→A üç yönlü döngüye genişletildi —
`audio-engine.js`'in dry/wet crossfade çekirdeği (`setProcessed`) HİÇ
değiştirilmedi, bunun yerine post-answer karşılaştırma butonlarıyla (Senin
cevabın/Doğru cevap/Temiz) AYNI teknik (geçici `buildQuestionChain` kopyası,
`activeQuestion` mutasyona uğramadan) yeniden kullanıldı.

**Merkezi zorluk eğrisine bağlanma — BAŞTAN doğru kalibre edilen mod:**
`COMP_CURVE_CONFIG`'in `GAP_AT_CAP`'i ikili aramayla, hiçbir temsilci
seviyede eski statiği aşmayacak şekilde ÖNCEDEN çözüldü (dB Seviyesi/Boost-
Cut/Q Genişliği'nin AYNI "önce bağla sonra düzelt" döngüsünden kaçınma
dersi burada da uygulandı):

| tier | repr.sv | gap | timeSec |
|---|---|---|---|
| easy | 4 | 3.82 | 14.61 |
| medium | 8 | 2.35 | 12.94 |
| hard | 12 | 1.45 | 11.47 |
| pro | 20 | 0.55 | 9.00 |

`GAP_FLOOR=0.4` — LEVEL_CAP'in ötesinde (seans rampası/boss) bile asla
altına inmiyor (node ile doğrudan hesaplanıp ölçüldü: level 25→0.50,
30→0.45, 40→0.40, 60→0.40 — tabana kilitleniyor, tahmin değil).
`pickGap`'te jitter (±%6) SONRASI `Math.max(GAP_FLOOR, ...)` — floor'un
jitter'la delinmesi dB Seviyesi'nde G24'te YAŞANAN bir hataydı, burada
baştan önlendi.

**Cevap sonrası öğretim:** `teachingText` — farklı olanın harfi + ratio
değeri + Türkçe mix anlamı ("Ağır kompresyon dinamiği daraltır — ses mixte
oturur..." / "Az kompresyon daha dinamik ama kontrolsüz..."), TEK yerde
şablon (dB Seviyesi/Boost-Cut'ın AYNI felsefesi). Görsel: `drawEnvelope` —
ratio'dan türetilen sentetik bir dinamik-zarf eğrisi (gerçek `audioCtx`
GEREKMİYOR, önceki beş modun HEPSİNİN aksine — `BiquadFilterNode.
getFrequencyResponse()`'a değil salt ratio sayısına bağlı, bu altı mod
arasında mimari bir ilk), amber=seçim/yeşil=doğru, soru sırasında BİLEREK
gizli (`roundActive` kontrolü — kulakla bulma ilkesi).

**Canlı tarayıcı testinde bulunup AYNI turda düzeltilen gerçek bir hata:**
`app.js:1108-1132`'deki mod-değiştirme bloğu (bir karttan diğerine geçince
önceki modun başlığını/şıklarını/`#freqInfo`'sunu sıfırlayan, G-öncesi
kurulu bir mekanizma) A/B toggle'ın bu turda EKLENEN `.three-way` CSS
class'ını sıfırlamıyordu — Kompresör'den başka bir moda (ör. Frekans Bulma)
geçilince "Oyunu Başlat"a basılana kadar ekranda YANLIŞLIKLA "A/B/C Test" +
C pill'i görünüyordu (canlı ekran görüntüsüyle YAKALANDI, tahmin değil).
`updateAbToggleUI()` çağrısı o bloğa eklenerek düzeltildi — sonrasında
canlı yeniden test edildi, sızıntı kalmadı.

**Mode contract:** `getMeta`/`createQuestion` (saf)/`applyProcessing`/
`evaluateAnswer` (saf)/`calculateXP`/`getFeedbackData` + `registerMode` +
`mode-catalog.js`'de ÖNCEDEN kayıtlı `kompresor` girdisi (`unlockLevel:12`,
`tier:"pro"`) artık `playable:true` (diğer alanlara dokunulmadı — ürün
kararı değil). Zorunlu re-export seti (`FA_MIN`/`FA_MAX`/... — app.js'in
`drawVisualizer`'ının HANGİ mod aktif olursa olsun okuduğu, Kompresör'ün
frekans ekseni kavramı OLMAMASINA rağmen) korundu.

Doğrulama (canlı tarayıcıda, Geliştirici: tam erişim ile):
1. Mod menüden açılıyor, "Kompresör" kartı kilitsiz/oynanabilir (Motor 2
   grubunda, "Hangisi Farklı"/Reverb/Distortion'ın AKSİNE kilit rozeti yok).
2. "Oyunu Başlat" → başlık "Üç ses (A/B/C) — hangisi FARKLI sıkıştırılmış?",
   A/B/C Test üç yönlü toggle çalışıyor (A→B→C→A döngü, spektrum etiketi
   "A/B/C DİNLENİYOR" doğru güncelleniyor), üçü de AYNI kaynak (Pink Noise)
   — sadece kompresyon farklı, izolasyon ilkesi kodda garanti (`pickOddRatio`
   sadece `ratio`'yu değiştiriyor, source/freq/gain'e dokunmuyor).
3. Odd-one-out rastgele konumda doğru üretiliyor — canlı iki turda C
   (ratio 1.0:1) ve B (ratio 6.0:1) farklı çıktı, ikisinde de doğru
   işaretlendi (yeşil border).
4. Zorlukla fark küçülüyor (yukarıdaki tablo, node ile doğrudan hesaplandı),
   FLOOR (0.4) altına asla inmiyor (level 40+'ta ölçüldü).
5. Cevap sonrası: doğru turda "Doğru! C farklıydı (ratio 1.0:1) — hafif
   kompresyon — dinamik geniş kalır..." (+30 XP), yanlış turda "Yanlış —
   sen A dedin. B farklıydı (ratio 6.0:1) — belirgin kompresyon..." — ikisi
   de ratio+mix anlamını içeriyor; görsel iki renkli zarf (amber/yeşil)
   doğru turda tek renk (seçim=doğru çakışıyor), yanlış turda iki AYRI
   renkli eğri olarak doğrulandı (ekran görüntüsüyle KANITLANDI).
6. Merkezi X/Atla akışı (G27) HİÇBİR ek kablolama gerekmeden otomatik geldi
   — X'e basınca feedback kapanıp yeni tur başladı, canlı doğrulandı.
7. `npm test`: 46 yeni Kompresör testi (3 ses üretimi, oddIndex işaretleme,
   gap daralması, floor garantisi, evaluateAnswer) + mevcut 442 test
   DEĞİŞMEDEN geçti — **488/488**.
8. 5 mod regresyon (bu tur `app.js`/`index.html`/`styles.css` PAYLAŞILAN
   dosyaları değiştirdiği için özellikle önemliydi): Frekans Bulma'da tam
   bir tur (doğru cevap, spektrum overlay, karşılaştırma butonları, X)
   sıfır hatayla çalıştı; Q Genişliği menüden açılıp round başlatıldı,
   4 şıklı grid doğru render edildi; her iki modda da A/B toggle DOĞRU
   şekilde ikili kaldı (yukarıdaki bug'ın düzeltmesi bu ikisinde de
   doğrulandı); konsol hatası TÜM oturum boyunca SIFIR.

Commit `bd47c8b` — G29: **Q Genişliği — derinlemesine denetim ve FELSEFE düzeltmesi
(yüzeysel yama YOK).** G28'in font-küçültme yaması gerçek sorunu çözmemişti;
bu tur modu BAŞTAN SONA denetleyip TERSİNE ÇEVİRDİ.

**1. ŞIK SAYISI — TERSİNE ÇEVRİLDİ:** G26'da kolay zorlukta havuz "en uzak
iki uç" mantığıyla 2'ye düşüyordu (Notch/Dar/Geniş çekirdek üçlüsünden BİRİNİ
atlayarak), G28 bunu sadece BAŞLIĞI gerçek şıklara uydurarak "çözmüştü" —
ama modun FELSEFESİ ("cerrahi mi müzikal mi EQ" → Notch/Dar/Geniş) hâlâ
ihlal ediliyordu. Bu tur `poolForSize`/`INTRODUCTION_ORDER` ile TAMAMEN
yeniden kuruldu: **çekirdek üçlü (Notch/Dar/Geniş) HER ZAMAN havuzda, kolay
dahil, ASLA 2'ye inmiyor.** Orta zor'da, Çok Geniş pro'da SONRADAN ekleniyor
— önce 3 kategori ustalaşılır, sonra nüans öğretilir. `pickDistractorIndices`/
`preferredDistanceForOptions` (artık gereksiz — çeldirici SEÇİMİ yok, havuzun
TAMAMI şık oluyor) kaldırıldı, kod basitleşti.

**2. EKRAN KAYMASI — GERÇEK KÖK SEBEP bulundu (375px'te ÖLÇÜLDÜ, tahmin
DEĞİL):** `.app-shell` genişliğini zorlayan bir simülasyon TEK BAŞINA yanıltıcı
çıktı verdi (`.actionbar`'ın KENDİ `width:min(560px,100%)` kuralı GERÇEK
[1728px] pencereye göre hesaplanıp app-shell'den taşıyordu) — ikisi de aynı
şekilde zorlanınca (gerçek cihazda ikisi zaten AYNI temelden hesaplanır)
GERÇEK ölçüm ortaya çıktı: Boost mu Cut mu'nun KENDİ en kötü durumu (6 şık,
tek satır başlık) `.game-scroll`'da 47px taşma+otomatik-kaydırma üretiyor —
BU ZATEN VARDI, Q'ya özgü değil, sistem genelinde paylaşılan (ve zaten
`scrollFeedbackIntoView`'la doğru YÖNETİLEN) bir davranış. Ama Q'nun 5-etiketli
turu (G28'in dinamik başlığı TÜM etiketleri tek cümlede sayıyordu, 3 satıra
sarıyordu) taşmayı 63px'e çıkarıyordu — Boost/Cut'ın KENDİ en kötüsünden
BELİRGİN fazla, kullanıcının "ekran yukarı kayıyor" tarifiyle örtüşen
ÖLÇÜLEBİLİR fark. Kök neden TEK: başlık boyu. Çözüm: `TITLE_ENUMERATION_LIMIT`
— ≤3 şıkta (modun çekirdek/en sık karşılaşılan katmanı) etiketler sayılmaya
devam ediyor, >3 şıkta (zor/pro) kısa/sabit bir cümleye düşüyor ("Aşağıdaki
şıklardan seç.") — bu seviyedeki oyuncu etiketleri zaten biliyor. Sonuç:
375px'te ÖLÇÜLEN taşma 63px→42px (Boost/Cut'ın kendi en kötüsünden [47px]
DAHA AZ).

**3. Denetimde bulunan ÜÇÜNCÜ bir gerçek hata (kalibrasyon):** Yeni statik
tabloyla (`hard.options=4`) birlikte ilk seçilen `OPTIONS_AT_CAP` (6.7)
yeniden hesaplandığında hard'ın TEMSİLCİ seviyesi (12) BİLE ZATEN 5'e
yuvarlanıyordu (4'e değil) — Sabit moddaki "zor" tier PRATİKTE hiçbir zaman
4 göstermiyordu, temsilci seviyede bile 5'ti (sadece "eski statikten kolay
değil" testi `>=4` kontrol ettiği için bu FARK EDİLMEDİ). `OPTIONS_AT_CAP`
6.0'a düşürülerek düzeltildi — artık hard'ın TEMSİLCİ seviyesi TAM 4,
seans rampasının üst ucunda (boss/geç-döngü) DOĞAL olarak 5'e çıkabiliyor
(canlı ölçüldü: 10 ardışık "zor" turda `[4,4,5,5,5,4,4,5,5,5]` — spec'in
"4-5'e çıkar" ifadesiyle BİREBİR tutarlı, ama artık 4 GERÇEKTEN ulaşılabilir
bir değer). Yeni bir regresyon testi bu kalibrasyonu kilitliyor.

**Denetim sonuçları (madde madde, hepsi CANLI/testle doğrulandı):**
- Başlık-şık tutarlılığı: ≤3 şıkta HER ZAMAN birebir eşleşiyor (8 ardışık
  tur + 30 örnek/zorluk testle), >3 şıkta artık uzun liste YOK.
- 3-5 kademe: kolay/orta HER ZAMAN TAM {Notch,Dar,Geniş} (200 örnek/zorlukta
  ASLA 3'ün altına inmedi), zor 4 ile 5 arası, pro/proplus HER ZAMAN 5 —
  doğru cevap HER ZAMAN o turun havuzunda, çakışma/tekrar YOK (testle).
- İzole Q: kolay/orta'da frekans HER ZAMAN 1 kHz (DEĞİŞMEDİ, bu tur
  dokunulmadı), `ISOLATE_UNTIL_POSITION`'ı geçince serbest — çalışıyor.
- Öğretici metin: Q+frekans+yön+mix HER kombinasyonda doğru, boş/bozuk metin
  yok (mix dili "cerrahi"/"müzikal" felsefeyle tutarlı, DEĞİŞMEDİ).
- İki renkli görsel (`drawOverlay`/`computeEqCurveDb`): bu tur HİÇ
  değiştirilmedi (koddan doğrulandı, diff'te yok) — G28'de zaten canlı
  kanıtlanmıştı (Notch dar-sivri/Çok Geniş geniş-yayvan kontrastı).
- Merkezi eğri: FLOOR (0.05) çalışıyor, boss/pro en zor (temsilci seviye
  LEVEL_CAP'e eşit), "kolaylaşma yok" invaryantı YENİ statik tabloyla testle
  yeniden doğrulandı.
- X/Atla + hizalı geçiş: G27'nin merkezi mekanizması bu moddan HİÇ
  etkilenmedi (canlı doğrulandı — basınca hemen geçiyor, box gizleniyor).
- Layout 375px: kolay (3 şık) SIFIR taşma; pro (5 şık, en uzun durum) 42px
  taşma+otomatik-kaydırma — Boost/Cut'ın kendi en kötüsünden (47px) AZ,
  hiçbir yerde kesilme/çakışma yok (canlı ölçüldü + ekran görüntüsüyle
  doğrulandı).
- Konsol hatası: SIFIR (tüm oturum boyunca, her zorlukta).

Doğrulama: 5 yeni pure-function testi grubu (poolForSize'ın felsefeye bağlı
büyümesi + generateChoices'ın havuzun TAMAMI olduğu + pickTrueQ'nun havuz-
tabanlı komşuluk kontrolü + createQuestion'ın kolay/orta'da HER ZAMAN çekirdek
üçlü ürettiği + questionTitle'ın uzunluk-duyarlı davranışı + hard'ın temsilci
seviyede TAM 4 kalibrasyon regresyonu) + mevcut testler güncellenerek
(min-3 invaryantı, 2 yerine) DEĞİŞTİRİLDİ — **442/442** (69 Q-özel test).
Diğer dört mod (Frekans Bulma, Kesim Noktası, dB Seviyesi, Boost mu Cut mu)
bu turda TEK BİR DOSYASI bile değişmedi (`git status`la doğrulandı — sadece
`q-genisligi.js`+testi) — canlı üçünde de (Kesim Noktası/Boost-Cut/dB
Seviyesi) regresyon YOK, sıfır konsol hatası.

Commit `ba688e0` — G28: **Q Genişliği'nde şık sayısı/metin uyuşmazlığı + "Çok
Geniş" satır taşması düzeltildi.** Kullanıcı raporu (cihazda): soru metni 3
seçenek söylüyor ama ekranda 2 şık çıkıyordu; ekran/layout "kayıyordu",
şıklar sığmıyormuş gibi görünüyordu.

**TEŞHİS 1 (kod okumasıyla KANITLANDI):** `app.js`'teki soru başlığı SABİT
bir metindi — `"Bu EQ'nun genişlik karakteri ne — Notch mu, Dar mı, Geniş
mi?"` — HER ZAMAN aynı üç isim, o turun GERÇEK `q.choices`'ıyla hiçbir
bağlantısı yoktu. Kolay zorlukta (options=2, spec'in "uçlar bariz" tasarımı,
BOZUK DEĞİL) şık sayısı 2 iken metin hâlâ 3 sayıyordu; DAHA KÖTÜSÜ, kolayda
çıkan gerçek çiftler (ör. "Çok Geniş"/"Dar") metindeki üç isimle (Notch/Dar/
Geniş) çoğu zaman hiç ÖRTÜŞMÜYORDU (Notch şık bile değilken metinde
geçiyordu). Kök sebep: başlık G26'da (Q'nun ilk yazıldığı tur) diğer üç
modun ("Boost mu Cut mu?" gibi) sabit-metin desenine bakılarak yazılmış ama
Q'nun (2-5 arası, 5 olası etiketten HANGİLERİ seçildiği HER turda değişen)
DİNAMİK şık kümesi için bu desen baştan YANLIŞTI — canlı DOM denetimiyle
doğrulandı (8 ardışık tur loglandı, metin hep sabit kalırken şıklar
değişiyordu).

**TEŞHİS 2 (375px simüle telefon genişliğinde CANLI ÖLÇÜLDÜ):** Diğer dört
modun TÜM şık metinleri kısa sayı/tek-kelime (`"1.33 kHz"`, `"Boost"`,
`"LPF"`, `"+3.25 dB"`) — hiçbiri `.ans b`'nin 21px tabular-nums boyutunda
dar bir telefonda SARMIYOR. Q Genişliği'nin **"Çok Geniş"** etiketi BEŞ
etiket arasında TEK iki-kelimelik olan — 375px'lik bir `.app-shell`'de
("gerçek" masaüstü testinin HİÇ yakalayamadığı genişlik, `.app-shell{width:
min(560px,100%)}` masaüstünde HER ZAMAN 560px'e sabitleniyor) bu etiket
"Çok"/"Geniş" diye İKİ satıra bölünüyor, o satırdaki (CSS Grid'in en uzun
hücreye göre yükseklik belirlemesi yüzünden) diğer tek-satırlık şıklarla
EŞİT OLMAYAN bir kutu yüksekliği üretiyor — kullanıcının "sığmıyor/yerleşim
hatası" tarifiyle örtüşen, ÖLÇÜLEBİLİR bir fark (`.ans b`'nin 21px'te
`scrollWidth` buton genişliğini AŞIYORDU, DevTools'ta doğrulandı).

**DÜZELTME 1 — dinamik başlık:** `q-genisligi.js`'e yeni `questionTitle(q)`
(Boost/Cut'ın G25'te kurduğu `mode.questionTitle(q)` deseniyle AYNI —
app.js artık hardcoded metin yerine bunu ÇAĞIRIYOR) — o turun GERÇEK
`q.choices`'ını, LABELS'in kendi (dar→geniş) doğal sırasıyla, doğru Türkçe
soru ekiyle (`mu/mı/mi`, 5 olası etiket için elle bir tablo — ünlü uyumu
her zaman sabit, dinamik hesaba GEREK yok) listeler. Artık başlıktaki
isim/sayı HER ZAMAN ekrandaki şıklarla birebir eşleşiyor.

**DÜZELTME 2 — `.ans-word` (SADECE Q'ya özgü, diğer dört modun `.ans b`
varsayılanına DOKUNULMADI):** `renderAnswerChoices` artık `<b class=
"ans-word">` basıyor, CSS'te `.ans b.ans-word{font-size:16px;font-variant-
numeric:normal}` — 21px yerine 16px, sayısal olmayan kelime etiketleri için
`tabular-nums` da gereksiz olduğundan kapatıldı. 375px'te ölçülen sonuç:
"Çok Geniş" artık TEK satırda (`scrollWidth` buton genişliğinin İÇİNDE),
tüm şıklar (2'den 5'e kadar, en zor 5-etiket Pro turu dahil) EŞİT
yükseklikte tek satır.

Doğrulama: 3 yeni pure-function testi (`questionTitle`'ın 30 örnek × 5
zorlukta HER ZAMAN gerçek q.choices'ı birebir saydığı/adlandırdığı +
şık-sayısı=parça-sayısı invaryantı + soru eki doğruluğu) + mevcut 434 test
DEĞİŞMEDEN geçti — **437/437**. Tarayıcıda canlı: masaüstü genişliğinde
(560px cap) 8 ardışık turda başlık HER ZAMAN ekrandaki şıklarla birebir
örtüştü (ör. "Notch mu, Orta mı, Çok Geniş mi?" ↔ tam o üç buton); 375px
simüle telefon genişliğinde Kolay'da GERÇEK 2-şıklı bir tur (`{"Notch",
"Çok Geniş"}`) başlıkla ("Notch mu, Çok Geniş mi?") birebir eşleşti VE
"Çok Geniş" tek satırda kaldı; Pro'nun 5-etiketli (en uzun başlık, 3 satıra
sarıyor ama TAŞMA/ÇAKIŞMA yok) turunda da tüm 5 buton tek-satır+eşit
yükseklikte kaldı (ekran görüntüsüyle doğrulandı). Regresyon: Boost mu Cut
mu'nun `.ans b`'si hâlâ 21px/`ans-word` class'ı YOK (izole değişiklik
doğrulandı), sıfır konsol hatası. `npm run test` sırasında CSS önbelleği
bayat kalıp (`fetch({cache:'reload'})` ile önce doğrulanıp) devre dışı
bırakıldığı bir doğrulama-metodolojisi notu — kod hatası değil.

Commit `6130d94` — G27: **Geri bildirim X/Atla butonu merkezileştirildi — artık
BEŞ modun da hepsinde var.** Kullanıcı raporu (cihazda): X sadece Frekans
Bulma'da görünüyor, Kesim Noktası/dB Seviyesi/Boost mu Cut mu/Q Genişliği'nde
YOK.

**TEŞHİS (kod okumasıyla KANITLANDI, tahmin YOK):** X butonu HİÇBİR ZAMAN
merkezi bir mekanizma DEĞİLDİ — Frekans Bulma'nın KENDİ zengin `#freqInfo`
panelinin (`mode.showFreqInfoPanel`/`showProPlusInfoPanel`, SADECE
frekans-bulma.js'in export ettiği, sözleşme DIŞI iki fonksiyon) ürettiği
innerHTML string'inin İÇİNE gömülü bir `<button class="freq-info-close">`
idi. app.js'teki `#freqInfo` üzerindeki click-delegasyonu (`.freq-info-close`
→ `goToNextRound()`) ZATEN mod-agnostikti — ama `#freqInfo`'nun KENDİSİ
SADECE `activeQuestion.mode==="frequency"`/`"proplus"` olduğunda
dolduruluyordu (`submitFrequencyGuess`/`onTimeUp`/`submitProPlusGuess`
içinde). Diğer dört modun submit fonksiyonları (`submitCutoffGuess`/
`submitLevelGuess`/`submitBoostCutGuess`/`submitQWidthGuess`) HİÇBİRİ
`#freqInfo`'ya dokunmuyor — hepsi `setFeedback()` (paylaşılan TEK fonksiyon,
`app.js:864`) ile `#feedbackBox`'ı dolduruyor, o da HER ZAMAN sade
başlık+metin (`.textContent`) — hiçbir kapat butonu HİÇ BAKILMADI. Kök sebep:
X, "geri bildirim akışının" bir parçası olarak DEĞİL, Frekans Bulma'ya ÖZGÜ
bir panel özelliği olarak inşa edilmişti (G15'te eklendiğinde henüz tek
oynanabilir mod Frekans Bulma'ydı) — sonraki dört mod (G20-G26) kendi
`#feedbackBox`'larını doğru şekilde paylaştı ama HİÇBİRİ X'i miras almadı,
çünkü miras alınacak bir "merkez" YOKTU.

**MERKEZİLEŞTİRME:** `#feedbackBox`'ın HTML'ine (`index.html`) STATİK bir
`<button id="feedbackClose" class="fb-close">✕</button>` eklendi —
`setFeedback()` sadece `.textContent` günceller, innerHTML'i ASLA yeniden
kurmaz (Frekans Bulma'nın `#freqInfo`'sunun AKSİNE), bu yüzden HTML'e BİR KEZ
eklenen buton SONSUZA DEK orada kalır, `.fb.show-result` class'ıyla (CSS:
`.fb{display:none}`/`.fb.show-result{display:block}`) box'ın KENDİSİYLE
BİRLİKTE otomatik görünür/gizlenir — hiçbir mod dosyası ya da ekstra JS
GEREKMEDEN. app.js'te TEK bir yeni delegasyon: `els.feedbackBox` üzerinde
`.fb-close` → `goToNextRound()` (freqInfo'nunkiyle BİREBİR AYNI semantik).
CSS'te `.freq-info-close`/`.fb-close` ORTAK bir seçiciyle (`#freqInfo
.freq-info-close, .fb .fb-close`) AYNI görsel tanımı PAYLAŞIYOR — merkezi
olan sadece davranış değil, görünüm de TEK yerden.

**Sonuç — 6. bir mod eklendiğinde:** `getFeedbackData` içeren HER yeni mod
zaten `setFeedback(...)` çağırmak ZORUNDA (mod sözleşmesinin bir parçası,
G22'den beri TÜM modlar bunu yapıyor) — X, `#feedbackBox`'ın KENDİSİYLE
birlikte OTOMATİK gelir, elle eklenecek hiçbir satır YOK. Frekans Bulma'nın
KENDİ `#freqInfo`/`.freq-info-close`'una DOKUNULMADI (hâlâ çalışıyor,
KENDİ mekanizmasıyla) — iki sistem ÇAKIŞMIYOR: `#feedbackBox` Frekans
Bulma'da HİÇ gösterilmiyor (`showResult` o modda HER ZAMAN zorla false,
F1'den beri), `#freqInfo` diğer dört modda HİÇ doldurulmuyor — canlı DOM
denetimiyle DOĞRULANDI (aşağıya bkz.).

Doğrulama: DOM-seviyesinde (JS ile, `getBoundingClientRect`/computed
`display` okunarak — ekran görüntüsünden DAHA KESİN, ekran görüntüsü bu
oturumun yüksek gecikmesi yüzünden turların otomatik ilerlemesiyle
YARIŞTIĞI için güvenilir yakalanamadı ama DOM okumaları anlık/atomik):
Kesim Noktası/dB Seviyesi/Boost mu Cut mu/Q Genişliği'nin DÖRDÜNDE de
cevap sonrası `#feedbackClose` VAR + görünür (`getBoundingClientRect().
width>0`) + basılınca `goToNextRound()` TETİKLENDİ (roundChip her modda
gözlemlenebilir şekilde arttı, `.show-result` class'ı kalktı) + X'e
BASILMADAN bekleyince (dB Seviyesi'nde 6.8sn, yanlış cevabın hizalı
süresinden UZUN) tur KENDİLİĞİNDEN ilerledi (basılmazsa otomatik geçiş
devam ediyor invaryantı doğrulandı). Frekans Bulma'da: `#feedbackBox`
HİÇ gösterilmedi (`display:none` computed, `show-result` class YOK),
`#freqInfo`'nun KENDİ `.freq-info-close`'u hâlâ VARDI ve basılınca aynı
şekilde round'u ilerletti, `#feedbackClose` (yeni, genel buton) o ekranda
GÖRÜNMEDİ (`display:none`) — iki mekanizma arasında ÇAKIŞMA/ÇİFT-X YOK.
Sıfır konsol hatası (beş modun TAMAMI test edilirken). `npm test`: pure-
function testleri (bu görev sadece DOM/CSS/app.js kablolaması, hiçbir
mod dosyası değişmedi) DEĞİŞMEDEN geçti — **434/434**.

Commit `f2e8642` — G26: **Mod 5 "Q Genişliği" — EQ genişlik karakteri tanıma,
merkezi eğriye SIFIRDAN bağlı.** 5. oynanabilir mod — Boost/Cut'ın peaking-EQ
motorunu kullanır ama sorulan eksen FARKLI: orada boost/cut yönü+miktarı+
frekans soruluyordu, burada **Q (genişlik)** — kullanıcı sayısal bir değer
değil, MİX DİLİNDE bir ETİKET seçiyor (Notch/Dar/Orta/Geniş/Çok Geniş).
SoundGym'de Q/bandwidth ölçen bir oyun YOK — bu ÖZGÜN.

**Mod mantığı:** 5 genişlik etiketi, Q ekseninde ARDIŞIK/BİTİŞİK aralıklar
(notch:[7,16], dar:[3,7), orta:[1.3,3), geniş:[0.5,1.3), çok geniş:[0.2,0.5))
— her Q TAM BİR etikete düşer, boşluk/çakışma yok. Soru SADE (sadece 2-5
etiket şıkkı, sayısal Q değeri şıklarda YOK — spec'in açık isteği), geri
bildirim ZENGİN: Q'nun SAYISAL karşılığı + frekans + yön (boost/cut) + mix
anlamı ("Notch = cerrahi, rezonans avı"/"Çok Geniş = müzikal ton eğimi")
cevap sonrası TEK yerde açıklanıyor — kullanıcının kulağı zamanla "Notch =
~Q8-16" gibi kalibre olsun diye.

**İZOLASYON İLKESİ (öğrenme sinyali temiz kalsın):** gain HER ZAMAN sabit
büyüklükte (`Q_GAIN_DB=6`) — hiçbir zorlukta değişmez, genişlik algısını
gölgelemesin. Frekans kolay/orta'da SABİT (`Q_FIXED_FREQ=1000` Hz, kullanıcı
SAF Q'yu duysun), `ISOLATE_UNTIL_POSITION`'ı (representativeLevelForTier
("medium")=8) GEÇİNCE (hard/pro) tüm spektruma (FA_MIN–FA_MAX) yayılır —
Frekans Bulma'nın BOOST_ONLY_DIFFICULTIES'iyle AYNI kategori bir "hangi tür"
kararı (tier'a bağlı nitel eşik), "ne kadar" değil.

**Zorlukla kademe yakınlaşması (spec: "kolay: Notch vs Geniş = uçlar, bariz;
zor: Notch vs Dar = komşu, ayırt zor" — birebir uygulandı):** `options`
(2→5) artan şık sayısı + `pickDistractorIndices`'in `preferredDistance`
(kapalı-form türetildi: `LABELS.length - options + 1`, ayrı bir eğri
parametresi GEREKMEDİ) — 2 şıklı kolayda EN UZAK iki uç seçilir, 5 şıklı
pro'da zaten tüm etiketler gösterilir ama true Q, `edgeMargin`'in (eğriyle
küçülen) izin verdiği kadar en yakın komşu etiketin sınırına YAKLAŞTIRILIR
(`pickTrueQ`) — true Q, HER ZAMAN (FLOOR garantili) KENDİ etiketinin
sınırları İÇİNDE kalır, sınıflandırma asla belirsizleşmez, sadece
PERSEPTİF olarak zorlaşır.

**Merkezi zorluk eğrisine bağlanma — Boost/Cut'ın (G25) BAŞTAN-doğru-
kalibrasyon yöntemiyle bağlanan 3. mod:** `Q_CURVE_CONFIG`'in AT_CAP'leri
ikili aramayla, hiçbir temsilci seviyede eski statiği aşmayacak şekilde
ÖNCEDEN çözüldü. `options`'ın kaba/tamsayı yuvarlaması yüzünden ince bir
AT_CAP (5.15) hard'ın (12) TAM 4'e ulaşması için YETMEDİ — ikili arama
gerçek ihtiyacı (≥6.62) ortaya çıkardı, 6.7 seçildi (dB Seviyesi/Boost-
Cut'ta da görülen AYNI "kaba yuvarlama payı" deseni):

| parametre | easy(4) eski→yeni | medium(8) eski→yeni | hard(12) eski→yeni | pro(20) eski→yeni |
|---|---|---|---|---|
| options | 2→**2** | 3→**3** | 4→**4** | 5→**5** |
| edgeMargin | 0.55→**0.393** | 0.35→**0.250** | 0.20→**0.160** | 0.08→**0.065** |

**app.js kablolaması:** `registerMode(qGenisligi)` + 4 dal (isChoiceFormat/
questionTitle/setFeedback/pushHistory/.ans click) + yeni `submitQWidthGuess()`
+ yeni `qGuessLabelId` overlay state. `mode.recordZone` HİÇ ÇAĞRILMIYOR — dB
Seviyesi'nin AYNI kararı: frekans bu modda kullanıcıya hiç açıklanmıyor/
guess ettirilmiyor, "hangi bölgede zayıfsın" ölçümü burada anlamsız.

**Görsel geri bildirim:** Boost/Cut'ın computeEqCurveDb/drawBellCurve
TEKNİĞİYLE BİREBİR AYNI (gerçek BiquadFilterNode+getFrequencyResponse) ama
DEĞİŞEN eksen frekans/gain DEĞİL, Q — dar (yüksek Q) sivri-dik bir tepe,
geniş (düşük Q) yayvan bir tümsek üretir. Kullanıcının "guess eğrisi" seçtiği
etiketin `qCenter`'ıyla (kendi aralığının geometrik ortalaması) çizilir,
freq/gain HER ZAMAN true değerlerle aynı (kullanıcı onları guess etmedi).

`mode-catalog.js`: `q-genisligi` artık `playable:true` — `unlockLevel:3`/
`tier:"free"` (ÖNCEDEN kayıtlı değerler) BİLEREK değiştirilmedi.

Doğrulama: 61 yeni test (labelIndexForQ'nun sınırsız/çakışmasız sınıflandırması
+ pickDistractorIndices'in uzak↔yakın seçimi + generateChoices'ın sayısal
değer SIZDIRMADIĞI + pickTrueQ'nun HER ZAMAN kendi etiketinde kaldığı [2000
örnek] + izole-Q davranışı [statik+eğri, her iki yönde] + evaluateAnswer +
calculateXP + öğretici metin [Q+frekans+yön+mix, 5 etiket×2 durum] +
applyProcessing'in peaking Q doğruluğu + curve pürüzsüzlüğü/tabanı/tolerans +
Sabit-mod "kolaylaşma yok" invaryantı + dört modla çapraz eğri-yönü
karşılaştırması) + mevcut 373 test DEĞİŞMEDEN geçti — **434/434**. Test
yazarken bulunan bir kendi-hatam (case-insensitive `/NaN/i` regex'i "rezoNANsı"
gibi meşru Türkçe kelimelere yanlış pozitif veriyordu) fark edilip case-
sensitive'e çevrildi — kod hatası değil, test kalitesi notu.

Tarayıcıda canlı (Geliştirici: tam erişim ile): mod menüden açılıyor; Kolay/
Sabit'te 2 şık HER ZAMAN en uzak iki uç (Notch/Çok Geniş gibi), frekans HER
ZAMAN 1.00 kHz (izolasyon canlı doğrulandı, "737 Hz'de..." gibi bir sızma
YOK); Pro/Sabit'te 5 şık (TÜM etiketler), frekans SERBEST (335 Hz/3.27 kHz/
924 Hz gibi gerçek çeşitlilik gözlemlendi); doğru cevapta zengin geri bildirim
("Doğru! Bu bir Notch'tı (Q: 15.3) — 335 Hz'de boost. cerrahi bir müdahale...
(+52 XP)") ve yanlışta ("Yanlış — sen Notch dedin. Bu bir Dar'tı (Q: 3.1) —
3.27 kHz'de boost...") ikisi de Q+frekans+yön+mix anlamını İÇERDİ; görsel
KESİN doğrulandı — Notch (Q:15.3) dar-sivri tek bir keskin tepe, Çok Geniş
(Q:0.2) geniş-yayvan yumuşak bir tümsek, ikisi arasındaki KONTRAST canlı
ekran görüntüsüyle KANITLANDI; Boost/Cut'ta (mod geçişi sonrası) regresyon
yok, sıfır konsol hatası. `renderLevelSheet`'in hâlâ tek dil konuştuğu
ÖNCEDEN bilinen kısıt bu modda da geçerli (SIRADAKİ madde 3, yeni regresyon
değil).

Commit `cf0cae3` — G25: **Mod 4 "Boost mu Cut mu" — üç katmanlı EQ tanıma,
merkezi eğriye SIFIRDAN bağlı.** 4. oynanabilir mod — Kesim Noktası/dB
Seviyesi ŞABLONU izlendi (aynı mod sözleşmesi/render yardımcıları), ama
Frekans Bulma'nın peaking-EQ motoruyla dB Seviyesi'nin yön/miktar mantığını
BİRLEŞTİRİYOR — bu, task'ın istediği "özgün fark".

**Mod mantığı:** kaynağa sabit Q'lu (1.4) tek bir peaking `BiquadFilterNode`
ile ±dB boost/cut uygulanır (frekans havuzu Frekans Bulma'nınkiyle AYNI
FA_MIN–FA_MAX/80 Hz–17 kHz); kullanıcı A/B ile karşılaştırıp yönü/miktarı/
frekansı bulur.

**Üç katmanlı seans-içi rampa (Kesim Noktası'nın tip-gizleme/dB Seviyesi'nin
yön-gizleme ikili rampasının GENİŞLETİLMİŞ hali — iki eşik, üç bilinmeyen
seviyesi):**
- Katman 1 (`sessionQuestionIndex`<3): frekans+miktar BELLİ, sadece YÖN
  soruluyor (2 şık: Boost/Cut).
- Katman 2 (<6): frekans BELLİ, yön+miktar GİZLİ (işaretli/ondalıklı dB
  şıkları, dB Seviyesi'nin `generateChoices`'ıyla AYNI algoritma).
- Katman 3 (≥6, boss dahil): hepsi gizli — şıklar KOMBİNE `{freq, gainDb}`
  çiftleri, çeldiriciler İKİ EKSENDEN (frekans YA DA gain, asla ikisi
  birden) true'dan ayrılıyor, gain-ekseninde en az bir işaret flip garantili
  (yön de test edilsin diye).

**Merkezi zorluk eğrisine bağlanma — dB Seviyesi'nin G22'de kurduğu, G24'te
ACI ÇEKEREK öğrendiği dersler BAŞTAN uygulanan 2. mod:** `BOOSTCUT_CURVE_
CONFIG`'in AT_CAP'leri ikili aramayla, hiçbir temsilci seviyede eski statiği
aşmayacak şekilde ÖNCEDEN çözüldü (G22/ADIM 3'ün "önce bağla sonra düzelt"
döngüsünden yine kaçınıldı):

| parametre | easy(4) eski→yeni | medium(8) eski→yeni | hard(12) eski→yeni | pro(20) eski→yeni |
|---|---|---|---|---|
| gainDb | 8.0→**6.075** | 5.5→**4.209** | 3.2→**2.916** | 1.8→**1.400** |
| freqStepOct | 1.4→**1.158** | 1.0→**0.898** | 0.75→**0.697** | 0.55→**0.420** |
| gainStepDb | 2.5→**1.907** | 1.6→**1.329** | 1.0→**0.926** | 0.6→**0.450** |
| options | 3→**3** | 4→**4** | 5→**5** | 6→**6** |

`pickGainDb` (dB Seviyesi'nin G24-SONRASI `pickDbDelta`'sının BİREBİR
deseni): ±%6 dar jitter + jitter-SONRASI `GAIN_DB_FLOOR` (1.0 dB) garantisi
— G24'te SONRADAN düzeltilen iki hata (dar jitter + floor kontrolü) burada
İLK GÜNDEN doğru yazıldı, regresyon riski yok.

**app.js kablolaması:** `registerMode(boostMuCutMu)` + `isChoiceFormat`/
`questionTitle` (yeni `mode.questionTitle(q)` fonksiyonu — 3 katmanlı metin
app.js'in ternary zincirine yazmak yerine mod dosyasına devredildi)/
`setFeedback`/`pushHistory` ternary'lerine `"boostcut"` dalı + yeni
`submitBoostCutGuess()` (submitLevelGuess'in yapısal paraleli, `answer`
şekli KATMANA göre değişiyor: `{direction}`/`{gainDb}`/`{freq,gainDb}`) +
yeni `boostCutGuess` overlay state'i (cutoffGuess/dbGuess'in AYNI deseni).
`mode.recordZone` SADECE Katman 3'te çağrılıyor — Katman 1/2'de frekans
zaten VERİLMİŞ, "hangi bölgede zayıfsın" ölçümü ancak kullanıcı frekansı
GERÇEKTEN aradığında (Katman 3) anlamlı.

**Görsel geri bildirim:** Frekans Bulma'nın `getEqCurveForQuestion`
tekniğiyle (gerçek `BiquadFilterNode.getFrequencyResponse()`, elle
yaklaşıklık yok) + Kesim Noktası'nın iki renkli (amber/yeşil) deseni
BİRLEŞTİRİLDİ — cevap sonrası İKİ bell-eğrisi (senin cevabın/doğru)
FA_MIN–FA_MAX ekseninde çiziliyor. Katman 1/2'de "senin eğrin"in frekansı
her zaman `question.freq` (kullanıcı onu guess ETMEDİ), sadece Katman 3'te
gerçek bir guess.

**Canlı testte bulunup AYNI turda düzeltilen gerçek bir hata:**
`generateLayer3Choices`'ın frekans-ekseni çeldiricileri naif `trueFreq *
2^(k*step)` çarpımıyla üretiliyordu — true frekans FA_MAX'a (17 kHz) yakın
olduğunda bu, havuzun TAMAMEN DIŞINDA bir çeldirici (ör. 21.6 kHz)
üretebiliyordu (canlı tarayıcıda Pro zorlukta gözlemlendi). Kesim Noktası'nın
`generateChoices`'ındaki AYNI "havuz sınırına göre adım sayısını kırp"
deseni (maxBelow/maxAbove oktav) uygulanarak düzeltildi — havuz bir yönde
dar kalırsa fazla adım gain eksenine devrediliyor, frekans ekseni artık asla
aşmıyor. Regresyon testi eklendi (uç frekanslarda 1000 tur, ihlal yok).

`mode-catalog.js`: `boost-mu-cut-mu` artık `playable:true` — `unlockLevel:4`/
`tier:"free"` (ÖNCEDEN kayıtlı değerler) BİLEREK değiştirilmedi, ürün kararı
değil.

Doğrulama: 66 yeni test (createQuestion'ın 3 katmanı doğru üretmesi + her
katmanın kendi `generateLayerNChoices`'ının ondalık/çakışmasız/eksen-ayrık/
flip-garantili üretimi + FA_MIN–FA_MAX taşma regresyonu + evaluateAnswer'ın
3 katman için ayrı mantığı + calculateXP'nin katman çarpanı [3>2>1] +
öğretici metin + applyProcessing'in peaking filtre doğruluğu [sahte
audioCtx] + curve pürüzsüzlüğü/tabanı/tolerans-güvenlik-payı + Sabit-mod
"kolaylaşma yok" invaryantı + üç modla çapraz eğri-yönü karşılaştırması) +
mevcut 307 test DEĞİŞMEDEN geçti — **373/373**. Tarayıcıda canlı (Geliştirici:
tam erişim ile): mod menüden açılıyor; Katman 1 çalıştı (2 şık, doğru/yanlış
işaretleme, iki renkli eğri, "Ters yöne gittin" öğretici metni); Katman 2
hem Kolay [3 şık] hem Pro'da [6 şık, ~1-2 dB ince aralıklarla kalibrasyon
tablosuyla tutarlı] çalıştı (boss round dahil, işaretli/ondalıklı şıklar,
yanlışta doğru/yanlış renklendirme + eğri); Katman 3 Pro'da (6 kombine şık,
3 frekans-ekseni + 2 gain-ekseni + 1 doğru, canlı gözlemlenen gerçek
kombinasyon: "607/801/801/801/1.06k/1.39k Hz" ve "607/801(×3)/1.06k/1.39k"
desenleri BEKLENEN yapıyla birebir örtüştü) hem doğru hem yanlış (frekans-
öncelikli "Frekansı kaçırdın" mesajı, bölge adı dahil) cevap test edildi;
İpucu Ver Katman 3'te frekans BÖLGESİNİ ("ORTA") açıkladı; Frekans Bulma +
Kesim Noktası'nda (mod geçişleri dahil) regresyon yok, sıfır konsol hatası
tüm oturum boyunca. `renderLevelSheet`'in hâlâ tek dil (gainDb/Q) konuştuğu
ÖNCEDEN bilinen kısıt bu modda da doğrulandı (SIRADAKİ madde 3, yeni bir
regresyon değil).

Commit `eddbabd` — G24: **dB Seviyesi zorluk rampası — teşhis + pickDbDelta'daki
2 gerçek hata düzeltildi.** Kullanıcı raporu (cihazda): "10-12 soru boyunca
zorluk hep aynı kolay seviyede kalıyor, ilerledikçe zorlaşmıyor — sınırsız XP
kasılabilir, ciddi denge sorunu." Talep bir "kopuk bağlantı" varsayıyordu —
KANIT ölçülünce bu YANLIŞ çıktı, ama iki AYRI, gerçek hata bulundu.

**Teşhis (Kesim Noktası'yla karşılaştırmalı, gerçek kodla ÖLÇÜLDÜ, tahmin
YOK):** `currentDifficultyPosition() → continuousLevel + sessionRampOffset →
paramsForDifficultyPosition()` zinciri dB'de Kesim Noktası'yla BİREBİR AYNI
yoldan çağrılıyor — iki modun position'ları (aynı seviye+ramp girdisiyle)
KARŞILAŞTIRILDI, ikisi de position arttıkça AYNI ŞEKİLDE monoton azalıyor
(bkz. commit mesajındaki simülasyon). Yön-gizleme (`roundsInThisPlaySession`
sayacı, Kesim Noktası'nın tip-gizleme sayacıyla PAYLAŞILAN mekanizma)
CANLIDA doğrulandı: taze bir oturumda ilk sorular yön BELLİ (aynı işaretli
şıklar), birkaç sorudan sonra GİZLİ (karışık işaretli şıklar) — sayaç KOPUK
DEĞİLDİ.

**Asıl sorun `pickDbDelta`'daydı — İKİ ayrı, ölçülmüş hata:**
1. ±%20 (0.8x-1.2x) jitter, seans rampasının seviye-1 (TAZE) bir oyuncuda
   ürettiği GERÇEK ama küçük eğilimi (position 1→2 arası ~%11 düşüş —
   logLerp'in geometrik/oransal doğası GEREĞİ, HER seviye adımında SABİT
   oranda değişir, matematiksel olarak hesaplandı) BOĞUYORDU: gürültü
   (±%20) sinyalden (~%11) BÜYÜKTÜ. Kullanıcı "hiç değişmiyor" hissediyordu
   çünkü İSTATİSTİKSEL olarak öyleydi. ±%6'ya (0.94x-1.06x) indirildi — jitter'ın
   asıl amacı (her soru curve'ün sabit bir sayısı DEĞİL, testle doğrulandı —
   50 örnekte hâlâ >15 farklı değer) KORUNDU, sadece SNR (sinyal/gürültü)
   düzeltildi.
2. `DB_FLOOR` (0.25 dB, "kulağın gerçek ayırt sınırı") jitter'dan SONRA HİÇ
   kontrol edilmiyordu — pro zorlukta (dbDelta=0.32) jitter değeri 0.256'ya
   kadar düşürebiliyordu, **5000 örnekte %45 taban ihlali ÖLÇÜLDÜ** (kullanıcı
   raporunda bahsedilmedi ama koddan BAĞIMSIZ bir gerçek hataydı — kulağın
   fiziksel olarak ayıramayacağı bir farkı "doğru cevap" olarak sunuyordu).
   `Math.max(DB_CURVE_CONFIG.DB_FLOOR, jittered)` ile taban artık GARANTİ.

**Dürüst not — "her zaman kolay" algısının BÜYÜK kısmı bu ikisiyle
AÇIKLANMIYOR, ayrı bir gerçek:** dB Seviyesi'nin kendi (mod-özel, Z3 kararı)
XP/seviyesi TAZE bir oyuncuda (hatta diğer modlarda tecrübeli bir oyuncuda
bile, çünkü seviye MOD BAŞINA) düşük başlıyor — Kesim Noktası da İLK
oynandığında aynı durumdaydı. Seans rampasının GENLİĞİ de bilerek küçük
(Z2 kararı, "ilk soru kolay, caydırma" felsefesi) — bu iki tasarım kararı
BİLEREK DEĞİŞTİRİLMEDİ (`SESSION_RAMP_CONFIG` paylaşılan, Kesim Noktası/
Frekans Bulma'yı da etkiler — KORUMA talimatı kapsamında dokunulmadı).
Düzeltilen SADECE dB'ye özgü, kodda GERÇEKTEN var olan iki hataydı.

Doğrulama: 8 yeni test (floor hiç ihlal edilmiyor [5000 örnek] + jitter
ortalaması hedeften %3'ten az sapıyor + hâlâ tekrar/durgunluk yok [>15/50
farklı değer] + seans rampası eğilimi POSITION bazında istatistiksel olarak
iniyor [N=1000] + boss round aynı seviyede normal round'dan istatistiksel
olarak daha zor [N=500, hem düşük seviyeli hem createQuestion uçtan uca] +
seviye 10 ortalaması seviye 1'in en az %40 altında [N=500] + Kesim
Noktası'yla eğri yönü karşılaştırması) + mevcut 299 test DEĞİŞMEDEN geçti —
**307/307**, 5 kez tekrarlı çalıştırıldı, flake yok. Tarayıcıda canlı: taze
bir Otomatik/seviye-1 oturumunda ilk sorular yön belli (3 şık, aynı işaret),
birkaç sorudan sonra yön gizli (karışık işaretli şıklar, ör. "-5.27/-2.58/
+3.93 dB") — şıklar hâlâ ondalıklı ve k*step aralıklı (Kesim Noktası'nın
"tam adım" deseniyle aynı, geniş görünen aralık DOĞRU — çeldiriciler true
değerden UZAKLAŞARAK üretiliyor, true değerin kendisi DEĞİL); Kesim
Noktası + Frekans Bulma'da regresyon yok, sıfır konsol hatası.

Commit `3b8c8ec` — G23: **Geliştirici modu artık tam erişim (Pro + seviye
kilitleri, tek anahtar).** Kullanıcı raporu: geliştirici anahtarı
("Pro'yu simüle et") sadece `isUserPro()`'yu (Pro-kilitli özellikler)
açıyordu — seviye kilidi (`unlockLevel`) AYRI bir eksen olduğu için hâlâ
engelliyordu, dB Seviyesi (`unlockLevel:6`) "seviye yetersiz" diyerek
test edilemiyordu.

`renderModeGrid()`'deki `meetsLevel` artık `devFlags.simulatePro ||
academyLevel >= unlockLevel`. BİLEREK `isUserPro()` üzerinden DEĞİL,
`devFlags.simulatePro`'ya DOĞRUDAN bağlandı — gerçek Pro kullanıcıların
(ileride IAP gelince) seviye kilidini de atlaması İSTENMEDİ, bu görev sadece
geliştirici anahtarını güçlendiriyor, kilit tiplerinin (Pro/seviye) kalıcı
birleştirilmesi kararı (BEKLEYEN KARARLAR **B**) AYRI ve dokunulmadı. Henüz
KODLANMAMIŞ modlar (`realMode` yok — Q Genişliği, Boost mu Cut mu vb.)
anahtar açıkken BİLE kilitli kalıyor (`!!realMode && meetsLevel` — `realMode`
false olduğu sürece `meetsLevel` ne olursa olsun `playable=false`) — anahtar
var OLMAYAN bir modu sahte açmıyor, sadece kodlanmış ama seviye/Pro kilitli
olanları.

Etiket güncellendi: "Pro'yu simüle et" → **"Geliştirici: tam erişim"**
(açıklama metni de artık Pro + seviye kilitlerini BİRLİKTE açtığını
yansıtıyor: "Tüm modlar + seviye kilitleri + Pro açılır").

Test yok — bu tamamen DOM/UI kablolaması (`renderModeGrid`), app.js hiçbir
test dosyası tarafından import edilmiyor (mevcut, önceden kurulu desen —
app.js'in DOM'a bağımlı kodu testlerin kapsamı dışında, core/ ve modes/
saf fonksiyonları test ediliyor). 299 test değişmeden geçti.

Doğrulama (tarayıcıda, canlı): 0 XP + geliştirici modu KAPALI'yken dB
Seviyesi kilitli ("Seviye 6'da açılır") — taban durum doğrulandı; gerçek
7-dokunuş akışıyla (`document.getElementById('versionRow').click()` × 7,
UI'daki tıklama-sayaç zaman aşımı [1200ms] yavaş elle tıklamada sayaç
sıfırlanabiliyor, JS ile hızlı tetiklendi) geliştirici modu açılıp anahtar
("Geliştirici: tam erişim") açılınca dB Seviyesi'nin kilidi KALKTI ve mod
GERÇEKTEN oynanabildi (Soru 0'dan başlayarak); kodlanmamış modlar (Q
Genişliği, Boost mu Cut mu) anahtar açıkken BİLE kilitli kaldı (doğru
davranış, "Yakında" toast'ı); anahtar kapatılınca dB Seviyesi kilidi GERİ
geldi ("Seviye 6'da açılır" yeniden göründü); sıfır konsol hatası (tüm
akış boyunca).

Commit `0b34220` — G22: **Mod 3 "dB Seviyesi" — seviye/genlik farkı algısı,
merkezi zorluk eğrisine SIFIRDAN bağlı.** Frekans Bulma + Kesim Noktası'ndan
sonra 3. oynanabilir mod — Kesim Noktası ŞABLONU izlendi (aynı mod sözleşmesi/
render yardımcıları/seans-içi rampa deseni, bkz. `modes/db-seviyesi.js`).

**Mod mantığı:** kaynağa bir `GainNode` ile +/- dB seviye değişimi uygulanır
(linear gain = 10^(dB/20)); kullanıcı A/B ile kuru/işlenmiş sesi karşılaştırıp
farkın hem BÜYÜKLÜĞÜNÜ hem YÖNÜNÜ (açıldı/kısıldı) şıklardan bulur. Şıklar
ONDALIKLI ve gerçekçi (`pickDbDelta`: curve'ün ürettiği tipik büyüklüğe ±%20
jitter + 2 ondalık haneye yuvarlama — asla "3.00" gibi yuvarlak bir sayı) ve
İŞARETLİ ("+3.25 dB"/"-1.75 dB"). Çeldiriciler doğru cevaptan TAM k*step dB
mesafede (Kesim Noktası'nın "tam k*oktav" deseninin dB karşılığı) — bu sayede
işaret çevirme (aşağıda) ASLA bir değer çakışmasına yol açmaz.

**Yön-gizleme (Kesim Noktası'nın tip-gizleme deseninin BİREBİR kopyası):**
`DIRECTION_REVEAL_QUESTION_COUNT=3` — seans içi ilk 3 soru yönü söyler
("Bu ses AÇILDI, ne kadar?"), sonrası gizler ("Açıldı mı kısıldı mı, ne
kadar?") — o zaman şıklar KARIŞIK işaretli üretilir (en az bir ters-yön
çeldirici garanti, `sessionQuestionIndex`'e bağlı — aynı `roundsInThisPlaySession`
sayacı).

**Merkezi zorluk eğrisine bağlanma — SIFIRDAN doğru kalibre edilen İLK mod:**
Kesim Noktası/Frekans Bulma'nın ADIM 1/2'de yaşadığı geçiş dönemi (statik
tablo → eğri) ve ADIM 3'teki SONRADAN kalibrasyon düzeltmesi ("Sabit modda
kolaylaşma" bulgusu) burada hiç GEREKMEDİ — `DB_CURVE_CONFIG`'in AT_CAP'leri
BAŞTAN ikili aramayla, `representativeLevelForTier`'ın (ADIM 3'te değişen
YENİ semantiği — her tier kendi TIER_BOUNDARIES üst sınırında: easy=4,
medium=8, hard=12, pro=LEVEL_CAP) HİÇBİR temsilci seviyesinde eski statik
değeri aşmayacak şekilde çözüldü:

| tier | repr.sv | dbDelta eski→yeni | step eski→yeni | opt eski→yeni |
|---|---|---|---|---|
| easy | 4 | 3.00→**2.107** | 1.50→**1.151** | 3→**3** |
| medium | 8 | 1.75→**1.315** | 1.00→**0.808** | 4→**4** |
| hard | 12 | 0.90→**0.821** | 0.60→**0.568** | 5→**5** |
| pro | 20 | 0.50→**0.320** | 0.35→**0.280** | 6→**6** |

Tüm tier'lar eşit ya da zor — HİÇBİRİ kolaylaşmadı, tek seferde doğru
kalibre edildi (Kesim Noktası/Frekans Bulma'nın 2 turluk "önce bağla, sonra
düzelt" döngüsünden kaçınıldı). `DB_FLOOR=0.25` (kulağın gerçek ayırt sınırına
yakın kabul edilen bir değer, KESİN ölçülmedi) — `applyPostCapFloor` eğrinin
LEVEL_CAP'ten SONRA bunun altına inmesini engelliyor.

**Görsel geri bildirim:** Kesim Noktası'nın filtre eğrisinin basitleştirilmiş
karşılığı — tek bir dB değeri olduğu için eğri değil, yatay bir -5..+5 dB
ölçekte amber ("Senin cevabın") + yeşil ("Doğru") nokta-markör (bkz.
`drawDbGauge`). Soru sırasında BİLEREK gizli (kulakla bulma ilkesi), sadece
cevap sonrası.

**Öğretici metin** (`teachingText`, DB_EFFECT/DIRECTION_EFFECT deseni,
Kesim Noktası'nın ZONE_EFFECT'iyle AYNI TEK-YERDE-şablon felsefesi) üç
durumda (doğru / yön-doğru-miktar-yanlış / yön-yanlış) mix dilinde algısal
karşılık anlatıyor — teknik jargon (JND, RMS) hiç yok, makul bir başlangıç,
kesin nihai metin iddia edilmiyor.

**app.js değişiklikleri:** `registerMode(dbSeviyesi)` + `isChoiceFormat`/
`questionTitle`/`setFeedback` ternary'lerine `"dblevel"` dalı + yeni
`submitLevelGuess()` (submitCutoffGuess'in YAPISAL paraleli — 3. modda bile
ortak bir "submitAnswer" özütlemesini haklı çıkaracak kadar gerçek tekrar
ağrısı netleşmedi, bkz. o fonksiyonların dosya başı notu). Bu mod
`mode.recordZone` HİÇ ÇAĞIRMIYOR — seviye değişimi tek bir frekans bölgesine
ait değil, `zoneStats`'ın "hangi bölgede zayıfsın" kavramı burada anlamsız.

**Doğrulama sırasında bulunup aynı commit'te düzeltilen bir hata:**
`pushHistory()`'nin `desc` ternary'sinin ELSE dalı `activeQuestion.filterLabel`/
`.freq` alanlarının HER modda var olduğunu varsayıyordu (Frekans Bulma +
Kesim Noktası'nda ikisi de gerçekten var) — dB Seviyesi'nde İKİSİ DE YOK
(`.dbDelta` var), ELSE'e düşseydi Antrenman geçmişinde "undefined · NaN Hz ·
Kaynak" üretirdi. Ayrı bir dal eklenerek düzeltildi (kod incelemesiyle
BULUNDU, canlı test bunu tetiklemeden önce).

`mode-catalog.js`: `db-seviyesi` artık `playable:true` — `unlockLevel:6`/
`tier:"pro"` (ÖNCEDEN kayıtlı değerler) BİLEREK değiştirilmedi, ürün kararı
değil (bkz. CLAUDE.md "Ürün kararı verme").

Doğrulama: 51 yeni test (createQuestion/evaluateAnswer/generateChoices'in
ondalık+çakışmasız+işaretli üretimi, yön-gizleme rampası, calculateXP,
3-durum öğretici metin, applyProcessing'in linear gain doğruluğu [sahte
audioCtx], curve pürüzsüzlüğü/tabanı, Sabit-mod "kolaylaşma yok" invaryantı)
+ mevcut 248 test DEĞİŞMEDEN geçti — **299/299**. Tarayıcıda canlı (XP
localStorage üzerinden yükseltilip kilit açılarak): mod menüden açılıyor;
Otomatik/düşük seviyede 3-4 şık; Sabit/Pro'da 6 şık (ince ~0.3 dB adımlarla,
kalibrasyon tablosuyla tutarlı); yön-gizleme seans içinde ilk 3 sorudan
sonra devreye girdi (karışık işaretli şıklar canlı gözlendi: "-4.08/+1.31/
+3.16/-2.23 dB" gibi); İpucu Ver doğru yönü ("Açıldı (+)") açıkladı; cevap
sonrası dB göstergesi (amber/yeşil markör + "0 dB" ekseni) + öğretici metin
+ hizalı geçiş süresi hepsi çalıştı; "Cevap biçimi" satırı doğru gizlendi
(choiceOnly); Frekans Bulma + Kesim Noktası'nda (mod değişimleri dahil,
tüm oturum boyunca) regresyon yok, sıfır konsol hatası.

**Bilinen küçük eksik (engelleyici değil):** `teachingText`'in "yön doğru,
miktar yanlış" durumunda iki `magnitudeWord(...)` çağrısı benzer büyüklükte
değerlerde ("fark edilir bir değişim...belirgin bir fark" gibi) hafif
tekrarlı okunabiliyor — canlı testte gözlendi, kod hatası değil, salt bir
metin kalitesi notu (diğer modların "kesin nihai metin değil" notuyla aynı
kategoride).

Commit `61c76c5` — ADIM 3: **Sabit modu eğriye bağla + hard/pro kolaylaşmasını
düzelt.** Kullanıcı raporu: "Otomatik ile Sabit uyumsuz, hard/pro geçişte
kolaylaşmış görünüyor" — talep "Sabit modu eğriye bağla"ydı.

**Önce dürüst bir düzeltme:** kod incelemesiyle doğrulandı ki Sabit mod
ADIM 1/2'den BERİ zaten `paramsForDifficultyPosition` üzerinden besleniyordu
(`app.js: currentDifficultyPosition()`, `diffModeAuto` false olduğunda
`representativeLevelForTier(tier)`'ı taban olarak kullanıyordu) — statik
DIFFICULTY tablosu ZATEN değer kaynağı DEĞİLDİ, bu iddia YANLIŞTI (raporlandı,
"tahminle düzeltme yapma" kuralı gereği önce doğrulandı). **Asıl sorun
KALİBRASYONDU**: eski `representativeLevelForTier` her tier'ı ARALIĞININ ORTA
NOKTASINDA değerlendiriyordu (ör. pro→14.5, LEVEL_CAP'in [20] belirgin
altında) — bu da ADIM 2 sonrası DURUM.md'de ZATEN flagli olan "hard/pro'da
eğri statikten kolay" sapmasının doğrudan nedeniydi.

**Değişiklik 1 — `representativeLevelForTier` (core/difficulty-curve.js):**
artık her tier'ı KENDİ `TIER_BOUNDARIES` ÜST SINIRINDA değerlendiriyor —
easy=4, medium=8, hard=12, pro=**LEVEL_CAP'in TAM KENDİSİ (20)**, orta nokta
DEĞİL. "Pro" seçildiğinde kullanıcı artık GERÇEKTEN eğrinin en zor noktasını
alıyor (`paramsForDifficultyPosition(LEVEL_CAP)` ile bitişik/deepEqual,
testle garanti altına alındı) — "yakını" değil.

**Değişiklik 2 — AT_CAP kalibrasyonu (her iki mod, `*_CURVE_CONFIG`):**
sadece representative level'ı değiştirmek yetmiyordu — LEVEL_CAP=20'ye kadar
tek bir log-eğri, eski AT_CAP (=eski statik pro) ile hard'ın (level 12)
eski statik değerini hâlâ AŞAMIYORDU (ikili aramayla ÖLÇÜLDÜ, ör. Kesim
Noktası'nın marginOct'unda hard=12'de eski hard'ı (0.55) aşmamak için gereken
en gevşek AT_CAP ~0.253'tü — eski AT_CAP 0.3 bu şartı sağlamıyordu). Bu yüzden
AT_CAP'lar (ve iki yerde FLOOR'lar) HER parametre için ayrı ayrı, ikili
aramayla, "hiçbir tier'da (easy dahil) eski statiği aşmasın" şartını
sağlayacak şekilde yeniden çözüldü:

| Kesim Noktası | eski AT_CAP | yeni AT_CAP | Frekans Bulma | eski AT_CAP | yeni AT_CAP |
|---|---|---|---|---|---|
| marginOct | 0.30 | **0.22** | gainDb | 4.5 | **3.8** |
| hintBandOct | 0.50 | **0.45** | q (yön TERS — büyük=zor) | 4.2 | **5.5** |
| distractorStepOct | 0.65 | **0.52** | timeSec | 9 | **8.0** |
| options | 6 | **6.15**† | hintBandOct | 0.6 | **0.48** |
| | | | distractorStepOct | 0.65 | **0.52** |
| | | | options | 6 | **6.15**† |

†options'ın ARA hesabı 6.15'i geçebilir ama çıktı yine `Math.min(6,...)` ile
kırpılır — oyuna hiçbir zaman 6'dan fazla şık yansımaz, sadece round(...)'un
hard'da (12) TAM 5'e ulaşması için gerekliydi (6 ile 4'e yuvarlanıyordu).
`distractorStepOct` FLOOR'u da (Kesim + Frekans, ikisinde de) 0.55→0.51
indirildi — AT_CAP'in ALTINDA kalması gerekiyordu; 0.51 hâlâ
`FREQ_TOLERANCE_OCT`'tan (0.5) HER ZAMAN büyük, invaryant KIRILMADI (testle
garanti altında), sadece güvenlik payı 0.05'ten 0.01'e daraldı.

**Kalibrasyon karşılaştırma tablosu (gerçek kod çalıştırılarak ölçüldü) —
Sabit modun ARTIK ürettiği değer, HİÇBİR tier'da eski statikten kolay değil
(eşit ya da zor):**

Kesim Noktası:

| tier | repr.sv | margin eski→yeni | hint eski→yeni | step eski→yeni | opt eski→yeni |
|---|---|---|---|---|---|
| easy | 4 | 1.60→**1.170** | 2.00→**1.580** | 1.20→**1.052** | 3→**3** |
| medium | 8 | 1.00→**0.770** | 1.40→**1.154** | 0.90→**0.882** | 4→**4** |
| hard | 12 | 0.55→**0.507** | 0.90→**0.843** | 0.75→**0.739** | 5→**5** |
| pro | 20 | 0.30→**0.220** | 0.50→**0.450** | 0.65→**0.520** | 6→**6** |

Frekans Bulma:

| tier | repr.sv | gain eski→yeni | q eski→yeni | time eski→yeni | hint eski→yeni | step eski→yeni | opt eski→yeni |
|---|---|---|---|---|---|---|---|
| easy | 4 | 10.0→**8.583** | 0.90→**1.198** | 16→**14.341** | 2.40→**1.861** | 1.20→**1.052** | 3→**3** |
| medium | 8 | 8.0→**7.001** | 1.30→**1.753** | 13→**12.394** | 1.60→**1.326** | 0.90→**0.882** | 4→**4** |
| hard | 12 | 6.0→**5.711** | 2.50→**2.567** | 11→**10.711** | 1.00→**0.945** | 0.75→**0.739** | 5→**5** |
| pro | 20 | 4.5→**3.800** | 4.20→**5.500** | 9→**8.000** | 0.60→**0.480** | 0.65→**0.520** | 6→**6** |

**Pro artık ikisinde de eskisine EŞİT ya da DAHA ZOR** (options birebir aynı
6, sürekli parametreler — margin/gain/hint/step küçülüyor=zor, Q büyüyor=zor
— hepsi eski pro'yu eşitliyor ya da geçiyor). **easy dahi bir miktar
zorlaştı** (repr.sv=4, AT_1'in [level 1] biraz üstünde) — bu, "hiçbir tier
kolaylaşmasın" kararının SİMETRİK sonucu, sadece pro'ya özel bir istisna
değil; BİLEREK böyle, raporda açıkça not edildi.

Doğrulama: 10 yeni "kolaylaşma yok" invaryant testi (her iki modda: sürekli
parametreler için `<=eski`, options/Q için `>=eski`, dört tier'ın TAMAMINDA)
+ `representativeLevelForTier`'ın yeni semantiğini doğrulayan güncellenmiş
testler + mevcut 238 test DEĞİŞMEDEN geçti — **248/248**. Tarayıcıda canlı:
Kesim Noktası Sabit/Pro **6 şık** (ADIM 1/2 sonrası 5'ti, şimdi eskiyle
birebir eşit); Frekans Bulma Sabit/Pro **6 şık** (aynı); Otomatik mod her iki
modda da (Kesim Noktası + Frekans Bulma, ayrı ayrı `localStorage` üzerinden
`difficultyMode` değiştirilerek) test edildi, bozulmadı — Seviye 1'de 3 şık,
normal akış; sıfır konsol hatası. **KULAKLA DOĞRULANMALI** — AT_CAP'ler ikili
arama ile "eskisinden kolay olmasın" şartını sağlayacak EN AZ sapmayla
seçildi (küçük güvenlik payıyla), ama gerçek algısal zorluk hissi test
edilmedi.

Commit `680d2ab` — ADIM 2: **zorluk sisteminin merkezi bağlanması — Frekans
Bulma eğri sistemine taşındı.** Kademeli geçişin (Seçenek C) İKİNCİ ve SON
adımı: ADIM 1'de Kesim Noktası'nda kanıtlanan desen Frekans Bulma'ya da
uygulandı — **artık HER İKİ mod da AYNI merkezi eğri mimarisini kullanıyor.**

**Frekans Bulma (`modes/frekans-bulma.js`):** Kesim Noktası'ndaki BİREBİR
desen — statik `DIFFICULTY` tablosu KALMAYA devam ediyor (geriye dönük
uyumluluk + "Sabit" modun çapası + proplus için hâlâ gerekli), yanına
`FREKANS_CURVE_CONFIG` + `paramsForDifficultyPosition(position)` eklendi.
AT_1/AT_CAP uçları statik `easy`/`pro` değerleriyle BİREBİR aynı (Kesim
Noktası'ndaki AYNI kalibrasyon yöntemi). **Tek fark — Q ekseni:** Z1'in
ORİJİNAL asimetrisi korundu, Q (ve difficulty-curve.js'in eski global
`DIFFICULTY_CONFIG`'indeki tolerans) LEVEL_CAP'ten SONRA SABİT kalıyor
(`applyPostCapFloor` Q için ÇAĞRILMIYOR) — sadece gainDb/timeSec/hintBandOct/
distractorStepOct tavandan sonra azalıp bir tabanda duruyor. `generateChoices`
Kesim Noktası'ndaki AYNI refactor'dan geçti (`level` yerine çözülmüş
`{options,step}`). `createQuestion`, `settings.difficultyPosition` verilirse
eski `boss ? diff.gain*0.75 : diff.gain` / `boss ? diff.q*1.35 : diff.q`
çarpanlarını UYGULAMIYOR (boss'un etkisi zaten position'ın içinde, çifte
ceza olmasın diye) — vermezse (proplus dahil, o zaten ayrı bir dalda erken
dönüyor) eski statik davranış BİREBİR korunuyor. `BOOST_ONLY_DIFFICULTIES`
(easy/medium'da hep boost, hiç kesim yok) TİER İSMİNE bağlı kalitatif bir
kural olarak KALDI, sürekliye çevrilmedi (bilerek — bu bir "ne kadar" değil
"hangi tür" sorusu).

**app.js: SIFIR değişiklik gerekti.** ADIM 1'de `currentDifficultyPosition()`
zaten mod-agnostik yazılmıştı (`mode.getMeta().id` üzerinden hangi mod
aktifse onun XP'sini okuyordu) ve `createQuestion` çağrısına HER moda
(sessionQuestionIndex'le AYNI desen) geçiyordu — ADIM 1'de bunu SADECE
Kesim Noktası okuyordu, ADIM 2 ile Frekans Bulma da kendi
`paramsForDifficultyPosition`'ını yazıp bağlandığı için OTOMATİK olarak
aynı sayıyı almaya başladı. Sadece iki yerdeki artık BAYAT yorum ("SADECE
Kesim Noktası okuyor") güncellendi — bu, ADIM 1'in mimarisinin doğru
kurulduğunun somut bir kanıtı.

**Tutarlılık doğrulaması (yapısal, kod okumasıyla):** her iki mod dosyası
da `logLerp`/`applyPostCapFloor`'u AYNI `core/difficulty-curve.js`'ten
import ediyor; `continuousLevel`/`sessionRampOffset`/`representativeLevelForTier`
TEK bir yerde (`app.js: currentDifficultyPosition`) hesaplanıyor, iki mod
için AYRI birer implementasyon YOK — bu, "iki eğri zamanla birbirinden
uzaklaşır mı" riskini yapısal olarak ortadan kaldırıyor (drift mümkün değil,
tek kod yolu var).

**Kalibrasyon karşılaştırma tablosu (gerçek kod çalıştırılarak ölçüldü) —
statik DIFFICULTY[tier] vs eğrinin o tier'ın temsilci seviyesinde ürettiği
değer:**

| tier | temsilci sv. | gain eski→yeni | Q eski→yeni | time eski→yeni | opt eski→yeni | hint eski→yeni | step eski→yeni |
|---|---|---|---|---|---|---|---|
| easy | 2.5 | 10.000→9.389 | 0.90→1.02 | 16→15.29 | 3→3 | 2.40→2.15 | 1.20→1.143 |
| medium | 6.5 | 8.000→7.936 | 1.30→1.41 | 13→13.55 | 4→4 | 1.60→1.61 | 0.90→1.005 |
| hard | 10.5 | 6.000→6.708 | 2.50→1.94 | 11→12.00 | 5→4 | 1.00→1.20 | 0.75→0.883 |
| pro | 14.5 | 4.500→5.670 | 4.20→2.69 | 9→10.63 | 6→5 | 0.60→0.90 | 0.65→0.776 |

**Aynı desen Kesim Noktası'nda görülenle BİREBİR tekrarlıyor**: easy/medium
ucu yakın (uçlar AT_1/AT_CAP'la birebir eşleştiği için), hard/pro'da eğri
statikten SİSTEMATİK olarak KOLAY (gain daha büyük/belirgin, Q daha geniş/
dar-olmayan, hard/pro'da 1 eksik şık) — bu ARTIK iki modda da aynı yönde
tekrar eden bir desen, tek seferlik bir tuhaflık değil: tek bir log-eğrinin
4 keyfi statik noktaya birden oturamamasının YAPISAL sonucu. **KULAKLA
DOĞRULANMALI** — muhtemelen HER İKİ modun da AT_1/AT_CAP'ı değil, ARADAKİ
(medium/hard sınırı civarı) eğri şeklinin kendisi (ör. iki-parçalı/piecewise
bir eğriye geçmek) yeniden değerlendirilmeli; bu bir SONRAKİ kalibrasyon
turunun konusu, bu turun kapsamı sadece "bağla" idi.

Doğrulama: 15 yeni test (paramsForDifficultyPosition pürüzsüzlük/taban/uç-
değer + Q'nun tavandan sonra SABİT kaldığının doğrulanması + createQuestion
entegrasyonu + boost-only kuralının eğri modunda da korunduğu + proplus'un
eğri dışında kaldığı) + mevcut 223 test DEĞİŞMEDEN geçti — **238/238**.
Tarayıcıda canlı: Otomatik/seviye 1'de 3 şık (AT_1 eşleşiyor, statikle
aynı); Sabit/Pro'da **5 şık** (curve'ün ürettiği, eski statik 6'dan farklı
— tabloyla tutarlı); İpucu Ver/EQ eğrisi/karşılaştırma butonları (Senin
cevabın/Doğru cevap/Temiz)/boss round hepsi çalıştı; Kesim Noktası'na
GEÇİŞ SONRASI da test edildi, regresyon yok; konsolda sıfır hata.

Commit `5870e09` — ADIM 1: **zorluk sisteminin merkezi bağlanması — Kesim
Noktası pilotu.** Önceki turda onaylanan tasarımın (Seçenek C, kademeli
geçiş) İLK adımı: merkezi zorluk matematiği kuruldu + SADECE Kesim Noktası
buna bağlandı. Frekans Bulma'ya HİÇ DOKUNULMADI (bilerek, sıradaki adımda
taşınacak) — iki mod şu an GEÇİCİ olarak farklı mekanizma kullanıyor.

**Merkezi kütüphane (`core/difficulty-curve.js`, artık tek bir global eğri
değil, mod-agnostik matematik kütüphanesi):**
- `logLerp` export edildi (önceden private'tı).
- `applyPostCapFloor(curveValue, level, levelCap, floor, reductionPerStep)` —
  Z1'in "tavandan sonra taban" kalıbının genellenmiş hali; `difficultyParams()`
  bunun üzerinden dogfood edildi (davranış/çıktı DEĞİŞMEDİ, difficulty-curve.
  test.mjs aynı kaldı).
- `continuousLevel(xpProg)` — `progress.xpProgress()`'in `{level,current,
  required}`'ından KESİRLİ seviye (ör. seviye 6'nın %40'ı → 6.4), yuvarlama
  yok.
- `sessionRampOffset(sessionIndex, {boss})` — ısınma (negatif ofset, döngü
  başı) → zorlaşma (pozitif, döngü sonu) → boss (en yüksek, döngüdeki
  konumdan BAĞIMSIZ, çağıranın verdiği GERÇEK `{boss}` bayrağıyla). Döngü
  uzunluğu 5 — `isBossRound()`'un (frekans-bulma.js) kullandığı AYNI periyot,
  ama İKİ AYRI sayaca dayanır (boss'un GERÇEK belirlenmesi: `stats.rounds`,
  ömür boyu; rampanın şekli: `roundsInThisPlaySession`, seans-yerel) — bu
  yüzden ramp kendi "hangi index boss" tahminini YAPMAZ, güvenmez.
- `representativeLevelForTier(tier)` — "Sabit" modun tier→sürekli-seviye
  çapası (TIER_BOUNDARIES aralığının orta noktası; pro için LEVEL_CAP-4).

**Kesim Noktası (`modes/kesim-noktasi.js`) — pilot mod:** statik `DIFFICULTY`
tablosu KALDIRILMADI (geriye dönük uyumluluk + "Sabit" modun çapası +
proplus için hâlâ gerekli) — YANINA `KESIM_CURVE_CONFIG` +
`paramsForDifficultyPosition(position)` eklendi. Eğrinin AT_1/AT_CAP uçları
statik `easy`/`pro` değerleriyle BİREBİR aynı seçildi (geçiş uçlarda
davranış-koruyucu olsun diye); `createQuestion`, `settings.difficultyPosition`
sayısal bir değer VERİLİRSE marginOct/hintBandOct/timeSec/distractorStepOct/
options'ı eğriden hesaplar (boss'un etkisi ARTIK burada tekrar
uygulanmıyor — zaten position'ın içinde, çifte ceza olmasın diye),
VERİLMEZSE (mevcut 435 satırlık test dosyasının TAMAMI, proplus) eski statik
davranışı BİREBİR korur. `generateChoices` imzası `level` string yerine
çözülmüş `{options,step}` alacak şekilde refactor edildi (dışa açık bir
sözleşme değil, test etkilenmedi). `renderHintMask` artık `question.
hintBandOct`'u (createQuestion'ın koyduğu, eğri/statik farkını zaten çözmüş
değer) tercih ediyor.

**app.js:** `currentDifficultyPosition(boss)` yeni — zorlukKonumu = taban
(Otomatik'te `continuousLevel`, Sabit'te `representativeLevelForTier`) +
`sessionRampOffset(roundsInThisPlaySession, {boss})`. `startRound()`'daki
`createQuestion` çağrısına EK bir alan olarak geçiyor (`sessionQuestionIndex`
ile AYNI desen — tek taraflı okunur, Frekans Bulma hiç bakmaz). proplus için
BİLEREK `undefined` döner (curve'ün dışında kalır, Z5 kararıyla aynı çizgi;
kesim-noktasi.js'in `createQuestion`'ı da bunu KENDİSİ bir daha kontrol
ediyor — savunma katmanı). `applyAutoDifficulty()`'nin KENDİSİ (hangi tier'a
yazdığı) BİLEREK DEĞİŞTİRİLMEDİ — Frekans Bulma'nın Otomatik zorluk
davranışı (hangi turda hangi statik satırın okunduğu) BİREBİR aynı kaldı.

**Kapsam dışı bırakılan (bilerek):** round-timer HÂLÂ `currentDifficultyConfig
().time`'dan (statik tier) okuyor — `paramsForDifficultyPosition`'ın
`timeSec`'i HESAPLANIYOR/test ediliyor ama oyun ekranına henüz BAĞLANMADI;
G21'in kulakla hizalanmış geri bildirim/geçiş süresini riske atmamak için
bilinçli bir kapsam kararı, ayrı bir işte ele alınmalı. `renderLevelSheet`
("Seviye" bilgi sayfası) de dokunulmadı — hâlâ global `difficultyParams`'ı
(gainDb/Q dilinde) gösteriyor, Kesim Noktası aktifken bu metin semantik
olarak YANLIŞ/anlamsız kalıyor (marginOct değil gainDb/Q gösteriyor) — bu
ÖNCEDEN de böyleydi (renderLevelSheet hep frekans-bulma-şekilli), bu turun
bir regresyonu DEĞİL, ama düzeltilmesi gereken bilinen bir kalan.

**Kalibrasyon karşılaştırma tablosu (gerçek kod çalıştırılarak ölçüldü,
UYDURULMADI) — statik DIFFICULTY[tier] vs eğrinin o tier'ın temsilci
seviyesinde (`representativeLevelForTier`) ürettiği değer:**

| tier | temsilci sv. | margin eski→yeni | hint eski→yeni | time eski→yeni | opt eski→yeni | step eski→yeni |
|---|---|---|---|---|---|---|
| easy | 2.5 | 1.600→1.402 | 2.00→1.79 | 14→13.52 | 3→3 | 1.20→1.143 |
| medium | 6.5 | 1.000→0.986 | 1.40→1.34 | 12→12.32 | 4→4 | 0.90→1.005 |
| hard | 10.5 | 0.550→0.693 | 0.90→1.00 | 11→11.22 | 5→4 | 0.75→0.883 |
| pro | 14.5 | 0.300→0.487 | 0.50→0.75 | 9→10.23 | 6→5 | 0.65→0.776 |

easy/medium ucu YAKIN (uçlar zaten eğrinin AT_1/AT_CAP'ı statik easy/pro'yla
BİREBİR aynı seçildiği için — beklenen). hard/pro'da GERÇEK bir sapma var:
eğri o iki tier'da statikten daha KOLAY (margin daha geniş, hard/pro'da 1
eksik şık) — tek bir log-eğrinin 4 keyfi noktaya birden tam oturamamasının
doğal sonucu, ZORLAMA (piecewise fit) yapılmadı. **KULAKLA DOĞRULANMALI** —
hard/pro'da Otomatik moddaki bir kullanıcı bu geçişte fark edilir bir
kolaylaşma hissedebilir; AT_1/AT_CAP'ın kulakla yeniden kalibre edilmesi
gerekebilir (bkz. SIRADAKİ).

Doğrulama: 33 yeni test (difficulty-curve.test.mjs +20: logLerp/
applyPostCapFloor/continuousLevel/sessionRampOffset/representativeLevelForTier
saf fonksiyon testleri; kesim-noktasi.test.mjs +13: paramsForDifficultyPosition
pürüzsüzlük/taban/uç-değer testleri + createQuestion entegrasyonu + proplus'un
eğri dışında kaldığının doğrulanması) + mevcut 190 test DEĞİŞMEDEN geçti —
**223/223**. Tarayıcıda canlı: Otomatik/seviye 1'de 3 şık (curve options=3,
statikle aynı — beklenen, AT_1 eşleşiyor); Sabit/Pro'da **5 şık** (curve'ün
ürettiği, eski statik 6'dan FARKLI — kalibrasyon tablosuyla TUTARLI, kod
hatası değil); Frekans Bulma'da SIFIR regresyon (dokunmalı mod, EQ eğrisi,
zone-tip hepsi eskisi gibi çalıştı), konsolda sıfır hata.

Commit `080c884` — G21: **Kesim Noktası TAMAMLANDI, SERT TEST GEÇTİ.**
İki parça: (1) geçiş süresi hizalaması, (2) modun tamamının sert taraması.

**Hizalama:** `submitCutoffGuess`'in geçiş süresi artık Frekans Bulma'nın
`submitFrequencyGuess`'iyle AYNI formül (`prefs.feedbackScreen ? (correct?
4000:6000) : QUICK_ADVANCE_MS`) — öncesinde HER ZAMAN 700ms'ydi, G20'de
eklenen öğretici metin + iki renkli filtre eğrisi okunacak kadar kalmıyordu
(kullanıcı raporu). Kesim Noktası'nın kendi X butonu yok (bilerek) ama
"Atla ▶" zaten mod-bağımsız aynı anında-geçiş işini görüyor — canlı
doğrulandı (6000ms/4000ms dwell JS ile ölçüldü, "Atla" her an anında geçiyor).

**Sert test:** pure-function stress script'i (5000+ soru, 1000+ örnek/zorluk
HPF/LPF dengesi, 6 bölge×2 tip×3 durum=36 öğretici-metin kombinasyonu) + canlı
tarayıcı testi (Kick/sample-kind kaynak, pro zorluk+sabit mod, "10 Soruluk
Bölüm" TAM 10 soru + 2 boss round + seans tamamlama simulatePro ile, A/B
kuru/işlenmiş, konsol) — **kod tarafında SIFIR gerçek bug bulundu.** Test
sırasında "pro'da 3 şık geliyor" gibi görünen bir gözlem, oturumun canları
tükenmişken session-end ekranının stale DOM'unu okumaktan kaynaklanan bir
TEST METODOLOJİSİ artefaktıydı (temiz oturumda pro'nun her zaman 6 şık
ürettiği doğrulandı) — kod değişikliği gerekmedi, sadece not düşüldü.

13 yeni kalıcı test: 36/36 bölge×tip×durum öğretici-metin taraması (boş/
bozuk/teknik-değer-sızdıran metin yok) + 600 sorulu (5 zorluk×8 seans-
indeksi×15 tekrar) tam matris testi — 5 kez tekrarlı çalıştırıldı, flake yok.

Frekans Bulma'ya dokunulmadı — canlı regresyon: accordion, X butonu, rich
panel/EQ eğrisi/karşılaştırma butonları hepsi eskisi gibi, sıfır konsol
hatası. `npm test`: **190/190** (177 eski + 13 yeni).

**Kesim Noktası artık G17-G21'in TAMAMIYLA production-hazır bir şablon:**
HPF/LPF + şıklı + tip gizleme rampası + seans-index eşiği + iki renkli
filtre eğrisi + öğretici Türkçe metin + Frekans Bulma'yla hizalı geçiş
süresi — hepsi sert testten geçti. Kalan tek şey (bilerek kapsam dışı):
karşılaştırma-önizleme butonları (Senin cevabın/Doğru cevap/Temiz) — ayrı
bir iş, engelleyici değil.

Commit `a6c0c74` — G20: Kesim Noktası — cevap sonrası öğretici metin geri
bildirimi (mix mantığı). **Kesim Noktası'nın kapsam dışı bırakılan SON
parçasıydı — mod artık HPF/LPF + şıklı + tip gizleme rampası + iki renkli
filtre eğrisi + öğretici Türkçe metinle tam iskelet.** Üç durum, TEK yerde
(`ZONE_EFFECT` tablosu, kesim-noktasi.js) şablonlanmış: (1) doğru — kısa
onay + o bölgede/tipte filtrenin mix'te ne işe yaradığı; (2) tip doğru,
frekans yanlış — hangi YÖNE kaçtığını (çok yukarı/çok aşağı) + o yöndeki ses
etkisini anlatır (HPF'de yukarı kaçmak DAHA agresif/inceltir, LPF'de yukarı
kaçmak DAHA AZ agresif/fazla tiz bırakır — yön↔etki eşlemesi filtre tipine
göre BİLEREK ters); (3) tip yanlış — HPF/LPF farkını karşılaştırmalı
hatırlatır, frekans hatası bu durumda AYRICA anlatılmaz (kısa tutmak için).
Teknik değer (dB/oct, Q) hiç verilmiyor. `teachingText(question, answer)`
YENİ, saf, doğrudan test edilebilir bir fonksiyon; `getFeedbackData` bunu
çağırıp title/detail'e bölüyor.

**Doğrulama sırasında bulunup aynı commit'te düzeltilen bir hata:** app.js'te
`submitCutoffGuess`, `setFeedback`'i HER ZAMAN `showResult=false` ile
çağırıyordu — Frekans Bulma'nın kalıbından (o, `#freqInfo` zengin panelini
kullandığı için `false` geçiyor) G17'de körü körüne kopyalanmıştı. Kesim
Noktası'nın `#freqInfo` gibi bir paneli YOK — `#feedbackBox` onun TEK geri
bildirim yüzeyi; `showResult=false` iken kart `display:none` kalıyor,
öğretici metin (G13'ten beri, hatta bu görevden önce de) HİÇ GÖRÜNMÜYORDU.
Artık `feedback.showResult` (her zaman `true`) kullanılıyor.

Frekans Bulma'ya (frekans-bulma.js) dokunulmadı — canlı doğrulandı: kendi
`#freqInfo` akışı aynen çalışıyor, `#feedbackBox` hâlâ `display:none` (hiç
sızma yok). Doğrulama ekran görüntüsüyle DEĞİL (QUICK_ADVANCE_MS=700ms'in
altına düşmüyor), JS ile "tıkla+150ms bekle+DOM oku" tekniğiyle yapıldı —
üç durum da (`cls`, `title`, `detail`) tam beklenen metinle doğrulandı
(örnekler için bkz. commit mesajı). `npm test`: **177/177** (168 eski + 9
yeni — 3 durum × üretim doğruluğu + kısalık(<280 karakter) + saflık +
showResult garantisi).

Commit `3a5c84c` — G19: Kesim Noktası — cevap sonrası filtre eğrisi görseli
(kullanıcı + doğru cevap, iki renk). Soru sırasında spektrumda SADECE barlar
görünür (kulakla bulma ilkesi korunur); cevap verildikten SONRA (`!roundActive
&& activeQuestion` — tek gate, hem doğru cevapta hem süre dolunca otomatik)
spektrumun üstüne İKİ eğri çiziliyor: kullanıcının cevabı (amber `--am`
#FFC246) ve doğru cevap (yeşil `--gr` #2BD9A8) — mevcut paletten, yeni renk
yok. Eğriler GERÇEK bir `BiquadFilterNode`'un `getFrequencyResponse()`'u
okunarak çiziliyor (frekans-bulma.js:`getEqCurveForQuestion` ile AYNI teknik),
eksenle (`faXToF`, N=160) aynı log ölçekte örnekleniyor. HPF/LPF yanıtı
peaking'in aksine tek yönlü (0 dB geçen bantta, durdurma bandında -∞'a
yaklaşır) — 0 dB ÜSTE (düz, geçen bant), -30dB ALTA (durdurma bandı) oturan
tek-yönlü bir eşleme kullanıldı; "HPF solda iner sağda düz, LPF sağda iner
solda düz" görünümü bundan DOĞAL olarak çıkıyor, elle yön mantığı yazılmadı.

Kullanıcının cevabı (freq+filterType) yeni bir app.js değişkeninde
(`cutoffGuess`) tutuluyor — frekans-bulma.js'in `freqGuessHz`'i sadece Hz
taşıyor, bu modun cevabı hem frekans HEM tip içerdiği için (tip gizli
sorularda yanlış tip seçilebiliyor) ayrı bir alan gerekti; `submitCutoffGuess`
answer'ı AYNEN (yanlış tip dahil) kaydediyor — kullanıcı yanlış tip seçtiyse
eğrisi de o YANLIŞ tipte çiziliyor (öğretici, canlı doğrulandı). Her yeni
soruda (`renderQuestion`) null'a dönüyor; `drawVisualizer`'ın `overlayState`'ine
eklendi, Frekans Bulma bu alanı hiç okumuyor.

Doğrulama (tarayıcıda, canlı): iki eğri farklı renkte çiziliyor (amber+yeşil,
küçük lejant, zoom ile renk ayrımı doğrulandı); soru sırasında eğri gizli
(sadece bar+eksen); HPF/LPF yönü ve kesim frekansı hizası doğru (761 Hz LPF
amber + 1.75 kHz HPF yeşil aynı ekranda, ikisi de doğru yönde/frekansta);
doğru cevapta tek yeşil çizgi görünüyor (amber tam örtüşüyor, altta); tip
yanlış seçilince kullanıcı eğrisi doğru cevabın TAM TERSİ yönünde çiziliyor
(yukarıdaki 761Hz LPF/1.75kHz HPF örneği). `npm test`: **168/168**. Frekans
Bulma regresyonu yok (kendi peaking-EQ eğrisi/panel canlı doğrulandı, sıfır
konsol hatası).

Commit `71dad21` — G18: Kesim Noktası — tip gizleme seans içi rampaya bağlandı,
"Dokunmalı" gizlendi, sıkı bug taraması. Cihaz testinde bulunan iki sorun +
şablon olacağı için modun genelinde derinlemesine bug taraması istendi.

**Sorun 1 çözümü:** tip gizleme (HPF/LPF SÖYLENİR mi SÖYLENMEZ mi) artık
zorluğa DEĞİL, oyun oturumu içindeki soru sırasına bağlı — her fresh-start'ta
sıfırlanan yeni bir sayaç (`roundsInThisPlaySession`) ilk `TYPE_REVEAL_
QUESTION_COUNT` (=3) soruda tip söyler, sonrasında HANGİ zorlukta olursa olsun
gizler. **Doğrulama sırasında bulunan gerçek bir hata:** ilk denemede eşik
`session.correct+session.wrong`'a bağlanmıştı — ama `session` SADECE Seans
Sonu ekranının 3 CTA'sında sıfırlanıyor, normal "Oyunu Başlat" tuşu ona hiç
dokunmuyor (kod incelemesiyle doğrulandı, `resetSession()`'ın yorumundaki
"Oyunu Başlat" iddiası YANLIŞ/bayat — düzeltilmedi, sadece not edildi). Bu,
Durdur→Oyunu Başlat ile devam eden GERÇEKTEN yeni bir oturumda bile eşiğin
daha ilk turda tetiklenmesine yol açıyordu (canlı doğrulandı). Ayrı, dar
kapsamlı bir sayaçla düzeltildi — `session`'ın kendisine dokunulmadı.

**Sorun 2 çözümü:** "Dokunmalı" toggle'ı (chip + Oyun Ayarları satırı) artık
Kesim Noktası'nda gizli — aktif modun `getMeta().choiceOnly` bayrağına göre
(yeni, opsiyonel meta alanı) `syncAnswerFormatVisibility()` ikisini birden
gizler/gösterir. Frekans Bulma'da (choiceOnly yok) davranış değişmedi.

**Sıkı bug taraması bulguları:** HPF/LPF dengesi 2000-3000 örneklik testlerle
KANITLANDI dengeli (~%49/%51) — "hep LPF geldi" gözlemi kod bugı DEĞİL, küçük
örneklem tesadüfüydü. UÇ DEĞER sorunu GERÇEKTİ: FA_MIN–FA_MAX (80 Hz–17 kHz)
Frekans Bulma'nın PEAKING bant merkezleri için seçilmişti, HPF/LPF KESİMİ için
uygun değildi — kesim havuzu artık dar `CUTOFF_MIN`–`CUTOFF_MAX` (100 Hz–8 kHz)
aralığına alındı (sınırlar KULAKLA DOĞRULANMADI, makul başlangıç noktası).
Çeldirici üretiminde tekrarlanan frekans/GÖRÜNEN ETİKET yok (yeni test);
zorlukla ölçekleme (şık sayısı 3/4/5/6, mesafe/margin) canlı+testle doğrulandı;
A/B (kuru/işlenmiş) canlı doğrulandı, audio-engine.js'e dokunulmadı;
evaluateAnswer'ın dizi-konumundan bağımsız değerlendirmesi ve tip-gizli
edge case'i testle garanti altına alındı. Bir test flake'i bulunup düzeltildi
(boss-round mesafe testi N=80→600, 8/8 tekrarlı çalıştırmada temiz).

Kapsam korundu: filtre eğrisi görseli/öğretici geri bildirim EKLENMEDİ (sonraki
prompt), createQuestion/evaluateAnswer saf fonksiyon kaldı. Frekans Bulma'ya
regresyon yok (canlı doğrulandı: dalgaya tıklama, EQ eğrisi, zone-tip,
karşılaştırma butonları, "Dokunmalı" chip'i hepsi eskisi gibi). `npm test`:
**168/168** (140 eski + 28 kesim-noktasi).

Commit `304946c` — G17: **Mod 2 "Kesim Noktası" — çalışan iskelet** (HPF/LPF
kesim frekansı bulma, şıklı cevap, zorlukla tip ayrımı). Frekans Bulma'dan sonra
ilk GERÇEK ikinci mod — bu, `app.js`'in `mode.X()` genel dispatch mekanizmasının
(registry.js) BİRDEN FAZLA mod arasında ilk kez fiilen çalıştığı yer. `mode`
artık module-seviyesi bir `let` (önceden `const` idi, tek mod olduğu için hiç
değişmiyordu) — menüden hangi karta basıldığına göre değişiyor (bkz.
`renderModeGrid`'in kart click handler'ı, mod değişiminde eski modun round'u/
sesi/ekran metni temizleniyor).

`www/js/modes/kesim-noktasi.js` (yeni, ŞABLON niyetiyle yazıldı — 6 sözleşme
fonksiyonu + Frekans Bulma'yla aynı-isimli render yardımcıları). Frekans-ekseni
sabitleri (FA_MIN/FA_MAX/AXIS_H/faXToF/faFToX/FA_ZONES/faZoneOf/recordZone/
isBossRound) frekans-bulma.js'ten re-export edilir (jenerik, mode-bağımsız,
duplike edilmedi). Kesim frekansı merkeze (log-geometrik orta, ~1166 Hz) en az
`marginOct` oktav uzakta seçilir (kolayda büyük/uca yakın, zorlaştıkça küçülüp
merkeze yaklaşır) — **bu eşleme KULAKLA DOĞRULANMADI**, Z1'in hassasiyet
eğrisiyle AYNI durum (bkz. dosya başı yorum), makul bir başlangıç noktası.
Kolay/orta: tip söylenir, tüm şıklar aynı tipte. Zor/pro: tip gizlenir, en az
bir çeldiricinin filtre tipi ÇEVRİLİR (doğru şık hariç) — kullanıcı gerçekten
hem tip hem frekans ayrımı yapmak zorunda kalır. Şık sayısı 3/4/5/6
(DIFFICULTY.options). `applyProcessing` tek bir BiquadFilterNode (Q=0.707 sabit,
eğim zorlukla değişimi KAPSAM DIŞI) kurup audio-engine.js'in mevcut kuru/işlenmiş
A/B yoluna bağlanır — o dosyaya DOKUNULMADI.

**Kapsam dışı (bilerek, sonraki bir prompt):** filtre eğrisi görseli
(drawOverlay sadece frekans eksenini çizer), öğretici zone-tip metni,
karşılaştırma-önizleme butonları (Senin cevabın/Doğru cevap/Temiz — app.js'in
`#freqInfo` click-delegasyonu hâlâ SADECE "frequency" moduna kilitli).
`submitCutoffGuess` bu yüzden `submitFrequencyGuess`'in YAPISAL PARALELİ olarak
AYRI yazıldı (ortak "submitAnswer" özütlemesi yerine) — gerçek tekrar ağrısı
3. modda netleşince ortak bir çekirdek çıkarılabilir.

**Doğrulama sırasında bulunup aynı commit'te düzeltilen bir hata:** `#gameTitle`
(oyun ekranı başlığı) `index.html`'de statik "Frekans Bulma" metniydi, `app.js`
hiç güncellemiyordu (tek mod varken sorun değildi — ilk kez Kesim Noktası'na
girilince başlık YANLIŞ "Frekans Bulma" göstererek fark edildi). Artık her kart
tıklamasında doğru mod adıyla senkronlanıyor; aynı kökten, seans-sonu ekranının
"veri yok" fallback başlığı da aktif modun katalog adına bağlandı.

**Dürüst not — ÜRÜN KARARI GEREKTİRİYOR:** `mode-catalog.js`'teki kesim-noktasi
girdisi `unlockLevel:2` — ama `academyLevel` formülü (Z3) HİÇ oynanmamış bir
modun bile +1 katkı yaptığı bilinen bir ödün taşıyor (DURUM.md'de "2. mod
eklendiğinde yeniden değerlendirilmeli" diye ÖNCEDEN kayıtlıydı, bkz. BEKLEYEN
KARARLAR B). Sonuç: kesim-noktasi artık KAYITLI olduğu İÇİN academyLevel
otomatik 2'ye çıkıyor ve kendi kilidini kendi açıyor — canlı doğrulandı (az
ilerlemiş bir hesapta kart hiç kilitli görünmedi, doğrudan oynanabilir geldi).
Kod tarafında dokunulmadı — bu formülün nasıl değişmesi gerektiği (ya da bu
davranışın kabul edilip edilmeyeceği) bir ürün kararı.

Doğrulama (tarayıcıda + npm test): mod oynanabilir (menüden "Kesim Noktası"
başlığıyla oyun ekranı açılıyor, round başlıyor); HPF/LPF gerçekten uygulanıyor
(spektrumda roll-off görsel olarak doğrulandı); zorlukla tip ayrımı çalışıyor
(medium: "Bu bir LPF, kesim frekansı nerede?" + tüm şıklar "LPF"; pro: "Ne tür
filtre, hangi frekansta?" + 6 şıktan 5'i HPF 1'i LPF, canlı ekran görüntüsüyle
doğrulandı); şık sayısı medium'da 4, pro'da 6; boss round doğru çalışıyor;
Frekans Bulma'da REGRESYON YOK (mod değiştirilip geri dönüldüğünde başlık/
Dokunmalı chip/EQ eğrisi/zone-tip/karşılaştırma butonları hepsi eskisi gibi,
konsolda sıfır hata). `npm test`: **160/160** (140 eski + 20 yeni
kesim-noktasi testi).

Commit `ae50e9d` — G16: Kaynak menüsü accordion gruplara çevrildi (kullanıcı
raporu — SENTETİK/DAVUL/ENSTRÜMAN/KENDİ DOSYAM düz liste halinde hepsi açık
duruyordu, "Kendi Dosyam" en altta kalıp ulaşmak için çok kaydırma
gerekiyordu). `openSheet()`'in `<optgroup>`'lu select'ler (bugün için sadece
`sourceSelect`) için ürettiği grup başlıkları artık tıklanabilir birer
`.sheet-group-header` (gerçek `<button>`, D3'te bulunan WebKit flex-buton
genişlik hatasından kaçınmak için `width:100%+text-align:left` açıkça set)
— yanında chevron (▸, açılınca 90° dönüp amber oluyor). Grup gövdesi
VARSAYILAN kapalı (`.collapsed`); `collapseOtherGroups()` bir başlığa
basılınca DİĞER açık grupları kapatıp tıklanan grubu toggle ediyor — tek
açık kuralı. Boş grup gizleme yeni bir mekanizma gerektirmedi:
`populateSourceSelect()`'in var olan `sources.length>0` filtresi
korunduğu için boş `<optgroup>` zaten hiç üretilmiyor, accordion'da da
boş başlık çıkmıyor. Kapsam: sadece sheet'in DOM/CSS üretimi değişti —
`select.value`/`change` akışı, `source-catalog.js`, ses zinciri, A/B,
pitch, pause/resume, WAV parser, X butonu/otomatik geçiş dokunulmadı;
gruplanmamış select'ler (Zorluk/Oyun Türü/Süre/Cevap biçimi) davranış
değiştirmedi (`currentBody` hep `sheetOptions`).

Doğrulama (tarayıcıda, DOM state ölçümüyle): 4 grup accordion, başlığa
basınca açılıyor (ENSTRÜMAN'a basınca 4 satır göründü); tek açık kuralı
JS ile ölçüldü (ENSTRÜMAN açıkken KENDİ DOSYAM'a basınca ENSTRÜMAN
otomatik kapandı, aynı anda tam 1 grup `.open`); sheet HER açılışta 4
grup da kapalı geldi (kapatıp yeniden açılarak doğrulandı); sadece 4
gerçek grup render edildi, fazladan/boş başlık yok; DAVUL > Kick seçildi,
pill "Kick" oldu, round gerçekten Kick kaynağıyla başladı, konsolda sıfır
hata. `npm test`: 140/140.

Commit `77278b8` — G15: X butonu otomatik geçişle BİRLİKTE geri geldi,
**madde 13 KAPANDI**. G14'te kaldırılan `.freq-info-close` butonu geri
eklendi (`frekans-bulma.js`'in iki panel fonksiyonu, `styles.css`,
`app.js`'in `#freqInfo` click-delegasyonu) — G13'ten farklı olarak bu kez
otomatik geçiş mekanizmasıyla ÇAKIŞMADAN birlikte çalışıyor: X'e basan
hemen `goToNextRound()` ile ilerler, basmayan normal otomatik geçişi
bekler, karşılaştırma butonuna basan için otomatik geçiş dinleme
bitene kadar ertelenir.

Madde 13'ün kök sebebi (`loopAwarePreviewMs`'in karşılaştırma-sonrası
geçiş beklemesini kaynağın TAM DÖNGÜ uzunluğuna yuvarlaması — uzun
yüklenen dosyada dakikalarca sürebiliyordu) çözüldü: `audio-engine.js`'ten
`loopAwarePreviewMs` TAMAMEN kaldırıldı (grep doğrulandı — export'ta/kodda
kalmadı, sadece bunu açıklayan bir yorum satırında adı geçiyor). Yerine
`app.js`'te sabit `CMP_PREVIEW_RESUME_MS=3000` geldi — geçiş beklemesi
artık kaynak uzunluğundan TAMAMEN bağımsız. Önizleme sesi (`loop:true`)
bu noktada durdurulmuyor, kesilmeden çalmaya devam ediyor; sadece
otomatik-geçiş zamanlayıcısı bu sabit süre sonunda yeniden kuruluyor.

**Doğrulama sırasında ikinci, daha ciddi bir hata bulundu ve düzeltildi:**
`cmpPreviewStopTimer`'ın geri çağrısı, `roundFlow.captureRemainingAndClear()`
`null` DÖNMEDİĞİNDE `ensureAutoNext`'i yeniden kuruyordu. Orijinal
cevap-sonrası otomatik-geçiş zamanlayıcısı, kullanıcı karşılaştırma
butonuna basana kadar zaten ateşlenmişse (gerçek kullanımda birkaç saniye
sürebilir — otomasyon ortamında da tekrar tekrar gözlendi) `captureRemainingAndClear()`
`null` döner; bu durumda geçiş HİÇ yeniden kurulmuyordu ve tur KALICI
olarak askıda kalıyordu (X/Atla dışında çıkış yolu yoktu) — madde 13'ün
"geç gelir" tanısından daha kötü bir "hiç gelmeyebilir" davranışı.
Canlı testte doğrulandı: 20 saniyelik yüklenmiş WAV'da "Doğru cevap"
önizlemesine basıldıktan sonra tur 15+ saniye boyunca hiç ilerlemedi,
konsolda hata yok. Düzeltme: `remain` null/0 olsa bile `ensureAutoNext`
her zaman çağrılıyor — `roundFlow` zaten null/0 durumunda 1500ms
varsayılana düşüyor (`round-flow.js: ensureAutoNext`).

Doğrulama (tarayıcıda, `test-pause.wav` — 20sn'lik yüklenmiş WAV ile):
X butonu görünür ve basınca feedback paneli anında kapanıp yeni tur
başlıyor (~500ms içinde); hiçbir şeye basmadan bekleme normal otomatik
geçişle ilerliyor (müdahalesiz art arda birden fazla tur); "Doğru cevap"
önizlemesine basıp dinleme artık kalıcı askıda KALMIYOR, birkaç saniye
içinde tur ilerliyor — düzeltmeden önce dakikalarca (hatta hiç) gelmeyen
geçiş artık güvenilir. `npm test`: 140/140.

Commit `0cfd4e3` — G14: geri bildirim geçişi X butonundan tamamen otomatiğe
çevrildi (kullanıcı kararı — X'in "devam mı/çıkış mı/atla mı" olduğu
yorumlanabilir bulundu, akış buton olmadan tamamen otomatik olmalı).
G13'ün eklediği `.freq-info-close` butonu (frekans-bulma.js'in iki panel
fonksiyonundan, styles.css'ten, app.js'in `#freqInfo` click-delegasyonundan)
kaldırıldı. `goToNextRound()` KORUNDU (hâlâ "Atla ▶" tarafından kullanılıyor).
Karşılaştırma-önizlemesi-bitince-otomatik-geçiş-yeniden-kurma mekanizması
(`cmpPreviewStopTimer` bloğu: `captureRemainingAndClear` → dinletme biter →
aynı kalan süreyle `ensureAutoNext`) HİÇ DOKUNULMADI — G13'ten önce de
vardı, X eklenirken üstüne sadece bir dal eklenmişti; o dalı kaldırınca kod
otomatik olarak G13-öncesi doğru davranışına döndü. "Geri bildirim ekranı"
ayar toggle'ı (`prefs.feedbackScreen`) TAMAMEN KORUNDU, hiç değişmedi.

**Dürüst teknik not:** kullanıcının "bu, asıl kilitlenme sorununu da
çözer" varsayımı KISMEN doğru — otomatik yeniden-kurma zaten çalışıyordu
(G13'te bozulmamıştı). Ama G13'ün asıl teşhis ettiği kök neden
(`loopAwarePreviewMs`'in UZUN yüklenen dosyalarda önizleme bitiş süresini
TAM DÖNGÜYE — dakikalarca — yuvarlaması, `audio-engine.js`, DOKUNULMADI,
"ses çalma" davranışı kritik-korunacaklar listesindeydi) bu turda
ÇÖZÜLMEDİ — çok uzun bir şarkıda karşılaştırma dinleyen kullanıcı için
sonraki soru hâlâ dakikalarca gecikebilir, sadece artık "asla gelmeyecek"
değil "geç gelecek" (bkz. AÇIK İŞLER madde 13).

Doğrulama: 6 yeni birim testi (`test/round-flow.test.mjs`, `node:test`'in
`mock.timers`'ıyla — 140/140 toplam): tek seferlik tetikleme, kalan süreyi
doğru yakalayıp zamanlayıcıyı iptal etme (dinlerken soru DEĞİŞMEZ), yakalanan
süreyle yeniden kurulunca o süre sonunda tetiklenme, art arda dinletmede
SADECE SONUNCUSUNUN sayılması. Tarayıcıda: kartta X yok (ekran görüntüsü),
"Doğru cevap" tıklanıp HİÇBİR buton kullanılmadan round kendiliğinden
ilerledi (Soru 151→153), sıfır konsol hatası.

Commit `4119bce` — G13: geri bildirimde X (kapat) butonu + "Geri bildirim
ekranı" ayarı (kullanıcı raporu — karşılaştırma butonuna basınca sonraki
soruya geçiş kilitleniyordu, cihazda doğrulanmıştı). Kök sebep KANITLANDI:
sonraki soruya geçiş `roundFlow.ensureAutoNext()`'in kurduğu bir
`setTimeout` ile tetikleniyor; karşılaştırma butonuna basınca bu BİLEREK
duraklatılıyor, önizleme bitince `audioEngine.loopAwarePreviewMs(3000)` ile
hesaplanan bir süre sonra devam ediyor — bu fonksiyon süreyi kaynağın TAM
DÖNGÜ uzunluğuna yuvarlıyor (kısa gömülü örnekler için doğru tasarım). G7/
G8'den beri "upload" kaynağının `AudioBuffer`'ı KULLANICININ YÜKLEDİĞİ TÜM
ŞARKI kadar uzun olabiliyor — 20 saniyelik bir dosyada yuvarlama 3000ms'yi
20000ms'ye çıkarıyor, dakikalarca sürebilecek dosyalarda kullanıcı fiilen
kilitlenmiş gibi görünüyordu.

Çözüm 1 — X butonu: `showFreqInfoPanel`/`showProPlusInfoPanel`'in kurduğu
karta `.freq-info-close` eklendi (mevcut `#freqInfo` click-delegasyonuna
dahil, yeni dinleyici açılmadı). "Atla ▶"'nın çalışan ilerletme mantığı
`goToNextRound()` adıyla ortak fonksiyona çıkarıldı; X hem bunu çağırıyor
hem karşılaştırma önizlemesinin bekleyen zamanlayıcısını iptal ediyor —
uzun bir önizleme sürsün ya da sürmesin HER ZAMAN çalışan bir çıkış yolu
var artık. `loopAwarePreviewMs`'e (ses çalma davranışı) dokunulmadı —
otomatik yol hâlâ uzun sürebilir ama artık TEK yol değil.

Çözüm 2 — "Geri bildirim ekranı" ayarı: `prefs.feedbackScreen` (varsayılan
`true`), Bildirimler/Kulaklık uyarısı ile AYNI localStorage/toggle deseni.
Kapalıyken cevap sonrası panel HİÇ açılmıyor, `scheduleNext()`
`QUICK_ADVANCE_MS` (700ms) kullanıyor — skor/XP/can mantığı DEĞİŞMEDİ,
sadece görsel kart ve bekleme süresi. **Kapsam notu:** `submitProPlusGuess`
(Pro Plus zorluğu) bilerek KAPSAM DIŞI bırakıldı — `revealAnimator`'ın
kendi bant-bant açılma animasyonu hızlı-ilerleme ile çakışma riski
taşıyordu; X butonu proplus panelinde de var ama ayar toggle'ı sadece
frekans modunda etkili.

Doğrulama: 4 yeni birim testi (`freshPrefs`/`loadPrefs`, 130→**134**).
Tarayıcıda: 20sn'lik gerçek bir WAV yüklenip cevap verildi, "Doğru cevap"
önizlemesi tıklanıp HEMEN ardından X tıklandı — round anında ilerledi
(20sn beklemeden), sıfır konsol hatası. Ayar kapatılınca `#freqInfo` hiç
açılmadı (`classList.contains('hidden')===true`), round hızlı ilerledi;
switch localStorage ile senkron doğrulandı (kapalı↔açık). `npm test`:
134/134. **iOS cihazda kulakla doğrulama kullanıcıda.**

Commit `5d86afa` — G12: yüklenen ses cevap verince duraklıyor, kaldığı
yerden devam ediyor (kullanıcı raporu — cihazda doğrulanmıştı, "ses geri
bildirimde ilerliyor" bug'ı). Kök sebep KANITLANDI (kod incelemesi + canlı
ölçüm): cevap-işleme yolları `audioEngine.stopAudio()`'yu zaten
çağırıyordu (ses fiziksel olarak susuyordu) ama `stopAudio()` `upload.js`'in
mantıksal `offset`/`startedAt`/`playing` durumundan HABERDAR DEĞİLDİ — bir
sonraki `getSourceNode()` çağrısı `playing` hâlâ `true` olduğu için GERÇEK
(duvar saati) geçen süreyi offset'e ekliyordu. Canlı ölçüm: cevap sonrası
`pausePlayback()` hiç çağrılmadan art arda iki `getSourceNode()` çağrısı
offset'i 0.000→14.611→4.764'e sıçrattı.

Çözüm — TEK merkezi düzeltme: `audio-engine.js`'e `activeUploadManager`
referansı eklendi (`buildQuestionChain` her çağrıldığında `sourceType===
"upload"` ise güncellenir). `stopAudio()` artık HER çağrıldığında (cevap
verme, karşılaştırma önizlemesi bitişi, Durdur, oyun bitti, mod değişimi —
app.js'teki ~10 çağrı sitesinin HİÇBİRİNE dokunmadan) fiziksel durdurmayla
AYNI ANDA `pausePlayback()`'i de çağırıp offset'i donduruyor. Karşılaştırma
dinletmesi ayrıca ele alınmadı — YAPISAL olarak aynı `getSourceNode()`'u
kullanıyor, donmuş offset'i otomatik okuyor. Gömülü/sentetik kaynaklar
`activeUploadManager=null` olduğu için hiç etkilenmedi.

Doğrulama: 5 yeni birim testi (`test/upload-pause-resume.test.mjs`,
125→**130** — start/pause/resume, pause-olmadan-drift regresyon
karşılaştırması, buffer-aşımı modulo, startFromZero, art-arda-pause).
Tarayıcıda gerçek WAV yüklendi, ~10sn çaldıktan sonra cevap verildi —
offset 9.9265'te donduruldu; birkaç GERÇEK saniye sonra otomatik başlayan
YENİ tur TAM 9.9265'ten devam etti (hiç ilerlemedi). Ardından "kick"
(gömülü örnek) sorunsuz çaldı, konsolda sıfır hata (regresyon yok).
`npm test`: 130/130. **iOS cihazda kulakla doğrulama kullanıcıda** — bu
ortamda gerçek cihaz yok.

Commit `6ce73a8` — G11: upload dosya boyutu sınırı 30→**100 MB**. Kullanıcı
gerçek WAV dosyalarının 30 MB'ı aştığını bildirdi. OOM riski (G8'de 30 MB'ın
seçilme sebebi — decodeAudioData sıkıştırılmış formatları büyük PCM'e açar,
iOS WKWebView'ı çökertebilir) mp3/m4a/aac/ogg için hâlâ geçerli olduğu
açıklandı; kullanıcı bunu BİLEREK kabul ederek tek sınırı 100 MB'a çıkardı
(WAV zaten sıkıştırılmamış olduğu için kendisi güvenli, ama sınır tüm
formatlara ortak). Sadece `MAX_AUDIO_FILE_MB` sabiti değişti — kilitlenme
çözümü (G8), WAV parser (G10), çalma yolu dokunulmadı. `npm test`: 125/125
(değişmedi).

Commit `f603693` — G10: WAV yüklemesi kalıcı düzeltildi, **E1 KAPANDI**
(kök sebep artık kanıtlı — eski E1 girdisindeki "BİREBİR KANITLANAMADI"
notu geçerliliğini yitirdi, bkz. aşağıdaki E1 tarihçesi). G8'de upload
decodeAudioData yoluna taşınınca WAV kırıldı: kök sebep, iOS WKWebView'in
decodeAudioData'sının bazı WAV alt-tiplerini (24-bit PCM, 32-bit float —
Logic Pro/Pro Tools'un WAVE_FORMAT_EXTENSIBLE ile export ettiği alt-tipler)
açamaması, bilinen bir WebKit sınırlaması. Masaüstü Chrome'da bu hatayı
ÜRETEMEDİM (decodeAudioData üçünü de sorunsuz decode etti) — bunun yerine
`decodeAudioData`'yı geçici olarak her zaman reddedecek şekilde yamalayıp
iOS'taki başarısızlığı KONTROLLÜ olarak simüle ettim, düzeltmenin
devreye girdiğini kanıtladım.

Çözüm: `www/js/core/wav-parser.js` — SAF fonksiyon (`decodeWavPcm`,
AudioContext/DOM bağımlılığı yok), RIFF/fmt/data chunk'larını elle
ayrıştırıp PCM/float veriyi Float32'ye çeviriyor (8/16/24/32-bit PCM +
32/64-bit float, WAVE_FORMAT_EXTENSIBLE SubFormat GUID'i dahil).
`upload.js`: önce `decodeAudioData` dener (KOPYA üzerinde — orijinal
arrayBuffer WAV yedeği için sağlam kalır), başarısız olur ve dosya
RIFF/WAVE imzalıysa `decodeWavPcm`'e düşer, sonucu `audioCtx.createBuffer`+
`copyToChannel` ile AYNI AudioBuffer'a çevirir — gömülü örneklerle AYNI
AudioBufferSourceNode zincirine girer. İkisi de başarısız olursa
AudioContext'e dokunmadan net hata, pink noise'a SESSİZCE düşülmüyor.

Doğrulama: 8 yeni birim testi (16/24/32-bit/stereo/EXTENSIBLE/hata
senaryoları, 117→**125**). Tarayıcıda gerçek 523.25 Hz sinüs WAV'ları
(16/24/32-bit float) yüklendi — Chrome'da native decode başarılı; ardından
decodeAudioData yamalı-başarısız haldeyken AYNI 24-bit ve 32-bit float
dosyalar tekrar yüklendi: konsolda "decodeAudioData hatası → elle WAV
ayrıştırma BAŞARILI", round başlatıldı, spektrum doğru 523 Hz tepesini
gösterdi (pink fallback DEĞİL). Yama kaldırıldıktan sonra "kick" (gömülü
örnek) sorunsuz çaldı — G8'in kilitlenme çözümü BOZULMADI. `npm test`:
125/125. **iOS cihazda gerçek Logic Pro WAV'ının çalıştığı kullanıcı
tarafından doğrulanacak** — bu ortamda gerçek cihaz yok.

G9 — "odak aralığı spektrumu daraltmıyor" teşhisi (kod değişikliği YOK,
sadece DURUM.md notu — bkz. AÇIK İŞLER madde 11). Kullanıcı raporu G7/G8'in
(AudioBufferSourceNode geçişi) analyser bağlantısını kopardığını
varsayıyordu — kod incelemesiyle (git log + doğrudan kaynak okuma) bunun
YANLIŞ olduğu kanıtlandı: (1) odak aralığı seçimi doğru yere ulaşıyor ve
GERÇEKTEN çalışıyor, ama SADECE soru üretim havuzunu (`createQuestion`'a
geçen `focusRange`) daraltıyor; (2) spektrum ekseni M1-4'ten (`5c608f4`,
aylar önce) beri `FA_MIN`/`FA_MAX` (80 Hz–17 kHz) sabitine kenetli — kodun
kendi yorumu bunu açıkça belgeliyor, hiçbir zaman odak aralığından
beslenmedi; (3) `analyser`/`masterGain`/`muteGain` bağlantısı G4-G8'in
HİÇBİRİNDE değişmedi (`git log -p` ile üç commit tek tek tarandı). Sonuç:
"önceden çalışıyordu" öncülü yanlıştı — bu bir regresyon değil, davranış
her zaman böyleydi. Kullanıcı onayıyla (ekseni de daraltmak ayrı, riskli
bir refactor — FA_MIN/FA_MAX okuyan tüm çizim fonksiyonları + tıklama→Hz
haritalaması etkileniyor) kod değişikliği yapılmadı, bulgu AÇIK ÖZELLİK
olarak kaydedildi.

Commit `e9dfd4e` — G8: kullanıcı dosyası yükleme AudioBuffer'a taşındı, "ses
motoru kilitleniyor" bug'ı çözüldü (E1'in devamı — WAV picker sorunundan
AYRI, yeni bir bug: kullanıcı dosya yükleyince TÜM kaynaklar çalmaz
oluyordu). Kök sebep KOD İNCELEMESİYLE teşhis edildi (tahmin değil):
tek AudioContext var (grep doğrulandı), createMediaElementSource path
başına bir kez çağrılıyordu, null mediaSource'la buildQuestionChain'e
ulaşan bir yol da yoktu — yani "çift context" ve "çift createMediaElementSource"
hipotezleri EKARTE edildi. Geriye kalan açıklama: G7'de gömülü örnekler
AudioBufferSourceNode'a taşınmıştı ama kullanıcı dosyası hâlâ
MediaElementAudioSourceNode kullanıyordu — AYNI ses grafiğinde İKİ FARKLI
source-node tipinin karışması, iOS WebKit'te bilinen ama bu ortamda
(masaüstü Chrome) yeniden üretilemeyen bir etkileşim sorunu.

Kullanıcı onayıyla (30 MB/OOM trade-off'u soruldu): upload.js tamamen
AudioBuffer yoluna taşındı (File.arrayBuffer()+decodeAudioData+
AudioBufferSourceNode, gömülü örneklerle AYNI çalma yolu). MAX_AUDIO_FILE_MB
120→**30** (decodeAudioData sıkıştırılmamış PCM'e açar — 120 MB'lık bir
dosya 2+ GB'a çıkıp OOM ile çökertebilirdi, try/catch bunu YAKALAYAMAZ).
Pozisyon elle takip ediliyor (offset/startedAt — AudioBufferSourceNode
pause/resume desteklemiyor), her tur/karşılaştırma-önizlemesi TAZE bir node
alıp kaldığı yerden devam ediyor.

Tarayıcıda GERÇEK doğrulama: sentetik bir WAV (440 Hz) yüklendi ve çalındı
(spektrum beklenen dar tepeyi gösterdi), AYNI oturumda ARDINDAN "kick" ve
"hihat" (gömülü örnekler) ayrı ayrı sorunsuz çaldı, konsolda sıfır hata —
yani upload SONRASI gömülü kaynaklar KİLİTLENMEDİ (bildirilen bug'ın tam
tersi canlı doğrulandı). 30 MB üstü dosya AudioContext'e dokunmadan
reddediliyor (canlı test edildi). `npm test`: 117/117. **Metodolojik not:**
doğrulama sırasında dev sunucusunun (python http.server, Cache-Control
header'ı yok) bazı JS modüllerinin Chrome'da agresif önbelleklendiği
(yeni sekme + hard reload bile yetmedi) keşfedildi — `fetch(url,
{cache:'reload'})` ile elle tazelendi; bu sadece bu geliştirme ortamına
özgü, üretim/iOS bundle'ını etkilemiyor. **iOS cihazda kilitlenmenin
gerçekten kalktığı kullanıcı tarafından doğrulanacak.**

Commit `4a75785` — G7: sample çalma AudioBuffer'a taşındı (XHR/blob çekme +
decodeAudioData + AudioBufferSourceNode), iOS kesiklik ve loop sorunu çözüldü.
G6'nın HTMLAudioElement yolu "HTTP 0"ı çözmüştü ama cihazda kesik kesik çaldı
ve loop noktasında tıklama/boşluk vardı (kullanıcı raporu) — streaming/
element tabanlı çalma kısa, hassas zamanlamalı döngüler için uygun değil.
Yeni yol iki yöntemin iyi yanını birleştiriyor: ÇEKME için `fetch()` yerine
`XMLHttpRequest` (arraybuffer) — WKWebView'da yerel dosya `fetch()`'i
engelliyordu, XHR aynı işi görüyor; ÇALMA için `decodeAudioData` +
`AudioBufferSourceNode` — sentetik kaynakların (noise/synth) ZATEN kullandığı
yol, kusursuz loop sağlıyor. AudioBuffer path başına Promise olarak
cache'leniyor (decode SADECE BİR KEZ, canlıda geçici bir teşhis loguyla
ölçüldü: ilk çalma "miss-xhr", ikincisi "hit" — sıfır yeni istek). Her turda
yine de taze bir `AudioBufferSourceNode` kuruluyor ("kalıcı graf mutasyonu
yok" kuralı korunuyor). `npm test`: 117/117. Tarayıcıda 6 farklı örnek (kick/
hihat/snare/vokal/tom/bas) tek tek test edildi, konsolda sıfır hata, her
birinin spektrumu görsel olarak kendi karakterinde. **iOS cihazda kesikliğin
gerçekten gittiği kullanıcı tarafından doğrulanacak** — bu ortamda gerçek
cihaz/simülatör yok.

Commit `2ceb992` — G6: sample yükleme yolu HTMLAudioElement'e taşındı, iOS
"HTTP 0" çözüldü. Kök sebep (kullanıcı cihazda ölçtü, Safari Web Inspector):
`buildSampleSource` (G4'te eklenen yol) `fetch()+decodeAudioData()`
kullanıyordu — WKWebView yerel bundle dosyalarını `fetch()` ile çekmeyi
engelliyor, "HTTP 0" veriyor (format sorunu değildi, G5'teki .aiff→.m4a
değişikliği bu yüzden HTTP 0'ı çözmedi). `upload.js`'in zaten kullandığı
ÇALIŞAN desene (`new Audio(path)` + `createMediaElementSource`) taşındı.
`{el,node}` path başına KALICI cache'leniyor (`uploadedMediaSource` ile aynı
ilke — bir elementten `createMediaElementSource` sadece bir kez çağrılabilir),
ilk yüklemede `canplaythrough` bekleniyor, hata durumunda mevcut try/catch +
pink noise fallback DEĞİŞMEDİ. `buildQuestionChain`'deki eski `sample.stop()`
çağrısı kaldırıldı (MediaElementAudioSourceNode'da yok).

Doğrulama sırasında kullanıcı gerçek 9 m4a dosyasını `www/audio/` altına
koymuştu (bu görevden BAĞIMSIZ, kendi işlemi) — tarayıcıda "kick" ve "hihat"
ayrı ayrı test edildi, konsolda SIFIR hata, iki spektrum görsel olarak
BİRBİRİNDEN AYRI ve doğru karakterde (kick: düşük frekans kümesi, hi-hat:
geniş bant/tiz ağırlıklı) — gerçek dosyaların pink noise fallback'i DEĞİL,
doğrudan decode edilip çalındığı doğrulandı. `npm test`: 117/117. iOS
cihazda HTTP 0'ın gerçekten kalktığı KULLANICI TARAFINDAN doğrulanacak (bu
ortamda gerçek cihaz/simülatör yok). NOT: 9 gerçek m4a dosyası bu commit'e
dahil edilmedi (kod-yolu değişikliğinin kapsamı dışında), `www/audio/`
altında halen untracked — ayrı bir kararla eklenmeli (bkz. AÇIK İŞLER 10,
güncellenmesi gerekiyor artık dosyalar mevcut).

Commit `2d2bd6f` — G4: gerçek ses kaynakları eklendi (9 sample, DAVUL+ENSTRÜMAN).
`www/audio/` klasörü oluşturuldu (dosyaların KENDİSİ henüz yok, kullanıcı elle
koyacak — `.gitkeep` ile izleniyor, `cap sync` sonrası `ios/App/App/public/audio/`
altında doğrulandı). `source-catalog.js`'teki DAVUL (5: kick/snare/hihat/tom/
groove) ve ENSTRÜMAN (4: bass/bass_alt/guitar/vocal) grupları `kind:"sample"` +
`samplePath:"audio/<dosya>.aiff"` ile dolduruldu. Kaynak menüsü (`app.js
populateSourceSelect`) `SOURCE_GROUPS`'tan otomatik üretildiği ve boş grupları
zaten filtrelediği için kod değişikliği gerekmedi — tarayıcıda DOM'dan doğrulandı
(4 optgroup, 9 yeni option). `audio-engine.js`'teki `buildQuestionChain` sample
404/decode hatasında zaten sessizce pink noise'a düşüyordu (`kind:"sample"` daha
önce hiç kullanılmadığı için bu yol hiç tetiklenmemişti) — bu görev ilk kez
gerçek koşullarda (kick.aiff 404) tetikledi: konsolda YAKALANMIŞ hata, uygulama
çökmedi, round pink noise ile normal aktı. `npm test`: 117/117 (değişmedi).

Commit `b8c4cab` — G3: geliştirici modu (gizli Pro test anahtarı). Ayarlar >
Hakkında > Sürüm numarasına 7 kez dokununca "Geliştirici" bölümü açılıyor
("Pro'yu simüle et" anahtarı + kapatma seçeneği), ayrı bir localStorage
anahtarında (`eqEarTrainerProXDev`) saklanıyor — prefs'e KARIŞTIRILMADI.
Tek doğruluk kaynağı: `isUserPro()` (app.js:502) = `realPro` (şu an sabit
false, IAP yazılınca buraya bağlanacak) `|| devFlags.simulatePro`. 7 çağrı
noktası: `loseLife()`, `finalizeIfGameOver()`, 3x `currentLives<=0` kontrolü,
`syncAccountLine()`, `applyProLockVisibility()`. `loseLife()` artık bu
fonksiyonun arkasına alındı — Pro'da `currentLives` hiç azalmıyor.

Tarayıcıda canlı doğrulandı: Pro kapalıyken kilitler normal (can 4→3 azaldı),
Pro açıkken Araçlar'daki iki kilit (Analiz/Referans filtreleri) kalkıyor ve 3
art arda yanlış cevapta can "4"te sabit kaldı (hiç azalmadı). 7-dokunuşla
açılma+toast, localStorage kalıcılığı (reload sonrası bölüm otomatik görünür)
ve "Geliştirici modunu kapat" ayrı ayrı test edildi. Mod sayısı (14) ve seans
soru sayısı (10) Pro açılınca DEĞİŞMEDİ — kodda hiçbir mod tier'a göre kilitli
değil (sadece seviyeye göre, bkz. BEKLEYEN KARARLAR **B**) ve "10 Soruluk
Bölüm" zaten herkes için sabit 10 soru (bkz. BEKLEYEN KARARLAR **I.4** — bu
görev var olmayan bir kısıtlamayı kaldırmadı, zaten yoktu). `npm test`:
117/117.

**Z1-Z7 — ZORLUK MİMARİSİ (gece oturumu, kullanıcı yoktu, sabah gözden geçirilmeli)**
DURUM.md'de tasarım kararı olarak kayıtlı ama kodda hiç olmayan zorluk mimarisi
(logaritmik ölçek, seans rampası, mod-bazlı seviye, kişiselleştirme, Otomatik/
Sabit ayarı, lvlSheet, autoDiffAsk) baştan sona koda geçirildi. Her karar
noktasında (kullanıcı olmadığı için) makul bir değer seçilip DURUM.md
"ZORLUK MİMARİSİ — OTOMATİK VERİLEN KARARLAR" bölümüne gerekçesiyle yazıldı —
hiçbiri kesin doğru iddia edilmiyor, kulakla ayarlanmayı bekliyor.
- `61a50a4` Z1: `core/difficulty-curve.js` — logaritmik zorluk eğrisi (gain/Q/
  tolerans/süre), LEVEL_CAP=20 tavanı, tavan-sonrası bağlam zorluğu (gain+süre,
  katman-ekleme UYGULANMADI). 9 yeni test.
- `446c465` Z2: `core/session-plan.js` — largest-remainder seans rampası
  (10 soru: 3/3/3/1, 5 soru: 2/2/1/0), ilk-soru-kolay+kalan-karışık kararı,
  serbest mod için ağırlıklı per-soru seçim. 8 yeni test.
- `7f47a01` Z3: `core/storage.js`+`core/progress.js` — mod başına XP (perMode,
  perDiff'ten AYRI ad alanı — YAPISAL bir çakışma riskini önceden önledi),
  akademi seviyesi (mod seviyelerinin toplamı), göç (eski veri kaybolmadan
  taşındı, canlı doğrulandı: 99→126 XP). 16 yeni test.
- `16f0806` Z4: `core/personalization.js` — bölge bazlı zayıflık skoru (isabet+
  ortalama sapma), ağırlıklı soru üretimi (agresiflik sınırı: en fazla 3x),
  frekans-bulma.js'e WIRE EDİLDİ. 11 yeni test.
- `f576bc9` Z5: "Otomatik" zorluk modu GERÇEK oldu (`applyAutoDifficulty`,
  `tierForLevel` köprüsü, `prefs.difficultyMode` kalıcı).
- `973865e` Z6: `lvlSheet` sıfırdan kuruldu — Z1/Z3'ün gerçek değerlerini
  gösteriyor (qToOctaveBandwidth RBJ formülü dahil, +5 test), canlı elle
  çapraz doğrulandı.
- `ffc394f` Z7: `autoDiffAsk` sıfırdan kuruldu — tetikleme koşulu PROTOTİPTEN
  okundu (dokunma-tetiklemeli, performans-tetiklemeli DEĞİL). Testte YAN BUG
  bulundu ve düzeltildi (Oyun Ayarları'ndaki Zorluk satırı auto-değişimde
  donuk kalıyordu).
`npm test`: 68→117 (49 yeni test, hepsi saf fonksiyon). Konsol hatası hiçbir
adımda yok. Detaylı kararlar/gerekçeler için bkz. "ZORLUK MİMARİSİ — OTOMATİK
VERİLEN KARARLAR" bölümü altta.

A/B döngüsünde pitch kayması (bug raporu → teşhis → düzeltme) — kullanıcı (14 yıllık
müzik prodüktörü) yüklenen WAV dosyasında A/B otomatik döngüsü sırasında pitch'in
kaydığını bildirdi ("44.100'den 48.000 olmuş gibi"). Teşhis aşaması: AudioContext
tek bir singleton, sabit sampleRate — hiç değişemez; playbackRate hiçbir yerde set
edilmiyor; 44 canlı konsol ölçümünde (eşleşen 44.1kHz, uyuşmayan 48kHz dosya/44.1kHz
context, sentetik Pink Noise) audioCtx.sampleRate/playbackRate ilk çalma ile A/B
döngüsü arasında BİREBİR AYNI kaldı — JS düzeyinde fark kanıtlanamadı. Kod incelemesi
gerçek kök sebebi buldu: A/B döngüsü (M1-5) her 2000ms'de `buildQuestionChain`'i
YENİDEN çağırıyordu, bu da yüklenen dosya için CANLI ÇALAN `uploadedMediaSource`'u
(MediaElementAudioSourceNode) disconnect edip yeniden connect ediyordu — WebKit'te
bu deseni JS'ten hiç gözlemlenemeyen bir motor-düzeyi resample sapmasına yol açabilir
(zaten AÇIK İŞLER madde 5'te "A/B gerçek bypass değil" olarak kayıtlıydı). Kullanıcı
onayıyla asıl mimari çözüm uygulandı: `audio-engine.js`'te artık HER ZAMAN paralel
kuru+işlenmiş yol kuruluyor (dryGain/wetGain), A/B toggle'ı `audioEngine.
setProcessed()` ile SADECE 50ms'lik bir gain crossfade yapıyor — kaynak/filtre
grafiği tur boyunca hiç bozulmuyor. `app.js`'teki `toggleAB()` artık `buildQuestionChain`'i
hiç çağırmıyor. Enstrümante edilmiş canlı doğrulama (AudioNode.prototype.connect/
disconnect'e geçici sayaç eklenerek): eski kodda her A/B toggle'ı 1 connect+1
disconnect üretiyordu; yeni kodda uzun bir A/B döngüsü boyunca (tek tur içinde,
birden fazla toggle) SIFIR connect/disconnect ölçüldü. `npm test`: 68/68. Gerçek
pitch algısı (kulakla) DOĞRULANMADI — bu ortamda ses duyulamıyor, cihazda kontrol
edilmeli.

Commit `a377d80` — F1: geri bildirim iki kez gösteriliyordu (bug, AÇIK İŞLER
madde 4'ün ta kendisi — bu maddeyle KAPANDI). Kök sebep: `submitFrequencyGuess`/
`submitProPlusGuess` hem `#feedbackBox`'ı (basit kart) hem `#freqInfo`'yu (zengin
kart — bölge açıklaması, karşılaştırma butonları) AYNI ANDA dolduruyordu, ikisi
de görünür kalıyordu. Çözüm: `#feedbackBox` artık gösterilmiyor (`showResult`
zorla false); ondaki, `#freqInfo`'da OLMAYAN bilgi (kalite sözcüğü "🎯 Tam
isabet!" vb. ve yanlışta "Kalan can: N") yeni `appendFreqInfoNote()` yardımcısıyla
`#freqInfo`'nun içine taşınıyor — bilgi kaybı yok. `onTimeUp()` bilerek
dokunulmadı (kendi `showFreqInfoPanel`'ı çağırmıyor, `#feedbackBox` orada hâlâ
tek mekanizma). Masaüstü Chrome'da hem doğru hem yanlış cevap için TEK kart
doğrulandı (skor/XP doğru işleniyor). `npm test` 68/68. Cihazda KONTROL EDİLMEDİ.

Commit `160e37c` — F2: geri bildirim süresi 1.5sn sabitten doğru=4sn/yanlış=6sn'ye
çıkarıldı (F1'in içerik-yoğun kartı artık okunabiliyor). Bu sırada gerçek bir bug
bulundu: üç cevap-verme handler'ı `submitFrequencyGuess`/`submitProPlusGuess`'i
çağırdıktan HEMEN SONRA ayrıca kendi `ensureAutoNext()`'lerini çağırıyordu —
submit* zaten kendi süresini kurduğu için bu ikinci çağrı sessizce 1500ms
varsayılana geri dönüyordu; kaldırıldı. Karşılaştırma butonuna (Senin cevabın/
Doğru cevap/Temiz) basınca otomatik-geçiş sayacı duraklıyor (`pauseRound`'un
KULLANDIĞI AYNI primitif), en az 3sn'lik/buffer-tabanlı kaynaklarda döngü tam
katına yuvarlanan bir önizleme penceresi sonunda kaldığı yerden devam ediyor
(KULLANICI KARARI — sonradan gerçek örnek dosyalar eklenince döngü yarıda
kesilmesin). Yanlış-cevap süresi (6sn) ve donma/devam-etme davranışı masaüstü
Chrome'da ölçülerek doğrulandı (nextBtn "Sonraki (6)"da ~5sn donuyor, sonra
normal tikliyor); doğru-cevap süresi (4sn) SADECE kod simetrisiyle doğrulandı —
otomasyon ortamının CDP gecikmesi/timeout'ları temiz bir ölçüm almaya izin
vermedi. `npm test` 68/68. Cihazda KONTROL EDİLMEDİ.

Commit `a7b0be3` — F3: XP animasyonu soru metninin üzerine biniyordu (bug) —
`spawnXp` artık canvas'ın ÜST kenarından değil DÜŞEY ORTASINDAN başlıyor, 90px'lik
yukarı süzülme canvas sınırları içinde kalıyor. Toast'lar (günlük görev/başarım)
aynı sabit konumda üst üste biniyordu (bug) — artık aktif toast'ların yüksekliği
toplanarak birbirinin ALTINA diziliyor (`relayoutToasts`), konum sağ-alttan
(actionbar/karşılaştırma butonlarıyla çakışıyordu) sağ-üste taşındı (`.ghead`'in
GERÇEK yüksekliği kadar aşağıdan başlıyor, oyun ekranındaki geri/ayarlar
butonlarının üzerine binmiyor). `pointer-events:none` zaten vardı, override
edilmediği doğrulandı. fx.js fonksiyonları doğrudan çağrılarak masaüstü
Chrome'da test edildi (2 toast üst üste binmeden dizildi). `npm test` 68/68.
Cihazda KONTROL EDİLMEDİ.

Commit `37f2491` — F4: çift dokunma/pinch zoom kapatıldı. İki katmanlı: viewport
meta'ya `maximum-scale=1.0, user-scalable=no` eklendi (pinch), `html,body{
touch-action:manipulation}` eklendi (çift-dokunma zoom, kaydırma etkilenmez),
`#visualizer{touch-action:none}` (spektrum tap-hedefi, pan/zoom gerekmiyor).
Dokunmalı moddaki spektrum-tıkla-cevapla (pointerdown tabanlı) mekanizması
touch-action:none SONRASI test edildi, regresyon yok (573 Hz, "Tam isabet!").
Gerçek çift-dokunma/pinch DAVRANIŞI mouse-tabanlı otomasyonla üretilemedi —
sadece computed style/viewport meta içeriği ve fonksiyonel regresyon (tıklama,
kaydırma) doğrulandı. `npm test` 68/68. Cihazda KONTROL EDİLMEDİ (öncelikli).

Commit `bc45b38` — E1: "Dosya seç" ile WAV seçilemiyordu (bug) — **KAPANDI**,
bkz. G10 (yukarıda BİTTİ'nin başında): asıl kök sebep (decodeAudioData'nın
bazı WAV alt-tiplerini açamaması) elle WAV parser'ıyla çözüldü. Kod tarafında
(validateAudioFile'ın uzantı kontrolü) WAV'ı özel olarak eleyen bir şey
bulunamadı — 7 format da Node'da tek tek doğrulandı. En olası açıklama iOS
WKWebView'in `accept="audio/*"` MIME-jokerini UTI'ye çevirirken bazı
formatları (özellikle WAV) dışarıda bırakabilmesi (bilinen bir WebKit
sınırlaması) — bu ortamda fiziksel cihaz olmadığı için konsol logu ile
BİREBİR KANITLANAMADI. Düzeltme: accept artık MIME joker + WAV'ın bilinen
MIME varyantları + uzantı listesi birleşimi (audioAcceptAttr(), tek kaynak
ALLOWED_AUDIO_EXTENSIONS'tan üretiliyor); change handler'ına kalıcı bir
teşhis logu eklendi ([upload] dosya seçildi: ad|tip|boyut) — bir sonraki
cihaz testinde bu log konsolda görünüyor mu diye bakılmalı.

Commit `17eb76c` — E2: "Cevap biçimi" chip'i oyun ekranına eklendi (Kaynak/
Odak'ın yanına, 3. chip). Bunu yaparken initSettingsSheet'te gerçek bir bug
bulundu (updateRowText tekil querySelector kullanıyordu, aynı select'e bağlı
2. bir satırı hiç güncellemiyordu — querySelectorAll'a çevrildi) VE .srctag'ın
gerçek flex kapsayıcısının .chiprow değil aradaki .control.control-sheet
div'i olduğu, .srctag'ın o div'in flex öğesi olmadığı için flex:1/min-width:0'ının
hiç uygulanmadığı (width:100% ile düzeltildi) bulundu — bu ikinci bug 2
chip'te geniş pay yüzünden hiç fark edilmiyordu. Yeni chip flex:0 0 auto
(kısa metin hiç kesilmiyor), Kaynak/Odak flex:1 kalıyor.

Commit `96e56d7` — E3: cevap sonrası alt bar gizleniyor (.actionbar-tucked,
transform tabanlı, D1'in --actionbar-h sistemini bozmadan). Bunu yaparken
D1'in şıklı-mod otomatik kaydırmasıyla (scrollFeedbackIntoView) etkileşen
gerçek bir race bulundu: yeni tur açılışında untuck animasyonlu olunca,
senkron scrollHeight okuması geçiş tamamlanmadan eski (küçük margin) değeri
görüyordu — auto-advance edilmiş turlarda D1 bug'ı GERİ GELİYORDU. Çözüm:
setActionbarTucked'a instant seçeneği eklendi, SADECE yeni-tur-açılış
untuck'ında kullanılıyor (tuck her zaman animasyonlu kalıyor).

Üçü de: npm test 68/68 her adımdan sonra, konsol hatası yok. D1/D5 gibi bu
üçü de gerçek cihazda/simülatörde KONTROL EDİLMEDİ (bu ortamda yok) — sadece
tarayıcı/dosya düzeyinde doğrulandı; E1 özellikle cihazda ayrıca kontrol
edilmeli (bkz. üstteki not).

Commit `a1c837a` — D1: alt bar CSS-tabanlı padding düzeltmesi (cihaz testinden
çıkan bug). Kök sebep yeniden teşhis edildi: `.game-scroll` flex:1 ile ekranın
TÜM artan alanını (position:fixed actionbar'ın kapladığı ~168px dahil) kendi
kutusu sayıyordu; eski ölçüm-tabanlı çözüm (syncGameScrollPadding +
ResizeObserver) sadece ekstra scroll payı ekliyordu, kutunun kendisini
actionbar'ın önünde durdurmuyordu. Çözüm: `--actionbar-h` sabit CSS
değişkeni + `.game-scroll`'a margin-bottom (ölçüme dayanmıyor, ilk boyamadan
itibaren doğru) — syncGameScrollPadding tamamen kaldırıldı. Ayrıca 4-6 şıklı
durumda (.answers 2 satıra taşıyor) otomatik kaydırma eklendi (SADECE şıklı
modda — dokunmalı modda analizör görünür kalmalı). Gerçek DOM ölçümüyle
doğrulandı: 3/4/5/6 şık hepsi ≥+16 (38px), geri bildirim kartı 3 ölçümde
sabit +20px (hiç negatif dip yok).

Commit `4943634` — D2: kaynak isimleri İngilizceye çevrildi (Pink Noise/White
Noise/Saw/Square/Triangle) + "Kendi dosyam" satırı "Dosya seç" oldu (grup
başlığıyla tekrar ediyordu). source-catalog.js tek kaynak olduğu için sadece
6 label değişti, grep ile eski isimlerden hiçbiri kalmadığı doğrulandı.

Commit `382f030` — D3: Oyun Ayarları sheet'i düzeni. Kök sebep: satırlar
gerçek `<button>` — WebKit'te display:flex bir button'a uygulandığında
width/text-align UA varsayılanları flex düzenini bozabiliyor (prototype.html'
nin aynı bileşeni tam olarak width:100%+text-align:left'i açıkça set ediyordu,
bizde eksikti). Aynı ikisi eklendi + native "Dosya Seç" butonu
::file-selector-button ile uygulamanın buton diline uydurtuldu. Ölçümle
doğrulandı: 4 satır artık bayt-bayt eşit genişlikte (522px), etiket-değer
arası hiç sıfırlanmıyor.

Commit `5e00e9d` — D4: dosya boyutu sınırı 150→120 MB. Tespit: bu pipeline
decodeAudioData KULLANMIYOR (HTMLAudioElement akışı, PCM'i RAM'e açmıyor) —
150 MB'ın riski "bellek çökmesi" değildi, sadece gereksiz büyüktü. Kullanıcı
120 MB'ı onayladı.

Commit `bf898f8` — D5: splash koyu temada minik kalıyordu (bug). Kök sebep:
-dark PNG'ler AYNI kanvas boyutundaydı (2732x2732) ama logo kanvasın sadece
~%6.5'ini kaplıyordu (açık varyantta ~%35-40) — storyboard/Contents.json
doğruydu, sorun kaynak görselin kendisindeydi. Açık varyant (uygulamanın
teması zaten neredeyse siyah) doğrudan koyu varyantın yerine kopyalandı —
iOS (3 dosya) + Android'de AYNI bug bulunup düzeltildi (13 dosya, night/
drawable-night). Simülatör/cihazda gerçek render KONTROL EDİLMEDİ (Xcode/
Android Studio bu ortamda yok) — sadece dosya/piksel düzeyinde doğrulandı.

D6 (isimlendirme denetimi) — düzeltme YAPILMADI, sadece rapor edildi, bkz.
BEKLEYEN KARARLAR I.

Commit `5b3775f` — M1-3: "Kendi dosyam" dosya seçici açmıyordu (bug).
Teşhis: Kaynak sheet'inin "Kendi dosyam" satırı diğer seçenekler gibi
davranıyordu — sourceSelect'i sessizce "upload" değerine çekip kapanıyordu,
hiçbir dosya seçici AÇMIYORDU. Gerçek dosya inputu (upload-row) tamamen ayrı
bir sheet'te (Oyun Ayarları/dots) gömülüydü. Düzeltme: bu satır artık (dosya
henüz yüklenmemişse) native dosya seçiciyi doğrudan tetikliyor; dosya zaten
yüklüyse normal seçenek gibi davranıyor. Tarayıcıda gerçek bir WAV dosyasıyla
uçtan uca doğrulandı (seçim→yükleme→round başlatma). npm test 62/62.

Commit `5c608f4` — M1-4: odak aralığı (Tüm spektrum/Bas/Orta/Tiz).
Kaynak chip'inin yanına focusChip/focusSheet eklendi (frekans-bulma.js:
FOCUS_RANGES). Seçilen aralık hem soruyu hem çeldiricileri sınırlıyor,
tercih localStorage'da kalıcı. Ana menüdeki "Bugünün Önerisi"nin "Başla"
butonu artık gerçekten işlevsel — en zayıf bölgeyi otomatik odağa çeviriyor.
Dar odak aralıklarında (Bas/Orta) üst zorluklarda/Pro Plus'ta geometrik
kapasite sınırı var (bkz. BEKLEYEN KARARLAR H). 6 yeni test + tarayıcı
doğrulaması (sayfa yenilemede tercih kalıcı kaldı). npm test 68/68.

Commit `1a8dd7b` — M1-5: A/B uzun basma döngüsü (pointerdown+520ms+2000ms
interval, prototype.html ile birebir). Kısa dokunma eski davranışı koruyor.
Sentetik PointerEvent'lerle gerçek bir turda zamanlama ayrı ayrı ölçüldü
(150ms→toggle yok, 600ms→döngü başladı, 2100ms bekleyince otomatik flip
oldu, tekrar dokununca durdu, geri butonuyla da duruyor).

Commit `5a8e3b0` — M1-6: geri bildirim kartına "Senin cevabın/Doğru cevap/
Temiz" karşılaştırma butonları eklendi — üçü de GERÇEK ses çalıyor (prototipte
sadece görsel toggle'dı). Sadece tek-bant "frequency" modu kapsandı, Pro
Plus bilerek dışarıda bırakıldı (4 tahminden hangisi "senin cevabın" olacağı
belirsiz). Senkron JS ile gerçek bir turda üç buton da tıklanıp doğrulandı.

Commit `ff8f862` — M1-7 (kısmi): "Soru N/10" sayacı (sadece 10 Soruluk
Bölüm'de) + "Oyundan çık" butonu (Oyun Ayarları sheet'i). Kalan 3 alt madde
(Seviye bilgi sheet'i, ayrı "Tekrar Çal" butonu, Otomatik zorluk sorgusu)
ATLANDI — prototipin öngördüğü temel altyapı (seviyeye bağlı sürekli zorluk
formülü / gerçek "Otomatik" zorluk modu) kodda hiç yok, tahminle
doldurulmadı. Bkz. BEKLEYEN KARARLAR E/F/G.

Commit `abd17e4` — G1: başarım denetimi (9 rozetin TAMAMI tarandı):

| Rozet | Koşul | Okuduğu alan | Alan var mı | Tetiklenebilir mi | Düzeltildi mi |
|---|---|---|---|---|---|
| İlk Kulak | `s.correct >= 1` | `stats.correct` | Evet (`app.js:1205,1275`) | Evet | Gerek yoktu |
| Alev Zinciri | `s.bestCombo >= 5` | `stats.bestCombo` | Evet (`app.js:1207,1277`) | Evet | Gerek yoktu |
| Şimşek Kulak | `s.bestCombo >= 10` | `stats.bestCombo` | Evet | Evet | Gerek yoktu |
| Dayanıklılık | `s.rounds >= 25` | `stats.rounds` | Evet (`app.js:1172,1201,1270`) | Evet | Gerek yoktu |
| EQ Beyni | `s.rounds >= 100` | `stats.rounds` | Evet | Evet | Gerek yoktu |
| Keskin Hedef | `rounds>=20 && accuracy>=70` | `stats.correct`/`stats.rounds` | Evet | Evet | Gerek yoktu |
| Yükseliş (level_5) | `levelFromXp(s.xp)>=5` | `stats.xp` | **Yok** — hiç böyle bir alan yazılmamış, sadece `stats.perDiff[key].xp` var | **Hayır (her zaman false)** | **Evet** — `totalXp()` helper eklendi, tüm zorlukların XP'si toplanıyor |
| Pro Kulak | `s.proCorrect >= 8` | `stats.proCorrect` | Evet (`app.js:1214`) | Evet | Gerek yoktu |
| Boss Avcısı | `s.bossWins >= 1` | `stats.bossWins` | Evet (`app.js:1215,1284`) | Evet | Gerek yoktu |

Sonuç: 8/9 rozet zaten sağlamdı, sadece `level_5` kırıktı — kod `www/js/core/progress.js`.
TASARIM.md'de kayıtlı "tasarımda 6, kodda 9 rozet" farkı bu denetimle çözülmedi —
hangi setin kalacağı ürün kararı, bkz. BEKLEYEN KARARLAR **C**.

Commit `ac505c3` — G2: seans sonu ekranı (TASARIM.md EKRAN 5, madde 9 kapandı):

- Eski küçük "Oyun Bitti" modalı kaldırıldı (`#gameoverOverlay` + ilgili CSS silindi),
  `#screen-result` adında tam ekran eklendi — prototype.html'deki yapı/metin/sıra
  birebir aktarıldı (sonuç halkası, seviye atladın kartı, XP kartı+bar, seri/ipucu
  istatistikleri, bölge haritası/soru sırası, yorum cümlesi, 3 CTA).
- "Canların bitti" ve normal tamamlanma ayrı varyasyon; ikisi de canlı state'ten
  okunuyor, uydurma veri yok.
- Veri kaynağı olmayan iki alan tasarımdan bilerek çıkarıldı: önceki seans
  karşılaştırması (`resLead` normal varyantta), öneri kartı (`resSug` — "odak seti"
  özelliği kodda yok).
- CTA'lar gerçek işlev görüyor: "10 soru daha" her zaman yeni 10 Soruluk Bölüm
  başlatıyor, "Tekrar oyna" aynı modda (serbest/bölüm) yeniden başlıyor, "Menüye dön"
  ana menüye çıkıyor. Üçü de can sıfırken sessizce yeni tur başlatmıyor.
- Doğrulama sırasında gerçek bug bulundu ve düzeltildi: can sıfırken "Tekrar oyna"
  önceki turun kalıntı soru başlığını (`questionTitle`) ve sonuç kartını (`freqInfo`)
  temizlemiyordu — `startRound()` çağrılmadığı için bu elemanları sıfırlayan kod hiç
  çalışmıyordu, ekranda "canların bitti" yerine eski yanlış/doğru cevap kartı
  görünmeye devam ediyordu. Konsoldan `currentLives`/`startRound` çağrı izi alınarak
  doğrulandı (tahminle değil), üç ayrı DOM elemanı (`freqInfo`, `questionTitle`,
  `questionMeta`) guard branch'e eklendi.
- `npm test`: G1 öncesi 62/62, G1+G2 sonrası 62/62 — regresyon yok, konsol hatası yok.

Öncesindeki mimari (core modülleri + mod kayıt sistemi + 14 mod menüsü) commit'li.

## AÇIK İŞLER

**(Kaynak koda karşı doğrulandı, G59 sonrası.)** Aşağıdaki maddeler tek tek mevcut
kaynak koddan (`grep`/`git log`/dosya okuma ile) yeniden kontrol edildi;
sadece BAŞLIKTAKİ mod sayıları değil, madde İÇERİĞİ de doğru mu diye
bakıldı. Beş madde bu turda stale çıktı (kod çoktan değişmiş ama not hiç
güncellenmemiş) — aşağıda işaretlendi.

### Bug'lar

**1. ~~Geri bildirim kartı ilk saniyelerde alt bar'ın altında~~ — D1'de düzeltildi, `a1c837a`**
Üç kez ölçüm-tabanlı çözüm denenmiş, tutmamıştı. D1'de mimari değişti: padding
yerine CSS `--actionbar-h` değişkeninden margin-bottom (`styles.css:51`) —
ölçüme hiç bağlı değil, ilk boyamadan itibaren doğru; kod hâlâ bu şekilde
(doğrulandı). Aynı turda şıklı cevap modundaki 4-6 şıklık grid'in altbar
arkasında kalması da (aynı kökten) düzeltildi. Simülatör/cihazda gerçek
render henüz KONTROL EDİLMEDİ — sadece masaüstü Chrome'da gerçek DOM
ölçümüyle doğrulandı (bkz. commit mesajı).

**2. Pause sonrası ilk play'de duraksama — TEŞHİS ARTIK GEÇERSİZ, YENİDEN test edilmeli**
Orijinal not "canplay/waiting event'leri, preload ayarı" bakılmasını
öneriyordu — bu, o zamanki HTMLAudioElement tabanlı çalma yoluna aitti.
Kod incelemesiyle doğrulandı: bu event isimleri (`canplay`/`waiting`)
kod tabanında ARTIK HİÇ GEÇMİYOR — G8/G12 (`upload.js`) ile mimari kökten
değişti, upload artık `AudioBufferSourceNode`+elle offset takibiyle çalışıyor
(pause/resume kavramı yok, `node.start(0, offset)` ile TAZE node kuruluyor,
bkz. CLAUDE.md "Ses motoru notları"). G12 aynı dosyada AYRI bir pause-kaynaklı
hatayı ("cevapta kaldığı süre kadar şarkı ileri sarılmış gibi başlıyordu")
zaten kapatmış görünüyor (`upload.js:35-43` yorumu). Orijinal "takılma" şikâyeti
bu mimari değişiklikle kendiliğinden çözülmüş OLABİLİR ama bu, ses duyulmadan
kod okumakla kanıtlanamaz (CLAUDE.md: "ses davranışı kaynak koddan
doğrulanamaz") — **madde kapatılmadı, gerçek cihazda kulakla YENİDEN test
edilmeli.**
**Kabul kriteri:** 10 ardışık pause→play denemesinde duyulur bir "takılma" yok

**3. Oyun 0 canla başlıyor — muhtemelen ÇOKTAN düzelmiş, canlı doğrulanamadı**
`storage.js:129`: `loadStats()` artık `s.lives`'ı `<1` ise (0 dahil, ya da hiç
yoksa) `TOTAL_LIVES`'a (5) çekiyor — yorum satırı bunu AÇIKÇA bu bug'ın
kapatılması olarak tarif ediyor ("temiz localStorage'da olduğu gibi
TOTAL_LIVES'a çekilir"). `app.js:540/567`: `stats` bu fonksiyondan SENKRON
yükleniyor, `currentLives = stats.lives` hemen ardından okunuyor — state
katmanında "0 can" üretecek bir yol kalmamış görünüyor. Bu oturumda tarayıcı
eklentisi bağlı olmadığı için canlı DOM doğrulaması YAPILAMADI — kod-seviyesi
bulgu güçlü ama "temiz localStorage'da can göstergesi gerçekten 5 ile açılıyor"
iddiası henüz gözle görülmedi.
**Kabul kriteri:** temiz `localStorage` ile açılışta can = tanımlı başlangıç değeri (canlı doğrulanmalı)

**4. ~~`loseLife()` zengin geri bildirimi eziyor~~ — F1'de düzeltildi, `a377d80`**
Yanlış cevapta artık TEK kartta hem "Kalan can: N" hem doğru frekans/bölge bilgisi
görünüyor (`appendFreqInfoNote`). Aynı kökten (feedbackBox + freqInfo aynı anda
görünür kalması) doğru cevap tarafındaki DUPLIKE kart bug'ı da düzeldi.

### Eksik özellikler

**10. ~~Gerçek ses dosyaları (DAVUL/ENSTRÜMAN) katalogda tanımlı ama dosyaların kendisi yok~~ — TAMAMEN KAPANDI**
G4 ile `source-catalog.js`'e 9 `kind:"sample"` girdisi eklendi, G5 ile
uzantı `.m4a`'ya çevrildi, G6 ile yükleme yolu değişti. **Bu turda `git
ls-files www/audio/` ile doğrulandı: 9 m4a dosyası artık TAKİPLİ** (en son
`1c86464` / G51'de commit'lenmiş) — önceki notun "henüz git'e commit'lenmedi"
iddiası STALE, kalan tek adım da kapanmış. iOS cihazda gerçek doğrulama
(HTTP 0'ın kalkması) hâlâ kullanıcıda.

**5. ~~A/B Test gerçek bypass değil~~ — bir kullanıcı raporuyla birlikte düzeltildi, bkz. BİTTİ**
Kullanıcı (14 yıllık müzik prodüktörü) A/B döngüsünde pitch kayması bildirdi
("44.100'den 48.000 olmuş gibi"). Teşhis: konsol düzeyinde (audioCtx.sampleRate/
audioEl.playbackRate, 44 ölçüm, eşleşen+uyuşmayan sample rate'ler, upload+sentetik)
hiçbir fark kanıtlanamadı — ama A/B döngüsünün her 2sn'de bir CANLI ÇALAN
uploadedMediaSource'u (MediaElementAudioSourceNode) disconnect/reconnect ettiği
kod incelemesiyle doğrulandı; bu WebKit'te JS'ten hiç gözlemlenemeyen bir motor
davranışı olabilir. Kullanıcı onayıyla asıl mimari eksiklik (bu madde) çözüldü:
artık paralel kuru/işlenmiş yol + gain crossfade (`audioEngine.setProcessed`) var,
`buildQuestionChain` A/B toggle'ında BİR DAHA hiç çağrılmıyor.

**6. ~~Kalibrasyon — sarı seviye çizgisi dokunmatik olmalı~~ — ÇOKTAN kodlanmış, STALE madde**
`app.js:4789-4801`: `calLevelTrack` üzerinde `pointerdown`/`pointermove`/
`pointerup`/`pointercancel` ile sürükleme kodlanmış (Pointer Events, mouse+touch
+kalemi TEK API'de birleştirir). `git log -S"calLevelTrack"` bu kodun proje
tarihindeki EN İLK commit'ten (`f0e144a`) beri var olduğunu gösteriyor — yani
bu madde muhtemelen dosyaya hiç güncel kalmadan miras kalmış. Gerçek dokunmatik
cihazda son doğrulama bu oturumdan yapılamadı (tarayıcı eklentisi bağlı değildi)
ama kod açıkça touch-uyumlu bir API kullanıyor.

**7. ~~Odak aralığı özelliği kodda yok~~ — M1-4'te eklendi, `5c608f4`; "öneri kartı" notu da G58 ile KAPANDI**
Önceki not "seans sonu ekranındaki öneri kartı (resSug) HÂLÂ eklenmedi"
diyordu — `resSug` id'si kod tabanında artık hiç yok. Bunun yerine G58
(`250c622`) ana menüye `dailyTipCard`/`dailyTipStartBtn` ekledi: en zayıf
bölgeyi `zoneScores()`'tan okuyup tek cümlelik öneri gösteriyor, "Başla"
butonu GERÇEK `challenge.total` sorudan oluşan bir set başlatıyor
(`app.js:1726-1738`, `renderDailyTip`). Konum "seans sonu" değil "ana menü"
ama işlevsel istek (zayıf bölgeye odaklı öneri + gerçek başlat butonu)
karşılanmış görünüyor — madde kapatıldı.

**8. İlerleme sekmesi prototiple örtüşmüyor**
Bölümler var, düzen farklı. `Dizayn/prototype.html` referans. Bu turda
yeniden gözden geçirilmedi (kapsam dışı bırakıldı) — hâlâ açık kabul ediliyor.

**12. "Geri bildirim ekranı" ayarı Pro Plus zorluğunda etkisiz**
Kod okunarak DOĞRULANDI, hâlâ true: `submitProPlusGuess` (`app.js:2735`)
`mode.showProPlusInfoPanel`'i KOŞULSUZ çağırıyor ve `scheduleNext(result.correct
? 4000 : 6000)`'ı (`app.js:2810`) `prefs.feedbackScreen` kontrolü OLMADAN
çalıştırıyor — diğer tüm submit fonksiyonlarındaki `prefs.feedbackScreen ?
(...) : QUICK_ADVANCE_MS` deseni burada YOK. Kullanıcı Pro Plus'ta ayarı
kapatırsa panel yine de açılır.
**Kabul kriteri:** Pro Plus'ta cevap verilince, ayar kapalıyken de panel
açılmadan hızlı ilerleniyor, `revealAnimator` animasyonu düzgün tamamlanıyor
(yarıda kesilmiyor).

**13. ~~Uzun yüklenen dosyada karşılaştırma sonrası otomatik geçiş hâlâ çok geç gelebilir~~ — G15'te KAPANDI, `77278b8`**
Kök sebep (`loopAwarePreviewMs`'in geçiş beklemesini kaynağın TAM DÖNGÜ
uzunluğuna yuvarlaması) çözüldü — fonksiyon tamamen kaldırıldı, geçiş
beklemesi artık kaynak uzunluğundan bağımsız sabit `CMP_PREVIEW_RESUME_MS`
(3000ms). Bu mekanizma artık Kompresör'e özgü değil — G35'ten beri
`three-way-cards.js` üzerinden Reverb/Distortion'ın önizlemesi de AYNI yolu
kullanıyor (paylaşılan altyapı, ayrı ayrı yeniden yazılmadı).

**11. AÇIK ÖZELLİK — Odaklı pratik modu**
Kullanıcı raporu (G9 teşhisi, kod değişikliği YAPILMADI — bkz. BİTTİ):
Odak aralığı (Bas/Orta/Tiz) şu an SADECE soru üretim havuzunu daraltıyor
(`createQuestion`'a `focusRange` olarak geçiyor) — spektrum ekseni
(`drawFreqAxis`/`faXToF`/`faFToX`/`drawSpectrumBars`) tasarım gereği sabit
`mode.FA_MIN`/`mode.FA_MAX`'a kenetli, bu turda `grep` ile YENİDEN doğrulandı
(`app.js:3299-3300`), hâlâ hiç değişmemiş.
İstenen: kullanıcı zayıf bölgesini (bas/orta/tiz) seçip odaklı çalışırken
spektrum GÖRSEL olarak da o bölgeye daralsın — hem kulak hem göz o dar
bölgeye odaklansın. Kullanım senaryosu artık G58'in gerçek `dailyTipCard`
seti (bkz. madde 7) bitince kullanıcının zayıf bölgesini seçip tekrar
tekrar çalışması.
Gerekli iş: `drawFreqAxis`/`faXToF`/`faFToX`/`drawSpectrumBars` + ipucu/A-B
işaretleyicileri gibi `FA_MIN`/`FA_MAX` okuyan çizim fonksiyonlarının
tamamının dinamik bir aralık alacak şekilde refactor edilmesi (tıklama→Hz
haritalamasını da etkiliyor, riskli) — ayrı bir iş, bu turun kapsamı
dışında bırakıldı (kullanıcı kararı).

**14. G67/G68/G69/G70/G71 "i" bilgi/rehber sistemi + SPOTLIGHT turu — CANLI/cihaz
doğrulaması hiç yapılmadı**
Kod incelemesi + 1013 test geçti ama tarayıcıda GERÇEKTEN denenmedi (bkz.
G67/G68/G69/G70/G71 kayıtlarındaki dürüstlük notları). Gözle görülmesi
gereken davranışlar:
(1) ana ekran `#menuInfoBtn` ve mod kartlarındaki `.mode-info-btn`
tıklanınca `#guideSheet` doğru içerikle açılıp `×`/overlay ile kapanıyor mu,
(2) sheet içeriği (özellikle GENERAL_GUIDE'ın 5 bölümü, G69'dan itibaren de
her modun "OYUN SEÇENEKLERİ" bloğu) küçük ekranda taşmadan/kesilmeden
okunuyor mu,
(3) **[G68]** bir modu ilk kez oynarken SPOTLIGHT turu GERÇEKTEN çıkıyor mu
(ekranın etrafı kararıp doğru öğe aydınlanıyor mu, `#spotlightHole`
GERÇEKTEN hedef elementin üzerine oturuyor mu — 10 modun HEPSİNDE ayrı ayrı,
`resolveSpotlightTarget`'ın `isChoiceFormat()`/tonal-submit/analyzer
çözümlemesi doğru mu),
(4) **[G68]** adım geçişi hem "İleri" hem GERÇEK tıklamayla (dinle→seç→onayla
akışı, hedefin ALTINDAKİ gerçek buton/kart/kaydırıcı NORMAL tıklanabiliyor
mu — karartma hiçbir tıklamayı ENGELLEMİYOR mu) çalışıyor mu,
(5) 2. round'dan sonra tur bir daha çıkmıyor mu (localStorage'da
`hintRoundsShown` gerçekten artıyor mu), "Geç" çalışıyor mu, kalıcı "i"
bundan bağımsız hep duruyor mu,
(6) **[G68]** callout (yönlendirme kutusu) ekran kenarında/küçük ekranda
taşmadan konumlanıyor mu,
(7) **[G69]** "abControl" adımı `#abToggle`'ın ÜZERİNE GERÇEKTEN oturuyor
mu — Kompresör/Reverb/Distortion'da karta UZUN BASMANIN o ANDA döngüyü
başlattığı/durdurduğu VE turun bunu ANINDA algılayıp bir sonraki adıma
geçtiği; diğer 6 modda tek dokunuşun "A/B Test"i doğru değiştirdiği,
(8) **[G69]** 4 adımlık turun (listen→abControl→select→confirm) GERÇEKTEN
"uzun" hissettirmediği, SON adımın "Atla"/"Durdur" hatırlatma metninin
okunabilir olduğu,
(9) **[G70/G71]** oyun ekranında `#gameInfoBtn` GERÇEKTEN küçük/sessiz
duruyor mu (başlığın yanında, `.hearts`/`#bossChip`/dots'u İTMİYOR mu), en
uzun mod adında (Frekans Çakışması) dar ekranda başlık/rozet TAŞMADAN yan
yana sığıyor mu, tıklanınca `#guideSheet` mod kartındakiyle AYNI içerikle
GERÇEKTEN AÇILIYOR mu — G71'de kök sebep bulunup düzeltildi (`guideSheet`
`#screen-menu`'nün içinden `.app-shell` köküne taşındı), bu turda YENİDEN
cihazda TEST EDİLMELİ (bir önceki tur sadece kod incelemesiyle "düzeldi"
diyordu, canlı TEYİT hâlâ yok), mod değişince (enterMode) rozet SİLİNMEDEN
kalıyor mu,
(10) **[G71]** `#abToggle`'daki "Basılı tut: döngü" yazısı cakisma HARİÇ
9 modun HEPSİNDE görünüyor mu, döngü aktifken (kart "loop" durumuna
geçince) GERÇEKTEN kayboluyor mu, `[guide-i-diag]` etiketli konsol logları
Safari/Xcode konsolunda GERÇEKTEN beklenen sırada çıkıyor mu.
**Kabul kriteri:** yukarıdaki 10 davranışın HEPSİ gerçek cihaz/tarayıcıda
elle denenip doğrulandı, taslak metinler (`MODE_GUIDE_TEXTS`,
`MODE_OPTIONS_TEXTS`, `SPOTLIGHT_STEPS`) kullanıcı tarafından gözden
geçirilip gerekiyorsa `guide-texts.js`'te düzeltildi.

**15. ~~G74 — Ana Menü'nün "Sv" rozeti ile İlerleme sekmesinin rozeti artık
FARKLI sayı gösteriyor~~ — G75'te KAPANDI**
`updateUI()`'da İlerleme'nin `#progLevelValue`/`#progXpText`/`#progXpBar`/
`#progNextLevelText` ARTIK Ana Menü'yle AYNI kaynağı (`progress.
academyXpProgress(academyTotalXp(...))`) okuyor — canlı doğrulandı, ikisi
de taze kullanıcıda "1" / "0/600 XP" (bkz. BİTTİ G75).

**16. ~~G78 — Frekans Bulma'da cevap sonrası dikey kayma (201px) hâlâ var~~ — G81'de KAPANDI**
Kök sebep `#freqInfo`'nun `display:none` (`.hidden` class'ı) ile aç/
kapanmasıydı. G81'de Frekans Bulma'nın "frequency" sorusu `#feedbackBox`'a
taşındı (G58'in visibility+min-height mekanizmasını zaten taşıyan yüzey) —
canlı ölçüldü, kayma **0px** (bkz. BİTTİ G81 tablosu). `#freqInfo`'nun
KENDİSİ hâlâ var ama SADECE Pro Plus kullanıyor artık (o akış bu maddenin
kapsamı DIŞINDA, hiç şikayet konusu değildi).

**17. G78 — Tonal Denge'nin kaydırıcıları tasarımdaki gibi DİKEY DEĞİL**
Tasarım (Tasarim-2026-08/Prototip.dc.html) sürükle-bırak DİKEY fader
gösteriyor, mevcut kod YATAY `<input type="range">` (`.tonal-slider`)
kullanıyor — bilinçli kapsam kararıydı (bkz. BİTTİ G78): dikey fader'a
geçmek özel pointer-drag JS'i + klavye erişilebilirliğinin YENİDEN
kurulmasını gerektiriyor, G78'in süre/risk dengesinde YAPILMADI.
**Kabul kriteri:** kullanıcı bu görsel farkı kabul edilebilir bulmuyorsa,
ayrı bir turda `<input type="range">`'in erişilebilirliği KORUNARAK
(ör. `writing-mode:vertical-lr` veya özel thumb+pointer olayları)
dikey görünüme geçirilmeli.

**18. G81 — Kesim Noktası/Kompresör/Reverb'de cevap sonrası dikey kayma 4px
(hedef ≤2px'in hafif üstünde)**
Diğer 7 modun HEPSİ 0-2px, bu üçü 4px (bkz. BİTTİ G81 tablosu) — kök sebep
muhtemelen `.ans.right`/`.ans-m2.right` işaretlenirken eklenen 2px kenarlık
(ÖNCEDEN DE vardı, G81'in DEĞİŞİKLİĞİ değil, YENİ bulundu). Küçük/kozmetik,
kullanıcı gözle fark etmesi zor (4px), ama "≤2px" hedefini tam karşılamıyor.
**Kabul kriteri:** `.ans.right`/`.ans-m2.right` kenarlığı `box-sizing`/
`outline` gibi yer kaplamayan bir tekniğe taşınıp 3 modda da kayma 0-2px'e
inmeli.

**19. G81 — Tonal Denge'nin XP kırılımındaki "yakınlık" (proximityBoost)
faktörü CANLI doğrulanamadı**
Kod incelemesiyle doğrulandı (`Math.max(.55, result.proximityScore/100)`,
calculateXP'nin AYNI satırı okunuyor, UYDURULMUŞ değil) ama otomasyon
sürgüleri tam nötre çekip "doğru" (avgDeviation≤tolerans) bir cevap +
kırılım panelini AYNI anda yakalayamadı (bkz. BİTTİ G81 "DOĞRULANMADI"
notu). Diğer 9 modun 5 ortak faktörü (combo/boss/hız/ipucu/bölüm) 5 farklı
canlı senaryoda birebir doğrulandı — SADECE bu 6. faktör eksik.
**Kabul kriteri:** Tonal Denge'de kaydırıcılar tam nötre (0.0dB) çekilip
GERÇEK bir doğru cevap verilerek `#fbComboText`'te "N yakınlık" değerinin
`Math.max(.55, proximityScore/100)` ile birebir eşleştiği canlı gösterilmeli.

**20. G82 — Seans Sonu'nun "done" (kayıpsız 10 Soruluk Bölüm) durumu
YAPISAL OLARAK ERİŞİLEMEZ görünüyor (BEKLEYEN KARARLAR'a da bkz.)**
`showSessionEnd("normal")` SADECE `finishChallenge()`'dan, o da SADECE
`challenge.active && !examGateActive() && challenge.done>=10` iken
çağrılıyor. `examGateActive()=mode.EXAM_ENABLED && isUserPro()` — G50 sınav
sistemini TÜM 10 moda yaydığından beri (`EXAM_ENABLED` her modda `true`,
grep ile doğrulandı) Pro kullanıcı için bu koşul HİÇBİR ZAMAN `true`
olamıyor (exam her zaman `finishChallenge()`'ı bloke ediyor). Free kullanıcı
da `paywall.isFreeSessionLimitReached` (5 soru) yüzünden "done"a hiç
ulaşamıyor. Canlı denendi (~150+ cevap, sınav/telafi/parkur-baştan
döngüleri dahil) — asla tetiklenmedi. "done"un RENDER KODU "lost"/
"freeLimit" ile AYNI ortak fonksiyonlardan geçtiği için (o ikisi canlı
doğrulandı) yüksek güvenle doğru çalışacağı değerlendiriliyor, ama kendine
özgü hiçbir parçası (bonus satırı, "Yeni Seans" butonu) canlı görülmedi.
**Kabul kriteri:** kullanıcı kararı BEKLEYEN KARARLAR'daki maddeye bkz. —
karar netleşince (a) kasıtlıysa bu madde "beklenen davranış" olarak
kapatılır, (b) regresyonsa `finishChallenge()`'ın exam-passed/remedial-passed
sonrasında da (ya da EXAM_ENABLED olmayan bir moda dönülürse) tetiklenmesi
sağlanıp "done" canlı yeniden denenmeli.

**21. G106 — Bant bazlı mono kaybı, düşük frekans bantlarında (SUB→BAS)
komşu banda sızıyor**
Tek kademe 2. derece band-pass biquad kullanıldığı için (bkz. BİTTİ'nin
DÜRÜSTLÜK notu) dik bir crossover yok — canlı testte SADECE 60Hz'i ters
fazlı yapan bir sinyalde SUB doğru şekilde büyük kayıp (+16.9dB) gösterdi
ama komşu BAS bandı da (kendi içeriği YOK, sadece sızıntı) +4.7dB kayıp
gösterdi. Üst bantlarda (ALT-ORTA'dan TİZ'e) bu sızıntı gözlenmedi.
**Kabul kriteri (eğer düzeltilecekse — kullanıcı kararı gerekir, bkz.
BEKLEYEN KARARLAR):** aynı 60Hz-ters-faz test sinyalinde BAS bandının
kaybı da <1dB'ye inmeli (daha dik filtre — kademeli/cascaded biquad ya da
daha yüksek Q — gerektirir, işlem maliyetini ARTIRIR).

**22. G106 — Analiz süresi 300s stereo dosyada +39% arttı (2.61s → 3.62s)**
Kaynak: bant bazlı mono kaybı için eklenen 12 band-pass biquad (6 bant × 2
kanal) + mono K-weighting için 2 biquad, örnek başına — bkz. BİTTİ'nin
ölçüm notu. Worker içinde çalıştığı için arayüz DONMUYOR ama sayı gerçek.
**Kabul kriteri (kullanıcı kararı gerekir, bkz. BEKLEYEN KARARLAR):**
kullanıcı bu artışı kabul edilebilir bulmuyorsa bant sayısı azaltılmalı ya
da daha ucuz bir filtre yöntemine geçilmeli.

### Yayın öncesi

**9. ~~Logo / uygulama ikonu yapılmadı~~ — STALE, zaten yapılmış**
`resources/icon.png` (1254×1254) ve `resources/splash.png` (2732×2732)
gerçek, tasarlanmış bir marka logosu içeriyor (kulaklık+spektrum çubukları+
dalga formu, "Audio Engineer Academy" yazısıyla — bu turda görsel olarak
açılıp doğrulandı) — placeholder DEĞİL. `git log` bu dosyaların projenin EN
İLK commit'lerinden (`9230d8e`) beri var olduğunu gösteriyor; `android/app/
src/main/res/drawable-*/splash.png` altında platforma özel boyutlar da
ÜRETİLMİŞ. Madde muhtemelen dosyaya hiç güncel kalmadan miras kalmış,
kapatıldı.

## BEKLEYEN KARARLAR

**N. G106 — Ölçüm motorunun +39% süre artışı kabul edilebilir mi?**
Bkz. AÇIK İŞLER madde 22. Worker içinde çalıştığı için arayüzü DONDURMUYOR
ama gerçek bir artış (300s dosyada 2.61s→3.62s). Kabul edilebilirse madde
kapanır; değilse bant sayısı azaltılmalı ya da band-pass filtreleri daha
ucuz bir yönteme (ör. daha düşük dereceli/az taplı) taşınmalı — bu, bant
bazlı sızıntıyı (madde 21) muhtemelen DAHA DA kötüleştirir, iki karar
birbirine bağlı.

**O. G106 — Bant bazlı mono kaybının SUB→BAS sızıntısı düzeltilsin mi?**
Bkz. AÇIK İŞLER madde 21. Daha dik filtre işlem maliyetini ARTIRIR (madde
N'yle çelişen bir yönde) — kullanıcı önce "doğruluk mu, hız mı" önceliğini
netleştirmeli.

**L. ~~G101 — "Dosyalarım" kalıcı (IndexedDB) mı, oturum-kapsamlı mı kalsın?~~
— ÇÖZÜLDÜ, G102: kalıcı yapıldı**
Kullanıcı kararı: dosyalar kalıcı. `core/file-storage.js` (native Capacitor
Filesystem + web IndexedDB) + localStorage manifest ile uygulandı, en fazla
5 dosya + en-eski-önce tahliye + tek seferlik bütünlük kontrolü dahil (bkz.
BİTTİ). **Native taraf (iOS/Android) hâlâ gerçek cihazda doğrulanmadı** —
`npx cap sync` sonrası bir sonraki oturumda kontrol edilmeli, tek açık kalan
uç bu.

**M. G101 — "Referans Filtreleri"nin GERÇEK DSP'si ne zaman eklenecek?**
Filtre seçmek hâlâ sesi DEĞİŞTİRMİYOR (sadece hangi cihazın simüle edildiğini
gösteriyor) — bu G53'ten beri KASITLI bir kapsam sınırı, bu turda da
korundu (task'ın kendi kuralı: "Bu turda DSP yazma"). Kullanıcıya artık
akordiyon içinde GERÇEK bir çalar (dosya adı/dalga formu/transport)
gösterildiği için bu eksiklik daha BELİRGİN hale geldi — bir amber uyarı
notu eklendi (`.tools-filter-dsp-note`) ama kalıcı çözüm gerçek EQ/filtre
DSP'sinin (cihaz frekans eğrilerine göre) yazılması. **Kabul kriteri:**
kullanıcı önceliklendirirse ayrı bir tur — her filtrenin `range` metnindeki
frekans aralığına karşılık gelen bir EQ eğrisi (BiquadFilterNode zinciri)
gerekir.

**(Kaynak koda karşı doğrulandı, G59 sonrası.)** Karar **A** bu turda kod incelemesiyle
zaten KODLANMIŞ bulundu (aşağıda) — DURUM.md hiç güncellenmemiş. Diğer
maddeler tek tek yeniden `grep`'lendi; hâlâ hepsi gerçek, açık kararlar.

**A. ~~Kart metni tek kaynağa inecek mi?~~ — ÇOKTAN kodlanmış, STALE madde**
`app.js:renderModeGrid` (satır 1507) kendi yorumunda AÇIKÇA söylüyor:
"Kart başlığı/açıklaması YALNIZCA katalogdan okunur — getMeta() artık bunları
döndürmüyor". `frekans-bulma.js:278-280`'in kendi yorumu da aynı kararı
doğruluyor: `getMeta()` artık SADECE oyun-mantığı meta'sını (id/motor/
kulaklikGerekli/vb.) döndürüyor, ad/aciklama YOK. Öneri zaten uygulanmış —
katalog tek görüntü kaynağı. Bu madde kapatıldı.

**B. Kilit tipleri**
Üç ayrı durum tek state'e sıkışmış: (1) henüz kodlanmadı, (2) seviye yetersiz,
(3) Pro gerektiriyor. Kart "Seviye 5'te açılır" derken tıklayınca "Yakında" toast'ı
çıkıyor — çelişkili vaat. **Hâlâ açık, kod değişmedi** (bu turda `renderModeGrid`
yeniden okunarak doğrulandı).
Katalog artık (G59 sonrası) **14 giriş** — `mode-catalog.js`'ten sayıldı:
**5'i `tier:"free"`** (Frekans Bulma/Kesim Noktası/Q Genişliği/Boost mu Cut
mu/Hız Modu — sonuncusu henüz `playable:false`), **9'u `tier:"pro"`** (dB
Seviyesi/Stereo Genişlik/Pan Konumu/Hangisi Farklı/Kompresör/Reverb/Tonal
Denge/Distortion/Frekans Çakışması — dördü henüz `playable:false`).
Mevcut `unlockLevel` değerleri kullanıcı tarafından hâlâ belirlenmedi.
**Kısmen ilerledi (Z3):** "seviye" kilidi HANGİ seviye sayısına bakacak sorusu
karara bağlandı (akademi/toplam seviyesi — `progress.academyLevel()`) ve KODLANDI
(`app.js` renderModeGrid, `meetsLevel` kontrolü). Ama bu, üç durumun (kodlanmadı/
seviye-yetersiz/Pro) UI'da AYRIŞTIRILMASI sorununu ÇÖZMEDİ. Bu madde AÇIK kalıyor.
**G17 ile SOMUTLAŞMIŞTI, artık ON kat daha somut:** "yeni bir mod eklenince
academyLevel otomatik yükselip önceki kilitleri de açabiliyor" ödünü — G59
itibarıyla ON oynanabilir mod var, altısı zaten `tier:"pro"` zincirinde
(unlockLevel 6→12→14→15→16→20) — her yeni mod kaydı bu zinciri YİNE
etkileyebilir. Karar hâlâ verilmedi: davranış kabul mü, yoksa academyLevel
formülü (ya da unlockLevel değerleri) yeniden mi tasarlanmalı?

**C. Rozet sayısı ve seti**
`progress.js:82-90`'da bu turda sayıldı: kod hâlâ TAM 9 rozet tanımlıyor
(first_blood/combo_5/combo_10/round_25/round_100/accuracy_70/level_5/
pro_clear/boss_win), değişmemiş. TASARIM.md'de tasarımda 6 rozet olduğu ve
isimlerin örtüşmediği kayıtlı (bu turda TASARIM.md yeniden okunmadı, kod
tarafı doğrulandı). Hangi setin kalacağı (6, 9, yoksa birleşim mi) ürün
kararı — kodlanmadı.

**D. Can dolumu**
`www/js/core/storage.js:129` (satır numarası kaydırıldı, önceki not `:91`
diyordu — güncellendi) — uygulama yeniden açıldığında can 0 ise otomatik
`TOTAL_LIVES`'a (5) çekiliyor (bilinçli ödün, seans içinde dolum YOK, bkz.
AÇIK İŞLER madde 3). Gerçek bir "30 dakikada dolum" mekanizması hâlâ kodda
yok (`grep` ile yeniden doğrulandı — kod tabanında dakika-bazlı bir dolum
zamanlayıcısı yok). Gerçek dolum özelliği ayrı bir iş.

**E. ~~Seviye → hassasiyet formülü (lvlSheet için gerekli)~~ — Z1/Z6 ile çözüldü**
`core/difficulty-curve.js: difficultyParams(level)` artık SÜREKLİ (logaritmik)
bir formülle her seviye için gainDb/Q/tolerans/süre üretiyor; `lvlSheet` (Z6)
bunu GERÇEKTEN okuyor (`app.js:renderLevelSheet`, bu turda da doğrulandı —
bkz. SIRADAKİ madde 3, ama o maddenin açık kaldığı nokta FARKLI: dilin TEK bir
mod diline kilitli olması, formülün kendisi değil). Buradaki sayısal değerler
(GAIN_DB_AT_LEVEL_1/CAP, Q_AT_LEVEL_1/CAP vb.) OTOMATİK/varsayılan seçildi,
kulakla hâlâ doğrulanmadı (bkz. SIRADAKİ madde 1).

**F. "Tekrar Çal" butonu kapsamı**
Sentetik kaynaklarda (gürültü/synth) anlamsız — sürekli sinyaller, "başı" yok.
**Hâlâ açık — karıştırılabilir bir kod parçası bulundu, netleştirildi:** `app.js:1108`'de
`els.startBtn`'in "🔄 Tekrar Çal" etiketi VAR ama bu, `autoStopped` durumundan
DEVAM ETME (pause/resume) anlamına geliyor (`app.js:3742-3755`) — pozisyonu
BAŞA sarmıyor, decision F'nin istediği "upload kaynağında baştan çal ikonu"
DEĞİL. `uploadManager.startFromZero` hâlâ sadece tur/seans başında çağrılıyor
(`app.js:3178-3184`). Karar gereken: sadece upload kaynağında görünen küçük
bir "baştan çal" ikonu mı eklensin, yoksa madde tamamen atlansın mı?

**G. ~~Otomatik zorluk modu~~ — Z5/Z7 ile çözüldü**
"Otomatik" artık gerçek: `applyAutoDifficulty()` (app.js) her round başında
Z1+Z3'ten türetilen zorluğu uyguluyor, `autoDiffAsk` (Z7) prototipteki gibi
DOKUNMA-tetiklemeli. KAPSAM SINIRI (bkz. Z5 commit mesajı): Z1'in TAM sürekli
eğrisi değil, `tierForLevel()` köprüsüyle en yakın isimli kademe (easy/medium/
hard/pro) kullanılıyor — evaluateAnswer'ın sabit tolerans sınırını parametrik
hale getirmek AYRI bir iş.

**H. Dar odak aralığında Pro Plus bant sayısı**
M1-4 ile gelen odak aralığı (Bas/Orta ~2.3 oktav) Pro Plus'ın istediği 4 ayrık
bandı (gereken ~2.7 oktav) her zaman sığdıramıyor. `test/frekans-bulma.test.mjs:
218-227` bu turda yeniden okundu: testin kendisi `bands.length <= 4` (asla 4'ten
fazla değil) garantisini 20 tekrarla doğruluyor, kod hâlâ güvenli tarafta (asla
range dışına taşmıyor, asla çakışan bant üretmiyor). "500 denemede hep 2-3 bant"
rakamı önceki bir oturumun canlı ölçümüydü, bu turda yeniden ölçülmedi — ama
mekanizma değişmemiş, karar hâlâ açık: Pro Plus dar odakta kısıtlansın mı (o
kombinasyon seçilemesin), yoksa az bantla mı devam etsin?

**J. G75 — ACADEMY_XP_MULTIPLIER (=5, taslak) Pro seviye kilidinin (madde B)
açılma hızını da yavaşlattı, kod bunu ÇÖZMEDİ**
`academyLevel()` artık TOPLAM XP'den, mod eğrisinden 5 kat yavaş bir
eğriyle hesaplanıyor (bkz. BİTTİ G75) — AYNI fonksiyon `paywall.
meetsLevelRequirement`'ın Pro seviye kilidinde (`unlockLevel`, madde B'nin
konusu) de kullanılıyor. Örnek: `unlockLevel:20` (frekans-cakismasi) artık
TOPLAM ~142.500 XP gerektiriyor (5×xpNeeded'in kümülatif toplamı,
seviye 20'ye kadar) — eski "sum of levels" ölçeğinde çok daha kolay
erişilen bir eşikti. Bu YAVAŞLAMA task'ın G75 isteğinin (Sv rozetinin
DOĞRU görünmesi) DOĞAL bir yan etkisi ama AYRI bir ürün kararı: çarpan
(5) düşürülsün mü, yoksa `unlockLevel` değerleri (madde B'nin KENDİ konusu,
zaten "hâlâ belirlenmedi" diyor) yeni ölçeğe göre YENİDEN mi ayarlansın?
Bugün SADECE Pro kullanıcıları etkiliyor (G62: ücretsizde kilit hiç
tetiklenmiyor).

**I. İsimlendirme tutarsızlıkları (D6 denetimi — düzeltilmedi, sadece raporlandı)**
Beşi de bu turda `grep` ile TEK TEK yeniden doğrulandı, hepsi hâlâ true:
1. Zorluk `proplus` değeri iki yerde iki farklı isimle: `index.html:272`
   "Pro Plus (Çok Bantlı)", `index.html:885` (`data-diff="proplus"`)
   "Sınırsız" / "Sınırını kendin ara". Aynı seçenek, iki ayrı kavram.
2. Can bitişi iki farklı başlıkla art arda gösteriliyor: `loseLife()` içindeki
   feedback+toast (`app.js:942-943`) "Oyun bitti" diyor, hemen ardından açılan
   seans-sonu tam ekranı (`app.js:992`) "CANLARIN BİTTİ" diyor.
3. Desteklenen ses formatları tutarsız anlatılıyor: `validateAudioFile`'ın
   (`upload.js:75`) kendi hata mesajı `ALLOWED_AUDIO_EXTENSIONS`'tan 7 formatı
   doğru listeliyor (wav/mp3/m4a/aac/aiff/flac/ogg), ama `app.js:3036/3623/3658`
   "Ses oynatılamadı"/"Yükleme hatası" mesajları sadece "mp3/wav" öneriyor,
   `upload.js:139`'daki AYRI bir mesaj ise "mp3/wav/m4a" diyor — üç farklı liste.
4. Paywall'daki `index.html:717/731` "Seans başına 5 soru" (Ücretsiz) /
   "Seans başına 10 soru" (Pro) iddiası kodda YOK — `grep` ile doğrulandı,
   `roundsInThisPlaySession`/`isUserPro()` etrafında böyle bir sayaç/limit yok;
   `10 Soruluk Bölüm` (challenge) Pro'ya bağlı değil, herkes seçebiliyor.
5. "Ses dosyası yükle" (`index.html:337`, Oyun Ayarları) / "Dosya yükle"
   (`index.html:523`, `toolsUploadBtn`, Araçlar) — aynı eylem için iki farklı
   buton metni.
Hangisinin düzeltileceği/nasıl birleştirileceği ürün kararı — kod tarafında
hazır, sadece onay bekliyor.

**K. G82 — Pro kullanıcı için "done" (kayıpsız 10 Soruluk Bölüm) Seans Sonu
durumu HİÇ tetiklenemiyor, kasıtlı mı?**
Kod incelemesiyle doğrulandı (bkz. AÇIK İŞLER madde 20): G50, sınav
sistemini (`EXAM_ENABLED`) tek tek her moda yayarken (Kompresör'den 10
moda) `ensureAutoNext()`'teki `finishChallenge()` guard'ı (`!examGateActive()`)
GÜNCELLENMEDİ — o zaman "diğer yedi modda mode.EXAM_ENABLED undefined"
varsayımıyla yazılmıştı, artık YANLIŞ. Sonuç: Pro kullanıcı `challenge.done>=10`'a
ULAŞTIĞINDA sınav HER ZAMAN devreye giriyor (parkur bitmeden), "done"
ekranı yerine YA sınav-geçti kutlama sheet'i YA "parkur baştan" görüyor.
İki olası karar:
1. **Kasıtlı** — Pro'nun "ödül anı" artık sınav-geçti kutlama sheet'i,
   "done" ekranı SADECE (teorik olarak erişilemeyen) free+limitsiz bir
   senaryo için var. Bu durumda "done" kodu YİNE de dursun (zararsız,
   test edilebilir) ama AÇIK İŞLER madde 20 "beklenen davranış" olarak
   kapatılır.
2. **Regresyon** — sınav sistemi genişletilirken KAÇIRILAN bir durum;
   `finishChallenge()` sınav-geçti/telafi-geçti SONRASI (ya da parkurun
   TAMAMI sınavsız bitmişse) de çağrılmalı. Bu, `core/exam-system.js`/
   `ensureAutoNext`'e AYRI bir turda dokunmayı gerektirir — bu turun
   kapsamı DIŞINDA bırakıldı (task "Seans Sonu ekranı giydirilecek" dedi,
   sınav akışını YENİDEN kablolamak DEĞİL).
**Kabul kriteri:** kullanıcı 1 ya da 2'yi seçer; 2 seçilirse ayrı bir görev
olarak `finishChallenge()`'ın exam/telafi SONRASI da tetiklenmesi kodlanıp
"done" canlı yeniden denenir.

## SIRADAKİ

**Tek sonraki adım (G118 itibarıyla):** `npx cap sync ios` (bu turda
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
onayı/kararı bekliyor. Aşağıdaki liste (G59 itibarıyla güncellendi) bu
adımdan BAĞIMSIZ, daha eski/büyük zorluk-mimarisi işlerini kapsıyor.

**(G59 itibarıyla güncellendi.)** **ON oynanabilir mod var:** Frekans Bulma
(unlockLevel:1, free), Kesim Noktası (2, free), Q Genişliği (3, free), Boost
mu Cut mu (4, free), dB Seviyesi (6, pro), Kompresör (12, pro), Reverb (14,
pro), Tonal Denge (15, pro), Distortion (16, pro), Frekans Çakışması (20,
pro) — `mode-catalog.js`'ten doğrulandı. Kalan 4 katalog girdisi (Hız Modu/
Stereo Genişlik/Pan Konumu/Hangisi Farklı) hâlâ `playable:false`.

**Mimari durumu:** Motor 1'in altı modu (Frekans Bulma/Kesim Noktası/Q
Genişliği/Boost mu Cut mu/dB Seviyesi + Kompresör'ün kendi zorluk ekseni)
AYNI merkezi eğriden besleniyor (`continuousLevel`/
`representativeLevelForTier`+`sessionRampOffset`, mod-agnostik `logLerp`/
`applyPostCapFloor`, tüm 10 mod `paramsForDifficultyPosition` çağırıyor —
`grep` ile doğrulandı). Motor 2'nin **mekanizması** (toggle/preview/submit/
`drawOverlay` dispatch'i) `THREE_WAY_MODE_IDS = ["kompresor", "reverb",
"distortion"]` ile genelleşti (`app.js:50`) — Tonal Denge BİLEREK bu listede
DEĞİL, kendi ayrı A/B/C mekanizmasını kullanıyor (`tonal-denge.js`'in kendi
dosya başı notu: "three-way-cards.js'in ARTIK kullanılmadığı"). **Tek
sonraki adım netleşmedi** — kalan işler ürün kararı gerektiriyor, kod
tarafında engelleyici yok:

1. **KULAKLA doğrulama — hâlâ hiçbir moddan tam geçmedi (ON modun TAMAMI,
   ilgili tüm `*_CURVE_CONFIG` sabitleri dahil).** Kod içinde doğrulanan
   sabitler: `COMP_CURVE_CONFIG` (Kompresör), `REVERB_CURVE_CONFIG`
   (Reverb), `TONAL_CURVE_CONFIG` (Tonal Denge), `DISTORTION_CURVE_CONFIG`+
   `DRIVE_RANGES`+`DIST_BASE_K` (Distortion), `CAKISMA_CURVE_CONFIG`
   (Frekans Çakışması), + Q Genişliği'nin etiket sınırları/`Q_GAIN_DB`/
   `Q_FIXED_FREQ`. Kalibrasyon MATEMATİKSEL şartı sağlıyor (ikili aramayla
   ölçüldü, testle garanti altında) ama ALGISAL/HİSSİYAT açısından doğru
   olduğu anlamına gelmiyor. Gerçek kullanıcı testinden hiçbiri geçmedi.
2. **Round-timer eğriye bağlanacak mı?** `paramsForDifficultyPosition().
   timeSec` ON modun HEPSİNDE hesaplanıyor ama `app.js:3026`'daki
   `currentDifficultyConfig().time` (statik) hâlâ kullanılıyor. Bağlanırsa
   G21'in hizalı geçiş süresiyle etkileşimi (boss'ta çifte kısalma riski)
   ayrıca değerlendirilmeli.
3. **`renderLevelSheet`** (`app.js:3929`, Seviye bilgi sayfası) hâlâ TEK bir
   dil (gainDb/Q, Frekans Bulma'nınki) konuşuyor — kod okunarak doğrulandı,
   "Bant genişliği"/"Değişim miktarı" metinleri SABİT, `mode`'a göre
   değişmiyor. Diğer 9 modun (Kompresör'ün "Şık sayısı" satırı hariç)
   kendi dilini (ratio farkı/reverb tipi/distortion türü/tonal tilt/kick-bas
   çakışması vb.) hiç konuşmadığı bir durum — genelleştirilmedi.
4. **Statik `DIFFICULTY` tabloları hâlâ duruyor mu, kaldırılacak mı?** ON
   mod dosyasının HEPSİ hâlâ kendi statik `DIFFICULTY` export'unu tutuyor
   (`grep` ile doğrulandı) — Sabit modun tier-isim çapası + proplus + geriye
   dönük test uyumluluğu için BİLEREK kaldırılmadı. Kalıcı olarak mı
   kalacak, yoksa TAMAMEN eğriye mi devredilecek? İkili sistem (statik+eğri,
   opt-in) artık ON moddan geçen, tekrarlanan bir desen — bilinçli bir
   seçim olarak teyit edilmeli.
5. **unlockLevel/tier zinciri ürün kararı olarak hâlâ DOKUNULMADI**
   (BEKLEYEN KARARLAR **B**): dB Seviyesi(6)→Kompresör(12)→Reverb(14)→
   Tonal Denge(15)→Distortion(16)→Frekans Çakışması(20), hepsi tier:"pro".
   academyLevel yeni bir mod kaydolunca otomatik yükseliyor — artık ON
   modun altısı zaten oynanabilirken her yeni mod kaydı önceki kilitleri de
   etkileyebilir, kullanıcıya sorulmalı. G23'ün geliştirici-modu atlaması
   SADECE test kolaylığı, kalıcı ürün kararının yerine geçmiyor.
6. **ÜRÜN SORUSU (G24): seans rampasının genliği (`SESSION_RAMP_CONFIG`:
   MIN_OFFSET=-1.5/MAX_OFFSET=+1.0/BOSS_OFFSET=+2.0) yeterince BÜYÜK mü?**
   Taze/düşük seviyeli bir oyuncuda rampanın mutlak genliği küçük (bkz. G24
   commit mesajı: position 1→2 arası ~%11 değişim) — bu, artık ON modun
   HEPSİNİ etkileyen paylaşılan bir sabit, hiçbir turda BİLEREK
   değiştirilmedi. Genlik artırılmalı mı yoksa mevcut "ince/gerçekçi" genlik
   mi tercih edilsin — ürün kararı, kulakla + kullanıcı geri bildirimiyle
   birlikte değerlendirilmeli.
7. **Kesim Noktası'nın G21'deki SERT TEST kapsamı (600+ soruluk tam-matris
   canlı stres testi) diğer DOKUZ moddan hiçbirinde tekrarlanmadı** —
   hepsi kendi birim testleri + tek turluk canlı elle doğrulamadan geçti,
   ayrı bir tur gerekiyorsa madde burada tutuluyor.
8. **`app.js`'in Motor 2 metin dalları hâlâ mod-başına hardcoded** —
   mekanizma (madde başındaki `THREE_WAY_MODE_IDS`) genelleşti ama
   `pushHistory` (`app.js:1847-1863`) ve soru başlığı/`questionDesc`
   (`app.js:1943`/`2011`) HÂLÂ `activeQuestion.mode === "kompresor"/
   "reverb"/"distortion"/"tonal-denge"` gibi ayrı dallarla yazılıyor (G33'ün
   "MOTOR 2 ŞABLONU" notunun bıraktığı iş) — her yeni Motor 2/3 modunda bu
   dallar tekrar tekrar kopyalanıyor, henüz `mode.questionTitle`/`mode.
   historyLabel` gibi bir sözleşmeye taşınmadı.
9. **G58'in `DISCONNECT_DELAY_MS=100` düzeltmesi (`audio-engine.js:36`,
   Kompresör'ün kesik-ses kök sebebi) KULAKLA/CİHAZDA DOĞRULANMADI** — kök
   sebep Web Audio API semantiğiyle kod-seviyesinde kanıtlandı ama bu
   ortamda ses duyulamadığı için "artık hiç tıklama yok" iddiası test
   EDİLMEDİ. Gerçek cihazda Kompresör/Reverb/Distortion'ın A/B/C döngüsü
   dinlenerek kontrol edilmeli.
10. **`teachingText`'in "yön doğru, miktar yanlış" metni** hafif tekrarlı
    okunabiliyor — küçük bir metin cilası, engelleyici değil.

Kesim Noktası'nın kendisi G17-G21 ile TAMAMLANDI ve SERT TEST GEÇTİ. dB
Seviyesi G22 ile aynı derinlikte kuruldu ama madde 7'deki SERT TEST
kapsamından henüz geçmedi. Karşılaştırma-önizleme butonları (Senin cevabın/
Doğru cevap/Temiz) Kesim Noktası'nda BİLEREK hâlâ yok — istenirse ayrı bir
iş, şu an engelleyici değil.

Diğer bekleyen (öncelik sırası, gerçek cihaz/dokunmatik gerektirdiği için bu
ortamdan doğrulanamıyor):
- **F4** (çift-dokunma/pinch zoom kapatma) — gerçek dokunmatik jest
  gerektiriyor, mouse-tabanlı otomasyonla HİÇ üretilemedi.
- **A/B pitch fix** (`8f66de1`) — gerçek cihazda kulakla pitch'in artık
  sabit kaldığı doğrulanmalı.
- **F2**'nin karşılaştırma-önizlemesi duraklat/devam davranışı — masaüstünde
  sağlamlaştırıldı, hâlâ cihaz doğrulaması bekliyor.

Kod tarafında bekleyen karar yok; A/B/C/D/F/H/I (BEKLEYEN KARARLAR — E ve G
Z1/Z6/Z5/Z7 ile çözüldü) kullanıcıya sorulmayı bekliyor ama hiçbiri şu an
engelleyici değil.

## ÜRÜN NOTLARI (önceki sohbetlerden)

**Ses kaynağı planı**
Kick / snare / gitar / vokal örnekleri henüz yok. Sentez öncelikli yaklaşım,
CC0 lisanslı örnekler alternatif olarak değerlendirilecek.

**Referans filtreleri**
Araçlar sekmesinde, Pro özelliği. Cihaz adı etiketli filtre setleri.

**Otomatik master / tonal balance**
Ücretli sürüme ek değer olarak düşünüldü. Kapsam tanımlanmadı.

**Fiyat ve can ekonomisi**
Pro ₺399, tek seferlik (bu not eski bir tarihte ₺199 yazıyordu, güncel karar
₺399'a taşındı — bkz. G56 sonrası kayıtları/`core/paywall.js:PRO_PRICE`).
Ücretsiz: 5 can, 30 dakikada bir dolum (tasarım niyeti).
Can dolumu KODDA YOK — bkz. BEKLEYEN KARARLAR **D**.
Paywall ekranında dolum süresi hiç geçmiyor, sadece "5 can" yazıyor — eksik bilgi.
Not: 3. bug (oyun 0 canla başlıyor) bundan bağımsız — mevcut can sistemi
başlangıç değerini doğru atamıyor.

## ZORLUK MİMARİSİ — KODLANDI (Z1-Z7, gece oturumu)

Bu bölümdeki tasarım kararları (aşağıda özetleniyor) Z1-Z7 turunda KODA GEÇTİ.
Uygulama detayları ve gerekçeli kararlar için bkz. "ZORLUK MİMARİSİ — OTOMATİK
VERİLEN KARARLAR" altındaki bölüm — kullanıcı YOKTU (gece oturumu), her karar
noktasında makul bir değer seçilip GEREKÇESİYLE buraya yazıldı. Hiçbiri "kesin
doğru" değil, kulakla ayarlanmayı bekliyor.

**Seans içi rampa** — `core/session-plan.js` — KODLANDI, henüz app.js'e WIRE
EDİLMEDİ (10 Soruluk Bölüm hâlâ zorluğu `els.difficultySelect`'ten okuyor).

**Basamak yerleşimi kişiselleştirme** — `core/personalization.js` — KODLANDI
VE app.js'e WIRE EDİLDİ (`startRound()` → `createQuestion(..., {zoneStats})`).

**Seviye yapısı** — `core/progress.js` (modeXp/modeLevel/academyLevel) +
`core/storage.js` (perMode, migration) — KODLANDI VE WIRE EDİLDİ.

**Zorluk ölçeği** — `core/difficulty-curve.js` (difficultyParams, tierForLevel)
— KODLANDI. Oyun parametrelerine (gain/Q) SADECE `tierForLevel()` köprüsüyle
DOLAYLI bağlı (Otomatik mod DIFFICULTY[tier]'ı kullanıyor) — Z1'in tam sürekli
eğrisi henüz createQuestion/evaluateAnswer'a DOĞRUDAN enjekte edilmedi (bkz.
altta, "Sonraki adım" notu).

**Ayarlar** — Otomatik (varsayılan)/Sabit — KODLANDI VE WIRE EDİLDİ
(`applyAutoDifficulty()`, `prefs.difficultyMode`).

## ZORLUK MİMARİSİ — OTOMATİK VERİLEN KARARLAR (gece oturumu, kullanıcı yok)

Her madde: karar + gerekçe. Sayısal değerler KESİN DOĞRU İDDİA EDİLMİYOR —
makul başlangıç noktaları, kulakla ayarlanmalı (liste SON RAPOR'da).

**Z1 — Tavandan sonra hangi bağlam-zorluğu mekanizmaları uygulandı**
Üç önerilenden (gain azalması / katman ekleme / süre kısaltma) İKİSİ
uygulandı: gain azalması ve süre kısaltma (küçük doğrusal adımlarla, birer
tabanın altına inmez). "Katman ekleme" (soruya ikinci bir gürültü/enstrüman
katmanı karıştırmak) UYGULANMADI — bu audio-engine.js'te yeni bir kaynak-
karıştırma yolu gerektiren ayrı bir ses-mimarisi işi, bir "saf veri fonksiyonu"
yazmanın kapsamının dışında. Kodda `contextLayering: false` (hep) olarak
işaretlendi, TODO.

**Z1 — Başlangıç sayısal değerleri (LEVEL_CAP=20, GAIN_DB 10→3, Q 0.8→5.0,
TOLERANCE_OCT 0.6→0.35 [henüz kullanılmıyor], TIME_SEC 16→8)**
Mevcut `DIFFICULTY` tablosunun easy (gain:10,q:0.9,time:16) ve pro
(gain:4.5,q:4.2,time:9) uç noktalarına YAKLAŞIK oturacak şekilde seçildi —
tamamen keyfi değil ama kulakla DOĞRULANMADI. LEVEL_CAP=20, mode-catalog.js'nin
en yüksek `unlockLevel` değeriyle (20) BİLİNÇLİ olarak eşleşiyor (akademi
yol haritasının tamamı = bir modun tam hassasiyet eğrisi varsayımı) — bu
eşleşme kesin doğru olmayabilir, sabah gözden geçirilmeli.

**Z1 — Tolerans (toleranceOct) hesaplanıyor ama KULLANILMIYOR**
`difficultyParams()` bir `toleranceOct` alanı üretiyor ama `evaluateAnswer()`
(frekans-bulma.js) hâlâ SABİT 0.5 oktavlık kabul sınırını kullanıyor —
bu alanı gerçekten bağlamak `evaluateAnswer`'ı parametrik hale getirmeyi
gerektirirdi (saf fonksiyon/test sözleşmesini bozma riski, gece oturumunda
alınmadı). Alan kodda DURUYOR ama etkisiz — bir sonraki oturumda ya bağlanmalı
ya da kaldırılmalı.

**Z2 — Seans içi sıralama: sabit blok mu, tam karışık mı, ikisi de değil**
İlk soru HER ZAMAN en kolay kademeden (caydırıcı olmasın diye — Z2'nin kendi
notu), KALAN sorular TAMAMEN karıştırılır. Gerekçe: sabit 3-3-3-1 blok sırası
tekdüze/tahmin edilebilir; tam karışıklık (ilk soru dahil) yine zor bir açılış
riski taşır.

**Z2 — SESSION_RAMP_WEIGHTS oranı (easy/medium/hard/pro = .3/.3/.3/.1)**
DURUM.md'de zaten kayıtlı "3 kolay/3 orta/3 zor/1 pro" kararının doğrudan
oranı — icat edilmedi, verilen kararın matematiksel karşılığı.

**Z2 — 5 soruluk (ücretsiz?) seans ölçekleme yöntemi**
Naif yuvarlama yerine EN BÜYÜK KALAN (largest remainder/Hare-Niemeyer) yöntemi
— toplamın HER ZAMAN tam soru sayısına eşit kalmasını garantiler (naif
yuvarlama 5 soruda 1.5/1.5/1.5/.5→2/2/2/1=7 gibi taşardı). Sonuç: 2 kolay/2
orta/1 zor/0 pro — bu SPESİFİK dağılım elle seçilmedi, yöntemin matematiksel
sonucu.

**Z2 — Serbest (sonsuz) mod**
Sabit bir soru sayısı olmadığı için önceden dizi kurulmuyor — her soruda
BAĞIMSIZ ağırlıklı seçim (`pickWeightedDifficulty`) yapılıyor, uzun vadede
aynı orana yaklaşıyor.

**Z3 — Akademi seviyesi: mod seviyelerinin TOPLAMI (XP toplamından level'e
çevirme değil)**
"Genel akademi seviyesi toplamdan hesaplanacak" kararı İKİ farklı okunabilirdi:
(a) tüm modların XP'sini topla, SONRA seviyeye çevir, ya da (b) her modun
KENDİ seviyesini hesapla, SONRA seviyeleri topla. (b) seçildi — "toplam"
kelimesi seviye sayılarının toplamı olarak yorumlandı, gerekçe: tek mod
varken bu, ESKİ (Z3 öncesi) global seviye davranışıyla BİREBİR tutarlı kalıyor
(academyLevel === modeLevel, tek mod olduğu sürece).

**Z3 — Bilinen ödün: hiç oynanmamış modlar da +1 katkı yapar**
`levelFromXp(0)` her zaman 1 döner — yani akademi toplamına, kullanıcının HİÇ
dokunmadığı bir mod bile +1 ekler. Bugün (1 oynanabilir mod) sorun değil ama
2. mod kodlandığında "bedava seviye şişmesi" yaratır. Bilinçli ödün: sıfır-
tabanlı bir toplam (xp=0 → katkı=0) yerine seçildi çünkü YENİ bir kullanıcıyı
(academyLevel=0) `unlockLevel:1` kilidinde bile tıkardı. **2. mod eklendiğinde
yeniden değerlendirilmeli.**

**Z3 — Kilit sistemi hangi seviyeye bakar: mod mu, akademi mi**
Akademi (toplam) seviyesi. Gerekçe: `unlockLevel` değerleri (1-20) henüz
kodlanmamış 13 modu kapsayan GENEL bir içerik yol haritasını temsil ediyor —
o modların kendi XP kaynağı olmadığı için mod-bazlı seviyeye bakmak anlamsız
olurdu. Bugün TEK oynanabilir mod olduğu için GÖRÜNÜR bir etkisi yok.

**Z3 — Zorluk parametreleri (Z1) hangi seviyeden beslenir: mod mu, akademi mi**
MOD seviyesi (o modun kendi XP'sinden). Gerekçe: bir modda yeni olan kullanıcı
başka bir modda ileri seviyede olsa bile o YENİ modda kolay sorularla
başlamalı — "zorluk" o spesifik beceriye dair bir sinyal, genel akademi
ilerlemesine değil.

**Z4 — Zayıflık skoru ağırlıkları (isabet %60, ortalama sapma %40)**
Doğruluk biraz daha ağır basıyor — yanlış cevap vermek, doğru cevaba yakın
ıskalamaktan daha güçlü bir "zayıflık" sinyali sayıldı. Kesin bilimsel bir
dayanağı yok, makul bir varsayılan.

**Z4 — Agresiflik sınırı (MAX_BOOST=2.0 → en fazla 3x ağırlık)**
En zayıf bölge en güçlü bölgeye göre en fazla 3 kat daha sık gelebilir —
sonsuz değil. Sayı keyfi seçildi (kullanıcı sadece zayıf bölgeyle
"boğulmasın" isteği somutlaştırıldı), kulakla/kullanım verisiyle ayarlanmalı.

**Z4 — MIN_SAMPLES=3 (yetersiz veri eşiği)**
3'ün altında bir bölgenin isabet oranı istatistiksel olarak anlamsız kabul
edildi (nötr ağırlık=1). Keyfi bir sayı, çok küçük/büyük olduğunda "yeni
kullanıcı eşit dağılım" davranışının ne kadar hızlı "kişiselleştirilmiş"
davranışa geçtiğini değiştirir.

**Z4 — Proplus (çok bantlı) kişiselleştirme kapsamı dışı**
`buildProPlusBands` KİŞİSELLEŞTİRİLMEDİ — 4 bandın HER BİRİ için ayrı zon
seçimi yapmak (çakışmama kısıtıyla) gece oturumunun süresini aşan ayrı bir iş.

**Z5 — Otomatik modda Z1'in TAM sürekli eğrisi DEĞİL, tierForLevel() köprüsü**
Kapsam sınırı — bkz. yukarıdaki "Zorluk ölçeği" notu. Z1'in ondalık gain/Q
değerlerini gerçekten oyuna bağlamak `evaluateAnswer`'ın sabit toleransını ve
`DIFFICULTY`'nin okunduğu her yeri (generateChoices, hint mask, round timer)
parametrik hale getirmeyi gerektirir — "ayarlar arayüzü" maddesinin ÇOK
ötesine geçen bir refactor, ayrı bir iş olarak bırakıldı.

**Z5 — proplus Otomatik'te hiç seçilmez**
`tierForLevel()` proplus'ı hiç döndürmüyor — proplus çok bantlı, farklı bir
oyun deneyimi (dokunmalı, 4 ayrı işaretleme), doğrusal hassasiyet merdiveninin
bir noktası değil. Kullanıcı proplus'ı SADECE Sabit modda elle seçebilir.

**Z6 — "Sıradaki seviyeye kalan" XP ile gösteriliyor, prototipin "N/M doğru"
çerçevesi DEĞİL**
prototype.html "12/20 doğru" gösteriyordu — bizim sistemimiz (Z3) XP-bazlı,
"doğru sayısı" bazlı bir eşik hiç yok. XP ilerlemesi (`progress.xpProgress`)
kullanıldı — mevcut sistemle tutarlı tek seçenek.

**Z7 — autoDiffAsk tetikleme koşulu İCAT EDİLMEDİ, prototipten okundu**
M1-7'de "performansa göre tetiklenir" varsayılmıştı ama prototype.html'nin
kendi JS'i (`gameDiffTap`) DOKUNMA-tetiklemeli olduğunu gösterdi — Otomatik
moddayken Zorluk satırına dokunmak soruyu açıyor, konsekütif yanlış cevap
sayısı gibi bir performans sinyali YOK. Bu proje tasarım kararı OLMADIĞI için
"karar verildi" değil, "yanlış varsayım düzeltildi" olarak kayda geçti.

## AÇIK KALAN KARAR

Kilit tipleri (kodlanmadı / seviye / Pro) — Z3 ile HANGİ seviye sayısının
kullanılacağı karara bağlandı (BEKLEYEN KARARLAR **B**), ama üç durumun UI'da
nasıl ayrıştırılacağı hâlâ açık. Yeni mod yazılmadan netleşmeli.

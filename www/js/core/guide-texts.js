// "i" bilgi/rehber sistemi — TÜM metinler TEK YERDE (level-sheet-terms.js'in
// AYNI mantığı: çeviri/düzenleme gelince SADECE bu dosya değişir, app.js'e
// hiç dokunulmaz). Bu metinler TASLAK — kullanıcı cihazda görüp düzeltecek
// (task'ın kendi notu), kesin/nihai metin İDDİA EDİLMİYOR.
//
// İKİ AYRI mekanizma besleniyor:
//  1. KALICI "i" ikonu (ana ekran + her mod kartı) — GENERAL_GUIDE +
//     MODE_GUIDE_TEXTS + MODE_OPTIONS_TEXTS. Tıkla-aç/tıkla-kapa, hiç solmaz.
//  2. GEÇİCİ SPOTLIGHT rehber turu — SPOTLIGHT_STEPS (G68'de basit ipucu
//     bandından YÜKSELTİLDİ: artık ekranın etrafı kararıp adım adım
//     öğeyi aydınlatan bir tur). Bir modun İLK HINT_ROUNDS_LIMIT (2)
//     round'unda görünür, sonra bir daha HİÇ otomatik açılmaz (kalıcı "i"
//     hep durur, bu SADECE ilk-kullanım çarkı). "Geç" ile her an atlanabilir.

// ---- 1. Ana ekrandaki genel "i" — sistemi bir bütün olarak anlatır ----
export const GENERAL_GUIDE = {
  title: "Nasıl çalışır?",
  sections: [
    {
      heading: "Nasıl çalışır?",
      body: "Her mod gerçek bir mix kararı öğretir. Sesi dinlersin, farkı ya da değeri bulursun. Cevaptan sonra neden öyle olduğu, mixte ne anlama geldiği açıklanır — sadece doğru/yanlış değil."
    },
    {
      heading: "Seviye ve zorluk",
      body: "Doğru bildikçe seviyen yükselir, sorular incelir. Zorluk kulağınla birlikte büyür — başta belirgin farklar, sonra profesyonel ince ayrımlar."
    },
    {
      heading: "Sınav ve bölüm geçme",
      body: "Üst üste 6 doğru → sınav hakkı. Sınavı geçersen bölüm atlarsın, bir üst seviyeye çıkarsın. 6 doğru toplanmazsa zayıf olduğun yerden kısa bir telafi turu gelir. Seviye atlamak hak etmekle olur — takılırsan zorlaşmaz, aynı yerde çalışırsın."
    },
    {
      // G190 DÜZELTMESİ (tutarlılık taraması) — "5 mod ücretsiz, sınırsız
      // oynanır" YANLIŞTI: mod ERİŞİMİ sınırsız (istediğin zaman bu 5 modu
      // açabilirsin) ama OTURUM UZUNLUĞU sınırlı (5 soru sonra durur, Bug 25/
      // G185) — ikisi KARIŞTIRILMIŞTI. Artık ayrı ayrı, doğru anlatılıyor.
      // Bug #40 (kullanıcı kararı: "Pro kullanıcı zaten Pro'yu kullanıyor,
      // 'Pro'da neler var' listesini okumasına gerek yok, ücretsiz kısıtlar
      // da anlamsız") — hideForPro:true, app.js:openGuideSheet bu bayrağa
      // göre Pro'da bu bölümü ATLAR. Metnin KENDİSİ değişmedi, ücretsiz
      // kullanıcı aynen görmeye devam ediyor.
      heading: "Ücretsiz ve Pro",
      hideForPro: true,
      body: "12 modun 5'i ücretsiz — istediğin zaman oynayabilirsin, ama her oturum 5 soru sonra durur. Reklam izleyip aynı oturuma 5 soru daha ekleyebilirsin (günde en fazla 3 kez), ya da Pro'ya geçip oturum sınırı olmadan oynayabilirsin. Pro'da ayrıca 12 modun tamamı, sınav ve seviye sistemi, kendi şarkını yükleyip çalışma ve analiz araçları açılır."
    },
    {
      // Bug #40 — Pro'da can sistemi hiç işlemiyor (app.js:loseLife
      // "if (isUserPro()) return" — can hiç azalmıyor), bu metin Pro'da
      // anlamsız. hideForPro:true, yukarıdaki "Ücretsiz ve Pro" ile AYNI
      // mekanizma.
      heading: "Can",
      hideForPro: true,
      body: "5 canın var. Biterse 30 dakikada bir dolar, ya da video izleyip hemen doldurabilirsin."
    }
  ]
};

// ---- 1b. Araçlar → Tonal Balance kartının "i"si — GENERAL_GUIDE'ın AYNI
// {title, sections} şekli, openGuideSheet() AYNI "intro + madde listesi"
// render yolunu kullanır (bkz. app.js). Bu bir MOD değil (MODE_GUIDE_TEXTS'in
// anahtar uzayında değil), Araçlar sekmesinin kendi kartı — o yüzden ayrı bir
// sabit, MODE_GUIDE_TEXTS'e KARIŞTIRILMADI.
export const TOOLS_TONAL_GUIDE = {
  title: "Tonal Balance",
  sections: [
    {
      heading: "Tonal Balance ne işe yarar?",
      body: "Mixinin frekans dengesini (bas/orta/tiz oranını) bir hedef eğriyle karşılaştırır. Sapma listesi hangi bölgenin fazla ya da eksik olduğunu, ne kadarlık bir düzeltme gerektiğini gösterir."
    },
    {
      heading: "Pop / EDM / Akustik",
      body: "Bu üç hazır hedef eğri şu an TASLAK — gerçek referans parçalardan yeniden türetilecek, kesin ölçüm değil. Kabaca bir fikir verir, kesin hedef olarak kullanma."
    },
    {
      heading: "Kendi Referansım",
      body: "Hazır eğriler yerine kendi beğendiğin bir referans şarkıyı yükleyip mixini ONUNLA karşılaştırmanı sağlar. 'Referans parça seç' ile kütüphaneden bir dosya seç ya da cihazdan yeni bir dosya yükle."
    },
    // #41 DÜZELTMESİ (kullanıcı kararı) — "Sapma listesi" ve "Bir bandı tek
    // başına dinle" AYNI grafikle ilgili (biri okumayı, diğeri dokunarak
    // etkileşimi anlatıyor) — hedef seçimi (yukarısı) hemen sonrasına
    // taşındı, çünkü kart açılır açılmaz (referans yüklemeden, varsayılan
    // hedefle) grafik zaten görünür oluyor. A/B/Ham mix dinleme kontrolleri
    // (aşağısı) referans yüklemeyi gerektiren daha ileri bir adım, sona
    // kaydı. İÇERİK değişmedi, SADECE sıra.
    {
      heading: "Sapma listesi",
      body: "Her bandın yanındaki dB değeri, o bandı referansa yaklaştırmak için gereken düzeltmeyi gösterir — kendi DAW'ındaki EQ'da aynı frekansa aynı yönde (boost/cut) uygulayabilirsin."
    },
    {
      heading: "Bir bandı tek başına dinle",
      body: "Grafikteki herhangi bir banda dokun — o bölge solo çalar, bandın miksteki gerçek ağırlığını (seviye telafisi olmadan, kısıksa kısık, baskınsa baskın) duyarsın. Tekrar dokununca solo kapanır."
    },
    {
      heading: "A · Eşitlenmiş mix",
      body: "Senin mixin, referansın tonal dengesine EQ ile benzetilmiş hâlde çalar — sapma listesindeki düzeltmeler burada gerçek zamanlı uygulanmış olarak duyulur."
    },
    {
      heading: "B · Referans",
      body: "Seçtiğin referans dosyasının kendisi, hiç işlenmeden çalar — A ile karşılaştırıp kulağınla farkı değerlendirebilirsin."
    },
    {
      heading: "Ham mix",
      body: "İşlenmemiş, orijinal mixini dinlemek istersen 'Mixini Yükle' kartındaki oynatıcıyı kullan — buradaki A/B sadece işlenmiş/referans karşılaştırması içindir."
    }
  ]
};

// ---- 2. Mod başına "i" — ne öğretir + nasıl oynanır + mix anlamı ----
// Anahtarlar mode-catalog.js'in id'leriyle BİREBİR aynı (10 oynanabilir mod).
export const MODE_GUIDE_TEXTS = {
  "frekans-bulma": "Hangi frekansın öne çıktığını bulursun. Sesi dinle, artırılan bölgeyi işaretle. Mixte problemli ya da eksik frekansı hızlı bulmak EQ'nun temelidir — kulağın frekansları tanıması her mix kararının başlangıcıdır.",
  "kesim-noktasi": "Bir sesin nereden kesildiğini (high-pass/low-pass) bulursun. Kesim frekansını yakala. Mixte gereksiz alt/üst bölgeyi temizlemek yer açar — kesim noktasını doğru duymak mix'i temiz tutar.",
  "q-genisligi": "EQ'nun ne kadar dar ya da geniş çalıştığını bulursun. Dar Q tek noktaya, geniş Q bölgeye dokunur. Cerrahi müdahale mi genel renk mi — Q'yu duymak müdahalenin karakterini belirler.",
  "boost-mu-cut-mu": "Bir frekansın artırıldığını mı kesildiğini mi ayırt edersin. Yön önemli: bir bölgeyi açmak (boost) ile bulanıklığı temizlemek (cut) farklı kararlardır.",
  "db-seviyesi": "İki ses arasındaki seviye farkını dB olarak bulursun. Mixte 1-2 dB bile dengeyi değiştirir — seviye farkını duymak gain staging ve balans için şarttır.",
  kompresor: "İki sesten hangisinin daha çok kompresyon yediğini bulursun. Kompresyon dinamiği kontrol eder — vokali öne çıkarır, davulu oturtur. En çok karışan konudur, kulağınla tanımak mix'in oturmasını sağlar.",
  reverb: "Sese ne kadar reverb verildiğini ayırt edersin. Reverb derinlik ve mekan katar — ama fazlası mix'i uzaklaştırır, bulanıklaştırır. Doğru miktarı duymak alanı yönetmektir.",
  "tonal-denge": "Bozulmuş bir sesin tonal dengesini kaydırıcılarla düzeltirsin — bas mı fazla, tiz mi eksik, kulağınla nötrle. Gerçek mix işi budur: referansla karşılaştır, dengesizliği duy, düzelt. Kendi mix'ini de yükleyip çalışabilirsin.",
  "frekans-cakismasi": "İki ses aynı frekansta çakışınca mix bulanıklaşır. Nerede çakıştıklarını bul, hangisinden keseceğine karar ver, kes. Gerçek mixin en klasik problemi — kick+bas, vokal+gitar çakışmasını çözmek mix'i açar. Kendi iki sesini de yükleyebilirsin.",
  distortion: "İki sesten hangisinin daha çok saturation/distortion taşıdığını bulursun. Saturation sıcaklık ve karakter katar (tube, tape), distortion sertlik. Türü ve miktarı duymak analog renk ile kontrolsüz bozulmayı ayırmaktır.",
  "pan-konumu": "Sesin stereo alanda nereden geldiğini bulursun. Pan kararı mix'te alan açmak içindir — iki enstrüman aynı frekans bandında çakışıyorsa biri sağa biri sola alınır. Kick, bas, vokal ve snare genelde merkezde kalır; konumu doğru duymak mix'te kimin nerede durması gerektiğini öğretir.",
  "stereo-genislik": "İki mono kaynağın zıt yönlere yerleştirilmesiyle oluşan stereo görüntünün ne kadar geniş olduğunu bulursun. Genişlik derinlik ve alan katar ama abartılırsa mono uyumu bozulur — kulüpte ve telefonda mix çöker. Bu, Araçlar'daki mono uyum ölçümüyle AYNI konuyu kulakla öğretir."
};

// ---- 2b. Mod başına "i" — OYUN SEÇENEKLERİ (G69) ----
// MODE_GUIDE_TEXTS'in ALTINA eklenir (ne öğretir metnine DOKUNULMADI, app.js
// bunu AYRI bir bölüm olarak render ediyor). Her satır KODDA GERÇEKTEN VAR
// olan seçeneklere göre yazıldı — uydurma YOK, kaynak kontrolü aşağıda:
//  - Kaynak/upload: TÜM modlarda `getMeta().uyumluKaynaklar` "upload" içerir
//    (compatibleSourceIds() varsayılanı hariç TUTMUYOR — bkz. source-catalog.js),
//    TEK istisna Frekans Çakışması (kendi ayrı kaynak-ÇİFTİ + "own" iki-dosya
//    upload'ı var, uyumluKaynaklar BİLEREK boş, bkz. frekans-cakismasi.js).
//  - "Karıştır" (mixToggle): pickRoundSource() (app.js) SADECE tek-kaynak
//    `sourceSelect`'i okur — Frekans Çakışması bunu HİÇ kullanmaz (kendi
//    cakismaPairSelect'i var), bu yüzden cakisma metninde YOK. Tonal Denge'nin
//    kaynak havuzu (`only:["groove","upload"]`) "Karıştır" açıkken upload HARİÇ
//    tutulduğundan (bkz. pickRoundSource: `s.kind !== "upload"`) TEK aday
//    ("groove") kalır — fiilen etkisiz, bu yüzden Tonal Denge metninde de YOK.
//  - Dokunmalı/Şıklı format seçimi: SADECE Frekans Bulma'da GERÇEK bir seçim
//    (isChoiceFormat() diğer 9 modu HER ZAMAN şıklıya zorluyor, chip'in
//    kendisi app.js:syncAnswerFormatVisibility ile o 9 modda GİZLENİYOR).
//  - Odak aralığı (Bas/Orta/Tiz/Tüm spektrum): SADECE Frekans Bulma'da
//    (`mode.FOCUS_RANGES` sadece frekans-bulma.js'te tanımlı).
//  - "A/B Test" (dry/işlenmiş karşılaştırma): cakisma HARİÇ diğer 9 modda
//    `#abToggle` görünür (bkz. syncCakismaVisibility) — three-way üç modda
//    (Kompresör/Reverb/Distortion) AYNI buton A/B/C döngüye dönüşür.
//  - Frekans Çakışması'nın "Önce/Sonra" karşılaştırması SADECE stage 3'te
//    doğru cevap sonrası açılır (`#cakismaCompare`) — mevcut, ayrıca yazıldı.
//  - G190 ("i" metinleri taraması, kullanıcı kararı) — "Durdur'a basıp cevap
//    verirsen geri bildirim kapanmaz" HER 12 modda EKLENDİ, Kompresör/
//    Reverb/Distortion DAHİL. Bu üçünde round aktifken "Durdur" butonu
//    (`#startBtn`) DOM'da GİZLİ (bkz. app.js:updateStartBtnLabel,
//    `mode.THREE_WAY && activeQuestion`) — yani bu ÜÇÜNDE senaryo AYNI
//    yoldan tetiklenemez, ama davranışın KENDİSİ (autoStopped=true iken
//    cevap verilirse ensureAutoNext()'in erken dönmesi) mode-bağımsız,
//    KOD SEVİYESİNDE hâlâ orada — kullanıcının kendi kararı: metin bu üç
//    modda da dursun (tutarlılık, gelecekte Durdur'a başka bir yoldan
//    ulaşılabilir hâle gelirse metin ZATEN doğru olur).
//  - Frekans Bulma'ya AYRICA "kulak" karşılaştırma butonları eklendi
//    (showFrequencyEars/#fbEarLeft-Right, SADECE bu modda — "frequency"
//    sorularında, Pro Plus HARİÇ) — hiçbir yerde anlatılmıyordu.
export const MODE_OPTIONS_TEXTS = {
  "frekans-bulma": "Kaynağı değiştirebilir, kendi dosyanı yükleyebilir, 'Karıştır'la rastgele kaynak seçtirebilirsin. Dokunmalı/Şıklı cevap biçimini seçebilen TEK mod budur. Odak aralığıyla (Bas/Orta/Tiz) belirli bir bölgeye odaklanabilirsin. Bilemezsen 'Atla'ya dokun. Cevap sonrası 'Senin cevabın'/'Doğru cevap' butonlarına dokunarak ikisini de tekrar dinleyip karşılaştırabilirsin. Durdur'a basıp sonra cevap verirsen geri bildirim ekranda kalır, sen geçene kadar kapanmaz.",
  "kesim-noktasi": "Kaynağı değiştirebilir, kendi dosyanı yükleyebilir, 'Karıştır'la rastgele kaynak seçtirebilirsin. 'A/B Test'le kesim öncesi/sonrası sesi karşılaştırabilirsin. Bilemezsen 'Atla'ya dokun. Durdur'a basıp sonra cevap verirsen geri bildirim ekranda kalır, sen geçene kadar kapanmaz.",
  "q-genisligi": "Kaynağı değiştirebilir, kendi dosyanı yükleyebilir, 'Karıştır'la rastgele kaynak seçtirebilirsin. 'A/B Test'le temiz/işlenmiş sesi karşılaştırabilirsin. Bilemezsen 'Atla'ya dokun. Durdur'a basıp sonra cevap verirsen geri bildirim ekranda kalır, sen geçene kadar kapanmaz.",
  "boost-mu-cut-mu": "Kaynağı değiştirebilir, kendi dosyanı yükleyebilir, 'Karıştır'la rastgele kaynak seçtirebilirsin. 'A/B Test'le temiz/işlenmiş sesi karşılaştırabilirsin. Bilemezsen 'Atla'ya dokun. Durdur'a basıp sonra cevap verirsen geri bildirim ekranda kalır, sen geçene kadar kapanmaz.",
  "db-seviyesi": "Kaynağı değiştirebilir, kendi dosyanı yükleyebilir, 'Karıştır'la rastgele kaynak seçtirebilirsin. 'A/B Test'le temiz/işlenmiş sesi karşılaştırabilirsin. Bilemezsen 'Atla'ya dokun. Durdur'a basıp sonra cevap verirsen geri bildirim ekranda kalır, sen geçene kadar kapanmaz.",
  kompresor: "Kaynağı değiştirebilir, kendi dosyanı yükleyebilir, 'Karıştır'la rastgele kaynak seçtirebilirsin. Karta uzun basarak A/B/C döngüsünü açıp kapatabilirsin. Bilemezsen 'Atla'ya dokun. Durdur'a basıp sonra cevap verirsen geri bildirim ekranda kalır, sen geçene kadar kapanmaz.",
  reverb: "Kaynağı değiştirebilir (uyumlu kaynaklarla sınırlı), kendi dosyanı yükleyebilir, 'Karıştır'la rastgele kaynak seçtirebilirsin. Karta uzun basarak A/B/C döngüsünü açıp kapatabilirsin. Bilemezsen 'Atla'ya dokun. Durdur'a basıp sonra cevap verirsen geri bildirim ekranda kalır, sen geçene kadar kapanmaz.",
  distortion: "Kaynağı değiştirebilir, kendi dosyanı yükleyebilir, 'Karıştır'la rastgele kaynak seçtirebilirsin. Karta uzun basarak A/B/C döngüsünü açıp kapatabilirsin. Bilemezsen 'Atla'ya dokun. Durdur'a basıp sonra cevap verirsen geri bildirim ekranda kalır, sen geçene kadar kapanmaz.",
  "tonal-denge": "Kaynağı 'Davul Döngüsü' ya da kendi yüklediğin mix arasında seçebilirsin. 'A/B Test'le düzeltmeden önceki/sonraki sesi karşılaştırabilirsin. Bilemezsen 'Atla'ya dokun. Durdur'a basıp sonra cevap verirsen geri bildirim ekranda kalır, sen geçene kadar kapanmaz.",
  "frekans-cakismasi": "Kaynak çiftini (Kick+Bas/Vokal+Gitar/Snare+Gitar) seçebilir, ya da kendi iki sesini yükleyebilirsin. Kestikten sonra 'Önce/Sonra' ile maskeyi karşılaştırabilirsin. Bilemezsen 'Atla'ya dokun. Durdur'a basıp sonra cevap verirsen geri bildirim ekranda kalır, sen geçene kadar kapanmaz.",
  "pan-konumu": "Kaynağı değiştirebilir (uyumlu kaynaklarla sınırlı — çok kısa vuruşlar konum algısı için yetersiz), kendi dosyanı yükleyebilir, 'Karıştır'la rastgele kaynak seçtirebilirsin. 'A/B Test'le temiz/işlenmiş sesi karşılaştırabilirsin. Bilemezsen 'Atla'ya dokun. Durdur'a basıp sonra cevap verirsen geri bildirim ekranda kalır, sen geçene kadar kapanmaz.",
  "stereo-genislik": "Kaynağı değiştirebilir (uyumlu kaynaklarla sınırlı — çok kısa vuruşlar genişlik algısı için yetersiz), kendi dosyanı yükleyebilir, 'Karıştır'la rastgele kaynak seçtirebilirsin. 'A/B Test'le temiz/işlenmiş sesi karşılaştırabilirsin. Bilemezsen 'Atla'ya dokun. Durdur'a basıp sonra cevap verirsen geri bildirim ekranda kalır, sen geçene kadar kapanmaz."
};

// ---- 3. SPOTLIGHT rehber turu — ilk HINT_ROUNDS_LIMIT round'da görünür ----
// Her adım {target, text}: target SEMBOLİK bir anahtar ("listen"/"abControl"/
// "select"/"confirm"), GERÇEK DOM elementine app.js:resolveSpotlightTarget()
// çevirir (bu dosya DOM'a hiç dokunmaz, level-sheet-terms.js'in AYNI "saf
// veri" ilkesi — bkz. CLAUDE.md). "select" ile "confirm" ÇOĞU modda AYNI
// hedefe çözülür (choiceOnly modların hepsinde tek tıkla submit — seçmek
// zaten onaylamak demek, bkz. isChoiceFormat notu app.js'te) — bu BİLİNÇLİ
// bir tekrar, ayrı bir "onayla" kontrolü İCAT edilmedi. Tonal Denge tek
// istisna: gerçek ayrı bir ".tonal-submit" butonu var, "confirm" ONA çözülüyor.
//
// G69: "abControl" adımı EKLENDİ — #abToggle'ın KENDİSİ modun tipine göre İKİ
// FARKLI GERÇEK kontrole karşılık gelir (bkz. app.js:updateAbToggleUI):
// three-way 3 modda (Kompresör/Reverb/Distortion) A/B/C DÖNGÜ (uzun bas
// başlatır, tekrar dokun durdurur); diğer 6 modda (Frekans Çakışması HARİÇ)
// dry/işlenmiş A/B KARŞILAŞTIRMA (tek dokunuş). Frekans Çakışması'nda
// #abToggle GİZLİ (bkz. syncCakismaVisibility) — bu yüzden o modun dizisinde
// "abControl" adımı YOK, uydurulmadı.
//
// "Durdur"/"Atla" (startBtn/nextBtn) İKİ AYRI kendi kutusu almıyor — HER
// modda ZATEN aynı, kendini açıklayan (buton metni "Atla ▶"/"Durdur")
// evrensel kontroller — "spotlight çok uzamasın" dengesi için SON adımın
// (confirm/select) metnine kısa bir hatırlatma olarak katlandı.
//
// Frekans Çakışması'nda SADECE 2 adım var (dinle+seç) — task'ın kendi notu
// "aşamalara göre devam": mod zaten çok-aşamalı (stage 1/2/3), her aşamanın
// KENDİ soru başlığı/talimatı (bkz. frekans-cakismasi.js:getInstructionText)
// ekranda ZATEN gösteriliyor — spotlight bunu TEKRARLAMIYOR, sadece İLK
// "dinle → seç" adımını öğretiyor.
export const SPOTLIGHT_STEPS = {
  "frekans-bulma": [
    { target: "listen", text: "Önce sesi dinle." },
    { target: "abControl", text: "'A/B Test'e dokun: temiz ile işlenmiş sesi karşılaştır." },
    { target: "select", text: "Öne çıkan frekansı işaretle." },
    { target: "confirm", text: "Dokunman cevabını hemen onaylar. Bilemezsen 'Atla', istersen 'Durdur'a dokunabilirsin." }
  ],
  "kesim-noktasi": [
    { target: "listen", text: "Önce sesi dinle." },
    { target: "abControl", text: "'A/B Test'e dokun: kesim öncesi/sonrası sesi karşılaştır." },
    { target: "select", text: "Kesim noktasını seç." },
    { target: "confirm", text: "Seçimin cevabını hemen onaylar. Bilemezsen 'Atla', istersen 'Durdur'a dokunabilirsin." }
  ],
  "q-genisligi": [
    { target: "listen", text: "Önce sesi dinle." },
    { target: "abControl", text: "'A/B Test'e dokun: temiz ile işlenmiş sesi karşılaştır." },
    { target: "select", text: "Bandın genişliğini seç." },
    { target: "confirm", text: "Seçimin cevabını hemen onaylar. Bilemezsen 'Atla', istersen 'Durdur'a dokunabilirsin." }
  ],
  "boost-mu-cut-mu": [
    { target: "listen", text: "Önce sesi dinle." },
    { target: "abControl", text: "'A/B Test'e dokun: temiz ile işlenmiş sesi karşılaştır." },
    { target: "select", text: "Boost mu cut mu, karar ver." },
    { target: "confirm", text: "Seçimin cevabını hemen onaylar. Bilemezsen 'Atla', istersen 'Durdur'a dokunabilirsin." }
  ],
  "db-seviyesi": [
    { target: "listen", text: "Önce sesi dinle." },
    { target: "abControl", text: "'A/B Test'e dokun: temiz ile işlenmiş sesi karşılaştır." },
    { target: "select", text: "Seviye farkını seç." },
    { target: "confirm", text: "Seçimin cevabını hemen onaylar. Bilemezsen 'Atla', istersen 'Durdur'a dokunabilirsin." }
  ],
  kompresor: [
    { target: "listen", text: "Üç sesi (A/B/C) dinle." },
    { target: "abControl", text: "Karta uzun bas: A/B/C arasında otomatik döngü başlar, tekrar dokun durur." },
    { target: "select", text: "Farklı olan kartı seç." },
    { target: "confirm", text: "Kartı seçmen cevabını onaylar. Bilemezsen 'Atla', istersen 'Durdur'a dokunabilirsin." }
  ],
  reverb: [
    { target: "listen", text: "Üç sesi (A/B/C) dinle." },
    { target: "abControl", text: "Karta uzun bas: A/B/C arasında otomatik döngü başlar, tekrar dokun durur." },
    { target: "select", text: "Farklı olan kartı seç." },
    { target: "confirm", text: "Kartı seçmen cevabını onaylar. Bilemezsen 'Atla', istersen 'Durdur'a dokunabilirsin." }
  ],
  distortion: [
    { target: "listen", text: "Üç sesi (A/B/C) dinle." },
    { target: "abControl", text: "Karta uzun bas: A/B/C arasında otomatik döngü başlar, tekrar dokun durur." },
    { target: "select", text: "Farklı olan kartı seç." },
    { target: "confirm", text: "Kartı seçmen cevabını onaylar. Bilemezsen 'Atla', istersen 'Durdur'a dokunabilirsin." }
  ],
  "tonal-denge": [
    { target: "listen", text: "Bozuk sesi dinle." },
    { target: "abControl", text: "'A/B Test'e dokun: düzeltmeden önceki/sonraki sesi karşılaştır." },
    { target: "select", text: "Kaydırıcılarla nötüre getir." },
    { target: "confirm", text: "Cevabı Onayla'ya dokun. Bilemezsen 'Atla', istersen 'Durdur'a dokunabilirsin." }
  ],
  "frekans-cakismasi": [
    { target: "listen", text: "Çakışan iki sesi birlikte dinle." },
    { target: "select", text: "Nerede çakıştıklarını şıklardan bul. Bilemezsen 'Atla', istersen 'Durdur'a dokunabilirsin." }
  ],
  "pan-konumu": [
    { target: "listen", text: "Önce sesi dinle." },
    { target: "abControl", text: "'A/B Test'e dokun: temiz ile işlenmiş sesi karşılaştır." },
    { target: "select", text: "Sesin stereo alandaki konumunu seç." },
    { target: "confirm", text: "Seçimin cevabını hemen onaylar. Bilemezsen 'Atla', istersen 'Durdur'a dokunabilirsin." }
  ],
  "stereo-genislik": [
    { target: "listen", text: "Önce sesi dinle." },
    { target: "abControl", text: "'A/B Test'e dokun: temiz ile işlenmiş sesi karşılaştır." },
    { target: "select", text: "Stereo görüntünün genişliğini seç." },
    { target: "confirm", text: "Seçimin cevabını hemen onaylar. Bilemezsen 'Atla', istersen 'Durdur'a dokunabilirsin." }
  ]
};

// Kaç round boyunca spotlight turu otomatik gösterilir — task'ın kendi sayısı
// ("ilk 2 kez"). Bu SAYIYI TEK yerden okumak için export edildi (app.js
// bunu sihirli sayı olarak KENDİSİ tekrarlamıyor).
export const HINT_ROUNDS_LIMIT = 2;

// SAF FONKSİYON — hintRoundsShown: o modda BUGÜNE kadar tur GÖSTERİLMİŞ
// round sayısı (persisted, storage.js:freshModeState). true dönerse BU
// round'da spotlight turu gösterilmeli.
export function shouldShowRoundHint(hintRoundsShown) {
  return (hintRoundsShown || 0) < HINT_ROUNDS_LIMIT;
}

// SAF FONKSİYON — modId için SPOTLIGHT_STEPS dizisini döndürür (kayıtlı
// değilse null — çağıran taraf turu hiç başlatmaz). app.js bu diziyi
// GERÇEK DOM elementlerine kendi resolveSpotlightTarget()'ıyla çözer.
export function spotlightStepsFor(modeId) {
  const steps = SPOTLIGHT_STEPS[modeId];
  return steps && steps.length ? steps : null;
}

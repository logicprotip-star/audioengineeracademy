// Ses kaynağı kataloğu — TEK doğruluk kaynağı. Kaynak sheet'i (app.js) ve ses
// motoru (audio-engine.js) ikisi de buradan okur. Yeni bir örnek (davul/enstrüman)
// eklemek için SADECE ilgili grubun sources dizisine bir girdi eklemek yeterli —
// audio-engine.js "sample" kind'ini generic olarak çalar, app.js sheet'i bu
// listeden üretir. Kod değişikliği gerekmez.
//
// kind:
//   "noise"  — audio-engine.js'teki buildNoiseSource (id doğrudan sourceType olarak geçer)
//   "synth"  — audio-engine.js'teki buildSynthSource (id doğrudan osilatör tipi olarak geçer)
//   "sample" — samplePath'teki dosya XMLHttpRequest(arraybuffer)+decodeAudioData ile
//              çekilip AudioBufferSourceNode ile çalınır (bkz. audio-engine.js
//              buildSampleSource — sentetik kaynaklarla AYNI çalma zinciri, kusursuz
//              loop için gerekli). fetch() KULLANILMIYOR (WKWebView yerel bundle
//              dosyasını fetch() ile çekemiyor, "HTTP 0" veriyor) — HTMLAudioElement
//              de KULLANILMIYOR (iOS'ta kesik kesik çalıp loop'ta tıklama yapıyordu).
//              Dosyanın kendisi www/audio/ altına elle konur (bu dosyada sadece
//              katalog girdisi tutulur) — samplePath yoksa/yüklenemezse audio-engine.js
//              sessizce pink noise'a düşer (bkz. buildQuestionChain'deki try/catch),
//              uygulama çökmez.
//   "upload" — kullanıcının kendi yüklediği dosya (uploadManager, değişmedi).
// Kaynak uyumluluk bayrakları — bir modun getMeta().uyumluKaynaklar'ı
// compatibleSourceIds() ile bu bayraklara/listeye göre üretilir (bkz. dosya sonu).
// Yeni bir bayrak eklemek yeni bir mod kısıtlaması tanımlamak için yeterli,
// app.js veya mod dosyaları değişmez:
//   noTransient  — ani bir başlangıç/atağı yok (pink/white noise):
//                  kompresyonun duyulabilmesi için transient (atak) gerekir
//                  (bkz. Kompresör getMeta — requireTransient).
// Bir mod otomatik bir bayrak yerine ELLE seçilmiş bir liste istiyorsa (bkz.
// Reverb getMeta — compatibleSourceIds({ only: [...] })) kaynak nesnelerine
// yeni bir alan eklemeye GEREK yok, id'ler doğrudan mod dosyasında yazılır.
export const SOURCE_GROUPS = [
  {
    id: "synthetic", label: "SENTETİK",
    sources: [
      { id: "pink", label: "Pink Noise", kind: "noise", desc: "En nötr referans, bant farkları en net duyulur", noTransient: true },
      { id: "white", label: "White Noise", kind: "noise", desc: "Daha sert, tüm frekanslarda eşit enerji", noTransient: true },
      { id: "saw", label: "Saw", kind: "synth", desc: "Zengin harmonik, sürekli pad/bas karakteri" },
      { id: "square", label: "Square", kind: "synth", desc: "İçi boş, tek sayılı harmonikler ağırlıklı" },
      { id: "triangle", label: "Triangle", kind: "synth", desc: "Yumuşak, az harmonikli" }
    ]
  },
  {
    id: "drums", label: "DAVUL",
    sources: [
      { id: "kick", label: "Kick", kind: "sample", samplePath: "audio/kick.m4a", desc: "Kick davul — SUB/BAS bölgesi" },
      { id: "snare", label: "Snare", kind: "sample", samplePath: "audio/snare.m4a", desc: "Snare — orta/üst bölge gövde + tel" },
      { id: "hihat", label: "Hi-Hat", kind: "sample", samplePath: "audio/hihat.m4a", desc: "Hi-hat — tiz bölge" },
      { id: "tom", label: "Tom", kind: "sample", samplePath: "audio/tom.m4a", desc: "Tom — alt-orta rezonans" },
      // G259 — kütüphane yenilendi (78 BPM, 8 bar/24.6sn), dosya adı groove_090.m4a
      // idi artık groove.m4a — id/etiket/açıklama DEĞİŞMEDİ (sadece samplePath).
      { id: "groove", label: "Davul Döngüsü", kind: "sample", samplePath: "audio/groove.m4a", desc: "78 BPM davul döngüsü — mix bağlamı" }
    ]
  },
  {
    id: "instruments", label: "ENSTRÜMAN",
    sources: [
      // G259 — kütüphane yenilendi. Nota/perde İDDİA EDİLMİYOR (eski "C2/65Hz"
      // gibi etiketler yeni kayıtta doğrulanmadı) — bunun yerine GERÇEK ölçülen
      // tepe frekansı (OLCUM-KAYNAK-16-08.md'nin FFT ölçümü, ~11Hz çözünürlük).
      { id: "bass", label: "Bas", kind: "sample", samplePath: "audio/bass.m4a", desc: "Bas gitar — SUB/BAS, ölçülen tepe ~97 Hz" },
      { id: "guitar", label: "Akustik Gitar", kind: "sample", samplePath: "audio/acoustic_guitar.m4a", desc: "Akustik gitar — alt-orta, ölçülen tepe ~194 Hz" },
      // G259 — YENİ: mono, temiz (efektsiz) elektrogitar. Etiket "Clean Gitar"
      // — TERIM-KURALI.md'nin "sektör terimi İngilizce kalır" kararı
      // (OLCUM-CIHAZ-16-08.md madde H.2, kullanıcı kararı), diğer kaynak
      // adlarının (Pink Noise/Saw/Square/Triangle) BİREBİR aynı deseni.
      { id: "clean_guitar", label: "Clean Gitar", kind: "sample", samplePath: "audio/clean_guitar.m4a", desc: "Temiz elektrogitar — alt-orta, ölçülen tepe ~291 Hz" },
      // G270 — YENİ: arpej (kırık akor) deseninde akustik gitar, 78 BPM
      // grid'inde 8 bar/24.6sn (diğer davul/enstrüman kaynaklarıyla AYNI
      // uzunluk/faz). Ölçülen tepe (Welch, 4096-nokta FFT, ~10.8Hz çözünürlük
      // — OLCUM-KAYNAK-16-08.md'nin AYNI yöntemi) acoustic_guitar.m4a ile
      // BİREBİR AYNI (~194 Hz, AYNI enstrüman/akort) — desc bunu YANSITIYOR.
      { id: "arpeggio_guitar", label: "Arpej Gitar", kind: "sample", samplePath: "audio/arpeggio_guitar.m4a", desc: "Akustik gitar, arpej deseni — alt-orta, ölçülen tepe ~194 Hz" },
      { id: "vocal", label: "Vokal", kind: "sample", samplePath: "audio/vocal.m4a", desc: "Lead vokal frazı — orta bölge" },
      // G259 — YENİ, stereo. `stereoOnly:true` — compatibleSourceIds()'in
      // varsayılan (parametresiz) yolundan BİLEREK dışlanır (bkz. aşağı),
      // SADECE `only` ile açıkça isteyen bir mod (Stereo Genişlik) görür —
      // diğer 11 modun kaynak seçicisinde HİÇ görünmez (task'ın kendi kararı).
      { id: "acoustic_guitar_stereo", label: "Akustik Gitar (Stereo)", kind: "sample", samplePath: "audio/acoustic_guitar_stereo.m4a", desc: "Akustik gitar, GERÇEK stereo kayıt — SADECE Stereo Genişlik", stereoOnly: true },
      { id: "clean_guitar_stereo", label: "Clean Gitar (Stereo)", kind: "sample", samplePath: "audio/clean_guitar_stereo.m4a", desc: "Temiz elektrogitar, GERÇEK stereo kayıt — SADECE Stereo Genişlik", stereoOnly: true },
      // G288 — YENİ: snare.m4a'nın "geç başlayan çift" varyantı — ilk vuruşu
      // kesilmiş (OLCUM-CIFT-OFFSET-17-08.md'nin bulduğu "377ms offset'le
      // playback pozisyon-0'daki asıl atağı ~24sn sonraya öteliyor, tur
      // boyunca hiç duyulmuyor" sorununu KÖKTEN çözüyor — o atak zaten
      // dosyada YOK), son 377ms'si temizlenmiş (ölçüldü: son ~350ms+ artık
      // sessiz — döngü sarma noktasında artık geç-decay kırıntısı yok).
      // `pairOnly:true` — `stereoOnly`'nin AYNI deseni: compatibleSourceIds()'in
      // varsayılan listesinden dışlanır (aşağı bkz.), SADECE SOURCE_PAIRS
      // (findSource ile DOĞRUDAN, filtreden geçmeden) erişir — genel kaynak
      // seçicide HİÇ görünmez.
      { id: "snare_late", label: "Snare (Geç)", kind: "sample", samplePath: "audio/snare_late.m4a", desc: "Snare, ilk vuruşu kesilmiş — SADECE Frekans Çakışması'nın offsetli çiftlerinde", pairOnly: true }
    ]
  },
  {
    // Satır adı grup başlığıyla ("KENDİ DOSYAM") aynı olmasın diye "Dosya seç" —
    // bkz. D2 (cihaz testinden çıkan düzeltme).
    id: "own", label: "KENDİ DOSYAM",
    sources: [{ id: "upload", label: "Dosya seç", kind: "upload", desc: "Yüklediğin ses dosyası" }]
  }
];

export function findSource(id) {
  for (const g of SOURCE_GROUPS) {
    const s = g.sources.find(s => s.id === id);
    if (s) return s;
  }
  return null;
}

// G51 — Motor 3 (Frekans Çakışması): İKİ kaynağın AYNI ANDA çalıp birbirini
// maskelediği ÇİFTLER — SOURCE_GROUPS'un tek-kaynak modeliyle KARIŞTIRILMAZ
// (o listeye HİÇBİR YENİ alan/girdi eklenmedi, bu TAMAMEN AYRI/EK bir liste).
// sourceA/sourceB: SOURCE_GROUPS id'leri (findSource ile çözülür) — kaynağın
// kendisi TEKRAR TANIMLANMAZ, mevcut kataloğa işaret eder. region: [min,max]
// Hz — bu çiftin GERÇEKÇİ çakışma aralığı (createQuestion çakışma merkezini
// bu aralıktan seçer, dışına ASLA çıkmaz).
//
// task'ın G51'deki kendi kararı: "Şimdilik temel bir çift (kick+bas) yeterli,
// mekanik otursun." — G52'de kütüphane task'ın kendi verdiği üç hazır set
// listesiyle genişletildi: kick+bas (SUB/BAS), vokal+gitar (ORTA — "gövde
// çatışması"), snare+gitar (ALT-ORTA'dan ORTA'ya — "atak ve sertlik"). Region
// sınırları task'ın bu turda verdiği yaklaşık aralıklarla + frekans-bulma.js
// FA_ZONES sınırlarıyla hizalandı (KULAKLA/PLAYTEST DOĞRULANMADI, makul bir
// başlangıç — diğer tüm sayısal sabitlerle AYNI dürüstlük notu). Yeni ses
// dosyası GEREKMEDİ — vocal.m4a/acoustic_guitar.m4a/snare.m4a zaten
// SOURCE_GROUPS'ta vardı (bkz. yukarı), burada SADECE çift olarak eşleniyor.
// G259 — kütüphane yenilendi, region'lar YENİDEN ÖLÇÜLDÜ (OLCUM-KAYNAK-16-08.md'nin
// FFT ölçümü — her kaynağın ortalama güç spektrumu, Welch yöntemi, 4096-nokta
// FFT, 44.1kHz/4096≈10.8Hz çözünürlük). Yöntem: her kaynağın KENDİ tepesine
// göre -15dB üstü "anlamlı enerji" bandı bulunup, ÇİFTİN İKİ kaynağının da
// bu bandı sağladığı KESİŞİM aralığı region olarak alındı — eski region'lar
// (ESKİ kütüphaneye göre elle ayarlanmıştı) YENİ dosyalarla ARTIK UYUMSUZDU.
//
// G270 — vocal.m4a YENİLENDİ (eski dosyanın üzerine yazıldı, 5.67sn→6.15sn,
// AYNI id/yol) — G259'un "vocal HÂLÂ eski dosya" notu ARTIK GEÇERSİZ,
// vokal-gitar YENİDEN ÖLÇÜLDÜ (aşağıda). AYRICA snare-gitar ÇIKARILDI,
// YERİNE snare-arpej-gitar EKLENDİ — G270'in ÖLÇÜM bulgusu (OLCUM-KAYNAK-17-08.md):
// eski snare+acoustic_guitar çiftinin ASIL sorunu SPEKTRAL DEĞİL (İKİ çiftin
// de spektral çakışması ~170-400Hz, PRATİKTE AYNI — acoustic_guitar/
// arpeggio_guitar AYNI enstrüman/akort, tepe İKİSİNDE de ~194Hz) — sorun
// TAMAMEN ZAMANSAL: acoustic_guitar.m4a'nın vuruşları snare'in vuruşlarından
// (en-yakın-vuruş) ORTALAMA 231ms uzakta duruyordu (16 snare vuruşunun
// SADECE 1'i 150ms içindeydi — "sırayla çalıyorlardı, üst üste
// binmiyorlardı"). arpeggio_guitar'ın notaları İSE snare'in HER vuruşundan
// ORTALAMA 104ms uzakta (16/16'sı 150ms İÇİNDE) — GERÇEKTEN üst üste biniyor.
// ⚠️ vokal-gitar'ın YENİ region'ı ([200,600]'den [220,360]'a) da bu turda
// GERÇEKTEN daraldı — vocal.m4a'nın YENİ kaydı acoustic_guitar ile SADECE
// 215-366Hz aralığında -15dB üstü ORTAK enerji taşıyor (vocal ÇOK-formantlı,
// KENDİ global tepesi 1087Hz'de ama guitar'la ORTAK/örtüşen bölge çok daha
// AŞAĞIDA) — eski [200,600] aralığı YENİ vocal ile ARTIK GERÇEKÇİ DEĞİLDİ.
// Tam ölçüm/yöntem: OLCUM-KAYNAK-17-08.md.
//
// G281 — www/audio/arpeggio_guitar.m4a TEKRAR değiştirildi (snare sızıntısı
// temizlendi, kaynağı BİLİNMİYOR — G270 SONRASI, benim tarafımdan yapılmadı,
// kullanıcıya birden fazla kez bildirildi). YENİDEN ÖLÇÜLDÜ — YÖNTEM: Welch
// periodogramı (4096-nokta FFT, Hann pencere, %50 örtüşme — OLCUM-KAYNAK-
// 17-08.md'nin "Welch/4096-FFT" yöntemiyle AYNI, KONTROL: bu yöntemle snare+
// ESKİ acoustic_guitar yeniden ölçülüp [172.3,398.4]Hz bulundu — doc'lu
// [172,398]Hz'le NEREDEYSE BİREBİR eşleşti, yöntem doğrulaması) + 60Hz
// boşluk-toleranslı kümeleme (AYNI dosyanın "NİHAİ yöntem" notu — peak'i
// İÇEREN küme, -15dB eşiği).
// ÖLÇÜLEN (snare ∩ YENİ arpeggio_guitar): -15dB eşiğinde [172.3,301.5]Hz,
// -20dB eşiğinde [150.7,495.3]Hz. Görevde verilen sayılar (-15dB:183-393,
// -20dB:159-744) FARKLI ÇIKTI — özellikle ÜST sınırda belirgin fark (301.5
// vs 393, 495.3 vs 744). Alt sınırlar yakın (172 vs 183, 151 vs 159).
// Yöntem farkı OLABİLİR (görevin hangi FFT boyutu/pencere/kümeleme
// kullandığı belirtilmedi) — BENİM ölçümüm, projenin AYNI pariodogram+
// kümeleme yöntemiyle KONTROL edilip doğrulandığı için kullanıldı (task'ın
// kendi talimatı: "farklı çıkarsa kendi ölçümünü kullan").
// -15dB (projenin TÜM diğer SOURCE_PAIRS'inde kullandığı AYNI eşik,
// tutarlılık için) seçildi: [172,302] ölçüldü, [170,310]'a DIŞA yuvarlandı
// (bu ÇİFTİN kendi G270 emsaliyle AYNI yuvarlama yönü — [172,398]→[170,400]).
//
// G288 — TAMAMEN YENİDEN KURULDU (kick-bas/vokal-gitar/snare-arpej-gitar
// KALKTI). offsetA/offsetB (saniye, HER ZAMAN POZİTİF) — OLCUM-CIFT-OFFSET-
// 17-08.md'nin bulduğu İKİ şey burada uygulanıyor: (1) `buildSampleSource`
// (audio-engine.js) zaten `AudioBufferSourceNode.start(0, offsetSec %
// duration)` kullanıyor ve bu OfflineAudioContext'te ÖLÇÜLDÜ — `loop=true`
// ile birlikte np.roll'un dairesel kaydırmasıyla BİREBİR eşdeğer (döngüde
// KALICI, sadece ilk geçişte değil). (2) NEGATİF offsetSec bu formülde
// RangeError fırlatıyor (ÖLÇÜLDÜ) — bu yüzden offset HER ZAMAN "geç
// başlaması gereken" kaynağa POZİTİF olarak atanıyor, diğer kaynak 0 alıyor
// (iki tarafın da negatif alması gerekmiyor çünkü ÇİFT-göreli gecikme tek
// taraflı pozitif bir değerle zaten ifade edilebiliyor).
//
// Region'lar bu turda YENİDEN ÖLÇÜLDÜ — AYNI Welch/4096-FFT/Hann/%50-
// örtüşme/-15dB/60Hz-boşluk-toleranslı yöntem (G281 ile AYNI, kendi JS
// FFT'siyle bu turda yeniden üretildi), HER kaynağın KENDİ tepesine göre
// bandı bulunup ÇİFTİN iki bandının KESİŞİMİ alındı (OLCUM-KAYNAK-17-08.md'nin
// F.2/vokal-gitar'daki "doğrudan kesişim" yöntemiyle AYNI). Yöntem KONTROLÜ:
// bas+akustik ve bas+clean için ölçülen [86.1,279.9]/[193.8,279.9]Hz,
// task'ın verdiği referans [82,279]/[195,279]Hz ile NEREDEYSE BİREBİR eşleşti
// (yöntem doğrulaması). akustik+clean İSE FARKLI çıktı — ölçülen [193.8,398.4]Hz
// (acoustic_guitar'ın KENDİ -15dB bandının üst sınırıyla SINIRLI), task'ın
// referansı [195,1114]Hz — üst sınırda büyük fark (muhtemelen task'ın "1114"
// değeri bandın KESİŞİMİ değil, İKİ kaynağın ayrı ayrı anlamlı aralıklarının
// BİRLEŞİMİ gibi farklı bir tanım kullanıyor — G270'teki vokal-gitar'ın
// AYNI türden "219-1113 vs ölçülen 215-366" farkının bir benzeri). Task'ın
// kendi talimatı ("farklı çıkarsa kendi ölçümünü kullan") gereği BENİM
// ölçümüm kullanıldı. Tüm değerler DIŞA yuvarlandı (G281 ile AYNI yön,
// en yakın 10'a):
//   akustik+clean:        ölçülen [193.8,398.4] → [190,400]
//   bas+akustik:           ölçülen  [86.1,279.9] → [80,280]
//   bas+clean:             ölçülen [193.8,279.9] → [190,280]
//   snare_late+akustik:    ölçülen [172.3,398.4] → [170,400] (referans verilmedi, "ölç" denildi)
//   snare_late+clean:      ölçülen [193.8,430.7] → [190,440] (referans verilmedi, "ölç" denildi)
// Tam ölçüm tablosu: DURUM.md G288.
export const SOURCE_PAIRS = [
  {
    id: "akustik-clean", labelA: "Akustik Gitar", labelB: "Clean Gitar", sourceA: "guitar", sourceB: "clean_guitar",
    offsetA: 0, offsetB: 0,
    region: [190, 400], desc: "Akustik ve clean gitar — alt-orta bölgede iki gitarın gövde çatışması"
  },
  {
    id: "bas-akustik", labelA: "Bas", labelB: "Akustik Gitar", sourceA: "bass", sourceB: "guitar",
    offsetA: 0, offsetB: 0.377,
    region: [80, 280], desc: "Bas ve akustik gitar — sub/alt-orta geçişinde harmonik çakışma, gitar 377ms geç başlıyor"
  },
  {
    id: "bas-clean", labelA: "Bas", labelB: "Clean Gitar", sourceA: "bass", sourceB: "clean_guitar",
    offsetA: 0, offsetB: 0.377,
    region: [190, 280], desc: "Bas ve clean gitar — alt-orta bölgede harmonik çakışma, gitar 377ms geç başlıyor"
  },
  {
    id: "snare-akustik", labelA: "Snare", labelB: "Akustik Gitar", sourceA: "snare_late", sourceB: "guitar",
    offsetA: 0.377, offsetB: 0,
    region: [170, 400], desc: "Snare ve akustik gitar — atak bölgesinde zamansal çakışma, snare 377ms geç başlıyor"
  },
  {
    id: "snare-clean", labelA: "Snare", labelB: "Clean Gitar", sourceA: "snare_late", sourceB: "clean_guitar",
    offsetA: 0.377, offsetB: 0,
    region: [190, 440], desc: "Snare ve clean gitar — atak bölgesinde zamansal çakışma, snare 377ms geç başlıyor"
  }
];

// "Kendi dosyalarım" — İKİ GENEL yükleme yuvası (G56 düzeltmesi: task'ın
// açık isteği — "kick+bas OLMAK ZORUNDA DEĞİL, kullanıcının kendi mix'indeki
// çakışan HERHANGİ iki kaynak". labelA/labelB BİLEREK enstrüman-tarafsız
// ("Ses 1"/"Ses 2", ÖNCEDEN "Kendi A"/"Kendi B"'ydi — işlevsel olarak zaten
// nötrdü ama task bu turda daha da genel bir adlandırma istedi). sourceA/
// sourceB BİLEREK SOURCE_GROUPS'ta YOK — bunlar findSource() ile ÇÖZÜLMEZ,
// app.js/audio-engine.js bu İKİ sabit id'yi (upload-a/upload-b) özel olarak
// tanıyıp KENDİ iki ayrı uploadManager örneğine yönlendirir (bkz. app.js
// "Frekans Çakışması — çift upload" bölümü). region: null — kullanıcı kendi
// dosyasını yüklediği için çakışma aralığı ÖNCEDEN bilinemez, createQuestion
// bu durumda FA_MIN–FA_MAX'ın tamamını havuz olarak kullanır.
export const OWN_SOURCE_PAIR = {
  id: "own", labelA: "Ses 1", labelB: "Ses 2", sourceA: "upload-a", sourceB: "upload-b",
  region: null, desc: "İki kendi sesini ayrı ayrı yükle · her biri 100 MB'a kadar"
};

export function findSourcePair(id) {
  if (id === OWN_SOURCE_PAIR.id) return OWN_SOURCE_PAIR;
  return SOURCE_PAIRS.find(p => p.id === id) || SOURCE_PAIRS[0];
}

// Mod bazlı kaynak uyumluluğu — TEK merkezi filtre. Bir mod kendi getMeta()'sında
// uyumluKaynaklar'ı bu fonksiyonla üretir; app.js kaynak sheet'ini/"Karıştır"
// havuzunu HER ZAMAN o listeyle sınırlar (bkz. app.js populateSourceSelect/
// pickRoundSource). Parametre vermeyen bir mod (varsayılan) tüm kaynakları alır —
// bugünkü dört mod (Frekans Bulma HARİÇ, o kendi elle-yazılmış listesini kullanıyor;
// Kesim Noktası/dB/Boost-Cut/Q) hâlâ bunu yapıyor.
//
// İki filtre türü desteklenir:
//   requireTransient — otomatik/kaynak-bayrağı bazlı (bkz. yukarıdaki noTransient
//                       notu, Kompresör kullanıyor). Gelecekte yeni bir bayrak
//                       (ör. "excludeMono"/"requireStereo") eklemek SADECE burada
//                       yeni bir filtre satırı + kaynak nesnelerine yeni bir alan
//                       eklemek demek.
//   only              — ELLE seçilmiş açık bir id listesi (bkz. Reverb getMeta).
//                       Bir mixin kararı ("bu kaynağa gerçek stüdyoda reverb
//                       verilir/verilmez") bir bayrakla GENELLENEMEYECEK kadar
//                       öznel/duruma özgüyse (G42'nin excludeOneShot'ı Reverb'de
//                       snare'i YANLIŞLIKLA dışlamıştı — "tek vuruş" heuristiği
//                       ile "reverb alır" gerçek dünya kararı ÖRTÜŞMÜYORDU) SADECE
//                       o id'ler döner, diğer TÜM filtreler/kaynaklar yok sayılır.
// G259 — stereoOnly bayrağı: "only" ile AÇIKÇA istenmediği sürece HİÇBİR
// modun varsayılan (parametresiz) listesinde görünmez (kaynak nesnelerinde
// tanımlı, bkz. yukarı acoustic_guitar_stereo/clean_guitar_stereo). "only"
// verilirse bu filtre de requireTransient gibi TAMAMEN yok sayılır (only
// HER ZAMAN son söz, dosya başındaki AYNI kural).
export function compatibleSourceIds({ requireTransient = false, only = null } = {}) {
  if (only) return [...only];
  return SOURCE_GROUPS.flatMap(g => g.sources)
    .filter(s => !(requireTransient && s.noTransient))
    .filter(s => !s.stereoOnly)
    .filter(s => !s.pairOnly)
    .map(s => s.id);
}

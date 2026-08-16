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
      // G259 — YENİ: mono, temiz (efektsiz) elektrogitar.
      { id: "clean_guitar", label: "Temiz Gitar", kind: "sample", samplePath: "audio/clean_guitar.m4a", desc: "Temiz elektrogitar — alt-orta, ölçülen tepe ~291 Hz" },
      { id: "vocal", label: "Vokal", kind: "sample", samplePath: "audio/vocal.m4a", desc: "Lead vokal frazı — orta bölge" },
      // G259 — YENİ, stereo. `stereoOnly:true` — compatibleSourceIds()'in
      // varsayılan (parametresiz) yolundan BİLEREK dışlanır (bkz. aşağı),
      // SADECE `only` ile açıkça isteyen bir mod (Stereo Genişlik) görür —
      // diğer 11 modun kaynak seçicisinde HİÇ görünmez (task'ın kendi kararı).
      { id: "acoustic_guitar_stereo", label: "Akustik Gitar (Stereo)", kind: "sample", samplePath: "audio/acoustic_guitar_stereo.m4a", desc: "Akustik gitar, GERÇEK stereo kayıt — SADECE Stereo Genişlik", stereoOnly: true },
      { id: "clean_guitar_stereo", label: "Temiz Gitar (Stereo)", kind: "sample", samplePath: "audio/clean_guitar_stereo.m4a", desc: "Temiz elektrogitar, GERÇEK stereo kayıt — SADECE Stereo Genişlik", stereoOnly: true }
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
// ⚠️ vokal-gitar: vocal.m4a HÂLÂ ESKİ dosya (yeni kayıt gelmedi) — bu region
// YARI-güvenilir, guitar YENİ + vocal ESKİ bir çiftin ölçümü. vocal.m4a
// yenilenince BU ÇİFT YENİDEN ÖLÇÜLMELİ (bkz. DURUM.md SIRADAKİ).
export const SOURCE_PAIRS = [
  {
    id: "kick-bas", labelA: "Kick", labelB: "Bas", sourceA: "kick", sourceB: "bass",
    region: [30, 120], desc: "Kick ve bas — sub/bas bölgesinde en sık çakışma"
  },
  {
    id: "vokal-gitar", labelA: "Vokal", labelB: "Gitar", sourceA: "vocal", sourceB: "guitar",
    region: [200, 600], desc: "Vokal ve gitar — orta bölgede gövde çatışması"
  },
  {
    id: "snare-gitar", labelA: "Snare", labelB: "Gitar", sourceA: "snare", sourceB: "guitar",
    region: [170, 400], desc: "Snare ve gitar — atak ve sertlik bölgesinde çakışma"
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
    .map(s => s.id);
}

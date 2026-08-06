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
      { id: "groove", label: "Davul Döngüsü", kind: "sample", samplePath: "audio/groove_090.m4a", desc: "90 BPM davul döngüsü — mix bağlamı" }
    ]
  },
  {
    id: "instruments", label: "ENSTRÜMAN",
    sources: [
      { id: "bass", label: "Bas (C2)", kind: "sample", samplePath: "audio/bass.m4a", desc: "Bas gitar C2, 65 Hz — SUB/BAS" },
      { id: "bass_alt", label: "Bas (E2)", kind: "sample", samplePath: "audio/bass_alt.m4a", desc: "Bas gitar E2, 82 Hz — BAS" },
      { id: "guitar", label: "Akustik Gitar", kind: "sample", samplePath: "audio/acoustic_guitar.m4a", desc: "Akustik gitar A2, 110 Hz — alt-orta" },
      { id: "vocal", label: "Vokal", kind: "sample", samplePath: "audio/vocal.m4a", desc: "Lead vokal frazı — orta bölge" }
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
export const SOURCE_PAIRS = [
  {
    id: "kick-bas", labelA: "Kick", labelB: "Bas", sourceA: "kick", sourceB: "bass",
    region: [50, 160], desc: "Kick ve bas — sub/bas bölgesinde en sık çakışma"
  },
  {
    id: "vokal-gitar", labelA: "Vokal", labelB: "Gitar", sourceA: "vocal", sourceB: "guitar",
    region: [500, 2000], desc: "Vokal ve gitar — orta bölgede gövde çatışması"
  },
  {
    id: "snare-gitar", labelA: "Snare", labelB: "Gitar", sourceA: "snare", sourceB: "guitar",
    region: [200, 2000], desc: "Snare ve gitar — atak ve sertlik bölgesinde çakışma"
  }
];

// "Kendi dosyalarım" — İKİ AYRI upload yuvası (task'ın açık isteği: "iki
// kaynak çakışma iki kaynak arası, ikisini de kendi yüklesin"). sourceA/
// sourceB BİLEREK SOURCE_GROUPS'ta YOK — bunlar findSource() ile ÇÖZÜLMEZ,
// app.js/audio-engine.js bu İKİ sabit id'yi (upload-a/upload-b) özel olarak
// tanıyıp KENDİ iki ayrı uploadManager örneğine yönlendirir (bkz. app.js
// "Frekans Çakışması — çift upload" bölümü). region: null — kullanıcı kendi
// dosyasını yüklediği için çakışma aralığı ÖNCEDEN bilinemez, createQuestion
// bu durumda FA_MIN–FA_MAX'ın tamamını havuz olarak kullanır.
export const OWN_SOURCE_PAIR = {
  id: "own", labelA: "Kendi A", labelB: "Kendi B", sourceA: "upload-a", sourceB: "upload-b",
  region: null, desc: "İki kendi dosyanı ayrı ayrı yükle · her biri 100 MB'a kadar"
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
export function compatibleSourceIds({ requireTransient = false, only = null } = {}) {
  if (only) return [...only];
  return SOURCE_GROUPS.flatMap(g => g.sources)
    .filter(s => !(requireTransient && s.noTransient))
    .map(s => s.id);
}

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
export const SOURCE_GROUPS = [
  {
    id: "synthetic", label: "SENTETİK",
    sources: [
      { id: "pink", label: "Pink Noise", kind: "noise", desc: "En nötr referans, bant farkları en net duyulur" },
      { id: "white", label: "White Noise", kind: "noise", desc: "Daha sert, tüm frekanslarda eşit enerji" },
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

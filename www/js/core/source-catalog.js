// Ses kaynağı kataloğu — TEK doğruluk kaynağı. Kaynak sheet'i (app.js) ve ses
// motoru (audio-engine.js) ikisi de buradan okur. Yeni bir örnek (davul/enstrüman)
// eklemek için SADECE ilgili grubun sources dizisine bir girdi eklemek yeterli —
// audio-engine.js "sample" kind'ini generic olarak çalar, app.js sheet'i bu
// listeden üretir. Kod değişikliği gerekmez.
//
// kind:
//   "noise"  — audio-engine.js'teki buildNoiseSource (id doğrudan sourceType olarak geçer)
//   "synth"  — audio-engine.js'teki buildSynthSource (id doğrudan osilatör tipi olarak geçer)
//   "sample" — samplePath'teki dosya fetch+decodeAudioData ile çalınır (bkz.
//              audio-engine.js buildSampleSource). Henüz hiçbir girdi bu kind'de
//              değil — gerçek ses dosyaları eklenene kadar DAVUL/ENSTRÜMAN grupları
//              boş kalır ve kaynak sheet'inde hiç gösterilmez (bkz. app.js drawSourceSheet).
//   "upload" — kullanıcının kendi yüklediği dosya (uploadManager, değişmedi).
export const SOURCE_GROUPS = [
  {
    id: "synthetic", label: "SENTETİK",
    sources: [
      { id: "pink", label: "Pembe Gürültü", kind: "noise", desc: "En nötr referans, bant farkları en net duyulur" },
      { id: "white", label: "Beyaz Gürültü", kind: "noise", desc: "Daha sert, tüm frekanslarda eşit enerji" },
      { id: "saw", label: "Testere (Synth)", kind: "synth", desc: "Zengin harmonik, sürekli pad/bas karakteri" },
      { id: "square", label: "Kare (Synth)", kind: "synth", desc: "İçi boş, tek sayılı harmonikler ağırlıklı" },
      { id: "triangle", label: "Üçgen (Synth)", kind: "synth", desc: "Yumuşak, az harmonikli" }
    ]
  },
  { id: "drums", label: "DAVUL", sources: [] },
  { id: "instruments", label: "ENSTRÜMAN", sources: [] },
  {
    id: "own", label: "KENDİ DOSYAM",
    sources: [{ id: "upload", label: "Kendi dosyam", kind: "upload", desc: "Yüklediğin ses dosyası" }]
  }
];

export function findSource(id) {
  for (const g of SOURCE_GROUPS) {
    const s = g.sources.find(s => s.id === id);
    if (s) return s;
  }
  return null;
}

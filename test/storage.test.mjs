// storage.js testleri — Z3 odaklı: perMode migration (eski formatlı localStorage'dan
// yeni yapıya geçiş, veri kaybı olmadan). Node'da global localStorage yok — testler
// KENDİ in-memory shim'ini kurar (sadece getItem/setItem/removeItem — storage.js'in
// loadStats/freshStats'ı bunlardan fazlasını çağırmıyor; saveStats/mirrorSet gibi
// window.Capacitor'a dokunan fonksiyonlar burada TEST EDİLMİYOR, Node'da window yok).

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { loadStats, freshStats, freshModeState, freshPrefs, loadPrefs, loadUploadSelections, saveUploadSelections, loadSourceSelections, saveSourceSelections } from "../www/js/core/storage.js";

function installLocalStorageMock(initial = {}) {
  const store = new Map(Object.entries(initial));
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };
  return store;
}

const STATS_KEY = "eqEarTrainerProXStats";
const DIFF_LIVES = { easy: 5, medium: 5, hard: 5, pro: 5, proplus: 5 };

describe("freshStats() — perMode", () => {
  it("verilen modeIds için sıfır XP'li perMode girdileri açar", () => {
    const s = freshStats(DIFF_LIVES, 3, ["frekans-bulma", "kesim-noktasi"]);
    assert.deepEqual(s.perMode, {
      "frekans-bulma": freshModeState(),
      "kesim-noktasi": freshModeState()
    });
  });

  it("modeIds verilmezse perMode boş nesne olur, çökmez", () => {
    const s = freshStats(DIFF_LIVES, 3);
    assert.deepEqual(s.perMode, {});
  });
});

describe("loadStats() — perMode migration (eski format → yeni)", () => {
  beforeEach(() => { installLocalStorageMock(); });

  it("perMode HİÇ olmayan eski bir kayıtta, TÜM geçmiş perDiff XP'si legacyModeId'ye taşınır", () => {
    const oldFormat = {
      rounds: 40, correct: 20, wrong: 20, combo: 0, bestCombo: 5, unlocked: [],
      proCorrect: 2, hintsUsed: 1, hintsRemaining: 2, bossWins: 1, history: [],
      perDiff: {
        easy: { xp: 300, score: 100, bestScore: 150 },
        medium: { xp: 450, score: 80, bestScore: 200 },
        hard: { xp: 100, score: 0, bestScore: 50 }
      },
      lives: 3
      // perMode YOK — bu eski (Z3 öncesi) bir kayıt
    };
    installLocalStorageMock({ [STATS_KEY]: JSON.stringify(oldFormat) });

    const s = loadStats(DIFF_LIVES, 3, ["frekans-bulma"], "frekans-bulma");

    // Veri KAYBOLMADI: perDiff aynen korundu.
    assert.equal(s.perDiff.easy.xp, 300);
    assert.equal(s.perDiff.medium.xp, 450);
    assert.equal(s.perDiff.hard.xp, 100);
    // perMode YENİ oluşturuldu, TÜM geçmiş XP (300+450+100=850) frekans-bulma'ya taşındı.
    assert.equal(s.perMode["frekans-bulma"].xp, 850);
    // Diğer alanlar bozulmadı.
    assert.equal(s.rounds, 40);
    assert.equal(s.bestCombo, 5);
  });

  it("perMode ZATEN VARSA (Z3 sonrası bir kayıt), göç TEKRAR ÇALIŞMAZ — mevcut perMode korunur", () => {
    const alreadyMigrated = {
      perDiff: { easy: { xp: 999, score: 0, bestScore: 0 } },
      perMode: { "frekans-bulma": { xp: 42 } }, // gerçek oyun sonrası birikmiş, perDiff toplamından FARKLI
      lives: 3
    };
    installLocalStorageMock({ [STATS_KEY]: JSON.stringify(alreadyMigrated) });

    const s = loadStats(DIFF_LIVES, 3, ["frekans-bulma"], "frekans-bulma");

    // 42 KALDI — 999'a (perDiff toplamı) YENİDEN göç ETMEDİ.
    assert.equal(s.perMode["frekans-bulma"].xp, 42);
  });

  it("perMode varken YENİ bir mod id'si eklenirse (2. mod kodlandı), o mod SIFIRDAN başlar — geçmiş XP miras alınmaz", () => {
    const existing = {
      perDiff: { easy: { xp: 500, score: 0, bestScore: 0 } },
      perMode: { "frekans-bulma": { xp: 500 } },
      lives: 3
    };
    installLocalStorageMock({ [STATS_KEY]: JSON.stringify(existing) });

    const s = loadStats(DIFF_LIVES, 3, ["frekans-bulma", "kesim-noktasi"], "frekans-bulma");

    assert.equal(s.perMode["frekans-bulma"].xp, 500); // değişmedi
    assert.equal(s.perMode["kesim-noktasi"].xp, 0); // sıfırdan, 500'ü MİRAS ALMADI
  });

  it("localStorage tamamen boşsa (temiz kurulum) freshStats ile aynı sonucu üretir", () => {
    const s = loadStats(DIFF_LIVES, 3, ["frekans-bulma"], "frekans-bulma");
    assert.deepEqual(s.perMode, { "frekans-bulma": freshModeState() });
  });

  it("legacyModeId verilmezse (null) göç sırasında XP AKTARILMAZ, perMode sıfırdan açılır", () => {
    const oldFormat = {
      perDiff: { easy: { xp: 300, score: 0, bestScore: 0 } },
      lives: 3
    };
    installLocalStorageMock({ [STATS_KEY]: JSON.stringify(oldFormat) });

    const s = loadStats(DIFF_LIVES, 3, ["frekans-bulma"]); // legacyModeId YOK
    assert.equal(s.perMode["frekans-bulma"].xp, 0);
  });
});

// G67: "i" bilgi/rehber sistemi — round-içi ipucu bandının kaç kez
// gösterildiğini tutan perMode alanı (bkz. core/guide-texts.js:shouldShowRoundHint).
describe("hintRoundsShown (G67) — 'i' bilgi sistemi ipucu sayacı", () => {
  beforeEach(() => { installLocalStorageMock(); });

  it("freshModeState() varsayılan olarak 0 döner", () => {
    assert.equal(freshModeState().hintRoundsShown, 0);
  });

  it("bu alan hiç OLMAYAN eski bir perMode kaydı (G67 öncesi) yüklenince 0'a göç eder", () => {
    const existing = {
      perDiff: {},
      perMode: { "frekans-bulma": { xp: 42 } }, // hintRoundsShown YOK — eski kayıt
      lives: 3
    };
    installLocalStorageMock({ [STATS_KEY]: JSON.stringify(existing) });

    const s = loadStats(DIFF_LIVES, 3, ["frekans-bulma"], "frekans-bulma");

    assert.equal(s.perMode["frekans-bulma"].hintRoundsShown, 0);
    assert.equal(s.perMode["frekans-bulma"].xp, 42); // xp bozulmadı
  });

  it("hintRoundsShown ZATEN bir değer taşıyorsa (kullanıcı ilerlemişse), göç ÜZERİNE YAZMAZ", () => {
    const existing = {
      perDiff: {},
      perMode: { "frekans-bulma": { xp: 42, hintRoundsShown: 1 } },
      lives: 3
    };
    installLocalStorageMock({ [STATS_KEY]: JSON.stringify(existing) });

    const s = loadStats(DIFF_LIVES, 3, ["frekans-bulma"], "frekans-bulma");

    assert.equal(s.perMode["frekans-bulma"].hintRoundsShown, 1);
  });
});

const PREFS_KEY = "eqEarTrainerProXPrefs";

describe("feedbackScreen tercihi (G13) — açık/kapalı iki durum", () => {
  beforeEach(() => { installLocalStorageMock(); });

  it("freshPrefs(): varsayılan AÇIK (true)", () => {
    assert.equal(freshPrefs().feedbackScreen, true);
  });

  it("loadPrefs(): localStorage'da feedbackScreen:false kayıtlıysa KAPALI olarak okunur", () => {
    installLocalStorageMock({ [PREFS_KEY]: JSON.stringify({ feedbackScreen: false }) });
    assert.equal(loadPrefs().feedbackScreen, false);
  });

  it("loadPrefs(): localStorage'da feedbackScreen:true kayıtlıysa AÇIK olarak okunur", () => {
    installLocalStorageMock({ [PREFS_KEY]: JSON.stringify({ feedbackScreen: true }) });
    assert.equal(loadPrefs().feedbackScreen, true);
  });

  it("loadPrefs(): G13'ten ÖNCEKİ bir kayıtta (feedbackScreen alanı hiç yok) varsayılan true'ya göç eder, çökmez", () => {
    const preG13 = { notifications: false, hpWarning: true, answerFormat: "touch" };
    installLocalStorageMock({ [PREFS_KEY]: JSON.stringify(preG13) });
    const p = loadPrefs();
    assert.equal(p.feedbackScreen, true);
    assert.equal(p.notifications, false); // eski alanlar KAYBOLMADI
  });
});

const UPLOAD_SELECTIONS_KEY = "eqEarTrainerProXUploadSelections";

// G123 — "dosya seçimi mod başına ayrılacak": her bağlamın (Araçlar="tools",
// her modun kendi MODE_ID'si) HANGİ dosyayı seçtiği artık kalıcı. mirrorSet
// (window.Capacitor.Plugins.Preferences'a yedek yazma) çağrıldığı için diğer
// testlerin AKSİNE (bkz. dosya başı notu — "window.Capacitor'a dokunan
// fonksiyonlar test edilmiyor") burada MİNİMAL bir `window` stub'ı kuruluyor
// (Capacitor YOK → mirrorSet no-op, hata fırlatmaz).
describe("uploadSelections (G123) — bağlam başına kalıcı dosya seçimi", () => {
  beforeEach(() => {
    installLocalStorageMock();
    globalThis.window = { Capacitor: null };
  });

  it("loadUploadSelections(): hiç kayıt yoksa boş obje döner, çökmez", () => {
    assert.deepEqual(loadUploadSelections(), {});
  });

  it("loadUploadSelections(): bozuk JSON'da boş objeye düşer (çökmez)", () => {
    installLocalStorageMock({ [UPLOAD_SELECTIONS_KEY]: "{not-json" });
    assert.deepEqual(loadUploadSelections(), {});
  });

  it("loadUploadSelections(): bir DİZİ kayıtlıysa (beklenmeyen şekil) boş objeye düşer", () => {
    installLocalStorageMock({ [UPLOAD_SELECTIONS_KEY]: JSON.stringify(["a", "b"]) });
    assert.deepEqual(loadUploadSelections(), {});
  });

  it("saveUploadSelections() + loadUploadSelections(): tam round-trip, birden fazla bağlam AYNI ANDA korunur", () => {
    saveUploadSelections({ tools: "fileA", "frekans-bulma": "fileB", "stereo-genislik": "fileC" });
    const loaded = loadUploadSelections();
    assert.equal(loaded.tools, "fileA");
    assert.equal(loaded["frekans-bulma"], "fileB");
    assert.equal(loaded["stereo-genislik"], "fileC");
  });

  it("bir bağlamın seçimini güncellemek DİĞER bağlamların seçimlerini BOZMAZ (A dosyası Araçlar'da, B dosyası Frekans Bulma'da — biri değişince diğeri korunur)", () => {
    let selections = { tools: "fileA", "frekans-bulma": "fileB" };
    saveUploadSelections(selections);
    // Frekans Bulma'nın seçimi değişiyor — Araçlar'ınki DOKUNULMAMALI.
    selections = { ...loadUploadSelections(), "frekans-bulma": "fileB2" };
    saveUploadSelections(selections);
    const loaded = loadUploadSelections();
    assert.equal(loaded.tools, "fileA", "Araçlar'ın seçimi Frekans Bulma değişince BOZULMAMALI");
    assert.equal(loaded["frekans-bulma"], "fileB2");
  });
});

const SOURCE_SELECTIONS_KEY = "eqEarTrainerProXSourceSelections";

// G138 — "kaynak TÜRÜ de mod başına ayrılsın" (kullanıcının kendi kararı,
// G126'nın "kaynak türü mod-agnostik kalsın" kararını GEÇERSİZ kılıyor).
// uploadSelections İLE AYNI desen/testler — ayrı bir localStorage anahtarı
// olduğu için ayrı test grubu.
describe("sourceSelections (G138) — bağlam başına kalıcı kaynak-türü seçimi", () => {
  beforeEach(() => {
    installLocalStorageMock();
    globalThis.window = { Capacitor: null };
  });

  it("loadSourceSelections(): hiç kayıt yoksa boş obje döner, çökmez", () => {
    assert.deepEqual(loadSourceSelections(), {});
  });

  it("loadSourceSelections(): bozuk JSON'da boş objeye düşer (çökmez)", () => {
    installLocalStorageMock({ [SOURCE_SELECTIONS_KEY]: "{not-json" });
    assert.deepEqual(loadSourceSelections(), {});
  });

  it("loadSourceSelections(): bir DİZİ kayıtlıysa (beklenmeyen şekil) boş objeye düşer", () => {
    installLocalStorageMock({ [SOURCE_SELECTIONS_KEY]: JSON.stringify(["a", "b"]) });
    assert.deepEqual(loadSourceSelections(), {});
  });

  it("saveSourceSelections() + loadSourceSelections(): tam round-trip, birden fazla mod AYNI ANDA korunur", () => {
    saveSourceSelections({ "frekans-bulma": "davul-dongusu", "kesim-noktasi": "upload" });
    const loaded = loadSourceSelections();
    assert.equal(loaded["frekans-bulma"], "davul-dongusu");
    assert.equal(loaded["kesim-noktasi"], "upload");
  });

  it("bir modun kaynak-türü seçimini güncellemek DİĞER modun seçimini BOZMAZ (Frekans Bulma davul döngüsünde, Kesim Noktası kendi dosyasında — biri değişince diğeri korunur)", () => {
    let selections = { "frekans-bulma": "davul-dongusu", "kesim-noktasi": "upload" };
    saveSourceSelections(selections);
    // Frekans Bulma'nın kaynağı değişiyor — Kesim Noktası'nınki DOKUNULMAMALI.
    selections = { ...loadSourceSelections(), "frekans-bulma": "pink-noise" };
    saveSourceSelections(selections);
    const loaded = loadSourceSelections();
    assert.equal(loaded["kesim-noktasi"], "upload", "Kesim Noktası'nın kaynağı Frekans Bulma değişince BOZULMAMALI");
    assert.equal(loaded["frekans-bulma"], "pink-noise");
  });
});

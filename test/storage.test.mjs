// storage.js testleri — Z3 odaklı: perMode migration (eski formatlı localStorage'dan
// yeni yapıya geçiş, veri kaybı olmadan). Node'da global localStorage yok — testler
// KENDİ in-memory shim'ini kurar (sadece getItem/setItem/removeItem — storage.js'in
// loadStats/freshStats'ı bunlardan fazlasını çağırmıyor; saveStats/mirrorSet gibi
// window.Capacitor'a dokunan fonksiyonlar burada TEST EDİLMİYOR, Node'da window yok).

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { loadStats, freshStats, freshModeState, freshPrefs, loadPrefs } from "../www/js/core/storage.js";

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

// storage.js testleri — Z3 odaklı: perMode migration (eski formatlı localStorage'dan
// yeni yapıya geçiş, veri kaybı olmadan). Node'da global localStorage yok — testler
// KENDİ in-memory shim'ini kurar (sadece getItem/setItem/removeItem). `window.Capacitor`'a
// dokunan fonksiyonlar (saveStats/saveUploadSelections/vb. — mirrorSet üzerinden)
// `globalThis.window = { Capacitor: null }` seçilen testlerde AYRICA kuruluyor
// (bkz. aşağıdaki describe blokları).

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { loadStats, freshStats, freshModeState, freshPrefs, loadPrefs, loadUploadSelections, saveUploadSelections, loadSourceSelections, saveSourceSelections, savePurchase, loadPurchase, freshPurchase, saveStats, saveDaily, saveDevFlags, saveToolsTonalReferences, trySave, loadSchemaVersion, ensureSchemaVersion, CURRENT_SCHEMA_VERSION, freshFreeSession, loadFreeSession, saveFreeSession, dailyKey, freshAnswerHistory, loadAnswerHistory, saveAnswerHistory, clearAnswerHistory, freshDaily, loadDaily, peekStaleDaily, freshDailyLog, loadDailyLog, saveDailyLog, clearDailyLog, freshExamProgress, loadExamProgress, saveExamProgress, clearExamProgress } from "../www/js/core/storage.js";

function installLocalStorageMock(initial = {}) {
  const store = new Map(Object.entries(initial));
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };
  return store;
}

// G229 (TUR2-YARIM-15-08, "Satın Alma Kaybı") — `localStorage.setItem()`nin
// GERÇEK, dokümante edilmiş bir başarısızlık modunu (Safari private-browsing/
// depolama dolu → QuotaExceededError) simüler. `save*()` fonksiyonlarının
// istisnayı YUTUP `false` döndürdüğünü (uygulamayı ÇÖKERTMEDİĞİNİ) doğrulamak
// için kullanılır.
function installThrowingLocalStorageMock() {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => { throw new DOMException("QuotaExceededError (simüle)", "QuotaExceededError"); },
    removeItem: () => {}
  };
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

// G229 (TUR2-YARIM-15-08, "Satın Alma Kaybı") — 12 `save*()` fonksiyonunun
// TAMAMININ `localStorage.setItem()` hata fırlattığında (Safari private-browsing/
// depolama dolu) uygulamayı ÇÖKERTMEDEN `false` döndürdüğünü doğrular.
// `savePurchase()` EN KRİTİK örnek — sessiz satın-alma-kaybı riskinin
// KENDİSİ. Diğer üçü (`saveStats`/`saveDaily`/`saveDevFlags`/
// `saveToolsTonalReferences`) TEMSİLİ bir örneklem — 12'sinin TAMAMI AYNI
// paylaşılan `trySave()` yardımcısından geçiyor (storage.js), bu yüzden
// TEK TEK 12 ayrı test GEREKMİYOR, ama en az BİRKAÇ FARKLI anahtar/veri
// şekliyle doğrulanıyor ki paylaşılan yardımcı HER çağrı sitesinde
// gerçekten devrede.
describe("G229 — save*() fonksiyonları localStorage.setItem() hata fırlatınca ÇÖKMEZ, false döner", () => {
  beforeEach(() => {
    globalThis.window = { Capacitor: null };
  });

  it("savePurchase(): setItem hata fırlatınca istisna FIRLAMAZ, false döner (satın alma kaybı senaryosunun kökü)", () => {
    installThrowingLocalStorageMock();
    let threw = false;
    let result;
    try {
      result = savePurchase({ proPurchased: true });
    } catch (e) {
      threw = true;
    }
    assert.equal(threw, false, "savePurchase() istisnayı YUTMALI, yukarı fırlatmamalı");
    assert.equal(result, false, "başarısız yazımda false dönmeli");
  });

  it("savePurchase(): başarılı yazımda true döner (regresyon — hep false dönmüyor)", () => {
    installLocalStorageMock();
    const result = savePurchase({ proPurchased: true });
    assert.equal(result, true);
    assert.deepEqual(loadPurchase(), { proPurchased: true });
  });

  it("savePurchase() başarısız olduktan SONRA localStorage düzelirse (retry) yeniden true döner VE veri doğru yazılır — state tutarsız KALMIYOR", () => {
    installThrowingLocalStorageMock();
    assert.equal(savePurchase({ proPurchased: true }), false);
    // "Depolama açıldı" — gerçek (çalışan) bir localStorage'a geçiliyor,
    // grantRealPro()'nun retry senaryosuyla AYNI (bkz. app.js G229 notu).
    installLocalStorageMock();
    assert.equal(savePurchase({ proPurchased: true }), true);
    assert.deepEqual(loadPurchase(), { proPurchased: true }, "retry sonrası veri EKSİKSİZ/DOĞRU yazılmalı, önceki başarısız denemeden bir kalıntı KALMAMALI");
  });

  it("saveStats(): setItem hata fırlatınca çökmez, false döner", () => {
    installThrowingLocalStorageMock();
    const stats = freshStats(DIFF_LIVES, 3, ["frekans-bulma"]);
    assert.equal(saveStats(stats, []), false);
  });

  it("saveDaily(): setItem hata fırlatınca çökmez, false döner", () => {
    installThrowingLocalStorageMock();
    assert.equal(saveDaily({ key: "2026-8-15", tasks: [] }), false);
  });

  it("saveDevFlags(): setItem hata fırlatınca çökmez, false döner", () => {
    installThrowingLocalStorageMock();
    assert.equal(saveDevFlags({ unlocked: true, simulatePro: true }), false);
  });

  it("saveToolsTonalReferences(): setItem hata fırlatınca çökmez, false döner", () => {
    installThrowingLocalStorageMock();
    assert.equal(saveToolsTonalReferences({ list: [], activeId: null }), false);
  });

  it("loadPurchase(): savePurchase() hiç BAŞARILI olmamışsa freshPurchase()'a düşer (proPurchased:false) — 'sahip görünüp sonra kaybolma' YERİNE hiç sahip GÖRÜNMEZ", () => {
    installThrowingLocalStorageMock();
    savePurchase({ proPurchased: true }); // başarısız, hiç yazılmadı
    installLocalStorageMock(); // yeni "açılış" — hiçbir kayıt yok
    assert.deepEqual(loadPurchase(), freshPurchase());
  });
});

// G232 (TUR3A bulgusu) — trySave() ARTIK dışa açık, çünkü app.js'in
// storage.js DIŞINDA kalan 3 anahtarı (TOOLS_LIBRARY_KEY/TOOLS_ACTIONS_KEY/
// TOOLS_MEASUREMENTS_KEY — G229'un TARAMASI storage.js'e özel olduğu için
// kaçmıştı) artık BUNU kullanıyor, `{mirror:false}` ile (bu 3 anahtar
// ÖNCEDEN de Preferences'a yansıtılmıyordu, bu davranış DEĞİŞMEDİ).
// app.js'in KENDİSİ (toolsSaveLibraryManifest/toolsSaveJson) DOM'a bağlı
// olduğu için birim testinde import EDİLEMİYOR (mode sözleşmesinin dışında
// kalan bir dosya) — o bütünleşme Playwright ile AYRICA doğrulandı
// (bkz. DURUM.md G232). Burada test edilen SADECE trySave()'in KENDİSİ,
// app.js'in HANGİ parametrelerle çağırdığı.
describe("G232 — trySave({mirror:false}) — app.js'in storage.js dışı 3 anahtarının kullandığı yol", () => {
  it("mirror:false verildiğinde window.Capacitor HİÇ okunmuyor bile başarıyla yazar (app.js bu 3 anahtar için mirror kullanmıyor)", () => {
    installLocalStorageMock();
    globalThis.window = undefined;
    assert.equal(trySave("eqEarTrainerProXToolsLibrary", [{ id: "a" }], { mirror: false }), true);
  });

  it("setItem hata fırlatınca mirror:false ile de çökmez, false döner", () => {
    installThrowingLocalStorageMock();
    assert.equal(trySave("eqEarTrainerProXToolsActions", [{ file: "x" }], { mirror: false }), false);
  });

  it("başarısızlıktan sonra retry ile (depolama düzelirse) veri doğru yazılır", () => {
    installThrowingLocalStorageMock();
    assert.equal(trySave("eqEarTrainerProXToolsMeasurements", [{ file: "y" }], { mirror: false }), false);
    const store = installLocalStorageMock();
    assert.equal(trySave("eqEarTrainerProXToolsMeasurements", [{ file: "y" }], { mirror: false }), true);
    assert.deepEqual(JSON.parse(store.get("eqEarTrainerProXToolsMeasurements")), [{ file: "y" }]);
  });
});

// G233 (TUR3A bulgusu 🟡) — hiçbir kayıtta sürüm/şema numarası yoktu.
// SADECE bir sayı okuma/yazma turu — HİÇBİR migration mantığı YOK
// (task'ın kendi talimatı: "en basit çözüm yeter").
describe("G233 — loadSchemaVersion()/ensureSchemaVersion() — sürüm yoksa 'v1' varsayılır", () => {
  it("anahtar HİÇ yazılmamışsa (bu düzeltmeden önceki TÜM mevcut veri) v1 sayılır", () => {
    installLocalStorageMock();
    assert.equal(loadSchemaVersion(), 1);
  });

  it("bozuk/sayısal olmayan bir değer varsa da v1'e düşer, çökmez", () => {
    installLocalStorageMock({ eqEarTrainerProXSchemaVersion: "abc" });
    assert.equal(loadSchemaVersion(), 1);
  });

  it("ensureSchemaVersion() ÇAĞRILDIKTAN SONRA loadSchemaVersion() CURRENT_SCHEMA_VERSION döner", () => {
    installLocalStorageMock();
    globalThis.window = { Capacitor: null };
    ensureSchemaVersion();
    assert.equal(loadSchemaVersion(), CURRENT_SCHEMA_VERSION);
  });

  it("İLK açılışta (anahtar hiç YOKKEN) ensureSchemaVersion() anahtarı GERÇEKTEN yazar — loadSchemaVersion()'ın 'yoksa v1 varsay' TARAFSIZLIĞINDAN bağımsız doğrulama (bu test YAZMADAN önce kırmızıydı: CURRENT_SCHEMA_VERSION=1 iken 'zaten güncel' kontrolü loadSchemaVersion()'ın varsayılanıyla YANLIŞLIKLA eşleşip anahtarı HİÇ yazmıyordu)", () => {
    const store = installLocalStorageMock();
    globalThis.window = { Capacitor: null };
    assert.equal(store.has("eqEarTrainerProXSchemaVersion"), false);
    ensureSchemaVersion();
    assert.equal(store.has("eqEarTrainerProXSchemaVersion"), true, "ilk açılışta anahtar GERÇEKTEN yazılmalı, sadece varsayılan değerle 'örtüşmemeli'");
    assert.equal(JSON.parse(store.get("eqEarTrainerProXSchemaVersion")), CURRENT_SCHEMA_VERSION);
  });

  it("ensureSchemaVersion() setItem hata fırlatsa bile çökmez (trySave'in KENDİ koruması üzerinden geçiyor)", () => {
    installThrowingLocalStorageMock();
    assert.doesNotThrow(() => ensureSchemaVersion());
  });

  it("sürüm ZATEN güncelse ensureSchemaVersion() GEREKSİZ bir yazma turu YAPMAZ", () => {
    const store = installLocalStorageMock({ eqEarTrainerProXSchemaVersion: String(CURRENT_SCHEMA_VERSION) });
    let writeCount = 0;
    const origSetItem = store.set.bind(store);
    globalThis.localStorage.setItem = (k, v) => { writeCount++; return origSetItem(k, v); };
    ensureSchemaVersion();
    assert.equal(writeCount, 0);
  });
});

// G237 (TUR4 bulgusu 🔴) — ücretsiz "5 soru/gün" duvarının sayacı ÖNCEDEN
// app.js'te bellek-içi bir değişkendi (roundsInThisPlaySession) — mod
// kapatılıp AÇILINCA sıfırlanıyordu, reklamsız/Pro'suz sınırsız tekrarlanabiliyordu.
// loadDaily()'nin BİREBİR AYNI "gün değişince taze başla" deseni — burada
// SADECE storage.js katmanı test ediliyor (SAF fonksiyonlar), app.js'in
// KENDİ kablolaması (startRound()'un artık bunu okuyup/yazması,
// blockIfSessionLimitReached()'ın 6. soruyu engellemesi) e2e ile
// doğrulanıyor (bkz. e2e/free-session-limit.spec.mjs).
describe("G237 — freshFreeSession()/loadFreeSession()/saveFreeSession() — günlük kalıcı kota", () => {
  it("hiç kayıt yokken bugünün anahtarıyla, used:0 ile başlar", () => {
    installLocalStorageMock();
    const fs = loadFreeSession();
    assert.equal(fs.key, dailyKey());
    assert.equal(fs.used, 0);
  });

  it("saveFreeSession() sonrası loadFreeSession() AYNI used değerini döner (mod kapat/aç simülasyonu — YENİDEN YÜKLEME sıfırlamaz)", () => {
    installLocalStorageMock();
    saveFreeSession({ key: dailyKey(), used: 5 });
    const fs = loadFreeSession();
    assert.equal(fs.used, 5, "kalıcı olmalı — TAM olarak G237'nin düzelttiği hata burada eskiden used'ı kaybederdi");
  });

  it("kayıtlı anahtar DÜNKÜ bir güne aitse (gün değişti) used SIFIRA döner", () => {
    installLocalStorageMock();
    saveFreeSession({ key: "2020-1-1", used: 5 });
    const fs = loadFreeSession();
    assert.equal(fs.key, dailyKey());
    assert.equal(fs.used, 0);
  });

  it("bozuk JSON / eksik 'used' alanı varsa çökmeden taze başlar", () => {
    const store = installLocalStorageMock();
    store.set("eqEarTrainerProXFreeSession", "{not json");
    assert.deepEqual(loadFreeSession(), freshFreeSession());
    store.set("eqEarTrainerProXFreeSession", JSON.stringify({ key: dailyKey() }));
    assert.deepEqual(loadFreeSession(), freshFreeSession());
  });

  it("saveFreeSession(): setItem hata fırlatınca çökmez, false döner (G229/G232'nin AYNI trySave koruması)", () => {
    installThrowingLocalStorageMock();
    assert.equal(saveFreeSession({ key: dailyKey(), used: 1 }), false);
  });

  it("saveFreeSession() mirror:false ile çağrılıyor — window.Capacitor HİÇ okunmasa bile başarıyla yazar (IN_PROGRESS_ROUND_KEY'in AYNI düşük-risk kararı)", () => {
    installLocalStorageMock();
    globalThis.window = undefined;
    assert.equal(saveFreeSession({ key: dailyKey(), used: 2 }), true);
  });
});

// G285 — cevap geçmişi (bkz. core/answer-history.js). session.log/stats.history/
// zoneStats İLE AYNI test iskeleti (yukarıdaki describe blokları) — YENİ/AYRI
// bir anahtar, mevcut hiçbirine dokunmuyor.
describe("freshAnswerHistory()/loadAnswerHistory()/saveAnswerHistory()/clearAnswerHistory()", () => {
  it("freshAnswerHistory() — schemaVersion=CURRENT_SCHEMA_VERSION, records boş dizi", () => {
    assert.deepEqual(freshAnswerHistory(), { schemaVersion: CURRENT_SCHEMA_VERSION, records: [] });
  });

  it("hiç kayıt yokken loadAnswerHistory() taze şekli döner", () => {
    installLocalStorageMock();
    assert.deepEqual(loadAnswerHistory(), freshAnswerHistory());
  });

  it("saveAnswerHistory() sonrası loadAnswerHistory() AYNI kayıtları döner (kalıcı)", () => {
    installLocalStorageMock();
    const blob = { schemaVersion: CURRENT_SCHEMA_VERSION, records: [{ modeId: "frekans-bulma", correct: true }] };
    saveAnswerHistory(blob);
    assert.deepEqual(loadAnswerHistory(), blob);
  });

  it("bozuk JSON / records dizi değilse çökmeden taze başlar", () => {
    const store = installLocalStorageMock();
    store.set("eqEarTrainerProXAnswerHistory", "{not json");
    assert.deepEqual(loadAnswerHistory(), freshAnswerHistory());
    store.set("eqEarTrainerProXAnswerHistory", JSON.stringify({ schemaVersion: 1, records: "yanlış-tip" }));
    assert.deepEqual(loadAnswerHistory(), freshAnswerHistory());
  });

  it("schemaVersion eksikse (eski/bozuk kayıt) CURRENT_SCHEMA_VERSION'a düşer, records KORUNUR", () => {
    const store = installLocalStorageMock();
    store.set("eqEarTrainerProXAnswerHistory", JSON.stringify({ records: [{ modeId: "reverb" }] }));
    assert.deepEqual(loadAnswerHistory(), { schemaVersion: CURRENT_SCHEMA_VERSION, records: [{ modeId: "reverb" }] });
  });

  it("saveAnswerHistory(): setItem hata fırlatınca çökmez, false döner (G229/G232'nin AYNI trySave koruması)", () => {
    installThrowingLocalStorageMock();
    assert.equal(saveAnswerHistory(freshAnswerHistory()), false);
  });

  it("saveAnswerHistory() mirror:false ile çağrılıyor — window.Capacitor HİÇ okunmasa bile başarıyla yazar (düşük-risk veri, IN_PROGRESS_ROUND_KEY'in AYNI kararı)", () => {
    installLocalStorageMock();
    globalThis.window = undefined;
    assert.equal(saveAnswerHistory(freshAnswerHistory()), true);
  });

  it("clearAnswerHistory() sonrası loadAnswerHistory() taze şekle döner", () => {
    const store = installLocalStorageMock();
    saveAnswerHistory({ schemaVersion: CURRENT_SCHEMA_VERSION, records: [{ modeId: "kompresor" }] });
    clearAnswerHistory();
    assert.equal(store.has("eqEarTrainerProXAnswerHistory"), false);
    assert.deepEqual(loadAnswerHistory(), freshAnswerHistory());
  });
});

// G307 (OLCUM-KESINTI-18-08 B1-B4 + OLCUM-SINAV-MIMARI-18-08) —
// ANSWER_HISTORY_KEY'in BİREBİR AYNI test deseni, exam-system.js:
// getFullSnapshot()'ın kalıcı hâli için.
describe("freshExamProgress()/loadExamProgress()/saveExamProgress()/clearExamProgress()", () => {
  it("freshExamProgress() — schemaVersion=CURRENT_SCHEMA_VERSION, byMode boş nesne", () => {
    assert.deepEqual(freshExamProgress(), { schemaVersion: CURRENT_SCHEMA_VERSION, byMode: {} });
  });

  it("hiç kayıt yokken loadExamProgress() taze şekli döner", () => {
    installLocalStorageMock();
    assert.deepEqual(loadExamProgress(), freshExamProgress());
  });

  it("saveExamProgress() sonrası loadExamProgress() AYNI kayıtları döner (kalıcı)", () => {
    installLocalStorageMock();
    const blob = { schemaVersion: CURRENT_SCHEMA_VERSION, byMode: { kompresor: { phase: "remedial", remedialIndex: 2 } } };
    saveExamProgress(blob);
    assert.deepEqual(loadExamProgress(), blob);
  });

  it("bozuk JSON / byMode obje değilse çökmeden taze başlar", () => {
    const store = installLocalStorageMock();
    store.set("eqEarTrainerProXExamProgress", "{not json");
    assert.deepEqual(loadExamProgress(), freshExamProgress());
    store.set("eqEarTrainerProXExamProgress", JSON.stringify({ schemaVersion: 1, byMode: "yanlış-tip" }));
    assert.deepEqual(loadExamProgress(), freshExamProgress());
    store.set("eqEarTrainerProXExamProgress", JSON.stringify({ schemaVersion: 1, byMode: [] }));
    assert.deepEqual(loadExamProgress(), freshExamProgress());
  });

  it("schemaVersion eksikse (eski/bozuk kayıt) CURRENT_SCHEMA_VERSION'a düşer, byMode KORUNUR", () => {
    const store = installLocalStorageMock();
    store.set("eqEarTrainerProXExamProgress", JSON.stringify({ byMode: { reverb: { phase: "exam" } } }));
    assert.deepEqual(loadExamProgress(), { schemaVersion: CURRENT_SCHEMA_VERSION, byMode: { reverb: { phase: "exam" } } });
  });

  it("saveExamProgress(): setItem hata fırlatınca çökmez, false döner (G229/G232'nin AYNI trySave koruması)", () => {
    installThrowingLocalStorageMock();
    assert.equal(saveExamProgress(freshExamProgress()), false);
  });

  it("saveExamProgress() mirror:false ile çağrılıyor — window.Capacitor HİÇ okunmasa bile başarıyla yazar (düşük-risk veri, IN_PROGRESS_ROUND_KEY'in AYNI kararı)", () => {
    installLocalStorageMock();
    globalThis.window = undefined;
    assert.equal(saveExamProgress(freshExamProgress()), true);
  });

  it("clearExamProgress() sonrası loadExamProgress() taze şekle döner", () => {
    const store = installLocalStorageMock();
    saveExamProgress({ schemaVersion: CURRENT_SCHEMA_VERSION, byMode: { kompresor: { phase: "remedial" } } });
    clearExamProgress();
    assert.equal(store.has("eqEarTrainerProXExamProgress"), false);
    assert.deepEqual(loadExamProgress(), freshExamProgress());
  });
});

// G289 (OLCUM-XP-17-08'in bulduğu sorun) — freshDaily()'nin YENİ günlük
// sayaçları (dailyRounds/dailyCorrect/dailyBestCombo/dailyXp) + loadDaily()'nin
// eski-şekilli-aynı-gün kayıtlarda bu alanları 0'a düşürmesi + peekStaleDaily().
describe("freshDaily()/loadDaily() — G289 günlük sayaçlar", () => {
  it("freshDaily() — görev tanımları/ödülleri DEĞİŞMEDİ (+40/+50/+35), YENİ 4 sayaç 0'dan başlar", () => {
    const fd = freshDaily();
    assert.deepEqual(fd.tasks.map(t => ({ id: t.id, target: t.target, reward: t.reward })), [
      { id: "d1", target: 5, reward: 40 },
      { id: "d2", target: 3, reward: 50 },
      { id: "d3", target: 2, reward: 35 }
    ]);
    assert.equal(fd.dailyRounds, 0);
    assert.equal(fd.dailyCorrect, 0);
    assert.equal(fd.dailyBestCombo, 0);
    assert.equal(fd.dailyXp, 0);
  });

  it("loadDaily() — gün DEĞİŞMEMİŞ bir kayıtta YENİ sayaçlar KORUNUR", () => {
    installLocalStorageMock();
    const today = { key: dailyKey(), tasks: freshDaily().tasks, tipDismissed: false, dailyRounds: 3, dailyCorrect: 2, dailyBestCombo: 2, dailyXp: 48 };
    saveDaily(today);
    assert.deepEqual(loadDaily(), today);
  });

  it("loadDaily() — gün DEĞİŞMEMİŞ ama YENİ alanlar HİÇ yoksa (bu özellikten ÖNCE yazılmış) 0'a düşer, çökmez", () => {
    installLocalStorageMock();
    const legacy = { key: dailyKey(), tasks: freshDaily().tasks, tipDismissed: false };
    saveDaily(legacy);
    const loaded = loadDaily();
    assert.equal(loaded.dailyRounds, 0);
    assert.equal(loaded.dailyCorrect, 0);
    assert.equal(loaded.dailyBestCombo, 0);
    assert.equal(loaded.dailyXp, 0);
    assert.equal(loaded.key, dailyKey(), "dailyKey() karşılaştırma mantığı BOZULMADI");
  });

  it("loadDaily() — gün DEĞİŞTİYSE (KİLİT: dailyKey() mantığı) HÂLÂ freshDaily()'e düşer, DEĞİŞMEDİ", () => {
    installLocalStorageMock();
    saveDaily({ key: "2000-1-1", tasks: freshDaily().tasks, tipDismissed: false, dailyRounds: 99, dailyCorrect: 99, dailyBestCombo: 99, dailyXp: 9999 });
    const loaded = loadDaily();
    assert.equal(loaded.dailyRounds, 0, "eski günün sayaçları YENİ güne SIZMAMALI");
    assert.equal(loaded.key, dailyKey());
  });

  it("peekStaleDaily() — hiç kayıt yoksa null", () => {
    installLocalStorageMock();
    assert.equal(peekStaleDaily(), null);
  });

  it("peekStaleDaily() — kayıt BUGÜNE aitse null (henüz arşivlenecek bir şey yok)", () => {
    installLocalStorageMock();
    saveDaily({ key: dailyKey(), tasks: freshDaily().tasks, tipDismissed: false, dailyRounds: 3, dailyCorrect: 2, dailyBestCombo: 2, dailyXp: 48 });
    assert.equal(peekStaleDaily(), null);
  });

  it("peekStaleDaily() — kayıt DÜN'e aitse (gün değişmiş) o objeyi AYNEN döner, SİLMEZ", () => {
    const store = installLocalStorageMock();
    const stale = { key: "2000-1-1", tasks: freshDaily().tasks, tipDismissed: false, dailyRounds: 5, dailyCorrect: 3, dailyBestCombo: 4, dailyXp: 133 };
    saveDaily(stale);
    assert.deepEqual(peekStaleDaily(), stale);
    assert.equal(store.has("eqEarTrainerProXDaily"), true, "peekStaleDaily() localStorage'ı DEĞİŞTİRMEMELİ");
  });

  it("peekStaleDaily() — bozuk JSON'da çökmeden null döner", () => {
    const store = installLocalStorageMock();
    store.set("eqEarTrainerProXDaily", "{not json");
    assert.equal(peekStaleDaily(), null);
  });
});

// G289 — günlük özet kaydı (core/daily-log.js). ANSWER_HISTORY_KEY testlerinin
// (yukarıdaki describe) BİREBİR AYNI iskeleti — TAMAMEN AYRI bir anahtar.
describe("freshDailyLog()/loadDailyLog()/saveDailyLog()/clearDailyLog()", () => {
  it("freshDailyLog() — schemaVersion=CURRENT_SCHEMA_VERSION, records boş dizi", () => {
    assert.deepEqual(freshDailyLog(), { schemaVersion: CURRENT_SCHEMA_VERSION, records: [] });
  });

  it("hiç kayıt yokken loadDailyLog() taze şekli döner", () => {
    installLocalStorageMock();
    assert.deepEqual(loadDailyLog(), freshDailyLog());
  });

  it("saveDailyLog() sonrası loadDailyLog() AYNI kayıtları döner (kalıcı)", () => {
    installLocalStorageMock();
    const blob = { schemaVersion: CURRENT_SCHEMA_VERSION, records: [{ date: "2026-8-17", rounds: 5, correct: 3, bestCombo: 4, questions: 5, xp: 133 }] };
    saveDailyLog(blob);
    assert.deepEqual(loadDailyLog(), blob);
  });

  it("bozuk JSON / records dizi değilse çökmeden taze başlar", () => {
    const store = installLocalStorageMock();
    store.set("eqEarTrainerProXDailyLog", "{not json");
    assert.deepEqual(loadDailyLog(), freshDailyLog());
    store.set("eqEarTrainerProXDailyLog", JSON.stringify({ schemaVersion: 1, records: "yanlış-tip" }));
    assert.deepEqual(loadDailyLog(), freshDailyLog());
  });

  it("schemaVersion eksikse (eski/bozuk kayıt) CURRENT_SCHEMA_VERSION'a düşer, records KORUNUR", () => {
    const store = installLocalStorageMock();
    store.set("eqEarTrainerProXDailyLog", JSON.stringify({ records: [{ date: "2026-8-17" }] }));
    assert.deepEqual(loadDailyLog(), { schemaVersion: CURRENT_SCHEMA_VERSION, records: [{ date: "2026-8-17" }] });
  });

  it("saveDailyLog(): setItem hata fırlatınca çökmez, false döner (G229/G232'nin AYNI trySave koruması)", () => {
    installThrowingLocalStorageMock();
    assert.equal(saveDailyLog(freshDailyLog()), false);
  });

  it("saveDailyLog() mirror:false ile çağrılıyor — window.Capacitor HİÇ okunmasa bile başarıyla yazar (düşük-risk veri, answerHistory'nin AYNI kararı)", () => {
    installLocalStorageMock();
    globalThis.window = undefined;
    assert.equal(saveDailyLog(freshDailyLog()), true);
  });

  it("clearDailyLog() sonrası loadDailyLog() taze şekle döner", () => {
    const store = installLocalStorageMock();
    saveDailyLog({ schemaVersion: CURRENT_SCHEMA_VERSION, records: [{ date: "2026-8-17" }] });
    clearDailyLog();
    assert.equal(store.has("eqEarTrainerProXDailyLog"), false);
    assert.deepEqual(loadDailyLog(), freshDailyLog());
  });

  it("DAILY_KEY'DEN AYRI bir anahtar — 'eqEarTrainerProXDaily' (görev listesi) DOKUNULMADAN 'eqEarTrainerProXDailyLog' bağımsız yaşıyor", () => {
    const store = installLocalStorageMock();
    saveDaily({ key: dailyKey(), tasks: freshDaily().tasks, tipDismissed: false, dailyRounds: 1, dailyCorrect: 1, dailyBestCombo: 1, dailyXp: 10 });
    saveDailyLog({ schemaVersion: CURRENT_SCHEMA_VERSION, records: [{ date: "2026-8-17" }] });
    clearDailyLog();
    assert.equal(store.has("eqEarTrainerProXDaily"), true, "günlük görev listesi DOKUNULMAMALI");
    assert.equal(store.has("eqEarTrainerProXDailyLog"), false);
  });
});

// G66 — terminoloji denetimi düzeltmesi. Global mix terimleri (reverb,
// saturation, compressor/kompresyon, threshold, ratio, Q, boost/cut, dB,
// Hz, EQ...) İngilizce KALIR, sadece tanımlayıcı kelimeler Türkçe olur
// (kullanıcı prensibi — bkz. DURUM.md G66). Mod dosyalarının KENDİ
// teachingText/getHintText/modeDescription'ındaki regresyon kilitleri
// ilgili test/*.mjs dosyalarında (kompresor/reverb/distortion) — burada
// SADECE mode-catalog.js (kart açıklamaları) + level-sheet-terms.js
// (Seviye bilgi sayfası etiketleri) kilitleniyor; app.js'in soru
// başlığı string'leri app.js DOM'a bağlı olduğu için (CLAUDE.md'nin kendi
// kısıtı) unit test EDİLEMİYOR — kod incelemesiyle doğrulandı (bkz. DURUM.md).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MODE_CATALOG } from "../www/js/core/mode-catalog.js";
import { LEVEL_SHEET_TERMS } from "../www/js/core/level-sheet-terms.js";
import { GENERAL_GUIDE, MODE_GUIDE_TEXTS, MODE_OPTIONS_TEXTS } from "../www/js/core/guide-texts.js";

const YASAKLI_ÇEVİRİLER = [
  { pattern: /yankı/i, term: "reverb" },
  { pattern: /doygun/i, term: "saturation" },
  { pattern: /\bsıkıştır/i, term: "compressor/kompresyon" },
  { pattern: /\beşik\b/i, term: "threshold" },
  { pattern: /\bartırım\b/i, term: "boost" },
  { pattern: /\bazaltım\b/i, term: "cut" }
];

describe("terminoloji: mode-catalog.js kart açıklamaları global terimi YANLIŞ çevirmiyor", () => {
  MODE_CATALOG.forEach(entry => {
    it(`${entry.id}: "${entry.aciklama}" yasaklı bir çeviri İÇERMEZ`, () => {
      YASAKLI_ÇEVİRİLER.forEach(({ pattern, term }) => {
        assert.doesNotMatch(entry.aciklama, pattern, `${entry.id} açıklaması "${term}"nin yanlış çevirisini içeriyor: "${entry.aciklama}"`);
      });
    });
  });

  it("Reverb kartı 'reverb' kelimesini İngilizce taşır", () => {
    const reverb = MODE_CATALOG.find(e => e.id === "reverb");
    assert.match(reverb.aciklama, /reverb/i);
  });

  it("Kompresör kartı 'kompresyon' kelimesini taşır (sıkıştırma DEĞİL)", () => {
    const kompresor = MODE_CATALOG.find(e => e.id === "kompresor");
    assert.match(kompresor.aciklama, /kompresyon/i);
  });

  it("Distortion kartı 'saturation' kelimesini İngilizce taşır (doygun DEĞİL)", () => {
    const distortion = MODE_CATALOG.find(e => e.id === "distortion");
    assert.match(distortion.aciklama, /saturation/i);
  });

  it("Boost mu Cut mu kartının açıklaması KENDİ modunun adıyla (Boost/Cut) TUTARLI — artırım/azaltım DEĞİL", () => {
    const boostCut = MODE_CATALOG.find(e => e.id === "boost-mu-cut-mu");
    assert.match(boostCut.aciklama, /boost/i);
    assert.match(boostCut.aciklama, /cut/i);
  });
});

describe("terminoloji: level-sheet-terms.js Seviye bilgi sayfası etiketleri global terimi YANLIŞ çevirmiyor", () => {
  Object.entries(LEVEL_SHEET_TERMS).forEach(([modeId, terms]) => {
    it(`${modeId}: sensitivityLabel "${terms.sensitivityLabel}" yasaklı bir çeviri İÇERMEZ`, () => {
      YASAKLI_ÇEVİRİLER.forEach(({ pattern, term }) => {
        assert.doesNotMatch(terms.sensitivityLabel, pattern, `${modeId}.sensitivityLabel "${term}"nin yanlış çevirisini içeriyor: "${terms.sensitivityLabel}"`);
      });
    });
  });

  it("Kompresör 'Ratio ayrımı' İngilizce", () => {
    assert.match(LEVEL_SHEET_TERMS.kompresor.sensitivityLabel, /ratio/i);
  });

  it("Reverb 'Reverb ayrımı' İngilizce", () => {
    assert.match(LEVEL_SHEET_TERMS.reverb.sensitivityLabel, /reverb/i);
  });

  it("Distortion 'Saturation ayrımı' İngilizce (Doygunluk ayrımı DEĞİL)", () => {
    assert.match(LEVEL_SHEET_TERMS.distortion.sensitivityLabel, /saturation/i);
  });
});

describe("terminoloji: guide-texts.js (G67 'i' bilgi sistemi) global terimi YANLIŞ çevirmiyor", () => {
  Object.entries(MODE_GUIDE_TEXTS).forEach(([modeId, text]) => {
    it(`${modeId}: mod bilgisi metni yasaklı bir çeviri İÇERMEZ`, () => {
      YASAKLI_ÇEVİRİLER.forEach(({ pattern, term }) => {
        assert.doesNotMatch(text, pattern, `${modeId} bilgi metni "${term}"nin yanlış çevirisini içeriyor`);
      });
    });
  });

  GENERAL_GUIDE.sections.forEach((s, i) => {
    it(`GENERAL_GUIDE bölüm ${i} ("${s.heading}") yasaklı bir çeviri İÇERMEZ`, () => {
      YASAKLI_ÇEVİRİLER.forEach(({ pattern, term }) => {
        assert.doesNotMatch(s.body, pattern, `GENERAL_GUIDE "${s.heading}" bölümü "${term}"nin yanlış çevirisini içeriyor`);
      });
    });
  });

  it("Reverb mod bilgisi 'reverb' kelimesini İngilizce taşır", () => {
    assert.match(MODE_GUIDE_TEXTS.reverb, /reverb/i);
  });

  it("Kompresör mod bilgisi 'kompresyon' kelimesini taşır (sıkıştırma DEĞİL)", () => {
    assert.match(MODE_GUIDE_TEXTS.kompresor, /kompresyon/i);
  });

  it("Distortion mod bilgisi 'saturation' kelimesini İngilizce taşır (doygun DEĞİL)", () => {
    assert.match(MODE_GUIDE_TEXTS.distortion, /saturation/i);
  });

  it("Boost mu Cut mu mod bilgisi KENDİ modunun adıyla (Boost/Cut) TUTARLI", () => {
    assert.match(MODE_GUIDE_TEXTS["boost-mu-cut-mu"], /boost/i);
    assert.match(MODE_GUIDE_TEXTS["boost-mu-cut-mu"], /cut/i);
  });
});

// G69: MODE_OPTIONS_TEXTS (mod "i"sinin ALTINDAKİ oyun seçenekleri bölümü)
// AYNI kilit — çoğu satır UI navigasyon kelimesi (Kaynak/Karıştır/Atla/A-B
// Test) olsa da, gelecekteki bir düzenlemenin yasaklı bir çeviri sokmasına
// karşı mode-catalog.js/level-sheet-terms.js/MODE_GUIDE_TEXTS ile AYNI ölçüt.
describe("terminoloji: guide-texts.js MODE_OPTIONS_TEXTS (G69 oyun seçenekleri) global terimi YANLIŞ çevirmiyor", () => {
  Object.entries(MODE_OPTIONS_TEXTS).forEach(([modeId, text]) => {
    it(`${modeId}: oyun seçenekleri metni yasaklı bir çeviri İÇERMEZ`, () => {
      YASAKLI_ÇEVİRİLER.forEach(({ pattern, term }) => {
        assert.doesNotMatch(text, pattern, `${modeId} oyun seçenekleri metni "${term}"nin yanlış çevirisini içeriyor`);
      });
    });
  });
});

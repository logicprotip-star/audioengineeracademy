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

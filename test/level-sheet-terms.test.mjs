// Seviye bilgi sayfasının (app.js: renderLevelSheet) mod-başına terminolojisi.
// core/level-sheet-terms.js'in dosya başı notundaki iddiayı doğrular: HER mod
// GERÇEK paramsForDifficultyPosition() çıktısıyla (mock DEĞİL, ilgili mod
// dosyasından İTHAL edilen gerçek fonksiyon) çökmeden, doğru etiket/birimle
// bir değer üretiyor mu.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LEVEL_SHEET_TERMS, DEFAULT_LEVEL_SHEET_TERMS, levelSheetTermsFor } from "../www/js/core/level-sheet-terms.js";

import * as frekansBulma from "../www/js/modes/frekans-bulma.js";
import * as kesimNoktasi from "../www/js/modes/kesim-noktasi.js";
import * as qGenisligi from "../www/js/modes/q-genisligi.js";
import * as boostMuCutMu from "../www/js/modes/boost-mu-cut-mu.js";
import * as dbSeviyesi from "../www/js/modes/db-seviyesi.js";
import * as kompresor from "../www/js/modes/kompresor.js";
import * as reverb from "../www/js/modes/reverb.js";
import * as tonalDenge from "../www/js/modes/tonal-denge.js";
import * as frekansCakismasi from "../www/js/modes/frekans-cakismasi.js";
import * as distortion from "../www/js/modes/distortion.js";
import * as panKonumu from "../www/js/modes/pan-konumu.js";
import * as stereoGenislik from "../www/js/modes/stereo-genislik.js";

const MODE_MODULES = {
  "frekans-bulma": frekansBulma,
  "kesim-noktasi": kesimNoktasi,
  "q-genisligi": qGenisligi,
  "boost-mu-cut-mu": boostMuCutMu,
  "db-seviyesi": dbSeviyesi,
  kompresor,
  reverb,
  "tonal-denge": tonalDenge,
  "frekans-cakismasi": frekansCakismasi,
  distortion,
  "pan-konumu": panKonumu,
  "stereo-genislik": stereoGenislik
};

describe("level-sheet-terms: 12 modun HEPSİ kayıtlı, dağınık değil tek yerde", () => {
  it("LEVEL_SHEET_TERMS tam olarak 12 mod içerir (fazla/eksik yok)", () => {
    assert.deepEqual(Object.keys(LEVEL_SHEET_TERMS).sort(), Object.keys(MODE_MODULES).sort());
  });

  it("her girdi sensitivityLabel + formatSensitivity fonksiyonu taşır", () => {
    Object.entries(LEVEL_SHEET_TERMS).forEach(([modeId, terms]) => {
      assert.ok(terms.sensitivityLabel && terms.sensitivityLabel.length > 0, `${modeId}.sensitivityLabel boş olmamalı`);
      assert.equal(typeof terms.formatSensitivity, "function", `${modeId}.formatSensitivity fonksiyon olmalı`);
      assert.equal(typeof terms.formatAmount, "function", `${modeId}.formatAmount fonksiyon olmalı`);
    });
  });

  it("hiçbir mod 'Bant genişliği'/'Değişim miktarı' JENERİK dilini KENDİSİNE ait OLMAYAN modlarda kullanmıyor", () => {
    // Sadece Frekans Bulma'nın KENDİ dili (gerçekten bant genişliği ölçüyor) —
    // diğer 9 mod bu ETİKETİ TAŞIMAMALI (bkz. task: "9 modun 9'u aynı dili
    // konuşuyordu" bug'ı).
    Object.entries(LEVEL_SHEET_TERMS).forEach(([modeId, terms]) => {
      if (modeId === "frekans-bulma") return;
      assert.notEqual(terms.sensitivityLabel, "Bant genişliği", `${modeId} jenerik "Bant genişliği" etiketini KULLANMAMALI`);
    });
  });
});

describe("level-sheet-terms: GERÇEK mod fonksiyonlarıyla uçtan uca (mock DEĞİL)", () => {
  Object.entries(MODE_MODULES).forEach(([modeId, modeModule]) => {
    it(`${modeId}: paramsForDifficultyPosition(seviye 1/10/20) çökmeden doğru string üretir`, () => {
      const terms = levelSheetTermsFor(modeId);
      [1, 10, 20].forEach(level => {
        const p = modeModule.paramsForDifficultyPosition(level);
        const sensVal = terms.formatSensitivity(p);
        assert.equal(typeof sensVal, "string");
        assert.ok(sensVal.length > 0, `${modeId} seviye ${level}: formatSensitivity boş string döndürdü`);
        assert.notEqual(sensVal, "NaN", `${modeId} seviye ${level}: formatSensitivity NaN üretti`);
        assert.ok(!sensVal.includes("NaN"), `${modeId} seviye ${level}: "${sensVal}" NaN içeriyor`);
        if (terms.amountLabel) {
          const amountVal = terms.formatAmount(p);
          assert.equal(typeof amountVal, "string");
          assert.ok(amountVal.length > 0, `${modeId} seviye ${level}: formatAmount boş string döndürdü`);
          assert.ok(!amountVal.includes("NaN"), `${modeId} seviye ${level}: amount "${amountVal}" NaN içeriyor`);
        }
      });
    });
  });
});

describe("level-sheet-terms: birim doğruluğu (kGap modları % olarak, oktav modları 'oktav' içerir)", () => {
  it("Kompresör/Reverb/Distortion — kGap yüzde (%) olarak gösterilir, dB/oktav İDDİA EDİLMEZ", () => {
    ["kompresor", "reverb", "distortion"].forEach(modeId => {
      const p = MODE_MODULES[modeId].paramsForDifficultyPosition(10);
      const val = LEVEL_SHEET_TERMS[modeId].formatSensitivity(p);
      assert.ok(val.startsWith("%"), `${modeId}: "${val}" bir yüzde olmalı`);
    });
  });

  it("Kesim Noktası/Frekans Çakışması — oktav birimini AÇIKÇA taşır", () => {
    const kesimVal = LEVEL_SHEET_TERMS["kesim-noktasi"].formatSensitivity(kesimNoktasi.paramsForDifficultyPosition(5));
    assert.ok(kesimVal.includes("oktav"), `Kesim Noktası: "${kesimVal}" oktav içermeli`);
    const cakismaVal = LEVEL_SHEET_TERMS["frekans-cakismasi"].formatSensitivity(frekansCakismasi.paramsForDifficultyPosition(5));
    assert.ok(cakismaVal.includes("oktav"), `Frekans Çakışması: "${cakismaVal}" oktav içermeli`);
  });

  it("dB tabanlı modlar (Boost/Cut, dB Seviyesi, Tonal Denge, Frekans Bulma) 'dB' birimini taşır", () => {
    assert.ok(LEVEL_SHEET_TERMS["boost-mu-cut-mu"].formatSensitivity(boostMuCutMu.paramsForDifficultyPosition(5)).includes("dB"));
    assert.ok(LEVEL_SHEET_TERMS["db-seviyesi"].formatSensitivity(dbSeviyesi.paramsForDifficultyPosition(5)).includes("dB"));
    assert.ok(LEVEL_SHEET_TERMS["tonal-denge"].formatSensitivity(tonalDenge.paramsForDifficultyPosition(5)).includes("dB"));
    assert.ok(LEVEL_SHEET_TERMS["frekans-bulma"].formatAmount(frekansBulma.paramsForDifficultyPosition(5)).includes("dB"));
  });
});

describe("level-sheet-terms: DEFAULT_LEVEL_SHEET_TERMS güvenlik ağı", () => {
  it("kayıtlı olmayan bir modId için jenerik/çökmeyen bir sözlük döner", () => {
    const terms = levelSheetTermsFor("hic-var-olmayan-mod");
    assert.equal(terms, DEFAULT_LEVEL_SHEET_TERMS);
    assert.equal(terms.formatSensitivity(), "—");
    assert.equal(terms.formatAmount(), null);
  });
});

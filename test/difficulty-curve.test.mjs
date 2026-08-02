// difficulty-curve.js saf fonksiyon testleri (Z1).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { difficultyParams, tierForLevel, DIFFICULTY_CONFIG } from "../www/js/core/difficulty-curve.js";

describe("difficultyParams()", () => {
  it("seviye 1'de config'teki başlangıç değerlerini birebir döndürür", () => {
    const p = difficultyParams(1);
    assert.equal(p.gainDb, DIFFICULTY_CONFIG.GAIN_DB_AT_LEVEL_1);
    assert.equal(p.q, DIFFICULTY_CONFIG.Q_AT_LEVEL_1);
    assert.equal(p.toleranceOct, DIFFICULTY_CONFIG.TOLERANCE_OCT_AT_LEVEL_1);
    assert.equal(p.timeSec, DIFFICULTY_CONFIG.TIME_SEC_AT_LEVEL_1);
    assert.equal(p.capped, false);
  });

  it("tavanda (LEVEL_CAP) config'teki tavan değerlerini birebir döndürür", () => {
    const p = difficultyParams(DIFFICULTY_CONFIG.LEVEL_CAP);
    assert.ok(Math.abs(p.gainDb - DIFFICULTY_CONFIG.GAIN_DB_AT_CAP) < 1e-9);
    assert.ok(Math.abs(p.q - DIFFICULTY_CONFIG.Q_AT_CAP) < 1e-9);
    assert.equal(p.capped, true);
    assert.equal(p.contextApplied, false); // tam tavanda henüz "aşan" yok
  });

  it("gain seviye arttıkça MONOTON AZALIR (kolaydan zora doğru daha ince fark)", () => {
    let prev = Infinity;
    for (let lvl = 1; lvl <= DIFFICULTY_CONFIG.LEVEL_CAP; lvl++) {
      const { gainDb } = difficultyParams(lvl);
      assert.ok(gainDb <= prev + 1e-9, `seviye ${lvl}'de gain azalmadı`);
      prev = gainDb;
    }
  });

  it("Q seviye arttıkça MONOTON ARTAR (bant daralır)", () => {
    let prev = -Infinity;
    for (let lvl = 1; lvl <= DIFFICULTY_CONFIG.LEVEL_CAP; lvl++) {
      const { q } = difficultyParams(lvl);
      assert.ok(q >= prev - 1e-9, `seviye ${lvl}'de Q azaldı`);
      prev = q;
    }
  });

  it("ilerleme ORANSAL (logaritmik) — ardışık seviyeler arası ORAN sabit kalır, FARK değil", () => {
    // Doğrusal olsaydı ardışık farklar (gainDb[i]-gainDb[i+1]) sabit olurdu.
    // Logaritmik/oransal ilerlemede ardışık ORANLAR (gainDb[i]/gainDb[i+1]) sabit kalır.
    const ratios = [];
    for (let lvl = 1; lvl < DIFFICULTY_CONFIG.LEVEL_CAP; lvl++) {
      const a = difficultyParams(lvl).gainDb;
      const b = difficultyParams(lvl + 1).gainDb;
      ratios.push(a / b);
    }
    const first = ratios[0];
    ratios.forEach(r => assert.ok(Math.abs(r - first) < 1e-6, `oran sabit değil: ${r} !== ${first}`));

    // Karşılaştırma: FARKLAR sabit DEĞİL (doğrusal olmadığını da doğrudan kanıtla).
    const diffs = [];
    for (let lvl = 1; lvl < DIFFICULTY_CONFIG.LEVEL_CAP; lvl++) {
      diffs.push(difficultyParams(lvl).gainDb - difficultyParams(lvl + 1).gainDb);
    }
    const allEqual = diffs.every(d => Math.abs(d - diffs[0]) < 1e-6);
    assert.equal(allEqual, false, "farklar sabit çıktı — bu doğrusal ilerleme demektir, logaritmik değil");
  });

  it("tavandan SONRA hassasiyet (gain/Q/tolerans) SABİT kalır, sadece gain/süre bağlam zorluğuyla azalır", () => {
    const atCap = difficultyParams(DIFFICULTY_CONFIG.LEVEL_CAP);
    const over5 = difficultyParams(DIFFICULTY_CONFIG.LEVEL_CAP + 5);
    assert.equal(over5.q, atCap.q, "Q tavandan sonra değişmemeli");
    assert.equal(over5.toleranceOct, atCap.toleranceOct, "tolerans tavandan sonra değişmemeli");
    assert.ok(over5.gainDb < atCap.gainDb, "gain tavandan sonra bağlam zorluğuyla azalmalı");
    assert.ok(over5.timeSec <= atCap.timeSec, "süre tavandan sonra bağlam zorluğuyla azalmalı/eşit kalmalı");
    assert.equal(over5.contextApplied, true);
  });

  it("bağlam zorluğu bir TABANIN altına inmez (gain/süre sıfırlanamaz)", () => {
    const farOver = difficultyParams(DIFFICULTY_CONFIG.LEVEL_CAP + 1000);
    assert.ok(farOver.gainDb >= DIFFICULTY_CONFIG.CONTEXT_GAIN_FLOOR_DB - 1e-9);
    assert.ok(farOver.timeSec >= DIFFICULTY_CONFIG.CONTEXT_TIME_FLOOR_SEC - 1e-9);
  });

  it("seviye <1 veya ondalık için düşmez, seviye 1 gibi davranır", () => {
    assert.doesNotThrow(() => difficultyParams(0));
    assert.doesNotThrow(() => difficultyParams(-5));
    assert.equal(difficultyParams(0).level, 1);
  });
});

describe("tierForLevel()", () => {
  it("sınır değerleri config.TIER_BOUNDARIES ile birebir eşleşir", () => {
    assert.equal(tierForLevel(1), "easy");
    assert.equal(tierForLevel(4), "easy");
    assert.equal(tierForLevel(5), "medium");
    assert.equal(tierForLevel(8), "medium");
    assert.equal(tierForLevel(9), "hard");
    assert.equal(tierForLevel(12), "hard");
    assert.equal(tierForLevel(13), "pro");
    assert.equal(tierForLevel(999), "pro");
  });
});

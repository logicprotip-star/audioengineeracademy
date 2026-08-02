// session-plan.js saf fonksiyon testleri (Z2).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSessionPlan, pickWeightedDifficulty, SESSION_RAMP_WEIGHTS } from "../www/js/core/session-plan.js";

function countByTier(plan) {
  return plan.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
}

describe("buildSessionPlan()", () => {
  it("10 soru → tam olarak 3 kolay/3 orta/3 zor/1 pro", () => {
    const plan = buildSessionPlan(10);
    assert.equal(plan.length, 10);
    const counts = countByTier(plan);
    assert.deepEqual(counts, { easy: 3, medium: 3, hard: 3, pro: 1 });
  });

  it("5 soru → oran korunur, TOPLAM tam 5 (largest remainder)", () => {
    const plan = buildSessionPlan(5);
    assert.equal(plan.length, 5);
    const counts = countByTier(plan);
    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    assert.equal(sum, 5);
    // %30/%30/%30/%10'un 5 üzerinden en yakın tam sayı karşılığı: 2/2/1/0
    assert.deepEqual(counts, { easy: 2, medium: 2, hard: 1 });
  });

  it("ilk soru HER ZAMAN en kolay mevcut kademeden (20 tekrarda hiç istisna yok)", () => {
    for (let i = 0; i < 20; i++) {
      const plan = buildSessionPlan(10);
      assert.equal(plan[0], "easy", `tekrar ${i}: ilk soru "easy" değil, "${plan[0]}"`);
    }
  });

  it("20 kez üretilen 10-soruluk dizilimler HEP aynı dağılıma sahip ama SIRA değişir (karıştırma çalışıyor)", () => {
    const plans = Array.from({ length: 20 }, () => buildSessionPlan(10));
    plans.forEach(p => assert.deepEqual(countByTier(p), { easy: 3, medium: 3, hard: 3, pro: 1 }));
    // en az bir çift arasında sıra farkı olmalı (aksi hâlde "karıştırma" hiç çalışmıyor demektir)
    const serialized = plans.map(p => p.join(","));
    const allIdentical = serialized.every(s => s === serialized[0]);
    assert.equal(allIdentical, false, "20 tekrarın hepsi birebir aynı sırada — shuffle çalışmıyor olabilir");
  });

  it("totalQuestions=0 için boş dizi döner, hata fırlatmaz", () => {
    assert.deepEqual(buildSessionPlan(0), []);
  });

  it("özel ağırlıklarla da toplam korunur", () => {
    const plan = buildSessionPlan(10, { easy: 0.5, medium: 0.5 });
    assert.equal(plan.length, 10);
    const counts = countByTier(plan);
    assert.deepEqual(counts, { easy: 5, medium: 5 });
  });
});

describe("pickWeightedDifficulty() — Serbest (sonsuz) mod", () => {
  it("deterministik rng ile SESSION_RAMP_WEIGHTS sınırlarına göre doğru kademeyi seçer", () => {
    // Kümülatif sınırlar: easy [0,.3) medium [.3,.6) hard [.6,.9) pro [.9,1)
    assert.equal(pickWeightedDifficulty(SESSION_RAMP_WEIGHTS, () => 0.0), "easy");
    assert.equal(pickWeightedDifficulty(SESSION_RAMP_WEIGHTS, () => 0.29), "easy");
    assert.equal(pickWeightedDifficulty(SESSION_RAMP_WEIGHTS, () => 0.31), "medium");
    assert.equal(pickWeightedDifficulty(SESSION_RAMP_WEIGHTS, () => 0.59), "medium");
    assert.equal(pickWeightedDifficulty(SESSION_RAMP_WEIGHTS, () => 0.61), "hard");
    assert.equal(pickWeightedDifficulty(SESSION_RAMP_WEIGHTS, () => 0.89), "hard");
    assert.equal(pickWeightedDifficulty(SESSION_RAMP_WEIGHTS, () => 0.91), "pro");
    assert.equal(pickWeightedDifficulty(SESSION_RAMP_WEIGHTS, () => 0.999999), "pro");
  });

  it("1000 çekimlik dağılım SESSION_RAMP_WEIGHTS oranlarına makul toleransla yaklaşır", () => {
    const counts = { easy: 0, medium: 0, hard: 0, pro: 0 };
    for (let i = 0; i < 1000; i++) counts[pickWeightedDifficulty()]++;
    // %30/%30/%30/%10 hedef — 1000 çekimde ±%8 mutlak tolerans (istatistiksel gürültü payı)
    assert.ok(Math.abs(counts.easy / 1000 - 0.3) < 0.08, `easy oranı sapmış: ${counts.easy}`);
    assert.ok(Math.abs(counts.medium / 1000 - 0.3) < 0.08, `medium oranı sapmış: ${counts.medium}`);
    assert.ok(Math.abs(counts.hard / 1000 - 0.3) < 0.08, `hard oranı sapmış: ${counts.hard}`);
    assert.ok(Math.abs(counts.pro / 1000 - 0.1) < 0.08, `pro oranı sapmış: ${counts.pro}`);
  });
});

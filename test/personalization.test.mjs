// personalization.js saf fonksiyon testleri (Z4) — bölge bazlı kişiselleştirme.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { zoneWeakness, zoneWeight, pickPersonalizedZone, personalizedRange, getWeakZone, PERSONALIZATION_CONFIG } from "../www/js/core/personalization.js";
import { createQuestion, FA_ZONES, FA_MIN, FA_MAX, faZoneOf } from "../www/js/modes/frekans-bulma.js";

function mulberry32(seed) {
  // Basit, deterministik, bağımlılıksız PRNG — test tekrarlanabilirliği için.
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("zoneWeakness()", () => {
  it("yetersiz veride (n < MIN_SAMPLES) null döner", () => {
    assert.equal(zoneWeakness({ n: 1, ok: 0, sumDOct: 0, dOctCount: 0 }), null);
    assert.equal(zoneWeakness(null), null);
    assert.equal(zoneWeakness(undefined), null);
  });

  it("mükemmel isabet + sıfır sapma → weakness 0", () => {
    const w = zoneWeakness({ n: 10, ok: 10, sumDOct: 0, dOctCount: 10 });
    assert.equal(w, 0);
  });

  it("hep yanlış + büyük sapma → weakness 1'e YAKIN (üst sınır)", () => {
    const w = zoneWeakness({ n: 10, ok: 0, sumDOct: 10, dOctCount: 10 }); // avgDOct=1oct, referans 0.5'i aşıyor, 1'e clamp
    assert.ok(w > 0.9, `weakness çok düşük: ${w}`);
  });

  it("weakness her zaman [0,1] aralığında", () => {
    const cases = [
      { n: 5, ok: 5, sumDOct: 0, dOctCount: 5 },
      { n: 5, ok: 0, sumDOct: 20, dOctCount: 5 },
      { n: 3, ok: 2, sumDOct: 1, dOctCount: 2 }
    ];
    cases.forEach(c => {
      const w = zoneWeakness(c);
      assert.ok(w >= 0 && w <= 1, `aralık dışı: ${w}`);
    });
  });
});

describe("zoneWeight() — agresiflik sınırı", () => {
  it("yetersiz veri → ağırlık 1 (nötr)", () => {
    assert.equal(zoneWeight({ n: 0, ok: 0, sumDOct: 0, dOctCount: 0 }), 1);
  });

  it("en zayıf bölge en fazla (1+MAX_BOOST) ağırlık alır — güçlü bölgeye oranı sınırlı", () => {
    const worst = zoneWeight({ n: 20, ok: 0, sumDOct: 20, dOctCount: 20 });
    assert.ok(Math.abs(worst - (1 + PERSONALIZATION_CONFIG.MAX_BOOST)) < 1e-9);
    const best = zoneWeight({ n: 20, ok: 20, sumDOct: 0, dOctCount: 20 });
    assert.equal(best, 1);
    assert.equal(worst / best, 1 + PERSONALIZATION_CONFIG.MAX_BOOST); // oran sınırlı, sonsuz değil
  });
});

describe("pickPersonalizedZone() / personalizedRange()", () => {
  it("zoneStats boşken (yeni kullanıcı) 6 bölge arasında YAKLAŞIK EŞİT dağılım", () => {
    const rng = mulberry32(12345);
    const counts = {};
    for (let i = 0; i < 6000; i++) {
      const z = pickPersonalizedZone({}, FA_ZONES, [FA_MIN, FA_MAX], rng);
      const key = z.t.split(" (")[0];
      counts[key] = (counts[key] || 0) + 1;
    }
    const expected = 6000 / FA_ZONES.length;
    Object.values(counts).forEach(c => {
      assert.ok(Math.abs(c - expected) / expected < 0.15, `bölge dağılımı eşit değil: ${JSON.stringify(counts)}`);
    });
    assert.equal(Object.keys(counts).length, FA_ZONES.length, "6 bölgenin hepsi gelmeli");
  });

  it("range odak aralığıyla kesişmeyen bölgeler HİÇ seçilmez", () => {
    const rng = mulberry32(1);
    // "Bas" odak aralığı gibi dar bir aralık — sadece SUB/BAS/ALT-ORTA'yı kapsamalı
    const narrowRange = [FA_MIN, 400];
    for (let i = 0; i < 200; i++) {
      const z = personalizedRange({}, FA_ZONES, narrowRange, rng);
      assert.ok(z[0] >= FA_MIN - 1e-6 && z[1] <= 400 + 1e-6, `aralık dışına taştı: ${z}`);
    }
  });

  it("bir bölge çok zayıfken (0 doğru, büyük sapma) diğerlerinden BELİRGİN daha sık seçilir", () => {
    const rng = mulberry32(999);
    const zoneStats = {};
    // "SUB" hariç tüm bölgeler mükemmel, SUB çok kötü.
    FA_ZONES.forEach(z => {
      const key = z.t.split(" (")[0];
      zoneStats[key] = key === "SUB"
        ? { n: 10, ok: 0, sumDOct: 10, dOctCount: 10 }
        : { n: 10, ok: 10, sumDOct: 0, dOctCount: 10 };
    });
    const counts = {};
    const N = 6000;
    for (let i = 0; i < N; i++) {
      const z = pickPersonalizedZone(zoneStats, FA_ZONES, [FA_MIN, FA_MAX], rng);
      const key = z.t.split(" (")[0];
      counts[key] = (counts[key] || 0) + 1;
    }
    const subShare = counts.SUB / N;
    const othersAvgShare = (N - counts.SUB) / N / (FA_ZONES.length - 1);
    assert.ok(subShare > othersAvgShare * 2, `SUB yeterince sık gelmiyor: SUB=${subShare}, diğer ort=${othersAvgShare}`);
    // AGRESİFLİK SINIRI: en zayıf bölge bile TÜM soruları yutmuyor (diğerleri de geliyor).
    assert.ok(counts.SUB < N * 0.6, `SUB aşırı baskın, agresiflik sınırı çalışmıyor olabilir: ${subShare}`);
    FA_ZONES.forEach(z => {
      const key = z.t.split(" (")[0];
      if (key !== "SUB") assert.ok(counts[key] > 0, `${key} hiç gelmedi — kullanıcı sadece zayıf bölgeyle boğuluyor`);
    });
  });
});

// G50: SINAV SİSTEMİNİN 7 moda yayılması — frekans-tabanlı modların (Frekans
// Bulma/Kesim Noktası/Boost-Cut/Q Genişliği) telafisi için exam-system.js:
// getWeakTier'ın AYNI ROL, FREKANS BÖLGESİ ekseninde. pickPersonalizedZone'un
// AKSİNE RASTGELE DEĞİL, DETERMİNİSTİK en zayıf bölgeyi döner.
describe("getWeakZone() — G50: sınav telafisi için DETERMİNİSTİK en zayıf bölge", () => {
  it("hiçbir bölge MIN_SAMPLES'a ulaşmamışsa (yeni kullanıcı) null döner", () => {
    assert.equal(getWeakZone({}, FA_ZONES), null);
    assert.equal(getWeakZone(null, FA_ZONES), null);
    const sparse = { SUB: { n: 1, ok: 0, sumDOct: 1, dOctCount: 1 } }; // MIN_SAMPLES=3'ün altında
    assert.equal(getWeakZone(sparse, FA_ZONES), null);
  });

  it("TEK bir bölge yeterli veri taşıyorsa (diğerleri hâlâ null) O bölgeyi döner", () => {
    const zoneStats = { BAS: { n: 5, ok: 1, sumDOct: 4, dOctCount: 4 } };
    const weak = getWeakZone(zoneStats, FA_ZONES);
    assert.ok(weak, "yeterli veri olan tek bölge bile dönmeli");
    assert.equal(weak.zone.t.split(" (")[0], "BAS");
  });

  it("EN DÜŞÜK doğruluk/EN BÜYÜK sapmaya sahip bölgeyi döner (getWeakTier'ın AYNI mantığı, RASTGELE değil)", () => {
    const zoneStats = {};
    FA_ZONES.forEach(z => {
      const key = z.t.split(" (")[0];
      zoneStats[key] = key === "TİZ / HAVA"
        ? { n: 10, ok: 1, sumDOct: 9, dOctCount: 9 }  // en zayıf
        : { n: 10, ok: 9, sumDOct: 0.2, dOctCount: 1 }; // güçlü
    });
    const weak = getWeakZone(zoneStats, FA_ZONES);
    assert.equal(weak.zone.t.split(" (")[0], "TİZ / HAVA");
    assert.ok(weak.weakness > 0.5, `weakness beklenenden düşük: ${weak.weakness}`);
  });

  it("DETERMİNİSTİK — rng YOK, aynı girdiyle HER ZAMAN aynı sonuç (pickPersonalizedZone'un rastgeleliğinden AYRIŞIR)", () => {
    const zoneStats = { BAS: { n: 5, ok: 0, sumDOct: 5, dOctCount: 5 }, ORTA: { n: 5, ok: 4, sumDOct: 0.5, dOctCount: 1 } };
    const results = new Set();
    for (let i = 0; i < 20; i++) results.add(getWeakZone(zoneStats, FA_ZONES).zone.t);
    assert.equal(results.size, 1, "aynı girdiyle FARKLI sonuçlar çıktı — deterministik olmalıydı");
  });

  it("zones boş dizi/undefined ise çökmez, null döner", () => {
    assert.equal(getWeakZone({ SUB: { n: 10, ok: 0, sumDOct: 5, dOctCount: 5 } }, []), null);
    assert.equal(getWeakZone({ SUB: { n: 10, ok: 0, sumDOct: 5, dOctCount: 5 } }, undefined), null);
  });
});

describe("createQuestion() ile uçtan uca — Z4 doğrulama (100 soru, örnek performans verisi)", () => {
  it("SUB bölgesinde zayıf kullanıcı için 100 sorudan SUB payı, veri-yok durumuna göre BELİRGİN yüksek", () => {
    const zoneStatsWeak = {};
    FA_ZONES.forEach(z => {
      const key = z.t.split(" (")[0];
      zoneStatsWeak[key] = key === "SUB"
        ? { n: 10, ok: 1, sumDOct: 8, dOctCount: 9 }
        : { n: 10, ok: 9, sumDOct: 0.3, dOctCount: 1 };
    });
    const rng = mulberry32(42);
    let subCountWeak = 0;
    for (let i = 0; i < 100; i++) {
      const q = createQuestion("medium", { zoneStats: zoneStatsWeak, rng });
      if (faZoneOf(q.freq).t.split(" (")[0] === "SUB") subCountWeak++;
    }

    const rng2 = mulberry32(42); // aynı tohum — sadece zoneStats verisinin etkisini izole et
    let subCountNoData = 0;
    for (let i = 0; i < 100; i++) {
      const q = createQuestion("medium", { rng: rng2 }); // zoneStats YOK → eski davranış (personalizasyon YOK)
      if (faZoneOf(q.freq).t.split(" (")[0] === "SUB") subCountNoData++;
    }

    // SON RAPOR'a taşınacak sayısal kanıt:
    assert.ok(subCountWeak > subCountNoData, `zayıf bölge payı artmadı: weak=${subCountWeak} noData=${subCountNoData}`);
  });

  it("zoneStats verilmezse createQuestion ESKİ (kişiselleştirmesiz) davranışla birebir uyumlu — geriye dönük uyumluluk", () => {
    // Sadece çökmediğini ve geçerli bir soru ürettiğini doğrula (tam değer testi
    // frekans-bulma.test.mjs'te zaten var, burada sadece yeni parametrenin opsiyonel
    // olduğunu kanıtlıyoruz).
    const q = createQuestion("medium", {});
    assert.ok(q.freq >= FA_MIN && q.freq <= FA_MAX);
  });
});

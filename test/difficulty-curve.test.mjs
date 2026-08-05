// difficulty-curve.js saf fonksiyon testleri (Z1).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  difficultyParams, tierForLevel, qToOctaveBandwidth, formatOctaveBandwidth, DIFFICULTY_CONFIG,
  logLerp, applyPostCapFloor, continuousLevel, sessionRampOffset, SESSION_RAMP_CONFIG, representativeLevelForTier
} from "../www/js/core/difficulty-curve.js";

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

describe("qToOctaveBandwidth() / formatOctaveBandwidth() — Z6 lvlSheet", () => {
  it("Q arttıkça bant genişliği (oktav) AZALIR (dar bant = yüksek Q)", () => {
    const bwLow = qToOctaveBandwidth(0.8);
    const bwHigh = qToOctaveBandwidth(5.0);
    assert.ok(bwHigh < bwLow, `Q arttıkça bant daralmadı: ${bwLow} → ${bwHigh}`);
  });

  it("makul aralıkta gerçekçi oktav değerleri üretir (RBJ formülü sağlaması)", () => {
    // Q=1 için standart RBJ tablolarında BW ~1.4 oktav civarıdır.
    const bw = qToOctaveBandwidth(1);
    assert.ok(bw > 1.2 && bw < 1.6, `Q=1 için beklenmeyen bant genişliği: ${bw}`);
  });

  it("q<=0 için 0 döner, çökmez", () => {
    assert.equal(qToOctaveBandwidth(0), 0);
    assert.equal(qToOctaveBandwidth(-1), 0);
  });

  it("formatOctaveBandwidth: 1 oktavın altında '1/N oktav', üstünde ondalık", () => {
    assert.equal(formatOctaveBandwidth(0.333), "1/3 oktav");
    assert.equal(formatOctaveBandwidth(0.25), "1/4 oktav");
    assert.equal(formatOctaveBandwidth(1.7), "1.7 oktav");
    assert.equal(formatOctaveBandwidth(0), "0 oktav");
  });

  it("difficultyParams'ın q çıktısıyla uçtan uca tutarlı — seviye arttıkça bant daralır", () => {
    const bwAtLevel1 = qToOctaveBandwidth(difficultyParams(1).q);
    const bwAtCap = qToOctaveBandwidth(difficultyParams(DIFFICULTY_CONFIG.LEVEL_CAP).q);
    assert.ok(bwAtCap < bwAtLevel1);
  });
});

// ADIM 1 — merkezi zorluk matematiği (logLerp/applyPostCapFloor/continuousLevel/
// sessionRampOffset/representativeLevelForTier) SAF fonksiyon testleri. Bunlar
// hiçbir mod-özel sayı taşımaz (bkz. dosya başı not) — kesim-noktasi.js'in kendi
// KESIM_CURVE_CONFIG'iyle bu fonksiyonları NASIL kullandığı test/kesim-noktasi.test.mjs'te.

describe("logLerp() — paylaşılan oransal interpolasyon", () => {
  it("t=0'da atLevel1, t=1'de atCap döner", () => {
    assert.equal(logLerp(10, 2, 0), 10);
    assert.ok(Math.abs(logLerp(10, 2, 1) - 2) < 1e-9);
  });
  it("t=0.5'te GEOMETRİK ortalama döner (aritmetik değil)", () => {
    const mid = logLerp(4, 16, 0.5);
    assert.ok(Math.abs(mid - 8) < 1e-9, `geometrik ortalama 8 olmalıydı, ${mid} geldi`); // sqrt(4*16)=8
  });
  it("atLevel1/atCap sıfır veya negatifse doğrusal düşüşe güvenli düşer, çökmez", () => {
    assert.doesNotThrow(() => logLerp(0, 5, 0.5));
    assert.doesNotThrow(() => logLerp(-3, 5, 0.5));
  });
});

describe("applyPostCapFloor() — paylaşılan tavan-sonrası taban kalıbı", () => {
  it("level <= levelCap ise curveValue AYNEN döner (tavan aşılmadı)", () => {
    assert.equal(applyPostCapFloor(10, 5, 20, 1, 0.5), 10);
    assert.equal(applyPostCapFloor(10, 20, 20, 1, 0.5), 10); // tam tavanda henüz "aşan" yok
  });
  it("level > levelCap ise her ekstra seviyede reductionPerStep kadar azalır", () => {
    assert.ok(Math.abs(applyPostCapFloor(10, 23, 20, 1, 0.5) - 8.5) < 1e-9); // 10 - 3*0.5
  });
  it("azalış TABANIN altına inmez", () => {
    assert.equal(applyPostCapFloor(10, 1000, 20, 3, 0.5), 3);
  });
});

describe("continuousLevel() — XP ilerlemesinden KESİRLİ seviye", () => {
  it("current=0 ise tam seviyenin kendisini döner", () => {
    assert.equal(continuousLevel({ level: 6, current: 0, required: 120 }), 6);
  });
  it("current, required'ın yarısıysa seviye+0.5 döner", () => {
    assert.equal(continuousLevel({ level: 6, current: 60, required: 120 }), 6.5);
  });
  it("current required'a EŞİTSE (levelFromXp'in hemen atlayacağı sınır) seviye+1'e YAKLAŞIR ama TAŞMAZ (kırpılır)", () => {
    assert.equal(continuousLevel({ level: 6, current: 200, required: 120 }), 7);
  });
  it("xpProg yoksa/required<=0 ise çökmez, mantıklı bir seviyeye düşer", () => {
    assert.equal(continuousLevel(null), 1);
    assert.equal(continuousLevel({ level: 3, current: 0, required: 0 }), 3);
  });
});

describe("sessionRampOffset() — seans içi ısınma→zorlaşma→boss rampası", () => {
  it("döngü BAŞINDA (index 0) en DÜŞÜK (ısınma) ofseti döner", () => {
    assert.equal(sessionRampOffset(0, { boss: false }), SESSION_RAMP_CONFIG.MIN_OFFSET);
  });
  it("döngü SONUNDA (index CYCLE_LENGTH-1, {boss:false} verilse bile) en YÜKSEK NON-BOSS ofseti döner", () => {
    // NOT: bu index GERÇEK oyunda genelde boss'a denk gelir (bkz. isBossRound aynı
    // periyot) ama sessionRampOffset bunu KENDİSİ VARSAYMAZ — index'in şekle göre
    // ürettiği ofset ile {boss:true}'nun EZDİĞİ ofset AYRI kavramlar (bkz. fonksiyon notu).
    const lastIndex = SESSION_RAMP_CONFIG.CYCLE_LENGTH - 1;
    assert.equal(sessionRampOffset(lastIndex, { boss: false }), SESSION_RAMP_CONFIG.MAX_OFFSET);
  });
  it("döngü İÇİNDE MONOTON ARTAR (ısınmadan zorlaşmaya pürüzsüz geçiş)", () => {
    let prev = -Infinity;
    for (let i = 0; i < SESSION_RAMP_CONFIG.CYCLE_LENGTH; i++) {
      const off = sessionRampOffset(i, { boss: false });
      assert.ok(off >= prev - 1e-9, `index ${i}'de ofset azaldı`);
      prev = off;
    }
  });
  it("{boss:true} döngüdeki KONUMDAN BAĞIMSIZ HER ZAMAN en yüksek (BOSS_OFFSET) ofseti döner", () => {
    for (let i = 0; i < 15; i++) {
      assert.equal(sessionRampOffset(i, { boss: true }), SESSION_RAMP_CONFIG.BOSS_OFFSET);
    }
  });
  it("döngü TEKRARLANIR (5. index, 0. index ile AYNI ofseti verir — periyodik)", () => {
    assert.equal(sessionRampOffset(0, {}), sessionRampOffset(5, {}));
    assert.equal(sessionRampOffset(2, {}), sessionRampOffset(7, {}));
  });
  it("negatif/ondalık index çökmez, güvenli bir index'e düşer", () => {
    assert.doesNotThrow(() => sessionRampOffset(-3, {}));
    assert.doesNotThrow(() => sessionRampOffset(2.7, {}));
  });
});

describe("representativeLevelForTier() — 'Sabit' modun tier→sürekli-seviye çapası", () => {
  it("her tier kendi TIER_BOUNDARIES aralığının ORTA NOKTASINI döner", () => {
    assert.equal(representativeLevelForTier("easy"), 2.5);   // (1+4)/2
    assert.equal(representativeLevelForTier("medium"), 6.5); // (5+8)/2
    assert.equal(representativeLevelForTier("hard"), 10.5);  // (9+12)/2
  });
  it("üst sınırı Infinity olan son tier (pro) LEVEL_CAP-4 civarına çapalanır, sonsuza gitmez", () => {
    const pro = representativeLevelForTier("pro");
    assert.ok(Number.isFinite(pro) && pro > 12 && pro < DIFFICULTY_CONFIG.LEVEL_CAP);
  });
  it("tier isimleri MONOTON ARTAN temsilci seviye üretir (easy < medium < hard < pro)", () => {
    const easy = representativeLevelForTier("easy");
    const medium = representativeLevelForTier("medium");
    const hard = representativeLevelForTier("hard");
    const pro = representativeLevelForTier("pro");
    assert.ok(easy < medium && medium < hard && hard < pro);
  });
  it("tanımsız bir tier ismi çökmez, güvenli (1) bir değere düşer", () => {
    assert.equal(representativeLevelForTier("olmayan-tier"), 1);
  });
});

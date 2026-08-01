// Frekans Bulma moduna özel testler: boost-only kolay/orta kuralı, oktav bazlı
// puanlama (lineer Hz DEĞİL), soru havuzunun frekans aralığı, Pro Plus bant ayrımı,
// odak aralığı (FOCUS_RANGES).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/frekans-bulma.js";

describe("Frekans Bulma — boost-only kolay/orta kuralı", () => {
  it("kolay ve orta seviyede gain HER ZAMAN pozitif (sadece boost, kesim yok)", () => {
    for (const level of ["easy", "medium"]) {
      let sawPositive = false;
      for (let i = 0; i < 200; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.ok(q.gain > 0, `${level} seviyede negatif gain üretildi: ${q.gain}`);
        if (q.gain > 0) sawPositive = true;
      }
      assert.ok(sawPositive);
    }
  });

  it("zor ve üstü seviyelerde hem boost hem kesim (negatif gain) görülebilir", () => {
    for (const level of ["hard", "pro"]) {
      let sawPositive = false, sawNegative = false;
      for (let i = 0; i < 200; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        if (q.gain > 0) sawPositive = true;
        if (q.gain < 0) sawNegative = true;
      }
      assert.ok(sawPositive, `${level}: hiç boost görülmedi (200 denemede)`);
      assert.ok(sawNegative, `${level}: hiç kesim görülmedi (200 denemede) — boost-only olmamalıydı`);
    }
  });

  it("boss round'da gain mutlak değeri normal round'dan küçük (daha zor/yakın)", () => {
    const diff = mode.DIFFICULTY.medium;
    const normal = mode.createQuestion("medium", { source: "pink", boss: false });
    const boss = mode.createQuestion("medium", { source: "pink", boss: true });
    assert.ok(Math.abs(normal.gain) <= diff.gain + 1e-9);
    assert.ok(Math.abs(boss.gain) <= diff.gain * 0.75 + 1e-9);
  });
});

describe("Frekans Bulma — puanlama OKTAV bazlı (lineer Hz değil)", () => {
  it("aynı oktav mesafesi, farklı frekans bölgelerinde aynı doğru/yanlış sonucunu verir", () => {
    // 100 Hz'den 0.5 oktav uzak: 100 * 2^0.5 ≈ 141.42 Hz
    // 10000 Hz'den 0.5 oktav uzak: 10000 * 2^0.5 ≈ 14142.1 Hz
    // Lineer Hz farkı KIYASLANAMAYACAK kadar farklı (41.4 Hz vs 4142.1 Hz) ama oktav
    // mesafesi eşit — ikisi de "doğru" sınırının TAM üstünde olmalı (dOct venue 0.5 ile aynı).
    const qLow = { mode: "frequency", freq: 100, gain: 6, q: 2 };
    const qHigh = { mode: "frequency", freq: 10000, gain: 6, q: 2 };

    const lowGuess = 100 * Math.pow(2, 0.5);
    const highGuess = 10000 * Math.pow(2, 0.5);

    const rLow = mode.evaluateAnswer(qLow, lowGuess);
    const rHigh = mode.evaluateAnswer(qHigh, highGuess);

    assert.ok(Math.abs(rLow.dOct - 0.5) < 1e-9);
    assert.ok(Math.abs(rHigh.dOct - 0.5) < 1e-9);
    assert.equal(rLow.correct, rHigh.correct); // ikisi de aynı eşikte aynı sonucu vermeli
  });

  it("0.5 oktav sınırı: içeride doğru, dışarıda yanlış", () => {
    const q = { mode: "frequency", freq: 1000, gain: 6, q: 2 };
    const justInside = mode.evaluateAnswer(q, 1000 * Math.pow(2, 0.49));
    const justOutside = mode.evaluateAnswer(q, 1000 * Math.pow(2, 0.51));
    assert.equal(justInside.correct, true);
    assert.equal(justOutside.correct, false);
  });

  it("lineer Hz farkı büyük ama oktav mesafesi küçükse yine de doğru sayılır (bas bölgesi)", () => {
    // 100 Hz'e göre +30 Hz (130 Hz) lineer olarak "büyük" görünebilir ama oktav mesafesi
    // log2(130/100) ≈ 0.379 oktav — 0.5 sınırının içinde, yani DOĞRU sayılmalı.
    const q = { mode: "frequency", freq: 100, gain: 6, q: 2 };
    const result = mode.evaluateAnswer(q, 130);
    assert.ok(result.dOct < 0.5);
    assert.equal(result.correct, true);
  });

  it("kalite etiketleri oktav eşiklerine göre değişir (0.17 / 0.33 / 0.5)", () => {
    const q = { mode: "frequency", freq: 1000, gain: 6, q: 2 };
    const tam = mode.evaluateAnswer(q, 1000 * Math.pow(2, 0.10));
    const cokIyi = mode.evaluateAnswer(q, 1000 * Math.pow(2, 0.25));
    const dogru = mode.evaluateAnswer(q, 1000 * Math.pow(2, 0.45));
    assert.equal(tam.quality, "🎯 Tam isabet!");
    assert.equal(cokIyi.quality, "Çok iyi!");
    assert.equal(dogru.quality, "Doğru!");
  });
});

describe("Frekans Bulma — soru havuzu aralığı (\"odak aralığı\" analogu)", () => {
  it(`tüm seviyelerde üretilen frekanslar sabit havuz aralığında kalır (${mode.FA_MIN}-${mode.FA_MAX} Hz)`, () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 40; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        const freqs = q.mode === "proplus" ? q.bands.map(b => b.freq) : [q.freq];
        freqs.forEach(f => {
          assert.ok(f >= mode.FA_MIN, `${f} < FA_MIN (${mode.FA_MIN})`);
          assert.ok(f <= mode.FA_MAX, `${f} > FA_MAX (${mode.FA_MAX})`);
        });
      }
    }
  });

  it("faXToF/faFToX havuz sınırlarıyla tutarlı (round-trip)", () => {
    const w = 1200;
    for (const f of [mode.FA_MIN, 1000, mode.FA_MAX]) {
      const x = mode.faFToX(f, w);
      const back = mode.faXToF(x, w);
      assert.ok(Math.abs(back - f) < 0.01);
    }
  });
});

describe("Frekans Bulma — Pro Plus bant üretimi", () => {
  it("buildProPlusBands istenen sayıda, birbirinden en az ~0.9 oktav ayrık bant üretir", () => {
    for (let i = 0; i < 30; i++) {
      const bands = mode.buildProPlusBands(4, 8);
      assert.equal(bands.length, 4);
      for (let a = 0; a < bands.length; a++) {
        for (let b = a + 1; b < bands.length; b++) {
          const dOct = Math.abs(Math.log2(bands[a].freq / bands[b].freq));
          assert.ok(dOct >= 0.9 - 1e-9, `bantlar çok yakın: ${bands[a].freq} / ${bands[b].freq}`);
        }
      }
    }
  });

  it("bantlar frekansa göre artan sırada döner", () => {
    const bands = mode.buildProPlusBands(4, 8);
    for (let i = 1; i < bands.length; i++) {
      assert.ok(bands[i].freq >= bands[i - 1].freq);
    }
  });

  it("evaluateAnswer proplus'ta her tahmini en yakın EŞLEŞMEMİŞ banda atar", () => {
    const q = mode.createQuestion("proplus", { source: "pink", boss: false });
    // sadece ilk 2 bandı doğru işaretle, kalan 2'yi hiç işaretleme
    const guesses = [q.bands[0].freq, q.bands[1].freq];
    const result = mode.evaluateAnswer(q, guesses);
    assert.equal(result.hit, 2);
    assert.equal(result.bands.filter(b => b.matched).length, 2);
  });
});

describe("Frekans Bulma — isBossRound", () => {
  it("her 5 turda bir boss round gelir (round index 0-tabanlı stats.rounds)", () => {
    assert.equal(mode.isBossRound(4), true);  // 5. round (0-tabanlı 4) boss
    assert.equal(mode.isBossRound(9), true);  // 10. round
    assert.equal(mode.isBossRound(0), false);
    assert.equal(mode.isBossRound(3), false);
  });
});

describe("Frekans Bulma — odak aralığı (FOCUS_RANGES)", () => {
  it("her odak seçeneğinde, tüm zorluklarda üretilen frekans(lar) SADECE seçilen aralıkta kalır (10 soru × zorluk × seçenek)", () => {
    const report = [];
    for (const focus of Object.values(mode.FOCUS_RANGES)) {
      for (const level of Object.keys(mode.DIFFICULTY)) {
        let n = 0;
        for (let i = 0; i < 10; i++) {
          const q = mode.createQuestion(level, { source: "pink", boss: false, focusRange: focus.range });
          const freqs = q.mode === "proplus" ? q.bands.map(b => b.freq) : [q.freq];
          freqs.forEach(f => {
            n++;
            assert.ok(f >= focus.range[0] - 1e-9, `${focus.id}/${level}: ${f} < ${focus.range[0]}`);
            assert.ok(f <= focus.range[1] + 1e-9, `${focus.id}/${level}: ${f} > ${focus.range[1]}`);
          });
        }
        report.push(`${focus.id}/${level}: ${n} freq kontrol edildi`);
      }
    }
    assert.equal(report.length, Object.keys(mode.FOCUS_RANGES).length * Object.keys(mode.DIFFICULTY).length);
  });

  it("şıklı moddaki cevap seçenekleri de odak aralığının DIŞINA çıkmaz (dar aralıkta bile)", () => {
    for (const focus of Object.values(mode.FOCUS_RANGES)) {
      for (const level of ["easy", "medium", "hard", "pro"]) {
        for (let i = 0; i < 20; i++) {
          const q = mode.createQuestion(level, { source: "pink", boss: false, focusRange: focus.range });
          q.choices.forEach(c => {
            assert.ok(c.freq >= focus.range[0] - 1e-9, `${focus.id}/${level}: şık ${c.freq} < ${focus.range[0]}`);
            assert.ok(c.freq <= focus.range[1] + 1e-9, `${focus.id}/${level}: şık ${c.freq} > ${focus.range[1]}`);
          });
        }
      }
    }
  });

  it("dar odak aralığında (Bas/Orta, ~2.3 oktav) generateChoices EN AZ 2 şık üretir, asla 1'e düşmez", () => {
    for (const focusId of ["bass", "mid"]) {
      const focus = mode.FOCUS_RANGES[focusId];
      for (const level of ["hard", "pro"]) {
        for (let i = 0; i < 30; i++) {
          const q = mode.createQuestion(level, { source: "pink", boss: false, focusRange: focus.range });
          assert.ok(q.choices.length >= 2, `${focusId}/${level}: sadece ${q.choices.length} şık`);
        }
      }
    }
  });

  it("focusRange verilmezse davranış TAMAMEN eskisiyle aynı (tüm spektrum, geriye dönük uyumlu)", () => {
    const q = mode.createQuestion("pro", { source: "pink", boss: false });
    assert.equal(q.choices.length, mode.DIFFICULTY.pro.options);
  });

  it("focusIdForZone her FA_ZONES bölgesi için geçerli bir FOCUS_RANGES anahtarı döndürür", () => {
    mode.FA_ZONES.forEach(z => {
      const key = z.t.split(" (")[0];
      const focusId = mode.focusIdForZone(key);
      assert.ok(Object.prototype.hasOwnProperty.call(mode.FOCUS_RANGES, focusId),
        `${key} → "${focusId}" FOCUS_RANGES'ta yok`);
    });
  });

  it("buildProPlusBands dar bir odak aralığında istenenden az bant dönebilir ama ASLA range dışına taşmaz", () => {
    const focus = mode.FOCUS_RANGES.bass; // ~2.3 oktav, 4 bant için ~2.7 oktav gerekir
    for (let i = 0; i < 20; i++) {
      const bands = mode.buildProPlusBands(4, 8, focus.range);
      assert.ok(bands.length <= 4);
      bands.forEach(b => {
        assert.ok(b.freq >= focus.range[0] - 1e-9 && b.freq <= focus.range[1] + 1e-9);
      });
    }
  });
});

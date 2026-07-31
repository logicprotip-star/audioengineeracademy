// Mod sözleşmesi testleri — şu an tek mod var (Frekans Bulma), ama bu dosya
// yeni bir mod eklendiğinde MODES dizisine ekleyip aynı testleri onun üzerinde de
// çalıştırabilecek şekilde yazıldı: createQuestion/evaluateAnswer SAF fonksiyon mu,
// üretilen değerler tanımlı aralıkta mı, calculateXP makul mü.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as frekansBulma from "../www/js/modes/frekans-bulma.js";

const MODES = [frekansBulma];

for (const mode of MODES) {
  const meta = mode.getMeta();
  const levels = Object.keys(meta.difficulty);

  describe(`mod sözleşmesi: ${meta.ad} (${meta.id})`, () => {
    it("getMeta() gerekli alanları döndürür", () => {
      assert.equal(typeof meta.id, "string");
      assert.ok(meta.id.length > 0);
      assert.equal(typeof meta.ad, "string");
      assert.equal(typeof meta.aciklama, "string");
      assert.ok(Number.isInteger(meta.motor));
      assert.equal(typeof meta.kulaklikGerekli, "boolean");
      assert.ok(Array.isArray(meta.uyumluKaynaklar) && meta.uyumluKaynaklar.length > 0);
      assert.equal(typeof meta.ucretsiz, "boolean");
      assert.equal(typeof meta.videoUrl, "string");
    });

    for (const level of levels) {
      it(`createQuestion("${level}") geçerli bir soru üretir`, () => {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.difficulty, level);
        assert.equal(typeof q.mode, "string");
        assert.equal(typeof q.hintUsed, "boolean");
        assert.equal(q.hintUsed, false);
      });

      it(`createQuestion("${level}") SAF fonksiyondur: ses/DOM nesnesi döndürmez`, () => {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        const json = JSON.stringify(q); // saf veri ise sorunsuz serileşir
        assert.ok(json.length > 0);
        assert.equal(typeof q.applyProcessing, "undefined");
      });

      it(`createQuestion("${level}") üretilen frekans(lar) modun tanımlı aralığında (${mode.FA_MIN}-${mode.FA_MAX} Hz)`, () => {
        for (let i = 0; i < 25; i++) {
          const q = mode.createQuestion(level, { source: "pink", boss: false });
          const freqs = q.mode === "proplus" ? q.bands.map(b => b.freq) : [q.freq];
          freqs.forEach(f => {
            assert.ok(f >= mode.FA_MIN && f <= mode.FA_MAX, `freq ${f} aralık dışında`);
          });
        }
      });
    }

    it("evaluateAnswer SAF fonksiyondur ve doğru cevaba doğru, yanlışa yanlış der (frequency)", () => {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      const exact = mode.evaluateAnswer(q, q.freq);
      assert.equal(exact.correct, true);

      const farAway = mode.evaluateAnswer(q, q.freq * 4); // 2 oktav uzak
      assert.equal(farAway.correct, false);
    });

    it("evaluateAnswer SAF fonksiyondur ve doğru cevaba doğru, yanlışa yanlış der (proplus)", () => {
      const q = mode.createQuestion("proplus", { source: "pink", boss: false });
      const perfect = mode.evaluateAnswer(q, q.bands.map(b => b.freq));
      assert.equal(perfect.correct, true);
      assert.equal(perfect.hit, q.bands.length);

      // Bantlardan HER BİRİNE en az 1 oktav uzak, birbirine göre sabit (deterministik)
      // sahte bantlarla: greedy en-yakın eşleştirme tesadüfen bile hiçbirini
      // eşleştiremesin diye createQuestion'ın rastgele frekansları yerine sabit bir
      // soru kullanılır.
      const fixedQ = {
        mode: "proplus",
        bands: [
          { freq: 100, gain: 6, q: 3.2 },
          { freq: 400, gain: -6, q: 3.2 },
          { freq: 1600, gain: 6, q: 3.2 },
          { freq: 6400, gain: -6, q: 3.2 }
        ]
      };
      const allWrong = mode.evaluateAnswer(fixedQ, [50, 50, 50, 50]);
      assert.equal(allWrong.correct, false);
      assert.equal(allWrong.hit, 0);
    });

    for (const level of levels) {
      it(`difficulty "${level}" beklenen round parametrelerini verir (time/lives sayısal)`, () => {
        const diff = meta.difficulty[level];
        assert.ok(typeof diff.time === "number" && diff.time > 0);
        assert.ok(Number.isInteger(diff.lives) && diff.lives > 0);
      });

      it(`calculateXP("${level}") negatif değil ve üst sınırı aşmıyor`, () => {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        const result = q.mode === "proplus"
          ? mode.evaluateAnswer(q, q.bands.map(b => b.freq))
          : mode.evaluateAnswer(q, q.freq);

        const context = { combo: 20, timeLeft: 100, roundDuration: 10, xpMultiplier: 1.5 }; // uç/aşırı durum
        const gained = mode.calculateXP(q, result, false, level, context);
        assert.ok(gained >= 0, `XP negatif: ${gained}`);

        // Makul üst sınır: base xp * en yüksek olası çarpan zinciri (combo 2.4, boss 1.65,
        // time 1.2, challenge 1.5) + proplus'ta oran/bonus çarpanı (1.5) payı bırak.
        const maxPlausible = meta.difficulty[level].xp * 2.4 * 1.65 * 1.2 * 1.5 * 1.5 + 5;
        assert.ok(gained <= maxPlausible, `XP mantıksız derecede yüksek: ${gained} > ${maxPlausible}`);
      });

      it(`calculateXP("${level}") yanlış cevapta 0 döner`, () => {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        const wrongAnswer = q.mode === "proplus" ? [] : q.freq * 8;
        const result = mode.evaluateAnswer(q, wrongAnswer);
        assert.equal(result.correct, false);
        const gained = mode.calculateXP(q, result, false, level, { combo: 5, timeLeft: 5, roundDuration: 10, xpMultiplier: 1 });
        assert.equal(gained, 0);
      });
    }
  });
}

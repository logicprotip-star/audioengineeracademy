// utils.js saf yardımcı fonksiyon testleri.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { turkishLocative } from "../www/js/core/utils.js";
import { MODE_CATALOG } from "../www/js/core/mode-catalog.js";

describe("turkishLocative()", () => {
  // Beklenen ekler: kullanıcı tarafından verilen liste (2'de, 3'te, 4'te, 5'te,
  // 6'da, 7'de, 8'de, 9'da, 10'da, 12'de, 14'te, 16'da, 20'de) — mode-catalog.js'teki
  // TÜM unlockLevel değerlerini kapsıyor mu diye ayrıca aşağıda ayrıca doğrulanıyor.
  const expected = {
    2: "2'de", 3: "3'te", 4: "4'te", 5: "5'te", 6: "6'da", 7: "7'de", 8: "8'de",
    9: "9'da", 10: "10'da", 12: "12'de", 14: "14'te", 16: "16'da", 20: "20'de"
  };

  for (const [n, want] of Object.entries(expected)) {
    it(`${n} → "${want}"`, () => {
      assert.equal(turkishLocative(Number(n)), want);
    });
  }

  it("mode-catalog.js'teki TÜM unlockLevel değerlerini kapsar (hata fırlatmadan üretir)", () => {
    const levels = [...new Set(MODE_CATALOG.map(e => e.unlockLevel))];
    assert.ok(levels.length > 0);
    for (const level of levels) {
      assert.doesNotThrow(() => turkishLocative(level), `unlockLevel ${level} için ek üretilemedi`);
    }
  });

  it("tablo dışı bir sayı için SESSİZCE yanlış ek üretmez, hata fırlatır", () => {
    assert.throws(() => turkishLocative(137));
    assert.throws(() => turkishLocative(0));
    assert.throws(() => turkishLocative(-1));
  });
});

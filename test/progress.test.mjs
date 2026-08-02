// progress.js saf fonksiyon testleri — Z3 (mod başına seviye + akademi seviyesi) odaklı.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { levelFromXp, modeXp, modeLevel, academyLevel } from "../www/js/core/progress.js";

function statsWithPerMode(perMode) {
  return { perMode };
}

describe("modeXp() / modeLevel()", () => {
  it("perMode'da olmayan bir mod için 0 XP / seviye 1 döner", () => {
    const stats = statsWithPerMode({});
    assert.equal(modeXp(stats, "yok-boyle-bir-mod"), 0);
    assert.equal(modeLevel(stats, "yok-boyle-bir-mod"), 1);
  });

  it("perMode hiç yoksa (undefined) çökmez, 0/1 döner", () => {
    const stats = {};
    assert.equal(modeXp(stats, "frekans-bulma"), 0);
    assert.equal(modeLevel(stats, "frekans-bulma"), 1);
  });

  it("gerçek XP'den doğru seviyeyi hesaplar (levelFromXp ile TUTARLI)", () => {
    const stats = statsWithPerMode({ "frekans-bulma": { xp: 500 } });
    assert.equal(modeXp(stats, "frekans-bulma"), 500);
    assert.equal(modeLevel(stats, "frekans-bulma"), levelFromXp(500));
  });

  it("iki farklı mod BİRBİRİNDEN BAĞIMSIZ XP tutar (perDiff'in aksine karışmaz)", () => {
    const stats = statsWithPerMode({
      "frekans-bulma": { xp: 1000 },
      "kesim-noktasi": { xp: 50 }
    });
    assert.equal(modeXp(stats, "frekans-bulma"), 1000);
    assert.equal(modeXp(stats, "kesim-noktasi"), 50);
    assert.notEqual(modeLevel(stats, "frekans-bulma"), modeLevel(stats, "kesim-noktasi"));
  });
});

describe("academyLevel()", () => {
  it("tek mod varken academyLevel === o modun kendi seviyesi (geriye dönük tutarlı)", () => {
    const stats = statsWithPerMode({ "frekans-bulma": { xp: 730 } });
    assert.equal(academyLevel(stats, ["frekans-bulma"]), modeLevel(stats, "frekans-bulma"));
  });

  it("birden fazla mod: TOPLAM, her modun kendi seviyesinin toplamı", () => {
    const stats = statsWithPerMode({
      "frekans-bulma": { xp: 500 }, // levelFromXp(500) hesapla
      "kesim-noktasi": { xp: 0 }
    });
    const expected = modeLevel(stats, "frekans-bulma") + modeLevel(stats, "kesim-noktasi");
    assert.equal(academyLevel(stats, ["frekans-bulma", "kesim-noktasi"]), expected);
  });

  it("hiç oynanmamış (xp=0) bir mod bile levelFromXp(0)=1 katkı yapar (KARAR — bkz. progress.js yorumu)", () => {
    const stats = statsWithPerMode({});
    assert.equal(academyLevel(stats, ["hic-oynanmamis"]), 1);
  });

  it("boş modIds listesi için 0 döner, çökmez", () => {
    const stats = statsWithPerMode({});
    assert.equal(academyLevel(stats, []), 0);
    assert.equal(academyLevel(stats, undefined), 0);
  });

  it("örnek veri: frekans-bulma xp=850 → örnek raporlama (SON RAPOR'a taşınacak)", () => {
    const stats = statsWithPerMode({ "frekans-bulma": { xp: 850 } });
    const lvl = modeLevel(stats, "frekans-bulma");
    const academy = academyLevel(stats, ["frekans-bulma"]);
    assert.equal(lvl, academy);
    assert.ok(lvl >= 1);
  });
});

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

// G47: Sınav sistemi entegrasyonu — "paralel sistem kurma" YASAĞINA uyularak
// modeLevel()'a eklenen TEK guard'lı dal. bkz. core/exam-system.js.
describe("modeLevel() — G47 sınav sistemi examState guard'ı", () => {
  it("stats.examState HİÇ yoksa (sınav desteklemeyen yedi mod) davranış BİREBİR eskisi gibi — SAF XP'den hesaplanır", () => {
    const stats = { perMode: { "frekans-bulma": { xp: 5000 } } };
    assert.equal(modeLevel(stats, "frekans-bulma"), levelFromXp(5000));
  });

  it("stats.examState VAR ama BU MOD için YOK — yine SAF XP'den hesaplanır (sınav sistemi bu moda HİÇ dokunmamış demektir)", () => {
    const stats = {
      perMode: { "frekans-bulma": { xp: 5000 } },
      examState: { kompresor: { examLevel: 1, tierStats: {} } }
    };
    assert.equal(modeLevel(stats, "frekans-bulma"), levelFromXp(5000));
  });

  it("examLevel HAM (XP'den hesaplanan) seviyenin ALTINDAYSA — GÖSTERİLEN seviye examLevel'e SINIRLANIR (sınav henüz geçilmedi)", () => {
    const rawLevel = levelFromXp(5000);
    const stats = {
      perMode: { kompresor: { xp: 5000 } },
      examState: { kompresor: { examLevel: 1, tierStats: {} } }
    };
    assert.ok(rawLevel > 1, "test önkoşulu: 5000 XP seviye 1'den yüksek olmalı");
    assert.equal(modeLevel(stats, "kompresor"), 1, "examLevel=1 iken GÖSTERİLEN seviye 1'i AŞMAMALI");
  });

  it("examLevel HAM seviyenin ÜSTÜNDE OLAMAZ — Math.min ile XP'nin gerçekten hak ettiğinin ÖTESİNE asla geçilmez", () => {
    const stats = {
      perMode: { kompresor: { xp: 0 } }, // rawLevel = levelFromXp(0) = 1
      examState: { kompresor: { examLevel: 99, tierStats: {} } } // sınav sistemi bir şekilde 99'a çıkmış olsun
    };
    assert.equal(modeLevel(stats, "kompresor"), 1, "examLevel XP'nin hak ettiğinden FAZLA seviye VEREMEZ");
  });

  it("examLevel === rawLevel iken (sınav az önce geçildi, tam senkron) GÖSTERİLEN seviye ikisiyle de eşleşir", () => {
    const rawLevel = levelFromXp(1200);
    const stats = {
      perMode: { kompresor: { xp: 1200 } },
      examState: { kompresor: { examLevel: rawLevel, tierStats: {} } }
    };
    assert.equal(modeLevel(stats, "kompresor"), rawLevel);
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

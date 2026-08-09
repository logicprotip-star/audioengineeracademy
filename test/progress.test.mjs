// progress.js saf fonksiyon testleri — Z3 (mod başına seviye + akademi seviyesi) odaklı.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { levelFromXp, modeXp, modeLevel, academyLevel, LEVEL_TITLES, levelTitle } from "../www/js/core/progress.js";

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

// G74 — ana ekran kullanıcı kartının "seviye unvanı" (ör. "Kalibre Kulak").
// LEVEL_TITLES/levelTitle() bu turda YENİ eklendi (kodda daha önce hiç
// yoktu, bkz. DURUM.md G74 raporu) — TASLAK değerler, kesin/nihai DEĞİL.
describe("LEVEL_TITLES / levelTitle() — G74 (YENİ, taslak)", () => {
  it("eşikler KESİN OLARAK ARTAN sırada (her min bir öncekinden büyük)", () => {
    for (let i = 1; i < LEVEL_TITLES.length; i++) {
      assert.ok(LEVEL_TITLES[i].min > LEVEL_TITLES[i - 1].min, `${LEVEL_TITLES[i].title} eşiği bir öncekinden büyük değil`);
    }
  });

  it("ilk kademe min:0 — academyLevel HİÇBİR ZAMAN undefined bırakmaz", () => {
    assert.equal(LEVEL_TITLES[0].min, 0);
  });

  it("hiç oynanmamış bir kullanıcının gerçek academyLevel tabanı (10 oynanabilir mod × seviye 1 = 10) İLK kademeye düşer", () => {
    const tenModeIds = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const stats = statsWithPerMode({});
    const freshAcademyLevel = academyLevel(stats, tenModeIds);
    assert.equal(freshAcademyLevel, 10);
    assert.equal(levelTitle(freshAcademyLevel), LEVEL_TITLES[0].title);
  });

  it("tasarımın kendi örnek toplamı (4+3+3+2+2+2+1+1+1+2=21) 'Kalibre Kulak' unvanına denk gelir", () => {
    assert.equal(levelTitle(21), "Kalibre Kulak");
  });

  it("eşiğin TAM ÜZERİNDEKİ değer bir sonraki kademeye geçer, bir ALTINDAKİ geçmez", () => {
    const secondTier = LEVEL_TITLES[1];
    assert.equal(levelTitle(secondTier.min), secondTier.title);
    assert.equal(levelTitle(secondTier.min - 1), LEVEL_TITLES[0].title);
  });

  it("en yüksek kademenin ÇOK ÜSTÜNDEKİ bir seviye hâlâ SON kademeyi döner (asla undefined/hata YOK)", () => {
    const lastTier = LEVEL_TITLES[LEVEL_TITLES.length - 1];
    assert.equal(levelTitle(lastTier.min + 1000), lastTier.title);
  });

  it("0/undefined/negatif girişte çökmez, İLK kademeye düşer", () => {
    assert.equal(levelTitle(0), LEVEL_TITLES[0].title);
    assert.equal(levelTitle(undefined), LEVEL_TITLES[0].title);
    assert.equal(levelTitle(-5), LEVEL_TITLES[0].title);
  });
});

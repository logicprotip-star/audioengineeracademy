// progress.js saf fonksiyon testleri — Z3 (mod başına seviye + akademi seviyesi) odaklı.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { levelFromXp, modeXp, modeLevel, academyLevel, academyXpNeeded, academyXpProgress, academyTotalXp, xpNeeded, LEVEL_TITLES, levelTitle } from "../www/js/core/progress.js";

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

// G75: academyLevel ARTIK mod seviyelerinin TOPLAMI DEĞİL — TÜM modların TOPLAM
// XP'sinden, KENDİ (mod eğrisinden daha yavaş) academyXpNeeded eğrisiyle hesaplanır
// (bkz. progress.js:academyLevel notu, DURUM.md G75 raporu).
describe("academyTotalXp()", () => {
  it("modIds'deki tüm modların XP'sini toplar", () => {
    const stats = statsWithPerMode({ "frekans-bulma": { xp: 500 }, "kesim-noktasi": { xp: 50 } });
    assert.equal(academyTotalXp(stats, ["frekans-bulma", "kesim-noktasi"]), 550);
  });

  it("boş/undefined modIds için 0 döner, çökmez", () => {
    const stats = statsWithPerMode({});
    assert.equal(academyTotalXp(stats, []), 0);
    assert.equal(academyTotalXp(stats, undefined), 0);
  });
});

describe("academyXpNeeded() — mod eğrisinden (xpNeeded) DAHA YAVAŞ olmalı", () => {
  it("her seviye için academyXpNeeded, xpNeeded'den KESİN OLARAK BÜYÜK", () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      assert.ok(academyXpNeeded(lvl) > xpNeeded(lvl), `seviye ${lvl}: akademi eğrisi mod eğrisinden yavaş DEĞİL`);
    }
  });
});

describe("academyLevel() / academyXpProgress()", () => {
  it("taze kullanıcı (0 toplam XP, N mod) academyLevel=1 — eski 'taban=mod sayısı' hatası DÜZELTİLDİ", () => {
    const stats = statsWithPerMode({});
    const tenModeIds = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    assert.equal(academyLevel(stats, tenModeIds), 1);
  });

  it("boş modIds listesi için de 1 döner (0 toplam XP → levelFromXp tabanı), çökmez", () => {
    const stats = statsWithPerMode({});
    assert.equal(academyLevel(stats, []), 1);
    assert.equal(academyLevel(stats, undefined), 1);
  });

  it("academyLevel === academyXpProgress(academyTotalXp(...)).level (tutarlı)", () => {
    const stats = statsWithPerMode({ "frekans-bulma": { xp: 5000 }, kompresor: { xp: 2000 } });
    const modeIds = ["frekans-bulma", "kompresor"];
    assert.equal(academyLevel(stats, modeIds), academyXpProgress(academyTotalXp(stats, modeIds)).level);
  });

  it("toplam XP arttıkça academyLevel AZALMAZ (monoton artan)", () => {
    const low = statsWithPerMode({ "frekans-bulma": { xp: 100 } });
    const high = statsWithPerMode({ "frekans-bulma": { xp: 100000 } });
    assert.ok(academyLevel(high, ["frekans-bulma"]) > academyLevel(low, ["frekans-bulma"]));
  });
});

// G74 — ana ekran kullanıcı kartının "seviye unvanı" (ör. "Kalibre Kulak").
// LEVEL_TITLES/levelTitle() bu turda YENİ eklendi (kodda daha önce hiç
// yoktu, bkz. DURUM.md G74 raporu) — TASLAK değerler, kesin/nihai DEĞİL.
// G75: eşikler academyLevel'ın YENİ (1-tabanlı, yavaş) ölçeğine göre YENİDEN
// KALİBRE EDİLDİ (bkz. progress.js:LEVEL_TITLES notu) — testler buna göre güncellendi.
describe("LEVEL_TITLES / levelTitle() — G74/G75 (taslak)", () => {
  it("eşikler KESİN OLARAK ARTAN sırada (her min bir öncekinden büyük)", () => {
    for (let i = 1; i < LEVEL_TITLES.length; i++) {
      assert.ok(LEVEL_TITLES[i].min > LEVEL_TITLES[i - 1].min, `${LEVEL_TITLES[i].title} eşiği bir öncekinden büyük değil`);
    }
  });

  it("ilk kademe min:1 — academyLevel HİÇBİR ZAMAN 1'in altına düşmez (levelFromXp tabanı)", () => {
    assert.equal(LEVEL_TITLES[0].min, 1);
  });

  it("taze kullanıcı (0 toplam XP, kaç mod olursa olsun) academyLevel=1 → İLK kademeye düşer", () => {
    const tenModeIds = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const stats = statsWithPerMode({});
    const freshAcademyLevel = academyLevel(stats, tenModeIds);
    assert.equal(freshAcademyLevel, 1);
    assert.equal(levelTitle(freshAcademyLevel), LEVEL_TITLES[0].title);
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

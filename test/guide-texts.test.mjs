// "i" bilgi/rehber sistemi (G67). guide-texts.js'in dosya başı iddiasını
// doğrular: 10 oynanabilir modun HEPSİ hem MODE_GUIDE_TEXTS hem
// ROUND_HINT_STEPS'te var, GENERAL_GUIDE 5 bölümü taşıyor, ve
// shouldShowRoundHint/formatRoundHint saf fonksiyonları doğru davranıyor.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GENERAL_GUIDE,
  MODE_GUIDE_TEXTS,
  ROUND_HINT_STEPS,
  HINT_ROUNDS_LIMIT,
  shouldShowRoundHint,
  formatRoundHint
} from "../www/js/core/guide-texts.js";
import { MODE_CATALOG } from "../www/js/core/mode-catalog.js";

// mode-catalog.js'in playable:true olan 10 girdisi — guide-texts.js bunları
// mode-id anahtarı olarak birebir kullanmalı (level-sheet-terms.js ile AYNI
// ölçüt, terminology.test.mjs'nin de zaten güvendiği katalog).
const PLAYABLE_MODE_IDS = MODE_CATALOG.filter(e => e.playable).map(e => e.id);

describe("guide-texts: MODE_GUIDE_TEXTS 10 oynanabilir modun HEPSİNİ içerir", () => {
  it("anahtar kümesi playable mod id'leriyle BİREBİR eşleşir (fazla/eksik yok)", () => {
    assert.deepEqual(Object.keys(MODE_GUIDE_TEXTS).sort(), [...PLAYABLE_MODE_IDS].sort());
  });

  PLAYABLE_MODE_IDS.forEach(id => {
    it(`${id}: metin boş DEĞİL bir string`, () => {
      assert.equal(typeof MODE_GUIDE_TEXTS[id], "string");
      assert.ok(MODE_GUIDE_TEXTS[id].length > 20, `${id} metni çok kısa/boş görünüyor`);
    });
  });
});

describe("guide-texts: ROUND_HINT_STEPS 10 oynanabilir modun HEPSİNİ içerir", () => {
  it("anahtar kümesi playable mod id'leriyle BİREBİR eşleşir (fazla/eksik yok)", () => {
    assert.deepEqual(Object.keys(ROUND_HINT_STEPS).sort(), [...PLAYABLE_MODE_IDS].sort());
  });

  PLAYABLE_MODE_IDS.forEach(id => {
    it(`${id}: en az 2 adımlık bir dizi`, () => {
      assert.ok(Array.isArray(ROUND_HINT_STEPS[id]));
      assert.ok(ROUND_HINT_STEPS[id].length >= 2, `${id} ipucu dizisi çok kısa`);
      ROUND_HINT_STEPS[id].forEach(step => assert.equal(typeof step, "string"));
    });
  });
});

describe("guide-texts: GENERAL_GUIDE ana ekranın genel sistem bilgisini taşır", () => {
  it("title tanımlı", () => {
    assert.equal(typeof GENERAL_GUIDE.title, "string");
    assert.ok(GENERAL_GUIDE.title.length > 0);
  });

  it("tam olarak 5 bölüm içerir (Nasıl çalışır / Seviye ve zorluk / Sınav ve bölüm geçme / Ücretsiz ve Pro / Can)", () => {
    assert.equal(GENERAL_GUIDE.sections.length, 5);
    GENERAL_GUIDE.sections.forEach(s => {
      assert.equal(typeof s.heading, "string");
      assert.equal(typeof s.body, "string");
      assert.ok(s.heading.length > 0);
      assert.ok(s.body.length > 0);
    });
  });
});

describe("guide-texts: shouldShowRoundHint — ilk HINT_ROUNDS_LIMIT round'da true", () => {
  it("HINT_ROUNDS_LIMIT tam olarak 2 (task'ın kendi sayısı: 'ilk 2 kez')", () => {
    assert.equal(HINT_ROUNDS_LIMIT, 2);
  });

  it("hintRoundsShown 0 → true (henüz hiç gösterilmedi)", () => {
    assert.equal(shouldShowRoundHint(0), true);
  });

  it("hintRoundsShown 1 → true (ikinci round hâlâ hakkı var)", () => {
    assert.equal(shouldShowRoundHint(1), true);
  });

  it("hintRoundsShown 2 → false (limit doldu, otomatik açılmaz)", () => {
    assert.equal(shouldShowRoundHint(2), false);
  });

  it("hintRoundsShown 5 → false (limit çoktan aşıldı)", () => {
    assert.equal(shouldShowRoundHint(5), false);
  });

  it("undefined/eksik değer → true (freshModeState/migration ile 0'a denk gelir)", () => {
    assert.equal(shouldShowRoundHint(undefined), true);
  });
});

describe("guide-texts: formatRoundHint — modun adımlarını TEK okunabilir satıra birleştirir", () => {
  it("frekans-bulma için ' → ' ile ayrılmış bir satır döner", () => {
    const line = formatRoundHint("frekans-bulma");
    assert.equal(typeof line, "string");
    assert.match(line, / → /);
  });

  PLAYABLE_MODE_IDS.forEach(id => {
    it(`${id}: formatRoundHint null DEĞİL bir satır döner`, () => {
      assert.notEqual(formatRoundHint(id), null);
    });
  });

  it("kayıtlı olmayan bir modId için null döner (bant hiç gösterilmez)", () => {
    assert.equal(formatRoundHint("olmayan-mod-id"), null);
  });
});

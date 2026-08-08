// "i" bilgi/rehber sistemi (G67) + SPOTLIGHT rehber turu (G68). guide-texts.js'in
// dosya başı iddiasını doğrular: 10 oynanabilir modun HEPSİ hem MODE_GUIDE_TEXTS
// hem SPOTLIGHT_STEPS'te var, GENERAL_GUIDE 5 bölümü taşıyor, ve
// shouldShowRoundHint/spotlightStepsFor saf fonksiyonları doğru davranıyor.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GENERAL_GUIDE,
  MODE_GUIDE_TEXTS,
  SPOTLIGHT_STEPS,
  HINT_ROUNDS_LIMIT,
  shouldShowRoundHint,
  spotlightStepsFor
} from "../www/js/core/guide-texts.js";
import { MODE_CATALOG } from "../www/js/core/mode-catalog.js";

// mode-catalog.js'in playable:true olan 10 girdisi — guide-texts.js bunları
// mode-id anahtarı olarak birebir kullanmalı (level-sheet-terms.js ile AYNI
// ölçüt, terminology.test.mjs'nin de zaten güvendiği katalog).
const PLAYABLE_MODE_IDS = MODE_CATALOG.filter(e => e.playable).map(e => e.id);

// Frekans Çakışması BİLİNÇLİ olarak sadece 2 adımlı (dinle+seç) — mod zaten
// çok-aşamalı, kendi soru başlığı/talimatı aşamaları ZATEN anlatıyor (bkz.
// guide-texts.js:SPOTLIGHT_STEPS dosya başı notu). Diğer 9 mod 3 adımlı
// (dinle → seç → onayla).
const TWO_STEP_MODES = new Set(["frekans-cakismasi"]);
const VALID_TARGETS = new Set(["listen", "select", "confirm"]);

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

describe("guide-texts: SPOTLIGHT_STEPS 10 oynanabilir modun HEPSİNİ içerir", () => {
  it("anahtar kümesi playable mod id'leriyle BİREBİR eşleşir (fazla/eksik yok)", () => {
    assert.deepEqual(Object.keys(SPOTLIGHT_STEPS).sort(), [...PLAYABLE_MODE_IDS].sort());
  });

  PLAYABLE_MODE_IDS.forEach(id => {
    const expectedLen = TWO_STEP_MODES.has(id) ? 2 : 3;
    it(`${id}: tam olarak ${expectedLen} adımlık bir dizi, her adım geçerli target+text taşır`, () => {
      const steps = SPOTLIGHT_STEPS[id];
      assert.ok(Array.isArray(steps));
      assert.equal(steps.length, expectedLen, `${id} adım sayısı beklenenden farklı`);
      steps.forEach(step => {
        assert.ok(VALID_TARGETS.has(step.target), `${id}: bilinmeyen target "${step.target}"`);
        assert.equal(typeof step.text, "string");
        assert.ok(step.text.length > 0);
      });
    });
  });

  it("3 adımlı modların HEPSİ 'listen' ile başlar, 'confirm' ile biter (dinle → seç → onayla akışı)", () => {
    PLAYABLE_MODE_IDS.filter(id => !TWO_STEP_MODES.has(id)).forEach(id => {
      const steps = SPOTLIGHT_STEPS[id];
      assert.equal(steps[0].target, "listen", `${id} ilk adım "listen" değil`);
      assert.equal(steps[steps.length - 1].target, "confirm", `${id} son adım "confirm" değil`);
    });
  });

  it("Frekans Çakışması SADECE dinle+seç (2 adım) — mod zaten çok-aşamalı, ayrı 'confirm' İCAT edilmedi", () => {
    const steps = SPOTLIGHT_STEPS["frekans-cakismasi"];
    assert.deepEqual(steps.map(s => s.target), ["listen", "select"]);
  });

  it("Tonal Denge'de 'select' kaydırıcıları, 'confirm' ayrı bir onay adımını anlatır (metinler farklı)", () => {
    const steps = SPOTLIGHT_STEPS["tonal-denge"];
    assert.match(steps.find(s => s.target === "select").text, /kaydırıcı/i);
    assert.match(steps.find(s => s.target === "confirm").text, /onayla/i);
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

describe("guide-texts: spotlightStepsFor — modun adım dizisini döndürür", () => {
  PLAYABLE_MODE_IDS.forEach(id => {
    it(`${id}: spotlightStepsFor null DEĞİL, SPOTLIGHT_STEPS[id] ile AYNI diziyi döner`, () => {
      assert.deepEqual(spotlightStepsFor(id), SPOTLIGHT_STEPS[id]);
    });
  });

  it("kayıtlı olmayan bir modId için null döner (tur hiç başlatılmaz)", () => {
    assert.equal(spotlightStepsFor("olmayan-mod-id"), null);
  });
});

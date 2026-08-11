// mode-visuals.js saf fonksiyon testleri (G74) — ana ekran mod kartlarının
// SVG görselleri, Tasarim-2026-08/Ana Ekran.dc.html'den taşındı. Burada
// SADECE "her gerçek mod için bir görsel üretiliyor mu, çökmüyor mu, benzersiz
// gradyan id taşıyor mu" doğrulanıyor — piksel-seviyesi/görsel doğrulama bu
// ortamdan YAPILAMAZ (CLAUDE.md: "DOM davranışı kaynak koddan doğrulanamaz").

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { modeVisualSvg, MODE_VIZ_KIND } from "../www/js/core/mode-visuals.js";
import { MODE_CATALOG } from "../www/js/core/mode-catalog.js";

const PLAYABLE_MODE_IDS = MODE_CATALOG.filter(e => e.playable).map(e => e.id);

describe("mode-visuals: MODE_VIZ_KIND oynanabilir modların HEPSİNİ içerir", () => {
  it("anahtar kümesi playable mod id'leriyle BİREBİR eşleşir (fazla/eksik yok)", () => {
    assert.deepEqual(Object.keys(MODE_VIZ_KIND).sort(), [...PLAYABLE_MODE_IDS].sort());
  });
});

describe("mode-visuals: modeVisualSvg() oynanabilir modların HEPSİ için geçerli SVG üretir", () => {
  PLAYABLE_MODE_IDS.forEach(id => {
    it(`${id}: null DEĞİL, <svg ile başlayan bir string döner, çökmez`, () => {
      const svg = modeVisualSvg(id);
      assert.equal(typeof svg, "string");
      assert.match(svg, /^<svg /);
      assert.match(svg, /<\/svg>$/);
    });

    it(`${id}: kendi benzersiz gradyan id'sini <defs> içinde taşır (10 kart AYNI anda DOM'dayken çakışmasın diye)`, () => {
      const svg = modeVisualSvg(id);
      // NOT: gradyan TANIMI her modda var ama sadece bazı gövdeler (bell/q/tonal —
      // eğri altını dolduran modlar) onu GERÇEKTEN url(#...) ile kullanıyor; diğerleri
      // (bar/nokta tabanlı gövdeler) tanımlı ama KULLANILMAYAN bir <defs> taşır —
      // zararsız, sadece burada url() varlığını ZORUNLU KILMIYORUZ.
      assert.match(svg, new RegExp(`id="modeviz-grad-${id}"`));
    });
  });

  it("kayıtlı olmayan bir modId için null döner (uydurma bir görsel ÜRETİLMEZ)", () => {
    assert.equal(modeVisualSvg("olmayan-mod-id"), null);
  });
});

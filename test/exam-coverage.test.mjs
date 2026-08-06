// G50 — SINAV SİSTEMİNİN 7 moda yayılması (Kompresör pilottu). Bu dosya SADECE
// her modun mode-agnostik EXAM_* bayraklarını (EXAM_ENABLED/EXAM_DIFFICULTY/
// EXAM_WEAK_AREA) doğru export ettiğini kontrol eder — app.js'in kablolaması
// (parkur/kombo/sınav/telafi akışı, "BÖLÜM GEÇTİN" kutlaması, seviye atlama)
// DOM/ses'e bağlı olduğu için burada test EDİLEMEZ (CLAUDE.md: "Ses ve DOM
// davranışı kaynak koddan doğrulanamaz") — canlı tarayıcıda ayrıca doğrulandı
// (bkz. DURUM.md G50 BİTTİ). Amaç: 8 modun HİÇBİRİNİN sessizce bu bayrakları
// kaybetmemesi/yanlış değere düşmemesi — regresyon çiti.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as frekansBulma from "../www/js/modes/frekans-bulma.js";
import * as kesimNoktasi from "../www/js/modes/kesim-noktasi.js";
import * as dbSeviyesi from "../www/js/modes/db-seviyesi.js";
import * as boostMuCutMu from "../www/js/modes/boost-mu-cut-mu.js";
import * as qGenisligi from "../www/js/modes/q-genisligi.js";
import * as kompresor from "../www/js/modes/kompresor.js";
import * as reverb from "../www/js/modes/reverb.js";
import * as tonalDenge from "../www/js/modes/tonal-denge.js";

// ZONE_MODES: recordZone'un GERÇEK veri ürettiği/frekansın kullanıcıya
// açıklandığı dört mod (task: "Frekans Bulma, Kesim, Boost/Cut, Q") — telafi
// zayıf FREKANS BÖLGESİ üzerinden kurulmalı (EXAM_WEAK_AREA="zone").
const ZONE_MODES = [
  ["frekans-bulma", frekansBulma],
  ["kesim-noktasi", kesimNoktasi],
  ["boost-mu-cut-mu", boostMuCutMu],
  ["q-genisligi", qGenisligi]
];

// TIER_MODES: "bölge" kavramı olmayan dört mod (task: "dB/Reverb/Tonal Denge"
// + Kompresör'ün ZATEN kurulu pilotu) — telafi zayıf ZORLUK KADEMESİ üzerinden
// (G47'den beri değişmeyen mekanizma).
const TIER_MODES = [
  ["db-seviyesi", dbSeviyesi],
  ["kompresor", kompresor],
  ["reverb", reverb],
  ["tonal-denge", tonalDenge]
];

describe("G50 — 8 modun TAMAMINDA EXAM_ENABLED açık (sınav sistemi 7 moda yayıldı)", () => {
  [...ZONE_MODES, ...TIER_MODES].forEach(([id, mod]) => {
    it(`${id}: EXAM_ENABLED=true, EXAM_DIFFICULTY='pro' (o modun pro kademesi)`, () => {
      assert.equal(mod.MODE_ID, id);
      assert.equal(mod.EXAM_ENABLED, true, `${id} EXAM_ENABLED açık değil`);
      assert.equal(mod.EXAM_DIFFICULTY, "pro", `${id} EXAM_DIFFICULTY 'pro' değil`);
      // Sınav DIFFICULTY[EXAM_DIFFICULTY]'nin GERÇEKTEN var olduğunu da doğrula
      // (yazım hatasıyla var olmayan bir tier'a işaret etmesin — createQuestion
      // sessizce DIFFICULTY.medium'a düşerdi, "pro" zorluğu YERİNE "orta" gelirdi).
      assert.ok(mod.DIFFICULTY && mod.DIFFICULTY[mod.EXAM_DIFFICULTY], `${id} DIFFICULTY[EXAM_DIFFICULTY] tanımsız`);
    });
  });
});

describe("G50 — EXAM_WEAK_AREA moda göre doğru dallanıyor (getWeakArea dispatcher'ının okuduğu bayrak)", () => {
  ZONE_MODES.forEach(([id, mod]) => {
    it(`${id}: EXAM_WEAK_AREA='zone' (frekans-tabanlı — telafi zayıf FREKANS bölgesi)`, () => {
      assert.equal(mod.EXAM_WEAK_AREA, "zone");
      // getWeakArea()'nın zone dalı mode.FA_ZONES okur — dört zon-tabanlı modun
      // TAMAMI frekans-bulma.js'in AYNI FA_ZONES'unu re-export ETMELİ (bkz. app.js
      // startRound() focusRange daraltması, [zone.a, zone.b] okur).
      assert.ok(Array.isArray(mod.FA_ZONES) && mod.FA_ZONES.length > 0, `${id} FA_ZONES export etmiyor`);
      mod.FA_ZONES.forEach(z => {
        assert.equal(typeof z.a, "number");
        assert.equal(typeof z.b, "number");
      });
    });
  });

  TIER_MODES.forEach(([id, mod]) => {
    it(`${id}: EXAM_WEAK_AREA export EDİLMEZ (undefined) — telafi zayıf ZORLUK KADEMESİ`, () => {
      assert.equal(mod.EXAM_WEAK_AREA, undefined);
    });
  });
});

// Tonal Denge'nin "kendi TrainYourEars mekaniğiyle sınava girmesi" (odd-one-out
// DEĞİL) — THREE_WAY export etMEmesi + examBandBoost'u OKUMASI ile doğrulanır
// (bandBoost testleri tonal-denge.test.mjs'te; burada SADECE mekanik ayrışması).
describe("G50 — Tonal Denge sınavı odd-one-out DEĞİL, kendi canlı-EQ mekaniğiyle", () => {
  it("THREE_WAY export ETMEZ (Kompresör/Reverb'in AYNI bayrağı burada YOK — G45'ten beri, G50 bunu BOZMADI)", () => {
    assert.equal(tonalDenge.THREE_WAY, undefined);
  });
  it("Kompresör/Reverb THREE_WAY=true (regresyon kontrolü — G50 bunlara dokunmadı)", () => {
    assert.equal(kompresor.THREE_WAY, true);
    assert.equal(reverb.THREE_WAY, true);
  });
});

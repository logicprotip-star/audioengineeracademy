// G292 (OLCUM-UC-18-08.md madde C) — task'ın kendi DOKUNULMAYACAK'ı: İKİLİ
// (K=2) eksenli modlara (Boost mu Cut mu'nun direction'ı, dB Seviyesi'nin
// yön ekseni, Frekans Çakışması Aşama 2'nin correctSource'u) tekrar önleme
// UYGULANMADI — sert kural geriye TEK bir zorunlu değer bırakır, kullanıcı
// sesi hiç dinlemeden %100 doğru cevaplayabilir hale gelir (ölçüm raporunun
// uyarısı). Bu dosya İKİ şeyi mekanik olarak doğruluyor: (1) dört hedef
// modun REPEAT_GUARD_N export ettiğini, (2) üç ikili modun bunu HİÇ export
// ETMEDİĞİNİ (DOKUNULMADIĞININ kanıtı) + davranışlarının GERÇEKTEN
// DEĞİŞMEDİĞİNİ (ardışık tekrar hâlâ istatistiksel olarak mümkün).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as kompresor from "../www/js/modes/kompresor.js";
import * as reverb from "../www/js/modes/reverb.js";
import * as distortion from "../www/js/modes/distortion.js";
import * as qGenisligi from "../www/js/modes/q-genisligi.js";
import * as boostCut from "../www/js/modes/boost-mu-cut-mu.js";
import * as dbSeviyesi from "../www/js/modes/db-seviyesi.js";
import * as cakisma from "../www/js/modes/frekans-cakismasi.js";

describe("G292 kapsam sınırı — dört hedef mod REPEAT_GUARD_N export ediyor", () => {
  for (const [name, mod] of [
    ["Kompresör", kompresor],
    ["Reverb", reverb],
    ["Saturation & Distortion", distortion],
    ["Q Genişliği", qGenisligi],
  ]) {
    it(`${name}: REPEAT_GUARD_N sayısal bir değer`, () => {
      assert.equal(typeof mod.REPEAT_GUARD_N, "number");
      assert.ok(mod.REPEAT_GUARD_N >= 1);
    });
  }
});

describe("G292 kapsam sınırı — İKİLİ (K=2) modlara DOKUNULMADI", () => {
  for (const [name, mod] of [
    ["Boost mu Cut mu", boostCut],
    ["dB Seviyesi", dbSeviyesi],
    ["Frekans Çakışması", cakisma],
  ]) {
    it(`${name}: REPEAT_GUARD_N export ETMİYOR (tekrar önleme uygulanmadı)`, () => {
      assert.equal(mod.REPEAT_GUARD_N, undefined);
    });
  }

  it("Boost mu Cut mu: direction ekseni HÂLÂ ardışık tekrar edebiliyor (davranış DEĞİŞMEDİ) — 200 turda en az bir ardışık tekrar bekleniyor (%50 şansla istatistiksel olarak neredeyse kesin)", () => {
    let prevDirection = null;
    let sawConsecutiveRepeat = false;
    for (let i = 0; i < 200; i++) {
      const q = boostCut.createQuestion("medium", { source: "pink", boss: false });
      if (prevDirection !== null && q.gainDb !== undefined && Math.sign(q.gainDb) === prevDirection) {
        sawConsecutiveRepeat = true;
        break;
      }
      prevDirection = q.gainDb !== undefined ? Math.sign(q.gainDb) : null;
    }
    assert.ok(sawConsecutiveRepeat, "200 turda HİÇ ardışık tekrar gözlenmedi — mekanizma yanlışlıkla bu moda da SIZMIŞ olabilir");
  });
});

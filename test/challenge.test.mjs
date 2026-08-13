// "10 Soruluk Bölüm" (challenge) — G174. SADECE saf varsayılan-şekil
// fonksiyonu (freshChallenge) test edilir: mod geçişinde app.js:enterMode()
// BU şekle sıfırlıyor mu (asıl regresyon — üstteki BÖLÜM göstergesinin
// önceki modun ilerlemesini göstermemesi) DOM'a bağımlı, bu ortamda (node
// --test, DOM yok) test edilemez, Playwright'ta ayrıca doğrulandı (bkz.
// DURUM.md).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshChallenge } from "../www/js/core/challenge.js";

describe("challenge: freshChallenge", () => {
  it("idle (henüz başlamamış) şekli döner — active:false, done:0", () => {
    assert.deepEqual(freshChallenge(), { active: false, total: 10, done: 0, correct: 0, xp: 0 });
  });

  it("her çağrıda YENİ bir obje döner — çağıranlar arasında paylaşılan/mutasyona açık referans YOK", () => {
    const a = freshChallenge();
    const b = freshChallenge();
    assert.notEqual(a, b);
    a.done = 7;
    assert.equal(b.done, 0);
  });

  it("startChallenge()'ın kendi deseniyle (spread + active:true) uyumlu — done/correct/xp SIFIRLANMIŞ kalır", () => {
    const started = { ...freshChallenge(), active: true };
    assert.equal(started.active, true);
    assert.equal(started.done, 0);
    assert.equal(started.correct, 0);
    assert.equal(started.xp, 0);
    assert.equal(started.total, 10);
  });
});

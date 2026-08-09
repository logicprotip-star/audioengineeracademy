// G58 — Motor 2 (Kompresör/Reverb) ortak A/B/C kart renklendirmesi. Kullanıcı
// raporu: "cevap sonrası A şıkkında renk (kırmızı=senin/yeşil=doğru)
// uygulanmıyor — B/C'de tutarlı ama A'da eksik." Canlı tarayıcı testinde
// (masaüstü, A doğruyken VE A yanlışken ayrı ayrı) markThreeWayCards'ın
// letter===correctLetter/pickedLetter mantığının regresyonsuz çalıştığı
// gözlemlendi — burada AYNI mantık, gerçek bir DOM olmadan (jsdom YOK bu
// projede, bkz. tonal-denge.test.mjs'in AYNI notu) elle kurulmuş bir sahte
// DOM'la KİLİTLENİYOR: markThreeWayCards HER harf için (A dahil, İLK sırada
// olduğu için özellikle) doğru/yanlış class'ını doğru atıyor mu.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { markThreeWayCards, renderThreeWayCards } from "../www/js/core/three-way-cards.js";

function fakeButton(letter) {
  const classes = new Set(["ans", "ans-m2"]);
  let disabled = false;
  const stateEl = { text: "Henüz dinlenmedi", set textContent(v) { this.text = v; }, get textContent() { return this.text; } };
  return {
    dataset: { letter },
    classList: {
      add: (...cs) => cs.forEach(c => classes.add(c)),
      remove: (...cs) => cs.forEach(c => classes.delete(c)),
      contains: c => classes.has(c)
    },
    get disabled() { return disabled; },
    set disabled(v) { disabled = v; },
    querySelector(sel) { return sel === ".ans-m2-state" ? stateEl : null; }
  };
}

function fakeAnswersEl(letters) {
  const buttons = letters.map(fakeButton);
  return {
    querySelectorAll(sel) { return sel === ".ans" ? buttons : []; },
    buttons
  };
}

function questionWithOdd(oddLetter) {
  const letters = ["A", "B", "C"];
  const oddIndex = letters.indexOf(oddLetter);
  return {
    variants: letters.map(letter => ({ letter })),
    oddIndex,
    choices: letters.map((id, i) => ({ id, tr: id, correct: i === oddIndex }))
  };
}

describe("markThreeWayCards() — A/B/C'nin HER BİRİ tutarlı renkleniyor mu (G58 regresyon çiti)", () => {
  it("A doğruyken (oddIndex=A), kullanıcı B seçerse: A 'right', B 'wrong', C hiçbiri", () => {
    const q = questionWithOdd("A");
    const el = fakeAnswersEl(["A", "B", "C"]);
    markThreeWayCards(el, q, "B");
    const [a, b, c] = el.buttons;
    assert.ok(a.classList.contains("right"), "A doğruyken A 'right' OLMALIYDI (kayıp enstrüman gibi bir 'A atlanıyor' hatası VAR MI kontrolü)");
    assert.ok(!a.classList.contains("wrong"));
    assert.ok(b.classList.contains("wrong"));
    assert.ok(!c.classList.contains("right") && !c.classList.contains("wrong"));
    // G86: dış kapsayıcı <button> yerine <div> oldu (İÇ play butonu GERÇEK
    // <button>, nested <button> HTML'de geçersiz olurdu) — "kilitlendi"
    // artık DOM .disabled property'si DEĞİL, .ans-m2-disabled class'ı (bkz.
    // app.js click delegasyonu, AYNI şekilde kontrol ediyor).
    assert.equal(a.classList.contains("ans-m2-disabled"), true);
    assert.equal(b.classList.contains("ans-m2-disabled"), true);
    assert.equal(c.classList.contains("ans-m2-disabled"), true);
  });

  it("A doğruyken, kullanıcı DA A'yı seçerse (doğru cevap): A SADECE 'right' alır, 'wrong' ALMAZ", () => {
    const q = questionWithOdd("A");
    const el = fakeAnswersEl(["A", "B", "C"]);
    markThreeWayCards(el, q, "A");
    const [a] = el.buttons;
    assert.ok(a.classList.contains("right"));
    assert.ok(!a.classList.contains("wrong"));
  });

  it("A YANLIŞKEN (kullanıcı A'yı seçti ama doğrusu B'ydi): A 'wrong', B 'right'", () => {
    const q = questionWithOdd("B");
    const el = fakeAnswersEl(["A", "B", "C"]);
    markThreeWayCards(el, q, "A");
    const [a, b, c] = el.buttons;
    assert.ok(a.classList.contains("wrong"), "A yanlış seçildiğinde A 'wrong' OLMALIYDI");
    assert.ok(!a.classList.contains("right"));
    assert.ok(b.classList.contains("right"));
    assert.ok(!c.classList.contains("right") && !c.classList.contains("wrong"));
  });

  it("picked bir obje ({id}) olarak gelirse de (app.js'in bazı çağrı yollarında olduğu gibi) AYNI şekilde çalışır", () => {
    const q = questionWithOdd("C");
    const el = fakeAnswersEl(["A", "B", "C"]);
    markThreeWayCards(el, q, { id: "A" });
    const [a, , c] = el.buttons;
    assert.ok(a.classList.contains("wrong"));
    assert.ok(c.classList.contains("right"));
  });

  it("her üç harf de (A/B/C) 'doğru' rolünde sırayla test edilince TUTARLI davranır — hiçbiri sistematik olarak atlanmıyor", () => {
    for (const oddLetter of ["A", "B", "C"]) {
      const q = questionWithOdd(oddLetter);
      const wrongGuess = ["A", "B", "C"].find(l => l !== oddLetter);
      const el = fakeAnswersEl(["A", "B", "C"]);
      markThreeWayCards(el, q, wrongGuess);
      const correctBtn = el.buttons.find(b => b.dataset.letter === oddLetter);
      assert.ok(correctBtn.classList.contains("right"), `oddLetter=${oddLetter}: doğru şık 'right' almadı`);
    }
  });

  it("renderThreeWayCards çöküşsüz HTML üretir, her üç harf için data-letter içerir (regresyon)", () => {
    const q = questionWithOdd("A");
    let html = "";
    const el = { set innerHTML(v) { html = v; }, get innerHTML() { return html; }, className: "" };
    assert.doesNotThrow(() => renderThreeWayCards(el, q));
    for (const letter of ["A", "B", "C"]) {
      assert.match(html, new RegExp(`data-letter="${letter}"`));
    }
  });
});

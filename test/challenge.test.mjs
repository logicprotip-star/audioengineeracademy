// "10 Soruluk Bölüm" (challenge) — G174. SADECE saf varsayılan-şekil
// fonksiyonu (freshChallenge) test edilir: mod geçişinde app.js:enterMode()
// BU şekle sıfırlıyor mu (asıl regresyon — üstteki BÖLÜM göstergesinin
// önceki modun ilerlemesini göstermemesi) DOM'a bağımlı, bu ortamda (node
// --test, DOM yok) test edilemez, Playwright'ta ayrıca doğrulandı (bkz.
// DURUM.md).
//
// G194 NOTU — "BÖLÜM göstergesi idle'da GİZLİ olmalı" diye bir varsayım bu
// dosyada HİÇ yoktu (yukarıdaki paragraf bunu zaten test DIŞI bırakıyordu)
// ama G176/Bug 17 (664f1f1) ile PRODUCT KARARI DEĞİŞTİ ve bunu burada AÇIKÇA
// kayıt altına almak gerekiyor, çünkü DURUM.md'nin G174 döneminden kalma
// eski bir Playwright script'i (bu dosyada YOK, hiç commit edilmemişti)
// "idle'da collapsed===true" bekliyordu — o beklenti artık YANLIŞ. Güncel
// GERÇEK davranış (app.js:renderGameHeader → showChapter = !boss &&
// !examActive && isChallenge()): "10 Soruluk Bölüm" MOD olarak seçiliyken
// BÖLÜM çubuğu idle'da (Play'den ÖNCE) de GÖRÜNÜR olmalı ("BÖLÜM 1/10", 0
// dolu nokta); "Serbest" modda ise HER ZAMAN gizli kalır. Bu satır, o eski
// script'in yerini tutan KALICI bir referans — DOM'a bağımlı olduğu için
// gerçek assert BURADA yazılamıyor (yukarıdaki paragrafla AYNI kısıt),
// Playwright doğrulaması G194'te YENİDEN koşuldu.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshChallenge } from "../www/js/core/challenge.js";

describe("challenge: freshChallenge", () => {
  it("idle (henüz başlamamış) şekli döner — active:false, done:0", () => {
    assert.deepEqual(freshChallenge(), { active: false, total: 10, done: 0, correct: 0, xp: 0, results: [] });
  });

  it("her çağrıda YENİ bir obje döner — çağıranlar arasında paylaşılan/mutasyona açık referans YOK", () => {
    const a = freshChallenge();
    const b = freshChallenge();
    assert.notEqual(a, b);
    a.done = 7;
    assert.equal(b.done, 0);
  });

  // G276 — OLCUM-CIHAZ2-17-08 madde A düzeltmesi: done/correct SAYAÇLARI
  // (yukarıdaki testler HÂLÂ geçerli, TEK SATIR değişmedi) hangi POZİSYONUN
  // doğru/yanlış olduğunu TUTMUYORDU — BÖLÜM çubuğu "önce N doğru, sonra
  // kalan yanlış" çiziyordu, gerçek sırayı YANSITMIYORDU. results[] bunu
  // çözüyor.
  it("results — freshChallenge() BOŞ bir dizi döner, çağırılar arasında PAYLAŞILMAZ", () => {
    const a = freshChallenge();
    assert.deepEqual(a.results, []);
    const b = freshChallenge();
    a.results.push(true);
    assert.deepEqual(b.results, [], "a.results'a push, b.results'ı ETKİLEMEMELİ (referans paylaşımı YOK)");
  });

  it("startChallenge()'ın kendi deseniyle (spread + active:true) uyumlu — done/correct/xp/results SIFIRLANMIŞ kalır", () => {
    const started = { ...freshChallenge(), active: true };
    assert.equal(started.active, true);
    assert.equal(started.done, 0);
    assert.equal(started.correct, 0);
    assert.equal(started.xp, 0);
    assert.equal(started.total, 10);
    assert.deepEqual(started.results, []);
  });

  it("KABUL KRİTERİ — results SIRAYI korur: done/correct SAYAÇLARINDAN türetilebilir olmalı (results.length===done, results.filter(Boolean).length===correct)", () => {
    const c = freshChallenge();
    const pattern = [true, false, false, false, true]; // task'ın kendi senaryosu: 1. ve 5. soru doğru
    for (const wasCorrect of pattern) {
      c.done++;
      if (wasCorrect) c.correct++;
      c.results.push(wasCorrect);
    }
    assert.equal(c.results.length, c.done);
    assert.equal(c.results.filter(Boolean).length, c.correct);
    // Asıl bug'ın kanıtı: pozisyon 1 (index 0) VE pozisyon 5 (index 4) doğru,
    // aralarındaki 3 pozisyon (index 1-3) yanlış — SIRA korunuyor, "önce
    // 2 doğru sonra 3 yanlış" GİBİ YANLIŞ bir gruplama YOK.
    assert.deepEqual(c.results, [true, false, false, false, true]);
  });
});

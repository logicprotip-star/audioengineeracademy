// G292 (OLCUM-UC-18-08.md madde C) — pickAvoidingRecent()'in SAF sözleşmesi:
// "kalan küme" hesabı, retry/loop YOK, hiçbir girdi kombinasyonunda BOŞ
// dönmüyor (sonsuz döngü riski YAPISAL OLARAK yok).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickAvoidingRecent } from "../www/js/core/repeat-guard.js";

describe("repeat-guard: pickAvoidingRecent()", () => {
  it("geçmiş boşken TÜM adaylardan seçebilir", () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      seen.add(pickAvoidingRecent([0, 1, 2], [], () => i / 200));
    }
    assert.deepEqual([...seen].sort(), [0, 1, 2]);
  });

  it("K=3, N=1: son seçilen ASLA hemen tekrar gelmiyor", () => {
    let recent = [];
    for (let i = 0; i < 500; i++) {
      const rng = () => (i * 0.6180339887) % 1; // düşük-örüntülü ama deterministik
      const picked = pickAvoidingRecent([0, 1, 2], recent, rng);
      if (recent.length > 0) assert.notEqual(picked, recent[recent.length - 1], `tur ${i}: ${picked} az önceki ile AYNI`);
      recent = [picked]; // N=1
    }
  });

  it("N>=K (geçmiş TÜM adayları kapladı) — BOŞ dönmez, sadece son kimliği hariç tutar", () => {
    // K=3 ama recentValues 3 farklı değer taşıyor (N yanlışlıkla K'ya eşit/büyük ayarlanmış olsa bile) —
    // fonksiyon geriye "sadece son kimliği hariç tut"a düşüp YİNE DE bir değer döner.
    const result = pickAvoidingRecent([0, 1, 2], [0, 1, 2], () => 0);
    assert.ok([0, 1].includes(result), "son (2) hariç tutulup 0/1'den biri dönmeli");
  });

  it("K=1 uç durumu (12 modun hiçbirinde yok, ama fonksiyon savunmasız kalmamalı) — BOŞ dönmez", () => {
    const result = pickAvoidingRecent([7], [7], () => 0);
    assert.equal(result, 7, "tek aday varken geçmişte de olsa YİNE DE o adayı döner — retry YOK");
  });

  it("K=2, N=1: 'kalan küme' TEK bir zorunlu değer bırakır (bilerek K=2 modlarına UYGULANMIYOR — bkz. dosya başı uyarı, bu test SADECE mekanizmanın kendi davranışını belgeliyor)", () => {
    const picked = pickAvoidingRecent(["boost", "cut"], ["boost"], () => 0);
    assert.equal(picked, "cut", "K=2'de N=1 DETERMİNİSTİK sonuç üretir — bu yüzden ikili modlara UYGULANMADI");
  });

  it("boş aday listesi verilirse undefined döner (çağıran taraf HİÇBİR modda boş candidates geçirmiyor — savunma amaçlı)", () => {
    assert.equal(pickAvoidingRecent([], [], () => 0), undefined);
  });

  it("rng parametresiz çağrılabilir (varsayılan Math.random)", () => {
    const result = pickAvoidingRecent([0, 1, 2], []);
    assert.ok([0, 1, 2].includes(result));
  });
});

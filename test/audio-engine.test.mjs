// G273 — AÇIK İŞLER 27 düzeltmesi: resolveOscillatorType SAF fonksiyon,
// audioCtx bağımsız (audio-engine.js'in geri kalanı createAudioEngine()
// çağrılmadan browser API'sine dokunmuyor, bu yüzden Node'da doğrudan
// import edilebiliyor — CLAUDE.md'nin "ses/DOM davranışı kaynak koddan
// doğrulanamaz" kuralı burada GEÇERLİ DEĞİL, çünkü bu birim testi ses
// ÇALMIYOR, sadece bir string eşlemesini doğruluyor).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveOscillatorType } from "../www/js/core/audio-engine.js";

describe("resolveOscillatorType() — source-catalog id'sini GEÇERLİ bir Web Audio OscillatorType'a çevirir", () => {
  it("\"saw\" → \"sawtooth\" (asıl bug — Web Audio spec \"saw\"yı KABUL ETMİYOR)", () => {
    assert.equal(resolveOscillatorType("saw"), "sawtooth");
  });

  it("\"square\"/\"triangle\" ZATEN geçerli — DEĞİŞMEDEN geçer", () => {
    assert.equal(resolveOscillatorType("square"), "square");
    assert.equal(resolveOscillatorType("triangle"), "triangle");
  });

  it("bilinmeyen bir sourceType (harita dışı) DEĞİŞMEDEN geçer — güvenli varsayılan, sessizce boğulmaz", () => {
    assert.equal(resolveOscillatorType("sine"), "sine");
    assert.equal(resolveOscillatorType("unknown-id"), "unknown-id");
  });

  it("KABUL KRİTERİ — döndürdüğü DÖRT değer TAMAMI geçerli bir Web Audio OscillatorType (spec: sine/square/sawtooth/triangle/custom)", () => {
    const VALID_OSCILLATOR_TYPES = new Set(["sine", "square", "sawtooth", "triangle", "custom"]);
    for (const sourceId of ["saw", "square", "triangle"]) {
      const resolved = resolveOscillatorType(sourceId);
      assert.ok(VALID_OSCILLATOR_TYPES.has(resolved), `"${sourceId}" → "${resolved}" GEÇERSİZ bir OscillatorType`);
    }
  });
});

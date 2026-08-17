// G279 — Reverb'in otomatik A/B/C döngü aralığı diğer üç-yollu modlardan
// FARKLI olmalı (Logic'in kararı). Kök sebep: reverb.js'nin Hall tipi 3.2sn'ye
// kadar decay üretiyor, SABİT 2000ms'lik eski döngü bu kuyruğu HER ZAMAN
// kesiyordu (OLCUM-CIHAZ2-17-08 madde C). resolveAbLoopIntervalMs SAF
// fonksiyon — audioCtx/DOM bağımsız, doğrudan test edilebilir.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveAbLoopIntervalMs,
  AB_LOOP_INTERVAL_MS_REVERB,
  AB_LOOP_INTERVAL_MS_DEFAULT,
} from "../www/js/core/ab-loop-timing.js";

describe("ab-loop-timing: resolveAbLoopIntervalMs", () => {
  it("Reverb için 4500 ms döner (Hall decay'i 3.2sn'ye kadar çıkıyor — eski 2000 ms kuyruğu kesiyordu)", () => {
    assert.equal(resolveAbLoopIntervalMs("reverb"), 4500);
    assert.equal(resolveAbLoopIntervalMs("reverb"), AB_LOOP_INTERVAL_MS_REVERB);
  });

  it("Kompresör için 2000 ms döner (DOKUNULMAYACAK — kuyruk kavramı yok)", () => {
    assert.equal(resolveAbLoopIntervalMs("kompresor"), 2000);
    assert.equal(resolveAbLoopIntervalMs("kompresor"), AB_LOOP_INTERVAL_MS_DEFAULT);
  });

  it("Distortion (Saturation) için 2000 ms döner (DOKUNULMAYACAK — kuyruk kavramı yok)", () => {
    assert.equal(resolveAbLoopIntervalMs("distortion"), 2000);
    assert.equal(resolveAbLoopIntervalMs("distortion"), AB_LOOP_INTERVAL_MS_DEFAULT);
  });

  it("three-way olmayan / tanınmayan bir mod id'si için varsayılan (2000 ms) döner", () => {
    assert.equal(resolveAbLoopIntervalMs("boost-mu-cut-mu"), 2000);
    assert.equal(resolveAbLoopIntervalMs(undefined), 2000);
  });
});

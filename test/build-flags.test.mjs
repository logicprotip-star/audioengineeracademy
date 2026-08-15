// G239 (BEYAN-DENETIM-15-08 bulgusu 🔴) — DEV_MODE'un TEK doğruluk kaynağı
// (core/build-flags.js). Bu test bir "tripwire" — repo'ya yanlışlıkla
// DEV_MODE=false COMMIT EDİLİRSE npm test EN BAŞTA, e2e'ye bile gerek
// kalmadan kırmızı çıksın diye VAR. Task'ın kendi kararı: "belgeye
// yazılan 'unutma' notlarına güvenmeyelim, bugün belgeler beş kez
// yanıldı" — bu yüzden kod-seviyesi bir zorunluluk, yorum DEĞİL.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEV_MODE } from "../www/js/core/build-flags.js";
import { AD_TEST_MODE } from "../www/js/core/ads.js";

describe("build-flags — DEV_MODE repo'da HER ZAMAN true committed kalmalı", () => {
  it("DEV_MODE true — false görünüyorsa ya yanlışlıkla bir release-flip commit edilmiş (GERİ AL), ya da bilerek bir release build test ediliyor (bu durumda ZATEN kırmızı olması BEKLENEN — production'a bu haliyle GİDİLMEMELİ)", () => {
    assert.equal(
      DEV_MODE,
      true,
      "DEV_MODE false — core/build-flags.js'i kontrol et. Release Archive'ından HEMEN önce TEK satır flip edilip HEMEN true'ya geri alınmalı, repo'ya false COMMIT EDİLMEMELİ."
    );
  });

  it("AD_TEST_MODE, DEV_MODE'dan TÜRÜYOR — iki ayrı bayrak KALMADI", () => {
    assert.equal(AD_TEST_MODE, DEV_MODE, "AD_TEST_MODE artık build-flags.js:DEV_MODE'un AYNASI olmalı, bağımsız bir sabit DEĞİL");
  });
});

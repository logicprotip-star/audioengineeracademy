// G175: dB Seviyesi/Pan Konumu/Stereo Genişlik (mode.BARE_ANALYZER=true) — app.js
// enterMode()'daki "analyzer-bare-idle" CSS kısaltması, activeQuestion HENÜZ yokken
// (Play'den önce) canvas'a hiçbir şey çizilmediği VARSAYIMINA dayanıyor (bkz. o
// satırdaki not — chip/kontrol satırı arasındaki 272px'lik boşluğun kök sebebi
// buydu). Bu varsayım koddan doğrulanamayan bir DOM/canvas gerçeği DEĞİL, doğrudan
// her modun kendi drawOverlay()'inin SAF ilk satırı (`if (!activeQuestion) return`)
// — burada GERÇEK bir ctx2d yerine hiçbir property'ye dokunulursa fırlatan bir
// Proxy veriliyor: activeQuestion null'ken fonksiyon canvas'a HİÇ dokunmadan
// dönerse Proxy hiç tetiklenmez, fırlatmaz. Bu varsayım gelecekte bozulursa
// (ör. biri erken-dönüşü kaldırıp bir "boş durum" çizimi eklerse) bu test hemen
// kırılır — app.js'teki CSS kısaltması artık YANLIŞ içerik gizliyor demektir.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as dbSeviyesi from "../www/js/modes/db-seviyesi.js";
import * as panKonumu from "../www/js/modes/pan-konumu.js";
import * as stereoGenislik from "../www/js/modes/stereo-genislik.js";

const untouchableCtx = new Proxy({}, {
  get(_target, prop) {
    throw new Error(`ctx2d.${String(prop)} çağrıldı — activeQuestion=null iken hiçbir çizim YAPILMAMALI`);
  },
});

const BARE_ANALYZER_MODES = [
  ["dB Seviyesi", dbSeviyesi],
  ["Pan Konumu", panKonumu],
  ["Stereo Genişlik", stereoGenislik],
];

describe("BARE_ANALYZER modları — drawOverlay() activeQuestion=null iken canvas'a HİÇ dokunmaz", () => {
  for (const [label, mode] of BARE_ANALYZER_MODES) {
    it(`${label}: BARE_ANALYZER=true olarak işaretli`, () => {
      assert.equal(mode.BARE_ANALYZER, true);
    });

    it(`${label}: activeQuestion=null iken drawOverlay() ctx2d'ye dokunmadan döner`, () => {
      assert.doesNotThrow(() => {
        mode.drawOverlay(untouchableCtx, {}, 100, 100, { activeQuestion: null, roundActive: false });
      });
    });

    it(`${label}: activeQuestion DOLUYKEN drawOverlay() gerçekten çizim yapar (Proxy'nin kendisi yanlış-pozitif vermiyor)`, () => {
      assert.throws(() => {
        mode.drawOverlay(untouchableCtx, {}, 100, 100, {
          activeQuestion: { dbDelta: 3, panPercent: 20, widthPercent: 50 },
          roundActive: true,
        });
      });
    });
  }
});

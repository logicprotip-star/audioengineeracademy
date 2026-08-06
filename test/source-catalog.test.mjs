// Mod bazlı kaynak uyumluluğu — merkezi mekanizma testleri. compatibleSourceIds()
// SAF bir fonksiyon (source-catalog.js), her mod getMeta()'sında bunu çağırıyor
// (bkz. kompresor.js/reverb.js). Burada mekanizmanın kendisi test edilir; her modun
// KENDİ getMeta() sözleşmesi kendi test dosyasında (reverb.test.mjs/kompresor.test.mjs
// "getMeta() sözleşme alanları" describe'ları) ayrıca doğrulanıyor.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SOURCE_GROUPS, findSource, compatibleSourceIds } from "../www/js/core/source-catalog.js";

const ALL_IDS = SOURCE_GROUPS.flatMap(g => g.sources.map(s => s.id));

describe("source-catalog — compatibleSourceIds()", () => {
  it("parametresiz çağrıldığında TÜM kaynakları döner (varsayılan: kısıtlama yok)", () => {
    const ids = compatibleSourceIds();
    assert.deepEqual([...ids].sort(), [...ALL_IDS].sort());
  });

  it("excludeOneShot: tek-vuruş (oneShot:true) kaynakları çıkarır, diğerlerini korur", () => {
    const ids = compatibleSourceIds({ excludeOneShot: true });
    const oneShotIds = SOURCE_GROUPS.flatMap(g => g.sources).filter(s => s.oneShot).map(s => s.id);
    assert.ok(oneShotIds.length > 0, "en az bir oneShot kaynak olmalıydı (test önkoşulu)");
    for (const id of oneShotIds) assert.ok(!ids.includes(id), `${id} dışlanmalıydı`);
    for (const id of ALL_IDS.filter(i => !oneShotIds.includes(i))) assert.ok(ids.includes(id), `${id} korunmalıydı`);
  });

  it("requireTransient: transient'sız (noTransient:true) kaynakları çıkarır, diğerlerini korur", () => {
    const ids = compatibleSourceIds({ requireTransient: true });
    const noTransientIds = SOURCE_GROUPS.flatMap(g => g.sources).filter(s => s.noTransient).map(s => s.id);
    assert.ok(noTransientIds.length > 0, "en az bir noTransient kaynak olmalıydı (test önkoşulu)");
    for (const id of noTransientIds) assert.ok(!ids.includes(id), `${id} dışlanmalıydı`);
    for (const id of ALL_IDS.filter(i => !noTransientIds.includes(i))) assert.ok(ids.includes(id), `${id} korunmalıydı`);
  });

  it("excludeOneShot + requireTransient BİRLİKTE verilirse ikisinin KESİŞİMİ (her iki filtreyi de geçenler) döner", () => {
    const ids = compatibleSourceIds({ excludeOneShot: true, requireTransient: true });
    const oneShot = compatibleSourceIds({ excludeOneShot: true });
    const transient = compatibleSourceIds({ requireTransient: true });
    for (const id of ids) {
      assert.ok(oneShot.includes(id) && transient.includes(id), `${id} her iki filtreyi de geçmeliydi`);
    }
  });

  it("her modda oynanabilirlik için mantıklı bir minimum kalır (>=5 kaynak, herhangi bir filtre kombinasyonunda)", () => {
    for (const opts of [{}, { excludeOneShot: true }, { requireTransient: true }, { excludeOneShot: true, requireTransient: true }]) {
      assert.ok(compatibleSourceIds(opts).length >= 5, `${JSON.stringify(opts)}: çok az kaynak kaldı`);
    }
  });
});

describe("source-catalog — kaynak uyumluluk bayrakları (oneShot/noTransient) doğru kaynaklara etiketli", () => {
  it("kick/snare/hihat/tom oneShot:true — tek darbe, döngüde bile reverb kuyruğunu göstermez", () => {
    for (const id of ["kick", "snare", "hihat", "tom"]) {
      assert.equal(findSource(id).oneShot, true, `${id} oneShot olmalıydı`);
    }
  });

  it("davul döngüsü/enstrüman/sentetik/gürültü/upload oneShot DEĞİL", () => {
    for (const id of ["groove", "bass", "bass_alt", "guitar", "vocal", "pink", "white", "saw", "square", "triangle", "upload"]) {
      assert.ok(!findSource(id).oneShot, `${id} oneShot OLMAMALIYDI`);
    }
  });

  it("pink/white noTransient:true — ani atak yok, kompresyon duyulmaz", () => {
    for (const id of ["pink", "white"]) {
      assert.equal(findSource(id).noTransient, true, `${id} noTransient olmalıydı`);
    }
  });

  it("synth/davul/enstrüman/upload noTransient DEĞİL", () => {
    for (const id of ["saw", "square", "triangle", "kick", "snare", "hihat", "tom", "groove", "bass", "guitar", "vocal", "upload"]) {
      assert.ok(!findSource(id).noTransient, `${id} noTransient OLMAMALIYDI`);
    }
  });
});

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

  it("requireTransient: transient'sız (noTransient:true) kaynakları çıkarır, diğerlerini korur", () => {
    const ids = compatibleSourceIds({ requireTransient: true });
    const noTransientIds = SOURCE_GROUPS.flatMap(g => g.sources).filter(s => s.noTransient).map(s => s.id);
    assert.ok(noTransientIds.length > 0, "en az bir noTransient kaynak olmalıydı (test önkoşulu)");
    for (const id of noTransientIds) assert.ok(!ids.includes(id), `${id} dışlanmalıydı`);
    for (const id of ALL_IDS.filter(i => !noTransientIds.includes(i))) assert.ok(ids.includes(id), `${id} korunmalıydı`);
  });

  it("only: SADECE verilen id'leri döner, diğer tüm kaynakları/filtreleri yok sayar", () => {
    const ids = compatibleSourceIds({ only: ["vocal", "guitar"] });
    assert.deepEqual([...ids].sort(), ["guitar", "vocal"]);
  });

  it("only + requireTransient BİRLİKTE verilirse SADECE only listesi geçerli olur (requireTransient yok sayılır)", () => {
    // "only" ELLE seçilmiş kesin bir karar — bir otomatik bayrakla (requireTransient)
    // birlikte verilse bile üzerine yazılmaz, çünkü ikisinin BİRLEŞTİRİLMESİ (kesişim)
    // elle seçilmiş listeyi bayrağın tesadüfen dışladığı bir kaynak yüzünden daraltabilir
    // — "only" her zaman SON SÖZ.
    const ids = compatibleSourceIds({ only: ["pink", "vocal"], requireTransient: true });
    assert.deepEqual([...ids].sort(), ["pink", "vocal"]);
  });

  it("her modda oynanabilirlik için mantıklı bir minimum kalır (>=4 kaynak, mevcut filtre kombinasyonlarında)", () => {
    for (const opts of [{}, { requireTransient: true }, { only: ["guitar", "vocal", "snare", "groove", "upload"] }]) {
      assert.ok(compatibleSourceIds(opts).length >= 4, `${JSON.stringify(opts)}: çok az kaynak kaldı`);
    }
  });
});

describe("source-catalog — noTransient bayrağı doğru kaynaklara etiketli", () => {
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

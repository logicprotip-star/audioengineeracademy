// Mod bazlı kaynak uyumluluğu — merkezi mekanizma testleri. compatibleSourceIds()
// SAF bir fonksiyon (source-catalog.js), her mod getMeta()'sında bunu çağırıyor
// (bkz. kompresor.js/reverb.js). Burada mekanizmanın kendisi test edilir; her modun
// KENDİ getMeta() sözleşmesi kendi test dosyasında (reverb.test.mjs/kompresor.test.mjs
// "getMeta() sözleşme alanları" describe'ları) ayrıca doğrulanıyor.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SOURCE_GROUPS, SOURCE_PAIRS, findSource, compatibleSourceIds } from "../www/js/core/source-catalog.js";
import * as frekansBulma from "../www/js/modes/frekans-bulma.js";
import * as kesimNoktasi from "../www/js/modes/kesim-noktasi.js";
import * as dbSeviyesi from "../www/js/modes/db-seviyesi.js";
import * as boostMuCutMu from "../www/js/modes/boost-mu-cut-mu.js";
import * as qGenisligi from "../www/js/modes/q-genisligi.js";
import * as kompresor from "../www/js/modes/kompresor.js";
import * as reverb from "../www/js/modes/reverb.js";
import * as tonalDenge from "../www/js/modes/tonal-denge.js";
import * as frekansCakismasi from "../www/js/modes/frekans-cakismasi.js";

const ALL_IDS = SOURCE_GROUPS.flatMap(g => g.sources.map(s => s.id));
// G259 — stereoOnly bayrağı: compatibleSourceIds()'in varsayılan (parametresiz)
// yolu bunları BİLEREK dışlar (source-catalog.js'in kendi notu) — "TÜM
// kaynaklar" testleri artık ALL_IDS DEĞİL, bu daraltılmış küme ile karşılaştırılmalı.
const STEREO_ONLY_IDS = SOURCE_GROUPS.flatMap(g => g.sources).filter(s => s.stereoOnly).map(s => s.id);
const NON_STEREO_IDS = ALL_IDS.filter(id => !STEREO_ONLY_IDS.includes(id));

describe("source-catalog — compatibleSourceIds()", () => {
  it("parametresiz çağrıldığında stereoOnly HARİÇ tüm kaynakları döner (varsayılan: stereo-özel kaynaklar dışlanır)", () => {
    const ids = compatibleSourceIds();
    assert.ok(STEREO_ONLY_IDS.length > 0, "en az bir stereoOnly kaynak olmalıydı (test önkoşulu, G259)");
    assert.deepEqual([...ids].sort(), [...NON_STEREO_IDS].sort());
    for (const id of STEREO_ONLY_IDS) assert.ok(!ids.includes(id), `${id} (stereoOnly) varsayılan listede OLMAMALIYDI`);
  });

  it("requireTransient: transient'sız (noTransient:true) VE stereoOnly kaynakları çıkarır, diğerlerini korur", () => {
    const ids = compatibleSourceIds({ requireTransient: true });
    const noTransientIds = SOURCE_GROUPS.flatMap(g => g.sources).filter(s => s.noTransient).map(s => s.id);
    assert.ok(noTransientIds.length > 0, "en az bir noTransient kaynak olmalıydı (test önkoşulu)");
    for (const id of noTransientIds) assert.ok(!ids.includes(id), `${id} dışlanmalıydı`);
    for (const id of STEREO_ONLY_IDS) assert.ok(!ids.includes(id), `${id} (stereoOnly) dışlanmalıydı`);
    for (const id of NON_STEREO_IDS.filter(i => !noTransientIds.includes(i))) assert.ok(ids.includes(id), `${id} korunmalıydı`);
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

// G54 — REGRESYON ÇİTİ: 9 modun getMeta().uyumluKaynaklar'ının BEKLENEN şekle
// uyduğunu doğrudan doğrular. G42, dört "frekans-genel" modu (Kesim Noktası/
// dB/Boost-Cut/Q) compatibleSourceIds()'e geçirirken Frekans Bulma'yı KENDİ
// commit mesajında "hariç" diye BİLEREK dışarıda bırakmıştı (source-catalog.js'e
// davul/enstrüman eklenmeden ÖNCEKİ ESKİ, elle yazılmış bir dizi kalmıştı) —
// bu, cihazda kullanıcı raporuyla YAKALANDI (kick/snare/hihat/tom/bass/
// guitar/vocal listede HİÇ görünmüyordu). G54'te düzeltildi. Bu
// describe HİÇBİR modun (ileride source-catalog.js/mod dosyaları değişse
// bile) SESSİZCE aynı şekilde "unutulmuş" bir eski listeye düşmemesini
// garanti eder — compatibleSourceIds() mekanizmasının KENDİSİ zaten yukarıda
// test ediliyor, burada HER modun getMeta()'sının o mekanizmayı DOĞRU
// çağırdığı doğrulanıyor.
describe("G54 — 9 modun kaynak listesi doğru mu (kayıp enstrüman regresyon çiti)", () => {
  // "Frekans-genel" beş mod: TÜM kaynaklar (enstrüman+davul+synth+upload).
  [
    ["frekans-bulma", frekansBulma],
    ["kesim-noktasi", kesimNoktasi],
    ["db-seviyesi", dbSeviyesi],
    ["boost-mu-cut-mu", boostMuCutMu],
    ["q-genisligi", qGenisligi]
  ].forEach(([id, mod]) => {
    it(`${id}: uyumluKaynaklar stereoOnly HARİÇ tüm kaynakları içerir (enstrüman+davul+synth+upload, ${NON_STEREO_IDS.length} adet)`, () => {
      const meta = mod.getMeta();
      assert.deepEqual([...meta.uyumluKaynaklar].sort(), [...NON_STEREO_IDS].sort(), `${id}: kayıp/fazla kaynak var`);
      // Özellikle G54'te kaybolduğu tespit edilen enstrümanlar/davul TEK TEK
      // (G259: bass_alt kütüphaneden çıktı, clean_guitar YENİ eklendi):
      for (const id2 of ["kick", "snare", "hihat", "tom", "groove", "bass", "guitar", "clean_guitar", "vocal"]) {
        assert.ok(meta.uyumluKaynaklar.includes(id2), `${id}: ${id2} eksik`);
      }
      // stereoOnly kaynaklar bu 5 "frekans-genel" modun listesinde HİÇ
      // görünmemeli (G259'un kendi kararı — Stereo Genişlik DIŞINDA hiçbir yerde).
      for (const id2 of STEREO_ONLY_IDS) {
        assert.ok(!meta.uyumluKaynaklar.includes(id2), `${id}: ${id2} (stereoOnly) GÖRÜNMEMELİYDİ`);
      }
    });
  });

  it("kompresor: transient'sız (pink/white) kaynaklar KASITLI olarak dışarıda, diğerleri VAR", () => {
    const meta = kompresor.getMeta();
    assert.ok(!meta.uyumluKaynaklar.includes("pink") && !meta.uyumluKaynaklar.includes("white"));
    for (const id of ["kick", "snare", "bass", "guitar", "vocal", "groove", "saw"]) {
      assert.ok(meta.uyumluKaynaklar.includes(id), `kompresor: ${id} eksik olmamalıydı`);
    }
  });

  it("reverb: SADECE gitar/clean_guitar/arpeggio_guitar/vokal/snare/groove/upload — kick/hihat/tom/synth/bas KASITLI dışarıda (G270: clean_guitar/arpeggio_guitar eklendi)", () => {
    const meta = reverb.getMeta();
    assert.deepEqual([...meta.uyumluKaynaklar].sort(), ["arpeggio_guitar", "clean_guitar", "groove", "guitar", "snare", "upload", "vocal"].sort());
  });

  it("tonal-denge: SADECE groove/upload (dolu mix bağlamı) — KASITLI dar liste", () => {
    const meta = tonalDenge.getMeta();
    assert.deepEqual([...meta.uyumluKaynaklar].sort(), ["groove", "upload"].sort());
  });

  it("frekans-cakismasi: tek-kaynak uyumluKaynaklar BİLEREK boş (çift-tabanlı), SOURCE_PAIRS 3 hazır çift içerir (G270: snare-gitar→snare-arpej-gitar)", () => {
    const meta = frekansCakismasi.getMeta();
    assert.deepEqual(meta.uyumluKaynaklar, []);
    assert.deepEqual(SOURCE_PAIRS.map(p => p.id).sort(), ["kick-bas", "snare-arpej-gitar", "vokal-gitar"].sort());
  });
});

// G270 — YENİ kaynak: arpeggio_guitar (arpeggio_guitar.m4a, 78 BPM grid'inde
// 8 bar/24.6sn, mono, -6dBFS — diğer davul/enstrüman kaynaklarıyla AYNI
// format). Kısıtlaması olmayan modlara ("frekans-genel" G54 grubu) OTOMATİK
// dahil olur (compatibleSourceIds() parametresiz) — burada AYRICA ELLE
// seçilmiş listelere (Pan/Reverb/Tonal Denge) doğru dahil/hariç edildiği
// doğrulanıyor.
describe("source-catalog — G270 YENİ kaynak: arpeggio_guitar", () => {
  it("SOURCE_GROUPS'ta doğru alanlarla tanımlı — sample/samplePath/label", () => {
    const s = findSource("arpeggio_guitar");
    assert.ok(s, "arpeggio_guitar bulunamadı");
    assert.equal(s.kind, "sample");
    assert.equal(s.samplePath, "audio/arpeggio_guitar.m4a");
    assert.equal(typeof s.label, "string");
    assert.ok(s.label.length > 0);
    assert.ok(!s.stereoOnly, "mono dosya — stereoOnly OLMAMALI");
    assert.ok(!s.noTransient, "arpej gitar notaları transient İÇERİR");
  });

  it("kısıtlaması olmayan TÜM 'frekans-genel' modlarda (frekans-bulma/kesim-noktasi/db-seviyesi/boost-mu-cut-mu/q-genisligi) OTOMATİK mevcut", () => {
    for (const mod of [frekansBulma, kesimNoktasi, dbSeviyesi, boostMuCutMu, qGenisligi]) {
      assert.ok(mod.getMeta().uyumluKaynaklar.includes("arpeggio_guitar"));
    }
  });

  it("kompresor'da mevcut (requireTransient — arpej notaları transient taşır, noTransient DEĞİL)", () => {
    assert.ok(kompresor.getMeta().uyumluKaynaklar.includes("arpeggio_guitar"));
  });

  it("distortion'da mevcut (parametresiz compatibleSourceIds)", async () => {
    const distortion = await import("../www/js/modes/distortion.js");
    assert.ok(distortion.getMeta().uyumluKaynaklar.includes("arpeggio_guitar"));
  });

  it("Pan Konumu VE Reverb'ün ELLE seçilmiş listelerine EKLENDİ (guitar ile AYNI gerekçe — sürekli/uzayan ses)", async () => {
    const panKonumu = await import("../www/js/modes/pan-konumu.js");
    assert.ok(panKonumu.getMeta().uyumluKaynaklar.includes("arpeggio_guitar"));
    assert.ok(reverb.getMeta().uyumluKaynaklar.includes("arpeggio_guitar"));
  });

  it("Tonal Denge'nin listesine BİLEREK EKLENMEDİ (G44: tek enstrüman, dolu spektrum DEĞİL — guitar/clean_guitar/vocal/bass de aynı gerekçeyle YOK)", () => {
    assert.ok(!tonalDenge.getMeta().uyumluKaynaklar.includes("arpeggio_guitar"));
  });

  it("Stereo Genişlik'in listesine EKLENMEDİ (mono dosya)", async () => {
    const stereoGenislik = await import("../www/js/modes/stereo-genislik.js");
    assert.ok(!stereoGenislik.getMeta().uyumluKaynaklar.includes("arpeggio_guitar"));
  });

  it("snare-arpej-gitar SOURCE_PAIRS çiftinde sourceB olarak kullanılıyor", () => {
    const pair = SOURCE_PAIRS.find(p => p.id === "snare-arpej-gitar");
    assert.ok(pair);
    assert.equal(pair.sourceB, "arpeggio_guitar");
    assert.equal(pair.labelB, "Arpej Gitar");
  });
});

describe("source-catalog — noTransient bayrağı doğru kaynaklara etiketli", () => {
  it("pink/white noTransient:true — ani atak yok, kompresyon duyulmaz", () => {
    for (const id of ["pink", "white"]) {
      assert.equal(findSource(id).noTransient, true, `${id} noTransient olmalıydı`);
    }
  });

  it("synth/davul/enstrüman/upload noTransient DEĞİL", () => {
    for (const id of ["saw", "square", "triangle", "kick", "snare", "hihat", "tom", "groove", "bass", "guitar", "clean_guitar", "arpeggio_guitar", "vocal", "upload"]) {
      assert.ok(!findSource(id).noTransient, `${id} noTransient OLMAMALIYDI`);
    }
  });
});

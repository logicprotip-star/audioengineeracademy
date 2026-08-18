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
// G288 — pairOnly bayrağı EKLENDİ (snare_late, AYNI stereoOnly deseni) —
// o da varsayılan listeden dışlanır, NON_STEREO_IDS adı DEĞİŞMEDİ (bütün
// dosyada yaygın kullanılıyor) ama artık pairOnly'yi de dışlıyor.
const STEREO_ONLY_IDS = SOURCE_GROUPS.flatMap(g => g.sources).filter(s => s.stereoOnly).map(s => s.id);
const PAIR_ONLY_IDS = SOURCE_GROUPS.flatMap(g => g.sources).filter(s => s.pairOnly).map(s => s.id);
const NON_STEREO_IDS = ALL_IDS.filter(id => !STEREO_ONLY_IDS.includes(id) && !PAIR_ONLY_IDS.includes(id));

describe("source-catalog — compatibleSourceIds()", () => {
  it("parametresiz çağrıldığında stereoOnly/pairOnly HARİÇ tüm kaynakları döner (varsayılan: özel kaynaklar dışlanır)", () => {
    const ids = compatibleSourceIds();
    assert.ok(STEREO_ONLY_IDS.length > 0, "en az bir stereoOnly kaynak olmalıydı (test önkoşulu, G259)");
    assert.ok(PAIR_ONLY_IDS.length > 0, "en az bir pairOnly kaynak olmalıydı (test önkoşulu, G288)");
    assert.deepEqual([...ids].sort(), [...NON_STEREO_IDS].sort());
    for (const id of STEREO_ONLY_IDS) assert.ok(!ids.includes(id), `${id} (stereoOnly) varsayılan listede OLMAMALIYDI`);
    for (const id of PAIR_ONLY_IDS) assert.ok(!ids.includes(id), `${id} (pairOnly) varsayılan listede OLMAMALIYDI`);
  });

  it("requireTransient: transient'sız (noTransient:true) VE stereoOnly/pairOnly kaynakları çıkarır, diğerlerini korur", () => {
    const ids = compatibleSourceIds({ requireTransient: true });
    const noTransientIds = SOURCE_GROUPS.flatMap(g => g.sources).filter(s => s.noTransient).map(s => s.id);
    assert.ok(noTransientIds.length > 0, "en az bir noTransient kaynak olmalıydı (test önkoşulu)");
    for (const id of noTransientIds) assert.ok(!ids.includes(id), `${id} dışlanmalıydı`);
    for (const id of STEREO_ONLY_IDS) assert.ok(!ids.includes(id), `${id} (stereoOnly) dışlanmalıydı`);
    for (const id of PAIR_ONLY_IDS) assert.ok(!ids.includes(id), `${id} (pairOnly) dışlanmalıydı`);
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
      // G288 — pairOnly (snare_late) da AYNI şekilde HİÇ görünmemeli (SADECE
      // Frekans Çakışması'nın SOURCE_PAIRS'i findSource ile DOĞRUDAN erişir).
      for (const id2 of PAIR_ONLY_IDS) {
        assert.ok(!meta.uyumluKaynaklar.includes(id2), `${id}: ${id2} (pairOnly) GÖRÜNMEMELİYDİ`);
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

  it("reverb: SADECE gitar/clean_guitar/arpeggio_guitar/vokal/vokal2/snare/groove/upload — kick/hihat/tom/synth/bas KASITLI dışarıda (G270: clean_guitar/arpeggio_guitar eklendi, G295: vocal_1 eklendi)", () => {
    const meta = reverb.getMeta();
    assert.deepEqual([...meta.uyumluKaynaklar].sort(), ["arpeggio_guitar", "clean_guitar", "groove", "guitar", "snare", "upload", "vocal", "vocal_1"].sort());
  });

  it("tonal-denge: SADECE groove/upload (dolu mix bağlamı) — KASITLI dar liste", () => {
    const meta = tonalDenge.getMeta();
    assert.deepEqual([...meta.uyumluKaynaklar].sort(), ["groove", "upload"].sort());
  });

  it("frekans-cakismasi: tek-kaynak uyumluKaynaklar BİLEREK boş (çift-tabanlı), SOURCE_PAIRS 7 hazır çift içerir (G288: 5 offsetli çift, G295: +2 vokal2 çifti)", () => {
    const meta = frekansCakismasi.getMeta();
    assert.deepEqual(meta.uyumluKaynaklar, []);
    assert.deepEqual(SOURCE_PAIRS.map(p => p.id).sort(), ["akustik-clean", "bas-akustik", "bas-clean", "snare-akustik", "snare-clean", "vokal2-akustik", "vokal2-clean"].sort());
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

  // G288 — arpeggio_guitar ARTIK hiçbir SOURCE_PAIRS çiftinde KULLANILMIYOR
  // (kick-bas/vokal-gitar/snare-arpej-gitar TAMAMEN kalktı, yerine offsetli
  // 5 yeni çift geldi — hiçbiri arpeggio_guitar'ı kullanmıyor, guitar/
  // clean_guitar/bass/snare_late kullanıyor). Kaynağın KENDİSİ (SOURCE_GROUPS'taki
  // girdisi, diğer modlardaki dahil/hariç durumu) DOKUNULMADI — SADECE bu ÇİFT
  // ilişkisi kalktı, yukarıdaki testler hâlâ geçerli.
  it("arpeggio_guitar artık HİÇBİR SOURCE_PAIRS çiftinde kullanılmıyor (G288)", () => {
    assert.ok(!SOURCE_PAIRS.some(p => p.sourceA === "arpeggio_guitar" || p.sourceB === "arpeggio_guitar"));
  });
});

// G295 — YENİ kaynak: vocal_1 (Vokal 2, ikinci vokal alımı). "vocal" ile
// BİREBİR AYNI uyumluluk muamelesi (Pan/Reverb'ün ELLE listesinde, Tonal
// Denge'de YOK — "vocal" zaten o listede değil).
describe("source-catalog — G295 YENİ kaynak: vocal_1 (Vokal 2)", () => {
  it("SOURCE_GROUPS'ta doğru alanlarla tanımlı — sample/samplePath/label, pairOnly/stereoOnly YOK", () => {
    const s = findSource("vocal_1");
    assert.ok(s, "vocal_1 bulunamadı");
    assert.equal(s.kind, "sample");
    assert.equal(s.samplePath, "audio/vocal_1.m4a");
    assert.equal(typeof s.label, "string");
    assert.ok(s.label.length > 0);
    assert.ok(!s.stereoOnly, "mono dosya — stereoOnly OLMAMALI");
    assert.ok(!s.pairOnly, "normal kaynak — pairOnly OLMAMALI");
    assert.ok(!s.noTransient);
  });

  it("kısıtlaması olmayan TÜM 'frekans-genel' modlarda (frekans-bulma/kesim-noktasi/db-seviyesi/boost-mu-cut-mu/q-genisligi) OTOMATİK mevcut", () => {
    for (const mod of [frekansBulma, kesimNoktasi, dbSeviyesi, boostMuCutMu, qGenisligi]) {
      assert.ok(mod.getMeta().uyumluKaynaklar.includes("vocal_1"));
    }
  });

  it("kompresor'da mevcut (parametresiz requireTransient — vocal noTransient DEĞİL)", () => {
    assert.ok(kompresor.getMeta().uyumluKaynaklar.includes("vocal_1"));
  });

  it("distortion'da mevcut (parametresiz compatibleSourceIds)", async () => {
    const distortion = await import("../www/js/modes/distortion.js");
    assert.ok(distortion.getMeta().uyumluKaynaklar.includes("vocal_1"));
  });

  it("Pan Konumu VE Reverb'ün ELLE seçilmiş listelerine EKLENDİ ('vocal' ile AYNI gerekçe)", async () => {
    const panKonumu = await import("../www/js/modes/pan-konumu.js");
    assert.ok(panKonumu.getMeta().uyumluKaynaklar.includes("vocal_1"));
    assert.ok(reverb.getMeta().uyumluKaynaklar.includes("vocal_1"));
  });

  it("Tonal Denge'nin listesine BİLEREK EKLENMEDİ ('vocal' zaten o listede YOK — mod hiçbir tek-enstrüman kaynağı almıyor)", () => {
    assert.ok(!tonalDenge.getMeta().uyumluKaynaklar.includes("vocal_1"));
  });

  it("Stereo Genişlik'in listesine EKLENMEDİ (mono dosya)", async () => {
    const stereoGenislik = await import("../www/js/modes/stereo-genislik.js");
    assert.ok(!stereoGenislik.getMeta().uyumluKaynaklar.includes("vocal_1"));
  });
});

// G288 — YENİ kaynak: snare_late (snare.m4a'nın ilk vuruşu kesilmiş, son
// 377ms'si temizlenmiş "geç başlayan çift" varyantı). pairOnly:true —
// stereoOnly İLE AYNI desen (kaynak seçicide GÖRÜNMEZ, SADECE SOURCE_PAIRS
// findSource ile DOĞRUDAN erişir).
describe("source-catalog — G288 YENİ kaynak: snare_late", () => {
  it("SOURCE_GROUPS'ta doğru alanlarla tanımlı — sample/samplePath/pairOnly", () => {
    const s = findSource("snare_late");
    assert.ok(s, "snare_late bulunamadı");
    assert.equal(s.kind, "sample");
    assert.equal(s.samplePath, "audio/snare_late.m4a");
    assert.equal(s.pairOnly, true, "pairOnly:true OLMALI — genel seçicide görünmemeli");
    assert.ok(!s.stereoOnly, "mono dosya — stereoOnly OLMAMALI");
  });

  it("HİÇBİR modun kaynak listesinde görünmüyor (pairOnly varsayılan filtreden dışlanıyor)", () => {
    const mods = { frekansBulma, kesimNoktasi, dbSeviyesi, boostMuCutMu, qGenisligi, kompresor, reverb, tonalDenge };
    for (const [name, mod] of Object.entries(mods)) {
      assert.ok(!mod.getMeta().uyumluKaynaklar.includes("snare_late"), `${name}: snare_late GÖRÜNMEMELİYDİ`);
    }
  });

  it("SOURCE_PAIRS'in İKİ çiftinde (snare-akustik/snare-clean) sourceA olarak, offsetA=0.377 ile kullanılıyor", () => {
    for (const id of ["snare-akustik", "snare-clean"]) {
      const pair = SOURCE_PAIRS.find(p => p.id === id);
      assert.ok(pair, `${id} bulunamadı`);
      assert.equal(pair.sourceA, "snare_late");
      assert.equal(pair.offsetA, 0.377);
      assert.equal(pair.offsetB, 0);
    }
  });
});

// G295 — YENİ SOURCE_PAIRS çiftleri: vokal2-clean/vokal2-akustik (vocal_1 ile
// clean_guitar/acoustic_guitar). Logic'in kulakla seçtiği iki çift — region
// Welch/4096-FFT/-15dB/60Hz-boşluk-toleranslı TÜM-küme-kesişimi yöntemiyle
// ÖLÇÜLDÜ (vokal çok-formantlı, tek-küme yöntemi G288/OLCUM-CIFT-DENGE'de
// zaten YANLIŞ sonuç verdiği KANITLANMIŞTI). Zamansal örtüşme ZATEN yüksek
// (%56-63) — offset GEREKMEDİ.
describe("source-catalog — G295 YENİ SOURCE_PAIRS çiftleri: vokal2-clean/vokal2-akustik", () => {
  it("vokal2-clean: sourceA=vocal_1/sourceB=clean_guitar, region=[200,370], offset YOK", () => {
    const pair = SOURCE_PAIRS.find(p => p.id === "vokal2-clean");
    assert.ok(pair, "vokal2-clean bulunamadı");
    assert.equal(pair.sourceA, "vocal_1");
    assert.equal(pair.sourceB, "clean_guitar");
    assert.deepEqual(pair.region, [200, 370]);
    assert.equal(pair.offsetA, 0);
    assert.equal(pair.offsetB, 0);
  });

  it("vokal2-akustik: sourceA=vocal_1/sourceB=guitar, region=[200,370], offset YOK", () => {
    const pair = SOURCE_PAIRS.find(p => p.id === "vokal2-akustik");
    assert.ok(pair, "vokal2-akustik bulunamadı");
    assert.equal(pair.sourceA, "vocal_1");
    assert.equal(pair.sourceB, "guitar");
    assert.deepEqual(pair.region, [200, 370]);
    assert.equal(pair.offsetA, 0);
    assert.equal(pair.offsetB, 0);
  });
});

// G288 — SOURCE_PAIRS'in YENİ offsetA/offsetB alanı: OLCUM-CIFT-OFFSET-17-08.md'nin
// bulduğu "negatif offsetSec RangeError fırlatır" sorunundan kaçınmak için
// HER ZAMAN pozitif (veya 0) olmalı — hiçbir çift negatif bir değer TAŞIMAMALI.
describe("source-catalog — G288 SOURCE_PAIRS offsetA/offsetB (çift-bazlı zamansal hizalama)", () => {
  it("her çiftte offsetA/offsetB tanımlı, sayı, NEGATİF DEĞİL", () => {
    for (const pair of SOURCE_PAIRS) {
      assert.equal(typeof pair.offsetA, "number", `${pair.id}: offsetA sayı olmalı`);
      assert.equal(typeof pair.offsetB, "number", `${pair.id}: offsetB sayı olmalı`);
      assert.ok(pair.offsetA >= 0, `${pair.id}: offsetA NEGATİF OLMAMALI (RangeError riski, OLCUM-CIFT-OFFSET-17-08.md)`);
      assert.ok(pair.offsetB >= 0, `${pair.id}: offsetB NEGATİF OLMAMALI (RangeError riski, OLCUM-CIFT-OFFSET-17-08.md)`);
    }
  });

  it("HER çiftte SADECE bir taraf offsetli (ikisi birden 0'dan farklı olmamalı — 'geç başlayan taraf' tekil olmalı)", () => {
    for (const pair of SOURCE_PAIRS) {
      assert.ok(!(pair.offsetA > 0 && pair.offsetB > 0), `${pair.id}: iki tarafın da offseti olmamalı`);
    }
  });

  it("akustik-clean çiftinde offset yok (ikisi de 0)", () => {
    const pair = SOURCE_PAIRS.find(p => p.id === "akustik-clean");
    assert.equal(pair.offsetA, 0);
    assert.equal(pair.offsetB, 0);
  });

  it("bas-akustik/bas-clean çiftlerinde gitar tarafı (sourceB) 0.377 offsetli, bas (sourceA) offsetsiz", () => {
    for (const id of ["bas-akustik", "bas-clean"]) {
      const pair = SOURCE_PAIRS.find(p => p.id === id);
      assert.equal(pair.sourceA, "bass");
      assert.equal(pair.offsetA, 0);
      assert.equal(pair.offsetB, 0.377);
    }
  });

  it("region alanları TÜM çiftlerde [min,max] Hz dizisi, min<max, mantıklı ses bandı içinde", () => {
    for (const pair of SOURCE_PAIRS) {
      assert.ok(Array.isArray(pair.region) && pair.region.length === 2, `${pair.id}: region [min,max] olmalı`);
      const [lo, hi] = pair.region;
      assert.ok(lo > 0 && hi > lo, `${pair.id}: region geçersiz [${lo},${hi}]`);
      assert.ok(hi < 20000, `${pair.id}: region üst sınırı mantıksız`);
    }
  });
});

// G295 — SOURCE_PAIRS'in YENİ gainA/gainB alanı (dB): OLCUM-CIFT-DENGE-18-08.md'nin
// ölçtüğü çift-içi (concurrent, bant-sınırlı) seviye dengesizliğini düzeltir.
// offsetA/offsetB'nin İNVARYANT deseniyle AYNI mantık — SADECE burada "her
// zaman negatif/0" (offset'in "her zaman pozitif/0" invaryantının AYNASI):
// SADECE kısma uygulanıyor, hiçbir kaynağın kendi dosya seviyesi değişmiyor.
describe("source-catalog — G295 SOURCE_PAIRS gainA/gainB (çift-içi statik seviye düzeltmesi)", () => {
  it("her çiftte gainA/gainB tanımlı, sayı, POZİTİF DEĞİL (sadece kısma, hiç yükseltme yok)", () => {
    for (const pair of SOURCE_PAIRS) {
      assert.equal(typeof pair.gainA, "number", `${pair.id}: gainA sayı olmalı`);
      assert.equal(typeof pair.gainB, "number", `${pair.id}: gainB sayı olmalı`);
      assert.ok(pair.gainA <= 0, `${pair.id}: gainA POZİTİF OLMAMALI (sadece louder tarafı kıs kararı)`);
      assert.ok(pair.gainB <= 0, `${pair.id}: gainB POZİTİF OLMAMALI (sadece louder tarafı kıs kararı)`);
    }
  });

  it("HER çiftte SADECE bir taraf kısılmış olabilir (ikisi birden 0'dan farklı olmamalı)", () => {
    for (const pair of SOURCE_PAIRS) {
      assert.ok(!(pair.gainA < 0 && pair.gainB < 0), `${pair.id}: iki tarafın da gain düzeltmesi olmamalı`);
    }
  });

  it("OLCUM-CIFT-DENGE-18-08.md'nin ölçtüğü 2 dengesiz mevcut çift doğru düzeltildi", () => {
    assert.equal(SOURCE_PAIRS.find(p => p.id === "akustik-clean").gainB, -2.9, "Clean Gitar +2.89dB yüksekti");
    assert.equal(SOURCE_PAIRS.find(p => p.id === "akustik-clean").gainA, 0);
    assert.equal(SOURCE_PAIRS.find(p => p.id === "bas-akustik").gainA, -1.9, "Bas yüksekti");
    assert.equal(SOURCE_PAIRS.find(p => p.id === "bas-akustik").gainB, 0);
  });

  it("±1.5dB tolerans İÇİNDE ölçülen 3 çiftte (bas-clean/snare-akustik/snare-clean) düzeltme YOK", () => {
    for (const id of ["bas-clean", "snare-akustik", "snare-clean"]) {
      const pair = SOURCE_PAIRS.find(p => p.id === id);
      assert.equal(pair.gainA, 0, `${id}: gainA`);
      assert.equal(pair.gainB, 0, `${id}: gainB`);
    }
  });

  it("G301 (vocal_1.m4a DC-offset değişimi SONRASI yeniden ölçüldü): vokal2-clean dengesiz (gainB=-1.6), vokal2-akustik dengeli (0/0)", () => {
    assert.equal(SOURCE_PAIRS.find(p => p.id === "vokal2-clean").gainB, -1.6, "YENİ vocal_1.m4a ile Clean Gitar +1.57dB yüksek");
    assert.equal(SOURCE_PAIRS.find(p => p.id === "vokal2-clean").gainA, 0);
    assert.equal(SOURCE_PAIRS.find(p => p.id === "vokal2-akustik").gainA, 0, "YENİ dosyayla fark -0.72dB, ±1.5dB içinde");
    assert.equal(SOURCE_PAIRS.find(p => p.id === "vokal2-akustik").gainB, 0);
  });
});

describe("source-catalog — noTransient bayrağı doğru kaynaklara etiketli", () => {
  it("pink/white noTransient:true — ani atak yok, kompresyon duyulmaz", () => {
    for (const id of ["pink", "white"]) {
      assert.equal(findSource(id).noTransient, true, `${id} noTransient olmalıydı`);
    }
  });

  it("synth/davul/enstrüman/upload noTransient DEĞİL", () => {
    for (const id of ["saw", "square", "triangle", "kick", "snare", "snare_late", "hihat", "tom", "groove", "bass", "guitar", "clean_guitar", "arpeggio_guitar", "vocal", "upload"]) {
      assert.ok(!findSource(id).noTransient, `${id} noTransient OLMAMALIYDI`);
    }
  });
});

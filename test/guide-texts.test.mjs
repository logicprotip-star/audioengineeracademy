// "i" bilgi/rehber sistemi (G67) + SPOTLIGHT rehber turu (G68) + eksik
// kontroller/oyun seçenekleri (G69). guide-texts.js'in dosya başı iddiasını
// doğrular: 10 oynanabilir modun HEPSİ hem MODE_GUIDE_TEXTS hem
// MODE_OPTIONS_TEXTS hem SPOTLIGHT_STEPS'te var, GENERAL_GUIDE 5 bölümü
// taşıyor, ve shouldShowRoundHint/spotlightStepsFor saf fonksiyonları doğru
// davranıyor.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GENERAL_GUIDE,
  MODE_GUIDE_TEXTS,
  MODE_OPTIONS_TEXTS,
  SPOTLIGHT_STEPS,
  HINT_ROUNDS_LIMIT,
  shouldShowRoundHint,
  spotlightStepsFor,
  TOOLS_UPLOAD_GUIDE,
  PROGRESS_BADGES_GUIDE,
  PROGRESS_ZONE_GUIDE,
  PROGRESS_DAILY_GUIDE,
  PROGRESS_ACCURACY_GUIDE
} from "../www/js/core/guide-texts.js";
import { MODE_CATALOG } from "../www/js/core/mode-catalog.js";

// mode-catalog.js'in playable:true olan 10 girdisi — guide-texts.js bunları
// mode-id anahtarı olarak birebir kullanmalı (level-sheet-terms.js ile AYNI
// ölçüt, terminology.test.mjs'nin de zaten güvendiği katalog).
const PLAYABLE_MODE_IDS = MODE_CATALOG.filter(e => e.playable).map(e => e.id);

// G69: app.js'in KENDİ THREE_WAY_MODE_IDS listesiyle AYNI (kopyası — app.js
// DOM'a bağlı olduğu için buradan import EDİLEMİYOR, bkz. CLAUDE.md testler
// notu; üç isim de mode-catalog.js'ten GERÇEK id'ler).
const THREE_WAY_MODE_IDS = new Set(["kompresor", "reverb", "distortion"]);

// Frekans Çakışması BİLİNÇLİ olarak sadece 2 adımlı (dinle+seç, "abControl"
// YOK — #abToggle o modda GİZLİ, bkz. syncCakismaVisibility) — mod zaten
// çok-aşamalı, kendi soru başlığı/talimatı aşamaları ZATEN anlatıyor (bkz.
// guide-texts.js:SPOTLIGHT_STEPS dosya başı notu). Diğer 9 mod 4 adımlı
// (dinle → abControl → seç → onayla, G69'da abControl eklendi).
const TWO_STEP_MODES = new Set(["frekans-cakismasi"]);
const VALID_TARGETS = new Set(["listen", "abControl", "select", "confirm"]);

describe("guide-texts: MODE_GUIDE_TEXTS 10 oynanabilir modun HEPSİNİ içerir", () => {
  it("anahtar kümesi playable mod id'leriyle BİREBİR eşleşir (fazla/eksik yok)", () => {
    assert.deepEqual(Object.keys(MODE_GUIDE_TEXTS).sort(), [...PLAYABLE_MODE_IDS].sort());
  });

  PLAYABLE_MODE_IDS.forEach(id => {
    it(`${id}: metin boş DEĞİL bir string`, () => {
      assert.equal(typeof MODE_GUIDE_TEXTS[id], "string");
      assert.ok(MODE_GUIDE_TEXTS[id].length > 20, `${id} metni çok kısa/boş görünüyor`);
    });
  });
});

describe("guide-texts: SPOTLIGHT_STEPS 10 oynanabilir modun HEPSİNİ içerir", () => {
  it("anahtar kümesi playable mod id'leriyle BİREBİR eşleşir (fazla/eksik yok)", () => {
    assert.deepEqual(Object.keys(SPOTLIGHT_STEPS).sort(), [...PLAYABLE_MODE_IDS].sort());
  });

  PLAYABLE_MODE_IDS.forEach(id => {
    const expectedLen = TWO_STEP_MODES.has(id) ? 2 : 4;
    it(`${id}: tam olarak ${expectedLen} adımlık bir dizi, her adım geçerli target+text taşır`, () => {
      const steps = SPOTLIGHT_STEPS[id];
      assert.ok(Array.isArray(steps));
      assert.equal(steps.length, expectedLen, `${id} adım sayısı beklenenden farklı`);
      steps.forEach(step => {
        assert.ok(VALID_TARGETS.has(step.target), `${id}: bilinmeyen target "${step.target}"`);
        assert.equal(typeof step.text, "string");
        assert.ok(step.text.length > 0);
      });
    });
  });

  it("4 adımlı modların HEPSİ 'listen' ile başlar, 'confirm' ile biter (dinle → abControl → seç → onayla akışı)", () => {
    PLAYABLE_MODE_IDS.filter(id => !TWO_STEP_MODES.has(id)).forEach(id => {
      const steps = SPOTLIGHT_STEPS[id];
      assert.equal(steps[0].target, "listen", `${id} ilk adım "listen" değil`);
      assert.equal(steps[steps.length - 1].target, "confirm", `${id} son adım "confirm" değil`);
      assert.equal(steps[1].target, "abControl", `${id} ikinci adım "abControl" değil`);
    });
  });

  it("Frekans Çakışması SADECE dinle+seç (2 adım) — #abToggle o modda GİZLİ, 'abControl' uydurulmadı", () => {
    const steps = SPOTLIGHT_STEPS["frekans-cakismasi"];
    assert.deepEqual(steps.map(s => s.target), ["listen", "select"]);
  });

  it("Tonal Denge'de 'select' kaydırıcıları, 'confirm' ayrı bir onay adımını anlatır (metinler farklı)", () => {
    const steps = SPOTLIGHT_STEPS["tonal-denge"];
    assert.match(steps.find(s => s.target === "select").text, /kaydırıcı/i);
    assert.match(steps.find(s => s.target === "confirm").text, /onayla/i);
  });

  it("three-way 3 modda (Kompresör/Reverb/Distortion) abControl metni DÖNGÜ'yü anlatır ('uzun bas')", () => {
    [...THREE_WAY_MODE_IDS].forEach(id => {
      const abStep = SPOTLIGHT_STEPS[id].find(s => s.target === "abControl");
      assert.match(abStep.text, /uzun bas/i, `${id} abControl metni döngüyü anlatmıyor`);
    });
  });

  it("three-way OLMAYAN (cakisma HARİÇ) 6 modda abControl metni A/B KARŞILAŞTIRMA'yı anlatır ('A/B Test')", () => {
    PLAYABLE_MODE_IDS.filter(id => !TWO_STEP_MODES.has(id) && !THREE_WAY_MODE_IDS.has(id)).forEach(id => {
      const abStep = SPOTLIGHT_STEPS[id].find(s => s.target === "abControl");
      assert.match(abStep.text, /A\/B Test/, `${id} abControl metni A/B karşılaştırmayı anlatmıyor`);
    });
  });

  it("SON adımın metni 'Atla' VE 'Durdur'u hatırlatır (durdur/atla evrensel kontroller, kendi kutusu yok)", () => {
    PLAYABLE_MODE_IDS.forEach(id => {
      const steps = SPOTLIGHT_STEPS[id];
      const lastText = steps[steps.length - 1].text;
      assert.match(lastText, /Atla/, `${id} son adımda 'Atla' hatırlatması yok`);
      assert.match(lastText, /Durdur/, `${id} son adımda 'Durdur' hatırlatması yok`);
    });
  });
});

describe("guide-texts: MODE_OPTIONS_TEXTS 10 oynanabilir modun HEPSİNİ içerir (G69)", () => {
  it("anahtar kümesi playable mod id'leriyle BİREBİR eşleşir (fazla/eksik yok)", () => {
    assert.deepEqual(Object.keys(MODE_OPTIONS_TEXTS).sort(), [...PLAYABLE_MODE_IDS].sort());
  });

  PLAYABLE_MODE_IDS.forEach(id => {
    it(`${id}: metin boş DEĞİL bir string`, () => {
      assert.equal(typeof MODE_OPTIONS_TEXTS[id], "string");
      assert.ok(MODE_OPTIONS_TEXTS[id].length > 20, `${id} seçenek metni çok kısa/boş görünüyor`);
    });
  });

  it("SADECE Frekans Bulma 'Dokunmalı/Şıklı' format seçiminden bahseder (isChoiceFormat() diğer 9 modu HER ZAMAN şıklıya zorluyor)", () => {
    assert.match(MODE_OPTIONS_TEXTS["frekans-bulma"], /Dokunmalı.*Şıklı|Şıklı.*Dokunmalı/i);
    PLAYABLE_MODE_IDS.filter(id => id !== "frekans-bulma").forEach(id => {
      assert.doesNotMatch(MODE_OPTIONS_TEXTS[id], /Dokunmalı/i, `${id} format seçimi olmadığı halde bahsediyor`);
    });
  });

  it("SADECE Frekans Bulma 'Odak aralığı'ndan bahseder (mode.FOCUS_RANGES sadece frekans-bulma.js'te tanımlı)", () => {
    assert.match(MODE_OPTIONS_TEXTS["frekans-bulma"], /[Oo]dak aralığı/);
    PLAYABLE_MODE_IDS.filter(id => id !== "frekans-bulma").forEach(id => {
      assert.doesNotMatch(MODE_OPTIONS_TEXTS[id], /[Oo]dak aralığı/, `${id} odak aralığı olmadığı halde bahsediyor`);
    });
  });

  it("Frekans Çakışması 'Karıştır'dan BAHSETMEZ (pickRoundSource() kaynak-çifti akışında hiç kullanılmıyor)", () => {
    assert.doesNotMatch(MODE_OPTIONS_TEXTS["frekans-cakismasi"], /Karıştır/);
  });

  it("Tonal Denge 'Karıştır'dan BAHSETMEZ (only:[groove,upload] havuzunda upload hariç TEK aday kalır, fiilen etkisiz)", () => {
    assert.doesNotMatch(MODE_OPTIONS_TEXTS["tonal-denge"], /Karıştır/);
  });

  it("Karıştır'ın GERÇEKTEN anlamlı olduğu 8 modun (cakisma+tonal-denge HARİÇ) HEPSİ 'Karıştır'dan bahseder", () => {
    PLAYABLE_MODE_IDS.filter(id => id !== "frekans-cakismasi" && id !== "tonal-denge").forEach(id => {
      assert.match(MODE_OPTIONS_TEXTS[id], /Karıştır/, `${id} Karıştır'dan bahsetmiyor`);
    });
  });

  it("Frekans Çakışması kendi 'Önce/Sonra' karşılaştırmasından bahseder (cakismaBefore/After — abToggle'ın YERİNE geçen mod-özel kontrol)", () => {
    assert.match(MODE_OPTIONS_TEXTS["frekans-cakismasi"], /Önce.*Sonra|Sonra.*Önce/);
  });

  it("cakisma HARİÇ 9 modun HEPSİ kendi dosya yükleme seçeneğinden bahseder (uyumluKaynaklar HEPSİNDE 'upload' içerir)", () => {
    PLAYABLE_MODE_IDS.filter(id => id !== "frekans-cakismasi").forEach(id => {
      assert.match(MODE_OPTIONS_TEXTS[id], /yükle/i, `${id} yükleme seçeneğinden bahsetmiyor`);
    });
  });
});

describe("guide-texts: GENERAL_GUIDE ana ekranın genel sistem bilgisini taşır", () => {
  it("title tanımlı", () => {
    assert.equal(typeof GENERAL_GUIDE.title, "string");
    assert.ok(GENERAL_GUIDE.title.length > 0);
  });

  it("tam olarak 10 bölüm içerir (G290: ESKİ 5'e 5 YENİ EKLENDİ, hiçbiri silinmedi)", () => {
    assert.equal(GENERAL_GUIDE.sections.length, 10);
    GENERAL_GUIDE.sections.forEach(s => {
      assert.equal(typeof s.heading, "string");
      assert.equal(typeof s.body, "string");
      assert.ok(s.heading.length > 0);
      assert.ok(s.body.length > 0);
    });
  });

  // G290 — KİLİT: DOKUNULMAYACAK'ın "mevcut 16 'i' metni değiştirilmeyecek"
  // şartının GENERAL_GUIDE'a düşen kısmı — ESKİ 5 bölümün başlığı/metni/sırası
  // BİREBİR AYNI kalmalı (yeni bölümler SONRALARINA eklendi, aralarına değil).
  it("ESKİ 5 bölüm (0-4 index) TEK SATIR değişmeden, AYNI SIRADA duruyor", () => {
    const oldHeadings = GENERAL_GUIDE.sections.slice(0, 5).map(s => s.heading);
    assert.deepEqual(oldHeadings, ["Nasıl çalışır?", "Seviye ve zorluk", "Sınav ve bölüm geçme", "Ücretsiz ve Pro", "Can"]);
    assert.equal(GENERAL_GUIDE.sections[3].hideForPro, true, "'Ücretsiz ve Pro' hideForPro KORUNDU");
    assert.equal(GENERAL_GUIDE.sections[4].hideForPro, true, "'Can' hideForPro KORUNDU");
  });

  // G290 (OLCUM-I-METINLERI-17-08'in bulduğu boşluk, OLCUM-XP-17-08/
  // OLCUM-SINAV-17-08'in ölçtüğü sayılar) — YENİ 5 bölüm (index 5-9).
  it("YENİ 5 bölüm (index 5-9) doğru sırada, doğru başlıklarda", () => {
    const newHeadings = GENERAL_GUIDE.sections.slice(5).map(s => s.heading);
    assert.deepEqual(newHeadings, ["XP nasıl kazanılır?", "XP çarpanları", "İki ayrı seviye", "Sınav nasıl açılır? (Pro)", "Kalınca ve telafi (Pro)"]);
  });

  it("XP çarpanları — OLCUM-XP-17-08'de ölçülen 4 sayı (2.4/1.65/1.2/yarıya) metinde GEÇİYOR", () => {
    const body = GENERAL_GUIDE.sections[6].body;
    assert.match(body, /2\.4/);
    assert.match(body, /1\.65/);
    assert.match(body, /1\.2/);
    assert.match(body, /yarıya/);
  });

  it("Sınav/telafi bölümleri — OLCUM-SINAV-17-08'de doğrulanan sayılar (10/6/4 kademe) VE 'Pro' notu geçiyor", () => {
    const examBody = GENERAL_GUIDE.sections[8].body;
    const remedialBody = GENERAL_GUIDE.sections[9].body;
    assert.match(examBody, /10 soruluk/);
    assert.match(examBody, /6 doğru/);
    assert.match(examBody, /en zor kademede/);
    assert.match(remedialBody, /telafi/i);
    assert.match(remedialBody, /Pro/);
  });

  // Yeni bölümlerin HİÇBİRİ hideForPro TAŞIMIYOR (Bug #40'ın "Ücretsiz ve
  // Pro"/"Can" mantığının TERSİ — bunlar Pro'ya ÖZEL ama ücretsiz kullanıcı
  // da görebilir, sadece kendisiyle ilgili OLMADIĞINI metinden anlar).
  it("YENİ 5 bölümün hiçbirinde hideForPro YOK", () => {
    GENERAL_GUIDE.sections.slice(5).forEach(s => {
      assert.equal(s.hideForPro, undefined, `${s.heading}: hideForPro OLMAMALI`);
    });
  });
});

// G290 — OLCUM-I-METINLERI-17-08 madde A.4/B.1'in bulduğu boşluklar için
// YENİ 5 "i" içeriği (Mixini Yükle + İlerleme'nin 4 kartı). TOOLS_TONAL_
// GUIDE/TOOLS_RESULTS_GUIDE/TOOLS_FILTER_GUIDE'ın AYNI {title, sections}
// şekli.
describe("guide-texts: G290'un 5 YENİ kart-'i'si (Mixini Yükle + İlerleme'nin 4 kartı)", () => {
  const guides = {
    "Mixini Yükle": TOOLS_UPLOAD_GUIDE,
    "Rozetler": PROGRESS_BADGES_GUIDE,
    "Zayıf Bölge Raporu": PROGRESS_ZONE_GUIDE,
    "Günlük Görevler": PROGRESS_DAILY_GUIDE,
    "İsabet Grafiği": PROGRESS_ACCURACY_GUIDE
  };

  for (const [expectedTitle, guide] of Object.entries(guides)) {
    it(`${expectedTitle} — {title, sections} şekli doğru, en az 1 bölüm, başlık eşleşiyor`, () => {
      assert.equal(guide.title, expectedTitle);
      assert.ok(Array.isArray(guide.sections) && guide.sections.length >= 1);
      guide.sections.forEach(s => {
        assert.equal(typeof s.heading, "string");
        assert.equal(typeof s.body, "string");
        assert.ok(s.heading.length > 0);
        assert.ok(s.body.length > 0);
      });
    });
  }

  it("Rozetler — 6 rozet adı görevin verdiği metinle BİREBİR geçiyor", () => {
    const body = PROGRESS_BADGES_GUIDE.sections[0].body;
    for (const name of ["Dinleyici", "Ses Kaşifi", "Miksçi", "Ses Mühendisi", "Mastering Mühendisi", "Altın Kulak"]) {
      assert.ok(body.includes(name), `${name} rozet metninde YOK`);
    }
    assert.match(body, /başarımlara bağlı/);
  });

  it("Zayıf Bölge Raporu — 6 bölge adı geçiyor", () => {
    const body = PROGRESS_ZONE_GUIDE.sections[0].body;
    for (const zone of ["SUB", "BAS", "ALT-ORTA", "ORTA", "ÜST-ORTA", "TİZ"]) {
      assert.ok(body.includes(zone), `${zone} bölge metninde YOK`);
    }
  });

  it("Mixini Yükle — 'cihazında kalır' gizlilik notu geçiyor", () => {
    assert.match(TOOLS_UPLOAD_GUIDE.sections[0].body, /cihazında kalır/);
  });
});

describe("guide-texts: shouldShowRoundHint — ilk HINT_ROUNDS_LIMIT round'da true", () => {
  it("HINT_ROUNDS_LIMIT tam olarak 2 (task'ın kendi sayısı: 'ilk 2 kez')", () => {
    assert.equal(HINT_ROUNDS_LIMIT, 2);
  });

  it("hintRoundsShown 0 → true (henüz hiç gösterilmedi)", () => {
    assert.equal(shouldShowRoundHint(0), true);
  });

  it("hintRoundsShown 1 → true (ikinci round hâlâ hakkı var)", () => {
    assert.equal(shouldShowRoundHint(1), true);
  });

  it("hintRoundsShown 2 → false (limit doldu, otomatik açılmaz)", () => {
    assert.equal(shouldShowRoundHint(2), false);
  });

  it("hintRoundsShown 5 → false (limit çoktan aşıldı)", () => {
    assert.equal(shouldShowRoundHint(5), false);
  });

  it("undefined/eksik değer → true (freshModeState/migration ile 0'a denk gelir)", () => {
    assert.equal(shouldShowRoundHint(undefined), true);
  });
});

describe("guide-texts: spotlightStepsFor — modun adım dizisini döndürür", () => {
  PLAYABLE_MODE_IDS.forEach(id => {
    it(`${id}: spotlightStepsFor null DEĞİL, SPOTLIGHT_STEPS[id] ile AYNI diziyi döner`, () => {
      assert.deepEqual(spotlightStepsFor(id), SPOTLIGHT_STEPS[id]);
    });
  });

  it("kayıtlı olmayan bir modId için null döner (tur hiç başlatılmaz)", () => {
    assert.equal(spotlightStepsFor("olmayan-mod-id"), null);
  });
});

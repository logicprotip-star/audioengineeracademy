// G47 — Sınav sistemi (core/exam-system.js) testleri: merkezi altyapının pilot
// (Kompresör) üzerinden doğrulandığı SAF/stateful mantık. Ses/DOM'a hiç
// dokunmayan bir modül — app.js'in gerçek sheet/toast kablolaması buradan test
// EDİLMİYOR (bu proje kuralı: "Ses ve DOM davranışı kaynak koddan doğrulanamaz",
// bkz. CLAUDE.md), o kısım tarayıcıda ayrıca doğrulandı (bkz. DURUM.md G47).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createExamSystem, getWeakTier, recordTierResult, EXAM_CONFIG } from "../www/js/core/exam-system.js";

function playCorrect(es, n, tier = "medium") {
  const events = [];
  for (let i = 0; i < n; i++) events.push(es.recordAnswer(true, tier));
  return events;
}

describe("createExamSystem() — parkur/kombo temel akış", () => {
  it("başlangıçta faz='parkur', pozisyon=0, etiket='Soru 1/10'", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    assert.equal(es.phase, "parkur");
    assert.equal(es.position, 0);
    assert.equal(es.label(), "Soru 1/10");
  });

  it("her cevap pozisyonu 1 artırır, doğru cevap comboInParkur'u da artırır", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.recordAnswer(true, "medium");
    assert.equal(es.position, 1);
    assert.equal(es.comboInParkur, 1);
    assert.equal(es.parkurCorrect, 1);
    es.recordAnswer(true, "medium");
    assert.equal(es.comboInParkur, 2);
  });

  it("YANLIŞ cevap comboInParkur'u SIFIRLAR ama parkurCorrect'i ETKİLEMEZ (toplam ayrı sayaç)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.recordAnswer(true, "medium");
    es.recordAnswer(true, "medium");
    es.recordAnswer(false, "medium");
    assert.equal(es.comboInParkur, 0);
    assert.equal(es.parkurCorrect, 2);
  });
});

describe("createExamSystem() — KOMBO: 6 peş peşe → erken sınav teklifi", () => {
  it("TAM 6. peş peşe doğruda 'exam-offer' olayı üretir, remaining=PARKUR_LENGTH-position (task örneği: 4)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    const events = playCorrect(es, 6);
    const last = events[events.length - 1];
    assert.equal(last.event, "exam-offer");
    assert.equal(last.remaining, 4, "task'ın kendi örneği: 6. soruda teklif, 4 soru kalmış");
    assert.equal(es.phase, "exam-offer");
  });

  it("5 peş peşe doğruda HENÜZ teklif YOK (eşik TAM 6)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    const events = playCorrect(es, 5);
    assert.ok(events.every(e => e.event === "continue"));
    assert.equal(es.phase, "parkur");
  });

  it("kombo ARADA bir yanlışla kırılırsa (ör. 3 doğru + 1 yanlış + 6 doğru = pozisyon 10'da) 6. peş peşeye TEKRAR ULAŞINCA yine teklif üretir", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    playCorrect(es, 3);
    es.recordAnswer(false, "medium");
    const events = playCorrect(es, 6);
    // pozisyon: 3+1+6=10 → tam parkur sonu; ama 6. peş peşe doğru pozisyon
    // 10'da yakalanınca (position < PARKUR_LENGTH koşulu SAĞLANMADIĞI için)
    // "exam-offer" DEĞİL, doğrudan parkur-sonu TOPLAM yoluyla "exam-start"
    // üretilmeli (aşağıdaki test bunu ayrıca doğruluyor) — burada sadece
    // kombonun GERÇEKTEN 6'ya ulaştığını (comboInParkur) doğruluyoruz.
    assert.equal(es.comboInParkur, 6);
    const last = events[events.length - 1];
    assert.equal(last.event, "exam-start", "position PARKUR_LENGTH'e eşitken 'offer' değil doğrudan sınav başlamalı");
  });

  it("erken teklif SADECE BİR KEZ gösterilir — teklif REDDEDİLİP kombo yeniden 6'ya ulaşsa bile İKİNCİ kez SORULMAZ", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    playCorrect(es, 6); // teklif tetiklenir
    es.declineEarlyExam();
    assert.equal(es.phase, "parkur");
    // 7. soruda combo zaten 6 idi, decline sonrası devam — combo halen 6, bir
    // sonraki doğru cevapla 7 olur, EŞİĞİ AŞMIŞ olsa bile examOffered=true
    // olduğu için TEKRAR "exam-offer" ÜRETİLMEMELİ.
    const r = es.recordAnswer(true, "medium");
    assert.notEqual(r.event, "exam-offer");
  });

  it("teklif KABUL edilirse faz='exam'e geçer, examIndex/examCorrect sıfırlanır", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    playCorrect(es, 6);
    es.acceptEarlyExam();
    assert.equal(es.phase, "exam");
    assert.equal(es.examIndex, 0);
    assert.equal(es.examCorrect, 0);
    assert.equal(es.label(), `Sınav 1/${EXAM_CONFIG.EXAM_LENGTH}`);
  });

  it("teklif REDDEDİLİRSE faz='parkur'a GERİ döner, pozisyon/parkurCorrect KORUNUR", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    playCorrect(es, 6);
    const posBefore = es.position;
    es.declineEarlyExam();
    assert.equal(es.phase, "parkur");
    assert.equal(es.position, posBefore, "reddetme pozisyonu SIFIRLAMAMALI");
  });
});

describe("createExamSystem() — TOPLAM: parkur sonunda >=6 doğru → sınav; <6 → baştan", () => {
  it("10 sorunun 6'sı doğru (kombo hiç 6'ya ulaşmadan, aralarda yanlışlarla) → parkur sonunda 'exam-start'", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    // desen: D,Y,D,Y,D,Y,D,Y,D,D → 6 doğru, combo ASLA 6'ya ulaşmıyor (en uzun seri: 2)
    const pattern = [true, false, true, false, true, false, true, false, true, true];
    let last;
    pattern.forEach(c => { last = es.recordAnswer(c, "medium"); });
    assert.equal(es.parkurCorrect, 6);
    assert.equal(last.event, "exam-start");
    assert.equal(es.phase, "exam");
  });

  it("10 sorunun 5'i doğru (<6) → 'remedial-start' üretir (G48: BAŞTAN atmaz, telafiye geçer — faz app.js'in startRemedial() çağrısına kadar 'parkur' kalır)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    const pattern = [true, false, true, false, true, false, true, false, true, false];
    let last;
    pattern.forEach(c => { last = es.recordAnswer(c, "medium"); });
    assert.equal(last.event, "remedial-start");
    assert.equal(es.phase, "parkur", "resetParkur BURADA çağrılmaz — startRemedial() çağrılana kadar parkur durumu KORUNUR");
    assert.equal(es.parkurCorrect, 5);
  });

  it("TAM eşikte (6/10) sınav açılır, eşiğin BİR ALTINDA (5/10) 'remedial-start' üretir — sınır testi (desen ARALIKLI, kombo 6'ya HİÇ ULAŞMASIN diye — TOPLAM yolu izole test edilir)", () => {
    const esPass = createExamSystem();
    esPass.setMode("kompresor");
    // en uzun peş peşe seri burada 2 — SADECE toplam eşiği (6) test ediliyor, kombo yolu DEVREYE GİRMİYOR.
    [true, true, false, true, true, false, true, true, false, false].forEach(c => esPass.recordAnswer(c, "medium"));
    assert.equal(esPass.phase, "exam");

    const esFail = createExamSystem();
    esFail.setMode("kompresor");
    let lastFail;
    [true, true, false, true, true, false, false, false, false, false].forEach(c => { lastFail = esFail.recordAnswer(c, "medium"); });
    assert.equal(lastFail.event, "remedial-start");
    assert.equal(esFail.phase, "parkur");
  });
});

describe("createExamSystem() — SINAV: geçme/kalma", () => {
  function toExam(es) {
    playCorrect(es, 6);
    es.acceptEarlyExam();
  }

  it(`${EXAM_CONFIG.EXAM_PASS_COUNT}/${EXAM_CONFIG.EXAM_LENGTH} doğru → 'exam-passed', faz='passed'`, () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    toExam(es);
    let last;
    for (let i = 0; i < EXAM_CONFIG.EXAM_LENGTH; i++) {
      last = es.recordAnswer(i < EXAM_CONFIG.EXAM_PASS_COUNT, "pro");
    }
    assert.equal(last.event, "exam-passed");
    assert.equal(es.phase, "passed");
  });

  it(`${EXAM_CONFIG.EXAM_PASS_COUNT - 1}/${EXAM_CONFIG.EXAM_LENGTH} doğru (bir eksik) → 'exam-failed', parkur DOĞRUDAN sıfırlanır (G48: basit tutuldu — telafi YOK, tekrar sınav YOK)`, () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    toExam(es);
    let last;
    for (let i = 0; i < EXAM_CONFIG.EXAM_LENGTH; i++) {
      last = es.recordAnswer(i < EXAM_CONFIG.EXAM_PASS_COUNT - 1, "pro");
    }
    assert.equal(last.event, "exam-failed");
    assert.equal(es.phase, "parkur", "G48: exam-failed sonrası resetParkur() ile doğrudan parkur başlar — 'failed' fazı yok");
    assert.equal(es.position, 0);
  });

  it("acknowledgePassed() parkuru SIFIRDAN başlatır (yeni bir 10 soruluk koşu)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    toExam(es);
    for (let i = 0; i < EXAM_CONFIG.EXAM_LENGTH; i++) es.recordAnswer(true, "pro");
    assert.equal(es.phase, "passed");
    es.acknowledgePassed();
    assert.equal(es.phase, "parkur");
    assert.equal(es.position, 0);
    assert.equal(es.label(), "Soru 1/10");
  });
});

// G48: telafi artık PARKUR başarısızlığına bağlı (bkz. yukarıdaki "TOPLAM" bloğu —
// "remedial-start" olayı) ve KENDİ pass/fail eşiğine sahip — sınav sistemine
// GERİ dönmez (eski "remedial-exam" fazı tamamen kaldırıldı). Telafi ister
// geçilsin ister geçilmesin, sonucunda parkur SIFIRDAN başlar (resetParkur).
describe("createExamSystem() — TELAFİ: G48 — PARKUR başarısızlığına bağlı, KENDİ eşiği var, sınava DÖNMEZ", () => {
  it(`startRemedial() faz='remedial' yapar, etiket='Telafi 1/${EXAM_CONFIG.REMEDIAL_LENGTH}'`, () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.startRemedial("medium");
    assert.equal(es.phase, "remedial");
    assert.equal(es.remedialTier, "medium");
    assert.equal(es.label(), `Telafi 1/${EXAM_CONFIG.REMEDIAL_LENGTH}`);
  });

  it(`${EXAM_CONFIG.REMEDIAL_PASS_COUNT}/${EXAM_CONFIG.REMEDIAL_LENGTH} doğru → 'remedial-passed', parkur SIFIRLANIR (devam — yeni parkur)`, () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.startRemedial("hard");
    let last;
    for (let i = 0; i < EXAM_CONFIG.REMEDIAL_LENGTH; i++) {
      last = es.recordAnswer(i < EXAM_CONFIG.REMEDIAL_PASS_COUNT, "hard");
    }
    assert.equal(last.event, "remedial-passed");
    assert.equal(es.phase, "parkur");
    assert.equal(es.position, 0, "telafi SONRASI (geçse de) parkur sıfırdan başlar");
    assert.equal(es.label(), "Soru 1/10");
  });

  it(`${EXAM_CONFIG.REMEDIAL_PASS_COUNT - 1}/${EXAM_CONFIG.REMEDIAL_LENGTH} doğru (bir eksik) → 'remedial-failed', parkur YİNE SIFIRLANIR (baştan — telafi de kaybedilirse aynı sonuç, farklı mesaj)`, () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.startRemedial("hard");
    let last;
    for (let i = 0; i < EXAM_CONFIG.REMEDIAL_LENGTH; i++) {
      last = es.recordAnswer(i < EXAM_CONFIG.REMEDIAL_PASS_COUNT - 1, "hard");
    }
    assert.equal(last.event, "remedial-failed");
    assert.equal(es.phase, "parkur");
    assert.equal(es.position, 0);
  });

  it("telafi sırasında questionTier() remedialTier'ı döner, EXAM_DIFFICULTY veya kullanıcı seçimi DEĞİL", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.startRemedial("easy");
    assert.equal(es.questionTier("hard", "pro"), "easy");
  });

  it("retryRemedial artık yok — API'de retryRemedial fonksiyonu BULUNMAMALI (G48: telafi sonrası tekrar sınav akışı kaldırıldı)", () => {
    const es = createExamSystem();
    assert.equal(es.retryRemedial, undefined);
  });
});

describe("createExamSystem() — questionTier() (createQuestion'a HANGİ zorluğun geçeceği)", () => {
  it("faz='parkur' iken KULLANICININ seçtiği zorluk AYNEN döner (sınav müdahale ETMEZ)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    assert.equal(es.questionTier("hard", "pro"), "hard");
  });

  it("faz='exam' iken EXAM_DIFFICULTY döner (kullanıcı seçimi YOK SAYILIR)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    playCorrect(es, 6);
    es.acceptEarlyExam();
    assert.equal(es.questionTier("easy", "pro"), "pro");
  });

  it("faz='remedial' iken remedialTier döner (EXAM_DIFFICULTY DEĞİL)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.startRemedial("medium");
    assert.equal(es.questionTier("hard", "pro"), "medium");
  });
});

describe("createExamSystem() — setMode() mod izolasyonu", () => {
  it("FARKLI bir moda geçmek parkuru SIFIRLAR (bir modun yarım parkuru başka moda SIZMAZ)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    playCorrect(es, 4);
    assert.equal(es.position, 4);
    es.setMode("reverb");
    assert.equal(es.position, 0, "farklı moda geçince pozisyon sıfırlanmalı");
    assert.equal(es.phase, "parkur");
  });

  it("AYNI moda TEKRAR girmek (menüden çıkıp geri dönmek) parkuru KORUR", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    playCorrect(es, 4);
    es.setMode("kompresor"); // aynı mod — resetLENMEMELİ
    assert.equal(es.position, 4);
  });
});

describe("recordTierResult() / getWeakTier() — zayıf ZORLUK KADEMESİ tespiti (task onaylı: Kompresör'ün frekans bölgesi YOK)", () => {
  it("recordTierResult SAF — girdi mutasyona UĞRAMAZ, yeni bir nesne döner", () => {
    const before = { easy: { correct: 1, wrong: 0 } };
    const after = recordTierResult(before, "easy", true);
    assert.notEqual(after, before);
    assert.deepEqual(before, { easy: { correct: 1, wrong: 0 } }, "girdi DEĞİŞMEMELİ");
    assert.deepEqual(after.easy, { correct: 2, wrong: 0 });
  });

  it("recordTierResult yanlış cevabı doğru kademeye 'wrong' olarak ekler, DİĞER kademelere DOKUNMAZ", () => {
    let stats = {};
    stats = recordTierResult(stats, "medium", false);
    stats = recordTierResult(stats, "medium", true);
    stats = recordTierResult(stats, "hard", true);
    assert.deepEqual(stats.medium, { correct: 1, wrong: 1 });
    assert.deepEqual(stats.hard, { correct: 1, wrong: 0 });
  });

  it("getWeakTier YETERSİZ veri (MIN_TIER_SAMPLES altı) olan kademeleri YOK SAYAR, null döner (hiçbiri yeterliyse)", () => {
    const stats = { easy: { correct: 1, wrong: 0 }, medium: { correct: 0, wrong: 1 } };
    assert.equal(getWeakTier(stats), null);
  });

  it("getWeakTier EN DÜŞÜK doğrulukla (VE yeterli örnekle, EN AZ İKİ ADAY varken) kademeyi döner", () => {
    const stats = {
      easy: { correct: 16, wrong: 2 },   // 18 örnek, %89
      medium: { correct: 4, wrong: 10 }, // 14 örnek, %29 — EN ZAYIF
      hard: { correct: 10, wrong: 4 }    // 14 örnek, %71
    };
    const weak = getWeakTier(stats);
    assert.equal(weak.tier, "medium");
    assert.ok(Math.abs(weak.accuracy - 2 / 7) < 1e-9);
  });

  it("tierStats HİÇ yoksa (yeni kullanıcı) null döner — çağıran taraf makul bir varsayılana (ör. 'medium') düşmeli", () => {
    assert.equal(getWeakTier({}), null);
    assert.equal(getWeakTier(null), null);
    assert.equal(getWeakTier(undefined), null);
  });

  it("'proplus' zayıf-kademe aramasına HİÇ dahil edilmez (TIER_ORDER'da yok — ayrı/özel bir mod, Z5 kararı)", () => {
    const stats = { proplus: { correct: 0, wrong: 10 } }; // %0 ama TIER_ORDER'da yok
    assert.equal(getWeakTier(stats), null, "proplus TEK veri kaynağıysa null dönmeli, onu 'zayıf' seçmemeli");
  });

  // G319 (OLCUM-ZAYIF-KADEME-19-08) — asıl kanıtlanan bug: tek aday, isabeti
  // %100 OLSA BİLE, KARŞILAŞTIRACAK ikinci bir kademe yokken "zayıf"
  // SAYILAMAZ. DÜZELTME ÖNCESİ bu test KIRMIZI yanardı (weak.tier==="easy"
  // dönerdi).
  it("G319 — TEK kademe MIN_TIER_SAMPLES'ı karşılasa (hatta %100 doğru olsa) BİLE, karşılaştıracak İKİNCİ aday yoksa null döner", () => {
    const perfectButAlone = { easy: { correct: 10, wrong: 0 } }; // 10 örnek, %100 doğru
    assert.equal(getWeakTier(perfectButAlone), null, "tek aday, isabeti %100 olsa bile 'zayıf' İLAN EDİLMEMELİ");

    const mediocreButAlone = { easy: { correct: 6, wrong: 4 } }; // 10 örnek, %60
    assert.equal(getWeakTier(mediocreButAlone), null, "tek aday HÂLÂ karşılaştırmasız — null dönmeli");
  });

  it("G319 — İKİ kademe var ama biri MIN_TIER_SAMPLES'ın (10) ALTINDAYSA yine null döner (tek GEÇERLİ aday kalır)", () => {
    const stats = {
      easy: { correct: 8, wrong: 1 },  // 9 örnek — EŞİĞİN 1 ALTINDA, adaylığa GİRMEZ
      medium: { correct: 2, wrong: 8 } // 10 örnek — eşiği karşılıyor, TEK geçerli aday
    };
    assert.equal(getWeakTier(stats), null, "9 örnekli kademe adaylığa girmemeli, TEK kalan aday karşılaştırmasız 'zayıf' sayılmamalı");
  });

  it("G319 — İKİ kademe de TAM SINIRDA (10 örnek) yeterliyse GERÇEK karşılaştırma yapılır", () => {
    const stats = {
      easy: { correct: 9, wrong: 1 },  // 10 örnek, %90
      medium: { correct: 3, wrong: 7 } // 10 örnek, %30 — EN ZAYIF
    };
    const weak = getWeakTier(stats);
    assert.equal(weak.tier, "medium", "tam eşikte (10 örnek) bile İKİ aday varsa gerçek karşılaştırma çalışmalı");
  });
});

// G304 (OLCUM-CIHAZ3-18-08'in ardından cihazda bulundu) — app.js:renderGameHeader()'ın
// sınav/telafi nokta çizimi ÖNCEDEN examCorrect/remedialCorrect SAYAÇLARINA
// bakıyordu (i<correctCount→altın, i<current→kırmızı) — SIRA bilgisi hiç
// TUTULMUYORDU, "önce N doğru, sonra kalan yanlış" çiziyordu. examResults/
// remedialResults (challenge.results[]'un G276'daki AYNI deseni) artık HER
// pozisyonun GERÇEK cevabını SIRAYLA tutuyor.
describe("createExamSystem() — G304: examResults/remedialResults SIRAYI koruyor (challenge.results[]'un AYNI deseni)", () => {
  it("sınavda YANLIŞ-DOĞRU-YANLIŞ sırası examResults'ta AYNEN korunuyor (başa toplanmıyor)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    playCorrect(es, 6);
    es.acceptEarlyExam();
    assert.deepEqual(es.examResults, [], "sınav başında boş olmalı");
    // EXAM_LENGTH=4 — son (4.) cevaptan ÖNCE kontrol edilir, aksi halde
    // sınav biter (resetParkur examResults'ı sıfırlar, ayrı bir test bunu
    // zaten doğruluyor).
    es.recordAnswer(false, "hard");
    es.recordAnswer(true, "hard");
    es.recordAnswer(false, "hard");
    assert.deepEqual(es.examResults, [false, true, false], "SIRA korunmalı — [true,false,false] gibi 'başa toplanmış' bir dizi DEĞİL");
  });

  it("telafide sıra AYNI şekilde korunuyor", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.startRemedial("medium");
    assert.deepEqual(es.remedialResults, [], "telafi başında boş olmalı");
    es.recordAnswer(true, "medium");
    es.recordAnswer(true, "medium");
    es.recordAnswer(false, "medium");
    assert.deepEqual(es.remedialResults, [true, true, false]);
  });

  it("acceptEarlyExam() examResults'ı sıfırlıyor (önceki parkurdan kalıntı sızmıyor)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    playCorrect(es, 6);
    es.acceptEarlyExam();
    es.recordAnswer(false, "hard");
    assert.equal(es.examResults.length, 1);
    // Sınavı kaybettir, YENİ bir parkur+erken-sınav teklifiyle tekrar 'exam'e gir.
    es.recordAnswer(false, "hard");
    es.recordAnswer(false, "hard");
    es.recordAnswer(false, "hard"); // 4/4, hepsi yanlış → exam-failed, resetParkur zaten çağrılır
    assert.deepEqual(es.examResults, [], "resetParkur SONRASI examResults BOŞ olmalı");
  });

  it("parkur TOPLAM eşiğiyle 'exam-start' olduğunda da examResults sıfırlanıyor", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    const pattern = [true, false, true, false, true, false, true, false, true, true];
    pattern.forEach(c => es.recordAnswer(c, "medium"));
    assert.equal(es.phase, "exam");
    assert.deepEqual(es.examResults, []);
  });

  it("startRemedial() remedialResults'ı sıfırlıyor", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.startRemedial("medium");
    es.recordAnswer(true, "medium");
    assert.equal(es.remedialResults.length, 1);
    es.startRemedial("hard"); // yeni bir telafi turu (teorik olarak yeniden çağrılabilir)
    assert.deepEqual(es.remedialResults, []);
  });
});

// G324 — "Atla" nötr (ne doğru ne yanlış) sayılsın diye recordAnswer() YENİ,
// isteğe bağlı üçüncü bir `skipped` parametresi aldı. KABUL KRİTERİ: SADECE
// examResults/remedialResults'a "skip" işareti yazılır — examCorrect/
// examIndex/remedialCorrect/remedialIndex sayaçları VE geçme eşiği FORMÜLÜ
// (`correct` HÂLÂ false geçiriliyor) TEK SATIR değişmedi (DOKUNULMAYACAK:
// "atlamanın yanlış cevap sayılması XP/sınav/istatistik açısından
// DEĞİŞMEYECEK — sadece görsel").
describe("createExamSystem() — G324: recordAnswer(correct, tier, skipped) 'skip' işareti (SADECE görsel)", () => {
  it("skipped=true examResults'a 'skip' yazar, true/false YAZMAZ", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    playCorrect(es, 6);
    es.acceptEarlyExam();
    es.recordAnswer(false, "hard", true);
    assert.deepEqual(es.examResults, ["skip"]);
  });

  it("skipped=true remedialResults'a 'skip' yazar", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.startRemedial("medium");
    es.recordAnswer(true, "medium");
    es.recordAnswer(false, "medium", true);
    assert.deepEqual(es.remedialResults, [true, "skip"]);
  });

  it("skipped=true examCorrect/examIndex'i YANLIŞ cevapla AYNI şekilde ilerletir (sayaçlar DEĞİŞMEDİ)", () => {
    const withSkip = createExamSystem();
    withSkip.setMode("kompresor");
    playCorrect(withSkip, 6);
    withSkip.acceptEarlyExam();
    withSkip.recordAnswer(false, "hard", true);

    const withWrong = createExamSystem();
    withWrong.setMode("kompresor");
    playCorrect(withWrong, 6);
    withWrong.acceptEarlyExam();
    withWrong.recordAnswer(false, "hard");

    assert.equal(withSkip.examIndex, withWrong.examIndex);
    assert.equal(withSkip.examCorrect, withWrong.examCorrect);
  });

  it("skipped parametresi VERİLMEZSE (mevcut TÜM çağıranlar) davranış AYNEN eskisi gibi — true/false yazılır", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    playCorrect(es, 6);
    es.acceptEarlyExam();
    es.recordAnswer(true, "hard");
    es.recordAnswer(false, "hard");
    assert.deepEqual(es.examResults, [true, false]);
  });
});

// G307 (OLCUM-KESINTI-18-08 B1-B4 + OLCUM-SINAV-MIMARI-18-08) — examSystem
// artık mod-başına AYRI durum tutuyor (perModeState, İÇ bir Map) — DIŞ API
// (yukarıdaki 36 test) TEK SATIR değişmedi, bu describe SADECE YENİ
// eklenen çok-modlu davranışı + snapshot round-trip'i test ediyor.
describe("createExamSystem() — G307: mod-başına AYRI durum (perModeState) + tam-oturum snapshot", () => {
  it("B1/B4: telafiye ulaşılan moddan BAŞKA moda geçilip GERİ dönülünce telafi KORUNUYOR (ÖNCEDEN siliniyordu)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.startRemedial("medium");
    es.recordAnswer(true, "medium");
    es.recordAnswer(false, "medium");
    assert.equal(es.phase, "remedial");
    assert.equal(es.remedialIndex, 2);
    assert.deepEqual(es.remedialResults, [true, false]);

    // BAŞKA bir moda geç — DÜZELTME ÖNCESİ bu, telafiyi SİLERDİ.
    es.setMode("boost-mu-cut-mu");
    assert.equal(es.phase, "parkur", "yeni mod TEMİZ bir parkurla başlamalı (kirlenme yok)");
    assert.equal(es.position, 0);

    // Kompresör'e GERİ dön — telafi AYNEN korunmuş olmalı.
    es.setMode("kompresor");
    assert.equal(es.phase, "remedial", "KABUL KRİTERİ — telafi fazı korunmalıydı");
    assert.equal(es.remedialIndex, 2, "KABUL KRİTERİ — telafi sorusu sayısı korunmalıydı");
    assert.deepEqual(es.remedialResults, [true, false], "KABUL KRİTERİ — telafi SIRASI korunmalıydı");
  });

  it("B4: İKİ modun durumu AYNI ANDA, birbirini EZMEDEN korunuyor", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.recordAnswer(true, "medium");
    es.recordAnswer(true, "medium");
    assert.equal(es.position, 2);

    es.setMode("boost-mu-cut-mu");
    es.recordAnswer(false, "medium");
    assert.equal(es.position, 1);

    es.setMode("kompresor");
    assert.equal(es.position, 2, "Kompresör'ün pozisyonu Boost mu Cut mu'nun cevaplarından ETKİLENMEMELİ");
    assert.equal(es.parkurCorrect, 2);

    es.setMode("boost-mu-cut-mu");
    assert.equal(es.position, 1, "Boost mu Cut mu'nun pozisyonu Kompresör'ün cevaplarından ETKİLENMEMELİ");
    assert.equal(es.parkurCorrect, 0);
  });

  it("getFullSnapshot()/restoreFullSnapshot() ile TAM bir oturum round-trip yapılabiliyor (B2/B3 — uygulama kapanıp açılma)", () => {
    const es1 = createExamSystem();
    es1.setMode("kompresor");
    es1.startRemedial("medium");
    es1.recordAnswer(true, "medium");
    es1.setMode("boost-mu-cut-mu");
    es1.recordAnswer(true, "medium");
    es1.recordAnswer(false, "medium");

    const snapshot = es1.getFullSnapshot();
    assert.ok(snapshot.kompresor, "aktif OLMAYAN (kompresor, en son terk edilen) mod snapshot'ta OLMALI");
    assert.ok(snapshot["boost-mu-cut-mu"], "AKTİF mod (henüz perModeState'e hiç yazılmamış olabilir) snapshot'ta OLMALI — snapshotActive() ile GÜNCEL hâli yansımalı");
    assert.equal(snapshot.kompresor.phase, "remedial");
    assert.equal(snapshot["boost-mu-cut-mu"].position, 2);

    // YENİ bir examSystem — "uygulama yeniden açıldı" simülasyonu.
    const es2 = createExamSystem();
    es2.restoreFullSnapshot(snapshot);
    // restoreFullSnapshot() AKTİF duruma dokunmamalı — henüz setMode() çağrılmadı.
    assert.equal(es2.phase, "parkur", "restoreFullSnapshot() aktif duruma dokunmamalı, sadece perModeState'i doldurmalı");

    es2.setMode("kompresor");
    assert.equal(es2.phase, "remedial", "KABUL KRİTERİ — snapshot'tan restore edilen telafi fazı DOĞRU");
    assert.equal(es2.remedialIndex, 1);

    es2.setMode("boost-mu-cut-mu");
    assert.equal(es2.position, 2, "KABUL KRİTERİ — snapshot'tan restore edilen İKİNCİ modun durumu da DOĞRU");
    assert.deepEqual(es2.examResults, [], "restore edilen modun HİÇ dokunulmayan alanları (examResults) makul varsayılanda kalmalı");
  });

  it("restoreFullSnapshot(): eksik/bozuk alanlar (ESKİ ya da bozuk kayıt) sessizce YOK SAYILIR, çökme YOK", () => {
    const es = createExamSystem();
    assert.doesNotThrow(() => es.restoreFullSnapshot(null));
    assert.doesNotThrow(() => es.restoreFullSnapshot(undefined));
    assert.doesNotThrow(() => es.restoreFullSnapshot("bozuk-string"));
    assert.doesNotThrow(() => es.restoreFullSnapshot({ kompresor: { phase: "remedial" } })); // eksik alanlarla
    es.setMode("kompresor");
    assert.equal(es.phase, "remedial");
    assert.equal(es.position, 0, "snapshot'ta OLMAYAN alanlar (position) makul varsayılana (0) düşmeli");
  });

  it("setMode() İLK çağrıda (modeId henüz null) perModeState'e YAZMAYA ÇALIŞMAZ, çökme YOK", () => {
    const es = createExamSystem();
    assert.doesNotThrow(() => es.setMode("kompresor"));
    assert.equal(es.phase, "parkur");
  });

  it("clearAll() — TÜM modların (kaydedilmiş + aktif) durumunu sıfırlıyor (İlerlemeyi sıfırla)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.startRemedial("medium");
    es.setMode("boost-mu-cut-mu");
    es.recordAnswer(true, "medium");

    es.clearAll();
    assert.equal(es.phase, "parkur", "aktif (boost-mu-cut-mu) durum sıfırlanmalı");
    assert.equal(es.position, 0);

    es.setMode("kompresor");
    assert.equal(es.phase, "parkur", "KABUL KRİTERİ — kaydedilmiş (kompresor) durum da sıfırlanmalı, telafi GERİ GELMEMELİ");
  });
});

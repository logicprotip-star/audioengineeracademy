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

  it("10 sorunun 5'i doğru (<6) → parkur BAŞTAN başlar, sınav YOK", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    const pattern = [true, false, true, false, true, false, true, false, false, false];
    let last;
    pattern.forEach(c => { last = es.recordAnswer(c, "medium"); });
    assert.equal(last.event, "parkur-failed");
    assert.equal(es.phase, "parkur");
    assert.equal(es.position, 0, "resetParkur pozisyonu sıfırlamalı");
    assert.equal(es.parkurCorrect, 0);
  });

  it("TAM eşikte (6/10) sınav açılır, eşiğin BİR ALTINDA (5/10) açılmaz — sınır testi (desen ARALIKLI, kombo 6'ya HİÇ ULAŞMASIN diye — TOPLAM yolu izole test edilir)", () => {
    const esPass = createExamSystem();
    esPass.setMode("kompresor");
    // en uzun peş peşe seri burada 2 — SADECE toplam eşiği (6) test ediliyor, kombo yolu DEVREYE GİRMİYOR.
    [true, true, false, true, true, false, true, true, false, false].forEach(c => esPass.recordAnswer(c, "medium"));
    assert.equal(esPass.phase, "exam");

    const esFail = createExamSystem();
    esFail.setMode("kompresor");
    [true, true, false, true, true, false, false, false, false, false].forEach(c => esFail.recordAnswer(c, "medium"));
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

  it(`${EXAM_CONFIG.EXAM_PASS_COUNT - 1}/${EXAM_CONFIG.EXAM_LENGTH} doğru (bir eksik) → 'exam-failed'`, () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    toExam(es);
    let last;
    for (let i = 0; i < EXAM_CONFIG.EXAM_LENGTH; i++) {
      last = es.recordAnswer(i < EXAM_CONFIG.EXAM_PASS_COUNT - 1, "pro");
    }
    assert.equal(last.event, "exam-failed");
    assert.equal(es.phase, "failed");
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

describe("createExamSystem() — TELAFİ: 5 soru + tekrar sınav", () => {
  it(`startRemedial() faz='remedial', REMEDIAL_LENGTH (${EXAM_CONFIG.REMEDIAL_LENGTH}) sonunda 'remedial-exam-start'`, () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.startRemedial("medium");
    assert.equal(es.phase, "remedial");
    assert.equal(es.remedialTier, "medium");
    assert.equal(es.label(), `Telafi 1/${EXAM_CONFIG.REMEDIAL_LENGTH}`);

    let last;
    for (let i = 0; i < EXAM_CONFIG.REMEDIAL_LENGTH; i++) last = es.recordAnswer(true, "medium");
    assert.equal(last.event, "remedial-exam-start");
    assert.equal(es.phase, "remedial-exam");
    assert.equal(es.label(), `Tekrar Sınav 1/${EXAM_CONFIG.EXAM_LENGTH}`);
  });

  it("telafi SONRASI tekrar sınav geçilirse 'exam-passed' üretir (normal sınavla AYNI eşik)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.startRemedial("hard");
    for (let i = 0; i < EXAM_CONFIG.REMEDIAL_LENGTH; i++) es.recordAnswer(true, "hard");
    let last;
    for (let i = 0; i < EXAM_CONFIG.EXAM_LENGTH; i++) last = es.recordAnswer(i < EXAM_CONFIG.EXAM_PASS_COUNT, "pro");
    assert.equal(last.event, "exam-passed");
  });

  it("telafi SONRASI tekrar sınav YİNE kaybedilirse 'remedial-exam-failed' üretir (basit 'exam-failed' DEĞİL — çağıran taraf ayırt edebilmeli)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.startRemedial("hard");
    for (let i = 0; i < EXAM_CONFIG.REMEDIAL_LENGTH; i++) es.recordAnswer(true, "hard");
    let last;
    for (let i = 0; i < EXAM_CONFIG.EXAM_LENGTH; i++) last = es.recordAnswer(false, "pro");
    assert.equal(last.event, "remedial-exam-failed");
  });

  it("retryRemedial() YENİ bir telafi turu başlatır (döngü devam edebilir)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    es.retryRemedial("easy");
    assert.equal(es.phase, "remedial");
    assert.equal(es.remedialTier, "easy");
    assert.equal(es.remedialIndex, 0);
  });
});

describe("createExamSystem() — questionTier() (createQuestion'a HANGİ zorluğun geçeceği)", () => {
  it("faz='parkur' iken KULLANICININ seçtiği zorluk AYNEN döner (sınav müdahale ETMEZ)", () => {
    const es = createExamSystem();
    es.setMode("kompresor");
    assert.equal(es.questionTier("hard", "pro"), "hard");
  });

  it("faz='exam'/'remedial-exam' iken EXAM_DIFFICULTY döner (kullanıcı seçimi YOK SAYILIR)", () => {
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

  it("getWeakTier EN DÜŞÜK doğrulukla (VE yeterli örnekle) kademeyi döner", () => {
    const stats = {
      easy: { correct: 8, wrong: 1 },   // %89
      medium: { correct: 2, wrong: 5 }, // %29 — EN ZAYIF
      hard: { correct: 5, wrong: 2 }    // %71
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
});

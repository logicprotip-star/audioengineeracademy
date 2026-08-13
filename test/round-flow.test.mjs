// round-flow.js testleri (G14 odaklı) — "karşılaştırma dinletmesi bitince otomatik
// geçiş yeniden kurulup devam ediyor mu" davranışının altındaki SAF zamanlayıcı
// motorunu doğrudan test eder. app.js'teki gerçek akış (#freqInfo .cmp butonları)
// bu ilkel üzerine kurulu: cevap sonrası ensureAutoNext() ile bir sayaç kurulur,
// karşılaştırma butonuna basılınca captureRemainingAndClear() ile kalan süre
// yakalanıp sayaç iptal edilir (dinlerken soru DEĞİŞMEZ), önizleme bitince o kalan
// süreyle ensureAutoNext() TEKRAR çağrılır (bkz. app.js .cmp click handler'ındaki
// cmpPreviewStopTimer bloğu). Burada gerçek zamanlayıcılar node:test'in mock.timers'ı
// ile sahteleniyor — gerçek setTimeout beklemeden deterministik test.

import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { createRoundFlow } from "../www/js/core/round-flow.js";

function makeFlow(onAdvance) {
  return createRoundFlow({
    onTimerTick: () => {},
    onTimeUp: () => {},
    onAutoAdvanceLabel: () => {},
    onAdvance: onAdvance || (() => {})
  });
}

describe("round-flow.js — otomatik geçişin karşılaştırma dinletmesi sonrası yeniden kurulması (G14)", () => {
  it("ensureAutoNext(): süre dolunca onAdvance BİR KEZ çağrılır", () => {
    mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"] });
    try {
      let calls = 0;
      const flow = makeFlow(() => { calls++; });
      flow.ensureAutoNext(3000, "Sonraki");
      mock.timers.tick(2999);
      assert.equal(calls, 0);
      mock.timers.tick(1);
      assert.equal(calls, 1);
      mock.timers.tick(10000);
      assert.equal(calls, 1); // tek seferlik, tekrar tetiklenmez
    } finally {
      mock.timers.reset();
    }
  });

  it("captureRemainingAndClear(): dinletmeye başlarken kalan süreyi doğru yakalar VE zamanlayıcıyı iptal eder (dinlerken soru değişmez)", () => {
    mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"] });
    try {
      let calls = 0;
      const flow = makeFlow(() => { calls++; });
      flow.ensureAutoNext(6000, "Sonraki"); // yanlış cevap penceresi (F2: 6sn)
      mock.timers.tick(2000); // kullanıcı 2sn sonra karşılaştırma butonuna basıyor
      const remaining = flow.captureRemainingAndClear();
      assert.ok(Math.abs(remaining - 4000) < 50, `beklenen ~4000, alınan ${remaining}`);
      // Yakalandıktan sonra ZAMAN NE KADAR GEÇERSE GEÇSİN (dinletme uzun sürse bile)
      // otomatik geçiş TETİKLENMEMELİ — soru dinlerken değişmemeli.
      mock.timers.tick(60000);
      assert.equal(calls, 0);
    } finally {
      mock.timers.reset();
    }
  });

  it("dinletme bitince yakalanan kalan süreyle ensureAutoNext() TEKRAR çağrılırsa, o süre sonunda onAdvance tetiklenir", () => {
    mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"] });
    try {
      let calls = 0;
      const flow = makeFlow(() => { calls++; });
      flow.ensureAutoNext(6000, "Sonraki");
      mock.timers.tick(2000);
      const remaining = flow.captureRemainingAndClear(); // ~4000ms
      // ... dinletme çalıyor (gerçek app.js'te previewMs kadar) ...
      mock.timers.tick(20000); // dinletme süresi — ne kadar sürerse sürsün fark etmez
      assert.equal(calls, 0); // hâlâ tetiklenmedi (yeniden kurulmadı)
      flow.ensureAutoNext(remaining, "Sonraki"); // dinletme BİTTİ, kalan süreyle yeniden kur
      mock.timers.tick(remaining - 1);
      assert.equal(calls, 0);
      mock.timers.tick(1);
      assert.equal(calls, 1, "yeniden kurulan zamanlayıcı süresi dolunca sıradaki soruya geçmeli");
    } finally {
      mock.timers.reset();
    }
  });

  it("birden fazla dinletme art arda: her yeni ensureAutoNext() ÖNCEKİ bekleyen zamanlayıcıyı iptal eder — SADECE SONUNCUSU sayılır", () => {
    // app.js'teki .cmp handler'ı her dinletme sonunda (cmpPreviewStopTimer ateşlendiğinde)
    // ensureAutoNext(remain) çağırır; kullanıcı ard arda 3 farklı karşılaştırma butonuna
    // basarsa bu 3 kez olur — clearAutoAdvance() (ensureAutoNext'in İÇİNDE, en başta
    // çağrılıyor) önceki bekleyen zamanlayıcıyı SESSİZCE iptal eder, çift tetikleme olmaz.
    mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"] });
    try {
      let calls = 0;
      const flow = makeFlow(() => { calls++; });
      flow.ensureAutoNext(4000, "Sonraki"); // 1. dinletme sonrası kurulan
      mock.timers.tick(1000);
      flow.ensureAutoNext(4000, "Sonraki"); // 2. dinletme sonrası — 1.yi iptal eder
      mock.timers.tick(1000);
      flow.ensureAutoNext(4000, "Sonraki"); // 3. (son) dinletme sonrası — 2.yi iptal eder
      mock.timers.tick(3999);
      assert.equal(calls, 0);
      mock.timers.tick(1);
      assert.equal(calls, 1, "sadece EN SON ensureAutoNext() çağrısı sayılmalı");
      mock.timers.tick(10000);
      assert.equal(calls, 1, "önceki iptal edilen zamanlayıcılar asla ateşlenmemeli");
    } finally {
      mock.timers.reset();
    }
  });

  it("captureRemainingAndClear(): bekleyen zamanlayıcı yoksa null döner (çökmez)", () => {
    const flow = makeFlow();
    assert.equal(flow.captureRemainingAndClear(), null);
  });

  it("clearAutoAdvance(): kurulu bir zamanlayıcıyı iptal eder, onAdvance hiç tetiklenmez", () => {
    mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"] });
    try {
      let calls = 0;
      const flow = makeFlow(() => { calls++; });
      flow.ensureAutoNext(1000, "Sonraki");
      flow.clearAutoAdvance();
      mock.timers.tick(5000);
      assert.equal(calls, 0);
    } finally {
      mock.timers.reset();
    }
  });
});

describe("round-flow.js — stopAll() timeLeft/roundDuration'ı SIFIRLAMAZ (G176, Bug 19)", () => {
  // app.js:enterMode() SADECE mod DEĞİŞTİĞİNDE roundFlow.stopAll() çağırıp
  // ardından updateTimerUI(0,0) ile EKRANI idle değerine döndürür (bkz. o
  // fonksiyondaki G176 notu) — roundFlow'un KENDİ timeLeft/roundDuration'ına
  // BİLEREK dokunmaz, çünkü AYNI modda "Tekrar Çal" (autoStopped akışı)
  // kaldığı saniyeden devam etmeyi bu değerlerin KORUNMASINA borçlu (bkz.
  // round-flow.js:36 yorumu, DURUM.md'nin LOCKED listesindeki "Aynı modda
  // Tekrar Çal süre devamlılığı"). Bu test o davranışı SAF motor seviyesinde
  // doğruluyor — biri stopAll()'a bir reset eklerse (timeLeft=0 gibi), hem
  // bu test hem "Tekrar Çal" özelliği aynı anda kırılır.
  it("startTimer() sonrası stopAll() çağrılınca timeLeft/roundDuration AYNEN kalır", () => {
    mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"] });
    try {
      const flow = makeFlow();
      flow.startTimer(15);
      mock.timers.tick(2500); // 2.5sn geçti — timeLeft ~12.5
      const timeLeftBefore = flow.timeLeft;
      const durationBefore = flow.roundDuration;
      assert.ok(timeLeftBefore > 0 && timeLeftBefore < 15, "süre gerçekten azalmış olmalı (sahte veri değil)");
      flow.stopAll();
      assert.equal(flow.timeLeft, timeLeftBefore, "stopAll() timeLeft'i DEĞİŞTİRMEMELİ (Tekrar Çal bunu okuyor)");
      assert.equal(flow.roundDuration, durationBefore, "stopAll() roundDuration'ı DEĞİŞTİRMEMELİ");
    } finally {
      mock.timers.reset();
    }
  });

  it("stopAll() sonrası interval GERÇEKTEN durur (timeLeft korunuyor OLMASI, hâlâ AZALIYOR anlamına gelmez)", () => {
    mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"] });
    try {
      const flow = makeFlow();
      flow.startTimer(10);
      mock.timers.tick(1000);
      flow.stopAll();
      const frozen = flow.timeLeft;
      mock.timers.tick(5000); // stopAll sonrası zaman geçse de artık tetiklenen interval yok
      assert.equal(flow.timeLeft, frozen, "stopAll() sonrası timeLeft artık AKMAMALI");
    } finally {
      mock.timers.reset();
    }
  });
});

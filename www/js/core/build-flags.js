// G239 (BEYAN-DENETIM-15-08 bulgusu 🔴) — TEK yayın bayrağı. Kod içinde
// başka HİÇBİR "true/false elle çevir" sabiti KALMADI — AD_TEST_MODE
// (core/ads.js), tanı logları (app.js:audioDiagLog/uploadDiagLog,
// core/upload.js:uploadDiagLog, core/audio-engine.js:audioDiagLog) ve
// test kancaları (window.__aeaShowSessionEndForTest/__tonalDebugState/
// __tonalRefVerify) HEPSİ buradan türüyor — iki ayrı elle-değiştirilen
// bayrağın (AD_TEST_MODE + "43 tanı logu hep açık") unutma riskini
// AYRI AYRI taşıması yerine TEK bir yerden yönetiliyor.
//
// DEV_MODE=true — repo'nun HER ZAMAN COMMITTED hâli (geliştirme/TestFlight):
// AdMob test birimleri kullanılır (kendi reklamına tıklama = hesap kapatma
// riski YOK), tanı logları basılır, test kancaları kurulur — npm test/
// npm run test:e2e BU HÂLDE çalışır (e2e, kancalara bağlı — bkz. altta).
//
// DEV_MODE=false — SADECE App Store Archive'ından HEMEN ÖNCE, TEK satır
// elle flip edilir, Archive alınır, HEMEN geri true'ya alınır — bu hâl
// repo'ya KOMMİT EDİLMEZ. Bu hâldeyken npm test/npm run test:e2e
// BİLEREK KIRMIZI ÇIKAR (tripwire, tesadüf değil):
//   1) test/build-flags.test.mjs DEV_MODE'un true olmasını DOĞRUDAN
//      zorluyor — yanlışlıkla false commit edilirse npm test EN BAŞTA,
//      e2e'ye bile gerek kalmadan kırmızı çıkar.
//   2) e2e/layout-geometry.spec.mjs `window.__aeaShowSessionEndForTest`ın
//      VARLIĞINI `assert.equal(hookAvailable, true, ...)` ile doğruluyor
//      — hook DEV_MODE=false'ta hiç kurulmadığı için bu da kırmızı çıkar.
// Bu İKİLİ tripwire, "belgeye 'unutma' notu yaz" yönteminin YERİNE geçiyor
// (task'ın kendi kararı: "bugün belgeler beş kez yanıldı").
export const DEV_MODE = true;

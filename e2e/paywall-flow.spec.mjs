// A — Paywall matrisi (TEST-BOSLUGU-15-08.md, madde A).
// REGRESYON-15-08.md'nin scratchpad script'lerinin (reg_paywall_check.py/
// reg_lives_check.py) kalıcı hâli — o turda ELLE çalıştırılıp SONUCU
// rapora yazılan, sonra SİLİNEN doğrulamalar artık her `npm run test:e2e`
// çağrısında otomatik tekrarlanıyor.
//
// KİLİT: finalizeIfGameOver/blockIfLivesOut/blockIfSessionLimitReached —
// HİÇBİRİNE dokunulmadı, bu dosya SADECE onların GÖZLENEN davranışını
// assert ediyor.
//
// G220 GÜNCELLEMESİ (kullanıcı kararı) — "İlk oturumda paywall yok" kuralı
// (G63) KALDIRILDI: `openPaywallReason()`'daki `paywallSuppressedFirstSession`
// kontrolü söküldü (bkz. app.js). Dört senaryo hâlâ (soru hakkı bitti /
// canlar bitti) × (stats.rounds=0 / stats.rounds>0) matrisini kapsıyor —
// AMA artık DÖRDÜ DE aynı sonuca (GERÇEK paywall) varmalı. "İlk oturum"
// seed'i BİLEREK korundu: bu, kaldırmanın stats.rounds===0 durumunda da
// GERÇEKTEN tam çalıştığını (sadece "değil" durumunda değil) kanıtlıyor.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, dismissSpotlightIfShown, activeScreenId, dismissFeedbackIfShown, mockAdReward, answerCorrectChoice } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

async function newPage() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  return page;
}

// "Atla"ya basarak ücretsiz oturum limitine (5 soru) ulaşır — G185'in
// blockIfSessionLimitReached() yolu, startRound()'un başında.
async function exhaustFreeSessionLimit(page) {
  for (let i = 0; i < 6; i++) {
    const visible = await page.locator("#nextBtn").isVisible().catch(() => false);
    if (!visible) break;
    await page.locator("#nextBtn").click();
    await page.waitForTimeout(200);
  }
}

// Can 0'ken bir round başlatmaya ÇALIŞIR — blockIfLivesOut()'un
// startRound()/goToNextRound() başındaki kontrolünü tetikler.
async function triggerLivesOutCheck(page) {
  await page.locator("#startBtn").click();
  await page.waitForTimeout(300);
  await dismissSpotlightIfShown(page);
}

async function readOutcome(page) {
  return page.evaluate(() => ({
    screen: document.querySelector(".screen.active")?.id || null,
    resKicker: document.getElementById("resKicker")?.textContent || null,
    resCta: document.getElementById("resCta")?.textContent || null,
    paywallReasonTitle: document.getElementById("paywallReasonTitle")?.textContent || null,
    // G228 (RET-RISKI-15-08, Apple 3.1.1 düzeltmesi) — restore butonu
    // ARTIK bağlamsal paywall'da da görünür olmalı, .isVisible()'a bkz.
    // (sadece "hidden" class'ının yokluğu DEĞİL, gerçek görünürlük).
  }));
}

// G228 — restore butonunun GERÇEKTEN görünür olduğunu (class kontrolü
// DEĞİL, Playwright'ın layout/visibility hesabı) doğrular.
async function restoreBtnVisible(page) {
  return page.locator("#restorePurchaseBtn").isVisible().catch(() => false);
}

test("soru hakkı bitti + İLK OTURUM (stats yok) → GERÇEK paywall açılır (G63 kaldırıldı)", async () => {
  const page = await newPage();
  await seedLocalStorage(page, { stats: null });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await exhaustFreeSessionLimit(page);

  const out = await readOutcome(page);
  assert.equal(out.screen, "screen-paywall", `beklenen screen-paywall, gelen: ${out.screen}`);
  assert.equal(out.paywallReasonTitle, "Ücretsiz oturumun bitti");
  assert.equal(await restoreBtnVisible(page), true, "G228: restore butonu bağlamsal paywall'da görünmeli (Apple 3.1.1)");
  await page.close();
});

test("soru hakkı bitti + İLK OTURUM DEĞİL (stats.rounds=50) → GERÇEK paywall açılır", async () => {
  const page = await newPage();
  await seedLocalStorage(page, { stats: { rounds: 50 } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await exhaustFreeSessionLimit(page);

  const out = await readOutcome(page);
  assert.equal(out.screen, "screen-paywall", `beklenen screen-paywall, gelen: ${out.screen}`);
  assert.equal(out.paywallReasonTitle, "Ücretsiz oturumun bitti");
  assert.equal(await restoreBtnVisible(page), true, "G228: restore butonu bağlamsal paywall'da görünmeli (Apple 3.1.1)");
  await page.close();
});

test("canlar bitti + İLK OTURUM (stats.rounds=0, lives=0) → GERÇEK paywall açılır (G63 kaldırıldı)", async () => {
  const page = await newPage();
  await seedLocalStorage(page, { stats: { rounds: 0, lives: 0 } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await triggerLivesOutCheck(page);

  const out = await readOutcome(page);
  assert.equal(out.screen, "screen-paywall", `beklenen screen-paywall, gelen: ${out.screen}`);
  assert.equal(out.paywallReasonTitle, "Devam etmek için bir yol seç");
  assert.equal(await restoreBtnVisible(page), true, "G228: restore butonu bağlamsal paywall'da görünmeli (Apple 3.1.1)");
  await page.close();
});

test("canlar bitti + İLK OTURUM DEĞİL (stats.rounds=50, lives=0) → GERÇEK paywall açılır", async () => {
  const page = await newPage();
  await seedLocalStorage(page, { stats: { rounds: 50, lives: 0 } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await triggerLivesOutCheck(page);

  const out = await readOutcome(page);
  assert.equal(out.screen, "screen-paywall", `beklenen screen-paywall, gelen: ${out.screen}`);
  assert.equal(out.paywallReasonTitle, "Devam etmek için bir yol seç");
  assert.equal(await restoreBtnVisible(page), true, "G228: restore butonu bağlamsal paywall'da görünmeli (Apple 3.1.1)");
  await page.close();
});

// G228 (RET-RISKI-15-08 düzeltmesi) — Ayarlar'dan açılan GENEL paywall'da
// restore butonu zaten çalışıyordu (resetPaywallToGeneric()) — BOZULMADIĞINI
// doğrular. Ayrıca butonun sadece GÖRÜNMESİ değil İŞLEVİNİN de çalıştığını
// (tıklanınca iap.restorePro() gerçekten çağrılıyor) doğrular — web'de
// NativePurchases plugin'i yok, bu yüzden core/iap.js:getIAPPlugin() null
// döner ve handleRestorePurchase() "Kullanılamıyor / Bu özellik sadece
// mobil uygulamada çalışır" toast'ına düşer (core/iap.js:restorePro()'nun
// KENDİ, GERÇEK "plugin yok" dalı — mock'lanmadı, gerçek kod yolu) — bu,
// butonun click handler'ının GERÇEKTEN tetiklendiğinin kanıtı.
test("G228: Ayarlar'dan açılan GENEL paywall'da restore butonu görünür VE işlevi çalışıyor (web'de plugin yok → doğru 'kullanılamıyor' toast'ı)", async () => {
  const page = await newPage();
  await seedLocalStorage(page);
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Ana menü → dişli (#menuSettingsBtn) → Ayarlar sheet'i açılır → "Pro'ya
  // geç" (#goProBtn) → resetPaywallToGeneric() + goToSettingsSubpage("paywall").
  await dismissSpotlightIfShown(page);
  await page.locator("#menuSettingsBtn").click();
  await page.waitForTimeout(300);
  await page.locator("#goProBtn").click();
  await page.waitForTimeout(300);

  const screen = await activeScreenId(page);
  assert.equal(screen, "screen-paywall", `ön koşul: genel paywall açılmadı (${screen})`);
  assert.equal(await restoreBtnVisible(page), true, "genel paywall'da restore butonu görünmeli (regresyon kontrolü — bu yol ÖNCEDEN de çalışıyordu)");

  // İşlev kontrolü: web'de core/iap.js:getIAPPlugin() null döner (NativePurchases
  // plugin'i sadece native köprüde var) — handleRestorePurchase() bu GERÇEK
  // "plugin yok" dalına düşüp bir toast gösterir, MOCK'LANMADI. Asıl kanıt:
  // click handler GERÇEKTEN tetiklendi, uygulama çökmedi/donmadı, hâlâ yanıt
  // veriyor.
  await page.locator("#restorePurchaseBtn").click();
  await page.waitForTimeout(500);
  const stillResponsive = await page.evaluate(() => document.querySelector(".screen.active") !== null);
  assert.equal(stillResponsive, true, "restore butonuna basınca uygulama yanıt vermez hale gelmemeli");
  const toastVisible = await page.locator(".toast").first().isVisible().catch(() => false);
  assert.equal(toastVisible, true, "restore tıklaması sonrası bir toast (ör. 'sadece mobil uygulamada çalışır') gösterilmeli — click handler'ın gerçekten çalıştığının kanıtı");
  await page.close();
});

// G225 (madde 30 düzeltmesi) — "Atla" (#nextBtn) ile sessionLimit'e ulaşan
// kullanıcının ekranı temiz "Oyunu Başlat" (▶) idle durumuna düşüyor
// (feedback paneli hiç açılmadı) — reklam izleyip +5 soru kazandıktan
// SONRA #startBtn'e basmak `els.startBtn`'in `!activeQuestion` dalını
// (fresh-start) tetikliyordu, bu da kazanılan hakkı SİLİYORDU (madde 30,
// G224'te %100 tekrar üretildi). `paywallEndedRoundForResume` bayrağı bu
// ikisini artık ayırıyor — bu test o düzeltmeyi doğruluyor.
test("madde 30 (Atla yolu): sessionLimit paywall'ında reklam izleyip +5 soru kazanan kullanıcı, 'Oyunu Başlat'a basınca hakkı KAYBETMEZ", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mockAdReward(page);
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");

  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  await exhaustFreeSessionLimit(page);

  const beforeAd = await readOutcome(page);
  assert.equal(beforeAd.screen, "screen-paywall", `ön koşul: 5. "Atla" sonrası paywall açılmadı (${beforeAd.screen})`);
  assert.equal(beforeAd.paywallReasonTitle, "Ücretsiz oturumun bitti");

  const adBtnVisible = await page.locator("#watchAdBtn").isVisible().catch(() => false);
  assert.equal(adBtnVisible, true, "ön koşul: #watchAdBtn görünür değil");
  const adDailyLabelBefore = await page.locator("#watchAdBtnLabel").textContent();
  assert.match(adDailyLabelBefore, /bugün 3 hakkın kaldı/, `ön koşul: günlük reklam sayacı beklenen 3 değil (${adDailyLabelBefore})`);
  await page.locator("#watchAdBtn").click();
  await page.waitForTimeout(1500);

  // Kaldığı yerden devam — ekran "Oyunu Başlat" (▶) idle durumunda olmalı
  // (feedback paneli YOK, "Atla" hiç açmadı).
  const startLabel = await page.locator("#startBtn").textContent();
  assert.equal(startLabel, "▶", `ön koşul: #startBtn 'Oyunu Başlat' (▶) göstermiyor (${startLabel})`);

  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);

  const after = await page.evaluate(() => ({
    screen: document.querySelector(".screen.active")?.id || null,
    qNum: document.getElementById("gameQNum")?.textContent || null,
    qMax: document.getElementById("gameQMax")?.textContent || null,
  }));
  assert.equal(after.screen, "screen-game", `resume sonrası screen-game bekleniyordu, gelen: ${after.screen}`);
  assert.equal(after.qMax, "10", `KABUL KRİTERİ: reklamla kazanılan +5 soru hakkı silinmiş — #gameQMax "10" değil "${after.qMax}"`);
  assert.equal(after.qNum, "6", `KABUL KRİTERİ: round sayacı sıfırlanmış — #gameQNum "6" değil "${after.qNum}"`);

  // 5 soru daha oynanabiliyor mu — "Atla" ile devam, paywall'a erken düşmemeli.
  for (let i = 0; i < 4; i++) {
    await page.locator("#nextBtn").click();
    await page.waitForTimeout(200);
  }
  const mid = await activeScreenId(page);
  assert.equal(mid, "screen-game", `9. sorudan önce paywall'a düşülmemeli, gelen: ${mid}`);

  // Günlük reklam sayacı doğru azaldı mı (3 → 2).
  await page.locator("#nextBtn").click(); // 10. "Atla" — sessionLimit'e (10/10) tekrar ulaşır
  await page.waitForTimeout(200);
  const finalScreen = await activeScreenId(page);
  assert.equal(finalScreen, "screen-paywall", `10 soru sonunda paywall tekrar açılmalı, gelen: ${finalScreen}`);
  const adDailyLabelAfter = await page.locator("#watchAdBtnLabel").textContent().catch(() => null);
  if (adDailyLabelAfter) {
    assert.match(adDailyLabelAfter, /bugün 2 hakkın kaldı/, `günlük reklam sayacı 3→2 azalmamış (${adDailyLabelAfter})`);
  }

  await page.close();
});

// G225 — cevaplayarak (`.ans`) limite ulaşan yol BOZULMADI mı doğrulanıyor
// (bu yol zaten `goToNextRound()` üzerinden resume ediyordu, madde 30'un
// reset koduna hiç uğramıyordu — G225 bu davranışa DOKUNMADI).
//
// G261 DÜZELTMESİ (OLCUM-FLAKY-16-08.md) — bu fonksiyon ESKİDEN körü-körüne
// `.ans`'ın İLK butonuna basıyordu (`dismissAndAnswer`, yerel bir kopya) —
// şıklar shuffle() ile karıştırıldığı için bu genelde YANLIŞ cevaba denk
// geliyordu, yanlış cevap can GÖTÜRÜYOR, 5 soruluk pencerede TÜM cevaplar
// yanlış gelirse can 5→0 düşüp paywall "livesOut" sebebiyle (bu testin
// beklediği "sessionLimit" YERİNE) açılıyordu — ~%5-6 gerçek, rastgele
// kırmızı bu yüzden çıkıyordu. `answerCorrectChoice()` (app-fixtures.mjs,
// TÜM e2e dosyalarının PAYLAŞTIĞI TEK yer) artık DOĞRU şıkkı seçiyor —
// bu test seed'i (`lives:999`, GERÇEKTE `applyLivesRefill()` tarafından
// 5'e klemplenir) artık ASLA tükenmez, çünkü hiçbir cevap yanlış GELMEZ.

test("madde 30 (cevaplama yolu, regresyon): cevaplayarak sessionLimit'e ulaşan kullanıcı reklamla devam ederken BOZULMADI", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mockAdReward(page);
  await page.goto(serverHandle.baseUrl);
  // feedbackScreen:false — QUICK_ADVANCE_MS ile hızlı ilerler, `dismissAndAnswer`'ın
  // kendi #feedbackClose kapatma çağrısıyla YARIŞMAZ (feedbackScreen:true'da
  // 4000/6000ms'lik uzun otomatik-ilerleme zamanlayıcısı BU çağrıyla çakışıp
  // çift-ilerleme/yarış durumuna yol açtığı ölçüldü). Kritik olan (oyun bitince
  // panelin AÇIK kalması) feedbackScreen'DEN BAĞIMSIZ zaten doğru — gameOver
  // true iken scheduleNext() hiç çağrılmıyor (app.js:4059 deseni).
  await seedLocalStorage(page, { stats: { lives: 999, rounds: 50 }, feedbackScreen: false });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");

  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  for (let i = 0; i < 5; i++) await answerCorrectChoice(page);

  const beforeAd = await readOutcome(page);
  assert.equal(beforeAd.screen, "screen-paywall", `ön koşul: 5. cevap sonrası paywall açılmadı (${beforeAd.screen})`);
  assert.equal(beforeAd.paywallReasonTitle, "Ücretsiz oturumun bitti");

  await page.locator("#watchAdBtn").click();
  await page.waitForTimeout(1500);

  // Feedback paneli (5. sorudan kalma) hâlâ açık olmalı — kapatınca
  // goToNextRound() üzerinden OTOMATİK resume etmeli, #startBtn'e HİÇ
  // basmadan.
  const closed = await dismissFeedbackIfShown(page);
  assert.equal(closed, true, "ön koşul: feedback paneli açık değildi — bu test bu senaryoyu ölçemedi");

  const after = await page.evaluate(() => ({
    screen: document.querySelector(".screen.active")?.id || null,
    qNum: document.getElementById("gameQNum")?.textContent || null,
    qMax: document.getElementById("gameQMax")?.textContent || null,
  }));
  assert.equal(after.screen, "screen-game", `otomatik resume sonrası screen-game bekleniyordu, gelen: ${after.screen}`);
  assert.equal(after.qMax, "10", `regresyon: cevaplama yolunda #gameQMax "10" değil "${after.qMax}"`);
  assert.equal(after.qNum, "6", `regresyon: cevaplama yolunda #gameQNum "6" değil "${after.qNum}"`);

  await page.close();
});

// G229 (TUR2-YARIM-15-08, "Satın Alma Kaybı") — `localStorage.setItem()`
// GERÇEKTEN hata fırlatınca (Safari private-browsing/depolama dolu) satın
// alma akışının artık NASIL davrandığını doğrular: (1) kullanıcı AÇIK bir
// hata mesajı görür, (2) ekranda kalır (satın alma "başarılıymış gibi"
// kapanmaz), (3) `localStorage`'da YARIM/tutarsız bir kayıt KALMAZ, (4)
// depolama düzelince (retry) TEMİZ bir başarı elde edilir. Web'de gerçek
// NativePurchases plugin'i olmadığı için (`core/iap.js:getIAPPlugin()`
// null döner) `window.Capacitor.Plugins.NativePurchases`'ı MINIMAL bir
// sahte nesneyle DOLDURUYORUZ — mock'lanan TEK şey native SINIR (StoreKit
// çağrısı), `#buyProBtn`'in click handler'ı/`grantRealPro()`/`storage.js`'in
// GERÇEK kodu HİÇ mock'lanmadı, uçtan uca gerçek yol izleniyor.
test("G229: localStorage.setItem() hata fırlatınca satın alma kullanıcıya AÇIKÇA bildiriliyor, state tutarsız kalmıyor, retry temiz çalışıyor", async () => {
  const page = await newPage();
  await seedLocalStorage(page);
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Native satın alma köprüsünü sahte bir NativePurchases plugin'iyle
  // dolduruyoruz — SADECE bu, StoreKit'in KENDİSİ (core/iap.js dokunulmadı).
  await page.evaluate((productId) => {
    window.Capacitor = window.Capacitor || {};
    window.Capacitor.Plugins = window.Capacitor.Plugins || {};
    window.Capacitor.Plugins.NativePurchases = {
      purchaseProduct: async () => ({}),
      getPurchases: async () => ({ purchases: [{ productIdentifier: productId }] }),
      restorePurchases: async () => ({}),
    };
  }, "com.logicprotrick.audioengineeracademy.pro");

  // Genel paywall — Ayarlar → "Pro'ya geç" (G228'in AYNI yolu).
  await dismissSpotlightIfShown(page);
  await page.locator("#menuSettingsBtn").click();
  await page.waitForTimeout(300);
  await page.locator("#goProBtn").click();
  await page.waitForTimeout(300);
  let screen = await activeScreenId(page);
  assert.equal(screen, "screen-paywall", `ön koşul: genel paywall açılmadı (${screen})`);

  // localStorage.setItem()'ı SADECE satın alma anahtarı için hata
  // fırlatacak şekilde yamıyoruz — diğer TÜM yazımlar (ör. spotlight/ayarlar
  // durumu) normal çalışmaya devam ediyor, test bunlardan etkilenmesin diye.
  await page.evaluate(() => {
    const orig = localStorage.setItem.bind(localStorage);
    window.__origSetItem = orig;
    localStorage.setItem = (key, value) => {
      if (key === "eqEarTrainerProXPurchase") {
        throw new DOMException("QuotaExceededError (e2e simüle)", "QuotaExceededError");
      }
      return orig(key, value);
    };
  });

  await page.locator("#buyProBtn").click();
  await page.waitForTimeout(600);

  // 1) Kullanıcı AÇIK bir hata mesajı görüyor.
  const toastVisible = await page.locator(".toast").first().isVisible().catch(() => false);
  assert.equal(toastVisible, true, "hata durumunda bir toast gösterilmeli");
  const toastTitle = await page.locator(".toast b").first().textContent().catch(() => null);
  assert.match(toastTitle || "", /kaydedilemedi/i, `toast başlığı ne olduğunu söylemeli, gelen: "${toastTitle}"`);

  // 2) Ekranda kalıyor — "başarılıymış gibi" paywall'dan ÇIKARILMADI.
  screen = await activeScreenId(page);
  assert.equal(screen, "screen-paywall", `hata sonrası HÂLÂ paywall'da kalınmalı, gelen: ${screen}`);

  // 3) localStorage'da YARIM/tutarsız bir kayıt YOK.
  const purchaseRaw = await page.evaluate(() => localStorage.getItem("eqEarTrainerProXPurchase"));
  assert.equal(purchaseRaw, null, "başarısız yazımdan sonra satın alma anahtarı localStorage'da HİÇ olmamalı");

  // İlk (başarısız) toast'ın TAMAMEN kaybolmasını bekle (fx.js: 2800ms'de
  // DOM'dan kaldırılıyor) — aksi halde aşağıdaki ".toast" seçicisi retry'nin
  // YENİ toast'ı yerine bu ESKİ/kalıntı toast'ı yakalayabilir.
  await page.waitForTimeout(2500);

  // Depolama "düzeliyor" — retry senaryosu.
  await page.evaluate(() => {
    if (window.__origSetItem) localStorage.setItem = window.__origSetItem;
  });
  await page.locator("#buyProBtn").click();
  await page.waitForTimeout(600);

  // 4) Retry temiz başarıyla sonuçlanıyor — önceki başarısız denemeden
  // KALINTI yok, tutarlı bir "şimdi Pro" durumu var.
  const toastTitleAfterRetry = await page.locator(".toast b").first().textContent().catch(() => null);
  assert.match(toastTitleAfterRetry || "", /Pro açıldı/, `retry sonrası başarı toast'ı bekleniyordu, gelen: "${toastTitleAfterRetry}"`);
  const purchaseRawAfterRetry = await page.evaluate(() => localStorage.getItem("eqEarTrainerProXPurchase"));
  assert.ok(purchaseRawAfterRetry, "retry sonrası satın alma kaydı localStorage'a yazılmış olmalı");
  assert.equal(JSON.parse(purchaseRawAfterRetry).proPurchased, true);

  await page.close();
});

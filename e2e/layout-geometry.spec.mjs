// F — Layout geometrisi (TEST-BOSLUGU-15-08.md, madde F). Görsel piksel-
// diff KURULMADI (rapor önermiyordu) — bunun yerine getBoundingClientRect
// tabanlı, resimsiz/bakımsız bir geometri kontrolü: `.actionbar`
// (position:fixed, styles.css:1554) her zaman `.scroll` içindeki SON
// kartın ALTINDA kalmalı, üstüne BİNMEMELİ.
//
// İKİ ekran karşılaştırılıyor:
//   - #screen-game: #screen-game.actionbar-compact .game-scroll'un KENDİ
//     margin-bottom telafisi VAR (styles.css:737) — bu test PASS etmeli,
//     metodun kendisinin doğru çalıştığını kanıtlıyor.
//   - #screen-result: REGRESYON-15-08.md'nin #4c/#4d maddesiydi — G221'de
//     AYNI telafi deseni (`--result-actionbar-h`, styles.css) uygulandı.
//     Bu test artık GEÇMELİ; kırmızıya dönerse telafi BOZULMUŞ demektir.
//
// DÜRÜSTLÜK NOTU (1. deneme): bu testin İLK sürümü `#screen-result`'ı
// `.screen.active` class'ını DOĞRUDAN elle açarak (statik HTML'in varsayılan/
// BOŞ içeriğiyle) ölçüyordu — CSS telafisi OLMADAN da YEŞİL çıktığı fark
// edildi (stash'le doğrulandı): statik varsayılan içerik gerçek
// `showSessionEnd()` çıktısından KISA olduğu için taşma hiç oluşmuyordu, test
// YANLIŞ bir güven veriyordu.
// DÜRÜSTLÜK NOTU (2. deneme): bunun yerine GERÇEK bir "10 Soruluk Bölüm"
// (normal/kayıpsız) akışı sürülmeye çalışıldı (reklam mock'u + sessionLimit
// paywall'ından dönüş) — bu da BAŞKA bir gerçek uygulama kilidine çarptı
// (startBtn'in fresh-start dalı reklamla kazanılan soru hakkını/challenge
// ilerlemesini resume'da sıfırlıyor, ayrıntı aşağıda). Nihai çözüm: GERÇEK
// oynanmış turlar + `window.__aeaShowSessionEndForTest` doğrulama kancasıyla
// showSessionEnd() DOĞRUDAN çağrılıyor (ayrıntı aşağıdaki test'in başında).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, dismissSpotlightIfShown } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

// Örtüşme SADECE kullanıcı EN ALTA kaydırdığında anlamlı — margin-bottom
// telafisinin TEK işi budur (aksi halde içerik zaten viewport dışında,
// "actionbar'ın altında" görünmesi kaydırma YAPILMAMIŞ olmasından, bug'dan
// DEĞİL). Önce scrollEl'i sonuna kaydırır, SONRA en alttaki doğrudan
// çocuğun (sıfır-olmayan yükseklikli) alt kenarını döner.
// `position:fixed`/`absolute` çocuklar (ör. feedback overlay'i) BİLEREK
// dışlanıyor — bunlar normal AKIŞA katkı vermiyor (scrollHeight'ı
// ETKİLEMİYOR), "kaydırılan içeriğin sonu" onlar DEĞİL.
async function lastCardBottom(page, scrollSelector) {
  return page.evaluate((sel) => {
    const scrollEl = document.querySelector(sel);
    if (!scrollEl) return null;
    scrollEl.scrollTop = scrollEl.scrollHeight;
    let maxBottom = 0;
    for (const child of scrollEl.children) {
      const pos = getComputedStyle(child).position;
      if (pos === "fixed" || pos === "absolute") continue;
      const r = child.getBoundingClientRect();
      if (r.height > 0) maxBottom = Math.max(maxBottom, r.bottom);
    }
    return maxBottom;
  }, scrollSelector);
}

async function actionbarTop(page, actionbarSelector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return el.getBoundingClientRect().top;
  }, actionbarSelector);
}

// sessionLimit paywall'ı bazen bir feedback paneli AÇIKKEN araya giriyor
// (teardownActiveRound() round'u kapatıyor ama panel-DOM'unu kapatmıyor) —
// paywall'dan dönüldüğünde #feedbackOverlay hâlâ "open" kalıp #startBtn'i
// engelleyebiliyor. Varsa #feedbackClose ile GERÇEK kapatma yolundan geçilir
// (goToNextRound()'un AYNI yolu, bkz. G214) — DOM'a doğrudan dokunulmaz.
async function dismissFeedbackIfShown(page) {
  const closeBtn = page.locator("#feedbackClose");
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click({ timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
}

// Spotlight turu birden fazla ADIMDA (her yeni soru/ekranda) yeniden
// açılabiliyor — tek seferlik dismissSpotlightIfShown() yetmiyor. Sonraki
// sorunun ses zinciri kurulup `.ans`'ın GERÇEKTEN tıklanabilir hâle gelmesi
// ~2sn sürüyor (ölçüldü) — `isEnabled()` polling YANILTICI çıktı (buton
// ara bir DOM durumunda KISA süreliğine "enabled" görünüp asıl yeni-round
// durumuna GELMEDEN tıklanabiliyordu, cevap SAYILMIYORDU) — bunun yerine
// SABİT, ölçülmüş bir bekleme kullanılıyor.
async function answerOnce(page) {
  await dismissSpotlightIfShown(page);
  await dismissFeedbackIfShown(page);
  await page.locator(".ans").first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

test("#screen-game: sabit actionbar, kaydırılan son kartı ÖRTMÜYOR (kontrol grubu — beklenen: GEÇER)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);

  const scrollBottom = await lastCardBottom(page, "#screen-game .game-scroll");
  const barTop = await actionbarTop(page, "#gameActionbar");
  assert.ok(scrollBottom !== null && barTop !== null, "ölçüm elementleri bulunamadı");
  assert.ok(
    barTop >= scrollBottom - 1, // 1px alt-piksel toleransı
    `#gameActionbar (top=${barTop}) kaydırılan içeriğin sonunu (bottom=${scrollBottom}) örtüyor`
  );
  await page.close();
});

// G221 NOTU: bu testin ÖNCEKİ sürümü `stats.rounds=0` + oturum/can limitini
// GERÇEKTEN tüketerek `showSessionEnd("freeLimit"/"lost")`'u TETİKLİYORDU.
// G63'ün kaldırılması bu iki yolu artık HER ZAMAN paywall'a yönlendiriyor —
// showSessionEnd()'in ÜÇ dalı da (normal/lost/freeLimit) normal akıştan BİR
// DAHA erişilemez hâle geldi (task 1'in doğal, yapısal yan etkisi — kod
// KALICI, sadece UI'dan tetiklenemiyor; DURUM.md'ye ayrıca not düşüldü).
// "normal" dalını (finishChallenge→challenge.done>=10) gerçek akıştan sürme
// denemesi AYRICA yeni bir kilitlenmeye çarptı: startBtn'in fresh-start dalı
// (app.js ~6298) HER "activeQuestion===null" durumunda (paywall'dan dönüş
// DAHİL) roundsInThisPlaySession/sessionExtraQuestionsGranted/challenge.done'ı
// sıfırlıyor — yani reklamla kazanılan +5 soru hakkı, "Oyunu Başlat"a
// basılır basılmaz siliniyor (ayrı bir bug, bu görevin kapsamı/DOKUNULMAYACAK
// listesi dışında, kullanıcıya bildirildi).
// ÇÖZÜM (kullanıcı onaylı): gerçek oynanmış turlarla (answerOnce loop, AYNI
// #screen-game kontrol grubunun kullandığı GERÇEK akış) gerçek session.log/
// session.xp/zoneStats biriktirilir, SONRA `window.__aeaShowSessionEndForTest`
// (yeni, app.js'teki `window.__tonalDebugState` ile AYNI "doğrulama kancası"
// deseni) ile showSessionEnd() DOĞRUDAN çağrılıp #screen-result GERÇEK,
// tasarım-boyutunda içerikle açılır. "lost" kind'i seçildi — resWaitRow'un
// GÖRÜNÜR olduğu, --result-actionbar-h'ın kalibre edildiği EN UZUN (198px)
// varyant, ölçüm en sıkı koşulda yapılmış olur.
test("#screen-result: sabit actionbar, kaydırılan son kartı ÖRTMÜYOR (REGRESYON-15-08 madde 4c/4d — GERÇEK oynanmış turlarla, 'lost' varyantı)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");

  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  for (let i = 0; i < 6; i++) await answerOnce(page);

  const hookAvailable = await page.evaluate(() => typeof window.__aeaShowSessionEndForTest === "function");
  assert.equal(hookAvailable, true, "ön koşul: window.__aeaShowSessionEndForTest bulunamadı");
  await page.evaluate(() => window.__aeaShowSessionEndForTest("lost"));
  await page.waitForTimeout(200);

  const finalScreen = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(finalScreen, "screen-result", `ön koşul: showSessionEnd("lost") #screen-result'ı açmadı (${finalScreen})`);
  const kicker = await page.evaluate(() => document.getElementById("resKicker")?.textContent);
  assert.equal(kicker, "CANLARIN BİTTİ", "beklenen 'lost' seans özeti değil");
  const waitRowHidden = await page.evaluate(() => document.getElementById("resWaitRow")?.classList.contains("hidden"));
  assert.equal(waitRowHidden, false, "ön koşul: #resWaitRow 'lost'ta görünür olmalı (--result-actionbar-h'ın kalibre edildiği en uzun varyant)");

  const scrollBottom = await lastCardBottom(page, "#screen-result .scroll");
  const barTop = await actionbarTop(page, "#screen-result .actionbar");
  assert.ok(scrollBottom !== null && barTop !== null, "ölçüm elementleri bulunamadı");
  assert.ok(
    barTop >= scrollBottom - 1,
    `#screen-result .actionbar (top=${barTop}) kaydırılan içeriğin sonunu ` +
    `(bottom=${scrollBottom}) örtüyor — REGRESYON-15-08 #4c/#4d'nin telafisi ` +
    `(styles.css: --result-actionbar-h) bozulmuş olabilir.`
  );
  await page.close();
});

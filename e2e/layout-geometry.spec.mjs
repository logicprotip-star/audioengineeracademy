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
//   - #screen-result: REGRESYON-15-08.md'de DOĞRULANMIŞ, hâlâ AÇIK bir
//     kusur — styles.css'te "#screen-result" hiç geçmiyor, telafi YOK.
//     Bu test BİLEREK KIRMIZI — kusur düzeltilene kadar böyle kalacak,
//     "davranış değişmeyecek" kuralı gereği CSS'e BURADA dokunulmadı.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode } from "./helpers/app-fixtures.mjs";

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

test("#screen-result: sabit actionbar, kaydırılan son kartı ÖRTMÜYOR (REGRESYON-15-08 madde 4c — BİLİNEN KUSUR, beklenen: ŞİMDİLİK KIRMIZI)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  // freeLimit seans özetini ELLE tetikle — showSessionEnd() bu ekranı
  // KENDİSİ dolduruyor, gerçek bir 5-soruluk oturum oynamaya gerek yok.
  await seedLocalStorage(page, { stats: { rounds: 0 } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "boost-mu-cut-mu");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(300);
  for (let i = 0; i < 6; i++) {
    const visible = await page.locator("#nextBtn").isVisible().catch(() => false);
    if (!visible) break;
    await page.locator("#nextBtn").click();
    await page.waitForTimeout(200);
  }
  const screen = await page.evaluate(() => document.querySelector(".screen.active")?.id);
  assert.equal(screen, "screen-result", "ön koşul: seans özeti ekranına ulaşılamadı");

  const scrollBottom = await lastCardBottom(page, "#screen-result .scroll");
  const barTop = await actionbarTop(page, "#screen-result .actionbar");
  assert.ok(scrollBottom !== null && barTop !== null, "ölçüm elementleri bulunamadı");
  assert.ok(
    barTop >= scrollBottom - 1,
    `BİLİNEN KUSUR (REGRESYON-15-08 #4c): #screen-result .actionbar (top=${barTop}) ` +
    `kaydırılan içeriğin sonunu (bottom=${scrollBottom}) örtüyor — styles.css'te ` +
    `"#screen-result" için margin-bottom telafisi hiç yazılmamış. Bu test KASITLI ` +
    `KIRMIZI kalacak şekilde bırakıldı (bu turun kuralı: davranış/CSS değişmeyecek).`
  );
  await page.close();
});

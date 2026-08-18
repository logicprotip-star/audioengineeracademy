// G290 — OLCUM-I-METINLERI-17-08.md'nin bulduğu 5 boşluk (İlerleme'nin 4 kartı
// + Mixini Yükle) için yeni "i" butonları + dokunma alanı büyütmesi. GERÇEK
// Chromium'da: (1) her butonun DOĞRU sheet'i DOĞRU başlıkla açtığı, (2)
// akordiyon İÇİNDEKİ butonların (G245/G262'nin AYNI tuzağı) stopPropagation
// ile akordiyonu YANLIŞLIKLA aç/kapamadığı, (3) mode-info-btn-lg'nin
// görsel boyutu DEĞİŞTİRMEDEN dokunma alanını GERÇEKTEN büyüttüğü.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

async function openApp(page) {
  await page.goto(serverHandle.baseUrl);
  // stats.rounds=0 iken İlerleme sekmesi #progEmptyState gösterip #progContent'i
  // (Rozetler/Günlük Görevler/vb. TÜM kartların yaşadığı konteyner) GİZLİYOR
  // (app.js:updateUI — "stats.rounds === 0" kontrolü) — kartlara erişmek için
  // rounds>0 gerekiyor.
  await seedLocalStorage(page, { stats: { rounds: 5, correct: 3, bestCombo: 2 }, dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
}

async function guideSheetTitle(page) {
  return page.locator("#guideSheetTitle").textContent();
}

async function closeGuideSheetIfOpen(page) {
  const closeBtn = page.locator("#guideSheetClose");
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(150);
  }
}

test("KABUL KRİTERİ — İlerleme'nin 4 YENİ 'i' butonu DOĞRU başlıkla sheet açıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openApp(page);
  await page.locator('.tab[data-tab="progress"]').click();
  await page.waitForTimeout(200);

  const cases = [
    ["#dailyInfoBtn", "Günlük Görevler"],
    ["#zoneInfoBtn", "Zayıf Bölge Raporu"],
    ["#badgesInfoBtn", "Rozetler"],
    ["#accChartInfoBtn", "İsabet Grafiği"]
  ];
  for (const [selector, expectedTitle] of cases) {
    await page.locator(selector).click();
    await page.waitForTimeout(150);
    assert.equal(await guideSheetTitle(page), expectedTitle, `${selector} yanlış başlık açtı`);
    await closeGuideSheetIfOpen(page);
  }

  await page.close();
});

test("KABUL KRİTERİ — Mixini Yükle'nin YENİ 'i' butonu doğru başlıkla sheet açıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openApp(page);
  await page.locator('.tab[data-tab="tools"]').click();
  await page.waitForTimeout(200);

  await page.locator("#toolsUploadInfoBtn").click();
  await page.waitForTimeout(150);
  assert.equal(await guideSheetTitle(page), "Mixini Yükle");
  const bodyText = await page.locator("#guideSheetBody").textContent();
  assert.match(bodyText, /cihazında kalır/);

  await page.close();
});

test("KABUL KRİTERİ — akordiyon içindeki YENİ 'i' butonları (Rozetler) stopPropagation ile akordiyonu YANLIŞLIKLA açmıyor/kapamıyor (G245/G262'nin AYNI tuzağı)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openApp(page);
  await page.locator('.tab[data-tab="progress"]').click();
  await page.waitForTimeout(200);

  // Ön koşul: Rozetler akordiyonu KAPALI başlıyor (achievementList.hidden VAR).
  const hiddenBefore = await page.locator("#achievementList").evaluate(el => el.classList.contains("hidden"));
  assert.equal(hiddenBefore, true, "ön koşul: Rozetler akordiyonu KAPALI başlamalıydı");

  await page.locator("#badgesInfoBtn").click();
  await page.waitForTimeout(200);

  // Sheet açıldı (buton ÇALIŞTI)...
  assert.equal(await guideSheetTitle(page), "Rozetler");
  // ...AMA akordiyon durumu DEĞİŞMEDİ (stopPropagation başarılı).
  const hiddenAfter = await page.locator("#achievementList").evaluate(el => el.classList.contains("hidden"));
  assert.equal(hiddenAfter, true, "'i' tıklaması akordiyonu YANLIŞLIKLA AÇMAMALIYDI");

  await closeGuideSheetIfOpen(page);

  // Kontrol: satırın KENDİSİNE (i butonunun DIŞINA) tıklamak GERÇEKTEN akordiyonu açar —
  // stopPropagation'ın "her tıklamayı yutmadığını", SADECE 'i' butonununkini
  // ayırdığını doğrular.
  await page.locator("#badgesToggle .prog-card-label").click();
  await page.waitForTimeout(200);
  const hiddenAfterRowClick = await page.locator("#achievementList").evaluate(el => el.classList.contains("hidden"));
  assert.equal(hiddenAfterRowClick, false, "satırın kendisine tıklamak akordiyonu AÇMALIYDI");

  await page.close();
});

test("KABUL KRİTERİ — mode-info-btn-lg GÖRSEL boyutu DEĞİŞTİRMİYOR (22×22 kalıyor), dokunma alanını 44×44'e büyütüyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openApp(page);
  await page.locator('.tab[data-tab="progress"]').click();
  await page.waitForTimeout(200);

  // scrollIntoViewIfNeeded() — page.mouse.click() (locator.click()'in AKSİNE)
  // OTOMATİK kaydırmıyor, buton viewport DIŞINDA kalırsa boundingBox()/
  // mouse.click() sessizce YANLIŞ (viewport dışı) koordinatlar üretirdi.
  await page.locator("#badgesInfoBtn").scrollIntoViewIfNeeded();
  // GÖRSEL kutu ölçüldü — 22×22 (Tools/İlerleme kartlarının taban .mode-info-btn boyutu).
  const box = await page.locator("#badgesInfoBtn").boundingBox();
  assert.ok(box, "buton bulunamadı");
  assert.ok(Math.abs(box.width - 22) < 1, `GÖRSEL genişlik 22px civarı olmalıydı, ölçülen: ${box.width}`);
  assert.ok(Math.abs(box.height - 22) < 1, `GÖRSEL yükseklik 22px civarı olmalıydı, ölçülen: ${box.height}`);

  // DOKUNMA ALANI — butonun GÖRSEL sınırının 15px DIŞINA (ama 44×44'ün İÇİNE)
  // tıklanınca YİNE de sheet açılmalı (::before'un invisible hit-zone'u).
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  await page.mouse.click(centerX + 15, centerY); // görsel kutunun ~11px dışı, 44/2=22'nin içi
  await page.waitForTimeout(150);
  assert.equal(await guideSheetTitle(page), "Rozetler", "GÖRSEL kutunun 15px dışına tıklamak da sheet'i açmalıydı (44×44 dokunma alanı)");

  await page.close();
});

test("REGRESYON KORUMASI — mod kartı ızgarasındaki 'i' rozeti mode-info-btn-lg TAŞIMIYOR (dense grid overlap riski, BİLEREK dokunulmadı)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openApp(page);

  const gridBadgeHasLgClass = await page.evaluate(() => {
    const badge = document.querySelector(".mode-card .mode-info-btn");
    return badge ? badge.classList.contains("mode-info-btn-lg") : null;
  });
  assert.equal(gridBadgeHasLgClass, false, "mod kartı ızgarasındaki 'i' rozeti mode-info-btn-lg TAŞIMAMALIYDI");

  await page.close();
});

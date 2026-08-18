// G293 (OLCUM-DORT-18-08 madde D) — kullanıcı kararı: pazarlama
// görsellerinin (Instagram/App Store) HEP ikişerli olması ile
// uygulamanın (eski 420px eşiği SADECE Plus/Pro Max'ı 2 sütuna alıyordu)
// tutarsız görünmesi giderildi. Eşik 389px'e indirildi (`styles.css`,
// `.mode-grid`'in hemen altındaki media query) — Logic'in KENDİ ifadesi
// "390'a inince normal ve Pro modeller de ikişerli görür" gereği 390px'İN
// KENDİSİ artık 2 sütun (max-width:389px, 390'ı KAPSAMIYOR).
//
// OLCUM-DORT'un 60 kontrollü (12 mod × 5 genişlik) taşma/kırpılma taraması
// + bu G293'ün KENDİ tekrar-ölçümü SIFIR taşma buldu — bu test o
// ölçümün KALICI/otomatik doğrulaması: 375/389px HÂLÂ 1 sütun, 390px+
// (temel/Pro/Plus/Pro Max TÜMÜ) 2 sütun, VE 430px'in (Logic'in cihazı)
// eski/yeni eşikte AYNI kaldığı (izolasyon).

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

async function gridColumnCountAt(width) {
  const page = await browser.newPage({ viewport: { width, height: 1400 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { stats: { rounds: 0 } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  const cols = await page.evaluate(() => {
    const cs = getComputedStyle(document.getElementById("modeGrid"));
    return cs.gridTemplateColumns.trim().split(/\s+/).length;
  });
  await page.close();
  return cols;
}

test("G293 KABUL KRİTERİ — 390px'de kartlar ikişerli (2 sütun)", async () => {
  const cols = await gridColumnCountAt(390);
  assert.equal(cols, 2, "390px (iPhone 12/13/14 taban genişliği) artık 2 sütun göstermeli — Logic'in kararı");
});

test("G293 — 375px (SE/mini) HÂLÂ 1 sütun, 389px de HÂLÂ 1 sütun (eşiğin TAM altı)", async () => {
  assert.equal(await gridColumnCountAt(375), 1, "375px 1 sütunda KALMALI");
  assert.equal(await gridColumnCountAt(389), 1, "389px (390'ın 1 altı) 1 sütunda KALMALI — eşik 390'ı KAPSAMIYOR");
});

test("G293 — 393/414/420/430px (Pro/Plus/Pro Max) 2 sütun", async () => {
  for (const w of [393, 414, 420, 430]) {
    assert.equal(await gridColumnCountAt(w), 2, `${w}px 2 sütun göstermeli`);
  }
});

test("G293 KABUL KRİTERİ — 430px'de düzen DEĞİŞMEDİ (izolasyon) — eski eşikte de 2 sütundu, yenisinde de", async () => {
  // Eski eşik (420px) ile yeni eşik (389px) ARASINDA 430px HER İKİSİNDE de
  // >eşik olduğu için sonuç aynı kalmalı — kolonların GERÇEK piksel
  // genişliği de (sadece sayısı değil) sabit kalmalı.
  const page = await browser.newPage({ viewport: { width: 430, height: 1400 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { stats: { rounds: 0 } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  const gridCols = await page.evaluate(() => getComputedStyle(document.getElementById("modeGrid")).gridTemplateColumns);
  assert.equal(gridCols, "193px 193px", "430px'te kolon genişliği DEĞİŞMEMİŞ olmalı (izolasyon)");
  await page.close();
});

test("G293 — 390px'de HİÇBİR mod kartında başlık/rozet taşması yok (12 mod)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 1400 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { stats: { rounds: 0 }, dev: { simulatePro: false } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  const data = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("#modeGrid .mode-card"));
    return cards.map((card) => {
      const nameEl = card.querySelector(".mode-card-name");
      const badgeEl = card.querySelector(".mode-card-badge, .mode-chip-level");
      const cardRect = card.getBoundingClientRect();
      const badgeRect = badgeEl ? badgeEl.getBoundingClientRect() : null;
      const nameOverflows = nameEl ? (nameEl.scrollWidth > nameEl.clientWidth + 1 || nameEl.scrollHeight > nameEl.clientHeight + 1) : false;
      const badgeOverflows = badgeRect ? (badgeRect.right > cardRect.right + 1 || badgeRect.left < cardRect.left - 1) : false;
      return { name: nameEl ? nameEl.textContent : "?", nameOverflows, badgeOverflows };
    });
  });
  assert.equal(data.length, 12, "12 mod kartı render edilmeli");
  for (const c of data) {
    assert.equal(c.nameOverflows, false, `"${c.name}": başlık kendi kutusunu taşıyor`);
    assert.equal(c.badgeOverflows, false, `"${c.name}": rozet kartı taşıyor`);
  }
  await page.close();
});

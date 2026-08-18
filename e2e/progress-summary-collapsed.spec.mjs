// G297 (OLCUM-ILERLEME-TASARIM-18-08'in ucuz alternatifi) — İlerleme
// sekmesindeki akordiyonlar artık VARSAYILAN KAPALI (Günlük Görevler/Zayıf
// Bölge Raporu ÖNCEDEN varsayılan açıktı), her kart KAPALIYKEN de görünen
// GERÇEK VERİDEN gelen bir özet taşıyor, sıralama gözden geçirildi (Son
// Cevaplar — ham/kronolojik log — en sona taşındı). Akordiyon mekanizmasının
// KENDİSİ (bindCollapsiblePanel) ve bugün eklenen 4 "i" butonu/testi
// (e2e/guide-sheet-new-buttons.spec.mjs) BİLEREK DOKUNULMADI.

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

async function openProgress(page, opts = {}) {
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { stats: { rounds: 5, correct: 3 }, dev: { simulatePro: true }, ...opts });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.locator('.tab[data-tab="progress"]').click();
  await page.waitForTimeout(300);
}

test("KABUL KRİTERİ — TÜM akordiyon kartlar KAPALI açılıyor (Günlük Görevler ve Zayıf Bölge Raporu DAHİL, önceden varsayılan açıktı)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openProgress(page);

  const cases = [
    ["dailyWrap", "dailyChevron"],
    ["recentWrap", "recentChevron"],
    ["zoneWrap2", "zoneChevron"],
    ["achievementList", "badgesChevron"],
    ["modeLevelsList", "modeLevelsChevron"],
  ];
  for (const [wrapId, chevronId] of cases) {
    const hidden = await page.locator(`#${wrapId}`).evaluate(el => el.classList.contains("hidden"));
    assert.equal(hidden, true, `#${wrapId} KAPALI başlamalıydı`);
    const rotated = await page.locator(`#${chevronId}`).evaluate(el => el.style.transform === "rotate(180deg)");
    assert.equal(rotated, false, `#${chevronId} döndürülmemiş (kapalı) durumda başlamalıydı`);
  }

  // Kontrol: satıra tıklamak GERÇEKTEN açıyor (mekanizma bozulmadı).
  await page.locator("#dailyToggle .prog-card-label").click();
  await page.waitForTimeout(150);
  const openedAfterClick = await page.locator("#dailyWrap").evaluate(el => el.classList.contains("hidden"));
  assert.equal(openedAfterClick, false, "satıra tıklayınca akordiyon AÇILMALIYDI");

  await page.close();
});

test("KABUL KRİTERİ — her kartta GERÇEK VERİDEN gelen özet görünüyor (sabit metin DEĞİL)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const history = Array.from({ length: 4 }, (_, i) => ({ correct: true, label: "Frekans Bulma", detail: "test", ts: Date.now() - i * 1000 }));
  await openProgress(page, { stats: { rounds: 5, correct: 3, history } });
  await page.evaluate(() => {
    localStorage.setItem("fa_zonestats", JSON.stringify({ "BAS": { n: 5, ok: 1 } })); // %20
    const today = new Date();
    const dailyAcc = {};
    for (let i = 0; i < 5; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      dailyAcc[key] = { correct: 6, total: 8 }; // %75
    }
    localStorage.setItem("eqEarTrainerProXDailyAcc", JSON.stringify(dailyAcc));
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.locator('.tab[data-tab="progress"]').click();
  await page.waitForTimeout(300);

  assert.equal(await page.locator("#recentSummary").textContent(), "4 cevap");
  assert.equal(await page.locator("#zoneSummary").textContent(), "Bas %20");
  assert.equal(await page.locator("#accChartSummary").textContent(), "%75");
  assert.match(await page.locator("#modeLevelsSummary").textContent(), /^\d+\/\d+ mod$/);
  // Rozetler/Günlük Görevler ZATEN var olan dinamik sayaçlar — G297 bunlara
  // DOKUNMADI, hâlâ dinamik olduklarını doğrula (regresyon koruması).
  assert.match(await page.locator("#dailyCounter").textContent(), /^bugün · \d+\/\d+$/);
  assert.match(await page.locator("#achievementCount").textContent(), /^\d+\/\d+$/);

  await page.close();
});

test("KABUL KRİTERİ — boş durumda (hiç veri yokken) anlamlı bir metin yazıyor, ham sayı/NaN göstermiyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openProgress(page); // rounds:5 ama zoneStats/dailyAcc/history BOŞ

  assert.equal(await page.locator("#recentSummary").textContent(), "Henüz cevap yok");
  assert.equal(await page.locator("#zoneSummary").textContent(), "Henüz veri yok");
  assert.equal(await page.locator("#accChartSummary").textContent(), "Henüz veri yok");
  assert.equal(await page.locator("#modeLevelsSummary").textContent(), "0/12 mod");
  for (const id of ["recentSummary", "zoneSummary", "accChartSummary", "modeLevelsSummary"]) {
    const text = await page.locator(`#${id}`).textContent();
    assert.ok(!/NaN|undefined|null/.test(text), `#${id} ham/bozuk değer gösterdi: ${text}`);
  }

  await page.close();
});

test("KABUL KRİTERİ — 375px genişlikte HİÇBİR kart başlığında özet TAŞMIYOR (en uzun gerçekçi metinlerle ölçüldü)", async () => {
  const page = await browser.newPage({ viewport: { width: 375, height: 700 } });
  const history = Array.from({ length: 12 }, (_, i) => ({ correct: true, label: "Frekans Bulma", detail: "test", ts: Date.now() - i * 1000 }));
  await openProgress(page, { stats: { rounds: 100, correct: 90, history } });
  await page.evaluate(() => {
    // TEK aday, %100 — "Üst-orta %100" en uzun gerçekçi zone-özeti (en uzun
    // bölge adı + 3 haneli yüzde).
    localStorage.setItem("fa_zonestats", JSON.stringify({ "ÜST-ORTA": { n: 2, ok: 2 } }));
    const today = new Date();
    const dailyAcc = {};
    for (let i = 0; i < 5; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      dailyAcc[key] = { correct: 10, total: 10 }; // %100
    }
    localStorage.setItem("eqEarTrainerProXDailyAcc", JSON.stringify(dailyAcc));
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.locator('.tab[data-tab="progress"]').click();
  await page.waitForTimeout(300);

  const headerIds = ["dailyToggle", "recentToggle", "zoneToggle", "badgesToggle", "modeLevelsToggle"];
  for (const id of headerIds) {
    const overflow = await page.evaluate((id) => {
      const headEl = document.getElementById(id);
      const rect = headEl.getBoundingClientRect();
      // Her çocuğun GÖRSEL sağ/sol kenarı, satırın KENDİ kenarlarını AŞIYOR MU
      // (scrollWidth/clientWidth flex+margin:auto ile YANLIŞ pozitif verebiliyor
      // — bkz. OLCUM ölçümü — bu yüzden ÇOCUK bazlı GERÇEK bounding-box kontrolü).
      return Array.from(headEl.children).some(c => {
        const cr = c.getBoundingClientRect();
        return cr.right > rect.right + 1 || cr.left < rect.left - 1;
      });
    }, id);
    assert.equal(overflow, false, `#${id}: bir çocuk elemanı satırın DIŞINA taştı (375px)`);
  }
  // İsabet Grafiği akordiyon değil, ayrı kontrol (i-butonunun ebeveyni farklı).
  const chartOverflow = await page.evaluate(() => {
    const headEl = document.getElementById("accChartInfoBtn").closest(".prog-card-head");
    const rect = headEl.getBoundingClientRect();
    return Array.from(headEl.children).some(c => {
      const cr = c.getBoundingClientRect();
      return cr.right > rect.right + 1 || cr.left < rect.left - 1;
    });
  });
  assert.equal(chartOverflow, false, "İsabet Grafiği başlığında bir çocuk elemanı DIŞINA taştı (375px)");

  await page.close();
});

test("REGRESYON KORUMASI — sıralama gözden geçirildi: Günlük Görevler İLK, Son Cevaplar (ham log) EN SON", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openProgress(page);

  const order = await page.evaluate(() => {
    const ids = ["dailyToggle", "accChartInfoBtn", "zoneToggle", "badgesToggle", "modeLevelsToggle", "recentToggle"];
    const cards = Array.from(document.querySelectorAll("#progContent > .prog-card"));
    return cards.map(card => {
      for (const id of ids) {
        if (card.querySelector(`#${id}`)) return id;
      }
      return "?";
    });
  });
  assert.deepEqual(order, ["dailyToggle", "accChartInfoBtn", "zoneToggle", "badgesToggle", "modeLevelsToggle", "recentToggle"]);

  await page.close();
});

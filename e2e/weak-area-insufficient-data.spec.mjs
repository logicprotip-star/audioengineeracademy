// G319 (OLCUM-ZAYIF-KADEME-19-08, kanıtlandı) — getWeakTier/getWeakZone
// (core/exam-system.js, core/personalization.js) DÜZELTME ÖNCESİ tek aday
// kaldığında (yeni kullanıcı: sadece "kolay"da oynamış) o adayı isabeti
// %100 OLSA BİLE karşılaştırmasız "en zayıf" seçiyordu — cihazda yeni bir
// kullanıcıya "Zayıf kademen: Kolay" gösterilmişti. Düzeltme: en az İKİ
// karşılaştırılabilir aday (her biri >=MIN_TIER_SAMPLES/MIN_SAMPLES=10
// örnek) yoksa null döner, app.js:showExamScreen("makeup") artık bu
// durumda "Zayıf X: Y" DEMİYOR, "Henüz yeterli verin yok" diyor.
//
// exam-flow.spec.mjs'in AYNI deseni (10x #nextBtn = "Atla", her biri
// parkurda YANLIŞ sayılır, PARKUR_LENGTH=10 sonunda TOPLAM<6 doğruyla
// remedial-start tetiklenir) — bu dosya SADECE #exTitle METNİNİ, o akışın
// ÜSTÜNE, tierStats/zoneStats ÖNCEDEN SEED edilerek doğruluyor.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, activeScreenId } from "./helpers/app-fixtures.mjs";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

// extraSeedFn: reload'DAN ÖNCE, seedLocalStorage'ın DESTEKLEMEDİĞİ ek
// anahtarları (ör. fa_zonestats) yazmak için — seedLocalStorage KENDİSİ
// localStorage.clear() çağırdığı için SIRALAMA önemli (önce seedLocalStorage,
// SONRA extraSeedFn, SONRA reload).
async function setupAndFailParkur(page, modeId, seedOpts, extraSeedFn) {
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, seedOpts);
  if (extraSeedFn) await extraSeedFn(page);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, modeId);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  for (let i = 0; i < 10; i++) {
    await page.locator("#nextBtn").click();
    await page.waitForTimeout(200);
  }
  assert.equal(await activeScreenId(page), "screen-exam", "ön koşul: 10 yanlışlık parkur sonunda telafi anons ekranı açılmadı");
}

async function examTitle(page) {
  return page.evaluate(() => document.getElementById("exTitle")?.textContent || null);
}

test("G319 KABUL KRİTERİ — kademe: TEK kademe oynanmışsa (yeni kullanıcı) 'Henüz yeterli verin yok' çıkıyor, 'Zayıf kademen' DEMİYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  // stats seed YOK — kompresor bu moda hiç girilmemiş, tierStats boş.
  // Parkurun kendi 10 yanlışı TEK kademeye (level 1 → easy) yazılacak.
  await setupAndFailParkur(page, "kompresor", { dev: { simulatePro: true } });

  const title = await examTitle(page);
  assert.equal(title, "Henüz yeterli verin yok", `beklenmeyen başlık: "${title}"`);
  assert.ok(!/Zayıf/.test(title), `başlıkta hâlâ 'Zayıf' geçiyor: "${title}"`);
  await page.close();
});

test("G319 KABUL KRİTERİ — kademe: İKİ kademe var ama biri MIN_TIER_SAMPLES altındaysa YİNE 'Henüz yeterli verin yok' çıkıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  // "medium" 5 örnekle (eşiğin altında) seed edildi — parkurun kendi 10
  // yanlışı "easy"ye eklenince easy 10'a ulaşır (eşiği karşılar) ama
  // medium HÂLÂ eşiğin altında kalır — TEK geçerli aday, null beklenir.
  await setupAndFailParkur(page, "kompresor", {
    dev: { simulatePro: true },
    stats: { examState: { kompresor: { examLevel: 1, tierStats: { medium: { correct: 1, wrong: 4 } } } } }
  });

  const title = await examTitle(page);
  assert.equal(title, "Henüz yeterli verin yok", `beklenmeyen başlık: "${title}" (medium 5 örnekle YANLIŞLIKLA yeterli sayılmış olabilir)`);
  await page.close();
});

test("G319 KABUL KRİTERİ — kademe: İKİ kademe de yeterliyse DOĞRU zayıf kademe çıkıyor (FORMÜL değişmedi)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  // "medium" güçlü bir geçmişle (14 örnek, %86) ÖNCEDEN seed edildi —
  // parkurun kendi 10 yanlışı "easy"ye eklenir (level 1 → easy), easy
  // zayıf kalır. İki geçerli aday: easy (%0'a yakın, YENİ), medium (%86,
  // GÜÇLÜ) — easy açıkça daha zayıf.
  await setupAndFailParkur(page, "kompresor", {
    dev: { simulatePro: true },
    stats: { examState: { kompresor: { examLevel: 1, tierStats: { medium: { correct: 12, wrong: 2 } } } } }
  });

  const title = await examTitle(page);
  assert.notEqual(title, "Henüz yeterli verin yok", "yeterli veri varken 'yeterli veri yok' mesajı YANLIŞLIKLA çıktı");
  assert.ok(/^Zayıf kademen:/.test(title), `beklenen 'Zayıf kademen: …' biçimi değil: "${title}"`);
  await page.close();
});

test("G319 KABUL KRİTERİ — bölge: TEK bölge (hiç zoneStats yok) 'Henüz yeterli verin yok' çıkıyor, 'Zayıf bölgen' DEMİYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  // frekans-bulma EXAM_WEAK_AREA="zone" — "Atla" recordZone'u HİÇ
  // çağırmaz (SADECE mode-özel submit*Guess yolundan besleniyor), bu
  // yüzden zoneStats seed edilmese bile parkurun kendisi zone verisi
  // ÜRETMEZ — bu, "hiç zoneStats yok" senaryosunu doğal olarak sağlıyor.
  await setupAndFailParkur(page, "frekans-bulma", { dev: { simulatePro: true } });

  const title = await examTitle(page);
  assert.equal(title, "Henüz yeterli verin yok", `beklenmeyen başlık: "${title}"`);
  assert.ok(!/Zayıf/.test(title), `başlıkta hâlâ 'Zayıf' geçiyor: "${title}"`);
  await page.close();
});

test("G319 KABUL KRİTERİ — bölge: İKİ bölge de yeterliyse DOĞRU zayıf bölge çıkıyor (FORMÜL değişmedi)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  // fa_zonestats — storage.js:ZONESTATS_KEY, seedLocalStorage'ın DESTEK-
  // LEMEDİĞİ ayrı bir anahtar. SUB zayıf (n=15,ok=1), TİZ güçlü
  // (n=15,ok=14) — ikisi de eşiği (10) karşılıyor.
  await setupAndFailParkur(page, "frekans-bulma", { dev: { simulatePro: true } }, async (p) => {
    await p.evaluate(() => {
      localStorage.setItem("fa_zonestats", JSON.stringify({
        SUB: { n: 15, ok: 1, sumDOct: 12, dOctCount: 12 },
        TİZ: { n: 15, ok: 14, sumDOct: 0.5, dOctCount: 1 }
      }));
    });
  });

  const title = await examTitle(page);
  assert.notEqual(title, "Henüz yeterli verin yok", "yeterli veri varken 'yeterli veri yok' mesajı YANLIŞLIKLA çıktı");
  assert.ok(/^Zayıf bölgen:/.test(title), `beklenen 'Zayıf bölgen: …' biçimi değil: "${title}"`);
  assert.ok(title.includes("SUB"), `en zayıf bölge (SUB) başlıkta görünmüyor: "${title}"`);
  await page.close();
});

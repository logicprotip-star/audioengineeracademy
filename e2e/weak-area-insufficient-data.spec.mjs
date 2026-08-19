// G319 (OLCUM-ZAYIF-KADEME-19-08, kanıtlandı) — getWeakTier/getWeakZone
// (core/exam-system.js, core/personalization.js) DÜZELTME ÖNCESİ tek aday
// kaldığında (yeni kullanıcı: sadece "kolay"da oynamış) o adayı isabeti
// %100 OLSA BİLE karşılaştırmasız "en zayıf" seçiyordu — cihazda yeni bir
// kullanıcıya "Zayıf kademen: Kolay" gösterilmişti. Düzeltme: en az İKİ
// karşılaştırılabilir aday (her biri >=MIN_TIER_SAMPLES/MIN_SAMPLES=10
// örnek) yoksa null döner.
//
// G323 (OLCUM-TELAFI-HEDEF-19-08, kanıtlandı) — G319'un YUKARIDAKİ
// düzeltmesi ZONE-tipi 5 modda (Frekans Bulma/Kesim Noktası/Boost-Cut/
// Q Genişliği/Frekans Çakışması) telafinin SORU ÜRETİMİNİ de bozmuştu:
// `getWeakArea()`'nın zone dalı `value`'yu `insufficientData` ile AYNI
// koşula kenetliyordu (`weak ? weak.zone : null`) — "yeterli veri yok"
// olunca `focusRange` TAM SPEKTRUMA düşüyordu (telafi ARTIK telafi
// değildi). Düzeltme: zone dalı ARTIK tier dalıyla AYNI deseni izliyor —
// `value` HER ZAMAN gerçek bir hedef taşır (yeterli veri yoksa FA_ZONES'un
// ORTASINDAKİ bölgeye düşer, "medium" zorluğun AYNI rolü). EKRAN METNİ de
// DEĞİŞTİ (Logic'in kararı, "iddiasız gözlem"): "Zayıf X: Y" KESİN
// yargısı yerine "Bu turda X'e odaklanıyoruz — orada biraz daha çok
// zorlanmış görünüyorsun" (yeterli veri varsa) / "Bu turda X'e
// bakıyoruz" (yoksa) — İKİ durumda da AYNI hedef ADI geçiyor, SADECE
// ifadenin KESİNLİK derecesi farklı.
//
// exam-flow.spec.mjs'in AYNI deseni (10x #nextBtn = "Atla", her biri
// parkurda YANLIŞ sayılır, PARKUR_LENGTH=10 sonunda TOPLAM<6 doğruyla
// remedial-start tetiklenir) — bu dosya #exTitle METNİNİ VE (G323'ten
// itibaren) GERÇEKTEN üretilen telafi sorularının frekansını, tierStats/
// zoneStats ÖNCEDEN SEED edilerek doğruluyor.
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

// Aktif sorunun frekansını okur — __aeaActiveQuestionFreqForTest (G323,
// SADECE OKUR) kancasıyla.
async function readFreq(page) {
  return page.evaluate(() => window.__aeaActiveQuestionFreqForTest && window.__aeaActiveQuestionFreqForTest());
}

test("G319 KABUL KRİTERİ — kademe: TEK kademe oynanmışsa (yeni kullanıcı) 'yeterli veri yok' metni çıkıyor, KESİN 'Zayıf' yargısı YOK", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  // stats seed YOK — kompresor bu moda hiç girilmemiş, tierStats boş.
  // Parkurun kendi 10 yanlışı TEK kademeye (level 1 → easy) yazılacak.
  await setupAndFailParkur(page, "kompresor", { dev: { simulatePro: true } });

  const title = await examTitle(page);
  assert.equal(title, "Bu turda Orta kademesine bakıyoruz.", `beklenmeyen başlık: "${title}"`);
  assert.ok(!/^Zayıf/.test(title), `başlık HÂLÂ kesin bir 'Zayıf' yargısıyla başlıyor: "${title}"`);
  await page.close();
});

test("G319 KABUL KRİTERİ — kademe: İKİ kademe var ama biri MIN_TIER_SAMPLES altındaysa YİNE 'yeterli veri yok' metni çıkıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  // "medium" 5 örnekle (eşiğin altında) seed edildi — parkurun kendi 10
  // yanlışı "easy"ye eklenince easy 10'a ulaşır (eşiği karşılar) ama
  // medium HÂLÂ eşiğin altında kalır — TEK geçerli aday, null beklenir.
  await setupAndFailParkur(page, "kompresor", {
    dev: { simulatePro: true },
    stats: { examState: { kompresor: { examLevel: 1, tierStats: { medium: { correct: 1, wrong: 4 } } } } }
  });

  const title = await examTitle(page);
  assert.equal(title, "Bu turda Orta kademesine bakıyoruz.", `beklenmeyen başlık: "${title}" (medium 5 örnekle YANLIŞLIKLA yeterli sayılmış olabilir)`);
  await page.close();
});

test("G319 KABUL KRİTERİ — kademe: İKİ kademe de yeterliyse DOĞRU zayıf kademe adıyla 'odaklanıyoruz' metni çıkıyor (FORMÜL değişmedi)", async () => {
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
  assert.notEqual(title, "Bu turda Orta kademesine bakıyoruz.", "yeterli veri varken 'yeterli veri yok' metni YANLIŞLIKLA çıktı");
  assert.equal(title, "Bu turda Kolay kademesine odaklanıyoruz — orada biraz daha çok zorlanmış görünüyorsun.", `beklenmeyen başlık: "${title}"`);
  await page.close();
});

test("G319 KABUL KRİTERİ — bölge: TEK bölge (hiç zoneStats yok) 'yeterli veri yok' metni çıkıyor, KESİN 'Zayıf' yargısı YOK", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  // frekans-bulma EXAM_WEAK_AREA="zone" — "Atla" recordZone'u HİÇ
  // çağırmaz (SADECE mode-özel submit*Guess yolundan besleniyor), bu
  // yüzden zoneStats seed edilmese bile parkurun kendisi zone verisi
  // ÜRETMEZ — bu, "hiç zoneStats yok" senaryosunu doğal olarak sağlıyor.
  await setupAndFailParkur(page, "frekans-bulma", { dev: { simulatePro: true } });

  const title = await examTitle(page);
  assert.equal(title, "Bu turda ORTA bölgesine bakıyoruz.", `beklenmeyen başlık: "${title}"`);
  assert.ok(!/^Zayıf/.test(title), `başlık HÂLÂ kesin bir 'Zayıf' yargısıyla başlıyor: "${title}"`);
  await page.close();
});

test("G319 KABUL KRİTERİ — bölge: İKİ bölge de yeterliyse DOĞRU zayıf bölge adıyla 'odaklanıyoruz' metni çıkıyor (FORMÜL değişmedi)", async () => {
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
  assert.notEqual(title, "Bu turda ORTA bölgesine bakıyoruz.", "yeterli veri varken 'yeterli veri yok' metni YANLIŞLIKLA çıktı");
  assert.ok(/^Bu turda SUB bölgesine odaklanıyoruz —/.test(title), `beklenen 'Bu turda SUB bölgesine odaklanıyoruz —…' biçimi değil: "${title}"`);
  await page.close();
});

// G323 KABUL KRİTERİ — asıl bu turun konusu: METİN değişse de SORU
// ÜRETİMİ (mekanik) HER İKİ durumda da GERÇEKTEN bir hedefe odaklanmalı.
test("G323 KABUL KRİTERİ — bölge, YETERSİZ veri: telafi soruları YİNE DE hedeflenen (varsayılan ORTA) bölgeden geliyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await setupAndFailParkur(page, "frekans-bulma", { dev: { simulatePro: true } });

  const title = await examTitle(page);
  assert.equal(title, "Bu turda ORTA bölgesine bakıyoruz.", "ön koşul: yetersiz-veri metni bekleniyordu");

  // Telafi CTA'sına BİR KEZ basılır (round başlar) — sonraki sorular
  // #nextBtn ile normal round akışıyla geçilir, #exCta BİR DAHA görünmez.
  await page.locator("#exCta").click();
  await page.waitForTimeout(400);

  // ORTA (FA_ZONES'un TAM ORTASI, index 3/6) — frekans-bulma.js:200-207.
  const ORTA_MIN = 500, ORTA_MAX = 2000;
  for (let i = 0; i < 3; i++) {
    const freq = await readFreq(page);
    assert.ok(Number.isFinite(freq), `telafi sorusunun freq'i okunamadı (deneme ${i})`);
    assert.ok(freq >= ORTA_MIN && freq <= ORTA_MAX, `telafi sorusu ORTA bölgesi (${ORTA_MIN}-${ORTA_MAX}Hz) DIŞINDA — freq=${freq} (deneme ${i}) — DÜZELTME ÖNCESİ tam spektruma (80-17000Hz) düşerdi`);
    const nextBtn = page.locator("#nextBtn");
    if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.close();
});

test("G323 KABUL KRİTERİ — bölge, YETERLİ veri: telafi soruları GERÇEKTEN en zayıf bölgeden (SUB) geliyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await setupAndFailParkur(page, "frekans-bulma", { dev: { simulatePro: true } }, async (p) => {
    await p.evaluate(() => {
      localStorage.setItem("fa_zonestats", JSON.stringify({
        SUB: { n: 15, ok: 1, sumDOct: 12, dOctCount: 12 },
        TİZ: { n: 15, ok: 14, sumDOct: 0.5, dOctCount: 1 }
      }));
    });
  });

  const title = await examTitle(page);
  assert.ok(/^Bu turda SUB bölgesine odaklanıyoruz —/.test(title), "ön koşul: SUB'a odaklanma metni bekleniyordu");

  // Telafi CTA'sına BİR KEZ basılır (round başlar) — sonraki sorular
  // #nextBtn ile normal round akışıyla geçilir, #exCta BİR DAHA görünmez.
  await page.locator("#exCta").click();
  await page.waitForTimeout(400);

  // SUB — frekans-bulma.js:201 ({ a: 20, b: 120 }).
  const SUB_MIN = 20, SUB_MAX = 120;
  for (let i = 0; i < 3; i++) {
    const freq = await readFreq(page);
    assert.ok(Number.isFinite(freq), `telafi sorusunun freq'i okunamadı (deneme ${i})`);
    assert.ok(freq >= SUB_MIN && freq <= SUB_MAX, `telafi sorusu SUB bölgesi (${SUB_MIN}-${SUB_MAX}Hz) DIŞINDA — freq=${freq} (deneme ${i})`);
    const nextBtn = page.locator("#nextBtn");
    if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.close();
});

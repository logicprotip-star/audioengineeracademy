// G278 — Logic'in ürün kararı (OLCUM-CIHAZ2-17-08 madde B'nin hile analizi
// üzerine): oyun sırasında kaynak (ses) değiştirmek "Atla" SAYILMAMALI —
// can gitmemeli, bölüm/sınav sayacı ilerlememeli, mevcut soru DEĞİŞMEMELİ,
// kullanıcı normal şekilde cevap verebilmeli. G214'ün GERÇEK "Atla" butonu
// davranışına (yanlış cevap sayılması) BURADA DOKUNULMADI — SADECE kaynak
// DEĞİŞİMİNİN kendisinin (ayrı, kasıtsız bir eylem) bir ceza TETİKLEMEDİĞİ
// doğrulanıyor.
//
// ÖLÇÜLDÜ (bu turda): G275 (`syncAnswerArea()` eklemesi) BİLE bu 5 kriterin
// TAMAMINI ZATEN sağlıyordu — `els.sourceSelect`'in "change" handler'ı
// HİÇBİR round-sonlandırma/skor fonksiyonunu (loseLife/challengeTick/
// examSystem.recordAnswer) ÇAĞIRMIYOR, `activeQuestion` mid-round HİÇ
// mutasyona uğramıyor. Bu test dosyası bunu KİLİTLİYOR (regresyon koruması)
// — hem three-way OLMAYAN hem three-way (G277'nin dokunduğu) modlarda.

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

async function snapshot(page) {
  return page.evaluate(() => ({
    lives: document.getElementById("hearts")?.innerHTML,
    combo: document.getElementById("gameComboLabel")?.textContent,
    roundChip: document.getElementById("roundChip")?.textContent,
    chapterLabel: document.getElementById("gameChapterLabel")?.textContent,
    questionJSON: JSON.stringify(window.__aeaActiveQuestionChoices()),
  }));
}

async function changeSourceViaSheet(page, groupLabel, optionLabel) {
  await page.locator("[data-sheet-select='sourceSelect']").first().click();
  await page.waitForTimeout(300);
  await page.locator(".sheet-group-header", { hasText: groupLabel }).first().click();
  await page.waitForTimeout(200);
  await page.locator(".sheet-option", { hasText: optionLabel }).first().click();
  await page.waitForTimeout(500);
}

async function runInvariantCheck(page, modeId) {
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, modeId);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(600);
  await dismissSpotlightIfShown(page);
  if (await page.evaluate(() => document.getElementById("abToggle")?.classList.contains("loop"))) {
    await page.locator("#abToggle").click();
    await page.waitForTimeout(150);
  }

  const before_ = await snapshot(page);

  // Zamanlayıcı GERÇEKTEN duruyor mu — sheet açıkken ilerlememeli (aksi
  // halde sheet'te uzun süre kalan bir kullanıcı SÜRE DOLDUĞU için
  // cezalandırılabilir, bu da "kaynak değişimi ceza değil" ruhuna aykırı
  // olurdu).
  await page.locator("[data-sheet-select='sourceSelect']").first().click();
  await page.waitForTimeout(300);
  const timerDuring1 = await page.evaluate(() => document.getElementById("timerText")?.textContent);
  await page.waitForTimeout(1500);
  const timerDuring2 = await page.evaluate(() => document.getElementById("timerText")?.textContent);
  assert.equal(timerDuring2, timerDuring1, "Kaynak sheet'i açıkken zamanlayıcı İLERLEMEMELİ (round duraklatılmalı)");
  // Sheet'i kapatmadan devam — grup zaten açık değilse aç.
  await page.locator(".sheet-group-header", { hasText: "ENSTRÜMAN" }).first().click();
  await page.waitForTimeout(200);
  await page.locator(".sheet-option", { hasText: "Bas" }).first().click();
  await page.waitForTimeout(500);

  const after_ = await snapshot(page);

  assert.equal(after_.questionJSON, before_.questionJSON, "KABUL KRİTERİ: mevcut soru DEĞİŞMEMELİ");
  assert.equal(after_.lives, before_.lives, "KABUL KRİTERİ: can AYNI kalmalı");
  assert.equal(after_.combo, before_.combo, "KABUL KRİTERİ: kombo/sayaç İLERLEMEMELİ (yanlış cevap kaydedilmemeli)");
  assert.equal(after_.roundChip, before_.roundChip, "KABUL KRİTERİ: soru sayacı (roundChip) İLERLEMEMELİ");
  assert.equal(after_.chapterLabel, before_.chapterLabel, "KABUL KRİTERİ: BÖLÜM sayacı İLERLEMEMELİ");

  // Kullanıcı normal şekilde cevap verebiliyor mu (ve DOĞRU cevap
  // GERÇEKTEN doğru sayılıyor mu — önceden sessizce "yanlış" kaydedilmiş
  // olsaydı combo sıfırlanır, bir sonraki doğru cevap x1'den başlardı).
  const choices = await page.evaluate(() => window.__aeaActiveQuestionChoices());
  const isThreeWay = typeof choices[0].id === "string" && ["A", "B", "C"].includes(choices[0].id);
  let feedbackTitle;
  if (isThreeWay) {
    const correct = choices.find((c) => c.correct);
    const card = page.locator(`.ans[data-letter="${correct.id}"]`);
    assert.ok(await card.isVisible(), "doğru kart görünür/tıklanabilir olmalı (G275 regresyonu OLMAMALI)");
    await card.click();
    await page.waitForTimeout(150);
    assert.ok(!(await page.locator("#threeWayConfirmBtn").isDisabled()), "confirm butonu aktif olmalı");
    await page.locator("#threeWayConfirmBtn").click();
    await page.waitForTimeout(1000);
    feedbackTitle = await page.evaluate(() => document.getElementById("fbTitle")?.textContent);
  } else {
    const correctIdx = choices.findIndex((c) => c.correct);
    const ansBtn = page.locator(".ans").nth(correctIdx);
    assert.ok(await ansBtn.isVisible(), "doğru şık görünür/tıklanabilir olmalı (G275 regresyonu OLMAMALI)");
    await ansBtn.click();
    await page.waitForTimeout(1000);
    feedbackTitle = await page.evaluate(() => document.getElementById("fbTitle")?.textContent);
  }
  assert.ok(feedbackTitle && feedbackTitle.includes("Doğru"), `DOĞRU cevap DOĞRU sayılmalı (kaynak değişimi öncesinde sessizce "yanlış" kaydedilmemiş olmalı) — alınan başlık: "${feedbackTitle}"`);

  // KRİTİK — chapterLabel/roundChip'in ANLIK DOM metni kaynak değişimi
  // ANINDA renderGameHeader() tetiklenmediği için GÜNCELLENMEYEBİLİR (görsel
  // gecikme) — challenge.done/correct GİBİ bir SAYAÇ SESSİZCE mutasyona
  // uğrasa bile bu YUKARIDAKİ anlık karşılaştırmayı YAKALAMAZ. Asıl kanıt:
  // TEK bir GERÇEK doğru cevaptan SONRA sayaç TAM OLARAK "2. soru"yu
  // göstermeli (kaynak değişimi FANTOM bir "1. soru" eklemiş olmamalı).
  await new Promise((r) => setTimeout(r, 800));
  const afterAnswer = await snapshot(page);
  assert.match(afterAnswer.chapterLabel || "", /BÖLÜM 2\/10/, `BÖLÜM sayacı TEK gerçek cevaptan sonra "2/10" göstermeli (kaynak değişimi FANTOM bir sayaç artışı YAPMAMALI) — alınan: "${afterAnswer.chapterLabel}"`);
}

test("G278: kaynak değişimi — can/sayaç/soru DEĞİŞMİYOR, normal mod (Boost mu Cut mu)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await runInvariantCheck(page, "boost-mu-cut-mu");
  await page.close();
});

test("G278: kaynak değişimi — can/sayaç/soru DEĞİŞMİYOR, three-way mod (Distortion, G277'nin dokunduğu kod yolu)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await runInvariantCheck(page, "distortion");
  await page.close();
});

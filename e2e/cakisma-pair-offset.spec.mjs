// G288 — Frekans Çakışması: snare_late kaynağı + 5 offsetli çift. KABUL
// KRİTERİ: "5 çift doğru offset'le çalışıyor, döngüde hizalama bozulmuyor."
// KONTROL maddeleri: (1) çift seçici 5 çifti gösteriyor mu, (2) snare_late
// kaynak seçicide GÖRÜNMÜYOR mu, (3) döngüde offset korunuyor mu (3 çevrim).
//
// (3) GERÇEK 24.6sn'lik dosyalarla 3 tam çevrim ~74sn/çift × 5 çift — test
// suit'i için pratik değil. Bunun yerine OLCUM-CIFT-OFFSET-17-08.md'nin
// KENDİ ölçüm yöntemi (küçük sentetik buffer + OfflineAudioContext) BURADA
// KALICI bir regresyon testine dönüştürüldü — buildSampleSource'un dayandığı
// TEMEL mekanizma özelliğini (start(when,offset)+loop=true'nun offset'i
// HER döngüde KORUDUĞU, np.roll'un dairesel kaydırmasıyla eşdeğer olduğu)
// saniyeler içinde, gerçek tarayıcıda (Chromium) doğruluyor.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, dismissSpotlightIfShown } from "./helpers/app-fixtures.mjs";
import { SOURCE_PAIRS } from "../www/js/core/source-catalog.js";

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

async function dismissHeadphoneSheetIfShown(page) {
  const confirm = page.locator("#hpSheetConfirm");
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
    await page.waitForTimeout(150);
  }
}

async function selectCakismaPair(page, pairId) {
  await page.evaluate((id) => {
    const sel = document.getElementById("cakismaPairSelect");
    sel.value = id;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }, pairId);
}

test("KONTROL 1 — #cakismaPairSelect TAM 7 çifti (G295: +vokal2-clean/vokal2-akustik) + 'own'u gösteriyor, ESKİ çiftler (kick-bas/vokal-gitar/snare-arpej-gitar) YOK", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-cakismasi");

  const optionValues = await page.evaluate(() =>
    Array.from(document.getElementById("cakismaPairSelect").options).map(o => o.value)
  );
  const expected = [...SOURCE_PAIRS.map(p => p.id), "own"];
  assert.deepEqual(optionValues, expected, `#cakismaPairSelect'in option'ları SOURCE_PAIRS ile UYUŞMUYOR: ${optionValues.join(",")}`);
  for (const staleId of ["kick-bas", "vokal-gitar", "snare-arpej-gitar"]) {
    assert.ok(!optionValues.includes(staleId), `ESKİ çift '${staleId}' HÂLÂ seçicide`);
  }

  await page.close();
});

test("KONTROL 2 — snare_late genel kaynak seçicide (Frekans Bulma) GÖRÜNMÜYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, {});
  await page.reload();
  await page.waitForLoadState("networkidle");
  await enterMode(page, "frekans-bulma");
  await dismissSpotlightIfShown(page);

  await page.locator("#sourceChipWrap .setting-row").first().click();
  await page.waitForTimeout(200);
  const optionTexts = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".sheet-option")).map(el => el.textContent || "")
  );
  assert.ok(optionTexts.length > 0, "sheet-option listesi boş geldi — ön koşul başarısız");
  assert.ok(!optionTexts.some(t => t.includes("Snare (Geç)")), `snare_late ('Snare (Geç)') genel seçicide GÖRÜNDÜ: ${optionTexts.join(" | ")}`);

  await page.close();
});

test("KABUL KRİTERİ — 7 çiftin (G295: +vokal2-clean/vokal2-akustik) HEPSİ konsol hatasız round başlatıp önizleme çalabiliyor (offsetli buildDualSourceChain gerçek tarayıcıda)", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");

  for (const pair of SOURCE_PAIRS) {
    await enterMode(page, "frekans-cakismasi");
    await dismissSpotlightIfShown(page);
    await selectCakismaPair(page, pair.id);
    await dismissHeadphoneSheetIfShown(page);
    await page.locator("#startBtn").click();
    await page.waitForTimeout(500);
    await dismissHeadphoneSheetIfShown(page);
    // Oyun ekranının KENDİ spotlight turu (menü seviyesindeki turdan AYRI —
    // ear-buttons.spec.mjs/exit-abandons-round.spec.mjs'nin AYNI deseni:
    // startBtn TIKLANDIKTAN SONRA dismissSpotlightIfShown çağrılır).
    await dismissSpotlightIfShown(page);

    // KRİTİK regresyon kontrolü: frekans-cakismasi.js:createQuestion'ın
    // `pair: {...}` obje literali offsetA/offsetB'yi UNUTURSA (bu turda
    // GERÇEKTEN olmuştu, sonra düzeltildi) activeQuestion.pair.offsetA/B
    // SESSİZCE undefined kalır — hiçbir konsol hatası ÜRETMEZ, bu yüzden
    // yukarıdaki "konsol hatasız" kontrolü BUNU YAKALAYAMAZ.
    const activePair = await page.evaluate(() => window.__aeaActiveQuestionPairForTest());
    assert.ok(activePair, `[${pair.id}] activeQuestion.pair okunamadı`);
    assert.equal(activePair.offsetA, pair.offsetA, `[${pair.id}] activeQuestion.pair.offsetA SOURCE_PAIRS ile UYUŞMUYOR (sessizce 0'a düşmüş olabilir)`);
    assert.equal(activePair.offsetB, pair.offsetB, `[${pair.id}] activeQuestion.pair.offsetB SOURCE_PAIRS ile UYUŞMUYOR (sessizce 0'a düşmüş olabilir)`);

    // AŞAMA 1 önizleme butonları — buildDualSourceChain'i offsetli spec'le
    // TEKRAR (preview yolundan) tetikler, connectSource'un offsetSec dalını
    // İKİNCİ kez egzersiz eder (frekans-cakismasi.js:previewQuestion).
    const previewBtn = page.locator(".fb-ear").first();
    if (await previewBtn.isVisible().catch(() => false)) {
      await previewBtn.click();
      await page.waitForTimeout(300);
    }

    assert.deepEqual(errors, [], `[${pair.id}] round başlatma/önizleme sırasında konsol hatası: ${errors.join(" | ")}`);

    // Bir sonraki çift için tur'u terk et — G287'nin "Çık" akışı (ham
    // reload() round'u AKTİF bırakır, G203'ün kurtarma mantığı bir SONRAKİ
    // yüklemede aynı oyun ekranına döner, menü GÖRÜNMEZ hale gelirdi).
    await page.locator("#backBtn").click();
    await page.waitForTimeout(200);
    const exitConfirm = page.locator("#exitConfirmLeave");
    if (await exitConfirm.isVisible().catch(() => false)) {
      await exitConfirm.click();
      await page.waitForTimeout(200);
    }
  }

  await page.close();
});

test("KONTROL 3 (mekanizma) — start(when,offset)+loop=true offset'i HER döngüde KORUYOR (np.roll ile eşdeğer, OfflineAudioContext'te ölçüldü)", async () => {
  const page = await browser.newPage();
  await page.goto(serverHandle.baseUrl);

  const result = await page.evaluate(async () => {
    const sampleRate = 3000; // OfflineAudioContext min sınırı
    const bufferLen = 10;
    const offsetSamples = 3;
    const ctx = new OfflineAudioContext(1, bufferLen * 3, sampleRate);
    const buffer = ctx.createBuffer(1, bufferLen, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferLen; i++) data[i] = i + 1; // ayırt edici rampa
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(ctx.destination);
    src.start(0, offsetSamples / sampleRate);
    const rendered = await ctx.startRendering();
    return Array.from(rendered.getChannelData(0));
  });

  // 3 çevrimin ÜÇÜ de AYNI 10-örneklik desen — offset KALICI, sadece ilk
  // geçişte değil (OLCUM-CIFT-OFFSET-17-08.md'nin bulduğu, YANLIŞ bir
  // "sadece ilk geçiş" varsayımının TERSİ).
  const cycle = [4, 5, 6, 7, 8, 9, 10, 1, 2, 3];
  assert.deepEqual(result.slice(0, 10), cycle, "1. çevrim beklenen kaydırılmış deseni vermedi");
  assert.deepEqual(result.slice(10, 20), cycle, "2. çevrim 1. çevrimden FARKLI — offset döngüde KORUNMUYOR");
  assert.deepEqual(result.slice(20, 30), cycle, "3. çevrim 1. çevrimden FARKLI — offset döngüde KORUNMUYOR");

  await page.close();
});

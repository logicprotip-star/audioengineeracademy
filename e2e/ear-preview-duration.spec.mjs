// G318 (OLCUM-KULAK-SES-19-08, canlı ölçüldü) — kulak butonuna basmak
// roundFlow.captureRemainingAndClear() ile otomatik-geçiş süresinin KALANINI
// yakalıyordu, 3 saniyelik önizleme penceresi (CMP_PREVIEW_RESUME_MS) BİTİNCE
// bu TAM süreyi SIFIRDAN yeniden kuruyordu — toplam geri bildirim süresi
// KATLANIYORDU (ölçülen: ~5.5-6sn → ~8.5-10sn), o ek süre boyunca stopAudio()
// hiç çağrılmadığı için önizleme sesi kesintisiz sürüyordu. DÜZELTME
// (app.js'in kulak-butonu click handler'ının SONU, `.fb-ear` dalı): artık
// 3 saniye `remain`'den DÜŞÜLÜYOR — 3sn'lik pencere KENDİSİ DEĞİŞMEDİ
// (DOKUNULMAYACAK), SADECE onu takip eden yeniden-kurulum aynı bütçeyi
// İKİNCİ KEZ eklemiyor.
//
// Otomatik-geçiş süresi RASTGELE DEĞİL — app.js'in HER submit* handler'ının
// ortak sonu: `scheduleNext(prefs.feedbackScreen ? (result.correct ? 4000 :
// 6000) : QUICK_ADVANCE_MS)`. seedLocalStorage'ın varsayılanı
// feedbackScreen:true — yani DOĞRU cevapta 4000ms, YANLIŞ cevapta 6000ms
// SABİT. Test bu YÜZDEN iki AYRI sayfa/round arasında baseline KARŞILAŞTIRMASI
// YAPMIYOR (zorluk/soru rastgeleliği D'yi kirletebilirdi) — cevabın doğru/
// yanlış olduğunu DOM'dan (feedbackBox.bad) okuyup BEKLENEN D'yi (4000/6000)
// doğrudan hesaplıyor, kulak butonuna basılan senaryoda GERÇEK ilerleme
// süresinin bu BEKLENEN D'ye (küçük bir toleransla) eşit kaldığını,
// DÜZELTME ÖNCESİ davranışın (D+~3000ms KATLANMA) artık ÜRETİLMEDİĞİNİ
// doğruluyor.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage, enterMode, dismissSpotlightIfShown, dismissExamScreenIfShown } from "./helpers/app-fixtures.mjs";

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
    await page.waitForTimeout(200);
  }
}

async function stopAudioCallCount(page) {
  return page.evaluate(() => window.__aeaStopAudioCallCount());
}

async function activeChoicesSnapshot(page) {
  return page.evaluate(() => JSON.stringify(window.__aeaActiveQuestionChoices()));
}

// DÜRÜSTLÜK NOTU (bu turda ölçülerek bulundu): stopAudioCallCount TEK BAŞINA
// "round ilerledi" için GÜVENİLİR DEĞİL — kulak butonuna basmanın KENDİSİ de
// (buildQuestionChain önizleme zincirini kurarken) bir `stopAudio()` çağırıyor,
// bu da round henüz ilerlemeden SAYACI artırıyor (yarış — click'in async
// handler'ı `countBefore` okumasından SONRA da tamamlanabiliyor). Güvenilir
// imza `activeQuestion`'IN KENDİSİNİN değişmesi — o SADECE startRound()'da
// (YENİ round'un GERÇEK kurulumu) yeniden atanıyor, kulak butonu ASLA
// dokunmuyor. `__aeaActiveQuestionChoices()` bunu mod-bağımsız okuyor.
async function waitForRoundAdvance(page, snapshotBefore, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const snap = await activeChoicesSnapshot(page);
    if (snap !== snapshotBefore) return Date.now() - start;
    await page.waitForTimeout(100);
  }
  return null; // zaman aşımı — ilerlemedi
}

test("G318 KABUL KRİTERİ — kulak butonuna basılıp hiçbir şeye dokunulmazsa toplam geri bildirim süresi KATLANMIYOR", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true }, playMode: "challenge" });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await dismissSpotlightIfShown(page);
  await enterMode(page, "kesim-noktasi");
  await dismissHeadphoneSheetIfShown(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(500);
  await dismissExamScreenIfShown(page);
  await dismissSpotlightIfShown(page);

  // İLK şıkka bas — doğru/yanlış olması ÖNEMLİ DEĞİL, ikisi de deterministik
  // bir D üretiyor (4000/6000), aşağıda DOM'dan okunup BEKLENEN süre buna göre
  // hesaplanıyor.
  await page.locator(".ans").first().click();
  await page.waitForTimeout(350);
  const correct = !(await page.evaluate(() => document.getElementById("feedbackBox")?.classList.contains("bad")));
  const expectedD = correct ? 4000 : 6000;

  // ear-buttons.spec.mjs'in AYNI notu — `.fb`'nin .3s'lik CSS geçişi
  // sırasında buton "hidden" class'ını GEÇ kaldırabiliyor, sabit bir
  // waitForTimeout yerine POLLING (o dosyanın earDatasetStable'ı).
  await page.waitForFunction(
    () => !document.getElementById("fbEarRight")?.classList.contains("hidden"),
    { timeout: 3000 }
  );

  const snapshotBefore = await activeChoicesSnapshot(page);
  await page.locator("#fbEarRight").click({ timeout: 5000 });
  const elapsed = await waitForRoundAdvance(page, snapshotBefore, expectedD + 6000);
  assert.ok(elapsed !== null, `kulak butonuna basılan round zaman aşımına kadar (D+6000=${expectedD + 6000}ms) hiç ilerlemedi`);

  // DÜZELTME ÖNCESİ: elapsed ≈ 3000 (önizleme penceresi) + expectedD (TAM
  // remain'in sıfırdan yeniden kurulması) ≈ expectedD+3000. DÜZELTME SONRASI:
  // elapsed ≈ expectedD (katlanmadan). 1500ms tolerans — tıklama/DOM
  // gecikmesi + round-flow'un kendi 1500ms varsayılan payı için.
  assert.ok(
    elapsed < expectedD + 1500,
    `kulak butonu sonrası round ilerleme süresi KATLANDI (beklenen D=${expectedD}ms, ölçülen=${elapsed}ms, correct=${correct}) — DÜZELTME ÖNCESİ davranış: süre ~3sn+ katlanıyordu`
  );

  await page.close();
});

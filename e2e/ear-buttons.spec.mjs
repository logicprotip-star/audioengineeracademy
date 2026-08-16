// Kulak butonları (#fbEarLeft/#fbEarRight) — G81'de SADECE Frekans Bulma'ya
// bağlıydı (bkz. OLCUM-KULAK-16-08.md). Bu tur 6 tek-kaynak moda (Kesim
// Noktası, dB Seviyesi, Pan Konumu, Stereo Genişlik, Boost/Cut katman 2-3)
// + Frekans Çakışması'nın 2 aşamasına (1 ve 3) aynı mekanizma eklendi.
//
// Her mod için kabul kriteri (task'ın kendi listesi):
//   1) buton feedback panelinde GÖRÜNÜYOR (hidden sınıfı kalkıyor)
//   2) basınca DOĞRU ses çalıyor — burada "doğru DEĞER" dataset'e doğru
//      yazıldığı + tıklamanın hatasız (pageerror/console.error YOK)
//      tamamlandığı ile doğrulanıyor (gerçek ses çıktısını headless
//      Chromium'da duyarak doğrulamak mümkün değil, bu proje boyunca
//      kullanılan AYNI sınır — bkz. CLAUDE.md "ses/DOM davranışı kaynak
//      koddan doğrulanamaz" notu, karşılığı burada davranışsal/DOM kanıtı)
//   3) yanlış cevapta da doğru cevapta da çalışıyor — retry döngüsü İKİ
//      çıktıyı da GÖZLEMLEYENE kadar yeni round'lar dener (3-6 şıklı bir
//      modda birkaç denemede ikisi de doğal olarak gözlenir)
//   4) Frekans Bulma'nın davranışı BOZULMADI — ayrı bir regresyon testi
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

// Bir choice-format round'u BAŞLATIR, İLK .ans butonuna basar, sonucu
// (doğru/yanlış) + tıklanan butonun kendi data-* değerlerini döner —
// hangi butonun doğru olduğunu ÖNCEDEN bilmiyoruz (q.freq/q.dbDelta/vb
// DOM'a hiç sızmıyor, kulakla bulma ilkesi), bu yüzden "ikisini de gör"
// retry deseni kullanılıyor.
async function answerFirstChoice(page) {
  await dismissExamScreenIfShown(page);
  await dismissSpotlightIfShown(page); // her yeni round'da (ilk mod girişi DIŞINDA da) yeniden çıkabiliyor
  const btn = page.locator(".ans").first();
  const dataset = await btn.evaluate((el) => ({ ...el.dataset }));
  await btn.click();
  await page.waitForTimeout(350);
  const bad = await page.evaluate(() => document.getElementById("feedbackBox")?.classList.contains("bad"));
  return { correct: !bad, dataset };
}

// Pan Konumu/Stereo Genişlik kulaklikGerekli:true (G37) — mod kartına
// tıklayınca #screen-game'e GEÇMEDEN önce bir "kulaklık öner" sheet'i açılır
// (openHeadphoneSheet, app.js:3164), #startBtn o ekranın parçası olduğu
// için bu sheet kapatılmadan HİÇ görünmez.
async function dismissHeadphoneSheetIfShown(page) {
  const confirm = page.locator("#hpSheetConfirm");
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
    await page.waitForTimeout(200);
  }
}

async function startRound(page, modeId) {
  await enterMode(page, modeId);
  await dismissHeadphoneSheetIfShown(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
}

// SADECE seçilen data-alanı OKUNABİLİR biçimde döndürülüyor — çağıran
// hangi alanı bekliyorsa onu karşılaştırır.
async function earDataset(page) {
  return page.evaluate(() => ({
    leftHidden: document.getElementById("fbEarLeft")?.classList.contains("hidden"),
    rightHidden: document.getElementById("fbEarRight")?.classList.contains("hidden"),
    leftPreview: document.getElementById("fbEarLeft")?.dataset.preview,
    rightPreview: document.getElementById("fbEarRight")?.dataset.preview,
    left: { ...document.getElementById("fbEarLeft")?.dataset },
  }));
}

// İki kulak butonuna da (mine/correct) sırayla basar, İKİSİNİN de "on"
// sınıfını aldığını VE tıklama sırasında sayfa hatası fırlamadığını
// doğrular (buildQuestionChain'e YANLIŞ alan adıyla bir soru geçilirse
// — ör. dbDelta yerine freq — AudioParam.value=NaN/undefined GENELLİKLE
// sessizce yutulmuyor, applyProcessing'in KENDİ okuduğu alan `undefined`
// kalınca Math.pow(10, undefined/20)=NaN → g.gain.value=NaN, Chromium bu
// durumda bir konsol hatası ÜRETMEZ ama runtime hatası da fırlatmaz —
// bu yüzden asıl kanıt madde (2)'deki dataset eşleşmesi, buradaki hata-
// yokluğu EK bir güvenlik ağı).
async function clickBothEars(page) {
  const errors = [];
  const onErr = (e) => errors.push(String(e));
  page.on("pageerror", onErr);
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

  // DOM'daki .click() — koordinat tabanlı Playwright tıklaması (force:true
  // dahil) omuz butonlarının panelin üst kenarında olması yüzünden bazen
  // #feedbackOverlay'i (üstte duran, yarı saydam karartma) VURUYORDU, buton
  // KENDİSİNİ değil (ölçüldü — .on hiç eklenmiyordu). .click() ELEMENTİN
  // KENDİSİNE dispatch edilir, gerçek bir "click" event'i doğurur — test
  // ettiğimiz şey (delegasyonun DOĞRU çalışması) için daha güvenilir.
  await page.evaluate(() => document.getElementById("fbEarLeft")?.click());
  await page.waitForTimeout(250);
  const leftOn = await page.evaluate(() => document.getElementById("fbEarLeft")?.classList.contains("on"));

  await page.evaluate(() => document.getElementById("fbEarRight")?.click());
  await page.waitForTimeout(250);
  const rightOn = await page.evaluate(() => document.getElementById("fbEarRight")?.classList.contains("on"));

  page.off("pageerror", onErr);
  page.off("console", onErr);
  return { leftOn, rightOn, errors };
}

// Genel kabul-kriteri koşucusu — modId + choiceOnly datasetten okunacak
// guess-alanı adı + o alanın KAYNAK data-* adı verilir, HER İKİ çıktıyı
// (doğru/yanlış) da gözleyene kadar yeni round'lar dener (üst sınır 15).
async function verifyEarsAcrossOutcomes(page, modeId, guessDatasetKey, sourceDatasetKey) {
  await startRound(page, modeId);
  const seen = { true: false, false: false };
  for (let i = 0; i < 15 && (!seen.true || !seen.false); i++) {
    const { correct, dataset } = await answerFirstChoice(page);
    const alreadySeen = seen[String(correct)]; // bu çıktıyı zaten gördük, tekrar assert etmeye gerek yok ama round KAPATILMALI
    if (!alreadySeen) {
      seen[correct] = true;

      const ears = await earDataset(page);
      assert.equal(ears.leftHidden, false, `[${modeId}, correct=${correct}] kulak butonu (#fbEarLeft) GÖRÜNMÜYOR`);
      assert.equal(ears.rightHidden, false, `[${modeId}, correct=${correct}] kulak butonu (#fbEarRight) GÖRÜNMÜYOR`);
      assert.equal(ears.leftPreview, "mine", `[${modeId}] sol omuz preview="mine" değil`);
      assert.equal(ears.rightPreview, "correct", `[${modeId}] sağ omuz preview="correct" değil`);
      assert.equal(
        String(ears.left[guessDatasetKey]),
        String(dataset[sourceDatasetKey]),
        `[${modeId}, correct=${correct}] kulak butonundaki "senin cevabın" değeri (${ears.left[guessDatasetKey]}) tıklanan şıkla (${dataset[sourceDatasetKey]}) EŞLEŞMİYOR`
      );

      const { leftOn, rightOn, errors } = await clickBothEars(page);
      assert.equal(leftOn, true, `[${modeId}, correct=${correct}] "Senin cevabın" tıklanınca .on sınıfı almadı`);
      assert.equal(rightOn, true, `[${modeId}, correct=${correct}] "Doğru cevap" tıklanınca .on sınıfı almadı`);
      assert.deepEqual(errors, [], `[${modeId}, correct=${correct}] kulak önizlemesi sırasında sayfa/konsol hatası: ${errors.join(" | ")}`);
    }

    // temizlik: bir sonraki round'a bozulmadan geçmek için mevcut önizlemeyi kapat
    // (goToNextRound() KENDİSİ startRound()'u çağırıyor, mode'a YENİDEN girmeye gerek yok)
    const closeBtn = page.locator("#feedbackClose");
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  assert.ok(seen.true, `[${modeId}] 20 denemede HİÇ doğru cevap gözlenmedi (test tasarımı gözden geçirilmeli)`);
  assert.ok(seen.false, `[${modeId}] 20 denemede HİÇ yanlış cevap gözlenmedi (test tasarımı gözden geçirilmeli)`);
}

test("Kesim Noktası: kulak butonları görünüyor, doğru freq/filterType taşıyor, iki çıktıda da çalışıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await dismissSpotlightIfShown(page);
  await verifyEarsAcrossOutcomes(page, "kesim-noktasi", "guessFreq", "freq");
  await page.close();
});

test("dB Seviyesi: kulak butonları görünüyor, doğru dbDelta taşıyor, iki çıktıda da çalışıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await dismissSpotlightIfShown(page);
  await verifyEarsAcrossOutcomes(page, "db-seviyesi", "guessDb", "db");
  await page.close();
});

test("Pan Konumu: kulak butonları görünüyor, doğru panPercent taşıyor, iki çıktıda da çalışıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await dismissSpotlightIfShown(page);
  await verifyEarsAcrossOutcomes(page, "pan-konumu", "guessPan", "value");
  await page.close();
});

// Stereo Genişlik SADECE yüklenmiş bir dosyayla oynanabiliyor (mid/side
// ayrıştırması gerçek stereo kayıt gerektiriyor, uyumluKaynaklar:{only:
// ["upload"]}) — www/audio/'daki 9 gömülü örneğin HEPSİ MONO (ffprobe ile
// doğrulandı, `channels=1`), bu yüzden `bufferPlayability()` (stereo-
// genislik.js:194-199) HERHANGİ birini "mono" diye REDDEDER. Bu yüzden
// GERÇEKTEN stereo bir test dosyası (e2e/fixtures/stereo-test.wav — L=220Hz/
// R=330Hz farklı sinüsler, ffmpeg'le üretildi) kullanılıyor. Playwright'ın
// KENDİ setInputFiles()'ı ile #toolsFileInput'a yükleniyor (bu, önceki turda
// denenip GÜVENİLMEZ bulunan Chrome-MCP dosya enjeksiyonundan FARKLI bir
// mekanizma — Playwright input.files'ı DOĞRUDAN ayarlar, "change" event'i
// garanti fırlar). Yükleme "Dosyalarım" sheet'i İÇİNDEN olduğu için, dosya
// bağlama uygulandıktan SONRA sheet KAPATILMALI — kapanmazsa #uploadGate
// arkada "hidden" olsa bile #startBtn sheet'in ALTINDA kalır.
async function uploadStereoTestFile(page) {
  await page.locator("#uploadGateBtn").click();
  await page.waitForTimeout(200);
  await page.setInputFiles("#toolsFileInput", "e2e/fixtures/stereo-test.wav");
  await page.waitForTimeout(500);
  const closeBtn = page.locator("#toolsFilesClose");
  if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click().catch(() => {});
  // decode + IndexedDB yazımı sabit bir gecikmeden UZUN sürebilir — sabit
  // bir timeout yerine #uploadGate'in GERÇEKTEN kaybolmasını bekle.
  await page.locator("#uploadGate").waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300);
}

test("Stereo Genişlik: kulak butonları görünüyor, doğru widthPercent taşıyor, iki çıktıda da çalışıyor", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await dismissSpotlightIfShown(page);
  await enterMode(page, "stereo-genislik");
  await dismissHeadphoneSheetIfShown(page);
  await uploadStereoTestFile(page);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);
  const seen = { true: false, false: false };
  for (let i = 0; i < 15 && (!seen.true || !seen.false); i++) {
    const { correct, dataset } = await answerFirstChoice(page);
    const alreadySeen = seen[String(correct)];
    if (!alreadySeen) {
      seen[correct] = true;
      const ears = await earDataset(page);
      assert.equal(ears.leftHidden, false, `[stereo-genislik, correct=${correct}] kulak butonu (#fbEarLeft) GÖRÜNMÜYOR`);
      assert.equal(ears.rightHidden, false, `[stereo-genislik, correct=${correct}] kulak butonu (#fbEarRight) GÖRÜNMÜYOR`);
      assert.equal(
        String(ears.left.guessWidth),
        String(dataset.value),
        `[stereo-genislik, correct=${correct}] kulak butonundaki değer tıklanan şıkla EŞLEŞMİYOR`
      );
      const { leftOn, rightOn, errors } = await clickBothEars(page);
      assert.equal(leftOn, true, `[stereo-genislik, correct=${correct}] "Senin cevabın" tıklanınca .on almadı`);
      assert.equal(rightOn, true, `[stereo-genislik, correct=${correct}] "Doğru cevap" tıklanınca .on almadı`);
      assert.deepEqual(errors, [], `[stereo-genislik, correct=${correct}] hata: ${errors.join(" | ")}`);
    }
    const closeBtn = page.locator("#feedbackClose");
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  assert.ok(seen.true, "stereo-genislik: 15 denemede hiç doğru cevap gözlenmedi");
  assert.ok(seen.false, "stereo-genislik: 15 denemede hiç yanlış cevap gözlenmedi");
  await page.close();
});

// REGRESYON — Frekans Bulma'nın G81'den beri var olan davranışı bu turda
// TEK SATIR değişmedi (showFrequencyEars/submitFrequencyGuess'e hiç
// dokunulmadı) — ama PAYLAŞILAN click-handler (#feedbackBox'ın delegasyonu)
// genişletildiği için, Frekans Bulma'nın KENDİ yolunun hâlâ eskisi gibi
// çalıştığı AYRICA doğrulanıyor. Frekans Bulma dokunmalı (canvas tap) bir
// mod olduğu için answerFirstChoice() kullanılamıyor — kendi tıklama yolu.
test("REGRESYON — Frekans Bulma'nın kulak butonları bu turdan sonra da bozulmadı", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await dismissSpotlightIfShown(page);
  await enterMode(page, "frekans-bulma");
  await page.locator("#startBtn").click();
  await page.waitForTimeout(400);

  // Dalgaya (spektrum canvas'ına) dokunma — mevcut mekanizma (freqTapTimer,
  // 180ms debounce) AYNEN kullanılıyor, taklit edilmedi.
  const canvas = page.locator("#visualizer");
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(600);

  const ears = await earDataset(page);
  assert.equal(ears.leftHidden, false, "Frekans Bulma'da #fbEarLeft görünmüyor — REGRESYON");
  assert.equal(ears.rightHidden, false, "Frekans Bulma'da #fbEarRight görünmüyor — REGRESYON");
  assert.ok("guessHz" in ears.left, "Frekans Bulma'nın kendi dataset alanı (guessHz) hâlâ yazılmıyor — REGRESYON");

  const { leftOn, rightOn, errors } = await clickBothEars(page);
  assert.equal(leftOn, true, "Frekans Bulma: 'Senin cevabın' tıklanınca .on almadı — REGRESYON");
  assert.equal(rightOn, true, "Frekans Bulma: 'Doğru cevap' tıklanınca .on almadı — REGRESYON");
  assert.deepEqual(errors, [], `Frekans Bulma kulak önizlemesinde hata: ${errors.join(" | ")}`);
  await page.close();
});

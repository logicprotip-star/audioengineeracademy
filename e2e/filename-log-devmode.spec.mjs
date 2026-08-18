// G296 (OLCUM-GUVENLIK-18-08 madde 3) — kullanıcının dosya adını taşıyan 4
// console.log satırı (app.js:6805/9263/10245 + JSON.stringify(result)'lı
// filepicker-diag satırı) artık `if (DEV_MODE) console.log(...)` ile
// sarmalı. Repo'nun committed hâli HER ZAMAN DEV_MODE=true (build-flags.js'in
// KENDİ G239 tripwire kuralı) — bu yüzden "DEV_MODE=false'ta susuyor mu"
// SORUSUNU test etmek için core/build-flags.js'i `page.route()` ile
// DEV_MODE=false döndürecek şekilde YAKALAYIP değiştiriyoruz (repo dosyası
// DEĞİŞMİYOR, SADECE bu test sayfasının ağ isteği). Diğer 23 koşulsuz
// [filepicker-diag]/[guide-i-diag]/[scroll-diag] satırına (dosya adı
// TAŞIMAYANlar) BİLEREK DOKUNULMADI — bu test SADECE dosya-adı-taşıyan
// satırları izliyor.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startStaticServer } from "./helpers/static-server.mjs";
import { seedLocalStorage } from "./helpers/app-fixtures.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_FLAGS_PATH = path.resolve(__dirname, "..", "www", "js", "core", "build-flags.js");
const REAL_BUILD_FLAGS_SRC = fs.readFileSync(BUILD_FLAGS_PATH, "utf8");

let serverHandle, browser;

before(async () => {
  serverHandle = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser.close();
  await serverHandle.close();
});

// Küçük, geçerli bir WAV dosyası — sadece yükleme akışını GERÇEKTEN
// tetiklemek için (içerik önemsiz, kısa bir sinüs).
function makeTestWav() {
  const numFrames = 4410; // 0.1sn @44100
  const buf = Buffer.alloc(44 + numFrames * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + numFrames * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(44100, 24); buf.writeUInt32LE(44100 * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(numFrames * 2, 40);
  for (let i = 0; i < numFrames; i++) buf.writeInt16LE(Math.round(Math.sin(i * 0.1) * 20000), 44 + i * 2);
  return buf;
}

const TEST_FILE_NAME = "gizli-kisisel-dosya-adi.wav";

async function uploadViaToolsSheet(page, filePath) {
  await page.locator('.tab[data-tab="tools"]').click();
  await page.waitForTimeout(300);
  await page.locator("#toolsGearBtn, #toolsUploadBtn").first().click();
  await page.waitForTimeout(300);
  await page.locator("#toolsFileInput").setInputFiles(filePath);
  await page.waitForTimeout(1500);
}

test("KABUL KRİTERİ — DEV_MODE=false iken dosya adı HİÇBİR console mesajında GEÇMİYOR", async () => {
  const tmpDir = fs.mkdtempSync("/tmp/aea-devmode-test-");
  const filePath = path.join(tmpDir, TEST_FILE_NAME);
  fs.writeFileSync(filePath, makeTestWav());

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const consoleMessages = [];
  page.on("console", (msg) => consoleMessages.push(msg.text()));

  // build-flags.js isteğini yakala, DEV_MODE'u false'a çevrilmiş bir
  // kopyasını dön — repoya HİÇ dokunulmadı, sadece bu sayfanın ağ isteği.
  await page.route("**/js/core/build-flags.js", (route) => {
    const fakeSrc = REAL_BUILD_FLAGS_SRC.replace("export const DEV_MODE = true;", "export const DEV_MODE = false;");
    assert.notEqual(fakeSrc, REAL_BUILD_FLAGS_SRC, "ön koşul: DEV_MODE=true satırı bulunamadı, route yakalama geçersiz");
    route.fulfill({ contentType: "text/javascript; charset=utf-8", body: fakeSrc });
  });

  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");

  await uploadViaToolsSheet(page, filePath);

  const leaked = consoleMessages.filter((m) => m.includes(TEST_FILE_NAME));
  assert.deepEqual(leaked, [], `DEV_MODE=false iken dosya adı console'da GÖRÜNDÜ: ${leaked.join(" | ")}`);

  // Yükleme akışının KENDİSİ hâlâ çalışıyor mu (mesaj bastırma, İŞLEVİ
  // BOZMAMALI) — dosya kütüphaneye eklendi mi.
  const added = await page.locator("#toolsFilesList .tools-files-row-name", { hasText: TEST_FILE_NAME }).count();
  assert.ok(added > 0, "DEV_MODE=false'ta dosya yükleme İŞLEVİ bozulmamalı — dosya listeye eklenmedi");

  await page.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("REGRESYON KORUMASI — DEV_MODE=true (repo'nun GERÇEK committed hâli) iken dosya adı loglama DAVRANIŞI DEĞİŞMEDİ", async () => {
  const tmpDir = fs.mkdtempSync("/tmp/aea-devmode-test-");
  const filePath = path.join(tmpDir, TEST_FILE_NAME);
  fs.writeFileSync(filePath, makeTestWav());

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const consoleMessages = [];
  page.on("console", (msg) => consoleMessages.push(msg.text()));

  await page.goto(serverHandle.baseUrl);
  await seedLocalStorage(page, { dev: { simulatePro: true } });
  await page.reload();
  await page.waitForLoadState("networkidle");

  await uploadViaToolsSheet(page, filePath);

  const seen = consoleMessages.filter((m) => m.includes(TEST_FILE_NAME));
  assert.ok(seen.length > 0, "DEV_MODE=true (normal geliştirme hâli) iken dosya adı loglanmalı — regresyon: loglama tamamen KAPANMIŞ olabilir");

  await page.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

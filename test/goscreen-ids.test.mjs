// G274 — OLCUM-SATURATION-17-08 madde A'nın düzeltmesi: goScreen("home") 5
// yerde VAR OLMAYAN bir ekran id'sine (#screen-home, gerçek id #screen-menu)
// gidiyordu — TÜM .screen elementleri "active" sınıfını kaybediyordu, siyah
// ekran (bkz. www/js/app.js:goScreen). Bu test AYNI hatanın (goScreen()'e
// index.html'de KARŞILIĞI olmayan bir isim geçmek) bir daha SESSİZCE
// geçmemesini garanti ediyor — kaynak dosyaları TEXT olarak okuyup literal
// goScreen("x") çağrılarını index.html'in GERÇEK screen-x id'leriyle
// karşılaştırıyor (audio-engine.js'in "kaynak koddan doğrulanamaz" kuralı
// BURADA GEÇERLİ DEĞİL — bu saf metin/string eşleştirmesi, ses/DOM
// davranışı değil).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_JS_PATH = join(__dirname, "../www/js/app.js");
const INDEX_HTML_PATH = join(__dirname, "../www/index.html");

// Yorum satırlarını (// ... ve /* ... */) SİLER — aksi halde bu dosyanın
// KENDİSİ gibi "goScreen("home") KIRIKTI" diye AÇIKLAYAN bir kod yorumu bile
// yanlışlıkla bir "çağrı" olarak eşleşip testi SAHTE kırmızıya düşürebilir.
function stripComments(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, "");
  out = out.replace(/\/\/.*$/gm, "");
  return out;
}

function extractLiteralGoScreenCalls(src) {
  const clean = stripComments(src);
  const matches = clean.matchAll(/\bgoScreen\(\s*["']([a-zA-Z-]+)["']\s*\)/g);
  return [...matches].map(m => m[1]);
}

function extractRealScreenIds(html) {
  const matches = html.matchAll(/id="screen-([a-zA-Z-]+)"/g);
  return new Set([...matches].map(m => m[1]));
}

describe("goScreen() çağrıları — literal isimler GERÇEK #screen-* id'lerine karşılık geliyor mu", () => {
  const appJs = readFileSync(APP_JS_PATH, "utf8");
  const indexHtml = readFileSync(INDEX_HTML_PATH, "utf8");
  const calls = extractLiteralGoScreenCalls(appJs);
  const realIds = extractRealScreenIds(indexHtml);

  it("KABUL KRİTERİ — en az bir literal goScreen(\"...\") çağrısı bulundu (test'in kendisi anlamsız kalmasın)", () => {
    assert.ok(calls.length > 5, `sadece ${calls.length} literal çağrı bulundu — regex bozulmuş olabilir`);
  });

  it("index.html'de en az bir #screen-* elementi bulundu (karşılaştırma anlamlı olsun)", () => {
    assert.ok(realIds.size > 5, `sadece ${realIds.size} ekran id'si bulundu — regex bozulmuş olabilir`);
  });

  it("her literal goScreen(\"x\") çağrısının GERÇEK bir #screen-x elementi var — REGRESYON: goScreen(\"home\")'un 5 kırık çağrısı", () => {
    const invalid = [...new Set(calls)].filter(name => !realIds.has(name));
    assert.deepEqual(invalid, [], `goScreen() şu GEÇERSİZ isim(ler)le çağrılıyor (index.html'de karşılığı YOK): ${invalid.join(", ")}`);
  });

  it("\"home\" ÖZELLİKLE bir daha görünmemeli (bu turun asıl bug'ı buydu)", () => {
    assert.ok(!calls.includes("home"), "goScreen(\"home\") HÂLÂ kodda — #screen-home hiç var olmadı, gerçek id #screen-menu");
  });
});

// G287 — OLCUM-KURTARMA-17-08.md'nin taramasının bulduğu AYNI boşluk 6
// çağrı noktasında vardı: performExit()/quitGameBtn (e2e/exit-abandons-
// round.spec.mjs'de GERÇEK runtime'da test edildi) + sınav ekranının
// (showExamScreen) 4 "Sonra"/"Ana Ekran" ikincil butonu (announce/passed/
// failed/makeup — bir sınav ekranını e2e'de GÜVENİLİR biçimde TETİKLEMEK
// karmaşık bir sınav-durumu kurulumu gerektirir, bu yüzden bu 4'ü statik
// kaynak analiziyle kilitleniyor — goscreen-ids.test.mjs'in AYNI "yorum
// temizle, literal metin ara" deseni).
//
// Her 6 çağrı noktası da AYNI 3'lü diziyi (activeQuestion=null →
// clearInProgressRound() → goScreen("menu")) taşımalı — "Durdur"un
// (toggleStart) KENDİ, bu testin KAPSAMI DIŞINDAKİ ayrı bir çağrı noktası.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_JS_PATH = join(__dirname, "../www/js/app.js");

function stripComments(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, "");
  out = out.replace(/\/\/.*$/gm, "");
  return out;
}

const rawSrc = readFileSync(APP_JS_PATH, "utf8");
// Boşluk/satır-sonu FARKLARINA duyarsız arama — bazı çağrı noktaları 3 AYRI
// satıra (performExit/quitGameBtn), bazıları TEK satırlık ok fonksiyonuna
// (sınav ekranının 4 dalı) yayılmış — anlam AYNI, biçim FARKLI.
const normalized = stripComments(rawSrc).replace(/\s+/g, " ");

describe("'Çık' turu terk eder (G287) — activeQuestion=null + clearInProgressRound() + goScreen(\"menu\") ÜÇLÜSÜ", () => {
  const pattern = /activeQuestion = null;\s*storage\.clearInProgressRound\(\);\s*goScreen\("menu"\);/g;

  it("KABUL KRİTERİ — TAM 6 çağrı noktasında bu üçlü dizi bulunuyor (performExit + quitGameBtn + sınav ekranının 4 ikincil butonu)", () => {
    const matches = normalized.match(pattern) || [];
    assert.equal(matches.length, 6, `beklenen 6, bulunan: ${matches.length} — bir çağrı noktası eksik/fazla olabilir`);
  });

  it("performExit() bu üçlüyü İÇERİYOR", () => {
    const fnMatch = normalized.match(/function performExit\(\) \{[^}]*\}/);
    assert.ok(fnMatch, "performExit() fonksiyonu bulunamadı");
    assert.ok(pattern.source && new RegExp(pattern.source).test(fnMatch[0]), "performExit() içinde activeQuestion=null+clearInProgressRound()+goScreen(\"menu\") üçlüsü YOK");
  });

  it("quitGameBtn'in click handler'ı bu üçlüyü İÇERİYOR", () => {
    const idx = normalized.indexOf('els.quitGameBtn.addEventListener("click"');
    assert.ok(idx >= 0, "quitGameBtn click handler'ı bulunamadı");
    const slice = normalized.slice(idx, idx + 400);
    assert.ok(new RegExp(pattern.source).test(slice), "quitGameBtn handler'ında üçlü YOK");
  });

  it("Durdur'un (toggleStart) KENDİ çağrı noktası bu testin SAYMADIĞI, AYRI/ÖNCEDEN VAR olan bir yer — 7. bir eşleşme OLMAMALI", () => {
    // Durdur'un KENDİ deseni activeQuestion=null / clearInProgressRound()
    // SONRASINA roundActive=false SATIRI EKLİYOR (bu testin ARADIĞI "hemen
    // ardından goScreen(\"menu\") gelen 3'lü" İLE KARIŞMAZ — Durdur menüye
    // DEĞİL, oyun ekranında KALIR).
    assert.ok(
      normalized.includes("activeQuestion = null; storage.clearInProgressRound(); roundActive = false;"),
      "Durdur'un KENDİ (bu G287'nin KAPSAMI DIŞINDAKİ) çağrı noktası bulunamadı — dosya yapısı beklenenden FARKLI değişmiş olabilir"
    );
    // Ve bu Durdur deseni ARDINDAN goScreen("menu") GETİRMİYOR (6 sayımıza
    // yanlışlıkla KARIŞMADIĞININ kanıtı).
    const durdurIdx = normalized.indexOf("activeQuestion = null; storage.clearInProgressRound(); roundActive = false;");
    const after = normalized.slice(durdurIdx, durdurIdx + 200);
    assert.ok(!after.includes('goScreen("menu")'), "Durdur'un ardından goScreen(\"menu\") GELMEMELİ (Durdur menüye dönmez) — sayım yanlışlıkla 7 olabilirdi");
  });
});

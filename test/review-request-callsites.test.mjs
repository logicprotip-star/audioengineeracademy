// G283 — maybeRequestStoreReview() SADECE üç onaylı olumlu andan çağrılmalı
// (sınav geçildi/rozet kazanıldı/seviye atlandı) — ASLA paywall/can-bitişi/
// yanlış-cevap/reklam-sonrası/ilk-oturum akışlarından. Bu, DOM/native
// bağımlı bir davranış olduğu için e2e/review-request.spec.mjs sadece
// FONKSİYONUN KENDİSİNİ (gate mantığını) canlı test edebiliyor — çağrı
// NOKTALARININ KENDİSİ statik metin analiziyle kilitleniyor (goscreen-
// ids.test.mjs'in AYNI "yorum satırlarını temizle, literal metni ara"
// deseni).

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
const src = stripComments(rawSrc);
const lines = src.split("\n");

// Fonksiyonun TANIMI (function maybeRequestStoreReview() {...}) hariç,
// SADECE ÇAĞRI satırlarını bul.
function callLines() {
  return lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => /\bmaybeRequestStoreReview\(\s*\)/.test(line) && !/function\s+maybeRequestStoreReview/.test(line));
}

describe("maybeRequestStoreReview() çağrı noktaları — SADECE 3 onaylı olumlu an", () => {
  it("KABUL KRİTERİ — tam olarak 2 çağrı noktası var (sınav-geçildi + seviye-atlama/rozet birleşik guard'ı) — REGRESYON: yanlışlıkla eklenen/silinen bir çağrı", () => {
    const calls = callLines();
    assert.equal(calls.length, 2, `beklenen 2 çağrı noktası, bulunan: ${calls.length} (satırlar: ${calls.map(c => c.idx + 1).join(", ")})`);
  });

  it("bir çağrı noktası showExamScreen'in \"passed\" (SINAV GEÇİLDİ) dalının İÇİNDE — geriye doğru en yakın kind===\"passed\" işareti", () => {
    const calls = callLines();
    const examCall = calls.find(({ idx }) => {
      // Geriye doğru tara — bu çağrıdan ÖNCE en yakın kind==="passed" ya da
      // kind==="failed"/"makeup"/"announce" işaretini bul, "passed" olmalı.
      for (let i = idx; i >= 0; i--) {
        if (/kind === "passed"/.test(lines[i])) return true;
        if (/kind === "(failed|makeup|announce)"/.test(lines[i])) return false;
      }
      return false;
    });
    assert.ok(examCall, "hiçbir çağrı showExamScreen'in \"passed\" dalı içinde bulunamadı");
  });

  it("bir çağrı noktası showSessionEnd'de kind===\"normal\" guard'ı İLE AYNI SATIRDA (lost/freeLimit'te ASLA tetiklenmez)", () => {
    const calls = callLines();
    const sessionEndCall = calls.find(({ line }) => /kind === "normal"/.test(line));
    assert.ok(sessionEndCall, "hiçbir çağrı satırı kind===\"normal\" guard'ını TAŞIMIYOR");
  });

  it("HİÇBİR çağrı \"lost\"/\"freeLimit\" ya da paywall/loseLife/reklam kelimeleriyle AYNI satırda DEĞİL (yanlış yere eklenme koruması)", () => {
    const calls = callLines();
    const forbidden = /(kind === "lost"|kind === "freeLimit"|openPaywallReason|loseLife|watchRewardedAd|isFirstSession\(roundsAtAppLaunch\)\s*\)\s*\{[^}]*maybeRequestStoreReview)/;
    calls.forEach(({ line, idx }) => {
      assert.ok(!forbidden.test(line), `satır ${idx + 1} YASAKLI bir bağlamda görünüyor: ${line.trim()}`);
    });
  });
});

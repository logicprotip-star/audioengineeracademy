// G298 (OLCUM-BAYRAK-16-08 bulgusu) — 7-tık gizli geliştirici modu artık
// DEV_MODE'a bağlı. DOM/tarayıcı bağımlı davranış e2e/dev-mode-gate.spec.mjs'te
// (page.route() ile DEV_MODE=false simüle edilerek) canlı test ediliyor —
// burada, review-request-callsites.test.mjs'in AYNI "yorumları temizle,
// statik metin analizi yap" deseniyle, GÜVENCENİN KOD SEVİYESİNDE (satır
// sırası/konumu) GERÇEKTEN doğru yerde olduğu hızlı, DOM'suz bir birim
// testiyle kilitleniyor.

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

// İki handler'ın GÖVDESİNİ (addEventListener'ın callback'i) ayıkla —
// "els.X.addEventListener("click", () => { ... });" bloğunun İÇİ.
function handlerBody(elId) {
  const startMarker = `els.${elId}.addEventListener("click", () => {`;
  const startIdx = src.indexOf(startMarker);
  assert.ok(startIdx >= 0, `${elId}'in click handler'ı bulunamadı (kod yeniden düzenlenmiş olabilir)`);
  const bodyStart = startIdx + startMarker.length;
  // AYNI seviyedeki kapanışı bul (basit süslü-parantez dengeleme — bu
  // dosyada iç içe fonksiyon/obje literali barındırmayan sığ handler'lar
  // için yeterli, goscreen-ids.test.mjs'in AYNI "basit ama yeterli" ilkesi).
  let depth = 1, i = bodyStart;
  while (depth > 0 && i < src.length) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") depth--;
    i++;
  }
  return src.slice(bodyStart, i - 1);
}

describe("G298 — versionRow (7-tık) handler'ı DEV_MODE'a bağlı", () => {
  const body = handlerBody("versionRow");

  it("handler'IN İLK satırı 'if (!DEV_MODE) return;' — herhangi bir sayaç/devFlags mutasyonundan ÖNCE", () => {
    const trimmed = body.trim();
    assert.match(trimmed, /^if\s*\(\s*!DEV_MODE\s*\)\s*return;/, `handler'ın ilk ifadesi DEV_MODE koruması OLMALIYDI, bulunan başlangıç: ${trimmed.slice(0, 80)}`);
  });

  it("koruma satırı devFlags.unlocked mutasyonundan ÖNCE geliyor (sıra kontrolü)", () => {
    const guardIdx = body.indexOf("if (!DEV_MODE) return;");
    const mutationIdx = body.indexOf("devFlags.unlocked = true");
    assert.ok(guardIdx >= 0 && mutationIdx >= 0, "koruma ya da mutasyon satırı bulunamadı");
    assert.ok(guardIdx < mutationIdx, "DEV_MODE koruması devFlags.unlocked mutasyonundan SONRA geliyor — DEV_MODE=false'ta bile mutasyon ÇALIŞIRDI");
  });

  it("7-tık eşiği (versionTapCount >= 7) VE sayaç artırma mantığı HÂLÂ mevcut — koruma davranışı SİLMEDİ, sadece EN BAŞA eklendi", () => {
    assert.match(body, /versionTapCount\+\+/, "sayaç artırma satırı KAYBOLMUŞ");
    assert.match(body, /versionTapCount\s*>=\s*7/, "7 eşiği KAYBOLMUŞ");
    assert.match(body, /toast\("🛠️ Geliştirici modu açıldı"/, "açılış toast'ı KAYBOLMUŞ");
  });
});

describe("G298 — devProSwitch handler'ı DEV_MODE'a bağlı", () => {
  const body = handlerBody("devProSwitch");

  it("handler'IN İLK satırı 'if (!DEV_MODE) return;' — simulatePro mutasyonundan ÖNCE", () => {
    const trimmed = body.trim();
    assert.match(trimmed, /^if\s*\(\s*!DEV_MODE\s*\)\s*return;/, `handler'ın ilk ifadesi DEV_MODE koruması OLMALIYDI, bulunan başlangıç: ${trimmed.slice(0, 80)}`);
  });

  it("koruma satırı devFlags.simulatePro mutasyonundan ÖNCE geliyor", () => {
    const guardIdx = body.indexOf("if (!DEV_MODE) return;");
    const mutationIdx = body.indexOf("devFlags.simulatePro = !devFlags.simulatePro");
    assert.ok(guardIdx >= 0 && mutationIdx >= 0, "koruma ya da mutasyon satırı bulunamadı");
    assert.ok(guardIdx < mutationIdx, "DEV_MODE koruması simulatePro mutasyonundan SONRA geliyor");
  });
});

describe("G298 — syncDevUI() devGroup görünürlüğü DEV_MODE VE devFlags.unlocked İKİSİNİ de gerektiriyor", () => {
  it("devGroup.classList.toggle satırı DEV_MODE && devFlags.unlocked deseninde", () => {
    const line = src.split("\n").find(l => l.includes('els.devGroup.classList.toggle("hidden"'));
    assert.ok(line, "devGroup görünürlük satırı bulunamadı");
    assert.match(line, /!\(DEV_MODE\s*&&\s*devFlags\.unlocked\)/, `beklenen 'DEV_MODE && devFlags.unlocked' deseni YOK, bulunan: ${line.trim()}`);
  });
});

describe("G298 — DOKUNULMAYACAK: devModeOffBtn (geliştirici modunu KAPATMA) DEV_MODE'a bağlı DEĞİL, HER ZAMAN çalışır", () => {
  it("devModeOffBtn handler'ı DEV_MODE koruması TAŞIMIYOR (kapatma her koşulda serbest bir çıkış yolu kalmalı)", () => {
    const body = handlerBody("devModeOffBtn");
    assert.doesNotMatch(body.trim(), /^if\s*\(\s*!DEV_MODE\s*\)\s*return;/, "devModeOffBtn'e G298'in DEV_MODE korumasının YANLIŞLIKLA eklenmediğini doğrula — bu buton kapsam DIŞINDA bırakılmıştı");
  });
});

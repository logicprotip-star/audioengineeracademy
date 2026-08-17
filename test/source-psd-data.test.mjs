// G282 — www/audio/arpeggio_guitar.m4a G281'de değiştirildi (snare sızıntısı
// temizlendi) — source-psd-data.js'in `arpeggio_guitar` girdisi ESKİ dosyaya
// göre ölçülmüştü (G271/G272), YENİDEN ölçüldü (e2e/precompute-source-psd.mjs
// İLE AYNI yöntem — computeSourcePsd(samples,44100,48) — SADECE bu girdi
// yeniden hesaplanıp dosyaya yapıştırıldı, script TAMAMEN yeniden
// ÇALIŞTIRILMADI çünkü pink/white RASTGELE üretiliyor ve yeniden çalıştırma
// onları da <0.1dB kaydırırdı — "diğer 11 girdi BAYT BAYT AYNI kalsın"
// kabul kriterini İHLAL ederdi).
//
// Diğer 14 girdinin (11 dosya-kaynaklı + pink/white + 3 sentetik) BAYT BAYT
// AYNI kaldığı `git diff --stat`/hunk sayısıyla (TEK satır, TEK hunk) AYRICA
// doğrulandı — DURUM.md G282.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SOURCE_PSD } from "../www/js/core/source-psd-data.js";

describe("source-psd-data.js — SOURCE_PSD.arpeggio_guitar (G282: yeni dosyaya göre yeniden ölçüldü)", () => {
  it("48 nokta, tüm güçler sonlu ve pozitif (computeSourcePsd'nin genel sözleşmesi)", () => {
    const psd = SOURCE_PSD.arpeggio_guitar;
    assert.equal(psd.freqs.length, 48);
    assert.equal(psd.powers.length, 48);
    psd.powers.forEach((p, i) => {
      assert.ok(Number.isFinite(p) && p > 0, `powers[${i}]=${p} sonlu/pozitif olmalı`);
    });
  });

  it("tepe frekansı ~194Hz civarında (guitar/clean_guitar AİLESİYLE AYNI enstrüman/akort — source-catalog.js'in dosya-başı ölçüm notuyla TUTARLI)", () => {
    const psd = SOURCE_PSD.arpeggio_guitar;
    const peakIdx = psd.powers.indexOf(Math.max(...psd.powers));
    const peakHz = psd.freqs[peakIdx];
    assert.ok(peakHz > 150 && peakHz < 250, `tepe ${peakHz}Hz, beklenen ~194Hz civarı DEĞİL`);
  });

  it("ESKİ (stale, G271/G272'nin eski dosyaya göre ölçtüğü) değerlerle ARTIK AYNI DEĞİL — güncelleme GERÇEKTEN uygulandı", () => {
    const OLD_FIRST_POWER = 1.184404e-5; // ESKİ dosyanın ilk (20Hz) power değeri, G271'den
    assert.notEqual(SOURCE_PSD.arpeggio_guitar.powers[0], OLD_FIRST_POWER);
  });

  it("diğer 14 girdi (11 dosya-kaynaklı + pink/white + 3 sentetik) HÂLÂ mevcut, hiçbiri kaybolmadı", () => {
    const expectedIds = ["kick", "snare", "hihat", "tom", "groove", "bass", "guitar", "clean_guitar", "arpeggio_guitar", "vocal", "pink", "white", "saw", "square", "triangle"];
    assert.deepEqual(Object.keys(SOURCE_PSD).sort(), expectedIds.sort());
  });
});

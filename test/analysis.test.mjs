// Araçlar ölçüm motoru testleri (analysis.js). Sentetik sinyaller (gerçek
// dosya diskte tutulmuyor) — 1kHz sinüsler, bilinen DC ofsetli sabitler,
// kasıtlı kırpılmış diziler, sessizlik. Her testte beklenen değer VE tolerans
// açıkça yazılı (task gereği). Referans: ITU-R BS.1770-4 / EBU R128 / EBU
// Tech 3342 — bkz. analysis.js dosya başı notları (K-weighting katsayı
// türetimi ve True Peak filtresinin DÜRÜSTLÜK sınırları için).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeAudioBuffer, _internal } from "../www/js/core/analysis.js";

function fakeBuffer(channelsData, sampleRate) {
  return {
    sampleRate,
    numberOfChannels: channelsData.length,
    length: channelsData[0].length,
    getChannelData: (ch) => channelsData[ch],
  };
}

function sineWave(freq, amplitude, durationSec, sampleRate, phase = 0) {
  const n = Math.round(durationSec * sampleRate);
  const d = new Float32Array(n);
  for (let i = 0; i < n; i++) d[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate + phase);
  return d;
}

function dbfsToLinear(db) {
  return Math.pow(10, db / 20);
}

const SR = 48000;

describe("analysis.js — K-weighting katsayı türetimi (ITU-R BS.1770-4 referans tablosuna karşı SAYISAL doğrulama)", () => {
  it("ön-filtre (yüksek raf) katsayıları 48kHz'de ITU'nun yayınladığı tabloyla 1e-9 içinde eşleşir", () => {
    const c = _internal.preFilterCoeffs(48000);
    assert.ok(Math.abs(c.b0 - 1.53512485958697) < 1e-9);
    assert.ok(Math.abs(c.b1 - -2.69169618940638) < 1e-9);
    assert.ok(Math.abs(c.b2 - 1.19839281085285) < 1e-9);
    assert.ok(Math.abs(c.a1 - -1.69065929318241) < 1e-9);
    assert.ok(Math.abs(c.a2 - 0.73248077421585) < 1e-9);
  });

  it("RLB (yüksek geçiren) katsayıları 48kHz'de ITU'nun yayınladığı tabloyla 1e-9 içinde eşleşir", () => {
    const c = _internal.rlbFilterCoeffs(48000);
    assert.ok(Math.abs(c.b0 - 1.0) < 1e-9);
    assert.ok(Math.abs(c.b1 - -2.0) < 1e-9);
    assert.ok(Math.abs(c.b2 - 1.0) < 1e-9);
    assert.ok(Math.abs(c.a1 - -1.99004745483398) < 1e-8);
    assert.ok(Math.abs(c.a2 - 0.99007225036621) < 1e-8);
  });

  it("44100 Hz'de de aynı türetim yöntemiyle makul (48kHz'e yakın oranlı) katsayılar üretir — çökme yok, NaN yok", () => {
    const pre = _internal.preFilterCoeffs(44100);
    const rlb = _internal.rlbFilterCoeffs(44100);
    for (const c of [pre, rlb]) {
      for (const v of Object.values(c)) {
        assert.ok(Number.isFinite(v));
      }
    }
    // Bilinen referans (bağımsız kaynaklarda tekrarlanan 44.1kHz ITU katsayıları):
    assert.ok(Math.abs(pre.a1 - -1.6636551132560204) < 1e-8);
    assert.ok(Math.abs(pre.a2 - 0.7125954280732254) < 1e-8);
    assert.ok(Math.abs(rlb.a1 - -1.989169673629763) < 1e-8);
    assert.ok(Math.abs(rlb.a2 - 0.9891990357870069) < 1e-8);
  });
});

describe("analysis.js — polifaz True Peak filtresi tasarımı (G100: L=8/halfWidth=6/beta=26)", () => {
  it("her fazın DC kazancı 1.0'a çok yakın (sabit sinyal interpolasyondan sonra sabit KALMALI)", () => {
    const filter = _internal.designInterpolationFilter(8, 6, 26);
    for (let p = 0; p < 8; p++) {
      const sum = filter.taps[p].reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - 1.0) < 1e-2, `phase ${p} DC kazancı ${sum}, 1.0'a yakın değil`);
    }
  });

  it("saf ton taramasında en kötü aşırı-okuma (overshoot) ~0.05dB sınırının altında kalır (G100 regresyon kilidi — bkz. analysis.js dosya başı DÜRÜSTLÜK notu, G98'in ~0.55dB'sinden düştü)", () => {
    // Kısaltılmış tarama (npm test hızlı kalsın diye) — tam tarama bu testi
    // yazarken node ile ayrıca çalıştırılıp analysis.js'in DÜRÜSTLÜK notundaki
    // "~0.04dB, RX 11 karşılaştırması sonrası halfWidth/beta yeniden ayarlandı"
    // bulgusu ELDE EDİLDİ, burada sadece ÜST SINIR kilitleniyor.
    const filter = _internal.designInterpolationFilter(8, 6, 26);
    const H = filter.tapsPerPhase - 1;
    let worst = -Infinity;
    for (let f = 2000; f < SR / 2 - 500; f += 1500) {
      const n = Math.round((200 * SR) / f);
      const combined = new Float64Array(H + n);
      for (let i = 0; i < n; i++) combined[H + i] = Math.sin((2 * Math.PI * f * i) / SR);
      let maxAbs = 0;
      for (let idx = 0; idx < n; idx++) {
        const base = H + idx;
        for (let p = 0; p < filter.L; p++) {
          const hp = filter.taps[p];
          let acc = 0;
          for (let j = 0; j < filter.tapsPerPhase; j++) acc += hp[j] * combined[base - j];
          const a = Math.abs(acc);
          if (a > maxAbs) maxAbs = a;
        }
      }
      const db = 20 * Math.log10(maxAbs);
      if (db > worst) worst = db;
    }
    assert.ok(worst < 0.05, `en kötü overshoot ${worst}dB, 0.05dB sınırını aştı`);
    assert.ok(worst > 0.01, `beklenenden çok daha iyi (${worst}dB) — sınır sayısı güncellenmeli mi kontrol et`);
  });
});

describe("analysis.js — percentile() yardımcı fonksiyonu", () => {
  it("doğrusal enterpolasyonlu yüzdelik: bilinen küçük dizi", () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    assert.equal(_internal.percentile(sorted, 0), 1);
    assert.equal(_internal.percentile(sorted, 100), 10);
    assert.ok(Math.abs(_internal.percentile(sorted, 50) - 5.5) < 1e-9);
  });
});

describe("analysis.js — G100: percentileNearestRank() (LRA'nın kullandığı yöntem)", () => {
  it("bilinen küçük dizi: ara değer ÜRETMEZ, en yakın rütbeyi seçer", () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    assert.equal(_internal.percentileNearestRank(sorted, 0), 1);
    assert.equal(_internal.percentileNearestRank(sorted, 100), 10);
    // percentile()'ın (doğrusal) 50.'de 5.5 döndürdüğü AYNI dizide, nearest-rank
    // dizideki GERÇEK bir değeri (5 ya da 6) döner, ARA değer ÜRETMEZ.
    const p50 = _internal.percentileNearestRank(sorted, 50);
    assert.ok(sorted.includes(p50), `p50=${p50} dizideki bir değer DEĞİL`);
  });

  it("tek elemanlı dizi", () => {
    assert.equal(_internal.percentileNearestRank([42], 10), 42);
    assert.equal(_internal.percentileNearestRank([42], 95), 42);
  });
});

describe("analysis.js — referans sinyal 1: 0 dBFS 1kHz sinüs (mono)", () => {
  const buf = fakeBuffer([sineWave(1000, 1.0, 6, SR)], SR);
  const r = analyzeAudioBuffer(buf);

  it("sample peak TAM 0.0 dBFS (±0.001dB)", () => {
    assert.ok(Math.abs(r.channels[0].samplePeakDb - 0.0) < 0.001);
  });

  it("true peak 0.0 dBTP'ye yakın (±0.6dB — bkz. filtre overshoot sınırı)", () => {
    assert.ok(Math.abs(r.channels[0].truePeakDb - 0.0) < 0.6);
  });

  it("total RMS ham konvansiyon ≈ −3.0103 dBFS (tam ölçekli sinüs), ±0.01dB", () => {
    assert.ok(Math.abs(r.channels[0].totalRmsDb.raw - -3.0103) < 0.01);
  });

  it("total RMS AES17 konvansiyonu ≈ 0.0 dBFS, ±0.01dB", () => {
    assert.ok(Math.abs(r.channels[0].totalRmsDb.aes17 - 0.0) < 0.01);
  });

  it("possibly clipped samples 0 (kırpılma yok, sadece tepe noktasına DOKUNUYOR, tam ölçeği AŞMIYOR)", () => {
    // sin() matematiksel olarak tam 1.0'ı ANCAK örnek π/2'ye denk gelirse verir —
    // 1kHz/48kHz oranında bu nadiren tam denk gelir, ama denk gelse bile ardışıklık
    // kuralı (≥3) tek başına bir örneği saymaz.
    assert.ok(r.channels[0].possiblyClippedSamples < 3);
  });
});

describe("analysis.js — referans sinyal 2: göreli doğruluk — amplitüdü 6dB düşürmek integrated'ı TAM 6 LU düşürmeli", () => {
  // NOT: "mutlak −20dBFS mono → −20.0 LUFS" gibi bir beklenti K-weighting'in
  // 1kHz'deki (unity OLMAYAN, hafif pozitif) gerçek kazancını VE mono/stereo
  // kanal toplama farkını (bkz. bir alttaki test) görmezden gelirdi — bu,
  // MUTLAK bir sayı UYDURMAK yerine, sadece log-doğrusallığı (dB'de dB
  // farkının BİREBİR yansıması gerektiği, bu YASA — CLAUDE.md'nin "sayı
  // uydurma" ilkesiyle uyumlu, MATEMATİKSEL olarak zorunlu) sınayan, absolü
  // kalibrasyon varsayımı GEREKTİRMEYEN bir test.
  it("mono, iki farklı seviye (−12dBFS ve −18dBFS), fark TAM 6.0 LU (±0.02)", () => {
    const bufA = fakeBuffer([sineWave(1000, dbfsToLinear(-12), 6, SR)], SR);
    const bufB = fakeBuffer([sineWave(1000, dbfsToLinear(-18), 6, SR)], SR);
    const rA = analyzeAudioBuffer(bufA);
    const rB = analyzeAudioBuffer(bufB);
    const diff = rA.program.integratedLufs - rB.program.integratedLufs;
    assert.ok(Math.abs(diff - 6.0) < 0.02, `fark=${diff}, beklenen 6.0 ±0.02`);
  });
});

describe("analysis.js — EBU R128 uyum sinyali: 1kHz sinüs, −23 dBFS stereo (L=R) → integrated ≈ −23.0 LUFS", () => {
  // Bu, EBU Tech 3341'in yaygın atıfta bulunulan referans kalibrasyon sinyali —
  // İKİ kanallı (dual-mono), TEK kanal DEĞİL (mono girdi ITU'nun kanal ağırlığı
  // toplaması gereği ~3dB DAHA DÜŞÜK okur — bkz. bir alttaki test, bu bir hata
  // değil, spesifikasyonun TANIMLADIĞI davranış).
  it("stereo (L=R, aynı sinyal), 6s, ±0.1 LUFS tolerans", () => {
    const amp = dbfsToLinear(-23);
    const mono = sineWave(1000, amp, 6, SR);
    const buf = fakeBuffer([mono, mono.slice()], SR);
    const r = analyzeAudioBuffer(buf);
    assert.ok(Math.abs(r.program.integratedLufs - -23.0) < 0.1);
    assert.ok(Math.abs(r.program.maxMomentaryLufs - -23.0) < 0.1);
    assert.ok(Math.abs(r.program.maxShortTermLufs - -23.0) < 0.1);
  });

  it("AYNI per-kanal seviyede mono, stereo'dan TAM 3.0103 LU DÜŞÜK okur (ITU kanal toplama: 2×güç = +3.01dB, kanıtlanabilir matematiksel zorunluluk)", () => {
    const amp = dbfsToLinear(-23);
    const monoR = analyzeAudioBuffer(fakeBuffer([sineWave(1000, amp, 6, SR)], SR));
    const stereoR = analyzeAudioBuffer(fakeBuffer([sineWave(1000, amp, 6, SR), sineWave(1000, amp, 6, SR)], SR));
    const diff = stereoR.program.integratedLufs - monoR.program.integratedLufs;
    assert.ok(Math.abs(diff - 3.0103) < 0.02, `fark=${diff}, beklenen 3.0103 ±0.02`);
  });

  it("sabit tonda LRA ≈ 0 LU (varyasyon yok)", () => {
    const amp = dbfsToLinear(-23);
    const mono = sineWave(1000, amp, 6, SR);
    const buf = fakeBuffer([mono, mono.slice()], SR);
    const r = analyzeAudioBuffer(buf);
    assert.ok(r.program.lra < 0.5, `LRA=${r.program.lra}, sabit tonda ~0 beklenir`);
  });
});

describe("analysis.js — DC offset, bilinen sabit sinyal", () => {
  it("+0.1 sabit sinyal → dcOffsetPercent TAM 10.0 (±1e-4)", () => {
    const d = new Float32Array(SR).fill(0.1);
    const r = analyzeAudioBuffer(fakeBuffer([d], SR));
    assert.ok(Math.abs(r.channels[0].dcOffsetPercent - 10.0) < 1e-4);
  });

  it("−0.05 sabit sinyal → dcOffsetPercent TAM −5.0 (±1e-4)", () => {
    const d = new Float32Array(SR).fill(-0.05);
    const r = analyzeAudioBuffer(fakeBuffer([d], SR));
    assert.ok(Math.abs(r.channels[0].dcOffsetPercent - -5.0) < 1e-4);
  });

  it("saf sinüs (DC yok) → dcOffsetPercent ~0 (±0.01)", () => {
    const d = sineWave(1000, 0.8, 2, SR);
    const r = analyzeAudioBuffer(fakeBuffer([d], SR));
    assert.ok(Math.abs(r.channels[0].dcOffsetPercent) < 0.01);
  });
});

describe("analysis.js — kasıtlı kırpılmış sinyal", () => {
  it("10 ardışık tam-ölçek örnek → possiblyClippedSamples TAM 10", () => {
    const d = new Float32Array(SR);
    for (let i = 1000; i < 1010; i++) d[i] = 1.0;
    const r = analyzeAudioBuffer(fakeBuffer([d], SR));
    assert.equal(r.channels[0].possiblyClippedSamples, 10);
  });

  it("izole (ardışık OLMAYAN) tam-ölçek örnekler SAYILMAZ (ardışıklık kuralı ≥3)", () => {
    const d = new Float32Array(SR);
    d[100] = 1.0;
    d[500] = -1.0;
    d[900] = 1.0;
    const r = analyzeAudioBuffer(fakeBuffer([d], SR));
    assert.equal(r.channels[0].possiblyClippedSamples, 0);
  });

  it("tam 2 ardışık (eşiğin BİR ALTI, 3 değil) SAYILMAZ, 3. eklenince SAYILIR", () => {
    const d2 = new Float32Array(SR);
    d2[100] = 1.0;
    d2[101] = 1.0;
    const r2 = analyzeAudioBuffer(fakeBuffer([d2], SR));
    assert.equal(r2.channels[0].possiblyClippedSamples, 0);

    const d3 = new Float32Array(SR);
    d3[100] = 1.0;
    d3[101] = 1.0;
    d3[102] = 1.0;
    const r3 = analyzeAudioBuffer(fakeBuffer([d3], SR));
    assert.equal(r3.channels[0].possiblyClippedSamples, 3);
  });

  it("iki AYRI kırpma bloğu doğru toplanır (5 + 4 = 9)", () => {
    const d = new Float32Array(SR);
    for (let i = 100; i < 105; i++) d[i] = 1.0; // 5
    for (let i = 5000; i < 5004; i++) d[i] = -1.0; // 4
    const r = analyzeAudioBuffer(fakeBuffer([d], SR));
    assert.equal(r.channels[0].possiblyClippedSamples, 9);
  });

  it("kırpma bloğu bir CHUNK SINIRINI keserse (küçük chunkSize) yine doğru sayılır — durum taşınması testi", () => {
    const d = new Float32Array(2000);
    for (let i = 990; i < 1010; i++) d[i] = 1.0; // 20 ardışık, 1000 sınırını KESİYOR (chunkSize=1000)
    const r = analyzeAudioBuffer(fakeBuffer([d], SR), { chunkSize: 1000 });
    assert.equal(r.channels[0].possiblyClippedSamples, 20);
  });
});

describe("analysis.js — sessizlik (kapılama doğru çalışıyor mu)", () => {
  it("tam sessizlik: integrated/momentary/short-term −Infinity, LRA 0, sample peak −Infinity, çökme yok", () => {
    const d = new Float32Array(SR * 2);
    const r = analyzeAudioBuffer(fakeBuffer([d, d.slice()], SR));
    assert.equal(r.program.integratedLufs, -Infinity);
    assert.equal(r.program.maxMomentaryLufs, -Infinity);
    assert.equal(r.program.maxShortTermLufs, -Infinity);
    assert.equal(r.program.lra, 0);
    assert.equal(r.channels[0].samplePeakDb, -Infinity);
    assert.equal(r.channels[0].totalRmsDb.raw, -Infinity);
    assert.equal(r.channels[0].possiblyClippedSamples, 0);
    assert.equal(r.channels[0].dcOffsetPercent, 0);
  });

  it("sessizlik + kısa yüksek seviye bölüm: mutlak kapı (−70 LUFS) sessiz kısmı integrated hesaptan DIŞLAR", () => {
    // Mutlak kalibrasyon sayısı UYDURMAK yerine (bkz. yukarıdaki testlerin
    // notu) ÖZ-REFERANSLI kontrol: 2s sessizlik EKLEMEK integrated'ı ÇOK
    // FAZLA DEĞİŞTİRMEMELİ. Kapı HİÇ olmasaydı (naif 6s'lik ortalama) güç
    // 4s/6s'e seyrelir, −10·log10(4/6) ≈ −1.76 LU daha düşük okurdu — bu
    // testte tolerans (0.3) bu değerin ÇOK altında tutularak "kapı çalışıyor"
    // kanıtlanıyor. Tam SIFIR fark beklenmiyor: sessizlik→ton GEÇİŞ anındaki
    // 400ms'lik pencerelerden bazıları KISMEN sessiz+KISMEN sesli olduğu için
    // mutlak eşiği (−70) geçer ama tam bir "sesli" bloktan biraz daha düşük
    // güçlüdür — bu, algoritmanın kendisinin BEKLENEN bir kenar etkisi.
    const tone = sineWave(1000, dbfsToLinear(-14), 4, SR);
    const rToneOnly = analyzeAudioBuffer(fakeBuffer([tone], SR));

    const silence = new Float32Array(SR * 2);
    const combined = new Float32Array(silence.length + tone.length);
    combined.set(silence, 0);
    combined.set(tone, silence.length);
    const rWithSilence = analyzeAudioBuffer(fakeBuffer([combined], SR));

    const diff = Math.abs(rWithSilence.program.integratedLufs - rToneOnly.program.integratedLufs);
    assert.ok(
      diff < 0.3,
      `sessizsiz=${rToneOnly.program.integratedLufs}, sessizlikli=${rWithSilence.program.integratedLufs}, fark=${diff} — naif (kapısız) sızıntı ~1.76 LU olurdu, kapı bunu ÇOK büyük ölçüde engellemeli`
    );
  });
});

describe("analysis.js — windowed RMS (max/min), bilinen iki-seviyeli sinyal", () => {
  it("2s yüksek (−6dBFS) + 2s düşük (−30dBFS) sinüs: maxRms yüksek bölümden, minRms düşük bölümden, ±0.5dB", () => {
    const loud = sineWave(1000, dbfsToLinear(-6), 2, SR);
    const quiet = sineWave(1000, dbfsToLinear(-30), 2, SR);
    const combined = new Float32Array(loud.length + quiet.length);
    combined.set(loud, 0);
    combined.set(quiet, loud.length);
    const r = analyzeAudioBuffer(fakeBuffer([combined], SR));
    const expectedLoudRms = -6 - 3.0103; // raw konvansiyon
    const expectedQuietRms = -30 - 3.0103;
    assert.ok(Math.abs(r.channels[0].maxRmsDb.raw - expectedLoudRms) < 0.5);
    assert.ok(Math.abs(r.channels[0].minRmsDb.raw - expectedQuietRms) < 0.5);
    assert.ok(r.channels[0].maxRmsDb.raw > r.channels[0].minRmsDb.raw);
  });

  it("seçilen RMS penceresi meta.rmsWindowMs olarak raporlanır (varsayılan 100ms — G100'de 300'den düşürüldü)", () => {
    const d = sineWave(1000, 0.5, 1, SR);
    const r = analyzeAudioBuffer(fakeBuffer([d], SR));
    assert.equal(r.meta.rmsWindowMs, 100);
  });

  it("options.rmsWindowMs override edilebilir", () => {
    const d = sineWave(1000, 0.5, 1, SR);
    const r = analyzeAudioBuffer(fakeBuffer([d], SR), { rmsWindowMs: 50 });
    assert.equal(r.meta.rmsWindowMs, 50);
  });
});

describe("analysis.js — mono ve stereo ayrı ayrı", () => {
  it("mono: tek kanal döner, etiket 'Mono'", () => {
    const d = sineWave(1000, 0.5, 1, SR);
    const r = analyzeAudioBuffer(fakeBuffer([d], SR));
    assert.equal(r.numberOfChannels, 1);
    assert.equal(r.channels.length, 1);
    assert.equal(r.channels[0].label, "Mono");
  });

  it("stereo: iki kanal döner, etiketler 'L'/'R', FARKLI sinyallerde FARKLI sonuçlar üretir", () => {
    const left = sineWave(1000, dbfsToLinear(-6), 2, SR);
    const right = sineWave(1000, dbfsToLinear(-18), 2, SR);
    const r = analyzeAudioBuffer(fakeBuffer([left, right], SR));
    assert.equal(r.numberOfChannels, 2);
    assert.equal(r.channels[0].label, "L");
    assert.equal(r.channels[1].label, "R");
    assert.ok(r.channels[0].samplePeakDb > r.channels[1].samplePeakDb);
    assert.ok(Math.abs(r.channels[0].samplePeakDb - -6) < 0.01);
    assert.ok(Math.abs(r.channels[1].samplePeakDb - -18) < 0.01);
  });

  it("3+ kanal desteklenmiyor — hata fırlatır (yanlış LUFS üretmek yerine)", () => {
    const d = sineWave(1000, 0.5, 1, SR);
    assert.throws(() => analyzeAudioBuffer(fakeBuffer([d, d.slice(), d.slice()], SR)));
  });
});

describe("analysis.js — blok bazlı işleme, chunk sınırlarından BAĞIMSIZ sonuç (durum taşınması doğrulaması)", () => {
  it("aynı sinyal, farklı chunkSize'larla (tek seferde vs 500 örneklik parçalar) AYNI sonucu (küçük tolerans) verir", () => {
    const d = sineWave(1000, dbfsToLinear(-10), 3, SR);
    const rBig = analyzeAudioBuffer(fakeBuffer([d], SR), { chunkSize: 10_000_000 });
    const rSmall = analyzeAudioBuffer(fakeBuffer([d], SR), { chunkSize: 500 });
    assert.ok(Math.abs(rBig.program.integratedLufs - rSmall.program.integratedLufs) < 0.01);
    assert.ok(Math.abs(rBig.channels[0].truePeakDb - rSmall.channels[0].truePeakDb) < 0.01);
    assert.ok(Math.abs(rBig.channels[0].samplePeakDb - rSmall.channels[0].samplePeakDb) < 1e-9);
    assert.ok(Math.abs(rBig.channels[0].totalRmsDb.raw - rSmall.channels[0].totalRmsDb.raw) < 1e-6);
    assert.ok(Math.abs(rBig.channels[0].dcOffsetPercent - rSmall.channels[0].dcOffsetPercent) < 1e-6);
  });
});

describe("analysis.js — meta alanları rapora yazılacak sabitleri doğru yansıtır", () => {
  it("clipThreshold=0.9999, clipMinConsecutive=3, truePeakOversample=8 (G100'de 4'ten yükseltildi)", () => {
    const d = sineWave(1000, 0.5, 0.5, SR);
    const r = analyzeAudioBuffer(fakeBuffer([d], SR));
    assert.equal(r.meta.clipThreshold, 0.9999);
    assert.equal(r.meta.clipMinConsecutive, 3);
    assert.equal(r.meta.truePeakOversample, 8);
    assert.equal(r.meta.gatingBlockMs, 100);
  });

  it("durationSec doğru hesaplanır", () => {
    const d = sineWave(1000, 0.5, 2.5, SR);
    const r = analyzeAudioBuffer(fakeBuffer([d], SR));
    assert.ok(Math.abs(r.durationSec - 2.5) < 1e-6);
  });
});

describe("analysis.js — G99: program.shortTermLufsSeries (arayüz turunun 'Short-term seyri' grafiği için EKLENEN katkısal alan)", () => {
  it("6s sabit ton: dizi uzunluğu ~(6000-2900)/100+1, tüm değerler maxShortTermLufs'a eşit (±0.01, sabit tonda dalgalanma yok)", () => {
    const d = sineWave(1000, dbfsToLinear(-10), 6, SR);
    const r = analyzeAudioBuffer(fakeBuffer([d], SR));
    const series = r.program.shortTermLufsSeries;
    assert.ok(Array.isArray(series) && series.length > 10);
    for (const v of series) {
      assert.ok(Math.abs(v - r.program.maxShortTermLufs) < 0.01);
    }
  });

  it("iki-seviyeli sinyal (3s yüksek + 3s düşük): dizi YÜKSEKTEN DÜŞÜĞE geçiş gösterir, max(dizi)===maxShortTermLufs", () => {
    const loud = sineWave(1000, dbfsToLinear(-6), 3, SR);
    const quiet = sineWave(1000, dbfsToLinear(-30), 3, SR);
    const combined = new Float32Array(loud.length + quiet.length);
    combined.set(loud, 0);
    combined.set(quiet, loud.length);
    const r = analyzeAudioBuffer(fakeBuffer([combined], SR));
    const series = r.program.shortTermLufsSeries;
    const maxOfSeries = Math.max(...series);
    assert.ok(Math.abs(maxOfSeries - r.program.maxShortTermLufs) < 1e-9);
    assert.ok(series[0] > series[series.length - 1], "dizi baştan sona AZALMALI (yüksek->düşük)");
  });

  it("shortTermSeriesStartMs/StepMs ile hesaplanan zaman ekseni ses süresini AŞMAZ", () => {
    const d = sineWave(1000, 0.4, 5, SR);
    const r = analyzeAudioBuffer(fakeBuffer([d], SR));
    const lastMs = r.program.shortTermSeriesStartMs + (r.program.shortTermLufsSeries.length - 1) * r.program.shortTermSeriesStepMs;
    assert.ok(lastMs <= r.durationSec * 1000 + 1);
    assert.equal(r.program.shortTermSeriesStepMs, 100);
  });
});
